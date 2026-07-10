sap.ui.define([
    "sap/ui/core/mvc/Controller"
],
    function (Controller) {
        "use strict";

        return Controller.extend("com.intapptics.zmdrcntrlcmn.controller.BaseController", {
            /** 
             * Convenience method for accessing the router
             * 
             * @public
             * @returns {sap.ui.core.routing.Router} the router of this component
             * 
             */
            fn_getRouter: function () {
                return sap.ui.core.UIComponent.getRouterFor(this);
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
            fn_setGlobalModel(oModel, sName) {
                return this.getOwnerComponent().setModel(oModel, sName);
            },

            /** 
             * Convenience method to get resource model
             * 
             * @public
             * @returns {sap.ui.model.resource.ResourceModel} the resource model of the component
             * 
             */
            fn_getResourceBundle: function () {
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

            /**
             * Convenience method to open busy dialog
             * 
             * @public
             * 
             */
            fn_openBusyDialog: function () {
                this.getOwnerComponent()._oGlobalBusyDialog.open();
            },

            /**
             * Convenience method to close busy dialog
             * 
             * @public
             * 
             */
            fn_closeBusyDialog: function () {
                this.getOwnerComponent()._oGlobalBusyDialog.close();
            },

            /**
             * Convenience to show error message
             * 
             * @public
             * @param {string} sDetails Error message in case of any error
             */
            fn_showServiceError: function(sDetails) {
                this.getOwnerComponent()._oErrorHandler._showServiceError(sDetails);
            }
        });
    }
);
