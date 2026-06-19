import * as path from "node:path";

import {
  defineDriver,
  run,
  stateCheck,
  transformITFValue,
} from "@firfi/quint-connect";
import {
  ITFBigInt,
  ITFList,
  ITFMap,
  ITFSet,
  ITFTuple,
  ITFVariant,
} from "@firfi/quint-connect/effect";
import { Either, Match, Schema } from "effect";

import { expect } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  DieRollResult,
  Hp,
  abilityModifier,
  attackBonus,
  classLevel,
  difficultyClass,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import magicMissileInput from "../../surface/content/magic_missile.json";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type {
  DamageType,
  SpellRecord,
  StatBlockRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";

import {
  ATTACK_ROLL_REQUIRED_BEFORE_DAMAGE_MESSAGE,
  ATTACK_TARGET_REQUIRED_BEFORE_ROLL_OR_DAMAGE_MESSAGE,
} from "./battle-reducer/attack-main.ts";
import { battleMagicActionHealingPoolSupportForUnit } from "./unit-feature-support.ts";
import {
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  BATTLE_INVALID_REASON_CODES,
  battleObjectId,
  battleUnitRefWithSupportProfiles,
  battleId,
  battleCombatantSide,
  cantripSpellInvocationRef,
  characterBattleResourceUsage,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleInterrupt,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleInvalidReasonCode,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";

export { defineDriver, run, stateCheck };
export {
  ITFBigInt,
  ITFList,
  ITFMap,
  ITFSet,
  ITFTuple,
  ITFVariant,
  transformITFValue,
};

/*
 * Research note for the parity-driver kit seam:
 * - quint-connect simple.run already applies transformITFValue before
 *   stateCheck deserializers, so kit readers operate on transformed JS values.
 * - quint-connect/effect re-exports the ITF schemas; the kit re-exports them
 *   for deterministic reader tests and for future drivers that need raw ITF
 *   fixtures.
 * - StandardSchema pick plumbing is not upstream-specialized for this repo's
 *   recurring int/bool/string-literal picks, so this kit owns those schemas.
 * - BattleResolutionResult recording is battle-runtime-specific, so this kit
 *   folds the production union into the witness protocol in one place.
 */

export const MBT_DEFAULT_TRACE_COUNT = 1;
export const MBT_TEST_TIMEOUT_MS = 120_000;

export const MBT_WITNESS_LAST_RESULTS = [
  "init",
  "needsHoles",
  "resolved",
  "invalid",
] as const;
export type MbtWitnessLastResult = (typeof MBT_WITNESS_LAST_RESULTS)[number];

const MBT_WITNESS_LAST_RESULT_BY_VARIANT_TAG = {
  WInit: "init",
  WNeedsHoles: "needsHoles",
  WResolved: "resolved",
  WInvalid: "invalid",
} as const satisfies Readonly<Record<string, MbtWitnessLastResult>>;

const MBT_WITNESS_INVALID_REASON_VARIANT_TAG_BY_REASON = {
  staleSubject: "WStaleSubject",
  wrongActor: "WWrongActor",
  missingCombatant: "WMissingCombatant",
  invalidFill: "WInvalidFill",
  unsupportedSubject: "WUnsupportedSubject",
  unsupportedActOption: "WUnsupportedActOption",
} as const satisfies Readonly<Record<BattleInvalidReasonCode, string>>;

export type MbtWitnessLastInvalidReason<NoInvalidReason extends string> =
  | NoInvalidReason
  | BattleInvalidReasonCode;

export type MbtWitnessProtocolState<
  Hole = BattleHole,
  NoInvalidReason extends string = string,
> = {
  readonly holes: readonly Hole[];
  readonly lastResult: MbtWitnessLastResult;
  readonly lastInvalidReason: MbtWitnessLastInvalidReason<NoInvalidReason>;
};

export type BattleResolutionRecorderSnapshot<
  NoInvalidReason extends string = string,
> = MbtWitnessProtocolState<BattleHole, NoInvalidReason> & {
  readonly state: BattleState;
};

const QuintIntAsNumber = Schema.transform(
  Schema.BigIntFromSelf,
  Schema.Number,
  { strict: true, decode: (n) => Number(n), encode: (n) => BigInt(n) },
);

export const mbtPickSchemas = {
  int: Schema.standardSchemaV1(QuintIntAsNumber),
  bool: Schema.standardSchemaV1(Schema.Boolean),
  unknown: Schema.standardSchemaV1(Schema.Unknown),
  stringLiteral: <const Values extends readonly [string, ...string[]]>(
    ...values: Values
  ) => Schema.standardSchemaV1(Schema.Literal(...values)),
} as const;

export function mbtTraceCount(): number {
  return numberFromEnv("MBT_TRACES", MBT_DEFAULT_TRACE_COUNT);
}

export function focusedMbtMaxSteps(domainMaxSteps: number): number {
  const requestedSteps = numberFromEnv("MBT_STEPS", domainMaxSteps);
  return Math.min(requestedSteps, domainMaxSteps);
}

export function mbtSpecPath(
  importMetaDirname: string,
  specFileName: string,
): string {
  return path.resolve(importMetaDirname, "..", specFileName);
}

export function quintStateRecord(
  raw: unknown,
): Readonly<Record<string, unknown>> {
  if (!isRecord(raw)) {
    throw new Error("Expected Quint state to be an object.");
  }

  return raw;
}

export function quintField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): unknown {
  if (Object.hasOwn(state, field)) {
    return state[field];
  }

  throw new Error(`Expected Quint state field ${field}.`);
}

export function quintRecordField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): Readonly<Record<string, unknown>> {
  const value = quintField(state, field);
  if (isRecord(value)) {
    return value;
  }

  throw new Error(`Expected Quint record field ${field}.`);
}

export function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") {
    return raw;
  }
  if (typeof raw === "bigint") {
    return Number(raw);
  }

  throw new Error(`Expected Quint integer field ${field}.`);
}

export function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  return booleanValue(quintField(state, field), field);
}

export function booleanValue(raw: unknown, field: string): boolean {
  if (typeof raw === "boolean") {
    return raw;
  }
  throw new Error(`Expected Quint boolean field ${field}.`);
}

export function stringLiteralField<const Values extends readonly string[]>(
  state: Readonly<Record<string, unknown>>,
  field: string,
  values: Values,
): Values[number] {
  return stringLiteralValue(quintField(state, field), field, values);
}

export function stringLiteralValue<const Values extends readonly string[]>(
  raw: unknown,
  field: string,
  values: Values,
): Values[number] {
  if (typeof raw === "string" && values.includes(raw)) {
    return raw;
  }

  throw new Error(`Expected Quint string-literal field ${field}.`);
}

export function quintSet(raw: unknown, field: string): readonly unknown[] {
  if (raw instanceof Set) {
    return [...raw];
  }

  throw new Error(`Expected Quint set field ${field}.`);
}

export function quintList(raw: unknown, field: string): readonly unknown[] {
  if (Array.isArray(raw)) {
    return raw;
  }

  throw new Error(`Expected Quint list field ${field}.`);
}

export type QuintVariantWithValue = {
  readonly tag: string;
  readonly value: unknown;
};

export function quintVariantTag(raw: unknown, field = "variant"): string {
  if (isRecord(raw) && typeof raw["tag"] === "string") {
    return raw["tag"];
  }

  if (typeof raw === "string") {
    return raw;
  }

  throw new Error(`Expected Quint variant tag field ${field}.`);
}

export function quintVariantMappedValue<
  const Mapping extends Readonly<Record<string, string>>,
>(
  raw: unknown,
  field: string,
  mapping: Mapping,
  label: string,
): Mapping[keyof Mapping] {
  const tag = quintVariantTag(raw, field);
  if (hasOwnStringKey(mapping, tag)) {
    return mapping[tag];
  }

  throw new Error(`Unknown ${label} tag: ${tag}.`);
}

export function quintVariantValue(
  raw: unknown,
  expectedTag: string,
  field = "variant",
): unknown {
  if (
    isRecord(raw) &&
    raw["tag"] === expectedTag &&
    Object.hasOwn(raw, "value")
  ) {
    return raw["value"];
  }

  throw new Error(
    `Expected Quint ${expectedTag} variant value field ${field}.`,
  );
}

export function mbtWitnessLastInvalidReasons<
  const NoInvalidReason extends string,
>(
  noInvalidReason: NoInvalidReason,
): readonly [NoInvalidReason, ...typeof BATTLE_INVALID_REASON_CODES] {
  return [noInvalidReason, ...BATTLE_INVALID_REASON_CODES];
}

export function decodeWitnessProtocolState<
  Hole,
  const NoInvalidReason extends string,
>(input: {
  readonly state: Readonly<Record<string, unknown>>;
  readonly noInvalidReason: NoInvalidReason;
  readonly holesField?: string;
  readonly protocolField?: string;
  readonly decodeHole: (raw: unknown) => Hole;
  readonly compareHoles?: (left: Hole, right: Hole) => number;
}): MbtWitnessProtocolState<Hole, NoInvalidReason> {
  if (input.protocolField !== undefined) {
    return decodeTypedWitnessProtocolState({
      ...input,
      protocolField: input.protocolField,
    });
  }

  const holesField = input.holesField ?? "qHoles";
  return {
    holes: quintSet(quintField(input.state, holesField), holesField)
      .map(input.decodeHole)
      .sort(input.compareHoles),
    lastResult: stringLiteralField(
      input.state,
      "qLastResult",
      MBT_WITNESS_LAST_RESULTS,
    ),
    lastInvalidReason: stringLiteralField(
      input.state,
      "qLastInvalidReason",
      mbtWitnessLastInvalidReasons(input.noInvalidReason),
    ),
  };
}

function decodeTypedWitnessProtocolState<
  Hole,
  const NoInvalidReason extends string,
>(input: {
  readonly state: Readonly<Record<string, unknown>>;
  readonly noInvalidReason: NoInvalidReason;
  readonly protocolField: string;
  readonly decodeHole: (raw: unknown) => Hole;
  readonly compareHoles?: (left: Hole, right: Hole) => number;
}): MbtWitnessProtocolState<Hole, NoInvalidReason> {
  const protocol = quintRecordField(input.state, input.protocolField);
  const holesField = `${input.protocolField}.holes`;
  const resultField = `${input.protocolField}.result`;
  const resultRaw = quintField(protocol, "result");
  const lastResult = mbtWitnessLastResultFromVariant(resultRaw, resultField);
  return {
    holes: quintSet(quintField(protocol, "holes"), holesField)
      .map(input.decodeHole)
      .sort(input.compareHoles),
    lastResult,
    lastInvalidReason:
      lastResult === "invalid"
        ? mbtWitnessInvalidReasonFromVariant(
            quintVariantValue(resultRaw, "WInvalid", resultField),
            resultField,
          )
        : input.noInvalidReason,
  };
}

export function assertWitnessProtocolConsistentWithScenario(input: {
  readonly label: string;
  readonly scenarioResult: string;
  readonly protocol: Pick<
    MbtWitnessProtocolState<unknown, string>,
    "holes" | "lastResult"
  > & { readonly lastInvalidReason?: string };
  readonly initScenarioResult?: string;
  readonly invalidScenarioReasons?: Readonly<Record<string, string>>;
}): void {
  const initScenarioResult = input.initScenarioResult ?? "init";
  const invalidReason = input.invalidScenarioReasons?.[input.scenarioResult];
  const expected: MbtWitnessLastResult =
    invalidReason !== undefined
      ? "invalid"
      : input.scenarioResult === initScenarioResult
        ? "init"
        : input.protocol.holes.length > 0
          ? "needsHoles"
          : "resolved";
  if (input.protocol.lastResult !== expected) {
    throw new Error(
      `Expected ${input.label} witness protocol result ${expected} for scenario ${input.scenarioResult}, got ${input.protocol.lastResult}.`,
    );
  }
  if (
    invalidReason !== undefined &&
    input.protocol.lastInvalidReason !== invalidReason
  ) {
    throw new Error(
      `Expected ${input.label} witness invalid reason ${invalidReason} for scenario ${input.scenarioResult}, got ${String(input.protocol.lastInvalidReason)}.`,
    );
  }
}

function mbtWitnessLastResultFromVariant(
  raw: unknown,
  field: string,
): MbtWitnessLastResult {
  const tag = quintVariantTag(raw, field);
  if (isMbtWitnessLastResultVariantTag(tag)) {
    return MBT_WITNESS_LAST_RESULT_BY_VARIANT_TAG[tag];
  }

  throw new Error(`Expected Quint witness result variant field ${field}.`);
}

function isMbtWitnessLastResultVariantTag(
  tag: string,
): tag is keyof typeof MBT_WITNESS_LAST_RESULT_BY_VARIANT_TAG {
  return hasOwnStringKey(MBT_WITNESS_LAST_RESULT_BY_VARIANT_TAG, tag);
}

function hasOwnStringKey<const ObjectValue extends object>(
  value: ObjectValue,
  key: string,
): key is Extract<keyof ObjectValue, string> {
  return Object.hasOwn(value, key);
}

function mbtWitnessInvalidReasonFromVariant(
  raw: unknown,
  field: string,
): BattleInvalidReasonCode {
  const tag = quintVariantTag(raw, field);
  const reason = BATTLE_INVALID_REASON_CODES.find(
    (candidate) =>
      MBT_WITNESS_INVALID_REASON_VARIANT_TAG_BY_REASON[candidate] === tag,
  );
  if (reason !== undefined) {
    return reason;
  }

  throw new Error(
    `Expected Quint witness invalid reason variant field ${field}.`,
  );
}

export function createBattleSubjectResolutionRecorder<
  const NoInvalidReason extends string,
>(input: {
  readonly initialState: BattleState;
  readonly subject: BattleSubject;
  readonly noInvalidReason: NoInvalidReason;
}): {
  readonly submit: (fills: readonly BattleFill[]) => void;
  readonly record: (result: BattleResolutionResult) => void;
  readonly reset: (state: BattleState) => void;
  readonly snapshot: () => BattleResolutionRecorderSnapshot<NoInvalidReason>;
} {
  let snapshot = initialBattleResolutionRecorderSnapshot(
    input.initialState,
    input.noInvalidReason,
  );

  return {
    submit: (fills) => {
      snapshot = recordBattleResolutionResult(
        snapshot,
        resolveBattleSubject({
          state: snapshot.state,
          subject: input.subject,
          fills,
        }),
        input.noInvalidReason,
      );
    },
    record: (result) => {
      snapshot = recordBattleResolutionResult(
        snapshot,
        result,
        input.noInvalidReason,
      );
    },
    reset: (state) => {
      snapshot = initialBattleResolutionRecorderSnapshot(
        state,
        input.noInvalidReason,
      );
    },
    snapshot: () => snapshot,
  };
}

export function createBattleInterruptResolutionRecorder<
  const NoInvalidReason extends string,
>(input: {
  readonly initialState: BattleState;
  readonly noInvalidReason: NoInvalidReason;
}): {
  readonly submit: (
    fill: Extract<BattleFill, { readonly kind: "interruptDecision" }>,
  ) => void;
  readonly record: (result: BattleResolutionResult) => void;
  readonly reset: (state: BattleState) => void;
  readonly snapshot: () => BattleResolutionRecorderSnapshot<NoInvalidReason>;
} {
  let snapshot = initialBattleResolutionRecorderSnapshot(
    input.initialState,
    input.noInvalidReason,
  );

  return {
    submit: (fill) => {
      snapshot = recordBattleResolutionResult(
        snapshot,
        resolveBattleInterrupt({
          state: snapshot.state,
          fill,
        }),
        input.noInvalidReason,
      );
    },
    record: (result) => {
      snapshot = recordBattleResolutionResult(
        snapshot,
        result,
        input.noInvalidReason,
      );
    },
    reset: (state) => {
      snapshot = initialBattleResolutionRecorderSnapshot(
        state,
        input.noInvalidReason,
      );
    },
    snapshot: () => snapshot,
  };
}

export function initialBattleResolutionRecorderSnapshot<
  const NoInvalidReason extends string,
>(
  state: BattleState,
  noInvalidReason: NoInvalidReason,
): BattleResolutionRecorderSnapshot<NoInvalidReason> {
  return {
    state,
    holes: [],
    lastResult: "init",
    lastInvalidReason: noInvalidReason,
  };
}

export function recordBattleResolutionResult<
  const NoInvalidReason extends string,
>(
  snapshot: BattleResolutionRecorderSnapshot<NoInvalidReason>,
  result: BattleResolutionResult,
  noInvalidReason: NoInvalidReason,
): BattleResolutionRecorderSnapshot<NoInvalidReason> {
  return Match.value(result).pipe(
    Match.when({ tag: "resolved" }, (resolved) => ({
      state: resolved.state,
      holes: [],
      lastResult: "resolved" as const,
      lastInvalidReason: noInvalidReason,
    })),
    Match.when({ tag: "needsHoles" }, (needsHoles) => ({
      state: needsHoles.state,
      holes: needsHoles.holes,
      lastResult: "needsHoles" as const,
      lastInvalidReason: noInvalidReason,
    })),
    Match.when({ tag: "invalid" }, (invalid) => ({
      state: snapshot.state,
      holes: snapshot.holes,
      lastResult: "invalid" as const,
      lastInvalidReason: invalid.reason,
    })),
    Match.exhaustive,
  );
}

type MbtHole =
  | "TargetChoice"
  | "ObjectTargetChoice"
  | "SpellTargetAllocation"
  | "SavingThrowOutcome"
  | "AttackRoll"
  | "DamageRoll"
  | "SpellDamageRoll"
  | "StatBlockRechargeRoll"
  | "LevitateAltitudeChange"
  | "LevitateInitialRise"
  | "SlowSomaticSpellFailureOutcome";
type MbtLastResult = "init" | "needsHoles" | "resolved" | "invalid";
type MbtLastInvalidReason = "" | "invalidFill" | "staleSubject" | "wrongActor";
type WeaponAttackOrderingStage =
  | "actSelection"
  | "targetChoice"
  | "attackRoll"
  | "damageDice"
  | "resolved";
type WeaponAttackOrderingError =
  | ""
  | "targetChoiceRequired"
  | "attackRollRequired";
type WeaponAttackOrderingHole = "targetChoice" | "attackRoll" | "rolledDice";
type SaveGatedSpellOrderingStage =
  | "actSelection"
  | "targetListAndConditionChoice"
  | "targetList"
  | "conditionChoice"
  | "damageSavingThrowOutcome"
  | "conditionSavingThrowOutcome"
  | "damageDice"
  | "resolved";
type SaveGatedSpellOrderingError =
  | ""
  | "targetOrAreaRequired"
  | "savingThrowRequired";
type SaveGatedSpellOrderingHole =
  | "spellTargetList"
  | "conditionChoice"
  | "savingThrowOutcome"
  | "rolledDice";
type SpellAttackOrderingStage =
  | "actSelection"
  | "targetChoice"
  | "typedTargetChoice"
  | "targetList"
  | "targetAllocation"
  | "damageTypeAndTargetChoice"
  | "damageTypeChoice"
  | "attackRoll"
  | "damageDice"
  | "resolved";
type SpellAttackOrderingError =
  | ""
  | "targetRequired"
  | "damageTypeRequired"
  | "targetOrDamageTypeRequired"
  | "attackRollRequired";
type SpellAttackOrderingHole =
  | "targetChoice"
  | "spellTargetList"
  | "spellTargetAllocation"
  | "damageTypeChoice"
  | "attackRoll"
  | "rolledDice";
type HitPointRestorationOrderingStage =
  | "actSelection"
  | "spellHealingTargetChoice"
  | "spellHealingTargetList"
  | "spellHealingRoll"
  | "featureHealingPoolDistribution"
  | "resolved";
type HitPointRestorationOrderingError =
  | ""
  | "healingTargetRequired"
  | "healingAmountRequired"
  | "healingDistributionRequired";
type HitPointRestorationOrderingHole =
  | "targetChoice"
  | "spellTargetList"
  | "rolledDice"
  | "hitPointHealingDistribution";
type CommandOrderingStage =
  | "actSelection"
  | "targetListAndOptionChoice"
  | "targetList"
  | "optionChoice"
  | "savingThrowOutcome"
  | "dropHeldObjectFacts"
  | "approachMovement"
  | "fleeMovement"
  | "resolved";
type CommandOrderingError =
  | ""
  | "commandTargetListRequired"
  | "commandOptionChoiceRequired"
  | "commandSavingThrowRequired"
  | "commandHeldObjectFactsRequired"
  | "commandMovementRequired";
type CommandOrderingHole =
  | "spellTargetList"
  | "commandOptionChoice"
  | "savingThrowOutcome"
  | "movement";
type CommandOrderingPendingOption =
  | "none"
  | "grovel"
  | "drop"
  | "halt"
  | "approach"
  | "flee";
type MbtProjection = {
  readonly skeletonHp: number;
  readonly skeletonDead: boolean;
  readonly actionAvailable: boolean;
  readonly multiattackDispatchesAvailable: number;
  readonly sneakAttackUsedThisTurn: boolean;
  readonly holes: readonly MbtHole[];
  readonly lastResult: MbtLastResult;
  readonly lastInvalidReason: MbtLastInvalidReason;
};
type WeaponAttackOrderingProjection = {
  readonly stage: WeaponAttackOrderingStage;
  readonly holes: readonly WeaponAttackOrderingHole[];
  readonly lastResult: MbtLastResult;
  readonly orderingError: WeaponAttackOrderingError;
};
type SaveGatedSpellOrderingProjection = {
  readonly stage: SaveGatedSpellOrderingStage;
  readonly holes: readonly SaveGatedSpellOrderingHole[];
  readonly lastResult: MbtLastResult;
  readonly orderingError: SaveGatedSpellOrderingError;
};
type SpellAttackOrderingProjection = {
  readonly stage: SpellAttackOrderingStage;
  readonly holes: readonly SpellAttackOrderingHole[];
  readonly lastResult: MbtLastResult;
  readonly orderingError: SpellAttackOrderingError;
};
type HitPointRestorationOrderingProjection = {
  readonly stage: HitPointRestorationOrderingStage;
  readonly holes: readonly HitPointRestorationOrderingHole[];
  readonly lastResult: MbtLastResult;
  readonly orderingError: HitPointRestorationOrderingError;
  readonly spellTargetHp: number;
  readonly spellTargetZeroHpLifecycleCleared: boolean;
  readonly featureTargetHp: number;
  readonly featureTargetZeroHpLifecycleCleared: boolean;
};
type CommandOrderingProjection = {
  readonly stage: CommandOrderingStage;
  readonly holes: readonly CommandOrderingHole[];
  readonly tableFactFrontierOpen: boolean;
  readonly lastResult: MbtLastResult;
  readonly orderingError: CommandOrderingError;
  readonly pendingCommandOption: CommandOrderingPendingOption;
  readonly targetProne: boolean;
  readonly droppedObjectCount: number;
  readonly haltSuppressed: boolean;
  readonly movementSpentFeet: number;
  readonly currentActor: "Caster" | "Target";
  readonly reactionWindowOpen: boolean;
};

const REDUCER_SPINE_CONTRACT_STAGES = [
  "notStarted",
  "battleStarted",
  "actDiscovered",
  "subjectNeedsHoles",
  "subjectResolved",
  "turnAdvanced",
] as const;
type ReducerSpineContractStage = (typeof REDUCER_SPINE_CONTRACT_STAGES)[number];
const REDUCER_SPINE_CONTRACT_ENTRYPOINTS = [
  "none",
  "startBattle",
  "discoverBattleActs",
  "resolveBattleSubject",
] as const;
type ReducerSpineContractEntrypoint =
  (typeof REDUCER_SPINE_CONTRACT_ENTRYPOINTS)[number];
const REDUCER_SPINE_CONTRACT_SUBJECTS = [
  "none",
  "slotSpell",
  "weaponAttack",
  "endTurn",
] as const;
type ReducerSpineContractSubject =
  (typeof REDUCER_SPINE_CONTRACT_SUBJECTS)[number];
const REDUCER_SPINE_CONTRACT_ACTORS = ["none", "caster", "target"] as const;
type ReducerSpineContractActor = (typeof REDUCER_SPINE_CONTRACT_ACTORS)[number];
const REDUCER_SPINE_CONTRACT_SPELL_SLOT_USES = [
  "none",
  "pending",
  "committed",
] as const;
type ReducerSpineContractSpellSlotUse =
  (typeof REDUCER_SPINE_CONTRACT_SPELL_SLOT_USES)[number];
const REDUCER_SPINE_CONTRACT_HOLES = [
  "targetChoice",
  "spellTargetAllocation",
  "attackRoll",
  "rolledDice",
] as const;
type ReducerSpineContractHole = (typeof REDUCER_SPINE_CONTRACT_HOLES)[number];
type ReducerSpineContractProjection = {
  readonly stage: ReducerSpineContractStage;
  readonly entrypoint: ReducerSpineContractEntrypoint;
  readonly subject: ReducerSpineContractSubject;
  readonly currentActor: ReducerSpineContractActor;
  readonly holes: readonly ReducerSpineContractHole[];
  readonly lastResult: MbtLastResult;
  readonly lastInvalidReason: MbtLastInvalidReason;
  readonly actionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly casterReactionAvailable: boolean;
  readonly targetReactionAvailable: boolean;
  readonly spellSlotUse: ReducerSpineContractSpellSlotUse;
  readonly interruptDepth: number;
  readonly casterHp: number;
  readonly targetHp: number;
};

export type ExtraAttackMbtProjection = {
  readonly skeletonHp: number;
  readonly actionAvailable: boolean;
  readonly extraAttackSlotsAvailable: number;
  readonly movementSpentFeet: number;
  readonly lastResult: MbtLastResult;
  readonly lastInvalidReason: MbtLastInvalidReason;
};

export type AdrenalineRushMbtProjection = {
  readonly actorTempHp: number;
  readonly bonusActionAvailable: boolean;
  readonly dashBonusFeet: number;
  readonly featureUsesRemaining: number;
  readonly lastResult: MbtLastResult;
  readonly lastInvalidReason: MbtLastInvalidReason;
};

export type RogueSteadyAimMbtProjection = {
  readonly bonusActionAvailable: boolean;
  readonly actorSpeedFeet: number;
  readonly nextAttackAdvantageActive: boolean;
  readonly speedZeroActive: boolean;
  readonly attackRollMode: "normal" | "advantage";
  readonly lastResult: MbtLastResult;
  readonly lastInvalidReason: MbtLastInvalidReason;
};

type ScalarBuffMbtProjection = {
  readonly fighterSpeed: number;
  readonly goblinSpeed: number;
  readonly actionAvailable: boolean;
  readonly holes: readonly MbtHole[];
  readonly lastResult: MbtLastResult;
  readonly lastInvalidReason: MbtLastInvalidReason;
};

const fighterId = combatantId("fighter");
const skeletonId = combatantId("skeleton");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});

function startBattleRight(
  input: Parameters<typeof startBattle>[0],
): BattleState {
  const result = startBattle(input);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

if (statBlockCatalogResult.tag !== "ok" || unitCatalogResult.tag !== "ok") {
  throw new Error("Battle runtime MBT catalogs must build successfully.");
}

const statBlockCatalog = statBlockCatalogResult.catalog;
const unitLibrary = unitCatalogResult.catalog;
const magicMissileUnit = decodeUnitRecordSync(magicMissileInput);
if (magicMissileUnit.kind !== "spell") {
  throw new Error("Expected Magic Missile content to decode as a spell Unit.");
}
const magicMissileSpell = magicMissileUnit satisfies SpellRecord;
const driverSchema = {
  init: {},
  doDiscoverAttack: {},
  doFillTarget: {},
  doRejectWrongTarget: {},
  doFillAttackRollMiss: {},
  doFillAttackRollHit: {},
  doFillDamageLow: {},
  doFillDamageHigh: {},
  doFillDamageLowSneakAttack: {},
  doFillDamageHighSneakAttack: {},
  doRejectStaleAfterResolved: {},
  doStartSkeletonTurn: {},
  doResolveSkeletonMultiattack: {},
  doRejectRecursiveSkeletonMultiattack: {},
  doSpendSkeletonMultiattackDispatch: {},
  step: {},
} as const;

const weaponAttackOrderingDriverSchema = {
  init: {},
  doDiscoverAttack: {},
  doRejectAttackRollBeforeTargetChoice: {},
  doFillTargetChoice: {},
  doRejectDamageBeforeAttackRoll: {},
  doFillAttackRollMiss: {},
  doFillAttackRollHit: {},
  doFillDamageDice: {},
  step: {},
} as const;

const saveGatedSpellOrderingDriverSchema = {
  init: {},
  doDiscoverAreaSaveDamage: {},
  doSubmitDamageBeforeSavingThrow: {},
  doFillAreaSaveFailed: {},
  doFillAreaDamageDice: {},
  doDiscoverTargetListConditionChoice: {},
  doFillTargetListBeforeConditionChoice: {},
  doFillConditionChoiceAfterTargetList: {},
  doFillConditionChoiceBeforeTargetList: {},
  doFillTargetListAfterConditionChoice: {},
  doFillConditionSavingThrow: {},
  step: {},
} as const;

const spellAttackOrderingDriverSchema = {
  init: {},
  doDiscoverSingleTargetSpellAttack: {},
  doSubmitAttackRollBeforeTargetChoice: {},
  doFillTargetChoice: {},
  doSubmitDamageBeforeAttackRoll: {},
  doFillAttackRollMiss: {},
  doFillAttackRollHit: {},
  doFillDamageDice: {},
  doDiscoverTypedSpellAttack: {},
  doFillDamageTypeBeforeTargetChoice: {},
  doFillTargetChoiceBeforeDamageType: {},
  doFillDamageTypeAfterTargetChoice: {},
  doFillTargetChoiceAfterDamageType: {},
  step: {},
} as const;

const hitPointRestorationOrderingDriverSchema = {
  init: {},
  doDiscoverSingleTargetSpellHealing: {},
  doSubmitHealingRollBeforeTargetChoice: {},
  doFillSpellHealingTargetChoice: {},
  doDiscoverTargetListSpellHealing: {},
  doSubmitHealingRollBeforeTargetList: {},
  doFillSpellHealingTargetList: {},
  doFillSpellHealingRoll: {},
  doDiscoverFeatureHealingPool: {},
  doFillFeatureHealingDistribution: {},
  step: {},
} as const;

const commandOrderingDriverSchema = {
  init: {},
  doDiscoverCommand: {},
  doSubmitOptionBeforeTargetList: {},
  doFillTargetList: {},
  doSubmitSavingThrowBeforeOption: {},
  doFillGrovelOption: {},
  doFillFailedGrovelSavingThrow: {},
  doFollowGrovel: {},
  doDropNeedsHeldObjectFacts: {},
  doFillDropHeldObjectFacts: {},
  doHaltSuppresses: {},
  doApproachMovementContinues: {},
  doFillApproachMovementContinues: {},
  doFillApproachMovementWithinFive: {},
  doApproachNoMovement: {},
  doFleeMovement: {},
  doFillFleeMovement: {},
  doRejectFleePartialMovement: {},
  doFleeNoMovement: {},
  doFleeOpportunityAttack: {},
  step: {},
} as const;

const magicMissileDriverSchema = {
  init: {},
  doFillMagicMissileAllocation: {},
  doFillMagicMissileDamage: { dartRollTotal: mbtPickSchemas.int },
  step: {},
} as const;

const reducerSpineContractDriverSchema = {
  init: {},
  doStartBattle: {},
  doDiscoverSlotSpell: {},
  doResolveSlotSpellTargets: {},
  doResolveSlotSpellDamage: {},
  doEndTurnToTarget: {},
  doDiscoverWeaponAttack: {},
  doResolveWeaponTarget: {},
  doResolveWeaponAttackHit: {},
  doResolveWeaponDamage: {},
  step: {},
} as const;

const extraAttackDriverSchema = {
  init: {},
  initOneAdditionalAttack: {},
  initTwoAdditionalAttacks: {},
  initThreeAdditionalAttacks: {},
  doResolveFirstExtraAttackMiss: {},
  doMoveBetweenExtraAttackSlots: {},
  doResolveSecondExtraAttackMiss: {},
  doRejectThirdExtraAttack: {},
  doEndTurnClosesExtraAttackSlot: {},
  step: {},
} as const;

const adrenalineRushDriverSchema = {
  init: {},
  doAdrenalineRushDash: {},
  doRejectSecondDash: {},
  step: {},
} as const;

const rogueSteadyAimDriverSchema = {
  init: {},
  doSteadyAim: {},
  doRejectAfterMoved: {},
  doRejectSecondAim: {},
  doAttackConsumesAdvantage: {},
  doEndTurnCleanup: {},
  step: {},
} as const;

const scalarBuffDriverSchema = {
  init: {},
  doFillLongstriderTarget: {},
  doRejectStaleAfterResolved: {},
  step: {},
} as const;

export type ExtraAttackDriverAction = Exclude<
  keyof typeof extraAttackDriverSchema,
  | "init"
  | "initOneAdditionalAttack"
  | "initTwoAdditionalAttacks"
  | "initThreeAdditionalAttacks"
  | "step"
>;
export type AdrenalineRushDriverAction = Exclude<
  keyof typeof adrenalineRushDriverSchema,
  "init" | "step"
>;
export type RogueSteadyAimDriverAction = Exclude<
  keyof typeof rogueSteadyAimDriverSchema,
  "init" | "step"
>;
const extraAttackSelectedUnitIds = [
  "barbarian_extra_attack",
  "fighter_extra_attack",
  "monk_extra_attack",
  "paladin_extra_attack",
  "ranger_extra_attack",
] as const;
type ExtraAttackSelectedUnitId = (typeof extraAttackSelectedUnitIds)[number];
export const extraAttackMbtAdditionalAttackCounts = [1, 2, 3] as const;
type ExtraAttackMbtAdditionalAttackCount =
  (typeof extraAttackMbtAdditionalAttackCounts)[number];
const syntheticExtraAttackMbtUnitIds = [
  "test_synthetic_attack_count_2",
  "test_synthetic_attack_count_3",
] as const;
type SyntheticExtraAttackMbtUnitId =
  (typeof syntheticExtraAttackMbtUnitIds)[number];
type ExtraAttackMbtUnitId =
  | ExtraAttackSelectedUnitId
  | SyntheticExtraAttackMbtUnitId;
type ExtraAttackMbtInitAction =
  | "initOneAdditionalAttack"
  | "initTwoAdditionalAttacks"
  | "initThreeAdditionalAttacks";
export type SelectedUnitIdentityReplaySequence<
  ActionName extends string,
  Projection,
> = {
  readonly name: string;
  readonly actions: readonly ActionName[];
  readonly expected: Projection;
};
export type ExtraAttackSelectedUnitIdentityReplay = {
  readonly driver: "extraAttack";
  readonly taskId: "extra-attack-count-scaling";
  readonly unitId: ExtraAttackSelectedUnitId;
  readonly actions: readonly ExtraAttackDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence<
    ExtraAttackDriverAction,
    ExtraAttackMbtProjection
  >[];
};
export type AdrenalineRushSelectedUnitIdentityReplay = {
  readonly driver: "adrenalineRush";
  readonly taskId: "L1H-ORC-ADRENALINE-RUSH";
  readonly unitId: "orc_adrenaline_rush";
  readonly actions: readonly AdrenalineRushDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence<
    AdrenalineRushDriverAction,
    AdrenalineRushMbtProjection
  >[];
};
export type RogueSteadyAimSelectedUnitIdentityReplay = {
  readonly driver: "rogueSteadyAim";
  readonly taskId: "L3PUTB-01-ROGUE-STEADY-AIM-RUNTIME";
  readonly unitId: "rogue_steady_aim";
  readonly actions: readonly RogueSteadyAimDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence<
    RogueSteadyAimDriverAction,
    RogueSteadyAimMbtProjection
  >[];
};
export type SelectedUnitIdentityReplay =
  | ExtraAttackSelectedUnitIdentityReplay
  | AdrenalineRushSelectedUnitIdentityReplay
  | RogueSteadyAimSelectedUnitIdentityReplay;
type SelectedUnitIdentityReplayUnitId = SelectedUnitIdentityReplay["unitId"];
type SelectedReplayDriver<ActionName extends string, Projection> = {
  readonly actions: Readonly<
    Record<
      ActionName,
      { readonly handler: (input: Record<string, never>) => unknown }
    >
  >;
  readonly getState?: () => Projection;
};

async function runSelectedIdentityReplay<ActionName extends string, Projection>(
  replay: {
    readonly unitId: SelectedUnitIdentityReplayUnitId;
    readonly actions: readonly ActionName[];
    readonly sequences: readonly SelectedUnitIdentityReplaySequence<
      ActionName,
      Projection
    >[];
  },
  createDriver: () => SelectedReplayDriver<ActionName, Projection>,
): Promise<void> {
  const replayedActions = new Set<ActionName>();

  for (const sequence of replay.sequences) {
    const driver = createDriver();

    for (const actionName of sequence.actions) {
      resetSelectedUnitRuntimeBoundaryIds();
      replayedActions.add(actionName);
      await driver.actions[actionName].handler({});
      expect(
        selectedUnitRuntimeBoundaryIds.has(replay.unitId),
        `${replay.unitId}:${sequence.name}:${actionName} must bind its Unit id`,
      ).toBe(true);
    }

    const runtime = driver.getState?.();
    if (runtime === undefined) {
      throw new Error("Selected identity replay driver must expose getState.");
    }
    expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
      sequence.expected,
    );
  }

  expect(replayedActions).toEqual(new Set(replay.actions));
  resetSelectedUnitRuntimeBoundaryIds();
}

export async function runSelectedUnitIdentityReplay(
  replay: SelectedUnitIdentityReplay,
): Promise<void> {
  if (replay.driver === "extraAttack") {
    await runSelectedIdentityReplay(
      replay,
      createExtraAttackDriver(replay.unitId),
    );
    return;
  }
  if (replay.driver === "adrenalineRush") {
    await runSelectedIdentityReplay(replay, createAdrenalineRushDriver());
    return;
  }
  await runSelectedIdentityReplay(replay, createRogueSteadyAimDriver());
}

const selectedUnitRuntimeBoundaryIds = new Set<string>();

function resetSelectedUnitRuntimeBoundaryIds(): void {
  selectedUnitRuntimeBoundaryIds.clear();
}

function recordSelectedUnitRuntimeBoundaryId<UnitId extends string>(
  unitId: UnitId,
): UnitId {
  selectedUnitRuntimeBoundaryIds.add(unitId);
  return unitId;
}

export function createBattleRuntimeDriver() {
  return defineDriver(driverSchema, () => {
    let state = fighterVsSkeletonBattle();
    let subject: BattleSubject = fighterAttackSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = discoverAttackHoles(state, subject);
    let lastResult: MbtProjection["lastResult"] = "init";
    let lastInvalidReason: MbtProjection["lastInvalidReason"] = "";

    function reset(): void {
      state = fighterVsSkeletonBattle();
      subject = fighterAttackSubject();
      fills = [];
      holes = discoverAttackHoles(state, subject);
      lastResult = "init";
      lastInvalidReason = "";
    }

    function submit(nextFills: readonly BattleFill[]): void {
      fills = fillsWithMbtSpellCastReactionFacts(holes, nextFills);
      const result = resolveBattleSubject({ state, subject, fills });
      recordResult(result);
    }

    function recordResult(result: BattleResolutionResult): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastInvalidReason = "";
        return;
      }
      lastInvalidReason = mbtInvalidReason(result.reason);
    }

    return {
      init: reset,
      doDiscoverAttack: () => {
        subject = fighterAttackSubject();
        holes = discoverAttackHoles(state, subject);
        lastResult = "needsHoles";
        lastInvalidReason = "";
      },
      doFillTarget: () => {
        const target = requireHole(holes, "targetChoice");
        submit([targetFill(target, skeletonId)]);
      },
      doRejectWrongTarget: () => {
        const target = requireHole(holes, "targetChoice");
        submit([targetFill(target, fighterId)]);
      },
      doFillAttackRollMiss: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        submit([
          ...fills,
          attackRollFill(attackRoll, { total: 13, naturalD20: 9 }),
        ]);
      },
      doFillAttackRollHit: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        submit([
          ...fills,
          attackRollFill(attackRoll, {
            total: 14,
            naturalD20: 10,
            rollMode: "advantage",
          }),
        ]);
      },
      doFillDamageLow: () => {
        const damage = requireHole(holes, "rolledDice");
        submit([...fills, damageRollFill(damage, 2)]);
      },
      doFillDamageHigh: () => {
        const damage = requireHole(holes, "rolledDice");
        submit([...fills, damageRollFill(damage, 4)]);
      },
      doFillDamageLowSneakAttack: () => {
        const damage = requireHole(holes, "rolledDice");
        submit([
          ...fills,
          damageRollFillWithGroups(damage, [[2], [2]], ["rogue_sneak_attack"]),
        ]);
      },
      doFillDamageHighSneakAttack: () => {
        const damage = requireHole(holes, "rolledDice");
        submit([
          ...fills,
          damageRollFillWithGroups(damage, [[4], [4]], ["rogue_sneak_attack"]),
        ]);
      },
      doRejectStaleAfterResolved: () => {
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doStartSkeletonTurn: () => {
        subject = endTurnSubject();
        fills = [];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doResolveSkeletonMultiattack: () => {
        subject = skeletonMultiattackSubject();
        fills = [];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doRejectRecursiveSkeletonMultiattack: () => {
        subject = skeletonMultiattackSubject();
        fills = [];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doSpendSkeletonMultiattackDispatch: () => {
        subject = skeletonShortswordSubject();
        const target = requireHole(
          discoverAttackHoles(state, subject),
          "targetChoice",
        );
        const targetChoice = targetFill(target, fighterId);
        const attackRoll = requireHole(
          holesAfterFills(state, subject, [targetChoice]),
          "attackRoll",
        );
        fills = [
          targetChoice,
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      step: () => {},
      getState: () =>
        projectMbtState({
          state,
          holes,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

export function createWeaponAttackOrderingDriver() {
  return defineDriver(weaponAttackOrderingDriverSchema, () => {
    let state = fighterVsSkeletonBattle();
    const subject = fighterAttackSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = [];
    let stage: WeaponAttackOrderingProjection["stage"] = "actSelection";
    let lastResult: WeaponAttackOrderingProjection["lastResult"] = "init";
    let orderingError: WeaponAttackOrderingProjection["orderingError"] = "";

    function reset(): void {
      state = fighterVsSkeletonBattle();
      fills = [];
      holes = [];
      stage = "actSelection";
      lastResult = "init";
      orderingError = "";
    }

    function recordAccepted(
      result: BattleResolutionResult,
      nextStage: WeaponAttackOrderingProjection["stage"],
    ): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        stage = nextStage;
        orderingError = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        stage = nextStage;
        orderingError = "";
        return;
      }
      throw new Error(`Expected accepted weapon attack ordering fill.`);
    }

    function recordOrderingRejection(
      result: BattleResolutionResult,
      expectedOrderingError: Exclude<
        WeaponAttackOrderingProjection["orderingError"],
        ""
      >,
      expectedMessage: string,
    ): void {
      if (
        result.tag !== "invalid" ||
        result.reason !== "invalidFill" ||
        result.message !== expectedMessage
      ) {
        throw new Error(
          `Expected weapon attack ordering fill rejection: ${expectedMessage}`,
        );
      }
      lastResult = result.tag;
      orderingError = expectedOrderingError;
    }

    return {
      init: reset,
      doDiscoverAttack: () => {
        holes = discoverAttackHoles(state, subject);
        stage = "targetChoice";
        lastResult = "needsHoles";
        orderingError = "";
      },
      doRejectAttackRollBeforeTargetChoice: () => {
        const target = requireHole(holes, "targetChoice");
        const attackRoll = requireHole(
          holesAfterFills(state, subject, [targetFill(target, skeletonId)]),
          "attackRoll",
        );
        recordOrderingRejection(
          resolveBattleSubject({
            state,
            subject,
            fills: [attackRollFill(attackRoll, { total: 14, naturalD20: 10 })],
          }),
          "targetChoiceRequired",
          ATTACK_TARGET_REQUIRED_BEFORE_ROLL_OR_DAMAGE_MESSAGE,
        );
      },
      doFillTargetChoice: () => {
        const target = requireHole(holes, "targetChoice");
        fills = [targetFill(target, skeletonId)];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "attackRoll",
        );
      },
      doRejectDamageBeforeAttackRoll: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        const damage = requireHole(
          holesAfterFills(state, subject, [
            ...fills,
            attackRollFill(attackRoll, { total: 14, naturalD20: 10 }),
          ]),
          "rolledDice",
        );
        recordOrderingRejection(
          resolveBattleSubject({
            state,
            subject,
            fills: [...fills, damageRollFill(damage, 3)],
          }),
          "attackRollRequired",
          ATTACK_ROLL_REQUIRED_BEFORE_DAMAGE_MESSAGE,
        );
      },
      doFillAttackRollMiss: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        fills = [
          ...fills,
          attackRollFill(attackRoll, { total: 13, naturalD20: 9 }),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
        );
      },
      doFillAttackRollHit: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        fills = [
          ...fills,
          attackRollFill(attackRoll, { total: 14, naturalD20: 10 }),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "damageDice",
        );
      },
      doFillDamageDice: () => {
        const damage = requireHole(holes, "rolledDice");
        fills = [...fills, damageRollFill(damage, 3)];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
        );
      },
      step: () => {},
      getState: () =>
        projectWeaponAttackOrderingState({
          holes,
          stage,
          lastResult,
          orderingError,
        }),
    };
  });
}

export function createSaveGatedSpellOrderingDriver() {
  return defineDriver(saveGatedSpellOrderingDriverSchema, () => {
    let state = saveGatedSpellOrderingBattle("lightning_bolt", 3);
    let subject: Extract<BattleSubject, { readonly tag: "actionSpell" }> =
      lightningBoltSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = [];
    let stage: SaveGatedSpellOrderingProjection["stage"] = "actSelection";
    let lastResult: SaveGatedSpellOrderingProjection["lastResult"] = "init";
    let orderingError: SaveGatedSpellOrderingProjection["orderingError"] = "";

    function reset(): void {
      state = saveGatedSpellOrderingBattle("lightning_bolt", 3);
      subject = lightningBoltSubject();
      fills = [];
      holes = [];
      stage = "actSelection";
      lastResult = "init";
      orderingError = "";
    }

    function discoverSpell(
      spellId: "lightning_bolt" | "blindness_deafness",
      slotLevel: 2 | 3,
      procedure: "saveGatedDamage" | "saveGatedCondition",
      nextStage: SaveGatedSpellOrderingProjection["stage"],
    ): void {
      state = saveGatedSpellOrderingBattle(spellId, slotLevel);
      subject = saveGatedSpellSubject(spellId, slotLevel, procedure);
      fills = [];
      holes = discoverSaveGatedSpellHoles(state, subject, spellId);
      stage = nextStage;
      lastResult = "needsHoles";
      orderingError = "";
    }

    function recordAccepted(
      result: BattleResolutionResult,
      nextStage: SaveGatedSpellOrderingProjection["stage"],
    ): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        stage = nextStage;
        orderingError = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        stage = nextStage;
        orderingError = "";
        return;
      }
      throw new Error(
        `Expected accepted save-gated spell ordering fill, got ${result.tag}: ${
          "message" in result ? result.message : ""
        }`,
      );
    }

    function recordNeedsEarlierHole(
      result: BattleResolutionResult,
      expectedOrderingError: Exclude<
        SaveGatedSpellOrderingProjection["orderingError"],
        ""
      >,
      expectedStage: SaveGatedSpellOrderingProjection["stage"],
    ): void {
      if (result.tag !== "needsHoles") {
        throw new Error(
          "Expected save-gated spell fill to request earlier holes.",
        );
      }
      lastResult = result.tag;
      holes = result.holes;
      stage = expectedStage;
      orderingError = expectedOrderingError;
    }

    return {
      init: reset,
      doDiscoverAreaSaveDamage: () => {
        discoverSpell(
          "lightning_bolt",
          3,
          "saveGatedDamage",
          "damageSavingThrowOutcome",
        );
      },
      doSubmitDamageBeforeSavingThrow: () => {
        const savingThrow = requireHole(holes, "savingThrowOutcome");
        const damage = requireHole(
          saveGatedSpellHolesAfterFills(state, subject, [
            saveGatedSpellSavingThrowOutcomeFill(savingThrow, [
              { targetId: skeletonId, succeeded: false },
            ]),
          ]),
          "rolledDice",
        );
        recordNeedsEarlierHole(
          resolveBattleSubject({
            state,
            subject,
            fills: [
              damageRollFillWithGroups(damage, [[6, 6, 6, 6, 6, 6, 6, 6]]),
            ],
          }),
          "savingThrowRequired",
          "damageSavingThrowOutcome",
        );
      },
      doFillAreaSaveFailed: () => {
        const savingThrow = requireHole(holes, "savingThrowOutcome");
        fills = [
          saveGatedSpellSavingThrowOutcomeFill(savingThrow, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "damageDice",
        );
      },
      doFillAreaDamageDice: () => {
        const damage = requireHole(holes, "rolledDice");
        fills = [
          ...fills,
          damageRollFillWithGroups(damage, [[6, 6, 6, 6, 6, 6, 6, 6]]),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
        );
      },
      doDiscoverTargetListConditionChoice: () => {
        discoverSpell(
          "blindness_deafness",
          2,
          "saveGatedCondition",
          "targetListAndConditionChoice",
        );
      },
      doFillTargetListBeforeConditionChoice: () => {
        const targetList = requireHole(holes, "spellTargetList");
        fills = [
          spellTargetListFill(targetList, "blindness_deafness", [skeletonId]),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "conditionChoice",
        );
      },
      doFillConditionChoiceAfterTargetList: () => {
        const conditionChoice = requireHole(holes, "conditionChoice");
        fills = [
          ...fills,
          saveGatedSpellConditionChoiceFill(conditionChoice, "blinded"),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "conditionSavingThrowOutcome",
        );
      },
      doFillConditionChoiceBeforeTargetList: () => {
        const conditionChoice = requireHole(holes, "conditionChoice");
        fills = [saveGatedSpellConditionChoiceFill(conditionChoice, "blinded")];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "targetList",
        );
      },
      doFillTargetListAfterConditionChoice: () => {
        const targetList = requireHole(holes, "spellTargetList");
        fills = [
          ...fills,
          spellTargetListFill(targetList, "blindness_deafness", [skeletonId]),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "conditionSavingThrowOutcome",
        );
      },
      doFillConditionSavingThrow: () => {
        const savingThrow = requireHole(holes, "savingThrowOutcome");
        fills = [
          ...fills,
          saveGatedSpellSavingThrowOutcomeFill(savingThrow, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
        );
      },
      step: () => {},
      getState: () =>
        projectSaveGatedSpellOrderingState({
          holes,
          stage,
          lastResult,
          orderingError,
        }),
    };
  });
}

export function createSpellAttackOrderingDriver() {
  return defineDriver(spellAttackOrderingDriverSchema, () => {
    // authored-id-dispatch-allow: battle-runtime-mbt-fixture-boundary
    let state = spellAttackOrderingBattle("fire_bolt");
    let subject: Extract<BattleSubject, { readonly tag: "actionSpell" }> =
      spellAttackSubject("fire_bolt", "spellAttackDamage");
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = [];
    let stage: SpellAttackOrderingProjection["stage"] = "actSelection";
    let lastResult: SpellAttackOrderingProjection["lastResult"] = "init";
    let orderingError: SpellAttackOrderingProjection["orderingError"] = "";

    function reset(): void {
      state = spellAttackOrderingBattle("fire_bolt");
      subject = spellAttackSubject("fire_bolt", "spellAttackDamage");
      fills = [];
      holes = [];
      stage = "actSelection";
      lastResult = "init";
      orderingError = "";
    }

    function discoverSpellAttack(
      spellId: "fire_bolt" | "sorcerous_burst",
      nextStage: SpellAttackOrderingProjection["stage"],
    ): void {
      state = spellAttackOrderingBattle(spellId);
      subject = spellAttackSubject(spellId, "spellAttackDamage");
      fills = [];
      holes = discoverSpellAttackHoles(state, subject, spellId);
      stage = nextStage;
      lastResult = "needsHoles";
      orderingError = "";
    }

    function recordAccepted(
      result: BattleResolutionResult,
      nextStage: SpellAttackOrderingProjection["stage"],
    ): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        stage = nextStage;
        orderingError = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        stage = nextStage;
        orderingError = "";
        return;
      }
      throw new Error(
        `Expected accepted spell attack ordering fill, got ${result.tag}: ${
          "message" in result ? result.message : ""
        }`,
      );
    }

    function recordNeedsEarlierHole(
      result: BattleResolutionResult,
      expectedOrderingError: Exclude<
        SpellAttackOrderingProjection["orderingError"],
        ""
      >,
      expectedStage: SpellAttackOrderingProjection["stage"],
    ): void {
      if (result.tag !== "needsHoles") {
        throw new Error("Expected spell attack fill to request earlier holes.");
      }
      lastResult = result.tag;
      holes = result.holes;
      stage = expectedStage;
      orderingError = expectedOrderingError;
    }

    return {
      init: reset,
      doDiscoverSingleTargetSpellAttack: () => {
        discoverSpellAttack("fire_bolt", "targetChoice");
      },
      doSubmitAttackRollBeforeTargetChoice: () => {
        const target = requireHole(holes, "targetChoice");
        const attackRoll = requireHole(
          spellAttackHolesAfterFills(state, subject, [
            spellTargetChoiceFill(target, skeletonId, "fire_bolt"),
          ]),
          "attackRoll",
        );
        recordNeedsEarlierHole(
          resolveBattleSubject({
            state,
            subject,
            fills: [attackRollFill(attackRoll, { total: 14, naturalD20: 10 })],
          }),
          "targetRequired",
          "targetChoice",
        );
      },
      doFillTargetChoice: () => {
        const target = requireHole(holes, "targetChoice");
        fills = [spellTargetChoiceFill(target, skeletonId, "fire_bolt")];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "attackRoll",
        );
      },
      doSubmitDamageBeforeAttackRoll: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        const damage = requireHole(
          spellAttackHolesAfterFills(state, subject, [
            ...fills,
            attackRollFill(attackRoll, { total: 14, naturalD20: 10 }),
          ]),
          "rolledDice",
        );
        recordNeedsEarlierHole(
          resolveBattleSubject({
            state,
            subject,
            fills: [...fills, damageRollFill(damage, 3)],
          }),
          "attackRollRequired",
          "attackRoll",
        );
      },
      doFillAttackRollMiss: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        fills = [
          ...fills,
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
        );
      },
      doFillAttackRollHit: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        fills = [
          ...fills,
          attackRollFill(attackRoll, { total: 14, naturalD20: 10 }),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "damageDice",
        );
      },
      doFillDamageDice: () => {
        const damage = requireHole(holes, "rolledDice");
        fills = [...fills, damageRollFill(damage, 3)];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
        );
      },
      doDiscoverTypedSpellAttack: () => {
        discoverSpellAttack("sorcerous_burst", "damageTypeAndTargetChoice");
      },
      doFillDamageTypeBeforeTargetChoice: () => {
        const damageType = requireHole(holes, "damageTypeChoice");
        fills = [spellDamageTypeChoiceFill(damageType, "fire")];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "typedTargetChoice",
        );
      },
      doFillTargetChoiceBeforeDamageType: () => {
        const target = requireHole(holes, "targetChoice");
        fills = [spellTargetChoiceFill(target, skeletonId, "sorcerous_burst")];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "damageTypeChoice",
        );
      },
      doFillDamageTypeAfterTargetChoice: () => {
        const damageType = requireHole(holes, "damageTypeChoice");
        fills = [...fills, spellDamageTypeChoiceFill(damageType, "fire")];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "attackRoll",
        );
      },
      doFillTargetChoiceAfterDamageType: () => {
        const target = requireHole(holes, "targetChoice");
        fills = [
          ...fills,
          spellTargetChoiceFill(target, skeletonId, "sorcerous_burst"),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "attackRoll",
        );
      },
      step: () => {},
      getState: () =>
        projectSpellAttackOrderingState({
          holes,
          stage,
          lastResult,
          orderingError,
        }),
    };
  });
}

export function createHitPointRestorationOrderingDriver() {
  return defineDriver(hitPointRestorationOrderingDriverSchema, () => {
    let state = healingSpellOrderingBattle();
    let subject: BattleSubject = healingWordSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = [];
    let stage: HitPointRestorationOrderingProjection["stage"] = "actSelection";
    let lastResult: HitPointRestorationOrderingProjection["lastResult"] =
      "init";
    let orderingError: HitPointRestorationOrderingProjection["orderingError"] =
      "";
    let spellTargetHp = 0;
    let spellTargetZeroHpLifecycleCleared = false;
    let featureTargetHp = 0;
    let featureTargetZeroHpLifecycleCleared = false;

    function reset(): void {
      state = healingSpellOrderingBattle();
      subject = healingWordSubject();
      fills = [];
      holes = [];
      stage = "actSelection";
      lastResult = "init";
      orderingError = "";
      spellTargetHp = 0;
      spellTargetZeroHpLifecycleCleared = false;
      featureTargetHp = 0;
      featureTargetZeroHpLifecycleCleared = false;
    }

    function recordAccepted(
      result: BattleResolutionResult,
      nextStage: HitPointRestorationOrderingProjection["stage"],
    ): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        stage = nextStage;
        orderingError = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        stage = nextStage;
        orderingError = "";
        return;
      }
      throw new Error(
        `Expected accepted Hit Point restoration ordering fill, got ${
          result.tag
        }: ${"message" in result ? result.message : ""}`,
      );
    }

    function recordNeedsEarlierHole(
      result: BattleResolutionResult,
      expectedOrderingError: Exclude<
        HitPointRestorationOrderingProjection["orderingError"],
        ""
      >,
      expectedStage: HitPointRestorationOrderingProjection["stage"],
    ): void {
      if (result.tag !== "needsHoles") {
        throw new Error(
          "Expected Hit Point restoration fill to request earlier holes.",
        );
      }
      lastResult = result.tag;
      holes = result.holes;
      stage = expectedStage;
      orderingError = expectedOrderingError;
    }

    return {
      init: reset,
      doDiscoverSingleTargetSpellHealing: () => {
        state = healingSpellOrderingBattle();
        subject = healingWordSubject();
        fills = [];
        holes = healingOrderingHolesAfterFills(state, subject, []);
        stage = "spellHealingTargetChoice";
        lastResult = "needsHoles";
        orderingError = "";
        spellTargetHp = 0;
        spellTargetZeroHpLifecycleCleared = false;
      },
      doSubmitHealingRollBeforeTargetChoice: () => {
        const target = requireHole(holes, "targetChoice");
        const healingRoll = requireHole(
          healingOrderingHolesAfterFills(state, subject, [
            spellTargetChoiceFill(target, skeletonId, "healing_word"),
          ]),
          "rolledDice",
        );
        recordNeedsEarlierHole(
          resolveBattleSubject({
            state,
            subject,
            fills: [damageRollFillWithGroups(healingRoll, [[1, 1]])],
          }),
          "healingTargetRequired",
          "spellHealingTargetChoice",
        );
      },
      doFillSpellHealingTargetChoice: () => {
        const target = requireHole(holes, "targetChoice");
        fills = [spellTargetChoiceFill(target, skeletonId, "healing_word")];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "spellHealingRoll",
        );
      },
      doDiscoverTargetListSpellHealing: () => {
        state = healingTargetListSpellOrderingBattle();
        subject = massHealingWordSubject();
        fills = [];
        holes = healingOrderingHolesAfterFills(state, subject, []);
        stage = "spellHealingTargetList";
        lastResult = "needsHoles";
        orderingError = "";
        spellTargetHp = 0;
        spellTargetZeroHpLifecycleCleared = false;
      },
      doSubmitHealingRollBeforeTargetList: () => {
        const targetList = requireHole(holes, "spellTargetList");
        const healingRoll = requireHole(
          healingOrderingHolesAfterFills(state, subject, [
            spellTargetListFill(targetList, "mass_healing_word", [skeletonId]),
          ]),
          "rolledDice",
        );
        recordNeedsEarlierHole(
          resolveBattleSubject({
            state,
            subject,
            fills: [damageRollFillWithGroups(healingRoll, [[1, 1]])],
          }),
          "healingTargetRequired",
          "spellHealingTargetList",
        );
      },
      doFillSpellHealingTargetList: () => {
        const targetList = requireHole(holes, "spellTargetList");
        fills = [
          spellTargetListFill(targetList, "mass_healing_word", [skeletonId]),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "spellHealingRoll",
        );
      },
      doFillSpellHealingRoll: () => {
        const healingRoll = requireHole(holes, "rolledDice");
        fills = [...fills, damageRollFillWithGroups(healingRoll, [[1, 1]])];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
        );
        const healedTarget = snapshotCombatant(state, skeletonId);
        spellTargetHp = healedTarget.hp;
        spellTargetZeroHpLifecycleCleared =
          zeroHpLifecycleClearedByHealing(healedTarget);
      },
      doDiscoverFeatureHealingPool: () => {
        state = featureHealingPoolOrderingBattle();
        subject = preserveLifeSubject();
        fills = [];
        holes = healingOrderingHolesAfterFills(state, subject, []);
        stage = "featureHealingPoolDistribution";
        lastResult = "needsHoles";
        orderingError = "";
        featureTargetHp = 0;
        featureTargetZeroHpLifecycleCleared = false;
      },
      doFillFeatureHealingDistribution: () => {
        const distribution = requireHole(holes, "hitPointHealingDistribution");
        fills = [
          preserveLifeDistributionFill(distribution, [
            { targetId: skeletonId, hitPoints: 8 },
          ]),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
        );
        const healedTarget = snapshotCombatant(state, skeletonId);
        featureTargetHp = healedTarget.hp;
        featureTargetZeroHpLifecycleCleared =
          zeroHpLifecycleClearedByHealing(healedTarget);
      },
      step: () => {},
      getState: () =>
        projectHitPointRestorationOrderingState({
          holes,
          stage,
          lastResult,
          orderingError,
          spellTargetHp,
          spellTargetZeroHpLifecycleCleared,
          featureTargetHp,
          featureTargetZeroHpLifecycleCleared,
        }),
    };
  });
}

export function createCommandOrderingDriver() {
  return defineDriver(commandOrderingDriverSchema, () => {
    let state = commandOrderingBattle();
    let subject: BattleSubject = commandOrderingCastSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = [];
    let stage: CommandOrderingProjection["stage"] = "actSelection";
    let lastResult: CommandOrderingProjection["lastResult"] = "init";
    let orderingError: CommandOrderingProjection["orderingError"] = "";
    let pendingCommandOption: CommandOrderingPendingOption = "none";
    let droppedObjectCount = 0;

    function reset(): void {
      state = commandOrderingBattle();
      subject = commandOrderingCastSubject();
      fills = [];
      holes = [];
      stage = "actSelection";
      lastResult = "init";
      orderingError = "";
      pendingCommandOption = "none";
      droppedObjectCount = 0;
    }

    function recordAccepted(
      result: BattleResolutionResult,
      nextStage: CommandOrderingProjection["stage"],
    ): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        stage = nextStage;
        orderingError = "";
        droppedObjectCount =
          "droppedObjects" in result ? (result.droppedObjects?.length ?? 0) : 0;
        pendingCommandOption = commandPendingOption(state);
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        stage = nextStage;
        orderingError = "";
        pendingCommandOption = commandPendingOption(state);
        return;
      }
      throw new Error(
        `Expected accepted Command ordering fill, got ${result.tag}: ${
          "message" in result ? result.message : ""
        }`,
      );
    }

    function recordNeedsEarlierHole(
      result: BattleResolutionResult,
      expectedOrderingError: Exclude<
        CommandOrderingProjection["orderingError"],
        ""
      >,
      expectedStage: CommandOrderingProjection["stage"],
    ): void {
      if (result.tag !== "needsHoles") {
        throw new Error("Expected Command fill to request an earlier hole.");
      }
      lastResult = result.tag;
      holes = result.holes;
      stage = expectedStage;
      orderingError = expectedOrderingError;
      pendingCommandOption = commandPendingOption(state);
    }

    function recordInvalid(
      result: BattleResolutionResult,
      expectedOrderingError: Exclude<
        CommandOrderingProjection["orderingError"],
        ""
      >,
    ): void {
      if (result.tag !== "invalid" || result.reason !== "invalidFill") {
        throw new Error("Expected Command ordering invalid fill.");
      }
      lastResult = result.tag;
      orderingError = expectedOrderingError;
      pendingCommandOption = commandPendingOption(state);
    }

    function discoverCommand(): void {
      state = commandOrderingBattle();
      const act = commandOrderingCastAct(state);
      subject = act.subject;
      fills = [];
      holes = act.initialHoles;
      stage = "targetListAndOptionChoice";
      lastResult = "needsHoles";
      orderingError = "";
      pendingCommandOption = "none";
      droppedObjectCount = 0;
    }

    function startRuntimeCommand(
      option: Exclude<CommandOrderingPendingOption, "none">,
      input: CommandTargetTurnInput = {},
    ): void {
      state = commandTargetTurn(option, input);
      const act = commandRuntimeAct(state, option);
      subject = act.subject;
      fills = [];
      holes = act.initialHoles;
      lastResult = holes.length === 0 ? "resolved" : "needsHoles";
      orderingError = "";
      pendingCommandOption = commandPendingOption(state);
      droppedObjectCount = 0;
    }

    return {
      init: reset,
      doDiscoverCommand: discoverCommand,
      doSubmitOptionBeforeTargetList: () => {
        const commandOption = requireHole(holes, "commandOptionChoice");
        recordNeedsEarlierHole(
          resolveBattleSubject({
            state,
            subject,
            fills: [commandOptionFill(commandOption, "grovel")],
          }),
          "commandTargetListRequired",
          "targetList",
        );
      },
      doFillTargetList: () => {
        const targetList = requireHole(holes, "spellTargetList");
        fills = [spellTargetListFill(targetList, "command", [skeletonId])];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "optionChoice",
        );
      },
      doSubmitSavingThrowBeforeOption: () => {
        const commandOption = requireHole(holes, "commandOptionChoice");
        if (subject.tag !== "actionSpell") {
          throw new Error("Expected Command cast subject.");
        }
        const savingThrow = requireHole(
          commandHolesAfterFills(state, subject, [
            ...fills,
            commandOptionFill(commandOption, "grovel"),
          ]),
          "savingThrowOutcome",
        );
        recordNeedsEarlierHole(
          resolveBattleSubject({
            state,
            subject,
            fills: [
              ...fills,
              saveGatedSpellSavingThrowOutcomeFill(savingThrow, [
                { targetId: skeletonId, succeeded: false },
              ]),
            ],
          }),
          "commandOptionChoiceRequired",
          "optionChoice",
        );
      },
      doFillGrovelOption: () => {
        const commandOption = requireHole(holes, "commandOptionChoice");
        fills = [...fills, commandOptionFill(commandOption, "grovel")];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "savingThrowOutcome",
        );
      },
      doFillFailedGrovelSavingThrow: () => {
        const savingThrow = requireHole(holes, "savingThrowOutcome");
        fills = [
          ...fills,
          saveGatedSpellSavingThrowOutcomeFill(savingThrow, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
        );
      },
      doFollowGrovel: () => {
        const targetTurn = requireResolved(
          resolveBattleSubject({
            state,
            subject: endTurnSubjectFor(fighterId),
            fills: [],
          }),
        ).state;
        const command = commandRuntimeAct(targetTurn, "grovel");
        recordAccepted(
          resolveBattleSubject({
            state: targetTurn,
            subject: command.subject,
            fills: [],
          }),
          "resolved",
        );
      },
      doDropNeedsHeldObjectFacts: () => {
        startRuntimeCommand("drop");
        stage = "dropHeldObjectFacts";
        lastResult = "needsHoles";
      },
      doFillDropHeldObjectFacts: () => {
        const heldObjectFacts = requireHole(holes, "heldObjectFacts");
        fills = [
          {
            kind: "heldObjectFacts",
            holeId: heldObjectFacts.holeId,
            value: {
              objectIds: [
                battleObjectId("command-ordering:main-hand"),
                battleObjectId("command-ordering:off-hand"),
              ],
            },
          },
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
        );
      },
      doHaltSuppresses: () => {
        state = commandTargetTurn("halt");
        subject = endTurnSubjectFor(skeletonId);
        fills = [];
        holes = [];
        stage = "resolved";
        lastResult = "resolved";
        orderingError = "";
        pendingCommandOption = commandPendingOption(state);
        droppedObjectCount = 0;
      },
      doApproachMovementContinues: () => {
        startRuntimeCommand("approach");
        stage = "approachMovement";
      },
      doFillApproachMovementContinues: () => {
        const movement = requireHole(holes, "movement");
        fills = [
          commandApproachMovementFill(movement, {
            movementCostFeet: 10,
            movedWithinFiveFeetOfCaster: false,
          }),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
        );
      },
      doFillApproachMovementWithinFive: () => {
        const movement = requireHole(holes, "movement");
        fills = [
          commandApproachMovementFill(movement, {
            movementCostFeet: 10,
            movedWithinFiveFeetOfCaster: true,
          }),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
        );
      },
      doApproachNoMovement: () => {
        startRuntimeCommand("approach", { grappledByCaster: true });
        recordAccepted(
          resolveBattleSubject({ state, subject, fills: [] }),
          "resolved",
        );
      },
      doFleeMovement: () => {
        startRuntimeCommand("flee");
        stage = "fleeMovement";
      },
      doFillFleeMovement: () => {
        const movement = requireHole(holes, "movement");
        fills = [
          commandFleeMovementFill(movement, {
            movementCostFeet: 30,
            provokedOpportunityAttacks: [],
          }),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
        );
      },
      doRejectFleePartialMovement: () => {
        const movement = requireHole(holes, "movement");
        recordInvalid(
          resolveBattleSubject({
            state,
            subject,
            fills: [
              commandFleeMovementFill(movement, {
                movementCostFeet: 10,
                provokedOpportunityAttacks: [],
              }),
            ],
          }),
          "commandMovementRequired",
        );
      },
      doFleeNoMovement: () => {
        startRuntimeCommand("flee", { grappledByCaster: true });
        recordAccepted(
          resolveBattleSubject({ state, subject, fills: [] }),
          "resolved",
        );
      },
      doFleeOpportunityAttack: () => {
        const movement = requireHole(holes, "movement");
        fills = [
          commandFleeMovementFill(movement, {
            movementCostFeet: 30,
            provokedOpportunityAttacks: [
              { reactorId: fighterId, attackName: "Unarmed Strike" },
            ],
          }),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
        );
      },
      step: () => {},
      getState: () =>
        projectCommandOrderingState({
          state,
          holes,
          stage,
          lastResult,
          orderingError,
          pendingCommandOption,
          droppedObjectCount,
        }),
    };
  });
}

export function createExtraAttackDriver(
  unitId: ExtraAttackMbtUnitId = "fighter_extra_attack",
  schema: typeof extraAttackDriverSchema = extraAttackDriverSchema,
) {
  return defineDriver(schema, () => {
    let state = extraAttackBattle(unitId);
    let currentUnitId = unitId;
    let subject: BattleSubject = fighterAttackSubject();
    let lastResult: ExtraAttackMbtProjection["lastResult"] = "init";
    let lastInvalidReason: ExtraAttackMbtProjection["lastInvalidReason"] = "";

    function resetUnit(nextUnitId: ExtraAttackMbtUnitId): void {
      currentUnitId = nextUnitId;
      state = extraAttackBattle(nextUnitId);
      subject = fighterAttackSubject();
      lastResult = "init";
      lastInvalidReason = "";
    }

    function recordResult(result: BattleResolutionResult): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        lastInvalidReason = "";
        return;
      }
      lastInvalidReason = mbtInvalidReason(result.reason);
    }

    function resolveAttackMiss(): void {
      recordExtraAttackBoundaryFromState(state, currentUnitId);
      subject = fighterAttackSubject();
      const target = requireHole(
        discoverAttackHoles(state, subject),
        "targetChoice",
      );
      const targetChoice = targetFill(target, skeletonId);
      const attackRoll = requireHole(
        holesAfterFills(state, subject, [targetChoice]),
        "attackRoll",
      );
      recordResult(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            targetChoice,
            attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
          ],
        }),
      );
      recordExtraAttackBoundaryFromState(state, currentUnitId);
    }

    return {
      init: () => {
        resetUnit(unitId);
      },
      initOneAdditionalAttack: () => {
        resetUnit(extraAttackMbtUnitIdForAdditionalAttacks(1));
      },
      initTwoAdditionalAttacks: () => {
        resetUnit(extraAttackMbtUnitIdForAdditionalAttacks(2));
      },
      initThreeAdditionalAttacks: () => {
        resetUnit(extraAttackMbtUnitIdForAdditionalAttacks(3));
      },
      doResolveFirstExtraAttackMiss: resolveAttackMiss,
      doMoveBetweenExtraAttackSlots: () => {
        subject = moveSubject();
        const result = resolveBattleSubject({ state, subject, fills: [] });
        if (result.tag !== "needsHoles") {
          recordResult(result);
          return;
        }
        const movement = requireHole(result.holes, "movement");
        recordResult(
          resolveBattleSubject({
            state,
            subject,
            fills: [movementFill(movement, { movementCostFeet: 5 })],
          }),
        );
      },
      doResolveSecondExtraAttackMiss: resolveAttackMiss,
      doRejectThirdExtraAttack: () => {
        subject = fighterAttackSubject();
        recordResult(resolveBattleSubject({ state, subject, fills: [] }));
      },
      doEndTurnClosesExtraAttackSlot: () => {
        subject = endTurnSubject();
        recordResult(resolveBattleSubject({ state, subject, fills: [] }));
      },
      step: () => {},
      getState: () =>
        projectExtraAttackMbtState({
          state,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

export function createMagicMissileDriver() {
  return defineDriver(magicMissileDriverSchema, () => {
    let state = fighterVsSkeletonBattle();
    const subject = magicMissileSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = discoverMagicMissileHoles(
      state,
      subject,
    );
    let lastResult: MbtProjection["lastResult"] = "init";
    let lastInvalidReason: MbtProjection["lastInvalidReason"] = "";

    function reset(): void {
      state = fighterVsSkeletonBattle();
      fills = [];
      holes = discoverMagicMissileHoles(state, subject);
      lastResult = "init";
      lastInvalidReason = "";
    }

    function submit(nextFills: readonly BattleFill[]): void {
      fills = fillsWithMbtSpellCastReactionFacts(holes, nextFills);
      const result = resolveBattleSubject({ state, subject, fills });
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastInvalidReason = "";
        return;
      }
      lastInvalidReason = mbtInvalidReason(result.reason);
    }

    return {
      init: reset,
      doFillMagicMissileAllocation: () => {
        const allocation = requireHole(holes, "spellTargetAllocation");
        submit([spellTargetAllocationFill(allocation, skeletonId, 3)]);
      },
      doFillMagicMissileDamage: ({ dartRollTotal }) => {
        const damage = requireHole(holes, "rolledDice");
        submit([
          ...fills,
          damageRollFillWithGroups(damage, [
            magicMissileDamageRollGroup(dartRollTotal),
          ]),
        ]);
      },
      step: () => {},
      getState: () =>
        projectMbtState({
          state,
          holes,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

export function createReducerSpineContractDriver() {
  return defineDriver(reducerSpineContractDriverSchema, () => {
    let state: BattleState | null = null;
    let subject: BattleSubject = magicMissileSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = [];
    let stage: ReducerSpineContractProjection["stage"] = "notStarted";
    let entrypoint: ReducerSpineContractProjection["entrypoint"] = "none";
    let subjectKind: ReducerSpineContractProjection["subject"] = "none";
    let lastResult: ReducerSpineContractProjection["lastResult"] = "init";
    let lastInvalidReason: ReducerSpineContractProjection["lastInvalidReason"] =
      "";

    function reset(): void {
      state = null;
      subject = magicMissileSubject();
      fills = [];
      holes = [];
      stage = "notStarted";
      entrypoint = "none";
      subjectKind = "none";
      lastResult = "init";
      lastInvalidReason = "";
    }

    function requireStartedState(): BattleState {
      if (state === null) {
        throw new Error("Expected reducer-spine battle state to be started.");
      }
      return state;
    }

    function recordAccepted(
      result: BattleResolutionResult,
      nextStage: ReducerSpineContractProjection["stage"],
    ): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        stage = nextStage;
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        stage = nextStage;
        lastInvalidReason = "";
        return;
      }
      throw new Error(
        `Expected accepted reducer-spine result, got ${result.tag}: ${
          "message" in result ? result.message : ""
        }`,
      );
    }

    return {
      init: reset,
      doStartBattle: () => {
        state = fighterVsSkeletonBattle();
        subject = magicMissileSubject();
        fills = [];
        holes = [];
        stage = "battleStarted";
        entrypoint = "startBattle";
        subjectKind = "none";
        lastResult = "resolved";
        lastInvalidReason = "";
      },
      doDiscoverSlotSpell: () => {
        state = requireStartedState();
        const spellSubject = magicMissileSubject();
        subject = spellSubject;
        fills = [];
        holes = discoverMagicMissileHoles(state, spellSubject);
        stage = "actDiscovered";
        entrypoint = "discoverBattleActs";
        subjectKind = "slotSpell";
        lastResult = "needsHoles";
        lastInvalidReason = "";
      },
      doResolveSlotSpellTargets: () => {
        const allocation = requireHole(holes, "spellTargetAllocation");
        fills = fillsWithMbtSpellCastReactionFacts(holes, [
          spellTargetAllocationFill(allocation, skeletonId, 3),
        ]);
        recordAccepted(
          resolveBattleSubject({
            state: requireStartedState(),
            subject,
            fills,
          }),
          "subjectNeedsHoles",
        );
        entrypoint = "resolveBattleSubject";
        subjectKind = "slotSpell";
      },
      doResolveSlotSpellDamage: () => {
        const damage = requireHole(holes, "rolledDice");
        fills = [
          ...fills,
          damageRollFillWithGroups(damage, [magicMissileDamageRollGroup(3)]),
        ];
        recordAccepted(
          resolveBattleSubject({
            state: requireStartedState(),
            subject,
            fills,
          }),
          "subjectResolved",
        );
        entrypoint = "resolveBattleSubject";
        subjectKind = "slotSpell";
      },
      doEndTurnToTarget: () => {
        subject = endTurnSubjectFor(fighterId);
        fills = [];
        recordAccepted(
          resolveBattleSubject({
            state: requireStartedState(),
            subject,
            fills,
          }),
          "turnAdvanced",
        );
        entrypoint = "resolveBattleSubject";
        subjectKind = "endTurn";
      },
      doDiscoverWeaponAttack: () => {
        state = requireStartedState();
        const attackSubject = skeletonShortswordSubject();
        subject = attackSubject;
        fills = [];
        holes = discoverAttackHoles(state, attackSubject);
        stage = "actDiscovered";
        entrypoint = "discoverBattleActs";
        subjectKind = "weaponAttack";
        lastResult = "needsHoles";
        lastInvalidReason = "";
      },
      doResolveWeaponTarget: () => {
        const target = requireHole(holes, "targetChoice");
        fills = [targetFill(target, fighterId)];
        recordAccepted(
          resolveBattleSubject({
            state: requireStartedState(),
            subject,
            fills,
          }),
          "subjectNeedsHoles",
        );
        entrypoint = "resolveBattleSubject";
        subjectKind = "weaponAttack";
      },
      doResolveWeaponAttackHit: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        fills = [
          ...fills,
          attackRollFill(attackRoll, { total: 18, naturalD20: 14 }),
        ];
        recordAccepted(
          resolveBattleSubject({
            state: requireStartedState(),
            subject,
            fills,
          }),
          "subjectNeedsHoles",
        );
        entrypoint = "resolveBattleSubject";
        subjectKind = "weaponAttack";
      },
      doResolveWeaponDamage: () => {
        const damage = requireHole(holes, "rolledDice");
        fills = [...fills, damageRollFill(damage, 3)];
        recordAccepted(
          resolveBattleSubject({
            state: requireStartedState(),
            subject,
            fills,
          }),
          "subjectResolved",
        );
        entrypoint = "resolveBattleSubject";
        subjectKind = "weaponAttack";
      },
      step: () => {},
      getState: () =>
        projectReducerSpineContractState({
          state,
          holes,
          stage,
          entrypoint,
          subject: subjectKind,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

function magicMissileDamageRollGroup(
  dartRollTotal: number,
): readonly [number, number, number] {
  if (dartRollTotal === 3) {
    return [1, 1, 1];
  }
  if (dartRollTotal === 12) {
    return [4, 4, 4];
  }
  throw new Error(`Unexpected Magic Missile dart roll total ${dartRollTotal}.`);
}

export function createScalarBuffDriver() {
  return defineDriver(scalarBuffDriverSchema, () => {
    let state = scalarBuffBattle();
    let subject: BattleSubject = longstriderSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = discoverLongstriderHoles(state, subject);
    let lastResult: ScalarBuffMbtProjection["lastResult"] = "init";
    let lastInvalidReason: ScalarBuffMbtProjection["lastInvalidReason"] = "";

    function reset(): void {
      state = scalarBuffBattle();
      subject = longstriderSubject();
      fills = [];
      holes = discoverLongstriderHoles(state, subject);
      lastResult = "init";
      lastInvalidReason = "";
    }

    function recordResult(result: BattleResolutionResult): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastInvalidReason = "";
        return;
      }
      lastInvalidReason = mbtInvalidReason(result.reason);
    }

    return {
      init: reset,
      doFillLongstriderTarget: () => {
        const target = requireHole(holes, "targetChoice");
        fills = [spellTargetChoiceFill(target, skeletonId, "longstrider")];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doRejectStaleAfterResolved: () => {
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      step: () => {},
      getState: () =>
        projectScalarBuffMbtState({
          state,
          holes,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

export function createAdrenalineRushDriver(
  schema: typeof adrenalineRushDriverSchema = adrenalineRushDriverSchema,
) {
  return defineDriver(schema, () => {
    let state = adrenalineRushBattle();
    let lastResult: AdrenalineRushMbtProjection["lastResult"] = "init";
    let lastInvalidReason: AdrenalineRushMbtProjection["lastInvalidReason"] =
      "";

    function reset(): void {
      state = adrenalineRushBattle();
      lastResult = "init";
      lastInvalidReason = "";
    }

    function recordResult(result: BattleResolutionResult): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        lastInvalidReason = "";
        return;
      }
      lastInvalidReason = mbtInvalidReason(result.reason);
    }

    return {
      init: reset,
      doAdrenalineRushDash: () => {
        recordResult(
          resolveBattleSubject({
            state,
            subject: adrenalineRushDashSubject(),
            fills: [],
          }),
        );
      },
      doRejectSecondDash: () => {
        recordResult(
          resolveBattleSubject({
            state,
            subject: adrenalineRushDashSubject(),
            fills: [],
          }),
        );
      },
      step: () => {},
      getState: () =>
        projectAdrenalineRushMbtState({
          state,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

export function createRogueSteadyAimDriver(
  schema: typeof rogueSteadyAimDriverSchema = rogueSteadyAimDriverSchema,
) {
  return defineDriver(schema, () => {
    let state = rogueSteadyAimBattle();
    let lastResult: RogueSteadyAimMbtProjection["lastResult"] = "init";
    let lastInvalidReason: RogueSteadyAimMbtProjection["lastInvalidReason"] =
      "";

    function reset(): void {
      state = rogueSteadyAimBattle();
      lastResult = "init";
      lastInvalidReason = "";
    }

    function recordResult(result: BattleResolutionResult): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        lastInvalidReason = "";
        return;
      }
      lastInvalidReason = mbtInvalidReason(result.reason);
    }

    function resolveAttack(): void {
      const subject = fighterAttackSubject();
      const targetHole = requireHole(
        discoverAttackHoles(state, subject),
        "targetChoice",
      );
      const target = targetFill(targetHole, skeletonId);
      const attackRollHole = requireHole(
        holesAfterFills(state, subject, [target]),
        "attackRoll",
      );
      const attackRoll = attackRollFill(attackRollHole, {
        total: 16,
        naturalD20: 11,
        rollMode: "advantage",
      });
      const damageHole = requireHole(
        holesAfterFills(state, subject, [target, attackRoll]),
        "rolledDice",
      );
      recordResult(
        resolveBattleSubject({
          state,
          subject,
          fills: [target, attackRoll, damageRollFill(damageHole, 4)],
        }),
      );
    }

    return {
      init: reset,
      doSteadyAim: () => {
        recordResult(
          resolveBattleSubject({
            state,
            subject: rogueSteadyAimSubject(),
            fills: [],
          }),
        );
      },
      doRejectAfterMoved: () => {
        state = rogueSteadyAimBattleWithMovementSpent();
        recordResult(
          resolveBattleSubject({
            state,
            subject: rogueSteadyAimSubject(),
            fills: [],
          }),
        );
      },
      doRejectSecondAim: () => {
        recordResult(
          resolveBattleSubject({
            state,
            subject: rogueSteadyAimSubject(),
            fills: [],
          }),
        );
      },
      doAttackConsumesAdvantage: resolveAttack,
      doEndTurnCleanup: () => {
        recordResult(
          resolveBattleSubject({
            state,
            subject: endTurnSubject(),
            fills: [],
          }),
        );
        if (lastResult === "resolved") {
          recordResult(
            resolveBattleSubject({
              state,
              subject: endTurnSubjectFor(skeletonId),
              fills: [],
            }),
          );
        }
      },
      step: () => {},
      getState: () =>
        projectRogueSteadyAimMbtState({
          state,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

function normalizeQuintState(raw: unknown): MbtProjection {
  const root = quintStateRecord(raw);
  const state = Object.hasOwn(root, "qState")
    ? quintRecordField(root, "qState")
    : root;
  const protocolField = Object.hasOwn(state, "qProtocol")
    ? "qProtocol"
    : Object.hasOwn(state, "protocol")
      ? "protocol"
      : undefined;
  const protocol = decodeWitnessProtocolState({
    state,
    ...(protocolField === undefined ? {} : { protocolField }),
    noInvalidReason: "",
    decodeHole: holeName,
  });

  return {
    skeletonHp: numberFromQuintInt(state["qSkeletonHp"], "qSkeletonHp"),
    skeletonDead: booleanField(state, "qSkeletonDead"),
    actionAvailable: booleanField(state, "qActionAvailable"),
    multiattackDispatchesAvailable: numberFromQuintInt(
      state["qMultiattackDispatchesAvailable"],
      "qMultiattackDispatchesAvailable",
    ),
    sneakAttackUsedThisTurn: booleanField(state, "qSneakAttackUsedThisTurn"),
    holes: protocol.holes,
    lastResult: mbtLastResult(protocol.lastResult),
    lastInvalidReason: mbtLastInvalidReason(protocol.lastInvalidReason),
  };
}

function normalizeWeaponAttackOrderingQuintState(
  raw: unknown,
): WeaponAttackOrderingProjection {
  const state = quintStateRecord(raw);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "qProtocol",
    noInvalidReason: "",
    decodeHole: weaponAttackOrderingHole,
    compareHoles: (left, right) => left.localeCompare(right),
  });

  return {
    stage: weaponAttackOrderingStage(state["qStage"]),
    holes: protocol.holes,
    lastResult: mbtLastResult(protocol.lastResult),
    orderingError: weaponAttackOrderingError(state["qLastOrderingError"]),
  };
}

function normalizeSaveGatedSpellOrderingQuintState(
  raw: unknown,
): SaveGatedSpellOrderingProjection {
  const state = quintStateRecord(raw);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "qProtocol",
    noInvalidReason: "",
    decodeHole: saveGatedSpellOrderingHole,
    compareHoles: (left, right) => left.localeCompare(right),
  });

  return {
    stage: saveGatedSpellOrderingStage(state["qStage"]),
    holes: protocol.holes,
    lastResult: mbtLastResult(protocol.lastResult),
    orderingError: saveGatedSpellOrderingError(state["qLastOrderingError"]),
  };
}

function normalizeSpellAttackOrderingQuintState(
  raw: unknown,
): SpellAttackOrderingProjection {
  const state = quintStateRecord(raw);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "qProtocol",
    noInvalidReason: "",
    decodeHole: spellAttackOrderingHole,
    compareHoles: (left, right) => left.localeCompare(right),
  });

  return {
    stage: spellAttackOrderingStage(state["qStage"]),
    holes: protocol.holes,
    lastResult: mbtLastResult(protocol.lastResult),
    orderingError: spellAttackOrderingError(state["qLastOrderingError"]),
  };
}

function normalizeHitPointRestorationOrderingQuintState(
  raw: unknown,
): HitPointRestorationOrderingProjection {
  const state = quintStateRecord(raw);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "qProtocol",
    noInvalidReason: "",
    decodeHole: hitPointRestorationOrderingHole,
    compareHoles: (left, right) => left.localeCompare(right),
  });

  return {
    stage: hitPointRestorationOrderingStage(state["qStage"]),
    holes: protocol.holes,
    lastResult: mbtLastResult(protocol.lastResult),
    orderingError: hitPointRestorationOrderingError(
      state["qLastOrderingError"],
    ),
    spellTargetHp: numberFromQuintInt(
      state["qSpellTargetHp"],
      "qSpellTargetHp",
    ),
    spellTargetZeroHpLifecycleCleared: booleanField(
      state,
      "qSpellTargetZeroHpLifecycleCleared",
    ),
    featureTargetHp: numberFromQuintInt(
      state["qFeatureTargetHp"],
      "qFeatureTargetHp",
    ),
    featureTargetZeroHpLifecycleCleared: booleanField(
      state,
      "qFeatureTargetZeroHpLifecycleCleared",
    ),
  };
}

function normalizeCommandOrderingQuintState(
  raw: unknown,
): CommandOrderingProjection {
  const state = quintStateRecord(raw);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "qProtocol",
    noInvalidReason: "",
    decodeHole: commandOrderingHole,
    compareHoles: (left, right) => left.localeCompare(right),
  });

  return {
    stage: commandOrderingStage(state["qStage"]),
    holes: protocol.holes,
    tableFactFrontierOpen: booleanField(state, "qTableFactFrontierOpen"),
    lastResult: mbtLastResult(protocol.lastResult),
    orderingError: commandOrderingError(state["qLastOrderingError"]),
    pendingCommandOption: commandOrderingPendingOption(
      state["qPendingCommandOption"],
    ),
    targetProne: booleanField(state, "qTargetProne"),
    droppedObjectCount: numberFromQuintInt(
      state["qDroppedObjectCount"],
      "qDroppedObjectCount",
    ),
    haltSuppressed: booleanField(state, "qHaltSuppressed"),
    movementSpentFeet: numberFromQuintInt(
      state["qMovementSpentFeet"],
      "qMovementSpentFeet",
    ),
    currentActor: commandOrderingActor(state["qCurrentActor"]),
    reactionWindowOpen: booleanField(state, "qReactionWindowOpen"),
  };
}

function normalizeReducerSpineContractQuintState(
  raw: unknown,
): ReducerSpineContractProjection {
  const state = quintStateRecord(raw);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "qProtocol",
    noInvalidReason: "",
    decodeHole: reducerSpineContractHole,
    compareHoles: (left, right) => left.localeCompare(right),
  });

  return {
    stage: reducerSpineContractStage(state["qStage"]),
    entrypoint: reducerSpineContractEntrypoint(state["qEntrypoint"]),
    subject: reducerSpineContractSubject(state["qSubject"]),
    currentActor: reducerSpineContractActor(state["qCurrentActor"]),
    holes: protocol.holes,
    lastResult: mbtLastResult(protocol.lastResult),
    lastInvalidReason: mbtLastInvalidReason(protocol.lastInvalidReason),
    actionAvailable: booleanField(state, "qActionAvailable"),
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    casterReactionAvailable: booleanField(state, "qCasterReactionAvailable"),
    targetReactionAvailable: booleanField(state, "qTargetReactionAvailable"),
    spellSlotUse: reducerSpineContractSpellSlotUse(state["qSpellSlotUse"]),
    interruptDepth: numberFromQuintInt(
      state["qInterruptDepth"],
      "qInterruptDepth",
    ),
    casterHp: numberFromQuintInt(state["qCasterHp"], "qCasterHp"),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
  };
}

function normalizeExtraAttackQuintState(
  raw: unknown,
): ExtraAttackMbtProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: extraAttackUnexpectedHole,
  });
  if (protocol.holes.length !== 0) {
    throw new Error("Expected Extra Attack witness holes to be empty.");
  }

  return {
    skeletonHp: numberFromQuintInt(state["qSkeletonHp"], "qSkeletonHp"),
    actionAvailable: booleanField(state, "qActionAvailable"),
    extraAttackSlotsAvailable: numberFromQuintInt(
      state["qExtraAttackSlotsAvailable"],
      "qExtraAttackSlotsAvailable",
    ),
    movementSpentFeet: numberFromQuintInt(
      state["qMovementSpentFeet"],
      "qMovementSpentFeet",
    ),
    lastResult: mbtLastResult(protocol.lastResult),
    lastInvalidReason: mbtLastInvalidReason(protocol.lastInvalidReason),
  };
}

function extraAttackUnexpectedHole(raw: unknown): never {
  throw new Error(`Unexpected Extra Attack witness hole ${String(raw)}.`);
}

function normalizeAdrenalineRushQuintState(
  raw: unknown,
): AdrenalineRushMbtProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: adrenalineRushUnexpectedHole,
  });
  if (protocol.holes.length !== 0) {
    throw new Error("Expected Adrenaline Rush witness holes to be empty.");
  }

  return {
    actorTempHp: numberFromQuintInt(state["qActorTempHp"], "qActorTempHp"),
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    dashBonusFeet: numberFromQuintInt(
      state["qDashBonusFeet"],
      "qDashBonusFeet",
    ),
    featureUsesRemaining: numberFromQuintInt(
      state["qFeatureUsesRemaining"],
      "qFeatureUsesRemaining",
    ),
    lastResult: protocol.lastResult,
    lastInvalidReason: mbtLastInvalidReason(protocol.lastInvalidReason),
  };
}

function adrenalineRushUnexpectedHole(raw: unknown): never {
  throw new Error(
    `Adrenaline Rush witness does not expect holes; received ${String(raw)}.`,
  );
}

function normalizeRogueSteadyAimQuintState(
  raw: unknown,
): RogueSteadyAimMbtProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: rogueSteadyAimUnexpectedHole,
  });
  if (protocol.holes.length !== 0) {
    throw new Error("Expected Rogue Steady Aim witness holes to be empty.");
  }

  return {
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    actorSpeedFeet: numberFromQuintInt(
      state["qActorSpeedFeet"],
      "qActorSpeedFeet",
    ),
    nextAttackAdvantageActive: booleanField(
      state,
      "qNextAttackAdvantageActive",
    ),
    speedZeroActive: booleanField(state, "qSpeedZeroActive"),
    attackRollMode: booleanField(state, "qAttackRollAdvantage")
      ? "advantage"
      : "normal",
    lastResult: mbtLastResult(protocol.lastResult),
    lastInvalidReason: mbtLastInvalidReason(protocol.lastInvalidReason),
  };
}

function rogueSteadyAimUnexpectedHole(raw: unknown): never {
  throw new Error(
    `Rogue Steady Aim witness does not expect holes; received ${String(raw)}.`,
  );
}

function normalizeScalarBuffQuintState(raw: unknown): ScalarBuffMbtProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: holeName,
    compareHoles: (left, right) => left.localeCompare(right),
  });

  return {
    fighterSpeed: numberFromQuintInt(
      state["fighterSpeed"],
      "qState.fighterSpeed",
    ),
    goblinSpeed: numberFromQuintInt(state["goblinSpeed"], "qState.goblinSpeed"),
    actionAvailable: booleanField(state, "actionAvailable"),
    holes: protocol.holes,
    lastResult: mbtLastResult(protocol.lastResult),
    lastInvalidReason: mbtLastInvalidReason(protocol.lastInvalidReason),
  };
}

function compareState(spec: MbtProjection, impl: MbtProjection): boolean {
  expect(impl).toEqual(spec);
  return true;
}

function mbtInvalidReason(
  reason: Extract<
    BattleResolutionResult,
    { readonly tag: "invalid" }
  >["reason"],
): MbtProjection["lastInvalidReason"] {
  if (
    reason === "invalidFill" ||
    reason === "staleSubject" ||
    reason === "wrongActor"
  ) {
    return reason;
  }

  throw new Error(`Unexpected battle-runtime MBT invalid reason: ${reason}`);
}

export const battleRuntimeStateCheck = stateCheck(
  normalizeQuintState,
  compareState,
);
export const weaponAttackOrderingStateCheck = stateCheck(
  normalizeWeaponAttackOrderingQuintState,
  (
    spec: WeaponAttackOrderingProjection,
    impl: WeaponAttackOrderingProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
export const saveGatedSpellOrderingStateCheck = stateCheck(
  normalizeSaveGatedSpellOrderingQuintState,
  (
    spec: SaveGatedSpellOrderingProjection,
    impl: SaveGatedSpellOrderingProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
export const spellAttackOrderingStateCheck = stateCheck(
  normalizeSpellAttackOrderingQuintState,
  (
    spec: SpellAttackOrderingProjection,
    impl: SpellAttackOrderingProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
export const hitPointRestorationOrderingStateCheck = stateCheck(
  normalizeHitPointRestorationOrderingQuintState,
  (
    spec: HitPointRestorationOrderingProjection,
    impl: HitPointRestorationOrderingProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
export const commandOrderingStateCheck = stateCheck(
  normalizeCommandOrderingQuintState,
  (spec: CommandOrderingProjection, impl: CommandOrderingProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
export const reducerSpineContractStateCheck = stateCheck(
  normalizeReducerSpineContractQuintState,
  (
    spec: ReducerSpineContractProjection,
    impl: ReducerSpineContractProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
export const extraAttackStateCheck = stateCheck(
  normalizeExtraAttackQuintState,
  (spec: ExtraAttackMbtProjection, impl: ExtraAttackMbtProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
export const adrenalineRushStateCheck = stateCheck(
  normalizeAdrenalineRushQuintState,
  (spec: AdrenalineRushMbtProjection, impl: AdrenalineRushMbtProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
export const rogueSteadyAimStateCheck = stateCheck(
  normalizeRogueSteadyAimQuintState,
  (spec: RogueSteadyAimMbtProjection, impl: RogueSteadyAimMbtProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
export const scalarBuffStateCheck = stateCheck(
  normalizeScalarBuffQuintState,
  (spec: ScalarBuffMbtProjection, impl: ScalarBuffMbtProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
function projectMbtState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastResult: MbtProjection["lastResult"];
  readonly lastInvalidReason: MbtProjection["lastInvalidReason"];
}): MbtProjection {
  const snapshot = snapshotBattle(input.state);
  const skeleton = snapshot.combatants.find(
    (combatant) => combatant.combatantId === skeletonId,
  );
  if (skeleton == null) {
    throw new Error("Expected Skeleton in battle snapshot.");
  }

  return {
    skeletonHp: skeleton.hp,
    skeletonDead:
      skeleton.zeroHpLifecycle.policy === "diesAtZeroHp" &&
      skeleton.zeroHpLifecycle.dead,
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    multiattackDispatchesAvailable: snapshot.turn.actionResources.filter(
      (resource) =>
        resource.source === "statBlockMultiattack" &&
        resource.sourceOwnerId === skeletonId,
    ).length,
    sneakAttackUsedThisTurn: snapshot.turn.attackDamageRidersUsedThisTurn.some(
      (usage) =>
        // authored-id-dispatch-allow: battle-runtime-mbt-fixture-boundary
        usage.attackerId === fighterId && usage.unitId === "rogue_sneak_attack",
    ),
    holes: projectHoles(input.holes),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function projectWeaponAttackOrderingState(input: {
  readonly holes: readonly BattleHole[];
  readonly stage: WeaponAttackOrderingProjection["stage"];
  readonly lastResult: WeaponAttackOrderingProjection["lastResult"];
  readonly orderingError: WeaponAttackOrderingProjection["orderingError"];
}): WeaponAttackOrderingProjection {
  return {
    stage: input.stage,
    holes: input.holes.map(weaponAttackOrderingHoleFromRuntime).sort(),
    lastResult: input.lastResult,
    orderingError: input.orderingError,
  };
}

function projectSaveGatedSpellOrderingState(input: {
  readonly holes: readonly BattleHole[];
  readonly stage: SaveGatedSpellOrderingProjection["stage"];
  readonly lastResult: SaveGatedSpellOrderingProjection["lastResult"];
  readonly orderingError: SaveGatedSpellOrderingProjection["orderingError"];
}): SaveGatedSpellOrderingProjection {
  return {
    stage: input.stage,
    holes: input.holes.map(saveGatedSpellOrderingHoleFromRuntime).sort(),
    lastResult: input.lastResult,
    orderingError: input.orderingError,
  };
}

function projectSpellAttackOrderingState(input: {
  readonly holes: readonly BattleHole[];
  readonly stage: SpellAttackOrderingProjection["stage"];
  readonly lastResult: SpellAttackOrderingProjection["lastResult"];
  readonly orderingError: SpellAttackOrderingProjection["orderingError"];
}): SpellAttackOrderingProjection {
  return {
    stage: input.stage,
    holes: input.holes.flatMap(spellAttackOrderingHoleFromRuntime).sort(),
    lastResult: input.lastResult,
    orderingError: input.orderingError,
  };
}

function projectHitPointRestorationOrderingState(input: {
  readonly holes: readonly BattleHole[];
  readonly stage: HitPointRestorationOrderingProjection["stage"];
  readonly lastResult: HitPointRestorationOrderingProjection["lastResult"];
  readonly orderingError: HitPointRestorationOrderingProjection["orderingError"];
  readonly spellTargetHp: number;
  readonly spellTargetZeroHpLifecycleCleared: boolean;
  readonly featureTargetHp: number;
  readonly featureTargetZeroHpLifecycleCleared: boolean;
}): HitPointRestorationOrderingProjection {
  return {
    stage: input.stage,
    holes: input.holes.map(hitPointRestorationOrderingHoleFromRuntime).sort(),
    lastResult: input.lastResult,
    orderingError: input.orderingError,
    spellTargetHp: input.spellTargetHp,
    spellTargetZeroHpLifecycleCleared: input.spellTargetZeroHpLifecycleCleared,
    featureTargetHp: input.featureTargetHp,
    featureTargetZeroHpLifecycleCleared:
      input.featureTargetZeroHpLifecycleCleared,
  };
}

function projectCommandOrderingState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly stage: CommandOrderingProjection["stage"];
  readonly lastResult: CommandOrderingProjection["lastResult"];
  readonly orderingError: CommandOrderingProjection["orderingError"];
  readonly pendingCommandOption: CommandOrderingProjection["pendingCommandOption"];
  readonly droppedObjectCount: number;
}): CommandOrderingProjection {
  const snapshot = snapshotBattle(input.state);
  const targetSnapshot = snapshot.combatants.find(
    (combatant) => combatant.combatantId === skeletonId,
  );
  return {
    stage: input.stage,
    holes: input.holes.flatMap(commandOrderingHoleFromRuntime).sort(),
    tableFactFrontierOpen: input.holes.some(
      (hole) => hole.kind === "heldObjectFacts",
    ),
    lastResult: input.lastResult,
    orderingError: input.orderingError,
    pendingCommandOption: input.pendingCommandOption,
    targetProne: targetSnapshot?.conditions.includes("prone") ?? false,
    droppedObjectCount: input.droppedObjectCount,
    haltSuppressed: input.state.currentTurnResources.commandHalt !== null,
    movementSpentFeet:
      targetSnapshot === undefined
        ? 0
        : Number(targetSnapshot.movement.spentFeet),
    currentActor: commandOrderingActorId(snapshot.currentActorId),
    reactionWindowOpen: input.state.interruptStack.length > 0,
  };
}

function projectReducerSpineContractState(input: {
  readonly state: BattleState | null;
  readonly holes: readonly BattleHole[];
  readonly stage: ReducerSpineContractProjection["stage"];
  readonly entrypoint: ReducerSpineContractProjection["entrypoint"];
  readonly subject: ReducerSpineContractProjection["subject"];
  readonly lastResult: ReducerSpineContractProjection["lastResult"];
  readonly lastInvalidReason: ReducerSpineContractProjection["lastInvalidReason"];
}): ReducerSpineContractProjection {
  if (input.state === null) {
    return {
      stage: input.stage,
      entrypoint: input.entrypoint,
      subject: input.subject,
      currentActor: "none",
      holes: [],
      lastResult: input.lastResult,
      lastInvalidReason: input.lastInvalidReason,
      actionAvailable: false,
      bonusActionAvailable: false,
      casterReactionAvailable: false,
      targetReactionAvailable: false,
      spellSlotUse: "none",
      interruptDepth: 0,
      casterHp: 0,
      targetHp: 0,
    };
  }

  const snapshot = snapshotBattle(input.state);
  const caster = snapshotCombatant(input.state, fighterId);
  const target = snapshotCombatant(input.state, skeletonId);

  return {
    stage: input.stage,
    entrypoint: input.entrypoint,
    subject: input.subject,
    currentActor: reducerSpineContractActorId(snapshot.currentActorId),
    holes: input.holes.map(reducerSpineContractHoleFromRuntime).sort(),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    bonusActionAvailable:
      input.state.currentTurnResources.currentHasBonusAction,
    casterReactionAvailable:
      input.state.combatants.get(fighterId)?.reactionAvailable ?? false,
    targetReactionAvailable:
      input.state.combatants.get(skeletonId)?.reactionAvailable ?? false,
    spellSlotUse: reducerSpineContractSpellSlotUseFromRuntime(input.state),
    interruptDepth: input.state.interruptStack.length,
    casterHp: caster.hp,
    targetHp: target.hp,
  };
}

function snapshotCombatant(
  state: BattleState,
  combatantId: CombatantId,
): ReturnType<typeof snapshotBattle>["combatants"][number] {
  const combatant = snapshotBattle(state).combatants.find(
    (candidate) => candidate.combatantId === combatantId,
  );
  if (combatant === undefined) {
    throw new Error("Expected combatant in battle snapshot.");
  }
  return combatant;
}

function zeroHpLifecycleClearedByHealing(
  combatant: ReturnType<typeof snapshotCombatant>,
): boolean {
  return (
    combatant.hp > 0 &&
    !combatant.conditions.includes("unconscious") &&
    combatant.zeroHpLifecycle.policy === "usesDeathSavingThrows" &&
    !combatant.zeroHpLifecycle.dead &&
    !combatant.zeroHpLifecycle.stable &&
    combatant.zeroHpLifecycle.deathSaves.successes === 0 &&
    combatant.zeroHpLifecycle.deathSaves.failures === 0
  );
}

function projectExtraAttackMbtState(input: {
  readonly state: BattleState;
  readonly lastResult: ExtraAttackMbtProjection["lastResult"];
  readonly lastInvalidReason: ExtraAttackMbtProjection["lastInvalidReason"];
}): ExtraAttackMbtProjection {
  const snapshot = snapshotBattle(input.state);
  const skeleton = snapshot.combatants.find(
    (combatant) => combatant.combatantId === skeletonId,
  );
  const fighter = snapshot.combatants.find(
    (combatant) => combatant.combatantId === fighterId,
  );
  if (skeleton == null || fighter == null) {
    throw new Error("Expected Extra Attack MBT combatants.");
  }

  return {
    skeletonHp: skeleton.hp,
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    extraAttackSlotsAvailable: snapshot.turn.actionResources.filter(
      (resource) =>
        resource.source === "classFeatureExtraAttack" &&
        resource.sourceOwnerId === fighterId,
    ).length,
    movementSpentFeet: Number(fighter.movement.spentFeet),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function recordExtraAttackBoundaryFromState(
  state: BattleState,
  unitId: ExtraAttackMbtUnitId,
): void {
  if (
    state.currentTurnResources.actionResources.some(
      (resource) =>
        resource.source === "classFeatureExtraAttack" &&
        resource.sourceUnitId === unitId,
    )
  ) {
    recordSelectedUnitRuntimeBoundaryId(unitId);
  }
}

function projectAdrenalineRushMbtState(input: {
  readonly state: BattleState;
  readonly lastResult: AdrenalineRushMbtProjection["lastResult"];
  readonly lastInvalidReason: AdrenalineRushMbtProjection["lastInvalidReason"];
}): AdrenalineRushMbtProjection {
  const snapshot = snapshotBattle(input.state);
  const actor = snapshot.combatants.find(
    (combatant) => combatant.combatantId === fighterId,
  );
  if (actor == null) {
    throw new Error("Expected Adrenaline Rush MBT actor.");
  }
  return {
    actorTempHp: actor.tempHp,
    bonusActionAvailable: snapshot.turn.bonusActionAvailable,
    dashBonusFeet: Number(snapshot.turn.dashMovementBonusFeet),
    featureUsesRemaining: resourceUsesRemaining(
      input.state,
      "orc_adrenaline_rush",
    ),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function projectRogueSteadyAimMbtState(input: {
  readonly state: BattleState;
  readonly lastResult: RogueSteadyAimMbtProjection["lastResult"];
  readonly lastInvalidReason: RogueSteadyAimMbtProjection["lastInvalidReason"];
}): RogueSteadyAimMbtProjection {
  const snapshot = snapshotBattle(input.state);
  const actor = snapshot.combatants.find(
    (combatant) => combatant.combatantId === fighterId,
  );
  const actorState = input.state.combatants.get(fighterId);
  if (actor == null || actorState === undefined) {
    throw new Error("Expected Steady Aim MBT actor.");
  }
  const nextAttackAdvantageActive = actorState.activeEffects.some(
    (effect) =>
      effect.kind === "nextAttackRollBySelf" &&
      "sourceUnitId" in effect &&
      // authored-id-dispatch-allow: battle-runtime-mbt-fixture-boundary
      effect.sourceUnitId === "rogue_steady_aim" &&
      effect.mode === "advantage",
  );
  const speedZeroActive = actorState.activeEffects.some(
    (effect) =>
      effect.kind === "selfSpeedZero" &&
      // authored-id-dispatch-allow: battle-runtime-mbt-fixture-boundary
      effect.sourceUnitId === "rogue_steady_aim",
  );
  return {
    bonusActionAvailable: snapshot.turn.bonusActionAvailable,
    actorSpeedFeet: Number(actor.movement.speedFeet),
    nextAttackAdvantageActive,
    speedZeroActive,
    attackRollMode: nextAttackAdvantageActive ? "advantage" : "normal",
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function projectScalarBuffMbtState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastResult: ScalarBuffMbtProjection["lastResult"];
  readonly lastInvalidReason: ScalarBuffMbtProjection["lastInvalidReason"];
}): ScalarBuffMbtProjection {
  const snapshot = snapshotBattle(input.state);
  const fighter = snapshot.combatants.find(
    (combatant) => combatant.combatantId === fighterId,
  );
  const skeleton = snapshot.combatants.find(
    (combatant) => combatant.combatantId === skeletonId,
  );
  if (fighter == null || skeleton == null) {
    throw new Error("Expected scalar buff MBT combatants.");
  }
  return {
    fighterSpeed: Number(fighter.movement.speedFeet),
    goblinSpeed: Number(skeleton.movement.speedFeet),
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    holes: projectHoles(input.holes),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function discoverAttackHoles(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >,
): readonly BattleHole[] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack" &&
      candidate.subject.attackName === subject.attackName,
  );
  if (act == null) {
    throw new Error(`Expected ${subject.attackName} attack act.`);
  }

  return act.initialHoles;
}

function discoverLongstriderHoles(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>,
): readonly BattleHole[] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === subject.actorId &&
      candidate.subject.invocation.spellId === subject.invocation.spellId,
  );
  if (act == null) {
    throw new Error("Expected Longstrider spell act.");
  }

  return act.initialHoles;
}

function discoverMagicMissileHoles(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>,
): readonly BattleHole[] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === subject.actorId &&
      candidate.subject.invocation.spellId === subject.invocation.spellId,
  );
  if (act == null) {
    throw new Error("Expected Magic Missile spell act.");
  }

  return act.initialHoles;
}

function discoverSaveGatedSpellHoles(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>,
  spellId: string,
): readonly BattleHole[] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === subject.actorId &&
      candidate.subject.invocation.spellId === spellId,
  );
  if (act == null) {
    throw new Error(`Expected ${spellId} save-gated spell act.`);
  }

  return act.initialHoles;
}

function discoverSpellAttackHoles(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>,
  spellId: string,
): readonly BattleHole[] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === subject.actorId &&
      candidate.subject.invocation.spellId === spellId,
  );
  if (act == null) {
    throw new Error(`Expected ${spellId} spell attack act.`);
  }

  return act.initialHoles;
}

function holesAfterFills(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >,
  fills: readonly BattleFill[],
): readonly BattleHole[] {
  const result = resolveBattleSubject({ state, subject, fills });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected attack fills to request more holes.");
  }

  return result.holes;
}

function saveGatedSpellHolesAfterFills(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>,
  fills: readonly BattleFill[],
): readonly BattleHole[] {
  const result = resolveBattleSubject({ state, subject, fills });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected save-gated spell fills to request more holes.");
  }

  return result.holes;
}

function commandHolesAfterFills(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>,
  fills: readonly BattleFill[],
): readonly BattleHole[] {
  const result = resolveBattleSubject({ state, subject, fills });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Command fills to request more holes.");
  }

  return result.holes;
}

function spellAttackHolesAfterFills(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>,
  fills: readonly BattleFill[],
): readonly BattleHole[] {
  const result = resolveBattleSubject({ state, subject, fills });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected spell attack fills to request more holes.");
  }

  return result.holes;
}

function healingOrderingHolesAfterFills(
  state: BattleState,
  subject: BattleSubject,
  fills: readonly BattleFill[],
): readonly BattleHole[] {
  const result = resolveBattleSubject({ state, subject, fills });
  if (result.tag !== "needsHoles") {
    throw new Error(
      "Expected Hit Point restoration fills to request more holes.",
    );
  }

  return result.holes;
}

function fighterAttackSubject(): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  return {
    tag: "action",
    actorId: fighterId,
    action: "attack",
    attackName: "Dagger",
  };
}

function adrenalineRushDashSubject(): Extract<
  BattleSubject,
  { readonly tag: "bonusActionStandardAction"; readonly action: "dash" }
> {
  return {
    tag: "bonusActionStandardAction",
    actorId: fighterId,
    sourceUnitId: recordSelectedUnitRuntimeBoundaryId("orc_adrenaline_rush"),
    action: "dash",
    speedKind: "walk",
  };
}

function rogueSteadyAimSubject(): Extract<
  BattleSubject,
  { readonly tag: "unitFeature" }
> {
  return {
    tag: "unitFeature",
    actorId: fighterId,
    unitId: recordSelectedUnitRuntimeBoundaryId("rogue_steady_aim"),
  };
}

function skeletonMultiattackSubject(): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "multiattack" }
> {
  return {
    tag: "action",
    actorId: skeletonId,
    action: "multiattack",
    multiattackName: "Multiattack",
  };
}

function skeletonShortswordSubject(): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  return {
    tag: "action",
    actorId: skeletonId,
    action: "attack",
    attackName: "Shortsword",
  };
}

function magicMissileSubject(): Extract<
  BattleSubject,
  { readonly tag: "actionSpell" }
> {
  return {
    tag: "actionSpell",
    actorId: fighterId,
    invocation: spellSlotInvocationRef(
      "magic_missile",
      1,
      "repeatedDamageAllocation",
    ),
    mode: { tag: "cast" },
  };
}

function longstriderSubject(): Extract<
  BattleSubject,
  { readonly tag: "actionSpell" }
> {
  return {
    tag: "actionSpell",
    actorId: fighterId,
    invocation: spellSlotInvocationRef("longstrider", 1, "scalarBuff"),
    mode: { tag: "cast" },
  };
}

function lightningBoltSubject(): Extract<
  BattleSubject,
  { readonly tag: "actionSpell" }
> {
  return saveGatedSpellSubject("lightning_bolt", 3, "saveGatedDamage");
}

function saveGatedSpellSubject(
  spellId: "lightning_bolt" | "blindness_deafness",
  slotLevel: 2 | 3,
  procedure: "saveGatedDamage" | "saveGatedCondition",
): Extract<BattleSubject, { readonly tag: "actionSpell" }> {
  return {
    tag: "actionSpell",
    actorId: fighterId,
    invocation: spellSlotInvocationRef(spellId, slotLevel, procedure),
    mode: { tag: "cast" },
  };
}

function spellAttackSubject(
  spellId: "fire_bolt" | "sorcerous_burst",
  procedure: "spellAttackDamage",
): Extract<BattleSubject, { readonly tag: "actionSpell" }> {
  return {
    tag: "actionSpell",
    actorId: fighterId,
    invocation: cantripSpellInvocationRef(spellId, procedure),
    mode: { tag: "cast" },
  };
}

function healingWordSubject(): Extract<
  BattleSubject,
  { readonly tag: "bonusActionSpell" }
> {
  return {
    tag: "bonusActionSpell",
    actorId: fighterId,
    invocation: spellSlotInvocationRef(
      "healing_word",
      1,
      "directHitPointRestoration",
    ),
    mode: { tag: "cast" },
  };
}

function massHealingWordSubject(): Extract<
  BattleSubject,
  { readonly tag: "bonusActionSpell" }
> {
  return {
    tag: "bonusActionSpell",
    actorId: fighterId,
    invocation: spellSlotInvocationRef(
      "mass_healing_word",
      3,
      "directHitPointRestoration",
    ),
    mode: { tag: "cast" },
  };
}

function preserveLifeSubject(): Extract<
  BattleSubject,
  { readonly tag: "unitFeature" }
> {
  return {
    tag: "unitFeature",
    actorId: fighterId,
    unitId: "cleric_preserve_life",
  };
}

function moveSubject(): Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "move" }
> {
  return { tag: "runtimeCommand", actorId: fighterId, command: "move" };
}

function fighterVsSkeletonBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-fighter-skeleton"),
    combatants: [
      rogueCreatureInit({ initiative: 20 }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function extraAttackBattle(
  unitId: ExtraAttackMbtUnitId = "fighter_extra_attack",
): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-extra-attack"),
    combatants: [
      extraAttackCreatureInit({ initiative: 20, unitId }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function extraAttackMbtUnitIdForAdditionalAttacks(
  additionalAttacks: ExtraAttackMbtAdditionalAttackCount,
): ExtraAttackMbtUnitId {
  if (additionalAttacks === 1) return "fighter_extra_attack";
  if (additionalAttacks === 2) return "test_synthetic_attack_count_2";
  return "test_synthetic_attack_count_3";
}

export function extraAttackMbtInitAction(
  additionalAttacks: ExtraAttackMbtAdditionalAttackCount,
): ExtraAttackMbtInitAction {
  if (additionalAttacks === 1) return "initOneAdditionalAttack";
  if (additionalAttacks === 2) return "initTwoAdditionalAttacks";
  return "initThreeAdditionalAttacks";
}

function extraAttackMbtUnit(unitId: ExtraAttackMbtUnitId): UnitRecord {
  if (unitId === "test_synthetic_attack_count_2") {
    return syntheticExtraAttackMbtUnit(2);
  }
  if (unitId === "test_synthetic_attack_count_3") {
    return syntheticExtraAttackMbtUnit(3);
  }
  return unitLibrary.requireUnit(unitId);
}

function syntheticExtraAttackMbtUnit(
  additionalAttacks: Exclude<ExtraAttackMbtAdditionalAttackCount, 1>,
): UnitRecord {
  const unit = unitLibrary.requireUnit("fighter_extra_attack");
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
    throw new Error("Expected passive Fighter Extra Attack Unit.");
  }
  return {
    ...unit,
    id: `test_synthetic_attack_count_${additionalAttacks}`,
    name: `Synthetic Attack Count ${additionalAttacks}`,
    description: `Synthetic fixture for ${additionalAttacks} additional Attack action attack(s).`,
    provenance: {
      kind: "srd-5.2.1",
      section:
        additionalAttacks === 2
          ? "Classes/Fighter#Two Extra Attacks"
          : "Classes/Fighter#Three Extra Attacks",
    },
    mechanics: {
      ...unit.mechanics,
      grants: [{ kind: "scale_attack_count", additional: additionalAttacks }],
    },
  };
}

function extraAttackMbtClassLevel(unitId: ExtraAttackMbtUnitId): number {
  if (unitId === "test_synthetic_attack_count_2") return 11;
  if (unitId === "test_synthetic_attack_count_3") return 20;
  return 5;
}

function adrenalineRushBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-adrenaline-rush"),
    combatants: [
      adrenalineRushCreatureInit({ initiative: 20 }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function rogueSteadyAimBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-rogue-steady-aim"),
    combatants: [
      rogueSteadyAimCreatureInit({ initiative: 20 }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function rogueSteadyAimBattleWithMovementSpent(): BattleState {
  const state = rogueSteadyAimBattle();
  const actor = state.combatants.get(fighterId);
  if (actor === undefined) {
    throw new Error("Expected Steady Aim MBT actor.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(fighterId, {
      ...actor,
      movementSpentFeet: movementFeet(5),
    }),
  };
}

function scalarBuffBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-scalar-buff"),
    combatants: [
      scalarBuffCasterCreatureInit({ initiative: 20 }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function saveGatedSpellOrderingBattle(
  spellId: "lightning_bolt" | "blindness_deafness",
  slotLevel: 2 | 3,
): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-save-gated-spell-ordering"),
    combatants: [
      saveGatedSpellOrderingCasterCreatureInit({
        initiative: 20,
        spellId,
        slotLevel,
      }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function commandOrderingBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-command-ordering"),
    combatants: [
      commandOrderingCasterCreatureInit({ initiative: 20 }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function spellAttackOrderingBattle(
  spellId: "fire_bolt" | "sorcerous_burst",
): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-spell-attack-ordering"),
    combatants: [
      spellAttackOrderingCasterCreatureInit({
        initiative: 20,
        spellId,
      }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function healingSpellOrderingBattle(): BattleState {
  return startBattleRight({
    battleId: battleId(
      "battle-runtime-mbt-hit-point-restoration-spell-ordering",
    ),
    combatants: [
      healingSpellOrderingCasterCreatureInit({
        initiative: 20,
        spellId: "healing_word",
        slotLevel: 1,
        characterLevel: 1,
      }),
      healingOrderingTargetCreatureInit({ initiative: 10, currentHp: 0 }),
    ],
  });
}

function healingTargetListSpellOrderingBattle(): BattleState {
  return startBattleRight({
    battleId: battleId(
      "battle-runtime-mbt-hit-point-restoration-target-list-spell-ordering",
    ),
    combatants: [
      healingSpellOrderingCasterCreatureInit({
        initiative: 20,
        spellId: "mass_healing_word",
        slotLevel: 3,
        characterLevel: 5,
      }),
      healingOrderingTargetCreatureInit({ initiative: 10, currentHp: 0 }),
    ],
  });
}

function featureHealingPoolOrderingBattle(): BattleState {
  return startBattleRight({
    battleId: battleId(
      "battle-runtime-mbt-hit-point-restoration-feature-ordering",
    ),
    combatants: [
      preserveLifeOrderingCreatureInit({ initiative: 20 }),
      healingOrderingTargetCreatureInit({ initiative: 10, currentHp: 0 }),
    ],
  });
}

function endTurnSubject(): Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "endTurn" }
> {
  return endTurnSubjectFor(fighterId);
}

function commandOrderingCastSubject(): Extract<
  BattleSubject,
  { readonly tag: "actionSpell" }
> {
  return {
    tag: "actionSpell",
    actorId: fighterId,
    invocation: spellSlotInvocationRef("command", 1, "command"),
    mode: { tag: "cast" },
  };
}

function commandOrderingCastAct(state: BattleState): ReturnType<
  typeof discoverBattleActs
>[number] & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
} {
  const act = discoverBattleActs(state).find(
    (
      candidate,
    ): candidate is ReturnType<typeof discoverBattleActs>[number] & {
      readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
    } =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "command",
  );
  if (act === undefined) {
    throw new Error("Expected Command cast act.");
  }
  return act;
}

type RuntimeCommandOption = Exclude<CommandOrderingPendingOption, "none">;
type CommandRuntimeSubject = Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand" }
>;
type CommandTargetTurnInput = {
  readonly grappledByCaster?: boolean;
};

function commandRuntimeAct(
  state: BattleState,
  option: RuntimeCommandOption,
): ReturnType<typeof discoverBattleActs>[number] & {
  readonly subject: CommandRuntimeSubject;
} {
  const command = commandSubjectForOption(option);
  const act = discoverBattleActs(state).find(
    (
      candidate,
    ): candidate is ReturnType<typeof discoverBattleActs>[number] & {
      readonly subject: CommandRuntimeSubject;
    } =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === command,
  );
  if (act === undefined) {
    throw new Error(`Expected runtime Command act ${command}.`);
  }
  return act;
}

function commandSubjectForOption(
  option: RuntimeCommandOption,
): CommandRuntimeSubject["command"] {
  if (option === "grovel") return "commandGrovel";
  if (option === "drop") return "commandDrop";
  if (option === "approach") return "commandApproach";
  if (option === "flee") return "commandFlee";
  throw new Error("Command Halt does not expose a runtime command act.");
}

function commandTargetTurn(
  option: RuntimeCommandOption,
  input: CommandTargetTurnInput = {},
): BattleState {
  const cast = castCommandForOrdering(option);
  const targetTurn = requireResolved(
    resolveBattleSubject({
      state: cast.state,
      subject: endTurnSubjectFor(fighterId),
      fills: [],
    }),
  ).state;
  return input.grappledByCaster === true
    ? grappledByCaster(targetTurn)
    : targetTurn;
}

function castCommandForOrdering(
  option: RuntimeCommandOption,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  const state = commandOrderingBattle();
  const act = commandOrderingCastAct(state);
  const target = requireHole(act.initialHoles, "spellTargetList");
  const commandOption = requireHole(act.initialHoles, "commandOptionChoice");
  const targetSelection = spellTargetListFill(target, "command", [skeletonId]);
  const optionSelection = commandOptionFill(commandOption, option);
  const savingThrow = requireHole(
    commandHolesAfterFills(state, act.subject, [
      targetSelection,
      optionSelection,
    ]),
    "savingThrowOutcome",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetSelection,
        optionSelection,
        saveGatedSpellSavingThrowOutcomeFill(savingThrow, [
          { targetId: skeletonId, succeeded: false },
        ]),
      ],
    }),
  );
}

function endTurnSubjectFor(
  actorId: CombatantId,
): Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "endTurn" }
> {
  return { tag: "runtimeCommand", actorId, command: "endTurn" };
}

function commandPendingOption(
  state: BattleState,
): CommandOrderingPendingOption {
  const target = state.combatants.get(skeletonId);
  const effect = target?.activeEffects.find(
    (candidate) => candidate.kind === "commandPending",
  );
  return effect?.kind === "commandPending" ? effect.option : "none";
}

function commandOrderingActorId(
  actorId: CombatantId,
): CommandOrderingProjection["currentActor"] {
  if (actorId === fighterId) return "Caster";
  if (actorId === skeletonId) return "Target";
  throw new Error(`Unexpected Command ordering actor ${actorId}.`);
}

function grappledByCaster(state: BattleState): BattleState {
  return {
    ...state,
    grapples: [
      ...state.grapples,
      {
        grapplerId: fighterId,
        targetId: skeletonId,
        escapeDc: difficultyClass(12),
        reachFeet: movementFeet(5),
        hand: "left",
      },
    ],
  };
}

function rogueCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  return {
    combatantId: fighterId,
    displayName: "Rogue",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("fighter-character"),
      characterUnitRefs: [
        {
          unitId: "rogue_sneak_attack",
          supportProfiles: [ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE],
        },
      ],
      classLevels: [{ className: "rogue", level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
      armorClass: {
        ...defaultArmorClassState(),
        rightHandUse: "mainWeapon",
      },
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {
        weapon: {
          itemId: "main:weapon_dagger",
          unitId: "weapon_dagger",
          grip: "one_handed",
        },
      },
      attack: daggerAttack(),
      unarmedStrike: baseUnarmedStrike(),
      unitFeatures: [{ unit: unitLibrary.requireUnit("rogue_sneak_attack") }],
      spellcasting: {
        sourceClassName: "rogue",
        spellcastingAbilityModifier: 3,
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [magicMissileSpell],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      },
    },
  };
}

function rogueSteadyAimCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  const steadyAim = unitLibrary.requireUnit("rogue_steady_aim");
  if (steadyAim.kind !== "class_feature") {
    throw new Error("Expected Steady Aim class feature Unit.");
  }
  return {
    combatantId: fighterId,
    displayName: "Rogue",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("steady-aim-rogue-character"),
      characterUnitRefs: [rogueSteadyAimUnitRef(steadyAim)],
      classLevels: [{ className: "rogue", level: 3 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
      armorClass: {
        ...defaultArmorClassState(),
        rightHandUse: "mainWeapon",
      },
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {
        weapon: {
          itemId: "main:weapon_dagger",
          unitId: "weapon_dagger",
          grip: "one_handed",
        },
      },
      attack: daggerAttack(),
      unarmedStrike: baseUnarmedStrike(),
      unitFeatures: [{ unit: steadyAim }],
    },
  };
}

function extraAttackCreatureInit(input: {
  readonly initiative: number;
  readonly unitId: ExtraAttackMbtUnitId;
}): BattleCreatureInit {
  const unit = extraAttackMbtUnit(input.unitId);
  if (unit.kind !== "class_feature") {
    throw new Error("Expected Extra Attack class-feature Unit.");
  }
  return {
    combatantId: fighterId,
    displayName: `${unit.className} Extra Attacker`,
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId(`extra-attack-${unit.className}-character`),
      characterUnitRefs: [extraAttackUnitRef(unit)],
      classLevels: [
        {
          className: unit.className,
          level: extraAttackMbtClassLevel(input.unitId),
        },
      ],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
      armorClass: {
        ...defaultArmorClassState(),
        rightHandUse: "mainWeapon",
      },
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {
        weapon: {
          itemId: "main:weapon_dagger",
          unitId: "weapon_dagger",
          grip: "one_handed",
        },
      },
      attack: daggerAttack(),
      unarmedStrike: baseUnarmedStrike(),
      unitFeatures: [{ unit }],
    },
  };
}

function adrenalineRushCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  const unit = unitLibrary.requireUnit("orc_adrenaline_rush");
  return {
    combatantId: fighterId,
    displayName: "Orc",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("adrenaline-rush-character"),
      characterUnitRefs: [adrenalineRushUnitRef(unit)],
      classLevels: [{ className: "fighter", level: 5 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(1),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
      resources: [{ unit, usesRemaining: 3 }],
      unitFeatures: [{ unit }],
    },
  };
}

function scalarBuffCasterCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  const unit = unitLibrary.requireUnit("longstrider");
  if (unit.kind !== "spell") {
    throw new Error("Expected Longstrider spell Unit.");
  }
  return {
    combatantId: fighterId,
    displayName: "Longstrider Caster",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("scalar-buff-caster-character"),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
      spellcasting: {
        sourceClassName: "fighter",
        spellcastingAbilityModifier: 3,
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [unit],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      },
    },
  };
}

function saveGatedSpellOrderingCasterCreatureInit(input: {
  readonly initiative: number;
  readonly spellId: "lightning_bolt" | "blindness_deafness";
  readonly slotLevel: 2 | 3;
}): BattleCreatureInit {
  const unit = unitLibrary.requireUnit(input.spellId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected ${input.spellId} spell Unit.`);
  }
  return {
    combatantId: fighterId,
    displayName: "Save-Gated Spell Caster",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("save-gated-spell-ordering-caster-character"),
      characterUnitRefs: [],
      classLevels: [{ className: "wizard", level: 5 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(20),
      maxHp: Hp(20),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
      spellcasting: {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: 3,
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [unit],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: input.slotLevel, count: 1 }],
      },
    },
  };
}

function commandOrderingCasterCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  const unit = unitLibrary.requireUnit("command");
  if (unit.kind !== "spell") {
    throw new Error("Expected Command spell Unit.");
  }
  return {
    combatantId: fighterId,
    displayName: "Command Ordering Caster",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("command-ordering-caster-character"),
      characterUnitRefs: [],
      classLevels: [{ className: "wizard", level: 5 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(20),
      maxHp: Hp(20),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
      spellcasting: {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: 3,
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [unit],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      },
    },
  };
}

function spellAttackOrderingCasterCreatureInit(input: {
  readonly initiative: number;
  readonly spellId: "fire_bolt" | "sorcerous_burst";
}): BattleCreatureInit {
  const unit = unitLibrary.requireUnit(input.spellId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected ${input.spellId} spell Unit.`);
  }
  return {
    combatantId: fighterId,
    displayName: "Spell Attack Caster",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("spell-attack-ordering-caster-character"),
      characterUnitRefs: [],
      classLevels: [{ className: "sorcerer", level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(20),
      maxHp: Hp(20),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
      spellcasting: {
        sourceClassName: "sorcerer",
        spellcastingAbilityModifier: 3,
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [unit],
        preparedSpells: [],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [],
      },
    },
  };
}

function healingSpellOrderingCasterCreatureInit(input: {
  readonly initiative: number;
  readonly spellId: "healing_word" | "mass_healing_word";
  readonly slotLevel: 1 | 3;
  readonly characterLevel: number;
}): BattleCreatureInit {
  const unit = unitLibrary.requireUnit(input.spellId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected ${input.spellId} spell Unit.`);
  }
  return {
    combatantId: fighterId,
    displayName: "Healing Spell Caster",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("hit-point-restoration-spell-caster"),
      characterUnitRefs: [],
      classLevels: [{ className: "cleric", level: input.characterLevel }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics({ str: 10 }),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(20),
      maxHp: Hp(20),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
      spellcasting: {
        sourceClassName: "cleric",
        spellcastingAbilityModifier: 3,
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [unit],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: input.slotLevel, count: 1 }],
      },
    },
  };
}

function preserveLifeOrderingCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  const preserveLife = unitLibrary.requireUnit("cleric_preserve_life");
  const channelDivinity = unitLibrary.requireUnit("cleric_channel_divinity");
  const support = battleMagicActionHealingPoolSupportForUnit(preserveLife);
  if (support === null || support === "unsupported") {
    throw new Error("Expected Preserve Life healing-pool support.");
  }
  return {
    combatantId: fighterId,
    displayName: "Life Cleric",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("hit-point-restoration-feature-caster"),
      characterUnitRefs: [preserveLifeUnitRef(preserveLife, support)],
      classLevels: [{ className: "cleric", level: classLevel(3) }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics({ str: 10 }),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(20),
      maxHp: Hp(20),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
      resources: [{ unit: channelDivinity, usesRemaining: 2 }],
      unitFeatures: [{ unit: preserveLife }],
    },
  };
}

function healingOrderingTargetCreatureInit(input: {
  readonly initiative: number;
  readonly currentHp: number;
}): BattleCreatureInit {
  return {
    combatantId: skeletonId,
    displayName: "Healing Target",
    initiative: initiativeScore(input.initiative),
    side: oppositionSide,
    creatureInit: {
      kind: "character",
      characterId: characterId("hit-point-restoration-target"),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics({ str: 10 }),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(input.currentHp),
      maxHp: Hp(20),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
      conditions: input.currentHp === 0 ? ["unconscious"] : [],
      ...(input.currentHp === 0
        ? {
            zeroHpLifecycle: {
              policy: "usesDeathSavingThrows" as const,
              deathSaves: {
                deathSaves: { successes: 2, failures: 1 },
                stable: false,
                dead: false,
                hpRegained: false,
              },
            },
          }
        : {}),
    },
  };
}

function preserveLifeUnitRef(
  unit: UnitRecord,
  support: Exclude<
    ReturnType<typeof battleMagicActionHealingPoolSupportForUnit>,
    null | "unsupported"
  >,
): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
    classLevels: [{ className: "cleric", level: classLevel(3) }],
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  if (
    !unitRef.right.supportProfiles.some(
      (candidate) => JSON.stringify(candidate) === JSON.stringify(support),
    )
  ) {
    throw new Error("Expected Preserve Life healing-pool support profile.");
  }
  return unitRef.right;
}

function extraAttackUnitRef(
  unit: UnitRecord,
): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function adrenalineRushUnitRef(
  unit: UnitRecord,
): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function rogueSteadyAimUnitRef(
  unit: UnitRecord,
): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
    classLevels: [{ className: "rogue", level: 3 }],
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function resourceUsesRemaining(state: BattleState, unitId: string): number {
  const actor = state.combatants.get(fighterId);
  if (actor?.origin.kind !== "character") return 1;
  const resource = actor.origin.resources.find(
    (candidate) => candidate.unit.id === unitId,
  );
  if (
    resource === undefined ||
    characterBattleResourceUsage(resource) !== "limited"
  ) {
    return 1;
  }
  return "usesRemaining" in resource ? resource.usesRemaining : 1;
}

function daggerAttack(): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"]
> {
  const weapon = unitLibrary.requireUnit("weapon_dagger");
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Dagger weapon Unit.");
  }

  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: abilityModifier(3),
  };
}

function baseUnarmedStrike(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["unarmedStrike"] {
  return {
    kind: "unarmedStrike",
    effect: {
      kind: "damage",
      damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
    },
    attackAbility: "str",
    attackAbilityModifier: abilityModifier(3),
    attackBonus: attackBonus(5),
    damageAbilityModifier: abilityModifier(3),
  };
}

function skeletonCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  return {
    combatantId: skeletonId,
    displayName: "Skeleton",
    initiative: initiativeScore(input.initiative),
    side: oppositionSide,
    creatureInit: {
      kind: "statBlock",
      statBlock: skeletonMultiattackStatBlock(),
      currentHp: Hp(13),
      maxHp: Hp(13),
      tempHp: Hp(0),
    },
  };
}

function skeletonMultiattackStatBlock(): StatBlockRecord {
  const base = statBlockCatalog.requireStatBlock("stat_block_skeleton");
  return {
    ...base,
    statBlock: {
      ...base.statBlock,
      actions: {
        ...base.statBlock.actions,
        multiattacks: [
          {
            name: "Multiattack",
            dispatches: [
              { name: "Shortsword", count: { kind: "literal", value: 2 } },
            ],
          },
        ],
      },
    },
  };
}

function requireHole(
  holes: readonly BattleHole[],
  kind: BattleHole["kind"],
): BattleHole {
  const hole = holes.find((candidate) => candidate.kind === kind);
  if (hole == null) {
    throw new Error(`Expected ${kind} hole.`);
  }

  return hole;
}

function requireResolved(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  if (result.tag !== "resolved") {
    throw new Error(
      `Expected resolved battle result, got ${result.tag}: ${
        "message" in result ? result.message : ""
      }`,
    );
  }
  return result;
}

function fillsWithMbtSpellCastReactionFacts(
  holes: readonly BattleHole[],
  fills: readonly BattleFill[],
): readonly BattleFill[] {
  const filledHoleIds = new Set(
    fills
      .filter((fill) => fill.kind === "targetSpatialFacts")
      .map((fill) => fill.holeId),
  );
  const spellCastReactionFactFills = holes.flatMap(
    (
      hole,
    ): readonly Extract<
      BattleFill,
      { readonly kind: "targetSpatialFacts" }
    >[] =>
      hole.kind === "targetSpatialFacts" && !filledHoleIds.has(hole.holeId)
        ? [
            {
              kind: "targetSpatialFacts",
              holeId: hole.holeId,
              spatialFacts: [],
            },
          ]
        : [],
  );
  return spellCastReactionFactFills.length === 0
    ? fills
    : [...fills, ...spellCastReactionFactFills];
}

function targetFill(
  hole: BattleHole,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId: fighterId,
        targetId,
        attackName: "Dagger",
      },
      {
        kind: "attackTargetInMeleeReach",
        actorId: skeletonId,
        targetId,
        attackName: "Shortsword",
      },
      {
        kind: "attackerAllyWithin5FeetOfTarget",
        attackerId: fighterId,
        targetId,
        allyId: combatantId("ally"),
      },
    ],
  };
}

function spellTargetChoiceFill(
  hole: BattleHole,
  targetId: CombatantId,
  spellId: string,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  if (hole.kind !== "targetChoice") {
    throw new Error("Expected target choice hole.");
  }
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: fighterId,
        targetId,
        spellId,
      },
    ],
  };
}

function spellTargetListFill(
  hole: BattleHole,
  spellId: string,
  targetIds: readonly CombatantId[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  if (hole.kind !== "spellTargetList") {
    throw new Error("Expected spell target-list hole.");
  }
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: targetIds.map((targetId) => ({
      kind: "spellTarget",
      casterId: fighterId,
      targetId,
      spellId,
    })),
  };
}

function saveGatedSpellConditionChoiceFill(
  hole: BattleHole,
  value: "blinded" | "deafened",
): Extract<BattleFill, { readonly kind: "conditionChoice" }> {
  if (hole.kind !== "conditionChoice") {
    throw new Error("Expected condition choice hole.");
  }
  return {
    kind: "conditionChoice",
    holeId: hole.holeId,
    value,
  };
}

function spellDamageTypeChoiceFill(
  hole: BattleHole,
  value: DamageType,
): Extract<BattleFill, { readonly kind: "damageTypeChoice" }> {
  if (hole.kind !== "damageTypeChoice") {
    throw new Error("Expected damage type choice hole.");
  }
  return {
    kind: "damageTypeChoice",
    holeId: hole.holeId,
    value,
  };
}

function saveGatedSpellSavingThrowOutcomeFill(
  hole: BattleHole,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  if (hole.kind !== "savingThrowOutcome") {
    throw new Error("Expected Saving Throw outcome hole.");
  }
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value:
      "spell" in hole &&
      hole.spell.targeting.kind !== "singleCombatant" &&
      hole.spell.targeting.kind !== "targetList"
        ? {
            area: {
              originAnchorId: fighterId,
              affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
            },
            outcomes,
          }
        : { outcomes },
  };
}

function commandOptionFill(
  hole: BattleHole,
  value: Exclude<CommandOrderingPendingOption, "none">,
): Extract<BattleFill, { readonly kind: "commandOptionChoice" }> {
  if (hole.kind !== "commandOptionChoice") {
    throw new Error("Expected Command option-choice hole.");
  }
  return {
    kind: "commandOptionChoice",
    holeId: hole.holeId,
    value,
  };
}

function movementFill(
  hole: BattleHole,
  value: { readonly movementCostFeet: number },
): Extract<BattleFill, { readonly kind: "movement" }> {
  if (hole.kind !== "movement") {
    throw new Error("Expected movement hole.");
  }

  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: [],
    },
  };
}

function commandApproachMovementFill(
  hole: BattleHole,
  value: {
    readonly movementCostFeet: number;
    readonly movedWithinFiveFeetOfCaster: boolean;
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  if (hole.kind !== "movement") {
    throw new Error("Expected Command Approach movement hole.");
  }
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: [],
      commandApproach: {
        kind: "commandApproachShortestDirectRouteTowardCaster",
        movedWithinFiveFeetOfCaster: value.movedWithinFiveFeetOfCaster,
      },
    },
  };
}

function commandFleeMovementFill(
  hole: BattleHole,
  value: {
    readonly movementCostFeet: number;
    readonly provokedOpportunityAttacks: readonly {
      readonly reactorId: CombatantId;
      readonly attackName: string;
    }[];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  if (hole.kind !== "movement") {
    throw new Error("Expected Command Flee movement hole.");
  }
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: value.provokedOpportunityAttacks,
      commandFlee: {
        kind: "commandFleeFastestAvailableRouteAwayFromCaster",
      },
    },
  };
}

function spellTargetAllocationFill(
  hole: BattleHole,
  targetId: CombatantId,
  count: number,
): Extract<BattleFill, { readonly kind: "spellTargetAllocation" }> {
  if (hole.kind !== "spellTargetAllocation") {
    throw new Error("Expected spell target allocation hole.");
  }

  return {
    kind: "spellTargetAllocation",
    holeId: hole.holeId,
    value: { allocations: [{ targetId, count }] },
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: fighterId,
        targetId,
        spellId: hole.spell.spell.id,
      },
    ],
  };
}

function attackRollFill(
  hole: BattleHole,
  value: {
    readonly total: number;
    readonly naturalD20: number;
    readonly rollMode?: "normal" | "advantage" | "disadvantage";
  },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
      ...(value.rollMode === undefined ? {} : { rollMode: value.rollMode }),
    },
  };
}

function damageRollFill(
  hole: BattleHole,
  value: number,
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  return damageRollFillWithGroups(hole, [[value]]);
}

function damageRollFillWithGroups(
  hole: BattleHole,
  groups: readonly (readonly number[])[],
  selectedAttackDamageRiderUnitIds?: readonly string[],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  if (groups.length === 0 || groups.some((group) => group.length === 0)) {
    throw new Error("Expected non-empty rolled damage groups.");
  }

  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    ...(selectedAttackDamageRiderUnitIds === undefined
      ? {}
      : { selectedAttackDamageRiderUnitIds }),
    value: rolledDiceGroups(groups),
  };
}

function preserveLifeDistributionFill(
  hole: BattleHole,
  allocations: readonly {
    readonly targetId: CombatantId;
    readonly hitPoints: number;
  }[],
): Extract<BattleFill, { readonly kind: "hitPointHealingDistribution" }> {
  if (hole.kind !== "hitPointHealingDistribution") {
    throw new Error("Expected Hit Point healing distribution hole.");
  }
  return {
    kind: "hitPointHealingDistribution",
    holeId: hole.holeId,
    value: {
      allocations: allocations.map((allocation) => ({
        targetId: allocation.targetId,
        hitPoints: Hp(allocation.hitPoints),
      })),
    },
    spatialFacts: allocations
      .filter((allocation) => allocation.targetId !== fighterId)
      .map((allocation) => ({
        kind: "magicActionHealingPoolTargetWithinRange" as const,
        actorId: fighterId,
        targetId: allocation.targetId,
        unitId: "cleric_preserve_life",
        rangeFeet: movementFeet(30),
      })),
  };
}

function rolledDiceGroups(
  groups: readonly (readonly number[])[],
): Extract<BattleFill, { readonly kind: "rolledDice" }>["value"] {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled damage group.");
  }

  return [
    rolledDiceGroup(firstGroup),
    ...restGroups.map((group) => rolledDiceGroup(group)),
  ];
}

function rolledDiceGroup(
  group: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }>["value"][number] {
  const [first, ...rest] = group;
  if (first === undefined) {
    throw new Error("Expected at least one die result.");
  }

  return {
    results: [DieRollResult(first), ...rest.map(DieRollResult)],
  };
}

function projectHoles(holes: readonly BattleHole[]): readonly MbtHole[] {
  return holes.flatMap(projectHole).sort();
}

function projectHole(hole: BattleHole): readonly MbtHole[] {
  if (hole.kind === "shoveOutcome") {
    throw new Error("Battle runtime MBT does not model Shove holes.");
  }
  if (hole.kind === "unitFeatureDecision") {
    throw new Error(
      "Battle runtime MBT does not model Unit Feature decision holes.",
    );
  }
  if (hole.kind === "abilityChoice") {
    throw new Error("Battle runtime MBT does not model ability choice holes.");
  }
  if (hole.kind === "conditionChoice") {
    throw new Error(
      "Battle runtime MBT does not model condition choice holes.",
    );
  }
  if (hole.kind === "spellAreaChoice") {
    throw new Error("Battle runtime MBT does not model spell area holes.");
  }
  if (hole.kind === "sanctuaryInterdictionOutcome") {
    throw new Error("Battle runtime MBT does not model Sanctuary holes.");
  }
  if (hole.kind === "dancingLightsPlacement") {
    throw new Error(
      "Battle runtime MBT does not model Dancing Lights placement holes.",
    );
  }
  if (hole.kind === "thaumaturgyActiveOneMinuteEffectCount") {
    throw new Error(
      "Battle runtime MBT does not model Thaumaturgy active-effect count holes.",
    );
  }
  if (hole.kind === "targetSpatialFacts") {
    // The active MBT suites do not branch on Counterspell table facts; they
    // prefill this projection-only hole with an empty fact set before submit.
    return [];
  }
  if (hole.kind === "teleportDestination") {
    throw new Error(
      "Battle runtime MBT does not model teleport destination holes.",
    );
  }
  if (hole.kind === "spiritualWeaponForcePosition") {
    throw new Error(
      "Battle runtime aggregate MBT does not model Spiritual Weapon force-position holes.",
    );
  }
  if (hole.kind === "movableZoneRamMovement") {
    throw new Error(
      "Battle runtime MBT does not model movable zone ram movement holes.",
    );
  }
  if (hole.kind === "movableZoneRepositionMovement") {
    throw new Error(
      "Battle runtime MBT does not model movable zone reposition movement holes.",
    );
  }
  if (hole.kind === "selfTransformationModeChoice") {
    throw new Error(
      "Battle runtime MBT does not model self-transformation mode holes.",
    );
  }
  if (hole.kind === "objectContactTargets") {
    throw new Error(
      "Battle runtime MBT does not model object contact target holes.",
    );
  }
  if (hole.kind === "gustOfWindLineDirectionChoice") {
    throw new Error(
      "Battle runtime MBT does not model Gust of Wind direction-choice holes.",
    );
  }
  if (hole.kind === "objectDropResolution") {
    throw new Error(
      "Battle runtime MBT does not model object drop resolution holes.",
    );
  }
  if (hole.kind === "magicWeaponTargetItem") {
    throw new Error(
      "Battle runtime MBT does not model Magic Weapon target-item holes.",
    );
  }
  if (hole.kind === "ongoingSpellTargetChoice") {
    throw new Error(
      "Battle runtime MBT does not model ongoing spell target holes.",
    );
  }
  if (hole.kind === "spellcastingAbilityCheck") {
    throw new Error(
      "Battle runtime MBT does not model spellcasting ability check holes.",
    );
  }
  if (hole.kind === "levitateAltitudeChange") {
    return ["LevitateAltitudeChange"];
  }
  if (hole.kind === "levitateInitialRise") {
    return ["LevitateInitialRise"];
  }
  if (hole.kind === "slowSomaticSpellFailureOutcome") {
    return ["SlowSomaticSpellFailureOutcome"];
  }
  if (hole.kind === "targetAbilityChoices") {
    throw new Error(
      "Battle runtime MBT does not model target ability choices holes.",
    );
  }
  if (hole.kind === "hitPointHealingDistribution") {
    throw new Error(
      "Battle runtime MBT does not model Hit Point healing distribution holes.",
    );
  }
  if (hole.kind === "wildShapeEquipmentDisposition") {
    throw new Error(
      "Generic battle runtime MBT leaves Wild Shape equipment disposition holes to focused Wild Shape equipment witnesses.",
    );
  }
  if (hole.kind === "findFamiliarConnection") {
    throw new Error(
      "Generic battle runtime MBT leaves companion connection holes to focused companion witnesses.",
    );
  }
  if (
    hole.kind === "companionReappearancePlacement" ||
    hole.kind === "companionReappearanceInitiative"
  ) {
    throw new Error(
      "Generic battle runtime MBT leaves companion reappearance holes to focused companion witnesses.",
    );
  }
  return [
    Match.value(hole)
      .pipe(
        Match.when({ kind: "targetChoice" }, () => "TargetChoice" as const),
        Match.when(
          { kind: "objectTargetChoice" },
          () => "ObjectTargetChoice" as const,
        ),
        Match.when(
          { kind: "spellTargetAllocation" },
          () => "SpellTargetAllocation" as const,
        ),
        Match.when({ kind: "spellTargetList" }, () => {
          throw new Error(
            "Battle runtime MBT does not model spell target-list holes.",
          );
        }),
        Match.when({ kind: "attackRoll" }, () => {
          return "AttackRoll" as const;
        }),
        Match.when({ kind: "rolledDice" }, (rolledDice) => {
          if ("spell" in rolledDice) {
            return "SpellDamageRoll" as const;
          }
          return "DamageRoll" as const;
        }),
        Match.when({ kind: "deathSavingThrow" }, () => {
          throw new Error(
            "Battle runtime aggregate MBT does not model Death Saving Throw holes.",
          );
        }),
        Match.when({ kind: "statBlockRechargeRoll" }, () => {
          return "StatBlockRechargeRoll" as const;
        }),
        Match.when({ kind: "savingThrowOutcome" }, () => {
          return "SavingThrowOutcome" as const;
        }),
        Match.when({ kind: "skillChoice" }, () => {
          throw new Error(
            "Battle runtime MBT does not model skill choice holes.",
          );
        }),
        Match.when({ kind: "commandOptionChoice" }, () => {
          throw new Error(
            "Battle runtime MBT does not model Command option holes.",
          );
        }),
        Match.when({ kind: "heldObjectFacts" }, () => {
          throw new Error(
            "Battle runtime MBT does not model held-object fact holes.",
          );
        }),
        Match.when({ kind: "concentrationSavingThrow" }, () => {
          throw new Error(
            "Battle runtime MBT does not model concentration saving throw holes.",
          );
        }),
        Match.when({ kind: "damageTypeChoice" }, () => {
          throw new Error(
            "Battle runtime MBT does not model damage type holes.",
          );
        }),
        Match.when({ kind: "interruptDecision" }, () => {
          throw new Error("Battle runtime MBT does not model reaction holes.");
        }),
        Match.when({ kind: "movement" }, () => {
          throw new Error("Battle runtime MBT does not model movement holes.");
        }),
      )
      .pipe(
        Match.when({ kind: "toolPossessionFacts" }, () => {
          throw new Error(
            "Battle runtime MBT does not model tool possession holes.",
          );
        }),
        Match.when({ kind: "abilityCheck" }, () => {
          throw new Error(
            "Battle runtime MBT does not model ability check holes.",
          );
        }),
        Match.when({ kind: "grappleOutcome" }, () => {
          throw new Error("Battle runtime MBT does not model Grapple holes.");
        }),
        Match.when({ kind: "attackDamageDisposition" }, () => {
          throw new Error(
            "Battle runtime MBT does not model attack damage disposition holes.",
          );
        }),
        Match.exhaustive,
      ),
  ];
}

function holeName(raw: unknown): MbtHole {
  const tag = quintVariantTag(raw);
  if (
    tag === "TargetChoice" ||
    tag === "ObjectTargetChoice" ||
    tag === "SpellTargetAllocation" ||
    tag === "SavingThrowOutcome" ||
    tag === "AttackRoll" ||
    tag === "DamageRoll" ||
    tag === "SpellDamageRoll" ||
    tag === "StatBlockRechargeRoll" ||
    tag === "LevitateAltitudeChange" ||
    tag === "LevitateInitialRise" ||
    tag === "SlowSomaticSpellFailureOutcome"
  ) {
    return tag;
  }

  throw new Error(`Unknown Quint battle hole variant: ${tag}`);
}

function weaponAttackOrderingStage(raw: unknown): WeaponAttackOrderingStage {
  const tag = quintVariantTag(raw);
  if (tag === "WeaponAttackActSelectionStage") return "actSelection";
  if (tag === "WeaponAttackTargetChoiceStage") return "targetChoice";
  if (tag === "WeaponAttackAttackRollStage") return "attackRoll";
  if (tag === "WeaponAttackDamageDiceStage") return "damageDice";
  if (tag === "WeaponAttackResolvedStage") return "resolved";

  throw new Error(`Unknown weapon attack ordering stage: ${tag}`);
}

function weaponAttackOrderingHole(raw: unknown): WeaponAttackOrderingHole {
  const tag = quintVariantTag(raw);
  if (tag === "TargetChoiceHoleKind") return "targetChoice";
  if (tag === "AttackRollHoleKind") return "attackRoll";
  if (tag === "RolledDiceHoleKind") return "rolledDice";

  throw new Error(`Unknown weapon attack ordering hole: ${tag}`);
}

function weaponAttackOrderingHoleFromRuntime(
  hole: Pick<BattleHole, "kind">,
): WeaponAttackOrderingHole {
  if (hole.kind === "targetChoice") return "targetChoice";
  if (hole.kind === "attackRoll") return "attackRoll";
  if (hole.kind === "rolledDice") return "rolledDice";

  throw new Error(`Unexpected weapon attack ordering hole: ${hole.kind}`);
}

function weaponAttackOrderingError(raw: unknown): WeaponAttackOrderingError {
  if (
    raw === "" ||
    raw === "targetChoiceRequired" ||
    raw === "attackRollRequired"
  ) {
    return raw;
  }

  throw new Error(`Unknown weapon attack ordering error: ${String(raw)}.`);
}

function saveGatedSpellOrderingStage(
  raw: unknown,
): SaveGatedSpellOrderingStage {
  const tag = quintVariantTag(raw);
  if (tag === "SaveGatedSpellActSelectionStage") return "actSelection";
  if (tag === "SaveGatedSpellTargetListAndConditionChoiceStage") {
    return "targetListAndConditionChoice";
  }
  if (tag === "SaveGatedSpellTargetListStage") return "targetList";
  if (tag === "SaveGatedSpellConditionChoiceStage") {
    return "conditionChoice";
  }
  if (tag === "SaveGatedSpellDamageSavingThrowOutcomeStage") {
    return "damageSavingThrowOutcome";
  }
  if (tag === "SaveGatedSpellConditionSavingThrowOutcomeStage") {
    return "conditionSavingThrowOutcome";
  }
  if (tag === "SaveGatedSpellDamageDiceStage") return "damageDice";
  if (tag === "SaveGatedSpellResolvedStage") return "resolved";

  throw new Error(`Unknown save-gated spell ordering stage: ${tag}`);
}

function saveGatedSpellOrderingHole(raw: unknown): SaveGatedSpellOrderingHole {
  const tag = quintVariantTag(raw);
  if (tag === "SpellTargetListHoleKind") return "spellTargetList";
  if (tag === "ConditionChoiceHoleKind") return "conditionChoice";
  if (tag === "SavingThrowOutcomeHoleKind") return "savingThrowOutcome";
  if (tag === "RolledDiceHoleKind") return "rolledDice";

  throw new Error(`Unknown save-gated spell ordering hole: ${tag}`);
}

function saveGatedSpellOrderingHoleFromRuntime(
  hole: Pick<BattleHole, "kind">,
): SaveGatedSpellOrderingHole {
  if (hole.kind === "spellTargetList") return "spellTargetList";
  if (hole.kind === "conditionChoice") return "conditionChoice";
  if (hole.kind === "savingThrowOutcome") return "savingThrowOutcome";
  if (hole.kind === "rolledDice") return "rolledDice";

  throw new Error(`Unexpected save-gated spell ordering hole: ${hole.kind}`);
}

function saveGatedSpellOrderingError(
  raw: unknown,
): SaveGatedSpellOrderingError {
  if (
    raw === "" ||
    raw === "targetOrAreaRequired" ||
    raw === "savingThrowRequired"
  ) {
    return raw;
  }

  throw new Error(`Unknown save-gated spell ordering error: ${String(raw)}.`);
}

function spellAttackOrderingStage(raw: unknown): SpellAttackOrderingStage {
  const tag = quintVariantTag(raw);
  if (tag === "SpellAttackActSelectionStage") return "actSelection";
  if (tag === "SpellAttackTargetChoiceStage") return "targetChoice";
  if (tag === "SpellAttackTypedTargetChoiceStage") return "typedTargetChoice";
  if (tag === "SpellAttackTargetListStage") return "targetList";
  if (tag === "SpellAttackTargetAllocationStage") return "targetAllocation";
  if (tag === "SpellAttackDamageTypeAndTargetChoiceStage") {
    return "damageTypeAndTargetChoice";
  }
  if (tag === "SpellAttackDamageTypeChoiceStage") return "damageTypeChoice";
  if (tag === "SpellAttackAttackRollStage") return "attackRoll";
  if (tag === "SpellAttackDamageDiceStage") return "damageDice";
  if (tag === "SpellAttackResolvedStage") return "resolved";

  throw new Error(`Unknown spell attack ordering stage: ${tag}`);
}

function spellAttackOrderingHole(raw: unknown): SpellAttackOrderingHole {
  const tag = quintVariantTag(raw);
  if (tag === "TargetChoiceHoleKind") return "targetChoice";
  if (tag === "SpellTargetListHoleKind") return "spellTargetList";
  if (tag === "SpellTargetAllocationHoleKind") return "spellTargetAllocation";
  if (tag === "DamageTypeChoiceHoleKind") return "damageTypeChoice";
  if (tag === "AttackRollHoleKind") return "attackRoll";
  if (tag === "RolledDiceHoleKind") return "rolledDice";

  throw new Error(`Unknown spell attack ordering hole: ${tag}`);
}

function spellAttackOrderingHoleFromRuntime(
  hole: Pick<BattleHole, "kind">,
): readonly SpellAttackOrderingHole[] {
  if (hole.kind === "targetChoice") return ["targetChoice"];
  if (hole.kind === "spellTargetList") return ["spellTargetList"];
  if (hole.kind === "spellTargetAllocation") return ["spellTargetAllocation"];
  if (hole.kind === "damageTypeChoice") return ["damageTypeChoice"];
  if (hole.kind === "attackRoll") return ["attackRoll"];
  if (hole.kind === "rolledDice") return ["rolledDice"];
  if (hole.kind === "objectTargetChoice") return [];

  throw new Error(`Unexpected spell attack ordering hole: ${hole.kind}`);
}

function spellAttackOrderingError(raw: unknown): SpellAttackOrderingError {
  if (
    raw === "" ||
    raw === "targetRequired" ||
    raw === "damageTypeRequired" ||
    raw === "targetOrDamageTypeRequired" ||
    raw === "attackRollRequired"
  ) {
    return raw;
  }

  throw new Error(`Unknown spell attack ordering error: ${String(raw)}.`);
}

function hitPointRestorationOrderingStage(
  raw: unknown,
): HitPointRestorationOrderingStage {
  const tag = quintVariantTag(raw);
  if (tag === "HitPointRestorationActSelectionStage") return "actSelection";
  if (tag === "SpellHealingTargetChoiceStage") {
    return "spellHealingTargetChoice";
  }
  if (tag === "SpellHealingTargetListStage") return "spellHealingTargetList";
  if (tag === "SpellHealingRollStage") return "spellHealingRoll";
  if (tag === "FeatureHealingPoolDistributionStage") {
    return "featureHealingPoolDistribution";
  }
  if (tag === "HitPointRestorationResolvedStage") return "resolved";

  throw new Error(`Unknown Hit Point restoration ordering stage: ${tag}`);
}

function hitPointRestorationOrderingHole(
  raw: unknown,
): HitPointRestorationOrderingHole {
  const tag = quintVariantTag(raw);
  if (tag === "TargetChoiceHoleKind") return "targetChoice";
  if (tag === "SpellTargetListHoleKind") return "spellTargetList";
  if (tag === "RolledDiceHoleKind") return "rolledDice";
  if (tag === "HitPointHealingDistributionHoleKind") {
    return "hitPointHealingDistribution";
  }

  throw new Error(`Unknown Hit Point restoration ordering hole: ${tag}`);
}

function hitPointRestorationOrderingHoleFromRuntime(
  hole: Pick<BattleHole, "kind">,
): HitPointRestorationOrderingHole {
  if (hole.kind === "targetChoice") return "targetChoice";
  if (hole.kind === "spellTargetList") return "spellTargetList";
  if (hole.kind === "rolledDice") return "rolledDice";
  if (hole.kind === "hitPointHealingDistribution") {
    return "hitPointHealingDistribution";
  }

  throw new Error(
    `Unexpected Hit Point restoration ordering hole: ${hole.kind}`,
  );
}

function hitPointRestorationOrderingError(
  raw: unknown,
): HitPointRestorationOrderingError {
  if (
    raw === "" ||
    raw === "healingTargetRequired" ||
    raw === "healingAmountRequired" ||
    raw === "healingDistributionRequired"
  ) {
    return raw;
  }

  throw new Error(
    `Unknown Hit Point restoration ordering error: ${String(raw)}.`,
  );
}

function commandOrderingStage(raw: unknown): CommandOrderingStage {
  const tag = quintVariantTag(raw);
  if (tag === "CommandActSelectionStage") return "actSelection";
  if (tag === "CommandTargetListAndOptionChoiceStage") {
    return "targetListAndOptionChoice";
  }
  if (tag === "CommandTargetListStage") return "targetList";
  if (tag === "CommandOptionChoiceStage") return "optionChoice";
  if (tag === "CommandSavingThrowOutcomeStage") return "savingThrowOutcome";
  if (tag === "CommandDropHeldObjectFactsStage") {
    return "dropHeldObjectFacts";
  }
  if (tag === "CommandApproachMovementStage") return "approachMovement";
  if (tag === "CommandFleeMovementStage") return "fleeMovement";
  if (tag === "CommandResolvedStage") return "resolved";

  throw new Error(`Unknown Command ordering stage: ${tag}`);
}

function commandOrderingHole(raw: unknown): CommandOrderingHole {
  const tag = quintVariantTag(raw);
  if (tag === "SpellTargetListHoleKind") return "spellTargetList";
  if (tag === "CommandOptionChoiceHoleKind") return "commandOptionChoice";
  if (tag === "SavingThrowOutcomeHoleKind") return "savingThrowOutcome";
  if (tag === "MovementHoleKind") return "movement";

  throw new Error(`Unknown Command ordering hole: ${tag}`);
}

function commandOrderingHoleFromRuntime(
  hole: Pick<BattleHole, "kind">,
): readonly CommandOrderingHole[] {
  if (hole.kind === "spellTargetList") return ["spellTargetList"];
  if (hole.kind === "commandOptionChoice") return ["commandOptionChoice"];
  if (hole.kind === "savingThrowOutcome") return ["savingThrowOutcome"];
  if (hole.kind === "movement") return ["movement"];
  if (hole.kind === "heldObjectFacts") return [];
  if (hole.kind === "interruptDecision") return [];

  throw new Error(`Unexpected Command ordering hole: ${hole.kind}`);
}

function commandOrderingError(raw: unknown): CommandOrderingError {
  if (
    raw === "" ||
    raw === "commandTargetListRequired" ||
    raw === "commandOptionChoiceRequired" ||
    raw === "commandSavingThrowRequired" ||
    raw === "commandHeldObjectFactsRequired" ||
    raw === "commandMovementRequired"
  ) {
    return raw;
  }

  throw new Error(`Unknown Command ordering error: ${String(raw)}.`);
}

function commandOrderingPendingOption(
  raw: unknown,
): CommandOrderingPendingOption {
  if (
    raw === "none" ||
    raw === "grovel" ||
    raw === "drop" ||
    raw === "halt" ||
    raw === "approach" ||
    raw === "flee"
  ) {
    return raw;
  }

  throw new Error(`Unknown Command pending option: ${String(raw)}.`);
}

function commandOrderingActor(
  raw: unknown,
): CommandOrderingProjection["currentActor"] {
  if (raw === "Caster" || raw === "Target") return raw;
  throw new Error(`Unknown Command ordering actor: ${String(raw)}.`);
}

function reducerSpineContractStage(raw: unknown): ReducerSpineContractStage {
  const tag = quintVariantTag(raw);
  if (tag === "ReducerNotStarted") return "notStarted";
  if (tag === "ReducerBattleStarted") return "battleStarted";
  if (tag === "ReducerActDiscovered") return "actDiscovered";
  if (tag === "ReducerSubjectNeedsHoles") return "subjectNeedsHoles";
  if (tag === "ReducerSubjectResolved") return "subjectResolved";
  if (tag === "ReducerTurnAdvanced") return "turnAdvanced";

  throw new Error(`Unknown reducer-spine stage: ${tag}.`);
}

function reducerSpineContractEntrypoint(
  raw: unknown,
): ReducerSpineContractEntrypoint {
  const tag = quintVariantTag(raw);
  if (tag === "NoReducerEntrypoint") return "none";
  if (tag === "StartBattleEntrypoint") return "startBattle";
  if (tag === "DiscoverBattleActsEntrypoint") return "discoverBattleActs";
  if (tag === "ResolveBattleSubjectEntrypoint") {
    return "resolveBattleSubject";
  }

  throw new Error(`Unknown reducer-spine entrypoint: ${tag}.`);
}

function reducerSpineContractSubject(
  raw: unknown,
): ReducerSpineContractSubject {
  const tag = quintVariantTag(raw);
  if (tag === "NoReducerSubject") return "none";
  if (tag === "SlotSpellSubject") return "slotSpell";
  if (tag === "WeaponAttackSubject") return "weaponAttack";
  if (tag === "EndTurnSubject") return "endTurn";

  throw new Error(`Unknown reducer-spine subject: ${tag}.`);
}

function reducerSpineContractActor(raw: unknown): ReducerSpineContractActor {
  const tag = quintVariantTag(raw);
  if (tag === "NoSpineActor") return "none";
  if (tag === "CasterActor") return "caster";
  if (tag === "TargetActor") return "target";

  throw new Error(`Unknown reducer-spine actor: ${tag}.`);
}

function reducerSpineContractSpellSlotUse(
  raw: unknown,
): ReducerSpineContractSpellSlotUse {
  const tag = quintVariantTag(raw);
  if (tag === "NoSpellSlotUse") return "none";
  if (tag === "PendingSpellSlotUse") return "pending";
  if (tag === "CommittedSpellSlotUse") return "committed";

  throw new Error(`Unknown reducer-spine spell-slot use: ${tag}.`);
}

function reducerSpineContractHole(raw: unknown): ReducerSpineContractHole {
  const tag = quintVariantTag(raw);
  if (tag === "TargetChoiceHoleKind") return "targetChoice";
  if (tag === "SpellTargetAllocationHoleKind") {
    return "spellTargetAllocation";
  }
  if (tag === "AttackRollHoleKind") return "attackRoll";
  if (tag === "RolledDiceHoleKind") return "rolledDice";

  throw new Error(`Unknown reducer-spine hole: ${tag}.`);
}

function reducerSpineContractHoleFromRuntime(
  hole: Pick<BattleHole, "kind">,
): ReducerSpineContractHole {
  if (hole.kind === "targetChoice") return "targetChoice";
  if (hole.kind === "spellTargetAllocation") return "spellTargetAllocation";
  if (hole.kind === "attackRoll") return "attackRoll";
  if (hole.kind === "rolledDice") return "rolledDice";

  throw new Error(`Unexpected reducer-spine hole: ${hole.kind}.`);
}

function reducerSpineContractActorId(
  actorId: CombatantId,
): ReducerSpineContractActor {
  if (actorId === fighterId) return "caster";
  if (actorId === skeletonId) return "target";

  throw new Error(`Unexpected reducer-spine actor id: ${actorId}.`);
}

function reducerSpineContractSpellSlotUseFromRuntime(
  state: BattleState,
): ReducerSpineContractSpellSlotUse {
  const uses = state.currentTurnResources.spellSlotUsesThisTurn.filter(
    (use) => use.combatantId === fighterId,
  );
  if (uses.some((use) => use.kind === "committed")) return "committed";
  if (uses.some((use) => use.kind === "pending")) return "pending";
  return "none";
}

function mbtLastResult(raw: unknown): MbtLastResult {
  if (
    raw === "init" ||
    raw === "needsHoles" ||
    raw === "resolved" ||
    raw === "invalid"
  ) {
    return raw;
  }

  throw new Error(`Unknown Quint last result: ${String(raw)}.`);
}

function mbtLastInvalidReason(raw: unknown): MbtLastInvalidReason {
  if (
    raw === "" ||
    raw === "invalidFill" ||
    raw === "staleSubject" ||
    raw === "wrongActor"
  ) {
    return raw;
  }

  throw new Error(`Unknown Quint invalid reason: ${String(raw)}.`);
}

function numberFromEnv(
  name: "MBT_STEPS" | "MBT_TRACES",
  fallback: number,
): number {
  const raw = process.env[name];
  if (raw === undefined) {
    return fallback;
  }
  const parsed = Number(raw);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }

  throw new Error(`Expected positive integer ${name}.`);
}

function isRecord(raw: unknown): raw is Readonly<Record<string, unknown>> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw);
}
