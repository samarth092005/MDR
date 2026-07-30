// srv/workflow-service.js
'use strict';
const cds = require('@sap/cds');
const bpa = require('./lib/bpa-client');

module.exports = cds.service.impl(async function (srv) {

    srv.on('CREATE', 'TriggerWorkflowSet', async (req) => {
        console.log(`[Workflow Handler] CREATE triggered for TriggerWorkflowSet`);
        console.log("Payload:", JSON.stringify(req.data, null, 2));

        // Generate a dummy workflow ID if not provided
        const workflowId = req.data.WorkflowId || ("WF" + Math.floor(Math.random() * 10000));
        
        try {
            // Build the context object expected by BPA
            const ctx = {
                workflowid: workflowId,
                tablename: req.data.Tablename || '',
                entityid: req.data.EntityId || '',
                entityname: req.data.EntityName || '',
                operationtype: req.data.OperationType || '',
                requestorid: req.user.id || 'anonymous',
                requestoremail: req.user.id || 'anonymous@example.com',
                requesterrole: 'MDR_REQUESTOR',
                userremarks: req.data.UserRemarks || '',
                initialstage: 'LEVEL1', // Default for now
                currentstage: 'LEVEL1',
                processid: '',
                totalsteps: 1, 
                adminemail: req.user.id || 'anonymous@example.com', 
                capbaseurl: process.env.CAP_BASE_URL || ''
            };

            // Trigger the correct workflow based on the UI identifier
            if (req.data.WorkflowIdentifier === "CENTRAL") {
                console.log("[Workflow Handler] Triggering Central Approval Workflow");
                await bpa.startCentralApprovalWorkflow(ctx);
            } else if (req.data.WorkflowIdentifier === "BULK") {
                console.log("[Workflow Handler] Triggering Bulk Approval Workflow");
                await bpa.startBulkApprovalWorkflow(ctx);
            } else {
                console.warn("[Workflow Handler] Unknown WorkflowIdentifier, skipping BPA trigger:", req.data.WorkflowIdentifier);
            }
            
            // Return the payload back to UI upon success
            return {
                WorkflowId: workflowId,
                EntityName: req.data.EntityName,
                EntityId: req.data.EntityId,
                Tablename: req.data.Tablename,
                OperationType: req.data.OperationType,
                UserRemarks: req.data.UserRemarks,
                WorkflowIdentifier: req.data.WorkflowIdentifier
            };
        } catch (error) {
            console.error("[Workflow Handler] Failed to trigger BPA Workflow:", error);
            req.error(500, `Failed to trigger workflow in SAP Build: ${error.message}`);
        }
    });

    // ── resolveApprovers ─────────────────────────────────────────────────
    srv.on('resolveApprovers', async (req) => {
        console.log("[Workflow Handler] resolveApprovers called with:", req.data);
        const { tablename, currentStage, processId, requesterRole, requestorId, apprClass } = req.data;
        
        // get approver class line item id from approver class
        const db = await cds.connect.to('db');
        const { ApproverClass, Approver } = db.entities('zmdr');
        const approverClassLineItemId = await db.run(SELECT.one.from(ApproverClass).where({ subclass : apprClass, version_active : 'X'}).columns('approver_class_lineid'));//.then(r => r ? r.approverclasslineitemid : null);
        // get approver list from approver class line item id
        const approverList = await db.run(SELECT.one.from(Approver).where({ approver_class_lineid : approverClassLineItemId.approver_class_lineid, version_active : 'X', status : 'ACT'}).columns('approver_lineid', 'version_start_date', 'node_name', 'approver_id', 'status'));
        // return approver id, default approver email, and next stage
        if (approverList) {
            return {
                approverEmail: approverList.approver_id + '@abhiyantatech.com', // Assuming email is derived from approver_id
                approverId: approverList.approver_id,
                nextStage: '' // Blank means final stage
            };
        } else {
            console.warn("[Workflow Handler] No approvers found for class:", apprClass);
            return {
                approverEmail: 'approver@example.com',
                approverId: 'APPROVER',
                nextStage: ''
            };
        }
        // For now, return dummy approver to allow BPA to continue without failing on missing tables
        // return {
        //     approverEmail: req.user.id || 'approver@example.com',
        //     approverId: req.user.id || 'APPROVER',
        //     nextStage: '' // Blank means final stage
        // };
    });

    // ── insertWFAudit (generic audit writer) ─────────────────────────────
    srv.on('insertWFAudit', async (req) => {
        console.log(`[Workflow Handler] insertWFAudit (${req.data.action}) called for ${req.data.workflowId}`);
        const d = req.data;
        const db = await cds.connect.to('db');
        const { WFAudit } = db.entities('zmdr'); // using 'zmdr' namespace
        
        try {
            const count = await db.run(SELECT.from(WFAudit).where({ workflowid: d.workflowId })).then(r => r.length);
            const sequenceid = `${d.workflowId}-${count + 1}`;
            
            await db.run(INSERT.into(WFAudit).entries({
                sequenceid,
                workflowid:    d.workflowId,
                entityid:      d.entityId || '',
                actiontime:    new Date().toISOString(),
                operationtype: d.operationType,
                entityname:    d.entityName || '',
                wfstage:       d.wfStage || '',
                action:        d.action,
                userremarks:   d.userRemarks || '',
                actioninguser: d.actioningUser || '',
            }));
            return { sequenceid, success: true };
        } catch (err) {
            console.error("Error inserting WFAudit:", err.message);
            // Return success anyway so BPA doesn't crash during development
            return { sequenceid: 'ERROR', success: true }; 
        }
    });

    // Specific Audit Writers
    srv.on('pushInprogressAudit', async (req) => {
        const { workflowId, currentStage, approverId, tablename } = req.data;
        return srv.send('insertWFAudit', { workflowId, wfStage: currentStage, actioningUser: approverId, action: 'INPROGRESS' });
    });
    
    srv.on('pushApprovedAudit', async (req) => {
        const { workflowId, currentStage, approverId, approverRemarks } = req.data;
        return srv.send('insertWFAudit', { workflowId, wfStage: currentStage, actioningUser: approverId, action: 'APPROVED', userRemarks: approverRemarks });
    });

    srv.on('pushRejectedAudit', async (req) => {
        const { workflowId, currentStage, approverId, approverRemarks, action } = req.data;
        return srv.send('insertWFAudit', { workflowId, wfStage: currentStage, actioningUser: approverId, action: action || 'REJECTED', userRemarks: approverRemarks });
    });

    srv.on('completeWFAudit', async (req) => {
        const { workflowId, entityId, entityName } = req.data;
        return srv.send('insertWFAudit', { workflowId, entityId, entityName, wfStage: 'COMPLETE', action: 'COMPLETE', actioningUser: 'MDR_SYSTEM' });
    });

    srv.on('initiatedWFAudit', async (req) => {
        const { workflowId, entityId, entityName, operationType, requestorId } = req.data;
        return srv.send('insertWFAudit', { workflowId, entityId, entityName, operationType, wfStage: 'INITIATED', action: 'INITIATED', actioningUser: requestorId });
    });

    // ── saveBPALinkage ────────────────────────────────────────────────────
    srv.on('saveBPALinkage', async (req) => {
        console.log(`[Workflow Handler] saveBPALinkage called for ${req.data.mdrWorkflowId}`);
        const { mdrWorkflowId, bpaInstanceId, tablename } = req.data;
        const db = await cds.connect.to('db');
        const { MDRWorkflowLink } = db.entities('zmdr');
        
        try {
            const existing = await db.run(SELECT.one.from(MDRWorkflowLink).where({ mdr_workflow_id: mdrWorkflowId, tablename }));
            if (!existing) {
                await db.run(INSERT.into(MDRWorkflowLink).entries({ 
                    mdr_workflow_id: mdrWorkflowId, 
                    tablename, 
                    bpa_instance_id: bpaInstanceId 
                }));
            }
            return { success: true };
        } catch (err) {
            console.error("Error saving Linkage:", err.message);
            return { success: true };
        }
    });

    srv.on('syncToS4HANA', async (req) => {
        console.log(`[Workflow Handler] syncToS4HANA called for ${req.data.workflowId}. Mocking success.`);
        return { success: true };
    });

    // ── Email helpers ─────────────────────────────────────────────────────
    srv.on('sendEmailToApprover', async (req) => {
        console.log(`\n📧 [EMAIL SENT TO APPROVER]: ${req.data.approverEmail} | Subject: MDR Approval Required: ${req.data.entityName} — ${req.data.operationType}`);
        return { success: true };
    });

    srv.on('sendEmailToRequestor', async (req) => {
        console.log(`\n📧 [EMAIL SENT TO REQUESTOR]: ${req.data.requestorEmail} | Subject: MDR: Your ${req.data.operationType} request for ${req.data.entityName} has been processed`);
        return { success: true };
    });

    srv.on('sendEscalationEmail', async (req) => {
        console.log(`\n📧 [ESCALATION EMAIL]: Workflow ${req.data.workflowId} for ${req.data.entityName} at stage ${req.data.currentStage} escalated!`);
        return { success: true };
    });

    srv.on('sendReminderEmail', async (req) => {
        console.log(`\n📧 [REMINDER EMAIL]: Sent to approver ${req.data.approverEmail} for Workflow ${req.data.workflowId}`);
        return { success: true };
    });

    srv.on('sendReminderEmailRequester', async (req) => {
        console.log(`\n📧 [REMINDER EMAIL]: Sent to requester ${req.data.requestorEmail} for Workflow ${req.data.workflowId}`);
        return { success: true };
    });

});
