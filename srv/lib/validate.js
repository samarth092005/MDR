// srv/lib/validate.js  — Replaces ZMDR_FM_VALIDATE_BULK_DATA
'use strict';
const cds = require('@sap/cds');
const { checkExists, buildKeyWhere } = require('./db-dynamic');

// validateKeyExists: check whether a row's keys exist in the target table
// versionInProgress: 'N'=active only  'Y'=in-progress only  'A'=all versions
async function validateKeyExists(params) {
  const { splitData, tableName, isLookup, lookupField, lookupSeq,
    versionInProgress, lineItemConfig, keyFields } = params;
  const db = await cds.connect.to('db');
  const parts = [], values = [];

  if (isLookup === 'Y') {
    // Composite lookup: 'FIELD1|:|FIELD2'
    const fields = lookupField.split('|:|');
    const raws = (splitData[lookupSeq - 1] || '').split('|:|');
    fields.forEach((f, i) => { parts.push(`"${f.toUpperCase()}" = ?`); values.push(raws[i] || ''); });
  } else {
    const { clause, values: kv } = buildKeyWhere(splitData, lineItemConfig, keyFields);
    parts.push(clause); values.push(...kv);
  }

  if (versionInProgress === 'N') { parts.push('"VERSION_ACTIVE" = ?'); values.push('Y'); }
  else if (versionInProgress === 'Y') { parts.push('("VERSION_ACTIVE" = ? OR "VERSION_ACTIVE" = ?)'); values.push('I', 'G'); }
  // 'A' = no version filter

  const whereClause = parts.filter(Boolean).join(' AND ');
  if (!whereClause) return false;
  return checkExists(db, tableName, whereClause, values);
}

// validateRow: full field-level validation for one bulk data row
// Replaces the inner validation loop in ZMDR_FM_PROCESS_BULK_DATA
async function validateRow(params) {
  const { splitData, lineItemConfig, keyFields, tableName } = params;
  const errors = [];
  const db = await cds.connect.to('db');

  for (const cfg of lineItemConfig) {
    const val = splitData[cfg.colSeqNo - 1] ?? '';

    // 1. Lookup validation (ISLOOKUP='Y')
    if (cfg.isLookup === 'Y' && val) {
      const ok = await validateKeyExists({
        splitData, tableName: cfg.lookuptablename, isLookup: 'Y',
        lookupField: cfg.lookupfield, lookupSeq: cfg.colSeqNo,
        versionInProgress: 'N', lineItemConfig, keyFields,
      });
      if (!ok) errors.push(`Invalid value for ${cfg.columnName} (lookup: ${cfg.lookuptablename})`);
    }

    // 2. Date format (ISDATEFIELD='Y')
    if (cfg.isdatefield === 'Y' && val && !/^\d{2}\.\d{2}\.\d{4}$/.test(val))
      errors.push(`Invalid date format for ${cfg.columnName}. Use dd.MM.yyyy`);

    // 3. Validation index rules — REGEX and conditional LOOKUP
    if (cfg.validationindex) {
      const indices = cfg.validationindex.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      for (const idx of indices) {
        const { BulkDataValidation } = db.entities;  // config table — CAP ORM
        const rules = await db.run(SELECT.from(BulkDataValidation).where({ tableName, sourcecolname: cfg.columnName, valindex: idx }));
        for (const rule of rules) {
          if (rule.operation === 'REGEX' && rule.sourcecolvalue) {
            if (!new RegExp(rule.sourcecolvalue).test(val))
              errors.push(`${rule.errormessage} for field ${cfg.columnName}`);
          } else if (rule.operation === 'LOOKUP') {
            let condMet = true;
            if (rule.sourcecolvalue) {
              const [cf, cv] = rule.sourcecolvalue.split('=');
              const cc = lineItemConfig.find(c => c.columnname === cf);
              if (cc) condMet = (splitData[cc.colseqno - 1] ?? '') === cv;
            }
            if (condMet && rule.destcolvalue && rule.destcolname && val) {
              const ok = await checkExists(db, rule.destcolvalue, `"${rule.destcolname.toUpperCase()}" = ?`, [val]);
              if (!ok) errors.push(`${rule.errormessage} for field ${cfg.columnname}`);
            }
          }
        }
      }
    }
  }
  return { valid: errors.length === 0, message: errors.join(', ') };
}

module.exports = { validateKeyExists, validateRow };
