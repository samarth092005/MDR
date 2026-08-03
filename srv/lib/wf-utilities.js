// srv/lib/wf-utilities.js  — Replaces ZCL_MDR_WF_UTILITIES
'use strict';
const cds = require('@sap/cds');

function getEntity(name) {
    const zEntities = cds.entities ? cds.entities('zmdr') : null;
    return (zEntities && zEntities[name]) || (cds.entities && cds.entities[name]) || (cds.entities && cds.entities[`zmdr.${name}`]);
}

async function insertWFAudit(d) {
    const db = await cds.connect.to('db');
    const WFAudit = getEntity('WFAudit') || db.entities?.WFAudit;
    const count = await db.run(
        SELECT.from(WFAudit).where(`WorkflowId = '${d.workflowid}' or workflowid = '${d.workflowid}'`)
    ).then(r => r.length).catch(() => 0);
    const sequenceid = `${d.workflowid}-${count + 1}`;
    await db.run(INSERT.into(WFAudit).entries({
        SequenceId: sequenceid,
        sequenceid,
        WorkflowId: d.workflowid,
        workflowid: d.workflowid,
        EntityId: d.entityid || '',
        entityid: d.entityid || '',
        ActionTime: new Date().toISOString(),
        actiontime: new Date().toISOString(),
        OperationType: d.operationtype,
        operationtype: d.operationtype,
        EntityName: d.entityname || '',
        entityname: d.entityname || '',
        WfStage: d.wfstage || '',
        wfstage: d.wfstage || '',
        Action: d.action,
        action: d.action,
        UserRemarks: d.userremarks || '',
        userremarks: d.userremarks || '',
        ActioningUser: d.actioninguser || '',
        actioninguser: d.actioninguser || '',
    }));
    return { sequenceid, message: 'Audit created' };
}

async function saveMDRWorkflowLink(mdrId, tablename, bpaId) {
    const db = await cds.connect.to('db');
    const MDRWorkflowLink = getEntity('MDRWorkflowLink') || db.entities?.MDRWorkflowLink;
    const ex = await db.run(
        SELECT.one.from(MDRWorkflowLink).where(`(MdrWorkflowId = '${mdrId}' or mdr_workflow_id = '${mdrId}') and (TableName = '${tablename}' or tablename = '${tablename}')`)
    ).catch(() => null);
    if (!ex) {
        await db.run(INSERT.into(MDRWorkflowLink).entries({
            MdrWorkflowId: mdrId,
            mdr_workflow_id: mdrId,
            TableName: tablename,
            tablename: tablename,
            BpaInstanceId: bpaId,
            bpa_instance_id: bpaId
        }));
    }
}

// Replaces ZCL_MDR_WF_UTILITIES.GET_APPROVERS
async function getApprovers(params) {
    const { appidentifier, system, subclass, hierarchy,
        requesterid, processid, tablename, saprole } = params;
    const db = await cds.connect.to('db');
    const BulkHdrConfig = getEntity('BulkHdrConfig') || db.entities?.BulkHdrConfig;
    const CntrlUIApprStage = getEntity('CntrlUIApprStage') || db.entities?.CntrlUIApprStage;

    let apprSystem = system, apprHierarchy = hierarchy, apprSubclass = subclass, nextstage = '';

    if (appidentifier === 'BULK' && BulkHdrConfig) {
        const hdr = await db.run(SELECT.one.from(BulkHdrConfig).where({ TableName: tablename, RequesterRole: saprole }));
        if (hdr?.ApprClass) {
            const p = hdr.ApprClass.split(',');
            [apprSystem, apprHierarchy, apprSubclass] = p.map(x => x.trim());
        }
    }
    if (appidentifier === 'CENTRAL' && processid && subclass && CntrlUIApprStage) {
        const sr = await db.run(SELECT.one.from(CntrlUIApprStage).where({ processnumber: processid, currentstage: subclass }));
        nextstage = sr?.nextstage || '';
    }

    // Use CAP ORM to avoid hardcoded table names (works on SQLite and HANA)
    const Approver = getEntity('Approver') || db.entities?.Approver;
    const ApproverClass = getEntity('ApproverClass') || db.entities?.ApproverClass;
    
    let rows = [];
    if (ApproverClass && Approver) {
        const classes = await db.run(
            SELECT.from(ApproverClass).where({
                system: apprSystem, hierarchy: apprHierarchy,
                subclass: apprSubclass, version_active: 'Y'
            })
        ).catch(() => []);
        const classIds = classes.map(c => c.approver_class_lineid || c.ApproverClassLineId);
        if (classIds.length > 0) {
            rows = await db.run(
                SELECT.from(Approver).where({
                    approver_class_lineid: { in: classIds },
                    version_active: 'Y'
                })
            ).catch(() => []);
        }
    }

    const approvers = rows
        .filter(r => (r.approver_id || r.APPROVER_ID || r.ApproverId) !== requesterid)
        .map(r => {
            const id = r.approver_id || r.APPROVER_ID || r.ApproverId;
            return {
                approverid: id,
                approvername: id,           // TODO: resolve via IAS SCIM API
                approveremail: `${id}@company.com`,  // TODO: resolve via IAS
            };
        });

    return { approvers, nextstage, agent: `US${requesterid}` };
}

module.exports = { insertWFAudit, saveMDRWorkflowLink, getApprovers };
