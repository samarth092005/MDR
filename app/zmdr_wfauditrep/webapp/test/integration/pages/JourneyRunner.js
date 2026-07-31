sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"com/intapptics/zmdrwfauditrep/test/integration/pages/WFAuditReportList.gen",
	"com/intapptics/zmdrwfauditrep/test/integration/pages/WFAuditReportObjectPage.gen"
], function (JourneyRunner, WFAuditReportListGenerated, WFAuditReportObjectPageGenerated) {
    'use strict';

    const runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('com/intapptics/zmdrwfauditrep') + '/test/flp.html#app-preview',
        pages: {
			onTheWFAuditReportListGenerated: WFAuditReportListGenerated,
			onTheWFAuditReportObjectPageGenerated: WFAuditReportObjectPageGenerated
        },
        async: true
    });

    return runner;
});

