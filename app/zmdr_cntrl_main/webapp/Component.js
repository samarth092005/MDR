/**
 * eslint-disable @sap/ui5-jsdocs/no-jsdoc
 */

sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/intapptics/zmdrcntrlmain/model/models",
    "com/intapptics/zmdrcntrlmain/controller/ErrorHandler",
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
                    console.error("V4 Shim Error in .read() for path " + sPath + ":", oError);
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

        


        // Ensure ManagedObject registration is duplicate-safe in multi-app/iframe launchpad environments
        try {
            var fnInstallDuplicateSafeHook = function (ManagedObject, Element) {
                if (ManagedObject && ManagedObject.prototype && !ManagedObject.prototype._mdrDuplicateSafe) {
                    ManagedObject.prototype._mdrDuplicateSafe = true;
                    var fnOrigRegister = ManagedObject.prototype.register;
                    ManagedObject.prototype.register = function () {
                        var sId = this.sId || (typeof this.getId === "function" && this.getId());
                        if (sId) {
                            var oOld = (Element && Element.registry && typeof Element.registry.get === "function" && Element.registry.get(sId)) ||
                                       (typeof sap !== "undefined" && sap.ui && sap.ui.getCore && sap.ui.getCore().byId && sap.ui.getCore().byId(sId));
                            if (oOld && oOld !== this) {
                                try {
                                    if (typeof oOld.destroy === "function") {
                                        oOld.destroy(true);
                                    } else if (Element && Element.registry && typeof Element.registry.remove === "function") {
                                        Element.registry.remove(sId);
                                    }
                                } catch (e) {
                                    console.warn("MDR: Could not destroy duplicate element " + sId + ":", e);
                                }
                            }
                        }
                        return fnOrigRegister.apply(this, arguments);
                    };
                }
            };

            if (typeof sap !== "undefined" && sap.ui) {
                var ManagedObject = sap.ui.require("sap/ui/base/ManagedObject");
                var Element = sap.ui.require("sap/ui/core/Element");
                if (ManagedObject && Element) {
                    fnInstallDuplicateSafeHook(ManagedObject, Element);
                } else if (sap.ui.require) {
                    sap.ui.require(["sap/ui/base/ManagedObject", "sap/ui/core/Element"], fnInstallDuplicateSafeHook);
                }
            }
        } catch (e) {
            console.warn("MDR: Could not install duplicate-safe hook:", e);
        }

        // Sanitize cache-buster URLs for child applications (e.g. comintappticszmdrcntrlcmn)
        function sanitizeChildAppUrl(sUrl) {
            if (typeof sUrl !== "string") { return sUrl; }
            if (sUrl.includes("comintappticszmdrcntrlcmn")) {
                // Replace any /mdrcapbtp.comintappticszmdrcntrlcmn/~<token>~/ with /mdrcapbtp.comintappticszmdrcntrlcmn-0.0.1/
                return sUrl.replace(/\/mdrcapbtp\.comintappticszmdrcntrlcmn\/~[^/]+~\/?/, "/mdrcapbtp.comintappticszmdrcntrlcmn-0.0.1/");
            }
            if (sUrl.includes("comintappticszmdrwfauditrep")) {
                return sUrl.replace(/\/mdrcapbtp\.comintappticszmdrwfauditrep\/~[^/]+~\/?/, "/mdrcapbtp.comintappticszmdrwfauditrep-0.0.1/");
            }
            return sUrl;
        }

        // Configure UI5 loader path
        try {
            if (sap.ui && sap.ui.loader && sap.ui.loader.config) {
                sap.ui.loader.config({
                    paths: {
                        "com/intapptics/zmdrcntrlcmn": "/mdrcapbtp.comintappticszmdrcntrlcmn-0.0.1"
                    }
                });
            }
        } catch (e) {}

        // Intercept DOM script element creation to rewrite script src if launchpad injects stale cache-buster URL
        try {
            if (typeof document !== "undefined" && !document._mdrScriptPatched) {
                document._mdrScriptPatched = true;
                var fnOrigCreateElement = document.createElement;
                document.createElement = function (tagName) {
                    var el = fnOrigCreateElement.apply(this, arguments);
                    if (tagName && typeof tagName === "string" && tagName.toLowerCase() === "script") {
                        var fnOrigSetAttr = el.setAttribute;
                        el.setAttribute = function (name, value) {
                            if (name === "src") {
                                value = sanitizeChildAppUrl(value);
                            }
                            return fnOrigSetAttr.call(this, name, value);
                        };
                        try {
                            var oDesc = Object.getOwnPropertyDescriptor(HTMLScriptElement.prototype, "src") ||
                                        Object.getOwnPropertyDescriptor(HTMLElement.prototype, "src");
                            if (oDesc && oDesc.set) {
                                var fnOrigSrcSet = oDesc.set;
                                Object.defineProperty(el, "src", {
                                    set: function (val) {
                                        fnOrigSrcSet.call(this, sanitizeChildAppUrl(val));
                                    },
                                    get: function () {
                                        return el.getAttribute("src");
                                    },
                                    configurable: true
                                });
                            }
                        } catch (e) {}
                    }
                    return el;
                };
            }
        } catch (e) {}

        // Intercept XMLHttpRequest to rewrite stale cache-buster URLs
        try {
            if (typeof XMLHttpRequest !== "undefined" && XMLHttpRequest.prototype && !XMLHttpRequest.prototype._mdrPatched) {
                XMLHttpRequest.prototype._mdrPatched = true;
                var fnOrigXhrOpen = XMLHttpRequest.prototype.open;
                XMLHttpRequest.prototype.open = function (method, url) {
                    if (typeof url === "string") {
                        arguments[1] = sanitizeChildAppUrl(url);
                    }
                    return fnOrigXhrOpen.apply(this, arguments);
                };
            }
        } catch (e) {}

        // Intercept window.fetch to rewrite stale cache-buster URLs
        try {
            if (typeof window !== "undefined" && typeof window.fetch === "function" && !window.fetch._mdrPatched) {
                var fnOrigFetch = window.fetch;
                window.fetch = function (resource, init) {
                    if (typeof resource === "string") {
                        resource = sanitizeChildAppUrl(resource);
                    } else if (resource && typeof resource.url === "string") {
                        try {
                            resource = new Request(sanitizeChildAppUrl(resource.url), resource);
                        } catch (e) {}
                    }
                    return fnOrigFetch.call(this, resource, init);
                };
                window.fetch._mdrPatched = true;
            }
        } catch (e) {}

        // Intercept sap.ui.component.load and sap.ui.core.Component.load
        try {
            if (sap.ui && sap.ui.component && typeof sap.ui.component.load === "function" && !sap.ui.component.load._mdrPatched) {
                var fnOrigCompLoad = sap.ui.component.load;
                sap.ui.component.load = function (mConfig) {
                    if (mConfig) {
                        if (mConfig.name === "com.intapptics.zmdrcntrlcmn") {
                            mConfig.url = "/mdrcapbtp.comintappticszmdrcntrlcmn-0.0.1/";
                        } else if (typeof mConfig.url === "string") {
                            mConfig.url = sanitizeChildAppUrl(mConfig.url);
                        }
                    }
                    return fnOrigCompLoad.apply(this, arguments);
                };
                sap.ui.component.load._mdrPatched = true;
            }
            if (sap.ui && sap.ui.core && sap.ui.core.Component && typeof sap.ui.core.Component.load === "function" && !sap.ui.core.Component.load._mdrPatched) {
                var fnOrigCoreCompLoad = sap.ui.core.Component.load;
                sap.ui.core.Component.load = function (mConfig) {
                    if (mConfig) {
                        if (mConfig.name === "com.intapptics.zmdrcntrlcmn") {
                            mConfig.url = "/mdrcapbtp.comintappticszmdrcntrlcmn-0.0.1/";
                        } else if (typeof mConfig.url === "string") {
                            mConfig.url = sanitizeChildAppUrl(mConfig.url);
                        }
                    }
                    return fnOrigCoreCompLoad.apply(this, arguments);
                };
                sap.ui.core.Component.load._mdrPatched = true;
            }
        } catch (e) {}

        return UIComponent.extend("com.intapptics.zmdrcntrlmain.Component", {
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

                // Intercept Fiori Launchpad ClientSideTargetResolution to sanitize outdated cache-buster GUIDs
                try {
                    if (sap.ushell && sap.ushell.Container) {
                        sap.ushell.Container.getServiceAsync("ClientSideTargetResolution").then(function (oCSTR) {
                            if (!oCSTR) { return; }

                            // Fix inbounds currently in memory
                            if (oCSTR._aInbounds && Array.isArray(oCSTR._aInbounds)) {
                                oCSTR._aInbounds.forEach(function (oInbound) {
                                    if (oInbound && oInbound.resolutionResult && oInbound.resolutionResult.url) {
                                        oInbound.resolutionResult.url = sanitizeChildAppUrl(oInbound.resolutionResult.url);
                                    }
                                });
                            }

                            // Intercept resolveHashFragment calls
                            if (!oCSTR._patchedForMdrNav && typeof oCSTR.resolveHashFragment === "function") {
                                oCSTR._patchedForMdrNav = true;
                                var fnOrigResolve = oCSTR.resolveHashFragment;
                                oCSTR.resolveHashFragment = function (sHashFragment) {
                                    return fnOrigResolve.apply(this, arguments).then(function (oRes) {
                                        if (oRes) {
                                            if (oRes.ui5ComponentName === "com.intapptics.zmdrcntrlcmn") {
                                                oRes.url = "/mdrcapbtp.comintappticszmdrcntrlcmn-0.0.1/";
                                            } else if (typeof oRes.url === "string") {
                                                oRes.url = sanitizeChildAppUrl(oRes.url);
                                            }
                                        }
                                        return oRes;
                                    });
                                };
                            }
                        }).catch(function (err) {
                            console.warn("ClientSideTargetResolution could not be patched:", err);
                        });
                    }
                } catch (e) {
                    console.warn("Error setting up CSTR navigation patch:", e);
                }


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
                if (this._oErrorHandler && typeof this._oErrorHandler.destroy === "function") {
                    this._oErrorHandler.destroy();
                }

                if (this._oGlobalBusyDialog && typeof this._oGlobalBusyDialog.destroy === "function") {
                    this._oGlobalBusyDialog.destroy();
                    this._oGlobalBusyDialog = null;
                }

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