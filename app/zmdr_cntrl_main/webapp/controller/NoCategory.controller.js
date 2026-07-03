sap.ui.define([
    "com/intapptics/zmdrcntrlmain/controller/BaseController",
    "sap/m/library"
],
    function (BaseController, mobileLibrary) {
        "use strict";

        // Get reference of the mobile library URL Helper
        var URLHelper = mobileLibrary.URLHelper;

        return BaseController.extend("com.intapptics.zmdrcntrlmain.controller.NoCategory", {
            /**
             * Lifecycle Methods
             */

            /**
             * Called when the controller is instantiated and its view controls (if available) are already created.
             * Can be used to modify the view before it has been displayed, to bind event handlers and to do other one-time initialization
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.NoCategory
             */
            // onInit: function () {
            //
            // },

            /**
             * This hook method is invoked before the controller's view is re-rendered
             * (Not before the first rendering! onInit() is used for that one!)
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.NoCategory
             */
            // onBeforeRendering: function() {
            //
            // },

            /**
             * Called when the view has been rendered (so its HTML is part of the document). Post rendering manipulations 
             * of the HTML could be done here. This hook is the same one that SAPUI5 controls get after being rendered.
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.NoCategory
             */
            // onAfterRendering: function() {
            //
            // },

            /**
             * Called when the controller is destroyed. Use this one to free resources and finalize activities.
             * 
             * @memberof com.intapptics.zmdrcntrlmain.view.NoCategory
             */
            // onExit: function() {
            //
            // },


            /**
            * Event Handlers
            */

           /**
            * Event handler for the contact support button press
            * 
            * @param {sap.ui.base.Event} oEvent
            * @memberof com.intapptics.zmdrcntrlmain.view.NoCategory
            * @public
            * 
            */
            onPress_btnContactSupport: function () {
                // Log entrance into method
                this.fn_getLogReference().info("No Category Controller: Entering onPress_btnContactSupport method");

                /** Method Implementation */                
                // Trigger email to support
                URLHelper.triggerEmail("intapptics@gmail.com");
                
                // Log exit from method
                this.fn_getLogReference().info("No Category Controller: Exiting onPress_btnContactSupport method");
            }
        });
    }
);