/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/intapptics/zmdrcntrlcmn/model/models",
    "com/intapptics/zmdrcntrlcmn/controller/ErrorHandler",
    "sap/m/BusyDialog",
    "sap/base/Log",
    "sap/ui/model/odata/v4/ODataModel"
],
    function (UIComponent, models, ErrorHandler, BusyDialog, Log, V4ODataModel) {
        "use strict";

        // Global shim for OData V4 Model to support V2 methods locally across all controllers
        if (V4ODataModel && !V4ODataModel.prototype.read) {
            V4ODataModel.prototype.read = function (sPath, mParameters) {
                mParameters = mParameters || {};
                var bCount = sPath.endsWith("/$count");
                var sEntityPath = bCount ? sPath.replace("/$count", "") : sPath;
                var iSkip = (mParameters.urlParameters && mParameters.urlParameters.$skip) || 0;
                var iTop = (mParameters.urlParameters && mParameters.urlParameters.$top) || 1000;
                
                var oListBinding = this.bindList(sEntityPath, null, null, mParameters.filters, bCount ? { $$count: true } : undefined);
                
                oListBinding.requestContexts(iSkip, iTop).then(function (aContexts) {
                    if (bCount) {
                        if (mParameters.success) mParameters.success(oListBinding.getLength().toString(), null);
                    } else {
                        var aData = aContexts.map(function (c) { return c.getObject(); });
                        if (mParameters.success) mParameters.success({ results: aData }, null);
                    }
                }).catch(function (oError) {
                    if (mParameters.error) mParameters.error(oError);
                });
            };

            V4ODataModel.prototype.create = function (sPath, oData, mParameters) {
                mParameters = mParameters || {};
                var oListBinding = this.bindList(sPath);
                var oContext = oListBinding.create(oData, true);
                oContext.created().then(function () {
                    if (mParameters.success) mParameters.success(oContext.getObject(), null);
                }).catch(function (oError) {
                    if (mParameters.error) mParameters.error(oError);
                });
            };

            V4ODataModel.prototype.update = function (sPath, oData, mParameters) {
                mParameters = mParameters || {};
                var oBinding = this.bindContext(sPath);
                oBinding.requestObject().then(function() {
                    var oCtx = oBinding.getBoundContext();
                    for (var sKey in oData) {
                        oCtx.setProperty(sKey, oData[sKey]);
                    }
                    if (mParameters.success) mParameters.success(oData, null);
                }).catch(function (oError) {
                    if (mParameters.error) mParameters.error(oError);
                });
            };

            V4ODataModel.prototype.remove = function (sPath, mParameters) {
                mParameters = mParameters || {};
                var oBinding = this.bindContext(sPath);
                oBinding.requestObject().then(function() {
                    var oCtx = oBinding.getBoundContext();
                    oCtx.delete().then(function() {
                        if (mParameters.success) mParameters.success(null, null);
                    }).catch(function(oError) {
                        if (mParameters.error) mParameters.error(oError);
                    });
                }).catch(function (oError) {
                    if (mParameters.error) mParameters.error(oError);
                });
            };
        }

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