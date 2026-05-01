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
  type Condition,
  type DieRollResult,
  type ProficiencyBonus as ProficiencyBonusType,
  type Round as RoundType,
} from "@dnd/shared/types";
import type {
  Ability,
  ActivationResource,
  CreatureNamedAttackRoll,
  DamageType,
  DiceExpr,
  SpellRecord,
  StatBlockRecord,
  StatBlockValue,
  ActionRestriction,
  ClassName,
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
    readonly unitId: UnitRecord["id"];
    readonly grip: "one_handed";
  };
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
};
type StatBlockAttackDamage = {
  readonly expr: DiceExpr;
  readonly damageType: DamageType;
  readonly advantageBonus?: {
    readonly expr: DiceExpr;
    readonly damageType: DamageType;
  };
};
export type BattleActiveEffect = {
  readonly kind: "speedDelta";
  readonly sourceSpellId: SpellRecord["id"];
  readonly sourceCombatantId: CombatantId;
  readonly deltaFeet: number;
  readonly expiresAt: {
    readonly kind: "startOfTurn";
    readonly combatantId: CombatantId;
  };
};
type AttackTargetConstraint =
  | { readonly kind: "meleeReach"; readonly reachFeet: number }
  | {
      readonly kind: "rangedRange";
      readonly normalFeet: number;
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
    };

export type CharacterBattleCreatureInit = {
  readonly kind: "character";
  readonly characterId: CharacterId;
  readonly characterUnitRefs: readonly BattleUnitRef[];
  readonly classLevels: readonly CharacterBattleClassLevelInit[];
  readonly armorClass: ArmorClassState;
  readonly currentHp: Hp;
  readonly maxHp: Hp;
  readonly tempHp: Hp;
  readonly zeroHpLifecyclePolicy: "usesDeathSavingThrows";
  readonly zeroHpLifecycle?: CharacterZeroHpLifecycleInit;
  readonly selectedLoadout: CharacterBattleLoadoutRef;
  readonly attack: CharacterWeaponAttackActionOption | null;
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
  readonly zeroHpLifecyclePolicy: "diesAtZeroHp";
};

export type BattleCreatureInit = {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: InitiativeScore;
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
  readonly armorClass: ArmorClassState;
  readonly zeroHpLifecycle: ZeroHpLifecycle;
  readonly origin:
    | {
        readonly kind: "character";
        readonly characterId: CharacterId;
        readonly characterUnitRefs: readonly BattleUnitRef[];
        readonly classLevels: readonly CharacterBattleClassLevel[];
        readonly selectedLoadout: CharacterBattleLoadoutRef;
        readonly attack: CharacterWeaponAttackActionOption | null;
        readonly resources: readonly CharacterBattleResourceState[];
        readonly spellcasting?: CharacterBattleSpellcastingState;
      }
    | {
        readonly kind: "statBlock";
        readonly statBlock: StatBlockRecord;
      };
};

export type BattleState = {
  readonly battleId: BattleId;
  readonly initiative: InitiativeStack<CombatantId>;
  readonly combatants: ReadonlyMap<CombatantId, BattleCreatureState>;
  readonly combatantDistances: ReadonlyMap<
    CombatantId,
    ReadonlyMap<CombatantId, number>
  >;
  readonly currentTurnResources: BattleTurnResources;
};

export const BATTLE_SUBJECT_ACTIONS = ["attack"] as const;
export type BattleSubjectAction = (typeof BATTLE_SUBJECT_ACTIONS)[number];

export const BATTLE_RUNTIME_COMMANDS = ["endTurn"] as const;
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
  }),
  Schema.Struct({
    tag: Schema.Literal("actionSpell"),
    actorId: CombatantId,
    spellId: BattleSubjectTextSchema,
    spellActId: Schema.optionalWith(BattleSubjectTextSchema, { exact: true }),
  }),
  Schema.Struct({
    tag: Schema.Literal("unitFeature"),
    actorId: CombatantId,
    unitId: BattleSubjectTextSchema,
  }),
  Schema.Struct({
    tag: Schema.Literal("runtimeCommand"),
    actorId: CombatantId,
    command: Schema.Literal(...BATTLE_RUNTIME_COMMANDS),
  }),
);
export type BattleSubject = typeof BattleSubjectSchema.Type;

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
      ]),
    ),
    Match.when({ tag: "actionSpell" }, (spell) =>
      JSON.stringify([
        spell.tag,
        spell.actorId,
        spell.spellActId ?? spell.spellId,
      ]),
    ),
    Match.when({ tag: "unitFeature" }, (feature) =>
      JSON.stringify([feature.tag, feature.actorId, feature.unitId]),
    ),
    Match.when({ tag: "runtimeCommand" }, (command) =>
      JSON.stringify([command.tag, command.actorId, command.command]),
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
};
export type BattleSpellAttackRollHole = Extract<
  RuntimeHole,
  { readonly kind: "attackRoll" }
> & {
  readonly spell: SupportedSpellAct;
  readonly attackBonus: number;
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
export type BattleHole =
  | BattleTargetChoiceHole
  | BattleAttackRollHole
  | BattleSpellAttackRollHole
  | BattleDamageRollHole
  | BattleSpellDamageRollHole
  | BattleUnitFeatureRollHole
  | BattleDeathSavingThrowHole;

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
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("attackRoll"),
    spell: SupportedSpellActSchema,
    attackBonus: Schema.Number,
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
    kind: Schema.Literal("rolledDice"),
    unitFeature: BattleRuntimeObjectSchema,
  }),
  Schema.Struct({
    ...BattleHoleBaseSchema,
    kind: Schema.Literal("deathSavingThrow"),
    label: Schema.String,
    combatantId: CombatantId,
  }),
);

export type BattleFill =
  | Extract<FilledHoleValue, { readonly kind: "attackRoll" | "rolledDice" }>
  | {
      readonly kind: "targetChoice";
      readonly holeId: BattleHoleId;
      readonly value: CombatantId;
    }
  | {
      readonly kind: "deathSavingThrow";
      readonly holeId: BattleHoleId;
      readonly value: DieRollResult;
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

export const BattleFillSchema = Schema.Union(
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
    kind: Schema.Literal("rolledDice"),
    holeId: BattleHoleIdSchema,
    value: Schema.NonEmptyArray(BattleRolledDiceGroupSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("deathSavingThrow"),
    holeId: BattleHoleIdSchema,
    value: BattleD20DieRollResultSchema,
  }),
);

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
>;
type ActionSpellBattleResolutionInput = BattleResolutionInputForSubject<
  Extract<BattleSubject, { readonly tag: "actionSpell" }>
>;
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
};

export type BattleCreatureSnapshot = {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly originKind: BattleCreatureState["origin"]["kind"];
  readonly hp: Hp;
  readonly maxHp: Hp;
  readonly tempHp: Hp;
  readonly armorClass: ArmorClass;
  readonly defeated: boolean;
  readonly zeroHpLifecycle: BattleCreatureZeroHpLifecycleSnapshot;
  readonly conditions: readonly Condition[];
  readonly activeEffects: readonly BattleActiveEffect[];
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
const ACTION_SURGE_UNIT_ID = "fighter_action_surge";
const SECOND_WIND_UNIT_ID = "fighter_second_wind";
const SECOND_WIND_HEALING_ROLL_HOLE_ID = holeId(
  "battle:unit-feature:second-wind:healing-roll",
);
const SECOND_WIND_HEALING_ROLL_HOLE_INSTANCE = holeInstanceKey(
  "battle:unit-feature:second-wind:healing-roll",
);
const DEFAULT_INITIAL_COMBATANT_DISTANCE_FEET = 5;

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
    combatantDistances: battleCombatantDistances(input),
    currentTurnResources: INITIAL_TURN_RESOURCES,
  };
}

export function discoverBattleActs(
  state: BattleState,
): readonly AvailableBattleAct[] {
  const actorId = currentActorId(state);
  if (!state.combatants.has(actorId)) {
    return [];
  }

  const acts: AvailableBattleAct[] = [];
  const attackActionOptions = attackActionOptionsForActor(state, actorId);
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
                },
                label: "Attack",
                summary: `Take the Attack action with ${attackActionOptionName(attack)}.`,
                initialHoles: [targetHole],
              },
            ];
      }),
    );
  }
  acts.push(...supportedUnitFeatureActs(state, actorId));
  if (
    combatantCanTakeActions(state.combatants.get(actorId)) &&
    canSpendAction(state.currentTurnResources, "magic")
  ) {
    acts.push(...discoverSupportedSpellActs(state, actorId));
  }
  acts.push({
    subject: { tag: "runtimeCommand", actorId, command: "endTurn" },
    label: "End Turn",
    summary: "End the current combatant's turn.",
    initialHoles: [],
  });

  return acts;
}

export function resolveBattleSubject(
  input: BattleResolutionInput,
): BattleResolutionResult {
  const actorId = battleSubjectActorId(input.subject);
  if (actorId !== currentActorId(input.state)) {
    return invalidResult(
      input.state,
      "wrongActor",
      "Subject actor is not the current actor.",
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
    input.subject.action === "attack" &&
    !combatantCanTakeActions(input.state.combatants.get(actorId))
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack is no longer available for the current actor.",
    );
  }

  if (
    input.subject.tag === "action" &&
    input.subject.action === "attack" &&
    !canSpendAction(input.state.currentTurnResources, "attack")
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Attack is no longer available for the current actor.",
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

  return Match.value(input.subject).pipe(
    Match.when({ tag: "action", action: "attack" }, (subject) =>
      resolveAttack({ ...input, subject }),
    ),
    Match.when({ tag: "actionSpell" }, (subject) =>
      resolveSpellAct({ ...input, subject }),
    ),
    Match.when({ tag: "unitFeature" }, (subject) =>
      resolveUnitFeature({ ...input, subject }),
    ),
    Match.when({ tag: "runtimeCommand", command: "endTurn" }, () =>
      resolveEndTurnCommand(input),
    ),
    Match.exhaustive,
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
      return combatant == null ? [] : [combatantSnapshot(combatant)];
    }),
    acts: discoverBattleActs(state),
    currentTurnResources: state.currentTurnResources,
  };
}

function battleCreatureStateFromInit(
  input: BattleCreatureInit,
): BattleCreatureState {
  const creatureInit = input.creatureInit;
  assertCurrentHpWithinMaxHp(creatureInit);
  const zeroHpLifecycle = initialZeroHpLifecycle(creatureInit);
  const base = {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: input.initiative,
    hp: creatureInit.currentHp,
    maxHp: creatureInit.maxHp,
    tempHp: creatureInit.tempHp,
    conditions: EMPTY_CONDITION_STATE,
    activeEffects: [],
    zeroHpLifecycle,
  };

  if (creatureInit.kind === "character") {
    const classLevels = parseCharacterBattleClassLevels(
      creatureInit.classLevels,
    );
    return applyInitialZeroHpLifecycle({
      ...base,
      armorClass: creatureInit.armorClass,
      origin: {
        kind: "character",
        characterId: creatureInit.characterId,
        characterUnitRefs: creatureInit.characterUnitRefs,
        classLevels,
        selectedLoadout: creatureInit.selectedLoadout,
        attack: creatureInit.attack,
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
    origin: {
      kind: "statBlock",
      statBlock: creatureInit.statBlock,
    },
  });
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
  combatant: BattleCreatureState,
): BattleCreatureSnapshot {
  return {
    combatantId: combatant.combatantId,
    displayName: combatant.displayName,
    originKind: combatant.origin.kind,
    hp: combatant.hp,
    maxHp: combatant.maxHp,
    tempHp: combatant.tempHp,
    armorClass: currentArmorClass(combatant.armorClass),
    defeated: combatant.hp === 0,
    zeroHpLifecycle: combatantZeroHpLifecycleSnapshot(combatant),
    conditions: activeConditions(combatant.conditions),
    activeEffects: combatant.activeEffects,
  };
}

function initialZeroHpLifecycle(
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

function activeConditions(state: ConditionState): readonly Condition[] {
  return ALL_CONDITIONS.filter((condition) => hasCondition(state, condition));
}

function battleSubjectActorId(subject: BattleSubject): CombatantId {
  return subject.actorId;
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
      zeroHpLifecyclePolicy: "diesAtZeroHp",
    },
  };
}

export function scoreModifier(score: number): number {
  return Math.floor((score - 10) / 2);
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
      attackRollHole(attack),
    ]);
  }

  if (!attackRollResultIsValid(fillSet.attackRoll)) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Attack roll result is outside the d20 attack-roll protocol.",
    );
  }

  const hit = attackRollHits(
    fillSet.attackRoll,
    currentArmorClass(target.armorClass),
  );
  const critical = attackRollIsCriticalHit(fillSet.attackRoll);
  if (hit && fillSet.damageRoll == null) {
    return needsHolesResult(input.state, input.subject, [
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
  }

  return spendAttackAction(
    hit
      ? applyAttackDamage(input.state, target.combatantId, attack, fillSet)
      : input.state,
  );
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
      readonly damageRoll:
        | Extract<BattleFill, { readonly kind: "rolledDice" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string };

function attackFillSet(fills: readonly BattleFill[]): AttackFillSet {
  let targetId: CombatantId | undefined;
  let attackRoll: AttackRollResult | undefined;
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

    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Attack replay holes.`,
    };
  }

  return { tag: "ok", targetId, attackRoll, damageRoll };
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
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  const spent = spendAction(state.currentTurnResources, "attack");
  if (Either.isLeft(spent)) {
    return invalidResult(
      state,
      "staleSubject",
      "Attack is no longer available for the current actor.",
    );
  }

  const nextState = { ...state, currentTurnResources: spent.right };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

function resolveEndTurn(
  state: BattleState,
  deathSavingThrowRoll?: DieRollResult,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  const initiative = nextInitiative(state.initiative);
  const nextActorId = currentActing(initiative);
  const combatants = new Map<CombatantId, BattleCreatureState>();
  for (const [id, combatant] of state.combatants) {
    combatants.set(
      id,
      id === nextActorId
        ? resetPerTurnCharacterResources(combatant)
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
  const nextState = {
    ...state,
    initiative,
    combatants: expireStartOfTurnEffects(afterDeathSavingThrow, nextActorId),
    currentTurnResources: resetTurnActionEconomy(state.currentTurnResources),
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
          (effect) => effect.expiresAt.combatantId !== actorId,
        ),
      },
    ]),
  );
}

function resolveEndTurnCommand(
  input: BattleResolutionInput,
): BattleResolutionResult {
  const initiative = nextInitiative(input.state.initiative);
  const nextActorId = currentActing(initiative);
  const nextActor = input.state.combatants.get(nextActorId);
  const needsDeathSavingThrow = startTurnDeathSavingThrowRequired(nextActor);
  if (needsDeathSavingThrow && input.fills.length === 0) {
    return {
      tag: "needsHoles",
      subject: input.subject,
      holes: [deathSavingThrowHole(nextActorId)],
      snapshot: snapshotBattle(input.state),
    };
  }

  if (input.fills.length > 1) {
    return invalidResult(
      input.state,
      "invalidFill",
      "End Turn accepts at most one Death Saving Throw fill.",
    );
  }

  const [deathSavingThrowFill] = input.fills;
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
    deathSavingThrowFill?.kind === "deathSavingThrow" &&
    deathSavingThrowFill.holeId !== DEATH_SAVING_THROW_HOLE_ID
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Death Saving Throw fill does not match the requested hole.",
    );
  }

  return resolveEndTurn(
    input.state,
    deathSavingThrowFill?.kind === "deathSavingThrow"
      ? deathSavingThrowFill.value
      : undefined,
  );
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

function resolveUnitFeature(
  input: UnitFeatureBattleResolutionInput,
): BattleResolutionResult {
  const subject = input.subject;
  const actor = input.state.combatants.get(subject.actorId);
  const resource =
    actor?.origin.kind === "character"
      ? actor.origin.resources.find(
          (candidate) => candidate.unit.id === subject.unitId,
        )
      : undefined;
  const actionSurge = parseSupportedActionSurgeUnitFeature(resource?.unit);
  const secondWind =
    actor?.origin.kind === "character"
      ? parseSupportedSecondWindUnitFeature(
          resource?.unit,
          actor.origin.classLevels,
        )
      : null;

  if (actionSurge !== null) {
    return resolveActionSurgeUnitFeature(input, actor, resource, actionSurge);
  }

  if (secondWind !== null) {
    return resolveSecondWindUnitFeature(input, actor, resource, secondWind);
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
  actor: BattleCreatureState | undefined,
  resource: CharacterBattleResourceState | undefined,
  actionSurge: SupportedActionSurgeUnitFeature,
): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Action Surge does not accept battle fills.",
    );
  }

  if (
    actor?.origin.kind !== "character" ||
    resource == null ||
    resource.usesRemaining <= 0 ||
    resource.usedThisTurn
  ) {
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
  actor: BattleCreatureState | undefined,
  resource: CharacterBattleResourceState | undefined,
  secondWind: SupportedSecondWindUnitFeature,
): BattleResolutionResult {
  if (
    actor?.origin.kind !== "character" ||
    resource == null ||
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
  unit: UnitRecord | undefined,
): SupportedActionSurgeUnitFeature | null {
  if (unit?.id !== ACTION_SURGE_UNIT_ID || unit.kind !== "class_feature") {
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
  unit: UnitRecord | undefined,
  classLevels: readonly CharacterBattleClassLevel[],
): SupportedSecondWindUnitFeature | null {
  if (unit?.id !== SECOND_WIND_UNIT_ID || unit.kind !== "class_feature") {
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
  return supportedSpellActs(actor).flatMap((invocation) => {
    if (!spellHasAvailableSpend(actor, invocation)) {
      return [];
    }
    const targetHole = spellTargetHole(state, actorId, invocation);
    return targetHole.choices.length === 0
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
  });
}

function resolveSpellAct(
  input: ActionSpellBattleResolutionInput,
): BattleResolutionResult {
  const subject = input.subject;
  const actor = input.state.combatants.get(subject.actorId);
  const invocation =
    actor?.origin.kind === "character"
      ? supportedSpellActs(actor).find((candidate) =>
          subject.spellActId === undefined
            ? candidate.spell.id === subject.spellId
            : supportedSpellActId(candidate) === subject.spellActId,
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

  const fillSet = attackFillSet(input.fills);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (fillSet.targetId == null) {
    return needsHolesResult(input.state, input.subject, [
      spellTargetHole(input.state, subject.actorId, invocation),
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

  if (invocation.kind === "cantripSpellAttack") {
    if (fillSet.attackRoll == null) {
      return needsHolesResult(input.state, input.subject, [
        spellAttackRollHole(invocation),
      ]);
    }
    if (!attackRollResultIsValid(fillSet.attackRoll)) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell attack roll result is outside the d20 attack-roll protocol.",
      );
    }
    const hit = attackRollHits(
      fillSet.attackRoll,
      currentArmorClass(target.armorClass),
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
      return spendMagicAction(input.state);
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

  const damaged = applySpellDamage(
    input.state,
    target.combatantId,
    invocation,
    fillSet.damageRoll,
    critical,
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
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
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

  return {
    ...state,
    combatants: new Map(state.combatants).set(
      targetId,
      applyHpDamage(
        target,
        attackDamageAmount(
          target,
          attack,
          fillSet.damageRoll,
          fillSet.attackRoll != null &&
            attackRollIsCriticalHit(fillSet.attackRoll),
          fillSet.attackRoll,
        ),
        {
          deathFailuresAtZeroHp:
            fillSet.attackRoll != null &&
            attackRollIsCriticalHit(fillSet.attackRoll)
              ? 2
              : 1,
        },
      ),
    ),
  };
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
    Match.when({ policy: "diesAtZeroHp" }, () => combatant),
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
    Match.when({ policy: "diesAtZeroHp" }, () => combatant),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      ...combatant,
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
    Match.when({ policy: "diesAtZeroHp" }, () => combatant),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      ...combatant,
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

function applyInstantDeath(
  combatant: BattleCreatureState,
): BattleCreatureState {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () => combatant),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      ...combatant,
      conditions: applyCondition(combatant.conditions, "unconscious"),
      zeroHpLifecycle: {
        ...lifecycle,
        deathSaves: addDeathFailures(lifecycle.deathSaves, 3),
      },
    })),
    Match.exhaustive,
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
    ...spellcasting.cantrips.flatMap((spell) =>
      supportedCantripSpellAttack(
        spell,
        spellcasting.spellcastingAbilityModifier,
        spellcasting.proficiencyBonus,
      ),
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
  if (invocation.kind === "cantripSpellAttack") {
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
  const distanceFeet =
    actorId === targetId ? 0 : combatantDistanceFeet(state, actorId, targetId);
  return distanceFeet !== undefined && distanceFeet <= invocation.rangeFeet;
}

function supportedSpellActId(invocation: SupportedSpellAct): string {
  return invocation.kind === "preparedSlotSpell"
    ? `${invocation.kind}:${invocation.spell.id}:slot:${invocation.slotLevel}`
    : `${invocation.kind}:${invocation.spell.id}`;
}

function spellAttackRollHole(
  invocation: Extract<
    SupportedSpellAct,
    { readonly kind: "cantripSpellAttack" }
  >,
): BattleSpellAttackRollHole {
  return {
    kind: "attackRoll",
    holeId: ATTACK_ROLL_HOLE_ID,
    holeInstanceKey: ATTACK_ROLL_HOLE_INSTANCE,
    label: `${invocation.spell.name} spell attack roll`,
    spell: invocation,
    attackBonus: invocation.attackBonus,
  };
}

function spellDamageHole(
  invocation: SupportedSpellAct,
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

function validateSpellDamageFill(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  invocation: SupportedSpellAct,
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
        : invocation.damage.expr.dice * (critical ? 2 : 1),
    dieSize: invocation.damage.expr.dieSize,
  });
  return validation?.reason ?? null;
}

function applySpellDamage(
  state: BattleState,
  targetId: CombatantId,
  invocation: SupportedSpellAct,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  critical: boolean,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target == null) {
    return state;
  }
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
  return {
    ...state,
    combatants: new Map(state.combatants).set(
      targetId,
      applyHpDamage(
        target,
        damageAmountAfterTargetAdjustments(
          target,
          diceTotal + flat,
          invocation.damage.damageType,
        ),
        { deathFailuresAtZeroHp: critical ? 2 : 1 },
      ),
    ),
  };
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
  invocation: SupportedSpellAct,
  critical = false,
): string {
  const dice =
    invocation.kind === "preparedSlotSpell"
      ? invocation.damage.expr.dice * invocation.targeting.repeatedEffectCount
      : invocation.damage.expr.dice * (critical ? 2 : 1);
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

function attackTargetChoices(
  state: BattleState,
  actorId: CombatantId,
  attack: SupportedAttackActionOption,
): readonly CombatantId[] {
  return [...state.combatants.keys()].filter(
    (id) => id !== actorId && attackTargetIsLegal(state, actorId, id, attack),
  );
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

function combatantDistanceFeet(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
): number | undefined {
  return state.combatantDistances.get(actorId)?.get(targetId);
}

function attackRollHole(
  attack: SupportedAttackActionOption,
): BattleAttackRollHole {
  const name = attackActionOptionName(attack);
  return {
    kind: "attackRoll",
    holeId: ATTACK_ROLL_HOLE_ID,
    holeInstanceKey: ATTACK_ROLL_HOLE_INSTANCE,
    label: `${name} attack roll`,
    attack,
    attackBonus: attackBonus(attack),
  };
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
    (attack) => attackActionOptionName(attack) === subject.attackName,
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
    return (
      actor.origin.statBlock.statBlock.actions?.attacks?.flatMap((attack) => {
        const option = supportedStatBlockAttackActionOption(attack);
        return option == null ? [] : [option];
      }) ?? []
    );
  }

  return [];
}

function supportedStatBlockAttackActionOption(
  attack: CreatureNamedAttackRoll,
): StatBlockAttackActionOption | null {
  if (!isSupportedCreatureNamedAttackRoll(attack)) {
    return null;
  }

  return {
    kind: "statBlockAttack",
    attack,
  };
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
      (weaponAttack) => weaponAttack.abilityModifier,
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
