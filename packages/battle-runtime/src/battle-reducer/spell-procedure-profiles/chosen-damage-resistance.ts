import { spellInvocationResourceForCastOption } from "./profile.ts";
import { resolveSpellActiveEffectCast } from "../spell-active-effect-resolution.ts";
import { actionSpellCastCandidatesForTargetHole } from "../spell-cast-candidate.ts";
import { replaceTargetActiveEffect } from "../active-effect-replacement.ts";
import type { BattleSourcedEffectOccurrenceTemplate } from "../../effect-execution-ref.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-chosen-damage-resistance
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
import { CombatantId } from "../../identity.ts";
//
// The chosenDamageResistance Spell Procedure Profile: a prepared action spell
// that targets one willing touched creature, accepts a caster-selected damage
// type from the authored spell choices, and records a Concentration-owned
// target-side damage Resistance active effect.

import { PositiveInteger, type DamageType } from "@dnd/shared/types";
import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import { Schema } from "effect";

import {
  type BattleSpellExecutionSource,
  type BattleActDiscoveryCandidate,
  type BattleResolutionResult,
  type BattleState,
  type BattleExecutableSpellInvocation,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import { invalidResult } from "../result-helpers.ts";
import { selectSingleSpellTargetAndDamageType } from "../single-spell-target.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import { spellDamageTypeChoiceHole } from "../spells-damage-fills.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import { spellTargetHole } from "../spells-targeting.ts";
import {
  DamageTypeSchema,
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
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";

const CHOSEN_ENERGY_RESISTANCE_DAMAGE_TYPES = [
  "acid",
  "cold",
  "fire",
  "lightning",
  "thunder",
] as const satisfies ReadonlyArray<DamageType>;

const CHOSEN_DAMAGE_RESISTANCE_TARGET_SELECTION_FIELDS = [
  "mode",
  "targetKinds",
  "disposition",
] as const;

type ChosenDamageResistanceSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "chosenDamageResistance" }
>;

type ChosenDamageResistanceResolveInput =
  SpellProcedureProfileResolveInput<ChosenDamageResistanceSpellInvocation>;

type ChosenDamageResistanceMechanicsFacts = Omit<
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
    { readonly kind: "concentration" }
  > & { readonly upTo: SpellCanonicalDurationValue };
  readonly durationTicks: ElapsedTimeTicks;
  readonly damageTypeChoices: readonly DamageType[];
};

export const CHOSEN_DAMAGE_RESISTANCE_FAILED_FACTS = [
  "level",
  "castingTime",
  "range",
  "duration",
  "durationExtension",
  "durationEnding",
  "phaseCount",
  "attachment",
  "effects",
  "damageTypeEffect",
  "damageTypeChoice",
  "damageTypeOptions",
] as const;
type ChosenDamageResistanceFailedFact =
  (typeof CHOSEN_DAMAGE_RESISTANCE_FAILED_FACTS)[number];

type ChosenDamageResistanceIssue = {
  readonly failedFact: ChosenDamageResistanceFailedFact;
  readonly mechanicsPath: SpellMechanicsBranchPath;
};

type ChosenDamageResistanceInspection = SpellProcedureMechanicsInspection<
  "chosenDamageResistance",
  ChosenDamageResistanceMechanicsFacts,
  ChosenDamageResistanceSpellInvocation,
  ReturnType<typeof chosenDamageResistanceIssueResult>
>;

function chosenDamageResistanceIssue(
  failedFact: ChosenDamageResistanceFailedFact,
  mechanicsPath: SpellMechanicsBranchPath,
): ChosenDamageResistanceIssue {
  return { failedFact, mechanicsPath };
}

function chosenDamageResistanceIssueResult(issue: ChosenDamageResistanceIssue) {
  return {
    tag: "spellProcedureAdmissionIssue" as const,
    procedure: "chosenDamageResistance" as const,
    failedFact: issue.failedFact,
    mechanicsPath: issue.mechanicsPath,
    message: `Unsupported chosenDamageResistance mechanics fact: ${issue.failedFact}.`,
  };
}

function chosenDamageResistanceDurationIssues(
  duration: Extract<
    SpellMechanics["duration"],
    { readonly kind: "concentration" }
  >,
): readonly ChosenDamageResistanceIssue[] {
  return spellDurationChildCoordinates(duration).map((child) =>
    chosenDamageResistanceIssue(
      child.branch === "extension" ? "durationExtension" : "durationEnding",
      spellDurationChildPath(child),
    ),
  );
}

type ChosenDamageResistanceDuration =
  ChosenDamageResistanceMechanicsFacts["duration"];

type ChosenDamageResistanceRange =
  ChosenDamageResistanceMechanicsFacts["range"];

function isChosenDamageResistanceRange(
  range: SpellDefinitionRuleFacts["range"],
): range is ChosenDamageResistanceRange {
  return range.kind === "touch";
}

function isChosenDamageResistanceDuration(
  duration: SpellDefinitionRuleFacts["duration"],
): duration is ChosenDamageResistanceDuration {
  return (
    duration.kind === "concentration" &&
    duration.upTo.unit === "hour" &&
    duration.upTo.amount === 1 &&
    isSpellCanonicalDurationValue(duration.upTo)
  );
}

function isChosenDamageResistanceRootShape(
  mechanics: SpellMechanics,
): mechanics is Extract<SpellMechanics, { readonly family: "activation" }> {
  if (mechanics.family !== "activation") return false;
  const phase = mechanics.phases[0];
  const effect = phase?.kind === "direct" ? phase.effects?.[0] : undefined;
  return effect?.kind === "grant_resistance";
}

type ChosenDamageResistanceCandidate = {
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
    { readonly kind: "grant_resistance" }
  >;
};

function chosenDamageResistanceCandidate(
  mechanics: SpellMechanics,
): ChosenDamageResistanceCandidate | null {
  if (!isChosenDamageResistanceRootShape(mechanics)) return null;
  const phase = mechanics.phases[0];
  if (phase?.kind !== "direct") return null;
  const effect = phase.effects?.[0];
  return effect?.kind === "grant_resistance"
    ? { mechanics, phase, effect }
    : null;
}

function chosenDamageResistanceHeaderIssues(
  mechanics: ChosenDamageResistanceCandidate["mechanics"],
  range: ChosenDamageResistanceRange | undefined,
  duration: ChosenDamageResistanceDuration | undefined,
): readonly ChosenDamageResistanceIssue[] {
  return [
    ...(mechanics.level === 3
      ? []
      : [
          chosenDamageResistanceIssue(
            "level",
            spellMechanicsHeaderPath("level"),
          ),
        ]),
    ...(mechanics.castingTime.kind === "action"
      ? []
      : [
          chosenDamageResistanceIssue(
            "castingTime",
            spellMechanicsHeaderPath("castingTime"),
          ),
        ]),
    ...(range === undefined
      ? [
          chosenDamageResistanceIssue(
            "range",
            spellMechanicsHeaderPath("range"),
          ),
        ]
      : []),
    ...(duration === undefined
      ? [chosenDamageResistanceIssue("duration", spellDurationValuePath())]
      : []),
  ];
}

function chosenDamageResistancePhaseCountIssues(
  mechanics: ChosenDamageResistanceCandidate["mechanics"],
): readonly ChosenDamageResistanceIssue[] {
  if (mechanics.phases.length === 1) return [];
  const extra = mechanics.phases
    .slice(1)
    .map((_phase, index) =>
      chosenDamageResistanceIssue(
        "phaseCount",
        spellActivationPhasePath(PositiveInteger(index + 2)),
      ),
    );
  return mechanics.phases.length === 0
    ? [
        chosenDamageResistanceIssue(
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(1)),
        ),
      ]
    : extra;
}

function chosenDamageResistanceAttachmentIssues(
  phase: ChosenDamageResistanceCandidate["phase"],
): readonly ChosenDamageResistanceIssue[] {
  const admission = admitSpellTargetAttachment(
    phase.attachment,
    CHOSEN_DAMAGE_RESISTANCE_TARGET_SELECTION_FIELDS,
  );
  if (admission.tag === "rejected") {
    return [
      chosenDamageResistanceIssue(
        "attachment",
        spellActivationAttachmentPath(PositiveInteger(1)),
      ),
    ];
  }
  const selection = admission.attachment.value.selection;
  const supported =
    selection.mode === "one" &&
    "disposition" in selection &&
    selection.disposition === "willing" &&
    "targetKinds" in selection &&
    selection.targetKinds !== undefined &&
    sameStringSet(selection.targetKinds, ["creature"]);
  return supported
    ? []
    : [
        chosenDamageResistanceIssue(
          "attachment",
          spellActivationAttachmentPath(PositiveInteger(1)),
        ),
      ];
}

function chosenDamageResistanceEffectCountIssues(
  phase: ChosenDamageResistanceCandidate["phase"],
): readonly ChosenDamageResistanceIssue[] {
  const effects = phase.effects ?? [];
  if (effects.length === 1) return [];
  const extras = effects
    .slice(1)
    .map((_effect, index) =>
      chosenDamageResistanceIssue(
        "effects",
        spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(index + 2),
        ),
      ),
    );
  return effects.length === 0
    ? [
        chosenDamageResistanceIssue(
          "effects",
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
        ),
      ]
    : extras;
}

type ChosenDamageResistanceChoiceProjection =
  | { readonly tag: "missing" }
  | {
      readonly tag: "found";
      readonly options:
        | { readonly tag: "unsupported" }
        | {
            readonly tag: "supported";
            readonly choices: readonly DamageType[];
          };
    };

type ChosenDamageResistanceChoiceValue = Extract<
  Extract<
    ChosenDamageResistanceCandidate["effect"]["damageType"],
    { readonly kind: "hole" }
  >["value"],
  { readonly kind: "choice" }
>;

function chosenDamageResistanceChoiceValue(
  effect: ChosenDamageResistanceCandidate["effect"],
): ChosenDamageResistanceChoiceValue | undefined {
  const damageType = effect.damageType;
  if (typeof damageType !== "object" || damageType === null) return undefined;
  if (damageType.kind !== "hole") return undefined;
  const value = damageType.value;
  if (typeof value !== "object" || value === null) return undefined;
  return value.kind === "choice" ? value : undefined;
}

function chosenDamageResistanceChoiceProjection(
  effect: ChosenDamageResistanceCandidate["effect"],
): ChosenDamageResistanceChoiceProjection {
  const value = chosenDamageResistanceChoiceValue(effect);
  if (value === undefined) return { tag: "missing" };
  const choices = value.options.filter((option): option is DamageType =>
    Schema.is(DamageTypeSchema)(option),
  );
  const supported =
    choices.length === value.options.length &&
    sameStringSet(choices, CHOSEN_ENERGY_RESISTANCE_DAMAGE_TYPES);
  return {
    tag: "found",
    options: supported ? { tag: "supported", choices } : { tag: "unsupported" },
  };
}

function chosenDamageResistanceEffectIssues(
  effect: ChosenDamageResistanceCandidate["effect"],
  choice: ChosenDamageResistanceChoiceProjection,
): readonly ChosenDamageResistanceIssue[] {
  const effectPath = spellActivationEffectPath(
    PositiveInteger(1),
    PositiveInteger(1),
  );
  return [
    ...(effect.sourceFilter === undefined
      ? []
      : [chosenDamageResistanceIssue("damageTypeEffect", effectPath)]),
    ...(choice.tag === "missing"
      ? [chosenDamageResistanceIssue("damageTypeChoice", effectPath)]
      : []),
    ...(choice.tag === "found" && choice.options.tag === "supported"
      ? []
      : [chosenDamageResistanceIssue("damageTypeOptions", effectPath)]),
  ];
}

function chosenDamageResistanceProjectedDurationIssues(
  mechanics: ChosenDamageResistanceCandidate["mechanics"],
): readonly ChosenDamageResistanceIssue[] {
  return mechanics.duration.kind === "concentration"
    ? chosenDamageResistanceDurationIssues(mechanics.duration)
    : [];
}

type ChosenDamageResistanceAdmissionCore =
  | { readonly tag: "incomplete"; readonly issue: ChosenDamageResistanceIssue }
  | {
      readonly tag: "complete";
      readonly range: ChosenDamageResistanceRange;
      readonly duration: ChosenDamageResistanceDuration;
      readonly damageTypeChoices: readonly DamageType[];
    };

function chosenDamageResistanceAdmissionCore(input: {
  readonly range: ChosenDamageResistanceRange | undefined;
  readonly duration: ChosenDamageResistanceDuration | undefined;
  readonly choice: ChosenDamageResistanceChoiceProjection;
}): ChosenDamageResistanceAdmissionCore {
  if (input.range === undefined) {
    return {
      tag: "incomplete",
      issue: chosenDamageResistanceIssue(
        "range",
        spellMechanicsHeaderPath("range"),
      ),
    };
  }
  if (input.duration === undefined) {
    return {
      tag: "incomplete",
      issue: chosenDamageResistanceIssue("duration", spellDurationValuePath()),
    };
  }
  if (
    input.choice.tag !== "found" ||
    input.choice.options.tag !== "supported"
  ) {
    return {
      tag: "incomplete",
      issue: chosenDamageResistanceIssue(
        "damageTypeOptions",
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ),
    };
  }
  return {
    tag: "complete",
    range: input.range,
    duration: input.duration,
    damageTypeChoices: input.choice.options.choices,
  };
}

function admitChosenDamageResistanceMechanics(
  source: SpellMechanicsAdmissionSource,
): ChosenDamageResistanceInspection {
  const candidate = chosenDamageResistanceCandidate(source.mechanics);
  if (candidate === null) return { tag: "notRepresented" };
  const { mechanics, phase, effect } = candidate;
  const rangeFacts = isChosenDamageResistanceRange(mechanics.range)
    ? mechanics.range
    : undefined;
  const durationFacts = isChosenDamageResistanceDuration(mechanics.duration)
    ? mechanics.duration
    : undefined;
  const choice = chosenDamageResistanceChoiceProjection(effect);
  const issues = [
    ...chosenDamageResistanceHeaderIssues(mechanics, rangeFacts, durationFacts),
    ...chosenDamageResistanceProjectedDurationIssues(mechanics),
    ...chosenDamageResistancePhaseCountIssues(mechanics),
    ...chosenDamageResistanceAttachmentIssues(phase),
    ...chosenDamageResistanceEffectCountIssues(phase),
    ...chosenDamageResistanceEffectIssues(effect, choice),
  ];
  const nonEmpty = spellProcedureNonEmpty(issues);
  if (nonEmpty !== undefined) {
    const [firstIssue, ...remainingIssues] = nonEmpty;
    return {
      tag: "unsupported",
      issues: [
        chosenDamageResistanceIssueResult(firstIssue),
        ...remainingIssues.map(chosenDamageResistanceIssueResult),
      ],
    };
  }
  const core = chosenDamageResistanceAdmissionCore({
    range: rangeFacts,
    duration: durationFacts,
    choice,
  });
  if (core.tag === "incomplete") {
    return {
      tag: "unsupported",
      issues: [chosenDamageResistanceIssueResult(core.issue)],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    range: core.range,
    duration: core.duration,
    durationTicks: spellDurationTicksFromCanonicalValue(core.duration.upTo),
    damageTypeChoices: core.damageTypeChoices,
  } satisfies ChosenDamageResistanceMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "chosenDamageResistance",
      facts,
      evidence: chosenDamageResistanceMechanicsEvidence(mechanics),
      admit: (executionSource, ctx) =>
        admitChosenDamageResistance(executionSource, ctx, facts),
    },
  };
}

function chosenDamageResistanceMechanicsEvidence(
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

function admitChosenDamageResistance(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: ChosenDamageResistanceMechanicsFacts,
): readonly ChosenDamageResistanceSpellInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly ChosenDamageResistanceSpellInvocation[] =>
      Number(slot.spellLevel) < facts.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: spellInvocationResourceForCastOption(slot),
              procedure: "chosenDamageResistance",
              spell,
              actionCost: "magicAction",
              targeting: {
                kind: "targetList",
                minTargets: 1,
                maxTargets: 1,
                requiredTargetDisposition: "willing",
              },
              damageTypeChoices: facts.damageTypeChoices,
              expiresAt: {
                kind: "concentration",
                combatantId: ctx.actor.combatantId,
                durationTicks: facts.durationTicks,
              },
              rangeFeet: spellTouchRangeFeet(),
            },
          ],
  );
}

function discoverChosenDamageResistanceCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<ChosenDamageResistanceSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return actionSpellCastCandidatesForTargetHole(
    actorId,
    invocation.sourceProcedureRef,
    targetHole,
    [spellDamageTypeChoiceHole(invocation)],
  );
}

function resolveChosenDamageResistance(
  input: ChosenDamageResistanceResolveInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      ATTACK_TARGET_HOLE_ID,
      spellDamageTypeChoiceHole(input.invocation).holeId,
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Chosen damage Resistance spells use one target fill and one damage type choice.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const selection = selectSingleSpellTargetAndDamageType({
    state: input.input.state,
    subject: input.input.subject,
    actorId: input.actorId,
    invocation: input.invocation,
    targetId: input.fillSet.targetId,
    targetSpatialFacts: input.fillSet.targetSpatialFacts,
    damageType: input.fillSet.damageTypeChoice?.value,
    invalidTargetMessage:
      "Chosen damage Resistance spell target must be a willing combatant within the selected spell's supported range.",
    invalidDamageTypeMessage:
      "Chosen damage Resistance spell damage type must be one of the selected spell's choices.",
  });
  if (selection.tag !== "selected") {
    return selection;
  }

  return resolveSpellActiveEffectCast({
    resolution: input,
    targetIds: [selection.targetId],
    castingResource: { kind: "magicAction" },
    applyEffect: (state) =>
      applyChosenDamageResistanceEffect({
        state,
        actorId: input.actorId,
        targetId: selection.targetId,
        damageType: selection.damageType,
        invocation: input.invocation,
      }),
  });
}

function applyChosenDamageResistanceEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly damageType: DamageType;
  readonly invocation: BattleExecutableSpellInvocation<ChosenDamageResistanceSpellInvocation>;
}): BattleState {
  const nextEffect = {
    kind: "damageResistance" as const,
    sourceProcedureRef: input.invocation.sourceProcedureRef,
    sourceCombatantId: input.actorId,
    damageType: input.damageType,
    expiresAt: input.invocation.expiresAt,
  } satisfies BattleSourcedEffectOccurrenceTemplate;
  return replaceTargetActiveEffect(
    input.state,
    input.targetId,
    (effect) =>
      effect.kind === "damageResistance" &&
      effect.sourceProcedureRef === input.invocation.sourceProcedureRef &&
      effect.sourceCombatantId === input.actorId,
    nextEffect,
  );
}

export const ChosenDamageResistanceInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("chosenDamageResistance"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      actionCost: Schema.Literal("magicAction"),
      targeting: Schema.Struct({
        kind: Schema.Literal("targetList"),
        minTargets: Schema.Literal(1),
        maxTargets: Schema.Literal(1),
        requiredTargetDisposition: Schema.Literal("willing"),
      }),
      damageTypeChoices: Schema.Array(DamageTypeSchema),
      expiresAt: Schema.Struct({
        kind: Schema.Literal("concentration"),
        combatantId: CombatantId,
        durationTicks: ElapsedTimeTicksSchema,
      }),
      rangeFeet: MovementFeet,
    }),
  );

export const chosenDamageResistanceProfile: SpellProcedureDeclaration<
  "chosenDamageResistance",
  ChosenDamageResistanceSpellInvocation
> = {
  procedure: "chosenDamageResistance",
  executionSchema: ChosenDamageResistanceInvocationSchema,
  admitMechanics: admitChosenDamageResistanceMechanics,
  discoverCastAct: discoverChosenDamageResistanceCastAct,
  resolve: resolveChosenDamageResistance,
};
