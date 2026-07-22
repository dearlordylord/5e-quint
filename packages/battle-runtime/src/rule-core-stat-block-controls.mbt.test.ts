import { statBlockId as parseSharedStatBlockId } from "@dnd/shared/game-facts";
import {
  resolveBattleSubject,
  statBlockProcedurePresentationsForStateForTest,
} from "./battle-runtime-test-support.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt stat-block.attack-control
// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.ATTACK_CONTROL
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
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  decodeRuleCoreComponentRoute,
  type RuleCoreComponentRoutedProjection,
  withRuleCoreComponentRoute,
} from "./rule-core-component-route.ts";
import { Either } from "effect";
import { battleStatBlockCombatantSource } from "./stat-block-combatant-admission.ts";
import { describe, it } from "vitest";

import { Hp, DieRollResult, movementFeet } from "@dnd/shared/types";
import type { StatBlockRecord } from "@dnd/surface/surface/types";

import {
  battleId,
  combatantId,
  discoverBattleActCandidates,
  initiativeScore,
  snapshotBattle,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
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
type StatBlockAttack = NonNullable<
  NonNullable<StatBlockRecord["statBlock"]["actions"]>["attacks"]
>[0];

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
        displayName: "Rule Core Multiattacker",
        initiative: 20,
        statBlock: multiattackStatBlock(),
      }),
      statBlockCreature({
        combatantId: targetId,
        displayName: "Rule Core Target",
        initiative: 10,
        statBlock: targetStatBlock(),
      }),
    ],
  });
}

function startBattleRight(
  input: Parameters<typeof startBattle>[0],
): BattleState {
  const result = startBattle(input);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right.state;
}

function statBlockCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly statBlock: StatBlockRecord;
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "statBlock",
      source: Either.getOrThrow(
        battleStatBlockCombatantSource(input.statBlock),
      ),
      currentHp: Hp(12),
      tempHp: Hp(0),
    },
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
    bonusActionAvailable: snapshot.turn.bonusActionAvailable,
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
              kind: "attackTargetInRangedRange",
              actorId,
              targetId,
              ...hole.attack.selection,
              rangeBand: "normal",
            },
          ]
        : [
            {
              kind: "attackTargetInMeleeReach",
              actorId,
              targetId,
              ...hole.attack.selection,
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
      displayName: "Rule Core Multiattacker",
      actions: {
        attacks: [primaryAttack(), secondaryAttack()],
        multiattacks: [
          {
            name: multiattackName,
            dispatches: [
              { name: primaryAttackName, count: { kind: "literal", value: 2 } },
              {
                name: secondaryAttackName,
                count: { kind: "literal", value: 1 },
              },
            ],
          },
        ],
      },
      bonusActions: {
        actionOptions: [{ name: "Nimble Escape", options: ["disengage"] }],
      },
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
      displayName: "Rule Core Target",
      actions: { attacks: [primaryAttack()] },
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
      kind: "srd-5.2.1",
      section: "QMBT6 typed fixture",
    },
    statBlock: {
      abilityScores: {
        cha: 10,
        con: 10,
        dex: 10,
        int: 10,
        str: 10,
        wis: 10,
      },
      ac: { kind: "literal", value: 12 },
      actions: { attacks: [primaryAttack()] },
      creatureType: "humanoid",
      displayName: id,
      hp: { kind: "literal", value: 12 },
      initiativeModifier: 0,
      languages: ["Common"],
      size: "medium",
      speeds: [{ kind: "walk", feet: { kind: "literal", value: 30 } }],
    },
  };
}

function primaryAttack(): StatBlockAttack {
  return {
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
