using zmdr from '../db/mdr-config';

service WorkflowService @(
  path    : '/api/workflow',
  requires: 'authenticated-user'
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
}
