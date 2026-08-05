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
});