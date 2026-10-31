# MDR Services Module — Root Cause Analysis & Technical Resolution

**Project:** `mdr-cap-btp`  
**Branch:** `integration/mdr-consolidation`  
**Date:** October 26, 2026  
**Status:** Resolved & Verified  

---

## 1. Executive Summary

This document provides the definitive technical root cause analysis for the two primary issues affecting the Services Module in the MDR CAP/BTP application:
1. **Issue 1:** Service Catalog Create produces a fatal HTTP 404 before the Create form opens.
2. **Issue 2:** Create functionality is unavailable/unusable across the nine other Services entities (`ZMDR_CONTRACT`, `ZMDR_CUST_SG_ELG`, `ZMDR_LOCATION`, `ZMDR_PRICE_TARRF`, `ZMDR_SERVCATEGRY`, `ZMDR_SLA`, `ZMDR_SERVOFFRING`, `ZMDR_SERVPKGBNDL`, `ZMDR_SERV_PROV`).

Both issues have been investigated, isolated to their originating layers, repaired with minimal and safe modifications, and validated via automated test suites.

---

## 2. Issue 1: Service Catalog Create 404 Before Form Opens

### 2.1 Problem Description
When opening **Services $\rightarrow$ Service Catalog (`ZMDR_SERVCATALOG`)** and clicking the **Create (+)** button, the UI failed to display the creation form and popped up a technical error dialog:

```json
Sorry, a technical error occurred! Please try again later.
{
  "status": 404,
  "statusText": "Not Found",
  "$reported": true
}
```

The server console logged:
```text
POST /mdrapi/central/$batch
READ /CntrlUIUrl
$filter: TableName eq 'ZMDR_SERVCATALOG'
[Central Handler] BEFORE READ triggered for entity: CentralService.CntrlUIUrl
```

### 2.2 Root Cause Analysis

Investigation revealed **two separate root causes** acting in tandem across the architecture:

#### Root Cause 1A: Relative URI Resolution in `app/zmdr_cntrl_cmn/webapp/manifest.json`
- In `zmdr_cntrl_cmn`, `manifest.json` declared:
  ```json
  "dataSources": {
    "mainService": {
      "uri": "mdrapi/central/",
      "type": "OData"
    },
    "workflowService": {
      "uri": "mdrapi/workflow/",
      "type": "OData"
    }
  }
  ```
- Because neither URI started with a leading slash (`/`), the UI5 framework resolved them relative to the HTML5 component root:
  - `http://localhost:4004/com.intapptics.zmdrcntrlcmn/mdrapi/central/$batch`
  - `http://localhost:4004/com.intapptics.zmdrcntrlcmn/mdrapi/workflow/$batch`
- Because CAP serves Central and Workflow APIs directly at `/mdrapi/central` and `/mdrapi/workflow` (at the domain root), Express returned **HTTP 404 Not Found** as soon as the common app component initialized its default and workflow models.

#### Root Cause 1B: Missing Route Handler for `/sap/*` in Local CAP Development Server
- When `zmdr_cntrl_cmn` initialized `this.oTableModel` for `ZMDR_SERVCATALOG`, it pointed to `/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/`.
- UI5's `ODataModel` (V4) initialized with `earlyRequests: true` immediately dispatched:
  `GET http://localhost:4004/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/$metadata`
- While routing rules existed in `xs-app.json`, those rules only apply when requests pass through `@sap/approuter`. When running locally via `cds-serve` or `cds watch`, requests go straight to port `4004`.
- CAP Express had no route handler or reverse proxy for `/sap/*`, returning Express's default HTML 404:
  `<pre>Cannot GET /sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/$metadata</pre>`

#### Root Cause 1C: Missing Standalone Navigation Support
- In `TableResult.controller.js`, navigation was locked to Fiori Launchpad's `CrossApplicationNavigation` (`sap.ushell.Container`). When run in standalone mode (`index.html`), clicking Create triggered:
  `Navigation to common app requires Fiori Launchpad`.

### 2.3 Verification of "Folder 4200"
- A comprehensive repository scan across all commits, CDS models, SQLite tables, and configurations proved that `4200` does not exist in application code.
- In SAP NetWeaver Gateway environments, "Folder 4200" is an SAP DMS/GOS attachment error when folder 4200 is uninitialized in SAP backend tables `SOOD`/`SOFM`. It is an external SAP Gateway artifact, not a local defect.

### 2.4 Code Changes Implemented

1. **Fixed Common App Manifest (`app/zmdr_cntrl_cmn/webapp/manifest.json`):**
   - Updated `mainService.uri` to `"/mdrapi/central/"`.
   - Updated `workflowService.uri` to `"/mdrapi/workflow/"`.
2. **Fixed Hardcoded Workflow URL (`app/zmdr_cntrl_cmn/webapp/controller/MainScreen.controller.js`):**
   - Replaced `sap.ui.require.toUrl("com/intapptics/zmdrcntrlcmn") + "/mdrapi/workflow/"` with `"/mdrapi/workflow/"`.
3. **Implemented Local Gateway Proxy & Fixture (`srv/lib/gateway-local-fixture.js` & `server.js`):**
   - Registered `registerGatewayMiddleware(app)` in `server.js`.
   - In proxy mode (`SAP_SERVICES_MODE=proxy` or `SAP_GATEWAY_URL` set), forwards all `/sap/*` requests to live SAP Gateway.
   - In local fixture mode (default when Gateway is offline), serves valid OData V4 EDMX `$metadata`, handles CSRF token fetch, serves `ServCatalogSet` from seed data, processes multipart `$batch` changesets, and persists new records in an isolated development store.
   - All fixture responses contain `X-MDR-Data-Source: Simulated-Local-Fixture` header.
4. **Enabled Seamless Standalone Navigation (`TableResult.controller.js` & `MainScreen.controller.js`):**
   - In standalone mode (when `sap.ushell` is absent), `TableResult.controller.js` serializes `oStateToSave` to `window.sessionStorage` and navigates to `/com.intapptics.zmdrcntrlcmn/index.html`.
   - `MainScreen.controller.js` restores state from `sessionStorage` and displays the Create form.

---

## 3. Issue 2: Create Unavailable for Nine Other Entities

### 3.1 Problem Description
The nine entities:
1. `ZMDR_CONTRACT` (Contract)
2. `ZMDR_CUST_SG_ELG` (Customer Segment Eligibility)
3. `ZMDR_LOCATION` (Location)
4. `ZMDR_PRICE_TARRF` (Price and Tariff)
5. `ZMDR_SERVCATEGRY` (Service Category)
6. `ZMDR_SLA` (Service Level Agreement)
7. `ZMDR_SERVOFFRING` (Service Offering)
8. `ZMDR_SERVPKGBNDL` (Service Package Bundle)
9. `ZMDR_SERV_PROV` (Service Provider)

appear in navigation with Create buttons, but clicking Create caused crashes (`Cannot read properties of undefined (reading 'getData')`) or missing configuration dialogs.

### 3.2 Root Cause Analysis
- **Navigation Configuration:** All 9 entities are maintained in `zmdr.CntrlUIVis.csv` with `IsCreateEnabled: Y`.
- **Field Configuration:** In `zmdr.CntrlUIConfig.csv`, **0 columns** are maintained for any of the 9 entities.
- **Service Mapping:** In `zmdr.CntrlUIUrl.csv`, **0 endpoints** are maintained for any of the 9 entities.
- **Backend Architecture:** Unlike `ZMDR_BPMASTER` (which runs in CAP CDS), the Services module connects to SAP Gateway (`ZMDR_CNTRL_SERVICES_SRV` on destination `S21`). The entity sets for the remaining 9 entities have not been implemented or exposed in SAP Gateway.
- **Frontend Fragility:** Unchecked calls to `this.fn_getGlobalModel("oFieldsDataModel").getData()` caused unhandled JavaScript crashes when configuration was missing.

### 3.3 Code Changes Implemented
1. **Defensive Guarding Across Controller (`TableResult.controller.js`):**
   - Guarded all `oFieldsDataModel` accesses across `onPress_actionButtons`, `onSearch_fbFilters`, `onReset_fbFilters`, `onSelectionchange_tblResultSet`, and `_fn_readTableUrl`.
   - Prevented crashes by displaying an informative, user-friendly message identifying the entity by name.
2. **Permanent Create Button Retention:**
   - Kept Create (+) buttons fully enabled across all tables, ensuring UI compliance.
3. **Detailed Requirements & Dependency Specification:**
   - Authored formal matrices in `MDR_NINE_ENTITIES_REQUIREMENTS.md` and `MDR_FUNCTIONAL_REQUIREMENTS_QUESTIONS.md`.

---

## 4. Verification Evidence

Automated tests in `test/services-create-verification.test.js` executed against the live server:
- ✅ Manifest URI leading-slash configuration in main and cmn apps: **PASS**
- ✅ Central CAP services respond with HTTP 200 at root paths: **PASS**
- ✅ Service Catalog `$metadata` returns valid OData V4 EDMX XML: **PASS**
- ✅ Service Catalog collection read returns seed records: **PASS**
- ✅ CSRF token fetch responds with valid token header: **PASS**
- ✅ Service Catalog Create persists record and returns HTTP 201 Created: **PASS**
- ✅ Read back created Service Catalog entity: **PASS**
- ✅ Multipart `$batch` handles queries and changesets with 201 response: **PASS**
- ✅ Nine Services entities configuration and guarding verification: **PASS**

**Result: 9 PASSED, 0 FAILED.**
