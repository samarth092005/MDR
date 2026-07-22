// srv/lib/validate.js  — Replaces ZMDR_FM_VALIDATE_BULK_DATA
'use strict';
const cds = require('@sap/cds');
const { checkExists, buildKeyWhere } = require('./db-dynamic');

// validateKeyExists: check whether a row's keys exist in the target table
// versionInProgress: 'N'=active only  'Y'=in-progress only  'A'=all versions
async function validateKeyExists(params) {
  const { splitData, tablename, isLookup, lookupField, lookupSeq,
    versionInProgress, lineitemConfig, keyFields } = params;
  const db = await cds.connect.to('db');
  const parts = [], values = [];

  if (isLookup === 'Y') {
    // Composite lookup: 'FIELD1|:|FIELD2'
    const fields = lookupField.split('|:|');
    const raws = (splitData[lookupSeq - 1] || '').split('|:|');
    fields.forEach((f, i) => { parts.push(`"${f.toUpperCase()}" = ?`); values.push(raws[i] || ''); });
  } else {
    const { clause, values: kv } = buildKeyWhere(splitData, lineitemConfig, keyFields);
    parts.push(clause); values.push(...kv);
  }

  if (versionInProgress === 'N') { parts.push('"VERSION_ACTIVE" = ?'); values.push('Y'); }
  else if (versionInProgress === 'Y') { parts.push('("VERSION_ACTIVE" = ? OR "VERSION_ACTIVE" = ?)'); values.push('I', 'G'); }
  // 'A' = no version filter

  const whereClause = parts.filter(Boolean).join(' AND ');
  if (!whereClause) return false;
  return checkExists(db, tablename, whereClause, values);
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
        // BulkDataValidation columns: Tablename, SourceColName, ValIndex
        const rules = await db.run(
          SELECT.from(BulkDataValidation)
                .where({ Tablename: tablename, SourceColName: cfg.Columnname, ValIndex: idx })
        );
        for (const rule of rules) {
          // rule columns: Operation, SourceColValue, DestColName, DestColValue, ErrorMessage
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
              const ok = await checkExists(db, rule.DestColValue, `"${rule.DestColName.toUpperCase()}" = ?`, [val]);
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
