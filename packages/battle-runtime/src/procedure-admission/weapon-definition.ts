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

import type {
  WeaponExecutionFactsWithMasteryProperty,
  WeaponExecutionFactsWithoutMasteryProperty,
} from "../character-weapon-execution-schema.ts";
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

type WeaponMasteryUnit = Extract<UnitRecord, { readonly kind: "mastery" }>;

/**
 * Battle admits a weapon for ordinary use whatever its mastery. Its mastery
 * either has a Battle procedure, whose property the execution facts carry, or
 * it doesn't, and then only a selection of that mastery is refused.
 */
export type AdmittedWeaponDefinition =
  | {
      readonly tag: "admitted";
      readonly masterySupport: "supported";
      readonly facts: WeaponExecutionFactsWithMasteryProperty;
      readonly resolvedMastery: {
        readonly unit: WeaponMasteryUnit;
        readonly procedureFacts: BattleWeaponMasteryProcedureFacts;
      };
    }
  | {
      readonly tag: "admitted";
      readonly masterySupport: "unsupported";
      readonly facts: WeaponExecutionFactsWithoutMasteryProperty;
      readonly resolvedMastery: {
        readonly unit: WeaponMasteryUnit;
        readonly issues: readonly [
          WeaponDefinitionAdmissionIssue,
          ...WeaponDefinitionAdmissionIssue[],
        ];
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

  const mastery = resolution.success.mastery;
  const facts = weaponExecutionFactsWithoutMasteryProperty(input.weapon);
  return Match.value(admitWeaponMasteryProcedure(mastery)).pipe(
    Match.when(
      { tag: "rejected" },
      ({ issues }): AdmittedWeaponDefinition => ({
        tag: "admitted",
        masterySupport: "unsupported",
        facts,
        resolvedMastery: {
          unit: mastery,
          issues: [
            {
              reason: "unsupported_mechanics",
              mechanicsPath: WEAPON_MASTERY_REFERENCE_PATH,
              message: `The referenced Weapon Mastery procedure is unsupported by Battle: ${issues[0].message}`,
            },
          ],
        },
      }),
    ),
    Match.when(
      { tag: "admitted" },
      ({ procedure }): AdmittedWeaponDefinition => ({
        tag: "admitted",
        facts: {
          ...facts,
          masteryProperty: weaponMasteryExecutionPropertyForSupportProfile(
            procedure.facts,
          ),
        },
        masterySupport: "supported",
        resolvedMastery: {
          unit: mastery,
          procedureFacts: procedure.facts,
        },
      }),
    ),
    Match.exhaustive,
  );
}

function weaponExecutionFactsWithoutMasteryProperty(
  weapon: WeaponRecord,
): WeaponExecutionFactsWithoutMasteryProperty {
  return {
    ...(weapon.attachedWeaponAttackOverrideEligibility === undefined
      ? {}
      : {
          attachedWeaponAttackOverrideEligibility:
            weapon.attachedWeaponAttackOverrideEligibility,
        }),
    category: weapon.category,
    usage: weapon.usage,
    damage: weapon.damage,
    properties: weapon.properties ?? [],
    costGp: weapon.costGp,
  };
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
