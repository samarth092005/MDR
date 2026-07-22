// srv/workflow-service.js
'use strict';
const cds = require('@sap/cds');

module.exports = cds.service.impl(async function (srv) {

    srv.on('CREATE', 'TriggerWorkflowSet', async (req) => {
        console.log(`[Workflow Handler] CREATE triggered for TriggerWorkflowSet`);
        console.log("Payload:", JSON.stringify(req.data, null, 2));

        // Generate a dummy workflow ID if not provided
        const workflowId = req.data.WorkflowId || ("WF" + Math.floor(Math.random() * 10000));
        
        // Return the payload simulating a successful workflow trigger
        return {
            WorkflowId: workflowId,
            EntityName: req.data.EntityName,
            EntityId: req.data.EntityId,
            Tablename: req.data.Tablename,
            OperationType: req.data.OperationType,
            UserRemarks: req.data.UserRemarks,
            WorkflowIdentifier: req.data.WorkflowIdentifier
        };
    });

});
