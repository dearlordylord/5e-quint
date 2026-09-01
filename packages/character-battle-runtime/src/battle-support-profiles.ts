import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  battleUnitRefWithSupportProfiles,
  TACTICAL_MASTER_REPLACEMENT_SUPPORT_PROFILE,
  type CharacterBattleCreatureInit,
  type BattleUnitRef,
  type BattleUnitSupportProfileSourceFacts,
} from "@dnd/battle-runtime";
import {
  characterBuildUnitRefs,
  classUnitIdToClassName,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import { traverseValidation } from "@dnd/shared-algebras/validation-algebra";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type {
  DragonbornSpeciesRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import {
  resolveWeaponMasteryReference,
  type UnitCatalog,
} from "@dnd/surface/surface/unit-catalog-core";
import { Option, Result } from "effect";
import { omitRuntimeDetachedClassSpellChoices } from "./class-spell-choice-projection.ts";

// KERNEL-COVERAGE: runtime-owner CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.hunters-prey unit-feature.passive-damage-resistance unit-feature.fighter-tactical-master unit-feature.weapon-mastery-push unit-feature.weapon-mastery-slow

type CharacterBattleWeaponMasterySelection = NonNullable<
  CharacterBattleCreatureInit["weaponMasteries"]
>[number];

type AuthoredBattleUnitRef = Omit<BattleUnitRef, "unit"> & {
  readonly unit: UnitRecord;
};

const TACTICAL_MASTER_REPLACEMENT_SUPPORT_PROFILE_MASTERY_UNIT_IDS = [
  authoredUnitId("mastery_push"),
  authoredUnitId("mastery_sap"),
  authoredUnitId("mastery_slow"),
] as const satisfies ReadonlyArray<UnitRecord["id"]>;

export type CharacterBattleSupportProjection = {
  readonly unitRefs: readonly AuthoredBattleUnitRef[];
  readonly sourceFacts: BattleUnitSupportProfileSourceFacts | undefined;
};

export function characterBattleSupportProjection(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  weaponMasteries?: readonly CharacterBattleWeaponMasterySelection[],
  classLevels?: CharacterBattleCreatureInit["classLevels"],
): Result.Result<
  CharacterBattleSupportProjection,
  ReadonlyNonEmptyArray<BattleSupportProfileIssue>
> {
  const selectedWeaponMasteries =
    weaponMasteries === undefined
      ? characterBattleWeaponMasterySelections(build, unitLibrary)
      : Result.succeed(weaponMasteries);
  if (Result.isFailure(selectedWeaponMasteries)) {
    return Result.fail(selectedWeaponMasteries.failure);
  }
  const sourceFacts = battleSupportProfileSourceFactsForBuild(
    build,
    unitLibrary,
  );
  if (Result.isFailure(sourceFacts)) {
    return Result.fail([
      sourceFacts.failure,
    ] as ReadonlyNonEmptyArray<BattleSupportProfileIssue>);
  }
  const buildUnitRefs = traverseValidation(
    characterBattleSupportUnitRefs(build, unitLibrary),
    (unitRef) =>
      withBattleSupportProfiles(
        unitRef,
        unitLibrary,
        classLevels,
        sourceFacts.success,
      ),
  );
  if (Result.isFailure(buildUnitRefs)) {
    return Result.fail(buildUnitRefs.failure);
  }

  const replacementMasteryUnitIds = buildUnitRefs.success.some(
    battleUnitRefHasTacticalMasterReplacementSupport,
  )
    ? TACTICAL_MASTER_REPLACEMENT_SUPPORT_PROFILE_MASTERY_UNIT_IDS
    : [];
  const selectedMasteryUnitIds =
    battleSupportedMasteryUnitIdsForSelectedWeapons(
      selectedWeaponMasteries.success,
      unitLibrary,
    );
  if (Result.isFailure(selectedMasteryUnitIds)) {
    return Result.fail(selectedMasteryUnitIds.failure);
  }
  const battleMasteryUnitRefs = traverseValidation(
    [...selectedMasteryUnitIds.success, ...replacementMasteryUnitIds].map(
      (unitId) => ({ unitId }),
    ),
    (unitRef) =>
      withBattleSupportProfiles(
        unitRef,
        unitLibrary,
        classLevels,
        sourceFacts.success,
      ),
  );
  if (Result.isFailure(battleMasteryUnitRefs)) {
    return Result.fail(battleMasteryUnitRefs.failure);
  }

  return Result.succeed({
    unitRefs: uniqueBattleUnitRefs([
      ...buildUnitRefs.success,
      ...battleMasteryUnitRefs.success,
    ]),
    sourceFacts: sourceFacts.success,
  });
}

function characterBattleSupportUnitRefs(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): ReturnType<typeof characterBuildUnitRefs> {
  const spellcasting = build.spellcasting;
  if (spellcasting === undefined) {
    return characterBuildUnitRefs(build, unitLibrary);
  }
  const projectSource = (
    source: (typeof spellcasting.sources)[number],
  ): (typeof spellcasting.sources)[number] => {
    const className = classUnitIdToClassName({
      classUnitId: source.sourceUnitId,
      unitLibrary,
    });
    if (Result.isFailure(className)) {
      return source;
    }
    return {
      ...source,
      cantrips: omitRuntimeDetachedClassSpellChoices({
        unitLibrary,
        sourceClassName: className.success,
        spellIds: source.cantrips,
        choiceKind: "cantrip",
      }),
      spellbook: omitRuntimeDetachedClassSpellChoices({
        unitLibrary,
        sourceClassName: className.success,
        spellIds: source.spellbook,
        choiceKind: "leveledSpell",
      }),
      preparedSpells: omitRuntimeDetachedClassSpellChoices({
        unitLibrary,
        sourceClassName: className.success,
        spellIds: source.preparedSpells,
        choiceKind: "leveledSpell",
      }),
    };
  };
  return characterBuildUnitRefs(
    {
      ...build,
      spellcasting: {
        ...spellcasting,
        sources: [
          projectSource(spellcasting.sources[0]),
          ...spellcasting.sources.slice(1).map(projectSource),
        ],
      },
    },
    unitLibrary,
  );
}

export type BattleSupportProfileIssue = {
  readonly tag: "battleSupportProfileIssue";
  readonly message: string;
};

function battleSupportProfileIssue(
  message: string,
): Result.Result<never, BattleSupportProfileIssue> {
  return Result.fail({ tag: "battleSupportProfileIssue", message });
}

function withBattleSupportProfiles(
  unitRef: ReturnType<typeof characterBuildUnitRefs>[number],
  unitLibrary: UnitCatalog,
  classLevels: CharacterBattleCreatureInit["classLevels"] | undefined,
  sourceFacts: BattleUnitSupportProfileSourceFacts | undefined,
): Result.Result<AuthoredBattleUnitRef, BattleSupportProfileIssue> {
  const unitOption = unitLibrary.getUnit(unitRef.unitId);
  if (Option.isNone(unitOption)) {
    return battleSupportProfileIssue(
      `Unknown Character Build Unit for battle initialization: ${unitRef.unitId}.`,
    );
  }
  const battleUnitRef = battleUnitRefWithSupportProfiles({
    unitRef,
    unit: unitOption.value,
    ...(classLevels === undefined ? {} : { classLevels }),
    ...(sourceFacts === undefined ? {} : { sourceFacts }),
  });
  return Result.isFailure(battleUnitRef)
    ? battleSupportProfileIssue(battleUnitRef.failure.message)
    : Result.succeed({
        ...battleUnitRef.success,
        unit: unitOption.value,
      });
}

export function battleSupportProfileSourceFactsForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Result.Result<
  BattleUnitSupportProfileSourceFacts | undefined,
  BattleSupportProfileIssue
> {
  const draconicAncestry = build.speciesChoiceFacts?.draconicAncestry;
  if (draconicAncestry === undefined) return Result.succeed(undefined);

  const speciesUnit = unitLibrary.getUnit(build.species);
  if (Option.isNone(speciesUnit)) {
    return battleSupportProfileIssue(
      `Unknown Character Build species Unit for battle initialization: ${build.species}.`,
    );
  }
  const source = draconicAncestryDamageTypeSource(speciesUnit.value);
  if (source === undefined) {
    return battleSupportProfileIssue(
      `Character Build Draconic Ancestry fact requires a species with a Draconic Ancestry source: ${build.species}.`,
    );
  }
  const selected = source.options.find(
    (option) => option.id === draconicAncestry.ancestorId,
  );
  if (selected === undefined) {
    return battleSupportProfileIssue(
      `Character Build Draconic Ancestry fact must reference the selected species source table: ${build.species}.`,
    );
  }
  return Result.succeed({ draconicAncestryDamageType: selected.damageType });
}

function draconicAncestryDamageTypeSource(
  unit: UnitRecord,
): DragonbornSpeciesRecord["draconicAncestry"]["damageType"] | undefined {
  return unit.kind === "species" && "draconicAncestry" in unit
    ? unit.draconicAncestry.damageType
    : undefined;
}

export function characterBattleWeaponMasterySelections(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Result.Result<
  readonly CharacterBattleWeaponMasterySelection[],
  ReadonlyNonEmptyArray<BattleSupportProfileIssue>
> {
  const selections: CharacterBattleWeaponMasterySelection[] = [];
  const issues: BattleSupportProfileIssue[] = [];

  for (const feature of build.features) {
    if (feature.kind !== "selectedClassChoice") {
      continue;
    }
    const source = unitLibrary.getUnit(feature.selectedFromUnitId);
    if (Option.isNone(source)) {
      issues.push({
        tag: "battleSupportProfileIssue",
        message: `Unknown Character Build Unit for battle initialization: ${feature.selectedFromUnitId}.`,
      });
      continue;
    }
    if (
      source.value.kind !== "class_feature" ||
      source.value.mechanics.family !== "weapon_mastery_choice"
    ) {
      continue;
    }

    const selected = unitLibrary.getUnit(feature.unitId);
    if (Option.isNone(selected)) {
      issues.push({
        tag: "battleSupportProfileIssue",
        message: `Unknown selected Weapon Mastery Unit for battle initialization: ${feature.unitId}.`,
      });
      continue;
    }
    if (selected.value.kind !== "weapon") {
      issues.push({
        tag: "battleSupportProfileIssue",
        message: `Expected selected Weapon Mastery option to be a weapon Unit: ${feature.unitId}.`,
      });
      continue;
    }
    selections.push({ weaponUnitId: selected.value.id });
  }

  const firstIssue = issues[0];
  if (firstIssue !== undefined) {
    return Result.fail([
      firstIssue,
      ...issues.slice(1),
    ] as ReadonlyNonEmptyArray<BattleSupportProfileIssue>);
  }

  return Result.succeed(uniqueWeaponMasterySelections(selections));
}

function battleSupportedMasteryUnitIdsForSelectedWeapons(
  weaponMasteries: readonly CharacterBattleWeaponMasterySelection[],
  unitLibrary: UnitCatalog,
): Result.Result<
  readonly UnitRecord["id"][],
  ReadonlyNonEmptyArray<BattleSupportProfileIssue>
> {
  const unitIds = traverseValidation(weaponMasteries, (selection) => {
    const weapon = unitLibrary.getUnit(selection.weaponUnitId);
    if (Option.isNone(weapon)) {
      return battleSupportProfileIssue(
        `Unknown selected Weapon Mastery weapon Unit: ${selection.weaponUnitId}.`,
      );
    }
    if (weapon.value.kind !== "weapon") {
      return battleSupportProfileIssue(
        `Expected selected Weapon Mastery option to be a weapon Unit: ${selection.weaponUnitId}.`,
      );
    }
    const resolution = resolveWeaponMasteryReference(weapon.value, unitLibrary);
    if (Result.isFailure(resolution)) {
      const issue = resolution.failure;
      return battleSupportProfileIssue(
        issue.tag === "missing"
          ? `Selected weapon ${issue.root.id} references unknown mastery Unit ${issue.masteryUnitId} through ${issue.fieldPath}.`
          : `Selected weapon ${issue.root.id} references ${issue.masteryUnitId} through ${issue.fieldPath}, but that Unit has kind ${issue.actualKind} instead of mastery.`,
      );
    }
    return Result.succeed(resolution.success.mastery.id);
  });
  return Result.isFailure(unitIds)
    ? Result.fail(unitIds.failure)
    : Result.succeed(
        unitIds.success.filter(
          (unitId, index) => unitIds.success.indexOf(unitId) === index,
        ),
      );
}

function uniqueBattleUnitRefs(
  refs: readonly AuthoredBattleUnitRef[],
): readonly AuthoredBattleUnitRef[] {
  return refs.reduce<AuthoredBattleUnitRef[]>((uniqueRefs, ref) => {
    const existingIndex = uniqueRefs.findIndex(
      (candidate) => candidate.unit.id === ref.unit.id,
    );
    if (existingIndex === -1) {
      uniqueRefs.push(ref);
      return uniqueRefs;
    }

    const existing = uniqueRefs[existingIndex];
    uniqueRefs[existingIndex] = {
      unit: existing.unit,
      supportProfiles: uniqueBattleSupportProfiles([
        ...existing.supportProfiles,
        ...ref.supportProfiles,
      ]),
    };
    return uniqueRefs;
  }, []);
}

function uniqueWeaponMasterySelections(
  selections: readonly CharacterBattleWeaponMasterySelection[],
): readonly CharacterBattleWeaponMasterySelection[] {
  return selections.filter(
    (selection, index) =>
      selections.findIndex(
        (candidate) => candidate.weaponUnitId === selection.weaponUnitId,
      ) === index,
  );
}

function uniqueBattleSupportProfiles(
  profiles: readonly BattleUnitRef["supportProfiles"][number][],
): readonly BattleUnitRef["supportProfiles"][number][] {
  return profiles.filter(
    (profile, index) =>
      profiles.findIndex(
        (candidate) =>
          battleSupportProfileKey(candidate) ===
          battleSupportProfileKey(profile),
      ) === index,
  );
}

function battleSupportProfileKey(
  profile: BattleUnitRef["supportProfiles"][number],
): string {
  return typeof profile === "object" ? profile.kind : profile;
}

function battleUnitRefHasTacticalMasterReplacementSupport(
  unitRef: BattleUnitRef,
): boolean {
  return unitRef.supportProfiles.some(
    (profile) =>
      typeof profile === "object" &&
      profile.kind === TACTICAL_MASTER_REPLACEMENT_SUPPORT_PROFILE,
  );
}
