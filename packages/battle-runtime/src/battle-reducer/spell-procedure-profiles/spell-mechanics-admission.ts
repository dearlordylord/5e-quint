import {
  ELAPSED_TIME_TICKS_PER_DAY,
  ELAPSED_TIME_TICKS_PER_HOUR,
  ELAPSED_TIME_TICKS_PER_MINUTE,
  elapsedTimeTicks,
  type ElapsedTimeTicks,
} from "@dnd/shared/elapsed-time";
import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  PositiveInteger,
  movementFeet,
  type MovementFeet,
  type ReadonlyNonEmptyArray,
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
import { Match, Result } from "effect";

/**
 * Static admission receives only the already-decoded mechanics graph and the
 * common Definition projection. Authored identity and all cast-time state are
 * deliberately absent from this carrier.
 */
export type SpellMechanicsAdmissionSource = {
  readonly mechanics: SpellMechanics;
  readonly spellDefinitionRuleFacts: SpellDefinitionRuleFacts;
};

/** Derive elapsed ticks from a validated authored duration value. */
export function spellDurationValueTicks(
  value: DurationValue,
): ElapsedTimeTicks | null {
  const ticks = elapsedTimeTicksFromTimeSpanDuration(value);
  return Result.isFailure(ticks) ? null : ticks.success;
}

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
    };

const SPELL_TARGET_ATTACHMENT_FIELDS = [
  "kind",
  "holeId",
  "label",
  "value",
] as const satisfies ReadonlyArray<keyof SpellTargetAttachment>;
const SPELL_TARGET_ATTACHMENT_VALUE_FIELDS = [
  "kind",
  "selection",
] as const satisfies ReadonlyArray<keyof SpellTargetAttachmentValue>;

function hasOnlyNamedFields<Value extends object>(
  value: Value,
  allowedFields: readonly (keyof Value)[],
): boolean {
  const allowed = new Set<PropertyKey>(allowedFields);
  return Reflect.ownKeys(value).every((field) => allowed.has(field));
}

function isSpellTargetAttachment(
  attachment: Attachment,
): attachment is SpellTargetAttachment {
  return attachment.kind === "hole" && attachment.value.kind === "target";
}

function isAdmittedSpellTargetSelection<
  const AllowedFields extends readonly SpellTargetSelectionField[],
>(
  selection: TargetSelection,
  allowedFields: AllowedFields,
): selection is AdmittedSpellTargetSelection<AllowedFields[number]> {
  return hasOnlyNamedFields<SpellTargetSelectionFieldShape>(
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
    return {
      tag: "rejected",
      reason: "targetAttachmentMissing",
    };
  }
  if (
    !hasOnlyNamedFields(attachment, SPELL_TARGET_ATTACHMENT_FIELDS) ||
    !hasOnlyNamedFields(attachment.value, SPELL_TARGET_ATTACHMENT_VALUE_FIELDS)
  ) {
    return {
      tag: "rejected",
      reason: "targetAttachmentConstraint",
    };
  }
  const selection = attachment.value.selection;
  if (!isAdmittedSpellTargetSelection(selection, allowedSelectionFields)) {
    return {
      tag: "rejected",
      reason: "targetSelectionConstraint",
    };
  }
  const admittedAttachment = {
    ...attachment,
    value: {
      ...attachment.value,
      selection,
    },
  } satisfies AdmittedSpellTargetAttachment<AllowedFields[number]>;
  return {
    tag: "admitted",
    attachment: admittedAttachment,
  };
}

/** Stable issue identity: only the failed fact and its exact source path. */
export function spellMechanicsIssueKey(issue: {
  readonly failedFact: string;
  readonly mechanicsPath: SpellMechanicsBranchPath;
}): string {
  return JSON.stringify([issue.failedFact, issue.mechanicsPath.nodes]);
}

/** Dedupe only exact failed-fact/path pairs while preserving discovery order. */
export function spellUniqueMechanicsIssues<
  Issue extends {
    readonly failedFact: string;
    readonly mechanicsPath: SpellMechanicsBranchPath;
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
  Facts extends SpellProcedureMechanicsFacts,
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
  Facts extends SpellProcedureMechanicsFacts = SpellProcedureMechanicsFacts,
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
  Facts extends SpellProcedureMechanicsFacts = SpellProcedureMechanicsFacts,
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
  FactsByProcedure extends SpellProcedureMechanicsFactsByProcedure =
    SpellProcedureMechanicsFactsByProcedure,
> = {
  readonly admitMechanics: (
    source: SpellMechanicsAdmissionSource,
  ) => SpellProcedureMechanicsInspectionView<FactsByProcedure>;
};

export type AdmittedSpellProcedureMechanicsView<
  FactsByProcedure extends SpellProcedureMechanicsFactsByProcedure =
    SpellProcedureMechanicsFactsByProcedure,
> = {
  readonly [P in BattleSpellProcedureKey]: AdmittedSpellProcedureMechanics<
    P,
    FactsByProcedure[P],
    SpellProcedureMechanicsInvocation<P>
  >;
}[BattleSpellProcedureKey];

export type SpellProcedureMechanicsInspectionView<
  FactsByProcedure extends SpellProcedureMechanicsFactsByProcedure =
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
  FactsByProcedure extends SpellProcedureMechanicsFactsByProcedure =
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

export function spellNonEmpty<T>(
  values: readonly T[],
): ReadonlyNonEmptyArray<T> | undefined {
  const [first, ...rest] = values;
  return first === undefined ? undefined : [first, ...rest];
}

export const spellProcedureNonEmpty = spellNonEmpty;

/**
 * Named admission policies keep the witness count and tolerated loss coupled.
 * The three-witness policy tolerates exactly one missing witness; the
 * five-witness policy tolerates exactly two. A caller cannot provide a
 * threshold that disagrees with its witness tuple.
 */
export type SpellProcedureRedundantSignaturePolicy =
  | {
      readonly kind: "oneWitnessMayBeMissing";
      readonly witnesses: readonly [boolean, boolean, boolean];
    }
  | {
      readonly kind: "twoWitnessesMayBeMissing";
      readonly witnesses: readonly [
        boolean,
        boolean,
        boolean,
        boolean,
        boolean,
      ];
    };

export function spellProcedureHasRedundantSignature(
  policy: SpellProcedureRedundantSignaturePolicy,
): boolean {
  let matches = 0;
  for (const witness of policy.witnesses) {
    if (witness) matches += 1;
  }
  return Match.value(policy.kind).pipe(
    Match.when("oneWitnessMayBeMissing", () => matches >= 2),
    Match.when("twoWitnessesMayBeMissing", () => matches >= 3),
    Match.exhaustive,
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
  FactsByProcedure extends SpellProcedureMechanicsFactsByProcedure =
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
