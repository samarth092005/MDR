sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/model/odata/v4/ODataModel"
], function (UIComponent, ODataModel) {
  "use strict";

  return UIComponent.extend("com.intapptics.zmdraccountreport.Component", {
    metadata: {
      manifest: "json"
    },

    /**
     * Intercept model initialization from manifest to resolve dataSource URI with the
     * app-scoped prefix (/mdrcapbtp.comintappticszmdraccountreport/~...~) required
     * by the SAP Build Work Zone managed approuter in Fiori Launchpad.
     */
    _initComponentModels: function (oManifestModels, oManifestDataSources) {
      try {
        var sModulePath = sap.ui.require.toUrl("com/intapptics/zmdraccountreport");
        if (sModulePath && sModulePath.startsWith("/")) {
          var sPrefix = sModulePath.endsWith("/") ? sModulePath : sModulePath + "/";
          if (oManifestDataSources && oManifestDataSources.mainService) {
            oManifestDataSources.mainService.uri = sPrefix + "mdrapi/maindata/";
          }
        }
      } catch (e) {
        console.warn("Could not prefix mainService URI in _initComponentModels:", e);
      }

      UIComponent.prototype._initComponentModels.call(this, oManifestModels, oManifestDataSources);
    },

    init: function () {
      UIComponent.prototype.init.apply(this, arguments);

      try {
        var sModulePath = sap.ui.require.toUrl("com/intapptics/zmdraccountreport");
        if (sModulePath && sModulePath.startsWith("/")) {
          var sPrefix = sModulePath.endsWith("/") ? sModulePath : sModulePath + "/";
          var sExpectedUrl = sPrefix + "mdrapi/maindata/";

          var oModel = this.getModel();
          var sCurrent = oModel && typeof oModel.getServiceUrl === "function" ? oModel.getServiceUrl() : "";

          if (!oModel || sCurrent !== sExpectedUrl) {
            if (oModel) {
              try { oModel.destroy(); } catch (e) {}
            }
            this.setModel(new ODataModel({
              serviceUrl: sExpectedUrl,
              synchronizationMode: "None",
              operationMode: "Server",
              autoExpandSelect: true
            }));
          }
        }
      } catch (e) {
        console.warn("Could not verify or set resolved ODataModel in init:", e);
      }

      this.getRouter().initialize();
    }
  });
});
