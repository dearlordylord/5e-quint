import { Match } from "effect";
import type {
  ClassFeatureMechanics,
  PassiveMechanics,
  PassiveOperation,
  PassiveSuppressor,
} from "../surface/types.ts";
import type { TraceEdge, TraceNode, TraceNodeId } from "./tracer-model.ts";
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
): TraceNodeId[] {
  if (isResourceLinkedClassMechanics(m)) {
    return traceResourceLinkedClassMechanics(m, nodes, ids);
  }
  return Match.value(m).pipe(
    Match.discriminatorsExhaustive("family")({
      ongoing_feature_activation_movement_rider: (m) => {
        const movementId = ids("activation-movement");
        nodes.push({
          id: movementId,
          category: "effect",
          atomKind: m.family,
          label: `${m.family}\n${m.activatesWith.resourceUnitId}\n${m.movement.maximum}\nordinary Opportunity Attacks`,
        });
        return [movementId];
      },
      activation: (m) => {
        return [traceActivatedAbility(m, nodes, edges, ids)];
      },
      passive: (m) => {
        return [tracePassiveMechanics(m, nodes, edges, ids)];
      },
      alternate_action_cost: (m) => {
        return [traceAlternateActionCostMechanics(m, nodes, ids)];
      },
      feature_choice: (m) => {
        return [traceFeatureChoiceMechanics(m, nodes, ids)];
      },
      on_hit_trigger: (m) => {
        return [traceOnHitTriggerMechanics(m, nodes, edges, ids)];
      },
      save_damage_replacement: (m) => {
        return [traceSaveDamageReplacementMechanics(m, nodes, ids)];
      },
      reaction_roll_or_damage_reduction: (m) => {
        return [traceReactionRollOrDamageReductionMechanics(m, nodes, ids)];
      },
      weapon_mastery_choice: (m) => {
        const masteryId = ids("mastery");
        nodes.push({
          id: masteryId,
          category: "hole",
          atomKind: "class_weapon_mastery_choice",
          label:
            `class_weapon_mastery_choice\n${describeWeaponMasteryChoiceCount(m.choose)}\n` +
            `${describeWeaponMasteryEligibility(m.eligibleWeapons)}\n` +
            `change ${m.changeOn.count} on ${m.changeOn.kind}`,
        });
        return [masteryId];
      },
      class_feature_acquisition_choice: (m) => {
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
      },
      resource_container: (m) => {
        return [traceResourceContainerMechanics(m, nodes, edges, ids)];
      },
      resource_pool: (m) => {
        return [traceResourcePoolMechanics(m, nodes, edges, ids)];
      },
      metamagic_options: (m) => {
        return [traceMetamagicOptionsMechanics(m, nodes, edges, ids)];
      },
      druid_wild_companion_spell_cast: (m) => {
        return [
          traceDruidWildCompanionSpellCastMechanics(m, nodes, edges, ids),
        ];
      },
      class_spellcasting_projection: (m) => {
        const spellcastingId = ids("spellcasting");
        nodes.push({
          id: spellcastingId,
          category: "procedure",
          atomKind: "class_spellcasting_projection",
          label: `class_spellcasting_projection\n${m.spellcastingKind}\nsource ${m.source}`,
        });
        return [spellcastingId];
      },
      spellbook_ritual_access: (m) => {
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
      },
      rest_spell_slot_recovery: (m) => {
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
      },
      wizard_spellbook_learning: (m) => {
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
      },
      pact_slot_recovery: (m) => {
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
      },
      spell_slot_healing_modifier: (m) => {
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
      },
      magic_action_healing_pool: (m) => {
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
      },
      magic_action_area_save_damage_healing: (m) => {
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
      },
      enemy_zero_hit_point_temporary_hit_points: (m) => {
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
      },
      bonus_action_delegated_standard_actions: (m) => {
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
      },
      remarkable_athlete: (m) => {
        const remarkableId = ids("remarkable-athlete");
        nodes.push({
          id: remarkableId,
          category: "procedure",
          atomKind: "remarkable_athlete",
          label:
            `remarkable_athlete\n${m.initiative.roll} ${m.initiative.kind}\n` +
            `${m.abilityCheck.ability} ${m.abilityCheck.skill} ${m.abilityCheck.kind}\n` +
            `${m.criticalHitMovement.trigger.kind}\n${m.criticalHitMovement.distance.kind}\n${m.criticalHitMovement.opportunityAttacks}`,
        });
        return [remarkableId];
      },
      open_hand_technique: (m) => {
        const openHandId = ids("open-hand-technique");
        nodes.push({
          id: openHandId,
          category: "procedure",
          atomKind: "open_hand_technique",
          label:
            `open_hand_technique\n${m.trigger.resourceOptionUnitId}:${m.trigger.optionId}\n` +
            `${m.effectSaveDc.ability} save DC\n` +
            m.choices.map((choice) => choice.id).join(" | "),
        });
        return [openHandId];
      },
      stunning_strike: (m) => {
        const stunningId = ids("stunning-strike");
        nodes.push({
          id: stunningId,
          category: "procedure",
          atomKind: "stunning_strike",
          label:
            `stunning_strike\n${m.trigger.kind}\n` +
            `spend ${m.spends.amount} ${m.spends.resourceUnitId}\n` +
            `${m.savingThrow.ability} save via ${m.spends.resourceUnitId}\n` +
            `${m.onFail.condition} until ${m.onFail.expires}\n` +
            `${m.onSuccess.speed.kind} speed\n${m.onSuccess.attackRoll.mode} next attack`,
        });
        return [stunningId];
      },
      cunning_strike: (m) => {
        const cunningId = ids("cunning-strike");
        nodes.push({
          id: cunningId,
          category: "procedure",
          atomKind: "cunning_strike",
          label:
            `cunning_strike\n${m.trigger.kind}:${m.trigger.sourceUnitId}\n` +
            `${m.effectSaveDc.ability} save DC\n` +
            m.options.map((option) => option.id).join(" | "),
        });
        return [cunningId];
      },
      brutal_strike: (m) => {
        const brutalId = ids("brutal-strike");
        nodes.push({
          id: brutalId,
          category: "procedure",
          atomKind: "brutal_strike",
          label:
            `brutal_strike\n${m.trigger.kind}:${m.trigger.prerequisiteUnitId}\n` +
            `${m.damage.dice.dice}d${m.damage.dice.dieSize} ${m.damage.damageType}\n` +
            m.options.map((option) => option.id).join(" | "),
        });
        return [brutalId];
      },
      failed_saving_throw_reroll: (m) => {
        const indomitableId = ids("indomitable");
        nodes.push({
          id: indomitableId,
          category: "resource",
          atomKind: "failed_saving_throw_reroll",
          label:
            `failed_saving_throw_reroll\n${m.trigger.kind}\n` +
            `bonus ${m.reroll.bonus.className} ${m.reroll.bonus.kind}\n` +
            `must use new roll ${m.reroll.mustUseNewRoll}\n` +
            `reset ${m.resetCadence.kind}`,
        });
        return [indomitableId];
      },
      weapon_mastery_property_replacement: (m) => {
        const tacticalId = ids("tactical-master");
        nodes.push({
          id: tacticalId,
          category: "procedure",
          atomKind: "weapon_mastery_property_replacement",
          label:
            `weapon_mastery_property_replacement\n${m.trigger.kind}\n` +
            `${m.replacement.timing}\n` +
            m.replacement.chooseOne.join(" | "),
        });
        return [tacticalId];
      },
      abjure_foes: (m) => {
        const abjureId = ids("abjure-foes");
        nodes.push({
          id: abjureId,
          category: "procedure",
          atomKind: "abjure_foes",
          label:
            `abjure_foes\n${m.activationCost.kind}:${m.activationCost.action}\n` +
            `spend ${m.spends.amount} ${m.spends.resourceUnitId}\n` +
            `${m.targetSelection.count.ability} targets min ${m.targetSelection.count.minimum}\n` +
            `${m.save.ability} save\n${m.onFail.condition}`,
        });
        return [abjureId];
      },
      acrobatic_movement: (m) => {
        const acrobaticId = ids("acrobatic-movement");
        nodes.push({
          id: acrobaticId,
          category: "effect",
          atomKind: "acrobatic_movement",
          label:
            `acrobatic_movement\n${m.movement.timing}\n` +
            `${m.movement.verticalSurfaces.path}\n${m.movement.liquids.path}`,
        });
        return [acrobaticId];
      },
      cunning_strike_option_grant: (m) => {
        const optionId = ids("cunning-strike-option");
        nodes.push({
          id: optionId,
          category: "procedure",
          atomKind: "cunning_strike_option_grant",
          label:
            `cunning_strike_option_grant\n${m.sourceUnitId}\n` +
            `${m.option.id}\n` +
            `${m.option.cost.dice}d${m.option.cost.dieSize}`,
        });
        return [optionId];
      },
      sacred_weapon: (m) => {
        const sacredWeaponId = ids("sacred-weapon");
        nodes.push({
          id: sacredWeaponId,
          category: "procedure",
          atomKind: "sacred_weapon",
          label:
            `sacred_weapon\n${m.activationCost.kind}:${m.activationCost.action}\n` +
            `spend ${m.spends.amount} ${m.spends.resourceUnitId}\n` +
            `${m.target.kind}\n${m.attackRollBonus.ability} modifier min ${m.attackRollBonus.minimum}\n` +
            `${m.duration.amount} ${m.duration.unit}`,
        });
        return [sacredWeaponId];
      },
      hunters_prey: (m) => {
        const preyId = ids("hunters-prey");
        nodes.push({
          id: preyId,
          category: "procedure",
          atomKind: "hunters_prey",
          label:
            `hunters_prey\n${m.choice.kind}\nreplace ${m.choice.replaceOn}\n` +
            m.options.map((option) => option.id).join(" | "),
        });
        return [preyId];
      },
      steady_aim: (m) => {
        const steadyAimId = ids("steady-aim");
        nodes.push({
          id: steadyAimId,
          category: "procedure",
          atomKind: "steady_aim",
          label:
            `steady_aim\n${m.activationCost.kind}\n${m.precondition.kind}\n` +
            `${m.attackRoll.mode} ${m.attackRoll.appliesTo}\n` +
            `${m.speed.kind} ${m.speed.until}`,
        });
        return [steadyAimId];
      },
      potent_cantrip: (m) => {
        const cantripId = ids("potent-cantrip");
        nodes.push({
          id: cantripId,
          category: "procedure",
          atomKind: "potent_cantrip",
          label:
            `potent_cantrip\n${m.trigger.kind}:${m.trigger.cantripKind}\n` +
            `${m.outcomes.join(" | ")}\n${m.damage.kind}\n${m.additionalEffect}`,
        });
        return [cantripId];
      },
      initiative_focus_recovery: (m) => {
        return [traceInitiativeFocusRecoveryMechanics(m, nodes, edges, ids)];
      },
      sorcery_point_short_rest_recovery: (m) => {
        const recoveryId = ids("sorceryPointShortRestRecovery");
        nodes.push({
          id: recoveryId,
          category: "procedure",
          atomKind: "sorcery_point_short_rest_recovery",
          label:
            `sorcery_point_short_rest_recovery\n${m.recoveryTrigger}\n` +
            `${m.resource.resourceUnitId}\n${m.recoveryCap.kind}\n` +
            `reset ${m.resetCadence.kind}`,
        });
        return [recoveryId];
      },
      combat_turn_start_heroic_inspiration: () => {
        const heroicInspirationId = ids("heroicInspiration");
        nodes.push({
          id: heroicInspirationId,
          category: "procedure",
          atomKind: "combat_turn_start_heroic_inspiration",
          label:
            "combat_turn_start_heroic_inspiration\nstart_turn\ncombat\nrequires missing Heroic Inspiration",
        });
        return [heroicInspirationId];
      },
      use_count_resource_recovery: (m) => {
        const recoveryId = ids("use-count-resource-recovery");
        nodes.push({
          id: recoveryId,
          category: "procedure",
          atomKind: m.family,
          label: `${m.family}\n${m.resourceUnitId}\n${m.restRecovery.resetCadence.kind}: ${m.restRecovery.amount}\n${m.spellSlotExchange.spellSlotCount} spell slot → ${m.spellSlotExchange.restoredUses} use\n${m.spellSlotExchange.actionCost} action cost\nrequires expended use: ${m.spellSlotExchange.requiresExpendedUse}`,
        });
        return [recoveryId];
      },
      chosen_prepared_spell_access: (m) => {
        const accessId = ids("chosen-prepared-spell-access");
        nodes.push({
          id: accessId,
          category: "procedure",
          atomKind: m.family,
          label: `${m.family}\nchoose ${m.choiceCount}\n${m.eligibleSpellLists.join(" | ")}\n${m.eligibleSpellLevel}\n${m.preparation}\nreplace ${m.replacement.maximumCount} on ${m.replacement.trigger}`,
        });
        return [accessId];
      },
      marked_creature_defenses_disclosure: (m) => {
        const disclosureId = ids("marked-creature-defenses-disclosure");
        nodes.push({
          id: disclosureId,
          category: "procedure",
          atomKind: m.family,
          label: `${m.family}\n${m.spellId}`,
        });
        return [disclosureId];
      },
      attack_roll_defense_choice: (m) => {
        const defenseId = ids("attack-roll-defense-choice");
        nodes.push({
          id: defenseId,
          category: "procedure",
          atomKind: m.family,
          label: `${m.family}\n${m.choice.kind}\nreplace on ${m.choice.replaceOn}`,
        });
        for (const option of m.options) {
          const optionId = ids("attack-roll-defense-option");
          const detail = Match.value(option).pipe(
            Match.when(
              { trigger: { kind: "opportunity_attack" } },
              (value) => `${value.trigger.kind}\n${value.attackRoll.mode}`,
            ),
            Match.when(
              { trigger: { kind: "hit_by_attack_roll" } },
              (value) =>
                `${value.trigger.kind}\n${value.attackRoll.mode} ${value.attackRoll.appliesTo}\n${value.attackRoll.until}`,
            ),
            Match.exhaustive,
          );
          nodes.push({
            id: optionId,
            category: "procedure",
            atomKind: "attack_roll_defense_option",
            label: `${option.id}\n${detail}`,
          });
          edges.push({ from: defenseId, to: optionId, relation: option.id });
        }
        return [defenseId];
      },
      prepared_spell_rest_replacement: (m) => {
        const replacementId = ids("prepared-spell-rest-replacement");
        nodes.push({
          id: replacementId,
          category: "procedure",
          atomKind: m.family,
          label: `${m.family}\n${m.trigger}\nreplace ${m.replacementCount}\n${m.preparedSpellSource} → ${m.replacementSource}\nminimum spell level ${m.minimumSpellLevel}`,
        });
        return [replacementId];
      },
      prepared_spell_list_expansion: (m) => {
        const expansionId = ids("prepared-spell-list-expansion");
        nodes.push({
          id: expansionId,
          category: "procedure",
          atomKind: "prepared_spell_list_expansion",
          label:
            `prepared_spell_list_expansion\n${m.baseSpellList}\n` +
            m.additionalEligibleSpellLists.join(" | "),
        });
        return [expansionId];
      },
      spell_damage_roll_ability_modifier: (m) => {
        const modifierId = ids("spell-damage-roll-ability-modifier");
        nodes.push({
          id: modifierId,
          category: "procedure",
          atomKind: "spell_damage_roll_ability_modifier",
          label:
            `spell_damage_roll_ability_modifier\n${m.spellSourceClassName}:${m.school}\n` +
            `${m.ability} to ${m.damageRollCount} damage roll`,
        });
        return [modifierId];
      },
      composite: (m) => {
        return m.parts.map((part) =>
          Match.value(part).pipe(
            Match.when({ family: "activation" }, (value) =>
              traceActivatedAbility(value, nodes, edges, ids),
            ),
            Match.when({ family: "passive" }, (value) =>
              tracePassiveMechanics(value, nodes, edges, ids),
            ),
            Match.when({ family: "alternate_action_cost" }, (value) =>
              traceAlternateActionCostMechanics(value, nodes, ids),
            ),
            Match.when({ family: "on_hit_trigger" }, (value) =>
              traceOnHitTriggerMechanics(value, nodes, edges, ids),
            ),
            Match.when({ family: "save_damage_replacement" }, (value) =>
              traceSaveDamageReplacementMechanics(value, nodes, ids),
            ),
            Match.when(
              { family: "reaction_roll_or_damage_reduction" },
              (value) =>
                traceReactionRollOrDamageReductionMechanics(value, nodes, ids),
            ),
            Match.exhaustive,
          ),
        );
      },
    }),
  );
}

type ResourceLinkedClassMechanics = Extract<
  ClassFeatureMechanics,
  {
    readonly family:
      | "failed_ability_check_resource_boost"
      | "bonus_action_healing_movement_rider";
  }
>;

function isResourceLinkedClassMechanics(
  mechanics: ClassFeatureMechanics,
): mechanics is ResourceLinkedClassMechanics {
  return (
    mechanics.family === "failed_ability_check_resource_boost" ||
    mechanics.family === "bonus_action_healing_movement_rider"
  );
}

function traceResourceLinkedClassMechanics(
  mechanics: ResourceLinkedClassMechanics,
  nodes: TraceNode[],
  ids: IdGen,
): TraceNodeId[] {
  return Match.value(mechanics).pipe(
    Match.when({ family: "failed_ability_check_resource_boost" }, (m) => {
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
    }),
    Match.when({ family: "bonus_action_healing_movement_rider" }, (m) => {
      const movementId = ids("healing-movement");
      const opportunityAttackPolicy = Match.value(
        m.movement.opportunityAttacks,
      ).pipe(
        Match.when("does_not_provoke", () => "no Opportunity Attacks"),
        Match.exhaustive,
      );
      nodes.push({
        id: movementId,
        category: "effect",
        atomKind: "bonus_action_healing_movement_rider",
        label:
          `bonus_action_healing_movement_rider\n${m.activatesWith.resourceUnitId}\n` +
          `${m.movement.maximum}\n` +
          `${m.movement.optional ? "optional" : "required"} movement\n` +
          opportunityAttackPolicy,
      });
      return [movementId];
    }),
    Match.exhaustive,
  );
}

export function traceInitiativeFocusRecoveryMechanics(
  m: Extract<
    ClassFeatureMechanics,
    { readonly family: "initiative_focus_recovery" }
  >,
  nodes: TraceNode[],
  edges: TraceEdge[],
  ids: IdGen,
): TraceNodeId {
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
): TraceNodeId {
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
): TraceNodeId {
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
): TraceNodeId {
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
): TraceNodeId {
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
): TraceNodeId {
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
): TraceNodeId {
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
): TraceNodeId {
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
    /* v8 ignore start -- @preserve -- the decoded prepared-spell change trigger union is exhausted above */
    default: {
      const _exhaustive: never = changeOn;
      return _exhaustive;
    }
    /* v8 ignore stop -- @preserve */
  }
}

function describeWeaponMasteryChoiceCount(
  choiceCount: Extract<
    ClassFeatureMechanics,
    { readonly family: "weapon_mastery_choice" }
  >["choose"],
): string {
  return typeof choiceCount === "number"
    ? `choose ${choiceCount}`
    : describeClassLevelChoiceCount(choiceCount);
}

export function traceAlternateActionCostMechanics(
  m: Extract<
    ClassFeatureMechanics,
    { readonly family: "alternate_action_cost" }
  >,
  nodes: TraceNode[],
  ids: IdGen,
): TraceNodeId {
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
): TraceNodeId {
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
): TraceNodeId {
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
): TraceNodeId {
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
  procId: TraceNodeId,
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
): TraceNodeId {
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
