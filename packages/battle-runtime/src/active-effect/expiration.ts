import type { ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { Round as RoundType } from "@dnd/shared/types";
import type { CombatantId } from "../identity.ts";

export type BattleActiveEffectExpiration =
  | {
      readonly kind: "startOfTurn";
      readonly combatantId: CombatantId;
    }
  | {
      readonly kind: "endOfTurn";
      readonly combatantId: CombatantId;
      readonly round: RoundType;
    }
  | {
      readonly kind: "concentration";
      readonly combatantId: CombatantId;
      readonly durationTicks?: ElapsedTimeTicks;
    }
  | DurationBattleActiveEffectExpiration
  | {
      readonly kind: "untilDispelled";
    };

export type DurationBattleActiveEffectExpiration = {
  readonly kind: "duration";
  readonly durationTicks: ElapsedTimeTicks;
};

export type TurnAnchoredBattleActiveEffectExpiration = Extract<
  BattleActiveEffectExpiration,
  { readonly kind: "startOfTurn" } | { readonly kind: "endOfTurn" }
>;
