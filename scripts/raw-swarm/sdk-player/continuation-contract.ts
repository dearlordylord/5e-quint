import type {
  AvailableBattleAct,
  BattleFill,
  BattleRuntimeResolutionResult,
  BattleRuntimeSession,
  BattleSubject,
  CombatantId,
} from "@dnd/battle-runtime";

export type PlayerSdk = {
  readonly discoverBattleActs: (
    session: BattleRuntimeSession,
  ) => readonly AvailableBattleAct[];
  readonly resolveBattleRuntimeSubject: (input: {
    readonly session: BattleRuntimeSession;
    readonly subject: BattleSubject;
    readonly fills: readonly BattleFill[];
  }) => BattleRuntimeResolutionResult;
  readonly resolveBattleRuntimeInterrupt: (input: {
    readonly session: BattleRuntimeSession;
    readonly fill: Extract<BattleFill, { readonly kind: "interruptDecision" }>;
  }) => BattleRuntimeResolutionResult;
  readonly endBattleRuntimeTurn: (input: {
    readonly session: BattleRuntimeSession;
    readonly actorId: CombatantId;
    readonly fills?: readonly BattleFill[];
  }) => BattleRuntimeResolutionResult;
};

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type PlayerContinuationContext = {
  readonly session: BattleRuntimeSession;
  readonly sdk: PlayerSdk;
};

export type PlayerContinuationOutcome =
  | {
      readonly kind: "continue";
      readonly session: BattleRuntimeSession;
      readonly observation: JsonValue;
    }
  | {
      readonly kind: "playerConcluded";
      readonly session: BattleRuntimeSession;
      readonly observation: JsonValue;
      readonly conclusion: string;
    };

export type PlayerContinuation = (
  context: PlayerContinuationContext,
) => PlayerContinuationOutcome | Promise<PlayerContinuationOutcome>;
