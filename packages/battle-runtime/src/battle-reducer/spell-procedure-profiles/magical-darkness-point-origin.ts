import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magical-darkness-point-origin
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
  spellOngoingAuthoredConditionalEffectPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import { Match, Schema } from "effect";

import {
  type BattleResolutionResult,
  type BattleSpellExecutionSource,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  BattleSpellEffectLevel,
  parseBattleSpellEffectLevel,
} from "../spells-effective-level.ts";
import {
  LeveledSpellInvocationResourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
} from "../codec-building-blocks.ts";
import { discoverActionSpellAreaCastAct } from "../spell-area-cast-discovery.ts";
import { resolveMagicalDarknessPointOriginSpellAct } from "../spells-resolve-area-effects.ts";
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
  spellMechanicsObjectHasOnlyKeys,
  spellConsumedMaterialEvidencePaths,
  spellDurationChildCoordinates,
  spellDurationChildFailedFact,
  spellDurationChildPath,
  spellDurationTicksFromCanonicalValue,
  spellDurationValueEvidencePaths,
  isSpellCanonicalDurationValue,
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

// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE

type MagicalDarknessPointOriginSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "magicalDarknessPointOrigin" }
>;
type MagicalDarknessPointOriginResolveInput =
  SpellProcedureProfileResolveInput<MagicalDarknessPointOriginSpellInvocation>;
type MagicalDarknessPointOriginMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type MagicalDarknessPointOriginOperation =
  MagicalDarknessPointOriginMechanics["operations"][number];
type MagicalDarknessPointOriginDuration = Extract<
  MagicalDarknessPointOriginMechanics["duration"],
  { readonly kind: "concentration" }
>;

const MAGICAL_DARKNESS_LEVEL = 2 as const;
const MAGICAL_DARKNESS_RANGE_FEET = 60 as const;
const MAGICAL_DARKNESS_DURATION_MINUTES = 10 as const;
const MAGICAL_DARKNESS_RADIUS_FEET = 15 as const;
const MAGICAL_DARKNESS_DISPEL_LIGHT_MAX_SPELL_LEVEL = 2 as const;
const MAGICAL_DARKNESS_MATERIAL = "bat fur and a piece of coal" as const;

type MagicalDarknessPointOriginMechanicsFacts = SpellProcedureMechanicsFacts & {
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: MovementFeetType;
  readonly radiusFeet: MovementFeetType;
  readonly dispelledSpellCreatedLightMaxSpellLevel: BattleSpellEffectLevel;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for MagicalDarknessPointOriginFailedFact.
const MAGICAL_DARKNESS_FAILED_FACTS = [
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
  "authoredConditionalEffects",
  "operationCount",
  "darknessOperation",
  "darknessEffect",
  "dispelLightOperation",
  "dispelLightEffect",
] as const;
type MagicalDarknessPointOriginFailedFact =
  (typeof MAGICAL_DARKNESS_FAILED_FACTS)[number];
type MagicalDarknessPointOriginAdmissionIssue = SpellProcedureAdmissionIssue<
  "magicalDarknessPointOrigin",
  MagicalDarknessPointOriginFailedFact,
  UnitMechanicsPath
>;

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
  "authoredConditionalEffects",
] as const satisfies ReadonlyArray<keyof MagicalDarknessPointOriginMechanics>;
const RANGE_FIELDS = ["kind", "feet"] as const;
const COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
  "materialCostGp",
  "materialConsumed",
] as const;
const CASTING_TIME_FIELDS = ["kind"] as const;
const DURATION_FIELDS = ["kind", "upTo", "earlyEnd"] as const;
const DURATION_VALUE_FIELDS = [
  "unit",
  "amount",
  "upcastTiers",
] as const satisfies ReadonlyArray<
  keyof MagicalDarknessPointOriginDuration["upTo"]
>;
const ATTACHMENT_FIELDS = ["kind", "holeId", "label", "value"] as const;
const AREA_FIELDS = ["kind", "origin", "shape"] as const;
const ORIGIN_FIELDS = ["kind"] as const;
const SHAPE_FIELDS = ["kind", "radiusFeet"] as const;
const OPERATION_FIELDS = ["trigger", "effect"] as const;
const TRIGGER_FIELDS = ["kind"] as const;
const DARKNESS_EFFECT_FIELDS = ["kind"] as const;
const DISPEL_LIGHT_EFFECT_FIELDS = ["kind", "maxSpellLevel"] as const;

function magicalDarknessPointOriginIssue(
  failedFact: MagicalDarknessPointOriginFailedFact,
  mechanicsPath: UnitMechanicsPath,
): MagicalDarknessPointOriginAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "magicalDarknessPointOrigin",
    failedFact,
    mechanicsPath,
    message: `Unsupported magicalDarknessPointOrigin mechanics fact: ${failedFact}.`,
  };
}

function magicalDarknessPointOriginRepresentation(
  mechanics: SpellMechanics,
): mechanics is MagicalDarknessPointOriginMechanics {
  return Match.value(mechanics).pipe(
    Match.when({ family: "ongoing_effect" }, (ongoing) => {
      const area =
        ongoing.attachment.kind === "hole" &&
        ongoing.attachment.value.kind === "area"
          ? ongoing.attachment.value
          : undefined;
      const hasDarknessEffect = ongoing.operations.some(
        ({ effect }) => effect.kind === "area_is_magical_darkness",
      );
      const hasDispelLightEffect = ongoing.operations.some(
        ({ effect }) =>
          effect.kind === "end_overlapping_spell_created_bright_or_dim_light",
      );
      return spellProcedureHasRedundantSignature({
        kind: "oneOfFiveWitnessesMayBeMissing",
        witnesses: [
          {
            name: "header",
            present:
              ongoing.level === MAGICAL_DARKNESS_LEVEL &&
              ongoing.school === "evocation" &&
              ongoing.castingTime.kind === "action",
          },
          {
            name: "rangeAndComponents",
            present:
              ongoing.range.kind === "point" &&
              ongoing.range.feet === MAGICAL_DARKNESS_RANGE_FEET &&
              ongoing.components.v === true &&
              ongoing.components.s === false &&
              ongoing.components.m === MAGICAL_DARKNESS_MATERIAL,
          },
          {
            name: "duration",
            present:
              ongoing.duration.kind === "concentration" &&
              ongoing.duration.upTo.unit === "minute" &&
              ongoing.duration.upTo.amount ===
                MAGICAL_DARKNESS_DURATION_MINUTES,
          },
          {
            name: "pointOriginSphere",
            present:
              area?.origin.kind === "point_within_range" &&
              area.shape.kind === "sphere" &&
              area.shape.radiusFeet === MAGICAL_DARKNESS_RADIUS_FEET,
          },
          {
            name: "operations",
            present: hasDarknessEffect && hasDispelLightEffect,
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

type MagicalDarknessPointOriginInspection =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "unsupported";
      readonly issues: readonly [
        {
          readonly failedFact: MagicalDarknessPointOriginFailedFact;
          readonly mechanicsPath: UnitMechanicsPath;
        },
        ...Array<{
          readonly failedFact: MagicalDarknessPointOriginFailedFact;
          readonly mechanicsPath: UnitMechanicsPath;
        }>,
      ];
    }
  | {
      readonly tag: "parsed";
      readonly facts: MagicalDarknessPointOriginMechanicsFacts;
      readonly evidence: SpellProcedureMechanicsEvidence;
    };

type MagicalDarknessSourceFactProjection<Fact> =
  | { readonly tag: "parsed"; readonly fact: Fact }
  | {
      readonly tag: "unsupported";
      readonly issue: {
        readonly failedFact: MagicalDarknessPointOriginFailedFact;
        readonly mechanicsPath: UnitMechanicsPath;
      };
    };

function magicalDarknessRangeProjection(
  range: MagicalDarknessPointOriginMechanics["range"],
): MagicalDarknessSourceFactProjection<MovementFeetType> {
  return range.kind === "point" &&
    typeof range.feet === "number" &&
    range.feet === MAGICAL_DARKNESS_RANGE_FEET &&
    spellMechanicsObjectHasOnlyKeys(range, RANGE_FIELDS)
    ? { tag: "parsed", fact: movementFeet(range.feet) }
    : {
        tag: "unsupported",
        issue: {
          failedFact: "range",
          mechanicsPath: spellMechanicsHeaderPath("range"),
        },
      };
}

function magicalDarknessDurationProjection(
  duration: MagicalDarknessPointOriginMechanics["duration"],
): MagicalDarknessSourceFactProjection<{
  readonly ticks: ElapsedTimeTicks;
}> {
  if (duration.kind !== "concentration")
    return {
      tag: "unsupported",
      issue: {
        failedFact: "duration",
        mechanicsPath: spellMechanicsHeaderPath("duration"),
      },
    };
  const value = duration.upTo;
  if (
    value.unit !== "minute" ||
    value.amount !== MAGICAL_DARKNESS_DURATION_MINUTES ||
    !isSpellCanonicalDurationValue(value) ||
    !spellMechanicsObjectHasOnlyKeys(value, DURATION_VALUE_FIELDS)
  )
    return {
      tag: "unsupported",
      issue: {
        failedFact: "durationValue",
        mechanicsPath: spellDurationValuePath(),
      },
    };
  return {
    tag: "parsed",
    fact: {
      ticks: spellDurationTicksFromCanonicalValue(value),
    },
  };
}

function magicalDarknessAttachmentProjection(
  attachment: MagicalDarknessPointOriginMechanics["attachment"],
): MagicalDarknessSourceFactProjection<MovementFeetType> {
  if (
    attachment.kind !== "hole" ||
    !spellMechanicsObjectHasOnlyKeys(attachment, ATTACHMENT_FIELDS) ||
    attachment.value.kind !== "area" ||
    !spellMechanicsObjectHasOnlyKeys(attachment.value, AREA_FIELDS) ||
    attachment.value.origin.kind !== "point_within_range" ||
    !spellMechanicsObjectHasOnlyKeys(attachment.value.origin, ORIGIN_FIELDS) ||
    attachment.value.shape.kind !== "sphere" ||
    !spellMechanicsObjectHasOnlyKeys(attachment.value.shape, SHAPE_FIELDS) ||
    typeof attachment.value.shape.radiusFeet !== "number" ||
    attachment.value.shape.radiusFeet !== MAGICAL_DARKNESS_RADIUS_FEET
  )
    return {
      tag: "unsupported",
      issue: {
        failedFact: "attachment",
        mechanicsPath: spellOngoingAttachmentPath(),
      },
    };
  return {
    tag: "parsed",
    fact: movementFeet(attachment.value.shape.radiusFeet),
  };
}

function operationShellIsSupported(
  operation: MagicalDarknessPointOriginOperation | undefined,
): boolean {
  return (
    operation !== undefined &&
    spellMechanicsObjectHasOnlyKeys(operation, OPERATION_FIELDS) &&
    operation.trigger.kind === "passive" &&
    spellMechanicsObjectHasOnlyKeys(operation.trigger, TRIGGER_FIELDS)
  );
}

function darknessEffectIsSupported(
  operation: MagicalDarknessPointOriginOperation | undefined,
): boolean {
  return (
    operation?.effect.kind === "area_is_magical_darkness" &&
    spellMechanicsObjectHasOnlyKeys(operation.effect, DARKNESS_EFFECT_FIELDS)
  );
}

function dispelLightEffectLevel(
  operation: MagicalDarknessPointOriginOperation | undefined,
): BattleSpellEffectLevel | undefined {
  if (
    operation?.effect.kind !==
      "end_overlapping_spell_created_bright_or_dim_light" ||
    !spellMechanicsObjectHasOnlyKeys(
      operation.effect,
      DISPEL_LIGHT_EFFECT_FIELDS,
    )
  )
    return undefined;
  return (
    parseBattleSpellEffectLevel(operation.effect.maxSpellLevel) ?? undefined
  );
}

function magicalDarknessDispelLightProjection(
  operation: MagicalDarknessPointOriginOperation | undefined,
  ordinal: PositiveInteger,
): MagicalDarknessSourceFactProjection<BattleSpellEffectLevel> {
  const maxSpellLevel = dispelLightEffectLevel(operation);
  return maxSpellLevel === MAGICAL_DARKNESS_DISPEL_LIGHT_MAX_SPELL_LEVEL
    ? { tag: "parsed", fact: maxSpellLevel }
    : {
        tag: "unsupported",
        issue: {
          failedFact: "dispelLightEffect",
          mechanicsPath: spellOngoingOperationEffectPath(ordinal),
        },
      };
}

function magicalDarknessPointOriginEvidence(
  darknessOrdinal: PositiveInteger,
  dispelLightOrdinal: PositiveInteger,
): SpellProcedureMechanicsEvidence {
  return {
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
      spellOngoingOperationPath(darknessOrdinal),
      spellOngoingOperationEffectPath(darknessOrdinal),
      spellOngoingOperationPath(dispelLightOrdinal),
      spellOngoingOperationEffectPath(dispelLightOrdinal),
    ],
    unowned: [],
  };
}

function inspectMagicalDarknessPointOriginMechanics(
  source: SpellMechanicsAdmissionSource,
): MagicalDarknessPointOriginInspection {
  if (!magicalDarknessPointOriginRepresentation(source.mechanics))
    return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  const issues: Array<{
    readonly failedFact: MagicalDarknessPointOriginFailedFact;
    readonly mechanicsPath: UnitMechanicsPath;
  }> = [];
  const pushIssue = (
    failedFact: MagicalDarknessPointOriginFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  if (!spellMechanicsObjectHasOnlyKeys(mechanics, ROOT_FIELDS))
    pushIssue("mechanics", spellMechanicsRootPath());
  if (mechanics.level !== MAGICAL_DARKNESS_LEVEL)
    pushIssue("level", spellMechanicsHeaderPath("level"));
  if (mechanics.school !== "evocation")
    pushIssue("school", spellMechanicsHeaderPath("school"));
  const rangeProjection = magicalDarknessRangeProjection(mechanics.range);
  if (rangeProjection.tag === "unsupported") issues.push(rangeProjection.issue);
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== false ||
    mechanics.components.m !== MAGICAL_DARKNESS_MATERIAL ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.components, COMPONENT_FIELDS)
  )
    pushIssue("components", spellMechanicsHeaderPath("components"));
  for (const path of spellConsumedMaterialEvidencePaths(mechanics.components))
    pushIssue("components", path);
  if (
    mechanics.castingTime.kind !== "action" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.castingTime, CASTING_TIME_FIELDS)
  )
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));

  const durationProjection = magicalDarknessDurationProjection(
    mechanics.duration,
  );
  if (durationProjection.tag === "unsupported")
    issues.push(durationProjection.issue);
  if (mechanics.duration.kind !== "concentration") {
    for (const path of spellDurationValueEvidencePaths(mechanics.duration))
      pushIssue("durationValue", path);
    for (const child of spellDurationChildCoordinates(mechanics.duration))
      pushIssue(
        spellDurationChildFailedFact(child),
        spellDurationChildPath(child),
      );
  } else {
    if (!spellMechanicsObjectHasOnlyKeys(mechanics.duration, DURATION_FIELDS))
      pushIssue("duration", spellMechanicsHeaderPath("duration"));
    for (const child of spellDurationChildCoordinates(mechanics.duration))
      pushIssue(
        spellDurationChildFailedFact(child),
        spellDurationChildPath(child),
      );
  }

  const attachment = mechanics.attachment;
  const attachmentProjection = magicalDarknessAttachmentProjection(attachment);
  if (attachmentProjection.tag === "unsupported")
    issues.push(attachmentProjection.issue);
  if (mechanics.initialPhase !== undefined)
    pushIssue("initialPhase", spellOngoingInitialPhasePath());
  for (const [index] of (mechanics.authoredConditionalEffects ?? []).entries())
    pushIssue(
      "authoredConditionalEffects",
      spellOngoingAuthoredConditionalEffectPath(PositiveInteger(index + 1)),
    );

  const darknessIndex = mechanics.operations.findIndex(
    ({ effect }) => effect.kind === "area_is_magical_darkness",
  );
  const dispelLightIndex = mechanics.operations.findIndex(
    ({ effect }) =>
      effect.kind === "end_overlapping_spell_created_bright_or_dim_light",
  );
  let nextMissingOperationIndex = mechanics.operations.length;
  const darknessOrdinal =
    darknessIndex >= 0
      ? PositiveInteger(darknessIndex + 1)
      : PositiveInteger((nextMissingOperationIndex += 1));
  const dispelLightOrdinal =
    dispelLightIndex >= 0
      ? PositiveInteger(dispelLightIndex + 1)
      : PositiveInteger((nextMissingOperationIndex += 1));
  const darknessOperation =
    darknessIndex >= 0 ? mechanics.operations[darknessIndex] : undefined;
  const dispelLightOperation =
    dispelLightIndex >= 0 ? mechanics.operations[dispelLightIndex] : undefined;

  for (const [index] of mechanics.operations.entries()) {
    if (index !== darknessIndex && index !== dispelLightIndex)
      pushIssue(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 1)),
      );
  }
  for (
    let absentIndex = mechanics.operations.length;
    absentIndex < 2;
    absentIndex += 1
  )
    pushIssue(
      "operationCount",
      spellOngoingOperationPath(PositiveInteger(absentIndex + 1)),
    );
  if (!operationShellIsSupported(darknessOperation))
    pushIssue("darknessOperation", spellOngoingOperationPath(darknessOrdinal));
  if (!darknessEffectIsSupported(darknessOperation))
    pushIssue(
      "darknessEffect",
      spellOngoingOperationEffectPath(darknessOrdinal),
    );
  if (!operationShellIsSupported(dispelLightOperation))
    pushIssue(
      "dispelLightOperation",
      spellOngoingOperationPath(dispelLightOrdinal),
    );
  const dispelLightProjection = magicalDarknessDispelLightProjection(
    dispelLightOperation,
    dispelLightOrdinal,
  );
  if (dispelLightProjection.tag === "unsupported")
    issues.push(dispelLightProjection.issue);

  const factsProjection =
    rangeProjection.tag === "parsed" &&
    durationProjection.tag === "parsed" &&
    attachmentProjection.tag === "parsed" &&
    dispelLightProjection.tag === "parsed"
      ? {
          tag: "parsed" as const,
          facts: {
            ...source.spellDefinitionRuleFacts,
            durationTicks: durationProjection.fact.ticks,
            rangeFeet: rangeProjection.fact,
            radiusFeet: attachmentProjection.fact,
            dispelledSpellCreatedLightMaxSpellLevel: dispelLightProjection.fact,
          },
          evidence: magicalDarknessPointOriginEvidence(
            darknessOrdinal,
            dispelLightOrdinal,
          ),
        }
      : {
          tag: "unsupported" as const,
          issues: [
            ...(rangeProjection.tag === "unsupported"
              ? [rangeProjection.issue]
              : []),
            ...(durationProjection.tag === "unsupported"
              ? [durationProjection.issue]
              : []),
            ...(attachmentProjection.tag === "unsupported"
              ? [attachmentProjection.issue]
              : []),
            ...(dispelLightProjection.tag === "unsupported"
              ? [dispelLightProjection.issue]
              : []),
          ],
        };

  const failures = spellProcedureNonEmpty(spellUniqueMechanicsIssues(issues));
  if (failures !== undefined) return { tag: "unsupported", issues: failures };
  return factsProjection;
}

function admitMagicalDarknessPointOriginMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "magicalDarknessPointOrigin",
  MagicalDarknessPointOriginMechanicsFacts,
  MagicalDarknessPointOriginSpellInvocation,
  MagicalDarknessPointOriginAdmissionIssue
> {
  return Match.value(inspectMagicalDarknessPointOriginMechanics(source)).pipe(
    Match.when({ tag: "notRepresented" }, () => ({
      tag: "notRepresented" as const,
    })),
    Match.when({ tag: "unsupported" }, ({ issues }) => ({
      tag: "unsupported" as const,
      issues: spellProcedureMapNonEmpty(
        issues,
        ({ failedFact, mechanicsPath }) =>
          magicalDarknessPointOriginIssue(failedFact, mechanicsPath),
      ),
    })),
    Match.when({ tag: "parsed" }, ({ facts, evidence }) => ({
      tag: "supported" as const,
      admitted: {
        binding: "ready" as const,
        procedure: "magicalDarknessPointOrigin" as const,
        facts,
        evidence,
        admit: (
          spell: BattleSpellExecutionSource,
          ctx: SpellAdmissionContext,
        ) => admitMagicalDarknessPointOrigin(spell, ctx, facts),
      },
    })),
    Match.exhaustive,
  );
}

function admitMagicalDarknessPointOrigin(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: MagicalDarknessPointOriginMechanicsFacts,
): readonly MagicalDarknessPointOriginSpellInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly MagicalDarknessPointOriginSpellInvocation[] => {
      if (Number(slot.spellLevel) < facts.level) return [];
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "magicalDarknessPointOrigin",
          spell,
          targeting: {
            kind: "pointOriginSphere",
            radiusFeet: facts.radiusFeet,
          },
          durationTicks: facts.durationTicks,
          rangeFeet: facts.rangeFeet,
          dispelledSpellCreatedLightMaxSpellLevel:
            facts.dispelledSpellCreatedLightMaxSpellLevel,
        },
      ];
    },
  );
}

function resolveMagicalDarknessPointOrigin(
  input: MagicalDarknessPointOriginResolveInput,
): BattleResolutionResult {
  return resolveMagicalDarknessPointOriginSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

const MagicalDarknessPointOriginInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("magicalDarknessPointOrigin"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("pointOriginSphere"),
        radiusFeet: MovementFeet,
      }),
      durationTicks: ElapsedTimeTicksSchema,
      rangeFeet: MovementFeet,
      dispelledSpellCreatedLightMaxSpellLevel: BattleSpellEffectLevel,
    }),
  );

export const magicalDarknessPointOriginProfile = {
  procedure: "magicalDarknessPointOrigin",
  executionSchema: MagicalDarknessPointOriginInvocationSchema,
  admitMechanics: admitMagicalDarknessPointOriginMechanics,
  discoverCastAct: discoverActionSpellAreaCastAct,
  resolve: resolveMagicalDarknessPointOrigin,
} satisfies SpellProcedureDeclaration<
  "magicalDarknessPointOrigin",
  MagicalDarknessPointOriginSpellInvocation,
  MagicalDarknessPointOriginMechanicsFacts,
  MagicalDarknessPointOriginAdmissionIssue
>;
