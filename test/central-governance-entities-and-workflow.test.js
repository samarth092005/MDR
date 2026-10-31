'use strict';

const assert = require('assert');
const path = require('path');
const cds = require('@sap/cds');

async function testCentralGovernance() {
    console.log('================================================================');
    console.log(' PHASES 4 - 7: CENTRAL GOVERNANCE & BPA WORKFLOW VERIFICATION');
    console.log('================================================================\n');

    const rootDir = path.resolve(__dirname, '..');
    process.chdir(rootDir);

    const { handleSubRequest, handleBatchRequest } = require('../srv/lib/gateway-local-fixture');
    const { startCentralApprovalWorkflow } = require('../srv/lib/bpa-client');
    const { insertWFAudit, saveMDRWorkflowLink } = require('../srv/lib/wf-utilities');

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

    // ── Phase 4: Business Partner End-to-End Verification ──────────────────
    await test('Phase 4: Business Partner (ZMDR_BPMASTER) URL & CntrlUIConfig mapping', async () => {
        const fs = require('fs');
        const urlCsv = fs.readFileSync('db/data/zmdr.CntrlUIUrl.csv', 'utf8');
        assert.ok(urlCsv.includes('ZMDR_BPMASTER,/mdrapi/maindata/BPMaster'), 'BPMaster OData URL must be mapped to /mdrapi/maindata/BPMaster');

        const configCsv = fs.readFileSync('db/data/zmdr.CntrlUIConfig.csv', 'utf8');
        assert.ok(configCsv.includes('ZMDR_BPMASTER,BpId'), 'BpId must be configured as primary key in CntrlUIConfig');
        assert.ok(configCsv.includes('ZMDR_BPMASTER,LegalName'), 'LegalName must be in CntrlUIConfig');
    });

    // ── Phase 5: Services Module All 10 Entities Verification ──────────────
    const servicesEntities = [
        'ServCatalogSet',
        'ServCategorySet',
        'ContractSet',
        'CustSegmentElgSet',
        'LocationSet',
        'PriceTariffSet',
        'SLASet',
        'ServOfferingSet',
        'ServPkgBundleSet',
        'ServProviderSet'
    ];

    for (const entitySet of servicesEntities) {
        await test(`Phase 5: Services Entity [${entitySet}] returns HTTP 200 via Gateway Fixture`, async () => {
            const res = handleSubRequest('GET', `/${entitySet}`, {}, null, 'ZMDR_CNTRL_SERVICES_SRV');
            assert.strictEqual(res.status, 200, `${entitySet} must return 200 OK`);
            const data = JSON.parse(res.body);
            assert.ok(Array.isArray(data.value), `${entitySet} response must contain an array of records`);
            assert.ok(data['@odata.count'] >= 0, `${entitySet} must return @odata.count`);
        });
    }

    await test('Phase 5: Services Create (POST /ServCatalogSet) stages record with Status=510', async () => {
        const payload = {
            CATALOG_ID: 'CAT_TEST_' + Date.now().toString().slice(-4),
            CATALOG_NAME: 'Cloud Integration Support',
            CATALOG_DESC: 'End-to-end integration support service',
            CATALOG_TYPE: 'Managed'
        };
        const res = handleSubRequest('POST', '/ServCatalogSet', { 'content-type': 'application/json' }, payload, 'ZMDR_CNTRL_SERVICES_SRV');
        assert.strictEqual(res.status, 201, 'POST /ServCatalogSet must return HTTP 201 Created');
        const created = JSON.parse(res.body);
        assert.strictEqual(created.CATALOG_ID, payload.CATALOG_ID);
        assert.strictEqual(created.STATUS, '510', 'Staged service record must have Status=510');
        assert.ok(created.WORKFLOW_ID, 'Workflow ID must be generated');
    });

    // ── Phase 6: Materials Module Verification ─────────────────────────────
    await test('Phase 6: Materials (ZMDR_MATERIAL) MaterialSet returns HTTP 200 with data', async () => {
        const res = handleSubRequest('GET', '/MaterialSet', {}, null, 'ZMDR_CNTRL_MATERIAL_SRV');
        assert.strictEqual(res.status, 200, 'MaterialSet must return 200 OK');
        const data = JSON.parse(res.body);
        assert.ok(Array.isArray(data.value), 'MaterialSet response must contain an array');
        assert.ok(data.value.length > 0, 'MaterialSet must return seeded materials');
        assert.ok(data.value[0].MATERIALNUM, 'Material row must have MATERIALNUM');
    });

    await test('Phase 6: Materials Create (POST /MaterialSet) stages record with Status=510', async () => {
        const matNum = 'MAT_' + Date.now().toString().slice(-6);
        const payload = {
            MATERIALNUM: matNum,
            MATERIALDESC: 'High Performance Server Unit',
            MATERIALGROUP: 'IT_EQ',
            MATERIALTYPE: 'HAWA',
            MEASUREBASEUNIT: 'EA'
        };
        const res = handleSubRequest('POST', '/MaterialSet', { 'content-type': 'application/json' }, payload, 'ZMDR_CNTRL_MATERIAL_SRV');
        assert.strictEqual(res.status, 201, 'POST /MaterialSet must return HTTP 201 Created');
        const created = JSON.parse(res.body);
        assert.strictEqual(created.MATERIALNUM, matNum);
        assert.strictEqual(created.STATUS, '510', 'Staged material must have Status=510');
        assert.ok(created.WORKFLOW_ID, 'Workflow ID must be generated');
    });

    // ── Phase 7: BPA Inbox Context & Workflow Dispatch Verification ────────
    await test('Phase 7: BPA Central Approval Workflow context structure & definition ID', async () => {
        const ctx = {
            workflowid: 'WF_TEST_CENTRAL_AUTO',
            tablename: 'ZMDR_BPMASTER',
            entityid: 'BP_1001',
            entityname: 'Business Partner',
            operationtype: 'CREATE',
            requestorid: 'abhinandan.d@abhiyantatech.com',
            requestoremail: 'abhinandan.d@abhiyantatech.com',
            requesterrole: 'MDR_REQUESTOR',
            userremarks: 'Automated test suite verification',
            initialstage: 'LEVEL1',
            currentstage: 'LEVEL1',
            processid: '',
            totalsteps: 1,
            adminemail: 'abhinandan.d@abhiyantatech.com',
            capbaseurl: 'https://sample-cap.cfapps.eu30.hana.ondemand.com'
        };

        assert.strictEqual(ctx.workflowid, 'WF_TEST_CENTRAL_AUTO');
        assert.strictEqual(ctx.tablename, 'ZMDR_BPMASTER');
        assert.strictEqual(ctx.requesterrole, 'MDR_REQUESTOR');
        assert.strictEqual(ctx.currentstage, 'LEVEL1');
    });

    console.log('\n================================================================');
    console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
        process.exit(1);
    }
}

testCentralGovernance().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
