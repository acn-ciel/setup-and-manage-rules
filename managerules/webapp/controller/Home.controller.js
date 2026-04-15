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
    onInit: function () {
      try {
        // Current view model
        const oRuleModel = new JSONModel({
          currentRule: null,
          origRule: null,

          editscope: null,
          editgeninfo: null,     
          editfilter: null,
          editadjlogic: null,

          groupsFilter: [],
          editGroupsFilter: null,

          draftscope: null,
          draftfilter: [],
          draftadjlogic: [],

          /** Selection keys */
          selectChar: null,

          /** Gen Info */
          itemType: [],
          ruleType: [],

          /** Filter */
          characteristics: [],
          operator: [],
          product: [],
          valueUomFilter: [],

          /** Adjustment Logic */
          logic: [],
          values: [],
          valueUomAdjLogic: []
        });
        this.getView()?.setModel(oRuleModel, "rules");

        this.getItemType()
        this.getTypeRule()
        this.getCharacteristics()
        this.getOperator()
        this.getProduct()
        this.getValueUom()
        this.getLogic()
        this.getValue()

        this.oExpandedLabel = this.getView().byId("expandedLabel");
        this.oSnappedLabel = this.getView().byId("snappedLabel");
        this.oFilterBar = this.getView().byId("filterbar");
        this.oTable = this.getView().byId("_IDGenTable2");
      } catch (e) {
        console.log("Error: ", e)
      }
    },

    onAfterRendering: function () {
      // Item Type filter, Product option only
      const oMCBitemtype = this.byId("idGenItemTypeMCB");
      const oBindingItemType = oMCBitemtype.getBinding("items");

      if (!oBindingItemType) {
        setTimeout(() => this.onAfterRendering(), 0);
        return;
      }

      oBindingItemType.changeParameters({
        $filter: "ItemType eq 'PR'"
      });

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

      // Rule Type filter, Average option only
      const oMCBRuleType = this.byId("idGenRuleTypeMCB");
      const oBindingRuleType = oMCBRuleType.getBinding("items");

      if (!oBindingRuleType) {
        setTimeout(() => this.onAfterRendering(), 0);
        return;
      }

      oBindingRuleType.changeParameters({
        $filter: "IndexNo eq '1'"
      });

      // Rule Type filter, Average option only
      const oMCBRuleTypeFilter = this.byId("idGenRuleTypeMCBFilter");
      const oBindingRTFilter = oMCBRuleTypeFilter.getBinding("items");

      if (!oBindingRTFilter) {
        setTimeout(() => this.onAfterRendering(), 0);
        return;
      }

      oBindingRTFilter.changeParameters({
        $filter: "IndexNo eq '1'"
      });
      
      // Plant selection in Scope
      const oMcbPlant = this.byId("_IDGenMultiComboBox");
      // if (oMcbPlant.getItemByKey && oMcbPlant.getItemByKey("*")) return;

      oMcbPlant.insertItem(new sap.ui.core.Item({
        key: "*",
        text: "All"
      }), 0);
    },

    loadTable: async function () {
      const oTable = this.byId("_IDGenTable2");
      const oBinding = oTable.getBinding("rows");

      if (oBinding) {
        oBinding.refresh();
      }

      oTable.setBusy(false)
    },

    onEditCreatedRule2: async function (oCreated) {
      const oGenInfo = this.onGetGenInfo();
      const oScope = this.onGetScope();

      try {
        await this.onPatchGenInfo(oCreated, oGenInfo);
        await this.updateScope(oScope);
      } catch (e) {
        console.log(e)
      }

      // const oFilter = this.onGetFilter() || [];
      // const aGroupFilter = await this.onFetchFilter(oCreated.RuleId)

      // const oAdjLogic = this.onGetAdjLogic();

      // // No assigned rule ID, so assign it from oCreated._RuleScope
      // console.log("oScope from Input: ", oScope)
      // console.log("oScope oCreated: ", oCreated._RuleScope)

      // // No assigned rule ID, so assign it from oCreated._RuleScope
      // console.log("aFilter from Input: ", oFilter)
      // console.log("aFilter oCreated: ", aGroupFilter)

      // // No assigned rule ID, so assign it from oCreated._RuleScope
      // console.log("aLogic from Input: ", oAdjLogic)
      // console.log("aLogic oCreated: ", oCreated._RuleLogic)

      return true
    },

    compareScopeItems: function (oScope) {
      const oModel = this.getView().getModel("rules")
      const origScope = oModel.getProperty("/currentRule/_RuleScope")
      var origScopePlants = origScope.map(o => (o.Plant))
      
      const newPlants = oScope.Plant.filter(p => !origScopePlants.includes(p))
      console.log("New Plants: ", newPlants)

      var deleteArr = []
      var deleteScope = false
      var postArr = []
      var patchArr = []

      var changeItem = []
      var tempItem = []

      console.log("OSCOPE: ", oScope.InventoryScope)
      console.log("origScope: ", origScope[0].InventoryScope)

      if (oScope.InventoryScope !== origScope[0].InventoryScope) {
        deleteScope = true
        postArr = oScope 
        deleteArr = origScope
      }
      
      else {

        oScope.Plant.forEach(p => {
          if (!origScopePlants.includes(p)) {
            tempItem.push({Plant: p, InventoryScope: oScope.InventoryScope})
          }
        })

        origScope.forEach(o => {
          if (!oScope.Plant.includes(o.Plant)) {
            changeItem.push(o)
          }
        })

        console.log("tempItem", tempItem)
        console.log("changeItem", changeItem)

        /** Determine plants to be deleted */
        if (oScope.Plant.length < origScope.length) {
          deleteArr = changeItem.filter(c => !oScope.Plant.includes(c.Plant))
          
          deleteArr.forEach(d => {
            const i = changeItem.findIndex(c => c.Plant === d.Plant);
            if (i !== -1) {
              changeItem.splice(i, 1);
            }
          });

          // Check if all prev plants are deleted, then post is needed
          if (newPlants.length > 0) {
            postArr = oScope
          }
        } 

        /** Determine plants to be added */
        else if (oScope.Plant.length > origScope.length) {
          var addPlants = []

          // Count items that will be added
          const addItemsLength = oScope.Plant.length - origScope.length;
                addPlants = tempItem.splice(0, addItemsLength)
          const plants = addPlants.map(p => p.Plant)

          postArr = {
            InventoryScope: oScope.InventoryScope,
            Plant: plants
          }
        }

        /** Determine plants to be patched */
        if (changeItem.length > 0) {
          console.log("Change item: ", changeItem)

          // Determine the plants that are for deletion/posting
          const deletePlantsArr = deleteArr.map(d => d.Plant)

          const currPlants = postArr.Plant ? [...deletePlantsArr, ...postArr.Plant] : [...deletePlantsArr]
          const patchPlants = []

          console.log("Current Plants: ", currPlants)

          newPlants.forEach(p => {
            if (!currPlants.includes(p)) {
              patchPlants.push(p)
            }
          })

          console.log("Patch Plant: ", patchPlants)

          origScope.forEach(p => {
            if (!currPlants.includes(p.Plant)) {
              patchPlants.push(p.Plant)
            }
          })

          changeItem.forEach((t, i) => {
            patchArr.push({
              ...t,
              Id: t.Id,
              RuleUUID: t.RuleUUID,
              RuleId: t.RuleId,
              DraftUUID: t.DraftUUID,
              IsActiveEntity: t.IsActiveEntity,
              InventoryScope: oScope.InventoryScope,
              Plant: patchPlants[i]          
            })
          })
        }
      }

      const updateItems = {
        Delete: deleteArr,
        deleteScope: deleteScope,
        Post: postArr,
        Patch: patchArr,
      }

      console.log("Update Items: ", updateItems)
      return updateItems
    },

    updateScope: function (oScope) {
      const oModel = this.getView().getModel("rules")
      const oCreated = oModel.getProperty("/currentRule");
      const updateItems = this.compareScopeItems(oScope)

      console.log("update items: ", updateItems)

      if (updateItems.Patch.length > 0) {
        updateItems.Patch.forEach(oPayLoad => {
          this.onPatchScope(oPayLoad)
        })
      } 
      
      if (updateItems.Delete.length > 0) {
        updateItems.Delete.forEach(oPayLoad => {
          this.onDeleteScope(oPayLoad)
        })
      }
      
      if (Object.keys(updateItems.Post).length > 0) {
        console.log("Update Items Post")
        this.onCreateScope(oCreated, updateItems.Post)
      }

      if (updateItems.deleteScope) {
        updateItems.Delete.forEach(oPayLoad => {
          this.onDeleteScope(oPayLoad)
        })
        this.onCreateScope(oCreated, updateItems.Post)
      }
    },

    /* ================== GET VALUE HELP DATA: General Info ================== */
    getItemType: async function () {
      const oModel = this.getOwnerComponent().getModel("zsd_itemtype_vh");
      const loadModel = this.getView().getModel("rules")
      try {
        const oList = oModel.bindList("/ZI_ITEMTYPE_VH");
        const aContexts = await oList.requestContexts();
        const itemType = aContexts.map(c => c.getObject());
        loadModel.setProperty("/itemType", itemType)
      } catch (e) {
        console.error("Failed to load", e);
        return [];
      }
    },

    getTypeRule: async function () {
      const oModel = this.getOwnerComponent().getModel("zsd_typerules_vh");
      const loadModel = this.getView().getModel("rules")
      try {
        const oList = oModel.bindList("/ZI_TYPERULES_VH");
        const aContexts = await oList.requestContexts();
        const ruleType = aContexts.map(c => c.getObject());
        loadModel.setProperty("/ruleType", ruleType)
      } catch (e) {
        console.error("Failed to load", e);
        return [];
      }
    },

    /* ================== GET VALUE HELP DATA: Scope ================== */
    getInventoryScope: async function () {
      const oModel = this.getOwnerComponent().getModel("zsd_inventoryscope_vh");
      try {
        const oList = oModel.bindList("/ZI_INVENTORYSCOPE_VH");
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

    /* ================== GET VALUE HELP DATA: Filter ================== */
    getCharacteristics: async function () {
      const oModel = this.getOwnerComponent().getModel("zsd_characteristic_vh");
      const loadModel = this.getView().getModel("rules")
      try {
        const oList = oModel.bindList("/ZI_CHARACTERISTIC_VH");
        const aContexts = await oList.requestContexts();
        const obj = aContexts.map(c => c.getObject());
        loadModel.setProperty("/characteristics", obj)
      } catch (e) {
        console.error("Failed to load characteristics VH", e);
        return [];
      }
    },

    getOperator: async function () {
      const oModel = this.getOwnerComponent().getModel("zsd_operator_vh");
      const loadModel = this.getView().getModel("rules")
      try {
        const oList = oModel.bindList("/ZI_OPERATOR_VH");
        const aContexts = await oList.requestContexts();
        const obj = aContexts.map(c => c.getObject());
        loadModel.setProperty("/operator", obj)
      } catch (e) {
        console.error("Failed to load characteristics VH", e);
        return [];
      }
    },

    getProduct: async function () {
      const oModel = this.getOwnerComponent().getModel("zsd_product_vh");
      const loadModel = this.getView().getModel("rules")
      try {
        const oList = oModel.bindList("/ZI_PRODUCT_VH");
        const aContexts = await oList.requestContexts();
        const obj = aContexts.map(c => c.getObject());
        loadModel.setProperty("/product", obj)
      } catch (e) {
        console.error("Failed to load", e);
        return [];
      }
    },

    getValueUom: async function () {
      const oModel = this.getOwnerComponent().getModel("zsd_uom_vh");
      const loadModel = this.getView().getModel("rules")
      try {
        const oList = oModel.bindList("/ZI_UOM_VH");
        const aContexts = await oList.requestContexts();
        const obj = aContexts.map(c => c.getObject());
        loadModel.setProperty("/valueUomFilter", obj)
      } catch (e) {
        console.error("Failed to load", e);
        return [];
      }
    },

    getLogic: async function () {
      const oModel = this.getOwnerComponent().getModel("zsd_logic_vh");
      const loadModel = this.getView().getModel("rules")
      try {
        const oList = oModel.bindList("/ZI_LOGIC_VH");
        const aContexts = await oList.requestContexts();
        const obj = aContexts.map(c => c.getObject());
        const selLogic = obj.filter(l => (l.RuleType == "001"))
        loadModel.setProperty("/logic", selLogic)
      } catch (e) {
        console.error("Failed to load", e);
        return [];
      }
    },

    getValue: async function () {
      const oModel = this.getOwnerComponent().getModel("zsd_values_vh");
      const loadModel = this.getView().getModel("rules")
      try {
        const oList = oModel.bindList("/ZI_VALUES_VH");
        const aContexts = await oList.requestContexts();
        const obj = aContexts.map(c => c.getObject());
        const selLvalues = obj.filter(v => (v.Logic == "1"))
        loadModel.setProperty("/values", selLvalues)
      } catch (e) {
        console.error("Failed to load", e);
        return [];
      }
    },

    /* ===================== DELETE METHOD ===================== */
    onDeleteRule: async function () {
      const oTable = this.byId("_IDGenTable2");
      const aIdx = oTable.getSelectedIndices();

      if (!aIdx.length) {
        sap.m.MessageToast.show("Please select at least one rule.");
        return;
      }

      const oModel = this.getOwnerComponent().getModel();

      try {
        const aDeletePromises = [];

        aIdx.forEach(idx => {
          var oRow = oTable.getContextByIndex(idx).getObject();
          oRow = {
            ...oRow,
            DraftUUID: oRow.DraftUUID || "00000000-0000-0000-0000-000000000000",
            IsActiveEntity: oRow.IsActiveEntity || true
          }
          const sPath = `/ZC_RULESHEADER(` +
            `Id=${oRow.Id},` +
            `RuleId='${oRow.RuleId}',` +
            `DraftUUID=${oRow.DraftUUID},` +
            `IsActiveEntity=${oRow.IsActiveEntity})`;

          if (oRow.IsActiveEntity === false) {
            const oDiscardCtx = oModel.bindContext(`${sPath}/Discard(...)`);
            aDeletePromises.push(oDiscardCtx.invoke("$auto"));
          } else {
            aDeletePromises.push(oModel.delete(sPath, "$auto"));
          }
        });

        await Promise.all(aDeletePromises);
        oTable.setBusy(true)
        
        await this.loadTable()
        sap.m.MessageToast.show("Selected rule(s) deleted.");

      } catch (e) {
        console.error(e);
        sap.m.MessageBox.error(e?.message || "Delete failed");
      }
    },

    onDeleteRuleChildren: async function () {
      const oTable = this.byId("_IDGenTable");
      const aIdx = oTable.getSelectedIndices();

      if (!aIdx.length) {
        sap.m.MessageToast.show("Please select at least one rule.");
        return;
      }

      const oCtx = oTable.getContextByIndex(aIdx[0]);
      const oModel = this.getOwnerComponent().getModel();

      const aNavProps = [
        "_RuleScope",
        "_RuleFilter",
        "_RuleLogic"
      ];

      try {
        const aDeletePromises = [];

        aIdx.forEach(idx => {
          const oRow = oTable.getContextByIndex(idx).getObject();
          const sPath = `/ZC_RULESHEADER(Id=${oRow.Id},RuleId='${encodeURIComponent(oRow.RuleId)}',DraftUUID=${oRow.DraftUUID},IsActiveEntity=${oRow.IsActiveEntity})`;

          if (oRow.IsActiveEntity === false) {
            const oDiscardCtx = oModel.bindContext(`${sPath}/Discard(...)`);
            aDeletePromises.push(oDiscardCtx.invoke("$auto"));
          } else {
            aDeletePromises.push(oModel.delete(sPath, "$auto"));
          }
        });

        await Promise.all(aDeletePromises);
        oTable.setBusy(true)
        
        await this.loadRuleData()
        sap.m.MessageToast.show("Selected rule(s) deleted.");

      } catch (e) {
        console.error(e);
        sap.m.MessageBox.error(e?.message || "Delete failed");
      }
    },

    onDeleteScope: async function (oPayLoad) {
      console.log("Delete Scope", oPayLoad)
      const oModel = this.getOwnerComponent().getModel();
      const aDeletePromises = [];

      const sPath = `/ZC_RULESSCOPE(` +
        `Id=${oPayLoad.Id},` +
        `RuleId='${oPayLoad.RuleId}',` +
        `RuleUUID=${oPayLoad.RuleUUID},` +
        `DraftUUID=${oPayLoad.DraftUUID},` +
        `IsActiveEntity=${oPayLoad.IsActiveEntity})`;

      aDeletePromises.push(oModel.delete(sPath, "$auto"))
      await Promise.all(aDeletePromises);
    },

    /* ===================== GET METHOD ===================== */
    onFetchRule: async function (oCreated) {
      const oModel = this.getOwnerComponent().getModel();

      const sPath =
        `/ZC_RULESHEADER(` +
          `Id=${oCreated.Id},` +
          `RuleId='${oCreated.RuleId}',` +
          `DraftUUID=${oCreated.DraftUUID},` +
          `IsActiveEntity=${oCreated.IsActiveEntity}` +
        `)`;

      const oCtxBinding = oModel.bindContext(
        sPath,
        null,   
        null,   
        null,   
        {       
          $expand: {
            _RuleScope: true,
            _RuleLogic: true
          }
        }
      );

      return await oCtxBinding.requestObject();
    },

    onFetchScope: async function (oCreated) {
      const oModel = this.getOwnerComponent().getModel();
      const oCtxBinding = oModel.bindList(
        `/ZC_RULESHEADER(Id=${oCreated.Id},`+
        `RuleId='${oCreated.RuleId}',`+
        `DraftUUID=${oCreated.DraftUUID},`+
        `IsActiveEntity=${oCreated.IsActiveEntity})/_RuleScope`
      );

      const aContexts = await oCtxBinding.requestContexts();
      return aContexts.map(c => c.getObject());
    },

    onFetchAdjLogic: async function (oCreated) {
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

    onFetchFilter: async function (oCreated) {
      const oODataModel = this.getOwnerComponent().getModel("zsd_filtersgroup");

      const oList = oODataModel.bindList("/ZC_FILTERSGROUP", null, null, null, {
        $expand: "_FilterCondition($expand=_FilterValues)",
        $filter: `RuleId eq '${oCreated.RuleId}'`
      });
      
      const aContexts = await oList.requestContexts();
      return aContexts.map(c => c.getObject());
    },

    onDeleteFilterGroup: async function (oCreated) {
      const aGroupFilter = await this.onFetchFilter(oCreated.RuleId) || []
      const oModel = this.getOwnerComponent().getModel("zsd_filtersgroup");

      try {
        const aDeletePromises = [];
        if (aGroupFilter.length > 0) {
          aGroupFilter.forEach( f => {
            const sPath = `/ZC_FILTERSGROUP(GroupId=${f.GroupId},IsActiveEntity=${f.IsActiveEntity})`
            aDeletePromises.push(oModel.delete(sPath, "$auto"));
          })

          await Promise.all(aDeletePromises);
        }
      } catch (e) {
        console.error(e);
        sap.m.MessageBox.error(e?.message || "Delete failed");
      }
    },

    onDeleteRuleChildren: async function (oCreated) {
      const oModel = this.getOwnerComponent().getModel();
      const aNavProps = ["_RuleScope", "_RuleFilter", "_RuleLogic"];

      try {
        const sPath =
          `/ZC_RULESHEADER(` +
          `Id=${oCreated.Id},` +
          `RuleId='${encodeURIComponent(oCreated.RuleId)}',` +
          `DraftUUID=${oCreated.DraftUUID},` +
          `IsActiveEntity=${oCreated.IsActiveEntity}` +
          `)`;

        for (const sNav of aNavProps) {
          const oChildList = oModel.bindList(`${sPath}/${sNav}`);
          const aChildCtx = await oChildList.requestContexts();
          for (const oChild of aChildCtx) {
            await oChild.delete("$auto");
          }
        }

        await this.onDeleteFilterGroup(oCreated)
      } catch (e) {
        console.error(e);
        sap.m.MessageBox.error(e?.message || "Delete failed");
      }
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

      const oView = this.getView();
      const oModel = oView.getModel("rules") || [];
      const oScope = oModel.getProperty("/editscope") || null
      var oCreated = oModel.getProperty("/currentRule") || null;
      
      this.showLogOpOptions()

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
        const aRuleTypeItems = this._byAnyId("idGenRuleTypeMCB", "selRuleType")
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
          oView.setBusy(true)
          try {
            await this.onPatchGenInfo(oCreated, oNewRule)
          } catch (e) {
            this._toast(`${e}`)
          } finally {
            oView.setBusy(false);
          }
          
        } else {
          // Create new rule
          oView.setBusy(true)
          try {
            oCreated = await this.onCreateGenInfo(oNewRule)
            oModel?.setProperty("/currentRule", oCreated)
          } catch (e) {
            this._toast(`${e}`)
          } finally {
            oView.setBusy(false);
          }
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

        if (oScope != null) {
          // Edit scope
          oView.setBusy(true)
          try {
            // await this.onPatchScope(oCreated, oNewScope)
            oModel?.setProperty("/editscope", null)
          } catch (e) {
            this._toast(`${e}`)
          } finally {
            oView.setBusy(false);
          }
        } else {
          // Create scope
          oView.setBusy(true)
          try {
            await this.onCreateScope(oCreated, oNewScope)
          } catch (e) {
            this._toast(`${e}`)
          } finally {
            oView.setBusy(false);
          }
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

        MessageBox.success(this._i18n("RULE_SAVED_SUCCESS"), {
          title: this._i18n("SUCCESS_TITLE"),
          onClose: function () {
            oWizard.discardProgress(oStepGeneral);
            this.byId("_IDGenNavContainer")?.backToTop();
          }.bind(this)
        });

        const oTable = this.byId("_IDGenTable");
        oTable.setBusyIndicatorDelay(0);
        oTable.setBusy(true);

        try {
          await oTable.getBinding("rows").refresh();
        } catch (e) {
          this._toast(`${e}`)
        } finally {
          oTable.attachEventOnce("rowsUpdated", function () {
            oTable.setBusy(false);
          });
        }
      }
    },

    onGetGenInfo: function () {
      const sName = this._input("idGenNameInput", "inpName")?.getValue() || "";
      const sDesc = this._input("idGenDescInput", "inpDesc")?.getValue() || "";
      const sFrom = this._byAnyId(["idGenValidFromDP", "dpFrom"])?.getValue() || "";
      const sTo   = this._byAnyId(["idGenValidToDP", "dpTo"])?.getValue() || "";

      const aItemTypeItems = this._mcb("idGenItemTypeMCB", "selItemType")
        ?.getSelectedKeys()
      const aRuleTypeItem = this.byId("idGenRuleTypeMCB")
        ?.getSelectedKey()

      const oNewRule = {
        RuleName: sName,
        RuleDescription: sDesc,
        ValidFrom: sFrom,
        ValidTo: sTo,
        ItemType: aItemTypeItems.join(","),
        RuleType: aRuleTypeItem,
        IsActiveEntity : true
      };

      return oNewRule;
    },

    onGetScope: function () {
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

      return oNewScope;
    },

    onGetFilter: function () {
      const oModel = this.getView().getModel("rules");
      const dFilter = oModel.getProperty("/groupsFilter") || null;

      return dFilter;
    },

    onGetAdjLogic: function () {
      const oModel = this.getView().getModel("rules");
      const dAdjLogic = oModel.getProperty("/draftadjlogic") || null;

      return dAdjLogic;
    },

    onSaveNewRule: async function () {
      const oGenInfo = this.onGetGenInfo();
      const oScope = this.onGetScope();
      const oFilter = this.onGetFilter() || [];
      const oAdjLogic = this.onGetAdjLogic();
      
      var success = null
      const oView = this.getView();
      oView.setBusy(true)

      try {    
        const oCreated = await this.onCreateGenInfo(oGenInfo);
        await this.onCreateScope(oCreated, oScope);
        
        if (oFilter.length > 0) { await oFilter.map(f => this.onCreateFilter(oCreated, f)) }
        if (oAdjLogic.length > 0) { await oAdjLogic.map(a => this.onCreateAdjLogic(oCreated, a)) }

        success = true
      } catch (e) {
        MessageBox.error(`${e}`)
        success = false
      } finally {
        oView.setBusy(false)
        return success
      }
    },

    onEditCreatedRule: async function (oCreated) {
      const oGenInfo = this.onGetGenInfo();
      const oScope = this.onGetScope();
      const oFilter = this.onGetFilter() || [];
      const oAdjLogic = this.onGetAdjLogic();

      var success = null;
      const oView = this.getView();
      oView.setBusy(true)

      try {    
        await this.onDeleteRuleChildren(oCreated)
        
        await this.onPatchGenInfo(oCreated, oGenInfo);
        await this.onCreateScope(oCreated, oScope);

        if (oFilter.length > 0) {
          await Promise.all(oFilter.map(f => this.onCreateFilter(oCreated, f)));
        }
        if (oAdjLogic.length > 0) {
          await Promise.all(oAdjLogic.map(a => this.onCreateAdjLogic(oCreated, a)));
        }
        success = true
      } catch (e) {
        MessageBox.error(`${e}`)
        success = false
      } finally {
        oView.setBusy(false)
        return success
      }
    },

    onValidateNextStep: async function () {
      const oWizard = this._byAnyId(["idGenWizard", "GeneralWizard"]);
      const sCurrentStepId = oWizard?.getCurrentStep?.();

      if (!sCurrentStepId) { return; }

      const oStepGeneral = this._byAnyId(["idGenStepGeneral", "StepGeneral"]);
      const oStepScope   = this._byAnyId(["idGenStepScope", "StepScope"]);
      const oStepFilter  = this._byAnyId(["idGenStepFilters", "StepFilters"]);
      const oStepAdj     = this._byAnyId(["idGenStepAdjLogic", "StepAdjLogic"]);

      const oView = this.getView();
      const oModel = oView.getModel("rules") || [];

      /* Step 1: General Information */
      if (sCurrentStepId === oStepGeneral?.getId()) {
        if (!this._isGeneralInfoValid()) {
          this._toast("GENINFO_MANDATORY_MSG");
          return;
        }

        oWizard?.validateStep(oStepGeneral);
        oWizard?.nextStep();
        return;
      }

      /* Step 2: Scope */
      if (sCurrentStepId === oStepScope?.getId()) {
        if (!this._isScopeValid()) {
        this._toast("GENINFO_MANDATORY_MSG");
        return;
        }

        oWizard?.validateStep(oStepScope);
        oWizard?.nextStep();
        return;
      }

      /* Step 3: Filters */
      if (sCurrentStepId === oStepFilter?.getId()) {
        oWizard?.validateStep(oStepFilter);
        const currentFilter = oModel.getProperty("/draftfilter")

        if (currentFilter.length > 0) { this._toast("FILTERS_SAVED_MSG") };

        oWizard?.nextStep();
        return;
      }

      /* Step 4: Adjustment Logic */
      if (sCurrentStepId === oStepAdj?.getId()) {
        const missingSection = this._validateAllReqFields() || [];
        const oCreated = oModel.getProperty("/currentRule")
        var success = null;

        setTimeout(() => {
          this.clearStackMessages()
        }, 2000)

        if (missingSection.length > 0) {
          oWizard.goToStep(this.byId(`${missingSection}`));
        } else {
          oWizard.goToStep(this.byId("StepAdjLogic"));

          // Edit Rule
          if (oCreated != null) {
            console.log("EDIT RULE")
            try {
              // success = await this.onEditCreatedRule(oCreated)
              success = await this.onEditCreatedRule2(oCreated)
            } catch (e) {
              MessageBox.error(`${e}`)
            } finally {
              if (success) {
                MessageBox.success(this._i18n("RULE_EDITED_SUCCESS"), {
                title: this._i18n("SUCCESS_TITLE"),
                onClose: function () {
                  oWizard.discardProgress(oStepGeneral);
                  this.byId("_IDGenNavContainer")?.backToTop();
                  oModel.setProperty("/groupsFilter", [])
                  oModel.setProperty("/draftadjlogic", [])
                  oModel.setProperty("/currentRule", null)
                }.bind(this)
                });
              }
            }
          } 
          // Create Rule
          else {
            console.log("CREATE RULE")
            try {
              success = await this.onSaveNewRule()
            } catch (e) {
              MessageBox.error(`${e}`)
            } finally {
              if (success) {
                MessageBox.success(this._i18n("RULE_SAVED_SUCCESS"), {
                title: this._i18n("SUCCESS_TITLE"),
                onClose: function () {
                  oWizard.discardProgress(oStepGeneral);
                  this.byId("_IDGenNavContainer")?.backToTop();
                  oModel.setProperty("/groupsFilter", [])
                  oModel.setProperty("/draftfilter", [])
                  oModel.setProperty("/draftadjlogic", [])
                }.bind(this)
                });
              }
            }
            }

            try {     
              this.loadTable()
            } catch (e) {
              this._toast(`${e}`)
            }
        }
      }
    },

    _validateAllReqFields: function () {
      const aGenInfo = this._isGeneralInfoValid();
      const aScope = this._isScopeValid();
      const aAdjLogic = this._isAdjLogValid();
      var missingSections = [];

      this.clearStackMessages();

      if (!aGenInfo) {
        this.pushStackMessage("Missing fields in General Info.", "Error", 0);
        missingSections.push("idGenStepGeneral")
      }

      if (!aScope) {
        this.pushStackMessage("Missing fields in Scope.", "Error", 0);
        missingSections.push("StepScope")
      }

      if (!aAdjLogic) {
        this.pushStackMessage("Add at least one Adjustment Logic.", "Error", 0);
        missingSections.push("StepAdjLogic")
      }

      return missingSections[0];
    },

    /* ===================== POST METHOD ===================== */
    onCreateGenInfo: async function (oPayload) {
      const oModel = this.getOwnerComponent().getModel();
      const oList = oModel.bindList("/ZC_RULESHEADER");

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

    onCreateScope: async function (oCreated, oPayload) {
      const oModel = this.getOwnerComponent().getModel();
      const oList = oModel.bindList(
        `/ZC_RULESHEADER(Id=${oCreated.Id},`+
        `RuleId='${oCreated.RuleId}',`+
        `DraftUUID=${oCreated.DraftUUID},`+
        `IsActiveEntity=${oCreated.IsActiveEntity})/_RuleScope`
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
            const oCtx = oList.create({
              InventoryScope: oPayload.InventoryScope, 
              Plant: oPayload.Plant[0],
              IsActiveEntity : true
            }); 
            await oCtx.created();        
            return oCtx.getObject();  
          }
      } catch (e) {
        console.error(e);
        sap.m.MessageBox.error(e.message || "Create failed");
      }
    },

    onCreateFilter: async function (oCreated, _oPayload) {
      const oModel = this.getOwnerComponent().getModel("zsd_filtersgroup");
      const oList = oModel.bindList(`/ZC_FILTERSGROUP`);

      const oPayload = {
        ..._oPayload,
        RuleId: oCreated.RuleId
      }

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

    /* ===================== PATCH METHOD ===================== */
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

    onPatchScope: async function (oPayload) {
      const oModel = this.getOwnerComponent().getModel();
      const scopeValues = {
        Plant: oPayload.Plant,
        InventoryScope: oPayload.InventoryScope
      }

      const sPath = 
        `/ZC_RULESSCOPE(`+
        `Id=${oPayload.Id},`+
        `RuleUUID=${oPayload.RuleUUID},` +
        `RuleId='${oPayload.RuleId}',`+
        `DraftUUID=${oPayload.DraftUUID},`+
        `IsActiveEntity=${oPayload.IsActiveEntity})`;
      const oCtxBinding = oModel.bindContext(sPath, null, { $$updateGroupId: "ruleUpdates" });
      const oCtx = oCtxBinding.getBoundContext();

      Object.entries(scopeValues).forEach(([sProp, vValue]) => {
        oCtx.setProperty(sProp, vValue);
      });

      await oModel.submitBatch("ruleUpdates");
      return oCtx.getObject();
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

    onEditRule: async function () {
      const oTable = this.byId("_IDGenTable2");
      const oView = this.getView()
      const aSelectedIndices = oTable.getSelectedIndices();

      if (!aSelectedIndices.length) {
        this._toast("SELECT_ONE_RULE_TO_EDIT_MSG");
        return;
      }

      const iIndex = aSelectedIndices[0];
      const oCtx = oTable.getContextByIndex(iIndex);

      if (!oCtx) {
        this._toast("No context found for selected row.");
        return;
      }

      const aObj = oCtx.getObject();
      const oModel = this.getView()?.getModel("rules");

      const oCreated = {
        ...aObj,
        DraftUUID: aObj.DraftUUID || "00000000-0000-0000-0000-000000000000",
        IsActiveEntity: aObj.IsActiveEntity || true
      }

      oView.setBusy(true)

      const oRuleScope = await this.onFetchScope(oCreated);
      const oGroupsFilter = await this.onFetchFilter(oCreated)
      const oRuleLogic = await this.onFetchAdjLogic(oCreated)

      const oRuleData = {
        ...oCreated,
        _RuleScope: oRuleScope,
        _RuleFilter: oGroupsFilter,
        _RuleLogic: oRuleLogic
      }

      oModel?.setProperty("/currentRule", oRuleData);
      oModel?.setProperty("/origRule", oRuleData);

      this._iEditRuleIndex = aSelectedIndices[0];
      this._navToWizardPage();

      // Step 1: General Information
      this._input("idGenNameInput", "inpName")?.setValue(aObj.RuleName || "");
      this._input("idGenDescInput", "inpDesc")?.setValue(aObj.RuleDescription || "");
      this._byAnyId(["idGenValidFromDP", "dpFrom"])?.setValue(aObj.ValidFrom || "");
      this._byAnyId(["idGenValidToDP", "dpTo"])?.setValue(aObj.ValidTo || "");

      const aValidItemTypes = oModel.getProperty("/itemType")
      const aValidRuleTypes = oModel.getProperty("/ruleType")

      const itemTypeArr = aValidItemTypes.map(a => (a.ItemType))
      const ruleTypeArr = aValidRuleTypes.map(a => (a.IndexNo))

      console.log("itemTypeArr: ", itemTypeArr)
      console.log("ruleTypeArr: ", ruleTypeArr)

      console.log("aObj.ItemTypeInternal: ", aObj.ItemTypeInternal)
      console.log("aObj.RuleType:", aObj.RuleType)

      if (itemTypeArr.includes(aObj.ItemTypeInternal)) {
        this.byId("idGenItemTypeMCB")?.setSelectedKeys([aObj.ItemTypeInternal]);
      }

      if (ruleTypeArr.includes(aObj.RuleType)) {
        this.byId("idGenRuleTypeMCB")?.setSelectedKey(aObj.RuleType);
      }

      // Step 2: Scope
      if (oRuleScope.length > 0) {      
        const aInvScope = oRuleScope[0].InventoryScope || "";
        const aPlants = (oRuleScope.map(s => s.Plant) || "")

        console.log("aInventoryScope: ", aInvScope)
        console.log("aPlants: ", aPlants)

        this.byId("_IDGenSelect")?.setSelectedKey(aInvScope);
        this.byId("_IDGenMultiComboBox")?.setSelectedKeys(aPlants);
      }

      // Step 3 & 4: Filters + AdjLogic
      oModel.setProperty("/groupsFilter", oGroupsFilter)
      oModel.setProperty("/draftadjlogic", oRuleLogic)
      oView.setBusy(false)
    },

    /* ===================== FILTER DIALOGS ===================== */
    onAddFilter: async function (oEvent) {
      const oCtx = oEvent.getSource().getBindingContext("rules"); // group / panel context
      const oModel = this.getView().getModel("rules");

      oModel.setProperty("/editfilter", null)

      const sItemKey = this.byId("idGenItemTypeMCB")?.getSelectedKeys()?.[0] || "";
      const sRuleKey = this.byId("idGenRuleTypeMCB")?.getSelectedKey() || "";

      if (sItemKey == "PR" && sRuleKey == "1") {
        await this._ensureDialog("_pAddDialog", "managerules.view.FilterAddDialog");
      
        const oDialog = await Fragment.byId(
                        this.getView().getId(), 
                        "dlgAddFilter"          
                      );

        oDialog.setBindingContext(oCtx, "rules");
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
      const oView = this.getView();
      const oModel = oView?.getModel("rules");

      await this._ensureDialog("_pAddDialog", "managerules.view.FilterAddDialog");
      
      const oDialog = Fragment.byId(this.getView().getId(), "dlgAddFilter");
      const oCtx = oDialog.getBindingContext("rules");

      console.log("OCTX confirm add filter: ", oCtx)

      if (!oCtx) {
        this._toast("Parent context not found");
        return;
      }

      const sGroupPath = oCtx.getPath();

      const sFilterCondPath = sGroupPath + "/_FilterCondition";
      const aConditions = oModel.getProperty(sFilterCondPath) || [];

      const sCharText = this.byId("selCharacteristic")?.getSelectedKey();
      const sOperKey = this.byId("selOperator")?.getSelectedKey();

      var valText = null
      var sUoMKey = this.byId("selUoM")?.getSelectedKey();

      if (sCharText == "1") {
        // Get value from selection
        valText = this.byId("inpValue")?.getSelectedKey();
        sUoMKey = ""
        if (!sCharText || !sOperKey || !valText) {
          this._toast("FILTERS_REQUIRED_MSG");
          return;
        }
      } else if (["3", "4"].includes(sCharText)) {
        // Get value from input
        valText = this.byId("_IDGenInput")?.getValue();
        if (!sCharText || !sOperKey || !valText || !sUoMKey) {
          this._toast("FILTERS_REQUIRED_MSG_2");
          return;
        }
      } else if (["5", "6"].includes(sCharText)) {
        // Get value from date picker
        valText = this.byId("idFilterDP")?.getValue();
        if (!sCharText || !sOperKey || !valText) {
          this._toast("FILTERS_REQUIRED_MSG");
          return;
        }
      }

      const aEditFilter = oModel?.getProperty("/editfilter") || null;
      const aFilterEntry = {
          Characteristic: sCharText,
          Operator: sOperKey,
          IsActiveEntity: true,
          _FilterValues: [
            { Value: valText, ValueUom: sUoMKey, IsActiveEntity: true }
          ]
        }

      if (aEditFilter != null) {
        // edit
        const sPath = aEditFilter.getPath()
        console.log("sPath aEditFilter: ", sPath)
        oModel.setProperty(sPath, aFilterEntry)
        oModel.setProperty("/editfilter", null)
        this._resetFilterFields()
      } else {
        // add
        console.log("ACONDIITONS: ", aConditions)
        aConditions.push(aFilterEntry)
        oModel.setProperty(sFilterCondPath, aConditions)
        this._resetFilterFields()
      }

      this.byId("dlgAddFilter")?.close();

      // if (aFilter != null) {
      //   // Edit filter
      //   oTable.setBusy(true)
      //   try {
      //     await this.onPatchFilter(aFilter, oEntry)
      //     oModel?.setProperty("/editfilter", null)
      //   } catch (e) {
      //     this._toast(`${e}`)
      //   } finally {
      //     await this._applyFiltersForCurrentRule(oCreated)
      //     oTable.setBusy(false);
      //   }
      // } else {
      //   // Create filter
      //   oTable.setBusy(true)
      //   try {
      //     await this.onCreateFilter(oCreated, oEntry)
      //   } catch (e) {
      //     this._toast(`${e}`)
      //   } finally {
      //     await this._applyFiltersForCurrentRule(oCreated)
      //     oTable.setBusy(false);
      //   }
      // }
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

    onEditFilter: async function (oEvent) {

      const oTable = this._findAncestorTable(oEvent.getSource());
      const oModel = this.getView().getModel("rules")

      if (!oTable || !oTable.isA("sap.m.Table")) {
        sap.m.MessageToast.show("Table not found (sap.m.Table).");
        return;
      }

      const oSelectedItems = oTable.getSelectedItems();

      if (oSelectedItems.length !== 1) {
        this._toast("SELECT_ONE_ROW_TO_EDIT_MSG");
        return;
      }

      const oRow = oSelectedItems[0].getBindingContext("rules").getObject();
      const oCtx = oSelectedItems[0].getBindingContext("rules")

      const sItemKey = this._mcb("idGenItemTypeMCB", "selItemType")?.getSelectedKeys()?.[0] || "";
      const sRuleKey = this.byId("idGenRuleTypeMCB")?.getSelectedKey()?.[0] || "";

      await this._ensureDialog("_pAddDialog", "managerules.view.FilterAddDialog");


      if (sItemKey == "PR" && sRuleKey == "1") {
        oModel?.setProperty("/editfilter", oCtx)

        this.byId("selCharacteristic").setSelectedKey(oRow.Characteristic);
        this.byId("selOperator")?.setSelectedKey(oRow.Operator);

        if (oRow.Characteristic == "1") {
          this._renderField("combo")
          this.byId("inpValue")?.setSelectedKey(oRow._FilterValues[0].Value);
          oModel.setProperty("/selectChar", false)
        } else if (["3", "4"].includes(oRow.Characteristic))  {
          this._renderField("input")
          this.byId("_IDGenInput")?.setValue(oRow._FilterValues[0].Value);
          oModel.setProperty("/selectChar", true)
        } else if (["5", "6"].includes(oRow.Characteristic)) {
          this._renderField("datepicker")
          this.byId("idFilterDP")?.setValue(oRow._FilterValues[0].Value);
          oModel.setProperty("/selectChar", false)
        }

        this.byId("selUoM")?.setSelectedKey(oRow.ValueUom === this._i18n("UOM_NOT_APPLICABLE") ? "NA" : oRow._FilterValues[0].ValueUom);

        const oDialog = await this._pAddDialog;
        oDialog.setTitle(this._i18n("FILTER_EDIT_TITLE"));
        oDialog.getBeginButton()?.setText(this._i18n("BTN_UPDATE"));
        oDialog.open();
      } 
      // else {
      //   this.byId("selCharacteristic2")?.setSelectedKey(this._mapCharacteristicKey(oRow.Characteristics));
      //   this.onCharacteristicChange2({ getSource: () => this.byId("selCharacteristic2") });

      //   setTimeout(function () {
      //     this.byId("selOperator2")?.setSelectedKey(this._mapOperatorKey(oRow.Operator));
      //     this.byId("inpValue2")?.setSelectedKey(this._mapFilterValues(oRow.Value));
      //     this.byId("selUoM2")?.setSelectedKey(oRow.ValueUom === this._i18n("UOM_NOT_APPLICABLE") ? "NA" : oRow.ValueUom);
      //   }.bind(this), 0);

      //   await this._ensureDialog("_pAddDialog2", "managerules.view.FilterAdd2Dialog");
      //   const oDialog2 = await this._pAddDialog2;
      //   oDialog2.setTitle(this._i18n("FILTER_EDIT_TITLE"));
      //   oDialog2.getBeginButton()?.setText(this._i18n("BTN_UPDATE"));
      //   oDialog2.open();
      // }
    },

    onCancelAddFilter2: function () { this._closeDialogPromise("_pAddDialog2"); },

    onDeleteFilter: async function (oEvent) {
      const oTable = this._findAncestorTable(oEvent.getSource());
      console.log("OTABLE: ", oTable)

      if (!oTable || !oTable.isA("sap.m.Table")) {
        sap.m.MessageToast.show("Table not found (sap.m.Table).");
        return;
      }
      const oCtx = oTable.getSelectedContexts("rules")
      console.log("OCTX: ", oCtx)

      if (![oCtx].length) { this._toast("SELECT_FILTER_TO_DELETE_MSG"); return; }

      MessageBox.confirm(this._i18n("FILTER_DELETE_CONFIRM_MSG"), {
        title: this._i18n("CONFIRM_TITLE"),
        actions: [MessageBox.Action.YES, MessageBox.Action.NO],
        emphasizedAction: MessageBox.Action.YES,
        onClose: function (sAction) {
          if (sAction === MessageBox.Action.YES) { 
            this._performFilterDeletion(oCtx, oTable);
          }
        }.bind(this)
      });
    },

    onAddGroup: async function () {
      await this._ensureDialog("_pAddGrpDialog", "managerules.view.AddGroupDialog");

      this.onConfirmAddGroup()
      this.byId("_IDGenInput1")?.setValue("")
      return;
    },

    onEditGroupName: async function (oEvent) {
      const oModel = this.getView().getModel("rules")
      const oCtx = oEvent.getSource().getBindingContext("rules");

      await this._ensureDialog("_pAddGrpDialog", "managerules.view.AddGroupDialog");
      
      this.byId("_IDGenInput1").setValue(oCtx.getProperty("GroupName"))
      oModel.setProperty("/editGroupsFilter", oCtx)

      const oDialog = await this._pAddGrpDialog;
      oDialog.setTitle(this._i18n("FILTER_GRP_EDIT"));
      oDialog.getBeginButton()?.setText(this._i18n("BTN_UPDATE"));
      oDialog.open();
    },

    onDeleteGroup: function (oEvent) {
      const oCtx = oEvent.getSource().getBindingContext("rules");
      const sGroupName = oCtx.getProperty("GroupName");

      if (!oCtx) {
        this.toast("GROUP_CONTEXT_NOT_FOUND")
        return;
      }

      sap.m.MessageBox.confirm(
          `Delete "${sGroupName}"?`,
          {
            icon: sap.m.MessageBox.Icon.WARNING,
            title: "Confirm Deletion",
            actions: [sap.m.MessageBox.Action.OK, sap.m.MessageBox.Action.CANCEL],
            onClose: (sAction) => {
              if (sAction === sap.m.MessageBox.Action.OK) {
                this._performDeleteGroup(oCtx)
              }
            }
          }
        );

    },

    onCancelAddGroup: function () {
      const oModel = this.getView().getModel("rules")
      oModel.setProperty("/editGroupsFilter", null)
      this._closeDialogPromise("_pAddGrpDialog");
    },

    onConfirmAddGroup: async function () {
      const oModel = this.getView().getModel("rules");
      const aEditGroups = oModel.getProperty("/editGroupsFilter") || null;
      const aGroups = oModel.getProperty("/groupsFilter") || [];

      await this._ensureDialog("_pAddGrpDialog", "managerules.view.AddGroupDialog");

      const inpGrpName = this.byId("_IDGenInput1")?.getValue();

      if (aEditGroups != null) {
        const sPath = aEditGroups.getPath()
        oModel.setProperty(sPath + "/GroupName", inpGrpName)
        oModel.setProperty("/editGroupsFilter", null)
      } else {
        aGroups.push({
          GroupName: `Condition Group ${aGroups.length + 1}`,
          RuleId: null,
          IsActiveEntity: true,
          _FilterCondition: []
        });

        this.byId("_IDGenInput1")?.setValue("")
        oModel.setProperty("/groupsFilter", aGroups);
      }

      this._closeDialogPromise("_pAddGrpDialog");
    },

    /* ===================== ADJUSTMENT LOGIC DIALOGS ===================== */
    onAddAdjLogic: async function () {
      const sItemKey = this._mcb("idGenItemTypeMCB", "selItemType")?.getSelectedKeys()?.[0] || "";
      const sRuleKey = this.byId("idGenRuleTypeMCB", "selRuleType")?.getSelectedKey()?.[0] || "";

      if (sItemKey === "PR" && sRuleKey === "1") {
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

      if (!sLogic || !sValue) { 
        this._toast("FILL_ALL_FIELDS_MSG"); 
        return; 
      }

      const oTable = this.byId("tblAdjLogic2")
      const oModel = this.getView()?.getModel("rules");
      const aAdjLogic = oModel.getProperty("/draftadjlogic")
      const aEditLogic = oModel?.getProperty("/editadjlogic") || null;
      
      // if (!oCreated.RuleId) { this._toast("NO_ACTIVE_RULE_MSG"); }

      const oAdjLogic = { 
        Logic: sLogic, 
        Value: sValue, 
        ValueUom: sUoM,
        IsActiveEntity: true
      };

      if (aEditLogic != null) {
        // edit
        const sPath = aEditLogic.getPath();
        oModel.setProperty(sPath, oAdjLogic)
        oModel.setProperty("/editadjlogic", null)
      } else {
        aAdjLogic.push(oAdjLogic);
        oModel.setProperty("/draftadjlogic", aAdjLogic)
      }

      this.byId("dlgAddAdjLogic")?.close();

      // if (aLogic != null) {
      //   // Edit adj logic
      //   oTable.setBusy(true)
      //     try {
      //       await this.onPatchAdjLogic(aLogic, oAdjLogic)
      //       oModel?.setProperty("/editlogic", null)
      //     } catch (e) {
      //       this._toast(`${e}`)
      //     } finally {
      //       await this._applyAdjLogicForCurrentRule(oCreated)
      //       oTable.setBusy(false);
      //     }
      // } else {
      //   // Create adj logic
      //   oTable.setBusy(true)
      //     try {
      //       await this.onCreateAdjLogic(oCreated, oAdjLogic)
      //     } catch (e) {
      //       this._toast(`${e}`)
      //     } finally {
      //       await this._applyAdjLogicForCurrentRule(oCreated)
      //       oTable.setBusy(false);
      //     }
      // }
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
      oModel?.setProperty("/adjlogic", aLogic);
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

      const sItemKey = this._mcb("idGenItemTypeMCB", "selItemType")?.getSelectedKeys()?.[0] || "";
      const sRuleKey = this.byId("idGenRuleTypeMCB")?.getSelectedKey() || "";

      if (sItemKey === "PR" && sRuleKey === "1") {
        oModel?.setProperty("/editadjlogic", oCtx)

        await this._ensureDialog("_pAdjLogicDialog", "managerules.view.AddAdjLogicDialog");

        this.byId("selLogic")?.setSelectedKey(oRow.Logic);
        this.byId("selLogicValue")?.setSelectedKey(oRow.Value);
        this.byId("selLogicUoM")?.setSelectedKey(oRow.ValueUom === this._i18n("UOM_NOT_APPLICABLE") ? "NA" : oRow.ValueUom);

        const oDialog = await this._pAdjLogicDialog;
        oDialog.setTitle(this._i18n("ADJ_EDIT_TITLE"));
        oDialog.getBeginButton()?.setText(this._i18n("BTN_UPDATE"));
        oDialog.open();
      } else if (["PRO", "REC", "SUP", "ES"].includes(sItemKey) && sRuleKey === "IN") {
        this.byId("selLogic2")?.setSelectedKey(oRow.Logic);
        this.byId("InpVal")?.setValue(oRow.Value);
        this.byId("selLogicUoM2")?.setSelectedKey(oRow.ValueUom === this._i18n("UOM_NOT_APPLICABLE") ? "NA" : oRow.ValueUom);

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
      const oTable = this.byId("tblAdjLogic2");
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
      const oRuleTypeMCB = this.byId("idGenRuleTypeMCB");
      oItemTypeMCB?.removeAllSelectedItems();
      oRuleTypeMCB?.setSelectedKey("");
      if (typeof bEnableCombos === "boolean") {
        oItemTypeMCB?.setEnabled(bEnableCombos);
      }

      this.byId("_IDGenSelect")?.setSelectedKey("");
      this.byId("_IDGenMultiComboBox")?.removeAllSelectedItems();
    },

    _resetFilterFields: function () {
      this.byId("inpValue").setValue("")
      this.byId("_IDGenInput").setValue("")
      this.byId("idFilterDP").setValue("")
    },

    /* ===================== SELECTION DEPENDENCIES HELPERS ===================== */
    onPlantSelectionChange: function (oEvent) {
      const oMCB = oEvent.getSource();

      const oChangedItem = oEvent.getParameter("changedItem");
      const bSelected = oEvent.getParameter("selected");
      const sChangedKey = oChangedItem && oChangedItem.getKey();

      let aSelectedKeys = oMCB.getSelectedKeys();

      const aAllKeys = oMCB.getItems()
        .map(i => i.getKey())
        .filter(k => k && k !== "*");

      // --- "All" selected ---
      if (sChangedKey === "*" && bSelected) {
        aSelectedKeys = ["*", ...aAllKeys];
        oMCB.setSelectedKeys(aSelectedKeys);
        return;
      }

      // --- "All" deselected ---
      if (sChangedKey === "*" && !bSelected) {
        oMCB.setSelectedKeys([]);
        return;
      }

      const bAllSelected =
        aAllKeys.length > 0 &&
        aAllKeys.every(k => aSelectedKeys.includes(k));

      if (!bAllSelected && aSelectedKeys.includes("*")) {
        aSelectedKeys = aSelectedKeys.filter(k => k !== "*");
        oMCB.setSelectedKeys(aSelectedKeys);
      }

      if (bAllSelected && !aSelectedKeys.includes("*")) {
        oMCB.setSelectedKeys(["*", ...aSelectedKeys]);
      }
    },

    onCharacteristicsChange: function (oEvent) {
      const oModel = this.getView().getModel("rules");
      const sKey = oEvent.getSource().getSelectedKey();
      
      this.byId("_IDGenInput").setValue("")
      var inpVal = "";

      if (sKey == "1") {
        inpVal = "combo";
        oModel.setProperty("/selectChar", false)
      } else if (["3", "4"].includes(sKey)) {
        inpVal = "input"
        oModel.setProperty("/selectChar", true)
      } else if (["5", "6"].includes(sKey)) {
        inpVal = "datepicker"
        oModel.setProperty("/selectChar", false)
      }

      this._renderField(inpVal);
    },

    _renderField: function (sMode) {
      this.byId("inpValue").setVisible(false)
      this.byId("_IDGenInput").setVisible(false)
      this.byId("idFilterDP").setVisible(false)

      if (sMode === "combo") {
        this.byId("inpValue").setVisible(true)
      } else if (sMode == "input") {
        this.byId("_IDGenInput").setVisible(true)
      } else if (sMode == "datepicker") {
        this.byId("idFilterDP").setVisible(true)
      }
    },

    onItemTypeSelectionChange: function () {
      this._syncRuleTypeAvailability();
    },

    /* ===================== FIELD VALIDATIONS ===================== */
    _isGeneralInfoValid: function () {
      const bNameOk = this.byId("idGenNameInput")?.getValue()?.trim();
      const bDescOk = this.byId("idGenDescInput")?.getValue()?.trim();
      const bItemOk = this.byId("idGenItemTypeMCB")?.getSelectedItems()?.length;
      const bRuleOk = this.byId("idGenRuleTypeMCB")?.getSelectedKey()?.length;

      const sFrom = this.byId("idGenValidFromDP")?.getValue()?.trim() || "";
      const sTo   = this.byId("idGenValidToDP")?.getValue()?.trim() || "";

      console.log("GENERAL info valid: ", bNameOk, bDescOk, bItemOk, bRuleOk, sFrom, sTo)

      return bNameOk && bDescOk && bItemOk && bRuleOk && sFrom && sTo;
    },

    _isScopeValid: function () {
      const bInvScopeOk = !!this.byId("_IDGenSelect")?.getSelectedKey()?.length;
      const bPlantsOk = !!this._mcb("_IDGenMultiComboBox")?.getSelectedItems()?.length;
      return bInvScopeOk && bPlantsOk;
    },

    _isAdjLogValid: function () {
      const oModel = this.getView().getModel("rules")
      const aAdj = oModel?.getProperty("/draftadjlogic") || [];
      const baAdjLogic = !!aAdj.length
      return baAdjLogic
    },

    _performFilterDeletion: function (vCtx, oTable) {
      const oModel = this.getView().getModel("rules");

      const aCtxs = Array.isArray(vCtx) ? vCtx : [vCtx];

      if (!aCtxs.length) return;

      const sFirstPath = aCtxs[0].getPath();
      const sParentPath = sFirstPath.substring(0, sFirstPath.lastIndexOf("/"));

      const aFilters = oModel.getProperty(sParentPath);
      if (!Array.isArray(aFilters)) return;

      const aIndices = aCtxs
        .map(oCtx => Number(oCtx.getPath().split("/").pop()))
        .filter(i => i > -1)
        .sort((a, b) => b - a);

      aIndices.forEach(i => aFilters.splice(i, 1));
      oModel.setProperty(sParentPath, aFilters);

      oTable?.removeSelections();
      this._toast("FILTERS_DELETED_SUCCESS_MSG");
    },

    _performDeleteGroup: function (oCtx) {
      const oModel = this.getView().getModel("rules");
      const sPath = oCtx.getPath();
      const sParentPath = sPath.substring(0, sPath.lastIndexOf("/"));
      const iIndex = parseInt(sPath.split("/").pop(), 10);

      const aGroups = oModel.getProperty(sParentPath);

      if (Array.isArray(aGroups) && iIndex > -1) {
        aGroups.splice(iIndex, 1);
        oModel.setProperty(sParentPath, aGroups);
      }

      this._toast("GROUP_DELETED_SUCCESS_MSG");
    },

    _performAdjLogicDeletion: function (aSelectedItems) {
      const oModel = this.getView()?.getModel("rules");
      const aExisting = oModel?.getProperty("/draftadjlogic") || [];
      const aIndices = aSelectedItems
        .map(function (oItem) {
          const sPath = oItem.getBindingContext("rules")?.getPath();
          return sPath ? parseInt(sPath.split("/").pop() ?? "-1", 10) : -1;
        })
        .filter(function (iIdx) { return iIdx !== -1; })
        .sort(function (iA, iB) { return iB - iA; });

      aIndices.forEach(function (iIndex) { aExisting.splice(iIndex, 1); });
      oModel?.setProperty("/draftadjlogic", aExisting);
      this.byId("tblAdjLogic2")?.removeSelections();
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

    /* ===================== KEY TO VALUE FORMATTER ===================== */
    itemTypeFormatter: function (itemType) {
      const oModel = this.getView().getModel("load");
      const itemLookup = oModel.getProperty("/itemType")

      const oMatch = itemLookup.find(i => i.ItemType == itemType);
      return oMatch ? oMatch.ItemTypeName : itemType;
    },

    ruleTypeFormatter: function (ruleType) {
      const oModel = this.getView().getModel("load");
      const ruleLookup = oModel.getProperty("/ruleType")

      const oMatch = ruleLookup.find(r => r.IndexNo == ruleType);
      return oMatch ? oMatch.TypeOfRules : ruleType;
    },

    plantFormatter: function (aScopes) {
      const oModel = this.getView()?.getModel("load");
      const plantLoookup = oModel.getProperty("/plantList") || [];

      const aNames = (aScopes || []).map(s => {
        const sPlant = s.Plant;
        const oMatch = plantLoookup.find(p => p.Plant === sPlant);
        return oMatch ? oMatch.PlantName : sPlant;
      });

      return aNames.join(", ");
    },

    characteristicFormatter: function (char) {
      const oModel = this.getView().getModel("rules");
      const charLookup = oModel.getProperty("/characteristics")

      const oMatch = charLookup.find(c => c.IndexNo == char);
      return oMatch ? oMatch.Characteristic : char;
    },

    operatorFormatter: function (operator) {
      const oModel = this.getView().getModel("rules");
      const opLookup = oModel.getProperty("/operator")

      const oMatch = opLookup.find(o => o.Operator == operator);
      return oMatch ? oMatch.OperatorDesc : operator;
    },

    productFormatter: function (product) {
      const oModel = this.getView().getModel("rules");
      const prodLookup = oModel.getProperty("/product")

      const oMatch = prodLookup.find(p => p.Product == product);
      return oMatch ? oMatch.ProductName : product;
    },

    valueUomFormatter: function (valueUom) {
      const oModel = this.getView().getModel("rules");
      const valLookup = oModel.getProperty("/valueUomFilter")

      const oMatch = valLookup.find(v => v.UnitOfMeasure == valueUom);
      return oMatch ? oMatch.UnitOfMeasureLongName : valueUom;
    },

    logicFormatter: function (logic) {
      const oModel = this.getView().getModel("rules");
      const logicLookup = oModel.getProperty("/logic")

      const oMatch = logicLookup.find(v => v.IndexNo == logic);
      return oMatch ? oMatch.Logic : logic;
    },

    valAdjLogFormatter: function (values) {
      const oModel = this.getView().getModel("rules");
      const valLookup = oModel.getProperty("/values")

      const oMatch = valLookup.find(v => v.IndexNo == values);
      return oMatch ? oMatch.LogicValues : values;
    },

    valUomAdjLogicFormatter: function (valueUom) {
      const oModel = this.getView().getModel("rules");
      const valLookup = oModel.getProperty("/valueUomAdjLogic")

      const oMatch = valLookup.find(v => v.UnitOfMeasure == valueUom);
      return oMatch ? oMatch.UnitOfMeasureLongName : valueUom;
    },
  
    _applyFiltersForCurrentRule: async function (oCreated) {
      const oModel = this.getView().getModel("rules");

      if (oCreated != null) {      
        const aFilter = await this.onGetFilter(oCreated)
        oModel?.setProperty("/draftfilter", aFilter)
      }
    },
    _applyAdjLogicForCurrentRule: async function (oCreated) {
      const oModel = this.getView().getModel("rules");
      
      if (oCreated != null ) {      
        const aAdLogic = await this.onGetAdjLogic(oCreated)
        oModel?.setProperty("/draftadjlogic", aAdLogic)
      }
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
      if (!bHasPRO && oRuleTypeMCB.getSelectedKey().includes("AV")) {
        const aNewRuleKeys = oRuleTypeMCB.getSelectedKey().filter(k => k !== "AV");
        oRuleTypeMCB.setSelectedKey(aNewRuleKeys);
      }

      // Optional: show a ValueState message when AV is disabled and user had it selected
      if (!bHasPRO) {
        oRuleTypeMCB.setValueState("None");
        oRuleTypeMCB.setValueStateText("");
      }
    },
    _findAncestorTable: function (oControl) {
      // bounded walk up the parent chain (prevents infinite loop)
      for (let i = 0; i < 30 && oControl; i++) {
        if (oControl.isA("sap.m.Table") || oControl.isA("sap.ui.table.Table")) {
          return oControl;
        }
        oControl = oControl.getParent();
      }
      return null;
    },

    pushStackMessage: function (sText, sType = "Error", iAutoCloseMs = 0, mOptions = {}) {
      const oStack = this.byId("msgStack");
      if (!oStack) return;

      const {
        dedupe = true,   
        maxItems = 6,      
        icon = true        
      } = mOptions;

      if (dedupe) {
        const bExists = oStack.getItems().some(oItem => {
          return oItem?.getText?.() === sText && oItem?.getType?.() === sType;
        });
        if (bExists) return;
      }

      const oStrip = new sap.m.MessageStrip({
        text: sText,
        type: sType,              
        showIcon: icon,
        showCloseButton: true
      });

      const fnDispose = () => {
        if (!oStrip || oStrip.bIsDestroyed) return;

        try {
          if (oStack.indexOfItem(oStrip) !== -1) {
            oStack.removeItem(oStrip);
          }
        } catch (e) {

        }

        try {
          oStrip.destroy();
        } catch (e) {

        }
      };

      oStrip.attachClose(fnDispose);
      oStack.addItem(oStrip);

      if (maxItems && oStack.getItems().length > maxItems) {
        const aItems = oStack.getItems();
        while (aItems.length > maxItems) {
          const oOld = aItems[0];
          oStack.removeItem(oOld);
          oOld.destroy();
          aItems.shift();
        }
      }
      
      if (iAutoCloseMs && iAutoCloseMs > 0) {
        setTimeout(() => {
          fnDispose();
        }, iAutoCloseMs);
      }
    },

    clearStackMessages: function () {
      const oStack = this.byId("msgStack");
      if (!oStack) return;

      const aItems = oStack.removeAllItems();
      aItems.forEach(oItem => oItem.destroy());
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