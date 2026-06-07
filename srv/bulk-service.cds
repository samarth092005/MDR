using zmdr from '../db/mdr-config';

service BulkService @(
  path    : '/api/bulk',
  requires: 'authenticated-user'
) {

  // Config tables via CAP ORM
  @readonly
  entity BulkHdrConfig   as projection on zmdr.BulkHdrConfig;

  @readonly
  entity BulkItmConfig   as projection on zmdr.BulkItmConfig;

  entity BulkTemp        as projection on zmdr.BulkTemp;

  // Actions — dynamic tables handled inside handlers via raw parameterised SQL

  // Replaces: ZMDR_FM_PROCESS_BULK_DATA with IM_DATALOAD = N
  action validateBulkData(tablename: String,
                          requesterrole: String,
                          rowData: array of String,
                          overwriteWithNull: String,
                          futureVersion: String,
                          workflowid: String)       returns {
    validCount   : Integer;
    invalidCount : Integer;
    createCount  : Integer;
    updateCount  : Integer;
    workflowid   : String;
    validData    : array of {
      data : String
    };
    invalidData  : array of {
      code      : String;
      message   : String;
      rownumber : Integer
    };
  };

  // Replaces: ZMDR_FM_PROCESS_BULK_DATA with IM_DATALOAD = Y
  action submitBulkData(tablename: String,
                        requesterrole: String,
                        validData: array of {
    data       : String
  },
                        overwriteWithNull: String,
                        futureVersion: String,
                        workflowid: String,
                        remarks: String)            returns {
    workflowid : String;
    message    : String;
    type       : String
  };

  // Replaces: ZCL_MDR_BULKWF.TRIGGER_WORKFLOW
  action triggerBulkWorkflow(workflowid: String,
                             tablename: String,
                             entityname: String,
                             requestorid: String,
                             requestoremail: String,
                             operationtype: String,
                             approverstage: String,
                             apprclass: String,
                             validrecordcount: Integer,
                             requesterrole: String) returns {
    bpaInstanceId : String;
    message       : String
  };

  // Replaces: ZCL_MDR_BULK_PROCESS.GET_BULK_REQUEST_DATA
  action getBulkRequestData(tablename: String,
                            workflowid: String,
                            versionactive: String,
                            wfstage: String,
                            action: String,
                            uniquewf: String,
                            requesterrole: String)  returns {
    data    : array of {
      data : String
    };
    olddata : array of {
      data : String
    };
    wfids   : array of {
      workflowid : String;
      remarks    : String
    };
    message : String;
    type    : String;
  };

  // Replaces: ZCL_MDR_BULK_PROCESS.TAKE_ACTION_REQUEST
  action takeActionBulk(tablename: String,
                        workflowid: String,
                        wfstage: String,
                        action: String,
                        version: String,
                        requesterrole: String,
                        bpaInstanceId: String,
                        approverremarks: String,
                        isOverwriteNull: String)    returns {
    message : String;
    type    : String
  };

  // Replaces: ZCL_MDR_WF_UTILITIES.INSERT_WF_AUDIT
  action insertWFAudit(audit: {
    workflowid    : String;
    entityid      : String;
    entityname    : String;
    operationtype : String;
    wfstage       : String;
    action        : String;
    userremarks   : String;
    actioninguser : String;
  })                                                returns {
    sequenceid    : String;
    message       : String
  };

  action generateWorkflowId(appname: String)        returns {
    workflowid : String
  };

  action getApprovers(appidentifier: String,
                      system: String,
                      subclass: String,
                      hierarchy: String,
                      requesterid: String,
                      processid: String,
                      tablename: String,
                      saprole: String)              returns {
    approvers : array of {
      approverid    : String;
      approveremail : String;
      approvername  : String
    };
    nextstage : String;
    agent     : String;
  };
}
