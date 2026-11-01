sap.ui.define([
    "sap/ui/core/UIComponent",
    "com/intapptics/zmdrbulkapprover/model/models"
], (UIComponent, models) => {
    "use strict";

    return UIComponent.extend("com.intapptics.zmdrbulkapprover.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // set the device model
            this.setModel(models.createDeviceModel(), "device");

            // enable routing
            this.getRouter().initialize();

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
            var sUrl = this._getTaskInstancesBaseURL() + "/context";
            return taskContextModel
                .loadData(sUrl)
                .then(() => {
                    this.setModel(taskContextModel, "context");
                    return taskContextModel.getData();
                })
                .catch((err) => {
                    console.warn("Direct bulk task context load failed with " + sUrl + ", attempting fallback...", err);
                    var sFallbackUrl = "/api/public/workflow/rest/v1/task-instances/" + this.getTaskInstanceID() + "/context";
                    return taskContextModel.loadData(sFallbackUrl)
                        .then(() => {
                            this.setModel(taskContextModel, "context");
                            return taskContextModel.getData();
                        })
                        .catch((err2) => {
                            console.error("All bulk task context load attempts failed:", err2);
                            this.setModel(taskContextModel, "context");
                            return {};
                        });
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
            var ui5CloudService = (this.getManifestEntry("/sap.cloud/service") || "").replaceAll(".", "");
            var ui5ApplicationName = (this.getManifestEntry("/sap.app/id") || "").replaceAll(".", "");
            var appPath = (ui5CloudService && ui5ApplicationName) ? `${ui5CloudService}.${ui5ApplicationName}` : "";
            if (appPath) {
                return `/${appPath}/api/public/workflow/rest/v1`;
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
            var startupParameters = (this.getComponentData() && this.getComponentData().startupParameters) || {};
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
            var startupParameters = (this.getComponentData() && this.getComponentData().startupParameters) || {};
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
                context: Object.assign({}, context, { comment: context.comment || '' }),
                decision: outcomeId
            };

            var sUrl = this._getTaskInstancesBaseURL();
            this._fetchTokenAsync().then(function (sToken) {
                return fetch(sUrl, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "X-CSRF-Token": sToken || ""
                    },
                    credentials: "include",
                    body: JSON.stringify(data)
                });
            }.bind(this)).then(function (res) {
                console.log("[Bulk Component] Task completed:", res.status);
                this._refreshTaskList();
            }.bind(this)).catch(function (err) {
                console.warn("[Bulk Component] Notice patching task instance:", err);
                this._refreshTaskList();
            }.bind(this));
        },

        _fetchTokenAsync: function () {
            var sUrl = this._getWorkflowRuntimeBaseURL() + "/xsrf-token";
            return fetch(sUrl, {
                method: "GET",
                headers: {
                    "X-CSRF-Token": "Fetch"
                },
                credentials: "include"
            }).then(function (res) {
                return res.headers.get("X-CSRF-Token") || "";
            }).catch(function (e) {
                console.warn("[Bulk Component] Notice fetching XSRF token:", e);
                return "";
            });
        },

        _refreshTaskList: function () {
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
                    console.warn("[Bulk Component] Notice updating inbox footer:", e);
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
});