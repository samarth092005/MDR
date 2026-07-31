sap.ui.define([
    "com/intapptics/zmdrcntrlmain/controller/BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
],
    function (BaseController, JSONModel, Filter, FilterOperator) {
        "use strict";

        return BaseController.extend("com.intapptics.zmdrcntrlmain.controller.CategoryList", {
            /**
             * Lifecycle Methods
             */

            /**
             * Called when the controller is instantiated and its view controls (if available) are already created.
             * Can be used to modify the view before it has been displayed, to bind event handlers and to do other one-time initialization
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.CategoryList
             */
            onInit: function () {
                // Log information
                this.fn_getLogReference().info("Category List Controller: Entering onInit method");

                /** Define Variables */
                var oCategoryListViewModel, // Stores the view related settings in this model
                    oCntrlUiConfigOdataModel = this.fn_getGlobalModel(), // Stores the model info of Central UI Visibility data
                    oCntrlUiConfigDataModel = new JSONModel(); // Local model to store splash screen category and table details of logged in user

                /** Method Implementation */
                // Open busy indicator
                this.fn_openBusyDialog();

                // Set flag when component is initiated
                this.bFirstTime = true;

                //Instantiate view model with few default model parameters
                oCategoryListViewModel = new JSONModel({
                    tableTitle: this.fn_getResourceBundle().getText("ttlTblCategoryList"),
                    noDataText: this.fn_getResourceBundle().getText("categoryNoDataText")
                });

                // Set the model locally to the view
                this.fn_setLocalModel(oCategoryListViewModel, "categoryViewModel");

                // Log information
                this.fn_getLogReference().info("Category List Controller: Local model 'categoryViewModel' is set to view");

                // Get All Category and Table list
                // [V4 MIGRATION] Replaced V2 oModel.read() with native OData V4 bindList().requestContexts().
                // /CntrlUIVis is a plain EntitySet (central-service.cds line 11). bindList() is correct.
                // The V2-only `async: true` parameter is removed (implicit in V4).
                // Success/error logic is preserved exactly — data is mapped to plain objects via getObject().
                oCntrlUiConfigOdataModel.bindList("/CntrlUIVis").requestContexts(0, Infinity).then(function (aContexts) {
                    var aData = aContexts.map(function (oContext) { return oContext.getObject(); });

                    // Update the data to the model if it exists or set the model globally if does not exist
                    if (!this.fn_getGlobalModel("oCntrlUiConfigLocalModel")) {
                        oCntrlUiConfigDataModel.setData(aData);
                        this.fn_setGlobalModel(oCntrlUiConfigDataModel, "oCntrlUiConfigDataModel");
                    } else {
                        this.fn_getGlobalModel("oCntrlUiConfigDataModel").setData(aData);
                    }

                    // Process data received from backend
                    this._fn_cntrlUiVisModelLoaded(oCntrlUiConfigDataModel);
                }.bind(this)).catch(function (oError) {
                    this.fn_closeBusyDialog();
                    this.fn_showServiceError(oError);

                    // Log Error
                    this.fn_getLogReference().error("Odata Read Error", "Unable to read data Cntrl UI Visibility Service");
                }.bind(this));

                // Attach routing pattern match function to be called
                this.fn_getRouter().getRoute("category").attachPatternMatched(this._fn_onObjectMatched, this);

                // Log information
                this.fn_getLogReference().info("Category List Controller: Exiting onInit method");
            },

            /**
             * This hook method is invoked before the controller's view is re-rendered
             * (Not before the first rendering! onInit() is used for that one!)
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.CategoryList
             */
            // onBeforeRendering: function() {
            //
            // },

            /**
             * Called when the view has been rendered (so its HTML is part of the document). Post rendering manipulations 
             * of the HTML could be done here. This hook is the same one that SAPUI5 controls get after being rendered.
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.CategoryList
             */
            // onAfterRendering: function() {
            //
            // },

            /**
             * Called when the controller is destroyed. Use this one to free resources and finalize activities.
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.CategoryList
             */
            // onExit: function() {
            //
            // },


            /**
            * Event Handlers
            */

            /**
             * Triggered by the Category List's 'updateFinished' event.
             * After new data is avaialble, this handler method updates the counter.
             * 
             * This should only happen if the update was successful, which is why this handler 
             * is attached to 'updateFinished' and not to table's list binding's 'dataReceived' method.
             * 
             * @param {sap.ui.base.Event} oEvent the update finished event
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.CategoryList
             */
            onUpdateFinished_tblCategoryList: function (oEvent) {
                // Log information
                this.fn_getLogReference().info("Category List Controller: Entering onUpdateFinished_tblCategoryList method");

                /** Define Variables */
                var sTitle, // Stores the heading of the Category List
                    sCategoryListTooltip, // Stores the tooltip of the Category List
                    oList = oEvent.getSource(), // Stores reference of Category List
                    iTotalItems = oEvent.getParameter("total"), // Stores the total row count of the Categroy List
                    sHash; // Current hash tag value

                /** Method Implementation */
                if (iTotalItems && oList.getBinding("items").isLengthFinal()) {
                    sTitle = this.fn_getResourceBundle().getText("ttlTblCategoryListWithCount", [iTotalItems]);

                    // Log information
                    this.fn_getLogReference().info("Category List Controller: Record count of this list is updated. Value is - " + iTotalItems);

                    if (iTotalItems > 1) {
                        sCategoryListTooltip = this.fn_getResourceBundle().getText("pCategoryListTooltip");
                    } else {
                        sCategoryListTooltip = this.fn_getResourceBundle().getText("sCategoryListTooltip");
                    }
                } else {
                    sTitle = this.fn_getResourceBundle().getText("ttlTblCategoryList");
                    sCategoryListTooltip = this.fn_getResourceBundle().getText("pCategoryListTooltip");
                    
                    // Log information
                    this.fn_getLogReference().info("Category List Controller: Record count is not present");
                }
                // Set title and tooltip to local model
                this.fn_getLocalModel("categoryViewModel").setProperty("/tableTitle", sTitle);
                this.fn_getLocalModel("categoryViewModel").setProperty("/categoryListTooltip", sCategoryListTooltip);

                // Read current hash tag
                sHash = sap.ui.core.routing.HashChanger.getInstance().getHash();
                // If hash tag is empty then proceed as hash tag will only be empty when the app is 
                // instantiated from tile and not from anywhere else
                if (sHash !== "undefined" && sHash != "") {
                    // Log information
                    this.fn_getLogReference().info("Category List Controller: Current hash tag is - " + sHash);
                } else if (this.bFirstTime) {
                    // Set the flag to false
                    this.bFirstTime = false;

                    // Select the first item and fire select change event
                    if (oList.getItems().length > 0) {
                        oList.setSelectedItem(oList.getItems()[0]);
                        oList.fireSelectionChange();
                    }

                    // Log information
                    this.fn_getLogReference().info("Category List Controller: First item is preselected and fired the select change event");

                    // Close the busy indicator once the table title is set
                    this.fn_closeBusyDialog();
                }

                // Log information
                this.fn_getLogReference().info("Category List Controller: Exiting onUpdateFinished_tblCategoryList method");
            },

            /**
             * Event handler when an item gets pressed from Category List
             * 
             * @param {sap.ui.base.Event} oEvent the list selectionChange event
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.CategoryList
             */
            onSelectionChange_tblCategoryList: function (oEvent) {
                // Log information
                this.fn_getLogReference().info("Category List Controller: Entering onSelectionChange_tblCategoryList method");

                /** Define Variables */
                var sSelectedPath = oEvent.getSource().getSelectedContextPaths()[0]; // Stores the selected path

                /** Method Implementation */
                // Log Information
                this.fn_getLogReference().info("Category List Controller: Repository Selected - ", oEvent.getSource().getSelectedItem().getTitle());

                // Navigate to next page with the mandatory parameter passed
                this.fn_getRouter().navTo("table", {
                    sCategoryPath: sSelectedPath.substring(1)
                });

                // Initiate busy indicator
                this.fn_openBusyDialog();

                // Log information
                this.fn_getLogReference().info("Category List Controller: Navigating to table list view of the app");

                // Log information
                this.fn_getLogReference().info("Category List Controller: Exiting onSelectionChange_tblCategoryList method");
            },

            /**
             * Event handler to search data into Category List on live change of the value in Category Search field
             * 
             * @param {sap.ui.base.Event} oEvent the category search field search event
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.CategoryList
             */
            onLiveChange_sfCategory: function (oEvent) {
                // Log information
                this.fn_getLogReference().info("Category List Controller: Entering onLiveChange_sfCategory method");

                /** Define Variables */
                var oList = this.byId("tblCategoryList"), // Stores the category list reference
                    oCategoryListViewModel = this.fn_getLocalModel("categoryViewModel"), // Stores local view model
                    sValue = oEvent.getSource().getValue(), // Stores the search query parameter in the search field
                    aFilter = []; // Filter array

                /** Method Implementation */
                // Log Information
                this.fn_getLogReference().info("Category List Controller: Filter value - ", sValue);

                // If value entered in the search field add that into the filter
                if (sValue && sValue.length > 0) {
                    aFilter.push(new Filter("repositoryName", FilterOperator.Contains, sValue));
                }

                // Bind the filter with the list
                oList.getBinding("items").filter(aFilter);

                // Change the no data text of the list in case there are no filter results
                if (aFilter.length !== 0) {
                    oCategoryListViewModel.setProperty("/noDataText", this.fn_getResourceBundle().getText("categoryNoDataTextAfterSearch"));
                } else {
                    oCategoryListViewModel.setProperty("/noDataText", this.fn_getResourceBundle().getText("categoryNoDataText"));
                }

                // Log information
                this.fn_getLogReference().info("Category List Controller: Exiting onLiveChange_sfCategory method");
            },

            /**
            * Internal Methods
            */

            /**
             * Prepare the unique category list from the complete category list received 
             * from backend based on logged in user details
             * 
             * @function
             * @private
             * 
             * @param {sap.ui.model.json.JSONModel} oCntrlUiConfigDataModel Cntrl UI visibility json data model
             *
             * @memberof com.intapptics.zmdrcntrlmain.view.CategoryList
             */
            _fn_cntrlUiVisModelLoaded: function (oCntrlUiConfigDataModel) {
                // Log information
                this.fn_getLogReference().info("Category List Controller: Entering _fn_cntrlUiVisModelLoaded method");

                /** Define Variables */
                var aUniqueRepositories = [], // List of unique repositories applicable to the logged in user
                    oUniqueRepositoriesModel, // Model to hold final unique categories
                    aCntrlConfigData = oCntrlUiConfigDataModel.getData(), // Complete Cntrl config data
                    sTemp1, sTemp2; // Tempporary variables to sort array

                /** Method Implementation */
                // Check if any config data is present for the logged in user
                if (aCntrlConfigData.length !== 0) {
                    // Sort the array based on category
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
                    this.fn_getLogReference().info("Category List Controller: Applicable repository data model is set");
                } else {
                    this.fn_closeBusyDialog();

                    // Log information
                    this.fn_getLogReference().info("Category List Controller: No repositories found for the logged in user");

                    // Navigate to No category
                    this.fn_getRouter().navTo("noCategory");
                }

                // Log information
                this.fn_getLogReference().info("Category List Controller: Exiting _fn_cntrlUiVisModelLoaded method");
            },

            /**
             * Binds the view to the object path
             * 
             * @function
             * @private
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.CategoryList 
             */
            _fn_onObjectMatched: function () {
                // Log information
                this.fn_getLogReference().info("Category List Controller: Entering _fn_onObjectMatched method");

                this.byId("tblCategoryList").removeSelections();

                // Log information
                this.fn_getLogReference().info("Category List Controller: Table selection cleared");

                // Log information
                this.fn_getLogReference().info("Category List Controller: Exiting _fn_onObjectMatched method");
            }
        });
    }
);
