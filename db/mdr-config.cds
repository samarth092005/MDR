// db/src/config/mdr-config.cds
namespace zmdr;

aspect Auditable {
  createdOn : Timestamp;
  createdBy : String(12);
  updatedOn : Timestamp;
  updatedBy : String(12);
}

aspect Versionable {
  versionEndDate : Timestamp;
  versionActive  : String(1); // Y=Active N=Inactive G=BulkUpdate I=SingleUpdate F=Future
  status         : String(3); // 510=Approved, 590=Closed, 520=Under Review
  workflowId     : String(10);
}

// Replaces ZMDR_NR_WF number range object
entity WFSequence {
  key appname : String(10); // BULK | CENTRAL | ORG
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
      action        : String(20); // INITIATED | APPROVED | REJECTED | COMPLETED
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
  key tableName              : String(30);
  key requesterRole          : String(30);
      tableDescription       : String(100);
      apprClass              : String(60); // 'system,hierarchy,subclass'
      category               : String(20);
      isVersioned            : String(1);
      isFutureVersionAllowed : String(1);
      isTableLevelApproval   : String(1);
      isOverwrireWithNull    : String(1);
      isWorkflowVisible      : String(1);
      isUpdateZTableOnly     : String(1);
}

// Replaces ZMDR_BULKITMCNFG
entity BulkItmConfig : Auditable {
  key tableName       : String(30);
  key columnName      : String(30); // MUST be UPPERCASE matching .hdbtable column
  key requesterRole   : String(30);
      colSeqNo        : Integer;
      isLookup        : String(1);
      lookupTablename : String(30);
      lookupField     : String(100); // 'FIELD1' or 'F1|:|F2' for composite
      isMatching      : String(1); // Y = key matching field
      isDateField     : String(1);
      validationIndex : String(50); // comma-separated rule indices
}

// Non-versioned in-flight data (replaces ZMDR_BULKTEMP)
entity BulkTemp {
  key bulkNumber     : UUID;
      tableName      : String(30);
      bulkData       : LargeString; // «-delimited row string
      workflowId     : String(10);
      actionType     : String(20); // Create | Amend
      initiationDate : Timestamp;
      requestStatus  : String(20); // INPROGRESS | APPROVED | REJECTED
}

// Validation rules (replaces ZMDXCNBLKDTVAL01)
entity BulkDataValidation : Auditable {
  key Tablename      : String(30);
  key SourceColName  : String(30);
  key ValIndex       : Integer;
      Operation      : String(20); // REGEX | LOOKUP
      SourceColValue : String(200);
      DestColName    : String(30);
      DestColValue   : String(100);
      ErrorMessage   : String(200);
}

// Replaces ZMDR_APPROVERCLS
entity ApproverClass : Versionable, Auditable {
  key approver_class_lineid : Integer;
  key version_start_date    : Timestamp;
      system                : String(10);
      hierarchy             : String(30);
      subclass              : String(30);
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
      ud1                          : String(40);
      ud2                          : String(40);
      status                       : String(3);
}

// Replaces ZMDR_POLICY
entity Policy : Versionable, Auditable {
  key policy_lineid      : Integer;
  key version_start_date : Timestamp;
      system             : String(10);
      hierarchy          : String(30);
      subclass           : String(30);
      apprtype           : String(10);
      apprlevel          : Integer;
      moreapprover       : String(1);
      nextstage          : String(20);
      apprconstraint     : String(40);
}

// Replaces ZMDR_CNTRLUICNFG
entity CntrlUIConfig : Auditable {
  key tablename          : String(30);
  key columnname         : String(30);
      columnseqno        : Integer;
      columndatatype     : String(10);
      columnlabel        : String(40);
      fieldsize          : Integer;
      sectionid          : String(10);
      sectionname        : String(40);
      sectionsequence    : Integer;
      defaultvalue       : String(100);
      lkpodata           : String(100);
      lkpfieldsname      : String(100);
      lkpfieldslabel     : String(100);
      lkpfieldstype      : String(100);
      lkpdatarestfield   : String(100);
      lkpdatarestcond    : String(10);
      lkpdatarestvalue   : String(100);
      mandatoryflag      : String(1);
      visibilityflag     : String(1);
      editableflag       : String(1);
      searchfieldflag    : String(1);
      resultsetfieldflag : String(1);
      itemdetailsflag    : String(1);
      primarykeyflag     : String(1);
      parentfieldflag    : String(1);
      childfieldflag     : String(1);
      displayfieldflag   : String(1);
      displayfieldof     : String(30);
}

// Replaces ZMDR_CNTRLUIURL
entity CntrlUIUrl : Auditable {
  key repository  : String(20);
  key tablename   : String(30);
      tablelabel  : String(40);
      processid   : String(10);
      ishierarchy : String(1);
      iscreate    : String(1);
      isamend     : String(1);
      isclose     : String(1);
      isreopen    : String(1);
}

// Replaces ZMDR_CNTRLUIASTG
entity CntrlUIApprStage : Auditable {
  key processnumber : String(10);
  key currentstage  : String(20);
      nextstage     : String(20);
      stepnumber    : Integer;
      totalsteps    : Integer;
}

// Replaces ZMDR_CNTRLUIVAL
entity CntrlUIVal : Auditable {
  key validationindex : Integer;
  key tablename       : String(30);
  key sourcecolname   : String(30);
      operation       : String(20);
      sourcecolvalue  : String(200);
      destcolname     : String(30);
      destcolvalue    : String(100);
      errormessage    : String(200);
}

// Replaces ABAP domain fixed values (ZMDR_YESNO, ZMDR_VERSION etc.)
entity DomainValues {
  key domainname : String(30);
  key value      : String(20);
      label      : String(60);
      sortorder  : Integer;
}

// Material Table
entity ZMDR_MATERIAL : Versionable, Auditable {
  key MATNR            : String(18);
  key versionStartDate : Timestamp;
      MAKTX            : String(40);
      MEINS            : String(3);
      MATKL            : String(9);
}

// // BP Master Table
// entity ZMDR_BPMASTER : Versionable, Auditable {
//   BP_ID	BP_TYPE	BP_ROLE	CUSTOMER_NO	LEGAL_NAME	TRADE_NAME	INDUSTRY	BP_CATEGORY	COUNTRY	REGION	CITY	POSTAL_CODE	STREET	PO_BOX	LANGUAGE	TEL_NO	FAX_NO	EMAIL	WEBSITE	CURRENCY	CREDIT_LIMIT	CREDIT_CTRL_AREA	PAYMENT_TERMS	INCOTERMS	INCOTERMS2	TAX_ID	TAX_CATEGORY	SALES_ORG	DIST_CHANNEL	DIVISION	CUST_GRP	PRICE_LIST	BP_STATUS	BLOCK_REASON	VALID_FROM	VALID_TO	NOTES
// }
