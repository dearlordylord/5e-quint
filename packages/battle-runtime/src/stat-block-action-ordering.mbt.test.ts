import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING

import { isDeepStrictEqual } from "node:util";

import { describe, expect, it } from "vitest";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import srdGoblinWarriorInput from "../../surface/content/stat_block_goblin_warrior.json";
import { decodeStatBlockRecordSync } from "../../surface/src/surface/schema.ts";
import type { CreatureNamedAttackRoll } from "../../surface/src/surface/types.ts";

import {
  ATTACK_ROLL_REQUIRED_BEFORE_DAMAGE_MESSAGE,
  ATTACK_TARGET_REQUIRED_BEFORE_ROLL_OR_DAMAGE_MESSAGE,
} from "./battle-reducer/attack-main.ts";
import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  decodeReducerRoute,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintField,
  quintStateRecord,
  quintVariantTag,
  reducerRouteDiscoverBattleActs,
  reducerRouteResolveBattleSubject,
  reducerRouteStartBattle,
  run,
  stateCheck,
  type ReducerRouteEvent,
  type ReducerRouteFill,
  type ReducerRouteOwnerGroup,
} from "./battle-runtime-mbt-driver-kit.ts";
import { attackDamageByTypeEntries } from "./battle-reducer/damage-helpers.ts";
import { statBlockAttackActionOptions } from "./battle-reducer/statblock.ts";
import { battleExecutionScopeOrdinal } from "./identity.ts";
import { statBlockExecutionAdmissionCohort } from "./stat-block-execution.ts";
import {
  DieRollResult,
  attackRollFill,
  attackTargetFill,
  battleId,
  battleProcedureExecutionRefForTest,
  characterSeed,
  damageRollFillWithGroups,
  discoverBattleActCandidates,
  discoverBattleActs,
  endTurn,
  fighterId,
  goblinId,
  monsterMultiattackStatBlock,
  monsterResourceStatBlock,
  requireHole,
  requireNeedsHoles,
  requireResolved,
  resolveBattleSubject,
  startBattleSessionRight,
  statBlockCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleRuntimeSession,
  type BattleState,
  type BattleSubject,
} from "./battle-runtime-test-support.ts";
import type { AttackDamageRider } from "./battle-state-execution.ts";
import type { BattleResolutionResult } from "./index.ts";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import type { StatBlockDamageNotation } from "./battle-action-options.ts";

type StatBlockActionOrderingStage =
  | "actSelection"
  | "targetChoice"
  | "attackRoll"
  | "damageDice"
  | "rechargeRoll"
  | "resolved";
type StatBlockActionOrderingHole =
  | "targetChoice"
  | "attackRoll"
  | "rolledDice"
  | "statBlockRechargeRoll";
type StatBlockActionOrderingError =
  | ""
  | "statBlockTargetChoiceRequired"
  | "statBlockAttackRollRequired"
  | "statBlockRechargeRollRequired";
type StatBlockActionOrderingProjection = {
  readonly stage: StatBlockActionOrderingStage;
  readonly holes: readonly StatBlockActionOrderingHole[];
  readonly lastResult: "init" | "needsHoles" | "resolved" | "invalid";
  readonly orderingError: StatBlockActionOrderingError;
  readonly multiattackDispatchesAvailable: number;
  readonly rechargeActionAvailable: boolean;
  readonly usesRolledDamage: boolean;
};
type StatBlockActionOrderingRouteProjection =
  StatBlockActionOrderingProjection & {
    readonly route: readonly ReducerRouteEvent[];
  };

function requireMultiattackSubject(
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
    throw new Error("Expected a discovered Multiattack subject.");
  }
  return subject;
}

const rechargeAttackName = "Cinder Breath";
const multiattackDispatchAttackName = "Scimitar";
const srdGoblinWarrior = decodeStatBlockRecordSync(srdGoblinWarriorInput);

function admittedAttackOption(
  attack: CreatureNamedAttackRoll,
  damageNotation: StatBlockDamageNotation,
) {
  const statBlock: StatBlockRecord = {
    ...srdGoblinWarrior,
    statBlock: {
      ...srdGoblinWarrior.statBlock,
      actions: { attacks: [attack] },
    },
  };
  const admission = statBlockExecutionAdmissionCohort(
    battleId("stat-block-action-ordering-isolated-admission"),
    goblinId,
    [statBlock],
    battleExecutionScopeOrdinal(0),
  ).admissions[0];
  if (admission === undefined) {
    throw new Error("Expected the driver Stat Block admission.");
  }
  return statBlockAttackActionOptions(admission.execution).find(
    (option) => option.damageNotation === damageNotation,
  );
}

const driverSchema = {
  init: {},
  doStartMultiattackControl: {},
  doDiscoverRolledActionAttackControl: {},
  doDiscoverStaticActionAttackControl: {},
  doRejectAttackRollBeforeTargetChoice: {},
  doFillTargetChoice: {},
  doRejectDamageBeforeAttackRoll: {},
  doFillAttackRollMiss: {},
  doFillRolledAttackRollHit: {},
  doFillStaticAttackRollHit: {},
  doFillDamageDice: {},
  doSpendRechargeGatedRolledAttack: {},
  doFillRechargeRoll: {},
  step: {},
} as const;

function createStatBlockActionOrderingDriver() {
  return createStatBlockActionOrderingDriverWithProjection(
    (projection) => projection,
  );
}

function createStatBlockActionOrderingRouteDriver() {
  return createStatBlockActionOrderingDriverWithProjection(
    (projection, route) => ({ ...projection, route }),
  );
}

function createStatBlockActionOrderingDriverWithProjection<State>(
  projectState: (
    projection: StatBlockActionOrderingProjection,
    route: readonly ReducerRouteEvent[],
  ) => State,
) {
  return defineDriver<typeof driverSchema, State>(driverSchema, () => {
    let session = statBlockActionOrderingBattle(monsterResourceStatBlock());
    let subject: BattleSubject = requireDiscoveredStatBlockAttackSubject(
      session,
      rechargeAttackName,
      "rolled",
    );
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = [];
    let route: readonly ReducerRouteEvent[] = [];
    let stage: StatBlockActionOrderingProjection["stage"] = "actSelection";
    let lastResult: StatBlockActionOrderingProjection["lastResult"] = "init";
    let orderingError: StatBlockActionOrderingProjection["orderingError"] = "";
    let multiattackDispatchesAvailable = 0;
    let rechargeActionAvailable = true;
    let usesRolledDamage = true;

    function reset(): void {
      session = statBlockActionOrderingBattle(monsterResourceStatBlock());
      subject = requireDiscoveredStatBlockAttackSubject(
        session,
        rechargeAttackName,
        "rolled",
      );
      fills = [];
      holes = [];
      route = [reducerRouteStartBattle("battleActionEconomy")];
      stage = "actSelection";
      lastResult = "init";
      orderingError = "";
      multiattackDispatchesAvailable = 0;
      rechargeActionAvailable = true;
      usesRolledDamage = true;
    }

    function discoverAttack(input: {
      readonly battle: BattleRuntimeSession;
      readonly attackSubject: Extract<
        BattleSubject,
        { readonly tag: "action"; readonly action: "attack" }
      >;
      readonly rolledDamage: boolean;
      readonly dispatchesAvailable: number;
    }): void {
      session = input.battle;
      const admittedSubject = discoverBattleActCandidates(session.state).find(
        (act) =>
          act.subject.tag === "action" &&
          act.subject.action === "attack" &&
          act.subject.procedureRef === input.attackSubject.procedureRef &&
          act.subject.statBlockDamageNotation ===
            input.attackSubject.statBlockDamageNotation,
      )?.subject;
      if (
        admittedSubject?.tag !== "action" ||
        admittedSubject.action !== "attack"
      ) {
        throw new Error("Expected admitted Stat Block attack subject.");
      }
      subject = admittedSubject;
      fills = [];
      holes = requireNeedsHoles(
        resolveBattleSubject({ state: session.state, subject, fills: [] }),
      ).holes;
      route = [
        ...route,
        reducerRouteDiscoverBattleActs({
          subject: "statBlockAction",
          holes,
          owner: "battleStatBlockAction",
        }),
      ];
      stage = "targetChoice";
      lastResult = "needsHoles";
      orderingError = "";
      multiattackDispatchesAvailable = input.dispatchesAvailable;
      rechargeActionAvailable = statBlockAttackAvailable(
        session,
        rechargeAttackName,
      );
      usesRolledDamage = input.rolledDamage;
    }

    function recordAccepted(
      result: BattleResolutionResult,
      nextStage: StatBlockActionOrderingProjection["stage"],
      routeFill: ReducerRouteFill,
      routeOwner: ReducerRouteOwnerGroup,
    ): void {
      const routeHoles =
        result.tag === "needsHoles"
          ? result.holes
          : result.tag === "resolved"
            ? []
            : holes;
      if (result.tag === "needsHoles") {
        session = battleRuntimeSessionForTest({
          ...session,
          state: result.state,
        });
        holes = result.holes;
        route = [
          ...route,
          reducerRouteResolveBattleSubject({
            subject: "statBlockAction",
            fill: routeFill,
            holes: routeHoles,
            owner: routeOwner,
          }),
        ];
        stage = nextStage;
        lastResult = "needsHoles";
        orderingError = "";
        return;
      }
      if (result.tag === "resolved") {
        session = battleRuntimeSessionForTest({
          ...session,
          state: result.state,
        });
        holes = [];
        route = [
          ...route,
          reducerRouteResolveBattleSubject({
            subject: "statBlockAction",
            fill: routeFill,
            holes: routeHoles,
            owner: routeOwner,
          }),
        ];
        stage = nextStage;
        lastResult = "resolved";
        orderingError = "";
        rechargeActionAvailable = statBlockAttackAvailable(
          session,
          rechargeAttackName,
        );
        return;
      }
      throw new Error(`Expected accepted Stat Block ordering result.`);
    }

    function recordOrderingRejection(
      result: BattleResolutionResult,
      expectedOrderingError: Exclude<
        StatBlockActionOrderingProjection["orderingError"],
        ""
      >,
      expectedMessage: string,
      routeFill: ReducerRouteFill,
    ): void {
      if (
        result.tag !== "invalid" ||
        result.reason !== "invalidFill" ||
        result.message !== expectedMessage
      ) {
        throw new Error(
          `Expected Stat Block ordering rejection: ${expectedMessage}`,
        );
      }
      route = [
        ...route,
        reducerRouteResolveBattleSubject({
          subject: "statBlockAction",
          fill: routeFill,
          holes,
          owner: "battleHoleFrontier",
        }),
      ];
      lastResult = "invalid";
      orderingError = expectedOrderingError;
    }

    function targetChoiceFill(): BattleFill {
      return attackTargetFill(
        requireHoleFromList(holes, "targetChoice"),
        goblinId,
        fighterId,
      );
    }

    function attackRollFillForCurrentHole(input: {
      readonly total: number;
      readonly naturalD20: number;
    }): BattleFill {
      return attackRollFill(requireHoleFromList(holes, "attackRoll"), {
        total: input.total,
        naturalD20: DieRollResult(input.naturalD20),
      });
    }

    return {
      init: reset,
      doStartMultiattackControl: () => {
        const battle = statBlockActionOrderingBattle(
          monsterMultiattackStatBlock({ scimitarCount: 2, shortbowCount: 1 }),
        );
        const multiattack = requireResolved(
          resolveBattleSubject({
            state: battle.state,
            subject: requireMultiattackSubject(battle.state),
            fills: [],
          }),
        );
        const multiattackSession = battleRuntimeSessionForTest({
          ...battle,
          state: multiattack.state,
        });
        discoverAttack({
          battle: multiattackSession,
          attackSubject: requireDiscoveredStatBlockAttackSubject(
            multiattackSession,
            multiattackDispatchAttackName,
            "rolled",
          ),
          rolledDamage: true,
          dispatchesAvailable: 2,
        });
      },
      doDiscoverRolledActionAttackControl: () => {
        const battle = statBlockActionOrderingBattle(
          monsterResourceStatBlock(),
        );
        discoverAttack({
          battle,
          attackSubject: requireDiscoveredStatBlockAttackSubject(
            battle,
            rechargeAttackName,
            "rolled",
          ),
          rolledDamage: true,
          dispatchesAvailable: 0,
        });
      },
      doDiscoverStaticActionAttackControl: () => {
        const battle = statBlockActionOrderingBattle(srdGoblinWarrior);
        discoverAttack({
          battle,
          attackSubject: requireDiscoveredStatBlockAttackSubject(
            battle,
            multiattackDispatchAttackName,
            "static",
          ),
          rolledDamage: false,
          dispatchesAvailable: 0,
        });
      },
      doRejectAttackRollBeforeTargetChoice: () => {
        const targetChoice = targetChoiceFill();
        const attackRollHole = requireHole(
          resolveBattleSubject({
            state: session.state,
            subject,
            fills: [targetChoice],
          }),
          "attackRoll",
        );
        recordOrderingRejection(
          resolveBattleSubject({
            state: session.state,
            subject,
            fills: [
              attackRollFill(attackRollHole, {
                total: 20,
                naturalD20: DieRollResult(12),
              }),
            ],
          }),
          "statBlockTargetChoiceRequired",
          ATTACK_TARGET_REQUIRED_BEFORE_ROLL_OR_DAMAGE_MESSAGE,
          "attackRoll",
        );
      },
      doFillTargetChoice: () => {
        fills = [targetChoiceFill()];
        recordAccepted(
          resolveBattleSubject({ state: session.state, subject, fills }),
          "attackRoll",
          "targetChoice",
          "battleTargetSelection",
        );
      },
      doRejectDamageBeforeAttackRoll: () => {
        const attackRoll = attackRollFillForCurrentHole({
          total: 20,
          naturalD20: 12,
        });
        const damageHole = requireHole(
          resolveBattleSubject({
            state: session.state,
            subject,
            fills: [...fills, attackRoll],
          }),
          "rolledDice",
        );
        recordOrderingRejection(
          resolveBattleSubject({
            state: session.state,
            subject,
            fills: [...fills, damageRollFillWithGroups(damageHole, [[3]])],
          }),
          "statBlockAttackRollRequired",
          ATTACK_ROLL_REQUIRED_BEFORE_DAMAGE_MESSAGE,
          "rolledDice",
        );
      },
      doFillAttackRollMiss: () => {
        fills = [
          ...fills,
          attackRollFillForCurrentHole({ total: 1, naturalD20: 1 }),
        ];
        recordAccepted(
          resolveBattleSubject({ state: session.state, subject, fills }),
          "resolved",
          "attackRoll",
          "battleAttackRoll",
        );
      },
      doFillRolledAttackRollHit: () => {
        fills = [
          ...fills,
          attackRollFillForCurrentHole({ total: 20, naturalD20: 12 }),
        ];
        recordAccepted(
          resolveBattleSubject({ state: session.state, subject, fills }),
          "damageDice",
          "attackRoll",
          "battleAttackRoll",
        );
      },
      doFillStaticAttackRollHit: () => {
        fills = [
          ...fills,
          attackRollFillForCurrentHole({ total: 20, naturalD20: 12 }),
        ];
        recordAccepted(
          resolveBattleSubject({ state: session.state, subject, fills }),
          "resolved",
          "attackRoll",
          "battleHitPoint",
        );
      },
      doFillDamageDice: () => {
        fills = [
          ...fills,
          damageRollFillWithGroups(requireHoleFromList(holes, "rolledDice"), [
            [3],
          ]),
        ];
        recordAccepted(
          resolveBattleSubject({ state: session.state, subject, fills }),
          "resolved",
          "rolledDice",
          "battleHitPoint",
        );
      },
      doSpendRechargeGatedRolledAttack: () => {
        const spent = spendRechargeAttack();
        const fighterTurn = requireResolved(
          endTurn({ state: spent.state, actorId: goblinId }),
        );
        const fighterTurnSession = battleRuntimeSessionForTest({
          ...spent,
          state: fighterTurn.state,
        });
        const rechargeRequest = requireNeedsHoles(
          endTurn({ state: fighterTurnSession.state, actorId: fighterId }),
        );
        session = fighterTurnSession;
        subject = {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "endTurn",
        };
        fills = [];
        holes = rechargeRequest.holes;
        route = [
          ...route,
          reducerRouteDiscoverBattleActs({
            subject: "statBlockAction",
            holes,
            owner: "battleStatBlockAction",
          }),
        ];
        stage = "rechargeRoll";
        lastResult = "needsHoles";
        orderingError = "";
        multiattackDispatchesAvailable = 0;
        rechargeActionAvailable = false;
        usesRolledDamage = true;
      },
      doFillRechargeRoll: () => {
        const rechargeHole = requireHoleFromList(
          holes,
          "statBlockRechargeRoll",
        );
        const [rechargeTarget] = rechargeHole.rechargeTargets;
        if (rechargeTarget === undefined) {
          throw new Error("Expected a Stat Block Recharge target.");
        }
        recordAccepted(
          resolveBattleSubject({
            state: session.state,
            subject,
            fills: [
              {
                kind: "statBlockRechargeRoll",
                holeId: rechargeHole.holeId,
                value: [
                  {
                    target: rechargeTarget,
                    roll: DieRollResult(5),
                  },
                ],
              },
            ],
          }),
          "resolved",
          "statBlockRechargeRoll",
          "battleStatBlockAction",
        );
      },
      step: () => {},
      getState: () => {
        const projection = projectStatBlockActionOrderingState({
          holes,
          stage,
          lastResult,
          orderingError,
          multiattackDispatchesAvailable,
          rechargeActionAvailable,
          usesRolledDamage,
        });
        return projectState(projection, route);
      },
    };
  });
}

const statBlockActionOrderingStateCheck = stateCheck(
  normalizeStatBlockActionOrderingQuintState,
  (
    spec: StatBlockActionOrderingProjection,
    impl: StatBlockActionOrderingProjection,
  ) => isDeepStrictEqual(impl, spec),
);

const statBlockActionOrderingRouteStateCheck = stateCheck(
  normalizeStatBlockActionOrderingRouteQuintState,
  (
    spec: StatBlockActionOrderingRouteProjection,
    impl: StatBlockActionOrderingRouteProjection,
  ) => isDeepStrictEqual(impl, spec),
);

describe("Stat Block action ordering MBT", () => {
  it("keeps static Stat Block base damage while rolling damage riders", () => {
    const scimitar = srdGoblinWarrior.statBlock.actions?.attacks?.find(
      (attack) => attack.name === multiattackDispatchAttackName,
    );
    if (scimitar === undefined) {
      throw new Error("Expected SRD Goblin Warrior Scimitar.");
    }
    const attack = admittedAttackOption(scimitar, "static");
    if (attack === undefined) {
      throw new Error("Expected static SRD Goblin Warrior Scimitar.");
    }
    const rider = {
      attackerId: goblinId,
      procedureRef: battleProcedureExecutionRefForTest(
        "synthetic_static_stat_block_damage_rider",
      ),
      optional: false,
      damage: { dice: 1, dieSize: 4, damageType: "fire" },
    } satisfies AttackDamageRider;
    const damageRoll = damageRollFillWithGroups(
      {
        kind: "rolledDice",
        holeId: holeId("battle:test:static-stat-block-damage-rider"),
      },
      [[4]],
    );
    if (damageRoll.kind !== "rolledDice") {
      throw new Error("Expected rolled damage fill.");
    }

    expect(
      attackDamageByTypeEntries(
        undefined,
        attack,
        attack.procedureRef,
        damageRoll,
        false,
        undefined,
        [rider],
      ),
    ).toEqual([
      { damageType: "slashing", amount: 5 },
      { damageType: "fire", amount: 4 },
    ]);
  });

  it("rejects static Stat Block attack options without static damage notation", () => {
    const scimitar = srdGoblinWarrior.statBlock.actions?.attacks?.find(
      (attack) => attack.name === multiattackDispatchAttackName,
    );
    if (scimitar === undefined) {
      throw new Error("Expected SRD Goblin Warrior Scimitar.");
    }
    const [firstEffect, ...remainingEffects] = scimitar.onHit;
    const rolledOnlyOnHit: CreatureNamedAttackRoll["onHit"] = [
      statBlockAttackEffectWithoutStaticDamage(firstEffect),
      ...remainingEffects.map(statBlockAttackEffectWithoutStaticDamage),
    ];
    const rolledOnlyScimitar = {
      ...scimitar,
      onHit: rolledOnlyOnHit,
    };

    expect(admittedAttackOption(rolledOnlyScimitar, "static")).toBeUndefined();
  });

  it("discovers SRD static Stat Block damage notation as an attack subject", () => {
    const session = statBlockActionOrderingBattle(srdGoblinWarrior);
    const subject = requireDiscoveredStatBlockAttackSubject(
      session,
      multiattackDispatchAttackName,
      "static",
    );
    expect(subject).toMatchObject({
      tag: "action",
      action: "attack",
      statBlockDamageNotation: "static",
    });
    expect(subject.procedureRef).toBeDefined();
    expect("attackName" in subject).toBe(false);
  });

  it("resolves SRD static Stat Block damage notation without a rolled-dice frontier", () => {
    const session = statBlockActionOrderingBattle(srdGoblinWarrior);
    const subject = requireDiscoveredStatBlockAttackSubject(
      session,
      multiattackDispatchAttackName,
      "static",
    );
    const targetHole = requireHole(
      resolveBattleSubject({ state: session.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = attackTargetFill(targetHole, goblinId, fighterId);
    const attackRollHole = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [targetChoice],
      }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attackRollHole, {
      total: 20,
      naturalD20: 12,
      rollMode: "advantage",
    });
    const resolved = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
    );
    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(5);
  });

  it(
    "projects Stat Block control, attack, damage, and recharge frontiers",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-stat-block-action-ordering.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createStatBlockActionOrderingDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(4),
        stateCheck: statBlockActionOrderingStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes Stat Block action ordering through the shared reducer surface",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-stat-block-action-ordering.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createStatBlockActionOrderingRouteDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(4),
        stateCheck: statBlockActionOrderingRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function statBlockAttackEffectWithoutStaticDamage(
  effect: CreatureNamedAttackRoll["onHit"][number],
): CreatureNamedAttackRoll["onHit"][number] {
  return (effect.kind === "damage" ||
    effect.kind === "conditional_bonus_damage") &&
    effect.amount.kind === "fixed"
    ? {
        ...effect,
        amount: {
          kind: "fixed" as const,
          expr: effect.amount.expr,
        },
      }
    : effect;
}

function statBlockActionOrderingBattle(
  statBlock: StatBlockRecord,
): BattleRuntimeSession {
  const session = startBattleSessionRight({
    battleId: battleId("stat-block-action-ordering"),
    combatants: [
      characterSeed({ initiative: 20 }),
      statBlockCreatureInit({
        initiative: 10,
        statBlock,
      }),
    ],
  });
  const goblinTurn = requireResolved(
    endTurn({
      state: session.state,
      actorId: fighterId,
    }),
  );
  return battleRuntimeSessionForTest({ ...session, state: goblinTurn.state });
}

function requireDiscoveredStatBlockAttackSubject(
  session: BattleRuntimeSession,
  attackName: string,
  statBlockDamageNotation: StatBlockDamageNotation,
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  const act = discoverBattleActs(session).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack" &&
      candidate.subject.actorId === goblinId &&
      candidate.summary.includes(attackName) &&
      (candidate.subject.statBlockDamageNotation ?? "rolled") ===
        statBlockDamageNotation,
  );
  if (
    act === undefined ||
    act.subject.tag !== "action" ||
    act.subject.action !== "attack"
  ) {
    throw new Error(
      `Expected discovered ${statBlockDamageNotation} Stat Block attack subject.`,
    );
  }
  return act.subject;
}

function spendRechargeAttack(): BattleRuntimeSession {
  const battle = statBlockActionOrderingBattle(monsterResourceStatBlock());
  const subject = requireDiscoveredStatBlockAttackSubject(
    battle,
    rechargeAttackName,
    "rolled",
  );
  const target = requireHole(
    resolveBattleSubject({ state: battle.state, subject, fills: [] }),
    "targetChoice",
  );
  const targetChoice = attackTargetFill(target, goblinId, fighterId);
  const attackRoll = requireHole(
    resolveBattleSubject({
      state: battle.state,
      subject,
      fills: [targetChoice],
    }),
    "attackRoll",
  );
  const attackRollResult = attackRollFill(attackRoll, {
    total: 20,
    naturalD20: DieRollResult(12),
  });
  const damage = requireHole(
    resolveBattleSubject({
      state: battle.state,
      subject,
      fills: [targetChoice, attackRollResult],
    }),
    "rolledDice",
  );
  const spent = requireResolved(
    resolveBattleSubject({
      state: battle.state,
      subject,
      fills: [
        targetChoice,
        attackRollResult,
        damageRollFillWithGroups(damage, [[3]]),
      ],
    }),
  ).state;
  const spentSession = battleRuntimeSessionForTest({ ...battle, state: spent });
  if (statBlockAttackAvailable(spentSession, rechargeAttackName)) {
    throw new Error("Expected spent recharge Stat Block attack to be hidden.");
  }
  return spentSession;
}

function statBlockAttackAvailable(
  session: BattleRuntimeSession,
  attackName: string,
): boolean {
  return discoverBattleActs(session).some(
    (act) =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      act.subject.actorId === goblinId &&
      act.summary.includes(attackName),
  );
}

function requireHoleFromList<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function projectStatBlockActionOrderingState(input: {
  readonly holes: readonly BattleHole[];
  readonly stage: StatBlockActionOrderingProjection["stage"];
  readonly lastResult: StatBlockActionOrderingProjection["lastResult"];
  readonly orderingError: StatBlockActionOrderingProjection["orderingError"];
  readonly multiattackDispatchesAvailable: number;
  readonly rechargeActionAvailable: boolean;
  readonly usesRolledDamage: boolean;
}): StatBlockActionOrderingProjection {
  return {
    stage: input.stage,
    holes: input.holes.map(statBlockActionOrderingHoleFromRuntime).sort(),
    lastResult: input.lastResult,
    orderingError: input.orderingError,
    multiattackDispatchesAvailable: input.multiattackDispatchesAvailable,
    rechargeActionAvailable: input.rechargeActionAvailable,
    usesRolledDamage: input.usesRolledDamage,
  };
}

function normalizeStatBlockActionOrderingQuintState(
  raw: unknown,
): StatBlockActionOrderingProjection {
  const state = quintStateRecord(raw);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "qProtocol",
    noInvalidReason: "",
    decodeHole: statBlockActionOrderingHole,
    compareHoles: (left, right) => left.localeCompare(right),
  });
  return {
    stage: statBlockActionOrderingStage(state["qStage"]),
    holes: protocol.holes,
    lastResult: protocol.lastResult,
    orderingError: statBlockActionOrderingError(state["qLastOrderingError"]),
    multiattackDispatchesAvailable: numberFromQuintInt(
      state["qMultiattackDispatchesAvailable"],
      "qMultiattackDispatchesAvailable",
    ),
    rechargeActionAvailable: booleanField(state, "qRechargeActionAvailable"),
    usesRolledDamage: booleanField(state, "qUsesRolledDamage"),
  };
}

function normalizeStatBlockActionOrderingRouteQuintState(
  raw: unknown,
): StatBlockActionOrderingRouteProjection {
  const state = quintStateRecord(raw);
  return {
    ...normalizeStatBlockActionOrderingQuintState(raw),
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function statBlockActionOrderingStage(
  raw: unknown,
): StatBlockActionOrderingStage {
  const tag = quintVariantTag(raw);
  if (tag === "StatBlockActSelectionStage") return "actSelection";
  if (tag === "StatBlockAttackTargetChoiceStage") return "targetChoice";
  if (tag === "StatBlockAttackRollStage") return "attackRoll";
  if (tag === "StatBlockDamageDiceStage") return "damageDice";
  if (tag === "StatBlockRechargeRollStage") return "rechargeRoll";
  if (tag === "StatBlockResolvedStage") return "resolved";
  throw new Error(`Unknown Stat Block action ordering stage: ${tag}`);
}

function statBlockActionOrderingHole(
  raw: unknown,
): StatBlockActionOrderingHole {
  const tag = quintVariantTag(raw);
  if (tag === "TargetChoiceHoleKind") return "targetChoice";
  if (tag === "AttackRollHoleKind") return "attackRoll";
  if (tag === "RolledDiceHoleKind") return "rolledDice";
  if (tag === "StatBlockRechargeRollHoleKind") {
    return "statBlockRechargeRoll";
  }
  throw new Error(`Unknown Stat Block action ordering hole: ${tag}`);
}

function statBlockActionOrderingHoleFromRuntime(
  hole: Pick<BattleHole, "kind">,
): StatBlockActionOrderingHole {
  if (hole.kind === "targetChoice") return "targetChoice";
  if (hole.kind === "attackRoll") return "attackRoll";
  if (hole.kind === "rolledDice") return "rolledDice";
  if (hole.kind === "statBlockRechargeRoll") return "statBlockRechargeRoll";
  throw new Error(`Unexpected Stat Block action ordering hole: ${hole.kind}`);
}

function statBlockActionOrderingError(
  raw: unknown,
): StatBlockActionOrderingError {
  if (
    raw === "" ||
    raw === "statBlockTargetChoiceRequired" ||
    raw === "statBlockAttackRollRequired" ||
    raw === "statBlockRechargeRollRequired"
  ) {
    return raw;
  }
  throw new Error(`Unknown Stat Block action ordering error: ${String(raw)}.`);
}
