sap.ui.define([
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
    "sap/ui/model/FilterOperator"
], (
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
) => {
    "use strict";

    //shortcut
    var ButtonType = mobileLiabrary.ButtonType;
    var DialogType = mobileLiabrary.DialogType;

    return BaseController.extend("com.intapptics.zmdrbulkload.controller.BulkLoad", {
        //Define Global Variables
        self: undefined,
        array: [],
        configArray: [],
        noOfColumns: undefined,
        columnCount: undefined,
        rowDataArr: [],
        categoryName: undefined,
        tableName: undefined,
        dataload: undefined,
        futureVer: "N",
        preserveNull: "N", // overwrite with Null
        finalData: undefined,
        _timeout: undefined,
        InvalidDataModel: undefined,
        temphead: [],
        odataHead: [],
        futureAllowed: undefined,
        workflowReq: undefined,
        filename: undefined,
        dadApprovers: undefined,
        tableappr: undefined,
        ReqEmailId: undefined,
        validRecordCount: undefined,
        workflowidentered: undefined,

        onInit: function () {
            var temp = [],
                filteredCategory = [],
                uniqueCat = [],
                oModel = new JSONModel(),
                oBulkModel,
                oBinding;

            this.getView().byId("table_validresult").setVisible(false);
            this.getView().byId("lbl_warning").setVisible(false);
            this.getView().byId("btn_submit").setVisible(false);
            this.getView().byId("btn_cancel").setVisible(false);
            this.getView().byId("btn_validate").setVisible(false);
            this.getView().byId("btn_reload").setVisible(false);
            this.getView().byId("btn_downloadinvaliddata").setVisible(false);

            oBulkModel = this.getOwnerComponent().getModel();
            oBinding = oBulkModel.bindList("/BulkHdrConfig");
            var oGBusyArray = this.openBusyDialog();
            
            oBinding.requestContexts().then(function (aContexts) {
                this.closeBusyDialog(oGBusyArray);

                // Convert contexts to data objects (replaces oData.results)
                var aResults = aContexts.map(function (oContext) {
                    return oContext.getObject();
                });

                oModel.setData(aResults);
                //Get the comleted config data in an array
                this.array = oModel.getData();
                this.getOwnerComponent().setModel(oModel, "oModel");

                //get all category
                for (var i = 0; i < this.array.length; i++) {
                    temp.push(this.array[i].Category);
                }
                //push to array, unique category
                for (var j = 0; j < temp.length; j++) {
                    if (uniqueCat.indexOf(temp[j]) === -1) {
                        uniqueCat.push(temp[j]);
                    } else {
                        continue;
                    }
                }
                
                // Setting objectName
                for (i = 0; i < uniqueCat.length; i++) {
                    filteredCategory.push({
                        categoryName: uniqueCat[i],
                    });
                }

                var oUniqueCategoryModel = new JSONModel(filteredCategory);

                // Set to the component
                this.getOwnerComponent().setModel(oUniqueCategoryModel, "oUniqueCategoryModel");
            }.bind(this)).catch(function (oError) {
                this.closeBusyDialog(oGBusyArray);
                console.error("Error loading BulkHdrConfig:", oError);
            }.bind(this));
            //     },
            //     error: function (oError) {
            //         self.fn_closeBusyIndicator(oDataModel_Header);
            //     }
            // });

            this.getView().byId("cb_workflow").setVisible(false);
            this.getView().byId("inp_workflow").setVisible(false);
            this.workflowidentered = "";
            this.getView().byId("cb_overwritenull").setVisible(false);
            this.getView().byId("cb_updatezonly").setVisible(false);
        },

        handleUploadComplete: function (oEvent) {
            if (self.rowDataArr.length > 0) {
                if (self.noOfColumns === self.columnCount) {
                    var errors = [];
                    for (var i = 0; i < self.odataHead.length; i++) {
                        if (self.temphead[i] !== self.odataHead[i]) {
                            errors.push(self.temphead[i]);
                            self.getView().byId("btn_validate").setEnabled(false);
                            self.getView().byId("cb_overwritenull").setEnabled(false);
                        }
                    }
                    if (errors.length > 0) {
                        MessageBox.error(
                            "Excel has following invalid column(s) " + errors
                        );
                        self.getView().byId("btn_reload").setVisible(true);
                    } else {
                        self.getView().byId("btn_validate").setVisible(true);
                        self.getView().byId("btn_reload").setVisible(true);
                    }
                } else {
                    MessageBox.error(
                        "Invalid excel, Please download and use the correct template without any modification in the format."
                    );
                    self.getView().byId("btn_validate").setVisible(false);
                    self.getView().byId("btn_reload").setVisible(true);
                }
            } else {
                MessageBox.error("Uploaded excel contains no daat, please check.");
                self.getView().byId("btn_validate").setVisible(false);
                self.getView().byId("btn_reload").setVisible(true);
            }
            //Disable the file uploader
            self.getView().byId("fu_upload").setEnabled(false);
            self.getView().byId("combo_category").setEnabled(false);
            self.getView().byId("combo_tablelist").setEnabled(false);
            this.closeBusyDialog(self.oGlobalBusyDialog);
        },

        onTemplateDownload: function (oEvent) {
            var wb = XLSX.utils.book_new();

            wb.Props = {
                Title: self.tableName,
                Subject: self.tableName,
                Author: "MDR",
                CreatedDate: new Date()
            };
            wb.SheetNames.push(self.tableName);
            var ws_data = [];
            self.odataHead;
            var length = self.odataHead.length;
            var dataStr = [];
            var data = "";
            for (let i = 0; i < length; i++) {
                if (i == length - 1) {
                    data = data + self.odataHead[i];
                } else {
                    data = data + self.odataHead[i] + ";";
                }
            }

            dataStr.push(data);

            ws_data.push(dataStr[0].split(";"));

            var wsData = XLSX.utils.aoa_to_sheet(ws_data);
            wb.Sheets[self.tableName] = wsData;
            var wbout = XLSX.write(wb, {
                bookType: 'xlsx',
                type: 'binary'
            });

            function s2ab(s) {
                var buf = new ArrayBuffer(s.length);
                var view = new Uint8Array(buf);
                for (var i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
                return buf;
            }
            saveAs(new Blob([s2ab(wbout)], {
                type: "application/octet-stream"
            }), self.tableName + '.xlsx');
        },

        onFileUpload: function (oEvent) {
            this._import(
                oEvent.getParameter("files") && oEvent.getParameter("files")[0]
            );

            self.filename = oEvent.getParameter("files")[0].name;

            self.oGlobalBusyDialog = this.openBusyDialog();
        },

        _import: function (file) {
            var self = this;
            if (file && window.FileReader) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    data = e.target.result;
                    var arr = self.arrayBufferToBase64(data);

                    var wb = XLSX.read(arr, {
                        type: "base64",
                    });

                    var tableName = wb.SheetNames;
                    var data = wb.Sheets[tableName[0]];

                    self.format_excel_data(wb.Sheets[wb.SheetNames[0]], data);
                };
                reader.readAsArrayBuffer(file);
            }
        },

        format_excel_data: function (sheet, data) {
            self.temphead = [];
            self.rowDataArr = [];
            var range = XLSX.utils.decode_range(sheet['!ref']);
            self.columnCount = XLSX.utils.decode_range(data['!ref']).e.c + 1;
            var rowData = "";
            var cellDataVal = "";
            for (var rowNum = range.s.r + 1; rowNum <= range.e.r; rowNum++) {
                rowData = "";
                for (var colNum = range.s.c; colNum <= range.e.c; colNum++) {
                    cellDataVal = "";
                    var cellData =
                        sheet[
                        XLSX.utils.encode_cell({
                            r: rowNum,
                            c: colNum,
                        })
                        ];
                    if (cellData !== undefined) {
                        cellDataVal =
                            typeof cellData.v === "string"
                                ? cellData.v.trim()
                                : cellData.v;
                        cellDataVal = this._replaceNewLineChar(cellDataVal);
                    }
                    rowData = rowData + "«" + (cellData ? cellDataVal : '');
                }

                if (self.rowDataArr === undefined) {
                    self.rowDataArr = [];
                }
                var newData = rowData.replaceAll("«", "");
                if (newData !== "") {
                    self.rowDataArr.push(rowData.substring(1));
                }
            }

            var result = self.rowDataArr.filter(
                (o) => !Object.keys(o).every(k => !o[k]));
            self.rowDataArr = result;

            //get excel headers
            for (var colNum = range.s.c; colNum <= range.e.c; colNum++) {
                var headData = sheet[XLSX.utils.encode_cell({ r: 0, c: colNum })];
                self.temphead.push(headData.v);
            }
        },

        handleValidateData: function (oEvent) {
            if (self.validateWorkflowId()) {
                MessageBox.error(
                    "Please enter upto 10 digit number for Workflow Number!"
                );
            } else {
                self.workflowidentered = self.byId("inp_workflow").getValue();

                var aFilters = [];

                var oDataModel1 = self.getOwnerComponent().getModel();

                var oModel1 = new JSONModel();
                var filter = new Filter(
                    "Tablename",
                    FilterOperator.EQ,
                    self.tableName
                );
                var filterStatus = new Filter(
                    "Requeststatus",
                    FilterOperator.EQ,
                    "INPROGRESS"
                );
                aFilters.push(filter);
                aFilters.push(filterStatus);

                oDataModel1.read("/BulkTempSet", {
                    // This call is for non-version table, if any inprogress records for the requested table
                    filters: aFilters,
                    success: function (oData, oResponse) {
                        oModel1.setData(oData.results);
                        if (!oModel1.oData.length > 0) {
                            var oDataModel = self
                                .getOwnerComponent()
                                .getModel();
                            self.dataload = "N";
                            var oEntry = {};
                            var oInData = {};
                            oEntry.Tablename = self.tableName;
                            oEntry.Source = "UI";
                            oEntry.Isdataload = self.dataload;// === 'Y' ? true : false;
                            oEntry.Isoverwritewithnull = self.Preservenull;// === 'Y' ? true : false;
                            oEntry.Isfutureversion = self.futurever;// === 'Y' ? true : false;
                            oEntry.Workflowid = self.workflowidentered;
                            var itemData = [];
                            oEntry.NAVOUTINVALIDDATA = [];
                            var lv_res = {};
                            lv_res.Code = "";
                            lv_res.Message = "";
                            oEntry.NAVOUTINVALIDDATA[0] = lv_res;

                            oEntry.NAVOUTVALIDDATA = [];
                            var lv_res1 = {};
                            lv_res1.Data = "";

                            oEntry.NAVOUTVALIDDATA[0] = lv_res1;

                            oEntry.NAVOUTUPDATEDATA = [];
                            var lv_res2 = {};
                            lv_res2.Data = "";

                            oEntry.NAVOUTUPDATEDATA[0] = lv_res2;

                            oEntry.NAVOUTCREATEDATA = [];
                            var lv_res3 = {};
                            lv_res3.Data = "";

                            oEntry.NAVOUTCREATEDATA[0] = lv_res3;

                            oEntry.NAVOUTHEADER = [];
                            var lv_res4 = {};
                            lv_res4.Createcount = 0;
                            lv_res4.Updatecount = 0;
                            lv_res4.Validcount = 0;
                            lv_res4.Invalidcount = 0;
                            lv_res4.Workflowid = "";
                            lv_res4.Tablename = self.tableName;

                            oEntry.NAVOUTHEADER[0] = lv_res4;

                            for (var i = 0; i < self.rowDataArr.length; i++) {
                                itemData.push({
                                    Data: self.rowDataArr[i],
                                });
                            }

                            oEntry.NAVINDATA = itemData;
                            oEntry.Requestorsaprole = self.rolename;

                            oDataModel.create("/InHeaderSet", oEntry, {
                                method: "POST",
                                success: function (oData, oResponse) {
                                    self.closeBusyDialog();
                                    self.getView().byId("table_validresult").setVisible(true);

                                    var headerData = [];
                                    headerData = oResponse.data.NAVOUTHEADER.results;
                                    var totalCount =
                                        headerData[0].Invalidcount + headerData[0].Validcount;
                                    headerData[0].TotalCount = totalCount;
                                    var oHeaderDataModel = new JSONModel(headerData);
                                    self
                                        .getOwnerComponent()
                                        .setModel(oHeaderDataModel, "oHeaderDataModel");

                                    if (
                                        oResponse.data.NAVOUTINVALIDDATA.results.length !== 0
                                    ) {
                                        self
                                            .getView()
                                            .byId("btn_downloadinvaliddata")
                                            .setVisible(true);
                                        var invalidData = [];

                                        invalidData = oResponse.data.NAVOUTINVALIDDATA.results;
                                        var oInvalidDataModel = new JSONModel(invalidData);
                                        self.InvalidDataModel = oInvalidDataModel;

                                        self
                                            .getOwnerComponent()
                                            .setModel(oInvalidDataModel, "oInvalidDataModel");

                                        if (oResponse.data.NAVOUTVALIDDATA !== null) {
                                            self.finalData =
                                                oResponse.data.NAVOUTVALIDDATA.results;
                                            self.validData =
                                                oResponse.data.NAVOUTVALIDDATA.results;

                                            self.validRecordCount =
                                                oResponse.data.NAVOUTHEADER.results[0].Validcount;

                                            if (self.validRecordCount > 0) {
                                                self.getView().byId("lbl_warning").setVisible(true);
                                                self.getView().byId("btn_submit").setVisible(true);
                                                self.getView().byId("btn_cancel").setVisible(true);
                                            }
                                        } else {
                                            alert(
                                                "No valid records, please upload valid records"
                                            );

                                            //self.getView().byId("").setVisible(true);
                                            //self.getView().byId("").setVisible(true);
                                        }
                                    } else if (
                                        oResponse.data.NAVOUTVALIDDATA.results.length !== 0
                                    ) {
                                        self.getView().byId("lbl_warning").setVisible(true);
                                        self.getView().byId("btn_submit").setVisible(true);
                                        self.getView().byId("btn_cancel").setVisible(true);
                                        self.finalData = oResponse.data.NAVOUTVALIDDATA.results;
                                        self.validData = oResponse.data.NAVOUTVALIDDATA.results;
                                        self
                                            .getView()
                                            .byId("btn_downloadinvaliddata")
                                            .setVisible(false);
                                    } else {
                                        MessageBox.error(
                                            oResponse.data.NAVOUTHEADER.results[0].Msg
                                        );
                                    }
                                },
                                error: function (oError) {
                                    self.closeBusyDialog();
                                    alert("Error occured while validating excel data");
                                },
                            });
                            self.getView().byId("cb_overwritenull").setEnabled(false);
                            self.getView().byId("btn_validate").setEnabled(false);
                        } else {
                            self.closeBusyDialog();
                            MessageBox.error(
                                "A request is in-progress for this table, please continue once it is approved"
                            );
                            self.getView().byId("btn_validate").setEnabled(false);
                        }
                    },
                    error: function (oError) {
                        self.closeBusyDialog();
                        MessageBox.error("An error occurred while validation data");
                    },
                });
            }
        },

        categoryChange: function (oEvent) {
            var filteredTable = [];
            var oUniquTableModel = "";
            var tabEntry = this.array.filter(function (item) {
                return item.Category === oEvent.getSource().getSelectedKey();
            });

            this.categoryName = oEvent.getSource().getSelectedKey();

            for (var i = 0; i < tabEntry.length; i++) {
                filteredTable.push({
                    TableName: tabEntry[i].TableName,
                    Description: tabEntry[i].TableDescription,
                    Key: tabEntry[i].TableName + "+" + tabEntry[i].RequesterRole,
                });
            }

            oUniquTableModel = new JSONModel(filteredTable);

            this.getOwnerComponent().setModel(oUniquTableModel, "oUniqueTableModel");
            this.getView().byId("combo_tablelist").setSelectedKey(null);
            this.getView().byId("cb_workflow").setVisible(false);
            this.getView().byId("cb_workflow").setSelected(false);
            this.getView().byId("inp_workflow").setVisible(false);
            this.getView().byId("inp_workflow").setEnabled(false);
            this.getView().byId("inp_workflow").setValue("");
            this.getView().byId("cb_overwritenull").setVisible(false);
            this.getView().byId("cb_overwritenull").setSelected(false);
            this.getView().byId("cb_updatezonly").setVisible(false);
            this.getView().byId("cb_updatezonly").setSelected(false);
            this.getView().byId("btn_Download").setVisible(false);

            this.updateztabonly = "N";
            this.preserveNull = "N";
        },

        checkOverwriteNull: function (oEvent) {
            if (oEvent.getSource().getSelected() === true) {
                self.preserveNull = "Y";
                //open confirmation box
                //This option will overwrite all blank fields in the uploaded template with Null - do you wish to proceed?
            }

            var bSelected = oEvent.getSource().getSelected();
            if (bSelected) {
                if (!self.oApproveDialog) {
                    self.oApproveDialog = new Dialog({
                        type: DialogType.Message,
                        title: "Confirm",
                        content: new Text({
                            text: "This option will overwrite all blank fields in the uploaded template with Null - do you wish to proceed?",
                        }),
                        beginButton: new Button({
                            type: ButtonType.Emphasized,
                            text: "Yes",
                            press: function (oEvent) {
                                if (bSelected) {
                                    self.preserveNull = "Y";
                                } else {
                                    self.preserveNull = "N";
                                }
                                self.oApproveDialog.close();
                            },
                        }),
                        endButton: new Button({
                            text: "No",
                            press: function (oEvent) {
                                self.getView().byId("cb_overwritenull").setSelected(false);
                                self.preserveNull = "N";
                                self.oApproveDialog.close();
                            },
                        }),
                    });
                }
                this.oApproveDialog.open();
            } else {
                self.preserveNull = "N";
            }
        },

        checkUpdateZOnly: function (oEvent) {
            var bSelected = oEvent.getSource().getSelected();
            if (bSelected) {
                if (!self.oApproveDialog) {
                    self.oApproveDialog = new Dialog({
                        type: DialogType.Message,
                        title: "Confirm",
                        content: new Text({
                            text: "Do you want to update z table only",
                        }),
                        beginButton: new Button({
                            type: ButtonType.Emphasized,
                            text: "Yes",
                            press: function (oEvent) {
                                if (bSelected) {
                                    self.updateztabonly = "Y";
                                } else {
                                    self.updateztabonly = "N";
                                }
                                self.oApproveDialog.close();
                            },
                        }),
                        endButton: new Button({
                            text: "No",
                            press: function (oEvent) {
                                self.getView().byId("cb_updatezonly").setSelected(false);
                                self.updateztabonly = "N";
                                self.oApproveDialog.close();
                            },
                        }),
                    });
                }
                this.oApproveDialog.open();
            } else {
                self.updateztabonly = "N";
            }
        },

        checkWorkflow: function (oEvent) {
            if (oEvent.getSource().getSelected() === true) {
                self.getView().byId("inp_workflow").setEnabled(true);
                self.getView().byId("inp_workflow").setVisible(true);
            } else {
                self.getView().byId("inp_workflow").setEnabled(false);
                self.getView().byId("inp_workflow").setVisible(false);
            }
        },

        selectedTable: function (oEvent) {
            var tabEntry = this.array.filter(function (item) {
                return (
                    item.TableName === oEvent.getSource().getValue() &&
                    item.RequesterRole === oEvent.getSource().getSelectedItem().getKey().split("+")[1]
                );
            });

            this.tableName = oEvent.getSource().getValue();
            var aFilters = [];
            var filterTable = new Filter(
                "Tablename",
                FilterOperator.EQ,
                oEvent.getSource().getValue()
            );
            var filterRole = new Filter(
                "Requesterrole",
                FilterOperator.EQ,
                oEvent.getSource().getSelectedItem().getKey().split("+")[1]
            );

            this.rolename = oEvent
                .getSource()
                .getSelectedItem()
                .getKey()
                .split("+")[1];

            aFilters.push(filterTable);
            aFilters.push(filterRole);

            var oModelConfig = new JSONModel();
            var oDataModelConfig = self.getOwnerComponent().getModel("ZMDR_SB_BLKITMCG");

            oDataModelConfig.read("/zmdxcnblkitmcg01", {
                filters: aFilters,
                success: function (oData, oResponse) {
                    oModelConfig.setData(oData.results);
                    self.getOwnerComponent().setModel(oModelConfig, "oModelConfig");
                    self.configArray = oModelConfig.getData();
                    self.noOfColumns = self.configArray.length;
                    self.futureAllowed = tabEntry[0].IsFutureVersionAllowed;
                    self.tableappr = tabEntry[0].IsTableLevelApproval;

                    self.workflowReq = tabEntry[0].IsWorkflowVisible;
                    self.preserveNull = tabEntry[0].IsOverwrireWithNull;
                    self.versioned = tabEntry[0].Versioned;
                    self.updatezonly = tabEntry[0].IsUpdateZTableOnly;
                    self.updateztabonly = "N";

                    if (self.workflowReq === "X") {
                        self.getView().byId("cb_workflow").setVisible(true);
                        self.getView().byId("inp_workflow").setVisible(false);
                        self.getView().byId("inp_workflow").setEnabled(false);
                        self.getView().byId("cb_workflow").setSelected(false);
                        self.getView().byId("inp_workflow").setValue("");
                    } else {
                        self.getView().byId("cb_workflow").setVisible(false);
                        self.getView().byId("inp_workflow").setVisible(false);
                        self.getView().byId("inp_workflow").setEnabled(false);
                        self.getView().byId("cb_workflow").setSelected(false);
                        self.getView().byId("inp_workflow").setValue("");
                    }
                    if (self.preserveNull === "X") {
                        self.getView().byId("cb_overwritenull").setVisible(true);
                        self.getView().byId("cb_overwritenull").setSelected(false);
                        self.preserveNull = "N";
                    } else {
                        self.getView().byId("cb_overwritenull").setVisible(true);
                        self.getView().byId("cb_overwritenull").setSelected(false);
                        self.preserveNull = "N";
                    }
                    if (self.updatezonly === "X") {
                        self.getView().byId("cb_updatezonly").setVisible(true);
                        self.getView().byId("cb_updatezonly").setSelected(false);
                        self.updateztabonly = "N";
                    } else {
                        self.getView().byId("cb_updatezonly").setVisible(false);
                        self.getView().byId("cb_updatezonly").setSelected(false);
                        self.updateztabonly = "N";
                    }

                    self.odataHead = [];
                    for (var i = 1; i < self.configArray.length + 1; i++) {
                        for (var j = 0; j < self.configArray.length; j++) {
                            if (self.configArray[j].Colseqno === i) {
                                self.odataHead.push(self.configArray[j].Columnname);
                            }
                        }
                    }

                    if (self.odataHead.length > 0) {
                        self.getView().byId("btn_Download").setVisible(true);
                    } else {
                        self.getView().byId("btn_Download").setVisible(false);
                    }
                },
                error: function (oError) { },
            });
        },

        onInvalidDataExport: function (oEvent) {
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

            var wb = XLSX.utils.book_new();
            wb.Props = {
                Title: self.tableName,
                Subject: self.tableName,
                Author: "MDR",
                CreationDate: currentdate,
            };
            wb.SheetNames.push("Invalid Data");
            var ws_data = [];
            var length = self
                .getOwnerComponent()
                .getModel("oInvalidDataModel")
                .getProperty("/").length;
            var dataStr = [];
            dataStr.push("Code«Message«Rownumber");

            var data = self
                .getOwnerComponent()
                .getModel("oInvalidDataModel")
                .getProperty("/");

            for (var i = 0; i < length; i++) {
                dataStr.push(
                    data[i].Code + "«" + data[i].Message + "«" + data[i].Rownumber
                );
            }

            for (var j = 0; j < length + 1; j++) {
                ws_data.push(dataStr[j].split("«"));
            }

            var wsData = XLSX.utils.aoa_to_sheet(ws_data);
            wb.Sheets["Invalid Data"] = wsData;
            var wbout = XLSX.write(wb, {
                bookType: "xlsx",
                type: "binary",
            });

            function s2ab(s) {
                var buf = new ArrayBuffer(s.length);
                var view = new Uint8Array(buf);
                for (var i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
                return buf;
            }
            saveAs(
                new Blob([s2ab(wbout)], {
                    type: "application/octet-stream",
                }),
                self.tableName + "_InvalidRecords_" + datetime + ".xlsx"
            );
        },

        onSubmit: function (oEvent) {
            if (self.validateWorkflowId()) {
                MessageBox.error(
                    "Please enter upto 10 digits number for workflow number!"
                );
            } else {
                self.workflowidentered = self.byId("inp_workflow").getValue();

                self.getView().byId("btn_submit").setEnabled(false);
                self.getView().byId("btn_cancel").setEnabled(false);

                self.openBusyDialog();

                var oDataModel = self.getOwnerComponent().getModel();
                self.dataload = "Y";

                var oEntry = {};
                oEntry.Tablename = self.tableName;
                oEntry.Source = "UI";
                oEntry.Isdataload = self.dataload;// === 'Y' ? true : false;
                oEntry.Isoverwritewithnull = self.preserveNull;// === 'Y' ? true : false;
                oEntry.Isfutureversion = self.futureAllowed;// === 'Y' ? true : false;
                oEntry.Workflowid = self.workflowidentered;

                var itemData = [];

                for (var i = 0; i < self.finalData.length; i++) {
                    itemData.push({
                        Data: self.finalData[i].Data,
                    });
                }

                oEntry.NAVINDATA = itemData;

                oEntry.NAVOUTRETMESSAGE = [];
                var lv_res4 = {};
                lv_res4.Type = "";
                lv_res4.Message = "";
                oEntry.NAVOUTRETMESSAGE[0] = lv_res4;

                oEntry.NAVOUTHEADER = [];
                var lv_res5 = {};
                lv_res5.Createcount = 0;
                lv_res5.Updatecount = 0;
                lv_res5.Validcount = 0;
                lv_res5.Invalidcount = 0;
                lv_res5.Workflowid = "";
                lv_res5.Tablename = "";
                oEntry.NAVOUTHEADER[0] = lv_res5;

                oEntry.Requestorsaprole = self.rolename;
                oEntry.Requestorremarks = self.sValue;

                oDataModel.create("/InHeaderSet", oEntry, {
                    method: "POST",
                    success: function (oData, oResponse) {
                        self.closeBusyDialog();
                        self.WorkflowId =
                            oResponse.data.NAVOUTHEADER.results[0].Workflowid;

                        /*var oUserData = self
                          .getOwnerComponent()
                          .getModel("usermodel")
                          .getData();
                        self.oUserId = oUserData.id;
                        self.ReqEmailId = oUserData.email; */

                        //self.onTriggerWF();

                        MessageBox.information(
                            "Request submitted successfully with workflow Id " +
                            oResponse.data.NAVOUTHEADER.results[0].Workflowid,
                            {
                                onClose: function (oAction) {
                                    window.location.reload();
                                },
                            }
                        );

                        self.getView().byId("btn_submit").setVisible(false);
                        self.getView().byId("btn_cancel").setVisible(false);
                        self.getView().byId("lbl_warning").setVisible(false);
                    },
                    error: function (oError) {
                        self.closeBusyDialog();
                        alert("Error Occurred while processing data load");
                    },
                });
            }
        },

        onCancel: function (oEvent) {
            window.location.reload();
        },

        onTriggerWF: function () {
            var oDataModel = self.getOwnerComponent().getModel();

            var oEntry = {};
            oEntry.Isfutureallowed = self.futureVer;
            oEntry.Isversioned = self.versioned;
            oEntry.Category = self.categoryName;
            oEntry.Tablename = self.tableName;
            oEntry.Workflowid = self.WorkflowId.toString();
            oEntry.Requestorid = self.oUserId;
            oEntry.Requestoremailid = self.ReqEmailId;
            oEntry.ValidRecordsCount = self.ValidRecordsCount;
            oEntry.Requestorremarks = self.sValue;
            oEntry.DeleteFlag = "N";
            oEntry.Isoverwritewithnull = self.Preservenull;
            oEntry.Operationtype = "BULK UPDATE";
            oEntry.Requestorrole = self.rolename;
            oEntry.Updateztabonly = self.updateztabonly;

            oEntry.Approverstage = "APPROVER";
            oEntry.Systemname = "MDR";
            oEntry.Hierarchy = "ZMDR_ACCOUNT";
            if (self.tableappr == "Y") {
                self.Subclass = self.tableName;
            } else {
                self.Subclass = "ZMDR_ACCOUNTApprover";
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

        onSubmitDialog: function () {
            if (self.validateWorkflowId()) {
                MessageBox.error(
                    "Please enter upto 10 digits number for Workflow Number!"
                );
            } else {
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
                            self.onSubmit();
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
        } //,

        // //function to show Busy Indicator
        // fn_showBusyIndicator: function (oModelName) {
        //     var oGlobalBusyDialog;
        //     oModelName.attachRequestSent(
        //         function () {
        //             oGlobalBusyDialog = this.openBusyDialog();
        //         }.bind(this)
        //     );
        //     oModelName.attachRequestCompleted(
        //         function () {
        //             this.closeBusyDialog(oGlobalBusyDialog);
        //         }.bind(this)
        //     );
        // },
        // //function to close Busy Indicator
        // fn_closeBusyIndicator: function (oModelName) {
        //     var oGlobalBusyDialog;
        //     oModelName.attachRequestCompleted(
        //         function () {
        //             this.closeBusyDialog(oGlobalBusyDialog);
        //         }.bind(this)
        //     );
        // }
    }
    );
}
);