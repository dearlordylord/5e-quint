import { canonicalJson } from "../transcript.ts";
import { createHash } from "node:crypto";
import { Match } from "effect";
import type { JsonValue } from "./continuation-contract.ts";
import { isJsonValue } from "./json-value.ts";
import type { SdkCallRecord } from "./sdk-transcript.ts";

export const PLAYER_TURN_PROJECTION_MAX_BYTES = 32 * 1024;
export const PLAYER_TACTICAL_NOTE_MAX_BYTES = 4 * 1024;

type JsonObject = { readonly [key: string]: JsonValue };

export type PlayerHoleOccurrence = {
  readonly ref: `hole:${string}`;
  readonly hole: PlayerHoleProjection;
};

export type PlayerHoleProjection = {
  readonly kind: string;
  readonly holeId: string;
  readonly holeInstanceKey: string;
  readonly label: string;
  readonly choices: readonly string[];
  readonly requiresTableSpatialFact?: boolean;
  readonly ability?: string;
  readonly critical?: boolean;
  readonly attackBonus?: number;
  readonly dc?: {
    readonly kind: string;
    readonly value?: number;
    readonly ability?: string;
  };
  readonly targetConstraint?: {
    readonly kind: string;
    readonly reachFeet?: number;
    readonly normalRangeFeet?: number;
    readonly longRangeFeet?: number;
  };
};

export type PlayerActProjection = {
  readonly ref: `subject:${string}`;
  readonly subject: PlayerSubjectProjection;
  readonly label?: string;
  readonly summary?: string;
  readonly holes: readonly PlayerHoleOccurrence[];
};

export type PlayerSubjectProjection = {
  readonly tag: string;
  readonly actorId: string;
  readonly action?: string;
  readonly command?: string;
  readonly procedureRef?: string;
  readonly attackAbility?: string;
  readonly attackDamageType?: string;
  readonly statBlockDamageNotation?: string;
  readonly speedKind?: string;
  readonly standardAction?: string;
  readonly mode?: { readonly tag: string; readonly trigger?: string };
};

export type PlayerCombatantProjection = {
  readonly hitPoints: {
    readonly current: number;
    readonly maximum: number;
    readonly temporary: number;
  };
  readonly activeConditions: readonly string[];
  readonly reactionAvailable: boolean;
  readonly movementSpentFeet: number;
  readonly ammunition: readonly {
    readonly kind: string;
    readonly remaining: number;
  }[];
  readonly resources: readonly {
    readonly ref: string;
    readonly usesRemaining: number;
    readonly usedThisTurn: boolean;
  }[];
  readonly spellSlots: readonly {
    readonly level: number;
    readonly remaining: number;
  }[];
};

export type PlayerObjectProjection = {
  readonly kind: string | null;
  readonly armorClass: number | null;
  readonly damageDisposition: {
    readonly kind: string;
    readonly hitPoints?: number;
    readonly damageThreshold?: number;
  } | null;
  readonly traversal: string | null;
  readonly sight: string | null;
  readonly interveningCover: string | null;
};

export type PlayerPositionProjection = {
  readonly x: number;
  readonly y: number;
  readonly elevationFeet?: number;
};

type PlayerEntityTransition<A> =
  | { readonly change: "added"; readonly after: A }
  | { readonly change: "removed"; readonly before: A }
  | { readonly change: "updated"; readonly before: A; readonly after: A };

export type PlayerEntityChange =
  | ({
      readonly kind: "combatant";
      readonly id: string;
    } & PlayerEntityTransition<PlayerCombatantProjection>)
  | ({
      readonly kind: "object";
      readonly id: string;
    } & PlayerEntityTransition<PlayerObjectProjection>)
  | ({
      readonly kind: "position";
      readonly id: string;
    } & PlayerEntityTransition<PlayerPositionProjection>);

export type PlayerCurrentTurnProjection = {
  readonly schemaVersion: 1;
  readonly continuation: number;
  readonly callSequences: readonly number[];
  readonly turn: {
    readonly round: number;
    readonly actorId?: string;
    readonly phase: string;
  };
  readonly frontier:
    | { readonly kind: "acts"; readonly acts: readonly PlayerActProjection[] }
    | {
        readonly kind: "holes";
        readonly subjectRef: `subject:${string}`;
        readonly subject: PlayerSubjectProjection;
        readonly holes: readonly PlayerHoleOccurrence[];
      }
    | { readonly kind: "none" };
  readonly changes: readonly PlayerEntityChange[];
};

export type PlayerProjectionResult =
  | {
      readonly tag: "valid";
      readonly projection: PlayerCurrentTurnProjection;
      readonly encodedByteLength: number;
    }
  | {
      readonly tag: "invalid";
      readonly reason:
        | "projectionTooLarge"
        | "tacticalNoteTooLarge"
        | "malformedProjectionSource";
      readonly byteLength: number;
      readonly maximumByteLength: number;
      readonly message: string;
    };

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function objectAt(
  value: JsonValue,
  keys: readonly string[],
): JsonObject | undefined {
  let cursor: JsonValue | undefined = value;
  for (const key of keys) {
    if (!isJsonObject(cursor)) return undefined;
    cursor = cursor[key];
  }
  return isJsonObject(cursor) ? cursor : undefined;
}

function mapEntries(
  value: JsonValue | undefined,
): readonly [string, JsonValue][] | undefined {
  if (!isJsonObject(value) || !Array.isArray(value.$map)) return undefined;
  const entries = value.$map.map((entry): [string, JsonValue] | undefined =>
    Array.isArray(entry) &&
    typeof entry[0] === "string" &&
    entry[1] !== undefined
      ? [entry[0], entry[1]]
      : undefined,
  );
  return entries.some((entry) => entry === undefined)
    ? undefined
    : (entries as readonly [string, JsonValue][]);
}

function requiredNumber(value: JsonValue | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function requiredBoolean(value: JsonValue | undefined): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function resourceProjection(
  value: JsonValue | undefined,
): PlayerCombatantProjection["resources"] | undefined {
  if (!Array.isArray(value)) return undefined;
  const projected = value.map((entry) => {
    if (!isJsonObject(entry)) return undefined;
    const ref =
      typeof entry.resourcePoolRef === "string"
        ? entry.resourcePoolRef
        : undefined;
    const usesRemaining = requiredNumber(entry.usesRemaining);
    const usedThisTurn = requiredBoolean(entry.usedThisTurn);
    return ref === undefined ||
      usesRemaining === undefined ||
      usedThisTurn === undefined
      ? undefined
      : { ref, usesRemaining, usedThisTurn };
  });
  return projected.some((entry) => entry === undefined)
    ? undefined
    : (projected as PlayerCombatantProjection["resources"]);
}

function ammunitionProjection(
  value: JsonValue | undefined,
): PlayerCombatantProjection["ammunition"] | undefined {
  if (!Array.isArray(value)) return undefined;
  const projected = value.map((entry) =>
    isJsonObject(entry) &&
    typeof entry.ammunition === "string" &&
    requiredNumber(entry.remaining) !== undefined
      ? { kind: entry.ammunition, remaining: entry.remaining as number }
      : undefined,
  );
  return projected.some((entry) => entry === undefined)
    ? undefined
    : (projected as PlayerCombatantProjection["ammunition"]);
}

function slotProjection(
  value: JsonValue | undefined,
): PlayerCombatantProjection["spellSlots"] | undefined {
  if (!Array.isArray(value)) return undefined;
  const projected = value.map((entry) => {
    if (!isJsonObject(entry)) return undefined;
    const level = requiredNumber(entry.level ?? entry.slotLevel);
    const remaining = requiredNumber(entry.remaining ?? entry.slotsRemaining);
    return level === undefined || remaining === undefined
      ? undefined
      : { level, remaining };
  });
  return projected.some((entry) => entry === undefined)
    ? undefined
    : (projected as PlayerCombatantProjection["spellSlots"]);
}

function combatantProjection(
  value: JsonValue,
): PlayerCombatantProjection | undefined {
  if (!isJsonObject(value)) return undefined;
  const conditions = isJsonObject(value.conditions)
    ? Object.values(value.conditions).every(
        (active) => typeof active === "boolean",
      )
      ? Object.entries(value.conditions)
          .filter(([, active]) => active === true)
          .map(([condition]) => condition)
          .sort()
      : null
    : null;
  const origin = isJsonObject(value.origin) ? value.origin : undefined;
  const execution = isJsonObject(origin?.execution)
    ? origin.execution
    : undefined;
  const spellcasting = isJsonObject(origin?.spellcasting)
    ? origin.spellcasting
    : undefined;
  const malformedSpellcasting =
    origin?.spellcasting !== undefined && spellcasting === undefined;
  const current = requiredNumber(value.hp);
  const maximum = requiredNumber(value.maxHp);
  const temporary = requiredNumber(value.tempHp);
  const reactionAvailable = requiredBoolean(value.reactionAvailable);
  const movementSpentFeet = requiredNumber(value.movementSpentFeet);
  const ammunition = ammunitionProjection(value.ammunitionStocks);
  const originKind = typeof origin?.kind === "string" ? origin.kind : undefined;
  const resources = resourceProjection(
    originKind === "character"
      ? origin?.resources
      : originKind === "statBlock"
        ? execution?.resourcePools
        : undefined,
  );
  const spellSlots =
    originKind === "character"
      ? spellcasting === undefined
        ? []
        : slotProjection(spellcasting.spellSlots)
      : originKind === "statBlock"
        ? []
        : undefined;
  if (
    current === undefined ||
    maximum === undefined ||
    temporary === undefined ||
    !Array.isArray(conditions) ||
    reactionAvailable === undefined ||
    movementSpentFeet === undefined ||
    ammunition === undefined ||
    malformedSpellcasting ||
    resources === undefined ||
    spellSlots === undefined
  )
    return undefined;
  void execution;
  return {
    hitPoints: { current, maximum, temporary },
    activeConditions: conditions,
    reactionAvailable,
    movementSpentFeet,
    ammunition,
    resources,
    spellSlots,
  };
}

function combatants(
  session: JsonValue,
): ReadonlyMap<string, PlayerCombatantProjection> | undefined {
  const state = objectAt(session, ["battle", "state"]);
  if (state === undefined) return undefined;
  const stateCombatants = mapEntries(state.combatants);
  if (stateCombatants === undefined) return undefined;
  const entries = stateCombatants.map(
    ([id, value]) => [id, combatantProjection(value)] as const,
  );
  return entries.some(([, value]) => value === undefined)
    ? undefined
    : new Map(
        entries as readonly (readonly [string, PlayerCombatantProjection])[],
      );
}

function objects(
  session: JsonValue,
): ReadonlyMap<string, JsonValue> | undefined {
  const state = objectAt(session, ["battle", "state"]);
  const battlefield = objectAt(session, ["battlefield"]);
  const groundObjects = mapEntries(state?.groundObjects);
  if (groundObjects === undefined || !Array.isArray(battlefield?.objects))
    return undefined;
  const scenarioObjects = battlefield.objects.map(
    (value): [string, JsonValue] | undefined =>
      isJsonObject(value) && typeof value.objectId === "string"
        ? [value.objectId, value]
        : undefined,
  );
  return scenarioObjects.some((entry) => entry === undefined)
    ? undefined
    : new Map([
        ...groundObjects,
        ...(scenarioObjects as readonly [string, JsonValue][]),
      ]);
}

function scalarString(value: JsonValue | undefined): string | null | undefined {
  return value === null ? null : typeof value === "string" ? value : undefined;
}

function objectProjection(
  value: JsonValue,
): PlayerObjectProjection | undefined {
  if (!isJsonObject(value)) return undefined;
  const kind = scalarString(value.kind ?? null);
  const armorClass =
    value.armorClass === null || value.armorClass === undefined
      ? null
      : requiredNumber(value.armorClass);
  const damageDisposition = (() => {
    if (
      value.damageDisposition === null ||
      value.damageDisposition === undefined
    )
      return null;
    if (
      !isJsonObject(value.damageDisposition) ||
      typeof value.damageDisposition.kind !== "string"
    )
      return undefined;
    const hitPoints =
      value.damageDisposition.hitPoints === undefined
        ? undefined
        : requiredNumber(value.damageDisposition.hitPoints);
    const damageThreshold =
      value.damageDisposition.damageThreshold === undefined
        ? undefined
        : requiredNumber(value.damageDisposition.damageThreshold);
    if (
      (value.damageDisposition.hitPoints !== undefined &&
        hitPoints === undefined) ||
      (value.damageDisposition.damageThreshold !== undefined &&
        damageThreshold === undefined)
    )
      return undefined;
    return {
      kind: value.damageDisposition.kind,
      ...(hitPoints === undefined ? {} : { hitPoints }),
      ...(damageThreshold === undefined ? {} : { damageThreshold }),
    };
  })();
  const traversal = scalarString(value.traversal ?? null);
  const sight = scalarString(value.sight ?? null);
  const interveningCover = scalarString(value.interveningCover ?? null);
  if (
    [
      kind,
      armorClass,
      damageDisposition,
      traversal,
      sight,
      interveningCover,
    ].some((entry) => entry === undefined)
  )
    return undefined;
  return {
    kind: kind as string | null,
    armorClass: armorClass as number | null,
    damageDisposition:
      damageDisposition as PlayerObjectProjection["damageDisposition"],
    traversal: traversal as string | null,
    sight: sight as string | null,
    interveningCover: interveningCover as string | null,
  };
}

function positions(
  session: JsonValue,
): ReadonlyMap<string, PlayerPositionProjection> | undefined {
  const space = objectAt(session, ["battlefield", "space"]);
  if (space === undefined) return undefined;
  if (!Array.isArray(space.placements)) return undefined;
  const placements = space.placements;
  const entries = placements.map((value) => {
    if (
      !isJsonObject(value) ||
      typeof value.token !== "string" ||
      !isJsonObject(value.coordinate)
    )
      return undefined;
    const x = requiredNumber(value.coordinate.x);
    const y = requiredNumber(value.coordinate.y);
    const elevationFeet =
      value.coordinate.elevationFeet === undefined
        ? undefined
        : requiredNumber(value.coordinate.elevationFeet);
    return x === undefined ||
      y === undefined ||
      (value.coordinate.elevationFeet !== undefined &&
        elevationFeet === undefined)
      ? undefined
      : ([
          value.token,
          { x, y, ...(elevationFeet === undefined ? {} : { elevationFeet }) },
        ] as const);
  });
  return entries.some((entry) => entry === undefined)
    ? undefined
    : new Map(
        entries as readonly (readonly [string, PlayerPositionProjection])[],
      );
}

function changesFor<A>(
  before: ReadonlyMap<string, A>,
  after: ReadonlyMap<string, A>,
  change: (input: {
    readonly id: string;
    readonly transition: PlayerEntityTransition<A>;
  }) => PlayerEntityChange,
): readonly PlayerEntityChange[] {
  return [...new Set([...before.keys(), ...after.keys()])]
    .sort()
    .flatMap((id): readonly PlayerEntityChange[] => {
      const previous = before.get(id);
      const next = after.get(id);
      if (previous === undefined && next === undefined) return [];
      if (canonicalJson(previous ?? null) === canonicalJson(next ?? null))
        return [];
      if (previous === undefined) {
        return next === undefined
          ? []
          : [change({ id, transition: { change: "added", after: next } })];
      }
      const transition: PlayerEntityTransition<A> =
        next === undefined
          ? { change: "removed", before: previous }
          : { change: "updated", before: previous, after: next };
      return [
        change({
          id,
          transition,
        }),
      ];
    });
}

function stableRef(
  prefix: "hole" | "subject",
  value: unknown,
): `hole:${string}` | `subject:${string}` {
  return `${prefix}:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

export function projectPlayerSubject(
  value: unknown,
): PlayerSubjectProjection | undefined {
  if (
    !isJsonObject(value) ||
    typeof value.tag !== "string" ||
    typeof value.actorId !== "string"
  )
    return undefined;
  const optionalFields = [
    "action",
    "command",
    "procedureRef",
    "attackAbility",
    "attackDamageType",
    "statBlockDamageNotation",
    "speedKind",
    "standardAction",
  ] as const;
  if (
    optionalFields.some(
      (field) => value[field] !== undefined && typeof value[field] !== "string",
    )
  )
    return undefined;
  const mode =
    value.mode === undefined
      ? undefined
      : isJsonObject(value.mode) &&
          typeof value.mode.tag === "string" &&
          (value.mode.trigger === undefined ||
            typeof value.mode.trigger === "string")
        ? {
            tag: value.mode.tag,
            ...(typeof value.mode.trigger === "string"
              ? { trigger: value.mode.trigger }
              : {}),
          }
        : undefined;
  if (value.mode !== undefined && mode === undefined) return undefined;
  return {
    tag: value.tag,
    actorId: value.actorId,
    ...(typeof value.action === "string" ? { action: value.action } : {}),
    ...(typeof value.command === "string" ? { command: value.command } : {}),
    ...(typeof value.procedureRef === "string"
      ? { procedureRef: value.procedureRef }
      : {}),
    ...(typeof value.attackAbility === "string"
      ? { attackAbility: value.attackAbility }
      : {}),
    ...(typeof value.attackDamageType === "string"
      ? { attackDamageType: value.attackDamageType }
      : {}),
    ...(typeof value.statBlockDamageNotation === "string"
      ? { statBlockDamageNotation: value.statBlockDamageNotation }
      : {}),
    ...(typeof value.speedKind === "string"
      ? { speedKind: value.speedKind }
      : {}),
    ...(typeof value.standardAction === "string"
      ? { standardAction: value.standardAction }
      : {}),
    ...(mode === undefined ? {} : { mode }),
  };
}

function decodeHole(value: unknown): PlayerHoleProjection | undefined {
  if (
    !isJsonObject(value) ||
    typeof value.kind !== "string" ||
    typeof value.holeId !== "string" ||
    typeof value.holeInstanceKey !== "string" ||
    typeof value.label !== "string"
  )
    return undefined;
  if (!Array.isArray(value.choices)) return undefined;
  const choices = value.choices.map((choice) =>
    typeof choice === "string"
      ? choice
      : isJsonObject(choice) && typeof choice.kind === "string"
        ? `kind:${choice.kind}`
        : undefined,
  );
  if (choices.some((choice) => choice === undefined)) return undefined;
  const dcValue = isJsonObject(value.dc) ? value.dc : undefined;
  const dc =
    dcValue === undefined
      ? undefined
      : typeof dcValue.kind === "string" &&
          (dcValue.value === undefined || typeof dcValue.value === "number") &&
          (dcValue.dc === undefined || typeof dcValue.dc === "number") &&
          (dcValue.ability === undefined || typeof dcValue.ability === "string")
        ? {
            kind: dcValue.kind,
            ...(typeof (dcValue.value ?? dcValue.dc) === "number"
              ? { value: (dcValue.value ?? dcValue.dc) as number }
              : {}),
            ...(typeof dcValue.ability === "string"
              ? { ability: dcValue.ability }
              : {}),
          }
        : undefined;
  if (dcValue !== undefined && dc === undefined) return undefined;
  const attack = isJsonObject(value.attack) ? value.attack : undefined;
  const constraint = isJsonObject(attack?.targetConstraint)
    ? attack.targetConstraint
    : undefined;
  const targetConstraint =
    constraint === undefined
      ? undefined
      : typeof constraint.kind === "string" &&
          (constraint.reachFeet === undefined ||
            typeof constraint.reachFeet === "number")
        ? {
            kind: constraint.kind,
            ...(typeof constraint.reachFeet === "number"
              ? { reachFeet: constraint.reachFeet }
              : {}),
            ...(isJsonObject(constraint.rangeFeet) &&
            typeof constraint.rangeFeet.normal === "number"
              ? { normalRangeFeet: constraint.rangeFeet.normal }
              : {}),
            ...(isJsonObject(constraint.rangeFeet) &&
            typeof constraint.rangeFeet.long === "number"
              ? { longRangeFeet: constraint.rangeFeet.long }
              : {}),
          }
        : undefined;
  if (constraint !== undefined && targetConstraint === undefined)
    return undefined;
  return {
    kind: value.kind,
    holeId: value.holeId,
    holeInstanceKey: value.holeInstanceKey,
    label: value.label,
    choices: choices as readonly string[],
    ...(typeof value.requiresTableSpatialFact === "boolean"
      ? { requiresTableSpatialFact: value.requiresTableSpatialFact }
      : {}),
    ...(typeof value.ability === "string" ? { ability: value.ability } : {}),
    ...(typeof value.critical === "boolean"
      ? { critical: value.critical }
      : {}),
    ...(typeof value.attackBonus === "number"
      ? { attackBonus: value.attackBonus }
      : {}),
    ...(dc === undefined ? {} : { dc }),
    ...(targetConstraint === undefined ? {} : { targetConstraint }),
  };
}

function holeOccurrences(
  subject: PlayerSubjectProjection,
  value: JsonValue | undefined,
): readonly PlayerHoleOccurrence[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const decoded = value.map(decodeHole);
  return decoded.some((hole) => hole === undefined)
    ? undefined
    : (decoded as readonly PlayerHoleProjection[]).map((hole) => ({
        ref: stableRef("hole", {
          subject,
          kind: hole.kind,
          holeId: hole.holeId,
          holeInstanceKey: hole.holeInstanceKey,
        }) as `hole:${string}`,
        hole,
      }));
}

function acts(call: SdkCallRecord): readonly PlayerActProjection[] | undefined {
  if (call.outcome !== "returned" || !Array.isArray(call.result))
    return undefined;
  const projected = call.result.map(
    (value): PlayerActProjection | undefined => {
      if (!isJsonObject(value) || value.subject === undefined) return undefined;
      const subject = projectPlayerSubject(value.subject);
      if (subject === undefined) return undefined;
      const projectedHoles = holeOccurrences(subject, value.initialHoles);
      if (projectedHoles === undefined) return undefined;
      return {
        ref: stableRef("subject", subject) as `subject:${string}`,
        subject,
        ...(typeof value.label === "string" ? { label: value.label } : {}),
        ...(typeof value.summary === "string"
          ? { summary: value.summary }
          : {}),
        holes: projectedHoles,
      };
    },
  );
  return projected.some((value) => value === undefined)
    ? undefined
    : (projected as readonly PlayerActProjection[]);
}

function frontier(
  calls: readonly SdkCallRecord[],
): PlayerCurrentTurnProjection["frontier"] | undefined {
  type FrontierDecision =
    | {
        readonly tag: "frontier";
        readonly frontier: PlayerCurrentTurnProjection["frontier"];
      }
    | { readonly tag: "ignore" }
    | { readonly tag: "invalid" };
  const resolutionFrontier = (
    call: Extract<SdkCallRecord, { readonly outcome: "returned" }>,
  ): FrontierDecision => {
    if (isJsonObject(call.result) && call.result.tag === "needsHoles") {
      if (call.result.subject === undefined) return { tag: "invalid" };
      const subject = projectPlayerSubject(call.result.subject);
      if (subject === undefined) return { tag: "invalid" };
      const projectedHoles = holeOccurrences(subject, call.result.holes);
      if (projectedHoles === undefined) return { tag: "invalid" };
      return {
        tag: "frontier",
        frontier: {
          kind: "holes",
          subjectRef: stableRef("subject", subject) as `subject:${string}`,
          subject,
          holes: projectedHoles,
        },
      };
    }
    return { tag: "frontier", frontier: { kind: "none" } };
  };
  for (const call of [...calls].reverse()) {
    if (call.outcome !== "returned") continue;
    const returnedCall: Extract<
      SdkCallRecord,
      { readonly outcome: "returned" }
    > = call;
    const decision = Match.value(returnedCall.operation).pipe(
      Match.when("scenarioRelation", () => ({ tag: "ignore" as const })),
      Match.when("discoverBattleActs", () => {
        const projectedActs = acts(returnedCall);
        return projectedActs === undefined
          ? ({ tag: "invalid" } as const)
          : ({
              tag: "frontier",
              frontier: { kind: "acts", acts: projectedActs },
            } as const);
      }),
      Match.when("resolveScenarioMovement", () =>
        resolutionFrontier(returnedCall),
      ),
      Match.when("resolveBattleRuntimeSubject", () =>
        resolutionFrontier(returnedCall),
      ),
      Match.when("resolveBattleRuntimeInterrupt", () =>
        resolutionFrontier(returnedCall),
      ),
      Match.when("endBattleRuntimeTurn", () =>
        resolutionFrontier(returnedCall),
      ),
      Match.exhaustive,
    );
    if (decision.tag === "invalid") return undefined;
    if (decision.tag === "frontier") return decision.frontier;
  }
  return { kind: "none" };
}

export function reprojectSdkTranscriptTurns(calls: readonly SdkCallRecord[]):
  | {
      readonly tag: "valid";
      readonly projections: readonly PlayerCurrentTurnProjection[];
      readonly encodedByteLength: number;
    }
  | Exclude<PlayerProjectionResult, { readonly tag: "valid" }> {
  const byContinuation = calls.reduce((groups, call) => {
    const previous = groups.get(call.continuation) ?? [];
    groups.set(call.continuation, [...previous, call]);
    return groups;
  }, new Map<number, readonly SdkCallRecord[]>());
  const projections: PlayerCurrentTurnProjection[] = [];
  for (const [continuation, continuationCalls] of [
    ...byContinuation.entries(),
  ].sort(([left], [right]) => left - right)) {
    const first = continuationCalls[0];
    if (first === undefined || !isJsonValue(first.inputSession)) {
      return {
        tag: "invalid",
        reason: "projectionTooLarge",
        byteLength: 0,
        maximumByteLength: PLAYER_TURN_PROJECTION_MAX_BYTES,
        message: `Continuation ${continuation} has no JSON input session.`,
      };
    }
    const lastReturned = [...continuationCalls]
      .reverse()
      .find((call) => call.outcome === "returned");
    const afterSession =
      lastReturned?.outcome === "returned" &&
      isJsonValue(lastReturned.outputSession)
        ? lastReturned.outputSession
        : first.inputSession;
    const projected = playerCurrentTurnProjection({
      continuation,
      calls: continuationCalls,
      beforeSession: first.inputSession,
      afterSession,
      tacticalNote: "",
    });
    if (projected.tag === "invalid") return projected;
    projections.push(projected.projection);
  }
  return {
    tag: "valid",
    projections,
    encodedByteLength: projections.reduce(
      (total, projection) =>
        total + Buffer.byteLength(JSON.stringify(projection)),
      0,
    ),
  };
}

function turn(
  session: JsonValue,
): PlayerCurrentTurnProjection["turn"] | undefined {
  const state = objectAt(session, ["battle", "state"]);
  const initiative = isJsonObject(state?.initiative)
    ? state.initiative
    : undefined;
  const stillToAct = initiative?.stillToAct;
  if (
    !Array.isArray(stillToAct) ||
    !stillToAct.every(
      (entry): entry is JsonObject & { readonly creature: string } =>
        isJsonObject(entry) && typeof entry.creature === "string",
    )
  )
    return undefined;
  const next = stillToAct[0];
  const phase = state?.subjectResolutionPhase;
  if (
    typeof initiative?.round !== "number" ||
    !isJsonObject(phase) ||
    typeof phase.kind !== "string"
  )
    return undefined;
  return {
    round: initiative.round,
    ...(next === undefined ? {} : { actorId: next.creature }),
    phase: phase.kind,
  };
}

export function playerCurrentTurnProjection(input: {
  readonly continuation: number;
  readonly calls: readonly SdkCallRecord[];
  readonly beforeSession: JsonValue;
  readonly afterSession: JsonValue;
  readonly tacticalNote: string;
}): PlayerProjectionResult {
  const tacticalNoteBytes = Buffer.byteLength(input.tacticalNote, "utf8");
  if (tacticalNoteBytes > PLAYER_TACTICAL_NOTE_MAX_BYTES) {
    return {
      tag: "invalid",
      reason: "tacticalNoteTooLarge",
      byteLength: tacticalNoteBytes,
      maximumByteLength: PLAYER_TACTICAL_NOTE_MAX_BYTES,
      message: `Tactical note is ${tacticalNoteBytes} bytes; maximum is ${PLAYER_TACTICAL_NOTE_MAX_BYTES}.`,
    };
  }
  const projectedTurn = turn(input.afterSession);
  const projectedFrontier = frontier(input.calls);
  const beforeCombatants = combatants(input.beforeSession);
  const afterCombatants = combatants(input.afterSession);
  const beforePositions = positions(input.beforeSession);
  const afterPositions = positions(input.afterSession);
  const beforeObjectValues = objects(input.beforeSession);
  const afterObjectValues = objects(input.afterSession);
  const beforeObjects = [...(beforeObjectValues ?? [])].map(
    ([id, value]) => [id, objectProjection(value)] as const,
  );
  const afterObjects = [...(afterObjectValues ?? [])].map(
    ([id, value]) => [id, objectProjection(value)] as const,
  );
  if (
    projectedTurn === undefined ||
    projectedFrontier === undefined ||
    beforeCombatants === undefined ||
    afterCombatants === undefined ||
    beforePositions === undefined ||
    afterPositions === undefined ||
    beforeObjectValues === undefined ||
    afterObjectValues === undefined ||
    beforeObjects.some(([, value]) => value === undefined) ||
    afterObjects.some(([, value]) => value === undefined)
  ) {
    return {
      tag: "invalid",
      reason: "malformedProjectionSource",
      byteLength: 0,
      maximumByteLength: PLAYER_TURN_PROJECTION_MAX_BYTES,
      message:
        "The canonical session/result cannot be projected into the typed player turn contract.",
    };
  }
  const projection: PlayerCurrentTurnProjection = {
    schemaVersion: 1,
    continuation: input.continuation,
    callSequences: input.calls.map(({ seq }) => seq),
    turn: projectedTurn,
    frontier: projectedFrontier,
    changes: [
      ...changesFor(beforeCombatants, afterCombatants, (change) => ({
        kind: "combatant",
        id: change.id,
        ...change.transition,
      })),
      ...changesFor(
        new Map(
          beforeObjects as readonly (readonly [
            string,
            PlayerObjectProjection,
          ])[],
        ),
        new Map(
          afterObjects as readonly (readonly [
            string,
            PlayerObjectProjection,
          ])[],
        ),
        (change) => ({
          kind: "object",
          id: change.id,
          ...change.transition,
        }),
      ),
      ...changesFor(beforePositions, afterPositions, (change) => ({
        kind: "position",
        id: change.id,
        ...change.transition,
      })),
    ],
  };
  const encodedByteLength = Buffer.byteLength(
    JSON.stringify(projection),
    "utf8",
  );
  return encodedByteLength <= PLAYER_TURN_PROJECTION_MAX_BYTES
    ? { tag: "valid", projection, encodedByteLength }
    : {
        tag: "invalid",
        reason: "projectionTooLarge",
        byteLength: encodedByteLength,
        maximumByteLength: PLAYER_TURN_PROJECTION_MAX_BYTES,
        message: `Current-turn projection is ${encodedByteLength} bytes; maximum is ${PLAYER_TURN_PROJECTION_MAX_BYTES}.`,
      };
}
