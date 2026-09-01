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
  const issues: ChosenDamageResistanceIssue[] = [];
  for (const child of spellDurationChildCoordinates(duration)) {
    issues.push(
      chosenDamageResistanceIssue(
        child.branch === "extension" ? "durationExtension" : "durationEnding",
        spellDurationChildPath(child),
      ),
    );
  }
  return issues;
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

function admitChosenDamageResistanceMechanics(
  source: SpellMechanicsAdmissionSource,
): ChosenDamageResistanceInspection {
  if (!isChosenDamageResistanceRootShape(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const phase = mechanics.phases[0];
  if (phase?.kind !== "direct") {
    return { tag: "notRepresented" };
  }
  const effect = phase.effects?.[0];
  if (effect?.kind !== "grant_resistance") {
    return { tag: "notRepresented" };
  }
  const issues: ChosenDamageResistanceIssue[] = [];
  const rangeFacts = isChosenDamageResistanceRange(mechanics.range)
    ? mechanics.range
    : undefined;
  const durationFacts = isChosenDamageResistanceDuration(mechanics.duration)
    ? mechanics.duration
    : undefined;
  if (mechanics.level !== 3) {
    issues.push(
      chosenDamageResistanceIssue("level", spellMechanicsHeaderPath("level")),
    );
  }
  if (mechanics.castingTime.kind !== "action") {
    issues.push(
      chosenDamageResistanceIssue(
        "castingTime",
        spellMechanicsHeaderPath("castingTime"),
      ),
    );
  }
  if (!isChosenDamageResistanceRange(mechanics.range)) {
    issues.push(
      chosenDamageResistanceIssue("range", spellMechanicsHeaderPath("range")),
    );
  }
  if (!isChosenDamageResistanceDuration(mechanics.duration)) {
    issues.push(
      chosenDamageResistanceIssue("duration", spellDurationValuePath()),
    );
  }
  if (mechanics.duration.kind === "concentration") {
    issues.push(...chosenDamageResistanceDurationIssues(mechanics.duration));
  }
  if (mechanics.phases.length !== 1) {
    for (const [index] of mechanics.phases.entries()) {
      if (index === 0) continue;
      issues.push(
        chosenDamageResistanceIssue(
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(index + 1)),
        ),
      );
    }
  }
  const targetAttachmentAdmission = admitSpellTargetAttachment(
    phase.attachment,
    CHOSEN_DAMAGE_RESISTANCE_TARGET_SELECTION_FIELDS,
  );
  const selection =
    targetAttachmentAdmission.tag === "admitted"
      ? targetAttachmentAdmission.attachment.value.selection
      : undefined;
  const validSelection =
    selection !== undefined &&
    selection.mode === "one" &&
    "disposition" in selection &&
    selection.disposition === "willing" &&
    "targetKinds" in selection &&
    selection.targetKinds !== undefined &&
    sameStringSet(selection.targetKinds, ["creature"]);
  if (targetAttachmentAdmission.tag === "rejected" || !validSelection) {
    issues.push(
      chosenDamageResistanceIssue(
        "attachment",
        spellActivationAttachmentPath(PositiveInteger(1)),
      ),
    );
  }
  const effects = phase.effects ?? [];
  if (effects.length !== 1) {
    for (const [index] of effects.entries()) {
      if (index === 0) continue;
      issues.push(
        chosenDamageResistanceIssue(
          "effects",
          spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(index + 1),
          ),
        ),
      );
    }
    if (effects.length === 0) {
      issues.push(
        chosenDamageResistanceIssue(
          "effects",
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
        ),
      );
    }
  }
  if (effect.sourceFilter !== undefined) {
    issues.push(
      chosenDamageResistanceIssue(
        "damageTypeEffect",
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ),
    );
  }
  const choice =
    typeof effect.damageType === "object" &&
    effect.damageType !== null &&
    effect.damageType.kind === "hole" &&
    typeof effect.damageType.value === "object" &&
    effect.damageType.value !== null &&
    effect.damageType.value.kind === "choice"
      ? effect.damageType.value
      : undefined;
  if (choice === undefined) {
    issues.push(
      chosenDamageResistanceIssue(
        "damageTypeChoice",
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ),
    );
  }
  const choices: readonly DamageType[] =
    choice === undefined
      ? []
      : choice.options.filter((option): option is DamageType =>
          Schema.is(DamageTypeSchema)(option),
        );
  if (
    choice === undefined ||
    choices.length !== choice.options.length ||
    !sameStringSet(choices, CHOSEN_ENERGY_RESISTANCE_DAMAGE_TYPES)
  ) {
    issues.push(
      chosenDamageResistanceIssue(
        "damageTypeOptions",
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ),
    );
  }
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
  if (rangeFacts === undefined) {
    return {
      tag: "unsupported",
      issues: [
        chosenDamageResistanceIssueResult(
          chosenDamageResistanceIssue(
            "range",
            spellMechanicsHeaderPath("range"),
          ),
        ),
      ],
    };
  }
  if (durationFacts === undefined) {
    return {
      tag: "unsupported",
      issues: [
        chosenDamageResistanceIssueResult(
          chosenDamageResistanceIssue("duration", spellDurationValuePath()),
        ),
      ],
    };
  }
  const facts = {
    ...source.spellDefinitionRuleFacts,
    range: rangeFacts,
    duration: durationFacts,
    durationTicks: spellDurationTicksFromCanonicalValue(durationFacts.upTo),
    damageTypeChoices: choices,
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
