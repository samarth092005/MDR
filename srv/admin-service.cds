using zmdr from '../db/mdr-config';

service AdminService @(
  path    : '/api/admin',
  requires: 'authenticated-user'
) {
  entity Approver      as projection on zmdr.Approver;
  entity ApproverClass as projection on zmdr.ApproverClass;
  entity Policy        as projection on zmdr.Policy;
  entity BulkHdrConfig as projection on zmdr.BulkHdrConfig;
  entity BulkItmConfig as projection on zmdr.BulkItmConfig;
  entity CntrlUIConfig as projection on zmdr.CntrlUIConfig;
  entity CntrlUIUrl    as projection on zmdr.CntrlUIUrl;
  entity DomainValues  as projection on zmdr.DomainValues;

  @readonly
  entity WFAudit       as projection on zmdr.WFAudit;
}
