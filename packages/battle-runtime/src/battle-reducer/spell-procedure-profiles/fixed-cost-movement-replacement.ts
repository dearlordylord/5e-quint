import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import { spellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-jump-movement-replacement
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.JUMP_MOVEMENT_REPLACEMENT_LIFECYCLE
//
// The fixedCostMovementReplacement Spell Procedure Profile: a prepared Bonus Action
// spell that attaches a one-minute, once-on-each-target-turn movement spend
// replacement to touched willing creatures.
//
// RAW anchors:
//   - SRD 5.2.1 Spells "Jump": Bonus Action, Touch, 1 minute; one willing
//     creature can jump up to 30 feet by spending 10 feet of Movement once on
//     each of its turns; higher slots add one target per slot level above 1.
//   - SRD 5.2.1 Rules Glossary "Long Jump": each foot jumped costs a foot of
//     Movement, and landing in Difficult Terrain can impose Prone after a
//     failed DC 10 Dexterity (Acrobatics) check.
//   - UBIQUITOUS_LANGUAGE.md: Speed is capacity; Movement is consumption.

import {
  PositiveInteger,
  movementFeet,
  spellSlotLevel,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import type {
  SpellMechanics,
  TargetSelection,
} from "@dnd/surface/surface/types";

import {
  type BattleSpellExecutionSource,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import { CombatantId } from "../../identity.ts";
import { DurationBattleActiveEffectExpirationSchema } from "../../active-effect/codecs.ts";

import { replaceAllocatedTargetSpellActiveEffects } from "../active-effect-replacement.ts";
import { selectSpellTargetList } from "../spell-target-list-selection.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import { spellTargetListHole } from "../spells-targeting.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellInvocationResourceForCastOption } from "./profile.ts";
import {
  admitSpellTargetAttachment,
  isSpellCanonicalDurationValue,
  spellDurationChildCoordinates,
  spellDurationChildPath,
  spellDurationTicksFromCanonicalValue,
  spellProcedureNonEmpty,
  spellTouchRangeFeet,
  spellConsumedMaterialEvidencePaths,
  type SpellCanonicalDurationValue,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { Schema } from "effect";
import { BattleEffectOccurrenceTemplateSchemaFields } from "../../active-effect/template-codec.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type FixedCostMovementReplacementInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "fixedCostMovementReplacement" }
>;

const FIXED_COST_MOVEMENT_REPLACEMENT_TARGET_SELECTION_FIELDS = [
  "mode",
  "targetKinds",
  "disposition",
  "count",
] as const;
type FixedCostMovementReplacementResolveInput =
  SpellProcedureProfileResolveInput<FixedCostMovementReplacementInvocation>;

type FixedCostMovementReplacementTargetCountFacts = {
  readonly base: PositiveInteger;
  readonly baseLevel: SpellSlotLevel;
  readonly perSlotAboveBase: PositiveInteger;
};
type FixedCostMovementReplacementMechanicsFacts = Omit<
  SpellDefinitionRuleFacts,
  "range" | "duration"
> & {
  readonly range: Extract<
    SpellDefinitionRuleFacts["range"],
    {
      readonly kind: "touch";
    }
  >;
  readonly duration: Extract<
    SpellDefinitionRuleFacts["duration"],
    { readonly kind: "timed" }
  > & { readonly value: SpellCanonicalDurationValue };
  readonly durationTicks: ElapsedTimeTicks;
  readonly targetCount: FixedCostMovementReplacementTargetCountFacts;
  readonly movementCostFeet: ReturnType<typeof movementFeet>;
  readonly maxJumpDistanceFeet: ReturnType<typeof movementFeet>;
};

export const FIXED_COST_MOVEMENT_REPLACEMENT_FAILED_FACTS = [
  "level",
  "castingTime",
  "range",
  "duration",
  "durationExtension",
  "durationEnding",
  "phaseCount",
  "attachment",
  "targetCount",
  "effects",
  "movementReplacement",
] as const;
type FixedCostMovementReplacementFailedFact =
  (typeof FIXED_COST_MOVEMENT_REPLACEMENT_FAILED_FACTS)[number];

type FixedCostMovementReplacementIssue = {
  readonly failedFact: FixedCostMovementReplacementFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

type FixedCostMovementReplacementInspection = SpellProcedureMechanicsInspection<
  "fixedCostMovementReplacement",
  FixedCostMovementReplacementMechanicsFacts,
  FixedCostMovementReplacementInvocation,
  ReturnType<typeof fixedCostMovementReplacementIssueResult>
>;

function fixedCostMovementReplacementIssue(
  failedFact: FixedCostMovementReplacementFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): FixedCostMovementReplacementIssue {
  return { failedFact, mechanicsPath };
}

function fixedCostMovementReplacementIssueResult(
  issue: FixedCostMovementReplacementIssue,
) {
  return {
    tag: "spellProcedureAdmissionIssue" as const,
    procedure: "fixedCostMovementReplacement" as const,
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported fixedCostMovementReplacement mechanics fact: ${issue.failedFact}.`,
  };
}

function fixedCostMovementReplacementDurationIssues(
  duration: Extract<SpellMechanics["duration"], { readonly kind: "timed" }>,
): readonly FixedCostMovementReplacementIssue[] {
  const issues: FixedCostMovementReplacementIssue[] = [];
  for (const child of spellDurationChildCoordinates(duration)) {
    issues.push(
      fixedCostMovementReplacementIssue(
        child.branch === "extension" ? "durationExtension" : "durationEnding",
        spellDurationChildPath(child),
      ),
    );
  }
  return issues;
}

type FixedCostMovementReplacementDuration =
  FixedCostMovementReplacementMechanicsFacts["duration"];

type FixedCostMovementReplacementRange =
  FixedCostMovementReplacementMechanicsFacts["range"];

function isFixedCostMovementReplacementRange(
  range: SpellDefinitionRuleFacts["range"],
): range is FixedCostMovementReplacementRange {
  return range.kind === "touch";
}

function isFixedCostMovementReplacementDuration(
  duration: SpellDefinitionRuleFacts["duration"],
): duration is FixedCostMovementReplacementDuration {
  return (
    duration.kind === "timed" &&
    duration.value.unit === "minute" &&
    duration.value.amount === 1 &&
    isSpellCanonicalDurationValue(duration.value)
  );
}

function isFixedCostMovementReplacementRootShape(
  mechanics: SpellMechanics,
): mechanics is Extract<SpellMechanics, { readonly family: "activation" }> {
  if (mechanics.family !== "activation") return false;
  const phase = mechanics.phases[0];
  const effect = phase?.kind === "direct" ? phase.effects?.[0] : undefined;
  return effect?.kind === "jump_movement_replacement";
}

function positiveIntegerFromSurface(
  value: number,
): PositiveInteger | undefined {
  return Number.isInteger(value) && value > 0
    ? PositiveInteger(value)
    : undefined;
}

function spellSlotLevelFromSurface(value: number): SpellSlotLevel | undefined {
  return Number.isInteger(value) && value >= 1 && value <= 9
    ? spellSlotLevel(value)
    : undefined;
}

type FixedCostMovementReplacementCandidate = {
  readonly mechanics: Extract<
    SpellMechanics,
    { readonly family: "activation" }
  >;
  readonly phase: Extract<
    Extract<
      SpellMechanics,
      { readonly family: "activation" }
    >["phases"][number],
    { readonly kind: "direct" }
  >;
  readonly effect: Extract<
    NonNullable<
      Extract<
        Extract<
          SpellMechanics,
          { readonly family: "activation" }
        >["phases"][number],
        { readonly kind: "direct" }
      >["effects"]
    >[number],
    { readonly kind: "jump_movement_replacement" }
  >;
};

function fixedCostMovementReplacementCandidate(
  mechanics: SpellMechanics,
): FixedCostMovementReplacementCandidate | null {
  if (!isFixedCostMovementReplacementRootShape(mechanics)) return null;
  const phase = mechanics.phases[0];
  if (phase?.kind !== "direct") return null;
  const effect = phase.effects?.[0];
  return effect?.kind === "jump_movement_replacement"
    ? { mechanics, phase, effect }
    : null;
}

type FixedCostMovementReplacementHeaderInspection = {
  readonly range: FixedCostMovementReplacementRange | undefined;
  readonly duration: FixedCostMovementReplacementDuration | undefined;
  readonly issues: readonly FixedCostMovementReplacementIssue[];
};

function fixedCostMovementReplacementHeaderProjection(
  mechanics: FixedCostMovementReplacementCandidate["mechanics"],
): FixedCostMovementReplacementHeaderInspection {
  const range = isFixedCostMovementReplacementRange(mechanics.range)
    ? mechanics.range
    : undefined;
  const duration = isFixedCostMovementReplacementDuration(mechanics.duration)
    ? mechanics.duration
    : undefined;
  return {
    range,
    duration,
    issues: [
      ...(mechanics.level === 1
        ? []
        : [
            fixedCostMovementReplacementIssue(
              "level",
              spellMechanicsHeaderPath("level"),
            ),
          ]),
      ...(mechanics.castingTime.kind === "bonus_action"
        ? []
        : [
            fixedCostMovementReplacementIssue(
              "castingTime",
              spellMechanicsHeaderPath("castingTime"),
            ),
          ]),
      ...(range !== undefined
        ? []
        : [
            fixedCostMovementReplacementIssue(
              "range",
              spellMechanicsHeaderPath("range"),
            ),
          ]),
      ...(duration !== undefined
        ? []
        : [
            fixedCostMovementReplacementIssue(
              "duration",
              spellDurationValuePath(),
            ),
          ]),
      ...(mechanics.duration.kind === "timed"
        ? fixedCostMovementReplacementDurationIssues(mechanics.duration)
        : []),
      ...fixedCostMovementReplacementPhaseCountIssues(mechanics),
    ],
  };
}

function fixedCostMovementReplacementPhaseCountIssues(
  mechanics: FixedCostMovementReplacementCandidate["mechanics"],
): readonly FixedCostMovementReplacementIssue[] {
  return mechanics.phases.length === 1
    ? []
    : mechanics.phases
        .slice(1)
        .map((_phase, index) =>
          fixedCostMovementReplacementIssue(
            "phaseCount",
            spellActivationPhasePath(PositiveInteger(index + 2)),
          ),
        );
}

type FixedCostMovementReplacementTargetCountProjection = {
  readonly targetCount: FixedCostMovementReplacementTargetCountFacts | null;
  readonly issues: readonly FixedCostMovementReplacementIssue[];
};

function fixedCostMovementReplacementTargetCountProjection(
  phase: FixedCostMovementReplacementCandidate["phase"],
): FixedCostMovementReplacementTargetCountProjection {
  const admission = admitSpellTargetAttachment(
    phase.attachment,
    FIXED_COST_MOVEMENT_REPLACEMENT_TARGET_SELECTION_FIELDS,
  );
  if (admission.tag === "rejected") {
    return {
      targetCount: null,
      issues: [
        fixedCostMovementReplacementIssue(
          "attachment",
          spellActivationAttachmentPath(PositiveInteger(1)),
        ),
      ],
    };
  }
  const selection = admission.attachment.value.selection;
  const count = fixedCostMovementReplacementLinearCount(selection);
  const targetCount = fixedCostMovementReplacementTargetCountFacts(count);
  const supported =
    fixedCostMovementReplacementSelectionIsSupported(selection) &&
    targetCount !== null;
  return supported
    ? { targetCount, issues: [] }
    : {
        targetCount: null,
        issues: [
          fixedCostMovementReplacementIssue(
            "targetCount",
            spellActivationAttachmentPath(PositiveInteger(1)),
          ),
        ],
      };
}

type FixedCostMovementReplacementLinearCount = Extract<
  Extract<TargetSelection, { readonly mode: "choose_up_to" }>["count"],
  { readonly kind: "linear" }
>;

function fixedCostMovementReplacementLinearCount(
  selection: TargetSelection,
): FixedCostMovementReplacementLinearCount | undefined {
  return selection.mode === "choose_up_to" &&
    typeof selection.count === "object" &&
    selection.count.kind === "linear"
    ? selection.count
    : undefined;
}

function fixedCostMovementReplacementTargetCountFacts(
  count: FixedCostMovementReplacementLinearCount | undefined,
): FixedCostMovementReplacementTargetCountFacts | null {
  const base =
    count === undefined ? undefined : positiveIntegerFromSurface(count.base);
  const baseLevel =
    count === undefined
      ? undefined
      : spellSlotLevelFromSurface(count.baseLevel);
  const perSlotAboveBase =
    count === undefined
      ? undefined
      : positiveIntegerFromSurface(count.perSlotAboveBase);
  return base === 1 && baseLevel === 1 && perSlotAboveBase === 1
    ? { base, baseLevel, perSlotAboveBase }
    : null;
}

function fixedCostMovementReplacementSelectionIsSupported(
  selection: TargetSelection,
): boolean {
  return (
    selection.mode === "choose_up_to" &&
    "disposition" in selection &&
    selection.disposition === "willing" &&
    "targetKinds" in selection &&
    selection.targetKinds !== undefined &&
    sameStringSet(selection.targetKinds, ["creature"])
  );
}

function fixedCostMovementReplacementEffectCountIssues(
  phase: FixedCostMovementReplacementCandidate["phase"],
): readonly FixedCostMovementReplacementIssue[] {
  const effects = phase.effects ?? [];
  if (effects.length === 1) return [];
  return [
    ...effects
      .slice(1)
      .map((_effect, index) =>
        fixedCostMovementReplacementIssue(
          "effects",
          spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(index + 2),
          ),
        ),
      ),
    ...(effects.length === 0
      ? [
          fixedCostMovementReplacementIssue(
            "effects",
            spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
          ),
        ]
      : []),
  ];
}

function fixedCostMovementReplacementEffectIssues(
  candidate: FixedCostMovementReplacementCandidate,
): readonly FixedCostMovementReplacementIssue[] {
  const effect = candidate.effect;
  return [
    ...fixedCostMovementReplacementEffectCountIssues(candidate.phase),
    ...(effect.frequency === "once_on_each_target_turn" &&
    effect.maxJumpDistanceFeet === 30 &&
    effect.movementCostFeet === 10
      ? []
      : [
          fixedCostMovementReplacementIssue(
            "movementReplacement",
            spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
          ),
        ]),
  ];
}

type FixedCostMovementReplacementSupportedProjection = {
  readonly range: FixedCostMovementReplacementRange;
  readonly duration: FixedCostMovementReplacementDuration;
  readonly targetCount: FixedCostMovementReplacementTargetCountFacts;
};

function fixedCostMovementReplacementSupportedProjection(input: {
  readonly header: FixedCostMovementReplacementHeaderInspection;
  readonly target: FixedCostMovementReplacementTargetCountProjection;
}):
  | {
      readonly tag: "supported";
      readonly value: FixedCostMovementReplacementSupportedProjection;
    }
  | {
      readonly tag: "unsupported";
      readonly issue: FixedCostMovementReplacementIssue;
    } {
  if (input.target.targetCount === null) {
    return {
      tag: "unsupported",
      issue: fixedCostMovementReplacementIssue(
        "targetCount",
        spellActivationAttachmentPath(PositiveInteger(1)),
      ),
    };
  }
  if (input.header.range === undefined) {
    return {
      tag: "unsupported",
      issue: fixedCostMovementReplacementIssue(
        "range",
        spellMechanicsHeaderPath("range"),
      ),
    };
  }
  if (input.header.duration === undefined) {
    return {
      tag: "unsupported",
      issue: fixedCostMovementReplacementIssue(
        "duration",
        spellDurationValuePath(),
      ),
    };
  }
  return {
    tag: "supported",
    value: {
      range: input.header.range,
      duration: input.header.duration,
      targetCount: input.target.targetCount,
    },
  };
}

function admitFixedCostMovementReplacementMechanics(
  source: SpellMechanicsAdmissionSource,
): FixedCostMovementReplacementInspection {
  const candidate = fixedCostMovementReplacementCandidate(source.mechanics);
  if (candidate === null) return { tag: "notRepresented" };
  const header = fixedCostMovementReplacementHeaderProjection(
    candidate.mechanics,
  );
  const target = fixedCostMovementReplacementTargetCountProjection(
    candidate.phase,
  );
  const issues = [
    ...header.issues,
    ...target.issues,
    ...fixedCostMovementReplacementEffectIssues(candidate),
  ];
  const nonEmpty = spellProcedureNonEmpty(issues);
  if (nonEmpty !== undefined) {
    const [firstIssue, ...remainingIssues] = nonEmpty;
    return {
      tag: "unsupported",
      issues: [
        fixedCostMovementReplacementIssueResult(firstIssue),
        ...remainingIssues.map(fixedCostMovementReplacementIssueResult),
      ],
    };
  }
  const projection = fixedCostMovementReplacementSupportedProjection({
    header,
    target,
  });
  if (projection.tag === "unsupported") {
    return {
      tag: "unsupported",
      issues: [fixedCostMovementReplacementIssueResult(projection.issue)],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    range: projection.value.range,
    duration: projection.value.duration,
    durationTicks: spellDurationTicksFromCanonicalValue(
      projection.value.duration.value,
    ),
    targetCount: projection.value.targetCount,
    movementCostFeet: movementFeet(candidate.effect.movementCostFeet),
    maxJumpDistanceFeet: movementFeet(candidate.effect.maxJumpDistanceFeet),
  } satisfies FixedCostMovementReplacementMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "fixedCostMovementReplacement",
      facts,
      evidence: fixedCostMovementReplacementMechanicsEvidence(
        candidate.mechanics,
      ),
      admit: (executionSource, ctx) =>
        admitFixedCostMovementReplacement(executionSource, ctx, facts),
    },
  };
}

function fixedCostMovementReplacementMechanicsEvidence(
  mechanics: Extract<SpellMechanics, { readonly family: "activation" }>,
): SpellProcedureMechanicsEvidence {
  const consumed: [SpellMechanicsBranchPath, ...SpellMechanicsBranchPath[]] = [
    spellMechanicsHeaderPath("level"),
    spellMechanicsHeaderPath("school"),
    spellMechanicsHeaderPath("range"),
    spellMechanicsHeaderPath("components"),
    spellMechanicsHeaderPath("duration"),
    spellMechanicsHeaderPath("castingTime"),
    spellMechanicsHeaderPath("family"),
    spellDurationValuePath(),
    ...spellDurationChildCoordinates(mechanics.duration).map(
      spellDurationChildPath,
    ),
    spellActivationPhasePath(PositiveInteger(1)),
    spellActivationAttachmentPath(PositiveInteger(1)),
    spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
    ...spellConsumedMaterialEvidencePaths(mechanics.components),
  ];
  return { consumed, unowned: [] };
}

function fixedCostMovementReplacementTargetCountAtSlot(
  facts: FixedCostMovementReplacementTargetCountFacts,
  slotLevel: SpellSlotLevel,
): PositiveInteger {
  return PositiveInteger(
    Number(facts.base) +
      Math.max(0, Number(slotLevel) - Number(facts.baseLevel)) *
        Number(facts.perSlotAboveBase),
  );
}

function admitFixedCostMovementReplacement(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: FixedCostMovementReplacementMechanicsFacts,
): readonly FixedCostMovementReplacementInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly FixedCostMovementReplacementInvocation[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "fixedCostMovementReplacement",
              spell,
              actionCost: "bonusAction",
              targeting: {
                kind: "targetList",
                minTargets: 1,
                maxTargets: fixedCostMovementReplacementTargetCountAtSlot(
                  facts.targetCount,
                  slot.spellLevel,
                ),
                requiredTargetDisposition: "willing",
              },
              activeEffect: {
                kind: "fixedCostMovementReplacement",
                sourceCombatantId: ctx.actor.combatantId,
                movementCostFeet: facts.movementCostFeet,
                maxJumpDistanceFeet: facts.maxJumpDistanceFeet,
                usedThisTurn: false,
                expiresAt: {
                  kind: "duration",
                  durationTicks: facts.durationTicks,
                },
              },
              rangeFeet: spellTouchRangeFeet(),
            },
          ],
  );
}

function discoverFixedCostMovementReplacementCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<FixedCostMovementReplacementInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetListHole(state, actorId, invocation);
  return spellCastCandidatesForTargetHole(
    "bonusActionSpell",
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
  );
}

function resolveFixedCostMovementReplacement(
  input: FixedCostMovementReplacementResolveInput,
): BattleResolutionResult {
  const targetSelection = selectSpellTargetList({
    state: input.input.state,
    subject: input.input.subject,
    fills: input.input.fills,
    fillSet: input.fillSet,
    actorId: input.actorId,
    invocation: input.invocation,
    invalidFillMessage:
      "Fixed-cost movement replacement uses a target-list fill only.",
  });
  if (targetSelection.tag !== "selected") {
    return targetSelection;
  }
  const { targetIds } = targetSelection;

  const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
    input,
    targetIds,
    { kind: "bonusAction" },
    undefined,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const effected = applyFixedCostMovementReplacementSpellEffect(
    input.input.state,
    input.actorId,
    targetIds,
    input.invocation,
    input.input.subject.procedureRef,
  );
  return spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
}

function applyFixedCostMovementReplacementSpellEffect(
  state: BattleState,
  actorId: CombatantId,
  targetIds: readonly CombatantId[],
  invocation: FixedCostMovementReplacementResolveInput["invocation"],
  procedureRef: BonusActionSpellBattleResolutionInput["subject"]["procedureRef"],
): BattleState {
  return targetIds.reduce(
    (nextState, targetId) =>
      replaceAllocatedTargetSpellActiveEffects(
        nextState,
        targetId,
        (effect) =>
          effect.kind === "fixedCostMovementReplacement" &&
          effect.sourceProcedureRef === procedureRef &&
          effect.sourceCombatantId === actorId,
        [
          {
            kind: "fixedCostMovementReplacement",
            sourceCombatantId: actorId,
            sourceProcedureRef: procedureRef,
            usedThisTurn: invocation.activeEffect.usedThisTurn,
            expiresAt: invocation.activeEffect.expiresAt,
          },
        ],
      ),
    state,
  );
}

const FixedCostMovementReplacementInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("fixedCostMovementReplacement"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("bonusAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Number,
        requiredTargetDisposition: Schema.Literal("willing"),
      }),
      activeEffect: Schema.Struct({
        ...BattleEffectOccurrenceTemplateSchemaFields,
        kind: Schema.Literal("fixedCostMovementReplacement"),
        sourceCombatantId: CombatantId,
        movementCostFeet: MovementFeet,
        maxJumpDistanceFeet: MovementFeet,
        usedThisTurn: Schema.Literal(false),
        expiresAt: DurationBattleActiveEffectExpirationSchema,
      }),
      rangeFeet: MovementFeet,
    }),
  );
export const fixedCostMovementReplacementProfile = {
  procedure: "fixedCostMovementReplacement",
  executionSchema: FixedCostMovementReplacementInvocationSchema,
  admitMechanics: admitFixedCostMovementReplacementMechanics,
  discoverCastAct: discoverFixedCostMovementReplacementCastAct,
  resolve: resolveFixedCostMovementReplacement,
} satisfies SpellProcedureDeclaration<
  "fixedCostMovementReplacement",
  FixedCostMovementReplacementInvocation
>;
