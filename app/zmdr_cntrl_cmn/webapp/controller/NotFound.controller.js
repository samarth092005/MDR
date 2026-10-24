sap.ui.define([
    "com/intapptics/zmdrcntrlcmn/controller/BaseController",
    "sap/m/library"
],
    function (BaseController, mobileLibrary) {
        "use strict";

        var URLHelper = mobileLibrary.URLHelper;

        return BaseController.extend("com.intapptics.zmdrcntrlcmn.controller.NotFound", {
            /**
             * Lifecycle Methods
             */

            /**
             * Called when the controller is instantiated and its view controls (if available) are already created.
             * Can be used to modify the view before it has been displayed, to bind event handlers and to do other one-time initialization
             * 
             * @memberof com.intapptics.zmdrcntrlcmn.view.NotFound
             */
            // onInit: function () {
            //
            // },

            /**
             * This hook method is invoked before the controller's view is re-rendered
             * (Not before the first rendering! onInit() is used for that one!)
             * 
             * @memberof com.intapptics.zmdrcntrlcmn.view.NotFound
             */
            // onBeforeRendering: function() {
            //
            // },

            /**
             * Called when the view has been rendered (so its HTML is part of the document). Post rendering manipulations 
             * of the HTML could be done here. This hook is the same one that SAPUI5 controls get after being rendered.
             * 
             * @memberof com.intapptics.zmdrcntrlcmn.view.NotFound
             */
            // onAfterRendering: function() {
            //
            // },

            /**
             * Called when the controller is destroyed. Use this one to free resources and finalize activities.
             * 
             * @memberof com.intapptics.zmdrcntrlcmn.view.NotFound
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
             * @memberof com.intapptics.zmdrcntrlcmn.view.NotFound
             * @public
             * 
             */
            onPress_contactUs: function () {
                // Log entrance into method
                this.fn_getLogReference().info("Not Found Controller: Entering onPress_contactUs method");

                /** Method Implementation */
                URLHelper.triggerEmail("intapptics@gmail.com");

                // Log exit from method
                this.fn_getLogReference().info("Not Found Controller: Exiting onPress_contactUs method");
            }
        });
    }
);