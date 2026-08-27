import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import { actionSpellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-haste-positive
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-glyph-stored-concentration-full-duration
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_POSITIVE_EFFECTS
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HASTE_LETHARGY_LIFECYCLE
//
// The Haste-positive Spell Procedure Profile: the SRD Haste cast path that
// grants its active positive effects and carries the spell-end lethargy rider
// until Concentration or duration cleanup promotes it.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  ElapsedTimeTicksSchema,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import type { StandardActionKind } from "@dnd/shared/game-facts";
import { movementFeet } from "@dnd/shared/types";
import type {
  ActionRestriction,
  AreaDirectEffectAtom,
  EffectAtom,
} from "@dnd/surface/surface/types";
import { isEffectAtom } from "@dnd/surface/surface/types";
import { Result, Schema } from "effect";

import type { BattleActiveEffect } from "../../active-effect/types.ts";
import {
  type ActionSpellBattleResolutionInput,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type HastePositiveSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";

import { replaceAllocatedTargetSpellActiveEffects } from "../active-effect-replacement.ts";
import { spellSelectionResolution } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { battleStateWithCurrentActorSpellGrantedActionResourcesForTargets } from "../spell-granted-action-resource.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import { spellTargetHole } from "../spells-holes-fills.ts";
import {
  spellSingleTargetSelection,
  type SpellSingleTargetSelection,
} from "../spells-resolve-target-selection.ts";
import {
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";

const HASTE_POSITIVE_ACTIONS = [
  "attack",
  "dash",
  "disengage",
  "hide",
  "utilize",
] as const satisfies ReadonlyArray<StandardActionKind>;

const HastePositiveExpirationSchema = Schema.Struct({
  kind: Schema.Literal("concentration"),
  combatantId: CombatantId,
  durationTicks: ElapsedTimeTicksSchema,
});

const HastePositiveActionRestrictionSchema = Schema.Struct({
  kind: Schema.Literal("allow_only"),
  actions: Schema.Tuple([
    Schema.Struct({
      action: Schema.Literal("attack"),
      attackLimit: Schema.Struct({
        kind: Schema.Literal("attack_count"),
        count: Schema.Literal(1),
      }),
    }),
    Schema.Struct({ action: Schema.Literal("dash") }),
    Schema.Struct({ action: Schema.Literal("disengage") }),
    Schema.Struct({ action: Schema.Literal("hide") }),
    Schema.Struct({ action: Schema.Literal("utilize") }),
  ]),
});

function admitHastePositive(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly HastePositiveSpellInvocation[] {
  const projection = hastePositiveSpellProjection(ctx.actor.combatantId, spell);
  if (projection === null) {
    return [];
  }

  return ctx.spellCastOptions.flatMap(
    (slot): readonly HastePositiveSpellInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
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
  spell: BattleSpellAdmissionSource,
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
    Result.isFailure(durationTicks) ||
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
    durationTicks: durationTicks.success,
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
        sourceCombatantId: actorId,
        numerator: speedRatio.numerator,
        denominator: speedRatio.denominator,
        expiresAt,
      },
      armorClassBonus: {
        kind: "spellArmorClassBonus",
        sourceCombatantId: actorId,
        bonus: armorClassBonus.delta.amount,
        negatesRepeatedDamageAllocation: false,
        expiresAt,
      },
      dexteritySavingThrowAdvantage: {
        kind: "savingThrowRollMode",
        sourceCombatantId: actorId,
        ability: "dex",
        mode: savingThrowAdvantage.mode,
        expiresAt,
      },
      grantedActionResource: {
        kind: "spellGrantedActionResource",
        sourceCombatantId: actorId,
        restriction: {
          kind: "allow_only",
          actions: [
            {
              action: "attack",
              attackLimit: { kind: "attack_count", count: 1 },
            },
            { action: "dash" },
            { action: "disengage" },
            { action: "hide" },
            { action: "utilize" },
          ],
        },
        expiresAt,
      },
      spellEndTargetState: {
        kind: "spellEndTargetState",
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
  invocation: BattleExecutableSpellInvocation<HastePositiveSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function resolveHastePositive(
  input: SpellProcedureProfileResolveInput<HastePositiveSpellInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (hasNonHastePositiveFill(input.fillSet)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Haste positive effects use one target fill.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const targetSelectionResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    hastePositiveTargetSelection(input),
  );
  if (targetSelectionResolution.tag === "resolution")
    return targetSelectionResolution.result;
  const targetSelection = targetSelectionResolution.selection;

  return resolveSpellActiveEffectCast({
    resolution: input,
    targetIds: targetSelection.targetIds,
    castingResource: { kind: "magicAction" },
    applyEffect: (state) =>
      applyHastePositiveEffects(
        state,
        input.actorId,
        targetSelection.targetIds,
        input.invocation,
      ),
    finalizeState: (state) =>
      battleStateWithCurrentActorSpellGrantedActionResourcesForTargets(
        state,
        targetSelection.targetIds,
      ),
  });
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
  readonly invocation: BattleExecutableSpellInvocation<HastePositiveSpellInvocation>;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): SpellSingleTargetSelection {
  return spellSingleTargetSelection({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    targetListMessage: "Haste positive effects require one target choice.",
    invalidTargetMessage:
      "Haste target must be a known willing combatant the caster can see within the spell's supported range.",
  });
}

function applyHastePositiveEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: BattleExecutableSpellInvocation<HastePositiveSpellInvocation>,
): BattleState {
  return targetIds.reduce(
    (nextState, targetId) =>
      replaceAllocatedTargetSpellActiveEffects(
        nextState,
        targetId,
        (effect) =>
          isHastePositiveActiveEffect(effect) &&
          effect.sourceProcedureRef === invocation.sourceProcedureRef &&
          effect.sourceCombatantId === actorId,
        (effectRef) =>
          hastePositiveEffects(invocation).map((effect) =>
            effect.kind === "spellGrantedActionResource"
              ? {
                  ...effect,
                  sourceProcedureRef: invocation.sourceProcedureRef,
                  sourceCombatantId: actorId,
                  effectRef,
                }
              : {
                  ...effect,
                  sourceProcedureRef: invocation.sourceProcedureRef,
                  sourceCombatantId: actorId,
                },
          ),
      ),
    state,
  );
}

type HastePositiveActiveEffect = Extract<
  BattleActiveEffect,
  {
    readonly kind:
      | "speedRatio"
      | "spellArmorClassBonus"
      | "savingThrowRollMode"
      | "spellGrantedActionResource"
      | "spellEndTargetState";
  }
>;

type HastePositiveEffectTemplate =
  HastePositiveSpellInvocation["activeEffects"][keyof HastePositiveSpellInvocation["activeEffects"]];

function hastePositiveEffects(
  invocation: BattleExecutableSpellInvocation<HastePositiveSpellInvocation>,
): readonly HastePositiveEffectTemplate[] {
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
): effect is HastePositiveActiveEffect {
  return (
    effect.kind === "speedRatio" ||
    effect.kind === "spellArmorClassBonus" ||
    effect.kind === "savingThrowRollMode" ||
    effect.kind === "spellGrantedActionResource" ||
    effect.kind === "spellEndTargetState"
  );
}

const HastePositiveInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("hastePositive"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Literal(1),
      requiredTargetDisposition: Schema.Literal("willing"),
    }),
    activeEffects: Schema.Struct({
      speedRatio: Schema.Struct({
        kind: Schema.Literal("speedRatio"),
        sourceCombatantId: CombatantId,
        numerator: Schema.Number,
        denominator: Schema.Number,
        expiresAt: HastePositiveExpirationSchema,
      }),
      armorClassBonus: Schema.Struct({
        kind: Schema.Literal("spellArmorClassBonus"),
        sourceCombatantId: CombatantId,
        bonus: Schema.Number,
        negatesRepeatedDamageAllocation: Schema.Literal(false),
        expiresAt: HastePositiveExpirationSchema,
      }),
      dexteritySavingThrowAdvantage: Schema.Struct({
        kind: Schema.Literal("savingThrowRollMode"),
        sourceCombatantId: CombatantId,
        ability: Schema.Literal("dex"),
        mode: Schema.Literal("advantage"),
        expiresAt: HastePositiveExpirationSchema,
      }),
      grantedActionResource: Schema.Struct({
        kind: Schema.Literal("spellGrantedActionResource"),
        sourceCombatantId: CombatantId,
        restriction: HastePositiveActionRestrictionSchema,
        expiresAt: HastePositiveExpirationSchema,
      }),
      spellEndTargetState: Schema.Struct({
        kind: Schema.Literal("spellEndTargetState"),
        sourceCombatantId: CombatantId,
        condition: Schema.Literal("incapacitated"),
        expiresAt: HastePositiveExpirationSchema,
      }),
    }),
    rangeFeet: MovementFeet,
  }),
);

export const hastePositiveProfile = {
  procedure: "hastePositive",
  executionSchema: HastePositiveInvocationSchema,
  admit: admitHastePositive,
  discoverCastAct: discoverHastePositiveCastAct,
  resolve: resolveHastePositive,
} satisfies SpellProcedureDeclaration<
  "hastePositive",
  HastePositiveSpellInvocation
>;
import { spellInvocationResourceForCastOption } from "./profile.ts";
