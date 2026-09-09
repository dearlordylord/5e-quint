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
  spellOngoingAuthoredConditionalMechanicPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { Components, SpellMechanics } from "@dnd/surface/surface/types";
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
type MagicalObscurementPointOriginAttachment =
  MagicalDarknessPointOriginMechanics["attachment"];
type MagicalObscurementAreaAttachmentValue = Extract<
  Extract<
    MagicalObscurementPointOriginAttachment,
    { readonly kind: "hole" }
  >["value"],
  { readonly kind: "area" }
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
  "authoredConditionalMechanics",
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
  "authoredConditionalMechanics",
] as const satisfies ReadonlyArray<keyof MagicalDarknessPointOriginMechanics>;
const RANGE_FIELDS = ["kind", "feet"] as const;
type MagicalDarknessComponentKeySpace = Pick<Components, "v" | "s" | "m"> & {
  readonly materialCostGp?: unknown;
  readonly materialConsumed?: unknown;
};
const COMPONENT_FIELDS = [
  "v",
  "s",
  "m",
  "materialCostGp",
  "materialConsumed",
] as const satisfies ReadonlyArray<keyof MagicalDarknessComponentKeySpace>;
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
    Match.when(
      { family: "ongoing_effect" },
      magicalObscurementOngoingRepresentation,
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

function magicalObscurementOngoingRepresentation(
  mechanics: MagicalDarknessPointOriginMechanics,
): boolean {
  const hasDarknessEffect = mechanics.operations.some(
    ({ effect }) => effect.kind === "area_is_magical_darkness",
  );
  const hasDispelLightEffect = mechanics.operations.some(
    ({ effect }) =>
      effect.kind === "end_overlapping_spell_created_bright_or_dim_light",
  );
  return spellProcedureHasRedundantSignature({
    kind: "oneOfFiveWitnessesMayBeMissing",
    witnesses: [
      { name: "header", present: magicalObscurementHasHeader(mechanics) },
      {
        name: "rangeAndComponents",
        present: magicalObscurementHasRangeAndComponents(mechanics),
      },
      { name: "duration", present: magicalObscurementHasDuration(mechanics) },
      {
        name: "pointOriginSphere",
        present: magicalObscurementHasPointOriginSphere(mechanics),
      },
      {
        name: "operations",
        present: hasDarknessEffect && hasDispelLightEffect,
      },
    ],
  });
}

function magicalObscurementHasHeader(
  mechanics: MagicalDarknessPointOriginMechanics,
): boolean {
  return [
    mechanics.level === MAGICAL_DARKNESS_LEVEL,
    mechanics.school === "evocation",
    mechanics.castingTime.kind === "action",
  ].every(Boolean);
}

function magicalObscurementHasRangeAndComponents(
  mechanics: MagicalDarknessPointOriginMechanics,
): boolean {
  if (mechanics.range.kind !== "point") return false;
  return [
    mechanics.range.feet === MAGICAL_DARKNESS_RANGE_FEET,
    mechanics.components.v === true,
    mechanics.components.s === false,
    mechanics.components.m === MAGICAL_DARKNESS_MATERIAL,
  ].every(Boolean);
}

function magicalObscurementHasDuration(
  mechanics: MagicalDarknessPointOriginMechanics,
): boolean {
  if (mechanics.duration.kind !== "concentration") return false;
  return [
    mechanics.duration.upTo.unit === "minute",
    mechanics.duration.upTo.amount === MAGICAL_DARKNESS_DURATION_MINUTES,
  ].every(Boolean);
}

function magicalObscurementHasPointOriginSphere(
  mechanics: MagicalDarknessPointOriginMechanics,
): boolean {
  const attachment = mechanics.attachment;
  if (attachment.kind !== "hole") return false;
  if (attachment.value.kind !== "area") return false;
  if (attachment.value.shape.kind !== "sphere") return false;
  return [
    attachment.value.origin.kind === "point_within_range",
    attachment.value.shape.radiusFeet === MAGICAL_DARKNESS_RADIUS_FEET,
  ].every(Boolean);
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
  const unsupported =
    (): MagicalDarknessSourceFactProjection<MovementFeetType> => ({
      tag: "unsupported",
      issue: {
        failedFact: "attachment",
        mechanicsPath: spellOngoingAttachmentPath(),
      },
    });
  const area = magicalObscurementAreaAttachmentValue(attachment);
  if (area === undefined) return unsupported();
  if (area.origin.kind !== "point_within_range") return unsupported();
  if (!spellMechanicsObjectHasOnlyKeys(area.origin, ORIGIN_FIELDS))
    return unsupported();
  if (area.shape.kind !== "sphere") return unsupported();
  if (!spellMechanicsObjectHasOnlyKeys(area.shape, SHAPE_FIELDS))
    return unsupported();
  const radiusFeet = area.shape.radiusFeet;
  if (typeof radiusFeet !== "number") return unsupported();
  if (radiusFeet !== MAGICAL_DARKNESS_RADIUS_FEET) return unsupported();
  return {
    tag: "parsed",
    fact: movementFeet(radiusFeet),
  };
}

function magicalObscurementAreaAttachmentValue(
  attachment: MagicalObscurementPointOriginAttachment,
): MagicalObscurementAreaAttachmentValue | undefined {
  if (attachment.kind !== "hole") return undefined;
  if (!spellMechanicsObjectHasOnlyKeys(attachment, ATTACHMENT_FIELDS))
    return undefined;
  if (attachment.value.kind !== "area") return undefined;
  if (!spellMechanicsObjectHasOnlyKeys(attachment.value, AREA_FIELDS))
    return undefined;
  return attachment.value;
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

function magicalDarknessOperationOrdinals(input: {
  readonly operationCount: number;
  readonly darknessIndex: number;
  readonly dispelLightIndex: number;
}): readonly [PositiveInteger, PositiveInteger] {
  const firstMissingIndex = input.operationCount;
  const darknessOrdinal = PositiveInteger(
    input.darknessIndex >= 0 ? input.darknessIndex + 1 : firstMissingIndex + 1,
  );
  const dispelLightOrdinal = PositiveInteger(
    input.dispelLightIndex >= 0
      ? input.dispelLightIndex + 1
      : firstMissingIndex + (input.darknessIndex >= 0 ? 1 : 2),
  );
  return [darknessOrdinal, dispelLightOrdinal];
}

function magicalDarknessParsedCandidate(input: {
  readonly source: SpellMechanicsAdmissionSource;
  readonly range: MagicalDarknessSourceFactProjection<MovementFeetType>;
  readonly duration: MagicalDarknessSourceFactProjection<{
    readonly ticks: ElapsedTimeTicks;
  }>;
  readonly attachment: MagicalDarknessSourceFactProjection<MovementFeetType>;
  readonly dispelLight: MagicalDarknessSourceFactProjection<BattleSpellEffectLevel>;
  readonly darknessOrdinal: PositiveInteger;
  readonly dispelLightOrdinal: PositiveInteger;
}): Exclude<
  MagicalDarknessPointOriginInspection,
  { readonly tag: "notRepresented" }
> {
  if (input.range.tag === "unsupported")
    return magicalObscurementUnsupportedCandidate(input.range.issue, [
      input.duration,
      input.attachment,
      input.dispelLight,
    ]);
  if (input.duration.tag === "unsupported")
    return magicalObscurementUnsupportedCandidate(input.duration.issue, [
      input.attachment,
      input.dispelLight,
    ]);
  if (input.attachment.tag === "unsupported")
    return magicalObscurementUnsupportedCandidate(input.attachment.issue, [
      input.dispelLight,
    ]);
  if (input.dispelLight.tag === "unsupported")
    return magicalObscurementUnsupportedCandidate(input.dispelLight.issue, []);
  return {
    tag: "parsed",
    facts: {
      ...input.source.spellDefinitionRuleFacts,
      durationTicks: input.duration.fact.ticks,
      rangeFeet: input.range.fact,
      radiusFeet: input.attachment.fact,
      dispelledSpellCreatedLightMaxSpellLevel: input.dispelLight.fact,
    },
    evidence: magicalDarknessPointOriginEvidence(
      input.darknessOrdinal,
      input.dispelLightOrdinal,
    ),
  };
}

type MagicalObscurementPointOriginIssue = Extract<
  MagicalDarknessPointOriginInspection,
  { readonly tag: "unsupported" }
>["issues"][number];

function magicalObscurementUnsupportedCandidate(
  firstIssue: MagicalObscurementPointOriginIssue,
  remaining: ReadonlyArray<MagicalDarknessSourceFactProjection<unknown>>,
): Extract<
  MagicalDarknessPointOriginInspection,
  { readonly tag: "unsupported" }
> {
  const additionalIssues = remaining.flatMap((projection) =>
    projection.tag === "unsupported" ? [projection.issue] : [],
  );
  return { tag: "unsupported", issues: [firstIssue, ...additionalIssues] };
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

type MagicalDarknessIssueFact = MagicalObscurementPointOriginIssue;

function magicalDarknessIssueFact(
  failedFact: MagicalDarknessPointOriginFailedFact,
  mechanicsPath: UnitMechanicsPath,
): MagicalDarknessIssueFact {
  return { failedFact, mechanicsPath };
}

function magicalDarknessHeaderIssues(
  mechanics: MagicalDarknessPointOriginMechanics,
): readonly MagicalDarknessIssueFact[] {
  return [
    ...(spellMechanicsObjectHasOnlyKeys(mechanics, ROOT_FIELDS)
      ? []
      : [magicalDarknessIssueFact("mechanics", spellMechanicsRootPath())]),
    ...(mechanics.level === MAGICAL_DARKNESS_LEVEL
      ? []
      : [magicalDarknessIssueFact("level", spellMechanicsHeaderPath("level"))]),
    ...(mechanics.school === "evocation"
      ? []
      : [
          magicalDarknessIssueFact(
            "school",
            spellMechanicsHeaderPath("school"),
          ),
        ]),
  ];
}

function magicalDarknessComponentIssues(
  mechanics: MagicalDarknessPointOriginMechanics,
): readonly MagicalDarknessIssueFact[] {
  const supported =
    mechanics.components.v === true &&
    mechanics.components.s === false &&
    mechanics.components.m === MAGICAL_DARKNESS_MATERIAL &&
    spellMechanicsObjectHasOnlyKeys<MagicalDarknessComponentKeySpace>(
      mechanics.components,
      COMPONENT_FIELDS,
    );
  return [
    ...(supported
      ? []
      : [
          magicalDarknessIssueFact(
            "components",
            spellMechanicsHeaderPath("components"),
          ),
        ]),
    ...spellConsumedMaterialEvidencePaths(mechanics.components).map((path) =>
      magicalDarknessIssueFact("components", path),
    ),
  ];
}

function magicalDarknessCastingTimeIssues(
  mechanics: MagicalDarknessPointOriginMechanics,
): readonly MagicalDarknessIssueFact[] {
  return mechanics.castingTime.kind === "action" &&
    spellMechanicsObjectHasOnlyKeys(mechanics.castingTime, CASTING_TIME_FIELDS)
    ? []
    : [
        magicalDarknessIssueFact(
          "castingTime",
          spellMechanicsHeaderPath("castingTime"),
        ),
      ];
}

function magicalDarknessDurationIssues(
  duration: MagicalDarknessPointOriginMechanics["duration"],
): readonly MagicalDarknessIssueFact[] {
  const childIssues = spellDurationChildCoordinates(duration).map((child) =>
    magicalDarknessIssueFact(
      spellDurationChildFailedFact(child),
      spellDurationChildPath(child),
    ),
  );
  if (duration.kind === "concentration")
    return [
      ...(spellMechanicsObjectHasOnlyKeys(duration, DURATION_FIELDS)
        ? []
        : [
            magicalDarknessIssueFact(
              "duration",
              spellMechanicsHeaderPath("duration"),
            ),
          ]),
      ...childIssues,
    ];
  return [
    ...spellDurationValueEvidencePaths(duration).map((path) =>
      magicalDarknessIssueFact("durationValue", path),
    ),
    ...childIssues,
  ];
}

function magicalDarknessOperationIssues(input: {
  readonly mechanics: MagicalDarknessPointOriginMechanics;
  readonly darknessIndex: number;
  readonly dispelLightIndex: number;
  readonly darknessOrdinal: PositiveInteger;
  readonly dispelLightOrdinal: PositiveInteger;
  readonly darknessOperation:
    | MagicalDarknessPointOriginMechanics["operations"][number]
    | undefined;
  readonly dispelLightOperation:
    | MagicalDarknessPointOriginMechanics["operations"][number]
    | undefined;
}): readonly MagicalDarknessIssueFact[] {
  const extras = input.mechanics.operations.flatMap((_operation, index) =>
    index === input.darknessIndex || index === input.dispelLightIndex
      ? []
      : [
          magicalDarknessIssueFact(
            "operationCount",
            spellOngoingOperationPath(PositiveInteger(index + 1)),
          ),
        ],
  );
  const absent = Array.from(
    { length: Math.max(0, 2 - input.mechanics.operations.length) },
    (_unused, index) =>
      magicalDarknessIssueFact(
        "operationCount",
        spellOngoingOperationPath(
          PositiveInteger(input.mechanics.operations.length + index + 1),
        ),
      ),
  );
  return [
    ...extras,
    ...absent,
    ...(operationShellIsSupported(input.darknessOperation)
      ? []
      : [
          magicalDarknessIssueFact(
            "darknessOperation",
            spellOngoingOperationPath(input.darknessOrdinal),
          ),
        ]),
    ...(darknessEffectIsSupported(input.darknessOperation)
      ? []
      : [
          magicalDarknessIssueFact(
            "darknessEffect",
            spellOngoingOperationEffectPath(input.darknessOrdinal),
          ),
        ]),
    ...(operationShellIsSupported(input.dispelLightOperation)
      ? []
      : [
          magicalDarknessIssueFact(
            "dispelLightOperation",
            spellOngoingOperationPath(input.dispelLightOrdinal),
          ),
        ]),
  ];
}

function inspectMagicalDarknessPointOriginMechanics(
  source: SpellMechanicsAdmissionSource,
): MagicalDarknessPointOriginInspection {
  if (!magicalDarknessPointOriginRepresentation(source.mechanics))
    return { tag: "notRepresented" };
  const mechanics = source.mechanics;
  const rangeProjection = magicalDarknessRangeProjection(mechanics.range);
  const durationProjection = magicalDarknessDurationProjection(
    mechanics.duration,
  );
  const attachment = mechanics.attachment;
  const attachmentProjection = magicalDarknessAttachmentProjection(attachment);

  const darknessIndex = mechanics.operations.findIndex(
    ({ effect }) => effect.kind === "area_is_magical_darkness",
  );
  const dispelLightIndex = mechanics.operations.findIndex(
    ({ effect }) =>
      effect.kind === "end_overlapping_spell_created_bright_or_dim_light",
  );
  const [darknessOrdinal, dispelLightOrdinal] =
    magicalDarknessOperationOrdinals({
      operationCount: mechanics.operations.length,
      darknessIndex,
      dispelLightIndex,
    });
  const darknessOperation =
    darknessIndex >= 0 ? mechanics.operations[darknessIndex] : undefined;
  const dispelLightOperation =
    dispelLightIndex >= 0 ? mechanics.operations[dispelLightIndex] : undefined;

  const issues = [
    ...magicalDarknessHeaderIssues(mechanics),
    ...magicalDarknessComponentIssues(mechanics),
    ...magicalDarknessCastingTimeIssues(mechanics),
    ...magicalDarknessDurationIssues(mechanics.duration),
    ...(mechanics.initialPhase === undefined
      ? []
      : [
          magicalDarknessIssueFact(
            "initialPhase",
            spellOngoingInitialPhasePath(),
          ),
        ]),
    ...(mechanics.authoredConditionalMechanics ?? []).map((_condition, index) =>
      magicalDarknessIssueFact(
        "authoredConditionalMechanics",
        spellOngoingAuthoredConditionalMechanicPath(PositiveInteger(index + 1)),
      ),
    ),
    ...magicalDarknessOperationIssues({
      mechanics,
      darknessIndex,
      dispelLightIndex,
      darknessOrdinal,
      dispelLightOrdinal,
      darknessOperation,
      dispelLightOperation,
    }),
  ];
  const dispelLightProjection = magicalDarknessDispelLightProjection(
    dispelLightOperation,
    dispelLightOrdinal,
  );
  const parsedCandidate = magicalDarknessParsedCandidate({
    source,
    range: rangeProjection,
    duration: durationProjection,
    attachment: attachmentProjection,
    dispelLight: dispelLightProjection,
    darknessOrdinal,
    dispelLightOrdinal,
  });
  const failures = spellProcedureNonEmpty(spellUniqueMechanicsIssues(issues));
  if (failures === undefined) return parsedCandidate;
  return parsedCandidate.tag === "unsupported"
    ? {
        tag: "unsupported",
        issues: [...failures, ...parsedCandidate.issues],
      }
    : { tag: "unsupported", issues: failures };
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
