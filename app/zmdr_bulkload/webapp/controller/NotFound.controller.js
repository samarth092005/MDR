sap.ui.define([
    "sap/ui/core/mvc/Controller"
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    (Controller) => {
        "use strict";

        return Controller.extend("com.intapptics.mdbulkload.controller.NotFound", {

            onNavToBulkUpload: function () {
                var oRouter = this.getOwnerComponent().getRouter();
                oRouter.navTo("main", {}, true);
            }

        });
    });