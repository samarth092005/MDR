'use strict';
const cds = require('@sap/cds');

// Custom REST endpoint for validateBulkData.
// WHY: CAP OData V4 returns HTTP 204 (no content) for actions that have
//      anonymous inline return types containing nested arrays of complex types
//      (e.g. `array of { data: String }`). This is a known CAP serialization
cds.on('bootstrap', (app) => {
    // 2. Load express JSON
    const express = require('express');
    app.use(express.json());



    app.post('/api/bulk/rest/validateBulkData', async (req, res) => {
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
            console.error('[REST /api/bulk/rest/validateBulkData] Error:', err);
            res.status(500).json({ error: err.message });
        }
    });
});

module.exports = cds.server;
