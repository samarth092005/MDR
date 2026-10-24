// srv/lib/bpa-client.js
'use strict';

function getBPAConfig() {
    // 1. Direct environment variables (set via cf set-env or default-env.json)
    if (process.env.BPA_API_URL && process.env.BPA_CLIENT_ID) {
        return {
            apiUrl: process.env.BPA_API_URL.replace(/\/$/, ''),
            tokenUrl: process.env.BPA_TOKEN_URL ? process.env.BPA_TOKEN_URL.replace(/\/$/, '') : `${process.env.BPA_API_URL}/oauth/token`,
            clientId: process.env.BPA_CLIENT_ID,
            clientSecret: process.env.BPA_CLIENT_SECRET,
        };
    }

    // 2. Auto-detect from BTP VCAP_SERVICES service bindings (spa / workflow)
    if (process.env.VCAP_SERVICES) {
        try {
            const vcap = typeof process.env.VCAP_SERVICES === 'string' ? JSON.parse(process.env.VCAP_SERVICES) : process.env.VCAP_SERVICES;
            const spaService = (vcap['spa'] || vcap['workflow'] || vcap['process-automation'] || [])[0];
            if (spaService && spaService.credentials) {
                const creds = spaService.credentials;
                const endpoints = creds.endpoints || {};
                const uaa = creds.uaa || {};
                return {
                    apiUrl: (endpoints.api_url || creds.apiurl || creds.url || '').replace(/\/$/, ''),
                    tokenUrl: (uaa.url ? `${uaa.url.replace(/\/$/, '')}/oauth/token` : creds.url),
                    clientId: uaa.clientid || creds.clientid,
                    clientSecret: uaa.clientsecret || creds.clientsecret,
                };
            }
        } catch (e) {
            console.warn('[BPA] Error parsing VCAP_SERVICES:', e.message);
        }
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
        throw new Error('BPA service credentials not configured (set BPA_API_URL / BPA_CLIENT_ID or bind BPA service)');
    }
    const token = await getBPAToken(cfg);
    const r = await fetch(`${cfg.apiUrl}/workflow/rest/v1/workflow-instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ definitionId: processDefinitionId, context }),
    });
    if (!r.ok) throw new Error(`BPA start failed: ${r.status} ${await r.text()}`);
    return (await r.json()).id;
}

// Replaces SAP_WAPI_WORKITEM_COMPLETE + SAP_WAPI_RESERVE_WORKITEM
async function completeBPATask(taskId, decision, approverremarks) {
    const cfg = getBPAConfig();
    if (!cfg) throw new Error('BPA service credentials not configured');
    const token = await getBPAToken(cfg);
    await fetch(`${cfg.apiUrl}/workflow/rest/v1/task-instances/${taskId}/claims`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    const r = await fetch(`${cfg.apiUrl}/workflow/rest/v1/task-instances/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'COMPLETED', context: { decision, approverremarks } }),
    });
    if (!r.ok) throw new Error(`BPA complete failed: ${r.status}`);
}

// Replaces SAP_WAPI_ADM_WORKFLOW_CANCEL
async function cancelBPAWorkflow(instanceId) {
    const cfg = getBPAConfig();
    if (!cfg) throw new Error('BPA service credentials not configured');
    const token = await getBPAToken(cfg);
    await fetch(`${cfg.apiUrl}/workflow/rest/v1/workflow-instances/${instanceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'CANCELED' }),
    });
}

const startBulkApprovalWorkflow = ctx => startBPAWorkflow('eu30.sap-btp-ais-d0a7p7v8.mdrprocessautomation.mdrbulkapproval', ctx);
const startCentralApprovalWorkflow = ctx => startBPAWorkflow('eu30.sap-btp-ais-d0a7p7v8.mdrprocessautomation.mdrcentralapproval', ctx);

module.exports = {
    startBulkApprovalWorkflow, startCentralApprovalWorkflow,
    completeBPATask, cancelBPAWorkflow
};
