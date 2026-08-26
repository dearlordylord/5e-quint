import type {
  BattleFill,
  BattleObjectId,
  BattleMovementSpeedKind,
  BattleRuntimeResolutionResult,
  BattleRuntimeTableD20TestResolutionResult,
  BattleSubject,
  CombatantId,
} from "@dnd/battle-runtime";
import type { ScenarioSession } from "./scenario-session.ts";
import type { ScenarioAvailableBattleAct } from "./scenario-session.ts";
import type { ScenarioSessionUpdateIssue } from "./scenario-session.ts";
import type { ScenarioRelationResult } from "./scenario-session.ts";
import type { CoordinateInput } from "../../../packages/tactical-space/src/index.ts";

export type PlayerBattleFill =
  | Exclude<BattleFill, { readonly kind: "helpAttackEnemyDecision" }>
  | Omit<
      Extract<BattleFill, { readonly kind: "helpAttackEnemyDecision" }>,
      "targetWithinFiveFeetOfHelper"
    >;

/**
 * Minimal call-shape reference shared by the generated attempt and controller
 * prompt. Keep it beside the public contract so those two delivery surfaces
 * cannot drift into separate protocol descriptions.
 */
export const PLAYER_CONTINUATION_PROTOCOL_REMINDER = [
  "discoverBattleActs(context.session) returns the readonly act array directly; do not read an .acts property from it.",
  "Resolve an ordinary surfaced subject with resolveBattleRuntimeSubject({ session, subject, fills }).",
  "A D20 Test is exactly an Ability Check, Saving Throw, or attack roll. For each rolled pending test, use the surfaced rollMode (normal, advantage, or disadvantage); d20TestCircumstanceRequests identify the exact occurrence and saving-throw target after mechanical and Table circumstances are combined.",
  'Start surfaced movement with resolveScenarioMovement({ kind: "route", session, subject, route, speedKind, fills }); there is no movement field.',
  'Continue surfaced movement holes with resolveScenarioMovement({ kind: "continue", session, fills }).',
  "Every continue and playerConcluded outcome must include a tacticalNote string; playerConcluded also requires a nonempty conclusion.",
] as const;

export type ScenarioBattleResolutionResult =
  | (BattleRuntimeResolutionResult extends infer Result
      ? Result extends BattleRuntimeResolutionResult
        ? Omit<Result, "session"> & { readonly session: ScenarioSession }
        : never
      : never)
  | {
      readonly tag: "scenarioSessionConflict";
      readonly session: ScenarioSession;
      readonly issue: ScenarioSessionUpdateIssue;
    }
  | {
      readonly tag: "scenarioMovementRejected";
      readonly session: ScenarioSession;
      readonly message: string;
    };

export type ScenarioTableD20TestResolutionResult =
  | (BattleRuntimeTableD20TestResolutionResult extends infer Result
      ? Result extends BattleRuntimeTableD20TestResolutionResult
        ? Omit<Result, "session"> & { readonly session: ScenarioSession }
        : never
      : never)
  | Extract<
      ScenarioBattleResolutionResult,
      { readonly tag: "scenarioSessionConflict" }
    >;

export type EndBattleRuntimeTurnInput = {
  readonly session: ScenarioSession;
  readonly actorId: CombatantId;
  readonly fills?: readonly BattleFill[];
};

export type PlayerSdk = {
  readonly scenarioRelation: (input: {
    readonly session: ScenarioSession;
    readonly sourceId: CombatantId | BattleObjectId;
    readonly targetId: CombatantId | BattleObjectId;
  }) => ScenarioRelationResult;
  readonly discoverBattleActs: (
    session: ScenarioSession,
  ) => readonly ScenarioAvailableBattleAct[];
  readonly resolveScenarioMovement: (
    input:
      | {
          readonly kind: "route";
          readonly session: ScenarioSession;
          readonly subject: Extract<
            BattleSubject,
            { readonly tag: "runtimeCommand"; readonly command: "move" }
          >;
          readonly route: readonly [CoordinateInput, ...CoordinateInput[]];
          readonly speedKind: BattleMovementSpeedKind;
          readonly fills: readonly BattleFill[];
        }
      | {
          readonly kind: "continue";
          readonly session: ScenarioSession;
          readonly fills: readonly BattleFill[];
        },
  ) => ScenarioBattleResolutionResult;
  readonly resolveBattleRuntimeSubject: (input: {
    readonly session: ScenarioSession;
    readonly subject: BattleSubject;
    readonly fills: readonly PlayerBattleFill[];
  }) => ScenarioTableD20TestResolutionResult;
  readonly resolveBattleRuntimeInterrupt: (input: {
    readonly session: ScenarioSession;
    readonly fill: Extract<BattleFill, { readonly kind: "interruptDecision" }>;
  }) => ScenarioBattleResolutionResult;
  readonly endBattleRuntimeTurn: (
    input: EndBattleRuntimeTurnInput,
  ) => ScenarioTableD20TestResolutionResult;
};

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type PlayerContinuationContext = {
  readonly session: ScenarioSession;
  readonly sdk: PlayerSdk;
};

export type PlayerContinuationOutcome =
  | {
      readonly kind: "continue";
      readonly session: ScenarioSession;
      readonly tacticalNote: string;
    }
  | {
      readonly kind: "playerConcluded";
      readonly session: ScenarioSession;
      readonly tacticalNote: string;
      readonly conclusion: string;
    };

export type PlayerContinuation = (
  context: PlayerContinuationContext,
) => PlayerContinuationOutcome | Promise<PlayerContinuationOutcome>;
