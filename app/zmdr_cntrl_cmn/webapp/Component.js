/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/intapptics/zmdrcntrlcmn/model/models",
    "com/intapptics/zmdrcntrlcmn/controller/ErrorHandler",
    "sap/m/BusyDialog",
    "sap/base/Log"
],
    function (UIComponent, models, ErrorHandler, BusyDialog, Log) {
        "use strict";

        return UIComponent.extend("com.intapptics.zmdrcntrlcmn.Component", {
            metadata: {
                manifest: "json",
                config: {
                    fullWidth: "true"
                }
            },


            /**
             * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
             * 
             * @public
             * @override
             * 
             */
            init: function () {
                // Initialize the Log package and set log level to 6
                this._oLog = Log;
                this._oLog.setLevel("6");

                // Log information
                this._oLog.info("Log package initiated and set log level to 6.");

                // Log information
                this._oLog.info("Component Controller: Entering onInit method");

                // call the base component's init function
                UIComponent.prototype.init.apply(this, arguments);

                // Global reference of busy dialog
                this._oGlobalBusyDialog = new BusyDialog();

                // Initialize the error handler with the component
                this._oErrorHandler = new ErrorHandler(this);

                // enable routing
                this.getRouter().initialize();

                // set the device model
                this.setModel(models.createDeviceModel(), "device");

                // Log information
                this._oLog.info("Component Controller: Busy dialog, error handler and device model set globally");

                // Log information
                this._oLog.info("Component Controller: Exiting onInit method");
            },

            /**
             * The component is destroyed by UI5 automatically.
             * In this method, the Error Handler is destroyed component is destroyed.
             * 
             * @public
             * @override
             * 
             */
            destroy: function () {
                // Destroy Error Handler
                this._oErrorHandler.destroy();

                // Call the base component's destroy function
                UIComponent.prototype.destroy.apply(this, arguments);
            },


            /**
             * This method can be called to determine whether the sapUiSizeCompact or sapUiSizeCozy
             * design mode class should be set, which influences the size appearance of some controls.
             * 
             * @public
             * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy' - or an empty string if no css class should be set
             * 
             */
            getContentDensityClass: function () {
                var oDevice = this.getModel("device").getData();

                if (this._sContentDensityClass === undefined) {
                    // Check whether FLP has already set the content density class, do nothing in this case
                    if (jQuery(document.body).hasClass("sapUiSizeCozy") || jQuery(document.body).hasClass("sapUiSizeCompact")) {
                        this._sContentDensityClass = "";
                    } else if (!oDevice.support.touch) { // apply "compact" mode if touch is not support
                        this._sContentDensityClass = "sapUiSizeCompact";
                    } else {
                        this._sContentDensityClass = "sapUiSizeCozy";
                    }
                }
                return this._sContentDensityClass;
            }
        });
    }
);