// KERNEL-COVERAGE: runtime-owner BATTLE.D20_TEST.TABLE_CIRCUMSTANCE_DECISION
// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.PRONE_TARGET_ROLL_MODE
import type { CombatantId } from "./identity.ts";
import type {
  BattleAttackRollResult,
  BattleFill,
  BattleHole,
} from "./battle-state-execution.ts";
import { Brand, Result } from "effect";
import { PRONE_ATTACK_ADVANTAGE_DISTANCE_FEET } from "./battle-reducer/domain-constants.ts";
import type { MovementFeet } from "@dnd/shared/types";

export const D20_TEST_KINDS = [
  "abilityCheck",
  "savingThrow",
  "attackRoll",
] as const;
export type D20TestKind = (typeof D20_TEST_KINDS)[number];

export const D20_TEST_ROLL_MODES = [
  "normal",
  "advantage",
  "disadvantage",
] as const;
export type D20TestRollMode = (typeof D20_TEST_ROLL_MODES)[number];

export type D20TestRollModeSources = Readonly<{
  readonly advantage: boolean;
  readonly disadvantage: boolean;
}>;

export function proneAttackRollModeSources(
  distanceFeet: MovementFeet,
): D20TestRollModeSources {
  return {
    advantage:
      Number(distanceFeet) <= Number(PRONE_ATTACK_ADVANTAGE_DISTANCE_FEET),
    disadvantage:
      Number(distanceFeet) > Number(PRONE_ATTACK_ADVANTAGE_DISTANCE_FEET),
  };
}

export const TABLE_D20_TEST_CIRCUMSTANCE_SOURCES = [
  "advantage",
  "disadvantage",
] as const;
export type TableD20TestCircumstanceSource =
  (typeof TABLE_D20_TEST_CIRCUMSTANCE_SOURCES)[number];

export type D20TestResolutionId = string & Brand.Brand<"D20TestResolutionId">;
const D20TestResolutionId = Brand.nominal<D20TestResolutionId>();
export const d20TestResolutionId: (value: string) => D20TestResolutionId =
  D20TestResolutionId;

export type BattleD20TestRequestRef = string &
  Brand.Brand<"BattleD20TestRequestRef">;
const BattleD20TestRequestRef = Brand.nominal<BattleD20TestRequestRef>();

export type D20TestOrdinal = number & Brand.Brand<"D20TestOrdinal">;
const D20TestOrdinal = Brand.nominal<D20TestOrdinal>();

export type BattleD20TestCircumstanceRequest = Readonly<{
  readonly requestRef: BattleD20TestRequestRef;
  readonly testKind: D20TestKind;
  readonly testOrdinal: D20TestOrdinal;
  readonly holeInstanceKey: BattleHole["holeInstanceKey"];
  readonly targetId?: CombatantId;
  readonly mechanicalSources: D20TestRollModeSources;
}>;

export type TableD20TestCircumstanceDecision = Readonly<{
  readonly requestRef: BattleD20TestRequestRef;
  readonly testKind: D20TestKind;
  readonly source: TableD20TestCircumstanceSource;
}>;

export type TableD20TestCircumstanceDecisionIssue = Readonly<{
  readonly tag:
    | "stale-d20-test-request"
    | "d20-test-kind-mismatch"
    | "duplicate-d20-test-decision"
    | "contradictory-d20-test-decision";
  readonly requestRef: BattleD20TestRequestRef;
  readonly message: string;
}>;

export type TableD20TestCircumstanceDecisionAdmissionIssue = Readonly<{
  readonly tag: "invalid-table-d20-test-circumstance-decisions";
  readonly issues: readonly [
    TableD20TestCircumstanceDecisionIssue,
    ...TableD20TestCircumstanceDecisionIssue[],
  ];
}>;

function requestRef(input: {
  readonly resolutionId: D20TestResolutionId;
  readonly hole: BattleHole;
  readonly testKind: D20TestKind;
  readonly testOrdinal: D20TestOrdinal;
  readonly targetId?: CombatantId;
}): BattleD20TestRequestRef {
  return BattleD20TestRequestRef(
    JSON.stringify([
      "battle-d20-test",
      input.resolutionId,
      input.hole.holeInstanceKey,
      input.testKind,
      input.testOrdinal,
      input.targetId ?? null,
    ]),
  );
}

export function combineD20TestRollMode(
  mechanicalSources: D20TestRollModeSources,
  tableSource?: TableD20TestCircumstanceSource,
): D20TestRollMode {
  const advantage = mechanicalSources.advantage || tableSource === "advantage";
  const disadvantage =
    mechanicalSources.disadvantage || tableSource === "disadvantage";
  return advantage === disadvantage
    ? "normal"
    : advantage
      ? "advantage"
      : "disadvantage";
}

export function mechanicalD20TestRollMode(
  sources: D20TestRollModeSources,
): D20TestRollMode | undefined {
  return !sources.advantage && !sources.disadvantage
    ? undefined
    : combineD20TestRollMode(sources);
}

export function mechanicalD20TestRollModeSources(
  rollMode: D20TestRollMode | undefined,
): D20TestRollModeSources {
  return {
    advantage: rollMode === "advantage" || rollMode === "normal",
    disadvantage: rollMode === "disadvantage" || rollMode === "normal",
  };
}

function savingThrowHoleTargetsA(
  hole: Extract<BattleHole, { kind: "savingThrowOutcome" }>,
): readonly CombatantId[] {
  return [
    ...("targetIds" in hole ? hole.targetIds : []),
    ...("areaChoices" in hole
      ? hole.areaChoices.flatMap(({ affectedTargetIds }) => affectedTargetIds)
      : []),
    ...("objectContactSave" in hole ? hole.objectContactSave.targetIds : []),
    ...("spellTurnStartSave" in hole ? [hole.spellTurnStartSave.targetId] : []),
    ...("stagedConditionRepeatSave" in hole
      ? [hole.stagedConditionRepeatSave.targetId]
      : []),
    ...("saveGatedConditionRepeatSave" in hole
      ? [hole.saveGatedConditionRepeatSave.targetId]
      : []),
  ];
}

function savingThrowHoleTargetsB(
  hole: Extract<BattleHole, { kind: "savingThrowOutcome" }>,
): readonly CombatantId[] {
  return [
    ...("spellConditionCountedEndTurnSave" in hole
      ? [hole.spellConditionCountedEndTurnSave.targetId]
      : []),
    ...("persistentAreaSaveCondition" in hole
      ? [hole.persistentAreaSaveCondition.targetId]
      : []),
    ...("persistentAreaSaveConditionEscape" in hole
      ? [hole.persistentAreaSaveConditionEscape.targetId]
      : []),
    ...("persistentAreaSaveComposite" in hole
      ? [hole.persistentAreaSaveComposite.targetId]
      : []),
    ...("persistentAreaSaveDamage" in hole
      ? [hole.persistentAreaSaveDamage.targetId]
      : []),
    ...("directionalPersistentArea" in hole
      ? [hole.directionalPersistentArea.targetId]
      : []),
  ];
}

function savingThrowHoleTargetsC(
  hole: Extract<BattleHole, { kind: "savingThrowOutcome" }>,
): readonly CombatantId[] {
  return [
    ...("spellConditionEndTurnSave" in hole
      ? [hole.spellConditionEndTurnSave.targetId]
      : []),
    ...("unitFeatureConditionEndTurnSave" in hole
      ? [hole.unitFeatureConditionEndTurnSave.targetId]
      : []),
    ...("turnConstraintEndTurnSave" in hole
      ? [hole.turnConstraintEndTurnSave.targetId]
      : []),
    ...("abilityD20TestRollModeEndTurnSave" in hole
      ? [hole.abilityD20TestRollModeEndTurnSave.targetId]
      : []),
    ...("movableZone" in hole ? [hole.movableZone.targetId] : []),
    ...("protectionRelevantEffectSave" in hole
      ? [hole.protectionRelevantEffectSave.targetId]
      : []),
  ];
}

function savingThrowHoleTargets(
  hole: Extract<BattleHole, { kind: "savingThrowOutcome" }>,
): readonly CombatantId[] {
  return [
    ...savingThrowHoleTargetsA(hole),
    ...savingThrowHoleTargetsB(hole),
    ...savingThrowHoleTargetsC(hole),
  ];
}

function savingThrowTargetsFromPriorFills(
  fills: readonly BattleFill[],
): readonly CombatantId[] {
  const precedingFills = [...fills].reverse();
  for (const fill of precedingFills) {
    if (fill.kind === "savingThrowOutcome") {
      return fill.value.outcomes
        .filter((outcome) => outcome.withoutRoll !== true)
        .map(({ targetId }) => targetId);
    }
    if (fill.kind === "spellTargetList") return fill.value.targetIds;
    if (fill.kind === "spellTargetAllocation") {
      return fill.value.allocations.map(({ targetId }) => targetId);
    }
    if (fill.kind === "objectContactTargets") return fill.value.targetIds;
    if (fill.kind === "targetChoice") return [fill.value];
  }
  return [];
}

function savingThrowTargets(
  hole: Extract<BattleHole, { kind: "savingThrowOutcome" }>,
  fills: readonly BattleFill[],
): readonly CombatantId[] {
  const holeTargets = savingThrowHoleTargets(hole);
  return holeTargets.length > 0
    ? [...new Set(holeTargets)]
    : savingThrowTargetsFromPriorFills(fills);
}

type D20TestRequestProjectionInput = Readonly<{
  resolutionId: D20TestResolutionId;
  hole: BattleHole;
  resolvedFills: readonly BattleFill[];
}>;

function testOrdinalForHole(
  hole: BattleHole,
  resolvedFills: readonly BattleFill[],
): D20TestOrdinal {
  return D20TestOrdinal(
    resolvedFills.filter((fill) => fill.holeId === hole.holeId).length,
  );
}

function attackRollTargetId(
  hole: Extract<BattleHole, { kind: "attackRoll" }>,
  resolvedFills: readonly BattleFill[],
): CombatantId | undefined {
  return (
    ("relationshipFactRequest" in hole
      ? hole.relationshipFactRequest?.targetId
      : undefined) ??
    [...resolvedFills].reverse().find((fill) => fill.kind === "targetChoice")
      ?.value
  );
}

function attackRollRequests(
  input: D20TestRequestProjectionInput,
): readonly BattleD20TestCircumstanceRequest[] {
  if (input.hole.kind !== "attackRoll") return [];
  const testKind = "attackRoll" as const;
  const testOrdinal = testOrdinalForHole(input.hole, input.resolvedFills);
  const targetId = attackRollTargetId(input.hole, input.resolvedFills);
  return [
    {
      requestRef: requestRef({
        resolutionId: input.resolutionId,
        hole: input.hole,
        testKind,
        testOrdinal,
        ...(targetId === undefined ? {} : { targetId }),
      }),
      testKind,
      testOrdinal,
      holeInstanceKey: input.hole.holeInstanceKey,
      ...(targetId === undefined ? {} : { targetId }),
      mechanicalSources: mechanicalD20TestRollModeSources(input.hole.rollMode),
    },
  ];
}

function savingThrowOutcomeRequests(
  input: D20TestRequestProjectionInput,
): readonly BattleD20TestCircumstanceRequest[] {
  if (input.hole.kind !== "savingThrowOutcome") return [];
  const hole = input.hole;
  const testKind = "savingThrow" as const;
  const testOrdinal = testOrdinalForHole(hole, input.resolvedFills);
  return savingThrowTargets(hole, input.resolvedFills).map((targetId) => ({
    requestRef: requestRef({
      resolutionId: input.resolutionId,
      hole,
      testKind,
      testOrdinal,
      targetId,
    }),
    testKind,
    testOrdinal,
    holeInstanceKey: hole.holeInstanceKey,
    targetId,
    mechanicalSources: mechanicalD20TestRollModeSources(
      hole.targetRollModes.find(
        (projection) => projection.targetId === targetId,
      )?.rollMode,
    ),
  }));
}

function abilityCheckRequests(
  input: D20TestRequestProjectionInput,
): readonly BattleD20TestCircumstanceRequest[] {
  if (
    input.hole.kind !== "abilityCheck" &&
    input.hole.kind !== "spellcastingAbilityCheck"
  ) {
    return [];
  }
  const testKind = "abilityCheck" as const;
  const testOrdinal = testOrdinalForHole(input.hole, input.resolvedFills);
  const rollMode = "rollMode" in input.hole ? input.hole.rollMode : undefined;
  return [
    {
      requestRef: requestRef({
        resolutionId: input.resolutionId,
        hole: input.hole,
        testKind,
        testOrdinal,
      }),
      testKind,
      testOrdinal,
      holeInstanceKey: input.hole.holeInstanceKey,
      mechanicalSources: mechanicalD20TestRollModeSources(rollMode),
    },
  ];
}

function grappleRequests(
  input: D20TestRequestProjectionInput,
): readonly BattleD20TestCircumstanceRequest[] {
  if (input.hole.kind !== "grappleOutcome") return [];
  const testKind =
    input.hole.mode === "escapeCheck"
      ? ("abilityCheck" as const)
      : ("savingThrow" as const);
  const testOrdinal = testOrdinalForHole(input.hole, input.resolvedFills);
  return [
    {
      requestRef: requestRef({
        resolutionId: input.resolutionId,
        hole: input.hole,
        testKind,
        testOrdinal,
        targetId: input.hole.targetId,
      }),
      testKind,
      testOrdinal,
      holeInstanceKey: input.hole.holeInstanceKey,
      targetId: input.hole.targetId,
      mechanicalSources: mechanicalD20TestRollModeSources(input.hole.rollMode),
    },
  ];
}

function singleSavingThrowRequests(
  input: D20TestRequestProjectionInput,
): readonly BattleD20TestCircumstanceRequest[] {
  if (
    input.hole.kind !== "deathSavingThrow" &&
    input.hole.kind !== "concentrationSavingThrow" &&
    input.hole.kind !== "shoveOutcome"
  ) {
    return [];
  }
  const testKind = "savingThrow" as const;
  const testOrdinal = testOrdinalForHole(input.hole, input.resolvedFills);
  const rollMode = "rollMode" in input.hole ? input.hole.rollMode : undefined;
  const targetId =
    input.hole.kind === "shoveOutcome"
      ? input.hole.targetId
      : input.hole.combatantId;
  return [
    {
      requestRef: requestRef({
        resolutionId: input.resolutionId,
        hole: input.hole,
        testKind,
        testOrdinal,
        targetId,
      }),
      testKind,
      testOrdinal,
      holeInstanceKey: input.hole.holeInstanceKey,
      targetId,
      mechanicalSources: mechanicalD20TestRollModeSources(rollMode),
    },
  ];
}

function d20TestRequestsForHole(
  input: D20TestRequestProjectionInput,
): readonly BattleD20TestCircumstanceRequest[] {
  return [
    ...attackRollRequests(input),
    ...savingThrowOutcomeRequests(input),
    ...abilityCheckRequests(input),
    ...grappleRequests(input),
    ...singleSavingThrowRequests(input),
  ];
}

export function battleD20TestCircumstanceRequests(input: {
  readonly resolutionId: D20TestResolutionId;
  readonly holes: readonly BattleHole[];
  readonly resolvedFills: readonly BattleFill[];
}): readonly BattleD20TestCircumstanceRequest[] {
  return input.holes.flatMap((hole) =>
    d20TestRequestsForHole({
      resolutionId: input.resolutionId,
      hole,
      resolvedFills: input.resolvedFills,
    }),
  );
}

export function admitTableD20TestCircumstanceDecisions(input: {
  readonly requests: readonly BattleD20TestCircumstanceRequest[];
  readonly decisions: readonly TableD20TestCircumstanceDecision[];
}): Result.Result<
  ReadonlyMap<BattleD20TestRequestRef, TableD20TestCircumstanceDecision>,
  TableD20TestCircumstanceDecisionAdmissionIssue
> {
  const requests = new Map(
    input.requests.map((request) => [request.requestRef, request]),
  );
  const admitted = new Map<
    BattleD20TestRequestRef,
    TableD20TestCircumstanceDecision
  >();
  const issues: TableD20TestCircumstanceDecisionIssue[] = [];
  for (const decision of input.decisions) {
    const request = requests.get(decision.requestRef);
    if (request === undefined) {
      issues.push({
        tag: "stale-d20-test-request",
        requestRef: decision.requestRef,
        message: `Table circumstance decision names a D20 Test that is not pending: ${decision.requestRef}.`,
      });
      continue;
    }
    if (request.testKind !== decision.testKind) {
      issues.push({
        tag: "d20-test-kind-mismatch",
        requestRef: decision.requestRef,
        message: `Table circumstance decision says ${decision.testKind}, but the pending test is ${request.testKind}.`,
      });
      continue;
    }
    const prior = admitted.get(decision.requestRef);
    if (prior !== undefined) {
      const contradictory = prior.source !== decision.source;
      issues.push({
        tag: contradictory
          ? "contradictory-d20-test-decision"
          : "duplicate-d20-test-decision",
        requestRef: decision.requestRef,
        message: contradictory
          ? `Table supplied both Advantage and Disadvantage for the same D20 Test request: ${decision.requestRef}.`
          : `Table supplied the same circumstance decision more than once for D20 Test request: ${decision.requestRef}.`,
      });
      continue;
    }
    admitted.set(decision.requestRef, decision);
  }
  const firstIssue = issues[0];
  if (firstIssue !== undefined) {
    return Result.fail({
      tag: "invalid-table-d20-test-circumstance-decisions",
      issues: [firstIssue, ...issues.slice(1)],
    });
  }
  return Result.succeed(admitted);
}

export function effectiveD20TestRollMode(input: {
  readonly request: BattleD20TestCircumstanceRequest;
  readonly admitted: ReadonlyMap<
    BattleD20TestRequestRef,
    TableD20TestCircumstanceDecision
  >;
}): D20TestRollMode {
  return combineD20TestRollMode(
    input.request.mechanicalSources,
    input.admitted.get(input.request.requestRef)?.source,
  );
}

export function battleHolesWithTableD20TestCircumstances(input: {
  readonly holes: readonly BattleHole[];
  readonly requests: readonly BattleD20TestCircumstanceRequest[];
  readonly admitted: ReadonlyMap<
    BattleD20TestRequestRef,
    TableD20TestCircumstanceDecision
  >;
}): readonly BattleHole[] {
  return input.holes.map((hole) => {
    const requests = input.requests.filter(
      (request) => request.holeInstanceKey === hole.holeInstanceKey,
    );
    if (requests.length === 0) return hole;
    if (hole.kind === "savingThrowOutcome") {
      return {
        ...hole,
        targetRollModes: requests.flatMap((request) =>
          request.targetId === undefined
            ? []
            : [
                {
                  targetId: request.targetId,
                  rollMode: effectiveD20TestRollMode({
                    request,
                    admitted: input.admitted,
                  }),
                },
              ],
        ),
      };
    }
    const request = requests[0];
    return request === undefined
      ? hole
      : {
          ...hole,
          rollMode: effectiveD20TestRollMode({
            request,
            admitted: input.admitted,
          }),
        };
  });
}

const admittedAttackRollTableSources = new WeakMap<
  BattleAttackRollResult,
  TableD20TestCircumstanceSource
>();

export function retainAdmittedAttackRollTableSource(
  roll: BattleAttackRollResult,
  source: TableD20TestCircumstanceSource,
): void {
  admittedAttackRollTableSources.set(roll, source);
}

export function admittedAttackRollTableSource(
  roll: BattleAttackRollResult,
): TableD20TestCircumstanceSource | undefined {
  return admittedAttackRollTableSources.get(roll);
}
