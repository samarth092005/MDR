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
function buildRowFromSplit(splitData, lineitemConfig, extraFields = {}) {
  const row = {};
  for (const cfg of lineitemConfig) {
    const raw = splitData[cfg.Colseqno - 1] ?? '';
    const val = cfg.IsDateField === 'Y' ? parseDate(raw) : raw;
    row[cfg.Columnname.toUpperCase()] = val || null;
  }
  for (const [k, v] of Object.entries(extraFields)) {
    row[k.toUpperCase()] = v;
  }
  return row;
}

// buildKeyWhere: parameterised WHERE clause from key fields
// Replaces ABAP out_cust_where string building loop
// Returns: { clause: 'COL1 = ? AND COL2 = ?', values: ['v1','v2'] }
// NOTE: uses unquoted column names so the clause works with both
//       CAP ORM SELECT.from().where(rawStr, ...vals) and raw SQL.
function buildKeyWhere(splitData, lineitemConfig, keyFields) {
  const parts = [], values = [];
  for (const kf of keyFields) {
    const cfg = lineitemConfig.find(c => c.Columnname === kf);
    if (!cfg) continue;
    parts.push(`${kf.toUpperCase()} = ?`);
    values.push(splitData[cfg.Colseqno - 1] ?? '');
  }
  return { clause: parts.join(' AND '), values };
}

// getEntityDef: resolve a CDS entity definition by short name.
// Works even when the entity is in the zmdr namespace or any other namespace.
// This is preferred over db.entities which can be unreliable across CAP versions.
function getEntityDef(tablename) {
  const defs = (cds.model && cds.model.definitions) || {};
  // Try: exact name, zmdr prefix, then any entity whose short name matches
  return defs[tablename]
    || defs[`zmdr.${tablename}`]
    || Object.values(defs).find(
         d => d && d.kind === 'entity' && d.name && d.name.split('.').pop() === tablename
       );
}

// getSqlTableName: resolve the physical SQL table name for raw DDL/DML.
function getSqlTableName(db, tablename) {
  const entity = getEntityDef(tablename);
  if (entity) {
    const persistenceTable = entity['@cds.persistence.table'];
    if (persistenceTable && typeof persistenceTable === 'string') {
      return persistenceTable;
    }
    // CAP HDI generator by default replaces dots in namespace with underscores
    const name = entity.name.replace(/\./g, '_');
    return db.kind === 'hana' ? name.toUpperCase() : name;
  }
  return tablename;
}

// checkExists: returns true if at least one row matches the WHERE clause.
async function checkExists(db, tablename, whereClause, values) {
  const entity = getEntityDef(tablename);
  if (entity) {
    try {
      const whereObj = sqlToObject(entity, whereClause, values);
      const rows = await db.run(
        SELECT.from(entity).where(whereObj).limit(1)
      );
      return rows.length > 0;
    } catch (e) {
      console.warn(`[checkExists] ORM path failed for ${tablename}, trying raw SQL:`, e.message);
    }
  }
  // Raw SQL fallback (HANA, or entity not in CDS model)
  const sqlTablename = getSqlTableName(db, tablename);
  const sql = `SELECT COUNT(*) AS CNT FROM "${sqlTablename}" WHERE ${whereClause}`;
  const r = await db.run(sql, values);
  return (r[0]?.CNT || r[0]?.cnt || 0) > 0;
}

// Convert an object with uppercase keys into the exact keys defined in the CDS entity
function mapToEntityElements(entity, obj) {
  if (!entity || !entity.elements) return obj;
  const mapped = {};
  for (const [k, v] of Object.entries(obj)) {
    const elName = Object.keys(entity.elements).find(e => e.toUpperCase() === k.toUpperCase());
    mapped[elName || k] = v;
  }
  return mapped;
}

// Convert simple parameterised WHERE clause to an object for CAP ORM
function sqlToObject(entity, whereClause, values) {
  const obj = {};
  const regex = /"?([a-zA-Z0-9_]+)"?\s*=\s*\?/g;
  let match;
  let i = 0;
  while ((match = regex.exec(whereClause)) !== null) {
    if (i < values.length) {
      obj[match[1]] = values[i++];
    }
  }
  return mapToEntityElements(entity, obj);
}

// readRows: SELECT * FROM <tablename> WHERE <parameterised>
// Replaces ABAP: SELECT * FROM (im_tablename) WHERE (out_cust_where)
async function readRows(db, tablename, whereClause, values) {
  const entity = getEntityDef(tablename);
  if (entity) {
    try {
      const whereObj = sqlToObject(entity, whereClause, values);
      return await db.run(SELECT.from(entity).where(whereObj));
    } catch (e) {
      console.warn(`[readRows] ORM failed for ${tablename}, fallback to raw:`, e.message);
    }
  }
  const sqlTablename = getSqlTableName(db, tablename);
  return db.run(`SELECT * FROM "${sqlTablename}" WHERE ${whereClause}`, values);
}

// insertRow: parameterised INSERT INTO <tablename>
// Replaces ABAP: INSERT INTO (im_tablename) VALUES <struct>
async function insertRow(db, tablename, rowObject) {
  const entity = getEntityDef(tablename);
  if (entity) {
    try {
      const mappedRow = mapToEntityElements(entity, rowObject);
      await db.run(INSERT.into(entity).entries(mappedRow));
      return;
    } catch (e) {
      console.warn(`[insertRow] ORM failed for ${tablename}, fallback to raw:`, e.message);
    }
  }
  const sqlTablename = getSqlTableName(db, tablename);
  const cols = Object.keys(rowObject).filter(k => rowObject[k] !== undefined);
  const vals = cols.map(k => rowObject[k]);
  const ph = cols.map(() => '?').join(', ');
  const cl = cols.map(c => `"${c}"`).join(', ');
  await db.run(`INSERT INTO "${sqlTablename}" (${cl}) VALUES (${ph})`, vals);
}

// updateRow: parameterised UPDATE <tablename> SET ... WHERE ...
// Replaces ABAP: UPDATE (im_tablename) FROM <struct>
async function updateRow(db, tablename, setObject, whereClause, whereValues) {
  const entity = getEntityDef(tablename);
  if (entity) {
    try {
      const mappedSet = mapToEntityElements(entity, setObject);
      const whereObj = sqlToObject(entity, whereClause, whereValues);
      await db.run(UPDATE(entity).set(mappedSet).where(whereObj));
      return;
    } catch (e) {
      console.warn(`[updateRow] ORM failed for ${tablename}, fallback to raw:`, e.message);
    }
  }
  const sqlTablename = getSqlTableName(db, tablename);
  const setCols = Object.keys(setObject).filter(k => setObject[k] !== undefined);
  const setVals = setCols.map(k => setObject[k]);
  const setClause = setCols.map(c => `"${c}" = ?`).join(', ');
  await db.run(`UPDATE "${sqlTablename}" SET ${setClause} WHERE ${whereClause}`,
    [...setVals, ...whereValues]);
}

// deleteRows: parameterised DELETE FROM <tablename> WHERE ...
// Replaces ABAP: DELETE FROM (im_tablename) WHERE (condition)
async function deleteRows(db, tablename, whereClause, values) {
  const entity = getEntityDef(tablename);
  if (entity) {
    try {
      const whereObj = sqlToObject(entity, whereClause, values);
      await db.run(DELETE.from(entity).where(whereObj));
      return;
    } catch (e) {
      console.warn(`[deleteRows] ORM failed for ${tablename}, fallback to raw:`, e.message);
    }
  }
  const sqlTablename = getSqlTableName(db, tablename);
  await db.run(`DELETE FROM "${sqlTablename}" WHERE ${whereClause}`, values);
}

module.exports = {
  parseDate, buildRowFromSplit, buildKeyWhere, getEntityDef,
  checkExists, readRows, insertRow, updateRow, deleteRows, mapToEntityElements
};