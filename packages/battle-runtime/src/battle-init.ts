// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.hunters-prey
import type { ArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import type {
  Condition,
  Hp,
  MovementFeet,
  ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type { Language } from "@dnd/shared/game-facts";
import type {
  Ability,
  CreatureSpeed,
  SixAbilityScores,
  Size,
  Skill,
  StatBlockRecord,
  StatBlockValue,
  UnitRecord,
  WeaponProficiency,
} from "@dnd/surface/surface/types";
import * as Either from "effect/Either";
import type {
  CharacterUnarmedStrikeActionOption,
  CharacterWeaponAttackActionOption,
} from "./battle-action-options.ts";
import type {
  CharacterBattleFeatureInit,
  CharacterBattleMetamagicState,
  CharacterBattleResourceInit,
  CharacterBattleSpellcastingInit,
} from "./character-battle-resources.ts";
import type { CharacterBattleClassLevelInit } from "./character-class-level.ts";
import type {
  BattleCombatantSide,
  CharacterId,
  CombatantId,
  InitiativeScore,
} from "./identity.ts";
import type {
  BattleDruidWildShapeKnownFormSupportProfile,
  BattleUnitSupportProfile,
} from "./unit-feature-support.ts";
import type { CharacterZeroHpLifecycleInit } from "./zero-hp-lifecycle.ts";
import { statBlockActionSurfaceIsSupported } from "./statblock-action-support.ts";
import {
  wildShapeKnownFormEligibilityIssue,
  type WildShapeKnownFormEligibilityIssueCode,
} from "./druid-wild-shape-form-eligibility.ts";

export type BattleUnitRef = {
  readonly unitId: UnitRecord["id"];
  readonly supportProfiles: readonly BattleUnitSupportProfile[];
  readonly selectedOption?: BattleUnitRefSelectedOption;
};

export const HUNTERS_PREY_SELECTED_OPTION_IDS = [
  "colossusSlayer",
  "hordeBreaker",
] as const;
export type HuntersPreySelectedOptionId =
  (typeof HUNTERS_PREY_SELECTED_OPTION_IDS)[number];
export type BattleUnitRefSelectedOption = {
  readonly kind: "huntersPrey";
  readonly optionId: HuntersPreySelectedOptionId;
};

export type CharacterBattleInvocationFeature = {
  readonly tag: "eldritchMind";
};

export type CharacterBattleLoadoutRef = {
  readonly armor?: {
    readonly itemId: string;
    readonly unitId: UnitRecord["id"];
  };
  readonly shield?: {
    readonly itemId: string;
    readonly unitId: UnitRecord["id"];
  };
  readonly weapon?: {
    readonly itemId: string;
    readonly unitId: UnitRecord["id"];
    readonly grip: "one_handed" | "two_handed";
  };
  readonly offHandWeapon?: {
    readonly itemId: string;
    readonly unitId: UnitRecord["id"];
  };
};

export type CharacterBattleWeaponMasterySelection = {
  readonly weaponUnitId: UnitRecord["id"];
};

export type CharacterBattleD20Statistics = {
  readonly abilityScores: SixAbilityScores;
  readonly savingThrowProficiencies: readonly Ability[];
  readonly skillProficiencies: readonly Skill[];
  readonly skillExpertise: readonly Skill[];
};

export type BattleWalkSpeed = {
  readonly walkFeet: MovementFeet;
};

type LiteralStatBlockValue = Extract<
  StatBlockValue,
  { readonly kind: "literal" }
>;

type LiteralCreatureSpeedFeet = Extract<
  CreatureSpeed["feet"],
  { readonly kind: "literal" }
>;

type LiteralStatBlockSpeed = {
  readonly kind: CreatureSpeed["kind"];
  readonly feet: LiteralCreatureSpeedFeet;
};

type LiteralWalkStatBlockSpeed = LiteralStatBlockSpeed & {
  readonly kind: "walk";
};

type BattleDruidWildShapeFormSpeeds = readonly [
  LiteralWalkStatBlockSpeed,
  ...LiteralStatBlockSpeed[],
];

type BattleDruidWildShapeFormProjectionStatBlock = StatBlockRecord & {
  readonly statBlock: Omit<
    StatBlockRecord["statBlock"],
    "ac" | "size" | "speeds"
  > & {
    readonly ac: LiteralStatBlockValue;
    readonly size: Size;
    readonly speeds: BattleDruidWildShapeFormSpeeds;
  };
};

declare const battleDruidWildShapeKnownFormBrand: unique symbol;

export type BattleDruidWildShapeKnownForm =
  BattleDruidWildShapeFormProjectionStatBlock & {
    readonly [battleDruidWildShapeKnownFormBrand]: true;
  };

export type BattleDruidWildShapeKnownFormIssue = {
  readonly tag: "battleDruidWildShapeKnownFormIssue";
  readonly message: string;
};

const WILD_SHAPE_KNOWN_FORM_ELIGIBILITY_MESSAGES = {
  creatureType:
    "Druid Wild Shape battle forms require eligible Beast Stat Blocks.",
  challengeRating:
    "Druid Wild Shape battle forms cannot exceed the Druid's maximum Challenge Rating.",
  flySpeed:
    "Druid Wild Shape battle forms cannot have a Fly Speed at this Druid level.",
} as const satisfies Record<WildShapeKnownFormEligibilityIssueCode, string>;

export function battleAvailableDruidWildShapeKnownForms(input: {
  readonly forms: readonly StatBlockRecord[];
  readonly profile: BattleDruidWildShapeKnownFormSupportProfile;
}): Either.Either<
  readonly BattleDruidWildShapeKnownForm[],
  BattleDruidWildShapeKnownFormIssue
> {
  if (new Set(input.forms.map((form) => form.id)).size !== input.forms.length) {
    return Either.left({
      tag: "battleDruidWildShapeKnownFormIssue",
      message:
        "Druid Wild Shape battle initialization requires distinct available known forms.",
    });
  }
  const parsed: BattleDruidWildShapeKnownForm[] = [];
  for (const form of input.forms) {
    const eligibilityIssue = wildShapeKnownFormEligibilityIssue({
      form,
      profile: input.profile,
    });
    if (eligibilityIssue !== undefined) {
      return Either.left({
        tag: "battleDruidWildShapeKnownFormIssue",
        message: WILD_SHAPE_KNOWN_FORM_ELIGIBILITY_MESSAGES[
          eligibilityIssue.code
        ],
      });
    }
    const projected = battleDruidWildShapeFormProjectionStatBlock(form);
    if (Either.isLeft(projected)) return Either.left(projected.left);
    if (!statBlockActionSurfaceIsSupported(form.statBlock)) {
      continue;
    }
    parsed.push(battleDruidWildShapeKnownForm(projected.right));
  }
  return Either.right(parsed);
}

function battleDruidWildShapeKnownForm(
  form: BattleDruidWildShapeFormProjectionStatBlock,
): BattleDruidWildShapeKnownForm {
  // Brands are erased at runtime; the parser applies this brand only after
  // proving roster eligibility, projection facts, and supported actions.
  return form as BattleDruidWildShapeKnownForm;
}

function battleDruidWildShapeFormProjectionStatBlock(
  form: StatBlockRecord,
): Either.Either<
  BattleDruidWildShapeFormProjectionStatBlock,
  BattleDruidWildShapeKnownFormIssue
> {
  const armorClass = form.statBlock.ac;
  if (armorClass.kind !== "literal") {
    return Either.left({
      tag: "battleDruidWildShapeKnownFormIssue",
      message: "Druid Wild Shape battle forms require literal Armor Class.",
    });
  }
  const creatureSize = form.statBlock.size;
  if (typeof creatureSize !== "string") {
    return Either.left({
      tag: "battleDruidWildShapeKnownFormIssue",
      message: "Druid Wild Shape battle forms require literal Size.",
    });
  }
  const speeds = battleDruidWildShapeFormProjectionSpeeds(form);
  if (Either.isLeft(speeds)) return Either.left(speeds.left);
  return Either.right({
    ...form,
    statBlock: {
      ...form.statBlock,
      ac: armorClass,
      size: creatureSize,
      speeds: speeds.right,
    },
  });
}

function battleDruidWildShapeFormProjectionSpeeds(
  form: StatBlockRecord,
): Either.Either<
  BattleDruidWildShapeFormSpeeds,
  BattleDruidWildShapeKnownFormIssue
> {
  const literalSpeeds: LiteralStatBlockSpeed[] = [];
  for (const speed of form.statBlock.speeds) {
    if (
      speed.feet.kind !== "literal" ||
      speed.requiresSlotLevel !== undefined
    ) {
      return Either.left({
        tag: "battleDruidWildShapeKnownFormIssue",
        message:
          "Druid Wild Shape battle forms require unconditional literal Speeds.",
      });
    }
    literalSpeeds.push({ kind: speed.kind, feet: speed.feet });
  }
  const walkSpeed = literalSpeeds.find(
    (speed): speed is LiteralWalkStatBlockSpeed => speed.kind === "walk",
  );
  if (walkSpeed === undefined) {
    return Either.left({
      tag: "battleDruidWildShapeKnownFormIssue",
      message: "Druid Wild Shape battle forms require literal Walk Speed.",
    });
  }
  return Either.right([
    walkSpeed,
    ...literalSpeeds.filter((speed) => speed !== walkSpeed),
  ]);
}

// SRD 5.2.1 "Knocking Out a Creature": a knocked-out creature is left at 1 HP
// with the Unconscious condition. That condition ends when the Short Rest
// started by Knock Out completes, when it regains HP, or after successful
// DC 10 Wisdom (Medicine) first aid. Battle runtime executes the HP-healing
// ending path; rest completion and first aid are carried for session workflows.
export type BattlePositiveHpUnconscious = {
  readonly tag: "knockedOut";
};
export const KNOCKED_OUT_UNCONSCIOUS = {
  tag: "knockedOut",
} as const satisfies BattlePositiveHpUnconscious;

export type CharacterBattleCreatureInit = {
  readonly kind: "character";
  readonly characterId: CharacterId;
  readonly characterUnitRefs: readonly BattleUnitRef[];
  readonly classLevels: readonly CharacterBattleClassLevelInit[];
  readonly knownLanguages: ReadonlyNonEmptyArray<Language>;
  readonly d20Statistics: CharacterBattleD20Statistics;
  readonly druidWildShapeAvailableForms?: readonly BattleDruidWildShapeKnownForm[];
  readonly weaponProficiencies?: readonly WeaponProficiency[];
  readonly armorClass: ArmorClassState;
  readonly size: Size;
  readonly speed: BattleWalkSpeed;
  readonly currentHp: Hp;
  readonly maxHp: Hp;
  readonly tempHp: Hp;
  readonly conditions?: readonly Condition[];
  readonly positiveHpUnconscious?: BattlePositiveHpUnconscious;
  readonly zeroHpLifecycle?: CharacterZeroHpLifecycleInit;
  readonly selectedLoadout: CharacterBattleLoadoutRef;
  readonly weaponMasteries?: readonly CharacterBattleWeaponMasterySelection[];
  readonly attack: CharacterWeaponAttackActionOption | null;
  readonly unarmedStrike: CharacterUnarmedStrikeActionOption;
  readonly offHandAttack?: CharacterWeaponAttackActionOption | undefined;
  readonly unitFeatures?: readonly CharacterBattleFeatureInit[];
  readonly invocationFeatures?: readonly CharacterBattleInvocationFeature[];
  readonly resources?: readonly CharacterBattleResourceInit[];
  readonly metamagic?: CharacterBattleMetamagicState;
  readonly spellcasting?: CharacterBattleSpellcastingInit;
};

export type StatBlockBattleInitInput = {
  readonly combatantId: CombatantId;
  readonly statBlock: StatBlockRecord;
  readonly initiative: InitiativeScore;
  readonly side: BattleCombatantSide;
  // defaults to max
  readonly currentHp?: Hp;
  readonly tempHp?: Hp;
};

export type StatBlockBattleCreatureInit = {
  readonly kind: "statBlock";
  readonly statBlock: StatBlockRecord;
  readonly currentHp: Hp;
  readonly maxHp: Hp;
  readonly tempHp: Hp;
};

export type BattleCreatureInit = {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: InitiativeScore;
  readonly side: BattleCombatantSide;
  // The creature init kind is the zero-HP lifecycle authority:
  // characters use death saves; stat block creatures die at 0 HP.
  readonly creatureInit:
    | CharacterBattleCreatureInit
    | StatBlockBattleCreatureInit;
};
