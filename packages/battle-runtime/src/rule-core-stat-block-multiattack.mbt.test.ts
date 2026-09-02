// RAW-COVERAGE: verification-owner:focused-mbt RAW-STAT-BLOCK-MULTIATTACK-001
import { statBlockId as parseSharedStatBlockId } from "@dnd/shared/game-facts";
import {
  battleSubjectUsesOnlyStatBlockDamageComponentNotationForTest,
  resolveBattleSubject,
  startBattleRight,
  statBlockProcedurePresentationsForStateForTest,
  authoredProcedureOrdinal,
  nonSpellExecutableProcedureEntry,
} from "./battle-runtime.test-support.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt stat-block.multiattack
// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.MULTIATTACK
import { isDeepStrictEqual } from "node:util";
import * as Match from "effect/Match";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintList,
  quintStateRecord,
  quintVariantMappedValue,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import {
  decodeRuleCoreComponentRoute,
  type RuleCoreComponentRoutedProjection,
  withRuleCoreComponentRoute,
} from "./rule-core-component-route.test-support.ts";
import { describe, it } from "vitest";

import {
  AbilityScore,
  DieRollResult,
  Integer,
  movementFeet,
  NonNegativeInteger,
  PositiveInteger,
} from "@dnd/shared/types";
import type {
  AuthoredExecutableProcedure,
  StatBlockRecord,
} from "@dnd/surface/surface/types";

import {
  battleId,
  combatantId,
  discoverBattleActCandidates,
  initiativeScore,
  snapshotBattle,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
  type BattleCreatureInit,
} from "./index.ts";

const ruleCoreStatBlockMultiattackMbtHoles = [
  "Movement",
  "TargetChoice",
  "AttackRoll",
] as const;
type RuleCoreStatBlockMultiattackMbtHole =
  (typeof ruleCoreStatBlockMultiattackMbtHoles)[number];
const ruleCoreStatBlockMultiattackResults = [
  "init",
  "needsHoles",
  "resolved",
  "invalid",
] as const;
type RuleCoreStatBlockMultiattackResult =
  (typeof ruleCoreStatBlockMultiattackResults)[number];
const ruleCoreStatBlockMultiattackInvalidReasons = [
  "none",
  "staleSubject",
] as const;
const statBlockMultiattackMbtPhaseByTag = {
  MbtReadyToAct: "MbtReadyToAct",
  MbtActionSpent: "MbtActionSpent",
  MbtTurnEnded: "MbtTurnEnded",
  MbtDispatching: "MbtDispatching",
} as const;
type RuleCoreStatBlockMultiattackInvalidReason =
  (typeof ruleCoreStatBlockMultiattackInvalidReasons)[number];

type RuleCoreStatBlockMultiattackProjection =
  RuleCoreComponentRoutedProjection & {
    readonly attackActionAvailable: boolean;
    readonly bonusActionAvailable: boolean;
    readonly pendingDispatchProcedureRefs: readonly number[];
    readonly movementSpentFeet: number;
    readonly movementRemainingFeet: number;
    readonly multiattackContinuationOpen: boolean;
    readonly holes: readonly RuleCoreStatBlockMultiattackMbtHole[];
    readonly lastResult: RuleCoreStatBlockMultiattackResult;
    readonly lastInvalidReason: RuleCoreStatBlockMultiattackInvalidReason;
  };
type StatBlockMultiattackResourceSnapshot = Extract<
  ReturnType<typeof snapshotBattle>["turn"]["actionResources"][number],
  { readonly source: "statBlockMultiattack" }
>;
type StatBlockAttack = Extract<
  AuthoredExecutableProcedure,
  { readonly kind: "attack_roll" }
>;

const actorId = combatantId("rule-core-stat-block-actor");
const targetId = combatantId("rule-core-stat-block-target");

const primaryAttackName = "Claw";
const secondaryAttackName = "Spine";
const multiattackName = "Multiattack";
const componentOwner = "RuleCoreStatBlockMultiattackOwner";
const driverSchema = {
  init: {},
  doStartMultiattack: {},
  doMoveDuringDispatch: {},
  doRejectBonusActionDuringDispatch: {},
  doRejectOrdinaryActionDuringDispatch: {},
  doResolveProcedureZeroDispatch: {},
  doResolveProcedureOneDispatch: {},
  doEndTurnClosesDispatches: {},
  step: {},
} as const;

function createRuleCoreStatBlockMultiattackDriver() {
  return defineDriver(driverSchema, () => {
    let state = statBlockMultiattackBattle();
    let holes: readonly BattleHole[] = [];
    let lastResult: RuleCoreStatBlockMultiattackProjection["lastResult"] =
      "init";
    let lastInvalidReason: RuleCoreStatBlockMultiattackProjection["lastInvalidReason"] =
      "none";
    let bonusActionSubject = statBlockBonusActionSubject(state);

    function reset(): void {
      state = statBlockMultiattackBattle();
      holes = [];
      lastResult = "init";
      lastInvalidReason = "none";
      bonusActionSubject = statBlockBonusActionSubject(state);
    }

    function recordResult(result: BattleResolutionResult): void {
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        lastResult = "resolved";
        lastInvalidReason = "none";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastResult = "needsHoles";
        lastInvalidReason = "none";
        return;
      }
      if (!isRuleCoreStatBlockMultiattackInvalidReason(result.reason)) {
        throw new Error(
          `Unexpected rule-core Stat Block Multiattack MBT invalid reason: ${result.reason}`,
        );
      }
      lastResult = "invalid";
      lastInvalidReason = result.reason;
    }

    function resolveSubject(
      subject: BattleSubject,
      fills: readonly BattleFill[] = [],
    ): BattleResolutionResult {
      const result = resolveBattleSubject({ state, subject, fills });
      recordResult(result);
      return result;
    }

    function resolveDispatch(attackName: string): void {
      const subject = attackSubject(state, attackName);
      const target = requireHole(
        resolveBattleSubject({ state, subject, fills: [] }),
        "targetChoice",
      );
      const targetChoice = attackTargetFill(target, attackName);
      const attackRoll = requireHole(
        resolveBattleSubject({
          state,
          subject,
          fills: [targetChoice],
        }),
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
    }

    return {
      init: reset,
      doStartMultiattack: () => {
        resolveSubject(multiattackSubject(state));
      },
      doMoveDuringDispatch: () => {
        const subject = moveSubject();
        const movement = requireHole(
          resolveBattleSubject({ state, subject, fills: [] }),
          "movement",
        );
        recordResult(
          resolveBattleSubject({
            state,
            subject,
            fills: [
              movementFill(movement, {
                movementCostFeet: 5,
                provokedOpportunityAttacks: [],
              }),
            ],
          }),
        );
      },
      doRejectBonusActionDuringDispatch: () => {
        resolveSubject(bonusActionSubject);
      },
      doRejectOrdinaryActionDuringDispatch: () => {
        resolveSubject({
          tag: "action",
          actorId,
          action: "dash",
          speedKind: "walk",
        });
      },
      doResolveProcedureZeroDispatch: () => resolveDispatch(primaryAttackName),
      doResolveProcedureOneDispatch: () => resolveDispatch(secondaryAttackName),
      doEndTurnClosesDispatches: () => {
        const result = resolveBattleSubject({
          state,
          subject: { tag: "runtimeCommand", actorId, command: "endTurn" },
          fills: [],
        });
        recordResult(result);
        if (result.tag === "resolved") {
          assertNoPendingDispatchesAfterEndTurn(result.state);
        }
      },
      step: () => {},
      getState: () =>
        projectRuleCoreStatBlockMultiattackState({
          state,
          holes,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

function assertNoPendingDispatchesAfterEndTurn(state: BattleState): void {
  if (pendingStatBlockMultiattackDispatches(state).length > 0) {
    throw new Error(
      "End Turn must close pending Stat Block Multiattack dispatches.",
    );
  }
}

const statBlockMultiattackStateCheck = stateCheck(
  normalizeRuleCoreStatBlockMultiattackQuintState,
  compareRuleCoreStatBlockMultiattackState,
);

const ruleCoreStatBlockMultiattackDefaultMbtSteps = 6;

describe("rule-core Stat Block Multiattack focused MBT", () => {
  it(
    "replays Stat Block Multiattack dispatch parity through battle-runtime reducers",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "rule-core-stat-block-multiattack.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createRuleCoreStatBlockMultiattackDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(
          ruleCoreStatBlockMultiattackDefaultMbtSteps,
        ),
        stateCheck: statBlockMultiattackStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function statBlockMultiattackBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("rule-core-stat-block-multiattack"),
    combatants: [
      statBlockCreature({
        combatantId: actorId,
        initiative: 20,
        statBlock: multiattackStatBlock(),
      }),
      statBlockCreature({
        combatantId: targetId,
        initiative: 10,
        statBlock: targetStatBlock(),
      }),
    ],
  });
}

function statBlockCreature(input: {
  readonly combatantId: CombatantId;
  readonly initiative: number;
  readonly statBlock: StatBlockRecord;
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    initiative: initiativeScore(input.initiative),
    statBlock: input.statBlock,
    ammunitionStocks: [],
    conditions: [],
  };
}

function multiattackSubject(
  state: BattleState,
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "multiattack" }
> {
  const subject = discoverBattleActCandidates(state).find(
    (act) =>
      act.subject.tag === "action" && act.subject.action === "multiattack",
  )?.subject;
  if (subject?.tag !== "action" || subject.action !== "multiattack") {
    throw new Error("Expected Multiattack subject.");
  }
  return subject;
}

function statBlockBonusActionSubject(
  state: BattleState,
): Extract<
  BattleSubject,
  { readonly tag: "bonusAction"; readonly action: "statBlockActionOption" }
> {
  const subject = discoverBattleActCandidates(state).find(
    (act) =>
      act.subject.tag === "bonusAction" &&
      act.subject.action === "statBlockActionOption" &&
      act.subject.standardAction === "disengage",
  )?.subject;
  if (
    subject?.tag !== "bonusAction" ||
    subject.action !== "statBlockActionOption"
  ) {
    throw new Error("Expected Stat Block Bonus Action subject.");
  }
  return subject;
}

function attackSubject(
  state: BattleState,
  attackName: string,
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  const procedureRef = statBlockAttackProcedureRef(state, attackName);
  const subject = discoverBattleActCandidates(state).find(
    (act) =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      act.subject.procedureRef === procedureRef &&
      battleSubjectUsesOnlyStatBlockDamageComponentNotationForTest(
        act.subject,
        "rolled",
      ),
  )?.subject;
  if (subject?.tag !== "action" || subject.action !== "attack") {
    throw new Error(`Expected admitted ${attackName} subject.`);
  }
  return subject;
}

function statBlockAttackProcedureRef(state: BattleState, attackName: string) {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "statBlock") {
    throw new Error("Expected rule-core Stat Block actor execution state.");
  }
  const procedureRef = statBlockProcedurePresentationsForStateForTest(
    state,
    actorId,
  ).find(
    (candidate) => candidate.kind === "attack" && candidate.name === attackName,
  )?.procedureRef;
  if (procedureRef === undefined) {
    throw new Error(`Missing ${attackName} binding.`);
  }
  return procedureRef;
}

function moveSubject(): Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "move" }
> {
  return { tag: "runtimeCommand", actorId, command: "move" };
}

function projectRuleCoreStatBlockMultiattackState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastResult: RuleCoreStatBlockMultiattackProjection["lastResult"];
  readonly lastInvalidReason: RuleCoreStatBlockMultiattackProjection["lastInvalidReason"];
}): RuleCoreStatBlockMultiattackProjection {
  const snapshot = snapshotBattle(input.state);
  const actor = snapshot.combatants.find(
    (combatant) => combatant.combatantId === actorId,
  );
  if (actor === undefined) {
    throw new Error("Expected rule-core Stat Block actor.");
  }
  const dispatches = snapshot.turn.actionResources.filter(
    (resource): resource is StatBlockMultiattackResourceSnapshot =>
      resource.source === "statBlockMultiattack" &&
      resource.sourceOwnerId === actorId,
  );
  const stateActor = input.state.combatants.get(actorId);
  if (stateActor?.origin.kind !== "statBlock") {
    throw new Error("Expected rule-core Stat Block actor execution state.");
  }
  const attackProcedureRef = (attackName: string) => {
    const binding = statBlockProcedurePresentationsForStateForTest(
      input.state,
      actorId,
    ).find(
      (candidate) =>
        candidate.kind === "attack" && candidate.name === attackName,
    );
    if (binding === undefined)
      throw new Error(`Missing ${attackName} binding.`);
    return binding.procedureRef;
  };
  const primaryAttackRef = attackProcedureRef(primaryAttackName);
  const secondaryAttackRef = attackProcedureRef(secondaryAttackName);

  return withRuleCoreComponentRoute(componentOwner, {
    attackActionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    bonusActionAvailable:
      input.state.currentTurnResources.currentHasBonusAction,
    pendingDispatchProcedureRefs: dispatches.flatMap((resource) =>
      Match.value(resource.dispatch).pipe(
        Match.when({ kind: "listedOccurrence" }, ({ attackProcedureRef }) => [
          attackProcedureRef === primaryAttackRef
            ? 0
            : attackProcedureRef === secondaryAttackRef
              ? 1
              : unknownSyntheticProcedureRef(attackProcedureRef),
        ]),
        Match.when({ kind: "oneListedChoice" }, ({ attackProcedureRefs }) =>
          attackProcedureRefs.map((attackProcedureRef) =>
            attackProcedureRef === primaryAttackRef
              ? 0
              : attackProcedureRef === secondaryAttackRef
                ? 1
                : unknownSyntheticProcedureRef(attackProcedureRef),
          ),
        ),
        Match.exhaustive,
      ),
    ),
    movementSpentFeet: Number(actor.movement.spentFeet),
    movementRemainingFeet: Number(actor.movement.remainingFeet),
    multiattackContinuationOpen: dispatches.length > 0,
    holes: input.holes.map(projectStatBlockMultiattackHole).sort(),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  });
}

function pendingStatBlockMultiattackDispatches(
  state: BattleState,
): readonly StatBlockMultiattackResourceSnapshot[] {
  return snapshotBattle(state).turn.actionResources.filter(
    (resource): resource is StatBlockMultiattackResourceSnapshot =>
      resource.source === "statBlockMultiattack" &&
      resource.sourceOwnerId === actorId,
  );
}

function unknownSyntheticProcedureRef(procedureRef: unknown): never {
  throw new Error(
    `Unexpected synthetic Stat Block Multiattack procedure ref: ${String(procedureRef)}`,
  );
}

function movementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  value: {
    readonly movementCostFeet: number;
    readonly provokedOpportunityAttacks: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["provokedOpportunityAttacks"];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: value.provokedOpportunityAttacks,
    },
  };
}

function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  attackName: string,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  if (hole.attack === undefined) {
    throw new Error("Expected Stat Block attack target context.");
  }
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts:
      attackName === secondaryAttackName
        ? [
            {
              kind: "attackTargetDistance",
              actorId,
              targetId,
              ...hole.attack.selection,
              distanceFeet: movementFeet(5),
            },
          ]
        : [
            {
              kind: "attackTargetDistance",
              actorId,
              targetId,
              ...hole.attack.selection,
              distanceFeet: movementFeet(5),
            },
          ],
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: { readonly total: number; readonly naturalD20: number },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
    },
  };
}

function requireHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected ${kind} hole result.`);
  }
  const hole = result.holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function projectStatBlockMultiattackHole(
  hole: BattleHole,
): RuleCoreStatBlockMultiattackMbtHole {
  if (hole.kind === "movement") return "Movement";
  if (hole.kind === "targetChoice") return "TargetChoice";
  if (hole.kind === "attackRoll") return "AttackRoll";
  throw new Error(
    `Unexpected rule-core Stat Block Multiattack MBT hole: ${hole.kind}`,
  );
}

function normalizeRuleCoreStatBlockMultiattackQuintState(
  raw: unknown,
): RuleCoreStatBlockMultiattackProjection {
  const state = quintStateRecord(raw);
  const phase = statBlockMultiattackMbtPhase(state["qPhase"]);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "qProtocol",
    noInvalidReason: "none",
    decodeHole: statBlockMultiattackHoleName,
    compareHoles: (left, right) => left.localeCompare(right),
  });
  return {
    componentRoute: decodeRuleCoreComponentRoute(state["qComponentRoute"]),
    attackActionAvailable: phase === "MbtReadyToAct",
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    pendingDispatchProcedureRefs: quintList(
      state["qPendingProcedureRefs"],
      "qPendingProcedureRefs",
    ).map((raw, index) =>
      numberFromQuintInt(raw, `qPendingProcedureRefs[${index}]`),
    ),
    movementSpentFeet: numberFromQuintInt(
      state["qMovementSpentFeet"],
      "qMovementSpentFeet",
    ),
    movementRemainingFeet: numberFromQuintInt(
      state["qMovementRemainingFeet"],
      "qMovementRemainingFeet",
    ),
    multiattackContinuationOpen: phase === "MbtDispatching",
    holes: protocol.holes,
    lastResult: statBlockMultiattackResult(protocol.lastResult),
    lastInvalidReason: statBlockMultiattackInvalidReason(
      protocol.lastInvalidReason,
    ),
  };
}

function statBlockMultiattackMbtPhase(
  raw: unknown,
): "MbtReadyToAct" | "MbtActionSpent" | "MbtTurnEnded" | "MbtDispatching" {
  return quintVariantMappedValue(
    raw,
    "qPhase",
    statBlockMultiattackMbtPhaseByTag,
    "Stat Block Multiattack MBT phase",
  );
}

function compareRuleCoreStatBlockMultiattackState(
  quint: RuleCoreStatBlockMultiattackProjection,
  runtime: RuleCoreStatBlockMultiattackProjection,
): boolean {
  return isDeepStrictEqual(runtime, quint);
}

function statBlockMultiattackHoleName(
  raw: unknown,
): RuleCoreStatBlockMultiattackMbtHole {
  const name = stringFieldValue(raw, "protocol.holes entry");
  if (isRuleCoreStatBlockMultiattackMbtHole(name)) return name;
  throw new Error(
    `Unexpected rule-core Stat Block Multiattack MBT hole: ${name}`,
  );
}

function statBlockMultiattackResult(
  raw: unknown,
): RuleCoreStatBlockMultiattackResult {
  const value = stringFieldValue(raw, "protocol.result");
  if (isRuleCoreStatBlockMultiattackResult(value)) return value;
  throw new Error(
    `Unexpected rule-core Stat Block Multiattack MBT result: ${value}`,
  );
}

function statBlockMultiattackInvalidReason(
  raw: unknown,
): RuleCoreStatBlockMultiattackInvalidReason {
  const value = stringFieldValue(raw, "protocol.invalidReason");
  if (isRuleCoreStatBlockMultiattackInvalidReason(value)) return value;
  throw new Error(
    `Unexpected rule-core Stat Block Multiattack MBT invalid reason: ${value}`,
  );
}

function isRuleCoreStatBlockMultiattackMbtHole(
  value: string,
): value is RuleCoreStatBlockMultiattackMbtHole {
  return ruleCoreStatBlockMultiattackMbtHoles.some((hole) => hole === value);
}

function isRuleCoreStatBlockMultiattackResult(
  value: string,
): value is RuleCoreStatBlockMultiattackResult {
  return ruleCoreStatBlockMultiattackResults.some((result) => result === value);
}

function isRuleCoreStatBlockMultiattackInvalidReason(
  value: string,
): value is RuleCoreStatBlockMultiattackInvalidReason {
  return ruleCoreStatBlockMultiattackInvalidReasons.some(
    (reason) => reason === value,
  );
}

function stringFieldValue(raw: unknown, field: string): string {
  if (typeof raw !== "string") {
    throw new Error(`Expected string Quint field ${field}.`);
  }
  return raw;
}

function multiattackStatBlock(): StatBlockRecord {
  const base = baseStatBlockRecord("stat_block_rule_core_multiattacker");
  return {
    ...base,
    name: "Rule Core Multiattacker",
    statBlock: {
      ...base.statBlock,
      actions: [
        nonSpellExecutableProcedureEntry(1, primaryAttack()),
        nonSpellExecutableProcedureEntry(2, secondaryAttack()),
        nonSpellExecutableProcedureEntry(3, {
          kind: "multiattack",
          name: multiattackName,
          dispatches: [
            {
              procedureOrdinal: authoredProcedureOrdinal(1),
              count: { kind: "literal", value: PositiveInteger(2) },
            },
            {
              procedureOrdinal: authoredProcedureOrdinal(2),
              count: { kind: "literal", value: PositiveInteger(1) },
            },
          ],
        }),
      ],
      bonusActions: [
        nonSpellExecutableProcedureEntry(1, {
          kind: "action_option",
          name: "Nimble Escape",
          options: ["disengage"],
        }),
      ],
    },
  };
}

function targetStatBlock(): StatBlockRecord {
  const base = baseStatBlockRecord("stat_block_rule_core_target");
  return {
    ...base,
    name: "Rule Core Target",
    statBlock: {
      ...base.statBlock,
      actions: [nonSpellExecutableProcedureEntry(1, primaryAttack())],
    },
  };
}

function baseStatBlockRecord(id: string): StatBlockRecord {
  return {
    id: parseSharedStatBlockId(id),
    kind: "statBlock",
    name: id,
    challengeRating: 0.25,
    provenance: {
      kind: "synthetic-test",
      section: "focused Multiattack typed fixture",
    },
    statBlock: {
      size: "medium",
      creatureType: "humanoid",
      alignment: { order: "chaotic", morality: "neutral" },
      ac: { value: { kind: "literal", value: PositiveInteger(12) } },
      hp: { kind: "literal", value: PositiveInteger(12) },
      speeds: [
        {
          kind: "walk",
          feet: { kind: "literal", value: PositiveInteger(30) },
        },
      ],
      abilityScores: {
        cha: AbilityScore.make(10),
        con: AbilityScore.make(10),
        dex: AbilityScore.make(10),
        int: AbilityScore.make(10),
        str: AbilityScore.make(10),
        wis: AbilityScore.make(10),
      },
      initiative: { modifier: Integer(0), score: NonNegativeInteger(10) },
      passivePerception: NonNegativeInteger(10),
      communication: {
        kind: "spoken_and_understood",
        languages: { kind: "named", languages: ["Common", "Goblin"] },
      },
    },
  };
}

function primaryAttack(): StatBlockAttack {
  return {
    kind: "attack_roll",
    attackAbility: "str",
    attackBonus: { kind: "literal", value: Integer(4) },
    attackType: "melee",
    name: primaryAttackName,
    onHit: [
      {
        amount: {
          kind: "fixed",
          expr: { dice: PositiveInteger(1), dieSize: 4, flat: Integer(2) },
        },
        damageType: "slashing",
        kind: "damage",
      },
    ],
    reachFeet: PositiveInteger(5),
  };
}

function secondaryAttack(): StatBlockAttack {
  return {
    kind: "attack_roll",
    attackAbility: "dex",
    attackBonus: { kind: "literal", value: Integer(4) },
    attackType: "ranged",
    name: secondaryAttackName,
    onHit: [
      {
        amount: {
          kind: "fixed",
          expr: { dice: PositiveInteger(1), dieSize: 4, flat: Integer(2) },
        },
        damageType: "piercing",
        kind: "damage",
      },
    ],
    rangeFeet: { normal: PositiveInteger(30), long: PositiveInteger(120) },
  };
}
