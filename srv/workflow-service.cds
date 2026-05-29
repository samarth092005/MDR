using zmdr from '../db/mdr-config';

service WorkflowService @(
  path    : '/api/workflow',
  requires: 'authenticated-user'
) {
  @readonly
  entity WFAudit         as projection on zmdr.WFAudit;

  @readonly
  entity MDRWorkflowLink as projection on zmdr.MDRWorkflowLink;

  action cancelWorkflow(bpaInstanceId: String)                      returns {
    message : String
  };

  action claimWorkflowTask(bpaInstanceId: String, taskId: String)   returns {
    message : String
  };

  action putBackWorkflowTask(bpaInstanceId: String, taskId: String) returns {
    message : String
  };
}
