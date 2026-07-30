using zmdr from '../db/mdr-config';
using { zmdr as masterdata } from '../db/mdr-master-data';

@impl: 'srv/central-handler.js'
service CentralService @(
  path    : '/api/central',
  // requires: 'authenticated-user'
) {
  @readonly
  entity CntrlUIConfig as projection on zmdr.CntrlUIConfig;
  entity CntrlUIUrl    as projection on zmdr.CntrlUIUrl;

  @readonly
  entity UIConfigSet as projection on zmdr.CntrlUIConfig;

  // Master Data Tables for the UI
  entity ZMDR_GLACCOUNT as projection on masterdata.ZMDR_GLACCOUNT;
  entity ZMDR_EMPLOYEES as projection on masterdata.ZMDR_EMPLOYEES;
  entity ZMDR_VENDORS   as projection on masterdata.ZMDR_VENDORS;
  entity ZMDR_BPMASTER  as projection on masterdata.ZMDR_BPMASTER;

  // Custom Validation OData Mock
  @readonly
  entity ZMDGCPCNTRLVAL01 {
    key p_tabname : String(30);
    Set : Association to many ZMDGCPCNTRLVAL01Set on Set.p_tabname = $self.p_tabname;
  }
  @readonly
  entity ZMDGCPCNTRLVAL01Set {
    key p_tabname : String(30);
  }

  // Central Application Actions (Required for BPA Action Plugin)
  action validateCentralData(tablename: String, rowData: String) returns { message: String; type: String };
  action submitCentralData(tablename: String, rowData: String, operation: String) returns { workflowid: String; message: String; type: String };
  action triggerCentralWorkflow(workflowid: String, tablename: String) returns { bpaInstanceId: String; message: String };
  action getCentralRequestData(tablename: String, workflowid: String) returns { data: String; message: String; type: String };
  // @requires: 'any'
  action takeActionCentral(workflowid: String, action: String, remarks: String, bpaInstanceId: String) returns { message: String; type: String };
}