# MDR CAP BTP — Master Data Repository on SAP BTP

> **Enterprise-grade Master Data Management system** built with SAP Cloud Application Programming (CAP) model,
> migrated from SAP ABAP/Gateway (OData V2) to a fully cloud-native SAP BTP stack using OData V4, HANA Cloud,
> and SAP Build Process Automation (BPA) for multi-level approval workflows.

---

## 🧭 Table of Contents

- [What is this project?](#-what-is-this-project)
- [Why we built this on BTP (instead of ABAP)](#-why-we-built-this-on-btp-instead-of-abap)
- [How it works — System Architecture](#-how-it-works--system-architecture)
- [Project Structure](#-project-structure)
- [Applications Overview](#-applications-overview)
- [Data Model & Key Entities](#-data-model--key-entities)
- [API & Service Layer](#-api--service-layer)
- [Bulk Upload Workflow (End-to-End)](#-bulk-upload-workflow-end-to-end)
- [Approval Workflow (BPA Integration)](#-approval-workflow-bpa-integration)
- [Getting Started — Local Development](#-getting-started--local-development)
- [Deployment to SAP BTP Cloud Foundry](#-deployment-to-sap-btp-cloud-foundry)
- [BTP Services Used](#-btp-services-used)
- [Git Branch Strategy](#-git-branch-strategy)
- [Reference Documentation](#-reference-documentation)

---

## 📌 What is this project?

**MDR (Master Data Repository)** is a centralized system for managing enterprise master data such as:

- **Business Partners** (customers, vendors, employees)
- **GL Accounts**, **Cost Centers**, **Profit Centers**
- **Reference/Lookup Tables** (countries, currencies, payment terms, etc.)

Previously, this system lived entirely in SAP ABAP — using ABAP Function Modules for business logic,
ABAP Gateway (SEGW) for OData V2 services, and standard SAPUI5 apps consuming those V2 services.

**This project re-implements MDR on SAP BTP** using the CAP framework, HANA Cloud, and modern cloud-native
tooling. It provides the same functional capabilities with superior scalability, maintainability, and a
fully managed cloud lifecycle.

---

## ⚡ Why we built this on BTP (instead of ABAP)

| Requirement | ABAP/Gateway | CAP on BTP |
|---|---|---|
| Cloud-native deployment | ❌ On-premise or Private Cloud only | ✅ Cloud Foundry, fully managed |
| Complex return types in APIs | ❌ OData V2 can't return arrays of complex types | ✅ OData V4 natively supports it |
| Version-controlled DB schema | ❌ Manual transport requests | ✅ HDI containers, auto-deployed |
| Modern approval workflows | ❌ ABAP Workflow (SWI\*) — legacy | ✅ SAP Build Process Automation |
| Multi-tenant ready | ❌ Hard to implement | ✅ CAP built-in |
| Open source tooling | ❌ Proprietary ABAP | ✅ Node.js, npm ecosystem |

### The decisive technical reason for OData V4

The Bulk Data upload feature needs to return structured results from the validation step:

```
validData   : array of { data: String }
invalidData : array of { code: String; message: String; rownumber: Integer }
```

**OData V2** (via the CAP compatibility shim) serializes anonymous complex return types as `HTTP 204 No Content`
— the data is silently dropped. **OData V4** handles this natively. This was the deciding factor.

For performance-critical REST operations that still needed custom serialization, we added dedicated
Express REST endpoints directly in `server.js` alongside the OData V4 service.

---

## 🏗 How it works — System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SAP BTP (Cloud Foundry)                  │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           SAP Launchpad Service                      │    │
│  │    (Entry point for all users — shows tiles)        │    │
│  └──────────────────────┬──────────────────────────────┘    │
│                         │  XSUAA Token (OAuth2)             │
│                         ▼                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │         mdr-cap-btp-approuter                        │    │
│  │  (SAP Approuter — Authentication + Route Gateway)   │    │
│  └───┬──────────────────┬──────────────────────────────┘    │
│      │                  │                                    │
│      │ /api/...         │ Static files (HTML, JS, CSS)      │
│      ▼                  ▼                                    │
│  ┌───────────┐  ┌───────────────────────────────────────┐   │
│  │  CAP SRV  │  │   HTML5 App Repository (Runtime)      │   │
│  │  Node.js  │  │   zmdr_cntrl_main  (Central Main)     │   │
│  │           │  │   zmdr_cntrl_cmn   (Central Common)   │   │
│  │  OData V4 │  │   zmdr_bulkload    (Bulk Upload)      │   │
│  │  + REST   │  └───────────────────────────────────────┘   │
│  └─────┬─────┘                                              │
│        │                                                    │
│        ▼                                                    │
│  ┌─────────────────────────────┐  ┌─────────────────────┐  │
│  │  HANA Cloud (HDI Container) │  │  SAP Build Process  │  │
│  │  mdr-cap-manual-hdi         │  │  Automation (BPA)   │  │
│  │                             │  │  Approval Workflows  │  │
│  │  Master Data Tables         │  └─────────────────────┘  │
│  │  Config Tables              │                            │
│  │  Workflow Audit Tables      │                            │
│  └─────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow (Example: Bulk Upload)

```
User (Browser)
  → SAP Launchpad (opens zmdr_bulkload tile)
  → Approuter (validates XSUAA token)
  → HTML5 App Repo (serves UI5 bundle)
  → User uploads Excel file in the UI
  → UI calls POST /api/bulk/rest/validateBulkData
  → Approuter forwards to CAP srv
  → CAP srv validates data against HANA config tables
  → Returns { validData[], invalidData[] }
  → User clicks Submit
  → UI calls POST /api/bulk/rest/submitBulkData
  → CAP srv writes to HANA, creates Workflow ID
  → UI calls POST /api/bulk/rest/triggerBulkWorkflow
  → CAP srv calls SAP BPA API → Approval task created
  → Approver receives notification in BPA Inbox
  → Approver approves/rejects
  → Master data goes LIVE (VERSION_ACTIVE = 'Y')
```

---

## 📁 Project Structure

```
mdr-cap-btp/
│
├── 📂 app/                          # Frontend UI5 Applications
│   ├── xs-app.json                  # Approuter-level routing config
│   ├── package.json                 # Approuter dependencies (@sap/approuter)
│   │
│   ├── 📂 zmdr_cntrl_main/          # Central Master Data — Main List View
│   │   ├── xs-app.json              # App-level HTML5 repo routing
│   │   ├── ui5.yaml                 # UI5 Tooling config
│   │   └── webapp/
│   │       ├── manifest.json        # App descriptor (service bindings)
│   │       ├── controller/          # UI5 MVC Controllers
│   │       └── view/                # XML Views
│   │
│   ├── 📂 zmdr_cntrl_cmn/           # Central Master Data — Detail/Edit Forms
│   │   ├── xs-app.json
│   │   ├── ui5.yaml
│   │   └── webapp/
│   │
│   └── 📂 zmdr_bulkload/            # Bulk Upload Application
│       ├── xs-app.json              # ⚠️ Must have html5-apps-repo-rt catch-all route
│       ├── ui5.yaml
│       └── webapp/
│           ├── manifest.json        # Points to /api/bulk/ OData service
│           └── controller/
│               └── BulkLoad.controller.js  # Core upload/validate/submit logic
│
├── 📂 db/                           # Database Layer (CDS Schema)
│   ├── mdr-config.cds               # Config & workflow support entities
│   ├── mdr-master-data.cds          # Master data entities (BPMASTER, GLACCOUNT, etc.)
│   └── data/                        # Seed CSV files (loaded on deploy)
│       ├── zmdr.BulkHdrConfig.csv
│       ├── zmdr.BulkItmConfig.csv
│       └── zmdr.ZMDXCNAPPSTATS01.csv
│
├── 📂 srv/                          # Service Layer (CAP Node.js)
│   ├── bulk-service.cds             # BulkService — OData V4 + entity projections
│   ├── bulk-handler.js              # BulkService action handlers
│   ├── central-service.cds          # CentralService — OData V4
│   ├── central-handler.js           # CentralService action handlers
│   ├── admin-service.cds            # AdminService — config management
│   ├── workflow-service.cds         # WorkflowService — approval actions
│   ├── workflow-service.js
│   │
│   └── 📂 lib/                      # Business Logic Library Modules
│       ├── process-bulk.js          # Core bulk validate/submit logic (replaces ABAP FM)
│       ├── db-dynamic.js            # Dynamic table operations (CAP ORM + raw SQL bridge)
│       ├── validate.js              # Row-level field validation rules
│       ├── insert.js                # Versioned row insert / BulkTemp storage
│       ├── wf-utilities.js          # Workflow audit, approver resolution
│       ├── wf-id.js                 # Workflow ID generation (number range)
│       └── bpa-client.js            # SAP BPA REST API client
│
├── server.js                        # CAP bootstrap + custom Express REST endpoints
├── mta.yaml                         # MTA build & deployment descriptor
├── package.json                     # Root Node.js dependencies + engine config
├── xs-security.json                 # XSUAA role definitions
└── 📂 docs/                         # Technical documentation
    ├── PROJECT_CHANGES_REFERENCE.md # Full change log with before/after code
    └── mdr_developer_guide_v2.md    # Developer guide
```

---

## 📱 Applications Overview

### 1. `zmdr_cntrl_main` — Central Master Data (Main)

**Purpose:** The main list screen for all master data entities. Users can:
- View all master data records in a searchable table
- Filter by entity type (BPMASTER, GL Account, Vendor, etc.)
- Navigate to create, amend, close, or reopen a record
- Track workflow status of pending changes

**OData Service:** `CentralService` → `/api/central/`

---

### 2. `zmdr_cntrl_cmn` — Central Master Data (Common/Detail)

**Purpose:** The detail form used for creating or editing individual master data records. It is:
- Dynamically driven by `CntrlUIConfig` — the same form renders any entity type
- Shows all fields for the selected entity in configurable sections
- Supports lookup fields (dropdown from reference tables)
- Triggers single-record approval workflow via BPA

**OData Service:** `CentralService` → `/api/central/`

---

### 3. `zmdr_bulkload` — Bulk Upload Application

**Purpose:** Allows bulk creation/amendment of master data via Excel file upload. It:
- Reads configuration to know which entities support bulk upload and what columns are expected
- Parses the uploaded Excel and validates each row against column config and lookup tables
- Shows a split view of valid rows vs invalid rows (with error messages)
- Submits valid rows to HANA with versioning and workflow tracking
- Triggers a bulk approval workflow in SAP BPA

**REST Endpoints:** `/api/bulk/rest/validateBulkData`, `submitBulkData`, `triggerBulkWorkflow`

---

## 🗃 Data Model & Key Entities

### Configuration Entities (drive all app behaviour dynamically)

| Entity | Purpose | Replaces ABAP |
|---|---|---|
| `BulkHdrConfig` | Defines which tables support bulk upload, which role can upload, versioning rules, approver class | `ZMDR_BULKHDRCNFG` |
| `BulkItmConfig` | Per-column config: sequence, key fields, lookup table, date format | `ZMDR_BULKITMCNFG` |
| `BulkDataValidation` | Regex/lookup validation rules indexed per column | `ZMDXCNBLKDTVAL01` |
| `CntrlUIConfig` | Dynamic field layout for Central forms: labels, sections, mandatory/visible flags | `ZMDR_CNTRLUICNFG` |
| `CntrlUIUrl` | Registered entity URLs (which processes support Create/Amend/Close) | `ZMDR_CNTRLUIURL` |
| `CntrlUIApprStage` | Multi-stage approval process definition (current stage → next stage) | `ZMDR_CNTRLUIASTG` |
| `ApproverClass` | Groups of approvers (system, hierarchy, subclass) | `ZMDR_APPROVERCLS` |
| `Approver` | Individual approver assignments per class | `ZMDR_APPROVER` |

### Workflow Support Entities

| Entity | Purpose | Replaces ABAP |
|---|---|---|
| `WFAudit` | Full audit trail of every workflow action (INITIATED, APPROVED, REJECTED) | `ZMDR_WFAUDIT` |
| `MDRWorkflowLink` | Maps MDR internal workflow ID → BPA workflow instance ID | `ZMDR_MDRABAPWF` |
| `WFSequence` | Number range counter for generating sequential workflow IDs | `ZMDR_NR_WF` |
| `BulkTemp` | Temporary storage for in-flight bulk data awaiting approval | `ZMDR_BULKTEMP` |

### Master Data Entities (the actual data being managed)

| Entity | Description |
|---|---|
| `ZMDR_BPMASTER` | Business Partner master data |
| `ZMDR_GLACCOUNT` | General Ledger accounts |
| `ZMDR_EMPLOYEES` | Employee records |
| `ZMDR_VENDORS` | Vendor master |
| `T005` | Countries reference |
| `T002` | Language codes |
| `TCURC` | Currency codes |
| `T052` | Payment terms |
| `TINC` | Incoterms |
| `ZMDR_BP_STATUS` | Business partner status values |
| `ZMDXCNAPPSTATS01` | Application-level status codes (ACTIVE, INACTIVE, BLOCKED, etc.) |

### CDS Aspects (shared fields)

```cds
// Every config/master entity gets these audit fields
aspect Auditable {
  created_on : Timestamp;   created_by : String(12);
  updated_on : Timestamp;   updated_by : String(12);
}

// Versioned entities support time-based active/future records
aspect Versionable {
  version_start_date : Timestamp;
  version_end_date   : Timestamp;
  version_active     : String(1);   // Y=Active, N=Inactive, G=BulkUpdate, F=Future
  workflow_id        : String(10);
}
```

---

## 🔌 API & Service Layer

### OData V4 Services

| Service | Base URL | Description |
|---|---|---|
| `BulkService` | `/api/bulk/` | Bulk upload entities, config reads, WF actions |
| `CentralService` | `/api/central/` | Central master data CRUD + approval actions |
| `AdminService` | `/api/admin/` | Config table management (restricted to admin role) |
| `WorkflowService` | `/api/workflow/` | Cross-cutting workflow actions |

### Custom REST Endpoints (in `server.js`)

These bypass OData serialization for operations that need full control over the response body:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/api/bulk/rest/validateBulkData` | Validate uploaded rows, returns `{validData[], invalidData[]}` |
| `POST` | `/api/bulk/rest/submitBulkData` | Write valid rows to HANA + create workflow ID |
| `POST` | `/api/bulk/rest/triggerBulkWorkflow` | Start BPA approval workflow instance |

**Why custom REST?** CAP OData V4 returns `HTTP 204 No Content` when an action's return type contains
anonymous inline complex types with nested arrays. The REST endpoints bypass this limitation and return
clean JSON directly.

### Library Modules (`srv/lib/`)

| Module | Replaces ABAP | Purpose |
|---|---|---|
| `process-bulk.js` | `ZMDR_FM_PROCESS_BULK_DATA` | Orchestrates validate + insert for each row |
| `db-dynamic.js` | `ZMDR_FM_INSERT_BULK_DATA` | CAP ORM + raw SQL bridge for dynamic table names |
| `validate.js` | `ZMDR_FM_VALIDATE_BULK_DATA` | Key existence check, field validation rules |
| `insert.js` | ABAP versioned INSERT logic | Versioned row creation, BulkTemp storage |
| `wf-utilities.js` | `ZCL_MDR_WF_UTILITIES` | WF audit insert, approver lookup, BPA link save |
| `wf-id.js` | `ZMDR_NR_WF` number range | Generates unique sequential workflow IDs |
| `bpa-client.js` | `ZCL_MDR_BULKWF` | HTTP client for SAP BPA Workflow REST API |

---

## 📤 Bulk Upload Workflow (End-to-End)

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: User selects Entity + Role in zmdr_bulkload app    │
│          → App reads BulkHdrConfig + BulkItmConfig          │
│          → Renders expected columns for Excel template       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 2: User uploads Excel file                            │
│          → Each row is split by « (special delimiter)       │
│          → Column count validated vs BulkItmConfig          │
│          → Lookup values validated (e.g. STATUS → ZMDX...) │
│          → Key fields checked: CREATE (new) vs UPDATE       │
│          POST /api/bulk/rest/validateBulkData (dataload='N') │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 3: UI displays results                                │
│          ✅ Valid Rows  |  ❌ Invalid Rows (with reason)    │
│          User reviews and clicks SUBMIT                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 4: Submit valid rows                                  │
│          → Rows written to HANA (version_active = 'G')      │
│          → Workflow ID generated (BULK-<timestamp>-<seq>)   │
│          → WFAudit row: stage=INITIATOR, action=INITIATED   │
│          POST /api/bulk/rest/submitBulkData (dataload='Y')  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 5: Trigger approval workflow                          │
│          → Reads ApprClass from BulkHdrConfig               │
│          → Resolves Approver list from ApproverClass table  │
│          → Calls BPA API: POST /workflow-instances          │
│          → Saves MDRWorkflowLink (MDR ID ↔ BPA Instance ID) │
│          POST /api/bulk/rest/triggerBulkWorkflow            │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Step 6: Approval (via SAP Build Process Automation)        │
│          → Approver gets task in BPA My Inbox               │
│          → Approver reviews data and APPROVES / REJECTS     │
│          → WFAudit updated: action=APPROVED/REJECTED        │
│          → On APPROVE: version_active updated to 'Y' (LIVE) │
└─────────────────────────────────────────────────────────────┘
```

### Row Data Format

Each Excel row is encoded as a single string using `«` as a column delimiter:
```
VALUE1«VALUE2«VALUE3«VALUE4
```
This convention is inherited from the original ABAP implementation and ensures compatibility with
the `BulkItmConfig.Colseqno` field which defines which position maps to which column name.

---

## 🔄 Approval Workflow (BPA Integration)

### How it connects to SAP Build Process Automation

```javascript
// bpa-client.js — gets an OAuth2 token and starts a workflow
async function getBPAToken() {
    // Uses client_credentials grant
    // Env vars: BPA_TOKEN_URL, BPA_CLIENT_ID, BPA_CLIENT_SECRET
}

async function startBPAWorkflow(processDefinitionId, context) {
    // POST to BPA_API_URL/workflow/rest/v1/workflow-instances
    // Returns the BPA instance ID
}
```

### BPA Workflow Definition IDs

| Workflow | Definition ID | Used for |
|---|---|---|
| Bulk Upload Approval | `mdr-bulk-approval` | Approving bulk data changes |
| Central Data Approval | `mdr-central-approval` | Approving single-record changes |

### Mock Fallback for Local Development

When BPA environment variables are not set, the system falls back automatically:
```javascript
// In server.js triggerBulkWorkflow endpoint:
try {
    bpaInstanceId = await startBulkApprovalWorkflow(context);
} catch (err) {
    console.warn('[BPA] Not configured, using mock:', err.message);
    bpaInstanceId = 'MOCK-' + Date.now();  // Safe local fallback
}
```
This allows end-to-end local testing without a real BPA subscription.

---

## 🚀 Getting Started — Local Development

### Prerequisites

- **Node.js** ≥ 18 (recommend 20 or 22)
- **SAP CDS DK** (globally): `npm install -g @sap/cds-dk`
- **VS Code** with SAP CDS Language Support extension OR **SAP Business Application Studio (BAS)**

### Clone and Setup

```bash
# Clone the repository
git clone https://github.com/Intapptics/mdr-cap-btp.git

# Switch to the active development branch
git checkout ritesh-03

# Install all dependencies
npm install
```

### Initialize Local Database (SQLite)

```bash
# Creates db.sqlite with all tables and loads seed CSV data
npx cds deploy --to sqlite
```

> ⚠️ **Run this every time you change any `.cds` file.** To reset fully:
> ```bash
> rm -f db.sqlite && npx cds deploy --to sqlite
> ```

### Start the Development Server

```bash
npx cds watch
```

The server starts at `http://localhost:4004`. You will see:
- Links to all OData services (`/api/bulk/`, `/api/central/`, etc.)
- Links to all UI5 apps (`/zmdr_bulkload/webapp/`, etc.)

### Opening Apps Locally

Open apps via the CAP welcome page links:
```
http://localhost:4004/zmdr_bulkload/webapp/index.html     ← Bulk Upload
http://localhost:4004/zmdr_cntrl_main/webapp/index.html  ← Central Main
http://localhost:4004/zmdr_cntrl_cmn/webapp/index.html   ← Central Common
```

> ⚠️ Do NOT use the Fiori Tools preview URL. It resolves service URIs relative to a different base path,
> which causes OData 404 errors.

### SQLite vs HANA Behaviour Differences

| Behaviour | SQLite (local) | HANA Cloud (deployed) |
|---|---|---|
| Table naming | `zmdr_TABLENAME` (dot → underscore) | `TABLENAME` (from `@cds.persistence.table`) |
| Column casing | PascalCase (matches CDS element names) | UPPERCASE |
| Authentication | Mocked (no login required) | XSUAA / OAuth2 |
| BPA Workflow | MOCK fallback | Real BPA API |

---

## ☁️ Deployment to SAP BTP Cloud Foundry

### Target Environment

| Setting | Value |
|---|---|
| API Endpoint | `https://api.cf.eu30.hana.ondemand.com` |
| Organization | `Abhiyanta_India Solutions Private Limited_sap-btp-ais-d0a7p7v8` |
| Space | `mdr-cap-manual` |

### Build

Run from the project root in BAS terminal:
```bash
mbt build
```

This executes in sequence:
1. `npm install --omit=dev` (root Node.js dependencies)
2. `npx cds build --production` (compiles CDS → generates `gen/srv` and `gen/db`)
3. For each UI5 app: `npm install` → `npm run build` → zip dist folder
4. Assembles the final `.mtar` archive

### Deploy

```bash
cf deploy mta_archives/mdr-cap-btp_1.0.0.mtar
```

### Deployment Order (MTA orchestrates automatically)

```
1. mdr-cap-btp-db-deployer   → Deploys HANA schema + seed data to HDI container
2. mdr-cap-btp-destinations  → Creates/updates CF destination entries
3. mdr-cap-btp-ui-deployer   → Uploads all 3 UI5 apps to HTML5 App Repo
4. mdr-cap-btp-srv           → Starts CAP Node.js backend (OData + REST)
5. mdr-cap-btp-approuter     → Starts Approuter (auth gateway)
```

### Critical: Node.js Engine Version

SAP BTP CF (`cflinuxfs4` stack, EU30) only provides these Node.js versions (as of mid-2026):
- `22.22.2`, `24.14.0`, `24.15.0`

Node 18 and Node 20 have been **removed** from the buildpack. The `engines` field in `package.json` MUST be:
```json
"engines": { "node": ">=18" }
```
Using `"^18.0.0 || ^20.0.0"` will cause `BuildpackCompileFailed` because no binary matches.

### Connecting BPA (after deployment)

```bash
cf set-env mdr-cap-btp-srv BPA_TOKEN_URL "https://<subaccount>.authentication.eu10.hana.ondemand.com/oauth/token"
cf set-env mdr-cap-btp-srv BPA_CLIENT_ID "<clientid>"
cf set-env mdr-cap-btp-srv BPA_CLIENT_SECRET "<secret>"
cf set-env mdr-cap-btp-srv BPA_API_URL "https://api.workflow.cfapps.eu10.hana.ondemand.com"
cf restart mdr-cap-btp-srv
```

---

## 🛠 BTP Services Used

| Service Instance Name | BTP Service | Plan | Purpose |
|---|---|---|---|
| `mdr-cap-manual-hdi` | `hana` (HDI) | `hdi-shared` | HANA Cloud database container |
| `mdr-cap-manual-auth` | `xsuaa` | `application` | Authentication & authorization (XSUAA) |
| `mdr-cap-manual-dest` | `destination` | `lite` | Connectivity destinations |
| `mdr-btp-destination` | `destination` | `lite` | Managed destinations (auto-created by MTA) |
| `mdr-cap-btp-html5-repo-host` | `html5-apps-repo` | `app-host` | Stores uploaded UI5 app bundles |
| `mdr-cap-btp-html5-runtime` | `html5-apps-repo` | `app-runtime` | Serves UI5 apps to browser at runtime |

> ⚠️ **NEVER rename these service instances.** They are bound to existing deployed modules and renaming
> will break all bindings and require a full redeployment.

---

## 🌿 Git Branch Strategy

| Branch | Purpose | Status |
|---|---|---|
| `main` | Production-ready stable code | Protected |
| `Odatav4` | Active V4 migration development branch | Active |
| `ritesh-03` | Current working branch: BPA + deployment fixes | **Current** |

### Development workflow

```
Write code in BAS (Business Application Studio)
        │
        │ git add . && git commit -m "feat: ..." && git push origin ritesh-03
        ▼
GitHub — ritesh-03 branch
        │
        │ git fetch origin && git checkout ritesh-03 && git pull origin ritesh-03
        ▼
Local VS Code (for review, testing, documentation)
```

### Quick commands

```bash
# Push your changes from BAS
git add .
git commit -m "feat: describe what you changed"
git push origin ritesh-03

# Pull latest to VS Code
git fetch origin
git stash                        # Save any local edits
git checkout ritesh-03
git pull origin ritesh-03
git stash pop                    # Restore local edits if needed
```

---

## 📚 Reference Documentation

| Document | Location | Description |
|---|---|---|
| Project Changes Reference | [`docs/PROJECT_CHANGES_REFERENCE.md`](docs/PROJECT_CHANGES_REFERENCE.md) | Full file-by-file change log with before/after code, all issue fixes, env vars |
| Developer Guide v2 | [`docs/mdr_developer_guide_v2.md`](docs/mdr_developer_guide_v2.md) | Detailed developer guide for the V4 migration |
| Architecture Overview | [`docs/mdr_architecture_overview.md`](docs/mdr_architecture_overview.md) | System architecture diagrams |
| CAP Documentation | https://cap.cloud.sap/docs | Official SAP CAP framework docs |
| SAP BPA Workflow API | https://help.sap.com/docs/build-process-automation | BPA REST API reference |

---

## 👨‍💻 Quick Reference Card

```bash
# 🔧 Local development
npm install                                    # Install dependencies
rm -f db.sqlite && npx cds deploy --to sqlite # Reset + init local DB
npx cds watch                                  # Start dev server → localhost:4004

# 🏗 Build for deployment
mbt build                                      # Generates mta_archives/*.mtar

# 🚀 Deploy to Cloud Foundry
cf login -a https://api.cf.eu30.hana.ondemand.com
cf target -o "Abhiyanta_India Solutions Private Limited_sap-btp-ais-d0a7p7v8" -s mdr-cap-manual
cf deploy mta_archives/mdr-cap-btp_1.0.0.mtar

# 🔍 Troubleshoot deployed apps
cf logs mdr-cap-btp-srv --recent            # Backend logs
cf logs mdr-cap-btp-approuter --recent      # Approuter logs
cf apps                                      # Check app status
cf env mdr-cap-btp-srv                      # Check env variables
```

---

*Project: MDR CAP BTP | Branch: ritesh-03 | Last Updated: July 2026*
*Migrated from: SAP ABAP Gateway (OData V2) → SAP CAP BTP (OData V4)*
