sap.ui.define([
    "com/intapptics/zmdrcntrlmain/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/routing/History"
],
    function (BaseController, JSONModel, Filter, FilterOperator, History) {
        "use strict";

        return BaseController.extend("com.intapptics.zmdrcntrlmain.controller.TableList", {
            /**
             * Lifecycle Methods
             */

            /**
             * Called when the controller is instantiated and its view controls (if available) are already created.
             * Can be used to modify the view before it has been displayed, to bind event handlers and to do other one-time initialization
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableList
             */
            onInit: function () {
                // Log information
                this.fn_getLogReference().info("Table List Controller: Entering onInit method");

                /** Define Variables */
                var oTableListViewModel; // Stores the view related settings in this model

                /** Method Implementation */
                //Instantiate view model with few default model parameters
                oTableListViewModel = new JSONModel({
                    noDataText: this.fn_getResourceBundle().getText("tableNoDataText")
                });

                // Set the model locally to the view
                this.fn_setLocalModel(oTableListViewModel, "tableListViewModel");

                // Log information
                this.fn_getLogReference().info("Table List Controller: Local model 'tableListViewModel' is set to view");

                // Attach routing pattern match function to be called
                this.fn_getRouter().getRoute("table").attachPatternMatched(this._fn_onObjectMatched, this);

                // Log information
                this.fn_getLogReference().info("Table List Controller: Exiting onInit method");
            },

            /**
             * This hook method is invoked before the controller's view is re-rendered
             * (Not before the first rendering! onInit() is used for that one!)
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableList
             */
            // onBeforeRendering: function() {
            //
            // },

            /**
             * Called when the view has been rendered (so its HTML is part of the document). Post rendering manipulations 
             * of the HTML could be done here. This hook is the same one that SAPUI5 controls get after being rendered.
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableList
             */
            // onAfterRendering: function() {
            //
            // },

            /**
             * Called when the controller is destroyed. Use this one to free resources and finalize activities.
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableList
             */
            // onExit: function() {
            //
            // },


            /**
            * Event Handlers
            */

            /**
             * Triggered by the Table List's 'updateFinished' event.
             * After new data is avaialble, this handler method updates the counter.
             * 
             * This should only happen if the update was successful, which is why this handler 
             * is attached to 'updateFinished' and not to table's list binding's 'dataReceived' method.
             * 
             * @param {sap.ui.base.Event} oEvent the update finished event
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableList
             */
            onUpdateFinished_tblTableList: function (oEvent) {
                // Log information
                this.fn_getLogReference().info("Table List Controller: Entering onUpdateFinished_tblTableList method");

                /** Define Variables */
                var sTableTitle, // Stores the heading of the Table List
                    oList = oEvent.getSource(), // Stores reference of Table List
                    iTotalItems = oEvent.getParameter("total"), // Stores the total row count of the Table List
                    oSelectedRepository, // Selected category value
                    sHash; // Current hash tag value

                /** Method Implementation */
                // Get the selected repository value
                if (this.sRepositoryId) {
                    oSelectedRepository = this.fn_getGlobalModel("oUniqueRepositoriesModel").getData()[this.sRepositoryId];
                } else {
                    sHash = sap.ui.core.routing.HashChanger.getInstance().getHash();
                    oSelectedRepository = this.fn_getGlobalModel("oUniqueRepositoriesModel").getData()[sHash.split("/")[1]];
                }

                // Check if category name is present and not undefined
                if (oSelectedRepository) {
                    this.fn_getLogReference().info("Table List Controller: Selected repository - " + oSelectedRepository.repositoryLabel);

                    // Only update the counter if the length is final and the table is not empty
                    if (iTotalItems && oList.getBinding("items").isLengthFinal()) {
                        sTableTitle = this.fn_getResourceBundle().getText("ttlTblTableListWithCount", [oSelectedRepository.repositoryLabel, iTotalItems]);

                        // Log information
                        this.fn_getLogReference().info("Table List Controller: Record count of this list is - " + iTotalItems);
                    } else {
                        sTableTitle = this.fn_getResourceBundle().getText("ttlTblTableList", [oSelectedRepository.repositoryLabel]);

                        // Log information
                        this.fn_getLogReference().info("Table List Controller: Record count is not present");
                    }
                } else {
                    this.fn_getLogReference().info("Table List Controller: Category information is missing to set into the title");
                }

                // Set title to local model
                this.fn_getLocalModel("tableListViewModel").setProperty("/tableTitle", sTableTitle);

                // Close the busy indicator once the table title is set
                this.fn_closeBusyDialog();

                // Log information
                this.fn_getLogReference().info("Table List Controller: Exiting onUpdateFinished_tblTableList method");
            },

            /**
             * Event handler when an item gets pressed from Table List
             * 
             * @param {sap.ui.base.Event} oEvent the list selectionChange event
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableList
             */
            onSelectionChange_tblTableList: function (oEvent) {
                // Log information
                this.fn_getLogReference().info("Table List Controller: Entering onSelectionChange_tblTableList method");

                /** Define Variables */
                var sSelectedPath = oEvent.getSource().getSelectedContextPaths()[0]; // Stores the selected path

                /** Method Implementation */
                // Log Information
                this.fn_getLogReference().info("Table List Controller: Selected Table- ", oEvent.getSource().getSelectedItem().getTitle());

                // Set visibilities of the navigation action buttons before navigating to the next view
                this.byId("btnEnterFullScreenTabList").setVisible(false);
                this.byId("btnExitFullScreenTabList").setVisible(false);
                this.byId("btnClosePageTabList").setVisible(false);

                // Get the selected table id
                this.sTableId = sSelectedPath.substring(1)

                // Log information
                this.fn_getLogReference().info("Table List Controller: Navigating to table list view of the app");

                // Navigate to next page with the mandatory parameter passed
                this.fn_getRouter().navTo("tableResult", {
                    sCategoryPath: this.sRepositoryId,
                    sTablePath: this.sTableId
                });

                // Initiate busy indicator
                this.fn_openBusyDialog();

                // Log information
                this.fn_getLogReference().info("Table List Controller: Exiting onSelectionChange_tblTableList method");
            },

            /**
             * Event handler to search data into Table List on live change of the value in Table List Search field
             * 
             * @param {sap.ui.base.Event} oEvent the Table List search field search event
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableList
             */
            onLiveChange_sfTable: function (oEvent) {
                // Log information
                this.fn_getLogReference().info("Table List Controller: Entering onLiveChange_sfTable method");

                /** Define Variables */
                var oList = this.byId("tblTableList"), // Stores the Table list reference
                    oTableListViewModel = this.fn_getLocalModel("tableListViewModel"), // Stores local view model
                    sValue = oEvent.getSource().getValue(), // Stores the search query parameter in the search field
                    aFilter = []; // Filter array

                /** Method Implementation */
                // Log Information
                this.fn_getLogReference().info("Table List Controller: Filter value - ", sValue);

                // If value entered in the search field add that into the filter
                if (sValue && sValue.length > 0) {
                    aFilter.push(new Filter("TableName", FilterOperator.Contains, sValue));
                }

                // Bind the filter with the list
                oList.getBinding("items").filter(aFilter);

                // Change the no data text of the list in case there are no filter results
                if (aFilter.length !== 0) {
                    oTableListViewModel.setProperty("/noDataText", this.fn_getResourceBundle().getText("tableNoDataTextAfterSearch"));
                } else {
                    oTableListViewModel.setProperty("/noDataText", this.fn_getResourceBundle().getText("tableNoDataText"));
                }

                // Log information
                this.fn_getLogReference().info("Table List Controller: Exiting onLiveChange_sfTable method");
            },

            /**
             * Event Handler for the navigation action buttons of the page
             * 
             * @param {sap.ui.base.Event} oEvent Button press event for any of the page navigation action buttons
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableList
             */
            onPressNavActionBtns: function (oEvent) {
                // Log information
                this.fn_getLogReference().info("Table List Controller: Entering onPressNavActionBtns method");

                /** Define Variables */
                var sBtnId = oEvent.getSource().getId(); // Stores the button id

                /** Method Implementation */
                // Check the button id and perform the action accordingly
                switch (sBtnId) {
                    case this.getView().createId("btnEnterFullScreenTabList"):
                        // Log information
                        this.fn_getLogReference().info("Table List Controller: Enter Full Screen button pressed");

                        // Set the button visibility
                        this.byId("btnEnterFullScreenTabList").setVisible(false);
                        this.byId("btnExitFullScreenTabList").setVisible(true);

                        // Take reference of the Flexible Column Layout and set the middle column to full screen
                        this.getView().getParent().getParent().setLayout("MidColumnFullScreen");

                        // Log information
                        this.fn_getLogReference().info("Table List Controller: Middle column set to full screen along with buttons visibility");
                        break;

                    case this.getView().createId("btnExitFullScreenTabList"):
                        // Log information
                        this.fn_getLogReference().info("Table List Controller: Exit Full Screen button pressed");
                        
                        // Set the button visibility
                        this.byId("btnEnterFullScreenTabList").setVisible(true);
                        this.byId("btnExitFullScreenTabList").setVisible(false);

                        // Take reference of the Flexible Column Layout and set the middle column to full screen
                        this.getView().getParent().getParent().setLayout("TwoColumnsMidExpanded");

                        // Log information
                        this.fn_getLogReference().info("Table List Controller: Middle column expanded along with buttons visibility");
                        break;

                    case this.getView().createId("btnClosePageTabList"):
                        // Log information
                        this.fn_getLogReference().info("Table List Controller: Close Page button pressed");
                        
                        // Navigate to category list page
                        this.fn_getRouter().navTo("category");
                        break;
                }

                // Log information
                this.fn_getLogReference().info("Table List Controller: Exiting onPressNavActionBtns method");
            },

            /**
            * Internal Methods
            */

            /**
             * Prepare the unique Table list from the complete Table list received 
             * from backend based on logged in user details
             * 
             * @function
             * @private
             * 
             * @param {sap.ui.model.json.JSONModel} oCntrlUiConfigDataModel Central UI visibility json data model
             *
             * @memberof com.intapptics.zmdrcntrlmain.view.TableList
             */
            _fn_cntrlUiVisModelLoaded: function (oCntrlUiConfigDataModel) {
                // Log information
                this.fn_getLogReference().info("Table List Controller: Entering _fn_cntrlUiVisModelLoaded method");

                /** Define Variables */
                var aUniqueRepositories = [], // List of unique repositories applicable to the logged in user
                    oUniqueRepositoriesModel, // Model to hold final unique categories
                    aCntrlConfigData = oCntrlUiConfigDataModel.getData(), // Complete Central config data
                    sTemp1, sTemp2; // Tempporary variables to sort array

                /** Method Implementation */
                // Check if any config data is present for the logged in user
                if (aCntrlConfigData.length !== 0) {
                    // Sort the array based on Table
                    aCntrlConfigData.sort(function (oVal1, oVal2) {
                        sTemp1 = oVal1.repository.toLowerCase();
                        sTemp2 = oVal2.repository.toLowerCase();

                        if (sTemp1 !== undefined && sTemp2 !== undefined) {
                            if (sTemp1 < sTemp2) {
                                return -1;
                            } else if (sTemp1 > sTemp2) {
                                return 1;
                            } else {
                                return 0;
                            }
                        } else {
                            return 0;
                        }
                    });

                    // Push unique repositories into the array
                    aCntrlConfigData.forEach(function (oCntrlConfigData) {
                        // Check if already added into the array
                        if (aUniqueRepositories.filter(function (oUniqueRepositories) {
                            return oUniqueRepositories.repositoryName === oCntrlConfigData.repository
                        }).length === 0) {
                            aUniqueRepositories.push({
                                "repositoryName": oCntrlConfigData.repository,
                                "repositoryLabel": oCntrlConfigData.repository // Fallback to repository id since label is not present in new model
                            });
                        }
                    });

                    // Asssign to global model
                    if (!this.fn_getGlobalModel("oUniqueRepositoriesModel")) {
                        oUniqueRepositoriesModel = new JSONModel(aUniqueRepositories);
                        this.fn_setGlobalModel(oUniqueRepositoriesModel, "oUniqueRepositoriesModel");
                    }

                    // Log information
                    this.fn_getLogReference().info("Table List Controller: Applicable repository data model is set");
                } else {
                    this.fn_closeBusyDialog();

                    // Log information
                    this.fn_getLogReference().info("Table List Controller: No repositories found for the logged in user");

                    // Navigate to No Table
                    this.fn_getRouter().navTo("noTable");
                }

                // Log information
                this.fn_getLogReference().info("Table List Controller: Exiting _fn_cntrlUiVisModelLoaded method");
            },

            /**
             * Binds the view to the object path
             * 
             * @function
             * @private
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.TableList 
             */
            _fn_onObjectMatched: function (oEvent) {
                // Log information
                this.fn_getLogReference().info("Table List Controller: Entering _fn_onObjectMatched method");

                this.getView().getParent().getParent().setLayout("TwoColumnsMidExpanded");

                /** Define Variables */
                var oCntrlUiConfigData, // Stores all the Central UI configuration data applicable to the logged in user
                    aFilteredTables = [], // Array of all tables applicable to the selected repository
                    oSelectedRepository, // Selected repository value
                    aUniqueTables = [], // Array of unique tables applicable to the selected repository based on logged in user
                    oUniqueTablesModel; // JSON Model to hold unique tables

                /** Method Implementation */
                // Get the selected repository id
                this.sRepositoryId = oEvent.getParameter("arguments").sCategoryPath;

                // Initiate busy indicator
                // this.fn_openBusyDialog(); // Removed synchronous busy dialog call

                // Check if model is present or not
                if (this.fn_getGlobalModel("oUniqueRepositoriesModel") && this.fn_getGlobalModel("oCntrlUiConfigDataModel")) {
                    // Get the complete table configuration
                    oCntrlUiConfigData = this.fn_getGlobalModel("oCntrlUiConfigDataModel").getData();

                    // Get the selected repository value
                    oSelectedRepository = this.fn_getGlobalModel("oUniqueRepositoriesModel").getData()[this.sRepositoryId];

                    // Log information
                    this.fn_getLogReference().info("Table List Controller: Selected repository - " + oSelectedRepository.repositoryName);
                    
                    // Filter the config model based on the selected repository
                    // Handle both lowercase (OData V4 / CAP default) and PascalCase (OData V2 proxy)
                    aFilteredTables = oCntrlUiConfigData.filter(function (data) {
                        var sRepo = data.repository || data.Repository;
                        return sRepo === oSelectedRepository.repositoryName;
                    });

                    // Get unique tables from the above filtered data
                    aFilteredTables.forEach(function (oDupTable) {
                        var sTableLabel = oDupTable.TableLabel || oDupTable.Tablelabel;
                        var sTableName = oDupTable.TableName || oDupTable.Tablename;
                        if (aUniqueTables.filter(function (oUniqueTable) {
                            return oUniqueTable.tableName === sTableLabel;
                        }).length === 0) {
                            aUniqueTables.push({
                                "tableName": sTableLabel,
                                "tableId": sTableName
                            });
                        }
                    }, this);

                    // Log total number of tables
                    this.fn_getLogReference().info("Table List Controller: Total number of tables applicable for logged in user - " + aUniqueTables.length);

                    // Assign the unique tables to the model
                    if (!this.fn_getGlobalModel("oUniqueTablesModel")) {
                        oUniqueTablesModel = new JSONModel(aUniqueTables);
                        this.fn_setGlobalModel(oUniqueTablesModel, "oUniqueTablesModel");
                    } else {
                        // Update the model with new data
                        this.fn_getGlobalModel("oUniqueTablesModel").setData(aUniqueTables);
                    }

                    // Set default visibility of the buttons
                    this.byId("btnEnterFullScreenTabList").setVisible(true);
                    this.byId("btnExitFullScreenTabList").setVisible(false);
                    this.byId("btnClosePageTabList").setVisible(true);

                    // Clear any previous table selections
                    this.byId("tblTableList").removeSelections();
                } else {
                    // Navigate to home page
                    this.fn_getRouter().navTo("category");
                }
                // Log information
                this.fn_getLogReference().info("Table List Controller: Exiting _fn_onObjectMatched method");
            }
        });
    }
);
