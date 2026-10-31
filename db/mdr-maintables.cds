namespace zmdr;

using zmdr.Auditable from './mdr-common';
using zmdr.Versionable from './mdr-common';

// GL Account Master Data
@cds.persistence.table: 'GLAccount'
entity GLAccount : Versionable, Auditable {
  key GlAccountNum     : String(10);
  key VersionStartDate : Timestamp;
      CompanyCode      : String(4);
      AccountDesc      : String(40);
      AccountType      : String(2);
      Currency         : String(5);
      Status           : String(10); // e.g. 510 | 520 | 590
      WorkflowId       : String(10);
}

@cds.persistence.table: 'BPRoleRef'
entity BPRoleRef : Auditable, Versionable {
  key BpRole           : String(10);
  key VersionStartDate : Timestamp;
      Description      : String(40);
      Status           : String(10); // e.g. 510 | 520 | 590
      WorkflowId       : String(10);
}

@cds.persistence.table: 'Country'
entity Country : Auditable {
  key Code : String(2);
      Name : String(40);
}

@cds.persistence.table: 'Language'
entity Language : Auditable {
  key Code : String(2);
      Name : String(40);
}

@cds.persistence.table: 'Currency'
entity Currency : Auditable {
  key Code : String(2);
      Name : String(40);
}

@cds.persistence.table: 'BPStatus'
entity BPStatus : Auditable {
  key Status      : String(1);
      Description : String(40);
}

// Table for Business Partner Master Data
@cds.persistence.table: 'BPMaster'
entity BPMaster : Auditable, Versionable {
  key BpId               : String(20);
  key VersionStartDate : Timestamp;
      BpType             : String(10);
      BpRole             : String(10);
      CustomerNo         : String(20);
      LegalName          : String(80);
      TradeName          : String(80);
      Industry           : String(50);
      BpCategory         : String(10);
      Country            : String(2);
      Region             : String(3);
      City               : String(40);
      PostalCode         : String(10);
      Street             : String(60);
      PoBox              : String(10);
      Language           : String(2);
      TelNo              : String(20);
      FaxNo              : String(20);
      Email              : String(80);
      Website            : String(80);
      Currency           : String(5);
      CreditLimit        : Decimal(15, 2);
      CreditCtrlArea     : String(10);
      PaymentTerms       : String(10);
      Incoterms          : String(3);
      Incoterms2         : String(28);
      TaxId              : String(40);
      TaxCategory        : String(4);
      SalesOrg           : String(4);
      DistChannel        : String(2);
      Division           : String(2);
      CustGrp            : String(2);
      PriceList          : String(2);
      BpStatus           : String(10);
      BlockReason        : String(2);
      ValidFrom          : Date;
      ValidTo            : Date;
      Notes              : String(255);
      Status             : String(10);
      WorkflowId         : String(10);
}


// ==========================================

aspect ServicesVersioned {
  VERSION_END_DATE   : Timestamp;
  VERSION_ACTIVE     : String(1); // Y=Active N=Inactive G=BulkUpdate I=SingleUpdate
  created_on         : Timestamp;
  created_by         : String(50);
  updated_on         : Timestamp;
  updated_by         : String(50);
}

// Services Master Data Tables (10 Entities)
// ==========================================

@cds.persistence.table: 'ZMDR_SERVCATALOG'
entity ZMDR_SERVCATALOG : ServicesVersioned {
  key CATALOG_ID         : String(10);
  key VERSION_START_DATE : Timestamp;
      CATALOG_NAME       : String(100);
      CATALOG_DESC       : String(255);
      CATALOG_TYPE       : String(30);
      EFFECTIVE_DATE     : Date;
      EXPIRY_DATE        : Date;
      OWNER_ID           : String(10);
      CATALOG_STATUS     : String(20);
      WORKFLOW_ID        : String(10);
      STATUS             : String(3);
}

@cds.persistence.table: 'ZMDR_SERVCATEGRY'
entity ZMDR_SERVCATEGRY : ServicesVersioned {
  key CATEGORY_ID        : String(10);
  key VERSION_START_DATE : Timestamp;
      CATEGORY_NAME      : String(100);
      CATEGORY_DESC      : String(255);
      CATEGORY_TYPE      : String(30);
      PARENT_CAT_ID      : String(10);
      EFFECTIVE_DATE     : Date;
      EXPIRY_DATE        : Date;
      CATEGORY_STATUS    : String(20);
      WORKFLOW_ID        : String(10);
      STATUS             : String(3);
}

@cds.persistence.table: 'ZMDR_CONTRACT'
entity ZMDR_CONTRACT : ServicesVersioned {
  key CONTRACT_ID        : String(10);
  key VERSION_START_DATE : Timestamp;
      CONTRACT_NAME      : String(100);
      CONTRACT_DESC      : String(255);
      CONTRACT_TYPE      : String(30);
      START_DATE         : Date;
      END_DATE           : Date;
      VENDOR_ID          : String(10);
      CONTRACT_STATUS    : String(20);
      WORKFLOW_ID        : String(10);
      STATUS             : String(3);
}

@cds.persistence.table: 'ZMDR_CUST_SG_ELG'
entity ZMDR_CUST_SG_ELG : ServicesVersioned {
  key SEGMENT_ID         : String(10);
  key VERSION_START_DATE : Timestamp;
      SEGMENT_NAME       : String(100);
      SEGMENT_DESC       : String(255);
      ELIGIBILITY_RULE   : String(50);
      EFFECTIVE_DATE     : Date;
      EXPIRY_DATE        : Date;
      WORKFLOW_ID        : String(10);
      STATUS             : String(3);
}

@cds.persistence.table: 'ZMDR_LOCATION'
entity ZMDR_LOCATION : ServicesVersioned {
  key LOCATION_ID        : String(10);
  key VERSION_START_DATE : Timestamp;
      LOCATION_NAME      : String(100);
      LOCATION_TYPE      : String(30);
      COUNTRY            : String(3);
      REGION             : String(30);
      CITY               : String(40);
      POSTAL_CODE        : String(10);
      WORKFLOW_ID        : String(10);
      STATUS             : String(3);
}

@cds.persistence.table: 'ZMDR_PRICE_TARRF'
entity ZMDR_PRICE_TARRF : ServicesVersioned {
  key TARIFF_ID          : String(10);
  key VERSION_START_DATE : Timestamp;
      TARIFF_NAME        : String(100);
      TARIFF_DESC        : String(255);
      RATE_TYPE          : String(20);
      CURRENCY           : String(5);
      UNIT_PRICE         : Decimal(13, 2);
      EFFECTIVE_DATE     : Date;
      WORKFLOW_ID        : String(10);
      STATUS             : String(3);
}

@cds.persistence.table: 'ZMDR_SLA'
entity ZMDR_SLA : ServicesVersioned {
  key SLA_ID             : String(10);
  key VERSION_START_DATE : Timestamp;
      SLA_NAME           : String(100);
      SLA_DESC           : String(255);
      RESPONSE_TIME_HRS  : Integer;
      RESOLUTION_TIME_HRS: Integer;
      COVERAGE_HOURS     : String(20);
      WORKFLOW_ID        : String(10);
      STATUS             : String(3);
}

@cds.persistence.table: 'ZMDR_SERVOFFRING'
entity ZMDR_SERVOFFRING : ServicesVersioned {
  key OFFERING_ID        : String(10);
  key VERSION_START_DATE : Timestamp;
      OFFERING_NAME      : String(100);
      OFFERING_DESC      : String(255);
      OFFERING_TYPE      : String(30);
      CATALOG_ID         : String(10);
      EFFECTIVE_DATE     : Date;
      WORKFLOW_ID        : String(10);
      STATUS             : String(3);
}

@cds.persistence.table: 'ZMDR_SERVPKGBNDL'
entity ZMDR_SERVPKGBNDL : ServicesVersioned {
  key BUNDLE_ID          : String(10);
  key VERSION_START_DATE : Timestamp;
      BUNDLE_NAME        : String(100);
      BUNDLE_DESC        : String(255);
      BUNDLE_TYPE        : String(30);
      PRICE              : Decimal(13, 2);
      CURRENCY           : String(5);
      WORKFLOW_ID        : String(10);
      STATUS             : String(3);
}

@cds.persistence.table: 'ZMDR_SERV_PROV'
entity ZMDR_SERV_PROV : ServicesVersioned {
  key PROVIDER_ID        : String(10);
  key VERSION_START_DATE : Timestamp;
      PROVIDER_NAME      : String(100);
      PROVIDER_TYPE      : String(30);
      CONTACT_PERSON     : String(80);
      EMAIL              : String(100);
      PHONE              : String(20);
      WORKFLOW_ID        : String(10);
      STATUS             : String(3);
}

@cds.persistence.table: 'ZMDR_MATERIAL'
entity ZMDR_MATERIAL : ServicesVersioned {
  key MATERIALNUM        : String(40);
  key VERSION_START_DATE : Timestamp;
      MATERIALDESC       : String(100);
      MATERIALGROUP      : String(30);
      MATERIALTYPE       : String(10);
      MEASUREBASEUNIT    : String(10);
      OLD_MATNUM         : String(40);
      EXTERNAL_MATGRP    : String(30);
      DIVISION           : String(10);
      GENITEMCATGRP      : String(10);
      PRODHIER           : String(30);
      AUTHGROUP          : String(10);
      CROSSPLANTCM       : String(10);
      WORKFLOW_ID        : String(10);
      STATUS             : String(10);
}

