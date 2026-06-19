// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties unit-feature.metamagic-heightened-save-disadvantage unit-feature.metamagic-careful-save-protection
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLOW_ACTIVE_PENALTIES_LIFECYCLE
//
// Slow active-penalties profile: action-time level-3+ Spell Slot casting,
// caller-supplied point-origin 40-foot Cube affected creatures chosen by the
// caster, Wisdom Saving Throws, source-owned Concentration effects for failed
// saves, target end-turn repeat-save cleanup, and support-profile admission for
// target-turn Action/Bonus Action choice, Attack action cap, and Somatic spell
// failure chance consumed by active-effect runtime helpers.
//
// RAW anchors:
//   - SRD 5.2.1 Spells/Descriptions-S-Z.md "Slow": Action; 120 feet;
//     Concentration up to 1 minute; up to six creatures of the caster's choice
//     in a 40-foot Cube; Wisdom Saving Throw; failed targets have Speed halved,
//     -2 AC, -2 Dexterity Saving Throws, no Reactions, target-turn limits,
//     Somatic failure chance, and an end-of-turn repeat save ending the spell on
//     itself on success.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Slot, Concentration, Spell
//     Invocation, Area of Effect/Cube, Saving Throw, Speed, Armor Class,
//     Reaction, and Spell Effect.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import type { ActivationPhase, EffectAtom } from "@dnd/surface/surface/types";
import { Either, Schema } from "effect";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  maybeOpenInterruptWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleHole,
  type BattleResolutionResult,
  type BattleSpellSavingThrowOutcomeValue,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { battleCreatureWithSpellActiveEffects } from "../../active-effect/lifecycle.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import {
  SLOW_ACTIVE_PENALTIES_ARMOR_CLASS_DELTA,
  SLOW_ACTIVE_PENALTIES_DEX_SAVE_DELTA,
  SLOW_ACTIVE_PENALTIES_SOMATIC_FAILURE_PERCENT,
  SLOW_ACTIVE_PENALTIES_SPEED_RATIO,
} from "../domain-constants.ts";
import { extendSavingThrowOngoingFeatures } from "../attack-roll.ts";
import {
  type SpellMetamagicApplicationFact,
  CAREFUL_METAMAGIC_EFFECT_KIND,
  discoverSpellMetamagicSelections,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  spellMetamagicApplications,
  spellMetamagicLabel,
} from "../metamagic-support.ts";
import {
  carefulSpellProtectedTargetsHole,
  heightenedSpellTargetChoiceHole,
  spellSavingThrowAbility,
  spellSavingThrowOutcomeHole,
  spellSavingThrowTargeting,
} from "../spells-holes-fills.ts";
import {
  saveMetamagicSelectionState,
  validateSavingThrowOutcomes,
} from "../spells-resolve-save-gates.ts";
import {
  spendSpellCastResources,
  startSpellEffectConcentration,
} from "../spells-resolve-resources.ts";
import { invalidResult } from "../result-helpers.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import {
  BattleRuntimeObjectSchema,
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { currentActorId } from "../creature-state-leaves.ts";
import { slowActionOrBonusActionTurnResources } from "../slow-active-penalties-runtime.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellProcedureInvocationSchema } from "./profile.ts";

type SlowActivePenaltiesSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "slowActivePenalties" }
>;

type SlowActivePenaltiesPhase = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
> & {
  readonly ability: "wis";
  readonly attachment: {
    readonly kind: "hole";
    readonly value: {
      readonly kind: "area";
      readonly origin: { readonly kind: "point_within_range" };
      readonly shape: { readonly kind: "cube"; readonly sideFeet: 40 };
      readonly selection: {
        readonly mode: "choose_up_to";
        readonly count: 6;
        readonly targetKinds: readonly ["creature"];
      };
    };
  };
};

type SlowActivePenaltiesResolveInput = SpellProcedureProfileResolveInput<
  SlowActivePenaltiesSpellInvocation,
  ActionSpellBattleResolutionInput
> & {
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
};

type SlowActivePenaltiesProfileShape = {
  readonly phase: SlowActivePenaltiesPhase;
  readonly rangeFeet: number;
  readonly durationTicks: ElapsedTimeTicks;
  readonly maxTargets: 6;
};

const SLOW_ACTIVE_PENALTIES_LEVEL = 3;
const SLOW_ACTIVE_PENALTIES_RANGE_FEET = 120;
const SLOW_ACTIVE_PENALTIES_DURATION_MINUTES = 1;
const SLOW_ACTIVE_PENALTIES_CUBE_SIDE_FEET = 40;
const SLOW_ACTIVE_PENALTIES_MAX_TARGETS = 6;
const SLOW_ACTIVE_PENALTIES_FAILED_EFFECT_COUNT = 7;

function admitSlowActivePenalties(
  spell: SlowActivePenaltiesSpellInvocation["spell"],
  ctx: SpellAdmissionContext,
): readonly SlowActivePenaltiesSpellInvocation[] {
  const slow = slowActivePenaltiesSpell(spell);
  if (slow === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly SlowActivePenaltiesSpellInvocation[] =>
      Number(slot.spellLevel) < SLOW_ACTIVE_PENALTIES_LEVEL
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "slowActivePenalties",
              spell,
              actionCost: "magicAction",
              ability: slow.phase.ability,
              dc: slow.phase.dc,
              targeting: {
                kind: "pointOriginCube",
                sideFeet: movementFeet(
                  slow.phase.attachment.value.shape.sideFeet,
                ),
              },
              maxTargets: slow.maxTargets,
              rangeFeet: movementFeet(slow.rangeFeet),
              durationTicks: slow.durationTicks,
            },
          ],
  );
}

function slowActivePenaltiesSpell(
  spell: SlowActivePenaltiesSpellInvocation["spell"],
): SlowActivePenaltiesProfileShape | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  if (
    spell.mechanics.level !== SLOW_ACTIVE_PENALTIES_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== SLOW_ACTIVE_PENALTIES_RANGE_FEET ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !==
      SLOW_ACTIVE_PENALTIES_DURATION_MINUTES ||
    spell.mechanics.phases.length !== 1 ||
    !isSlowActivePenaltiesPhase(phase) ||
    durationTicks === null ||
    Either.isLeft(durationTicks)
  ) {
    return null;
  }
  return {
    phase,
    rangeFeet: spell.mechanics.range.feet,
    durationTicks: durationTicks.right,
    maxTargets: SLOW_ACTIVE_PENALTIES_MAX_TARGETS,
  };
}

function isSlowActivePenaltiesPhase(
  phase: ActivationPhase | undefined,
): phase is SlowActivePenaltiesPhase {
  const failedEffects =
    phase?.kind === "save_gate" && phase.onFail.kind === "composite"
      ? phase.onFail.effects
      : [];
  const repeatSaves =
    phase?.kind === "save_gate" ? (phase.repeatSaves ?? []) : [];
  const repeatSave = repeatSaves.length === 1 ? repeatSaves[0] : undefined;
  const selection =
    phase?.kind === "save_gate" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "area"
      ? phase.attachment.value.selection
      : undefined;
  return (
    phase?.kind === "save_gate" &&
    phase.ability === "wis" &&
    phase.dc.kind === "caster_spell_save_dc" &&
    phase.onSuccess.kind === "none" &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "area" &&
    phase.attachment.value.origin.kind === "point_within_range" &&
    phase.attachment.value.shape.kind === "cube" &&
    phase.attachment.value.shape.sideFeet ===
      SLOW_ACTIVE_PENALTIES_CUBE_SIDE_FEET &&
    selection?.mode === "choose_up_to" &&
    selection.count === SLOW_ACTIVE_PENALTIES_MAX_TARGETS &&
    sameStringSet(selection.targetKinds, ["creature"]) &&
    failedEffects.length === SLOW_ACTIVE_PENALTIES_FAILED_EFFECT_COUNT &&
    failedEffects.some(isSlowSpeedRatioEffect) &&
    failedEffects.some(isSlowArmorClassPenaltyEffect) &&
    failedEffects.some(isSlowDexteritySavingThrowPenaltyEffect) &&
    failedEffects.some(isSlowReactionRestrictionEffect) &&
    failedEffects.some(
      (effect) => effect.kind === "choose_action_or_bonus_action_each_turn",
    ) &&
    failedEffects.some(
      (effect) =>
        effect.kind === "cap_attack_action_attacks" && effect.maxAttacks === 1,
    ) &&
    failedEffects.some(
      (effect) =>
        effect.kind === "somatic_spell_failure_chance" &&
        effect.percent === SLOW_ACTIVE_PENALTIES_SOMATIC_FAILURE_PERCENT,
    ) &&
    repeatSave !== undefined &&
    repeatSave.cadence === "end_of_target_turn" &&
    repeatSave.rollMode === undefined &&
    repeatSave.onSuccess === "ends_on_target" &&
    repeatSave.onFailAgain === undefined
  );
}

function isSlowSpeedRatioEffect(effect: EffectAtom): boolean {
  return (
    effect.kind === "set_speed_ratio" &&
    effect.numerator === SLOW_ACTIVE_PENALTIES_SPEED_RATIO.numerator &&
    effect.denominator === SLOW_ACTIVE_PENALTIES_SPEED_RATIO.denominator
  );
}

function isSlowArmorClassPenaltyEffect(effect: EffectAtom): boolean {
  return (
    effect.kind === "modify_ac" &&
    effect.delta.kind === "fixed_number" &&
    effect.delta.sign === "-" &&
    effect.delta.amount === Math.abs(SLOW_ACTIVE_PENALTIES_ARMOR_CLASS_DELTA)
  );
}

function isSlowDexteritySavingThrowPenaltyEffect(effect: EffectAtom): boolean {
  if (effect.kind !== "modify_roll_numeric") {
    return false;
  }
  const abilityFilter = effect.abilityFilter;
  return (
    sameStringSet(effect.on, ["saving_throw"]) &&
    Array.isArray(abilityFilter) &&
    sameStringSet(abilityFilter, ["dex"]) &&
    effect.weaponFilter === undefined &&
    effect.skillFilter === undefined &&
    effect.count === undefined &&
    effect.delta.kind === "fixed_number" &&
    effect.delta.sign === "-" &&
    effect.delta.amount === Math.abs(SLOW_ACTIVE_PENALTIES_DEX_SAVE_DELTA)
  );
}

function isSlowReactionRestrictionEffect(effect: EffectAtom): boolean {
  return (
    effect.kind === "restrict_action_usage" &&
    sameStringSet(effect.actions, ["reaction"])
  );
}

function sameStringSet(
  actual: readonly string[] | undefined,
  expected: readonly string[],
): boolean {
  return (
    actual !== undefined &&
    actual.length === expected.length &&
    expected.every((value) => actual.includes(value))
  );
}

function discoverSlowActivePenaltiesCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: SlowActivePenaltiesSpellInvocation,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  const savingThrowHole = spellSavingThrowOutcomeHole(
    state,
    actorId,
    invocation,
  );
  const baseCastAct = slowActivePenaltiesCastAct(
    actorId,
    invocation,
    [savingThrowHole],
    invocation.spell.name,
    slowActivePenaltiesCastSummaryWithSavingThrow(invocation),
  );
  if (actor === undefined) {
    return [baseCastAct];
  }
  return [
    baseCastAct,
    ...discoverSpellMetamagicSelections({ actor, invocation }).map(
      (metamagic) => {
        const applications = spellMetamagicApplications(actor, metamagic);
        const metamagicHoles = slowActivePenaltiesMetamagicInitialHoles(
          state,
          actorId,
          invocation,
          applications,
        );
        const label = spellMetamagicLabel(metamagic);
        return {
          ...baseCastAct,
          subject: { ...baseCastAct.subject, metamagic },
          initialHoles:
            metamagicHoles.length === 0 ? [savingThrowHole] : metamagicHoles,
          label: `${invocation.spell.name} (${label})`,
          summary: `${baseCastAct.summary} Cast with ${label}.`,
        };
      },
    ),
  ];
}

function slowActivePenaltiesCastAct(
  actorId: CombatantId,
  invocation: SlowActivePenaltiesSpellInvocation,
  initialHoles: readonly BattleHole[],
  label: string,
  summary: string,
): AvailableBattleAct {
  return {
    subject: {
      tag: "actionSpell",
      actorId,
      invocation: slowActivePenaltiesInvocationRef(invocation),
      mode: { tag: "cast" },
    },
    label,
    summary,
    initialHoles,
  };
}

function slowActivePenaltiesMetamagicInitialHoles(
  state: BattleState,
  actorId: CombatantId,
  invocation: SlowActivePenaltiesSpellInvocation,
  metamagicApplications: readonly SpellMetamagicApplicationFact[],
): readonly BattleHole[] {
  const targeting = spellSavingThrowTargeting(invocation);
  const holes: BattleHole[] = [];
  if (
    targeting.kind !== "singleCombatant" &&
    metamagicApplications.some(
      (application) => application.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
    )
  ) {
    holes.push(carefulSpellProtectedTargetsHole(state, actorId, invocation));
  }
  if (
    targeting.kind !== "singleCombatant" &&
    metamagicApplications.some(
      (application) =>
        application.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
    )
  ) {
    holes.push(heightenedSpellTargetChoiceHole(state, actorId, invocation));
  }
  return holes;
}

function slowActivePenaltiesInvocationRef(
  invocation: SlowActivePenaltiesSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "slowActivePenalties",
  };
}

function slowActivePenaltiesCastSummary(
  invocation: SlowActivePenaltiesSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function slowActivePenaltiesCastSummaryWithSavingThrow(
  invocation: SlowActivePenaltiesSpellInvocation,
): string {
  return `${slowActivePenaltiesCastSummary(
    invocation,
  )} Table-supplied chosen creatures in the Cube make ${spellSavingThrowAbility(
    invocation,
  ).toUpperCase()} Saving Throws.`;
}

function resolveSlowActivePenalties(
  input: SlowActivePenaltiesResolveInput,
): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Slow uses an area Saving Throw outcome fill.",
    );
  }
  const metamagicSelections = saveMetamagicSelectionState({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications: input.metamagicApplications,
    targetId: undefined,
  });
  if (metamagicSelections.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      metamagicSelections.message,
    );
  }
  if (metamagicSelections.tag === "needsHoles") {
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      metamagicSelections.holes,
    );
  }
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
    metamagicSelections.heightenedSpellTargetId,
  );
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowValidation = validateSavingThrowOutcomes(
    input.fillSet.savingThrowOutcomes,
    savingThrowHole,
    input.input.state,
    input.actorId,
    undefined,
    undefined,
    metamagicSelections.carefulSpellProtectedTargetIds,
    metamagicSelections.heightenedSpellTargetId,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }
  const areaWitnessValidation = validateSlowAreaWitness(
    input.fillSet.savingThrowOutcomes,
    input.invocation.maxTargets,
  );
  if (areaWitnessValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      areaWitnessValidation,
    );
  }
  const affectedTargetIds = input.fillSet.savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = input.fillSet.savingThrowOutcomes.outcomes.flatMap(
    (outcome) => (outcome.succeeded ? [] : [outcome.targetId]),
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceSpellId: input.invocation.spell.id,
        continuation: {
          kind: "replay",
          subject:
            input.input.reactionContinuationSubject ?? input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.handledInterruptTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    startConcentration: false,
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applySlowActivePenaltyEffects(
    resourced.state,
    input.actorId,
    failedTargets,
    input.invocation,
  );
  const concentrationState =
    effected.appliedTargetIds.length === 0
      ? effected.state
      : startSpellEffectConcentration(
          effected.state,
          input.actorId,
          input.invocation,
        );
  const nextState = extendSavingThrowOngoingFeatures(
    concentrationState,
    input.actorId,
    affectedTargetIds,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function applySlowActivePenaltyEffects(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: SlowActivePenaltiesSpellInvocation,
): {
  readonly state: BattleState;
  readonly appliedTargetIds: readonly CombatantId[];
} {
  const combatants = new Map(state.combatants);
  const appliedTargetIds: CombatantId[] = [];
  for (const targetId of targetIds) {
    const target = combatants.get(targetId);
    if (target === undefined) {
      continue;
    }
    const activeEffects = [
      ...target.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === "slowActivePenalties" &&
            effect.sourceSpellId === invocation.spell.id &&
            effect.sourceCombatantId === actorId
          ),
      ),
      {
        kind: "slowActivePenalties" as const,
        sourceSpellId: invocation.spell.id,
        sourceCombatantId: actorId,
        save: {
          ability: invocation.ability,
          dc: invocation.dc,
        },
        expiresAt: {
          kind: "concentration" as const,
          combatantId: actorId,
          durationTicks: invocation.durationTicks,
        },
      },
    ];
    combatants.set(
      targetId,
      battleCreatureWithSpellActiveEffects(target, activeEffects),
    );
    appliedTargetIds.push(targetId);
  }
  const currentTurnActorId = currentActorId(state);
  const currentTurnResources = appliedTargetIds.includes(currentTurnActorId)
    ? slowActionOrBonusActionTurnResources(
        state.currentTurnResources,
        combatants.get(currentTurnActorId),
      )
    : state.currentTurnResources;
  return {
    state: { ...state, combatants, currentTurnResources },
    appliedTargetIds,
  };
}

function validateSlowAreaWitness(
  savingThrowOutcomes: BattleSpellSavingThrowOutcomeValue,
  maxTargets: 6,
): string | null {
  if (!("area" in savingThrowOutcomes)) {
    return "Slow requires a point-origin Cube area witness.";
  }
  const area = savingThrowOutcomes.area;
  if (area.kind !== "slowArea") {
    return "Slow requires explicit Cube membership and caster-choice witnesses.";
  }
  if (area.cubeSideFeet !== SLOW_ACTIVE_PENALTIES_CUBE_SIDE_FEET) {
    return "Slow requires a 40-foot Cube witness.";
  }
  if (area.affectedTargetIds.length > maxTargets) {
    return "Slow Cube affected targets must not exceed six creatures.";
  }
  const outcomeTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const affectedTargetIds = new Set(area.affectedTargetIds);
  if (
    affectedTargetIds.size !== outcomeTargetIds.length ||
    outcomeTargetIds.some((targetId) => !affectedTargetIds.has(targetId))
  ) {
    return "Slow Cube affected targets must match its Saving Throw outcomes.";
  }
  const witnessTargetIds = new Set<CombatantId>();
  for (const witness of area.affectedCreatureWitnesses) {
    if (witnessTargetIds.has(witness.targetId)) {
      return "Slow Cube witnesses must not duplicate a target.";
    }
    witnessTargetIds.add(witness.targetId);
    if (witness.inCube !== true || witness.chosenByCaster !== true) {
      return "Slow affected-creature witnesses must prove Cube membership and caster choice.";
    }
  }
  if (
    witnessTargetIds.size !== outcomeTargetIds.length ||
    outcomeTargetIds.some((targetId) => !witnessTargetIds.has(targetId))
  ) {
    return "Slow requires a Cube and caster-choice witness for every affected target.";
  }
  return null;
}

const SlowActivePenaltiesInvocationSchema =
  spellProcedureInvocationSchema<SlowActivePenaltiesSpellInvocation>(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("slowActivePenalties"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("magicAction"),
      ability: Schema.Literal("wis"),
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("pointOriginCube"),
        sideFeet: MovementFeet,
      }),
      maxTargets: Schema.Literal(6),
      rangeFeet: MovementFeet,
      durationTicks: Schema.Number,
    }),
  );

export const slowActivePenaltiesProfile = {
  procedure: "slowActivePenalties",
  invocationSchema: SlowActivePenaltiesInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitSlowActivePenalties,
  discoverCastAct: discoverSlowActivePenaltiesCastAct,
  castSummary: slowActivePenaltiesCastSummary,
  invocationRef: slowActivePenaltiesInvocationRef,
  resolve: resolveSlowActivePenalties,
} satisfies SpellProcedureProfile<
  "slowActivePenalties",
  SlowActivePenaltiesSpellInvocation,
  ActionSpellBattleResolutionInput
>;
