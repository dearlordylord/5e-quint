import {
  battleAvailableDruidWildShapeKnownForms,
  wildShapeKnownFormsIssueMessage,
  characterBattleResourceForUnit,
  characterBattleResourceMaxPoints,
  characterBattleResourceMaxUses,
  characterBattleResourceSupportedForUnit,
  parseCharacterBattleClassLevels,
  parseSupportedUnitFeatureProfile,
  INITIATIVE_PROFICIENCY_AND_SWAP_SUPPORT_PROFILE,
  scoreModifier,
  initiativeScore,
  type CharacterBattleFeatureInit,
  type CharacterBattleMetamagicInit,
  type CharacterBattleResourceInit,
  type CharacterBattleSpellSlotState,
  type CharacterBattleBookOfShadowsPresence,
  type CharacterBattleClassLevels,
  type CharacterBattleCreatureInit,
  type CharacterZeroHpLifecycleInit,
  type CharacterId,
  type CombatantId,
  type BattleCreatureInit,
  type BattleDruidWildShapeKnownForm,
  type InitiativeScore,
} from "@dnd/battle-runtime";
import {
  characterBuildDruidWildShapeFacts,
  characterBuildFeatureUnitIds,
  characterBuildHitPoints,
  characterBuildProficiencies,
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
  type CharacterSheet,
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
import type { StatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import { Option, Result } from "effect";
import {
  battleCreatureInitIssue,
  battleCreatureInitIssueMessage,
  battleCreatureInitIssuesFromCharacterBuildProjection,
  battleCreatureInitIssuesFromMessages,
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

/** Character-build projection cannot admit a Stat Block creature. */
export type CharacterBattleCreatureInitResult = Extract<
  BattleCreatureInit,
  { readonly creatureInit: { readonly kind: "character" } }
>;

export type CharacterSheetBattleInitInput = Omit<
  CharacterBuildCreatureInput,
  | "build"
  | "characterId"
  | "hitPointMaximum"
  | "currentHp"
  | "tempHp"
  | "conditions"
  | "positiveHpUnconscious"
  | "zeroHpLifecycle"
  | "spellSlots"
  | "bookOfShadowsPresence"
  | "resourceExpenditures"
  | "druidWildShapeAvailableForms"
> & {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog: StatBlockCatalog;
};

export type CharacterSheetBattleInit = (
  input: CharacterSheetBattleInitInput,
) => Result.Result<CharacterBattleCreatureInitResult, BattleCreatureInitIssue>;

export const CHARACTER_BATTLE_INIT_MAX_HP_EXCEEDS_BUILD_MAX_MESSAGE =
  "Character battle initialization max HP exceeds build-derived max HP.";

export type CharacterBattleInitiativeProficiencyChoice = "add" | "omit";

export function characterBattleInitiativeScore(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly rollTotal: number;
  readonly proficiencyBonusChoice: CharacterBattleInitiativeProficiencyChoice;
}): Result.Result<InitiativeScore, BattleCreatureInitIssue> {
  if (!Number.isInteger(input.rollTotal)) {
    return battleCreatureInitIssue(
      "Character battle Initiative roll total must be an integer.",
    );
  }
  if (input.proficiencyBonusChoice === "omit") {
    return Result.succeed(initiativeScore(input.rollTotal));
  }

  const classLevels = characterBattleClassLevels(
    input.build,
    input.unitLibrary,
  );
  if (Result.isFailure(classLevels)) {
    return battleCreatureInitIssue(
      battleCreatureInitIssueMessage(classLevels.failure),
    );
  }
  const supportProjection = characterBattleSupportProjection(
    input.build,
    input.unitLibrary,
    undefined,
    classLevels.success,
  );
  if (Result.isFailure(supportProjection)) {
    return battleCreatureInitIssuesFromMessages(
      supportProjection.failure.map((issue) => issue.message),
      (issueIndex) => ({
        kind: "characterBattleSupportProjection",
        issueIndex,
      }),
    );
  }
  const hasInitiativeProficiency = supportProjection.success.unitRefs.some(
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
  return Result.succeed(initiativeScore(input.rollTotal + proficiencyBonus));
}

export function battleCreatureInitFromCharacterBuild(
  input: CharacterBuildCreatureInput & {
    readonly unitLibrary: UnitCatalog;
  },
): Result.Result<CharacterBattleCreatureInitResult, BattleCreatureInitIssue> {
  const hitPoints = characterBuildHitPoints(input.build, input.unitLibrary);
  if (Result.isFailure(hitPoints)) {
    return battleCreatureInitIssuesFromCharacterBuildProjection(
      hitPoints.failure,
      "hitPoints",
    );
  }
  const buildMaximumHp = Hp(hitPoints.success.maximum);
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
  if (Result.isFailure(weaponMasteries)) {
    return battleCreatureInitIssuesFromMessages(
      weaponMasteries.failure.map((issue) => issue.message),
      () => ({
        kind: "characterBuildProjection",
        phase: "equipment",
      }),
    );
  }
  const currentHp = input.currentHp ?? maxHp;
  if (currentHp > maxHp) {
    return battleCreatureInitIssue(
      "Character battle initialization current HP exceeds max HP.",
    );
  }

  return Result.gen(function* () {
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
    if (Result.isFailure(parsedClassLevels)) {
      return yield* battleCreatureInitIssuesFromMessages(
        parsedClassLevels.failure.messages,
        (issueIndex) => ({
          kind: "characterBattleClassLevelsProjection",
          issueIndex,
        }),
      );
    }
    const supportProjection = characterBattleSupportProjection(
      input.build,
      input.unitLibrary,
      weaponMasteries.success,
      classLevels,
    );
    if (Result.isFailure(supportProjection)) {
      return yield* battleCreatureInitIssuesFromMessages(
        supportProjection.failure.map((issue) => issue.message),
        (issueIndex) => ({
          kind: "characterBattleSupportProjection",
          issueIndex,
        }),
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
      supportProjection.success.unitRefs,
      parsedClassLevels.success,
      supportProjection.success.sourceFacts,
    );
    const resourceProjectionFacts = characterBattleResourceProjectionFacts(
      input.build,
      input.unitLibrary,
      supportProjection.success,
    );
    if (Result.isFailure(resourceProjectionFacts)) {
      return yield* Result.fail(resourceProjectionFacts.failure);
    }
    const { admittedSupportProjection, druidWildShapeFacts } =
      resourceProjectionFacts.success;
    const resources = yield* characterBattleResourceInits(
      input.build,
      input.unitLibrary,
      input.resourceExpenditures,
      parsedClassLevels.success,
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
    if (Result.isFailure(proficiencies)) {
      return yield* battleCreatureInitIssuesFromCharacterBuildProjection(
        proficiencies.failure,
        "proficiencies",
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
        parsedClassLevels.success,
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
          savingThrowProficiencies: proficiencies.success.savingThrows,
          skillProficiencies: proficiencies.success.skills,
          skillExpertise: proficiencies.success.expertise,
        },
        weaponProficiencies: [
          ...proficiencies.success.weapon.map((category) => ({
            kind: "weapon_category" as const,
            category,
          })),
          ...proficiencies.success.weaponPropertyFilters,
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
        weaponMasteries: weaponMasteries.success,
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
): Result.Result<
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
  return Result.succeed(
    profile === undefined ? { tag: "absent" } : { tag: "present", profile },
  );
}

function battleDruidWildShapeAvailableFormsFromInput(
  forms: readonly StatBlockRecord[] | undefined,
  projection: CharacterBattleDruidWildShapeProjection,
): Result.Result<
  readonly BattleDruidWildShapeKnownForm[] | undefined,
  BattleCreatureInitIssue
> {
  if (projection.tag === "absent") {
    return forms === undefined
      ? Result.succeed(undefined)
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
  if (Result.isFailure(availableForms)) {
    return battleCreatureInitIssue(
      wildShapeKnownFormsIssueMessage(availableForms.failure.issues),
    );
  }
  return Result.succeed(availableForms.success);
}

function characterBattleSpeciesSize(
  build: Pick<CharacterBuild, "species" | "speciesSize">,
  species: SpeciesRecord,
): Result.Result<CharacterBattleCreatureInit["size"], BattleCreatureInitIssue> {
  if (species.size.kind === "fixed") {
    return Result.succeed(species.size.size);
  }
  if (build.speciesSize === undefined) {
    return battleCreatureInitIssue(
      `Character battle initialization requires selected species size for ${build.species}.`,
    );
  }

  return Result.succeed(build.speciesSize);
}

function characterBattleClassLevels(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Result.Result<
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
    if (Result.isFailure(classUnit)) {
      return battleCreatureInitIssue(
        battleCreatureInitIssueMessage(classUnit.failure),
      );
    }
    if (classUnit.success.kind !== "class") {
      return battleCreatureInitIssue(
        `Expected class Unit: ${entry.classUnitId}`,
      );
    }
    classLevels.push({
      className: classUnit.success.className,
      level: entry.classLevel,
    });
  }

  // progressionClassLevels is non-empty and every entry is projected exactly
  // once unless this function has already returned a typed projection issue.
  return Result.succeed([classLevels[0]!, ...classLevels.slice(1)]);
}

function characterBattleMetamagicFromBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Result.Result<
  CharacterBattleMetamagicInit | undefined,
  BattleCreatureInitIssue
> {
  const facts = characterBuildSorcererMetamagicFacts({ build, unitLibrary });
  if (Result.isFailure(facts)) {
    return battleCreatureInitIssue(facts.failure.message);
  }
  if (facts.success === undefined) {
    return Result.succeed(undefined);
  }
  return Result.succeed({
    sorceryPointResourceUnitId:
      facts.success.sorceryPointResource.resourceUnitId,
    spellUseLimit: facts.success.spellUseLimit,
    knownOptions: facts.success.knownOptions.map((option) => ({
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
): Result.Result<
  CharacterBattleResourceProjectionFacts,
  BattleCreatureInitIssue
> {
  const druidWildShapeFacts = characterBuildDruidWildShapeFacts({
    build,
    unitLibrary,
  });
  if (Result.isFailure(druidWildShapeFacts)) {
    return battleCreatureInitIssue(druidWildShapeFacts.failure.message);
  }
  return Result.succeed({
    admittedSupportProjection,
    druidWildShapeFacts: druidWildShapeFacts.success,
  });
}

export function characterBattleResourceInitsFromBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  resourceExpenditures: readonly CharacterSheetResourceExpenditure[],
  parsedClassLevels?: CharacterBattleClassLevels,
): Result.Result<
  readonly CharacterBattleResourceInit[],
  BattleCreatureInitIssue
> {
  const classLevels =
    parsedClassLevels === undefined
      ? characterBattleClassLevels(build, unitLibrary)
      : Result.succeed(parsedClassLevels);
  if (Result.isFailure(classLevels)) return Result.fail(classLevels.failure);
  const parsedLevelsResult =
    parsedClassLevels === undefined
      ? parseCharacterBattleClassLevels(classLevels.success)
      : Result.succeed(parsedClassLevels);
  if (Result.isFailure(parsedLevelsResult)) {
    return battleCreatureInitIssuesFromMessages(
      parsedLevelsResult.failure.messages,
      (issueIndex) => ({
        kind: "characterBattleClassLevelsProjection",
        issueIndex,
      }),
    );
  }
  const supportProjection = characterBattleSupportProjection(
    build,
    unitLibrary,
    undefined,
    classLevels.success,
  );
  if (Result.isFailure(supportProjection)) {
    return battleCreatureInitIssuesFromMessages(
      supportProjection.failure.map(({ message }) => message),
      (issueIndex) => ({
        kind: "characterBattleSupportProjection",
        issueIndex,
      }),
    );
  }
  const resourceProjectionFacts = characterBattleResourceProjectionFacts(
    build,
    unitLibrary,
    supportProjection.success,
  );
  if (Result.isFailure(resourceProjectionFacts)) {
    return Result.fail(resourceProjectionFacts.failure);
  }
  const { admittedSupportProjection, druidWildShapeFacts } =
    resourceProjectionFacts.success;
  return characterBattleResourceInits(
    build,
    unitLibrary,
    resourceExpenditures,
    parsedLevelsResult.success,
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
): Result.Result<
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
    return battleCreatureInitIssuesFromMessages(issues, (issueIndex) => ({
      kind: "characterBattleResourceProjection",
      issueIndex,
    }));
  }
  return Result.succeed([
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
    if (Result.isFailure(init)) {
      issues.push(battleCreatureInitIssueMessage(init.failure));
    } else {
      resources.push(init.success);
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
): Result.Result<CharacterBattleResourceInit, BattleCreatureInitIssue> {
  const battleResource = characterBattleResourceForUnit(unit);
  if (battleResource.kind === "point_pool") {
    const persistedPointsRemaining = characterBattlePersistedPointsRemaining(
      build,
      unit,
      unitLibrary,
      resourceExpenditures,
      classLevels,
    );
    if (Result.isFailure(persistedPointsRemaining)) {
      return Result.fail(persistedPointsRemaining.failure);
    }
    return Result.succeed({
      unit,
      ...(persistedPointsRemaining.success === undefined
        ? {}
        : { pointsRemaining: persistedPointsRemaining.success }),
    });
  }
  const persistedUsesRemaining = characterBattlePersistedUsesRemaining(
    build,
    unit,
    resourceExpenditures,
    classLevels,
    druidWildShapeFacts,
  );
  if (Result.isFailure(persistedUsesRemaining)) {
    return Result.fail(persistedUsesRemaining.failure);
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
  return Result.succeed({
    ...init,
    ...(persistedUsesRemaining.success === undefined
      ? {}
      : { usesRemaining: persistedUsesRemaining.success }),
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
): Result.Result<number | undefined, BattleCreatureInitIssue> {
  const facts = characterBuildSorcererFontOfMagicFacts({ build, unitLibrary });
  if (Result.isFailure(facts)) {
    return battleCreatureInitIssue(facts.failure.message);
  }
  if (facts.success === undefined || unit.id !== facts.success.unitId) {
    return Result.succeed(undefined);
  }
  const expended =
    resourceExpenditures.find(
      (expenditure) =>
        expenditure.tag === "pointPoolResource" &&
        expenditure.unitId === facts.success?.unitId,
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
  return Result.succeed(Number(maxPoints) - Number(expended));
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
): Result.Result<number | undefined, BattleCreatureInitIssue> {
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
    return Result.succeed(
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
    return Result.succeed(freeCastGrants.freeCastGrant.count - expended);
  }
  const useCountExpenditure = resourceExpenditures.find(
    (expenditure) =>
      expenditure.tag === "useCountResource" && expenditure.unitId === unit.id,
  );
  if (useCountExpenditure === undefined) {
    return Result.succeed(undefined);
  }
  const resource =
    "resource" in unit.mechanics ? unit.mechanics.resource : undefined;
  if (resource?.kind !== "use_count") {
    return Result.succeed(undefined);
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
  return Result.succeed(Number(maxUses) - Number(useCountExpenditure.expended));
}

function characterBattleFeatures(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  admittedUnitRefs: CharacterBattleSupportProjection["unitRefs"],
  classLevels: Parameters<typeof parseSupportedUnitFeatureProfile>[1],
  sourceFacts: Parameters<typeof parseSupportedUnitFeatureProfile>[2],
): Result.Result<
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
  return Result.succeed(features);
}
