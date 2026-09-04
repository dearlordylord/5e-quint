import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-fog-cloud-obscurement
import {
  elapsedTimeTicks,
  ELAPSED_TIME_TICKS_PER_HOUR,
  ElapsedTimeTicksSchema,
} from "@dnd/shared/elapsed-time";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE
//
// The Fog Cloud Spell Procedure Profile: action-time Spell Slot casting creates
// a caster-owned Concentration Sphere of Heavily Obscured fog. The runtime owns
// Spell Slot spending, slot-scaled radius, Concentration duration, Heavily
// Obscured area projection, and typed strong-wind cleanup; the table owns
// spatial area membership, line-of-sight derivation, wind derivation, and map
// geometry.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-E-L.md "Fog Cloud": Action;
//     120 feet; Concentration up to 1 hour; 20-foot-radius Sphere centered on
//     a point within range; Sphere is Heavily Obscured; strong wind disperses
//     it; +20-foot radius per slot level above 1.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Concentration, Spell Slot, Spell
//     Invocation, Area of Effect/Sphere, and Heavily Obscured.

import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  movementFeet,
  PositiveInteger,
  spellSlotLevel,
  type MovementFeet as MovementFeetType,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  spellDurationEndingPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingAuthoredConditionalMechanicPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import { Match, Schema } from "effect";

import {
  type BattleResolutionResult,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  LeveledSpellInvocationResourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
} from "../codec-building-blocks.ts";
import { discoverActionSpellAreaCastAct } from "../spell-area-cast-discovery.ts";
import { resolvePersistentAreaTraitSpellAct } from "../spells-resolve-area-effects.ts";
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
  spellDurationValueEvidencePaths,
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

type PersistentAreaTraitSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "persistentAreaTrait" }
>;
type PersistentAreaTraitResolveInput =
  SpellProcedureProfileResolveInput<PersistentAreaTraitSpellInvocation>;
type PersistentAreaObscurementMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type PersistentAreaObscurementOperation =
  PersistentAreaObscurementMechanics["operations"][number];
type PersistentAreaObscurementDuration = Extract<
  PersistentAreaObscurementMechanics["duration"],
  { readonly kind: "concentration" }
>;

const PERSISTENT_AREA_OBSCUREMENT_LEVEL = 1 as const;
const PERSISTENT_AREA_OBSCUREMENT_RANGE_FEET = 120 as const;
const PERSISTENT_AREA_OBSCUREMENT_DURATION_HOURS = 1 as const;
const PERSISTENT_AREA_OBSCUREMENT_BASE_RADIUS_FEET = 20 as const;
const PERSISTENT_AREA_OBSCUREMENT_RADIUS_FEET_PER_SLOT_LEVEL = 20 as const;

type PersistentAreaObscurementMechanicsFacts = SpellProcedureMechanicsFacts & {
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: MovementFeetType;
  readonly radius: {
    readonly baseFeet: MovementFeetType;
    readonly startingSlotLevel: SpellSlotLevel;
    readonly perSlotLevelFeet: MovementFeetType;
  };
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- This module-private tuple is the canonical source for PersistentAreaObscurementFailedFact.
const PERSISTENT_AREA_OBSCUREMENT_FAILED_FACTS = [
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
  "radiusScaling",
  "initialPhase",
  "authoredConditionalMechanics",
  "operationCount",
  "operation",
  "obscurementEffect",
] as const;
type PersistentAreaObscurementFailedFact =
  (typeof PERSISTENT_AREA_OBSCUREMENT_FAILED_FACTS)[number];
type PersistentAreaObscurementAdmissionIssue = SpellProcedureAdmissionIssue<
  "persistentAreaTrait",
  PersistentAreaObscurementFailedFact,
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
  "authoredConditionalMechanics",
] as const satisfies ReadonlyArray<keyof PersistentAreaObscurementMechanics>;
const RANGE_FIELDS = ["kind", "feet"] as const;
const COMPONENT_FIELDS = ["v", "s", "m"] as const;
const CASTING_TIME_FIELDS = ["kind"] as const;
const DURATION_FIELDS = ["kind", "upTo", "earlyEnd"] as const;
const DURATION_VALUE_FIELDS = [
  "unit",
  "amount",
  "upcastTiers",
] as const satisfies ReadonlyArray<
  keyof PersistentAreaObscurementDuration["upTo"]
>;
const ENDING_FIELDS = ["kind"] as const;
const ATTACHMENT_FIELDS = ["kind", "holeId", "label", "value"] as const;
const AREA_FIELDS = ["kind", "origin", "shape"] as const;
const ORIGIN_FIELDS = ["kind"] as const;
const SHAPE_FIELDS = ["kind", "radiusFeet"] as const;
const RADIUS_FIELDS = [
  "kind",
  "axis",
  "base",
  "perLevel",
  "startingAtLevel",
] as const;
const OPERATION_FIELDS = ["trigger", "effect"] as const;
const TRIGGER_FIELDS = ["kind"] as const;
const EFFECT_FIELDS = ["kind"] as const;

function persistentAreaObscurementIssue(
  failedFact: PersistentAreaObscurementFailedFact,
  mechanicsPath: UnitMechanicsPath,
): PersistentAreaObscurementAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure: "persistentAreaTrait",
    failedFact,
    mechanicsPath,
    message: `Unsupported persistentAreaTrait mechanics fact: ${failedFact}.`,
  };
}

function persistentAreaObscurementRepresentation(
  mechanics: SpellMechanics,
): mechanics is PersistentAreaObscurementMechanics {
  return Match.value(mechanics).pipe(
    Match.when({ family: "ongoing_effect" }, (ongoing) =>
      persistentAreaObscurementOngoingRepresentation(ongoing),
    ),
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

function persistentAreaObscurementOngoingRepresentation(
  mechanics: PersistentAreaObscurementMechanics,
): boolean {
  const area =
    mechanics.attachment.kind === "hole" &&
    mechanics.attachment.value.kind === "area"
      ? mechanics.attachment.value
      : undefined;
  const radius =
    area?.shape.kind === "sphere" && typeof area.shape.radiusFeet === "object"
      ? area.shape.radiusFeet
      : undefined;
  const hasStrongWindEnding =
    mechanics.duration.kind === "concentration" &&
    mechanics.duration.earlyEnd?.some(
      (ending) => ending.kind === "area_dispersed_by_strong_wind",
    ) === true;
  const hasObscurementEffect = mechanics.operations.some(
    ({ effect }) => effect.kind === "area_is_heavily_obscured",
  );
  return spellProcedureHasRedundantSignature({
    kind: "oneOfFiveWitnessesMayBeMissing",
    witnesses: [
      {
        name: "header",
        present:
          mechanics.level === PERSISTENT_AREA_OBSCUREMENT_LEVEL &&
          mechanics.school === "conjuration" &&
          mechanics.castingTime.kind === "action",
      },
      {
        name: "rangeAndComponents",
        present:
          mechanics.range.kind === "point" &&
          mechanics.range.feet === PERSISTENT_AREA_OBSCUREMENT_RANGE_FEET &&
          mechanics.components.v === true &&
          mechanics.components.s === true &&
          mechanics.components.m === false,
      },
      {
        name: "duration",
        present:
          mechanics.duration.kind === "concentration" &&
          mechanics.duration.upTo.unit === "hour" &&
          mechanics.duration.upTo.amount ===
            PERSISTENT_AREA_OBSCUREMENT_DURATION_HOURS &&
          hasStrongWindEnding,
      },
      {
        name: "area",
        present:
          area?.origin.kind === "point_within_range" &&
          radius?.kind === "linear_per_level" &&
          radius.axis === "slot",
      },
      { name: "obscurementEffect", present: hasObscurementEffect },
    ],
  });
}

function persistentAreaObscurementRadiusIsSupported(
  mechanics: PersistentAreaObscurementMechanics,
): boolean {
  const attachment = mechanics.attachment;
  if (
    attachment.kind !== "hole" ||
    !spellMechanicsObjectHasOnlyKeys(attachment, ATTACHMENT_FIELDS) ||
    attachment.value.kind !== "area" ||
    !spellMechanicsObjectHasOnlyKeys(attachment.value, AREA_FIELDS) ||
    attachment.value.origin.kind !== "point_within_range" ||
    !spellMechanicsObjectHasOnlyKeys(attachment.value.origin, ORIGIN_FIELDS) ||
    attachment.value.shape.kind !== "sphere" ||
    !spellMechanicsObjectHasOnlyKeys(attachment.value.shape, SHAPE_FIELDS) ||
    typeof attachment.value.shape.radiusFeet !== "object"
  ) {
    return false;
  }
  const radius = attachment.value.shape.radiusFeet;
  if (
    radius.kind !== "linear_per_level" ||
    radius.axis !== "slot" ||
    radius.base !== PERSISTENT_AREA_OBSCUREMENT_BASE_RADIUS_FEET ||
    radius.perLevel !==
      PERSISTENT_AREA_OBSCUREMENT_RADIUS_FEET_PER_SLOT_LEVEL ||
    radius.startingAtLevel !== PERSISTENT_AREA_OBSCUREMENT_LEVEL ||
    !spellMechanicsObjectHasOnlyKeys(radius, RADIUS_FIELDS)
  ) {
    return false;
  }
  return true;
}

type PersistentAreaObscurementInspection =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "unsupported";
      readonly issues: readonly [
        {
          readonly failedFact: PersistentAreaObscurementFailedFact;
          readonly mechanicsPath: UnitMechanicsPath;
        },
        ...Array<{
          readonly failedFact: PersistentAreaObscurementFailedFact;
          readonly mechanicsPath: UnitMechanicsPath;
        }>,
      ];
    }
  | {
      readonly tag: "parsed";
      readonly facts: PersistentAreaObscurementMechanicsFacts;
      readonly evidence: SpellProcedureMechanicsEvidence;
    };

function operationShellIsSupported(
  operation: PersistentAreaObscurementOperation | undefined,
): boolean {
  return (
    operation !== undefined &&
    spellMechanicsObjectHasOnlyKeys(operation, OPERATION_FIELDS) &&
    operation.trigger.kind === "passive" &&
    spellMechanicsObjectHasOnlyKeys(operation.trigger, TRIGGER_FIELDS)
  );
}

function obscurementEffectIsSupported(
  operation: PersistentAreaObscurementOperation | undefined,
): boolean {
  return (
    operation?.effect.kind === "area_is_heavily_obscured" &&
    spellMechanicsObjectHasOnlyKeys(operation.effect, EFFECT_FIELDS)
  );
}

function persistentAreaObscurementEvidence(
  operationOrdinal: PositiveInteger,
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
      spellDurationEndingPath(PositiveInteger(1)),
      spellOngoingAttachmentPath(),
      spellOngoingOperationPath(operationOrdinal),
      spellOngoingOperationEffectPath(operationOrdinal),
    ],
    unowned: [],
  };
}

function inspectPersistentAreaObscurementMechanics(
  source: SpellMechanicsAdmissionSource,
): PersistentAreaObscurementInspection {
  if (!persistentAreaObscurementRepresentation(source.mechanics)) {
    return { tag: "notRepresented" };
  }
  const mechanics = source.mechanics;
  const issues: Array<{
    readonly failedFact: PersistentAreaObscurementFailedFact;
    readonly mechanicsPath: UnitMechanicsPath;
  }> = [];
  const pushIssue = (
    failedFact: PersistentAreaObscurementFailedFact,
    mechanicsPath: UnitMechanicsPath,
  ): void => {
    issues.push({ failedFact, mechanicsPath });
  };

  if (!spellMechanicsObjectHasOnlyKeys(mechanics, ROOT_FIELDS))
    pushIssue("mechanics", spellMechanicsRootPath());
  if (mechanics.level !== PERSISTENT_AREA_OBSCUREMENT_LEVEL)
    pushIssue("level", spellMechanicsHeaderPath("level"));
  if (mechanics.school !== "conjuration")
    pushIssue("school", spellMechanicsHeaderPath("school"));

  if (
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== PERSISTENT_AREA_OBSCUREMENT_RANGE_FEET ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.range, RANGE_FIELDS)
  )
    pushIssue("range", spellMechanicsHeaderPath("range"));
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    mechanics.components.m !== false ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.components, COMPONENT_FIELDS)
  ) {
    pushIssue("components", spellMechanicsHeaderPath("components"));
    for (const path of spellConsumedMaterialEvidencePaths(mechanics.components))
      pushIssue("components", path);
  }
  if (
    mechanics.castingTime.kind !== "action" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.castingTime, CASTING_TIME_FIELDS)
  )
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));

  if (mechanics.duration.kind !== "concentration") {
    pushIssue("duration", spellMechanicsHeaderPath("duration"));
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
    if (
      mechanics.duration.upTo.unit !== "hour" ||
      mechanics.duration.upTo.amount !==
        PERSISTENT_AREA_OBSCUREMENT_DURATION_HOURS ||
      !spellMechanicsObjectHasOnlyKeys(
        mechanics.duration.upTo,
        DURATION_VALUE_FIELDS,
      )
    )
      pushIssue("durationValue", spellDurationValuePath());
    const durationChildren = spellDurationChildCoordinates(mechanics.duration);
    const endingChildren = durationChildren.filter(
      (child) => child.branch === "ending",
    );
    if (endingChildren.length === 0)
      pushIssue(
        "durationEnding",
        spellDurationChildPath({
          branch: "ending",
          ordinal: PositiveInteger(1),
          ending: {
            kind: "earlyEnd",
            trigger: { kind: "area_dispersed_by_strong_wind" },
          },
        }),
      );
    for (const child of durationChildren) {
      if (child.branch === "extension") {
        pushIssue("durationExtension", spellDurationChildPath(child));
      } else if (
        child.ordinal !== 1 ||
        child.ending.kind !== "earlyEnd" ||
        child.ending.trigger.kind !== "area_dispersed_by_strong_wind" ||
        !spellMechanicsObjectHasOnlyKeys(child.ending.trigger, ENDING_FIELDS)
      ) {
        pushIssue("durationEnding", spellDurationChildPath(child));
      }
    }
  }

  if (!persistentAreaObscurementRadiusIsSupported(mechanics)) {
    const attachment = mechanics.attachment;
    const hasAreaShell =
      attachment.kind === "hole" &&
      attachment.value.kind === "area" &&
      attachment.value.origin.kind === "point_within_range" &&
      attachment.value.shape.kind === "sphere";
    pushIssue(
      hasAreaShell ? "radiusScaling" : "attachment",
      spellOngoingAttachmentPath(),
    );
  }
  if (mechanics.initialPhase !== undefined)
    pushIssue("initialPhase", spellOngoingInitialPhasePath());
  for (const [index] of (
    mechanics.authoredConditionalMechanics ?? []
  ).entries())
    pushIssue(
      "authoredConditionalMechanics",
      spellOngoingAuthoredConditionalMechanicPath(PositiveInteger(index + 1)),
    );

  const obscurementOperationIndex = mechanics.operations.findIndex(
    ({ effect }) => effect.kind === "area_is_heavily_obscured",
  );
  const operationIndex =
    obscurementOperationIndex >= 0 ? obscurementOperationIndex : 0;
  const operationOrdinal = PositiveInteger(operationIndex + 1);
  const operation = mechanics.operations[operationIndex];
  if (mechanics.operations.length === 0)
    pushIssue("operationCount", spellOngoingOperationPath(operationOrdinal));
  for (const [index] of mechanics.operations.entries()) {
    if (index !== operationIndex)
      pushIssue(
        "operationCount",
        spellOngoingOperationPath(PositiveInteger(index + 1)),
      );
  }
  if (!operationShellIsSupported(operation))
    pushIssue("operation", spellOngoingOperationPath(operationOrdinal));
  if (!obscurementEffectIsSupported(operation))
    pushIssue(
      "obscurementEffect",
      spellOngoingOperationEffectPath(operationOrdinal),
    );

  const failures = spellProcedureNonEmpty(spellUniqueMechanicsIssues(issues));
  if (failures !== undefined) {
    return {
      tag: "unsupported",
      issues: failures,
    };
  }

  const facts = {
    ...source.spellDefinitionRuleFacts,
    durationTicks: elapsedTimeTicks(
      ELAPSED_TIME_TICKS_PER_HOUR * PERSISTENT_AREA_OBSCUREMENT_DURATION_HOURS,
    ),
    rangeFeet: movementFeet(PERSISTENT_AREA_OBSCUREMENT_RANGE_FEET),
    radius: {
      baseFeet: movementFeet(PERSISTENT_AREA_OBSCUREMENT_BASE_RADIUS_FEET),
      startingSlotLevel: spellSlotLevel(PERSISTENT_AREA_OBSCUREMENT_LEVEL),
      perSlotLevelFeet: movementFeet(
        PERSISTENT_AREA_OBSCUREMENT_RADIUS_FEET_PER_SLOT_LEVEL,
      ),
    },
  } satisfies PersistentAreaObscurementMechanicsFacts;
  return {
    tag: "parsed",
    facts,
    evidence: persistentAreaObscurementEvidence(operationOrdinal),
  };
}

function admitPersistentAreaObscurementMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "persistentAreaTrait",
  PersistentAreaObscurementMechanicsFacts,
  PersistentAreaTraitSpellInvocation,
  PersistentAreaObscurementAdmissionIssue
> {
  return Match.value(inspectPersistentAreaObscurementMechanics(source)).pipe(
    Match.when({ tag: "notRepresented" }, () => ({
      tag: "notRepresented" as const,
    })),
    Match.when({ tag: "unsupported" }, ({ issues }) => ({
      tag: "unsupported" as const,
      issues: spellProcedureMapNonEmpty(
        issues,
        ({ failedFact, mechanicsPath }) =>
          persistentAreaObscurementIssue(failedFact, mechanicsPath),
      ),
    })),
    Match.when({ tag: "parsed" }, ({ facts, evidence }) => ({
      tag: "supported" as const,
      admitted: {
        binding: "ready" as const,
        procedure: "persistentAreaTrait" as const,
        facts,
        evidence,
        admit: (
          spell: BattleSpellExecutionSource,
          ctx: SpellAdmissionContext,
        ) => admitPersistentAreaTrait(spell, ctx, facts),
      },
    })),
    Match.exhaustive,
  );
}

function admitPersistentAreaTrait(
  spell: BattleSpellExecutionSource,
  ctx: SpellAdmissionContext,
  facts: PersistentAreaObscurementMechanicsFacts,
): readonly PersistentAreaTraitSpellInvocation[] {
  return ctx.spellCastOptions.flatMap(
    (slot): readonly PersistentAreaTraitSpellInvocation[] => {
      if (Number(slot.spellLevel) < facts.level) return [];
      const radiusFeet =
        Number(facts.radius.baseFeet) +
        Math.max(
          0,
          Number(slot.spellLevel) - Number(facts.radius.startingSlotLevel),
        ) *
          Number(facts.radius.perSlotLevelFeet);
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "persistentAreaTrait",
          spell,
          targeting: {
            kind: "pointOriginSphere",
            radiusFeet: movementFeet(radiusFeet),
          },
          durationTicks: facts.durationTicks,
          rangeFeet: facts.rangeFeet,
        },
      ];
    },
  );
}

function resolvePersistentAreaTrait(
  input: PersistentAreaTraitResolveInput,
): BattleResolutionResult {
  return resolvePersistentAreaTraitSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

const PersistentAreaTraitInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("persistentAreaTrait"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("pointOriginSphere"),
      radiusFeet: MovementFeet,
    }),
    durationTicks: ElapsedTimeTicksSchema,
    rangeFeet: MovementFeet,
  }),
);
export const persistentAreaTraitProfile = {
  procedure: "persistentAreaTrait",
  executionSchema: PersistentAreaTraitInvocationSchema,
  admitMechanics: admitPersistentAreaObscurementMechanics,
  discoverCastAct: discoverActionSpellAreaCastAct,
  resolve: resolvePersistentAreaTrait,
} satisfies SpellProcedureDeclaration<
  "persistentAreaTrait",
  PersistentAreaTraitSpellInvocation,
  PersistentAreaObscurementMechanicsFacts,
  PersistentAreaObscurementAdmissionIssue
>;
