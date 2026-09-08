import { spellInvocationResourceForCastOption } from "./profile.ts";
import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-feather-fall-mitigation
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FEATHER_FALL_MITIGATION_LIFECYCLE
//
// The fallingCreatureMitigationReaction Spell Procedure Profile: a prepared Reaction spell
// that uses caller-supplied falling-trigger and falling-target witnesses to
// attach per-target Feather Fall mitigation until landing or duration expiry.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Feather Fall": Reaction when the caster or a visible
//     creature within 60 feet falls; range 60 feet; one-minute duration; choose
//     up to five falling creatures; descent slows to 60 feet per round; landing
//     before spell end prevents fall damage and ends the spell for that target.
//   - SRD 5.2.1 Rules Glossary "Falling": landing after a fall deals
//     Bludgeoning damage and imposes Prone unless the creature avoids taking
//     fall damage.
//   - SRD 5.2.1 Rules Glossary "Reaction": a Reaction responds to a trigger
//     defined in the Reaction description.
//   - UBIQUITOUS_LANGUAGE.md: Falling is the environmental hazard; fall damage
//     is acceptable shorthand only for the damage portion.
//
// What stays in shared infrastructure:
//   - Reaction-window discovery and trigger matching in reaction-triggered-spells.ts.
//   - Landing cleanup/projection helpers in spells-active-effects.ts.
//   - The metamagic table entry remains Wave 9 migration work.

import { type ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, PositiveInteger } from "@dnd/shared/types";
import { Match, Schema } from "effect";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";

import {
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { CombatantId } from "../../identity.ts";
import { DurationBattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";
import { snapshotBattle } from "../interrupt-execution.ts";
import { invalidResult } from "../result-helpers.ts";
import { stateAfterSpellCastDeclared } from "../spell-cast-declaration.ts";
import { selectSpellTargetList } from "../spell-target-list-selection.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { completeReactionSpellSlotCast } from "../reaction-spell-resolution.ts";
import { fallingCreatureMitigationReactionSpellMatchesTrigger } from "../reaction-triggered-spells.ts";
import { spendSpellAccessFreeCastResource } from "../spells-resolve-resources.ts";
import { replaceTargetSpellActiveEffect } from "../active-effect-replacement.ts";

import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import type {
  ActivationPhase,
  CastingTime,
  Components,
  Duration,
  EffectAtom,
  FixedDistancePointRange,
  Range,
  ReactionTrigger,
  SpellLevel,
  SpellMechanics,
  TargetSelection,
} from "@dnd/surface/surface/types";
import {
  admitSpellTargetAttachment,
  isSpellCanonicalDurationValue,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildFailedFact,
  spellDurationChildCoordinates,
  spellDurationChildPath,
  spellDurationEvidencePaths,
  spellDurationValueEvidencePaths,
  spellDurationTicksFromCanonicalValue,
  spellMechanicsObjectHasOnlyKeys,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellCanonicalDurationValue,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellMechanicsHeaderPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type FallingCreatureMitigationReactionInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "fallingCreatureMitigationReaction" }
>;
type FallingCreatureMitigationReactionPhase = Extract<
  Extract<
    SpellMechanics,
    { readonly family: "triggered_reaction" }
  >["phases"][number],
  { readonly kind: "direct" }
>;
type FallingCreatureMitigationReactionResolveInput =
  SpellProcedureProfileResolveInput<FallingCreatureMitigationReactionInvocation>;

function admitFallingCreatureMitigationReaction(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: FallingCreatureMitigationReactionMechanicsFacts,
): readonly FallingCreatureMitigationReactionInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly FallingCreatureMitigationReactionInvocation[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "fallingCreatureMitigationReaction",
              spell,
              targeting: {
                kind: "targetList",
                minTargets: 1,
                maxTargets: facts.maxTargets,
              },
              rangeFeet: movementFeet(facts.range.feet),
              activeEffect: {
                kind: "fallingCreatureMitigationReaction",
                sourceCombatantId: ctx.actor.combatantId,
                expiresAt: {
                  kind: "duration",
                  durationTicks: facts.durationTicks,
                },
              },
            },
          ],
  );
}

type FallingCreatureMitigationReactionRange = FixedDistancePointRange;
type FallingCreatureMitigationReactionDuration = Extract<
  Duration,
  { readonly kind: "timed" }
> & {
  readonly value: SpellCanonicalDurationValue & {
    readonly unit: "minute";
    readonly amount: 1;
  };
};
type FallingCreatureMitigationReactionMechanicsFacts = {
  readonly level: SpellLevel;
  readonly range: FallingCreatureMitigationReactionRange;
  readonly durationTicks: ElapsedTimeTicks;
  readonly maxTargets: 5;
};

export const FALLING_CREATURE_MITIGATION_REACTION_FAILED_FACTS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "durationValue",
  "durationExtension",
  "durationEnding",
  "castingTime",
  "interruptsTrigger",
  "phase",
  "phaseCount",
  "phaseOrder",
  "attachment",
  "targetSelection",
  "effects",
  "effect",
] as const;
type FallingCreatureMitigationReactionFailedFact =
  (typeof FALLING_CREATURE_MITIGATION_REACTION_FAILED_FACTS)[number];

type FallingCreatureMitigationReactionMechanicsIssue = {
  readonly failedFact: FallingCreatureMitigationReactionFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

type FallingTargetSelection = Extract<
  TargetSelection,
  {
    readonly mode: "choose_up_to";
    readonly stateFilter: readonly ["falling"];
  }
>;
type FallingReactionCastingTime = Extract<
  CastingTime,
  { readonly kind: "reaction" }
>;
type FallingReactionTrigger = Extract<
  ReactionTrigger,
  { readonly kind: "self_or_visible_creature_falls" }
>;
type FallingComponents = Components & { readonly m: string };
type FallingPhase = Extract<ActivationPhase, { readonly kind: "direct" }>;
type FallingEffect = Extract<
  EffectAtom,
  { readonly kind: "feather_fall_mitigation" }
>;

const FALLING_TARGET_SELECTION_FIELDS = [
  "mode",
  "count",
  "targetKinds",
  "stateFilter",
] as const satisfies ReadonlyArray<keyof FallingTargetSelection>;
const FALLING_RANGE_FIELDS = ["kind", "feet"] as const satisfies ReadonlyArray<
  keyof FallingCreatureMitigationReactionRange
>;
const FALLING_DURATION_FIELDS = [
  "kind",
  "value",
] as const satisfies ReadonlyArray<
  keyof FallingCreatureMitigationReactionDuration
>;
const FALLING_DURATION_VALUE_FIELDS = [
  "unit",
  "amount",
] as const satisfies ReadonlyArray<
  keyof FallingCreatureMitigationReactionDuration["value"]
>;
const FALLING_COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
] as const satisfies ReadonlyArray<keyof FallingComponents>;
const FALLING_CASTING_TIME_FIELDS = [
  "kind",
  "trigger",
] as const satisfies ReadonlyArray<keyof FallingReactionCastingTime>;
const FALLING_TRIGGER_FIELDS = [
  "kind",
  "rangeFeet",
] as const satisfies ReadonlyArray<keyof FallingReactionTrigger>;
const FALLING_PHASE_FIELDS = [
  "kind",
  "attachment",
  "effects",
] as const satisfies ReadonlyArray<keyof FallingPhase>;
const FALLING_EFFECT_FIELDS = [
  "kind",
  "descentRateCapFeetPerRound",
  "landingOutcome",
] as const satisfies ReadonlyArray<keyof FallingEffect>;

function fallingCreatureMitigationReactionIssueResult(
  issue: FallingCreatureMitigationReactionMechanicsIssue,
): {
  readonly tag: "spellProcedureAdmissionIssue";
  readonly procedure: "fallingCreatureMitigationReaction";
  readonly failedFact: FallingCreatureMitigationReactionFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
  readonly message: string;
} {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "fallingCreatureMitigationReaction",
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported fallingCreatureMitigationReaction mechanics fact: ${issue.failedFact}.`,
  };
}

function isFallingRange(
  range: Range,
): range is FallingCreatureMitigationReactionRange {
  return (
    range.kind === "point" &&
    spellMechanicsObjectHasOnlyKeys(range, FALLING_RANGE_FIELDS) &&
    range.feet === 60
  );
}

function isFallingDuration(
  duration: Duration,
): duration is FallingCreatureMitigationReactionDuration {
  return (
    duration.kind === "timed" &&
    spellMechanicsObjectHasOnlyKeys(duration, FALLING_DURATION_FIELDS) &&
    spellMechanicsObjectHasOnlyKeys(
      duration.value,
      FALLING_DURATION_VALUE_FIELDS,
    ) &&
    duration.value.unit === "minute" &&
    duration.value.amount === 1 &&
    isSpellCanonicalDurationValue(duration.value)
  );
}

type FallingTargetSelectionAdmission =
  | {
      readonly tag: "admitted";
      readonly maxTargets: 5;
    }
  | {
      readonly tag: "rejected";
      readonly mechanicsPath: SpellMechanicsBranchPath;
    }
  | { readonly tag: "unavailable" };

function admitFallingTargetSelection(
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
  phase: FallingCreatureMitigationReactionPhase,
): FallingTargetSelectionAdmission {
  const targetAttachment = admitSpellTargetAttachment(
    phase.attachment,
    FALLING_TARGET_SELECTION_FIELDS,
  );
  const mechanicsPath = spellActivationAttachmentPath(phaseOrdinal);
  if (targetAttachment.tag === "rejected") {
    return { tag: "rejected", mechanicsPath };
  }
  const selection = targetAttachment.attachment.value.selection;
  if (selection.mode !== "choose_up_to") {
    return { tag: "rejected", mechanicsPath };
  }
  if (!("stateFilter" in selection) || selection.stateFilter === undefined) {
    return { tag: "rejected", mechanicsPath };
  }
  if (
    ![
      selection.count === 5,
      sameStringSet(selection.targetKinds ?? [], ["creature"]),
      sameStringSet(selection.stateFilter, ["falling"]),
    ].every(Boolean)
  ) {
    return { tag: "rejected", mechanicsPath };
  }
  return { tag: "admitted", maxTargets: 5 };
}

function fallingCreatureMitigationReactionSemanticCandidate(
  mechanics: SpellMechanics,
): boolean {
  return (
    mechanics.family === "triggered_reaction" &&
    (mechanics.phases.some(
      (phase) =>
        phase.kind === "direct" &&
        fallingCreatureMitigationReactionSemanticPhase(phase),
    ) ||
      (mechanics.castingTime.kind === "reaction" &&
        mechanics.castingTime.trigger.kind ===
          "self_or_visible_creature_falls"))
  );
}

function fallingCreatureMitigationReactionSemanticPhase(
  phase: FallingCreatureMitigationReactionPhase,
): boolean {
  return (phase.effects ?? []).some(
    (effect) => effect.kind === "feather_fall_mitigation",
  );
}

function fallingCreatureMitigationReactionDistinctiveHeaderFallback(
  mechanics: SpellMechanics,
): boolean {
  if (mechanics.family !== "triggered_reaction") return false;
  if (mechanics.castingTime.kind !== "reaction") return false;
  if (mechanics.castingTime.trigger.kind !== "self_or_visible_creature_falls")
    return false;
  if (mechanics.range.kind !== "point") return false;
  if (mechanics.duration.kind !== "timed") return false;
  return [
    mechanics.level === 1,
    mechanics.school === "transmutation",
    mechanics.components.v === true,
    mechanics.components.s === false,
    typeof mechanics.components.m === "string",
    mechanics.castingTime.trigger.rangeFeet === 60,
    mechanics.range.feet === 60,
    mechanics.duration.value.unit === "minute",
    mechanics.duration.value.amount === 1,
  ].every(Boolean);
}

function fallingCreatureMitigationReactionMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "triggered_reaction" }>,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
  phase: Extract<
    Extract<
      SpellMechanics,
      { readonly family: "triggered_reaction" }
    >["phases"][number],
    { readonly kind: "direct" }
  >,
): SpellProcedureMechanicsEvidence {
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    ...spellDurationEvidencePaths(mechanics.duration),
    spellActivationPhasePath(phaseOrdinal),
    spellActivationAttachmentPath(phaseOrdinal),
    ...(phase.effects ?? []).map((_effect, index) =>
      spellActivationEffectPath(phaseOrdinal, PositiveInteger(index + 1)),
    ),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

type FallingCreatureMitigationReactionCandidate = {
  readonly mechanics: Extract<
    SpellMechanics,
    { readonly family: "triggered_reaction" }
  >;
  readonly directPhaseIndex: number;
  readonly phaseOrdinal: ReturnType<typeof PositiveInteger>;
  readonly phase: FallingCreatureMitigationReactionPhase | undefined;
  readonly targetSelection: FallingTargetSelectionAdmission;
};

function fallingCreatureMitigationReactionCandidate(
  mechanics: Extract<SpellMechanics, { readonly family: "triggered_reaction" }>,
): FallingCreatureMitigationReactionCandidate {
  const semanticDirectPhaseIndex = mechanics.phases.findIndex(
    (phase) =>
      phase.kind === "direct" &&
      fallingCreatureMitigationReactionSemanticPhase(phase),
  );
  const directPhaseIndex =
    semanticDirectPhaseIndex >= 0
      ? semanticDirectPhaseIndex
      : mechanics.phases.findIndex((phase) => phase.kind === "direct");
  const phaseIndexForInspection = directPhaseIndex >= 0 ? directPhaseIndex : 0;
  const phaseOrdinal = PositiveInteger(phaseIndexForInspection + 1);
  const inspectedPhase = mechanics.phases[phaseIndexForInspection];
  const phase = inspectedPhase?.kind === "direct" ? inspectedPhase : undefined;
  return {
    mechanics,
    directPhaseIndex,
    phaseOrdinal,
    phase,
    targetSelection:
      phase === undefined
        ? { tag: "unavailable" }
        : admitFallingTargetSelection(phaseOrdinal, phase),
  };
}

function fallingComponentsIssues(
  mechanics: FallingCreatureMitigationReactionCandidate["mechanics"],
): readonly FallingCreatureMitigationReactionMechanicsIssue[] {
  const components = mechanics.components;
  return fallingComponentsAreSupported(components)
    ? []
    : [
        {
          failedFact: "components",
          mechanicsPath: spellMechanicsHeaderPath("components"),
        },
        ...spellConsumedMaterialEvidencePaths(components).map(
          (mechanicsPath) => ({
            failedFact: "components" as const,
            mechanicsPath,
          }),
        ),
      ];
}

function fallingComponentsAreSupported(
  components: FallingCreatureMitigationReactionCandidate["mechanics"]["components"],
): boolean {
  return (
    components.v === true &&
    components.s === false &&
    typeof components.m === "string" &&
    spellMechanicsObjectHasOnlyKeys(components, FALLING_COMPONENT_FIELDS) &&
    (!("materialCostGp" in components) ||
      components.materialCostGp === undefined) &&
    (!("materialConsumed" in components) ||
      components.materialConsumed !== true)
  );
}

function fallingDurationIssues(
  duration: Duration,
): readonly FallingCreatureMitigationReactionMechanicsIssue[] {
  if (isFallingDuration(duration)) return [];
  return [
    {
      failedFact: "duration",
      mechanicsPath: spellMechanicsHeaderPath("duration"),
    },
    ...spellDurationValueEvidencePaths(duration).map((mechanicsPath) => ({
      failedFact: "durationValue" as const,
      mechanicsPath,
    })),
    ...spellDurationChildCoordinates(duration).map((child) => ({
      failedFact: spellDurationChildFailedFact(child),
      mechanicsPath: spellDurationChildPath(child),
    })),
  ];
}

function fallingCastingTimeIsSupported(
  mechanics: FallingCreatureMitigationReactionCandidate["mechanics"],
): boolean {
  const castingTime = mechanics.castingTime;
  return (
    castingTime.kind === "reaction" &&
    spellMechanicsObjectHasOnlyKeys(castingTime, FALLING_CASTING_TIME_FIELDS) &&
    castingTime.trigger.kind === "self_or_visible_creature_falls" &&
    spellMechanicsObjectHasOnlyKeys(
      castingTime.trigger,
      FALLING_TRIGGER_FIELDS,
    ) &&
    castingTime.trigger.rangeFeet === 60
  );
}

function fallingHeaderIssues(
  mechanics: FallingCreatureMitigationReactionCandidate["mechanics"],
): readonly FallingCreatureMitigationReactionMechanicsIssue[] {
  return [
    ...(mechanics.level === 1
      ? []
      : [
          {
            failedFact: "level" as const,
            mechanicsPath: spellMechanicsHeaderPath("level"),
          },
        ]),
    ...(mechanics.school === "transmutation"
      ? []
      : [
          {
            failedFact: "school" as const,
            mechanicsPath: spellMechanicsHeaderPath("school"),
          },
        ]),
    ...(isFallingRange(mechanics.range)
      ? []
      : [
          {
            failedFact: "range" as const,
            mechanicsPath: spellMechanicsHeaderPath("range"),
          },
        ]),
    ...fallingComponentsIssues(mechanics),
    ...fallingDurationIssues(mechanics.duration),
    ...(fallingCastingTimeIsSupported(mechanics)
      ? []
      : [
          {
            failedFact: "castingTime" as const,
            mechanicsPath: spellMechanicsHeaderPath("castingTime"),
          },
        ]),
    ...(mechanics.interruptsTrigger === true
      ? []
      : [
          {
            failedFact: "interruptsTrigger" as const,
            mechanicsPath: spellMechanicsHeaderPath("family"),
          },
        ]),
  ];
}

function fallingPhaseCoordinateIssues(
  candidate: FallingCreatureMitigationReactionCandidate,
): readonly FallingCreatureMitigationReactionMechanicsIssue[] {
  const countIssues =
    candidate.mechanics.phases.length === 1
      ? []
      : [
          ...candidate.mechanics.phases.flatMap((_phase, index) =>
            index === candidate.directPhaseIndex
              ? []
              : [
                  {
                    failedFact: "phaseCount" as const,
                    mechanicsPath: spellActivationPhasePath(
                      PositiveInteger(index + 1),
                    ),
                  },
                ],
          ),
          ...(candidate.mechanics.phases.length === 0
            ? [
                {
                  failedFact: "phaseCount" as const,
                  mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
                },
              ]
            : []),
        ];
  const orderIssues =
    candidate.directPhaseIndex < 0
      ? [
          {
            failedFact: "phase" as const,
            mechanicsPath: spellActivationPhasePath(candidate.phaseOrdinal),
          },
        ]
      : candidate.directPhaseIndex === 0
        ? []
        : [
            {
              failedFact: "phaseOrder" as const,
              mechanicsPath: spellActivationPhasePath(candidate.phaseOrdinal),
            },
          ];
  return [...countIssues, ...orderIssues];
}

function fallingEffectIssues(
  phase: FallingCreatureMitigationReactionPhase,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
): readonly FallingCreatureMitigationReactionMechanicsIssue[] {
  const effects = phase.effects ?? [];
  const mitigationIndex = effects.findIndex(
    (effect) => effect.kind === "feather_fall_mitigation",
  );
  const countIssues = fallingEffectCountIssues(
    effects,
    mitigationIndex,
    phaseOrdinal,
  );
  const mitigation = mitigationIndex < 0 ? undefined : effects[mitigationIndex];
  return fallingMitigationIsSupported(mitigation)
    ? countIssues
    : [
        ...countIssues,
        {
          failedFact: "effect",
          mechanicsPath: spellActivationEffectPath(
            phaseOrdinal,
            PositiveInteger(mitigationIndex < 0 ? 1 : mitigationIndex + 1),
          ),
        },
      ];
}

function fallingEffectCountIssues(
  effects: readonly NonNullable<
    FallingCreatureMitigationReactionPhase["effects"]
  >[number][],
  mitigationIndex: number,
  phaseOrdinal: ReturnType<typeof PositiveInteger>,
): readonly FallingCreatureMitigationReactionMechanicsIssue[] {
  return effects.length === 1
    ? []
    : [
        ...(effects.length === 0
          ? [
              {
                failedFact: "effects" as const,
                mechanicsPath: spellActivationEffectPath(
                  phaseOrdinal,
                  PositiveInteger(1),
                ),
              },
            ]
          : []),
        ...effects.flatMap((_effect, index) =>
          index === mitigationIndex
            ? []
            : [
                {
                  failedFact: "effects" as const,
                  mechanicsPath: spellActivationEffectPath(
                    phaseOrdinal,
                    PositiveInteger(index + 1),
                  ),
                },
              ],
        ),
      ];
}

function fallingMitigationIsSupported(
  mitigation:
    | NonNullable<FallingCreatureMitigationReactionPhase["effects"]>[number]
    | undefined,
): boolean {
  return (
    mitigation?.kind === "feather_fall_mitigation" &&
    mitigation.descentRateCapFeetPerRound === 60 &&
    mitigation.landingOutcome === "no_fall_damage_and_end_for_target" &&
    spellMechanicsObjectHasOnlyKeys(mitigation, FALLING_EFFECT_FIELDS)
  );
}

function fallingPhaseContentIssues(
  candidate: FallingCreatureMitigationReactionCandidate,
): readonly FallingCreatureMitigationReactionMechanicsIssue[] {
  if (candidate.phase === undefined) {
    return [
      {
        failedFact: "phase",
        mechanicsPath: spellActivationPhasePath(candidate.phaseOrdinal),
      },
    ];
  }
  return [
    ...(spellMechanicsObjectHasOnlyKeys(candidate.phase, FALLING_PHASE_FIELDS)
      ? []
      : [
          {
            failedFact: "phase" as const,
            mechanicsPath: spellActivationPhasePath(candidate.phaseOrdinal),
          },
        ]),
    ...(candidate.targetSelection.tag === "rejected"
      ? [
          {
            failedFact: "targetSelection" as const,
            mechanicsPath: candidate.targetSelection.mechanicsPath,
          },
        ]
      : []),
    ...fallingEffectIssues(candidate.phase, candidate.phaseOrdinal),
  ];
}

type FallingSupportedProjection = {
  readonly range: FallingCreatureMitigationReactionRange;
  readonly duration: FallingCreatureMitigationReactionDuration;
  readonly phase: FallingCreatureMitigationReactionPhase;
  readonly maxTargets: 5;
};

function fallingSupportedProjection(
  candidate: FallingCreatureMitigationReactionCandidate,
):
  | { readonly tag: "supported"; readonly value: FallingSupportedProjection }
  | {
      readonly tag: "unsupported";
      readonly issue: FallingCreatureMitigationReactionMechanicsIssue;
    } {
  if (!isFallingRange(candidate.mechanics.range)) {
    return {
      tag: "unsupported",
      issue: {
        failedFact: "range",
        mechanicsPath: spellMechanicsHeaderPath("range"),
      },
    };
  }
  if (!isFallingDuration(candidate.mechanics.duration)) {
    return {
      tag: "unsupported",
      issue: {
        failedFact: "duration",
        mechanicsPath: spellMechanicsHeaderPath("duration"),
      },
    };
  }
  if (candidate.phase === undefined) {
    return {
      tag: "unsupported",
      issue: {
        failedFact: "phase",
        mechanicsPath: spellActivationPhasePath(candidate.phaseOrdinal),
      },
    };
  }
  if (candidate.targetSelection.tag !== "admitted") {
    return {
      tag: "unsupported",
      issue: {
        failedFact: "targetSelection",
        mechanicsPath:
          candidate.targetSelection.tag === "rejected"
            ? candidate.targetSelection.mechanicsPath
            : spellActivationAttachmentPath(candidate.phaseOrdinal),
      },
    };
  }
  return {
    tag: "supported",
    value: {
      range: candidate.mechanics.range,
      duration: candidate.mechanics.duration,
      phase: candidate.phase,
      maxTargets: candidate.targetSelection.maxTargets,
    },
  };
}

function admitFallingCreatureMitigationReactionMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "fallingCreatureMitigationReaction",
  FallingCreatureMitigationReactionMechanicsFacts,
  FallingCreatureMitigationReactionInvocation,
  ReturnType<typeof fallingCreatureMitigationReactionIssueResult>
> {
  if (
    !fallingCreatureMitigationReactionSemanticCandidate(source.mechanics) &&
    !fallingCreatureMitigationReactionDistinctiveHeaderFallback(
      source.mechanics,
    )
  ) {
    return { tag: "notRepresented" };
  }
  if (source.mechanics.family !== "triggered_reaction") {
    return { tag: "notRepresented" };
  }
  const candidate = fallingCreatureMitigationReactionCandidate(
    source.mechanics,
  );
  const issues = [
    ...fallingHeaderIssues(candidate.mechanics),
    ...fallingPhaseCoordinateIssues(candidate),
    ...fallingPhaseContentIssues(candidate),
  ];
  const nonEmptyIssues = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (nonEmptyIssues !== undefined) {
    const [first, ...rest] = nonEmptyIssues.map(
      fallingCreatureMitigationReactionIssueResult,
    );
    return { tag: "unsupported", issues: [first, ...rest] };
  }
  const projection = fallingSupportedProjection(candidate);
  if (projection.tag === "unsupported") {
    return {
      tag: "unsupported",
      issues: [fallingCreatureMitigationReactionIssueResult(projection.issue)],
    };
  }
  const facts = {
    level: candidate.mechanics.level,
    range: projection.value.range,
    durationTicks: spellDurationTicksFromCanonicalValue(
      projection.value.duration.value,
    ),
    maxTargets: projection.value.maxTargets,
  } satisfies FallingCreatureMitigationReactionMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "fallingCreatureMitigationReaction",
      facts,
      evidence: fallingCreatureMitigationReactionMechanicsEvidence(
        candidate.mechanics,
        candidate.phaseOrdinal,
        projection.value.phase,
      ),
      admit: (executionSource, ctx) =>
        admitFallingCreatureMitigationReaction(executionSource, ctx, facts),
    },
  };
}

/* v8 ignore start -- @preserve -- Reaction-only profile: Feather Fall candidates are admitted from creature-falls interrupt frames, so ordinary turn discovery must return no acts. */
function discoverFallingCreatureMitigationReactionCastAct(): readonly AvailableBattleAct[] {
  return [];
}
/* v8 ignore stop -- @preserve */

function resolveFallingCreatureMitigationReaction(
  input: FallingCreatureMitigationReactionResolveInput,
): BattleResolutionResult {
  if (
    input.input.frame.trigger !== "creatureFalls" ||
    !fallingCreatureMitigationReactionSpellMatchesTrigger(
      input.invocation,
      input.input.frame,
    )
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "triggered fall arrest requires a matching falling Reaction trigger.",
    );
  }
  const targetSelection = selectSpellTargetList({
    state: input.input.state,
    subject: input.input.subject,
    fills: input.input.fills,
    fillSet: input.fillSet,
    actorId: input.input.subject.reactorId,
    invocation: input.invocation,
    invalidFillMessage:
      "Falling-creature mitigation reaction uses only falling target-list fills.",
  });
  if (targetSelection.tag !== "selected") {
    return targetSelection;
  }
  const castingState = stateAfterSpellCastDeclared({
    state: input.input.state,
    casterId: input.input.subject.reactorId,
    invocation: input.invocation,
  });
  const effected: BattleState = targetSelection.targetIds.reduce(
    (state, targetId) =>
      replaceTargetSpellActiveEffect(state, targetId, () => false, {
        ...input.invocation.activeEffect,
        sourceProcedureRef: input.invocation.sourceProcedureRef,
      }),
    castingState,
  );
  return Match.value(input.invocation.resource).pipe(
    Match.when({ tag: "spellAccessFreeCast" }, ({ resourcePoolRef }) => {
      const resourced = spendSpellAccessFreeCastResource(
        effected,
        input.input.subject.reactorId,
        resourcePoolRef,
        input.invocation,
        input.input.state,
      );
      return resourced.tag === "invalid"
        ? resourced
        : {
            tag: "resolved" as const,
            state: resourced.state,
            snapshot: snapshotBattle(resourced.state),
          };
    }),
    Match.when({ tag: "spellSlot" }, ({ slotLevel }) =>
      completeReactionSpellSlotCast({
        effectedState: effected,
        errorState: input.input.state,
        casterId: input.input.subject.reactorId,
        slotLevel,
      }),
    ),
    Match.exhaustive,
  );
}

const FallingCreatureMitigationReactionInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("fallingCreatureMitigationReaction"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Literal(5),
      }),
      activeEffect: Schema.Struct({
        ...BattleEffectOccurrenceTemplateSchemaFields,
        kind: Schema.Literal("fallingCreatureMitigationReaction"),
        sourceCombatantId: CombatantId,
        expiresAt: DurationBattleActiveEffectExpirationSchema,
      }),
      rangeFeet: MovementFeet,
    }),
  );
export const fallingCreatureMitigationReactionProfile = {
  procedure: "fallingCreatureMitigationReaction",
  executionSchema: FallingCreatureMitigationReactionInvocationSchema,
  admitMechanics: admitFallingCreatureMitigationReactionMechanics,
  discoverCastAct: discoverFallingCreatureMitigationReactionCastAct,
  resolve: resolveFallingCreatureMitigationReaction,
} satisfies SpellProcedureDeclaration<
  "fallingCreatureMitigationReaction",
  FallingCreatureMitigationReactionInvocation,
  FallingCreatureMitigationReactionMechanicsFacts,
  ReturnType<typeof fallingCreatureMitigationReactionIssueResult>
>;
