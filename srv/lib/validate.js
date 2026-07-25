// srv/lib/validate.js  — Replaces ZMDR_FM_VALIDATE_BULK_DATA
// Uses CAP ORM (SELECT.from entity) exclusively — no raw SQL for dynamic tables.
// Reason: @cds.persistence.table annotation is HANA-only; SQLite ignores it and
// generates table names from the entity name (e.g. zmdr_ZMDR_BPMASTER).
// CAP's own SELECT.from(entityDef) handles the physical table name correctly
// on both SQLite and HANA, so we never need to know the actual table name.
'use strict';
const cds = require('@sap/cds');
const { getEntityDef } = require('./db-dynamic');

// buildKeyObject: convert split row data + key field config into a CAP WHERE object
// e.g. { BP_ID: 'BP1001' }
function buildKeyObject(splitData, lineitemConfig, keyFields) {
  const where = {};
  for (const kf of keyFields) {
    const cfg = lineitemConfig.find(c => c.Columnname === kf);
    if (cfg) where[kf.toUpperCase()] = splitData[cfg.Colseqno - 1] ?? '';
  }
  return where;
}

// validateKeyExists: check whether a row's keys exist in the target table
// Uses CAP ORM so that physical table name resolution is handled by the framework.
// versionInProgress: 'N'=active only  'Y'=in-progress only  'A'=all versions
async function validateKeyExists(params) {
  const { splitData, tablename, isLookup, lookupField, lookupSeq,
    versionInProgress, lineitemConfig, keyFields } = params;
  const db = await cds.connect.to('db');

  // Build structured WHERE object — CAP ORM does NOT accept raw SQL strings
  // with positional '?' parameters for complex conditions. Use object syntax.
  const where = {};

  if (isLookup === 'Y') {
    // Composite lookup: 'FIELD1|:|FIELD2'
    const fields = lookupField.split('|:|');
    const raws  = (splitData[lookupSeq - 1] || '').split('|:|');
    fields.forEach((f, i) => { where[f.toUpperCase()] = raws[i] || ''; });
  } else {
    Object.assign(where, buildKeyObject(splitData, lineitemConfig, keyFields));
  }

  // Version filter — use CAP ORM supported syntax
  if (versionInProgress === 'N') {
    where['VERSION_ACTIVE'] = 'Y';
  } else if (versionInProgress === 'Y') {
    // CAP ORM: { in: [...] } = IN (...) operator
    where['VERSION_ACTIVE'] = { in: ['I', 'G'] };
  }
  // 'A' = no version filter

  if (!Object.keys(where).length) return false;

  // Resolve entity from CDS model — CAP handles physical table name internally
  const entity = getEntityDef(tablename);
  if (!entity) {
    console.error(`[validateKeyExists] Entity not found in CDS model: ${tablename}`);
    return false;
  }

  try {
    const rows = await db.run(SELECT.from(entity).where(where).limit(1));
    return rows.length > 0;
  } catch (err) {
    console.error(`[validateKeyExists] Query failed for ${tablename}:`, err.message);
    return false;
  }
}

// validateRow: full field-level validation for one bulk data row
// Replaces the inner validation loop in ZMDR_FM_PROCESS_BULK_DATA
// NOTE: lineitemConfig rows use PascalCase column names from zmdr_BulkItmConfig:
//   Colseqno, IsLookup, LookupTablename, LookupField, IsDateField,
//   ValidationIndex, Columnname
async function validateRow(params) {
  const { splitData, lineitemConfig, keyFields, tablename } = params;
  const errors = [];
  const db = await cds.connect.to('db');

  for (const cfg of lineitemConfig) {
    // Colseqno is 1-based
    const val = splitData[cfg.Colseqno - 1] ?? '';

    // 1. Lookup validation (IsLookup='Y')
    if (cfg.IsLookup === 'Y' && val) {
      const ok = await validateKeyExists({
        splitData, tablename: cfg.LookupTablename, isLookup: 'Y',
        lookupField: cfg.LookupField, lookupSeq: cfg.Colseqno,
        versionInProgress: 'N', lineitemConfig, keyFields,
      });
      if (!ok) errors.push(`Invalid value for ${cfg.Columnname} (lookup: ${cfg.LookupTablename})`);
    }

    // 2. Date format (IsDateField='Y')
    if (cfg.IsDateField === 'Y' && val && !/^\d{2}\.\d{2}\.\d{4}$/.test(val))
      errors.push(`Invalid date format for ${cfg.Columnname}. Use dd.MM.yyyy`);

    // 3. Validation index rules — REGEX and conditional LOOKUP
    if (cfg.ValidationIndex) {
      const indices = cfg.ValidationIndex.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      for (const idx of indices) {
        const { BulkDataValidation } = db.entities;  // config table — CAP ORM
        const rules = await db.run(
          SELECT.from(BulkDataValidation)
                .where({ Tablename: tablename, SourceColName: cfg.Columnname, ValIndex: idx })
        );
        for (const rule of rules) {
          if (rule.Operation === 'REGEX' && rule.SourceColValue) {
            if (!new RegExp(rule.SourceColValue).test(val))
              errors.push(`${rule.ErrorMessage} for field ${cfg.Columnname}`);
          } else if (rule.Operation === 'LOOKUP') {
            let condMet = true;
            if (rule.SourceColValue) {
              const [cf, cv] = rule.SourceColValue.split('=');
              const cc = lineitemConfig.find(c => c.Columnname === cf);
              if (cc) condMet = (splitData[cc.Colseqno - 1] ?? '') === cv;
            }
            if (condMet && rule.DestColValue && rule.DestColName && val) {
              const lookupEntity = getEntityDef(rule.DestColValue);
              let ok = false;
              if (lookupEntity) {
                const rows = await db.run(
                  SELECT.from(lookupEntity)
                        .where({ [rule.DestColName.toUpperCase()]: val })
                        .limit(1)
                );
                ok = rows.length > 0;
              }
              if (!ok) errors.push(`${rule.ErrorMessage} for field ${cfg.Columnname}`);
            }
          }
        }
      }
    }
  }
  return { valid: errors.length === 0, message: errors.join(', ') };
}

module.exports = { validateKeyExists, validateRow };
