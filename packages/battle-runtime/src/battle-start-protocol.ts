import type { Result } from "effect";

import type { BattleCreatureInit } from "./battle-init.ts";
import type { BattleRuntimeSession } from "./battle-runtime-context.ts";
import type {
  BattleHidePrerequisite,
  BattleInitialGrapple,
} from "./battle-state-execution.ts";
import type { BattleInitializationIssue } from "./battle-initialization-issue.ts";
import type { BattleId, CombatantId } from "./identity.ts";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";

export type BattleStartInput = {
  readonly battleId: BattleId;
  readonly combatants: readonly BattleCreatureInit[];
  readonly hidePrerequisites?: ReadonlyMap<CombatantId, BattleHidePrerequisite>;
  /**
   * Grapples already in place when the battle starts. A combatant starts
   * Grappled only through one of these, never through its initial conditions,
   * so the battle always knows the grappler and the escape DC. Omission means
   * no combatant starts Grappled.
   */
  readonly initialGrapples?: ReadonlyNonEmptyArray<BattleInitialGrapple>;
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
