sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/model/odata/v4/ODataModel"
], function (BaseObject, V4ODataModel) {
    "use strict";

    return BaseObject.extend("com.intapptics.zmdrcntrlcmn.utils.ODataV4Client", {
        constructor: function (vServiceUrlOrConfig) {
            BaseObject.apply(this, arguments);
            
            var sUrl = "";
            if (typeof vServiceUrlOrConfig === "string") {
                sUrl = vServiceUrlOrConfig;
            } else {
                sUrl = vServiceUrlOrConfig.serviceUrl;
            }

            // Ensure trailing slash for V4 ODataModel
            if (!sUrl.endsWith("/")) {
                sUrl += "/";
            }

            // Replace /odata/v2/ proxy paths with native V4 paths if present
            sUrl = sUrl.replace("/odata/v2/api/", "/api/");

            // Initialize native V4 ODataModel
            this._oNativeV4Model = new V4ODataModel({
                serviceUrl: sUrl,
                synchronizationMode: "None",
                operationMode: "Server",
                autoExpandSelect: true
            });
        },

        // Expose underlying model for potential debugging
        getNativeModel: function() {
            return this._oNativeV4Model;
        },

        read: function (sPath, mParameters) {
            mParameters = mParameters || {};
            
            var bCount = sPath.endsWith("/$count");
            var sEntityPath = bCount ? sPath.replace("/$count", "") : sPath;
            
            var iSkip = (mParameters.urlParameters && mParameters.urlParameters.$skip) || 0;
            var iTop = (mParameters.urlParameters && mParameters.urlParameters.$top) || 1000;
            
            var oListBinding = this._oNativeV4Model.bindList(sEntityPath, null, null, mParameters.filters, bCount ? { $$count: true } : undefined);
            
            oListBinding.requestContexts(iSkip, iTop).then(function (aContexts) {
                if (bCount) {
                    if (mParameters.success) {
                        mParameters.success(oListBinding.getLength().toString(), null);
                    }
                } else {
                    var aData = aContexts.map(function (c) { return c.getObject(); });
                    if (mParameters.success) {
                        mParameters.success({ results: aData }, null);
                    }
                }
            }).catch(function (oError) {
                if (mParameters.error) {
                    mParameters.error(oError);
                }
            });
        },

        create: function (sPath, oData, mParameters) {
            mParameters = mParameters || {};
            
            var oListBinding = this._oNativeV4Model.bindList(sPath);
            var oContext = oListBinding.create(oData, true);
            
            oContext.created().then(function () {
                if (mParameters.success) {
                    mParameters.success(oContext.getObject(), null);
                }
            }).catch(function (oError) {
                if (mParameters.error) {
                    mParameters.error(oError);
                }
            });
        },

        update: function (sPath, oData, mParameters) {
            mParameters = mParameters || {};
            
            var oBinding = this._oNativeV4Model.bindContext(sPath);
            oBinding.requestObject().then(function() {
                var oCtx = oBinding.getBoundContext();
                for (var sKey in oData) {
                    oCtx.setProperty(sKey, oData[sKey]);
                }
                
                // Submit batch/changes (V4 submits automatically in TwoWay/None with submitBatch if auto)
                // Assuming default auto-submission in update group
                if (mParameters.success) {
                    mParameters.success(oData, null);
                }
            }).catch(function (oError) {
                if (mParameters.error) {
                    mParameters.error(oError);
                }
            });
        },

        remove: function (sPath, mParameters) {
            mParameters = mParameters || {};
            
            var oBinding = this._oNativeV4Model.bindContext(sPath);
            oBinding.requestObject().then(function() {
                var oCtx = oBinding.getBoundContext();
                oCtx.delete().then(function() {
                    if (mParameters.success) {
                        mParameters.success(null, null);
                    }
                }).catch(function(oError) {
                    if (mParameters.error) {
                        mParameters.error(oError);
                    }
                });
            }).catch(function (oError) {
                if (mParameters.error) {
                    mParameters.error(oError);
                }
            });
        }
    });
});
