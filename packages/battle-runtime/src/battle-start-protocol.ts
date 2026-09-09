import type { Result } from "effect";

import type { BattleCreatureInit } from "./battle-init.ts";
import type { BattleRuntimeSession } from "./battle-runtime-context.ts";
import type { BattleHidePrerequisite } from "./battle-state-execution.ts";
import type { BattleInitializationIssue } from "./battle-initialization-issue.ts";
import type { BattleId, CombatantId } from "./identity.ts";

export type BattleStartInput = {
  readonly battleId: BattleId;
  readonly combatants: readonly BattleCreatureInit[];
  readonly hidePrerequisites?: ReadonlyMap<CombatantId, BattleHidePrerequisite>;
  readonly ownerPathForCombatant?: (
    combatant: BattleCreatureInit,
    index: number,
  ) => readonly (string | number)[];
};

export type StartBattle = (
  input: BattleStartInput,
) => Result.Result<BattleRuntimeSession, BattleInitializationIssue>;

export type BattleInitializationIssueMessage = (
  issue: BattleInitializationIssue,
) => string;
