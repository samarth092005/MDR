// db/src/config/mdr-config.cds
namespace zmdr;

aspect Auditable {
  created_on : Timestamp;  
  created_by : String(12);
  updated_on : Timestamp;  
  updated_by : String(12);
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
      actioninguser : String(12);
}

// Replaces ZMDR_MDRABAPWF  (MDR WF ID <-> BPA instance ID)
entity MDRWorkflowLink {
  key mdr_workflow_id : String(10);
  key tablename       : String(30);
      bpa_instance_id : String(100);
}

// Replaces ZMDR_BULKHDRCNFG
entity BulkHdrConfig : Auditable {
  key TableName           : String(30);
  key RequesterRole       : String(30);
      TableDescription    : String(100);
      apprclass           : String(60);  // 'system,hierarchy,subclass'
      Category            : String(20);
      isversioned         : String(1);
      isfutureallowed     : String(1);
      istablelevappr      : String(1);
      isoverwritewithnull : String(1);
      isworkflowidvisible : String(1);
      isupdateztableonly  : String(1);
}

// Replaces ZMDR_BULKITMCNFG
entity BulkItmConfig : Auditable {
  key tablename       : String(30);
  key columnname      : String(30);  // MUST be UPPERCASE matching .hdbtable column
  key requesterrole   : String(30);
      colseqno        : Integer;
      islookup        : String(1);
      lookuptablename : String(30);
      lookupfield     : String(100);  // 'FIELD1' or 'F1|:|F2' for composite
      ismatching      : String(1);    // Y = key matching field
      isdatefield     : String(1);
      validationindex : String(50);   // comma-separated rule indices
}

// Non-versioned in-flight data (replaces ZMDR_BULKTEMP)
entity BulkTemp {
  key bulknumber     : UUID;
      tablename      : String(30);
      bulkdata       : LargeString;  // «-delimited row string
      workflowid     : String(10);
      actiontype     : String(20);   // Create | Amend
      initiationdate : Timestamp;
      requeststatus  : String(20);   // INPROGRESS | APPROVED | REJECTED
}

// Validation rules (replaces ZMDXCNBLKDTVAL01)
entity BulkDataValidation : Auditable {
  key tablename      : String(30);
  key sourcecolname  : String(30);
  key valindex       : Integer;
      operation      : String(20);   // REGEX | LOOKUP
      sourcecolvalue : String(200);
      destcolname    : String(30);
      destcolvalue   : String(100);
      errormessage   : String(200);
}

// Replaces ZMDR_APPROVERCLS
entity ApproverClass : Versionable, Auditable {
  key approver_class_lineid : Integer;
  key version_start_date    : Timestamp;
      system     : String(10);
      hierarchy  : String(30);
      subclass   : String(30);
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
      status : String(3);
}

// Replaces ZMDR_POLICY
entity Policy : Versionable, Auditable {
  key policy_lineid      : Integer;
  key version_start_date : Timestamp;
      system : String(10);  hierarchy : String(30);  subclass : String(30);
      apprtype : String(10);  apprlevel : Integer;
      moreapprover : String(1);  nextstage : String(20);  apprconstraint : String(40);
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
      displayfieldflag : String(1);  displayfieldof : String(30);
}

// Replaces ZMDR_CNTRLUIURL
entity CntrlUIUrl : Auditable {
  key repository : String(20);  key tablename : String(30);
      tablelabel : String(40);  processid : String(10);
      ishierarchy : String(1);  iscreate : String(1);
      isamend : String(1);  isclose : String(1);  isreopen : String(1);
}

// Replaces ZMDR_CNTRLUIASTG
entity CntrlUIApprStage : Auditable {
  key processnumber : String(10);  key currentstage : String(20);
      nextstage : String(20);  stepnumber : Integer;  totalsteps : Integer;
}

// Replaces ZMDR_CNTRLUIVAL
entity CntrlUIVal : Auditable {
  key validationindex : Integer;  key tablename : String(30);  key sourcecolname : String(30);
      operation : String(20);  sourcecolvalue : String(200);
      destcolname : String(30);  destcolvalue : String(100);  errormessage : String(200);
}

// Replaces ABAP domain fixed values (ZMDR_YESNO, ZMDR_VERSION etc.)
entity DomainValues {
  key domainname : String(30);  key value : String(20);
      label : String(60);  sortorder : Integer;
}