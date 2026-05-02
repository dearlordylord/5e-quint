import { Brand, Match, Schema } from "effect";
import { isNonEmptyReadonlyArray } from "effect/Array";
import * as Either from "effect/Either";
import {
  canSpendAction,
  grantUnitActionResource,
  resetTurnActionEconomy,
  spendAction,
  spendActivationResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import {
  attackRollHits,
  attackRollResultIsValid,
} from "@dnd/shared-algebras/attack-roll-algebra";
import {
  createScoredInitiativeStack,
  currentActing,
  initiativeOrder,
  nextInitiative,
} from "@dnd/shared-algebras/initiative-algebra";
import {
  armorClass,
  currentArmorClass,
  statBlockArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import {
  applyCondition,
  EMPTY_CONDITION_STATE,
  hasCondition,
  isIncapacitated,
  removeCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import {
  addDeathFailures,
  resetDeathSaveRuntimeState,
  resolveDeathSavingThrow,
  validDeathSaveRuntimeState,
} from "@dnd/shared-algebras/death-saves-algebra";
import type {
  ActionEconomyState,
  RuntimeActionResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import type { InitiativeStack } from "@dnd/shared-algebras/initiative-algebra";
import type {
  ArmorClass,
  ArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import type { ConditionState } from "@dnd/shared-algebras/conditions-algebra";
import type {
  DeathSaves,
  DeathSaveRuntimeState,
} from "@dnd/shared-algebras/death-saves-algebra";
import type {
  HoleId,
  HoleInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  ATTACK_ROLL_MODES,
  holeId,
  holeInstanceKey,
  type AttackRollResult,
  type AttackRollMode,
  type FilledHoleValue,
  type RolledDiceGroup,
  type RuntimeHole,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { validateRolledDiceForDiceExpr } from "@dnd/shared-algebras/runtime-dice-algebra";
import {
  CONDITIONS as ALL_CONDITIONS,
  ClassLevel,
  CreatureId,
  Hp,
  Initiative,
  Round,
  movementFeet,
  proficiencyBonus,
  type Condition,
  type DieRollResult,
  type HandUse,
  type MovementFeet,
  type ProficiencyBonus as ProficiencyBonusType,
  type Round as RoundType,
} from "@dnd/shared/types";
import type { StandardActionKind } from "@dnd/shared/game-facts";
import type {
  Ability,
  ActivationResource,
  CreatureActions,
  CreatureLimitedUse,
  CreatureNamedAttackRoll,
  DamageType,
  DcSource,
  DiceExpr,
  SpellRecord,
  StatBlockRecord,
  StatBlockValue,
  ActionRestriction,
  ClassName,
  Size,
  UnitRecord,
  WeaponDamage,
  WeaponRecord,
} from "@dnd/surface/surface/types";

export const CombatantId = CreatureId.pipe(Schema.brand("CombatantId"));
export type CombatantId = typeof CombatantId.Type;
export const combatantId: (value: string) => CombatantId = CombatantId.make;

export const BattleId = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("BattleId"),
);
export type BattleId = typeof BattleId.Type;
export const battleId: (value: string) => BattleId = BattleId.make;

export type CharacterId = string & Brand.Brand<"CharacterId">;
const CharacterId = Brand.nominal<CharacterId>();
export const characterId: (value: string) => CharacterId = CharacterId;

export type InitiativeScore = Initiative & Brand.Brand<"InitiativeScore">;
const InitiativeScore = Brand.all(Initiative, Brand.nominal<InitiativeScore>());
export const initiativeScore: (value: number) => InitiativeScore =
  InitiativeScore;

export type ZeroHpLifecycle =
  | {
      // Stat Block runtime policy. SRD Monster Death makes 0 HP terminal for
      // this battle combatant; this is not a provenance label.
      readonly policy: "diesAtZeroHp";
    }
  | {
      // Character Build runtime policy. The battle reducer owns drop-to-zero,
      // damage-at-zero, critical damage-at-zero, and massive-damage consequences.
      // Start-turn death-save rolls and post-battle durable handoff preserve
      // this lifecycle across the battle/session boundary.
      readonly policy: "usesDeathSavingThrows";
      readonly deathSaves: DeathSaveRuntimeState;
    };
export type CharacterZeroHpLifecycleInit = Extract<
  ZeroHpLifecycle,
  { readonly policy: "usesDeathSavingThrows" }
>;

export type BattleWeaponDamage = Extract<
  WeaponDamage,
  { readonly kind: "dice" }
>;

export type BattleUnitRef = {
  readonly unitId: UnitRecord["id"];
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
export type CharacterBattleClassLevelInit = {
  readonly className: ClassName;
  readonly level: number;
};
export type CharacterBattleClassLevel = {
  readonly className: ClassName;
  readonly level: ClassLevel;
};

export type CharacterWeaponAttackActionOption = {
  readonly kind: "weapon";
  readonly weapon: WeaponRecord;
  readonly ability: Ability;
  readonly abilityModifier: number;
  readonly damageAbilityModifier?: number;
};
export type CharacterBattleResourceInit = {
  readonly unit: UnitRecord;
  readonly resource: ActivationResource;
  readonly usesRemaining?: number;
};
export type CharacterBattleResourceState = {
  readonly unit: UnitRecord;
  readonly resource: ActivationResource;
  readonly usesRemaining: number;
  readonly usedThisTurn: boolean;
};
export type CharacterBattleSpellSlotInit = {
  readonly spellLevel: number;
  readonly count: number;
};
export type CharacterBattleSpellSlotExpenditureInit = {
  readonly spellLevel: number;
  readonly expended: number;
};
export type CharacterBattleSpellSlotState = CharacterBattleSpellSlotInit &
  CharacterBattleSpellSlotExpenditureInit;
export type CharacterBattleSpellcastingInit = {
  readonly spellcastingAbilityModifier: number;
  readonly proficiencyBonus: ProficiencyBonusType;
  readonly canCastSpells: boolean;
  readonly cantrips: readonly SpellRecord[];
  readonly preparedSpells: readonly SpellRecord[];
  readonly spellSlots: readonly CharacterBattleSpellSlotInit[];
  readonly spellSlotExpenditures?: readonly CharacterBattleSpellSlotExpenditureInit[];
};
export type CharacterBattleSpellcastingState = Omit<
  CharacterBattleSpellcastingInit,
  "spellSlots" | "spellSlotExpenditures"
> & {
  readonly spellSlots: readonly CharacterBattleSpellSlotState[];
};
type LiteralStatBlockValue = Extract<
  StatBlockValue,
  { readonly kind: "literal" }
>;
type SupportedStatBlockBaseDamageEffect = Extract<
  CreatureNamedAttackRoll["onHit"][number],
  { readonly kind: "damage" }
> & {
  readonly amount: { readonly kind: "fixed"; readonly expr: DiceExpr };
  readonly damageType: DamageType;
};
type SupportedStatBlockAdvantageBonusDamageEffect = Extract<
  CreatureNamedAttackRoll["onHit"][number],
  { readonly kind: "conditional_bonus_damage" }
> & {
  readonly when: { readonly kind: "attack_roll_had_advantage" };
  readonly amount: { readonly kind: "fixed"; readonly expr: DiceExpr };
  readonly damageType: DamageType;
};
type SupportedStatBlockAttackEffectList =
  | readonly [SupportedStatBlockBaseDamageEffect]
  | readonly [
      SupportedStatBlockBaseDamageEffect,
      SupportedStatBlockAdvantageBonusDamageEffect,
    ]
  | readonly [
      SupportedStatBlockAdvantageBonusDamageEffect,
      SupportedStatBlockBaseDamageEffect,
    ];
type SupportedCreatureNamedAttackRoll = Omit<
  CreatureNamedAttackRoll,
  | "attackBonus"
  | "multiattackCount"
  | "onHit"
  | "attackType"
  | "reachFeet"
  | "rangeFeet"
> & {
  readonly attackBonus: LiteralStatBlockValue;
  readonly multiattackCount?: never;
  readonly onHit: SupportedStatBlockAttackEffectList;
} & (
    | {
        readonly attackType: "melee";
        readonly reachFeet: number;
        readonly rangeFeet?: never;
      }
    | {
        readonly attackType: "ranged";
        readonly reachFeet?: never;
        readonly rangeFeet: { readonly normal: number; readonly long: number };
      }
  );
export type StatBlockAttackActionOption = {
  readonly kind: "statBlockAttack";
  readonly attack: SupportedCreatureNamedAttackRoll;
  readonly part: StatBlockPartKey;
};
export type StatBlockPartSection =
  | "actions"
  | "bonusActions"
  | "reactions"
  | "legendaryActions";
export type StatBlockPartKey = {
  readonly section: StatBlockPartSection;
  readonly name: string;
};
export type StatBlockLimitedUseSnapshot =
  | {
      readonly key: StatBlockPartKey;
      readonly kind: "daily";
      readonly usesMax: number;
      readonly usesRemaining: number;
    }
  | {
      readonly key: StatBlockPartKey;
      readonly kind: "recharge";
      readonly minimumRoll: number;
      readonly available: boolean;
    }
  | {
      readonly key: StatBlockPartKey;
      readonly kind: "recharge_after_rest";
      readonly available: boolean;
    };
export type StatBlockLegendaryActionResourceSnapshot = {
  readonly usesMax: number;
  readonly usesRemaining: number;
};
export type StatBlockResourceSnapshot = {
  readonly legendaryActions: StatBlockLegendaryActionResourceSnapshot | null;
  readonly limitedUses: readonly StatBlockLimitedUseSnapshot[];
};
export type StatBlockDailyUseState = {
  readonly key: StatBlockPartKey;
  readonly usesRemaining: number;
};
export type StatBlockMutableResourceState = {
  readonly legendaryActionUsesRemaining: number;
  readonly dailyUses: readonly StatBlockDailyUseState[];
  readonly unavailableRechargeParts: readonly StatBlockPartKey[];
  readonly unavailableRestRechargeParts: readonly StatBlockPartKey[];
};
type StatBlockAttackDamage = {
  readonly expr: DiceExpr;
  readonly damageType: DamageType;
  readonly advantageBonus?: {
    readonly expr: DiceExpr;
    readonly damageType: DamageType;
  };
};
export type BattleActiveEffectExpiration = {
  readonly kind: "startOfTurn";
  readonly combatantId: CombatantId;
};
export type BattleSpellEffectEarlyEnd =
  | { readonly kind: "targetDonsArmor" }
  | { readonly kind: "concentrationBroken" };
type BattleSpellEffectBase = {
  readonly sourceSpellId: SpellRecord["id"];
  readonly sourceCombatantId: CombatantId;
};
export type BattleActiveEffect =
  | (BattleSpellEffectBase & {
      readonly kind: "speedDelta";
      readonly deltaFeet: number;
      readonly expiresAt: BattleActiveEffectExpiration;
    })
  | (BattleSpellEffectBase & {
      readonly kind: "mageArmorBaseArmorClass";
      readonly base: number;
      readonly ability: "dex";
      readonly earlyEnds: readonly BattleSpellEffectEarlyEnd[];
      readonly duration: {
        readonly kind: "hours";
        readonly amount: number;
      };
    });
export type BattleConcentration = {
  readonly sourceSpellId: SpellRecord["id"];
  readonly effectKind: "spellEffect" | "readiedSpell";
};
export type BattleReadiedSpell = {
  readonly invocation: SupportedDamageSpellAct;
  readonly trigger: BattleReadiedSpellTrigger;
  readonly expiresAt: BattleActiveEffectExpiration;
};
export const BATTLE_REACTION_TRIGGERS = [
  "attackHit",
  "spellCast",
  "saveFailed",
  "afterDamage",
  "opportunityAttack",
] as const;
export type BattleReactionTrigger = (typeof BATTLE_REACTION_TRIGGERS)[number];
export const BATTLE_READIED_SPELL_TRIGGERS = [
  "attackHit",
  "spellCast",
  "saveFailed",
  "afterDamage",
] as const satisfies ReadonlyArray<BattleReactionTrigger>;
export type BattleReadiedSpellTrigger =
  (typeof BATTLE_READIED_SPELL_TRIGGERS)[number];
export type BattleInterruptedProcedure =
  | {
      readonly kind: "replay";
      readonly subject: BattleSubject;
      readonly fills: readonly BattleFill[];
    }
  | {
      readonly kind: "resolved";
      readonly subject: BattleSubject;
    }
  | {
      readonly kind: "movement";
      readonly subject: BattleSubject;
      readonly movement: BattleResolvedMovement;
    };
export type BattleReactionProcedureChoice = {
  readonly reactorId: CombatantId;
  readonly subject: Extract<BattleSubject, { readonly tag: "runtimeCommand" }>;
} & (
  | {
      readonly kind: "releaseReadiedSpell";
      readonly readiedSpellCasterId: CombatantId;
    }
  | {
      readonly kind: "opportunityAttack";
    }
);
export type BattleReactionProcedureSelection = {
  readonly fills: readonly BattleFill[];
} & (
  | {
      readonly kind: "releaseReadiedSpell";
      readonly readiedSpellCasterId: CombatantId;
    }
  | {
      readonly kind: "opportunityAttack";
      readonly reactorId: CombatantId;
    }
);
type BattleActiveReactionProcedure = {
  readonly reactorId: CombatantId;
  readonly subject: BattleReactionProcedureChoice["subject"];
  readonly fills: readonly BattleFill[];
  readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
};
type BattleReactionFrameBase = {
  readonly eligibleReactors: readonly CombatantId[];
  readonly offeredReactors: readonly CombatantId[];
  readonly choices: readonly BattleReactionProcedureChoice[];
  readonly activeReaction?: BattleActiveReactionProcedure;
  readonly continuation: BattleInterruptedProcedure;
};
export type BattleReactionFrame =
  | (BattleReactionFrameBase & {
      readonly trigger: "attackHit";
      readonly attackerId: CombatantId;
      readonly targetId: CombatantId;
    })
  | (BattleReactionFrameBase & {
      readonly trigger: "spellCast";
      readonly casterId: CombatantId;
      readonly spellId: SpellRecord["id"];
    })
  | (BattleReactionFrameBase & {
      readonly trigger: "saveFailed";
      readonly targetId: CombatantId;
      readonly sourceSpellId?: SpellRecord["id"];
    })
  | (BattleReactionFrameBase & {
      readonly trigger: "afterDamage";
      readonly damageSourceId: CombatantId;
      readonly damagedId: CombatantId;
      readonly damageAmount: number;
    })
  | (BattleReactionFrameBase & {
      readonly trigger: "opportunityAttack";
      readonly moverId: CombatantId;
      readonly reactorIds: readonly CombatantId[];
    });
type BattleReactionFrameInput = BattleReactionFrame extends infer T
  ? T extends BattleReactionFrame
    ? Omit<
        T,
        "eligibleReactors" | "offeredReactors" | "choices" | "activeReaction"
      >
    : never
  : never;
export type BattleReactionDecision =
  | {
      readonly kind: "decline";
      readonly reactorId: CombatantId;
    }
  | {
      readonly kind: "resolve";
      readonly reactorId: CombatantId;
      readonly choice: BattleReactionProcedureSelection;
    };
type AttackTargetConstraint =
  | { readonly kind: "meleeReach"; readonly reachFeet: number }
  | {
      readonly kind: "rangedRange";
      readonly normalFeet: number;
    };
export type BattleHand = "left" | "right";
export type BattleGrappleLink = {
  readonly grapplerId: CombatantId;
  readonly targetId: CombatantId;
  readonly escapeDc: number;
  readonly reachFeet: number;
  readonly hand: BattleHand;
  readonly targetExemptFromDragCost: boolean;
};
export type BattleHiddenState = {
  readonly discoveryDc: number;
};
export type BattleHidePrerequisite =
  | {
      readonly kind: "heavilyObscuredOutOfEnemyLineOfSight";
    }
  | {
      readonly kind: "coverOutOfEnemyLineOfSight";
      readonly cover: "threeQuarters" | "total";
    };
export type BattleMovementDistanceUpdate = {
  readonly combatantId: CombatantId;
  readonly feet: number;
};
export type BattleMovementFillValue = {
  readonly movementCostFeet: number;
  readonly distanceMovedFeet: number;
  readonly destinationDistances: readonly BattleMovementDistanceUpdate[];
};
type BattleResolvedMovement = {
  readonly moverId: CombatantId;
  readonly movementCostFeet: MovementFeet;
  readonly destinationDistances: readonly BattleMovementDistanceUpdate[];
};
// SupportedAttackActionOption is a currently executable option for spending an
// immediate attack made as part of the Attack action. It is narrower than all
// RAW attacks: spell attacks, Opportunity Attacks, Bonus Action attacks, and
// Reaction attacks live in their own timing/resource lanes.
export type SupportedAttackActionOption =
  | CharacterWeaponAttackActionOption
  | StatBlockAttackActionOption;
export type SupportedSpellAct =
  | {
      readonly kind: "preparedSlotSpell";
      readonly spell: SpellRecord;
      readonly targeting: {
        readonly kind: "allRepeatedEffectsAtOneTarget";
        readonly repeatedEffectCount: number;
      };
      readonly slotLevel: number;
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
      readonly rangeFeet: number;
    }
  | {
      readonly kind: "cantripSpellAttack";
      readonly spell: SpellRecord;
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
      readonly rangeFeet: number;
      readonly attackBonus: number;
      readonly speedReduction: {
        readonly deltaFeet: number;
      };
    }
  | {
      readonly kind: "cantripSaveGateDamage";
      readonly spell: SpellRecord;
      readonly ability: Ability;
      readonly dc: DcSource;
      readonly area: {
        readonly kind: "pointOriginSphere";
        readonly radiusFeet: number;
      };
      readonly damage: {
        readonly expr: DiceExpr;
        readonly damageType: DamageType;
      };
      readonly rangeFeet: number;
    }
  | {
      readonly kind: "preparedPersistentSpell";
      readonly spell: SpellRecord;
      readonly slotLevel: number;
      readonly rangeFeet: number;
      readonly activeEffect: Extract<
        BattleActiveEffect,
        { readonly kind: "mageArmorBaseArmorClass" }
      >;
    };

type SupportedDamageSpellAct = Exclude<
  SupportedSpellAct,
  { readonly kind: "preparedPersistentSpell" }
>;

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
  readonly zeroHpLifecycle?: CharacterZeroHpLifecycleInit;
  readonly selectedLoadout: CharacterBattleLoadoutRef;
  readonly attack: CharacterWeaponAttackActionOption | null;
  readonly offHandAttack?: CharacterWeaponAttackActionOption | undefined;
  readonly resources?: readonly CharacterBattleResourceInit[];
  readonly spellcasting?: CharacterBattleSpellcastingInit;
};

export type StatBlockBattleInitInput = {
  readonly combatantId: CombatantId;
  readonly statBlock: StatBlockRecord;
  readonly initiative: InitiativeScore;
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
  // The creature init kind is the zero-HP lifecycle authority:
  // characters use death saves; stat block creatures die at 0 HP.
  readonly creatureInit:
    | CharacterBattleCreatureInit
    | StatBlockBattleCreatureInit;
};

export type BattleCombatantDistance = {
  readonly combatantA: CombatantId;
  readonly combatantB: CombatantId;
  readonly feet: number;
};
export type BattleCombatantDistanceValidationIssue =
  | {
      readonly tag: "invalidFeet";
    }
  | {
      readonly tag: "unknownCombatant";
      readonly combatantA: CombatantId;
      readonly combatantB: CombatantId;
    }
  | {
      readonly tag: "selfDistance";
      readonly combatantId: CombatantId;
    }
  | {
      readonly tag: "duplicatePair";
      readonly combatantA: CombatantId;
      readonly combatantB: CombatantId;
    }
  | {
      readonly tag: "incompletePairs";
      readonly expectedPairCount: number;
      readonly actualPairCount: number;
    };

export type BattleTurnResources = ActionEconomyState & {
  readonly actionResources: readonly RuntimeActionResource[];
  readonly currentHasBonusAction: boolean;
  readonly lightWeaponAttackMade?: {
    readonly weaponItemId: string;
  };
};

export type BattleCreatureState = {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: InitiativeScore;
  readonly hp: Hp;
  readonly maxHp: Hp;
  readonly tempHp: Hp;
  readonly conditions: ConditionState;
  readonly activeEffects: readonly BattleActiveEffect[];
  readonly concentration: BattleConcentration | null;
  readonly hidden: BattleHiddenState | null;
  readonly armorClass: ArmorClassState;
  readonly size: Size;
  readonly zeroHpLifecycle: ZeroHpLifecycle;
  readonly reactionAvailable: boolean;
  readonly movementSpentFeet: MovementFeet;
  readonly origin:
    | {
        readonly kind: "character";
        readonly characterId: CharacterId;
        readonly characterUnitRefs: readonly BattleUnitRef[];
        readonly classLevels: readonly CharacterBattleClassLevel[];
        readonly selectedLoadout: CharacterBattleLoadoutRef;
        readonly speed: BattleWalkSpeed;
        readonly attack: CharacterWeaponAttackActionOption | null;
        readonly offHandAttack?: CharacterWeaponAttackActionOption;
        readonly resources: readonly CharacterBattleResourceState[];
        readonly spellcasting?: CharacterBattleSpellcastingState;
      }
    | {
        readonly kind: "statBlock";
        readonly statBlock: StatBlockRecord;
        readonly resources: StatBlockMutableResourceState;
      };
};

export type LegendaryActionWindow = {
  readonly afterTurnActorId: CombatantId;
  readonly consumed: boolean;
};

export type BattleState = {
  readonly battleId: BattleId;
  readonly initiative: InitiativeStack<CombatantId>;
  readonly combatants: ReadonlyMap<CombatantId, BattleCreatureState>;
  readonly hidePrerequisites: ReadonlyMap<CombatantId, BattleHidePrerequisite>;
  readonly combatantDistances: ReadonlyMap<
    CombatantId,
    ReadonlyMap<CombatantId, number>
  >;
  readonly currentTurnResources: BattleTurnResources;
  readonly readiedSpells: ReadonlyMap<CombatantId, BattleReadiedSpell>;
  readonly grapples: readonly BattleGrappleLink[];
  readonly interruptStack: readonly BattleReactionFrame[];
  readonly legendaryActionWindow: LegendaryActionWindow | null;
};

export const BATTLE_SUBJECT_ACTIONS = [
  "attack",
  "hide",
  "search",
  "grapple",
  "escapeGrapple",
] as const;
export type BattleSubjectAction = (typeof BATTLE_SUBJECT_ACTIONS)[number];
export const BATTLE_SUBJECT_BONUS_ACTIONS = ["offHandAttack", "hide"] as const;
export type BattleSubjectBonusAction =
  (typeof BATTLE_SUBJECT_BONUS_ACTIONS)[number];

export const BATTLE_RUNTIME_COMMANDS = [
  "endTurn",
  "move",
  "releaseReadiedSpell",
  "releaseGrapple",
  "opportunityAttack",
] as const;
export type BattleRuntimeCommand = (typeof BATTLE_RUNTIME_COMMANDS)[number];

const BattleSubjectTextSchema = Schema.NonEmptyTrimmedString;

// BattleSubject is a replay key returned by discoverBattleActs and copied back
// by callers. It identifies one discovered runtime act; it is not Surface
// authored content, provenance, or a complete taxonomy of D&D actions.
export const BattleSubjectSchema = Schema.Union(
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("attack"),
    attackName: BattleSubjectTextSchema,
    statBlockSection: Schema.optionalWith(
      Schema.Literal(
        "actions",
        "bonusActions",
        "reactions",
        "legendaryActions",
      ),
      { exact: true },
    ),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("hide", "search"),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("grapple"),
    attackName: Schema.optionalWith(BattleSubjectTextSchema, { exact: true }),
    statBlockSection: Schema.optionalWith(
      Schema.Literal(
        "actions",
        "bonusActions",
        "reactions",
        "legendaryActions",
      ),
      { exact: true },
    ),
  }),
  Schema.Struct({
    tag: Schema.Literal("action"),
    actorId: CombatantId,
    action: Schema.Literal("escapeGrapple"),
    attackName: Schema.optionalWith(BattleSubjectTextSchema, { exact: true }),
    statBlockSection: Schema.optionalWith(
      Schema.Literal(
        "actions",
        "bonusActions",
        "reactions",
        "legendaryActions",
      ),
      { exact: true },
    ),
  }),
  Schema.Struct({
    tag: Schema.Literal("bonusAction"),
    actorId: CombatantId,
    action: Schema.Literal("offHandAttack"),
    attackName: BattleSubjectTextSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("bonusAction"),
    actorId: CombatantId,
    action: Schema.Literal("hide"),
  }),
  Schema.Struct({
    tag: Schema.Literal("actionSpell"),
    actorId: CombatantId,
    spellId: BattleSubjectTextSchema,
    spellActId: Schema.optionalWith(BattleSubjectTextSchema, { exact: true }),
    readyTrigger: Schema.optionalWith(
      Schema.Literal(...BATTLE_READIED_SPELL_TRIGGERS),
      { exact: true },
    ),
  }),
  Schema.Struct({
    tag: Schema.Literal("unitFeature"),
    actorId: CombatantId,
    unitId: BattleSubjectTextSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("endTurn"),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("move"),
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("releaseReadiedSpell"),
    readiedSpellCasterId: CombatantId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("releaseGrapple"),
    targetId: CombatantId,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal("opportunityAttack"),
    reactorId: CombatantId,
    targetId: CombatantId,
    attackName: BattleSubjectTextSchema,
  }),
);
export type BattleSubject = typeof BattleSubjectSchema.Type;
type ActionHideSubject = {
  readonly tag: "action";
  readonly actorId: CombatantId;
  readonly action: "hide";
};
type ActionSearchSubject = {
  readonly tag: "action";
  readonly actorId: CombatantId;
  readonly action: "search";
};
type BonusActionHideSubject = {
  readonly tag: "bonusAction";
  readonly actorId: CombatantId;
  readonly action: "hide";
};

const ACID_SPLASH_POINT_SPHERE_RADIUS_FEET = 5;

export function sameBattleSubject(
  left: BattleSubject,
  right: BattleSubject,
): boolean {
  return battleSubjectKey(left) === battleSubjectKey(right);
}

function battleSubjectKey(subject: BattleSubject): string {
  return Match.value(subject).pipe(
    Match.when({ tag: "action", action: "attack" }, (attack) =>
      JSON.stringify([
        attack.tag,
        attack.actorId,
        attack.action,
        attack.attackName,
        attack.statBlockSection ?? null,
      ]),
    ),
    Match.when({ tag: "action", action: "hide" }, (action) =>
      JSON.stringify([action.tag, action.actorId, action.action]),
    ),
    Match.when({ tag: "action", action: "search" }, (action) =>
      JSON.stringify([action.tag, action.actorId, action.action]),
    ),
    Match.when({ tag: "action", action: "grapple" }, (action) =>
      JSON.stringify([action.tag, action.actorId, action.action]),
    ),
    Match.when({ tag: "action", action: "escapeGrapple" }, (action) =>
      JSON.stringify([action.tag, action.actorId, action.action]),
    ),
    Match.when({ tag: "bonusAction", action: "offHandAttack" }, (attack) =>
      JSON.stringify([
        attack.tag,
        attack.actorId,
        attack.action,
        attack.attackName,
      ]),
    ),
    Match.when({ tag: "bonusAction", action: "hide" }, (action) =>
      JSON.stringify([action.tag, action.actorId, action.action]),
    ),
    Match.when({ tag: "actionSpell" }, (spell) =>
      JSON.stringify([
        spell.tag,
        spell.actorId,
        spell.spellActId ?? spell.spellId,
        spell.readyTrigger ?? null,
      ]),
    ),
    Match.when({ tag: "unitFeature" }, (feature) =>
      JSON.stringify([feature.tag, feature.actorId, feature.unitId]),
    ),
    Match.when({ tag: "runtimeCommand" }, (command) =>
      JSON.stringify([
        command.tag,
        command.actorId,
        command.command,
        "readiedSpellCasterId" in command ? command.readiedSpellCasterId : null,
        "targetId" in command ? command.targetId : null,
        "reactorId" in command ? command.reactorId : null,
        "targetId" in command ? command.targetId : null,
        "attackName" in command ? command.attackName : null,
      ]),
    ),
    Match.exhaustive,
  );
}

export type AvailableBattleAct = {
  readonly subject: BattleSubject;
  readonly label: string;
  readonly summary: string;
  readonly initialHoles: readonly BattleHole[];
};

export type BattleHoleId = HoleId;
export type BattleHoleInstanceKey = HoleInstanceKey;
export type BattleTargetChoiceHole = Extract<
  RuntimeHole,
  { readonly kind: "targetChoice" }
> & {
  readonly choices: readonly CombatantId[];
};
export type BattleAttackRollHole = Extract<
  RuntimeHole,
  { readonly kind: "attackRoll" }
> & {
  readonly attack: SupportedAttackActionOption;
  readonly attackBonus: number;
  readonly rollMode?: AttackRollMode;
};
export type BattleSpellAttackRollHole = Extract<
  RuntimeHole,
  { readonly kind: "attackRoll" }
> & {
  readonly spell: SupportedSpellAct;
  readonly attackBonus: number;
  readonly rollMode?: AttackRollMode;
};
export type BattleDamageRollHole = Extract<
  RuntimeHole,
  { readonly kind: "rolledDice" }
> & {
  readonly attack: SupportedAttackActionOption;
  readonly critical: boolean;
};
export type BattleSpellDamageRollHole = Extract<
  RuntimeHole,
  { readonly kind: "rolledDice" }
> & {
  readonly spell: SupportedSpellAct;
  readonly critical: boolean;
};
export type BattleSavingThrowOutcome = {
  readonly targetId: CombatantId;
  readonly succeeded: boolean;
};
export type BattleSpellAreaChoice = {
  readonly originAnchorId: CombatantId;
  readonly affectedTargetIds: readonly CombatantId[];
};
export type BattleSpellSavingThrowOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "savingThrowOutcome";
  readonly label: string;
  readonly spell: SupportedSpellAct;
  readonly ability: Ability;
  readonly dc: DcSource;
  readonly areaChoices: readonly BattleSpellAreaChoice[];
};
export type BattleUnitFeatureRollHole = Extract<
  RuntimeHole,
  { readonly kind: "rolledDice" }
> & {
  readonly unitFeature: SupportedSecondWindUnitFeature;
};
export type BattleDeathSavingThrowHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "deathSavingThrow";
  readonly label: string;
  readonly combatantId: CombatantId;
};
export type BattleStatBlockRechargeRollHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "statBlockRechargeRoll";
  readonly label: string;
  readonly combatantId: CombatantId;
  readonly rechargeTargets: readonly StatBlockPartKey[];
};
export type BattleStatBlockRechargeRollResult = {
  readonly target: StatBlockPartKey;
  readonly roll: DieRollResult;
};
export type BattleConcentrationSavingThrowHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "concentrationSavingThrow";
  readonly label: string;
  readonly combatantId: CombatantId;
  readonly dc: number;
  readonly damageAmount: number;
};
export type BattleReactionDecisionHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "reactionDecision";
  readonly label: string;
  readonly trigger: BattleReactionTrigger;
  readonly eligibleReactors: readonly CombatantId[];
};
export type BattleMovementHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "movement";
  readonly label: string;
  readonly actorId: CombatantId;
  readonly movementBudgetFeet: MovementFeet;
};
export type BattleAbilityCheckHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "abilityCheck";
  readonly label: string;
  readonly ability: Ability;
  readonly skill: "stealth" | "perception";
  readonly dc: number;
};
export type BattleGrappleOutcomeHole = {
  readonly holeInstanceKey: HoleInstanceKey;
  readonly holeId: BattleHoleId;
  readonly kind: "grappleOutcome";
  readonly label: string;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly dc: number;
  readonly mode: "grappleSave" | "escapeCheck";
};
export type BattleHole =
  | BattleTargetChoiceHole
  | BattleAttackRollHole
  | BattleSpellAttackRollHole
  | BattleDamageRollHole
  | BattleSpellDamageRollHole
  | BattleSpellSavingThrowOutcomeHole
  | BattleUnitFeatureRollHole
  | BattleDeathSavingThrowHole
  | BattleStatBlockRechargeRollHole
  | BattleConcentrationSavingThrowHole
  | BattleReactionDecisionHole
  | BattleMovementHole
  | BattleAbilityCheckHole
  | BattleGrappleOutcomeHole;

const BattleHoleIdSchema = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("HoleId"),
);
const BattleHoleBaseSchema = {
  holeInstanceKey: Schema.NonEmptyTrimmedString,
  holeId: BattleHoleIdSchema,
  label: Schema.optionalWith(Schema.String, { exact: true }),
} as const;

const BattleRuntimeObjectSchema = Schema.Record({
  key: Schema.String,
  value: Schema.Any,
});
const SupportedAttackActionOptionSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("weapon"),
    weapon: BattleRuntimeObjectSchema,
    ability: Schema.String,
    abilityModifier: Schema.Number,
    damageAbilityModifier: Schema.optionalWith(Schema.Number, {
      exact: true,
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("statBlockAttack"),
    attack: BattleRuntimeObjectSchema,
  }),
);
const SupportedSpellActSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("preparedSlotSpell"),
    spell: BattleRuntimeObjectSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("allRepeatedEffectsAtOneTarget"),
      repeatedEffectCount: Schema.Number,
    }),
    slotLevel: Schema.Number,
    damage: Schema.Struct({
      expr: BattleRuntimeObjectSchema,
      damageType: Schema.String,
    }),
    rangeFeet: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal("cantripSpellAttack"),
    spell: BattleRuntimeObjectSchema,
    damage: Schema.Struct({
      expr: BattleRuntimeObjectSchema,
      damageType: Schema.String,
    }),
    rangeFeet: Schema.Number,
    attackBonus: Schema.Number,
    speedReduction: Schema.Struct({
      deltaFeet: Schema.Number,
    }),
  }),
  Schema.Struct({
    kind: Schema.Literal("cantripSaveGateDamage"),
    spell: BattleRuntimeObjectSchema,
    ability: Schema.String,
    dc: BattleRuntimeObjectSchema,
    area: Schema.Struct({
      kind: Schema.Literal("pointOriginSphere"),
      radiusFeet: Schema.Number,
    }),
    damage: Schema.Struct({
      expr: BattleRuntimeObjectSchema,
      damageType: Schema.String,
    }),
    rangeFeet: Schema.Number,
  }),
  Schema.Struct({
    kind: Schema.Literal("preparedPersistentSpell"),
    spell: BattleRuntimeObjectSchema,
    slotLevel: Schema.Number,
    rangeFeet: Schema.Number,
    activeEffect: BattleRuntimeObjectSchema,
  }),
);

export const BattleHoleSchema = Schema.Union(
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("targetChoice"),
    choices: Schema.Array(CombatantId),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("attackRoll"),
    attack: SupportedAttackActionOptionSchema,
    attackBonus: Schema.Number,
    rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
      exact: true,
    }),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("attackRoll"),
    spell: SupportedSpellActSchema,
    attackBonus: Schema.Number,
    rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
      exact: true,
    }),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    attack: SupportedAttackActionOptionSchema,
    critical: Schema.Boolean,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    spell: SupportedSpellActSchema,
    critical: Schema.Boolean,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("savingThrowOutcome"),
    label: Schema.String,
    spell: SupportedSpellActSchema,
    ability: Schema.String,
    dc: BattleRuntimeObjectSchema,
    areaChoices: Schema.Array(
      Schema.Struct({
        originAnchorId: CombatantId,
        affectedTargetIds: Schema.Array(CombatantId),
      }),
    ),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("rolledDice"),
    unitFeature: BattleRuntimeObjectSchema,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("deathSavingThrow"),
    label: Schema.String,
    combatantId: CombatantId,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("statBlockRechargeRoll"),
    label: Schema.String,
    combatantId: CombatantId,
    rechargeTargets: Schema.Array(BattleRuntimeObjectSchema),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("concentrationSavingThrow"),
    label: Schema.String,
    combatantId: CombatantId,
    dc: Schema.Number,
    damageAmount: Schema.Number,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("reactionDecision"),
    label: Schema.String,
    trigger: Schema.Literal(...BATTLE_REACTION_TRIGGERS),
    eligibleReactors: Schema.Array(CombatantId),
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("movement"),
    label: Schema.String,
    actorId: CombatantId,
    movementBudgetFeet: Schema.Number,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("abilityCheck"),
    label: Schema.String,
    ability: Schema.String,
    skill: Schema.Literal("stealth", "perception"),
    dc: Schema.Number,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("grappleOutcome"),
    label: Schema.String,
    actorId: CombatantId,
    targetId: CombatantId,
    dc: Schema.Number,
    mode: Schema.Literal("grappleSave", "escapeCheck"),
  }),
);

export type BattleFill =
  | Extract<FilledHoleValue, { readonly kind: "attackRoll" | "rolledDice" }>
  | {
      readonly kind: "savingThrowOutcome";
      readonly holeId: BattleHoleId;
      readonly value: readonly BattleSavingThrowOutcome[];
    }
  | {
      readonly kind: "targetChoice";
      readonly holeId: BattleHoleId;
      readonly value: CombatantId;
    }
  | {
      readonly kind: "deathSavingThrow";
      readonly holeId: BattleHoleId;
      readonly value: DieRollResult;
    }
  | {
      readonly kind: "statBlockRechargeRoll";
      readonly holeId: BattleHoleId;
      readonly value: readonly BattleStatBlockRechargeRollResult[];
    }
  | {
      readonly kind: "concentrationSavingThrow";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly succeeded: boolean;
      };
    }
  | {
      readonly kind: "reactionDecision";
      readonly holeId: BattleHoleId;
      readonly value: BattleReactionDecision;
    }
  | {
      readonly kind: "movement";
      readonly holeId: BattleHoleId;
      readonly value: BattleMovementFillValue;
    }
  | {
      readonly kind: "abilityCheck";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly total: number;
      };
    }
  | {
      readonly kind: "grappleOutcome";
      readonly holeId: BattleHoleId;
      readonly value: {
        readonly succeeded: boolean;
      };
    };

const BattleDieRollResultSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.greaterThan(0),
  Schema.brand("PositiveInteger"),
  Schema.brand("DieRollResult"),
);
const BattleD20DieRollResultSchema = Schema.Number.pipe(
  Schema.int(),
  Schema.between(1, 20),
  Schema.brand("PositiveInteger"),
  Schema.brand("DieRollResult"),
);
const BattleAttackRollResultSchema = Schema.Struct({
  total: Schema.Number.pipe(Schema.int()),
  naturalD20: BattleD20DieRollResultSchema,
  rollMode: Schema.optionalWith(Schema.Literal(...ATTACK_ROLL_MODES), {
    exact: true,
  }),
});
const BattleRolledDiceGroupSchema = Schema.Struct({
  results: Schema.NonEmptyArray(BattleDieRollResultSchema),
});

type BattleFillEncoded =
  | {
      readonly kind: "targetChoice";
      readonly holeId: string;
      readonly value: string;
    }
  | {
      readonly kind: "attackRoll";
      readonly holeId: string;
      readonly value: {
        readonly total: number;
        readonly naturalD20: number;
        readonly rollMode?: (typeof ATTACK_ROLL_MODES)[number];
      };
    }
  | {
      readonly kind: "savingThrowOutcome";
      readonly holeId: string;
      readonly value: readonly {
        readonly targetId: string;
        readonly succeeded: boolean;
      }[];
    }
  | {
      readonly kind: "rolledDice";
      readonly holeId: string;
      readonly value: readonly [
        {
          readonly results: readonly [number, ...number[]];
        },
        ...{
          readonly results: readonly [number, ...number[]];
        }[],
      ];
    }
  | {
      readonly kind: "deathSavingThrow";
      readonly holeId: string;
      readonly value: number;
    }
  | {
      readonly kind: "statBlockRechargeRoll";
      readonly holeId: string;
      readonly value: readonly {
        readonly target: {
          readonly section: StatBlockPartSection;
          readonly name: string;
        };
        readonly roll: number;
      }[];
    }
  | {
      readonly kind: "concentrationSavingThrow";
      readonly holeId: string;
      readonly value: {
        readonly succeeded: boolean;
      };
    }
  | {
      readonly kind: "reactionDecision";
      readonly holeId: string;
      readonly value:
        | {
            readonly kind: "decline";
            readonly reactorId: string;
          }
        | {
            readonly kind: "resolve";
            readonly reactorId: string;
            readonly choice:
              | {
                  readonly kind: "releaseReadiedSpell";
                  readonly readiedSpellCasterId: string;
                  readonly fills: readonly BattleFillEncoded[];
                }
              | {
                  readonly kind: "opportunityAttack";
                  readonly reactorId: string;
                  readonly fills: readonly BattleFillEncoded[];
                };
          };
    }
  | {
      readonly kind: "movement";
      readonly holeId: string;
      readonly value: {
        readonly movementCostFeet: number;
        readonly distanceMovedFeet: number;
        readonly destinationDistances: readonly {
          readonly combatantId: string;
          readonly feet: number;
        }[];
      };
    }
  | {
      readonly kind: "abilityCheck";
      readonly holeId: string;
      readonly value: {
        readonly total: number;
      };
    }
  | {
      readonly kind: "grappleOutcome";
      readonly holeId: string;
      readonly value: {
        readonly succeeded: boolean;
      };
    };

export const BattleFillSchema: Schema.Schema<
  BattleFill,
  BattleFillEncoded,
  never
> = Schema.suspend(() =>
  Schema.Union(
    Schema.Struct({
      kind: Schema.Literal("targetChoice"),
      holeId: BattleHoleIdSchema,
      value: CombatantId,
    }),
    Schema.Struct({
      kind: Schema.Literal("attackRoll"),
      holeId: BattleHoleIdSchema,
      value: BattleAttackRollResultSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("savingThrowOutcome"),
      holeId: BattleHoleIdSchema,
      value: Schema.Array(
        Schema.Struct({
          targetId: CombatantId,
          succeeded: Schema.Boolean,
        }),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("rolledDice"),
      holeId: BattleHoleIdSchema,
      value: Schema.NonEmptyArray(BattleRolledDiceGroupSchema),
    }),
    Schema.Struct({
      kind: Schema.Literal("deathSavingThrow"),
      holeId: BattleHoleIdSchema,
      value: BattleD20DieRollResultSchema,
    }),
    Schema.Struct({
      kind: Schema.Literal("statBlockRechargeRoll"),
      holeId: BattleHoleIdSchema,
      value: Schema.Array(
        Schema.Struct({
          target: Schema.Struct({
            section: Schema.Literal(
              "actions",
              "bonusActions",
              "reactions",
              "legendaryActions",
            ),
            name: Schema.String,
          }),
          roll: BattleDieRollResultSchema,
        }),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("concentrationSavingThrow"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        succeeded: Schema.Boolean,
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("reactionDecision"),
      holeId: BattleHoleIdSchema,
      value: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("decline"),
          reactorId: CombatantId,
        }),
        Schema.Struct({
          kind: Schema.Literal("resolve"),
          reactorId: CombatantId,
          choice: Schema.Union(
            Schema.Struct({
              kind: Schema.Literal("releaseReadiedSpell"),
              readiedSpellCasterId: CombatantId,
              fills: Schema.Array(BattleFillSchema),
            }),
            Schema.Struct({
              kind: Schema.Literal("opportunityAttack"),
              reactorId: CombatantId,
              fills: Schema.Array(BattleFillSchema),
            }),
          ),
        }),
      ),
    }),
    Schema.Struct({
      kind: Schema.Literal("movement"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        movementCostFeet: Schema.Number.pipe(Schema.int()),
        distanceMovedFeet: Schema.Number.pipe(Schema.int()),
        destinationDistances: Schema.Array(
          Schema.Struct({
            combatantId: CombatantId,
            feet: Schema.Number.pipe(Schema.int()),
          }),
        ),
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("abilityCheck"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        total: Schema.Number.pipe(Schema.int()),
      }),
    }),
    Schema.Struct({
      kind: Schema.Literal("grappleOutcome"),
      holeId: BattleHoleIdSchema,
      value: Schema.Struct({
        succeeded: Schema.Boolean,
      }),
    }),
  ),
).annotations({ identifier: "BattleFill" });

export type BattleResolutionInput = {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
};
type BattleResolutionInputForSubject<TSubject extends BattleSubject> = Omit<
  BattleResolutionInput,
  "subject"
> & {
  readonly subject: TSubject;
};
type AttackBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<BattleSubject, { readonly tag: "action"; readonly action: "attack" }>
> & {
  readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
};
type OffHandAttackBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<
    BattleSubject,
    { readonly tag: "bonusAction"; readonly action: "offHandAttack" }
  >
>;
type HideBattleResolutionInput = BattleResolutionInputForSubject<
  ActionHideSubject | BonusActionHideSubject
>;
type SearchBattleResolutionInput =
  BattleResolutionInputForSubject<ActionSearchSubject>;
type GrappleBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<BattleSubject, { readonly tag: "action"; readonly action: "grapple" }>
>;
type EscapeGrappleBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "escapeGrapple" }
  >
>;
type ActionSpellBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<BattleSubject, { readonly tag: "actionSpell" }>
> & {
  readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  readonly reactionContinuationSubject?: BattleSubject | undefined;
};
type UnitFeatureBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<BattleSubject, { readonly tag: "unitFeature" }>
>;

export const BATTLE_INVALID_REASON_CODES = [
  "staleSubject",
  "wrongActor",
  "missingCombatant",
  "invalidFill",
  "unsupportedSubject",
  "unsupportedActOption",
] as const;
export type BattleInvalidReasonCode =
  (typeof BATTLE_INVALID_REASON_CODES)[number];

export type BattleResolutionResult =
  | {
      readonly tag: "resolved";
      readonly state: BattleState;
      readonly snapshot: BattleSnapshot;
    }
  | {
      readonly tag: "needsHoles";
      readonly state: BattleState;
      readonly subject: BattleSubject;
      readonly holes: readonly BattleHole[];
      readonly snapshot: BattleSnapshot;
    }
  | {
      readonly tag: "invalid";
      readonly reason: BattleInvalidReasonCode;
      readonly message: string;
      readonly snapshot: BattleSnapshot;
    };

export type BattleSnapshot = {
  readonly battleId: BattleId;
  readonly round: RoundType;
  readonly currentActorId: CombatantId;
  readonly turnOrder: readonly CombatantId[];
  readonly combatants: readonly BattleCreatureSnapshot[];
  readonly acts: readonly AvailableBattleAct[];
  readonly currentTurnResources: BattleTurnResources;
  readonly readiedSpells: readonly (BattleReadiedSpell & {
    readonly casterId: CombatantId;
  })[];
  readonly pendingReaction: {
    readonly frame: BattleReactionFrame;
    readonly decisionHole: BattleReactionDecisionHole;
    readonly stackDepth: number;
  } | null;
};

export type BattleCreatureSnapshot = {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly originKind: BattleCreatureState["origin"]["kind"];
  readonly hp: Hp;
  readonly maxHp: Hp;
  readonly tempHp: Hp;
  readonly armorClass: ArmorClass;
  readonly size: Size;
  readonly defeated: boolean;
  readonly zeroHpLifecycle: BattleCreatureZeroHpLifecycleSnapshot;
  readonly conditions: readonly Condition[];
  readonly hidden: BattleHiddenState | null;
  readonly activeEffects: readonly BattleActiveEffect[];
  readonly concentration: BattleConcentration | null;
  readonly reactionAvailable: boolean;
  readonly hands: {
    readonly left: HandUse;
    readonly right: HandUse;
  };
  readonly grappling: readonly BattleGrappleLink[];
  readonly grappledBy: BattleGrappleLink | null;
  readonly statBlockResources?: StatBlockResourceSnapshot;
  readonly movement: {
    readonly speedFeet: MovementFeet;
    readonly spentFeet: MovementFeet;
    readonly remainingFeet: MovementFeet;
  };
};
type CharacterBattleCreatureState = BattleCreatureState & {
  readonly origin: Extract<
    BattleCreatureState["origin"],
    { readonly kind: "character" }
  >;
};

export type BattleCreatureZeroHpLifecycleSnapshot =
  | {
      readonly policy: "diesAtZeroHp";
      readonly dead: boolean;
    }
  | {
      readonly policy: "usesDeathSavingThrows";
      readonly deathSaves: DeathSaves;
      readonly stable: boolean;
      readonly dead: boolean;
    };

const INITIAL_ROUND: RoundType = Round(1);
const INITIAL_TURN_RESOURCES = resetTurnActionEconomy({
  actionResources: [],
  currentHasBonusAction: false,
});
const ATTACK_TARGET_HOLE_ID = holeId("battle:attack:target");
const ATTACK_ROLL_HOLE_ID = holeId("battle:attack:roll");
const ATTACK_TARGET_HOLE_INSTANCE = holeInstanceKey("battle:attack:target");
const ATTACK_ROLL_HOLE_INSTANCE = holeInstanceKey("battle:attack:roll");
const DEATH_SAVING_THROW_HOLE_ID = holeId("battle:end-turn:death-saving-throw");
const DEATH_SAVING_THROW_HOLE_INSTANCE = holeInstanceKey(
  "battle:end-turn:death-saving-throw",
);
const STAT_BLOCK_RECHARGE_ROLL_HOLE_ID = holeId(
  "battle:end-turn:stat-block-recharge-roll",
);
const STAT_BLOCK_RECHARGE_ROLL_HOLE_INSTANCE = holeInstanceKey(
  "battle:end-turn:stat-block-recharge-roll",
);
const CONCENTRATION_SAVING_THROW_HOLE_INSTANCE_PREFIX =
  "battle:concentration:saving-throw";
const REACTION_DECISION_HOLE_ID = holeId("battle:reaction:decision");
const REACTION_DECISION_HOLE_INSTANCE = holeInstanceKey(
  "battle:reaction:decision",
);
const MOVEMENT_HOLE_ID = holeId("battle:movement");
const MOVEMENT_HOLE_INSTANCE = holeInstanceKey("battle:movement");
const HIDE_ABILITY_CHECK_HOLE_ID = holeId("battle:hide:stealth-check");
const HIDE_ABILITY_CHECK_HOLE_INSTANCE = holeInstanceKey(
  "battle:hide:stealth-check",
);
const SEARCH_TARGET_HOLE_ID = holeId("battle:search:target");
const SEARCH_TARGET_HOLE_INSTANCE = holeInstanceKey("battle:search:target");
const SEARCH_ABILITY_CHECK_HOLE_ID = holeId("battle:search:perception-check");
const SEARCH_ABILITY_CHECK_HOLE_INSTANCE = holeInstanceKey(
  "battle:search:perception-check",
);
const GRAPPLE_TARGET_HOLE_ID = holeId("battle:grapple:target");
const GRAPPLE_TARGET_HOLE_INSTANCE = holeInstanceKey("battle:grapple:target");
const GRAPPLE_OUTCOME_HOLE_ID = holeId("battle:grapple:outcome");
const GRAPPLE_OUTCOME_HOLE_INSTANCE = holeInstanceKey("battle:grapple:outcome");
const ESCAPE_GRAPPLE_OUTCOME_HOLE_ID = holeId("battle:escape-grapple:outcome");
const ESCAPE_GRAPPLE_OUTCOME_HOLE_INSTANCE = holeInstanceKey(
  "battle:escape-grapple:outcome",
);
const ACTION_SURGE_UNIT_ID = "fighter_action_surge";
const SECOND_WIND_UNIT_ID = "fighter_second_wind";
const SECOND_WIND_HEALING_ROLL_HOLE_ID = holeId(
  "battle:unit-feature:second-wind:healing-roll",
);
const SECOND_WIND_HEALING_ROLL_HOLE_INSTANCE = holeInstanceKey(
  "battle:unit-feature:second-wind:healing-roll",
);
const DEFAULT_INITIAL_COMBATANT_DISTANCE_FEET = 5;
const HIDE_DC = 15;

type SupportedActionSurgeUnitFeature = {
  readonly unit: UnitRecord;
  readonly restriction: ActionRestriction;
};
type SupportedSecondWindUnitFeature = {
  readonly unit: UnitRecord;
  readonly dice: number;
  readonly dieSize: number;
  readonly flatBase: number;
  readonly flatPerLevel: number;
  readonly startingAtLevel: number;
  readonly className: ClassName;
  readonly classLevel: ClassLevel;
};

export function startBattle(input: {
  readonly battleId: BattleId;
  readonly combatants: readonly BattleCreatureInit[];
  readonly combatantDistances?: readonly BattleCombatantDistance[];
  readonly hidePrerequisites?: ReadonlyMap<CombatantId, BattleHidePrerequisite>;
}): BattleState {
  if (input.combatants.length === 0) {
    throw new Error("startBattle requires at least one combatant.");
  }

  const combatants = new Map<CombatantId, BattleCreatureState>();
  for (const combatant of input.combatants) {
    if (combatants.has(combatant.combatantId)) {
      throw new Error(`Duplicate combatant id: ${combatant.combatantId}`);
    }
    combatants.set(
      combatant.combatantId,
      battleCreatureStateFromInit(combatant),
    );
  }
  assertHidePrerequisitesReferenceCombatants(
    input.hidePrerequisites ?? new Map(),
    combatants,
  );

  const orderedEntries = input.combatants
    .map((combatant, callerOrder) => ({ combatant, callerOrder }))
    .sort(
      (left, right) =>
        right.combatant.initiative - left.combatant.initiative ||
        left.callerOrder - right.callerOrder,
    )
    .map(({ combatant }) => ({
      creature: combatant.combatantId,
      initiative: combatant.initiative,
    }));
  if (!isNonEmptyReadonlyArray(orderedEntries)) {
    throw new Error("startBattle requires at least one combatant.");
  }

  const initiative = createScoredInitiativeStack<CombatantId>(
    orderedEntries,
    INITIAL_ROUND,
  );
  if (Either.isLeft(initiative)) {
    throw new Error(initiative.left);
  }

  return {
    battleId: input.battleId,
    initiative: initiative.right,
    combatants,
    hidePrerequisites: new Map(input.hidePrerequisites ?? []),
    combatantDistances: battleCombatantDistances(input),
    currentTurnResources: INITIAL_TURN_RESOURCES,
    readiedSpells: new Map(),
    grapples: [],
    interruptStack: [],
    legendaryActionWindow: null,
  };
}

export function discoverBattleActs(
  state: BattleState,
): readonly AvailableBattleAct[] {
  const acts: AvailableBattleAct[] = [...releaseGrappleActs(state)];
  const actorId = currentActorId(state);
  if (!state.combatants.has(actorId)) {
    return acts;
  }
  const attackActionOptions = attackActionOptionsForActor(
    state,
    actorId,
  ).filter(attackActionOptionIsOrdinaryAttackAction);
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "attack") &&
    attackActionOptions.some(
      (attack) => attackTargetChoices(state, actorId, attack).length > 0,
    )
  ) {
    acts.push(
      ...attackActionOptions.flatMap((attack) => {
        const targetHole = attackTargetHole(state, actorId, attack);
        return targetHole.choices.length === 0
          ? []
          : [
              {
                subject: {
                  tag: "action" as const,
                  actorId,
                  action: "attack" as const,
                  attackName: attackActionOptionName(attack),
                  ...statBlockSubjectPart(attack),
                },
                label: "Attack",
                summary: `Take the Attack action with ${attackActionOptionName(attack)}.`,
                initialHoles: [targetHole],
              },
            ];
      }),
    );
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "hide") &&
    canHideInCurrentCircumstances(state, actorId)
  ) {
    acts.push({
      subject: { tag: "action", actorId, action: "hide" },
      label: "Hide",
      summary: "Make a Dexterity (Stealth) check to become hidden.",
      initialHoles: [hideAbilityCheckHole()],
    });
  }
  const hiddenTargets = hiddenSearchTargetChoices(state, actorId);
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "search") &&
    hiddenTargets.length > 0
  ) {
    acts.push({
      subject: { tag: "action", actorId, action: "search" },
      label: "Search",
      summary: "Make a Wisdom (Perception) check to find a hidden creature.",
      initialHoles: [searchTargetHole(state, actorId)],
    });
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "attack") &&
    grappleTargetChoices(state, actorId).length > 0
  ) {
    acts.push({
      subject: { tag: "action", actorId, action: "grapple" },
      label: "Grapple",
      summary: "Replace one attack with an Unarmed Strike Grapple.",
      initialHoles: [grappleTargetHole(state, actorId)],
    });
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "attack") &&
    grappledBy(state, actorId) !== undefined
  ) {
    const grapple = grappledBy(state, actorId);
    if (grapple !== undefined) {
      acts.push({
        subject: { tag: "action", actorId, action: "escapeGrapple" },
        label: "Escape Grapple",
        summary: "Use an action to attempt to end the Grappled condition.",
        initialHoles: [escapeGrappleOutcomeHole(grapple, actorId)],
      });
    }
  }
  const offHand = offHandAttackActionOptionForActor(state, actorId);
  if (
    offHand !== undefined &&
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    state.currentTurnResources.currentHasBonusAction &&
    offHandAttackPrerequisiteMet(state, actorId, offHand) &&
    attackTargetChoices(state, actorId, offHand).length > 0
  ) {
    acts.push({
      subject: {
        tag: "bonusAction",
        actorId,
        action: "offHandAttack",
        attackName: attackActionOptionName(offHand),
      },
      label: "Off-Hand Attack",
      summary: `Make the Light property Bonus Action attack with ${attackActionOptionName(offHand)}.`,
      initialHoles: [attackTargetHole(state, actorId, offHand)],
    });
  }
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    state.currentTurnResources.currentHasBonusAction &&
    canUseCunningActionHide(state.combatants.get(actorId)) &&
    canHideInCurrentCircumstances(state, actorId)
  ) {
    acts.push({
      subject: { tag: "bonusAction", actorId, action: "hide" },
      label: "Hide",
      summary: "Use Cunning Action to Hide as a Bonus Action.",
      initialHoles: [hideAbilityCheckHole()],
    });
  }
  acts.push(...supportedUnitFeatureActs(state, actorId));
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "magic")
  ) {
    acts.push(...discoverSupportedSpellActs(state, actorId));
  }
  const movementHoleForActor = movementHole(state, actorId);
  if (
    combatantCanMoveInState(state, actorId) &&
    state.combatants.size > 1 &&
    Number(movementHoleForActor.movementBudgetFeet) > 0
  ) {
    acts.push({
      subject: { tag: "runtimeCommand", actorId, command: "move" },
      label: "Move",
      summary: "Spend Movement and update combatant distances.",
      initialHoles: [movementHoleForActor],
    });
  }
  acts.push({
    subject: { tag: "runtimeCommand", actorId, command: "endTurn" },
    label: "End Turn",
    summary: "End the current combatant's turn.",
    initialHoles: [],
  });
  acts.push(
    ...[...state.readiedSpells].map(([casterId, readiedSpell]) => ({
      subject: {
        tag: "runtimeCommand" as const,
        actorId,
        command: "releaseReadiedSpell" as const,
        readiedSpellCasterId: casterId,
      },
      label: `Release ${readiedSpell.invocation.spell.name}`,
      summary: `Release ${readiedSpell.invocation.spell.name} with a Reaction.`,
      initialHoles: readiedSpellInitialHoles(state, casterId, readiedSpell),
    })),
  );
  acts.push(...discoverLegendaryActionActs(state));

  return acts;
}

function releaseGrappleActs(state: BattleState): readonly AvailableBattleAct[] {
  return state.grapples.map((grapple) => ({
    subject: {
      tag: "runtimeCommand" as const,
      actorId: grapple.grapplerId,
      command: "releaseGrapple" as const,
      targetId: grapple.targetId,
    },
    label: "Release Grapple",
    summary: "Release a grappled target without spending an action.",
    initialHoles: [],
  }));
}

export function resolveBattleSubject(
  input: BattleResolutionInput,
): BattleResolutionResult {
  return resolveBattleSubjectInternal(input, {});
}

function resolveBattleSubjectInternal(
  input: BattleResolutionInput,
  options: {
    readonly replayingInterruptedProcedure?: boolean;
    readonly suppressedReactionTrigger?: BattleReactionTrigger;
  },
): BattleResolutionResult {
  if (
    input.state.interruptStack.length > 0 &&
    options.replayingInterruptedProcedure !== true
  ) {
    const activeFrame = currentReactionFrame(input.state);
    const activeReaction = activeFrame?.activeReaction;
    if (
      activeReaction !== undefined &&
      sameBattleSubject(input.subject, activeReaction.subject)
    ) {
      const reactionResult = resolveBattleSubjectInternal(input, {
        replayingInterruptedProcedure: true,
        ...(activeReaction.suppressedReactionTrigger === undefined
          ? {}
          : {
              suppressedReactionTrigger:
                activeReaction.suppressedReactionTrigger,
            }),
      });
      return reactionResult.tag === "resolved"
        ? completeActiveReactionProcedure(reactionResult.state)
        : reactionResult;
    }
    return invalidResult(
      input.state,
      "staleSubject",
      "A pending Reaction window must be resolved before the interrupted procedure can continue.",
    );
  }

  const actorId = battleSubjectActorId(input.subject);
  if (
    actorId !== currentActorId(input.state) &&
    !isLegendaryAttackSubject(input.subject) &&
    !isReleaseGrappleSubject(input.subject)
  ) {
    return invalidResult(
      input.state,
      "wrongActor",
      "Subject actor is not the current actor.",
    );
  }
  if (
    isLegendaryAttackSubject(input.subject) &&
    !statBlockLegendaryActionWindowIsOpen(input.state, actorId)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Legendary Actions are available only after another creature's turn ends.",
    );
  }

  if (!input.state.combatants.has(actorId)) {
    return invalidResult(
      input.state,
      "missingCombatant",
      "Subject actor is not in this battle.",
    );
  }

  if (
    input.subject.tag === "action" &&
    (input.subject.action === "attack" ||
      input.subject.action === "hide" ||
      input.subject.action === "search" ||
      input.subject.action === "grapple" ||
      input.subject.action === "escapeGrapple") &&
    !combatantCanTakeActions(input.state.combatants.get(actorId))
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack is no longer available for the current actor.",
    );
  }

  const standardActionKind = standardActionKindForSubject(input.subject);
  if (
    standardActionKind !== null &&
    !canSpendAction(input.state.currentTurnResources, standardActionKind)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack is no longer available for the current actor.",
    );
  }
  if (
    input.subject.tag === "bonusAction" &&
    (!combatantCanTakeActions(input.state.combatants.get(actorId)) ||
      !input.state.currentTurnResources.currentHasBonusAction)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action is no longer available for the current actor.",
    );
  }
  if (
    input.subject.tag === "actionSpell" &&
    (!combatantCanTakeActions(input.state.combatants.get(actorId)) ||
      !canSpendAction(input.state.currentTurnResources, "magic"))
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }

  if (
    input.subject.tag === "unitFeature" &&
    !combatantCanTakeActions(input.state.combatants.get(actorId))
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Unit feature is no longer available for the current actor.",
    );
  }

  const result = Match.value(input.subject).pipe(
    Match.when({ tag: "action", action: "attack" }, (subject) =>
      resolveAttack({
        ...input,
        subject,
        suppressedReactionTrigger: options.suppressedReactionTrigger,
      }),
    ),
    Match.when({ tag: "action", action: "hide" }, (subject) =>
      resolveHide({ ...input, subject: actionHideSubject(subject) }),
    ),
    Match.when({ tag: "action", action: "search" }, (subject) =>
      resolveSearch({ ...input, subject: actionSearchSubject(subject) }),
    ),
    Match.when({ tag: "action", action: "grapple" }, (subject) =>
      resolveGrapple({ ...input, subject }),
    ),
    Match.when({ tag: "action", action: "escapeGrapple" }, (subject) =>
      resolveEscapeGrapple({ ...input, subject }),
    ),
    Match.when({ tag: "bonusAction", action: "offHandAttack" }, (subject) =>
      resolveOffHandAttack({ ...input, subject }),
    ),
    Match.when({ tag: "bonusAction", action: "hide" }, (subject) =>
      resolveHide({ ...input, subject: bonusActionHideSubject(subject) }),
    ),
    Match.when({ tag: "actionSpell" }, (subject) =>
      resolveSpellAct({
        ...input,
        subject,
        suppressedReactionTrigger: options.suppressedReactionTrigger,
      }),
    ),
    Match.when({ tag: "unitFeature" }, (subject) =>
      resolveUnitFeature({ ...input, subject }),
    ),
    Match.when({ tag: "runtimeCommand", command: "endTurn" }, () =>
      resolveEndTurnCommand(input),
    ),
    Match.when({ tag: "runtimeCommand", command: "move" }, () =>
      resolveMoveCommand(input),
    ),
    Match.when({ tag: "runtimeCommand", command: "releaseReadiedSpell" }, () =>
      resolveReleaseReadiedSpellCommand(input, {
        suppressedReactionTrigger: options.suppressedReactionTrigger,
      }),
    ),
    Match.when(
      { tag: "runtimeCommand", command: "releaseGrapple" },
      (subject) => resolveReleaseGrappleCommand({ ...input, subject }),
    ),
    Match.when(
      { tag: "runtimeCommand", command: "opportunityAttack" },
      (subject) => resolveOpportunityAttackCommand({ ...input, subject }),
    ),
    Match.exhaustive,
  );
  return consumeOrCloseLegendaryActionWindow(input.subject, result);
}

function actionHideSubject(subject: {
  readonly tag: "action";
  readonly actorId: CombatantId;
  readonly action: "hide";
}): ActionHideSubject {
  return {
    tag: "action",
    actorId: subject.actorId,
    action: "hide",
  };
}

function actionSearchSubject(subject: {
  readonly tag: "action";
  readonly actorId: CombatantId;
  readonly action: "search";
}): ActionSearchSubject {
  return {
    tag: "action",
    actorId: subject.actorId,
    action: "search",
  };
}

function bonusActionHideSubject(subject: {
  readonly tag: "bonusAction";
  readonly actorId: CombatantId;
  readonly action: "hide";
}): BonusActionHideSubject {
  return {
    tag: "bonusAction",
    actorId: subject.actorId,
    action: "hide",
  };
}

function isReleaseGrappleSubject(
  subject: BattleSubject,
): subject is Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "releaseGrapple" }
> {
  return (
    subject.tag === "runtimeCommand" && subject.command === "releaseGrapple"
  );
}

function standardActionKindForSubject(
  subject: BattleSubject,
): StandardActionKind | null {
  if (subject.tag !== "action" || isLegendaryAttackSubject(subject)) {
    return null;
  }
  return Match.value(subject.action).pipe(
    Match.when("attack", () => "attack" as const),
    Match.when("hide", () => "hide" as const),
    Match.when("search", () => "search" as const),
    Match.when("grapple", () => "attack" as const),
    Match.when("escapeGrapple", () => "attack" as const),
    Match.exhaustive,
  );
}

function consumeOrCloseLegendaryActionWindow(
  subject: BattleSubject,
  result: BattleResolutionResult,
): BattleResolutionResult {
  if (result.tag !== "resolved") return result;
  if (subject.tag === "runtimeCommand" && subject.command === "endTurn") {
    return result;
  }
  const state = isLegendaryAttackSubject(subject)
    ? consumeLegendaryActionWindow(result.state)
    : closeLegendaryActionWindow(result.state);
  return state === result.state
    ? result
    : { ...result, state, snapshot: snapshotBattle(state) };
}

export function openBattleReactionWindow(input: {
  readonly state: BattleState;
  readonly frame: BattleReactionFrame;
}): BattleState {
  return {
    ...input.state,
    interruptStack: [...input.state.interruptStack, input.frame],
  };
}

export function resolveBattleReaction(input: {
  readonly state: BattleState;
  readonly fill: Extract<BattleFill, { readonly kind: "reactionDecision" }>;
}): BattleResolutionResult {
  const frame = currentReactionFrame(input.state);
  if (frame === null) {
    return invalidResult(
      input.state,
      "staleSubject",
      "No Reaction window is pending.",
    );
  }
  if (input.fill.holeId !== REACTION_DECISION_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Reaction decision fill does not match the pending Reaction window.",
    );
  }

  const reactor = input.state.combatants.get(input.fill.value.reactorId);
  if (
    reactor === undefined ||
    !unofferedEligibleReactors(frame).includes(input.fill.value.reactorId)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Reaction decision reactor is not eligible for the pending Reaction window.",
    );
  }

  if (input.fill.value.kind === "resolve" && !reactor.reactionAvailable) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Selected reactor has no Reaction available.",
    );
  }

  if (input.fill.value.kind === "resolve") {
    const choice = admittedReactionChoice(frame, input.fill.value);
    if (choice === null) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Reaction choice is not admitted for the pending Reaction window.",
      );
    }
    const activeFrame = {
      ...frame,
      activeReaction: {
        reactorId: input.fill.value.reactorId,
        subject: choice.subject,
        fills: input.fill.value.choice.fills,
      },
    };
    const stackWithoutCurrent = input.state.interruptStack.slice(0, -1);
    const activeState = spendReaction(
      {
        ...input.state,
        interruptStack: [...stackWithoutCurrent, activeFrame],
      },
      input.fill.value.reactorId,
    );
    const reactionResult = resolveBattleSubjectInternal(
      {
        state: activeState,
        subject: choice.subject,
        fills: input.fill.value.choice.fills,
      },
      { replayingInterruptedProcedure: true },
    );
    return reactionResult.tag === "resolved"
      ? completeActiveReactionProcedure(reactionResult.state)
      : reactionResult;
  }

  const updatedFrame = {
    ...frame,
    offeredReactors: [...frame.offeredReactors, input.fill.value.reactorId],
  };
  const remainingReactors = unofferedEligibleReactors(updatedFrame);
  const stackWithoutCurrent = input.state.interruptStack.slice(0, -1);
  const closedState =
    remainingReactors.length === 0
      ? {
          ...input.state,
          interruptStack: stackWithoutCurrent,
        }
      : {
          ...input.state,
          interruptStack: [...stackWithoutCurrent, updatedFrame],
        };
  const nextState =
    remainingReactors.length === 0
      ? suppressReactionTriggerForActiveReaction(closedState, frame.trigger)
      : closedState;

  return remainingReactors.length === 0
    ? resumeInterruptedProcedure(nextState, frame.continuation, frame.trigger)
    : {
        tag: "resolved",
        state: nextState,
        snapshot: snapshotBattle(nextState),
      };
}

function spendReaction(
  state: BattleState,
  reactorId: CombatantId,
): BattleState {
  const reactor = state.combatants.get(reactorId);
  if (reactor === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(reactorId, {
      ...reactor,
      reactionAvailable: false,
    }),
  };
}

function admittedReactionChoice(
  frame: BattleReactionFrame,
  decision: Extract<BattleReactionDecision, { readonly kind: "resolve" }>,
): BattleReactionProcedureChoice | null {
  return (
    frame.choices.find(
      (choice) =>
        choice.kind === decision.choice.kind &&
        choice.reactorId === decision.reactorId &&
        (choice.kind === "releaseReadiedSpell"
          ? decision.choice.kind === "releaseReadiedSpell" &&
            choice.readiedSpellCasterId === decision.choice.readiedSpellCasterId
          : decision.choice.kind === "opportunityAttack" &&
            choice.reactorId === decision.choice.reactorId),
    ) ?? null
  );
}

function completeActiveReactionProcedure(
  state: BattleState,
): BattleResolutionResult {
  const frame = currentReactionFrame(state);
  const activeReaction = frame?.activeReaction;
  if (frame === null || activeReaction === undefined) {
    return invalidResult(
      state,
      "staleSubject",
      "No active Reaction procedure is pending completion.",
    );
  }
  const { activeReaction: _completedReaction, ...inactiveFrame } = frame;
  const completedFrame: BattleReactionFrame = {
    ...inactiveFrame,
    offeredReactors: [...frame.offeredReactors, activeReaction.reactorId],
  };
  const remainingReactors = unofferedEligibleReactors(completedFrame);
  const stackWithoutCurrent = state.interruptStack.slice(0, -1);
  const closedState =
    remainingReactors.length === 0
      ? { ...state, interruptStack: stackWithoutCurrent }
      : { ...state, interruptStack: [...stackWithoutCurrent, completedFrame] };
  const nextState =
    remainingReactors.length === 0
      ? suppressReactionTriggerForActiveReaction(closedState, frame.trigger)
      : closedState;

  return remainingReactors.length === 0
    ? resumeInterruptedProcedure(nextState, frame.continuation, frame.trigger)
    : {
        tag: "resolved",
        state: nextState,
        snapshot: snapshotBattle(nextState),
      };
}

function suppressReactionTriggerForActiveReaction(
  state: BattleState,
  suppressedReactionTrigger: BattleReactionTrigger,
): BattleState {
  const frame = currentReactionFrame(state);
  if (frame?.activeReaction === undefined) {
    return state;
  }
  return {
    ...state,
    interruptStack: [
      ...state.interruptStack.slice(0, -1),
      {
        ...frame,
        activeReaction: {
          ...frame.activeReaction,
          suppressedReactionTrigger,
        },
      },
    ],
  };
}

function resumeInterruptedProcedure(
  state: BattleState,
  continuation: BattleInterruptedProcedure,
  suppressedReactionTrigger: BattleReactionTrigger,
): BattleResolutionResult {
  if (continuation.kind === "resolved") {
    return {
      tag: "resolved",
      state,
      snapshot: snapshotBattle(state),
    };
  }
  if (continuation.kind === "movement") {
    const nextState = applyBattleMovement(state, continuation.movement);
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }

  return resolveBattleSubjectInternal(
    {
      state,
      subject: continuation.subject,
      fills: continuation.fills,
    },
    { replayingInterruptedProcedure: true, suppressedReactionTrigger },
  );
}

export function endTurn(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
}): BattleResolutionResult {
  const result = resolveBattleSubject({
    state: input.state,
    subject: {
      tag: "runtimeCommand",
      actorId: input.actorId,
      command: "endTurn",
    },
    fills: [],
  });

  return result;
}

export function snapshotBattle(state: BattleState): BattleSnapshot {
  const turnOrder = [...initiativeOrder(state.initiative)];

  return {
    battleId: state.battleId,
    round: state.initiative.round,
    currentActorId: currentActorId(state),
    turnOrder,
    combatants: turnOrder.flatMap((id) => {
      const combatant = state.combatants.get(id);
      return combatant == null ? [] : [combatantSnapshot(state, combatant)];
    }),
    acts: discoverBattleActs(state),
    currentTurnResources: state.currentTurnResources,
    readiedSpells: [...state.readiedSpells].map(([casterId, readiedSpell]) => ({
      casterId,
      ...readiedSpell,
    })),
    pendingReaction: pendingReactionSnapshot(state),
  };
}

function pendingReactionSnapshot(
  state: BattleState,
): BattleSnapshot["pendingReaction"] {
  const frame = currentReactionFrame(state);
  return frame === null
    ? null
    : {
        frame,
        decisionHole: reactionDecisionHole(frame),
        stackDepth: state.interruptStack.length,
      };
}

function currentReactionFrame(state: BattleState): BattleReactionFrame | null {
  return state.interruptStack[state.interruptStack.length - 1] ?? null;
}

function reactionDecisionHole(
  frame: BattleReactionFrame,
): BattleReactionDecisionHole {
  return {
    holeInstanceKey: REACTION_DECISION_HOLE_INSTANCE,
    holeId: REACTION_DECISION_HOLE_ID,
    kind: "reactionDecision",
    label: `${reactionTriggerLabel(frame.trigger)} reaction decision`,
    trigger: frame.trigger,
    eligibleReactors: unofferedEligibleReactors(frame),
  };
}

function reactionTriggerLabel(trigger: BattleReactionTrigger): string {
  return Match.value(trigger).pipe(
    Match.when("attackHit", () => "Attack hit"),
    Match.when("spellCast", () => "Spell cast"),
    Match.when("saveFailed", () => "Failed save"),
    Match.when("afterDamage", () => "After damage"),
    Match.when("opportunityAttack", () => "Opportunity Attack"),
    Match.exhaustive,
  );
}

function unofferedEligibleReactors(
  frame: BattleReactionFrame,
): readonly CombatantId[] {
  const offered = new Set(frame.offeredReactors);
  return frame.eligibleReactors.filter((reactorId) => !offered.has(reactorId));
}

function maybeOpenReactionWindow(
  state: BattleState,
  frame: BattleReactionFrameInput,
  suppressedReactionTrigger: BattleReactionTrigger | undefined,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> | null {
  if (frame.trigger === suppressedReactionTrigger) {
    return null;
  }
  const choices = reactionChoices(state, frame);
  if (choices.length === 0) {
    return null;
  }
  const eligibleReactors = [
    ...new Set(choices.map((choice) => choice.reactorId)),
  ];
  const frameCommon = {
    eligibleReactors,
    offeredReactors: [],
    choices,
  } satisfies Pick<
    BattleReactionFrame,
    "eligibleReactors" | "offeredReactors" | "choices"
  >;
  const nextFrame: BattleReactionFrame = Match.value(frame).pipe(
    Match.when({ trigger: "attackHit" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.when({ trigger: "spellCast" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.when({ trigger: "saveFailed" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.when({ trigger: "afterDamage" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.when({ trigger: "opportunityAttack" }, (triggerFrame) => ({
      ...triggerFrame,
      ...frameCommon,
    })),
    Match.exhaustive,
  );
  const nextState = openBattleReactionWindow({ state, frame: nextFrame });
  const decisionHole = reactionDecisionHole(nextFrame);
  return {
    tag: "needsHoles",
    state: nextState,
    subject: frame.continuation.subject,
    holes: [decisionHole],
    snapshot: snapshotBattle(nextState),
  };
}

function readiedSpellReactionChoices(
  state: BattleState,
  trigger: BattleReactionTrigger,
): readonly BattleReactionProcedureChoice[] {
  const readiedChoices = [...state.readiedSpells].flatMap(
    ([casterId, readiedSpell]) => {
      const reactor = state.combatants.get(casterId);
      if (
        readiedSpell.trigger !== trigger ||
        reactor === undefined ||
        !reactor.reactionAvailable
      ) {
        return [];
      }
      return [
        {
          kind: "releaseReadiedSpell" as const,
          reactorId: casterId,
          readiedSpellCasterId: casterId,
          subject: {
            tag: "runtimeCommand" as const,
            actorId: currentActorId(state),
            command: "releaseReadiedSpell" as const,
            readiedSpellCasterId: casterId,
          },
        },
      ];
    },
  );
  return readiedChoices;
}

function reactionChoices(
  state: BattleState,
  frame: BattleReactionFrameInput,
): readonly BattleReactionProcedureChoice[] {
  const readiedChoices = readiedSpellReactionChoices(state, frame.trigger);
  return frame.trigger === "opportunityAttack"
    ? [
        ...readiedChoices,
        ...opportunityAttackReactionChoices(
          state,
          frame.moverId,
          frame.reactorIds,
        ),
      ]
    : readiedChoices;
}

function opportunityAttackReactionChoices(
  state: BattleState,
  moverId: CombatantId,
  reactorIds: readonly CombatantId[],
): readonly BattleReactionProcedureChoice[] {
  return reactorIds.flatMap((reactorId) => {
    const reactor = state.combatants.get(reactorId);
    if (reactor === undefined) {
      return [];
    }
    const attack = opportunityAttackOptionForReactor(state, reactorId, moverId);
    if (attack === undefined) return [];
    return [
      {
        kind: "opportunityAttack" as const,
        reactorId,
        subject: {
          tag: "runtimeCommand" as const,
          actorId: currentActorId(state),
          command: "opportunityAttack" as const,
          reactorId,
          targetId: moverId,
          attackName: attackActionOptionName(attack),
        },
      },
    ];
  });
}

function battleCreatureStateFromInit(
  input: BattleCreatureInit,
): BattleCreatureState {
  const creatureInit = input.creatureInit;
  assertCurrentHpWithinMaxHp(creatureInit);
  const zeroHpLifecycle = initialZeroHpLifecycleForCreatureOrigin(creatureInit);
  const base = {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: input.initiative,
    hp: creatureInit.currentHp,
    maxHp: creatureInit.maxHp,
    tempHp: creatureInit.tempHp,
    conditions: EMPTY_CONDITION_STATE,
    activeEffects: [],
    concentration: null,
    hidden: null,
    zeroHpLifecycle,
    reactionAvailable: true,
    movementSpentFeet: movementFeet(0),
  };

  if (creatureInit.kind === "character") {
    const classLevels = parseCharacterBattleClassLevels(
      creatureInit.classLevels,
    );
    assertCharacterBattleLoadoutMatchesHands(creatureInit);
    return applyInitialZeroHpLifecycle({
      ...base,
      armorClass: creatureInit.armorClass,
      size: creatureInit.size,
      origin: {
        kind: "character",
        characterId: creatureInit.characterId,
        characterUnitRefs: creatureInit.characterUnitRefs,
        classLevels,
        selectedLoadout: creatureInit.selectedLoadout,
        speed: creatureInit.speed,
        attack: creatureInit.attack,
        ...(creatureInit.offHandAttack === undefined
          ? {}
          : { offHandAttack: creatureInit.offHandAttack }),
        resources: (creatureInit.resources ?? []).map((resource) =>
          characterResourceState(resource, classLevels),
        ),
        ...(creatureInit.spellcasting === undefined
          ? {}
          : {
              spellcasting: characterSpellcastingState(
                creatureInit.spellcasting,
              ),
            }),
      },
    });
  }

  return applyInitialZeroHpLifecycle({
    ...base,
    armorClass: statBlockArmorClassState(
      literalStatBlockNumber(creatureInit.statBlock.statBlock.ac),
    ),
    size: literalCreatureSize(creatureInit.statBlock.statBlock.size),
    origin: {
      kind: "statBlock",
      statBlock: creatureInit.statBlock,
      resources: statBlockResourceState(creatureInit.statBlock.statBlock),
    },
  });
}

function assertHidePrerequisitesReferenceCombatants(
  hidePrerequisites: ReadonlyMap<CombatantId, BattleHidePrerequisite>,
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
): void {
  for (const combatantId of hidePrerequisites.keys()) {
    if (!combatants.has(combatantId)) {
      throw new Error("Hide prerequisite references unknown combatant.");
    }
  }
}

function assertCharacterBattleLoadoutMatchesHands(
  creatureInit: CharacterBattleCreatureInit,
): void {
  const shield = creatureInit.selectedLoadout.shield;
  const weapon = creatureInit.selectedLoadout.weapon;
  const offHandWeapon = creatureInit.selectedLoadout.offHandWeapon;
  if (shield !== undefined && offHandWeapon !== undefined) {
    throw new Error(
      "Character battle loadout cannot wield shield and off-hand weapon.",
    );
  }
  if (
    weapon?.grip === "two_handed" &&
    (shield !== undefined || offHandWeapon !== undefined)
  ) {
    throw new Error("Two-handed weapon grip requires both hands free.");
  }
  const expectedLeftHandUse: HandUse =
    shield === undefined
      ? offHandWeapon === undefined
        ? "free"
        : "offWeapon"
      : "shield";
  const expectedRightHandUse: HandUse =
    weapon === undefined ? "free" : "mainWeapon";
  if (
    creatureInit.armorClass.leftHandUse !== expectedLeftHandUse ||
    creatureInit.armorClass.rightHandUse !== expectedRightHandUse
  ) {
    throw new Error(
      "Character battle loadout must match armor-class hand state.",
    );
  }
  if (weapon?.grip === "two_handed") {
    return;
  }
}

function literalCreatureSize(
  creatureSize: StatBlockRecord["statBlock"]["size"],
): Size {
  if (typeof creatureSize !== "string") {
    throw new Error("Battle runtime requires a concrete creature Size.");
  }
  return creatureSize;
}

function battleCombatantDistances(input: {
  readonly combatants: readonly BattleCreatureInit[];
  readonly combatantDistances?: readonly BattleCombatantDistance[];
}): BattleState["combatantDistances"] {
  const distances = new Map<CombatantId, Map<CombatantId, number>>();
  const combatantIds = input.combatants.map(
    (combatant) => combatant.combatantId,
  );
  const authoredDistances =
    input.combatantDistances ??
    combatantIds.flatMap((combatantA, index) =>
      combatantIds.slice(index + 1).map((combatantB) => ({
        combatantA,
        combatantB,
        feet: DEFAULT_INITIAL_COMBATANT_DISTANCE_FEET,
      })),
    );
  const distanceIssue = validateBattleCombatantDistances({
    combatantIds,
    combatantDistances: authoredDistances,
    requireCompletePairs: input.combatantDistances !== undefined,
  });
  if (distanceIssue !== null) {
    throw new Error(battleCombatantDistanceValidationMessage(distanceIssue));
  }

  for (const distance of authoredDistances) {
    setBattleCombatantDistance(
      distances,
      distance.combatantA,
      distance.combatantB,
      distance.feet,
    );
    setBattleCombatantDistance(
      distances,
      distance.combatantB,
      distance.combatantA,
      distance.feet,
    );
  }

  return distances;
}

export function validateBattleCombatantDistances(input: {
  readonly combatantIds: readonly CombatantId[];
  readonly combatantDistances: readonly BattleCombatantDistance[];
  readonly requireCompletePairs: boolean;
}): BattleCombatantDistanceValidationIssue | null {
  const explicitDistancePairs = new Set<string>();

  for (const distance of input.combatantDistances) {
    if (!Number.isInteger(distance.feet) || distance.feet < 0) {
      return { tag: "invalidFeet" };
    }
    if (
      !input.combatantIds.includes(distance.combatantA) ||
      !input.combatantIds.includes(distance.combatantB)
    ) {
      return {
        tag: "unknownCombatant",
        combatantA: distance.combatantA,
        combatantB: distance.combatantB,
      };
    }
    if (distance.combatantA === distance.combatantB) {
      return {
        tag: "selfDistance",
        combatantId: distance.combatantA,
      };
    }

    const pairKey = combatantDistancePairKey(
      distance.combatantA,
      distance.combatantB,
    );
    if (explicitDistancePairs.has(pairKey)) {
      return {
        tag: "duplicatePair",
        combatantA: distance.combatantA,
        combatantB: distance.combatantB,
      };
    }
    explicitDistancePairs.add(pairKey);
  }

  if (input.requireCompletePairs) {
    const expectedPairCount =
      (input.combatantIds.length * (input.combatantIds.length - 1)) / 2;
    if (explicitDistancePairs.size !== expectedPairCount) {
      return {
        tag: "incompletePairs",
        expectedPairCount,
        actualPairCount: explicitDistancePairs.size,
      };
    }
  }

  return null;
}

function battleCombatantDistanceValidationMessage(
  issue: BattleCombatantDistanceValidationIssue,
): string {
  return Match.value(issue).pipe(
    Match.when(
      { tag: "invalidFeet" },
      () => "Battle combatant distance must be a non-negative integer.",
    ),
    Match.when(
      { tag: "unknownCombatant" },
      () => "Battle combatant distance references an unknown combatant.",
    ),
    Match.when(
      { tag: "selfDistance" },
      () => "Battle combatant distance requires two combatants.",
    ),
    Match.when(
      { tag: "duplicatePair" },
      () => "Duplicate battle combatant distance pair.",
    ),
    Match.when(
      { tag: "incompletePairs" },
      () => "Battle combatant distances must include every combatant pair.",
    ),
    Match.exhaustive,
  );
}

function combatantDistancePairKey(
  combatantA: CombatantId,
  combatantB: CombatantId,
): string {
  return [combatantA, combatantB].sort().join("\u0000");
}

function setBattleCombatantDistance(
  distances: Map<CombatantId, Map<CombatantId, number>>,
  from: CombatantId,
  to: CombatantId,
  feet: number,
): void {
  const existing = distances.get(from);
  if (existing == null) {
    distances.set(from, new Map([[to, feet]]));
    return;
  }
  existing.set(to, feet);
}

function currentActorId(state: BattleState): CombatantId {
  return currentActing(state.initiative);
}

function combatantSnapshot(
  state: BattleState,
  combatant: BattleCreatureState,
): BattleCreatureSnapshot {
  const grappling = state.grapples.filter(
    (grapple) => grapple.grapplerId === combatant.combatantId,
  );
  const sourceGrapple = grappledBy(state, combatant.combatantId) ?? null;
  return {
    combatantId: combatant.combatantId,
    displayName: combatant.displayName,
    originKind: combatant.origin.kind,
    hp: combatant.hp,
    maxHp: combatant.maxHp,
    tempHp: combatant.tempHp,
    armorClass: currentArmorClass(activeEffectArmorClass(combatant)),
    size: combatant.size,
    defeated: combatant.hp === 0,
    zeroHpLifecycle: combatantZeroHpLifecycleSnapshot(combatant),
    conditions: activeConditions(
      combatant.conditions,
      sourceGrapple !== null,
      combatant.hidden !== null,
    ),
    hidden: combatant.hidden,
    activeEffects: combatant.activeEffects,
    concentration: combatant.concentration,
    reactionAvailable: combatant.reactionAvailable,
    hands: combatantHandUses(combatant, state.grapples),
    grappling,
    grappledBy: sourceGrapple,
    ...(combatant.origin.kind === "statBlock"
      ? {
          statBlockResources: statBlockResourceSnapshot(
            combatant.origin.statBlock.statBlock,
            combatant.origin.resources,
          ),
        }
      : {}),
    movement: battleMovementBudget(combatant, state.grapples),
  };
}

function activeEffectArmorClass(
  combatant: BattleCreatureState,
): ArmorClassState {
  const mageArmor = combatant.activeEffects.find(
    (effect) => effect.kind === "mageArmorBaseArmorClass",
  );
  if (mageArmor === undefined || combatant.armorClass.base.kind === "armor") {
    return combatant.armorClass;
  }
  return {
    ...combatant.armorClass,
    base: {
      kind: "ability_sum",
      base: armorClass(mageArmor.base),
      abilityModifiers: [mageArmor.ability],
      source: "mage_armor",
    },
  };
}

function initialZeroHpLifecycleForCreatureOrigin(
  creatureInit: BattleCreatureInit["creatureInit"],
): ZeroHpLifecycle {
  return Match.value(creatureInit).pipe(
    Match.when({ kind: "statBlock" }, () => ({
      policy: "diesAtZeroHp" as const,
    })),
    Match.when({ kind: "character" }, (characterInit) => {
      const zeroHpLifecycle = characterInit.zeroHpLifecycle ?? {
        policy: "usesDeathSavingThrows" as const,
        deathSaves: resetDeathSaveRuntimeState(),
      };
      if (Number(characterInit.currentHp) > 0) {
        if (characterInit.zeroHpLifecycle !== undefined) {
          throw new Error(
            "Positive-HP character battle initialization cannot carry zero-HP lifecycle state.",
          );
        }
        return zeroHpLifecycle;
      }
      if (!validDeathSaveRuntimeState(zeroHpLifecycle.deathSaves)) {
        throw new Error(
          "Character battle initialization zero-HP lifecycle is invalid.",
        );
      }
      return zeroHpLifecycle;
    }),
    Match.exhaustive,
  );
}

function combatantZeroHpLifecycleSnapshot(
  combatant: BattleCreatureState,
): BattleCreatureZeroHpLifecycleSnapshot {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, (lifecycle) => ({
      policy: lifecycle.policy,
      dead: combatant.hp === 0,
    })),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      policy: lifecycle.policy,
      deathSaves: lifecycle.deathSaves.deathSaves,
      stable: lifecycle.deathSaves.stable,
      dead: lifecycle.deathSaves.dead,
    })),
    Match.exhaustive,
  );
}

function combatantCanTakeActions(
  combatant: BattleCreatureState | undefined,
): combatant is BattleCreatureState {
  return (
    combatant != null &&
    !isIncapacitated(combatant.conditions) &&
    !zeroHpLifecycleIsTerminal(combatant)
  );
}

function activeConditions(
  state: ConditionState,
  includeGrappled = false,
  includeHiddenInvisible = false,
): readonly Condition[] {
  return ALL_CONDITIONS.filter(
    (condition) =>
      hasCondition(state, condition) ||
      (condition === "grappled" && includeGrappled) ||
      (condition === "invisible" && includeHiddenInvisible),
  );
}

function grappledBy(
  state: BattleState,
  targetId: CombatantId,
): BattleGrappleLink | undefined {
  return state.grapples.find((grapple) => grapple.targetId === targetId);
}

function combatantHandUses(
  combatant: BattleCreatureState,
  grapples: readonly BattleGrappleLink[],
): { readonly left: HandUse; readonly right: HandUse } {
  return {
    left: handUseForOccupancy(
      combatant.armorClass.leftHandUse,
      grapples.some(
        (grapple) =>
          grapple.grapplerId === combatant.combatantId &&
          grapple.hand === "left",
      ),
    ),
    right: handUseForOccupancy(
      combatant.armorClass.rightHandUse,
      grapples.some(
        (grapple) =>
          grapple.grapplerId === combatant.combatantId &&
          grapple.hand === "right",
      ),
    ),
  };
}

function handUseForOccupancy(
  occupancy: HandUse,
  occupiedByGrapple: boolean,
): HandUse {
  if (occupiedByGrapple) return "grapple";
  return occupancy;
}

function battleSubjectActorId(subject: BattleSubject): CombatantId {
  return subject.actorId;
}

function isLegendaryAttackSubject(subject: BattleSubject): boolean {
  return (
    subject.tag === "action" &&
    subject.action === "attack" &&
    subject.statBlockSection === "legendaryActions"
  );
}

function statBlockLegendaryActionWindowIsOpen(
  state: BattleState,
  actorId: CombatantId,
): boolean {
  return (
    state.legendaryActionWindow !== null &&
    !state.legendaryActionWindow.consumed &&
    actorId !== state.legendaryActionWindow.afterTurnActorId &&
    actorId !== currentActorId(state)
  );
}

function closeLegendaryActionWindow(state: BattleState): BattleState {
  return state.legendaryActionWindow === null
    ? state
    : { ...state, legendaryActionWindow: null };
}

function consumeLegendaryActionWindow(state: BattleState): BattleState {
  return state.legendaryActionWindow === null
    ? state
    : {
        ...state,
        legendaryActionWindow: {
          ...state.legendaryActionWindow,
          consumed: true,
        },
      };
}

function parseCharacterBattleClassLevels(
  classLevels: readonly CharacterBattleClassLevelInit[],
): readonly CharacterBattleClassLevel[] {
  const seenClassNames = new Set<ClassName>();
  return classLevels.map((classLevel) => {
    if (
      !Number.isInteger(classLevel.level) ||
      classLevel.level < 1 ||
      classLevel.level > 20
    ) {
      throw new Error("Character class levels must be integers from 1 to 20.");
    }
    if (seenClassNames.has(classLevel.className)) {
      throw new Error("Character class levels must not duplicate classes.");
    }
    seenClassNames.add(classLevel.className);
    return {
      className: classLevel.className,
      level: ClassLevel.make(classLevel.level),
    };
  });
}

function characterResourceState(
  input: CharacterBattleResourceInit,
  classLevels: readonly CharacterBattleClassLevel[],
): CharacterBattleResourceState {
  const unitClassLevel =
    input.unit.kind === "class_feature"
      ? requireCharacterClassLevel(classLevels, input.unit.className)
      : undefined;
  return {
    unit: input.unit,
    resource: input.resource,
    usesRemaining:
      input.usesRemaining ??
      supportedUseCountCapForLevel(input.resource, unitClassLevel ?? 1),
    usedThisTurn: false,
  };
}

function characterSpellcastingState(
  input: CharacterBattleSpellcastingInit,
): CharacterBattleSpellcastingState {
  const spellSlotLevels = new Set<number>();
  for (const slot of input.spellSlots) {
    if (
      !Number.isInteger(slot.spellLevel) ||
      slot.spellLevel < 1 ||
      slot.spellLevel > 9 ||
      !Number.isInteger(slot.count) ||
      slot.count < 0
    ) {
      throw new Error(
        "Spell Slot level must be 1-9 and count must be a non-negative integer.",
      );
    }
    if (spellSlotLevels.has(slot.spellLevel)) {
      throw new Error("Spell Slot levels must be unique.");
    }
    spellSlotLevels.add(slot.spellLevel);
  }

  const spellSlotExpenditures =
    input.spellSlotExpenditures ??
    input.spellSlots.map((slot) => ({
      spellLevel: slot.spellLevel,
      expended: 0,
    }));
  if (spellSlotExpenditures.length !== input.spellSlots.length) {
    throw new Error("Spell Slot expenditure state must match slot capacity.");
  }
  const expenditureLevels = new Set<number>();
  for (const expenditure of spellSlotExpenditures) {
    const capacity = input.spellSlots.find(
      (slot) => slot.spellLevel === expenditure.spellLevel,
    );
    if (
      capacity === undefined ||
      expenditureLevels.has(expenditure.spellLevel)
    ) {
      throw new Error("Spell Slot expenditure state must match slot capacity.");
    }
    expenditureLevels.add(expenditure.spellLevel);
    if (
      !Number.isInteger(expenditure.expended) ||
      expenditure.expended < 0 ||
      expenditure.expended > capacity.count
    ) {
      throw new Error(
        "Spell Slot expenditure must be an integer between zero and count.",
      );
    }
  }

  return {
    spellcastingAbilityModifier: input.spellcastingAbilityModifier,
    proficiencyBonus: input.proficiencyBonus,
    canCastSpells: input.canCastSpells,
    cantrips: input.cantrips,
    preparedSpells: input.preparedSpells,
    spellSlots: input.spellSlots.map((slot) => {
      const expenditure = spellSlotExpenditures.find(
        (candidate) => candidate.spellLevel === slot.spellLevel,
      );
      if (expenditure === undefined) {
        throw new Error(
          "Spell Slot expenditure state must match slot capacity.",
        );
      }
      return { ...slot, expended: expenditure.expended };
    }),
  };
}

function supportedUseCountCapForLevel(
  resource: ActivationResource,
  level: number,
): number {
  if (
    resource.kind !== "use_count" ||
    resource.cap.kind !== "threshold_tiers"
  ) {
    throw new Error(
      "Battle runtime supports only threshold-tier use-count resources.",
    );
  }

  return resource.cap.tiers.reduce(
    (cap, tier) => (level >= tier.atLevel ? tier.value : cap),
    resource.cap.base,
  );
}

function literalStatBlockNumber(value: StatBlockValue): number {
  if (value.kind !== "literal") {
    throw new Error(
      "Battle runtime initialization requires literal Stat Block numeric values.",
    );
  }
  return value.value;
}

export function battleCreatureInitFromStatBlock(
  input: StatBlockBattleInitInput,
): BattleCreatureInit {
  const maxHp = Hp(literalStatBlockNumber(input.statBlock.statBlock.hp));
  return {
    combatantId: input.combatantId,
    displayName: input.statBlock.statBlock.displayName,
    initiative: input.initiative,
    creatureInit: {
      kind: "statBlock",
      statBlock: input.statBlock,
      currentHp: input.currentHp ?? maxHp,
      maxHp,
      tempHp: input.tempHp ?? Hp(0),
    },
  };
}

export function scoreModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function breakBattleConcentration(
  state: BattleState,
  combatantId: CombatantId,
): BattleState {
  const concentration = state.combatants.get(combatantId)?.concentration;
  let readiedSpells: ReadonlyMap<CombatantId, BattleReadiedSpell> =
    state.readiedSpells;
  if (concentration?.effectKind === "readiedSpell") {
    const remainingReadiedSpells = new Map(state.readiedSpells);
    remainingReadiedSpells.delete(combatantId);
    readiedSpells = remainingReadiedSpells;
  }
  return {
    ...state,
    combatants: breakCombatantConcentration(state.combatants, combatantId),
    readiedSpells,
  };
}

export function concentrationSavingThrowDc(damageAmount: number): number {
  return Math.min(30, Math.max(10, Math.floor(Math.max(0, damageAmount) / 2)));
}

export function resolveBattleConcentrationDamage(input: {
  readonly state: BattleState;
  readonly combatantId: CombatantId;
  readonly damageAmount: number;
  readonly savingThrowSucceeded: boolean;
}): BattleState {
  const combatant = input.state.combatants.get(input.combatantId);
  if (
    combatant?.concentration === null ||
    combatant === undefined ||
    input.damageAmount <= 0 ||
    input.savingThrowSucceeded
  ) {
    return input.state;
  }
  return breakBattleConcentration(input.state, input.combatantId);
}

function resolveAttack(
  input: AttackBattleResolutionInput,
): BattleResolutionResult {
  const subject = input.subject;

  const attack = attackActionOptionForSubject(input.state, subject);
  if (attack == null) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Attack resolution requires a supported Attack action option.",
    );
  }

  const fillSet = attackFillSet(input.fills);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }

  if (fillSet.targetId == null) {
    if (fillSet.attackRoll != null || fillSet.damageRoll != null) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack target must be filled before attack roll or damage.",
      );
    }
    return needsHolesResult(input.state, input.subject, [
      attackTargetHole(input.state, input.subject.actorId, attack),
    ]);
  }

  const target = input.state.combatants.get(fillSet.targetId);
  if (target == null || target.combatantId === input.subject.actorId) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack target must be another combatant in this battle.",
    );
  }
  if (
    !attackTargetIsLegal(
      input.state,
      input.subject.actorId,
      target.combatantId,
      attack,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack target is outside the selected attack's supported target constraint.",
    );
  }

  if (fillSet.attackRoll == null) {
    if (fillSet.damageRoll != null) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Attack roll must be filled before attack damage.",
      );
    }
    return needsHolesResult(input.state, input.subject, [
      attackRollHole(
        attack,
        requiredAttackRollMode(
          input.state,
          input.subject.actorId,
          target.combatantId,
        ),
      ),
    ]);
  }

  if (!attackRollResultIsValid(fillSet.attackRoll)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack roll result is outside the d20 attack-roll protocol.",
    );
  }
  const requiredRollMode = requiredAttackRollMode(
    input.state,
    input.subject.actorId,
    target.combatantId,
  );
  if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack roll mode does not match the current attack-roll rule.",
    );
  }

  const hit = attackRollHits(
    fillSet.attackRoll,
    currentArmorClass(activeEffectArmorClass(target)),
  );
  const attackRolledState = revealHidden(input.state, input.subject.actorId);
  const critical = attackRollIsCriticalHit(fillSet.attackRoll);
  if (hit && fillSet.damageRoll == null) {
    const reactionWindow = maybeOpenReactionWindow(
      attackRolledState,
      {
        trigger: "attackHit",
        attackerId: input.subject.actorId,
        targetId: target.combatantId,
        continuation: {
          kind: "replay",
          subject: input.subject,
          fills: input.fills,
        },
      },
      input.suppressedReactionTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
    return needsHolesResult(attackRolledState, input.subject, [
      attackDamageHole(attack, critical, fillSet.attackRoll),
    ]);
  }
  if (!hit && fillSet.damageRoll != null) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack damage can only be filled after a hit.",
    );
  }
  if (hit && fillSet.damageRoll != null) {
    const damageValidation = validateAttackDamageFill(
      fillSet.damageRoll,
      attack,
      critical,
      fillSet.attackRoll,
    );
    if (damageValidation !== null) {
      return invalidResult(input.state, "invalidFill", damageValidation);
    }
    const damageAmount = attackDamageAmount(
      target,
      attack,
      fillSet.damageRoll,
      critical,
      fillSet.attackRoll,
    );
    const concentrationSave = concentrationSavingThrowHole(
      target,
      damageAmount,
    );
    if (concentrationSave !== null) {
      if (fillSet.concentrationSavingThrow === undefined) {
        return needsHolesResult(attackRolledState, input.subject, [
          concentrationSave,
        ]);
      }
      if (
        fillSet.concentrationSavingThrow.holeId !== concentrationSave.holeId
      ) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Concentration Saving Throw fill does not match the damaged target.",
        );
      }
    } else if (fillSet.concentrationSavingThrow !== undefined) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
      );
    }
    const spent = spendAttackAction(
      applyAttackDamage(attackRolledState, target.combatantId, attack, fillSet),
      input.subject.actorId,
      attack,
    );
    if (spent.tag === "invalid") {
      return spent;
    }
    const reactionWindow = maybeOpenReactionWindow(
      spent.state,
      {
        trigger: "afterDamage",
        damageSourceId: input.subject.actorId,
        damagedId: target.combatantId,
        damageAmount,
        continuation: {
          kind: "resolved",
          subject: input.subject,
        },
      },
      input.suppressedReactionTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
    return spent;
  }

  return spendAttackAction(
    hit
      ? applyAttackDamage(
          attackRolledState,
          target.combatantId,
          attack,
          fillSet,
        )
      : attackRolledState,
    input.subject.actorId,
    attack,
  );
}

function resolveHide(input: HideBattleResolutionInput): BattleResolutionResult {
  const actor = input.state.combatants.get(input.subject.actorId);
  if (actor === undefined || !combatantCanTakeActions(actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Hide is no longer available for the current actor.",
    );
  }
  if (input.subject.tag === "bonusAction" && !canUseCunningActionHide(actor)) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Bonus Action Hide requires an admitted Cunning Action class rider.",
    );
  }
  if (!canHideInCurrentCircumstances(input.state, input.subject.actorId)) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Hide requires Heavily Obscured or sufficient cover and being out of enemy line of sight.",
    );
  }
  const check = abilityCheckFill(
    input.fills,
    HIDE_ABILITY_CHECK_HOLE_ID,
    "Hide",
  );
  if (check.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", check.message);
  }
  if (check.value === undefined) {
    return needsHolesResult(input.state, input.subject, [
      hideAbilityCheckHole(),
    ]);
  }

  const spent =
    input.subject.tag === "bonusAction"
      ? spendActivationResource(input.state.currentTurnResources, {
          kind: "bonusAction",
        })
      : spendAction(input.state.currentTurnResources, "hide");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Hide is no longer available for the current actor.",
    );
  }
  const hidden =
    check.value.value.total >= HIDE_DC
      ? { discoveryDc: check.value.value.total }
      : null;
  const nextActor = { ...actor, hidden };
  const nextState = normalizeBattleGrapples({
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.subject.actorId,
      nextActor,
    ),
    currentTurnResources: spent.right,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveSearch(
  input: SearchBattleResolutionInput,
): BattleResolutionResult {
  const targetFill = input.fills.find((fill) => fill.kind === "targetChoice");
  if (targetFill === undefined) {
    return needsHolesResult(input.state, input.subject, [
      searchTargetHole(input.state, input.subject.actorId),
    ]);
  }
  if (targetFill.holeId !== SEARCH_TARGET_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Search target fill does not match the requested hole.",
    );
  }
  const target = input.state.combatants.get(targetFill.value);
  if (
    target === undefined ||
    target.combatantId === input.subject.actorId ||
    target.hidden === null
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Search target must be a hidden combatant in this battle.",
    );
  }
  const check = abilityCheckFill(
    input.fills.filter((fill) => fill.kind !== "targetChoice"),
    SEARCH_ABILITY_CHECK_HOLE_ID,
    "Search",
  );
  if (check.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", check.message);
  }
  if (check.value === undefined) {
    return needsHolesResult(input.state, input.subject, [
      searchAbilityCheckHole(target.hidden.discoveryDc),
    ]);
  }
  const spent = spendAction(input.state.currentTurnResources, "search");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Search is no longer available for the current actor.",
    );
  }
  const found = check.value.value.total >= target.hidden.discoveryDc;
  const nextTarget = found ? { ...target, hidden: null } : target;
  const nextState = normalizeBattleGrapples({
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      target.combatantId,
      nextTarget,
    ),
    currentTurnResources: spent.right,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveOffHandAttack(
  input: OffHandAttackBattleResolutionInput,
): BattleResolutionResult {
  const attack = offHandAttackActionOptionForActor(
    input.state,
    input.subject.actorId,
  );
  if (
    attack == null ||
    attackActionOptionName(attack) !== input.subject.attackName ||
    !offHandAttackPrerequisiteMet(input.state, input.subject.actorId, attack)
  ) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Off-Hand Attack requires a prior Attack action attack with a different Light weapon.",
    );
  }

  const fillSet = attackFillSet(input.fills);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (fillSet.targetId == null) {
    return needsHolesResult(input.state, input.subject, [
      attackTargetHole(input.state, input.subject.actorId, attack),
    ]);
  }
  const target = input.state.combatants.get(fillSet.targetId);
  if (
    target == null ||
    target.combatantId === input.subject.actorId ||
    !attackTargetIsLegal(
      input.state,
      input.subject.actorId,
      target.combatantId,
      attack,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Off-Hand Attack target is outside the selected attack's supported target constraint.",
    );
  }
  if (fillSet.attackRoll == null) {
    return needsHolesResult(input.state, input.subject, [
      attackRollHole(
        attack,
        requiredAttackRollMode(
          input.state,
          input.subject.actorId,
          target.combatantId,
        ),
      ),
    ]);
  }
  if (!attackRollResultIsValid(fillSet.attackRoll)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Off-Hand Attack roll result is outside the d20 attack-roll protocol.",
    );
  }
  const requiredRollMode = requiredAttackRollMode(
    input.state,
    input.subject.actorId,
    target.combatantId,
  );
  if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Off-Hand Attack roll mode does not match the current attack-roll rule.",
    );
  }
  const hit = attackRollHits(
    fillSet.attackRoll,
    currentArmorClass(activeEffectArmorClass(target)),
  );
  const attackRolledState = revealHidden(input.state, input.subject.actorId);
  const critical = attackRollIsCriticalHit(fillSet.attackRoll);
  if (hit && fillSet.damageRoll == null) {
    return needsHolesResult(attackRolledState, input.subject, [
      attackDamageHole(attack, critical, fillSet.attackRoll),
    ]);
  }
  if (!hit && fillSet.damageRoll != null) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Off-Hand Attack damage can only be filled after a hit.",
    );
  }
  if (hit && fillSet.damageRoll != null) {
    const damageValidation = validateAttackDamageFill(
      fillSet.damageRoll,
      attack,
      critical,
      fillSet.attackRoll,
    );
    if (damageValidation !== null) {
      return invalidResult(input.state, "invalidFill", damageValidation);
    }
    const damageAmount = attackDamageAmount(
      target,
      attack,
      fillSet.damageRoll,
      critical,
      fillSet.attackRoll,
    );
    const concentrationSave = concentrationSavingThrowHole(
      target,
      damageAmount,
    );
    if (concentrationSave !== null) {
      if (fillSet.concentrationSavingThrow === undefined) {
        return needsHolesResult(attackRolledState, input.subject, [
          concentrationSave,
        ]);
      }
      if (
        fillSet.concentrationSavingThrow.holeId !== concentrationSave.holeId
      ) {
        return invalidResult(
          input.state,
          "invalidFill",
          "Concentration Saving Throw fill does not match the damaged target.",
        );
      }
    } else if (fillSet.concentrationSavingThrow !== undefined) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
      );
    }
  }
  const nextTurnResources = {
    ...input.state.currentTurnResources,
    currentHasBonusAction: false,
  };
  const nextState = hit
    ? applyAttackDamage(attackRolledState, target.combatantId, attack, fillSet)
    : attackRolledState;
  const state = normalizeBattleGrapples({
    ...nextState,
    currentTurnResources: nextTurnResources,
  });
  return { tag: "resolved", state, snapshot: snapshotBattle(state) };
}

function resolveGrapple(
  input: GrappleBattleResolutionInput,
): BattleResolutionResult {
  const fillSet = grappleFillSet(input.fills);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (fillSet.targetId === undefined) {
    return needsHolesResult(input.state, input.subject, [
      grappleTargetHole(input.state, input.subject.actorId),
    ]);
  }
  const targetFill = input.fills.find((fill) => fill.kind === "targetChoice");
  if (targetFill?.holeId !== GRAPPLE_TARGET_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Grapple target fill does not match the requested hole.",
    );
  }
  const link = grappleLinkForTarget(
    input.state,
    input.subject.actorId,
    fillSet.targetId,
  );
  if (link.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", link.message);
  }
  if (fillSet.outcome === undefined) {
    return needsHolesResult(input.state, input.subject, [
      grappleOutcomeHole(link.link),
    ]);
  }
  if (fillSet.outcome.holeId !== GRAPPLE_OUTCOME_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Grapple outcome fill does not match the requested hole.",
    );
  }
  const spent = spendAction(input.state.currentTurnResources, "attack");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Grapple is no longer available for the current actor.",
    );
  }
  const nextState = normalizeBattleGrapples({
    ...input.state,
    currentTurnResources: spent.right,
    grapples: fillSet.outcome.value.succeeded
      ? input.state.grapples
      : [...input.state.grapples, link.link],
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveEscapeGrapple(
  input: EscapeGrappleBattleResolutionInput,
): BattleResolutionResult {
  const grapple = grappledBy(input.state, input.subject.actorId);
  if (grapple === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "No Grapple is available to escape.",
    );
  }
  const fillSet = grappleFillSet(input.fills);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (fillSet.targetId !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Escape Grapple does not use a target fill.",
    );
  }
  if (fillSet.outcome === undefined) {
    return needsHolesResult(input.state, input.subject, [
      escapeGrappleOutcomeHole(grapple, input.subject.actorId),
    ]);
  }
  if (fillSet.outcome.holeId !== ESCAPE_GRAPPLE_OUTCOME_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Escape Grapple outcome fill does not match the requested hole.",
    );
  }
  const spent = spendAction(input.state.currentTurnResources, "attack");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Escape Grapple is no longer available for the current actor.",
    );
  }
  const nextState = normalizeBattleGrapples({
    ...input.state,
    currentTurnResources: spent.right,
    grapples: fillSet.outcome.value.succeeded
      ? input.state.grapples.filter((candidate) => candidate !== grapple)
      : input.state.grapples,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveReleaseGrappleCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      { readonly tag: "runtimeCommand"; readonly command: "releaseGrapple" }
    >
  >,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Release Grapple does not use fills.",
    );
  }
  const nextState = normalizeBattleGrapples({
    ...input.state,
    grapples: input.state.grapples.filter(
      (grapple) =>
        !(
          grapple.grapplerId === input.subject.actorId &&
          grapple.targetId === input.subject.targetId
        ),
    ),
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function assertCurrentHpWithinMaxHp(
  creatureInit: BattleCreatureInit["creatureInit"],
): void {
  if (creatureInit.currentHp > creatureInit.maxHp) {
    throw new Error("Battle initialization current HP exceeds max HP.");
  }
}

type AttackFillSet =
  | {
      readonly tag: "ok";
      readonly targetId: CombatantId | undefined;
      readonly attackRoll: AttackRollResult | undefined;
      readonly concentrationSavingThrow:
        | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
        | undefined;
      readonly damageRoll:
        | Extract<BattleFill, { readonly kind: "rolledDice" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string };
type GrappleFillSet =
  | {
      readonly tag: "ok";
      readonly targetId: CombatantId | undefined;
      readonly outcome:
        | Extract<BattleFill, { readonly kind: "grappleOutcome" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string };

function attackFillSet(fills: readonly BattleFill[]): AttackFillSet {
  let targetId: CombatantId | undefined;
  let attackRoll: AttackRollResult | undefined;
  let concentrationSavingThrow:
    | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
    | undefined;
  let damageRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  for (const fill of fills) {
    if (fill.kind === "targetChoice" && fill.holeId === ATTACK_TARGET_HOLE_ID) {
      if (targetId !== undefined) {
        return { tag: "invalid", message: "Attack target was filled twice." };
      }
      targetId = fill.value;
      continue;
    }

    if (fill.kind === "attackRoll" && fill.holeId === ATTACK_ROLL_HOLE_ID) {
      if (attackRoll !== undefined) {
        return { tag: "invalid", message: "Attack roll was filled twice." };
      }
      attackRoll = fill.value;
      continue;
    }

    if (fill.kind === "rolledDice") {
      if (damageRoll !== undefined) {
        return { tag: "invalid", message: "Attack damage was filled twice." };
      }
      damageRoll = fill;
      continue;
    }

    if (fill.kind === "concentrationSavingThrow") {
      if (concentrationSavingThrow !== undefined) {
        return {
          tag: "invalid",
          message: "Concentration Saving Throw was filled twice.",
        };
      }
      concentrationSavingThrow = fill;
      continue;
    }

    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Attack replay holes.`,
    };
  }

  return {
    tag: "ok",
    targetId,
    attackRoll,
    concentrationSavingThrow,
    damageRoll,
  };
}

function abilityCheckFill(
  fills: readonly BattleFill[],
  holeId: BattleHoleId,
  label: string,
):
  | {
      readonly tag: "ok";
      readonly value:
        | Extract<BattleFill, { readonly kind: "abilityCheck" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string } {
  let check: Extract<BattleFill, { readonly kind: "abilityCheck" }> | undefined;
  for (const fill of fills) {
    if (fill.kind === "abilityCheck" && fill.holeId === holeId) {
      if (check !== undefined) {
        return { tag: "invalid", message: `${label} check was filled twice.` };
      }
      check = fill;
      continue;
    }
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the ${label} replay holes.`,
    };
  }
  return { tag: "ok", value: check };
}

function hideAbilityCheckHole(): BattleAbilityCheckHole {
  return {
    holeInstanceKey: HIDE_ABILITY_CHECK_HOLE_INSTANCE,
    holeId: HIDE_ABILITY_CHECK_HOLE_ID,
    kind: "abilityCheck",
    label: `Hide Dexterity (Stealth) check (DC ${HIDE_DC})`,
    ability: "dex",
    skill: "stealth",
    dc: HIDE_DC,
  };
}

function searchAbilityCheckHole(dc: number): BattleAbilityCheckHole {
  return {
    holeInstanceKey: SEARCH_ABILITY_CHECK_HOLE_INSTANCE,
    holeId: SEARCH_ABILITY_CHECK_HOLE_ID,
    kind: "abilityCheck",
    label: `Search Wisdom (Perception) check (DC ${dc})`,
    ability: "wis",
    skill: "perception",
    dc,
  };
}

function grappleFillSet(fills: readonly BattleFill[]): GrappleFillSet {
  let targetId: CombatantId | undefined;
  let outcome:
    | Extract<BattleFill, { readonly kind: "grappleOutcome" }>
    | undefined;
  for (const fill of fills) {
    if (fill.kind === "targetChoice") {
      if (targetId !== undefined) {
        return { tag: "invalid", message: "Grapple target was filled twice." };
      }
      targetId = fill.value;
      continue;
    }
    if (fill.kind === "grappleOutcome") {
      if (outcome !== undefined) {
        return {
          tag: "invalid",
          message: "Grapple outcome was filled twice.",
        };
      }
      outcome = fill;
      continue;
    }
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Grapple replay holes.`,
    };
  }
  return { tag: "ok", targetId, outcome };
}

function validateAttackDamageFill(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  attack: SupportedAttackActionOption,
  critical: boolean,
  attackRoll: AttackRollResult,
): string | null {
  if (fill.holeId !== attackDamageHoleId(attack, critical, attackRoll)) {
    return critical
      ? "Critical hit damage must use the critical damage hole."
      : "Attack damage must use the normal hit damage hole.";
  }

  return validateRolledDiceForWeaponAttack(
    fill.value,
    attack,
    critical,
    attackRoll,
  );
}

function validateRolledDiceForWeaponAttack(
  groups: ReadonlyArray<RolledDiceGroup>,
  attack: SupportedAttackActionOption,
  critical: boolean,
  attackRoll: AttackRollResult,
): string | null {
  const components = attackDamageComponents(attack, critical, attackRoll);
  if (groups.length !== components.length) {
    return "filled damage groups do not match current attack damage";
  }

  for (const [index, component] of components.entries()) {
    const group = groups[index];
    if (group === undefined) {
      return "filled damage groups do not match current attack damage";
    }
    const validation = validateRolledDiceForDiceExpr([group], component.expr);
    if (validation !== null) {
      return validation.reason;
    }
  }

  return null;
}

function attackRollIsCriticalHit(roll: AttackRollResult): boolean {
  return Number(roll.naturalD20) === 20;
}

function spendAttackAction(
  state: BattleState,
  actorId: CombatantId,
  attack: SupportedAttackActionOption,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (
    attack.kind === "statBlockAttack" &&
    attack.part.section === "legendaryActions"
  ) {
    const nextState = spendStatBlockAttackResources({
      state,
      actorId,
      attack,
    });
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }

  const spent = spendAction(state.currentTurnResources, "attack");
  if (Either.isLeft(spent)) {
    return invalidResult(
      state,
      "staleSubject",
      "Attack is no longer available for the current actor.",
    );
  }

  const nextTurnResources =
    attack.kind === "weapon" && isLightMeleeWeapon(attack.weapon)
      ? {
          ...spent.right,
          lightWeaponAttackMade: {
            weaponItemId: heldWeaponItemIdForAttack(state, actorId, attack),
          },
        }
      : spent.right;

  const nextState = spendStatBlockAttackResources({
    state: { ...state, currentTurnResources: nextTurnResources },
    actorId,
    attack,
  });
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveEndTurn(
  state: BattleState,
  deathSavingThrowRoll?: DieRollResult,
  statBlockRechargeRolls?: readonly BattleStatBlockRechargeRollResult[],
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  const initiative = nextInitiative(state.initiative);
  const nextActorId = currentActing(initiative);
  const combatants = new Map<CombatantId, BattleCreatureState>();
  for (const [id, combatant] of state.combatants) {
    combatants.set(
      id,
      id === nextActorId
        ? resetStartOfTurnCombatant(resetPerTurnCharacterResources(combatant))
        : combatant,
    );
  }
  const afterDeathSavingThrow =
    deathSavingThrowRoll === undefined
      ? combatants
      : applyStartTurnDeathSavingThrow(
          combatants,
          nextActorId,
          deathSavingThrowRoll,
        );
  const expiringReadiedSpellCasterIds = [...state.readiedSpells]
    .filter(
      ([, readiedSpell]) => readiedSpell.expiresAt.combatantId === nextActorId,
    )
    .map(([casterId]) => casterId);
  const readiedSpells = new Map(state.readiedSpells);
  for (const casterId of expiringReadiedSpellCasterIds) {
    readiedSpells.delete(casterId);
  }
  let combatantsAfterExpiredReadiedSpells = afterDeathSavingThrow;
  for (const casterId of expiringReadiedSpellCasterIds) {
    combatantsAfterExpiredReadiedSpells = breakCombatantConcentration(
      combatantsAfterExpiredReadiedSpells,
      casterId,
    );
  }
  const combatantsAfterStartEffects = expireStartOfTurnEffects(
    combatantsAfterExpiredReadiedSpells,
    nextActorId,
  );
  const combatantsAfterRecharge =
    statBlockRechargeRolls === undefined
      ? combatantsAfterStartEffects
      : processStatBlockRechargeRolls(
          combatantsAfterStartEffects,
          nextActorId,
          statBlockRechargeRolls,
        );
  const nextState = {
    ...state,
    initiative,
    combatants: combatantsAfterRecharge,
    currentTurnResources: resetBattleTurnResources(state.currentTurnResources),
    readiedSpells,
    legendaryActionWindow: {
      afterTurnActorId: currentActorId(state),
      consumed: false,
    },
  };

  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function expireStartOfTurnEffects(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  return new Map(
    [...combatants].map(([id, combatant]) => [
      id,
      {
        ...combatant,
        activeEffects: combatant.activeEffects.filter(
          (effect) =>
            effect.kind !== "speedDelta" ||
            effect.expiresAt.combatantId !== actorId,
        ),
      },
    ]),
  );
}

function resetBattleTurnResources(
  resources: BattleTurnResources,
): BattleTurnResources {
  const { lightWeaponAttackMade: _lightWeaponAttackMade, ...base } =
    resetTurnActionEconomy(resources);
  return base;
}

function resolveEndTurnCommand(
  input: BattleResolutionInput,
): BattleResolutionResult {
  const initiative = nextInitiative(input.state.initiative);
  const nextActorId = currentActing(initiative);
  const nextActor = input.state.combatants.get(nextActorId);
  const needsDeathSavingThrow = startTurnDeathSavingThrowRequired(nextActor);
  const rechargeHole = statBlockRechargeRollHole(nextActor);
  const expectedHoleCount =
    (needsDeathSavingThrow ? 1 : 0) + (rechargeHole === null ? 0 : 1);
  if (expectedHoleCount > 0 && input.fills.length === 0) {
    return {
      tag: "needsHoles",
      state: input.state,
      subject: input.subject,
      holes: [
        ...(needsDeathSavingThrow ? [deathSavingThrowHole(nextActorId)] : []),
        ...(rechargeHole === null ? [] : [rechargeHole]),
      ],
      snapshot: snapshotBattle(input.state),
    };
  }

  if (input.fills.length > expectedHoleCount) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn received too many fills for start-turn requirements.",
    );
  }

  const deathSavingThrowFill = input.fills.find(
    (fill) => fill.kind === "deathSavingThrow",
  );
  const rechargeRollFill = input.fills.find(
    (fill) => fill.kind === "statBlockRechargeRoll",
  );
  if (
    (needsDeathSavingThrow &&
      deathSavingThrowFill?.kind !== "deathSavingThrow") ||
    (!needsDeathSavingThrow && deathSavingThrowFill !== undefined)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      needsDeathSavingThrow
        ? "End Turn requires a Death Saving Throw fill for the next actor."
        : "End Turn does not accept battle fills.",
    );
  }
  if (
    (rechargeHole !== null &&
      rechargeRollFill?.kind !== "statBlockRechargeRoll") ||
    (rechargeHole === null && rechargeRollFill !== undefined)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      rechargeHole !== null
        ? "End Turn requires a Stat Block Recharge roll fill for the next actor."
        : "End Turn does not accept a Stat Block Recharge roll fill.",
    );
  }
  if (
    deathSavingThrowFill?.kind === "deathSavingThrow" &&
    deathSavingThrowFill.holeId !== DEATH_SAVING_THROW_HOLE_ID
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Death Saving Throw fill does not match the requested hole.",
    );
  }
  if (
    rechargeRollFill?.kind === "statBlockRechargeRoll" &&
    rechargeRollFill.holeId !== STAT_BLOCK_RECHARGE_ROLL_HOLE_ID
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Stat Block Recharge roll fill does not match the requested hole.",
    );
  }
  if (
    rechargeRollFill?.kind === "statBlockRechargeRoll" &&
    !statBlockRechargeRollFillMatchesHole(rechargeRollFill.value, rechargeHole)
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Stat Block Recharge roll fill must provide one d6 result for each requested target.",
    );
  }

  return resolveEndTurn(
    input.state,
    deathSavingThrowFill?.kind === "deathSavingThrow"
      ? deathSavingThrowFill.value
      : undefined,
    rechargeRollFill?.kind === "statBlockRechargeRoll"
      ? rechargeRollFill.value
      : undefined,
  );
}

function statBlockRechargeRollFillMatchesHole(
  value: readonly BattleStatBlockRechargeRollResult[],
  rechargeHole: BattleStatBlockRechargeRollHole | null,
): boolean {
  if (rechargeHole === null) return value.length === 0;
  if (value.length !== rechargeHole.rechargeTargets.length) return false;

  const matchedTargetIndexes = new Set<number>();
  for (const result of value) {
    if (result.roll < 1 || result.roll > 6) return false;
    const targetIndex = rechargeHole.rechargeTargets.findIndex(
      (target, index) =>
        !matchedTargetIndexes.has(index) &&
        sameStatBlockPartKey(target, result.target),
    );
    if (targetIndex === -1) return false;
    matchedTargetIndexes.add(targetIndex);
  }
  return true;
}

function resolveMoveCommand(
  input: BattleResolutionInput,
): BattleResolutionResult {
  if (input.fills.length === 0) {
    return needsHolesResult(input.state, input.subject, [
      movementHole(input.state, input.subject.actorId),
    ]);
  }
  if (input.fills.length > 1 || input.fills[0]?.kind !== "movement") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Move requires exactly one Movement fill.",
    );
  }
  const fill = input.fills[0];
  if (fill.holeId !== MOVEMENT_HOLE_ID) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Movement fill does not match the requested hole.",
    );
  }
  const movement = parseBattleMovement(
    input.state,
    input.subject.actorId,
    fill,
  );
  if (movement.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", movement.message);
  }
  const reactors = opportunityAttackReactorsForMovement(
    input.state,
    movement.movement,
  );
  if (reactors.length > 0) {
    const reactionWindow = maybeOpenReactionWindow(
      input.state,
      {
        trigger: "opportunityAttack",
        moverId: input.subject.actorId,
        reactorIds: reactors,
        continuation: {
          kind: "movement",
          subject: input.subject,
          movement: movement.movement,
        },
      },
      undefined,
    );
    if (reactionWindow !== null) return reactionWindow;
  }
  const nextState = applyBattleMovement(input.state, movement.movement);
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveOpportunityAttackCommand(
  input: BattleResolutionInputForSubject<
    Extract<
      BattleSubject,
      { readonly tag: "runtimeCommand"; readonly command: "opportunityAttack" }
    >
  >,
): BattleResolutionResult {
  const subject = input.subject;
  const target = input.state.combatants.get(subject.targetId);
  const attack = opportunityAttackOptionForReactor(
    input.state,
    subject.reactorId,
    subject.targetId,
  );
  if (target === undefined || attack === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Opportunity Attack is no longer available.",
    );
  }
  if (attackActionOptionName(attack) !== subject.attackName) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Opportunity Attack requires the selected melee attack option.",
    );
  }
  const fillSet = attackFillSet(input.fills);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (fillSet.targetId !== undefined) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Opportunity Attack target is fixed by the movement trigger.",
    );
  }
  const requiredRollMode = requiredAttackRollMode(
    input.state,
    subject.reactorId,
    subject.targetId,
  );
  if (fillSet.attackRoll == null) {
    if (fillSet.damageRoll != null) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Opportunity Attack roll must be filled before damage.",
      );
    }
    return needsHolesResult(input.state, input.subject, [
      attackRollHole(attack, requiredRollMode),
    ]);
  }
  if (!attackRollResultIsValid(fillSet.attackRoll)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Opportunity Attack roll result is outside the d20 attack-roll protocol.",
    );
  }
  if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Opportunity Attack roll mode does not match the current attack-roll rule.",
    );
  }
  const attackRolledState = revealHidden(input.state, subject.reactorId);
  const hit = attackRollHits(
    fillSet.attackRoll,
    currentArmorClass(activeEffectArmorClass(target)),
  );
  const critical = attackRollIsCriticalHit(fillSet.attackRoll);
  if (!hit && fillSet.damageRoll != null) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Opportunity Attack damage can only be filled after a hit.",
    );
  }
  if (!hit) {
    return {
      tag: "resolved",
      state: attackRolledState,
      snapshot: snapshotBattle(attackRolledState),
    };
  }
  if (fillSet.damageRoll == null) {
    return needsHolesResult(attackRolledState, input.subject, [
      attackDamageHole(attack, critical, fillSet.attackRoll),
    ]);
  }
  const damageValidation = validateAttackDamageFill(
    fillSet.damageRoll,
    attack,
    critical,
    fillSet.attackRoll,
  );
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  const damageAmount = attackDamageAmount(
    target,
    attack,
    fillSet.damageRoll,
    critical,
    fillSet.attackRoll,
  );
  const concentrationSave = concentrationSavingThrowHole(target, damageAmount);
  if (concentrationSave !== null) {
    if (fillSet.concentrationSavingThrow === undefined) {
      return needsHolesResult(attackRolledState, input.subject, [
        concentrationSave,
      ]);
    }
    if (fillSet.concentrationSavingThrow.holeId !== concentrationSave.holeId) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Concentration Saving Throw fill does not match the damaged target.",
      );
    }
  }
  const nextState = applyAttackDamage(
    attackRolledState,
    subject.targetId,
    attack,
    fillSet,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function movementHole(
  state: BattleState,
  actorId: CombatantId,
): BattleMovementHole {
  const actor = state.combatants.get(actorId);
  return {
    kind: "movement",
    holeInstanceKey: MOVEMENT_HOLE_INSTANCE,
    holeId: MOVEMENT_HOLE_ID,
    label: "Movement",
    actorId,
    movementBudgetFeet: battleMovementBudget(actor, state.grapples)
      .remainingFeet,
  };
}

function parseBattleMovement(
  state: BattleState,
  moverId: CombatantId,
  fill: Extract<BattleFill, { readonly kind: "movement" }>,
):
  | { readonly tag: "ok"; readonly movement: BattleResolvedMovement }
  | { readonly tag: "invalid"; readonly message: string } {
  const mover = state.combatants.get(moverId);
  if (!combatantCanMoveInState(state, moverId)) {
    return { tag: "invalid", message: "Current combatant cannot move." };
  }
  if (
    fill.value.movementCostFeet <= 0 ||
    !Number.isInteger(fill.value.movementCostFeet)
  ) {
    return {
      tag: "invalid",
      message: "Movement cost must be a positive integer.",
    };
  }
  if (
    fill.value.distanceMovedFeet <= 0 ||
    !Number.isInteger(fill.value.distanceMovedFeet)
  ) {
    return {
      tag: "invalid",
      message: "Distance moved must be a positive integer.",
    };
  }
  if (fill.value.distanceMovedFeet > fill.value.movementCostFeet) {
    return {
      tag: "invalid",
      message: "Distance moved cannot exceed Movement cost.",
    };
  }
  const budget = battleMovementBudget(mover, state.grapples).remainingFeet;
  if (fill.value.movementCostFeet > Number(budget)) {
    return {
      tag: "invalid",
      message: "Movement cost exceeds the combatant's remaining Movement.",
    };
  }
  const grappleMovementCost = validateGrappleMovementCost(state, moverId, fill);
  if (grappleMovementCost !== null) {
    return { tag: "invalid", message: grappleMovementCost };
  }
  const expectedIds = [...state.combatants.keys()].filter(
    (id) => id !== moverId,
  );
  const seen = new Set<CombatantId>();
  for (const distance of fill.value.destinationDistances) {
    if (distance.combatantId === moverId) {
      return {
        tag: "invalid",
        message: "Movement destination distances cannot target the mover.",
      };
    }
    if (!state.combatants.has(distance.combatantId)) {
      return {
        tag: "invalid",
        message:
          "Movement destination distance references an unknown combatant.",
      };
    }
    if (seen.has(distance.combatantId)) {
      return {
        tag: "invalid",
        message: "Movement destination distance repeats a combatant.",
      };
    }
    if (distance.feet < 0 || !Number.isInteger(distance.feet)) {
      return {
        tag: "invalid",
        message:
          "Movement destination distances must be non-negative integers.",
      };
    }
    seen.add(distance.combatantId);
  }
  if (
    expectedIds.length !== seen.size ||
    !expectedIds.every((id) => seen.has(id))
  ) {
    return {
      tag: "invalid",
      message:
        "Movement destination distances must include every other combatant.",
    };
  }
  return {
    tag: "ok",
    movement: {
      moverId,
      movementCostFeet: movementFeet(fill.value.movementCostFeet),
      destinationDistances: fill.value.destinationDistances,
    },
  };
}

function validateGrappleMovementCost(
  state: BattleState,
  moverId: CombatantId,
  fill: Extract<BattleFill, { readonly kind: "movement" }>,
): string | null {
  const nonExemptDraggedTargets = state.grapples.filter(
    (grapple) =>
      grapple.grapplerId === moverId && !grapple.targetExemptFromDragCost,
  );
  if (nonExemptDraggedTargets.length === 0) return null;

  const requiredCostFeet = fill.value.distanceMovedFeet * 2;
  if (fill.value.movementCostFeet < requiredCostFeet) {
    return "Dragging a grappled target costs 1 extra foot per foot moved.";
  }
  return null;
}

function applyBattleMovement(
  state: BattleState,
  movement: BattleResolvedMovement,
): BattleState {
  const mover = state.combatants.get(movement.moverId);
  if (
    mover === undefined ||
    !combatantCanMoveInState(state, movement.moverId)
  ) {
    return state;
  }
  const combatants = new Map(state.combatants).set(movement.moverId, {
    ...mover,
    movementSpentFeet: movementFeet(
      Number(mover.movementSpentFeet) + Number(movement.movementCostFeet),
    ),
  });
  const distances = cloneCombatantDistances(state.combatantDistances);
  for (const destination of movement.destinationDistances) {
    setBattleCombatantDistance(
      distances,
      movement.moverId,
      destination.combatantId,
      destination.feet,
    );
    setBattleCombatantDistance(
      distances,
      destination.combatantId,
      movement.moverId,
      destination.feet,
    );
  }
  return normalizeBattleGrapples({
    ...state,
    combatants,
    combatantDistances: distances,
  });
}

function normalizeBattleGrapples(state: BattleState): BattleState {
  const grapples = state.grapples.filter((grapple) => {
    const grappler = state.combatants.get(grapple.grapplerId);
    const target = state.combatants.get(grapple.targetId);
    const distance = combatantDistanceFeet(
      state,
      grapple.grapplerId,
      grapple.targetId,
    );
    return (
      grappler !== undefined &&
      target !== undefined &&
      !isIncapacitated(grappler.conditions) &&
      !zeroHpLifecycleIsTerminal(grappler) &&
      !zeroHpLifecycleIsTerminal(target) &&
      distance !== undefined &&
      distance <= grapple.reachFeet
    );
  });
  return grapples.length === state.grapples.length
    ? state
    : { ...state, grapples };
}

function cloneCombatantDistances(
  distances: BattleState["combatantDistances"],
): Map<CombatantId, Map<CombatantId, number>> {
  return new Map([...distances].map(([id, peers]) => [id, new Map(peers)]));
}

function readiedSpellInitialHoles(
  state: BattleState,
  casterId: CombatantId,
  readied: BattleReadiedSpell,
): readonly BattleHole[] {
  return readied.invocation.kind === "cantripSaveGateDamage"
    ? [spellSavingThrowOutcomeHole(state, casterId, readied.invocation)]
    : [spellTargetHole(state, casterId, readied.invocation)];
}

function resolveReleaseReadiedSpellCommand(
  input: BattleResolutionInput,
  options: {
    readonly suppressedReactionTrigger?: BattleReactionTrigger | undefined;
  },
): BattleResolutionResult {
  if (input.subject.tag !== "runtimeCommand") {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Release Readied Spell requires a runtime command subject.",
    );
  }
  const subject = input.subject;
  if (subject.command !== "releaseReadiedSpell") {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Release Readied Spell requires a release command subject.",
    );
  }
  const casterId = subject.readiedSpellCasterId;
  const readied = input.state.readiedSpells.get(casterId);
  if (readied === undefined) {
    return invalidResult(
      input.state,
      "staleSubject",
      "No readied spell is currently being held.",
    );
  }

  const releaseSubject: Extract<
    BattleSubject,
    { readonly tag: "actionSpell" }
  > = {
    tag: "actionSpell",
    actorId: casterId,
    spellId: readied.invocation.spell.id,
    spellActId: supportedSpellActId(readied.invocation),
  };
  const released = resolveSpellRelease(
    {
      state: input.state,
      subject: releaseSubject,
      fills: input.fills,
      suppressedReactionTrigger: options.suppressedReactionTrigger,
      reactionContinuationSubject: input.subject,
    },
    readied.invocation,
  );
  if (released.tag === "needsHoles") {
    return { ...released, subject: input.subject };
  }
  if (released.tag !== "resolved") {
    return released;
  }
  const readiedSpells = new Map(released.state.readiedSpells);
  readiedSpells.delete(casterId);
  const withoutReadied = breakBattleConcentration(
    { ...released.state, readiedSpells },
    casterId,
  );
  return {
    tag: "resolved",
    state: withoutReadied,
    snapshot: snapshotBattle(withoutReadied),
  };
}

function resetStartOfTurnCombatant(
  combatant: BattleCreatureState,
): BattleCreatureState {
  const resetCombatant = {
    ...combatant,
    reactionAvailable: true,
    movementSpentFeet: movementFeet(0),
  };
  if (resetCombatant.origin.kind !== "statBlock") {
    return resetCombatant;
  }
  return {
    ...resetCombatant,
    origin: {
      ...resetCombatant.origin,
      resources: refreshStatBlockStartTurnResources(
        resetCombatant.origin.resources,
        resetCombatant.origin.statBlock.statBlock,
      ),
    },
  };
}

function resetPerTurnCharacterResources(
  combatant: BattleCreatureState,
): BattleCreatureState {
  if (combatant.origin.kind !== "character") {
    return combatant;
  }

  return {
    ...combatant,
    origin: {
      ...combatant.origin,
      resources: combatant.origin.resources.map((resource) => ({
        ...resource,
        usedThisTurn: false,
      })),
    },
  };
}

function discoverLegendaryActionActs(
  state: BattleState,
): readonly AvailableBattleAct[] {
  return [...state.combatants].flatMap(([actorId, actor]) => {
    if (
      !statBlockLegendaryActionWindowIsOpen(state, actorId) ||
      actor.origin.kind !== "statBlock" ||
      !combatantCanTakeActions(actor) ||
      actor.origin.resources.legendaryActionUsesRemaining <= 0
    ) {
      return [];
    }
    return attackActionOptionsForActor(state, actorId)
      .filter(
        (attack) =>
          attack.kind === "statBlockAttack" &&
          attack.part.section === "legendaryActions",
      )
      .flatMap((attack) => {
        const targetHole = attackTargetHole(state, actorId, attack);
        return targetHole.choices.length === 0
          ? []
          : [
              {
                subject: {
                  tag: "action" as const,
                  actorId,
                  action: "attack" as const,
                  attackName: attackActionOptionName(attack),
                  statBlockSection: "legendaryActions" as const,
                },
                label: "Legendary Action",
                summary: `Take the Legendary Action ${attackActionOptionName(
                  attack,
                )}.`,
                initialHoles: [targetHole],
              },
            ];
      });
  });
}

function supportedUnitFeatureActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character" || !combatantCanTakeActions(actor)) {
    return [];
  }

  const classLevels = actor.origin.classLevels;
  return actor.origin.resources.flatMap((resource) => {
    const actionSurge = parseSupportedActionSurgeUnitFeature(resource.unit);
    if (
      actionSurge !== null &&
      resource.usesRemaining > 0 &&
      !resource.usedThisTurn
    ) {
      return [
        {
          subject: {
            tag: "unitFeature" as const,
            actorId,
            unitId: actionSurge.unit.id,
          },
          label: actionSurge.unit.name,
          summary: "Grant one additional non-Magic action this turn.",
          initialHoles: [],
        },
      ];
    }

    const secondWind = parseSupportedSecondWindUnitFeature(
      resource.unit,
      classLevels,
    );
    return secondWind !== null &&
      resource.usesRemaining > 0 &&
      state.currentTurnResources.currentHasBonusAction
      ? [
          {
            subject: {
              tag: "unitFeature" as const,
              actorId,
              unitId: secondWind.unit.id,
            },
            label: secondWind.unit.name,
            summary: "Spend a Bonus Action and one use to regain Hit Points.",
            initialHoles: [secondWindHealingRollHole(secondWind)],
          },
        ]
      : [];
  });
}

function isCharacterBattleCreatureState(
  actor: BattleCreatureState | undefined,
): actor is CharacterBattleCreatureState {
  return actor?.origin.kind === "character";
}

function resolveUnitFeature(
  input: UnitFeatureBattleResolutionInput,
): BattleResolutionResult {
  const subject = input.subject;
  const actor = input.state.combatants.get(subject.actorId);
  if (isCharacterBattleCreatureState(actor)) {
    const resource = actor.origin.resources.find(
      (candidate) => candidate.unit.id === subject.unitId,
    );

    if (resource !== undefined) {
      const actionSurge = parseSupportedActionSurgeUnitFeature(resource.unit);
      if (actionSurge !== null) {
        return resolveActionSurgeUnitFeature(
          input,
          actor,
          resource,
          actionSurge,
        );
      }

      const secondWind = parseSupportedSecondWindUnitFeature(
        resource.unit,
        actor.origin.classLevels,
      );
      if (secondWind !== null) {
        return resolveSecondWindUnitFeature(input, actor, resource, secondWind);
      }
    }
  }

  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Unsupported Unit feature does not accept battle fills.",
    );
  }

  return invalidResult(
    input.state,
    "staleSubject",
    "Unit feature is no longer available for the current actor.",
  );
}

function resolveActionSurgeUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  actionSurge: SupportedActionSurgeUnitFeature,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Action Surge does not accept battle fills.",
    );
  }

  if (resource.usesRemaining <= 0 || resource.usedThisTurn) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Action Surge is no longer available for the current actor.",
    );
  }

  const granted = grantUnitActionResource(
    input.state.currentTurnResources,
    input.subject.actorId,
    input.subject.unitId,
    actionSurge.restriction,
  );
  if (Either.isLeft(granted)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Action Surge has already granted an action this turn.",
    );
  }

  const nextActor: BattleCreatureState = {
    ...actor,
    origin: {
      ...actor.origin,
      resources: actor.origin.resources.map((candidate) =>
        candidate.unit.id === input.subject.unitId
          ? {
              ...candidate,
              usesRemaining: candidate.usesRemaining - 1,
              usedThisTurn: true,
            }
          : candidate,
      ),
    },
  };
  const nextState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.subject.actorId,
      nextActor,
    ),
    currentTurnResources: granted.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveSecondWindUnitFeature(
  input: UnitFeatureBattleResolutionInput,
  actor: CharacterBattleCreatureState,
  resource: CharacterBattleResourceState,
  secondWind: SupportedSecondWindUnitFeature,
): BattleResolutionResult {
  if (
    resource.usesRemaining <= 0 ||
    !input.state.currentTurnResources.currentHasBonusAction
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Second Wind is no longer available for the current actor.",
    );
  }

  const healingRoll = secondWindHealingRollFill(input.fills, secondWind);
  if (healingRoll.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", healingRoll.message);
  }
  if (healingRoll.value === undefined) {
    return needsHolesResult(input.state, input.subject, [
      secondWindHealingRollHole(secondWind),
    ]);
  }

  const spent = spendActivationResource(input.state.currentTurnResources, {
    kind: "bonusAction",
  });
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Second Wind is no longer available for the current actor.",
    );
  }

  const nextActor = applyHpHealing(
    {
      ...actor,
      origin: {
        ...actor.origin,
        resources: actor.origin.resources.map((candidate) =>
          candidate.unit.id === input.subject.unitId
            ? { ...candidate, usesRemaining: candidate.usesRemaining - 1 }
            : candidate,
        ),
      },
    },
    secondWindHealingAmount(secondWind, healingRoll.value),
  );
  const nextState = {
    ...input.state,
    combatants: new Map(input.state.combatants).set(
      input.subject.actorId,
      nextActor,
    ),
    currentTurnResources: spent.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function parseSupportedActionSurgeUnitFeature(
  unit: UnitRecord,
): SupportedActionSurgeUnitFeature | null {
  if (unit.id !== ACTION_SURGE_UNIT_ID || unit.kind !== "class_feature") {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.family !== "activation" ||
    mechanics.activationCost.kind !== "free" ||
    mechanics.resource.kind !== "use_count" ||
    mechanics.resetCadence.kind !== "short_or_long_rest" ||
    mechanics.usageLimit?.kind !== "once_per_turn"
  ) {
    return null;
  }
  if (mechanics.phases.length !== 1) {
    return null;
  }
  const phase = mechanics.phases[0];
  if (phase?.kind !== "direct") {
    return null;
  }
  if (phase.effects?.length !== 1) {
    return null;
  }
  const effect = phase.effects[0];
  return effect.kind === "grant_extra_action"
    ? { unit, restriction: effect.restriction }
    : null;
}

type UnitFeatureRolledDiceFill =
  | {
      readonly tag: "ok";
      readonly value:
        | Extract<BattleFill, { readonly kind: "rolledDice" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string };

function secondWindHealingRollFill(
  fills: readonly BattleFill[],
  secondWind: SupportedSecondWindUnitFeature,
): UnitFeatureRolledDiceFill {
  let healingRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  for (const fill of fills) {
    if (
      fill.kind === "rolledDice" &&
      fill.holeId === SECOND_WIND_HEALING_ROLL_HOLE_ID
    ) {
      if (healingRoll !== undefined) {
        return {
          tag: "invalid",
          message: "Second Wind healing roll was filled twice.",
        };
      }
      healingRoll = fill;
      continue;
    }

    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Second Wind replay holes.`,
    };
  }

  if (healingRoll === undefined) {
    return { tag: "ok", value: undefined };
  }

  const validation = validateRolledDiceForDiceExpr(healingRoll.value, {
    dice: secondWind.dice,
    dieSize: secondWind.dieSize,
  });
  return validation == null
    ? { tag: "ok", value: healingRoll }
    : { tag: "invalid", message: validation.reason };
}

function secondWindHealingRollHole(
  secondWind: SupportedSecondWindUnitFeature,
): BattleUnitFeatureRollHole {
  return {
    kind: "rolledDice",
    holeId: SECOND_WIND_HEALING_ROLL_HOLE_ID,
    holeInstanceKey: SECOND_WIND_HEALING_ROLL_HOLE_INSTANCE,
    label: `${secondWind.unit.name} healing (${secondWind.dice}d${secondWind.dieSize})`,
    unitFeature: secondWind,
  };
}

function secondWindHealingAmount(
  secondWind: SupportedSecondWindUnitFeature,
  healingRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): number {
  const diceTotal = healingRoll.value.reduce(
    (total, group) =>
      total +
      group.results.reduce(
        (groupTotal, dieResult) => groupTotal + Number(dieResult),
        0,
      ),
    0,
  );
  return (
    diceTotal +
    secondWind.flatBase +
    Math.max(0, secondWind.classLevel - secondWind.startingAtLevel) *
      secondWind.flatPerLevel
  );
}

function findCharacterClassLevel(
  classLevels: readonly CharacterBattleClassLevel[],
  className: ClassName,
): ClassLevel | undefined {
  return classLevels.find((classLevel) => classLevel.className === className)
    ?.level;
}

function requireCharacterClassLevel(
  classLevels: readonly CharacterBattleClassLevel[],
  className: ClassName,
): ClassLevel {
  const classLevel = findCharacterClassLevel(classLevels, className);
  if (classLevel === undefined) {
    throw new Error(
      `Character class feature resource requires a ${className} class level.`,
    );
  }
  return classLevel;
}

function parseSupportedSecondWindUnitFeature(
  unit: UnitRecord,
  classLevels: readonly CharacterBattleClassLevel[],
): SupportedSecondWindUnitFeature | null {
  if (unit.id !== SECOND_WIND_UNIT_ID || unit.kind !== "class_feature") {
    return null;
  }
  const classLevel = findCharacterClassLevel(classLevels, unit.className);
  if (classLevel === undefined) {
    return null;
  }
  const mechanics = unit.mechanics;
  if (
    mechanics.family !== "activation" ||
    mechanics.activationCost.kind !== "bonus_action" ||
    mechanics.resource.kind !== "use_count" ||
    mechanics.resetCadence.kind !== "partial_short_full_long" ||
    mechanics.phases.length !== 1
  ) {
    return null;
  }
  const phase = mechanics.phases[0];
  if (
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "self" ||
    phase.effects?.length !== 1
  ) {
    return null;
  }
  const effect = phase.effects[0];
  if (
    effect?.kind !== "heal_hp" ||
    effect.target !== "self" ||
    effect.amount.kind !== "linear_per_level" ||
    effect.amount.axis !== "class" ||
    effect.amount.perLevel.dice !== undefined ||
    effect.amount.perLevel.dieSize !== undefined ||
    effect.amount.base.dice === undefined ||
    effect.amount.base.dieSize === undefined
  ) {
    return null;
  }
  return {
    unit,
    dice: effect.amount.base.dice,
    dieSize: effect.amount.base.dieSize,
    flatBase: effect.amount.base.flat ?? 0,
    flatPerLevel: effect.amount.perLevel.flat ?? 0,
    startingAtLevel: effect.amount.startingAtLevel,
    className: unit.className,
    classLevel,
  };
}

function discoverSupportedSpellActs(
  state: BattleState,
  actorId: CombatantId,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    return [];
  }
  return supportedSpellActs(actor).flatMap(
    (invocation): readonly AvailableBattleAct[] => {
      if (!spellHasAvailableSpend(actor, invocation)) {
        return [];
      }
      if (invocation.kind === "cantripSaveGateDamage") {
        const savingThrowHole = spellSavingThrowOutcomeHole(
          state,
          actorId,
          invocation,
        );
        const castActs =
          savingThrowHole.areaChoices.length === 0
            ? []
            : [
                {
                  subject: {
                    tag: "actionSpell" as const,
                    actorId,
                    spellId: invocation.spell.id,
                    spellActId: supportedSpellActId(invocation),
                  },
                  label: invocation.spell.name,
                  summary: `Cast ${invocation.spell.name} as a cantrip; creatures in one ${invocation.area.radiusFeet}-foot point-origin Sphere make ${invocation.ability.toUpperCase()} Saving Throws.`,
                  initialHoles: [savingThrowHole],
                },
              ];
        return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
      }
      const targetHole = spellTargetHole(state, actorId, invocation);
      const castActs =
        targetHole.choices.length === 0
          ? []
          : [
              {
                subject: {
                  tag: "actionSpell" as const,
                  actorId,
                  spellId: invocation.spell.id,
                  spellActId: supportedSpellActId(invocation),
                },
                label: invocation.spell.name,
                summary:
                  invocation.kind === "preparedSlotSpell"
                    ? `Cast ${invocation.spell.name} using a level ${invocation.slotLevel} Spell Slot, with all darts at one target.`
                    : `Cast ${invocation.spell.name} as a cantrip.`,
                initialHoles: [targetHole],
              },
            ];
      return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
    },
  );
}

function spellRequiresVerbal(spell: SpellRecord): boolean {
  return (
    spell.mechanics.family === "activation" && spell.mechanics.components.v
  );
}

function readiedSpellAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: SupportedSpellAct,
): readonly AvailableBattleAct[] {
  if (
    invocation.kind === "preparedPersistentSpell" ||
    state.readiedSpells.has(actorId)
  ) {
    return [];
  }
  return BATTLE_READIED_SPELL_TRIGGERS.map((trigger) => ({
    subject: {
      tag: "actionSpell" as const,
      actorId,
      spellId: invocation.spell.id,
      spellActId: readiedSpellActId(invocation),
      readyTrigger: trigger,
    },
    label: `Ready ${invocation.spell.name}`,
    summary: `Ready ${invocation.spell.name} for ${reactionTriggerLabel(trigger)}; holding the spell requires Concentration until the start of your next turn.`,
    initialHoles: [],
  }));
}

function readiedSpellActId(invocation: SupportedDamageSpellAct): string {
  return `readiedSpell:${supportedSpellActId(invocation)}`;
}

function isReadiedSpellActId(spellActId: string | undefined): boolean {
  return spellActId?.startsWith("readiedSpell:") === true;
}

function castSpellActIdFromReadied(spellActId: string): string {
  return spellActId.slice("readiedSpell:".length);
}

function resolveSpellAct(
  input: ActionSpellBattleResolutionInput,
): BattleResolutionResult {
  const subject = input.subject;
  const actor = input.state.combatants.get(subject.actorId);
  const resolvedSpellActId =
    subject.spellActId !== undefined && isReadiedSpellActId(subject.spellActId)
      ? castSpellActIdFromReadied(subject.spellActId)
      : subject.spellActId;
  const invocation =
    actor?.origin.kind === "character"
      ? supportedSpellActs(actor).find((candidate) =>
          resolvedSpellActId === undefined
            ? candidate.spell.id === subject.spellId
            : supportedSpellActId(candidate) === resolvedSpellActId,
        )
      : undefined;
  if (actor?.origin.kind !== "character" || invocation == null) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Action-time spell act requires a supported prepared spell or cantrip.",
    );
  }
  if (!spellHasAvailableSpend(actor, invocation)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Action-time spell act no longer has its required runtime spell resource.",
    );
  }

  if (
    subject.readyTrigger !== undefined &&
    (subject.spellActId === undefined ||
      !isReadiedSpellActId(subject.spellActId))
  ) {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Ready trigger selection is only valid for a Ready spell act.",
    );
  }

  const castingState = spellRequiresVerbal(invocation.spell)
    ? revealHidden(input.state, subject.actorId)
    : input.state;
  if (
    subject.spellActId !== undefined &&
    isReadiedSpellActId(subject.spellActId)
  ) {
    return resolveReadySpellAct({ ...input, state: castingState }, invocation);
  }

  const fillSet = spellFillSet(input.fills, invocation);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (invocation.kind === "cantripSaveGateDamage") {
    return resolveSaveGateDamageSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }

  if (fillSet.targetId == null) {
    return needsHolesResult(castingState, input.subject, [
      spellTargetHole(castingState, subject.actorId, invocation),
    ]);
  }
  const target = input.state.combatants.get(fillSet.targetId);
  if (
    target == null ||
    !spellTargetIsLegal(
      input.state,
      subject.actorId,
      target.combatantId,
      invocation,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell target must be a combatant within the selected spell's supported range.",
    );
  }

  if (invocation.kind === "preparedPersistentSpell") {
    if (
      fillSet.attackRoll != null ||
      fillSet.damageRoll != null ||
      fillSet.concentrationSavingThrows.length > 0
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Persistent spell effects do not use attack or damage fills.",
      );
    }
    const effected = applyPersistentSpellActiveEffect(
      castingState,
      subject.actorId,
      target.combatantId,
      invocation,
    );
    const spent = spendAction(effected.currentTurnResources, "magic");
    if (Either.isLeft(spent)) {
      return invalidResult(
        input.state,
        "staleSubject",
        "Magic action is no longer available for the current actor.",
      );
    }
    const slotted = expendSpellSlot(
      effected,
      subject.actorId,
      invocation.slotLevel,
    );
    const nextState = { ...slotted, currentTurnResources: spent.right };
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    castingState,
    {
      trigger: "spellCast",
      casterId: subject.actorId,
      spellId: invocation.spell.id,
      continuation: {
        kind: "replay",
        subject: input.subject,
        fills: input.fills,
      },
    },
    input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  if (invocation.kind === "cantripSpellAttack") {
    const requiredRollMode = requiredAttackRollMode(
      castingState,
      subject.actorId,
      target.combatantId,
    );
    if (fillSet.attackRoll == null) {
      return needsHolesResult(castingState, input.subject, [
        spellAttackRollHole(invocation, requiredRollMode),
      ]);
    }
    if (!attackRollResultIsValid(fillSet.attackRoll)) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell attack roll result is outside the d20 attack-roll protocol.",
      );
    }
    if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell attack roll mode does not match the current attack-roll rule.",
      );
    }
    const hit = attackRollHits(
      fillSet.attackRoll,
      currentArmorClass(activeEffectArmorClass(target)),
    );
    const critical = attackRollIsCriticalHit(fillSet.attackRoll);
    if (hit && fillSet.damageRoll == null) {
      return needsHolesResult(castingState, input.subject, [
        spellDamageHole(invocation, critical),
      ]);
    }
    if (!hit && fillSet.damageRoll != null) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage can only be filled after a hit.",
      );
    }
    if (!hit) {
      return spendMagicAction(castingState);
    }
  } else if (fillSet.attackRoll != null) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Magic Missile does not use an attack roll.",
    );
  }

  if (fillSet.damageRoll == null) {
    return needsHolesResult(castingState, input.subject, [
      spellDamageHole(invocation),
    ]);
  }
  const critical =
    invocation.kind === "cantripSpellAttack" &&
    fillSet.attackRoll != null &&
    attackRollIsCriticalHit(fillSet.attackRoll);
  const damageValidation = validateSpellDamageFill(
    fillSet.damageRoll,
    invocation,
    critical,
  );
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  const spellDamageAmount = spellDamageAmountForTarget(
    target,
    invocation,
    fillSet.damageRoll,
  );
  const concentrationSave = concentrationSavingThrowHole(
    target,
    spellDamageAmount,
  );
  const concentrationFill =
    concentrationSave === null
      ? undefined
      : concentrationSavingThrowFillFor(
          fillSet.concentrationSavingThrows,
          concentrationSave,
        );
  if (concentrationSave !== null) {
    if (concentrationFill === undefined) {
      return needsHolesResult(castingState, input.subject, [concentrationSave]);
    }
    if (fillSet.concentrationSavingThrows.length > 1) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage accepts one Concentration Saving Throw fill for the damaged target.",
      );
    }
  } else if (fillSet.concentrationSavingThrows.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    );
  }
  const damaged = applySpellDamage(
    castingState,
    target.combatantId,
    invocation,
    fillSet.damageRoll,
    critical,
    concentrationFill,
  );
  const effected = applySpellActiveEffects(
    damaged,
    subject.actorId,
    target.combatantId,
    invocation,
  );
  const spent = spendAction(effected.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  const slotted =
    invocation.kind === "preparedSlotSpell"
      ? expendSpellSlot(effected, subject.actorId, invocation.slotLevel)
      : effected;
  const nextState = { ...slotted, currentTurnResources: spent.right };
  const afterDamageReactionWindow = maybeOpenReactionWindow(
    nextState,
    {
      trigger: "afterDamage",
      damageSourceId: subject.actorId,
      damagedId: target.combatantId,
      damageAmount: spellDamageAmount,
      continuation: {
        kind: "resolved",
        subject: input.subject,
      },
    },
    input.suppressedReactionTrigger,
  );
  if (afterDamageReactionWindow !== null) {
    return afterDamageReactionWindow;
  }

  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveReadySpellAct(
  input: ActionSpellBattleResolutionInput,
  invocation: SupportedSpellAct,
): BattleResolutionResult {
  if (invocation.kind === "preparedPersistentSpell") {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Persistent spell effects cannot be readied by this runtime lane.",
    );
  }
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Ready Spell does not accept release-time fills.",
    );
  }
  if (input.state.readiedSpells.has(input.subject.actorId)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This caster is already holding a readied spell.",
    );
  }

  const afterPriorConcentration = breakBattleConcentration(
    input.state,
    input.subject.actorId,
  );
  const refreshedActor = afterPriorConcentration.combatants.get(
    input.subject.actorId,
  );
  if (refreshedActor?.origin.kind !== "character") {
    return invalidResult(
      input.state,
      "staleSubject",
      "Ready Spell caster is no longer available.",
    );
  }
  const concentratingActor = {
    ...refreshedActor,
    concentration: {
      sourceSpellId: invocation.spell.id,
      effectKind: "readiedSpell" as const,
    },
  };
  const withConcentration = {
    ...afterPriorConcentration,
    combatants: new Map(afterPriorConcentration.combatants).set(
      input.subject.actorId,
      concentratingActor,
    ),
    readiedSpells: new Map(afterPriorConcentration.readiedSpells).set(
      input.subject.actorId,
      {
        invocation,
        trigger: input.subject.readyTrigger ?? "spellCast",
        expiresAt: {
          kind: "startOfTurn" as const,
          combatantId: input.subject.actorId,
        },
      },
    ),
  };
  const spent = spendAction(withConcentration.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  const slotted =
    invocation.kind === "preparedSlotSpell"
      ? expendSpellSlot(
          withConcentration,
          input.subject.actorId,
          invocation.slotLevel,
        )
      : withConcentration;
  const nextState = { ...slotted, currentTurnResources: spent.right };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveSpellRelease(
  input: ActionSpellBattleResolutionInput,
  invocation: SupportedDamageSpellAct,
): BattleResolutionResult {
  const fillSet = spellFillSet(input.fills, invocation);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (invocation.kind === "cantripSaveGateDamage") {
    return resolveSaveGateDamageSpellRelease({
      input,
      actorId: input.subject.actorId,
      invocation,
      fillSet,
    });
  }

  if (fillSet.targetId == null) {
    return needsHolesResult(input.state, input.subject, [
      spellTargetHole(input.state, input.subject.actorId, invocation),
    ]);
  }
  const target = input.state.combatants.get(fillSet.targetId);
  if (
    target == null ||
    !spellTargetIsLegal(
      input.state,
      input.subject.actorId,
      target.combatantId,
      invocation,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Readied spell target must be a combatant within the selected spell's supported range.",
    );
  }
  if (invocation.kind === "cantripSpellAttack") {
    const requiredRollMode = requiredAttackRollMode(
      input.state,
      input.subject.actorId,
      target.combatantId,
    );
    if (fillSet.attackRoll == null) {
      return needsHolesResult(input.state, input.subject, [
        spellAttackRollHole(invocation, requiredRollMode),
      ]);
    }
    if (!attackRollResultIsValid(fillSet.attackRoll)) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell attack roll result is outside the d20 attack-roll protocol.",
      );
    }
    if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Readied spell attack roll mode does not match the current attack-roll rule.",
      );
    }
    const hit = attackRollHits(
      fillSet.attackRoll,
      currentArmorClass(activeEffectArmorClass(target)),
    );
    const critical = attackRollIsCriticalHit(fillSet.attackRoll);
    if (hit && fillSet.damageRoll == null) {
      return needsHolesResult(input.state, input.subject, [
        spellDamageHole(invocation, critical),
      ]);
    }
    if (!hit && fillSet.damageRoll != null) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage can only be filled after a hit.",
      );
    }
    if (!hit) {
      return {
        tag: "resolved",
        state: input.state,
        snapshot: snapshotBattle(input.state),
      };
    }
  } else if (fillSet.attackRoll != null) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Magic Missile does not use an attack roll.",
    );
  }

  if (fillSet.damageRoll == null) {
    return needsHolesResult(input.state, input.subject, [
      spellDamageHole(invocation),
    ]);
  }
  const critical =
    invocation.kind === "cantripSpellAttack" &&
    fillSet.attackRoll != null &&
    attackRollIsCriticalHit(fillSet.attackRoll);
  const damageValidation = validateSpellDamageFill(
    fillSet.damageRoll,
    invocation,
    critical,
  );
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  const concentrationSave = concentrationSavingThrowHole(
    target,
    spellDamageAmountForTarget(target, invocation, fillSet.damageRoll),
  );
  const concentrationFill =
    concentrationSave === null
      ? undefined
      : concentrationSavingThrowFillFor(
          fillSet.concentrationSavingThrows,
          concentrationSave,
        );
  if (concentrationSave !== null) {
    if (concentrationFill === undefined) {
      return needsHolesResult(input.state, input.subject, [concentrationSave]);
    }
    if (fillSet.concentrationSavingThrows.length > 1) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Readied spell damage accepts one Concentration Saving Throw fill for the damaged target.",
      );
    }
  } else if (fillSet.concentrationSavingThrows.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    );
  }
  const damaged = applySpellDamage(
    input.state,
    target.combatantId,
    invocation,
    fillSet.damageRoll,
    critical,
    concentrationFill,
  );
  const effected = applySpellActiveEffects(
    damaged,
    input.subject.actorId,
    target.combatantId,
    invocation,
  );
  return {
    tag: "resolved",
    state: effected,
    snapshot: snapshotBattle(effected),
  };
}

function resolveSaveGateDamageSpellRelease(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "cantripSaveGateDamage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  const beforeSpend = resolveSaveGateDamageSpellAct(input);
  if (beforeSpend.tag !== "resolved") {
    return beforeSpend;
  }
  return {
    tag: "resolved",
    state: {
      ...beforeSpend.state,
      currentTurnResources: input.input.state.currentTurnResources,
    },
    snapshot: snapshotBattle({
      ...beforeSpend.state,
      currentTurnResources: input.input.state.currentTurnResources,
    }),
  };
}

type SpellFillSet =
  | {
      readonly tag: "ok";
      readonly targetId: CombatantId | undefined;
      readonly attackRoll: AttackRollResult | undefined;
      readonly savingThrowOutcomes:
        | readonly BattleSavingThrowOutcome[]
        | undefined;
      readonly concentrationSavingThrows: readonly Extract<
        BattleFill,
        { readonly kind: "concentrationSavingThrow" }
      >[];
      readonly damageRoll:
        | Extract<BattleFill, { readonly kind: "rolledDice" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string };

function spellFillSet(
  fills: readonly BattleFill[],
  invocation: SupportedSpellAct,
): SpellFillSet {
  let targetId: CombatantId | undefined;
  let attackRoll: AttackRollResult | undefined;
  let savingThrowOutcomes: readonly BattleSavingThrowOutcome[] | undefined;
  const concentrationSavingThrows: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[] = [];
  let damageRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  for (const fill of fills) {
    if (fill.kind === "targetChoice" && fill.holeId === ATTACK_TARGET_HOLE_ID) {
      if (targetId !== undefined) {
        return { tag: "invalid", message: "Spell target was filled twice." };
      }
      targetId = fill.value;
      continue;
    }

    if (fill.kind === "attackRoll" && fill.holeId === ATTACK_ROLL_HOLE_ID) {
      if (attackRoll !== undefined) {
        return {
          tag: "invalid",
          message: "Spell attack roll was filled twice.",
        };
      }
      attackRoll = fill.value;
      continue;
    }

    if (fill.kind === "savingThrowOutcome") {
      if (invocation.kind !== "cantripSaveGateDamage") {
        return {
          tag: "invalid",
          message: "Spell saving throw outcomes do not match this spell act.",
        };
      }
      if (fill.holeId !== spellSavingThrowOutcomeHoleId(invocation)) {
        return {
          tag: "invalid",
          message:
            "Spell saving throw outcomes must use the selected spell act outcome hole.",
        };
      }
      if (savingThrowOutcomes !== undefined) {
        return {
          tag: "invalid",
          message: "Spell saving throw outcomes were filled twice.",
        };
      }
      savingThrowOutcomes = fill.value;
      continue;
    }

    if (fill.kind === "rolledDice") {
      if (damageRoll !== undefined) {
        return { tag: "invalid", message: "Spell damage was filled twice." };
      }
      damageRoll = fill;
      continue;
    }

    if (fill.kind === "concentrationSavingThrow") {
      if (
        concentrationSavingThrows.some(
          (candidate) => candidate.holeId === fill.holeId,
        )
      ) {
        return {
          tag: "invalid",
          message: "Concentration Saving Throw was filled twice.",
        };
      }
      concentrationSavingThrows.push(fill);
      continue;
    }

    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the spell replay holes.`,
    };
  }

  return {
    tag: "ok",
    targetId,
    attackRoll,
    savingThrowOutcomes,
    concentrationSavingThrows,
    damageRoll,
  };
}

function concentrationSavingThrowFillFor(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[],
  hole: BattleConcentrationSavingThrowHole,
):
  | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
  | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

function resolveSaveGateDamageSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "cantripSaveGateDamage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (input.fillSet.targetId !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate damage spells use saving throw outcome fills, not a single-target fill.",
    );
  }
  if (input.fillSet.attackRoll !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate damage spells do not use an attack roll.",
    );
  }
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }

  const savingThrowValidation = validateSavingThrowOutcomes(
    input.fillSet.savingThrowOutcomes,
    savingThrowHole,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }

  const failedTargets = input.fillSet.savingThrowOutcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.input.state,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceSpellId: input.invocation.spell.id,
        continuation: {
          kind: "replay",
          subject:
            input.input.reactionContinuationSubject ?? input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }
  if (failedTargets.length === 0) {
    if (input.fillSet.damageRoll !== undefined) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Save-gate spell damage can only be filled when at least one target failed its Saving Throw.",
      );
    }
    return spendMagicAction(input.input.state);
  }

  if (input.fillSet.damageRoll == null) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageHole(input.invocation),
    ]);
  }
  const damageRoll = input.fillSet.damageRoll;
  const damageValidation = validateSpellDamageFill(
    damageRoll,
    input.invocation,
    false,
  );
  if (damageValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", damageValidation);
  }

  const concentrationSaves = failedTargets.flatMap((targetId) => {
    const target = input.input.state.combatants.get(targetId);
    if (target === undefined) {
      return [];
    }
    const damageAmount = spellDamageAmountForTarget(
      target,
      input.invocation,
      damageRoll,
    );
    const hole = concentrationSavingThrowHole(target, damageAmount);
    return hole === null ? [] : [hole];
  });
  const missingConcentrationSaves = concentrationSaves.filter(
    (concentrationSave) =>
      concentrationSavingThrowFillFor(
        input.fillSet.concentrationSavingThrows,
        concentrationSave,
      ) === undefined,
  );
  if (missingConcentrationSaves.length > 0) {
    return needsHolesResult(
      input.input.state,
      input.input.subject,
      missingConcentrationSaves,
    );
  }
  const concentrationSaveIds = new Set<BattleHoleId>(
    concentrationSaves.map((concentrationSave) => concentrationSave.holeId),
  );
  if (
    input.fillSet.concentrationSavingThrows.some(
      (fill) => !concentrationSaveIds.has(fill.holeId),
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    );
  }
  const concentrationSaveByTargetId = new Map(
    concentrationSaves.map((concentrationSave) => [
      concentrationSave.combatantId,
      concentrationSavingThrowFillFor(
        input.fillSet.concentrationSavingThrows,
        concentrationSave,
      ),
    ]),
  );
  const damaged = failedTargets.reduce(
    (state, targetId) =>
      applySpellDamage(
        state,
        targetId,
        input.invocation,
        damageRoll,
        false,
        concentrationSaveByTargetId.get(targetId),
      ),
    input.input.state,
  );
  const spent = spendAction(damaged.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  const nextState = { ...damaged, currentTurnResources: spent.right };
  const afterDamageReactionWindow = maybeOpenReactionWindow(
    nextState,
    {
      trigger: "afterDamage",
      damageSourceId: input.actorId,
      damagedId: failedTargets[0]!,
      damageAmount: spellDamageAmountForTarget(
        input.input.state.combatants.get(failedTargets[0]!)!,
        input.invocation,
        damageRoll,
      ),
      continuation: {
        kind: "resolved",
        subject: input.input.subject,
      },
    },
    input.input.suppressedReactionTrigger,
  );
  if (afterDamageReactionWindow !== null) {
    return afterDamageReactionWindow;
  }

  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function validateSavingThrowOutcomes(
  outcomes: readonly BattleSavingThrowOutcome[],
  hole: BattleSpellSavingThrowOutcomeHole,
): string | null {
  if (outcomes.length === 0) {
    return "Save-gate spell must include at least one affected target Saving Throw outcome.";
  }
  const seenTargets = new Set<CombatantId>();
  for (const outcome of outcomes) {
    const targetId = outcome.targetId;
    if (seenTargets.has(targetId)) {
      return "Save-gate spell Saving Throw outcomes must not duplicate targets.";
    }
    seenTargets.add(targetId);
  }
  const matchesOneArea = hole.areaChoices.some((choice) =>
    sameCombatantIdSet(seenTargets, choice.affectedTargetIds),
  );
  if (!matchesOneArea) {
    return "Save-gate spell Saving Throw outcomes must exactly match one legal point-origin Sphere area.";
  }
  return null;
}

function sameCombatantIdSet(
  actual: ReadonlySet<CombatantId>,
  expected: readonly CombatantId[],
): boolean {
  return (
    actual.size === expected.length &&
    expected.every((targetId) => actual.has(targetId))
  );
}

function spendMagicAction(
  state: BattleState,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  const spent = spendAction(state.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }

  const nextState = { ...state, currentTurnResources: spent.right };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function applyAttackDamage(
  state: BattleState,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
  fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>,
): BattleState {
  if (fillSet.damageRoll == null) {
    return state;
  }

  const target = state.combatants.get(targetId);
  if (target == null) {
    return state;
  }
  const damageAmount = attackDamageAmount(
    target,
    attack,
    fillSet.damageRoll,
    fillSet.attackRoll != null && attackRollIsCriticalHit(fillSet.attackRoll),
    fillSet.attackRoll,
  );
  const damaged = applyHpDamage(target, damageAmount, {
    deathFailuresAtZeroHp:
      fillSet.attackRoll != null && attackRollIsCriticalHit(fillSet.attackRoll)
        ? 2
        : 1,
  });
  const combatants = new Map(state.combatants).set(targetId, damaged);

  const nextState = {
    ...state,
    combatants,
  };
  const concentrated =
    fillSet.concentrationSavingThrow?.value.succeeded === false ||
    (target.concentration !== null && damaged.concentration === null)
      ? breakBattleConcentration(nextState, targetId)
      : nextState;
  return normalizeBattleGrapples(concentrated);
}

type BattleDamageContext = {
  readonly deathFailuresAtZeroHp: 1 | 2;
};

function applyHpDamage(
  combatant: BattleCreatureState,
  damageAmount: number,
  context: BattleDamageContext,
): BattleCreatureState {
  const effectiveDamage = Math.max(0, Math.floor(damageAmount));
  if (effectiveDamage <= 0 || zeroHpLifecycleIsTerminal(combatant)) {
    return combatant;
  }

  const currentTempHp = Number(combatant.tempHp);
  const currentHp = Number(combatant.hp);
  const tempHpAbsorbed = Math.min(currentTempHp, effectiveDamage);
  const hpDamage = effectiveDamage - tempHpAbsorbed;
  const nextHp = Hp(Math.max(0, currentHp - hpDamage));
  const massiveDamageKills =
    hpDamage > 0 &&
    (currentHp <= 0 ? hpDamage : hpDamage - currentHp) >=
      Number(combatant.maxHp);
  const damaged = {
    ...combatant,
    hp: nextHp,
    tempHp: Hp(currentTempHp - tempHpAbsorbed),
  };

  if (currentHp <= 0) {
    return massiveDamageKills
      ? applyInstantDeath(damaged)
      : applyDamageAtZeroHp(damaged, context);
  }

  if (Number(nextHp) > 0) {
    return damaged;
  }

  return massiveDamageKills
    ? applyInstantDeath(damaged)
    : applyDropToZeroHpLifecycle(damaged);
}

function applyHpHealing(
  combatant: BattleCreatureState,
  healingAmount: number,
): BattleCreatureState {
  const effectiveHealing = Math.max(0, Math.floor(healingAmount));
  if (effectiveHealing <= 0 || zeroHpLifecycleIsTerminal(combatant)) {
    return combatant;
  }

  const currentHp = Number(combatant.hp);
  const nextHp = Hp(
    Math.min(Number(combatant.maxHp), currentHp + effectiveHealing),
  );
  if (currentHp <= 0 && Number(nextHp) > 0) {
    return {
      ...combatant,
      hp: nextHp,
      conditions: removeCondition(combatant.conditions, "unconscious"),
      zeroHpLifecycle:
        combatant.zeroHpLifecycle.policy === "usesDeathSavingThrows"
          ? {
              ...combatant.zeroHpLifecycle,
              deathSaves: resetDeathSaveRuntimeState(),
            }
          : combatant.zeroHpLifecycle,
    };
  }

  return { ...combatant, hp: nextHp };
}

function applyInitialZeroHpLifecycle(
  combatant: BattleCreatureState,
): BattleCreatureState {
  if (Number(combatant.hp) > 0) {
    return combatant;
  }

  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () =>
      withoutConcentration(combatant),
    ),
    Match.when({ policy: "usesDeathSavingThrows" }, () => ({
      ...combatant,
      conditions: applyCondition(combatant.conditions, "unconscious"),
    })),
    Match.exhaustive,
  );
}

function applyDropToZeroHpLifecycle(
  combatant: BattleCreatureState,
): BattleCreatureState {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () =>
      withoutConcentration(combatant),
    ),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      ...withoutConcentration(combatant),
      conditions: applyCondition(combatant.conditions, "unconscious"),
      zeroHpLifecycle: {
        ...lifecycle,
        deathSaves: resetDeathSaveRuntimeState(),
      },
    })),
    Match.exhaustive,
  );
}

function applyDamageAtZeroHp(
  combatant: BattleCreatureState,
  context: BattleDamageContext,
): BattleCreatureState {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () =>
      withoutConcentration(combatant),
    ),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      ...withoutConcentration(combatant),
      conditions: applyCondition(combatant.conditions, "unconscious"),
      zeroHpLifecycle: {
        ...lifecycle,
        deathSaves: addDeathFailures(
          lifecycle.deathSaves,
          context.deathFailuresAtZeroHp,
        ),
      },
    })),
    Match.exhaustive,
  );
}

function startTurnDeathSavingThrowRequired(
  combatant: BattleCreatureState | undefined,
): combatant is BattleCreatureState & {
  readonly zeroHpLifecycle: Extract<
    ZeroHpLifecycle,
    { readonly policy: "usesDeathSavingThrows" }
  >;
} {
  return (
    combatant !== undefined &&
    Number(combatant.hp) === 0 &&
    combatant.zeroHpLifecycle.policy === "usesDeathSavingThrows" &&
    !combatant.zeroHpLifecycle.deathSaves.stable &&
    !combatant.zeroHpLifecycle.deathSaves.dead
  );
}

function applyStartTurnDeathSavingThrow(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  roll: DieRollResult,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const combatant = combatants.get(actorId);
  if (!startTurnDeathSavingThrowRequired(combatant)) {
    return combatants;
  }

  const deathSaves = resolveDeathSavingThrow(
    combatant.zeroHpLifecycle.deathSaves,
    Number(roll),
  );
  const nextCombatant = {
    ...combatant,
    hp: deathSaves.hpRegained ? Hp(1) : combatant.hp,
    conditions: deathSaves.hpRegained
      ? removeCondition(combatant.conditions, "unconscious")
      : combatant.conditions,
    zeroHpLifecycle: {
      ...combatant.zeroHpLifecycle,
      deathSaves,
    },
  };

  return new Map(combatants).set(actorId, nextCombatant);
}

function deathSavingThrowHole(
  actorId: CombatantId,
): BattleDeathSavingThrowHole {
  return {
    kind: "deathSavingThrow",
    holeInstanceKey: DEATH_SAVING_THROW_HOLE_INSTANCE,
    holeId: DEATH_SAVING_THROW_HOLE_ID,
    label: "Death Saving Throw",
    combatantId: actorId,
  };
}

function statBlockRechargeRollHole(
  combatant: BattleCreatureState | undefined,
): BattleStatBlockRechargeRollHole | null {
  if (combatant?.origin.kind !== "statBlock") return null;
  const rechargeTargets = unavailableRechargeTargets(
    combatant.origin.statBlock.statBlock,
    combatant.origin.resources,
  );
  if (rechargeTargets.length === 0) return null;
  return {
    kind: "statBlockRechargeRoll",
    holeInstanceKey: STAT_BLOCK_RECHARGE_ROLL_HOLE_INSTANCE,
    holeId: STAT_BLOCK_RECHARGE_ROLL_HOLE_ID,
    label: "Stat Block Recharge roll",
    combatantId: combatant.combatantId,
    rechargeTargets,
  };
}

function unavailableRechargeTargets(
  statBlock: StatBlockRecord["statBlock"],
  resources: StatBlockMutableResourceState,
): readonly StatBlockPartKey[] {
  return resources.unavailableRechargeParts.filter(
    (key) => statBlockLimitedUseForPart(statBlock, key)?.kind === "recharge",
  );
}

function processStatBlockRechargeRolls(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  rolls: readonly BattleStatBlockRechargeRollResult[],
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const combatant = combatants.get(actorId);
  if (combatant?.origin.kind !== "statBlock") return combatants;
  const statBlock = combatant.origin.statBlock.statBlock;
  const nextResources = {
    ...combatant.origin.resources,
    unavailableRechargeParts:
      combatant.origin.resources.unavailableRechargeParts.filter((key) => {
        const limitedUse = statBlockLimitedUseForPart(statBlock, key);
        const result = rolls.find((roll) =>
          sameStatBlockPartKey(roll.target, key),
        );
        return (
          limitedUse?.kind !== "recharge" ||
          result === undefined ||
          result.roll < limitedUse.minimumRoll
        );
      }),
  };
  return new Map(combatants).set(actorId, {
    ...combatant,
    origin: {
      ...combatant.origin,
      resources: nextResources,
    },
  });
}

function concentrationSavingThrowHole(
  combatant: BattleCreatureState,
  damageAmount: number,
): BattleConcentrationSavingThrowHole | null {
  const effectiveDamage = Math.max(0, Math.floor(damageAmount));
  if (combatant.concentration === null || effectiveDamage <= 0) {
    return null;
  }
  const holeKey = `${CONCENTRATION_SAVING_THROW_HOLE_INSTANCE_PREFIX}:${combatant.combatantId}`;
  return {
    kind: "concentrationSavingThrow",
    holeInstanceKey: holeInstanceKey(holeKey),
    holeId: holeId(holeKey),
    label: "Concentration Constitution Saving Throw",
    combatantId: combatant.combatantId,
    dc: concentrationSavingThrowDc(effectiveDamage),
    damageAmount: effectiveDamage,
  };
}

function applyInstantDeath(
  combatant: BattleCreatureState,
): BattleCreatureState {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () =>
      withoutConcentration(combatant),
    ),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      ...withoutConcentration(combatant),
      conditions: applyCondition(combatant.conditions, "unconscious"),
      zeroHpLifecycle: {
        ...lifecycle,
        deathSaves: addDeathFailures(lifecycle.deathSaves, 3),
      },
    })),
    Match.exhaustive,
  );
}

function withoutConcentration(
  combatant: BattleCreatureState,
): BattleCreatureState {
  if (combatant.concentration === null) {
    return combatant;
  }
  return {
    ...combatant,
    concentration: null,
    activeEffects: combatant.activeEffects.filter(
      (effect) =>
        effect.kind !== "mageArmorBaseArmorClass" ||
        !effect.earlyEnds.some(
          (earlyEnd) => earlyEnd.kind === "concentrationBroken",
        ),
    ),
  };
}

function breakCombatantConcentration(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  combatantId: CombatantId,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  if (!combatants.has(combatantId)) {
    return combatants;
  }
  return new Map(
    [...combatants].map(([id, combatant]) => [
      id,
      {
        ...combatant,
        concentration: id === combatantId ? null : combatant.concentration,
        activeEffects: combatant.activeEffects.filter(
          (effect) => !concentrationBrokenEffectFrom(effect, combatantId),
        ),
      },
    ]),
  );
}

function concentrationBrokenEffectFrom(
  effect: BattleActiveEffect,
  combatantId: CombatantId,
): boolean {
  return (
    effect.sourceCombatantId === combatantId &&
    effect.kind === "mageArmorBaseArmorClass" &&
    effect.earlyEnds.some((earlyEnd) => earlyEnd.kind === "concentrationBroken")
  );
}

function zeroHpLifecycleIsTerminal(combatant: BattleCreatureState): boolean {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () => combatant.hp === 0),
    Match.when(
      { policy: "usesDeathSavingThrows" },
      (lifecycle) => lifecycle.deathSaves.dead,
    ),
    Match.exhaustive,
  );
}

function attackDamageAmount(
  target: BattleCreatureState,
  attack: SupportedAttackActionOption,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  critical: boolean,
  attackRoll?: AttackRollResult,
): number {
  const components = attackDamageComponents(attack, critical, attackRoll);
  const damageByType = damageRoll.value.reduce<ReadonlyMap<DamageType, number>>(
    (totals, group, index) => {
      const component = components[index];
      if (component === undefined) {
        return totals;
      }
      const diceTotal = group.results.reduce(
        (groupTotal, dieResult) => groupTotal + Number(dieResult),
        0,
      );
      const unadjusted =
        diceTotal + (index === 0 ? attackDamageModifier(attack) : 0);
      return addDamageAmountForType(totals, component.damageType, unadjusted);
    },
    new Map(),
  );

  return damageAmountByTypeAfterTargetAdjustments(target, damageByType);
}

function addDamageAmountForType(
  totals: ReadonlyMap<DamageType, number>,
  damageType: DamageType,
  amount: number,
): ReadonlyMap<DamageType, number> {
  return new Map(totals).set(
    damageType,
    (totals.get(damageType) ?? 0) + amount,
  );
}

function damageAmountByTypeAfterTargetAdjustments(
  target: BattleCreatureState,
  damageByType: ReadonlyMap<DamageType, number>,
): number {
  return [...damageByType].reduce(
    (total, [damageType, amount]) =>
      total + damageAmountAfterTargetAdjustments(target, amount, damageType),
    0,
  );
}

function damageAmountAfterTargetAdjustments(
  target: BattleCreatureState,
  amount: number,
  damageType: DamageType,
): number {
  if (target.origin.kind !== "statBlock") {
    return amount;
  }

  const statBlock = target.origin.statBlock.statBlock;
  if (statBlock.immunities?.damageTypes?.includes(damageType) === true) {
    return 0;
  }

  const afterResistance =
    statBlock.resistances?.kind === "fixed" &&
    statBlock.resistances.damageTypes.includes(damageType)
      ? Math.floor(amount / 2)
      : amount;

  return statBlock.vulnerabilities?.damageTypes.includes(damageType) === true
    ? afterResistance * 2
    : afterResistance;
}

function supportedSpellActs(
  actor: BattleCreatureState,
): readonly SupportedSpellAct[] {
  if (actor.origin.kind !== "character") {
    return [];
  }
  const spellcasting = actor.origin.spellcasting;
  if (spellcasting === undefined || !spellcasting.canCastSpells) {
    return [];
  }

  return [
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedSlotSpell(spell),
    ),
    ...spellcasting.preparedSpells.flatMap((spell) =>
      supportedPreparedPersistentSpell(actor.combatantId, spell),
    ),
    ...spellcasting.cantrips.flatMap((spell) =>
      supportedCantripSpellAttack(
        spell,
        spellcasting.spellcastingAbilityModifier,
        spellcasting.proficiencyBonus,
      ),
    ),
    ...spellcasting.cantrips.flatMap((spell) =>
      supportedCantripSaveGateDamage(spell),
    ),
  ];
}

function supportedPreparedSlotSpell(
  spell: SpellRecord,
): readonly SupportedSpellAct[] {
  if (spell.id !== "magic_missile" || spell.mechanics.family !== "activation") {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "direct" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.effects?.length !== 1
  ) {
    return [];
  }
  const effect = phase.effects?.[0];
  if (effect?.kind !== "damage" || typeof effect.damageType !== "string") {
    return [];
  }
  const damageExpr = supportedDamageAmountExpr(effect.amount);
  if (damageExpr == null || typeof effect.damageType !== "string") {
    return [];
  }
  const repeatedEffectCount = supportedAllDartsAtOneTargetCount(
    phase.attachment.value.selection,
  );
  return repeatedEffectCount !== null
    ? [
        {
          kind: "preparedSlotSpell",
          spell,
          targeting: {
            kind: "allRepeatedEffectsAtOneTarget",
            repeatedEffectCount,
          },
          slotLevel: 1,
          damage: {
            expr: damageExpr,
            damageType: effect.damageType,
          },
          rangeFeet: spell.mechanics.range.feet,
        },
      ]
    : [];
}

function supportedPreparedPersistentSpell(
  actorId: CombatantId,
  spell: SpellRecord,
): readonly SupportedSpellAct[] {
  if (
    spell.id !== "mage_armor" ||
    spell.mechanics.family !== "ongoing_effect"
  ) {
    return [];
  }
  const operation = spell.mechanics.operations[0];
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "hour" ||
    spell.mechanics.duration.value.amount !== 8 ||
    spell.mechanics.operations.length !== 1 ||
    operation?.trigger.kind !== "passive" ||
    operation.effect.kind !== "modify_ac_set_base" ||
    operation.effect.formula.kind !== "base_plus_dex"
  ) {
    return [];
  }

  return [
    {
      kind: "preparedPersistentSpell",
      spell,
      slotLevel: 1,
      rangeFeet: 5,
      activeEffect: {
        kind: "mageArmorBaseArmorClass",
        sourceSpellId: spell.id,
        sourceCombatantId: actorId,
        base: operation.effect.formula.base,
        ability: "dex",
        duration: {
          kind: "hours",
          amount: spell.mechanics.duration.value.amount,
        },
        earlyEnds: [{ kind: "targetDonsArmor" }],
      },
    },
  ];
}

function supportedCantripSpellAttack(
  spell: SpellRecord,
  spellcastingAbilityModifier: number,
  proficiencyBonus: ProficiencyBonusType,
): readonly SupportedSpellAct[] {
  if (spell.id !== "ray_of_frost" || spell.mechanics.family !== "activation") {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  if (
    spell.mechanics.level !== 0 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "attack_roll" ||
    phase.attackKind !== "ranged_spell_attack" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target" ||
    phase.onHit.length !== 2 ||
    phase.onMiss.length !== 1 ||
    phase.onMiss[0]?.kind !== "none"
  ) {
    return [];
  }
  const [damageEffect, speedEffect] = phase.onHit;
  if (
    damageEffect?.kind !== "damage" ||
    typeof damageEffect.damageType !== "string" ||
    speedEffect?.kind !== "modify_speed" ||
    speedEffect.unit !== "feet" ||
    speedEffect.delta >= 0
  ) {
    return [];
  }
  const damageExpr = supportedDamageAmountExpr(damageEffect.amount);
  if (damageExpr == null || typeof damageEffect.damageType !== "string") {
    return [];
  }

  return [
    {
      kind: "cantripSpellAttack",
      spell,
      damage: {
        expr: damageExpr,
        damageType: damageEffect.damageType,
      },
      rangeFeet: spell.mechanics.range.feet,
      attackBonus: spellcastingAbilityModifier + proficiencyBonus,
      speedReduction: {
        deltaFeet: speedEffect.delta,
      },
    },
  ];
}

function supportedCantripSaveGateDamage(
  spell: SpellRecord,
): readonly SupportedSpellAct[] {
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  const phase = spell.mechanics.phases[0];
  if (
    spell.mechanics.level !== 0 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.phases.length !== 1 ||
    phase?.kind !== "save_gate" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "area" ||
    phase.attachment.value.origin.kind !== "point_within_range" ||
    phase.attachment.value.shape.kind !== "sphere" ||
    phase.attachment.value.shape.radiusFeet !==
      ACID_SPLASH_POINT_SPHERE_RADIUS_FEET ||
    phase.onSuccess.kind !== "none" ||
    phase.onFail.kind !== "damage" ||
    typeof phase.onFail.damageType !== "string"
  ) {
    return [];
  }
  const damageExpr = supportedDamageAmountExpr(phase.onFail.amount);
  if (damageExpr == null) {
    return [];
  }

  return [
    {
      kind: "cantripSaveGateDamage",
      spell,
      ability: phase.ability,
      dc: phase.dc,
      area: {
        kind: "pointOriginSphere",
        radiusFeet: phase.attachment.value.shape.radiusFeet,
      },
      damage: {
        expr: damageExpr,
        damageType: phase.onFail.damageType,
      },
      rangeFeet: spell.mechanics.range.feet,
    },
  ];
}

function supportedAllDartsAtOneTargetCount(selection: {
  readonly mode: string;
  readonly repeatsAllowed?: boolean;
  readonly count?: number | { readonly base?: number };
}): number | null {
  const count =
    typeof selection.count === "number"
      ? selection.count
      : selection.count?.base;
  if (
    selection.mode !== "choose_up_to" ||
    selection.repeatsAllowed !== true ||
    typeof count !== "number"
  ) {
    return null;
  }
  return count;
}

function supportedDamageAmountExpr(amount: {
  readonly kind: string;
  readonly expr?: DiceExpr;
  readonly base?: DiceExpr;
}): DiceExpr | null {
  if (amount.kind === "fixed" && amount.expr !== undefined) {
    return amount.expr;
  }
  if (amount.kind === "threshold_tiers" && amount.base !== undefined) {
    return amount.base;
  }
  return null;
}

function spellHasAvailableSpend(
  actor: BattleCreatureState,
  invocation: SupportedSpellAct,
): boolean {
  if (actor.origin.kind !== "character") {
    return false;
  }
  if (
    invocation.kind === "cantripSpellAttack" ||
    invocation.kind === "cantripSaveGateDamage"
  ) {
    return true;
  }
  return (
    actor.origin.spellcasting?.spellSlots.some(
      (slot) =>
        slot.spellLevel === invocation.slotLevel && slot.expended < slot.count,
    ) === true
  );
}

function spellTargetHole(
  state: BattleState,
  actorId: CombatantId,
  invocation: SupportedSpellAct,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: ATTACK_TARGET_HOLE_ID,
    holeInstanceKey: ATTACK_TARGET_HOLE_INSTANCE,
    label:
      invocation.kind === "preparedSlotSpell"
        ? `${invocation.spell.name} all-darts target`
        : `${invocation.spell.name} target`,
    choices: [...state.combatants.keys()].filter((id) =>
      spellTargetIsLegal(state, actorId, id, invocation),
    ),
  };
}

function spellTargetIsLegal(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: SupportedSpellAct,
): boolean {
  const target = state.combatants.get(targetId);
  if (
    invocation.kind === "preparedPersistentSpell" &&
    (!persistentSpellTargetIsKnownWilling(actorId, targetId) ||
      target?.armorClass.base.kind === "armor")
  ) {
    return false;
  }
  const distanceFeet =
    actorId === targetId ? 0 : combatantDistanceFeet(state, actorId, targetId);
  return distanceFeet !== undefined && distanceFeet <= invocation.rangeFeet;
}

function persistentSpellTargetIsKnownWilling(
  actorId: CombatantId,
  targetId: CombatantId,
): boolean {
  return actorId === targetId;
}

function supportedSpellActId(invocation: SupportedSpellAct): string {
  return Match.value(invocation).pipe(
    Match.when(
      { kind: "preparedSlotSpell" },
      (slotSpell) =>
        `${slotSpell.kind}:${slotSpell.spell.id}:slot:${slotSpell.slotLevel}`,
    ),
    Match.when(
      { kind: "cantripSpellAttack" },
      (cantrip) => `${cantrip.kind}:${cantrip.spell.id}`,
    ),
    Match.when(
      { kind: "cantripSaveGateDamage" },
      (cantrip) => `${cantrip.kind}:${cantrip.spell.id}`,
    ),
    Match.when(
      { kind: "preparedPersistentSpell" },
      (persistent) =>
        `${persistent.kind}:${persistent.spell.id}:slot:${persistent.slotLevel}`,
    ),
    Match.exhaustive,
  );
}

function spellAttackRollHole(
  invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "cantripSpellAttack" }
  >,
  rollMode?: AttackRollMode,
): BattleSpellAttackRollHole {
  return {
    kind: "attackRoll",
    holeId: ATTACK_ROLL_HOLE_ID,
    holeInstanceKey: ATTACK_ROLL_HOLE_INSTANCE,
    label: `${invocation.spell.name} spell attack roll`,
    spell: invocation,
    attackBonus: invocation.attackBonus,
    ...(rollMode === undefined ? {} : { rollMode }),
  };
}

function spellDamageHole(
  invocation: SupportedDamageSpellAct,
  critical = false,
): BattleSpellDamageRollHole {
  const expr = spellDamageExpression(invocation, critical);
  return {
    kind: "rolledDice",
    holeId: holeId(`battle:spell:damage-result:${invocation.spell.id}:${expr}`),
    holeInstanceKey: holeInstanceKey(
      `battle:spell:damage-result:${invocation.spell.id}:${expr}`,
    ),
    label: `${invocation.spell.name} damage (${expr})`,
    spell: invocation,
    critical,
  };
}

function spellSavingThrowOutcomeHoleId(
  invocation: SupportedSpellAct,
): BattleHoleId {
  return holeId(`battle:spell:saving-throw-outcome:${invocation.spell.id}`);
}

function spellSavingThrowOutcomeHole(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "cantripSaveGateDamage" }
  >,
): BattleSpellSavingThrowOutcomeHole {
  const holeInstance = `battle:spell:saving-throw-outcome:${invocation.spell.id}`;
  const areaChoices = spellPointSphereAreaChoices(state, actorId, invocation);
  return {
    kind: "savingThrowOutcome",
    holeId: spellSavingThrowOutcomeHoleId(invocation),
    holeInstanceKey: holeInstanceKey(holeInstance),
    label: `${invocation.spell.name} point-origin Sphere Saving Throw outcomes`,
    spell: invocation,
    ability: invocation.ability,
    dc: invocation.dc,
    areaChoices,
  };
}

function spellPointSphereAreaChoices(
  state: BattleState,
  actorId: CombatantId,
  invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "cantripSaveGateDamage" }
  >,
): readonly BattleSpellAreaChoice[] {
  return [...state.combatants.keys()]
    .filter((originAnchorId) =>
      spellTargetIsLegal(state, actorId, originAnchorId, invocation),
    )
    .map((originAnchorId) => ({
      originAnchorId,
      affectedTargetIds: combatantsWithinFeet(
        state,
        originAnchorId,
        invocation.area.radiusFeet,
      ),
    }))
    .filter((choice) => choice.affectedTargetIds.length > 0);
}

function combatantsWithinFeet(
  state: BattleState,
  originAnchorId: CombatantId,
  radiusFeet: number,
): readonly CombatantId[] {
  return [...state.combatants.keys()].filter((targetId) => {
    const distanceFeet =
      originAnchorId === targetId
        ? 0
        : combatantDistanceFeet(state, originAnchorId, targetId);
    return distanceFeet !== undefined && distanceFeet <= radiusFeet;
  });
}

function validateSpellDamageFill(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  invocation: SupportedDamageSpellAct,
  critical: boolean,
): string | null {
  if (fill.holeId !== spellDamageHole(invocation, critical).holeId) {
    return critical
      ? "Critical hit spell damage must use the critical spell damage hole."
      : "Spell damage must use the selected action-time spell act damage hole.";
  }
  const validation = validateRolledDiceForDiceExpr(fill.value, {
    dice:
      invocation.kind === "preparedSlotSpell"
        ? invocation.damage.expr.dice * invocation.targeting.repeatedEffectCount
        : invocation.damage.expr.dice *
          (invocation.kind === "cantripSpellAttack" && critical ? 2 : 1),
    dieSize: invocation.damage.expr.dieSize,
  });
  return validation?.reason ?? null;
}

function applySpellDamage(
  state: BattleState,
  targetId: CombatantId,
  invocation: SupportedDamageSpellAct,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  critical: boolean,
  concentrationSavingThrow?: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target == null) {
    return state;
  }
  const damaged = applyHpDamage(
    target,
    spellDamageAmountForTarget(target, invocation, damageRoll),
    { deathFailuresAtZeroHp: critical ? 2 : 1 },
  );
  const nextState = {
    ...state,
    combatants: new Map(state.combatants).set(targetId, damaged),
  };
  return concentrationSavingThrow?.value.succeeded === false ||
    (target.concentration !== null && damaged.concentration === null)
    ? breakBattleConcentration(nextState, targetId)
    : nextState;
}

function spellDamageAmountForTarget(
  target: BattleCreatureState,
  invocation: SupportedDamageSpellAct,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): number {
  const diceTotal = damageRoll.value.reduce(
    (total, group) =>
      total +
      group.results.reduce(
        (groupTotal, dieResult) => groupTotal + Number(dieResult),
        0,
      ),
    0,
  );
  const flat =
    (invocation.damage.expr.flat ?? 0) *
    (invocation.kind === "preparedSlotSpell"
      ? invocation.targeting.repeatedEffectCount
      : 1);
  return damageAmountAfterTargetAdjustments(
    target,
    diceTotal + flat,
    invocation.damage.damageType,
  );
}

function applySpellActiveEffects(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: SupportedSpellAct,
): BattleState {
  if (invocation.kind !== "cantripSpellAttack") {
    return state;
  }
  const target = state.combatants.get(targetId);
  if (target == null) {
    return state;
  }

  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === "speedDelta" &&
              effect.sourceSpellId === invocation.spell.id
            ),
        ),
        {
          kind: "speedDelta",
          sourceSpellId: invocation.spell.id,
          sourceCombatantId: actorId,
          deltaFeet: invocation.speedReduction.deltaFeet,
          expiresAt: {
            kind: "startOfTurn",
            combatantId: actorId,
          },
        },
      ],
    }),
  };
}

function applyPersistentSpellActiveEffect(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "preparedPersistentSpell" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target == null || target.armorClass.base.kind === "armor") {
    return state;
  }

  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === invocation.activeEffect.kind &&
              effect.sourceSpellId === invocation.spell.id
            ),
        ),
        { ...invocation.activeEffect, sourceCombatantId: actorId },
      ],
    }),
  };
}

function expendSpellSlot(
  state: BattleState,
  actorId: CombatantId,
  spellLevel: number,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (
    actor?.origin.kind !== "character" ||
    actor.origin.spellcasting === undefined
  ) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      origin: {
        ...actor.origin,
        spellcasting: {
          ...actor.origin.spellcasting,
          spellSlots: actor.origin.spellcasting.spellSlots.map((slot) =>
            slot.spellLevel === spellLevel && slot.expended < slot.count
              ? { ...slot, expended: slot.expended + 1 }
              : slot,
          ),
        },
      },
    }),
  };
}

function spellDamageExpression(
  invocation: SupportedDamageSpellAct,
  critical = false,
): string {
  const dice =
    invocation.kind === "preparedSlotSpell"
      ? invocation.damage.expr.dice * invocation.targeting.repeatedEffectCount
      : invocation.damage.expr.dice *
        (invocation.kind === "cantripSpellAttack" && critical ? 2 : 1);
  const flat =
    (invocation.damage.expr.flat ?? 0) *
    (invocation.kind === "preparedSlotSpell"
      ? invocation.targeting.repeatedEffectCount
      : 1);
  return `${dice}d${invocation.damage.expr.dieSize}${signedModifier(flat)}-${invocation.damage.damageType}`;
}

function needsHolesResult(
  state: BattleState,
  subject: BattleSubject,
  holes: readonly BattleHole[],
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  return {
    tag: "needsHoles",
    state,
    subject,
    holes,
    snapshot: snapshotBattle(state),
  };
}

function attackTargetHole(
  state: BattleState,
  actorId: CombatantId,
  attack: SupportedAttackActionOption,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: ATTACK_TARGET_HOLE_ID,
    holeInstanceKey: ATTACK_TARGET_HOLE_INSTANCE,
    label: "Attack target",
    choices: attackTargetChoices(state, actorId, attack),
  };
}

function searchTargetHole(
  state: BattleState,
  actorId: CombatantId,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: SEARCH_TARGET_HOLE_ID,
    holeInstanceKey: SEARCH_TARGET_HOLE_INSTANCE,
    label: "Hidden creature to Search for",
    choices: hiddenSearchTargetChoices(state, actorId),
  };
}

function grappleTargetHole(
  state: BattleState,
  actorId: CombatantId,
): BattleTargetChoiceHole {
  return {
    kind: "targetChoice",
    holeId: GRAPPLE_TARGET_HOLE_ID,
    holeInstanceKey: GRAPPLE_TARGET_HOLE_INSTANCE,
    label: "Grapple target",
    choices: grappleTargetChoices(state, actorId),
  };
}

function grappleOutcomeHole(link: BattleGrappleLink): BattleGrappleOutcomeHole {
  return {
    kind: "grappleOutcome",
    holeId: GRAPPLE_OUTCOME_HOLE_ID,
    holeInstanceKey: GRAPPLE_OUTCOME_HOLE_INSTANCE,
    label: "Grapple saving throw",
    actorId: link.grapplerId,
    targetId: link.targetId,
    dc: link.escapeDc,
    mode: "grappleSave",
  };
}

function escapeGrappleOutcomeHole(
  link: BattleGrappleLink,
  actorId: CombatantId,
): BattleGrappleOutcomeHole {
  return {
    kind: "grappleOutcome",
    holeId: ESCAPE_GRAPPLE_OUTCOME_HOLE_ID,
    holeInstanceKey: ESCAPE_GRAPPLE_OUTCOME_HOLE_INSTANCE,
    label: "Escape Grapple ability check",
    actorId,
    targetId: link.grapplerId,
    dc: link.escapeDc,
    mode: "escapeCheck",
  };
}

function attackTargetChoices(
  state: BattleState,
  actorId: CombatantId,
  attack: SupportedAttackActionOption,
): readonly CombatantId[] {
  return [...state.combatants.keys()].filter(
    (id) => id !== actorId && attackTargetIsLegal(state, actorId, id, attack),
  );
}

function hiddenSearchTargetChoices(
  state: BattleState,
  actorId: CombatantId,
): readonly CombatantId[] {
  return [...state.combatants.values()]
    .filter(
      (combatant) =>
        combatant.combatantId !== actorId && combatant.hidden !== null,
    )
    .map((combatant) => combatant.combatantId);
}

function revealHidden(
  state: BattleState,
  combatantId: CombatantId,
): BattleState {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined || combatant.hidden === null) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(combatantId, {
      ...combatant,
      hidden: null,
    }),
  };
}

function canUseCunningActionHide(
  combatant: BattleCreatureState | undefined,
): boolean {
  return (
    combatant?.origin.kind === "character" &&
    (findCharacterClassLevel(combatant.origin.classLevels, "rogue") ?? 0) >= 2
  );
}

function canHideInCurrentCircumstances(
  state: BattleState,
  combatantId: CombatantId,
): boolean {
  const prerequisite = state.hidePrerequisites.get(combatantId);
  if (prerequisite === undefined) return false;
  return Match.value(prerequisite).pipe(
    Match.when({ kind: "heavilyObscuredOutOfEnemyLineOfSight" }, () => true),
    Match.when({ kind: "coverOutOfEnemyLineOfSight" }, () => true),
    Match.exhaustive,
  );
}

function grappleTargetChoices(
  state: BattleState,
  actorId: CombatantId,
): readonly CombatantId[] {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    return [];
  }
  return [...state.combatants.keys()].filter((targetId) => {
    const link = grappleLinkForTarget(state, actorId, targetId);
    return link.tag === "ok";
  });
}

function battleMovementBudget(
  combatant: BattleCreatureState | undefined,
  grapples: readonly BattleGrappleLink[] = [],
): {
  readonly speedFeet: MovementFeet;
  readonly spentFeet: MovementFeet;
  readonly remainingFeet: MovementFeet;
} {
  if (combatant === undefined) {
    return {
      speedFeet: movementFeet(0),
      spentFeet: movementFeet(0),
      remainingFeet: movementFeet(0),
    };
  }
  const speedFeet = effectiveWalkSpeed(
    combatant,
    grapples.some((grapple) => grapple.targetId === combatant.combatantId),
  );
  const remainingFeet = movementFeet(
    Math.max(0, Number(speedFeet) - Number(combatant.movementSpentFeet)),
  );
  return {
    speedFeet,
    spentFeet: combatant.movementSpentFeet,
    remainingFeet,
  };
}

function effectiveWalkSpeed(
  combatant: BattleCreatureState,
  isGrappled = false,
): MovementFeet {
  if (
    isGrappled ||
    hasCondition(combatant.conditions, "paralyzed") ||
    hasCondition(combatant.conditions, "petrified") ||
    hasCondition(combatant.conditions, "restrained") ||
    hasCondition(combatant.conditions, "stunned") ||
    hasCondition(combatant.conditions, "unconscious")
  ) {
    return movementFeet(0);
  }
  const base = baseWalkSpeed(combatant);
  const delta = combatant.activeEffects
    .filter((effect) => effect.kind === "speedDelta")
    .reduce((total, effect) => total + effect.deltaFeet, 0);
  return movementFeet(base + delta);
}

function baseWalkSpeed(combatant: BattleCreatureState): number {
  if (combatant.origin.kind === "character") {
    return Number(combatant.origin.speed.walkFeet);
  }
  const walkSpeed = combatant.origin.statBlock.statBlock.speeds.find(
    (speed) => speed.kind === "walk" && speed.feet.kind === "literal",
  );
  return walkSpeed?.feet.kind === "literal" ? walkSpeed.feet.value : 0;
}

function combatantCanMoveInState(
  state: BattleState,
  combatantId: CombatantId,
): boolean {
  const combatant = state.combatants.get(combatantId);
  return (
    combatant !== undefined &&
    !zeroHpLifecycleIsTerminal(combatant) &&
    Number(battleMovementBudget(combatant, state.grapples).remainingFeet) > 0
  );
}

function opportunityAttackReactorsForMovement(
  state: BattleState,
  movement: BattleResolvedMovement,
): readonly CombatantId[] {
  const destinationById = new Map(
    movement.destinationDistances.map((distance) => [
      distance.combatantId,
      distance.feet,
    ]),
  );
  return [...state.combatants.keys()].filter((reactorId) => {
    const oldDistance = combatantDistanceFeet(
      state,
      reactorId,
      movement.moverId,
    );
    const newDistance = destinationById.get(reactorId);
    const reach = opportunityAttackReachFeet(
      state,
      reactorId,
      movement.moverId,
    );
    return (
      oldDistance !== undefined &&
      newDistance !== undefined &&
      reach !== undefined &&
      oldDistance <= reach &&
      newDistance > reach
    );
  });
}

function opportunityAttackOptionForReactor(
  state: BattleState,
  reactorId: CombatantId,
  targetId: CombatantId,
): SupportedAttackActionOption | undefined {
  return attackActionOptionsForActor(state, reactorId).find((attack) => {
    const constraint = attackTargetConstraint(attack);
    return (
      constraint.kind === "meleeReach" &&
      attackTargetIsLegal(state, reactorId, targetId, attack)
    );
  });
}

function opportunityAttackReachFeet(
  state: BattleState,
  reactorId: CombatantId,
  targetId: CombatantId,
): number | undefined {
  const reactor = state.combatants.get(reactorId);
  if (
    reactor === undefined ||
    reactorId === targetId ||
    !reactor.reactionAvailable ||
    hasCondition(reactor.conditions, "blinded") ||
    !combatantCanTakeActions(reactor)
  ) {
    return undefined;
  }
  const attack = opportunityAttackOptionForReactor(state, reactorId, targetId);
  if (attack === undefined) return undefined;
  const constraint = attackTargetConstraint(attack);
  return constraint.kind === "meleeReach" ? constraint.reachFeet : undefined;
}

function attackTargetIsLegal(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  attack: SupportedAttackActionOption,
): boolean {
  const distanceFeet = combatantDistanceFeet(state, actorId, targetId);
  if (distanceFeet == null) {
    return false;
  }

  return Match.value(attackTargetConstraint(attack)).pipe(
    Match.when(
      { kind: "meleeReach" },
      (constraint) => distanceFeet <= constraint.reachFeet,
    ),
    Match.when(
      { kind: "rangedRange" },
      (constraint) => distanceFeet <= constraint.normalFeet,
    ),
    Match.exhaustive,
  );
}

function grappleLinkForTarget(
  state: BattleState,
  grapplerId: CombatantId,
  targetId: CombatantId,
):
  | { readonly tag: "ok"; readonly link: BattleGrappleLink }
  | { readonly tag: "invalid"; readonly message: string } {
  const grappler = state.combatants.get(grapplerId);
  const target = state.combatants.get(targetId);
  if (
    grappler === undefined ||
    target === undefined ||
    grapplerId === targetId
  ) {
    return {
      tag: "invalid",
      message: "Grapple target must be another combatant in this battle.",
    };
  }
  if (grappledBy(state, targetId) !== undefined) {
    return { tag: "invalid", message: "Grapple target is already Grappled." };
  }
  const hand = firstFreeHand(grappler, state.grapples);
  if (hand === undefined) {
    return { tag: "invalid", message: "Grapple requires a free hand." };
  }
  const distanceFeet = combatantDistanceFeet(state, grapplerId, targetId);
  if (distanceFeet === undefined || distanceFeet > 5) {
    return { tag: "invalid", message: "Grapple target must be within 5 feet." };
  }
  if (!targetIsNoMoreThanOneSizeLarger(grappler.size, target.size)) {
    return {
      tag: "invalid",
      message: "Grapple target cannot be more than one size larger.",
    };
  }
  return {
    tag: "ok",
    link: {
      grapplerId,
      targetId,
      escapeDc: grappleEscapeDc(grappler),
      reachFeet: 5,
      hand,
      targetExemptFromDragCost: grappleDragCostExempt(
        grappler.size,
        target.size,
      ),
    },
  };
}

function firstFreeHand(
  combatant: BattleCreatureState,
  grapples: readonly BattleGrappleLink[],
): BattleHand | undefined {
  const hands = combatantHandUses(combatant, grapples);
  if (hands.left === "free") return "left";
  if (hands.right === "free") return "right";
  return undefined;
}

function grappleEscapeDc(grappler: BattleCreatureState): number {
  return 8 + strengthModifier(grappler) + combatantProficiencyBonus(grappler);
}

function strengthModifier(combatant: BattleCreatureState): number {
  if (combatant.origin.kind === "statBlock") {
    return Math.floor(
      (combatant.origin.statBlock.statBlock.abilityScores.str - 10) / 2,
    );
  }
  return Number(combatant.armorClass.abilityModifiers.str);
}

function combatantProficiencyBonus(combatant: BattleCreatureState): number {
  if (combatant.origin.kind === "statBlock") return 2;
  const level = combatant.origin.classLevels.reduce(
    (total, classLevel) => total + Number(classLevel.level),
    0,
  );
  return Number(proficiencyBonus(Math.floor((level - 1) / 4) + 2));
}

const SIZE_RANKS: Readonly<Record<Size, number>> = {
  tiny: 0,
  small: 1,
  medium: 2,
  large: 3,
  huge: 4,
  gargantuan: 5,
};

function targetIsNoMoreThanOneSizeLarger(
  grappler: Size,
  target: Size,
): boolean {
  return SIZE_RANKS[target] - SIZE_RANKS[grappler] <= 1;
}

function grappleDragCostExempt(grappler: Size, target: Size): boolean {
  return target === "tiny" || SIZE_RANKS[grappler] - SIZE_RANKS[target] >= 2;
}

function combatantDistanceFeet(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
): number | undefined {
  return state.combatantDistances.get(actorId)?.get(targetId);
}

function attackRollHole(
  attack: SupportedAttackActionOption,
  rollMode?: AttackRollMode,
): BattleAttackRollHole {
  const name = attackActionOptionName(attack);
  return {
    kind: "attackRoll",
    holeId: ATTACK_ROLL_HOLE_ID,
    holeInstanceKey: ATTACK_ROLL_HOLE_INSTANCE,
    label: `${name} attack roll`,
    attack,
    attackBonus: attackBonus(attack),
    ...(rollMode === undefined ? {} : { rollMode }),
  };
}

function requiredAttackRollMode(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
): AttackRollMode | undefined {
  const attacker = state.combatants.get(attackerId);
  const target = state.combatants.get(targetId);
  const grapple = grappledBy(state, attackerId);
  const hiddenTargetDisadvantage =
    target?.hidden !== null && target?.hidden !== undefined;
  const grappleDisadvantage =
    grapple !== undefined && grapple.grapplerId !== targetId;
  const hasAdvantage =
    attacker?.hidden !== null && attacker?.hidden !== undefined;
  const hasDisadvantage = hiddenTargetDisadvantage || grappleDisadvantage;
  if (hasAdvantage && !hasDisadvantage) return "advantage";
  if (hasDisadvantage && !hasAdvantage) return "disadvantage";
  return undefined;
}

function attackRollModeMatches(
  roll: AttackRollResult,
  requiredMode: AttackRollMode | undefined,
): boolean {
  return requiredMode === undefined || roll.rollMode === requiredMode;
}

function attackDamageHole(
  attack: SupportedAttackActionOption,
  critical = false,
  attackRoll?: AttackRollResult,
): BattleDamageRollHole {
  const expression = weaponAttackDamageExpression(attack, critical, attackRoll);
  const name = attackActionOptionName(attack);
  return {
    kind: "rolledDice",
    holeId: attackDamageHoleId(attack, critical, attackRoll),
    holeInstanceKey: holeInstanceKey(
      `battle:attack:damage-result:${expression}`,
    ),
    label: `${name} damage (${expression})`,
    attack,
    critical,
  };
}

function attackDamageHoleId(
  attack: SupportedAttackActionOption,
  critical = false,
  attackRoll?: AttackRollResult,
): BattleHoleId {
  return holeId(
    `battle:attack:damage-result:${weaponAttackDamageExpression(
      attack,
      critical,
      attackRoll,
    )}`,
  );
}

function attackActionOptionForSubject(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >,
): SupportedAttackActionOption | undefined {
  return attackActionOptionsForActor(state, subject.actorId).find(
    (attack) =>
      attackActionOptionName(attack) === subject.attackName &&
      statBlockSectionMatchesSubject(attack, subject.statBlockSection),
  );
}

function attackActionOptionsForActor(
  state: BattleState,
  actorId: CombatantId,
): readonly SupportedAttackActionOption[] {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind === "character") {
    return actor.origin.attack == null ? [] : [actor.origin.attack];
  }

  if (actor?.origin.kind === "statBlock") {
    const origin = actor.origin;
    return statBlockAttackActionOptions(origin.statBlock).filter((option) =>
      statBlockAttackResourceAvailable(
        origin.statBlock.statBlock,
        origin.resources,
        option,
      ),
    );
  }

  return [];
}

function offHandAttackActionOptionForActor(
  state: BattleState,
  actorId: CombatantId,
): CharacterWeaponAttackActionOption | undefined {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") return undefined;
  const main = actor.origin.attack;
  const offHand = actor.origin.offHandAttack;
  if (main === null || offHand === undefined) return undefined;
  if (!isLightMeleeWeapon(main.weapon) || !isLightMeleeWeapon(offHand.weapon)) {
    return undefined;
  }
  return {
    ...offHand,
    damageAbilityModifier:
      offHand.abilityModifier < 0 ? offHand.abilityModifier : 0,
  };
}

function offHandAttackPrerequisiteMet(
  state: BattleState,
  actorId: CombatantId,
  offHand: CharacterWeaponAttackActionOption,
): boolean {
  const offHandItemId = offHandWeaponItemIdForActor(state, actorId, offHand);
  if (offHandItemId === undefined) return false;
  const priorLightAttack = state.currentTurnResources.lightWeaponAttackMade;
  return (
    priorLightAttack !== undefined &&
    priorLightAttack.weaponItemId !== offHandItemId
  );
}

function heldWeaponItemIdForAttack(
  state: BattleState,
  actorId: CombatantId,
  attack: CharacterWeaponAttackActionOption,
): string {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") return attack.weapon.id;
  if (actor.origin.attack?.weapon.id === attack.weapon.id) {
    return actor.origin.selectedLoadout.weapon?.itemId ?? attack.weapon.id;
  }
  if (actor.origin.offHandAttack?.weapon.id === attack.weapon.id) {
    return (
      actor.origin.selectedLoadout.offHandWeapon?.itemId ?? attack.weapon.id
    );
  }
  return attack.weapon.id;
}

function offHandWeaponItemIdForActor(
  state: BattleState,
  actorId: CombatantId,
  offHand: CharacterWeaponAttackActionOption,
): string | undefined {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") return undefined;
  return actor.origin.selectedLoadout.offHandWeapon?.unitId ===
    offHand.weapon.id
    ? actor.origin.selectedLoadout.offHandWeapon.itemId
    : undefined;
}

function isLightMeleeWeapon(weapon: WeaponRecord): boolean {
  return (
    weapon.usage === "melee" &&
    (weapon.properties ?? []).some((property) => property.kind === "light")
  );
}

function supportedStatBlockAttackActionOption(
  attack: CreatureNamedAttackRoll,
  part: StatBlockPartKey,
): StatBlockAttackActionOption | null {
  if (!isSupportedCreatureNamedAttackRoll(attack)) {
    return null;
  }

  return {
    kind: "statBlockAttack",
    attack,
    part,
  };
}

function statBlockAttackActionOptions(
  statBlock: StatBlockRecord,
): readonly StatBlockAttackActionOption[] {
  const actionAttacks = statBlockActionSectionAttackOptions(
    "actions",
    statBlock.statBlock.actions,
  );
  const legendaryAttacks = statBlockActionSectionAttackOptions(
    "legendaryActions",
    statBlock.statBlock.legendaryActions?.actions,
  );

  return [...actionAttacks, ...legendaryAttacks];
}

function attackActionOptionIsOrdinaryAttackAction(
  attack: SupportedAttackActionOption,
): boolean {
  return attack.kind !== "statBlockAttack" || attack.part.section === "actions";
}

function statBlockActionSectionAttackOptions(
  section: StatBlockPartSection,
  actions: CreatureActions | undefined,
): readonly StatBlockAttackActionOption[] {
  return (
    actions?.attacks?.flatMap((attack) => {
      const option = supportedStatBlockAttackActionOption(attack, {
        section,
        name: attack.name,
      });
      return option == null ? [] : [option];
    }) ?? []
  );
}

function isSupportedCreatureNamedAttackRoll(
  attack: CreatureNamedAttackRoll,
): attack is SupportedCreatureNamedAttackRoll {
  return (
    attack.multiattackCount === undefined &&
    attack.attackBonus.kind === "literal" &&
    supportedStatBlockAttackDamage(attack) !== null &&
    supportedStatBlockAttackTargetConstraint(attack) !== null
  );
}

function statBlockResourceState(
  statBlock: StatBlockRecord["statBlock"],
): StatBlockMutableResourceState {
  const limitedUses = statBlockLimitedUseInitialStates(statBlock);
  assertUniqueStatBlockPartKeys(
    limitedUses.dailyUses.map((state) => state.key),
  );
  assertUniqueStatBlockPartKeys(limitedUses.rechargeParts);
  assertUniqueStatBlockPartKeys(limitedUses.restRechargeParts);
  return {
    legendaryActionUsesRemaining: statBlock.legendaryActions?.uses ?? 0,
    dailyUses: limitedUses.dailyUses,
    unavailableRechargeParts: [],
    unavailableRestRechargeParts: [],
  };
}

function statBlockLimitedUseInitialStates(
  statBlock: StatBlockRecord["statBlock"],
): {
  readonly dailyUses: readonly StatBlockDailyUseState[];
  readonly rechargeParts: readonly StatBlockPartKey[];
  readonly restRechargeParts: readonly StatBlockPartKey[];
} {
  const states = statBlockAuthoredLimitedUses(statBlock);
  return {
    dailyUses: states.flatMap((state) =>
      state.kind === "daily"
        ? [{ key: state.key, usesRemaining: state.uses }]
        : [],
    ),
    rechargeParts: states.flatMap((state) =>
      state.kind === "recharge" ? [state.key] : [],
    ),
    restRechargeParts: states.flatMap((state) =>
      state.kind === "recharge_after_rest" ? [state.key] : [],
    ),
  };
}

function statBlockAuthoredLimitedUses(
  statBlock: StatBlockRecord["statBlock"],
): readonly StatBlockAuthoredLimitedUse[] {
  return [
    ...statBlockActionSectionLimitedUseInitialStates(
      "actions",
      statBlock.actions,
    ),
    ...statBlockActionSectionLimitedUseInitialStates(
      "bonusActions",
      statBlock.bonusActions,
    ),
    ...statBlockActionSectionLimitedUseInitialStates(
      "reactions",
      statBlock.reactions,
    ),
    ...statBlockActionSectionLimitedUseInitialStates(
      "legendaryActions",
      statBlock.legendaryActions?.actions,
    ),
  ];
}

type StatBlockAuthoredLimitedUse = CreatureLimitedUse & {
  readonly key: StatBlockPartKey;
};

function statBlockActionSectionLimitedUseInitialStates(
  section: StatBlockPartSection,
  actions: CreatureActions | undefined,
): readonly StatBlockAuthoredLimitedUse[] {
  const attacks =
    actions?.attacks?.flatMap((attack) =>
      statBlockAuthoredLimitedUse(
        { section, name: attack.name },
        attack.limitedUse,
      ),
    ) ?? [];
  const saves =
    actions?.saves?.flatMap((save) =>
      statBlockAuthoredLimitedUse(
        { section, name: save.name },
        save.limitedUse,
      ),
    ) ?? [];
  const supports =
    actions?.supports?.flatMap((support) =>
      statBlockAuthoredLimitedUse(
        { section, name: support.name },
        support.limitedUse,
      ),
    ) ?? [];
  const actionOptions =
    actions?.actionOptions?.flatMap((option) =>
      statBlockAuthoredLimitedUse(
        { section, name: option.name },
        option.limitedUse,
      ),
    ) ?? [];

  return [...attacks, ...saves, ...supports, ...actionOptions];
}

function statBlockAuthoredLimitedUse(
  key: StatBlockPartKey,
  limitedUse: CreatureLimitedUse | undefined,
): readonly StatBlockAuthoredLimitedUse[] {
  if (limitedUse === undefined) return [];
  return [{ ...limitedUse, key }];
}

function statBlockResourceSnapshot(
  statBlock: StatBlockRecord["statBlock"],
  resources: StatBlockMutableResourceState,
): StatBlockResourceSnapshot {
  const authoredLimitedUses = statBlockLimitedUseInitialStates(statBlock);
  return {
    legendaryActions:
      statBlock.legendaryActions === undefined
        ? null
        : {
            usesMax: statBlock.legendaryActions.uses,
            usesRemaining: resources.legendaryActionUsesRemaining,
          },
    limitedUses: [
      ...authoredLimitedUses.dailyUses
        .map((daily) => {
          const authored = statBlockLimitedUseForPart(statBlock, daily.key);
          if (authored?.kind !== "daily") return null;
          return {
            key: daily.key,
            kind: "daily" as const,
            usesMax: authored.uses,
            usesRemaining: daily.usesRemaining,
          };
        })
        .filter(
          (
            state,
          ): state is Extract<
            StatBlockLimitedUseSnapshot,
            { readonly kind: "daily" }
          > => state !== null,
        ),
      ...authoredLimitedUses.rechargeParts.map((key) => {
        const authored = statBlockLimitedUseForPart(statBlock, key);
        if (authored?.kind !== "recharge") {
          throw new Error(
            "Recharge resource key must reference Recharge authored use.",
          );
        }
        return {
          key,
          kind: "recharge" as const,
          minimumRoll: authored.minimumRoll,
          available: !resources.unavailableRechargeParts.some((part) =>
            sameStatBlockPartKey(part, key),
          ),
        };
      }),
      ...authoredLimitedUses.restRechargeParts.map((key) => ({
        key,
        kind: "recharge_after_rest" as const,
        available: !resources.unavailableRestRechargeParts.some((part) =>
          sameStatBlockPartKey(part, key),
        ),
      })),
    ],
  };
}

function statBlockLimitedUseForPart(
  statBlock: StatBlockRecord["statBlock"],
  key: StatBlockPartKey,
): CreatureLimitedUse | undefined {
  return statBlockAuthoredLimitedUses(statBlock).find((limitedUse) =>
    sameStatBlockPartKey(limitedUse.key, key),
  );
}

function refreshStatBlockStartTurnResources(
  resources: StatBlockMutableResourceState,
  statBlock: StatBlockRecord["statBlock"],
): StatBlockMutableResourceState {
  return {
    ...resources,
    legendaryActionUsesRemaining: statBlock.legendaryActions?.uses ?? 0,
  };
}

function statBlockAttackResourceAvailable(
  statBlock: StatBlockRecord["statBlock"],
  resources: StatBlockMutableResourceState,
  attack: StatBlockAttackActionOption,
): boolean {
  return (
    statBlockPartLimitedUseAvailable(statBlock, resources, attack.part) &&
    (attack.part.section !== "legendaryActions" ||
      resources.legendaryActionUsesRemaining > 0)
  );
}

function statBlockPartLimitedUseAvailable(
  statBlock: StatBlockRecord["statBlock"],
  resources: StatBlockMutableResourceState,
  key: StatBlockPartKey,
): boolean {
  const limitedUse = statBlockLimitedUseForPart(statBlock, key);
  if (limitedUse === undefined) return true;
  return Match.value(limitedUse).pipe(
    Match.when(
      { kind: "daily" },
      () =>
        (resources.dailyUses.find((state) =>
          sameStatBlockPartKey(state.key, key),
        )?.usesRemaining ?? 0) > 0,
    ),
    Match.when(
      { kind: "recharge" },
      () =>
        !resources.unavailableRechargeParts.some((part) =>
          sameStatBlockPartKey(part, key),
        ),
    ),
    Match.when(
      { kind: "recharge_after_rest" },
      () =>
        !resources.unavailableRestRechargeParts.some((part) =>
          sameStatBlockPartKey(part, key),
        ),
    ),
    Match.exhaustive,
  );
}

function spendStatBlockAttackResources(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly attack: SupportedAttackActionOption;
}): BattleState {
  if (input.attack.kind !== "statBlockAttack") {
    return input.state;
  }
  const actor = input.state.combatants.get(input.actorId);
  if (actor?.origin.kind !== "statBlock") {
    return input.state;
  }

  const resources = spendStatBlockPartResources(
    actor.origin.statBlock.statBlock,
    actor.origin.resources,
    input.attack.part,
  );
  const combatants = new Map(input.state.combatants);
  combatants.set(input.actorId, {
    ...actor,
    origin: {
      ...actor.origin,
      resources,
    },
  });
  return { ...input.state, combatants };
}

function spendStatBlockPartResources(
  statBlock: StatBlockRecord["statBlock"],
  resources: StatBlockMutableResourceState,
  key: StatBlockPartKey,
): StatBlockMutableResourceState {
  const limitedUse = statBlockLimitedUseForPart(statBlock, key);
  return {
    legendaryActionUsesRemaining:
      key.section === "legendaryActions"
        ? Math.max(0, resources.legendaryActionUsesRemaining - 1)
        : resources.legendaryActionUsesRemaining,
    dailyUses:
      limitedUse?.kind === "daily"
        ? resources.dailyUses.map((state) =>
            sameStatBlockPartKey(state.key, key)
              ? {
                  ...state,
                  usesRemaining: Math.max(0, state.usesRemaining - 1),
                }
              : state,
          )
        : resources.dailyUses,
    unavailableRechargeParts:
      limitedUse?.kind === "recharge" &&
      !resources.unavailableRechargeParts.some((part) =>
        sameStatBlockPartKey(part, key),
      )
        ? [...resources.unavailableRechargeParts, key]
        : resources.unavailableRechargeParts,
    unavailableRestRechargeParts:
      limitedUse?.kind === "recharge_after_rest" &&
      !resources.unavailableRestRechargeParts.some((part) =>
        sameStatBlockPartKey(part, key),
      )
        ? [...resources.unavailableRestRechargeParts, key]
        : resources.unavailableRestRechargeParts,
  };
}

function statBlockSectionMatchesSubject(
  attack: SupportedAttackActionOption,
  section: StatBlockPartSection | undefined,
): boolean {
  return Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, () => section === undefined),
    Match.when(
      { kind: "statBlockAttack" },
      (option) => option.part.section === (section ?? "actions"),
    ),
    Match.exhaustive,
  );
}

function statBlockSubjectPart(attack: SupportedAttackActionOption): {
  readonly statBlockSection?: StatBlockPartSection;
} {
  return Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, () => ({})),
    Match.when({ kind: "statBlockAttack" }, (option) =>
      option.part.section === "actions"
        ? {}
        : { statBlockSection: option.part.section },
    ),
    Match.exhaustive,
  );
}

function sameStatBlockPartKey(
  left: StatBlockPartKey,
  right: StatBlockPartKey,
): boolean {
  return left.section === right.section && left.name === right.name;
}

function assertUniqueStatBlockPartKeys(
  keys: readonly StatBlockPartKey[],
): void {
  const seen = new Set<string>();
  for (const key of keys) {
    const encoded = statBlockPartKeyString(key);
    if (seen.has(encoded)) {
      throw new Error(
        `Duplicate limited-use Stat Block part: ${key.section}/${key.name}`,
      );
    }
    seen.add(encoded);
  }
}

function statBlockPartKeyString(key: StatBlockPartKey): string {
  return `${key.section}\u0000${key.name}`;
}

function supportedStatBlockAttackDamage(
  attack: SupportedCreatureNamedAttackRoll,
): StatBlockAttackDamage;
function supportedStatBlockAttackDamage(
  attack: CreatureNamedAttackRoll,
): StatBlockAttackDamage | null;
function supportedStatBlockAttackDamage(
  attack: CreatureNamedAttackRoll,
): StatBlockAttackDamage | null {
  const baseDamage = attack.onHit.flatMap((effect) =>
    supportedStatBlockBaseDamageEffect(effect),
  );
  const advantageBonus = attack.onHit.flatMap((effect) =>
    supportedStatBlockAdvantageBonusDamageEffect(effect),
  );
  if (
    baseDamage.length !== 1 ||
    baseDamage.length + advantageBonus.length !== attack.onHit.length
  ) {
    return null;
  }

  const damage = baseDamage[0];
  if (damage === undefined) {
    return null;
  }
  const bonus = advantageBonus[0];
  if (advantageBonus.length > 1) {
    return null;
  }
  if (bonus !== undefined && bonus.damageType !== damage.damageType) {
    return null;
  }

  return {
    expr: damage.expr,
    damageType: damage.damageType,
    ...(bonus === undefined ? {} : { advantageBonus: bonus }),
  };
}

function supportedStatBlockBaseDamageEffect(
  effect: CreatureNamedAttackRoll["onHit"][number],
): readonly StatBlockAttackDamage[] {
  return effect.kind === "damage" &&
    effect.amount.kind === "fixed" &&
    typeof effect.damageType === "string"
    ? [
        {
          expr: effect.amount.expr,
          damageType: effect.damageType,
        },
      ]
    : [];
}

function supportedStatBlockAdvantageBonusDamageEffect(
  effect: CreatureNamedAttackRoll["onHit"][number],
): readonly Required<StatBlockAttackDamage>["advantageBonus"][] {
  return effect.kind === "conditional_bonus_damage" &&
    effect.when.kind === "attack_roll_had_advantage" &&
    effect.amount.kind === "fixed" &&
    typeof effect.damageType === "string"
    ? [
        {
          expr: effect.amount.expr,
          damageType: effect.damageType,
        },
      ]
    : [];
}

function supportedStatBlockAttackTargetConstraint(
  attack: SupportedCreatureNamedAttackRoll,
): AttackTargetConstraint;
function supportedStatBlockAttackTargetConstraint(
  attack: CreatureNamedAttackRoll,
): AttackTargetConstraint | null;
function supportedStatBlockAttackTargetConstraint(
  attack: CreatureNamedAttackRoll,
): AttackTargetConstraint | null {
  if (attack.attackType === "melee" && attack.reachFeet !== undefined) {
    return { kind: "meleeReach", reachFeet: attack.reachFeet };
  }
  if (attack.attackType === "ranged" && attack.rangeFeet !== undefined) {
    return {
      kind: "rangedRange",
      normalFeet: attack.rangeFeet.normal,
    };
  }

  return null;
}

function statBlockAttackDamage(
  attack: StatBlockAttackActionOption,
): StatBlockAttackDamage {
  return supportedStatBlockAttackDamage(attack.attack);
}

function statBlockAttackTargetConstraint(
  attack: StatBlockAttackActionOption,
): AttackTargetConstraint {
  return supportedStatBlockAttackTargetConstraint(attack.attack);
}

function statBlockAttackBonus(attack: StatBlockAttackActionOption): number {
  return attack.attack.attackBonus.value;
}

function attackTargetConstraint(
  attack: SupportedAttackActionOption,
): AttackTargetConstraint {
  return Match.value(attack).pipe(
    Match.when({ kind: "statBlockAttack" }, (option) =>
      statBlockAttackTargetConstraint(option),
    ),
    Match.when({ kind: "weapon" }, (option) =>
      weaponTargetConstraint(option.weapon),
    ),
    Match.exhaustive,
  );
}

function weaponTargetConstraint(weapon: WeaponRecord): AttackTargetConstraint {
  const properties = weapon.properties ?? [];
  if (weapon.usage === "ranged") {
    const ammunition = properties.find(
      (property) => property.kind === "ammunition",
    );
    const thrown = properties.find((property) => property.kind === "thrown");
    const range = ammunition?.range ?? thrown?.range;
    if (range == null) {
      throw new Error("Ranged Battle Attack requires weapon range.");
    }
    return {
      kind: "rangedRange",
      normalFeet: range.normal,
    };
  }

  return {
    kind: "meleeReach",
    reachFeet: properties.some((property) => property.kind === "reach")
      ? 10
      : 5,
  };
}

function selectedWeaponDamage(weapon: WeaponRecord): BattleWeaponDamage {
  if (weapon.damage.kind !== "dice") {
    throw new Error("Battle Attack requires dice weapon damage.");
  }

  return weapon.damage;
}

function attackActionOptionName(attack: SupportedAttackActionOption): string {
  return Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, (weaponAttack) => weaponAttack.weapon.name),
    Match.when(
      { kind: "statBlockAttack" },
      (statBlockAttack) => statBlockAttack.attack.name,
    ),
    Match.exhaustive,
  );
}

function attackDamage(attack: SupportedAttackActionOption): {
  readonly dice: number;
  readonly dieSize: number;
  readonly flat?: number;
  readonly damageType: DamageType;
} {
  return Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, (weaponAttack) =>
      selectedWeaponDamage(weaponAttack.weapon),
    ),
    Match.when({ kind: "statBlockAttack" }, (statBlockAttack) => {
      const damage = statBlockAttackDamage(statBlockAttack);
      return {
        dice: damage.expr.dice,
        dieSize: damage.expr.dieSize,
        ...(damage.expr.flat === undefined ? {} : { flat: damage.expr.flat }),
        damageType: damage.damageType,
      };
    }),
    Match.exhaustive,
  );
}

type AttackDamageComponent = {
  readonly expr: DiceExpr;
  readonly damageType: DamageType;
};

function attackDamageComponents(
  attack: SupportedAttackActionOption,
  critical: boolean,
  attackRoll?: AttackRollResult,
): readonly AttackDamageComponent[] {
  return Match.value(attack).pipe(
    Match.when({ kind: "weapon" }, (weaponAttack) => {
      const damage = selectedWeaponDamage(weaponAttack.weapon);
      return [
        {
          expr: critical
            ? {
                dice: damage.dice * 2,
                dieSize: damage.dieSize,
              }
            : {
                dice: damage.dice,
                dieSize: damage.dieSize,
              },
          damageType: damage.damageType,
        },
      ];
    }),
    Match.when({ kind: "statBlockAttack" }, (statBlockAttack) => {
      const damage = statBlockAttackDamage(statBlockAttack);
      const base = damage.expr;
      const baseComponent = {
        expr: {
          dice: critical ? base.dice * 2 : base.dice,
          dieSize: base.dieSize,
        },
        damageType: damage.damageType,
      };
      const advantageBonus = damage.advantageBonus;
      if (
        attackRoll?.rollMode !== "advantage" ||
        advantageBonus === undefined
      ) {
        return [baseComponent];
      }

      return [
        baseComponent,
        {
          expr: {
            dice: critical
              ? advantageBonus.expr.dice * 2
              : advantageBonus.expr.dice,
            dieSize: advantageBonus.expr.dieSize,
          },
          damageType: advantageBonus.damageType,
        },
      ];
    }),
    Match.exhaustive,
  );
}

function attackDamageModifier(attack: SupportedAttackActionOption): number {
  return Match.value(attack).pipe(
    Match.when(
      { kind: "weapon" },
      (weaponAttack) =>
        weaponAttack.damageAbilityModifier ?? weaponAttack.abilityModifier,
    ),
    Match.when(
      { kind: "statBlockAttack" },
      (statBlockAttack) =>
        statBlockAttackDamage(statBlockAttack).expr.flat ?? 0,
    ),
    Match.exhaustive,
  );
}

function attackBonus(attack: SupportedAttackActionOption): number {
  return Match.value(attack).pipe(
    Match.when(
      { kind: "weapon" },
      (weaponAttack) => weaponAttack.abilityModifier,
    ),
    Match.when({ kind: "statBlockAttack" }, (statBlockAttack) =>
      statBlockAttackBonus(statBlockAttack),
    ),
    Match.exhaustive,
  );
}

function weaponAttackDamageExpression(
  attack: SupportedAttackActionOption,
  critical = false,
  attackRoll?: AttackRollResult,
): string {
  const damage = attackDamage(attack);
  const components = attackDamageComponents(attack, critical, attackRoll);
  const modifier = signedModifier(attackDamageModifier(attack));

  return `${components
    .map((component) => `${component.expr.dice}d${component.expr.dieSize}`)
    .join("+")}${modifier}-${damage.damageType}`;
}

function signedModifier(modifier: number): string {
  if (modifier === 0) {
    return "";
  }

  return modifier > 0 ? `+${modifier}` : `${modifier}`;
}

function invalidResult(
  state: BattleState,
  reason: BattleInvalidReasonCode,
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "invalid" }> {
  return {
    tag: "invalid",
    reason,
    message,
    snapshot: snapshotBattle(state),
  };
}
