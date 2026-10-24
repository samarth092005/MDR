// srv/lib/wf-id.js
'use strict';
const cds = require('@sap/cds');
const PREFIXES = { BULK: 'BLK', CENTRAL: 'CTR', ORG: 'ORG' };

async function generateWorkflowId(appname) {
    const key = (appname || 'CENTRAL').toUpperCase();
    const prefix = PREFIXES[key] || 'CTR';
    
    try {
        const db = await cds.connect.to('db');
        const entities = (cds.entities && cds.entities('zmdr')) || cds.entities || db.entities;
        const WFSequence = entities?.WFSequence || entities?.['zmdr.WFSequence'];
        
        if (!WFSequence) {
            console.warn('[wf-id] WFSequence entity not found, using timestamp ID');
            return `${prefix}${Date.now().toString().slice(-7)}`;
        }

        let row = await db.run(
            SELECT.one.from(WFSequence).where({ AppName: key })
        ).catch(() => null);

        let nextNum = 1;
        if (!row) {
            await db.run(INSERT.into(WFSequence).entries({
                AppName: key,
                LastNum: 1,
                Prefix: prefix
            })).catch(err => console.warn('[wf-id] INSERT WFSequence warning:', err.message));
        } else {
            const currentNum = row.LastNum || row.LASTNUM || row.lastnum || 0;
            nextNum = currentNum + 1;
            await db.run(
                UPDATE(WFSequence)
                    .set({ LastNum: nextNum })
                    .where({ AppName: key })
            ).catch(err => console.warn('[wf-id] UPDATE WFSequence warning:', err.message));
        }
        return `${prefix}${String(nextNum).padStart(7, '0')}`;
    } catch (err) {
        console.error('[wf-id] Fallback generating ID due to error:', err);
        return `${prefix}${Date.now().toString().slice(-7)}`;
    }
}

module.exports = { generateWorkflowId };