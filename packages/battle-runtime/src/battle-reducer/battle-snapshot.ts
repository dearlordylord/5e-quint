import { canSpendBonusAction } from "@dnd/shared-algebras/action-economy-algebra";
import { initiativeOrder } from "@dnd/shared-algebras/initiative-algebra";
import { Match } from "effect";
import { type BattleInterruptTrigger } from "../battle-interrupt-triggers.ts";
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
import { discoverBattleActCandidates } from "./battle-discovery.ts";
import {
  INTERRUPT_DECISION_HOLE_ID,
  INTERRUPT_DECISION_HOLE_INSTANCE,
} from "./battle-runtime-protocol.ts";
import type {
  BattleInterruptFrame,
  BattleInterruptDecisionHole,
  BattleInterruptCheckpoint,
  BattleSnapshot,
  BattleState,
  BattleTurnSnapshot,
} from "../battle-state-execution.ts";

export function battleSnapshotProjection(state: BattleState): {
  readonly snapshot: BattleSnapshot;
} {
  const normalizedState = normalizeEarlyEndedOngoingFeatures(state);
  if (normalizedState !== state) {
    return battleSnapshotProjection(normalizedState);
  }
  const turnOrder = [...initiativeOrder(state.initiative)];
  const availableActs = discoverBattleActCandidates(state);
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
    turn: battleTurnSnapshot(state),
    readiedResponses: {
      spells: [...state.readiedSpells].map(([casterId, readiedSpell]) => ({
        casterId,
        ...readiedSpell,
      })),
      movements: [...state.readiedMovements].map(
        ([actorId, readiedMovement]) => ({
          actorId,
          ...readiedMovement,
        }),
      ),
    },
    helpAttackMarkers: state.helpAttacks,
    pendingInterrupt: pendingInterruptSnapshot(state),
  };
  return { snapshot };
}

export function snapshotBattle(state: BattleState): BattleSnapshot {
  return battleSnapshotProjection(state).snapshot;
}

export function battleTurnSnapshot(state: BattleState): BattleTurnSnapshot {
  const resources = state.currentTurnResources;
  return {
    actionResources: resources.actionResources,
    bonusActionAvailable: canSpendBonusAction(resources),
    jumpDistanceMultiplier: resources.jumpDistanceMultiplier,
    heightenedStepOfTheWindCarriedCreatures:
      resources.heightenedStepOfTheWindCarriedCreatures,
    spellSlotUsesThisTurn: resources.spellSlotUsesThisTurn,
    levelOnePlusSpellCastsThisTurn: resources.levelOnePlusSpellCastsThisTurn,
    quickenedLevelOnePlusSpellCastsThisTurn:
      resources.quickenedLevelOnePlusSpellCastsThisTurn,
    attackRollMadeThisTurn: resources.attackRollMadeThisTurn,
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
    ...(resources.lightWeaponAttackMade === undefined
      ? {}
      : { lightWeaponAttackMade: resources.lightWeaponAttackMade }),
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
