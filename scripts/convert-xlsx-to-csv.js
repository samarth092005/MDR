#!/usr/bin/env node
/**
 * convert-xlsx-to-csv.js
 * 
 * Converts reference Excel files from Data/ folder into CSV seed files
 * compatible with SAP CAP CDS entities in db/data/.
 * 
 * Usage: node scripts/convert-xlsx-to-csv.js
 * 
 * Prerequisites: npm install xlsx
 */
'use strict';

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DATA_REF_DIR = path.join(PROJECT_ROOT, 'Data');
const DB_DATA_DIR = path.join(PROJECT_ROOT, 'db', 'data');

// Mapping: Excel file name (without .xlsx) → CDS CSV file name + column mapping
const FILE_MAPPINGS = {
  // ── Central Tables ─────────────────────────────────────────────
  'ZMDR_CNTRLUIVIS': {
    csvName: 'zmdr.CntrlUIVis.csv',
    subfolder: 'Central',
    // ABAP column → CDS column (lowercase to match CDS entity)
    columnMap: {
      'ROLE': 'role',
      'TABLENAME': 'tablename',
      'REPOSITORY': 'repository',
      'REPOSITORYLABEL': 'repositorylabel',
      'TABLELABEL': 'tablelabel',
      'APPROVALTYPE': 'approvaltype',
      'APPROVALLEVEL': 'approvallevel',
      'ISHIERARCHY': 'ishierarchy',
      'ISCREATEENABLED': 'iscreateenabled',
      'ISAMENDENABLED': 'isamendenabled',
      'ISCLOSEENABLED': 'iscloseenabled',
      'ISREOPENENABLED': 'isreopenenabled',
    }
  },
  'ZMDR_CNTRLUICNFG': {
    csvName: 'zmdr.CntrlUIConfig.csv',
    subfolder: 'Central',
    delimiter: ';',  // Use semicolons because field values contain commas
    columnMap: {
      'TABLENAME': 'tablename',
      'COLUMNNAME': 'columnname',
      'COLUMNSEQNO': 'columnseqno',
      'COLUMNDATATYPE': 'columndatatype',
      'COLUMNLABEL': 'columnlabel',
      'FIELDSIZE': 'fieldsize',
      'SECTIONID': 'sectionid',
      'SECTIONNAME': 'sectionname',
      'SECTIONSEQUENCE': 'sectionsequence',
      'DEFAULTVALUE': 'defaultvalue',
      'LKPODATA': 'lkpodata',
      'LKPFIELDSNAME': 'lkpfieldsname',
      'LKPFIELDSLABEL': 'lkpfieldslabel',
      'LKPFIELDSTYPE': 'lkpfieldstype',
      'LKPDATARESTFIELD': 'lkpdatarestfield',
      'LKPDATARESTCOND': 'lkpdatarestcond',
      'LKPDATARESTVALUE': 'lkpdatarestvalue',
      'MANDATORYFLAG': 'mandatoryflag',
      'VISIBILITYFLAG': 'visibilityflag',
      'EDITABLEFLAG': 'editableflag',
      'SEARCHFIELDFLAG': 'searchfieldflag',
      'RESULTSETFIELDFLAG': 'resultsetfieldflag',
      'ITEMDETAILSFLAG': 'itemdetailsflag',
      'PRIMARYKEYFLAG': 'primarykeyflag',
      'PARENTFIELDFLAG': 'parentfieldflag',
      'CHILDFIELDFLAG': 'childfieldflag',
      'LEVELNUMBERFIELDFLAG': 'levelnumberfieldflag',
      'CHILDDESCRIPTIONFLAG': 'childdescriptionflag',
      'LEVELAPPLICABILITYFLAG': 'levelapplicabilityflag',
      'LEVELNUMBERVALFLD': 'levelnumbervalfld',
      'DISPLAYFIELDFLAG': 'displayfieldflag',
      'DISPLAYFIELDOF': 'displayfieldof',
    }
  },
  'ZMDR_CNTRLUIVAL': {
    csvName: 'zmdr.CntrlUIVal.csv',
    subfolder: 'Central',
    columnMap: {
      'TABLENAME': 'tablename',
      'SOURCECOLNAME': 'sourcecolname',
      'VALINDEX': 'validationindex',
      'SOURCECOLVALUE': 'sourcecolvalue',
      'DESTCOLNAME': 'destcolname',
      'DESTCOLVALUE': 'destcolvalue',
      'OPERATION': 'operation',
      'ERRORMESSAGE': 'errormessage',
      'REQINUI5FLAG': 'reqinui5flag',
      'REQINCENTRALFLAG': 'reqincentralflag',
      'REQINBULKFLAG': 'reqinbulkflag',
      'REQINGENFLAG': 'reqingenflag',
    }
  },
  'ZMDR_CNTRLUIURL': {
    csvName: 'zmdr.CntrlUIUrl.csv',
    subfolder: 'Central',
    columnMap: {
      'TABLENAME': 'tablename',
      'SERVICEURL': 'serviceurl',
      'COLUMNCOUNT': 'columncount',
    }
  },
  'ZMDR_CNTRLUIPRC': {
    csvName: 'zmdr.CntrlUIProcess.csv',
    subfolder: 'Central',
    columnMap: {
      'PROCESSNUMBER': 'processnumber',
      'REPOSITORY': 'repository',
      'TABLENAME': 'tablename',
      'FIELDNAME': 'fieldname',
      'FIELDVALUE': 'fieldvalue',
    }
  },
  'ZMDR_CNTRLUIASTG': {
    csvName: 'zmdr.CntrlUIApprStage.csv',
    subfolder: 'Central',
    columnMap: {
      'PROCESSNUMBER': 'processnumber',
      'CURRENTSTAGE': 'currentstage',
      'NEXTSTAGE': 'nextstage',
      // stepnumber and totalsteps may not be in Excel — they're computed
    }
  },

  // ── Bulk Tables ─────────────────────────────────────────────
  'ZMDR_BULKHDRCNFG': {
    csvName: 'zmdr.BulkHdrConfig.csv',
    subfolder: 'Bulk',
    columnMap: {
      'TABLENAME': 'TableName',
      'REQUESTERROLE': 'RequesterRole',
      'DESCRIPTION': 'TableDescription',
      'APPRCLASS': 'ApprClass',
      'CATEGORY': 'Category',
      'ISVERSIONED': 'Versioned',
      'ISFUTUREALLOWED': 'IsFutureVersionAllowed',
      'ISTABLELEVAPPR': 'IsTableLevelApproval',
      'ISOVERWRITEWITHNULL': 'IsOverwrireWithNull',
      'ISWORKFLOWIDVISIBLE': 'IsWorkflowVisible',
      'ISUPDATEZTABLEONLY': 'IsUpdateZTableOnly',
      'CREATED_ON': 'created_on',
      'CREATED_BY': 'created_by',
      'UPDATED_ON': 'updated_on',
      'UPDATED_BY': 'updated_by',
    }
  },
  'ZMDR_BULKITMCNFG': {
    csvName: 'zmdr.BulkItmConfig.csv',
    subfolder: 'Bulk',
    columnMap: {
      'TABLENAME': 'Tablename',
      'COLUMNNAME': 'Columnname',
      'REQUESTERROLE': 'RequesterRole',
      'COLSEQNO': 'Colseqno',
      'ISLOOKUP': 'IsLookup',
      'LOOKUPTABLENAME': 'LookupTablename',
      'LOOKUPFIELD': 'LookupField',
      'ISMATCHING': 'IsMatching',
      'ISDATEFIELD': 'IsDateField',
      'VALIDATIONINDEX': 'ValidationIndex',
      'CREATED_ON': 'created_on',
      'CREATED_BY': 'created_by',
      'UPDATED_ON': 'updated_on',
      'UPDATED_BY': 'updated_by',
    }
  },

  // ── DAD Tables ─────────────────────────────────────────────
  'ZMDR_APPROVERCLS': {
    csvName: 'zmdr.ApproverClass.csv',
    subfolder: 'DAD',
    columnMap: {
      'APPROVER_CLASS_LINEID': 'approver_class_lineid',
      'VERSION_START_DATE': 'version_start_date',
      'SYSTEMNAME': 'system',
      'HIERARCHY': 'hierarchy',
      'SUBCLASS': 'subclass',
      'USERORGROUP': 'userorgroup',
      'CLASSTYPE': 'classtype',
      'STATUS': 'status',
      'WORKFLOW_ID': 'workflow_id',
      'VERSION_END_DATE': 'version_end_date',
      'VERSION_ACTIVE': 'version_active',
    }
  },
  'ZMDR_POLICY': {
    csvName: 'zmdr.Policy.csv',
    subfolder: 'DAD',
    columnMap: {
      'POLICY_LINEID': 'policy_lineid',
      'VERSION_START_DATE': 'version_start_date',
      'APPROVER_CLASS_LINEID': 'approver_class_lineid',
      'APPRLEVEL': 'apprlevel',
      'APPRCONSTRAINT': 'apprconstraint',
      'SAP_ROLE': 'sap_role',
      'WORKFLOW_ID': 'workflow_id',
      'STATUS': 'status',
      'VERSION_END_DATE': 'version_end_date',
      'VERSION_ACTIVE': 'version_active',
    }
  },

  // ── Main Tables ─────────────────────────────────────────────
  'ZMDR_BPMASTER': {
    csvName: 'zmdr.ZMDR_BPMASTER.csv',
    subfolder: 'Main Table Data',
    // Pass through all columns with UPPERCASE names
    passthrough: true
  },
  'ZMDR_SERVCATALOG': {
    csvName: 'zmdr.ZMDR_SERVCATALOG.csv',
    subfolder: 'Main Table Data',
    passthrough: true
  },
  'ZMDR_MATERIAL': {
    csvName: 'zmdr.ZMDR_MATERIAL.csv',
    subfolder: 'Main Table Data',
    passthrough: true
  },
};

function escapeCSVField(value, delimiter = ',') {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Quote if contains delimiter, double-quote, or newline
  if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function formatTimestamp(value) {
  if (!value) return '';
  // Excel dates come as JS Date objects via xlsx library
  if (value instanceof Date) {
    return value.toISOString().replace(/\.\d{3}Z$/, 'Z');
  }
  return String(value);
}

function convertFile(abapName, config) {
  const xlsxPath = path.join(DATA_REF_DIR, config.subfolder, `${abapName}.xlsx`);
  
  if (!fs.existsSync(xlsxPath)) {
    console.warn(`  ⚠ SKIP: ${xlsxPath} not found`);
    return false;
  }

  console.log(`  📖 Reading: ${xlsxPath}`);
  const workbook = XLSX.readFile(xlsxPath, { cellDates: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (rows.length === 0) {
    console.warn(`  ⚠ SKIP: ${abapName} has no data rows`);
    return false;
  }

  const delimiter = config.delimiter || ',';
  let csvHeaders, csvRows;

  if (config.passthrough) {
    // Use Excel column names directly (UPPERCASE for main tables)
    const excelHeaders = Object.keys(rows[0]);
    // Filter out MANDT (SAP client field — not used in CAP)
    csvHeaders = excelHeaders.filter(h => h.toUpperCase() !== 'MANDT');
    csvRows = rows.map(row => {
      return csvHeaders.map(h => {
        let val = row[h];
        if (val instanceof Date) val = formatTimestamp(val);
        return escapeCSVField(val, delimiter);
      }).join(delimiter);
    });
  } else {
    // Map ABAP columns to CDS columns
    const columnMap = config.columnMap;
    const excelHeaders = Object.keys(rows[0]);
    
    // Build ordered CDS column list based on what's in the Excel
    const mappedCols = [];
    for (const excelCol of excelHeaders) {
      const upper = excelCol.toUpperCase();
      if (upper === 'MANDT') continue; // Skip SAP client field
      const cdsCol = columnMap[upper] || columnMap[excelCol];
      if (cdsCol) {
        mappedCols.push({ excel: excelCol, cds: cdsCol });
      } else {
        // Column in Excel but not in our map — include with lowercase name
        console.warn(`    ⚠ Unmapped column: ${excelCol} in ${abapName}`);
        mappedCols.push({ excel: excelCol, cds: excelCol.toLowerCase() });
      }
    }

    csvHeaders = mappedCols.map(c => c.cds);
    csvRows = rows.map(row => {
      return mappedCols.map(c => {
        let val = row[c.excel];
        if (val instanceof Date) val = formatTimestamp(val);
        return escapeCSVField(val, delimiter);
      }).join(delimiter);
    });
  }

  // Add audit fields if not present
  const auditFields = ['created_on', 'created_by', 'updated_on', 'updated_by'];
  for (const af of auditFields) {
    if (!csvHeaders.includes(af) && !csvHeaders.includes(af.toUpperCase())) {
      // Don't add audit fields for tables that don't use Auditable aspect
      // Main tables (passthrough) already have them if they exist in Excel
    }
  }

  const csvContent = [csvHeaders.join(delimiter), ...csvRows].join('\n') + '\n';
  const csvPath = path.join(DB_DATA_DIR, config.csvName);

  console.log(`  💾 Writing: ${csvPath} (${rows.length} rows, ${csvHeaders.length} columns)`);
  fs.writeFileSync(csvPath, csvContent, 'utf8');
  return true;
}

// ── Main ─────────────────────────────────────────────────────────
console.log('═══════════════════════════════════════════════════════');
console.log(' MDR Reference Data → CAP CSV Converter');
console.log('═══════════════════════════════════════════════════════');
console.log(`Project Root: ${PROJECT_ROOT}`);
console.log(`Reference Data: ${DATA_REF_DIR}`);
console.log(`Output Dir: ${DB_DATA_DIR}`);
console.log('');

let successCount = 0, skipCount = 0;

for (const [abapName, config] of Object.entries(FILE_MAPPINGS)) {
  console.log(`\n🔄 Processing: ${abapName} → ${config.csvName}`);
  try {
    if (convertFile(abapName, config)) {
      successCount++;
    } else {
      skipCount++;
    }
  } catch (err) {
    console.error(`  ❌ ERROR: ${err.message}`);
    skipCount++;
  }
}

console.log('\n═══════════════════════════════════════════════════════');
console.log(` Done! Converted: ${successCount}, Skipped: ${skipCount}`);
console.log('═══════════════════════════════════════════════════════');
