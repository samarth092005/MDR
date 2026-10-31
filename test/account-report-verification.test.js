'use strict';

/**
 * Automated Verification Test for Entity Account Report:
 * 1. UI5 Build and Component structure
 * 2. Manifest data sources and models
 * 3. View structure and controls (FilterBar, Table, columns)
 * 4. Controller formatters and handlers
 * 5. MainDataService OData V4 EDMX $metadata & GLAccount entity set
 * 6. Local Express rewrite middleware for relative OData calls
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

async function runTests() {
    console.log('================================================================');
    console.log(' ENTITY ACCOUNT REPORT AUTOMATED VERIFICATION SUITE');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    function test(name, fn) {
        try {
            fn();
            console.log(`  ✅ PASS: ${name}`);
            passed++;
        } catch (e) {
            console.error(`  ❌ FAIL: ${name}`);
            console.error(`     Error: ${e.message}`);
            failed++;
        }
    }

    async function asyncTest(name, fn) {
        try {
            await fn();
            console.log(`  ✅ PASS: ${name}`);
            passed++;
        } catch (e) {
            console.error(`  ❌ FAIL: ${name}`);
            console.error(`     Error: ${e.message}`);
            failed++;
        }
    }

    const appDir = path.resolve(__dirname, '../app/zmdr_account_report');
    const rootDir = path.resolve(__dirname, '..');

    // Test 1: Check Manifest configuration
    test('Manifest declares correct OData data source and sap.cloud service', () => {
        const manifest = JSON.parse(fs.readFileSync(path.join(appDir, 'webapp/manifest.json'), 'utf8'));
        assert.strictEqual(manifest['sap.app'].dataSources.mainService.uri, 'mdrapi/maindata/');
        assert.strictEqual(manifest['sap.app'].dataSources.mainService.type, 'OData');
        assert.strictEqual(manifest['sap.app'].dataSources.mainService.settings.odataVersion, '4.0');
        assert.strictEqual(manifest['sap.cloud'].service, 'mdr.cap.btp');
        assert.strictEqual(manifest['sap.ui5'].models[''].dataSource, 'mainService');
    });

    // Test 2: Check xs-app.json routing
    test('xs-app.json routes /mdrapi/(.*) to srv-api destination', () => {
        const xsApp = JSON.parse(fs.readFileSync(path.join(appDir, 'xs-app.json'), 'utf8'));
        const mdRoute = xsApp.routes.find(r => r.source === '^/mdrapi/(.*)$');
        assert.ok(mdRoute, 'Expected route matching ^/mdrapi/(.*)$');
        assert.strictEqual(mdRoute.destination, 'srv-api');
        assert.strictEqual(mdRoute.target, '/mdrapi/$1');
        assert.strictEqual(mdRoute.authenticationType, 'xsuaa');
    });

    // Test 3: Check View XML controls and columns
    test('Main.view.xml defines FilterBar, SearchField, Table, and required columns', () => {
        const viewXml = fs.readFileSync(path.join(appDir, 'webapp/view/Main.view.xml'), 'utf8');
        assert.ok(viewXml.includes('FilterBar'), 'FilterBar should be present');
        assert.ok(viewXml.includes('filterChartOfAccounts'), 'Chart of Accounts filter should be present');
        assert.ok(viewXml.includes('filterAccountNumber'), 'Account Number filter should be present');
        assert.ok(viewXml.includes('items="{/GLAccount}"') || viewXml.includes('path: \'/GLAccount\''), 'Table items should bind to /GLAccount');
        assert.ok(viewXml.includes('colAccountBlock') || viewXml.includes('Account Block'), 'Account Block column required');
        assert.ok(viewXml.includes('colWorkflowId') || viewXml.includes('Workflow ID'), 'Workflow ID column required');
        assert.ok(viewXml.includes('colAccountNumber') || viewXml.includes('Account Number'), 'Account Number column required');
        assert.ok(viewXml.includes('colStatus') || viewXml.includes('Status'), 'Status column required');
        assert.ok(viewXml.includes('colVersionActive') || viewXml.includes('Version Active'), 'Version Active column required');
        assert.ok(viewXml.includes('colVersionStartDate') || viewXml.includes('Version Start Date'), 'Version Start Date column required');
        assert.ok(viewXml.includes('colVersionEndDate') || viewXml.includes('Version End Date'), 'Version End Date column required');
        assert.ok(viewXml.includes('colCreatedOn') || viewXml.includes('Created On'), 'Created On column required');
        assert.ok(viewXml.includes('colCreatedBy') || viewXml.includes('Created By'), 'Created By column required');
        assert.ok(viewXml.includes('colUpdatedOn') || viewXml.includes('Updated On'), 'Updated On column required');
        assert.ok(viewXml.includes('colUpdatedBy') || viewXml.includes('Updated By'), 'Updated By column required');
    });

    // Test 4: Check Controller handlers
    test('Main.controller.js implements search, filter, value help, settings, and export', () => {
        const controllerJs = fs.readFileSync(path.join(appDir, 'webapp/controller/Main.controller.js'), 'utf8');
        assert.ok(controllerJs.includes('onSearch:'), 'onSearch handler must exist');
        assert.ok(controllerJs.includes('onClearFilters:'), 'onClearFilters handler must exist');
        assert.ok(controllerJs.includes('onValueHelpAccountNumber:'), 'onValueHelpAccountNumber must exist');
        assert.ok(controllerJs.includes('onValueHelpChartOfAccounts:'), 'onValueHelpChartOfAccounts must exist');
        assert.ok(controllerJs.includes('onExport:'), 'onExport spreadsheet handler must exist');
        assert.ok(controllerJs.includes('onOpenViewSettings:'), 'onOpenViewSettings handler must exist');
        assert.ok(controllerJs.includes('formatStatusDesc:'), 'formatStatusDesc formatter must exist');
        assert.ok(controllerJs.includes('formatVersionText:'), 'formatVersionText formatter must exist');
        assert.ok(controllerJs.includes('formatDateTime:'), 'formatDateTime formatter must exist');
    });

    // Test 5: Check mta.yaml wiring
    test('mta.yaml wires zmdr_account_report into ui-deployer and ignores it in approuter', () => {
        const mtaYaml = fs.readFileSync(path.join(rootDir, 'mta.yaml'), 'utf8');
        assert.ok(mtaYaml.includes('name: zmdr_account_report'), 'html5 module for zmdr_account_report');
        assert.ok(mtaYaml.includes('zmdr_account_report.zip'), 'ui-deployer requires zmdr_account_report.zip');
        assert.ok(mtaYaml.includes('"zmdr_account_report/"'), 'approuter ignores zmdr_account_report/');
    });

    // Test 6: Check UI5 build dist output
    test('dist folder contains built Component-preload.js and manifest.json', () => {
        assert.ok(fs.existsSync(path.join(appDir, 'dist/Component-preload.js')), 'Component-preload.js exists');
        assert.ok(fs.existsSync(path.join(appDir, 'dist/manifest.json')), 'dist/manifest.json exists');
        assert.ok(fs.existsSync(path.join(appDir, 'dist/xs-app.json')), 'dist/xs-app.json exists');
    });

    // Test 7: Integration test with CAP MainDataService
    await asyncTest('MainDataService serves $metadata and GLAccount collection', async () => {
        const cds = require('@sap/cds');
        cds.model = await cds.load('*');
        const db = await cds.connect.to('db');
        const existing = await db.run(SELECT.from('zmdr.GLAccount'));
        if (existing.length === 0) {
            await db.run(INSERT.into('zmdr.GLAccount').entries({
                GlAccountNum: '100001',
                VersionStartDate: '2026-10-25T15:53:55.979Z',
                CompanyCode: '1000',
                AccountDesc: 'Cash Account',
                AccountType: 'BA',
                Currency: 'EUR',
                Status: 'ACT',
                WorkflowId: 'CTR_TEST_01',
                VersionActive: 'Y'
            }));
        }

        const express = require('express');
        const app = express();
        require('../server.js');
        cds.emit('bootstrap', app);
        await cds.serve('all').in(app);

        const server = http.createServer(app);
        await new Promise(res => server.listen(4019, res));

        try {
            const makeGet = (p) => new Promise((resolve, reject) => {
                http.get('http://localhost:4019' + p, res => {
                    let d = '';
                    res.on('data', chunk => d += chunk);
                    res.on('end', () => resolve({ status: res.statusCode, body: d }));
                }).on('error', reject);
            });

            // Direct metadata
            const r1 = await makeGet('/mdrapi/maindata/$metadata');
            assert.strictEqual(r1.status, 200);
            assert.ok(r1.body.includes('EntityType Name="GLAccount"'));

            // Direct collection
            const r2 = await makeGet('/mdrapi/maindata/GLAccount');
            assert.strictEqual(r2.status, 200);
            const data2 = JSON.parse(r2.body);
            assert.ok(Array.isArray(data2.value) && data2.value.length > 0);

            // Relative metadata via Express rewrite
            const r3 = await makeGet('/com.intapptics.zmdraccountreport/mdrapi/maindata/$metadata');
            assert.strictEqual(r3.status, 200);
            assert.ok(r3.body.includes('EntityType Name="GLAccount"'));

            // Relative collection via Express rewrite
            const r4 = await makeGet('/com.intapptics.zmdraccountreport/mdrapi/maindata/GLAccount');
            assert.strictEqual(r4.status, 200);
            const data4 = JSON.parse(r4.body);
            assert.ok(Array.isArray(data4.value) && data4.value.length > 0);
        } finally {
            server.close();
        }
    });

    console.log(`\n================================================================`);
    console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log(`================================================================\n`);

    if (failed > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Test run error:', err);
    process.exit(1);
});
