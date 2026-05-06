import type { ArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import type { Condition, Hp, MovementFeet } from "@dnd/shared/types";
import type {
  Size,
  StatBlockRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import type {
  CharacterUnarmedStrikeActionOption,
  CharacterWeaponAttackActionOption,
} from "./battle-action-options.ts";
import type {
  CharacterBattleFeatureInit,
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
import type { BattleUnitSupportProfile } from "./unit-feature-support.ts";
import type { CharacterZeroHpLifecycleInit } from "./zero-hp-lifecycle.ts";

export type BattleUnitRef = {
  readonly unitId: UnitRecord["id"];
  readonly supportProfiles: readonly BattleUnitSupportProfile[];
};

export type CharacterBattleLoadoutRef = {
  readonly armor?: UnitRecord["id"];
  readonly shield?: UnitRecord["id"];
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

export type BattleWalkSpeed = {
  readonly walkFeet: MovementFeet;
};

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
  readonly attack: CharacterWeaponAttackActionOption | null;
  readonly unarmedStrike: CharacterUnarmedStrikeActionOption;
  readonly offHandAttack?: CharacterWeaponAttackActionOption | undefined;
  readonly unitFeatures?: readonly CharacterBattleFeatureInit[];
  readonly resources?: readonly CharacterBattleResourceInit[];
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
