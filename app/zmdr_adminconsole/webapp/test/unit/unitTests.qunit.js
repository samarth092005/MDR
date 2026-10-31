/* global QUnit */
QUnit.config.autostart = false;

sap.ui.getCore().attachInit(function () {
	"use strict";

	sap.ui.require([
		"comintapptics/zmdr_cntrl_main/test/unit/AllTests"
	], function () {
		QUnit.start();
	});
});
