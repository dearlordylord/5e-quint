import {
  movementFeet,
  type MovementFeet,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  spellMaterialComponentPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { Components, SpellMechanics } from "@dnd/surface/surface/types";

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
