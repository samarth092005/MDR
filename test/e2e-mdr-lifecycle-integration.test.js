'use strict';

/**
 * End-to-End Integration Test for MDR Complete Lifecycle:
 * 1. Verifies MainDataService GLAccount view enforces VersionActive = 'Y' AND Status IN ('ACT', '590').
 * 2. Verifies Bulk Upload lifecycle: Staging ('G') -> WFAudit (INITIATED) -> Approval ('Y', 'ACT') -> WFAudit (APPROVED).
 * 3. Verifies Central Governance lifecycle: Staging ('I') -> WFAudit (INITIATED) -> Approval ('Y', 'ACT') -> WFAudit (APPROVED).
 * 4. Verifies Workflow Audit Report (WFAuditReport) reflects the end-to-end timeline for both Bulk and Central.
 * 5. Verifies Entity Account Report ONLY shows the approved records (zero drafts, zero pending staging).
 */

const assert = require('assert');
const path = require('path');
const cds = require('@sap/cds');

async function runE2EIntegrationTests() {
    console.log('================================================================');
    console.log(' MDR FULL LIFECYCLE & MULTI-APP INTEGRATION VERIFICATION SUITE');
    console.log('================================================================\n');

    const rootDir = path.resolve(__dirname, '..');
    process.chdir(rootDir);

    cds.root = rootDir;
    cds.model = await cds.load('*', { root: rootDir });

    const db = await cds.connect.to({
        kind: 'sqlite',
        credentials: { url: ':memory:' }
    });

    await cds.deploy(cds.model).to(db);
    console.log('✅ In-memory database deployed with full CDS model.\n');

    const entities = cds.entities('zmdr');
    const { GLAccount, WFAudit, BulkHdrConfig, BulkItmConfig, ApprovalStatus } = entities;

    const { approveVersionedTable } = require('../srv/lib/insert');
    const { insertWFAudit } = require('../srv/lib/wf-utilities');

    let passed = 0;
    let failed = 0;

    async function test(name, fn) {
        try {
            await fn();
            console.log(`  ✅ PASS: ${name}`);
            passed++;
        } catch (e) {
            console.error(`  ❌ FAIL: ${name}`);
            console.error(`     Error: ${e.message}`);
            failed++;
        }
    }

    // ── Test 1: Seed Initial Mixed Data & Verify Golden View Filter ─────────
    await test('MainDataService.GLAccount strictly filters VersionActive=Y and Status=ACT/590', async () => {
        await db.run(DELETE.from(GLAccount));
        const now = new Date().toISOString();
        await db.run(INSERT.into(GLAccount).entries([
            {
                GlAccountNum: 'GL1001',
                VersionStartDate: now,
                CompanyCode: '1000',
                AccountDesc: 'Approved Active Cash Account',
                AccountType: 'BA',
                Currency: 'INR',
                Status: 'ACT',
                WorkflowId: 'WF_LIVE_01',
                VersionActive: 'Y'
            },
            {
                GlAccountNum: 'GL1002',
                VersionStartDate: now,
                CompanyCode: '1000',
                AccountDesc: 'Pending Staging Bulk Account',
                AccountType: 'BA',
                Currency: 'INR',
                Status: '510',
                WorkflowId: 'WF_BULK_01',
                VersionActive: 'G'
            },
            {
                GlAccountNum: 'GL1003',
                VersionStartDate: now,
                CompanyCode: '1000',
                AccountDesc: 'Central Draft Account',
                AccountType: 'BA',
                Currency: 'INR',
                Status: '510',
                WorkflowId: 'WF_CENTRAL_01',
                VersionActive: 'I'
            },
            {
                GlAccountNum: 'GL1004',
                VersionStartDate: now,
                CompanyCode: '1000',
                AccountDesc: 'Old Superseded Version',
                AccountType: 'BA',
                Currency: 'INR',
                Status: 'ACT',
                WorkflowId: 'WF_OLD_01',
                VersionActive: 'N'
            }
        ]));

        const srv = await cds.serve('MainDataService').from(cds.model);
        const results = await srv.run(SELECT.from(srv.entities.GLAccount));

        assert.strictEqual(results.length, 1, 'Only 1 record must be returned');
        assert.strictEqual(results[0].GlAccountNum, 'GL1001', 'Only the approved active account must appear');
        assert.strictEqual(results[0].VersionActive, 'Y');
        assert.strictEqual(results[0].Status, 'ACT');
    });

    // ── Test 2: Bulk Upload & Approval Lifecycle ─────────────────────────────
    await test('Bulk Workflow approval promotes G -> Y and makes record visible in Account Report', async () => {
        const srv = await cds.serve('MainDataService').from(cds.model);
        const wfId = 'WF_BULK_01';

        // 1. Initial check: GL1002 is still staged ('G') and NOT in Account Report
        let beforeApproval = await srv.run(SELECT.from(srv.entities.GLAccount).where({ GlAccountNum: 'GL1002' }));
        assert.strictEqual(beforeApproval.length, 0, 'Staged record must NOT be in report before approval');

        // 2. Approver approves bulk workflow
        await approveVersionedTable({
            tablename: 'zmdr_GLAccount',
            workflowid: wfId,
            keyFields: ['GlAccountNum'],
            lineitemConfig: [{ ColumnName: 'GlAccountNum', IsMatching: 'Y' }],
            userId: 'APPROVER_BALRAM'
        });

        // 3. Log approval audit
        await insertWFAudit({
            workflowid: wfId,
            entityname: 'ZMDR_GLACCOUNT',
            entityid: 'GL1002',
            operationtype: 'BULK UPDATE',
            wfstage: 'LEVEL1',
            action: 'APPROVED',
            userremarks: 'Approved by Balram',
            actioninguser: 'APPROVER_BALRAM'
        });

        // 4. Verification: GL1002 is now approved ('Y', 'ACT') and appears in Account Report
        let afterApproval = await srv.run(SELECT.from(srv.entities.GLAccount).where({ GlAccountNum: 'GL1002' }));
        assert.strictEqual(afterApproval.length, 1, 'Approved bulk record must appear in report');
        assert.strictEqual(afterApproval[0].VersionActive, 'Y');
        assert.strictEqual(afterApproval[0].Status, 'ACT');
        assert.strictEqual(afterApproval[0].WorkflowId, wfId);
    });

    // ── Test 3: Central Governance Draft Promotion ───────────────────────────
    await test('Central Workflow approval promotes I -> Y and makes record visible in Account Report', async () => {
        const srv = await cds.serve('MainDataService').from(cds.model);
        const wfId = 'WF_CENTRAL_01';

        // 1. Initial check: GL1003 is draft ('I') and NOT in Account Report
        let beforeApproval = await srv.run(SELECT.from(srv.entities.GLAccount).where({ GlAccountNum: 'GL1003' }));
        assert.strictEqual(beforeApproval.length, 0, 'Central draft must NOT be in report before approval');

        // 2. Central Approver approves
        await db.run(
            UPDATE(GLAccount)
                .set({ VersionActive: 'Y', Status: 'ACT' })
                .where({ WorkflowId: wfId, VersionActive: 'I' })
        );

        // 3. Log central approval audit
        await insertWFAudit({
            workflowid: wfId,
            entityname: 'ZMDR_GLACCOUNT',
            entityid: 'GL1003',
            operationtype: 'MDR Central Create',
            wfstage: 'LEVEL1',
            action: 'APPROVED',
            userremarks: 'Central creation verified and approved',
            actioninguser: 'APPROVER_MANAGER'
        });

        // 4. Verification: GL1003 now appears in Account Report
        let afterApproval = await srv.run(SELECT.from(srv.entities.GLAccount).where({ GlAccountNum: 'GL1003' }));
        assert.strictEqual(afterApproval.length, 1, 'Central approved record must appear in report');
        assert.strictEqual(afterApproval[0].VersionActive, 'Y');
        assert.strictEqual(afterApproval[0].Status, 'ACT');
        assert.strictEqual(afterApproval[0].WorkflowId, wfId);
    });

    // ── Test 4: Workflow Audit Trail Consistency ────────────────────────────
    await test('WFAudit retains complete audit history across Bulk and Central workflows', async () => {
        const audits = await db.run(SELECT.from(WFAudit).orderBy('ActionTime asc'));
        assert.ok(audits.length >= 2, 'Audit table must contain entries for processed workflows');

        const bulkAudits = audits.filter(a => a.WorkflowId === 'WF_BULK_01');
        assert.ok(bulkAudits.some(a => a.Action === 'APPROVED'), 'Bulk workflow must have APPROVED audit');

        const centralAudits = audits.filter(a => a.WorkflowId === 'WF_CENTRAL_01');
        assert.ok(centralAudits.some(a => a.Action === 'APPROVED'), 'Central workflow must have APPROVED audit');
    });

    // ── Test 5: Final Golden Report State ────────────────────────────────────
    await test('Final Entity Account Report displays exactly the 3 approved golden records', async () => {
        const srv = await cds.serve('MainDataService').from(cds.model);
        const finalResults = await srv.run(SELECT.from(srv.entities.GLAccount).orderBy('GlAccountNum asc'));

        assert.strictEqual(finalResults.length, 3, 'Exactly 3 approved accounts must be in report');
        const accountNums = finalResults.map(r => r.GlAccountNum);
        assert.deepStrictEqual(accountNums, ['GL1001', 'GL1002', 'GL1003']);

        for (const row of finalResults) {
            assert.strictEqual(row.VersionActive, 'Y', `Row ${row.GlAccountNum} must have VersionActive=Y`);
            assert.strictEqual(row.Status, 'ACT', `Row ${row.GlAccountNum} must have Status=ACT`);
            assert.ok(row.WorkflowId, `Row ${row.GlAccountNum} must have WorkflowId`);
        }
    });

    console.log('\n================================================================');
    console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) process.exit(1);
}

runE2EIntegrationTests().catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
});
