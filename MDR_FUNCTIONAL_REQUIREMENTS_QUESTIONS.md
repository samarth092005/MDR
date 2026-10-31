# MDR Services Module — Functional & Technical Requirements Questionnaire

**Project:** `mdr-cap-btp`  
**Target Audience:** SAP Functional Lead, ABAP / Gateway Development Team, Product Owner  
**Date:** October 26, 2026  

---

## 1. Context & Objective

The MDR frontend application renders the **Services** repository with 10 entities. While **Service Catalog** (`ZMDR_SERVCATALOG`) is fully implemented and mapped, the remaining **9 entities** lack field definitions and OData endpoint mappings in the MDR configuration tables.

To enable the Create, Amend, and Display workflows for these 9 entities in a safe, standard manner, please provide the specifications requested below.

---

## 2. Global Architecture Questions

1. **SAP Gateway Service Exposure:**  
   Will the 9 entities be exposed through the existing SAP Gateway service:
   `/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/`
   or will they be split across separate Gateway services?
2. **Service Provider Architecture (`ZMDR_SERV_PROV`):**  
   Does `ZMDR_SERV_PROV` represent external vendors mapped to standard SAP Business Partners (e.g. projecting onto CAP's existing `MainDataService.BPMaster`), or is it an independent custom table in SAP Gateway (`ServProviderSet`)?
3. **Workflow & Approval Integration:**  
   All 9 entities currently specify approval class `"MDR,SERVICES,SERVICESBUSAPPROVER"` and Level 3 in `BulkHdrConfig.csv`. Does each entity require individual workflow approval, or are some auto-approved?

---

## 3. Entity Specification Questionnaire (To Be Completed by SAP Team)

Please fill in the table below for each of the 9 entities:

| Entity Technical ID | Proposed EntitySet Name | Primary Key Column(s) | Expected OData Version (V2 / V4) | Target Backend (Gateway S21 / Local CAP) | Separate Approval Workflow? (Y/N) |
|---|---|---|---|---|---|
| `ZMDR_CONTRACT` | | | | | |
| `ZMDR_CUST_SG_ELG` | | | | | |
| `ZMDR_LOCATION` | | | | | |
| `ZMDR_PRICE_TARRF` | | | | | |
| `ZMDR_SERVCATEGRY` | | | | | |
| `ZMDR_SLA` | | | | | |
| `ZMDR_SERVOFFRING` | | | | | |
| `ZMDR_SERVPKGBNDL` | | | | | |
| `ZMDR_SERV_PROV` | | | | | |

---

## 4. Field Metadata Template (Per Entity)

For each entity, please provide the field list according to the following template (matching `zmdr.CntrlUIConfig.csv` format):

```csv
TableName,ColumnName,ColumnSeqNo,ColumnDataType,ColumnLabel,FieldSize,MandatoryFlag,VisibilityFlag,EditableFlag,SearchFieldFlag,ResultSetFieldFlag,PrimaryKeyFlag,LkpOdata,LkpFieldsName
```

### Example (Baseline from Service Catalog):
```csv
ZMDR_SERVCATALOG,CATALOG_ID,1,CHAR,Catalog ID,10,Y,Y,Y,Y,Y,Y,,
ZMDR_SERVCATALOG,CATALOG_NAME,2,CHAR,Catalog Name,100,N,Y,Y,N,Y,N,,
ZMDR_SERVCATALOG,EFFECTIVE_DATE,5,DATS,Effective Date,0,Y,Y,Y,N,Y,N,,
ZMDR_SERVCATALOG,OWNER_ID,7,CHAR,Owner ID,10,Y,Y,Y,N,Y,N,/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/ServProviderSet,PROVIDER_ID
```

---

## 5. Value Help & Foreign Key Dependencies

For each entity requiring dropdown lookups or search helps (e.g. `OWNER_ID`, `CATALOG_TYPE`, `STATUS`, `CURRENCY`, `UOM`):
1. **Source Lookup Service & EntitySet:** (e.g. `/sap/opu/odata/sap/ZMDR_CNTRL_SERVICES_SRV/LookupSet`)
2. **Key Field Name:** (e.g. `CODE`)
3. **Display Field Name:** (e.g. `TEXT`)
4. **Filter Criteria / Restrictions:** (e.g. `DOMAIN eq 'ZSTATUS'`)
