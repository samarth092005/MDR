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
                var oStartupParameters = this.getComponentData().startupParameters;
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
            },

            // swapnil
            setTaskModels: function () {
                // set the task model
                var startupParameters = this.getComponentData().startupParameters;
                this.setModel(startupParameters.taskModel, "task");

                // set the task context model
                // var taskContextModel = new sap.ui.model.json.JSONModel(
                //     this._getTaskInstancesBaseURL() + "/context"
                // );
                // this.setModel(taskContextModel, "context");
                this.contextLoaded = this._loadTaskContext(); // returns a promise, stored on the component
            },

            _loadTaskContext: function () {
                var taskContextModel = new sap.ui.model.json.JSONModel();
                return taskContextModel
                    .loadData(this._getTaskInstancesBaseURL() + "/context")
                    .then(() => {
                        this.setModel(taskContextModel, "context");
                    });
            },

            _getTaskInstancesBaseURL: function () {
                return (
                    this._getWorkflowRuntimeBaseURL() +
                    "/task-instances/" +
                    this.getTaskInstanceID()
                );
            },

            _getWorkflowRuntimeBaseURL: function () {
                var ui5CloudService = this.getManifestEntry("/sap.cloud/service").replaceAll(".", "");
                var ui5ApplicationName = this.getManifestEntry("/sap.app/id").replaceAll(".", "");
                var appPath = `${ui5CloudService}.${ui5ApplicationName}`;
                return `/${appPath}/api/public/workflow/rest/v1`

            },

            getTaskInstanceID: function () {
                return this.getModel("task").getData().InstanceID;
            },

            getInboxAPI: function () {
                var startupParameters = this.getComponentData().startupParameters;
                return startupParameters.inboxAPI;
            },

            completeTask: function (approvalStatus, outcomeId, comment) {
                this.getModel("context").setProperty("/approved", approvalStatus);
                this.getModel("context").setProperty("/comment", comment);

                this._patchTaskInstance(outcomeId);
            },

            _patchTaskInstance: function (outcomeId) {
                const context = this.getModel("context").getData();
                var data = {
                    status: "COMPLETED",
                    context: { ...context, comment: context.comment || '' },
                    decision: outcomeId
                };

                jQuery.ajax({
                    url: `${this._getTaskInstancesBaseURL()}`,
                    method: "PATCH",
                    contentType: "application/json",
                    async: true,
                    data: JSON.stringify(data),
                    headers: {
                        "X-CSRF-Token": this._fetchToken(),
                    },
                }).done(() => {
                    this._refreshTaskList();
                })
            },

            _fetchToken: function () {
                var fetchedToken;

                jQuery.ajax({
                    url: this._getWorkflowRuntimeBaseURL() + "/xsrf-token",
                    method: "GET",
                    async: false,
                    headers: {
                        "X-CSRF-Token": "Fetch",
                    },
                    success(result, xhr, data) {
                        fetchedToken = data.getResponseHeader("X-CSRF-Token");
                    },
                });
                return fetchedToken;
            },

            _refreshTaskList: function () {
                this.getInboxAPI().updateTask("NA", this.getTaskInstanceID());
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

                                // Now mandatory for both approve and reject
                                if (!comment.trim()) {
                                    sap.m.MessageToast.show("Please enter a comment before proceeding.");
                                    return;
                                }

                                this._commentDialog.close();
                                this._commentDialog.destroy();
                                this._commentDialog = null; // Reset the dialog reference
                                this._completeTaskWithComment(isApproved, outcomeId, comment);
                            }.bind(this)
                        }),
                        endButton: new sap.m.Button({
                            text: "Cancel",
                            press: function () {
                                this._commentDialog.close();
                                this._commentDialog.destroy();
                                this._commentDialog = null; // Reset the dialog reference
                            }.bind(this)
                        })
                    });
                    // this.getView().addDependent(this._commentDialog);
                    this.getRootControl().addDependent(this._commentDialog);  
                } else {
                    sap.ui.getCore().byId(this.createId("commentInput")).setValue("");
                }

                this._commentDialog.open();
            },

            _completeTaskWithComment: function (isApproved, outcomeId, comment) {
                // Option A: update context with the comment BEFORE completing the task
                fetch(this._getTaskInstancesBaseURL() + "/context", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        comment: comment
                    })
                })
                    .then(() => {
                        this.completeTask(isApproved, outcomeId, comment);
                    })
                    .catch((err) => {
                        console.error("Failed to save comment before completing task:", err);
                        sap.m.MessageBox.error("Could not save your comment. Please try again.");
                    });
            }
            // swapnil
        });
    }
);