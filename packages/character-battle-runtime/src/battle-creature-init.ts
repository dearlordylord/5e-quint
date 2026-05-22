import {
  battleCreatureInitFromStatBlock,
  battleDruidWildShapeKnownForms,
  characterBattleResourceForUnit,
  characterBattleResourceMaxPoints,
  characterBattleResourceMaxUses,
  characterBattleResourceSupportedForUnit,
  parseCharacterBattleClassLevels,
  parseSupportedUnitFeatureProfile,
  scoreModifier,
  startBattle,
  unitIsSupportedClassFeatureSpellFreeCastResource,
  type CharacterBattleFeatureInit,
  type CharacterBattleMetamagicState,
  type CharacterBattleResourceInit,
  type CharacterBattleSpellSlotState,
  type CharacterBattleBookOfShadowsPresence,
  type CharacterBattleClassLevel,
  type CharacterBattleCreatureInit,
  type CharacterZeroHpLifecycleInit,
  type BattleId,
  type BattleCombatantSide,
  type BattleState,
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
  characterBuildSorcererFontOfMagicFacts,
  characterBuildSorcererMetamagicFacts,
  progressionClassLevels,
  type CharacterBuild,
  type CharacterBuildDruidWildShapeFacts,
} from "@dnd/character-creation-runtime";
import type {
  CharacterSheetArmorClassBaseChoice,
  CharacterSheetResourceExpenditure,
} from "@dnd/character-sheet-runtime";
import {
  ClassLevel,
  Hp,
  abilityModifier,
  movementFeet,
  resourceCount,
  type Condition,
} from "@dnd/shared/types";
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

// KERNEL-COVERAGE: runtime-owner CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.monk-focus-battle-options character-sheet.metamagic-battle-resource-bridge

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
  readonly hitPointMaximum?: Hp;
  readonly currentHp?: Hp;
  readonly tempHp?: Hp;
  readonly conditions?: readonly Condition[];
  readonly positiveHpUnconscious?: CharacterBattleCreatureInit["positiveHpUnconscious"];
  readonly zeroHpLifecycle?: CharacterZeroHpLifecycleInit;
  readonly spellSlots?: readonly CharacterBattleSpellSlotState[];
  readonly bookOfShadowsPresence?: CharacterBattleBookOfShadowsPresence;
  readonly resourceExpenditures?: readonly CharacterSheetResourceExpenditure[];
  readonly druidWildShapeKnownForms?: readonly StatBlockRecord[];
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
  const buildMaximumHp = Hp(hitPoints.right.maximum);
  const maxHp = input.hitPointMaximum ?? buildMaximumHp;
  if (maxHp > buildMaximumHp) {
    return battleCreatureInitIssue(
      "Character battle initialization max HP exceeds build-derived max HP.",
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

  const species = getRequiredUnit(input.unitLibrary, input.build.species);
  if (Either.isLeft(species)) {
    return battleCreatureInitIssue(species.left.message);
  }
  if (species.right.kind !== "species") {
    return battleCreatureInitIssue(
      `Expected species Unit: ${input.build.species}`,
    );
  }
  const characterSize = characterBattleSpeciesSize(input.build, species.right);
  if (Either.isLeft(characterSize)) {
    return battleCreatureInitIssue(characterSize.left.message);
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
  const characterUnitRefs = characterUnitRefsWithBattleSupportProfiles(
    input.build,
    input.unitLibrary,
    weaponMasteries.right,
    classLevels.right,
  );
  if (Either.isLeft(characterUnitRefs)) {
    return battleCreatureInitIssue(
      characterUnitRefs.left.map((issue) => issue.message).join("; "),
    );
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
    parseCharacterBattleClassLevels(classLevels.right),
  );
  if (Either.isLeft(resources)) {
    return battleCreatureInitIssue(resources.left.message);
  }
  const metamagic = characterBattleMetamagicFromBuild(
    input.build,
    input.unitLibrary,
  );
  if (Either.isLeft(metamagic)) {
    return battleCreatureInitIssue(metamagic.left.message);
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
  const druidWildShapeFacts = characterBuildDruidWildShapeFacts({
    build: input.build,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(druidWildShapeFacts)) {
    return battleCreatureInitIssue(druidWildShapeFacts.left.message);
  }
  const supportProfileClassLevels = classLevels.right.map((level) => ({
    className: level.className,
    level: ClassLevel.make(level.level),
  }));
  const druidWildShapeProfile = singleDruidWildShapeProfile(
    resources.right,
    supportProfileClassLevels,
  );
  if (Either.isLeft(druidWildShapeProfile)) {
    return Either.left(druidWildShapeProfile.left);
  }
  const druidWildShapeKnownForms = battleDruidWildShapeKnownFormsFromInput(
    input.druidWildShapeKnownForms,
    druidWildShapeFacts.right,
    druidWildShapeProfile.right,
  );
  if (Either.isLeft(druidWildShapeKnownForms)) {
    return Either.left(druidWildShapeKnownForms.left);
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
      armorClass: armorClass.right,
      size: characterSize.right,
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
      ...(metamagic.right === undefined ? {} : { metamagic: metamagic.right }),
      ...(spellcasting === undefined
        ? {}
        : { spellcasting: spellcasting.right }),
      ...(druidWildShapeKnownForms.right === undefined
        ? {}
        : { druidWildShapeKnownForms: druidWildShapeKnownForms.right }),
    },
  });
}

type SupportedDruidWildShapeProfile = Extract<
  NonNullable<ReturnType<typeof parseSupportedUnitFeatureProfile>>,
  { readonly kind: "druidWildShapeKnownForm" }
>;

function singleDruidWildShapeProfile(
  resources: readonly CharacterBattleResourceInit[],
  classLevels: Parameters<typeof parseSupportedUnitFeatureProfile>[1],
): Either.Either<
  SupportedDruidWildShapeProfile | undefined,
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
  return Either.right(profiles[0]);
}

function battleDruidWildShapeKnownFormsFromInput(
  forms: readonly StatBlockRecord[] | undefined,
  facts: CharacterBuildDruidWildShapeFacts | undefined,
  profile: SupportedDruidWildShapeProfile | undefined,
): Either.Either<
  | readonly [BattleDruidWildShapeKnownForm, ...BattleDruidWildShapeKnownForm[]]
  | undefined,
  BattleCreatureInitIssue
> {
  if (facts === undefined) {
    return forms === undefined
      ? Either.right(undefined)
      : battleCreatureInitIssue(
          "Druid Wild Shape known forms require the Druid Wild Shape feature.",
        );
  }
  if (forms === undefined) {
    return battleCreatureInitIssue(
      "Druid Wild Shape battle initialization requires known Beast forms.",
    );
  }
  if (profile === undefined) {
    return battleCreatureInitIssue(
      "Druid Wild Shape level 18+ requires Beast Spells support before battle initialization.",
    );
  }
  const knownForms = battleDruidWildShapeKnownForms({
    forms,
    profile,
  });
  if (Either.isLeft(knownForms)) {
    return battleCreatureInitIssue(knownForms.left.message);
  }
  return Either.right(knownForms.right);
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

function characterBattleMetamagicFromBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Either.Either<
  CharacterBattleMetamagicState | undefined,
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

export function characterBattleResourceInitsFromBuild(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  resourceExpenditures: readonly CharacterSheetResourceExpenditure[],
  parsedClassLevels?: readonly CharacterBattleClassLevel[],
): Either.Either<
  readonly CharacterBattleResourceInit[],
  BattleCreatureInitIssue
> {
  const classLevels =
    parsedClassLevels === undefined
      ? characterBattleClassLevels(build, unitLibrary)
      : Either.right(parsedClassLevels);
  if (Either.isLeft(classLevels)) return Either.left(classLevels.left);
  const parsedLevels =
    parsedClassLevels ?? parseCharacterBattleClassLevels(classLevels.right);
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
      unitLibrary,
      resourceExpenditures,
      parsedLevels,
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
  unitLibrary: UnitCatalog,
  resourceExpenditures: readonly CharacterSheetResourceExpenditure[],
  classLevels: readonly CharacterBattleClassLevel[],
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
    unitLibrary,
    resourceExpenditures,
    classLevels,
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
  unit: UnitRecord,
  unitLibrary: UnitCatalog,
  resourceExpenditures: readonly CharacterSheetResourceExpenditure[],
  classLevels: readonly CharacterBattleClassLevel[],
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
  unit: UnitRecord,
  unitLibrary: UnitCatalog,
  resourceExpenditures: readonly CharacterSheetResourceExpenditure[],
  classLevels: readonly CharacterBattleClassLevel[],
): Either.Either<number | undefined, BattleCreatureInitIssue> {
  const facts = characterBuildDruidWildShapeFacts({ build, unitLibrary });
  if (Either.isLeft(facts)) {
    return battleCreatureInitIssue(facts.left.message);
  }
  const wildShapeFacts = facts.right;
  if (wildShapeFacts !== undefined && unit.id === wildShapeFacts.unitId) {
    const expended =
      resourceExpenditures.find(
        (expenditure) =>
          expenditure.tag === "useCountResource" &&
          expenditure.unitId === wildShapeFacts.unitId,
      )?.expended ?? resourceCount(0);
    if (expended > wildShapeFacts.useCount.maximum) {
      return battleCreatureInitIssue(
        "Druid Wild Shape expenditure exceeds its character resource cap.",
      );
    }
    return Either.right(
      Number(wildShapeFacts.useCount.maximum) - Number(expended),
    );
  }

  if (unitIsSupportedClassFeatureSpellFreeCastResource(unit)) {
    const profile =
      supportedClassFeatureSpellFreeCastGrantsForUnit(unit)?.profile;
    if (profile === undefined) {
      return Either.right(undefined);
    }
    const resource = characterBattleResourceForUnit(unit);
    if (resource.cap.kind !== "fixed") {
      return battleCreatureInitIssue(
        "Class feature spell free casts must use a fixed battle resource cap.",
      );
    }
    const expended =
      resourceExpenditures.find(
        (expenditure) => expenditure.tag === profile.resourceTag,
      )?.expended ?? 0;
    if (expended > resource.cap.uses) {
      return battleCreatureInitIssue(
        "Class feature spell free-cast expenditure exceeds its battle resource cap.",
      );
    }
    return Either.right(resource.cap.uses - expended);
  }
  const useCountExpenditure = resourceExpenditures.find(
    (expenditure) =>
      expenditure.tag === "useCountResource" && expenditure.unitId === unit.id,
  );
  if (useCountExpenditure === undefined) {
    return Either.right(undefined);
  }
  if (unit.kind !== "class_feature" && unit.kind !== "species_trait") {
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
