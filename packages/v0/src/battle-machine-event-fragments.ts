import type {
  AoESpellCtx,
  BattlePosition,
  SaveFailedCtx,
  TraversalMovementCtx,
} from "#/battle-machine-types.ts";
import type {
  ArmorClass,
  CreatureId,
  DamageQualifier,
  DamageType,
  WeaponProperty,
} from "#/types.ts";

type MovementProvocationKind =
  | "provokesOpportunityAttacks"
  | "doesNotProvokeOpportunityAttacks";

export type SaveFailedAoEInterrupt = {
  readonly tag: "PISaveFailedAoE";
  readonly sf: SaveFailedCtx;
  readonly aoe: AoESpellCtx;
};

export type SaveFailedTraversalInterrupt = {
  readonly tag: "PISaveFailedTraversal";
  readonly sf: SaveFailedCtx;
  readonly traversal: TraversalMovementCtx;
};

export type TraversalEnteredCreature = {
  readonly targetId: CreatureId;
  readonly saveRoll: number;
  readonly saveRollB?: number;
};

export type BattleMonsterTraversalEvent = {
  readonly type: "BATTLE_MONSTER_TRAVERSAL";
  readonly abilityId: string;
  readonly destination: BattlePosition;
  readonly movementSpent: number;
  readonly enteredCreatures: ReadonlyArray<TraversalEnteredCreature>;
};

export type BattleMonsterSaveEffectEvent = {
  readonly type: "BATTLE_MONSTER_SAVE_EFFECT";
  readonly abilityId: string;
  readonly targetId: CreatureId;
  readonly saveRoll: number;
  readonly saveRollB?: number;
  readonly actorCanSeeTarget: boolean;
};

export type BattleMoveEvent = {
  readonly type: "BATTLE_MOVE";
  readonly provocationKind: MovementProvocationKind;
  readonly threatened: ReadonlySet<CreatureId>;
};

export type BattleMovementOADeclineEvent = {
  readonly type: "BATTLE_MOVEMENT_OA_DECLINE";
  readonly reactorId: CreatureId | null;
};

export type BattleMovementOAAttackEvent = {
  readonly type: "BATTLE_MOVEMENT_OA_ATTACK";
  readonly reactorId: CreatureId | null;
  readonly oaAtkRoll: number;
  readonly oaDmg: number;
  readonly oaDt: DamageType;
  readonly oaDamageQualifiers?: ReadonlySet<DamageQualifier>;
  readonly oaCrit: boolean;
  readonly oaTgtAc: ArmorClass;
  readonly knockOut: boolean;
  readonly isMelee: true;
  readonly weaponProperties?: ReadonlySet<WeaponProperty>;
  readonly isFinesse?: boolean;
  readonly attackerWithin5ft: boolean;
  readonly attackerWithin60ft?: boolean;
  readonly hostileWithin5ft: boolean;
  readonly targetCanSeeAttacker: boolean;
  readonly attackerCanSeeTarget: boolean;
  readonly frightSourceInLOS: boolean;
  readonly hasAllyAdjacentToTarget: boolean;
  readonly saDmg: number;
  readonly hitReactionCandidates: ReadonlySet<CreatureId>;
};
