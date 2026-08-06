sap.ui.define(
    [
      "./BaseController",
      "sap/m/MessageBox",
      "sap/m/Text",
      "sap/m/library",
      "jquery.sap.global",
      "sap/m/Dialog",
      "sap/m/Label",
      "sap/m/TextArea",
      "sap/m/Button",
      "sap/ui/model/json/JSONModel",
      "sap/ui/model/Filter",
      "sap/ui/model/FilterOperator",
    ],
    function (
      BaseController,
      MessageBox,
      Text,
      mobileLiabrary,
      JQuery,
      Dialog,
      Label,
      TextArea,
      Button,
      JSONModel,
      Filter,
      FilterOperator
    ) {
      "use strict";
  
      //shortcut
      var ButtonType = mobileLiabrary.ButtonType;
      var DialogType = mobileLiabrary.DialogType;
  
      return BaseController.extend(
        "com.intapptics.zmdrbulkapprover.controller.BulkApprover",
        {
          //Define Global Variables
          self: undefined,
          categoryName: undefined,
          tableName: undefined,
          dataload: undefined,
          futureVer: "N",
          preserveNull: "N", // overwrite with Null
          finalData: undefined,
          _timeout: undefined,
          InvalidDataModel: undefined,
          futureAllowed: undefined,
          workflowReq: undefined,
          filename: undefined,
          dadApprovers: undefined,
          tableappr: undefined,
          ReqEmailId: undefined,
          validRecordCount: undefined,
          workflowidentered: undefined,
  
          onInit: function () {
            var category = [],
              temp = [],
              filteredCategory = [],
              uniqueCat = [];
  
            var oModel = new JSONModel();
            self = this;
            self.oView = this.getView();
  
            var params = self
              .getOwnerComponent()
              .getComponentData().startupParameters;
  
            self.workflowId = params.sWorkflowID[0];
            // self.workItemId = params.WIID[0];
  
            var oDataModel = this.getOwnerComponent().getModel();
            var d = {};
  
            //   if (self.updatezflag === "Y" && self.role === "Z_SUUPORT_TEAM") {
            //     self.getView().byId("mst_header").setVisible(true);
            //     self
            //       .getView()
            //       .byId("mst_header")
            //       .setText(
            //         "Update will be applicable to z tableonly. Standard table will not be updated on approval."
            //       );
            //   } else {
            //     self.getView().byId("mst_header").setVisible(false);
            //     self
            //       .getView()
            //       .byId("mst_header")
            //       .setText(
            //         "Update will be applicable to z tableonly. Standard table will not be updated on approval."
            //       );
            //   }
  
            d.Workflowid = self.workflowId;
            // d.WorkitemId = self.workItemId;
            //d.ActualAgent = self.oUserId;
            d.Action = "RESERVE";
  
            self.fn_showBusyIndicator(oDataModel);
            oDataModel.create("/ReserveWorkItemSet", d, {
              method: "POST",
              success: function (oData, oResponse) {
                var msg = oResponse.headers["sap-message"];
                var msg_parse = JSON.parse(msg);
                var sseverity = msg_parse.severity;
                if (sseverity === "error") {
                  var smsg = msg_parse.message;
                  self.getView().byId("btn_approve").setVisible(false);
                  self.getView().byId("btn_reject").setVisible(false);
                  self.getView().byId("taskCompletedMsg").setVisible(false);
                  self.getView().byId("taskCompletedMsg").setText(smsg);
                  self.getView().byId("form_bulkappr").setVisible(false);
                } else {
                  self.getView().byId("txt_category").setText(oData.Category);
                  self.getView().byId("txt_table").setText(oData.Tablename);
                  self.getView().byId("txt_wfid").setText(self.workflowId);
                  self.getView().byId("form_bulkappr").setVisible(true);
                  self.getView().byId("txt_tabledesc").setText(oData.Tabledesc);

                  self.TableName  = oData.Tablename;
                  self.Versioned = oData.Isversioned;// === true ? 'Y':'N';
                  self.role = oData.Requestorrole;


                  //remarks
                  self.remarks = oData.Requestorremarks;
                  self.ReqEmailId = oData.Requestoremailid;
                  self.RequesterId = oData.Requestorid;
                  self.requesterName = oData.Requestorname;
                  self.approveemail = oData.Approveremail;
                  self.approverremarks = oData.Approverremarks;
                  self.approvallevel = oData.Approverlevel;
                  self.updatezflag = oData.Updateztabonly;
                  self.isOverwrtwithnull = oData.Isoverwritewithnull;
                  self.getView().byId("txt_reqid").setText(self.RequesterId);
                  self.getView().byId("txt_reqemail").setText(self.ReqEmailId);
                  self.getView().byId("txt_reqremarks").setText(self.remarks);
                  self.getView().byId("txt_approver").setText(self.approveemail);
                  self.getView().byId("txt_approverremarks").setText(self.approverremarks);
                  self.getView().byId("txt_reqname").setText(self.requesterName);

                  if (self.approvallevel == "0") {
                    // self.fetchRemarks("REQUESTER");
                     self.getView().byId("form_approver").setVisible(false);
                     self.getView().byId("form_approverremarks").setVisible(false);
                     self.getView().byId("btn_reject").setVisible(true);
                     self.getView().byId("btn_approve").setVisible(true);
                   }
                   if (self.approvallevel == "2") {
                     //self.fetchRemarks(encodeURIComponent("FUNCTIONAL APPROVER"));
                     self.getView().byId("form_approver").setVisible(true);
                     self.getView().byId("form_approverremarks").setVisible(true);
                     self.getView().byId("form_approver").setLabel("Functional Approver Id");
                     self.getView().byId("form_approverremarks").setLabel("Functional Approver Comments");
                     self.getView().byId("btn_reject").setVisible(true);
                     self.getView().byId("btn_approve").setVisible(true);
                   }
                   if (self.approvallevel == "3") {
                     //self.fetchRemarks("APPROVER");
                     self.getView().byId("form_approver").setVisible(true);
                     self.getView().byId("form_approverremarks").setVisible(true);
                     self.getView().byId("form_approver").setLabel("Approver Id");
                     self.getView().byId("form_approverremarks").setLabel("Approver Comments");
                     self.getView().byId("btn_resolve").setVisible(true);
                     self.getView().byId("btn_abandon").setVisible(true);
                   }

                }
  
                self.fn_closeBusyIndicator(oDataModel);
              },
              error: function (oError) {
                self.fn_closeBusyIndicator(oDataModel);
                MessageBox.show(
                  "Error in getting request",
                  MessageBox.Icon.ERROR,
                  "Error"
                );
              },
            });
  
           /* oDataModel.read(
              "/InitialConfigAllSet(Tablename='" +
                self.tableName +
                "',Requestersaprole='" +
                self.role +
                "')",
              {
                success: function (oData, oResponse) {
                  self.getView().byId("txt_tabledesc").setText(oData.Description);
                },
                error: function (oError) {},
              }
            ); */

          },
  
          putBackWorkItem: function (oEvent) {
            var oDataModel = this.getOwnerComponent().getModel();
            var oEntry = {};
            oEntry.WorkitemId = self.workItemId;
            //oEntry.ACTUAL_AGENT = self.oUserId;
            oEntry.Action = "PUTBACK";
  
            oDataModel.create("/ReserveWorkItemSet", oEntry, {
              success: function (oData, oResponse) {
                var oMsg = oResponse.headers["sap-message"];
                var oParseMsg = JSON.parse(oMsg);
                var oSev = oParseMsg.severity;
                if (oSev === "error") {
                  var sMsg = oParseMsg.message;
                  self.getView().byId("btn_putback").setVisible(false);
                  self.getView().byId("btn_approve").setVisible(false);
                  self.getView().byId("btn_reject").setVisible(false);
                  self.getView().byId("taskCompletedMsg").setVisible(false);
                  self.getView().byId("taskCompletedMsg").setText(sMsg);
                  self.getView().byId("form_bulkappr").setVisible(false);
                } else {
                  self.getView().byId("btn_putback").setEnabled(false);
                  self.getView().byId("btn_approve").setVisible(false);
                  self.getView().byId("btn_reject").setVisible(false);
                  MessageBox.show(
                    "Request has been released successfully and available in My Inbox for all potential owners. Process Reference Number: " +
                      self.WorkflowId,
                    "Success"
                  );
                }
              }.bind(this),
              error: function (oError) {
                MessageBox.show(
                  "Error in Putback request",
                  MessageBox.Icon.ERROR,
                  "Error"
                );
              },
            });
          },
  
          handleDownloadPress: function (oEvent) {
            var currentdate = new Date();
            var datetime =
              currentdate.getFullYear() +
              "" +
              ("0" + (currentdate.getMonth() + 1)).slice(-2) +
              "" +
              ("0" + currentdate.getDate()).slice(-2) +
              "" +
              currentdate.getHours() +
              "" +
              currentdate.getMinutes() +
              "" +
              currentdate.getSeconds();
  
            var oDataModel = self.getOwnerComponent().getModel();
            var lv_oDataURL = oDataModel.sServiceUrl;
            var wfid = self.workflowId;
            var lv_version = self.Versioned;

            if (lv_version === "Y") {
              var lv_ver = "G";
              if (self.futureVer === "Y") {
                lv_ver = "F";
              } else {
                lv_ver = "G";
              }
  
              var entitySet_Url =
                lv_oDataURL +
                "/ExportReqDataSet?$filter=(Tablename eq '" +
                self.TableName +
                "' and Versionactive eq '" +
                lv_ver +
                "' and Workflowid eq '" +
                wfid +
                "' and Requesterrole eq '" +
                self.role +
                "') &$expand=NAVOUTDATA,NAVOUTOLDDATA,NAVOUTWORKFLOWREMARKS,NAVOUTRETMESSAGE";
  
              OData.read(
                entitySet_Url,
                function (oData) {
                  var lv_NAVOUTDATA = oData.results[0].NAVOUTDATA.results;
                  var lv_NAVOUTOLDDATA = oData.results[0].NAVOUTOLDDATA.results;
                  var lv_NAVOUTRETMESSAGES =
                    oData.results[0].NAVOUTRETMESSAGE.results;
  
                  var oJSONModel = new JSONModel(lv_NAVOUTDATA);
                  self.getOwnerComponent().setModel(oJSONModel, "oJSONModel");
  
                  var wb = XLSX.utils.book_new();
                  wb.Props = {
                    Title: self.TableName,
                    Subject: self.TableName,
                    Author: "MDR",
                    CreationDate: new Date(),
                  };
                  wb.SheetNames.push("Requested Data");
                  var ws_data = [];
                  for (var i = 0; i < lv_NAVOUTDATA.length; i++) {
                    ws_data.push(lv_NAVOUTDATA[i].Data.split("Â«"));
                  }
  
                  var wsData = XLSX.utils.aoa_to_sheet(ws_data);
                  wb.Sheets["Requested Data"] = wsData;
                  var wbout = XLSX.write(wb, {
                    bookType: "xlsx",
                    type: "binary",
                  });
  
                  function s2ab(s) {
                    var buf = new ArrayBuffer(s.length);
                    var view = new Uint8Array(buf);
                    for (var i = 0; i < s.length; i++)
                      view[i] = s.charCodeAt(i) & 0xFF;
                    return buf;
                  }
                  saveAs(
                    new Blob([s2ab(wbout)], {
                      type: "application/octet-stream",
                    }),
                    self.TableName + "_RequestedRecords_" + wfid + "_" + datetime + ".xlsx"
                  );
                },
                function (oError) {
                  var lvErr = oError.message;
                  MessageBox.show("oData Error: " + lvErr);
                }
              );
            } else if (lv_version === "N") {
              var entitySet_Url =
                lv_oDataURL +
                "/BULKTempSet?filter=(Tablename eq '" +
                self.tableName +
                "' and WorkflowId eq'" +
                wfid +
                "')";
  
              oDataModel.read(
                entitySet_Url,
                function (oData) {
                  var lv_NAVOUTDATA = oData.results;
                  var oJSONModel = new JSONModel(lv_NAVOUTDATA);
                  self.getOwnerComponent().getModel(oJSONModel, "oJSONModel");
  
                  var wb = XLSX.utils.book_new();
                  wb.Props = {
                    Title: self.tableName,
                    Subject: self.tableName,
                    Author: "MDR",
                    CreationDate: currentdate,
                  };
                  wb.SheetNames.push(self.tableName);
                  var excel_data = [];
                  for (var i = 0; i < lv_NAVOUTDATA.length; i++) {
                    if (i == 0) {
                      excel_data.push(lv_NAVOUTDATA[i].BulkData + "Â«ActionType");
                    } else {
                      excel_data.push(
                        lv_NAVOUTDATA[i].BulkData +
                          "Â«" +
                          lv_NAVOUTDATA[i].ActionType
                      );
                    }
                  }
                  var ws_data = [];
                  for (var i = 0; i < lv_NAVOUTDATA.length; i++) {
                    ws_data.push(excel_data[i].split("Â«"));
                  }
  
                  var wsData = XLSX.utils.aoa_to_sheet(ws_data);
                  wb.Sheets["Requested Data"] = wsData;
                  var wbout = XLSX.write(wb, {
                    bookType: "xlsx",
                    type: "binary",
                  });
  
                  function s2ab(s) {
                    var buf = new ArrayBuffer(s.length);
                    var view = new Uint8Array(buf);
                    for (var i = 0; i < s.length; i++)
                      view[i] = s.charCodeAt(i) & 0xff;
                    return buf;
                  }
                  saveAs(
                    new Blob([s2ab(wbout)], {
                      type: "application/octet-stream",
                    }),
                    self.tableName + "_RequestedRecords_" + datetime + ".xlsx"
                  );
                },
                function (oError) {
                  var lv_err = oError.message;
                  MessageBox.show("Error in Non Version Excel " + lv_err);
                }
              );
            }
          },
  
          fetchRemarks: function (currentStage) {
            var oDataModel = self.getOwnerComponent().getModel();
            oDataModel.read(
              "/UserRemarksSet(EntityId='',EntityName='" +
                self.tableName +
                "',CrrentStage='" +
                currentStage +
                "',WorflowId='" +
                self.workflowId +
                "')",
              {
                success: function (oData, oResponse) {
                  self.remarks = oData.RequesterComments;
                  self.ReqEmailId = oData.ReqEmailId;
                  self.RequesterId = oData.RequesterId;
                  self.requesterName = oData.requesterName;
                  self.approveemail = oData.approveemail;
                  self.approverremarks = oData.approverremarks;
                  self.getView().byId("txt_reqid").setText(self.RequesterId);
                  self.getView().byId("txt_reqemail").setText(self.ReqEmailId);
                  self.getView().byId("txt_reqremarks").setText(self.remarks);
                  self.getView().byId("txt_approver").setText(self.approveemail);
                  self
                    .getView()
                    .byId("txt_approverremarks")
                    .setText(self.approverremarks);
                  self.getView().byId("txt_reqname").setText(self.requesterName);
                },
                error: function (oError) {},
              }
            );
          },
  
          onActionButtonPress: function (oEvent) {
            var sButtonAction = oEvent.getSource().data("buttonAction");
            var wfId = self.workflowId;
            var action = "";
            if (sButtonAction === "APPROVED") {
              action = "approve";
            } else if (sButtonAction === "REJECTED") {
              action = "reject";
            }
            var oDialog = new Dialog({
              title: "Remarks",
              type: "Message",
              content: [
                new Label({
                  text: "Business Justification",
                  labelFor: "submitDialogTextArea",
                  required: true,
                }),
                new TextArea("submitDialogTextArea", {
                  liveChange: function (oEvent) {
                    var sText = oEvent.getParameter("value");
                    var parent = oEvent.getSource().getParent();
                    var remarks = oEvent.getSource().getValue().length;
                    oEvent
                      .getSource()
                      .setValueState(remarks > 300 ? "Warning" : "None");
                    parent
                      .getBeginButton()
                      .setEnabled(sText.length > 0 && sText.length < 300);
                  },
                  width: "100%",
                  placeholder: "Add Remarks",
                  showExceededText: true,
                  maxLength: 300,
                }),
              ],
              beginButton: new Button({
                type: ButtonType.Emphasized,
                text: "Submit",
                enabled: false,
                press: function () {
                  var sText = sap.ui
                    .getCore()
                    .byId("submitDialogTextArea")
                    .getValue();
                  self.sValue = sText;
                  self.handleDialogSubmitPress(wfId, sButtonAction, sText);
                  oDialog.close();
                },
              }),
              endButton: new Button({
                text: "Cancel",
                press: function () {
                  oDialog.close();
                },
              }),
              afterClose: function () {
                oDialog.destroy();
              },
            });
            oDialog.open();
          },
  
          handleDialogSubmitPress: function (workflowId, actionTaken, remarks) {
            self = this;
            var lv_versioned = self.versioned;
            var oDataModel = self.getOwnerComponent().getModel();
            var lv_oDataURL = oDataModel.sServiceUrl;
            var wfid = workflowId;
  
            if (self.Versioned === "Y") {
              var lv_ver = "G";
              if (self.futureVer === "Y") {
                lv_ver = "F";
              } else {
                lv_ver = "G";
              }
            } else if (self.Versioned === "N") {
              lv_ver = "N";
            }
  
            if (actionTaken === "Abandon") {
              self.finalaction = "Abandon";
              actionTaken = "REJECTED";
            }
  
            if (self.approvallevel == "0") {
              var entitySet_Url =
                lv_oDataURL +
                "/ApproverHeaderSet?$filter=(Wfstage eq 'LEVEL1' and Tablename eq '" +
                self.TableName +
                "' and Action eq '" +
                actionTaken +
                "' and Operationtype eq 'BULK' and Workflowid eq '" +
                wfid +
                "' and Version eq '" +
                lv_ver +
                "' and Isoverwrtwtnull eq '" +
                self.isOverwrtwithnull +
                "' and Requesterrole eq '" +
                self.role +
                "' and Updateztabonly eq '" +
                self.updatezflag +
                "' and WorkItemId eq '" +
                self.workItemId +
                "' and Approverremarks eq '" +
                remarks +
                "')&$expand=NAVOUTARETMESSAGE";
            } else {
              var entitySet_Url =
                lv_oDataURL +
                "/ApproverHeaderSet?$filter=(Tablename eq '" +
                self.TableName +
                "' and Action eq '" +
                actionTaken +
                "' and Operationtype eq 'BULK' and Workflowid eq '" +
                wfid +
                "' and Version eq '" +
                lv_ver +
                "' and Isoverwrtwtnull eq '" +
                self.isOverwrtwithnull +
                "' and requesterrole eq '" +
                self.Requesterrole +
                "' and updateztabpnly eq '" +
                self.updatezflag +
                "' and WorkItemId eq '" +
                self.workItemId +
                "' and Approverremarks eq '" +
                remarks +
                "')&$expand=NAVOUTARETMESSAGE";
            }
  
            OData.read(
              entitySet_Url,
              function (oData) {
                //var lv_NAVEMESSAGE = oData.results[0].NAVEMESSAGE.results;
                var lv_NAVOUTARETMESSAGE =
                  oData.results[0].NAVOUTARETMESSAGE.results;
  
               /* var oUserData = self
                  .getOwnerComponent()
                  .getModel("usermodel")
                  .getData();
                self.apprEmailId = oUserData.email;*/
  
                var lv_errTxt = oData.results[0].NAVOUTARETMESSAGE.results[0].Message;
                var lv_errType = oData.results[0].NAVOUTARETMESSAGE.results[0].Type;
  
                if (lv_errType !== "E") {
                  
                  self.getView().byId("taskCompletedMsg").setVisible(true);
  
                        self.getView().byId("taskCompletedMsg").setText("Task is completed");
                        self.getView().byId("tb_footerbulkappr").setVisible(false);
                        self.getView().byId("form_bulkappr").setVisible(false);
                        self.getView().byId("btn_putback").setVisible(false);
                }
                else if (lv_errType === "E"){
                  MessageBox.error("Action could not be completed, " + lv_errTxt);
                }
  
                /*
                if (lv_NAVOUTARETMESSAGE.length !== 0) {
                  var lv_ErrMsg = "";
                  for (var i = 0; i < lv_NAVOUTARETMESSAGE.length; i++) {
                    if (lv_ErrMsg === "") {
                      lv_ErrMsg = lv_NAVOUTARETMESSAGE[i].Message;
                    } else {
                      lv_ErrMsg =
                        lv_ErrMsg + " , " + lv_NAVOUTARETMESSAGE[i].Message;
                    }
                  }
                  MessageBox.error("Action could not be completed, " + lv_errTxt);
                } else {

                  
                  if (lv_errType !== "E") {
                    if (self.finalaction === "Abandon") {
                      actionTaken = "Abandon";
                    }
                    
                    var oDataModel = self.getOwnerComponent().getModel();
                    var oEntry = {};
                    oEntry.WorkflowId = self.workflowId;
                    oEntry.ApproverId = self.oUserId;
                    oEntry.approveemail = self.apprEmailId;
                    oEntry.approverremarks = remarks;
                    oEntry.Action = actionTaken;
                    oEntry.ActionType = "APPROVE";
  
                    oDataModel.create("/CompleteWorkItemSet", oEntry, {
                      method: "POST",
                      success: function (oData, oResponse) {
                        self
                          .getOwnerComponent()
                          .getView()
                          .byId("taskCompletedMsg")
                          .setVisible(true);
  
                        self
                          .getOwnerComponent()
                          .getView()
                          .byId("taskCompletedMsg")
                          .setText("Task is completed");
                        self
                          .getOwnerComponent()
                          .getView()
                          .byId("tb_footerbulkappr")
                          .setVisible(false);
                        self
                          .getOwnerComponent()
                          .getView()
                          .byId("form_bulkappr")
                          .setVisible(false);
                        self
                          .getOwnerComponent()
                          .getView()
                          .byId("btn_putback")
                          .setVisible(false);
                      },
                      error: function () {
                        alert("Error Occurred");
                      },
                    });
                  } else {
                    MessageBox.show("Action could not be completed");
                  }
                  
                }*/
              },
              function (oError) {
                var lv_txt = oError.message;
                self._MessageManager.addMessages(
                  new Message({
                    message: "Error while approving request: " + lv_txt,
                    type: MessageType.Error,
                    additionalText: "Workflow:" + wfid,
                    processor: self.getView().getModel("oJSONModel"),
                  })
                );
              }
            );
          },
  
          onTriggerWF: function () {
            var oDataModel = self.getOwnerComponent().getModel("validatedata");
  
            var oEntry = {};
            oEntry.futureAllowed = self.futureVer;
            oEntry.Versioned = self.versioned;
            oEntry.Category = self.categoryName;
            oEntry.TableName = self.tableName;
            oEntry.WorkflowId = self.WorkflowId.toString();
            oEntry.RequesterId = self.oUserId;
            oEntry.ReqEmailId = self.ReqEmailId;
            oEntry.ValidRecordsCount = self;
            filesaver.ValidRecordsCount;
            oEntry.RequesterComments = self.sValue;
            oEntry.DeleteFlag = "N";
            oEntry.Preservenull = self.Preservenull;
            oEntry.OperationType = "BULK UPDATE";
            oEntry.Requesterrole = self.RoleName;
            oEntry.updatezonly = self.updateztabonly;
  
            oEntry.ApproverStage = "APPROVER";
            oEntry.System = "INTAPPTICS";
            oEntry.Hierarchy = "BULK UPDATE";
            if (self.tableappr == "Y") {
              self.SubClass = self.tableName;
            } else {
              self.SubClass = self.categoryName;
            }
  
            oDataModel.create("/TrigBulkUploadWFSet", oEntry, {
              method: "POST",
              success: function (oData, oResponse) {
                console.log("WF Triggered");
              },
              error: function (oError) {
                alert("Error occurred while triggering WF");
              },
            });
          },
  
          handleReloadPress: function () {
            window.location.reload();
          },
  
          validateWorkflowId: function (oEvent) {
            if (self.byId("inp_workflow").getVisible()) {
              var iWorkflowId = self.byId("inp_workflow").getValue();
  
              if (iWorkflowId === "" || iWorkflowId === null) {
                return true;
              } else {
                var compare = /^[0-9]+$/;
                if (iWorkflowId.match(compare)) {
                  if (iWorkflowId.length > 10) {
                    return true;
                  } else {
                    self.getView().byId("cb_workflow").setEnabled(false);
                    self.getView().byId("inp_workflow").setEnabled(false);
                    return false;
                  }
                } else {
                  return true;
                }
              }
            } else {
              return false;
            }
          },
  
          arrayBufferToBase64: function (buffer) {
            var binary = "";
            var bytes = new Uint8Array(buffer);
            var len = bytes.byteLength;
            for (var i = 0; i < len; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            return window.btoa(binary);
          },
  
          base64ToArrayBuffer: function (base64) {
            var binary_string = window.atob(base64);
            var len = binary_string.length;
            var bytes = new Uint8Array(len);
            for (var i = 0; i < len; i++) {
              bytes[i] = binary_string.charCodeAt(i);
            }
            return bytes.buffer;
          },
  
          _replaceNewLineChar: function (oInput) {
            var result = oInput;
            if (isNaN(oInput)) {
              var pattern = /(?:\\[rn]|[\r\n]+)+/g;
              var replacement = "";
              result = oInput.replace(pattern, replacement);
            }
            return result;
          },
  
          //function to show Busy Indicator
          fn_showBusyIndicator: function (oModelName) {
            var oGlobalBusyDialog;
            oModelName.attachRequestSent(
              function () {
                oGlobalBusyDialog = this.openBusyDialog();
              }.bind(this)
            );
            oModelName.attachRequestCompleted(
              function () {
                this.closeBusyDialog(oGlobalBusyDialog);
              }.bind(this)
            );
          },
          //function to close Busy Indicator
          fn_closeBusyIndicator: function (oModelName) {
            var oGlobalBusyDialog;
            oModelName.attachRequestCompleted(
              function () {
                this.closeBusyDialog(oGlobalBusyDialog);
              }.bind(this)
            );
          },
        }
      );
    }
  );  