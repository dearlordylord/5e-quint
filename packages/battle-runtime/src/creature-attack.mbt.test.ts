import { statBlockId as parseSharedStatBlockId } from "@dnd/shared/game-facts";
import { battleProcedureExecutionRefForTest } from "./battle-runtime.test-support.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.ATTACK.MINIMAL_RESOLUTION
import { describe, expect, it } from "vitest";
import { DieRollResult } from "@dnd/shared/types";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import { Schema } from "effect";

import {
  BattleFillSchema,
  battleReducerStartRouteEvent,
  discoverBattleActCandidates,
  endTurn,
  snapshotBattle,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleSubject,
} from "./index.ts";
import {
  MBT_TEST_TIMEOUT_MS,
  decodeReducerRoute,
  defineDriver,
  focusedMbtMaxSteps,
  mbtPickSchemas,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintField,
  quintStateRecord,
  run,
  stateCheck,
  type ReducerRouteEvent,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import type {
  BattleActDiscoveryCandidate,
  BattleCreatureAttackDamageRollHole,
} from "./battle-state-execution.ts";
import {
  resolveCreatureAttack,
  type CreatureAttackState,
} from "./battle-reducer/creature-attack.test-support.ts";
import { CREATURE_ATTACK_DAMAGE_HOLE_ID } from "./battle-reducer/creature-attack.ts";
import { battleReducerRouteEventsForDiscoveredAct } from "./battle-reducer/reducer-route.ts";
import {
  resolveBattleSubject,
  battleId,
  combatantId,
  statBlockCreatureInit,
  startBattleRight,
} from "./battle-runtime.test-support.ts";

const INITIAL_HP = 20;
const ATTACKER_A_ID = combatantId("creature-attack-a");
const ATTACKER_B_ID = combatantId("creature-attack-b");

const initialState: CreatureAttackState = {
  creatureAHp: INITIAL_HP,
  creatureBHp: INITIAL_HP,
};
type CreatureAttackRouteState = CreatureAttackState & {
  readonly route: readonly ReducerRouteEvent[];
};

const driverSchema = {
  init: {},
  doAttackerAAttacks: {
    damage: mbtPickSchemas.int,
    hit: mbtPickSchemas.bool,
  },
  doAttackerBAttacks: {
    damage: mbtPickSchemas.int,
    hit: mbtPickSchemas.bool,
  },
  step: {},
} as const;

function createCreatureAttackDriver() {
  return createCreatureAttackDriverWithProjection((state) => state);
}

function createCreatureAttackRouteDriver() {
  return defineDriver<typeof driverSchema, CreatureAttackRouteState>(
    driverSchema,
    () => {
      let state = startCreatureAttackBattle();
      let route: readonly ReducerRouteEvent[] = [];
      return {
        init: () => {
          state = startCreatureAttackBattle();
          route = [battleReducerStartRouteEvent()];
        },
        doAttackerAAttacks: ({ damage, hit }) => {
          const result = resolveCreatureAttackThroughPublicReducer({
            state,
            route,
            actorId: ATTACKER_A_ID,
            targetId: ATTACKER_B_ID,
            damage,
            hit,
          });
          state = result.state;
          route = result.route;
        },
        doAttackerBAttacks: ({ damage, hit }) => {
          const result = resolveCreatureAttackThroughPublicReducer({
            state,
            route,
            actorId: ATTACKER_B_ID,
            targetId: ATTACKER_A_ID,
            damage,
            hit,
          });
          state = result.state;
          route = result.route;
        },
        step: () => {},
        getState: () => ({
          ...projectCreatureAttackBattleState(state),
          route,
        }),
      };
    },
  );
}

function createCreatureAttackDriverWithProjection<State>(
  projectState: (
    state: CreatureAttackState,
    route: readonly ReducerRouteEvent[],
  ) => State,
) {
  return defineDriver<typeof driverSchema, State>(driverSchema, () => {
    let state: CreatureAttackState = initialState;
    let route: readonly ReducerRouteEvent[] = [];
    return {
      init: () => {
        state = initialState;
        route = [];
      },
      doAttackerAAttacks: ({ damage, hit }) => {
        state = resolveCreatureAttack(state, "attackerA", { damage, hit });
      },
      doAttackerBAttacks: ({ damage, hit }) => {
        state = resolveCreatureAttack(state, "attackerB", { damage, hit });
      },
      step: () => {},
      getState: () => projectState(state, route),
    };
  });
}

const creatureAttackStateCheck = stateCheck(
  normalizeCreatureAttackQuintState,
  compareCreatureAttackState,
);
const creatureAttackRouteStateCheck = stateCheck(
  normalizeCreatureAttackRouteQuintState,
  compareCreatureAttackState,
);

describe("creature-attack public reducer boundaries", () => {
  it("rejects a damage fill after a missed attack roll", () => {
    const state = startCreatureAttackBattle();
    const subject = creatureAttackSubject(ATTACKER_A_ID, ATTACKER_B_ID);
    const discovered = discoverCreatureAttackAct(state, subject);
    const attackRollHole = expectCreatureAttackRollHole(
      discovered.initialHoles[0],
    );
    const missFill = creatureAttackRollFill(attackRollHole, false);
    const staleDamageFill = creatureAttackDamageRollFill(
      {
        holeId: CREATURE_ATTACK_DAMAGE_HOLE_ID,
        creatureAttack: subject,
      },
      1,
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [missFill, staleDamageFill],
    });

    expect(result).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });

  it("round-trips the damage source on enemy-zero-HP range facts", () => {
    const fill = {
      kind: "targetSpatialFacts",
      holeId: CREATURE_ATTACK_DAMAGE_HOLE_ID,
      spatialFacts: [
        {
          kind: "enemyZeroHitPointTemporaryHitPointsBeneficiaryWithinRange",
          beneficiaryId: ATTACKER_A_ID,
          damageSourceId: ATTACKER_B_ID,
          targetId: ATTACKER_A_ID,
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("synthetic_zero_hp_reward"),
          ),
          rangeFeet: 10,
        },
      ],
    } as const;

    const decoded = Schema.decodeUnknownSync(BattleFillSchema)(fill);
    expect(Schema.encodeSync(BattleFillSchema)(decoded)).toEqual(fill);
  });

  it("does not expose an unsupported attack bonus for creature attacks", () => {
    const state = startCreatureAttackBattle();
    const subject = creatureAttackSubject(ATTACKER_A_ID, ATTACKER_B_ID);
    const discovered = discoverCreatureAttackAct(state, subject);
    const attackRollHole = expectCreatureAttackRollHole(
      discovered.initialHoles[0],
    );

    expect("attackBonus" in attackRollHole).toBe(false);
  });

  it("discovers creature attacks only for the current actor", () => {
    const state = startCreatureAttackBattle();

    expect(
      discoverBattleActCandidates(state).some(
        (act) =>
          act.subject.tag === "creatureAttack" &&
          act.subject.actorId === ATTACKER_B_ID,
      ),
    ).toBe(false);
  });

  it("does not discover or resolve creature attacks for terminal zero-HP pilot actors", () => {
    const state = startCreatureAttackBattle({ attackerACurrentHp: 0 });
    const subject = creatureAttackSubject(ATTACKER_A_ID, ATTACKER_B_ID);

    expect(
      discoverBattleActCandidates(state).some(
        (act) =>
          act.subject.tag === "creatureAttack" &&
          act.subject.actorId === ATTACKER_A_ID,
      ),
    ).toBe(false);
    expect(resolveBattleSubject({ state, subject, fills: [] })).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
  });

  it("rejects a forged off-turn creature attack subject", () => {
    const state = startCreatureAttackBattle();

    const result = resolveBattleSubject({
      state,
      subject: creatureAttackSubject(ATTACKER_B_ID, ATTACKER_A_ID),
      fills: [],
    });

    expect(result).toMatchObject({ tag: "invalid", reason: "wrongActor" });
  });

  it("rejects forged creature attacks for non-pilot actors", () => {
    const state = startCreatureAttackBattle({
      attackerAStatBlock: creatureAttackStatBlockWithActions(
        "creature_attack_a_with_actions",
      ),
    });

    const result = resolveBattleSubject({
      state,
      subject: creatureAttackSubject(ATTACKER_A_ID, ATTACKER_B_ID),
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "unsupportedSubject",
    });
  });
});

describe("creature-attack minimal MBT parity", () => {
  it(
    "matches TS reducer against bounded random MBT traces",
    async () => {
      await run({
        spec: mbtSpecPath(import.meta.dirname, "creature-attack.mbt.qnt"),
        init: "init",
        step: "step",
        driver: createCreatureAttackDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(6),
        stateCheck: creatureAttackStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes minimal creature attacks through the shared reducer-route vocabulary",
    async () => {
      await run({
        spec: mbtSpecPath(import.meta.dirname, "creature-attack.route.mbt.qnt"),
        init: "init",
        step: "step",
        driver: createCreatureAttackRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(6),
        stateCheck: creatureAttackRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function normalizeCreatureAttackQuintState(raw: unknown): CreatureAttackState {
  const state = quintStateRecord(raw);
  return {
    creatureAHp: numberFromQuintInt(state["qCreatureAHp"], "qCreatureAHp"),
    creatureBHp: numberFromQuintInt(state["qCreatureBHp"], "qCreatureBHp"),
  };
}

function normalizeCreatureAttackRouteQuintState(
  raw: unknown,
): CreatureAttackRouteState {
  const state = quintStateRecord(raw);
  return {
    ...normalizeCreatureAttackQuintState(raw),
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function compareCreatureAttackState(
  runtime: CreatureAttackState,
  quint: CreatureAttackState,
): boolean {
  expect(runtime).toEqual(quint);
  return true;
}

function startCreatureAttackBattle(input?: {
  readonly attackerAStatBlock?: StatBlockRecord;
  readonly attackerBStatBlock?: StatBlockRecord;
  readonly attackerACurrentHp?: number;
  readonly attackerBCurrentHp?: number;
}): BattleState {
  return startBattleRight({
    battleId: battleId("battle:creature-attack"),
    combatants: [
      statBlockCreatureInit({
        combatantId: ATTACKER_A_ID,
        displayName: "Creature A",
        statBlock:
          input?.attackerAStatBlock ??
          creatureAttackStatBlock("creature_attack_a"),
        initiative: 20,
        currentHp: input?.attackerACurrentHp ?? INITIAL_HP,
      }),
      statBlockCreatureInit({
        combatantId: ATTACKER_B_ID,
        displayName: "Creature B",
        statBlock:
          input?.attackerBStatBlock ??
          creatureAttackStatBlock("creature_attack_b"),
        initiative: 10,
        currentHp: input?.attackerBCurrentHp ?? INITIAL_HP,
      }),
    ],
  });
}

function creatureAttackStatBlock(id: string): StatBlockRecord {
  return {
    id: parseSharedStatBlockId(id),
    kind: "statBlock",
    name: id,
    challengeRating: 0,
    provenance: {
      kind: "synthetic-test",
      section: "Task 67 minimal creature attack fixture",
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
      ac: { kind: "literal", value: 10 },
      creatureType: "humanoid",
      displayName: id,
      hp: { kind: "literal", value: INITIAL_HP },
      initiativeModifier: 0,
      languages: ["Common"],
      size: "medium",
      speeds: [{ kind: "walk", feet: { kind: "literal", value: 30 } }],
    },
  };
}

function creatureAttackStatBlockWithActions(id: string): StatBlockRecord {
  const statBlock = creatureAttackStatBlock(id);
  return {
    ...statBlock,
    statBlock: {
      ...statBlock.statBlock,
      actions: {
        attacks: [
          {
            attackAbility: "str",
            attackType: "melee",
            attackBonus: { kind: "literal", value: 2 },
            reachFeet: 5,
            onHit: [
              {
                kind: "damage",
                damageType: "bludgeoning",
                amount: {
                  kind: "fixed",
                  expr: { dice: 1, dieSize: 4 },
                  static: 2,
                },
              },
            ],
            name: "Synthetic Strike",
          },
        ],
      },
    },
  };
}

function projectCreatureAttackBattleState(
  state: BattleState,
): CreatureAttackState {
  return {
    creatureAHp: Number(state.combatants.get(ATTACKER_A_ID)?.hp ?? 0),
    creatureBHp: Number(state.combatants.get(ATTACKER_B_ID)?.hp ?? 0),
  };
}

function resolveCreatureAttackThroughPublicReducer(input: {
  readonly state: BattleState;
  readonly route: readonly ReducerRouteEvent[];
  readonly actorId: typeof ATTACKER_A_ID | typeof ATTACKER_B_ID;
  readonly targetId: typeof ATTACKER_A_ID | typeof ATTACKER_B_ID;
  readonly damage: number;
  readonly hit: boolean;
}): {
  readonly state: BattleState;
  readonly route: readonly ReducerRouteEvent[];
} {
  const state = prepareCreatureAttackActorTurn(input.state, input.actorId);
  const subject = creatureAttackSubject(input.actorId, input.targetId);
  const discovered = discoverCreatureAttackAct(state, subject);
  const attackRollHole = expectCreatureAttackRollHole(
    discovered.initialHoles[0],
  );
  const attackRollFill = creatureAttackRollFill(attackRollHole, input.hit);
  const afterAttackRoll = resolveBattleSubject({
    state,
    subject,
    fills: [attackRollFill],
  });
  const routeAfterAttackRoll = [
    ...input.route,
    ...(discovered.routeEvents ?? []),
    ...(afterAttackRoll.routeEvents ?? []),
  ];
  if (!input.hit) {
    if (afterAttackRoll.tag !== "resolved") {
      throw new Error("Expected missed Creature Attack to resolve.");
    }
    return { state: afterAttackRoll.state, route: routeAfterAttackRoll };
  }
  if (afterAttackRoll.tag !== "needsHoles") {
    throw new Error("Expected hit Creature Attack to request damage.");
  }
  const damageHole = expectCreatureAttackDamageHole(afterAttackRoll.holes[0]);
  const damageFill = creatureAttackDamageRollFill(damageHole, input.damage);
  const afterDamage = resolveBattleSubject({
    state,
    subject,
    fills: [attackRollFill, damageFill],
  });
  if (afterDamage.tag !== "resolved") {
    throw new Error("Expected damaged Creature Attack to resolve.");
  }
  return {
    state: afterDamage.state,
    route: [...routeAfterAttackRoll, ...(afterDamage.routeEvents ?? [])],
  };
}

function prepareCreatureAttackActorTurn(
  state: BattleState,
  actorId: typeof ATTACKER_A_ID | typeof ATTACKER_B_ID,
): BattleState {
  let currentState = state;
  for (let turnCount = 0; turnCount <= 2; turnCount += 1) {
    if (
      discoverBattleActCandidates(currentState).some(
        (act) =>
          act.subject.tag === "creatureAttack" &&
          act.subject.actorId === actorId,
      )
    ) {
      return currentState;
    }
    const result = endTurn({
      state: currentState,
      actorId: snapshotBattle(currentState).currentActorId,
    });
    if (result.tag !== "resolved") {
      throw new Error(
        "Expected public endTurn to rotate Creature Attack actor.",
      );
    }
    currentState = result.state;
  }
  throw new Error("Expected Creature Attack actor to become discoverable.");
}

function creatureAttackSubject(
  actorId: typeof ATTACKER_A_ID | typeof ATTACKER_B_ID,
  targetId: typeof ATTACKER_A_ID | typeof ATTACKER_B_ID,
): Extract<BattleSubject, { readonly tag: "creatureAttack" }> {
  return {
    tag: "creatureAttack",
    actorId,
    targetId,
  };
}

function discoverCreatureAttackAct(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "creatureAttack" }>,
): BattleActDiscoveryCandidate {
  const discovered = discoverBattleActCandidates(state).find(
    (act) =>
      act.subject.tag === "creatureAttack" &&
      act.subject.actorId === subject.actorId &&
      act.subject.targetId === subject.targetId,
  );
  if (discovered === undefined) {
    throw new Error("Expected public Creature Attack act discovery.");
  }
  const routeEvents = battleReducerRouteEventsForDiscoveredAct(
    state,
    discovered,
  );
  return routeEvents === undefined
    ? discovered
    : { ...discovered, routeEvents };
}

function expectCreatureAttackRollHole(
  hole: BattleHole | undefined,
): Extract<BattleHole, { readonly kind: "attackRoll" }> {
  if (hole === undefined || hole.kind !== "attackRoll") {
    throw new Error("Expected public Creature Attack Attack Roll hole.");
  }
  return hole;
}

function expectCreatureAttackDamageHole(
  hole: BattleHole | undefined,
): BattleCreatureAttackDamageRollHole {
  if (
    hole === undefined ||
    hole.kind !== "rolledDice" ||
    !("creatureAttack" in hole)
  ) {
    throw new Error("Expected public Creature Attack damage hole.");
  }
  return hole;
}

function creatureAttackRollFill(
  attackRollHole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  hit: boolean,
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: attackRollHole.holeId,
    value: {
      total: hit ? 99 : 0,
      naturalD20: DieRollResult(hit ? 20 : 1),
    },
  };
}

function creatureAttackDamageRollFill(
  damageHole: {
    readonly holeId: BattleHole["holeId"];
    readonly creatureAttack: {
      readonly actorId: typeof ATTACKER_A_ID | typeof ATTACKER_B_ID;
      readonly targetId: typeof ATTACKER_A_ID | typeof ATTACKER_B_ID;
    };
  },
  damage: number,
): Extract<
  BattleFill,
  { readonly kind: "creatureAttackZeroDamage" | "rolledDice" }
> {
  if (damage === 0) {
    return {
      kind: "creatureAttackZeroDamage",
      holeId: damageHole.holeId,
      creatureAttack: {
        actorId: damageHole.creatureAttack.actorId,
        targetId: damageHole.creatureAttack.targetId,
      },
    };
  }
  return {
    kind: "rolledDice",
    holeId: damageHole.holeId,
    value: [{ results: [DieRollResult(damage)] }],
  };
}
