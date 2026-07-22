// srv/central-handler.js
'use strict';
const cds = require('@sap/cds');
const bpa = require('./lib/bpa-client');
const wfUtils = require('./lib/wf-utilities');
const dynDb = require('./lib/db-dynamic');

module.exports = cds.service.impl(async function (srv) {

    srv.on('validateCentralData', async req => {
        console.log("---- validateCentralData called ----");
        console.log("Payload:", JSON.stringify(req.data, null, 2));
        // TODO: Implement validation logic
        return { message: 'Validation successful', type: 'S' };
    });

    srv.on('submitCentralData', async req => {
        console.log("---- submitCentralData called ----");
        console.log("Payload:", JSON.stringify(req.data, null, 2));
        // TODO: Implement submission logic and WFAudit insert
        return { workflowid: 'DUMMY_WF', message: 'Submitted successfully', type: 'S' };
    });

    srv.on('triggerCentralWorkflow', async req => {
        console.log("---- triggerCentralWorkflow called ----");
        const { workflowid, tablename } = req.data;
        
        try {
            // 1. Build BPA Context
            const ctx = {
                workflowid,
                tablename,
                requestorid: req.user.id || 'anonymous',
                operationtype: 'CREATE',
                validrecordcount: 1
            };
            
            // 2. Start BPA Workflow
            const bpaInstanceId = await bpa.startCentralApprovalWorkflow(ctx);
            
            // 3. Link workflow ID to BPA ID in database
            await wfUtils.saveMDRWorkflowLink(workflowid, tablename, bpaInstanceId);
            
            return { bpaInstanceId, message: 'Workflow triggered successfully' };
        } catch (err) {
            console.error("BPA Trigger Error:", err);
            req.error(500, `Failed to trigger workflow: ${err.message}`);
        }
    });

    srv.on('getCentralRequestData', async req => {
        console.log("---- getCentralRequestData called ----");
        console.log("Payload:", JSON.stringify(req.data, null, 2));
        // TODO: Implement fetching draft data from in-flight tables
        return { data: [], olddata: [], wfids: [], message: '', type: 'S' };
    });

    srv.on('takeActionCentral', async req => {
        console.log("---- takeActionCentral called ----");
        const { workflowid, action, remarks, bpaInstanceId } = req.data;
        
        try {
            // 1. Log Audit
            await wfUtils.insertWFAudit({
                workflowid,
                action,
                userremarks: remarks,
                actioninguser: req.user.id || 'bpa-system',
                operationtype: 'APPROVAL_DECISION'
            });
            
            // 2. Database Update Logic
            if (action === 'APPROVED') {
                console.log(`[Central] Decision APPROVED. Moving draft to live table: ${workflowid}`);
                // TODO: Call insert.js or dynDb to promote draft to live table
            } else {
                console.log(`[Central] Decision REJECTED for workflow: ${workflowid}`);
                // TODO: Call logic to delete/mark draft as rejected
            }
            
            return { message: `Action ${action} recorded in CAP successfully`, type: 'S' };
        } catch (err) {
            console.error("Action Plugin Error:", err);
            req.error(500, `Failed to process action in CAP: ${err.message}`);
        }
    });

    // Mock Custom Validations to prevent 404 in UI
    srv.on('READ', 'ZMDGCPCNTRLVAL01', () => []);
    srv.on('READ', 'ZMDGCPCNTRLVAL01Set', () => []);

    // Standard hooks for dynamic endpoints (if the UI uses generic CRUD)
    srv.before('READ', '*', async (req) => {
        console.log(`[Central Handler] BEFORE READ triggered for entity: ${req.target.name}`);
    });

    srv.before('CREATE', '*', async (req) => {
        console.log(`[Central Handler] BEFORE CREATE triggered for entity: ${req.target.name}`);
        console.log("Payload before:", JSON.stringify(req.data, null, 2));
        
        // Auto-assign In-flight status for new drafts/amendments if missing
        if (req.target.elements.VERSION_ACTIVE && !req.data.VERSION_ACTIVE) {
            req.data.VERSION_ACTIVE = 'I';
        }
        
        // Ensure workflow ID is populated (dummy for now)
        if (req.target.elements.WORKFLOW_ID && !req.data.WORKFLOW_ID) {
            req.data.WORKFLOW_ID = 'DUMMY_WF';
        }
    });

    srv.before('UPDATE', '*', async (req) => {
        console.log(`[Central Handler] BEFORE UPDATE triggered for entity: ${req.target.name}`);
        console.log("Payload:", JSON.stringify(req.data, null, 2));
    });

    srv.before('DELETE', '*', async (req) => {
        console.log(`[Central Handler] BEFORE DELETE triggered for entity: ${req.target.name}`);
    });

});
