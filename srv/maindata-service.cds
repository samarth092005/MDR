using { zmdr as masterdata } from '../db/mdr-maintables';

@impl: 'srv/central-handler.js'
service MainDataService @(
  path    : '/mdrapi/maindata',
  // requires: 'authenticated-user'
) {
// Master Data Tables for the UI
  entity GLAccount as projection on masterdata.GLAccount;
  entity BPMaster  as projection on masterdata.BPMaster;
}