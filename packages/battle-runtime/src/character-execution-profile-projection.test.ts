import { describe, expect, test } from "vitest";
import { Result } from "effect";
import { CLASS_NAMES, unitId } from "@dnd/shared/game-facts";
import { NonNegativeInteger, classLevel } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";

import {
  boundUnitFeatureProcedureFactsFromProfile,
  characterExecutionFromUnits,
  unitFeatureProcedureExecution,
  unitSupportProcedureExecution,
} from "./character-execution-admission.ts";
import {
  parseCharacterBattleClassLevels,
  type CharacterBattleClassLevel,
  type CharacterBattleClassLevels,
} from "./character-class-level.ts";
import {
  battleUnitSupportProfilesForUnit,
  parseSupportedUnitFeatureProfile,
  type BattleUnitSupportProfile,
  type SupportedUnitFeatureProfile,
} from "./unit-feature-support.ts";
import {
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battleProcedureExecutionRef,
  battleResourcePoolExecutionRef,
  combatantId,
} from "./identity.ts";

const catalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (catalogResult.tag !== "ok") {
  throw new Error("Character execution projection test catalog must build.");
}

const units = catalogResult.catalog.listUnits();
const classLevels = CLASS_NAMES.map((className) => ({
  className,
  level: classLevel(20),
}));
const FIGHTER_TACTICAL_MIND_CLASS_LEVELS = parsedClassLevels("fighter", 2);
const ROGUE_SUPREME_SNEAK_CLASS_LEVELS = parsedClassLevels("rogue", 9);
const scopeRef = battleCharacterExecutionScopeRef(
  battleId("character-execution-profile-projection"),
  combatantId("profile-projection-character"),
  battleExecutionScopeOrdinal(0),
);
const resourcePoolRef = battleResourcePoolExecutionRef(
  scopeRef,
  NonNegativeInteger(0),
);
const procedureRef = battleProcedureExecutionRef(
  scopeRef,
  NonNegativeInteger(0),
);
const resourcePoolRefsByUnitId = new Map(
  units.map((unit) => [unit.id, resourcePoolRef] as const),
);

function parsedClassLevels(
  className: CharacterBattleClassLevel["className"],
  level: number,
): CharacterBattleClassLevels {
  const result = parseCharacterBattleClassLevels([{ className, level }]);
  if (Result.isFailure(result)) {
    throw new Error(result.failure.messages.join("; "));
  }
  return result.success;
}
const procedureRefsByUnitId = new Map(
  units.map((unit) => [unit.id, procedureRef] as const),
);
const sourceFacts = { draconicAncestryDamageType: "acid" } as const;
type SupportedUnitFeatureProfileKind = SupportedUnitFeatureProfile["kind"];
type BattleUnitSupportProfileKind = BattleUnitSupportProfile extends infer P
  ? P extends string
    ? P
    : P extends { readonly kind: infer K extends string }
      ? K
      : never
  : never;
type UnitFeatureProjectionFailure = {
  readonly unitId: (typeof units)[number]["id"];
  readonly kind: SupportedUnitFeatureProfileKind;
};
type UnitSupportProjectionFailure = {
  readonly unitId: (typeof units)[number]["id"];
  readonly kind: BattleUnitSupportProfileKind;
};
const SHARED_EMPTY_CONTEXT_PROJECTION_FAILURES = [
  {
    unitId: unitId("fighter_tactical_mind"),
    kind: "failedAbilityCheckResourceBoost",
  },
  { unitId: unitId("cleric_preserve_life"), kind: "magicActionHealingPool" },
  {
    unitId: unitId("druid_lands_aid"),
    kind: "magicActionAreaSaveDamageHealing",
  },
  { unitId: unitId("monk_stunning_strike"), kind: "stunningStrike" },
  { unitId: unitId("monk_open_hand_technique"), kind: "openHandTechnique" },
  { unitId: unitId("rogue_cunning_strike"), kind: "cunningStrike" },
  { unitId: unitId("rogue_supreme_sneak"), kind: "cunningStrikeOptionGrant" },
  { unitId: unitId("paladin_sacred_weapon"), kind: "paladinSacredWeapon" },
  {
    unitId: unitId("paladin_abjure_foes"),
    kind: "magicActionSaveGatedCondition",
  },
] as const satisfies ReadonlyArray<
  UnitFeatureProjectionFailure & UnitSupportProjectionFailure
>;
const UNIT_FEATURE_EMPTY_CONTEXT_ADDITIONAL_FAILURES = [
  { unitId: unitId("fighter_indomitable"), kind: "failedSavingThrowReroll" },
  { unitId: unitId("bard_bardic_inspiration"), kind: "bardicInspirationGrant" },
  {
    unitId: unitId("bard_cutting_words"),
    kind: "reactionRollOrDamageReduction",
  },
  {
    unitId: unitId("monk_deflect_attacks"),
    kind: "reactionRollOrDamageReduction",
  },
] as const satisfies ReadonlyArray<UnitFeatureProjectionFailure>;

describe("character execution profile projection", () => {
  test("separates source identity from projected procedure facts", () => {
    const unit = requireUnit(unitId("fighter_tactical_mind"));
    const profile = parseSupportedUnitFeatureProfile(
      unit,
      FIGHTER_TACTICAL_MIND_CLASS_LEVELS,
      sourceFacts,
    );
    if (profile === null) throw new Error("Expected Tactical Mind profile.");

    const bound = boundUnitFeatureProcedureFactsFromProfile(profile);

    expect(bound.sourceUnitId).toBe(unit.id);
    expect(bound.facts).not.toHaveProperty("unit");
  });

  test("projects every admitted SRD Unit feature into execution facts", () => {
    const projectedKinds = new Set<string>();
    const supportOwnedKinds = new Set<string>();

    for (const unit of units) {
      const profile = parseSupportedUnitFeatureProfile(
        unit,
        classLevels,
        sourceFacts,
      );
      if (profile === null) continue;

      const execution = unitFeatureProcedureExecution(profile, {
        resourcePoolRefsByUnitId,
      });
      if (execution === undefined) {
        supportOwnedKinds.add(profile.kind);
        continue;
      }
      expect(execution, `${unit.id}:${profile.kind}`).toBeDefined();
      expect(execution.kind).toBe(profile.kind);
      projectedKinds.add(execution.kind);
    }

    expect(projectedKinds.size).toBeGreaterThan(20);
    expect(supportOwnedKinds).toEqual(
      new Set([
        "cunningStrike",
        "cunningStrikeOptionGrant",
        "failedSavingThrowReroll",
      ]),
    );
  });

  test("projects every admitted SRD Unit support profile into execution facts", () => {
    const projectedKinds = new Set<string>();

    for (const unit of units) {
      const profiles = battleUnitSupportProfilesForUnit({
        unit,
        classLevels,
        sourceFacts,
      });
      if (Result.isFailure(profiles)) continue;

      for (const profile of profiles.success) {
        const execution = unitSupportProcedureExecution(profile, {
          resourcePoolRefsByUnitId,
          unitFeatureProcedureRefsByUnitId: procedureRefsByUnitId,
          supportProcedureRefsByUnitId: procedureRefsByUnitId,
        });
        const profileKind =
          typeof profile === "string" ? profile : profile.kind;
        if (profileKind === "failedSavingThrowReroll") {
          expect(execution).toBeUndefined();
          continue;
        }
        expect(execution, `${unit.id}:${profileKind}`).toBeDefined();
        if (execution !== undefined) {
          const executionKind =
            typeof execution === "string" ? execution : execution.kind;
          expect(executionKind).toBe(profileKind);
          projectedKinds.add(executionKind);
        }
      }
    }

    expect(projectedKinds.size).toBeGreaterThan(20);
  });

  test("fails closed when Unit feature execution resources are absent", () => {
    const unavailableProfiles: UnitFeatureProjectionFailure[] = [];

    for (const unit of units) {
      const profile = parseSupportedUnitFeatureProfile(
        unit,
        classLevels,
        sourceFacts,
      );
      if (profile === null) continue;

      const execution = unitFeatureProcedureExecution(profile, {
        resourcePoolRefsByUnitId: new Map(),
      });
      if (execution === undefined) {
        unavailableProfiles.push({ unitId: unit.id, kind: profile.kind });
      } else {
        expect(execution.kind).toBe(profile.kind);
      }
    }

    expect(unavailableProfiles.sort(compareProjectionFailures)).toEqual(
      [
        ...SHARED_EMPTY_CONTEXT_PROJECTION_FAILURES,
        ...UNIT_FEATURE_EMPTY_CONTEXT_ADDITIONAL_FAILURES,
      ].sort(compareProjectionFailures),
    );
  });

  test("fails closed when Unit support execution dependencies are absent", () => {
    const unavailableProfiles: UnitSupportProjectionFailure[] = [];

    for (const unit of units) {
      const profiles = battleUnitSupportProfilesForUnit({
        unit,
        classLevels,
        sourceFacts,
      });
      if (Result.isFailure(profiles)) continue;

      for (const profile of profiles.success) {
        const execution = unitSupportProcedureExecution(profile, {
          resourcePoolRefsByUnitId: new Map(),
          unitFeatureProcedureRefsByUnitId: new Map(),
          supportProcedureRefsByUnitId: new Map(),
        });
        const profileKind =
          typeof profile === "string" ? profile : profile.kind;
        if (execution === undefined) {
          unavailableProfiles.push({
            unitId: unit.id,
            kind: profileKind,
          });
        }
      }
    }

    expect(unavailableProfiles.sort(compareProjectionFailures)).toEqual(
      [...SHARED_EMPTY_CONTEXT_PROJECTION_FAILURES].sort(
        compareProjectionFailures,
      ),
    );
  });

  test("rejects character admission when a Unit feature resource is absent", () => {
    const unit = requireUnit(unitId("fighter_tactical_mind"));
    const profile = parseSupportedUnitFeatureProfile(
      unit,
      FIGHTER_TACTICAL_MIND_CLASS_LEVELS,
      sourceFacts,
    );
    if (profile === null) {
      throw new Error("Expected Tactical Mind feature profile.");
    }

    const admission = characterExecutionFromUnits({
      battleId: battleId("missing-feature-resource"),
      combatantId: combatantId("missing-feature-resource-character"),
      scopeOrdinal: battleExecutionScopeOrdinal(0),
      resourceFeatureProcedures: [],
      unitFeatureProcedures: [
        boundUnitFeatureProcedureFactsFromProfile(profile),
      ],
      resourceUnits: [],
      units: [unit],
      unitRefs: [],
      classLevels: FIGHTER_TACTICAL_MIND_CLASS_LEVELS,
    });

    expect(admission).toEqual(
      Result.fail([
        {
          tag: "battleUnitSupportProfileIssue",
          message:
            "Unit feature profile failedAbilityCheckResourceBoost references an unavailable mechanical execution resource.",
        },
      ]),
    );
  });

  test("binds a failed-save reroll to its same-source pool and canonical class level", () => {
    const unit = requireUnit(unitId("fighter_indomitable"));
    const fighterLevels = parsedClassLevels("fighter", 9);
    const profile = parseSupportedUnitFeatureProfile(unit, fighterLevels);
    if (profile?.kind !== "failedSavingThrowReroll") {
      throw new Error("Expected failed Saving Throw reroll profile.");
    }
    const admission = characterExecutionFromUnits({
      battleId: battleId("bound-failed-save-reroll"),
      combatantId: combatantId("bound-failed-save-reroll-character"),
      scopeOrdinal: battleExecutionScopeOrdinal(0),
      resourceFeatureProcedures: [],
      unitFeatureProcedures: [
        boundUnitFeatureProcedureFactsFromProfile(profile),
      ],
      resourceUnits: [unit],
      units: [unit],
      unitRefs: [],
      classLevels: fighterLevels,
    });
    if (Result.isFailure(admission)) {
      throw new Error(
        admission.failure.map(({ message }) => message).join("; "),
      );
    }

    expect(admission.success.execution.procedureBindings).toEqual([
      expect.objectContaining({
        procedure: {
          kind: "unitFeature",
          source: expect.objectContaining({ kind: "resourcePool" }),
          execution: {
            kind: "failedSavingThrowReroll",
            savingThrow: {
              trigger: "failedSavingThrow",
              reroll: {
                use: "newRoll",
                bonus: {
                  kind: "classLevel",
                  className: "fighter",
                  level: classLevel(9),
                },
              },
              spends: expect.objectContaining({ amount: 1 }),
            },
          },
        },
      }),
    ]);
  });

  test("rejects character admission when a primary support dependency is absent", () => {
    const unit = requireUnit(unitId("fighter_tactical_mind"));
    const profile = requireSupportProfile(
      unit,
      "failedAbilityCheckResourceBoost",
      FIGHTER_TACTICAL_MIND_CLASS_LEVELS,
    );

    const admission = characterExecutionFromUnits({
      battleId: battleId("missing-primary-support-resource"),
      combatantId: combatantId("missing-primary-support-resource-character"),
      scopeOrdinal: battleExecutionScopeOrdinal(0),
      resourceFeatureProcedures: [],
      unitFeatureProcedures: [],
      resourceUnits: [],
      units: [unit],
      unitRefs: [{ unit, supportProfiles: [profile] }],
      classLevels: FIGHTER_TACTICAL_MIND_CLASS_LEVELS,
    });

    expect(admission).toEqual(
      Result.fail([
        {
          tag: "battleUnitSupportProfileIssue",
          message:
            "Unit support profile failedAbilityCheckResourceBoost references an unavailable mechanical execution resource or procedure.",
        },
      ]),
    );
  });

  test("rejects character admission when an option grant has no primary procedure", () => {
    const unit = requireUnit(unitId("rogue_supreme_sneak"));
    const profile = requireSupportProfile(
      unit,
      "cunningStrikeOptionGrant",
      ROGUE_SUPREME_SNEAK_CLASS_LEVELS,
    );

    const admission = characterExecutionFromUnits({
      battleId: battleId("missing-option-grant-procedure"),
      combatantId: combatantId("missing-option-grant-procedure-character"),
      scopeOrdinal: battleExecutionScopeOrdinal(0),
      resourceFeatureProcedures: [],
      unitFeatureProcedures: [],
      resourceUnits: [],
      units: [unit],
      unitRefs: [{ unit, supportProfiles: [profile] }],
      classLevels: ROGUE_SUPREME_SNEAK_CLASS_LEVELS,
    });

    expect(admission).toEqual(
      Result.fail([
        {
          tag: "battleUnitSupportProfileIssue",
          message:
            "Unit support profile cunningStrikeOptionGrant references an unavailable mechanical procedure.",
        },
      ]),
    );
  });
});

function requireUnit(
  requiredUnitId: (typeof units)[number]["id"],
): (typeof units)[number] {
  const unit = units.find((candidate) => candidate.id === requiredUnitId);
  if (unit === undefined) {
    throw new Error(`Expected SRD Unit ${requiredUnitId}.`);
  }
  return unit;
}

function requireSupportProfile(
  unit: (typeof units)[number],
  kind: BattleUnitSupportProfileKind,
  focusedClassLevels: ReadonlyArray<CharacterBattleClassLevel>,
): BattleUnitSupportProfile {
  const profiles = battleUnitSupportProfilesForUnit({
    unit,
    classLevels: focusedClassLevels,
    sourceFacts,
  });
  if (Result.isFailure(profiles)) {
    throw new Error(`Expected admitted support profiles for ${unit.id}.`);
  }
  const profile = profiles.success.find(
    (candidate) =>
      (typeof candidate === "string" ? candidate : candidate.kind) === kind,
  );
  if (profile === undefined) {
    throw new Error(`Expected ${kind} support profile for ${unit.id}.`);
  }
  return profile;
}

function compareProjectionFailures(
  left: UnitFeatureProjectionFailure | UnitSupportProjectionFailure,
  right: UnitFeatureProjectionFailure | UnitSupportProjectionFailure,
): number {
  return (
    left.unitId.localeCompare(right.unitId) ||
    left.kind.localeCompare(right.kind)
  );
}
