import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { UnitMechanicsPath } from "@dnd/surface/surface/mechanics-graph-path";
import {
  spellMaterialComponentPath,
  type SpellMechanicsBranchPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellMechanics } from "@dnd/surface/surface/types";

import type {
  BattleSpellExecutionSource,
  SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import type { BattleSpellProcedureKey } from "../../character-execution.ts";
import type { SpellDefinitionRuleFacts } from "../../procedure-execution/spell-rule-facts.ts";
import type { SpellAdmissionContext } from "./profile.ts";

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
 * Return canonical evidence paths for authored material cost and consumption
 * branches. Material evidence is shared by every mechanics admission owner;
 * it is not specific to any one execution profile.
 */
export function spellConsumedMaterialEvidencePaths(
  components: SpellMechanics["components"],
): readonly SpellMechanicsBranchPath[] {
  if (components.m === false) {
    return [];
  }
  const paths: SpellMechanicsBranchPath[] = [];
  const hasCost =
    typeof components.m === "object" ||
    ("materialCostGp" in components && components.materialCostGp !== undefined);
  const hasConsumption =
    "materialConsumed" in components && components.materialConsumed === true;
  if (hasCost) {
    paths.push(spellMaterialComponentPath("cost"));
  }
  if (hasConsumption) {
    paths.push(spellMaterialComponentPath("consumption"));
  }
  return paths;
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
> = {
  readonly tag: "spellProcedureAdmissionIssue";
  readonly procedure: P;
  readonly failedFact: string;
  readonly mechanicsPath: UnitMechanicsPath;
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

function nonEmpty<T>(
  values: readonly T[],
): ReadonlyNonEmptyArray<T> | undefined {
  const [first, ...rest] = values;
  return first === undefined ? undefined : [first, ...rest];
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

  const unsupportedIssues = nonEmpty(issues);
  if (unsupportedIssues !== undefined) {
    return { tag: "rejected", issues: unsupportedIssues };
  }

  const admittedProcedures = nonEmpty(supported);
  return admittedProcedures === undefined
    ? { tag: "notBattleOwned" }
    : { tag: "admitted", procedures: admittedProcedures };
}
