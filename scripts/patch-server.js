const fs = require('fs');

let s = fs.readFileSync('server.js', 'utf8');

if (!s.includes('// --- GET BULK REQUEST DATA ---')) {
    const newRoutes = `
    // --- GET BULK REQUEST DATA ---
    app.post(['/mdrapi/bulk/rest/getBulkRequestData', '/mdrapi/bulk/getBulkRequestData'], async (req, res, next) => {
        if (!req.is('application/json')) return next();
        try {
            const { tablename, workflowid, versionactive, uniquewf, requesterrole } = req.body;
            const db = await cds.connect.to('db');
            const { readRows } = require('./srv/lib/db-dynamic');
            const getEntity = (n) => (cds.entities && cds.entities('zmdr') && cds.entities('zmdr')[n]) || (cds.entities && cds.entities[n]) || (cds.entities && cds.entities['zmdr.' + n]) || (db.entities && db.entities[n]);
            const BulkHdrConfig = getEntity('BulkHdrConfig');
            const BulkTemp = getEntity('BulkTemp');

            if (uniquewf === 'Y' && BulkTemp) {
                const rows = await db.run(SELECT.from(BulkTemp).where({ tablename, requeststatus: 'INPROGRESS' }));
                const wfids = [...new Set(rows.map(r => r.workflowid || r.WorkflowId))].map(wf => ({ workflowid: wf, remarks: '' }));
                return res.status(200).json({ data: [], olddata: [], wfids, message: '', type: 'S' });
            }

            const hdr = BulkHdrConfig ? await db.run(SELECT.one.from(BulkHdrConfig).where({ TableName: tablename, RequesterRole: requesterrole })) : null;
            if (hdr?.isversioned === 'Y' || hdr?.Versioned === 'Y') {
                const va = versionactive || 'G';
                const rows = await readRows(db, tablename, '"WORKFLOW_ID" = ? AND "VERSION_ACTIVE" = ?', [workflowid, va]);
                return res.status(200).json({ data: rows.map(r => ({ data: Object.values(r).join('«') })), olddata: [], wfids: [], message: '', type: 'S' });
            } else if (BulkTemp) {
                const rows = await db.run(SELECT.from(BulkTemp).where({ workflowid, tablename, requeststatus: 'INPROGRESS' }));
                return res.status(200).json({ data: rows.map(r => ({ data: r.bulkdata || r.BulkData })), olddata: [], wfids: [], message: '', type: 'S' });
            } else {
                return res.status(200).json({ data: [], olddata: [], wfids: [], message: '', type: 'S' });
            }
        } catch (err) {
            console.error('[REST getBulkRequestData] Error:', err);
            return res.status(500).json({ error: err.message });
        }
    });

    // --- TAKE ACTION BULK (Approve / Reject) ---
    app.post(['/mdrapi/bulk/rest/takeActionBulk', '/mdrapi/bulk/takeActionBulk'], async (req, res, next) => {
        if (!req.is('application/json')) return next();
        try {
            const { tablename, workflowid, wfstage, action, requesterrole, bpaInstanceId, approverremarks, isOverwriteNull } = req.body;
            const db = await cds.connect.to('db');
            const { insertWFAudit } = require('./srv/lib/wf-utilities');
            const { approveVersionedTable, applyBulkTempApproved, rejectVersionedTable } = require('./srv/lib/insert');
            const { completeBPATask } = require('./srv/lib/bpa-client');
            const getEntity = (n) => (cds.entities && cds.entities('zmdr') && cds.entities('zmdr')[n]) || (cds.entities && cds.entities[n]) || (cds.entities && cds.entities['zmdr.' + n]) || (db.entities && db.entities[n]);
            const BulkHdrConfig = getEntity('BulkHdrConfig');
            const BulkItmConfig = getEntity('BulkItmConfig');
            const BulkTemp = getEntity('BulkTemp');
            const userId = req.user?.id || 'anonymous';

            const hdr = BulkHdrConfig ? await db.run(SELECT.one.from(BulkHdrConfig).where({ TableName: tablename, RequesterRole: requesterrole })) : null;
            let lineitemConfig = [];
            if (BulkItmConfig) {
                try {
                    lineitemConfig = await db.run(SELECT.from(BulkItmConfig).where({ TableName: tablename, RequesterRole: requesterrole }).orderBy('ColumnSeqNo'));
                } catch (e) {
                    lineitemConfig = await db.run(SELECT.from(BulkItmConfig).where({ Tablename: tablename, RequesterRole: requesterrole }).orderBy('Colseqno'));
                }
            }
            let keyFields = lineitemConfig.filter(c => c.IsMatching === 'Y').map(c => c.ColumnName || c.Columnname);
            if (!keyFields.length && lineitemConfig.length) keyFields = [lineitemConfig[0].ColumnName || lineitemConfig[0].Columnname];

            if (action === 'APPROVED') {
                if (hdr?.Versioned === 'Y')
                    await approveVersionedTable({ tablename, workflowid, keyFields, lineitemConfig, userId });
                else
                    await applyBulkTempApproved({
                        tablename, workflowid, lineitemConfig, keyFields,
                        isOverwriteNull: hdr?.IsOverwrireWithNull || isOverwriteNull, userId
                    });
            } else if (action === 'REJECTED') {
                if (hdr?.Versioned === 'Y')
                    await rejectVersionedTable({ tablename, workflowid });
                else
                    await db.run(UPDATE(BulkTemp).set({ RequestStatus: 'REJECTED' }).where({ WorkflowId: workflowid, TableName: tablename }));
            }

            await insertWFAudit({
                workflowid, entityname: tablename, entityid: '',
                operationtype: 'BULK UPDATE', wfstage: wfstage || 'LEVEL_1', action,
                userremarks: approverremarks || '', actioninguser: userId
            });

            if (bpaInstanceId) await completeBPATask(bpaInstanceId, action, approverremarks);

            return res.status(200).json({
                message: action === 'APPROVED' ? 'Approved Successfully' : 'Rejected Successfully',
                type: 'S'
            });
        } catch (err) {
            console.error('[REST takeActionBulk] Error:', err);
            return res.status(500).json({ error: err.message });
        }
    });
});

module.exports = cds.server;
`;
    s = s.replace(/}\);\s*module\.exports = cds\.server;[\r\n]*/, newRoutes);
    fs.writeFileSync('server.js', s, 'utf8');
    console.log('Routes injected successfully!');
} else {
    console.log('Routes already present');
}
