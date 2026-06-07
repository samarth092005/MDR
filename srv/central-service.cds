using zmdr from '../db/mdr-config';

service CentralService @(
  path    : '/api/central',
  requires: 'authenticated-user'
) {
  @readonly
  entity CntrlUIConfig as projection on zmdr.CntrlUIConfig;
  entity CntrlUIUrl    as projection on zmdr.CntrlUIUrl;
}