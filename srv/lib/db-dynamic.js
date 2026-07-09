// srv/lib/db-dynamic.js
// Replaces: ZMDR_FM_INSERT_BULK_DATA, ZMDR_FM_VALIDATE_BULK_DATA,
//           ZCL_MDR_BULK_PROCESS dynamic table operations
//
// RULE: This file ONLY touches DYNAMIC tables (tablename is a runtime param).
//       Config tables always go through CAP ORM in other files.
'use strict';
const cds = require('@sap/cds');

// parseDate: dd.MM.yyyy -> yyyy-MM-dd for HANA DATE columns
// Replaces ABAP CONVERT_DATE_TO_INTERN_FORMAT
function parseDate(val) {
  if (!val || typeof val !== 'string') return null;
  const m = val.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return val;
}

// buildRowFromSplit: builds { COLUMNNAME: value } from «-split data + BulkItmConfig
// Replaces ABAP: DO gv_count TIMES + ASSIGN COMPONENT columnname OF STRUCTURE
// Keys are UPPERCASE to match hdbtable column names
function buildRowFromSplit(splitData, lineItemConfig, extraFields = {}) {
  const row = {};
  for (const cfg of lineItemConfig) {
    const raw = splitData[cfg.colSeqNo - 1] ?? '';
    const val = cfg.isDateField === 'Y' ? parseDate(raw) : raw;
    row[cfg.columnName.toUpperCase()] = val || null;
  }
  for (const [k, v] of Object.entries(extraFields)) {
    row[k.toUpperCase()] = v;
  }
  return row;
}

// buildKeyWhere: parameterised WHERE clause from key fields
// Replaces ABAP out_cust_where string building loop
// Returns: { clause: '"COL1" = ? AND "COL2" = ?', values: ['v1','v2'] }
function buildKeyWhere(splitData, lineItemConfig, keyFields) {
  const parts = [], values = [];
  for (const kf of keyFields) {
    const cfg = lineItemConfig.find(c => c.columnName === kf);
    if (!cfg) continue;
    parts.push(`"${kf.toUpperCase()}" = ?`);
    values.push(splitData[cfg.colSeqNo - 1] ?? '');
  }
  return { clause: parts.join(' AND '), values };
}

// checkExists: SELECT COUNT(*) FROM <tablename> WHERE <parameterised>
// Replaces ABAP: SELECT COUNT(*) FROM (im_tablename) WHERE (out_cust_where)
async function checkExists(db, tableName, whereClause, values) {
  const tableWithNamespace = "zmdr." + tableName;
  const sql = `SELECT COUNT(*) AS CNT FROM ${tableWithNamespace} WHERE ${whereClause}`;
  const r = await db.run(sql, values);
  return (r[0]?.CNT || r[0]?.cnt || 0) > 0;
}

// readRows: SELECT * FROM <tablename> WHERE <parameterised>
// Replaces ABAP: SELECT * FROM (im_tablename) WHERE (out_cust_where)
async function readRows(db, tableName, whereClause, values) {
  return db.run(`SELECT * FROM "${tableName}" WHERE ${whereClause}`, values);
}

// insertRow: parameterised INSERT INTO <tablename>
// Replaces ABAP: INSERT INTO (im_tablename) VALUES <struct>
async function insertRow(db, tableName, rowObject) {
  const cols = Object.keys(rowObject).filter(k => rowObject[k] !== undefined);
  const vals = cols.map(k => rowObject[k]);
  const ph = cols.map(() => '?').join(', ');
  const cl = cols.map(c => `"${c}"`).join(', ');
  await db.run(`INSERT INTO "${tableName}" (${cl}) VALUES (${ph})`, vals);
}

// updateRow: parameterised UPDATE <tablename> SET ... WHERE ...
// Replaces ABAP: UPDATE (im_tablename) FROM <struct>
async function updateRow(db, tableName, setObject, whereClause, whereValues) {
  const setCols = Object.keys(setObject).filter(k => setObject[k] !== undefined);
  const setVals = setCols.map(k => setObject[k]);
  const setClause = setCols.map(c => `"${c}" = ?`).join(', ');
  await db.run(`UPDATE "${tableName}" SET ${setClause} WHERE ${whereClause}`,
    [...setVals, ...whereValues]);
}

// deleteRows: parameterised DELETE FROM <tablename> WHERE ...
// Replaces ABAP: DELETE FROM (im_tablename) WHERE (condition)
async function deleteRows(db, tableName, whereClause, values) {
  await db.run(`DELETE FROM "${tableName}" WHERE ${whereClause}`, values);
}

module.exports = {
  parseDate, buildRowFromSplit, buildKeyWhere,
  checkExists, readRows, insertRow, updateRow, deleteRows
};