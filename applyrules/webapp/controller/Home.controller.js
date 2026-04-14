sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/core/Fragment",
  "sap/ui/core/Item",
], function (Controller, JSONModel, MessageToast, MessageBox, Fragment, Item) {
  "use strict";

  return Controller.extend("applyrules.controller.Home", {
    /* ===================== LIFECYCLE ===================== */
    onInit: function () {
      const oAppModel = new JSONModel({
        ruleSummary: [],
        applyRules: [],
        execRules: [],

        selectedRuleId: "",
        selectedRule: null,

        plantList: [],
        ruleType: [],
        itemType: []
      });

      this.getView().setModel(oAppModel, "app");
      this.loadRuleData()

      this.oExpandedLabel = this.getView().byId("expandedLabel");
      this.oSnappedLabel = this.getView().byId("snappedLabel");
      this.oFilterBar = this.getView().byId("filterbar");
      this.oTable = this.getView().byId("_IDGenTable2");
    },
      
    onAfterRendering: function () {
      // Item Filterbar VH
      const oMCBitemtypeFilter = this.byId("idGenItemTypeMCBFilter");
      const oBindingITFilter = oMCBitemtypeFilter.getBinding("items");

      if (!oBindingITFilter) {
        setTimeout(() => this.onAfterRendering(), 0);
        return;
      }

      oBindingITFilter.changeParameters({
        $filter: "ItemType eq 'PR'"
      });

      // Rule Type filterbar VH
      const oMCBRuleTypeFilter = this.byId("idGenRuleTypeCBFilter");
      const oBindingRTFilter = oMCBRuleTypeFilter.getBinding("items");

      if (!oBindingRTFilter) {
        setTimeout(() => this.onAfterRendering(), 0);
        return;
      }

      oBindingRTFilter.changeParameters({
        $filter: "IndexNo eq '1'"
      });
    },

    _setGrowingThreshold: function () {
      const iHeight = window.innerHeight;
      const iItemHeight = 40;

      const iThreshold = Math.ceil(iHeight / iItemHeight);
      console.log("iHeight: ", iHeight)
      console.log("iThreshold: ", iThreshold)
      return iThreshold
    },

    /* ===================== PUBLIC HANDLERS ===================== */
    onRuleIdValueHelp: function () {
      if (!this._oRuleSelectDialog) {
        this._oRuleSelectDialog = new sap.m.TableSelectDialog({
          title: "Select Rule",
          id: "_IDGenRuleSelection",
          growing: true,
          growingThreshold: this._setGrowingThreshold(),
          search: this._onRuleSearch.bind(this),
          columns: [
            new sap.m.Column({
              header: new sap.m.Text({ text: "Rule ID" })
            }),
            new sap.m.Column({
              header: new sap.m.Text({ text: "Rule Name" })
            })
          ],
          items: {
            path: "zsd_ruleslist>/ZC_RULESLIST",
            template: new sap.m.ColumnListItem({
              cells: [
                new sap.m.Text({ text: "{zsd_ruleslist>RuleId}" }),
                new sap.m.Text({ text: "{zsd_ruleslist>RuleName}" })
              ]
            })
          },
          confirm: function (oEvent) {

            const oItem = oEvent.getParameter("selectedItem");
            if (oItem) {
              const sRuleId = oItem.getCells()[0].getText();
              this._applySelectedRule(sRuleId);
              this.getView()
                .getModel("app")
                .setProperty("/selectedRuleId", sRuleId);
            }
          }.bind(this)
        });

        this.getView().addDependent(this._oRuleSelectDialog);
      }

      this._oRuleSelectDialog.open();
    },

    _onRuleSearch: function (oEvent) {
      const sValue = oEvent.getParameter("value");
      const oBinding = oEvent.getSource().getBinding("items");

      if (!oBinding) return;

      if (!sValue) {
        oBinding.filter([]);
        return;
      }

      const aFilters = [
        new sap.ui.model.Filter("RuleId", sap.ui.model.FilterOperator.Contains, sValue),
        new sap.ui.model.Filter("RuleName", sap.ui.model.FilterOperator.Contains, sValue)
      ];

      oBinding.filter(
        new sap.ui.model.Filter({
          filters: aFilters,
          and: false
        })
      );
    },

    onGetRule: async function () {
      const oModel = this.getOwnerComponent().getModel("zsd_ruleslist");

      const oList = oModel.bindList("/ZC_RULESLIST");

      const aContexts = await oList.requestContexts(0, 300);
      return aContexts.map(c => c.getObject());
    },

    loadRuleData: async function () {
      const oModel = this.getView().getModel("app")
      const rules = await this.onGetRule();

      oModel.setProperty("/ruleSummary", rules)
    },

    onAddApplyRule: async function () {
      await this._ensureDialog("_pAddApplyRuleDialog", "applyrules.view.AddApplyRuleDialog");
      (await this._pAddApplyRuleDialog)?.open();

      return;
    },

    onConfirmAddApplyRule: function () {
      const oModel = this.getView()?.getModel("app");
      const aRules = oModel.getProperty("/ruleSummary")
      const aApplyRule = oModel.getProperty("/applyRules")
      const sSelectedId = oModel.getProperty("/selectedRuleId")

      if (!sSelectedId) {
        this._toast("SELECT_RULE");
        return;
      }

      const bExists = aApplyRule.some(r => r?.RuleId === sSelectedId);

      if (bExists) {
        this._toast("ALREADY_ADDED");
        return;
      }

      const selectedRule = aRules.find(a => a.RuleId == sSelectedId)

      aApplyRule.push(selectedRule)
      oModel.setProperty("/applyRules", aApplyRule)
      this.onCancelAddApplyRule()
      this._resetFields()
    },

    onCancelAddApplyRule: function () {
      this._closeDialogPromise("_pAddApplyRuleDialog");
    },

    onDeleteSelectedApplyRules: function () {
      const oTable = this.byId("_IDGenTable2");
      const oModel = this.getView().getModel("app");
      const aSelectedIndices = oTable.getSelectedIndices(); // always array

      if (!aSelectedIndices.length) {
        this._toast("SELECT_TO_CONTINUE");
        return;
      }

      MessageBox.confirm(this._i18n("DELETE_CONFIRM"), {
        onClose: (sAction) => {
          if (sAction !== MessageBox.Action.OK) return;

          const aApplyRules = oModel.getProperty("/applyRules") || [];

          aSelectedIndices
            .slice()
            .sort((a, b) => b - a)
            .forEach(i => aApplyRules.splice(i, 1));

          oModel.setProperty("/applyRules", aApplyRules);
          oTable.clearSelection();

          this._toast("RULES_DELETED");
        }
      });
    },

    onExecuteApplyRule: function () {
      const oModel = this.getView().getModel("app");
      const aApplyRules = oModel.getProperty("/applyRules") || [];

      if (!aApplyRules.length) {
        this._toast("ERROR_EXEC_RULES");
        return;
      }

      MessageBox.confirm(
        this._i18n("CONFIRM_APPLY_RULES"),
        {
          title: this._i18n("CONFIRM_TITLE"),
          actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
          emphasizedAction: MessageBox.Action.OK,
          onClose: function (sAction) {
            if (sAction === MessageBox.Action.OK) {
              this._executeApplyRules(aApplyRules);
            }
          }.bind(this)
        }
      );
    },

    _executeApplyRules: async function (aApplyRules) {
      const oModel = this.getView().getModel("app")
      const aRuleIds = aApplyRules.map(r => ({ RuleID: r.RuleId}));

      const oPayLoad = {
        "action": "SAP__self.executeRules",
        "RuleIds": aRuleIds
      }

      try {
        const result = await this.onExecRule(oPayLoad)
        if (result) {
          oModel.setProperty("/applyRules", [])
          MessageBox.success(this._i18n("APPLY_RULES_SUCCESS"), {
            title: this._i18n("SUCCESS")
          });
        }
      } catch (e) {
        this._toast(e)
      }
    },

    onExecRule: async function (aRuleIds) {
      const oModel = this.getOwnerComponent().getModel("zui_calcres_o4");

      const oList = oModel.bindList("/CalcRes", null, null, null, { $$groupId: "$direct" });
      const oHeaderCtx = oList.getHeaderContext();

      const sQualified = "com.sap.gateway.srvd.zui_calcres_o4.v0001.executeRules(...)";

      const oAction = oModel.bindContext(sQualified, oHeaderCtx, { $$groupId: "$direct" });

      try {
        oAction.setParameter("action", "SAP__self.executeRules");
        oAction.setParameter("RuleIds", aRuleIds.RuleIds);
        await oAction.execute();
        return true
      } catch (e) {
        console.error(e);
        sap.m.MessageBox.error(e.message || "Execute failed");
        return false;
      }
    },

    _resetFields: function () {
      const oModel = this.getView().getModel("app")
      oModel.setProperty("/selectedRuleId", null)
      oModel.setProperty("/selectedRule", null)
    },

    _applySelectedRule: function (sRuleId) {
      const oModel = this.getView().getModel("app")
      const aRules = oModel.getProperty("/ruleSummary") || [];
      const oRule = aRules.find(r => r.RuleId === sRuleId) || null;

      console.log("aRULE: ", aRules)
      oModel.setProperty("/selectedRule", oRule);
    },

    /* ===================== SORT AND FILTER FUNCTIONS ===================== */
    onFilterSearch: function () {
      this._updateLabelsAndTable()
      const mValues = this.getGroupItemsValues();

      const oTable = this.byId("_IDGenTable2");
      const oBinding = oTable.getBinding("rows");

      const searchAllCol = ["RuleId", "RuleName", "RuleDescription", "ItemType", "TypeOfRules", "PlantName"]
      const Filter = sap.ui.model.Filter;
      const Op = sap.ui.model.FilterOperator;

      const aFilters = [];

      if (mValues.SearchAll != "") {
        searchAllCol.forEach(colName => {
          aFilters.push(new Filter(colName, Op.Contains, mValues.SearchAll))
        })
      }

      if (mValues.SearchRuleId != "") {
        aFilters.push(new Filter("RuleId", Op.Contains, mValues.SearchRuleId))
      }

      mValues.ItemType.forEach(sItemType => {
        aFilters.push(new Filter("ItemType", Op.Contains, sItemType))
      })

      if (mValues.TypeOfRule != "") { 
        aFilters.push(new Filter("RuleType", Op.Contains, mValues.TypeOfRule))
      }

      mValues.Plants.forEach(sPlant => {
        aFilters.push(new Filter("PlantName", Op.Contains, sPlant))
      })

      const oGlobalFilter = new Filter({
        filters: aFilters,
        and: mValues.SearchAll != "" ? false: true
      });

      oBinding.filter(oGlobalFilter);
    },

    getGroupItemsValues: function () {
      const aFilterItems = this.oFilterBar.getFilterGroupItems();
      const mValues = {};

      aFilterItems.forEach(oItem => {
        const oControl = oItem.getControl();

        if (!oControl) {
          return;
        }

        if (oControl.isA("sap.m.Input") || oControl.isA("sap.m.SearchField")) {
          mValues[oItem.getName()] = oControl.getValue()?.trim();
        }
        else if (oControl.isA("sap.m.MultiComboBox")) {
          mValues[oItem.getName()] = oControl.getSelectedItems()
                                             .map(oItem =>
                                              oItem.getText()?.trim()
                                             );
        }
        else if (oControl.isA("sap.m.ComboBox") || oControl.isA("sap.m.Select")) {
          mValues[oItem.getName()] = oControl.getSelectedKey()?.trim();
        }
        else if (oControl.isA("sap.m.DatePicker")) {
          mValues[oItem.getName()] = oControl.getDateValue()?.trim();
        }
      });

      return mValues
    },

    getActiveFilter: function () {
      const mValues = this.getGroupItemsValues();
      var activeFilter = [];

      mValues.SearchAll != "" ? activeFilter.push("All") : activeFilter
      mValues.SearchRuleId != "" ? activeFilter.push("Rule ID") : activeFilter
      mValues.ItemType.length > 0 ? activeFilter.push("Item Type") : activeFilter
      mValues.TypeOfRule != "" ? activeFilter.push("Rule Type") : activeFilter
      mValues.Plants.length > 0 ? activeFilter.push("Plant") : activeFilter

      return activeFilter;
		},

    getNonVisibleFilter: function () {
      const aAllItems = this.oFilterBar.getFilterGroupItems();
      const aHiddenItems = aAllItems.filter(oItem => !oItem.getVisibleInFilterBar());

      return aHiddenItems.length
    },

    getFormattedSummaryText: function() {
			var aFiltersWithValues = this.getActiveFilter();

			if (aFiltersWithValues.length === 0) {
				return "No filters active";
			}

			if (aFiltersWithValues.length === 1) {
				return aFiltersWithValues.length + " filter active: " + aFiltersWithValues.join(", ");
			}

			return aFiltersWithValues.length + " filters active: " + aFiltersWithValues.join(", ");
		},

		getFormattedSummaryTextExpanded: function() {
			var aFiltersWithValues = this.getActiveFilter();

			if (aFiltersWithValues.length === 0) {
				return "No filters active";
			}

			var sText = aFiltersWithValues.length + " filters active",
				aNonVisibleFiltersWithValues = this.getNonVisibleFilter();

			if (aFiltersWithValues.length === 1) {
				sText = aFiltersWithValues.length + " filter active";
			}

			if (aNonVisibleFiltersWithValues && aNonVisibleFiltersWithValues > 0) {
				sText += " (" + aNonVisibleFiltersWithValues + " hidden)";
			}

			return sText;
		},

		_updateLabelsAndTable: function () {
			this.oExpandedLabel.setText(this.getFormattedSummaryTextExpanded());
			this.oSnappedLabel.setText(this.getFormattedSummaryText());
		},

    /* ===================== PRIVATE HELPERS ===================== */
    _ensureDialog: async function (sPromiseFieldName, sFragmentName) {
      if (!this[sPromiseFieldName]) {
        this[sPromiseFieldName] = Fragment.load({
          id: this.getView()?.getId(),
          name: sFragmentName,
          controller: this
        });
        this.getView()?.addDependent(await this[sPromiseFieldName]);
      }
    },
    _closeDialogPromise: function (sPromiseFieldName) {
      if (this[sPromiseFieldName]) {
        this[sPromiseFieldName].then(function (oDlg) { oDlg.close(); });
      }
    },
    _i18n: function (sKey) {
      return this.getView()?.getModel("i18n")?.getResourceBundle()?.getText(sKey) || sKey;
    },
    _toast: function (sKey) { MessageToast.show(this._i18n(sKey)); }
  });
});