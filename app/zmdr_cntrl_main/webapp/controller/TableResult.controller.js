sap.ui.define([
    "com/intapptics/zmdrcntrlmain/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/ui/model/odata/v4/ODataModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/comp/filterbar/FilterBar",
    "sap/ui/comp/filterbar/FilterGroupItem",
    "sap/m/ViewSettingsDialog",
    "sap/m/ViewSettingsItem",
    "sap/ui/export/Spreadsheet",
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/Label",
    "sap/m/DatePicker",
    "sap/m/Input",
    "sap/m/ComboBox",
    "sap/ui/core/ListItem"
],
    function (BaseController, JSONModel, Fragment, ODataModel, Filter, FilterOperator, FilterBar, FilterGroupItem, ViewSettingsDialog, ViewSettingsItem, Spreadsheet, MessageToast, Dialog, Label, DatePicker, Input, ComboBox, ListItem) {
        "use strict";

        return BaseController.extend("com.intapptics.zmdrcntrlmain.controller.TableResult", {
            /**
             * Lifecycle Methods
             */

            /**
             * Called when the controller is instantiated and its view controls (if available) are already created.
             * Can be used to modify the view before it has been displayed, to bind event handlers and to do other one-time initialization
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableResult
             */
            onInit: function () {
                // Log information
                this.fn_getLogReference().info("Table Result Controller: Entering onInit method");

                /** Define Variables */
                var oTableResultViewModel; // Stores the view related settings in this model

                /** Method Implementation */
                //Instantiate view model with few default model parameters
                oTableResultViewModel = new JSONModel({
                    noDataText: this.fn_getResourceBundle().getText("tableResultNoDataText")
                });

                // Set the model locally to the view
                this.fn_setLocalModel(oTableResultViewModel, "tableResultViewModel");

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Local model 'tableResultViewModel' is set to view");

                // Attach routing pattern match function to be called
                this.fn_getRouter().getRoute("tableResult").attachPatternMatched(this._fn_onObjectMatched, this);

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Exiting onInit method");
            },

            /**
             * This hook method is invoked before the controller's view is re-rendered
             * (Not before the first rendering! onInit() is used for that one!)
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableResult
             */
            // onBeforeRendering: function() {
            //
            // },

            /**
             * Called when the view has been rendered (so its HTML is part of the document). Post rendering manipulations 
             * of the HTML could be done here. This hook is the same one that SAPUI5 controls get after being rendered.
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableResult
             */
            // onAfterRendering: function() {
            //
            // },

            /**
             * Called when the controller is destroyed. Use this one to free resources and finalize activities.
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableResult
             */
            // onExit: function() {
            //
            // },


            /**
            * Event Handlers
            */

            /**
             * Triggered by the resultset table's 'updateFinished' event: after new 
             * table data is available, this handler method updates the table counter.
             * This should only happen if the update was successful and the table is not empty, 
             * which is why this handler is only attached for one time after table data is received.
             * 
             * @param {sap.ui.base.Event} oEvent - The update finished event object
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableResult
             * @public
             * @returns {void}
             * 
             */
            onUpdateFinished_tblResultSet: function (oEvent) {
                // Log information
                this.fn_getLogReference().info("Table Result Controller: Entering onUpdateFinished_tblResultSet method");

                /** Define Variables */
                var sTitle, // Stores the title of the table
                    oTable = oEvent.getSource(), // Stores the table object
                    iTotalItems = oEvent.getParameter("total"); // Stores the total items count of the table

                /** Method Implementation */
                // Only update the counter if the length is final and the table is not empty
                if (iTotalItems && oTable.getBinding("items").isLengthFinal()) {
                    // Get the title of the table
                    sTitle = this.fn_getResourceBundle().getText("tableHeaderTextWithCount", [this.iRecordCount]);
                } else {
                    // Get the title of the table
                    sTitle = this.fn_getResourceBundle().getText("tableHeaderText");
                }

                // Set the title of the table
                this.fn_getLocalModel("tableResultViewModel").setProperty("/tableHeaderText", sTitle);

                // Close the busy dialog
                this.fn_closeBusyDialog();

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Exiting onUpdateFinished_tblResultSet method");
            },

            /**
             * Event Handler for the navigation action buttons of the page
             * 
             * @param {sap.ui.base.Event} oEvent - Button press event for any of the page navigation action buttons
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableResult
             * @public
             * @returns {void}
             * 
             */
            onPressNavActionBtns: function (oEvent) {
                // Log information
                this.fn_getLogReference().info("Table Result Controller: Entering onPressNavActionBtns method");

                /** Define Variables */
                var sBtnId = oEvent.getSource().getId(); // Stores the button id

                /** Method Implementation */
                // Check the button id and perform the action accordingly
                switch (sBtnId) {
                    case this.getView().createId("btnEnterFullScreenTabRslt"):
                        // Log information
                        this.fn_getLogReference().info("Table Result Controller: Enter Full Screen button pressed");

                        // Set the button visibility
                        this.byId("btnEnterFullScreenTabRslt").setVisible(false);
                        this.byId("btnExitFullScreenTabRslt").setVisible(true);

                        // Take reference of the Flexible Column Layout and set the end column to full screen
                        this.getView().getParent().getParent().setLayout("EndColumnFullScreen");

                        // Log information
                        this.fn_getLogReference().info("Table Result Controller: End column set to full screen along with buttons visibility");
                        break;

                    case this.getView().createId("btnExitFullScreenTabRslt"):
                        // Log information
                        this.fn_getLogReference().info("Table Result Controller: Exit Full Screen button pressed");

                        // Set the button visibility
                        this.byId("btnEnterFullScreenTabRslt").setVisible(true);
                        this.byId("btnExitFullScreenTabRslt").setVisible(false);

                        // Take reference of the Flexible Column Layout and restore to three-column layout
                        this.getView().getParent().getParent().setLayout("ThreeColumnsEndExpanded");

                        // Log information
                        this.fn_getLogReference().info("Table Result Controller: Three column layout restored along with buttons visibility");
                        break;

                    case this.getView().createId("btnClosePageTabRslt"):
                        // Log information
                        this.fn_getLogReference().info("Table Result Controller: Close Page button pressed");

                        // Navigate to category list page
                        this.fn_getRouter().navTo("category");
                        break;
                }

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Exiting onPressNavActionBtns method");
            },

            /**
             * Event handler for pagination buttons (First, Prev, Next, Last), input field and page size change
             * 
             * @param {sap.ui.base.Event} oEvent - Pagination toolbar event object
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableResult
             * @public
             * @returns {void}
             */
            onPaginationAction: function (oEvent) {
                // Log information
                this.fn_getLogReference().info("Table Result Controller: Entering onPaginationAction method");

                /** Define Variables */
                var iCurrPageNum, // Stores the current page number of the pagination section
                    iMaxPageNum,// Stores the maximum page number of the pagination section
                    iNum, // Stores the number of records to be displayed in the table or read from backend
                    iSkip, // Stores the number of records to be skipped from the table or backend
                    aFilters = []; // Stores the filters to be applied to the table

                /** Method Implementation */
                // Open the busy dialog
                this.fn_openBusyDialog();

                // Remove any data selected of the table
                this.byId("tblResultSet").removeSelections();

                // Set the default text in the message strip
                this.byId("msgStripTableResult").setText("<strong>Information:</strong><em> Select entry to MODIFY or CREATE entry directly");
                this.byId("msgStripTableResult").setType("Information");

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Message strip text set to default");

                // Calculation of current and maximum page number
                switch (oEvent.getSource().getId()) {
                    case this.getView().createId("inpPageNum"):
                        // Log information
                        this.fn_getLogReference().info("Table Result Controller: Page Number input field changed");

                        // Get the current page number value from the input field
                        iCurrPageNum = parseInt(oEvent.getSource().getValue(), 10);

                        // Check if the current page number is valid
                        if (isNaN(iCurrPageNum)) {
                            iCurrPageNum = 1;
                        }

                        // Get the max page number
                        iMaxPageNum = parseInt(this.byId("lblMaxPageNum").getText().substr(1), 10);

                        break;
                    case this.getView().createId("cbxPageSize"):
                        // Log information
                        this.fn_getLogReference().info("Table Result Controller: Page Size selection changed. Current Page Size - " + oEvent.getSource().getValue()); //getSelectedKey();

                        // Get the page size value set by the end user
                        this.iPageSize = parseInt(oEvent.getSource().getValue(), 10);

                        // Calculate the max page number
                        if (this.iRecordCount / this.iPageSize > Math.round(this.iRecordCount / this.iPageSize)) {
                            iMaxPageNum = Math.round(this.iRecordCount / this.iPageSize) + 1;
                        } else {
                            iMaxPageNum = Math.round(this.iRecordCount / this.iPageSize);
                        }

                        // Set the maximum page number to the label4
                        this.byId("lblMaxPageNum").setText("/" + iMaxPageNum);

                        // Set the current page number to 1
                        iCurrPageNum = 1;

                        break;
                    case this.getView().createId("btnFirstPage"):
                        // Log information
                        this.fn_getLogReference().info("Table Result Controller: First Page button pressed");

                        // Set the current page number to 1
                        iCurrPageNum = 1;

                        // Get Max page number
                        iMaxPageNum = parseInt(this.byId("lblMaxPageNum").getText().substr(1), 10);

                        break;
                    case this.getView().createId("btnPrevPage"):
                        // Log information
                        this.fn_getLogReference().info("Table Result Controller: Previous Page button pressed");

                        // Set the current page number to 1 less than the current page number
                        iCurrPageNum = parseInt(this.byId("inpPageNum").getValue(), 10) - 1;

                        // Get Max page number
                        iMaxPageNum = parseInt(this.byId("lblMaxPageNum").getText().substr(1), 10);

                        break;
                    case this.getView().createId("btnNextPage"):
                        // Log information
                        this.fn_getLogReference().info("Table Result Controller: Next Page button pressed");

                        // Set the current page number to 1 more than the current page number
                        iCurrPageNum = parseInt(this.byId("inpPageNum").getValue(), 10) + 1;

                        // Get Max page number
                        iMaxPageNum = parseInt(this.byId("lblMaxPageNum").getText().substr(1), 10);

                        break;
                    case this.getView().createId("btnLastPage"):
                        // Log information
                        this.fn_getLogReference().info("Table Result Controller: Last Page button pressed");

                        // Get Max page number
                        iMaxPageNum = parseInt(this.byId("lblMaxPageNum").getText().substr(1), 10);

                        // Set the current page number to the maximum page number
                        iCurrPageNum = iMaxPageNum;

                        break;
                }

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Current Page Number - " + iCurrPageNum + ", Maximum Page Number - " + iMaxPageNum);

                // Set the value of the current page to the input field
                this.byId("inpPageNum").setValue(iCurrPageNum);

                // Set buttons enabled/disabled based on the page number
                if (iCurrPageNum === iMaxPageNum) {
                    this.byId("btnNextPage").setEnabled(false);
                    this.byId("btnLastPage").setEnabled(false);
                } else {
                    this.byId("btnNextPage").setEnabled(true);
                    this.byId("btnLastPage").setEnabled(true);
                }

                if (iCurrPageNum === 1 || iCurrPageNum === 0) {
                    this.byId("btnFirstPage").setEnabled(false);
                    this.byId("btnPrevPage").setEnabled(false);
                } else {
                    this.byId("btnFirstPage").setEnabled(true);
                    this.byId("btnPrevPage").setEnabled(true);
                }

                // Calculate the number of records to be displayed in the table
                if (iCurrPageNum === 0) {
                    iSkip = 0;
                } else {
                    iSkip = (iCurrPageNum - 1) * this.iPageSize;
                }

                if (iCurrPageNum === iMaxPageNum) {
                    iNum = this.iRecordCount - iSkip;
                } else {
                    iNum = this.iPageSize;
                }

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Number of records to be displayed - " + iNum + ", Number of records to be skipped - " + iSkip);

                // Create the filter for the table along with search parameters
                if (this.aSearchParameters === undefined || this.aSearchParameters.length === 0) {
                    // Log information
                    this.fn_getLogReference().info("Table Result Controller: No search parameter is present");
                } else {
                    this.aSearchParameters.forEach(function (oSearchParam) {
                        aFilters.push(new Filter(oSearchParam.sPath, oSearchParam.sFilter, oSearchParam.sValue));
                    })
                }

                // Add version active filter
                aFilters.push(new Filter("VERSION_ACTIVE", FilterOperator.EQ, "Y"));

                // [V4 MIGRATION] Replaced V2 oModel.read() with native OData V4 bindList().requestContexts().
                // this.sEntitySet is a plain EntitySet path (e.g. "/ZMDR_GLACCOUNT").
                // $skip and $top are passed as the skip/top arguments of requestContexts().
                // The V2-only async:true is removed. Success/error preserved via .then()/.catch().
                this.oTableModel.bindList(this.sEntitySet, null, null, aFilters).requestContexts(iSkip, iNum).then(function (aContexts) {
                    // Map V4 contexts to plain JS objects for the JSONModel
                    var aData = aContexts.map(function (oContext) { return oContext.getObject(); });

                    // Set the data into the existing model
                    this.fn_getGlobalModel("oCurrentTableBoundModel").setData(aData);

                    // Close busy dialog
                    this.fn_closeBusyDialog();
                }.bind(this)).catch(function (oError) {
                    // Show error
                    this.fn_showServiceError(oError);
                }.bind(this));

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Exiting onPaginationAction method");
            },

            /**
             * Event handler for the filter bar search button
             * 
             * @param {sap.ui.base.Event} oEvent - Filter bar search event object
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableResult
             * @public
             * @returns {void}
             */
            onSearch_fbFilters: function (oEvent) {
                // Log information
                this.fn_getLogReference().info("Table Result Controller: Entering onSearch_fbFilters method");

                if (!this.oTableModel) {
                    return;
                }


                /** Define Variables */
                var oViewTableResultModel = this.fn_getLocalModel("tableResultViewModel"), // Stores the view model
                    aItems, // Stores the filter items of the filter bar
                    aFields = this.fn_getGlobalModel("oFieldsDataModel").getData(), // Field details of the user selected table
                    aSearchFields = [], // Stores the search fields of the user selected table
                    oControl, // Stores the control details of the search field
                    sIdInpSrchFld, // Stores the id of the search field
                    sTemp, // Stores the temporary value
                    sValue, // Stores the value of the search field
                    sFilter, // Stores the filter operator
                    oSearchParam, // Stores the search parameter object
                    aFilters = []; // Stores the filters to be applied to the table

                /** Method Implementation */
                // Reset the search parameters to null if already present
                this.aSearchParameters = [];

                // Disable amend and close buttons
                this.byId("btnAmend").setVisible(false);
                this.byId("btnReopen").setVisible(false);
                this.byId("btnClose").setVisible(false);

                // Disable the item details section below result set
                this.byId("sconForm").setVisible(false);

                // Set the default text in the message strip
                this.byId("msgStripTableResult").setText("<strong>Information:</strong><em> Select entry to MODIFY or CREATE entry directly");
                this.byId("msgStripTableResult").setType("Information");

                // Open the busy dialog
                this.fn_openBusyDialog();

                // Read the items of the filter bar
                aItems = oEvent.getSource().getAllFilterItems();

                // Filter the searchfields from complete fields data
                aSearchFields = aFields.filter(function (oField) {
                    return oField.searchfieldflag === "Y";
                });

                // Loop into search fields and prepare the filter
                aSearchFields.forEach(function (oSearchField) {
                    // Initiate/ Reset the variable with the fixed part of the search field id
                    sIdInpSrchFld = "inpSrchFld";

                    // Prepare the search field id using regex in camel case format
                    sTemp = oSearchField.columnname.replace(/./g, function (word, index) {
                        if (index === 0) {
                            return word.toUpperCase();
                        } else if (oSearchField.columnname.slice(index - 1, index) === "_") {
                            return word.toUpperCase();
                        } else {
                            return word.toLowerCase();
                        }
                    }).replace(/_+/g, "");

                    // Create the search field id
                    sIdInpSrchFld = sIdInpSrchFld.concat(sTemp);

                    // Get the data of the search field from the filter bar
                    aItems.forEach(function (oItem) {
                        // Get the control of the search field
                        oControl = oEvent.getSource().determineControlByFilterItem(oItem);

                        if (oControl) {
                            if (oControl.getId().includes(sIdInpSrchFld)) {
                                sValue = oControl.getValue();
                            }
                        }
                    });

                    // Set the filter operator
                    if (oSearchField.columndatatype.indexOf("CHAR") === -1) {
                        sFilter = FilterOperator.Contains;
                    } else {
                        sFilter = FilterOperator.EQ;
                    }

                    // Check if the value is not empty
                    if (sValue && sValue !== "") {
                        if (sValue.indexOf("*") !== -1 && oSearchField.columndatatype.indexOf("CHAR") === -1) {
                            MessageToast.show("Cannot do a fuzzy search for this field. Please enter a valid value for search");
                        } else {
                            oSearchParam = {
                                sSrchFldId: sIdInpSrchFld,
                                sPath: oSearchField.columnname,
                                sFilter: sFilter,
                                sValue: sValue
                            };
                        }

                        // Push the search parameter into the array
                        this.aSearchParameters.push(oSearchParam);
                    } else {
                        // Log information
                        this.fn_getLogReference().info("Table Result Controller: Search field value is empty");
                    }
                }, this);

                // Change the no data text of the table in case there are no results post search
                if (this.aSearchParameters && this.aSearchParameters.length !== 0) {
                    oViewTableResultModel.setProperty("/noDataText", this.fn_getResourceBundle().getText("tableResultNoDataTextAfterSearch"));
                } else {
                    oViewTableResultModel.setProperty("/noDataText", this.fn_getResourceBundle().getText("tableResultNoDataText"));
                }

                // Remove table selection if any
                this.byId("tblResultSet").removeSelections();

                // Read data from backend with new filter data
                this._fn_readTableData();

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Exiting onSearch_fbFilters method");
            },

            /**
             * Clear the search field values of the filter bar and bind initial data with table
             * 
             * @param {sap.ui.base.Event} oEvent
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableResult
             * @public
             * @returns {void} 
             */
            onReset_fbFilters: function (oEvent) {
                // Log information
                this.fn_getLogReference().info("Table Result Controller: Entering onReset_fbFilters method");

                /** Define Variables */
                var aItems, // Stores the filter items of the filter bar
                    oControl, // Stores the control details of the search field
                    aFields = this.fn_getGlobalModel("oFieldsDataModel").getData(); // Field details of the user selected table

                /** Method Implementation */
                // Open busy dialog
                this.fn_openBusyDialog();

                // Set the default text in the message strip
                this.byId("msgStripTableResult").setText("<strong>Information:</strong><em> Select entry to MODIFY or CREATE entry directly");
                this.byId("msgStripTableResult").setType("Information");

                // Read the items of the filter bar
                aItems = oEvent.getSource().getAllFilterItems();

                // Loop into search fields and clear the search field values if any
                aItems.forEach(function (oItem) {
                    // Get the control of the search field
                    oControl = oEvent.getSource().determineControlByFilterItem(oItem);

                    if (oControl) {
                        // Blank the search field data
                        oControl.setValue("");

                        // Reset the tooltip info
                        if (oControl.getId().includes("inpSrchFldStatus")) {
                            aFields.forEach(function (oField) {
                                if (oControl.getId().includes(oField.columnname)) {
                                    oControl.setTooltip("Select from dropdown");
                                } else {
                                    oControl.setTooltip("Enter search text");
                                }
                            });
                        }
                    }
                });

                // Reset the search parameters to null if already present
                this.aSearchParameters = [];

                // Disable amend and close buttons
                this.byId("btnAmend").setVisible(false);
                this.byId("btnReopen").setVisible(false);
                this.byId("btnClose").setVisible(false);

                // Remove selection of the table if any
                this.byId("tblResultSet").removeSelections();

                // Reset the page size to 10
                this.byId("cbxPageSize").setSelectedKey("10");

                // Read data from backend with no filter data
                this._fn_readTableData();

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Exiting onReset_fbFilters method");
            },

            /**
             * Change in the value of the filter control
             * 
             * @param {sap.ui.base.Event} oEvent Change event of the filter bar controls
             * 
             * @memberOf com.intapptics.zmdrcntrlmain.view.TableResult
             * @public
             * @returns {void}
             */
            onChange_fbFilters: function (oEvent) {
                // Log Information
                this.fn_getLogReference().info("Table Result Controller: Entering onChange_fbFilters method");

                /** Method Implementation */
                // Set the selected value in the tooltip of the control
                if (oEvent.getSource().getValue()) {
                    oEvent.getSource().setTooltip(oEvent.getSource().getValue());
                }

                // Log Information
                this.fn_getLogReference().info("Table Result Controller: Exiting onChange_fbFilters method");
            },

            /**
             * Open the sort settings dialog
             * 
             * @memberOf com.intapptics.zmdrcntrlmain.view.TableResult
             * @public
             * @returns {void}
             */
            onPress_btnSort: function () {
                // Log information
                this.fn_getLogReference().info("Table Result Controller: Entering onPress_btnSort method");

                /** Define Variables */
                var oFieldsModel = this.fn_getGlobalModel("oFieldsDataModel");
                if (!oFieldsModel) {
                    this.fn_getLogReference().error("Table Result Controller: Fields model is not available for sorting");
                    return;
                }
                var aFieldsData = oFieldsModel.getData(), // Stores the fields data
                    aResultSetCols = []; // Stores the columns of the result set table

                /** Method Implementation */
                // Filter with result set fields
                aResultSetCols = aFieldsData.filter(function (oField) {
                    return oField.resultsetfieldflag === "Y";
                });

                // Prepare the view settings dialog
                if (!this.oVSDSort) {
                    // Destroy the sort settings dialog if any
                    if (sap.ui.getCore().byId("vsdSort")) {
                        sap.ui.getCore().byId("vsdSort").destroy();
                    }

                    // Create new view settings dialog
                    this.oVSDSort = new ViewSettingsDialog({
                        id: "vsdSort",
                        confirm: this.onConfirm_vsdSort.bind(this)
                    });

                    // Add the sort items in the dialog
                    aResultSetCols.forEach(function (oResultSetcol, index) {
                        if (index === 0) {
                            this.oVSDSort.addSortItem(new ViewSettingsItem({
                                text: oResultSetcol.columnlabel,
                                key: oResultSetcol.columnname,
                                selected: true
                            }));
                        } else {
                            this.oVSDSort.addSortItem(new ViewSettingsItem({
                                text: oResultSetcol.columnlabel,
                                key: oResultSetcol.columnname
                            }));
                        }
                    }, this);

                    // Add the dialog to the view as dependent
                    this.getView().addDependent(this.oVSDSort);
                }

                // Open the view settings dialog
                this.oVSDSort.open();

                // Log Information
                this.fn_getLogReference().info("Table Result Controller: Exiting onPress_btnSort method");
            },

            /**
             * Sort data based on user input
             * 
             * @param {sap.ui.base.Event} oEvent Confirm event of the VSD
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableResult
             * @public
             * @returns {void}
             */
            onConfirm_vsdSort: function (oEvent) {
                // Log information
                this.fn_getLogReference().info("Table Result Controller: Entering onConfirm_vsdSort method")

                /** Define Variables */
                var oTable = this.byId("tblResultSet"), // Result set table reference
                    mParams = oEvent.getParameters(), // Sort related information
                    oBinding = oTable.getBinding("items"), // Current table binding
                    aSorters = [], // Array with sort information
                    sPath = mParams.sortItem.getKey(), // Path to sort data
                    bDescending = mParams.sortDescending; // Sort order indicator

                /** Method implementation */
                // Add the sort information to the array
                aSorters.push(new sap.ui.model.Sorter(sPath, bDescending));

                // Sort the table binding
                oBinding.sort(aSorters);

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Exiting onConfirm_vsdSort method")
            },

            /**
             * Export result set table data into excel
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableResult
             * @public
             * @returns {void}
             */
            onPress_btnExport: function () {
                // Log information
                this.fn_getLogReference().info("Table Result Controller: Entering onConfirm_vsdSort method")

                /** Define variables */
                var oFieldsModel = this.fn_getGlobalModel("oFieldsDataModel");
                if (!oFieldsModel) {
                    this.fn_getLogReference().error("Table Result Controller: Fields model is not available for export");
                    return;
                }
                var aFieldData = oFieldsModel.getData(), // Stores fields information
                    aResultSetCols = [], // Stores result set table columns
                    aExportSheetCols = [], // Stores export sheet columns
                    oSettings, // JSON Object of export settings
                    oSheet, // Export sheet reference
                    sType, // Type of export columns
                    oDate = new Date(), // Date reference
                    sDate, // Stores date in string format yyyyMMdd
                    sTime, // Stores time in string format HHMMSS
                    sTableLabel = this.fn_getGlobalModel("oUniqueTablesModel").getData()[this.sTableId].tableName; // Stores extraction table label

                /** Method Implementation */
                // Get current date in yyyyMMdd format
                sDate = oDate.getFullYear().toString() // yyyy
                    + (oDate.getMonth() + 1 < 10 ? "0" + (oDate.getMonth() + 1) : (oDate.getMonth() + 1)).toString() // MM
                    + (oDate.getDate() < 10 ? "0" + oDate.getDate() : oDate.getDate()).toString(); // dd

                // Get current time in HHMMSS format
                sTime = (oDate.getHours() < 10 ? "0" + oDate.getHours() : oDate.getHours()).toString() // HH
                    + (oDate.getMinutes() < 10 ? "0" + oDate.getMinutes() : oDate.getMinutes()).toString() // MM
                    + (oDate.getSeconds() < 10 ? "0" + oDate.getSeconds() : oDate.getSeconds()).toString(); // SS

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Export Date - " + sDate + ", Export Time - " + sTime);

                // Filter the total fields with only table result set fields
                aResultSetCols = aFieldData.filter(function (oFieldData) {
                    return oFieldData.resultsetfieldflag === "Y";
                });

                // Prepare the export sheet columns
                aResultSetCols.forEach(function (oResultSetCol) {
                    if ((oResultSetCol.columndatatype || "").toUpperCase().includes("INT")) {
                        sType = sap.ui.export.EdmType.Number;
                    } else if ((oResultSetCol.columndatatype || "").toUpperCase().includes("DATS")) {
                        sType = sap.ui.export.EdmType.Date;
                    } else {
                        sType = sap.ui.export.EdmType.String;
                    }

                    aExportSheetCols.push({
                        label: oResultSetCol.columnlabel,
                        property: oResultSetCol.columnname,
                        type: sType,
                        wrap: true
                    });
                });

                // Prepare settings of the excel sheet
                oSettings = {
                    workbook: {
                        columns: aExportSheetCols,
                        context: {
                            title: sTableLabel + " data exported from masterdata app",
                            sheetname: sTableLabel + " Data"
                        }
                    },
                    dataSource: {
                        type: "odata",
                        dataUrl: this.sDataUrl,
                        serviceUrl: this.sServiceUrl,
                        headers: this.oTableModel.getHeaders(),
                        count: this.iRecordCount,
                        useBatch: true
                    },
                    fileName: "Export_" + sTableLabel + "_" + sDate + "_" + sTime
                };

                // Create reference of the excel sheet
                oSheet = new Spreadsheet(oSettings);

                // Destroy the sheet reference once the data is exported
                oSheet.build().finally(function () {
                    oSheet.destroy();

                    // Log information
                    this.fn_getLogReference().info("Table Result Controller: Data exported to excel successfully");
                });

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Exiting onConfirm_vsdSort method")
            },

            /**
             * Event handler for table data selection
             * 
             * @param {sap.ui.base.Event} oEvent Table row selection change event
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableResult
             * @public
             * @returns {void}
             */
            onSelectionchange_tblResultSet: function (oEvent) {
                // Log information
                this.fn_getLogReference().info("Table Result Controller: Entering onSelectionchange_tblResultSet method");

                /** Define Variables */
                var sSelectedPath = oEvent.getSource().getSelectedItem().getBindingContextPath(), // Stores the selected path of the table row
                    aFieldsData = this.fn_getGlobalModel("oFieldsDataModel").getData(), // Stores the fields data
                    oInProgressData, // Stores if any inprogress record exists of the selected row
                    aPrimaryKeys, // Stores the primary keys of the table
                    aItemDetails, // Stores the item details fields of the table
                    ofrmItemDetails = this.byId("sfrmItemDetails"), // Stores the item details form object reference
                    aFilters = []; // Stores the filters to be applied to the table

                /** Method Implementation */
                // Check if any record is selected
                if (sSelectedPath !== -1) {
                    // Open the busy dialog
                    this.fn_openBusyDialog();

                    // Set the selected table data globally
                    this.oSelectedTableData = this.fn_getGlobalModel("oCurrentTableBoundModel").getProperty(sSelectedPath);

                    // Get the primary key details of the table
                    aPrimaryKeys = aFieldsData.filter(function (oField) {
                        return oField.primarykeyflag === "Y";
                    });

                    // Prepare the filter to check any in-progress record
                    aPrimaryKeys.forEach(function (oPrimaryKey) {
                        var sColName = oPrimaryKey.columnname || oPrimaryKey.Columnname;
                        aFilters.push(new Filter(sColName, FilterOperator.EQ, this.oSelectedTableData[sColName]));
                    }, this);

                    aFilters.push(new Filter({
                        filters: [
                            new Filter("VERSION_ACTIVE", FilterOperator.EQ, "I"),
                            new Filter("VERSION_ACTIVE", FilterOperator.EQ, "G")
                        ],
                        and: false
                    }));

                    // [V4 MIGRATION] Replaced V2 oModel.read() with native OData V4 bindList().requestContexts().
                    // this.sEntitySet is a plain EntitySet. Filters for VERSION_ACTIVE = I or G check in-progress records.
                    // The V2-only async:true is removed. All success/error logic preserved via .then()/.catch().
                    this.oTableModel.bindList(this.sEntitySet, null, null, aFilters).requestContexts(0, Infinity).then(function (aContexts) {
                        // Map V4 contexts to plain JS objects for downstream logic
                        var aData = aContexts.map(function (oContext) { return oContext.getObject(); });

                        // Enable/Disable Amend/ReOpen/Close buttons based on the in-progress record
                        if (aData.length === 0) {
                            // Log information
                            this.fn_getLogReference().info("Table Result Controller: No in-progress record exists for the selected entry");

                            // Check status — seed data uses "ACT" for active/approved and "CLO" for closed
                            if (this.oSelectedTableData.STATUS === "ACT" || this.oSelectedTableData.STATUS === "Approved") {
                                // Enable Amend and close button
                                this.byId("btnAmend").setVisible(true);
                                this.byId("btnReopen").setVisible(false);
                                this.byId("btnClose").setVisible(true);

                                // Show below information in the message strip area
                                this.byId("msgStripTableResult").setText("<strong>Success:</strong><em> Record is valid for modification </em>");
                                this.byId("msgStripTableResult").setType("Success");
                            } else if (this.oSelectedTableData.STATUS === "CLO" || this.oSelectedTableData.STATUS === "Closed") {
                                // Enable Reopen button
                                this.byId("btnAmend").setVisible(false);
                                this.byId("btnReopen").setVisible(true);
                                this.byId("btnClose").setVisible(false);

                                // Show below information in the message strip area
                                this.byId("msgStripTableResult").setText("<strong>Success:</strong><em> Record is valid for modification </em>");
                                this.byId("msgStripTableResult").setType("Success");
                            } else {
                                // Show below information in the message strip area
                                this.byId("msgStripTableResult").setText("<strong>Error:</strong><em> Record status is invalid for modification </em>");
                                this.byId("msgStripTableResult").setType("Error");
                            }

                            // Disable the workflow link in message area
                            this.byId("lnkWorkflowId").setVisible(false);
                        } else {
                            oInProgressData = aData[0];
                            // Log information
                            this.fn_getLogReference().info("Table Result Controller: In-progress record exists for the selected entry. Workflow id - " + oInProgressData.WORKFLOW_ID);

                            // Disable the amend, re-open and close buttons
                            this.byId("btnAmend").setVisible(false);
                            this.byId("btnReopen").setVisible(false);
                            this.byId("btnClose").setVisible(false);

                            // Show below information in the message strip area
                            this.byId("msgStripTableResult").setText("<strong>Warning: </strong><em> Workflow <strong>" + oInProgressData.WORKFLOW_ID +
                                "</strong> is in progress for the selected entry. For more information of the in progress workflow </em>");

                            this.byId("msgStripTableResult").setType("Warning");

                            // Enable the link
                            this.byId("lnkWorkflowId").setVisible(true);
                        }

                        // Close the busy dialog
                        this.fn_closeBusyDialog();
                    }.bind(this)).catch(function (oError) {
                        // Show error
                        this.fn_showServiceError(oError);
                    }.bind(this));

                    // Drop all contents of the item details form
                    ofrmItemDetails.removeAllContent();

                    // Get the item details fields of the table
                    aItemDetails = aFieldsData.filter(function (oField) {
                        return oField.itemdetailsflag === "Y";
                    });

                    // Add the selected row details into the form
                    aItemDetails.forEach(function (oItemDetail) {
                        // Add label
                        ofrmItemDetails.addContent(new Label({
                            text: oItemDetail.columnlabel,
                            tooltip: oItemDetail.columnlabel
                        }));

                        // Add field
                        if (oItemDetail.columndatatype.includes("DATS")) {
                            ofrmItemDetails.addContent(new DatePicker({
                                displayFormat: "dd.MM.yyyy",
                                valueFormat: "yyyy-MM-dd",
                                value: this.oSelectedTableData[oItemDetail.columnname].toJSON().slice(0, 10),
                                tooltip: this.oSelectedTableData[oItemDetail.columnname],
                                editable: false,
                                width: "25rem"
                            }));
                        } else {
                            ofrmItemDetails.addContent(new Input({
                                value: this.oSelectedTableData[oItemDetail.columnname],
                                tooltip: this.oSelectedTableData[oItemDetail.columnname],
                                editable: false,
                                width: "25rem"
                            }));
                        }
                    }, this);

                    // Change focus to the item details form and make the container visible
                    if (aItemDetails) {
                        this.byId("sconForm").setVisible(true);

                        ofrmItemDetails.addEventDelegate({
                            onAfterRendering: jQuery.proxy(function (oEvent) {
                                this.byId('sconForm').getDomRef().scrollIntoView();
                            }, this)
                        });
                    } else {
                        this.byId("sconForm").setVisible(false);
                    }
                }

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Exiting onSelectionchange_tblResultSet method");
            },

            /**
             * Event handler for the workflow id link press
             * 
             * @param {sap.ui.base.Event} oEvent Press event of the workflow id link in the message strip
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableResult
             * @public
             * @returns {void}
             */
            onPress_lnkWorkflowId: function (oEvent) {
                // Log information
                this.fn_getLogReference().info("Table Result Controller: Entering onPress_lnkWorkflowId method");

                /** Define Variables */
                var sWorkflowId, // Stores the workflow id that has been pressed
                    oNavServiceToWorkflowAudit, // Stores reference of navigation service
                    oAppState, // Stores the application state
                    oStateToSave, // Stores parameters before navigating
                    oHashChanger, // Stores the hash changer instance
                    sCurrentHash, // Stores the current hash
                    sNewHash, // Stores the new hash
                    aAppStateKeys; // Stores the current application state key

                /** Method Implementation */
                // Read the workflow id based on source
                if (oEvent.getSource().getParent().getId().includes("msgStripTableResult")) {
                    sWorkflowId = oEvent.getSource().getParent().getText().split("<strong>")[2].split("</strong>")[0];
                } else {
                    sWorkflowId = oEvent.getSource().getText();
                }

                // Set the values to be stored before navigating
                oStateToSave = {
                    asearchParameters: this.aSearchParameters,
                    sPageNumber: this.byId("inpPageNum").getValue(),
                    sPageSizeKey: this.byId("cbxPageSize").getSelectedKey(),
                    aCntrlUiConfigData: this.fn_getGlobalModel("oFieldsDataModel").getData(),
                    aUniqueRepositoriesData: this.fn_getGlobalModel("oUniqueRepositoriesModel").getData(),
                    aUniqueTablesData: this.fn_getGlobalModel("oUniqueTablesModel").getData()
                };

                // Get reference of the cross app navigation service
                oNavServiceToWorkflowAudit = sap.ushell.Container.getService("CrossApplicationNavigation");

                // Create an application state
                oAppState = oNavServiceToWorkflowAudit.createEmptyAppState(this.getOwnerComponent());

                // Set the parameters into the app state
                oAppState.setData(oStateToSave);

                // Save the data
                oAppState.save();

                // Get reference of the hash changer service
                oHashChanger = sap.ui.core.routing.HashChanger.getInstance();

                // Get the current hash
                sCurrentHash = oHashChanger.getHash();

                // Check if any app state is already present in the current hash using regex
                aAppStateKeys = /(?:sap-iapp-state=)([^&=]+)/.exec(sCurrentHash);

                if (aAppStateKeys) {
                    // Split the current hash and remove the current app state
                    sCurrentHash = sCurrentHash.split("?")[0];
                }

                // Prepare the new hash by adding the new app state
                sNewHash = sCurrentHash + "?sap-iapp-state=" + oAppState.getKey();

                // Replace hash
                oHashChanger.replaceHash(sNewHash);

                /** eslint-disable sap-cross-application-navigation */
                // Navigate to the child app
                oNavServiceToWorkflowAudit.toExternal({
                    target: {
                        semanticObject: "",
                        action: "display"
                    },
                    params: {
                        workflow_id: sWorkflowId
                    }
                });
                /** eslint-enable sap-cross-application-navigation */

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Exiting onPress_lnkWorkflowId method");
            },

            /**
             * Press event of any action button like Create, Amend, Re-Open or Close
             * 
             * @param {sap.ui.base.Event} oEvent
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableResult
             * @public
             * @returns {void}
             */
            onPress_actionButtons: function (oEvent) {
                // Log information
                this.fn_getLogReference().info("Table Result Controller: Entering onPress_actionButtons method");

                /** Define variables */
                var sBtnText = oEvent.getSource().getText(), // Stores text of the pressed button
                    oNavServiceToCommonApp,// Stores reference of navigation service
                    oAppState, // Stores the application state
                    oStateToSave, // Stores parameters before navigating
                    oHashChanger, // Stores the hash changer instance
                    sCurrentHash, // Stores the current hash
                    sNewHash, // Stores the new hash
                    aAppStateKeys; // Stores the current application state key

                /** Method Implementation */
                // Clear all messages of message manager
                sap.ui.getCore().getMessageManager().removeAllMessages();

                oStateToSave = {
                    aSearchParameters: this.aSearchParameters,
                    sPageNumber: this.byId("inpPageNum").getValue(),
                    sPageSizeKey: this.byId("cbxPageSize").getSelectedKey(),
                    aCntrlUiConfigData: this.fn_getGlobalModel("oFieldsDataModel").getData(),
                    aUniqueRepositoriesData: this.fn_getGlobalModel("oUniqueRepositoriesModel").getData(),
                    aUniqueTablesData: this.fn_getGlobalModel("oUniqueTablesModel").getData(),
                    sRepositoryId: this.sRepositoryId,
                    sTableId: this.sTableId,
                    oSelectedTableData: this.oSelectedTableData,
                    sTableServiceUrl: this.sServiceUrl,
                    sTableEntitySet: this.sEntitySet,
                    sBusyDialogId: this.getOwnerComponent()._oGlobalBusyDialog.getId()
                };

                // Get reference of the cross app navigation service
                if (sap.ushell && sap.ushell.Container) {
                    oNavServiceToCommonApp = sap.ushell.Container.getService("CrossApplicationNavigation");

                    // Create an application state
                    oAppState = oNavServiceToCommonApp.createEmptyAppState(this.getOwnerComponent());

                    // Set the parameters into the app state
                    oAppState.setData(oStateToSave);

                    // Save the data
                    oAppState.save();

                    // Get reference of the hash changer service
                    oHashChanger = sap.ui.core.routing.HashChanger.getInstance();

                    // Get the current hash
                    sCurrentHash = oHashChanger.getHash();

                    // Check if any app state is already present in the current hash using regex
                    aAppStateKeys = /(?:sap-iapp-state=)([^&=]+)/.exec(sCurrentHash);

                    if (aAppStateKeys) {
                        // Split the current hash and remove the current app state
                        sCurrentHash = sCurrentHash.split("?")[0];
                    }

                    // Prepare the new hash by adding the new app state
                    sNewHash = sCurrentHash + "?sap-iapp-state=" + oAppState.getKey();

                    // Replace hash
                    oHashChanger.replaceHash(sNewHash);

                    /** eslint-disable sap-cross-application-navigation */
                    // Navigate to the child app
                    oNavServiceToCommonApp.toExternal({
                        target: {
                            semanticObject: "zmdr_central_cmn",
                            action: "manage"
                        },
                        params: {
                            sActionedBy: "Requestor",
                            sActionType: sBtnText
                        },
                        appStateKey: oAppState.getKey()
                    });
                    /** eslint-enable sap-cross-application-navigation */
                } else {
                    // Running in standalone mode without Fiori Launchpad
                    this.fn_getLogReference().error("Cross application navigation is not supported in standalone mode");
                    sap.m.MessageToast.show("Navigation to common app requires Fiori Launchpad");
                }

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Exiting onPress_actionButtons method");
            },


            /**
            * Internal methods
            */

            /**
             * Binds view to the object path
             * 
             * @param {sap.ui.base.Event} oEvent pattern match event for the current object page
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableResult
             * @private
             * @returns {void}
             */
            _fn_onObjectMatched: function (oEvent) {
                // Log information
                this.fn_getLogReference().info("Table Result Controller: Entering _fn_onObjectMatched method");

                this.getView().getParent().getParent().setLayout("EndColumnFullScreen");

                /** Define Variables */
                var oSelectedTableData, // Stores the selected table information
                    aFieldsData = [], // Stores all fields of the selected table
                    oViewTableResultModel = this.fn_getLocalModel("tableResultViewModel"), // Stores reference of the local view model
                    aCntrlUiConfigData, // Stores complete table configuration
                    oCompleteFieldsModel = new JSONModel(), // Stores fields inforamtion in json
                    sHash, // Stores the hash value
                    aAppStateKeys, // Stores app state keys in array
                    sAppStateKey; // Stores app state key

                /** Method Implementation */
                // Set visibility of the navigation bar buttons
                this.byId("btnEnterFullScreenTabRslt").setVisible(false);
                this.byId("btnExitFullScreenTabRslt").setVisible(true);
                this.byId("btnClosePageTabRslt").setVisible(true);

                // Disable all the pagiantion buttons of the table at first
                this.byId("btnFirstPage").setEnabled(false);
                this.byId("btnPrevPage").setEnabled(false);
                this.byId("btnNextPage").setEnabled(false);
                this.byId("btnLastPage").setEnabled(false);

                // Disable action buttons at the begining
                this.byId("btnAmend").setVisible(false);
                this.byId("btnReopen").setVisible(false);
                this.byId("btnClose").setVisible(false);

                // Disable the item details container below result set
                this.byId("sconForm").setVisible(false);

                // Set the default text in the message strip
                this.byId("msgStripTableResult").setText("<strong>Information:</strong><em> Select entry to MODIFY or CREATE entry directly");
                this.byId("msgStripTableResult").setType("Information");

                // Read the current hash of the page
                sHash = sap.ui.core.routing.HashChanger.getInstance().getHash();

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Current Hash - " + sHash);

                // Check if the hash is empty
                if (sHash !== "" || sHash !== undefined) {
                    // Define the search array globally with empty value in it
                    this.aSearchParameters = [];

                    // Open busy dialog
                    this.fn_openBusyDialog();

                    // Reset the sort view settings
                    this.oVSDSort = undefined;

                    // Get the path of the selected repository
                    this.sRepositoryId = oEvent.getParameter("arguments").sCategoryPath;

                    // Get the path of the selected table
                    this.sTableId = oEvent.getParameter("arguments").sTablePath;

                    // Set the flag to true of new table selection
                    this.bNewSelectedTable = true;

                    // Read the value of the app state key
                    aAppStateKeys = /(?:sap-iapp-state=)([^&=]+)/.exec(sHash);

                    if (aAppStateKeys) {
                        // External Navigation
                        // Get the app state key
                        sAppStateKey = aAppStateKeys[1];

                        // Log information
                        this.fn_getLogReference().info("Table Result Controller: App State Key - " + sAppStateKey);

                        // Read data from the app state
                        sap.ushell.Container.getService("CrossApplicationNavigation").getAppState(this.getOwnerComponent(), sAppStateKey).done(function (oSavedAppState) {
                            // Check if app state was saved
                            if (oSavedAppState.getData()) {
                                // Read any preset search parameters
                                this.aSearchParameters = oSavedAppState.getData().asearchParameters;

                                // Set the page number
                                this.sPageNumber = oSavedAppState.getData().sPageNumber;

                                // Set the page size
                                this.byId("cbxPageSize").setSelectedKey(oSavedAppState.getData().sPageSizeKey);

                                // Get the configuration data
                                aCntrlUiConfigData = oSavedAppState.getData().aCntrlUiConfigData;

                                // Set the models
                                this.fn_setGlobalModel(new JSONModel(oSavedAppState.getData().aUniqueRepositoriesData), "oUniqueRepositoriesModel");
                                this.fn_setGlobalModel(new JSONModel(oSavedAppState.getData().aUniqueTablesData), "oUniqueTablesModel");

                                // Get selected table label
                                oSelectedTableData = oSavedAppState.getData().aUniqueTablesData[this.sTableId];

                                if (oSelectedTableData) {
                                    // Set the title of the page
                                    oViewTableResultModel.setProperty("/pageTitle", this.fn_getResourceBundle().getText("tableResultPageTitle", [oSelectedTableData.tableName]));
                                    oViewTableResultModel.setProperty("/tableTooltip", this.fn_getResourceBundle().getText("tableResultPageTitle", [oSelectedTableData.tableName]));
                                    // Fetch the field configuration data based on the selected table directly from backend
                                    // [V4 MIGRATION] Replaced V2 oModel.read() with native OData V4 bindList().requestContexts().
                                    // /CntrlUIConfig is a @readonly EntitySet (central-service.cds line 14). bindList() is correct.
                                    // Filter on tablename is preserved. All downstream logic is unchanged.
                                    var that = this;
                                    var aConfigFilters = [new sap.ui.model.Filter("tablename", sap.ui.model.FilterOperator.EQ, oSelectedTableData.tableId)];
                                    this.fn_getGlobalModel().bindList("/CntrlUIConfig", null, null, aConfigFilters).requestContexts(0, Infinity).then(function (aContexts) {
                                        var aFieldsData = aContexts.map(function (oCtx) { return oCtx.getObject(); });
                                        if (aFieldsData.length !== 0) {
                                            aFieldsData.sort(function (a, b) {
                                                var aSeq = a.columnseqno !== undefined ? a.columnseqno : a.Columnseqno;
                                                var bSeq = b.columnseqno !== undefined ? b.columnseqno : b.Columnseqno;
                                                return aSeq - bSeq;
                                            });
                                            oCompleteFieldsModel.setData(aFieldsData);
                                            if (!that.fn_getGlobalModel("oFieldsDataModel")) {
                                                that.fn_setGlobalModel(oCompleteFieldsModel, "oFieldsDataModel");
                                            } else {
                                                that.fn_getGlobalModel("oFieldsDataModel").setData(aFieldsData);
                                            }
                                            that._fn_populateSearchForm(aFieldsData);
                                            that._fn_readTableUrl();
                                        } else {
                                            that.fn_getLogReference().error("Table Result Controller: Table configuration not maintained properly at the backend");
                                            that.fn_closeBusyDialog();
                                        }
                                    }).catch(function (err) {
                                        that.fn_getLogReference().error("Table Result Controller: Backend error reading CntrlUIConfig");
                                        that.fn_closeBusyDialog();
                                    });
                                } else {
                                    // Show error message in console
                                    this.fn_getLogReference().error("Table Result Controller: Unable to read selected table info from navigation");

                                    // Close the busy dialog
                                    this.fn_closeBusyDialog();
                                }
                            } else {
                                // Close the busy dialog
                                this.fn_closeBusyDialog();

                                // Clear the table selection
                                this.sTableId = undefined;

                                // Navigate to the home page
                                this.fn_getRouter().navTo("category");
                            }
                        }.bind(this));
                    } else if (this.fn_getGlobalModel("oCntrlUiConfigDataModel") && this.fn_getGlobalModel("oUniqueTablesModel")) {
                        // Internal navigation
                        /** Check if the table configuration data is already present because this holds the information of the selected table
                         *  incase of internal navigation. If not present then navigate to the home page.
                         */
                        // Get the configuration data
                        aCntrlUiConfigData = this.fn_getGlobalModel("oCntrlUiConfigDataModel").getData();

                        // Get the selected table data
                        oSelectedTableData = this.fn_getGlobalModel("oUniqueTablesModel").getData()[this.sTableId];

                        // Null check of selected table data
                        if (oSelectedTableData) {
                            // Set the title of the page
                            oViewTableResultModel.setProperty("/pageTitle", this.fn_getResourceBundle().getText("tableResultPageTitle", [oSelectedTableData.tableName]));
                            oViewTableResultModel.setProperty("/tableTooltip", this.fn_getResourceBundle().getText("tableResultPageTitle", [oSelectedTableData.tableName]));
                            // Fetch the configuration data based on the selected table directly from backend
                            // [V4 MIGRATION] Replaced V2 oModel.read() with native OData V4 bindList().requestContexts().
                            // /CntrlUIConfig is a @readonly EntitySet (central-service.cds line 14). bindList() is correct.
                            // Filter on tablename is preserved. All downstream logic is unchanged.
                            var that = this;
                            var aConfigFilters = [new sap.ui.model.Filter("tablename", sap.ui.model.FilterOperator.EQ, oSelectedTableData.tableId)];
                            this.fn_getGlobalModel().bindList("/CntrlUIConfig", null, null, aConfigFilters).requestContexts(0, Infinity).then(function (aContexts) {
                                var aFieldsData = aContexts.map(function (oCtx) { return oCtx.getObject(); });
                                if (aFieldsData.length !== 0) {
                                    aFieldsData.sort(function (a, b) {
                                        var aSeq = a.columnseqno !== undefined ? a.columnseqno : a.Columnseqno;
                                        var bSeq = b.columnseqno !== undefined ? b.columnseqno : b.Columnseqno;
                                        return aSeq - bSeq;
                                    });
                                    oCompleteFieldsModel.setData(aFieldsData);
                                    if (!that.fn_getGlobalModel("oFieldsDataModel")) {
                                        that.fn_setGlobalModel(oCompleteFieldsModel, "oFieldsDataModel");
                                    } else {
                                        that.fn_getGlobalModel("oFieldsDataModel").setData(aFieldsData);
                                    }
                                    that._fn_populateSearchForm(aFieldsData);
                                    that._fn_readTableUrl();
                                } else {
                                    that.fn_getLogReference().error("Table Result Controller: Unable to read the field data of the selected table from the backend");
                                    that.fn_closeBusyDialog();
                                }
                            }).catch(function (err) {
                                that.fn_getLogReference().error("Table Result Controller: Backend error reading CntrlUIConfig");
                                that.fn_closeBusyDialog();
                            });
                        } else {
                            // oSelectedTableData is null — close busy dialog and go home
                            this.fn_closeBusyDialog();
                            this.sTableId = undefined;
                            this.fn_getRouter().navTo("category");
                        }
                    } else {
                        // Neither external nav state nor global models — close and navigate home
                        this.fn_closeBusyDialog();
                        this.sTableId = undefined;
                        this.fn_getRouter().navTo("category");
                    }
                }

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Exiting _fn_onObjectMatched method");
            },

            /**
             * Populate the table search area
             * 
             * @param {array} aFieldsData Fields data of the selected table
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableResult
             * @private
             * @returns {void}
             */
            _fn_populateSearchForm: function (aFieldsData) {
                // Log information
                this.fn_getLogReference().info("Table Result Controller: Entering _fn_populateSearchForm method");

                /** Define Variables */
                var aSearchFields, // Stores search fields info
                    sTemp, // Stores temporary data
                    sInpSrchFld, // Stores id of the search fields
                    oDynamicPage = this.byId("dpTableResult"); // Stores reference of the dynamic page

                /** Method Implementation */
                // Remove the filterbar from the dynamic page
                oDynamicPage.getHeader().destroyContent();

                // Add new filterbar in the page header
                oDynamicPage.getHeader().addContent(new FilterBar({
                    id: "fbFilters",
                    tooltip: "Filterbar",
                    useToolbar: false,
                    showFilterConfiguration: false,
                    showRestoreOnFB: true,
                    search: this.onSearch_fbFilters.bind(this),
                    reset: this.onReset_fbFilters.bind(this)
                }));

                // Get the search field details from the fields data
                aSearchFields = aFieldsData.filter(function (oField) {
                    return oField.searchfieldflag === "Y";
                });

                // Loop into search fields and add the search fields in the filter bar
                aSearchFields.forEach(function (oSearchField) {
                    // Initiate/Reset the variable with the fixed part of the field id
                    sInpSrchFld = "inpSrchFld";

                    // Prepare the column name in camel casing format with the help of regex
                    sTemp = oSearchField.columnname.replace(/./g, function (word, index) {
                        if (index === 0) {
                            return word.toUpperCase();
                        } else if (oSearchField.columnname.slice(index - 1, index) === "_") {
                            return word.toUpperCase();
                        } else {
                            return word.toLowerCase();
                        }
                    }).replace(/_+/g, "");

                    // Append the column name to the fixed part of the field id
                    sInpSrchFld = sInpSrchFld.concat(sTemp);

                    // If the search parameters are present then set the values in the search fields
                    if (this.aSearchParameters && this.aSearchParameters.length !== 0) {
                        if (this.aSearchParameters.filter(function (oSearchParam) {
                            return oSearchParam.sSrchFldId === sInpSrchFld;
                        }).length !== 0) {
                            if (oSearchField.columnname.toLowerCase().includes("status")) {
                                // Place the search field in the filter bar with dropdown option
                                oDynamicPage.getHeader().getContent()[0].addFilterGroupItem(new FilterGroupItem({
                                    groupName: "filters",
                                    name: oSearchField.columnname,
                                    label: oSearchField.columnlabel,
                                    partOfCurrentVariant: true,
                                    visibleInFilterBar: true,
                                    control: new ComboBox({
                                        id: sInpSrchFld,
                                        showSecondaryValues: true,
                                        filterSecondaryValues: true,
                                        placeholder: "Select from dropdown",
                                        tooltip: this.aSearchParameters.filter(function (oSearchParam) {
                                            return oSearchParam.sSrchFldId === sInpSrchFld;
                                        })[0].sValue,
                                        selectedKey: this.aSearchParameters.filter(function (oSearchParam) {
                                            return oSearchParam.sSrchFldId === sInpSrchFld;
                                        })[0].sValue,
                                        change: this.onChange_fbFilters.bind(this),
                                        enabled: true,
                                        items: [
                                            new ListItem({
                                                key: "510",
                                                text: "510",
                                                additionalText: "APPROVED"
                                            }),
                                            new ListItem({
                                                key: "590",
                                                text: "590",
                                                additionalText: "CLOSED"
                                            })
                                        ]
                                    })
                                }));
                            } else {
                                // Place the search field in the filter bar with input field and value present
                                oDynamicPage.getHeader().getContent()[0].addFilterGroupItem(new FilterGroupItem({
                                    groupName: "filters",
                                    name: oSearchField.columnname,
                                    label: oSearchField.columnlabel,
                                    partOfCurrentVariant: true,
                                    visibleInFilterBar: true,
                                    control: new Input({
                                        id: sInpSrchFld,
                                        type: "Text",
                                        placeholder: "Enter search text",
                                        value: this.aSearchParameters.filter(function (oSearchParam) {
                                            return oSearchParam.sSrchFldId === sInpSrchFld;
                                        })[0].sValue,
                                        placeholder: "Enter value",
                                        tooltip: this.aSearchParameters.filter(function (oSearchParam) {
                                            return oSearchParam.sSrchFldId === sInpSrchFld;
                                        })[0].sValue,
                                        liveChange: this.onChange_fbFilters.bind(this),
                                        enabled: true
                                    })
                                }));
                            }
                        } else if (oSearchField.columnname.toLowerCase().includes("status")) {
                            // Place the search field in the filter bar with dropdown option
                            oDynamicPage.getHeader().getContent()[0].addFilterGroupItem(new FilterGroupItem({
                                groupName: "filters",
                                name: oSearchField.columnname,
                                label: oSearchField.columnlabel,
                                partOfCurrentVariant: true,
                                visibleInFilterBar: true,
                                control: new ComboBox({
                                    id: sInpSrchFld,
                                    showSecondaryValues: true,
                                    filterSecondaryValues: true,
                                    placeholder: "Select from dropdown",
                                    tooltip: "Select from dropdown",
                                    change: this.onChange_fbFilters.bind(this),
                                    enabled: true,
                                    items: [
                                        new ListItem({
                                            key: "510",
                                            text: "510",
                                            additionalText: "APPROVED"
                                        }),
                                        new ListItem({
                                            key: "590",
                                            text: "590",
                                            additionalText: "CLOSED"
                                        })
                                    ]
                                })
                            }));
                        } else {
                            // Place the search field in the filter bar with empty input field
                            oDynamicPage.getHeader().getContent()[0].addFilterGroupItem(new FilterGroupItem({
                                groupName: "filters",
                                name: oSearchField.columnname,
                                label: oSearchField.columnlabel,
                                partOfCurrentVariant: true,
                                visibleInFilterBar: true,
                                control: new Input({
                                    id: sInpSrchFld,
                                    type: "Text",
                                    placeholder: "Enter search text",
                                    tooltip: "Enter search text",
                                    liveChange: this.onChange_fbFilters.bind(this),
                                    enabled: true
                                })
                            }));
                        }
                    } else if (oSearchField.columnname.toLowerCase().includes("status")) {
                        // Place the search field in the filter bar with dropdown option
                        oDynamicPage.getHeader().getContent()[0].addFilterGroupItem(new FilterGroupItem({
                            groupName: "filters",
                            name: oSearchField.columnname,
                            label: oSearchField.columnlabel,
                            partOfCurrentVariant: true,
                            visibleInFilterBar: true,
                            control: new ComboBox({
                                id: sInpSrchFld,
                                showSecondaryValues: true,
                                filterSecondaryValues: true,
                                placeholder: "Select from dropdown",
                                tooltip: "Select from dropdown",
                                change: this.onChange_fbFilters.bind(this),
                                enabled: true,
                                items: [
                                    new ListItem({
                                        key: "510",
                                        text: "510",
                                        additionalText: "APPROVED"
                                    }),
                                    new ListItem({
                                        key: "590",
                                        text: "590",
                                        additionalText: "CLOSED"
                                    })
                                ]
                            })
                        }));
                    } else {
                        // Place the search field in the filter bar with empty input field
                        oDynamicPage.getHeader().getContent()[0].addFilterGroupItem(new FilterGroupItem({
                            groupName: "filters",
                            name: oSearchField.columnname,
                            label: oSearchField.columnlabel,
                            partOfCurrentVariant: true,
                            visibleInFilterBar: true,
                            control: new Input({
                                id: sInpSrchFld,
                                type: "Text",
                                placeholder: "Enter search text",
                                tooltip: "Enter search text",
                                liveChange: this.onChange_fbFilters.bind(this),
                                enabled: true
                            })
                        }));
                    }
                }, this);

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Exiting _fn_populateSearchForm method");
            },

            /**
             * Read the service url of the selected table
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableResult
             * @private
             * @returns {void}
             */
            _fn_readTableUrl: function () {
                // Log information
                this.fn_getLogReference().info("Table Result Controller: Entering _fn_readTableUrl method");

                /** Define Variables */
                var oFieldsData = this.fn_getGlobalModel("oFieldsDataModel").getData()[0];
                // Handle both lowercase (OData V2 proxy returns lowercase from CAP CDS) and PascalCase (legacy)
                var oSelectedTablename = oFieldsData.tablename || oFieldsData.Tablename;
                var iLastIndex; // Stores the last index of '/' in the service URL

                /** Method Implementation */
                // Open busy dialog
                this.fn_openBusyDialog();

                // Set service URL and entity set
                // The CentralService at /api/central is the correct CAP service for MDR Central data
                this.sServiceUrl = "/api/central/";
                this.sEntitySet = "/" + oSelectedTablename;

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Service URL - " + this.sServiceUrl);
                this.fn_getLogReference().info("Table Result Controller: Entity Set - " + this.sEntitySet);

                // Odata model of the selected table - use the global model which has proper authentication context
                this.oTableModel = this.fn_getGlobalModel();

                // Read data of the selected table
                this._fn_readTableData();

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Exiting _fn_readTableUrl method");
            },

            /**
             * Read the table data
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableResult
             * @private
             * @returns {void}
             */
            _fn_readTableData: function () {
                // Log information
                this.fn_getLogReference().info("Table Result Controller: Entering _fn_readTableData method");

                /** Define Variables */
                var aFilters = [], // Stores the filters to be applied to the table
                    bFirstRead, // Stores the flag to check if the table data is read for the first time
                    iMaxPageNum, // Stores the maximum page number
                    oCurrentTableBoundModel = new JSONModel(), // Stores the current table bound model
                    iNum = parseInt(this.byId("cbxPageSize").getValue(), 10) || 10, // Stores the number of records (as integer)
                    iSkip = 0; // Stores the number of records to be skipped

                /** Method Implementation */
                // Read the search parameter array and add the filters in the array
                if (this.aSearchParameters && this.aSearchParameters.length !== 0) {
                    this.aSearchParameters.forEach(function (oSearchParam) {
                        aFilters.push(new Filter(oSearchParam.sPath, oSearchParam.sFilter, oSearchParam.sValue));
                    });
                }

                // Add filter of version active
                aFilters.push(new Filter("VERSION_ACTIVE", FilterOperator.EQ, "Y"));

                // Reset the pagination toolbar fields
                this.byId("btnFirstPage").setEnabled(false);
                this.byId("btnPrevPage").setEnabled(false);
                this.byId("inpPageNum").setValue(1);
                this.byId("btnNextPage").setEnabled(true);
                this.byId("btnLastPage").setEnabled(true);

                // Set the page size value globally
                this.iPageSize = iNum;
                
                // If page number is set to more than 1 while navigationg to child app
                if (this.sPageNumber > 1) {
                    // Set the page number to the input field
                    this.byId("inpPageNum").setValue(this.sPageNumber);

                    // Set pagination buttons enable 
                    this.byId("btnFirstPage").setEnabled(true);
                    this.byId("btnPrevPage").setEnabled(true);

                    // Set the value of the num and skip based on page number
                    iSkip = (this.sPageNumber - 1) * this.iPageSize;
                }

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Number of records to be read - " + iNum);
                this.fn_getLogReference().info("Table Result Controller: Number of records to be skipped - " + iSkip);

                var oListBinding;
                try {
                    // In OData V4, we use bindList with $count (not $$count)
                    oListBinding = this.oTableModel.bindList(this.sEntitySet, null, null, aFilters, {
                        $count: true
                    });
                } catch (e) {
                    this.fn_getLogReference().error("Table Result Controller: Error in bindList - " + e.message);
                    console.error("Error in bindList:", e);
                    this.fn_closeBusyDialog();
                    return;
                }

                try {
                    oListBinding.requestContexts(iSkip, iNum).then(function (aContexts) {
                        // Protect against component destruction
                        if (!this.getOwnerComponent()) { return; }

                    // Get the total count
                    this.iRecordCount = oListBinding.getLength() || 0;

                    // Set the record count globally
                    this.fn_getLocalModel("tableResultViewModel").setProperty("/tableHeaderText", this.fn_getResourceBundle().getText("tableHeaderTextWithCount", [this.iRecordCount]));

                    // Check record count
                    if (this.iRecordCount === 0) {
                        if (this.byId("inpPageNum")) this.byId("inpPageNum").setValue(0);
                        if (this.byId("btnNextPage")) this.byId("btnNextPage").setEnabled(false);
                        if (this.byId("btnLastPage")) this.byId("btnLastPage").setEnabled(false);
                        iMaxPageNum = 1;
                    } else {
                        // Calculate the maximum page number
                        iMaxPageNum = Math.ceil(this.iRecordCount / this.iPageSize);
                        if (iMaxPageNum === 0) iMaxPageNum = 1;

                        if (iMaxPageNum === 1) {
                            this.byId("btnNextPage").setEnabled(false);
                            this.byId("btnLastPage").setEnabled(false);
                        }
                    }

                    // Assign max page size
                    this.byId("lblMaxPageNum").setText("/" + iMaxPageNum);

                    // Map V4 contexts back to plain JS objects for the JSONModel
                    var aData = aContexts.map(function (oContext) {
                        return oContext.getObject();
                    });

                    oCurrentTableBoundModel.setData(aData);

                    // Set the model globally or update the data
                    if (!this.fn_getGlobalModel("oCurrentTableBoundModel")) {
                        this.fn_setGlobalModel(oCurrentTableBoundModel, "oCurrentTableBoundModel");
                    } else {
                        this.fn_getGlobalModel("oCurrentTableBoundModel").setData(aData);
                    }

                    // Prepare the result set of the table
                    this._fn_prepareResultSet();
                    
                    // Close busy dialog
                    this.fn_closeBusyDialog();

                }.bind(this)).catch(function (oError) {
                    // Protect against component destruction
                    if (!this.getOwnerComponent()) { return; }

                    // Show error message
                    this.fn_showServiceError(oError);
                    this.fn_closeBusyDialog();
                }.bind(this));
                
                } catch (e) {
                    this.fn_getLogReference().error("Table Result Controller: Error in requestContexts - " + e.message);
                    console.error("Error in requestContexts:", e);
                    this.fn_closeBusyDialog();
                }

                // Log information
                this.fn_getLogReference().info("Table Result Controller: Exiting _fn_readTableData method");
            },

            /**
             * Prepare result set of the selected table
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableResult
             * @private
             * @returns {void}
             */
            _fn_prepareResultSet: function () {
                // Log information
                this.fn_getLogReference().info("Table Result Controller: Entering _fn_prepareResultSet method");

                /** Define variables */
                var aFieldsData = this.fn_getGlobalModel("oFieldsDataModel").getData(), // Stores selected table configurations
                    oColumn, // Stores column reference
                    oCell, // Stores cell reference
                    oTable = this.byId("tblResultSet"), // Stores table reference
                    oPaging = this.byId('oftPaging'), // Stores pagination overflow toolbar reference
                    aCells = []; // Store all cells

                /** Method implementation */
                // Remove columns and bind aggregations
                oTable.destroyColumns();
                oTable.unbindAggregation("items");

                // Set visibility
                oTable.setVisible(true);
                oPaging.setVisible(true);

                // Add columns and rows
                aFieldsData.forEach(function (oField, index) {
                    if (oField.resultsetfieldflag === "Y") {
                        if (oField.primarykeyflag === "Y") {
                            oColumn = new sap.m.Column("col" + index, {
                                hAlign: "Center",
                                demandPopin: false,
                                header: new sap.m.Label({
                                    text: oField.columnlabel,
                                    tooltip: oField.columnlabel,
                                    wrapping: true
                                })
                            });
                        } else {
                            oColumn = new sap.m.Column("col" + index, {
                                hAlign: "Center",
                                demandPopin: true,
                                header: new sap.m.Label({
                                    text: oField.columnlabel,
                                    tooltip: oField.columnlabel,
                                    wrapping: true
                                })
                            });
                        }

                        // Add column to table
                        oTable.addColumn(oColumn);

                        // Bind path to the cells
                        if (oField.columndatatype === "DATS") {
                            oCell = new sap.m.Text({
                                text: {
                                    path: "oCurrentTableBoundModel>" + oField.columnname,
                                    type: new sap.ui.model.type.Date({
                                        pattern: "dd.MM.yyyy"
                                    })
                                },
                                tooltip: {
                                    path: "oCurrentTableBoundModel>" + oField.columnname,
                                    type: new sap.ui.model.type.Date({
                                        pattern: "dd.MM.yyyy"
                                    })
                                }
                            });
                        } else if (oField.columndatatype === "INTEGER") {
                            oCell = new sap.m.Text({
                                text: {
                                    path: "oCurrentTableBoundModel>" + oField.columnname,
                                },
                                tooltip: {
                                    path: "oCurrentTableBoundModel>" + oField.columnname,
                                    formatter: function (sValue) {
                                        return sValue + "";
                                    }
                                }
                            });
                        } else if(oField.columnname === "WORKFLOW_ID") {
                            oCell = new sap.m.Text({
                                text: {
                                    path: "oCurrentTableBoundModel>" + oField.columnname,
                                },
                                tooltip: {
                                    path: "oCurrentTableBoundModel>" + oField.columnname,
                                } //, 
                                // press: this.onPress_lnkWorkflowId.bind(this)
                            });
                        } else {
                            oCell = new sap.m.Text({
                                text: {
                                    path: "oCurrentTableBoundModel>" + oField.columnname,
                                },
                                tooltip: {
                                    path: "oCurrentTableBoundModel>" + oField.columnname,
                                }
                            });
                        }
                        
                        // Push the cell data in an array
                        aCells.push(oCell);
                    }
                }, this);

                // Bind rows
                oTable.bindAggregation("items", "oCurrentTableBoundModel>/", new sap.m.ColumnListItem("colListItem", {
                    cells: aCells
                }));
                
                // Log information
                this.fn_getLogReference().info("Table Result Controller: Exiting _fn_prepareResultSet method");
            }
        });
    }
);

