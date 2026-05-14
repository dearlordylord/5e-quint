import {
  battleCreatureInitFromStatBlock,
  characterBattleResourceForUnit,
  characterBattleResourceSupportedForUnit,
  scoreModifier,
  startBattle,
  unitIsFavoredEnemyHuntersMarkFreeCastResource,
  type CharacterBattleFeatureInit,
  type CharacterBattleResourceInit,
  type CharacterBattleSpellSlotState,
  type CharacterBattleBookOfShadowsPresence,
  type CharacterBattleCreatureInit,
  type CharacterZeroHpLifecycleInit,
  type BattleId,
  type BattleCombatantSide,
  type BattleState,
  type BattleStateInitIssue,
  type CharacterId,
  type CombatantId,
  type BattleCreatureInit,
  type InitiativeScore,
  type StatBlockBattleInitInput,
} from "@dnd/battle-runtime";
import {
  characterBuildFeatureUnitIds,
  characterBuildHitPoints,
  characterBuildProficiencies,
  progressionClassLevels,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import type {
  CharacterSheetArmorClassBaseChoice,
  CharacterSheetResourceExpenditure,
} from "@dnd/character-sheet-runtime";
import {
  Hp,
  abilityModifier,
  movementFeet,
  type Condition,
} from "@dnd/shared/types";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either, Option } from "effect";
import {
  battleCreatureInitIssue,
  characterArmorClassState,
  characterAttackActionOption,
  characterBaseUnarmedStrikeActionOption,
  characterBattleLoadoutFromBuild,
  characterInvocationFeatures,
  characterOffHandAttackActionOption,
  characterPactBladeBondedWeaponItemId,
  characterSpellcasting,
  getRequiredUnit,
  type BattleCreatureInitIssue,
} from "./battle-character-build-projection.ts";
import {
  characterBattleWeaponMasterySelections,
  characterUnitRefsWithBattleSupportProfiles,
} from "./battle-support-profiles.ts";

// MCP owns cross-runtime wiring. Character creation finalizes a CharacterBuild;
// battle accepts battle-owned creature-init inputs. This mapper is where
// selected Unit refs are read into the creature combat view, so neither runtime
// has to import the other or grow an intermediate executable content model.

export type CharacterBuildCreatureInput = {
  readonly combatantId: CombatantId;
  readonly characterId: CharacterId;
  readonly displayName: string;
  readonly build: CharacterBuild;
  readonly initiative: InitiativeScore;
  readonly side: BattleCombatantSide;
  readonly currentHp?: Hp;
  readonly tempHp?: Hp;
  readonly conditions?: readonly Condition[];
  readonly positiveHpUnconscious?: CharacterBattleCreatureInit["positiveHpUnconscious"];
  readonly zeroHpLifecycle?: CharacterZeroHpLifecycleInit;
  readonly spellSlots?: readonly CharacterBattleSpellSlotState[];
  readonly bookOfShadowsPresence?: CharacterBattleBookOfShadowsPresence;
  readonly resourceExpenditures?: readonly CharacterSheetResourceExpenditure[];
  readonly armorClassBaseChoice?: CharacterSheetArmorClassBaseChoice;
  readonly pactBladeBondedWeaponItemId?:
    | NonNullable<CharacterBuild["equipment"]["loadout"]["weapon"]>["itemId"]
    | NonNullable<
        CharacterBuild["equipment"]["loadout"]["offHandWeapon"]
      >["itemId"];
};

export function startBattleFromCharacterBuildAndStatBlock(input: {
  readonly battleId: BattleId;
  readonly character: CharacterBuildCreatureInput;
  readonly statBlockBattleInput: StatBlockBattleInitInput;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<BattleState, BattleStateInitIssue | BattleCreatureInitIssue> {
  const characterInit = battleCreatureInitFromCharacterBuild({
    ...input.character,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(characterInit)) {
    return battleCreatureInitIssue(characterInit.left.message);
  }

  return startBattle({
    battleId: input.battleId,
    combatants: [
      characterInit.right,
      battleCreatureInitFromStatBlock(input.statBlockBattleInput),
    ],
  });
}

export function battleCreatureInitFromCharacterBuild(
  input: CharacterBuildCreatureInput & {
    readonly unitLibrary: UnitCatalog;
  },
): Either.Either<BattleCreatureInit, BattleCreatureInitIssue> {
  const hitPoints = characterBuildHitPoints(input.build, input.unitLibrary);
  if (Either.isLeft(hitPoints)) {
    return battleCreatureInitIssue(
      hitPoints.left.map((issue) => issue.message).join("; "),
    );
  }
  const maxHp = Hp(hitPoints.right.maximum);
  const weaponMasteries = characterBattleWeaponMasterySelections(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(weaponMasteries)) {
    return battleCreatureInitIssue(
      weaponMasteries.left.map((issue) => issue.message).join("; "),
    );
  }
  const characterUnitRefs = characterUnitRefsWithBattleSupportProfiles(
    input.build,
    input.unitLibrary,
    weaponMasteries.right,
  );
  if (Either.isLeft(characterUnitRefs)) {
    return battleCreatureInitIssue(
      characterUnitRefs.left.map((issue) => issue.message).join("; "),
    );
  }
  const currentHp = input.currentHp ?? maxHp;
  if (currentHp > maxHp) {
    return battleCreatureInitIssue(
      "Character battle initialization current HP exceeds max HP.",
    );
  }

  const species = getRequiredUnit(input.unitLibrary, input.build.species);
  if (Either.isLeft(species)) {
    return battleCreatureInitIssue(species.left.message);
  }
  if (species.right.kind !== "species") {
    return battleCreatureInitIssue(
      `Expected species Unit: ${input.build.species}`,
    );
  }

  const armorClass = characterArmorClassState({
    build: input.build,
    unitLibrary: input.unitLibrary,
    ...(input.armorClassBaseChoice === undefined
      ? {}
      : { baseChoice: input.armorClassBaseChoice }),
  });
  if (Either.isLeft(armorClass)) {
    return battleCreatureInitIssue(armorClass.left.message);
  }
  const classLevels = characterBattleClassLevels(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(classLevels)) {
    return battleCreatureInitIssue(classLevels.left.message);
  }
  const pactBladeBondedWeaponItemId = characterPactBladeBondedWeaponItemId({
    build: input.build,
    unitLibrary: input.unitLibrary,
    itemId: input.pactBladeBondedWeaponItemId,
  });
  if (Either.isLeft(pactBladeBondedWeaponItemId)) {
    return battleCreatureInitIssue(pactBladeBondedWeaponItemId.left.message);
  }
  const attack = characterAttackActionOption(
    input.build,
    input.unitLibrary,
    classLevels.right,
    pactBladeBondedWeaponItemId.right,
  );
  if (Either.isLeft(attack))
    return battleCreatureInitIssue(attack.left.message);
  const offHandAttack = characterOffHandAttackActionOption(
    input.build,
    input.unitLibrary,
    classLevels.right,
    pactBladeBondedWeaponItemId.right,
  );
  if (Either.isLeft(offHandAttack)) {
    return battleCreatureInitIssue(offHandAttack.left.message);
  }
  const selectedLoadout = characterBattleLoadoutFromBuild(input.build);
  const unitFeatures = characterBattleFeatures(input.build, input.unitLibrary);
  if (Either.isLeft(unitFeatures)) {
    return battleCreatureInitIssue(unitFeatures.left.message);
  }
  const resources = characterBattleResourceInitsFromBuild(
    input.build,
    input.unitLibrary,
    input.resourceExpenditures ?? [],
  );
  if (Either.isLeft(resources)) {
    return battleCreatureInitIssue(resources.left.message);
  }
  const proficiencies = characterBuildProficiencies(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(proficiencies)) {
    return battleCreatureInitIssue(
      proficiencies.left.map((issue) => issue.message).join("; "),
    );
  }
  const spellcasting =
    input.build.spellcasting === undefined
      ? undefined
      : characterSpellcasting({
          build: input.build,
          unitLibrary: input.unitLibrary,
          ...(input.bookOfShadowsPresence === undefined
            ? {}
            : { bookOfShadowsPresence: input.bookOfShadowsPresence }),
          ...(input.spellSlots === undefined
            ? {}
            : { spellSlots: input.spellSlots }),
        });
  if (spellcasting !== undefined && Either.isLeft(spellcasting)) {
    return battleCreatureInitIssue(spellcasting.left.message);
  }
  const unarmedStrike = characterBaseUnarmedStrikeActionOption(
    input.build,
    input.unitLibrary,
    classLevels.right,
  );
  if (Either.isLeft(unarmedStrike)) {
    return battleCreatureInitIssue(unarmedStrike.left.message);
  }

  return Either.right({
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: input.initiative,
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: input.characterId,
      characterUnitRefs: characterUnitRefs.right,
      classLevels: classLevels.right,
      weaponProficiencies: [
        ...proficiencies.right.weapon.map((category) => ({
          kind: "weapon_category" as const,
          category,
        })),
        ...proficiencies.right.weaponPropertyFilters,
      ],
      armorClass: armorClass.right,
      size: species.right.size.size,
      speed: { walkFeet: movementFeet(species.right.speed.walkFeet) },
      currentHp,
      maxHp,
      tempHp: input.tempHp ?? Hp(0),
      ...(input.conditions === undefined
        ? {}
        : { conditions: input.conditions }),
      ...(input.positiveHpUnconscious === undefined
        ? {}
        : { positiveHpUnconscious: input.positiveHpUnconscious }),
      ...(input.zeroHpLifecycle === undefined
        ? {}
        : { zeroHpLifecycle: input.zeroHpLifecycle }),
      selectedLoadout,
      ...(weaponMasteries.right.length === 0
        ? {}
        : { weaponMasteries: weaponMasteries.right }),
      invocationFeatures: characterInvocationFeatures(input.build),
      attack: attack.right,
      unarmedStrike: unarmedStrike.right,
      ...(offHandAttack.right === undefined
        ? {}
        : { offHandAttack: offHandAttack.right }),
      unitFeatures: unitFeatures.right,
      resources: resources.right,
      ...(spellcasting === undefined
        ? {}
        : { spellcasting: spellcasting.right }),
    },
  });
}

function characterBattleClassLevels(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"],
  BattleCreatureInitIssue
> {
  type CharacterBattleClassLevels = Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  const classLevels: CharacterBattleClassLevels[number][] = [];

  for (const entry of progressionClassLevels(build.progression)) {
    const classUnit = getRequiredUnit(unitLibrary, entry.classUnitId);
    if (Either.isLeft(classUnit)) {
      return battleCreatureInitIssue(classUnit.left.message);
    }
    if (classUnit.right.kind !== "class") {
      return battleCreatureInitIssue(
        `Expected class Unit: ${entry.classUnitId}`,
      );
    }
    classLevels.push({
      className: classUnit.right.className,
      level: entry.classLevel,
    });
  }

  return Either.right(classLevels satisfies CharacterBattleClassLevels);
}

export function characterBattleResourceInitsFromBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  resourceExpenditures: readonly CharacterSheetResourceExpenditure[],
): Either.Either<
  readonly CharacterBattleResourceInit[],
  BattleCreatureInitIssue
> {
  const resources: CharacterBattleResourceInit[] = [];
  for (const featureUnitId of characterBuildFeatureUnitIds(
    build,
    unitLibrary,
  )) {
    const unit = unitLibrary.getUnit(featureUnitId);
    if (Option.isNone(unit)) {
      continue;
    }
    if (
      unit.value.kind !== "class_feature" &&
      unit.value.kind !== "species_trait"
    ) {
      continue;
    }
    if (!characterBattleResourceSupportedForUnit(unit.value)) {
      continue;
    }

    const init = characterBattleResourceInit(
      build,
      unit.value,
      resourceExpenditures,
    );
    if (Either.isLeft(init)) return Either.left(init.left);
    resources.push(init.right);
  }
  return Either.right(resources);
}

function characterBattleResourceInit(
  build: CharacterBuild,
  unit: Extract<
    UnitRecord,
    { readonly kind: "class_feature" | "species_trait" }
  >,
  resourceExpenditures: readonly CharacterSheetResourceExpenditure[],
): Either.Either<CharacterBattleResourceInit, BattleCreatureInitIssue> {
  const persistedUsesRemaining = characterBattlePersistedUsesRemaining(
    unit,
    resourceExpenditures,
  );
  if (Either.isLeft(persistedUsesRemaining)) {
    return Either.left(persistedUsesRemaining.left);
  }
  const resource =
    "resource" in unit.mechanics ? unit.mechanics.resource : undefined;
  const init =
    resource?.kind === "use_count" && resource.cap.kind === "ability_modifier"
      ? {
          unit,
          capAbilityModifier: abilityModifier(
            scoreModifier(build.abilityScores[resource.cap.ability]),
          ),
        }
      : { unit };
  return Either.right({
    ...init,
    ...(persistedUsesRemaining.right === undefined
      ? {}
      : { usesRemaining: persistedUsesRemaining.right }),
  });
}

function characterBattlePersistedUsesRemaining(
  unit: UnitRecord,
  resourceExpenditures: readonly CharacterSheetResourceExpenditure[],
): Either.Either<number | undefined, BattleCreatureInitIssue> {
  if (!unitIsFavoredEnemyHuntersMarkFreeCastResource(unit)) {
    return Either.right(undefined);
  }
  const resource = characterBattleResourceForUnit(unit);
  if (resource.cap.kind !== "fixed") {
    return battleCreatureInitIssue(
      "Favored Enemy Hunter's Mark free casts must use a fixed battle resource cap.",
    );
  }
  const expended =
    resourceExpenditures.find(
      (expenditure) => expenditure.tag === "favoredEnemyHuntersMarkFreeCasts",
    )?.expended ?? 0;
  if (expended > resource.cap.uses) {
    return battleCreatureInitIssue(
      "Favored Enemy Hunter's Mark free-cast expenditure exceeds its battle resource cap.",
    );
  }
  return Either.right(resource.cap.uses - expended);
}

function characterBattleFeatures(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  readonly CharacterBattleFeatureInit[],
  BattleCreatureInitIssue
> {
  const features: CharacterBattleFeatureInit[] = [];
  for (const featureUnitId of characterBuildFeatureUnitIds(
    build,
    unitLibrary,
  )) {
    const unit = getRequiredUnit(unitLibrary, featureUnitId);
    if (Either.isLeft(unit)) {
      return battleCreatureInitIssue(unit.left.message);
    }
    if (
      unit.right.kind !== "class_feature" &&
      unit.right.kind !== "species_trait"
    ) {
      continue;
    }
    features.push({ unit: unit.right });
  }
  return Either.right(features);
}
