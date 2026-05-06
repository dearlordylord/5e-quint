import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
  Hp,
  movementFeet,
} from "@dnd/shared/types";

import {
  battleCombatantSide,
  battleId,
  characterId,
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
  type CombatantId,
} from "./index.ts";

const ruleCoreMovementMbtHoles = ["Movement"] as const;
type RuleCoreMovementMbtHole = (typeof ruleCoreMovementMbtHoles)[number];
const ruleCoreMovementOutcomes = [
  "init",
  "needsHoles",
  "resolved",
  "invalidFill",
] as const;
type RuleCoreMovementOutcome = (typeof ruleCoreMovementOutcomes)[number];

type RuleCoreMovementProjection = {
  readonly movementSpentFeet: number;
  readonly movementRemainingFeet: number;
  readonly prone: boolean;
  readonly holes: readonly RuleCoreMovementMbtHole[];
  readonly lastOutcome: RuleCoreMovementOutcome;
};

const actorId = combatantId("rule-core-mover");
const observerId = combatantId("rule-core-observer");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");
const movementSpeedFeet = 30;
const movementFillCostFeet = 10;
const movementOverspendCostFeet = 35;

const driverSchema = {
  init: {},
  doDiscoverMovement: {},
  doSpendMovement: {},
  doRejectMovementOverspend: {},
  doStandFromProne: {},
  step: {},
} as const;

function createRuleCoreMovementDriver() {
  return defineDriver(driverSchema, () => {
    let state = ruleCoreMovementBattle();
    let holes: readonly BattleHole[] = [];
    let lastOutcome: RuleCoreMovementProjection["lastOutcome"] = "init";

    function reset(): void {
      state = ruleCoreMovementBattle();
      holes = [];
      lastOutcome = "init";
    }

    function recordResult(result: BattleResolutionResult): void {
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        lastOutcome = "resolved";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastOutcome = "needsHoles";
        return;
      }
      if (result.reason !== "invalidFill") {
        throw new Error(
          `Unexpected rule-core Movement MBT invalid reason: ${result.reason}`,
        );
      }
      lastOutcome = result.reason;
    }

    function submitMovement(costFeet: number): void {
      const hole = requireMovementHole(holes);
      recordResult(
        resolveBattleSubject({
          state,
          subject: { tag: "runtimeCommand", actorId, command: "move" },
          fills: [movementFill(hole, costFeet)],
        }),
      );
    }

    return {
      init: reset,
      doDiscoverMovement: () => {
        recordResult(
          resolveBattleSubject({
            state,
            subject: { tag: "runtimeCommand", actorId, command: "move" },
            fills: [],
          }),
        );
      },
      doSpendMovement: () => submitMovement(movementFillCostFeet),
      doRejectMovementOverspend: () =>
        submitMovement(movementOverspendCostFeet),
      doStandFromProne: () => {
        recordResult(
          resolveBattleSubject({
            state,
            subject: {
              tag: "runtimeCommand",
              actorId,
              command: "standFromProne",
            },
            fills: [],
          }),
        );
      },
      step: () => {},
      getState: () =>
        projectRuleCoreMovementState({
          state,
          holes,
          lastOutcome,
        }),
    };
  });
}

const movementStateCheck = stateCheck(
  normalizeRuleCoreMovementQuintState,
  compareRuleCoreMovementState,
);

describe("rule-core Movement focused MBT", () => {
  it("replays QCORE7 Movement and Stand from Prone against battle-runtime reducers", async () => {
    await run({
      spec: path.resolve(import.meta.dirname, "../rule-core-movement.mbt.qnt"),
      init: "init",
      step: "step",
      driver: createRuleCoreMovementDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 4),
      stateCheck: movementStateCheck,
    });
  }, 120_000);
});

function ruleCoreMovementBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("rule-core-movement"),
    combatants: [
      movementCreature({
        combatantId: actorId,
        characterId: "rule-core-mover-character",
        displayName: "Rule Core Mover",
        initiative: 20,
        side: partySide,
        prone: true,
      }),
      movementCreature({
        combatantId: observerId,
        characterId: "rule-core-observer-character",
        displayName: "Rule Core Observer",
        initiative: 10,
        side: oppositionSide,
        prone: false,
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

function movementCreature(input: {
  readonly combatantId: CombatantId;
  readonly characterId: string;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly prone: boolean;
}): BattleCreatureInit {
  const conditions = input.prone ? (["prone"] as const) : undefined;
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(input.characterId),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 1 }],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(movementSpeedFeet) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      ...(conditions === undefined ? {} : { conditions }),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(3),
        attackBonus: attackBonus(5),
        damageAbilityModifier: abilityModifier(3),
      },
    },
  };
}

function projectRuleCoreMovementState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastOutcome: RuleCoreMovementProjection["lastOutcome"];
}): RuleCoreMovementProjection {
  const snapshot = snapshotBattle(input.state);
  const actor = snapshot.combatants.find(
    (combatant) => combatant.combatantId === actorId,
  );
  if (actor === undefined) {
    throw new Error("Expected rule-core Movement actor in battle snapshot.");
  }
  return {
    movementSpentFeet: actor.movement.spentFeet,
    movementRemainingFeet: actor.movement.remainingFeet,
    prone: actor.conditions.includes("prone"),
    holes: input.holes.map(projectMovementHole),
    lastOutcome: input.lastOutcome,
  };
}

function movementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  movementCostFeet: number,
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      movementCostFeet: movementFeet(movementCostFeet),
      provokedOpportunityAttacks: [],
    },
  };
}

function requireMovementHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "movement" }> {
  const hole = holes.find((candidate) => candidate.kind === "movement");
  if (hole === undefined) {
    throw new Error("Expected Movement hole.");
  }
  return hole;
}

function projectMovementHole(hole: BattleHole): RuleCoreMovementMbtHole {
  if (hole.kind !== "movement") {
    throw new Error(`Unexpected rule-core Movement MBT hole: ${hole.kind}`);
  }
  return "Movement";
}

function normalizeRuleCoreMovementQuintState(
  raw: unknown,
): RuleCoreMovementProjection {
  const state = quintStateRecord(raw);
  const movementSpentFeet = numberFromQuintInt(
    state["qMovementSpentFeet"],
    "qMovementSpentFeet",
  );
  return {
    movementSpentFeet,
    movementRemainingFeet: movementRemainingFeetFromSpent(movementSpentFeet),
    prone: booleanField(state, "qProne"),
    holes: quintHoleSet(state["qHoles"]).map(movementHoleName),
    lastOutcome: movementOutcome(state["qLastOutcome"]),
  };
}

function compareRuleCoreMovementState(
  quint: RuleCoreMovementProjection,
  runtime: RuleCoreMovementProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw error;
  }
  return true;
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  const value = state[field];
  if (typeof value === "boolean") return value;
  throw new Error(`Expected Quint boolean field ${field}.`);
}

function quintHoleSet(raw: unknown): readonly unknown[] {
  if (raw instanceof Set) return [...raw];
  throw new Error("Expected Quint qHoles field to be a Set.");
}

function movementHoleName(raw: unknown): RuleCoreMovementMbtHole {
  const tag = quintVariantTag(raw);
  if (isRuleCoreMovementMbtHole(tag)) return tag;
  throw new Error(`Unknown Quint rule-core Movement hole variant: ${tag}`);
}

function isRuleCoreMovementMbtHole(raw: unknown): raw is RuleCoreMovementMbtHole {
  return ruleCoreMovementMbtHoles.some((hole) => hole === raw);
}

function movementRemainingFeetFromSpent(movementSpentFeet: number): number {
  return movementSpeedFeet - movementSpentFeet;
}

function movementOutcome(raw: unknown): RuleCoreMovementOutcome {
  if (isRuleCoreMovementOutcome(raw)) return raw;
  throw new Error(
    `Unknown Quint rule-core Movement outcome: ${String(raw)}.`,
  );
}

function isRuleCoreMovementOutcome(raw: unknown): raw is RuleCoreMovementOutcome {
  return ruleCoreMovementOutcomes.some((outcome) => outcome === raw);
}

function quintVariantTag(raw: unknown): string {
  if (isRecord(raw) && typeof raw["tag"] === "string") return raw["tag"];
  if (typeof raw === "string") return raw;
  throw new Error(`Expected Quint variant tag, got ${String(raw)}.`);
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(raw)) {
    throw new Error("Expected Quint state to be an object.");
  }
  return raw;
}

function isRecord(raw: unknown): raw is Readonly<Record<string, unknown>> {
  return typeof raw === "object" && raw !== null;
}
