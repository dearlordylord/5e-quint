// This admission leaf changes no rule semantics. It only relates a decoded
// authored Unit graph to execution support already owned by production readers.
import { Match } from "effect";
import * as Either from "effect/Either";

import { PositiveInteger } from "@dnd/shared/types";
import type {
  UnitMechanicsAdmissionIssueDraft,
  UnitMechanicsAdmissionResult,
} from "@dnd/surface/surface/catalog-install";
import {
  unitMechanicsPath,
  type MechanicsGraphPathNode,
  type UnitMechanicsPath,
} from "@dnd/surface/surface/mechanics-graph-path";
import { srdUnitAuthoredLinks } from "@dnd/surface/surface/portable-surface";
import { decodeUnitRecordEither } from "@dnd/surface/surface/schema";
import type {
  PassiveMechanics,
  SrdSurface,
  SrdUnitRecord,
} from "@dnd/surface/surface/types";

import {
  admitBattleUnitSupportPlan,
  battleUnitSupportProfilesForUnit,
  type AdmittedBattleUnitSupportPlan,
  type BattleUnitSupportProfile,
} from "./unit-feature-support.ts";

type AdmissionIssue = UnitMechanicsAdmissionIssueDraft<UnitMechanicsPath>;

export type UnitMechanicsAdmissionInput = {
  readonly unit: SrdUnitRecord;
  readonly surface: SrdSurface;
};

export type AdmittedUnitMechanics = AdmittedBattleUnitSupportPlan;

/**
 * Admit a complete decoded Unit graph without consulting an actor or live
 * runtime state. Schema-declared dependencies and the runtime's existing
 * shape-based profile projection are both checked before the root admits.
 */
export function admitCompleteUnitMechanicsGraph(
  input: UnitMechanicsAdmissionInput,
): UnitMechanicsAdmissionResult<UnitMechanicsPath, AdmittedUnitMechanics> {
  const issues: AdmissionIssue[] = [];
  inspectRootMembership(input, issues);
  inspectAuthoredLinks(input, issues);
  const execution = inspectExecutionSupport(input.unit, issues);

  const [firstIssue, ...remainingIssues] = issues;
  if (firstIssue !== undefined) {
    return { tag: "rejected", issues: [firstIssue, ...remainingIssues] };
  }
  if (execution === undefined) {
    return {
      tag: "rejected",
      issues: [
        {
          reason: "unsupported_mechanics",
          mechanicsPath: mechanicsRootPath(input.unit),
          message: "The Unit execution support plan was not admitted.",
        },
      ],
    };
  }
  return { tag: "admitted", execution };
}

/** The callback shape expected by the atomic Surface installer. */
export const admitCompleteUnitMechanics = admitCompleteUnitMechanicsGraph;

function inspectRootMembership(
  input: UnitMechanicsAdmissionInput,
  issues: AdmissionIssue[],
): void {
  const installedRoot = input.surface.units.find(
    (candidate) => candidate.id === input.unit.id,
  );
  if (installedRoot === input.unit) return;
  addIssue(
    issues,
    "incomplete_graph",
    path({ kind: "singleton", role: "recordMechanics" }),
    installedRoot === undefined
      ? "The Unit admission root is absent from the decoded Surface."
      : "The Unit admission root does not match the decoded Surface member with that authored identity.",
  );
}

function inspectAuthoredLinks(
  input: UnitMechanicsAdmissionInput,
  issues: AdmissionIssue[],
): void {
  const unitIds = new Set(input.surface.units.map((unit) => String(unit.id)));
  const statBlockIds = new Set(
    input.surface.statBlocks.map((statBlock) => String(statBlock.id)),
  );
  const projection = srdUnitAuthoredLinks(input.unit);
  for (const issue of projection.issues) {
    addIssue(
      issues,
      "unsupported_mechanics",
      path({ kind: "singleton", role: "recordMechanics" }),
      `The Unit authored-link graph cannot be interpreted: ${issue.message}`,
    );
  }
  for (const [index, link] of projection.links.entries()) {
    const installedIds = Match.value(link.targetKind).pipe(
      Match.when("unit", () => unitIds),
      Match.when("statBlock", () => statBlockIds),
      Match.exhaustive,
    );
    if (installedIds.has(link.targetId)) continue;
    const linkRole = Match.value(link.category).pipe(
      Match.when("dependency", () => "dependency" as const),
      Match.when("reference", () => "reference" as const),
      Match.exhaustive,
    );
    addIssue(
      issues,
      "incomplete_graph",
      path(
        { kind: "singleton", role: "recordMechanics" },
        {
          kind: "occurrence",
          role: linkRole,
          ordinal: PositiveInteger(index + 1),
        },
      ),
      `The Unit ${link.relation} authored ${link.category} does not resolve to an installed ${link.targetKind}.`,
    );
  }
}

function inspectExecutionSupport(
  unit: SrdUnitRecord,
  issues: AdmissionIssue[],
): AdmittedUnitMechanics | undefined {
  const admittedPlan = admitBattleUnitSupportPlan(unit);
  if (
    Either.isLeft(admittedPlan) &&
    !(unit.kind === "class_feature" && unit.mechanics.family === "composite")
  ) {
    addIssue(
      issues,
      "unsupported_mechanics",
      mechanicsRootPath(unit),
      admittedPlan.left.message,
    );
  }
  if (unit.kind === "class_feature" && unit.mechanics.family === "composite") {
    const before = issues.length;
    for (const [index, mechanics] of unit.mechanics.parts.entries()) {
      inspectUnitProfileCoverage(
        { ...unit, mechanics },
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
    if (issues.length > before) {
      return Either.isRight(admittedPlan) ? admittedPlan.right : undefined;
    }
  }

  inspectUnitProfileCoverage(unit, mechanicsRootPath(unit), issues);
  return Either.isRight(admittedPlan) ? admittedPlan.right : undefined;
}

function inspectUnitProfileCoverage(
  unit: SrdUnitRecord,
  mechanicsPath: UnitMechanicsPath,
  issues: AdmissionIssue[],
): readonly BattleUnitSupportProfile[] {
  const support = battleUnitSupportProfilesForUnit({ unit });
  const before = issues.length;
  inspectProfileResult(support, mechanicsPath, issues);
  if (
    issues.length !== before ||
    Either.isLeft(support) ||
    !("mechanics" in unit) ||
    unit.mechanics.family !== "passive"
  ) {
    return Either.isLeft(support) ? [] : support.right;
  }
  inspectPassiveMechanicsCoverage(
    unit,
    unit.mechanics,
    support.right,
    mechanicsPath,
    issues,
  );
  return support.right;
}

function inspectPassiveMechanicsCoverage(
  unit: SrdUnitRecord,
  mechanics: PassiveMechanics,
  admittedProfiles: readonly BattleUnitSupportProfile[],
  mechanicsPath: UnitMechanicsPath,
  issues: AdmissionIssue[],
): void {
  for (const [index] of mechanics.grants.entries()) {
    inspectRepresentedPassiveBranch({
      unit,
      admittedProfiles,
      mechanics: {
        ...mechanics,
        grants: mechanics.grants.filter(
          (_, grantIndex) => grantIndex !== index,
        ),
      },
      mechanicsPath: appendOccurrence(mechanicsPath, "effect", index + 1),
      label: "effect",
      issues,
    });
  }

  if (mechanics.condition !== undefined) {
    const { condition: _condition, ...withoutCondition } = mechanics;
    inspectRepresentedPassiveBranch({
      unit,
      admittedProfiles,
      mechanics: withoutCondition,
      mechanicsPath: appendOccurrence(mechanicsPath, "generalFact", 1),
      label: "condition",
      issues,
    });
  }

  for (const [index] of (mechanics.suppressedBy ?? []).entries()) {
    const remaining = mechanics.suppressedBy?.filter(
      (_, suppressorIndex) => suppressorIndex !== index,
    );
    const { suppressedBy: _suppressedBy, ...withoutSuppressors } = mechanics;
    inspectRepresentedPassiveBranch({
      unit,
      admittedProfiles,
      mechanics:
        remaining === undefined || remaining.length === 0
          ? withoutSuppressors
          : { ...mechanics, suppressedBy: remaining },
      mechanicsPath: appendOccurrence(mechanicsPath, "generalFact", index + 2),
      label: "suppressor",
      issues,
    });
  }

  for (const [index] of (mechanics.operations ?? []).entries()) {
    const remaining = mechanics.operations?.filter(
      (_, operationIndex) => operationIndex !== index,
    );
    const { operations: _operations, ...withoutOperations } = mechanics;
    inspectRepresentedPassiveBranch({
      unit,
      admittedProfiles,
      mechanics:
        remaining === undefined || remaining.length === 0
          ? withoutOperations
          : { ...mechanics, operations: remaining },
      mechanicsPath: appendOccurrence(
        mechanicsPath,
        "generalFact",
        (mechanics.suppressedBy?.length ?? 0) + index + 2,
      ),
      label: "operation",
      issues,
    });
  }
}

function inspectRepresentedPassiveBranch(input: {
  readonly unit: SrdUnitRecord;
  readonly admittedProfiles: readonly BattleUnitSupportProfile[];
  readonly mechanics: unknown;
  readonly mechanicsPath: UnitMechanicsPath;
  readonly label: "condition" | "effect" | "operation" | "suppressor";
  readonly issues: AdmissionIssue[];
}): void {
  const variant = decodeUnitRecordEither({
    ...input.unit,
    mechanics: input.mechanics,
  });
  if (Either.isLeft(variant)) return;
  const supportWithoutBranch = battleUnitSupportProfilesForUnit({
    unit: variant.right,
  });
  if (
    Either.isLeft(supportWithoutBranch) ||
    !sameSupportProfiles(input.admittedProfiles, supportWithoutBranch.right)
  ) {
    return;
  }
  addIssue(
    input.issues,
    "unsupported_mechanics",
    input.mechanicsPath,
    `The passive ${input.label} is represented in the authored graph but is not consumed by an admitted execution profile.`,
  );
}

function sameSupportProfiles(
  left: readonly BattleUnitSupportProfile[],
  right: readonly BattleUnitSupportProfile[],
): boolean {
  return sameStructuralValue(left, right);
}

function sameStructuralValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => sameStructuralValue(value, right[index]))
    );
  }
  if (!isRecord(left) || !isRecord(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  return (
    leftKeys.length === rightKeys.length &&
    leftKeys.every(
      (key, index) =>
        key === rightKeys[index] && sameStructuralValue(left[key], right[key]),
    )
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function appendOccurrence(
  mechanicsPath: UnitMechanicsPath,
  role: MechanicsGraphPathNode["role"],
  ordinal: number,
): UnitMechanicsPath {
  return unitMechanicsPath([
    ...mechanicsPath.nodes,
    { kind: "occurrence", role, ordinal: PositiveInteger(ordinal) },
  ]);
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
