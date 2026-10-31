'use strict';

/**
 * materials-workflow-verification.test.js
 *
 * Automated Test Suite for MDR Central Master Data Materials Section:
 * 1. Static checks: View bindings, Controller handlers, i18n properties, CSV configurations.
 * 2. Service & Gateway Fixture checks: $metadata, CSRF, collection queries, filter, single entity,
 *    create POST with workflow ID generation, read-back, multipart $batch, and app-scoped URL rewrite.
 *
 * Run via: node test/materials-workflow-verification.test.js
 */

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cds = require('@sap/cds');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEST_PORT = 4029;
const BASE_URL = `http://localhost:${TEST_PORT}`;

function httpRequest(method, urlPath, payload = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const parsedUrl = new URL(urlPath, BASE_URL);
        const reqHeaders = { ...headers };
        let bodyData = null;

        if (payload) {
            if (typeof payload === 'string') {
                bodyData = payload;
            } else {
                bodyData = JSON.stringify(payload);
                if (!reqHeaders['Content-Type']) {
                    reqHeaders['Content-Type'] = 'application/json';
                }
            }
            reqHeaders['Content-Length'] = Buffer.byteLength(bodyData);
        }

        const req = http.request({
            hostname: parsedUrl.hostname,
            port: parsedUrl.port,
            path: parsedUrl.pathname + parsedUrl.search,
            method: method,
            headers: reqHeaders
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({
                status: res.statusCode,
                headers: res.headers,
                body: data
            }));
        });

        req.on('error', reject);
        if (bodyData) {
            req.write(bodyData);
        }
        req.end();
    });
}

const httpGet = (urlPath, headers = {}) => httpRequest('GET', urlPath, null, headers);
const httpPost = (urlPath, payload, headers = {}) => httpRequest('POST', urlPath, payload, headers);

async function runTests() {
    console.log('================================================================');
    console.log(' MDR MATERIALS SECTION & GATEWAY FIXTURE VERIFICATION SUITE');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    async function test(name, fn) {
        try {
            await fn();
            console.log(`  ✅ PASS: ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ❌ FAIL: ${name}`);
            console.error(`     Error: ${err.message}`);
            failed++;
        }
    }

    // --- TEST 1: View Event Bindings and i18n Declarations ---
    await test('TableResult.view.xml declares hierarchy controls and event handlers', () => {
        const viewPath = path.join(ROOT_DIR, 'app/zmdr_cntrl_main/webapp/view/TableResult.view.xml');
        const viewContent = fs.readFileSync(viewPath, 'utf8');

        assert(viewContent.includes('id="lblHierarchyView"'), 'Must define lblHierarchyView Label');
        assert(viewContent.includes('text="{i18n>lblHierarchyView}"'), 'lblHierarchyView must bind to i18n');
        assert(viewContent.includes('id="swtHierarchyView"'), 'Must define swtHierarchyView Switch');
        assert(viewContent.includes('change="onChange_swtHierarchyView"'), 'Switch must bind to onChange_swtHierarchyView');
        assert(viewContent.includes('id="tblTreeResultSet"'), 'Must define tblTreeResultSet TreeTable');
        assert(viewContent.includes('rowSelectionChange="onRowSelectionChange_tblTreeResultSet"'), 'TreeTable must bind to onRowSelectionChange_tblTreeResultSet');
    });

    // --- TEST 2: Controller Event Handler Methods ---
    await test('TableResult.controller.js implements missing event handlers and clean resolveUri', () => {
        const ctrlPath = path.join(ROOT_DIR, 'app/zmdr_cntrl_main/webapp/controller/TableResult.controller.js');
        const ctrlContent = fs.readFileSync(ctrlPath, 'utf8');

        assert(ctrlContent.includes('onChange_swtHierarchyView: function'), 'Must implement onChange_swtHierarchyView');
        assert(ctrlContent.includes('onRowSelectionChange_tblTreeResultSet: function'), 'Must implement onRowSelectionChange_tblTreeResultSet');
        assert(ctrlContent.includes('(this.sServiceUrl || "").replace(/^\\/+/'), 'Must strip leading slash when resolving URI for Launchpad compatibility');
    });

    // --- TEST 3: Resource Bundle Verification ---
    await test('i18n.properties contains lblHierarchyView and switch custom text keys', () => {
        const i18nPath = path.join(ROOT_DIR, 'app/zmdr_cntrl_main/webapp/i18n/i18n.properties');
        const i18nContent = fs.readFileSync(i18nPath, 'utf8');

        assert(i18nContent.includes('lblHierarchyView='), 'Must define lblHierarchyView');
        assert(i18nContent.includes('swtCustomTextOn='), 'Must define swtCustomTextOn');
        assert(i18nContent.includes('swtCustomTextOff='), 'Must define swtCustomTextOff');
    });

    // --- TEST 4: CSV Configuration Alignment ---
    await test('CntrlUIConfig, CntrlUIUrl, and ZMDR_MATERIAL seed data are fully populated', () => {
        const configCsvPath = path.join(ROOT_DIR, 'db/data/zmdr.CntrlUIConfig.csv');
        const urlCsvPath = path.join(ROOT_DIR, 'db/data/zmdr.CntrlUIUrl.csv');
        const matCsvPath = path.join(ROOT_DIR, 'db/data/zmdr.ZMDR_MATERIAL.csv');

        const configContent = fs.readFileSync(configCsvPath, 'utf8');
        const urlContent = fs.readFileSync(urlCsvPath, 'utf8');
        const matContent = fs.readFileSync(matCsvPath, 'utf8');

        const matConfigRows = configContent.split(/\r?\n/).filter(r => r.startsWith('ZMDR_MATERIAL,'));
        assert.strictEqual(matConfigRows.length, 14, 'ZMDR_MATERIAL must have 14 configured fields in CntrlUIConfig');

        assert(urlContent.includes('ZMDR_MATERIAL,/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV/MaterialSet,12'),
            'CntrlUIUrl must configure ZMDR_MATERIAL pointing to ZMDR_CNTRL_MATERIAL_SRV/MaterialSet');

        const matSeedRows = matContent.split(/\r?\n/).filter(r => r.trim().length > 0);
        assert.strictEqual(matSeedRows.length - 1, 19, 'zmdr.ZMDR_MATERIAL.csv must contain exactly 19 seed records');
    });

    // --- BOOTSTRAP IN-PROCESS SERVER ---
    const app = express();
    require('../server.js');
    cds.emit('bootstrap', app);
    await cds.serve('all').in(app);

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(TEST_PORT, resolve));

    try {
        // --- TEST 5: Direct Material Service $metadata ---
        await test('Material Service $metadata returns valid OData V4 EDMX XML', async () => {
            const res = await httpGet('/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV/$metadata');
            assert.strictEqual(res.status, 200, 'Metadata status must be 200');
            assert(res.body.includes('<EntityType Name="Material"'), 'Must define Material EntityType');
            assert(res.body.includes('<EntitySet Name="MaterialSet"'), 'Must define MaterialSet EntitySet');
            assert(res.body.includes('PropertyRef Name="MATERIALNUM"'), 'Must define MATERIALNUM as Key');
            assert(res.body.includes('Property Name="MATERIALDESC"'), 'Must include MATERIALDESC property');
            assert(res.body.includes('Property Name="MATERIALGROUP"'), 'Must include MATERIALGROUP property');
            assert(res.body.includes('Property Name="MATERIALTYPE"'), 'Must include MATERIALTYPE property');
        });

        // --- TEST 6: App-Scoped Rewrite for $metadata ---
        await test('server.js rewrites app-scoped /com.intapptics.*/sap/* requests', async () => {
            const res = await httpGet('/com.intapptics.zmdrcntrlmain/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV/$metadata');
            assert.strictEqual(res.status, 200, 'App-scoped metadata status must be 200');
            assert(res.body.includes('<EntityType Name="Material"'), 'Must return Material metadata via rewrite');
        });

        // --- TEST 7: CSRF Token Fetch ---
        await test('CSRF token fetch responds with valid token header', async () => {
            const res = await httpGet('/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV', {
                'X-CSRF-Token': 'Fetch'
            });
            assert.strictEqual(res.status, 200, 'CSRF fetch status must be 200');
            assert(res.headers['x-csrf-token'], 'Must include x-csrf-token response header');
        });

        // --- TEST 8: Material Collection Read ---
        await test('Material collection read returns 19 seed records', async () => {
            const res = await httpGet('/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV/MaterialSet');
            assert.strictEqual(res.status, 200, 'Collection read status must be 200');
            const json = JSON.parse(res.body);
            assert.strictEqual(json['@odata.context'], '$metadata#MaterialSet');
            assert(json['@odata.count'] >= 19, 'Must report count >= 19');
            assert(json.value.length >= 19, 'Value array length must be >= 19');
            assert.strictEqual(json.value[0].MATERIALNUM, '3', 'First material must have MATERIALNUM 3');
        });

        // --- TEST 9: Material Collection Paging ($skip, $top) ---
        await test('Material collection supports $skip and $top pagination', async () => {
            const res = await httpGet('/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV/MaterialSet?$skip=2&$top=3');
            assert.strictEqual(res.status, 200, 'Paging status must be 200');
            const json = JSON.parse(res.body);
            assert.strictEqual(json.value.length, 3, 'Must return exactly 3 records');
            assert.strictEqual(json.value[0].MATERIALNUM, '7', 'Record at index 2 must be MATERIALNUM 7');
        });

        // --- TEST 10: Material Collection Filtering ($filter) ---
        await test('Material collection supports $filter on MATERIALNUM', async () => {
            const res = await httpGet("/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV/MaterialSet?$filter=MATERIALNUM eq '11'");
            assert.strictEqual(res.status, 200, 'Filter status must be 200');
            const json = JSON.parse(res.body);
            assert.strictEqual(json.value.length, 1, 'Filter must match exactly 1 record');
            assert.strictEqual(json.value[0].MATERIALNUM, '11');
            assert.strictEqual(json.value[0].MATERIALDESC, 'RAW MATERIAL FOR PLANT MBI1');
            assert.strictEqual(json.value[0].MATERIALTYPE, 'ROH');
        });

        // --- TEST 11: Single Entity Read by Key ---
        await test('Single Material read by key returns persisted record', async () => {
            const res = await httpGet("/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV/MaterialSet('13')");
            assert.strictEqual(res.status, 200, 'Single read status must be 200');
            const json = JSON.parse(res.body);
            assert.strictEqual(json['@odata.context'], '$metadata#MaterialSet/$entity');
            assert.strictEqual(json.MATERIALNUM, '13');
            assert.strictEqual(json.MATERIALDESC, 'TEST MATERIAL FOR OP02');
            assert.strictEqual(json.MATERIALGROUP, 'SM02');
        });

        // --- TEST 12: Single Entity Read 404 for Non-Existent Key ---
        await test('Single Material read returns 404 for non-existent key', async () => {
            const res = await httpGet("/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV/MaterialSet('NON_EXISTENT_999')");
            assert.strictEqual(res.status, 404, 'Must return 404 Not Found');
        });

        // --- TEST 13: Create Material (POST) with Validation & Workflow ID Generation ---
        const testMatNum = 'MAT_VERIF_' + Math.floor(1000 + Math.random() * 9000);
        await test('Material Create persists record, sets status 510, generates WORKFLOW_ID, and returns 201', async () => {
            const payload = {
                MATERIALNUM: testMatNum,
                MATERIALDESC: 'Automated Verification Material',
                MATERIALGROUP: '01',
                MATERIALTYPE: 'FERT',
                MEASUREBASEUNIT: 'EA',
                STATUS: '510'
            };

            const res = await httpPost('/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV/MaterialSet', payload);
            assert.strictEqual(res.status, 201, 'POST status must be 201 Created');
            assert(res.headers['location'].includes(testMatNum), 'Location header must reference created MATERIALNUM');

            const json = JSON.parse(res.body);
            assert.strictEqual(json.MATERIALNUM, testMatNum, 'MATERIALNUM must match created key');
            assert.strictEqual(json.MATERIALDESC, 'Automated Verification Material');
            assert.strictEqual(json.MATERIALTYPE, 'FERT');
            assert.strictEqual(json.STATUS, '510', 'Default status must be 510');
            assert.strictEqual(json.VERSION_ACTIVE, 'Y', 'Active flag must be Y');
            assert(json.WORKFLOW_ID && json.WORKFLOW_ID.startsWith('WF'), 'Must generate a valid WORKFLOW_ID');
        });

        // --- TEST 14: Read Back Created Material ---
        await test('Read back created Material entity returns persisted data', async () => {
            const res = await httpGet(`/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV/MaterialSet('${testMatNum}')`);
            assert.strictEqual(res.status, 200, 'Read-back status must be 200');
            const json = JSON.parse(res.body);
            assert.strictEqual(json.MATERIALNUM, testMatNum);
            assert.strictEqual(json.MATERIALDESC, 'Automated Verification Material');
            assert(json.WORKFLOW_ID, 'Workflow ID must be present in read-back');
        });

        // --- TEST 15: Create Material Validation (Missing MATERIALNUM) ---
        await test('Material Create returns 400 when MATERIALNUM is missing', async () => {
            const res = await httpPost('/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV/MaterialSet', {
                MATERIALDESC: 'No Number'
            });
            assert.strictEqual(res.status, 400, 'Must reject missing key with 400');
        });

        // --- TEST 16: Multipart $batch Handling for Materials ---
        await test('Multipart $batch handles Material query and changeset creation', async () => {
            const batchMatNum = 'MAT_BATCH_' + Math.floor(1000 + Math.random() * 9000);
            const batchBoundary = 'batch_material_test_' + Date.now();
            const changeBoundary = 'changeset_material_test_' + Date.now();

            const batchBody = [
                `--${batchBoundary}`,
                'Content-Type: application/http',
                'Content-Transfer-Encoding: binary',
                '',
                'GET MaterialSet?$top=2 HTTP/1.1',
                '',
                '',
                `--${batchBoundary}`,
                `Content-Type: multipart/mixed; boundary=${changeBoundary}`,
                '',
                `--${changeBoundary}`,
                'Content-Type: application/http',
                'Content-Transfer-Encoding: binary',
                '',
                'POST MaterialSet HTTP/1.1',
                'Content-Type: application/json',
                '',
                JSON.stringify({
                    MATERIALNUM: batchMatNum,
                    MATERIALDESC: 'Batch Created Material',
                    MATERIALTYPE: 'ROH'
                }),
                `--${changeBoundary}--`,
                '',
                `--${batchBoundary}--`,
                ''
            ].join('\r\n');

            const res = await httpPost(
                '/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV/$batch',
                batchBody,
                { 'Content-Type': `multipart/mixed; boundary=${batchBoundary}` }
            );

            assert.strictEqual(res.status, 200, 'Batch status must be 200');
            assert(res.body.includes('HTTP/1.1 200 OK'), 'Batch must contain 200 response for query');
            assert(res.body.includes('HTTP/1.1 201 Created'), 'Batch must contain 201 Created for POST');
            assert(res.body.includes(batchMatNum), 'Batch response must contain created material number');

            // Read-back verification of batch created entity
            const checkRes = await httpGet(`/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV/MaterialSet('${batchMatNum}')`);
            assert.strictEqual(checkRes.status, 200, 'Read-back of batch entity must return 200');
            const checkJson = JSON.parse(checkRes.body);
            assert.strictEqual(checkJson.MATERIALNUM, batchMatNum);
            assert.strictEqual(checkJson.MATERIALDESC, 'Batch Created Material');
        });

    } finally {
        await new Promise((resolve) => server.close(resolve));
    }

    console.log('\n================================================================');
    console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch((err) => {
    console.error('Fatal test error:', err);
    process.exit(1);
});
