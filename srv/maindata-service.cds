using { zmdr as masterdata } from '../db/mdr-maintables';

@impl: 'srv/central-handler.js'
service MainDataService @(
  path    : '/mdrapi/maindata',
  // requires: 'authenticated-user'
) {
// Master Data Tables for the UI (Golden Master - Only Approved & Active records)
  entity GLAccount as select from masterdata.GLAccount
    where VersionActive = 'Y' and (Status = 'ACT' or Status = '590');
  entity BPMaster  as projection on masterdata.BPMaster;
}
