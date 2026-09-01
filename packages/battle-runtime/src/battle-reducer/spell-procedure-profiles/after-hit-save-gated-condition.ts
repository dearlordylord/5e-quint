import { optionalProperty } from "../../optional-property.ts";
import type { SupportedSpellInvocation } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-after-hit-restraint-turn-start-damage
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS
//
// The afterHitSaveGatedCondition Spell Procedure Profile: a Bonus Action spell
// cast immediately after a qualifying weapon hit, forcing a Saving Throw before
// applying a Concentration condition with start-turn damage and an escape check.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-E-L.md "Ensnaring Strike":
//     Bonus Action immediately after hitting a creature with a weapon; Self;
//     Concentration up to 1 minute; target makes a Strength Saving Throw with
//     Advantage if Large or larger; failed save applies Restrained; Restrained
//     target takes Piercing damage at the start of each turn and can be freed
//     by a Strength (Athletics) check.
//   - SRD 5.2.1 Playing the Game "Saving Throws", "Making an Attack", and
//     "Damage Rolls".
//   - SRD 5.2.1 Rules Glossary "Concentration", "Restrained [Condition]",
//     and "Saving Throw".
//   - UBIQUITOUS_LANGUAGE.md: Rider, Bonus Action, Saving Throw, Restrained,
//     Concentration, Spell Slot, and Spell Invocation.
//
// What stays in shared infrastructure:
//   - The attack-hit interrupt checkpoint and eligibility orchestration stay in
//     dispatcher.ts until the after-hit rider family migrates together.
//   - The metamagic table entry remains Wave 9 migration work.

import { DamageTypeSchema, DiceExprSchema } from "@dnd/surface/surface/schema";
import type { BattleInterruptTrigger } from "../../battle-interrupt-triggers.ts";
import {
  type AvailableBattleAct,
  type BattleCreatureState,
  type BattleFill,
  type BattleResolutionInputForSubject,
  type BattleResolutionResult,
  type BattleSpellSavingThrowOutcomeValue,
} from "../../battle-state-execution.ts";
import { snapshotBattle } from "../dispatcher.ts";
import type { BattleSubject } from "../../battle-subjects.ts";
import { type CombatantId } from "../../identity.ts";
import { afterHitSaveGatedConditionSavingThrowOutcomeHole } from "../after-hit-save-gated-condition-hole.ts";
import {
  maybeOpenInterruptWindow,
  maybeOpenPostCastReadySpellCastWindow,
  maybeOpenSpellCastInterruptWindowWithTriggeredSpellChoices,
} from "../interrupt-execution.ts";
import { spellReplayContinuation } from "../spell-reaction-continuation.ts";

import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastInterruptFrame } from "../spell-cast-interrupt-frame.ts";
import {
  applyFailedSaveSpellConditionEffects,
  selectFailedSaveConditionEffect,
} from "../spells-active-effects.ts";
import { spellFillSet, type SpellFillSet } from "../spells-resolve-fill-set.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import { spellActTurnResourceAvailable } from "../spell-turn-resources.ts";
import type {
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import type {
  SpellMechanicsAdmissionSource,
  SpellProcedureMechanicsFacts,
  SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellDurationEndingPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { PositiveInteger } from "@dnd/shared/types";
import {
  AbilitySchema,
  DcSourceSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { CONDITIONS as ALL_CONDITIONS } from "@dnd/shared/types";

type AfterHitSaveGatedConditionInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "afterHitSaveGatedCondition" }
>;
type AttackHitBonusActionSpellCommandSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: "castAttackHitBonusActionSpell";
  }
>;
type AfterHitSaveGatedConditionBattleResolutionInput =
  BattleResolutionInputForSubject<AttackHitBonusActionSpellCommandSubject> & {
    readonly target: BattleCreatureState;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  };
type AfterHitSaveGatedConditionFillSet = Extract<
  SpellFillSet,
  { readonly tag: "ok" }
>;
type AfterHitSaveGatedConditionResolveInput =
  SpellProcedureProfileResolveInput<AfterHitSaveGatedConditionInvocation>;

export const AFTER_HIT_SAVE_GATED_CONDITION_FAILED_FACTS = [
  "level",
  "range",
  "duration",
  "attachment",
  "initialPhase",
  "saveGate",
  "escape",
  "operationCount",
  "operationTrigger",
  "operationOrder",
  "operationEffect",
] as const;
type AfterHitSaveGatedConditionFailedFact =
  (typeof AFTER_HIT_SAVE_GATED_CONDITION_FAILED_FACTS)[number];

type AfterHitSaveGatedConditionMechanicsIssue = {
  readonly failedFact: AfterHitSaveGatedConditionFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

function afterHitSaveGatedConditionMechanicsIssue(
  failedFact: AfterHitSaveGatedConditionMechanicsIssue["failedFact"],
  mechanicsPath: SpellMechanicsBranchPath,
): AfterHitSaveGatedConditionMechanicsIssue {
  return { failedFact, mechanicsPath };
}

function afterHitSaveGatedConditionIssueResult(
  issue: AfterHitSaveGatedConditionMechanicsIssue,
): {
  readonly tag: "spellProcedureAdmissionIssue";
  readonly procedure: "afterHitSaveGatedCondition";
  readonly failedFact: AfterHitSaveGatedConditionFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
  readonly message: string;
} {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "afterHitSaveGatedCondition",
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported afterHitSaveGatedCondition mechanics fact: ${issue.failedFact}.`,
  };
}

type AfterHitSaveGatedConditionNonEmptyIssues = readonly [
  AfterHitSaveGatedConditionMechanicsIssue,
  ...AfterHitSaveGatedConditionMechanicsIssue[],
];

function afterHitSaveGatedConditionIssueKey(
  failedFact: AfterHitSaveGatedConditionFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): string {
  return JSON.stringify([failedFact, mechanicsPath.nodes]);
}

function afterHitSaveGatedConditionUniqueIssues(
  issues: readonly AfterHitSaveGatedConditionMechanicsIssue[],
): readonly AfterHitSaveGatedConditionMechanicsIssue[] {
  const issueKeys = new Set<string>();
  return issues.filter((issue) => {
    const key = afterHitSaveGatedConditionIssueKey(
      issue.failedFact,
      issue.mechanicsPath,
    );
    if (issueKeys.has(key)) return false;
    issueKeys.add(key);
    return true;
  });
}

function afterHitSaveGatedConditionWithMandatoryEscape(
  issues: readonly AfterHitSaveGatedConditionMechanicsIssue[],
  escapeIssue: AfterHitSaveGatedConditionMechanicsIssue,
): AfterHitSaveGatedConditionNonEmptyIssues {
  const [firstIssue, ...remainingIssues] = issues;
  return firstIssue === undefined
    ? [escapeIssue]
    : [firstIssue, ...remainingIssues, escapeIssue];
}

function admitAfterHitSaveGatedConditionMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "afterHitSaveGatedCondition",
  SpellProcedureMechanicsFacts,
  AfterHitSaveGatedConditionInvocation,
  ReturnType<typeof afterHitSaveGatedConditionIssueResult>
> {
  if (source.mechanics.family !== "ongoing_effect") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const castingTime = mechanics.castingTime;
  if (castingTime.kind !== "bonus_action") {
    return { tag: "notRepresented" };
  }
  const trigger = castingTime.trigger;
  const initialPhase = mechanics.initialPhase;
  const operation = mechanics.operations.find(
    (candidate) => candidate.effect.kind === "damage",
  );
  if (
    trigger?.kind !== "after_hit_with" ||
    trigger.attack !== "weapon" ||
    initialPhase?.kind !== "save_gate" ||
    operation?.effect.kind !== "damage"
  ) {
    return { tag: "notRepresented" };
  }
  // The Surface Ensnaring Strike graph does not author its Strength
  // (Athletics) escape action. Keeping this mandatory issue prevents the
  // execution closure from claiming a mechanic that was not admitted.
  const escapeIssue = afterHitSaveGatedConditionMechanicsIssue(
    "escape",
    spellOngoingInitialPhasePath(),
  );
  const issues: AfterHitSaveGatedConditionMechanicsIssue[] = [];
  const issueKeys = new Set<string>();
  const pushIssue = (
    failedFact: AfterHitSaveGatedConditionMechanicsIssue["failedFact"],
    mechanicsPath: SpellMechanicsBranchPath,
  ): void => {
    const key = afterHitSaveGatedConditionIssueKey(failedFact, mechanicsPath);
    if (issueKeys.has(key)) return;
    issueKeys.add(key);
    issues.push(
      afterHitSaveGatedConditionMechanicsIssue(failedFact, mechanicsPath),
    );
  };
  if (mechanics.level !== 1) {
    pushIssue("level", spellMechanicsHeaderPath("level"));
  }
  if (mechanics.range.kind !== "self") {
    pushIssue("range", spellMechanicsHeaderPath("range"));
  }
  if (mechanics.duration.kind !== "concentration") {
    pushIssue("duration", spellMechanicsHeaderPath("duration"));
  } else {
    if (
      mechanics.duration.upTo.unit !== "minute" ||
      mechanics.duration.upTo.amount !== 1
    ) {
      pushIssue("duration", spellDurationValuePath());
    }
    for (const [index] of (mechanics.duration.earlyEnd ?? []).entries()) {
      pushIssue(
        "duration",
        spellDurationEndingPath(PositiveInteger(index + 1)),
      );
    }
    if (mechanics.duration.permanentIfMaintainedFull === true) {
      pushIssue(
        "duration",
        spellDurationEndingPath(
          PositiveInteger((mechanics.duration.earlyEnd?.length ?? 0) + 1),
        ),
      );
    }
  }
  if (
    mechanics.attachment.kind !== "hole" ||
    mechanics.attachment.value.kind !== "target" ||
    mechanics.attachment.value.selection.mode !== "one"
  ) {
    pushIssue("attachment", spellOngoingAttachmentPath());
  }
  if (
    initialPhase.attachment.kind !== "hole" ||
    initialPhase.attachment.value.kind !== "target" ||
    initialPhase.attachment.value.selection.mode !== "one" ||
    initialPhase.ability !== "str" ||
    initialPhase.dc.kind !== "caster_spell_save_dc" ||
    initialPhase.onFail.kind !== "apply_condition" ||
    initialPhase.onFail.condition !== "restrained" ||
    initialPhase.onSuccess.kind !== "end_current_effect"
  ) {
    pushIssue("saveGate", spellOngoingInitialPhasePath());
  }
  const operationIndex = mechanics.operations.findIndex(
    (candidate) => candidate.effect.kind === "damage",
  );
  if (mechanics.operations.length !== 1) {
    if (mechanics.operations.length === 0) {
      pushIssue(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(1)),
      );
    }
    for (const [index] of mechanics.operations.entries()) {
      if (index === operationIndex) continue;
      pushIssue(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 1)),
      );
    }
  }
  if (operation.trigger.kind !== "on_attached_turn_start") {
    pushIssue(
      "operationTrigger",
      spellOngoingOperationPath(PositiveInteger(operationIndex + 1)),
    );
  } else if (operationIndex !== 0) {
    pushIssue(
      "operationOrder",
      spellOngoingOperationPath(PositiveInteger(operationIndex + 1)),
    );
  }
  if (
    operation.effect.damageType !== "piercing" ||
    operation.effect.amount === undefined
  ) {
    pushIssue(
      "operationEffect",
      spellOngoingOperationEffectPath(PositiveInteger(operationIndex + 1)),
    );
  }
  const unsupportedIssues = afterHitSaveGatedConditionWithMandatoryEscape(
    afterHitSaveGatedConditionUniqueIssues(issues),
    escapeIssue,
  );
  const [firstIssue, ...remainingIssues] = unsupportedIssues;
  return {
    tag: "unsupported",
    issues: [
      afterHitSaveGatedConditionIssueResult(firstIssue),
      ...remainingIssues.map(afterHitSaveGatedConditionIssueResult),
    ],
  };
}

function discoverAfterHitSaveGatedConditionCastAct(): readonly AvailableBattleAct[] {
  return [];
}

function resolveAfterHitSaveGatedCondition(
  input: AfterHitSaveGatedConditionResolveInput,
): BattleResolutionResult {
  const fillValidation = afterHitSaveGatedConditionFillSet(
    input.input,
    input.invocation,
    input.input.target,
    input.fillSet,
  );
  if (fillValidation.tag === "invalid") {
    return fillValidation.result;
  }
  if (
    !spellActTurnResourceAvailable(
      input.input.state.currentTurnResources,
      input.input.subject.casterId,
      input.invocation,
    )
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Attack-hit Bonus Action spell is no longer available for this turn.",
    );
  }

  const spellCastFrame = spellCastInterruptFrame({
    casterId: input.input.subject.casterId,
    invocation: input.invocation,
    targetIds: [input.input.target.combatantId],
    reactionSpellTargetFacts: fillValidation.fillSet.reactionSpellTargetFacts,
    castingResource: { kind: "bonusAction" },
    continuation: spellReplayContinuation(input.input),
  });
  const spellCastReactionWindow =
    maybeOpenSpellCastInterruptWindowWithTriggeredSpellChoices(
      input.input.state,
      spellCastFrame,
      input.input.handledInterruptTrigger,
    );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const savingThrowHole = afterHitSaveGatedConditionSavingThrowOutcomeHole(
    input.input.state,
    input.input.subject.casterId,
    input.input.target,
    input.invocation,
  );
  if (fillValidation.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }

  const failedTargets = fillValidation.fillSet.savingThrowOutcomes.outcomes[0]!
    .succeeded
    ? []
    : [input.input.target.combatantId];
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: input.input.target.combatantId,
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
    actorId: input.input.subject.casterId,
    invocation: input.invocation,
    errorState: input.input.state,
    startConcentration: failedTargets.length > 0,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const selectedEffect = selectFailedSaveConditionEffect(
    input.invocation.effect,
    null,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (selectedEffect.tag !== "selected") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Readied save-gate condition spell requires a fixed failed-save condition effect.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const effected = applyFailedSaveSpellConditionEffects(
    resourced.state,
    input.input.subject.casterId,
    failedTargets,
    input.invocation,
    selectedEffect.effect,
  );
  const readiedSpellCastReactionWindow = maybeOpenPostCastReadySpellCastWindow({
    state: effected,
    subject: input.input.subject,
    casterId: input.input.subject.casterId,
    sourceProcedureRef: input.invocation.sourceProcedureRef,
    spellProcedure: input.invocation.procedure,
    targetIds: [input.input.target.combatantId],
    ...optionalProperty(
      "handledInterruptTrigger",
      input.input.handledInterruptTrigger,
    ),
  });
  if (readiedSpellCastReactionWindow !== null) {
    return readiedSpellCastReactionWindow;
  }
  return {
    tag: "resolved",
    state: effected,
    snapshot: snapshotBattle(effected),
  };
}

function afterHitSaveGatedConditionFillSet(
  input: AfterHitSaveGatedConditionBattleResolutionInput,
  invocation: AfterHitSaveGatedConditionResolveInput["invocation"],
  target: BattleCreatureState,
  fills: readonly BattleFill[],
):
  | {
      readonly tag: "ok";
      readonly fillSet: AfterHitSaveGatedConditionFillSet;
    }
  | {
      readonly tag: "invalid";
      readonly result: Extract<
        BattleResolutionResult,
        { readonly tag: "invalid" }
      >;
    } {
  const fillSet = spellFillSet(
    fills,
    invocation,
    input.subject.procedureRef,
    input.subject.actorId,
    input.state,
  );
  /* v8 ignore start -- @preserve -- Malformed fill set: the discovered after-hit spell subject forwards only fills for its own typed holes, so generic spell-fill parser rejection is defensive. */
  if (fillSet.tag === "invalid") {
    return {
      tag: "invalid",
      result: invalidResult(input.state, "invalidFill", fillSet.message),
    };
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed fill set: this procedure discovers only a single Saving Throw outcome hole; targeting, attack, damage, healing, and lifecycle fills contradict that contract. */
  if (
    fillSet.targetId !== undefined ||
    fillSet.targetList !== undefined ||
    fillSet.targetAllocation !== undefined ||
    fillSet.attackRoll !== undefined ||
    fillSet.damageRoll !== undefined ||
    fillSet.attackBurstDamageRoll !== undefined ||
    fillSet.healingRoll !== undefined ||
    fillSet.concentrationSavingThrows.length > 0 ||
    fillSet.damageDispositions.length > 0 ||
    fillSet.spellDamageReductionRolls.length > 0
  ) {
    return {
      tag: "invalid",
      result: invalidResult(
        input.state,
        "invalidFill",
        "Attack-hit save-gated condition spells only use Saving Throw outcome fills.",
      ),
    };
  }
  /* v8 ignore stop -- @preserve */
  if (fillSet.savingThrowOutcomes === undefined) {
    return { tag: "ok", fillSet };
  }
  const validation = validateAfterHitSaveGatedConditionSavingThrowOutcome(
    fillSet.savingThrowOutcomes,
    target.combatantId,
  );
  /* v8 ignore start -- @preserve -- Malformed saving-throw witness: discovery fixes the triggering hit target and does not request area facts; the admitted outcome path remains measured. */
  return validation === null
    ? { tag: "ok", fillSet }
    : {
        tag: "invalid",
        result: invalidResult(input.state, "invalidFill", validation),
      };
  /* v8 ignore stop -- @preserve */
}

/* v8 ignore start -- @preserve -- Malformed saving-throw validator: the after-hit hole adapter fixes single-target cardinality, identity, and absence of area facts before resolution. */
function validateAfterHitSaveGatedConditionSavingThrowOutcome(
  value: BattleSpellSavingThrowOutcomeValue,
  targetId: CombatantId,
): string | null {
  if ("area" in value) {
    return "Single-target save-gate spell outcomes must not include area facts.";
  }
  return value.outcomes.length === 1 && value.outcomes[0]?.targetId === targetId
    ? null
    : "Single-target save-gate spell Saving Throw outcome must match the triggering hit target.";
}
/* v8 ignore stop -- @preserve */

const AfterHitSaveGatedConditionInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("afterHitSaveGatedCondition"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("bonusAction"),
      ability: AbilitySchema,
      dc: DcSourceSchema,
      targeting: Schema.Struct({ kind: Schema.Literal("singleCombatant") }),
      effect: Schema.Struct({
        kind: Schema.Literal("fixed"),
        condition: Schema.Literals(ALL_CONDITIONS),
        expiresAt: Schema.Literal("concentration"),
        escape: Schema.Struct({
          kind: Schema.Literal("abilityCheck"),
          ability: Schema.Literal("str"),
          skill: Schema.Literal("athletics"),
          allowedActor: Schema.Literal("targetOrCreatureWithinReach"),
          successEnds: Schema.Literal("spell"),
        }),
        turnStartDamage: Schema.Struct({
          expr: DiceExprSchema,
          damageType: DamageTypeSchema,
        }),
        repeatSave: Schema.Null,
      }),
    }),
  );
export const afterHitSaveGatedConditionProfile = {
  procedure: "afterHitSaveGatedCondition",
  executionSchema: AfterHitSaveGatedConditionInvocationSchema,
  admitMechanics: admitAfterHitSaveGatedConditionMechanics,
  discoverCastAct: discoverAfterHitSaveGatedConditionCastAct,
  resolve: resolveAfterHitSaveGatedCondition,
} satisfies SpellProcedureDeclaration<
  "afterHitSaveGatedCondition",
  AfterHitSaveGatedConditionInvocation
>;
