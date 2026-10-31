// srv/lib/wf-utilities.js  — Replaces ZCL_MDR_WF_UTILITIES
'use strict';
const cds = require('@sap/cds');

function getEntity(name) {
    if (typeof cds.entities === 'function') {
        const zEntities = cds.entities('zmdr');
        if (zEntities && zEntities[name]) return zEntities[name];
    }
    const model = cds.model || cds.db?.model;
    if (model && model.entities) {
        if (model.entities[`zmdr.${name}`]) return model.entities[`zmdr.${name}`];
        if (model.entities[name]) return model.entities[name];
    }
    if (cds.entities && typeof cds.entities === 'object') {
        return cds.entities[name] || cds.entities[`zmdr.${name}`];
    }
    return null;
}

async function insertWFAudit(d) {
    const db = await cds.connect.to('db');
    const WFAudit = getEntity('WFAudit') || db.entities?.WFAudit;
    
    // Safely calculate the next sequence number by checking existing entries
    let sequenceid = d.workflowid + '-1';
    try {
        const existing = await db.run(
            SELECT.from(WFAudit).where({ WorkflowId: d.workflowid })
        );
        let maxNum = 0;
        if (Array.isArray(existing) && existing.length > 0) {
            for (const row of existing) {
                const sId = row.SequenceId || row.sequenceid || row.SEQUENCEID || row['SEQUENCEID'] || '';
                const m = sId.match(/-(\d+)(?:-\d+)?$/);
                if (m) {
                    const n = parseInt(m[1], 10);
                    if (n > maxNum) maxNum = n;
                }
            }
            if (maxNum === 0) maxNum = existing.length;
            sequenceid = d.workflowid + '-' + (maxNum + 1);
            if (existing.some(r => (r.SequenceId || r.sequenceid || r.SEQUENCEID) === sequenceid)) {
                sequenceid = d.workflowid + '-' + (maxNum + 1) + '-' + Date.now();
            }
        } else {
            sequenceid = d.workflowid + '-1';
        }
    } catch (e) {
        sequenceid = d.workflowid + '-' + Date.now();
    }

    await db.run(INSERT.into(WFAudit).entries({
        SequenceId: sequenceid,
        WorkflowId: d.workflowid,
        EntityId: d.entityid || '',
        ActionTime: new Date().toISOString(),
        OperationType: d.operationtype || 'APPROVAL_DECISION',
        EntityName: d.entityname || '',
        WfStage: d.wfstage || '',
        Action: d.action,
        UserRemarks: d.userremarks || '',
        ActioningUser: d.actioninguser || '',
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
