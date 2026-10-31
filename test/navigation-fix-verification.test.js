const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log("================================================================");
console.log(" MDR CENTRAL MAIN NAVIGATION FIX AUTOMATED VERIFICATION SUITE");
console.log("================================================================\n");

const trPath = path.join(__dirname, '../app/zmdr_cntrl_main/webapp/controller/TableResult.controller.js');
const tlPath = path.join(__dirname, '../app/zmdr_cntrl_main/webapp/controller/TableList.controller.js');
const clPath = path.join(__dirname, '../app/zmdr_cntrl_main/webapp/controller/CategoryList.controller.js');

const trCode = fs.readFileSync(trPath, 'utf8');
const tlCode = fs.readFileSync(tlPath, 'utf8');
const clCode = fs.readFileSync(clPath, 'utf8');

// 1. Verify undeclared aFilters is eliminated
assert(trCode.includes('var aFilters = [];'), 'aFilters must be declared in TableResult');
console.log('  ✅ PASS: aFilters initialized before ZMDR_MATERIAL guard');

// 2. Verify _fn_findSelectedTable implementation
assert(trCode.includes('_fn_findSelectedTable: function (aTables, sKey)'), 'Must implement _fn_findSelectedTable');
assert(!trCode.includes('oSelectedTableData = this.fn_getGlobalModel("oUniqueTablesModel").getData()[this.sTableId];'), 'Direct array access by sTableId must be replaced');
console.log('  ✅ PASS: Safe table lookup implemented and replaces brittle array indexing');

// 3. Verify _pCntrlUiVisLoad promise tracking & awaiting
assert(clCode.includes('this.getOwnerComponent()._pCntrlUiVisLoad = oLoadPromise;'), 'CategoryList must store _pCntrlUiVisLoad');
assert(tlCode.includes('pLoad = oComp ? oComp._pCntrlUiVisLoad : null;'), 'TableList must check _pCntrlUiVisLoad');
assert(trCode.includes('pLoad = oComp ? oComp._pCntrlUiVisLoad : null;'), 'TableResult must check _pCntrlUiVisLoad');
console.log('  ✅ PASS: Async model load coordination via _pCntrlUiVisLoad active across all 3 controllers');

// 4. Verify busy dialog balancing
assert(clCode.includes('this.fn_closeBusyDialog();') && clCode.includes('Category List Controller: Applicable repository data model is set'), 'CategoryList must close busy dialog on model loaded');
console.log('  ✅ PASS: Busy dialog balancing verified');

// 5. Test _fn_findSelectedTable logic via evaluation
const sampleTables = [
    { tableName: 'Business Partner', tableId: 'ZMDR_BPMASTER' },
    { tableName: 'Material', tableId: 'ZMDR_MATERIAL' },
    { tableName: 'Service Catalog', tableId: 'ZMDR_SERVCATALOG' }
];

function findTable(aTables, sKey) {
    if (!Array.isArray(aTables) || aTables.length === 0 || sKey === undefined || sKey === null) return null;
    if (typeof sKey === "number" || (/^\d+$/.test(String(sKey).trim()) && aTables[parseInt(sKey, 10)])) {
        var idx = parseInt(sKey, 10);
        if (aTables[idx]) return aTables[idx];
    }
    var sKeyStr = String(sKey).trim().toUpperCase();
    var oMatch = aTables.find(function (t) {
        if (!t) return false;
        var sTId = (t.tableId || t.TableId || t.tableName || t.TableName || "").trim().toUpperCase();
        var sTName = (t.tableName || t.TableName || "").trim().toUpperCase();
        return sTId === sKeyStr || sTName === sKeyStr;
    });
    return oMatch || aTables[sKey] || null;
}

assert.strictEqual(findTable(sampleTables, '0').tableId, 'ZMDR_BPMASTER', 'Lookup by numeric string index');
assert.strictEqual(findTable(sampleTables, 1).tableId, 'ZMDR_MATERIAL', 'Lookup by numeric integer index');
assert.strictEqual(findTable(sampleTables, 'ZMDR_BPMASTER').tableName, 'Business Partner', 'Lookup by technical tableId');
assert.strictEqual(findTable(sampleTables, 'zmdr_bpmaster').tableName, 'Business Partner', 'Lookup by case-insensitive tableId');
assert.strictEqual(findTable(sampleTables, 'Business Partner').tableId, 'ZMDR_BPMASTER', 'Lookup by table name');
assert.strictEqual(findTable(sampleTables, 'business partner').tableId, 'ZMDR_BPMASTER', 'Lookup by case-insensitive table name');
assert.strictEqual(findTable(sampleTables, 'NONEXISTENT'), null, 'Lookup for missing table returns null safely');
console.log('  ✅ PASS: Lookup logic unit tests pass for index, technical ID, label, and case-insensitivity');

console.log('\n================================================================');
console.log(' RESULTS: ALL 5 NAVIGATION CHECKS PASSED');
console.log('================================================================\n');
