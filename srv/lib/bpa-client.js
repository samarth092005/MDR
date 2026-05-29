// srv/lib/bpa-client.js
'use strict';

async function getBPAToken() {
    const r = await fetch(`${process.env.BPA_TOKEN_URL}?grant_type=client_credentials`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + Buffer.from(
                `${process.env.BPA_CLIENT_ID}:${process.env.BPA_CLIENT_SECRET}`
            ).toString('base64'),
        },
    });
    const d = await r.json();
    if (!d.access_token) throw new Error('BPA token fetch failed');
    return d.access_token;
}

// Replaces ZCL_MDR_BULKWF.TRIGGER_WORKFLOW (raises SUBMIT event)
async function startBPAWorkflow(processDefinitionId, context) {
    const token = await getBPAToken();
    const r = await fetch(`${process.env.BPA_API_URL}/workflow/rest/v1/workflow-instances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ definitionId: processDefinitionId, context }),
    });
    if (!r.ok) throw new Error(`BPA start failed: ${r.status} ${await r.text()}`);
    return (await r.json()).id;
}

// Replaces SAP_WAPI_WORKITEM_COMPLETE + SAP_WAPI_RESERVE_WORKITEM
async function completeBPATask(taskId, decision, approverremarks) {
    const token = await getBPAToken();
    await fetch(`${process.env.BPA_API_URL}/workflow/rest/v1/task-instances/${taskId}/claims`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    });
    const r = await fetch(`${process.env.BPA_API_URL}/workflow/rest/v1/task-instances/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'COMPLETED', context: { decision, approverremarks } }),
    });
    if (!r.ok) throw new Error(`BPA complete failed: ${r.status}`);
}

// Replaces SAP_WAPI_ADM_WORKFLOW_CANCEL
async function cancelBPAWorkflow(instanceId) {
    const token = await getBPAToken();
    await fetch(`${process.env.BPA_API_URL}/workflow/rest/v1/workflow-instances/${instanceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ status: 'CANCELED' }),
    });
}

const startBulkApprovalWorkflow = ctx => startBPAWorkflow('mdr-bulk-approval', ctx);
const startCentralApprovalWorkflow = ctx => startBPAWorkflow('mdr-central-approval', ctx);

module.exports = {
    startBulkApprovalWorkflow, startCentralApprovalWorkflow,
    completeBPATask, cancelBPAWorkflow
};
