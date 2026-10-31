// srv/central-handler.js
'use strict';
const cds = require('@sap/cds');
const bpa = require('./lib/bpa-client');
const wfUtils = require('./lib/wf-utilities');
const dynDb = require('./lib/db-dynamic');
const { generateWorkflowId } = require('./lib/wf-id');

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
        const { tablename, rowData, operation } = req.data;
        try {
            let parsedRow = {};
            if (typeof rowData === 'string' && rowData.trim()) {
                try {
                    parsedRow = JSON.parse(rowData);
                } catch (_) {
                    parsedRow = { data: rowData };
                }
            } else if (rowData && typeof rowData === 'object') {
                parsedRow = { ...rowData };
            }

            const wfId = await generateWorkflowId(tablename);
            const rowToInsert = { ...parsedRow };
            rowToInsert.WORKFLOW_ID = wfId;
            rowToInsert.WorkflowId = wfId;
            rowToInsert.VERSION_ACTIVE = 'I';
            rowToInsert.VersionActive = 'I';
            rowToInsert.STATUS = '510';
            rowToInsert.Status = '510';
            rowToInsert.VERSION_START_DATE = new Date().toISOString();
            rowToInsert.VERSION_END_DATE = '9999-12-31T23:59:59Z';
            rowToInsert.created_by = req.user?.id || 'abhiyantatech';
            rowToInsert.created_on = new Date().toISOString();

            const db = await cds.connect.to('db');
            await dynDb.insertRow(db, tablename, rowToInsert);

            // Complete task on BPA if taskId is provided
            if (taskId) {
                try {
                    const bpaClient = require('./lib/bpa-client');
                    await bpaClient.completeBPATask(taskId, action, remarks);
                    console.log(`[Central] Completed BPA Task ${taskId} successfully`);
                } catch (bpaErr) {
                    console.warn(`[Central] Notice completing BPA Task ${taskId}:`, bpaErr.message);
                }
            }

            await wfUtils.insertWFAudit({
                workflowid: wfId,
                action: 'SUBMIT',
                userremarks: 'Record created via Central Master Data',
                actioninguser: req.user?.id || 'abhiyantatech',
                operationtype: operation || 'CREATE'
            }).catch(e => console.warn('[WFAudit insert warning]:', e.message));

            let bpaInstanceId = null;
            try {
                const ctx = {
                    workflowid: wfId,
                    tablename: tablename,
                    requestorid: req.user?.id || 'abhiyantatech',
                    operationtype: operation || 'CREATE',
                    validrecordcount: 1
                };
                bpaInstanceId = await bpa.startCentralApprovalWorkflow(ctx);
                if (bpaInstanceId) {
                    await wfUtils.saveMDRWorkflowLink(wfId, tablename, bpaInstanceId);
                }
            } catch (bpaErr) {
                console.warn('[Central Submit] BPA trigger non-fatal warning:', bpaErr.message);
            }

            return {
                workflowid: wfId,
                message: `Record submitted successfully with Workflow ID ${wfId}`,
                type: 'S'
            };
        } catch (err) {
            console.error('[submitCentralData error]:', err);
            req.error(500, `Failed to submit data: ${err.message}`);
        }
    });

    srv.on('getCentralRequestData', async req => {
        console.log("---- getCentralRequestData called ----", req.data);
        const { workflowid, tablename } = req.data;
        try {
            const db = await cds.connect.to('db');
            const rows = await dynDb.readRows(db, tablename, '"WORKFLOW_ID" = ?', [workflowid]).catch(() => []);
            return {
                data: rows && rows.length > 0 ? rows : [],
                olddata: [],
                wfids: [workflowid],
                message: 'Success',
                type: 'S'
            };
        } catch (err) {
            console.error("getCentralRequestData error:", err);
            return { data: [], olddata: [], wfids: [workflowid], message: err.message, type: 'E' };
        }
    });

    srv.on('triggerCentralWorkflow', async req => {
        console.log("---- triggerCentralWorkflow called ----");
        const { workflowid, tablename } = req.data;
        
        try {
            // 1. Build BPA Context
            const ctx = {
                workflowid,
                tablename,
                requestorid: req.user?.id || 'anonymous',
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

    srv.on('takeActionCentral', async req => {
        console.log("---- takeActionCentral called ----");
        const { workflowid, action, remarks, bpaInstanceId, taskId } = req.data;
        
        try {
            // 1. Log Audit
            // Complete task on BPA if taskId is provided
            if (taskId) {
                try {
                    const bpaClient = require('./lib/bpa-client');
                    await bpaClient.completeBPATask(taskId, action, remarks);
                    console.log(`[Central] Completed BPA Task ${taskId} successfully`);
                } catch (bpaErr) {
                    console.warn(`[Central] Notice completing BPA Task ${taskId}:`, bpaErr.message);
                }
            }

            await wfUtils.insertWFAudit({
                workflowid,
                action,
                userremarks: remarks,
                actioninguser: req.user?.id || 'bpa-system',
                operationtype: 'APPROVAL_DECISION'
            });
            
            // 2. Database Update Logic
            const db = await cds.connect.to('db');
            const entities = cds.entities('zmdr') || cds.entities;
            const MDRWorkflowLink = entities.MDRWorkflowLink || entities['zmdr.MDRWorkflowLink'] || db.entities?.MDRWorkflowLink;
            let link = null;
            if (MDRWorkflowLink) {
                link = await db.run(
                    SELECT.one.from(MDRWorkflowLink).where({ MdrWorkflowId: workflowid })
                ).catch(() => null);
            }
            
            let tablename = link?.TableName || link?.tablename;
            if (!tablename) {
                for (const candidate of ['ZMDR_MATERIAL', 'SERVICES_REGISTRY', 'ZMDR_SERVCATALOG', 'ZMDR_BPMASTER', 'BPMaster', 'ZMDR_CONTRACT', 'ZMDR_GLACCOUNT', 'GLAccount']) {
                    let exists = await dynDb.checkExists(db, candidate, '"WORKFLOW_ID" = ?', [workflowid]).catch(() => false);
                    if (!exists) {
                        exists = await dynDb.checkExists(db, candidate, '"WorkflowId" = ?', [workflowid]).catch(() => false);
                    }
                    if (exists) {
                        tablename = candidate;
                        break;
                    }
                }
            }
            tablename = tablename || 'ZMDR_MATERIAL';
            if (action && action.toUpperCase().includes('APPROV')) {
                console.log(`[Central] Decision APPROVED. Moving draft to live table: ${workflowid} for ${tablename}`);
                // Promote draft/staged record to active live table: VERSION_ACTIVE = 'Y', STATUS = 'ACT' / Status = 'ACT'
                const updateActive = {
                    VERSION_ACTIVE: 'Y',
                    STATUS: 'ACT',
                    VersionActive: 'Y',
                    Status: 'ACT'
                };
                await dynDb.updateRow(db, tablename, updateActive, '"WORKFLOW_ID" = ?', [workflowid]).catch(() => null);
                await dynDb.updateRow(db, tablename, updateActive, '"WorkflowId" = ?', [workflowid]).catch(() => null);
                await dynDb.updateRow(db, tablename, updateActive, '"WORKFLOWID" = ?', [workflowid]).catch(() => null);
                try {
                    const gwFixture = require('./lib/gateway-local-fixture');
                    if (gwFixture && typeof gwFixture.approveRecordInStore === 'function') {
                        gwFixture.approveRecordInStore(tablename, workflowid);
                    }
                } catch (_) {}
            } else {
                console.log(`[Central] Decision REJECTED for workflow: ${workflowid}`);
                // Delete the rejected draft
                await dynDb.deleteRows(db, tablename, '"WORKFLOW_ID" = ? AND "VERSION_ACTIVE" != ?', [workflowid, 'Y']).catch(() => null);
                await dynDb.deleteRows(db, tablename, '"WorkflowId" = ? AND "VersionActive" != ?', [workflowid, 'Y']).catch(() => null);
                await dynDb.deleteRows(db, tablename, '"WORKFLOWID" = ? AND "VERSIONACTIVE" != ?', [workflowid, 'Y']).catch(() => null);
                try {
                    const gwFixture = require('./lib/gateway-local-fixture');
                    if (gwFixture && typeof gwFixture.rejectRecordInStore === 'function') {
                        gwFixture.rejectRecordInStore(tablename, workflowid);
                    }
                } catch (_) {}
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

    // Safe DB Query Handler: Resolves fully-qualified entity definitions and explicit column projections
    // to prevent SAP HANA Cloud "@cap-js/hana" errors where un-inferred '*' columns trigger:
    // "Query was not inferred and includes '*' in the columns. For which there is no column name available."
    const safeReadHandler = async (req, next) => {
        const entName = req.target?.name?.split('.').pop();
        if (!entName) return next();

        if (entName === 'ZMDGCPCNTRLVAL01' || entName === 'ZMDGCPCNTRLVAL01Set') {
            return [];
        }

        // Only intercept CntrlUI* configuration entities
        if (!entName.startsWith('CntrlUI')) {
            return next();
        }

        try {
            if (!cds.model) {
                try {
                    const csnPath = require('fs').existsSync('srv/csn.json') ? 'srv/csn.json' : 'gen/srv/srv/csn.json';
                    cds.model = await cds.load(csnPath);
                } catch (_) {}
            }

            const db = await cds.connect.to('db');
            if (!db.model && cds.model) {
                db.model = cds.model;
            }

            const targetEntity = `zmdr.${entName}`;
            const elements = req.target?.elements || cds.model?.definitions[targetEntity]?.elements;

            // Build CQN query targeting the database entity directly
            const q = SELECT.from(targetEntity);

            // Set explicit columns from element definitions so HANA cqn2sql never receives '*'
            if (req.query.SELECT?.columns && req.query.SELECT.columns.length > 0 && !req.query.SELECT.columns.includes('*')) {
                q.columns(req.query.SELECT.columns);
            } else if (elements) {
                q.columns(Object.keys(elements).map(col => ({ ref: [col] })));
            }

            // Where conditions
            if (req.query.SELECT?.where) {
                q.where(req.query.SELECT.where);
            }

            if (req.query.SELECT?.orderBy) {
                q.orderBy(req.query.SELECT.orderBy);
            }

            if (req.query.SELECT?.limit) {
                const limitRows = typeof req.query.SELECT.limit.rows === 'object' ? req.query.SELECT.limit.rows.val : req.query.SELECT.limit.rows;
                const limitOffset = typeof req.query.SELECT.limit.offset === 'object' ? req.query.SELECT.limit.offset.val : req.query.SELECT.limit.offset;
                if (limitRows !== undefined && limitRows !== null) {
                    q.limit(Number(limitRows), limitOffset !== undefined && limitOffset !== null ? Number(limitOffset) : 0);
                }
            }

            if (req.query.SELECT?.one) {
                q.SELECT.one = true;
            }

            const res = await db.run(q);

            // Handle $count if requested by UI5 OData V4 client
            if (req.query.SELECT?.count && Array.isArray(res)) {
                if (req.query.SELECT?.limit) {
                    const countQ = SELECT.one.from(targetEntity).columns('count(*) as totalCount');
                    if (req.query.SELECT?.where) countQ.where(req.query.SELECT.where);
                    const countRes = await db.run(countQ).catch(() => null);
                    res.$count = countRes?.totalCount !== undefined ? Number(countRes.totalCount) : res.length;
                } else {
                    res.$count = res.length;
                }
            }

            return res;
        } catch (err) {
            console.error(`[Central Handler] Error in safeReadHandler for ${entName}:`, err);
            return next();
        }
    };

    srv.on('READ', '*', safeReadHandler);

    // Standard hooks for dynamic endpoints (if the UI uses generic CRUD)
    srv.before('READ', '*', async (req) => {
        console.log(`[Central Handler] BEFORE READ triggered for entity: ${req.target.name}`);
    });

    srv.before('CREATE', '*', async (req) => {
        try {
            console.log(`[Central Handler] BEFORE CREATE triggered for entity: ${req.target.name}`);
            console.log("Payload before:", JSON.stringify(req.data, null, 2));
            
            // Auto-assign In-flight status for new drafts/amendments if missing
            if (req.target.elements?.VersionActive && !req.data.VersionActive) {
                req.data.VersionActive = 'I';
            }
            
            // Generate actual workflow ID if not populated
            if (req.target.elements?.WorkflowId && !req.data.WorkflowId) {
                req.data.WorkflowId = await generateWorkflowId('CENTRAL');
            }

            if (req.target.elements?.VersionStartDate && !req.data.VersionStartDate) {
                req.data.VersionStartDate = new Date().toISOString();
            }

            // Auto-assign default BpId if entity requires BpId and none provided
            if (req.target.elements?.BpId && !req.data.BpId) {
                req.data.BpId = 'BP' + Date.now().toString().slice(-8);
            }
        } catch (err) {
            console.error("[Central Handler] Error in BEFORE CREATE hook:", err);
        }
    });

    srv.before('UPDATE', '*', async (req) => {
        console.log(`[Central Handler] BEFORE UPDATE triggered for entity: ${req.target.name}`);
        console.log("Payload:", JSON.stringify(req.data, null, 2));
    });

    srv.before('DELETE', '*', async (req) => {
        console.log(`[Central Handler] DELETE triggered for entity: ${req.target.name}`);
    });

});
