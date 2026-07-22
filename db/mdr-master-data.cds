namespace zmdr;

using zmdr.Auditable from './mdr-config';

// Dummy table for GL Accounts
entity ZMDR_GLACCOUNT : Auditable {
  key GL_ACCOUNT         : String(10);
      COMPANY_CODE       : String(4);
      ACCOUNT_DESC       : String(40);
      ACCOUNT_TYPE       : String(2);
      CURRENCY           : String(5);
      STATUS             : String(10);  // e.g. ACT | CLO
      WORKFLOW_ID        : String(10);
  key VERSION_ACTIVE     : String(1);
      VERSION_START_DATE : Timestamp;
      VERSION_END_DATE   : Timestamp;
}

// Dummy table for Employees
entity ZMDR_EMPLOYEES : Auditable {
  key EMP_ID             : String(8);
      FIRST_NAME         : String(40);
      LAST_NAME          : String(40);
      DEPARTMENT         : String(30);
      DESIGNATION        : String(40);
      STATUS             : String(10);  // e.g. ACT | CLO
      WORKFLOW_ID        : String(10);
  key VERSION_ACTIVE     : String(1);
      VERSION_START_DATE : Timestamp;
      VERSION_END_DATE   : Timestamp;
}

// Dummy table for Vendors
entity ZMDR_VENDORS : Auditable {
  key VENDOR_ID          : String(10);
      VENDOR_NAME        : String(80);
      COUNTRY            : String(3);
      PAYMENT_TERMS      : String(4);
      CURRENCY           : String(5);
      STATUS             : String(10);  // e.g. ACT | CLO
      WORKFLOW_ID        : String(10);
  key VERSION_ACTIVE     : String(1);
      VERSION_START_DATE : Timestamp;
      VERSION_END_DATE   : Timestamp;
}
