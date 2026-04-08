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
      const oAppModel = new JSONModel({
        ruleSummary: [],
        applyRules: [],
        execRules: [],

        selectedRuleId: "",
        selectedRule: null,
        loadingBackend: true,

        plantList: [],
        ruleType: [],
        itemType: []
      });

      this.getView().setModel(oAppModel, "app");
      const oModel = this.getView().getModel("app")

      const plant = await this.getPlant();
      oModel.setProperty("/plantList", plant)

      const ruleType = await this.getTypeRule();
      oModel.setProperty("/ruleType", ruleType)

      const itemType = await this.getItemType();
      oModel.setProperty("/itemType", itemType)

      await this.loadRuleData();
      oModel.setProperty("/loadingBackend", false);
    },

    onExecRule: async function (aRuleIds) {
      const oModel = this.getOwnerComponent().getModel("zui_calcres_o4");

      const oList = oModel.bindList("/CalcRes", null, null, null, { $$groupId: "$direct" });
      const oHeaderCtx = oList.getHeaderContext();

      const sQualified = "com.sap.gateway.srvd.zui_calcres_o4.v0001.executeRules(...)";

      const oAction = oModel.bindContext(sQualified, oHeaderCtx, { $$groupId: "$direct" });

      try {
        oAction.setParameter("action", "SAP__self.executeRules"); // or just "executeRules" depending on backend
        oAction.setParameter("RuleIds", aRuleIds.RuleIds);

        const oResultCtx = await oAction.execute();
        return true
      } catch (e) {
        console.error(e);
        sap.m.MessageBox.error(e.message || "Execute failed");
        return false;
      }
    },

    /* ================== GET VALUE HELP DATA ================== */
    getItemType: async function () {
      const oModel = this.getOwnerComponent().getModel("zsd_itemtype_vh");
      try {
        const oList = oModel.bindList("/ZI_ITEMTYPE_VH");
        const aContexts = await oList.requestContexts();
        return aContexts.map(c => c.getObject());
      } catch (e) {
        console.error("Failed to load", e);
        return [];
      }
    },

    getTypeRule: async function () {
      const oModel = this.getOwnerComponent().getModel("zsd_typerules_vh");
      try {
        const oList = oModel.bindList("/ZI_TYPERULES_VH");
        const aContexts = await oList.requestContexts();
        return aContexts.map(c => c.getObject());
      } catch (e) {
        console.error("Failed to load", e);
        return [];
      }
    },

    getPlant: async function () {
      const oModel = this.getOwnerComponent().getModel("zsd_plant_vh");
      try {
        const oList = oModel.bindList("/zi_plant_vh");
        const aContexts = await oList.requestContexts();
        return aContexts.map(c => c.getObject());
      } catch (e) {
        console.error("Failed to load", e);
        return [];
      }
    },

    /* ===================== PUBLIC HANDLERS ===================== */
    onRuleIdValueHelp: function () {
      if (!this._oRuleSelectDialog) {
        this._oRuleSelectDialog = new sap.m.TableSelectDialog({
          title: "Select Rule",
          growing: true,
          growingThreshold: 80,
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
            path: "app>/ruleSummary",
            template: new sap.m.ColumnListItem({
              cells: [
                new sap.m.Text({ text: "{app>RuleId}" }),
                new sap.m.Text({ text: "{app>RuleName}" })
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

    loadRuleData: async function () {
      const oLoadModel = this.getView().getModel("app")

      const rules = await this.onGetRule();
      const formattedRule = await rules.map(r => ({
        ...r,
        ItemTypeFormatted: this.itemTypeFormatter(r.ItemType),
        RuleTypeFormatted: this.ruleTypeFormatter(r.RuleType),
        PlantFormatted: this.plantFormatter(r._RuleScope)
      }))

      oLoadModel.setProperty("/ruleSummary", formattedRule)
      console.log("RULES: ", formattedRule)
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
      console.log("SELECTED RULE: ", selectedRule)

      aApplyRule.push(selectedRule)
      oModel.setProperty("/applyRules", aApplyRule)
      this.onCancelAddApplyRule()
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
      const aRuleIds = aApplyRules.map(r => ({ RuleID: r.RuleId}));

      const oPayLoad = {
        "action": "SAP__self.executeRules",
        "RuleIds": aRuleIds
      }

      try {
        const result = await this.onExecRule(oPayLoad)
        if (result) {
          MessageBox.success(this._i18n("APPLY_RULES_SUCCESS"), {
            title: this._i18n("SUCCESS")
          });
        }
      } catch (e) {
        this._toast(e)
      }
    },

    _applySelectedRule: function (sRuleId) {
      const oModel = this.getView().getModel("app")
      const aRules = oModel.getProperty("/ruleSummary") || [];
      const oRule = aRules.find(r => r.RuleId === sRuleId) || null;

      console.log("ORULE: ", oRule)
      oModel.setProperty("/selectedRule", oRule);
    },

    /* ===================== KEY TO VALUE FORMATTER ===================== */
    itemTypeFormatter: function (itemType) {
      const oModel = this.getView().getModel("app");
      const itemLookup = oModel.getProperty("/itemType")

      const oMatch = itemLookup.find(i => i.ItemType == itemType);
      return oMatch ? oMatch.ItemTypeName : itemType;
    },

    ruleTypeFormatter: function (ruleType) {
      const oModel = this.getView().getModel("app");
      const ruleLookup = oModel.getProperty("/ruleType")

      const oMatch = ruleLookup.find(r => r.IndexNo == ruleType);
      return oMatch ? oMatch.TypeOfRules : ruleType;
    },

    plantFormatter: function (aScopes) {
      const oModel = this.getView()?.getModel("app");
      const plantList = oModel.getProperty("/plantList") || [];

      const plantLookup = plantList.map(p => ({
        ...p,
        Plant: this.trimPlantKey(p.Plant)
      }));

      const aNames = (aScopes || []).map(s => {
        const sPlant = this.trimPlantKey(s.Plant);
        const oMatch = plantLookup.find(p => p.Plant === sPlant);
        return oMatch ? oMatch.PlantName : sPlant;
      });

      return aNames.join(", ");
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