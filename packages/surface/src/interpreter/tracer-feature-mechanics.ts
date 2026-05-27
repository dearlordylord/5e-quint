import { Match } from "effect";
import type {
  ClassFeatureMechanics,
  PassiveMechanics,
  PassiveOperation,
  PassiveSuppressor,
} from "../surface/types.ts";
import type { TraceEdge, TraceNode } from "./tracer-model.ts";
import {
  describeClassLevelChoiceCount,
  describeConditionList,
  describeDiceAmount,
  describeOngoingPredicate,
} from "./tracer-rule-labels.ts";
import type { IdGen } from "./tracer-rule-labels.ts";

import { traceEquipmentPredicate } from "./tracer-equipment-predicates.ts";

import { traceEffectAtom } from "./tracer-effect-atom.ts";

import {
  describeWeaponMasteryEligibility,
  describeUseCountCap,
  traceActivatedAbility,
  traceActivationResource,
  traceActivationCost,
  traceCountedResourceCapScaling,
  traceResetCadence,
} from "./tracer-activated-abilities.ts";

import { traceOnHitTriggerMechanics } from "./tracer-mastery.ts";

export function traceClassFeatureMechanics(
  m: ClassFeatureMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string[] {
  switch (m.family) {
    case "activation":
      return [traceActivatedAbility(m, nodes, edges, ids)];
    case "passive":
      return [tracePassiveMechanics(m, nodes, edges, ids)];
    case "alternate_action_cost":
      return [traceAlternateActionCostMechanics(m, nodes, ids)];
    case "feature_choice":
      return [traceFeatureChoiceMechanics(m, nodes, ids)];
    case "on_hit_trigger":
      return [traceOnHitTriggerMechanics(m, nodes, edges, ids)];
    case "save_damage_replacement":
      return [traceSaveDamageReplacementMechanics(m, nodes, ids)];
    case "reaction_roll_or_damage_reduction":
      return [traceReactionRollOrDamageReductionMechanics(m, nodes, ids)];
    case "weapon_mastery_choice": {
      const masteryId = ids("mastery");
      nodes.push({
        id: masteryId,
        category: "hole",
        atomKind: "class_weapon_mastery_choice",
        label:
          `class_weapon_mastery_choice\nchoose ${m.choose}\n` +
          `${describeWeaponMasteryEligibility(m.eligibleWeapons)}\n` +
          `change ${m.changeOn.count} on ${m.changeOn.kind}`,
      });
      return [masteryId];
    }
    case "class_feature_acquisition_choice": {
      const choiceId = ids("classFeatureAcquisitionChoice");
      nodes.push({
        id: choiceId,
        category: "procedure",
        atomKind: "class_feature_acquisition_choice",
        label: `class_feature_acquisition_choice\n${m.choiceKey}\n${m.options.map((option) => option.displayName).join(" | ")}`,
      });
      for (const option of m.options) {
        const optionId = tracePassiveMechanics(
          option.mechanics,
          nodes,
          edges,
          ids,
        );
        edges.push({ from: choiceId, to: optionId, relation: option.id });
      }
      return [choiceId];
    }
    case "resource_container":
      return [traceResourceContainerMechanics(m, nodes, edges, ids)];
    case "resource_pool":
      return [traceResourcePoolMechanics(m, nodes, edges, ids)];
    case "metamagic_options":
      return [traceMetamagicOptionsMechanics(m, nodes, edges, ids)];
    case "druid_wild_companion_spell_cast":
      return [traceDruidWildCompanionSpellCastMechanics(m, nodes, edges, ids)];
    case "class_spellcasting_projection": {
      const spellcastingId = ids("spellcasting");
      nodes.push({
        id: spellcastingId,
        category: "procedure",
        atomKind: "class_spellcasting_projection",
        label: `class_spellcasting_projection\n${m.spellcastingKind}\nsource ${m.source}`,
      });
      return [spellcastingId];
    }
    case "spellbook_ritual_access": {
      const ritualId = ids("ritual");
      nodes.push({
        id: ritualId,
        category: "procedure",
        atomKind: "spellbook_ritual_access",
        label:
          `spellbook_ritual_access\nsource ${m.source}\n` +
          `preparation ${m.preparationRequirement}`,
      });
      return [ritualId];
    }
    case "rest_spell_slot_recovery": {
      const recoveryId = ids("arcane");
      nodes.push({
        id: recoveryId,
        category: "resource",
        atomKind: "rest_spell_slot_recovery",
        label:
          `rest_spell_slot_recovery\ntrigger ${m.recoveryTrigger}\n` +
          `${m.recoveredSlotLevelCap.kind}\n` +
          `slot level < ${m.recoveredSlotLevelCap.maximumSlotLevelExclusive}\n` +
          `reset ${m.resetCadence.kind}`,
      });
      return [recoveryId];
    }
    case "wizard_spellbook_learning": {
      const learningId = ids("wizard-spellbook-learning");
      nodes.push({
        id: learningId,
        category: "hole",
        atomKind: "wizard_spellbook_learning",
        label:
          `wizard_spellbook_learning\nsource ${m.spellbookSource.className}\n` +
          m.grants
            .map(
              (grant) =>
                `${grant.timing.kind}\nchoose ${grant.choiceCount} ${grant.eligibility.school}`,
            )
            .join("\n"),
      });
      return [learningId];
    }
    case "pact_slot_recovery": {
      const recoveryId = ids("pact");
      nodes.push({
        id: recoveryId,
        category: "resource",
        atomKind: "pact_slot_recovery",
        label:
          `pact_slot_recovery\nactivation ${m.activationCost.kind}\n` +
          `resource ${m.resource.kind}\n` +
          `${m.recoveryCap.kind}\n` +
          `reset ${m.resetCadence.kind}`,
      });
      return [recoveryId];
    }
    case "failed_ability_check_resource_boost": {
      const tacticalId = ids("tactical");
      nodes.push({
        id: tacticalId,
        category: "resource",
        atomKind: "failed_ability_check_resource_boost",
        label:
          `failed_ability_check_resource_boost\n` +
          `spend ${m.spends.resourceUnitId}\n` +
          `+${m.bonus.expr.dice}d${m.bonus.expr.dieSize}`,
      });
      return [tacticalId];
    }
    case "spell_slot_healing_modifier": {
      const healingId = ids("spell-slot-healing");
      nodes.push({
        id: healingId,
        category: "effect",
        atomKind: "spell_slot_healing_modifier",
        label:
          `spell_slot_healing_modifier\n${m.trigger.kind}\n` +
          `${m.trigger.timing}\n${m.appliesTo}\n` +
          `${m.bonus.kind} +${m.bonus.flat}`,
      });
      return [healingId];
    }
    case "magic_action_healing_pool": {
      const poolId = ids("healing-pool");
      nodes.push({
        id: poolId,
        category: "resource",
        atomKind: "magic_action_healing_pool",
        label:
          `magic_action_healing_pool\n${m.activationCost.kind}:${m.activationCost.action}\n` +
          `spend ${m.spends.amount} ${m.spends.resourceUnitId}\n` +
          `${m.range.feet} feet\n` +
          `pool ${m.pool.multiplier}x class level\n` +
          `${m.perTargetCap}`,
      });
      return [poolId];
    }
    case "magic_action_area_save_damage_healing": {
      const areaId = ids("area-damage-healing");
      nodes.push({
        id: areaId,
        category: "procedure",
        atomKind: "magic_action_area_save_damage_healing",
        label:
          `magic_action_area_save_damage_healing\n${m.activationCost.kind}:${m.activationCost.action}\n` +
          `spend ${m.spends.amount} ${m.spends.resourceUnitId}\n` +
          `${m.area.origin.rangeFeet} foot point range\n` +
          `${m.area.shape.radiusFeet} foot ${m.area.shape.kind}\n` +
          `${m.save.ability} save ${m.save.dc.kind}\n` +
          `${describeDiceAmount(m.damage.amount)} ${m.damage.damageType} ${m.damage.onSuccess}\n` +
          `heals ${describeDiceAmount(m.healing.amount)}`,
      });
      return [areaId];
    }
    case "enemy_zero_hit_point_temporary_hit_points": {
      const tempHpId = ids("enemy-zero-temp-hp");
      nodes.push({
        id: tempHpId,
        category: "effect",
        atomKind: "enemy_zero_hit_point_temporary_hit_points",
        label:
          `enemy_zero_hit_point_temporary_hit_points\n${m.trigger.kind}\n` +
          `self ${m.trigger.bySelf}\n` +
          `other within ${m.trigger.byOtherWithinFeet} feet\n` +
          `${m.amount.ability} modifier + class level, min ${m.amount.minimum}`,
      });
      return [tempHpId];
    }
    case "bonus_action_delegated_standard_actions": {
      const actionId = ids("delegated-bonus-actions");
      nodes.push({
        id: actionId,
        category: "procedure",
        atomKind: "bonus_action_delegated_standard_actions",
        label:
          `bonus_action_delegated_standard_actions\n${m.activationCost.kind}\n` +
          `${m.sleightOfHand.abilityCheck.ability} ${m.sleightOfHand.abilityCheck.skill}\n` +
          `${m.objectUse.actions.map((action) => action.action).join(" | ")}`,
      });
      return [actionId];
    }
    case "initiative_focus_recovery":
      return [traceInitiativeFocusRecoveryMechanics(m, nodes, edges, ids)];
    case "composite":
      return m.parts.map((part) => {
        switch (part.family) {
          case "activation":
            return traceActivatedAbility(part, nodes, edges, ids);
          case "passive":
            return tracePassiveMechanics(part, nodes, edges, ids);
          case "alternate_action_cost":
            return traceAlternateActionCostMechanics(part, nodes, ids);
          case "on_hit_trigger":
            return traceOnHitTriggerMechanics(part, nodes, edges, ids);
          case "save_damage_replacement":
            return traceSaveDamageReplacementMechanics(part, nodes, ids);
          case "reaction_roll_or_damage_reduction":
            return traceReactionRollOrDamageReductionMechanics(
              part,
              nodes,
              ids,
            );
          default: {
            const _exhaustive: never = part;
            throw new Error(
              `unhandled class-feature component family: ${String((_exhaustive as { family: string }).family)}`,
            );
          }
        }
      });
    default: {
      const _exhaustive: never = m;
      throw new Error(
        `unhandled class-feature family: ${String((_exhaustive as { family: string }).family)}`,
      );
    }
  }
}

export function traceInitiativeFocusRecoveryMechanics(
  m: Extract<
    ClassFeatureMechanics,
    { readonly family: "initiative_focus_recovery" }
  >,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const triggerId = ids("initiative");
  nodes.push({
    id: triggerId,
    category: "window",
    atomKind: "initiative_focus_recovery_window",
    label: `initiative_focus_recovery\n${m.trigger.kind}\noptional ${m.optional}`,
  });

  const recoveryId = ids("focus");
  nodes.push({
    id: recoveryId,
    category: "resource",
    atomKind: m.recovery.kind,
    label: `${m.recovery.kind}\n${m.recovery.resourceUnitId}`,
  });
  edges.push({ from: triggerId, to: recoveryId, relation: "recovers" });

  const healingId = ids("heal");
  nodes.push({
    id: healingId,
    category: "effect",
    atomKind: m.healing.kind,
    label:
      `${m.healing.kind}\n${m.healing.target}\n` +
      `${m.healing.amount.kind}\n${m.healing.amount.martialArtsUnitId}`,
  });
  edges.push({ from: recoveryId, to: healingId, relation: "also_grants" });

  const resetId = ids("reset");
  nodes.push({
    id: resetId,
    category: "resource",
    atomKind: "reset_cadence",
    label: `reset_cadence\n${m.resetCadence.kind}`,
  });
  edges.push({ from: triggerId, to: resetId, relation: "recovers_on" });

  return triggerId;
}

export function traceDruidWildCompanionSpellCastMechanics(
  m: Extract<
    ClassFeatureMechanics,
    { readonly family: "druid_wild_companion_spell_cast" }
  >,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const castId = ids("wild-companion");
  nodes.push({
    id: castId,
    category: "procedure",
    atomKind: "druid_wild_companion_spell_cast",
    label: `druid_wild_companion_spell_cast\nspell ${m.spellId}`,
  });

  traceActivationCost(m.activationCost, castId, nodes, edges, ids);

  for (const spendOption of m.spendOptions) {
    const spendId = ids("spend-option");
    nodes.push({
      id: spendId,
      category: "resource",
      atomKind: spendOption.kind,
      label: describeDruidWildCompanionSpendOption(spendOption),
    });
    edges.push({ from: castId, to: spendId, relation: "may_spend" });
  }

  const componentOverrideId = ids("component-override");
  nodes.push({
    id: componentOverrideId,
    category: "effect",
    atomKind: "material_component_override",
    label: `material_component_override\n${m.componentOverride.material}`,
  });
  edges.push({
    from: castId,
    to: componentOverrideId,
    relation: "casts_without",
  });

  const modeOverrideId = ids("mode-override");
  nodes.push({
    id: modeOverrideId,
    category: "effect",
    atomKind: m.spellModeOverride.kind,
    label: `${m.spellModeOverride.kind}\n${m.spellModeOverride.optionId}`,
  });
  edges.push({ from: castId, to: modeOverrideId, relation: "fixes_mode" });

  const dismissalId = ids("dismissal");
  nodes.push({
    id: dismissalId,
    category: "window",
    atomKind: "familiar_dismissal",
    label: `familiar_dismissal\n${m.familiarDismissal.kind}`,
  });
  edges.push({ from: castId, to: dismissalId, relation: "ends_on" });

  return castId;
}

type DruidWildCompanionSpendOption = Extract<
  ClassFeatureMechanics,
  { readonly family: "druid_wild_companion_spell_cast" }
>["spendOptions"][number];

function describeDruidWildCompanionSpendOption(
  spendOption: DruidWildCompanionSpendOption,
): string {
  return Match.value(spendOption).pipe(
    Match.when({ kind: "spell_slot" }, () => "Spell Slot"),
    Match.when(
      { kind: "one_class_feature_use" },
      (option) => `one use of ${option.resourceUnitId}`,
    ),
    Match.exhaustive,
  );
}

export function traceFeatureChoiceMechanics(
  m: Extract<ClassFeatureMechanics, { readonly family: "feature_choice" }>,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const choiceId = ids("feature-choice");
  nodes.push({
    id: choiceId,
    category: "procedure",
    atomKind: "feature_choice",
    label:
      `feature_choice\n${m.choiceKey}\n${describeClassLevelChoiceCount(m.choiceCount)}\n` +
      `${m.optionSource.className} ${m.optionSource.optionKind}\n${describeFeatureChoiceChange(m.changeOn)}`,
  });
  return choiceId;
}

export function traceResourceContainerMechanics(
  m: Extract<ClassFeatureMechanics, { readonly family: "resource_container" }>,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const containerId = ids("resource-container");
  const options = m.optionSet.initialOptions
    .map((option) => option.displayName)
    .join(" | ");
  const saveDc =
    m.effectSaveDc === undefined
      ? ""
      : `\nsave DC ${describeClassFeatureEffectSaveDc(m.effectSaveDc)}`;
  nodes.push({
    id: containerId,
    category: "procedure",
    atomKind: "class_feature_resource_container",
    label:
      `class_feature_resource_container\n${m.optionSet.choiceKey}\n` +
      `timing ${m.optionSet.timing}\n${options}${saveDc}`,
  });

  const resourceId = traceActivationResource(m.resource, nodes, edges, ids);
  edges.push({ from: containerId, to: resourceId, relation: "contains" });
  traceResetCadence(m.resetCadence, resourceId, nodes, edges, ids);
  return containerId;
}

export function traceResourcePoolMechanics(
  m: Extract<ClassFeatureMechanics, { readonly family: "resource_pool" }>,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const containerId = ids("resource-pool");
  nodes.push({
    id: containerId,
    category: "procedure",
    atomKind: "class_feature_resource_pool",
    label: `class_feature_resource_pool\n${m.resource.poolId}`,
  });

  const resourceId = tracePointPoolResource(m.resource, nodes, edges, ids);
  edges.push({ from: containerId, to: resourceId, relation: "contains" });
  traceResetCadence(m.resetCadence, resourceId, nodes, edges, ids);

  for (const operation of m.operations) {
    const operationId = traceResourcePoolOperation(
      operation,
      nodes,
      edges,
      ids,
    );
    edges.push({ from: containerId, to: operationId, relation: "offers" });
    edges.push({
      from: operationId,
      to: resourceId,
      relation: resourcePoolOperationResourceRelation(operation),
    });
  }

  return containerId;
}

export function traceMetamagicOptionsMechanics(
  m: Extract<ClassFeatureMechanics, { readonly family: "metamagic_options" }>,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const metamagicId = ids("metamagic");
  const resourceId = ids("metamagic-resource-ref");
  const options = m.options
    .map(
      (option) =>
        `${option.displayName} (${option.sorceryPointCost} SP, ${option.stackingMode})`,
    )
    .join(" | ");
  nodes.push({
    id: metamagicId,
    category: "procedure",
    atomKind: "metamagic_options",
    label:
      `metamagic_options\n${m.choiceKey}\n${describeClassLevelChoiceCount(
        m.choiceCount,
      )}\n` +
      `${m.changeOn.count} replacement on ${m.changeOn.kind}\n${options}`,
  });
  nodes.push({
    id: resourceId,
    category: "resource",
    atomKind: "class_feature_point_pool_ref",
    label: `class_feature_point_pool_ref\n${m.spends.resourceUnitId}`,
  });
  edges.push({ from: metamagicId, to: resourceId, relation: "spends" });
  return metamagicId;
}

type ResourcePoolOperation = Extract<
  ClassFeatureMechanics,
  { readonly family: "resource_pool" }
>["operations"][number];

function resourcePoolOperationResourceRelation(
  operation: ResourcePoolOperation,
): "grants" | "spends" {
  return Match.value(operation).pipe(
    Match.when({ kind: "spell_slot_to_point_pool" }, () => "grants" as const),
    Match.when({ kind: "point_pool_to_spell_slot" }, () => "spends" as const),
    Match.exhaustive,
  );
}

function tracePointPoolResource(
  resource: Extract<
    ClassFeatureMechanics,
    { readonly family: "resource_pool" }
  >["resource"],
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const resourceId = ids("point-pool");
  nodes.push({
    id: resourceId,
    category: "resource",
    atomKind: "point_pool",
    label: `point_pool\n${resource.poolId}\n${describeUseCountCap(resource.cap)}`,
  });
  traceCountedResourceCapScaling(resource.cap, resourceId, nodes, edges, ids);
  return resourceId;
}

function traceResourcePoolOperation(
  operation: ResourcePoolOperation,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  return Match.value(operation).pipe(
    Match.when({ kind: "spell_slot_to_point_pool" }, (slotToPool) => {
      const operationId = ids("slot-to-pool");
      nodes.push({
        id: operationId,
        category: "procedure",
        atomKind: "spell_slot_to_point_pool",
        label: `spell_slot_to_point_pool\npoints ${slotToPool.pointGain.kind}`,
      });
      traceActivationCost(
        slotToPool.activationCost,
        operationId,
        nodes,
        edges,
        ids,
      );
      return operationId;
    }),
    Match.when({ kind: "point_pool_to_spell_slot" }, (poolToSlot) => {
      const operationId = ids("pool-to-slot");
      const options = poolToSlot.options
        .map(
          (option) =>
            `slot L${option.spellSlotLevel}: ${option.pointCost} points at class L${option.minimumClassLevel}`,
        )
        .join(" | ");
      nodes.push({
        id: operationId,
        category: "procedure",
        atomKind: "point_pool_to_spell_slot",
        label:
          `point_pool_to_spell_slot\n${options}\n` +
          `created slot expires ${poolToSlot.createdSlotExpiry.kind}`,
      });
      traceActivationCost(
        poolToSlot.activationCost,
        operationId,
        nodes,
        edges,
        ids,
      );
      return operationId;
    }),
    Match.exhaustive,
  );
}

type ClassFeatureEffectSaveDc = NonNullable<
  Extract<
    ClassFeatureMechanics,
    { readonly family: "resource_container" }
  >["effectSaveDc"]
>;

function describeClassFeatureEffectSaveDc(
  saveDc: ClassFeatureEffectSaveDc,
): string {
  return Match.value(saveDc).pipe(
    Match.when(
      { kind: "class_spellcasting_spell_save_dc" },
      () => "class spellcasting spell save DC",
    ),
    Match.when(
      { kind: "class_feature_ability_save_dc" },
      (dc) => `${dc.base} + ${dc.ability.toUpperCase()} mod + PB`,
    ),
    Match.exhaustive,
  );
}

export function describeFeatureChoiceChange(
  changeOn: Extract<
    ClassFeatureMechanics,
    { readonly family: "feature_choice" }
  >["changeOn"],
): string {
  switch (changeOn.kind) {
    case "never":
      return "no replacement";
    case "class_level":
      return `change ${changeOn.count} on class_level`;
    default: {
      const _exhaustive: never = changeOn;
      return _exhaustive;
    }
  }
}

export function traceAlternateActionCostMechanics(
  m: Extract<
    ClassFeatureMechanics,
    { readonly family: "alternate_action_cost" }
  >,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const alternateCostId = ids("alternate-cost");
  nodes.push({
    id: alternateCostId,
    category: "procedure",
    atomKind: "alternate_action_cost",
    label: `alternate_action_cost\n${m.from.actions.join(", ")}\nas ${m.to.kind}`,
  });
  return alternateCostId;
}

export function traceSaveDamageReplacementMechanics(
  m: Extract<
    ClassFeatureMechanics,
    { readonly family: "save_damage_replacement" }
  >,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const replacementId = ids("save-damage-replacement");
  nodes.push({
    id: replacementId,
    category: "resolution",
    atomKind: "save_damage_replacement",
    label:
      `save_damage_replacement\n${m.trigger.ability} save\n` +
      `success ${m.replacement.onSuccess}\nfail ${m.replacement.onFail}`,
  });
  return replacementId;
}

export function traceReactionRollOrDamageReductionMechanics(
  m: Extract<
    ClassFeatureMechanics,
    { readonly family: "reaction_roll_or_damage_reduction" }
  >,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const modifierId = ids("reaction-roll-or-damage-reduction");
  nodes.push({
    id: modifierId,
    category: "resolution",
    atomKind: "reaction_roll_or_damage_reduction",
    label: `reaction_roll_or_damage_reduction\n${m.modifiers.length} modifier(s)`,
  });
  return modifierId;
}

// Passive family — "grants" edge from a passive_grant procedure node to
// each carried EffectAtom. Works across class_feature / species_trait /
// feat / magic_item.
export function tracePassiveMechanics(
  m: PassiveMechanics,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): string {
  const procId = ids("pass");
  nodes.push({
    id: procId,
    category: "procedure",
    atomKind: "grant",
    label: `grant (passive)\n${m.grants.length} effect(s)`,
  });
  if (m.condition !== undefined && m.condition.kind !== "always") {
    for (const predId of traceEquipmentPredicate(m.condition, nodes, ids)) {
      edges.push({ from: procId, to: predId, relation: "requires" });
    }
  }
  for (const suppressor of m.suppressedBy ?? []) {
    const suppressId = tracePassiveSuppressor(suppressor, nodes, ids);
    edges.push({ from: suppressId, to: procId, relation: "suppresses" });
  }
  for (const atom of m.grants) {
    const effId = traceEffectAtom(atom, nodes, ids, edges);
    if (effId !== null) {
      edges.push({ from: procId, to: effId, relation: "grants" });
    }
  }
  for (const operation of m.operations ?? []) {
    tracePassiveOperation(operation, procId, nodes, edges, ids);
  }
  return procId;
}

export function tracePassiveOperation(
  operation: PassiveOperation,
  procId: string,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): void {
  const winId = ids("win");
  nodes.push({
    id: winId,
    category: "window",
    atomKind: "duration_window",
    label: describePassiveOperationWindow(operation),
  });
  edges.push({ from: procId, to: winId, relation: "opens_window" });

  const effId = traceEffectAtom(operation.effect, nodes, ids, edges);
  if (effId !== null) {
    edges.push({ from: winId, to: effId, relation: "grants" });
  }
}

export function tracePassiveSuppressor(
  suppressor: PassiveSuppressor,
  nodes: TraceNode[],
  ids: IdGen,
): string {
  const id = ids("supp");
  nodes.push({
    id,
    category: "procedure",
    atomKind: "suppress",
    label: `suppress\nwhile ${describeConditionList(suppressor.conditions)} active`,
  });
  return id;
}

export function describePassiveOperationWindow(
  operation: PassiveOperation,
): string {
  const predicate =
    operation.predicate === undefined
      ? ""
      : `\nif ${describeOngoingPredicate(operation.predicate)}`;
  const unitLabel =
    operation.trigger.amount === 1
      ? operation.trigger.unit
      : `${operation.trigger.unit}s`;
  return (
    `duration_window\nevery ${operation.trigger.amount} ${unitLabel}` +
    predicate
  );
}
