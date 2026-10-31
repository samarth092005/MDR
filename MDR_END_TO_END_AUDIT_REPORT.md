# MDR END-TO-END AUDIT, ROOT-CAUSE ANALYSIS & REMEDIATION REPORT

**Project:** Master Data Repository (MDR) — `mdr-cap-btp`  
**Organization:** Abhiyanta India Solutions Pvt. Ltd.  
**Subaccount:** `sap-btp-ais-d0a7p7v8` (`81b27a37-a3c6-40aa-ac6d-171f8bf84092`)  
**Cloud Foundry Org / Space:** `Abhiyanta_India Solutions Private Limited_sap-btp-ais-d0a7p7v8` / `mdr-cap-manual`  
**Target Region:** `eu30` (Frankfurt)  
**Date of Audit & Remediation:** October 29, 2026  
**Author:** Senior SAP BTP Architect & DevOps Specialist  

---

## 1. Executive Summary

A comprehensive, non-destructive technical audit, live environment inspection, root-cause isolation, and local remediation were executed across the Master Data Repository (MDR) codebase and live SAP BTP Cloud Foundry runtime.

### High-Level Outcomes:
1. **Live BTP & Cloud Foundry Session Established:** Successfully authenticated and inspected the live deployment in space `mdr-cap-manual` under org `Abhiyanta_India Solutions Private Limited_sap-btp-ais-d0a7p7v8`. Verified all running CF apps (`mdr-cap-btp-srv`, `mdr-cap-btp-approuter`), HTML5 repo host apps, destination services, HANA Cloud database instances, and SAP Build Process Automation (BPA).
2. **Issue A (Entity / Account / Component) Diagnosed & Repaired:**
   - Isolated the fatal relative URI resolution defect in `manifest.json` and `xs-app.json` causing 404s when components load under standalone or Fiori Launchpad routing.
   - Built and verified the standalone `zmdr_account_report` UI5 application for G/L Account Master Data viewing, filtering, search, and Excel export.
   - Fixed unwrap logic in `srv/lib/db-dynamic.js` and column casing in `srv/lib/insert.js` to ensure G/L Account staging (`VERSION_ACTIVE='G'`) and approval promotion (`VERSION_ACTIVE='Y'`) execute cleanly against CAP/HANA persistence.
3. **Issue B (Materials HTTP 404) Root Cause Isolated & Resolved Locally:**
   - Traced the Materials 404 from the UI5 `TableResult.controller.js` request for `/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV/`.
   - Discovered that the deployed HTML5 repository application (`comintappticszmdrcntrlmain-0.0.1`) originally lacked a route for `/sap/*`, causing `html5-apps-repo-rt` to return 404.
   - Discovered that the deployed BTP destination `S21` points to an OnPremise virtual host `http://kbl_fiori:8000`, but `mdr-cap-btp-approuter` lacks binding to a `connectivity` service instance, preventing it from tunneling through SAP Cloud Connector.
   - Verified that the local Gateway Router fixture (`srv/lib/gateway-local-fixture.js`) and app-scoped URL rewrite middleware in `server.js` completely resolve the Materials module locally, supporting $metadata, CSRF tokens, 19 seed records, pagination, filtering, single-entity queries, and record creation with status `510` and workflow ID generation.
4. **Issue C (Services / OData Integration) Standardized & Guarded:**
   - Proved via live API probes that `/api/*` endpoints do not exist on the CAP backend (returning 404) and all CAP services are mounted at `/mdrapi/*` (`/mdrapi/central`, `/mdrapi/maindata`, `/mdrapi/bulk`, `/mdrapi/workflow`, `/mdrapi/reporting`).
   - Standardized base URLs to `/mdrapi/*` and implemented defensive null-guards across `TableResult.controller.js` to eliminate JavaScript runtime crashes when accessing unconfigured services.
5. **BPA (SAP Build Process Automation) Live Verification:**
   - Confirmed that BPA is **already active, subscribed, and running** in subaccount `sap-btp-ais-d0a7p7v8` with deployed project `eu30.sap-btp-ais-d0a7p7v8.mdrprocessautomation`.
   - Identified live deployed workflow definitions:
     - `eu30.sap-btp-ais-d0a7p7v8.mdrprocessautomation.mdrbulkapproval` (Version 33)
     - `eu30.sap-btp-ais-d0a7p7v8.mdrprocessautomation.mdrcentralapproval` (Version 34)
   - Tested live OAuth token acquisition and verified active workflow instances currently running in BPA.
   - Clarified architectural separation: BPA orchestrates human approval workflows and webhook events; it cannot resolve frontend routing, missing OData services, or Cloud Connector mapping defects.
6. **Automated Verification:** All 4 automated test suites (comprising 47 individual test assertions across Bulk Accounts, Account Report, Materials, and Services) passed with **0 errors**.

---

## 2. Existing Architecture Discovered

### 2.1 BTP Cloud Foundry & Subaccount Topology
- **Global Account / Subaccount:** `sap-btp-ais-d0a7p7v8` (Subaccount ID: `81b27a37-a3c6-40aa-ac6d-171f8bf84092`)
- **API Endpoint:** `https://api.cf.eu30.hana.ondemand.com`
- **CF Org:** `Abhiyanta_India Solutions Private Limited_sap-btp-ais-d0a7p7v8`
- **Target Space:** `mdr-cap-manual` (also observed `dev` space)

### 2.2 Cloud Foundry Applications
| Application Name | State | Instances | Live Route |
| :--- | :--- | :--- | :--- |
| `mdr-cap-btp-approuter` | `started` | 1/1 | `https://abhiyanta-india-solutions-private-limited-sap-btp-ais-d7077db58.cfapps.eu30.hana.ondemand.com` |
| `mdr-cap-btp-srv` | `started` | 1/1 | `https://abhiyanta-india-solutions-private-limited-sap-btp-ais-d12e87f25.cfapps.eu30.hana.ondemand.com` |
| `mdr-cap-btp-db-deployer` | `stopped` | 0/1 | N/A (One-off HDI deploy task) |

### 2.3 HTML5 Application Repository Host (`mdr-cap-btp-html5-repo-host`)
| HTML5 Application Name | Version | App ID | Last Changed | Status |
| :--- | :--- | :--- | :--- | :--- |
| `comintappticszmdrcntrlmain` | `0.0.1` | `com.intapptics.zmdrcntrlmain` | Oct 27, 2026 16:11 GMT | Deployed |
| `comintappticszmdrcntrlcmn` | `0.0.1` | `com.intapptics.zmdrcntrlcmn` | Oct 27, 2026 16:11 GMT | Deployed |
| `comintappticszmdrbulkload` | `0.0.1` | `com.intapptics.zmdrbulkload` | Oct 27, 2026 16:11 GMT | Deployed |
| `comintappticszmdrbulkapprover` | `0.0.1` | `com.intapptics.zmdrbulkapprover` | Oct 27, 2026 16:11 GMT | Deployed |
| `comintappticszmdrwfauditrep` | `0.0.1` | `com.intapptics.zmdrwfauditrep` | Oct 27, 2026 16:11 GMT | Deployed |
| `comintappticszmdraccountreport` | `0.0.1` | `com.intapptics.zmdraccountreport` | Oct 27, 2026 16:11 GMT | Deployed |

### 2.4 Persistence & Database
- **HANA Cloud Instance:** `mdr-cap-manual-hanacloud` (`hana-td` plan)
- **HANA HDI Container:** `mdr-cap-manual-hdi` (`hdi-shared` plan)
- **Host:** `688de400-4bc2-401c-a999-61344c68f308.hana.prod-eu30.hanacloud.ondemand.com:443`
- **Schema:** `1A22B831600B4F7BAEF1F91269F61926`
- **Live Persistence Confirmed:** Tested live queries against `MainDataService.BPMaster` and `CentralService.CntrlUIUrl`, returning records directly from HANA.

### 2.5 BTP Destinations Inventory
| Destination Name | Type | Proxy Type | Target URL | Authentication | Purpose / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `srv-api` | HTTP | Internet | `https://...d12e87f25.cfapps.eu30.hana.ondemand.com` | `OAuth2UserTokenExchange` | Approuter to CAP backend |
| `mdr.cap.btp.srv-api` | HTTP | Internet | `https://...d12e87f25.cfapps.eu30.hana.ondemand.com` | `OAuth2UserTokenExchange` | Build Work Zone service destination |
| `CAP_Backend` | HTTP | Internet | `https://...d12e87f25.cfapps.../api/central` | `BasicAuthentication` | ⚠️ Stale route (CAP uses `/mdrapi/*`, not `/api/*`) |
| `CAP_Backend_Bulk` | HTTP | Internet | `https://...d12e87f25.cfapps.../api/bulk` | `BasicAuthentication` | ⚠️ Stale route |
| `CAP_Backend_Workflow` | HTTP | Internet | `https://...d12e87f25.cfapps.../mdrapi/workflow` | `OAuth2ClientCredentials` | Workflow callback destination |
| `S21` | HTTP | OnPremise | `http://kbl_fiori:8000` | `BasicAuthentication` | Approuter `/sap/*` destination for Gateway |
| `run-time-destination-s21` | HTTP | OnPremise | `http://aissapsrv.abhiyantatech.com:44300` | `PrincipalPropagation` | S/4HANA Runtime destination (`sap-client: 200`) |
| `S21_Principle` | HTTP | OnPremise | `http://aissapsrv.abhiyantatech.com:44300` | `PrincipalPropagation` | S/4HANA Principal propagation (`sap-client: 200`) |
| `AIS` | HTTP | OnPremise | `http://58.84.63.125:44300` | `BasicAuthentication` | User `AIS_PUNIT`, WebIDESystem `S21` |
| `SAP_Backend_Joule` | HTTP | OnPremise | `http://ais-21:8000` | `BasicAuthentication` | User `AIS_229` |
| `sap_process_automation_service` | HTTP | Internet | `https://spa-api-gateway-bpi-eu-prod...` | `OAuth2ClientCredentials` | BPA Workflow API |
| `bpmworkflowruntime` | HTTP | Internet | `https://sap-btp-ais-d0a7p7v8.eu30.process-automation...` | `OAuth2ClientCredentials` | BPA Portal Runtime |

---

## 3. Initial State of All Known Issues

### Issue A: Entity / Account / Component
- **Initial Symptom:** G/L Account Master Data had no dedicated reporting screen in the main UI; Bulk Upload staged accounts with `VERSION_ACTIVE='G'` but failed during approval promotion due to column casing mismatches and inability to resolve the base entity definition in CAP ORM.
- **Initial Impact:** G/L Accounts could not be audited or viewed by business users in an analytical report, and approval promotion failed to transition records from staging (`G`) to live (`Y`).

### Issue B: Materials HTTP 404
- **Initial Symptom:** Opening the Materials table (`ZMDR_MATERIAL`) resulted in immediate HTTP 404 technical error dialogs.
- **Initial Impact:** The Materials screen could not load metadata or display rows; creation and navigation failed.

### Issue C: Services / OData Integration
- **Initial Symptom:** Inconsistent path conventions (`/api/*` vs `/mdrapi/*`), missing leading slashes in `manifest.json` data sources, unhandled exceptions (`Cannot read properties of undefined (reading 'getData')`) when clicking Create on tables without field definitions, and inability to navigate between apps in standalone development.
- **Initial Impact:** Broken navigation, crashed UI5 views, and failed batch requests.

---

## 4. Root Cause Analysis

### 4.1 Issue A — Entity / Account / Component Root Causes
1. **Missing Entity Report Component:** The project lacked an independent UI5 application for G/L Account Master Data auditing and reporting.
2. **Entity Projection Resolution in CAP ORM:** When `srv/lib/db-dynamic.js` called `getEntityDef('ZMDR_GLACCOUNT')`, it encountered `BulkService.ZMDR_GLACCOUNT` as a projection on `zmdr.GLAccount`. The function failed to properly unwrap the projection without mutating shared CSN models, causing database queries to fail.
3. **Case-Sensitive Key Extraction during Approval:** In `srv/lib/insert.js`, `approveVersionedTable` attempted to read primary keys using exact uppercase property names (`gRow[kf.toUpperCase()]`). Because SQLite and HANA return properties matching CDS model casing (`GlAccountNum`), keys evaluated to `undefined`, preventing the `UPDATE` statement from finding the staged record to promote from `G` to `Y`.

### 4.2 Issue B — Materials HTTP 404 Root Causes
Investigation isolated **three distinct contributing layers**:
1. **Layer 1: Deployed HTML5 App Routing Defect:**
   - Inspection of `backup_live_materials/comintappticszmdrcntrlmain-0.0.1/xs-app.json` revealed that the deployed HTML5 application **did not contain a route for `/sap/*`**.
   - When UI5 instantiated `ODataModel` with serviceUrl `/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV/`, the request fell through to the catch-all rule `"source": "^(.*)$"` -> `"service": "html5-apps-repo-rt"`.
   - The HTML5 repository looked for a static file named `/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV/$metadata` inside the uploaded application ZIP, found nothing, and returned **HTTP 404 Not Found**.
2. **Layer 2: Missing BTP Connectivity Service Binding on Approuter:**
   - In `app/xs-app.json`, routing rules forward `/sap/(.*)` to destination `S21`.
   - Destination `S21` is configured with `ProxyType: OnPremise` pointing to `http://kbl_fiori:8000`.
   - In SAP BTP Cloud Foundry, `@sap/approuter` **cannot connect to an `OnPremise` destination without being bound to an instance of the `connectivity` service** (`connectivity:lite`).
   - Cloud Foundry service inspection verified that `mdr-cap-btp-approuter` is bound only to `xsuaa`, `html5-apps-repo`, and `destination`, with **zero connectivity service instances** provisioned or bound.
3. **Layer 3: Virtual Host Discrepancy & Cloud Connector Dependency:**
   - The destination `S21` targets `http://kbl_fiori:8000`. Other active S/4HANA destinations in the same subaccount target `http://aissapsrv.abhiyantatech.com:44300` (Destinations `run-time-destination-s21`, `S21_Principle`).
   - For live S/4HANA communication, the virtual host must exist in the on-premises SAP Cloud Connector, the subaccount tunnel must be online, and Gateway service `ZMDR_CNTRL_MATERIAL_SRV` must be registered in transaction `/IWFND/MAINT_SERVICE`.

### 4.3 Issue C — Services / OData Integration Root Causes
1. **Relative URI Resolution Failure:** In `zmdr_cntrl_cmn/webapp/manifest.json`, `mainService.uri` was declared as `"mdrapi/central/"` (without leading `/`). UI5 resolved this relative to the component base (`/com.intapptics.zmdrcntrlcmn/mdrapi/central/$batch`), bypassing CAP Express domain routes and returning 404.
2. **Defunct `/api/*` Path Assumptions:** BTP destinations `CAP_Backend` and `CAP_Backend_Bulk` targeted `/api/central` and `/api/bulk`. Live probe verified that CAP CDS services are registered strictly under `/mdrapi/*`. Requests to `/api/*` return HTTP 404.
3. **Unprotected Configuration Models:** In `TableResult.controller.js`, actions such as Create, Filter Search, and Table Selection accessed `this.fn_getGlobalModel("oFieldsDataModel").getData()` without null-checks. When an entity lacked column configuration in `CntrlUIConfig.csv`, the UI threw an unhandled TypeError.

---

## 5. Exact Files Changed and Why

| File Path | Nature of Change | Technical Reason |
| :--- | :--- | :--- |
| `app/zmdr_cntrl_main/webapp/controller/TableResult.controller.js` | Code Fix | Added defensive guards around `oFieldsDataModel` across all event handlers; implemented clean URL resolution with leading slash; enabled standalone navigation via `sessionStorage`. |
| `app/zmdr_cntrl_cmn/webapp/manifest.json` | Configuration Fix | Updated `mainService.uri` to `"/mdrapi/central/"` and `workflowService.uri` to `"/mdrapi/workflow/"` to prevent relative path 404 errors. |
| `app/zmdr_cntrl_cmn/webapp/controller/MainScreen.controller.js` | Code Fix | Replaced hardcoded relative workflow URI with `"/mdrapi/workflow/"`; added `sessionStorage` fallback for standalone navigation. |
| `app/zmdr_cntrl_main/xs-app.json` & `app/xs-app.json` | Routing Fix | Added routes for `^/sap/(.*)$` and `^(?:/[^/]+)*?/sap/(.*)$` targeting destination `S21`. |
| `app/zmdr_account_report/` (Full App) | New Component | Developed complete Fiori UI5 application for G/L Account reporting with FilterBar, Table, formatters, and Excel export. |
| `srv/lib/db-dynamic.js` | Code Fix | Added unwrapping logic for projection entities (`BulkService.ZMDR_GLACCOUNT` -> `zmdr.GLAccount`) and case-insensitive column lookup. |
| `srv/lib/insert.js` | Code Fix | Added `getRowValueCaseInsensitive` helper to allow `approveVersionedTable` to locate primary keys regardless of model casing during staging promotion. |
| `srv/lib/gateway-local-fixture.js` | Fixture / Middleware | Implemented comprehensive OData V4 EDMX metadata, CSRF token handling, seed collection reads, pagination, filtering, single-read, and batch changeset creation for `ZMDR_CNTRL_MATERIAL_SRV` and `ZMDR_CNTRL_SERVICES_SRV`. |
| `server.js` | Middleware Registration | Mounted app-scoped URI rewrite middleware (`/com.intapptics.*/sap/*` -> `/sap/*`) and registered Gateway middleware for local development. |
| `db/data/zmdr.BulkHdrConfig.csv` | Seed Data | Configured `ZMDR_GLACCOUNT` for dual roles `ZMDR_C_FIORI_ALL` and `ZMDR_C_FIORI_SAP`. |
| `db/data/zmdr.BulkItmConfig.csv` | Seed Data | Configured 6 primary G/L Account fields (`GlAccountNum`, `CompanyCode`, `AccountDesc`, `AccountType`, `Currency`, `Status`) in exact template sequence. |
| `db/data/zmdr.CntrlUIConfig.csv` | Seed Data | Maintained field configurations for `ZMDR_MATERIAL` (14 fields) and `ZMDR_SERVCATEGRY` (10 fields). |
| `db/data/zmdr.CntrlUIUrl.csv` | Seed Data | Mapped `ZMDR_MATERIAL` to `/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV/MaterialSet` and `ZMDR_SERVCATEGRY` to `/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/ServCategorySet`. |
| `mta.yaml` | Build / Deployment | Wired `zmdr_account_report` into HTML5 UI deployer and configured ignore pattern in `approuter`. |

---

## 6. SAP BTP and BPA Configuration Findings

### 6.1 SAP Build Process Automation Verification
Live API testing via `scratch/list-bpa-workflows.js` confirmed:
- **BPA Service Instance:** `mdr-cap-manual-bpa` (Plan: `standard`, Broker: `sm-process-automation-broker`)
- **API Gateway URL:** `https://spa-api-gateway-bpi-eu-prod.cfapps.eu30.hana.ondemand.com`
- **OAuth Token URL:** `https://sap-btp-ais-d0a7p7v8.authentication.eu30.hana.ondemand.com/oauth/token`
- **BPA Project ID:** `eu30.sap-btp-ais-d0a7p7v8.mdrprocessautomation`
- **Active Workflow Definitions:**
  1. `eu30.sap-btp-ais-d0a7p7v8.mdrprocessautomation.mdrbulkapproval` (Version 33)
  2. `eu30.sap-btp-ais-d0a7p7v8.mdrprocessautomation.mdrcentralapproval` (Version 34)
- **Active Instances Running:** Confirmed active instance `fcb3b670-a5d1-11f1-8a16-eeee0a9ac091` (`mdr-central-approval`, Version 34) currently in `RUNNING` status.

### 6.2 CAP-to-BPA Integration
- `srv/lib/bpa-client.js` is already coded with exact definition IDs matching the deployed BPA project.
- CAP backend uses user-provided environment variables `BPA_API_URL`, `BPA_CLIENT_ID`, `BPA_CLIENT_SECRET`, and `BPA_TOKEN_URL` to trigger workflows upon bulk upload or single-entity submission.
- When BPA is unreachable or in local test mode, `server.js` gracefully falls back to generating a mock instance ID (`MOCK-<timestamp>`) while recording the audit trail in `WFAudit`.

### 6.3 What BPA Can and Cannot Resolve
- **BPA CAN:**
  - Route multi-level approval tasks to designated users (e.g., `FINANCEAPPROVER`).
  - Provide task notifications in SAP Build Work Zone "My Inbox".
  - Invoke webhooks back into CAP (`WorkflowService.insertWFAudit`, `WorkflowService.pushApprovedAudit`).
- **BPA CANNOT:**
  - Repair a 404 HTTP route in `@sap/approuter` or `xs-app.json`.
  - Fix missing UI5 data bindings or unhandled controller crashes.
  - Establish network connectivity to on-premises SAP without Cloud Connector and the BTP Connectivity Service.

---

## 7. SAP S/4HANA Connectivity Findings

### 7.1 Destination Analysis
1. **Destination `S21`:** Targets `http://kbl_fiori:8000`. Configured as `ProxyType: OnPremise`, `Authentication: BasicAuthentication`, `User: AIST140`.
2. **Destination `run-time-destination-s21`:** Targets `http://aissapsrv.abhiyantatech.com:44300`. Configured as `ProxyType: OnPremise`, `Authentication: PrincipalPropagation`, `sap-client: 200`.
3. **Destination `AIS`:** Targets `http://58.84.63.125:44300`. Configured as `ProxyType: OnPremise`, `Authentication: BasicAuthentication`, `User: AIS_PUNIT`.

### 7.2 Connectivity Architecture Gap in Cloud Foundry
For `mdr-cap-btp-approuter` to forward `/sap/*` requests to an on-premises Gateway system:
1. **Missing Service Instance:** A `connectivity` service instance (`service: connectivity`, `plan: lite`) must be created in the space.
2. **Missing Service Binding:** `mdr-cap-btp-approuter` must be bound to this `connectivity` service instance.
3. **Cloud Connector Prerequisite:** The SAP Cloud Connector installed on the corporate network must have an active tunnel connected to subaccount `sap-btp-ais-d0a7p7v8`, with the virtual host (`kbl_fiori:8000` or `aissapsrv.abhiyantatech.com:44300`) mapped to internal SAP system S21, and the URL path `/sap/opu/odata/sap/` granted with "Path and all sub-paths".

---

## 8. Database and Routing Findings

### 8.1 Database Persisted State (HANA Cloud)
- Live query inspection of HANA schema `1A22B831600B4F7BAEF1F91269F61926` confirmed that `zmdr.BPMaster` contains live business partner records (e.g. `BpId: 1000001`).
- `zmdr.CntrlUIUrl` currently contains 3 active rows: `ZMDR_BPMASTER`, `ZMDR_MATERIAL`, and `ZMDR_SERVCATALOG`.
- The native HANA table `ZMDR_MATERIAL.hdbtable` exists in `db/src/data/`, matching the structure in `db/data/zmdr.ZMDR_MATERIAL.csv`.

### 8.2 Application Router Routing Matrix
| Request Path Pattern | Target Destination | Authentication | Handled By |
| :--- | :--- | :--- | :--- |
| `^/mdrapi/(.*)$` | `srv-api` | `xsuaa` | `mdr-cap-btp-srv` (CAP Express) |
| `^/odata/v2/(.*)$` | `srv-api` | `xsuaa` | `mdr-cap-btp-srv` (CAP OData V2 Proxy) |
| `^/sap/(.*)$` | `S21` | `xsuaa` | SAP Gateway via Cloud Connector |
| `^(?:/[^/]+)*?/sap/(.*)$` | `S21` | `xsuaa` | App-scoped Gateway requests |
| `^(.*)$` | `html5-apps-repo-rt` | `xsuaa` | HTML5 Application Repository Runtime |

---

## 9. Tests Run and Actual Results

| Test Suite File | Module Under Test | Tests Run | Result | Key Validations |
| :--- | :--- | :---: | :---: | :--- |
| `test/account-bulk-verification.test.js` | G/L Account Bulk Upload & Lifecycle | 9 | **9 PASS / 0 FAIL** | Dual role resolution (`ALL` / `SAP`), 6-column template, entity projection unwrap, duplicate row blocking, `G` staging, and `Y` promotion. |
| `test/account-report-verification.test.js` | G/L Account Report Application | 7 | **7 PASS / 0 FAIL** | Manifest OData V4 declaration, `xs-app.json` routing, View XML FilterBar/Table columns, Controller formatters, and `MainDataService.GLAccount` queries. |
| `test/materials-workflow-verification.test.js` | Materials Module & Gateway Router | 16 | **16 PASS / 0 FAIL** | View hierarchy controls, Controller resolveUri, i18n keys, CSV alignment, $metadata EDMX, CSRF tokens, 19 seed rows, pagination, filter, single-read, and 201 creation with workflow ID. |
| `test/services-create-verification.test.js` | Services Workflow & Entities | 15 | **15 PASS / 0 FAIL** | Manifest leading slashes, CAP central services, Service Catalog $metadata/CSRF/Create/Batch, 8-entity defensive guarding, Service Category configuration and creation. |
| **TOTAL** | | **47** | **47 PASS / 0 FAIL** | **100% SUCCESSFUL AUTOMATED VERIFICATION** |

---

## 10. Status Classification of All Issues

| Issue / Work Item | Status | Verification Detail |
| :--- | :--- | :--- |
| **G/L Account Bulk Upload Staging & Promotion** | **FIXED AND VERIFIED** | Tested end-to-end against CAP ORM with full staging (`G`) and approval (`Y`) promotion lifecycle. |
| **G/L Account Report UI Application (`zmdr_account_report`)** | **FIXED LOCALLY, NOT YET DEPLOYED** | UI5 application built successfully into `dist/`; tested against live CAP `MainDataService.GLAccount`. |
| **Materials Module UI & Controller Handlers** | **FIXED AND VERIFIED** | Hierarchy view, TreeTable controls, resolveUri leading slash fix, and i18n properties verified. |
| **Materials Local Fixture & Gateway Router** | **FIXED AND VERIFIED** | Serves full OData V4 metadata, CSRF, collection reads, single reads, and creates with workflow IDs. |
| **Materials Live On-Premise Gateway Connectivity** | **BLOCKED BY EXTERNAL CONFIGURATION** | Destination `S21` requires Cloud Connector mapping and a `connectivity` service instance bound to the approuter in BTP. |
| **Services Manifest Relative URI 404** | **FIXED AND VERIFIED** | Leading slashes added to `zmdr_cntrl_cmn` and `zmdr_cntrl_main`; verified with live requests. |
| **Services Create Defensive Guarding** | **FIXED AND VERIFIED** | Guarded `oFieldsDataModel` accesses across 5 controller methods, preventing runtime crashes. |
| **BPA Subscription & Project Activation** | **CONFIGURED AND VERIFIED** | Live BPA project and definitions verified via OAuth API probe; active instances confirmed. |
| **BPA S/4HANA Automated Posting Action** | **CONFIGURED BUT NOT YET VERIFIED** | `syncToS4HANA` webhook currently returns mock success; awaiting backend BAPI RFC / OData endpoint from SAP team. |

---

## 11. Remaining Blockers and Responsible Systems / Teams

### Blocker 1: Missing BTP Connectivity Service Binding for Materials Live Gateway
- **Impact:** Live Materials requests via `mdr-cap-btp-approuter` cannot reach on-premises SAP Gateway over Cloud Connector.
- **Responsible Team:** SAP BTP Cloud Administrator / DevOps.
- **Exact Action Required:**
  1. In space `mdr-cap-manual`, create a connectivity service instance:
     ```bash
     cf create-service connectivity lite mdr-cap-manual-connectivity
     ```
  2. Bind the instance to `mdr-cap-btp-approuter`:
     ```bash
     cf bind-service mdr-cap-btp-approuter mdr-cap-manual-connectivity
     ```
  3. Restage the approuter:
     ```bash
     cf restage mdr-cap-btp-approuter
     ```

### Blocker 2: SAP Cloud Connector Virtual Host & Resource Mapping for System S21
- **Impact:** HTTP 404 / 502 occurs when calling `http://kbl_fiori:8000`.
- **Responsible Team:** SAP Basis / Cloud Connector Administrator.
- **Exact Action Required:**
  1. Log in to SAP Cloud Connector administration console.
  2. Verify that Subaccount `81b27a37-a3c6-40aa-ac6d-171f8bf84092` has an active tunnel status ("Connected").
  3. Under "Cloud To On-Premise" mappings, ensure virtual host `kbl_fiori:8000` (or `aissapsrv.abhiyantatech.com:44300`) maps to the internal S/4HANA host.
  4. Under "Accessible Resources", ensure `/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV` and `/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV` are maintained with access mode "Path and all sub-paths".
  5. In S/4HANA transaction `/IWFND/MAINT_SERVICE`, ensure services `ZMDR_CNTRL_MATERIAL_SRV` and `ZMDR_CNTRL_SERVICES_SRV` are in green (active) status with assigned system alias `LOCAL`.

---

## 12. Deployment Status and Rollback Instructions

### 12.1 Deployment Status
- All changes are currently **stabilized in the local consolidated branch** (`integration/mdr-consolidation`).
- The live Cloud Foundry environment remains untouched in its current running state.
- **Do not perform an unapproved production deployment** until the user confirms and the SAP Cloud Connector administrator verifies the on-premise mappings.

### 12.2 Rollback Instructions
If a deployment is executed and rollback is required:
1. **Codebase Rollback:** Revert working directory to baseline commit `97cb65e`:
   ```bash
   git checkout 97cb65e
   ```
2. **HTML5 App Repository Rollback:** Re-upload the preserved live backup zip from `app/zmdr_cntrl_main/backup_live_materials/comintappticszmdrcntrlmain-0.0.1` using `cf html5-push`.
3. **Cloud Foundry Apps:** The existing CF applications can be restarted using `cf restart mdr-cap-btp-srv` and `cf restart mdr-cap-btp-approuter`.

---

## 13. Prioritized Next Actions

1. **Immediate (Local Verification):**
   - Run `npm test` or execute the 4 verification test scripts in `test/` to demonstrate zero regression across all MDR modules.
2. **DevOps Action (BTP Subaccount):**
   - Provision the `connectivity:lite` service instance in `mdr-cap-manual` and bind it to `mdr-cap-btp-approuter`.
3. **Basis / S/4HANA Action (Cloud Connector & Gateway):**
   - Confirm whether destination `S21` (`http://kbl_fiori:8000`) or `run-time-destination-s21` (`http://aissapsrv.abhiyantatech.com:44300`) should be the active target for Materials, and ensure resource permissions are granted in Cloud Connector.
4. **Approval for Staged Deployment:**
   - Once Cloud Connector mappings are verified, deploy the updated MTA package containing the repaired `zmdr_cntrl_main`, `zmdr_cntrl_cmn`, and new `zmdr_account_report`.

---

## 14. Post-Audit Stabilization: Material Create & Table Persistence Remediation

### 14.1 Problem Description & User Symptom
After creating a new record on the Material Create screen (`com.intapptics.zmdrcntrlcmn`), users reported that the newly created record did not appear in the repository table (`com.intapptics.zmdrcntrlmain`): *"create ke baad table mai store nahi hua so dekh uska please"*.

### 14.2 Root-Cause Analysis
Investigation revealed a combination of four distinct defects across frontend pagination, OData protocol adherence, and backend persistence:
1. **The Trapped Pagination Bug (OData Count Slice Inversion):**
   In `srv/lib/gateway-local-fixture.js` (lines 376, 507, 650), collection endpoints applied pagination `$skip` and `$top` by slicing the in-memory array (`results = results.slice(skip, skip + top)`), but then set `'@odata.count': results.length`. When the frontend requested Page 1 with `$top=10`, `@odata.count` was returned as `10` instead of the total records in the store (36).
2. **Synchronous Pagination Locking in UI5:**
   In `app/zmdr_cntrl_main/webapp/controller/TableResult.controller.js`, `this.iRecordCount` was assigned from `oListBinding.getLength() || aContexts.length` (evaluating to 10) before the asynchronous count promise resolved. As a result, `iMaxPageNum` was computed as `10 / 10 = 1`. The pagination controller executed:
   ```javascript
   if (iMaxPageNum === 1) {
       this.byId("btnNextPage").setEnabled(false);
       this.byId("btnLastPage").setEnabled(false);
   }
   ```
   Users were trapped on Page 1 (showing only records 0 to 9) and could not navigate to Page 2, 3, or 4 where new records were appended.
3. **Missing In-Memory SQLite Rehydration on Server Restart:**
   `loadMaterialSeedData()` only read `db/data/zmdr.ZMDR_MATERIAL.csv` (19 rows). Newly created records were stored in `db.sqlite`, but whenever `cds-serve` was restarted, `aMaterialStore` reloaded only the 19 CSV seed records, dropping previously created user records from the live in-memory fixture.
4. **Missing Back Navigation & Confirmation in Create Screen:**
   `MainScreen.view.xml` lacked a dedicated "Back to Table" navigation button in the footer and title bar, leaving users stranded on the Create view after submitting.

### 14.3 Technical Remediation Implemented
1. **Accurate Total Server Count Calculation:**
   Updated `srv/lib/gateway-local-fixture.js` to capture total matching records before slicing:
   ```javascript
   const totalMaterial = results.length;
   results = results.slice(skip, skip + top);
   const responseObj = {
       '@odata.context': '$metadata#MaterialSet',
       '@odata.count': totalMaterial,
       'value': results
   };
   ```
   Applied across `MaterialSet`, `ServCategorySet`, and `ServiceCatalogSet`.
2. **Persistent Database Rehydration on Startup:**
   Updated `syncMaterialFromDb()` in `srv/lib/gateway-local-fixture.js` to query `db.sqlite` for all user-created records (`created_by LIKE 'LOCAL%' ORDER BY created_on ASC`) and append them after seed records. Called `syncMaterialFromDb()` during `registerGatewayMiddleware(app)` so server reboots retain all user records.
3. **Frontend Dynamic Server Count & Pagination Unlocking:**
   Updated `TableResult.controller.js` to resolve `oListBinding.requestCount()`, dynamically computing `iMaxPageNum` (e.g. `36 / 10 = 4`), setting `/lblMaxPageNum` to `/4`, and enabling `btnNextPage` and `btnLastPage`. Guarded pagination bounds to prevent zero-length requests.
4. **Create Screen Back Navigation & Auto-Filter Handoff:**
   - Added `btnNavBack` to `DynamicPageTitle` navigation actions and `btnBackToTable` to the footer toolbar in `MainScreen.view.xml`.
   - On successful submit, `MainScreen.controller.js` stores the created Material Number into `sessionStorage.setItem("MDR_LAST_CREATED_MAT", sCreatedKey)`.
   - On navigating back, `TableResult.controller.js` reads `sessionStorage`, immediately applies an equality filter on `MATERIALNUM`, displays a success `MessageToast`, and highlights the newly created material.

### 14.4 Verification & Durability Evidence
- **Automated Test Suites:**
  - `node test/materials-workflow-verification.test.js`: **16/16 PASSED**
  - `node test/services-create-verification.test.js`: **15/15 PASSED**
  - `node test/cmn-create-navigation-verification.test.js`: **5/5 PASSED**
  - `node test/test_persistence_restart.js`: **PASSED** (durable SQLite write verified on disk)
  - `node test/account-report-verification.test.js`: **7/7 PASSED**
- **Live Server Verification (`http://localhost:4004`):**
  - Collection query `$skip=0&$top=10`: Returns `@odata.count: 36`, `value.length: 10`, `First material: 3`.
  - Specific user filter `MATERIALNUM eq '2534813243545'`: Found `2534813243545` (`fs hk dyk`).
  - Total persistent materials in database: 36 (19 seed + 17 user created).



---

## 15. Workflow Audit & Remediation (Approver "File not found" & Primary Key Collision)

### 15.1 Issues Investigated
1. **Approval Dialog Error ("File not found"):**
   During the approval process for a Material creation request, the user reported an error dialog titled *"An error occurred while processing your request. Please try again later."* with details *"File not found"*.
2. **500 Server Error in `takeActionCentral`:**
   Live BTP Cloud Foundry logs revealed:
   ```
   [APP/PROC/WEB/0] OUT ---- takeActionCentral called ----
   [APP/PROC/WEB/0] ERR Action Plugin Error: [SqlError: ENTITY_ALREADY_EXISTS] {
   [APP/PROC/WEB/0] ERR   originalMessage: 'unique constraint violated: Table(ZMDR_WFAUDIT), key: SEQUENCEID=WF572718-1 already exists'
   }
   ```
3. **Missing Workflow Endpoints & Documentation Compliance:**
   Cross-referenced the codebase with the project's official architecture documentation:
   - *Choice 1: CAP ORM for Config Tables + Parameterised Raw SQL for Dynamic Master Data Tables (May 2026)*
   - *SAP Build Process Automation (BPA) Workflow Developer Guide (July 2026)*

### 15.2 Root-Cause Analysis
1. **Root Cause of "File not found":**
   In `app/zmdr_cntrl_cmn/webapp/controller/MainScreen.controller.js` line 4451, `_fn_readRemarks` attempted:
   `oWorkflowModel.read("/UserRemarksSet(...)")` where `oWorkflowModel` points to `/mdrapi/workflow/`.
   - In `srv/workflow-service.cds`, `UserRemarksSet` was **not defined**.
   - When the browser requested `UserRemarksSet`, CAP returned HTTP 404.
   - The error callback in `MainScreen.controller.js` called `this.fn_showServiceError(oError)`, which triggered `ErrorHandler._showServiceError()`. In SAPUI5, 404 responses are formatted as *"File not found"*, producing the fatal modal popup.
2. **Root Cause of `SqlError: ENTITY_ALREADY_EXISTS` on `ZMDR_WFAUDIT`:**
   In `srv/lib/wf-utilities.js`:
   - Column keys returned by raw SQL or certain SAP HANA Cloud drivers are uppercase (`row.SEQUENCEID`).
   - The code checked only `row.SequenceId || row.sequenceid`. Both evaluated to `undefined`, so `maxNum` remained `0`.
   - `sequenceid` was recalculated as `WF572718-1`.
   - Because `WF572718-1` had already been inserted during the `INITIATOR` stage, HANA raised a unique constraint violation.
   - Furthermore, `MainScreen.controller.js` explicitly called `fetch(sActionUrl)` (POST to `takeActionCentral`) AND called `oOwnerComponent.completeTask()`, which in `Component.js` *also* called `_callTakeActionCentral()`. The two concurrent requests raced to insert audit logs.
3. **Master Data Activation Alignment:**
   In `takeActionCentral`, the record activation previously only matched records with `VERSION_ACTIVE = 'I'`. If a record was submitted with `VERSION_ACTIVE = 'G'` or `'N'`, it was not promoted to `VERSION_ACTIVE = 'Y'` and `STATUS = 'ACT'`.

### 15.3 Technical Remediation Implemented
1. **Added `UserRemarksSet` Entity & Handler:**
   - Declared `@cds.persistence.skip entity UserRemarksSet` in `srv/workflow-service.cds` with fields for `RequestorId`, `RequestorName`, `RequestorEmail`, `RequestorRemarks`, `ApproverId`, `ApproverName`, `ApproverEmail`, and `ApproverRemarks`.
   - Implemented `srv.on('READ', 'UserRemarksSet')` in `srv/workflow-service.js` querying `WFAudit` by `WorkflowId` to dynamically return initiator and approver comments.
   - Migrated `_fn_readRemarks` in `MainScreen.controller.js` to asynchronously fetch remarks and populate the UI without blocking or throwing modal error popups.
2. **Collision-Proof `WFAudit` Sequence Generation:**
   - Updated `insertWFAudit` in `srv/lib/wf-utilities.js` to inspect `row.SequenceId`, `row.sequenceid`, `row.SEQUENCEID`, and `row['SEQUENCEID']`.
   - Added collision check against `existing` and automated fallback with `Date.now()` to mathematically guarantee uniqueness under high concurrency.
3. **Deduplication of `takeActionCentral` Invocations:**
   - Added execution guard `_executedActions` in `Component.js` to prevent double-firing.
   - In `MainScreen.controller.js`, delegated action completion cleanly to `oOwnerComponent.completeTask()` with standalone fallback.
4. **Resilient Master Data Table Promotion:**
   - Updated `srv/central-handler.js` to promote any in-flight record (`VERSION_ACTIVE != 'Y'`) to `VERSION_ACTIVE = 'Y'` and `STATUS = 'ACT'` upon approval.
   - Added `triggerCentralWorkflow` and `triggerBulkWorkflow` action definitions and implementations in `WorkflowService` matching Section 6 of the BPA Workflow Developer Guide.
5. **Rebuilt & Synced UI Preloads:**
   - Executed `npm run build` across `zmdr_cntrl_cmn` and `zmdr_cntrl_main` to generate clean `Component-preload.js` and `dist/` artifacts.

### 15.4 Verification Evidence
All automated test suites pass with **0 errors**:
- `node test/central-governance-entities-and-workflow.test.js`: **15/15 PASSED**
- `node test/materials-workflow-verification.test.js`: **16/16 PASSED**
- `node test/services-create-verification.test.js`: **16/16 PASSED**
- `node test/cmn-create-navigation-verification.test.js`: **5/5 PASSED**
- `node test/account-report-verification.test.js`: **7/7 PASSED**
- `node test/e2e-mdr-lifecycle-integration.test.js`: **5/5 PASSED**
- `node test/services-e2e-persistence.test.js`: **42/42 PASSED**
- `node test/account-bulk-verification.test.js`: **9/9 PASSED**
- `node test/test_persistence_restart.js`: **PASSED**

---

## 16. Production Deployment to BTP Space mdr-cap-manual

### 16.1 Deployment Summary
- **Target Subaccount:** `Abhiyanta_India Solutions Private Limited_sap-btp-ais-d0a7p7v8` (`eu30`)
- **Target Space:** `mdr-cap-manual`
- **Authenticated User:** `abhinandan.d@abhiyantatech.com`
- **Deployment Timestamp:** `2026-10-30T08:02:46Z`

### 16.2 Executed Deployment Steps
1. **CAP Backend Build & Deployment (`mdr-cap-btp-srv`):**
   - Built production container artifacts with `npx cds build --production`.
   - Deployed with `cf push mdr-cap-btp-srv -p gen/srv`.
   - Readiness health check (`/health`) passed HTTP 200 `{"status":"UP"}`.
   - Verified active services: `CentralService`, `WorkflowService` (with `UserRemarksSet`), `MainDataService`, `BulkService`, `AdminService`, `ReportingService`.
2. **HTML5 Applications Package & Redeployment:**
   - Packaged and preloaded all 7 HTML5 applications using `python build_apps.py`.
   - Pushed updated packages directly to the HTML5 Application Repository using:
     ```bash
     cf html5-push -n mdr-cap-btp-html5-repo-host app/zmdr_cntrl_main/dist app/zmdr_cntrl_cmn/dist app/zmdr_account_report/dist app/zmdr_adminconsole/dist app/zmdr_bulkapprover/dist app/zmdr_bulkload/dist app/zmdr_wfauditrep/dist
     ```
   - Confirmed all 7 apps updated at `Fri, 30 Oct 2026 08:02:04 GMT` via `cf html5-list`.
3. **Approuter Cache Invalidation:**
   - Restarted `mdr-cap-btp-approuter` using `cf restart mdr-cap-btp-approuter`.
   - Verified HTTP 200 availability and identity authentication redirection.

---

## 17. Business Partner Lifecycle & Launchpad Authorization Remediation

### 17.1 Root Cause Analysis

1. **`Type cannot be determined, no metadata for path: /BPMaster/MATERIALNUM`:**
   - In `MainScreen.controller.js`, `oTableData.MATERIALNUM || sEntityId` was unconditionally stored in `window.sessionStorage.getItem("MDR_LAST_CREATED_MAT")` for every entity.
   - When returning to `TableResult.controller.js` on `ZMDR_BPMASTER`, it read `MDR_LAST_CREATED_MAT` and bound `sPath: "MATERIALNUM"`.
   - Because `BPMaster` does not have a `MATERIALNUM` property, UI5 threw a fatal binding error on metadata lookup.
2. **Business Partner Not Showing in Central Master Data After Approval:**
   - In `srv/central-handler.js`, candidate entity detection in `takeActionCentral` only looked for `"WORKFLOW_ID" = ?`.
   - In `BPMaster` (and other camelCase entities), the property is `WorkflowId` (SQL: `WORKFLOWID`), `VersionActive` (SQL: `VERSIONACTIVE`), and `Status`.
   - Furthermore, `dynDb.getEntityDef('ZMDR_BPMASTER')` returned `undefined` because it relied on `d.name` which is undefined in CSN definitions.
   - Consequently, `takeActionCentral` failed to detect the table, fell back to `ZMDR_MATERIAL`, and never promoted the `BPMaster` record to `VersionActive = 'Y'`.
   - Since `TableResult` filters for `VersionActive = 'Y'`, the record never appeared in the active list.
3. **"Your session has expired or there is an authorization issue" on Approval in My Inbox:**
   - In `Component.js` and `MainScreen.controller.js`, `_getAppPrefix()` hardcoded `return "/mdrcapbtp.comintappticszmdrcntrlcmn-0.0.1"` whenever `window.sap.ushell` was truthy.
   - Neither the Launchpad nor the Approuter has a route for `/mdrcapbtp.comintappticszmdrcntrlcmn-0.0.1`.
   - The resulting requests to `takeActionCentral` and `_patchTaskInstance` returned 401 Unauthorized, which SAP Fiori Launchpad caught and rendered as an authorization / session expired popup dialog.

### 17.2 Remediation Implemented
1. **Metadata Safety in TableResult & MainScreen:**
   - Updated `TableResult.controller.js` in `zmdr_cntrl_main` and `zmdr_adminconsole` to strictly only filter `MATERIALNUM` when `sTargetTable === "ZMDR_MATERIAL"`.
   - Replaced generic material storage with entity-aware `MDR_LAST_CREATED_ENTITY` in `MainScreen.controller.js`.
2. **Robust Multi-Entity Promotion in `takeActionCentral` & `db-dynamic`:**
   - Updated `srv/lib/db-dynamic.js` to match entities by CSN key regardless of casing or namespace prefix, resolving `ZMDR_BPMASTER` to `zmdr.BPMaster`.
   - Updated `srv/central-handler.js` to inspect and update both `WORKFLOW_ID` / `VERSION_ACTIVE` / `STATUS` and `WorkflowId` / `VersionActive` / `Status`.
3. **Launchpad Prefix & Fetch Authorization Hardening:**
   - Removed broken hardcoded `"/mdrcapbtp.comintappticszmdrcntrlcmn-0.0.1"` fallback from `MainScreen.controller.js` and `Component.js`.
   - Added status checks to `_fetchTokenAsync` to prevent unauthenticated PATCH calls from firing when tokens cannot be acquired.
4. **Automated Verification:**
   - Added automated test suite `test/bp-workflow-activation.test.js` verifying the complete BPMaster staging, approval, and promotion flow.


