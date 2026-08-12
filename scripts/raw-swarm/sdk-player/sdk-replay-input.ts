import {
  BattleFillSchema,
  BattleSubjectSchema,
  CombatantId,
  type BattleFill,
  type BattleSubject,
  type CombatantId as CombatantIdType,
} from "../../../packages/battle-runtime/src/index.ts";
import { Either, Match, Schema } from "effect";

import type { SdkCallRecord } from "./sdk-transcript.ts";

export type SdkCallInput =
  | {
      readonly operation: "discoverBattleActs";
      readonly input: Readonly<Record<string, never>>;
    }
  | {
      readonly operation: "resolveBattleRuntimeSubject";
      readonly input: {
        readonly subject: BattleSubject;
        readonly fills: readonly BattleFill[];
      };
    }
  | {
      readonly operation: "resolveBattleRuntimeInterrupt";
      readonly input: {
        readonly fill: Extract<
          BattleFill,
          { readonly kind: "interruptDecision" }
        >;
      };
    }
  | {
      readonly operation: "endBattleRuntimeTurn";
      readonly input: {
        readonly actorId: CombatantIdType;
        readonly fills: readonly BattleFill[];
      };
    };

type ParseResult<A> =
  | { readonly tag: "valid"; readonly value: A }
  | { readonly tag: "invalid"; readonly message: string };

const EmptyInputSchema = Schema.Struct({});
const ResolveInputSchema = Schema.Struct({
  subject: BattleSubjectSchema,
  fills: Schema.Array(BattleFillSchema),
});
const InterruptInputSchema = Schema.Struct({ fill: BattleFillSchema });
const EndTurnInputSchema = Schema.Struct({
  actorId: CombatantId,
  fills: Schema.Array(BattleFillSchema),
});

export function decodeSdkCallInput(
  call: Pick<SdkCallRecord, "operation" | "input">,
): ParseResult<SdkCallInput> {
  return Match.value(call.operation).pipe(
    Match.when("discoverBattleActs", () =>
      decodeInput(EmptyInputSchema, call.input, (decoded) => ({
        operation: "discoverBattleActs",
        input: decoded,
      })),
    ),
    Match.when("resolveBattleRuntimeSubject", () =>
      decodeInput(ResolveInputSchema, call.input, (decoded) => ({
        operation: "resolveBattleRuntimeSubject",
        input: decoded,
      })),
    ),
    Match.when("resolveBattleRuntimeInterrupt", () =>
      decodeInput(InterruptInputSchema, call.input, (decoded) =>
        decoded.fill.kind === "interruptDecision"
          ? {
              tag: "valid" as const,
              value: {
                operation: "resolveBattleRuntimeInterrupt" as const,
                input: { fill: decoded.fill },
              },
            }
          : {
              tag: "invalid" as const,
              message: "Interrupt replay requires an interruptDecision fill.",
            },
      ),
    ),
    Match.when("endBattleRuntimeTurn", () =>
      decodeInput(EndTurnInputSchema, call.input, (decoded) => ({
        operation: "endBattleRuntimeTurn",
        input: decoded,
      })),
    ),
    Match.exhaustive,
  );
}

function decodeInput<A, I, R extends SdkCallInput>(
  schema: Schema.Schema<A, I>,
  input: unknown,
  project: (decoded: A) => R | ParseResult<R>,
): ParseResult<R> {
  const decoded = Schema.decodeUnknownEither(schema, {
    onExcessProperty: "error",
  })(input);
  if (Either.isLeft(decoded)) {
    return {
      tag: "invalid",
      message: `SDK call input is invalid: ${decoded.left.message}`,
    };
  }
  const projected = project(decoded.right);
  return "tag" in projected ? projected : { tag: "valid", value: projected };
}
