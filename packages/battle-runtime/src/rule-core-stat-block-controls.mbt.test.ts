// RAW-COVERAGE: verification-owner:focused-mbt RAW-STAT-BLOCK-ACTION-LIFECYCLE-001 RAW-STAT-BLOCK-BONUS-ACTION-LIFECYCLE-001 RAW-STAT-BLOCK-LEGENDARY-ACTION-LIFECYCLE-001 RAW-STAT-BLOCK-ATTACK-PROCEDURE-001 RAW-STAT-BLOCK-DAMAGE-PROCEDURE-001 RAW-STAT-BLOCK-MULTIATTACK-001 RAW-STAT-BLOCK-LIMITED-USAGE-001
import { statBlockId as parseSharedStatBlockId } from "@dnd/shared/game-facts";
import {
  resolveBattleSubject,
  startBattleRight,
  statBlockProcedurePresentationsForStateForTest,
  authoredProcedureOrdinal,
  nonSpellExecutableProcedureEntry,
} from "./battle-runtime.test-support.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt stat-block.action-lifecycle stat-block.bonus-action-lifecycle stat-block.legendary-action-lifecycle stat-block.attack-procedure stat-block.multiattack stat-block.resource-lifecycle
// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.ACTION_LIFECYCLE BATTLE.STAT_BLOCK.BONUS_ACTION_LIFECYCLE BATTLE.STAT_BLOCK.LEGENDARY_ACTION_LIFECYCLE BATTLE.STAT_BLOCK.ATTACK_PROCEDURE BATTLE.STAT_BLOCK.MULTIATTACK BATTLE.STAT_BLOCK.RESOURCE_LIFECYCLE
import { isDeepStrictEqual } from "node:util";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintStateRecord,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import {
  decodeRuleCoreComponentRoute,
  type RuleCoreComponentRoutedProjection,
  withRuleCoreComponentRoute,
} from "./rule-core-component-route.test-support.ts";
import * as Either from "effect/Either";
import { describe, it } from "vitest";

import { DieRollResult, movementFeet } from "@dnd/shared/types";
import type {
  AuthoredExecutableProcedure,
  StatBlockRecord,
} from "@dnd/surface/surface/types";

import {
  authoredStatBlockBattleInitIssueMessage,
  battleId,
  battleCreatureInitFromStatBlock,
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
  type StatBlockBattleCombatantInit,
} from "./index.ts";

const ruleCoreStatBlockControlMbtHoles = [
  "Movement",
  "TargetChoice",
  "AttackRoll",
] as const;
type RuleCoreStatBlockControlMbtHole =
  (typeof ruleCoreStatBlockControlMbtHoles)[number];
const ruleCoreStatBlockControlResults = [
  "init",
  "needsHoles",
  "resolved",
  "invalid",
] as const;
type RuleCoreStatBlockControlResult =
  (typeof ruleCoreStatBlockControlResults)[number];
const ruleCoreStatBlockControlInvalidReasons = [
  "none",
  "staleSubject",
] as const;
type RuleCoreStatBlockControlInvalidReason =
  (typeof ruleCoreStatBlockControlInvalidReasons)[number];

type RuleCoreStatBlockControlProjection = RuleCoreComponentRoutedProjection & {
  readonly attackActionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly pendingPrimaryDispatches: number;
  readonly pendingSecondaryDispatches: number;
  readonly movementSpentFeet: number;
  readonly movementRemainingFeet: number;
  readonly multiattackContinuationOpen: boolean;
  readonly holes: readonly RuleCoreStatBlockControlMbtHole[];
  readonly lastResult: RuleCoreStatBlockControlResult;
  readonly lastInvalidReason: RuleCoreStatBlockControlInvalidReason;
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
const componentOwner = "RuleCoreStatBlockControlOwner";
const driverSchema = {
  init: {},
  doStartMultiattack: {},
  doMoveDuringDispatch: {},
  doRejectBonusActionDuringDispatch: {},
  doRejectOrdinaryActionDuringDispatch: {},
  doResolvePrimaryDispatch: {},
  doResolveSecondaryDispatch: {},
  doEndTurnClosesDispatches: {},
  step: {},
} as const;

function createRuleCoreStatBlockControlDriver() {
  return defineDriver(driverSchema, () => {
    let state = statBlockControlBattle();
    let holes: readonly BattleHole[] = [];
    let lastResult: RuleCoreStatBlockControlProjection["lastResult"] = "init";
    let lastInvalidReason: RuleCoreStatBlockControlProjection["lastInvalidReason"] =
      "none";
    let bonusActionSubject = statBlockBonusActionSubject(state);

    function reset(): void {
      state = statBlockControlBattle();
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
      if (!isRuleCoreStatBlockControlInvalidReason(result.reason)) {
        throw new Error(
          `Unexpected rule-core Stat Block control MBT invalid reason: ${result.reason}`,
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
      doResolvePrimaryDispatch: () => resolveDispatch(primaryAttackName),
      doResolveSecondaryDispatch: () => resolveDispatch(secondaryAttackName),
      doEndTurnClosesDispatches: () => {
        const result = resolveBattleSubject({
          state,
          subject: { tag: "runtimeCommand", actorId, command: "endTurn" },
          fills: [],
        });
        recordResult(result);
        if (result.tag === "resolved") {
          assertNoPendingDispatchesAfterEndTurn(result.state);
          state = statBlockControlBattle();
        }
      },
      step: () => {},
      getState: () =>
        projectRuleCoreStatBlockControlState({
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

const statBlockControlStateCheck = stateCheck(
  normalizeRuleCoreStatBlockControlQuintState,
  compareRuleCoreStatBlockControlState,
);

const ruleCoreStatBlockControlDefaultMbtSteps = 6;

describe("rule-core Stat Block control focused MBT", () => {
  it(
    "replays QCORE11 Multiattack dispatch parity through battle-runtime reducers",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "rule-core-stat-block-controls.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createRuleCoreStatBlockControlDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(ruleCoreStatBlockControlDefaultMbtSteps),
        stateCheck: statBlockControlStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function statBlockControlBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("rule-core-stat-block-controls"),
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
}): StatBlockBattleCombatantInit {
  const initialized = battleCreatureInitFromStatBlock({
    combatantId: input.combatantId,
    initiative: initiativeScore(input.initiative),
    statBlock: input.statBlock,
    ammunitionStocks: [],
    conditions: [],
  });
  if (Either.isLeft(initialized)) {
    throw new Error(authoredStatBlockBattleInitIssueMessage(initialized.left));
  }
  return initialized.right;
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
      act.subject.statBlockDamageNotation === undefined,
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

function projectRuleCoreStatBlockControlState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastResult: RuleCoreStatBlockControlProjection["lastResult"];
  readonly lastInvalidReason: RuleCoreStatBlockControlProjection["lastInvalidReason"];
}): RuleCoreStatBlockControlProjection {
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
    pendingPrimaryDispatches: dispatches.filter(
      (resource) => resource.attackProcedureRef === primaryAttackRef,
    ).length,
    pendingSecondaryDispatches: dispatches.filter(
      (resource) => resource.attackProcedureRef === secondaryAttackRef,
    ).length,
    movementSpentFeet: Number(actor.movement.spentFeet),
    movementRemainingFeet: Number(actor.movement.remainingFeet),
    multiattackContinuationOpen: dispatches.length > 0,
    holes: input.holes.map(projectStatBlockControlHole).sort(),
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

function projectStatBlockControlHole(
  hole: BattleHole,
): RuleCoreStatBlockControlMbtHole {
  if (hole.kind === "movement") return "Movement";
  if (hole.kind === "targetChoice") return "TargetChoice";
  if (hole.kind === "attackRoll") return "AttackRoll";
  throw new Error(
    `Unexpected rule-core Stat Block control MBT hole: ${hole.kind}`,
  );
}

function normalizeRuleCoreStatBlockControlQuintState(
  raw: unknown,
): RuleCoreStatBlockControlProjection {
  const state = quintStateRecord(raw);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "qProtocol",
    noInvalidReason: "none",
    decodeHole: statBlockControlHoleName,
    compareHoles: (left, right) => left.localeCompare(right),
  });
  return {
    componentRoute: decodeRuleCoreComponentRoute(state["qComponentRoute"]),
    attackActionAvailable: booleanField(state, "qAttackActionAvailable"),
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    pendingPrimaryDispatches: numberFromQuintInt(
      state["qPendingPrimaryDispatches"],
      "qPendingPrimaryDispatches",
    ),
    pendingSecondaryDispatches: numberFromQuintInt(
      state["qPendingSecondaryDispatches"],
      "qPendingSecondaryDispatches",
    ),
    movementSpentFeet: numberFromQuintInt(
      state["qMovementSpentFeet"],
      "qMovementSpentFeet",
    ),
    movementRemainingFeet: numberFromQuintInt(
      state["qMovementRemainingFeet"],
      "qMovementRemainingFeet",
    ),
    multiattackContinuationOpen: booleanField(
      state,
      "qMultiattackContinuationOpen",
    ),
    holes: protocol.holes,
    lastResult: statBlockControlResult(protocol.lastResult),
    lastInvalidReason: statBlockControlInvalidReason(
      protocol.lastInvalidReason,
    ),
  };
}

function compareRuleCoreStatBlockControlState(
  quint: RuleCoreStatBlockControlProjection,
  runtime: RuleCoreStatBlockControlProjection,
): boolean {
  return isDeepStrictEqual(runtime, quint);
}

function statBlockControlHoleName(
  raw: unknown,
): RuleCoreStatBlockControlMbtHole {
  const name = stringFieldValue(raw, "protocol.holes entry");
  if (isRuleCoreStatBlockControlMbtHole(name)) return name;
  throw new Error(`Unexpected rule-core Stat Block control MBT hole: ${name}`);
}

function statBlockControlResult(raw: unknown): RuleCoreStatBlockControlResult {
  const value = stringFieldValue(raw, "protocol.result");
  if (isRuleCoreStatBlockControlResult(value)) return value;
  throw new Error(
    `Unexpected rule-core Stat Block control MBT result: ${value}`,
  );
}

function statBlockControlInvalidReason(
  raw: unknown,
): RuleCoreStatBlockControlInvalidReason {
  const value = stringFieldValue(raw, "protocol.invalidReason");
  if (isRuleCoreStatBlockControlInvalidReason(value)) return value;
  throw new Error(
    `Unexpected rule-core Stat Block control MBT invalid reason: ${value}`,
  );
}

function isRuleCoreStatBlockControlMbtHole(
  value: string,
): value is RuleCoreStatBlockControlMbtHole {
  return ruleCoreStatBlockControlMbtHoles.some((hole) => hole === value);
}

function isRuleCoreStatBlockControlResult(
  value: string,
): value is RuleCoreStatBlockControlResult {
  return ruleCoreStatBlockControlResults.some((result) => result === value);
}

function isRuleCoreStatBlockControlInvalidReason(
  value: string,
): value is RuleCoreStatBlockControlInvalidReason {
  return ruleCoreStatBlockControlInvalidReasons.some(
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
              count: { kind: "literal", value: 2 },
            },
            {
              procedureOrdinal: authoredProcedureOrdinal(2),
              count: { kind: "literal", value: 1 },
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
      section: "QMBT6 typed fixture",
    },
    statBlock: {
      size: "medium",
      creatureType: "humanoid",
      alignment: { order: "chaotic", morality: "neutral" },
      ac: { value: { kind: "literal", value: 12 } },
      hp: { kind: "literal", value: 12 },
      speeds: [{ kind: "walk", feet: { kind: "literal", value: 30 } }],
      abilityScores: {
        cha: 10,
        con: 10,
        dex: 10,
        int: 10,
        str: 10,
        wis: 10,
      },
      initiative: { modifier: 0, score: 10 },
      passivePerception: 10,
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
    attackBonus: { kind: "literal", value: 4 },
    attackType: "melee",
    name: primaryAttackName,
    onHit: [
      {
        amount: { kind: "fixed", expr: { dice: 1, dieSize: 4, flat: 2 } },
        damageType: "slashing",
        kind: "damage",
      },
    ],
    reachFeet: 5,
  };
}

function secondaryAttack(): StatBlockAttack {
  return {
    kind: "attack_roll",
    attackAbility: "dex",
    attackBonus: { kind: "literal", value: 4 },
    attackType: "ranged",
    name: secondaryAttackName,
    onHit: [
      {
        amount: { kind: "fixed", expr: { dice: 1, dieSize: 4, flat: 2 } },
        damageType: "piercing",
        kind: "damage",
      },
    ],
    rangeFeet: { normal: 30, long: 120 },
  };
}
