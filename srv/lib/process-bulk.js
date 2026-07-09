// srv/lib/process-bulk.js  — Replaces ZMDR_FM_PROCESS_BULK_DATA
'use strict';
const cds = require('@sap/cds');
const { validateKeyExists, validateRow } = require('./validate');
const { insertVersionedRow, storeBulkTemp } = require('./insert');
const { buildKeyWhere, checkExists } = require('./db-dynamic');
const { generateWorkflowId } = require('./wf-id');

async function processBulkData(params) {
    const { tableName, requesterRole, dataload, overwriteWithNull,
        futureVersion, workflowId: inputWfId, rowData, userId } = params;
    const db = await cds.connect.to('db');
    const { BulkHdrConfig, BulkItmConfig } = db.entities;

    // Config reads — CAP ORM (config tables)
    const hdrConfig = await db.run(SELECT.one.from(BulkHdrConfig).where({ tableName, requesterRole }));
    if (!hdrConfig) throw new Error(`No config for ${tableName}/${requesterRole}`);

    const lineItemConfig = await db.run(
        SELECT.from(BulkItmConfig).where({ tableName, requesterRole }).orderBy('colSeqNo')
    );
    if (!lineItemConfig.length) throw new Error('No column config found');

    const isVersioned = hdrConfig.isVersioned === 'Y';
    let keyFields = lineItemConfig.filter(c => c.isMatching === 'Y').map(c => c.columnName);
    if (!keyFields.length) keyFields = [lineItemConfig[0].columnName];

    const validData = [], invalidData = [], createData = [], updateData = [];

    for (let i = 0; i < rowData.length; i++) {
        const rowStr = rowData[i].Data;
        const splitData = rowStr.split('«');
        const rowCode = splitData[0] || `Row${i + 1}`;

        if (splitData.length !== lineItemConfig.length) {
            invalidData.push({
                code: rowCode,
                message: `Column count ${splitData.length} does not match config ${lineItemConfig.length}`,
                rownumber: i + 1
            });
            continue;
        }

        // Versioned: check no in-progress conflict
        // if (isVersioned && futureVersion !== 'Y') {
        //     const inProg = await validateKeyExists({
        //         splitData, tableName, isLookup: 'N', versionInProgress: 'Y',
        //         lineItemConfig, keyFields,
        //     });
        //     if (inProg) {
        //         invalidData.push({ code: rowCode, message: 'In-progress records exist for this key', rownumber: i + 1 });
        //         continue;
        //     }
        // }

        // const { valid, message } = await validateRow({ splitData, lineItemConfig, keyFields, tableName });
        // if (!valid) { invalidData.push({ code: rowCode, message, rowNumber: i + 1 }); continue; }

        // Determine create vs amend — dynamic raw SQL
        const { clause, values: kv } = buildKeyWhere(splitData, lineItemConfig, keyFields);
        let wh = clause, wv = [...kv];
        if (!isVersioned) { wh += ' AND "VERSION_ACTIVE" = ?'; wv.push('Y'); }
        const exists = await checkExists(db, tableName, wh, wv);
        validData.push({ data: rowStr });
        if (exists) updateData.push({ data: rowStr });
        else createData.push({ data: rowStr });
    }

    if (dataload === 'N') {
        return {
            validCount: validData.length, invalidCount: invalidData.length,
            createCount: createData.length, updateCount: updateData.length,
            workflowId: '', validData, invalidData
        };
    }

    // Submit — generate WF ID and write
    const workflowid = inputWfId || await generateWorkflowId('BULK');
    if (isVersioned) {
        if (await checkExists(db, tableName, '"WORKFLOW_ID" = ?', [workflowId]))
            throw new Error(`Workflow ID ${workflowId} already in use`);
    }

    const version = futureVersion === 'Y' ? 'F' : 'G';
    for (const { data: rowStr } of validData) {
        const sd = rowStr.split('«');
        if (isVersioned) {
            await insertVersionedRow({
                splitData: sd, tableName, version, workflowId,
                lineItemConfig, keyFields, isOverwriteNull: overwriteWithNull, userId
            });
        } else {
            const { clause, values: kv } = buildKeyWhere(sd, lineItemConfig, keyFields);
            const ex = await checkExists(db, tableName, clause, kv);
            await storeBulkTemp({ tableName, rowString: rowStr, workflowId, actionType: ex ? 'Amend' : 'Create' });
        }
    }

    return {
        validCount: validData.length, invalidCount: invalidData.length,
        createCount: createData.length, updateCount: updateData.length,
        workflowId, validData, invalidData
    };
}

module.exports = { processBulkData };
