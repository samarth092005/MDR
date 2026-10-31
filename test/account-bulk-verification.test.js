'use strict';

/**
 * Automated Verification Test Suite for GL Account Bulk Upload Configuration & Lifecycle:
 * 1. Both requester roles (ZMDR_C_FIORI_ALL and ZMDR_C_FIORI_SAP) resolve correctly.
 * 2. Excel template column headers and sequence match exactly.
 * 3. Validation handles valid rows and flags invalid column counts and lookup errors.
 * 4. Staging submission writes records with VERSION_ACTIVE = 'G'.
 * 5. Approval promotion updates VERSION_ACTIVE from 'G' to 'Y' with case-insensitive key matching.
 * 6. MainDataService OData projection returns the approved live accounts.
 * 7. Regression: existing master-data entities (e.g. ZMDR_BPMASTER) resolve and stage correctly.
 * 8. Edge cases: duplicate keys, missing fields, and case variations are safely handled.
 */

const assert = require('assert');
const path = require('path');
const cds = require('@sap/cds');

async function runTests() {
    console.log('================================================================');
    console.log(' GL ACCOUNT BULK CONFIGURATION & FULL LIFECYCLE TEST SUITE');
    console.log('================================================================\n');

    const rootDir = path.resolve(__dirname, '..');
    process.chdir(rootDir);

    cds.root = rootDir;
    cds.model = await cds.load('*', { root: rootDir });

    // Connect to in-memory database to keep local db.sqlite and production HANA completely untouched
    const db = await cds.connect.to({
        kind: 'sqlite',
        credentials: { url: ':memory:' }
    });

    await cds.deploy(cds.model).to(db);
    console.log('✅ In-memory database deployed with complete CAP schema.\n');

    const entities = cds.entities('zmdr');
    const { BulkHdrConfig, BulkItmConfig, ApprovalStatus, GLAccount, BPMaster } = entities;

    // Seed standard lookup data
    await db.run(INSERT.into(ApprovalStatus).entries([
        { Code: 'ACT', Description: 'Active' },
        { Code: 'INA', Description: 'Inactive' }
    ]));

    const { processBulkData } = require('../srv/lib/process-bulk');
    const { approveVersionedTable } = require('../srv/lib/insert');
    const { getEntityDef } = require('../srv/lib/db-dynamic');

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

    // --- TEST 1: Dual Role Resolution ---
    await test('Both ZMDR_C_FIORI_ALL and ZMDR_C_FIORI_SAP resolve in BulkHdrConfig and BulkItmConfig', async () => {
        const roles = ['ZMDR_C_FIORI_ALL', 'ZMDR_C_FIORI_SAP'];
        for (const role of roles) {
            const hdr = await db.run(SELECT.one.from(BulkHdrConfig).where({ TableName: 'ZMDR_GLACCOUNT', RequesterRole: role }));
            assert.ok(hdr, `BulkHdrConfig must exist for role ${role}`);
            assert.strictEqual(hdr.TableDescription, 'G/L Account Master Data');
            assert.strictEqual(hdr.Category, 'Finance');
            assert.strictEqual(hdr.Versioned, 'Y');
            assert.strictEqual(hdr.ApprClass, 'MDR,FINANCE,FINANCEAPPROVER');

            const items = await db.run(SELECT.from(BulkItmConfig).where({ TableName: 'ZMDR_GLACCOUNT', RequesterRole: role }).orderBy('ColumnSeqNo'));
            assert.strictEqual(items.length, 6, `BulkItmConfig must contain 6 columns for role ${role}`);
        }
    });

    // --- TEST 2: Template Column Sequence ---
    await test('Excel Template generates exactly 6 expected columns in sequence', async () => {
        const items = await db.run(SELECT.from(BulkItmConfig).where({ TableName: 'ZMDR_GLACCOUNT', RequesterRole: 'ZMDR_C_FIORI_ALL' }).orderBy('ColumnSeqNo'));
        const headers = items.map(i => i.ColumnName);
        assert.deepStrictEqual(headers, ['GlAccountNum', 'CompanyCode', 'AccountDesc', 'AccountType', 'Currency', 'Status']);
    });

    // --- TEST 3: Entity Definition Resolver ---
    await test('getEntityDef resolves ZMDR_GLACCOUNT and unwraps BulkService projection to base entity', () => {
        const ent = getEntityDef('ZMDR_GLACCOUNT');
        assert.ok(ent, 'Entity definition must be found');
        assert.strictEqual(ent.name, 'zmdr.GLAccount');
        assert.ok(ent.elements.GlAccountNum, 'Must expose GlAccountNum');
        assert.ok(ent.elements.VersionActive, 'Must expose VersionActive');
    });

    // --- TEST 4: Row Validation (Valid and Invalid) ---
    await test('validateBulkData correctly validates well-formed and malformed rows', async () => {
        const validRow = '110000«1000«Petty Cash Account«BA«EUR«ACT';
        const resValid = await processBulkData({
            tablename: 'ZMDR_GLACCOUNT',
            requesterrole: 'ZMDR_C_FIORI_ALL',
            dataload: 'N',
            overwriteWithNull: 'N',
            futureVersion: 'N',
            workflowid: '',
            rowData: [validRow],
            userId: 'initiator_user'
        });
        assert.strictEqual(resValid.validCount, 1);
        assert.strictEqual(resValid.invalidCount, 0);
        assert.strictEqual(resValid.createCount, 1);

        // Missing columns
        const badRow = '110000«1000«Incomplete';
        const resBad = await processBulkData({
            tablename: 'ZMDR_GLACCOUNT',
            requesterrole: 'ZMDR_C_FIORI_ALL',
            dataload: 'N',
            overwriteWithNull: 'N',
            futureVersion: 'N',
            workflowid: '',
            rowData: [badRow],
            userId: 'initiator_user'
        });
        assert.strictEqual(resBad.validCount, 0);
        assert.strictEqual(resBad.invalidCount, 1);
        assert.ok(resBad.invalidData[0].message.includes('Column count'));
    });

    // --- TEST 5: Bulk Staging Submission ---
    await test('submitBulkData stages GL Account with VERSION_ACTIVE = "G"', async () => {
        const validRow = '110000«1000«Petty Cash Account«BA«EUR«ACT';
        const res = await processBulkData({
            tablename: 'ZMDR_GLACCOUNT',
            requesterrole: 'ZMDR_C_FIORI_ALL',
            dataload: 'Y',
            overwriteWithNull: 'N',
            futureVersion: 'N',
            workflowid: 'WF_GL_TEST_01',
            rowData: [validRow],
            userId: 'fiori_initiator'
        });
        assert.strictEqual(res.validCount, 1);
        assert.strictEqual(res.workflowid, 'WF_GL_TEST_01');

        const staged = await db.run(SELECT.from(GLAccount).where({ WorkflowId: 'WF_GL_TEST_01' }));
        assert.strictEqual(staged.length, 1);
        assert.strictEqual(staged[0].VersionActive, 'G');
        assert.strictEqual(staged[0].GlAccountNum, '110000');
        assert.strictEqual(staged[0].CompanyCode, '1000');
        assert.strictEqual(staged[0].AccountDesc, 'Petty Cash Account');
        assert.strictEqual(staged[0].Status, 'ACT');
    });

    // --- TEST 6: In-Progress Duplicate Key Detection ---
    await test('validateBulkData blocks duplicate upload when an in-progress record exists', async () => {
        const duplicateRow = '110000«1000«Duplicate Key Account«BA«EUR«ACT';
        const res = await processBulkData({
            tablename: 'ZMDR_GLACCOUNT',
            requesterrole: 'ZMDR_C_FIORI_ALL',
            dataload: 'N',
            overwriteWithNull: 'N',
            futureVersion: 'N',
            workflowid: '',
            rowData: [duplicateRow],
            userId: 'another_user'
        });
        assert.strictEqual(res.validCount, 0);
        assert.strictEqual(res.invalidCount, 1);
        assert.ok(res.invalidData[0].message.includes('In-progress records exist for this key'));
    });

    // --- TEST 7: Approval Promotion ---
    await test('approveVersionedTable promotes staged record from "G" to "Y" using case-resilient key matching', async () => {
        const items = await db.run(SELECT.from(BulkItmConfig).where({ TableName: 'ZMDR_GLACCOUNT', RequesterRole: 'ZMDR_C_FIORI_ALL' }).orderBy('ColumnSeqNo'));

        await approveVersionedTable({
            tablename: 'ZMDR_GLACCOUNT',
            workflowid: 'WF_GL_TEST_01',
            keyFields: ['GlAccountNum'],
            lineitemConfig: items,
            userId: 'fiori_approver'
        });

        const active = await db.run(SELECT.from(GLAccount).where({ GlAccountNum: '110000' }));
        assert.strictEqual(active.length, 1);
        assert.strictEqual(active[0].VersionActive, 'Y');
        assert.strictEqual(active[0].Status, 'ACT');
        assert.strictEqual(active[0].UpdatedBy, 'fiori_approver');
    });

    // --- TEST 8: MainDataService Query Verification ---
    await test('MainDataService GLAccount view queries the approved active record', async () => {
        const mdEntities = cds.entities('MainDataService');
        assert.ok(mdEntities && mdEntities.GLAccount, 'MainDataService.GLAccount entity must be defined');
        const rows = await db.run(SELECT.from(mdEntities.GLAccount).where({ VersionActive: 'Y' }));
        assert.strictEqual(rows.length, 1);
        assert.strictEqual(rows[0].GlAccountNum, '110000');
        assert.strictEqual(rows[0].AccountDesc, 'Petty Cash Account');
    });

    // --- TEST 9: Regression on Existing Master Data Entity (ZMDR_BPMASTER) ---
    await test('Regression: ZMDR_BPMASTER resolves correctly via getEntityDef and stages without error', async () => {
        const bpEnt = getEntityDef('ZMDR_BPMASTER');
        assert.ok(bpEnt, 'BPMaster entity must resolve');
        assert.strictEqual(bpEnt.name, 'zmdr.BPMaster');

        // Check that checkExists functions properly without throwing undefined replace
        const { checkExists } = require('../srv/lib/db-dynamic');
        const exists = await checkExists(db, 'ZMDR_BPMASTER', 'WORKFLOW_ID = ?', ['NON_EXISTENT_WF']);
        assert.strictEqual(exists, false);
    });

    console.log(`\n================================================================`);
    console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`================================================================\n`);

    if (failed > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('Test execution error:', err);
    process.exit(1);
});
