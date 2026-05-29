// srv/lib/wf-utilities.js  — Replaces ZCL_MDR_WF_UTILITIES
'use strict';
const cds = require('@sap/cds');

async function insertWFAudit(d) {
    const db = await cds.connect.to('db');
    const { WFAudit } = db.entities;  // CAP ORM
    const count = await db.run(SELECT.from(WFAudit).where({ workflowid: d.workflowid })).then(r => r.length);
    const sequenceid = `${d.workflowid}-${count + 1}`;
    await db.run(INSERT.into(WFAudit).entries({
        sequenceid, workflowid: d.workflowid, entityid: d.entityid || '',
        actiontime: new Date().toISOString(), operationtype: d.operationtype,
        entityname: d.entityname || '', wfstage: d.wfstage || '', action: d.action,
        userremarks: d.userremarks || '', actioninguser: d.actioninguser || '',
    }));
    return { sequenceid, message: 'Audit created' };
}

async function saveMDRWorkflowLink(mdrId, tablename, bpaId) {
    const db = await cds.connect.to('db');
    const { MDRWorkflowLink } = db.entities;  // CAP ORM
    const ex = await db.run(SELECT.one.from(MDRWorkflowLink).where({ mdr_workflow_id: mdrId, tablename }));
    if (!ex)
        await db.run(INSERT.into(MDRWorkflowLink).entries({ mdr_workflow_id: mdrId, tablename, bpa_instance_id: bpaId }));
}

// Replaces ZCL_MDR_WF_UTILITIES.GET_APPROVERS
async function getApprovers(params) {
    const { appidentifier, system, subclass, hierarchy,
        requesterid, processid, tablename, saprole } = params;
    const db = await cds.connect.to('db');
    const { BulkHdrConfig, CntrlUIApprStage } = db.entities;

    let apprSystem = system, apprHierarchy = hierarchy, apprSubclass = subclass, nextstage = '';

    if (appidentifier === 'BULK') {
        const hdr = await db.run(SELECT.one.from(BulkHdrConfig).where({ tablename, requesterrole: saprole }));
        if (hdr?.apprclass) {
            const p = hdr.apprclass.split(',');
            [apprSystem, apprHierarchy, apprSubclass] = p.map(x => x.trim());
        }
    }
    if (appidentifier === 'CENTRAL' && processid && subclass) {
        const sr = await db.run(SELECT.one.from(CntrlUIApprStage).where({ processnumber: processid, currentstage: subclass }));
        nextstage = sr?.nextstage || '';
    }

    // Approver and ApproverClass are config tables — note: CAP generated table names
    // are COM_MDR_APPROVER and COM_MDR_APPROVERCLASS in HANA
    const rows = await db.run(
        'SELECT a.APPROVER_ID FROM "COM_MDR_APPROVER" a ' +
        'INNER JOIN "COM_MDR_APPROVERCLASS" ac ON a.APPROVER_CLASS_LINEID = ac.APPROVER_CLASS_LINEID ' +
        'WHERE ac.SYSTEM = ? AND ac.HIERARCHY = ? AND ac.SUBCLASS = ? AND a.VERSION_ACTIVE = ?',
        [apprSystem, apprHierarchy, apprSubclass, 'Y']
    );

    const approvers = rows
        .filter(r => r.APPROVER_ID !== requesterid)
        .map(r => ({
            approverid: r.APPROVER_ID,
            approvername: r.APPROVER_ID,           // TODO: resolve via IAS SCIM API
            approveremail: `${r.APPROVER_ID}@company.com`,  // TODO: resolve via IAS
        }));

    return { approvers, nextstage, agent: `US${requesterid}` };
}

module.exports = { insertWFAudit, saveMDRWorkflowLink, getApprovers };