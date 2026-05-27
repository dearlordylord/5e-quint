// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-condition-removal-protection
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION
//
// The conditionRemovalProtection Spell Procedure Profile: a prepared action
// spell that removes Poisoned from one touched creature, then grants Poisoned
// Saving Throw Advantage and Poison damage Resistance.

import { movementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  maybeOpenReactionWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type ConditionRemovalProtectionSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
import { battleCreatureAfterConditionRemoval } from "../spell-condition-effects-helpers.ts";
import { sameStringSet } from "../spells-profile-shared.ts";
import { scalarBuffActiveEffectExpiration } from "../spells-profiles-support.ts";
import {
  spellTargetHole,
  spellTargetIsLegal,
} from "../spells-holes-fills.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import {
  spellRequiresConcentration,
  spendSpellCastResources,
} from "../spells-resolve-resources.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

type ConditionRemovalProtectionTargetSelection =
  | { readonly tag: "ok"; readonly targetIds: readonly [CombatantId] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

function admitConditionRemovalProtection(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly ConditionRemovalProtectionSpellInvocation[] {
  const projection = conditionRemovalProtectionSpellProjection(
    ctx.actorId,
    spell,
  );
  if (projection === null) {
    return [];
  }
  return ctx.spellcasting.spellSlots.flatMap(
    (slot): readonly ConditionRemovalProtectionSpellInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "conditionRemovalProtection",
              spell,
              actionCost: "magicAction",
              ...projection,
            },
          ],
  );
}

function conditionRemovalProtectionSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<
  ConditionRemovalProtectionSpellInvocation,
  "protection" | "rangeFeet" | "targeting"
> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "hour" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const composite =
    phase?.kind === "direct" && phase.effects?.[0]?.kind === "composite"
      ? phase.effects[0]
      : null;
  const effects = composite?.effects ?? [];
  const conditionRemoval = effects.find(
    (effect) => effect.kind === "remove_condition",
  );
  const conditionSaveRollMode = effects.find(
    (effect) => effect.kind === "modify_roll_advantage",
  );
  const damageResistance = effects.find(
    (effect) => effect.kind === "grant_resistance",
  );
  const expiresAt = scalarBuffActiveEffectExpiration(
    actorId,
    spell.mechanics.duration,
  );
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.attachment.value.selection.mode !== "one" ||
    composite === null ||
    effects.length !== 3 ||
    conditionRemoval?.kind !== "remove_condition" ||
    conditionRemoval.condition !== "poisoned" ||
    conditionSaveRollMode?.kind !== "modify_roll_advantage" ||
    (conditionSaveRollMode.affects ?? "self_roll") !== "self_roll" ||
    conditionSaveRollMode.mode !== "advantage" ||
    !sameStringSet(conditionSaveRollMode.on, ["saving_throw"]) ||
    conditionSaveRollMode.conditionFilter === undefined ||
    !sameStringSet(conditionSaveRollMode.conditionFilter, ["poisoned"]) ||
    conditionSaveRollMode.skillFilter !== undefined ||
    conditionSaveRollMode.abilityFilter !== undefined ||
    conditionSaveRollMode.saveAbilityFilter !== undefined ||
    conditionSaveRollMode.saveSourceFilter !== undefined ||
    conditionSaveRollMode.contextRangeFeet !== undefined ||
    conditionSaveRollMode.spellSourceFilter !== undefined ||
    conditionSaveRollMode.attackerTypeFilter !== undefined ||
    conditionSaveRollMode.count !== undefined ||
    conditionSaveRollMode.expiresOn !== undefined ||
    damageResistance?.kind !== "grant_resistance" ||
    damageResistance.damageType !== "poison" ||
    damageResistance.sourceFilter !== undefined ||
    expiresAt === null
  ) {
    return null;
  }
  return {
    targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
    protection: {
      conditionSaveRollMode: {
        kind: "conditionSavingThrowRollMode",
        sourceSpellId: spell.id,
        sourceCombatantId: actorId,
        condition: "poisoned",
        mode: "advantage",
        expiresAt,
      },
      damageResistance: {
        kind: "damageResistance",
        sourceSpellId: spell.id,
        sourceCombatantId: actorId,
        damageType: "poison",
        expiresAt,
      },
    },
    rangeFeet: movementFeet(5),
  };
}

function discoverConditionRemovalProtectionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: ConditionRemovalProtectionSpellInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  const castActs =
    targetHole.choices.length === 0
      ? []
      : [
          {
            subject: {
              tag: "actionSpell" as const,
              actorId,
              invocation: conditionRemovalProtectionInvocationRef(invocation),
              mode: { tag: "cast" as const },
            },
            label: invocation.spell.name,
            summary: conditionRemovalProtectionCastSummary(invocation),
            initialHoles: [targetHole],
          },
        ];
  return castActs;
}

function conditionRemovalProtectionInvocationRef(
  invocation: ConditionRemovalProtectionSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "conditionRemovalProtection",
  };
}

function conditionRemovalProtectionCastSummary(
  invocation: ConditionRemovalProtectionSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveConditionRemovalProtection(
  input: SpellProcedureProfileResolveInput<
    ConditionRemovalProtectionSpellInvocation,
    ActionSpellBattleResolutionInput
  >,
): BattleResolutionResult {
  if (
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.attackSequencePartFills.length > 0 ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.conditionChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.areaChoice !== undefined ||
    input.fillSet.teleportDestination !== undefined ||
    input.fillSet.dancingLightsPlacement !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.spellDamageReductionRolls.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Condition-removal protection spells use one target fill.",
    );
  }

  const targetSelection = conditionRemovalProtectionSpellTargetSelection(input);
  if (targetSelection.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetSelection.hole,
    ]);
  }
  if (targetSelection.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      targetSelection.message,
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: targetSelection.targetIds,
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const concentrationBase = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.input.state, input.actorId)
    : input.input.state;
  const effected = applyConditionRemovalProtectionEffect(
    concentrationBase,
    input.actorId,
    targetSelection.targetIds,
    input.invocation,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

function conditionRemovalProtectionSpellTargetSelection(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: ConditionRemovalProtectionSpellInvocation;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): ConditionRemovalProtectionTargetSelection {
  if (input.fillSet.targetList !== undefined) {
    return {
      tag: "invalid",
      message: "Condition-removal protection spells require one target choice.",
    };
  }
  if (input.fillSet.targetId === undefined) {
    return {
      tag: "needsHoles",
      hole: spellTargetHole(input.input.state, input.actorId, input.invocation),
    };
  }
  return spellTargetIsLegal(
    input.input.state,
    input.actorId,
    input.fillSet.targetId,
    input.invocation,
    input.fillSet.targetSpatialFacts,
  )
    ? { tag: "ok", targetIds: [input.fillSet.targetId] }
    : {
        tag: "invalid",
        message:
          "Condition-removal protection spell target must be a combatant within the selected spell's supported range.",
      };
}

function applyConditionRemovalProtectionEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: ConditionRemovalProtectionSpellInvocation,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const condition = invocation.protection.conditionSaveRollMode.condition;
    const cleansedTarget = battleCreatureAfterConditionRemoval(
      target,
      condition,
    );
    const nextEffects = [
      {
        ...invocation.protection.conditionSaveRollMode,
        sourceCombatantId: actorId,
      },
      {
        ...invocation.protection.damageResistance,
        sourceCombatantId: actorId,
      },
    ];
    const activeEffects = [
      ...cleansedTarget.activeEffects.filter(
        (effect) =>
          !(
            (effect.kind === "conditionSavingThrowRollMode" ||
              effect.kind === "damageResistance") &&
            effect.sourceSpellId === invocation.spell.id &&
            effect.sourceCombatantId === actorId
          ),
      ),
      ...nextEffects,
    ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(targetId, {
        ...cleansedTarget,
        activeEffects,
      }),
    };
  }, state);
}

export const conditionRemovalProtectionProfile: SpellProcedureProfile<
  "conditionRemovalProtection",
  ConditionRemovalProtectionSpellInvocation
> = {
  procedure: "conditionRemovalProtection",
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: true,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitConditionRemovalProtection,
  discoverCastAct: discoverConditionRemovalProtectionCastAct,
  castSummary: conditionRemovalProtectionCastSummary,
  invocationRef: conditionRemovalProtectionInvocationRef,
  resolve: resolveConditionRemovalProtection,
};
