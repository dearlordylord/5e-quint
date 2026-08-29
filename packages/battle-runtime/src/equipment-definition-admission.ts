import * as Either from "effect/Either";

import type {
  UnitMechanicsAdmissionIssueDraft,
  UnitMechanicsAdmissionResult,
} from "@dnd/surface/surface/catalog-install";
import {
  unitMechanicsPath,
  type MechanicsGraphPathNode,
  type UnitMechanicsPath,
} from "@dnd/surface/surface/mechanics-graph-path";
import type {
  SrdSurface,
  SrdUnitRecord,
} from "@dnd/surface/surface/types";

import {
  battleUnitSupportProfilesForUnit,
  isBattleWeaponMasterySupportProfile,
} from "./unit-feature-support.ts";

type AdmissionIssue = UnitMechanicsAdmissionIssueDraft<UnitMechanicsPath>;

/** Surface Unit roots handled by this admission leaf. */
export type EquipmentDefinitionUnit = Extract<
  SrdUnitRecord,
  { readonly kind: "armor" | "shield" | "weapon" }
>;

export type EquipmentDefinitionMechanicsAdmissionInput = {
  readonly unit: SrdUnitRecord;
  readonly surface: SrdSurface;
};

/** Narrow a decoded Unit to the ordinary equipment-definition role. */
export function isEquipmentDefinitionUnit(
  unit: SrdUnitRecord,
): unit is EquipmentDefinitionUnit {
  return (
    unit.kind === "armor" || unit.kind === "shield" || unit.kind === "weapon"
  );
}

/**
 * Admit an equipment-definition root into the aggregate Surface mechanics
 * graph. Equipment has no battle session state; the only cross-root closure
 * here is a weapon's mastery reference to an installed, structurally admitted
 * mastery Unit.
 */
export function admitEquipmentDefinitionMechanics(
  input: EquipmentDefinitionMechanicsAdmissionInput,
): UnitMechanicsAdmissionResult<UnitMechanicsPath> {
  const issues: AdmissionIssue[] = [];
  const unit = input.unit;
  if (!isEquipmentDefinitionUnit(unit)) {
    addIssue(
      issues,
      "no_admitted_procedure",
      mechanicsRootPath(),
      `Unit kind ${input.unit.kind} is not an Equipment Definition root.`,
    );
  } else {
    const equipmentInput = { ...input, unit };
    inspectRootMembership(equipmentInput, issues);
    if (equipmentInput.unit.kind === "weapon") {
      inspectWeaponMasteryReference(
        equipmentInput.unit,
        equipmentInput.surface,
        issues,
      );
    }
  }

  return admissionResult(issues);
}

/** The callback shape used by a role-aware atomic Surface installer. */
export const admitEquipmentDefinitionUnit =
  admitEquipmentDefinitionMechanics;

function inspectRootMembership(
  input: EquipmentDefinitionMechanicsAdmissionInput & {
    readonly unit: EquipmentDefinitionUnit;
  },
  issues: AdmissionIssue[],
): void {
  const installedRoot = input.surface.units.find(
    (candidate) => candidate.id === input.unit.id,
  );
  if (installedRoot === input.unit) return;
  addIssue(
    issues,
    "incomplete_graph",
    mechanicsRootPath(),
    installedRoot === undefined
      ? "The equipment Unit admission root is absent from the decoded Surface."
      : "The equipment Unit admission root does not match the decoded Surface member with that authored identity.",
  );
}

function inspectWeaponMasteryReference(
  weapon: Extract<EquipmentDefinitionUnit, { readonly kind: "weapon" }>,
  surface: SrdSurface,
  issues: AdmissionIssue[],
): void {
  const masteryPath = mechanicsPath(
    { kind: "singleton", role: "recordMechanics" },
    { kind: "singleton", role: "reference" },
  );
  const masteryUnitId = weapon.masteryUnitId;
  if (masteryUnitId === undefined) {
    addIssue(
      issues,
      "incomplete_graph",
      masteryPath,
      `Weapon mastery ${weapon.mastery} has no authored mastery Unit reference.`,
    );
    return;
  }
  const mastery = surface.units.find(
    (candidate) => candidate.id === masteryUnitId,
  );
  if (mastery === undefined) {
    addIssue(
      issues,
      "incomplete_graph",
      masteryPath,
      `Weapon mastery ${weapon.mastery} does not resolve to installed Unit ${masteryUnitId}.`,
    );
    return;
  }
  if (mastery.kind !== "mastery") {
    addIssue(
      issues,
      "ambiguous_mechanics",
      masteryPath,
      `Weapon mastery ${weapon.mastery} references installed Unit ${masteryUnitId}, which is not a mastery Unit.`,
    );
    return;
  }
  const support = battleUnitSupportProfilesForUnit({ unit: mastery });
  if (Either.isLeft(support)) {
    addIssue(issues, "unsupported_mechanics", masteryPath, support.left.message);
    return;
  }
  if (!support.right.some(isBattleWeaponMasterySupportProfile)) {
    addIssue(
      issues,
      "unsupported_mechanics",
      masteryPath,
      `Installed mastery Unit ${mastery.id} has no admitted weapon-mastery execution profile.`,
    );
  }
}

function admissionResult(
  issues: AdmissionIssue[],
): UnitMechanicsAdmissionResult<UnitMechanicsPath> {
  const [first, ...rest] = issues;
  return first === undefined
    ? { tag: "admitted" }
    : { tag: "rejected", issues: [first, ...rest] };
}

function mechanicsRootPath(): UnitMechanicsPath {
  return mechanicsPath({ kind: "singleton", role: "recordMechanics" });
}

function mechanicsPath(
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
