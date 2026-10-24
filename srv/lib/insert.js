// srv/lib/insert.js
// Replaces: ZMDR_FM_INSERT_BULK_DATA + ZCL_MDR_BULK_PROCESS.TAKE_ACTION_REQUEST (approval)
'use strict';
const cds = require('@sap/cds');
const { buildRowFromSplit, buildKeyWhere,
  checkExists, readRows, insertRow, updateRow, deleteRows } = require('./db-dynamic');

// insertVersionedRow: insert one row into a versioned dynamic table
// version = 'G' for in-progress staging, 'F' for future
// Replaces ZMDR_FM_INSERT_BULK_DATA with IM_ISINSERT='Y' + IM_ISWORKFLOW='Y'
async function insertVersionedRow(params) {
  const { splitData, tablename, version, workflowid,
    lineitemConfig, keyFields, isOverwriteNull, userId } = params;
  const db = await cds.connect.to('db');
  const now = new Date().toISOString();

  const row = buildRowFromSplit(splitData, lineitemConfig, {
    VERSION_START_DATE: now,
    VERSION_END_DATE: '9999-12-31T23:59:59.999Z',
    VERSION_ACTIVE: version,
    WORKFLOW_ID: workflowid,
    CREATED_ON: now, CREATED_BY: userId, UPDATED_ON: now, UPDATED_BY: userId,
  });
  // isOverwriteNull='N': fill blank fields from current active record
  // Replaces ABAP im_isoverwritenull='N' block
  if (isOverwriteNull === 'N') {
    const { clause, values } = buildKeyWhere(splitData, lineitemConfig, keyFields);
    const active = await readRows(db, tablename, `${clause} AND "VERSION_ACTIVE" = ?`, [...values, 'Y']);
    if (active.length > 0) {
      for (const cfg of lineitemConfig) {
        const key = cfg.Columnname.toUpperCase();
        if (row[key] === null || row[key] === '') row[key] = active[0][key] ?? null;
      }
    }
  }
  await insertRow(db, tablename, row);
}

function getEntity(name) {
  const zEntities = cds.entities ? cds.entities('zmdr') : null;
  return (zEntities && zEntities[name]) || (cds.entities && cds.entities[name]) || (cds.entities && cds.entities[`zmdr.${name}`]);
}

// storeBulkTemp: for non-versioned tables, store row in BulkTemp holding area
// Replaces ABAP INSERT INTO ZMDR_BULKTEMP in ZMDR_FM_PROCESS_BULK_DATA
async function storeBulkTemp(params) {
  const { tablename, rowString, workflowid, actiontype } = params;
  const db = await cds.connect.to('db');
  const BulkTemp = getEntity('BulkTemp') || db.entities?.BulkTemp;
  if (BulkTemp) {
    await db.run(INSERT.into(BulkTemp).entries({
      Tablename: tablename, tablename,
      BulkData: rowString, bulkdata: rowString,
      WorkflowId: workflowid, workflowid,
      ActionType: actiontype, actiontype,
      InitiationDate: new Date().toISOString(), initiationdate: new Date().toISOString(),
      RequestStatus: 'INPROGRESS', requeststatus: 'INPROGRESS',
    }));
  }
}

// applyBulkTempApproved: on APPROVE of non-versioned table, apply BulkTemp to real table
// Replaces ZCL_MDR_BULK_PROCESS.TAKE_ACTION_REQUEST for non-versioned APPROVED
async function applyBulkTempApproved(params) {
  const { tablename, workflowid, lineitemConfig, keyFields, isOverwriteNull, userId } = params;
  const db = await cds.connect.to('db');
  const BulkTemp = getEntity('BulkTemp') || db.entities?.BulkTemp;
  const now = new Date().toISOString();

  const tempRows = BulkTemp ? await db.run(  // CAP ORM — BulkTemp is config table
    SELECT.from(BulkTemp).where(`(WorkflowId = '${workflowid}' or workflowid = '${workflowid}') and (Tablename = '${tablename}' or tablename = '${tablename}') and (RequestStatus = 'INPROGRESS' or requeststatus = 'INPROGRESS')`)
  ) : [];
  for (const tr of tempRows) {
    const splitData = tr.BulkData.split('«');
    const { clause, values: kv } = buildKeyWhere(splitData, lineitemConfig, keyFields);
    const existing = await readRows(db, tablename, clause, kv);  // dynamic raw SQL
    const rowToWrite = buildRowFromSplit(splitData, lineitemConfig, { UPDATED_ON: now, UPDATED_BY: userId });

    if (existing.length > 0) {
      if (isOverwriteNull === 'N') {
        for (const cfg of lineitemConfig) {
          const k = cfg.Columnname.toUpperCase();
          if (rowToWrite[k] === null || rowToWrite[k] === '') rowToWrite[k] = existing[0][k] ?? null;
        }
      }
      const setObj = { ...rowToWrite };
      keyFields.forEach(kf => delete setObj[kf.toUpperCase()]);
      await updateRow(db, tablename, setObj, clause, kv);  // dynamic raw SQL
    } else {
      rowToWrite.CREATED_ON = now; rowToWrite.CREATED_BY = userId;
      await insertRow(db, tablename, rowToWrite);  // dynamic raw SQL
    }
  }
  // Mark APPROVED — CAP ORM
  await db.run(UPDATE(BulkTemp).set({ RequestStatus: 'APPROVED' }).where({ WorkflowId: workflowid, Tablename: tablename }));
}

// approveVersionedTable: on APPROVE of versioned table, promote G->Y and deactivate old Y
// Replaces ZCL_MDR_BULK_PROCESS.TAKE_ACTION_REQUEST for versioned APPROVED
async function approveVersionedTable(params) {
  const { tablename, workflowid, keyFields, lineitemConfig, userId } = params;
  const db = await cds.connect.to('db');
  const now = new Date().toISOString();

  const gRows = await readRows(db, tablename, '"WORKFLOW_ID" = ? AND "VERSION_ACTIVE" = ?', [workflowid, 'G']);
  for (const gRow of gRows) {
    const kp = [], kv = [];
    keyFields.forEach(kf => { kp.push(`"${kf.toUpperCase()}" = ?`); kv.push(gRow[kf.toUpperCase()]); });
    const keyWhere = kp.join(' AND ');
    // Step 1: deactivate existing Y record
    const yWhere = `${keyWhere} AND "VERSION_ACTIVE" = ?`;
    if (await checkExists(db, tablename, yWhere, [...kv, 'Y']))
      await updateRow(db, tablename, { VERSION_ACTIVE: 'N', VERSION_END_DATE: now, UPDATED_ON: now, UPDATED_BY: userId }, yWhere, [...kv, 'Y']);
    // Step 2: promote G to Y
    await updateRow(db, tablename, { VERSION_ACTIVE: 'Y', UPDATED_ON: now, UPDATED_BY: userId },
      `${keyWhere} AND "VERSION_ACTIVE" = ? AND "WORKFLOW_ID" = ?`, [...kv, 'G', workflowid]);
  }
}

// rejectVersionedTable: on REJECT, delete G-version rows (as if never submitted)
// Replaces ABAP DELETE FROM (im_tablename) WHERE workflow_id=... AND version_active='G'
async function rejectVersionedTable(params) {
  const { tablename, workflowid } = params;
  const db = await cds.connect.to('db');
  await deleteRows(db, tablename, '"WORKFLOW_ID" = ? AND "VERSION_ACTIVE" = ?', [workflowid, 'G']);
}

module.exports = {
  insertVersionedRow, storeBulkTemp,
  applyBulkTempApproved, approveVersionedTable, rejectVersionedTable
};
