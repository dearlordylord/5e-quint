// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-haste-positive
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-concentration-full-duration
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_LETHARGY_LIFECYCLE
//
// The Haste-positive Spell Procedure Profile: the SRD Haste cast path that
// grants its active positive effects and carries the spell-end lethargy rider
// until Concentration or duration cleanup promotes it.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { StandardActionKind } from "@dnd/shared/game-facts";
import { movementFeet } from "@dnd/shared/types";
import type {
  ActionRestriction,
  AreaDirectEffectAtom,
  EffectAtom,
  SpellRecord,
} from "@dnd/surface/surface/types";
import { isEffectAtom } from "@dnd/surface/surface/types";
import { Either, Schema } from "effect";

import { battleCreatureWithSpellActiveEffects } from "../../active-effect/lifecycle.ts";
import type { BattleActiveEffect } from "../../active-effect/types.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  maybeOpenInterruptWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type HastePositiveSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { breakBattleConcentration } from "../damage-apply.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { battleStateWithCurrentActorSpellGrantedActionResourcesForTargets } from "../spell-granted-action-resource.ts";
import { spellCastInterruptFrame } from "../spell-cast-interrupt-frame.ts";
import { sameStringSet } from "../spells-profile-shared.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import {
  spellRequiresConcentration,
  spendSpellCastResources,
} from "../spells-resolve-resources.ts";
import { spellTargetHole, spellTargetIsLegal } from "../spells-holes-fills.ts";
import {
  BattleRuntimeObjectSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
  SpellProcedureStoredGlyphReleaseOptions,
} from "./profile.ts";
import { spellProcedureInvocationSchema } from "./profile.ts";

const HASTE_POSITIVE_ACTIONS = [
  "attack",
  "dash",
  "disengage",
  "hide",
  "utilize",
] as const satisfies ReadonlyArray<StandardActionKind>;

type HastePositiveTargetSelection =
  | { readonly tag: "ok"; readonly targetIds: readonly [CombatantId] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

function admitHastePositive(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly HastePositiveSpellInvocation[] {
  const projection = hastePositiveSpellProjection(ctx.actor.combatantId, spell);
  if (projection === null) {
    return [];
  }

  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly HastePositiveSpellInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "hastePositive",
              spell,
              actionCost: "magicAction",
              ...projection,
            },
          ],
  );
}

function hastePositiveSpellProjection(
  actorId: CombatantId,
  spell: SpellRecord,
): Pick<
  HastePositiveSpellInvocation,
  "targeting" | "activeEffects" | "rangeFeet"
> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 3 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 30 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }

  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    spell.mechanics.duration.upTo,
  );
  const phase = spell.mechanics.phases[0];
  if (phase?.kind !== "direct") {
    return null;
  }

  const effects = ordinaryEffectAtoms(phase.effects);
  if (effects === null) {
    return null;
  }

  const attachment = phase.attachment;
  const selection =
    attachment?.kind === "hole" && attachment.value.kind === "target"
      ? attachment.value.selection
      : null;
  const speedRatio = onlyEffect(effects, "set_speed_ratio");
  const armorClassBonus = onlyEffect(effects, "modify_ac");
  const savingThrowAdvantage = onlyEffect(effects, "modify_roll_advantage");
  const extraAction = onlyEffect(effects, "grant_extra_action");
  const spellEndLethargy = onlyEffect(effects, "effect_end_target_state");
  if (
    Either.isLeft(durationTicks) ||
    effects.length !== 5 ||
    selection?.mode !== "one" ||
    !("disposition" in selection) ||
    selection.disposition !== "willing" ||
    !("targetKinds" in selection) ||
    selection.targetKinds === undefined ||
    !sameStringSet(selection.targetKinds, ["creature"]) ||
    !("visibility" in selection) ||
    selection.visibility !== "caster_can_see" ||
    speedRatio?.numerator !== 2 ||
    speedRatio.denominator !== 1 ||
    armorClassBonus?.delta.kind !== "fixed_number" ||
    armorClassBonus.delta.sign !== "+" ||
    armorClassBonus.delta.amount !== 2 ||
    savingThrowAdvantage?.mode !== "advantage" ||
    (savingThrowAdvantage.affects ?? "self_roll") !== "self_roll" ||
    !sameStringSet(savingThrowAdvantage.on, ["saving_throw"]) ||
    !Array.isArray(savingThrowAdvantage.saveAbilityFilter) ||
    !sameStringSet(savingThrowAdvantage.saveAbilityFilter, ["dex"]) ||
    savingThrowAdvantage.abilityCheckTrigger !== undefined ||
    savingThrowAdvantage.spellSourceFilter !== undefined ||
    savingThrowAdvantage.attackerTypeFilter !== undefined ||
    savingThrowAdvantage.skillFilter !== undefined ||
    savingThrowAdvantage.conditionFilter !== undefined ||
    savingThrowAdvantage.abilityFilter !== undefined ||
    savingThrowAdvantage.saveSourceFilter !== undefined ||
    savingThrowAdvantage.contextRangeFeet !== undefined ||
    savingThrowAdvantage.attackRollTarget !== undefined ||
    savingThrowAdvantage.count !== undefined ||
    savingThrowAdvantage.expiresOn !== undefined ||
    !isHastePositiveActionRestriction(extraAction?.restriction) ||
    spellEndLethargy?.condition !== "incapacitated" ||
    spellEndLethargy.duration !== "end_of_target_next_turn" ||
    spellEndLethargy.speed.kind !== "set_speed" ||
    spellEndLethargy.speed.feet !== 0
  ) {
    return null;
  }

  const expiresAt = {
    kind: "concentration" as const,
    combatantId: actorId,
    durationTicks: durationTicks.right,
  };
  return {
    targeting: {
      kind: "targetList",
      minTargets: 1,
      maxTargets: 1,
      requiredTargetDisposition: "willing",
    },
    activeEffects: {
      speedRatio: {
        kind: "speedRatio",
        sourceSpellId: spell.id,
        sourceCombatantId: actorId,
        numerator: speedRatio.numerator,
        denominator: speedRatio.denominator,
        expiresAt,
      },
      armorClassBonus: {
        kind: "spellArmorClassBonus",
        sourceSpellId: spell.id,
        sourceCombatantId: actorId,
        bonus: armorClassBonus.delta.amount,
        negatedSpellIds: [],
        expiresAt,
      },
      dexteritySavingThrowAdvantage: {
        kind: "savingThrowRollMode",
        sourceSpellId: spell.id,
        sourceCombatantId: actorId,
        ability: "dex",
        mode: savingThrowAdvantage.mode,
        expiresAt,
      },
      grantedActionResource: {
        kind: "spellGrantedActionResource",
        sourceSpellId: spell.id,
        sourceCombatantId: actorId,
        restriction: extraAction.restriction,
        expiresAt,
      },
      spellEndTargetState: {
        kind: "spellEndTargetState",
        sourceSpellId: spell.id,
        sourceCombatantId: actorId,
        condition: spellEndLethargy.condition,
        expiresAt,
      },
    },
    rangeFeet: movementFeet(30),
  };
}

function onlyEffect<K extends EffectAtom["kind"]>(
  effects: readonly EffectAtom[],
  kind: K,
): Extract<EffectAtom, { readonly kind: K }> | null {
  const matches = effects.filter(
    (effect): effect is Extract<EffectAtom, { readonly kind: K }> =>
      effect.kind === kind,
  );
  return matches.length === 1 ? matches[0] : null;
}

function ordinaryEffectAtoms(
  effects: readonly AreaDirectEffectAtom[] | readonly EffectAtom[] | undefined,
): readonly EffectAtom[] | null {
  if (effects === undefined) {
    return null;
  }
  const ordinaryEffects: EffectAtom[] = [];
  for (const effect of effects) {
    if (!isEffectAtom(effect)) {
      return null;
    }
    ordinaryEffects.push(effect);
  }
  return ordinaryEffects;
}

function isHastePositiveActionRestriction(
  restriction: ActionRestriction | undefined,
): restriction is Extract<ActionRestriction, { readonly kind: "allow_only" }> {
  if (restriction?.kind !== "allow_only") {
    return false;
  }
  const attack = restriction.actions.find(
    (action) => action.action === "attack",
  );
  return (
    sameStringSet(
      restriction.actions.map((action) => action.action),
      HASTE_POSITIVE_ACTIONS,
    ) &&
    attack?.attackLimit.kind === "attack_count" &&
    attack.attackLimit.count === 1
  );
}

function discoverHastePositiveCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: HastePositiveSpellInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return targetHole.choices.length === 0
    ? []
    : [
        {
          subject: {
            tag: "actionSpell" as const,
            actorId,
            invocation: hastePositiveInvocationRef(invocation),
            mode: { tag: "cast" as const },
          },
          label: invocation.spell.name,
          summary: hastePositiveCastSummary(invocation),
          initialHoles: [targetHole],
        },
      ];
}

function hastePositiveInvocationRef(
  invocation: HastePositiveSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "hastePositive",
  };
}

function hastePositiveCastSummary(
  invocation: HastePositiveSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveHastePositive(
  input: SpellProcedureProfileResolveInput<
    HastePositiveSpellInvocation,
    ActionSpellBattleResolutionInput
  > &
    SpellProcedureStoredGlyphReleaseOptions,
): BattleResolutionResult {
  if (hasNonHastePositiveFill(input.fillSet)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Haste positive effects use one target fill.",
    );
  }

  const targetSelection = hastePositiveTargetSelection(input);
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

  if (input.opensSpellCastReactionWindow !== false) {
    const spellCastReactionWindow = maybeOpenInterruptWindow(
      input.input.state,
      spellCastInterruptFrame({
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
      input.input.handledInterruptTrigger,
    );
    if (spellCastReactionWindow !== null) {
      return spellCastReactionWindow;
    }
  }

  const concentrationBase =
    input.startsOrdinaryConcentration === false
      ? input.input.state
      : spellRequiresConcentration(input.invocation)
        ? breakBattleConcentration(input.input.state, input.actorId)
        : input.input.state;
  const effected = applyHastePositiveEffects(
    concentrationBase,
    input.actorId,
    targetSelection.targetIds,
    input.invocation,
  );
  if (input.spendsCastResources === false) {
    const resolvedState =
      battleStateWithCurrentActorSpellGrantedActionResourcesForTargets(
        effected,
        targetSelection.targetIds,
      );
    return {
      tag: "resolved",
      state: resolvedState,
      snapshot: snapshotBattle(resolvedState),
    };
  }
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    ...(input.startsOrdinaryConcentration === false
      ? { startConcentration: false }
      : {}),
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }

  const resolvedState =
    battleStateWithCurrentActorSpellGrantedActionResourcesForTargets(
      resourced.state,
      targetSelection.targetIds,
    );
  return {
    tag: "resolved",
    state: resolvedState,
    snapshot: snapshotBattle(resolvedState),
  };
}

function hasNonHastePositiveFill(
  fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>,
): boolean {
  return (
    fillSet.objectTarget !== undefined ||
    fillSet.attackRoll !== undefined ||
    fillSet.targetAllocation !== undefined ||
    fillSet.attackSequencePartFills.length > 0 ||
    fillSet.damageRoll !== undefined ||
    fillSet.attackBurstDamageRoll !== undefined ||
    fillSet.healingRoll !== undefined ||
    fillSet.skillChoice !== undefined ||
    fillSet.targetAbilityChoices !== undefined ||
    fillSet.abilityChoice !== undefined ||
    fillSet.conditionChoice !== undefined ||
    fillSet.commandOptionChoice !== undefined ||
    fillSet.areaChoice !== undefined ||
    fillSet.teleportDestination !== undefined ||
    fillSet.dancingLightsPlacement !== undefined ||
    fillSet.damageTypeChoice !== undefined ||
    fillSet.savingThrowOutcomes !== undefined ||
    fillSet.movement !== undefined ||
    fillSet.thaumaturgyActiveOneMinuteEffectCount !== undefined ||
    fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    fillSet.damageDispositions.length > 0 ||
    fillSet.concentrationSavingThrows.length > 0 ||
    fillSet.spellDamageReductionRolls.length > 0
  );
}

function hastePositiveTargetSelection(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: HastePositiveSpellInvocation;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): HastePositiveTargetSelection {
  if (input.fillSet.targetList !== undefined) {
    return {
      tag: "invalid",
      message: "Haste positive effects require one target choice.",
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
          "Haste target must be a known willing combatant the caster can see within the spell's supported range.",
      };
}

function applyHastePositiveEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: HastePositiveSpellInvocation,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const nextEffects = hastePositiveEffects(invocation).map((effect) => ({
      ...effect,
      sourceCombatantId: actorId,
    }));
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            isHastePositiveActiveEffect(effect) &&
            effect.sourceSpellId === invocation.spell.id &&
            effect.sourceCombatantId === actorId
          ),
      ),
      ...nextEffects,
    ];
    return {
      ...nextState,
      combatants: new Map(nextState.combatants).set(
        targetId,
        battleCreatureWithSpellActiveEffects(target, activeEffects),
      ),
    };
  }, state);
}

function hastePositiveEffects(
  invocation: HastePositiveSpellInvocation,
): readonly Extract<
  BattleActiveEffect,
  {
    readonly kind:
      | "speedRatio"
      | "spellArmorClassBonus"
      | "savingThrowRollMode"
      | "spellGrantedActionResource"
      | "spellEndTargetState";
  }
>[] {
  return [
    invocation.activeEffects.speedRatio,
    invocation.activeEffects.armorClassBonus,
    invocation.activeEffects.dexteritySavingThrowAdvantage,
    invocation.activeEffects.grantedActionResource,
    invocation.activeEffects.spellEndTargetState,
  ];
}

function isHastePositiveActiveEffect(
  effect: BattleActiveEffect,
): effect is ReturnType<typeof hastePositiveEffects>[number] {
  return (
    effect.kind === "speedRatio" ||
    effect.kind === "spellArmorClassBonus" ||
    effect.kind === "savingThrowRollMode" ||
    effect.kind === "spellGrantedActionResource" ||
    effect.kind === "spellEndTargetState"
  );
}

const HastePositiveInvocationSchema =
  spellProcedureInvocationSchema<HastePositiveSpellInvocation>(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("hastePositive"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("magicAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Literal(1),
        requiredTargetDisposition: Schema.Literal("willing"),
      }),
      activeEffects: Schema.Struct({
        speedRatio: BattleRuntimeObjectSchema,
        armorClassBonus: BattleRuntimeObjectSchema,
        dexteritySavingThrowAdvantage: BattleRuntimeObjectSchema,
        grantedActionResource: BattleRuntimeObjectSchema,
        spellEndTargetState: BattleRuntimeObjectSchema,
      }),
      rangeFeet: MovementFeet,
    }),
  );

export const hastePositiveProfile = {
  procedure: "hastePositive",
  invocationSchema: HastePositiveInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "always" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitHastePositive,
  discoverCastAct: discoverHastePositiveCastAct,
  castSummary: hastePositiveCastSummary,
  invocationRef: hastePositiveInvocationRef,
  resolve: resolveHastePositive,
} satisfies SpellProcedureProfile<
  "hastePositive",
  HastePositiveSpellInvocation
>;
