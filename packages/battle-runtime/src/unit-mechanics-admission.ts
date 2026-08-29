// This admission leaf changes no rule semantics. It only relates a decoded
// authored Unit graph to execution support already owned by production readers.
import { Match } from "effect";
import * as Either from "effect/Either";

import { PositiveInteger } from "@dnd/shared/types";
import type {
  SurfaceMechanicsAdmission,
  UnitMechanicsAdmissionIssueDraft,
  UnitMechanicsAdmissionResult,
} from "@dnd/surface/surface/catalog-install";
import {
  unitMechanicsPath,
  type MechanicsGraphPathNode,
  type UnitMechanicsPath,
} from "@dnd/surface/surface/mechanics-graph-path";
import { srdUnitAuthoredDependencies } from "@dnd/surface/surface/portable-surface";
import type { SrdSurface, SrdUnitRecord } from "@dnd/surface/surface/types";

import { battleUnitSupportProfilesForUnit } from "./unit-feature-support.ts";

type AdmissionIssue = UnitMechanicsAdmissionIssueDraft<UnitMechanicsPath>;

export type UnitMechanicsAdmissionInput = {
  readonly unit: SrdUnitRecord;
  readonly surface: SrdSurface;
};

/**
 * Admit a complete decoded Unit graph without consulting an actor or live
 * runtime state. Schema-declared dependencies and the runtime's existing
 * shape-based profile projection are both checked before the root admits.
 */
export function admitCompleteUnitMechanicsGraph(
  input: UnitMechanicsAdmissionInput,
): UnitMechanicsAdmissionResult {
  const issues: AdmissionIssue[] = [];
  inspectDependencies(input, issues);
  inspectExecutionSupport(input.unit, issues);

  const [firstIssue, ...remainingIssues] = issues;
  return firstIssue === undefined
    ? { tag: "admitted" }
    : { tag: "rejected", issues: [firstIssue, ...remainingIssues] };
}

/** The callback shape expected by the atomic Surface installer. */
export const admitCompleteUnitMechanics: SurfaceMechanicsAdmission["admitUnit"] =
  admitCompleteUnitMechanicsGraph;

function inspectDependencies(
  input: UnitMechanicsAdmissionInput,
  issues: AdmissionIssue[],
): void {
  const unitIds = new Set(input.surface.units.map((unit) => String(unit.id)));
  const statBlockIds = new Set(
    input.surface.statBlocks.map((statBlock) => String(statBlock.id)),
  );
  const projection = srdUnitAuthoredDependencies(input.unit);
  for (const issue of projection.issues) {
    addIssue(
      issues,
      "unsupported_mechanics",
      path({ kind: "singleton", role: "recordMechanics" }),
      `The Unit dependency graph cannot be interpreted: ${issue.message}`,
    );
  }
  for (const [index, dependency] of projection.dependencies.entries()) {
    const installedIds = Match.value(dependency.targetKind).pipe(
      Match.when("unit", () => unitIds),
      Match.when("statBlock", () => statBlockIds),
      Match.exhaustive,
    );
    if (installedIds.has(dependency.targetId)) continue;
    addIssue(
      issues,
      "incomplete_graph",
      path(
        { kind: "singleton", role: "recordMechanics" },
        {
          kind: "occurrence",
          role: "dependency",
          ordinal: PositiveInteger(index + 1),
        },
      ),
      `The Unit ${dependency.relation} dependency does not resolve to an installed ${dependency.targetKind}.`,
    );
  }
}

function inspectExecutionSupport(
  unit: SrdUnitRecord,
  issues: AdmissionIssue[],
): void {
  if (unit.kind === "class_feature" && unit.mechanics.family === "composite") {
    const before = issues.length;
    for (const [index, mechanics] of unit.mechanics.parts.entries()) {
      inspectProfileResult(
        battleUnitSupportProfilesForUnit({ unit: { ...unit, mechanics } }),
        path(
          { kind: "singleton", role: "recordMechanics" },
          {
            kind: "occurrence",
            role: "extension",
            ordinal: PositiveInteger(index + 1),
          },
        ),
        issues,
      );
    }
    if (issues.length > before) return;
  }

  inspectProfileResult(
    battleUnitSupportProfilesForUnit({ unit }),
    mechanicsRootPath(unit),
    issues,
  );
}

function inspectProfileResult(
  support: ReturnType<typeof battleUnitSupportProfilesForUnit>,
  mechanicsPath: UnitMechanicsPath,
  issues: AdmissionIssue[],
): void {
  if (Either.isLeft(support)) {
    addIssue(
      issues,
      "unsupported_mechanics",
      mechanicsPath,
      support.left.message,
    );
    return;
  }
  if (support.right.length === 0) {
    addIssue(
      issues,
      "no_admitted_procedure",
      mechanicsPath,
      "The Unit graph has no executable procedure admitted by this profile.",
    );
  }
}

function mechanicsRootPath(unit: SrdUnitRecord): UnitMechanicsPath {
  return "mechanics" in unit && unit.mechanics.family === "composite"
    ? path(
        { kind: "singleton", role: "recordMechanics" },
        { kind: "singleton", role: "extension" },
      )
    : path({ kind: "singleton", role: "recordMechanics" });
}

function path(
  first: MechanicsGraphPathNode,
  ...rest: MechanicsGraphPathNode[]
): UnitMechanicsPath {
  return unitMechanicsPath([first, ...rest]);
}

function addIssue(
  issues: AdmissionIssue[],
  reason: AdmissionIssue["reason"],
  mechanicsPath: UnitMechanicsPath,
  message: string,
): void {
  issues.push({ reason, mechanicsPath, message });
}
