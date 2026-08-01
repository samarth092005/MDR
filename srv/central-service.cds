using zmdr from '../db/mdr-central';


@impl: 'srv/central-handler.js'
service CentralService @(
  path    : '/mdrapi/central',
  // requires: 'authenticated-user'
) {
  @readonly
  entity CntrlUIVis  as projection on zmdr.CntrlUIVis;
  @readonly
  entity CntrlUIConfig as projection on zmdr.CntrlUIConfig;
  @readonly
  entity CntrlUIUrl as projection on zmdr.CntrlUIUrl;
  
  @readonly
  entity CntrlUIProcess as projection on zmdr.CntrlUIProcess;
  
  @readonly
  entity CntrlUIApprStage as projection on zmdr.CntrlUIApprStage;

  // // Custom Validation OData Mock
  // @readonly
  // entity ZMDGCPCNTRLVAL01 {
  //   key p_tabname : String(30);
  //   Set : Association to many ZMDGCPCNTRLVAL01Set on Set.p_tabname = $self.p_tabname;
  // }
  // @readonly
  // entity ZMDGCPCNTRLVAL01Set {
  //   key p_tabname : String(30);
  // }

  // Central Application Actions
  // Requestor Actions
  action validateCentralData(tablename: String, rowData: String) returns { message: String; type: String };
  action submitCentralData(tablename: String, rowData: String, operation: String) returns { workflowid: String; message: String; type: String };
  action triggerCentralWorkflow(workflowid: String, tablename: String) returns { bpaInstanceId: String; message: String };

  // Approver Actions
  action getCentralRequestData(tablename: String, workflowid: String) returns { data: String; message: String; type: String };
  // @requires: 'any'
  action takeActionCentral(workflowid: String, action: String, remarks: String, bpaInstanceId: String) returns { message: String; type: String };
}