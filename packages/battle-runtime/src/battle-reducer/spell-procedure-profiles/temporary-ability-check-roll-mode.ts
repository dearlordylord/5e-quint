import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { ElapsedTimeTicks } from "@dnd/shared/elapsed-time";
import { movementFeet } from "@dnd/shared/types";
import type { EffectAtom, SpellMechanics } from "@dnd/surface/surface/types";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-self-ability-check-advantage
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS
//
// The temporaryAbilityCheckRollMode Spell Procedure Profile: the Thaumaturgy cantrip
// branch that creates a one-minute self Spell Effect projecting Advantage on
// caller-supplied Charisma (Intimidation) Ability Check witnesses.
//
// What lives here:
//   - admit()           - was supportedCantripTemporaryAbilityCheckRollModeSpellProfile
//                         in spells-profiles-support.ts
//   - discoverCastAct() - was the temporaryAbilityCheckRollMode branch in
//                         spells-discovery.ts
//   - castSummary()     - was the temporaryAbilityCheckRollMode branch in
//                         spells-discovery.ts
//   - resolve()         - was resolveTemporaryAbilityCheckRollModeSpellAct in
//                         spells-resolve-support-effects.ts
//   - applyEffect()     - was applyTemporaryAbilityCheckRollModeSpellEffect in
//                         spells-active-effects.ts
//
// What stays in shared infrastructure:
//   - rollModifierSkillFilter stays in spells-profiles-support.ts until the
//     shared roll-modifier projection helpers are split.
//   - The active 1-minute-effect count witness hole stays in
//     spells-damage-fills.ts until the hole subsystem migrates.

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleActiveEffect,
  type BattleSpellExecutionSource,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import { TemporaryAbilityCheckRollModeTemplateSchema } from "../../active-effect/codecs.ts";
import {
  TemporaryAbilityCheckRollModeConcurrentDurationModeLimitSchema,
  TemporaryAbilityCheckRollModeSelectedModeSchema,
} from "../../procedure-execution/spell-procedure-execution.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { temporaryAbilityCheckRollModeActiveEffectCountHole } from "../spells-damage-fills.ts";
import { rollModifierSkillFilter } from "../spells-profiles-support.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { replaceTargetSpellActiveEffect } from "../active-effect-replacement.ts";
import {
  MINOR_WONDER_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_ID,
  TEMPORARY_ABILITY_CHECK_ROLL_MODE_MAX_ACTIVE_EFFECTS,
} from "../domain-constants.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { cantripSpellAccessFor } from "./profile.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import {
  isSpellCanonicalDurationValue,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
  spellDurationChildPath,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingModeChoicePath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { Result, Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  CantripSpellAccessSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type TemporaryAbilityCheckRollModeInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "temporaryAbilityCheckRollMode" }
>;

type TemporaryAbilityCheckRollModeMechanics = Extract<
  SpellMechanics,
  { readonly family: "modal_ongoing_effect" }
>;
type TemporaryAbilityCheckRollModeMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: ReturnType<typeof movementFeet>;
  readonly selectedMode: TemporaryAbilityCheckRollModeInvocation["selectedMode"];
  readonly concurrentDurationModeLimit: TemporaryAbilityCheckRollModeInvocation["concurrentDurationModeLimit"];
};

export const TEMPORARY_ABILITY_CHECK_ROLL_MODE_FAILED_FACTS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "durationValue",
  "durationEnding",
  "castingTime",
  "attachment",
  "concurrentEffectLimit",
  "mode",
  "effect",
] as const;
type TemporaryAbilityCheckRollModeFailedFact =
  (typeof TEMPORARY_ABILITY_CHECK_ROLL_MODE_FAILED_FACTS)[number];
type TemporaryAbilityCheckRollModeMechanicsIssue = SpellProcedureAdmissionIssue<
  "temporaryAbilityCheckRollMode",
  TemporaryAbilityCheckRollModeFailedFact,
  SpellMechanicsBranchPath
>;
type TemporaryAbilityCheckRollModeMechanicsInspection =
  SpellProcedureMechanicsInspection<
    "temporaryAbilityCheckRollMode",
    TemporaryAbilityCheckRollModeMechanicsFacts,
    TemporaryAbilityCheckRollModeInvocation,
    TemporaryAbilityCheckRollModeMechanicsIssue
  >;

type TemporaryAbilityCheckRollModeEffect = Extract<
  EffectAtom,
  { readonly kind: "modify_roll_advantage" }
>;

const TEMPORARY_ABILITY_CHECK_ROLL_MODE_SELECTION = {
  kind: "abilityCheckRollMode",
  ability: "cha",
  skill: "intimidation",
  rollMode: "advantage",
  effectDuration: "spellDuration",
} as const satisfies TemporaryAbilityCheckRollModeInvocation["selectedMode"];

function temporaryAbilityCheckRollModeMechanicsIssue(
  failedFact: TemporaryAbilityCheckRollModeFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): TemporaryAbilityCheckRollModeMechanicsIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "temporaryAbilityCheckRollMode",
    failedFact,
    mechanicsPath,
    message: `Unsupported temporaryAbilityCheckRollMode mechanics fact: ${failedFact}.`,
  };
}

function temporaryAbilityCheckRollModeMechanicsRepresentation(
  mechanics: SpellMechanics,
): mechanics is TemporaryAbilityCheckRollModeMechanics {
  if (mechanics.family !== "modal_ongoing_effect") return false;
  const hasCharacteristicEffect = mechanics.mode.options.some((option) =>
    option.effects?.some((effect) => effect.kind === "modify_roll_advantage"),
  );
  const hasDistinctiveHeaders =
    mechanics.level === 0 &&
    mechanics.castingTime.kind === "action" &&
    mechanics.range.kind === "point" &&
    mechanics.range.feet === 30 &&
    mechanics.duration.kind === "timed" &&
    mechanics.duration.value.unit === "minute" &&
    mechanics.duration.value.amount === 1 &&
    mechanics.attachment.kind === "self" &&
    mechanics.concurrentEffectLimit?.appliesTo === "spell_duration_modes" &&
    mechanics.concurrentEffectLimit.maximumActive ===
      TEMPORARY_ABILITY_CHECK_ROLL_MODE_MAX_ACTIVE_EFFECTS;
  return hasCharacteristicEffect || hasDistinctiveHeaders;
}

function singleTemporaryAbilityCheckRollModeEffect(
  options: TemporaryAbilityCheckRollModeMechanics["mode"]["options"],
): TemporaryAbilityCheckRollModeEffect | undefined {
  const matchingEffects = options.flatMap((option) => {
    if (option.effectDuration !== "spell_duration") return [];
    const effects = option.effects ?? [];
    if (effects.length !== 1) return [];
    const [effect] = effects;
    return effect?.kind === "modify_roll_advantage" ? [effect] : [];
  });
  if (matchingEffects.length !== 1) return undefined;
  return matchingEffects[0];
}

function temporaryAbilityCheckRollModeEffectMatches(
  effect: TemporaryAbilityCheckRollModeEffect,
): boolean {
  const skillFilter = rollModifierSkillFilter(effect.skillFilter);
  return [
    effect.mode === TEMPORARY_ABILITY_CHECK_ROLL_MODE_SELECTION.rollMode,
    (effect.affects ?? "self_roll") === "self_roll",
    sameStringSet(effect.on, ["ability_check"]),
    Array.isArray(effect.abilityFilter),
    Array.isArray(effect.abilityFilter) &&
      sameStringSet(effect.abilityFilter, [
        TEMPORARY_ABILITY_CHECK_ROLL_MODE_SELECTION.ability,
      ]),
    skillFilter?.kind === "fixed",
    skillFilter?.kind === "fixed" &&
      skillFilter.skill === TEMPORARY_ABILITY_CHECK_ROLL_MODE_SELECTION.skill,
  ].every(Boolean);
}

function temporaryAbilityCheckRollModeDurationSupported(
  duration: SpellMechanics["duration"],
): duration is Extract<SpellMechanics["duration"], { readonly kind: "timed" }> {
  return (
    duration.kind === "timed" &&
    duration.value.unit === "minute" &&
    duration.value.amount === 1 &&
    isSpellCanonicalDurationValue(duration.value) &&
    duration.earlyEnd === undefined &&
    duration.permanentAfter === undefined
  );
}

function admitTemporaryAbilityCheckRollModeMechanics(
  source: SpellMechanicsAdmissionSource,
): TemporaryAbilityCheckRollModeMechanicsInspection {
  if (!temporaryAbilityCheckRollModeMechanicsRepresentation(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const duration = temporaryAbilityCheckRollModeDurationSupported(
    mechanics.duration,
  )
    ? mechanics.duration
    : undefined;
  const effect = singleTemporaryAbilityCheckRollModeEffect(
    mechanics.mode.options,
  );
  const durationTicks =
    duration === undefined
      ? undefined
      : elapsedTimeTicksFromTimeSpanDuration(duration.value);
  const issues: TemporaryAbilityCheckRollModeMechanicsIssue[] = [];
  const push = (
    failedFact: TemporaryAbilityCheckRollModeFailedFact,
    mechanicsPath: SpellMechanicsBranchPath,
  ): void => {
    issues.push(
      temporaryAbilityCheckRollModeMechanicsIssue(failedFact, mechanicsPath),
    );
  };

  if (mechanics.level !== 0) {
    push("level", spellMechanicsHeaderPath("level"));
  }
  if (mechanics.school !== "transmutation") {
    push("school", spellMechanicsHeaderPath("school"));
  }
  if (
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== 30 ||
    Object.keys(mechanics.range).length !== 2
  ) {
    push("range", spellMechanicsHeaderPath("range"));
  }
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== false ||
    mechanics.components.m !== false ||
    "materialCostGp" in mechanics.components ||
    "materialConsumed" in mechanics.components
  ) {
    push("components", spellMechanicsHeaderPath("components"));
    for (const path of spellConsumedMaterialEvidencePaths(
      mechanics.components,
    )) {
      push("components", path);
    }
  }
  if (duration === undefined) {
    push("duration", spellMechanicsHeaderPath("duration"));
    if (mechanics.duration.kind === "timed") {
      if (
        mechanics.duration.value.unit !== "minute" ||
        mechanics.duration.value.amount !== 1 ||
        !isSpellCanonicalDurationValue(mechanics.duration.value)
      ) {
        push("durationValue", spellDurationValuePath());
      }
      for (const child of spellDurationChildCoordinates(mechanics.duration)) {
        push("durationEnding", spellDurationChildPath(child));
      }
    } else {
      push("durationValue", spellDurationValuePath());
    }
  }
  if (
    mechanics.castingTime.kind !== "action" ||
    mechanics.castingTime.ritual !== undefined
  ) {
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (mechanics.attachment.kind !== "self") {
    push("attachment", spellOngoingAttachmentPath());
  }
  if (
    mechanics.concurrentEffectLimit?.appliesTo !== "spell_duration_modes" ||
    mechanics.concurrentEffectLimit.maximumActive !==
      TEMPORARY_ABILITY_CHECK_ROLL_MODE_MAX_ACTIVE_EFFECTS
  ) {
    push("concurrentEffectLimit", spellMechanicsHeaderPath("family"));
  }
  if (effect === undefined) {
    push("mode", spellOngoingModeChoicePath());
  } else if (
    durationTicks === undefined ||
    Result.isFailure(durationTicks) ||
    !temporaryAbilityCheckRollModeEffectMatches(effect)
  ) {
    push("effect", spellOngoingModeChoicePath());
  }

  const nonEmpty = spellProcedureNonEmpty(spellUniqueMechanicsIssues(issues));
  if (nonEmpty !== undefined) {
    return { tag: "unsupported", issues: nonEmpty };
  }
  if (
    duration === undefined ||
    durationTicks === undefined ||
    Result.isFailure(durationTicks) ||
    effect === undefined
  ) {
    return {
      tag: "unsupported",
      issues: [
        temporaryAbilityCheckRollModeMechanicsIssue(
          "effect",
          spellOngoingModeChoicePath(),
        ),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    durationTicks: durationTicks.success,
    rangeFeet: movementFeet(30),
    selectedMode: TEMPORARY_ABILITY_CHECK_ROLL_MODE_SELECTION,
    concurrentDurationModeLimit: {
      maximumActive: TEMPORARY_ABILITY_CHECK_ROLL_MODE_MAX_ACTIVE_EFFECTS,
    },
  } satisfies TemporaryAbilityCheckRollModeMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "temporaryAbilityCheckRollMode",
      facts,
      evidence: {
        consumed: [
          spellMechanicsHeaderPath("level"),
          spellMechanicsHeaderPath("school"),
          spellMechanicsHeaderPath("range"),
          spellMechanicsHeaderPath("components"),
          spellMechanicsHeaderPath("duration"),
          spellMechanicsHeaderPath("castingTime"),
          spellMechanicsHeaderPath("family"),
          spellDurationValuePath(),
          spellOngoingAttachmentPath(),
          ...spellConsumedMaterialEvidencePaths(mechanics.components),
        ],
        unowned: [spellOngoingModeChoicePath()],
      },
      admit: (executionSource, ctx) =>
        admitTemporaryAbilityCheckRollMode(executionSource, ctx, facts),
    },
  };
}

function admitTemporaryAbilityCheckRollMode(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: TemporaryAbilityCheckRollModeMechanicsFacts,
): readonly TemporaryAbilityCheckRollModeInvocation[] {
  return [
    {
      access: cantripSpellAccessFor(ctx.castingSource),
      resource: { tag: "none" },
      procedure: "temporaryAbilityCheckRollMode",
      spell,
      actionCost: "magicAction",
      activeEffect: {
        kind: "temporaryAbilityCheckRollMode",
        sourceCombatantId: ctx.actor.combatantId,
        expiresAt: { kind: "duration", durationTicks: facts.durationTicks },
      },
      rangeFeet: facts.rangeFeet,
      selectedMode: facts.selectedMode,
      concurrentDurationModeLimit: facts.concurrentDurationModeLimit,
    },
  ];
}

function discoverTemporaryAbilityCheckRollModeCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<TemporaryAbilityCheckRollModeInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" },
      },
      initialHoles: [
        temporaryAbilityCheckRollModeActiveEffectCountHole(invocation),
      ],
    },
  ];
}

function isTemporaryAbilityCheckRollModeEffectForInvocation(
  effect: BattleActiveEffect,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<TemporaryAbilityCheckRollModeInvocation>,
): effect is Extract<
  BattleActiveEffect,
  { readonly kind: "temporaryAbilityCheckRollMode" }
> {
  return (
    effect.kind === "temporaryAbilityCheckRollMode" &&
    effect.sourceProcedureRef === invocation.sourceProcedureRef &&
    effect.sourceCombatantId === actorId
  );
}

function applyTemporaryAbilityCheckRollModeEffect(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<TemporaryAbilityCheckRollModeInvocation>,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return state;
  }
  return replaceTargetSpellActiveEffect(
    state,
    actorId,
    (effect) =>
      isTemporaryAbilityCheckRollModeEffectForInvocation(
        effect,
        actorId,
        invocation,
      ),
    {
      ...invocation.activeEffect,
      sourceProcedureRef: invocation.sourceProcedureRef,
      sourceCombatantId: actorId,
    },
  );
}

function resolveTemporaryAbilityCheckRollMode(
  input: SpellProcedureProfileResolveInput<TemporaryAbilityCheckRollModeInvocation>,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      MINOR_WONDER_ACTIVE_ONE_MINUTE_EFFECT_COUNT_HOLE_ID,
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "minor-wonder profile Booming Voice uses only the total active 1-minute effect count witness.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const activeCountFill =
    input.fillSet.temporaryAbilityCheckRollModeActiveEffectCount;
  if (activeCountFill === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      temporaryAbilityCheckRollModeActiveEffectCountHole(input.invocation),
    ]);
  }
  const activeCount = activeCountFill.value.activeOneMinuteEffectCount;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!Number.isInteger(activeCount) || activeCount < 0) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "minor-wonder profile active 1-minute effect count must be a non-negative integer.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const actor = input.input.state.combatants.get(input.actorId);
  const existingBoomingVoiceEffectCount =
    actor?.activeEffects.filter((effect) =>
      isTemporaryAbilityCheckRollModeEffectForInvocation(
        effect,
        input.actorId,
        input.invocation,
      ),
    ).length ?? 0;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (activeCount < existingBoomingVoiceEffectCount) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "minor-wonder profile active 1-minute effect count must include active Booming Voice effects tracked by battle runtime.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const activeCountAfterCast =
    activeCount - existingBoomingVoiceEffectCount + 1;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    activeCountAfterCast > TEMPORARY_ABILITY_CHECK_ROLL_MODE_MAX_ACTIVE_EFFECTS
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "minor-wonder profile can have at most three active 1-minute effects after this cast.",
    );
  }
  /* v8 ignore stop -- @preserve */

  return resolveSpellActiveEffectCast({
    resolution: input,
    targetIds: [input.actorId],
    castingResource: { kind: "magicAction" },
    applyEffect: (state) =>
      applyTemporaryAbilityCheckRollModeEffect(
        state,
        input.actorId,
        input.invocation,
      ),
  });
}

const TemporaryAbilityCheckRollModeInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: CantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("temporaryAbilityCheckRollMode"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      activeEffect: TemporaryAbilityCheckRollModeTemplateSchema,
      rangeFeet: MovementFeet,
      selectedMode: TemporaryAbilityCheckRollModeSelectedModeSchema,
      concurrentDurationModeLimit:
        TemporaryAbilityCheckRollModeConcurrentDurationModeLimitSchema,
    }),
  );
export const temporaryAbilityCheckRollModeProfile: SpellProcedureDeclaration<
  "temporaryAbilityCheckRollMode",
  TemporaryAbilityCheckRollModeInvocation
> = {
  procedure: "temporaryAbilityCheckRollMode",
  executionSchema: TemporaryAbilityCheckRollModeInvocationSchema,
  admitMechanics: admitTemporaryAbilityCheckRollModeMechanics,
  discoverCastAct: discoverTemporaryAbilityCheckRollModeCastAct,
  resolve: resolveTemporaryAbilityCheckRollMode,
};
