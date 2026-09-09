import { Match, Result } from "effect";

import type {
  UnitMechanicsAdmissionIssueDraft,
  UnitMechanicsAdmissionResult,
} from "@dnd/surface/surface/mechanics-admission";
import {
  unitMechanicsPath,
  type UnitMechanicsPath,
} from "@dnd/surface/surface/mechanics-graph-path";
import {
  resolveWeaponMasteryReference,
  type UnitCatalog,
  type WeaponMasteryReferenceIssue,
} from "@dnd/surface/surface/unit-catalog-core";
import type { UnitRecord, WeaponRecord } from "@dnd/surface/surface/types";

import type { WeaponExecutionFactsWithMasteryProperty } from "../character-weapon-execution-schema.ts";
import { weaponMasteryExecutionPropertyForSupportProfile } from "../unit-feature-execution-constants.ts";
import {
  admitWeaponMasteryProcedure,
  type BattleWeaponMasteryProcedureFacts,
} from "./weapon-mastery.ts";

const WEAPON_MASTERY_REFERENCE_PATH = unitMechanicsPath([
  { kind: "singleton", role: "recordMechanics" },
  { kind: "singleton", role: "reference" },
]);

type WeaponDefinitionAdmissionIssue =
  UnitMechanicsAdmissionIssueDraft<UnitMechanicsPath>;

export type AdmittedWeaponDefinition = {
  readonly tag: "admitted";
  readonly facts: WeaponExecutionFactsWithMasteryProperty;
  readonly resolvedMastery: {
    readonly unit: Extract<UnitRecord, { readonly kind: "mastery" }>;
    readonly procedureFacts: BattleWeaponMasteryProcedureFacts;
  };
};

/**
 * A weapon admission is structurally compatible with the Surface Unit
 * mechanics aggregate while carrying the authored-free execution value that
 * downstream battle composition binds to an equipment identity.
 */
export type WeaponDefinitionAdmission =
  | AdmittedWeaponDefinition
  | Extract<UnitMechanicsAdmissionResult, { readonly tag: "rejected" }>;

export function isWeaponDefinitionUnit(unit: UnitRecord): unit is WeaponRecord {
  return unit.kind === "weapon";
}

/** Admit one decoded weapon definition and its typed mastery reference. */
export function admitWeaponDefinition(input: {
  readonly weapon: WeaponRecord;
  readonly unitCatalog: UnitCatalog;
}): WeaponDefinitionAdmission {
  const resolution = resolveWeaponMasteryReference(
    input.weapon,
    input.unitCatalog,
  );
  if (Result.isFailure(resolution)) {
    return rejectedReference(resolution.failure);
  }

  const masteryAdmission = admitWeaponMasteryProcedure(
    resolution.success.mastery,
  );
  return Match.value(masteryAdmission).pipe(
    Match.when({ tag: "notBattleOwned" }, () =>
      rejected([
        {
          reason: "incomplete_graph",
          mechanicsPath: WEAPON_MASTERY_REFERENCE_PATH,
          message:
            "The weapon mastery reference resolved to a Unit outside the Weapon Mastery procedure domain.",
        },
      ]),
    ),
    Match.when({ tag: "rejected" }, ({ issues }) =>
      rejected([
        {
          reason: "unsupported_mechanics" as const,
          mechanicsPath: WEAPON_MASTERY_REFERENCE_PATH,
          message: `The referenced Weapon Mastery procedure is unsupported by Battle: ${issues[0].message}`,
        },
        ...issues.slice(1).map((issue) => ({
          reason: "unsupported_mechanics" as const,
          mechanicsPath: WEAPON_MASTERY_REFERENCE_PATH,
          message: `The referenced Weapon Mastery procedure is unsupported by Battle: ${issue.message}`,
        })),
      ]),
    ),
    Match.when({ tag: "admitted" }, ({ procedure }) => ({
      tag: "admitted" as const,
      resolvedMastery: {
        unit: resolution.success.mastery,
        procedureFacts: procedure.facts,
      },
      facts: {
        ...(input.weapon.attachedWeaponAttackOverrideEligibility === undefined
          ? {}
          : {
              attachedWeaponAttackOverrideEligibility:
                input.weapon.attachedWeaponAttackOverrideEligibility,
            }),
        category: input.weapon.category,
        usage: input.weapon.usage,
        damage: input.weapon.damage,
        properties: input.weapon.properties ?? [],
        costGp: input.weapon.costGp,
        masteryProperty: weaponMasteryExecutionPropertyForSupportProfile(
          procedure.facts,
        ),
      },
    })),
    Match.exhaustive,
  );
}

function rejectedReference(
  issue: WeaponMasteryReferenceIssue,
): Extract<WeaponDefinitionAdmission, { readonly tag: "rejected" }> {
  return rejected([
    Match.value(issue).pipe(
      Match.discriminatorsExhaustive("tag")({
        missing: (missing): WeaponDefinitionAdmissionIssue => ({
          reason: "incomplete_graph",
          mechanicsPath: missing.mechanicsPath,
          message: `The weapon mastery reference ${missing.masteryUnitId} is missing from the Unit catalog.`,
        }),
        ambiguous: (ambiguous): WeaponDefinitionAdmissionIssue => ({
          reason: "ambiguous_mechanics",
          mechanicsPath: ambiguous.mechanicsPath,
          message: `The weapon mastery reference ${ambiguous.masteryUnitId} matches ${ambiguous.matchCount} Unit roots.`,
        }),
        wrongKind: (wrongKind): WeaponDefinitionAdmissionIssue => ({
          reason: "unsupported_mechanics",
          mechanicsPath: wrongKind.mechanicsPath,
          message: `The weapon mastery reference ${wrongKind.masteryUnitId} resolves to Unit kind ${wrongKind.actualKind} instead of mastery.`,
        }),
      }),
    ),
  ]);
}

function rejected(
  issues: readonly [
    WeaponDefinitionAdmissionIssue,
    ...WeaponDefinitionAdmissionIssue[],
  ],
): Extract<WeaponDefinitionAdmission, { readonly tag: "rejected" }> {
  return { tag: "rejected", issues };
}
