using com.mdr as mdr from '../db/mdr-config';

service AdminService @(
  path    : '/api/admin',
  requires: 'authenticated-user'
) {
  entity Approver      as projection on mdr.Approver;
  entity ApproverClass as projection on mdr.ApproverClass;
  entity Policy        as projection on mdr.Policy;
  entity BulkHdrConfig as projection on mdr.BulkHdrConfig;
  entity BulkItmConfig as projection on mdr.BulkItmConfig;
  entity CntrlUIConfig as projection on mdr.CntrlUIConfig;
  entity CntrlUIUrl    as projection on mdr.CntrlUIUrl;
  entity DomainValues  as projection on mdr.DomainValues;

  @readonly
  entity WFAudit       as projection on mdr.WFAudit;
}
