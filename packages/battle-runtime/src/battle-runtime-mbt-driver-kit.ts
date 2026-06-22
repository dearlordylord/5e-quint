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
import {
  attackTargetFill as creatureAttackTargetFill,
  statBlockAttackAct,
  statBlockCreature,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  chromaticOrbUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import { battleMagicActionHealingPoolSupportForUnit } from "./unit-feature-support.ts";
import {
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  BATTLE_INVALID_REASON_CODES,
  battleObjectId,
  battleUnitRefWithSupportProfiles,
  battleId,
  battleCombatantSide,
  breakBattleConcentration,
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
  readonly protocolField: string;
  readonly decodeHole: (raw: unknown) => Hole;
  readonly compareHoles?: (left: Hole, right: Hole) => number;
}): MbtWitnessProtocolState<Hole, NoInvalidReason> {
  return decodeTypedWitnessProtocolState(input);
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
  readonly scenarioOutcome: string;
  readonly protocol: Pick<
    MbtWitnessProtocolState<unknown, string>,
    "holes" | "lastResult"
  > & { readonly lastInvalidReason?: string };
  readonly initScenarioResult?: string;
  readonly invalidScenarioReasons?: Readonly<Record<string, string>>;
}): void {
  const initScenarioResult = input.initScenarioResult ?? "init";
  const invalidReason = input.invalidScenarioReasons?.[input.scenarioOutcome];
  const expected: MbtWitnessLastResult =
    invalidReason !== undefined
      ? "invalid"
      : input.scenarioOutcome === initScenarioResult
        ? "init"
        : input.protocol.holes.length > 0
          ? "needsHoles"
          : "resolved";
  if (input.protocol.lastResult !== expected) {
    throw new Error(
      `Expected ${input.label} witness protocol result ${expected} for scenario ${input.scenarioOutcome}, got ${input.protocol.lastResult}.`,
    );
  }
  if (
    invalidReason !== undefined &&
    input.protocol.lastInvalidReason !== invalidReason
  ) {
    throw new Error(
      `Expected ${input.label} witness invalid reason ${invalidReason} for scenario ${input.scenarioOutcome}, got ${String(input.protocol.lastInvalidReason)}.`,
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
  | "movement"
  | "interruptDecision";
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
const DEATH_SAVING_THROW_MBT_HOLES = ["DeathSavingThrow"] as const;
type DeathSavingThrowMbtHole =
  (typeof DEATH_SAVING_THROW_MBT_HOLES)[number];
const DEATH_SAVING_THROW_MBT_TURN_ROLES = ["actor", "target"] as const;
type DeathSavingThrowMbtTurnRole =
  (typeof DEATH_SAVING_THROW_MBT_TURN_ROLES)[number];
type DeathSavingThrowProjection = {
  readonly currentTurnRole: DeathSavingThrowMbtTurnRole;
  readonly targetHp: number;
  readonly targetUnconscious: boolean;
  readonly targetStable: boolean;
  readonly targetDead: boolean;
  readonly targetDeathSuccesses: number;
  readonly targetDeathFailures: number;
  readonly holes: readonly DeathSavingThrowMbtHole[];
  readonly lastResult: MbtLastResult;
  readonly lastInvalidReason: MbtLastInvalidReason;
};
const CONCENTRATION_BREAK_TEARDOWN_SCENARIOS = [
  "init",
  "concentrationSpellCast",
  "damageSaveNeeded",
  "damageFailedTeardownBeforeNextCommand",
  "voluntaryEndTeardown",
  "replacementTeardownBeforeNewEffect",
] as const;
type ConcentrationBreakTeardownScenario =
  (typeof CONCENTRATION_BREAK_TEARDOWN_SCENARIOS)[number];
type ConcentrationBreakTeardownProjection = {
  readonly scenario: ConcentrationBreakTeardownScenario;
  readonly damageTaken: number;
  readonly saveDc: number;
  readonly saveRollTotal: number;
  readonly concentrationSaveOffered: boolean;
  readonly casterConcentrating: boolean;
  readonly blurredEffectCount: number;
  readonly spellSlotExpended: number;
  readonly teardownBeforeNextCommand: boolean;
  readonly replacementStartedAfterTeardown: boolean;
};
type PendingConcentrationSave = {
  readonly state: BattleState;
  readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
  readonly fills: readonly BattleFill[];
  readonly holes: readonly [
    Extract<BattleHole, { readonly kind: "concentrationSavingThrow" }>,
  ];
};
type ConcentrationBreakTeardownRuntimeState = {
  readonly battle: BattleState;
  readonly scenario: ConcentrationBreakTeardownScenario;
  readonly damageTaken: number;
  readonly saveDc: number;
  readonly saveRollTotal: number;
  readonly concentrationSaveOffered: boolean;
  readonly teardownBeforeNextCommand: boolean;
  readonly replacementStartedAfterTeardown: boolean;
  readonly pendingConcentrationSave: PendingConcentrationSave | null;
};
type BattleCombatantState =
  BattleState["combatants"] extends ReadonlyMap<CombatantId, infer Combatant>
    ? Combatant
    : never;
const REDUCER_ROUTE_SUBJECT_FAMILIES = [
  "battleAction",
  "abilityCheckSearch",
  "slotSpell",
  "saveGatedSpell",
  "hitPointRestoration",
  "weaponAttack",
  "spellAttack",
  "spellAttackProcedure",
  "spellHostedWeaponAttack",
  "weaponDamageRider",
  "heldWeaponActiveEffect",
  "weaponEnhancementItemTarget",
  "weaponHostedSpellEffectCleanup",
  "afterHitDamageRider",
  "statBlockAction",
  "creatureAttack",
  "deathSavingThrow",
  "concentrationTeardown",
  "commandEffect",
  "reactionSpell",
  "interruptStackResume",
  "rollModifierEffect",
  "scalarBuffEffect",
  "repeatSaveConditionEffect",
  "turnBoundaryEffectLifecycle",
  "zeroHitPointSpellEffectTeardown",
  "unitFeatureBonusAction",
  "companionLifecycle",
  "companionSharedSenses",
  "companionTouchDelivery",
  "companionReactionAttack",
  "objectTargetSpellAttack",
] as const;
type ReducerRouteSubjectFamily =
  (typeof REDUCER_ROUTE_SUBJECT_FAMILIES)[number];
const REDUCER_ROUTE_OWNER_GROUPS = [
  "battleActionEconomy",
  "battleSpellSlotAndActionEconomy",
  "battleHoleFrontier",
  "battleTargetSelection",
  "battleAttackRoll",
  "battleSpellAttackProcedure",
  "battleAbilityCheck",
  "battleHitPoint",
  "battleHitPointAndZeroHpLifecycle",
  "battleConditionLifecycle",
  "battleStatBlockAction",
  "battleConcentration",
  "battleActiveEffect",
  "battleItemTargetBoundary",
  "battleMovementResource",
  "battleInterruptStack",
  "battleFeatureResource",
  "battleTemporaryHitPoint",
  "battleTurnBoundary",
  "battleCompanion",
  "battleObjectTargetBoundary",
] as const;
type ReducerRouteOwnerGroup = (typeof REDUCER_ROUTE_OWNER_GROUPS)[number];
const REDUCER_ROUTE_HOLES = [
  "abilityCheck",
  "abilityChoice",
  "attackDamageDisposition",
  "attackRoll",
  "commandOptionChoice",
  "companionReappearanceInitiative",
  "concentrationSavingThrow",
  "conditionChoice",
  "damageTypeChoice",
  "deathSavingThrow",
  "grappleOutcome",
  "gustOfWindLineDirectionChoice",
  "hitPointHealingDistribution",
  "interruptDecision",
  "levitateAltitudeChange",
  "levitateInitialRise",
  "movement",
  "objectDropResolution",
  "ongoingSpellTargetChoice",
  "rolledDice",
  "sanctuaryInterdictionOutcome",
  "savingThrowOutcome",
  "selfTransformationModeChoice",
  "shoveOutcome",
  "skillChoice",
  "slowSomaticSpellFailureOutcome",
  "spellcastingAbilityCheck",
  "spellTargetAllocation",
  "spellTargetList",
  "statBlockRechargeRoll",
  "targetAbilityChoices",
  "targetChoice",
  "unitFeatureDecision",
  "wildShapeEquipmentDisposition",
] as const;
type ReducerRouteHole = (typeof REDUCER_ROUTE_HOLES)[number];
const REDUCER_ROUTE_FILLS = [
  "abilityCheck",
  "abilityChoice",
  "attackDamageDisposition",
  "attackRoll",
  "commandOptionChoice",
  "companionReappearanceInitiative",
  "concentrationSavingThrow",
  "conditionChoice",
  "damageTypeChoice",
  "deathSavingThrow",
  "grappleOutcome",
  "gustOfWindLineDirectionChoice",
  "hitPointHealingDistribution",
  "interruptDecision",
  "levitateAltitudeChange",
  "levitateInitialRise",
  "movement",
  "objectDropResolution",
  "ongoingSpellTargetChoice",
  "rolledDice",
  "sanctuaryInterdictionOutcome",
  "savingThrowOutcome",
  "selfTransformationModeChoice",
  "shoveOutcome",
  "skillChoice",
  "slowSomaticSpellFailureOutcome",
  "spellTargetAllocation",
  "spellTargetList",
  "statBlockRechargeRoll",
  "targetAbilityChoices",
  "targetChoice",
  "unitFeatureDecision",
  "wildShapeEquipmentDisposition",
] as const;
type ReducerRouteFill = (typeof REDUCER_ROUTE_FILLS)[number];
type ReducerRouteEvent =
  | {
      readonly kind: "startBattle";
      readonly owner: ReducerRouteOwnerGroup;
    }
  | {
      readonly kind: "discoverBattleActs";
      readonly subject: ReducerRouteSubjectFamily;
      readonly holes: readonly ReducerRouteHole[];
      readonly owner: ReducerRouteOwnerGroup;
    }
  | {
      readonly kind: "resolveBattleSubject";
      readonly subject: ReducerRouteSubjectFamily;
      readonly fill: ReducerRouteFill;
      readonly holes: readonly ReducerRouteHole[];
      readonly owner: ReducerRouteOwnerGroup;
    }
  | {
      readonly kind: "resolveBattleSubjectWithoutFill";
      readonly subject: ReducerRouteSubjectFamily;
      readonly holes: readonly ReducerRouteHole[];
      readonly owner: ReducerRouteOwnerGroup;
    }
  | {
      readonly kind: "resolveBattleInterrupt";
      readonly subject: ReducerRouteSubjectFamily;
      readonly fill: ReducerRouteFill;
      readonly holes: readonly ReducerRouteHole[];
      readonly owner: ReducerRouteOwnerGroup;
    };
export type {
  ReducerRouteEvent,
  ReducerRouteFill,
  ReducerRouteHole,
  ReducerRouteOwnerGroup,
  ReducerRouteSubjectFamily,
};
type ReducerRoutedMagicMissileProjection = MbtProjection & {
  readonly route: readonly ReducerRouteEvent[];
};
type ReducerRoutedWeaponAttackSkeletonProjection = MbtProjection & {
  readonly route: readonly ReducerRouteEvent[];
};
type ReducerRoutedWeaponAttackOrderingProjection =
  WeaponAttackOrderingProjection & {
    readonly route: readonly ReducerRouteEvent[];
  };
type ReducerRoutedSaveGatedSpellOrderingProjection =
  SaveGatedSpellOrderingProjection & {
    readonly route: readonly ReducerRouteEvent[];
  };
type ReducerRoutedSpellAttackOrderingProjection =
  SpellAttackOrderingProjection & {
    readonly route: readonly ReducerRouteEvent[];
  };
type ReducerRoutedChainedAttackProcedureProjection = {
  readonly route: readonly ReducerRouteEvent[];
};
type ReducerRoutedIndependentSpellAttackSequenceProjection = {
  readonly route: readonly ReducerRouteEvent[];
};
type ActionSpellSubject = Extract<
  BattleSubject,
  { readonly tag: "actionSpell" }
>;
type ChainedAttackProcedureSubject = ActionSpellSubject & {
  readonly invocation: ActionSpellSubject["invocation"] & {
    readonly procedure: "chainedSpellAttackDamage";
  };
};
type ChainedAttackProcedureAct = ReturnType<typeof discoverBattleActs>[number] & {
  readonly subject: ChainedAttackProcedureSubject;
};
type ChainedAttackProcedureSlotLevel = 1 | 2;
type IndependentSpellAttackSequenceSubject = ActionSpellSubject & {
  readonly invocation: ActionSpellSubject["invocation"] & {
    readonly procedure: "spellAttackSequence";
  };
};
type IndependentSpellAttackSequenceAct = ReturnType<
  typeof discoverBattleActs
>[number] & {
  readonly subject: IndependentSpellAttackSequenceSubject;
};
type ReducerRoutedHitPointRestorationOrderingProjection =
  HitPointRestorationOrderingProjection & {
    readonly route: readonly ReducerRouteEvent[];
  };
type ReducerRoutedDeathSavingThrowProjection = DeathSavingThrowProjection & {
  readonly route: readonly ReducerRouteEvent[];
};
type ReducerRoutedConcentrationBreakTeardownProjection =
  ConcentrationBreakTeardownProjection & {
    readonly route: readonly ReducerRouteEvent[];
  };
type ReducerRoutedCommandOrderingProjection = CommandOrderingProjection & {
  readonly route: readonly ReducerRouteEvent[];
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
type ReducerRoutedAdrenalineRushProjection = AdrenalineRushMbtProjection & {
  readonly route: readonly ReducerRouteEvent[];
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
type ReducerRoutedScalarBuffProjection = Omit<
  ScalarBuffMbtProjection,
  "fighterSpeed" | "goblinSpeed"
> & {
  readonly casterSpeed: number;
  readonly targetSpeed: number;
  readonly route: readonly ReducerRouteEvent[];
};

const fighterId = combatantId("fighter");
const skeletonId = combatantId("skeleton");
const deathSavingThrowTargetId = combatantId("death-saving-throw-target");
const concentrationBreakAttackerId = combatantId(
  "concentration-break-attacker",
);
const chainedAttackProcedureSecondTargetId = combatantId(
  "chained-attack-procedure-second-target",
);
const chainedAttackProcedureThirdTargetId = combatantId(
  "chained-attack-procedure-third-target",
);
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

export function reducerRouteStartBattle(
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return { kind: "startBattle", owner };
}

export function reducerRouteDiscoverBattleActs(input: {
  readonly subject: ReducerRouteSubjectFamily;
  readonly holes: readonly Pick<BattleHole, "kind">[];
  readonly owner: ReducerRouteOwnerGroup;
}): ReducerRouteEvent {
  return {
    kind: "discoverBattleActs",
    subject: input.subject,
    holes: reducerRouteHolesFromRuntime(input.holes),
    owner: input.owner,
  };
}

export function reducerRouteResolveBattleSubject(input: {
  readonly subject: ReducerRouteSubjectFamily;
  readonly fill: ReducerRouteFill;
  readonly holes: readonly Pick<BattleHole, "kind">[];
  readonly owner: ReducerRouteOwnerGroup;
}): ReducerRouteEvent {
  return {
    kind: "resolveBattleSubject",
    subject: input.subject,
    fill: input.fill,
    holes: reducerRouteHolesFromRuntime(input.holes),
    owner: input.owner,
  };
}

export function reducerRouteResolveBattleSubjectWithoutFill(input: {
  readonly subject: ReducerRouteSubjectFamily;
  readonly holes: readonly Pick<BattleHole, "kind">[];
  readonly owner: ReducerRouteOwnerGroup;
}): ReducerRouteEvent {
  return {
    kind: "resolveBattleSubjectWithoutFill",
    subject: input.subject,
    holes: reducerRouteHolesFromRuntime(input.holes),
    owner: input.owner,
  };
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

const chainedAttackProcedureRouteDriverSchema = {
  init: {},
  doStartCast: { slotLevel: mbtPickSchemas.int },
  doChooseDamageType: {},
  doChooseInitialTarget: {},
  doResolveStep0AttackHit: {},
  doResolveStep0DamageNoDuplicate: {},
  doResolveStep0DamageDuplicate: {},
  doChooseFirstLeapTarget: {},
  doResolveStep1AttackHit: {},
  doResolveStep1DuplicateDamageSlot1Limit: {},
  doResolveStep1DuplicateDamageSlot2AllowsLeap: {},
  step: {},
} as const;

const independentSpellAttackSequenceRouteDriverSchema = {
  init: {},
  doFillTwoCreatureTargets: {},
  doFillFirstAttackMiss: {},
  doFillFirstAttackHit: {},
  doFillFirstDamageLow: {},
  doFillSecondAttackMiss: {},
  doFillSecondAttackHit: {},
  doFillSecondDamageLow: {},
  doRejectStaleAfterResolved: {},
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

const deathSavingThrowRouteDriverSchema = {
  init: {},
  doDiscoverEndTurnDeathSavingThrow: {},
  doFillDeathSavingThrow: {
    roll: mbtPickSchemas.int,
  },
  doRejectWrongActorEndTurnAfterResolved: {},
  step: {},
} as const;

const concentrationBreakTeardownRouteDriverSchema = {
  init: {},
  doCastConcentrationSpell: {},
  doDamageRequestsConcentrationSave: {
    damageDiePip: mbtPickSchemas.int,
  },
  doFailConcentrationSave: {
    saveRollTotal: mbtPickSchemas.int,
  },
  doVoluntaryEndConcentration: {},
  doCastReplacementConcentrationSpell: {},
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

export function createBattleRuntimeRouteDriver() {
  return defineDriver(driverSchema, () => {
    let state = fighterVsSkeletonBattle();
    let subject: BattleSubject = fighterAttackSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = discoverAttackHoles(state, subject);
    let route: readonly ReducerRouteEvent[] = [];
    let lastResult: MbtProjection["lastResult"] = "init";
    let lastInvalidReason: MbtProjection["lastInvalidReason"] = "";

    function reset(): void {
      state = fighterVsSkeletonBattle();
      subject = fighterAttackSubject();
      fills = [];
      holes = discoverAttackHoles(state, subject);
      route = [
        reducerRouteStartBattle("battleActionEconomy"),
        reducerRouteDiscoverBattleActs({
          subject: "weaponAttack",
          holes,
          owner: "battleActionEconomy",
        }),
      ];
      lastResult = "init";
      lastInvalidReason = "";
    }

    function routeHolesAfter(
      result: BattleResolutionResult,
    ): readonly BattleHole[] {
      if (result.tag === "resolved") return [];
      if (result.tag === "needsHoles") return result.holes;
      return holes;
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

    function submit(input: {
      readonly nextFills: readonly BattleFill[];
      readonly routeSubject: ReducerRouteSubjectFamily;
      readonly fill: ReducerRouteFill;
      readonly owner: ReducerRouteOwnerGroup;
    }): void {
      fills = fillsWithMbtSpellCastReactionFacts(holes, input.nextFills);
      const result = resolveBattleSubject({ state, subject, fills });
      const nextRouteHoles = routeHolesAfter(result);
      recordResult(result);
      route = [
        ...route,
        reducerRouteResolveBattleSubject({
          subject: input.routeSubject,
          fill: input.fill,
          holes: nextRouteHoles,
          owner: input.owner,
        }),
      ];
    }

    function resolveWithoutFill(input: {
      readonly routeSubject: ReducerRouteSubjectFamily;
      readonly owner: ReducerRouteOwnerGroup;
    }): void {
      const result = resolveBattleSubject({ state, subject, fills });
      const nextRouteHoles = routeHolesAfter(result);
      recordResult(result);
      route = [
        ...route,
        reducerRouteResolveBattleSubjectWithoutFill({
          subject: input.routeSubject,
          holes: nextRouteHoles,
          owner: input.owner,
        }),
      ];
    }

    reset();

    return {
      init: reset,
      doDiscoverAttack: () => {
        subject = fighterAttackSubject();
        holes = discoverAttackHoles(state, subject);
        route = [
          ...route,
          reducerRouteDiscoverBattleActs({
            subject: "weaponAttack",
            holes,
            owner: "battleActionEconomy",
          }),
        ];
        lastResult = "needsHoles";
        lastInvalidReason = "";
      },
      doFillTarget: () => {
        const target = requireHole(holes, "targetChoice");
        submit({
          nextFills: [targetFill(target, skeletonId)],
          routeSubject: "weaponAttack",
          fill: "targetChoice",
          owner: "battleTargetSelection",
        });
      },
      doRejectWrongTarget: () => {
        const target = requireHole(holes, "targetChoice");
        submit({
          nextFills: [targetFill(target, fighterId)],
          routeSubject: "weaponAttack",
          fill: "targetChoice",
          owner: "battleTargetSelection",
        });
      },
      doFillAttackRollMiss: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        submit({
          nextFills: [
            ...fills,
            attackRollFill(attackRoll, { total: 13, naturalD20: 9 }),
          ],
          routeSubject: "weaponAttack",
          fill: "attackRoll",
          owner: "battleAttackRoll",
        });
      },
      doFillAttackRollHit: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        submit({
          nextFills: [
            ...fills,
            attackRollFill(attackRoll, {
              total: 14,
              naturalD20: 10,
              rollMode: "advantage",
            }),
          ],
          routeSubject: "weaponAttack",
          fill: "attackRoll",
          owner: "battleAttackRoll",
        });
      },
      doFillDamageLow: () => {
        const damage = requireHole(holes, "rolledDice");
        submit({
          nextFills: [...fills, damageRollFill(damage, 2)],
          routeSubject: "weaponAttack",
          fill: "rolledDice",
          owner: "battleHitPoint",
        });
      },
      doFillDamageHigh: () => {
        const damage = requireHole(holes, "rolledDice");
        submit({
          nextFills: [...fills, damageRollFill(damage, 4)],
          routeSubject: "weaponAttack",
          fill: "rolledDice",
          owner: "battleHitPoint",
        });
      },
      doFillDamageLowSneakAttack: () => {
        const damage = requireHole(holes, "rolledDice");
        submit({
          nextFills: [
            ...fills,
            damageRollFillWithGroups(
              damage,
              [[2], [2]],
              ["rogue_sneak_attack"],
            ),
          ],
          routeSubject: "weaponAttack",
          fill: "rolledDice",
          owner: "battleHitPoint",
        });
      },
      doFillDamageHighSneakAttack: () => {
        const damage = requireHole(holes, "rolledDice");
        submit({
          nextFills: [
            ...fills,
            damageRollFillWithGroups(
              damage,
              [[4], [4]],
              ["rogue_sneak_attack"],
            ),
          ],
          routeSubject: "weaponAttack",
          fill: "rolledDice",
          owner: "battleHitPoint",
        });
      },
      doRejectStaleAfterResolved: () => {
        resolveWithoutFill({
          routeSubject: "weaponAttack",
          owner: "battleHoleFrontier",
        });
      },
      doStartSkeletonTurn: () => {
        subject = endTurnSubject();
        fills = [];
        resolveWithoutFill({
          routeSubject: "battleAction",
          owner: "battleActionEconomy",
        });
      },
      doResolveSkeletonMultiattack: () => {
        subject = skeletonMultiattackSubject();
        fills = [];
        resolveWithoutFill({
          routeSubject: "statBlockAction",
          owner: "battleStatBlockAction",
        });
      },
      doRejectRecursiveSkeletonMultiattack: () => {
        subject = skeletonMultiattackSubject();
        fills = [];
        resolveWithoutFill({
          routeSubject: "statBlockAction",
          owner: "battleStatBlockAction",
        });
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
        route = [
          ...route,
          reducerRouteDiscoverBattleActs({
            subject: "statBlockAction",
            holes: [target],
            owner: "battleStatBlockAction",
          }),
        ];
        fills = [
          targetChoice,
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ];
        const result = resolveBattleSubject({ state, subject, fills });
        const nextRouteHoles = routeHolesAfter(result);
        recordResult(result);
        route = [
          ...route,
          reducerRouteResolveBattleSubject({
            subject: "statBlockAction",
            fill: "targetChoice",
            holes: [attackRoll],
            owner: "battleTargetSelection",
          }),
          reducerRouteResolveBattleSubject({
            subject: "statBlockAction",
            fill: "attackRoll",
            holes: nextRouteHoles,
            owner: "battleAttackRoll",
          }),
        ];
      },
      step: () => {},
      getState: () => ({
        ...projectMbtState({
          state,
          holes,
          lastResult,
          lastInvalidReason,
        }),
        route,
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

export function createWeaponAttackOrderingRouteDriver() {
  return defineDriver(weaponAttackOrderingDriverSchema, () => {
    let state = fighterVsSkeletonBattle();
    const subject = fighterAttackSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = [];
    let route: readonly ReducerRouteEvent[] = [];
    let stage: WeaponAttackOrderingProjection["stage"] = "actSelection";
    let lastResult: WeaponAttackOrderingProjection["lastResult"] = "init";
    let orderingError: WeaponAttackOrderingProjection["orderingError"] = "";

    function reset(): void {
      state = fighterVsSkeletonBattle();
      fills = [];
      holes = [];
      route = [reducerRouteStartBattle("battleActionEconomy")];
      stage = "actSelection";
      lastResult = "init";
      orderingError = "";
    }

    function routeHolesAfter(
      result: BattleResolutionResult,
    ): readonly BattleHole[] {
      if (result.tag === "resolved") return [];
      if (result.tag === "needsHoles") return result.holes;
      return holes;
    }

    function recordAccepted(
      result: BattleResolutionResult,
      nextStage: WeaponAttackOrderingProjection["stage"],
      fill: ReducerRouteFill,
      owner: ReducerRouteOwnerGroup,
    ): void {
      lastResult = result.tag;
      const nextRouteHoles = routeHolesAfter(result);
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        route = [
          ...route,
          reducerRouteResolveBattleSubject({
            subject: "weaponAttack",
            fill,
            holes: nextRouteHoles,
            owner,
          }),
        ];
        stage = nextStage;
        orderingError = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        route = [
          ...route,
          reducerRouteResolveBattleSubject({
            subject: "weaponAttack",
            fill,
            holes: nextRouteHoles,
            owner,
          }),
        ];
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
      fill: ReducerRouteFill,
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
      route = [
        ...route,
        reducerRouteResolveBattleSubject({
          subject: "weaponAttack",
          fill,
          holes,
          owner: "battleHoleFrontier",
        }),
      ];
      lastResult = result.tag;
      orderingError = expectedOrderingError;
    }

    reset();

    return {
      init: reset,
      doDiscoverAttack: () => {
        holes = discoverAttackHoles(state, subject);
        route = [
          ...route,
          reducerRouteDiscoverBattleActs({
            subject: "weaponAttack",
            holes,
            owner: "battleActionEconomy",
          }),
        ];
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
          "attackRoll",
        );
      },
      doFillTargetChoice: () => {
        const target = requireHole(holes, "targetChoice");
        fills = [targetFill(target, skeletonId)];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "attackRoll",
          "targetChoice",
          "battleTargetSelection",
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
          "rolledDice",
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
          "attackRoll",
          "battleAttackRoll",
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
          "attackRoll",
          "battleAttackRoll",
        );
      },
      doFillDamageDice: () => {
        const damage = requireHole(holes, "rolledDice");
        fills = [...fills, damageRollFill(damage, 3)];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
          "rolledDice",
          "battleHitPoint",
        );
      },
      step: () => {},
      getState: () => ({
        ...projectWeaponAttackOrderingState({
          holes,
          stage,
          lastResult,
          orderingError,
        }),
        route,
      }),
    };
  });
}

export function createSaveGatedSpellOrderingRouteDriver() {
  return defineDriver(saveGatedSpellOrderingDriverSchema, () => {
    let state = saveGatedSpellOrderingBattle("lightning_bolt", 3);
    let subject: Extract<BattleSubject, { readonly tag: "actionSpell" }> =
      lightningBoltSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = [];
    let route: readonly ReducerRouteEvent[] = [];
    let stage: SaveGatedSpellOrderingProjection["stage"] = "actSelection";
    let lastResult: SaveGatedSpellOrderingProjection["lastResult"] = "init";
    let orderingError: SaveGatedSpellOrderingProjection["orderingError"] = "";

    function reset(): void {
      state = saveGatedSpellOrderingBattle("lightning_bolt", 3);
      subject = lightningBoltSubject();
      fills = [];
      holes = [];
      route = [reducerRouteStartBattle("battleActionEconomy")];
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
      route = [
        ...route,
        reducerRouteDiscoverBattleActs({
          subject: "saveGatedSpell",
          holes,
          owner: "battleSpellSlotAndActionEconomy",
        }),
      ];
      stage = nextStage;
      lastResult = "needsHoles";
      orderingError = "";
    }

    function recordAccepted(
      result: BattleResolutionResult,
      nextStage: SaveGatedSpellOrderingProjection["stage"],
      fill: ReducerRouteFill,
      owner: ReducerRouteOwnerGroup,
    ): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        route = [
          ...route,
          reducerRouteResolveBattleSubject({
            subject: "saveGatedSpell",
            fill,
            holes,
            owner,
          }),
        ];
        stage = nextStage;
        orderingError = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        route = [
          ...route,
          reducerRouteResolveBattleSubject({
            subject: "saveGatedSpell",
            fill,
            holes,
            owner,
          }),
        ];
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
      fill: ReducerRouteFill,
    ): void {
      if (result.tag !== "needsHoles") {
        throw new Error(
          "Expected save-gated spell fill to request earlier holes.",
        );
      }
      lastResult = result.tag;
      holes = result.holes;
      route = [
        ...route,
        reducerRouteResolveBattleSubject({
          subject: "saveGatedSpell",
          fill,
          holes,
          owner: "battleHoleFrontier",
        }),
      ];
      stage = expectedStage;
      orderingError = expectedOrderingError;
    }

    reset();

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
          "rolledDice",
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
          "savingThrowOutcome",
          "battleHoleFrontier",
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
          "rolledDice",
          "battleHitPoint",
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
          "spellTargetList",
          "battleHoleFrontier",
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
          "conditionChoice",
          "battleHoleFrontier",
        );
      },
      doFillConditionChoiceBeforeTargetList: () => {
        const conditionChoice = requireHole(holes, "conditionChoice");
        fills = [saveGatedSpellConditionChoiceFill(conditionChoice, "blinded")];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "targetList",
          "conditionChoice",
          "battleHoleFrontier",
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
          "spellTargetList",
          "battleHoleFrontier",
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
          "savingThrowOutcome",
          "battleHoleFrontier",
        );
      },
      step: () => {},
      getState: () => ({
        ...projectSaveGatedSpellOrderingState({
          holes,
          stage,
          lastResult,
          orderingError,
        }),
        route,
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

export function createSpellAttackOrderingRouteDriver() {
  return defineDriver(spellAttackOrderingDriverSchema, () => {
    // authored-id-dispatch-allow: battle-runtime-mbt-fixture-boundary
    let state = spellAttackOrderingBattle("fire_bolt");
    let subject: Extract<BattleSubject, { readonly tag: "actionSpell" }> =
      spellAttackSubject("fire_bolt", "spellAttackDamage");
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = [];
    let route: readonly ReducerRouteEvent[] = [];
    let stage: SpellAttackOrderingProjection["stage"] = "actSelection";
    let lastResult: SpellAttackOrderingProjection["lastResult"] = "init";
    let orderingError: SpellAttackOrderingProjection["orderingError"] = "";

    function reset(): void {
      state = spellAttackOrderingBattle("fire_bolt");
      subject = spellAttackSubject("fire_bolt", "spellAttackDamage");
      fills = [];
      holes = [];
      route = [reducerRouteStartBattle("battleActionEconomy")];
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
      route = [
        ...route,
        reducerRouteDiscoverBattleActs({
          subject: "spellAttack",
          holes,
          owner: "battleActionEconomy",
        }),
      ];
      stage = nextStage;
      lastResult = "needsHoles";
      orderingError = "";
    }

    function routeHolesAfter(
      result: BattleResolutionResult,
    ): readonly BattleHole[] {
      if (result.tag === "resolved") return [];
      if (result.tag === "needsHoles") return result.holes;
      return holes;
    }

    function recordAccepted(
      result: BattleResolutionResult,
      nextStage: SpellAttackOrderingProjection["stage"],
      fill: ReducerRouteFill,
      owner: ReducerRouteOwnerGroup,
    ): void {
      lastResult = result.tag;
      const nextRouteHoles = routeHolesAfter(result);
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        route = [
          ...route,
          reducerRouteResolveBattleSubject({
            subject: "spellAttack",
            fill,
            holes: nextRouteHoles,
            owner,
          }),
        ];
        stage = nextStage;
        orderingError = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        route = [
          ...route,
          reducerRouteResolveBattleSubject({
            subject: "spellAttack",
            fill,
            holes: nextRouteHoles,
            owner,
          }),
        ];
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
      fill: ReducerRouteFill,
    ): void {
      if (result.tag !== "needsHoles") {
        throw new Error("Expected spell attack fill to request earlier holes.");
      }
      lastResult = result.tag;
      holes = result.holes;
      route = [
        ...route,
        reducerRouteResolveBattleSubject({
          subject: "spellAttack",
          fill,
          holes,
          owner: "battleHoleFrontier",
        }),
      ];
      stage = expectedStage;
      orderingError = expectedOrderingError;
    }

    reset();

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
          "attackRoll",
        );
      },
      doFillTargetChoice: () => {
        const target = requireHole(holes, "targetChoice");
        fills = [spellTargetChoiceFill(target, skeletonId, "fire_bolt")];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "attackRoll",
          "targetChoice",
          "battleTargetSelection",
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
          "rolledDice",
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
          "attackRoll",
          "battleAttackRoll",
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
          "attackRoll",
          "battleAttackRoll",
        );
      },
      doFillDamageDice: () => {
        const damage = requireHole(holes, "rolledDice");
        fills = [...fills, damageRollFill(damage, 3)];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
          "rolledDice",
          "battleHitPoint",
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
          "damageTypeChoice",
          "battleHoleFrontier",
        );
      },
      doFillTargetChoiceBeforeDamageType: () => {
        const target = requireHole(holes, "targetChoice");
        fills = [spellTargetChoiceFill(target, skeletonId, "sorcerous_burst")];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "damageTypeChoice",
          "targetChoice",
          "battleTargetSelection",
        );
      },
      doFillDamageTypeAfterTargetChoice: () => {
        const damageType = requireHole(holes, "damageTypeChoice");
        fills = [...fills, spellDamageTypeChoiceFill(damageType, "fire")];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "attackRoll",
          "damageTypeChoice",
          "battleHoleFrontier",
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
          "targetChoice",
          "battleTargetSelection",
        );
      },
      step: () => {},
      getState: () => ({
        ...projectSpellAttackOrderingState({
          holes,
          stage,
          lastResult,
          orderingError,
        }),
        route,
      }),
    };
  });
}

const CHAINED_ATTACK_PROCEDURE_ROUTE_SUBJECT =
  "spellAttackProcedure" satisfies ReducerRouteSubjectFamily;
const CHAINED_ATTACK_PROCEDURE_DAMAGE_TYPE = "fire" satisfies DamageType;
const CHAINED_ATTACK_PROCEDURE_STEP0_NO_DUPLICATE_FACES = [
  1,
  2,
  3,
] as const;
const CHAINED_ATTACK_PROCEDURE_STEP0_NO_DUPLICATE_SLOT2_FACES = [
  1,
  2,
  3,
  4,
] as const;
const CHAINED_ATTACK_PROCEDURE_STEP0_DUPLICATE_FACES = [
  2,
  2,
  5,
] as const;
const CHAINED_ATTACK_PROCEDURE_STEP0_DUPLICATE_SLOT2_FACES = [
  2,
  2,
  5,
  1,
] as const;
const CHAINED_ATTACK_PROCEDURE_STEP1_SLOT1_LIMIT_FACES = [
  1,
  1,
  1,
] as const;
const CHAINED_ATTACK_PROCEDURE_STEP1_SLOT2_LEAP_FACES = [
  1,
  1,
  1,
  1,
] as const;
const INDEPENDENT_SPELL_ATTACK_SEQUENCE_ROUTE_SUBJECT =
  "spellAttackProcedure" satisfies ReducerRouteSubjectFamily;
const INDEPENDENT_SPELL_ATTACK_SEQUENCE_SPELL_ID = "eldritch_blast";
const INDEPENDENT_SPELL_ATTACK_SEQUENCE_INITIAL_TARGET_HP = 13;
const INDEPENDENT_SPELL_ATTACK_SEQUENCE_LOW_DAMAGE = 4;

export function createChainedAttackProcedureRouteDriver() {
  return defineDriver(chainedAttackProcedureRouteDriverSchema, () => {
    let state = chainedAttackProcedureBattle();
    let subject: ChainedAttackProcedureSubject | null = null;
    let slotLevel: ChainedAttackProcedureSlotLevel | null = null;
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = [];
    let route: readonly ReducerRouteEvent[] = [];

    function reset(): void {
      state = chainedAttackProcedureBattle();
      subject = null;
      slotLevel = null;
      fills = [];
      holes = [];
      route = [reducerRouteStartBattle("battleActionEconomy")];
    }

    function recordResolvedFill(input: {
      readonly fill: BattleFill;
      readonly expectedTag: "needsHoles" | "resolved";
      readonly routeFill: ReducerRouteFill;
      readonly owners: readonly ReducerRouteOwnerGroup[];
    }): void {
      const currentSubject = requireChainedAttackProcedureSubject(subject);
      fills = [...fills, input.fill];
      const result = resolveBattleSubject({
        state,
        subject: currentSubject,
        fills,
      });
      if (result.tag !== input.expectedTag) {
        throw new Error(
          `Expected chained attack procedure ${input.expectedTag}, got ${
            result.tag
          }: ${"message" in result ? result.message : ""}`,
        );
      }
      holes = result.tag === "needsHoles" ? result.holes : [];
      route = [
        ...route,
        ...input.owners.map((owner) =>
          reducerRouteResolveBattleSubject({
            subject: CHAINED_ATTACK_PROCEDURE_ROUTE_SUBJECT,
            fill: input.routeFill,
            holes,
            owner,
          }),
        ),
      ];
    }

    reset();

    return {
      init: reset,
      doStartCast: (input: { readonly slotLevel: number }) => {
        slotLevel = chainedAttackProcedureSlotLevel(input.slotLevel);
        const act = chainedAttackProcedureAct(state, slotLevel);
        subject = act.subject;
        fills = [];
        holes = act.initialHoles;
        route = [
          ...route,
          reducerRouteDiscoverBattleActs({
            subject: CHAINED_ATTACK_PROCEDURE_ROUTE_SUBJECT,
            holes,
            owner: "battleSpellSlotAndActionEconomy",
          }),
        ];
      },
      doChooseDamageType: () => {
        recordResolvedFill({
          fill: spellDamageTypeChoiceFill(
            requireTypedHole(holes, "damageTypeChoice"),
            CHAINED_ATTACK_PROCEDURE_DAMAGE_TYPE,
          ),
          expectedTag: "needsHoles",
          routeFill: "damageTypeChoice",
          owners: ["battleSpellAttackProcedure"],
        });
      },
      doChooseInitialTarget: () => {
        recordResolvedFill({
          fill: chainedAttackProcedureTargetFill(
            requireTypedHole(holes, "targetChoice"),
            spellTargetId,
          ),
          expectedTag: "needsHoles",
          routeFill: "targetChoice",
          owners: ["battleTargetSelection", "battleSpellAttackProcedure"],
        });
      },
      doResolveStep0AttackHit: () => {
        recordResolvedFill({
          fill: attackRollFill(requireTypedHole(holes, "attackRoll"), {
            total: 18,
            naturalD20: 12,
          }),
          expectedTag: "needsHoles",
          routeFill: "attackRoll",
          owners: ["battleAttackRoll"],
        });
      },
      doResolveStep0DamageNoDuplicate: () => {
        recordResolvedFill({
          fill: chainedAttackProcedureDamageRollFill(
            requireTypedHole(holes, "rolledDice"),
            chainedAttackProcedureStep0NoDuplicateFaces(
              requireChainedAttackProcedureSlotLevel(slotLevel),
            ),
          ),
          expectedTag: "resolved",
          routeFill: "rolledDice",
          owners: ["battleHitPoint", "battleSpellAttackProcedure"],
        });
      },
      doResolveStep0DamageDuplicate: () => {
        recordResolvedFill({
          fill: chainedAttackProcedureDamageRollFill(
            requireTypedHole(holes, "rolledDice"),
            chainedAttackProcedureStep0DuplicateFaces(
              requireChainedAttackProcedureSlotLevel(slotLevel),
            ),
          ),
          expectedTag: "needsHoles",
          routeFill: "rolledDice",
          owners: ["battleHitPoint", "battleSpellAttackProcedure"],
        });
      },
      doChooseFirstLeapTarget: () => {
        recordResolvedFill({
          fill: chainedAttackProcedureLeapTargetFill(
            requireTypedHole(holes, "targetChoice"),
          ),
          expectedTag: "needsHoles",
          routeFill: "targetChoice",
          owners: ["battleTargetSelection", "battleSpellAttackProcedure"],
        });
      },
      doResolveStep1AttackHit: () => {
        recordResolvedFill({
          fill: attackRollFill(requireTypedHole(holes, "attackRoll"), {
            total: 18,
            naturalD20: 12,
          }),
          expectedTag: "needsHoles",
          routeFill: "attackRoll",
          owners: ["battleAttackRoll"],
        });
      },
      doResolveStep1DuplicateDamageSlot1Limit: () => {
        recordResolvedFill({
          fill: chainedAttackProcedureDamageRollFill(
            requireTypedHole(holes, "rolledDice"),
            CHAINED_ATTACK_PROCEDURE_STEP1_SLOT1_LIMIT_FACES,
          ),
          expectedTag: "resolved",
          routeFill: "rolledDice",
          owners: ["battleHitPoint", "battleSpellAttackProcedure"],
        });
      },
      doResolveStep1DuplicateDamageSlot2AllowsLeap: () => {
        recordResolvedFill({
          fill: chainedAttackProcedureDamageRollFill(
            requireTypedHole(holes, "rolledDice"),
            CHAINED_ATTACK_PROCEDURE_STEP1_SLOT2_LEAP_FACES,
          ),
          expectedTag: "needsHoles",
          routeFill: "rolledDice",
          owners: ["battleHitPoint", "battleSpellAttackProcedure"],
        });
      },
      step: () => {},
      getState: () => ({ route }),
    };
  });
}

export function createIndependentSpellAttackSequenceRouteDriver() {
  return defineDriver(independentSpellAttackSequenceRouteDriverSchema, () => {
    let replayBaseState = independentSpellAttackSequenceBattle();
    const subject = independentSpellAttackSequenceSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = [];
    let route: readonly ReducerRouteEvent[] = [];

    function reset(): void {
      replayBaseState = independentSpellAttackSequenceBattle();
      const act = independentSpellAttackSequenceAct(replayBaseState);
      fills = [];
      holes = act.initialHoles;
      route = [
        reducerRouteStartBattle("battleActionEconomy"),
        reducerRouteDiscoverBattleActs({
          subject: INDEPENDENT_SPELL_ATTACK_SEQUENCE_ROUTE_SUBJECT,
          holes,
          owner: "battleActionEconomy",
        }),
        reducerRouteDiscoverBattleActs({
          subject: INDEPENDENT_SPELL_ATTACK_SEQUENCE_ROUTE_SUBJECT,
          holes: holes.filter((hole) => hole.kind === "objectTargetChoice"),
          owner: "battleObjectTargetBoundary",
        }),
      ];
    }

    function recordResolvedFill(input: {
      readonly nextFills: readonly BattleFill[];
      readonly expectedTag: "needsHoles" | "resolved";
      readonly routeFill: ReducerRouteFill;
      readonly owners: readonly ReducerRouteOwnerGroup[];
    }): void {
      fills = fillsWithMbtSpellCastReactionFacts(holes, input.nextFills);
      const result = resolveBattleSubject({
        state: replayBaseState,
        subject,
        fills,
      });
      if (result.tag !== input.expectedTag) {
        throw new Error(
          `Expected independent spell attack sequence ${input.expectedTag}, got ${
            result.tag
          }: ${"message" in result ? result.message : ""}`,
        );
      }
      if (input.routeFill === "rolledDice") {
        assertIndependentSpellAttackSequenceTargetHp(
          result.state,
          independentSpellAttackSequenceExpectedTargetHp(fills),
        );
      }
      if (result.tag === "resolved") {
        replayBaseState = result.state;
      }
      holes = result.tag === "needsHoles" ? result.holes : [];
      route = [
        ...route,
        ...input.owners.map((owner) =>
          reducerRouteResolveBattleSubject({
            subject: INDEPENDENT_SPELL_ATTACK_SEQUENCE_ROUTE_SUBJECT,
            fill: input.routeFill,
            holes,
            owner,
          }),
        ),
      ];
    }

    reset();

    return {
      init: reset,
      doFillTwoCreatureTargets: () => {
        const [firstTarget, secondTarget] =
          twoIndependentSpellAttackSequenceTargetHoles(holes);
        recordResolvedFill({
          nextFills: [
            independentSpellAttackSequenceTargetFill(firstTarget),
            independentSpellAttackSequenceTargetFill(secondTarget),
          ],
          expectedTag: "needsHoles",
          routeFill: "targetChoice",
          owners: ["battleTargetSelection", "battleSpellAttackProcedure"],
        });
      },
      doFillFirstAttackMiss: () => {
        recordResolvedFill({
          nextFills: [
            ...fills,
            attackRollFill(requireTypedHole(holes, "attackRoll"), {
              total: 1,
              naturalD20: 1,
            }),
          ],
          expectedTag: "needsHoles",
          routeFill: "attackRoll",
          owners: ["battleAttackRoll", "battleSpellAttackProcedure"],
        });
      },
      doFillFirstAttackHit: () => {
        recordResolvedFill({
          nextFills: [
            ...fills,
            attackRollFill(requireTypedHole(holes, "attackRoll"), {
              total: 18,
              naturalD20: 12,
            }),
          ],
          expectedTag: "needsHoles",
          routeFill: "attackRoll",
          owners: ["battleAttackRoll", "battleSpellAttackProcedure"],
        });
      },
      doFillFirstDamageLow: () => {
        recordResolvedFill({
          nextFills: [
            ...fills,
            damageRollFillWithGroups(requireTypedHole(holes, "rolledDice"), [
              [INDEPENDENT_SPELL_ATTACK_SEQUENCE_LOW_DAMAGE],
            ]),
          ],
          expectedTag: "needsHoles",
          routeFill: "rolledDice",
          owners: ["battleHitPoint", "battleSpellAttackProcedure"],
        });
      },
      doFillSecondAttackMiss: () => {
        recordResolvedFill({
          nextFills: [
            ...fills,
            attackRollFill(requireTypedHole(holes, "attackRoll"), {
              total: 1,
              naturalD20: 1,
            }),
          ],
          expectedTag: "resolved",
          routeFill: "attackRoll",
          owners: ["battleAttackRoll", "battleSpellAttackProcedure"],
        });
      },
      doFillSecondAttackHit: () => {
        recordResolvedFill({
          nextFills: [
            ...fills,
            attackRollFill(requireTypedHole(holes, "attackRoll"), {
              total: 18,
              naturalD20: 12,
            }),
          ],
          expectedTag: "needsHoles",
          routeFill: "attackRoll",
          owners: ["battleAttackRoll", "battleSpellAttackProcedure"],
        });
      },
      doFillSecondDamageLow: () => {
        recordResolvedFill({
          nextFills: [
            ...fills,
            damageRollFillWithGroups(requireTypedHole(holes, "rolledDice"), [
              [INDEPENDENT_SPELL_ATTACK_SEQUENCE_LOW_DAMAGE],
            ]),
          ],
          expectedTag: "resolved",
          routeFill: "rolledDice",
          owners: ["battleHitPoint", "battleSpellAttackProcedure"],
        });
      },
      doRejectStaleAfterResolved: () => {
        const result = resolveBattleSubject({
          state: replayBaseState,
          subject,
          fills,
        });
        if (result.tag !== "invalid" || result.reason !== "staleSubject") {
          throw new Error("Expected stale independent spell attack sequence.");
        }
        route = [
          ...route,
          reducerRouteResolveBattleSubjectWithoutFill({
            subject: INDEPENDENT_SPELL_ATTACK_SEQUENCE_ROUTE_SUBJECT,
            holes: [],
            owner: "battleHoleFrontier",
          }),
        ];
      },
      step: () => {},
      getState: () => ({ route }),
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

export function createHitPointRestorationOrderingRouteDriver() {
  return defineDriver(hitPointRestorationOrderingDriverSchema, () => {
    let state = healingSpellOrderingBattle();
    let subject: BattleSubject = healingWordSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = [];
    let route: readonly ReducerRouteEvent[] = [];
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
      route = [reducerRouteStartBattle("battleActionEconomy")];
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
      fill: ReducerRouteFill,
      owner: ReducerRouteOwnerGroup,
    ): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        route = [
          ...route,
          reducerRouteResolveBattleSubject({
            subject: "hitPointRestoration",
            fill,
            holes,
            owner,
          }),
        ];
        stage = nextStage;
        orderingError = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        route = [
          ...route,
          reducerRouteResolveBattleSubject({
            subject: "hitPointRestoration",
            fill,
            holes,
            owner,
          }),
        ];
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
      fill: ReducerRouteFill,
    ): void {
      if (result.tag !== "needsHoles") {
        throw new Error(
          "Expected Hit Point restoration fill to request earlier holes.",
        );
      }
      lastResult = result.tag;
      holes = result.holes;
      route = [
        ...route,
        reducerRouteResolveBattleSubject({
          subject: "hitPointRestoration",
          fill,
          holes,
          owner: "battleHoleFrontier",
        }),
      ];
      stage = expectedStage;
      orderingError = expectedOrderingError;
    }

    function discoverHealingAct(input: {
      readonly nextState: BattleState;
      readonly nextSubject: BattleSubject;
      readonly nextStage: HitPointRestorationOrderingProjection["stage"];
      readonly owner: ReducerRouteOwnerGroup;
    }): void {
      state = input.nextState;
      subject = input.nextSubject;
      fills = [];
      holes = healingOrderingHolesAfterFills(state, subject, []);
      route = [
        ...route,
        reducerRouteDiscoverBattleActs({
          subject: "hitPointRestoration",
          holes,
          owner: input.owner,
        }),
      ];
      stage = input.nextStage;
      lastResult = "needsHoles";
      orderingError = "";
    }

    reset();

    return {
      init: reset,
      doDiscoverSingleTargetSpellHealing: () => {
        discoverHealingAct({
          nextState: healingSpellOrderingBattle(),
          nextSubject: healingWordSubject(),
          nextStage: "spellHealingTargetChoice",
          owner: "battleSpellSlotAndActionEconomy",
        });
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
          "rolledDice",
        );
      },
      doFillSpellHealingTargetChoice: () => {
        const target = requireHole(holes, "targetChoice");
        fills = [spellTargetChoiceFill(target, skeletonId, "healing_word")];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "spellHealingRoll",
          "targetChoice",
          "battleHoleFrontier",
        );
      },
      doDiscoverTargetListSpellHealing: () => {
        discoverHealingAct({
          nextState: healingTargetListSpellOrderingBattle(),
          nextSubject: massHealingWordSubject(),
          nextStage: "spellHealingTargetList",
          owner: "battleSpellSlotAndActionEconomy",
        });
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
          "rolledDice",
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
          "spellTargetList",
          "battleHoleFrontier",
        );
      },
      doFillSpellHealingRoll: () => {
        const healingRoll = requireHole(holes, "rolledDice");
        fills = [...fills, damageRollFillWithGroups(healingRoll, [[1, 1]])];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
          "rolledDice",
          "battleHitPointAndZeroHpLifecycle",
        );
        const healedTarget = snapshotCombatant(state, skeletonId);
        spellTargetHp = healedTarget.hp;
        spellTargetZeroHpLifecycleCleared =
          zeroHpLifecycleClearedByHealing(healedTarget);
      },
      doDiscoverFeatureHealingPool: () => {
        discoverHealingAct({
          nextState: featureHealingPoolOrderingBattle(),
          nextSubject: preserveLifeSubject(),
          nextStage: "featureHealingPoolDistribution",
          owner: "battleActionEconomy",
        });
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
          "hitPointHealingDistribution",
          "battleHitPointAndZeroHpLifecycle",
        );
        const healedTarget = snapshotCombatant(state, skeletonId);
        featureTargetHp = healedTarget.hp;
        featureTargetZeroHpLifecycleCleared =
          zeroHpLifecycleClearedByHealing(healedTarget);
      },
      step: () => {},
      getState: () => ({
        ...projectHitPointRestorationOrderingState({
          holes,
          stage,
          lastResult,
          orderingError,
          spellTargetHp,
          spellTargetZeroHpLifecycleCleared,
          featureTargetHp,
          featureTargetZeroHpLifecycleCleared,
        }),
        route,
      }),
    };
  });
}

export function createDeathSavingThrowRouteDriver() {
  return defineDriver(deathSavingThrowRouteDriverSchema, () => {
    const subject = deathSavingThrowEndTurnSubject();
    const recorder = createBattleSubjectResolutionRecorder({
      initialState: deathSavingThrowBattle(),
      subject,
      noInvalidReason: "",
    });
    let fills: readonly BattleFill[] = [];
    let route: readonly ReducerRouteEvent[] = [];

    function reset(): void {
      recorder.reset(deathSavingThrowBattle());
      fills = [];
      route = [reducerRouteStartBattle("battleActionEconomy")];
    }

    function fillDeathSavingThrow(roll: number): void {
      const deathSavingThrow = requireTypedHole(
        recorder.snapshot().holes,
        "deathSavingThrow",
      );
      fills = [deathSavingThrowFill(deathSavingThrow, roll)];
      recorder.submit(fills);
      route = [
        ...route,
        reducerRouteResolveBattleSubject({
          subject: "deathSavingThrow",
          fill: "deathSavingThrow",
          holes: recorder.snapshot().holes,
          owner: "battleHitPointAndZeroHpLifecycle",
        }),
      ];
    }

    reset();

    return {
      init: reset,
      doDiscoverEndTurnDeathSavingThrow: () => {
        recorder.submit([]);
        route = [
          ...route,
          reducerRouteDiscoverBattleActs({
            subject: "deathSavingThrow",
            holes: recorder.snapshot().holes,
            owner: "battleHitPointAndZeroHpLifecycle",
          }),
        ];
      },
      doFillDeathSavingThrow: ({ roll }) => {
        fillDeathSavingThrow(roll);
      },
      doRejectWrongActorEndTurnAfterResolved: () => {
        const snapshot = recorder.snapshot();
        recorder.record(
          resolveBattleSubject({ state: snapshot.state, subject, fills }),
        );
        route = [
          ...route,
          reducerRouteResolveBattleSubject({
            subject: "deathSavingThrow",
            fill: "deathSavingThrow",
            holes: recorder.snapshot().holes,
            owner: "battleHitPointAndZeroHpLifecycle",
          }),
        ];
      },
      step: () => {},
      getState: () => ({
        ...projectDeathSavingThrowState(recorder.snapshot()),
        route,
      }),
    };
  });
}

export function createConcentrationBreakTeardownRouteDriver() {
  return defineDriver(concentrationBreakTeardownRouteDriverSchema, () => {
    let state = initialConcentrationBreakTeardownState();
    let route: readonly ReducerRouteEvent[] = [];

    function reset(): void {
      state = initialConcentrationBreakTeardownState();
      route = [reducerRouteStartBattle("battleActionEconomy")];
    }

    function appendConcentrationCastRoute(): void {
      route = [
        ...route,
        reducerRouteDiscoverBattleActs({
          subject: "concentrationTeardown",
          holes: [],
          owner: "battleSpellSlotAndActionEconomy",
        }),
        reducerRouteResolveBattleSubjectWithoutFill({
          subject: "concentrationTeardown",
          holes: [],
          owner: "battleConcentration",
        }),
      ];
    }

    function appendConcentrationOwnerNoFillRoute(): void {
      route = [
        ...route,
        reducerRouteResolveBattleSubjectWithoutFill({
          subject: "concentrationTeardown",
          holes: [],
          owner: "battleConcentration",
        }),
      ];
    }

    reset();

    return {
      init: reset,
      doCastConcentrationSpell: () => {
        state = {
          ...stateAfterBlurCast(initialConcentrationBreakTeardownState()),
          scenario: "concentrationSpellCast",
        };
        appendConcentrationCastRoute();
      },
      doDamageRequestsConcentrationSave: (input: {
        readonly damageDiePip: number;
      }) => {
        state = damageRequestsConcentrationSave(state, input.damageDiePip);
        route = [
          ...route,
          reducerRouteResolveBattleSubject({
            subject: "concentrationTeardown",
            fill: "rolledDice",
            holes: state.pendingConcentrationSave?.holes ?? [],
            owner: "battleConcentration",
          }),
        ];
      },
      doFailConcentrationSave: (input: { readonly saveRollTotal: number }) => {
        state = failConcentrationSave(state, input.saveRollTotal);
        route = [
          ...route,
          reducerRouteResolveBattleSubject({
            subject: "concentrationTeardown",
            fill: "concentrationSavingThrow",
            holes: [],
            owner: "battleConcentration",
          }),
        ];
      },
      doVoluntaryEndConcentration: () => {
        state = voluntarilyEndConcentration(
          initialConcentrationBreakTeardownState(),
        );
        appendConcentrationCastRoute();
        appendConcentrationOwnerNoFillRoute();
      },
      doCastReplacementConcentrationSpell: () => {
        state = castReplacementConcentrationSpell(
          initialConcentrationBreakTeardownState(),
        );
        appendConcentrationCastRoute();
      },
      step: () => {},
      getState: () => ({
        ...projectConcentrationBreakTeardownState(state),
        route,
      }),
    };
  });
}

export function createCommandOrderingDriver() {
  return createCommandOrderingDriverWithRoute(false);
}

export function createCommandOrderingRouteDriver() {
  return createCommandOrderingDriverWithRoute(true);
}

function createCommandOrderingDriverWithRoute<const IncludeRoute extends boolean>(
  includeRoute: IncludeRoute,
) {
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
    let route: readonly ReducerRouteEvent[] = [
      reducerRouteStartBattle("battleActionEconomy"),
    ];

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
      route = [reducerRouteStartBattle("battleActionEconomy")];
    }

    function routeHolesAfter(
      result: BattleResolutionResult,
    ): readonly BattleHole[] {
      if (result.tag === "needsHoles") return result.holes;
      if (result.tag === "resolved") return [];
      return holes;
    }

    function recordRouteDiscover(owner: ReducerRouteOwnerGroup): void {
      if (!includeRoute) return;
      route = [
        ...route,
        reducerRouteDiscoverBattleActs({
          subject: "commandEffect",
          holes,
          owner,
        }),
      ];
    }

    function recordRouteResolve(input: {
      readonly result: BattleResolutionResult;
      readonly fill: ReducerRouteFill;
      readonly owner: ReducerRouteOwnerGroup;
    }): void {
      if (!includeRoute) return;
      route = [
        ...route,
        reducerRouteResolveBattleSubject({
          subject: "commandEffect",
          fill: input.fill,
          holes: routeHolesAfter(input.result),
          owner: input.owner,
        }),
      ];
    }

    function recordRouteResolveWithoutFill(
      owner: ReducerRouteOwnerGroup,
    ): void {
      if (!includeRoute) return;
      route = [
        ...route,
        reducerRouteResolveBattleSubjectWithoutFill({
          subject: "commandEffect",
          holes: [],
          owner,
        }),
      ];
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
      recordRouteDiscover("battleSpellSlotAndActionEconomy");
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
        const result = resolveBattleSubject({
          state,
          subject,
          fills: [commandOptionFill(commandOption, "grovel")],
        });
        recordNeedsEarlierHole(result, "commandTargetListRequired", "targetList");
        recordRouteResolve({
          result,
          fill: "commandOptionChoice",
          owner: "battleHoleFrontier",
        });
      },
      doFillTargetList: () => {
        const targetList = requireHole(holes, "spellTargetList");
        fills = [spellTargetListFill(targetList, "command", [skeletonId])];
        const result = resolveBattleSubject({ state, subject, fills });
        recordAccepted(result, "optionChoice");
        recordRouteResolve({
          result,
          fill: "spellTargetList",
          owner: "battleHoleFrontier",
        });
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
        const result = resolveBattleSubject({
          state,
          subject,
          fills: [
            ...fills,
            saveGatedSpellSavingThrowOutcomeFill(savingThrow, [
              { targetId: skeletonId, succeeded: false },
            ]),
          ],
        });
        recordNeedsEarlierHole(
          result,
          "commandOptionChoiceRequired",
          "optionChoice",
        );
        recordRouteResolve({
          result,
          fill: "savingThrowOutcome",
          owner: "battleHoleFrontier",
        });
      },
      doFillGrovelOption: () => {
        const commandOption = requireHole(holes, "commandOptionChoice");
        fills = [...fills, commandOptionFill(commandOption, "grovel")];
        const result = resolveBattleSubject({ state, subject, fills });
        recordAccepted(result, "savingThrowOutcome");
        recordRouteResolve({
          result,
          fill: "commandOptionChoice",
          owner: "battleHoleFrontier",
        });
      },
      doFillFailedGrovelSavingThrow: () => {
        const savingThrow = requireHole(holes, "savingThrowOutcome");
        fills = [
          ...fills,
          saveGatedSpellSavingThrowOutcomeFill(savingThrow, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ];
        const result = resolveBattleSubject({ state, subject, fills });
        recordAccepted(result, "resolved");
        recordRouteResolve({
          result,
          fill: "savingThrowOutcome",
          owner: "battleActiveEffect",
        });
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
        const result = resolveBattleSubject({
          state: targetTurn,
          subject: command.subject,
          fills: [],
        });
        recordAccepted(result, "resolved");
        recordRouteResolveWithoutFill("battleConditionLifecycle");
      },
      doDropNeedsHeldObjectFacts: () => {
        startRuntimeCommand("drop");
        stage = "dropHeldObjectFacts";
        lastResult = "needsHoles";
        recordRouteDiscover("battleActiveEffect");
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
        const result = resolveBattleSubject({ state, subject, fills });
        recordAccepted(result, "resolved");
        recordRouteResolveWithoutFill("battleActiveEffect");
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
        recordRouteResolveWithoutFill("battleActiveEffect");
      },
      doApproachMovementContinues: () => {
        startRuntimeCommand("approach");
        stage = "approachMovement";
        recordRouteDiscover("battleActiveEffect");
      },
      doFillApproachMovementContinues: () => {
        const movement = requireHole(holes, "movement");
        fills = [
          commandApproachMovementFill(movement, {
            movementCostFeet: 10,
            movedWithinFiveFeetOfCaster: false,
          }),
        ];
        const result = resolveBattleSubject({ state, subject, fills });
        recordAccepted(result, "resolved");
        recordRouteResolve({
          result,
          fill: "movement",
          owner: "battleMovementResource",
        });
      },
      doFillApproachMovementWithinFive: () => {
        const movement = requireHole(holes, "movement");
        fills = [
          commandApproachMovementFill(movement, {
            movementCostFeet: 10,
            movedWithinFiveFeetOfCaster: true,
          }),
        ];
        const result = resolveBattleSubject({ state, subject, fills });
        recordAccepted(result, "resolved");
        recordRouteResolve({
          result,
          fill: "movement",
          owner: "battleMovementResource",
        });
      },
      doApproachNoMovement: () => {
        startRuntimeCommand("approach", { grappledByCaster: true });
        const result = resolveBattleSubject({ state, subject, fills: [] });
        recordAccepted(result, "resolved");
        recordRouteResolveWithoutFill("battleMovementResource");
      },
      doFleeMovement: () => {
        startRuntimeCommand("flee");
        stage = "fleeMovement";
        recordRouteDiscover("battleActiveEffect");
      },
      doFillFleeMovement: () => {
        const movement = requireHole(holes, "movement");
        fills = [
          commandFleeMovementFill(movement, {
            movementCostFeet: 30,
            provokedOpportunityAttacks: [],
          }),
        ];
        const result = resolveBattleSubject({ state, subject, fills });
        recordAccepted(result, "resolved");
        recordRouteResolve({
          result,
          fill: "movement",
          owner: "battleMovementResource",
        });
      },
      doRejectFleePartialMovement: () => {
        const movement = requireHole(holes, "movement");
        const result = resolveBattleSubject({
          state,
          subject,
          fills: [
            commandFleeMovementFill(movement, {
              movementCostFeet: 10,
              provokedOpportunityAttacks: [],
            }),
          ],
        });
        recordInvalid(result, "commandMovementRequired");
        recordRouteResolve({
          result,
          fill: "movement",
          owner: "battleHoleFrontier",
        });
      },
      doFleeNoMovement: () => {
        startRuntimeCommand("flee", { grappledByCaster: true });
        const result = resolveBattleSubject({ state, subject, fills: [] });
        recordAccepted(result, "resolved");
        recordRouteResolveWithoutFill("battleMovementResource");
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
        const result = resolveBattleSubject({ state, subject, fills });
        recordAccepted(result, "resolved");
        recordRouteResolve({
          result,
          fill: "movement",
          owner: "battleInterruptStack",
        });
      },
      step: () => {},
      getState: ():
        IncludeRoute extends true
          ? ReducerRoutedCommandOrderingProjection
          : CommandOrderingProjection => {
        const projection = projectCommandOrderingState({
          state,
          holes,
          stage,
          lastResult,
          orderingError,
          pendingCommandOption,
          droppedObjectCount,
        });
        // IncludeRoute is a literal boolean chosen by the public factory, but
        // TypeScript does not narrow conditional return types from this branch.
        return (
          includeRoute ? { ...projection, route } : projection
        ) as IncludeRoute extends true
          ? ReducerRoutedCommandOrderingProjection
          : CommandOrderingProjection;
      },
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

export function createMagicMissileRouteDriver() {
  return defineDriver(magicMissileDriverSchema, () => {
    let state = fighterVsSkeletonBattle();
    const subject = magicMissileSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = [];
    let route: readonly ReducerRouteEvent[] = [];
    let lastResult: MbtProjection["lastResult"] = "init";
    let lastInvalidReason: MbtProjection["lastInvalidReason"] = "";

    function reset(): void {
      state = fighterVsSkeletonBattle();
      const initialHoles = discoverMagicMissileHoles(state, subject);
      fills = [];
      holes = initialHoles;
      route = [
        reducerRouteStartBattle("battleActionEconomy"),
        reducerRouteDiscoverBattleActs({
          subject: "slotSpell",
          holes: initialHoles,
          owner: "battleSpellSlotAndActionEconomy",
        }),
      ];
      lastResult = "init";
      lastInvalidReason = "";
    }

    function submit(
      fill: ReducerRouteFill,
      owner: ReducerRouteOwnerGroup,
      nextFills: readonly BattleFill[],
    ): void {
      fills = fillsWithMbtSpellCastReactionFacts(holes, nextFills);
      const result = resolveBattleSubject({ state, subject, fills });
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        route = [
          ...route,
          reducerRouteResolveBattleSubject({
            subject: "slotSpell",
            fill,
            holes,
            owner,
          }),
        ];
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        route = [
          ...route,
          reducerRouteResolveBattleSubject({
            subject: "slotSpell",
            fill,
            holes,
            owner,
          }),
        ];
        lastInvalidReason = "";
        return;
      }
      lastInvalidReason = mbtInvalidReason(result.reason);
    }

    reset();

    return {
      init: reset,
      doFillMagicMissileAllocation: () => {
        const allocation = requireHole(holes, "spellTargetAllocation");
        submit(
          "spellTargetAllocation",
          "battleHoleFrontier",
          [spellTargetAllocationFill(allocation, skeletonId, 3)],
        );
      },
      doFillMagicMissileDamage: ({ dartRollTotal }) => {
        const damage = requireHole(holes, "rolledDice");
        submit(
          "rolledDice",
          "battleHitPoint",
          [
            ...fills,
            damageRollFillWithGroups(damage, [
              magicMissileDamageRollGroup(dartRollTotal),
            ]),
          ],
        );
      },
      step: () => {},
      getState: () => ({
        ...projectMbtState({
          state,
          holes,
          lastResult,
          lastInvalidReason,
        }),
        route,
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
  return createScalarBuffDriverWithRoute(false);
}

export function createScalarBuffRouteDriver() {
  return createScalarBuffDriverWithRoute(true);
}

function createScalarBuffDriverWithRoute<const IncludeRoute extends boolean>(
  includeRoute: IncludeRoute,
) {
  return defineDriver(scalarBuffDriverSchema, () => {
    let state = scalarBuffBattle();
    let subject: BattleSubject = longstriderSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = discoverLongstriderHoles(state, subject);
    let lastResult: ScalarBuffMbtProjection["lastResult"] = "init";
    let lastInvalidReason: ScalarBuffMbtProjection["lastInvalidReason"] = "";
    let route: readonly ReducerRouteEvent[] = initialScalarBuffRoute(holes);

    function reset(): void {
      state = scalarBuffBattle();
      subject = longstriderSubject();
      fills = [];
      holes = discoverLongstriderHoles(state, subject);
      lastResult = "init";
      lastInvalidReason = "";
      route = initialScalarBuffRoute(holes);
    }

    function initialScalarBuffRoute(
      initialHoles: readonly BattleHole[],
    ): readonly ReducerRouteEvent[] {
      return [
        reducerRouteStartBattle("battleActionEconomy"),
        reducerRouteDiscoverBattleActs({
          subject: "scalarBuffEffect",
          holes: initialHoles,
          owner: "battleSpellSlotAndActionEconomy",
        }),
      ];
    }

    function recordResult(
      result: BattleResolutionResult,
      owner: ReducerRouteOwnerGroup,
    ): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        lastInvalidReason = "";
        recordRoute(result, owner);
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastInvalidReason = "";
        recordRoute(result, owner);
        return;
      }
      lastInvalidReason = mbtInvalidReason(result.reason);
      recordRoute(result, owner);
    }

    function recordRoute(
      result: BattleResolutionResult,
      owner: ReducerRouteOwnerGroup,
    ): void {
      if (!includeRoute) return;
      route = [
        ...route,
        reducerRouteResolveBattleSubject({
          subject: "scalarBuffEffect",
          fill: "targetChoice",
          holes: result.tag === "needsHoles" ? result.holes : [],
          owner,
        }),
      ];
    }

    return {
      init: reset,
      doFillLongstriderTarget: () => {
        const target = requireHole(holes, "targetChoice");
        fills = [spellTargetChoiceFill(target, skeletonId, "longstrider")];
        recordResult(
          resolveBattleSubject({ state, subject, fills }),
          "battleActiveEffect",
        );
      },
      doRejectStaleAfterResolved: () => {
        recordResult(
          resolveBattleSubject({ state, subject, fills }),
          "battleHoleFrontier",
        );
      },
      step: () => {},
      getState: ():
        IncludeRoute extends true
          ? ReducerRoutedScalarBuffProjection
          : ScalarBuffMbtProjection => {
        const projection = projectScalarBuffMbtState({
          state,
          holes,
          lastResult,
          lastInvalidReason,
        });
        const routedProjection: ReducerRoutedScalarBuffProjection = {
          casterSpeed: projection.fighterSpeed,
          targetSpeed: projection.goblinSpeed,
          actionAvailable: projection.actionAvailable,
          holes: projection.holes,
          lastResult: projection.lastResult,
          lastInvalidReason: projection.lastInvalidReason,
          route,
        };
        // IncludeRoute is a literal boolean chosen by the public factory, but
        // TypeScript does not narrow conditional return types from this branch.
        return (
          includeRoute ? routedProjection : projection
        ) as IncludeRoute extends true
          ? ReducerRoutedScalarBuffProjection
          : ScalarBuffMbtProjection;
      },
    };
  });
}

export function createAdrenalineRushDriver(
  schema: typeof adrenalineRushDriverSchema = adrenalineRushDriverSchema,
) {
  return createAdrenalineRushDriverWithRoute(false, schema);
}

export function createAdrenalineRushRouteDriver(
  schema: typeof adrenalineRushDriverSchema = adrenalineRushDriverSchema,
) {
  return createAdrenalineRushDriverWithRoute(true, schema);
}

const FEATURE_DASH_TEMPORARY_HIT_POINT_ROUTE_SUBJECT =
  "unitFeatureBonusAction" satisfies ReducerRouteSubjectFamily;
const FEATURE_DASH_TEMPORARY_HIT_POINT_RESOLVED_OWNERS = [
  "battleActionEconomy",
  "battleFeatureResource",
  "battleMovementResource",
  "battleTemporaryHitPoint",
] as const satisfies readonly ReducerRouteOwnerGroup[];
const FEATURE_DASH_TEMPORARY_HIT_POINT_STALE_OWNERS = [
  "battleActionEconomy",
] as const satisfies readonly ReducerRouteOwnerGroup[];

function createAdrenalineRushDriverWithRoute<const IncludeRoute extends boolean>(
  includeRoute: IncludeRoute,
  schema: typeof adrenalineRushDriverSchema,
) {
  return defineDriver(schema, () => {
    let state = adrenalineRushBattle();
    let lastResult: AdrenalineRushMbtProjection["lastResult"] = "init";
    let lastInvalidReason: AdrenalineRushMbtProjection["lastInvalidReason"] =
      "";
    let route: readonly ReducerRouteEvent[] = initialAdrenalineRushRoute();

    function reset(): void {
      state = adrenalineRushBattle();
      lastResult = "init";
      lastInvalidReason = "";
      route = initialAdrenalineRushRoute();
    }

    function initialAdrenalineRushRoute(): readonly ReducerRouteEvent[] {
      return [
        reducerRouteStartBattle("battleActionEconomy"),
        {
          kind: "discoverBattleActs",
          subject: FEATURE_DASH_TEMPORARY_HIT_POINT_ROUTE_SUBJECT,
          holes: [],
          owner: "battleFeatureResource",
        },
      ];
    }

    function adrenalineRushResolveRoute(
      owners: readonly ReducerRouteOwnerGroup[],
    ): readonly ReducerRouteEvent[] {
      return owners.map((owner) =>
        reducerRouteResolveBattleSubjectWithoutFill({
          subject: FEATURE_DASH_TEMPORARY_HIT_POINT_ROUTE_SUBJECT,
          holes: [],
          owner,
        }),
      );
    }

    function recordResult(
      result: BattleResolutionResult,
      owners: readonly ReducerRouteOwnerGroup[],
    ): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        lastInvalidReason = "";
        if (includeRoute) {
          route = [...route, ...adrenalineRushResolveRoute(owners)];
        }
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        lastInvalidReason = "";
        if (includeRoute) {
          route = [...route, ...adrenalineRushResolveRoute(owners)];
        }
        return;
      }
      lastInvalidReason = mbtInvalidReason(result.reason);
      if (includeRoute) {
        route = [...route, ...adrenalineRushResolveRoute(owners)];
      }
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
          FEATURE_DASH_TEMPORARY_HIT_POINT_RESOLVED_OWNERS,
        );
      },
      doRejectSecondDash: () => {
        recordResult(
          resolveBattleSubject({
            state,
            subject: adrenalineRushDashSubject(),
            fills: [],
          }),
          FEATURE_DASH_TEMPORARY_HIT_POINT_STALE_OWNERS,
        );
      },
      step: () => {},
      getState: () => {
        const projection = projectAdrenalineRushMbtState({
          state,
          lastResult,
          lastInvalidReason,
        });
        const routedProjection = { ...projection, route };
        // IncludeRoute is a literal boolean chosen by the public factory, but
        // TypeScript does not narrow conditional return types from this branch.
        return (
          includeRoute ? routedProjection : projection
        ) as IncludeRoute extends true
          ? ReducerRoutedAdrenalineRushProjection
          : AdrenalineRushMbtProjection;
      },
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

const REDUCER_ROUTE_SUBJECT_BY_VARIANT_TAG = {
  BattleActionRouteSubject: "battleAction",
  AbilityCheckSearchRouteSubject: "abilityCheckSearch",
  SlotSpellRouteSubject: "slotSpell",
  SaveGatedSpellRouteSubject: "saveGatedSpell",
  HitPointRestorationRouteSubject: "hitPointRestoration",
  WeaponAttackRouteSubject: "weaponAttack",
  SpellAttackRouteSubject: "spellAttack",
  SpellAttackProcedureRouteSubject: "spellAttackProcedure",
  SpellHostedWeaponAttackRouteSubject: "spellHostedWeaponAttack",
  WeaponDamageRiderRouteSubject: "weaponDamageRider",
  HeldWeaponActiveEffectRouteSubject: "heldWeaponActiveEffect",
  WeaponEnhancementItemTargetRouteSubject: "weaponEnhancementItemTarget",
  WeaponHostedSpellEffectCleanupRouteSubject:
    "weaponHostedSpellEffectCleanup",
  AfterHitDamageRiderRouteSubject: "afterHitDamageRider",
  StatBlockActionRouteSubject: "statBlockAction",
  CreatureAttackRouteSubject: "creatureAttack",
  DeathSavingThrowRouteSubject: "deathSavingThrow",
  ConcentrationTeardownRouteSubject: "concentrationTeardown",
  CommandEffectRouteSubject: "commandEffect",
  ReactionSpellRouteSubject: "reactionSpell",
  InterruptStackResumeRouteSubject: "interruptStackResume",
  RollModifierEffectRouteSubject: "rollModifierEffect",
  ScalarBuffEffectRouteSubject: "scalarBuffEffect",
  RepeatSaveConditionEffectRouteSubject: "repeatSaveConditionEffect",
  TurnBoundaryEffectLifecycleRouteSubject: "turnBoundaryEffectLifecycle",
  ZeroHitPointSpellEffectTeardownRouteSubject:
    "zeroHitPointSpellEffectTeardown",
  UnitFeatureBonusActionRouteSubject: "unitFeatureBonusAction",
  CompanionLifecycleRouteSubject: "companionLifecycle",
  CompanionSharedSensesRouteSubject: "companionSharedSenses",
  CompanionTouchDeliveryRouteSubject: "companionTouchDelivery",
  CompanionReactionAttackRouteSubject: "companionReactionAttack",
  ObjectTargetSpellAttackRouteSubject: "objectTargetSpellAttack",
} as const satisfies Readonly<Record<string, ReducerRouteSubjectFamily>>;

const REDUCER_ROUTE_OWNER_BY_VARIANT_TAG = {
  BattleActionEconomyOwner: "battleActionEconomy",
  BattleSpellSlotAndActionEconomyOwner: "battleSpellSlotAndActionEconomy",
  BattleHoleFrontierOwner: "battleHoleFrontier",
  BattleTargetSelectionOwner: "battleTargetSelection",
  BattleAttackRollOwner: "battleAttackRoll",
  BattleSpellAttackProcedureOwner: "battleSpellAttackProcedure",
  BattleAbilityCheckOwner: "battleAbilityCheck",
  BattleHitPointOwner: "battleHitPoint",
  BattleHitPointAndZeroHpLifecycleOwner: "battleHitPointAndZeroHpLifecycle",
  BattleConditionLifecycleOwner: "battleConditionLifecycle",
  BattleStatBlockActionOwner: "battleStatBlockAction",
  BattleConcentrationOwner: "battleConcentration",
  BattleActiveEffectOwner: "battleActiveEffect",
  BattleItemTargetBoundaryOwner: "battleItemTargetBoundary",
  BattleMovementResourceOwner: "battleMovementResource",
  BattleInterruptStackOwner: "battleInterruptStack",
  BattleFeatureResourceOwner: "battleFeatureResource",
  BattleTemporaryHitPointOwner: "battleTemporaryHitPoint",
  BattleTurnBoundaryOwner: "battleTurnBoundary",
  BattleCompanionOwner: "battleCompanion",
  BattleObjectTargetBoundaryOwner: "battleObjectTargetBoundary",
} as const satisfies Readonly<Record<string, ReducerRouteOwnerGroup>>;

const REDUCER_ROUTE_HOLE_BY_VARIANT_TAG = {
  AbilityCheckHoleKind: "abilityCheck",
  AbilityChoiceHoleKind: "abilityChoice",
  AttackDamageDispositionHoleKind: "attackDamageDisposition",
  AttackRollHoleKind: "attackRoll",
  CommandOptionChoiceHoleKind: "commandOptionChoice",
  CompanionReappearanceInitiativeHoleKind: "companionReappearanceInitiative",
  ConcentrationSavingThrowHoleKind: "concentrationSavingThrow",
  ConditionChoiceHoleKind: "conditionChoice",
  DamageTypeChoiceHoleKind: "damageTypeChoice",
  DeathSavingThrowHoleKind: "deathSavingThrow",
  GrappleOutcomeHoleKind: "grappleOutcome",
  GustOfWindLineDirectionChoiceHoleKind: "gustOfWindLineDirectionChoice",
  HitPointHealingDistributionHoleKind: "hitPointHealingDistribution",
  InterruptDecisionHoleKind: "interruptDecision",
  LevitateAltitudeChangeHoleKind: "levitateAltitudeChange",
  LevitateInitialRiseHoleKind: "levitateInitialRise",
  MovementHoleKind: "movement",
  ObjectDropResolutionHoleKind: "objectDropResolution",
  OngoingSpellTargetChoiceHoleKind: "ongoingSpellTargetChoice",
  RolledDiceHoleKind: "rolledDice",
  SanctuaryInterdictionOutcomeHoleKind: "sanctuaryInterdictionOutcome",
  SavingThrowOutcomeHoleKind: "savingThrowOutcome",
  SelfTransformationModeChoiceHoleKind: "selfTransformationModeChoice",
  ShoveOutcomeHoleKind: "shoveOutcome",
  SkillChoiceHoleKind: "skillChoice",
  SlowSomaticSpellFailureOutcomeHoleKind: "slowSomaticSpellFailureOutcome",
  SpellcastingAbilityCheckHoleKind: "spellcastingAbilityCheck",
  SpellTargetAllocationHoleKind: "spellTargetAllocation",
  SpellTargetListHoleKind: "spellTargetList",
  StatBlockRechargeRollHoleKind: "statBlockRechargeRoll",
  TargetAbilityChoicesHoleKind: "targetAbilityChoices",
  TargetChoiceHoleKind: "targetChoice",
  UnitFeatureDecisionHoleKind: "unitFeatureDecision",
  WildShapeEquipmentDispositionHoleKind: "wildShapeEquipmentDisposition",
} as const satisfies Readonly<Record<string, ReducerRouteHole>>;

const REDUCER_ROUTE_FILL_BY_VARIANT_TAG = {
  AbilityCheckFillKind: "abilityCheck",
  AbilityChoiceFillKind: "abilityChoice",
  AttackDamageDispositionFillKind: "attackDamageDisposition",
  AttackRollFillKind: "attackRoll",
  CommandOptionChoiceFillKind: "commandOptionChoice",
  CompanionReappearanceInitiativeFillKind: "companionReappearanceInitiative",
  ConcentrationSavingThrowFillKind: "concentrationSavingThrow",
  ConditionChoiceFillKind: "conditionChoice",
  DamageTypeChoiceFillKind: "damageTypeChoice",
  DeathSavingThrowFillKind: "deathSavingThrow",
  GrappleOutcomeFillKind: "grappleOutcome",
  GustOfWindLineDirectionChoiceFillKind: "gustOfWindLineDirectionChoice",
  HitPointHealingDistributionFillKind: "hitPointHealingDistribution",
  InterruptDecisionFillKind: "interruptDecision",
  LevitateAltitudeChangeFillKind: "levitateAltitudeChange",
  LevitateInitialRiseFillKind: "levitateInitialRise",
  MovementFillKind: "movement",
  ObjectDropResolutionFillKind: "objectDropResolution",
  OngoingSpellTargetChoiceFillKind: "ongoingSpellTargetChoice",
  RolledDiceFillKind: "rolledDice",
  SanctuaryInterdictionOutcomeFillKind: "sanctuaryInterdictionOutcome",
  SavingThrowOutcomeFillKind: "savingThrowOutcome",
  SelfTransformationModeChoiceFillKind: "selfTransformationModeChoice",
  ShoveOutcomeFillKind: "shoveOutcome",
  SkillChoiceFillKind: "skillChoice",
  SlowSomaticSpellFailureOutcomeFillKind: "slowSomaticSpellFailureOutcome",
  SpellTargetAllocationFillKind: "spellTargetAllocation",
  SpellTargetListFillKind: "spellTargetList",
  StatBlockRechargeRollFillKind: "statBlockRechargeRoll",
  TargetAbilityChoicesFillKind: "targetAbilityChoices",
  TargetChoiceFillKind: "targetChoice",
  UnitFeatureDecisionFillKind: "unitFeatureDecision",
  WildShapeEquipmentDispositionFillKind: "wildShapeEquipmentDisposition",
} as const satisfies Readonly<Record<string, ReducerRouteFill>>;

export function decodeReducerRoute(raw: unknown): readonly ReducerRouteEvent[] {
  return quintList(raw, "qRoute").map(decodeReducerRouteEvent);
}

function decodeReducerRouteEvent(raw: unknown): ReducerRouteEvent {
  const tag = quintVariantTag(raw, "qRoute[]");
  if (tag === "RouteStartBattle") {
    const payload = reducerRoutePayload(raw, tag);
    return {
      kind: "startBattle",
      owner: reducerRouteOwner(quintField(payload, "owner")),
    };
  }
  if (tag === "RouteDiscoverBattleActs") {
    const payload = reducerRoutePayload(raw, tag);
    return {
      kind: "discoverBattleActs",
      subject: reducerRouteSubject(quintField(payload, "subject")),
      holes: reducerRouteHoles(quintField(payload, "holes")),
      owner: reducerRouteOwner(quintField(payload, "owner")),
    };
  }
  if (tag === "RouteResolveBattleSubject") {
    const payload = reducerRoutePayload(raw, tag);
    return {
      kind: "resolveBattleSubject",
      subject: reducerRouteSubject(quintField(payload, "subject")),
      fill: reducerRouteFill(quintField(payload, "fill")),
      holes: reducerRouteHoles(quintField(payload, "holes")),
      owner: reducerRouteOwner(quintField(payload, "owner")),
    };
  }
  if (tag === "RouteResolveBattleSubjectWithoutFill") {
    const payload = reducerRoutePayload(raw, tag);
    return {
      kind: "resolveBattleSubjectWithoutFill",
      subject: reducerRouteSubject(quintField(payload, "subject")),
      holes: reducerRouteHoles(quintField(payload, "holes")),
      owner: reducerRouteOwner(quintField(payload, "owner")),
    };
  }
  if (tag === "RouteResolveBattleInterrupt") {
    const payload = reducerRoutePayload(raw, tag);
    return {
      kind: "resolveBattleInterrupt",
      subject: reducerRouteSubject(quintField(payload, "subject")),
      fill: reducerRouteFill(quintField(payload, "fill")),
      holes: reducerRouteHoles(quintField(payload, "holes")),
      owner: reducerRouteOwner(quintField(payload, "owner")),
    };
  }

  throw new Error(`Unknown reducer-route event: ${tag}.`);
}

function reducerRoutePayload(
  raw: unknown,
  tag: string,
): Readonly<Record<string, unknown>> {
  const value = quintVariantValue(raw, tag, "qRoute[]");
  if (isRecord(value)) {
    return value;
  }

  throw new Error(`Expected reducer-route ${tag} payload record.`);
}

function reducerRouteSubject(raw: unknown): ReducerRouteSubjectFamily {
  return quintVariantMappedValue(
    raw,
    "qRoute[].subject",
    REDUCER_ROUTE_SUBJECT_BY_VARIANT_TAG,
    "reducer-route subject",
  );
}

function reducerRouteOwner(raw: unknown): ReducerRouteOwnerGroup {
  return quintVariantMappedValue(
    raw,
    "qRoute[].owner",
    REDUCER_ROUTE_OWNER_BY_VARIANT_TAG,
    "reducer-route owner",
  );
}

function reducerRouteHole(raw: unknown): ReducerRouteHole {
  return quintVariantMappedValue(
    raw,
    "qRoute[].holes[]",
    REDUCER_ROUTE_HOLE_BY_VARIANT_TAG,
    "reducer-route hole",
  );
}

function reducerRouteHoles(raw: unknown): readonly ReducerRouteHole[] {
  return quintSet(raw, "qRoute[].holes").map(reducerRouteHole).sort();
}

function reducerRouteFill(raw: unknown): ReducerRouteFill {
  return quintVariantMappedValue(
    raw,
    "qRoute[].fill",
    REDUCER_ROUTE_FILL_BY_VARIANT_TAG,
    "reducer-route fill",
  );
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
  if (protocolField === undefined) {
    throw new Error(
      "Expected typed witness protocol field qProtocol or protocol.",
    );
  }
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField,
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

function normalizeReducerRoutedMagicMissileQuintState(
  raw: unknown,
): ReducerRoutedMagicMissileProjection {
  const root = quintStateRecord(raw);
  const state = Object.hasOwn(root, "qState")
    ? quintRecordField(root, "qState")
    : root;
  return {
    ...normalizeQuintState(raw),
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function normalizeReducerRoutedWeaponAttackSkeletonQuintState(
  raw: unknown,
): ReducerRoutedWeaponAttackSkeletonProjection {
  const root = quintStateRecord(raw);
  const state = Object.hasOwn(root, "qState")
    ? quintRecordField(root, "qState")
    : root;
  return {
    ...normalizeQuintState(raw),
    route: decodeReducerRoute(quintField(state, "qRoute")),
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

function normalizeReducerRoutedWeaponAttackOrderingQuintState(
  raw: unknown,
): ReducerRoutedWeaponAttackOrderingProjection {
  const state = quintStateRecord(raw);
  return {
    ...normalizeWeaponAttackOrderingQuintState(raw),
    route: decodeReducerRoute(quintField(state, "qRoute")),
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

function normalizeReducerRoutedSaveGatedSpellOrderingQuintState(
  raw: unknown,
): ReducerRoutedSaveGatedSpellOrderingProjection {
  const state = quintStateRecord(raw);
  return {
    ...normalizeSaveGatedSpellOrderingQuintState(raw),
    route: decodeReducerRoute(quintField(state, "qRoute")),
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

function normalizeReducerRoutedSpellAttackOrderingQuintState(
  raw: unknown,
): ReducerRoutedSpellAttackOrderingProjection {
  const state = quintStateRecord(raw);
  return {
    ...normalizeSpellAttackOrderingQuintState(raw),
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function normalizeReducerRoutedChainedAttackProcedureQuintState(
  raw: unknown,
): ReducerRoutedChainedAttackProcedureProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  return {
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function normalizeReducerRoutedIndependentSpellAttackSequenceQuintState(
  raw: unknown,
): ReducerRoutedIndependentSpellAttackSequenceProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  return {
    route: decodeReducerRoute(quintField(state, "qRoute")),
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

function normalizeReducerRoutedHitPointRestorationOrderingQuintState(
  raw: unknown,
): ReducerRoutedHitPointRestorationOrderingProjection {
  const state = quintStateRecord(raw);
  return {
    ...normalizeHitPointRestorationOrderingQuintState(raw),
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function normalizeDeathSavingThrowQuintState(
  raw: unknown,
): DeathSavingThrowProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: deathSavingThrowHole,
    compareHoles: (left, right) => left.localeCompare(right),
  });

  return {
    currentTurnRole: stringLiteralValue(
      quintField(state, "currentTurnRole"),
      "qState.currentTurnRole",
      DEATH_SAVING_THROW_MBT_TURN_ROLES,
    ),
    targetHp: numberFromQuintInt(
      quintField(state, "targetHp"),
      "qState.targetHp",
    ),
    targetUnconscious: booleanField(state, "targetUnconscious"),
    targetStable: booleanField(state, "targetStable"),
    targetDead: booleanField(state, "targetDead"),
    targetDeathSuccesses: numberFromQuintInt(
      quintField(state, "targetDeathSuccesses"),
      "qState.targetDeathSuccesses",
    ),
    targetDeathFailures: numberFromQuintInt(
      quintField(state, "targetDeathFailures"),
      "qState.targetDeathFailures",
    ),
    holes: protocol.holes,
    lastResult: mbtLastResult(protocol.lastResult),
    lastInvalidReason: mbtLastInvalidReason(protocol.lastInvalidReason),
  };
}

function normalizeReducerRoutedDeathSavingThrowQuintState(
  raw: unknown,
): ReducerRoutedDeathSavingThrowProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  return {
    ...normalizeDeathSavingThrowQuintState(raw),
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function normalizeConcentrationBreakTeardownQuintState(
  raw: unknown,
): ConcentrationBreakTeardownProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const scenario = concentrationBreakTeardownScenario(state["qScenario"]);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: concentrationBreakTeardownHole,
  });
  assertWitnessProtocolConsistentWithScenario({
    label: "Concentration break teardown",
    scenarioOutcome: scenario,
    protocol,
  });
  return {
    scenario,
    damageTaken: numberFromQuintInt(state["qDamageTaken"], "qDamageTaken"),
    saveDc: numberFromQuintInt(state["qSaveDc"], "qSaveDc"),
    saveRollTotal: numberFromQuintInt(
      state["qSaveRollTotal"],
      "qSaveRollTotal",
    ),
    concentrationSaveOffered: booleanField(state, "qConcentrationSaveOffered"),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    blurredEffectCount: numberFromQuintInt(
      state["qBlurredEffectCount"],
      "qBlurredEffectCount",
    ),
    spellSlotExpended: numberFromQuintInt(
      state["qSpellSlotExpended"],
      "qSpellSlotExpended",
    ),
    teardownBeforeNextCommand: booleanField(
      state,
      "qTeardownBeforeNextCommand",
    ),
    replacementStartedAfterTeardown: booleanField(
      state,
      "qReplacementStartedAfterTeardown",
    ),
  };
}

function normalizeReducerRoutedConcentrationBreakTeardownQuintState(
  raw: unknown,
): ReducerRoutedConcentrationBreakTeardownProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  return {
    ...normalizeConcentrationBreakTeardownQuintState(raw),
    route: decodeReducerRoute(quintField(state, "qRoute")),
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

function normalizeReducerRoutedCommandOrderingQuintState(
  raw: unknown,
): ReducerRoutedCommandOrderingProjection {
  const state = quintStateRecord(raw);
  return {
    ...normalizeCommandOrderingQuintState(raw),
    route: decodeReducerRoute(quintField(state, "qRoute")),
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

function normalizeReducerRoutedAdrenalineRushQuintState(
  raw: unknown,
): ReducerRoutedAdrenalineRushProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  return {
    ...normalizeAdrenalineRushQuintState(raw),
    route: decodeReducerRoute(quintField(state, "qRoute")),
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

function normalizeReducerRoutedScalarBuffQuintState(
  raw: unknown,
): ReducerRoutedScalarBuffProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: holeName,
    compareHoles: (left, right) => left.localeCompare(right),
  });

  return {
    casterSpeed: numberFromQuintInt(
      state["casterSpeed"],
      "qState.casterSpeed",
    ),
    targetSpeed: numberFromQuintInt(
      state["targetSpeed"],
      "qState.targetSpeed",
    ),
    actionAvailable: booleanField(state, "actionAvailable"),
    holes: protocol.holes,
    lastResult: mbtLastResult(protocol.lastResult),
    lastInvalidReason: mbtLastInvalidReason(protocol.lastInvalidReason),
    route: decodeReducerRoute(quintField(state, "qRoute")),
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
export const reducerRoutedMagicMissileStateCheck = stateCheck(
  normalizeReducerRoutedMagicMissileQuintState,
  (
    spec: ReducerRoutedMagicMissileProjection,
    impl: ReducerRoutedMagicMissileProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
export const reducerRoutedWeaponAttackSkeletonStateCheck = stateCheck(
  normalizeReducerRoutedWeaponAttackSkeletonQuintState,
  (
    spec: ReducerRoutedWeaponAttackSkeletonProjection,
    impl: ReducerRoutedWeaponAttackSkeletonProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
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
export const reducerRoutedWeaponAttackOrderingStateCheck = stateCheck(
  normalizeReducerRoutedWeaponAttackOrderingQuintState,
  (
    spec: ReducerRoutedWeaponAttackOrderingProjection,
    impl: ReducerRoutedWeaponAttackOrderingProjection,
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
export const reducerRoutedSaveGatedSpellOrderingStateCheck = stateCheck(
  normalizeReducerRoutedSaveGatedSpellOrderingQuintState,
  (
    spec: ReducerRoutedSaveGatedSpellOrderingProjection,
    impl: ReducerRoutedSaveGatedSpellOrderingProjection,
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
export const reducerRoutedSpellAttackOrderingStateCheck = stateCheck(
  normalizeReducerRoutedSpellAttackOrderingQuintState,
  (
    spec: ReducerRoutedSpellAttackOrderingProjection,
    impl: ReducerRoutedSpellAttackOrderingProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
export const reducerRoutedChainedAttackProcedureStateCheck = stateCheck(
  normalizeReducerRoutedChainedAttackProcedureQuintState,
  (
    spec: ReducerRoutedChainedAttackProcedureProjection,
    impl: ReducerRoutedChainedAttackProcedureProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
export const reducerRoutedIndependentSpellAttackSequenceStateCheck = stateCheck(
  normalizeReducerRoutedIndependentSpellAttackSequenceQuintState,
  (
    spec: ReducerRoutedIndependentSpellAttackSequenceProjection,
    impl: ReducerRoutedIndependentSpellAttackSequenceProjection,
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
export const reducerRoutedHitPointRestorationOrderingStateCheck = stateCheck(
  normalizeReducerRoutedHitPointRestorationOrderingQuintState,
  (
    spec: ReducerRoutedHitPointRestorationOrderingProjection,
    impl: ReducerRoutedHitPointRestorationOrderingProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
export const reducerRoutedDeathSavingThrowStateCheck = stateCheck(
  normalizeReducerRoutedDeathSavingThrowQuintState,
  (
    spec: ReducerRoutedDeathSavingThrowProjection,
    impl: ReducerRoutedDeathSavingThrowProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
export const reducerRoutedConcentrationBreakTeardownStateCheck = stateCheck(
  normalizeReducerRoutedConcentrationBreakTeardownQuintState,
  (
    spec: ReducerRoutedConcentrationBreakTeardownProjection,
    impl: ReducerRoutedConcentrationBreakTeardownProjection,
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
export const reducerRoutedCommandOrderingStateCheck = stateCheck(
  normalizeReducerRoutedCommandOrderingQuintState,
  (
    spec: ReducerRoutedCommandOrderingProjection,
    impl: ReducerRoutedCommandOrderingProjection,
  ) => {
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
export const reducerRoutedAdrenalineRushStateCheck = stateCheck(
  normalizeReducerRoutedAdrenalineRushQuintState,
  (
    spec: ReducerRoutedAdrenalineRushProjection,
    impl: ReducerRoutedAdrenalineRushProjection,
  ) => {
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
export const reducerRoutedScalarBuffStateCheck = stateCheck(
  normalizeReducerRoutedScalarBuffQuintState,
  (
    spec: ReducerRoutedScalarBuffProjection,
    impl: ReducerRoutedScalarBuffProjection,
  ) => {
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

function projectDeathSavingThrowState(
  input: BattleResolutionRecorderSnapshot<"">,
): DeathSavingThrowProjection {
  const snapshot = snapshotBattle(input.state);
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === deathSavingThrowTargetId,
  );
  if (target === undefined) {
    throw new Error("Expected Death Saving Throw target in battle snapshot.");
  }
  if (target.zeroHpLifecycle.policy !== "usesDeathSavingThrows") {
    throw new Error("Expected Death Saving Throw target lifecycle owner.");
  }

  return {
    currentTurnRole:
      snapshot.currentActorId === deathSavingThrowTargetId ? "target" : "actor",
    targetHp: target.hp,
    targetUnconscious: target.conditions.includes("unconscious"),
    targetStable: target.zeroHpLifecycle.stable,
    targetDead: target.zeroHpLifecycle.dead,
    targetDeathSuccesses: target.zeroHpLifecycle.deathSaves.successes,
    targetDeathFailures: target.zeroHpLifecycle.deathSaves.failures,
    holes: input.holes.map(deathSavingThrowHoleFromRuntime).sort(),
    lastResult: input.lastResult,
    lastInvalidReason: mbtLastInvalidReason(input.lastInvalidReason),
  };
}

function projectConcentrationBreakTeardownState(
  state: ConcentrationBreakTeardownRuntimeState,
): ConcentrationBreakTeardownProjection {
  const caster = requireBattleCombatant(state.battle, fighterId);
  return {
    scenario: state.scenario,
    damageTaken: state.damageTaken,
    saveDc: state.saveDc,
    saveRollTotal: state.saveRollTotal,
    concentrationSaveOffered: state.concentrationSaveOffered,
    casterConcentrating:
      // authored-id-dispatch-allow: battle-runtime-mbt-fixture-boundary
      caster.concentration?.sourceSpellId === "blur" &&
      caster.concentration.effectKind === "spellEffect",
    blurredEffectCount: blurredEffectCount(state.battle),
    spellSlotExpended: casterSpellSlotExpended(state.battle),
    teardownBeforeNextCommand: state.teardownBeforeNextCommand,
    replacementStartedAfterTeardown: state.replacementStartedAfterTeardown,
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

function requireBattleCombatant(
  state: BattleState,
  combatantId: CombatantId,
): BattleCombatantState {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    throw new Error("Expected combatant in battle state.");
  }
  return combatant;
}

function initialConcentrationBreakTeardownState(): ConcentrationBreakTeardownRuntimeState {
  return {
    battle: concentrationBreakTeardownBattle(),
    scenario: "init",
    damageTaken: 0,
    saveDc: 0,
    saveRollTotal: 0,
    concentrationSaveOffered: false,
    teardownBeforeNextCommand: false,
    replacementStartedAfterTeardown: false,
    pendingConcentrationSave: null,
  };
}

function stateAfterBlurCast(
  state: ConcentrationBreakTeardownRuntimeState,
): ConcentrationBreakTeardownRuntimeState {
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: blurSubject(),
      fills: [],
    }),
  );
  return {
    ...state,
    battle: resolved.state,
    pendingConcentrationSave: null,
  };
}

function damageRequestsConcentrationSave(
  state: ConcentrationBreakTeardownRuntimeState,
  damageDiePip: number,
): ConcentrationBreakTeardownRuntimeState {
  if (state.scenario !== "concentrationSpellCast") {
    throw new Error("Expected Concentration spell cast before damage.");
  }
  const attackerTurn = advanceToConcentrationAttackerTurn(state.battle);
  const act = statBlockAttackAct(
    attackerTurn,
    concentrationBreakAttackerId,
    "Scimitar",
  );
  const subject = act.subject;
  const target = requireResultHole(
    resolveBattleSubject({
      state: attackerTurn,
      subject,
      fills: [],
    }),
    "targetChoice",
  );
  const targetFillForCaster = creatureAttackTargetFill(
    target,
    concentrationBreakAttackerId,
    fighterId,
    "Scimitar",
  );
  const attackRoll = requireResultHole(
    resolveBattleSubject({
      state: attackerTurn,
      subject,
      fills: [targetFillForCaster],
    }),
    "attackRoll",
  );
  const attackFill = attackRollFill(attackRoll, {
    total: 20,
    naturalD20: 16,
    ...(attackRoll.rollMode === undefined
      ? {}
      : { rollMode: attackRoll.rollMode }),
  });
  const damage = requireResultHole(
    resolveBattleSubject({
      state: attackerTurn,
      subject,
      fills: [targetFillForCaster, attackFill],
    }),
    "rolledDice",
  );
  const damageFill = damageRollFill(damage, damageDiePip);
  const fills = [targetFillForCaster, attackFill, damageFill] as const;
  const pending = resolveBattleSubject({
    state: attackerTurn,
    subject,
    fills,
  });
  if (pending.tag !== "needsHoles") {
    throw new Error("Expected damage to request a Concentration Saving Throw.");
  }
  const concentration = requireTypedHole(
    pending.holes,
    "concentrationSavingThrow",
  );
  const damageTaken = Number(concentration.damageAmount);
  return {
    ...state,
    battle: pending.state,
    scenario: "damageSaveNeeded",
    damageTaken,
    saveDc: Number(concentration.dc),
    concentrationSaveOffered: true,
    pendingConcentrationSave: {
      state: pending.state,
      subject,
      fills,
      holes: [concentration],
    },
  };
}

function failConcentrationSave(
  state: ConcentrationBreakTeardownRuntimeState,
  saveRollTotal: number,
): ConcentrationBreakTeardownRuntimeState {
  if (state.scenario !== "damageSaveNeeded") {
    throw new Error("Expected pending Concentration save.");
  }
  const pending = state.pendingConcentrationSave;
  if (pending === null) {
    throw new Error("Expected pending Concentration save state.");
  }
  const [concentration] = pending.holes;
  if (saveRollTotal >= Number(concentration.dc)) {
    throw new Error("Expected failed Concentration save total.");
  }
  const resolved = requireResolved(
    resolveBattleSubject({
      state: pending.state,
      subject: pending.subject,
      fills: [
        ...pending.fills,
        concentrationSavingThrowFill(concentration, false),
      ],
    }),
  );
  return {
    ...state,
    battle: resolved.state,
    scenario: "damageFailedTeardownBeforeNextCommand",
    saveRollTotal,
    concentrationSaveOffered: false,
    teardownBeforeNextCommand: concentrationTeardownIsVisibleBeforeNextCommand(
      resolved.state,
    ),
    pendingConcentrationSave: null,
  };
}

function voluntarilyEndConcentration(
  state: ConcentrationBreakTeardownRuntimeState,
): ConcentrationBreakTeardownRuntimeState {
  const cast = stateAfterBlurCast(state);
  const broken = breakBattleConcentration(cast.battle, fighterId);
  return {
    ...cast,
    battle: broken,
    scenario: "voluntaryEndTeardown",
    teardownBeforeNextCommand:
      concentrationTeardownIsVisibleBeforeNextCommand(broken),
  };
}

function castReplacementConcentrationSpell(
  state: ConcentrationBreakTeardownRuntimeState,
): ConcentrationBreakTeardownRuntimeState {
  const beforeReplacement = stateWithPreexistingBlurConcentration(state.battle);
  const replaced = stateAfterBlurCast({
    ...state,
    battle: beforeReplacement,
  });
  return {
    ...replaced,
    scenario: "replacementTeardownBeforeNewEffect",
    replacementStartedAfterTeardown: blurredEffectCount(replaced.battle) === 1,
  };
}

function stateWithPreexistingBlurConcentration(state: BattleState): BattleState {
  const caster = requireBattleCombatant(state, fighterId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(fighterId, {
      ...caster,
      concentration: {
        sourceSpellId: "blur",
        effectKind: "spellEffect",
      },
      activeEffects: [
        ...caster.activeEffects,
        {
          kind: "blurred",
          sourceSpellId: "blur",
          sourceCombatantId: fighterId,
          expiresAt: {
            kind: "concentration",
            combatantId: fighterId,
          },
        },
      ],
    }),
  };
}

function advanceToConcentrationAttackerTurn(state: BattleState): BattleState {
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: endTurnSubjectFor(fighterId),
      fills: [],
    }),
  ).state;
}

function concentrationTeardownIsVisibleBeforeNextCommand(
  state: BattleState,
): boolean {
  const caster = requireBattleCombatant(state, fighterId);
  return (
    discoverBattleActs(state).length > 0 &&
    caster.concentration === null &&
    blurredEffectCount(state) === 0
  );
}

function blurredEffectCount(state: BattleState): number {
  return requireBattleCombatant(state, fighterId).activeEffects.filter(
    (effect) => effect.kind === "blurred",
  ).length;
}

function casterSpellSlotExpended(state: BattleState): number {
  const caster = requireBattleCombatant(state, fighterId);
  if (caster.origin.kind !== "character") {
    return 0;
  }
  const slot = caster.origin.spellcasting?.spellSlots.find(
    (candidate) => Number(candidate.spellLevel) === 2,
  );
  return Number(slot?.expended ?? 0);
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

function blurSubject(): Extract<BattleSubject, { readonly tag: "actionSpell" }> {
  return {
    tag: "actionSpell",
    actorId: fighterId,
    invocation: spellSlotInvocationRef("blur", 2, "blurAttackRollDefense"),
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

function independentSpellAttackSequenceSubject(): Extract<
  BattleSubject,
  { readonly tag: "actionSpell" }
> {
  return {
    tag: "actionSpell",
    actorId: spellCasterId,
    invocation: cantripSpellInvocationRef(
      INDEPENDENT_SPELL_ATTACK_SEQUENCE_SPELL_ID,
      "spellAttackSequence",
    ),
    mode: { tag: "cast" },
  };
}

function chainedAttackProcedureAct(
  state: BattleState,
  slotLevel: ChainedAttackProcedureSlotLevel,
): ChainedAttackProcedureAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ChainedAttackProcedureAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "chainedSpellAttackDamage" &&
      candidate.subject.invocation.tag === "spellSlot" &&
      Number(candidate.subject.invocation.slotLevel) === slotLevel,
  );
  if (act === undefined) {
    throw new Error(
      `Expected chained spell attack procedure act at slot ${slotLevel}.`,
    );
  }
  return act;
}

function independentSpellAttackSequenceAct(
  state: BattleState,
): IndependentSpellAttackSequenceAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is IndependentSpellAttackSequenceAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === spellCasterId &&
      // authored-id-dispatch-allow: battle-runtime-mbt-fixture-boundary
      candidate.subject.invocation.spellId ===
        INDEPENDENT_SPELL_ATTACK_SEQUENCE_SPELL_ID &&
      candidate.subject.invocation.procedure === "spellAttackSequence",
  );
  if (act === undefined) {
    throw new Error("Expected independent spell attack sequence act.");
  }
  return act;
}

function twoIndependentSpellAttackSequenceTargetHoles(
  holes: readonly BattleHole[],
): readonly [
  Extract<BattleHole, { readonly kind: "targetChoice" }>,
  Extract<BattleHole, { readonly kind: "targetChoice" }>,
] {
  const targetHoles = holes.filter(
    (
      hole,
    ): hole is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
      hole.kind === "targetChoice",
  );
  const first = targetHoles[0];
  const second = targetHoles[1];
  if (first === undefined || second === undefined || targetHoles.length !== 2) {
    throw new Error(
      "Expected exactly two independent spell attack sequence target holes.",
    );
  }
  return [first, second];
}

function chainedAttackProcedureSlotLevel(
  raw: number,
): ChainedAttackProcedureSlotLevel {
  if (raw === 1 || raw === 2) return raw;
  throw new Error(`Unknown chained attack procedure slot level: ${raw}.`);
}

function requireChainedAttackProcedureSlotLevel(
  slotLevel: ChainedAttackProcedureSlotLevel | null,
): ChainedAttackProcedureSlotLevel {
  if (slotLevel !== null) return slotLevel;
  throw new Error("Expected chained attack procedure slot level.");
}

function chainedAttackProcedureStep0NoDuplicateFaces(
  slotLevel: ChainedAttackProcedureSlotLevel,
): readonly number[] {
  return slotLevel === 1
    ? CHAINED_ATTACK_PROCEDURE_STEP0_NO_DUPLICATE_FACES
    : CHAINED_ATTACK_PROCEDURE_STEP0_NO_DUPLICATE_SLOT2_FACES;
}

function chainedAttackProcedureStep0DuplicateFaces(
  slotLevel: ChainedAttackProcedureSlotLevel,
): readonly number[] {
  return slotLevel === 1
    ? CHAINED_ATTACK_PROCEDURE_STEP0_DUPLICATE_FACES
    : CHAINED_ATTACK_PROCEDURE_STEP0_DUPLICATE_SLOT2_FACES;
}

function requireChainedAttackProcedureSubject(
  subject: ChainedAttackProcedureSubject | null,
): ChainedAttackProcedureSubject {
  if (subject !== null) return subject;
  throw new Error("Expected chained attack procedure subject.");
}

function independentSpellAttackSequenceTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: spellTargetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: spellCasterId,
        targetId: spellTargetId,
        spellId: INDEPENDENT_SPELL_ATTACK_SEQUENCE_SPELL_ID,
      },
    ],
  };
}

function independentSpellAttackSequenceExpectedTargetHp(
  fills: readonly BattleFill[],
): number {
  const damageFillCount = fills.filter((fill) => fill.kind === "rolledDice")
    .length;
  return (
    INDEPENDENT_SPELL_ATTACK_SEQUENCE_INITIAL_TARGET_HP -
    damageFillCount * INDEPENDENT_SPELL_ATTACK_SEQUENCE_LOW_DAMAGE
  );
}

function assertIndependentSpellAttackSequenceTargetHp(
  state: BattleState,
  expectedTargetHp: number,
): void {
  const target = snapshotCombatant(state, spellTargetId);
  if (target.hp !== expectedTargetHp) {
    throw new Error(
      `Expected independent spell attack target Hit Points ${expectedTargetHp}, got ${target.hp}.`,
    );
  }
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

function chainedAttackProcedureBattle(): BattleState {
  return spellBattle({
    preparedSpells: [spellRecord(chromaticOrbUnitId)],
    spellSlots: [
      { spellLevel: 1, count: 1 },
      { spellLevel: 2, count: 1 },
    ],
    extraTargetIds: [
      chainedAttackProcedureSecondTargetId,
      chainedAttackProcedureThirdTargetId,
    ],
  });
}

function independentSpellAttackSequenceBattle(): BattleState {
  return spellBattle({
    cantrips: [spellRecord(INDEPENDENT_SPELL_ATTACK_SEQUENCE_SPELL_ID)],
    spellSlots: [],
    casterClassLevels: [{ className: "warlock", level: 5 }],
    targetHp: INDEPENDENT_SPELL_ATTACK_SEQUENCE_INITIAL_TARGET_HP,
    targetMaxHp: INDEPENDENT_SPELL_ATTACK_SEQUENCE_INITIAL_TARGET_HP,
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

function deathSavingThrowBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-death-saving-throw-route"),
    combatants: [
      deathSavingThrowCharacterInit({
        combatantId: fighterId,
        characterId: "death-saving-throw-route-actor-character",
        displayName: "Actor",
        initiative: 20,
        currentHp: 12,
      }),
      deathSavingThrowCharacterInit({
        combatantId: deathSavingThrowTargetId,
        characterId: "death-saving-throw-route-target-character",
        displayName: "Target",
        initiative: 10,
        currentHp: 0,
        zeroHpLifecycle: {
          policy: "usesDeathSavingThrows",
          deathSaves: {
            deathSaves: { successes: 2, failures: 1 },
            stable: false,
            dead: false,
            hpRegained: false,
          },
        },
      }),
    ],
  });
}

function concentrationBreakTeardownBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-concentration-break-teardown-route"),
    combatants: [
      concentrationBreakTeardownCasterInit({ initiative: 20 }),
      statBlockCreature({
        combatantId: concentrationBreakAttackerId,
        statBlock: statBlockWithCreatureType("humanoid"),
        initiative: 10,
      }),
    ],
  });
}

function endTurnSubject(): Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "endTurn" }
> {
  return endTurnSubjectFor(fighterId);
}

function deathSavingThrowEndTurnSubject(): Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "endTurn" }
> {
  return { tag: "runtimeCommand", actorId: fighterId, command: "endTurn" };
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

function deathSavingThrowCharacterInit(input: {
  readonly combatantId: CombatantId;
  readonly characterId: string;
  readonly displayName: string;
  readonly initiative: number;
  readonly currentHp: number;
  readonly zeroHpLifecycle?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["zeroHpLifecycle"];
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.combatantId === fighterId ? partySide : oppositionSide,
    creatureInit: {
      kind: "character",
      characterId: characterId(input.characterId),
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
      ...(input.zeroHpLifecycle === undefined
        ? {}
        : { zeroHpLifecycle: input.zeroHpLifecycle }),
    },
  };
}

function concentrationBreakTeardownCasterInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  const blur = unitLibrary.requireUnit("blur");
  if (blur.kind !== "spell") {
    throw new Error("Expected Blur spell Unit.");
  }
  return {
    combatantId: fighterId,
    displayName: "Concentration Caster",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("concentration-break-teardown-route-caster"),
      characterUnitRefs: [],
      classLevels: [{ className: "wizard", level: 3 }],
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
        sourceClassName: "wizard",
        spellcastingAbilityModifier: 3,
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [blur],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 2, count: 2 }],
      },
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

function requireTypedHole<const Kind extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: Kind,
): Extract<BattleHole, { readonly kind: Kind }> {
  const hole = requireHole(holes, kind);
  if (hole.kind === kind) {
    // The equality check proves the runtime kind; TypeScript cannot express
    // that refinement for this generic Extract.
    return hole as Extract<BattleHole, { readonly kind: Kind }>;
  }

  throw new Error(`Expected ${kind} hole.`);
}

function requireResultHole<const Kind extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: Kind,
): Extract<BattleHole, { readonly kind: Kind }> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected ${kind} hole result, got ${result.tag}.`);
  }
  return requireTypedHole(result.holes, kind);
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

function chainedAttackProcedureTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: spellCasterId,
        targetId,
        spellId: chromaticOrbUnitId,
      },
    ],
  };
}

function chainedAttackProcedureLeapTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: chainedAttackProcedureSecondTargetId,
    spatialFacts: [
      {
        kind: "spellLeapTargetWithinRange",
        previousTargetId: spellTargetId,
        targetId: chainedAttackProcedureSecondTargetId,
        spellId: chromaticOrbUnitId,
        rangeFeet: movementFeet(30),
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

function deathSavingThrowFill(
  hole: Extract<BattleHole, { readonly kind: "deathSavingThrow" }>,
  roll: number,
): Extract<BattleFill, { readonly kind: "deathSavingThrow" }> {
  return {
    kind: "deathSavingThrow",
    holeId: hole.holeId,
    value: DieRollResult(roll),
  };
}

function concentrationSavingThrowFill(
  hole: Extract<BattleHole, { readonly kind: "concentrationSavingThrow" }>,
  succeeded: boolean,
): Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }> {
  return {
    kind: "concentrationSavingThrow",
    holeId: hole.holeId,
    value: {
      succeeded,
      withoutRoll: true,
    },
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

function chainedAttackProcedureDamageRollFill(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  faces: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  return damageRollFillWithGroups(hole, [faces]);
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

function reducerRouteHolesFromRuntime(
  holes: readonly Pick<BattleHole, "kind">[],
): readonly ReducerRouteHole[] {
  return [...new Set(holes.flatMap(reducerRouteHolesFromRuntimeHole))].sort();
}

function reducerRouteHolesFromRuntimeHole(
  hole: Pick<BattleHole, "kind">,
): readonly ReducerRouteHole[] {
  if (hole.kind === "abilityCheck") return ["abilityCheck"];
  if (hole.kind === "abilityChoice") return ["abilityChoice"];
  if (hole.kind === "attackDamageDisposition") {
    return ["attackDamageDisposition"];
  }
  if (hole.kind === "attackRoll") return ["attackRoll"];
  if (hole.kind === "commandOptionChoice") return ["commandOptionChoice"];
  if (hole.kind === "companionReappearanceInitiative") {
    return ["companionReappearanceInitiative"];
  }
  if (hole.kind === "concentrationSavingThrow") {
    return ["concentrationSavingThrow"];
  }
  if (hole.kind === "conditionChoice") return ["conditionChoice"];
  if (hole.kind === "damageTypeChoice") return ["damageTypeChoice"];
  if (hole.kind === "deathSavingThrow") return ["deathSavingThrow"];
  if (hole.kind === "grappleOutcome") return ["grappleOutcome"];
  if (hole.kind === "gustOfWindLineDirectionChoice") {
    return ["gustOfWindLineDirectionChoice"];
  }
  // Held-object inventories are caller/table-supplied boundary facts, not a
  // durable reducer-route frontier.
  if (hole.kind === "heldObjectFacts") return [];
  if (hole.kind === "hitPointHealingDistribution") {
    return ["hitPointHealingDistribution"];
  }
  if (hole.kind === "interruptDecision") return ["interruptDecision"];
  if (hole.kind === "levitateAltitudeChange") {
    return ["levitateAltitudeChange"];
  }
  if (hole.kind === "levitateInitialRise") return ["levitateInitialRise"];
  // Magic Weapon target item identity is caller/table-supplied inventory
  // evidence, not a durable reducer-route frontier.
  if (hole.kind === "magicWeaponTargetItem") return [];
  if (hole.kind === "movement") return ["movement"];
  if (hole.kind === "objectDropResolution") return ["objectDropResolution"];
  // Object target choice is a table-owned boundary fact, outside this route vocabulary.
  if (hole.kind === "objectTargetChoice") return [];
  if (hole.kind === "ongoingSpellTargetChoice") {
    return ["ongoingSpellTargetChoice"];
  }
  if (hole.kind === "rolledDice") return ["rolledDice"];
  if (hole.kind === "sanctuaryInterdictionOutcome") {
    return ["sanctuaryInterdictionOutcome"];
  }
  if (hole.kind === "savingThrowOutcome") return ["savingThrowOutcome"];
  if (hole.kind === "selfTransformationModeChoice") {
    return ["selfTransformationModeChoice"];
  }
  if (hole.kind === "shoveOutcome") return ["shoveOutcome"];
  if (hole.kind === "skillChoice") return ["skillChoice"];
  if (hole.kind === "slowSomaticSpellFailureOutcome") {
    return ["slowSomaticSpellFailureOutcome"];
  }
  if (hole.kind === "spellcastingAbilityCheck") {
    return ["spellcastingAbilityCheck"];
  }
  if (hole.kind === "spellTargetAllocation") return ["spellTargetAllocation"];
  if (hole.kind === "spellTargetList") return ["spellTargetList"];
  if (hole.kind === "statBlockRechargeRoll") {
    return ["statBlockRechargeRoll"];
  }
  if (hole.kind === "targetAbilityChoices") return ["targetAbilityChoices"];
  if (hole.kind === "targetChoice") return ["targetChoice"];
  if (hole.kind === "unitFeatureDecision") return ["unitFeatureDecision"];
  if (hole.kind === "wildShapeEquipmentDisposition") {
    return ["wildShapeEquipmentDisposition"];
  }

  throw new Error(`Unexpected reducer-route hole: ${hole.kind}.`);
}

function projectHoles(holes: readonly BattleHole[]): readonly MbtHole[] {
  return holes.flatMap(projectHole).sort();
}

function deathSavingThrowHoleFromRuntime(
  hole: Pick<BattleHole, "kind">,
): DeathSavingThrowMbtHole {
  if (hole.kind === "deathSavingThrow") {
    return "DeathSavingThrow";
  }

  throw new Error(`Unexpected Death Saving Throw route hole: ${hole.kind}`);
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

function deathSavingThrowHole(raw: unknown): DeathSavingThrowMbtHole {
  const tag = quintVariantTag(raw);
  if (tag === "DeathSavingThrow") {
    return tag;
  }

  throw new Error(`Unknown Death Saving Throw hole: ${tag}`);
}

function concentrationBreakTeardownHole(raw: unknown): string {
  const tag = quintVariantTag(raw, "Concentration break teardown witness hole");
  if (tag === "ConcentrationSavingThrow") return "concentrationSavingThrow";
  if (tag === "ConcentrationBreakTeardown") {
    return "concentrationBreakTeardown";
  }
  throw new Error(`Unexpected Concentration break teardown hole ${tag}.`);
}

const CONCENTRATION_BREAK_TEARDOWN_SCENARIO_BY_TAG = {
  Init: "init",
  ConcentrationSpellCast: "concentrationSpellCast",
  DamageSaveNeeded: "damageSaveNeeded",
  DamageFailedTeardownBeforeNextCommand:
    "damageFailedTeardownBeforeNextCommand",
  VoluntaryEndTeardown: "voluntaryEndTeardown",
  ReplacementTeardownBeforeNewEffect: "replacementTeardownBeforeNewEffect",
} as const satisfies Readonly<Record<string, ConcentrationBreakTeardownScenario>>;

function concentrationBreakTeardownScenario(
  raw: unknown,
): ConcentrationBreakTeardownScenario {
  const tag = quintVariantTag(raw, "qScenario");
  if (hasOwnStringKey(CONCENTRATION_BREAK_TEARDOWN_SCENARIO_BY_TAG, tag)) {
    return CONCENTRATION_BREAK_TEARDOWN_SCENARIO_BY_TAG[tag];
  }
  throw new Error(`Unexpected Concentration break teardown scenario ${tag}.`);
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
  if (tag === "InterruptDecisionHoleKind") return "interruptDecision";

  throw new Error(`Unknown Command ordering hole: ${tag}`);
}

function commandOrderingHoleFromRuntime(
  hole: Pick<BattleHole, "kind">,
): readonly CommandOrderingHole[] {
  if (hole.kind === "spellTargetList") return ["spellTargetList"];
  if (hole.kind === "commandOptionChoice") return ["commandOptionChoice"];
  if (hole.kind === "savingThrowOutcome") return ["savingThrowOutcome"];
  if (hole.kind === "movement") return ["movement"];
  if (hole.kind === "interruptDecision") return ["interruptDecision"];
  if (hole.kind === "heldObjectFacts") return [];

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
