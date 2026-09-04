// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magic-suppression-emanation
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magic-suppression-action-interdiction
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ANTIMAGIC_FIELD_ONGOING_SUPPRESSION
//
// The Antimagic Field ongoing-spell suppression Spell Procedure Profile:
// action-time level-8 Spell Slot casting creates a caster-owned Concentration
// 10-foot Emanation. The runtime owns Spell Slot spending, Concentration
// duration, caller-supplied self-origin Emanation identity, caller-supplied
// tracked ongoing Spell Effect witnesses, suppression of ordinary tracked
// ongoing Spell Effects without deleting their occurrence state, artifact/deity
// source exceptions, and cleanup.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-A-D.md "Antimagic Field":
//     Action; Self; Concentration up to 1 hour; an aura of antimagic in a
//     10-foot Emanation; ongoing spells except those cast by an Artifact or a
//     deity are suppressed in the area; suppressed effects do not function, but
//     suppressed time counts against duration.
//   - .references/srd-5.2.1/Rules-Glossary.md "Emanation": an Emanation
//     extends from a creature or object in all directions and moves with its
//     origin unless instantaneous or stationary.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Concentration, Spell Slot, Spell
//     Invocation, Spell Effect, Area of Effect/Emanation, and Battle Runtime
//     Boundaries.

import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  movementFeet,
  PositiveInteger,
  type MovementFeet as MovementFeetType,
} from "@dnd/shared/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingAuthoredConditionalMechanicPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { Components, SpellMechanics } from "@dnd/surface/surface/types";
import { Match, Schema } from "effect";

import {
  type ActionSpellBattleResolutionInput,
  type BattleMagicSuppressionAffectedOngoingSpellEffect,
  type BattleMagicSuppressionAreaChoice,
  type BattleResolutionResult,
  type BattleState,
  type BattleExecutableSpellInvocation,
  type BattleSpellExecutionSource,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { type BattleAreaId, type CombatantId } from "../../identity.ts";
import {
  magicSuppressionOngoingSpellEffectRefForActiveEffect,
  magicSuppressionOngoingSpellEffectRefForEmitter,
  isTrackedOngoingSpellLightEmitter,
  ongoingSpellEffectRefKey,
} from "../magic-suppression-ongoing-effect.ts";
import { snapshotBattle } from "../interrupt-execution.ts";
import { needsHolesResult } from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { spellAreaChoiceHole } from "../spells-holes-fills.ts";
import { spellAreaChoiceHoleId } from "../spells-targeting.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import { replaceTargetSpellActiveEffect } from "../active-effect-replacement.ts";
import { discoverActionSpellAreaCastAct } from "../spell-area-cast-discovery.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellInvocationResourceForCastOption,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  admitSpellAreaAttachment,
  isSpellCanonicalDurationValue,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
  spellDurationChildFailedFact,
  spellDurationChildPath,
  spellDurationTicksFromCanonicalValue,
  spellDurationValueEvidencePaths,
  spellMechanicsObjectHasOnlyKeys,
  spellOngoingOperationOccurrences,
  spellOngoingOperationUnsupportedFacts,
  spellProcedureHasRedundantSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  spellUniqueMechanicsIssues,
  type SpellMechanicsAdmissionSource,
  type SpellProcedureAdmissionIssue,
  type SpellProcedureMechanicsEvidence,
  type SpellProcedureMechanicsFacts,
  type SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";

type MagicSuppressionEmanationInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "magicSuppressionEmanation" }
>;
type MagicSuppressionEmanationResolveInput =
  SpellProcedureProfileResolveInput<MagicSuppressionEmanationInvocation>;
type MagicSuppressionEmanationMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type MagicSuppressionEmanationOperation =
  MagicSuppressionEmanationMechanics["operations"][number];
type MagicSuppressionEmanationDuration = Extract<
  MagicSuppressionEmanationMechanics["duration"],
  { readonly kind: "concentration" }
>;
const MAGIC_SUPPRESSION_EXEMPT_SOURCES = ["artifact", "deity"] as const;
type MagicSuppressionSourceException =
  (typeof MAGIC_SUPPRESSION_EXEMPT_SOURCES)[number];
type MagicSuppressionEmanationMechanicsFacts = SpellProcedureMechanicsFacts & {
  readonly radiusFeet: MovementFeetType;
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: MovementFeetType;
  readonly exceptSources: typeof MAGIC_SUPPRESSION_EXEMPT_SOURCES;
  readonly suppressedTimeCountsAgainstDuration: true;
};

const MAGIC_SUPPRESSION_EMANATION_LEVEL = 8 as const;
const MAGIC_SUPPRESSION_EMANATION_DURATION_HOURS = 1 as const;
const MAGIC_SUPPRESSION_EMANATION_RADIUS_FEET = 10 as const;
const MAGIC_SUPPRESSION_EMANATION_MATERIAL = "iron filings" as const;

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Canonical source for MagicSuppressionEmanationFailedFact.
const MAGIC_SUPPRESSION_EMANATION_FAILED_FACTS = [
  "mechanics",
  "level",
  "school",
  "range",
  "components",
  "duration",
  "durationValue",
  "durationExtension",
  "durationEnding",
  "castingTime",
  "attachment",
  "initialPhase",
  "authoredConditionalMechanics",
  "operationCount",
  "operation",
  "operationTrigger",
  "operationPredicate",
  "operationTargetLimit",
  "operationUsageLimit",
  "operationEffect",
  "suppressionOperation",
  "suppressedTimeCountsAgainstDuration",
  "exceptSources",
] as const;
type MagicSuppressionEmanationFailedFact =
  (typeof MAGIC_SUPPRESSION_EMANATION_FAILED_FACTS)[number];
type MagicSuppressionEmanationAdmissionIssue = SpellProcedureAdmissionIssue<
  "magicSuppressionEmanation",
  MagicSuppressionEmanationFailedFact,
  UnitMechanicsPath
>;
type MagicSuppressionEmanationIssueFact = {
  readonly failedFact: MagicSuppressionEmanationFailedFact;
  readonly mechanicsPath: UnitMechanicsPath;
};

const ROOT_FIELDS = [
  "level",
  "school",
  "range",
  "components",
  "duration",
  "castingTime",
  "family",
  "attachment",
  "initialPhase",
  "operations",
  "authoredConditionalMechanics",
] as const satisfies ReadonlyArray<keyof MagicSuppressionEmanationMechanics>;
type MagicSuppressionComponentKeySpace = Pick<Components, "v" | "s" | "m"> & {
  readonly materialCostGp?: unknown;
  readonly materialConsumed?: unknown;
};
const COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
  "materialCostGp",
  "materialConsumed",
] as const satisfies ReadonlyArray<keyof MagicSuppressionComponentKeySpace>;
const RANGE_FIELDS = ["kind"] as const;
const CASTING_TIME_FIELDS = ["kind"] as const;
const DURATION_FIELDS = [
  "kind",
  "upTo",
  "earlyEnd",
  "permanentIfMaintainedFull",
] as const;
const DURATION_VALUE_FIELDS = [
  "unit",
  "amount",
  "upcastTiers",
] as const satisfies ReadonlyArray<
  keyof MagicSuppressionEmanationDuration["upTo"]
>;
const OPERATION_FIELDS = [
  "trigger",
  "effect",
  "predicate",
  "targetLimit",
  "usageLimit",
] as const;
const TRIGGER_FIELDS = ["kind"] as const;
const UNOWNED_EFFECT_FIELDS = ["kind"] as const;
const SUPPRESSION_EFFECT_FIELDS = [
  "kind",
  "exceptSources",
  "suppressedTimeCountsAgainstDuration",
] as const;
const UNOWNED_EFFECT_KINDS = [
  "prevent_spellcasting_and_magic_actions",
  "block_magical_targeting_and_aoe",
  "block_teleport_and_planar_travel",
  "suppress_magic_items",
] as const;
type UnownedEffectKind = (typeof UNOWNED_EFFECT_KINDS)[number];

function magicSuppressionEmanationIssue(
  failedFact: MagicSuppressionEmanationFailedFact,
  mechanicsPath: UnitMechanicsPath,
): MagicSuppressionEmanationAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "magicSuppressionEmanation",
    failedFact,
    mechanicsPath,
    message: `Unsupported magicSuppressionEmanation mechanics fact: ${failedFact}.`,
  };
}

function isMagicSuppressionEmanationRepresentation(
  mechanics: SpellMechanics,
): mechanics is MagicSuppressionEmanationMechanics {
  return Match.value(mechanics).pipe(
    Match.when({ family: "ongoing_effect" }, (ongoing) => {
      const area =
        ongoing.attachment.kind === "area"
          ? ongoing.attachment
          : ongoing.attachment.kind === "hole" &&
              ongoing.attachment.value.kind === "area"
            ? ongoing.attachment.value
            : undefined;
      return spellProcedureHasRedundantSignature({
        kind: "oneOfFiveWitnessesMayBeMissing",
        witnesses: [
          {
            name: "header",
            present:
              ongoing.level === MAGIC_SUPPRESSION_EMANATION_LEVEL &&
              ongoing.school === "abjuration" &&
              ongoing.castingTime.kind === "action",
          },
          {
            name: "selfMaterial",
            present:
              ongoing.range.kind === "self" &&
              ongoing.components.m === MAGIC_SUPPRESSION_EMANATION_MATERIAL,
          },
          {
            name: "duration",
            present:
              ongoing.duration.kind === "concentration" &&
              ongoing.duration.upTo.unit === "hour" &&
              ongoing.duration.upTo.amount ===
                MAGIC_SUPPRESSION_EMANATION_DURATION_HOURS,
          },
          {
            name: "emanation",
            present:
              area?.origin.kind === "self" &&
              area.shape.kind === "emanation" &&
              area.shape.radiusFeet === MAGIC_SUPPRESSION_EMANATION_RADIUS_FEET,
          },
          {
            name: "suppression",
            present: ongoing.operations.some(
              ({ effect }) => effect.kind === "suppress_ongoing_magic_effects",
            ),
          },
        ],
      });
    }),
    Match.whenOr(
      { family: "modal_ongoing_effect" },
      { family: "activation" },
      { family: "modal_activation" },
      { family: "triggered_reaction" },
      { family: "passive_hit_intercept" },
      { family: "anchored_trigger" },
      { family: "magic_circle_ward" },
      { family: "stone_merge" },
      { family: "glyph_warding" },
      { family: "spawned_creature" },
      { family: "reanimated_creature" },
      { family: "templated_multi_spawn" },
      { family: "object_repair" },
      { family: "minor_magic_effect_menu" },
      () => false,
    ),
    Match.exhaustive,
  );
}

function isUnownedMagicSuppressionEffectKind(
  kind: MagicSuppressionEmanationOperation["effect"]["kind"],
): kind is UnownedEffectKind {
  return UNOWNED_EFFECT_KINDS.some((candidate) => candidate === kind);
}

function hasExactMagicSuppressionExceptions(
  values: readonly MagicSuppressionSourceException[] | undefined,
): boolean {
  return (
    values !== undefined &&
    values.length === MAGIC_SUPPRESSION_EXEMPT_SOURCES.length &&
    new Set(values).size === values.length &&
    MAGIC_SUPPRESSION_EXEMPT_SOURCES.every((source) => values.includes(source))
  );
}

type MagicSuppressionEmanationInspection =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "unsupported";
      readonly issues: readonly [
        MagicSuppressionEmanationIssueFact,
        ...MagicSuppressionEmanationIssueFact[],
      ];
    }
  | {
      readonly tag: "parsed";
      readonly facts: MagicSuppressionEmanationMechanicsFacts;
      readonly evidence: SpellProcedureMechanicsEvidence;
    };

function inspectMagicSuppressionEmanationMechanics(
  source: SpellMechanicsAdmissionSource,
): MagicSuppressionEmanationInspection {
  if (!isMagicSuppressionEmanationRepresentation(source.mechanics))
    return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  const issues: MagicSuppressionEmanationIssueFact[] = [];
  const push = (
    failedFact: MagicSuppressionEmanationFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  if (!spellMechanicsObjectHasOnlyKeys(mechanics, ROOT_FIELDS))
    push("mechanics", spellMechanicsRootPath());
  if (mechanics.level !== MAGIC_SUPPRESSION_EMANATION_LEVEL)
    push("level", spellMechanicsHeaderPath("level"));
  if (mechanics.school !== "abjuration")
    push("school", spellMechanicsHeaderPath("school"));
  if (
    mechanics.range.kind !== "self" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.range, RANGE_FIELDS)
  )
    push("range", spellMechanicsHeaderPath("range"));
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    mechanics.components.m !== MAGIC_SUPPRESSION_EMANATION_MATERIAL ||
    !spellMechanicsObjectHasOnlyKeys<MagicSuppressionComponentKeySpace>(
      mechanics.components,
      COMPONENT_FIELDS,
    )
  )
    push("components", spellMechanicsHeaderPath("components"));
  for (const path of spellConsumedMaterialEvidencePaths(mechanics.components))
    push("components", path);
  if (
    mechanics.castingTime.kind !== "action" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.castingTime, CASTING_TIME_FIELDS)
  )
    push("castingTime", spellMechanicsHeaderPath("castingTime"));

  const duration =
    mechanics.duration.kind === "concentration"
      ? mechanics.duration
      : undefined;
  const durationValue = duration?.upTo;
  const durationTicks =
    durationValue !== undefined &&
    durationValue.unit === "hour" &&
    durationValue.amount === MAGIC_SUPPRESSION_EMANATION_DURATION_HOURS &&
    isSpellCanonicalDurationValue(durationValue) &&
    spellMechanicsObjectHasOnlyKeys(durationValue, DURATION_VALUE_FIELDS)
      ? spellDurationTicksFromCanonicalValue(durationValue)
      : undefined;
  if (
    duration === undefined ||
    !spellMechanicsObjectHasOnlyKeys(duration, DURATION_FIELDS)
  )
    push("duration", spellMechanicsHeaderPath("duration"));
  if (durationTicks === undefined)
    for (const path of spellDurationValueEvidencePaths(mechanics.duration))
      push("durationValue", path);
  for (const child of spellDurationChildCoordinates(mechanics.duration))
    push(spellDurationChildFailedFact(child), spellDurationChildPath(child));

  const areaAdmission = admitSpellAreaAttachment(mechanics.attachment, [], []);
  const area =
    areaAdmission.tag === "admitted"
      ? areaAdmission.attachment.kind === "area"
        ? areaAdmission.attachment
        : areaAdmission.attachment.value
      : undefined;
  const radiusFeet =
    area?.origin.kind === "self" &&
    area.shape.kind === "emanation" &&
    area.shape.radiusFeet === MAGIC_SUPPRESSION_EMANATION_RADIUS_FEET
      ? movementFeet(area.shape.radiusFeet)
      : undefined;
  if (radiusFeet === undefined)
    push("attachment", spellOngoingAttachmentPath());
  if (mechanics.initialPhase !== undefined)
    push("initialPhase", spellOngoingInitialPhasePath());
  for (const [index] of (
    mechanics.authoredConditionalMechanics ?? []
  ).entries())
    push(
      "authoredConditionalMechanics",
      spellOngoingAuthoredConditionalMechanicPath(PositiveInteger(index + 1)),
    );

  const occurrences = spellOngoingOperationOccurrences(mechanics);
  const suppressionOccurrences = occurrences.filter(
    ({ operation }) =>
      operation.effect.kind === "suppress_ongoing_magic_effects",
  );
  const suppression =
    suppressionOccurrences.length === 1 ? suppressionOccurrences[0] : undefined;
  const unownedOccurrences = occurrences.filter(({ operation }) =>
    isUnownedMagicSuppressionEffectKind(operation.effect.kind),
  );
  const unownedRoleOccurrences = UNOWNED_EFFECT_KINDS.map((kind) =>
    occurrences.filter(({ operation }) => operation.effect.kind === kind),
  );
  const recognizedOrdinals = [
    ...suppressionOccurrences,
    ...unownedOccurrences,
  ].map(({ ordinal }) => ordinal);
  const everyExpectedOperationRoleIsPresent =
    suppressionOccurrences.length > 0 &&
    unownedRoleOccurrences.every(
      (roleOccurrences) => roleOccurrences.length > 0,
    );
  for (const occurrence of occurrences) {
    const operationPath = spellOngoingOperationPath(occurrence.ordinal);
    const effectPath = spellOngoingOperationEffectPath(occurrence.ordinal);
    if (
      !spellMechanicsObjectHasOnlyKeys(occurrence.operation, OPERATION_FIELDS)
    )
      push("operation", operationPath);
    if (
      occurrence.operation.trigger.kind !== "passive" ||
      !spellMechanicsObjectHasOnlyKeys(
        occurrence.operation.trigger,
        TRIGGER_FIELDS,
      )
    )
      push("operationTrigger", operationPath);
    for (const failedFact of spellOngoingOperationUnsupportedFacts(
      occurrence.operation,
    ))
      push(
        Match.value(failedFact).pipe(
          Match.when("predicate", () => "operationPredicate" as const),
          Match.when("targetLimit", () => "operationTargetLimit" as const),
          Match.when("usageLimit", () => "operationUsageLimit" as const),
          Match.exhaustive,
        ),
        operationPath,
      );
    if (!recognizedOrdinals.includes(occurrence.ordinal)) {
      push("operationEffect", effectPath);
      if (everyExpectedOperationRoleIsPresent)
        push("operationCount", operationPath);
    }
    if (
      isUnownedMagicSuppressionEffectKind(occurrence.operation.effect.kind) &&
      !spellMechanicsObjectHasOnlyKeys(
        occurrence.operation.effect,
        UNOWNED_EFFECT_FIELDS,
      )
    )
      push("operationEffect", effectPath);
  }
  if (suppression === undefined)
    push("suppressionOperation", spellMechanicsRootPath());
  for (const duplicate of suppressionOccurrences.slice(1))
    push("operationCount", spellOngoingOperationPath(duplicate.ordinal));
  for (const roleOccurrences of unownedRoleOccurrences) {
    if (roleOccurrences.length === 0)
      push("operationCount", spellMechanicsRootPath());
    for (const duplicate of roleOccurrences.slice(1))
      push("operationCount", spellOngoingOperationPath(duplicate.ordinal));
  }

  for (const occurrence of suppressionOccurrences) {
    const effect = occurrence.operation.effect;
    const effectPath = spellOngoingOperationEffectPath(occurrence.ordinal);
    if (effect.kind !== "suppress_ongoing_magic_effects") continue;
    if (!spellMechanicsObjectHasOnlyKeys(effect, SUPPRESSION_EFFECT_FIELDS))
      push("operationEffect", effectPath);
    if (effect.suppressedTimeCountsAgainstDuration !== true)
      push("suppressedTimeCountsAgainstDuration", effectPath);
    if (!hasExactMagicSuppressionExceptions(effect.exceptSources))
      push("exceptSources", effectPath);
  }

  const suppressionEffect =
    suppression?.operation.effect.kind === "suppress_ongoing_magic_effects"
      ? suppression.operation.effect
      : undefined;
  const suppressedTimeCountsAgainstDuration =
    suppressionEffect?.suppressedTimeCountsAgainstDuration === true
      ? suppressionEffect.suppressedTimeCountsAgainstDuration
      : undefined;
  const unownedPaths = spellProcedureNonEmpty(
    unownedOccurrences.map(({ ordinal }) =>
      spellOngoingOperationEffectPath(ordinal),
    ),
  );

  const unsupported = spellProcedureNonEmpty(
    spellUniqueMechanicsIssues(issues),
  );
  if (unsupported !== undefined)
    return { tag: "unsupported", issues: unsupported };
  if (
    durationTicks === undefined ||
    radiusFeet === undefined ||
    suppression === undefined ||
    unownedPaths === undefined ||
    suppressedTimeCountsAgainstDuration === undefined ||
    suppressionEffect === undefined ||
    !hasExactMagicSuppressionExceptions(suppressionEffect.exceptSources)
  )
    return {
      tag: "unsupported",
      issues: [
        {
          failedFact: "mechanics",
          mechanicsPath: spellMechanicsRootPath(),
        },
      ],
    };
  return {
    tag: "parsed",
    facts: {
      ...source.spellDefinitionRuleFacts,
      radiusFeet,
      durationTicks,
      rangeFeet: movementFeet(0),
      exceptSources: MAGIC_SUPPRESSION_EXEMPT_SOURCES,
      suppressedTimeCountsAgainstDuration,
    },
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
        ...occurrences.map(({ ordinal }) => spellOngoingOperationPath(ordinal)),
        spellOngoingOperationEffectPath(suppression.ordinal),
      ],
      unowned: unownedPaths,
    },
  };
}

function admitMagicSuppressionEmanationMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "magicSuppressionEmanation",
  MagicSuppressionEmanationMechanicsFacts,
  MagicSuppressionEmanationInvocation,
  MagicSuppressionEmanationAdmissionIssue
> {
  return Match.value(inspectMagicSuppressionEmanationMechanics(source)).pipe(
    Match.when({ tag: "notRepresented" }, () => ({
      tag: "notRepresented" as const,
    })),
    Match.when({ tag: "unsupported" }, ({ issues }) => ({
      tag: "unsupported" as const,
      issues: spellProcedureMapNonEmpty(
        issues,
        ({ failedFact, mechanicsPath }) =>
          magicSuppressionEmanationIssue(failedFact, mechanicsPath),
      ),
    })),
    Match.when({ tag: "parsed" }, ({ facts, evidence }) => ({
      tag: "supported" as const,
      admitted: {
        binding: "ready" as const,
        procedure: "magicSuppressionEmanation" as const,
        facts,
        evidence,
        admit: (
          spell: BattleSpellExecutionSource,
          ctx: SpellAdmissionContext,
        ) => admitMagicSuppressionEmanation(spell, ctx, facts),
      },
    })),
    Match.exhaustive,
  );
}

function admitMagicSuppressionEmanation(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: MagicSuppressionEmanationMechanicsFacts,
): readonly MagicSuppressionEmanationInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly MagicSuppressionEmanationInvocation[] => {
      if (Number(slot.spellLevel) < facts.level) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "magicSuppressionEmanation",
          spell,
          targeting: {
            kind: "selfOriginEmanation",
            radiusFeet: facts.radiusFeet,
          },
          durationTicks: facts.durationTicks,
          rangeFeet: facts.rangeFeet,
          exceptSources: facts.exceptSources,
        },
      ];
    },
  );
}

function resolveMagicSuppressionEmanation(
  input: MagicSuppressionEmanationResolveInput,
): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      spellAreaChoiceHoleId(input.invocation),
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "magic-suppression emanation uses one table-supplied antimagic Emanation fill.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.areaChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAreaChoiceHole(input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.areaChoice.kind !== "magicSuppressionSelfEmanation" ||
    input.fillSet.areaChoice.areaId.length === 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "magic-suppression emanation area id must be a non-empty antimagic Emanation area.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.areaChoice.auraMembership.nonOriginCombatantIds.includes(
      input.actorId,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "magic-suppression emanation non-origin aura membership cannot include the source combatant.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const invalidAffectedEffects = magicSuppressionAreaChoiceInvalidReason(
    input.input.state,
    input.fillSet.areaChoice,
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (invalidAffectedEffects !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      invalidAffectedEffects,
    );
  }
  /* v8 ignore stop -- @preserve */

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const nextState = applyMagicSuppressionEmanationCastEffect({
    state: resourced.state,
    actorId: input.actorId,
    areaId: input.fillSet.areaChoice.areaId,
    auraMembership: input.fillSet.areaChoice.auraMembership,
    affectedOngoingSpellEffects:
      input.fillSet.areaChoice.affectedOngoingSpellEffects,
    invocation: input.invocation,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function magicSuppressionAreaChoiceInvalidReason(
  state: ActionSpellBattleResolutionInput["state"],
  areaChoice: BattleMagicSuppressionAreaChoice,
): string | null {
  const trackedEffects = trackedOngoingSpellEffectKeys(state);
  for (const affected of areaChoice.affectedOngoingSpellEffects) {
    if (!trackedEffects.has(ongoingSpellEffectRefKey(affected.effect))) {
      return "magic-suppression emanation affected effect must reference a tracked ongoing spell effect.";
    }
  }
  return null;
}

function trackedOngoingSpellEffectKeys(
  state: ActionSpellBattleResolutionInput["state"],
): ReadonlySet<string> {
  return new Set([
    ...state.lightEmitters.flatMap((emitter) =>
      isTrackedOngoingSpellLightEmitter(emitter)
        ? [
            ongoingSpellEffectRefKey(
              magicSuppressionOngoingSpellEffectRefForEmitter(emitter),
            ),
          ]
        : [],
    ),
    ...[...state.combatants.values()].flatMap((combatant) =>
      combatant.activeEffects.flatMap((effect) =>
        effect.kind === "spellObjectContactDamage" ||
        effect.kind === "spatialMeleeSpellAttackProxy"
          ? [
              ongoingSpellEffectRefKey(
                magicSuppressionOngoingSpellEffectRefForActiveEffect(effect),
              ),
            ]
          : [],
      ),
    ),
  ]);
}

function applyMagicSuppressionEmanationCastEffect(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly areaId: BattleAreaId;
  readonly auraMembership: BattleMagicSuppressionAreaChoice["auraMembership"];
  readonly affectedOngoingSpellEffects: readonly BattleMagicSuppressionAffectedOngoingSpellEffect[];
  readonly invocation: BattleExecutableSpellInvocation<MagicSuppressionEmanationInvocation>;
}): BattleState {
  const caster = input.state.combatants.get(input.actorId);
  if (caster === undefined) {
    return input.state;
  }
  const suppressedOngoingSpellEffects = input.affectedOngoingSpellEffects
    .filter(
      (effect) =>
        !input.invocation.exceptSources.some(
          (exceptSource) => exceptSource === effect.sourceKind,
        ),
    )
    .map((effect) => effect.effect);
  return replaceTargetSpellActiveEffect(
    input.state,
    input.actorId,
    (effect) =>
      effect.kind === "magicSuppressionEmanation" &&
      effect.sourceProcedureRef === input.invocation.sourceProcedureRef &&
      effect.sourceCombatantId === input.actorId &&
      effect.areaId === input.areaId,
    {
      kind: "magicSuppressionEmanation" as const,
      sourceProcedureRef: input.invocation.sourceProcedureRef,
      sourceCombatantId: input.actorId,
      areaId: input.areaId,
      auraMembership: input.auraMembership,
      suppressedOngoingSpellEffects,
      expiresAt: {
        kind: "concentration" as const,
        combatantId: input.actorId,
        durationTicks: input.invocation.durationTicks,
      },
    },
  );
}

const MagicSuppressionEmanationInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("magicSuppressionEmanation"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("selfOriginEmanation"),
      radiusFeet: MovementFeet,
    }),
    durationTicks: ElapsedTimeTicksSchema,
    rangeFeet: MovementFeet,
    exceptSources: Schema.Tuple([
      Schema.Literal("artifact"),
      Schema.Literal("deity"),
    ]),
  }),
);
export const magicSuppressionEmanationProfile = {
  procedure: "magicSuppressionEmanation",
  executionSchema: MagicSuppressionEmanationInvocationSchema,
  admitMechanics: admitMagicSuppressionEmanationMechanics,
  discoverCastAct: discoverActionSpellAreaCastAct,
  resolve: resolveMagicSuppressionEmanation,
} satisfies SpellProcedureDeclaration<
  "magicSuppressionEmanation",
  MagicSuppressionEmanationInvocation,
  MagicSuppressionEmanationMechanicsFacts,
  MagicSuppressionEmanationAdmissionIssue
>;
