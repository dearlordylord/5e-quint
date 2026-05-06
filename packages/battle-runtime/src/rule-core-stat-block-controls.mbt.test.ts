// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt stat-block.attack-control
import * as path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, it } from "vitest";

import { Hp, DieRollResult, movementFeet } from "@dnd/shared/types";
import type { StatBlockRecord } from "@dnd/surface/surface/types";

import {
  battleCombatantSide,
  battleId,
  combatantId,
  initiativeScore,
  resolveBattleSubject,
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

type RuleCoreStatBlockControlProjection = {
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
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

const primaryAttackName = "Claw";
const secondaryAttackName = "Spine";
const multiattackName = "Multiattack";
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

    function reset(): void {
      state = statBlockControlBattle();
      holes = [];
      lastResult = "init";
      lastInvalidReason = "none";
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
      const subject = attackSubject(attackName);
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
        resolveSubject(multiattackSubject());
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
        resolveSubject({
          tag: "bonusAction",
          actorId,
          action: "statBlockActionOption",
          optionName: "Nimble Escape",
          standardAction: "disengage",
        });
      },
      doRejectOrdinaryActionDuringDispatch: () => {
        resolveSubject({ tag: "action", actorId, action: "dash" });
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
  it("replays QCORE11 Multiattack dispatch parity through battle-runtime reducers", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../rule-core-stat-block-controls.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createRuleCoreStatBlockControlDriver(),
      backend: "typescript",
      seed: process.env["QUINT_SEED"],
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(
        process.env["MBT_STEPS"] ?? ruleCoreStatBlockControlDefaultMbtSteps,
      ),
      stateCheck: statBlockControlStateCheck,
    });
  }, 120_000);
});

function statBlockControlBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("rule-core-stat-block-controls"),
    combatants: [
      statBlockCreature({
        combatantId: actorId,
        displayName: "Rule Core Multiattacker",
        initiative: 20,
        side: partySide,
        statBlock: multiattackStatBlock(),
      }),
      statBlockCreature({
        combatantId: targetId,
        displayName: "Rule Core Target",
        initiative: 10,
        side: oppositionSide,
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
  return result.right;
}

function statBlockCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: ReturnType<typeof battleCombatantSide>;
  readonly statBlock: StatBlockRecord;
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "statBlock",
      statBlock: input.statBlock,
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
    },
  };
}

function multiattackSubject(): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "multiattack" }
> {
  return {
    tag: "action",
    actorId,
    action: "multiattack",
    multiattackName,
  };
}

function attackSubject(
  attackName: string,
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  return {
    tag: "action",
    actorId,
    action: "attack",
    attackName,
  };
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

  return {
    attackActionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    bonusActionAvailable: snapshot.turn.bonusActionAvailable,
    pendingPrimaryDispatches: dispatches.filter(
      (resource) => resource.attackPart.name === primaryAttackName,
    ).length,
    pendingSecondaryDispatches: dispatches.filter(
      (resource) => resource.attackPart.name === secondaryAttackName,
    ).length,
    movementSpentFeet: Number(actor.movement.spentFeet),
    movementRemainingFeet: Number(actor.movement.remainingFeet),
    multiattackContinuationOpen: dispatches.length > 0,
    holes: input.holes.map(projectStatBlockControlHole).sort(),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
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
    readonly provokedOpportunityAttacks: readonly {
      readonly reactorId: CombatantId;
      readonly attackName: string;
    }[];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: value.provokedOpportunityAttacks,
    },
  };
}

function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  attackName: string,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
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
              attackName,
              rangeBand: "normal",
            },
          ]
        : [
            {
              kind: "attackTargetInMeleeReach",
              actorId,
              targetId,
              attackName,
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
  return {
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
    holes: quintHoleSet(state["qHoles"]).map(statBlockControlHoleName).sort(),
    lastResult: statBlockControlResult(state["qLastResult"]),
    lastInvalidReason: statBlockControlInvalidReason(
      state["qLastInvalidReason"],
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
  const name = stringFieldValue(raw, "qHoles entry");
  if (isRuleCoreStatBlockControlMbtHole(name)) return name;
  throw new Error(`Unexpected rule-core Stat Block control MBT hole: ${name}`);
}

function statBlockControlResult(raw: unknown): RuleCoreStatBlockControlResult {
  const value = stringFieldValue(raw, "qLastResult");
  if (isRuleCoreStatBlockControlResult(value)) return value;
  throw new Error(
    `Unexpected rule-core Stat Block control MBT result: ${value}`,
  );
}

function statBlockControlInvalidReason(
  raw: unknown,
): RuleCoreStatBlockControlInvalidReason {
  const value = stringFieldValue(raw, "qLastInvalidReason");
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

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  const value = state[field];
  if (typeof value !== "boolean") {
    throw new Error(`Expected boolean Quint field ${field}.`);
  }
  return value;
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw !== "bigint") {
    throw new Error(`Expected bigint Quint field ${field}.`);
  }
  return Number(raw);
}

function quintHoleSet(raw: unknown): readonly unknown[] {
  if (raw instanceof Set) return [...raw];
  if (Array.isArray(raw)) return raw;
  throw new Error("Expected Quint qHoles field to be a Set.");
}

function stringFieldValue(raw: unknown, field: string): string {
  if (typeof raw !== "string") {
    throw new Error(`Expected string Quint field ${field}.`);
  }
  return raw;
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint state record.");
  }
  return raw as Readonly<Record<string, unknown>>;
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
    id,
    kind: "statBlock",
    name: id,
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
