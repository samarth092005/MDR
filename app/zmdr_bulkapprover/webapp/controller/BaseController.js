sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/m/MessageBox",
    "sap/m/library",
    "sap/m/BusyDialog",
  ],
  function (Controller, UIComponent, MessageBox, mobileLibrary, BusyDialog) {
    "use strict";
    var oGlobalBusyDialogArray = [];
    return Controller.extend(
      "com.intapptics.mdbulkapprover.controller.BaseController",
      {
        getRouter: function () {
          return UIComponent.getRouterFor(this);
        },
        getModel: function (sName) {
          return this.getView().getModel(sName);
        },
        setModel: function (oModel, sName) {
          return this.getView().setModel(oModel, sName);
        },
        /**
         * Convenience method for getting local view model by name
         *
         * @public
         * @param {string} sName the model name
         * @returns {sap.ui.mvc.View} the view instance
         *
         */
        fn_getLocalModel(sName) {
          return this.getView().getModel(sName);
        },

        /**
         * Convenience method for setting local view model by name
         *
         * @public
         * @param {sap.ui.model.Model} oModel the model instance
         * @param {string} sName the model name
         * @returns {sap.ui.mvc.View} the view instance
         *
         */
        fn_setLocalModel(oModel, sName) {
          return this.getView().setModel(oModel, sName);
        },

        /**
         * Convenience method for getting any global component model by name
         *
         * @public
         * @param {string} sName the model name
         * @returns {sap.ui.mvc.View} the view instance
         *
         */
        fn_getGlobalModel(sName) {
          return this.getOwnerComponent().getModel(sName);
        },

        /**
         * Convenience method for setting any global component model by name
         *
         * @public
         * @param {sap.ui.model.Model} oModel the model instance
         * @param {string} sName the model name
         * @returns {sap.ui.mvc.View} the view instance
         *
         */
        fn_setLocalModel(oModel, sName) {
          return this.getOwnerComponent().setModel(oModel, sName);
        },

        /**
         * Convenience method to get resource model
         *
         * @public
         * @returns {sap.ui.model.resource.ResourceModel} the resource model of the component
         *
         */
        getResourceBundle: function () {
          return this.fn_getGlobalModel("i18n").getResourceBundle();
        },

        /**
         * Convenience method to get the log variable reference
         *
         * @public
         * @returns {sap.base.Log} the log reference of the component
         *
         */
        fn_getLogReference: function () {
          return this.getOwnerComponent()._oLog;
        },
        showServiceError: function (sDetails) {
          var oResponseText, oError;
          //If the message box is already open exist from the method without opening any further message box.
          if (this._bMessageOpen) {
            return;
          }
          this._bMessageOpen = true;
          //check if custom error or generic error
          if (sDetails.statusCode === "400") {
            this._sErrorText =
              this.getResourceBundle().getText("customErrorText");
            oResponseText - JSON.parse(sDetails.responseText);
            if (oResponseText.error !== "") {
              oError = oResponseText.error.message.value;
            } else {
              oError = sDetails;
            }
          } else {
            oError = sDetails;
          }
          //Open the message box with the required details
          MessageBox.error(this._sErrorText, {
            id: "serviceErrorMessageBox",
            details: oError,
            actions: [MessageBox.Action.CLOSE],
            onClose: function () {
              this._bMessageOpen = false;
            }.bind(this),
          });
        },
        fn_showMessage: function (sMessageType, sMessageDetails) {
          if (sMessageType === "error") {
            MessageBox.error(sMessageDetails);
          } else {
            MessageBox.information(sMessageDetails);
          }
        },
        openBusyDialog: function () {
          //Open the busy dialog when the view is loaded and data is proessing
          var oGlobalBusyDialog = new BusyDialog();
          oGlobalBusyDialogArray.push(oGlobalBusyDialog);
          oGlobalBusyDialog.open();
          return oGlobalBusyDialogArray;
        },
        closeBusyDialog: function (oGlobalBusyDialogArray) {
          if (oGlobalBusyDialogArray !== undefined) {
            if (oGlobalBusyDialogArray.length !== 0) {
              oGlobalBusyDialogArray.forEach(function (oBusyDialog) {
                oBusyDialog.close();
              }.bind(this));
            }
            oGlobalBusyDialogArray = [];
          }
        },
      }
    );
  }
);  