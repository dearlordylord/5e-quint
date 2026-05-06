import type { CreatureId } from "#/types.ts";

export interface LAWindowCtx {
  readonly eligibleMonsters: ReadonlySet<CreatureId>;
  readonly endingTurnIndex: number;
}

export interface ReadyWindowCtx {
  readonly eligibleCreatures: ReadonlySet<CreatureId>;
  readonly endingTurnIndex: number;
}

export interface MonsterCommandSelection {
  readonly type:
    | "USE_LEGENDARY_ACTION"
    | "USE_RECHARGE_ABILITY"
    | "USE_DAILY_ABILITY";
  readonly monsterId: CreatureId;
  readonly abilityId: string;
}
