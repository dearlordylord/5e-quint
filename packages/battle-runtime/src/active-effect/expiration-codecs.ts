import { ElapsedTimeTicksSchema } from "@dnd/shared-algebras/elapsed-time-algebra";
import { Schema } from "effect";
import { CombatantId } from "../identity.ts";
import type {
  BattleActiveEffectExpiration,
  DurationBattleActiveEffectExpiration,
} from "./expiration.ts";
import { BattleRoundSchema } from "./round-codec.ts";

function exactSchema<Expected>() {
  return <Encoded, Context, Actual extends Expected>(
    schema: Schema.Schema<Actual, Encoded, Context> &
      ([Expected] extends [Actual] ? unknown : never),
  ): Schema.Schema<Actual, Encoded, Context> => schema;
}

export const BattleActiveEffectExpirationSchema =
  exactSchema<BattleActiveEffectExpiration>()(
    Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("startOfTurn"),
        combatantId: CombatantId,
      }),
      Schema.Struct({
        kind: Schema.Literal("endOfTurn"),
        combatantId: CombatantId,
        round: BattleRoundSchema,
      }),
      Schema.Struct({
        kind: Schema.Literal("concentration"),
        combatantId: CombatantId,
        durationTicks: Schema.optionalWith(ElapsedTimeTicksSchema, {
          exact: true,
        }),
      }),
      Schema.Struct({
        kind: Schema.Literal("duration"),
        durationTicks: ElapsedTimeTicksSchema,
      }),
      Schema.Struct({ kind: Schema.Literal("untilDispelled") }),
    ),
  );

export const DurationBattleActiveEffectExpirationSchema =
  exactSchema<DurationBattleActiveEffectExpiration>()(
    Schema.Struct({
      kind: Schema.Literal("duration"),
      durationTicks: ElapsedTimeTicksSchema,
    }),
  );

type ConcentrationBattleActiveEffectExpiration = Extract<
  BattleActiveEffectExpiration,
  { readonly kind: "concentration" }
>;

export const ConcentrationBattleActiveEffectExpirationSchema =
  exactSchema<ConcentrationBattleActiveEffectExpiration>()(
    Schema.Struct({
      kind: Schema.Literal("concentration"),
      combatantId: CombatantId,
      durationTicks: Schema.optionalWith(ElapsedTimeTicksSchema, {
        exact: true,
      }),
    }),
  );
