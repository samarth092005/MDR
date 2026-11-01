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
                oBinding.requestObject().then(function () {
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
                oBinding.requestObject().then(function () {
                    var oCtx = oBinding.getBoundContext();
                    oCtx.delete().then(function () {
                        if (mParameters.success) mParameters.success(null, null);
                    }).catch(function (oError) {
                        if (mParameters.error) mParameters.error(oError);
                    });
                }).catch(function (oError) {
                    if (mParameters.error) mParameters.error(oError);
                });
            };
        }

        // Ensure Element and ManagedObject registration is duplicate-safe in multi-app/iframe launchpad environments
        try {
            var fnPatchClass = function (oClass) {
                if (oClass && oClass.prototype && !oClass.prototype._mdrDuplicateSafe) {
                    oClass.prototype._mdrDuplicateSafe = true;
                    var fnOrigRegister = oClass.prototype.register;
                    if (typeof fnOrigRegister === "function") {
                        oClass.prototype.register = function () {
                            var sId = (typeof this.getId === "function" && this.getId()) || this.sId;
                            if (sId) {
                                var oElementClass = (typeof sap !== "undefined" && sap.ui && sap.ui.core && sap.ui.core.Element) ||
                                                    (typeof sap !== "undefined" && sap.ui && sap.ui.require && sap.ui.require("sap/ui/core/Element"));
                                var oOld = (oElementClass && oElementClass.registry && typeof oElementClass.registry.get === "function" && oElementClass.registry.get(sId)) ||
                                           (typeof sap !== "undefined" && sap.ui && sap.ui.getCore && sap.ui.getCore().byId && sap.ui.getCore().byId(sId));
                                if (oOld && oOld !== this) {
                                    try {
                                        if (typeof oOld.destroy === "function") {
                                            oOld.destroy(true);
                                        } else if (oElementClass && oElementClass.registry && typeof oElementClass.registry.remove === "function") {
                                            oElementClass.registry.remove(sId);
                                        }
                                    } catch (err) {
                                        console.warn("MDR: Error destroying duplicate element " + sId + ":", err);
                                    }
                                }
                            }
                            return fnOrigRegister.apply(this, arguments);
                        };
                    }
                }
            };

            var Element = (typeof sap !== "undefined" && sap.ui && sap.ui.core && sap.ui.core.Element) ||
                          (typeof sap !== "undefined" && sap.ui && sap.ui.require && sap.ui.require("sap/ui/core/Element"));
            if (Element) {
                fnPatchClass(Element);
            } else if (typeof sap !== "undefined" && sap.ui && sap.ui.require) {
                sap.ui.require(["sap/ui/core/Element"], fnPatchClass);
            }

            var ManagedObject = (typeof sap !== "undefined" && sap.ui && sap.ui.base && sap.ui.base.ManagedObject) ||
                                (typeof sap !== "undefined" && sap.ui && sap.ui.require && sap.ui.require("sap/ui/base/ManagedObject"));
            if (ManagedObject) {
                fnPatchClass(ManagedObject);
            } else if (typeof sap !== "undefined" && sap.ui && sap.ui.require) {
                sap.ui.require(["sap/ui/base/ManagedObject"], fnPatchClass);
            }
        } catch (e) {
            console.warn("MDR: Could not install Element duplicate-safe hook:", e);
        }

        return UIComponent.extend("com.intapptics.zmdrcntrlcmn.Component", {
            /**
             * Intercept model initialization from manifest to resolve dataSource URI with the
             * app-scoped prefix (/mdrcapbtp.comintappticszmdrcntrlcmn-0.0.1/) required
             * by the SAP Build Work Zone managed approuter in Fiori Launchpad.
             */
            _initComponentModels: function (oManifestModels, oManifestDataSources) {
                try {
                    var sModulePath = sap.ui.require.toUrl("com/intapptics/zmdrcntrlcmn");
                    var sPrefix = "";
                    if (sModulePath && sModulePath.startsWith("/")) {
                        sPrefix = sModulePath.endsWith("/") ? sModulePath : sModulePath + "/";
                    } else if (typeof window !== "undefined" && window.location && (window.location.hostname.includes("launchpad") || (window.sap && window.sap.ushell))) {
                        sPrefix = "/mdrcapbtp.comintappticszmdrcntrlcmn-0.0.1/";
                    }
                    if (sPrefix) {
                        if (oManifestDataSources && oManifestDataSources.mainService) {
                            oManifestDataSources.mainService.uri = sPrefix + "mdrapi/central/";
                        }
                        if (oManifestDataSources && oManifestDataSources.workflowService) {
                            oManifestDataSources.workflowService.uri = sPrefix + "mdrapi/workflow/";
                        }
                    } else {
                        if (oManifestDataSources && oManifestDataSources.mainService) {
                            oManifestDataSources.mainService.uri = "/mdrapi/central/";
                        }
                        if (oManifestDataSources && oManifestDataSources.workflowService) {
                            oManifestDataSources.workflowService.uri = "/mdrapi/workflow/";
                        }
                    }
                } catch (e) {
                    console.warn("Could not prefix dataSources in _initComponentModels:", e);
                }

                UIComponent.prototype._initComponentModels.call(this, oManifestModels, oManifestDataSources);
            },
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
            getComponentData: function () {
                var oData = UIComponent.prototype.getComponentData.apply(this, arguments);
                if (!oData) {
                    if (!this._oStandaloneComponentData) {
                        var oStartupParams = {};
                        if (typeof window !== "undefined" && window.location && window.location.search) {
                            var oParams = new URLSearchParams(window.location.search);
                            oParams.forEach(function (val, key) {
                                oStartupParams[key] = [val];
                            });
                        }
                        this._oStandaloneComponentData = { startupParameters: oStartupParams };
                    }
                    return this._oStandaloneComponentData;
                }
                if (!oData.startupParameters) {
                    var oStartupParams = {};
                    if (typeof window !== "undefined" && window.location && window.location.search) {
                        var oParams = new URLSearchParams(window.location.search);
                        oParams.forEach(function (val, key) {
                            oStartupParams[key] = [val];
                        });
                    }
                    oData.startupParameters = oStartupParams;
                }
                return oData;
            },

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

                // Ensure models are properly resolved with app prefix in BTP Launchpad
                try {
                    var sPrefix = this._getAppPrefix();
                    if (sPrefix) {
                        var sExpectedUrl = (sPrefix.endsWith("/") ? sPrefix : sPrefix + "/") + "mdrapi/central/";
                        var oModel = this.getModel();
                        var sCurrent = oModel && typeof oModel.getServiceUrl === "function" ? oModel.getServiceUrl() : "";
                        if (!oModel || sCurrent !== sExpectedUrl) {
                            if (oModel) {
                                try { oModel.destroy(); } catch (e) {}
                            }
                            this.setModel(new V4ODataModel({
                                serviceUrl: sExpectedUrl,
                                synchronizationMode: "None",
                                operationMode: "Server",
                                autoExpandSelect: true,
                                earlyRequests: true
                            }));
                        }
                    }
                } catch (e) {
                    console.warn("Could not verify or set resolved ODataModel in init:", e);
                }

                // Global reference of busy dialog
                this._oGlobalBusyDialog = new BusyDialog();

                // Initialize the error handler with the component
                this._oErrorHandler = new ErrorHandler(this);

                // Attach BEFORE initialize(), not after
                this.getRouter().attachRouteMatched(function (evt) {
                    console.log("Route matched:", evt.getParameter("name"), evt.getParameter("arguments"));
                });
                this.getRouter().attachBypassed(function () {
                    console.log("Router BYPASSED — no route matched current hash");
                });

                // enable routing
                this.getRouter().initialize();

                // ---- ADD THE DIAGNOSTIC LOGGING RIGHT HERE ---- 
                this.getRouter().attachRouteMatched(function (evt) {
                    console.log("Route matched1:", evt.getParameter("name"));
                });
                this.getRouter().attachBypassed(function () {
                    console.log("Router BYPASSED1 — no route matched current hash");
                });
                // --------------------------------------------

                // set the device model
                this.setModel(models.createDeviceModel(), "device");

                // swapnil
                var oComponentData = this.getComponentData();
                var oStartupParameters = (oComponentData && oComponentData.startupParameters) || {};
                var oTaskModel = oStartupParameters.taskModel;

                if (oTaskModel) {
                    this.setTaskModels();
                    const rejectOutcomeId = "reject";
                    this.getInboxAPI().addAction(
                        {
                            action: rejectOutcomeId,
                            label: "Reject",
                            type: "reject",
                        },
                        function () {
                            // this.completeTask(false, rejectOutcomeId);
                            this._showCommentDialog(false, rejectOutcomeId);
                        },
                        this
                    );
                    const approveOutcomeId = "approve";
                    this.getInboxAPI().addAction(
                        {
                            action: approveOutcomeId,
                            label: "Approve",
                            type: "accept",
                        },
                        function () {
                            // this.completeTask(true, approveOutcomeId);
                            this._showCommentDialog(true, approveOutcomeId);
                        },
                        this
                    );
                }
                // swapnil

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
            },

            // swapnil
            setTaskModels: function () {
                // set the task model
                var oComponentData = this.getComponentData();
                var startupParameters = (oComponentData && oComponentData.startupParameters) || {};
                if (startupParameters.taskModel) {
                    this.setModel(startupParameters.taskModel, "task");
                    this.contextLoaded = this._loadTaskContext(); // returns a promise, stored on the component
                }
            },

            _loadTaskContext: function () {
                var taskContextModel = new sap.ui.model.json.JSONModel();
                var sUrl = this._getTaskInstancesBaseURL() + "/context";
                return taskContextModel
                    .loadData(sUrl)
                    .then(() => {
                        this.setModel(taskContextModel, "context");
                        return taskContextModel.getData();
                    })
                    .catch((err) => {
                        console.warn("Direct task context load failed with " + sUrl + ", attempting fallback /api/public/workflow/rest/v1...", err);
                        var sFallbackUrl = "/api/public/workflow/rest/v1/task-instances/" + this.getTaskInstanceID() + "/context";
                        return taskContextModel.loadData(sFallbackUrl)
                            .then(() => {
                                this.setModel(taskContextModel, "context");
                                return taskContextModel.getData();
                            })
                            .catch((err2) => {
                                console.error("All task context load attempts failed:", err2);
                                this.setModel(taskContextModel, "context");
                                return {};
                            });
                    });
            },

            _getAppPrefix: function () {
                var sAppPrefix = "";
                try {
                    sAppPrefix = sap.ui.require.toUrl("com/intapptics/zmdrcntrlcmn") || "";
                } catch (e) {}
                if (sAppPrefix && sAppPrefix !== "." && !sAppPrefix.startsWith("./")) {
                    return sAppPrefix.replace(/\/+$/, "");
                }
                try {
                    if (this.getManifestObject) {
                        var sBase = this.getManifestObject().getBaseUrl();
                        if (sBase && sBase !== "." && !sBase.startsWith("./")) {
                            return sBase.replace(/\/+$/, "");
                        }
                    }
                } catch (e) {}
                return "";
            },

            _getTaskInstancesBaseURL: function () {
                return (
                    this._getWorkflowRuntimeBaseURL() +
                    "/task-instances/" +
                    this.getTaskInstanceID()
                );
            },

            _getWorkflowRuntimeBaseURL: function () {
                var sPrefix = this._getAppPrefix();
                if (sPrefix) {
                    return sPrefix + "/api/public/workflow/rest/v1";
                }
                return "/api/public/workflow/rest/v1";
            },

            getTaskInstanceID: function () {
                var oTaskModel = this.getModel("task");
                var oData = (oTaskModel && oTaskModel.getData()) || {};
                return oData.InstanceID || oData.id || "";
            },

            getInboxAPI: function () {
                var oComponentData = this.getComponentData();
                var startupParameters = (oComponentData && oComponentData.startupParameters) || {};
                return startupParameters.inboxAPI;
            },

            _callTakeActionCentral: function (workflowid, action, remarks) {
                if (!workflowid) return Promise.resolve();
                this._executedActions = this._executedActions || {};
                var sKey = workflowid + '_' + action;
                if (this._executedActions[sKey]) {
                    console.log("[Component] takeActionCentral already invoked for key:", sKey);
                    return Promise.resolve();
                }
                this._executedActions[sKey] = true;
                var sAppPrefix = this._getAppPrefix();
                var sBaseUrl = (sAppPrefix ? (sAppPrefix + "/") : "/") + "mdrapi/central/";
                var sActionUrl = sBaseUrl + "takeActionCentral";

                return fetch(sBaseUrl, {
                    method: "GET",
                    headers: {
                        "X-CSRF-Token": "Fetch",
                        "Accept": "application/json"
                    }
                }).then(function (tokenRes) {
                    var csrfToken = tokenRes.headers.get("X-CSRF-Token") || "";
                    return fetch(sActionUrl, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json",
                            "X-CSRF-Token": csrfToken
                        },
                        body: JSON.stringify({
                            workflowid: workflowid,
                            action: action,
                            remarks: remarks || "",
                            bpaInstanceId: "",
                            taskId: this.getTaskInstanceID() || ""
                        })
                    });
                }).then(function (res) {
                    return res.text();
                }).then(function (result) {
                    console.log("[Component] takeActionCentral response:", result);
                    return result;
                }).catch(function (err) {
                    console.warn("[Component] takeActionCentral execution error:", err);
                });
            },

            completeTask: function (approvalStatus, outcomeId, comment) {
                var oContextModel = this.getModel("context");
                if (oContextModel) {
                    oContextModel.setProperty("/approved", approvalStatus);
                    oContextModel.setProperty("/comment", comment || "");
                }

                var context = (oContextModel && oContextModel.getData()) || {};
                var sWorkflowId = context.workflowid || context.workflowId || context.WorkflowId || "";

                if (!sWorkflowId) {
                    try {
                        var oRoot = this.getRootControl();
                        var oView = oRoot && (oRoot.byId ? oRoot.byId("mainScreen") : null);
                        if (oView && oView.getController && oView.getController().sWorkflowID) {
                            sWorkflowId = oView.getController().sWorkflowID;
                        }
                    } catch (e) {}
                }

                var sAction = approvalStatus ? "APPROVED" : "REJECTED";
                var sRemarks = comment || context.comment || "";

                if (sWorkflowId) {
                    this._callTakeActionCentral(sWorkflowId, sAction, sRemarks);
                }

                this._patchTaskInstance(outcomeId, sRemarks, approvalStatus);
            },

            _patchTaskInstance: function (outcomeId, comment, approvalStatus) {
                // Task is completed and database record promoted via takeActionCentral on CAP backend.
                // Refresh task list in My Inbox via official Inbox API:
                console.log("[Component] Completing task flow and refreshing task list");
                this._refreshTaskList();
            },

            _fetchTokenAsync: function () {
                return Promise.resolve("");
            },

            _refreshTaskList: function () {
                var inboxAPI = this.getInboxAPI();
                if (inboxAPI && typeof inboxAPI.updateTask === "function") {
                    try {
                        inboxAPI.updateTask("NA", this.getTaskInstanceID());
                    } catch (e) {
                        console.warn("inboxAPI.updateTask warning:", e);
                    }
                }
            },

            _showCommentDialog: function (isApproved, outcomeId) {
                if (!this._commentDialog) {
                    this._commentDialog = new sap.m.Dialog({
                        title: isApproved ? "Approve Request" : "Reject Request",
                        contentWidth: "400px",
                        content: [
                            new sap.m.Label({ text: "Comments", labelFor: "commentInput", required: true }),
                            new sap.m.TextArea(this.createId("commentInput"), {
                                width: "100%",
                                rows: 4,
                                placeholder: "Enter your comments (required)..."
                            })
                        ],
                        beginButton: new sap.m.Button({
                            text: isApproved ? "Approve" : "Reject",
                            type: isApproved ? "Accept" : "Reject",
                            press: function () {
                                const comment = sap.ui.getCore().byId(this.createId("commentInput")).getValue();

                                if (!comment.trim()) {
                                    sap.m.MessageToast.show("Please enter a comment before proceeding.");
                                    return;
                                }

                                this._commentDialog.close();
                                this._commentDialog.destroy();
                                this._commentDialog = null;
                                this.completeTask(isApproved, outcomeId, comment);
                            }.bind(this)
                        }),
                        endButton: new sap.m.Button({
                            text: "Cancel",
                            press: function () {
                                this._commentDialog.close();
                                this._commentDialog.destroy();
                                this._commentDialog = null;
                            }.bind(this)
                        })
                    });
                    this.getRootControl().addDependent(this._commentDialog);  
                } else {
                    sap.ui.getCore().byId(this.createId("commentInput")).setValue("");
                }

                this._commentDialog.open();
            }
        });
    }
);
