// srv/bulk-handler.js
'use strict';
const cds = require('@sap/cds');
const { processBulkData } = require('./lib/process-bulk');
const { insertWFAudit, saveMDRWorkflowLink, getApprovers } = require('./lib/wf-utilities');
const { applyBulkTempApproved, approveVersionedTable, rejectVersionedTable } = require('./lib/insert');
const { generateWorkflowId } = require('./lib/wf-id');
const { startBulkApprovalWorkflow, completeBPATask } = require('./lib/bpa-client');
const { readRows } = require('./lib/db-dynamic');

module.exports = cds.service.impl(async function (srv) {

    srv.on('validateBulkData', async req => {
        console.log("---- validateBulkData called ----");
        console.log("Payload:", JSON.stringify(req.data, null, 2));
        const { tablename, requesterrole, rowData, overwriteWithNull, futureVersion, workflowid } = req.data;
        return processBulkData({
            tablename, requesterrole, dataload: 'N',
            overwriteWithNull, futureVersion, workflowid, rowData: rowData || [], userId: req.user.id
        });
    });

    srv.on('submitBulkData', async req => {
        const { tablename, requesterrole, validData,
            overwriteWithNull, futureVersion, workflowid, remarks } = req.data;
        const result = await processBulkData({
            tablename, requesterrole, dataload: 'Y',
            overwriteWithNull, futureVersion, workflowid,
            rowData: validData.map(r => r.data), userId: req.user.id,
        });
        await insertWFAudit({  // CAP ORM — WFAudit is config
            workflowid: result.workflowid, entityname: tablename, entityid: '',
            operationtype: 'BULK UPDATE', wfstage: 'INITIATOR',
            action: 'INITIATED', userremarks: remarks, actioninguser: req.user.id,
        });
        return { workflowid: result.workflowid, message: 'Submitted successfully', type: 'S' };
    });

    srv.on('triggerBulkWorkflow', async req => {
        const { workflowid, tablename, entityname, requestorid, requestoremail,
            operationtype, approverstage, apprclass, validrecordcount, requesterrole } = req.data;
        const bpaInstanceId = await startBulkApprovalWorkflow({
            workflowid, tablename, entityname, requestorid, requestoremail,
            operationtype, approverstage, apprclass, validrecordcount, requesterrole,
        });
        await saveMDRWorkflowLink(workflowid, tablename, bpaInstanceId);  // CAP ORM
        return { bpaInstanceId, message: 'Workflow triggered' };
    });

function getEntity(name) {
    const zEntities = cds.entities ? cds.entities('zmdr') : null;
    return (zEntities && zEntities[name]) || (cds.entities && cds.entities[name]) || (cds.entities && cds.entities[`zmdr.${name}`]);
}

    srv.on('getBulkRequestData', async req => {
        const { tablename, workflowid, versionactive, uniquewf, requesterrole } = req.data;
        const db = await cds.connect.to('db');
        const BulkHdrConfig = getEntity('BulkHdrConfig') || db.entities?.BulkHdrConfig;
        const BulkTemp = getEntity('BulkTemp') || db.entities?.BulkTemp;

        if (uniquewf === 'Y' && BulkTemp) {
            // BulkTemp = config table — CAP ORM
            const rows = await db.run(SELECT.from(BulkTemp).where({ tablename, requeststatus: 'INPROGRESS' }));
            const wfids = [...new Set(rows.map(r => r.workflowid || r.WorkflowId))].map(wf => ({ workflowid: wf, remarks: '' }));
            return { data: [], olddata: [], wfids, message: '', type: 'S' };
        }

        const hdr = BulkHdrConfig ? await db.run(SELECT.one.from(BulkHdrConfig).where({ TableName: tablename, RequesterRole: requesterrole })) : null;
        if (hdr?.isversioned === 'Y' || hdr?.Versioned === 'Y') {
            // Versioned: dynamic table — raw SQL
            const va = versionactive || 'G';
            const rows = await readRows(db, tablename, '"WORKFLOW_ID" = ? AND "VERSION_ACTIVE" = ?', [workflowid, va]);
            return { data: rows.map(r => ({ data: Object.values(r).join('«') })), olddata: [], wfids: [], message: '', type: 'S' };
        } else if (BulkTemp) {
            // Non-versioned: BulkTemp = config table — CAP ORM
            const rows = await db.run(SELECT.from(BulkTemp).where({ workflowid, tablename, requeststatus: 'INPROGRESS' }));
            return { data: rows.map(r => ({ data: r.bulkdata || r.BulkData })), olddata: [], wfids: [], message: '', type: 'S' };
        } else {
            return { data: [], olddata: [], wfids: [], message: '', type: 'S' };
        }
    });

    srv.on('takeActionBulk', async req => {
        const { tablename, workflowid, wfstage, action,
            requesterrole, bpaInstanceId, approverremarks, isOverwriteNull } = req.data;
        const db = await cds.connect.to('db');
        const BulkHdrConfig = getEntity('BulkHdrConfig') || db.entities?.BulkHdrConfig;
        const BulkItmConfig = getEntity('BulkItmConfig') || db.entities?.BulkItmConfig;
        const BulkTemp = getEntity('BulkTemp') || db.entities?.BulkTemp;
        const userId = req.user.id;

        // Config reads — CAP ORM
        const hdr = BulkHdrConfig ? await db.run(SELECT.one.from(BulkHdrConfig).where({ TableName: tablename, RequesterRole: requesterrole })) : null;
        const lineitemConfig = BulkItmConfig ? await db.run(SELECT.from(BulkItmConfig).where({ Tablename: tablename, RequesterRole: requesterrole }).orderBy('Colseqno')) : [];
        const keyFields = lineitemConfig.filter(c => c.IsMatching === 'Y').map(c => c.Columnname);

        if (action === 'APPROVED') {
            if (hdr?.Versioned === 'Y')
                await approveVersionedTable({ tablename, workflowid, keyFields, lineitemConfig, userId });  // raw SQL
            else
                await applyBulkTempApproved({
                    tablename, workflowid, lineitemConfig, keyFields,
                    isOverwriteNull: hdr?.IsOverwrireWithNull || isOverwriteNull, userId
                });  // mixed
        } else if (action === 'REJECTED') {
            if (hdr?.Versioned === 'Y')
                await rejectVersionedTable({ tablename, workflowid });  // raw SQL
            else
                await db.run(UPDATE(BulkTemp).set({ RequestStatus: 'REJECTED' }).where({ WorkflowId: workflowid, Tablename: tablename }));  // CAP ORM
        }

        await insertWFAudit({
            workflowid, entityname: tablename, entityid: '',
            operationtype: 'BULK UPDATE', wfstage, action,
            userremarks: approverremarks, actioninguser: userId
        });  // CAP ORM

        if (bpaInstanceId) await completeBPATask(bpaInstanceId, action, approverremarks);

        return { message: action === 'APPROVED' ? 'Approved Successfully' : 'Rejected Successfully', type: 'S' };
    });

    srv.on('insertWFAudit', async req => insertWFAudit(req.data.audit));
    srv.on('generateWorkflowId', async req => ({ workflowid: await generateWorkflowId(req.data.appname) }));
    srv.on('getApprovers', async req => getApprovers(req.data));
});