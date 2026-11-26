import type { Result } from "effect";

import type { BattleCreatureInit } from "./battle-init.ts";
import type { BattleRuntimeSession } from "./battle-runtime-context.ts";
import type {
  BattleHidePrerequisite,
  BattleInitialHandGrapple,
} from "./battle-state-execution.ts";
import type { BattleInitializationIssue } from "./battle-initialization-issue.ts";
import type { BattleId, CombatantId } from "./identity.ts";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";

export type BattleStartInput = {
  readonly battleId: BattleId;
  readonly combatants: readonly BattleCreatureInit[];
  readonly hidePrerequisites?: ReadonlyMap<CombatantId, BattleHidePrerequisite>;
  /**
   * Hand-held grapples already in place within 5 feet. The table declares
   * this supported hold and its escape DC; other anatomy/ranges are outside
   * this contract. A combatant starts Grappled only through one of these,
   * never through its initial conditions. Omission means no initial hold.
   */
  readonly initialHandGrapples?: ReadonlyNonEmptyArray<BattleInitialHandGrapple>;
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
