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
        const hdr = await db.run(SELECT.one.from(BulkHdrConfig).where({ TableName: tablename, RequesterRole: saprole }));
        if (hdr?.ApprClass) {
            const p = hdr.ApprClass.split(',');
            [apprSystem, apprHierarchy, apprSubclass] = p.map(x => x.trim());
        }
    }
    if (appidentifier === 'CENTRAL' && processid && subclass) {
        const sr = await db.run(SELECT.one.from(CntrlUIApprStage).where({ processnumber: processid, currentstage: subclass }));
        nextstage = sr?.nextstage || '';
    }

    // Use CAP ORM to avoid hardcoded table names (works on SQLite and HANA)
    const { Approver, ApproverClass } = db.entities;
    const classes = await db.run(
        SELECT.from(ApproverClass).where({
            system: apprSystem, hierarchy: apprHierarchy,
            subclass: apprSubclass, version_active: 'Y'
        })
    );
    const classIds = classes.map(c => c.approver_class_lineid);
    let rows = [];
    if (classIds.length > 0) {
        rows = await db.run(
            SELECT.from(Approver).where({
                approver_class_lineid: { in: classIds },
                version_active: 'Y'
            })
        );
    }

    const approvers = rows
        .filter(r => (r.approver_id || r.APPROVER_ID) !== requesterid)
        .map(r => ({
            approverid: r.approver_id || r.APPROVER_ID,
            approvername: r.approver_id || r.APPROVER_ID,           // TODO: resolve via IAS SCIM API
            approveremail: `${r.approver_id || r.APPROVER_ID}@company.com`,  // TODO: resolve via IAS
        }));

    return { approvers, nextstage, agent: `US${requesterid}` };
}

module.exports = { insertWFAudit, saveMDRWorkflowLink, getApprovers };