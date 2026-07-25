namespace zmdr;

using zmdr.Auditable from './mdr-config';

// Dummy table for GL Accounts
@cds.persistence.table: 'ZMDR_GLACCOUNT'
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

// Missing lookup tables required for validation
@cds.persistence.table: 'ZMDXCNAPPSTATS01'
entity ZMDXCNAPPSTATS01 : Auditable {
  key CODE           : String(10);
  key VERSION_ACTIVE : String(1);
      DESCRIPTION    : String(50);
}

@cds.persistence.table: 'ZMDR_BP_ROLE_REF'
entity ZMDR_BP_ROLE_REF : Auditable {
  key BP_ROLE        : String(10);
  key VERSION_ACTIVE : String(1);
}

@cds.persistence.table: 'T005'
entity T005 : Auditable {
  key LAND1          : String(3);
  key VERSION_ACTIVE : String(1);
}

@cds.persistence.table: 'T002'
entity T002 : Auditable {
  key SPRAS          : String(2);
  key VERSION_ACTIVE : String(1);
}

@cds.persistence.table: 'TCURC'
entity TCURC : Auditable {
  key WAERS          : String(5);
  key VERSION_ACTIVE : String(1);
}

@cds.persistence.table: 'T052'
entity T052 : Auditable {
  key ZTERM          : String(4);
  key VERSION_ACTIVE : String(1);
}

@cds.persistence.table: 'TINC'
entity TINC : Auditable {
  key INCO1          : String(3);
  key VERSION_ACTIVE : String(1);
}

@cds.persistence.table: 'ZMDR_BP_STATUS'
entity ZMDR_BP_STATUS : Auditable {
  key STATUS         : String(10);
  key VERSION_ACTIVE : String(1);
}

// Dummy table for Employees
@cds.persistence.table: 'ZMDR_EMPLOYEES'
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
@cds.persistence.table: 'ZMDR_VENDORS'
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

// Table for Business Partner Master Data (used by bulk load)
@cds.persistence.table: 'ZMDR_BPMASTER'
entity ZMDR_BPMASTER : Auditable {
  key BP_ID              : String(20);
      BP_TYPE            : String(10);
      BP_ROLE            : String(10);
      CUSTOMER_NO        : String(20);
      LEGAL_NAME         : String(80);
      TRADE_NAME         : String(80);
      INDUSTRY           : String(20);
      BP_CATEGORY        : String(10);
      COUNTRY            : String(3);
      REGION             : String(3);
      CITY               : String(40);
      POSTAL_CODE        : String(10);
      STREET             : String(60);
      PO_BOX             : String(10);
      LANGUAGE           : String(2);
      TEL_NO             : String(20);
      FAX_NO             : String(20);
      EMAIL              : String(80);
      WEBSITE            : String(80);
      CURRENCY           : String(5);
      CREDIT_LIMIT       : Decimal(15,2);
      CREDIT_CTRL_AREA   : String(10);
      PAYMENT_TERMS      : String(10);
      INCOTERMS          : String(3);
      INCOTERMS2         : String(28);
      TAX_ID             : String(20);
      TAX_CATEGORY       : String(4);
      SALES_ORG          : String(4);
      DIST_CHANNEL       : String(2);
      DIVISION           : String(2);
      CUST_GRP           : String(2);
      PRICE_LIST         : String(2);
      BP_STATUS          : String(10);
      BLOCK_REASON       : String(2);
      VALID_FROM         : Date;
      VALID_TO           : Date;
      NOTES              : String(255);
      STATUS             : String(10);
      WORKFLOW_ID        : String(10);
  key VERSION_ACTIVE     : String(1);
      VERSION_START_DATE : Timestamp;
      VERSION_END_DATE   : Timestamp;
}
