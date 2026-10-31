'use strict';

/**
 * services-e2e-persistence.test.js
 *
 * Comprehensive End-to-End Verification of all 10 Services Entities:
 * - OData V4 Metadata ($metadata)
 * - Collection Read (GET) with 200 OK
 * - Create Request (POST) with 201 Created, WORKFLOW_ID generation, and Status 510
 * - Single Entity Read (GET) with 200 OK
 * - Real Database Persistence in SQLite (zmdr_ZMDR_*)
 * - Full Workflow Audit log insertion
 */

const assert = require('assert');
const http = require('http');
const path = require('path');
const express = require('express');
const cds = require('@sap/cds');

const ROOT_DIR = path.resolve(__dirname, '..');
const TEST_PORT = 4039;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

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
    console.log(' MDR 10 SERVICES ENTITIES END-TO-END DATABASE PERSISTENCE TEST');
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

    let server = null;
    let db = null;

    try {
        const app = express();
        require('../server.js');
        cds.model = await cds.load('*');
        db = await cds.connect.to({ kind: 'sqlite', credentials: { url: path.join(ROOT_DIR, 'db.sqlite') } });
        cds.emit('bootstrap', app);
        await cds.serve('all').in(app);
        server = http.createServer(app);
        await new Promise((resolve) => server.listen(TEST_PORT, resolve));

        const testEntities = [
            {
                name: 'Service Catalog',
                set: 'ServCatalogSet',
                key: 'CATALOG_ID',
                id: 'CAT_E2E_01',
                table: 'zmdr_ZMDR_SERVCATALOG',
                payload: {
                    CATALOG_ID: 'CAT_E2E_01',
                    CATALOG_NAME: 'E2E Verified Cloud Catalog',
                    CATALOG_DESC: 'Fully persisted into SQLite',
                    CATALOG_TYPE: 'Standard',
                    EFFECTIVE_DATE: '2026-10-29',
                    EXPIRY_DATE: '2099-12-31',
                    OWNER_ID: 'SYS_ADMIN',
                    CATALOG_STATUS: 'Active'
                }
            },
            {
                name: 'Service Category',
                set: 'ServCategorySet',
                key: 'CATEGORY_ID',
                id: 'CATG_E2E_01',
                table: 'zmdr_ZMDR_SERVCATEGRY',
                payload: {
                    CATEGORY_ID: 'CATG_E2E_01',
                    CATEGORY_NAME: 'Compute Infrastructure Category',
                    CATEGORY_DESC: 'Persistent compute category tier',
                    CATEGORY_TYPE: 'Core',
                    EFFECTIVE_DATE: '2026-10-29',
                    EXPIRY_DATE: '2099-12-31',
                    CATEGORY_STATUS: 'Active'
                }
            },
            {
                name: 'Contract',
                set: 'ContractSet',
                key: 'CONTRACT_ID',
                id: 'CON_E2E_01',
                table: 'zmdr_ZMDR_CONTRACT',
                payload: {
                    CONTRACT_ID: 'CON_E2E_01',
                    CONTRACT_NAME: 'Master Services Agreement 2026',
                    CONTRACT_DESC: 'E2E persistent vendor contract',
                    CONTRACT_TYPE: 'Enterprise SLA',
                    START_DATE: '2026-01-01',
                    END_DATE: '2027-12-31',
                    VENDOR_ID: 'VEND_9001',
                    CONTRACT_STATUS: 'Active'
                }
            },
            {
                name: 'Customer Segment Eligibility',
                set: 'CustSegmentElgSet',
                key: 'SEGMENT_ID',
                id: 'CSG_E2E_01',
                table: 'zmdr_ZMDR_CUST_SG_ELG',
                payload: {
                    SEGMENT_ID: 'CSG_E2E_01',
                    SEGMENT_NAME: 'Strategic Growth Clients',
                    SEGMENT_DESC: 'Annual spend exceeding 5M',
                    ELIGIBILITY_RULE: 'SPEND > 5000000',
                    EFFECTIVE_DATE: '2026-10-29',
                    EXPIRY_DATE: '2099-12-31'
                }
            },
            {
                name: 'Location',
                set: 'LocationSet',
                key: 'LOCATION_ID',
                id: 'LOC_E2E_01',
                table: 'zmdr_ZMDR_LOCATION',
                payload: {
                    LOCATION_ID: 'LOC_E2E_01',
                    LOCATION_NAME: 'Bengaluru Tech Park Hub',
                    LOCATION_TYPE: 'Engineering Center',
                    COUNTRY: 'IND',
                    REGION: 'KA',
                    CITY: 'Bengaluru',
                    POSTAL_CODE: '560100'
                }
            },
            {
                name: 'Price and Tariff',
                set: 'PriceTariffSet',
                key: 'TARIFF_ID',
                id: 'TRF_E2E_01',
                table: 'zmdr_ZMDR_PRICE_TARRF',
                payload: {
                    TARIFF_ID: 'TRF_E2E_01',
                    TARIFF_NAME: 'Enterprise Priority Tariff',
                    TARIFF_DESC: 'Hourly mission critical advisory',
                    RATE_TYPE: 'Hourly',
                    CURRENCY: 'INR',
                    UNIT_PRICE: 4500.00,
                    EFFECTIVE_DATE: '2026-10-29'
                }
            },
            {
                name: 'Service Level Agreement',
                set: 'SLASet',
                key: 'SLA_ID',
                id: 'SLA_E2E_01',
                table: 'zmdr_ZMDR_SLA',
                payload: {
                    SLA_ID: 'SLA_E2E_01',
                    SLA_NAME: 'Gold 15-Minute Critical SLA',
                    SLA_DESC: 'Round the clock tier 1 support',
                    RESPONSE_TIME_HRS: 1,
                    RESOLUTION_TIME_HRS: 2,
                    COVERAGE_HOURS: '24x7'
                }
            },
            {
                name: 'Service Offering',
                set: 'ServOfferingSet',
                key: 'OFFERING_ID',
                id: 'SOF_E2E_01',
                table: 'zmdr_ZMDR_SERVOFFRING',
                payload: {
                    OFFERING_ID: 'SOF_E2E_01',
                    OFFERING_NAME: 'Managed Kubernetes Cluster Service',
                    OFFERING_DESC: 'Automated container orchestration',
                    OFFERING_TYPE: 'Platform',
                    CATALOG_ID: 'CAT001',
                    EFFECTIVE_DATE: '2026-10-29'
                }
            },
            {
                name: 'Service Package Bundle',
                set: 'ServPkgBundleSet',
                key: 'BUNDLE_ID',
                id: 'BND_E2E_01',
                table: 'zmdr_ZMDR_SERVPKGBNDL',
                payload: {
                    BUNDLE_ID: 'BND_E2E_01',
                    BUNDLE_NAME: 'Total Enterprise Cloud Bundle',
                    BUNDLE_DESC: 'Compute + SLA + Operations support',
                    BUNDLE_TYPE: 'Solution Bundle',
                    PRICE: 500000.00,
                    CURRENCY: 'INR'
                }
            },
            {
                name: 'Service Provider',
                set: 'ServProviderSet',
                key: 'PROVIDER_ID',
                id: 'PRV_E2E_01',
                table: 'zmdr_ZMDR_SERV_PROV',
                payload: {
                    PROVIDER_ID: 'PRV_E2E_01',
                    PROVIDER_NAME: 'Abhiyanta Managed Infrastructure Ltd',
                    PROVIDER_TYPE: 'Primary Vendor',
                    CONTACT_PERSON: 'Senior Infrastructure Director',
                    EMAIL: 'infra@abhiyanta.com',
                    PHONE: '+91-8012345678'
                }
            }
        ];

        // 1. Metadata Verification
        await test('OData V4 $metadata exposes all 10 Services EntityTypes and EntitySets', async () => {
            const metaRes = await httpGet('/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/$metadata');
            assert.strictEqual(metaRes.status, 200, 'Metadata status must be 200');
            testEntities.forEach(ent => {
                assert(metaRes.body.includes(`EntitySet Name="${ent.set}"`), `Metadata must declare EntitySet ${ent.set}`);
            });
        });

        // 2. Loop through all 10 entities and verify full lifecycle + DB persistence
        for (const ent of testEntities) {
            await test(`[${ent.name}] Collection Read (GET) returns 200 and value array`, async () => {
                const res = await httpGet(`/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/${ent.set}`);
                assert.strictEqual(res.status, 200, `GET ${ent.set} must return 200`);
                const json = JSON.parse(res.body);
                assert(Array.isArray(json.value), `${ent.set} value must be array`);
            });

            await test(`[${ent.name}] Create (POST) persists record and returns 201 Created with WORKFLOW_ID`, async () => {
                const res = await httpPost(`/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/${ent.set}`, ent.payload);
                assert.strictEqual(res.status, 201, `POST ${ent.set} must return 201`);
                const json = JSON.parse(res.body);
                assert.strictEqual(json[ent.key], ent.id, 'Key must match created ID');
                assert(json.WORKFLOW_ID, 'Must generate WORKFLOW_ID');
                assert.strictEqual(json.STATUS, '510', 'Default status must be 510');
                assert.strictEqual(json.VERSION_ACTIVE, 'Y');
            });

            await test(`[${ent.name}] Read Single Entity returns persisted object`, async () => {
                const res = await httpGet(`/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/${ent.set}('${ent.id}')`);
                assert.strictEqual(res.status, 200, `GET single ${ent.set} must return 200`);
                const json = JSON.parse(res.body);
                assert.strictEqual(json[ent.key], ent.id);
            });

            await test(`[${ent.name}] Direct SQLite DB Query confirms record is written to ${ent.table}`, async () => {
                // Wait briefly for asynchronous SQLite write
                await new Promise(r => setTimeout(r, 1000));
                const rows = await db.run(`SELECT * FROM ${ent.table} WHERE "${ent.key}" = ?`, [ent.id]);
                assert(rows.length >= 1, `Must find exactly 1 record in SQLite table ${ent.table}`);
                assert.strictEqual(rows[0][ent.key], ent.id, 'SQLite key column must match');
                assert.strictEqual(rows[0].STATUS, '510', 'SQLite STATUS must be 510');
                assert.strictEqual(rows[0].VERSION_ACTIVE, 'Y', 'SQLite VERSION_ACTIVE must be Y');
            });
        }

        // 3. Workflow Triggering & Audit Log Verification
        await test('Central Workflow triggers and inserts audit record into WFAudit table', async () => {
            const wfPayload = {
                WorkflowId: 'WF_E2E_999',
                EntityName: 'Contract',
                EntityId: 'CON_E2E_01',
                Tablename: 'ZMDR_CONTRACT',
                OperationType: 'CREATE',
                UserRemarks: 'E2E automated test submission remarks',
                WorkflowIdentifier: 'CENTRAL'
            };

            const wfRes = await httpPost('/mdrapi/workflow/TriggerWorkflowSet', wfPayload);
            assert.strictEqual(wfRes.status, 201, 'Workflow trigger status must be 201');

            // Verify WFAudit entry in SQLite
            await new Promise(r => setTimeout(r, 300));
            const auditRows = await db.run("SELECT * FROM zmdr_WFAudit WHERE workflowid = 'WF_E2E_999' OR WorkflowId = 'WF_E2E_999'");
            assert(auditRows.length >= 1, 'Must find audit log entry for triggered workflow');
            assert.strictEqual(auditRows[0].action || auditRows[0].Action, 'INITIATED', 'Audit action must be INITIATED');
            assert.strictEqual(auditRows[0].entityname || auditRows[0].EntityName, 'Contract', 'Audit entityname must match');
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
    console.error('Fatal test error:', err);
    process.exit(1);
});
