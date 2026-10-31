sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/Filter",
  "sap/ui/model/FilterOperator",
  "sap/ui/model/Sorter",
  "sap/ui/core/format/DateFormat",
  "sap/m/SelectDialog",
  "sap/m/StandardListItem",
  "sap/m/ViewSettingsDialog",
  "sap/m/ViewSettingsItem",
  "sap/m/MessageToast",
  "sap/ui/export/Spreadsheet"
], function (
  Controller,
  JSONModel,
  Filter,
  FilterOperator,
  Sorter,
  DateFormat,
  SelectDialog,
  StandardListItem,
  ViewSettingsDialog,
  ViewSettingsItem,
  MessageToast,
  Spreadsheet
) {
  "use strict";

  return Controller.extend("com.intapptics.zmdraccountreport.controller.Main", {
    onInit: function () {
      this.oViewModel = new JSONModel({
        tableTitle: "Accounts",
        filterChartOfAccounts: "",
        filterAccountNumber: "",
        searchQuery: "",
        busy: false
      });
      this.getView().setModel(this.oViewModel, "viewModel");
    },

    onTableUpdateFinished: function (oEvent) {
      var iTotal = oEvent.getParameter("total") || 0;
      var oBinding = this.byId("accountsTable").getBinding("items");
      var iCount = oBinding ? oBinding.getLength() : iTotal;
      if (iCount === 0 && iTotal > 0) {
        iCount = iTotal;
      }
      this.oViewModel.setProperty("/tableTitle", "Accounts (" + iCount + ")");
    },

    onSearch: function () {
      var oBinding = this.byId("accountsTable").getBinding("items");
      if (!oBinding) {
        return;
      }

      var aFilters = [];
      var sAccNum = (this.oViewModel.getProperty("/filterAccountNumber") || "").trim();
      var sChartAcc = (this.oViewModel.getProperty("/filterChartOfAccounts") || "").trim();
      var sSearchQuery = (this.oViewModel.getProperty("/searchQuery") || "").trim();

      if (sAccNum) {
        aFilters.push(new Filter("GlAccountNum", FilterOperator.Contains, sAccNum));
      }

      if (sChartAcc) {
        // Map Chart of Accounts filter to CompanyCode as per data model schema
        aFilters.push(new Filter("CompanyCode", FilterOperator.Contains, sChartAcc));
      }

      if (sSearchQuery) {
        aFilters.push(new Filter({
          filters: [
            new Filter("GlAccountNum", FilterOperator.Contains, sSearchQuery),
            new Filter("CompanyCode", FilterOperator.Contains, sSearchQuery),
            new Filter("AccountDesc", FilterOperator.Contains, sSearchQuery),
            new Filter("WorkflowId", FilterOperator.Contains, sSearchQuery),
            new Filter("Status", FilterOperator.Contains, sSearchQuery)
          ],
          and: false
        }));
      }

      oBinding.filter(aFilters);
    },

    onLiveSearch: function (oEvent) {
      var sQuery = (oEvent.getParameter("newValue") || "").trim();
      this.oViewModel.setProperty("/searchQuery", sQuery);
      this.onSearch();
    },

    onClearFilters: function () {
      this.oViewModel.setProperty("/filterChartOfAccounts", "");
      this.oViewModel.setProperty("/filterAccountNumber", "");
      this.oViewModel.setProperty("/searchQuery", "");

      var oBinding = this.byId("accountsTable").getBinding("items");
      if (oBinding) {
        oBinding.filter([]);
      }
    },

    onRefresh: function () {
      var oBinding = this.byId("accountsTable").getBinding("items");
      if (oBinding) {
        oBinding.refresh();
        MessageToast.show("Data refreshed");
      }
    },

    onValueHelpAccountNumber: function () {
      if (!this._oAccNumDialog) {
        this._oAccNumDialog = new SelectDialog({
          title: "{i18n>vhAccountNumberTitle}",
          items: {
            path: "/GLAccount",
            sorter: { path: "GlAccountNum", descending: false },
            template: new StandardListItem({
              title: "{GlAccountNum}",
              description: "{AccountDesc} (Company: {CompanyCode})"
            })
          },
          search: function (oEvt) {
            var sVal = oEvt.getParameter("value");
            var oBinding = oEvt.getSource().getBinding("items");
            if (sVal) {
              oBinding.filter([
                new Filter({
                  filters: [
                    new Filter("GlAccountNum", FilterOperator.Contains, sVal),
                    new Filter("AccountDesc", FilterOperator.Contains, sVal)
                  ],
                  and: false
                })
              ]);
            } else {
              oBinding.filter([]);
            }
          },
          confirm: function (oEvt) {
            var oSelectedItem = oEvt.getParameter("selectedItem");
            if (oSelectedItem) {
              this.oViewModel.setProperty("/filterAccountNumber", oSelectedItem.getTitle());
              this.onSearch();
            }
          }.bind(this)
        });
        this.getView().addDependent(this._oAccNumDialog);
      }
      this._oAccNumDialog.open();
    },

    onValueHelpChartOfAccounts: function () {
      if (!this._oChartAccDialog) {
        this._oChartAccDialog = new SelectDialog({
          title: "{i18n>vhChartOfAccountsTitle}",
          items: {
            path: "/GLAccount",
            sorter: { path: "CompanyCode", descending: false },
            template: new StandardListItem({
              title: "{CompanyCode}",
              description: "Account: {GlAccountNum} - {AccountDesc}"
            })
          },
          search: function (oEvt) {
            var sVal = oEvt.getParameter("value");
            var oBinding = oEvt.getSource().getBinding("items");
            if (sVal) {
              oBinding.filter([
                new Filter({
                  filters: [
                    new Filter("CompanyCode", FilterOperator.Contains, sVal),
                    new Filter("AccountDesc", FilterOperator.Contains, sVal)
                  ],
                  and: false
                })
              ]);
            } else {
              oBinding.filter([]);
            }
          },
          confirm: function (oEvt) {
            var oSelectedItem = oEvt.getParameter("selectedItem");
            if (oSelectedItem) {
              this.oViewModel.setProperty("/filterChartOfAccounts", oSelectedItem.getTitle());
              this.onSearch();
            }
          }.bind(this)
        });
        this.getView().addDependent(this._oChartAccDialog);
      }
      this._oChartAccDialog.open();
    },

    onOpenViewSettings: function () {
      if (!this._oViewSettingsDialog) {
        this._oViewSettingsDialog = new ViewSettingsDialog({
          title: "{i18n>viewSettingsDialogTitle}",
          sortItems: [
            new ViewSettingsItem({ key: "GlAccountNum", text: "Account Number", selected: true }),
            new ViewSettingsItem({ key: "CompanyCode", text: "Company Code" }),
            new ViewSettingsItem({ key: "AccountDesc", text: "Description" }),
            new ViewSettingsItem({ key: "Status", text: "Status" }),
            new ViewSettingsItem({ key: "CreatedOn", text: "Created On" }),
            new ViewSettingsItem({ key: "UpdatedOn", text: "Updated On" })
          ],
          confirm: function (oEvt) {
            var mParams = oEvt.getParameters();
            var oBinding = this.byId("accountsTable").getBinding("items");
            if (mParams.sortItem) {
              var sPath = mParams.sortItem.getKey();
              var bDescending = mParams.sortDescending;
              oBinding.sort(new Sorter(sPath, bDescending));
            }
          }.bind(this)
        });
        this.getView().addDependent(this._oViewSettingsDialog);
      }
      this._oViewSettingsDialog.open();
    },

    onExport: function () {
      var oTable = this.byId("accountsTable");
      var oBinding = oTable.getBinding("items");

      if (!oBinding) {
        MessageToast.show("No data to export");
        return;
      }

      var aCols = [
        { label: "Account Block", property: "Status", width: 14 },
        { label: "Workflow ID", property: "WorkflowId", width: 16 },
        { label: "Account Number", property: "GlAccountNum", width: 16 },
        { label: "Status Description", property: "Status", width: 18 },
        { label: "Version Active", property: "VersionActive", width: 14 },
        { label: "Version Start Date", property: "VersionStartDate", width: 22 },
        { label: "Version End Date", property: "VersionEndDate", width: 22 },
        { label: "Created On", property: "CreatedOn", width: 22 },
        { label: "Created By", property: "CreatedBy", width: 18 },
        { label: "Updated On", property: "UpdatedOn", width: 22 },
        { label: "Updated By", property: "UpdatedBy", width: 18 }
      ];

      var oSettings = {
        workbook: {
          columns: aCols,
          context: {
            application: "MDR Entity Account Report",
            version: "1.0.0",
            title: "Entity Account Report"
          }
        },
        dataSource: oBinding,
        fileName: "Entity_Account_Report_" + new Date().toISOString().slice(0, 10) + ".xlsx",
        worker: false
      };

      var oSheet = new Spreadsheet(oSettings);
      oSheet.build().then(function () {
        MessageToast.show("Export finished successfully");
      }).finally(function () {
        oSheet.destroy();
      });
    },

    formatAccountBlock: function (sStatus) {
      return (sStatus === "INA" || sStatus === "BLK") ? "Y" : "N";
    },

    formatVersionActiveYN: function (sVersionActive) {
      return sVersionActive === "Y" ? "Y" : "N";
    },

    formatStatusDesc: function (sStatus) {
      if (sStatus === "ACT" || sStatus === "590" || sStatus === "Approved") {
        return "Approved";
      }
      return "";
    },

    _oldFormatStatusDesc: function (sStatus) {
      if (!sStatus) {
        return "";
      }
      var mStatusMap = {
        "ACT": "Active",
        "DFT": "Draft",
        "INA": "Inactive",
        "510": "Initiated",
        "520": "Under Approval",
        "590": "Approved"
      };
      return mStatusMap[sStatus] || sStatus;
    },

    formatVersionText: function (sVersionActive) {
      if (!sVersionActive) {
        return "";
      }
      var mVersionMap = {
        "Y": "Active",
        "I": "Draft",
        "N": "Inactive",
        "G": "Bulk Update",
        "F": "Future"
      };
      return mVersionMap[sVersionActive] || sVersionActive;
    },

    formatVersionState: function (sVersionActive) {
      if (sVersionActive === "Y") {
        return "Success";
      }
      if (sVersionActive === "I") {
        return "Warning";
      }
      if (sVersionActive === "N") {
        return "Error";
      }
      return "None";
    },

    formatDateTime: function (sTimestamp) {
      if (!sTimestamp) {
        return "-";
      }
      try {
        var oDate = new Date(sTimestamp);
        if (isNaN(oDate.getTime())) {
          return sTimestamp;
        }
        var oDateFormat = DateFormat.getDateTimeInstance({
          pattern: "dd.MM.yyyy HH:mm:ss"
        });
        return oDateFormat.format(oDate);
      } catch (e) {
        return sTimestamp;
      }
    }
  });
});
