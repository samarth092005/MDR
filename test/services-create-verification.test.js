'use strict';

/**
 * services-create-verification.test.js
 *
 * Automated Test Suite for MDR Services Create Workflow & Entity Configuration.
 * Run via: node test/services-create-verification.test.js
 */

const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const cds = require('@sap/cds');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEST_PORT = 4028;
let BASE_URL = process.env.BASE_URL || `http://127.0.0.1:${TEST_PORT}`;

async function httpGet(urlPath, headers = {}) {
    return new Promise((resolve, reject) => {
        const req = http.get(BASE_URL + urlPath, { headers }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
        });
        req.on('error', reject);
    });
}

async function httpPost(urlPath, payload, headers = {}) {
    return new Promise((resolve, reject) => {
        const dataStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const reqHeaders = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(dataStr),
            ...headers
        };

        const req = http.request(BASE_URL + urlPath, {
            method: 'POST',
            headers: reqHeaders
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
        });
        req.on('error', reject);
        req.write(dataStr);
        req.end();
    });
}

async function runTests() {
    console.log('================================================================');
    console.log(' MDR SERVICES WORKFLOW & ENTITY CONFIGURATION TEST SUITE');
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

    // --- TEST 1: Manifest URIs Validation ---
    await test('Manifest URI leading-slash configuration in main and cmn apps', () => {
        const mainManifestPath = path.join(ROOT_DIR, 'app/zmdr_cntrl_main/webapp/manifest.json');
        const cmnManifestPath = path.join(ROOT_DIR, 'app/zmdr_cntrl_cmn/webapp/manifest.json');

        const mainManifest = JSON.parse(fs.readFileSync(mainManifestPath, 'utf8'));
        const cmnManifest = JSON.parse(fs.readFileSync(cmnManifestPath, 'utf8'));

        assert.ok(
            mainManifest['sap.app'].dataSources.mainService.uri === 'mdrapi/central/' ||
            mainManifest['sap.app'].dataSources.mainService.uri === '/mdrapi/central/',
            'Main app mainService URI must be configured for CentralService');
        assert.strictEqual(cmnManifest['sap.app'].dataSources.mainService.uri, '/mdrapi/central/',
            'Common app mainService URI must have leading slash');
        assert.strictEqual(cmnManifest['sap.app'].dataSources.workflowService.uri, '/mdrapi/workflow/',
            'Common app workflowService URI must have leading slash');
    });

    let server = null;
    if (!process.env.BASE_URL) {
        const app = express();
        require('../server.js');
        cds.model = await cds.load('*');
        await cds.connect.to('db');
        cds.emit('bootstrap', app);
        await cds.serve('all').in(app);
        server = http.createServer(app);
        await new Promise((resolve) => server.listen(TEST_PORT, resolve));
    }

    try {

    // --- TEST 2: Central CAP Services Reachability ---
    await test('Central CAP services respond with HTTP 200 at root paths', async () => {
        const centralRes = await httpGet('/mdrapi/central/$metadata');
        assert.strictEqual(centralRes.status, 200, 'Central service $metadata must return 200');

        const wfRes = await httpGet('/mdrapi/workflow/$metadata');
        assert.strictEqual(wfRes.status, 200, 'Workflow service $metadata must return 200');
    });

    // --- TEST 3: Service Catalog OData V4 Metadata ---
    await test('Service Catalog $metadata returns valid OData V4 EDMX XML', async () => {
        const res = await httpGet('/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/$metadata');
        assert.strictEqual(res.status, 200, 'Metadata status must be 200');
        assert(res.headers['content-type'].includes('xml'), 'Content-Type must be XML');
        assert(res.body.includes('<edmx:Edmx Version="4.0"'), 'Must contain OData 4.0 Edmx declaration');
        assert(res.body.includes('<EntityType Name="ServCatalog"'), 'Must define ServCatalog EntityType');
        assert(res.body.includes('<EntitySet Name="ServCatalogSet"'), 'Must define ServCatalogSet EntitySet');
        assert.strictEqual(res.headers['x-mdr-data-source'], 'Simulated-Local-Fixture', 'Header must identify simulated fixture');
    });

    // --- TEST 4: Service Catalog Collection Read ---
    await test('Service Catalog collection read returns seed records', async () => {
        const res = await httpGet('/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/ServCatalogSet?$top=5');
        assert.strictEqual(res.status, 200, 'Read status must be 200');
        const json = JSON.parse(res.body);
        assert(Array.isArray(json.value), 'Response value must be an array');
        assert(json.value.length > 0, 'Should return records from seed data');
        assert.strictEqual(json['@odata.context'], '$metadata#ServCatalogSet', 'OData context must match');
    });

    // --- TEST 5: CSRF Token Fetch ---
    await test('CSRF token fetch responds with valid token header', async () => {
        const res = await httpGet('/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/', { 'x-csrf-token': 'Fetch' });
        assert.strictEqual(res.status, 200, 'CSRF fetch must return 200');
        assert(res.headers['x-csrf-token'], 'Response must include x-csrf-token header');
    });

    // --- TEST 6: Service Catalog Create (POST) ---
    const testCatalogId = 'CAT_AUTO_' + Math.floor(1000 + Math.random() * 9000);
    await test('Service Catalog Create persists record and returns HTTP 201 Created', async () => {
        const payload = {
            CATALOG_ID: testCatalogId,
            CATALOG_NAME: 'Automated Test Catalog',
            CATALOG_DESC: 'Created by automated verification suite',
            CATALOG_TYPE: 'Standard',
            EFFECTIVE_DATE: '2026-10-26',
            EXPIRY_DATE: '2028-12-31',
            OWNER_ID: 'TEST_OWNER',
            CATALOG_STATUS: 'Approved'
        };

        const res = await httpPost('/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/ServCatalogSet', payload);
        assert.strictEqual(res.status, 201, 'POST status must be 201 Created');
        assert(res.headers['location'].includes(testCatalogId), 'Location header must reference created ID');

        const json = JSON.parse(res.body);
        assert.strictEqual(json.CATALOG_ID, testCatalogId, 'Created ID must match');
        assert(json.WORKFLOW_ID, 'Must generate or include a Workflow ID');
        assert.strictEqual(json.STATUS, '510', 'Default status must be 510');
    });

    // --- TEST 7: Read Back Created Entity ---
    await test('Read back created Service Catalog entity', async () => {
        const res = await httpGet(`/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/ServCatalogSet('${testCatalogId}')`);
        assert.strictEqual(res.status, 200, 'Read single entity status must be 200');
        const json = JSON.parse(res.body);
        assert.strictEqual(json.CATALOG_ID, testCatalogId, 'Read back ID must match created ID');
        assert.strictEqual(json.CATALOG_NAME, 'Automated Test Catalog', 'Read back Name must match');
    });

    // --- TEST 8: Multipart Batch Query & Changeset ---
    await test('Multipart $batch handles queries and changesets with 201 response', async () => {
        const batchId = 'batch_test_' + Date.now();
        const changeId = 'changeset_test_' + Date.now();
        const batchPayload = [
            '--' + batchId,
            'Content-Type: application/http',
            'Content-Transfer-Encoding: binary',
            '',
            'GET ServCatalogSet?$top=1 HTTP/1.1',
            'Accept: application/json;odata.metadata=minimal',
            '',
            '--' + batchId,
            'Content-Type: multipart/mixed; boundary=' + changeId,
            '',
            '--' + changeId,
            'Content-Type: application/http',
            'Content-Transfer-Encoding: binary',
            'Content-ID: 1',
            '',
            'POST ServCatalogSet HTTP/1.1',
            'Content-Type: application/json;charset=utf-8',
            '',
            JSON.stringify({
                CATALOG_ID: 'CAT_MBATCH_' + Math.floor(100 + Math.random() * 900),
                CATALOG_NAME: 'Batch Created Catalog',
                EFFECTIVE_DATE: '2026-10-26',
                OWNER_ID: 'BATCH_USR',
                CATALOG_STATUS: 'Approved'
            }),
            '--' + changeId + '--',
            '',
            '--' + batchId + '--'
        ].join('\r\n');

        const res = await httpPost('/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/$batch', batchPayload, {
            'Content-Type': 'multipart/mixed; boundary=' + batchId
        });

        assert.strictEqual(res.status, 200, 'Batch status must be 200');
        assert(res.body.includes('201 Created'), 'Batch response must contain 201 Created for changeset');
    });

    // --- TEST 9: All 10 Services Entities Configuration & Full Readiness ---
    await test('All 10 Services entities are fully configured in CntrlUIVis, CntrlUIConfig, and CntrlUIUrl', () => {
        const uivisPath = path.join(ROOT_DIR, 'db/data/zmdr.CntrlUIVis.csv');
        const uiconfigPath = path.join(ROOT_DIR, 'db/data/zmdr.CntrlUIConfig.csv');
        const uiurlPath = path.join(ROOT_DIR, 'db/data/zmdr.CntrlUIUrl.csv');

        const uivisContent = fs.readFileSync(uivisPath, 'utf8');
        const uiconfigContent = fs.readFileSync(uiconfigPath, 'utf8');
        const uiurlContent = fs.readFileSync(uiurlPath, 'utf8');

        const all10Services = [
            'ZMDR_SERVCATALOG', 'ZMDR_SERVCATEGRY', 'ZMDR_CONTRACT', 'ZMDR_CUST_SG_ELG',
            'ZMDR_LOCATION', 'ZMDR_PRICE_TARRF', 'ZMDR_SLA', 'ZMDR_SERVOFFRING',
            'ZMDR_SERVPKGBNDL', 'ZMDR_SERV_PROV'
        ];

        all10Services.forEach(ent => {
            assert(uivisContent.includes(ent), `${ent} must be declared in CntrlUIVis`);
            const hasCols = uiconfigContent.split(/\r?\n/).some(l => l.startsWith(ent + ','));
            assert(hasCols, `${ent} must have column definitions in CntrlUIConfig`);
            const hasUrl = uiurlContent.split(/\r?\n/).some(l => l.startsWith(ent + ','));
            assert(hasUrl, `${ent} must have an endpoint mapping in CntrlUIUrl`);
        });
    });

    // --- TEST 9b: All 8 Newly Activated Services Entities Read & Create Verification ---
    await test('Newly activated 8 Services entities respond to collection queries and create requests', async () => {
        const testEntities = [
            { set: 'ContractSet', key: 'CONTRACT_ID', id: 'CON_TEST_99', name: 'CONTRACT_NAME' },
            { set: 'CustSegmentElgSet', key: 'SEGMENT_ID', id: 'CSG_TEST_99', name: 'SEGMENT_NAME' },
            { set: 'LocationSet', key: 'LOCATION_ID', id: 'LOC_TEST_99', name: 'LOCATION_NAME' },
            { set: 'PriceTariffSet', key: 'TARIFF_ID', id: 'TRF_TEST_99', name: 'TARIFF_NAME' },
            { set: 'SLASet', key: 'SLA_ID', id: 'SLA_TEST_99', name: 'SLA_NAME' },
            { set: 'ServOfferingSet', key: 'OFFERING_ID', id: 'SOF_TEST_99', name: 'OFFERING_NAME' },
            { set: 'ServPkgBundleSet', key: 'BUNDLE_ID', id: 'BND_TEST_99', name: 'BUNDLE_NAME' },
            { set: 'ServProviderSet', key: 'PROVIDER_ID', id: 'PRV_TEST_99', name: 'PROVIDER_NAME' }
        ];

        for (const item of testEntities) {
            // 1. GET Collection
            const getRes = await httpGet(`/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/${item.set}`);
            assert.strictEqual(getRes.status, 200, `GET ${item.set} must return 200`);
            const getJson = JSON.parse(getRes.body);
            assert(Array.isArray(getJson.value), `GET ${item.set} value must be array`);
            assert(getJson.value.length > 0, `GET ${item.set} must return seeded records`);

            // 2. POST Create
            const postPayload = {
                [item.key]: item.id,
                [item.name]: `Automated Test for ${item.set}`,
                STATUS: '510'
            };
            const postRes = await httpPost(`/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/${item.set}`, postPayload);
            assert.strictEqual(postRes.status, 201, `POST ${item.set} must return 201 Created`);
            const postJson = JSON.parse(postRes.body);
            assert.strictEqual(postJson[item.key], item.id);
            assert(postJson.WORKFLOW_ID, `Must return WORKFLOW_ID for ${item.set}`);
            assert.strictEqual(postJson.VERSION_ACTIVE, 'Y');
            assert.strictEqual(postJson.VersionActive, 'Y');

            // 3. GET Single
            const singleRes = await httpGet(`/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/${item.set}('${item.id}')`);
            assert.strictEqual(singleRes.status, 200, `GET single ${item.set} must return 200`);
        }
    });

    // --- TEST 10: Service Category CntrlUIConfig Metadata ---
    await test('Service Category CntrlUIConfig returns 10 field definitions from Central API', async () => {
        const res = await httpGet('/mdrapi/central/CntrlUIConfig?$filter=TableName%20eq%20%27ZMDR_SERVCATEGRY%27');
        assert.strictEqual(res.status, 200, 'Config query status must be 200');
        const json = JSON.parse(res.body);
        assert(Array.isArray(json.value), 'Response value must be an array');
        assert.strictEqual(json.value.length, 10, 'Must return exactly 10 field definitions for ZMDR_SERVCATEGRY');
        const colNames = json.value.map(c => c.ColumnName);
        assert(colNames.includes('CATEGORY_ID'), 'Must include CATEGORY_ID primary key');
        assert(colNames.includes('CATEGORY_NAME'), 'Must include CATEGORY_NAME');
        assert(colNames.includes('CATEGORY_STATUS'), 'Must include CATEGORY_STATUS');
    });

    // --- TEST 11: Service Category CntrlUIUrl Mapping ---
    await test('Service Category CntrlUIUrl returns mock ServCategorySet endpoint', async () => {
        const res = await httpGet('/mdrapi/central/CntrlUIUrl?$filter=TableName%20eq%20%27ZMDR_SERVCATEGRY%27');
        assert.strictEqual(res.status, 200, 'URL query status must be 200');
        const json = JSON.parse(res.body);
        assert(Array.isArray(json.value), 'Response value must be an array');
        assert.strictEqual(json.value.length, 1, 'Must return 1 URL mapping');
        assert.strictEqual(json.value[0].OdataUrl, '/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/ServCategorySet');
    });

    // --- TEST 12: Service Category OData V4 Metadata ---
    await test('Service Category $metadata exposes ServCategory EntityType and ServCategorySet', async () => {
        const res = await httpGet('/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/$metadata');
        assert.strictEqual(res.status, 200, 'Metadata status must be 200');
        assert(res.body.includes('<EntityType Name="ServCategory"'), 'Must define ServCategory EntityType');
        assert(res.body.includes('<EntitySet Name="ServCategorySet"'), 'Must define ServCategorySet EntitySet');
        assert(res.body.includes('PropertyRef Name="CATEGORY_ID"'), 'Must define CATEGORY_ID as Key');
    });

    // --- TEST 13: Service Category Collection Read ---
    await test('Service Category collection read returns mock records', async () => {
        const res = await httpGet('/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/ServCategorySet?$top=5');
        assert.strictEqual(res.status, 200, 'Read status must be 200');
        const json = JSON.parse(res.body);
        assert(Array.isArray(json.value), 'Response value must be an array');
        assert(json.value.length > 0, 'Should return records from seed mock data');
        assert.strictEqual(json['@odata.context'], '$metadata#ServCategorySet', 'OData context must match');
        assert.strictEqual(json.value[0].CATEGORY_ID, 'SCAT001', 'First mock category must be SCAT001');
    });

    // --- TEST 14: Service Category Create (POST) ---
    const testCatId = 'SCAT_TST_' + Math.floor(1000 + Math.random() * 9000);
    await test('Service Category Create validates and returns HTTP 201 Created', async () => {
        const payload = {
            CATEGORY_ID: testCatId,
            CATEGORY_NAME: 'Automated Test Service Category',
            CATEGORY_DESC: 'Created by automated verification test',
            CATEGORY_TYPE: 'Core',
            EFFECTIVE_DATE: '2026-10-26',
            EXPIRY_DATE: '2099-12-31',
            CATEGORY_STATUS: 'Active'
        };

        const res = await httpPost('/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/ServCategorySet', payload);
        assert.strictEqual(res.status, 201, 'POST status must be 201 Created');
        assert(res.headers['location'].includes(testCatId), 'Location header must reference created category ID');

        const json = JSON.parse(res.body);
        assert.strictEqual(json.CATEGORY_ID, testCatId, 'Created ID must match');
        assert(json.WORKFLOW_ID, 'Must generate or include a Workflow ID');
        assert.strictEqual(json.STATUS, '510', 'Default status must be 510');
    });

    // --- TEST 15: Read Back Created Service Category ---
    await test('Read back created Service Category entity returns persisted record', async () => {
        const res = await httpGet(`/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/ServCategorySet('${testCatId}')`);
        assert.strictEqual(res.status, 200, 'Read-back status must be 200');
        const json = JSON.parse(res.body);
        assert.strictEqual(json.CATEGORY_ID, testCatId, 'Read back ID must match');
        assert.strictEqual(json.CATEGORY_NAME, 'Automated Test Service Category');
    });
    } finally {
        if (server) {
            await new Promise((resolve) => server.close(resolve));
        }
    }

    console.log('\n================================================================');
    console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Test execution fatal error:', err);
    process.exit(1);
});
