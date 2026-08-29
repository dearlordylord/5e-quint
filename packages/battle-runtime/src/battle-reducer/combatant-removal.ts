import { removeFromInitiative } from "@dnd/shared-algebras/initiative-algebra";
import * as Option from "effect/Option";
import { Result } from "effect";

import type { BattleCompanionState } from "../companion-state.ts";
import { battleCompanionEntries } from "../find-familiar-state.ts";
import {
  battleAttackExecutionScopeRefForProcedureRef,
  type CombatantId,
} from "../identity.ts";
import type {
  BattleCreatureState,
  BattleHidePrerequisite,
  BattleRetiredExecutionScopeOwnership,
  BattleState,
  BattleStateInitIssue,
} from "../battle-state-execution.ts";
import {
  currentActorId,
  normalizeBattleGrapples,
} from "./creature-state-leaves.ts";
import { battleStateInitIssue } from "./domain-helpers.ts";
import { resetBattleTurnResources } from "./turn-resource-reset.ts";

function retiredExecutionScopeOwnership(
  combatant: BattleCreatureState,
): BattleRetiredExecutionScopeOwnership {
  return combatant.origin.kind === "statBlock"
    ? {
        kind: "statBlock",
        statBlockScopeRef: combatant.origin.execution.scopeRef,
      }
    : {
        kind: "character",
        characterScopeRef: combatant.origin.execution.scopeRef,
        attackScopeRef: battleAttackExecutionScopeRefForProcedureRef(
          combatant.origin.unarmedStrike.procedureRef,
        ),
        formScopeRefs: (
          combatant.origin.druidWildShapeAvailableForms ?? []
        ).map((form) => form.execution.scopeRef),
      };
}

export function removeBattleCombatants(input: {
  readonly state: BattleState;
  readonly combatantIds: readonly CombatantId[];
}): Result.Result<BattleState, BattleStateInitIssue> {
  const removeIds = combatantIdsWithPresentFindFamiliarDependents(
    input.state,
    input.combatantIds,
  );
  if (removeIds.size === 0) return Result.succeed(input.state);
  const removalIssue = combatantRemovalIssue(input.state, removeIds);
  if (removalIssue !== null) return battleStateInitIssue(removalIssue);
  const executionScopeCursors = new Map(input.state.executionScopeCursors);
  for (const id of removeIds) {
    const combatant = input.state.combatants.get(id);
    const allocation = executionScopeCursors.get(id);
    /* v8 ignore start -- @preserve -- BattleState invariant: every present combatant is initialized with one active execution-scope allocation at the same roster boundary. */
    if (combatant === undefined || allocation?.kind !== "active") {
      return battleStateInitIssue(
        "Cannot retire a combatant without an active execution-scope allocation.",
      );
    }
    /* v8 ignore stop -- @preserve */
    executionScopeCursors.set(id, {
      kind: "retired",
      nextScopeOrdinal: allocation.nextScopeOrdinal,
      ownership: retiredExecutionScopeOwnership(combatant),
    });
  }
  const currentRemoved = removeIds.has(currentActorId(input.state));
  const initiativeOption = removeFromInitiative(input.state.initiative, (id) =>
    removeIds.has(id),
  );
  /* v8 ignore start -- @preserve -- BattleState invariant: roster and Initiative contain the same combatants, and the all-combatants removal case is rejected above. */
  if (Option.isNone(initiativeOption)) {
    return battleStateInitIssue(
      "Cannot remove every combatant from Initiative.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const combatants = new Map(
    [...input.state.combatants]
      .filter(([id]) => !removeIds.has(id))
      .map(([id, combatant]) => [
        id,
        {
          ...combatant,
          activeEffects: combatant.activeEffects.flatMap((effect) =>
            removeIds.has(effect.sourceCombatantId)
              ? []
              : [
                  effect.kind === "magicSuppressionEmanation"
                    ? {
                        ...effect,
                        auraMembership: {
                          ...effect.auraMembership,
                          nonOriginCombatantIds:
                            effect.auraMembership.nonOriginCombatantIds.filter(
                              (id) => !removeIds.has(id),
                            ),
                        },
                      }
                    : effect,
                ],
          ),
        },
      ]),
  );
  return Result.succeed(
    normalizeBattleGrapples({
      ...input.state,
      initiative: initiativeOption.value,
      combatants,
      executionScopeCursors,
      companions: companionsAfterCombatantRemoval(input.state, removeIds),
      objectOutlines: input.state.objectOutlines.filter(
        (outline) =>
          !removeIds.has(outline.sourceCombatantId) &&
          !removeIds.has(outline.expiresAt.combatantId),
      ),
      lightEmitters: input.state.lightEmitters.filter(
        (emitter) =>
          !removeIds.has(emitter.sourceCombatantId) &&
          !(
            emitter.kind === "spellLightEmitter" &&
            emitter.attachment.kind === "combatant" &&
            removeIds.has(emitter.attachment.combatantId)
          ),
      ),
      currentTurnResources: currentRemoved
        ? resetBattleTurnResources(input.state.currentTurnResources)
        : input.state.currentTurnResources,
      subjectResolutionPhase:
        input.state.subjectResolutionPhase.kind === "subjectContinuation"
          ? { kind: "subjectSelection" }
          : input.state.subjectResolutionPhase,
      hidePrerequisites: new Map(
        [...input.state.hidePrerequisites].filter(([id, prerequisite]) =>
          hidePrerequisiteReferencedCombatantIds(id, prerequisite).every(
            (referencedId) => !removeIds.has(referencedId),
          ),
        ),
      ),
      readiedSpells: new Map(
        [...input.state.readiedSpells].filter(([id]) => !removeIds.has(id)),
      ),
      readiedResponses: new Map(
        [...input.state.readiedResponses].filter(([id]) => !removeIds.has(id)),
      ),
      helpAttacks: input.state.helpAttacks.filter(
        (help) =>
          !removeIds.has(help.helperId) &&
          !removeIds.has(help.allyId) &&
          !removeIds.has(help.targetEnemyId),
      ),
      grapples: input.state.grapples.filter(
        (grapple) =>
          !removeIds.has(grapple.grapplerId) &&
          !removeIds.has(grapple.targetId),
      ),
      interruptStack: [],
      legendaryActionWindow:
        input.state.legendaryActionWindow === null ||
        removeIds.has(input.state.legendaryActionWindow.afterTurnActorId)
          ? null
          : input.state.legendaryActionWindow,
    }),
  );
}

function combatantRemovalIssue(
  state: BattleState,
  removeIds: ReadonlySet<CombatantId>,
): string | null {
  for (const id of removeIds) {
    if (!state.combatants.has(id)) {
      return "Cannot remove a combatant that is not in this battle.";
    }
  }
  if (removeIds.size >= state.combatants.size) {
    return "Cannot remove every combatant from a battle.";
  }
  return null;
}

function hidePrerequisiteReferencedCombatantIds(
  combatantId: CombatantId,
  prerequisite: BattleHidePrerequisite,
): readonly CombatantId[] {
  return prerequisite.kind === "obscuredOnlyByCreatureOutOfEnemyLineOfSight"
    ? [combatantId, prerequisite.obscuringCreatureId]
    : [combatantId];
}

function combatantIdsWithPresentFindFamiliarDependents(
  state: BattleState,
  combatantIds: readonly CombatantId[],
): ReadonlySet<CombatantId> {
  const removeIds = new Set(combatantIds);
  for (const { companion } of battleCompanionEntries(state)) {
    if (companion.status === "present" && removeIds.has(companion.ownerId)) {
      removeIds.add(companion.combatantId);
    }
  }
  return removeIds;
}

function companionsAfterCombatantRemoval(
  state: BattleState,
  removeIds: ReadonlySet<CombatantId>,
): BattleState["companions"] {
  const retainedEntries: Array<readonly [CombatantId, BattleCompanionState]> =
    [];
  for (const { ownerId, companion } of battleCompanionEntries(state)) {
    if (removeIds.has(companion.ownerId)) continue;
    if (
      companion.status === "present" &&
      removeIds.has(companion.combatantId)
    ) {
      continue;
    }
    retainedEntries.push([ownerId, companion]);
  }
  return new Map(retainedEntries);
}
