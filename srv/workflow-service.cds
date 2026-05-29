using com.mdr as mdr from '../db/mdr-config';

service WorkflowService @(
  path    : '/api/workflow',
  requires: 'authenticated-user'
) {
  @readonly
  entity WFAudit         as projection on mdr.WFAudit;

  @readonly
  entity MDRWorkflowLink as projection on mdr.MDRWorkflowLink;

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
