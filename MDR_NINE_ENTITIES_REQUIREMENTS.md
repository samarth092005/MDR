# MDR Services Module — Nine Unconfigured Entities Requirements

**Project:** `mdr-cap-btp`  
**Branch:** `integration/mdr-consolidation`  
**Date:** October 26, 2026  

---

## 1. Scope & Purpose

This document provides a detailed breakdown of the nine Services entities that are declared in the MDR navigation structure but lack metadata definitions in the configuration tables.

Per strict engineering safety rules, **no database fields, primary keys, data types, or backend endpoints are fabricated**. This document details confirmed facts from repository artifacts, implemented defensive safeguards, and exact missing specifications.

---

## 2. Global Services Architecture Context

- **Repository Identifier:** `SERVICES` (Label: "Services")
- **Assigned Fiori Roles:** `ZMDR_C_FIORI_ALL`, `ZMDR_C_FIORI_SAP`
- **Approval Level:** Level 3 (`ApprovalType: TABLE` or `REPOSITORY`)
- **Workflow Approver Class:** `"MDR,SERVICES,SERVICESBUSAPPROVER"`
- **Reference Working Baseline:** `ZMDR_SERVCATALOG` (10 fields in `zmdr.CntrlUIConfig.csv`, points to Gateway endpoint `/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/ServCatalogSet`).

---

## 3. Entity-by-Entity Requirements & Status

### 3.1 ZMDR_CONTRACT — Contract
- **Confirmed Technical ID:** `ZMDR_CONTRACT`
- **Business Label:** Contract
- **Source of Verified Facts:**
  - `db/data/zmdr.CntrlUIVis.csv`: Declared with `ApprovalType: TABLE`, `ApprovalLevel: 3`, `IsCreateEnabled: Y`, `IsAmendEnabled: Y`, `IsCloseEnabled: Y`, `IsReopenEnabled: Y`.
  - `db/data/zmdr.BulkHdrConfig.csv`: Declared with `ApprClass: "MDR,SERVICES,SERVICESBUSAPPROVER"`, `Category: Services`.
- **Implemented Functionality:**
  - Navigation item renders in Services category list.
  - Results view loads; Create button is active and enabled.
  - Safe defensive interception prevents crashes, informing the user that field metadata is pending administrator maintenance.
- **Missing Requirements:**
  - `CntrlUIConfig.csv`: 0 columns maintained.
  - `CntrlUIUrl.csv`: Missing endpoint mapping (expected SAP Gateway EntitySet e.g. `ContractSet`).
  - Key fields, field types, validations, and value helps are absent from the repository.

---

### 3.2 ZMDR_CUST_SG_ELG — Customer Segment Eligibility
- **Confirmed Technical ID:** `ZMDR_CUST_SG_ELG`
- **Business Label:** Customer Segment Eligibility
- **Source of Verified Facts:**
  - `zmdr.CntrlUIVis.csv`: Row for `ZMDR_C_FIORI_ALL` and `ZMDR_C_FIORI_SAP`.
  - `zmdr.BulkHdrConfig.csv`: Row for `ZMDR_CUST_SG_ELG`.
- **Implemented Functionality:**
  - Navigation rendered; Create button enabled.
  - Missing-configuration guard active.
- **Missing Requirements:**
  - Field catalogue (column names, data types, lengths, keys, mandatory flags).
  - Target OData endpoint (e.g. `CustSegmentElgSet`).

---

### 3.3 ZMDR_LOCATION — Location
- **Confirmed Technical ID:** `ZMDR_LOCATION`
- **Business Label:** Location
- **Source of Verified Facts:**
  - `zmdr.CntrlUIVis.csv`: Table type with approval level 3.
  - `zmdr.BulkHdrConfig.csv`: Services category.
- **Implemented Functionality:**
  - Navigation rendered; Create button enabled; guarded against missing models.
- **Missing Requirements:**
  - Field catalog (e.g., Location ID, Name, Region, Address attributes).
  - Target OData endpoint (e.g. `LocationSet`).

---

### 3.4 ZMDR_PRICE_TARRF — Price and Tariff
- **Confirmed Technical ID:** `ZMDR_PRICE_TARRF`
- **Business Label:** Price and Tariff
- **Source of Verified Facts:**
  - `zmdr.CntrlUIVis.csv`: Table type with approval level 3.
  - `zmdr.BulkHdrConfig.csv`: Services category.
- **Implemented Functionality:**
  - Navigation rendered; Create button enabled; guarded against missing models.
- **Missing Requirements:**
  - Field catalog (e.g., Tariff ID, Currency, Pricing Rules, Validity Dates).
  - Target OData endpoint (e.g. `PriceTariffSet`).

---

### 3.5 ZMDR_SERVCATEGRY — Service Category
- **Confirmed Technical ID:** `ZMDR_SERVCATEGRY`
- **Business Label:** Service Category
- **Source of Verified Facts:**
  - `zmdr.CntrlUIVis.csv`: Table type with approval level 3.
  - `zmdr.BulkHdrConfig.csv`: Services category.
- **Implemented Functionality:**
  - Navigation rendered; Create button enabled; guarded against missing models.
- **Missing Requirements:**
  - Field catalog (e.g., Category ID, Description, Parent Category).
  - Target OData endpoint (e.g. `ServCategorySet`).

---

### 3.6 ZMDR_SLA — Service Level Agreement
- **Confirmed Technical ID:** `ZMDR_SLA`
- **Business Label:** Service Level Agreement
- **Source of Verified Facts:**
  - `zmdr.CntrlUIVis.csv`: Table type with approval level 3.
  - `zmdr.BulkHdrConfig.csv`: Services category.
- **Implemented Functionality:**
  - Navigation rendered; Create button enabled; guarded against missing models.
- **Missing Requirements:**
  - Field catalog (e.g., SLA ID, Target Metric, Response Time, Resolution Time).
  - Target OData endpoint (e.g. `SLASet`).

---

### 3.7 ZMDR_SERVOFFRING — Service Offering
- **Confirmed Technical ID:** `ZMDR_SERVOFFRING`
- **Business Label:** Service Offering
- **Source of Verified Facts:**
  - `zmdr.CntrlUIVis.csv`: Table type with approval level 3.
  - `zmdr.BulkHdrConfig.csv`: Services category.
- **Implemented Functionality:**
  - Navigation rendered; Create button enabled; guarded against missing models.
- **Missing Requirements:**
  - Field catalog (e.g., Offering ID, Service Catalog link, Offering Name).
  - Target OData endpoint (e.g. `ServOfferingSet`).

---

### 3.8 ZMDR_SERVPKGBNDL — Service Package Bundle
- **Confirmed Technical ID:** `ZMDR_SERVPKGBNDL`
- **Business Label:** Service Package Bundle
- **Source of Verified Facts:**
  - `zmdr.CntrlUIVis.csv`: Table type with approval level 3.
  - `zmdr.BulkHdrConfig.csv`: Services category.
- **Implemented Functionality:**
  - Navigation rendered; Create button enabled; guarded against missing models.
- **Missing Requirements:**
  - Field catalog (e.g., Package ID, Bundle Items, Discount/Pricing Rules).
  - Target OData endpoint (e.g. `ServPkgBundleSet`).

---

### 3.9 ZMDR_SERV_PROV — Service Provider
- **Confirmed Technical ID:** `ZMDR_SERV_PROV`
- **Business Label:** Service Provider
- **Source of Verified Facts:**
  - `zmdr.CntrlUIVis.csv`: Table type with approval level 3.
  - `zmdr.BulkHdrConfig.csv`: Services category.
  - Cross-reference: `OWNER_ID` in `ZMDR_SERVCATALOG` references provider codes (`PRV001`, `PRV002`, etc.).
- **Architectural Question:**
  - Whether `ZMDR_SERV_PROV` connects to external SAP Gateway (`ZMDR_CNTRL_SERVICES_SRV/ServProviderSet`) or is a projection of CAP's internal `BPMaster` table with role `VENDOR`/`PROVIDER`.
- **Implemented Functionality:**
  - Navigation rendered; Create button enabled; guarded against missing models.
- **Missing Requirements:**
  - Field catalog and architectural decision on Gateway vs. CAP CDS projection.
