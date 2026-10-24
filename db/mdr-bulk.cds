namespace zmdr;

using zmdr.Auditable from './mdr-common';

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