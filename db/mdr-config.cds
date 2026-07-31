// db/src/config/mdr-config.cds
namespace zmdr;

aspect Auditable {
  created_on : Timestamp;  
  created_by : String(50);
  updated_on : Timestamp;  
  updated_by : String(50);
  virtual OPERATIONTYPE : String(40);
}

aspect Versionable {
  version_start_date : Timestamp;
  version_end_date   : Timestamp;
  version_active     : String(1);  // Y=Active N=Inactive G=BulkUpdate I=SingleUpdate F=Future
  workflow_id        : String(10);
}

// Replaces ZMDR_NR_WF number range object
entity WFSequence {
  key appname : String(10);  // BULK | CENTRAL | ORG
      lastnum : Integer;
      prefix  : String(4);
}

// Replaces ZMDR_WFAUDIT
entity WFAudit {
  key sequenceid    : String(20);
      workflowid    : String(10);
      entityid      : String(100);
      actiontime    : Timestamp;
      operationtype : String(40);
      entityname    : String(40);
      wfstage       : String(20);
      action        : String(20);  // INITIATED | APPROVED | REJECTED | COMPLETED
      userremarks   : String(300);
      actioninguser : String(50);
}

// Replaces ZMDR_MDRABAPWF  (MDR WF ID <-> BPA instance ID)
entity MDRWorkflowLink {
  key mdr_workflow_id : String(10);
  key tablename       : String(30);
      bpa_instance_id : String(100);
}

// Replaces ZMDR_BULKHDRCNFG
entity BulkHdrConfig : Auditable {
  key TableName               : String(30);
  key RequesterRole           : String(30);
      TableDescription        : String(100);
      ApprClass               : String(60);  // 'system,hierarchy,subclass'
      Category                : String(20);
      Versioned               : String(1);
      IsFutureVersionAllowed  : String(1);
      IsTableLevelApproval    : String(1);
      IsOverwrireWithNull     : String(1);
      IsWorkflowVisible       : String(1);
      IsUpdateZTableOnly      : String(1);
}

// Replaces ZMDR_BULKITMCNFG
entity BulkItmConfig : Auditable {
  key Tablename       : String(30);
  key columnname      : String(30);  // MUST be UPPERCASE matching .hdbtable column
  key RequesterRole   : String(30);
      columnseqno     : Integer;
      IsLookup        : String(1);
      LookupTablename : String(30);
      LookupField     : String(100);  // 'FIELD1' or 'F1|:|F2' for composite
      IsMatching      : String(1);    // Y = key matching field
      IsDateField     : String(1);
      ValidationIndex : String(50);   // comma-separated rule indices
}

// Non-versioned in-flight data (replaces ZMDR_BULKTEMP)
entity BulkTemp {
  key BulkNumber     : UUID;
      Tablename      : String(30);
      BulkData       : LargeString;  // «-delimited row string
      WorkflowId     : String(10);
      ActionType     : String(20);   // Create | Amend
      InitiationDate : Timestamp;
      RequestStatus  : String(20);   // INPROGRESS | APPROVED | REJECTED
}

// Validation rules (replaces ZMDXCNBLKDTVAL01)
entity BulkDataValidation : Auditable {
  key Tablename      : String(30);
  key SourceColName  : String(30);
  key ValIndex       : Integer;
      Operation      : String(20);   // REGEX | LOOKUP
      SourceColValue : String(200);
      DestColName    : String(30);
      DestColValue   : String(100);
      ErrorMessage   : String(200);
}

// Replaces ZMDR_APPROVERCLS
entity ApproverClass : Versionable, Auditable {
  key approver_class_lineid : Integer;
  key version_start_date    : Timestamp;
      system      : String(10);
      hierarchy   : String(30);
      subclass    : String(30);
      userorgroup : String(12);   // ZMDR_USERORGRP
      classtype   : String(10);   // ZMDR_CLASSTYPE
      status      : String(3);    // ZMDR_STATUS
}

// Replaces ZMDR_APPROVER
entity Approver : Versionable, Auditable {
  key approver_lineid              : Integer;
  key version_start_date           : Timestamp;
      approver_class_lineid        : Integer;
      node_name                    : String(30);
      approver_id                  : String(12);
      approver_validity_start_date : Date;
      approver_validity_end_date   : Date;
      ud1 : String(40);  ud2 : String(40);
      attestation : String(1);     // ZMDR_ATTESTATION
      status : String(3);
}

// Replaces ZMDR_POLICY
entity Policy : Versionable, Auditable {
  key policy_lineid      : Integer;
  key version_start_date : Timestamp;
      approver_class_lineid : Integer;  // ZMDR_APPRCLSLINEID - FK to ApproverClass
      apprlevel : Integer;
      apprconstraint : String(40);
      sap_role : String(30);   // ZMDR_REQROLE
      status : String(3);      // ZMDR_STATUS
}

// Replaces ZMDR_CNTRLUICNFG
entity CntrlUIConfig : Auditable {
  key tablename   : String(30);
  key columnname  : String(30);
      columnseqno : Integer;  columndatatype : String(10);  columnlabel : String(40);
      fieldsize : Integer;  sectionid : String(10);  sectionname : String(40);
      sectionsequence : Integer;  defaultvalue : String(100);
      lkpodata : String(100);  lkpfieldsname : String(100);
      lkpfieldslabel : String(100);  lkpfieldstype : String(100);
      lkpdatarestfield : String(100);  lkpdatarestcond : String(10);
      lkpdatarestvalue : String(100);
      mandatoryflag : String(1);  visibilityflag : String(1);  editableflag : String(1);
      searchfieldflag : String(1);  resultsetfieldflag : String(1);
      itemdetailsflag : String(1);  primarykeyflag : String(1);
      parentfieldflag : String(1);  childfieldflag : String(1);
      levelnumberfieldflag    : String(1);   // ZMDR_LVLNUMFLAG
      childdescriptionflag   : String(1);   // ZMDR_CHLDDESCFLAG
      levelapplicabilityflag : String(1);    // ZMDR_LVLAPPLFLAG
      levelnumbervalfld      : String(30);   // ZMDR_LVLNUMVALFLD
      displayfieldflag : String(1);  displayfieldof : String(30);
}

// Replaces ZMDR_CNTRLUIURL
entity CntrlUIUrl : Auditable {
  key tablename : String(30);
      odata_url : String(200);
      column_count : Integer;
}

// Replaces ZMDR_CNTRLUIASTG
entity CntrlUIApprStage : Auditable {
  key processnumber : String(10);  key currentstage : String(20);
      nextstage : String(20);
}

// Replaces ZMDR_CNTRLUIVAL
entity CntrlUIVal : Auditable {
  key validationindex : Integer;  key tablename : String(30);  key sourcecolname : String(30);
      operation : String(20);  sourcecolvalue : String(200);
      destcolname : String(30);  destcolvalue : String(100);  errormessage : String(200);
      reqinui5flag     : String(1);  // ZMDR_REQINUI5FLAG
      reqincentralflag : String(1);  // ZMDR_REQINCNTRLFLAG
      reqinbulkflag    : String(1);  // ZMDR_REQINBULKFLAG
      reqingenflag     : String(1);  // ZMDR_REQINGENFLAG
}

// Replaces ZMDR_CNTRLUIVIS — Role-based table visibility configuration
entity CntrlUIVis : Auditable {
  key role              : String(30);   // ZMDR_REQROLE
  key tablename         : String(30);   // ZMDR_TABLENAME
      repository        : String(50);   // ZMDR_REPOSITORY
      repositorylabel   : String(50);   // ZMDR_REPOSITORYLABEL
      tablelabel        : String(100);  // ZMDR_TABLELABEL
      approvaltype      : String(20);   // ZMDR_APPRTYPE
      approvallevel     : String(10);   // ZMDR_APPRLEVEL
      ishierarchy       : String(1);    // ZMDR_ISHIERARCHY
      iscreateenabled   : String(1);    // ZMDR_ISCREATE
      isamendenabled    : String(1);    // ZMDR_ISAMEND
      iscloseenabled    : String(1);    // ZMDR_ISCLOSE
      isreopenenabled   : String(1);    // ZMDR_ISREOPEN
}

// Replaces ZMDR_CNTRLUIPRC — Central App UI Process Details
entity CntrlUIProcess : Auditable {
  key processnumber : Integer;        // ZMDR_PROCESSNUMBER
      repository    : String(50);     // ZMDR_REPOSITORY
      tablename     : String(30);     // ZMDR_TABLENAME
      fieldname     : String(30);     // ZMDR_FIELDNAME
      fieldvalue    : String(100);    // ZMDR_FIELDVALUE
}

// Replaces ABAP domain fixed values (ZMDR_YESNO, ZMDR_VERSION etc.)
entity DomainValues {
  key domainname : String(30);  key value : String(20);
      label : String(60);  sortorder : Integer;
}