'use strict';

/**
 * gateway-local-fixture.js
 *
 * Local Development Proxy & Fixture for SAP Gateway Services.
 * Specifically handles /sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/
 *
 * MODES:
 * 1. PROXY MODE (process.env.SAP_SERVICES_MODE === 'proxy' or process.env.SAP_GATEWAY_URL):
 *    Forwards /sap/* requests to a live SAP Gateway host when network/VPN is connected.
 * 2. FIXTURE MODE (Default in development when Gateway is unreachable):
 *    Serves simulated OData V4 responses grounded strictly in existing CSV configurations.
 *    Provides $metadata, CSRF token handling, ServCatalogSet query, and Create/Save with an
 *    isolated in-memory store.
 * 3. DISABLED in production (NODE_ENV === 'production').
 */

const fs = require('fs');
const path = require('path');
const cds = require('@sap/cds');

// Determine operational mode
function getMode() {
    if (process.env.SAP_SERVICES_MODE === 'disabled') {
        return 'disabled';
    }
    if (process.env.SAP_SERVICES_MODE === 'proxy' || process.env.SAP_GATEWAY_URL) {
        return 'proxy';
    }
    return 'fixture';
}

// Helper to resolve CSV seed file paths across different runtime environments
function resolveCsvPath(filename) {
    const candidates = [
        path.resolve(__dirname, '../../db/data', filename),
        path.resolve(__dirname, '../../../db/data', filename),
        path.resolve(process.cwd(), 'db/data', filename),
        path.resolve(process.cwd(), 'gen/srv/db/data', filename)
    ];
    for (const c of candidates) {
        if (fs.existsSync(c)) return c;
    }
    return candidates[0];
}

// Load seed data from zmdr.ZMDR_SERVCATALOG.csv
function loadSeedData() {
    const csvPath = resolveCsvPath('zmdr.ZMDR_SERVCATALOG.csv');
    if (!fs.existsSync(csvPath)) {
        return [];
    }

    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const records = [];

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        const values = [];
        let inQuotes = false;
        let current = '';
        for (let c = 0; c < row.length; c++) {
            const char = row[c];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        const record = {};
        headers.forEach((h, idx) => {
            record[h] = values[idx] || '';
        });
        if (!record.VERSION_ACTIVE) record.VERSION_ACTIVE = 'Y';
        record.VersionActive = record.VERSION_ACTIVE;
        records.push(record);
    }

    return records;
}

// In-memory isolated development store
let aServiceCatalogStore = loadSeedData();

// Load seed data from zmdr.ZMDR_SERVCATEGRY.csv
function loadCategorySeedData() {
    const csvPath = resolveCsvPath('zmdr.ZMDR_SERVCATEGRY.csv');
    if (!fs.existsSync(csvPath)) {
        return [];
    }

    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const records = [];

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        const values = [];
        let inQuotes = false;
        let current = '';
        for (let c = 0; c < row.length; c++) {
            const char = row[c];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        const record = {};
        headers.forEach((h, idx) => {
            record[h] = values[idx] || '';
        });
        if (!record.VERSION_ACTIVE) record.VERSION_ACTIVE = 'Y';
        record.VersionActive = record.VERSION_ACTIVE;
        records.push(record);
    }

    return records;
}

let aServiceCategoryStore = loadCategorySeedData();

// Load seed data from zmdr.ZMDR_MATERIAL.csv
function loadMaterialSeedData() {
    const csvPath = resolveCsvPath('zmdr.ZMDR_MATERIAL.csv');
    if (!fs.existsSync(csvPath)) {
        return [];
    }

    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const records = [];

    for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        const values = [];
        let inQuotes = false;
        let current = '';
        for (let c = 0; c < row.length; c++) {
            const char = row[c];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        const record = {};
        headers.forEach((h, idx) => {
            record[h] = values[idx] || '';
        });
        if (!record.VERSION_ACTIVE) record.VERSION_ACTIVE = 'Y';
        record.VersionActive = record.VERSION_ACTIVE;
        records.push(record);
    }

    return records;
}

let aMaterialStore = loadMaterialSeedData();

// In-memory stores for 8 Services entities
let aContractStore = [
    { CONTRACT_ID: "CON001", CONTRACT_NAME: "Annual Facility Maintenance", CONTRACT_DESC: "Facility management SLA", CONTRACT_TYPE: "Maintenance", START_DATE: "2026-01-01", END_DATE: "2026-12-31", VENDOR_ID: "VEND1001", CONTRACT_STATUS: "Active", WORKFLOW_ID: "WF100001", STATUS: "510", VERSION_START_DATE: "2026-01-01T00:00:00Z", VERSION_END_DATE: "9999-12-31T23:59:59Z", VERSION_ACTIVE: "Y", VersionActive: "Y" }
];
let aCustSegmentStore = [
    { SEGMENT_ID: "CSG001", SEGMENT_NAME: "Enterprise Prime Tier", SEGMENT_DESC: "Enterprise clients >$1M ARR", ELIGIBILITY_RULE: "ARR > 1000000", EFFECTIVE_DATE: "2026-01-01", EXPIRY_DATE: "2099-12-31", WORKFLOW_ID: "WF100002", STATUS: "510", VERSION_START_DATE: "2026-01-01T00:00:00Z", VERSION_END_DATE: "9999-12-31T23:59:59Z", VERSION_ACTIVE: "Y", VersionActive: "Y" }
];
let aLocationStore = [
    { LOCATION_ID: "LOC001", LOCATION_NAME: "Mumbai Central Hub", LOCATION_TYPE: "Operations Hub", COUNTRY: "IND", REGION: "MH", CITY: "Mumbai", POSTAL_CODE: "400001", WORKFLOW_ID: "WF100003", STATUS: "510", VERSION_START_DATE: "2026-01-01T00:00:00Z", VERSION_END_DATE: "9999-12-31T23:59:59Z", VERSION_ACTIVE: "Y", VersionActive: "Y" }
];
let aPriceTariffStore = [
    { TARIFF_ID: "TRF001", TARIFF_NAME: "Standard Peak Rate", TARIFF_DESC: "Standard hourly support", RATE_TYPE: "Hourly", CURRENCY: "INR", UNIT_PRICE: 2500.00, EFFECTIVE_DATE: "2026-01-01", WORKFLOW_ID: "WF100004", STATUS: "510", VERSION_START_DATE: "2026-01-01T00:00:00Z", VERSION_END_DATE: "9999-12-31T23:59:59Z", VERSION_ACTIVE: "Y", VersionActive: "Y" }
];
let aSLAStore = [
    { SLA_ID: "SLA001", SLA_NAME: "Mission Critical 24x7", SLA_DESC: "15-minute response SLA", RESPONSE_TIME_HRS: 1, RESOLUTION_TIME_HRS: 4, COVERAGE_HOURS: "24x7", WORKFLOW_ID: "WF100005", STATUS: "510", VERSION_START_DATE: "2026-01-01T00:00:00Z", VERSION_END_DATE: "9999-12-31T23:59:59Z", VERSION_ACTIVE: "Y", VersionActive: "Y" }
];
let aServOfferingStore = [
    { OFFERING_ID: "SOF001", OFFERING_NAME: "Managed Cloud Compute", OFFERING_DESC: "Cloud infrastructure operations", OFFERING_TYPE: "Infrastructure", CATALOG_ID: "CAT001", EFFECTIVE_DATE: "2026-01-01", WORKFLOW_ID: "WF100006", STATUS: "510", VERSION_START_DATE: "2026-01-01T00:00:00Z", VERSION_END_DATE: "9999-12-31T23:59:59Z", VERSION_ACTIVE: "Y", VersionActive: "Y" }
];
let aServPkgBundleStore = [
    { BUNDLE_ID: "BND001", BUNDLE_NAME: "Enterprise Starter Suite", BUNDLE_DESC: "Compute, storage and support", BUNDLE_TYPE: "Bundle", PRICE: 150000.00, CURRENCY: "INR", WORKFLOW_ID: "WF100007", STATUS: "510", VERSION_START_DATE: "2026-01-01T00:00:00Z", VERSION_END_DATE: "9999-12-31T23:59:59Z", VERSION_ACTIVE: "Y", VersionActive: "Y" }
];
let aServProviderStore = [
    { PROVIDER_ID: "PRV001", PROVIDER_NAME: "Abhiyanta Cloud Solutions", PROVIDER_TYPE: "Internal", CONTACT_PERSON: "Operations Lead", EMAIL: "ops@abhiyanta.com", PHONE: "+91-9876543210", WORKFLOW_ID: "WF100008", STATUS: "510", VERSION_START_DATE: "2026-01-01T00:00:00Z", VERSION_END_DATE: "9999-12-31T23:59:59Z", VERSION_ACTIVE: "Y", VersionActive: "Y" }
];


const SERVICES_REGISTRY = {
    'ServCatalogSet': { key: 'CATALOG_ID', store: aServiceCatalogStore, name: 'ServCatalog', table: 'zmdr_ZMDR_SERVCATALOG' },
    'ServCategorySet': { key: 'CATEGORY_ID', store: aServiceCategoryStore, name: 'ServCategory', table: 'zmdr_ZMDR_SERVCATEGRY' },
    'ContractSet': { key: 'CONTRACT_ID', store: aContractStore, name: 'Contract', table: 'zmdr_ZMDR_CONTRACT' },
    'CustSegmentElgSet': { key: 'SEGMENT_ID', store: aCustSegmentStore, name: 'CustSegmentElg', table: 'zmdr_ZMDR_CUST_SG_ELG' },
    'LocationSet': { key: 'LOCATION_ID', store: aLocationStore, name: 'Location', table: 'zmdr_ZMDR_LOCATION' },
    'PriceTariffSet': { key: 'TARIFF_ID', store: aPriceTariffStore, name: 'PriceTariff', table: 'zmdr_ZMDR_PRICE_TARRF' },
    'SLASet': { key: 'SLA_ID', store: aSLAStore, name: 'SLA', table: 'zmdr_ZMDR_SLA' },
    'ServOfferingSet': { key: 'OFFERING_ID', store: aServOfferingStore, name: 'ServOffering', table: 'zmdr_ZMDR_SERVOFFRING' },
    'ServPkgBundleSet': { key: 'BUNDLE_ID', store: aServPkgBundleStore, name: 'ServPkgBundle', table: 'zmdr_ZMDR_SERVPKGBNDL' },
    'ServProviderSet': { key: 'PROVIDER_ID', store: aServProviderStore, name: 'ServProvider', table: 'zmdr_ZMDR_SERV_PROV' }
};

function persistServiceRecord(tableName, keyProp, record) {
    getDbInstance().then(async db => {
        if (!db) return;
        const dbRecord = { ...record };
        delete dbRecord.VersionActive;
        const targetEntity = tableName.startsWith('zmdr.') ? tableName : `zmdr.${tableName.replace(/^zmdr_/, '')}`;
        try {
            return await db.run(UPSERT.into(targetEntity).entries(dbRecord));
        } catch (_) {
            const keys = Object.keys(dbRecord);
            const cols = keys.map(k => '"' + k + '"').join(', ');
            const placeholders = keys.map(() => '?').join(', ');
            const values = keys.map(k => dbRecord[k] !== undefined ? dbRecord[k] : null);
            return db.run(`INSERT INTO ${tableName} (${cols}) VALUES (${placeholders})`, values).catch(() => null);
        }
    }).catch(err => console.error(`[MDR Gateway Fixture] DB persist error for ${tableName}:`, err.message));
}

function syncServicesFromDb() {
    getDbInstance().then(db => {
        if (!db) return;
        for (const [setName, meta] of Object.entries(SERVICES_REGISTRY)) {
            const table = meta.table;
            const keyProp = meta.key;
            const store = meta.store;
            db.run(`SELECT * FROM ${table} WHERE VERSION_ACTIVE = 'Y' OR VersionActive = 'Y' ORDER BY created_on DESC`).then(rows => {
                if (rows && rows.length > 0) {
                    rows.forEach(row => {
                        row.VERSION_ACTIVE = row.VERSION_ACTIVE || 'Y';
                        row.VersionActive = row.VERSION_ACTIVE;
                        const idx = store.findIndex(r => r[keyProp] === String(row[keyProp]));
                        if (idx >= 0) {
                            store[idx] = { ...store[idx], ...row };
                        } else {
                            store.unshift(row);
                        }
                    });
                }
            }).catch(() => {});
        }
    }).catch(() => {});
}



async function getDbInstance() {
    if (cds && cds.db) return cds.db;
    try {
        const db = await cds.connect.to('db');
        if (db) return db;
    } catch (e) {}
    try {
        const dbPath = path.resolve(__dirname, '../../db.sqlite');
        if (fs.existsSync(dbPath)) {
            return await cds.connect.to({ kind: 'sqlite', credentials: { url: dbPath } });
        }
    } catch (e) {}
    return null;
}

function persistMaterialRecord(record) {
    getDbInstance().then(async db => {
        if (!db) return;
        const dbRecord = {
            MATERIALNUM: record.MATERIALNUM,
            VERSION_START_DATE: record.VERSION_START_DATE || new Date().toISOString(),
            MATERIALDESC: record.MATERIALDESC || null,
            MATERIALGROUP: record.MATERIALGROUP || null,
            MATERIALTYPE: record.MATERIALTYPE || 'ROH',
            MEASUREBASEUNIT: record.MEASUREBASEUNIT || 'EA',
            OLD_MATNUM: record.OLD_MATNUM || null,
            EXTERNAL_MATGRP: record.EXTERNAL_MATGRP || null,
            DIVISION: record.DIVISION || null,
            GENITEMCATGRP: record.GENITEMCATGRP || null,
            PRODHIER: record.PRODHIER || null,
            AUTHGROUP: record.AUTHGROUP || null,
            CROSSPLANTCM: record.CROSSPLANTCM || null,
            WORKFLOW_ID: record.WORKFLOW_ID || null,
            STATUS: record.STATUS || '510',
            VERSION_END_DATE: record.VERSION_END_DATE || '9999-12-31T23:59:59Z',
            VERSION_ACTIVE: record.VERSION_ACTIVE || record.VersionActive || 'I',
            created_on: record.created_on || new Date().toISOString(),
            created_by: record.created_by || 'LOCAL_DEV',
            updated_on: record.updated_on || new Date().toISOString(),
            updated_by: record.updated_by || 'LOCAL_DEV'
        };
        try {
            return await db.run(UPSERT.into('zmdr.ZMDR_MATERIAL').entries(dbRecord));
        } catch (_) {
            return await db.run(
                `INSERT INTO zmdr_ZMDR_MATERIAL 
                (MATERIALNUM, VERSION_START_DATE, MATERIALDESC, MATERIALGROUP, MATERIALTYPE, MEASUREBASEUNIT, OLD_MATNUM, EXTERNAL_MATGRP, DIVISION, GENITEMCATGRP, PRODHIER, AUTHGROUP, CROSSPLANTCM, WORKFLOW_ID, STATUS, VERSION_END_DATE, VERSION_ACTIVE, created_on, created_by, updated_on, updated_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    dbRecord.MATERIALNUM,
                    dbRecord.VERSION_START_DATE,
                    dbRecord.MATERIALDESC,
                    dbRecord.MATERIALGROUP,
                    dbRecord.MATERIALTYPE,
                    dbRecord.MEASUREBASEUNIT,
                    dbRecord.OLD_MATNUM,
                    dbRecord.EXTERNAL_MATGRP,
                    dbRecord.DIVISION,
                    dbRecord.GENITEMCATGRP,
                    dbRecord.PRODHIER,
                    dbRecord.AUTHGROUP,
                    dbRecord.CROSSPLANTCM,
                    dbRecord.WORKFLOW_ID,
                    dbRecord.STATUS,
                    dbRecord.VERSION_END_DATE,
                    dbRecord.VERSION_ACTIVE,
                    dbRecord.created_on,
                    dbRecord.created_by,
                    dbRecord.updated_on,
                    dbRecord.updated_by
                ]
            ).catch(() => null);
        }
    }).catch(err => console.error('[MDR Gateway Fixture] DB persist error:', err.message));
}

function syncMaterialFromDb() {
    getDbInstance().then(db => {
        if (!db) return;
        return db.run("SELECT * FROM zmdr_ZMDR_MATERIAL WHERE created_by = 'LOCAL_DEVELOPER' OR created_by = 'LOCAL_DEV' ORDER BY created_on ASC").then(rows => {
            if (rows && rows.length > 0) {
                rows.forEach(row => {
                    row.VersionActive = row.VERSION_ACTIVE || 'Y';
                    row.VersionStartDate = row.VERSION_START_DATE;
                    row.Status = row.STATUS;
                    row.WorkflowId = row.WORKFLOW_ID;
                    row.MaterialNum = row.MATERIALNUM;
                    row.MaterialDesc = row.MATERIALDESC;
                    row.MaterialType = row.MATERIALTYPE;
                    row.MaterialGroup = row.MATERIALGROUP;
                    row.MeasureBaseUnit = row.MEASUREBASEUNIT;
                    const idx = aMaterialStore.findIndex(r => r.MATERIALNUM === String(row.MATERIALNUM));
                    if (idx >= 0) {
                        aMaterialStore[idx] = { ...aMaterialStore[idx], ...row };
                    } else {
                        aMaterialStore.push(row);
                    }
                });
            }
        });
    }).catch(() => {});
}


// OData V4 EDMX Metadata for ZMDR_CNTRL_SERVICES_SRV
const METADATA_XML = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="ZMDR_CNTRL_SERVICES_SRV" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="ServCatalog">
        <Key>
          <PropertyRef Name="CATALOG_ID"/>
        </Key>
        <Property Name="CATALOG_ID" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="CATALOG_NAME" Type="Edm.String" MaxLength="100"/>
        <Property Name="CATALOG_DESC" Type="Edm.String" MaxLength="255"/>
        <Property Name="CATALOG_TYPE" Type="Edm.String" MaxLength="30"/>
        <Property Name="EFFECTIVE_DATE" Type="Edm.Date"/>
        <Property Name="EXPIRY_DATE" Type="Edm.Date"/>
        <Property Name="OWNER_ID" Type="Edm.String" MaxLength="10"/>
        <Property Name="CATALOG_STATUS" Type="Edm.String" MaxLength="20"/>
        <Property Name="WORKFLOW_ID" Type="Edm.String" MaxLength="10"/>
        <Property Name="STATUS" Type="Edm.String" MaxLength="3"/>
        <Property Name="VERSION_START_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="VERSION_END_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="VERSION_ACTIVE" Type="Edm.String" MaxLength="1"/>
        <Property Name="VersionActive" Type="Edm.String" MaxLength="1"/>
      </EntityType>
      <EntityType Name="ServCategory">
        <Key>
          <PropertyRef Name="CATEGORY_ID"/>
        </Key>
        <Property Name="CATEGORY_ID" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="CATEGORY_NAME" Type="Edm.String" MaxLength="100"/>
        <Property Name="CATEGORY_DESC" Type="Edm.String" MaxLength="255"/>
        <Property Name="CATEGORY_TYPE" Type="Edm.String" MaxLength="30"/>
        <Property Name="PARENT_CAT_ID" Type="Edm.String" MaxLength="10"/>
        <Property Name="EFFECTIVE_DATE" Type="Edm.Date"/>
        <Property Name="EXPIRY_DATE" Type="Edm.Date"/>
        <Property Name="CATEGORY_STATUS" Type="Edm.String" MaxLength="20"/>
        <Property Name="WORKFLOW_ID" Type="Edm.String" MaxLength="10"/>
        <Property Name="STATUS" Type="Edm.String" MaxLength="3"/>
        <Property Name="VERSION_START_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="VERSION_END_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="VERSION_ACTIVE" Type="Edm.String" MaxLength="1"/>
        <Property Name="VersionActive" Type="Edm.String" MaxLength="1"/>
      </EntityType>
      <EntityType Name="Contract">
        <Key>
          <PropertyRef Name="CONTRACT_ID"/>
        </Key>
        <Property Name="CONTRACT_ID" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="CONTRACT_NAME" Type="Edm.String" MaxLength="100"/>
        <Property Name="CONTRACT_DESC" Type="Edm.String" MaxLength="255"/>
        <Property Name="CONTRACT_TYPE" Type="Edm.String" MaxLength="30"/>
        <Property Name="START_DATE" Type="Edm.Date"/>
        <Property Name="END_DATE" Type="Edm.Date"/>
        <Property Name="VENDOR_ID" Type="Edm.String" MaxLength="10"/>
        <Property Name="CONTRACT_STATUS" Type="Edm.String" MaxLength="20"/>
        <Property Name="WORKFLOW_ID" Type="Edm.String" MaxLength="10"/>
        <Property Name="STATUS" Type="Edm.String" MaxLength="3"/>
        <Property Name="VERSION_START_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="VERSION_END_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="VERSION_ACTIVE" Type="Edm.String" MaxLength="1"/>
        <Property Name="VersionActive" Type="Edm.String" MaxLength="1"/>
      </EntityType>
      <EntityType Name="CustSegmentElg">
        <Key>
          <PropertyRef Name="SEGMENT_ID"/>
        </Key>
        <Property Name="SEGMENT_ID" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="SEGMENT_NAME" Type="Edm.String" MaxLength="100"/>
        <Property Name="SEGMENT_DESC" Type="Edm.String" MaxLength="255"/>
        <Property Name="ELIGIBILITY_RULE" Type="Edm.String" MaxLength="50"/>
        <Property Name="EFFECTIVE_DATE" Type="Edm.Date"/>
        <Property Name="EXPIRY_DATE" Type="Edm.Date"/>
        <Property Name="WORKFLOW_ID" Type="Edm.String" MaxLength="10"/>
        <Property Name="STATUS" Type="Edm.String" MaxLength="3"/>
        <Property Name="VERSION_START_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="VERSION_END_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="VERSION_ACTIVE" Type="Edm.String" MaxLength="1"/>
        <Property Name="VersionActive" Type="Edm.String" MaxLength="1"/>
      </EntityType>
      <EntityType Name="Location">
        <Key>
          <PropertyRef Name="LOCATION_ID"/>
        </Key>
        <Property Name="LOCATION_ID" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="LOCATION_NAME" Type="Edm.String" MaxLength="100"/>
        <Property Name="LOCATION_TYPE" Type="Edm.String" MaxLength="30"/>
        <Property Name="COUNTRY" Type="Edm.String" MaxLength="3"/>
        <Property Name="REGION" Type="Edm.String" MaxLength="30"/>
        <Property Name="CITY" Type="Edm.String" MaxLength="40"/>
        <Property Name="POSTAL_CODE" Type="Edm.String" MaxLength="10"/>
        <Property Name="WORKFLOW_ID" Type="Edm.String" MaxLength="10"/>
        <Property Name="STATUS" Type="Edm.String" MaxLength="3"/>
        <Property Name="VERSION_START_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="VERSION_END_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="VERSION_ACTIVE" Type="Edm.String" MaxLength="1"/>
        <Property Name="VersionActive" Type="Edm.String" MaxLength="1"/>
      </EntityType>
      <EntityType Name="PriceTariff">
        <Key>
          <PropertyRef Name="TARIFF_ID"/>
        </Key>
        <Property Name="TARIFF_ID" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="TARIFF_NAME" Type="Edm.String" MaxLength="100"/>
        <Property Name="TARIFF_DESC" Type="Edm.String" MaxLength="255"/>
        <Property Name="RATE_TYPE" Type="Edm.String" MaxLength="20"/>
        <Property Name="CURRENCY" Type="Edm.String" MaxLength="5"/>
        <Property Name="UNIT_PRICE" Type="Edm.Decimal" Precision="13" Scale="2"/>
        <Property Name="EFFECTIVE_DATE" Type="Edm.Date"/>
        <Property Name="WORKFLOW_ID" Type="Edm.String" MaxLength="10"/>
        <Property Name="STATUS" Type="Edm.String" MaxLength="3"/>
        <Property Name="VERSION_START_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="VERSION_END_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="VERSION_ACTIVE" Type="Edm.String" MaxLength="1"/>
        <Property Name="VersionActive" Type="Edm.String" MaxLength="1"/>
      </EntityType>
      <EntityType Name="SLA">
        <Key>
          <PropertyRef Name="SLA_ID"/>
        </Key>
        <Property Name="SLA_ID" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="SLA_NAME" Type="Edm.String" MaxLength="100"/>
        <Property Name="SLA_DESC" Type="Edm.String" MaxLength="255"/>
        <Property Name="RESPONSE_TIME_HRS" Type="Edm.Int32"/>
        <Property Name="RESOLUTION_TIME_HRS" Type="Edm.Int32"/>
        <Property Name="COVERAGE_HOURS" Type="Edm.String" MaxLength="20"/>
        <Property Name="WORKFLOW_ID" Type="Edm.String" MaxLength="10"/>
        <Property Name="STATUS" Type="Edm.String" MaxLength="3"/>
        <Property Name="VERSION_START_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="VERSION_END_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="VERSION_ACTIVE" Type="Edm.String" MaxLength="1"/>
        <Property Name="VersionActive" Type="Edm.String" MaxLength="1"/>
      </EntityType>
      <EntityType Name="ServOffering">
        <Key>
          <PropertyRef Name="OFFERING_ID"/>
        </Key>
        <Property Name="OFFERING_ID" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="OFFERING_NAME" Type="Edm.String" MaxLength="100"/>
        <Property Name="OFFERING_DESC" Type="Edm.String" MaxLength="255"/>
        <Property Name="OFFERING_TYPE" Type="Edm.String" MaxLength="30"/>
        <Property Name="CATALOG_ID" Type="Edm.String" MaxLength="10"/>
        <Property Name="EFFECTIVE_DATE" Type="Edm.Date"/>
        <Property Name="WORKFLOW_ID" Type="Edm.String" MaxLength="10"/>
        <Property Name="STATUS" Type="Edm.String" MaxLength="3"/>
        <Property Name="VERSION_START_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="VERSION_END_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="VERSION_ACTIVE" Type="Edm.String" MaxLength="1"/>
        <Property Name="VersionActive" Type="Edm.String" MaxLength="1"/>
      </EntityType>
      <EntityType Name="ServPkgBundle">
        <Key>
          <PropertyRef Name="BUNDLE_ID"/>
        </Key>
        <Property Name="BUNDLE_ID" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="BUNDLE_NAME" Type="Edm.String" MaxLength="100"/>
        <Property Name="BUNDLE_DESC" Type="Edm.String" MaxLength="255"/>
        <Property Name="BUNDLE_TYPE" Type="Edm.String" MaxLength="30"/>
        <Property Name="PRICE" Type="Edm.Decimal" Precision="13" Scale="2"/>
        <Property Name="CURRENCY" Type="Edm.String" MaxLength="5"/>
        <Property Name="WORKFLOW_ID" Type="Edm.String" MaxLength="10"/>
        <Property Name="STATUS" Type="Edm.String" MaxLength="3"/>
        <Property Name="VERSION_START_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="VERSION_END_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="VERSION_ACTIVE" Type="Edm.String" MaxLength="1"/>
        <Property Name="VersionActive" Type="Edm.String" MaxLength="1"/>
      </EntityType>
      <EntityType Name="ServProvider">
        <Key>
          <PropertyRef Name="PROVIDER_ID"/>
        </Key>
        <Property Name="PROVIDER_ID" Type="Edm.String" Nullable="false" MaxLength="10"/>
        <Property Name="PROVIDER_NAME" Type="Edm.String" MaxLength="100"/>
        <Property Name="PROVIDER_TYPE" Type="Edm.String" MaxLength="30"/>
        <Property Name="CONTACT_PERSON" Type="Edm.String" MaxLength="80"/>
        <Property Name="EMAIL" Type="Edm.String" MaxLength="100"/>
        <Property Name="PHONE" Type="Edm.String" MaxLength="20"/>
        <Property Name="WORKFLOW_ID" Type="Edm.String" MaxLength="10"/>
        <Property Name="STATUS" Type="Edm.String" MaxLength="3"/>
        <Property Name="VERSION_START_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="VERSION_END_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="VERSION_ACTIVE" Type="Edm.String" MaxLength="1"/>
        <Property Name="VersionActive" Type="Edm.String" MaxLength="1"/>
      </EntityType>
      <EntityContainer Name="EntityContainer">
        <EntitySet Name="ServCatalogSet" EntityType="ZMDR_CNTRL_SERVICES_SRV.ServCatalog"/>
        <EntitySet Name="ServCategorySet" EntityType="ZMDR_CNTRL_SERVICES_SRV.ServCategory"/>
        <EntitySet Name="ContractSet" EntityType="ZMDR_CNTRL_SERVICES_SRV.Contract"/>
        <EntitySet Name="CustSegmentElgSet" EntityType="ZMDR_CNTRL_SERVICES_SRV.CustSegmentElg"/>
        <EntitySet Name="LocationSet" EntityType="ZMDR_CNTRL_SERVICES_SRV.Location"/>
        <EntitySet Name="PriceTariffSet" EntityType="ZMDR_CNTRL_SERVICES_SRV.PriceTariff"/>
        <EntitySet Name="SLASet" EntityType="ZMDR_CNTRL_SERVICES_SRV.SLA"/>
        <EntitySet Name="ServOfferingSet" EntityType="ZMDR_CNTRL_SERVICES_SRV.ServOffering"/>
        <EntitySet Name="ServPkgBundleSet" EntityType="ZMDR_CNTRL_SERVICES_SRV.ServPkgBundle"/>
        <EntitySet Name="ServProviderSet" EntityType="ZMDR_CNTRL_SERVICES_SRV.ServProvider"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

// OData V4 EDMX Metadata for ZMDR_CNTRL_MATERIAL_SRV
const MATERIAL_METADATA_XML = `<?xml version="1.0" encoding="utf-8"?>
<edmx:Edmx Version="4.0" xmlns:edmx="http://docs.oasis-open.org/odata/ns/edmx">
  <edmx:DataServices>
    <Schema Namespace="ZMDR_CNTRL_MATERIAL_SRV" xmlns="http://docs.oasis-open.org/odata/ns/edm">
      <EntityType Name="Material">
        <Key>
          <PropertyRef Name="MATERIALNUM"/>
        </Key>
        <Property Name="MATERIALNUM" Type="Edm.String" Nullable="false" MaxLength="40"/>
        <Property Name="VERSION_START_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="MATERIALDESC" Type="Edm.String" MaxLength="40"/>
        <Property Name="MATERIALGROUP" Type="Edm.String" MaxLength="9"/>
        <Property Name="MATERIALTYPE" Type="Edm.String" Nullable="false" MaxLength="4"/>
        <Property Name="MEASUREBASEUNIT" Type="Edm.String" MaxLength="3"/>
        <Property Name="OLD_MATNUM" Type="Edm.String" MaxLength="40"/>
        <Property Name="EXTERNAL_MATGRP" Type="Edm.String" MaxLength="18"/>
        <Property Name="DIVISION" Type="Edm.String" MaxLength="2"/>
        <Property Name="GENITEMCATGRP" Type="Edm.String" MaxLength="4"/>
        <Property Name="PRODHIER" Type="Edm.String" MaxLength="18"/>
        <Property Name="AUTHGROUP" Type="Edm.String" MaxLength="4"/>
        <Property Name="CROSSPLANTCM" Type="Edm.String" MaxLength="40"/>
        <Property Name="WORKFLOW_ID" Type="Edm.String" MaxLength="10"/>
        <Property Name="STATUS" Type="Edm.String" MaxLength="3"/>
        <Property Name="VERSION_END_DATE" Type="Edm.DateTimeOffset"/>
        <Property Name="VERSION_ACTIVE" Type="Edm.String" MaxLength="1"/>
        <Property Name="VersionActive" Type="Edm.String" MaxLength="1"/>
      </EntityType>
      <EntityContainer Name="EntityContainer">
        <EntitySet Name="MaterialSet" EntityType="ZMDR_CNTRL_MATERIAL_SRV.Material"/>
      </EntityContainer>
    </Schema>
  </edmx:DataServices>
</edmx:Edmx>`;

/**
 * Handle Single OData Sub-Request (for direct or batch calls)
 */
function handleSubRequest(method, urlPath, headers, body, defaultService) {
    const isMaterial = /ZMDR_CNTRL_MATERIAL_SRV/i.test(urlPath) ||
                       defaultService === 'ZMDR_CNTRL_MATERIAL_SRV' ||
                       urlPath.includes('MaterialSet');

    const cleanPath = urlPath
        .replace(/^.*(?:ZMDR_CNTRL_SERVICES_SRV|ZMDR_CNTRL_MATERIAL_SRV)\/?/i, '')
        .split('?')[0]
        .replace(/^\/+/, '');
    const queryStr = urlPath.includes('?') ? urlPath.split('?')[1] : '';
    const query = new URLSearchParams(queryStr);

    // 1. Metadata
    if (cleanPath === '$metadata') {
        return {
            status: 200,
            headers: {
                'Content-Type': 'application/xml; charset=utf-8',
                'OData-Version': '4.0',
                'X-MDR-Data-Source': 'Simulated-Local-Fixture'
            },
            body: isMaterial ? MATERIAL_METADATA_XML : METADATA_XML
        };
    }

    // 2. Query Collection
    if ((cleanPath === 'ServCatalogSet' || cleanPath === '') && method === 'GET') {
        let results = aServiceCatalogStore.slice();

        // Basic $filter
        const filter = query.get('$filter');
        if (filter) {
            const matchId = filter.match(/CATALOG_ID eq '([^']+)'/i);
            if (matchId) {
                results = results.filter(r => r.CATALOG_ID === matchId[1]);
            }
        }

        const totalCatalog = results.length;
        // Basic $skip and $top
        const skip = parseInt(query.get('$skip') || '0', 10);
        const top = parseInt(query.get('$top') || '100', 10);
        results = results.slice(skip, skip + top);

        const responseObj = {
            '@odata.context': '$metadata#ServCatalogSet',
            '@odata.count': totalCatalog,
            'value': results
        };

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8; odata.metadata=minimal',
                'OData-Version': '4.0',
                'X-MDR-Data-Source': 'Simulated-Local-Fixture'
            },
            body: JSON.stringify(responseObj)
        };
    }

    // 3. Read Single Entity
    const entityMatch = cleanPath.match(/^ServCatalogSet\((?:CATALOG_ID=)?'([^']+)'\)$/i) ||
                        cleanPath.match(/^ServCatalogSet\('([^']+)'\)$/i);
    if (entityMatch && method === 'GET') {
        const id = entityMatch[1];
        const record = aServiceCatalogStore.find(r => r.CATALOG_ID === id);
        if (record) {
            const responseObj = {
                '@odata.context': '$metadata#ServCatalogSet/$entity',
                ...record
            };
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8; odata.metadata=minimal',
                    'OData-Version': '4.0',
                    'X-MDR-Data-Source': 'Simulated-Local-Fixture'
                },
                body: JSON.stringify(responseObj)
            };
        } else {
            return {
                status: 404,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({ error: { code: '404', message: 'Entity not found' } })
            };
        }
    }

    // 4. Create Entity (POST ServCatalogSet)
    if (cleanPath === 'ServCatalogSet' && method === 'POST') {
        let payload = {};
        try {
            payload = typeof body === 'string' ? JSON.parse(body) : (body || {});
        } catch (e) {
            return {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({ error: { code: '400', message: 'Invalid JSON payload' } })
            };
        }

        if (!payload.CATALOG_ID) {
            return {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({ error: { code: '400', message: 'CATALOG_ID is required' } })
            };
        }

        const now = new Date().toISOString();
        const createdRecord = {
            CATALOG_ID: String(payload.CATALOG_ID).trim(),
            VERSION_START_DATE: payload.VERSION_START_DATE || now,
            CATALOG_NAME: payload.CATALOG_NAME || '',
            CATALOG_DESC: payload.CATALOG_DESC ? `${payload.CATALOG_DESC} [Simulated Fixture]` : '[Simulated Fixture]',
            CATALOG_TYPE: payload.CATALOG_TYPE || 'Standard',
            EFFECTIVE_DATE: payload.EFFECTIVE_DATE || now.split('T')[0],
            EXPIRY_DATE: payload.EXPIRY_DATE || '2099-12-31',
            OWNER_ID: payload.OWNER_ID || 'SYS_LOCAL',
            CATALOG_STATUS: payload.CATALOG_STATUS || 'Approved',
            WORKFLOW_ID: payload.WORKFLOW_ID || ('WF' + Math.floor(100000 + Math.random() * 900000)),
            STATUS: payload.STATUS || '510',
            VERSION_END_DATE: '9999-12-31T23:59:59Z',
            VERSION_ACTIVE: payload.VERSION_ACTIVE || payload.VersionActive || 'Y',
            VersionActive: payload.VERSION_ACTIVE || payload.VersionActive || 'Y',
            created_on: now,
            created_by: 'LOCAL_DEVELOPER',
            updated_on: now,
            updated_by: 'LOCAL_DEVELOPER'
        };

        // Add or update in store
        const existingIdx = aServiceCatalogStore.findIndex(r => r.CATALOG_ID === createdRecord.CATALOG_ID);
        if (existingIdx >= 0) {
            aServiceCatalogStore[existingIdx] = createdRecord;
        } else {
            aServiceCatalogStore.push(createdRecord);
        }
        persistServiceRecord('zmdr_ZMDR_SERVCATALOG', 'CATALOG_ID', createdRecord);

        const responseObj = {
            '@odata.context': '$metadata#ServCatalogSet/$entity',
            ...createdRecord
        };

        return {
            status: 201,
            headers: {
                'Content-Type': 'application/json; charset=utf-8; odata.metadata=minimal',
                'OData-Version': '4.0',
                'Location': `ServCatalogSet('${createdRecord.CATALOG_ID}')`,
                'X-MDR-Data-Source': 'Simulated-Local-Fixture'
            },
            body: JSON.stringify(responseObj)
        };
    }

    // 2b. Query ServCategory Collection (GET ServCategorySet)
    if (cleanPath === 'ServCategorySet' && method === 'GET') {
        let results = aServiceCategoryStore.slice();

        // Basic $filter
        const filter = query.get('$filter');
        if (filter) {
            const matchId = filter.match(/CATEGORY_ID eq '([^']+)'/i);
            if (matchId) {
                results = results.filter(r => r.CATEGORY_ID === matchId[1]);
            }
        }

        const totalCategory = results.length;
        // Basic $skip and $top
        const skip = parseInt(query.get('$skip') || '0', 10);
        const top = parseInt(query.get('$top') || '100', 10);
        results = results.slice(skip, skip + top);

        const responseObj = {
            '@odata.context': '$metadata#ServCategorySet',
            '@odata.count': totalCategory,
            'value': results
        };

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8; odata.metadata=minimal',
                'OData-Version': '4.0',
                'X-MDR-Data-Source': 'Simulated-Local-Fixture'
            },
            body: JSON.stringify(responseObj)
        };
    }

    // 3b. Read Single ServCategory Entity
    const catMatch = cleanPath.match(/^ServCategorySet\((?:CATEGORY_ID=)?'([^']+)'\)$/i) ||
                     cleanPath.match(/^ServCategorySet\('([^']+)'\)$/i);
    if (catMatch && method === 'GET') {
        const id = catMatch[1];
        const record = aServiceCategoryStore.find(r => r.CATEGORY_ID === id);
        if (record) {
            const responseObj = {
                '@odata.context': '$metadata#ServCategorySet/$entity',
                ...record
            };
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8; odata.metadata=minimal',
                    'OData-Version': '4.0',
                    'X-MDR-Data-Source': 'Simulated-Local-Fixture'
                },
                body: JSON.stringify(responseObj)
            };
        } else {
            return {
                status: 404,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({ error: { code: '404', message: 'Entity not found' } })
            };
        }
    }

    // 4b. Create ServCategory Entity (POST ServCategorySet)
    if (cleanPath === 'ServCategorySet' && method === 'POST') {
        let payload = {};
        try {
            payload = typeof body === 'string' ? JSON.parse(body) : (body || {});
        } catch (e) {
            return {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({ error: { code: '400', message: 'Invalid JSON payload' } })
            };
        }

        if (!payload.CATEGORY_ID) {
            return {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({ error: { code: '400', message: 'CATEGORY_ID is required' } })
            };
        }

        const now = new Date().toISOString();
        const createdRecord = {
            CATEGORY_ID: String(payload.CATEGORY_ID).trim(),
            VERSION_START_DATE: payload.VERSION_START_DATE || now,
            CATEGORY_NAME: payload.CATEGORY_NAME || '',
            CATEGORY_DESC: payload.CATEGORY_DESC ? `${payload.CATEGORY_DESC} [Simulated Fixture]` : '[Simulated Fixture]',
            CATEGORY_TYPE: payload.CATEGORY_TYPE || 'Core',
            PARENT_CAT_ID: payload.PARENT_CAT_ID || '',
            EFFECTIVE_DATE: payload.EFFECTIVE_DATE || now.split('T')[0],
            EXPIRY_DATE: payload.EXPIRY_DATE || '2099-12-31',
            CATEGORY_STATUS: payload.CATEGORY_STATUS || 'Active',
            WORKFLOW_ID: payload.WORKFLOW_ID || ('WF' + Math.floor(100000 + Math.random() * 900000)),
            STATUS: payload.STATUS || '510',
            VERSION_END_DATE: '9999-12-31T23:59:59Z',
            VERSION_ACTIVE: 'Y',
            created_on: now,
            created_by: 'LOCAL_DEVELOPER',
            updated_on: now,
            updated_by: 'LOCAL_DEVELOPER'
        };

        // Add or update in store
        const existingIdx = aServiceCategoryStore.findIndex(r => r.CATEGORY_ID === createdRecord.CATEGORY_ID);
        if (existingIdx >= 0) {
            aServiceCategoryStore[existingIdx] = createdRecord;
        } else {
            aServiceCategoryStore.push(createdRecord);
        }
        persistServiceRecord('zmdr_ZMDR_SERVCATEGRY', 'CATEGORY_ID', createdRecord);

        const responseObj = {
            '@odata.context': '$metadata#ServCategorySet/$entity',
            ...createdRecord
        };

        return {
            status: 201,
            headers: {
                'Content-Type': 'application/json; charset=utf-8; odata.metadata=minimal',
                'OData-Version': '4.0',
                'Location': `ServCategorySet('${createdRecord.CATEGORY_ID}')`,
                'X-MDR-Data-Source': 'Simulated-Local-Fixture'
            },
            body: JSON.stringify(responseObj)
        };
    }

    // 2c. Query Material Collection (GET MaterialSet)
    if ((cleanPath === 'MaterialSet' || (cleanPath === '' && isMaterial)) && method === 'GET') {
        let results = aMaterialStore.slice();

        // Basic $filter
        const filter = query.get('$filter');
        if (filter) {
            const matchWf = filter.match(/(?:WORKFLOW_ID|WorkflowId) eq '([^']+)'/i);
            if (matchWf) {
                const targetWf = matchWf[1].toUpperCase();
                results = results.filter(r => (r.WORKFLOW_ID || r.WorkflowId || '').toUpperCase() === targetWf);
            }
            const matchId = filter.match(/MATERIALNUM eq '([^']+)'/i);
            if (matchId) {
                results = results.filter(r => r.MATERIALNUM === matchId[1]);
            }
            const matchType = filter.match(/MATERIALTYPE eq '([^']+)'/i);
            if (matchType) {
                results = results.filter(r => r.MATERIALTYPE === matchType[1]);
            }
            const matchGroup = filter.match(/MATERIALGROUP eq '([^']+)'/i);
            if (matchGroup) {
                results = results.filter(r => r.MATERIALGROUP === matchGroup[1]);
            }
            const matchActive = filter.match(/(?:VERSION_ACTIVE|VersionActive) eq '([^']+)'/i);
            if (matchActive) {
                results = results.filter(r => (r.VERSION_ACTIVE || r.VersionActive) === matchActive[1]);
            }
        }

        const totalMaterial = results.length;
        // Basic $skip and $top
        const skip = parseInt(query.get('$skip') || '0', 10);
        const top = parseInt(query.get('$top') || '100', 10);
        results = results.slice(skip, skip + top);

        const responseObj = {
            '@odata.context': '$metadata#MaterialSet',
            '@odata.count': totalMaterial,
            'value': results
        };

        return {
            status: 200,
            headers: {
                'Content-Type': 'application/json; charset=utf-8; odata.metadata=minimal',
                'OData-Version': '4.0',
                'X-MDR-Data-Source': 'Simulated-Local-Fixture'
            },
            body: JSON.stringify(responseObj)
        };
    }

    // 3c. Read Single Material Entity
    const matMatch = cleanPath.match(/^MaterialSet\((?:MATERIALNUM=)?'([^']+)'\)$/i) ||
                     cleanPath.match(/^MaterialSet\('([^']+)'\)$/i);
    if (matMatch && method === 'GET') {
        const id = matMatch[1];
        const record = aMaterialStore.find(r => r.MATERIALNUM === id);
        if (record) {
            const responseObj = {
                '@odata.context': '$metadata#MaterialSet/$entity',
                ...record
            };
            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8; odata.metadata=minimal',
                    'OData-Version': '4.0',
                    'X-MDR-Data-Source': 'Simulated-Local-Fixture'
                },
                body: JSON.stringify(responseObj)
            };
        } else {
            return {
                status: 404,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({ error: { code: '404', message: 'Entity not found' } })
            };
        }
    }

    // 4c-2. Update Material Entity (PATCH / MERGE MaterialSet('...'))
    const matPatchMatch = cleanPath.match(/^MaterialSet\('?([^']+)'?\)$/i);
    if (matPatchMatch && (method === 'PATCH' || method === 'MERGE' || method === 'PUT')) {
        const matNum = matPatchMatch[1];
        let patchData = {};
        try { patchData = typeof body === 'string' ? JSON.parse(body) : (body || {}); } catch (_) {}
        const idx = aMaterialStore.findIndex(r => r.MATERIALNUM === matNum);
        if (idx >= 0) {
            aMaterialStore[idx] = { ...aMaterialStore[idx], ...patchData, updated_on: new Date().toISOString() };
            persistMaterialRecord(aMaterialStore[idx]);
            return {
                status: 200,
                headers: { 'Content-Type': 'application/json; charset=utf-8', 'OData-Version': '4.0' },
                body: JSON.stringify(aMaterialStore[idx])
            };
        }
        return { status: 204, headers: { 'OData-Version': '4.0' }, body: '' };
    }

    // 4c. Create Material Entity (POST MaterialSet)
    if (cleanPath === 'MaterialSet' && method === 'POST') {
        let payload = {};
        try {
            payload = typeof body === 'string' ? JSON.parse(body) : (body || {});
        } catch (e) {
            return {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({ error: { code: '400', message: 'Invalid JSON payload' } })
            };
        }

        if (!payload.MATERIALNUM && !payload.MaterialNum) {
            return {
                status: 400,
                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                body: JSON.stringify({ error: { code: '400', message: 'MATERIALNUM is required' } })
            };
        }

        const now = new Date().toISOString();
        const matNum = String(payload.MATERIALNUM || payload.MaterialNum).trim();
        const matWfId = payload.WORKFLOW_ID || payload.WorkflowId || ('WF' + Math.floor(100000 + Math.random() * 900000));
        const createdRecord = {
            MATERIALNUM: matNum,
            MaterialNum: matNum,
            VERSION_START_DATE: payload.VERSION_START_DATE || payload.VersionStartDate || now,
            VersionStartDate: payload.VERSION_START_DATE || payload.VersionStartDate || now,
            MATERIALDESC: payload.MATERIALDESC || payload.MaterialDesc || '',
            MaterialDesc: payload.MATERIALDESC || payload.MaterialDesc || '',
            MATERIALGROUP: payload.MATERIALGROUP || payload.MaterialGroup || '',
            MaterialGroup: payload.MATERIALGROUP || payload.MaterialGroup || '',
            MATERIALTYPE: payload.MATERIALTYPE || payload.MaterialType || 'ROH',
            MaterialType: payload.MATERIALTYPE || payload.MaterialType || 'ROH',
            MEASUREBASEUNIT: payload.MEASUREBASEUNIT || payload.MeasureBaseUnit || 'EA',
            MeasureBaseUnit: payload.MEASUREBASEUNIT || payload.MeasureBaseUnit || 'EA',
            OLD_MATNUM: payload.OLD_MATNUM || payload.OldMatNum || '',
            EXTERNAL_MATGRP: payload.EXTERNAL_MATGRP || payload.ExternalMatGrp || '',
            DIVISION: payload.DIVISION || payload.Division || '',
            GENITEMCATGRP: payload.GENITEMCATGRP || payload.GenItemCatGrp || '',
            PRODHIER: payload.PRODHIER || payload.ProdHier || '',
            AUTHGROUP: payload.AUTHGROUP || payload.AuthGroup || '',
            CROSSPLANTCM: payload.CROSSPLANTCM || payload.CrossPlantCm || '',
            WORKFLOW_ID: matWfId,
            WorkflowId: matWfId,
            STATUS: payload.STATUS || payload.Status || '510',
            Status: payload.STATUS || payload.Status || '510',
            VERSION_END_DATE: payload.VERSION_END_DATE || payload.VersionEndDate || '9999-12-31T23:59:59Z',
            VersionEndDate: payload.VERSION_END_DATE || payload.VersionEndDate || '9999-12-31T23:59:59Z',
            VERSION_ACTIVE: payload.VERSION_ACTIVE || payload.VersionActive || 'Y',
            VersionActive: payload.VERSION_ACTIVE || payload.VersionActive || 'Y',
            created_on: now,
            created_by: 'LOCAL_DEVELOPER',
            updated_on: now,
            updated_by: 'LOCAL_DEVELOPER'
        };

        // Add or update in store
        const existingIdx = aMaterialStore.findIndex(r => r.MATERIALNUM === createdRecord.MATERIALNUM);
        if (existingIdx >= 0) {
            aMaterialStore[existingIdx] = createdRecord;
        } else {
            aMaterialStore.push(createdRecord);
        }
        persistMaterialRecord(createdRecord);

        const responseObj = {
            '@odata.context': '$metadata#MaterialSet/$entity',
            ...createdRecord
        };

        return {
            status: 201,
            headers: {
                'Content-Type': 'application/json; charset=utf-8; odata.metadata=minimal',
                'OData-Version': '4.0',
                'Location': `MaterialSet('${createdRecord.MATERIALNUM}')`,
                'X-MDR-Data-Source': 'Simulated-Local-Fixture'
            },
            body: JSON.stringify(responseObj)
        };
    }


        // Check if cleanPath matches any of the registered 8 Services EntitySets
    for (const [setName, meta] of Object.entries(SERVICES_REGISTRY)) {
        const keyProp = meta.key;
        const store = meta.store;

        // Collection GET
        if (cleanPath === setName && method === 'GET') {
            let results = store.slice();
            const filter = query.get('$filter');
            if (filter) {
                const matchWf = filter.match(/(?:WORKFLOW_ID|WorkflowId) eq '([^']+)'/i);
                if (matchWf) {
                    const targetWf = matchWf[1].toUpperCase();
                    results = results.filter(r => (r.WORKFLOW_ID || r.WorkflowId || '').toUpperCase() === targetWf);
                }
                const matchId = filter.match(new RegExp(keyProp + " eq '([^']+)'", "i"));
                if (matchId) {
                    results = results.filter(r => r[keyProp] === matchId[1]);
                }
                const matchActive = filter.match(/(?:VERSION_ACTIVE|VersionActive) eq '([^']+)'/i);
                if (matchActive) {
                    results = results.filter(r => (r.VERSION_ACTIVE || r.VersionActive) === matchActive[1]);
                }
            }
            const skip = parseInt(query.get('$skip') || '0', 10);
            const top = parseInt(query.get('$top') || '100', 10);
            results = results.slice(skip, skip + top);

            return {
                status: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8; odata.metadata=minimal',
                    'OData-Version': '4.0',
                    'X-MDR-Data-Source': 'Simulated-Local-Fixture'
                },
                body: JSON.stringify({
                    '@odata.context': '$metadata#' + setName,
                    '@odata.count': results.length,
                    'value': results
                })
            };
        }

        // Single Entity GET
        if (cleanPath.startsWith(setName + '(') && method === 'GET') {
            const rawId = cleanPath.substring(setName.length + 1, cleanPath.length - 1).replace(new RegExp('^' + keyProp + '='), '').replace(/'/g, '');
            const record = store.find(r => r[keyProp] === rawId);
            if (record) {
                return {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8; odata.metadata=minimal',
                        'OData-Version': '4.0',
                        'X-MDR-Data-Source': 'Simulated-Local-Fixture'
                    },
                    body: JSON.stringify({
                        '@odata.context': '$metadata#' + setName + '/$entity',
                        ...record
                    })
                };
            } else {
                return {
                    status: 404,
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                    body: JSON.stringify({ error: { code: '404', message: 'Entity not found' } })
                };
            }
        }

        // Create Entity POST
        if (cleanPath === setName && method === 'POST') {
            let payload = {};
            try {
                payload = typeof body === 'string' ? JSON.parse(body) : (body || {});
            } catch (e) {
                return {
                    status: 400,
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                    body: JSON.stringify({ error: { code: '400', message: 'Invalid JSON payload' } })
                };
            }

            if (!payload[keyProp]) {
                return {
                    status: 400,
                    headers: { 'Content-Type': 'application/json; charset=utf-8' },
                    body: JSON.stringify({ error: { code: '400', message: keyProp + ' is required' } })
                };
            }

            const now = new Date().toISOString();
            const createdRecord = {
                ...payload,
                [keyProp]: String(payload[keyProp]).trim(),
                VERSION_START_DATE: payload.VERSION_START_DATE || now,
                WORKFLOW_ID: payload.WORKFLOW_ID || ('WF' + Math.floor(100000 + Math.random() * 900000)),
                STATUS: payload.STATUS || '510',
                VERSION_END_DATE: '9999-12-31T23:59:59Z',
                VERSION_ACTIVE: payload.VERSION_ACTIVE || payload.VersionActive || 'Y',
                VersionActive: payload.VERSION_ACTIVE || payload.VersionActive || 'Y',
                created_on: now,
                created_by: 'LOCAL_DEVELOPER',
                updated_on: now,
                updated_by: 'LOCAL_DEVELOPER'
            };

            const existingIdx = store.findIndex(r => r[keyProp] === createdRecord[keyProp]);
            if (existingIdx >= 0) {
                store[existingIdx] = createdRecord;
            } else {
                store.push(createdRecord);
            }
            if (meta.table) {
                persistServiceRecord(meta.table, keyProp, createdRecord);
            }

            return {
                status: 201,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8; odata.metadata=minimal',
                    'OData-Version': '4.0',
                    'Location': setName + "('" + createdRecord[keyProp] + "')",
                    'X-MDR-Data-Source': 'Simulated-Local-Fixture'
                },
                body: JSON.stringify({
                    '@odata.context': '$metadata#' + setName + '/$entity',
                    ...createdRecord
                })
            };
        }
    }

    // Default Fallback
    return {
        status: 200,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'OData-Version': '4.0',
            'X-MDR-Data-Source': 'Simulated-Local-Fixture'
        },
        body: JSON.stringify({ message: 'OK', simulated: true })
    };
}

/**
 * Parse Single MIME part into { method, url, body }
 */
function parseSinglePart(partContent) {
    partContent = partContent.trim();
    if (!partContent || partContent === '--') return null;

    const headerEndIdx = partContent.indexOf('\r\n\r\n') !== -1 ? partContent.indexOf('\r\n\r\n') : partContent.indexOf('\n\n');
    const sepLen = partContent.indexOf('\r\n\r\n') !== -1 ? 4 : 2;
    const httpContent = headerEndIdx !== -1 ? partContent.substring(headerEndIdx + sepLen).trim() : partContent;

    const httpLines = httpContent.split(/\r?\n/);
    const reqLine = httpLines[0] || '';
    const reqTokens = reqLine.split(' ');
    const method = (reqTokens[0] || 'GET').toUpperCase();
    const url = reqTokens[1] || '';

    let subBody = '';
    const bodySplitIdx = httpContent.indexOf('\r\n\r\n') !== -1 ? httpContent.indexOf('\r\n\r\n') : httpContent.indexOf('\n\n');
    const bodySepLen = httpContent.indexOf('\r\n\r\n') !== -1 ? 4 : 2;
    if (bodySplitIdx !== -1) {
        subBody = httpContent.substring(bodySplitIdx + bodySepLen).trim();
    }

    return { method, url, body: subBody };
}

/**
 * Parse Multipart Batch Body (RFC 2046) - Non-recursive
 */
function parseMultipartBatch(rawBody, boundary) {
    const parts = [];
    if (!boundary || !rawBody) return parts;

    const delimiter = '--' + boundary;
    const rawParts = rawBody.split(delimiter);

    for (let part of rawParts) {
        part = part.trim();
        if (!part || part === '--') continue;

        // Check if this part is a changeset (nested multipart)
        const match = part.match(/Content-Type:\s*multipart\/mixed;\s*boundary=([^\r\n;]+)/i);
        if (match) {
            const changesetBoundary = match[1].trim();
            const headerEndIdx = part.indexOf('\r\n\r\n') !== -1 ? part.indexOf('\r\n\r\n') : part.indexOf('\n\n');
            const sepLen = part.indexOf('\r\n\r\n') !== -1 ? 4 : 2;
            const changesetContent = headerEndIdx !== -1 ? part.substring(headerEndIdx + sepLen) : part;

            const changeSubParts = [];
            const rawSubParts = changesetContent.split('--' + changesetBoundary);
            for (let sub of rawSubParts) {
                const parsed = parseSinglePart(sub);
                if (parsed) changeSubParts.push(parsed);
            }
            parts.push({ isChangeSet: true, boundary: changesetBoundary, subParts: changeSubParts });
        } else {
            const parsed = parseSinglePart(part);
            if (parsed) {
                parts.push({ isChangeSet: false, ...parsed });
            }
        }
    }

    return parts;
}

/**
 * Handle OData V4 $batch Request
 */
function handleBatchRequest(req, res, defaultService) {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=([^\s;]+)/i);
    const boundary = boundaryMatch ? boundaryMatch[1] : '';

    // Handle JSON batch format
    if (contentType.includes('application/json') || Array.isArray(req.body?.requests)) {
        const requests = req.body.requests || [];
        const responses = [];

        for (const r of requests) {
            const subRes = handleSubRequest(r.method || 'GET', r.url || '', r.headers || {}, r.body, defaultService);
            let parsedBody = subRes.body;
            try { parsedBody = JSON.parse(subRes.body); } catch (e) {}

            responses.push({
                id: r.id || '1',
                status: subRes.status,
                headers: subRes.headers,
                body: parsedBody
            });
        }

        res.status(200)
            .set('Content-Type', 'application/json;odata.metadata=minimal')
            .set('OData-Version', '4.0')
            .set('X-MDR-Data-Source', 'Simulated-Local-Fixture')
            .json({ responses });
        return;
    }

    // Handle Multipart Batch format
    const rawBody = typeof req.body === 'string' ? req.body : (req.rawBody || '');
    const batchBoundary = boundary || 'batch_response_' + Date.now();
    const parts = parseMultipartBatch(rawBody, boundary);

    let responseBuffer = '';

    for (const part of parts) {
        if (part.isChangeSet) {
            const changeBoundary = 'changeset_response_' + Date.now();
            responseBuffer += `--${batchBoundary}\r\n`;
            responseBuffer += `Content-Type: multipart/mixed; boundary=${changeBoundary}\r\n\r\n`;

            for (const subPart of part.subParts) {
                const subRes = handleSubRequest(subPart.method, subPart.url, {}, subPart.body, defaultService);
                responseBuffer += `--${changeBoundary}\r\n`;
                responseBuffer += `Content-Type: application/http\r\n`;
                responseBuffer += `Content-Transfer-Encoding: binary\r\n\r\n`;
                responseBuffer += `HTTP/1.1 ${subRes.status} ${subRes.status === 201 ? 'Created' : 'OK'}\r\n`;
                for (const h in subRes.headers) {
                    responseBuffer += `${h}: ${subRes.headers[h]}\r\n`;
                }
                responseBuffer += `\r\n${subRes.body}\r\n`;
            }
            responseBuffer += `--${changeBoundary}--\r\n`;
        } else {
            const subRes = handleSubRequest(part.method, part.url, {}, part.body, defaultService);
            responseBuffer += `--${batchBoundary}\r\n`;
            responseBuffer += `Content-Type: application/http\r\n`;
            responseBuffer += `Content-Transfer-Encoding: binary\r\n\r\n`;
            responseBuffer += `HTTP/1.1 ${subRes.status} ${subRes.status === 201 ? 'Created' : 'OK'}\r\n`;
            for (const h in subRes.headers) {
                responseBuffer += `${h}: ${subRes.headers[h]}\r\n`;
            }
            responseBuffer += `\r\n${subRes.body}\r\n`;
        }
    }

    responseBuffer += `--${batchBoundary}--\r\n`;

    res.status(200)
        .set('Content-Type', `multipart/mixed; boundary=${batchBoundary}`)
        .set('OData-Version', '4.0')
        .set('X-MDR-Data-Source', 'Simulated-Local-Fixture')
        .send(responseBuffer);
}

/**
 * Reverse Proxy Implementation for Live SAP Gateway (When available)
 */
async function proxyToGateway(req, res, targetHost) {
    const axios = require('axios');
    const targetUrl = targetHost.replace(/\/+$/, '') + req.originalUrl;

    try {
        const headers = { ...req.headers };
        delete headers.host;

        const response = await axios({
            method: req.method,
            url: targetUrl,
            headers: headers,
            data: req.body,
            validateStatus: () => true,
            responseType: 'arraybuffer'
        });

        for (const [key, value] of Object.entries(response.headers)) {
            res.set(key, value);
        }
        res.set('X-MDR-Data-Source', 'Live-SAP-Gateway');
        res.status(response.status).send(response.data);
    } catch (err) {
        console.error('[SAP Proxy] Error forwarding request:', err.message);
        res.status(502).json({
            error: 'Gateway proxy failed',
            message: err.message,
            targetUrl
        });
    }
}

/**
 * Register Middleware on Express Application
 */

/**
 * Reverse Proxy Implementation for Live SAP S21 via Destination Service
 */
async function proxyToS21(req, res) {
    if (!process.env.VCAP_SERVICES) {
        return false;
    }
    try {
        const { executeHttpRequest } = require('@sap-cloud-sdk/http-client');
        const headers = { ...req.headers };
        delete headers.host;
        delete headers.cookie;

        const response = await executeHttpRequest(
            { destinationName: 'S21' },
            {
                method: req.method,
                url: req.originalUrl,
                headers: headers,
                data: req.body,
                validateStatus: () => true
            }
        );

        if (response && response.status >= 200 && response.status < 300) {
            for (const [key, value] of Object.entries(response.headers)) {
                res.set(key, value);
            }
            res.set('X-MDR-Data-Source', 'Live-SAP-S21');
            res.status(response.status).send(response.data);
            return true;
        }
        console.warn(`[SAP S21] S21 returned status ${response?.status}, falling back to fixture.`);
        return false;
    } catch (err) {
        console.warn(`[SAP S21] Could not reach S21 (${err.message}), serving fixture.`);
        return false;
    }
}

function registerGatewayMiddleware(app) {
    const mode = getMode();

    if (mode === 'disabled') {
        console.log('[MDR Gateway Router] Production mode active — local fixture disabled.');
        return;
    }

    console.log(`[MDR Gateway Router] Initializing local handler in MODE: ${mode}`);

    // Middleware to capture body for JSON and multipart/mixed batch requests
    app.use(['/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV', '/odata/sap/ZMDR_CNTRL_SERVICES_SRV', '/sap/ZMDR_CNTRL_SERVICES_SRV', '/ZMDR_CNTRL_SERVICES_SRV'], (req, res, next) => {
        if (req.body && (typeof req.body === 'object' || typeof req.body === 'string')) {
            return next();
        }
        if (req.readableEnded) {
            return next();
        }
        let data = '';
        req.setEncoding('utf8');
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => {
            req.rawBody = data;
            const ct = req.headers['content-type'] || '';
            if (ct.includes('application/json') && data.trim()) {
                try {
                    req.body = JSON.parse(data);
                } catch (e) {}
            }
            next();
        });
    });

    // Mount Router
    app.all(['/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV*', '/odata/sap/ZMDR_CNTRL_SERVICES_SRV*', '/sap/ZMDR_CNTRL_SERVICES_SRV*', '/ZMDR_CNTRL_SERVICES_SRV*'], async (req, res) => {
        // CSRF Token Fetch
        const csrfTokenHeader = req.headers['x-csrf-token'];
        if (csrfTokenHeader && csrfTokenHeader.toLowerCase() === 'fetch') {
            res.set('X-CSRF-Token', 'local-fixture-csrf-token-' + Date.now());
            if (req.method === 'HEAD' || req.method === 'GET') {
                if (req.path.includes('/ZMDR_CNTRL_SERVICES_SRV')) {
                    return res.status(200).send();
                }
            }
        }

        // Live Proxy Mode
        if (mode === 'proxy') {
            const targetHost = process.env.SAP_GATEWAY_URL || 'http://cloud9.way2erp.us:8000';
            return proxyToGateway(req, res, targetHost);
        }

        // Try live S21 Destination first if available on Cloud Foundry
        const s21Handled = await proxyToS21(req, res);
        if (s21Handled) return;

        // Fixture Mode
        const cleanPath = req.url
            .replace(/^.*ZMDR_CNTRL_SERVICES_SRV\/?/i, '')
            .split('?')[0]
            .replace(/^\/+/, '');

        // Batch
        if (cleanPath.startsWith('$batch') && req.method === 'POST') {
            return handleBatchRequest(req, res);
        }

        // Sub-request directly
        const result = handleSubRequest(req.method, req.url, req.headers, req.body);
        for (const h in result.headers) {
            res.set(h, result.headers[h]);
        }
        res.status(result.status).send(result.body);
    });

    console.log('[MDR Gateway Router] Successfully mounted /sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV');

    // Middleware to capture body for ZMDR_CNTRL_MATERIAL_SRV
    app.use(['/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV', '/odata/sap/ZMDR_CNTRL_MATERIAL_SRV', '/sap/ZMDR_CNTRL_MATERIAL_SRV', '/ZMDR_CNTRL_MATERIAL_SRV'], (req, res, next) => {
        if (req.body && (typeof req.body === 'object' || typeof req.body === 'string')) {
            return next();
        }
        if (req.readableEnded) {
            return next();
        }
        let data = '';
        req.setEncoding('utf8');
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => {
            req.rawBody = data;
            const ct = req.headers['content-type'] || '';
            if (ct.includes('application/json') && data.trim()) {
                try {
                    req.body = JSON.parse(data);
                } catch (e) {}
            }
            next();
        });
    });

    // Mount Router for ZMDR_CNTRL_MATERIAL_SRV
    app.all(['/sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV*', '/odata/sap/ZMDR_CNTRL_MATERIAL_SRV*', '/sap/ZMDR_CNTRL_MATERIAL_SRV*', '/ZMDR_CNTRL_MATERIAL_SRV*'], async (req, res) => {
        // CSRF Token Fetch
        const csrfTokenHeader = req.headers['x-csrf-token'];
        if (csrfTokenHeader && csrfTokenHeader.toLowerCase() === 'fetch') {
            res.set('X-CSRF-Token', 'local-fixture-csrf-token-' + Date.now());
            if (req.method === 'HEAD' || req.method === 'GET') {
                if (req.path.includes('/ZMDR_CNTRL_MATERIAL_SRV')) {
                    return res.status(200).send();
                }
            }
        }

        // Live Proxy Mode
        if (mode === 'proxy') {
            const targetHost = process.env.SAP_GATEWAY_URL || 'http://cloud9.way2erp.us:8000';
            return proxyToGateway(req, res, targetHost);
        }

        // Fixture Mode
        const cleanPath = req.url
            .replace(/^.*ZMDR_CNTRL_MATERIAL_SRV\/?/i, '')
            .split('?')[0]
            .replace(/^\/+/, '');

        // Batch
        if (cleanPath.startsWith('$batch') && req.method === 'POST') {
            return handleBatchRequest(req, res, 'ZMDR_CNTRL_MATERIAL_SRV');
        }

        // Sub-request directly
        const result = handleSubRequest(req.method, req.url, req.headers, req.body, 'ZMDR_CNTRL_MATERIAL_SRV');
        for (const h in result.headers) {
            res.set(h, result.headers[h]);
        }
        res.status(result.status).send(result.body);
    });

    console.log('[MDR Gateway Router] Successfully mounted /sap/opu/odata/sap/ZMDR_CNTRL_MATERIAL_SRV');

    // Sync any user-created materials from SQLite into in-memory store
    syncMaterialFromDb();
    syncServicesFromDb();
}


function approveRecordInStore(tableName, workflowId) {
    if (!workflowId) return;
    const wfUpper = String(workflowId).trim().toUpperCase();
    console.log('[Gateway Fixture] Approving record for workflow:', wfUpper, 'table:', tableName);

    // 1. Check Material store
    const mat = aMaterialStore.find(r => (r.WORKFLOW_ID || r.WorkflowId || '').toUpperCase() === wfUpper);
    if (mat) {
        mat.VERSION_ACTIVE = 'Y';
        mat.VersionActive = 'Y';
        mat.STATUS = 'ACT';
        mat.Status = 'ACT';
        persistMaterialRecord(mat);
        console.log('[Gateway Fixture] Material approved:', mat.MATERIALNUM);
        return;
    }

    // 2. Check Services registry
    for (const [setName, meta] of Object.entries(SERVICES_REGISTRY)) {
        const item = meta.store.find(r => (r.WORKFLOW_ID || r.WorkflowId || '').toUpperCase() === wfUpper);
        if (item) {
            item.VERSION_ACTIVE = 'Y';
            item.VersionActive = 'Y';
            item.STATUS = 'ACT';
            item.Status = 'ACT';
            if (meta.table) {
                persistServiceRecord(meta.table, meta.key, item);
            }
            console.log('[Gateway Fixture] Service approved in', setName);
            return;
        }
    }

    // 3. Check aServiceCatalogStore directly
    const cat = aServiceCatalogStore.find(r => (r.WORKFLOW_ID || r.WorkflowId || '').toUpperCase() === wfUpper);
    if (cat) {
        cat.VERSION_ACTIVE = 'Y';
        cat.VersionActive = 'Y';
        cat.STATUS = 'ACT';
        cat.Status = 'ACT';
        persistServiceRecord('zmdr_ZMDR_SERVCATALOG', 'CATALOG_ID', cat);
    }
}

function rejectRecordInStore(tableName, workflowId) {
    if (!workflowId) return;
    const wfUpper = String(workflowId).trim().toUpperCase();
    const cleanTable = String(tableName || '').replace(/^zmdr[._]/i, '').toUpperCase();
    console.log('[Gateway Fixture] Rejecting record for workflow:', wfUpper, 'table:', cleanTable);

    if (cleanTable === 'MATERIAL' || cleanTable === 'ZMDR_MATERIAL') {
        const idx = aMaterialStore.findIndex(r => (r.WORKFLOW_ID || r.WorkflowId || '').toUpperCase() === wfUpper);
        if (idx >= 0) aMaterialStore.splice(idx, 1);
        return;
    }

    for (const [setName, meta] of Object.entries(SERVICES_REGISTRY)) {
        const t = (meta.table || '').replace(/^zmdr[._]/i, '').toUpperCase();
        if (t === cleanTable || cleanTable.includes(t)) {
            const idx = meta.store.findIndex(r => (r.WORKFLOW_ID || r.WorkflowId || '').toUpperCase() === wfUpper);
            if (idx >= 0) meta.store.splice(idx, 1);
            return;
        }
    }
    const idx = aServiceCatalogStore.findIndex(r => (r.WORKFLOW_ID || r.WorkflowId || '').toUpperCase() === wfUpper);
    if (idx >= 0) aServiceCatalogStore.splice(idx, 1);
}

module.exports = {
    registerGatewayMiddleware,
    approveRecordInStore,
    rejectRecordInStore,
    handleSubRequest,
    getMode,
    getStore: () => aServiceCatalogStore,
    getCategoryStore: () => aServiceCategoryStore,
    getMaterialStore: () => aMaterialStore
};
