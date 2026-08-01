// db/src/config/mdr-config.cds
namespace zmdr;

// Common aspects to be used in multiple entities
aspect Auditable {
  @cds.on.insert: $now
  CreatedOn             : Timestamp;

  @cds.on.insert: $user
  CreatedBy             : String(50);

  @cds.on.insert: $now   @cds.on.update: $now
  UpdatedOn             : Timestamp;

  @cds.on.insert: $user  @cds.on.update: $user
  UpdatedBy             : String(50);
  virtual OperationType : String(40);
}

aspect Versionable {
  VersionStartDate : Timestamp;
  VersionEndDate   : Timestamp;
  VersionActive    : String(1); // Y=Active N=Inactive G=BulkUpdate I=SingleUpdate F=Future
  WorkflowId       : String(10);
}

// Workflow Tables
// Replaces ZMDR_NR_WF number range object
entity WFSequence {
  key AppName : String(10); // BULK | CENTRAL | ORG
      LastNum : Integer;
      Prefix  : String(4);
}

// Replaces ZMDR_WFAUDIT
entity WFAudit {
  key SequenceId    : String(20);
      WorkflowId    : String(10);
      EntityId      : String(100);
      ActionTime    : Timestamp;
      OperationType : String(40);
      EntityName    : String(40);
      WfStage       : String(20);
      Action        : String(20); // INITIATED | APPROVED | REJECTED | COMPLETED
      UserRemarks   : String(300);
      ActioningUser : String(50);
}

// Replaces ZMDR_MDRABAPWF  (MDR WF ID <-> BPA instance ID)
entity MDRWorkflowLink {
  key MdrWorkflowId : String(10);
  key TableName     : String(30);
      BpaInstanceId : String(100);
}


// Bulk Configuration Tables
// Replaces ZMDR_BULKHDRCNFG
entity BulkHdrConfig : Auditable {
  key TableName              : String(30);
  key RequesterRole          : String(30);
      TableDescription       : String(100);
      ApprClass              : String(60); // 'system,hierarchy,subclass'
      Category               : String(20);
      Versioned              : String(1);
      IsFutureVersionAllowed : String(1);
      IsTableLevelApproval   : String(1);
      IsOverwrireWithNull    : String(1);
      IsWorkflowVisible      : String(1);
      IsUpdateZTableOnly     : String(1);
}

// Replaces ZMDR_BULKITMCNFG
entity BulkItmConfig : Auditable {
  key TableName       : String(30);
  key ColumnName      : String(30); // MUST be UPPERCASE matching .hdbtable column
  key RequesterRole   : String(30);
      ColumnSeqNo     : Integer;
      IsLookup        : String(1);
      LookupTableName : String(30);
      LookupField     : String(100); // 'FIELD1' or 'F1|:|F2' for composite
      IsMatching      : String(1); // Y = key matching field
      IsDateField     : String(1);
      ValidationIndex : String(50); // comma-separated rule indices
}

// Non-versioned in-flight data (replaces ZMDR_BULKTEMP)
entity BulkTemp {
  key BulkNumber     : UUID;
      TableName      : String(30);
      BulkData       : LargeString; // «-delimited row string
      WorkflowId     : String(10);
      ActionType     : String(20); // Create | Amend
      InitiationDate : Timestamp;
      RequestStatus  : String(20); // INPROGRESS | APPROVED | REJECTED
}

// DAD Configuration Tables
// Replaces ZMDR_APPROVERCLS
entity ApproverClass : Auditable {
  key ApproverClassLineId : Integer;
  key VersionStartDate    : Timestamp;
      System              : String(10);
      Hierarchy           : String(30);
      SubClass            : String(30);
      UserOrGroup         : String(12); // ZMDR_USERORGRP
      ClassType           : String(10); // ZMDR_CLASSTYPE
      Status              : String(3); // ZMDR_STATUS
}

// Replaces ZMDR_POLICY
entity Policy : Auditable {
  key PolicyLineId        : Integer;
  key VersionStartDate    : Timestamp;
      ApproverClassLineId : Integer; // ZMDR_APPRCLSLINEID - FK to ApproverClass
      ApprLevel           : Integer;
      ApprConstraint      : String(40);
      SapRole             : String(30); // ZMDR_REQROLE
      Status              : String(3); // ZMDR_STATUS
}

// Replaces ZMDR_APPROVER
entity Approver : Auditable {
  key ApproverLineId            : Integer;
  key VersionStartDate          : Timestamp;
      ApproverClassLineId       : Integer;
      NodeName                  : String(30);
      ApproverId                : String(12);
      ApproverValidityStartDate : Date;
      ApproverValidityEndDate   : Date;
      Ud1                       : String(40);
      Ud2                       : String(40);
      Attestation               : String(1); // ZMDR_ATTESTATION
      Status                    : String(3);
}


// Central Configuration Tables
// Replaces ZMDR_CNTRLUIVIS — Role-based table visibility configuration
entity CntrlUIVis : Auditable {
  key Role            : String(30); // ZMDR_REQROLE
  key TableName       : String(30); // ZMDR_TABLENAME
      Repository      : String(50); // ZMDR_REPOSITORY
      RepositoryLabel : String(50); // ZMDR_REPOSITORYLABEL
      TableLabel      : String(100); // ZMDR_TABLELABEL
      ApprovalType    : String(20); // ZMDR_APPRTYPE
      ApprovalLevel   : String(10); // ZMDR_APPRLEVEL
      IsHierarchy     : String(1); // ZMDR_ISHIERARCHY
      IsCreateEnabled : String(1); // ZMDR_ISCREATE
      IsAmendEnabled  : String(1); // ZMDR_ISAMEND
      IsCloseEnabled  : String(1); // ZMDR_ISCLOSE
      IsReopenEnabled : String(1); // ZMDR_ISREOPEN
}

// Replaces ZMDR_CNTRLUICNFG
entity CntrlUIConfig : Auditable {
  key TableName              : String(30);
  key ColumnName             : String(30);
      ColumnSeqNo            : Integer;
      ColumnDataType         : String(10);
      ColumnLabel            : String(40);
      FieldSize              : Integer;
      SectionId              : String(10);
      SectionName            : String(40);
      SectionSequence        : Integer;
      DefaultValue           : String(100);
      LkpOdata               : String(100);
      LkpFieldsName          : String(100);
      LkpFieldsLabel         : String(100);
      LkpFieldsType          : String(100);
      LkpDataRestField       : String(100);
      LkpDataRestCond        : String(10);
      LkpDataRestValue       : String(100);
      MandatoryFlag          : String(1);
      VisibilityFlag         : String(1);
      EditableFlag           : String(1);
      SearchFieldFlag        : String(1);
      ResultSetFieldFlag     : String(1);
      ItemDetailsFlag        : String(1);
      PrimaryKeyFlag         : String(1);
      ParentFieldFlag        : String(1);
      ChildFieldFlag         : String(1);
      LevelNumberFieldFlag   : String(1); // ZMDR_LVLNUMFLAG
      ChildDescriptionFlag   : String(1); // ZMDR_CHLDDESCFLAG
      LevelApplicabilityFlag : String(1); // ZMDR_LVLAPPLFLAG
      LevelNumberValFld      : String(30); // ZMDR_LVLNUMVALFLD
      DisplayFFieldFlag      : String(1);
      DisplayFieldOf         : String(30);
}

// Replaces ZMDR_CNTRLUIURL
entity CntrlUIUrl : Auditable {
  key TableName   : String(30);
      OdataUrl    : String(200);
      ColumnCount : Integer;
}

// Replaces ZMDR_CNTRLUIVAL
entity CntrlUIVal : Auditable {
  key TableName        : String(30);
  key SourceColName    : String(30);
  key ValidationIndex  : Integer;
      SourceColValue   : String(200);
      DestColName      : String(30);
      DestColValue     : String(100);
      Operation        : String(20);
      ErrorMessage     : String(200);
      ReqInUI5Flag     : String(1); // ZMDR_REQINUI5FLAG
      ReqInCentralFlag : String(1); // ZMDR_REQINCNTRLFLAG
      ReqInBulkFlag    : String(1); // ZMDR_REQINBULKFLAG
      ReqInGenFlag     : String(1); // ZMDR_REQINGENFLAG
}


// Replaces ZMDR_CNTRLUIPRC — Central App UI Process Details
entity CntrlUIProcess : Auditable {
  key ProcessNumber : Integer; // ZMDR_PROCESSNUMBER
      Repository    : String(50); // ZMDR_REPOSITORY
      TableName     : String(30); // ZMDR_TABLENAME
      FieldName     : String(30); // ZMDR_FIELDNAME
      FieldValue    : String(100); // ZMDR_FIELDVALUE
}

// Replaces ZMDR_CNTRLUIASTG
entity CntrlUIApprStage : Auditable {
  key ProcessNumber : String(10);
  key CurrentStage  : String(20);
      NextStage     : String(20);
}

// Common Config Tables
// Approval Status Table
entity ApprovalStatus : Auditable {
  key Code           : String(10);
      Description    : String(50);
}