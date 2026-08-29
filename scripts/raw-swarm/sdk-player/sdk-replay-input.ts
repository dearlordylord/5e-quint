import {
  BATTLE_MOVEMENT_SPEED_KINDS,
  BattleFillSchema,
  BattleSubjectSchema,
  CombatantId,
  type BattleFill,
  type BattleSubject,
} from "../../../packages/battle-runtime/src/index.ts";
import { Result, Match, Schema } from "effect";

import type {
  EndBattleRuntimeTurnInput,
  JsonValue,
  PlayerBattleFill,
} from "./continuation-contract.ts";
import { sdkCallInputJsonValue } from "./json-value.ts";
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
        readonly fills: readonly PlayerBattleFill[];
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

export type CanonicalSdkCallInputResult =
  | {
      readonly tag: "valid";
      readonly input: JsonValue;
      readonly value: SdkCallInput;
    }
  | {
      readonly tag: "invalid";
      readonly input: JsonValue;
      readonly message: string;
    };

const EmptyInputSchema = Schema.Struct({});
const InitialRelationInputSchema = Schema.Struct({
  sourceId: Schema.Trimmed.check(Schema.isNonEmpty()),
  targetId: Schema.Trimmed.check(Schema.isNonEmpty()),
});
const PlayerHelpAttackEnemyDecisionFillSchema = Schema.Struct({
  kind: Schema.Literal("helpAttackEnemyDecision"),
  holeId: Schema.Trimmed.check(Schema.isNonEmpty()).pipe(
    Schema.brand("HoleId"),
  ),
  targetEnemyId: CombatantId,
});
const CanonicalBattleFillExcludingHelpEnemyDecisionSchema =
  BattleFillSchema.pipe(
    Schema.check(
      Schema.makeFilter(
        (
          fill,
        ): fill is Exclude<
          BattleFill,
          { readonly kind: "helpAttackEnemyDecision" }
        > => fill.kind !== "helpAttackEnemyDecision",
        {
          description:
            "The Raw Swarm player chooses the Help enemy without supplying the ScenarioSession-owned adjacency witness.",
        },
      ),
    ),
  );
const PlayerBattleFillSchema = Schema.Union([
  PlayerHelpAttackEnemyDecisionFillSchema,
  CanonicalBattleFillExcludingHelpEnemyDecisionSchema,
]);
const ResolveInputSchema = Schema.Struct({
  subject: BattleSubjectSchema,
  fills: Schema.Array(PlayerBattleFillSchema),
});
const ScenarioMovementInputSchema = Schema.Union([
  Schema.Struct({
    kind: Schema.Literal("route"),
    subject: BattleSubjectSchema,
    route: Schema.NonEmptyArray(
      Schema.Struct({ x: Schema.Number, y: Schema.Number }),
    ),
    speedKind: Schema.Literals(BATTLE_MOVEMENT_SPEED_KINDS),
    fills: Schema.Array(BattleFillSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("continue"),
    fills: Schema.Array(BattleFillSchema),
  }),
]);
const InterruptInputSchema = Schema.Struct({ fill: BattleFillSchema });
const EndTurnInputSchema = Schema.Struct({
  actorId: CombatantId,
  fills: Schema.optionalKey(Schema.Array(BattleFillSchema)),
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
        return {
          operation: "resolveScenarioMovement" as const,
          input: {
            kind: "route" as const,
            subject: decoded.subject,
            route: decoded.route,
            speedKind: decoded.speedKind,
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

export function canonicalSdkCallInput(input: {
  readonly operation: SdkCallRecord["operation"];
  readonly input: unknown;
}): CanonicalSdkCallInputResult {
  const canonicalInput = sdkCallInputJsonValue(input.input);
  const decoded = decodeSdkCallInput({
    operation: input.operation,
    input: canonicalInput,
  });
  return { ...decoded, input: canonicalInput };
}

function decodeInput<A, I, R extends SdkCallInput>(
  schema: Schema.Codec<A, I>,
  input: unknown,
  project: (decoded: A) => R | ParseResult<R>,
): ParseResult<R> {
  const decoded = Schema.decodeUnknownResult(schema, {
    onExcessProperty: "error",
  })(input);
  if (Result.isFailure(decoded)) {
    return {
      tag: "invalid",
      message: `SDK call input is invalid: ${decoded.failure.message}`,
    };
  }
  const projected = project(decoded.success);
  return "tag" in projected ? projected : { tag: "valid", value: projected };
}
