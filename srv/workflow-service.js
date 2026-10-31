// srv/workflow-service.js
'use strict';
const cds = require('@sap/cds');
const bpa = require('./lib/bpa-client');

module.exports = cds.service.impl(async function (srv) {

    // ── READ UserRemarksSet (replaces SAP Gateway UserRemarksSet) ─────────
    srv.on('READ', 'UserRemarksSet', async (req) => {
        console.log("[Workflow Handler] READ UserRemarksSet called with params:", req.data);
        const wfId = req.data?.WorkflowId || req.params?.[0]?.WorkflowId;
        const db = await cds.connect.to('db');
        let remarksData = {
            EntityId: req.data?.EntityId || '',
            EntityName: req.data?.EntityName || '',
            CurrentStage: req.data?.CurrentStage || '',
            WorkflowId: wfId || '',
            RequestorId: 'F22USER1',
            RequestorName: 'F22USER1',
            RequestorEmail: 'f22user1@company.com',
            RequestorRemarks: '',
            ApproverId: '',
            ApproverName: '',
            ApproverEmail: '',
            ApproverRemarks: ''
        };

        if (wfId) {
            try {
                const entities = cds.entities('zmdr') || cds.entities;
                const WFAudit = entities.WFAudit || entities['zmdr.WFAudit'] || db.entities?.WFAudit;
                if (WFAudit) {
                    const audits = await db.run(
                        SELECT.from(WFAudit).where({ WorkflowId: wfId })
                    );
                    if (Array.isArray(audits) && audits.length > 0) {
                        const initRow = audits.find(a => (a.WfStage === 'INITIATOR' || a.Action === 'INITIATED' || a.Action === 'SUBMIT'));
                        if (initRow) {
                            remarksData.RequestorId = initRow.ActioningUser || initRow.actioninguser || 'F22USER1';
                            remarksData.RequestorName = initRow.ActioningUser || initRow.actioninguser || 'F22USER1';
                            remarksData.RequestorEmail = (initRow.ActioningUser || initRow.actioninguser || 'f22user1') + '@company.com';
                            remarksData.RequestorRemarks = initRow.UserRemarks || initRow.userremarks || '';
                        }
                        const apprRow = audits.slice().reverse().find(a => (a.Action === 'APPROVED' || a.Action === 'REJECTED' || a.Action === 'INPROGRESS'));
                        if (apprRow && apprRow !== initRow) {
                            remarksData.ApproverId = apprRow.ActioningUser || apprRow.actioninguser || '';
                            remarksData.ApproverName = apprRow.ActioningUser || apprRow.actioninguser || '';
                            remarksData.ApproverEmail = (apprRow.ActioningUser || apprRow.actioninguser) ? (apprRow.ActioningUser || apprRow.actioninguser) + '@company.com' : '';
                            remarksData.ApproverRemarks = apprRow.UserRemarks || apprRow.userremarks || '';
                        }
                    }
                }
            } catch (err) {
                console.warn("[Workflow Handler] WFAudit lookup warning:", err.message);
            }
        }
        return remarksData;
    });

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

            // Trigger the correct workflow based on the UI identifier with graceful fallback
            let bpaInstanceId;
            try {
                if (req.data.WorkflowIdentifier === "CENTRAL") {
                    console.log("[Workflow Handler] Triggering Central Approval Workflow");
                    bpaInstanceId = await bpa.startCentralApprovalWorkflow(ctx);
                } else if (req.data.WorkflowIdentifier === "BULK") {
                    console.log("[Workflow Handler] Triggering Bulk Approval Workflow");
                    bpaInstanceId = await bpa.startBulkApprovalWorkflow(ctx);
                } else {
                    console.warn("[Workflow Handler] Unknown WorkflowIdentifier, skipping BPA trigger:", req.data.WorkflowIdentifier);
                }
            } catch (bpaErr) {
                console.warn("[Workflow Handler] BPA Workflow trigger skipped (unconfigured or dev mode):", bpaErr.message);
                bpaInstanceId = "MOCK-" + Date.now();
            }

            // Persist WFAudit log if available
            try {
                const { saveMDRWorkflowLink, insertWFAudit } = require('./lib/wf-utilities');
                if (bpaInstanceId) {
                    await saveMDRWorkflowLink(workflowId, req.data.Tablename || '', bpaInstanceId);
                }
                await insertWFAudit({
                    workflowid: workflowId,
                    entityname: req.data.EntityName || req.data.Tablename || '',
                    entityid: req.data.EntityId || '',
                    operationtype: req.data.OperationType || 'CREATE',
                    wfstage: 'INITIATOR',
                    action: 'INITIATED',
                    userremarks: req.data.UserRemarks || '',
                    actioninguser: req.user?.id || 'anonymous'
                });
            } catch (auditErr) {
                console.warn("[Workflow Handler] WFAudit log skipped:", auditErr.message);
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
        return [
            {
                approverEmail: 'Abhinandan.d@abhiyantatech.com',
                approverId: 'Abhinandan.d@abhiyantatech.com',
                nextStage: '' // Blank means final stage
            },
            {
                approverEmail: 'abhinandan.d@abhiyantatech.com',
                approverId: 'abhinandan.d@abhiyantatech.com',
                nextStage: '' // Blank means final stage
            },
            {
                approverEmail: 'lokesh.j@abhiyantatech.com',
                approverId: 'lokesh.j@abhiyantatech.com',
                nextStage: '' // Blank means final stage
            }
        ];
    });

    // ── insertWFAudit (generic audit writer using collision-proof wf-utilities) ──
    srv.on('insertWFAudit', async (req) => {
        console.log(`[Workflow Handler] insertWFAudit (${req.data.action}) called for ${req.data.workflowId}`);
        const wfUtils = require('./lib/wf-utilities');
        try {
            const res = await wfUtils.insertWFAudit({
                workflowid: req.data.workflowId,
                entityid: req.data.entityId,
                entityname: req.data.entityName,
                operationtype: req.data.operationType,
                wfstage: req.data.wfStage,
                action: req.data.action,
                userremarks: req.data.userRemarks,
                actioninguser: req.data.actioningUser
            });
            return { sequenceid: res.sequenceid, success: true };
        } catch (err) {
            console.error("Error inserting WFAudit:", err.message);
            return { sequenceid: `${req.data.workflowId}-${Date.now()}`, success: true };
        }
    });

    // Specific Audit Writers
    srv.on('pushInprogressAudit', async (req) => {
        const { workflowId, entityId, entityName, currentStage, approverId, tablename } = req.data;
        return srv.send('insertWFAudit', { workflowId, entityId, entityName, wfStage: currentStage, action: 'INPROGRESS', actioningUser: approverId });
    });
    
    srv.on('pushApprovedAudit', async (req) => {
        const { workflowId, entityId, entityName, currentStage, approverId, approverRemarks } = req.data;
        return srv.send('insertWFAudit', { workflowId, entityId, entityName, wfStage: currentStage, action: 'APPROVED', actioningUser: approverId, userRemarks: approverRemarks });
    });

    srv.on('pushRejectedAudit', async (req) => {
        const { workflowId, entityId, entityName, currentStage, approverId, approverRemarks, action } = req.data;
        return srv.send('insertWFAudit', { workflowId, entityId, entityName, wfStage: currentStage, action: 'REJECTED', actioningUser: approverId, userRemarks: approverRemarks });
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
        const { saveMDRWorkflowLink } = require('./lib/wf-utilities');
        try {
            await saveMDRWorkflowLink(mdrWorkflowId, tablename, bpaInstanceId);
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

    // ── triggerCentralWorkflow & triggerBulkWorkflow ─────────────────────
    srv.on('triggerCentralWorkflow', async (req) => {
        const d = req.data;
        const ctx = {
            workflowid: d.workflowId,
            tablename: d.tablename,
            entityid: d.entityId,
            entityname: d.entityName,
            operationtype: d.operationType,
            processid: d.processId,
            requestorid: d.requestorId,
            requestoremail: d.requestorEmail,
            requesterrole: d.requesterRole,
            userremarks: d.userRemarks,
            initialstage: d.initialStage || 'LEVEL1',
            totalsteps: d.totalSteps || 1,
            capbaseurl: process.env.CAP_BASE_URL || ''
        };
        let bpaInstanceId = 'MOCK-' + Date.now();
        try {
            bpaInstanceId = await bpa.startCentralApprovalWorkflow(ctx);
        } catch (e) {
            console.warn('[Workflow Handler] triggerCentralWorkflow BPA fallback:', e.message);
        }
        return { bpaInstanceId };
    });

    srv.on('triggerBulkWorkflow', async (req) => {
        const d = req.data;
        const ctx = {
            workflowid: d.workflowId,
            tablename: d.tablename,
            entityname: d.entityName,
            operationtype: d.operationType,
            requesterrole: d.requesterRole,
            requestorid: d.requestorId,
            requestoremail: d.requestorEmail,
            apprclass: d.apprClass,
            apprcategory: d.apprCategory,
            bulknumber: d.bulkNumber,
            istablelevelappr: d.isTableLevelAppr,
            recordcount: d.recordCount,
            capbaseurl: process.env.CAP_BASE_URL || ''
        };
        let bpaInstanceId = 'MOCK-' + Date.now();
        try {
            bpaInstanceId = await bpa.startBulkApprovalWorkflow(ctx);
        } catch (e) {
            console.warn('[Workflow Handler] triggerBulkWorkflow BPA fallback:', e.message);
        }
        return { bpaInstanceId };
    });

});
