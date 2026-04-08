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
    onInit: async function () {

      const rules = await this.onGetRule();
      console.log("RULE: ", rules)

      const oAppModel = new JSONModel({
        applyrules: [],
        ruleSummary: rules,

        rules: [],
        scopes: [],
        filters: [],
        adjLogics: [],
        ruleID: [],
        ruleName: [],
        ruleDescription: [],
        selectedRuleId: "",
        selectedRule: null,
      });

      this.getView().setModel(oAppModel, "app");
    },

    /* ===================== PUBLIC HANDLERS ===================== */
    onGetRule: async function () {
      const oModel = this.getOwnerComponent().getModel();

      const oList = oModel.bindList(
        "/ZC_RULESHEADER",
        null,
        null,
        null,
        {
          $filter: "IsActiveEntity eq true",
          $orderby: "RuleId asc",         
          $expand: {
            _RuleScope: true
          }
        }
      );

      const aContexts = await oList.requestContexts(0, 300);
      return aContexts.map(c => c.getObject());
    },

    onAddApplyRule: async function () {
      const oModel = this.getView().getModel("app");
      const ruleSummary = oModel.getProperty("/ruleSummary");

      if (!ruleSummary.length > 0) {
        this._toast("NO_MODELS_FOUND")
        return;
      }

      await this._ensureDialog("_pAddApplyRuleDialog", "applyrules.view.AddApplyRuleDialog");
      (await this._pAddApplyRuleDialog)?.open();

      return;
    },

    onConfirmAddApplyRule: function () {
      const oModel = this.getView()?.getModel("app");
      const aRules = oModel.getProperty("/selectedRule")
      const aApplyRule = oModel.getProperty("/applyrules")
      const aScopes = oModel.getProperty("/scopes")
      const aFilters = oModel.getProperty("/filters")
      const aAdjLogic = oModel.getProperty("/adjLogics")

      if (!aRules || !aRules.ID) {
        this._toast("SELECT_RULE");
        return;
      }

      const bExists = aApplyRule.some(r => r?.GeneralInfo.ID === aRules.ID);

      if (bExists) {
        this._toast("ALREADY_ADDED");
        return;
      }

      const aGeneralInfo = aRules;
      const aScopeForRule = aScopes.find(s => s.RuleID === aRules.ID);
      const aFilterForRule = aFilters.find(f => f.RuleID === aRules.ID);
      const aAdjForRule = aAdjLogic.find(a => a.RuleID === aRules.ID);

      const applyRules = {
        GeneralInfo: aGeneralInfo,
        Scope: aScopeForRule,
        Filter: aFilterForRule,
        AdjLogic: aAdjForRule
      };
      
      aApplyRule.push(applyRules)
      oModel.setProperty("/applyrules", aApplyRule)
      
      this.onCancelAddApplyRule()
    },

    onCancelAddApplyRule: function () {
      this._closeDialogPromise("_pAddApplyRuleDialog");
    },

    onRuleSelectChange: function (oEvent) {
      const oModel = this.getView().getModel("app");
      const sId = oEvent.getSource().getSelectedKey();

      const aRules = oModel.getProperty("/ruleSummary") || [];
      const oRule = aRules.find(r => r.RuleId === sId) || null;

      console.log("ORULE: ", oRule)
      oModel.setProperty("/selectedRule", oRule);
    },

    onDeleteSelectedApplyRules: function () {
      const oTable = this.byId("_IDGenTable1");
      const oModel = this.getView().getModel("app");
      const aSelectedIndices = oTable?.getSelectedIndices();

      if (!aSelectedIndices) {
        this._toast("SELECT_TO_CONTINUE");
        return;
      }

      MessageBox.confirm(`Delete ${aSelectedIndices.length} selected item(s)?`, {
        onClose: (sAction) => {
          if (sAction !== MessageBox.Action.OK) {
            return;
          }

          const aApplyRules = oModel.getProperty("/applyrules") || [];

          aSelectedIndices.forEach(i => aApplyRules.splice(i, 1));
          oModel.setProperty("/applyrules", aApplyRules);
          oTable.removeSelections(true);

          this._toast("RULES_DELETED");
        }
      });
    },

    onExecuteApplyRule: function () {
      const oModel = this.getView()?.getModel("app");
      const oApplyRules = oModel.getProperty("/applyrules");

      if (oApplyRules.length > 0) {
        MessageBox.success(
          this._i18n(""),
          { title: "Success" }
        )
      } else {
          this._toast("ERROR_EXEC_RULES")
      }
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