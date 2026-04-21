import type {
  Ability,
  ClassFeatureRecord,
  DamageType,
  SpellRecord,
  StandardActionKind,
} from "@dnd/prototype-content-surface/surface/types";

export const TOY_AUTHORED_UNIT_IDS = [
  "cure_wounds",
  "fireball",
  "fighter_action_surge_l2",
] as const;
export type ToyAuthoredUnitId = (typeof TOY_AUTHORED_UNIT_IDS)[number];
export type ToySurfaceUnit = SpellRecord | ClassFeatureRecord;

export type ToyCreatureId = string;

export type ToyRuntimeExecutable =
  | {
      readonly tag: "singleTargetHeal";
      readonly activation: "action";
      readonly baseLevel: number;
      readonly addsSpellcastingModifier: boolean;
      readonly range: "touch";
      readonly scaling: {
        readonly baseDice: number;
        readonly dieSize: number;
        readonly perSlotAboveBaseDice: number;
      };
    }
  | {
      readonly tag: "areaSaveDamage";
      readonly activation: "action";
      readonly baseLevel: number;
      readonly rangeFeet: number;
      readonly radiusFeet: number;
      readonly saveAbility: Ability;
      readonly damageType: DamageType;
      readonly halfOnSuccess: true;
      readonly scaling: {
        readonly baseDice: number;
        readonly dieSize: number;
        readonly perSlotAboveBaseDice: number;
      };
      readonly dcSource: "casterSpellSaveDc";
    }
  | {
      readonly tag: "grantExtraAction";
      readonly activation: "free";
      readonly restrictedActions: ReadonlyArray<StandardActionKind>;
      readonly resetCadence: "short_or_long_rest";
      readonly usageLimit: "once_per_turn";
      readonly usesByLevel: ReadonlyArray<{
        readonly atLevel: number;
        readonly value: number;
      }>;
    };

export type ToyRuntimeUnit =
  | {
      readonly unitId: "cure_wounds";
      readonly sourceKind: "spell";
      readonly name: string;
      readonly provenanceSection: string;
      readonly executable: Extract<
        ToyRuntimeExecutable,
        { readonly tag: "singleTargetHeal" }
      >;
    }
  | {
      readonly unitId: "fireball";
      readonly sourceKind: "spell";
      readonly name: string;
      readonly provenanceSection: string;
      readonly executable: Extract<
        ToyRuntimeExecutable,
        { readonly tag: "areaSaveDamage" }
      >;
    }
  | {
      readonly unitId: "fighter_action_surge_l2";
      readonly sourceKind: "class_feature";
      readonly name: string;
      readonly provenanceSection: string;
      readonly executable: Extract<
        ToyRuntimeExecutable,
        { readonly tag: "grantExtraAction" }
      >;
    };

type ToyCreatureBase = {
  readonly id: ToyCreatureId;
  readonly name: string;
  readonly level: number;
  readonly currentHp: number;
  readonly maxHp: number;
  readonly armorClass: number;
  readonly spellSaveDc: number | null;
  readonly spellcastingModifier: number | null;
  readonly authoredUnitIds: ReadonlyArray<ToyAuthoredUnitId>;
};

export type ToyCharacterSheetCreature = ToyCreatureBase & {
  readonly sourceKind: "characterSheet";
  readonly className: "fighter" | "cleric" | "wizard";
};

export type ToyStatBlockCreature = ToyCreatureBase & {
  readonly sourceKind: "statBlock";
  readonly statBlockName: "ogre";
};

export type ToyCreatureRosterEntry =
  | ToyCharacterSheetCreature
  | ToyStatBlockCreature;

export type ToyCreatureRosterState = {
  readonly creatures: ReadonlyArray<ToyCreatureRosterEntry>;
};

export type ToyRosterChoice =
  | {
      readonly tag: "levelUpCharacter";
      readonly creatureId: ToyCreatureId;
      readonly newLevel: number;
    }
  | {
      readonly tag: "grantUnitToCharacter";
      readonly creatureId: ToyCreatureId;
      readonly unitId: ToyAuthoredUnitId;
    };

export type ToyBattleCombatant = {
  readonly id: ToyCreatureId;
  readonly name: string;
  readonly sourceKind: ToyCreatureRosterEntry["sourceKind"];
  readonly level: number;
  readonly currentHp: number;
  readonly maxHp: number;
  readonly armorClass: number;
  readonly spellSaveDc: number | null;
  readonly spellcastingModifier: number | null;
  readonly units: ReadonlyArray<ToyRuntimeUnit>;
  readonly actionsRemaining: number;
  readonly bonusActionAvailable: boolean;
  readonly actionSurgeUsesRemaining: number;
  readonly actionSurgeUsedThisTurn: boolean;
  readonly extraActionForbiddenKinds: ReadonlyArray<StandardActionKind>;
};

export type ToyBattleState = {
  readonly combatants: ReadonlyArray<ToyBattleCombatant>;
};

export type ToyBattleChoice =
  | {
      readonly tag: "activateSingleTargetHeal";
      readonly actorId: ToyCreatureId;
      readonly unitId: "cure_wounds";
      readonly targetId: ToyCreatureId;
      readonly slotLevel: number;
      readonly rolledHealing: number;
    }
  | {
      readonly tag: "activateAreaSaveDamage";
      readonly actorId: ToyCreatureId;
      readonly unitId: "fireball";
      readonly slotLevel: number;
      readonly targetIds: ReadonlyArray<ToyCreatureId>;
      readonly failedTargetIds: ReadonlyArray<ToyCreatureId>;
      readonly rolledDamage: number;
    }
  | {
      readonly tag: "activateGrantExtraAction";
      readonly actorId: ToyCreatureId;
      readonly unitId: "fighter_action_surge_l2";
    };
