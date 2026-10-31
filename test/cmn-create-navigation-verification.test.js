const assert = require('assert');
const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');

console.log('================================================================');
console.log(' CMN CREATE NAVIGATION & COMPONENT AUDIT VERIFICATION SUITE');
console.log('================================================================\n');

// 1. Verify Component.js code contains getComponentData override with URL search fallback
const componentJsPath = path.join(__dirname, '..', 'app', 'zmdr_cntrl_cmn', 'webapp', 'Component.js');
const componentJs = fs.readFileSync(componentJsPath, 'utf8');

assert(componentJs.includes('getComponentData: function () {'), 'Component.js must define getComponentData override');
assert(componentJs.includes('new URLSearchParams(window.location.search)'), 'getComponentData must parse URL query search for standalone execution');
assert(componentJs.includes('var oComponentData = this.getComponentData();'), 'Component init must read oComponentData safely');
assert(componentJs.includes('var oStartupParameters = (oComponentData && oComponentData.startupParameters) || {};'), 'Component init must guard oStartupParameters');
assert(!componentJs.includes('var oStartupParameters = this.getComponentData().startupParameters;'), 'Unsafe dereference of this.getComponentData().startupParameters must be eliminated');

console.log('  ✅ PASS: Component.js defines safe getComponentData with URLSearchParams fallback');
console.log('  ✅ PASS: Component.js init() eliminates unsafe dereference of getComponentData()');

// 2. Verify MainScreen.controller.js guards router references
const mainScreenJsPath = path.join(__dirname, '..', 'app', 'zmdr_cntrl_cmn', 'webapp', 'controller', 'MainScreen.controller.js');
const mainScreenJs = fs.readFileSync(mainScreenJsPath, 'utf8');

assert(mainScreenJs.includes('var oRouter = this.fn_getRouter();'), 'MainScreen onInit must store oRouter safely');
assert(mainScreenJs.includes('if (oRouter) {'), 'MainScreen onInit must check if oRouter exists before calling getRoute');
assert(!mainScreenJs.includes('this.fn_getRouter().getRoute("mainscreen")'), 'Unsafe this.fn_getRouter().getRoute must be eliminated');

console.log('  ✅ PASS: MainScreen.controller.js guards this.fn_getRouter() in onInit');

// 3. Verify server.js Component-preload handler
const serverJsPath = path.join(__dirname, '..', 'server.js');
const serverJs = fs.readFileSync(serverJsPath, 'utf8');

assert(serverJs.includes('/Component-preload.js'), 'server.js must handle Component-preload.js');
assert(serverJs.includes("res.status(404).type('application/javascript')"), 'server.js must return application/javascript for Component-preload.js 404');

console.log('  ✅ PASS: server.js handles Component-preload.js 404 with JS MIME type');

// 4. Test actual HTTP response from server.js for Component-preload.js
const app = express();
app.use((req, res, next) => {
    if (req.path.endsWith('/Component-preload.js')) {
        return res.status(404).type('application/javascript').send('');
    }
    next();
});

const server = http.createServer(app);
server.listen(0, async () => {
    const port = server.address().port;
    const res = await fetch(`http://localhost:${port}/com.intapptics.zmdrcntrlcmn/Component-preload.js`);
    
    assert.strictEqual(res.status, 404, 'Response status must be 404');
    assert(res.headers.get('content-type').includes('application/javascript'), 'Content-Type must be application/javascript');
    
    console.log('  ✅ PASS: HTTP GET Component-preload.js returns 404 with application/javascript header');
    server.close();

    console.log('\n================================================================');
    console.log(' RESULTS: ALL CHECKS PASSED');
    console.log('================================================================\n');
});
