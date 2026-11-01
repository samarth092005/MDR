// srv/lib/bpa-client.js
// Integrates with SAP Build Process Automation (BPA) workflow REST APIs on BTP.
// In cloud deployment: reads credentials from VCAP_SERVICES (spa-api / destination).
// In local development: falls back to BPA_* environment variables if present.
'use strict';

function getBPAConfig() {
    // 1. Try VCAP_SERVICES (BTP runtime)
    if (process.env.VCAP_SERVICES) {
        try {
            const vcap = typeof process.env.VCAP_SERVICES === 'string'
                ? JSON.parse(process.env.VCAP_SERVICES)
                : process.env.VCAP_SERVICES;
            const spaService = vcap['process-automation-service'] || vcap['spa-api'] || vcap['process-automation'] || vcap['workflow'];
            if (spaService && spaService[0] && spaService[0].credentials) {
                const creds = spaService[0].credentials;
                const endpoints = creds.endpoints || {};
                const apiUrl = endpoints.api_gateway || creds.api_url || creds.url;
                const uaa = creds.uaa || {};
                const tokenUrl = uaa.url ? `${uaa.url}/oauth/token` : creds.token_url;
                const clientId = uaa.clientid || creds.clientid;
                const clientSecret = uaa.clientsecret || creds.clientsecret;
                if (apiUrl && clientId && clientSecret) {
                    return { apiUrl: apiUrl.replace(/\/$/, ''), tokenUrl, clientId, clientSecret };
                }
            }
        } catch (e) {
            console.warn('[BPA] Failed to parse VCAP_SERVICES:', e.message);
        }
    }

    // 2. Try explicit environment variables (local test with service key)
    const apiUrl = process.env.BPA_API_URL || process.env.SPA_API_URL;
    const tokenUrl = process.env.BPA_TOKEN_URL || process.env.SPA_TOKEN_URL;
    const clientId = process.env.BPA_CLIENT_ID || process.env.SPA_CLIENT_ID;
    const clientSecret = process.env.BPA_CLIENT_SECRET || process.env.SPA_CLIENT_SECRET;

    if (apiUrl && clientId && clientSecret) {
        return {
            apiUrl: apiUrl.replace(/\/$/, ''),
            tokenUrl: tokenUrl || `${apiUrl}/oauth/token`,
            clientId,
            clientSecret,
        };
    }

    return null;
}

async function getBPAToken(cfg) {
    const r = await fetch(`${cfg.tokenUrl}?grant_type=client_credentials`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(
                `${cfg.clientId}:${cfg.clientSecret}`
            ).toString('base64'),
        },
    });
    const d = await r.json();
    if (!d.access_token) throw new Error(`BPA token fetch failed: ${JSON.stringify(d)}`);
    return d.access_token;
}

// Replaces ZCL_MDR_BULKWF.TRIGGER_WORKFLOW (raises SUBMIT event)
async function startBPAWorkflow(processDefinitionId, context) {
    const cfg = getBPAConfig();
    if (!cfg || !cfg.apiUrl || !cfg.clientId) {
        const mockId = 'BPA-WF-' + Date.now();
        console.log(`[BPA Mock] Workflow started locally for ${processDefinitionId} -> ID: ${mockId}`);
        return mockId;
    }
    try {
        const token = await getBPAToken(cfg);
        const r = await fetch(`${cfg.apiUrl}/workflow/rest/v1/workflow-instances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ definitionId: processDefinitionId, context }),
        });
        if (!r.ok) {
            const errText = await r.text();
            console.warn(`[BPA] Live start failed: ${r.status} ${errText}. Using mock fallback.`);
            return 'BPA-WF-' + Date.now();
        }
        return (await r.json()).id;
    } catch (err) {
        console.warn(`[BPA] Live workflow start exception: ${err.message}. Using mock fallback.`);
        return 'BPA-WF-' + Date.now();
    }
}

// Replaces SAP_WAPI_WORKITEM_COMPLETE + SAP_WAPI_RESERVE_WORKITEM
async function completeBPATask(taskId, decision, approverremarks) {
    if (!taskId || String(taskId).startsWith('MOCK-') || String(taskId).startsWith('BPA-WF-')) {
        console.log(`[BPA Mock] Simulated task completion for ${taskId}: ${decision}`);
        return;
    }
    const cfg = getBPAConfig();
    if (!cfg) {
        console.log(`[BPA Mock] No BPA configured, completed task ${taskId} locally`);
        return;
    }
    try {
        const token = await getBPAToken(cfg);
        await fetch(`${cfg.apiUrl}/workflow/rest/v1/task-instances/${taskId}/claims`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        });
        const r = await fetch(`${cfg.apiUrl}/workflow/rest/v1/task-instances/${taskId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status: 'COMPLETED', context: { decision, approverremarks } }),
        });
        if (!r.ok) {
            console.warn(`[BPA] Task ${taskId} completion returned status: ${r.status}`);
        }
    } catch (err) {
        console.warn(`[BPA] completeBPATask exception: ${err.message}`);
    }
}

// Replaces SAP_WAPI_ADM_WORKFLOW_CANCEL
async function cancelBPAWorkflow(instanceId) {
    if (!instanceId || String(instanceId).startsWith('MOCK-') || String(instanceId).startsWith('BPA-WF-')) {
        console.log(`[BPA Mock] Simulated workflow cancel for ${instanceId}`);
        return;
    }
    const cfg = getBPAConfig();
    if (!cfg) return;
    try {
        const token = await getBPAToken(cfg);
        await fetch(`${cfg.apiUrl}/workflow/rest/v1/workflow-instances/${instanceId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ status: 'CANCELED' }),
        });
    } catch (err) {
        console.warn(`[BPA] cancelBPAWorkflow exception: ${err.message}`);
    }
}

const startBulkApprovalWorkflow = ctx => startBPAWorkflow('eu30.sap-btp-ais-d0a7p7v8.mdrprocessautomation.mdrbulkapproval', ctx);
const startCentralApprovalWorkflow = ctx => startBPAWorkflow('eu30.sap-btp-ais-d0a7p7v8.mdrprocessautomation.mdrcentralapproval', ctx);


async function getBPATask(taskId) {
    if (!taskId || String(taskId).startsWith('MOCK-') || String(taskId).startsWith('BPA-WF-')) return null;
    const cfg = getBPAConfig();
    if (!cfg) return null;
    try {
        const token = await getBPAToken(cfg);
        const r = await fetch(`${cfg.apiUrl}/workflow/rest/v1/task-instances/${taskId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (r.ok) return await r.json();
    } catch (_) {}
    return null;
}

async function getBPATaskContext(taskId) {
    if (!taskId || String(taskId).startsWith('MOCK-') || String(taskId).startsWith('BPA-WF-')) return null;
    const cfg = getBPAConfig();
    if (!cfg) return null;
    try {
        const token = await getBPAToken(cfg);
        const r = await fetch(`${cfg.apiUrl}/workflow/rest/v1/task-instances/${taskId}/context`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (r.ok) return await r.json();
    } catch (_) {}
    return null;
}

module.exports = {
    getBPATask, getBPATaskContext,
    startBulkApprovalWorkflow, startCentralApprovalWorkflow,
    completeBPATask, cancelBPAWorkflow,
    getBPAConfig, getBPAToken
};
