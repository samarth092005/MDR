const http = require('http');
const express = require('express');
const cds = require('@sap/cds');
const path = require('path');

async function testPersistenceAcrossRestart() {
  console.log('--- Step 1: Bootstrapping server with gateway-local-fixture ---');
  const app = express();
  app.use(express.json());
  
  // Register gateway fixture middleware
  const { registerGatewayMiddleware } = require('../srv/lib/gateway-local-fixture');
  registerGatewayMiddleware(app);

  const server = http.createServer(app);
  await new Promise(r => server.listen(0, r));
  const port = server.address().port;

  const testMatNum = 'TEST_DURABLE_' + Date.now();
  console.log('--- Step 2: Creating new MaterialSet record:', testMatNum);

  const postData = JSON.stringify({
    MATERIALNUM: testMatNum,
    MATERIALDESC: 'Durable Test Material',
    MATERIALTYPE: 'FERT',
    MATERIALGROUP: 'MG01'
  });

  const postRes = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV/MaterialSet',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  console.log('POST Response status:', postRes.status);
  const createdRecord = JSON.parse(postRes.body);
  console.log('Created record:', createdRecord);

  console.log('--- Step 3: Shutting down server ---');
  await new Promise(r => server.close(r));

  console.log('--- Step 4: Connecting directly to SQLite db to verify durability on disk ---');
  const db = await cds.connect.to({ kind: 'sqlite', credentials: { url: path.join(__dirname, '../db.sqlite') } });
  const rows = await db.run(`SELECT MATERIALNUM, MATERIALDESC, STATUS, WORKFLOW_ID FROM zmdr_ZMDR_MATERIAL WHERE MATERIALNUM = '${testMatNum}'`);
  console.log('Queried SQLite directly for newly created record:', rows);

  if (rows && rows.length > 0 && rows[0].MATERIALNUM === testMatNum) {
    console.log('✅ SUCCESS: Record is durably persisted in SQLite on disk!');
  } else {
    console.error('❌ FAILURE: Record was not found in SQLite on disk!');
    process.exit(1);
  }
}

testPersistenceAcrossRestart().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
