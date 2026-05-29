// srv/lib/wf-id.js
'use strict';
const cds = require('@sap/cds');
const PREFIXES = { BULK: 'BLK', CENTRAL: 'CTR', ORG: 'ORG' };

async function generateWorkflowId(appname) {
    const key = appname.toUpperCase();
    const prefix = PREFIXES[key];
    if (!prefix) throw new Error(`Unknown appname: ${appname}`);
    const db = await cds.connect.to('db');
    const { WFSequence } = db.entities;  // CAP ORM — config table
    let row = await db.run(SELECT.one.from(WFSequence).where({ appname: key }));
    let nextNum;
    if (!row) {
        await db.run(INSERT.into(WFSequence).entries({ appname: key, lastnum: 1, prefix }));
        nextNum = 1;
    } else {
        nextNum = row.lastnum + 1;
        await db.run(UPDATE(WFSequence).set({ lastnum: nextNum }).where({ appname: key }));
    }
    return `${prefix}${String(nextNum).padStart(7, '0')}`;  // e.g. BLK0000001
}

module.exports = { generateWorkflowId };