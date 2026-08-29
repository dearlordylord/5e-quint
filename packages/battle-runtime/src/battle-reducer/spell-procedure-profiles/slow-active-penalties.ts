import { optionalProperty } from "../../optional-property.ts";
import { discoverSavingThrowSpellCastActs } from "../saving-throw-metamagic-holes.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-slow-active-penalties unit-feature.metamagic-heightened-save-disadvantage unit-feature.metamagic-careful-save-protection
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
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
import { Result, Schema } from "effect";
import {
  type BattleActDiscoveryCandidate,
  type BattleResolutionResult,
  type BattleSpellSavingThrowOutcomeValue,
  type BattleState,
  type BattleExecutableSpellInvocation,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  maybeOpenInterruptWindow,
  snapshotBattle,
} from "../interrupt-execution.ts";
import { spellReplayContinuation } from "../spell-reaction-continuation.ts";
import { battleCreatureWithSpellActiveEffects } from "../../active-effect/lifecycle.ts";
import { allocateBattleEffectOccurrenceForCreature } from "../../effect-execution-ref.ts";
import { type CombatantId } from "../../identity.ts";
import {
  SLOW_ACTIVE_PENALTIES_ARMOR_CLASS_DELTA,
  SLOW_ACTIVE_PENALTIES_DEX_SAVE_DELTA,
  SLOW_ACTIVE_PENALTIES_SOMATIC_FAILURE_PERCENT,
  SLOW_ACTIVE_PENALTIES_SPEED_RATIO,
} from "../domain-constants.ts";
import { extendSavingThrowOngoingFeatures } from "../attack-roll.ts";
import { resolveAreaSaveMetamagicFills } from "../spells-resolve-save-gates.ts";
import {
  spendSpellCastResources,
  startSpellEffectConcentration,
} from "../spells-resolve-resources.ts";
import { invalidResult } from "../result-helpers.ts";
import {
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { currentActorId } from "../creature-state-leaves.ts";
import { failedSavingThrowTargetIds } from "../saving-throw-outcomes.ts";
import { slowActionOrBonusActionTurnResources } from "../slow-active-penalties-runtime.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";

type SaveGatedTurnConstraintBundleSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedTurnConstraintBundle" }
>;

type SaveGatedTurnConstraintBundlePhase = Extract<
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

type SaveGatedTurnConstraintBundleResolveInput =
  SpellProcedureProfileResolveInput<SaveGatedTurnConstraintBundleSpellInvocation>;

type SaveGatedTurnConstraintBundleProfileShape = {
  readonly phase: SaveGatedTurnConstraintBundlePhase;
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

function admitSaveGatedTurnConstraintBundle(
  spell: SaveGatedTurnConstraintBundleSpellInvocation["spell"],
  ctx: SpellAdmissionContext,
): readonly SaveGatedTurnConstraintBundleSpellInvocation[] {
  const slow = saveGatedTurnConstraintBundleSpell(spell);
  if (slow === null) {
    return [];
  }
  return ctx.spellCastOptions.flatMap(
    (slot): readonly SaveGatedTurnConstraintBundleSpellInvocation[] =>
      Number(slot.spellLevel) < SLOW_ACTIVE_PENALTIES_LEVEL
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "saveGatedTurnConstraintBundle",
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

function saveGatedTurnConstraintBundleSpell(
  spell: SaveGatedTurnConstraintBundleSpellInvocation["spell"],
): SaveGatedTurnConstraintBundleProfileShape | null {
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
    !isSaveGatedTurnConstraintBundlePhase(phase) ||
    durationTicks === null ||
    Result.isFailure(durationTicks)
  ) {
    return null;
  }
  return {
    phase,
    rangeFeet: spell.mechanics.range.feet,
    durationTicks: durationTicks.success,
    maxTargets: SLOW_ACTIVE_PENALTIES_MAX_TARGETS,
  };
}

function isSaveGatedTurnConstraintBundlePhase(
  phase: ActivationPhase | undefined,
): phase is SaveGatedTurnConstraintBundlePhase {
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

function discoverSaveGatedTurnConstraintBundleCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SaveGatedTurnConstraintBundleSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return discoverSavingThrowSpellCastActs(state, actorId, invocation);
}

function resolveSaveGatedTurnConstraintBundle(
  input: SaveGatedTurnConstraintBundleResolveInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
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
  /* v8 ignore stop -- @preserve */
  const areaSave = resolveAreaSaveMetamagicFills({
    state: input.input.state,
    subject: input.input.subject,
    actorId: input.actorId,
    invocation: input.invocation,
    fills: input.input.fills,
    metamagicApplications: input.metamagicApplications,
    savingThrowOutcomes: input.fillSet.savingThrowOutcomes,
  });
  if (areaSave.tag !== "ready") {
    return areaSave;
  }
  const savingThrowOutcomes = areaSave.savingThrowOutcomes;
  const areaWitnessValidation = validateSlowAreaWitness(
    savingThrowOutcomes,
    input.invocation.maxTargets,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (areaWitnessValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      areaWitnessValidation,
    );
  }
  /* v8 ignore stop -- @preserve */
  const affectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = failedSavingThrowTargetIds(
    savingThrowOutcomes.outcomes,
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceProcedureRef: input.invocation.sourceProcedureRef,
        continuation: spellReplayContinuation(input.input),
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
    ...optionalProperty("metamagicApplications", input.metamagicApplications),
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
    input.fillSet.savingThrowRelationshipFacts,
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
  invocation: BattleExecutableSpellInvocation<SaveGatedTurnConstraintBundleSpellInvocation>,
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
    const allocation = allocateBattleEffectOccurrenceForCreature({
      owner: target,
      effect: {
        kind: "saveGatedTurnConstraintBundle" as const,
        sourceProcedureRef: invocation.sourceProcedureRef,
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
    });
    const activeEffects = [
      ...allocation.owner.activeEffects.filter(
        (effect) =>
          !(
            effect.kind === "saveGatedTurnConstraintBundle" &&
            effect.sourceProcedureRef === invocation.sourceProcedureRef &&
            effect.sourceCombatantId === actorId
          ),
      ),
      allocation.effect,
    ];
    combatants.set(
      targetId,
      battleCreatureWithSpellActiveEffects(allocation.owner, activeEffects),
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

/* v8 ignore start -- @preserve -- Malformed area-witness validator: Slow discovery supplies the typed Cube geometry, unique chosen targets, and matching outcomes; admitted Slow execution remains measured. */
function validateSlowAreaWitness(
  savingThrowOutcomes: BattleSpellSavingThrowOutcomeValue,
  maxTargets: 6,
): string | null {
  if (!("area" in savingThrowOutcomes)) {
    return "Slow requires a point-origin Cube area witness.";
  }
  const area = savingThrowOutcomes.area;
  if (area.kind !== "saveGatedTurnConstraintBundleArea") {
    return "The turn-constraint procedure requires explicit Cube membership and caster-choice witnesses.";
  }
  if (area.cubeSideFeet !== SLOW_ACTIVE_PENALTIES_CUBE_SIDE_FEET) {
    return "The turn-constraint procedure requires a 40-foot Cube witness.";
  }
  if (area.affectedTargetIds.length > maxTargets) {
    return "The turn-constraint Cube must not exceed six affected creatures.";
  }
  const outcomeTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const affectedTargetIds = new Set(area.affectedTargetIds);
  if (
    affectedTargetIds.size !== outcomeTargetIds.length ||
    outcomeTargetIds.some((targetId) => !affectedTargetIds.has(targetId))
  ) {
    return "The turn-constraint Cube targets must match its Saving Throw outcomes.";
  }
  const witnessTargetIds = new Set<CombatantId>();
  for (const witness of area.affectedCreatureWitnesses) {
    if (witnessTargetIds.has(witness.targetId)) {
      return "Turn-constraint Cube witnesses must not duplicate a target.";
    }
    witnessTargetIds.add(witness.targetId);
    if (witness.inCube !== true || witness.chosenByCaster !== true) {
      return "Affected-creature witnesses must prove Cube membership and source choice.";
    }
  }
  if (
    witnessTargetIds.size !== outcomeTargetIds.length ||
    outcomeTargetIds.some((targetId) => !witnessTargetIds.has(targetId))
  ) {
    return "The turn-constraint procedure requires a Cube and source-choice witness for every affected target.";
  }
  return null;
}
/* v8 ignore stop -- @preserve */

const SaveGatedTurnConstraintBundleInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("saveGatedTurnConstraintBundle"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      ability: Schema.Literal("wis"),
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("pointOriginCube"),
        sideFeet: MovementFeet,
      }),
      maxTargets: Schema.Literal(6),
      rangeFeet: MovementFeet,
      durationTicks: ElapsedTimeTicksSchema,
    }),
  );

export const saveGatedTurnConstraintBundleProfile = {
  procedure: "saveGatedTurnConstraintBundle",
  executionSchema: SaveGatedTurnConstraintBundleInvocationSchema,
  admit: admitSaveGatedTurnConstraintBundle,
  discoverCastAct: discoverSaveGatedTurnConstraintBundleCastAct,
  resolve: resolveSaveGatedTurnConstraintBundle,
} satisfies SpellProcedureDeclaration<
  "saveGatedTurnConstraintBundle",
  SaveGatedTurnConstraintBundleSpellInvocation
>;
import { spellInvocationResourceForCastOption } from "./profile.ts";
