import {
  ELAPSED_TIME_TICKS_PER_DAY,
  ELAPSED_TIME_TICKS_PER_HOUR,
  ELAPSED_TIME_TICKS_PER_MINUTE,
  elapsedTimeTicks,
  type ElapsedTimeTicks,
} from "@dnd/shared/elapsed-time";
import {
  PositiveInteger,
  spellSlotLevel,
  movementFeet,
  type MovementFeet,
  type ReadonlyNonEmptyArray,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  spellDurationEndingPath,
  spellDurationExtensionPath,
  spellMaterialComponentPath,
  spellDurationValuePath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type {
  Attachment,
  Components,
  DurationEndTrigger,
  DurationValue,
  SpellMechanics,
  TargetSelection,
  TimedPermanentAfter,
} from "@dnd/surface/surface/types";

import type {
  BattleSpellExecutionSource,
  SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import type { BattleSpellProcedureKey } from "../../character-execution.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import type { SpellAdmissionContext } from "./profile.ts";
import { Match } from "effect";

/**
 * Static admission receives only the already-decoded mechanics graph and the
 * common Definition projection. Authored identity and all cast-time state are
 * deliberately absent from this carrier.
 */
export type SpellMechanicsAdmissionSource = {
  readonly mechanics: SpellMechanics;
  readonly spellDefinitionRuleFacts: SpellDefinitionRuleFacts;
};

/**
 * A profile's static projection has to account for at least one owned path.
 * An empty `unowned` tuple is the type-level complete-root guarantee; a
 * non-empty tuple is the type-level partial-root guarantee.
 */
export type CompleteSpellProcedureMechanicsEvidence = {
  readonly consumed: ReadonlyNonEmptyArray<SpellMechanicsBranchPath>;
  readonly unowned: readonly [];
};

export type PartialSpellProcedureMechanicsEvidence = {
  readonly consumed: ReadonlyNonEmptyArray<SpellMechanicsBranchPath>;
  readonly unowned: ReadonlyNonEmptyArray<SpellMechanicsBranchPath>;
};

export type SpellProcedureMechanicsEvidence =
  | CompleteSpellProcedureMechanicsEvidence
  | PartialSpellProcedureMechanicsEvidence;

/**
 * Material children are part of the canonical spell-mechanics admission
 * boundary. Generic priced material is a cost branch; explicit consumption is
 * a separate branch. Structured material components carry cost semantics but
 * do not imply consumption.
 */
export function spellConsumedMaterialEvidencePaths(
  components: Components,
): readonly SpellMechanicsBranchPath[] {
  if (components.m === false) return [];

  const paths: SpellMechanicsBranchPath[] = [];
  if (
    typeof components.m === "object" ||
    ("materialCostGp" in components && components.materialCostGp !== undefined)
  ) {
    paths.push(spellMaterialComponentPath("cost"));
  }
  if (
    "materialConsumed" in components &&
    components.materialConsumed === true
  ) {
    paths.push(spellMaterialComponentPath("consumption"));
  }
  return paths;
}

/** Project a fixed point range into the branded execution distance. */
export function spellDefinitionPointRangeFeet(
  range: SpellDefinitionRuleFacts["range"],
): MovementFeet | undefined {
  return range.kind === "point" && typeof range.feet === "number"
    ? movementFeet(range.feet)
    : undefined;
}

/** Preserve positive Surface scalar facts as branded admission facts. */
export function spellPositiveIntegerFromSurface(
  value: number,
): PositiveInteger | undefined {
  return Number.isInteger(value) && value > 0
    ? PositiveInteger(value)
    : undefined;
}

/** Spell-slot progressions are restricted to the existing 1–9 slot domain. */
export function spellSlotLevelFromSurface(
  value: number,
): SpellSlotLevel | undefined {
  return Number.isInteger(value) && value >= 1 && value <= 9
    ? spellSlotLevel(value)
    : undefined;
}

/**
 * A parsed DurationValue has positive integral units at the Surface boundary.
 * Carrying that proof lets execution derive elapsed time without reparsing or
 * falling back to an empty invocation list.
 */
export type SpellCanonicalDurationValue = Omit<DurationValue, "amount"> & {
  readonly amount: PositiveInteger;
};

export function isSpellCanonicalDurationValue(
  value: DurationValue,
): value is SpellCanonicalDurationValue {
  return Number.isInteger(value.amount) && value.amount > 0;
}

export function spellDurationTicksFromCanonicalValue(
  value: SpellCanonicalDurationValue,
): ElapsedTimeTicks {
  return elapsedTimeTicks(
    Match.value(value.unit).pipe(
      Match.when("round", () => Number(value.amount)),
      Match.when(
        "minute",
        () => Number(value.amount) * ELAPSED_TIME_TICKS_PER_MINUTE,
      ),
      Match.when(
        "hour",
        () => Number(value.amount) * ELAPSED_TIME_TICKS_PER_HOUR,
      ),
      Match.when(
        "day",
        () => Number(value.amount) * ELAPSED_TIME_TICKS_PER_DAY,
      ),
      Match.exhaustive,
    ),
  );
}

/**
 * Duration child coordinates are traversed once for every profile. Values
 * are retained for ending discrimination while coordinates retain authored
 * ordinals, including concentration upcast tiers.
 */
export type SpellDurationEnding =
  | {
      readonly kind: "earlyEnd";
      readonly trigger: DurationEndTrigger;
    }
  | {
      readonly kind: "permanentAfter";
      readonly transition: TimedPermanentAfter;
    }
  | {
      readonly kind: "permanentIfMaintainedFull";
    }
  | {
      readonly kind: "endsOn";
      readonly trigger: NonNullable<
        Extract<
          SpellMechanics["duration"],
          { readonly kind: "permanent" }
        >["endsOn"]
      >[number];
    };

export type SpellDurationChild =
  | {
      readonly branch: "extension";
      readonly ordinal: PositiveInteger;
    }
  | {
      readonly branch: "ending";
      readonly ordinal: PositiveInteger;
      readonly ending: SpellDurationEnding;
    };

export type SpellDurationChildFailedFact =
  | "durationExtension"
  | "durationEnding";

export function spellDurationChildFailedFact(
  child: SpellDurationChild,
): SpellDurationChildFailedFact {
  return Match.value(child.branch).pipe(
    Match.when("extension", () => "durationExtension" as const),
    Match.when("ending", () => "durationEnding" as const),
    Match.exhaustive,
  );
}

export function spellDurationChildCoordinates(
  duration: SpellMechanics["duration"],
): readonly SpellDurationChild[] {
  return Match.value(duration).pipe(
    Match.when({ kind: "instantaneous" }, () => []),
    Match.when({ kind: "timed" }, (timed) => [
      ...(timed.value.upcastTiers ?? []).map((_tier, index) => ({
        branch: "extension" as const,
        ordinal: PositiveInteger(index + 1),
      })),
      ...(timed.earlyEnd ?? []).map((ending, index) => ({
        branch: "ending" as const,
        ordinal: PositiveInteger(index + 1),
        ending: { kind: "earlyEnd" as const, trigger: ending },
      })),
      ...(timed.permanentAfter === undefined
        ? []
        : [
            {
              branch: "ending" as const,
              ordinal: PositiveInteger((timed.earlyEnd?.length ?? 0) + 1),
              ending: {
                kind: "permanentAfter" as const,
                transition: timed.permanentAfter,
              },
            },
          ]),
    ]),
    Match.when({ kind: "concentration" }, (concentration) => [
      ...(concentration.upTo.upcastTiers ?? []).map((_tier, index) => ({
        branch: "extension" as const,
        ordinal: PositiveInteger(index + 1),
      })),
      ...(concentration.earlyEnd ?? []).map((ending, index) => ({
        branch: "ending" as const,
        ordinal: PositiveInteger(index + 1),
        ending: { kind: "earlyEnd" as const, trigger: ending },
      })),
      ...(concentration.permanentIfMaintainedFull === true
        ? [
            {
              branch: "ending" as const,
              ordinal: PositiveInteger(
                (concentration.earlyEnd?.length ?? 0) + 1,
              ),
              ending: {
                kind: "permanentIfMaintainedFull" as const,
              },
            },
          ]
        : []),
    ]),
    Match.when({ kind: "permanent" }, (permanent) =>
      (permanent.endsOn ?? []).map((trigger, index) => ({
        branch: "ending" as const,
        ordinal: PositiveInteger(index + 1),
        ending: { kind: "endsOn" as const, trigger },
      })),
    ),
    Match.when({ kind: "slot_tiered" }, (slotTiered) =>
      slotTiered.tiers.map((_tier, index) => ({
        branch: "extension" as const,
        ordinal: PositiveInteger(index + 1),
      })),
    ),
    Match.exhaustive,
  );
}

export function spellDurationChildPath(
  child: SpellDurationChild,
): SpellMechanicsBranchPath {
  return child.branch === "extension"
    ? spellDurationExtensionPath(child.ordinal)
    : spellDurationEndingPath(child.ordinal);
}

/** The duration value branch exists for timed, concentration, and tiered forms. */
export function spellDurationValueEvidencePaths(
  duration: SpellMechanics["duration"],
): readonly SpellMechanicsBranchPath[] {
  return Match.value(duration).pipe(
    Match.when({ kind: "instantaneous" }, () => []),
    Match.when({ kind: "timed" }, () => [spellDurationValuePath()]),
    Match.when({ kind: "concentration" }, () => [spellDurationValuePath()]),
    Match.when({ kind: "permanent" }, () => []),
    Match.when({ kind: "slot_tiered" }, () => [spellDurationValuePath()]),
    Match.exhaustive,
  );
}

/** Project the complete canonical duration evidence shape in one place. */
export function spellDurationEvidencePaths(
  duration: SpellMechanics["duration"],
): readonly SpellMechanicsBranchPath[] {
  return [
    ...spellDurationValueEvidencePaths(duration),
    ...spellDurationChildCoordinates(duration).map(spellDurationChildPath),
  ];
}

/** Surface Touch has one canonical movement-distance projection. */
export function spellTouchRangeFeet(): MovementFeet {
  return movementFeet(5);
}

export type SpellOngoingMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;

export type SpellOngoingOperationOccurrence = {
  readonly operation: SpellOngoingMechanics["operations"][number];
  readonly ordinal: PositiveInteger;
};

/** Preserve the authored operation ordinal alongside its narrowed operation. */
export function spellOngoingOperationOccurrences(
  mechanics: SpellOngoingMechanics,
): readonly SpellOngoingOperationOccurrence[] {
  return mechanics.operations.map((operation, index) => ({
    operation,
    ordinal: PositiveInteger(index + 1),
  }));
}

export const SPELL_ONGOING_OPERATION_UNSUPPORTED_FACTS = [
  "predicate",
  "targetLimit",
  "usageLimit",
] as const;

export type SpellOngoingOperationUnsupportedFact =
  (typeof SPELL_ONGOING_OPERATION_UNSUPPORTED_FACTS)[number];

/** Project every operation constraint that the runtime profiles do not own. */
export function spellOngoingOperationUnsupportedFacts(
  operation: SpellOngoingOperationOccurrence["operation"],
): readonly SpellOngoingOperationUnsupportedFact[] {
  const facts: SpellOngoingOperationUnsupportedFact[] = [];
  if (operation.predicate !== undefined) facts.push("predicate");
  if (operation.targetLimit !== undefined) facts.push("targetLimit");
  if (operation.usageLimit !== undefined) facts.push("usageLimit");
  return facts;
}

/**
 * Target-selection procedures own only these selection fields. Callers pass the
 * subset consumed by their procedure-specific cardinality and disposition
 * witness; every other field is rejected by the target-attachment admission
 * below.
 */
type UnionKeys<Value> = Value extends unknown ? keyof Value : never;
type SpellTargetSelectionField = Extract<UnionKeys<TargetSelection>, string>;
type SpellTargetSelectionFieldShape = {
  readonly [Field in SpellTargetSelectionField]?: unknown;
};

type SpellAreaAttachmentValue = Extract<Attachment, { readonly kind: "area" }>;
const SPELL_AREA_ATTACHMENT_REQUIRED_FIELDS = [
  "kind",
  "shape",
  "origin",
] as const satisfies ReadonlyArray<keyof SpellAreaAttachmentValue>;
type SpellAreaAttachmentRequiredField =
  (typeof SPELL_AREA_ATTACHMENT_REQUIRED_FIELDS)[number];
type SpellAreaAttachmentField = Exclude<
  keyof SpellAreaAttachmentValue,
  SpellAreaAttachmentRequiredField
>;
type SpellAreaHoleAttachment = Extract<
  Attachment,
  { readonly kind: "hole" }
> & {
  readonly value: SpellAreaAttachmentValue;
};

type SpellAreaAttachmentValueWithAllowedFields<
  AllowedAreaFields extends SpellAreaAttachmentField,
> = SpellAreaAttachmentValue & {
  readonly [Field in Exclude<
    SpellAreaAttachmentField,
    AllowedAreaFields
  >]?: never;
};

type AdmittedSpellAreaAttachmentValue<
  AllowedSelectionFields extends SpellTargetSelectionField,
  AllowedAreaFields extends SpellAreaAttachmentField,
> = SpellAreaAttachmentValueWithAllowedFields<AllowedAreaFields> &
  ("selection" extends AllowedAreaFields
    ? {
        readonly selection?: AdmittedSpellTargetSelection<AllowedSelectionFields>;
      }
    : { readonly selection?: never });

type AdmittedSpellAreaHoleAttachment<
  AllowedSelectionFields extends SpellTargetSelectionField,
  AllowedAreaFields extends SpellAreaAttachmentField,
> = Omit<SpellAreaHoleAttachment, "value"> & {
  readonly value: AdmittedSpellAreaAttachmentValue<
    AllowedSelectionFields,
    AllowedAreaFields
  >;
};

type AdmittedSpellTargetSelection<
  AllowedFields extends SpellTargetSelectionField,
> = TargetSelection & {
  readonly [Field in Exclude<
    UnionKeys<TargetSelection>,
    AllowedFields
  >]?: never;
};

type SpellTargetHoleAttachment = Extract<Attachment, { readonly kind: "hole" }>;

type SpellTargetAttachmentValue = Extract<
  SpellTargetHoleAttachment["value"],
  { readonly kind: "target" }
>;

type SpellTargetAttachment = Omit<SpellTargetHoleAttachment, "value"> & {
  readonly value: SpellTargetAttachmentValue;
};
type SpellDirectTargetAttachment = Extract<
  Attachment,
  { readonly kind: "target" }
>;

const SPELL_ATTACHMENT_WRAPPER_FIELDS = [
  "kind",
  "holeId",
  "label",
  "value",
] as const;
const SPELL_ATTACHMENT_VALUE_FIELDS = [
  "kind",
  "selection",
  "rangeOrigin",
  "shape",
  "origin",
  "occupantDispositionFilter",
  "occupantPerceptionFilter",
  "excludedAreas",
] as const;
type SpellAttachmentValueField = (typeof SPELL_ATTACHMENT_VALUE_FIELDS)[number];
export type SpellAttachmentRejectionFact =
  | "attachment"
  | "selection"
  | "rangeOrigin"
  | SpellTargetSelectionField
  | Exclude<SpellAttachmentValueField, "kind">;
export type SpellAttachmentRejectionCoordinate =
  | {
      readonly kind: "wrapper";
      readonly field: PropertyKey;
    }
  | {
      readonly kind: "value";
      readonly field: PropertyKey;
    }
  | {
      readonly kind: "selection";
      readonly field: PropertyKey;
    };
export type SpellAttachmentRejection = {
  readonly failedFact: SpellAttachmentRejectionFact;
  readonly coordinate: SpellAttachmentRejectionCoordinate;
};

type AdmittedSpellTargetAttachment<
  AllowedFields extends SpellTargetSelectionField,
> = Omit<SpellTargetAttachment, "value"> & {
  readonly value: Omit<
    SpellTargetAttachmentValue,
    "rangeOrigin" | "selection"
  > & {
    readonly selection: AdmittedSpellTargetSelection<AllowedFields>;
  };
};

export type SpellTargetAttachmentAdmissionResult<
  AllowedFields extends SpellTargetSelectionField,
> =
  | {
      readonly tag: "admitted";
      readonly attachment: AdmittedSpellTargetAttachment<AllowedFields>;
    }
  | {
      readonly tag: "rejected";
      readonly reason:
        | "targetAttachmentMissing"
        | "targetAttachmentConstraint"
        | "targetSelectionConstraint";
      readonly rejections: ReadonlyNonEmptyArray<SpellAttachmentRejection>;
    };

const SPELL_TARGET_ATTACHMENT_VALUE_FIELDS = [
  "kind",
  "selection",
] as const satisfies ReadonlyArray<keyof SpellTargetAttachmentValue>;

/**
 * Keep authored branch ownership explicit at the static mechanics boundary.
 * Surface schemas normally reject or strip unknown fields, but admission
 * tests and future decoders can still present a typed branch with an optional
 * field that a procedure does not consume. Own-key inspection makes that
 * omission fail closed instead of silently projecting a partial branch.
 */
export function spellMechanicsObjectHasOnlyKeys<
  Value extends object,
  const AllowedFields extends readonly (keyof Value)[],
>(value: Value, allowedFields: AllowedFields): boolean {
  const allowed = new Set<PropertyKey>(allowedFields);
  return Reflect.ownKeys(value).every((field) => allowed.has(field));
}

export function spellHasOnlyNamedFields<const Value extends object>(
  value: Value,
  allowedFields: readonly (keyof Value)[],
): boolean {
  return spellMechanicsObjectHasOnlyKeys(value, allowedFields);
}

function spellAttachmentRejections(
  values: ReadonlyNonEmptyArray<SpellAttachmentRejection>,
): ReadonlyNonEmptyArray<SpellAttachmentRejection> {
  return values;
}

function spellAttachmentWrapperRejections(
  value: object,
): readonly SpellAttachmentRejection[] {
  const allowedFields = new Set<PropertyKey>(SPELL_ATTACHMENT_WRAPPER_FIELDS);
  return Reflect.ownKeys(value)
    .filter((field) => !allowedFields.has(field))
    .map((field) => ({
      failedFact: "attachment" as const,
      coordinate: { kind: "wrapper" as const, field },
    }));
}

function spellAttachmentValueRejections(
  value: object,
  allowedFields: readonly SpellAttachmentValueField[],
): readonly SpellAttachmentRejection[] {
  const allowed = new Set<PropertyKey>(allowedFields);
  return Reflect.ownKeys(value)
    .filter((field) => !allowed.has(field))
    .map((field) => {
      const knownField = isSpellAttachmentValueField(field) ? field : undefined;
      return {
        failedFact:
          knownField === undefined || knownField === "kind"
            ? "attachment"
            : knownField,
        coordinate: { kind: "value" as const, field },
      };
    });
}

function isSpellAttachmentValueField(
  field: PropertyKey,
): field is SpellAttachmentValueField {
  return (
    typeof field === "string" &&
    SPELL_ATTACHMENT_VALUE_FIELDS.some((allowedField) => allowedField === field)
  );
}

function spellTargetSelectionRejections(
  selection: object,
  allowedFields: readonly SpellTargetSelectionField[],
): readonly SpellAttachmentRejection[] {
  const allowed = new Set<PropertyKey>(allowedFields);
  return Reflect.ownKeys(selection)
    .filter((field) => !allowed.has(field))
    .map((field) => {
      const knownField = isSpellTargetSelectionField(field) ? field : undefined;
      return {
        failedFact: knownField === undefined ? "selection" : knownField,
        coordinate: { kind: "selection" as const, field },
      };
    });
}

function isSpellTargetSelectionField(
  field: PropertyKey,
): field is SpellTargetSelectionField {
  return (
    typeof field === "string" &&
    (field === "mode" ||
      field === "targetKinds" ||
      field === "typeFilter" ||
      field === "creatureSizeFilter" ||
      field === "visibility" ||
      field === "relativePosition" ||
      field === "objectFilter" ||
      field === "creatureDisposition" ||
      field === "objectOrLocationMaxDimensionFeet" ||
      field === "count" ||
      field === "repeatsAllowed" ||
      field === "castingRequirement" ||
      field === "stateFilter" ||
      field === "disposition")
  );
}

function isSpellTargetAttachment(
  attachment: Attachment,
): attachment is SpellTargetAttachment {
  return attachment.kind === "hole" && attachment.value.kind === "target";
}

function isSpellDirectTargetAttachment(
  attachment: Attachment,
): attachment is SpellDirectTargetAttachment {
  return attachment.kind === "target";
}

function isAdmittedSpellTargetSelection<
  const AllowedFields extends readonly SpellTargetSelectionField[],
>(
  selection: TargetSelection,
  allowedFields: AllowedFields,
): selection is AdmittedSpellTargetSelection<AllowedFields[number]> {
  return spellHasOnlyNamedFields<SpellTargetSelectionFieldShape>(
    selection,
    allowedFields,
  );
}

/**
 * Admit the complete target-hole shape consumed by a target-selection
 * procedure. The attachment/value key sets deliberately exclude rangeOrigin,
 * while the caller's selection field list makes procedure ownership explicit.
 * Own-key inspection keeps a future Surface schema field from being silently
 * dropped.
 */
export function admitSpellTargetAttachment<
  const AllowedFields extends readonly SpellTargetSelectionField[],
>(
  attachment: Attachment,
  allowedSelectionFields: AllowedFields,
): SpellTargetAttachmentAdmissionResult<AllowedFields[number]> {
  if (!isSpellTargetAttachment(attachment)) {
    if (isSpellDirectTargetAttachment(attachment)) {
      const directTargetRejections = spellAttachmentValueRejections(
        attachment,
        SPELL_TARGET_ATTACHMENT_VALUE_FIELDS,
      );
      const selectionRejections = spellTargetSelectionRejections(
        attachment.selection,
        allowedSelectionFields,
      );
      const nonEmptyDirectTargetRejections = spellProcedureNonEmpty(
        directTargetRejections,
      );
      if (nonEmptyDirectTargetRejections !== undefined) {
        return {
          tag: "rejected",
          reason: "targetAttachmentConstraint",
          rejections: spellAttachmentRejections([
            nonEmptyDirectTargetRejections[0],
            ...nonEmptyDirectTargetRejections.slice(1),
            ...selectionRejections,
          ]),
        };
      }
      const nonEmptySelectionRejections =
        spellProcedureNonEmpty(selectionRejections);
      if (nonEmptySelectionRejections !== undefined) {
        return {
          tag: "rejected",
          reason: "targetSelectionConstraint",
          rejections: spellAttachmentRejections(nonEmptySelectionRejections),
        };
      }
    }
    return {
      tag: "rejected",
      reason: "targetAttachmentMissing",
      rejections: spellAttachmentRejections([
        {
          failedFact: "attachment",
          coordinate: { kind: "wrapper", field: "kind" },
        },
      ]),
    };
  }
  const attachmentRejections = [
    ...spellAttachmentWrapperRejections(attachment),
    ...spellAttachmentValueRejections(
      attachment.value,
      SPELL_TARGET_ATTACHMENT_VALUE_FIELDS,
    ),
  ];
  const selection = attachment.value.selection;
  const selectionRejections = spellTargetSelectionRejections(
    selection,
    allowedSelectionFields,
  );
  const nonEmptyAttachmentRejections =
    spellProcedureNonEmpty(attachmentRejections);
  if (nonEmptyAttachmentRejections !== undefined) {
    return {
      tag: "rejected",
      reason: "targetAttachmentConstraint",
      rejections: spellAttachmentRejections([
        nonEmptyAttachmentRejections[0],
        ...nonEmptyAttachmentRejections.slice(1),
        ...selectionRejections,
      ]),
    };
  }
  const nonEmptySelectionRejections =
    spellProcedureNonEmpty(selectionRejections);
  if (nonEmptySelectionRejections !== undefined) {
    return {
      tag: "rejected",
      reason: "targetSelectionConstraint",
      rejections: spellAttachmentRejections(nonEmptySelectionRejections),
    };
  }
  // The own-key parser above has proved that every selection field is within
  // the procedure's allow-list; carry that proof into the admitted type.
  const admittedSelection = selection as AdmittedSpellTargetSelection<
    AllowedFields[number]
  >;
  const admittedAttachment = {
    ...attachment,
    value: {
      ...attachment.value,
      selection: admittedSelection,
    },
  } satisfies AdmittedSpellTargetAttachment<AllowedFields[number]>;
  return {
    tag: "admitted",
    attachment: admittedAttachment,
  };
}

export type SpellAreaAttachmentAdmissionResult<
  AllowedSelectionFields extends SpellTargetSelectionField,
  AllowedAreaFields extends SpellAreaAttachmentField,
> =
  | {
      readonly tag: "admitted";
      readonly attachment:
        | AdmittedSpellAreaAttachmentValue<
            AllowedSelectionFields,
            AllowedAreaFields
          >
        | AdmittedSpellAreaHoleAttachment<
            AllowedSelectionFields,
            AllowedAreaFields
          >;
    }
  | {
      readonly tag: "rejected";
      readonly reason:
        | "areaAttachmentMissing"
        | "areaAttachmentConstraint"
        | "areaSelectionConstraint";
      readonly rejections: ReadonlyNonEmptyArray<SpellAttachmentRejection>;
    };

function isSpellAreaAttachment(
  attachment: Attachment,
): attachment is SpellAreaAttachmentValue | SpellAreaHoleAttachment {
  if (attachment.kind === "area") return true;
  return attachment.kind === "hole" && attachment.value.kind === "area";
}

function isAdmittedSpellAreaAttachmentValue<
  const AllowedSelectionFields extends readonly SpellTargetSelectionField[],
  const AllowedAreaFields extends readonly SpellAreaAttachmentField[],
>(
  areaValue: SpellAreaAttachmentValueWithAllowedFields<
    AllowedAreaFields[number]
  >,
  allowedSelectionFields: AllowedSelectionFields,
  allowedAreaFields: AllowedAreaFields,
): areaValue is AdmittedSpellAreaAttachmentValue<
  AllowedSelectionFields[number],
  AllowedAreaFields[number]
> {
  const selection = areaValue.selection;
  return (
    selection === undefined ||
    (allowedAreaFields.some((field) => field === "selection") &&
      isAdmittedSpellTargetSelection(selection, allowedSelectionFields))
  );
}

/**
 * Admit the area attachment shape consumed by a save-gate procedure. The
 * caller names every optional area field it projects; unknown or future
 * fields, including range-origin metadata, are rejected unless explicitly
 * owned. A target-selection field list is required whenever `selection` is
 * part of the admitted area shape.
 */
export function admitSpellAreaAttachment<
  const AllowedSelectionFields extends readonly SpellTargetSelectionField[],
  const AllowedAreaFields extends readonly SpellAreaAttachmentField[],
>(
  attachment: Attachment,
  allowedSelectionFields: AllowedSelectionFields,
  allowedAreaFields: AllowedAreaFields,
): SpellAreaAttachmentAdmissionResult<
  AllowedSelectionFields[number],
  AllowedAreaFields[number]
> {
  if (!isSpellAreaAttachment(attachment)) {
    return {
      tag: "rejected",
      reason: "areaAttachmentMissing",
      rejections: spellAttachmentRejections([
        {
          failedFact: "attachment",
          coordinate: { kind: "wrapper", field: "kind" },
        },
      ]),
    };
  }

  const areaValue = attachment.kind === "area" ? attachment : attachment.value;
  const allowedAreaValueFields = [
    ...SPELL_AREA_ATTACHMENT_REQUIRED_FIELDS,
    ...allowedAreaFields,
  ] as const satisfies ReadonlyArray<keyof SpellAreaAttachmentValue>;
  const wrapperRejections =
    attachment.kind === "hole"
      ? spellAttachmentWrapperRejections(attachment)
      : [];
  const areaValueRejections = spellAttachmentValueRejections(
    areaValue,
    allowedAreaValueFields,
  );
  const nonEmptyAttachmentRejections = spellProcedureNonEmpty([
    ...wrapperRejections,
    ...areaValueRejections,
  ]);
  if (nonEmptyAttachmentRejections !== undefined) {
    return {
      tag: "rejected",
      reason: "areaAttachmentConstraint",
      rejections: spellAttachmentRejections(nonEmptyAttachmentRejections),
    };
  }
  // The exact own-key rejection pass above proved that the area contains only
  // required fields and the procedure's allowed optional fields.
  const areaValueWithAllowedFields =
    areaValue as SpellAreaAttachmentValueWithAllowedFields<
      AllowedAreaFields[number]
    >;
  const selectionRejections =
    areaValue.selection === undefined
      ? []
      : spellTargetSelectionRejections(
          areaValue.selection,
          allowedSelectionFields,
        );
  const nonEmptySelectionRejections =
    spellProcedureNonEmpty(selectionRejections);
  if (
    !isAdmittedSpellAreaAttachmentValue(
      areaValueWithAllowedFields,
      allowedSelectionFields,
      allowedAreaFields,
    )
  ) {
    return {
      tag: "rejected",
      reason: "areaSelectionConstraint",
      rejections:
        nonEmptySelectionRejections ??
        spellAttachmentRejections([
          {
            failedFact: "selection",
            coordinate: { kind: "value", field: "selection" },
          },
        ]),
    };
  }
  return attachment.kind === "hole"
    ? {
        tag: "admitted",
        attachment: { ...attachment, value: areaValueWithAllowedFields },
      }
    : { tag: "admitted", attachment: areaValueWithAllowedFields };
}

/** Stable issue identity: only the failed fact and its exact source path. */
export function spellMechanicsIssueKey(issue: {
  readonly failedFact: string;
  readonly mechanicsPath: UnitMechanicsPath;
}): string {
  return JSON.stringify([issue.failedFact, issue.mechanicsPath.nodes]);
}

/** Dedupe only exact failed-fact/path pairs while preserving discovery order. */
export function spellUniqueMechanicsIssues<
  Issue extends {
    readonly failedFact: string;
    readonly mechanicsPath: UnitMechanicsPath;
  },
>(issues: readonly Issue[]): readonly Issue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = spellMechanicsIssueKey(issue);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Facts are the source-free Definition projection carried by a static
 * profile. Profile owners may refine this type with additional static facts;
 * the registry keeps the procedure-discriminated admitted union intact.
 */
export type SpellProcedureMechanicsFacts = SpellDefinitionRuleFacts;

type SpellProcedureMechanicsFactsConstraint = object;

type SpellProcedureMechanicsFactsByProcedureConstraint = {
  readonly [P in BattleSpellProcedureKey]: SpellProcedureMechanicsFactsConstraint;
};

export type SpellProcedureMechanicsFactsByProcedure = {
  readonly [P in BattleSpellProcedureKey]: SpellProcedureMechanicsFacts;
};

export type SpellProcedureMechanicsInvocation<
  P extends BattleSpellProcedureKey,
> = Extract<SupportedSpellInvocation, { readonly procedure: P }>;

export type SpellProcedureAdmissionIssue<
  P extends BattleSpellProcedureKey = BattleSpellProcedureKey,
  FailedFact extends string = string,
  MechanicsPath extends UnitMechanicsPath = UnitMechanicsPath,
> = {
  readonly tag: "spellProcedureAdmissionIssue";
  readonly procedure: P;
  readonly failedFact: FailedFact;
  readonly mechanicsPath: MechanicsPath;
  readonly message: string;
};

/**
 * A supported static projection binds its contextual admission operation to
 * the exact procedure facts it just produced. This is the parse-once seam:
 * contextual admission receives only the mechanics-free execution source and
 * context, never the authored mechanics graph.
 */
export type AdmittedSpellProcedureMechanics<
  P extends BattleSpellProcedureKey,
  Facts extends SpellProcedureMechanicsFactsConstraint,
  Invocation extends SupportedSpellInvocation =
    SpellProcedureMechanicsInvocation<P>,
> = {
  readonly binding: "ready";
  readonly procedure: P;
  readonly facts: Facts;
  readonly evidence: SpellProcedureMechanicsEvidence;
  readonly admit: (
    source: BattleSpellExecutionSource,
    ctx: SpellAdmissionContext,
  ) => readonly Invocation[];
};

export type SpellProcedureMechanicsInspection<
  P extends BattleSpellProcedureKey,
  Facts extends SpellProcedureMechanicsFactsConstraint =
    SpellProcedureMechanicsFacts,
  Invocation extends SupportedSpellInvocation =
    SpellProcedureMechanicsInvocation<P>,
  Issue extends SpellProcedureAdmissionIssue<P> =
    SpellProcedureAdmissionIssue<P>,
> =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "supported";
      readonly admitted: AdmittedSpellProcedureMechanics<P, Facts, Invocation>;
    }
  | {
      readonly tag: "unsupported";
      readonly issues: ReadonlyNonEmptyArray<Issue>;
    };

/**
 * Static owner hook required on every authored Spell Procedure Declaration.
 * It is the only owner of the procedure's Surface mechanics recognition.
 */
export type SpellProcedureMechanicsAdmissionDeclaration<
  P extends BattleSpellProcedureKey,
  Facts extends SpellProcedureMechanicsFactsConstraint =
    SpellProcedureMechanicsFacts,
  Invocation extends SupportedSpellInvocation =
    SpellProcedureMechanicsInvocation<P>,
  Issue extends SpellProcedureAdmissionIssue<P> =
    SpellProcedureAdmissionIssue<P>,
> = {
  readonly admitMechanics: (
    source: SpellMechanicsAdmissionSource,
  ) => SpellProcedureMechanicsInspection<P, Facts, Invocation, Issue>;
};

/**
 * Heterogeneous static reader view derived from the canonical declaration
 * table. The mapped union preserves each reader's procedure/facts relation;
 * there is no independently writable procedure field beside the admitted
 * value's discriminator.
 */
export type AnySpellProcedureMechanicsAdmission<
  FactsByProcedure extends SpellProcedureMechanicsFactsByProcedureConstraint =
    SpellProcedureMechanicsFactsByProcedure,
> = {
  readonly admitMechanics: (
    source: SpellMechanicsAdmissionSource,
  ) => SpellProcedureMechanicsInspectionView<FactsByProcedure>;
};

export type AdmittedSpellProcedureMechanicsView<
  FactsByProcedure extends SpellProcedureMechanicsFactsByProcedureConstraint =
    SpellProcedureMechanicsFactsByProcedure,
> = {
  readonly [P in BattleSpellProcedureKey]: AdmittedSpellProcedureMechanics<
    P,
    FactsByProcedure[P],
    SpellProcedureMechanicsInvocation<P>
  >;
}[BattleSpellProcedureKey];

export type SpellProcedureMechanicsInspectionView<
  FactsByProcedure extends SpellProcedureMechanicsFactsByProcedureConstraint =
    SpellProcedureMechanicsFactsByProcedure,
> =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "supported";
      readonly admitted: AdmittedSpellProcedureMechanicsView<FactsByProcedure>;
    }
  | {
      readonly tag: "unsupported";
      readonly issues: ReadonlyNonEmptyArray<SpellProcedureAdmissionIssue>;
    };
export type BattleSpellMechanicsAdmission<
  FactsByProcedure extends SpellProcedureMechanicsFactsByProcedureConstraint =
    SpellProcedureMechanicsFactsByProcedure,
> =
  | { readonly tag: "notBattleOwned" }
  | {
      readonly tag: "admitted";
      readonly procedures: ReadonlyNonEmptyArray<
        AdmittedSpellProcedureMechanicsView<FactsByProcedure>
      >;
    }
  | {
      readonly tag: "rejected";
      readonly issues: ReadonlyNonEmptyArray<SpellProcedureAdmissionIssue>;
    };

export function spellProcedureNonEmpty<T>(
  values: readonly T[],
): ReadonlyNonEmptyArray<T> | undefined {
  const [first, ...rest] = values;
  return first === undefined ? undefined : [first, ...rest];
}

/**
 * Named admission policies keep the witness count and tolerated loss coupled.
 * The three-witness policy tolerates exactly one missing witness; the
 * five-witness policy tolerates exactly two. A caller cannot provide a
 * threshold that disagrees with its witness tuple. Named witnesses are the
 * preferred form: duplicate names are rejected so one domain fact cannot be
 * counted twice under different labels.
 */
export type SpellProcedureSignatureWitness = {
  readonly name: string;
  readonly present: boolean;
};

export type SpellProcedureRedundantSignaturePolicy =
  | {
      readonly kind: "oneWitnessMayBeMissing";
      readonly witnesses: readonly [
        SpellProcedureSignatureWitness,
        SpellProcedureSignatureWitness,
        SpellProcedureSignatureWitness,
      ];
    }
  | {
      readonly kind: "twoWitnessesMayBeMissing";
      readonly witnesses: readonly [
        SpellProcedureSignatureWitness,
        SpellProcedureSignatureWitness,
        SpellProcedureSignatureWitness,
        SpellProcedureSignatureWitness,
        SpellProcedureSignatureWitness,
      ];
    };

export function spellProcedureHasRedundantSignature(
  policy: SpellProcedureRedundantSignaturePolicy,
): boolean {
  const witnessNames = policy.witnesses.map(({ name }) => name);
  if (
    witnessNames.some((name) => name.length === 0) ||
    witnessNames.length !== new Set(witnessNames).size
  ) {
    return false;
  }
  const matches = policy.witnesses.reduce(
    (total, { present }) => total + (present ? 1 : 0),
    0,
  );
  return Match.value(policy.kind).pipe(
    Match.when("oneWitnessMayBeMissing", () => matches >= 2),
    Match.when("twoWitnessesMayBeMissing", () => matches >= 3),
    Match.exhaustive,
  );
}

/** Require every independent structural witness when the characteristic
 * effect is absent, so an empty/mutated branch remains owned without creating
 * a broad collision candidate for another profile. */
export function spellProcedureHasCompleteSignature(
  witnesses: readonly SpellProcedureSignatureWitness[],
): boolean {
  const witnessNames = witnesses.map(({ name }) => name);
  return (
    witnessNames.length > 0 &&
    witnessNames.every((name) => name.length > 0) &&
    witnessNames.length === new Set(witnessNames).size &&
    witnesses.every(({ present }) => present)
  );
}

export function spellProcedureMapNonEmpty<T, U>(
  values: ReadonlyNonEmptyArray<T>,
  map: (value: T) => U,
): ReadonlyNonEmptyArray<U> {
  const [first, ...rest] = values;
  return [map(first), ...rest.map(map)];
}

/**
 * Compose static readers from a canonical declaration view. The injected
 * `admissions` parameter makes the fold independently testable without
 * introducing a production registry or status table; production callers use
 * the declaration-derived view from admission-registry.ts.
 */
export function admitBattleSpellMechanicsFrom<
  FactsByProcedure extends SpellProcedureMechanicsFactsByProcedureConstraint =
    SpellProcedureMechanicsFactsByProcedure,
>(
  source: SpellMechanicsAdmissionSource,
  admissions: readonly AnySpellProcedureMechanicsAdmission<FactsByProcedure>[],
): BattleSpellMechanicsAdmission<FactsByProcedure> {
  const inspections = admissions.map(({ admitMechanics }) =>
    admitMechanics(source),
  );
  const supported = inspections.flatMap((inspection) =>
    inspection.tag === "supported" ? [inspection.admitted] : [],
  );
  const issues = inspections.flatMap((inspection) =>
    inspection.tag === "unsupported" ? inspection.issues : [],
  );

  const unsupportedIssues = spellProcedureNonEmpty(issues);
  if (unsupportedIssues !== undefined) {
    return { tag: "rejected", issues: unsupportedIssues };
  }

  const admittedProcedures = spellProcedureNonEmpty(supported);
  return admittedProcedures === undefined
    ? { tag: "notBattleOwned" }
    : { tag: "admitted", procedures: admittedProcedures };
}
