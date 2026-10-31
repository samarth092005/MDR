sap.ui.define([
  "sap/ui/core/Component",
  "sap/ui/core/ComponentContainer"
], function (Component, ComponentContainer) {
  "use strict";

  Component.create({
    name: "com.intapptics.zmdraccountreport"
  }).then(function (component) {
    new ComponentContainer({
      component: component,
      height: "100%"
    }).placeAt("content");
  });
});
