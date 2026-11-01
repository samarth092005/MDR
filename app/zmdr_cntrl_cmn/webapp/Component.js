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

                var oListBinding = this.bindList(sEntityPath, null, null, mParameters.filters, bCount ? { $count: true } : undefined);

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

        // Shim Object.values for null/undefined to prevent ODataMetaModel.destroy TypeError in FLP
        try {
            if (typeof Object.values === "function" && !Object._mdrValuesPatched) {
                Object._mdrValuesPatched = true;
                var fnOrigObjectValues = Object.values;
                Object.values = function (obj) {
                    if (obj === undefined || obj === null) {
                        return [];
                    }
                    return fnOrigObjectValues.apply(this, arguments);
                };
            }
        } catch (e) {}

        // Ensure Element and ManagedObject registration is duplicate-safe in multi-app/iframe launchpad environments
        try {
            var fnPatchClass = function (oClass) {
                if (oClass && oClass.prototype && !oClass.prototype._mdrDuplicateSafe) {
                    oClass.prototype._mdrDuplicateSafe = true;
                    var fnOrigRegister = oClass.prototype.register;
                    if (typeof fnOrigRegister === "function") {
                        oClass.prototype.register = function () {
                            var sId = (typeof this.getId === "function" && this.getId()) || this.sId;
                            if (sId && (sId.startsWith("com.intapptics.") || sId.endsWith("-content"))) {
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
                if (oTaskModel) {
                    if (typeof oTaskModel.getProperty === "function") {
                        var pId = oTaskModel.getProperty("/InstanceID") || oTaskModel.getProperty("/id");
                        if (pId) return pId;
                    }
                    if (typeof oTaskModel.getData === "function") {
                        var oData = oTaskModel.getData() || {};
                        if (oData.InstanceID || oData.id) return oData.InstanceID || oData.id;
                    }
                }
                var oComponentData = this.getComponentData();
                var startupParameters = (oComponentData && oComponentData.startupParameters) || {};
                if (startupParameters.taskModel) {
                    if (typeof startupParameters.taskModel.getProperty === "function") {
                        var spId = startupParameters.taskModel.getProperty("/InstanceID") || startupParameters.taskModel.getProperty("/id");
                        if (spId) return spId;
                    }
                    if (typeof startupParameters.taskModel.getData === "function") {
                        var td = startupParameters.taskModel.getData() || {};
                        if (td.InstanceID || td.id) return td.InstanceID || td.id;
                    }
                }
                if (startupParameters.taskInstanceId) {
                    return Array.isArray(startupParameters.taskInstanceId) ? startupParameters.taskInstanceId[0] : startupParameters.taskInstanceId;
                }
                if (startupParameters.InstanceID) {
                    return Array.isArray(startupParameters.InstanceID) ? startupParameters.InstanceID[0] : startupParameters.InstanceID;
                }
                return "";
            },

            getTaskOrigin: function () {
                var oTaskModel = this.getModel("task");
                if (oTaskModel) {
                    if (typeof oTaskModel.getProperty === "function") {
                        var pOrigin = oTaskModel.getProperty("/SAP__Origin");
                        if (pOrigin) return pOrigin;
                    }
                    if (typeof oTaskModel.getData === "function") {
                        var oData = oTaskModel.getData() || {};
                        if (oData.SAP__Origin) return oData.SAP__Origin;
                    }
                }
                var oComponentData = this.getComponentData();
                var startupParameters = (oComponentData && oComponentData.startupParameters) || {};
                if (startupParameters.taskModel) {
                    if (typeof startupParameters.taskModel.getProperty === "function") {
                        var spOrigin = startupParameters.taskModel.getProperty("/SAP__Origin");
                        if (spOrigin) return spOrigin;
                    }
                    if (typeof startupParameters.taskModel.getData === "function") {
                        var td = startupParameters.taskModel.getData() || {};
                        if (td.SAP__Origin) return td.SAP__Origin;
                    }
                }
                if (startupParameters.SAP__Origin) {
                    return Array.isArray(startupParameters.SAP__Origin) ? startupParameters.SAP__Origin[0] : startupParameters.SAP__Origin;
                }
                if (typeof window !== "undefined" && window.location && window.location.search) {
                    try {
                        var urlParams = new URLSearchParams(window.location.search);
                        var urlOrigin = urlParams.get("SAP__Origin") || urlParams.get("origin");
                        if (urlOrigin) return urlOrigin;
                    } catch (_) {}
                }
                return "NA";
            },

            getInboxAPI: function () {
                var oComponentData = this.getComponentData();
                var startupParameters = (oComponentData && oComponentData.startupParameters) || {};
                return startupParameters.inboxAPI;
            },

            _callTakeActionCentral: function (workflowid, action, remarks) {
                var sTaskId = this.getTaskInstanceID() || (typeof window !== "undefined" && window._MDR_CURRENT_TASK_ID) || "";
                if (!workflowid && !sTaskId) {
                    console.error("[Component] Cannot take action: both workflowid and taskId are missing!");
                    return Promise.resolve();
                }
                var that = this;
                this._executedActions = this._executedActions || {};
                var sKey = workflowid + '_' + action;
                if (this._executedActions[sKey]) {
                    console.log("[Component] takeActionCentral already invoked for key:", sKey);
                    return Promise.resolve();
                }
                this._executedActions[sKey] = true;

                var sTaskId = that.getTaskInstanceID() || "";
                var sAppPrefix = that._getAppPrefix();
                var sBaseUrl = (sAppPrefix ? (sAppPrefix + "/") : "/") + "mdrapi/central/";
                var sActionUrl = sBaseUrl + "takeActionCentral";

                var oPayload = {
                    workflowid: workflowid,
                    action: action,
                    remarks: remarks || "",
                    bpaInstanceId: "",
                    taskId: sTaskId
                };

                var fnDoPost = function (sToken) {
                    var oHeaders = {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    };
                    if (sToken) {
                        oHeaders["X-CSRF-Token"] = sToken;
                    }
                    return fetch(sActionUrl, {
                        method: "POST",
                        headers: oHeaders,
                        body: JSON.stringify(oPayload)
                    }).then(function (res) {
                        if (!res.ok) {
                            return res.text().then(function (txt) {
                                throw new Error("Server returned HTTP " + res.status + ": " + txt);
                            });
                        }
                        return res.json().catch(function () { return res.text(); });
                    });
                };

                return fetch(sBaseUrl + "$metadata", {
                    method: "GET",
                    headers: {
                        "X-CSRF-Token": "Fetch"
                    }
                }).then(function (tokenRes) {
                    var csrfToken = tokenRes.headers.get("X-CSRF-Token") || "";
                    return fnDoPost(csrfToken);
                }).catch(function () {
                    return fnDoPost("");
                }).then(function (result) {
                    console.log("[Component] takeActionCentral response:", result);
                    return result;
                }).catch(function (err) {
                    console.error("[Component] takeActionCentral execution error:", err);
                    delete that._executedActions[sKey];
                    throw err;
                });
            },

            completeTask: function (approvalStatus, outcomeId, comment) {
                var oContextModel = this.getModel("context");
                if (oContextModel) {
                    oContextModel.setProperty("/approved", approvalStatus);
                    oContextModel.setProperty("/comment", comment || "");
                }

                var context = (oContextModel && oContextModel.getData()) || {};
                var sTaskId = this.getTaskInstanceID() || (typeof window !== "undefined" && window._MDR_CURRENT_TASK_ID) || "";
                var sWorkflowId = this.sWorkflowID || 
                                  (this._oMainController && this._oMainController.sWorkflowID) ||
                                  context.workflowid || context.workflowId || context.WorkflowId || context.sWorkflowID || "";

                if (!sWorkflowId && typeof window !== "undefined") {
                    try {
                        sWorkflowId = window._MDR_CURRENT_WORKFLOW_ID || sessionStorage.getItem("MDR_CURRENT_WORKFLOW_ID") || "";
                    } catch (_) {}
                }

                if (!sWorkflowId) {
                    try {
                        var oRoot = this.getRootControl();
                        var oView = oRoot && (oRoot.byId ? oRoot.byId("mainScreen") : null);
                        if (oView && oView.getController && oView.getController().sWorkflowID) {
                            sWorkflowId = oView.getController().sWorkflowID;
                        }
                    } catch (e) {}
                }

                if (!sWorkflowId) {
                    var oCompData = this.getComponentData();
                    var sp = (oCompData && oCompData.startupParameters) || {};
                    sWorkflowId = (sp.sWorkflowID && sp.sWorkflowID[0]) || 
                                  (sp.WorkflowId && sp.WorkflowId[0]) || 
                                  (sp.workflow_id && sp.workflow_id[0]) || "";
                }

                var sAction = approvalStatus ? "APPROVED" : "REJECTED";
                var sRemarks = comment || context.comment || "";
                var that = this;

                var pAction = (sWorkflowId || sTaskId) ? this._callTakeActionCentral(sWorkflowId, sAction, sRemarks) : Promise.resolve();

                return pAction.then(function (res) {
                    that._patchTaskInstance(outcomeId, sRemarks, approvalStatus);
                    var sStatusText = approvalStatus ? "approved" : "rejected";
                    var sMsg = "Workflow request " + (sWorkflowId || "") + " has been " + sStatusText + " successfully.";
                    sap.m.MessageBox.success(sMsg, {
                        title: approvalStatus ? "Request Approved" : "Request Rejected",
                        onClose: function () {
                            try {
                                if (window.history && window.history.length > 1) {
                                    window.history.back();
                                }
                            } catch (_) {}
                        }
                    });
                    return res;
                }).catch(function (err) {
                    console.error("[Component] Error in completeTask workflow action:", err);
                    sap.m.MessageBox.error("Action could not be completed: " + (err.message || err));
                    throw err;
                });
            },

            _patchTaskInstance: function (outcomeId, comment, approvalStatus) {
                var sTaskId = this.getTaskInstanceID();
                console.log("[Component] Completing task flow cleanly without 404 for task:", sTaskId);
                this._refreshTaskList(approvalStatus);
            },

            _fetchTokenAsync: function () {
                return Promise.resolve("");
            },

            _refreshTaskList: function (approvalStatus) {
                // In SAP Build Process Automation / Work Zone My Inbox, the task is completed directly
                // via BPA REST API inside takeActionCentral on CAP backend.
                // Do NOT call inboxAPI.updateTask() here because querying the completed task instance
                // returns 404 Not Found from TCM, triggering the generic 'Session expired' modal popup.
                // Instead, disable/hide the footer action buttons cleanly:
                var inboxAPI = this.getInboxAPI();
                if (inboxAPI) {
                    try {
                        if (typeof inboxAPI.setShowFooter === "function") {
                            inboxAPI.setShowFooter(false);
                        }
                        if (typeof inboxAPI.removeAction === "function") {
                            inboxAPI.removeAction("approve");
                            inboxAPI.removeAction("reject");
                        }
                    } catch (e) {
                        console.warn("[Component] Notice updating inbox footer:", e);
                    }
                }
            },

            _showCommentDialog: function (isApproved, outcomeId) {
                var that = this;
                var oCommentInput = new sap.m.TextArea(this.createId("commentInput"), {
                    width: "100%",
                    rows: 4,
                    placeholder: "Enter your comments (required)..."
                });

                if (!this._commentDialog) {
                    this._commentDialog = new sap.m.Dialog({
                        title: isApproved ? "Approve Request" : "Reject Request",
                        contentWidth: "400px",
                        content: [
                            new sap.m.Label({ text: "Comments", labelFor: "commentInput", required: true }),
                            oCommentInput
                        ],
                        beginButton: new sap.m.Button({
                            text: isApproved ? "Approve" : "Reject",
                            type: isApproved ? "Accept" : "Reject",
                            press: function () {
                                var sComment = oCommentInput.getValue();

                                if (!sComment.trim()) {
                                    sap.m.MessageToast.show("Please enter a comment before proceeding.");
                                    return;
                                }

                                that._commentDialog.close();
                                that._commentDialog.destroy();
                                that._commentDialog = null;
                                that.completeTask(isApproved, outcomeId, sComment);
                            }
                        }),
                        endButton: new sap.m.Button({
                            text: "Cancel",
                            press: function () {
                                that._commentDialog.close();
                                that._commentDialog.destroy();
                                that._commentDialog = null;
                            }
                        })
                    });
                    this.getRootControl().addDependent(this._commentDialog);  
                }

                this._commentDialog.open();
            }
        });
    }
);
