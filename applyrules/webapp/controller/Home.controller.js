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
      const oTable = this.byId("_IDGenTable1");
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
    /* ===================== SEARCH AND FILTER ===================== */
    onSearch: function (oEvent) {
      const sQuery = oEvent.getParameter("newValue")?.trim();
      const oTable = this.byId("_IDGenTable1");
      const oBinding = oTable.getBinding("rows");

      if (!sQuery) {
        oBinding.filter([]);
        return;
      }

      const Filter = sap.ui.model.Filter;
      const Op = sap.ui.model.FilterOperator;

      const aFilters = [
        new Filter("RuleId", Op.Contains, sQuery),
        new Filter("RuleName", Op.Contains, sQuery),
        new Filter("RuleDescription", Op.Contains, sQuery),

        new Filter("ValidFrom", Op.Contains, sQuery),
        new Filter("ValidTo", Op.Contains, sQuery),

        new Filter("ItemTypeFormatted", Op.Contains, sQuery),
        new Filter("RuleTypeFormatted", Op.Contains, sQuery),

        new Filter("PlantFormatted", Op.Contains, sQuery),
      ];

      const oGlobalFilter = new Filter({
        filters: aFilters,
        and: false // OR search
      });

      oBinding.filter(oGlobalFilter);
    },

    /* ===================== PRIVATE HELPERS ===================== */
    trimPlantKey: function (sPlant) {
      if (!sPlant) {
        return "";
      }

      // Max length should be 4, trim excess
      return sPlant.length > 4
        ? sPlant.slice(0, 4)
        : sPlant;
    },
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