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
  key VersionStartDate   : Timestamp;
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
