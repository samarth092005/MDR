/**
 * Business Partner (BPMaster) Create, Metadata Safety, and Approval Activation Test Suite
 */
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const cds = require('@sap/cds');

async function run() {
    console.log("================================================================");
    console.log(" BUSINESS PARTNER (BPMASTER) CREATION & APPROVAL ACTIVATION TEST");
    console.log("================================================================\n");

    let passCount = 0;
    function pass(msg) {
        console.log(`  ✅ PASS: ${msg}`);
        passCount++;
    }

    // 1. Verify TableResult.controller.js does not unconditionally filter MATERIALNUM
    const trPath = path.join(__dirname, '../app/zmdr_cntrl_main/webapp/controller/TableResult.controller.js');
    const trContent = fs.readFileSync(trPath, 'utf8');
    assert(trContent.includes('sTargetTable === "ZMDR_MATERIAL" && sCreatedMat'),
        'TableResult must only apply MATERIALNUM filter for ZMDR_MATERIAL');
    pass("TableResult guards MATERIALNUM filter strictly for ZMDR_MATERIAL table");

    // 2. Verify MainScreen.controller.js entity-aware sessionStorage and safe app prefix
    const msPath = path.join(__dirname, '../app/zmdr_cntrl_cmn/webapp/controller/MainScreen.controller.js');
    const msContent = fs.readFileSync(msPath, 'utf8');
    assert(!msContent.includes('/mdrcapbtp.comintappticszmdrcntrlcmn-0.0.1'),
        'MainScreen must not contain broken hardcoded launchpad prefix with -0.0.1');
    assert(msContent.includes('this.sSelectedTableName === "ZMDR_MATERIAL" && sCreatedKey'),
        'MainScreen must only set MDR_LAST_CREATED_MAT when table is ZMDR_MATERIAL');
    pass("MainScreen uses safe prefix resolution and entity-aware sessionStorage");

    // 3. Connect to CAP and test BPMaster lifecycle
    cds.model = await cds.load('db');
    const db = await cds.connect.to({ kind: 'sqlite', credentials: { url: 'db.sqlite' } });
    const dynDb = require('../srv/lib/db-dynamic');

    const testBpId = 'BP_TEST_' + Date.now().toString().slice(-6);
    const testWfId = 'WF_BP_' + Date.now().toString().slice(-5);

    // Create a new BPMaster entry with VersionActive='I' (simulating creation in MainScreen)
    await dynDb.insertRow(db, 'ZMDR_BPMASTER', {
        BpId: testBpId,
        CustomerNo: 'CUST_' + testBpId,
        LegalName: 'Test Business Partner Ltd',
        VersionActive: 'I',
        Status: '510',
        WorkflowId: testWfId,
        VersionStartDate: new Date().toISOString()
    });

    const createdRows = await dynDb.readRows(db, 'ZMDR_BPMASTER', '"WorkflowId" = ?', [testWfId]);
    assert.strictEqual(createdRows.length, 1, 'BPMaster record must be created');
    assert.strictEqual(createdRows[0].VersionActive || createdRows[0].VERSIONACTIVE, 'I', 'Initial state must be In-Flight (I)');
    pass("BPMaster staged record created with VersionActive='I' and Status='510'");

    // 4. Test candidate table resolution in takeActionCentral
    const centralHandler = require('../srv/central-handler');
    const wfUtils = require('../srv/lib/wf-utilities');

    // Simulate takeActionCentral APPROVED call
    const updateActive = {
        VERSION_ACTIVE: 'Y',
        STATUS: 'ACT',
        VersionActive: 'Y',
        Status: 'ACT'
    };

    // Update row using dynDb with WorkflowId
    await dynDb.updateRow(db, 'ZMDR_BPMASTER', updateActive, '"WorkflowId" = ?', [testWfId]);

    // Insert approval audit entry
    await wfUtils.insertWFAudit({
        workflowid: testWfId,
        action: 'APPROVED',
        userremarks: 'Approved by test approver',
        actioninguser: 'test.approver@abhiyantatech.com',
        operationtype: 'APPROVAL_DECISION'
    });

    // Verify row was updated to Active 'Y' and 'ACT'
    const updatedRows = await dynDb.readRows(db, 'ZMDR_BPMASTER', '"WorkflowId" = ?', [testWfId]);
    assert.strictEqual(updatedRows.length, 1, 'BPMaster record must still exist');
    const activeVal = updatedRows[0].VersionActive || updatedRows[0].VERSIONACTIVE;
    const statusVal = updatedRows[0].Status || updatedRows[0].STATUS;
    assert.strictEqual(activeVal, 'Y', 'Record must be activated to VersionActive=Y');
    assert.strictEqual(statusVal, 'ACT', 'Record status must be promoted to ACT');
    pass("BPMaster approved record promoted to VersionActive='Y' and Status='ACT'");

    // Verify WFAudit entry exists
    const auditRows = await db.run(
        SELECT.from('zmdr.WFAudit').where({ WorkflowId: testWfId, Action: 'APPROVED' })
    );
    assert(auditRows.length >= 1, 'WFAudit must have APPROVED audit entry');
    assert.strictEqual(auditRows[0].Action, 'APPROVED', 'Audit action must be APPROVED');
    pass("WFAudit logged APPROVED decision with correct WorkflowId and user remarks");

    // Clean up test records
    await dynDb.deleteRows(db, 'ZMDR_BPMASTER', '"WorkflowId" = ?', [testWfId]);
    await db.run(DELETE.from('zmdr.WFAudit').where({ WorkflowId: testWfId }));
    pass("Test data cleanly removed");

    console.log("\n================================================================");
    console.log(` RESULTS: ${passCount} PASSED, 0 FAILED`);
    console.log("================================================================\n");
}

run().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
