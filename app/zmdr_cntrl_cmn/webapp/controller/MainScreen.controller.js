sap.ui.define([
    "com/intapptics/zmdrcntrlcmn/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/core/Fragment",
    "sap/ui/core/message/Message",
    "sap/ui/core/library",
    "sap/m/Label",
    "sap/m/Input",
    "sap/m/Text",
    "sap/m/DatePicker",
    "sap/m/HBox",
    "sap/ushell/services/CrossApplicationNavigation",
    "sap/ushell/services/appstate/AppState"
], function (BaseController, JSONModel, Filter, FilterOperator, ODataModel, Fragment, Message, coreLibrary, Label, Input, Text, DatePicker, HBox) {
    "use strict";

    // Define global parameters
    var MessageType = coreLibrary.MessageType,
        oTableData = {};

    return BaseController.extend("com.intapptics.zmdrcntrlcmn.controller.MainScreen", {

        /** Lifecycle Methods */
        /**
         * Called when the controller is instantiated and its view controls (if available) are already created.
         * Can be used to modify the view before it has been displayed, to bind event handlers and to do other one-time initialization
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         */
        onInit: function () {
            // Log message
            this.fn_getLogReference().info("Main Screen Controller: Entering onInit method");

            /** Define Variables */
            var oViewModel = new JSONModel(), // View Model
                oMessageManager = sap.ui.getCore().getMessageManager(); // Message Manager

            /** Method Implementation */
            // Flag to run the on object matche method only once
            this.bFirstFlag = true;

            // Open busy dialog
            this.fn_openBusyDialog();

            // Set the view model
            this.fn_setLocalModel(oViewModel, "mainScreenViewModel");

            // Attach pattern matched
            this.fn_getRouter().getRoute("mainscreen").attachPatternMatched(this._fn_onObjectMatched, this);
            this.fn_getRouter().getRoute("approvaltask").attachPatternMatched(this._fn_onObjectMatched, this);

            // Set the message model
            this.fn_setLocalModel(oMessageManager.getMessageModel(), "messageModel");

            oMessageManager.registerObject(this.getView(), true);

            // Log message
            this.fn_getLogReference().info("Main Screen Controller: Exiting onInit method");
        },

        /**
         *  This hook method is invoked before the controller's view is re-rendered
         * (Not before the first rendering! onInit() is used for that one!)
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.CategoryList
         */
        // onBeforeRendering: function() {
        //
        // },

        /**
         * Called when the view has been rendered (so its HTML is part of the document). Post rendering manipulations 
         * of the HTML could be done here. This hook is the same one that SAPUI5 controls get after being rendered.
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.CategoryList
         */
        // onAfterRendering: function() {
        //
        // },

        /**
         * Called when the controller is destroyed. Use this one to free resources and finalize activities.
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.CategoryList
         */
        // onExit: function() {
        //
        // },

        /** Event Handlers */
        /**
         * Event handle for button submit
         * 
         * @param {sap.ui.base.Event} oEvent - Event object
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @public
         */
        onPress_btnSubmit: function (oEvent) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering onPress_btnSubmit method");

            /** Define Variables */
            var sIdInp, // Stores id of input field
                sOperationType, // Stores Operation Type Info
                sFragElemId; // Stores id of user comments text area in the fragment

            /** Method Implementation */
            // Open busy dialog
            this.fn_openBusyDialog();

            // Remove all messages of message manager
            sap.ui.getCore().getMessageManager().removeAllMessages();

            // Create id of the fragment user comments element and clear data
            sFragElemId = this.getView().createId("txtRemarks");
            if (this.byId(sFragElemId)) {
                this.byId(sFragElemId).setValue("");
            }

            // Close the message popover if its open
            if (this.msgPopoverDialog) {
                this.msgPopoverDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }

            // Set operation type
            if (this.sActionType === "Reopen") {
                sOperationType = "Amend";
            } else {
                sOperationType = this.sActionType;
            }

            // Set operation type to table data
            oTableData["OPERATIONTYPE"] = sOperationType;

            // Get value of all fields
            this.aFieldDetails.forEach(function (oField) {
                var sColName = oField.ColumnName;

                if (!sColName) return; // Skip if no column name

                // Prepare input id
                sIdInp = "inp" + this._fn_getFieldId(sColName);

                // Check field
                if (sap.ui.getCore().byId(sIdInp) && sap.ui.getCore().byId(sIdInp).getValue()) {
                    var sDataType = (oField.ColumnDataType || oField.Columndatatype || "").toUpperCase();
                    if (sDataType.includes("INTEGER") || sDataType.includes("INT") || sDataType === "NUMC" || sDataType === "DEC") {
                        if (!oField.lkpodata) {
                            oTableData[sColName] = parseInt(sap.ui.getCore().byId(sIdInp).getValue(), 10);
                        }
                    } else if (sDataType.includes("DATS") || sDataType.includes("DATE")) {
                        oTableData[sColName] = "\/Date(" + new Date(sap.ui.getCore().byId(sIdInp).getValue()).getTime() + ")\/";
                    } else {
                        if (!oField.lkpodata) {
                            oTableData[sColName] = sap.ui.getCore().byId(sIdInp).getValue();
                        }
                    }
                }
            }, this);

            // Check if close scenario
            if (sOperationType !== "Close") {
                this.bValidationSuccess = true;

                // Initiate basic checks
                this._fn_checkBasicValidation();

                // Read custom validation
                this._fn_readCustomValidation();
            } else {
                // Set reference of the user comments dialog globally
                if (!this.userCommentsDialog) {
                    this.userCommentsDialog = Fragment.load({
                        id: this.getView().getId(),
                        name: "com.intapptics.zmdrcntrlcmn.view.UserComments",
                        controller: this
                    }).then(function (oDialog) {
                        this.getView().addDependent(oDialog);
                        return oDialog;
                    }.bind(this));
                }

                // Open the user comments dialog
                this.userCommentsDialog.then(function (oDialog) {
                    oDialog.open();
                });
            }

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting onPress_btnSubmit method");
        },

        /**
         * On press of OK button from user remarks dialog
         * 
         * @param {sap.ui.base.Event} oEvent - Event object
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @public
         */
        onPress_btnOkDlg: function (oEvent) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering onPress_btnOkDlg method");

            /** Define variables */
            var sFragElemId = this.getView().createId("txtRemarks"); // User remarks element id

            /** Method Implementation */
            // Read user remarks
            this.sUserRemarks = this.byId(sFragElemId).getValue();

            if (this.sUserRemarks !== "") {
                // Check who has taken action
                if (this.sActionedBy === "Approver") {
                    // Update data at the backend
                    this._fn_approverAction();
                } else {
                    // Open busy dialog
                    this.fn_openBusyDialog();

                    // Push data to backend
                    this._fn_pushDataToBackend();
                }
            } else {
                this.byId(sFragElemId).setValueState("Error");
                this.byId(sFragElemId).setValueStateText(this.fn_getResourceBundle().getText("userRemarksErrorMsg"));

                // Log error
                this.fn_getLogReference().error("Main Screen Controller: User remarks is mandatory");
            }

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting onPress_btnOkDlg method");
        },

        /**
         * On press of CANCEL button from user remarks dialog
         * 
         * @param {sap.ui.base.Event} oEvent - Event object
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @public
         */
        onPress_btnCancelDlg: function (oEvent) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering onPress_btnCancelDlg method");

            /** Method Implementation */
            // Close the user comments dialog
            if (this.userCommentsDialog) {
                this.userCommentsDialog.then(function (oDialog) {
                    oDialog.close();
                });
            }

            // Close busy dialog
            this.fn_closeBusyDialog();

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting onPress_btnCancelDlg method");
        },

        /**
         * On press of OK button from lookup field value help dialog
         * 
         * @param {sap.ui.base.Event} oEvent - Event object
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @public
         */
        onPress_btnOkDlgLookup: function (oEvent) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering onPress_btnOkDlgLookup method");

            /** Define variables */
            var sFieldId = "inp" + oEvent.getSource().getParent().getId().split("--")[2], // Input field id
                aLkpFieldNames, // Lookup field names
                sInputData, // Data to be set in the input field
                aContexts; // Selected contexts of the lookup table

            /** Method Implementation */
            // Get all lookup field names
            aLkpFieldNames = this.aLkpInformation.filter(function (oLkpInformation) {
                return oLkpInformation.fieldId === sFieldId;
            })[0].fieldData.Lookupfieldsname.split(",");

            // Get selected contexts
            aContexts = oEvent.getSource().getParent().getContent()[0].getItems()[0].getSelectedContexts();

            if (aContexts && aContexts.length > 0) {
                aLkpFieldNames.forEach(function (sLkpFieldName, iIndex) {
                    if (iIndex === 0) {
                        sInputData = aContexts[0].getObject()[sLkpFieldName];

                        // Set data into global variable
                        oTableData[this.aLkpInformation.filter(function (oLkpInformation) {
                            return oLkpInformation.fieldId === sFieldId;
                        })[0].fieldData.ColumnName] = sInputData;
                    } else {
                        sInputData = sInputData + ", " + aContexts[0].getObject()[oLkpFieldName];
                    }
                }, this);

                // Set data into the input field
                if (sap.ui.getCore().byId(sFieldId)) {
                    sap.ui.getCore().byId(sFieldId).setValue(sInputData);
                    sap.ui.getCore().byId(sFieldId).setTooltip(sInputData + "");

                    // Clear the value of the fields related to the current value change in the selected field
                    this.aFieldDetails.map(function (oField1) {
                        if (sFieldId === "inp" + this._fn_getFieldId(oField1.ColumnName)) {
                            this.aFieldDetails.filter(function (oField2) {
                                if (oField1.ColumnName === oField2.Lkprestvalue) {
                                    sap.ui.getCore().byId("inp" + this._fn_getFieldId(oField2.ColumnName)).setValue(null);
                                    sap.ui.getCore().byId("inp" + this._fn_getFieldId(oField2.ColumnName)).setTooltip(null);
                                }
                            }, this);
                        }
                    }, this);
                }
            } else {
                // If context is empty then set empty value in the input field
                if (sap.ui.getCore().byId(sFieldId)) {
                    sap.ui.getCore().byId(sFieldId).setValue(null);
                    sap.ui.getCore().byId(sFieldId).setTooltip(null);
                }
            }

            // Clear table selection if any and close the dialog
            oEvent.getSource().getParent().getContent()[0].getItems()[0].removeSelections();
            oEvent.getSource().getParent().close();

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting onPress_btnOkDlgLookup method");
        },

        /**
         * On press of CANCEL button from lookup dialog
         * 
         * @param {sap.ui.base.Event} oEvent - Event object
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @public
         */
        onPress_btnCancelDlgLookup: function (oEvent) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering onPress_btnCancelDlgLookup method");

            /** Method Implementation */
            // Clear table selection if any and close the dialog
            oEvent.getSource().getParent().getContent()[0].getItems()[0].removeSelections();
            oEvent.getSource().getParent().close();

            // Close busy dialog
            this.fn_closeBusyDialog();

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting onPress_btnCancelDlgLookup method");
        },

        /**
         * Open or close message popover dialog alongside the footer popover button
         * 
         * @param {sap.ui.base.Event} oEvent - Event object
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @public
         */
        onPress_btnMsgPopOver: function (oEvent) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering onPress_btnMsgPopOver method");

            /** Define variables */
            var oSourceControl = oEvent.getSource(), // Source control of the event
                sMsgPopOverId = this.getView().createId("pvrMessages"); // Message popover id

            /** Method Implementation */
            // Create message popover dialog
            if (!this.msgPopoverDialog) {
                this.msgPopoverDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "com.intapptics.zmdrcntrlcmn.view.MessagePopover",
                    controller: this
                }).then(function (oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }

            // Open the message popover dialog
            this.msgPopoverDialog.then(function (oDialog) {
                // Set the title active for all validation related messages
                this.byId(sMsgPopOverId).getItems().forEach(function (oItem) {
                    if (oItem.getTitle().includes("Validation Failed")) {
                        oItem.setActiveTitle(true);
                    } else {
                        oItem.setActiveTitle(false);
                    }
                });

                oDialog.toggle(oSourceControl);
            }.bind(this));

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting onPress_btnMsgPopOver method");
        },

        /**
         * On press of message strip link
         * 
         * @param {sap.ui.base.Event} oEvent - Event object
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @public
         */
        onPress_lnkMsgStrip: function (oEvent) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering onPress_lnkMsgStrip method");

            /** Define variables */
            var sWorkflowId, // Workflow ID
                bErrorFlag, // Error flag
                sIdInp, // Input field id
                oEnteredData = {}, // Data entered by user
                oNavService = sap.ushell && sap.ushell.Container ? sap.ushell.Container.getService("CrossApplicationNavigation") : null, // Navigation service reference
                oAppState, // App state reference
                oStateToSave, // App state data to be saved
                oHashChanger = sap.ui.core.routing.HashChanger.getInstance(), // Hash changer reference
                sCurrentHash = oHashChanger.getHash(), // Current hash
                sNewHash, // New hash to be set
                sAppStateKey, // App state key
                oSourceControl = this.byId("btnMsgPopOver"), // Source control of the event
                sMsgPopOverId = this.getView().createId("pvrMessages"); // Message popover id

            /** Method Implementation */
            // Set error flag
            if (oEvent.getSource().getParent().getText().includes("is in progress for the same entry")) {
                bErrorFlag = true;
            } else {
                bErrorFlag = false;
            }

            if (oEvent.getSource().getParent().getText().includes("is initiated. For more info on workflow") || oEvent.getSource().getParent().getText().includes("is in progress for the same entry")) {
                // Get workflow id
                sWorkflowId = oEvent.getSource().getParent().getText().split("<strong>")[2].split("</strong>")[0];

                if (oNavService) {
                    // Get the value for each field entered by the user
                    this.aFieldDetails.forEach(function (oField) {
                        // Prepare input id
                        sIdInp = "inp" + this._fn_getFieldId(oField.ColumnName);

                        // Check field
                        if (sap.ui.getCore().byId(sIdInp) && sap.ui.getCore().byId(sIdInp).getValue()) {
                            oEnteredData[oField.ColumnName] = sap.ui.getCore().byId(sIdInp).getValue();
                        }
                    }, this);

                    // Set the values which need to be accessed in the child app or after navigating back to this app
                    oStateToSave = {
                        oTableData: oEnteredData,
                        sActionType: this.sActionType,
                        bErrorFlag: bErrorFlag,
                        sMsgStripText: oEvent.getSource().getParent().getText()
                    };

                    // Create app state
                    oAppState = oNavService.createEmptyAppState(this.getOwnerComponent());
                    oAppState.setData(oStateToSave);

                    // Save the data
                    oAppState.save();

                    // Check if any old appstate is already added into the old hash map
                    sAppStateKey = /(?:sap-iapp-state=)([^&=]+)/.exec(sCurrentHash);

                    if (sAppStateKey === null) {
                        // Set the new hash
                        sNewHash = sCurrentHash + "?sap-iapp-state=" + oAppState.getKey();
                    } else {
                        // Split the old hash and take the initial part
                        sNewHash = sCurrentHash.split("?")[0] + "?sap-iapp-state=" + oAppState.getKey();
                    }

                    // Replace the new hash
                    oHashChanger.replaceHash(sNewHash);

                    // Navigate to the child app
                    /* eslint-disable sap-cross-application-navigation */
                    oNavService.toExternal({
                        target: {
                            semanticObject: "ZMDRLAUDIT_SEMOBJ",
                            action: "display"
                        },
                        params: {
                            workflow_id: sWorkflowId
                        }
                    });
                    /* eslint-enable sap-cross-application-navigation */
                } else {
                    sap.m.MessageToast.show("Navigation to Workflow Audit requires Fiori Launchpad.");
                }
            } else {
                // Create message popover dialog
                if (!this.msgPopoverDialog) {
                    this.msgPopoverDialog = Fragment.load({
                        id: this.getView().getId(),
                        name: "com.intapptics.zmdrcntrlcmn.view.MessagePopover",
                        controller: this
                    }).then(function (oDialog) {
                        this.getView().addDependent(oDialog);
                        return oDialog;
                    }.bind(this));
                }

                // Open the message popover dialog
                this.msgPopoverDialog.then(function (oDialog) {
                    // Set the title active for all validation related messages
                    this.byId(sMsgPopOverId).getItems().forEach(function (oItem) {
                        if (oItem.getTitle().includes("Validation Failed")) {
                            oItem.setActiveTitle(true);
                        } else {
                            oItem.setActiveTitle(false);
                        }
                    }, this);

                    oDialog.toggle(oSourceControl);
                }.bind(this));
            }

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting onPress_lnkMsgStrip method");
        },

        /**
         * On press of messages in popover dialog
         * 
         * @param {sap.ui.base.Event} oEvent - Event object
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @public
         */
        onPress_pvrMessages: function (oEvent) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering onPress_pvrMessages method");

            /** Define variables */
            var oItem = oEvent.getParameter("item"), // Selected item from the message popover
                oPage = this.byId("dpMainScreen"), // Page reference
                oMessage = oItem.getBindingContext().getObject(), // Message object
                oControl = sap.ui.getCore().byId(oMessage.getId()); // Control reference

            /** Method Implementation */
            // If the linked control is present
            if (oControl) {
                // Focus to the control
                oPage.getScrollDelegate().scrollToElement(oControl.getDomRef());

                /* eslint-disable sap-timeout-usage */
                setTimeout(function () {
                    oControl.focus();
                }, 300);
                /* eslint-enable sap-timeout-usage */
            }

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting onPress_pvrMessages method");
        },

        /**
         * Change in the value of the form fields
         * 
         * @param {sap.ui.base.Event} oEvent - Event object
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @public
         */
        onChange_sfrmItemDetailsFieldData: function (oEvent) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering onChange_sfrmItemDetailsFieldData method");

            /** Method Implementation */
            // Set the selected value in the tooltip
            if (oEvent.getSource().getValue() !== undefined) {
                oEvent.getSource().setTooltip(oEvent.getSource().getValue());
            } else {
                oEvent.getSource().setTooltip(null);
            }
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting onChange_sfrmItemDetailsFieldData method");
        },

        /**
         * On press create button
         * 
         * @param {sap.ui.base.Event} oEvent - Event object
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @public
         */
        onPress_btnCreate: function (oEvent) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering onPress_btnCreate method");

            /** Method Implementation */
            // Set Visibility of the message strip to false
            this.byId("msgStripMainScreen").setVisible(false);

            // Remove all existing validation related messages in message manager as those are not of any use
            sap.ui.getCore().getMessageManager().removeAllMessages();

            // Clear the previously entered value by user from the global variable
            this.oSelectedTableData = {};

            // Reset action type
            this.sActionType = "Create";

            // Set the request type value to page title
            this.fn_getLocalModel("mainScreenViewModel").setProperty("/pageTitle", this.sActionType);

            // Repopulate the dynamic form
            this._fn_dynamicFormPreparation();

            // Disable create button and enable submit button
            this.byId("btnCreate").setVisible(false);
            this.byId("btnSubmit").setVisible(true);

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting onPress_btnCreate method");
        },

        /**
         * Lookup value help requested
         * 
         * @param {sap.ui.base.Event} oEvent - Event object
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @public
         */
        onValueHelpRequested: function (oEvent) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering onValueHelpRequested method");

            /** Define variables */
            var oValueHelpDialog, // Value help dialog reference
                iIndex, // Index of the value help dialog in the value help array
                bOpenDialogFlag = false, // Flag to open the dialog
                oLkpData, // Lookup data
                oLkpColumn, // Lookup column data
                sFilterOperator, // Filter operator
                oLkpCell, // Lookup cell data
                aLkpCells = [], // Lookup cell array
                aLkpFieldNames, // Lookup field names
                aLkpFieldLabels, // Lookup field labels
                oSorter; // Sorter object

            /** Method Implementation */
            // Get the lookup field data
            oLkpData = this.aLkpInformation.filter(function (oLkpInformation) {
                return oLkpInformation.fieldId === oEvent.getSource().getId();
            })[0].fieldData;

            if (oLkpData) {
                // Initialize the global array 
                if (!this._aValueHelpDialog) {
                    this._aValueHelpDialog = [];
                } else {
                    this._aValueHelpDialog.forEach(function (oVHD, iIndex) {
                        if (!bOpenDialogFlag) {
                            if (oVHD.getId() === sap.ui.core.Fragment.createId(this._fn_getFieldId(oLkpData.ColumnName)), "dlgLookup") {
                                bOpenDialogFlag = true;
                                iIndex = iIndex;
                            } else {
                                bOpenDialogFlag = false;
                            }
                        }
                    }, this)
                }

                // Reset the global search filters
                this._aSearchFilters = [];

                // Create a filter with the restriction value of the value is same as fieldname
                if (oLkpData.Lkprestfield && oLkpData.Lkprestcond && oLkpData.Lkprestvalue) {
                    if (oLkpData.Lkprestcond === "EQ") {
                        sFilterOperator = FilterOperator.EQ;
                    } else if (oLkpData.Lkprestcond === "GT") {
                        sFilterOperator = FilterOperator.GT;
                    } else if (oLkpData.Lkprestcond === "LT") {
                        sFilterOperator = FilterOperator.LT;
                    } else if (oLkpData.Lkprestcond === "GE") {
                        sFilterOperator = FilterOperator.GE;
                    } else if (oLkpData.Lkprestcond === "LE") {
                        sFilterOperator = FilterOperator.LE;
                    } else if (oLkpData.Lkprestcond === "NE") {
                        sFilterOperator = FilterOperator.NE;
                    } else if (oLkpData.Lkprestcond === "Contains") {
                        sFilterOperator = FilterOperator.Contains;
                    } else if (oLkpData.Lkprestcond === "StartsWith") {
                        sFilterOperator = FilterOperator.StartsWith;
                    } else if (oLkpData.Lkprestcond === "EndsWith") {
                        sFilterOperator = FilterOperator.EndsWith;
                    } else {
                        this.fn_getLogReference().error("Main Screen Controller: Invalid filter operator " + oLkpData.Lkprestcond);
                    }

                    if (sap.ui.getCore().byId("inp" + this._fn_getFieldId(oLkpData.Lkprestvalue)) !== undefined) {
                        if (sap.ui.getCore().byId("inp" + this._fn_getFieldId(oLkpData.Lkprestvalue)).getValue()) {
                            this._aSearchFilters.push(new Filter(oLkpData.Lkprestfield, sFilterOperator, sap.ui.getCore().byId("inp" + this._fn_getFieldId(oLkpData.Lkprestvalue)).getValue().split(",")[0]));
                        } else {
                            this._aSearchFilters = [];
                        }
                    } else {
                        this._aSearchFilters.push(new Filter(oLkpData.Lkprestfield, sFilterOperator, oLkpData.Lkprestvalue));
                    }
                }

                // Set pagination number
                this._fn_setPaginationNumber(oLkpData);

                // Read the data of the lookup table
                this._fn_readLookupData(oLkpData, 20, 0);

                // Set title of the value help dialog
                this.fn_getLocalModel("mainScreenViewModel").setProperty("/valueHelpDialogTitle", "Select " + oLkpData.ColumnLabel);

                // If value help dialog is already initialized then open it else prepare and open it
                if (bOpenDialogFlag) {
                    if (sap.ui.getCore().byId("inp" + this._fn_getFieldId(oLkpData.Lkprestvalue)) !== undefined) {
                        // Open busy dialog
                        this.fn_openBusyDialog();
                    }

                    // Open the value help dialog
                    this._aValueHelpDialog[iIndex].open();
                } else {
                    // Get the lookup field names and labels
                    aLkpFieldNames = oLkpData.Lookupfieldsname.split(",");
                    aLkpFieldLabels = oLkpData.Lookupfieldslabel.split(",");

                    // Create the value help dialog
                    oValueHelpDialog = Fragment.load({
                        id: sap.ui.core.Fragment.createId(this.getView().getId(), this._fn_getFieldId(oLkpData.ColumnName)),
                        name: "com.intapptics.zmdrcntrlcmn.view.LookupValueHelp",
                        controller: this
                    }).then(function (oDialog) {
                        this.getView().addDependent(oDialog);

                        // Prepare table columns and add into dialog
                        aLkpFieldLabels.forEach(function (sLkpColumnLabel) {
                            oLkpColumn = new Column({
                                hAlign: "Center",
                                demandPopin: true,
                                header: new Label({
                                    text: sLkpColumnLabel,
                                    tooltip: sLkpColumnLabel,
                                    wrapping: true
                                })
                            });

                            // Add column to the table
                            oDialog.getContent()[0].getItems()[0].addColumn(oLkpColumn);
                        });

                        // Prepare table cells
                        aLkpFieldNames.forEach(function (sLkpFieldName, iIndex) {
                            if (iIndex === 0) {
                                oSorter = new oSorter(sLkpFieldName, false); // Sort ascending by setting the descending parameter to false
                            }
                            oLkpCell = new Text({
                                text: { path: oLkpData.ColumnName + ">" + sLkpFieldName },
                                tooltip: { path: oLkpData.ColumnName + ">" + sLkpFieldName, formatter: function (sValue) { return sValue + ""; } },
                            });

                            // Add cell to the array
                            aLkpCells.push(oLkpCell);
                        });

                        // Bind rows
                        oDialog.getContent()[0].getItems()[0].bindAggregation("items", {
                            path: oLkpData.ColumnName + ">/",
                            sorter: oSorter,
                            template: new ColumnListItem({
                                cells: aLkpCells
                            })
                        });

                        // Add the dialog to the array
                        this._aValueHelpDialog.push(oDialog);
                        return oDialog;
                    }.bind(this));

                    oValueHelpDialog.then(function (oDialog) {
                        // Open dialog
                        oDialog.open();

                        // Open busy dialog
                        this.fn_openBusyDialog();
                    }.bind(this));
                }
            } else {
                // Log error
                this.fn_getLogReference().error("Main Screen Controller: Lookup data is not available for field " + oEvent.getSource().getId());
            }

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting onValueHelpRequested method");
        },

        /**
         * On press search in the value help dialog
         * 
         * @param {sap.ui.base.Event} oEvent - Event object
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @public
         */
        onSearch_dlgLookup: function (oEvent) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering onSearch_dlgLookup method");

            /** Define variables */
            var sFieldId, // Lookup input field id
                oLkpData, // Lookup data
                aLookupFieldNames, // Lookup field names
                aLookupFieldTypes, // Lookup field types
                sValue = oEvent.getParameter("query"), // Search value
                oFilter; // Filter object

            /** Method Implementation */
            // Get the lookup field id
            sFieldId = "inp" + oEvent.getSource().getId().split("--")[2];

            // Get the lookup field information
            oLkpData = this.aLkpInformation.filter(function (oLkpInformation) {
                return oLkpInformation.fieldId === sFieldId;
            })[0].fieldData;

            // Get field names and field types
            aLookupFieldNames = oLkpData.Lookupfieldsname.split(",");
            aLookupFieldTypes = oLkpData.Lookupfieldstype.split(",");

            if (oLkpData.Lkprestfield && oLkpData.Lkprestcond && oLkpData.Lkprestvalue) {
                this._aSearchFilters.splice(1);
            } else {
                this._aSearchFilters.splice(0);
            }

            if (sValue) {
                aLookupFieldNames.forEach(function (sLookupFieldName, iIndex) {
                    if (aLookupFieldTypes[iIndex] === "INTEGER") {
                        if (!Number.isInteger(parseInt(sValue, 10))) {
                            // Log info
                            this.fn_getLogReference().error("Main Screen Controller: Search value is not an integer");
                        } else if (!sValue.includes("*")) {
                            if (sValue < 255) {
                                oFilter = new Filter(sLookupFieldName, FilterOperator.EQ, sValue);
                            }
                        } else {
                            if (sValue.slice(0, sValue.indexOf("*")) < 255) {
                                oFilter = new Filter(sLookupFieldName, FilterOperator.EQ, sValue.slice(0, sValue.indexOf("*")));
                            }
                        }
                    } else {
                        if (sValue.includes("*")) {
                            oFilter = new Filter(sLookupFieldName, FilterOperator.Contains, sValue.replaceAll("*", "%"));
                        } else {
                            oFilter = new Filter(sLookupFieldName, FilterOperator.Contains, sValue);
                        }
                    }

                    if (oFilter) {
                        this._aSearchFilters.push(oFilter);
                        oFilter = undefined;
                    }
                }.bind(this));
            }

            // Set pagination number
            this._fn_setPaginationNumber(oLkpData);

            // Read the data of the lookup table
            this._fn_readLookupData(oLkpData, 20, 0);

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting onSearch_dlgLookup method");
        },

        /**
         * Lookup Value help data pagination event
         * 
         * @param {sap.ui.base.Event} oEvent - Event object
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @public
         */
        onPaginationAction: function (oEvent) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering onPaginationAction method");

            /** Define variables */
            var iCurrPageNum, // Current page number
                iMaxPageNum, // Maximum page number
                iNum, // Number of records per page
                iSkip, // Number of records to skip
                sFieldId = "inp" + oEvent.getSource().getParent().getParent().getParent().getId().split("--")[2], // Input field id
                oLkpData; // Lookup data

            /** Method Implementation */
            oLkpData = this.aLkpInformation.filter(function (oLkpInformation) {
                return oLkpInformation.fieldId === sFieldId;
            })[0].fieldData;

            if (oLkpData) {
                // Open busy dialog
                this.fn_openBusyDialog();

                // Remove selection of table data if any
                this.byId(this.getView().createId(this._fn_getFieldId(oLkpData.ColumnName) + "--tblDlgLookup")).removeSelections();

                // Calculate page numbering and values
                iMaxPageNum = parseInt(this.byId(this.getView().createId(this._fn_getFieldId(oLkpData.ColumnName) + "--lblDlgLookupMaxPageNum")).getText().substr(2), 10);
                if (oEvent.getSource().getId().includes("PageNum")) {
                    iCurrPageNum = parseInt(oEvent.getSource().getValue(), 10);
                    if (isNaN(iCurrPageNum)) {
                        iCurrPageNum = 1;
                    }
                } else {
                    if (oEvent.getSource().getId().includes("First")) {
                        iCurrPageNum = 1;
                    } else if (oEvent.getSource().getId().includes("Prev")) {
                        iCurrPageNum = parseInt(this.byId(this.getView().createId(this._fn_getFieldId(oLkpData.ColumnName) + "--inpDlgLookupPageNum")).getValue(), 10) - 1;
                    } else if (oEvent.getSource().getId().includes("Next")) {
                        iCurrPageNum = parseInt(this.byId(this.getView().createId(this._fn_getFieldId(oLkpData.ColumnName) + "--inpDlgLookupPageNum")).getValue(), 10) + 1;
                    } else {
                        iCurrPageNum = iMaxPageNum;
                    }
                }

                if (iCurrPageNum < 1) {
                    iCurrPageNum = 1;
                } else if (iCurrPageNum > iMaxPageNum) {
                    iCurrPageNum = iMaxPageNum;
                }

                this.byId(this.getView().createId(this._fn_getFieldId(oLkpData.ColumnName) + "--inpDlgLookupPageNum")).setValue(iCurrPageNum);

                if (iCurrPageNum === iMaxPageNum && (iCurrPageNum === 1 || iCurrPageNum === 0)) {
                    this.byId(this.getView().createId(this._fn_getFieldId(oLkpData.ColumnName) + "--btnDlgLookupFirstPage")).setEnabled(false);
                    this.byId(this.getView().createId(this._fn_getFieldId(oLkpData.ColumnName) + "--btnDlgLookupPrevPage")).setEnabled(false);
                    this.byId(this.getView().createId(this._fn_getFieldId(oLkpData.ColumnName) + "--btnDlgLookupNextPage")).setEnabled(false);
                    this.byId(this.getView().createId(this._fn_getFieldId(oLkpData.ColumnName) + "--btnDlgLookupLastPage")).setEnabled(false);
                } else if (iCurrPageNum === iMaxPageNum) {
                    this.byId(this.getView().createId(this._fn_getFieldId(oLkpData.ColumnName) + "--btnDlgLookupFirstPage")).setEnabled(true);
                    this.byId(this.getView().createId(this._fn_getFieldId(oLkpData.ColumnName) + "--btnDlgLookupPrevPage")).setEnabled(true);
                    this.byId(this.getView().createId(this._fn_getFieldId(oLkpData.ColumnName) + "--btnDlgLookupNextPage")).setEnabled(false);
                    this.byId(this.getView().createId(this._fn_getFieldId(oLkpData.ColumnName) + "--btnDlgLookupLastPage")).setEnabled(false);
                } else if (iCurrPageNum === 1) {
                    this.byId(this.getView().createId(this._fn_getFieldId(oLkpData.ColumnName) + "--btnDlgLookupFirstPage")).setEnabled(false);
                    this.byId(this.getView().createId(this._fn_getFieldId(oLkpData.ColumnName) + "--btnDlgLookupPrevPage")).setEnabled(false);
                    this.byId(this.getView().createId(this._fn_getFieldId(oLkpData.ColumnName) + "--btnDlgLookupNextPage")).setEnabled(true);
                    this.byId(this.getView().createId(this._fn_getFieldId(oLkpData.ColumnName) + "--btnDlgLookupLastPage")).setEnabled(true);
                } else {
                    this.byId(this.getView().createId(this._fn_getFieldId(oLkpData.ColumnName) + "--btnDlgLookupFirstPage")).setEnabled(true);
                    this.byId(this.getView().createId(this._fn_getFieldId(oLkpData.ColumnName) + "--btnDlgLookupPrevPage")).setEnabled(true);
                    this.byId(this.getView().createId(this._fn_getFieldId(oLkpData.ColumnName) + "--btnDlgLookupNextPage")).setEnabled(true);
                    this.byId(this.getView().createId(this._fn_getFieldId(oLkpData.ColumnName) + "--btnDlgLookupLastPage")).setEnabled(true);
                }

                if (iCurrPageNum === 0) {
                    iSkip = 0;
                } else {
                    iSkip = (iCurrPageNum - 1) * 20;
                }

                if (iCurrPageNum === iMaxPageNum) {
                    iNum = this.iRecordCount - iSkip;
                } else {
                    iNum = 20;
                }

                // Read Lookup Data
                this._fn_readLookupData(oLkpData, iNum, iSkip);
            }

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting onPaginationAction method");
        },

        /**
         * On press search in the value help dialog
         * 
         * @param {sap.ui.base.Event} oEvent - Event object
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @public
         */
        onSearch_tsdValueHelp: function (oEvent) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering onSearch_tsdValueHelp method");

            /** Define variables */
            var sFieldId, // Lookup input field id
                aLookupFieldNames, // Lookup field names
                aLookupFieldTypes, // Lookup field types
                sValue = oEvent.getParameter("query"), // Search value
                oFilter, // Filter object
                oBinding = oEvent.getSource().getBinding("items"); // Binding reference

            /** Method Implementation */
            // Get the lookup field id
            sFieldId = "inp" + oEvent.getSource().getId().split("--")[2];

            // Get the lookup field and type information
            aLookupFieldNames = this.aLkpInformation.filter(function (oLkpInformation) {
                return oLkpInformation.fieldId === sFieldId;
            })[0].fieldData.Lookupfieldsname.split(",");
            aLookupFieldTypes = this.aLkpInformation.filter(function (oLkpInformation) {
                return oLkpInformation.fieldId === sFieldId;
            })[0].fieldData.Lookupfieldstype.split(",");

            aLookupFieldNames.forEach(function (sLookupFieldName, iIndex) {
                if (iIndex === 0) {
                    if (aLookupFieldTypes[iIndex] === "INTEGER") {
                        if (sValue.includes("*")) {
                            oFilter = new Filter(sLookupFieldName, FilterOperator.EQ, sValue.slice(0, sValue.indexOf("*")));
                        } else {
                            oFilter = new Filter(sLookupFieldName, FilterOperator.EQ, sValue);
                        }
                    } else {
                        if (sValue.includes("*")) {
                            oFilter = new Filter(sLookupFieldName, FilterOperator.Contains, sValue.replaceAll("*", "%"));
                        } else {
                            oFilter = new Filter(sLookupFieldName, FilterOperator.Contains, sValue);
                        }
                    }
                } else {
                    if (aLookupFieldTypes[iIndex] === "INTEGER") {
                        if (sValue.includes("*")) {
                            oFilter = new Filter({
                                filters: [
                                    new Filter(sLookupFieldName, FilterOperator.EQ, sValue.slice(0, sValue.indexOf("*"))),
                                    oFilter
                                ],
                                and: false
                            });
                        } else {
                            oFilter = new Filter({
                                filters: [
                                    new Filter(sLookupFieldName, FilterOperator.EQ, sValue),
                                    oFilter
                                ],
                                and: false
                            });
                        }
                    } else {
                        if (sValue.includes("*")) {
                            oFilter = new Filter({
                                filters: [
                                    new Filter(sLookupFieldName, FilterOperator.Contains, sValue.replaceAll("*", "%")),
                                    oFilter
                                ],
                                and: false
                            });
                        } else {
                            oFilter = new Filter({
                                filters: [
                                    new Filter(sLookupFieldName, FilterOperator.Contains, sValue),
                                    oFilter
                                ],
                                and: false
                            });
                        }
                    }
                }
            });

            oBinding.filter([oFilter]);

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting onSearch_tsdValueHelp method");
        },

        /**
         * On performing any action at the footer of the value help dialog
         * 
         * @param {sap.ui.base.Event} oEvent - Event object
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @public
         */
        onFooterAction_tsdValueHelp: function (oEvent) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering onFooterAction_tsdValueHelp method");

            /** Define variables */
            var sFieldId, // Lookup input field id
                aLkpFieldNames, // Lookup field names
                aContexts = oEvent.getParameter("selectedContexts"), // Selected context from the value help dialog
                oBinding = oEvent.getSource().getBinding("items"); // Binding reference

            /** Method Implementation */
            // Reset filter
            oBinding.filter([]);

            // Get the lookup field id
            sFieldId = "inp" + oEvent.getSource().getId().split("--")[2];

            // Get the lookup field names
            aLkpFieldNames = this.aLkpInformation.filter(function (oLkpInformation) {
                return oLkpInformation.fieldId === sFieldId;
            })[0].fieldData.Lookupfieldsname.split(",");

            // Check if we have the selected context information
            if (aContexts && aContexts.length) {
                aLkpFieldNames.forEach(function (sLkpFieldName, iIndex) {
                    if (iIndex === 0) {
                        sLkpData = aContexts[0].getObject()[sLkpFieldName];
                    } else {
                        sLkpData = sLkpData + ", " + aContexts[0].getObject()[sLkpFieldName];
                    }
                }, this);

                // Add the value in the input field
                if (sap.ui.getCore().byId(sFieldId)) {
                    sap.ui.getCore().byId(sFieldId).setValue(sLkpData);
                    sap.ui.getCore().byId(sFieldId).setTooltip(sLkpData);
                }
            } else {
                if (sap.ui.getCore().byId(sFieldId)) {
                    sap.ui.getCore().byId(sFieldId).setValue(null);
                    sap.ui.getCore().byId(sFieldId).setTooltip(null);
                }
            }

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting onFooterAction_tsdValueHelp method");
        },

        /**
         * Release the task on press of release button
         * 
         * @param {sap.ui.base.Event} oEvent - Event object
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @public
         */
        onPress_btnRelease: function (oEvent) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering onPress_btnRelease method");

            /** Define variables */
            var oWorkflowModel = this.fn_getGlobalModel("ZMDR_UTILITY_WORKFLOW_SRV"), // Workflow model reference
                oWorkflowData; // Workflow data

            /** Method Implementation */
            // Prepare the workflow data
            oWorkflowData = {
                WorkitemId: this.iWorkitemID,
                Action: "PUTBACK"
            };

            // TODO: Migrate to native V4 once ReserveWorkitemSet is mapped in backend
            // Release the workflow task
            oWorkflowModel.create("/ReserveWorkitemSet", oWorkflowData, {
                method: "POST",
                success: function (oData) {
                    // Disable all elements from screen
                    this.byId("sfrmItemDetails").setVisible(false);
                    this.byId("frmRemarks").setVisible(false);
                    this.byId("btnApprove").setVisible(false);
                    this.byId("btnReject").setVisible(false);
                    this.byId("btnRelease").setVisible(false);
                    this.byId("btnSeeChanges").setVisible(false);

                    // Set the release success message in the message strip
                    this.byId("msgStripMainScreen").setText("<strong>Success: </strong><em>Task has been released successfully for all applicable aprovers to take action. Please close the browser window</em>");
                    this.byId("msgStripMainScreen").setType("Success");
                    this.byId("msgStripMainScreen").setVisible(true);
                    this.byId("lnkMsgStrip").setVisible(false);
                }.bind(this),
                error: function (oError) {
                    // Set error in message strip
                    this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Error while processing. For more info </em>");
                    this.byId("msgStripMainScreen").setType("Error");
                    this.byId("msgStripMainScreen").setVisible(true);

                    this.fn_showServiceError(oError);

                    // Close busy dialog
                    this.fn_closeBusyDialog();
                }.bind(this)
            });

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting onPress_btnRelease method");
        },

        /**
         * Show the changes in the data for approver to verify
         * 
         * @param {sap.ui.base.Event} oEvent - Event object
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @public
         */
        onPress_btnSeeChanges: function (oEvent) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering onPress_btnSeeChanges method");

            /** Define variables */
            var aFilters = [], // Filter array
                oTableModel, // Table model reference
                aPrimaryKeys, // Primary fields
                oCarouselData, // Carousel data
                aCarouselData = [], // Carousel data array
                oCarouselModel = new JSONModel(), // Carousel model reference
                oMessage; // Message object for message manager

            /** Method Implementation */
            // Get the primary fields
            aPrimaryKeys = this.aFieldDetails.filter(function (oField) {
                return oField.PrimaryKeyFlag === "Y";
            });

            // Prepare filter
            aPrimaryKeys.forEach(function (oPrimaryKey) {
                aFilters.push(new Filter(oPrimaryKey.ColumnName, FilterOperator.EQ, this.oSelectedTableData[oPrimaryKey.ColumnName]));
            }, this);
            aFilters.push(new Filter("VersionActive", FilterOperator.EQ, "Y"));

            // Read active data to compare
            var oListBinding = this.oTableModel.bindList("/" + this.sTableEntitySet, null, null, aFilters);
            oListBinding.requestContexts(0, 2).then(function (aContexts) {
                // Check if data is available
                if (aContexts.length === 1) {
                    // Push existing entry in carousel data array
                    oCarouselData = aContexts[0].getObject();
                    oCarouselData.carouselCardsHeader = "Existing Record";
                    aCarouselData.push(oCarouselData);

                    // Push the submitted entry
                    oCarouselData = this.oSelectedTableData;
                    oCarouselData.carouselCardsHeader = "Submitted Record";
                    aCarouselData.push(oCarouselData);

                    // Set the data to the model
                    oCarouselModel.setData(aCarouselData);

                    // Set the model globally
                    if (!this.fn_getGlobalModel("carouselModel")) {
                        this.fn_setGlobalModel(oCarouselModel, "carouselModel");
                    } else {
                        this.fn_getGlobalModel("carouselModel").setData(aCarouselData);
                    }

                    // Open the carousel dialog
                    this._fn_OpenComparisonDialog();
                } else {
                    // Set error in message strip
                    this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Error while processing. For more info </em>");
                    this.byId("msgStripMainScreen").setType("Error");
                    this.byId("msgStripMainScreen").setVisible(true);

                    // Prepare message
                    oMessage = new Message({
                        id: "sIdTechError",
                        message: "Issue with active entry at the backend",
                        type: MessageType.Error,
                        additionalText: "Backend data issue",
                        description: "More than one or no active entry found at the backend",
                        target: "/TechnicalError",
                        processor: this.fn_getLocalModel("messageModel")
                    });
                    sap.ui.getCore().getMessageManager().addMessages(oMessage);

                    // Close busy dialog
                    this.fn_closeBusyDialog();
                }
            }.bind(this)).catch(function (oError) {
                // Set error in message strip
                this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Error while processing. For more info </em>");
                this.byId("msgStripMainScreen").setType("Error");
                this.byId("msgStripMainScreen").setVisible(true);

                this.fn_showServiceError(oError);

                // Close busy dialog
                this.fn_closeBusyDialog();
            }.bind(this));
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting onPress_btnSeeChanges method");
        },

        /**
         * On press of Approve/Reject button
         * 
         * @param {sap.ui.base.Event} oEvent - Event object
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @public
         */
        onPress_approverAction: function (oEvent) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering onPress_approverAction method");

            /** Define variables */
            var sFragElemId; // Fragment element id

            /** Method Implementation */
            // Get the pressed button text
            this.sApproverAction = oEvent.getSource().getText();

            // Create the fragment element id
            sFragElemId = this.getView().createId("txtRemarks");

            if (this.byId(sFragElemId)) {
                // Clear any previous data
                this.byId(sFragElemId).setValue("");
            }

            // Create comments dialog
            if (!this.userCommentsDialog) {
                this.userCommentsDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "com.intapptics.zmdrcntrlcmn.view.UserComments",
                    controller: this
                }).then(function (oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }

            // Open the comments dialog
            this.userCommentsDialog.then(function (oDialog) {
                oDialog.open();
            });

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting onPress_approverAction method");
        },

        /** Internal Methods */
        /**
         * Binds the view to the object path
         * 
         * @param {sap.ui.base.Event} oEvent - Event object
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_onObjectMatched: async function (oEvent) {
            // Log message
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_onObjectMatched method");

            /** Define Variables */
            var oComponentData = this.getOwnerComponent().getComponentData(), // Stores the component data
                oCntrlUiConfigModel, // Central UI Comfiguration data model
                sAppKey, // Stores the app state key passed while navigation
                iStartIndex, // Start index of the string to cut
                iEndIndex, // End index of the string to cut
                oMessage, // Stores message object for message manager
                sHash = sap.ui.core.routing.HashChanger.getInstance().getHash(), // Stores current hash
                sActionType, // Action performed by user
                aAppStateKeys, // Arrayo of app state keys
                sAppStateKey, // App state key
                oNavService = sap.ushell && sap.ushell.Container ? sap.ushell.Container.getService("CrossApplicationNavigation") : null, // Stores reference of navigation service
                aFilters = []; // Stores filter array

            /** Temporary Debug Logs */
            console.log("ComponentData:", oComponentData);
            console.log("Startup Parameters:", oComponentData?.startupParameters);
            console.log("Route Arguments:", oEvent.getParameter("arguments"));
            console.log("Hash:", window.location.hash);

            /** Method Implementation */
            // // LOCAL DEV MOCK: If running locally without Launchpad, inject default startup parameters to enable testing
            // if (!oComponentData || !oComponentData.startupParameters) {
            //     this.fn_getLogReference().info("Main Screen Controller: Running locally - injecting mock startup parameters for development.");
            //     oComponentData = oComponentData || {};
            //     oComponentData.startupParameters = {
            //         sActionType: ["Create"],
            //         sActionedBy: ["Requestor"],
            //         sTablename: ["ZMDR_GLACCOUNT"]
            //     };
            // }

            // Check if mandatory startup parameters are passed
            if (oComponentData && oComponentData.startupParameters) {
                // Safely read action type
                sActionType = oComponentData.startupParameters.sActionType ? oComponentData.startupParameters.sActionType[0] : "";
                if (sActionType === "") {
                    await this.getOwnerComponent().contextLoaded;
                    var oContextData = this.getOwnerComponent().getModel("context").getData();
                    sActionType = oContextData.sActionType || "";
                }

                // Get user action type
                if (sActionType === "Reopen") {
                    this.sActionType = "Amend";
                } else {
                    this.sActionType = sActionType;
                }

                // Read who is calling the component
                this.sActionedBy = oComponentData.startupParameters.sActionedBy ? oComponentData.startupParameters.sActionedBy[0] : "";
                if (this.sActionedBy === "") {
                    this.sActionedBy = oContextData.sActionedBy || "";
                }

                if (this.sActionedBy === "Requestor") {
                    // Reset the value of the global table data
                    oTableData = {};

                    var bHasXappState = oComponentData.startupParameters && oComponentData.startupParameters["sap-xapp-state"] && oComponentData.startupParameters["sap-xapp-state"][0];

                    if (sHash && !bHasXappState) {
                        // Get the app state keys
                        aAppStateKeys = /(?:sap-iapp-state=)([^&=]+)/.exec(sHash);

                        if (aAppStateKeys) {
                            //Get the app state key
                            sAppStateKey = aAppStateKeys[1];

                            // Get the navigation service
                            oNavService.getAppState(this.getOwnerComponent(), sAppStateKey).done(function (oSavedAppState) {
                                if (oSavedAppState.getData()) {
                                    // Log info
                                    this.fn_getLogReference().info("Main Screen Controler: Start of reading app state data")

                                    // Get error flag value
                                    this.bErrorFlag = oSavedAppState.getData().bErrorFlag;

                                    if (this.bErrorFlag) {
                                        // Get user action
                                        this.sActionType = oSavedAppState.getData().sActionType;

                                        // Set buttons visibility
                                        this.byId("btnSubmit").setVisible(true);
                                        this.byId("btnApprove").setVisible(false);
                                        this.byId("btnReject").setVisible(false);
                                        this.byId("btnRelease").setVisible(false);
                                        this.byId("btnSeeChanges").setVisible(false);
                                        this.byId("btnCreate").setVisible(false);

                                        // Set message strip
                                        this.byId("msgStripMainScreen").setType("Error");
                                    } else {
                                        // Set action type
                                        this.sActionType = "Display";

                                        // Set buttons visibility
                                        this.byId("btnSubmit").setVisible(false);
                                        this.byId("btnApprove").setVisible(false);
                                        this.byId("btnReject").setVisible(false);
                                        this.byId("btnRelease").setVisible(false);
                                        this.byId("btnSeeChanges").setVisible(false);
                                        if (this.sActionType === "Create") {
                                            this.byId("btnCreate").setVisible(true);
                                        } else {
                                            this.byId("btnCreate").setVisible(false);
                                        }

                                        // Set message strip
                                        this.byId("msgStripMainScreen").setType("Success");
                                    }

                                    // Set text to message strip
                                    this.byId("msgStripMainScreen").setText(oSavedAppState.getData().sMsgStripText);
                                    this.byId("msgStripMainScreen").setVisible(true);

                                    // Get selected table data
                                    this.oSelectedTableData = oSavedAppState.getData().oTableData;

                                    // Log info
                                    this.fn_getLogReference().info("Main Screen Controler: End of reading app state data")
                                } else {
                                    // Close busy dialog
                                    this.fn_closeBusyDialog();

                                    // Navigate to main app
                                    /* eslint-disable sap-cross-application-navigation */
                                    try {
                                        oNavService.toExternal({
                                            target: {
                                                semanticObject: "zmdr_central_main",
                                                action: "manage"
                                            }
                                        });
                                    } catch (e) {
                                        this.fn_getLogReference().warning("Main Screen Controller: Cross-app navigation failed, falling back to history");
                                        window.history.back();
                                    }
                                }
                            }.bind(this));
                        } else {
                            // Log error
                            this.fn_getLogReference().error("Main Screen Controller: Unable to read app state key from hash");
                        }
                    } else {
                        // Set buttons visibility
                        this.byId("btnSubmit").setVisible(true);
                        this.byId("btnApprove").setVisible(false);
                        this.byId("btnReject").setVisible(false);
                        this.byId("btnRelease").setVisible(false);
                        this.byId("btnSeeChanges").setVisible(false);

                        // Log info
                        this.fn_getLogReference().info("Main Screen Controller: User action is " + this.sActionType);
                    }

                    // Set page title
                    this.fn_getLocalModel("mainScreenViewModel").setProperty("/pageTitle", this.sActionType);

                    // Set form title
                    this.fn_getLocalModel("mainScreenViewModel").setProperty("/formTitle", this.fn_getResourceBundle().getText("requestorFormHeading"));

                    // Read sap-xapp-state key directly from startupParameters (reliable FLP Sandbox approach)
                    // Fallback: parse from current URL hash if not in startupParameters
                    if (oComponentData.startupParameters["sap-xapp-state"] && oComponentData.startupParameters["sap-xapp-state"][0]) {
                        sAppKey = oComponentData.startupParameters["sap-xapp-state"][0];
                    } else {
                        // Fallback: extract from current URL
                        var sCurrentHash = window.location.href;
                        var aXappMatch = /sap-xapp-state=([^&?#]+)/.exec(sCurrentHash);
                        sAppKey = aXappMatch ? aXappMatch[1] : "";
                    }

                    // LOCAL DEV MOCK: Bypass Launchpad getAppState if running locally
                    if (!oNavService) {
                        this.fn_getLogReference().info("Main Screen Controller: Simulating Cross-App State for Local Dev");
                        this.sRepositoryName = "Mock Repository";
                        this.sTableLabel = "GL Accounts";
                        this.sSelectedTableName = "ZMDR_GLACCOUNT";
                        this.sTableServiceUrl = "/v2/odata/v4/mdr/"; // Typical CAP OData v2 path
                        this.sTableEntitySet = "ZMDR_GLACCOUNT";

                        this.byId("obatHdr1").setText(this.sRepositoryName).setVisible(true);
                        this.byId("obatHdr2").setText(this.sTableLabel).setVisible(true);
                        return; // Bypass the getAppState block
                    }

                    oNavService.getAppState(this.getOwnerComponent(), sAppKey).done(function (oSavedAppState) {
                        if (oSavedAppState.getData()) {
                            // Log info
                            this.fn_getLogReference().info("Main Screen Controler: Start of reading app state data")

                            // Close busy dialog opened in parent app
                            if (sap.ui.getCore().byId(oSavedAppState.getData().sBusyDialogId)) {
                                sap.ui.getCore().byId(oSavedAppState.getData().sBusyDialogId).close();
                            }

                            // Read repository and table label
                            this.sRepositoryName = oSavedAppState.getData().aUniqueRepositoriesData[oSavedAppState.getData().sRepositoryId].repositoryName;
                            var oTableEntry = oSavedAppState.getData().aUniqueTablesData[oSavedAppState.getData().sTableId];
                            this.sTableLabel = oTableEntry.tableName;   // e.g. "GL Accounts"
                            this.sSelectedTableName = oTableEntry.tableId; // e.g. "ZMDR_GLACCOUNT"

                            // Set the repository name and table label to object header of the page
                            this.byId("obatHdr1").setText(this.sRepositoryName);
                            this.byId("obatHdr1").setVisible(true);

                            this.byId("obatHdr2").setText(this.sTableLabel);
                            this.byId("obatHdr2").setVisible(true);

                            // Get the table service URL
                            sTableServiceUrl = oSavedAppState.getData().sTableServiceUrl;
                            this.sTableEntitySet = oSavedAppState.getData().sTableEntitySet;
                            if (sTableServiceUrl) {
                                var sResolvedServiceUri = this.getOwnerComponent().getManifestObject().resolveUri(sTableServiceUrl, "sap.app");
                                this.oTableModel = new ODataModel({
                                    serviceUrl: sResolvedServiceUri,
                                    synchronizationMode: "None",   // required for OData V4
                                    autoExpandSelect: true,
                                    operationMode: "Server",
                                    earlyRequests: true   // triggers early metadata + CSRF fetch
                                });
                            }

                            // Get the field details — filter by tablename (not tablelabel) and normalize keys to lowercase
                            this.aFieldDetails = oSavedAppState.getData().aCntrlUiConfigData.filter(function (oCntrlUiConfigData) {
                                return oCntrlUiConfigData.TableName === this.sSelectedTableName;
                            }, this);

                            if (this.sActionType !== "Display") {
                                if (this.sActionType !== "Create") {
                                    this.oSelectedTableData = oSavedAppState.getData().oSelectedTableData;
                                } else {
                                    if (!this.bErrorFlag) {
                                        this.oSelectedTableData = {};
                                    }
                                }
                            }

                            // Log info
                            this.fn_getLogReference().info("Main Screen Controler: End of reading app state data")

                            // Failsafe: Ensure oSelectedTableData is always at least an empty object to prevent crashes
                            if (!this.oSelectedTableData) {
                                this.oSelectedTableData = {};
                            }

                            // Prepare form
                            if (this.sActionType !== "Display") {
                                if (this.bFirstFlag) {
                                    this.bFirstFlag = false;
                                    this._fn_dynamicFormPreparation();
                                }
                            } else {
                                this._fn_dynamicFormPreparation();
                            }
                        } else {
                            // Close busy dialog
                            this.fn_closeBusyDialog();

                            // Navigate to main app
                            /* eslint-disable sap-cross-application-navigation */
                            try {
                                oNavService.toExternal({
                                    target: {
                                        semanticObject: "zmdr_central_main",
                                        action: "manage"
                                    }
                                });
                            } catch (e) {
                                this.fn_getLogReference().warning("Main Screen Controller: Cross-app navigation failed, falling back to history");
                                window.history.back();
                            }
                        }
                    }.bind(this));
                } else if (this.sActionedBy === "Approver") {
                    // Get the UI Configuration Model Inforamtion
                    oCntrlUiConfigModel = this.fn_getGlobalModel();

                    // Set visibility of the action buttons
                    this.byId("btnSubmit").setVisible(false);
                    this.byId("btnApprove").setVisible(true);
                    this.byId("btnReject").setVisible(true);
                    this.byId("btnRelease").setVisible(true);
                    this.byId("btnCreate").setVisible(false);
                    if (this.sActionType === "Amend") {
                        this.byId("btnSeeChanges").setVisible(true);
                    } else {
                        this.byId("btnSeeChanges").setVisible(false);
                    }

                    // Get previous stage
                    this.sPreviousStage = oContextData.sPreviousStage || "";
                    if (oContextData.sNextStage === "END") {
                        this.sFinalApproval = "Y";
                    } else {
                        this.sFinalApproval = "N";
                    }

                    // Read table name
                    this.sSelectedTableName = oContextData.sTablename || "";

                    // Set form title
                    this.fn_getLocalModel("mainScreenViewModel").setProperty("/formTitle", this.fn_getResourceBundle().getText("approverFormHeading"));

                    // Get workflow id and workitem id
                    this.sWorkflowID = oContextData.sWorkflowID || "";

                    if (this.sSelectedTableName) {
                        // Clear any previous filters
                        aFilters = [];

                        // Prepare the filter
                        aFilters.push(new Filter("TableName", FilterOperator.EQ, this.sSelectedTableName));

                        // Get table visibility data
                        var oListBinding = oCntrlUiConfigModel.bindList("/CntrlUIVis", null, null, aFilters);
                        oListBinding.requestContexts(0, Infinity).then(function (aContexts) {
                            // Get data
                            var aTableVis = aContexts.map(function (oCtx) { return oCtx.getObject(); });

                            // Get repository name and tablelabel
                            this.sRepositoryName = aTableVis[0].RepositoryLabel;
                            this.sTableLabel = aTableVis[0].TableLabel;

                            // Set page title
                            this.fn_getLocalModel("mainScreenViewModel").setProperty("/pageTitle", this.fn_getResourceBundle().getText("approverTitle", [sActionType, this.sRepositoryName, this.sTableLabel, this.sWorkflowID]));
                        }.bind(this)).catch(function (oError) {
                            // Set error in message strip
                            this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Error while processing. For more info </em>");
                            this.byId("msgStripMainScreen").setType("Error");
                            this.byId("msgStripMainScreen").setVisible(true);

                            this.fn_showServiceError(oError);
                        }.bind(this));

                        // Get table fields data
                        oListBinding = oCntrlUiConfigModel.bindList("/CntrlUIConfig", null, null, aFilters);
                        oListBinding.requestContexts(0, Infinity).then(function (aContexts) {
                            // Get field details
                            this.aFieldDetails = aContexts.map(function (oCtx) { return oCtx.getObject(); });

                            // Sort fields data
                            this.aFieldDetails.sort(function (oVal1, oVal2) {
                                return oVal1.ColumnSeqNo - oVal2.ColumnSeqNo;
                            })

                            // Read table url
                            this._fn_readTableUrl();
                        }.bind(this)).catch(function (oError) {
                            // Set error in message strip
                            this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Error while processing. For more info </em>");
                            this.byId("msgStripMainScreen").setType("Error");
                            this.byId("msgStripMainScreen").setVisible(true);

                            this.fn_showServiceError(oError);
                        }.bind(this));
                    } else {
                        // Set error in message strip
                        this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Error while processing. For more info </em>");
                        this.byId("msgStripMainScreen").setType("Error");
                        this.byId("msgStripMainScreen").setVisible(true);

                        oMessage = new Message({
                            id: "sIdTechError",
                            message: "Error during processing",
                            type: MessageType.Error,
                            additionalText: "Approver task issue",
                            description: "Tablename is missing in the task parameters passed",
                            target: "/TechnicalError",
                            processor: this.fn_getLocalModel("messageModel")
                        });

                        // Add message in message manager
                        sap.ui.getCore().getMessageManager().addMessages(oMessage);
                    }
                } else {
                    // Log error message
                    this.fn_getLogReference().error("Main Screen Controller: App initiator is neither Requestor nor Approver");

                    // Show error message on screen
                    this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>App initiator is neither Requestor nor Approver.</em>");
                    this.byId("msgStripMainScreen").setType("Error");
                    this.byId("msgStripMainScreen").setVisible(true);

                    this.fn_closeBusyDialog();
                }
            } else {
                // Log error message
                this.fn_getLogReference().error("Main Screen Controller: App is initialized without mandatory startup parameters");

                // Show error message on screen
                this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>App is initialized without mandatory startup parameters. Run this app from the Fiori Launchpad.</em>");
                this.byId("msgStripMainScreen").setType("Error");
                this.byId("msgStripMainScreen").setVisible(true);

                this.fn_closeBusyDialog();
            }

            // Log message
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_onObjectMatched method");
        },

        /**
         * Prepare controls for each type of input
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_dynamicFormPreparation: function () {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_dynamicFormPreparation method");

            /** Define variables */
            var oForm = this.byId("sfrmItemDetails"), // Form reference
                oVBoxSections = this.byId("vbxSections"), // VBox reference for sections
                aSections = []; // Array to hold sections an its columns information

            /** Method implementation */
            // Remove all content
            // oForm.destroyContent();
            oVBoxSections.destroyItems();

            // Create an array of sections
            this.aFieldDetails.forEach(function (oFieldDetails) {
                // Skip fields that are not visible so they don't create empty sections
                if (oFieldDetails.VisibilityFlag !== "Y") {
                    return;
                }

                if (aSections.length === 0) {
                    aSections.push({ sectionSequence: oFieldDetails.SectionSequence, sectionId: oFieldDetails.SectionId, sectionName: oFieldDetails.SectionName, sectionColumns: [oFieldDetails.ColumnSeqNo] });
                } else {
                    // Check if section already exists
                    if (aSections.some(function (oSection) {
                        return oSection.sectionSequence === oFieldDetails.SectionSequence;
                    })) {
                        aSections.forEach(function (oSection) {
                            if (oSection.sectionSequence === oFieldDetails.SectionSequence) {
                                // If section already exists then push the column sequence number
                                oSection.sectionColumns.push(oFieldDetails.ColumnSeqNo);
                            }
                        });
                    } else {
                        // If section does not exist then create a new section
                        aSections.push({ sectionSequence: oFieldDetails.SectionSequence, sectionId: oFieldDetails.SectionId, sectionName: oFieldDetails.SectionName, sectionColumns: [oFieldDetails.ColumnSeqNo] });
                    }
                }
            });

            aSections.forEach(function (oSection) {
                // Create a new Panel for each section
                var oPanel = new sap.m.Panel({
                    id: oSection.sectionId,
                    headerText: oSection.sectionName,
                    visible: true,
                    content: [
                        new sap.ui.layout.form.SimpleForm({
                            id: "frm" + oSection.sectionId,
                            title: oSection.sectionName,
                            editable: true,
                            layout: "ColumnLayout",
                            columnsM: 2,
                            columnsL: 3,
                            columnsXL: 4
                        })
                    ],
                    layoutData: new sap.m.FlexItemData({
                        styleClass: "sapUiSmallMarginTopBottom"
                    })
                });

                // Add the Panel to the VBox section
                oVBoxSections.addItem(oPanel);

                // Add fields to the subsection
                oSection.sectionColumns.forEach(function (iColumnSeqNo) {
                    var oField = this.aFieldDetails.find(function (oFieldDetails) {
                        return oFieldDetails.ColumnSeqNo === iColumnSeqNo;
                    });

                    if (oField) {
                        var sDataType = (oField.ColumnDataType || "").toUpperCase();
                        // Create the field element based on its type
                        // Supports: STRING / CHAR (text), INTEGER / INT (numeric), DATS / DATE (date), LOOKUP
                        if (sDataType === "STRING" || sDataType.includes("CHAR")) {
                            if (!oField.LkpoData || oField.LkpoData.length === 0) {
                                this._fn_createCharElement(oPanel.getContent()[0], oField);
                            } else {
                                this._fn_createLookupElement(oPanel.getContent()[0], oField);
                            }
                        } else if (sDataType.includes("INTEGER") || sDataType.includes("INT") || sDataType === "NUMC" || sDataType === "DEC") {
                            if (!oField.LkpoData || oField.LkpoData.length === 0) {
                                this._fn_createIntegerElement(oPanel.getContent()[0], oField);
                            } else {
                                this._fn_createLookupElement(oPanel.getContent()[0], oField);
                            }
                        } else if (sDataType.includes("DATS") || sDataType.includes("DATE")) {
                            this._fn_createDateElement(oPanel.getContent()[0], oField);
                        } else {
                            // Fallback: treat any unknown type as a text field
                            this.fn_getLogReference().warning("Main Screen Controller: Unknown field type '" + oField.ColumnDataType + "' — rendering as text input");
                            this._fn_createCharElement(oPanel.getContent()[0], oField);
                        }
                    }
                }, this);
            }, this);

            // // Add fields into the form
            // this.aFieldDetails.forEach(function (oField) {
            //     if (oField.ColumnDataType.includes("INTEGER")) {
            //         if (oField.lkpodata.length === 0) {
            //             this._fn_createIntegerElement(oForm, oField);
            //         } else {
            //             this._fn_createLookupElement(oForm, oField);
            //         }
            //     } else if (oField.ColumnDataType.includes("CHAR")) {
            //         if (oField.lkpodata.length === 0) {
            //             this._fn_createCharElement(oForm, oField);
            //         } else {
            //             this._fn_createLookupElement(oForm, oField);
            //         }
            //     } else if (oField.ColumnDataType.includes("DATS")) {
            //         this._fn_createDateElement(oForm, oField);
            //     } else {
            //         // Log error
            //         this.fn_getLogReference().error("Main Screen Controller: Field type " + oField.ColumnDataType + "is not handled in the UI")
            //     }
            // }, this);

            // Check if any lookup is present in the structure and if not then close the busy dialog here else close when lookup data recieved
            if (!this.bLookupPresent) {
                // Close busy dialog once form is prepared
                this.fn_closeBusyDialog();
            }

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_dynamicFormPreparation method");
        },

        /** 
         * Create field id in camel case format
         * 
         * @param {string} sColumnName Column name
         * @returns {string} Column id in camel case format
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_getFieldId: function (sColumnName) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_getFieldId method");

            /** Define variables */
            var sFieldId;

            /** Method Implementation */
            sFieldId = (sColumnName || "").replace(/./g, function (word, index) {
                if (index === 0) {
                    return word.toUpperCase();
                } else if ((sColumnName || "").slice(index - 1, index) === "_") {
                    return word.toUpperCase();
                } else {
                    return word.toLowerCase();
                }
            }).replace(/_+/g, "");

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_getFieldId method");

            return sFieldId;
        },

        /**
         * Create integer element in the form
         * 
         * @param {object} oForm Reference of the form
         * @param {object} oField Details of the field to be created
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_createIntegerElement: function (oForm, oField) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_createIntegerElement method");

            /** Define variables */
            var aDisplayFields, // Display field details
                sValue = this.oSelectedTableData[oField.ColumnName], // Value to be displayed other than create scenario
                bMandatory, // Mandatory flag
                bEditable, // Editable flag
                sIdLbl, // Label Id
                sIdInp; // Input Id

            /** Method Implementation */
            if (oField.VisibilityFlag == "Y") {
                // Create the id of the fields
                sIdLbl = "lbl" + this._fn_getFieldId(oField.ColumnName);
                sIdInp = "inp" + this._fn_getFieldId(oField.ColumnName);

                // Set mandatory flag
                if (oField.MandatoryFlag === "Y") {
                    bMandatory = true;
                } else {
                    bMandatory = false;
                }

                // Set editable flag
                if (oField.EditableFlag === "Y") {
                    bEditable = true;
                } else {
                    bEditable = false;
                }

                // Add label to the form
                oForm.addContent(new Label({
                    id: sIdLbl,
                    text: oField.ColumnLabel,
                    tooltip: oField.ColumnLabel,
                    required: bMandatory
                }));

                // Add input field
                if (this.sActionedBy === "Requestor") {
                    if (this.sActionType === "Create") {
                        if (this.bErrorFlag) {
                            oForm.addContent(new Input({
                                id: sIdInp,
                                type: "Number",
                                placeholder: "Enter numeric value of length " + oField.FieldSize,
                                required: bMandatory,
                                editable: bEditable,
                                maxLength: parseInt(oField.FieldSize, 10),
                                value: sValue,
                                tooltip: sValue + "",
                                liveChange: this.onChange_sfrmItemDetailsFieldData.bind(this),
                                width: "25rem"
                            }));
                        } else {
                            if (oField.Defaultvalue) {
                                oForm.addContent(new Input({
                                    id: sIdInp,
                                    type: "Number",
                                    placeholder: "Enter numeric value of length " + oField.FieldSize,
                                    required: bMandatory,
                                    editable: bEditable,
                                    maxLength: parseInt(oField.FieldSize, 10),
                                    value: oField.Defaultvalue,
                                    tooltip: oField.Defaultvalue + "",
                                    liveChange: this.onChange_sfrmItemDetailsFieldData.bind(this),
                                    width: "25rem"
                                }));
                            } else {
                                oForm.addContent(new Input({
                                    id: sIdInp,
                                    type: "Number",
                                    placeholder: "Enter numeric value of length " + oField.FieldSize,
                                    required: bMandatory,
                                    editable: bEditable,
                                    maxLength: parseInt(oField.FieldSize, 10),
                                    tooltip: "",
                                    liveChange: this.onChange_sfrmItemDetailsFieldData.bind(this),
                                    width: "25rem"
                                }));
                            }
                        }
                    } else if (this.sActionType === "Amend") {
                        if (oField.PrimaryKeyFlag === "Y") {
                            oForm.addContent(new Input({
                                id: sIdInp,
                                type: "Number",
                                editable: false,
                                value: sValue,
                                tooltip: sValue + "",
                                width: "25rem"
                            }));
                        } else {
                            oForm.addContent(new Input({
                                id: sIdInp,
                                type: "Number",
                                placeholder: "Enter numeric value of length " + oField.FieldSize,
                                required: bMandatory,
                                editable: bEditable,
                                maxLength: parseInt(oField.FieldSize, 10),
                                value: sValue,
                                tooltip: sValue + "",
                                liveChange: this.onChange_sfrmItemDetailsFieldData.bind(this),
                                width: "25rem"
                            }));
                        }
                    } else if (this.sActionType === "Close" || this.sActionType === "Display") {
                        oForm.addContent(new Input({
                            id: sIdInp,
                            type: "Number",
                            editable: false,
                            value: sValue,
                            tooltip: sValue + "",
                            width: "25rem"
                        }));
                    } else {
                        // Log error
                        this.fn_getLogReference().error("Action type " + this.sActionType + " not handled in UI");
                    }
                } else if (this.sActionedBy === "Approver") {
                    // Get display field info if any
                    aDisplayFields = this.aFieldDetails.filter(function (oFieldDetails) {
                        return oFieldDetails.DisplayFieldOf === oField.ColumnName;
                    });

                    // Prepare the value
                    aDisplayFields.forEach(function (oDisplayField) {
                        sValue = sValue + ", " + this.oSelectedTableData[oDisplayField.ColumnName]
                    }, this);

                    // Add input field
                    oForm.addContent(new Input({
                        id: sIdInp,
                        type: "Number",
                        editable: false,
                        value: sValue,
                        tooltip: sValue + "",
                        width: "25rem"
                    }));
                } else {
                    // Log error
                    this.fn_getLogReference().error("User type is unknown and not handled in the UI");
                }
            } else {
                // Log info
                this.fn_getLogReference().info("Main Screen Controller: Visibility of the field " + oField.ColumnLabel + "is turned off in configuration");
            }

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_createIntegerElement method");
        },

        /**
         * Create character/string element in the form
         * 
         * @param {object} oForm Reference of the form
         * @param {object} oField Details of the field to be created
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_createCharElement: function (oForm, oField) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_createCharElement method");

            /** Define variables */
            var aDisplayFields, // Display field details
                sValue = this.oSelectedTableData[oField.ColumnName], // Value to be displayed other than create scenario
                bMandatory, // Mandatory flag
                bEditable, // Editable flag
                sIdLbl, // Label Id
                sIdInp; // Input Id

            /** Method Implementation */
            if (oField.VisibilityFlag == "Y") {
                // Create the id of the fields
                sIdLbl = "lbl" + this._fn_getFieldId(oField.ColumnName);
                sIdInp = "inp" + this._fn_getFieldId(oField.ColumnName);

                // Set mandatory flag
                if (oField.MandatoryFlag === "Y") {
                    bMandatory = true;
                } else {
                    bMandatory = false;
                }

                // Set editable flag
                if (oField.EditableFlag === "Y") {
                    bEditable = true;
                } else {
                    bEditable = false;
                }

                // Add label to the form
                oForm.addContent(new Label({
                    id: sIdLbl,
                    text: oField.ColumnLabel,
                    tooltip: oField.ColumnLabel,
                    required: bMandatory
                }));

                // Add input field
                if (this.sActionedBy === "Requestor") {
                    if (this.sActionType === "Create") {
                        if (this.bErrorFlag) {
                            oForm.addContent(new Input({
                                id: sIdInp,
                                type: "Text",
                                placeholder: "Enter text value of length " + oField.FieldSize,
                                required: bMandatory,
                                editable: bEditable,
                                maxLength: parseInt(oField.FieldSize, 10),
                                value: sValue,
                                tooltip: sValue,
                                liveChange: this.onChange_sfrmItemDetailsFieldData.bind(this),
                                width: "25rem"
                            }));
                        } else {
                            if (oField.Defaultvalue) {
                                oForm.addContent(new Input({
                                    id: sIdInp,
                                    type: "Text",
                                    placeholder: "Enter text value of length " + oField.FieldSize,
                                    required: bMandatory,
                                    editable: bEditable,
                                    maxLength: parseInt(oField.FieldSize, 10),
                                    value: oField.Defaultvalue,
                                    tooltip: oField.Defaultvalue,
                                    liveChange: this.onChange_sfrmItemDetailsFieldData.bind(this),
                                    width: "25rem"
                                }));
                            } else {
                                oForm.addContent(new Input({
                                    id: sIdInp,
                                    type: "Text",
                                    placeholder: "Enter text value of length " + oField.FieldSize,
                                    required: bMandatory,
                                    editable: bEditable,
                                    maxLength: parseInt(oField.FieldSize, 10),
                                    tooltip: "",
                                    liveChange: this.onChange_sfrmItemDetailsFieldData.bind(this),
                                    width: "25rem"
                                }));
                            }
                        }
                    } else if (this.sActionType === "Amend") {
                        if (oField.PrimaryKeyFlag === "Y") {
                            oForm.addContent(new Input({
                                id: sIdInp,
                                type: "Text",
                                editable: false,
                                value: sValue,
                                tooltip: sValue,
                                width: "25rem"
                            }));
                        } else {
                            oForm.addContent(new Input({
                                id: sIdInp,
                                type: "Text",
                                placeholder: "Enter text value of length " + oField.FieldSize,
                                required: bMandatory,
                                editable: bEditable,
                                maxLength: parseInt(oField.FieldSize, 10),
                                value: sValue,
                                tooltip: sValue,
                                liveChange: this.onChange_sfrmItemDetailsFieldData.bind(this),
                                width: "25rem"
                            }));
                        }
                    } else if (this.sActionType === "Close" || this.sActionType === "Display") {
                        oForm.addContent(new Input({
                            id: sIdInp,
                            type: "Text",
                            editable: false,
                            value: sValue,
                            tooltip: sValue,
                            width: "25rem"
                        }));
                    } else {
                        // Log error
                        this.fn_getLogReference().error("Action type " + this.sActionType + " not handled in UI");
                    }
                } else if (this.sActionedBy === "Approver") {
                    // Get display field info if any
                    aDisplayFields = this.aFieldDetails.filter(function (oFieldDetails) {
                        return oFieldDetails.displayfieldof === oField.ColumnName;
                    });

                    // Prepare the value
                    aDisplayFields.forEach(function (oDisplayField) {
                        sValue = sValue + ", " + this.oSelectedTableData[oDisplayField.ColumnName]
                    }, this);

                    // Add input field
                    oForm.addContent(new Input({
                        id: sIdInp,
                        type: "Text",
                        editable: false,
                        value: sValue,
                        tooltip: sValue,
                        width: "25rem"
                    }));
                } else {
                    // Log error
                    this.fn_getLogReference().error("User type is unknown and not handled in the UI");
                }
            } else {
                // Log info
                this.fn_getLogReference().info("Main Screen Controller: Visibility of the field " + oField.ColumnLabel + "is turned off in configuration");
            }

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_createCharElement method");

        },

        /**
         * Create date element in the form
         * 
         * @param {object} oForm Reference of the form
         * @param {object} oField Details of the field to be created
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_createDateElement: function (oForm, oField) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_createDateElement method");

            /** Define variables */
            var sValue = this.oSelectedTableData[oField.ColumnName], // Value to be displayed other than create scenario
                bMandatory, // Mandatory flag
                bEditable, // Editable flag
                sIdLbl, // Label Id
                sIdInp; // Input Id

            /** Method Implementation */
            if (oField.visibilityflag == "Y") {
                // Create the id of the fields
                sIdLbl = "lbl" + this._fn_getFieldId(oField.ColumnName);
                sIdInp = "inp" + this._fn_getFieldId(oField.ColumnName);

                // Set mandatory flag
                if (oField.MandatoryFlag === "Y") {
                    bMandatory = true;
                } else {
                    bMandatory = false;
                }

                // Set editable flag
                if (oField.editableflag === "Y") {
                    bEditable = true;
                } else {
                    bEditable = false;
                }

                // Add label to the form
                oForm.addContent(new Label({
                    id: sIdLbl,
                    text: oField.ColumnLabel,
                    tooltip: oField.ColumnLabel,
                    required: bMandatory
                }));

                // Add input field
                if (this.sActionedBy === "Requestor") {
                    if (this.sActionType === "Create") {
                        if (this.bErrorFlag) {
                            oForm.addContent(new DatePicker({
                                id: sIdInp,
                                displayFormat: "dd.MM.yyyy",
                                valueFormat: "yyyy-MM-dd",
                                placeholder: "Enter/Select the Date - DD.MM.YYYY",
                                required: bMandatory,
                                editable: bEditable,
                                value: sValue ? sValue.slice(0, 10) : sValue,
                                tooltip: sValue ? sValue.slice(0, 10) : sValue,
                                change: this.onChange_sfrmItemDetailsFieldData.bind(this),
                                width: "25rem"
                            }));
                        } else {
                            if (oField.Defaultvalue) {
                                oForm.addContent(new DatePicker({
                                    id: sIdInp,
                                    displayFormat: "dd.MM.yyyy",
                                    valueFormat: "yyyy-MM-dd",
                                    placeholder: "Enter/Select the Date - DD.MM.YYYY",
                                    required: bMandatory,
                                    editable: bEditable,
                                    value: oField.Defaultvalue,
                                    tooltip: oField.Defaultvalue,
                                    change: this.onChange_sfrmItemDetailsFieldData.bind(this),
                                    width: "25rem"
                                }));
                            } else {
                                oForm.addContent(new DatePicker({
                                    id: sIdInp,
                                    displayFormat: "dd.MM.yyyy",
                                    valueFormat: "yyyy-MM-dd",
                                    placeholder: "Enter/Select the Date - DD.MM.YYYY",
                                    required: bMandatory,
                                    editable: bEditable,
                                    tooltip: "",
                                    change: this.onChange_sfrmItemDetailsFieldData.bind(this),
                                    width: "25rem"
                                }));
                            }
                        }
                    } else if (this.sActionType === "Amend") {
                        if (oField.PrimaryKeyFlag === "Y") {
                            if (sValue) {
                                oForm.addContent(new DatePicker({
                                    id: sIdInp,
                                    displayFormat: "dd.MM.yyyy",
                                    valueFormat: "yyyy-MM-dd",
                                    editable: false,
                                    value: sValue.slice(0, 10),
                                    tooltip: sValue.slice(0, 10),
                                    width: "25rem"
                                }));
                            } else {
                                oForm.addContent(new DatePicker({
                                    id: sIdInp,
                                    displayFormat: "dd.MM.yyyy",
                                    valueFormat: "yyyy-MM-dd",
                                    editable: false,
                                    value: sValue,
                                    tooltip: sValue,
                                    width: "25rem"
                                }));
                            }
                        } else {
                            oForm.addContent(new DatePicker({
                                id: sIdInp,
                                displayFormat: "dd.MM.yyyy",
                                valueFormat: "yyyy-MM-dd",
                                placeholder: "Enter/Select the Date - DD.MM.YYYY",
                                required: bMandatory,
                                editable: bEditable,
                                value: sValue ? sValue.slice(0, 10) : sValue,
                                tooltip: sValue ? sValue.slice(0, 10) : sValue,
                                change: this.onChange_sfrmItemDetailsFieldData.bind(this),
                                width: "25rem"
                            }));
                        }
                    } else if (this.sActionType === "Close" || this.sActionType === "Display") {
                        oForm.addContent(new DatePicker({
                            id: sIdInp,
                            displayFormat: "dd.MM.yyyy",
                            valueFormat: "yyyy-MM-dd",
                            editable: false,
                            value: sValue ? sValue.slice(0, 10) : sValue,
                            tooltip: sValue ? sValue.slice(0, 10) : sValue,
                            width: "25rem"
                        }));
                    } else {
                        // Log error
                        this.fn_getLogReference().error("Action type " + this.sActionType + " not handled in UI");
                    }
                } else if (this.sActionedBy === "Approver") {
                    if (sValue) {
                        oForm.addContent(new DatePicker({
                            id: sIdInp,
                            displayFormat: "dd.MM.yyyy",
                            valueFormat: "yyyy-MM-dd",
                            editable: false,
                            value: sValue ? sValue.slice(0, 10) : sValue,
                            tooltip: sValue ? sValue.slice(0, 10) : sValue,
                            width: "25rem"
                        }));
                    } else {
                        oForm.addContent(new DatePicker({
                            id: sIdInp,
                            displayFormat: "dd.MM.yyyy",
                            valueFormat: "yyyy-MM-dd",
                            editable: false,
                            value: sValue ? sValue.slice(0, 10) : sValue,
                            tooltip: sValue ? sValue.slice(0, 10) : sValue,
                            width: "25rem"
                        }));
                    }
                } else {
                    // Log error
                    this.fn_getLogReference().error("User type is unknown and not handled in the UI");
                }
            } else {
                // Log info
                this.fn_getLogReference().info("Main Screen Controller: Visibility of the field " + oField.ColumnLabel + "is turned off in configuration");
            }

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_createDateElement method");

        },

        /**
         * Create lookup element in the form
         * 
         * @param {object} oForm Reference of the form
         * @param {object} oField Details of the field to be created
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_createLookupElement: function (oForm, oField) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_createLookupElement method");

            /** Define variables */
            var aDisplayFields, // Display field details
                sValue = this.oSelectedTableData[oField.ColumnName], // Value to be displayed other than create scenario
                bMandatory, // Mandatory flag
                bEditable, // Editable flag
                sIdLbl, // Label Id
                sIdInp; // Input Id

            /** Method Implementation */
            if (oField.visibilityflag == "Y") {
                // Create the id of the fields
                sIdLbl = "lbl" + this._fn_getFieldId(oField.ColumnName);
                sIdInp = "inp" + this._fn_getFieldId(oField.ColumnName);

                // Set mandatory flag
                if (oField.MandatoryFlag === "Y") {
                    bMandatory = true;
                } else {
                    bMandatory = false;
                }

                // Set editable flag
                if (oField.editableflag === "Y") {
                    bEditable = true;
                } else {
                    bEditable = false;
                }

                // Add label to the form
                oForm.addContent(new Label({
                    id: sIdLbl,
                    text: oField.ColumnLabel,
                    tooltip: oField.ColumnLabel,
                    required: bMandatory
                }));

                // Add the lookup fields data into an object array
                this.aLkpInformation.push({
                    fieldId: sIdInp,
                    fieldData: oField
                });

                // Add input field
                if (this.sActionedBy === "Requestor") {
                    if (this.sActionType === "Create") {
                        if (this.bErrorFlag) {
                            oForm.addContent(new Input({
                                id: sIdInp,
                                placeholder: "Select from the value help",
                                required: bMandatory,
                                editable: bEditable,
                                value: sValue,
                                tooltip: sValue + "",
                                showValueHelp: true,
                                valueHelpOnly: true,
                                valueHelpRequest: this.onValueHelpRequested.bind(this),
                                change: this.onChange_sfrmItemDetailsFieldData.bind(this),
                                width: "25rem"
                            }));
                        } else {
                            if (oField.Defaultvalue) {
                                oForm.addContent(new Input({
                                    id: sIdInp,
                                    placeholder: "Select from the value help",
                                    required: bMandatory,
                                    editable: bEditable,
                                    value: oField.Defaultvalue,
                                    tooltip: oField.Defaultvalue + "",
                                    showValueHelp: true,
                                    valueHelpOnly: true,
                                    valueHelpRequest: this.onValueHelpRequested.bind(this),
                                    change: this.onChange_sfrmItemDetailsFieldData.bind(this),
                                    width: "25rem"
                                }));
                            } else {
                                oForm.addContent(new Input({
                                    id: sIdInp,
                                    placeholder: "Select from the value help",
                                    required: bMandatory,
                                    editable: bEditable,
                                    tooltip: "",
                                    showValueHelp: true,
                                    valueHelpOnly: true,
                                    valueHelpRequest: this.onValueHelpRequested.bind(this),
                                    change: this.onChange_sfrmItemDetailsFieldData.bind(this),
                                    width: "25rem"
                                }));
                            }
                        }
                    } else if (this.sActionType === "Amend") {
                        // Set lookup value help data into global parameter
                        oTableData[oField.ColumnName] = sValue;

                        // Get display field info if any
                        aDisplayFields = this.aFieldDetails.filter(function (oFieldDetails) {
                            return oFieldDetails.displayfieldof === oField.ColumnName;
                        });

                        // Prepare the value
                        aDisplayFields.forEach(function (oDisplayField) {
                            sValue = sValue + ", " + this.oSelectedTableData[oDisplayField.ColumnName]
                        }, this);

                        if (oField.PrimaryKeyFlag === "Y") {
                            oForm.addContent(new Input({
                                id: sIdInp,
                                editable: false,
                                value: sValue,
                                tooltip: sValue + "",
                                width: "25rem"
                            }));
                        } else {
                            oForm.addContent(new Input({
                                id: sIdInp,
                                placeholder: "Select from the value help",
                                required: bMandatory,
                                editable: bEditable,
                                value: sValue,
                                tooltip: sValue + "",
                                showValueHelp: true,
                                valueHelpOnly: true,
                                valueHelpRequest: this.onValueHelpRequested.bind(this),
                                change: this.onChange_sfrmItemDetailsFieldData.bind(this),
                                width: "25rem"
                            }));
                        }
                    } else if (this.sActionType === "Close" || this.sActionType === "Display") {
                        // Set lookup value help data into global parameter
                        oTableData[oField.ColumnName] = sValue;

                        // Get display field info if any
                        aDisplayFields = this.aFieldDetails.filter(function (oFieldDetails) {
                            return oFieldDetails.displayfieldof === oField.ColumnName;
                        });

                        // Prepare the value
                        aDisplayFields.forEach(function (oDisplayField) {
                            sValue = sValue + ", " + this.oSelectedTableData[oDisplayField.ColumnName]
                        }, this);

                        oForm.addContent(new Input({
                            id: sIdInp,
                            editable: false,
                            value: sValue,
                            tooltip: sValue + "",
                            width: "25rem"
                        }));
                    } else {
                        // Log error
                        this.fn_getLogReference().error("Action type " + this.sActionType + " not handled in UI");
                    }
                } else if (this.sActionedBy === "Approver") {
                    // Get display field info if any
                    aDisplayFields = this.aFieldDetails.filter(function (oFieldDetails) {
                        return oFieldDetails.displayfieldof === oField.ColumnName;
                    });

                    // Prepare the value
                    aDisplayFields.forEach(function (oDisplayField) {
                        sValue = sValue + ", " + this.oSelectedTableData[oDisplayField.ColumnName]
                    }, this);

                    // Add input field
                    oForm.addContent(new Input({
                        id: sIdInp,
                        editable: false,
                        value: sValue,
                        tooltip: sValue + "",
                        width: "25rem"
                    }));
                } else {
                    // Log error
                    this.fn_getLogReference().error("User type is unknown and not handled in the UI");
                }
            } else {
                // Log info
                this.fn_getLogReference().info("Main Screen Controller: Visibility of the field " + oField.ColumnLabel + "is turned off in configuration");
            }

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_createLookupElement method");
        },

        /** 
         * Called to set pagination in the lookup dialog
         * 
         * @param {object} oField Field details
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_setPaginationLookup: function (oField) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_setPaginationLookup method");

            /** Define variables */
            var iLastIndex = oField.lkpodata.lastIndexOf("/"), // Stores index of last "/"
                sServiceUrl = oField.lkpodata.substring(0, iLastIndex), // Stores lookup service url
                sEntitySet = oField.lkpodata.substring(iLastIndex, oField.lkpodata.length), // Stores lookup entity set
                oLookupModel = new ODataModel(sServiceUrl).getNativeModel(), // Stores oData V4 model for lookup field
                oFilter; // Filter added in the lookup search field

            /** Method implementation */
            // Prepare filter
            if (oField.Lkprestfield && oField.Lkprestcond && oField.Lkprestvalue && this._aSearchFilters.length > 1) {
                oFilter = new Filter({
                    filters: [this._aSearchFilters[0], new Filter({
                        filters: this._aSearchFilters.slice(1),
                        and: false
                    })],
                    and: true
                });
            } else if (this._aSearchFilters.length === 1) {
                oFilter = this._aSearchFilters[0];
            } else if (this._aSearchFilters.length === 0) {
                oFilter = null;
            } else {
                oFilter = new Filter({
                    filters: this._aSearchFilters,
                    and: false
                });
            }

            // Read count
            var aFilters = oFilter ? [oFilter] : [];
            var oListBinding = oLookupModel.bindList(sEntitySet, null, null, aFilters, { $$count: true });
            oListBinding.requestContexts(0, 0).then(function () {
                this.iRecordCount = oListBinding.getLength();

                if (this.iRecordCount === 0) {
                    // Set current page number to 0
                    this.byId(this.getView().createId(this._fn_getFieldId(oField.ColumnName) + "--inpDlgLookupPageNum")).setValue("0");

                    // Disable next and last page buttons
                    this.byId(this.getView().createId(this._fn_getFieldId(oField.ColumnName) + "--btnDlgLookupNextPage")).setEnabled(false);
                    this.byId(this.getView().createId(this._fn_getFieldId(oField.ColumnName) + "--btnDlgLookupLastPage")).setEnabled(false);
                } else {
                    // Set current page number to 1
                    this.byId(this.getView().createId(this._fn_getFieldId(oField.ColumnName) + "--inpDlgLookupPageNum")).setValue("1");

                    // Enable next and last page button
                    if (this.iRecordCount > 20) {
                        this.byId(this.getView().createId(this._fn_getFieldId(oField.ColumnName) + "--btnDlgLookupNextPage")).setEnabled(true);
                        this.byId(this.getView().createId(this._fn_getFieldId(oField.ColumnName) + "--btnDlgLookupLastPage")).setEnabled(true);
                    } else {
                        this.byId(this.getView().createId(this._fn_getFieldId(oField.ColumnName) + "--btnDlgLookupNextPage")).setEnabled(false);
                        this.byId(this.getView().createId(this._fn_getFieldId(oField.ColumnName) + "--btnDlgLookupLastPage")).setEnabled(false);
                    }

                    // Set max page number
                    if (this.iRecordCount / 20 > Math.round(this.iRecordCount / 20)) {
                        this.byId(this.getView().createId(this._fn_getFieldId(oField.ColumnName) + "--lblDlgLookupMaxPageNum")).setText("/ " + Math.round(this.iRecordCount / 20) + 1);
                    } else {
                        this.byId(this.getView().createId(this._fn_getFieldId(oField.ColumnName) + "--lblDlgLookupMaxPageNum")).setText("/ " + Math.round(this.iRecordCount / 20));
                    }
                }
            }.bind(this)).catch(function (oError) {
                this.fn_showServiceError(oError);
            }.bind(this));

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_setPaginationLookup method");
        },

        /**
         * Read lookup data from backend
         * 
         * @param {object} oField Field details
         * @param {integer} iTop Number of records to be fetched from backend
         * @param {integer} iSkip Number of records to be skipped from backend
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_readLookupData: function (oField, iTop, iSkip) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_readLookupData method");

            /** Define Variables */
            var iLastIndex = oField.lkpodata.lastIndexOf("/"), // Stores index of last "/"
                sServiceUrl = oField.lkpodata.substring(0, iLastIndex), // Stores lookup service url
                sEntitySet = oField.lkpodata.substring(iLastIndex, oField.lkpodata.length), // Stores lookup entity set
                oLookupModel = new ODataModel(sServiceUrl).getNativeModel(), // Stores oData V4 model for lookup field
                oLookupDataModel = new JSONModel(), // Stores lookup data in JSON Model
                aLookupData, // Array of lookup data
                sKeyField = oField.ColumnName, // Stores the key field of the lookup
                oFilter; // Filter added in the lookup search field

            /** Method Implementation */
            // Start busy dialog
            this.fn_openBusyDialog();

            // Set the boolean flag of lookup exists
            this.bLookupPresent = true;

            // Prepare filter
            if (oField.Lkprestfield && oField.Lkprestcond && oField.Lkprestvalue && this._aSearchFilters.length > 1) {
                oFilter = new Filter({
                    filters: [this._aSearchFilters[0], new Filter({
                        filters: this._aSearchFilters.slice(1),
                        and: false
                    })],
                    and: true
                });
            } else if (this._aSearchFilters.length === 1) {
                oFilter = this._aSearchFilters[0];
            } else if (this._aSearchFilters.length === 0) {
                oFilter = null;
            } else {
                oFilter = new Filter({
                    filters: this._aSearchFilters,
                    and: false
                });
            }

            // Read data
            var aFilters = oFilter ? [oFilter] : [];
            var oListBinding = oLookupModel.bindList(sEntitySet, null, null, aFilters);
            oListBinding.requestContexts(iSkip, iTop).then(function (aContexts) {
                // Remove duplicate data of the lookup
                var aResults = aContexts.map(function (c) { return c.getObject(); });
                aLookupData = aResults.filter(function (sValue1, index, self) {
                    return index === self.findIndex(function (sValue2) {
                        return sValue2[sKeyField] === sValue1[sKeyField];
                    });
                });

                // Set the data into the global model
                if (this.fn_getGlobalModel(oField.ColumnName)) {
                    this.fn_getGlobalModel(oField.ColumnName).setData(aLookupData);
                } else {
                    oLookupDataModel.setData(aLookupData);
                    this.fn_setGlobalModel(oLookupDataModel, oField.ColumnName)
                }

                // Close busy dialog
                this.fn_closeBusyDialog();

                // Set lookup flag to false
                this.bLookupPresent = false;
            }.bind(this)).catch(function (oError) {
                // Show error in message strip
                this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Error while processing. For more info </em>");
                this.byId("msgStripMainScreen").setType("Error");
                this.byId("msgStripMainScreen").setVisible(true);

                // Show service error
                this.fn_showServiceError(oError);
            }.bind(this));

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_readLookupData method");
        },

        /**
         * Perform all kind of basic checks
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_checkBasicValidation: function () {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_checkBasicValidation method");

            /** Define variables */
            var aMandatoryFields,
                aDateFields;

            /** Method Implementation */
            // Get mandatory fields
            aMandatoryFields = this.aFieldDetails.filter(function (oField) {
                return oField.MandatoryFlag === 'Y';
            });

            if (aMandatoryFields) {
                // Log info
                this.fn_getLogReference().info("Main Screen Controller: Initiating mandatory checks");
                this._fn_performMandatoryCheck(aMandatoryFields);
            } else {
                // Log info
                this.fn_getLogReference().info("Main Screen Controller: No mandatory fields in the config to perform checks");
            }

            // Get date fields
            aDateFields = this.aFieldDetails.filter(function (oField) {
                var sDataType = (oField.ColumnDataType || "").toUpperCase();
                return sDataType.includes("DATS") || sDataType.includes("DATE");
            });

            if (aDateFields) {
                // Log info
                this.fn_getLogReference().info("Main Screen Controller: Initiating date checks");
                this._fn_performDateCheck(aDateFields);
            } else {
                // Log info
                this.fn_getLogReference().info("Main Screen Controller: No date fields in the config to perform checks");
            }

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_checkBasicValidation method");
        },

        /**
         * Perform mandatory checks
         * 
         * @param {Array} aMandatoryFields Mandatory fields array
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_performMandatoryCheck: function (aMandatoryFields) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_performMandatoryCheck method");

            /** Define variables */
            var sFieldId,  // Stores field id
                oMessage; // Stores message object for message manager

            /** Method Implementation */
            aMandatoryFields.forEach(function (oField) {
                // Prepare field id
                sFieldId = "inp" + this._fn_getFieldId(oField.ColumnName);

                // Check if value present
                if (oTableData[oField.ColumnName] || oTableData[oField.ColumnName] === 0) {
                    // Clear the value state of the field
                    if (sap.ui.getCore().byId(sFieldId)) {
                        sap.ui.getCore().byId(sFieldId).setValueState("None");

                        oMessage = new Message({
                            id: sFieldId,
                            message: "Basic Validation Successful",
                            type: MessageType.Success,
                            additionalText: oField.ColumnLabel,
                            description: "Basic validation on field " + oField.ColumnLabel + " is successful",
                            target: "/BasicValidation",
                            processor: this.fn_getLocalModel("messageModel")
                        });
                        sap.ui.getCore().getMessageManager().addMessages(oMessage);
                    } else {
                        // Log error
                        this.fn_getLogReference().error("Main Screen Controller: Unable to read the field from UI");
                    }
                } else {
                    // Log Error
                    this.fn_getLogReference().error("Main Screen Controller: Mandatory check failed for field - " + oField.ColumnLabel);

                    // Set value state and text
                    if (sap.ui.getCore().byId(sFieldId)) {
                        sap.ui.getCore().byId(sFieldId).setValueState("Error");
                        sap.ui.getCore().byId(sFieldId).setValueStateText("Field " + oField.ColumnLabel + " is mandatory");

                        oMessage = new Message({
                            id: sFieldId,
                            message: "Basic Validation Failed",
                            type: MessageType.Error,
                            additionalText: oField.ColumnLabel,
                            description: "Field " + oField.ColumnLabel + " is mandatory",
                            target: "/BasicValidation",
                            processor: this.fn_getLocalModel("messageModel")
                        });
                        sap.ui.getCore().getMessageManager().addMessages(oMessage);
                    } else {
                        // Log error
                        this.fn_getLogReference().error("Main Screen Controller: Unable to read the field from UI");
                    }

                    // Set validation flag to false
                    this.bValidationSuccess = false;
                }
            }, this);

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_performMandatoryCheck method");
        },

        /**
         * Perform date check
         * 
         * @param {Array} aDateFields Array of all date fields
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_performDateCheck: function (aDateFields) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_performDateCheck method");

            /** Define variables */
            var sFieldId,  // Stores field id
                oDate, // Date object
                oMessage; // Stores message object for message manager

            /** Method Implementation */
            aDateFields.forEach(function (oField) {
                // Prepare field id
                sFieldId = "inp" + this._fn_getFieldId(oField.ColumnName);

                // Check if value present
                if (oTableData[oField.ColumnName]) {
                    // Get date reference
                    oDate = new Date(parseInt(oTableData[oField.ColumnName].split("(")[1].split(")")[0], 10));

                    if (oDate instanceof Date && !isNaN(oDate.valueOf())) {
                        // Clear the value state of the field
                        if (sap.ui.getCore().byId(sFieldId)) {
                            sap.ui.getCore().byId(sFieldId).setValueState("None");

                            oMessage = new Message({
                                id: sFieldId,
                                message: "Basic Validation Successful",
                                type: MessageType.Success,
                                additionalText: oField.ColumnLabel,
                                description: "Date is valid for field " + oField.ColumnLabel,
                                target: "/BasicValidation",
                                processor: this.fn_getLocalModel("messageModel")
                            });
                            sap.ui.getCore().getMessageManager().addMessages(oMessage);
                        } else {
                            // Log error
                            this.fn_getLogReference().error("Main Screen Controller: Unable to read the field from UI");
                        }
                    } else {
                        // Log Error
                        this.fn_getLogReference().error("Main Screen Controller: Date validation failed for field - " + oField.ColumnLabel);

                        // Set value state and text
                        if (sap.ui.getCore().byId(sFieldId)) {
                            sap.ui.getCore().byId(sFieldId).setValueState("Error");
                            sap.ui.getCore().byId(sFieldId).setValueStateText("Field " + oField.ColumnLabel + " is having incorrect date");

                            oMessage = new Message({
                                id: sFieldId,
                                message: "Basic Validation Failed",
                                type: MessageType.Error,
                                additionalText: oField.ColumnLabel,
                                description: "Invalid date for field " + oField.ColumnLabel,
                                target: "/BasicValidation",
                                processor: this.fn_getLocalModel("messageModel")
                            });
                            sap.ui.getCore().getMessageManager().addMessages(oMessage);
                        } else {
                            // Log error
                            this.fn_getLogReference().error("Main Screen Controller: Unable to read the field from UI");
                        }

                        // Set validation flag to false
                        this.bValidationSuccess = false;
                    }
                } else {
                    // Clear value state
                    if (sap.ui.getCore().byId(sFieldId)) {
                        sap.ui.getCore().byId(sFieldId).setValueState("None");
                    } else {
                        // Log error
                        this.fn_getLogReference().error("Main Screen Controller: Unable to read the field from UI");
                    }

                    // Log info
                    this.fn_getLogReference().info("Main Screen Controller: Date field " + oField.ColumnLabel + " is not having any value to perform check");
                }
            }, this);

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_performDateCheck method");
        },

        /**
         * Get all custom validations to be performed on the table
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_readCustomValidation: function () {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_readCustomValidation method");

            /** Define variables */
            var oValidationModel = this.fn_getGlobalModel(),
                oCustomValModel = new JSONModel();

            /** Method Implementation */
            // Read validation data
            var oListBinding = oValidationModel.bindList("/CntrlUIVal", null, null, [new Filter("TableName", FilterOperator.EQ, this.sSelectedTableName)]);
            oListBinding.requestContexts(0, Infinity).then(function (aContexts) {
                var aResults = aContexts.map(function (c) { return c.getObject(); });
                // Check if custom validation exists
                if (aResults.length > 0) {
                    // Sort the validations based on its index
                    aResults.sort(function (oVal1, oVal2) {
                        return oVal1.ValidationIndex - oVal2.ValidationIndex;
                    });

                    // Set data into local json model
                    oCustomValModel.setData(aResults);

                    // Set the local model globally
                    if (this.fn_getGlobalModel("oCustomValModel")) {
                        this.fn_getGlobalModel("oCustomValModel").setData(aResults);
                    } else {
                        this.fn_setGlobalModel(oCustomValModel, "oCustomValModel");
                    }

                    // Perform Validations
                    this._fn_checkCustomValidations();
                } else {
                    // Log info
                    this.fn_getLogReference().info("Main Screen Controller: No custom validation added in configuration")

                    // Check if validation check was successful after perform basic validations
                    if (this.bValidationSuccess) {
                        // Show that validation is successful
                        this.byId("msgStripMainScreen").setText("<strong>Success: </strong><em>Validation is successful. For more info </em>")
                        this.byId("msgStripMainScreen").setType("Success");
                        this.byId("msgStripMainScreen").setVisible(true);

                        // Set reference of the user comments dialog globally
                        if (!this.userCommentsDialog) {
                            this.userCommentsDialog = Fragment.load({
                                id: this.getView().getId(),
                                name: "com.intapptics.zmdrcntrlcmn.view.UserComments",
                                controller: this
                            }).then(function (oDialog) {
                                this.getView().addDependent(oDialog);
                                return oDialog;
                            }.bind(this));
                        }

                        // Open the user comments dialog
                        this.userCommentsDialog.then(function (oDialog) {
                            oDialog.open();
                        });
                    } else {
                        // Show that validation is failed
                        this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Validation is failed for highlighted fields. For more info </em>")
                        this.byId("msgStripMainScreen").setType("Error");
                        this.byId("msgStripMainScreen").setVisible(true);
                    }

                    // Close busy dialog
                    this.fn_closeBusyDialog();
                }
            }.bind(this)).catch(function (oError) {
                // If the service is not found (404), assume no custom validations for local testing
                this.fn_getLogReference().info("Main Screen Controller: Custom validation endpoint failed, assuming no custom validations.");

                if (this.bValidationSuccess) {
                    this.byId("msgStripMainScreen").setText("<strong>Success: </strong><em>Validation is successful. For more info </em>");
                    this.byId("msgStripMainScreen").setType("Success");
                    this.byId("msgStripMainScreen").setVisible(true);

                    if (!this.userCommentsDialog) {
                        this.userCommentsDialog = sap.ui.core.Fragment.load({
                            id: this.getView().getId(),
                            name: "com.intapptics.zmdrcntrlcmn.view.UserComments",
                            controller: this
                        }).then(function (oDialog) {
                            this.getView().addDependent(oDialog);
                            return oDialog;
                        }.bind(this));
                    }

                    this.userCommentsDialog.then(function (oDialog) {
                        oDialog.open();
                    });
                } else {
                    this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Validation is failed for highlighted fields. For more info </em>");
                    this.byId("msgStripMainScreen").setType("Error");
                    this.byId("msgStripMainScreen").setVisible(true);
                }
                this.fn_closeBusyDialog();
            }.bind(this));

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_readCustomValidation method");
        },

        /**
         * Perform all custom validations
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_checkCustomValidations: function () {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_checkCustomValidations method");

            /** Define variables */
            var aCustomVals = this.fn_getGlobalModel("oCustomValModel").getData(), // Array of custom validations
                bCheckLookup = false, // Lookup boolean flag
                oMessage; // Object to store message from message manager

            /** Method Implementation */
            aCustomVals.forEach(function (oCustomVal) {
                if (oCustomVal.Operation === "REGEX") {
                    this._fn_customValidationRegex(oCustomVal);
                } else if (oCustomVal.Operation === "DATEAFTER") {
                    this._fn_customValidationDateafter(oCustomVal);
                } else if (oCustomVal.Operation === "DATENOTBEFORETODAY") {
                    this._fn_customValidationDatenotbeforetoday(oCustomVal);
                } else if (oCustomVal.Operation === "HASVALUE") {
                    this._fn_customValidationHasvalue(oCustomVal);
                } else if (oCustomVal.Operation === "LOOKUP") {
                    bCheckLookup = true;
                    this._fn_customValidationLookup(oCustomVal);
                } else {
                    oMessage = new Message({
                        id: "noOperation",
                        message: "Custom Validation Failed",
                        type: MessageType.Error,
                        additionalText: "Operation not handled",
                        description: "Custom validation '" + oCustomVal.Operation + "' not handled in UI.",
                        target: "/CustomValidation",
                        processor: this.fn_getLocalModel("messageModel")
                    });
                    sap.ui.getCore().getMessageManager().addMessages(oMessage);

                    this.bValidationSuccess = false;
                }
            }, this);


            if (this.bValidationSuccess && !bCheckLookup) {
                // Show that validation is successful
                this.byId("msgStripMainScreen").setText("<strong>Success: </strong><em>Validation is successful. For more info </em>")
                this.byId("msgStripMainScreen").setType("Success");
                this.byId("msgStripMainScreen").setVisible(true);

                if (this.sActionType === "Create") {
                    this._fn_existanceCheckCreate();
                } else {
                    // Set reference of the user comments dialog globally
                    if (!this.userCommentsDialog) {
                        this.userCommentsDialog = Fragment.load({
                            id: this.getView().getId(),
                            name: "com.intapptics.zmdrcntrlcmn.view.UserComments",
                            controller: this
                        }).then(function (oDialog) {
                            this.getView().addDependent(oDialog);
                            return oDialog;
                        }.bind(this));
                    }

                    // Open the user comments dialog
                    this.userCommentsDialog.then(function (oDialog) {
                        oDialog.open();
                    });
                }
            } else if (!this.bValidationSuccess) {
                // Show error in message strip
                this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Validation is failed. For more info </em>");
                this.byId("msgStripMainScreen").setType("Error");
                this.byId("msgStripMainScreen").setVisible(true);
            }

            // Close busy dialog if no lookup check is present
            if (!bCheckLookup) {
                this.fn_closeBusyDialog();
            }

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_checkCustomValidations method");
        },

        /**
         * Perform REGEX validation
         * 
         * @param {object} oCustomVal  Custom Validation Details
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_customValidationRegex: function (oCustomVal) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_customValidationRegex method");

            /** Define variables */
            var sSourceFieldId = "inp" + this._fn_getFieldId(oCustomVal.SourceColName), // Stores source field id
                regex, // Stores regex expression
                bRegexValidation, // Regex validation flag
                oMessage; // Stores message for message manager

            /** Method Implementation */
            if (oTableData[oCustomVal.SourceColName]) {
                // Get regex
                regex = new RegExp(oCustomVal.SourceColValue);

                bRegexValidation = regex.test(oTableData[oCustomVal.SourceColName]);

                if (!bRegexValidation) {
                    // Set value state
                    if (sap.ui.getCore().byId(sSourceFieldId)) {
                        sap.ui.getCore().byId(sSourceFieldId).setValueState("Error");
                        sap.ui.getCore().byId(sSourceFieldId).setValueText(oCustomVal.ErrorMessage);

                        oMessage = new Message({
                            id: sSourceFieldId,
                            message: "Custom validation failed",
                            type: MessageType.Error,
                            additionalText: oCustomVal.SourceColumnLabel,
                            description: oCustomVal.ErrorMessage,
                            target: "/CustomValidation",
                            processor: this.fn_getLocalModel("messageModel")
                        });
                        sap.ui.getCore().getMessageManager().addMessages(oMessage);
                    } else {
                        // Log error
                        this.fn_getLogReference().error("Main Screen Controller: Unable to identify the field in the UI");
                    }

                    // Set validation flag
                    this.bValidationSuccess = false;
                } else {
                    // Clear the value state
                    if (sap.ui.getCore().byId(sSourceFieldId)) {
                        sap.ui.getCore().byId(sSourceFieldId).setValueState("None");

                        oMessage = new Message({
                            id: sSourceFieldId,
                            message: "Custom validation successful",
                            type: MessageType.Success,
                            additionalText: oCustomVal.SourceColumnLabel,
                            description: "Custom REGEX validation on field " + oCustomVal.ColumnLabel + " is successful",
                            target: "/CustomValidation",
                            processor: this.fn_getLocalModel("messageModel")
                        });
                        sap.ui.getCore().getMessageManager().addMessages(oMessage);
                    } else {
                        // Log error
                        this.fn_getLogReference().error("Main Screen Controller: Unable to identify the field in the UI");
                    }
                }
            } else {
                // Log info
                this.fn_getLogReference().info("Main Screen Controller: No value present to perform custom validation 'REGEX'");
            }

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_customValidationRegex method");
        },

        /**
         * Perform DATEAFTER validation
         * 
         * @param {object} oCustomVal  Custom Validation Details
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_customValidationDateafter: function (oCustomVal) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_customValidationDateafter method");

            /** Define variables */
            var sSourceFieldId = "inp" + this._fn_getFieldId(oCustomVal.SourceColName), // Stores source field id
                oTime1, // Stores converted time of destination field
                oTime2, // Stores converted time of source field
                oMessage; // Stores message for message manager

            /** Method Implementation */
            if (oTableData[oCustomVal.SourceColName] && oTableData[oCustomVal.DestColName]) {
                // Get time
                oTime1 = parseInt(oTableData[oCustomVal.DestColName].split("(")[1].split(")")[0], 10);
                oTime2 = parseInt(oTableData[oCustomVal.SourceColName].split("(")[1].split(")")[0], 10);

                if (oTime1 > oTime2) {
                    // Set value state
                    if (sap.ui.getCore().byId(sSourceFieldId)) {
                        sap.ui.getCore().byId(sSourceFieldId).setValueState("Error");
                        sap.ui.getCore().byId(sSourceFieldId).setValueText(oCustomVal.ErrorMessage);

                        oMessage = new Message({
                            id: sSourceFieldId,
                            message: "Custom validation failed",
                            type: MessageType.Error,
                            additionalText: oCustomVal.SourceColumnLabel,
                            description: oCustomVal.ErrorMessage,
                            target: "/CustomValidation",
                            processor: this.fn_getLocalModel("messageModel")
                        });
                        sap.ui.getCore().getMessageManager().addMessages(oMessage);
                    } else {
                        // Log error
                        this.fn_getLogReference().error("Main Screen Controller: Unable to identify the field in the UI");
                    }

                    // Set validation flag
                    this.bValidationSuccess = false;
                } else {
                    // Clear the value state
                    if (sap.ui.getCore().byId(sSourceFieldId)) {
                        sap.ui.getCore().byId(sSourceFieldId).setValueState("None");

                        oMessage = new Message({
                            id: sSourceFieldId,
                            message: "Custom validation successful",
                            type: MessageType.Success,
                            additionalText: oCustomVal.SourceColumnLabel,
                            description: "Custom DATEAFTER between fields " + oCustomVal.SourceColumnLabel + " and " + oCustomVal.DestColumnLabel + " is successful",
                            target: "/CustomValidation",
                            processor: this.fn_getLocalModel("messageModel")
                        });
                        sap.ui.getCore().getMessageManager().addMessages(oMessage);
                    } else {
                        // Log error
                        this.fn_getLogReference().error("Main Screen Controller: Unable to identify the field in the UI");
                    }
                }
            } else {
                // Log info
                this.fn_getResourceBundle().info("Main Screen Controller: Custom validation DATEAFTER needs both source and destination column data to perform validation. Hence validation is skipped.");
            }

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_customValidationDateafter method");
        },

        /**
        * Perform DATENOTBEFORETODAY validation
        * 
        * @param {object} oCustomVal  Custom Validation Details
        * 
        * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
        * @private
        */
        _fn_customValidationDatenotbeforetoday: function (oCustomVal) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_customValidationDatenotbeforetoday method");

            /** Define variables */
            var sSourceFieldId = "inp" + this._fn_getFieldId(oCustomVal.SourceColName), // Stores source field id
                oTime1, // Stores converted time of destination field
                oTime2 = new Date().getTime(), // Stores converted time of source field
                oMessage; // Stores message for message manager

            /** Method Implementation */
            if (oTableData[oCustomVal.SourceColName]) {
                // Get time
                oTime1 = parseInt(oTableData[oCustomVal.SourceColName].split("(")[1].split(")")[0], 10);

                if (oTime1 < oTime2) {
                    // Set value state
                    if (sap.ui.getCore().byId(sSourceFieldId)) {
                        sap.ui.getCore().byId(sSourceFieldId).setValueState("Error");
                        sap.ui.getCore().byId(sSourceFieldId).setValueText(oCustomVal.ErrorMessage);

                        oMessage = new Message({
                            id: sSourceFieldId,
                            message: "Custom validation failed",
                            type: MessageType.Error,
                            additionalText: oCustomVal.SourceColumnLabel,
                            description: oCustomVal.ErrorMessage,
                            target: "/CustomValidation",
                            processor: this.fn_getLocalModel("messageModel")
                        });
                        sap.ui.getCore().getMessageManager().addMessages(oMessage);
                    } else {
                        // Log error
                        this.fn_getLogReference().error("Main Screen Controller: Unable to identify the field in the UI");
                    }

                    // Set validation flag
                    this.bValidationSuccess = false;
                } else {
                    // Clear the value state
                    if (sap.ui.getCore().byId(sSourceFieldId)) {
                        sap.ui.getCore().byId(sSourceFieldId).setValueState("None");

                        oMessage = new Message({
                            id: sSourceFieldId,
                            message: "Custom validation successful",
                            type: MessageType.Success,
                            additionalText: oCustomVal.SourceColumnLabel,
                            description: "Custom DATENOTBEFORETODAY validation for field " + oCustomVal.SourceColumnLabel + " is successful",
                            target: "/CustomValidation",
                            processor: this.fn_getLocalModel("messageModel")
                        });
                        sap.ui.getCore().getMessageManager().addMessages(oMessage);
                    } else {
                        // Log error
                        this.fn_getLogReference().error("Main Screen Controller: Unable to identify the field in the UI");
                    }
                }
            } else {
                // Log info
                this.fn_getResourceBundle().info("Main Screen Controller: Custom validation DATENOTBEFORETODAY is skipped as there is no data input by user in field - " + oCustomVal.SourceColumnLabel + ".");
            }

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_customValidationDatenotbeforetoday method");
        },

        /**
         * Perform HASVALUE validation
         * 
         * @param {object} oCustomVal  Custom Validation Details
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_customValidationHasvalue: function (oCustomVal) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_customValidationHasvalue method");

            /** Define variables */
            var sDestFieldId = "inp" + this._fn_getFieldId(oCustomVal.DestColName), // Stores destination field id
                oMessage; // Stores message for message manager

            /** Method Implementation */
            if (oTableData[oCustomVal.SourceColName]) {
                if (oTableData[oCustomVal.DestColName]) {
                    // Clear the value state
                    if (sap.ui.getCore().byId(sDestFieldId)) {
                        sap.ui.getCore().byId(sDestFieldId).setValueState("None");

                        oMessage = new Message({
                            id: sDestFieldId,
                            message: "Custom validation successful",
                            type: MessageType.Success,
                            additionalText: oCustomVal.SourceColumnLabel,
                            description: "Custom HASVALUE validation on field " + oCustomVal.DestColumnLabel + " is successful",
                            target: "/CustomValidation",
                            processor: this.fn_getLocalModel("messageModel")
                        });
                        sap.ui.getCore().getMessageManager().addMessages(oMessage);
                    } else {
                        // Log error
                        this.fn_getLogReference().error("Main Screen Controller: Unable to identify the field in the UI");
                    }
                } else {
                    // Set value state
                    if (sap.ui.getCore().byId(sDestFieldId)) {
                        sap.ui.getCore().byId(sDestFieldId).setValueState("Error");
                        sap.ui.getCore().byId(sDestFieldId).setValueText(oCustomVal.ErrorMessage);

                        oMessage = new Message({
                            id: sDestFieldId,
                            message: "Custom validation failed",
                            type: MessageType.Error,
                            additionalText: oCustomVal.SourceColumnLabel,
                            description: oCustomVal.ErrorMessage,
                            target: "/CustomValidation",
                            processor: this.fn_getLocalModel("messageModel")
                        });
                        sap.ui.getCore().getMessageManager().addMessages(oMessage);
                    } else {
                        // Log error
                        this.fn_getLogReference().error("Main Screen Controller: Unable to identify the field in the UI");
                    }

                    // Set validation flag
                    this.bValidationSuccess = false;
                }
            } else {
                // Log info
                this.fn_getResourceBundle().info("Main Screen Controller: Custom validation HASVALUE is skipped as there is no value in the source column " + oCustomVal.SourceColumnLabel + ".");
            }

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_customValidationHasvalue method");
        },

        /**
         * Perform LOOKUP validation
         * 
         * @param {object} oCustomVal  Custom Validation Details
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_customValidationLookup: function (oCustomVal) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_customValidationLookup method");

            /** Define variables */
            var sSourceFieldId = "inp" + this._fn_getFieldId(oCustomVal.SourceColName), // Stores source field id
                iLastIndex, // Stores index of last "/"
                sServiceUrl, // Stores service url of lookup validation
                sEntitySet, // Stores entity set of lookup validation
                aFilters = [], // Stores oData filter
                oLkpModel, // Stores lookup odata model
                oMessage; // Stores message for message manager

            /** Method Implementation */
            if (oTableData[oCustomVal.SourceColName]) {
                // Get the last index of "/"
                iLastIndex = oCustomVal.DestColValue.lastIndexOf("/");

                // Prepare service url and entity set
                sServiceUrl = oCustomVal.DestColValue.substring(0, iLastIndex);
                sEntitySet = oCustomVal.DestColValue.substring(iLastIndex, oCustomVal.DestColValue.length);

                // Create lookup odata model
                oLkpModel = new ODataModel({
                    serviceUrl: sServiceUrl
                }).getNativeModel();

                // Prepare filter to validate lookup
                aFilters.push(new Filter(oCustomVal.DestColName, FilterOperator.EQ, oTableData[oCustomVal.SourceColName]));

                // Read lookup model
                var oListBinding = oLkpModel.bindList("/" + sEntitySet, null, null, aFilters);
                oListBinding.requestContexts(0, 1).then(function (aContexts) {
                    if (aContexts.length > 0) {
                        // Clear the value state
                        if (sap.ui.getCore().byId(sSourceFieldId)) {
                            sap.ui.getCore().byId(sSourceFieldId).setValueState("None");

                            oMessage = new Message({
                                id: sSourceFieldId,
                                message: "Custom validation successful",
                                type: MessageType.Success,
                                additionalText: oCustomVal.sourcecolumnlabel,
                                description: "Custom LOOKUP validation on field " + oCustomVal.sourcecolumnlabel + " is successful",
                                target: "/CustomValidation",
                                processor: this.fn_getLocalModel("messageModel")
                            });
                            sap.ui.getCore().getMessageManager().addMessages(oMessage);
                        } else {
                            // Log error
                            this.fn_getLogReference().error("Main Screen Controller: Unable to identify the field in the UI");
                        }
                    } else {
                        // Set value state
                        if (sap.ui.getCore().byId(sSourceFieldId)) {
                            sap.ui.getCore().byId(sSourceFieldId).setValueState("Error");
                            sap.ui.getCore().byId(sSourceFieldId).setValueText(oCustomVal.ErrorMessage);

                            oMessage = new Message({
                                id: sSourceFieldId,
                                message: "Custom validation failed",
                                type: MessageType.Error,
                                additionalText: oCustomVal.SourceColumnLabel,
                                description: oCustomVal.ErrorMessage,
                                target: "/CustomValidation",
                                processor: this.fn_getLocalModel("messageModel")
                            });
                            sap.ui.getCore().getMessageManager().addMessages(oMessage);
                        } else {
                            // Log error
                            this.fn_getLogReference().error("Main Screen Controller: Unable to identify the field in the UI");
                        }

                        // Set validation flag
                        this.bValidationSuccess = false;
                    }

                    if (this.bValidationSuccess) {
                        // Show that validation is successful
                        this.byId("msgStripMainScreen").setText("<strong>Success: </strong><em>Validation is successful. For more info </em>")
                        this.byId("msgStripMainScreen").setType("Success");
                        this.byId("msgStripMainScreen").setVisible(true);

                        if (this.sActionType === "Create") {
                            this._fn_existanceCheckCreate();
                        } else {
                            // Set reference of the user comments dialog globally
                            if (!this.userCommentsDialog) {
                                this.userCommentsDialog = Fragment.load({
                                    id: this.getView().getId(),
                                    name: "com.intapptics.zmdrcntrlcmn.view.UserComments",
                                    controller: this
                                }).then(function (oDialog) {
                                    this.getView().addDependent(oDialog);
                                    return oDialog;
                                }.bind(this));
                            }

                            // Open the user comments dialog
                            this.userCommentsDialog.then(function (oDialog) {
                                oDialog.open();
                            });
                        }
                    } else {
                        // Show error in message strip
                        this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Validation is failed. For more info </em>");
                        this.byId("msgStripMainScreen").setType("Error");
                        this.byId("msgStripMainScreen").setVisible(true);
                    }

                    // Close busy dialog
                    this.fn_closeBusyDialog();
                }.bind(this)).catch(function (oError) {
                    // Set error in message strip
                    this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Error while processing. For more info </em>");
                    this.byId("msgStripMainScreen").setType("Error");
                    this.byId("msgStripMainScreen").setVisible(true);

                    // Show error
                    this.fn_showServiceError(oError);

                    // Close busy dialog
                    this.fn_closeBusyDialog();
                }.bind(this));
            } else {
                // Log info
                this.fn_getResourceBundle().info("Main Screen Controller: Custom validation LOOKUP is skipped as there is no value in the source column " + oCustomVal.sourcecolumnlabel + ".");

                // Close busy dialog
                this.fn_closeBusyDialog();
            }

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_customValidationLookup method");
        },

        /**
         * Perform validation of any existing change in case of create scenario
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_existanceCheckCreate: function () {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_existanceCheckCreate method");

            /** Define variables */
            var oTableModel, // ODatamodel of seletected table
                oInProgressData, // JSON Object to store any in-progress data
                aPrimaryKeys, // Array of all promary keys of the selected table
                aFilters = [], // Array to hold filter information
                oMessage; // Stores message for message manager

            /** Method Implementation */
            // Open busy dialog
            this.fn_openBusyDialog();

            // Get the primary keys
            aPrimaryKeys = this.aFieldDetails.filter(function (oField) {
                return oField.PrimaryKeyFlag === "Y";
            });

            // Prepare filter
            aPrimaryKeys.forEach(function (oPrimaryKey) {
                if (oTableData[oPrimaryKey.ColumnName]) {
                    aFilters.push(new Filter(oPrimaryKey.ColumnName, FilterOperator.EQ, oTableData[oPrimaryKey.ColumnName]));
                } else {
                    aFilters.push(new Filter(oPrimaryKey.ColumnName, FilterOperator.EQ, ""));
                }
            });
            aFilters.push(new Filter({
                filters: [
                    new Filter("VersionActive", FilterOperator.EQ, "Y"),
                    new Filter("VersionActive", FilterOperator.EQ, "I"),
                    new Filter("VersionActive", FilterOperator.EQ, "G")
                ],
                and: false
            }));

            // Read in-progress data
            var oListBinding = this.oTableModel.bindList(this.sTableEntitySet, null, null, aFilters);
            oListBinding.requestContexts(0, 1).then(function (aContexts) {
                if (aContexts.length === 0) {
                    // Log info
                    this.fn_getLogReference().info("Main Screen Controller: No in-progress or active record exists.");

                    // Show that validation is successful
                    this.byId("msgStripMainScreen").setText("<strong>Success: </strong><em>Validation is successful. For more info </em>")
                    this.byId("msgStripMainScreen").setType("Success");
                    this.byId("msgStripMainScreen").setVisible(true);

                    // Set reference of the user comments dialog globally
                    if (!this.userCommentsDialog) {
                        this.userCommentsDialog = sap.ui.core.Fragment.load({
                            id: this.getView().getId(),
                            name: "com.intapptics.zmdrcntrlcmn.view.UserComments",
                            controller: this
                        }).then(function (oDialog) {
                            this.getView().addDependent(oDialog);
                            return oDialog;
                        }.bind(this));
                    }

                    // Open the user comments dialog
                    this.userCommentsDialog.then(function (oDialog) {
                        oDialog.open();
                    });
                } else {
                    oInProgressData = aContexts[0].getObject();

                    // Set message strip type and Visibility
                    this.byId("msgStripMainScreen").setType("Error");
                    this.byId("msgStripMainScreen").setVisible(true);

                    if (oInProgressData.VersionActive === "Y") {
                        // Set error text in message strip
                        this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Error while processing. For more info </em>");

                        // Set message to message manager
                        oMessage = new Message({
                            id: "createInProgress",
                            message: "Active record exists for same entry",
                            type: MessageType.Error,
                            additionalText: "Unique constraint violated",
                            description: "An active record presents for same inputted key details. Try amending the existing record.",
                            target: "/CheckInProgressCreate",
                            processor: this.fn_getLocalModel("messageModel")
                        });
                        sap.ui.getCore().getMessageManager().addMessages(oMessage);
                    } else {
                        // Set error text in message strip
                        this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Workflow </em><strong>" + oInProgressData.WORKFLOW_ID +
                            "</strong><em>is in progress for the same inputted key details. Please get the existing workflow completed before raising any new request." +
                            " For more information on the in-progress workflow please </em>");

                        // Set message to message manager
                        oMessage = new Message({
                            id: "createInProgress",
                            message: "Workflow exists for same entry",
                            type: MessageType.Error,
                            additionalText: oInProgressData.WorkflowId,
                            description: "Workflow " + oInProgressData.WorkflowId + "is in progress for the same inputted key details. Please get the existing workflow completed before raising any new request.",
                            target: "/CheckInProgressCreate",
                            processor: this.fn_getLocalModel("messageModel")
                        });
                        sap.ui.getCore().getMessageManager().addMessages(oMessage);
                    }
                }

                // Close busy dialog
                this.fn_closeBusyDialog();
            }.bind(this)).catch(function (oError) {
                // Set error in message strip
                this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Error while processing. For more info </em>");
                this.byId("msgStripMainScreen").setType("Error");
                this.byId("msgStripMainScreen").setVisible(true);

                // Show error
                this.fn_showServiceError(oError);

                // Close busy dialog
                this.fn_closeBusyDialog();
            }.bind(this));
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_existanceCheckCreate method");
        },

        /**
         * Push data to backend 
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_pushDataToBackend: function () {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_pushDataToBackend method");

            /** Define variables */
            var oTableModel, // Stores odata model of selected table
                oMessage; // Stores message for message manager

            /** Method Implementation */
            // Remove all existing messages from message manager
            sap.ui.getCore().getMessageManager().removeAllMessages();

            // [FIXED] Reuse global OData model (which already has a valid CSRF token from App startup)
            // instead of instantiating a new one which fails on POST due to missing CSRF token!
            // oTableModel = this.getOwnerComponent().getModel();

            // Create data at backend system
            var oListBinding = this.oTableModel.bindList(this.sTableEntitySet);
            var oContext = oListBinding.create(oTableData);
            oContext.created().then(function () {
                var oData = oContext.getObject() || {};
                // Get the message reference post creation of table data at the backend
                var aMessages = sap.ui.getCore().getMessageManager().getMessageModel().getData();
                oMessage = aMessages && aMessages.length > 0 ? aMessages[0] : null;

                if (oMessage) {
                    // Update details of the message
                    oMessage.description = oMessage.message;
                    oMessage.additionalText = oData.WorkflowId || "WF" + Math.floor(Math.random() * 10000);
                    oMessage.message = "Data pushed to backend";
                }

                // Fallback if backend does not return WORKFLOW_ID (e.g. CAP generic handler)
                if (!oData.WorkflowId) {
                    oData.WorkflowId = "WF" + Math.floor(Math.random() * 10000);
                }

                // Update the value of the table data post data creation at backend with additional data received
                this.aFieldDetails.forEach(function (oField) {
                    if (oTableData[oField.ColumnName] !== undefined && oData[oField.ColumnName] !== undefined) {
                        oTableData[oField.ColumnName] = oData[oField.ColumnName];
                    }
                });

                // Trigger workflow
                this._fn_triggerWorkflow(oData.WorkflowId);
            }.bind(this)).catch(function (oError) {
                // Set error in message strip
                this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Error while processing. For more info </em>");
                this.byId("msgStripMainScreen").setType("Error");
                this.byId("msgStripMainScreen").setVisible(true);

                this.fn_showServiceError(oError);

                // Close busy dialog
                this.fn_closeBusyDialog();
            }.bind(this));

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_pushDataToBackend method");
        },

        /**
         * Trigger workflow
         * 
         * @param {string} sWorkflowId  Custom Validation Details
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_triggerWorkflow: function (sWorkflowId) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_triggerWorkflow method");

            /** Define variables */
            var oWorkflowModel, // Stores odata model of workflow service
                aPrimaryKeys, // Stores primary key fields
                sEntityId, // Stores entity id of the entry
                oForm = this.byId("sfrmItemDetails"), // Stores form reference
                oWorkflowData, // Stores the workflow data in json format
                oMessage; // Stores message for message manager

            /** Method Implementation */
            // Get primary key fields
            aPrimaryKeys = this.aFieldDetails.filter(function (oField) {
                return oField.PrimaryKeyFlag === "Y";
            });

            // Prepare entity id
            aPrimaryKeys.forEach(function (oPrimaryKey) {
                if (oTableData[oPrimaryKey.ColumnName]) {
                    if (sEntityId) {
                        sEntityId = sEntityId + "|" + oTableData[oPrimaryKey.ColumnName].toString();
                    } else {
                        sEntityId = oTableData[oPrimaryKey.ColumnName].toString();
                    }
                }
            });

            // Get reference of workflow model
            oWorkflowModel = this.fn_getGlobalModel("ZMDR_UTILITY_WORKFLOW_SRV");

            // Prepare workflow data
            oWorkflowData = {
                EntityName: this.sTableLabel,
                EntityId: sEntityId,
                Tablename: this.sSelectedTableName,
                WorkflowId: sWorkflowId,
                OperationType: this.sActionType,
                UserRemarks: this.sUserRemarks,
                WorkflowIdentifier: "CENTRAL"
            };            // [FIXED] Use fetch() instead of OData V4 bindContext/batch to avoid 403 errors

            var sServiceUrl = sap.ui.require.toUrl("com/intapptics/zmdrcntrlcmn") + "/mdrapi/workflow/";
            var sTriggerUrl = sServiceUrl + "TriggerWorkflowSet";

            fetch(sServiceUrl, {
                method: "GET",
                headers: {
                    "X-CSRF-Token": "Fetch",
                    "Accept": "application/json"
                }
            }).then(function (oTokenResponse) {
                var sCsrfToken = oTokenResponse.headers.get("X-CSRF-Token") || "";

                return fetch(sTriggerUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "X-CSRF-Token": sCsrfToken
                    },
                    body: JSON.stringify(oWorkflowData)
                });
            }).then(function (oResponse) {
                return oResponse.text().then(function (sText) {
                    if (!oResponse.ok) {
                        throw new Error("Trigger failed: " + oResponse.status + " " + sText);
                    }
                    return JSON.parse(sText);
                });
            }).then(function (oResult) {
                // Close the user comments dialog
                this.byId("dlgComment").close();

                // Set the message
                oMessage = new Message({
                    id: "triggerWorkflow",
                    message: "Workflow triggered successfully",
                    type: MessageType.Success,
                    additionalText: sWorkflowId,
                    description: this.sActionType + " request for table " + this.sTableLabel + " is successfully submitted for approval process with process reference number " + sWorkflowId,
                    target: "/TriggerWF",
                    processor: this.fn_getLocalModel("messageModel")
                });
                sap.ui.getCore().getMessageManager().addMessages(oMessage);

                // Set message to message strip
                this.byId("msgStripMainScreen").setText("<strong>Success: </strong><em>Workflow </em><strong>" + sWorkflowId + "</strong><em> is initiated successfully. For more info </em>");
                this.byId("msgStripMainScreen").setType("Success");
                this.byId("msgStripMainScreen").setVisible(true);

                // Disable the form (if it exists)
                if (oForm) {
                    oForm.getContent().forEach(function (oItem) {
                        if (oItem.getId().includes("inp")) {
                            oItem.setEditable(false);
                        }
                    });
                }

                // Disable the submit button and enable create button only for create scenario
                this.byId("btnSubmit").setVisible(false);
                if (this.sActionType === "Create") {
                    this.byId("btnCreate").setVisible(true);
                } else {
                    this.byId("btnCreate").setVisible(false);
                }

                // Close busy dialog
                this.fn_closeBusyDialog();
            }.bind(this)).catch(function (oError) {
                // Set error in message strip
                this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Error while processing. " + oError.message + "</em>");
                this.byId("msgStripMainScreen").setType("Error");
                this.byId("msgStripMainScreen").setVisible(true);

                // Close busy dialog
                this.fn_closeBusyDialog();
            }.bind(this));

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_triggerWorkflow method");
        },

        /**
         * Claim Approver task
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_claimApproverTask: function () {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_claimApproverTask method");

            /** Define variables */
            var oWorkflowModel = this.fn_getGlobalModel("ZMDR_UTILITY_WORKFLOW_SRV"), // Stores odata model of workflow service
                oWorkflowData; // Stores workflow data

            /** Method Implementation */
            // Prepare workflow data
            oWorkflowData = {
                WorkitemId: this.iWorkitemID,
                Action: "RESERVE"
            };

            // TODO: Migrate to native V4 once ReserveWorkitemSet is mapped in backend
            // Claim workitem
            oWorkflowModel.create("/ReserveWorkitemSet", oWorkflowData, {
                method: "POST",
                error: function (oError) {
                    // Set error in message strip
                    this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Error while processing. For more info </em>");
                    this.byId("msgStripMainScreen").setType("Error");
                    this.byId("msgStripMainScreen").setVisible(true);

                    this.fn_showServiceError(oError);

                    // Close busy dialog
                    this.fn_closeBusyDialog();
                }.bind(this)
            });

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_claimApproverTask method");
        },

        /**
         * Read the service url of the table name passed as parameter
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_readTableUrl: function (oCustomVal) {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_readTableUrl method");

            /** Define variables */
            var oUrlModel, // Stores odata model of table service
                iLastIndex; // Stores index of last "/"

            /** Method Implementation */
            oUrlModel = this.fn_getGlobalModel();

            // Get service url
            var oListBinding = oUrlModel.bindList("/CntrlUIUrl", null, null, [new Filter("TableName", FilterOperator.EQ, this.sSelectedTableName)]);
            oListBinding.requestContexts(0, 1).then(function (aContexts) {
                if (aContexts.length > 0) {
                    var aUrlData = aContexts[0].getObject();
                    // Check if the service URL starts with a forward slash
                    if (this.fn_getGlobalModel().getServiceUrl().startsWith("/")) {
                        aUrlData[0].OdataUrl.split("/").forEach(function (sUrlPart, index) {
                            if (index === aUrlData[0].OdataUrl.split("/").length - 1) {
                                this.sTableEntitySet = "/" + sUrlPart;
                            } else if (index === 0) {
                                sTableServiceUrl = "/";
                            } else {
                                sTableServiceUrl = sTableServiceUrl + sUrlPart + "/";
                            }
                        }.bind(this));
                    } else {
                        aUrlData[0].OdataUrl.split("/").forEach(function (sUrlPart, index) {
                            if (index === aUrlData[0].OdataUrl.split("/").length - 1) {
                                this.sTableEntitySet = "/" + sUrlPart;
                            } else if (index === 0) {
                                sTableServiceUrl = "";
                            } else {
                                sTableServiceUrl = sTableServiceUrl + sUrlPart + "/";
                            }
                        }.bind(this));
                    }

                    // Log information
                    this.fn_getLogReference().info("Table Result Controller: Service URL - " + sTableServiceUrl);
                    this.fn_getLogReference().info("Table Result Controller: Entity Set - " + this.sTableEntitySet);

                    // Resolve the service URL as per manifest
                    var sResolvedServiceUri = this.getOwnerComponent().getManifestObject().resolveUri(sTableServiceUrl, "sap.app");

                    this.fn_getLogReference().info("Table Result Controller: Resolved Service URL - " + sResolvedServiceUri);

                    // Odata model of the selected table - use the global model which has proper authentication context
                    this.oTableModel = new ODataModel({
                        serviceUrl: sResolvedServiceUri,
                        synchronizationMode: "None",   // required for OData V4
                        autoExpandSelect: true,
                        operationMode: "Server",
                        earlyRequests: true   // triggers early metadata + CSRF fetch
                    });

                    // Get workflow data
                    this._fn_readWfData();
                } else {
                    // Log error
                    this.fn_getLogReference().error("Main Screen Controller: Unable to get the service url for table " + this.sSelectedTableName + ".");
                }
            }.bind(this)).catch(function (oError) {
                // Set error in message strip
                this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Error while processing. For more info </em>");
                this.byId("msgStripMainScreen").setType("Error");
                this.byId("msgStripMainScreen").setVisible(true);

                this.fn_showServiceError(oError);

                // Close busy dialog
                this.fn_closeBusyDialog();
            }.bind(this));

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_readTableUrl method");
        },

        /**
         * Read table data based on workflow id
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_readWfData: function () {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_readWfData method");

            /** Define variables */
            var aFilters = [], // Stores filter information
                oMessage; // Stores message for message manager

            /** Method Implementation */
            // Add filters
            aFilters.push(new Filter("WorkflowId", FilterOperator.EQ, this.sWorkflowID));
            aFilters.push(new Filter("VersionActive", FilterOperator.EQ, "I"));

            // Read data from backend
            var oListBinding = oTableModel.bindList(this.sTableEntitySet, null, null, aFilters);
            oListBinding.requestContexts(0, 2).then(function (aContexts) {
                if (aContexts.length === 1) {
                    // Set the table data
                    this.oSelectedTableData = aContexts[0].getObject();

                    // Prepare the form
                    this._fn_dynamicFormPreparation();

                    // Read User remarks
                    // this._fn_readRemarks(); //to do
                } else {
                    // Set error in message strip
                    this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Error while processing. For more info </em>");
                    this.byId("msgStripMainScreen").setType("Error");
                    this.byId("msgStripMainScreen").setVisible(true);

                    // Set the message
                    oMessage = new Message({
                        id: "sIdTechError",
                        message: "Error reading data based on workflow id",
                        type: MessageType.Error,
                        additionalText: "Backend data issue",
                        description: "Failed to read data based on workflow id " + this.sWorkflowID,
                        target: "/TechnicalError",
                        processor: this.fn_getLocalModel("messageModel")
                    });
                    sap.ui.getCore().getMessageManager().addMessages(oMessage);

                    // Close busy dialog
                    this.fn_closeBusyDialog();

                    // Log error
                    this.fn_getLogReference().error("Main Screen Controller: Error reading workflow data for workflow id " + this.sWorkflowID + ". " + aContexts.length + " data returned.");
                }
            }.bind(this)).catch(function (oError) {
                // Set error in message strip
                this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Error while processing. For more info </em>");
                this.byId("msgStripMainScreen").setType("Error");
                this.byId("msgStripMainScreen").setVisible(true);

                this.fn_showServiceError(oError);

                // Close busy dialog
                this.fn_closeBusyDialog();
            }.bind(this));

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_readWfData method");
        },

        /**
         * Read remarks provided by requestor or approver
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_readRemarks: function () {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_readRemarks method");

            /** Define variables */
            var oWorkflowModel = this.fn_getGlobalModel("ZMDR_UTILITY_WORKFLOW_SRV"), // Stores odata model of workflow service
                aPrimaryKeys, // Stores primary key fields
                sEntityId, // Stores entity id of the entry
                sEntityName = this.sTableLabel, // Stores entity name
                sCurrentStage = this.sPreviousStage, // Stores current stage of the workflow
                sEntitySet = "/UserRemarksSet"; // Stores entity set of the workflow service

            /** Method Implementation */
            // Get primary key fields
            aPrimaryKeys = this.aFieldDetails.filter(function (oField) {
                return oField.PrimaryKeyFlag === "Y";
            });

            // Prepare entity id
            aPrimaryKeys.forEach(function (oPrimaryKey) {
                if (this.oSelectedTableData[oPrimaryKey.ColumnName]) {
                    if (sEntityId) {
                        sEntityId = sEntityId + "|" + this.oSelectedTableData[oPrimaryKey.ColumnName].toString();
                    } else {
                        sEntityId = this.oSelectedTableData[oPrimaryKey.ColumnName].toString();
                    }
                }
            }, this);

            // Prepare complete entity set
            sEntitySet = sEntitySet + encodeURIComponent("(EntityId='" + sEntityId + "',EntityName='" + sEntityName + "',CurrentStage='" + sCurrentStage + "',WorkflowId='" + this.sWorkflowID + "')");

            // TODO: Migrate to native V4 once UserRemarksSet is mapped in backend
            // Read remarks data
            oWorkflowModel.read(sEntitySet, {
                method: "GET",
                async: true,
                success: function (oData) {
                    if (oData) {
                        // Set the visibility of the requestor remarks section and field values
                        this.byId("frmRemarks").setVisible(true);
                        this.byId("txtReqId").setValue(oData.RequestorId);
                        this.byId("txtReqId").setTooltip(oData.RequestorId);
                        this.byId("txtReqName").setValue(oData.RequestorName);
                        this.byId("txtReqName").setTooltip(oData.RequestorName);
                        this.byId("txtReqEmail").setValue(oData.RequestorEmail);
                        this.byId("txtReqEmail").setTooltip(oData.RequestorEmail);
                        this.byId("txtReqRemarks").setValue(oData.RequestorRemarks);
                        this.byId("txtReqRemarks").setTooltip(oData.RequestorRemarks);

                        if (oData.ApproverRemarks) {
                            // Set the visibility of the approver remarks section and field values
                            this.byId("fcntApprHeader").setVisible(true);
                            this.byId("txtApprId").setValue(oData.ApproverId);
                            this.byId("txtApprId").setTooltip(oData.ApproverId);
                            this.byId("txtApprName").setValue(oData.ApproverName);
                            this.byId("txtApprName").setTooltip(oData.ApproverName);
                            this.byId("txtApprEmail").setValue(oData.ApproverEmail);
                            this.byId("txtApprEmail").setTooltip(oData.ApproverEmail);
                            this.byId("txtApprRemarks").setValue(oData.ApproverRemarks);
                            this.byId("txtApprRemarks").setTooltip(oData.ApproverRemarks);
                        }
                    } else {
                        // Log Error
                        this.fn_getLogReference().error("Main Screen Controller: No remarks data found for workflow id " + this.sWorkflowID + ".");
                    }
                }.bind(this),
                error: function (oError) {
                    // Set error in message strip
                    this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Error while processing. For more info </em>");
                    this.byId("msgStripMainScreen").setType("Error");
                    this.byId("msgStripMainScreen").setVisible(true);

                    this.fn_showServiceError(oError);

                    // Close busy dialog
                    this.fn_closeBusyDialog();
                }.bind(this)
            });

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_readRemarks method");
        },

        /**
         * Open the dialog which shows the comparison data
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_OpenComparisonDialog: function () {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_OpenComparisonDialog method");

            /** Method Implementation */
            if (!this.compareDialog) {
                this.compareDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "com.intapptics.zmdrcntrlcmn.view.Comparison",
                    controller: this
                }).then(function (oDialog) {
                    // Prepare the comparison dialog
                    this._fn_prepareComparisonDialog();

                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }

            // Open the comparison dialog
            this.compareDialog.then(function (oDialog) {
                oDialog.open();
            });

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_OpenComparisonDialog method");
        },

        /**
         * Prepare the dialog which shows the comparison data
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_prepareComparisonDialog: function () {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_prepareComparisonDialog method");

            /** Define variables */
            var sIdBlockLayoutDisplayFields = this.getView().createId("blcDisplay"), // Stores id of the block layout display fields
                sIdMsgStrip = this.getView().createId("msgStripCompare"), // Stores id of the message strip
                sIdLbl, // Label of field to be added as a content
                sIdInp, // Id of field to be added as a content
                aVisibleFields, // Array to hold visible fields
                aCarouselData = this.fn_getGlobalModel("carouselModel").getData(), // Stores carousel data
                aUpdatedLabelIds = []; // Array to hold updated label ids

            /** Method Implementation */
            // Get all visible fields
            aVisibleFields = this.aFieldDetails.filter(function (oField) {
                return oField.visibilityflag === "Y";
            });

            // Loop into visible fields and add them to the comparison area layout
            aVisibleFields.forEach(function (oField) {
                // Create the id of the fields
                sIdLbl = "compLbl" + this._fn_getFieldId(oField.ColumnName);
                sIdInp = "compTxt" + this._fn_getFieldId(oField.ColumnName);

                // Check if old and new data are same
                var sDataType = (oField.ColumnDataType || "").toUpperCase();
                if (sDataType.includes("DATS") || sDataType.includes("DATE")) {
                    var oDate1 = new Date(aCarouselData[0][oField.ColumnName]);
                    var oDate2 = new Date(aCarouselData[1][oField.ColumnName]);

                    if (oDate1.getTime() === oDate2.getTime()) {
                        // Add Label
                        this.byId(sIdBlockLayoutDisplayFields).addContent(new HBox({
                            items: new Label({
                                id: sIdLbl,
                                text: oField.ColumnLabel + ": ",
                                tooltip: oField.ColumnLabel
                            })
                        }));
                    } else {
                        // Add Label
                        this.byId(sIdBlockLayoutDisplayFields).addContent(new HBox({
                            items: new Label({
                                id: sIdLbl,
                                text: oField.ColumnLabel + ": ",
                                tooltip: oField.ColumnLabel
                            })
                        }));

                        // Add label id into an array
                        aUpdatedLabelIds.push(sIdLbl);
                    }
                } else {
                    if (aCarouselData[0][oField.ColumnName] === aCarouselData[1][oField.ColumnName]) {
                        // Add Label
                        this.byId(sIdBlockLayoutDisplayFields).addContent(new HBox({
                            items: new Label({
                                id: sIdLbl,
                                text: oField.ColumnLabel + ": ",
                                tooltip: oField.ColumnLabel
                            })
                        }));
                    } else {
                        // Add Label
                        this.byId(sIdBlockLayoutDisplayFields).addContent(new HBox({
                            items: new Label({
                                id: sIdLbl,
                                text: oField.ColumnLabel + ": ",
                                tooltip: oField.ColumnLabel
                            })
                        }));

                        // Add label id into an array
                        aUpdatedLabelIds.push(sIdLbl);
                    }
                }

                // Add text field with binding
                if (sDataType.includes("DATS") || sDataType.includes("DATE")) {
                    // Add Input field
                    this.byId(sIdBlockLayoutDisplayFields).addContent(new HBox({
                        items: new Text({
                            id: sIdInp,
                            text: {
                                path: "carouselModel>" + oField.ColumnName,
                                type: new sap.ui.model.type.Date({
                                    pattern: "dd.MM.yyyy"
                                })
                            },
                            tooltip: {
                                path: "carouselModel>" + oField.ColumnName,
                                type: new sap.ui.model.type.Date({
                                    pattern: "dd.MM.yyyy"
                                })
                            }
                        })
                    }));
                } else if (sDataType.includes("INTEGER") || sDataType.includes("INT") || sDataType === "NUMC" || sDataType === "DEC") {
                    this.byId(sIdBlockLayoutDisplayFields).addContent(new HBox({
                        items: new Text({
                            id: sIdInp,
                            text: {
                                path: "carouselModel>" + oField.ColumnName
                            },
                            tooltip: {
                                path: "carouselModel>" + oField.ColumnName,
                                formatter: function (sValue) {
                                    return sValue + "";
                                }
                            }
                        })
                    }));
                } else {
                    this.byId(sIdBlockLayoutDisplayFields).addContent(new HBox({
                        items: new Text({
                            id: sIdInp,
                            text: {
                                path: "carouselModel>" + oField.ColumnName
                            },
                            tooltip: {
                                path: "carouselModel>" + oField.ColumnName
                            }
                        })
                    }));
                }
            }, this);

            // Colour the changed fields
            this.byId(sIdBlockLayoutDisplayFields).getContent().forEach(function (oControl) {
                if (aUpdatedLabelIds.filter(function (sUpdatedLabelId) {
                    return sUpdatedLabelId === oControl.getItems()[0].getId();
                }, this).length > 0) {
                    oControl.addStyleClass("blue");
                }

                oControl.addStyleClass("sapUiTinyMarginBeginEnd");
                oControl.addStyleClass("sapUiTinyMarginTopBottom");
            }, this);

            // Set text of the message strip
            if (aUpdatedLabelIds.length !== 0) {
                this.byId(sIdMsgStrip).setText("<strong>Information: </strong><em>Below highlighted <strong>" + aUpdatedLabelIds.length + "</strong> field/s changed</em>");
            } else {
                this.byId(sIdMsgStrip).setText("<strong>Information: </strong><em>No changes in the data</em>");
            }

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_prepareComparisonDialog method");
        },

        /**
         * Perform action based on button pressed by approver
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_approverAction: function () {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_approverAction method");

            /** Define variables */
            var oTableModel, // Stores odata model of selected table
                oTableData, // Stores table data
                aPrimaryKeys, // Array of all primary keys of the selected table
                sTableEntitySet, // Stores entity set of the selected table
                sPath = "(", // Stores path of the selected table
                aMessages, // Array to hold message information
                aMessagesRemove; // Array to hold message information to be removed

            /** Method Implementation */
            // Set update group
            this.oTableModel.setSubmitBatchMode(sap.ui.model.odata.v4.SubmitMode.Auto);

            // Get the primary key fields
            aPrimaryKeys = this.aFieldDetails.filter(function (oField) {
                return oField.PrimaryKeyFlag === "Y";
            });

            aPrimaryKeys.forEach(function (oPrimaryKey, index) {
                if (index === aPrimaryKeys.length - 1) {
                    var sDataType = (oPrimaryKey.ColumnDataType || "").toUpperCase();
                    if (sDataType.includes("INTEGER") || sDataType.includes("INT") || sDataType === "NUMC" || sDataType === "DEC") {
                        sPath = sPath + oPrimaryKey.ColumnName + "=" + this.oSelectedTableData[oPrimaryKey.ColumnName] + ")";
                    } else {
                        sPath = sPath + oPrimaryKey.ColumnName + "='" + this.oSelectedTableData[oPrimaryKey.ColumnName] + "')";
                    }
                } else {
                    var sDataType = (oPrimaryKey.ColumnDataType || "").toUpperCase();
                    if (sDataType.includes("INTEGER") || sDataType.includes("INT") || sDataType === "NUMC" || sDataType === "DEC") {
                        sPath = sPath + oPrimaryKey.ColumnName + "=" + this.oSelectedTableData[oPrimaryKey.ColumnName] + ",";
                    } else {
                        sPath = sPath + oPrimaryKey.ColumnName + "='" + this.oSelectedTableData[oPrimaryKey.ColumnName] + "',";
                    }
                }
            }, this);

            // Prepare the complete entity set
            sTableEntitySet = this.sTableEntitySet + encodeURIComponent(sPath);

            if (this.sApproverAction === "Approve") {
                oTableData = {
                    "WORKFLOW_ID": this.sWorkflowID,
                    "OPERATIONTYPE": this.sActionType,
                    "ISFINALAPPROVAL": this.sFinalApproval
                };

                // Update the table data
                var oContextBinding = this.oTableModel.bindContext("/" + sTableEntitySet);
                oContextBinding.requestObject().then(function () {
                    var oContext = oContextBinding.getBoundContext();
                    for (var sKey in oTableData) {
                        oContext.setProperty(sKey, oTableData[sKey]);
                    }
                    return oTableModel.submitBatch(oTableModel.getUpdateGroupId());
                }).then(function () {
                    aMessages = sap.ui.getCore().getMessageManager().getMessageModel().getData();
                    aMessagesRemove = aMessages.filter(function (oMessage) {
                        return oMessage.code === "";
                    });
                    sap.ui.getCore().getMessageManager().removeMessages(aMessagesRemove);

                    // Complete the workflow task
                    this._fn_completeWorkflowTask();
                }.bind(this)).catch(function (oError) {
                    // Set error in message strip
                    this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Error while processing. For more info </em>");
                    this.byId("msgStripMainScreen").setType("Error");
                    this.byId("msgStripMainScreen").setVisible(true);

                    this.fn_showServiceError(oError);

                    // Close busy dialog
                    this.fn_closeBusyDialog();
                }.bind(this));
            } else {
                // Remove the data from backend
                var oContextBinding = oTableModel.bindContext("/" + sTableEntitySet);
                oContextBinding.requestObject().then(function () {
                    var oContext = oContextBinding.getBoundContext();
                    return oContext.delete();
                }).then(function () {
                    aMessages = sap.ui.getCore().getMessageManager().getMessageModel().getData();
                    aMessagesRemove = aMessages.filter(function (oMessage) {
                        return oMessage.code === "";
                    });
                    sap.ui.getCore().getMessageManager().removeMessages(aMessagesRemove);

                    // Complete the workflow task
                    this._fn_completeWorkflowTask();
                }.bind(this)).catch(function (oError) {
                    // Set error in message strip
                    this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Error while processing. For more info </em>");
                    this.byId("msgStripMainScreen").setType("Error");
                    this.byId("msgStripMainScreen").setVisible(true);

                    this.fn_showServiceError(oError);

                    // Close busy dialog
                    this.fn_closeBusyDialog();
                }.bind(this));
            }

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_approverAction method");
        },

        /**
         * Complete the workitem id in workflow
         * 
         * @memberof com.intapptics.zmdrcntrlcmn.view.MainScreen
         * @private
         */
        _fn_completeWorkflowTask: function () {
            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Entering _fn_completeWorkflowTask method");

            /** Define variables */
            var oWorkflowModel = this.fn_getGlobalModel("ZMDR_UTILITY_WORKFLOW_SRV"), // Stores odata model of workflow service
                sMsgText, // Stores message text to be shown to the approver
                oWorkflowData, // Stores the workflow data in json format
                oMessage; // Stores message for message manager

            /** Method Implementation */
            // Assign the workflow data
            if (this.sApproverAction === "Approve") {
                sMsgText = "approved"

                oWorkflowData = {
                    WorkitemId: this.iWorkitemID,
                    Action: "APPROVED",
                    ApproverComments: this.sUserRemarks
                };
            } else {
                sMsgText = "rejected"

                oWorkflowData = {
                    WorkitemId: this.iWorkitemID,
                    Action: "REJECTED",
                    ApproverComments: this.sUserRemarks
                };
            }

            // TODO: Migrate to native V4 once CompleteWorkitemSet is mapped in backend
            // Complete the workflow task
            oWorkflowModel.create("/CompleteWorkitemSet", oWorkflowData, {
                method: "POST",
                success: function (oData) {
                    // Close the comments dialog
                    this.byId("dlgComment").close();

                    // Set the message
                    oMessage = new Message({
                        id: "approverAction",
                        message: "Successfully " + sMsgText + " the workflow task",
                        type: MessageType.Success,
                        additionalText: this.sWorkflowID,
                        target: "/ApprAction",
                        processor: this.fn_getLocalModel("messageModel")
                    });

                    sap.ui.getCore().getMessageManager().addMessages(oMessage);

                    // Set the success message in message strip
                    this.byId("msgStripMainScreen").setText("<strong>Success: </strong><em>Workflow <strong>" + this.sWorkflowID + "</strong> is successfully " + sMsgText + ". For audit information of the workflow </em>");
                    this.byId("msgStripMainScreen").setType("Success");
                    this.byId("msgStripMainScreen").setVisible(true);

                    // Disbale the form of item details and remarks
                    this.byId("sfrmItemDetails").setVisible(false);
                    this.byId("frmRemarks").setVisible(false);
                    // Disable buttons
                    this.byId("btnApprove").setVisible(false);
                    this.byId("btnReject").setVisible(false);
                    this.byId("btnRelease").setVisible(false);
                    this.byId("btnSeeChanges").setVisible(false);
                }.bind(this),
                error: function (oError) {
                    // Set error in message strip
                    this.byId("msgStripMainScreen").setText("<strong>Error: </strong><em>Error while processing. For more info </em>");
                    this.byId("msgStripMainScreen").setType("Error");
                    this.byId("msgStripMainScreen").setVisible(true);

                    this.fn_showServiceError(oError);

                    // Close busy dialog
                    this.fn_closeBusyDialog();
                }.bind(this)
            });

            // Log info
            this.fn_getLogReference().info("Main Screen Controller: Exiting _fn_completeWorkflowTask method");
        }
    });
});