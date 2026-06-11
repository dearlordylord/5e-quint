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
  previousProjection: AdminSessionProjection | undefined,
): AdminMirrorPresentationTimelineEntry {
  const battle = envelope.projection.battle;
  const action = eventAction(previousProjection, envelope.projection);
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
      derivedOutcome: {
        actionDetail: action?.detail ?? null,
        actionSummary: action?.summary ?? null,
        pendingFillCount: currentPending.fills.length,
        resultTag: "needsHoles",
      },
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
      derivedOutcome: {
        actionDetail: action?.detail ?? null,
        actionSummary: action?.summary ?? null,
        hpChanges: changes,
        resultTag: "resolved",
      },
      eventKind: "resolvedBattleFills",
      nextBattle: battleSummary(projection),
      previousBattle: battleSummary(previousProjection),
    };
  }

  if (previousProjection?.battle === null && projection.battle !== null) {
    return {
      derivedInput: {},
      derivedOutcome: {
        actionDetail: action?.detail ?? null,
        actionSummary: action?.summary ?? null,
        resultTag: "resolved",
      },
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
      derivedOutcome: {
        actionDetail: action?.detail ?? null,
        actionSummary: action?.summary ?? null,
        resultTag: "resolved",
      },
      eventKind: "turnAdvanced",
      nextBattle: battleSummary(projection),
      previousBattle: battleSummary(previousProjection),
    };
  }

  return {
    derivedInput: {},
    derivedOutcome: {
      actionDetail: action?.detail ?? null,
      actionSummary: action?.summary ?? null,
      hpChanges: changes,
      resultTag: "projection",
    },
    eventKind: "projectionUpdated",
    nextBattle: battleSummary(projection),
    previousBattle: battleSummary(previousProjection),
  };
}

function eventAction(
  previousProjection: AdminSessionProjection | undefined,
  projection: AdminSessionProjection,
): EventAction | null {
  const currentPending = projection.session.transientBattleFills;
  if (currentPending !== null) return pendingAction(currentPending, projection);

  const previousPending = previousProjection?.session.transientBattleFills;
  if (
    previousProjection !== undefined &&
    previousPending !== undefined &&
    previousPending !== null
  ) {
    return resolvedAction(previousPending, previousProjection, projection);
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
): EventAction {
  const subject = recordOf(pending.subject);
  const actorId = stringField(subject, "actorId");
  const actor =
    actorId === null ? "Actor" : displayNameForCombatant(projection, actorId);
  const targetId = targetIdFromFills(pending.fills);
  const target =
    targetId === null ? null : displayNameForCombatant(projection, targetId);

  if (subject.tag === "action" && subject.action === "attack") {
    const attackName = stringField(subject, "attackName") ?? "Attack";
    if (hasFillKind(pending.fills, "attackRoll")) {
      return {
        detail:
          target === null
            ? `${actor} rolled ${attackName}.`
            : `${actor} rolled ${attackName} against ${target}.`,
        summary: `${actor} rolls ${attackName}`,
      };
    }
    return {
      detail:
        target === null
          ? `${actor} chose ${attackName}.`
          : `${actor} targeted ${target} with ${attackName}.`,
      summary:
        target === null
          ? `${actor} attacks with ${attackName}`
          : `${actor} targets ${target}`,
    };
  }

  if (subject.tag === "actionSpell") {
    const spell = spellName(subject);
    if (hasFillKind(pending.fills, "attackRoll")) {
      return {
        detail:
          target === null
            ? `${actor} rolled ${spell}.`
            : `${actor} rolled ${spell} against ${target}.`,
        summary: `${actor} rolls ${spell}`,
      };
    }
    return {
      detail:
        target === null
          ? `${actor} began casting ${spell}.`
          : `${actor} targeted ${target} with ${spell}.`,
      summary:
        target === null
          ? `${actor} casts ${spell}`
          : `${actor} targets ${target}`,
    };
  }

  if (subject.tag === "unitFeature") {
    const feature = unitFeatureName(stringField(subject, "unitId"));
    return {
      detail: `${actor} is resolving ${feature}.`,
      summary: `${actor} uses ${feature}`,
    };
  }

  return {
    detail: `Pending battle fills for ${String(subject.tag ?? "unknown subject")}.`,
    summary: "Battle action pending",
  };
}

function resolvedAction(
  pending: NonNullable<
    AdminSessionProjection["session"]["transientBattleFills"]
  >,
  previousProjection: AdminSessionProjection,
  projection: AdminSessionProjection,
): EventAction {
  const subject = recordOf(pending.subject);
  const actorId = stringField(subject, "actorId");
  const actor =
    actorId === null ? "Actor" : displayNameForCombatant(projection, actorId);
  const changes = hpChanges(previousProjection, projection);
  const targetId =
    targetIdFromFills(pending.fills) ?? changes[0]?.combatantId ?? null;
  const target =
    targetId === null ? null : displayNameForCombatant(projection, targetId);

  if (subject.tag === "action" && subject.action === "attack") {
    const attackName = stringField(subject, "attackName") ?? "Attack";
    if (changes.length === 0 && hasFillKind(pending.fills, "attackRoll")) {
      return {
        detail:
          target === null
            ? `${actor}'s ${attackName} missed.`
            : `${actor}'s ${attackName} missed ${target}.`,
        summary: `${actor} misses with ${attackName}`,
      };
    }
    return {
      detail:
        target === null
          ? `${actor}'s ${attackName} resolved.`
          : `${actor}'s ${attackName} hit ${target}.`,
      summary:
        target === null
          ? `${actor} resolves ${attackName}`
          : `${actor} hits ${target} with ${attackName}`,
    };
  }

  if (subject.tag === "actionSpell") {
    const spell = spellName(subject);
    return {
      detail:
        target === null
          ? `${actor} resolved ${spell}.`
          : `${actor} resolved ${spell} against ${target}.`,
      summary:
        target === null
          ? `${actor} casts ${spell}`
          : `${actor} casts ${spell} on ${target}`,
    };
  }

  if (subject.tag === "unitFeature") {
    const feature = unitFeatureName(stringField(subject, "unitId"));
    return {
      detail: `${actor} resolved ${feature}.`,
      summary: `${actor} uses ${feature}`,
    };
  }

  return {
    detail: `Resolved battle fills for ${String(subject.tag ?? "unknown subject")}.`,
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

function targetIdFromFills(fills: readonly unknown[]): string | null {
  for (const fill of fills) {
    const record = recordOf(fill);
    if (record.kind === "targetChoice") return stringField(record, "value");
    if (record.kind === "spellTargetAllocation") {
      const value = recordOf(record.value);
      const allocations = Array.isArray(value.allocations)
        ? value.allocations
        : [];
      return stringField(recordOf(allocations[0]), "targetId");
    }
  }
  return null;
}

function hasFillKind(fills: readonly unknown[], kind: string): boolean {
  return fills.some((fill) => recordOf(fill).kind === kind);
}

function spellName(subject: Readonly<Record<string, unknown>>): string {
  const invocation = recordOf(subject.invocation);
  return titleFromId(stringField(invocation, "spellId") ?? "spell");
}

function unitFeatureName(unitId: string | null): string {
  return titleFromId(unitId ?? "feature");
}

function titleFromId(value: string): string {
  return value
    .split("_")
    .filter((part) => part.length > 0)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}

function recordOf(value: unknown): Readonly<Record<string, unknown>> {
  return value !== null && typeof value === "object"
    ? (value as Readonly<Record<string, unknown>>)
    : {};
}

function stringField(
  value: Readonly<Record<string, unknown>>,
  key: string,
): string | null {
  const field = value[key];
  return typeof field === "string" ? field : null;
}
