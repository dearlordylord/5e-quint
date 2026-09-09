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
  Attachment,
  EffectAtom,
  SpellMechanics,
} from "@dnd/surface/surface/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SpellTargeting,
  type SupportedSpellInvocation,
  type BattleSpellExecutionSource,
} from "../../battle-state-execution.ts";
import {
  StagedSaveConditionAutomaticSuccessPredicatesSchema,
  StagedSaveConditionEscapeActionSchema,
  type StagedSaveConditionAutomaticSuccessPredicates,
  type StagedSaveConditionEscapeAction,
} from "../../procedure-execution/spell-procedure-execution.ts";
import {
  STAGED_SAVE_CONDITION_AUTHORED_FACTS,
  STAGED_SAVE_CONDITION_EXECUTION_FACTS,
  STAGED_SAVE_CONDITION_FAILURE_ROLES,
} from "../domain-constants.ts";
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
  spellMechanicsRootPath,
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
  readonly ability: typeof STAGED_SAVE_CONDITION_EXECUTION_FACTS.ability;
  readonly dc: StagedSaveConditionSpellInvocation["dc"];
  readonly targeting: Extract<
    SpellTargeting,
    {
      readonly kind: typeof STAGED_SAVE_CONDITION_EXECUTION_FACTS.targeting.kind;
    }
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
  UnitMechanicsPath
>;

const STAGED_SAVE_CONDITION_FAILED_FACT_MESSAGES = {
  level:
    "The hit-point-budget condition procedure requires a first-level spell.",
  castingTime:
    "The hit-point-budget condition procedure requires an action casting time.",
  range:
    "The hit-point-budget condition procedure requires a 60-foot point range.",
  duration:
    "The hit-point-budget condition procedure requires one minute of concentration.",
  durationValue:
    "The hit-point-budget condition procedure requires a one-minute concentration value.",
  durationExtension:
    "The hit-point-budget condition procedure has an unsupported duration extension.",
  durationEnding:
    "The hit-point-budget condition procedure has an unsupported duration ending.",
  rootShape:
    "The hit-point-budget condition procedure has unsupported activation root fields.",
  phaseCount:
    "The hit-point-budget condition procedure requires exactly one activation phase.",
  phaseOrder:
    "The hit-point-budget condition procedure's save gate must be the first activation phase.",
  phaseShape:
    "The hit-point-budget condition procedure has an unsupported save-gate field.",
  phaseAbility:
    "The hit-point-budget condition procedure requires a Wisdom Saving Throw.",
  phaseDc:
    "The hit-point-budget condition procedure requires the caster's Spell Save DC.",
  phaseAttachment:
    "The hit-point-budget condition procedure requires a point-origin 5-foot Sphere.",
  phaseAutomaticSuccess:
    "The hit-point-budget condition procedure has an unsupported automatic-success predicate set.",
  successOutcome:
    "The hit-point-budget condition procedure requires no successful-save effect.",
  failedSaveEffect:
    "The hit-point-budget condition procedure has an unsupported failed-save effect bundle.",
  extraFailureEffect:
    "The hit-point-budget condition procedure has an unsupported additional failed-save effect.",
  missingFailureEffect:
    "The hit-point-budget condition procedure is missing a required failed-save effect.",
  missingRepeat:
    "The hit-point-budget condition procedure is missing its required repeat save.",
  repeatSave:
    "The hit-point-budget condition procedure has an unsupported repeat save.",
  extraRepeat:
    "The hit-point-budget condition procedure has an unsupported additional repeat save.",
  requiredFacts:
    "The hit-point-budget condition procedure's admitted mechanics did not retain its required facts.",
} as const satisfies Record<StagedSaveConditionFailedFact, string>;

function stagedSaveConditionIssue(
  failedFact: StagedSaveConditionFailedFact,
  mechanicsPath: UnitMechanicsPath,
): StagedSaveConditionMechanicsIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "stagedSaveCondition",
    failedFact,
    mechanicsPath,
    message: STAGED_SAVE_CONDITION_FAILED_FACT_MESSAGES[failedFact],
  };
}

type SaveGatePhase = Extract<
  ActivationPhase,
  { readonly kind: typeof STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.kind }
>;

type StagedSaveConditionPhaseWitnesses = Readonly<{
  pointSphereAttachment: boolean;
  hitPointBudgetAutomaticSuccess: boolean;
  stagedRepeatSave: boolean;
}>;

const EMPTY_STAGED_SAVE_CONDITION_PHASE_WITNESSES: StagedSaveConditionPhaseWitnesses =
  {
    pointSphereAttachment: false,
    hitPointBudgetAutomaticSuccess: false,
    stagedRepeatSave: false,
  };

function stagedSaveConditionPointSphereWitness(phase: SaveGatePhase): boolean {
  if (phase.attachment.kind !== "hole") return false;
  const attachment = phase.attachment.value;
  return (
    attachment.kind === "area" &&
    attachment.origin.kind ===
      STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.areaOriginKind &&
    attachment.shape.kind ===
      STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.areaShapeKind &&
    attachment.shape.radiusFeet ===
      STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.radiusFeet
  );
}

function stagedSaveConditionAutomaticSuccessWitness(
  phase: SaveGatePhase,
): boolean {
  const expected =
    STAGED_SAVE_CONDITION_AUTHORED_FACTS.automaticSuccessPredicates;
  return (
    phase.autoSuccessIfTarget?.kind === expected.kind &&
    phase.autoSuccessIfTarget.predicates.some(
      (predicate) => predicate.kind === expected.predicates[0].kind,
    )
  );
}

function stagedSaveConditionRepeatWitness(phase: SaveGatePhase): boolean {
  const expected = STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.repeat;
  return (
    phase.repeatSaves?.some(
      (repeatSave) =>
        repeatSave.cadence === expected.cadence &&
        repeatSave.onFailAgain?.kind === expected.onFailAgain.kind &&
        repeatSave.onFailAgain.condition === expected.onFailAgain.condition,
    ) === true
  );
}

function stagedSaveConditionPhaseWitnesses(
  phase: ActivationPhase,
): StagedSaveConditionPhaseWitnesses {
  if (phase.kind !== STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.kind) {
    return EMPTY_STAGED_SAVE_CONDITION_PHASE_WITNESSES;
  }
  return {
    pointSphereAttachment: stagedSaveConditionPointSphereWitness(phase),
    hitPointBudgetAutomaticSuccess:
      stagedSaveConditionAutomaticSuccessWitness(phase),
    stagedRepeatSave: stagedSaveConditionRepeatWitness(phase),
  };
}

function stagedSaveConditionRootPhase(phase: ActivationPhase): boolean {
  const witnesses = stagedSaveConditionPhaseWitnesses(phase);
  return spellProcedureHasRedundantSignature({
    kind: "oneWitnessMayBeMissing",
    witnesses: [
      {
        name: "pointSphereAttachment",
        present: witnesses.pointSphereAttachment,
      },
      {
        name: "hitPointBudgetAutomaticSuccess",
        present: witnesses.hitPointBudgetAutomaticSuccess,
      },
      { name: "stagedRepeatSave", present: witnesses.stagedRepeatSave },
    ],
  });
}

function stagedSaveConditionPhaseBoundaryCompatible(
  phase: ActivationPhase | undefined,
): boolean {
  if (phase === undefined) return true;
  const witnesses = stagedSaveConditionPhaseWitnesses(phase);
  return (
    witnesses.pointSphereAttachment ||
    witnesses.hitPointBudgetAutomaticSuccess ||
    witnesses.stagedRepeatSave
  );
}

function stagedSaveConditionHeaderSignature(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): boolean {
  return spellProcedureHasRedundantSignature({
    kind: "oneWitnessMayBeMissing",
    witnesses: [
      {
        name: "levelAndCastingTime",
        present:
          mechanics.level === STAGED_SAVE_CONDITION_AUTHORED_FACTS.level &&
          mechanics.castingTime.kind ===
            STAGED_SAVE_CONDITION_AUTHORED_FACTS.castingTimeKind,
      },
      {
        name: "range",
        present:
          mechanics.range.kind ===
            STAGED_SAVE_CONDITION_AUTHORED_FACTS.range.kind &&
          mechanics.range.feet ===
            STAGED_SAVE_CONDITION_AUTHORED_FACTS.range.feet,
      },
      {
        name: "duration",
        present: isStagedConditionDuration(mechanics.duration),
      },
    ],
  });
}

function stagedSaveConditionRootShape(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): boolean {
  if (mechanics.phases.some(stagedSaveConditionRootPhase)) return true;
  if (mechanics.phases.length > 1) return false;
  return (
    stagedSaveConditionPhaseBoundaryCompatible(mechanics.phases[0]) &&
    stagedSaveConditionHeaderSignature(mechanics)
  );
}

function isStagedConditionDuration(
  duration: SpellMechanics["duration"],
): duration is Extract<
  SpellMechanics["duration"],
  { readonly kind: typeof STAGED_SAVE_CONDITION_AUTHORED_FACTS.duration.kind }
> & {
  readonly upTo: Extract<
    SpellMechanics["duration"],
    {
      readonly kind: typeof STAGED_SAVE_CONDITION_AUTHORED_FACTS.duration.kind;
    }
  >["upTo"] & {
    readonly amount: PositiveInteger;
  };
} {
  return (
    duration.kind === STAGED_SAVE_CONDITION_AUTHORED_FACTS.duration.kind &&
    isSpellCanonicalDurationValue(duration.upTo) &&
    duration.upTo.unit === STAGED_SAVE_CONDITION_AUTHORED_FACTS.duration.unit &&
    duration.upTo.amount ===
      STAGED_SAVE_CONDITION_AUTHORED_FACTS.duration.amount
  );
}

type StagedSaveConditionDuration = Extract<
  SpellMechanics["duration"],
  { readonly kind: typeof STAGED_SAVE_CONDITION_AUTHORED_FACTS.duration.kind }
>;

function stagedSaveConditionDurationValueIssues(
  duration: StagedSaveConditionDuration,
): StagedSaveConditionMechanicsIssue[] {
  return isStagedConditionDuration(duration)
    ? []
    : [stagedSaveConditionIssue("durationValue", spellDurationValuePath())];
}

function stagedSaveConditionEndingIssues(
  duration: StagedSaveConditionDuration,
): StagedSaveConditionMechanicsIssue[] {
  const earlyEnd = duration.earlyEnd ?? [];
  const expectedKind =
    STAGED_SAVE_CONDITION_AUTHORED_FACTS.duration.earlyEndKind;
  const authoredIssues = earlyEnd.flatMap((ending, index) =>
    index === 0 && ending.kind === expectedKind
      ? []
      : [
          stagedSaveConditionIssue(
            "durationEnding",
            spellDurationChildPath({
              branch: "ending",
              ordinal: PositiveInteger(index + 1),
              ending: { kind: "earlyEnd", trigger: ending },
            }),
          ),
        ],
  );
  const missingIssue =
    earlyEnd[0]?.kind === expectedKind
      ? []
      : [
          stagedSaveConditionIssue(
            "durationEnding",
            spellMechanicsHeaderPath("duration"),
          ),
        ];
  const permanentIssue =
    duration.permanentIfMaintainedFull === true
      ? [
          stagedSaveConditionIssue(
            "durationEnding",
            spellDurationChildPath({
              branch: "ending",
              ordinal: PositiveInteger(earlyEnd.length + 1),
              ending: { kind: "permanentIfMaintainedFull" },
            }),
          ),
        ]
      : [];
  return [...authoredIssues, ...missingIssue, ...permanentIssue];
}

function stagedSaveConditionDurationExtensionIssues(
  duration: StagedSaveConditionDuration,
): StagedSaveConditionMechanicsIssue[] {
  return spellDurationChildCoordinates(duration).flatMap((child) =>
    child.branch === "extension"
      ? [
          stagedSaveConditionIssue(
            "durationExtension",
            spellDurationChildPath(child),
          ),
        ]
      : [],
  );
}

function stagedSaveConditionDurationIssues(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): StagedSaveConditionMechanicsIssue[] {
  const duration = mechanics.duration;
  if (duration.kind !== STAGED_SAVE_CONDITION_AUTHORED_FACTS.duration.kind) {
    return [
      stagedSaveConditionIssue(
        "duration",
        spellMechanicsHeaderPath("duration"),
      ),
    ];
  }
  return [
    ...stagedSaveConditionDurationValueIssues(duration),
    ...stagedSaveConditionEndingIssues(duration),
    ...stagedSaveConditionDurationExtensionIssues(duration),
  ];
}

function stagedSaveConditionAutoSuccessSupported(
  value: SaveGatePhase["autoSuccessIfTarget"],
): boolean {
  if (
    value?.kind !==
      STAGED_SAVE_CONDITION_AUTHORED_FACTS.automaticSuccessPredicates.kind ||
    value.predicates.length !==
      STAGED_SAVE_CONDITION_AUTHORED_FACTS.automaticSuccessPredicates.predicates
        .length ||
    !spellHasOnlyNamedFields(value, ["kind", "predicates"])
  ) {
    return false;
  }
  const doesNotSleep = value.predicates.filter(
    (predicate) =>
      predicate.kind ===
        STAGED_SAVE_CONDITION_AUTHORED_FACTS.automaticSuccessPredicates
          .predicates[0].kind && spellHasOnlyNamedFields(predicate, ["kind"]),
  );
  const exhaustionImmunity = value.predicates.filter(
    (predicate) =>
      predicate.kind ===
        STAGED_SAVE_CONDITION_AUTHORED_FACTS.automaticSuccessPredicates
          .predicates[1].kind &&
      predicate.condition ===
        STAGED_SAVE_CONDITION_AUTHORED_FACTS.automaticSuccessPredicates
          .predicates[1].condition &&
      spellHasOnlyNamedFields(predicate, ["kind", "condition"]),
  );
  return doesNotSleep.length === 1 && exhaustionImmunity.length === 1;
}

type StagedSaveConditionFailureConditionEffect = Extract<
  EffectAtom,
  {
    readonly kind: typeof STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.failureEffects.condition.kind;
  }
> & {
  readonly condition: typeof STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.failureEffects.condition.condition;
};

type StagedSaveConditionFailureEscapeEffect = Extract<
  EffectAtom,
  {
    readonly kind: typeof STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.failureEffects.escape.kind;
  }
> & {
  readonly actor: typeof STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.failureEffects.escape.actor;
  readonly cost: typeof STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.failureEffects.escape.cost;
  readonly method: typeof STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.failureEffects.escape.method;
  readonly outcome: typeof STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.failureEffects.escape.outcome;
};

type StagedSaveConditionFailureRoleEffect =
  | StagedSaveConditionFailureConditionEffect
  | StagedSaveConditionFailureEscapeEffect;

function isStagedSaveConditionFailureCondition(
  effect: EffectAtom,
): effect is StagedSaveConditionFailureConditionEffect {
  const expected =
    STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.failureEffects.condition;
  return (
    effect.kind === expected.kind &&
    effect.condition === expected.condition &&
    spellHasOnlyNamedFields(effect, ["kind", "condition"])
  );
}

function isStagedSaveConditionFailureEscape(
  effect: EffectAtom,
): effect is StagedSaveConditionFailureEscapeEffect {
  const expected =
    STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.failureEffects.escape;
  return (
    effect.kind === expected.kind &&
    effect.actor === expected.actor &&
    effect.cost === expected.cost &&
    effect.method === expected.method &&
    effect.outcome === expected.outcome &&
    spellHasOnlyNamedFields(effect, [
      "kind",
      "actor",
      "cost",
      "method",
      "outcome",
    ])
  );
}

function stagedSaveConditionFailureRoleEffect(
  effect: EffectAtom,
): StagedSaveConditionFailureRoleEffect | undefined {
  if (isStagedSaveConditionFailureCondition(effect)) {
    return effect;
  }
  if (isStagedSaveConditionFailureEscape(effect)) {
    return effect;
  }
  return undefined;
}

function stagedSaveConditionFailureRole(
  effect: EffectAtom,
): (typeof STAGED_SAVE_CONDITION_FAILURE_ROLES)[number] | null {
  const roleEffect = stagedSaveConditionFailureRoleEffect(effect);
  if (roleEffect === undefined) return null;
  return Match.value(roleEffect).pipe(
    Match.when(
      {
        kind: STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.failureEffects
          .condition.kind,
      },
      () => STAGED_SAVE_CONDITION_FAILURE_ROLES[0],
    ),
    Match.when(
      {
        kind: STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.failureEffects.escape
          .kind,
      },
      () => STAGED_SAVE_CONDITION_FAILURE_ROLES[1],
    ),
    Match.exhaustive,
  );
}

function stagedSaveConditionRepeatSupported(
  repeatSave: NonNullable<SaveGatePhase["repeatSaves"]>[number],
): boolean {
  return (
    repeatSave.cadence ===
      STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.repeat.cadence &&
    repeatSave.rollMode === undefined &&
    repeatSave.onSuccess ===
      STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.repeat.onSuccess &&
    repeatSave.onFailAgain?.kind ===
      STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.repeat.onFailAgain.kind &&
    repeatSave.onFailAgain.condition ===
      STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.repeat.onFailAgain.condition &&
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
  const effects =
    phase.onFail.kind === STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.failureKind
      ? phase.onFail.effects
      : [];
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

type StagedSaveConditionInspection = SpellProcedureMechanicsInspection<
  "stagedSaveCondition",
  StagedSaveConditionMechanicsFacts,
  StagedSaveConditionSpellInvocation,
  StagedSaveConditionMechanicsIssue
>;

function stagedSaveConditionHeaderIssues(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): StagedSaveConditionMechanicsIssue[] {
  const issues: StagedSaveConditionMechanicsIssue[] = [];
  if (mechanics.level !== STAGED_SAVE_CONDITION_AUTHORED_FACTS.level)
    issues.push(
      stagedSaveConditionIssue("level", spellMechanicsHeaderPath("level")),
    );
  if (
    mechanics.castingTime.kind !==
      STAGED_SAVE_CONDITION_AUTHORED_FACTS.castingTimeKind ||
    !spellHasOnlyNamedFields(mechanics.castingTime, ["kind"])
  )
    issues.push(
      stagedSaveConditionIssue(
        "castingTime",
        spellMechanicsHeaderPath("castingTime"),
      ),
    );
  if (
    mechanics.range.kind !== STAGED_SAVE_CONDITION_AUTHORED_FACTS.range.kind ||
    mechanics.range.feet !== STAGED_SAVE_CONDITION_AUTHORED_FACTS.range.feet ||
    !spellHasOnlyNamedFields(mechanics.range, ["kind", "feet"])
  )
    issues.push(
      stagedSaveConditionIssue("range", spellMechanicsHeaderPath("range")),
    );
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
  )
    issues.push(
      stagedSaveConditionIssue("rootShape", spellMechanicsHeaderPath("family")),
    );
  return issues;
}

function stagedSaveConditionPhasePlacementIssues(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phaseIndex: number,
): StagedSaveConditionMechanicsIssue[] {
  const issues: StagedSaveConditionMechanicsIssue[] = [];
  if (mechanics.phases.length !== 1) {
    for (const [index] of mechanics.phases.entries()) {
      if (index === phaseIndex) continue;
      issues.push(
        stagedSaveConditionIssue(
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(index + 1)),
        ),
      );
    }
    if (mechanics.phases.length < 1)
      issues.push(
        stagedSaveConditionIssue("phaseCount", spellMechanicsRootPath()),
      );
  }
  if (phaseIndex !== 0)
    issues.push(
      stagedSaveConditionIssue(
        "phaseOrder",
        spellActivationPhasePath(PositiveInteger(phaseIndex + 1)),
      ),
    );
  return issues;
}

type StagedSaveConditionArea = Extract<Attachment, { readonly kind: "area" }>;
type StagedSaveConditionRequiredArea = Readonly<{
  radiusFeet: number;
}>;
type StagedSaveConditionAttachmentInspection = Readonly<{
  area: StagedSaveConditionArea | null;
  supported: boolean;
}>;

function stagedSaveConditionAttachmentInspection(
  phase: SaveGatePhase,
): StagedSaveConditionAttachmentInspection {
  const admission = admitSpellAreaAttachment(phase.attachment, [], []);
  if (admission.tag === "rejected") return { area: null, supported: false };
  const admittedArea = admission.attachment;
  const area = admittedArea.kind === "hole" ? admittedArea.value : admittedArea;
  return {
    area,
    supported: stagedSaveConditionAttachmentSupported(admittedArea.kind, area),
  };
}

function stagedSaveConditionAttachmentSupported(
  attachmentKind: "area" | "hole",
  area: StagedSaveConditionArea,
): boolean {
  if (attachmentKind !== "hole") return false;
  if (
    area.origin.kind !==
    STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.areaOriginKind
  )
    return false;
  if (
    area.shape.kind !== STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.areaShapeKind
  )
    return false;
  return [
    spellHasOnlyNamedFields(area.origin, ["kind"]),
    spellHasOnlyNamedFields(area.shape, ["kind", "radiusFeet"]),
    typeof area.shape.radiusFeet === "number",
    area.shape.radiusFeet ===
      STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.radiusFeet,
  ].every(Boolean);
}

function stagedSaveConditionPhaseIssues(
  phase: SaveGatePhase,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
  attachmentSupported: boolean,
): StagedSaveConditionMechanicsIssue[] {
  const path = spellActivationPhasePath(phaseOrdinal);
  const issues: StagedSaveConditionMechanicsIssue[] = [];
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
  )
    issues.push(stagedSaveConditionIssue("phaseShape", path));
  if (phase.ability !== STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.ability)
    issues.push(stagedSaveConditionIssue("phaseAbility", path));
  if (
    phase.dc.kind !== STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.dcKind ||
    !spellHasOnlyNamedFields(phase.dc, ["kind"])
  )
    issues.push(stagedSaveConditionIssue("phaseDc", path));
  if (!attachmentSupported)
    issues.push(
      stagedSaveConditionIssue(
        "phaseAttachment",
        spellActivationAttachmentPath(phaseOrdinal),
      ),
    );
  issues.push(...stagedSaveConditionOutcomeIssues(phase, path));
  return issues;
}

function stagedSaveConditionOutcomeIssues(
  phase: SaveGatePhase,
  path: UnitMechanicsPath,
): StagedSaveConditionMechanicsIssue[] {
  const issues: StagedSaveConditionMechanicsIssue[] = [];
  if (
    phase.onSuccess.kind !==
      STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.successKind ||
    !spellHasOnlyNamedFields(phase.onSuccess, ["kind"])
  )
    issues.push(stagedSaveConditionIssue("successOutcome", path));
  if (!stagedSaveConditionAutoSuccessSupported(phase.autoSuccessIfTarget))
    issues.push(stagedSaveConditionIssue("phaseAutomaticSuccess", path));
  return issues;
}

function stagedSaveConditionFailureIssues(
  phase: SaveGatePhase,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
): StagedSaveConditionMechanicsIssue[] {
  const path = spellActivationPhasePath(phaseOrdinal);
  if (
    phase.onFail.kind !==
      STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.failureKind ||
    !spellHasOnlyNamedFields(phase.onFail, ["kind", "effects"])
  )
    return [stagedSaveConditionIssue("failedSaveEffect", path)];
  const issues: StagedSaveConditionMechanicsIssue[] = [];
  const roles = new Set<string>();
  for (const [index, effect] of phase.onFail.effects.entries()) {
    const role = stagedSaveConditionFailureRole(effect);
    if (role === null || roles.has(role))
      issues.push(
        stagedSaveConditionIssue(
          "extraFailureEffect",
          spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
        ),
      );
    else roles.add(role);
  }
  if (STAGED_SAVE_CONDITION_FAILURE_ROLES.some((role) => !roles.has(role)))
    issues.push(stagedSaveConditionIssue("missingFailureEffect", path));
  return issues;
}

function stagedSaveConditionRepeatIssues(
  phase: SaveGatePhase,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
): StagedSaveConditionMechanicsIssue[] {
  const repeatSaves = phase.repeatSaves ?? [];
  const supportedIndexes = repeatSaves.flatMap((repeat, index) =>
    stagedSaveConditionRepeatSupported(repeat) ? [index] : [],
  );
  const issues: StagedSaveConditionMechanicsIssue[] = [];
  for (const [index, repeat] of repeatSaves.entries()) {
    if (
      !stagedSaveConditionRepeatSupported(repeat) ||
      index !== supportedIndexes[0]
    )
      issues.push(
        stagedSaveConditionIssue(
          index === 0 && supportedIndexes.length === 0
            ? "repeatSave"
            : "extraRepeat",
          spellActivationRepeatPath(phaseOrdinal, PositiveInteger(index + 1)),
        ),
      );
  }
  if (supportedIndexes.length === 0)
    issues.push(
      stagedSaveConditionIssue(
        "missingRepeat",
        spellActivationPhasePath(phaseOrdinal),
      ),
    );
  return issues;
}

function stagedSaveConditionUnsupportedRequiredFacts(
  path: UnitMechanicsPath,
): Extract<StagedSaveConditionInspection, { readonly tag: "unsupported" }> {
  return {
    tag: "unsupported",
    issues: [stagedSaveConditionIssue("requiredFacts", path)],
  };
}

function stagedSaveConditionRequiredArea(
  phase: SaveGatePhase,
  area: StagedSaveConditionArea | null,
): StagedSaveConditionRequiredArea | null {
  if (area === null) return null;
  if (
    area.shape.kind !== STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.areaShapeKind
  )
    return null;
  if (typeof area.shape.radiusFeet !== "number") return null;
  if (
    phase.autoSuccessIfTarget?.kind !==
    STAGED_SAVE_CONDITION_AUTHORED_FACTS.automaticSuccessPredicates.kind
  )
    return null;
  return { radiusFeet: area.shape.radiusFeet };
}

function stagedSaveConditionSupportedInspection(
  source: SpellMechanicsAdmissionSource,
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
  phase: SaveGatePhase,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
  area: StagedSaveConditionArea | null,
): StagedSaveConditionInspection {
  if (!isStagedConditionDuration(mechanics.duration))
    return stagedSaveConditionUnsupportedRequiredFacts(
      spellActivationPhasePath(phaseOrdinal),
    );
  const requiredArea = stagedSaveConditionRequiredArea(phase, area);
  if (requiredArea === null)
    return stagedSaveConditionUnsupportedRequiredFacts(
      spellActivationPhasePath(phaseOrdinal),
    );
  if (mechanics.range.kind !== STAGED_SAVE_CONDITION_AUTHORED_FACTS.range.kind)
    return stagedSaveConditionUnsupportedRequiredFacts(
      spellMechanicsHeaderPath("range"),
    );
  if (typeof mechanics.range.feet !== "number")
    return stagedSaveConditionUnsupportedRequiredFacts(
      spellMechanicsHeaderPath("range"),
    );
  const facts = {
    ...source.spellDefinitionRuleFacts,
    ability: STAGED_SAVE_CONDITION_EXECUTION_FACTS.ability,
    dc: phase.dc,
    targeting: {
      kind: STAGED_SAVE_CONDITION_EXECUTION_FACTS.targeting.kind,
      radiusFeet: movementFeet(requiredArea.radiusFeet),
    },
    rangeFeet: movementFeet(mechanics.range.feet),
    durationTicks: spellDurationTicksFromCanonicalValue(
      mechanics.duration.upTo,
    ),
    automaticSuccessPredicates:
      STAGED_SAVE_CONDITION_EXECUTION_FACTS.automaticSuccessPredicates,
    escapeAction: STAGED_SAVE_CONDITION_EXECUTION_FACTS.escapeAction,
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

function admitStagedSaveConditionMechanics(
  source: SpellMechanicsAdmissionSource,
): StagedSaveConditionInspection {
  if (source.mechanics.family !== "activation") {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  if (!stagedSaveConditionRootShape(mechanics)) {
    return { tag: "notRepresented" };
  }
  const representedPhaseIndex = mechanics.phases.findIndex(
    stagedSaveConditionRootPhase,
  );
  const phaseIndex = representedPhaseIndex < 0 ? 0 : representedPhaseIndex;
  const phase = mechanics.phases[phaseIndex];
  const issues = [
    ...stagedSaveConditionHeaderIssues(mechanics),
    ...stagedSaveConditionPhasePlacementIssues(mechanics, phaseIndex),
  ];
  const phaseOrdinal = PositiveInteger(phaseIndex + 1);
  if (phase?.kind !== STAGED_SAVE_CONDITION_AUTHORED_FACTS.phase.kind) {
    const nonEmptyIssues = spellProcedureNonEmpty(
      spellUniqueMechanicsIssues(issues),
    );
    return {
      tag: "unsupported",
      issues: nonEmptyIssues ?? [
        stagedSaveConditionIssue("requiredFacts", spellMechanicsRootPath()),
      ],
    };
  }
  const attachment = stagedSaveConditionAttachmentInspection(phase);
  issues.push(
    ...stagedSaveConditionPhaseIssues(
      phase,
      phaseOrdinal,
      attachment.supported,
    ),
    ...stagedSaveConditionFailureIssues(phase, phaseOrdinal),
    ...stagedSaveConditionRepeatIssues(phase, phaseOrdinal),
  );
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
  return stagedSaveConditionSupportedInspection(
    source,
    mechanics,
    phase,
    phaseOrdinal,
    attachment.area,
  );
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
    ability: Schema.Literal(STAGED_SAVE_CONDITION_EXECUTION_FACTS.ability),
    dc: DcSourceSchema,
    durationTicks: ElapsedTimeTicksSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal(
        STAGED_SAVE_CONDITION_EXECUTION_FACTS.targeting.kind,
      ),
      radiusFeet: MovementFeet,
    }),
    rangeFeet: MovementFeet,
    automaticSuccessPredicates:
      StagedSaveConditionAutomaticSuccessPredicatesSchema,
    escapeAction: StagedSaveConditionEscapeActionSchema,
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
