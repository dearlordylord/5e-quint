import { optionalProperty } from "../optional-property.ts";
import { canSpendBonusAction } from "@dnd/shared-algebras/action-economy-algebra";
import { initiativeOrder } from "@dnd/shared-algebras/initiative-algebra";
import { Match } from "effect";
import { type BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
import type {
  BattleReadyResponse,
  BattleReadyResponseSnapshot,
  BattleSubject,
} from "../battle-subjects.ts";
import type { BattleCompanionSnapshot } from "../companion-state.ts";
import { battleCompanionEntries } from "../find-familiar-state.ts";
import { CombatantId, battleReplayStackDepth } from "../identity.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import {
  combatantSnapshot,
  normalizeEarlyEndedOngoingFeatures,
} from "./creature-state-execution.ts";
import {
  battleLightEmitters,
  battleObscurementZones,
} from "./spells-holes-fills.ts";
import {
  discoverBattleActCandidatesWithExecutionRegistry,
  discoverBattleActCandidatesWithoutSpellProcedures,
} from "./battle-discovery.ts";
import { battleSubjectBeginsBonusAction } from "./action-eligibility.ts";
import type { SpellProcedureExecutionRegistry } from "./spell-procedure-profiles/execution-registry.ts";
import {
  INTERRUPT_DECISION_HOLE_ID,
  INTERRUPT_DECISION_HOLE_INSTANCE,
} from "./battle-runtime-protocol.ts";
import type {
  BattleInterruptFrame,
  BattleInterruptDecisionHole,
  BattleInterruptCheckpoint,
  BattleHole,
  BattleSnapshot,
  BattleState,
  BattleTurnSnapshot,
} from "../battle-state-execution.ts";

export function battleSnapshotProjection(state: BattleState): {
  readonly snapshot: BattleSnapshot;
} {
  return battleSnapshotProjectionFromActs(
    state,
    discoverBattleActCandidatesWithoutSpellProcedures,
  );
}

export function battleSnapshotProjectionWithExecutionRegistry(
  state: BattleState,
  executionRegistry: SpellProcedureExecutionRegistry,
): { readonly snapshot: BattleSnapshot } {
  return battleSnapshotProjectionFromActs(state, (snapshotState) =>
    discoverBattleActCandidatesWithExecutionRegistry(
      snapshotState,
      executionRegistry,
    ),
  );
}

function battleSnapshotProjectionFromActs(
  state: BattleState,
  discoverActs: (state: BattleState) => readonly {
    readonly subject: BattleSubject;
    readonly initialHoles: readonly BattleHole[];
  }[],
): { readonly snapshot: BattleSnapshot } {
  const normalizedState = normalizeEarlyEndedOngoingFeatures(state);
  if (normalizedState !== state) {
    return battleSnapshotProjectionFromActs(normalizedState, discoverActs);
  }
  const turnOrder = [...initiativeOrder(state.initiative)];
  const availableActs = discoverActs(state);
  const executionScopeCursorEntries = [...state.executionScopeCursors];

  const snapshot: BattleSnapshot = {
    battleId: state.battleId,
    executionScopeCursors: executionScopeCursorEntries.flatMap(
      ([combatantId, allocation]) =>
        allocation.kind === "active"
          ? [{ combatantId, nextScopeOrdinal: allocation.nextScopeOrdinal }]
          : [],
    ),
    retiredExecutionScopeAllocations: executionScopeCursorEntries.flatMap(
      ([combatantId, allocation]) =>
        allocation.kind === "retired"
          ? [
              {
                combatantId,
                nextScopeOrdinal: allocation.nextScopeOrdinal,
                ownership: allocation.ownership,
              },
            ]
          : [],
    ),
    round: state.initiative.round,
    currentActorId: currentActorId(state),
    turnOrder,
    combatants: turnOrder.flatMap((id) => {
      const combatant = state.combatants.get(id);
      return combatant == null ? [] : [combatantSnapshot(state, combatant)];
    }),
    companions: battleCompanionEntries(state).flatMap(
      (entry): readonly BattleCompanionSnapshot[] => {
        if (entry.companion.status === "dismissedForever") {
          // The dismissedForever tombstone exists only for settlement; it is not
          // a live companion, so it is not part of the read-model snapshot.
          return [];
        }
        if (entry.companion.status !== "present") {
          return [entry.companion];
        }
        const { combatantId, ...snapshotCompanion } = entry.companion;
        return [
          {
            ...snapshotCompanion,
            companionId: combatantId,
            resolvedStatBlockId: requirePresentFamiliarCombatantStatBlockId(
              state,
              combatantId,
            ),
            initiative: requirePresentFamiliarCombatantInitiative(
              state,
              combatantId,
            ),
          },
        ];
      },
    ),
    lightEmitters: battleLightEmitters(state),
    obscurementZones: battleObscurementZones(state),
    acts: availableActs.map(({ subject, initialHoles }) => ({
      subject,
      initialHoles,
    })),
    turn: battleTurnSnapshot(state, availableActs),
    readiedResponses: {
      spells: [...state.readiedSpells].map(([casterId, readiedSpell]) => ({
        casterId,
        ...readiedSpell,
      })),
      actionsOrMovements: [...state.readiedResponses].map(
        ([actorId, readiedResponse]) => ({
          actorId,
          trigger: readiedResponse.trigger,
          response: readyResponseSnapshot(readiedResponse.response),
          expiresAt: readiedResponse.expiresAt,
        }),
      ),
    },
    helpAttackMarkers: state.helpAttacks,
    pendingInterrupt: pendingInterruptSnapshot(state),
  };
  return { snapshot };
}

function readyResponseSnapshot(
  response: BattleReadyResponse,
): BattleReadyResponseSnapshot {
  return Match.value(response).pipe(
    Match.discriminatorsExhaustive("kind")({
      movement: () => ({ kind: "movement" as const }),
      attack: ({ selection }) => ({
        kind: "attack" as const,
        procedureRef: selection.procedureRef,
      }),
      action: ({ subject }) => ({ kind: "action" as const, subject }),
    }),
  );
}

export function snapshotBattle(state: BattleState): BattleSnapshot {
  return battleSnapshotProjection(state).snapshot;
}

export function snapshotBattleWithExecutionRegistry(
  state: BattleState,
  executionRegistry: SpellProcedureExecutionRegistry,
): BattleSnapshot {
  return battleSnapshotProjectionWithExecutionRegistry(state, executionRegistry)
    .snapshot;
}

export function battleTurnSnapshot(
  state: BattleState,
  availableActs: readonly { readonly subject: BattleSubject }[],
): BattleTurnSnapshot {
  const resources = state.currentTurnResources;
  return {
    actionResources: resources.actionResources,
    bonusActionAvailable:
      canSpendBonusAction(resources) &&
      availableActs.some(({ subject }) =>
        battleSubjectBeginsBonusAction(state, subject),
      ),
    jumpDistanceMultiplier: resources.jumpDistanceMultiplier,
    heightenedStepOfTheWindCarriedCreatures:
      resources.heightenedStepOfTheWindCarriedCreatures,
    spellSlotUsesThisTurn: resources.spellSlotUsesThisTurn,
    levelOnePlusSpellCastsThisTurn: resources.levelOnePlusSpellCastsThisTurn,
    quickenedLevelOnePlusSpellCastsThisTurn:
      resources.quickenedLevelOnePlusSpellCastsThisTurn,
    attackRollMadeThisTurn: resources.attackRollMadeThisTurn,
    brutalStrikeChosenThisTurn: resources.brutalStrike.kind !== "available",
    attackDamageRidersUsedThisTurn: resources.attackDamageRidersUsedThisTurn,
    stunningStrikesUsedThisTurn: resources.stunningStrikesUsedThisTurn,
    recklessAttackWhileRagingUsedThisTurn:
      resources.recklessAttackWhileRagingUsedThisTurn,
    weaponDamageDiceRollChoicesUsedThisTurn:
      resources.weaponDamageDiceRollChoicesUsedThisTurn,
    weaponMasteryCleaveAttackersUsedThisTurn:
      resources.weaponMasteryCleaveAttackersUsedThisTurn,
    huntersPreyHordeBreakerUsedThisTurn:
      resources.huntersPreyHordeBreakerUsedThisTurn,
    grapplerPunchAndGrabUsedThisTurn:
      resources.grapplerPunchAndGrabUsedThisTurn,
    ...optionalProperty(
      "lightWeaponAttackMade",
      resources.lightWeaponAttackMade,
    ),
    dashMovementBonusFeet: resources.dashMovementBonusFeet,
    disengaged: resources.disengaged,
  };
}

function requirePresentFamiliarCombatantInitiative(
  state: BattleState,
  familiarId: CombatantId,
): Extract<
  BattleCompanionSnapshot,
  { readonly status: "present" }
>["initiative"] {
  const combatant = state.combatants.get(familiarId);
  if (combatant === undefined) {
    throw new Error("Present Find Familiar snapshot requires a combatant.");
  }
  return combatant.initiative;
}

function requirePresentFamiliarCombatantStatBlockId(
  state: BattleState,
  familiarId: CombatantId,
): Extract<
  BattleCompanionSnapshot,
  { readonly status: "present" }
>["resolvedStatBlockId"] {
  const combatant = state.combatants.get(familiarId);
  if (combatant?.origin.kind !== "statBlock") {
    throw new Error(
      "Present Find Familiar snapshot requires a Stat Block combatant.",
    );
  }
  return combatant.origin.statBlockId;
}

export function pendingInterruptSnapshot(
  state: BattleState,
): BattleSnapshot["pendingInterrupt"] {
  const frame = currentInterruptCheckpoint(state);
  return frame === null
    ? null
    : {
        trigger: frame.trigger,
        decisionHole: interruptDecisionHole(frame),
        choices: frame.choices,
        stackDepth: battleReplayStackDepth(state.interruptStack.length),
      };
}

export function currentInterruptFrame(
  state: BattleState,
): BattleInterruptFrame | null {
  return state.interruptStack[state.interruptStack.length - 1] ?? null;
}

export function currentInterruptCheckpoint(
  state: BattleState,
): BattleInterruptCheckpoint | null {
  const frame = currentInterruptFrame(state);
  return frame?.kind === "interruptCheckpoint" ? frame.frame : null;
}

export function interruptDecisionHole(
  frame: BattleInterruptCheckpoint,
): BattleInterruptDecisionHole {
  return {
    holeInstanceKey: INTERRUPT_DECISION_HOLE_INSTANCE,
    holeId: INTERRUPT_DECISION_HOLE_ID,
    kind: "interruptDecision",
    label: `${interruptTriggerLabel(frame.trigger)} interrupt decision`,
    trigger: frame.trigger,
    eligibleResponders: unofferedEligibleResponders(frame),
  };
}

export function interruptTriggerLabel(trigger: BattleInterruptTrigger): string {
  return Match.value(trigger).pipe(
    Match.when("attackHit", () => "Attack hit"),
    Match.when("attackDamage", () => "Attack damage"),
    Match.when("spellCast", () => "Spell cast"),
    Match.when("saveFailed", () => "Failed save"),
    Match.when("afterDamage", () => "After damage"),
    Match.when("creatureFalls", () => "Creature falls"),
    Match.when("opportunityAttack", () => "Opportunity Attack"),
    Match.when("reportedReadyTrigger", () => "Reported Ready trigger"),
    Match.exhaustive,
  );
}

export function unofferedEligibleResponders(
  frame: BattleInterruptCheckpoint,
): readonly CombatantId[] {
  const offered = new Set(frame.offeredResponders);
  return frame.eligibleResponders.filter(
    (reactorId) => !offered.has(reactorId),
  );
}
