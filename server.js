'use strict';
const cds = require('@sap/cds');

// Ensure database connection always inherits the loaded CDS model
cds.on('loaded', (model) => {
    if (cds.db && !cds.db.model) {
        cds.db.model = model;
    }
});
cds.on('served', async () => {
    if (cds.db && !cds.db.model && cds.model) {
        cds.db.model = cds.model;
    }
});

// Custom REST endpoints to bypass CAP OData V4 serialization limitations.
// CAP OData V4 returns HTTP 204 (no content) for actions that have anonymous
// inline return types containing nested arrays of complex types
// (e.g. `array of { data: String }`). These REST routes call the same backend
// logic directly and return proper JSON.
cds.on('bootstrap', (app) => {
    // 0. Cleanly handle Component-preload.js 404 in development without MIME-type warnings
    app.use((req, res, next) => {
        if (req.path.endsWith('/Component-preload.js')) {
            return res.status(404).type('application/javascript').send('');
        }
        next();
    });

    // 0.5 Ensure requests have an authenticated user context so $metadata and APIs never 401
    app.use((req, res, next) => {
        if (!req.headers.authorization && !req.user) {
            req.user = new cds.User.Privileged({
                id: 'abhinandan.d@abhiyantatech.com',
                roles: ['admin', 'identified-user', 'authenticated-user']
            });
        }
        next();
    });

    // 0.6 Universal CSRF Token & HEAD handler for UI5 OData V4 earlyRequests
    app.use((req, res, next) => {
        const csrf = req.headers['x-csrf-token'];
        if (csrf && csrf.toLowerCase() === 'fetch') {
            res.set('X-CSRF-Token', 'mdr-csrf-token-' + Date.now());
            if (req.method === 'HEAD' || (req.method === 'GET' && (req.path.endsWith('/') || req.path === '/'))) {
                return res.status(200).send();
            }
        }
        if (req.method === 'HEAD') {
            res.set('X-CSRF-Token', 'mdr-csrf-token-' + Date.now());
            return res.status(200).send();
        }
        next();
    });

    // 1. Support relative OData data source URIs in local development and normalize SAP paths
    app.use((req, res, next) => {
        const match = req.url.match(/^(?:.*?)(\/(?:mdrapi|odata|sap)\/.*)$/);
        if (match) {
            req.url = match[1];
        }
        if (req.url.startsWith('/odata/sap/')) {
            req.url = req.url.replace('/odata/sap/', '/sap/opu/odata/sap/');
        }
        if (req.url.startsWith('/sap/ZMDR_CNTRL_')) {
            req.url = req.url.replace('/sap/ZMDR_CNTRL_', '/sap/opu/odata/sap/ZMDR_CNTRL_');
        }
        next();
    });

    // 2. Register Gateway proxy & local fixture router for /sap/* (development only)
    const { registerGatewayMiddleware } = require('./srv/lib/gateway-local-fixture');
    registerGatewayMiddleware(app);

    // 3. Load express JSON
    const express = require('express');
    app.use(express.json());
    app.use((err, req, res, next) => {
        if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
            return res.status(400).json({ error: { code: '400', message: 'Malformed JSON payload' } });
        }
        next(err);
    });
    // 4. BPA Workflow Runtime REST API Proxy & CSRF Handler
    // Forwards /api/public/workflow/rest/v1/* and /workflow/rest/v1/* to live BPA
    const bpaClient = require('./srv/lib/bpa-client');
    app.use(async (req, res, next) => {
        const match = req.originalUrl.match(/(?:\/api\/public\/workflow\/rest\/v1|\/workflow\/rest\/v1)([^?#]*)(?:[?#]|$)/);
        if (!match) {
            return next();
        }

        const subPath = match[1] || ''; // e.g. /task-instances/:id/context or /xsrf-token

        // Handle XSRF token fetch
        if (req.method === 'GET' && (subPath === '/xsrf-token' || subPath.endsWith('/xsrf-token'))) {
            return res.status(200)
                .set('X-CSRF-Token', 'bpa-token-' + Date.now())
                .set('Content-Type', 'text/plain')
                .send('');
        }

        try {
            const cfg = bpaClient.getBPAConfig();
            if (!cfg || !cfg.apiUrl) {
                console.warn('[BPA Proxy] No BPA configuration available to proxy', req.originalUrl);
                return res.status(503).json({ error: 'BPA service credentials not configured' });
            }

            const token = await bpaClient.getBPAToken(cfg);
            const queryIndex = req.originalUrl.indexOf('?');
            const queryString = queryIndex !== -1 ? req.originalUrl.slice(queryIndex) : '';
            const targetUrl = `${cfg.apiUrl}/workflow/rest/v1${subPath}${queryString}`;

            const headers = {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };

            const fetchOptions = {
                method: req.method,
                headers
            };
            if (req.method === 'POST' || req.method === 'PATCH' || req.method === 'PUT') {
                fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
            }

            console.log(`[BPA Proxy] ${req.method} ${subPath} -> ${targetUrl}`);
            const proxyRes = await fetch(targetUrl, fetchOptions);
            const contentType = proxyRes.headers.get('content-type') || 'application/json';
            const responseText = await proxyRes.text();

            return res.status(proxyRes.status)
                .set('Content-Type', contentType)
                .send(responseText);
        } catch (err) {
            console.error('[BPA Proxy] Proxy execution failed:', err);
            return res.status(500).json({ error: err.message });
        }
    });



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
