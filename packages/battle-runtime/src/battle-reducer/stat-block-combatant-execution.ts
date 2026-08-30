import { statBlockArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import { EMPTY_CONDITION_STATE } from "@dnd/shared-algebras/conditions-algebra";
import {
  initiativeEntries,
  insertAtOrderIndex,
} from "@dnd/shared-algebras/initiative-algebra";
import { movementFeet, type Hp } from "@dnd/shared/types";
import { Result } from "effect";

import {
  battleEffectExecutionOrdinal,
  battleExecutionScopeCursor,
  battleExecutionScopeInitialOrNextOrdinal,
  battleStatBlockExecutionScopeRefBelongsToBattle,
  battleStatBlockExecutionScopeRefBelongsToCombatant,
  type BattleExecutionScopeOrdinal,
  type CombatantId,
  type InitiativeScore,
} from "../identity.ts";
import {
  admittedBattleStatBlockCombatantMaxHp,
  type AdmittedBattleStatBlockCombatant,
} from "../stat-block-combatant-execution-state.ts";
import { statBlockAttackActionOptions } from "../stat-block-execution-state.ts";
import type {
  BattleState,
  BattleStateInitIssue,
  StatBlockBattleCreatureState,
} from "../battle-state-execution.ts";
import { battleStateInitIssue } from "./domain-helpers.ts";
import {
  ammunitionStockIssues,
  missingRequiredAmmunitionKinds,
} from "../battle-ammunition.ts";
import type { BattleAmmunitionStock } from "../battle-state-execution.ts";

export function addBattleStatBlockCombatant(input: {
  readonly state: BattleState;
  readonly combatant: {
    readonly combatantId: CombatantId;
    readonly initiative: InitiativeScore;
    readonly admission: AdmittedBattleStatBlockCombatant;
    readonly currentHp: Hp;
    readonly tempHp: Hp;
    readonly ammunitionStocks: readonly BattleAmmunitionStock[];
    readonly reactionAvailable: boolean;
  };
}): Result.Result<BattleState, BattleStateInitIssue> {
  const { combatant } = input;
  const identityIssue = statBlockCombatantIdentityIssue(input);
  if (identityIssue !== null) return battleStateInitIssue(identityIssue);
  const allocation = input.state.executionScopeCursors.get(
    combatant.combatantId,
  );
  const maxHp = admittedBattleStatBlockCombatantMaxHp(combatant.admission);
  const preflightIssue = statBlockCombatantPreflightIssue(
    combatant,
    allocation,
    maxHp,
  );
  if (preflightIssue !== null) return battleStateInitIssue(preflightIssue);
  const { initialization, origin } = combatant.admission;
  const ammunitionStocks = combatant.ammunitionStocks;
  const ammunitionIssue = statBlockCombatantAmmunitionIssue(
    origin,
    ammunitionStocks,
  );
  if (ammunitionIssue !== null) return battleStateInitIssue(ammunitionIssue);
  const creature: StatBlockBattleCreatureState = {
    combatantId: combatant.combatantId,
    initiative: combatant.initiative,
    hp: combatant.currentHp,
    maxHp,
    tempHp: combatant.tempHp,
    conditions: EMPTY_CONDITION_STATE,
    positiveHpUnconscious: null,
    activeEffects: [],
    nextEffectOrdinal: battleEffectExecutionOrdinal(0),
    activeOngoingFeatureOccurrences: new Map(),
    attackRollMissToHitReplacementsUsedSinceTurnStart: [],
    concentration: null,
    dodging: false,
    hidden: null,
    zeroHpLifecycle: { policy: "diesAtZeroHp" },
    reactionAvailable: combatant.reactionAvailable,
    movementSpentFeet: movementFeet(0),
    ammunitionStocks,
    armorClass: statBlockArmorClassState(initialization.armorClass),
    size: initialization.size,
    origin: { kind: "statBlock", ...origin },
  };
  const entries = initiativeEntries(input.state.initiative);
  const firstLower = entries.findIndex(
    (entry) => entry.initiative < combatant.initiative,
  );
  const orderedIndex = firstLower === -1 ? entries.length : firstLower;
  const firstTie = entries.findIndex(
    (entry) => entry.initiative === combatant.initiative,
  );
  const tieLength =
    firstTie === -1
      ? 0
      : entries
          .slice(firstTie)
          .findIndex((entry) => entry.initiative !== combatant.initiative);
  const insertionIndex =
    firstTie === -1
      ? orderedIndex
      : firstTie + (tieLength === -1 ? entries.length - firstTie : tieLength);
  const executionScopeCursors = new Map(input.state.executionScopeCursors);
  executionScopeCursors.set(combatant.combatantId, {
    kind: "active",
    nextScopeOrdinal: battleExecutionScopeCursor(
      combatant.admission.cursorTransition.to,
    ),
  });
  return Result.succeed({
    ...input.state,
    initiative: insertAtOrderIndex(input.state.initiative, insertionIndex, {
      creature: combatant.combatantId,
      initiative: combatant.initiative,
    }),
    combatants: new Map(input.state.combatants).set(
      combatant.combatantId,
      creature,
    ),
    executionScopeCursors,
  });
}

function statBlockCombatantIdentityIssue(input: {
  readonly state: BattleState;
  readonly combatant: {
    readonly combatantId: CombatantId;
    readonly admission: AdmittedBattleStatBlockCombatant;
  };
}): string | null {
  const { combatant } = input;
  if (input.state.combatants.has(combatant.combatantId)) {
    return `Duplicate combatant id: ${combatant.combatantId}`;
  }
  if (combatant.admission.combatantId !== combatant.combatantId) {
    return "Stat Block combatant admission belongs to a different combatant.";
  }
  if (combatant.admission.battleId !== input.state.battleId) {
    return "Stat Block combatant admission belongs to a different battle.";
  }
  if (
    !battleStatBlockExecutionScopeRefBelongsToBattle(
      combatant.admission.origin.execution.scopeRef,
      input.state.battleId,
    ) ||
    !battleStatBlockExecutionScopeRefBelongsToCombatant(
      combatant.admission.origin.execution.scopeRef,
      combatant.combatantId,
    )
  ) {
    return "Stat Block combatant admission execution scope belongs to a different destination.";
  }
  return null;
}

function statBlockCombatantCursorIssue(
  combatant: {
    readonly combatantId: CombatantId;
    readonly admission: AdmittedBattleStatBlockCombatant;
  },
  allocation:
    | { readonly nextScopeOrdinal: BattleExecutionScopeOrdinal }
    | { readonly nextScopeOrdinal?: undefined }
    | undefined,
): string | null {
  const currentScopeOrdinal = battleExecutionScopeInitialOrNextOrdinal(
    allocation?.nextScopeOrdinal,
  );
  if (currentScopeOrdinal !== combatant.admission.cursorTransition.from) {
    return "Stat Block combatant admission does not match the current execution-scope cursor.";
  }
  return null;
}

function statBlockCombatantPreflightIssue(
  combatant: {
    readonly combatantId: CombatantId;
    readonly admission: AdmittedBattleStatBlockCombatant;
    readonly currentHp: Hp;
  },
  allocation:
    | { readonly nextScopeOrdinal: BattleExecutionScopeOrdinal }
    | { readonly nextScopeOrdinal?: undefined }
    | undefined,
  maxHp: Hp,
): string | null {
  const cursorIssue = statBlockCombatantCursorIssue(combatant, allocation);
  if (cursorIssue !== null) return cursorIssue;
  return combatant.currentHp > maxHp
    ? "Battle initialization current HP exceeds max HP."
    : null;
}

function statBlockCombatantAmmunitionIssue(
  origin: AdmittedBattleStatBlockCombatant["origin"],
  ammunitionStocks: readonly BattleAmmunitionStock[],
): string | null {
  const ammunitionIssues = ammunitionStockIssues(ammunitionStocks);
  const missingKinds = missingRequiredAmmunitionKinds(
    statBlockAttackActionOptions(origin.execution).map(
      (option) => option.attack,
    ),
    ammunitionStocks,
  );
  if (ammunitionIssues.length > 0 || missingKinds.length > 0) {
    return (
      ammunitionIssues[0] ??
      `Stat Block battle initialization requires an explicit ${missingKinds[0]} ammunition stock.`
    );
  }
  return null;
}
