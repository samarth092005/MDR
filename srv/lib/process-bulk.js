// srv/lib/process-bulk.js  — Replaces ZMDR_FM_PROCESS_BULK_DATA
'use strict';
const cds = require('@sap/cds');
const { validateKeyExists, validateRow } = require('./validate');
const { insertVersionedRow, storeBulkTemp } = require('./insert');
const { buildKeyWhere, checkExists } = require('./db-dynamic');
const { generateWorkflowId } = require('./wf-id');

// NOTE on field-name casing:
// SQLite column names follow the CDS element names exactly (PascalCase).
// db.run() returns rows with keys matching the DB column names, so we must
// use the exact casing defined in mdr-config.cds throughout this file.
//
//  zmdr_BulkHdrConfig : TableName, RequesterRole, Versioned
//  zmdr_BulkItmConfig : Tablename, Columnname, RequesterRole, Colseqno,
//                       IsMatching, IsLookup, LookupTablename, LookupField,
//                       IsDateField, ValidationIndex
//  zmdr_BulkTemp      : Tablename, BulkData, WorkflowId, ActionType,
//                       InitiationDate, RequestStatus

async function processBulkData(params) {
    const { tablename, requesterrole, dataload, overwriteWithNull,
        futureVersion, workflowid: inputWfId, rowData, userId } = params;
    const db = await cds.connect.to('db');
    const { BulkHdrConfig, BulkItmConfig } = db.entities;

    // Config reads — use PascalCase element names that match the DB columns
    const hdrConfig = await db.run(
        SELECT.one.from(BulkHdrConfig).where({ TableName: tablename, RequesterRole: requesterrole })
    );
    if (!hdrConfig) throw new Error(`No config for ${tablename}/${requesterrole}`);

    const lineitemConfig = await db.run(
        SELECT.from(BulkItmConfig)
              .where({ Tablename: tablename, RequesterRole: requesterrole })
              .orderBy('Colseqno')
    );
    if (!lineitemConfig.length) throw new Error('No column config found');

    // hdrConfig.Versioned matches the DB column name
    const isVersioned = hdrConfig.Versioned === 'Y';

    // lineitemConfig rows: use PascalCase properties
    let keyFields = lineitemConfig.filter(c => c.IsMatching === 'Y').map(c => c.Columnname);
    if (!keyFields.length) keyFields = [lineitemConfig[0].Columnname];

    const validData = [], invalidData = [], createData = [], updateData = [];

    for (let i = 0; i < rowData.length; i++) {
        const rowStr = rowData[i];
        const splitData = rowStr.split('«');
        const rowCode = splitData[0] || `Row${i + 1}`;

        if (splitData.length !== lineitemConfig.length) {
            invalidData.push({
                code: rowCode,
                message: `Column count ${splitData.length} does not match config ${lineitemConfig.length}`,
                rownumber: i + 1
            });
            continue;
        }

        // Versioned: check no in-progress conflict
        if (isVersioned && futureVersion !== 'Y') {
            const inProg = await validateKeyExists({
                splitData, tablename, isLookup: 'N', versionInProgress: 'Y',
                lineitemConfig, keyFields,
            });
            if (inProg) {
                invalidData.push({ code: rowCode, message: 'In-progress records exist for this key', rownumber: i + 1 });
                continue;
            }
        }

        const { valid, message } = await validateRow({ splitData, lineitemConfig, keyFields, tablename });
        if (!valid) { invalidData.push({ code: rowCode, message, rownumber: i + 1 }); continue; }

        // Determine create vs amend — dynamic raw SQL
        const { clause, values: kv } = buildKeyWhere(splitData, lineitemConfig, keyFields);
        let wh = clause, wv = [...kv];
        if (!isVersioned) { wh += ' AND "VERSION_ACTIVE" = ?'; wv.push('Y'); }
        const exists = await checkExists(db, tablename, wh, wv);
        validData.push({ data: rowStr });
        if (exists) updateData.push({ data: rowStr });
        else createData.push({ data: rowStr });
    }

    if (dataload === 'N') {
        return {
            validCount: validData.length, invalidCount: invalidData.length,
            createCount: createData.length, updateCount: updateData.length,
            workflowid: '', validData, invalidData
        };
    }

    // Submit — generate WF ID and write
    const workflowid = inputWfId || await generateWorkflowId('BULK');
    if (isVersioned) {
        if (await checkExists(db, tablename, '"WORKFLOW_ID" = ?', [workflowid]))
            throw new Error(`Workflow ID ${workflowid} already in use`);
    }

    const version = futureVersion === 'Y' ? 'F' : 'G';
    for (const { data: rowStr } of validData) {
        const sd = rowStr.split('«');
        if (isVersioned) {
            await insertVersionedRow({
                splitData: sd, tablename, version, workflowid,
                lineitemConfig, keyFields, isOverwriteNull: overwriteWithNull, userId
            });
        } else {
            const { clause, values: kv } = buildKeyWhere(sd, lineitemConfig, keyFields);
            const ex = await checkExists(db, tablename, clause, kv);
            await storeBulkTemp({ tablename, rowString: rowStr, workflowid, actiontype: ex ? 'Amend' : 'Create' });
        }
    }

    return {
        validCount: validData.length, invalidCount: invalidData.length,
        createCount: createData.length, updateCount: updateData.length,
        workflowid, validData, invalidData
    };
}

module.exports = { processBulkData };
