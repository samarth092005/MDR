using zmdr from '../db/mdr-workflow';

service WorkflowService @(
  path    : '/mdrapi/workflow',
  // requires: 'authenticated-user'
) {
  @readonly
  entity WFAudit         as projection on zmdr.WFAudit;

  @readonly
  entity MDRWorkflowLink as projection on zmdr.MDRWorkflowLink;

  @cds.persistence.skip
  entity TriggerWorkflowSet {
    key WorkflowId : String(10);
    EntityName : String(40);
    EntityId : String(100);
    Tablename : String(30);
    OperationType : String(40);
    UserRemarks : String(300);
    WorkflowIdentifier : String(20);
  }

  action cancelWorkflow(bpaInstanceId: String)                      returns {
    message : String
  };

  action claimWorkflowTask(bpaInstanceId: String, taskId: String)   returns {
    message : String
  };

  action putBackWorkflowTask(bpaInstanceId: String, taskId: String) returns {
    message : String
  };

  // ── BPA Webhook Actions (called by BPA Service Tasks) ────────────────
  action sendEmailToRequestor(workflowId: String, requestorEmail: String,
         entityName: String, operationType: String, tablename: String,
         type: String) returns { success: Boolean };

  action sendEmailToApprover(workflowId: String, approverEmail: String,
         entityName: String, operationType: String, currentStage: String,
         userRemarks: String, recordCount: Integer) returns { success: Boolean };

  action sendEscalationEmail(workflowId: String, currentStage: String,
         entityName: String, stepNumber: Integer) returns { success: Boolean };

  action sendReminderEmail(workflowId: String, approverEmail: String,
         entityName: String) returns { success: Boolean };

  action sendReminderEmailRequester(workflowId: String, requestorEmail: String,
         entityName: String) returns { success: Boolean };

  action insertWFAudit(workflowId: String, entityId: String,
         entityName: String, operationType: String, wfStage: String,
         action: String, userRemarks: String, actioningUser: String)
         returns { sequenceid: String; success: Boolean };

  action saveBPALinkage(mdrWorkflowId: String, bpaInstanceId: String,
         tablename: String) returns { success: Boolean };

  action resolveApprovers(tablename: String, currentStage: String,
         processId: String, requesterRole: String, requestorId: String,
         apprClass: String) returns {
           approverEmail: String; approverId: String; nextStage: String;
         };

  action pushInprogressAudit(workflowId: String, currentStage: String,
         approverId: String, tablename: String) returns { success: Boolean };

  action pushApprovedAudit(workflowId: String, currentStage: String,
         approverId: String, approverRemarks: String) returns { success: Boolean };

  action pushRejectedAudit(workflowId: String, currentStage: String,
         approverId: String, approverRemarks: String,
         action: String) returns { success: Boolean };

  action completeWFAudit(workflowId: String, entityId: String,
         entityName: String) returns { success: Boolean };

  action initiatedWFAudit(workflowId: String, entityId: String,
         entityName: String, operationType: String,
         requestorId: String) returns { success: Boolean };

  action syncToS4HANA(workflowId: String, tablename: String,
         entityId: String, operationType: String) returns { success: Boolean };
}
