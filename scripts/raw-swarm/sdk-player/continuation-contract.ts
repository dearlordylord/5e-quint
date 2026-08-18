import type {
  AvailableBattleAct,
  BattleFill,
  BattleObjectId,
  BattleMovementSpeedKind,
  BattleRuntimeResolutionResult,
  BattleSubject,
  CombatantId,
} from "@dnd/battle-runtime";
import type { ScenarioSession } from "./scenario-session.ts";
import type { ScenarioSessionUpdateIssue } from "./scenario-session.ts";
import type { ScenarioRelationResult } from "./scenario-session.ts";
import type { CoordinateInput } from "../../../packages/tactical-space/src/index.ts";

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
  ) => readonly AvailableBattleAct[];
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
    readonly fills: readonly BattleFill[];
  }) => ScenarioBattleResolutionResult;
  readonly resolveBattleRuntimeInterrupt: (input: {
    readonly session: ScenarioSession;
    readonly fill: Extract<BattleFill, { readonly kind: "interruptDecision" }>;
  }) => ScenarioBattleResolutionResult;
  readonly endBattleRuntimeTurn: (
    input: EndBattleRuntimeTurnInput,
  ) => ScenarioBattleResolutionResult;
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
      readonly observation: JsonValue;
    }
  | {
      readonly kind: "playerConcluded";
      readonly session: ScenarioSession;
      readonly observation: JsonValue;
      readonly conclusion: string;
    };

export type PlayerObservation = {
  readonly continuation: number;
  readonly kind: "continue" | "playerConcluded";
  readonly observation: JsonValue;
  readonly conclusion?: string;
};

export type PlayerContinuation = (
  context: PlayerContinuationContext,
) => PlayerContinuationOutcome | Promise<PlayerContinuationOutcome>;
