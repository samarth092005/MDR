namespace zmdr;

using zmdr.Auditable from './mdr-common';
using zmdr.Versionable from './mdr-common';

// Replaces ZMDR_APPROVERCLS
entity ApproverClass : Auditable, Versionable {
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
entity Policy : Auditable, Versionable {
  key PolicyLineId        : Integer;
  key VersionStartDate    : Timestamp;
      ApproverClassLineId : Integer; // ZMDR_APPRCLSLINEID - FK to ApproverClass
      ApprLevel           : Integer;
      ApprConstraint      : String(40);
      SapRole             : String(30); // ZMDR_REQROLE
      WorkflowId          : String(10); // ZMDR_WORKFLOWID
      Status              : String(3); // ZMDR_STATUS
}

// Replaces ZMDR_APPROVER
entity Approver : Auditable, Versionable {
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
      WorkflowId                : String(10);
      Status                    : String(3);
}