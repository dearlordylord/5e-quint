import {
  battleCreatureInitFromStatBlock,
  battleAvailableDruidWildShapeKnownForms,
  characterBattleResourceForUnit,
  characterBattleResourceMaxPoints,
  characterBattleResourceMaxUses,
  characterBattleResourceSupportedForUnit,
  parseCharacterBattleClassLevels,
  parseSupportedUnitFeatureProfile,
  INITIATIVE_PROFICIENCY_AND_SWAP_SUPPORT_PROFILE,
  scoreModifier,
  startBattle,
  initiativeScore,
  type CharacterBattleFeatureInit,
  type CharacterBattleMetamagicInit,
  type CharacterBattleResourceInit,
  type CharacterBattleSpellSlotState,
  type CharacterBattleBookOfShadowsPresence,
  type CharacterBattleClassLevels,
  type CharacterBattleCreatureInit,
  type CharacterZeroHpLifecycleInit,
  type BattleId,
  type BattleRuntimeSession,
  type BattleStateInitIssue,
  type CharacterId,
  type CombatantId,
  type BattleCreatureInit,
  type BattleDruidWildShapeKnownForm,
  type InitiativeScore,
  type StatBlockBattleInitInput,
} from "@dnd/battle-runtime";
import {
  characterBuildDruidWildShapeFacts,
  characterBuildFeatureUnitIds,
  characterBuildHitPoints,
  characterBuildProficiencies,
  characterCreationIssueMessage,
  characterBuildSorcererFontOfMagicFacts,
  characterBuildSorcererMetamagicFacts,
  characterBuildUnitRefs,
  computeTotalLevel,
  progressionClassLevels,
  type CharacterBuild,
  type CharacterBuildDruidWildShapeFacts,
} from "@dnd/character-creation-runtime";
import {
  characterSheetSpellAccessesForBuild,
  type CharacterSheetArmorClassBaseChoice,
  type CharacterSheetResourceExpenditure,
} from "@dnd/character-sheet-runtime";
import {
  Hp,
  abilityModifier,
  characterLevel,
  movementFeet,
  proficiencyBonusForCharacterLevel,
  resourceCount,
  type Condition,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type { Language } from "@dnd/shared/game-facts";
import type {
  SpeciesRecord,
  StatBlockRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { supportedClassFeatureSpellFreeCastGrantsForUnit } from "@dnd/surface/surface/types";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Either, Option } from "effect";
import {
  battleCreatureInitIssue,
  characterArmorClassState,
  characterUnarmoredArmorClassBases,
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
  characterBattleSupportProjection,
  characterBattleWeaponMasterySelections,
  type CharacterBattleSupportProjection,
} from "./battle-support-profiles.ts";

// KERNEL-COVERAGE: runtime-owner CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.initiative-proficiency-and-swap unit-feature.monk-focus-battle-options character-sheet.metamagic-battle-resource-bridge unit-feature.attack-action-area-save-damage-replacement

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
  readonly hitPointMaximum?: Hp;
  readonly currentHp?: Hp;
  readonly tempHp?: Hp;
  readonly conditions?: readonly Condition[];
  readonly positiveHpUnconscious?: CharacterBattleCreatureInit["positiveHpUnconscious"];
  readonly zeroHpLifecycle?: CharacterZeroHpLifecycleInit;
  readonly spellSlots?: readonly CharacterBattleSpellSlotState[];
  readonly bookOfShadowsPresence?: CharacterBattleBookOfShadowsPresence;
  readonly resourceExpenditures: readonly CharacterSheetResourceExpenditure[];
  readonly druidWildShapeAvailableForms?: readonly StatBlockRecord[];
  readonly ammunitionStocks: CharacterBattleCreatureInit["ammunitionStocks"];
  readonly armorClassBaseChoices?:
    | {
        readonly kind: "currentEquipment";
        readonly choice: CharacterSheetArmorClassBaseChoice;
      }
    | {
        readonly kind: "byShieldUse";
        readonly shielded: CharacterSheetArmorClassBaseChoice;
        readonly unshielded: CharacterSheetArmorClassBaseChoice;
      };
  readonly pactBladeBondedWeaponItemId?:
    | NonNullable<CharacterBuild["equipment"]["loadout"]["weapon"]>["itemId"]
    | NonNullable<
        CharacterBuild["equipment"]["loadout"]["offHandWeapon"]
      >["itemId"];
};

export const CHARACTER_BATTLE_INIT_MAX_HP_EXCEEDS_BUILD_MAX_MESSAGE =
  "Character battle initialization max HP exceeds build-derived max HP.";

export type CharacterBattleInitiativeProficiencyChoice = "add" | "omit";

export function characterBattleInitiativeScore(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly rollTotal: number;
  readonly proficiencyBonusChoice: CharacterBattleInitiativeProficiencyChoice;
}): Either.Either<InitiativeScore, BattleCreatureInitIssue> {
  if (!Number.isInteger(input.rollTotal)) {
    return battleCreatureInitIssue(
      "Character battle Initiative roll total must be an integer.",
    );
  }
  if (input.proficiencyBonusChoice === "omit") {
    return Either.right(initiativeScore(input.rollTotal));
  }

  const classLevels = characterBattleClassLevels(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(classLevels)) {
    return battleCreatureInitIssue(classLevels.left.message);
  }
  const supportProjection = characterBattleSupportProjection(
    input.build,
    input.unitLibrary,
    undefined,
    classLevels.right,
  );
  if (Either.isLeft(supportProjection)) {
    return battleCreatureInitIssue(
      supportProjection.left.map((issue) => issue.message).join("; "),
    );
  }
  const hasInitiativeProficiency = supportProjection.right.unitRefs.some(
    (unitRef) =>
      unitRef.supportProfiles.some(
        (profile) =>
          typeof profile !== "string" &&
          profile.kind === INITIATIVE_PROFICIENCY_AND_SWAP_SUPPORT_PROFILE,
      ),
  );
  if (!hasInitiativeProficiency) {
    return battleCreatureInitIssue(
      "Character battle Initiative Proficiency Bonus requires an admitted Initiative support profile.",
    );
  }

  const totalLevel = computeTotalLevel(input.build.progression);
  const proficiencyBonus = proficiencyBonusForCharacterLevel(
    characterLevel(totalLevel),
  );
  return Either.right(initiativeScore(input.rollTotal + proficiencyBonus));
}

export function startBattleFromCharacterBuildAndStatBlock(input: {
  readonly battleId: BattleId;
  readonly character: CharacterBuildCreatureInput;
  readonly statBlockBattleInput: StatBlockBattleInitInput;
  readonly unitLibrary: UnitCatalog;
}): Either.Either<
  BattleRuntimeSession,
  BattleStateInitIssue | BattleCreatureInitIssue
> {
  const characterInit = battleCreatureInitFromCharacterBuild({
    ...input.character,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(characterInit)) {
    return battleCreatureInitIssue(characterInit.left.message);
  }
  const statBlockInit = battleCreatureInitFromStatBlock(
    input.statBlockBattleInput,
  );
  if (Either.isLeft(statBlockInit)) return Either.left(statBlockInit.left);

  return startBattle({
    battleId: input.battleId,
    combatants: [characterInit.right, statBlockInit.right],
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
      hitPoints.left.map(characterCreationIssueMessage).join("; "),
    );
  }
  const buildMaximumHp = Hp(hitPoints.right.maximum);
  const maxHp = input.hitPointMaximum ?? buildMaximumHp;
  if (maxHp > buildMaximumHp) {
    return battleCreatureInitIssue(
      CHARACTER_BATTLE_INIT_MAX_HP_EXCEEDS_BUILD_MAX_MESSAGE,
    );
  }
  if (maxHp < Hp(1)) {
    return battleCreatureInitIssue(
      "Character battle initialization max HP must be positive.",
    );
  }
  const weaponMasteries = characterBattleWeaponMasterySelections(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(weaponMasteries)) {
    return battleCreatureInitIssue(
      weaponMasteries.left.map((issue) => issue.message).join("; "),
    );
  }
  const currentHp = input.currentHp ?? maxHp;
  if (currentHp > maxHp) {
    return battleCreatureInitIssue(
      "Character battle initialization current HP exceeds max HP.",
    );
  }

  return Either.gen(function* () {
    const species = yield* getRequiredUnit(
      input.unitLibrary,
      input.build.species,
    );
    if (species.kind !== "species") {
      return yield* battleCreatureInitIssue(
        `Expected species Unit: ${input.build.species}`,
      );
    }
    const characterSize = yield* characterBattleSpeciesSize(
      input.build,
      species,
    );

    const currentLoadoutUsesShield =
      input.build.equipment.loadout.shield !== undefined;
    const currentArmorClassBaseChoice =
      input.armorClassBaseChoices?.kind === "currentEquipment"
        ? input.armorClassBaseChoices.choice
        : input.armorClassBaseChoices?.kind === "byShieldUse"
          ? currentLoadoutUsesShield
            ? input.armorClassBaseChoices.shielded
            : input.armorClassBaseChoices.unshielded
          : undefined;
    const armorClass = yield* characterArmorClassState({
      build: input.build,
      unitLibrary: input.unitLibrary,
      ...(currentArmorClassBaseChoice === undefined
        ? {}
        : { baseChoice: currentArmorClassBaseChoice }),
    });
    const shieldedBaseChoice =
      input.armorClassBaseChoices?.kind === "byShieldUse"
        ? input.armorClassBaseChoices.shielded
        : currentLoadoutUsesShield
          ? currentArmorClassBaseChoice
          : undefined;
    const unshieldedBaseChoice =
      input.armorClassBaseChoices?.kind === "byShieldUse"
        ? input.armorClassBaseChoices.unshielded
        : currentLoadoutUsesShield
          ? undefined
          : currentArmorClassBaseChoice;
    const unarmoredArmorClassBases = yield* characterUnarmoredArmorClassBases({
      build: input.build,
      unitLibrary: input.unitLibrary,
      ...(shieldedBaseChoice === undefined ? {} : { shieldedBaseChoice }),
      ...(unshieldedBaseChoice === undefined ? {} : { unshieldedBaseChoice }),
    });
    const classLevels = yield* characterBattleClassLevels(
      input.build,
      input.unitLibrary,
    );
    const parsedClassLevels = parseCharacterBattleClassLevels(classLevels);
    if (Either.isLeft(parsedClassLevels)) {
      return yield* battleCreatureInitIssue(
        parsedClassLevels.left.messages.join("; "),
      );
    }
    const supportProjection = characterBattleSupportProjection(
      input.build,
      input.unitLibrary,
      weaponMasteries.right,
      classLevels,
    );
    if (Either.isLeft(supportProjection)) {
      return yield* battleCreatureInitIssue(
        supportProjection.left.map((issue) => issue.message).join("; "),
      );
    }
    const pactBladeBondedWeaponItemId =
      yield* characterPactBladeBondedWeaponItemId({
        build: input.build,
        unitLibrary: input.unitLibrary,
        itemId: input.pactBladeBondedWeaponItemId,
      });
    const attack = yield* characterAttackActionOption(
      input.build,
      input.unitLibrary,
      classLevels,
      pactBladeBondedWeaponItemId,
    );
    const offHandAttack = yield* characterOffHandAttackActionOption(
      input.build,
      input.unitLibrary,
      classLevels,
      pactBladeBondedWeaponItemId,
    );
    const selectedLoadout = characterBattleLoadoutFromBuild(input.build);
    const unitFeatures = yield* characterBattleFeatures(
      input.build,
      input.unitLibrary,
      supportProjection.right.unitRefs,
      parsedClassLevels.right,
      supportProjection.right.sourceFacts,
    );
    const resourceProjectionFacts = characterBattleResourceProjectionFacts(
      input.build,
      input.unitLibrary,
      supportProjection.right,
    );
    if (Either.isLeft(resourceProjectionFacts)) {
      return yield* Either.left(resourceProjectionFacts.left);
    }
    const { admittedSupportProjection, druidWildShapeFacts } =
      resourceProjectionFacts.right;
    const resources = yield* characterBattleResourceInits(
      input.build,
      input.unitLibrary,
      input.resourceExpenditures,
      parsedClassLevels.right,
      druidWildShapeFacts,
      admittedSupportProjection.unitRefs.map(({ unit }) => unit),
    );
    const metamagic = yield* characterBattleMetamagicFromBuild(
      input.build,
      input.unitLibrary,
    );
    const proficiencies = characterBuildProficiencies(
      input.build,
      input.unitLibrary,
    );
    if (Either.isLeft(proficiencies)) {
      return yield* battleCreatureInitIssue(
        proficiencies.left.map(characterCreationIssueMessage).join("; "),
      );
    }
    const spellcasting =
      input.build.spellcasting === undefined &&
      input.build.magicInitiateSpellAccesses.length === 0
        ? undefined
        : yield* characterSpellcasting({
            build: input.build,
            unitLibrary: input.unitLibrary,
            ...(input.bookOfShadowsPresence === undefined
              ? {}
              : { bookOfShadowsPresence: input.bookOfShadowsPresence }),
            ...(input.spellSlots === undefined
              ? {}
              : { spellSlots: input.spellSlots }),
            resourceExpenditures: input.resourceExpenditures,
          });
    const unarmedStrike = yield* characterBaseUnarmedStrikeActionOption(
      input.build,
      input.unitLibrary,
      classLevels,
    );
    const druidWildShapeProjection =
      yield* characterBattleDruidWildShapeProjection(
        resources,
        parsedClassLevels.right,
      );
    const druidWildShapeAvailableForms =
      yield* battleDruidWildShapeAvailableFormsFromInput(
        input.druidWildShapeAvailableForms,
        druidWildShapeProjection,
      );

    return {
      combatantId: input.combatantId,
      displayName: input.displayName,
      initiative: input.initiative,
      creatureInit: {
        kind: "character",
        characterId: input.characterId,
        characterUnitRefs: admittedSupportProjection.unitRefs,
        classLevels,
        knownLanguages: characterBattleKnownLanguages(input.build),
        d20Statistics: {
          abilityScores: input.build.abilityScores,
          savingThrowProficiencies: proficiencies.right.savingThrows,
          skillProficiencies: proficiencies.right.skills,
          skillExpertise: proficiencies.right.expertise,
        },
        weaponProficiencies: [
          ...proficiencies.right.weapon.map((category) => ({
            kind: "weapon_category" as const,
            category,
          })),
          ...proficiencies.right.weaponPropertyFilters,
        ],
        armorClass,
        unarmoredArmorClassBases,
        size: characterSize,
        speed: { walkFeet: movementFeet(species.speed.walkFeet) },
        currentHp,
        maxHp,
        tempHp: input.tempHp ?? Hp(0),
        ammunitionStocks: input.ammunitionStocks,
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
        weaponMasteries: weaponMasteries.right,
        invocationFeatures: characterInvocationFeatures(input.build),
        attack,
        unarmedStrike,
        ...(offHandAttack === undefined ? {} : { offHandAttack }),
        unitFeatures,
        resources,
        ...(metamagic === undefined ? {} : { metamagic }),
        ...(spellcasting === undefined ? {} : { spellcasting }),
        ...(druidWildShapeAvailableForms === undefined
          ? {}
          : { druidWildShapeAvailableForms }),
      },
    };
  });
}

function characterBattleKnownLanguages(
  build: Pick<CharacterBuild, "originLanguages" | "classFeatureLanguages">,
): ReadonlyNonEmptyArray<Language> {
  const [firstLanguage, ...originLanguages] = build.originLanguages;
  const knownLanguages: [Language, ...Language[]] = [
    firstLanguage,
    ...originLanguages,
  ];
  for (const languageFact of build.classFeatureLanguages) {
    if (!knownLanguages.includes(languageFact.language)) {
      knownLanguages.push(languageFact.language);
    }
  }
  return knownLanguages;
}

type SupportedDruidWildShapeProfile = Extract<
  NonNullable<ReturnType<typeof parseSupportedUnitFeatureProfile>>,
  { readonly kind: "druidWildShapeKnownForm" }
>;

export type CharacterBattleDruidWildShapeProjection =
  | { readonly tag: "absent" }
  | {
      readonly tag: "present";
      readonly profile: SupportedDruidWildShapeProfile;
    };

export function characterBattleDruidWildShapeProjection(
  resources: readonly CharacterBattleResourceInit[],
  classLevels: Parameters<typeof parseSupportedUnitFeatureProfile>[1],
): Either.Either<
  CharacterBattleDruidWildShapeProjection,
  BattleCreatureInitIssue
> {
  const profiles = resources.flatMap((resource) => {
    const profile = parseSupportedUnitFeatureProfile(
      resource.unit,
      classLevels,
    );
    return profile?.kind === "druidWildShapeKnownForm" ? [profile] : [];
  });
  if (profiles.length > 1) {
    return battleCreatureInitIssue(
      "Druid Wild Shape battle initialization supports exactly one Druid Wild Shape resource.",
    );
  }
  const profile = profiles[0];
  return Either.right(
    profile === undefined ? { tag: "absent" } : { tag: "present", profile },
  );
}

function battleDruidWildShapeAvailableFormsFromInput(
  forms: readonly StatBlockRecord[] | undefined,
  projection: CharacterBattleDruidWildShapeProjection,
): Either.Either<
  readonly BattleDruidWildShapeKnownForm[] | undefined,
  BattleCreatureInitIssue
> {
  if (projection.tag === "absent") {
    return forms === undefined
      ? Either.right(undefined)
      : battleCreatureInitIssue(
          "Druid Wild Shape available forms require the Druid Wild Shape feature.",
        );
  }
  if (forms === undefined) {
    return battleCreatureInitIssue(
      "Druid Wild Shape battle initialization requires an available known-form subset.",
    );
  }
  const availableForms = battleAvailableDruidWildShapeKnownForms({
    forms,
    profile: projection.profile,
  });
  if (Either.isLeft(availableForms)) {
    return battleCreatureInitIssue(availableForms.left.message);
  }
  return Either.right(availableForms.right);
}

function characterBattleSpeciesSize(
  build: Pick<CharacterBuild, "species" | "speciesSize">,
  species: SpeciesRecord,
): Either.Either<CharacterBattleCreatureInit["size"], BattleCreatureInitIssue> {
  if (species.size.kind === "fixed") {
    return Either.right(species.size.size);
  }
  if (build.speciesSize === undefined) {
    return battleCreatureInitIssue(
      `Character battle initialization requires selected species size for ${build.species}.`,
    );
  }

  return Either.right(build.speciesSize);
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
  type CharacterBattleClassLevelInits = Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["classLevels"];
  const classLevels: CharacterBattleClassLevelInits[number][] = [];

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

  // progressionClassLevels is non-empty and every entry is projected exactly
  // once unless this function has already returned a typed projection issue.
  return Either.right([classLevels[0]!, ...classLevels.slice(1)]);
}

function characterBattleMetamagicFromBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  CharacterBattleMetamagicInit | undefined,
  BattleCreatureInitIssue
> {
  const facts = characterBuildSorcererMetamagicFacts({ build, unitLibrary });
  if (Either.isLeft(facts)) {
    return battleCreatureInitIssue(facts.left.message);
  }
  if (facts.right === undefined) {
    return Either.right(undefined);
  }
  return Either.right({
    sorceryPointResourceUnitId: facts.right.sorceryPointResource.resourceUnitId,
    spellUseLimit: facts.right.spellUseLimit,
    knownOptions: facts.right.knownOptions.map((option) => ({
      effectKind: option.effectKind,
      stackingMode: option.stackingMode,
      sorceryPointCost: option.sorceryPointCost,
    })),
  });
}

type CharacterBattleResourceProjectionFacts = {
  readonly admittedSupportProjection: CharacterBattleSupportProjection;
  readonly druidWildShapeFacts: CharacterBuildDruidWildShapeFacts | undefined;
};

function characterBattleResourceProjectionFacts(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  admittedSupportProjection: CharacterBattleSupportProjection,
): Either.Either<
  CharacterBattleResourceProjectionFacts,
  BattleCreatureInitIssue
> {
  const druidWildShapeFacts = characterBuildDruidWildShapeFacts({
    build,
    unitLibrary,
  });
  if (Either.isLeft(druidWildShapeFacts)) {
    return battleCreatureInitIssue(druidWildShapeFacts.left.message);
  }
  return Either.right({
    admittedSupportProjection,
    druidWildShapeFacts: druidWildShapeFacts.right,
  });
}

export function characterBattleResourceInitsFromBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  resourceExpenditures: readonly CharacterSheetResourceExpenditure[],
  parsedClassLevels?: CharacterBattleClassLevels,
): Either.Either<
  readonly CharacterBattleResourceInit[],
  BattleCreatureInitIssue
> {
  const classLevels =
    parsedClassLevels === undefined
      ? characterBattleClassLevels(build, unitLibrary)
      : Either.right(parsedClassLevels);
  if (Either.isLeft(classLevels)) return Either.left(classLevels.left);
  const parsedLevelsResult =
    parsedClassLevels === undefined
      ? parseCharacterBattleClassLevels(classLevels.right)
      : Either.right(parsedClassLevels);
  if (Either.isLeft(parsedLevelsResult)) {
    return battleCreatureInitIssue(parsedLevelsResult.left.messages.join("; "));
  }
  const supportProjection = characterBattleSupportProjection(
    build,
    unitLibrary,
    undefined,
    classLevels.right,
  );
  if (Either.isLeft(supportProjection)) {
    return battleCreatureInitIssue(
      supportProjection.left.map(({ message }) => message).join("; "),
    );
  }
  const resourceProjectionFacts = characterBattleResourceProjectionFacts(
    build,
    unitLibrary,
    supportProjection.right,
  );
  if (Either.isLeft(resourceProjectionFacts)) {
    return Either.left(resourceProjectionFacts.left);
  }
  const { admittedSupportProjection, druidWildShapeFacts } =
    resourceProjectionFacts.right;
  return characterBattleResourceInits(
    build,
    unitLibrary,
    resourceExpenditures,
    parsedLevelsResult.right,
    druidWildShapeFacts,
    admittedSupportProjection.unitRefs.map(({ unit }) => unit),
  );
}

function characterBattleResourceInits(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  resourceExpenditures: readonly CharacterSheetResourceExpenditure[],
  classLevels: CharacterBattleClassLevels,
  druidWildShapeFacts: CharacterBuildDruidWildShapeFacts | undefined,
  admittedUnits: readonly UnitRecord[],
): Either.Either<
  readonly CharacterBattleResourceInit[],
  BattleCreatureInitIssue
> {
  const admittedResourceProjection =
    characterBattleResourceInitsFromAdmittedUnits(
      build,
      unitLibrary,
      resourceExpenditures,
      classLevels,
      druidWildShapeFacts,
      admittedUnits,
    );
  const spellAccessResourceProjection =
    characterBattleResourceInitsFromSpellAccesses(
      build,
      unitLibrary,
      resourceExpenditures,
    );
  const issues = [
    ...admittedResourceProjection.issues,
    ...spellAccessResourceProjection.issues,
  ];
  if (issues.length > 0) {
    return battleCreatureInitIssue(issues.join("; "));
  }
  return Either.right([
    ...admittedResourceProjection.resources,
    ...spellAccessResourceProjection.resources,
  ]);
}

type CharacterBattleResourceProjection = {
  readonly resources: readonly CharacterBattleResourceInit[];
  readonly issues: readonly string[];
};

function characterBattleResourceInitsFromAdmittedUnits(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  resourceExpenditures: readonly CharacterSheetResourceExpenditure[],
  classLevels: CharacterBattleClassLevels,
  druidWildShapeFacts: CharacterBuildDruidWildShapeFacts | undefined,
  admittedUnits: readonly UnitRecord[],
): CharacterBattleResourceProjection {
  const resources: CharacterBattleResourceInit[] = [];
  const issues: string[] = [];
  const buildUnitIds = new Set(
    characterBuildUnitRefs(build, unitLibrary).map(({ unitId }) => unitId),
  );
  for (const unit of admittedUnits) {
    if (!buildUnitIds.has(unit.id)) continue;
    if (unit.kind !== "class_feature" && unit.kind !== "species_trait") {
      continue;
    }
    if (!characterBattleResourceSupportedForUnit(unit)) {
      continue;
    }

    const init = characterBattleResourceInit(
      build,
      unit,
      unitLibrary,
      resourceExpenditures,
      classLevels,
      druidWildShapeFacts,
    );
    if (Either.isLeft(init)) {
      issues.push(init.left.message);
    } else {
      resources.push(init.right);
    }
  }
  return { resources, issues };
}

function characterBattleResourceInitsFromSpellAccesses(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  resourceExpenditures: readonly CharacterSheetResourceExpenditure[],
): CharacterBattleResourceProjection {
  const resources: CharacterBattleResourceInit[] = [];
  const issues: string[] = [];
  for (const access of characterSheetSpellAccessesForBuild({
    build,
    unitLibrary,
  })) {
    if (
      access.source !== "magicInitiate" ||
      access.preparation !== "alwaysPrepared"
    ) {
      continue;
    }
    const source = unitLibrary.getUnit(access.sourceUnitId);
    if (Option.isNone(source)) {
      issues.push("Spell Access free-cast source Unit must exist.");
      continue;
    }
    const expended =
      resourceExpenditures.find(
        (candidate) =>
          candidate.tag === "spellAccessFreeCast" &&
          candidate.sourceUnitId === access.sourceUnitId &&
          candidate.spellId === access.spellId,
      )?.expended ?? resourceCount(0);
    if (expended > 1) {
      issues.push(
        "Spell Access free-cast expenditure exceeds its battle resource cap.",
      );
      continue;
    }
    resources.push({
      unit: source.value,
      spellAccessFreeCast: { spellId: access.spellId, count: 1 },
      usesRemaining: 1 - Number(expended),
    });
  }
  return { resources, issues };
}

function characterBattleResourceInit(
  build: CharacterBuild,
  unit: Extract<
    UnitRecord,
    { readonly kind: "class_feature" | "species_trait" }
  >,
  unitLibrary: UnitCatalog,
  resourceExpenditures: readonly CharacterSheetResourceExpenditure[],
  classLevels: CharacterBattleClassLevels,
  druidWildShapeFacts: CharacterBuildDruidWildShapeFacts | undefined,
): Either.Either<CharacterBattleResourceInit, BattleCreatureInitIssue> {
  const battleResource = characterBattleResourceForUnit(unit);
  if (battleResource.kind === "point_pool") {
    const persistedPointsRemaining = characterBattlePersistedPointsRemaining(
      build,
      unit,
      unitLibrary,
      resourceExpenditures,
      classLevels,
    );
    if (Either.isLeft(persistedPointsRemaining)) {
      return Either.left(persistedPointsRemaining.left);
    }
    return Either.right({
      unit,
      ...(persistedPointsRemaining.right === undefined
        ? {}
        : { pointsRemaining: persistedPointsRemaining.right }),
    });
  }
  const persistedUsesRemaining = characterBattlePersistedUsesRemaining(
    build,
    unit,
    resourceExpenditures,
    classLevels,
    druidWildShapeFacts,
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

function characterBattlePersistedPointsRemaining(
  build: CharacterBuild,
  unit: Extract<
    UnitRecord,
    { readonly kind: "class_feature" | "species_trait" }
  >,
  unitLibrary: UnitCatalog,
  resourceExpenditures: readonly CharacterSheetResourceExpenditure[],
  classLevels: CharacterBattleClassLevels,
): Either.Either<number | undefined, BattleCreatureInitIssue> {
  const facts = characterBuildSorcererFontOfMagicFacts({ build, unitLibrary });
  if (Either.isLeft(facts)) {
    return battleCreatureInitIssue(facts.left.message);
  }
  if (facts.right === undefined || unit.id !== facts.right.unitId) {
    return Either.right(undefined);
  }
  const expended =
    resourceExpenditures.find(
      (expenditure) =>
        expenditure.tag === "pointPoolResource" &&
        expenditure.unitId === facts.right?.unitId,
    )?.expended ?? resourceCount(0);
  const maxPoints = characterBattleResourceMaxPoints({ unit, classLevels });
  if (maxPoints === undefined) {
    return battleCreatureInitIssue(
      "Class feature point-pool expenditure requires a finite battle resource cap.",
    );
  }
  if (expended > maxPoints) {
    return battleCreatureInitIssue(
      "Class feature point-pool expenditure exceeds its battle resource cap.",
    );
  }
  return Either.right(Number(maxPoints) - Number(expended));
}

function characterBattlePersistedUsesRemaining(
  build: CharacterBuild,
  unit: Extract<
    UnitRecord,
    { readonly kind: "class_feature" | "species_trait" }
  >,
  resourceExpenditures: readonly CharacterSheetResourceExpenditure[],
  classLevels: CharacterBattleClassLevels,
  druidWildShapeFacts: CharacterBuildDruidWildShapeFacts | undefined,
): Either.Either<number | undefined, BattleCreatureInitIssue> {
  if (
    druidWildShapeFacts !== undefined &&
    unit.id === druidWildShapeFacts.unitId
  ) {
    const expended =
      resourceExpenditures.find(
        (expenditure) =>
          expenditure.tag === "useCountResource" &&
          expenditure.unitId === druidWildShapeFacts.unitId,
      )?.expended ?? resourceCount(0);
    if (expended > druidWildShapeFacts.useCount.maximum) {
      return battleCreatureInitIssue(
        "Druid Wild Shape expenditure exceeds its character resource cap.",
      );
    }
    return Either.right(
      Number(druidWildShapeFacts.useCount.maximum) - Number(expended),
    );
  }

  const freeCastGrants = supportedClassFeatureSpellFreeCastGrantsForUnit(unit);
  if (freeCastGrants !== null) {
    const expended =
      resourceExpenditures.find(
        (expenditure) =>
          expenditure.tag === "spellAccessFreeCast" &&
          expenditure.sourceUnitId === unit.id &&
          expenditure.spellId === freeCastGrants.profile.spellId,
      )?.expended ?? 0;
    if (expended > freeCastGrants.freeCastGrant.count) {
      return battleCreatureInitIssue(
        "Spell Access free-cast expenditure exceeds its battle resource cap.",
      );
    }
    return Either.right(freeCastGrants.freeCastGrant.count - expended);
  }
  const useCountExpenditure = resourceExpenditures.find(
    (expenditure) =>
      expenditure.tag === "useCountResource" && expenditure.unitId === unit.id,
  );
  if (useCountExpenditure === undefined) {
    return Either.right(undefined);
  }
  const resource =
    "resource" in unit.mechanics ? unit.mechanics.resource : undefined;
  if (resource?.kind !== "use_count") {
    return Either.right(undefined);
  }
  const capAbilityModifier =
    resource.cap.kind === "ability_modifier"
      ? abilityModifier(
          scoreModifier(build.abilityScores[resource.cap.ability]),
        )
      : undefined;
  const maxUses = characterBattleResourceMaxUses({
    unit,
    classLevels,
    ...(capAbilityModifier === undefined ? {} : { capAbilityModifier }),
  });
  if (maxUses === undefined) {
    return battleCreatureInitIssue(
      "Class feature use-count expenditure requires a finite battle resource cap.",
    );
  }
  if (useCountExpenditure.expended > maxUses) {
    return battleCreatureInitIssue(
      "Class feature use-count expenditure exceeds its battle resource cap.",
    );
  }
  return Either.right(Number(maxUses) - Number(useCountExpenditure.expended));
}

function characterBattleFeatures(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  admittedUnitRefs: CharacterBattleSupportProjection["unitRefs"],
  classLevels: Parameters<typeof parseSupportedUnitFeatureProfile>[1],
  sourceFacts: Parameters<typeof parseSupportedUnitFeatureProfile>[2],
): Either.Either<
  readonly CharacterBattleFeatureInit[],
  BattleCreatureInitIssue
> {
  const features: CharacterBattleFeatureInit[] = [];
  const featureUnitIds = new Set(
    characterBuildFeatureUnitIds(build, unitLibrary),
  );
  for (const { unit } of admittedUnitRefs) {
    if (!featureUnitIds.has(unit.id)) continue;
    if (unit.kind !== "class_feature" && unit.kind !== "species_trait") {
      continue;
    }
    const profile = parseSupportedUnitFeatureProfile(
      unit,
      classLevels,
      sourceFacts,
    );
    if (profile !== null) {
      features.push(profile);
    }
  }
  return Either.right(features);
}
