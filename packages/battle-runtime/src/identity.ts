import { Brand, Schema } from "effect";
import { CreatureId, Initiative, ResourceCount } from "@dnd/shared/types";

export const CombatantId = CreatureId.pipe(Schema.brand("CombatantId"));
export type CombatantId = typeof CombatantId.Type;
export const combatantId: (value: string) => CombatantId = CombatantId.make;

export const BattleObjectId = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("BattleObjectId"),
);
export type BattleObjectId = typeof BattleObjectId.Type;
export const battleObjectId: (value: string) => BattleObjectId =
  BattleObjectId.make;

export const BattleAreaId = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("BattleAreaId"),
);
export type BattleAreaId = typeof BattleAreaId.Type;
export const battleAreaId: (value: string) => BattleAreaId = BattleAreaId.make;

export const BattleTablePositionId = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("BattleTablePositionId"),
);
export type BattleTablePositionId = typeof BattleTablePositionId.Type;
export const battleTablePositionId: (value: string) => BattleTablePositionId =
  BattleTablePositionId.make;

export const BattleDancingLightId = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("BattleDancingLightId"),
);
export type BattleDancingLightId = typeof BattleDancingLightId.Type;
export const battleDancingLightId: (value: string) => BattleDancingLightId =
  BattleDancingLightId.make;

export const SpellId = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("SpellId"),
);
export type SpellId = typeof SpellId.Type;
export const spellId: (value: string) => SpellId = SpellId.make;

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

export const BattleReplayStackDepth = ResourceCount.pipe(
  Schema.brand("BattleReplayStackDepth"),
);
export type BattleReplayStackDepth = typeof BattleReplayStackDepth.Type;
export const battleReplayStackDepth: (value: number) => BattleReplayStackDepth =
  BattleReplayStackDepth.make;

export const BattleCombatantSide = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand("BattleCombatantSide"),
);
export type BattleCombatantSide = typeof BattleCombatantSide.Type;
export const battleCombatantSide: (value: string) => BattleCombatantSide =
  BattleCombatantSide.make;
