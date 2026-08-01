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
        this: undefined,
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
                oBinding;

            this.getView().byId("table_validresult").setVisible(false);
            this.getView().byId("lbl_warning").setVisible(false);
            this.getView().byId("btn_submit").setVisible(false);
            this.getView().byId("btn_cancel").setVisible(false);
            this.getView().byId("btn_validate").setVisible(false);
            this.getView().byId("btn_reload").setVisible(false);
            this.getView().byId("btn_downloadinvaliddata").setVisible(false);

            this.oBulkModel = this.getOwnerComponent().getModel();
            oBinding = this.oBulkModel.bindList("/BulkHdrConfig");
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

            this.getView().byId("cb_workflow").setVisible(false);
            this.getView().byId("inp_workflow").setVisible(false);
            this.workflowidentered = "";
            this.getView().byId("cb_overwritenull").setVisible(false);
            this.getView().byId("cb_updatezonly").setVisible(false);
        },

        handleUploadComplete: function (oEvent) {
            if (this.rowDataArr.length > 0) {
                if (this.noOfColumns === this.columnCount) {
                    var errors = [];
                    for (var i = 0; i < this.odataHead.length; i++) {
                        if (this.temphead[i] !== this.odataHead[i]) {
                            errors.push(this.temphead[i]);
                            this.getView().byId("btn_validate").setEnabled(false);
                            this.getView().byId("cb_overwritenull").setEnabled(false);
                        }
                    }
                    if (errors.length > 0) {
                        MessageBox.error(
                            "Excel has following invalid column(s) " + errors
                        );
                        this.getView().byId("btn_reload").setVisible(true);
                    } else {
                        this.getView().byId("btn_validate").setVisible(true);
                        this.getView().byId("btn_reload").setVisible(true);
                    }
                } else {
                    MessageBox.error(
                        "Invalid excel, Please download and use the correct template without any modification in the format."
                    );
                    this.getView().byId("btn_validate").setVisible(false);
                    this.getView().byId("btn_reload").setVisible(true);
                }
            } else {
                MessageBox.error("Uploaded excel contains no data, please check.");
                this.getView().byId("btn_validate").setVisible(false);
                this.getView().byId("btn_reload").setVisible(true);
            }
            //Disable the file uploader
            this.getView().byId("fu_upload").setEnabled(false);
            this.getView().byId("combo_category").setEnabled(false);
            this.getView().byId("combo_tablelist").setEnabled(false);
            this.closeBusyDialog(this.oGlobalBusyDialog);
        },

        onTemplateDownload: function (oEvent) {
            var wb = XLSX.utils.book_new();

            wb.Props = {
                Title: this.tableName,
                Subject: this.tableName,
                Author: "MDR",
                CreatedDate: new Date()
            };
            wb.SheetNames.push(this.tableName);
            var ws_data = [];
            this.odataHead;
            var length = this.odataHead.length;
            var dataStr = [];
            var data = "";
            for (let i = 0; i < length; i++) {
                if (i == length - 1) {
                    data = data + this.odataHead[i];
                } else {
                    data = data + this.odataHead[i] + ";";
                }
            }

            dataStr.push(data);

            ws_data.push(dataStr[0].split(";"));

            var wsData = XLSX.utils.aoa_to_sheet(ws_data);
            wb.Sheets[this.tableName] = wsData;
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
            }), this.tableName + '.xlsx');
        },

        onFileUpload: function (oEvent) {
            this._import(
                oEvent.getParameter("files") && oEvent.getParameter("files")[0]
            );

            this.filename = oEvent.getParameter("files")[0].name;

            this.oGlobalBusyDialog = this.openBusyDialog();
        },

        _import: function (file) {
            if (file && window.FileReader) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    data = e.target.result;
                    var arr = this.arrayBufferToBase64(data);

                    var wb = XLSX.read(arr, {
                        type: "base64",
                        cellDates: true
                    });

                    var tableName = wb.SheetNames;
                    var data = wb.Sheets[tableName[0]];

                    this.format_excel_data(wb.Sheets[wb.SheetNames[0]], data);
                }.bind(this);
                reader.readAsArrayBuffer(file);
            }
        },

        format_excel_data: function (sheet, data) {
            this.temphead = [];
            this.rowDataArr = [];
            var range = XLSX.utils.decode_range(sheet['!ref']);
            this.columnCount = XLSX.utils.decode_range(data['!ref']).e.c + 1;
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
                        if (cellData.v instanceof Date) {
                            // Safely convert JavaScript Date to HANA expected YYYY-MM-DD format
                            var yyyy = cellData.v.getFullYear();
                            var mm = String(cellData.v.getMonth() + 1).padStart(2, '0');
                            var dd = String(cellData.v.getDate()).padStart(2, '0');
                            cellDataVal = yyyy + "-" + mm + "-" + dd;
                        } else {
                            cellDataVal = typeof cellData.v === "string" ? cellData.v.trim() : cellData.v;
                        }
                        cellDataVal = this._replaceNewLineChar(cellDataVal);
                    }
                    rowData = rowData + "«" + (cellData ? cellDataVal : '');
                }

                if (this.rowDataArr === undefined) {
                    this.rowDataArr = [];
                }
                var newData = rowData.replaceAll("«", "");
                if (newData !== "") {
                    this.rowDataArr.push(rowData.substring(1));
                }
            }

            var result = this.rowDataArr.filter(
                (o) => !Object.keys(o).every(k => !o[k]));
            this.rowDataArr = result;

            //get excel headers
            for (var colNum = range.s.c; colNum <= range.e.c; colNum++) {
                var headData = sheet[XLSX.utils.encode_cell({ r: 0, c: colNum })];
                this.temphead.push(headData.v);
            }
        },

        handleValidateData: function (oEvent) {
            var oBinding,
                oBindingHeader;
            if (this.validateWorkflowId()) {
                MessageBox.error(
                    "Please enter upto 10 digit number for Workflow Number!"
                );
            } else {
                this.workflowidentered = this.byId("inp_workflow").getValue();

                var aFilters = [];
                var oGlobalBusyDialog = this.openBusyDialog();

                var oModel1 = new JSONModel();
                var filter = new Filter(
                    "Tablename",
                    FilterOperator.EQ,
                    this.tableName
                );
                var filterStatus = new Filter(
                    "RequestStatus",
                    FilterOperator.EQ,
                    "INPROGRESS"
                );
                aFilters.push(filter);
                aFilters.push(filterStatus);

                oBinding = this.oBulkModel.bindList("/BulkTemp", null, null, aFilters);
                oBinding.requestContexts().then(function (aContexts) {
                    // Convert contexts to data objects (replaces oData.results)
                    var aResults = aContexts.map(function (oContext) {
                        return oContext.getObject();
                    });

                    oModel1.setData(aResults);
                    if (!oModel1.oData.length > 0) {
                        var oDataModel = this.getOwnerComponent().getModel();
                        this.dataload = "N";
                        // [DEFAULT VALUES] - Set defaults for optional fields if not set by user
                        if (!this.preserveNull) this.preserveNull = "N";
                        if (!this.futurever) this.futurever = "N";
                        if (!this.workflowidentered) this.workflowidentered = "";
                        if (!this.rolename) this.rolename = "";
                        // [END DEFAULT VALUES]
                        var oEntry = {};
                        var oInData = {};
                        oEntry.Tablename = this.tableName;
                        oEntry.Source = "UI";
                        oEntry.Isdataload = this.dataload;// === 'Y' ? true : false;
                        oEntry.Isoverwritewithnull = this.preserveNull;// === 'Y' ? true : false; // [FIXED: was this.Preservenull]
                        oEntry.Isfutureversion = this.futurever;// === 'Y' ? true : false;
                        oEntry.Workflowid = this.workflowidentered;
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
                        lv_res4.Tablename = this.tableName;

                        oEntry.NAVOUTHEADER[0] = lv_res4;

                        for (var i = 0; i < this.rowDataArr.length; i++) {
                            itemData.push(this.rowDataArr[i]);
                        }

                        console.log("rowDataArr length:", this.rowDataArr.length);
                        console.log("itemData length:", itemData.length);
                        console.log("First item:", itemData[0]);

                        oEntry.NAVINDATA = itemData;
                        oEntry.Requestorsaprole = this.rolename;

                        var oGBusyArray = this.openBusyDialog();

                        // [FIXED] Use direct fetch() instead of OData V4 bindContext
                        // because CAP OData V4 has a known bug where Collection(Edm.String)
                        // parameters arrive as undefined in req.data when called via $batch
                        var sServiceUrl = this.getOwnerComponent().getModel().getServiceUrl();
                        var sBaseUrl = sServiceUrl.endsWith("/") ? sServiceUrl.slice(0, -1) : sServiceUrl;
                        var sActionUrl = sBaseUrl + "/rest/validateBulkData";

                        fetch(sServiceUrl, {
                            method: "GET",
                            headers: {
                                "X-CSRF-Token": "Fetch",
                                "Accept": "application/json"
                            }
                        }).then(function (oTokenResponse) {
                            var sCsrfToken = oTokenResponse.headers.get("X-CSRF-Token") || "";
                            
                            return fetch(sActionUrl, {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Accept": "application/json",
                                    "X-CSRF-Token": sCsrfToken
                                },
                                body: JSON.stringify({
                                    tablename: oEntry.Tablename,
                                    requesterrole: oEntry.Requestorsaprole,
                                    rowData: oEntry.NAVINDATA,
                                    overwriteWithNull: oEntry.Isoverwritewithnull,
                                    futureVersion: oEntry.Isfutureversion,
                                    workflowid: oEntry.Workflowid
                                })
                            });
                        }).then(function (oResponse) {
                            // Read as text first so we can debug if it's not JSON
                            return oResponse.text().then(function (sText) {
                                console.log("Backend response status:", oResponse.status);
                                console.log("Backend response body:", sText);
                                if (!oResponse.ok) {
                                    throw new Error("Server error " + oResponse.status + ": " + sText);
                                }
                                // HTTP 204 No Content: CAP returns this when it cannot serialize
                                // the complex return type of an OData action called via raw fetch.
                                // This typically happens with inline anonymous return types containing
                                // nested arrays. The action DID execute — we need to fix the backend
                                // to return a serializable response.
                                if (oResponse.status === 204 || !sText || sText.trim() === "") {
                                    console.error("CAP returned 204/empty — action ran but response was not serialized. " +
                                        "Check that the action is routed correctly and the return type is serializable.");
                                    throw new Error("Server returned empty response (HTTP " + oResponse.status + "). " +
                                        "The validation action executed but returned no data. Please check server logs.");
                                }
                                return JSON.parse(sText);
                            });
                        }).then(function (oResult) {
                            this.closeBusyDialog(oGBusyArray);

                            // Plain REST endpoint returns direct JSON — no OData 'value' wrapper.
                            // Keep as safe fallback in case OData path is used in the future.
                            if (oResult && oResult.value) {
                                oResult = oResult.value;
                            }

                            this.getView().byId("table_validresult").setVisible(true);

                            // Build header summary
                            var headerData = [{
                                Validcount: oResult.validCount || 0,
                                Invalidcount: oResult.invalidCount || 0,
                                TotalCount: (oResult.validCount || 0) + (oResult.invalidCount || 0)
                            }];
                            var oHeaderDataModel = new JSONModel(headerData);
                            this.getOwnerComponent().setModel(oHeaderDataModel, "oHeaderDataModel");

                            // Handle invalid data
                            if (oResult.invalidData && oResult.invalidData.length > 0) {
                                this.getView().byId("btn_downloadinvaliddata").setVisible(true);
                                var oInvalidDataModel = new JSONModel(oResult.invalidData);
                                this.InvalidDataModel = oInvalidDataModel;
                                this.getOwnerComponent().setModel(oInvalidDataModel, "oInvalidDataModel");
                            } else {
                                this.getView().byId("btn_downloadinvaliddata").setVisible(false);
                            }

                            // Handle valid data
                            if (oResult.validData && oResult.validData.length > 0) {
                                this.finalData = oResult.validData;
                                this.validData = oResult.validData;
                                this.validRecordCount = oResult.validCount;

                                if (this.validRecordCount > 0) {
                                    this.getView().byId("lbl_warning").setVisible(true);
                                    this.getView().byId("btn_submit").setVisible(true);
                                    this.getView().byId("btn_cancel").setVisible(true);
                                }
                            } else if (!oResult.invalidData || oResult.invalidData.length === 0) {
                                MessageBox.error("No valid records, please upload valid records");
                            }

                            if (oResult.workflowid) {
                                this.workflowId = oResult.workflowid;
                            }

                        }.bind(this)).catch(function (oError) {
                            this.closeBusyDialog(oGBusyArray);
                            MessageBox.error("Error occurred while validating excel data");
                            console.error(oError);
                        }.bind(this));
                        this.getView().byId("cb_overwritenull").setEnabled(false);
                        this.getView().byId("btn_validate").setEnabled(false);
                    } else {
                        this.closeBusyDialog();
                        MessageBox.error(
                            "A request is in-progress for this table, please continue once it is approved"
                        );
                        this.getView().byId("btn_validate").setEnabled(false);
                    }
                }.bind(this)).catch(function (oError) {
                    this.closeBusyDialog(oGlobalBusyDialog);
                    console.error("Error loading BulkTempConfig:", oError);
                }.bind(this));
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
                this.preserveNull = "Y";
                //open confirmation box
                //This option will overwrite all blank fields in the uploaded template with Null - do you wish to proceed?
            }

            var bSelected = oEvent.getSource().getSelected();
            if (bSelected) {
                if (!this.oApproveDialog) {
                    this.oApproveDialog = new Dialog({
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
                                    this.preserveNull = "Y";
                                } else {
                                    this.preserveNull = "N";
                                }
                                this.oApproveDialog.close();
                            },
                        }),
                        endButton: new Button({
                            text: "No",
                            press: function (oEvent) {
                                this.getView().byId("cb_overwritenull").setSelected(false);
                                this.preserveNull = "N";
                                this.oApproveDialog.close();
                            },
                        }),
                    });
                }
                this.oApproveDialog.open();
            } else {
                this.preserveNull = "N";
            }
        },

        checkUpdateZOnly: function (oEvent) {
            var bSelected = oEvent.getSource().getSelected();
            if (bSelected) {
                if (!this.oApproveDialog) {
                    this.oApproveDialog = new Dialog({
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
                                    this.updateztabonly = "Y";
                                } else {
                                    this.updateztabonly = "N";
                                }
                                this.oApproveDialog.close();
                            },
                        }),
                        endButton: new Button({
                            text: "No",
                            press: function (oEvent) {
                                this.getView().byId("cb_updatezonly").setSelected(false);
                                this.updateztabonly = "N";
                                this.oApproveDialog.close();
                            },
                        }),
                    });
                }
                this.oApproveDialog.open();
            } else {
                this.updateztabonly = "N";
            }
        },

        checkWorkflow: function (oEvent) {
            if (oEvent.getSource().getSelected() === true) {
                this.getView().byId("inp_workflow").setEnabled(true);
                this.getView().byId("inp_workflow").setVisible(true);
            } else {
                this.getView().byId("inp_workflow").setEnabled(false);
                this.getView().byId("inp_workflow").setVisible(false);
            }
        },

        selectedTable: function (oEvent) {
            var oBinding;

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
                "RequesterRole",
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
            var oGBusyArray = this.openBusyDialog();

            oBinding = this.oBulkModel.bindList("/BulkItmConfig", null, null, aFilters);
            oBinding.requestContexts().then(function (aContexts) {
                this.closeBusyDialog(oGBusyArray);

                // Convert contexts to data objects (replaces oData.results)
                var aResults = aContexts.map(function (oContext) {
                    return oContext.getObject();
                });

                oModelConfig.setData(aResults);
                this.getOwnerComponent().setModel(oModelConfig, "oModelConfig");
                this.configArray = oModelConfig.getData();
                this.noOfColumns = this.configArray.length;
                this.futureAllowed = tabEntry[0].IsFutureVersionAllowed;
                this.tableappr = tabEntry[0].IsTableLevelApproval;

                this.workflowReq = tabEntry[0].IsWorkflowVisible;
                this.preserveNull = tabEntry[0].IsOverwrireWithNull;
                this.versioned = tabEntry[0].Versioned;
                this.updatezonly = tabEntry[0].IsUpdateZTableOnly;
                this.updateztabonly = "N";

                if (this.workflowReq === "X") {
                    this.getView().byId("cb_workflow").setVisible(true);
                    this.getView().byId("inp_workflow").setVisible(false);
                    this.getView().byId("inp_workflow").setEnabled(false);
                    this.getView().byId("cb_workflow").setSelected(false);
                    this.getView().byId("inp_workflow").setValue("");
                } else {
                    this.getView().byId("cb_workflow").setVisible(false);
                    this.getView().byId("inp_workflow").setVisible(false);
                    this.getView().byId("inp_workflow").setEnabled(false);
                    this.getView().byId("cb_workflow").setSelected(false);
                    this.getView().byId("inp_workflow").setValue("");
                }
                if (this.preserveNull === "X") {
                    this.getView().byId("cb_overwritenull").setVisible(true);
                    this.getView().byId("cb_overwritenull").setSelected(false);
                    this.preserveNull = "N";
                } else {
                    this.getView().byId("cb_overwritenull").setVisible(true);
                    this.getView().byId("cb_overwritenull").setSelected(false);
                    this.preserveNull = "N";
                }
                if (this.updatezonly === "X") {
                    this.getView().byId("cb_updatezonly").setVisible(true);
                    this.getView().byId("cb_updatezonly").setSelected(false);
                    this.updateztabonly = "N";
                } else {
                    this.getView().byId("cb_updatezonly").setVisible(false);
                    this.getView().byId("cb_updatezonly").setSelected(false);
                    this.updateztabonly = "N";
                }

                this.odataHead = [];
                for (var i = 1; i < this.configArray.length + 1; i++) {
                    for (var j = 0; j < this.configArray.length; j++) {
                        if (this.configArray[j].Colseqno === i) {
                            this.odataHead.push(this.configArray[j].Columnname);
                        }
                    }
                }

                if (this.odataHead.length > 0) {
                    this.getView().byId("btn_Download").setVisible(true);
                } else {
                    this.getView().byId("btn_Download").setVisible(false);
                }
            }.bind(this)).catch(function (oError) {
                this.closeBusyDialog(oGBusyArray);
                console.error("Error loading BulkItmConfig:", oError);
            }.bind(this));
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
                Title: this.tableName,
                Subject: this.tableName,
                Author: "MDR",
                CreationDate: currentdate,
            };
            wb.SheetNames.push("Invalid Data");
            var ws_data = [];
            var length = this
                .getOwnerComponent()
                .getModel("oInvalidDataModel")
                .getProperty("/").length;
            var dataStr = [];
            dataStr.push("Code«Message«Rownumber");

            var data = this
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
                this.tableName + "_InvalidRecords_" + datetime + ".xlsx"
            );
        },

        onSubmit: function (oEvent) {
            if (this.validateWorkflowId()) {
                MessageBox.error(
                    "Please enter upto 10 digits number for workflow number!"
                );
                return;
            }

            this.workflowidentered = this.byId("inp_workflow").getValue();
            this.getView().byId("btn_submit").setEnabled(false);
            this.getView().byId("btn_cancel").setEnabled(false);

            var oGBusyArray = this.openBusyDialog();

            // Build validData array from finalData — each item must have a 'data' key
            // matching the { data: String } shape expected by the REST endpoint.
            var validData = (this.finalData || []).map(function (item) {
                return { data: item.data || item.Data || "" };
            });

            // Use fetch() against the REST endpoint.
            // Rationale: CAP OData V4 returns HTTP 204 (no body) for actions whose
            // return type contains nested arrays of complex types. The REST endpoint
            // at /mdrapi/bulk/rest/submitBulkData bypasses that limitation and returns
            // proper JSON.
            var that = this;
            var sServiceUrl = this.getOwnerComponent().getModel().getServiceUrl();
            var sBaseUrl = sServiceUrl.endsWith("/") ? sServiceUrl.slice(0, -1) : sServiceUrl;
            var sSubmitUrl = sBaseUrl + "/rest/submitBulkData";

            fetch(sServiceUrl, {
                method: "GET",
                headers: {
                    "X-CSRF-Token": "Fetch",
                    "Accept": "application/json"
                }
            }).then(function (oTokenResponse) {
                var sCsrfToken = oTokenResponse.headers.get("X-CSRF-Token") || "";
                
                return fetch(sSubmitUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "X-CSRF-Token": sCsrfToken
                    },
                    body: JSON.stringify({
                        tablename: that.tableName,
                        requesterrole: that.rolename,
                        validData: validData,
                        overwriteWithNull: that.preserveNull || "N",
                        futureVersion: that.futureAllowed || "N",
                        workflowid: that.workflowidentered || "",
                        remarks: that.sValue || ""
                    })
                });
            }).then(function (oResponse) {
                return oResponse.text().then(function (sText) {
                    if (!oResponse.ok) {
                        throw new Error("Server error " + oResponse.status + ": " + sText);
                    }
                    return JSON.parse(sText);
                });
            }).then(function (oResult) {
                this.closeBusyDialog(oGBusyArray);
                this.WorkflowId = oResult.workflowid;

                // Automatically trigger the BPA workflow after a successful submit
                this.onTriggerWF();

                MessageBox.information(
                    "Request submitted successfully with Workflow ID: " + oResult.workflowid,
                    {
                        onClose: function () {
                            window.location.reload();
                        }
                    }
                );

                this.getView().byId("btn_submit").setVisible(false);
                this.getView().byId("btn_cancel").setVisible(false);
                this.getView().byId("lbl_warning").setVisible(false);
            }.bind(this)).catch(function (oError) {
                this.closeBusyDialog(oGBusyArray);
                this.getView().byId("btn_submit").setEnabled(true);
                this.getView().byId("btn_cancel").setEnabled(true);
                MessageBox.error("Error occurred while submitting data. Please check server logs.");
                console.error("[onSubmit] Error:", oError);
            }.bind(this));
        },

        onCancel: function (oEvent) {
            window.location.reload();
        },

        onTriggerWF: function () {
            // Resolve approver class from BulkHdrConfig — the backend reads
            // ApprClass to determine which approver group handles this table.
            var apprClass = "";
            var tabConfig = (this.array || []).find(function (c) {
                return c.TableName === this.tableName && c.RequesterRole === this.rolename;
            }.bind(this));
            if (tabConfig && tabConfig.ApprClass) {
                apprClass = tabConfig.ApprClass;
            }

            // Use fetch() against the REST endpoint (OData V4 compatible).
            // This replaces the legacy V2 oDataModel.create("/TrigBulkUploadWFSet") call.
            var that = this;
            var sServiceUrl = this.getOwnerComponent().getModel().getServiceUrl();
            var sBaseUrl = sServiceUrl.endsWith("/") ? sServiceUrl.slice(0, -1) : sServiceUrl;
            var sTriggerUrl = sBaseUrl + "/rest/triggerBulkWorkflow";

            fetch(sServiceUrl, {
                method: "GET",
                headers: {
                    "X-CSRF-Token": "Fetch",
                    "Accept": "application/json"
                }
            }).then(function (oTokenResponse) {
                var sCsrfToken = oTokenResponse.headers.get("X-CSRF-Token") || "";
                
                return fetch(sTriggerUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                        "X-CSRF-Token": sCsrfToken
                    },
                    body: JSON.stringify({
                        workflowid: that.WorkflowId || "",
                        tablename: that.tableName,
                        requestorid: that.oUserId || "",
                        requestoremail: "abhinandan.d@abhiyantatech.com", // Hardcoded for testing
                        operationtype: "BULK UPDATE",
                        approverstage: "APPROVER",
                        apprclass: apprClass,
                        validrecordcount: that.validRecordCount || 0,
                        requesterrole: that.rolename || "",
                        approvers: [
                            {
                                "approverEmail": "abhinandan.d@abhiyantatech.com",
                                "isCompleted": false,
                                "stage": "APPROVER"
                            }
                        ]
                    })
                });
            }).then(function (oResponse) {
                return oResponse.text().then(function (sText) {
                    if (!oResponse.ok) {
                        throw new Error("WF trigger server error " + oResponse.status + ": " + sText);
                    }
                    return JSON.parse(sText);
                });
            }).then(function (oResult) {
                console.log("[onTriggerWF] Workflow triggered. BPA Instance:", oResult.bpaInstanceId);
            }).catch(function (oError) {
                // Workflow trigger failure is non-blocking — data is already staged.
                // Log the error but do not interrupt the user experience.
                console.error("[onTriggerWF] Workflow trigger failed:", oError);
            });
        },

        handleReloadPress: function () {
            window.location.reload();
        },

        validateWorkflowId: function (oEvent) {
            if (this.byId("inp_workflow").getVisible()) {
                var iWorkflowId = this.byId("inp_workflow").getValue();

                if (iWorkflowId === "" || iWorkflowId === null) {
                    return true;
                } else {
                    var compare = /^[0-9]+$/;
                    if (iWorkflowId.match(compare)) {
                        if (iWorkflowId.length > 10) {
                            return true;
                        } else {
                            this.getView().byId("cb_workflow").setEnabled(false);
                            this.getView().byId("inp_workflow").setEnabled(false);
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
            if (this.validateWorkflowId()) {
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
                            this.sValue = sText;
                            oDialog.close();
                            this.onSubmit();
                        }.bind(this),
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