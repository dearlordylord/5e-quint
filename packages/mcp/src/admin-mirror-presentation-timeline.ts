import type {
  AdminMirrorBattleHpChange,
  AdminMirrorEventDebug,
  AdminMirrorPresentationTimelineEntry,
  AdminMirrorProjectionEnvelope,
  AdminSessionProjection,
} from "./admin-mirror-contract.ts";
type EventAction = {
  readonly detail: string;
  readonly summary: string;
};

export function createAdminMirrorPresentationTimelineEntry(
  envelope: AdminMirrorProjectionEnvelope,
  receivedAtEpochMs: number,
  previousEnvelope: AdminMirrorProjectionEnvelope | undefined,
): AdminMirrorPresentationTimelineEntry {
  const battle = envelope.projection.battle;
  const previousProjection = previousEnvelope?.projection;
  const action = eventAction(previousEnvelope, envelope);
  const changes = hpChanges(previousProjection, envelope.projection);
  return {
    actionDetail: action?.detail ?? null,
    actionSummary: action?.summary ?? null,
    battleId: battle?.battleId ?? null,
    battleRound: battle?.round ?? null,
    characterCount: envelope.projection.characters.length,
    currentActorDisplayName: currentActorDisplayName(envelope.projection),
    currentActorId: battle?.currentActorId ?? null,
    debug: eventDebug(previousProjection, envelope.projection, action, changes),
    draftCount: envelope.projection.session.draftIds.length,
    hpChanges: changes,
    mirrorSessionId: envelope.mirrorSessionId,
    publisherInstanceId: envelope.publisherInstanceId,
    receivedAtEpochMs,
    sequence: envelope.sequence,
    sourceProcessId: envelope.sourceProcessId,
  };
}

function eventDebug(
  previousProjection: AdminSessionProjection | undefined,
  projection: AdminSessionProjection,
  action: EventAction | null,
  changes: readonly AdminMirrorBattleHpChange[],
): AdminMirrorEventDebug | null {
  const currentPending = projection.session.transientBattleFills;
  if (currentPending !== null) {
    return {
      derivedInput: {
        fills: currentPending.fills,
        subject: currentPending.subject,
      },
      derivedOutcome: eventDerivedOutcome(action, {
        pendingFillCount: currentPending.fills.length,
        resultTag: "needsHoles",
      }),
      eventKind: "pendingBattleFills",
      nextBattle: battleSummary(projection),
      previousBattle: battleSummary(previousProjection),
    };
  }

  const previousPending = previousProjection?.session.transientBattleFills;
  if (
    previousProjection !== undefined &&
    previousPending !== undefined &&
    previousPending !== null
  ) {
    return {
      derivedInput: {
        fills: previousPending.fills,
        subject: previousPending.subject,
      },
      derivedOutcome: eventDerivedOutcome(action, {
        hpChanges: changes,
        resultTag: "resolved",
      }),
      eventKind: "resolvedBattleFills",
      nextBattle: battleSummary(projection),
      previousBattle: battleSummary(previousProjection),
    };
  }

  if (previousProjection?.battle === null && projection.battle !== null) {
    return {
      derivedInput: {},
      derivedOutcome: eventDerivedOutcome(action, {
        resultTag: "resolved",
      }),
      eventKind: "battleStarted",
      nextBattle: battleSummary(projection),
      previousBattle: null,
    };
  }

  if (
    previousProjection?.battle !== undefined &&
    previousProjection.battle !== null &&
    projection.battle !== null &&
    previousProjection.battle.currentActorId !==
      projection.battle.currentActorId
  ) {
    return {
      derivedInput: {
        actorId: previousProjection.battle.currentActorId,
        command: "endTurn",
        subject: {
          actorId: previousProjection.battle.currentActorId,
          command: "endTurn",
          tag: "runtimeCommand",
        },
      },
      derivedOutcome: eventDerivedOutcome(action, {
        resultTag: "resolved",
      }),
      eventKind: "turnAdvanced",
      nextBattle: battleSummary(projection),
      previousBattle: battleSummary(previousProjection),
    };
  }

  return {
    derivedInput: {},
    derivedOutcome: eventDerivedOutcome(action, {
      hpChanges: changes,
      resultTag: "projection",
    }),
    eventKind: "projectionUpdated",
    nextBattle: battleSummary(projection),
    previousBattle: battleSummary(previousProjection),
  };
}

function eventDerivedOutcome(
  action: EventAction | null,
  outcome: Record<string, unknown>,
): Record<string, unknown> {
  return {
    actionDetail: action?.detail ?? null,
    actionSummary: action?.summary ?? null,
    ...outcome,
  };
}

function eventAction(
  previousEnvelope: AdminMirrorProjectionEnvelope | undefined,
  envelope: AdminMirrorProjectionEnvelope,
): EventAction | null {
  const previousProjection = previousEnvelope?.projection;
  const projection = envelope.projection;
  const currentPending = projection.session.transientBattleFills;
  if (currentPending !== null) {
    return pendingAction(currentPending, projection);
  }

  const previousPending = previousProjection?.session.transientBattleFills;
  if (
    previousProjection !== undefined &&
    previousPending !== undefined &&
    previousPending !== null
  ) {
    return resolvedAction(previousPending, projection);
  }

  if (previousProjection?.battle === null && projection.battle !== null) {
    const actor = currentActorDisplayName(projection) ?? "current actor";
    return {
      detail: `${projection.battle.battleId} started in round ${projection.battle.round}.`,
      summary: `Battle started: ${actor}'s turn`,
    };
  }

  if (
    previousProjection?.battle !== undefined &&
    previousProjection.battle !== null &&
    projection.battle !== null &&
    previousProjection.battle.currentActorId !==
      projection.battle.currentActorId
  ) {
    const actor =
      currentActorDisplayName(projection) ?? projection.battle.currentActorId;
    return {
      detail: `Turn advanced from ${previousProjection.battle.currentActorId} to ${projection.battle.currentActorId}.`,
      summary: `Round ${projection.battle.round}: ${actor}'s turn`,
    };
  }

  return null;
}

function pendingAction(
  pending: NonNullable<
    AdminSessionProjection["session"]["transientBattleFills"]
  >,
  projection: AdminSessionProjection,
): EventAction | null {
  const subject = pending.subject;
  const actor = displayNameForCombatant(projection, subject.actorId);
  return {
    detail: `${actor} is resolving ${subject.tag}.`,
    summary: "Battle action pending",
  };
}

function resolvedAction(
  pending: NonNullable<
    AdminSessionProjection["session"]["transientBattleFills"]
  >,
  projection: AdminSessionProjection,
): EventAction | null {
  const subject = pending.subject;
  const actor = displayNameForCombatant(projection, subject.actorId);
  return {
    detail: `${actor} resolved ${subject.tag}.`,
    summary: "Battle action resolved",
  };
}

function currentActorDisplayName(
  projection: AdminSessionProjection,
): string | null {
  const currentActorId = projection.battle?.currentActorId;
  if (currentActorId === undefined) return null;
  return displayNameForCombatant(projection, currentActorId);
}

function hpChanges(
  previousProjection: AdminSessionProjection | undefined,
  projection: AdminSessionProjection,
): readonly AdminMirrorBattleHpChange[] {
  if (
    previousProjection?.battle === undefined ||
    previousProjection.battle === null ||
    projection.battle === null
  ) {
    return [];
  }
  const previousCombatants = new Map(
    previousProjection.battle.combatants.map((combatant) => [
      combatant.combatantId,
      combatant,
    ]),
  );
  return projection.battle.combatants.flatMap((combatant) => {
    const previous = previousCombatants.get(combatant.combatantId);
    if (previous === undefined || previous.hp === combatant.hp) return [];
    return [
      {
        combatantId: combatant.combatantId,
        displayName: combatant.displayName,
        maxHp: combatant.maxHp,
        nextHp: combatant.hp,
        previousHp: previous.hp,
      },
    ];
  });
}

function displayNameForCombatant(
  projection: AdminSessionProjection,
  combatantId: string,
): string {
  return (
    projection.battle?.combatants.find(
      (combatant) => combatant.combatantId === combatantId,
    )?.displayName ?? combatantId
  );
}

function battleSummary(
  projection: AdminSessionProjection | undefined,
): Record<string, unknown> | null {
  const battle = projection?.battle;
  if (battle === undefined || battle === null) return null;
  return {
    battleId: battle.battleId,
    combatants: battle.combatants.map((combatant) => ({
      combatantId: combatant.combatantId,
      conditions: combatant.conditions,
      displayName: combatant.displayName,
      hp: combatant.hp,
      maxHp: combatant.maxHp,
      tempHp: combatant.tempHp,
    })),
    currentActorId: battle.currentActorId,
    pendingInterrupt: battle.pendingInterrupt,
    round: battle.round,
    turnOrder: battle.turnOrder,
  };
}
