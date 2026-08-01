namespace zmdr;

using zmdr.Auditable from './mdr-common';

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