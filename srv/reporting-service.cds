

service ReportingService @(path: '/api/reporting',
// requires: 'authenticated-user'
) {
    @readonly
    entity WFAuditReport01 as projection on zmdr.WFAuditReport01;

    @readonly
    entity WFAuditReport02 as projection on zmdr.WFAuditReport02;

    @readonly
    entity WFAuditReport03 as projection on zmdr.WFAuditReport03;

    @readonly
    entity WFAuditReport04 as projection on zmdr.WFAuditReport04;

    @readonly
    entity WFAuditReport as projection on zmdr.WFAuditReport;
}