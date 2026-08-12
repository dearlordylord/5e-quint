import type {
  battleCreatureInitFromStatBlock,
  battleId,
  battleStateInitIssueMessage,
  combatantId,
  initiativeScore,
  startBattle,
  BattleRuntimeSession,
} from "@dnd/battle-runtime";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import type { Either } from "effect";

import type { JsonValue } from "./continuation-contract.ts";

export type ScenarioSetupSdk = {
  readonly battleCreatureInitFromStatBlock: typeof battleCreatureInitFromStatBlock;
  readonly battleId: typeof battleId;
  readonly battleStateInitIssueMessage: typeof battleStateInitIssueMessage;
  readonly combatantId: typeof combatantId;
  readonly initiativeScore: typeof initiativeScore;
  readonly startBattle: typeof startBattle;
  readonly isLeft: typeof Either.isLeft;
};

export type ScenarioSetupContext = {
  readonly sdk: ScenarioSetupSdk;
  readonly statBlocks: readonly StatBlockRecord[];
};

export type ScenarioSetupOutcome =
  | {
      readonly kind: "ready";
      readonly session: BattleRuntimeSession;
      readonly observation: JsonValue;
    }
  | {
      readonly kind: "obstructed";
      readonly obstruction: string;
      readonly observation: JsonValue;
    };

export type ScenarioSetup = (
  context: ScenarioSetupContext,
) => ScenarioSetupOutcome | Promise<ScenarioSetupOutcome>;
