// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sleep-target-admission
//
// The stagedSaveCondition Spell Procedure Profile: action-time Spell Slot
// casting where creatures chosen in a point-origin Sphere make a Wisdom Saving
// Throw before entering Sleep's two-stage Incapacitated-to-Unconscious
// lifecycle.
//
// RAW anchors:
//   - SRD 5.2.1 Spells: Sleep requires a Wisdom Saving Throw in a 5-foot-radius
//     Sphere, then repeats the save at the end of the target's next turn.
//   - UBIQUITOUS_LANGUAGE.md: Saving Throw, Condition, Unconscious, Magic
//     Action, and Spell Invocation.
import { actionSpellCastCandidate } from "../spell-cast-candidate.ts";

import { MovementFeet, PositiveInteger, movementFeet } from "@dnd/shared/types";
import {
  ElapsedTimeTicksSchema,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import type {
  ActivationPhase,
  EffectAtom,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import {
  SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SpellTargeting,
  type SupportedSpellInvocation,
  type BattleSpellExecutionSource,
} from "../../battle-state-execution.ts";
import type {
  StagedSaveConditionAutomaticSuccessPredicates,
  StagedSaveConditionEscapeAction,
} from "../../procedure-execution/spell-procedure-execution.ts";
import { type CombatantId } from "../../identity.ts";
import { readiedSpellAct } from "../spells-discovery.ts";
import { resolveStagedSaveConditionSpellAct } from "../spells-resolve-save-gates.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellInvocationResourceForCastOption } from "./profile.ts";
import { Match, Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DcSourceSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import {
  admitSpellAreaAttachment,
  isSpellCanonicalDurationValue,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  spellDurationTicksFromCanonicalValue,
  spellProcedureHasRedundantSignature,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  spellHasOnlyNamedFields,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellActivationRepeatPath,
  spellMechanicsHeaderPath,
  spellDurationValuePath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { discoverSpellMetamagicSelections } from "../metamagic-support.ts";
import { spellSavingThrowOutcomeHole } from "../spells-holes-fills.ts";

type StagedSaveConditionSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "stagedSaveCondition" }
>;

type StagedSaveConditionMechanicsFacts = SpellDefinitionRuleFacts & {
  readonly ability: "wis";
  readonly dc: StagedSaveConditionSpellInvocation["dc"];
  readonly targeting: Extract<
    SpellTargeting,
    { readonly kind: "pointOriginSphere" }
  >;
  readonly rangeFeet: MovementFeet;
  readonly durationTicks: ElapsedTimeTicks;
  readonly automaticSuccessPredicates: StagedSaveConditionAutomaticSuccessPredicates;
  readonly escapeAction: StagedSaveConditionEscapeAction;
};

type StagedSaveConditionResolveInput =
  SpellProcedureProfileResolveInput<StagedSaveConditionSpellInvocation>;

type StagedSaveConditionFailedFact =
  | "level"
  | "castingTime"
  | "range"
  | "duration"
  | "durationValue"
  | "durationExtension"
  | "durationEnding"
  | "rootShape"
  | "phaseCount"
  | "phaseOrder"
  | "phaseShape"
  | "phaseAbility"
  | "phaseDc"
  | "phaseAttachment"
  | "phaseAutomaticSuccess"
  | "successOutcome"
  | "failedSaveEffect"
  | "extraFailureEffect"
  | "missingFailureEffect"
  | "missingRepeat"
  | "repeatSave"
  | "extraRepeat"
  | "requiredFacts";

type StagedSaveConditionMechanicsIssue = SpellProcedureAdmissionIssue<
  "stagedSaveCondition",
  StagedSaveConditionFailedFact,
  SpellMechanicsBranchPath
>;

const STAGED_SAVE_CONDITION_FAILED_FACT_MESSAGES = {
  level: "Sleep requires a first-level spell.",
  castingTime: "Sleep requires an action casting time.",
  range: "Sleep requires a 60-foot point range.",
  duration: "Sleep requires one minute of concentration.",
  durationValue: "Sleep requires a one-minute concentration value.",
  durationExtension: "Sleep has an unsupported duration extension.",
  durationEnding: "Sleep has an unsupported duration ending.",
  rootShape: "Sleep has unsupported activation root fields.",
  phaseCount: "Sleep requires exactly one activation phase.",
  phaseOrder: "Sleep's save gate must be the first activation phase.",
  phaseShape: "Sleep has an unsupported save-gate field.",
  phaseAbility: "Sleep requires a Wisdom Saving Throw.",
  phaseDc: "Sleep requires the caster's Spell Save DC.",
  phaseAttachment: "Sleep requires a point-origin 5-foot Sphere.",
  phaseAutomaticSuccess:
    "Sleep has an unsupported automatic-success predicate set.",
  successOutcome: "Sleep requires no successful-save effect.",
  failedSaveEffect: "Sleep has an unsupported failed-save effect bundle.",
  extraFailureEffect: "Sleep has an unsupported additional failed-save effect.",
  missingFailureEffect: "Sleep is missing a required failed-save effect.",
  missingRepeat: "Sleep is missing its required repeat save.",
  repeatSave: "Sleep has an unsupported repeat save.",
  extraRepeat: "Sleep has an unsupported additional repeat save.",
  requiredFacts:
    "Sleep's admitted mechanics did not retain its required facts.",
} as const satisfies Record<StagedSaveConditionFailedFact, string>;

function stagedSaveConditionIssue(
  failedFact: StagedSaveConditionFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): StagedSaveConditionMechanicsIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "stagedSaveCondition",
    failedFact,
    mechanicsPath,
    message: STAGED_SAVE_CONDITION_FAILED_FACT_MESSAGES[failedFact],
  };
}

type SaveGatePhase = Extract<ActivationPhase, { readonly kind: "save_gate" }>;

function stagedSaveConditionRootPhase(phase: ActivationPhase): boolean {
  if (phase.kind !== "save_gate") return false;
  const attachmentValue =
    phase.attachment.kind === "hole" ? phase.attachment.value : null;
  const pointSphereWitness =
    attachmentValue?.kind === "area" &&
    attachmentValue.origin.kind === "point_within_range" &&
    attachmentValue.shape.kind === "sphere" &&
    attachmentValue.shape.radiusFeet ===
      SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET;
  const automaticSuccessWitness =
    phase.autoSuccessIfTarget?.kind === "any" &&
    phase.autoSuccessIfTarget.predicates.some(
      (predicate) => predicate.kind === "does_not_sleep",
    );
  const stagedRepeatWitness =
    phase.repeatSaves?.some(
      (repeatSave) =>
        repeatSave.cadence === "end_of_target_turn" &&
        repeatSave.onFailAgain?.kind === "apply_condition" &&
        repeatSave.onFailAgain.condition === "unconscious",
    ) === true;
  return spellProcedureHasRedundantSignature({
    kind: "oneWitnessMayBeMissing",
    witnesses: [
      pointSphereWitness,
      automaticSuccessWitness,
      stagedRepeatWitness,
    ],
  });
}

function isStagedConditionDuration(
  duration: SpellMechanics["duration"],
): duration is Extract<
  SpellMechanics["duration"],
  { readonly kind: "concentration" }
> & {
  readonly upTo: Extract<
    SpellMechanics["duration"],
    { readonly kind: "concentration" }
  >["upTo"] & {
    readonly amount: PositiveInteger;
  };
} {
  return (
    duration.kind === "concentration" &&
    isSpellCanonicalDurationValue(duration.upTo) &&
    duration.upTo.unit === "minute" &&
    duration.upTo.amount === 1
  );
}

function stagedSaveConditionDurationIssues(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): StagedSaveConditionMechanicsIssue[] {
  const issues: StagedSaveConditionMechanicsIssue[] = [];
  const duration = mechanics.duration;
  if (duration.kind !== "concentration") {
    issues.push(
      stagedSaveConditionIssue(
        "duration",
        spellMechanicsHeaderPath("duration"),
      ),
    );
    return issues;
  }
  if (
    !isStagedConditionDuration(duration) ||
    !isSpellCanonicalDurationValue(duration.upTo) ||
    duration.upTo.unit !== "minute" ||
    duration.upTo.amount !== 1
  ) {
    issues.push(
      stagedSaveConditionIssue("durationValue", spellDurationValuePath()),
    );
  }
  const earlyEnd = duration.earlyEnd ?? [];
  const expectedEndingPresent = earlyEnd[0]?.kind === "target_takes_damage";
  for (const [index, ending] of earlyEnd.entries()) {
    if (index !== 0 || ending.kind !== "target_takes_damage") {
      issues.push(
        stagedSaveConditionIssue(
          "durationEnding",
          spellDurationChildPath({
            branch: "ending",
            ordinal: PositiveInteger(index + 1),
            ending: { kind: "earlyEnd", trigger: ending },
          }),
        ),
      );
    }
  }
  if (!expectedEndingPresent) {
    issues.push(
      stagedSaveConditionIssue(
        "durationEnding",
        // The required ending is absent, so its ordinal is not an authored
        // coordinate. Keep the missing witness on the owned duration header;
        // this also cannot collide with a separately authored permanent
        // ending at the first available ending ordinal.
        spellMechanicsHeaderPath("duration"),
      ),
    );
  }
  if (duration.permanentIfMaintainedFull === true) {
    issues.push(
      stagedSaveConditionIssue(
        "durationEnding",
        spellDurationChildPath({
          branch: "ending",
          ordinal: PositiveInteger(earlyEnd.length + 1),
          ending: { kind: "permanentIfMaintainedFull" },
        }),
      ),
    );
  }
  for (const child of spellDurationChildCoordinates(duration)) {
    if (child.branch === "extension") {
      issues.push(
        stagedSaveConditionIssue(
          "durationExtension",
          spellDurationChildPath(child),
        ),
      );
    }
  }
  return issues;
}

function stagedSaveConditionAutoSuccessSupported(
  value: SaveGatePhase["autoSuccessIfTarget"],
): value is StagedSaveConditionPhaseAutoSuccess {
  if (
    value?.kind !== "any" ||
    value.predicates.length !== 2 ||
    !spellHasOnlyNamedFields(value, ["kind", "predicates"])
  ) {
    return false;
  }
  const doesNotSleep = value.predicates.filter(
    (predicate) =>
      predicate.kind === "does_not_sleep" &&
      spellHasOnlyNamedFields(predicate, ["kind"]),
  );
  const exhaustionImmunity = value.predicates.filter(
    (predicate) =>
      predicate.kind === "has_condition_immunity" &&
      predicate.condition === "exhaustion" &&
      spellHasOnlyNamedFields(predicate, ["kind", "condition"]),
  );
  return doesNotSleep.length === 1 && exhaustionImmunity.length === 1;
}

type StagedSaveConditionPhaseAutoSuccess = {
  readonly kind: "any";
  readonly predicates: readonly [
    { readonly kind: "does_not_sleep" },
    {
      readonly kind: "has_condition_immunity";
      readonly condition: "exhaustion";
    },
  ];
};

type StagedSaveConditionFailureRoleEffect =
  | Extract<EffectAtom, { readonly kind: "apply_condition" }>
  | Extract<EffectAtom, { readonly kind: "target_effect_escape_action" }>;

function stagedSaveConditionFailureRoleEffect(
  effect: EffectAtom,
): StagedSaveConditionFailureRoleEffect | undefined {
  if (
    effect.kind === "apply_condition" &&
    effect.condition === "incapacitated" &&
    spellHasOnlyNamedFields(effect, ["kind", "condition"])
  ) {
    return effect;
  }
  if (
    effect.kind === "target_effect_escape_action" &&
    effect.actor === "another_creature" &&
    effect.cost === "action" &&
    effect.method === "shake_awake" &&
    effect.outcome === "end_current_effect" &&
    spellHasOnlyNamedFields(effect, [
      "kind",
      "actor",
      "cost",
      "method",
      "outcome",
    ])
  ) {
    return effect;
  }
  return undefined;
}

function stagedSaveConditionFailureRole(
  effect: EffectAtom,
): "incapacitated" | "escape" | null {
  const roleEffect = stagedSaveConditionFailureRoleEffect(effect);
  if (roleEffect === undefined) return null;
  return Match.value(roleEffect).pipe(
    Match.when({ kind: "apply_condition" }, () => "incapacitated" as const),
    Match.when(
      { kind: "target_effect_escape_action" },
      () => "escape" as const,
    ),
    Match.exhaustive,
  );
}

function stagedSaveConditionRepeatSupported(
  repeatSave: NonNullable<SaveGatePhase["repeatSaves"]>[number],
): boolean {
  return (
    repeatSave.cadence === "end_of_target_turn" &&
    repeatSave.rollMode === undefined &&
    repeatSave.onSuccess === "ends_on_target" &&
    repeatSave.onFailAgain?.kind === "apply_condition" &&
    repeatSave.onFailAgain.condition === "unconscious" &&
    spellHasOnlyNamedFields(repeatSave, [
      "cadence",
      "onSuccess",
      "onFailAgain",
    ]) &&
    spellHasOnlyNamedFields(repeatSave.onFailAgain, ["kind", "condition"])
  );
}

function stagedSaveConditionMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phase: SaveGatePhase,
): SpellProcedureMechanicsEvidence {
  const effects = phase.onFail.kind === "composite" ? phase.onFail.effects : [];
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    ...spellDurationEvidencePaths(mechanics.duration),
    spellActivationPhasePath(PositiveInteger(1)),
    spellActivationAttachmentPath(PositiveInteger(1)),
    ...effects.map((_effect, index) =>
      spellActivationEffectPath(PositiveInteger(1), PositiveInteger(index + 1)),
    ),
    ...(phase.repeatSaves ?? []).map((_repeat, index) =>
      spellActivationRepeatPath(PositiveInteger(1), PositiveInteger(index + 1)),
    ),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

function admitStagedSaveConditionMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "stagedSaveCondition",
  StagedSaveConditionMechanicsFacts,
  StagedSaveConditionSpellInvocation,
  StagedSaveConditionMechanicsIssue
> {
  if (source.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const phaseIndex = mechanics.phases.findIndex(stagedSaveConditionRootPhase);
  if (phaseIndex < 0) {
    return { tag: "notRepresented" };
  }
  const phase = mechanics.phases[phaseIndex];
  if (phase?.kind !== "save_gate") {
    return { tag: "notRepresented" };
  }
  const issues: StagedSaveConditionMechanicsIssue[] = [];
  const push = (
    failedFact: StagedSaveConditionFailedFact,
    path: SpellMechanicsBranchPath,
  ): void => {
    issues.push(stagedSaveConditionIssue(failedFact, path));
  };
  if (mechanics.level !== 1) push("level", spellMechanicsHeaderPath("level"));
  if (
    mechanics.castingTime.kind !== "action" ||
    !spellHasOnlyNamedFields(mechanics.castingTime, ["kind"])
  ) {
    push("castingTime", spellMechanicsHeaderPath("castingTime"));
  }
  if (
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== 60 ||
    !spellHasOnlyNamedFields(mechanics.range, ["kind", "feet"])
  ) {
    push("range", spellMechanicsHeaderPath("range"));
  }
  issues.push(...stagedSaveConditionDurationIssues(mechanics));
  if (
    !spellHasOnlyNamedFields(mechanics, [
      "level",
      "school",
      "range",
      "components",
      "duration",
      "castingTime",
      "family",
      "phases",
    ])
  ) {
    push("rootShape", spellMechanicsHeaderPath("family"));
  }
  if (mechanics.phases.length !== 1) {
    for (const [index] of mechanics.phases.entries()) {
      if (index !== phaseIndex) {
        push(
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(index + 1)),
        );
      }
    }
    if (mechanics.phases.length < 1) {
      push("phaseCount", spellActivationPhasePath(PositiveInteger(1)));
    }
  }
  if (phaseIndex !== 0) {
    push(
      "phaseOrder",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
  }
  if (
    !spellHasOnlyNamedFields(phase, [
      "kind",
      "attachment",
      "ability",
      "dc",
      "onFail",
      "onSuccess",
      "repeatSaves",
      "autoSuccessIfTarget",
    ])
  ) {
    push(
      "phaseShape",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
  }
  if (phase.ability !== "wis") {
    push(
      "phaseAbility",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
  }
  if (
    phase.dc.kind !== "caster_spell_save_dc" ||
    !spellHasOnlyNamedFields(phase.dc, ["kind"])
  ) {
    push("phaseDc", spellActivationPhasePath(PositiveInteger(phaseIndex + 1)));
  }
  const areaAdmission = admitSpellAreaAttachment(phase.attachment, [], []);
  const admittedArea =
    areaAdmission.tag === "admitted" ? areaAdmission.attachment : null;
  const areaValue =
    admittedArea?.kind === "hole"
      ? admittedArea.value
      : admittedArea?.kind === "area"
        ? admittedArea
        : null;
  const attachmentSupported =
    admittedArea?.kind === "hole" &&
    areaValue !== null &&
    areaValue.origin.kind === "point_within_range" &&
    spellHasOnlyNamedFields(areaValue.origin, ["kind"]) &&
    areaValue.shape.kind === "sphere" &&
    spellHasOnlyNamedFields(areaValue.shape, ["kind", "radiusFeet"]) &&
    typeof areaValue.shape.radiusFeet === "number" &&
    areaValue.shape.radiusFeet === SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET;
  if (!attachmentSupported) {
    push(
      "phaseAttachment",
      spellActivationAttachmentPath(PositiveInteger(phaseIndex + 1)),
    );
  }
  if (
    phase.onSuccess.kind !== "none" ||
    !spellHasOnlyNamedFields(phase.onSuccess, ["kind"])
  ) {
    push(
      "successOutcome",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
  }
  if (!stagedSaveConditionAutoSuccessSupported(phase.autoSuccessIfTarget)) {
    push(
      "phaseAutomaticSuccess",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
  }
  const failureEffects =
    phase.onFail.kind === "composite" ? phase.onFail.effects : [];
  if (
    phase.onFail.kind !== "composite" ||
    !spellHasOnlyNamedFields(phase.onFail, ["kind", "effects"])
  ) {
    push(
      "failedSaveEffect",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
  } else {
    const roles = new Set<string>();
    for (const [index, effect] of failureEffects.entries()) {
      const role = stagedSaveConditionFailureRole(effect);
      if (role === null || roles.has(role)) {
        push(
          "extraFailureEffect",
          spellActivationEffectPath(
            PositiveInteger(phaseIndex + 1),
            PositiveInteger(index + 1),
          ),
        );
      } else {
        roles.add(role);
      }
    }
    const missingRoles = (["incapacitated", "escape"] as const).filter(
      (role) => !roles.has(role),
    );
    if (missingRoles.length > 0) {
      push(
        "missingFailureEffect",
        spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
      );
    }
  }
  const repeatSaves = phase.repeatSaves ?? [];
  const supportedRepeatIndexes = repeatSaves.flatMap((repeat, index) =>
    stagedSaveConditionRepeatSupported(repeat) ? [index] : [],
  );
  for (const [index, repeat] of repeatSaves.entries()) {
    if (
      !stagedSaveConditionRepeatSupported(repeat) ||
      index !== supportedRepeatIndexes[0]
    ) {
      push(
        index === 0 && supportedRepeatIndexes.length === 0
          ? "repeatSave"
          : "extraRepeat",
        spellActivationRepeatPath(
          PositiveInteger(phaseIndex + 1),
          PositiveInteger(index + 1),
        ),
      );
    }
  }
  if (supportedRepeatIndexes.length === 0) {
    push(
      "missingRepeat",
      spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
    );
  }
  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (nonEmptyIssues !== undefined) {
    const [first, ...rest] = nonEmptyIssues;
    return {
      tag: "unsupported",
      issues: [
        stagedSaveConditionIssue(first.failedFact, first.mechanicsPath),
        ...rest.map((issue) =>
          stagedSaveConditionIssue(issue.failedFact, issue.mechanicsPath),
        ),
      ],
    };
  }
  if (
    !isStagedConditionDuration(mechanics.duration) ||
    areaValue === null ||
    areaValue.shape.kind !== "sphere" ||
    typeof areaValue.shape.radiusFeet !== "number" ||
    phase.autoSuccessIfTarget?.kind !== "any"
  ) {
    return {
      tag: "unsupported",
      issues: [
        stagedSaveConditionIssue(
          "requiredFacts",
          spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
        ),
      ],
    };
  }
  const rangeFeet =
    mechanics.range.kind === "point" && typeof mechanics.range.feet === "number"
      ? movementFeet(mechanics.range.feet)
      : null;
  if (rangeFeet === null) {
    return {
      tag: "unsupported",
      issues: [
        stagedSaveConditionIssue(
          "requiredFacts",
          spellMechanicsHeaderPath("range"),
        ),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    ability: "wis" as const,
    dc: phase.dc,
    targeting: {
      kind: "pointOriginSphere" as const,
      radiusFeet: movementFeet(areaValue.shape.radiusFeet),
    },
    rangeFeet,
    durationTicks: spellDurationTicksFromCanonicalValue(
      mechanics.duration.upTo,
    ),
    automaticSuccessPredicates: [
      { kind: "doesNotSleep" as const },
      { kind: "conditionImmunity" as const, condition: "exhaustion" as const },
    ],
    escapeAction: {
      kind: "endCurrentEffect" as const,
      actor: "anotherCreature" as const,
      cost: "action" as const,
      method: "shakeAwake" as const,
    },
  } satisfies StagedSaveConditionMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "stagedSaveCondition",
      facts,
      evidence: stagedSaveConditionMechanicsEvidence(mechanics, phase),
      admit: (executionSource: BattleSpellExecutionSource, ctx) =>
        stagedSaveConditionInvocationsFromFacts(
          executionSource,
          facts,
          ctx.spellCastOptions,
        ),
    },
  };
}

function stagedSaveConditionInvocationsFromFacts(
  spell: BattleSpellExecutionSource,
  facts: StagedSaveConditionMechanicsFacts,
  castOptions: SpellAdmissionContext["spellCastOptions"],
): readonly StagedSaveConditionSpellInvocation[] {
  return castOptions.flatMap(
    (slot): readonly StagedSaveConditionSpellInvocation[] =>
      Number(slot.spellLevel) < Number(facts.level)
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "stagedSaveCondition",
              spell,
              ability: facts.ability,
              dc: facts.dc,
              targeting: facts.targeting,
              rangeFeet: facts.rangeFeet,
              durationTicks: facts.durationTicks,
              automaticSuccessPredicates: facts.automaticSuccessPredicates,
              escapeAction: facts.escapeAction,
            },
          ],
  );
}

function discoverStagedSaveConditionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<StagedSaveConditionSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  const initialHole = spellSavingThrowOutcomeHole(state, actorId, invocation);
  const baseCastAct = actionSpellCastCandidate(
    actorId,
    invocation.sourceProcedureRef,
    [initialHole],
  );
  const metamagicCastActs =
    actor === undefined
      ? []
      : discoverSpellMetamagicSelections({ actor, invocation }).map(
          (metamagic) => {
            return {
              ...baseCastAct,
              subject: {
                ...baseCastAct.subject,
                metamagic,
              },
              initialHoles: [
                spellSavingThrowOutcomeHole(state, actorId, invocation),
              ],
            };
          },
        );
  const castActs = [baseCastAct, ...metamagicCastActs];
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function resolveStagedSaveCondition(
  input: StagedSaveConditionResolveInput,
): BattleResolutionResult {
  return resolveStagedSaveConditionSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

const StagedSaveConditionInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("stagedSaveCondition"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    ability: Schema.Literal("wis"),
    dc: DcSourceSchema,
    durationTicks: ElapsedTimeTicksSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("pointOriginSphere"),
      radiusFeet: MovementFeet,
    }),
    rangeFeet: MovementFeet,
    automaticSuccessPredicates: Schema.Tuple([
      Schema.Struct({ kind: Schema.Literal("doesNotSleep") }),
      Schema.Struct({
        kind: Schema.Literal("conditionImmunity"),
        condition: Schema.Literal("exhaustion"),
      }),
    ]),
    escapeAction: Schema.Struct({
      kind: Schema.Literal("endCurrentEffect"),
      actor: Schema.Literal("anotherCreature"),
      cost: Schema.Literal("action"),
      method: Schema.Literal("shakeAwake"),
    }),
  }),
);
export const stagedSaveConditionProfile = {
  procedure: "stagedSaveCondition",
  executionSchema: StagedSaveConditionInvocationSchema,
  admitMechanics: admitStagedSaveConditionMechanics,
  discoverCastAct: discoverStagedSaveConditionCastAct,
  resolve: resolveStagedSaveCondition,
} satisfies SpellProcedureDeclaration<
  "stagedSaveCondition",
  StagedSaveConditionSpellInvocation
>;
