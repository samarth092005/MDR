# Services Module — Entities Requirements & Configuration Matrix

**Project:** `mdr-cap-btp`  
**Branch:** `integration/mdr-consolidation`  
**Generated Date:** October 26, 2026  
**Audience:** Development Team, SAP ABAP / Gateway Administrators, Functional Leads

---

## 1. Executive Summary

In the MDR CAP/BTP application, the **Services** repository consists of ten master data entities. Only one entity (**Service Catalog** / `ZMDR_SERVCATALOG`) has complete field metadata, URL mapping, and seed data configured.

The remaining nine entities are visible in the Fiori navigation tree with Create/Amend buttons enabled (`IsCreateEnabled: Y`), but their underlying field definitions (`CntrlUIConfig`), backend service URL routes (`CntrlUIUrl`), validation rules (`CntrlUIVal`), and bulk configuration (`BulkItmConfig`) have not been maintained in the repository or database.

Per project governance rules, field schemas, data types, and primary keys are **not fabricated** without authoritative SAP backend specifications. This document establishes what is confirmed in the repository and specifies the exact requirements and administrator actions needed to complete configuration.

---

## 2. Configuration Status Overview

| Technical ID | Business Name | Repository | CntrlUIVis | BulkHdrConfig | CntrlUIConfig | CntrlUIUrl | CntrlUIVal | Status |
|---|---|---|---|---|---|---|---|---|
| `ZMDR_SERVCATALOG` | Service Catalog | SERVICES | ✅ Maintained | ✅ Maintained | ✅ 10 Columns | ✅ ServCatalogSet | ✅ 2 Rules | **Configured** |
| `ZMDR_CONTRACT` | Contract | SERVICES | ✅ Maintained | ✅ Maintained | ❌ 0 Columns | ❌ Missing | ❌ None | **Unresolved** |
| `ZMDR_CUST_SG_ELG` | Customer Segment Eligibility | SERVICES | ✅ Maintained | ✅ Maintained | ❌ 0 Columns | ❌ Missing | ❌ None | **Unresolved** |
| `ZMDR_LOCATION` | Location | SERVICES | ✅ Maintained | ✅ Maintained | ❌ 0 Columns | ❌ Missing | ❌ None | **Unresolved** |
| `ZMDR_PRICE_TARRF` | Price and Tariff | SERVICES | ✅ Maintained | ✅ Maintained | ❌ 0 Columns | ❌ Missing | ❌ None | **Unresolved** |
| `ZMDR_SERVCATEGRY` | Service Category | SERVICES | ✅ Maintained | ✅ Maintained | ❌ 0 Columns | ❌ Missing | ❌ None | **Unresolved** |
| `ZMDR_SLA` | Service Level Agreement | SERVICES | ✅ Maintained | ✅ Maintained | ❌ 0 Columns | ❌ Missing | ❌ None | **Unresolved** |
| `ZMDR_SERVOFFRING` | Service Offering | SERVICES | ✅ Maintained | ✅ Maintained | ❌ 0 Columns | ❌ Missing | ❌ None | **Unresolved** |
| `ZMDR_SERVPKGBNDL` | Service Package Bundle | SERVICES | ✅ Maintained | ✅ Maintained | ❌ 0 Columns | ❌ Missing | ❌ None | **Unresolved** |
| `ZMDR_SERV_PROV` | Service Provider | SERVICES | ✅ Maintained | ✅ Maintained | ❌ 0 Columns | ❌ Missing | ❌ None | **Unresolved** |

---

## 3. Entity-by-Entity Requirements & Dependency Matrix

### 3.1 ZMDR_SERVCATALOG — Service Catalog (Reference Baseline)
- **Status:** Fully Configured
- **Target Backend:** SAP Gateway (`S21`) via `/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/ServCatalogSet`
- **Roles:** `ZMDR_C_FIORI_ALL`, `ZMDR_C_FIORI_SAP`
- **Approval Type:** `REPOSITORY` (Level 3)
- **Approver Class:** `MDR,SERVICES,SERVICESBUSAPPROVER`
- **Confirmed Fields (10 Columns):**
  1. `CATALOG_ID` — CHAR(10), Primary Key, Mandatory, Visible, Editable
  2. `CATALOG_NAME` — CHAR(100), Visible, Editable
  3. `CATALOG_DESC` — CHAR(255), Visible, Editable
  4. `CATALOG_TYPE` — CHAR(30), Visible, Editable
  5. `EFFECTIVE_DATE` — DATS, Mandatory, Visible, Editable
  6. `EXPIRY_DATE` — DATS, Visible, Editable
  7. `OWNER_ID` — CHAR(10), Mandatory, Visible, Editable
  8. `CATALOG_STATUS` — CHAR(20), Mandatory, Visible, Editable
  9. `WORKFLOW_ID` — CHAR(10), Display only
  10. `STATUS` — CHAR(3), Display only

---

### 3.2 ZMDR_CONTRACT — Contract
- **Technical ID:** `ZMDR_CONTRACT`
- **Business Label:** Contract
- **Repository:** `SERVICES` (Label: Services)
- **Role Assignments:** `ZMDR_C_FIORI_ALL`, `ZMDR_C_FIORI_SAP`
- **Navigation Configuration (`CntrlUIVis`):**
  - ApprovalType: `TABLE`
  - ApprovalLevel: `3`
  - Hierarchy: `N`
  - Actions Enabled: Create (`Y`), Amend (`Y`), Close (`Y`), Reopen (`Y`)
- **Workflow & Approver (`BulkHdrConfig`):**
  - ApprClass: `"MDR,SERVICES,SERVICESBUSAPPROVER"`
- **Current State:**
  - `CntrlUIConfig`: 0 columns maintained.
  - `CntrlUIUrl`: No service URL mapping.
  - `BulkItmConfig`: 0 columns maintained.
  - `mdr-maintables.cds`: No CDS entity defined.
- **Required Administrator Action:**
  1. Define ABAP Core Data Services (CDS) view / Gateway entity set (e.g. `ContractSet` in `ZMDR_CNTRL_SERVICES_SRV`) or CAP CDS entity in `srv/maindata-service.cds`.
  2. Maintain field catalog in `db/data/zmdr.CntrlUIConfig.csv` (Field names, types, labels, mandatory flags, keys).
  3. Maintain entry in `db/data/zmdr.CntrlUIUrl.csv` pointing to the resolved OData endpoint.
  4. Maintain bulk columns in `db/data/zmdr.BulkItmConfig.csv`.

---

### 3.3 ZMDR_CUST_SG_ELG — Customer Segment Eligibility
- **Technical ID:** `ZMDR_CUST_SG_ELG`
- **Business Label:** Customer Segment Eligibility
- **Repository:** `SERVICES`
- **Role Assignments:** `ZMDR_C_FIORI_ALL`, `ZMDR_C_FIORI_SAP`
- **Navigation Configuration (`CntrlUIVis`):**
  - ApprovalType: `TABLE`, ApprovalLevel: `3`, Hierarchy: `N`
  - Actions Enabled: Create (`Y`), Amend (`Y`), Close (`Y`), Reopen (`Y`)
- **Workflow & Approver (`BulkHdrConfig`):**
  - ApprClass: `"MDR,SERVICES,SERVICESBUSAPPROVER"`
- **Current State:** 0 columns in `CntrlUIConfig`, no URL in `CntrlUIUrl`.
- **Required Administrator Action:**
  - Define Gateway entity set (e.g. `CustSegmentElgSet` in `ZMDR_CNTRL_SERVICES_SRV`).
  - Provide column specifications and update CSV configurations.

---

### 3.4 ZMDR_LOCATION — Location
- **Technical ID:** `ZMDR_LOCATION`
- **Business Label:** Location
- **Repository:** `SERVICES`
- **Role Assignments:** `ZMDR_C_FIORI_ALL`, `ZMDR_C_FIORI_SAP`
- **Navigation Configuration (`CntrlUIVis`):**
  - ApprovalType: `TABLE`, ApprovalLevel: `3`, Hierarchy: `N`
  - Actions Enabled: Create (`Y`), Amend (`Y`), Close (`Y`), Reopen (`Y`)
- **Workflow & Approver (`BulkHdrConfig`):**
  - ApprClass: `"MDR,SERVICES,SERVICESBUSAPPROVER"`
- **Current State:** 0 columns in `CntrlUIConfig`, no URL in `CntrlUIUrl`.
- **Required Administrator Action:**
  - Define Gateway entity set (e.g. `LocationSet` in `ZMDR_CNTRL_SERVICES_SRV`).
  - Provide column specifications and update CSV configurations.

---

### 3.5 ZMDR_PRICE_TARRF — Price and Tariff
- **Technical ID:** `ZMDR_PRICE_TARRF`
- **Business Label:** Price and Tariff
- **Repository:** `SERVICES`
- **Role Assignments:** `ZMDR_C_FIORI_ALL`, `ZMDR_C_FIORI_SAP`
- **Navigation Configuration (`CntrlUIVis`):**
  - ApprovalType: `TABLE`, ApprovalLevel: `3`, Hierarchy: `N`
  - Actions Enabled: Create (`Y`), Amend (`Y`), Close (`Y`), Reopen (`Y`)
- **Workflow & Approver (`BulkHdrConfig`):**
  - ApprClass: `"MDR,SERVICES,SERVICESBUSAPPROVER"`
- **Current State:** 0 columns in `CntrlUIConfig`, no URL in `CntrlUIUrl`.
- **Required Administrator Action:**
  - Define Gateway entity set (e.g. `PriceTariffSet` in `ZMDR_CNTRL_SERVICES_SRV`).
  - Provide column specifications and update CSV configurations.

---

### 3.6 ZMDR_SERVCATEGRY — Service Category
- **Technical ID:** `ZMDR_SERVCATEGRY`
- **Business Label:** Service Category
- **Repository:** `SERVICES`
- **Role Assignments:** `ZMDR_C_FIORI_ALL`, `ZMDR_C_FIORI_SAP`
- **Navigation Configuration (`CntrlUIVis`):**
  - ApprovalType: `TABLE`, ApprovalLevel: `3`, Hierarchy: `N`
  - Actions Enabled: Create (`Y`), Amend (`Y`), Close (`Y`), Reopen (`Y`)
- **Workflow & Approver (`BulkHdrConfig`):**
  - ApprClass: `"MDR,SERVICES,SERVICESBUSAPPROVER"`
- **Current State:** 0 columns in `CntrlUIConfig`, no URL in `CntrlUIUrl`.
- **Required Administrator Action:**
  - Define Gateway entity set (e.g. `ServCategorySet` in `ZMDR_CNTRL_SERVICES_SRV`).
  - Provide column specifications and update CSV configurations.

---

### 3.7 ZMDR_SLA — Service Level Agreement
- **Technical ID:** `ZMDR_SLA`
- **Business Label:** Service Level Agreement
- **Repository:** `SERVICES`
- **Role Assignments:** `ZMDR_C_FIORI_ALL`, `ZMDR_C_FIORI_SAP`
- **Navigation Configuration (`CntrlUIVis`):**
  - ApprovalType: `TABLE`, ApprovalLevel: `3`, Hierarchy: `N`
  - Actions Enabled: Create (`Y`), Amend (`Y`), Close (`Y`), Reopen (`Y`)
- **Workflow & Approver (`BulkHdrConfig`):**
  - ApprClass: `"MDR,SERVICES,SERVICESBUSAPPROVER"`
- **Current State:** 0 columns in `CntrlUIConfig`, no URL in `CntrlUIUrl`.
- **Required Administrator Action:**
  - Define Gateway entity set (e.g. `SLASet` in `ZMDR_CNTRL_SERVICES_SRV`).
  - Provide column specifications and update CSV configurations.

---

### 3.8 ZMDR_SERVOFFRING — Service Offering
- **Technical ID:** `ZMDR_SERVOFFRING`
- **Business Label:** Service Offering
- **Repository:** `SERVICES`
- **Role Assignments:** `ZMDR_C_FIORI_ALL`, `ZMDR_C_FIORI_SAP`
- **Navigation Configuration (`CntrlUIVis`):**
  - ApprovalType: `TABLE`, ApprovalLevel: `3`, Hierarchy: `N`
  - Actions Enabled: Create (`Y`), Amend (`Y`), Close (`Y`), Reopen (`Y`)
- **Workflow & Approver (`BulkHdrConfig`):**
  - ApprClass: `"MDR,SERVICES,SERVICESBUSAPPROVER"`
- **Current State:** 0 columns in `CntrlUIConfig`, no URL in `CntrlUIUrl`.
- **Required Administrator Action:**
  - Define Gateway entity set (e.g. `ServOfferingSet` in `ZMDR_CNTRL_SERVICES_SRV`).
  - Provide column specifications and update CSV configurations.

---

### 3.9 ZMDR_SERVPKGBNDL — Service Package Bundle
- **Technical ID:** `ZMDR_SERVPKGBNDL`
- **Business Label:** Service Package Bundle
- **Repository:** `SERVICES`
- **Role Assignments:** `ZMDR_C_FIORI_ALL`, `ZMDR_C_FIORI_SAP`
- **Navigation Configuration (`CntrlUIVis`):**
  - ApprovalType: `TABLE`, ApprovalLevel: `3`, Hierarchy: `N`
  - Actions Enabled: Create (`Y`), Amend (`Y`), Close (`Y`), Reopen (`Y`)
- **Workflow & Approver (`BulkHdrConfig`):**
  - ApprClass: `"MDR,SERVICES,SERVICESBUSAPPROVER"`
- **Current State:** 0 columns in `CntrlUIConfig`, no URL in `CntrlUIUrl`.
- **Required Administrator Action:**
  - Define Gateway entity set (e.g. `ServPkgBundleSet` in `ZMDR_CNTRL_SERVICES_SRV`).
  - Provide column specifications and update CSV configurations.

---

### 3.10 ZMDR_SERV_PROV — Service Provider
- **Technical ID:** `ZMDR_SERV_PROV`
- **Business Label:** Service Provider
- **Repository:** `SERVICES`
- **Role Assignments:** `ZMDR_C_FIORI_ALL`, `ZMDR_C_FIORI_SAP`
- **Navigation Configuration (`CntrlUIVis`):**
  - ApprovalType: `TABLE`, ApprovalLevel: `3`, Hierarchy: `N`
  - Actions Enabled: Create (`Y`), Amend (`Y`), Close (`Y`), Reopen (`Y`)
- **Workflow & Approver (`BulkHdrConfig`):**
  - ApprClass: `"MDR,SERVICES,SERVICESBUSAPPROVER"`
- **Current State:** 0 columns in `CntrlUIConfig`, no URL in `CntrlUIUrl`.
- **Required Administrator Action:**
  - Clarify whether `ZMDR_SERV_PROV` connects to external SAP Gateway (`ZMDR_CNTRL_SERVICES_SRV/ServProviderSet` via destination `S21`) or if it should be an internal CAP CDS entity (projected on `BPMaster` / vendor master data).
  - Provide authoritative field definitions and maintain configuration files.

---

## 4. Frontend Resilience & Defensive Safeguards

Prior to this fix, clicking Create on any unconfigured entity triggered an unhandled JavaScript exception:
`Cannot read properties of undefined (reading 'getData')`
which halted execution and left the UI unresponsive.

With the current repair:
1. `TableResult.controller.js` explicitly verifies `oFieldsModel` and `aFieldsData`. If configuration is missing, it displays a user-friendly dialogue:
   > *"Cannot perform 'Create' for [Entity Name]. Field metadata configuration is not maintained in CntrlUIConfig for this entity. Please contact the system administrator to maintain the table configuration."*
2. Entity selection correctly maps technical IDs (`ZMDR_SERV_PROV`, `ZMDR_CONTRACT`, etc.) from model context rather than falling back to numeric row indexes (e.g. `4`).
3. The Create (+) button remains permanently enabled and active, satisfying non-negotiable usability rules while protecting against crashes.
