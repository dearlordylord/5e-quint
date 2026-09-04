import type { BattleSpellExecutionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-fog-cloud-obscurement
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
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

import {
  type ElapsedTimeTicks,
  elapsedTimeTicksFromTimeSpanDuration,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  movementFeet,
  PositiveInteger,
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
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellMechanics } from "@dnd/surface/surface/types";
import { Match, Result, Schema } from "effect";

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
  spellProcedureHasRedundantSignature,
  spellProcedureMapNonEmpty,
  spellProcedureNonEmpty,
  spellSlotLevelFromSurface,
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
  "durationEnding",
  "castingTime",
  "attachment",
  "radiusScaling",
  "initialPhase",
  "authoredConditionalEffects",
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
  "authoredConditionalEffects",
] as const satisfies ReadonlyArray<keyof PersistentAreaObscurementMechanics>;
const RANGE_FIELDS = ["kind", "feet"] as const;
const COMPONENT_FIELDS = ["v", "s", "m"] as const;
const CASTING_TIME_FIELDS = ["kind"] as const;
const DURATION_FIELDS = ["kind", "upTo", "earlyEnd"] as const;
const DURATION_VALUE_FIELDS = ["unit", "amount"] as const;
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

function persistentAreaObscurementRadius(
  mechanics: PersistentAreaObscurementMechanics,
): PersistentAreaObscurementMechanicsFacts["radius"] | undefined {
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
    return undefined;
  }
  const radius = attachment.value.shape.radiusFeet;
  const startingSlotLevel = spellSlotLevelFromSurface(radius.startingAtLevel);
  if (
    radius.kind !== "linear_per_level" ||
    radius.axis !== "slot" ||
    radius.base !== PERSISTENT_AREA_OBSCUREMENT_BASE_RADIUS_FEET ||
    radius.perLevel !==
      PERSISTENT_AREA_OBSCUREMENT_RADIUS_FEET_PER_SLOT_LEVEL ||
    radius.startingAtLevel !== PERSISTENT_AREA_OBSCUREMENT_LEVEL ||
    startingSlotLevel === undefined ||
    !spellMechanicsObjectHasOnlyKeys(radius, RADIUS_FIELDS)
  ) {
    return undefined;
  }
  return {
    baseFeet: movementFeet(radius.base),
    startingSlotLevel,
    perSlotLevelFeet: movementFeet(radius.perLevel),
  };
}

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

function admitPersistentAreaObscurementMechanics(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "persistentAreaTrait",
  PersistentAreaObscurementMechanicsFacts,
  PersistentAreaTraitSpellInvocation,
  PersistentAreaObscurementAdmissionIssue
> {
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

  const rangeFeet =
    mechanics.range.kind === "point" &&
    mechanics.range.feet === PERSISTENT_AREA_OBSCUREMENT_RANGE_FEET &&
    spellMechanicsObjectHasOnlyKeys(mechanics.range, RANGE_FIELDS)
      ? movementFeet(mechanics.range.feet)
      : undefined;
  if (rangeFeet === undefined)
    pushIssue("range", spellMechanicsHeaderPath("range"));
  if (
    mechanics.components.v !== true ||
    mechanics.components.s !== true ||
    mechanics.components.m !== false ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.components, COMPONENT_FIELDS)
  )
    pushIssue("components", spellMechanicsHeaderPath("components"));
  if (
    mechanics.castingTime.kind !== "action" ||
    !spellMechanicsObjectHasOnlyKeys(mechanics.castingTime, CASTING_TIME_FIELDS)
  )
    pushIssue("castingTime", spellMechanicsHeaderPath("castingTime"));

  const durationTicks =
    mechanics.duration.kind === "concentration" &&
    mechanics.duration.upTo.unit === "hour" &&
    mechanics.duration.upTo.amount ===
      PERSISTENT_AREA_OBSCUREMENT_DURATION_HOURS
      ? elapsedTimeTicksFromTimeSpanDuration(mechanics.duration.upTo)
      : undefined;
  if (mechanics.duration.kind !== "concentration") {
    pushIssue("duration", spellMechanicsHeaderPath("duration"));
    pushIssue("durationValue", spellDurationValuePath());
    pushIssue("durationEnding", spellDurationEndingPath(PositiveInteger(1)));
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
      ) ||
      durationTicks === undefined ||
      Result.isFailure(durationTicks)
    )
      pushIssue("durationValue", spellDurationValuePath());
    const earlyEnd = mechanics.duration.earlyEnd;
    if (earlyEnd === undefined || earlyEnd.length === 0) {
      pushIssue("durationEnding", spellDurationEndingPath(PositiveInteger(1)));
    } else {
      for (const [index, ending] of earlyEnd.entries()) {
        if (
          ending.kind !== "area_dispersed_by_strong_wind" ||
          index > 0 ||
          !spellMechanicsObjectHasOnlyKeys(ending, ENDING_FIELDS)
        )
          pushIssue(
            "durationEnding",
            spellDurationEndingPath(PositiveInteger(index + 1)),
          );
      }
    }
    if (mechanics.duration.permanentIfMaintainedFull === true)
      pushIssue(
        "durationEnding",
        spellDurationEndingPath(
          PositiveInteger((mechanics.duration.earlyEnd?.length ?? 0) + 1),
        ),
      );
  }

  const radius = persistentAreaObscurementRadius(mechanics);
  if (radius === undefined) {
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
  if (mechanics.authoredConditionalEffects !== undefined)
    pushIssue("authoredConditionalEffects", spellMechanicsRootPath());

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
      issues: spellProcedureMapNonEmpty(
        failures,
        ({ failedFact, mechanicsPath }) =>
          persistentAreaObscurementIssue(failedFact, mechanicsPath),
      ),
    };
  }
  if (
    rangeFeet === undefined ||
    radius === undefined ||
    durationTicks === undefined ||
    Result.isFailure(durationTicks)
  ) {
    return {
      tag: "unsupported",
      issues: [
        persistentAreaObscurementIssue(
          rangeFeet === undefined
            ? "range"
            : radius === undefined
              ? "radiusScaling"
              : "durationValue",
          rangeFeet === undefined
            ? spellMechanicsHeaderPath("range")
            : radius === undefined
              ? spellOngoingAttachmentPath()
              : spellDurationValuePath(),
        ),
      ],
    };
  }

  const facts = {
    ...source.spellDefinitionRuleFacts,
    durationTicks: durationTicks.success,
    rangeFeet,
    radius,
  } satisfies PersistentAreaObscurementMechanicsFacts;
  return {
    tag: "supported",
    admitted: {
      binding: "ready",
      procedure: "persistentAreaTrait",
      facts,
      evidence: persistentAreaObscurementEvidence(operationOrdinal),
      admit: (spell, ctx) => admitPersistentAreaTrait(spell, ctx, facts),
    },
  };
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
