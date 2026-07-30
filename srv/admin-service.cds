using zmdr from '../db/mdr-config';

service AdminService @(
  path    : '/api/admin',
  // requires: 'authenticated-user'
) {
  entity Approver      as projection on zmdr.Approver;
  entity ApproverClass as projection on zmdr.ApproverClass;
  entity Policy        as projection on zmdr.Policy;
  entity DomainValues  as projection on zmdr.DomainValues;
}
