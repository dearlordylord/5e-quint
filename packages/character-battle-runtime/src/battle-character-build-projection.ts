// KERNEL-COVERAGE: runtime-owner CHARACTER.BATTLE.HANDOFF.INIT_PROJECTION
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.martial-arts-attack-projection spell.invocation-marked-damage-rider
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL_ACCESS.MAGIC_INITIATE_CASTING
// UNIT-PROFILE-COVERAGE: runtime-owner battle.spell-access-magic-initiate-casting
import {
  scoreModifier,
  type CharacterBattleSpellAccessInit,
  type CharacterBattleSpellListFact,
  type CharacterBattleSpellSlotState,
  type CharacterBattleSpellbookRitualSpellAccessInit,
  type CharacterBattleInvocationFeature,
  type CharacterBattleClassLevelInit,
  type CharacterBattleFeaturePreparedSpellInit,
  type CharacterBattleBookOfShadowsSpellAccessInit,
  type CharacterBattleBookOfShadowsPresence,
  type CharacterBattleInvocationSpellAccessInit,
  type CharacterUnarmedStrikeActionOption,
  type CharacterWeaponAttackActionOption,
  type CharacterWeaponAttackDamageTypeChoices,
  type BattleCreatureInit,
  type CharacterBattleLoadoutRef,
  type CharacterBattleCreatureInitWeaponAttack,
  martialArtsAttackProjectionProfileForUnit,
  passiveArmorClassBonusProfileForUnit,
  unitIsSupportedClassFeatureSpellFreeCastResource,
  admitCharacterWeaponExecutionWeapon,
  battleObjectId,
  characterBattleCreatureInitWeaponAttack,
} from "@dnd/battle-runtime";

import {
  characterBuildArmorTraining,
  characterCreationIssueMessage,
  characterBuildFeatureUnitIds,
  characterBuildSpellcastingSlotCapacity,
  parseCharacterBuildMagicInitiateSpellAccesses,
  classUnitIdToClassName,
  computeTotalLevel,
  characterEquipmentItemSourceFromId,
  eldritchInvocationId,
  type CharacterBuild,
  type CharacterBuildMagicInitiateSpellAccessIssue,
  type CharacterBuildProjectionCause,
  type CharacterBuildProjectionIssue,
  type CharacterBuildMagicInitiateSpellAccess,
  type CharacterEquipmentItemId,
  type CharacterBuildSpellcastingSource,
  type NonEmptyReadonlyArray,
} from "@dnd/character-creation-runtime";
import {
  characterSheetArmorClassState,
  characterSheetUnarmoredArmorClassBase,
  characterSheetSpellbookRitualAccessesForBuild,
  characterSheetSpellAccessesForBuild,
  type CharacterSheetArmorClassBaseChoice,
  type CharacterSheetResourceExpenditure,
} from "@dnd/character-sheet-runtime";
import {
  armorClassDelta,
  type ArmorClassBaseSource,
  type ArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import { isMonkWeapon } from "@dnd/shared-algebras/martial-arts-algebra";
import {
  abilityModifier as battleAbilityModifier,
  attackBonus as battleAttackBonus,
  characterLevel,
  classLevel,
  type AbilityModifier,
  proficiencyBonusForCharacterLevel,
  resourceCount,
  spellSlotLevel,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type {
  Ability,
  ClassName,
  DamageType,
  SpellRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { spellHasTopLevelRitualTag } from "@dnd/surface/surface/types";
import {
  allCantripsFromAnyClassSpellList,
  allLeveledSpellsFromAnyClassSpellList,
  classSpellListForSpellcastingClassRecord,
  spellcastingClassRecordForClassName,
} from "@dnd/surface/surface/unit-catalog";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import { Result, Match, Option } from "effect";
import { isReadonlyArrayNonEmpty } from "effect/Array";
import {
  classSpellChoiceIsRuntimeDetached,
  omitRuntimeDetachedClassSpellChoices,
  type ClassSpellChoiceKind,
} from "./class-spell-choice-projection.ts";

type CharacterBattleBuildProjectionPhase =
  | "derivedState"
  | "hitPoints"
  | "proficiencies"
  | "classLevels"
  | "supportProfiles"
  | "resources"
  | "spellcasting"
  | "species"
  | "armorClass"
  | "equipment"
  | "druidWildShape"
  | "metamagic";

type CharacterBattleBuildProjectionReasonFor<
  Cause extends CharacterBuildProjectionCause = CharacterBuildProjectionCause,
> = Cause extends CharacterBuildProjectionCause
  ? {
      readonly kind: "characterBuildProjection";
      readonly phase: CharacterBattleBuildProjectionPhase;
      readonly cause: Cause["tag"];
    } & Omit<Cause, "tag" | "reason"> &
      (Cause extends { readonly reason: infer CauseReason }
        ? { readonly causeReason: CauseReason }
        : Record<never, never>)
  : never;

export type CharacterBattleInitIssueReason =
  | {
      readonly kind: "characterBuildProjection";
      readonly phase: CharacterBattleBuildProjectionPhase;
    }
  | CharacterBattleBuildProjectionReasonFor
  | {
      readonly kind: "characterBattleInput";
      readonly field: "initiative" | "hitPointMaximum" | "currentHp";
      readonly constraint:
        | "integer"
        | "positive"
        | "notAboveBuildMaximum"
        | "notAboveMaximum";
    }
  | {
      readonly kind: "characterBattleInvariant";
      readonly invariant:
        | "characterOriginRequired"
        | "distinctResourceUnits"
        | "distinctFeatureUnits"
        | "distinctWeaponMasteries"
        | "loadoutMatchesArmorClass";
    }
  | {
      readonly kind: "characterBattleResourceProjection";
      readonly issueIndex: number;
    }
  | {
      readonly kind: "characterBattleSupportProjection";
      readonly issueIndex: number;
    }
  | {
      readonly kind: "characterBattleClassLevelsProjection";
      readonly issueIndex: number;
    }
  | {
      readonly kind: "characterBattleSpellProjection";
      readonly issueIndex: number;
    };

type CharacterBattleInitIssueFactFor<
  Reason extends CharacterBattleInitIssueReason =
    CharacterBattleInitIssueReason,
> = Reason extends CharacterBattleInitIssueReason
  ? Omit<Reason, "kind"> & { readonly reason: Reason["kind"] }
  : never;

export type CharacterBattleInitIssueFact = CharacterBattleInitIssueFactFor;

export function characterBattleInitIssueFactFields(
  reason: CharacterBattleInitIssueReason,
): CharacterBattleInitIssueFact {
  return Match.value(reason).pipe(
    Match.discriminatorsExhaustive("kind")({
      characterBuildProjection: (matched) => {
        const { kind, ...fields } = matched;
        return { ...fields, reason: kind };
      },
      characterBattleInput: ({ kind, field, constraint }) => ({
        reason: kind,
        field,
        constraint,
      }),
      characterBattleInvariant: ({ kind, invariant }) => ({
        reason: kind,
        invariant,
      }),
      characterBattleResourceProjection: ({ kind, issueIndex }) => ({
        reason: kind,
        issueIndex,
      }),
      characterBattleSupportProjection: ({ kind, issueIndex }) => ({
        reason: kind,
        issueIndex,
      }),
      characterBattleClassLevelsProjection: ({ kind, issueIndex }) => ({
        reason: kind,
        issueIndex,
      }),
      characterBattleSpellProjection: ({ kind, issueIndex }) => ({
        reason: kind,
        issueIndex,
      }),
    }),
  );
}

export function characterBattleInitIssueReasonFromFact(
  fact: CharacterBattleInitIssueFact,
): CharacterBattleInitIssueReason {
  return Match.value(fact).pipe(
    Match.discriminatorsExhaustive("reason")({
      characterBuildProjection: (matched) => {
        const { reason, ...fields } = matched;
        return { kind: reason, ...fields };
      },
      characterBattleInput: ({ reason, field, constraint }) => ({
        kind: reason,
        field,
        constraint,
      }),
      characterBattleInvariant: ({ reason, invariant }) => ({
        kind: reason,
        invariant,
      }),
      characterBattleResourceProjection: ({ reason, issueIndex }) => ({
        kind: reason,
        issueIndex,
      }),
      characterBattleSupportProjection: ({ reason, issueIndex }) => ({
        kind: reason,
        issueIndex,
      }),
      characterBattleClassLevelsProjection: ({ reason, issueIndex }) => ({
        kind: reason,
        issueIndex,
      }),
      characterBattleSpellProjection: ({ reason, issueIndex }) => ({
        kind: reason,
        issueIndex,
      }),
    }),
  );
}

export type BattleCreatureInitLeafIssue = {
  readonly tag: "battleCreatureInitIssue";
  readonly message: string;
} & CharacterBattleInitIssueFact;

type CharacterBattleSpellAccessProjectionIssueBase = {
  readonly tag: "characterBattleSpellAccessProjectionIssue";
  readonly message: string;
};

export type CharacterBattleSpellAccessProjectionIssue =
  | (CharacterBattleSpellAccessProjectionIssueBase & {
      readonly accessIndex: number;
      readonly featUnitId: UnitRecord["id"];
      readonly cause:
        | "missingSourceUnit"
        | "unsupportedSourceUnit"
        | "missingSpellListSource";
    })
  | (CharacterBattleSpellAccessProjectionIssueBase & {
      readonly accessIndex: number;
      readonly featUnitId: UnitRecord["id"];
      readonly cause: "invalidSpellSelection";
      readonly issueIndex: number;
    })
  | (CharacterBattleSpellAccessProjectionIssueBase & {
      readonly issueIndex: number;
      readonly cause: "invalidBuildSpellAccess";
    });

export type BattleCreatureInitIssueLeaf =
  | BattleCreatureInitLeafIssue
  | CharacterBattleSpellAccessProjectionIssue;

export type BattleCreatureInitIssue =
  | BattleCreatureInitIssueLeaf
  | {
      readonly tag: "battleCreatureInitIssues";
      /** Presentation-only summary; the independently checkable facts remain in `issues`. */
      readonly message: string;
      readonly issues: readonly [
        BattleCreatureInitIssueLeaf,
        BattleCreatureInitIssueLeaf,
        ...BattleCreatureInitIssueLeaf[],
      ];
    };

export function battleCreatureInitIssue(
  message: string,
  reason: CharacterBattleInitIssueReason = {
    kind: "characterBuildProjection",
    phase: "derivedState",
  },
): Result.Result<never, BattleCreatureInitLeafIssue> {
  return Result.fail({
    tag: "battleCreatureInitIssue",
    message,
    ...characterBattleInitIssueFactFields(reason),
  });
}

export function battleCreatureInitIssueFromCharacterBuildProjection(
  issue: CharacterBuildProjectionIssue,
  phase: CharacterBattleBuildProjectionPhase,
): BattleCreatureInitLeafIssue {
  const { tag: cause, ...causeFields } = issue.cause;
  const reason =
    issue.cause.tag === "invalidChoiceOption"
      ? {
          kind: "characterBuildProjection" as const,
          phase,
          cause,
          causeReason: issue.cause.reason,
          optionId: issue.cause.optionId,
        }
      : {
          kind: "characterBuildProjection" as const,
          phase,
          cause,
          ...causeFields,
        };
  return {
    tag: "battleCreatureInitIssue",
    message: characterCreationIssueMessage(issue),
    ...characterBattleInitIssueFactFields(reason),
  };
}

export function battleCreatureInitIssuesFromCharacterBuildProjection(
  issues: ReadonlyNonEmptyArray<CharacterBuildProjectionIssue>,
  phase: CharacterBattleBuildProjectionPhase,
): Result.Result<never, BattleCreatureInitIssue> {
  const [first, ...rest] = issues;
  return battleCreatureInitIssueFromLeaves([
    battleCreatureInitIssueFromCharacterBuildProjection(first, phase),
    ...rest.map((issue) =>
      battleCreatureInitIssueFromCharacterBuildProjection(issue, phase),
    ),
  ]);
}

export function battleCreatureInitIssues(
  first: BattleCreatureInitIssueLeaf,
  second: BattleCreatureInitIssueLeaf,
  ...rest: ReadonlyArray<BattleCreatureInitIssueLeaf>
): Result.Result<
  never,
  Extract<BattleCreatureInitIssue, { tag: "battleCreatureInitIssues" }>
> {
  return Result.fail({
    tag: "battleCreatureInitIssues",
    message: [first, second, ...rest]
      .map(battleCreatureInitIssueMessage)
      .join("; "),
    issues: [first, second, ...rest],
  });
}

export function battleCreatureInitIssueFromLeaves(
  issues: ReadonlyNonEmptyArray<BattleCreatureInitIssueLeaf>,
): Result.Result<never, BattleCreatureInitIssue> {
  const [first, second, ...rest] = issues;
  return second === undefined
    ? Result.fail(first)
    : battleCreatureInitIssues(first, second, ...rest);
}

export function battleCreatureInitIssuesFromMessages(
  messages: readonly string[],
  reasonForIndex: (index: number) => CharacterBattleInitIssueReason,
): Result.Result<never, BattleCreatureInitIssue> {
  const leaves = messages.map((message, index) => ({
    tag: "battleCreatureInitIssue" as const,
    message,
    ...characterBattleInitIssueFactFields(reasonForIndex(index)),
  }));
  if (!isReadonlyArrayNonEmpty(leaves)) {
    return battleCreatureInitIssue(
      "Character battle initialization produced no projection issue facts.",
      reasonForIndex(0),
    );
  }
  return battleCreatureInitIssueFromLeaves(leaves);
}

export function battleCreatureInitIssueLeaves(
  issue: BattleCreatureInitIssue,
): ReadonlyNonEmptyArray<BattleCreatureInitIssueLeaf> {
  if (issue.tag !== "battleCreatureInitIssues") return [issue];
  const [firstIssue, ...restIssues] = issue.issues;
  const firstLeaves = battleCreatureInitIssueLeaves(firstIssue);
  return [...firstLeaves, ...restIssues.flatMap(battleCreatureInitIssueLeaves)];
}

export function battleCreatureInitIssueMessage(
  issue: BattleCreatureInitIssue,
): string {
  return issue.tag === "battleCreatureInitIssues"
    ? issue.issues.map(battleCreatureInitIssueMessage).join("; ")
    : issue.message;
}

export function characterArmorClassState(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly baseChoice?: CharacterSheetArmorClassBaseChoice;
}): Result.Result<ArmorClassState, BattleCreatureInitIssue> {
  const state = characterSheetArmorClassState(input);
  if (Result.isFailure(state))
    return battleCreatureInitIssue(state.failure.message);
  const bonuses = [...state.success.bonuses];
  for (const featureUnitId of characterBuildFeatureUnitIds(
    input.build,
    input.unitLibrary,
  )) {
    const unit = getRequiredUnit(input.unitLibrary, featureUnitId);
    if (Result.isFailure(unit)) {
      return battleCreatureInitIssue(
        battleCreatureInitIssueMessage(unit.failure),
      );
    }
    bonuses.push(...armorDefenseBonus(unit.success));
  }
  return Result.succeed({ ...state.success, bonuses });
}

export function characterUnarmoredArmorClassBases(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly shieldedBaseChoice?: CharacterSheetArmorClassBaseChoice;
  readonly unshieldedBaseChoice?: CharacterSheetArmorClassBaseChoice;
}): Result.Result<
  {
    readonly shielded: Extract<
      ArmorClassBaseSource,
      { readonly kind: "ability_sum" }
    >;
    readonly unshielded: Extract<
      ArmorClassBaseSource,
      { readonly kind: "ability_sum" }
    >;
  },
  BattleCreatureInitIssue
> {
  const shielded = characterSheetUnarmoredArmorClassBase({
    build: input.build,
    unitLibrary: input.unitLibrary,
    ...(input.shieldedBaseChoice === undefined
      ? {}
      : { baseChoice: input.shieldedBaseChoice }),
    wieldingShield: true,
  });
  if (Result.isFailure(shielded)) {
    return battleCreatureInitIssue(shielded.failure.message);
  }
  const unshielded = characterSheetUnarmoredArmorClassBase({
    build: input.build,
    unitLibrary: input.unitLibrary,
    ...(input.unshieldedBaseChoice === undefined
      ? {}
      : { baseChoice: input.unshieldedBaseChoice }),
    wieldingShield: false,
  });
  return Result.isFailure(unshielded)
    ? battleCreatureInitIssue(unshielded.failure.message)
    : Result.succeed({
        shielded: shielded.success,
        unshielded: unshielded.success,
      });
}

function armorDefenseBonus(
  unit: Parameters<typeof passiveArmorClassBonusProfileForUnit>[0],
): ArmorClassState["bonuses"] {
  const profile = passiveArmorClassBonusProfileForUnit(unit);
  return profile === null
    ? []
    : [
        {
          kind: "wearing_armor",
          bonus: armorClassDelta(profile.bonus),
          categories: profile.condition.categories,
          sourceUnitId: unit.id,
        },
      ];
}

export function characterAttackActionOption(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  classLevels: readonly CharacterBattleClassLevelInit[] = [],
  pactBladeBondedWeaponItemId?: CharacterEquipmentItemId,
): Result.Result<
  CharacterBattleCreatureInitWeaponAttack | null,
  BattleCreatureInitIssue
> {
  const loadoutWeapon = build.equipment.loadout.weapon;
  if (loadoutWeapon === undefined) {
    return Result.succeed(null);
  }
  const selectedWeapon = characterEquipmentItemSourceFromId(
    loadoutWeapon.itemId,
  ).unitId;
  const selectedWeaponItemId = loadoutWeapon.itemId;

  return characterWeaponAttackActionOption(
    selectedWeapon,
    selectedWeaponItemId,
    build,
    unitLibrary,
    classLevels,
    pactBladeBondedWeaponItemId,
  );
}

export function characterOffHandAttackActionOption(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  classLevels: readonly CharacterBattleClassLevelInit[] = [],
  pactBladeBondedWeaponItemId?: CharacterEquipmentItemId,
): Result.Result<
  CharacterBattleCreatureInitWeaponAttack | undefined,
  BattleCreatureInitIssue
> {
  const loadoutWeapon = build.equipment.loadout.offHandWeapon;
  if (loadoutWeapon === undefined) {
    return Result.succeed(undefined);
  }
  const selectedWeapon = characterEquipmentItemSourceFromId(
    loadoutWeapon.itemId,
  ).unitId;
  const selectedWeaponItemId = loadoutWeapon.itemId;

  const option = characterWeaponAttackActionOption(
    selectedWeapon,
    selectedWeaponItemId,
    build,
    unitLibrary,
    classLevels,
    pactBladeBondedWeaponItemId,
  );
  if (Result.isFailure(option)) {
    return battleCreatureInitIssue(
      battleCreatureInitIssueMessage(option.failure),
    );
  }
  return option.success === null
    ? battleCreatureInitIssue(
        "Off-hand weapon loadout must reference a Weapon Unit.",
      )
    : Result.succeed(option.success);
}

export function characterBattleLoadoutFromBuild(
  build: CharacterBuild,
): CharacterBattleLoadoutRef {
  const armorUnitId = characterBuildEquipmentItemUnitId(
    build.equipment.loadout.armor,
  );
  const shieldUnitId = characterBuildEquipmentItemUnitId(
    build.equipment.loadout.shield,
  );
  const weaponUnitId = characterBuildEquipmentItemUnitId(
    build.equipment.loadout.weapon?.itemId,
  );
  const offHandWeaponUnitId = characterBuildEquipmentItemUnitId(
    build.equipment.loadout.offHandWeapon?.itemId,
  );
  const loadout = build.equipment.loadout;

  return {
    ...(loadout.armor == null || armorUnitId == null
      ? {}
      : {
          armor: { itemId: battleObjectId(loadout.armor), unitId: armorUnitId },
        }),
    ...(loadout.shield == null || shieldUnitId == null
      ? {}
      : {
          shield: {
            itemId: battleObjectId(loadout.shield),
            unitId: shieldUnitId,
          },
        }),
    ...(loadout.weapon == null || weaponUnitId == null
      ? {}
      : {
          weapon: {
            itemId: battleObjectId(loadout.weapon.itemId),
            unitId: weaponUnitId,
            grip: loadout.weapon.grip,
          },
        }),
    ...(loadout.offHandWeapon == null || offHandWeaponUnitId == null
      ? {}
      : {
          offHandWeapon: {
            itemId: battleObjectId(loadout.offHandWeapon.itemId),
            unitId: offHandWeaponUnitId,
          },
        }),
  };
}

function characterBuildEquipmentItemUnitId(
  itemId:
    | NonNullable<CharacterBuild["equipment"]["loadout"]["armor"]>
    | NonNullable<CharacterBuild["equipment"]["loadout"]["shield"]>
    | NonNullable<CharacterBuild["equipment"]["loadout"]["weapon"]>["itemId"]
    | NonNullable<
        CharacterBuild["equipment"]["loadout"]["offHandWeapon"]
      >["itemId"]
    | undefined,
): UnitRecord["id"] | undefined {
  if (itemId == null) {
    return undefined;
  }

  return characterEquipmentItemSourceFromId(itemId).unitId;
}

export function characterPactBladeBondedWeaponItemId(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly itemId:
    | NonNullable<CharacterBuild["equipment"]["loadout"]["weapon"]>["itemId"]
    | NonNullable<
        CharacterBuild["equipment"]["loadout"]["offHandWeapon"]
      >["itemId"]
    | undefined;
}): Result.Result<
  | NonNullable<CharacterBuild["equipment"]["loadout"]["weapon"]>["itemId"]
  | NonNullable<
      CharacterBuild["equipment"]["loadout"]["offHandWeapon"]
    >["itemId"]
  | undefined,
  BattleCreatureInitIssue
> {
  if (input.itemId === undefined) {
    return Result.succeed(undefined);
  }
  if (!hasPactOfTheBlade(input.build)) {
    return battleCreatureInitIssue(
      "Pact of the Blade bond requires selected pact_of_the_blade invocation ownership.",
    );
  }
  const loadoutItemIds = [
    input.build.equipment.loadout.weapon?.itemId,
    input.build.equipment.loadout.offHandWeapon?.itemId,
  ];
  if (!loadoutItemIds.some((itemId) => itemId === input.itemId)) {
    return battleCreatureInitIssue(
      "Pact of the Blade bond must reference a wielded loadout weapon.",
    );
  }
  if (
    !input.build.equipment.owned.some(
      (item) =>
        (item.kind === "catalogItem" || item.kind === "authoredCatalogItem") &&
        item.itemId === input.itemId,
    )
  ) {
    return battleCreatureInitIssue(
      "Pact of the Blade bond must reference owned equipment.",
    );
  }
  const weaponUnitId = characterEquipmentItemSourceFromId(input.itemId).unitId;
  const unit = getRequiredUnit(input.unitLibrary, weaponUnitId);
  if (Result.isFailure(unit)) {
    return battleCreatureInitIssue(
      battleCreatureInitIssueMessage(unit.failure),
    );
  }
  if (
    unit.success.kind !== "weapon" ||
    unit.success.usage !== "melee" ||
    (unit.success.category !== "simple" &&
      unit.success.category !== "martial") ||
    unit.success.damage.kind !== "dice"
  ) {
    return battleCreatureInitIssue(
      "Pact of the Blade bond must reference a Simple or Martial Melee weapon with dice damage.",
    );
  }
  return Result.succeed(input.itemId);
}

function characterWeaponAttackActionOption(
  unitId: UnitRecord["id"],
  itemId: CharacterEquipmentItemId,
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
  classLevels: readonly CharacterBattleClassLevelInit[],
  pactBladeBondedWeaponItemId: CharacterEquipmentItemId | undefined,
): Result.Result<
  CharacterBattleCreatureInitWeaponAttack | null,
  BattleCreatureInitIssue
> {
  const unit = getRequiredUnit(unitLibrary, unitId);
  if (Result.isFailure(unit)) {
    return battleCreatureInitIssue(
      battleCreatureInitIssueMessage(unit.failure),
    );
  }
  if (unit.success.kind !== "weapon" || unit.success.damage.kind !== "dice") {
    return Result.succeed(null);
  }

  const baseAttack = {
    ...characterBattleCreatureInitWeaponAttack({
      kind: "weapon",
      weapon: admitCharacterWeaponExecutionWeapon(unit.success),
      ability: "str",
      abilityModifier: battleAbilityModifier(
        scoreModifier(build.abilityScores.str),
      ),
    }),
    ability: "str",
  } as const satisfies PhysicalAbilityWeaponAttack;
  const martialArts = martialArtsAttackProjectionForBuild({
    build,
    unitLibrary,
    classLevels,
  });
  if (Result.isFailure(martialArts)) {
    return battleCreatureInitIssue(
      battleCreatureInitIssueMessage(martialArts.failure),
    );
  }
  const projectedAttack =
    martialArts.success === null || !isMonkWeapon(unit.success)
      ? baseAttack
      : martialArtsWeaponAttack(baseAttack, build, martialArts.success);
  return Result.succeed(
    pactBladeWeaponAttack(
      projectedAttack,
      build,
      itemId,
      pactBladeBondedWeaponItemId,
    ),
  );
}

export function characterBaseUnarmedStrikeActionOption(
  build: CharacterBuild,
  unitLibrary?: UnitCatalog,
  classLevels: readonly CharacterBattleClassLevelInit[] = [],
): Result.Result<CharacterUnarmedStrikeActionOption, BattleCreatureInitIssue> {
  const strengthModifier = battleAbilityModifier(
    scoreModifier(build.abilityScores.str),
  );
  const buildProficiencyBonus = proficiencyBonusForCharacterLevel(
    characterBuildLevel(build),
  );
  const baseAttack = {
    kind: "unarmedStrike",
    effect: {
      kind: "damage",
      damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
    },
    attackAbility: "str",
    attackAbilityModifier: strengthModifier,
    attackBonus: battleAttackBonus(
      Number(strengthModifier) + Number(buildProficiencyBonus),
    ),
    damageAbilityModifier: strengthModifier,
  } as const satisfies CharacterUnarmedStrikeActionOption;
  if (unitLibrary === undefined) return Result.succeed(baseAttack);
  const martialArts = martialArtsAttackProjectionForBuild({
    build,
    unitLibrary,
    classLevels,
  });
  if (Result.isFailure(martialArts)) {
    return battleCreatureInitIssue(
      battleCreatureInitIssueMessage(martialArts.failure),
    );
  }
  return Result.succeed(
    martialArts.success === null
      ? baseAttack
      : martialArtsUnarmedStrike(baseAttack, build, martialArts.success),
  );
}

type MartialArtsAttackProjection = NonNullable<
  ReturnType<typeof martialArtsAttackProjectionProfileForUnit>
>;

const PACT_OF_THE_BLADE_INVOCATION_ID =
  eldritchInvocationId("pact_of_the_blade");
const ARMOR_OF_SHADOWS_INVOCATION_ID = eldritchInvocationId("armor_of_shadows");
const PACT_OF_THE_CHAIN_INVOCATION_ID =
  eldritchInvocationId("pact_of_the_chain");
const PACT_OF_THE_TOME_INVOCATION_ID = eldritchInvocationId("pact_of_the_tome");
const ELDRITCH_MIND_INVOCATION_ID = eldritchInvocationId("eldritch_mind");
// Armor of Shadows and Mage Armor are distinct authored records. The canonical
// invocation explicitly references that spell; this transitional constant
// preserves the authored cross-reference rather than equating their identities
// or selecting runtime mechanics. Move ownership to authored data in #219.
const ARMOR_OF_SHADOWS_SPELL_ID = "mage_armor";
const PACT_OF_THE_CHAIN_SPELL_ID = "find_familiar";
const PACT_OF_THE_BLADE_ADDITIONAL_DAMAGE_TYPE_CHOICES = [
  "necrotic",
  "psychic",
  "radiant",
] as const satisfies ReadonlyArray<DamageType>;

type PhysicalAbilityWeaponAttack = CharacterBattleCreatureInitWeaponAttack & {
  readonly ability: "str" | "dex";
};

function pactBladeDamageTypeChoices(
  weaponDamageType: DamageType,
): CharacterWeaponAttackDamageTypeChoices {
  if (weaponDamageType === "necrotic") {
    return [weaponDamageType, "psychic", "radiant"];
  }
  if (weaponDamageType === "psychic") {
    return [weaponDamageType, "necrotic", "radiant"];
  }
  if (weaponDamageType === "radiant") {
    return [weaponDamageType, "necrotic", "psychic"];
  }
  return [
    weaponDamageType,
    ...PACT_OF_THE_BLADE_ADDITIONAL_DAMAGE_TYPE_CHOICES,
  ];
}

function pactBladeWeaponAttack(
  attack: PhysicalAbilityWeaponAttack,
  build: CharacterBuild,
  itemId: CharacterEquipmentItemId,
  pactBladeBondedWeaponItemId: CharacterEquipmentItemId | undefined,
): CharacterBattleCreatureInitWeaponAttack {
  if (
    pactBladeBondedWeaponItemId !== itemId ||
    attack.weapon.usage !== "melee" ||
    attack.weapon.damage.kind !== "dice" ||
    (attack.weapon.category !== "simple" &&
      attack.weapon.category !== "martial") ||
    !hasPactOfTheBlade(build)
  ) {
    return attack;
  }

  const charismaModifier = battleAbilityModifier(
    scoreModifier(build.abilityScores.cha),
  );
  const characterProficiency = proficiencyBonusForCharacterLevel(
    characterBuildLevel(build),
  );
  const charismaAttack = {
    ability: "cha" as const,
    abilityModifier: charismaModifier,
    attackBonus: battleAttackBonus(
      Number(charismaModifier) + Number(characterProficiency),
    ),
    damageAbilityModifier: charismaModifier,
  };
  return {
    ...attack,
    attackBonus: battleAttackBonus(
      Number(attack.abilityModifier) + Number(characterProficiency),
    ),
    damageAbilityModifier: attack.abilityModifier,
    alternateAbilityChoices: [charismaAttack],
    damageTypeChoices: pactBladeDamageTypeChoices(
      attack.weapon.damage.damageType,
    ),
  };
}

function hasPactOfTheBlade(build: CharacterBuild): boolean {
  return hasSelectedEldritchInvocation(build, PACT_OF_THE_BLADE_INVOCATION_ID);
}

export function characterInvocationFeatures(
  build: CharacterBuild,
): readonly CharacterBattleInvocationFeature[] {
  return hasSelectedEldritchInvocation(build, ELDRITCH_MIND_INVOCATION_ID)
    ? [{ tag: "eldritchMind" }]
    : [];
}

function hasSelectedEldritchInvocation(
  build: CharacterBuild,
  invocationId: ReturnType<typeof eldritchInvocationId>,
): boolean {
  return build.features.some(
    (feature) =>
      feature.kind === "selectedEldritchInvocation" &&
      feature.selection.invocationId === invocationId,
  );
}

function hasSelectedWarlockEldritchInvocation(
  build: CharacterBuild,
  input: {
    readonly unitLibrary: UnitCatalog;
    readonly invocationId: ReturnType<typeof eldritchInvocationId>;
  },
): boolean {
  return build.features.some((feature) => {
    if (
      feature.kind !== "selectedEldritchInvocation" ||
      feature.selection.invocationId !== input.invocationId
    ) {
      return false;
    }
    const source = input.unitLibrary.getUnit(feature.selectedFromUnitId);
    if (Option.isNone(source) || source.value.kind !== "class_feature") {
      return false;
    }
    const mechanics = source.value.mechanics;
    return (
      mechanics.family === "feature_choice" &&
      mechanics.optionSource.kind === "class_feature_options" &&
      mechanics.optionSource.className === "warlock" &&
      mechanics.optionSource.optionKind === "eldritch_invocation"
    );
  });
}

function martialArtsAttackProjectionForBuild(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly classLevels: readonly CharacterBattleClassLevelInit[];
}): Result.Result<MartialArtsAttackProjection | null, BattleCreatureInitIssue> {
  if (!martialArtsLoadoutConditionHolds(input)) {
    return Result.succeed(null);
  }
  const classLevels = input.classLevels.map((entry) => ({
    className: entry.className,
    level: classLevel(entry.level),
  }));
  for (const featureUnitId of characterBuildFeatureUnitIds(
    input.build,
    input.unitLibrary,
  )) {
    const unit = getRequiredUnit(input.unitLibrary, featureUnitId);
    if (Result.isFailure(unit)) {
      return battleCreatureInitIssue(
        battleCreatureInitIssueMessage(unit.failure),
      );
    }
    const profile = martialArtsAttackProjectionProfileForUnit(
      unit.success,
      classLevels,
    );
    if (profile !== null) {
      return Result.succeed(profile);
    }
  }
  return Result.succeed(null);
}

function martialArtsLoadoutConditionHolds(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): boolean {
  const loadout = input.build.equipment.loadout;
  if (loadout.armor !== undefined || loadout.shield !== undefined) {
    return false;
  }
  const weaponUnitIds = [
    characterBuildEquipmentItemUnitId(loadout.weapon?.itemId),
    characterBuildEquipmentItemUnitId(loadout.offHandWeapon?.itemId),
  ].filter((unitId): unitId is UnitRecord["id"] => unitId !== undefined);
  return weaponUnitIds.every((unitId) => {
    const unit = input.unitLibrary.getUnit(unitId);
    return Option.isSome(unit) && unit.value.kind === "weapon"
      ? isMonkWeapon(unit.value)
      : false;
  });
}

function martialArtsWeaponAttack(
  attack: PhysicalAbilityWeaponAttack,
  build: CharacterBuild,
  projection: MartialArtsAttackProjection,
): PhysicalAbilityWeaponAttack {
  const chosen = martialArtsChosenAbility(
    build,
    attack.ability,
    attack.abilityModifier,
  );
  return {
    ...attack,
    weapon: weaponWithMartialArtsDamage(attack.weapon, projection),
    ability: chosen.ability,
    abilityModifier: chosen.modifier,
    damageAbilityModifier: chosen.modifier,
  };
}

function martialArtsUnarmedStrike(
  attack: CharacterUnarmedStrikeActionOption & {
    readonly attackAbility: Ability;
  },
  build: CharacterBuild,
  projection: MartialArtsAttackProjection,
): CharacterUnarmedStrikeActionOption {
  const chosen = martialArtsChosenAbility(
    build,
    attack.attackAbility,
    attack.attackAbilityModifier,
  );
  const proficiency = proficiencyBonusForCharacterLevel(
    characterBuildLevel(build),
  );
  const damageReplacement = projection.martialArts.damageReplacement;
  const effect = {
    kind: "damage" as const,
    damage: {
      kind: "mechanicalReplacement" as const,
      dice: damageReplacement.dice,
      dieSize: damageReplacement.dieSize,
      damageType: "bludgeoning" as const,
    },
  };
  return {
    ...attack,
    effect,
    attackAbility: chosen.ability,
    attackAbilityModifier: chosen.modifier,
    attackBonus: battleAttackBonus(
      Number(chosen.modifier) + Number(proficiency),
    ),
    damageAbilityModifier: chosen.modifier,
  };
}

function martialArtsChosenAbility<FallbackAbility extends Ability>(
  build: CharacterBuild,
  fallbackAbility: FallbackAbility,
  fallbackModifier: AbilityModifier,
): {
  readonly ability: "dex" | FallbackAbility;
  readonly modifier: AbilityModifier;
} {
  const dexModifier = battleAbilityModifier(
    scoreModifier(build.abilityScores.dex),
  );
  return dexModifier >= fallbackModifier
    ? { ability: "dex", modifier: dexModifier }
    : { ability: fallbackAbility, modifier: fallbackModifier };
}

function weaponWithMartialArtsDamage(
  weapon: CharacterWeaponAttackActionOption["weapon"],
  projection: MartialArtsAttackProjection,
): CharacterWeaponAttackActionOption["weapon"] {
  const damageReplacement = projection.martialArts.damageReplacement;
  if (
    weapon.damage.kind !== "dice" ||
    weapon.damage.dice !== 1 ||
    weapon.damage.dieSize >= damageReplacement.dieSize
  ) {
    return weapon;
  }
  return {
    ...weapon,
    damage: {
      ...weapon.damage,
      dice: damageReplacement.dice,
      dieSize: damageReplacement.dieSize,
    },
  };
}

function spellcastingAllowedByArmorTraining(
  build: CharacterBuild,
  unitLibrary: UnitCatalog,
): Result.Result<boolean, BattleCreatureInitIssue> {
  const armor =
    build.equipment.loadout.armor == null
      ? undefined
      : getRequiredUnit(
          unitLibrary,
          characterEquipmentItemSourceFromId(build.equipment.loadout.armor)
            .unitId,
        );
  if (armor !== undefined && Result.isFailure(armor)) {
    return battleCreatureInitIssue(
      battleCreatureInitIssueMessage(armor.failure),
    );
  }
  const armorTraining = characterBuildArmorTraining(build, unitLibrary);
  if (Result.isFailure(armorTraining)) {
    return battleCreatureInitIssuesFromMessages(
      armorTraining.failure.map(characterCreationIssueMessage),
      () => ({
        kind: "characterBuildProjection",
        phase: "proficiencies",
      }),
    );
  }
  return Result.succeed(
    armor?.success.kind !== "armor" ||
      armorTraining.success.includes(armor.success.category),
  );
}

function parseCharacterBattleMagicInitiateSpellAccesses(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<
  readonly CharacterBuildMagicInitiateSpellAccess[],
  BattleCreatureInitIssue
> {
  const parsed = parseCharacterBuildMagicInitiateSpellAccesses({
    value: input.build.magicInitiateSpellAccesses,
    build: input.build,
    unitLibrary: input.unitLibrary,
  });
  if (Result.isSuccess(parsed)) return Result.succeed(parsed.success);
  const spellAccessIssues = characterBattleSpellAccessProjectionIssues(
    parsed.failure,
    input.build,
  );
  return isReadonlyArrayNonEmpty(spellAccessIssues)
    ? battleCreatureInitIssueFromLeaves(spellAccessIssues)
    : battleCreatureInitIssue(
        "Character Battle Spell Access projection contains invalid selections.",
        { kind: "characterBuildProjection", phase: "spellcasting" },
      );
}

function projectCharacterBattleMagicInitiateSpellAccessesForCasting(input: {
  readonly build: CharacterBuild;
  readonly accesses: readonly CharacterBuildMagicInitiateSpellAccess[];
  readonly unitLibrary: UnitCatalog;
}): Result.Result<
  readonly CharacterBattleSpellAccessInit[],
  BattleCreatureInitIssue
> {
  const projected = projectCharacterBattleMagicInitiateSpellAccesses(input);
  if (Result.isSuccess(projected)) return Result.succeed(projected.success);
  return isReadonlyArrayNonEmpty(projected.failure)
    ? battleCreatureInitIssueFromLeaves(projected.failure)
    : battleCreatureInitIssue(
        "Character Battle Spell Access projection contains invalid selections.",
        { kind: "characterBuildProjection", phase: "spellcasting" },
      );
}

export function characterSpellcasting(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly bookOfShadowsPresence?: CharacterBattleBookOfShadowsPresence;
  readonly spellSlots?: readonly CharacterBattleSpellSlotState[];
  readonly resourceExpenditures: readonly CharacterSheetResourceExpenditure[];
}): Result.Result<
  NonNullable<
    Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["spellcasting"]
  >,
  BattleCreatureInitIssue
> {
  const { build, unitLibrary } = input;
  const parsedMagicInitiateSpellAccesses =
    parseCharacterBattleMagicInitiateSpellAccesses({ build, unitLibrary });
  if (Result.isFailure(parsedMagicInitiateSpellAccesses)) {
    return Result.fail(parsedMagicInitiateSpellAccesses.failure);
  }
  const spellcasting = build.spellcasting;
  const canCastSpells = characterBattleSpellcastingCanCast(input);
  if (Result.isFailure(canCastSpells)) {
    return battleCreatureInitIssue(
      battleCreatureInitIssueMessage(canCastSpells.failure),
    );
  }
  const sources =
    spellcasting === undefined
      ? Result.succeed(null)
      : spellcastingSourcesWithOneAbilityAndClass({
          unitLibrary,
          sources: spellcasting.sources,
        });
  if (Result.isFailure(sources)) {
    return battleCreatureInitIssue(
      battleCreatureInitIssueMessage(sources.failure),
    );
  }
  const spellRecords = characterBattleSpellRecordsForSources({
    sources: sources.success,
    unitLibrary,
  });
  if (Result.isFailure(spellRecords)) {
    return Result.fail(spellRecords.failure);
  }
  const projectedMagicInitiateSpellAccesses =
    projectCharacterBattleMagicInitiateSpellAccessesForCasting({
      build,
      accesses: parsedMagicInitiateSpellAccesses.success,
      unitLibrary,
    });
  if (Result.isFailure(projectedMagicInitiateSpellAccesses)) {
    return Result.fail(projectedMagicInitiateSpellAccesses.failure);
  }
  const projectedSpellAccesses = projectedMagicInitiateSpellAccesses.success;
  const additionalSpellAccesses = characterBattleAdditionalSpellAccesses({
    build,
    spellcastingSources: spellcasting?.sources ?? [],
    unitLibrary,
    bookOfShadowsPresence: input.bookOfShadowsPresence,
  });
  if (Result.isFailure(additionalSpellAccesses)) {
    return Result.fail(additionalSpellAccesses.failure);
  }

  const spellSlots =
    input.spellSlots ??
    characterBuildSpellcastingSlotCapacity(build).map((slot) => ({
      spellLevel: spellSlotLevel(slot.spellLevel),
      count: resourceCount(slot.count),
      expended: resourceCount(0),
    }));

  return Result.succeed({
    spellcastingSource:
      sources.success === null
        ? { tag: "spellAccessOnly" }
        : {
            tag: "classSpellcasting",
            className: sources.success.sourceClassName,
            abilityModifier: battleAbilityModifier(
              scoreModifier(
                build.abilityScores[sources.success.spellcastingAbility],
              ),
            ),
          },
    proficiencyBonus: proficiencyBonusForCharacterLevel(
      characterBuildLevel(build),
    ),
    canCastSpells: canCastSpells.success,
    cantrips: spellRecords.success.cantrips,
    preparedSpells: spellRecords.success.preparedSpells,
    featurePreparedSpells:
      additionalSpellAccesses.success.featurePreparedSpells,
    spellAccesses: projectedSpellAccesses,
    spellbookRitualSpellAccesses:
      additionalSpellAccesses.success.spellbookRitualSpellAccesses,
    bookOfShadowsSpellAccesses:
      additionalSpellAccesses.success.bookOfShadowsSpellAccesses,
    invocationSpellAccesses:
      additionalSpellAccesses.success.invocationSpellAccesses,
    spellSlots: spellSlots.map((slot) => ({
      spellLevel: slot.spellLevel,
      count: slot.count,
    })),
    spellSlotExpenditures: spellSlots.map((slot) => ({
      spellLevel: slot.spellLevel,
      expended: slot.expended,
    })),
  });
}

function characterBattleSpellcastingCanCast(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<boolean, BattleCreatureInitIssue> {
  const sheetSpellAccesses = characterSheetSpellAccessesForBuild({
    build: input.build,
    unitLibrary: input.unitLibrary,
  }).filter((access) => access.source === "magicInitiate");
  if (
    input.build.spellcasting === undefined &&
    sheetSpellAccesses.length === 0
  ) {
    return battleCreatureInitIssue(
      "Character build does not have spellcasting.",
    );
  }
  return spellcastingAllowedByArmorTraining(input.build, input.unitLibrary);
}

type CharacterBattleSpellcastingSources = {
  readonly spellcastingAbility: CharacterBuildSpellcastingSource["spellcastingAbility"];
  readonly sourceClassName: ClassName;
  readonly sources: readonly CharacterBuildSpellcastingSource[];
};

function characterBattleSpellRecordsForSources(input: {
  readonly sources: CharacterBattleSpellcastingSources | null;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<
  {
    readonly cantrips: readonly SpellRecord[];
    readonly preparedSpells: readonly SpellRecord[];
  },
  BattleCreatureInitIssue
> {
  const cantrips =
    input.sources === null
      ? Result.succeed([] as readonly SpellRecord[])
      : battleProjectedSpellRecordsForIds({
          unitLibrary: input.unitLibrary,
          sourceClassName: input.sources.sourceClassName,
          spellIds: input.sources.sources.flatMap((source) => source.cantrips),
          selectionKind: "cantrip",
        });
  const preparedSpells =
    input.sources === null
      ? Result.succeed([] as readonly SpellRecord[])
      : battleProjectedSpellRecordsForIds({
          unitLibrary: input.unitLibrary,
          sourceClassName: input.sources.sourceClassName,
          spellIds: input.sources.sources.flatMap(
            (source) => source.preparedSpells,
          ),
          selectionKind: "leveledSpell",
        });
  const issues = [cantrips, preparedSpells].flatMap((projection) =>
    Result.isFailure(projection)
      ? [battleCreatureInitIssueMessage(projection.failure)]
      : [],
  );
  return Result.isFailure(cantrips) || Result.isFailure(preparedSpells)
    ? isReadonlyArrayNonEmpty(issues)
      ? battleCreatureInitIssuesFromMessages(issues, () => ({
          kind: "characterBuildProjection",
          phase: "spellcasting",
        }))
      : battleCreatureInitIssue(
          "Character battle spell records projection failed.",
          { kind: "characterBuildProjection", phase: "spellcasting" },
        )
    : Result.succeed({
        cantrips: cantrips.success,
        preparedSpells: preparedSpells.success,
      });
}

function characterBattleAdditionalSpellAccesses(input: {
  readonly build: CharacterBuild;
  readonly spellcastingSources: ReadonlyArray<
    NonNullable<CharacterBuild["spellcasting"]>["sources"][number]
  >;
  readonly unitLibrary: UnitCatalog;
  readonly bookOfShadowsPresence?:
    | CharacterBattleBookOfShadowsPresence
    | undefined;
}): Result.Result<
  {
    readonly featurePreparedSpells: readonly CharacterBattleFeaturePreparedSpellInit[];
    readonly invocationSpellAccesses: readonly CharacterBattleInvocationSpellAccessInit[];
    readonly spellbookRitualSpellAccesses: readonly CharacterBattleSpellbookRitualSpellAccessInit[];
    readonly bookOfShadowsSpellAccesses: readonly CharacterBattleBookOfShadowsSpellAccessInit[];
  },
  BattleCreatureInitIssue
> {
  const featurePreparedSpells = featurePreparedSpellAccess({
    build: input.build,
    unitLibrary: input.unitLibrary,
  });
  if (Result.isFailure(featurePreparedSpells)) {
    return Result.fail(featurePreparedSpells.failure);
  }
  const invocationSpellAccesses = invocationSpellAccess({
    build: input.build,
    unitLibrary: input.unitLibrary,
  });
  if (Result.isFailure(invocationSpellAccesses)) {
    return Result.fail(invocationSpellAccesses.failure);
  }
  const spellbookRitualSpellAccesses = spellbookRitualSpellAccess({
    build: input.build,
    unitLibrary: input.unitLibrary,
  });
  if (Result.isFailure(spellbookRitualSpellAccesses)) {
    return Result.fail(spellbookRitualSpellAccesses.failure);
  }
  const bookOfShadowsSpellAccesses = bookOfShadowsSpellAccess({
    build: input.build,
    spellcastingSources: input.spellcastingSources,
    unitLibrary: input.unitLibrary,
    featurePreparedSpells: featurePreparedSpells.success,
    ...(input.bookOfShadowsPresence === undefined
      ? {}
      : { bookOfShadowsPresence: input.bookOfShadowsPresence }),
  });
  if (Result.isFailure(bookOfShadowsSpellAccesses)) {
    return Result.fail(bookOfShadowsSpellAccesses.failure);
  }
  return Result.succeed({
    featurePreparedSpells: featurePreparedSpells.success,
    invocationSpellAccesses: invocationSpellAccesses.success,
    spellbookRitualSpellAccesses: spellbookRitualSpellAccesses.success,
    bookOfShadowsSpellAccesses: bookOfShadowsSpellAccesses.success,
  });
}

function characterBattleSpellAccessProjectionIssues(
  issues: readonly CharacterBuildMagicInitiateSpellAccessIssue[],
  build: CharacterBuild,
): readonly CharacterBattleSpellAccessProjectionIssue[] {
  return issues.map((issue, issueIndex) => {
    const accessIndex = issue.index;
    const access =
      accessIndex === undefined
        ? undefined
        : build.magicInitiateSpellAccesses[accessIndex];
    return access === undefined || accessIndex === undefined
      ? {
          tag: "characterBattleSpellAccessProjectionIssue",
          issueIndex,
          cause: "invalidBuildSpellAccess",
          message: issue.message,
        }
      : {
          tag: "characterBattleSpellAccessProjectionIssue",
          accessIndex,
          featUnitId: access.featUnitId,
          cause: "invalidSpellSelection",
          issueIndex,
          message: issue.message,
        };
  });
}

function projectCharacterBattleMagicInitiateSpellAccesses(input: {
  readonly build: CharacterBuild;
  readonly accesses: readonly CharacterBuild["magicInitiateSpellAccesses"][number][];
  readonly unitLibrary: UnitCatalog;
}): Result.Result<
  readonly CharacterBattleSpellAccessInit[],
  readonly CharacterBattleSpellAccessProjectionIssue[]
> {
  const projected: CharacterBattleSpellAccessInit[] = [];
  const issues: CharacterBattleSpellAccessProjectionIssue[] = [];
  for (const [accessIndex, access] of input.accesses.entries()) {
    const projection = projectCharacterBattleMagicInitiateSpellAccess({
      build: input.build,
      access,
      accessIndex,
      unitLibrary: input.unitLibrary,
    });
    if (Result.isFailure(projection)) issues.push(...projection.failure);
    else projected.push(projection.success);
  }
  return issues.length > 0 ? Result.fail(issues) : Result.succeed(projected);
}

function projectCharacterBattleMagicInitiateSpellAccess(input: {
  readonly build: CharacterBuild;
  readonly access: CharacterBuild["magicInitiateSpellAccesses"][number];
  readonly accessIndex: number;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<
  CharacterBattleSpellAccessInit,
  readonly CharacterBattleSpellAccessProjectionIssue[]
> {
  const sourceUnit = input.unitLibrary.getUnit(input.access.featUnitId);
  if (Option.isNone(sourceUnit)) {
    return Result.fail([
      {
        tag: "characterBattleSpellAccessProjectionIssue",
        accessIndex: input.accessIndex,
        featUnitId: input.access.featUnitId,
        cause: "missingSourceUnit",
        message: `Magic Initiate Spell Access source Unit is missing: ${input.access.featUnitId}.`,
      },
    ]);
  }
  if (
    sourceUnit.value.kind !== "feat" ||
    sourceUnit.value.mechanics.family !== "magic_initiate"
  ) {
    return Result.fail([
      {
        tag: "characterBattleSpellAccessProjectionIssue",
        accessIndex: input.accessIndex,
        featUnitId: input.access.featUnitId,
        cause: "unsupportedSourceUnit",
        message: `Magic Initiate Spell Access source Unit must be a magic_initiate feat: ${input.access.featUnitId}.`,
      },
    ]);
  }
  const spellListClassRecord = spellcastingClassRecordForClassName({
    className: sourceUnit.value.mechanics.spellList,
    unitLibrary: input.unitLibrary,
  });
  if (spellListClassRecord === undefined) {
    return Result.fail([
      {
        tag: "characterBattleSpellAccessProjectionIssue",
        accessIndex: input.accessIndex,
        featUnitId: input.access.featUnitId,
        cause: "missingSpellListSource",
        message: `Magic Initiate Spell Access canonical spell list source is missing: ${sourceUnit.value.mechanics.spellList}.`,
      },
    ]);
  }
  const spells = spellRecordsForIds(input.unitLibrary, [
    input.access.cantrips[0],
    input.access.cantrips[1],
    input.access.levelOneSpell,
  ] as const);
  if (Result.isFailure(spells)) {
    const issues = battleCreatureInitIssueLeaves(spells.failure).map(
      (issue, issueIndex) => ({
        tag: "characterBattleSpellAccessProjectionIssue" as const,
        accessIndex: input.accessIndex,
        featUnitId: input.access.featUnitId,
        cause: "invalidSpellSelection" as const,
        issueIndex,
        message: battleCreatureInitIssueMessage(issue),
      }),
    );
    return Result.fail(
      isReadonlyArrayNonEmpty(issues)
        ? issues
        : [
            {
              tag: "characterBattleSpellAccessProjectionIssue" as const,
              accessIndex: input.accessIndex,
              featUnitId: input.access.featUnitId,
              cause: "invalidSpellSelection" as const,
              issueIndex: 0,
              message: "Character battle spell selection projection failed.",
            },
          ],
    );
  }
  const spellList: CharacterBattleSpellListFact = {
    className: spellListClassRecord.className,
    ...classSpellListForSpellcastingClassRecord(spellListClassRecord),
  };
  return Result.succeed({
    source: {
      tag: "feat",
      sourceUnit: sourceUnit.value,
      spellList,
    },
    spellcastingAbilityModifier: Number(
      battleAbilityModifier(
        scoreModifier(
          input.build.abilityScores[input.access.spellcastingAbility],
        ),
      ),
    ),
    cantrips: [spells.success[0], spells.success[1]],
    levelOneSpell: spells.success[2],
  });
}

function spellbookRitualSpellAccess(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<
  readonly CharacterBattleSpellbookRitualSpellAccessInit[],
  BattleCreatureInitIssue
> {
  const projectSource = (
    source: CharacterBuildSpellcastingSource,
  ): CharacterBuildSpellcastingSource => {
    const sourceClassName = classUnitIdToClassName({
      unitLibrary: input.unitLibrary,
      classUnitId: source.sourceUnitId,
    });
    return Result.isFailure(sourceClassName)
      ? source
      : {
          ...source,
          spellbook: omitRuntimeDetachedClassSpellChoices({
            unitLibrary: input.unitLibrary,
            sourceClassName: sourceClassName.success,
            spellIds: source.spellbook,
            choiceKind: "leveledSpell",
          }),
        };
  };
  const spellcasting = input.build.spellcasting;
  const ritualProjectionBuild =
    spellcasting === undefined
      ? input.build
      : {
          ...input.build,
          spellcasting: {
            ...spellcasting,
            sources: [
              projectSource(spellcasting.sources[0]),
              ...spellcasting.sources.slice(1).map(projectSource),
            ] as const,
          },
        };
  const accesses = characterSheetSpellbookRitualAccessesForBuild({
    ...input,
    build: ritualProjectionBuild,
  });
  return Result.isFailure(accesses)
    ? battleCreatureInitIssue(accesses.failure.message)
    : Result.succeed(
        accesses.success.map((access) => ({
          tag: "spellbookRitual",
          spell: access.spell,
          featureUnitId: access.featureUnitId,
        })),
      );
}

function bookOfShadowsSpellAccess(input: {
  readonly build: CharacterBuild;
  readonly spellcastingSources: ReadonlyArray<
    NonNullable<CharacterBuild["spellcasting"]>["sources"][number]
  >;
  readonly unitLibrary: UnitCatalog;
  readonly featurePreparedSpells: readonly CharacterBattleFeaturePreparedSpellInit[];
  readonly bookOfShadowsPresence?: CharacterBattleBookOfShadowsPresence;
}): Result.Result<
  readonly CharacterBattleBookOfShadowsSpellAccessInit[],
  BattleCreatureInitIssue
> {
  const accesses = input.spellcastingSources.flatMap((source) => {
    const access = source.bookOfShadows;
    return access === undefined ? [] : [{ source, access }];
  });
  if (accesses.length === 0) {
    return Result.succeed([]);
  }
  if (input.bookOfShadowsPresence === undefined) {
    return battleCreatureInitIssue(
      "Book of Shadows Spell Access requires Book of Shadows presence state.",
    );
  }
  if (
    !hasSelectedWarlockEldritchInvocation(input.build, {
      unitLibrary: input.unitLibrary,
      invocationId: PACT_OF_THE_TOME_INVOCATION_ID,
    })
  ) {
    return battleCreatureInitIssue(
      "Book of Shadows Spell Access requires Pact of the Tome.",
    );
  }
  if (accesses.length !== 1) {
    return battleCreatureInitIssue(
      "Character Battle supports one Book of Shadows Spell Access source.",
    );
  }
  const { source, access } = accesses[0];
  const sourceClassName = classUnitIdToClassName({
    unitLibrary: input.unitLibrary,
    classUnitId: source.sourceUnitId,
  });
  if (
    Result.isFailure(sourceClassName) ||
    sourceClassName.success !== "warlock"
  ) {
    return battleCreatureInitIssue(
      "Book of Shadows Spell Access must be attached to the Warlock spellcasting source.",
    );
  }
  const selectedSpellIds = [...access.cantrips, ...access.ritualSpells];
  if (new Set(selectedSpellIds).size !== selectedSpellIds.length) {
    return battleCreatureInitIssue(
      "Book of Shadows Spell Access selections must be distinct.",
    );
  }
  const alreadyPrepared = new Set([
    ...source.cantrips,
    ...source.preparedSpells,
    ...input.featurePreparedSpells.map((featureSpell) => featureSpell.spell.id),
  ]);
  if (selectedSpellIds.some((spellId) => alreadyPrepared.has(spellId))) {
    return battleCreatureInitIssue(
      "Book of Shadows Spell Access cannot select spells the character already has prepared or known.",
    );
  }
  if (
    !allCantripsFromAnyClassSpellList({
      spellIds: access.cantrips,
      unitLibrary: input.unitLibrary,
    })
  ) {
    return battleCreatureInitIssue(
      "Book of Shadows cantrips must come from class spell lists.",
    );
  }
  if (
    !allLeveledSpellsFromAnyClassSpellList({
      spells: access.ritualSpells.map((spellId) => ({
        spellId,
        spellLevel: 1,
      })),
      unitLibrary: input.unitLibrary,
    })
  ) {
    return battleCreatureInitIssue(
      "Book of Shadows Ritual spells must be level-1 spells from class spell lists.",
    );
  }
  const cantrips = spellRecordsForIds(input.unitLibrary, access.cantrips);
  if (Result.isFailure(cantrips)) {
    return battleCreatureInitIssue(cantrips.failure.message);
  }
  const ritualSpells = spellRecordsForIds(
    input.unitLibrary,
    access.ritualSpells,
  );
  if (Result.isFailure(ritualSpells)) {
    return battleCreatureInitIssue(ritualSpells.failure.message);
  }
  if (cantrips.success.some((spell) => spell.mechanics.level !== 0)) {
    return battleCreatureInitIssue(
      "Book of Shadows cantrip selections must be cantrip Spell Definitions.",
    );
  }
  if (
    ritualSpells.success.some(
      (spell) =>
        spell.mechanics.level !== 1 || !spellHasTopLevelRitualTag(spell),
    )
  ) {
    return battleCreatureInitIssue(
      "Book of Shadows Ritual selections must be level-1 ritual-tagged Spell Definitions.",
    );
  }
  return Result.succeed([
    {
      tag: access.tag,
      bookPresence: input.bookOfShadowsPresence,
      cantrips: cantrips.success,
      ritualSpells: ritualSpells.success,
      spellcastingFocus: access.spellcastingFocus,
    },
  ]);
}

function invocationSpellAccess(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<
  readonly CharacterBattleInvocationSpellAccessInit[],
  BattleCreatureInitIssue
> {
  const accesses: CharacterBattleInvocationSpellAccessInit[] = [];
  if (
    hasSelectedEldritchInvocation(input.build, ARMOR_OF_SHADOWS_INVOCATION_ID)
  ) {
    const access = invocationSpellAccessForSpell({
      unitLibrary: input.unitLibrary,
      spellId: authoredUnitId(ARMOR_OF_SHADOWS_SPELL_ID),
      tag: "armorOfShadowsMageArmor",
    });
    if (Result.isFailure(access)) {
      return Result.fail(access.failure);
    }
    accesses.push(access.success);
  }
  if (
    hasSelectedEldritchInvocation(input.build, PACT_OF_THE_CHAIN_INVOCATION_ID)
  ) {
    const access = invocationSpellAccessForSpell({
      unitLibrary: input.unitLibrary,
      spellId: authoredUnitId(PACT_OF_THE_CHAIN_SPELL_ID),
      tag: "pactOfTheChainFindFamiliar",
    });
    if (Result.isFailure(access)) {
      return Result.fail(access.failure);
    }
    accesses.push(access.success);
  }
  return Result.succeed(accesses);
}

function invocationSpellAccessForSpell(input: {
  readonly unitLibrary: UnitCatalog;
  readonly spellId: UnitRecord["id"];
  readonly tag: CharacterBattleInvocationSpellAccessInit["tag"];
}): Result.Result<
  CharacterBattleInvocationSpellAccessInit,
  BattleCreatureInitIssue
> {
  const spell = getRequiredUnit(input.unitLibrary, input.spellId);
  if (Result.isFailure(spell)) {
    return battleCreatureInitIssue(spell.failure.message);
  }
  if (spell.success.kind !== "spell") {
    return battleCreatureInitIssue(`Expected spell Unit: ${input.spellId}`);
  }
  return Result.succeed({ tag: input.tag, spell: spell.success });
}

function featurePreparedSpellAccess(input: {
  readonly build: CharacterBuild;
  readonly unitLibrary: UnitCatalog;
}): Result.Result<
  readonly CharacterBattleFeaturePreparedSpellInit[],
  BattleCreatureInitIssue
> {
  const featurePreparedSpells: CharacterBattleFeaturePreparedSpellInit[] = [];
  for (const featureUnitId of characterBuildFeatureUnitIds(
    input.build,
    input.unitLibrary,
  )) {
    const unit = input.unitLibrary.getUnit(featureUnitId);
    if (Option.isNone(unit)) {
      continue;
    }
    if (
      unit.value.kind !== "class_feature" ||
      unit.value.mechanics.family !== "passive" ||
      !unitIsSupportedClassFeatureSpellFreeCastResource(unit.value)
    ) {
      continue;
    }
    for (const grant of unit.value.mechanics.grants) {
      if (grant.kind !== "grant_spell_access" || grant.mode !== "prepared") {
        continue;
      }
      const spell = getRequiredUnit(
        input.unitLibrary,
        authoredUnitId(grant.spellId),
      );
      if (Result.isFailure(spell)) {
        return battleCreatureInitIssue(spell.failure.message);
      }
      if (spell.success.kind !== "spell") {
        return battleCreatureInitIssue(`Expected spell Unit: ${grant.spellId}`);
      }
      featurePreparedSpells.push({
        sourceUnitId: unit.value.id,
        spell: spell.success,
      });
    }
  }
  return Result.succeed(featurePreparedSpells);
}

function spellcastingSourcesWithOneAbilityAndClass(input: {
  readonly unitLibrary: UnitCatalog;
  readonly sources: NonEmptyReadonlyArray<CharacterBuildSpellcastingSource>;
}): Result.Result<
  {
    readonly spellcastingAbility: CharacterBuildSpellcastingSource["spellcastingAbility"];
    readonly sourceClassName: ClassName;
    readonly sources: readonly CharacterBuildSpellcastingSource[];
  },
  BattleCreatureInitIssue
> {
  const firstSource = input.sources[0];
  const firstClassName = classUnitIdToClassName({
    unitLibrary: input.unitLibrary,
    classUnitId: firstSource.sourceUnitId,
  });
  if (Result.isFailure(firstClassName)) {
    return battleCreatureInitIssue(
      "Battle spellcasting projection requires a class spellcasting source.",
    );
  }
  if (
    !input.sources.every((source) => {
      const className = classUnitIdToClassName({
        unitLibrary: input.unitLibrary,
        classUnitId: source.sourceUnitId,
      });
      return (
        Result.isSuccess(className) &&
        className.success === firstClassName.success
      );
    })
  ) {
    return battleCreatureInitIssue(
      "Battle spellcasting projection requires one source class.",
    );
  }
  return input.sources.every(
    (source) => source.spellcastingAbility === firstSource.spellcastingAbility,
  )
    ? Result.succeed({
        spellcastingAbility: firstSource.spellcastingAbility,
        sourceClassName: firstClassName.success,
        sources: input.sources,
      })
    : battleCreatureInitIssue(
        "Battle spellcasting projection requires one spellcasting ability.",
      );
}

function characterBuildLevel(build: CharacterBuild) {
  return characterLevel(computeTotalLevel(build.progression));
}

function spellRecordsForIds<const UnitIds extends readonly UnitRecord["id"][]>(
  unitLibrary: UnitCatalog,
  unitIds: UnitIds,
): Result.Result<
  { readonly [Index in keyof UnitIds]: SpellRecord },
  BattleCreatureInitIssue
> {
  const spells: SpellRecord[] = [];
  const issues: string[] = [];
  for (const unitId of unitIds) {
    const unit = getRequiredUnit(unitLibrary, unitId);
    if (Result.isFailure(unit)) {
      issues.push(unit.failure.message);
      continue;
    }
    if (unit.success.kind !== "spell") {
      issues.push(`Expected spell Unit: ${unitId}`);
      continue;
    }
    spells.push(unit.success);
  }
  if (isReadonlyArrayNonEmpty(issues)) {
    return battleCreatureInitIssuesFromMessages(issues, () => ({
      kind: "characterBuildProjection",
      phase: "spellcasting",
    }));
  }
  // Every input id contributes exactly one record unless the function returns
  // a typed lookup/kind issue, so this projection preserves tuple length.
  return Result.succeed(
    spells as { readonly [Index in keyof UnitIds]: SpellRecord },
  );
}

function battleProjectedSpellRecordsForIds(input: {
  readonly unitLibrary: UnitCatalog;
  readonly sourceClassName: ClassName;
  readonly spellIds: readonly UnitRecord["id"][];
  readonly selectionKind: ClassSpellChoiceKind;
}): Result.Result<readonly SpellRecord[], BattleCreatureInitIssue> {
  const spells: SpellRecord[] = [];
  const issues: string[] = [];
  for (const spellId of input.spellIds) {
    const unit = input.unitLibrary.getUnit(spellId);
    if (Option.isNone(unit)) {
      if (
        classSpellChoiceIsRuntimeDetached({
          unitLibrary: input.unitLibrary,
          sourceClassName: input.sourceClassName,
          spellId,
          choiceKind: input.selectionKind,
        })
      ) {
        continue;
      }
      issues.push(`Unknown Unit id: ${spellId}`);
      continue;
    }
    if (unit.value.kind !== "spell") {
      issues.push(`Expected spell Unit: ${spellId}`);
      continue;
    }
    spells.push(unit.value);
  }
  return issues.length === 0
    ? Result.succeed(spells)
    : isReadonlyArrayNonEmpty(issues)
      ? battleCreatureInitIssuesFromMessages(issues, () => ({
          kind: "characterBuildProjection",
          phase: "spellcasting",
        }))
      : battleCreatureInitIssue(
          "Character battle spell selection projection failed.",
          { kind: "characterBuildProjection", phase: "spellcasting" },
        );
}

export function getRequiredUnit(
  unitLibrary: UnitCatalog,
  unitId: UnitRecord["id"],
): Result.Result<UnitRecord, BattleCreatureInitIssue> {
  const unit = unitLibrary.getUnit(unitId);
  return Option.isSome(unit)
    ? Result.succeed(unit.value)
    : battleCreatureInitIssue(`Unknown Unit id: ${unitId}`);
}
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
