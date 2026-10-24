sap.ui.define([
    "sap/ui/base/Object",
    "sap/m/MessageBox"
], function (UI5Object, MessageBox) {
    "use strict";

    return UI5Object.extend("com.intapptics.zmdrcntrlcmn.controller.ErrorHandler", {
        /**
         * Handles application errors by automatically attaching to the model events and displaying errors when needed.
         * @class
         * 
         * @param {sap.ui.core.UIComponent} oComponent reference to the app's component
         * @public
         * 
         * @alias com.intapptics.zmdrcntrlmain.controller.ErrorHandler
         */
        constructor: function (oComponent) {
            /** Define Variables */
            this._i18n = oComponent.getModel("i18n");
            this._oResourceBundle = this._i18n.getResourceBundle();
            this._oComponent = oComponent;
            this._oModel = oComponent.getModel();
            this._bMessageOpen = false;
            this._sErrorText = this._oResourceBundle.getText("errorText");

            /** Method Implementation */
            if (this._oModel && typeof this._oModel.attachMetadataFailed === "function") {
                try {
                    this._oModel.attachMetadataFailed(function (oEvent) {
                        var oParams = oEvent.getParameters();
                        this._showMetadataError(oParams.response);
                    }, this);
                } catch (e) { }
            }

            if (this._oModel && typeof this._oModel.attachRequestFailed === "function") {
                try {
                    this._oModel.attachRequestFailed(function (oEvent) {
                        var oParams = oEvent.getParameters();
                        // An entity that was not found in the service is also throwing a 404 error in oData.
                        // We already cover this case with a notFound target so we skip it here.
                        // A request that cannot be sent to the server is a technical error that we have to handle though
                        if (oParams.response.statusCode !== "404" || (oParams.response.statusCode === 404 && oParams.response.responseText.indexOf("Cannot POST") === 0)) {
                            this._showServiceError(oParams.response);
                        }
                    }, this);
                } catch (e) { }
            }
        },

        /**
         * Shows a {@link sap.m.MessageBox} when the metadata call has failed.
         * Only the first error message will be display.
         * 
         * @param {string} sDetails a technical error to be displayed on request
         * @public
         * 
         * @alias com.intapptics.zmdrcntrlmain.controller.ErrorHandler
         */
        _showServiceError: function (sDetails) {
            /** Define Variables */
            var parser, // The parser object
                xmlDoc, // The XML document object
                oResponseText, // The response text from the server
                oError; // The error object

            /** Method Implementation */
            // If the message box is already open, we don't open another one
            if (this._bMessageOpen) {
                return;
            }

            // Set the flag that the message box is open
            this._bMessageOpen = true;

            // Check if the custom error orgeneric error is returned
            if (sDetails.statusCode === "400") {
                this._sErrorText = this._oResourceBundle.getText("customErrorText");
                if(sDetails.responseText.includes("<")) {
                    parser = new DOMParser();
                    xmlDoc = parser.parseFromString(sDetails.responseText, "text/xml");
                    oError = xmlDoc.getElementsByTagName("message")[0].childNodes[0].nodeValue;
                } else {
                    oResponseText = JSON.parse(sDetails.responseText);
                    if (oResponseText.error.code === "SY/530") {
                        oError = oResponseText.error.innererror.errordetails[0];
                    } else {
                        oError = sDetails;
                    }    
                }
            } else {
                oError = sDetails;
            }

            // Show the error message
            MessageBox.error(this._sErrorText, {
                id: "serviceErrorMessageBox",
                details: oError,
                styleClass: this._oComponent.getContentDensityClass(),
                actions: [MessageBox.Action.CLOSE],
                onClose: function () {
                    this._bMessageOpen = false;
                }.bind(this)
            });
        }
    });
});