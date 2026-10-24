'use strict';
const cds = require('@sap/cds');

// Custom REST endpoints to bypass CAP OData V4 serialization limitations.
// CAP OData V4 returns HTTP 204 (no content) for actions that have anonymous
// inline return types containing nested arrays of complex types
// (e.g. `array of { data: String }`). These REST routes call the same backend
// logic directly and return proper JSON.
cds.on('bootstrap', (app) => {
    // 2. Load express JSON
    const express = require('express');
    app.use(express.json());

    // --- VALIDATE ---
    // Validates uploaded rows against config + lookup tables. dataload='N' means
    // rows are NOT written to the DB — only validation results are returned.
    app.post('/mdrapi/bulk/rest/validateBulkData', async (req, res) => {
        try {
            const { processBulkData } = require('./srv/lib/process-bulk');
            const {
                tablename, requesterrole, rowData,
                overwriteWithNull, futureVersion, workflowid
            } = req.body;

            const result = await processBulkData({
                tablename,
                requesterrole,
                dataload: 'N',
                overwriteWithNull,
                futureVersion,
                workflowid,
                rowData: rowData || [],
                userId: req.user?.id || 'anonymous'
            });

            // Explicitly set Content-Type and send stringified JSON so that
            // an object, null, or undefined never produces an empty body.
            const body = JSON.stringify(result ?? null);
            res.status(200).set('Content-Type', 'application/json').send(body);
        } catch (err) {
            console.error('[REST /mdrapi/bulk/rest/validateBulkData] Error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // --- SUBMIT ---
    // Stages rows in the versioned table (VERSION_ACTIVE='G') or BulkTemp,
    // generates a workflow ID, and writes the initial WFAudit INITIATED entry.
    app.post('/mdrapi/bulk/rest/submitBulkData', async (req, res) => {
        try {
            const { processBulkData } = require('./srv/lib/process-bulk');
            const { insertWFAudit } = require('./srv/lib/wf-utilities');
            const {
                tablename, requesterrole, validData,
                overwriteWithNull, futureVersion, workflowid, remarks
            } = req.body;

            const result = await processBulkData({
                tablename,
                requesterrole,
                dataload: 'Y',
                overwriteWithNull,
                futureVersion,
                workflowid,
                rowData: (validData || []).map(r => r.data),
                userId: req.user?.id || 'anonymous'
            });

            await insertWFAudit({
                workflowid: result.workflowid,
                entityname: tablename,
                entityid: '',
                operationtype: 'BULK UPDATE',
                wfstage: 'INITIATOR',
                action: 'INITIATED',
                userremarks: remarks || '',
                actioninguser: req.user?.id || 'anonymous',
            });

            const body = JSON.stringify({
                workflowid: result.workflowid,
                message: 'Submitted successfully',
                type: 'S'
            });
            res.status(200).set('Content-Type', 'application/json').send(body);
        } catch (err) {
            console.error('[REST /mdrapi/bulk/rest/submitBulkData] Error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // --- TRIGGER WORKFLOW ---
    // Resolves approvers from config, starts a SAP BPA workflow instance
    // (with automatic mock fallback when BPA env vars are not set),
    // and persists the MDR ↔ BPA link in MDRWorkflowLink.
    app.post('/mdrapi/bulk/rest/triggerBulkWorkflow', async (req, res) => {
        try {
            const { startBulkApprovalWorkflow } = require('./srv/lib/bpa-client');
            const { saveMDRWorkflowLink, getApprovers } = require('./srv/lib/wf-utilities');
            const {
                workflowid, tablename, requestorid, requestoremail,
                operationtype, approverstage, apprclass,
                validrecordcount, requesterrole
            } = req.body;

            // Resolve approvers from BulkHdrConfig.ApprClass
            const approverResult = await getApprovers({
                appidentifier: 'BULK',
                system: '', subclass: '', hierarchy: '',
                requesterid: requestorid || '',
                processid: '',
                tablename,
                saprole: requesterrole
            });

            // Start BPA workflow — falls back to a mock ID if BPA is not configured
            let bpaInstanceId;
            try {
                bpaInstanceId = await startBulkApprovalWorkflow({
                    workflowid, tablename, requestorid, requestoremail,
                    operationtype, approverstage, apprclass,
                    validrecordcount, requesterrole,
                    approvers: approverResult.approvers
                });
            } catch (bpaErr) {
                console.warn('[BPA] Workflow trigger skipped (BPA not configured):', bpaErr.message);
                bpaInstanceId = 'MOCK-' + Date.now();
            }

            // Persist MDR workflow ID ↔ BPA instance ID link
            await saveMDRWorkflowLink(workflowid, tablename, bpaInstanceId);

            const body = JSON.stringify({ bpaInstanceId, message: 'Workflow triggered', type: 'S' });
            res.status(200).set('Content-Type', 'application/json').send(body);
        } catch (err) {
            console.error('[REST /mdrapi/bulk/rest/triggerBulkWorkflow] Error:', err);
            res.status(500).json({ error: err.message });
        }
    });
});

module.exports = cds.server;
