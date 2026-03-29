sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/m/MessageToast",
  "sap/m/MessageBox",
  "sap/ui/core/Fragment",
  "sap/ui/core/Item",
], function (Controller, JSONModel, MessageToast, MessageBox, Fragment, Item) {
  "use strict";

    return Controller.extend("managerules.controller.Home", {
    /* ===================== LIFECYCLE ===================== */
    onInit: async function () {

      // Fetch data from backend
      const aDataRule = await this.onGetRule()
      const aRuleSummary = aDataRule.map(rule => ({
        Id: rule.Id,
        DraftUUID: rule.DraftUUID,
        RuleId: rule.RuleId,
        RuleName: rule.RuleName,
        RuleDescription: rule.RuleDescription,
        ValidFrom: rule.ValidFrom,
        ValidTo: rule.ValidTo,
        ItemType: rule.ItemType,
        RuleType: rule.RuleType,
        Plant: rule._RuleScope?.map(scope => scope.Plant) ?? [],
        IsActiveEntity: rule.IsActiveEntity
      }))

      // Current view model
      const oRuleModel = new JSONModel({
        currentRule: {},
        ruleSummary: aRuleSummary,
        genInfo: null,
        filter: null,
        scope: null,
        adjlogic: null,

        editfilter: null,
        editlogic: null,

        // Scope values for selection
        scopeFilters: {
          scopes: {
            list: null,
            allKeys: null,
            selectAll: false 
          }
        },
        // Plants values for selection
        plantsFilters: {
          plants: {
            list: null,
            allKeys: null,
            selectAll: false  
          }
        },
      });
      this.getView()?.setModel(oRuleModel, "rules");
    },

    onPatchRuleTest: async function () {
      const oModel = this.getOwnerComponent().getModel();

      // const sPath = `/ZC_RULESHEADER(Id=${Id},RuleId='${RuleId}',DraftUUID=${DraftUUID},IsActiveEntity=${IsActiveEntity})`;
      const sPath = `/ZC_RULESHEADER(Id=3253fd37-5938-1fd1-89ef-c327659c6fbc,RuleId='1000000001',DraftUUID=00000000-0000-0000-0000-000000000000,IsActiveEntity=${true})`;
      const oCtxBinding = oModel.bindContext(sPath, null, { $$updateGroupId: "ruleUpdates" });
      const oCtx = oCtxBinding.getBoundContext();

      oCtx.setProperty("RuleName", "Edited");
      await oModel.submitBatch("ruleUpdates");
    },

    onGetRule: async function () {
      const oModel = this.getOwnerComponent().getModel();
      const oList = oModel.bindList("/ZC_RULESHEADER", null, null, null, {
        $expand: {
          _RuleScope: true
        }
      });

      const aContexts = await oList.requestContexts();
      return aContexts.map(c => c.getObject());
    },

    onGetScope: async function (oCreated) {
      const oModel = this.getOwnerComponent().getModel();
      const oList = oModel.bindList(
        `/ZC_RULESHEADER(Id=${oCreated.Id},`+
        `RuleId='${oCreated.RuleId}',`+
        `DraftUUID=${oCreated.DraftUUID},`+
        `IsActiveEntity=${oCreated.IsActiveEntity})/_RuleScope`
      );

      const aContexts = await oList.requestContexts();
      return aContexts.map(c => c.getObject());
    },

    onGetFilter: async function (oCreated) {
      const oModel = this.getOwnerComponent().getModel();
      const oList = oModel.bindList(
        `/ZC_RULESHEADER(Id=${oCreated.Id},`+
        `RuleId='${oCreated.RuleId}',`+
        `DraftUUID=${oCreated.DraftUUID},`+
        `IsActiveEntity=${oCreated.IsActiveEntity})/_RuleFilter`
      );

      const aContexts = await oList.requestContexts();
      return aContexts.map(c => c.getObject());
    },

    onGetAdjLogic: async function (oCreated) {
      const oModel = this.getOwnerComponent().getModel();
      const oList = oModel.bindList(
        `/ZC_RULESHEADER(Id=${oCreated.Id},`+
        `RuleId='${oCreated.RuleId}',`+
        `DraftUUID=${oCreated.DraftUUID},`+
        `IsActiveEntity=${oCreated.IsActiveEntity})/_RuleLogic`
      );

      const aContexts = await oList.requestContexts();
      return aContexts.map(c => c.getObject());
    },
    
    /* ===================== PUBLIC HANDLERS ===================== */
    onCreateNewRule: async function () {
      this._navToWizardPage();
      this._resetGeneralFields(true);
      
      this.byId("idGenNameEditBtn")?.setVisible(false);
      this.byId("idGenDescEditBtn")?.setVisible(false);
      this.byId("idGenValidFromEditBtn")?.setVisible(false);
      this.byId("idGenValidToEditBtn")?.setVisible(false);
      this.byId("editIconScope")?.setVisible(false);
      this.byId("editIconPlants")?.setVisible(false);

      const oModel = this.getView()?.getModel("rules");
      // const aRules = oModel?.getProperty("/rules");
      // const generatedRuleId = String(aRules.length + 1).padStart(3, "0"); // will be removed
      // oModel?.setProperty("/currentRuleId", generatedRuleId)

      this._applyFiltersForCurrentRule();
      this._applyAdjLogicForCurrentRule();

      const oWizard = this._byAnyId(["idGenWizard", "GeneralWizard"]);
      oWizard?.discardProgress(oWizard.getSteps()?.[0], true);
      this._iEditRuleIndex = undefined;
    },

    onSaveAndNext: async function () {
      const oWizard = this._byAnyId(["idGenWizard", "GeneralWizard"]);
      const sCurrentStepId = oWizard?.getCurrentStep?.();

      if (!sCurrentStepId) { return; }

      const oStepGeneral = this._byAnyId(["idGenStepGeneral", "StepGeneral"]);
      const oStepScope   = this._byAnyId(["idGenStepScope", "StepScope"]);
      const oStepFilter  = this._byAnyId(["idGenStepFilters", "StepFilters"]);
      const oStepAdj     = this._byAnyId(["idGenStepAdjLogic", "StepAdjLogic"]);

      const oModel = this.getView().getModel("rules") || [];
      var oCreated = oModel.getProperty("/currentRule") || null;
      console.log("SAVE and NEXT OCreated: ", oCreated)

      /* Step 1: General Information */
      if (sCurrentStepId === oStepGeneral?.getId()) {
        if (!this._isGeneralInfoValid()) {
          this._toast("GENINFO_MANDATORY_MSG");
          return;
        }

        const sName = this._input("idGenNameInput", "inpName")?.getValue() || "";
        const sDesc = this._input("idGenDescInput", "inpDesc")?.getValue() || "";
        const sFrom = this._byAnyId(["idGenValidFromDP", "dpFrom"])?.getValue() || "";
        const sTo   = this._byAnyId(["idGenValidToDP", "dpTo"])?.getValue() || "";

        const aItemTypeItems = this._mcb("idGenItemTypeMCB", "selItemType")
          ?.getSelectedKeys()
        const aRuleTypeItems = this._mcb("idGenRuleTypeMCB", "selRuleType")
          ?.getSelectedKeys()
        
        const oNewRule = {
          RuleName: sName,
          RuleDescription: sDesc,
          ValidFrom: sFrom,
          ValidTo: sTo,
          ItemType: aItemTypeItems.join(","),
          RuleType: aRuleTypeItems.join(","),
          IsActiveEntity : true
        };

        if (oCreated != null) {
          // Edit rule
          await this.onPatchGenInfo(oCreated, oNewRule)
        } else {
          // Create new rule
          oCreated = await this.onCreateGenInfo(oNewRule)
          oModel?.setProperty("/currentRule", oCreated)
        }

        this._applyFiltersForCurrentRule(oCreated);
        this._applyAdjLogicForCurrentRule(oCreated);

        oWizard?.validateStep(oStepGeneral);
        oWizard?.nextStep();
        return;
      }

      /* Step 2: Scope */
      if (sCurrentStepId === oStepScope?.getId()) {
        const aSelectedScope = this.byId("_IDGenSelect")?.getSelectedKey() || [];
        const aSelectedPlantKeys = this.byId("_IDGenMultiComboBox")?.getSelectedKeys() || [];

        const sPlants = aSelectedPlantKeys
          .filter(function (sKey) {
            return sKey !== "*";
          })

        const oNewScope = {
          InventoryScope: aSelectedScope,
          Plant: sPlants,
          IsActiveEntity : true
        };

        if (oCreated != null) {
          // Edit scope
          // await this.onPatchScope(oCreated, oNewScope)
        } else {
          // Create scope
          await this.onCreateScope(oCreated, oNewScope)
        }

        oWizard?.validateStep(oStepScope);
        oWizard?.nextStep();
        return;
      }

      /* Step 3: Filters */
      if (sCurrentStepId === oStepFilter?.getId()) {
        oWizard?.validateStep(oStepFilter);
        const currentFilter = oModel.getProperty("/filter")
        if (currentFilter) { this._toast("FILTERS_SAVED_MSG") };

        oWizard?.nextStep();
        return;
      }

      /* Step 4: Adjustment Logic */
      if (sCurrentStepId === oStepAdj?.getId()) {
        const aAdj = oModel?.getProperty("/adjlogic") || [];

        if (aAdj.length === 0) {
          this._toast("ADJ_LOGIC_REQUIRED_MSG");
          return;
        }

        oWizard?.validateStep(oStepAdj);
        this._iEditRuleIndex = undefined;
        oModel?.setProperty("/currentRule", null)
        
        const oTable = this.byId("_IDGenTable");
        await oTable.getBinding("rows").refresh();

        MessageBox.success(this._i18n("RULE_SAVED_SUCCESS"), {
          title: this._i18n("SUCCESS_TITLE"),
          onClose: function () {
            oWizard.discardProgress(oStepGeneral);
            this.byId("_IDGenNavContainer")?.backToTop();
          }.bind(this)
        });
      }
    },

    onCreateGenInfo: async function (oPayload) {
      const oModel = this.getOwnerComponent().getModel();
      const oList = oModel.bindList("/ZC_RULESHEADER");

      try {
        const oCtx = oList.create(oPayload); 
        await oCtx.created();           
        const oCreated = oCtx.getObject();   
        console.log("OCREATED: ", oCreated)
        return oCreated
      } catch (e) {
        console.error(e);
        sap.m.MessageBox.error(e.message || "Create failed");
      }
    },

    onPatchGenInfo: async function (oCreated, oPayload) {
      const oModel = this.getOwnerComponent().getModel();

      const sPath = `/ZC_RULESHEADER(Id=${oCreated.Id},`+
      `RuleId='${oCreated.RuleId}',`+
      `DraftUUID=${oCreated.DraftUUID},`+
      `IsActiveEntity=${oCreated.IsActiveEntity})`;
      const oCtxBinding = oModel.bindContext(sPath, null, { $$updateGroupId: "ruleUpdates" });
      const oCtx = oCtxBinding.getBoundContext();

      Object.entries(oPayload).forEach(([sProp, vValue]) => {
        oCtx.setProperty(sProp, vValue);
      });

      await oModel.submitBatch("ruleUpdates");
      return oCtx.getObject();
    },

    onPatchScope: async function (oCreated, oPayload) {
      const oModel = this.getOwnerComponent().getModel();
      const aScopes = oCreated._RuleScope || [];

      console.log("ASCOPE: ", aScopes)

      const sGroupId = "ruleUpdates";
      if (!aRowsToDelete.length) {
        sap.m.MessageToast.show("No matching scope rows found to delete.");
        return;
      }

      for (const r of aScopes) {
        const sPath =
          `/ZC_RULESSCOPE(` +
            `Id=${r.Id},` +
            `RuleUUID=${r.RuleUUID},` +
            `RuleId='${r.RuleId}',` +
            `DraftUUID=${r.DraftUUID},` +
            `IsActiveEntity=${r.IsActiveEntity}` +
          `)`;

        const oCtx = oModel.bindContext(sPath, null, { $$updateGroupId: sGroupId }).getBoundContext();
        await oCtx.delete(sGroupId); // queues deletes in same group
      }

      await oModel.submitBatch(sGroupId);
      sap.m.MessageToast.show("Selected scope rows deleted.");
    },

    onPatchFilter: async function (oCreated, oPayload) {
      const oModel = this.getOwnerComponent().getModel();

      const sPath = 
        `/ZC_RULESFILTER(`+
        `Id=${oCreated.Id},`+
        `RuleUUID=${oCreated.RuleUUID},` +
        `RuleId='${oCreated.RuleId}',`+
        `DraftUUID=${oCreated.DraftUUID},`+
        `IsActiveEntity=${oCreated.IsActiveEntity})`;
      const oCtxBinding = oModel.bindContext(sPath, null, { $$updateGroupId: "ruleUpdates" });
      const oCtx = oCtxBinding.getBoundContext();

      Object.entries(oPayload).forEach(([sProp, vValue]) => {
        oCtx.setProperty(sProp, vValue);
      });

      await oModel.submitBatch("ruleUpdates");
      return oCtx.getObject();
    },

    onPatchAdjLogic: async function (oCreated, oPayload) {
      const oModel = this.getOwnerComponent().getModel();

      const sPath = 
      `/ZC_RULESLOGIC(`+
      `Id=${oCreated.Id},`+
      `RuleUUID=${oCreated.RuleUUID},` +
      `RuleId='${oCreated.RuleId}',`+
      `DraftUUID=${oCreated.DraftUUID},`+
      `IsActiveEntity=${oCreated.IsActiveEntity})`;
      const oCtxBinding = oModel.bindContext(sPath, null, { $$updateGroupId: "ruleUpdates" });
      const oCtx = oCtxBinding.getBoundContext();

      Object.entries(oPayload).forEach(([sProp, vValue]) => {
        oCtx.setProperty(sProp, vValue);
      });

      await oModel.submitBatch("ruleUpdates");
      return oCtx.getObject();
    },

    onCreateScope: async function (oCreated, oPayload) {
      const oModel = this.getOwnerComponent().getModel();
      const oList = oModel.bindList(
        `/ZC_RULESHEADER(Id=${oCreated.Id},
        RuleId='${oCreated.RuleId}',
        DraftUUID=${oCreated.DraftUUID},
        IsActiveEntity=${oCreated.IsActiveEntity})/_RuleScope`
      );

      try {
        if (oPayload.Plant.length > 1) {

          const aCtx = oPayload.Plant.map(sPlant => {
            const oNewScope = {
              InventoryScope: oPayload.InventoryScope,
              Plant: String(sPlant),
              IsActiveEntity : true
              };
              return oList.create(oNewScope);
            });

          await Promise.all(aCtx.map(c => c.created()));
          return aCtx.map(c => c.getObject());
        } else {
            const oCtx = oList.create({...oPayload, Plant: oPayload.Plant[0]}); 
            await oCtx.created();        
            const oCreated = oCtx.getObject();  
            return oCreated
          }
      } catch (e) {
        console.error(e);
        sap.m.MessageBox.error(e.message || "Create failed");
      }
    },

    onCreateFilter: async function (oCreated, oPayload) {
      const oModel = this.getOwnerComponent().getModel();
      const oList = oModel.bindList(`/ZC_RULESHEADER(Id=${oCreated.Id},RuleId='${oCreated.RuleId}',DraftUUID=${oCreated.DraftUUID},IsActiveEntity=${oCreated.IsActiveEntity})/_RuleFilter`);

      try {
        const oCtx = oList.create(oPayload); 
        await oCtx.created();        
        const oCreated = oCtx.getObject();   
        return oCreated
      } catch (e) {
        console.error(e);
        sap.m.MessageBox.error(e.message || "Create failed");
      }
    },

    onCreateAdjLogic: async function (oCreated, oPayload) {
      const oModel = this.getOwnerComponent().getModel();
      const oList = oModel.bindList(`/ZC_RULESHEADER(Id=${oCreated.Id},RuleId='${oCreated.RuleId}',DraftUUID=${oCreated.DraftUUID},IsActiveEntity=${oCreated.IsActiveEntity})/_RuleLogic`);

      try {
        const oCtx = oList.create(oPayload); 
        await oCtx.created();        
        const oCreated = oCtx.getObject();   
        return oCreated
      } catch (e) {
        console.error(e);
        sap.m.MessageBox.error(e.message || "Create failed");
      }
    },

    onFetchFilter: async function (oCreated) {
      const oODataModel = this.getOwnerComponent().getModel();
      const sRuleId = String(oCreated?.RuleId || "").replace(/'/g, "").trim();

      const oList = oODataModel.bindList("/ZC_RULESFILTER");
      const aContexts = await oList.requestContexts();
      const aFilters = aContexts.map(c => c.getObject());

      return aFilters.filter(f => String(f.RuleId).trim() === sRuleId);
    },

    onFetchAdjLogic: async function (oCreated) {
      const oODataModel = this.getOwnerComponent().getModel();
      const sRuleId = String(oCreated?.RuleId || "").replace(/'/g, "").trim();

      const oList = oODataModel.bindList("/ZC_RULESLOGIC");
      const aContexts = await oList.requestContexts();
      const aFilters = aContexts.map(c => c.getObject());

      return aFilters.filter(f => String(f.RuleId).trim() === sRuleId);
    },

    onDeleteRule: async function () {
      const oTable = this.byId("_IDGenTable");
      const aIdx = oTable.getSelectedIndices();
      if (!aIdx.length) return;

      const oRow = oTable.getContextByIndex(aIdx[0]).getObject();
      const oModel = this.getOwnerComponent().getModel();


      const sPath = this._buildRulesHeaderPath(oRow);
      console.log("SPATH:", sPath);

      try {
        const oCtx = oModel.bindContext(sPath).getBoundContext();

        console.log("1) Queue delete");
        const pDelete = oCtx.delete(); 

        console.log("2) Submit batch");
        await oModel.submitBatch("ruleUpdates");

        console.log("3) Await delete resolution");
        await pDelete;                 

        this._toast("Deleted successfully.");
        console.log("PDELETE: ", pDelete)

        oTable.clearSelection();

      } catch (e) {
        oModel.resetChanges("ruleUpdates");
        sap.m.MessageBox.error(e?.message || "Delete failed.");
      }
    },
    
    _buildRulesHeaderPath: function (o) {
      // Adjust UUID formatting if your backend expects guid'...'
      return `/ZC_RULESHEADER(` +
        `Id=${o.Id},` +
        `RuleId=${this._fmtStr(o.RuleId)},` +
        `DraftUUID=${o.DraftUUID},` +
        `IsActiveEntity=${o.IsActiveEntity}` +
      `)`;
    },
  
    _fmtStr: function (v) {
      return `'${String(v).replace(/'/g, "''")}'`;
    },

    onEditRule: async function () {
      const oTable = this.byId("_IDGenTable");
      const aSelectedIndices = oTable.getSelectedIndices();

      if (!aSelectedIndices.length) {
        this._toast("SELECT_ONE_RULE_TO_EDIT_MSG");
        return;
      }

      const iIndex = aSelectedIndices[0];
      const oCtx = oTable.getContextByIndex(iIndex);

      if (!oCtx) {
        sap.m.MessageToast.show("No context found for selected row.");
        return;
      }

      const aObj = oCtx.getObject();
      console.log("Selected object:", aObj);

      const oModel = this.getView()?.getModel("rules");
      oModel?.setProperty("/currentRule", aObj);

      this._iEditRuleIndex = aSelectedIndices[0];
      this._navToWizardPage();

      // Step 1: General Information
      this._input("idGenNameInput", "inpName")?.setValue(aObj.RuleName || "");
      this._input("idGenDescInput", "inpDesc")?.setValue(aObj.RuleDescription || "");
      this._byAnyId(["idGenValidFromDP", "dpFrom"])?.setValue(aObj.ValidFrom || "");
      this._byAnyId(["idGenValidToDP", "dpTo"])?.setValue(aObj.ValidTo || "");

      this.byId("idGenItemTypeMCB")?.setSelectedKeys(`${aObj.ItemType}`)
      this.byId("idGenRuleTypeMCB")?.setSelectedKeys(`${aObj.RuleType}`)
    
      this.byId("idGenNameEditBtn")?.setVisible(true);
      this.byId("idGenDescEditBtn")?.setVisible(true);
      this.byId("idGenValidFromEditBtn")?.setVisible(true);
      this.byId("idGenValidToEditBtn")?.setVisible(true);

      // Step 2: Scope
      if (aObj._RuleScope.length > 0) {      
        this.byId("_IDGenSelect")?.setSelectedKey(aObj._RuleScope[0].InventoryScope || "");
        const aPlants = (aObj._RuleScope.map(s => s.Plant) || "")
        this.byId("_IDGenMultiComboBox")?.setSelectedKeys(aPlants);
      }

      this.byId("editIconScope")?.setVisible(true);
      this.byId("editIconPlants")?.setVisible(true);

      // Step 3 & 4: Filters + AdjLogic
      this._applyFiltersForCurrentRule?.(aObj);
      this._applyAdjLogicForCurrentRule?.(aObj);
    },

    /* ===================== FILTER DIALOGS ===================== */
    onAddFilter: async function () {
      const sItemKey = this._mcb("idGenItemTypeMCB", "selItemType")?.getSelectedKeys()?.[0] || "";
      const sRuleKey = this._mcb("idGenRuleTypeMCB", "selRuleType")?.getSelectedKeys()?.[0] || "";

      if (sItemKey === "1" && sRuleKey === "1") {
      await this._ensureDialog("_pAddDialog", "managerules.view.FilterAddDialog");
      (await this._pAddDialog)?.open();
      return;
      }
      // if (["PRO", "REC", "SUP", "ES"].includes(sItemKey) && sRuleKey === "IN") {
      //   await this._ensureDialog("_pAddDialog2", "managerules.view.FilterAdd2Dialog");
      //   (await this._pAddDialog2)?.open();
      //   return;
      // }
      this._toast("ADD_FILTER_SELECT_VALID_MSG");
    },

    onCharacteristicChange2: function (oEvent) {
      const sKey = oEvent.getSource().getSelectedKey();
      const oOperator = this.getView()?.byId("selOperator2");
      const oUoM = this.getView()?.byId("selUoM2");

      oOperator?.removeAllItems();
      oUoM?.removeAllItems();

      oOperator?.addItem(new Item({ key: "", text: this._i18n("OPERATOR_SELECT") }));
      oUoM?.addItem(new Item({ key: "NA", text: this._i18n("UOM_NOT_APPLICABLE") }));

      switch (sKey) {
        case "FootprintValue":
          oOperator?.addItem(new Item({ key: "EQ", text: this._i18n("OP_EQ") }));
          oOperator?.addItem(new Item({ key: "NE", text: this._i18n("OP_NE") }));
          oOperator?.addItem(new Item({ key: "LT", text: this._i18n("OP_LT") }));
          oOperator?.addItem(new Item({ key: "GT", text: this._i18n("OP_GT") }));

          oUoM?.removeAllItems();
          oUoM?.addItem(new Item({ key: "KG", text: "KgCO2e" }));
          oUoM?.addItem(new Item({ key: "KGP", text: "KgCO2e per Kg" }));
          break;

        case "FootprintType":
        case "Product":
        case "ProductGroup":
          oOperator?.addItem(new Item({ key: "EQ", text: this._i18n("OP_EQ") }));
          break;

        default:
          break;
      }
    },

    onConfirmAddFilter: async function () {
      const sCharText = this.byId("selCharacteristic")?.getSelectedKey();
      const sOperKey = this.byId("selOperator")?.getSelectedKey();
      const sValText = this.byId("inpValue")?.getSelectedKey();
      const sUoMKey = this.byId("selUoM")?.getSelectedKey();

      if (!sCharText || !sOperKey || !sValText) {
        this._toast("FILTERS_REQUIRED_MSG");
        return;
      }

      const oModel = this.getView()?.getModel("rules");
      const oCreated = oModel?.getProperty("/currentRule");
      const aFilter = oModel?.getProperty("/editfilter") || null;

      const oEntry = {
        Characteristic: sCharText,
        Operator: this._mapOperatorText(sOperKey),
        Value: sValText,
        ValueUom: sUoMKey,
        LogicalOperator: "002",
        IsActiveEntity : true
      };

      if (aFilter != null) {
        // Edit filter
        await this.onPatchFilter(aFilter, oEntry)
        await oModel?.setProperty("/editfilter", null)
      } else {
        // Create filter
        await this.onCreateFilter(oCreated, oEntry)
      }

      this._applyFiltersForCurrentRule(oCreated)
      this.byId("dlgAddFilter")?.close();
    },

    onCancelAddFilter: function () { this._closeDialogPromise("_pAddDialog"); },

    onFilterDialogClose: function () {
      this.byId("selCharacteristic")?.setSelectedKey("");
      this.byId("selOperator")?.setSelectedKey("");
      this.byId("inpValue")?.setSelectedKey("");
      this.byId("selUoM")?.setSelectedKey("");
      this._iEditFilterIndex = undefined;

      const oDialog = this.byId("dlgAddFilter");
      if (oDialog) {
        oDialog.getBeginButton()?.setText(this._i18n("BTN_ADD"));
        oDialog.setTitle(this._i18n("FILTER_DEFINE_TITLE"));
      }
    },

    onFilterDialogClose2: function () {
      this.byId("selCharacteristic2")?.setSelectedKey("");
      this.byId("selOperator2")?.setSelectedKey("");
      this.byId("inpValue2")?.setSelectedKey("");
      this.byId("selUoM2")?.setSelectedKey("");
      this._iEditFilterIndex = undefined;

      const oDialog = this.byId("dlgAddFilter2");
      if (oDialog) {
        oDialog.getBeginButton()?.setText(this._i18n("BTN_ADD"));
        oDialog.setTitle(this._i18n("FILTER_DEFINE_TITLE"));
      }
    },

    onConfirmAddFilter2: function () {
      const sCharText = this.byId("selCharacteristic2")?.getSelectedItem()?.getText();
      const sOperKey = this.byId("selOperator2")?.getSelectedKey();
      const sValText = this.byId("inpValue2")?.getSelectedItem()?.getText();
      const sUoMText = this.byId("selUoM2")?.getSelectedItem()?.getText();

      if (!sCharText || !sOperKey || !sValText) {
        this._toast("FILTERS_REQUIRED_MSG");
        return;
      }

      const oModel = this.getView()?.getModel("app");
      const aFilters = oModel?.getProperty("/filters") || [];

      const oEntry = {
        Characteristics: sCharText,
        Operator: this._mapOperatorText(sOperKey),
        Value: sValText,
        UoM: sUoMText === "NA" ? this._i18n("UOM_NOT_APPLICABLE") : sUoMText
      };

      if (this._iEditFilterIndex !== undefined && this._iEditFilterIndex >= 0) {
        aFilters[this._iEditFilterIndex] = oEntry;
        this._iEditFilterIndex = undefined;
      } else {
        aFilters.push(oEntry);
      }

      oModel?.setProperty("/filters", aFilters);
      this.byId("dlgAddFilter2")?.close();
    },

    onEditFilter: async function () {
      const oModel = this.getView()?.getModel("rules")
      const oTable = this.byId("tblFilters");
      const aSelectedItems = oTable?.getSelectedItems() || [];

      if (aSelectedItems.length !== 1) {
        this._toast("SELECT_ONE_ROW_TO_EDIT_MSG");
        return;
      }

      const oItem = aSelectedItems[0];
      const oCtx = oItem.getBindingContext("rules");
      const oRow = oCtx?.getObject();

      console.log("Row data:", oRow);

      const sItemKey = this._mcb("idGenItemTypeMCB", "selItemType")?.getSelectedKeys()?.[0] || "";
      const sRuleKey = this._mcb("idGenRuleTypeMCB", "selRuleType")?.getSelectedKeys()?.[0] || "";

      await this._ensureDialog("_pAddDialog", "managerules.view.FilterAddDialog");

      // temporary values for product=1 and average=1
      if (this._mapItemTypeKey(sItemKey) === "1" && this._mapRuleTypeKey(sRuleKey) === "1") {
        oModel?.setProperty("/editfilter", oRow)

        this.byId("selCharacteristic").setSelectedKey(oRow.Characteristic);
        this.byId("selOperator")?.setSelectedKey(oRow.Operator);
        this.byId("inpValue")?.setSelectedKey(oRow.Value);
        this.byId("selUoM")?.setSelectedKey(oRow.UoM === this._i18n("UOM_NOT_APPLICABLE") ? "NA" : oRow.UoM);

        const oDialog = await this._pAddDialog;
        oDialog.setTitle(this._i18n("FILTER_EDIT_TITLE"));
        oDialog.getBeginButton()?.setText(this._i18n("BTN_UPDATE"));
        oDialog.open();
      } else {
        this.byId("selCharacteristic2")?.setSelectedKey(this._mapCharacteristicKey(oRow.Characteristics));
        this.onCharacteristicChange2({ getSource: () => this.byId("selCharacteristic2") });

        setTimeout(function () {
          this.byId("selOperator2")?.setSelectedKey(this._mapOperatorKey(oRow.Operator));
          this.byId("inpValue2")?.setSelectedKey(this._mapFilterValues(oRow.Value));
          this.byId("selUoM2")?.setSelectedKey(oRow.UoM === this._i18n("UOM_NOT_APPLICABLE") ? "NA" : oRow.UoM);
        }.bind(this), 0);

        await this._ensureDialog("_pAddDialog2", "managerules.view.FilterAdd2Dialog");
        const oDialog2 = await this._pAddDialog2;
        oDialog2.setTitle(this._i18n("FILTER_EDIT_TITLE"));
        oDialog2.getBeginButton()?.setText(this._i18n("BTN_UPDATE"));
        oDialog2.open();
      }
    },

    onCancelAddFilter2: function () { this._closeDialogPromise("_pAddDialog2"); },

    onDeleteFilter: function () {
      const oTable = this.byId("tblFilters");
      const aSelectedItems = oTable?.getSelectedItems() || [];
      if (!aSelectedItems.length) { this._toast("SELECT_FILTER_TO_DELETE_MSG"); return; }

      MessageBox.confirm(this._i18n("FILTER_DELETE_CONFIRM_MSG"), {
        title: this._i18n("CONFIRM_TITLE"),
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        emphasizedAction: MessageBox.Action.YES,
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.YES) { this._performFilterDeletion(aSelectedItems); }
        }.bind(this)
      });
    },

    /* ===================== ADJUSTMENT LOGIC DIALOGS ===================== */
    onAddAdjLogic: async function () {
      const sItemKey = this._mcb("idGenItemTypeMCB", "selItemType")?.getSelectedKeys()?.[0] || "";
      const sRuleKey = this._mcb("idGenRuleTypeMCB", "selRuleType")?.getSelectedKeys()?.[0] || "";

      if (sItemKey === "1" && sRuleKey === "1") {
        await this._ensureDialog("_pAdjLogicDialog", "managerules.view.AddAdjLogicDialog");
        const oDialog = await this._pAdjLogicDialog;
        oDialog.setTitle(this._i18n("ADJ_DEFINE_TITLE"));
        oDialog.getBeginButton()?.setText(this._i18n("BTN_ADD"));
        oDialog.open();
        return;
      }
      if (["PRO", "REC", "SUP", "ES"].includes(sItemKey) && sRuleKey === "IN") {
        await this._ensureDialog("_pAdjLogicDialog2", "managerules.view.AddAdjLogic2Dialog");
        const oDialog2 = await this._pAdjLogicDialog2;
        oDialog2.setTitle(this._i18n("ADJ_DEFINE_TITLE"));
        oDialog2.getBeginButton()?.setText(this._i18n("BTN_ADD"));
        oDialog2.open();
        return;
      }
      this._toast("INVALID_COMBINATION_MSG");
    },

    onConfirmAddAdjLogic: async function () {
      const sLogic = this.byId("selLogic")?.getSelectedKey();
      const sValue = this.byId("selLogicValue")?.getSelectedKey();
      const sUoM = this.byId("selLogicUoM")?.getSelectedKey();

      if (!sLogic || !sValue || !sUoM) { 
        this._toast("FILL_ALL_FIELDS_MSG"); 
        return; 
      }

      console.log("LOGIC VALUE UOM: ", sLogic, sValue, sUoM)

      const oModel = this.getView()?.getModel("rules");
      const oCreated = oModel?.getProperty("/currentRule");
      const aLogic = oModel?.getProperty("/editlogic") || null;

      console.log("ALOGIC: ", aLogic)
      
      if (!oCreated.RuleId) { this._toast("NO_ACTIVE_RULE_MSG"); }

      const oAdjLogic = { 
        Logic: sLogic, 
        Value: sValue, 
        ValueUom: sUoM,
        IsActiveEntity: true
      };

      if (aLogic != null) {
        // Edit adj logic
        await this.onPatchAdjLogic(aLogic, oAdjLogic)
        oModel?.setProperty("/editlogic", null)
      } else {
        // Create adj logic
        await this.onCreateAdjLogic(oCreated, oAdjLogic)
      }

      this._applyAdjLogicForCurrentRule(oCreated)
      this.byId("dlgAddAdjLogic")?.close();
    },

    onCancelAddAdjLogic: function () {
      if (this._pAdjLogicDialog) {
        this._pAdjLogicDialog.then(function (oDlg) {
          this.byId("selLogic")?.setSelectedKey("");
          this.byId("selLogicValue")?.setSelectedKey("");
          this.byId("selLogicUoM")?.setSelectedKey("");
          this._iEditAdjIndex = undefined;
          oDlg.setTitle(this._i18n("ADJ_DEFINE_TITLE"));
          oDlg.getBeginButton()?.setText(this._i18n("BTN_ADD"));
          oDlg.close();
        }.bind(this));
      }
    },

    onConfirmAddAdjLogic2: function () {
      const sLogic = this.byId("selLogic2")?.getSelectedItem()?.getText();
      const sValue = this.byId("InpVal")?.getValue();
      const sUoM = this.byId("selLogicUoM2")?.getSelectedItem()?.getText();
      if (!sLogic || !sValue || !sUoM) { this._toast("FILL_ALL_FIELDS_MSG"); return; }

      const oModel = this.getView()?.getModel("app");
      const aLogic = oModel?.getProperty("/adjLogic") || [];

      const oEntry = { Logic: sLogic, Value: sValue, UoM: sUoM };
      if (this._iEditAdjIndex !== undefined && this._iEditAdjIndex >= 0) {
        aLogic[this._iEditAdjIndex] = oEntry;
        this._iEditAdjIndex = undefined;
      } else {
        aLogic.push(oEntry);
      }
      oModel?.setProperty("/adjLogic", aLogic);
      this.byId("dlgAddAdjLogic2")?.close();
    },

    onCancelAddAdjLogic2: function () {
      this._closeDialogPromise("_pAdjLogicDialog2");
    },

    onEditAdjLogic: async function () {
      const oModel = this.getView()?.getModel("rules")
      const oTable = this.byId("tblAdjLogic2");
      const aSelectedItems = oTable?.getSelectedItems() || [];

      if (aSelectedItems.length !== 1) { this._toast("SELECT_ONE_ROW_TO_EDIT_MSG"); return; }

      const oItem = aSelectedItems[0];
      const oCtx = oItem.getBindingContext("rules");
      const oRow = oCtx?.getObject();

      console.log("Row data:", oRow);

      const sItemKey = this._mcb("idGenItemTypeMCB", "selItemType")?.getSelectedKeys()?.[0] || "";
      const sRuleKey = this._mcb("idGenRuleTypeMCB", "selRuleType")?.getSelectedKeys()?.[0] || "";

      if (sItemKey === "1" && sRuleKey === "1") {
        oModel?.setProperty("/editlogic", oRow)

        await this._ensureDialog("_pAdjLogicDialog", "managerules.view.AddAdjLogicDialog");

        this.byId("selLogic")?.setSelectedKey(oRow.Logic);
        this.byId("selLogicValue")?.setSelectedKey(oRow.Value);
        this.byId("selLogicUoM")?.setSelectedKey(oRow.UoM === this._i18n("UOM_NOT_APPLICABLE") ? "NA" : oRow.UoM);

        const oDialog = await this._pAdjLogicDialog;
        oDialog.setTitle(this._i18n("ADJ_EDIT_TITLE"));
        oDialog.getBeginButton()?.setText(this._i18n("BTN_UPDATE"));
        oDialog.open();
      } else if (["PRO", "REC", "SUP", "ES"].includes(sItemKey) && sRuleKey === "IN") {
        this.byId("selLogic2")?.setSelectedKey(oRow.Logic);
        this.byId("InpVal")?.setValue(oRow.Value);
        this.byId("selLogicUoM2")?.setSelectedKey(oRow.UoM === this._i18n("UOM_NOT_APPLICABLE") ? "NA" : oRow.UoM);

        await this._ensureDialog("_pAdjLogicDialog2", "managerules.view.AddAdjLogic2Dialog");
        const oDialog2 = await this._pAdjLogicDialog2;
        oDialog2.setTitle(this._i18n("ADJ_EDIT_TITLE"));
        oDialog2.getBeginButton()?.setText(this._i18n("BTN_UPDATE"));
        oDialog2.open();
      } else {
        this._toast("INVALID_COMBINATION_MSG");
      }
    },

    onDeleteAdjLogic: function () {
      const oTable = this.byId("tblAdjLogic");
      const aSelectedItems = oTable?.getSelectedItems() || [];
      if (!aSelectedItems.length) { this._toast("SELECT_ADJ_TO_DELETE_MSG"); return; }

      MessageBox.confirm(this._i18n("ADJ_DELETE_CONFIRM_MSG"), {
        title: this._i18n("CONFIRM_TITLE"),
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        emphasizedAction: MessageBox.Action.YES,
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.YES) { this._performAdjLogicDeletion(aSelectedItems); }
        }.bind(this)
      });
    },

    /* ===================== PRIVATE HELPERS ===================== */
    _navToWizardPage: function () {
      const oNav = this.byId("_IDGenNavContainer");
      const oPage = this.byId("pageGenInfo");
      oNav?.to(oPage);
    },

    _resetGeneralFields: function (bEnableCombos) {
      this._input("idGenNameInput", "inpName")?.setValue("");
      this._input("idGenDescInput", "inpDesc")?.setValue("");
      this._byAnyId(["idGenValidFromDP", "dpFrom"])?.setValue("");
      this._byAnyId(["idGenValidToDP", "dpTo"])?.setValue("");

      const oItemTypeMCB = this._mcb("idGenItemTypeMCB", "selItemType");
      const oRuleTypeMCB = this._mcb("idGenRuleTypeMCB", "selRuleType");
      oItemTypeMCB?.removeAllSelectedItems();
      oRuleTypeMCB?.removeAllSelectedItems();
      if (typeof bEnableCombos === "boolean") {
        oItemTypeMCB?.setEnabled(bEnableCombos);
        oRuleTypeMCB?.setEnabled(bEnableCombos);
      }

      this.byId("_IDGenSelect")?.setSelectedKey("");
      this.byId("_IDGenMultiComboBox")?.removeAllSelectedItems();
    },

    _isGeneralInfoValid: function () {
      const bNameOk = !!this._input("idGenNameInput", "inpName")?.getValue()?.trim();
      const bDescOk = !!this._input("idGenDescInput", "inpDesc")?.getValue()?.trim();
      const bItemOk = !!this._mcb("idGenItemTypeMCB", "selItemType")?.getSelectedItems()?.length;
      const bRuleOk = !!this._mcb("idGenRuleTypeMCB", "selRuleType")?.getSelectedItems()?.length;
      return bNameOk && bDescOk && bItemOk && bRuleOk;
    },

    _performFilterDeletion: function (aSelectedItems) {
      const oModel = this.getView()?.getModel("app");
      const aExisting = oModel?.getProperty("/filters") || [];
      const aIndices = aSelectedItems
        .map(function (oItem) {
          const sPath = oItem.getBindingContext("app")?.getPath();
          return sPath ? parseInt(sPath.split("/").pop() ?? "-1", 10) : -1;
        })
        .filter(function (iIdx) { return iIdx !== -1; })
        .sort(function (iA, iB) { return iB - iA; });

      aIndices.forEach(function (iIndex) { aExisting.splice(iIndex, 1); });
      oModel?.setProperty("/filters", aExisting);
      this.byId("tblFilters")?.removeSelections();
      this._toast("FILTERS_DELETED_SUCCESS_MSG");
    },

    _performAdjLogicDeletion: function (aSelectedItems) {
      const oModel = this.getView()?.getModel("app");
      const aExisting = oModel?.getProperty("/adjLogic") || [];
      const aIndices = aSelectedItems
        .map(function (oItem) {
          const sPath = oItem.getBindingContext("app")?.getPath();
          return sPath ? parseInt(sPath.split("/").pop() ?? "-1", 10) : -1;
        })
        .filter(function (iIdx) { return iIdx !== -1; })
        .sort(function (iA, iB) { return iB - iA; });

      aIndices.forEach(function (iIndex) { aExisting.splice(iIndex, 1); });
      oModel?.setProperty("/adjLogic", aExisting);
      this.byId("tblAdjLogic")?.removeSelections();
      this._toast("ADJ_DELETED_SUCCESS_MSG");
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

    _mapCharacteristicKey: function (sText) {
      switch (sText) {
        case "Product": return "Product";
        case "Product group": return "ProductGroup";
        case "Footprint value": return "FootprintValue";
        case "Footprint type": return "FootprintType";
        default: return sText;
      }
    },
    _mapItemTypeKey: function (sText) {
      switch (sText) {
        case "Product": return "PRO";
        default: return sText;
      }
    },
    _mapRuleTypeKey: function (sText) {
      switch (sText) {
        case "Average calculated product footprint": return "AV";
        default: return sText;
      }
    },
    _mapOperatorText: function (sKey) {
      switch (sKey) {
        case "EQ": return this._i18n("OP_EQ");
        case "NE": return this._i18n("OP_NE");
        case "LT": return this._i18n("OP_LT");
        case "GT": return this._i18n("OP_GT");
        default: return sKey;
      }
    },
    _mapOperatorKey: function (sText) {
      switch (sText) {
        case "Equal to": return "EQ";
        case "Not equal to": return "NE";
        case "Less than": return "LT";
        case "Greater than": return "GT";
        default: return sText;
      }
    },
    _mapLogicKey: function (sText) {
      switch (sText) {
        case "Rolling average": return "ROLLAVG";
        default: return sText;
      }
    },
    _mapFilterValues: function (sText) {
      switch (sText) {
        case "All": return "VAL";
        default: return sText;
      }
    },
    _mapValueKey: function (sText) {
      switch (sText) {
        case "Last 3 months": return "3";
        case "Last 6 months": return "6";
        case "Last 12 months": return "12";
        default: return sText;
      }
    },
    _mapPlantKey: function (sText) {
      switch(sText) {
        case "001": return "Plant 1";
        case "002": return "Plant 2";
        case "003": return "Plant 3";
        default: return sText;
      }
    },
    _applyFiltersForCurrentRule: async function (oCreated) {
      const oModel = this.getView().getModel("rules");

      if (oCreated != null) {      
        const aFilter = await this.onGetFilter(oCreated)
        oModel?.setProperty("/filter", aFilter)
      }
    },
    _applyAdjLogicForCurrentRule: async function (oCreated) {
      const oModel = this.getView().getModel("rules");
      
      if (oCreated != null ) {      
        const aScope = await this.onGetAdjLogic(oCreated)
        oModel?.setProperty("/adjlogic", aScope)
      }
    },

    onPlantsSelectionChange: function (oEvent) {
      const oMCB = oEvent.getSource();
      const oModel = this.getView().getModel("app");

      const oChangedItem = oEvent.getParameter("changedItem");
      const bSelected = oEvent.getParameter("selected");
      const sChangedKey = oChangedItem && oChangedItem.getKey();

      let aSelectedKeys = oMCB.getSelectedKeys();
      const aAllKeys = ["001", "002", "003"]

      // --- "All Plants" (selected) ---
      if (sChangedKey === "*" && bSelected) {
        aSelectedKeys = ["*", ...aAllKeys];

        oMCB.setSelectedKeys(aSelectedKeys);
        return;
      }

      // --- unclicked "All Plants" (deselected) ---
      if (sChangedKey === "*" && !bSelected) {
        aSelectedKeys = [];

        oMCB.setSelectedKeys(aSelectedKeys);
        return;
      }

      // --- changed an individual plant ---
      const bAllSelected =
        aAllKeys.length > 0 &&
        aAllKeys.every(k => aSelectedKeys.includes(k));

      if (!bAllSelected && aSelectedKeys.includes("*")) {
        aSelectedKeys = aSelectedKeys.filter(k => k !== "*");
        oMCB.setSelectedKeys(aSelectedKeys);
      }

      if (bAllSelected && !aSelectedKeys.includes("*")) {
        aSelectedKeys = ["*", ...aSelectedKeys];
        oMCB.setSelectedKeys(aSelectedKeys);
      }
    },

    onItemTypeSelectionChange: function () {
      this._syncRuleTypeAvailability();
    },

    onLogicalOperatorChange: function (oEvent) {
      const oComboBox = oEvent.getSource();                 
      const sKey = oComboBox.getSelectedKey() || "";       

      const oRowItem = oComboBox.getParent();             
      const sPath = oRowItem.getBindingContext("app")?.getPath(); 

      if (!sPath) return;

      const oModel = this.getView().getModel("app");
      oModel.setProperty(`${sPath}/LogOp`, sKey);
    },

    onLogicalOperatorChangeFilter: function (oEvent) {

      const sSelectedKey = oEvent.getSource().getSelectedKey();

      const oTable = this.byId("tblFilters");
      const oBinding = oTable.getBinding("items");
      if (!oBinding) return;

      if (!sSelectedKey) {
        oBinding.filter([]);
        return;
      }

      const oOrFilter = new sap.ui.model.Filter({
        filters: [
          new sap.ui.model.Filter("LogOp", sap.ui.model.FilterOperator.EQ, sSelectedKey),
          new sap.ui.model.Filter("LogOp", sap.ui.model.FilterOperator.EQ, "")
        ],
        and: false
      });

      oBinding.filter([oOrFilter]);
    },

    _syncRuleTypeAvailability: function () {
      const oItemTypeMCB = this.byId("idGenItemTypeMCB");
      const oRuleTypeMCB = this.byId("idGenRuleTypeMCB");

      const aSelectedItemTypes = oItemTypeMCB.getSelectedKeys(); // ["PRO", "REC", ...]
      const bHasPRO = aSelectedItemTypes.includes("PRO");

      // Find the AV item inside RuleType MCB
      const oAVItem = oRuleTypeMCB.getItems().find(oItem => oItem.getKey() === "AV");
      if (oAVItem) {
        oAVItem.setEnabled(bHasPRO); // disable if PRO not selected
      }

      // If AV is selected but PRO is no longer selected -> remove AV from selection
      if (!bHasPRO && oRuleTypeMCB.getSelectedKeys().includes("AV")) {
        const aNewRuleKeys = oRuleTypeMCB.getSelectedKeys().filter(k => k !== "AV");
        oRuleTypeMCB.setSelectedKeys(aNewRuleKeys);
      }

      // Optional: show a ValueState message when AV is disabled and user had it selected
      if (!bHasPRO) {
        oRuleTypeMCB.setValueState("None");
        oRuleTypeMCB.setValueStateText("");
      }
    },
    formatPlants: function (vRuleScope) {
      if (!vRuleScope) {
        return "";
      }

      if (Array.isArray(vRuleScope)) {
        const aPlants = vRuleScope
          .map(o => o?.Plant)
          .filter(Boolean);

        return [...new Set(aPlants)].join(", ");
      }

      if (Array.isArray(vRuleScope.value)) {
        const aPlants = vRuleScope.value
          .map(o => o?.Plant)
          .filter(Boolean);

        return [...new Set(aPlants)].join(", ");
      }

      return "";
    },

    /* ===================== UTIL (ID + i18n) ===================== */
    _byAnyId: function (aIds) {
      for (const sId of aIds) {
        const oCtrl = this.byId(sId);
        if (oCtrl) { return oCtrl; }
      }
      return null;
    },
    _input: function (sNewId, sOldId) { return this.byId(sNewId) || this.byId(sOldId); },
    _mcb: function (sNewId, sOldId) { return this.byId(sNewId) || this.byId(sOldId); },
    _i18n: function (sKey) {
      return this.getView()?.getModel("i18n")?.getResourceBundle()?.getText(sKey) || sKey;
    },
    _toast: function (sKey) { MessageToast.show(this._i18n(sKey)); }
  });
});