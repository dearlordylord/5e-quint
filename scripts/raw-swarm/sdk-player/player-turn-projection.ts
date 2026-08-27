import { canonicalJson } from "../transcript.ts";
import { createHash } from "node:crypto";
import { Either, Match, Schema } from "effect";
import {
  BattleHoleSchema,
  BattleInterruptDecisionFrontierSchema,
} from "../../../packages/battle-runtime/src/battle-reducer/battle-codecs.ts";
import {
  BattleId,
  BattleObjectId,
  BattleResourcePoolExecutionRef,
} from "../../../packages/battle-runtime/src/identity.ts";
import {
  BATTLE_INVALID_REASON_CODES,
  type BattleHole,
  type BattleInvalidReasonCode,
} from "../../../packages/battle-runtime/src/battle-state-execution.ts";
import {
  Hp,
  ResourceCount,
  type ReadonlyNonEmptyArray,
} from "../../../packages/shared/src/types.ts";
import {
  CreatureRechargeMinimumRollSchema,
  PointPoolResourceSchema,
  UseCountResourceSchema,
} from "../../../packages/surface/src/surface/schema.ts";
import type { JsonValue } from "./continuation-contract.ts";
import { isJsonValue, jsonValue } from "./json-value.ts";
import {
  battleEnvelopeMatchesSessionIdentity,
  type SdkCallRecord,
} from "./sdk-transcript.ts";

export const PLAYER_TURN_PROJECTION_MAX_BYTES = 32 * 1024;
export const PLAYER_TACTICAL_NOTE_MAX_BYTES = 4 * 1024;

type JsonObject = { readonly [key: string]: JsonValue };

const PLAYER_SCENARIO_SESSION_CONFLICT_TAGS = [
  "battle-lineage-conflict",
  "unknown-object-damage",
  "object-damage-state-conflict",
  "unexpected-battle-movement",
  "movement-outcome-conflict",
  "multiple-battle-movements",
] as const;
type PlayerScenarioSessionConflictTag =
  (typeof PLAYER_SCENARIO_SESSION_CONFLICT_TAGS)[number];

type PlayerScenarioSessionConflictIssue =
  | {
      readonly tag: "battle-lineage-conflict";
      readonly expectedBattleId: BattleId;
      readonly receivedBattleId: BattleId;
      readonly message: string;
    }
  | {
      readonly tag: "unknown-object-damage";
      readonly objectId: BattleObjectId;
      readonly message: string;
    }
  | {
      readonly tag: "object-damage-state-conflict";
      readonly objectId: BattleObjectId;
      readonly outcomePriorHitPoints: Hp;
      readonly message: string;
    }
  | {
      readonly tag:
        | "unexpected-battle-movement"
        | "movement-outcome-conflict"
        | "multiple-battle-movements";
      readonly message: string;
    };

const PLAYER_REJECTION_TAGS = [
  "invalid",
  "scenarioMovementRejected",
  "scenarioSessionConflict",
] as const;
type PlayerRejectionTag = (typeof PLAYER_REJECTION_TAGS)[number];

export type PlayerRejectionProjection =
  | {
      readonly tag: "invalid";
      readonly reason: BattleInvalidReasonCode;
      readonly message: string;
    }
  | {
      readonly tag: "scenarioMovementRejected";
      readonly message: string;
    }
  | {
      readonly tag: "scenarioSessionConflict";
      readonly issue: PlayerScenarioSessionConflictIssue;
    };

const PLAYER_SUBJECT_TAGS = [
  "action",
  "pactOfTheChainFamiliarAttack",
  "bonusAction",
  "bonusActionStandardAction",
  "monkFocusOption",
  "monkFocusFlurryOfBlowsStrike",
  "actionSpell",
  "bonusActionSpell",
  "bonusActionDashSpell",
  "unitFeature",
  "unitFeatureHeldWeaponActivation",
  "druidWildShape",
  "companionLifecycle",
  "findFamiliarSharedSenses",
  "findFamiliarTouchSpell",
  "runtimeCommand",
] as const;
type PlayerSubjectTag = (typeof PLAYER_SUBJECT_TAGS)[number];
const PLAYER_SUBJECT_TAG_SET: ReadonlySet<string> = new Set(
  PLAYER_SUBJECT_TAGS,
);

function isPlayerSubjectTag(value: unknown): value is PlayerSubjectTag {
  return typeof value === "string" && PLAYER_SUBJECT_TAG_SET.has(value);
}

export type PlayerHoleOccurrence = {
  readonly ref: `hole:${string}`;
  readonly hole: PlayerHoleProjection;
};

export type PlayerHoleProjection = BattleHole;

const PLAYER_HOLE_ADMISSION = {
  readyDeclaration: true,
  helpAttackAllyDecision: true,
  helpAttackEnemyDecision: true,
  damageRelationshipDecisions: true,
  targetSpatialFacts: true,
  slowSomaticSpellFailureOutcome: true,
  objectTargetChoice: true,
  targetChoice: true,
  objectContactTargets: true,
  savingThrowOutcome: true,
  objectDropResolution: true,
  spellAreaChoice: true,
  teleportDestination: true,
  spiritualWeaponForcePosition: true,
  heldObjectFacts: true,
  toolPossessionFacts: true,
  cunningStrikeEndTurnCoverFacts: true,
  findFamiliarConnection: true,
  companionReappearancePlacement: true,
  companionReappearanceInitiative: true,
  magicWeaponTargetItem: true,
  damageTypeChoice: true,
  spellTargetAllocation: true,
  spellTargetList: true,
  attackRoll: true,
  rolledDice: true,
  skillChoice: true,
  abilityChoice: true,
  targetAbilityChoices: true,
  conditionChoice: true,
  thaumaturgyActiveOneMinuteEffectCount: true,
  commandOptionChoice: true,
  selfTransformationModeChoice: true,
  dancingLightsPlacement: true,
  gustOfWindLineDirectionChoice: true,
  movableZoneRamMovement: true,
  movableZoneRepositionMovement: true,
  unitFeatureDecision: true,
  hitPointHealingDistribution: true,
  deathSavingThrow: true,
  statBlockRechargeRoll: true,
  concentrationSavingThrow: true,
  interruptDecision: true,
  movement: true,
  levitateAltitudeChange: true,
  levitateInitialRise: true,
  abilityCheck: true,
  spellcastingAbilityCheck: true,
  grappleOutcome: true,
  shoveOutcome: true,
  sanctuaryInterdictionOutcome: true,
  attackDamageDisposition: true,
  ongoingSpellTargetChoice: true,
  wildShapeEquipmentDisposition: true,
} as const satisfies Record<BattleHole["kind"], true>;

const CharacterResourceStateSchema = Schema.Struct({
  resourcePoolRef: BattleResourcePoolExecutionRef,
  resource: Schema.Union(UseCountResourceSchema, PointPoolResourceSchema),
  usesRemaining: Schema.optionalWith(ResourceCount, { exact: true }),
  usedThisTurn: Schema.optionalWith(Schema.Boolean, { exact: true }),
  pointsRemaining: Schema.optionalWith(ResourceCount, { exact: true }),
});

const StatBlockResourceStateSchema = Schema.Union(
  Schema.Struct({
    resourcePoolRef: BattleResourcePoolExecutionRef,
    kind: Schema.Literal("daily"),
    usesMax: ResourceCount,
    usesRemaining: ResourceCount,
  }),
  Schema.Struct({
    resourcePoolRef: BattleResourcePoolExecutionRef,
    kind: Schema.Literal("recharge"),
    minimumRoll: CreatureRechargeMinimumRollSchema,
    available: Schema.Boolean,
  }),
  Schema.Struct({
    resourcePoolRef: BattleResourcePoolExecutionRef,
    kind: Schema.Literal("recharge_after_rest"),
    available: Schema.Boolean,
  }),
  Schema.Struct({
    resourcePoolRef: BattleResourcePoolExecutionRef,
    kind: Schema.Literal("legendaryActions"),
    usesMax: ResourceCount,
    usesRemaining: ResourceCount,
  }),
);

export type PlayerActProjection = {
  readonly ref: `subject:${string}`;
  readonly subject: PlayerSubjectProjection;
  readonly label?: string;
  readonly summary?: string;
  readonly holes: readonly PlayerHoleOccurrence[];
};

type PlayerSubjectProjectionMode = {
  readonly tag: string;
  readonly trigger?: string;
};

type PlayerSubjectProjectionCommon = {
  readonly actorId: string;
  readonly procedureRef?: string;
  readonly attackAbility?: string;
  readonly attackDamageType?: string;
  readonly statBlockDamageNotation?: string;
  readonly speedKind?: string;
  readonly standardAction?: string;
};

export type PlayerSubjectProjection =
  | (PlayerSubjectProjectionCommon & {
      readonly tag:
        | "action"
        | "bonusAction"
        | "bonusActionStandardAction"
        | "druidWildShape"
        | "companionLifecycle";
      readonly action: string;
    })
  | (PlayerSubjectProjectionCommon & {
      readonly tag: "runtimeCommand";
      readonly command: string;
    })
  | (PlayerSubjectProjectionCommon & {
      readonly tag:
        | "actionSpell"
        | "bonusActionSpell"
        | "bonusActionDashSpell"
        | "findFamiliarTouchSpell";
      readonly mode: PlayerSubjectProjectionMode;
    })
  | (PlayerSubjectProjectionCommon & {
      readonly tag: "monkFocusOption";
      readonly mode?: PlayerSubjectProjectionMode;
    })
  | (PlayerSubjectProjectionCommon & {
      readonly tag:
        | "pactOfTheChainFamiliarAttack"
        | "monkFocusFlurryOfBlowsStrike"
        | "unitFeature"
        | "unitFeatureHeldWeaponActivation"
        | "findFamiliarSharedSenses";
    });

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
  readonly resources: readonly PlayerCombatantResourceProjection[];
  readonly spellSlots: readonly {
    readonly level: number;
    readonly remaining: number;
  }[];
  readonly zeroHitPointLifecycle:
    | { readonly policy: "diesAtZeroHp" }
    | {
        readonly policy: "usesDeathSavingThrows";
        readonly successes: number;
        readonly failures: number;
        readonly stable: boolean;
        readonly dead: boolean;
        readonly hitPointsRegained: boolean;
      };
};

export type PlayerCombatantResourceProjection =
  | {
      readonly ref: string;
      readonly usage: "unlimited";
      readonly usedThisTurn: boolean;
    }
  | {
      readonly ref: string;
      readonly usage: "limited";
      readonly usesRemaining: number;
      readonly usedThisTurn: boolean;
    }
  | {
      readonly ref: string;
      readonly usage: "pointPool";
      readonly pointsRemaining: number;
    }
  | {
      readonly ref: string;
      readonly kind: "daily" | "legendaryActions";
      readonly usesMax: number;
      readonly usesRemaining: number;
    }
  | {
      readonly ref: string;
      readonly kind: "recharge";
      readonly minimumRoll: number;
      readonly available: boolean;
    }
  | {
      readonly ref: string;
      readonly kind: "recharge_after_rest";
      readonly available: boolean;
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
    readonly actorId: string;
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
    | PlayerInterruptDecisionProjection
    | {
        readonly kind: "rejected";
        readonly rejection: PlayerRejectionProjection;
      };
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
      readonly reason: "projectionTooLarge" | "tacticalNoteTooLarge";
      readonly byteLength: number;
      readonly maximumByteLength: number;
      readonly message: string;
    }
  | {
      readonly tag: "invalid";
      readonly reason: "malformedProjectionSource";
      readonly message: string;
    };

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPlayerScenarioSessionConflictTag(
  value: string,
): value is PlayerScenarioSessionConflictTag {
  return PLAYER_SCENARIO_SESSION_CONFLICT_TAGS.some((tag) => tag === value);
}

function isPlayerRejectionTag(value: string): value is PlayerRejectionTag {
  return PLAYER_REJECTION_TAGS.some((tag) => tag === value);
}

function scenarioSessionConflictIssue(
  value: JsonValue | undefined,
): PlayerScenarioSessionConflictIssue | undefined {
  if (
    !isJsonObject(value) ||
    typeof value.tag !== "string" ||
    !isPlayerScenarioSessionConflictTag(value.tag) ||
    typeof value.message !== "string"
  )
    return undefined;
  const message = value.message;
  return Match.value(value.tag).pipe(
    Match.when("battle-lineage-conflict", () =>
      Schema.is(BattleId)(value.expectedBattleId) &&
      Schema.is(BattleId)(value.receivedBattleId)
        ? {
            tag: "battle-lineage-conflict" as const,
            expectedBattleId: value.expectedBattleId,
            receivedBattleId: value.receivedBattleId,
            message,
          }
        : undefined,
    ),
    Match.when("unknown-object-damage", () =>
      Schema.is(BattleObjectId)(value.objectId)
        ? {
            tag: "unknown-object-damage" as const,
            objectId: value.objectId,
            message,
          }
        : undefined,
    ),
    Match.when("object-damage-state-conflict", () =>
      Schema.is(BattleObjectId)(value.objectId) &&
      typeof value.outcomePriorHitPoints === "number" &&
      Hp.is(value.outcomePriorHitPoints)
        ? {
            tag: "object-damage-state-conflict" as const,
            objectId: value.objectId,
            outcomePriorHitPoints: value.outcomePriorHitPoints,
            message,
          }
        : undefined,
    ),
    Match.when("unexpected-battle-movement", () => ({
      tag: "unexpected-battle-movement" as const,
      message,
    })),
    Match.when("movement-outcome-conflict", () => ({
      tag: "movement-outcome-conflict" as const,
      message,
    })),
    Match.when("multiple-battle-movements", () => ({
      tag: "multiple-battle-movements" as const,
      message,
    })),
    Match.exhaustive,
  );
}

export function playerRejectionProjection(
  value: unknown,
): PlayerRejectionProjection | undefined {
  if (
    !isJsonObject(value) ||
    typeof value.tag !== "string" ||
    !isPlayerRejectionTag(value.tag)
  ) {
    return undefined;
  }
  return Match.value(value.tag).pipe(
    Match.when("invalid", () => {
      const reason = BATTLE_INVALID_REASON_CODES.find(
        (candidate): candidate is BattleInvalidReasonCode =>
          candidate === value.reason,
      );
      return reason === undefined || typeof value.message !== "string"
        ? undefined
        : { tag: "invalid" as const, reason, message: value.message };
    }),
    Match.when("scenarioMovementRejected", () =>
      typeof value.message === "string"
        ? {
            tag: "scenarioMovementRejected" as const,
            message: value.message,
          }
        : undefined,
    ),
    Match.when("scenarioSessionConflict", () => {
      const issue = scenarioSessionConflictIssue(value.issue);
      return issue === undefined
        ? undefined
        : { tag: "scenarioSessionConflict" as const, issue };
    }),
    Match.exhaustive,
  );
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
  const entries: [string, JsonValue][] = [];
  for (const entry of value.$map) {
    if (
      !Array.isArray(entry) ||
      typeof entry[0] !== "string" ||
      entry[1] === undefined
    )
      return undefined;
    entries.push([entry[0], entry[1]]);
  }
  return entries;
}

function requiredNumber(value: JsonValue | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function requiredBoolean(value: JsonValue | undefined): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function characterResourceProjection(
  value: JsonValue | undefined,
): PlayerCombatantProjection["resources"] | undefined {
  if (!Array.isArray(value)) return undefined;
  const projected: PlayerCombatantProjection["resources"][number][] = [];
  for (const encodedEntry of value) {
    const decodedEntry = Schema.decodeUnknownEither(
      CharacterResourceStateSchema,
      { onExcessProperty: "error" },
    )(encodedEntry);
    if (Either.isLeft(decodedEntry)) return undefined;
    const entry = decodedEntry.right;
    const ref = entry.resourcePoolRef;
    const resource = entry.resource;
    const projection = Match.value(resource.kind).pipe(
      Match.when("use_count", () => {
        if (entry.pointsRemaining !== undefined) return undefined;
        const cap = resource.cap;
        const usedThisTurn = entry.usedThisTurn;
        if (usedThisTurn === undefined) return undefined;
        if (cap.kind === "unlimited") {
          if (entry.usesRemaining !== undefined) return undefined;
          return { ref, usage: "unlimited", usedThisTurn } as const;
        }
        const usesRemaining = entry.usesRemaining;
        return usesRemaining === undefined
          ? undefined
          : ({ ref, usage: "limited", usesRemaining, usedThisTurn } as const);
      }),
      Match.when("point_pool", () => {
        if (
          entry.usedThisTurn !== undefined ||
          entry.usesRemaining !== undefined
        )
          return undefined;
        const pointsRemaining = entry.pointsRemaining;
        return pointsRemaining === undefined
          ? undefined
          : ({ ref, usage: "pointPool", pointsRemaining } as const);
      }),
      Match.exhaustive,
    );
    if (projection === undefined) return undefined;
    projected.push(projection);
  }
  return new Set(projected.map(({ ref }) => ref)).size === projected.length
    ? projected
    : undefined;
}

function statBlockResourceProjection(
  value: JsonValue | undefined,
): PlayerCombatantProjection["resources"] | undefined {
  if (!Array.isArray(value)) return undefined;
  const projected: PlayerCombatantProjection["resources"][number][] = [];
  for (const encodedEntry of value) {
    const decodedEntry = Schema.decodeUnknownEither(
      StatBlockResourceStateSchema,
      { onExcessProperty: "error" },
    )(encodedEntry);
    if (Either.isLeft(decodedEntry)) return undefined;
    const entry = decodedEntry.right;
    const ref = entry.resourcePoolRef;
    const projection = Match.value(entry).pipe(
      Match.when({ kind: "daily" }, (entry) => {
        const { usesMax, usesRemaining } = entry;
        if (usesRemaining > usesMax) return undefined;
        return { ref, kind: "daily", usesMax, usesRemaining } as const;
      }),
      Match.when({ kind: "legendaryActions" }, (entry) => {
        const { usesMax, usesRemaining } = entry;
        if (usesRemaining > usesMax) return undefined;
        return {
          ref,
          kind: "legendaryActions",
          usesMax,
          usesRemaining,
        } as const;
      }),
      Match.when({ kind: "recharge" }, (entry) => {
        const { minimumRoll, available } = entry;
        return { ref, kind: "recharge", minimumRoll, available } as const;
      }),
      Match.when({ kind: "recharge_after_rest" }, (entry) => {
        const { available } = entry;
        return { ref, kind: "recharge_after_rest", available } as const;
      }),
      Match.exhaustive,
    );
    if (projection === undefined) return undefined;
    projected.push(projection);
  }
  return new Set(projected.map(({ ref }) => ref)).size === projected.length
    ? projected
    : undefined;
}

function ammunitionProjection(
  value: JsonValue | undefined,
): PlayerCombatantProjection["ammunition"] | undefined {
  if (!Array.isArray(value)) return undefined;
  const projected: PlayerCombatantProjection["ammunition"][number][] = [];
  for (const entry of value) {
    if (!isJsonObject(entry) || typeof entry.ammunition !== "string")
      return undefined;
    const remaining = requiredNumber(entry.remaining);
    if (remaining === undefined) return undefined;
    projected.push({ kind: entry.ammunition, remaining });
  }
  return projected;
}

function slotProjection(
  value: JsonValue | undefined,
): PlayerCombatantProjection["spellSlots"] | undefined {
  if (!Array.isArray(value)) return undefined;
  const projected: PlayerCombatantProjection["spellSlots"][number][] = [];
  for (const entry of value) {
    if (!isJsonObject(entry)) return undefined;
    const level = requiredNumber(entry.level ?? entry.slotLevel);
    const remaining = requiredNumber(entry.remaining ?? entry.slotsRemaining);
    if (level === undefined || remaining === undefined) return undefined;
    projected.push({ level, remaining });
  }
  return projected;
}

function zeroHitPointLifecycleProjection(
  value: JsonValue | undefined,
): PlayerCombatantProjection["zeroHitPointLifecycle"] | undefined {
  if (!isJsonObject(value)) return undefined;
  if (value.policy === "diesAtZeroHp") return { policy: "diesAtZeroHp" };
  if (value.policy !== "usesDeathSavingThrows") return undefined;
  const deathSaves = isJsonObject(value.deathSaves)
    ? value.deathSaves
    : undefined;
  const saves = isJsonObject(deathSaves?.deathSaves)
    ? deathSaves.deathSaves
    : undefined;
  const successes = requiredNumber(saves?.successes);
  const failures = requiredNumber(saves?.failures);
  const stable = requiredBoolean(deathSaves?.stable);
  const dead = requiredBoolean(deathSaves?.dead);
  const hitPointsRegained = requiredBoolean(deathSaves?.hpRegained);
  return successes === undefined ||
    failures === undefined ||
    stable === undefined ||
    dead === undefined ||
    hitPointsRegained === undefined
    ? undefined
    : {
        policy: "usesDeathSavingThrows",
        successes,
        failures,
        stable,
        dead,
        hitPointsRegained,
      };
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
  const zeroHitPointLifecycle = zeroHitPointLifecycleProjection(
    value.zeroHpLifecycle,
  );
  const ammunition = ammunitionProjection(value.ammunitionStocks);
  const originKind = typeof origin?.kind === "string" ? origin.kind : undefined;
  const resources =
    originKind === "character"
      ? characterResourceProjection(origin?.resources)
      : originKind === "statBlock"
        ? statBlockResourceProjection(execution?.resourcePools)
        : undefined;
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
    zeroHitPointLifecycle === undefined ||
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
    zeroHitPointLifecycle,
  };
}

function combatants(
  session: JsonValue,
): ReadonlyMap<string, PlayerCombatantProjection> | undefined {
  const state = objectAt(session, ["battle", "state"]);
  if (state === undefined) return undefined;
  const stateCombatants = mapEntries(state.combatants);
  if (stateCombatants === undefined) return undefined;
  const entries: [string, PlayerCombatantProjection][] = [];
  for (const [id, value] of stateCombatants) {
    const projection = combatantProjection(value);
    if (projection === undefined) return undefined;
    entries.push([id, projection]);
  }
  return new Map(entries);
}

function objects(
  session: JsonValue,
): ReadonlyMap<string, JsonValue> | undefined {
  const state = objectAt(session, ["battle", "state"]);
  const battlefield = objectAt(session, ["battlefield"]);
  const groundObjects = mapEntries(state?.groundObjects);
  if (groundObjects === undefined || !Array.isArray(battlefield?.objects))
    return undefined;
  const scenarioObjects: [string, JsonValue][] = [];
  for (const value of battlefield.objects) {
    if (!isJsonObject(value) || typeof value.objectId !== "string")
      return undefined;
    scenarioObjects.push([value.objectId, value]);
  }
  return new Map([...groundObjects, ...scenarioObjects]);
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
    kind === undefined ||
    armorClass === undefined ||
    damageDisposition === undefined ||
    traversal === undefined ||
    sight === undefined ||
    interveningCover === undefined
  )
    return undefined;
  return {
    kind,
    armorClass,
    damageDisposition,
    traversal,
    sight,
    interveningCover,
  };
}

function projectedObjects(
  values: ReadonlyMap<string, JsonValue>,
): ReadonlyMap<string, PlayerObjectProjection> | undefined {
  const projected: [string, PlayerObjectProjection][] = [];
  for (const [id, value] of values) {
    const projection = objectProjection(value);
    if (projection === undefined) return undefined;
    projected.push([id, projection]);
  }
  return new Map(projected);
}

function positions(
  session: JsonValue,
): ReadonlyMap<string, PlayerPositionProjection> | undefined {
  const spatial = objectAt(session, ["battlefield", "spatial"]);
  if (spatial === undefined || !isJsonObject(spatial)) return undefined;
  if (spatial.kind === "tableAuthored") return new Map();
  if (spatial.kind !== "geometryDerived") return undefined;
  const space = spatial.space;
  if (!isJsonObject(space)) return undefined;
  if (!Array.isArray(space.placements)) return undefined;
  const placements = space.placements;
  const entries: [string, PlayerPositionProjection][] = [];
  for (const value of placements) {
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
    if (
      x === undefined ||
      y === undefined ||
      (value.coordinate.elevationFeet !== undefined &&
        elevationFeet === undefined)
    )
      return undefined;
    entries.push([
      value.token,
      { x, y, ...(elevationFeet === undefined ? {} : { elevationFeet }) },
    ]);
  }
  return new Map(entries);
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

function stableRef<const Prefix extends "hole" | "subject">(
  prefix: Prefix,
  value: unknown,
): `${Prefix}:${string}` {
  return `${prefix}:${createHash("sha256").update(canonicalJson(value)).digest("hex")}`;
}

export function projectPlayerSubject(
  value: unknown,
): PlayerSubjectProjection | undefined {
  if (
    !isJsonObject(value) ||
    !isPlayerSubjectTag(value.tag) ||
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
  const common: PlayerSubjectProjectionCommon = {
    actorId: value.actorId,
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
  };
  const action = typeof value.action === "string" ? value.action : undefined;
  const command = typeof value.command === "string" ? value.command : undefined;
  switch (value.tag) {
    case "action":
    case "bonusAction":
    case "bonusActionStandardAction":
    case "druidWildShape":
    case "companionLifecycle":
      return action === undefined
        ? undefined
        : { ...common, tag: value.tag, action };
    case "runtimeCommand":
      return command === undefined
        ? undefined
        : { ...common, tag: value.tag, command };
    case "actionSpell":
    case "bonusActionSpell":
    case "bonusActionDashSpell":
    case "findFamiliarTouchSpell":
      return mode === undefined
        ? undefined
        : { ...common, tag: value.tag, mode };
    case "monkFocusOption":
      return {
        ...common,
        tag: value.tag,
        ...(mode === undefined ? {} : { mode }),
      };
    case "pactOfTheChainFamiliarAttack":
    case "monkFocusFlurryOfBlowsStrike":
    case "unitFeature":
    case "unitFeatureHeldWeaponActivation":
    case "findFamiliarSharedSenses":
      return { ...common, tag: value.tag };
  }
}

export type PlayerHoleEvidenceSource =
  | { readonly kind: "recordedCurrentRuntime" }
  | { readonly kind: "archivedWithoutProjectionEvidence" };

function decodeHole(
  value: unknown,
  source: PlayerHoleEvidenceSource,
): PlayerHoleProjection | undefined {
  const decoded = Schema.decodeUnknownEither(BattleHoleSchema, {
    onExcessProperty:
      source.kind === "recordedCurrentRuntime" ? "error" : "ignore",
  })(value);
  if (Either.isLeft(decoded)) return undefined;
  return PLAYER_HOLE_ADMISSION[decoded.right.kind] ? decoded.right : undefined;
}

function holeOccurrences(
  subject: PlayerSubjectProjection,
  value: JsonValue | undefined,
  source: PlayerHoleEvidenceSource,
): readonly PlayerHoleOccurrence[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const decoded: PlayerHoleProjection[] = [];
  for (const hole of value) {
    const projection = decodeHole(hole, source);
    if (projection === undefined) return undefined;
    decoded.push(projection);
  }
  const occurrences = decoded.map((hole) => ({
    ref: stableRef("hole", {
      subject,
      kind: hole.kind,
      holeId: hole.holeId,
      holeInstanceKey: hole.holeInstanceKey,
    }),
    hole,
  }));
  return new Set(occurrences.map(({ ref }) => ref)).size === occurrences.length
    ? occurrences
    : undefined;
}

type PlayerInterruptDecisionProjection = {
  readonly kind: "interruptDecision";
  readonly trigger: string;
  readonly decisionHole: JsonValue;
  readonly choices: ReadonlyNonEmptyArray<JsonValue>;
  readonly stackDepth: number;
};

function projectEnvelopeFrontier(
  value: JsonValue | undefined,
  source: PlayerHoleEvidenceSource,
): PlayerCurrentTurnProjection["frontier"] | undefined {
  if (!isJsonObject(value) || !isJsonObject(value.frontier)) return undefined;
  const frontier = value.frontier;
  if (frontier.kind === "acts") {
    const projectedActs = projectPlayerActsFromEvidence(frontier.acts, source);
    return projectedActs === undefined
      ? undefined
      : { kind: "acts", acts: projectedActs };
  }
  if (frontier.kind === "holes") {
    if (
      frontier.subject === undefined ||
      !Array.isArray(frontier.holes) ||
      frontier.holes.length === 0
    )
      return undefined;
    const subject = projectPlayerSubject(frontier.subject);
    if (subject === undefined) return undefined;
    const projectedHoles = holeOccurrences(subject, frontier.holes, source);
    return projectedHoles === undefined
      ? undefined
      : {
          kind: "holes",
          subjectRef: stableRef("subject", subject),
          subject,
          holes: projectedHoles,
        };
  }
  if (frontier.kind !== "interruptDecision") return undefined;
  const decoded = Schema.decodeUnknownEither(
    BattleInterruptDecisionFrontierSchema,
    {
      onExcessProperty:
        source.kind === "recordedCurrentRuntime" ? "error" : "ignore",
    },
  )(frontier);
  if (Either.isLeft(decoded)) return undefined;
  const [firstChoice, ...remainingChoices] = decoded.right.choices;
  return {
    kind: "interruptDecision",
    trigger: decoded.right.trigger,
    decisionHole: jsonValue(decoded.right.decisionHole),
    choices: [jsonValue(firstChoice), ...remainingChoices.map(jsonValue)],
    stackDepth: decoded.right.stackDepth,
  };
}

function resolutionEnvelopeForTag(
  result: JsonObject,
  tag: string,
): JsonValue | undefined {
  if (!isJsonObject(result.envelope) || !isJsonObject(result.envelope.frontier))
    return undefined;
  const frontier = result.envelope.frontier;
  if (tag === "resolved") {
    return frontier.kind === "acts" || frontier.kind === "interruptDecision"
      ? result.envelope
      : undefined;
  }
  if (tag === "needsHoles") {
    if (frontier.kind === "interruptDecision") return result.envelope;
    return frontier.kind === "holes" &&
      Array.isArray(frontier.holes) &&
      frontier.holes.length > 0
      ? result.envelope
      : undefined;
  }
  if (tag === "invalid") {
    if (frontier.kind === "acts") {
      return Array.isArray(frontier.acts) ? result.envelope : undefined;
    }
    if (frontier.kind === "holes") {
      return Array.isArray(frontier.holes) && frontier.holes.length > 0
        ? result.envelope
        : undefined;
    }
    return frontier.kind === "interruptDecision" &&
      Array.isArray(frontier.choices) &&
      frontier.choices.length > 0
      ? result.envelope
      : undefined;
  }
  return undefined;
}

export function projectPlayerActs(
  value: unknown,
): readonly PlayerActProjection[] | undefined {
  return projectPlayerActsFromEvidence(value, {
    kind: "recordedCurrentRuntime",
  });
}

export function projectPlayerActsFromEvidence(
  value: unknown,
  source: PlayerHoleEvidenceSource,
): readonly PlayerActProjection[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const projected: PlayerActProjection[] = [];
  for (const entry of value) {
    if (!isJsonObject(entry) || entry.subject === undefined) return undefined;
    const subject = projectPlayerSubject(entry.subject);
    if (subject === undefined) return undefined;
    const projectedHoles = holeOccurrences(subject, entry.initialHoles, source);
    if (projectedHoles === undefined) return undefined;
    projected.push({
      ref: stableRef("subject", subject),
      subject,
      ...(typeof entry.label === "string" ? { label: entry.label } : {}),
      ...(typeof entry.summary === "string" ? { summary: entry.summary } : {}),
      holes: projectedHoles,
    });
  }
  return projected;
}

function acts(
  call: SdkCallRecord,
  source: PlayerHoleEvidenceSource,
): readonly PlayerActProjection[] | undefined {
  return call.outcome === "returned"
    ? projectPlayerActsFromEvidence(call.result, source)
    : undefined;
}

function frontier(
  calls: readonly SdkCallRecord[],
  source: PlayerHoleEvidenceSource,
  beforeSession: JsonValue,
  afterSession: JsonValue,
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
    const result = call.result;
    if (!isJsonObject(result) || typeof result.tag !== "string") {
      return { tag: "invalid" };
    }
    const rejection = playerRejectionProjection(result);
    if (isPlayerRejectionTag(result.tag) && rejection === undefined) {
      return { tag: "invalid" };
    }
    if (rejection !== undefined && rejection.tag !== "invalid") {
      if (result.envelope !== undefined) return { tag: "invalid" };
      return {
        tag: "frontier",
        frontier: { kind: "rejected", rejection },
      };
    }
    const envelope = resolutionEnvelopeForTag(result, result.tag);
    if (envelope === undefined) return { tag: "invalid" };
    if (
      !battleEnvelopeMatchesSessionIdentity(envelope, call.inputSession, {
        kind: "battleOnly",
      }) ||
      !battleEnvelopeMatchesSessionIdentity(envelope, result.session) ||
      !battleEnvelopeMatchesSessionIdentity(envelope, call.outputSession) ||
      !battleEnvelopeMatchesSessionIdentity(envelope, beforeSession, {
        kind: "battleOnly",
      }) ||
      !battleEnvelopeMatchesSessionIdentity(envelope, afterSession)
    ) {
      return { tag: "invalid" };
    }
    const projected = projectEnvelopeFrontier(envelope, source);
    if (projected === undefined) return { tag: "invalid" };
    if (rejection?.tag === "invalid") {
      return {
        tag: "frontier",
        frontier: { kind: "rejected", rejection },
      };
    }
    return { tag: "frontier", frontier: projected };
  };
  for (const call of [...calls].reverse()) {
    if (call.outcome !== "returned") continue;
    const returnedCall: Extract<
      SdkCallRecord,
      { readonly outcome: "returned" }
    > = call;
    const decision = Match.value(returnedCall.operation).pipe(
      Match.when(
        "scenarioRelation",
        (): FrontierDecision => ({ tag: "ignore" }),
      ),
      Match.when("discoverBattleActs", (): FrontierDecision => {
        const projectedActs = acts(returnedCall, source);
        return projectedActs === undefined
          ? { tag: "invalid" }
          : {
              tag: "frontier",
              frontier: { kind: "acts", acts: projectedActs },
            };
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
  return undefined;
}

export function reprojectSdkTranscriptTurns(input: {
  readonly calls: readonly SdkCallRecord[];
  readonly holeEvidenceSource: PlayerHoleEvidenceSource;
}):
  | {
      readonly tag: "valid";
      readonly projections: readonly PlayerCurrentTurnProjection[];
      readonly encodedByteLength: number;
    }
  | Exclude<PlayerProjectionResult, { readonly tag: "valid" }> {
  const byContinuation = input.calls.reduce((groups, call) => {
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
        reason: "malformedProjectionSource",
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
    const projected = playerCurrentTurnProjectionFromEvidence({
      continuation,
      calls: continuationCalls,
      beforeSession: first.inputSession,
      afterSession,
      tacticalNote: "",
      holeEvidenceSource: input.holeEvidenceSource,
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
    stillToAct.length === 0 ||
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
    actorId: next.creature,
    phase: phase.kind,
  };
}

function boundedProjection(
  projection: PlayerCurrentTurnProjection,
): PlayerProjectionResult {
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

export function playerInitialTurnProjection(input: {
  readonly session: JsonValue;
  readonly acts: unknown;
}): PlayerProjectionResult {
  const projectedTurn = turn(input.session);
  const projectedActs = projectPlayerActs(input.acts);
  if (projectedTurn === undefined || projectedActs === undefined) {
    return {
      tag: "invalid",
      reason: "malformedProjectionSource",
      message:
        "The initial session/act frontier cannot be projected into the typed player turn contract.",
    };
  }
  return boundedProjection({
    schemaVersion: 1,
    continuation: 0,
    callSequences: [],
    turn: projectedTurn,
    frontier: { kind: "acts", acts: projectedActs },
    changes: [],
  });
}

export function playerCurrentTurnProjection(input: {
  readonly continuation: number;
  readonly calls: readonly SdkCallRecord[];
  readonly beforeSession: JsonValue;
  readonly afterSession: JsonValue;
  readonly tacticalNote: string;
}): PlayerProjectionResult {
  return playerCurrentTurnProjectionFromEvidence({
    ...input,
    holeEvidenceSource: { kind: "recordedCurrentRuntime" },
  });
}

function playerCurrentTurnProjectionFromEvidence(input: {
  readonly continuation: number;
  readonly calls: readonly SdkCallRecord[];
  readonly beforeSession: JsonValue;
  readonly afterSession: JsonValue;
  readonly tacticalNote: string;
  readonly holeEvidenceSource: PlayerHoleEvidenceSource;
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
  const projectedFrontier = frontier(
    input.calls,
    input.holeEvidenceSource,
    input.beforeSession,
    input.afterSession,
  );
  const beforeCombatants = combatants(input.beforeSession);
  const afterCombatants = combatants(input.afterSession);
  const beforePositions = positions(input.beforeSession);
  const afterPositions = positions(input.afterSession);
  const beforeObjectValues = objects(input.beforeSession);
  const afterObjectValues = objects(input.afterSession);
  const beforeObjects =
    beforeObjectValues === undefined
      ? undefined
      : projectedObjects(beforeObjectValues);
  const afterObjects =
    afterObjectValues === undefined
      ? undefined
      : projectedObjects(afterObjectValues);
  if (
    projectedTurn === undefined ||
    projectedFrontier === undefined ||
    beforeCombatants === undefined ||
    afterCombatants === undefined ||
    beforePositions === undefined ||
    afterPositions === undefined ||
    beforeObjects === undefined ||
    afterObjects === undefined
  ) {
    return {
      tag: "invalid",
      reason: "malformedProjectionSource",
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
      ...changesFor(beforeObjects, afterObjects, (change) => ({
        kind: "object",
        id: change.id,
        ...change.transition,
      })),
      ...changesFor(beforePositions, afterPositions, (change) => ({
        kind: "position",
        id: change.id,
        ...change.transition,
      })),
    ],
  };
  return boundedProjection(projection);
}
