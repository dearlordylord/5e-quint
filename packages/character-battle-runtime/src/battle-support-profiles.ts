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
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { resolveWeaponMasteryReference } from "@dnd/surface/surface/unit-catalog";
import { Either, Option } from "effect";
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
): Either.Either<
  CharacterBattleSupportProjection,
  ReadonlyNonEmptyArray<BattleSupportProfileIssue>
> {
  const selectedWeaponMasteries =
    weaponMasteries === undefined
      ? characterBattleWeaponMasterySelections(build, unitLibrary)
      : Either.right(weaponMasteries);
  if (Either.isLeft(selectedWeaponMasteries)) {
    return Either.left(selectedWeaponMasteries.left);
  }
  const sourceFacts = battleSupportProfileSourceFactsForBuild(
    build,
    unitLibrary,
  );
  if (Either.isLeft(sourceFacts)) {
    return Either.left([
      sourceFacts.left,
    ] as ReadonlyNonEmptyArray<BattleSupportProfileIssue>);
  }
  const buildUnitRefs = traverseValidation(
    characterBattleSupportUnitRefs(build, unitLibrary),
    (unitRef) =>
      withBattleSupportProfiles(
        unitRef,
        unitLibrary,
        classLevels,
        sourceFacts.right,
      ),
  );
  if (Either.isLeft(buildUnitRefs)) {
    return Either.left(buildUnitRefs.left);
  }

  const replacementMasteryUnitIds = buildUnitRefs.right.some(
    battleUnitRefHasTacticalMasterReplacementSupport,
  )
    ? TACTICAL_MASTER_REPLACEMENT_SUPPORT_PROFILE_MASTERY_UNIT_IDS
    : [];
  const battleMasteryUnitRefs = traverseValidation(
    [
      ...battleSupportedMasteryUnitIdsForSelectedWeapons(
        selectedWeaponMasteries.right,
        unitLibrary,
      ),
      ...replacementMasteryUnitIds,
    ].map((unitId) => ({ unitId })),
    (unitRef) =>
      withBattleSupportProfiles(
        unitRef,
        unitLibrary,
        classLevels,
        sourceFacts.right,
      ),
  );
  if (Either.isLeft(battleMasteryUnitRefs)) {
    return Either.left(battleMasteryUnitRefs.left);
  }

  return Either.right({
    unitRefs: uniqueBattleUnitRefs([
      ...buildUnitRefs.right,
      ...battleMasteryUnitRefs.right,
    ]),
    sourceFacts: sourceFacts.right,
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
    if (Either.isLeft(className)) {
      return source;
    }
    return {
      ...source,
      cantrips: omitRuntimeDetachedClassSpellChoices({
        unitLibrary,
        sourceClassName: className.right,
        spellIds: source.cantrips,
        choiceKind: "cantrip",
      }),
      spellbook: omitRuntimeDetachedClassSpellChoices({
        unitLibrary,
        sourceClassName: className.right,
        spellIds: source.spellbook,
        choiceKind: "leveledSpell",
      }),
      preparedSpells: omitRuntimeDetachedClassSpellChoices({
        unitLibrary,
        sourceClassName: className.right,
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
): Either.Either<never, BattleSupportProfileIssue> {
  return Either.left({ tag: "battleSupportProfileIssue", message });
}

function withBattleSupportProfiles(
  unitRef: ReturnType<typeof characterBuildUnitRefs>[number],
  unitLibrary: UnitCatalog,
  classLevels: CharacterBattleCreatureInit["classLevels"] | undefined,
  sourceFacts: BattleUnitSupportProfileSourceFacts | undefined,
): Either.Either<AuthoredBattleUnitRef, BattleSupportProfileIssue> {
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
  return Either.isLeft(battleUnitRef)
    ? battleSupportProfileIssue(battleUnitRef.left.message)
    : Either.right({
        ...battleUnitRef.right,
        unit: unitOption.value,
      });
}

export function battleSupportProfileSourceFactsForBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  BattleUnitSupportProfileSourceFacts | undefined,
  BattleSupportProfileIssue
> {
  const draconicAncestry = build.speciesChoiceFacts?.draconicAncestry;
  if (draconicAncestry === undefined) return Either.right(undefined);

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
  return Either.right({ draconicAncestryDamageType: selected.damageType });
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
): Either.Either<
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
    return Either.left([
      firstIssue,
      ...issues.slice(1),
    ] as ReadonlyNonEmptyArray<BattleSupportProfileIssue>);
  }

  return Either.right(uniqueWeaponMasterySelections(selections));
}

function battleSupportedMasteryUnitIdsForSelectedWeapons(
  weaponMasteries: readonly CharacterBattleWeaponMasterySelection[],
  unitLibrary: UnitCatalog,
): readonly UnitRecord["id"][] {
  const unitIds = weaponMasteries.flatMap((mastery) => {
    const weapon = unitLibrary.getUnit(mastery.weaponUnitId);
    if (Option.isNone(weapon) || weapon.value.kind !== "weapon") {
      return [];
    }
    const mastery = resolveWeaponMasteryReference(weapon.value, unitLibrary);
    return mastery.tag === "resolved" ? [mastery.mastery.id] : [];
  });
  return unitIds.filter((unitId, index) => unitIds.indexOf(unitId) === index);
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
