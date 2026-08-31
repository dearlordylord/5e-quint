import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import {
  unitMechanicsPath,
  type UnitMechanicsPath,
} from "@dnd/surface/surface/mechanics-graph-path";
import type { SpellMechanics } from "@dnd/surface/surface/types";

import type { BattleSpellProcedureKey } from "../../character-execution.ts";

/**
 * The root of every Unit spell mechanics graph.  Keep this coordinate in the
 * Battle owner so admission evidence cannot silently drift to a stat-block
 * path or to an authored-record identity.
 */
export const BATTLE_SPELL_ROOT_MECHANICS_PATH = unitMechanicsPath([
  { kind: "singleton", role: "recordMechanics" },
]);

/**
 * A profile's static projection has to account for at least one owned path.
 * An empty `unowned` tuple is the type-level complete-root guarantee; a
 * non-empty tuple is the type-level partial-root guarantee.
 */
export type CompleteSpellProcedureMechanicsEvidence = {
  readonly consumed: ReadonlyNonEmptyArray<UnitMechanicsPath>;
  readonly unowned: readonly [];
};

export type PartialSpellProcedureMechanicsEvidence = {
  readonly consumed: ReadonlyNonEmptyArray<UnitMechanicsPath>;
  readonly unowned: ReadonlyNonEmptyArray<UnitMechanicsPath>;
};

export type SpellProcedureMechanicsEvidence =
  | CompleteSpellProcedureMechanicsEvidence
  | PartialSpellProcedureMechanicsEvidence;

/**
 * Facts are intentionally generic and source-free.  Concrete profile modules
 * choose their own narrowed shape; this contract never carries SpellRecord
 * identity, provenance, caster, targets, slot/resource, turn, session/table,
 * or Battle State.
 */
export type SpellProcedureMechanicsFacts = object;

export type SpellProcedureAdmissionIssue<
  P extends BattleSpellProcedureKey = BattleSpellProcedureKey,
> = {
  readonly tag: "spellProcedureAdmissionIssue";
  readonly procedure: P;
  readonly failedFact: string;
  readonly mechanicsPath: UnitMechanicsPath;
  readonly message: string;
};

export type AdmittedSpellProcedureMechanics<
  P extends BattleSpellProcedureKey,
  Facts extends SpellProcedureMechanicsFacts,
> = {
  readonly binding: "ready";
  readonly procedure: P;
  readonly facts: Facts;
  readonly evidence: SpellProcedureMechanicsEvidence;
};

export type SpellProcedureMechanicsInspection<
  P extends BattleSpellProcedureKey,
  Facts extends SpellProcedureMechanicsFacts = SpellProcedureMechanicsFacts,
  Issue extends SpellProcedureAdmissionIssue<P> =
    SpellProcedureAdmissionIssue<P>,
> =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "supported";
      readonly procedure: AdmittedSpellProcedureMechanics<P, Facts>;
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
  Issue extends SpellProcedureAdmissionIssue<P> =
    SpellProcedureAdmissionIssue<P>,
> = {
  readonly admitMechanics: (
    mechanics: SpellMechanics,
  ) => SpellProcedureMechanicsInspection<P, Facts, Issue>;
};

/** Erased only at the registry view; profile hooks retain their concrete Facts type. */
export type AnySpellProcedureMechanicsAdmission = {
  readonly procedure: BattleSpellProcedureKey;
  readonly admitMechanics: (
    mechanics: SpellMechanics,
  ) => SpellProcedureMechanicsInspection<
    BattleSpellProcedureKey,
    SpellProcedureMechanicsFacts,
    SpellProcedureAdmissionIssue
  >;
};

export type AdmittedSpellProcedureMechanicsView =
  AdmittedSpellProcedureMechanics<
    BattleSpellProcedureKey,
    SpellProcedureMechanicsFacts
  >;

export type BattleSpellMechanicsAdmission =
  | { readonly tag: "notBattleOwned" }
  | {
      readonly tag: "admitted";
      readonly procedures: ReadonlyNonEmptyArray<AdmittedSpellProcedureMechanicsView>;
      /**
       * A represented candidate may reject a branch while another owner
       * admits a supported branch.  Preserve every typed issue for callers;
       * do not turn an unowned/no-owner root into a capability prerequisite.
       */
      readonly issues: readonly SpellProcedureAdmissionIssue[];
    }
  | {
      readonly tag: "rejected";
      readonly issues: ReadonlyNonEmptyArray<SpellProcedureAdmissionIssue>;
    };

function isSupportedInspection(
  inspection: SpellProcedureMechanicsInspection<
    BattleSpellProcedureKey,
    SpellProcedureMechanicsFacts
  >,
): inspection is Extract<
  SpellProcedureMechanicsInspection<
    BattleSpellProcedureKey,
    SpellProcedureMechanicsFacts
  >,
  { readonly tag: "supported" }
> {
  return inspection.tag === "supported";
}

function isUnsupportedInspection(
  inspection: SpellProcedureMechanicsInspection<
    BattleSpellProcedureKey,
    SpellProcedureMechanicsFacts
  >,
): inspection is Extract<
  SpellProcedureMechanicsInspection<
    BattleSpellProcedureKey,
    SpellProcedureMechanicsFacts
  >,
  { readonly tag: "unsupported" }
> {
  return inspection.tag === "unsupported";
}

function nonEmpty<T>(
  values: readonly T[],
): ReadonlyNonEmptyArray<T> | undefined {
  const [first, ...rest] = values;
  return first === undefined ? undefined : [first, ...rest];
}

/**
 * Compose static readers from a canonical declaration view.  The injected
 * `admissions` parameter makes the fold independently testable without
 * introducing a production registry or status table; production callers use
 * the declaration-derived view from admission-registry.ts.
 */
export function admitBattleSpellMechanicsFrom(
  mechanics: SpellMechanics,
  admissions: readonly AnySpellProcedureMechanicsAdmission[],
): BattleSpellMechanicsAdmission {
  const inspections = admissions.map(({ admitMechanics }) =>
    admitMechanics(mechanics),
  );
  const supported = inspections
    .filter(isSupportedInspection)
    .map(({ procedure }) => procedure);
  const issues = inspections
    .filter(isUnsupportedInspection)
    .flatMap(({ issues: inspectionIssues }) => inspectionIssues);

  const supportedProcedures = nonEmpty(supported);
  const unsupportedIssues = nonEmpty(issues);
  if (supportedProcedures !== undefined) {
    return {
      tag: "admitted",
      procedures: supportedProcedures,
      issues,
    };
  }
  if (unsupportedIssues !== undefined) {
    return { tag: "rejected", issues: unsupportedIssues };
  }
  return { tag: "notBattleOwned" };
}
