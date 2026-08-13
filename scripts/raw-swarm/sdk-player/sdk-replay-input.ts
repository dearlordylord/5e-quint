import {
  BATTLE_MOVEMENT_SPEED_KINDS,
  BattleFillSchema,
  BattleSubjectSchema,
  CombatantId,
  type BattleFill,
  type BattleSubject,
} from "../../../packages/battle-runtime/src/index.ts";
import { Either, Match, Schema } from "effect";

import type { EndBattleRuntimeTurnInput } from "./continuation-contract.ts";
import type { SdkCallRecord } from "./sdk-transcript.ts";

type EndBattleRuntimeTurnReplayInput = Omit<
  EndBattleRuntimeTurnInput,
  "session"
>;

export type SdkCallInput =
  | {
      readonly operation: "scenarioRelation";
      readonly input: {
        readonly sourceId: string;
        readonly targetId: string;
      };
    }
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
      readonly operation: "resolveScenarioMovement";
      readonly input:
        | {
            readonly kind: "route";
            readonly subject: Extract<
              BattleSubject,
              { readonly tag: "runtimeCommand"; readonly command: "move" }
            >;
            readonly route: readonly [
              { readonly x: number; readonly y: number },
              ...{ readonly x: number; readonly y: number }[],
            ];
            readonly speedKind: (typeof BATTLE_MOVEMENT_SPEED_KINDS)[number];
            readonly provokedOpportunityAttacks: Extract<
              BattleFill,
              { readonly kind: "movement" }
            >["value"]["provokedOpportunityAttacks"];
            readonly fills: readonly BattleFill[];
          }
        | {
            readonly kind: "continue";
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
      readonly input: EndBattleRuntimeTurnReplayInput;
    };

type ParseResult<A> =
  | { readonly tag: "valid"; readonly value: A }
  | { readonly tag: "invalid"; readonly message: string };

const EmptyInputSchema = Schema.Struct({});
const InitialRelationInputSchema = Schema.Struct({
  sourceId: Schema.NonEmptyTrimmedString,
  targetId: Schema.NonEmptyTrimmedString,
});
const ResolveInputSchema = Schema.Struct({
  subject: BattleSubjectSchema,
  fills: Schema.Array(BattleFillSchema),
});
const ScenarioMovementInputSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("route"),
    subject: BattleSubjectSchema,
    route: Schema.NonEmptyArray(
      Schema.Struct({ x: Schema.Number, y: Schema.Number }),
    ),
    speedKind: Schema.Literal(...BATTLE_MOVEMENT_SPEED_KINDS),
    provokedOpportunityAttacks: Schema.Unknown,
    fills: Schema.Array(BattleFillSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("continue"),
    fills: Schema.Array(BattleFillSchema),
  }),
);
const InterruptInputSchema = Schema.Struct({ fill: BattleFillSchema });
const EndTurnInputSchema = Schema.Struct({
  actorId: CombatantId,
  fills: Schema.optionalWith(Schema.Array(BattleFillSchema), { exact: true }),
});

export function decodeSdkCallInput(
  call: Pick<SdkCallRecord, "operation" | "input">,
): ParseResult<SdkCallInput> {
  return Match.value(call.operation).pipe(
    Match.when("scenarioRelation", () =>
      decodeInput(InitialRelationInputSchema, call.input, (decoded) => ({
        operation: "scenarioRelation",
        input: decoded,
      })),
    ),
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
    Match.when("resolveScenarioMovement", () =>
      decodeInput(ScenarioMovementInputSchema, call.input, (decoded) => {
        if (decoded.kind === "continue") {
          return {
            operation: "resolveScenarioMovement" as const,
            input: decoded,
          };
        }
        if (
          decoded.subject.tag !== "runtimeCommand" ||
          decoded.subject.command !== "move"
        ) {
          return {
            tag: "invalid" as const,
            message:
              "Scenario movement requires the canonical Move battle subject.",
          };
        }
        const movement = Schema.decodeUnknownEither(BattleFillSchema, {
          onExcessProperty: "error",
        })({
          kind: "movement",
          holeId: "scenario-movement",
          value: {
            speedKind: decoded.speedKind,
            movementCostFeet: 5,
            provokedOpportunityAttacks: decoded.provokedOpportunityAttacks,
          },
        });
        if (Either.isLeft(movement) || movement.right.kind !== "movement") {
          return {
            tag: "invalid" as const,
            message: `SDK call input is invalid: ${Either.isLeft(movement) ? movement.left.message : "expected Movement facts"}`,
          };
        }
        return {
          operation: "resolveScenarioMovement" as const,
          input: {
            kind: "route" as const,
            subject: decoded.subject,
            route: decoded.route,
            speedKind: decoded.speedKind,
            provokedOpportunityAttacks:
              movement.right.value.provokedOpportunityAttacks,
            fills: decoded.fills,
          },
        };
      }),
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
