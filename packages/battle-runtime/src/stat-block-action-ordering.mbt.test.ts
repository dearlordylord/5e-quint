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
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintSet,
  quintStateRecord,
  quintVariantTag,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import { attackDamageByTypeEntries } from "./battle-reducer/damage-helpers.ts";
import { supportedStatBlockAttackActionOption } from "./battle-reducer/statblock.ts";
import {
  DieRollResult,
  attackRollFill,
  attackTargetFill,
  battleId,
  characterSeed,
  damageRollFillWithGroups,
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
  startBattleRight,
  statBlockCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleSubject,
} from "./battle-runtime-test-support.ts";
import type { AttackDamageRider } from "./battle-reducer.ts";
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

const rechargeAttackName = "Cinder Breath";
const multiattackDispatchAttackName = "Scimitar";
const multiattackName = "Multiattack";
const srdGoblinWarrior = decodeStatBlockRecordSync(srdGoblinWarriorInput);

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
  return defineDriver(driverSchema, () => {
    let state = statBlockActionOrderingBattle(monsterResourceStatBlock());
    let subject: BattleSubject = statBlockAttackSubject(rechargeAttackName);
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = [];
    let stage: StatBlockActionOrderingProjection["stage"] = "actSelection";
    let lastResult: StatBlockActionOrderingProjection["lastResult"] = "init";
    let orderingError: StatBlockActionOrderingProjection["orderingError"] = "";
    let multiattackDispatchesAvailable = 0;
    let rechargeActionAvailable = true;
    let usesRolledDamage = true;

    function reset(): void {
      state = statBlockActionOrderingBattle(monsterResourceStatBlock());
      subject = statBlockAttackSubject(rechargeAttackName);
      fills = [];
      holes = [];
      stage = "actSelection";
      lastResult = "init";
      orderingError = "";
      multiattackDispatchesAvailable = 0;
      rechargeActionAvailable = true;
      usesRolledDamage = true;
    }

    function discoverAttack(input: {
      readonly battle: BattleState;
      readonly attackSubject: typeof subject;
      readonly rolledDamage: boolean;
      readonly dispatchesAvailable: number;
    }): void {
      state = input.battle;
      subject = input.attackSubject;
      fills = [];
      holes = requireNeedsHoles(
        resolveBattleSubject({ state, subject, fills: [] }),
      ).holes;
      stage = "targetChoice";
      lastResult = "needsHoles";
      orderingError = "";
      multiattackDispatchesAvailable = input.dispatchesAvailable;
      rechargeActionAvailable = statBlockAttackAvailable(state, rechargeAttackName);
      usesRolledDamage = input.rolledDamage;
    }

    function recordAccepted(
      result: BattleResolutionResult,
      nextStage: StatBlockActionOrderingProjection["stage"],
    ): void {
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        stage = nextStage;
        lastResult = "needsHoles";
        orderingError = "";
        return;
      }
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        stage = nextStage;
        lastResult = "resolved";
        orderingError = "";
        rechargeActionAvailable = statBlockAttackAvailable(
          state,
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
      lastResult = "invalid";
      orderingError = expectedOrderingError;
    }

    function targetChoiceFill(): BattleFill {
      return attackTargetFill(
        requireHoleFromList(holes, "targetChoice"),
        goblinId,
        fighterId,
        statBlockAttackName(subject),
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
            state: battle,
            subject: {
              tag: "action",
              actorId: goblinId,
              action: "multiattack",
              multiattackName,
            },
            fills: [],
          }),
        ).state;
        discoverAttack({
          battle: multiattack,
          attackSubject: statBlockAttackSubject(multiattackDispatchAttackName),
          rolledDamage: true,
          dispatchesAvailable: 2,
        });
      },
      doDiscoverRolledActionAttackControl: () => {
        discoverAttack({
          battle: statBlockActionOrderingBattle(monsterResourceStatBlock()),
          attackSubject: statBlockAttackSubject(rechargeAttackName),
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
            state,
            subject,
            fills: [targetChoice],
          }),
          "attackRoll",
        );
        recordOrderingRejection(
          resolveBattleSubject({
            state,
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
        );
      },
      doFillTargetChoice: () => {
        fills = [targetChoiceFill()];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "attackRoll",
        );
      },
      doRejectDamageBeforeAttackRoll: () => {
        const attackRoll = attackRollFillForCurrentHole({
          total: 20,
          naturalD20: 12,
        });
        const damageHole = requireHole(
          resolveBattleSubject({
            state,
            subject,
            fills: [...fills, attackRoll],
          }),
          "rolledDice",
        );
        recordOrderingRejection(
          resolveBattleSubject({
            state,
            subject,
            fills: [...fills, damageRollFillWithGroups(damageHole, [[3]])],
          }),
          "statBlockAttackRollRequired",
          ATTACK_ROLL_REQUIRED_BEFORE_DAMAGE_MESSAGE,
        );
      },
      doFillAttackRollMiss: () => {
        fills = [
          ...fills,
          attackRollFillForCurrentHole({ total: 1, naturalD20: 1 }),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
        );
      },
      doFillRolledAttackRollHit: () => {
        fills = [
          ...fills,
          attackRollFillForCurrentHole({ total: 20, naturalD20: 12 }),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "damageDice",
        );
      },
      doFillStaticAttackRollHit: () => {
        fills = [
          ...fills,
          attackRollFillForCurrentHole({ total: 20, naturalD20: 12 }),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
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
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
        );
      },
      doSpendRechargeGatedRolledAttack: () => {
        const spent = spendRechargeAttack();
        const fighterTurn = requireResolved(
          endTurn({ state: spent, actorId: goblinId }),
        ).state;
        const rechargeRequest = requireNeedsHoles(
          endTurn({ state: fighterTurn, actorId: fighterId }),
        );
        state = fighterTurn;
        subject = {
          tag: "runtimeCommand",
          actorId: fighterId,
          command: "endTurn",
        };
        fills = [];
        holes = rechargeRequest.holes;
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
        recordAccepted(
          resolveBattleSubject({
            state,
            subject,
            fills: [
              {
                kind: "statBlockRechargeRoll",
                holeId: rechargeHole.holeId,
                value: [
                  {
                    target: { section: "actions", name: rechargeAttackName },
                    roll: DieRollResult(5),
                  },
                ],
              },
            ],
          }),
          "resolved",
        );
      },
      step: () => {},
      getState: () =>
        projectStatBlockActionOrderingState({
          holes,
          stage,
          lastResult,
          orderingError,
          multiattackDispatchesAvailable,
          rechargeActionAvailable,
          usesRolledDamage,
        }),
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

describe("Stat Block action ordering MBT", () => {
  it("keeps static Stat Block base damage while rolling damage riders", () => {
    const scimitar = srdGoblinWarrior.statBlock.actions?.attacks?.find(
      (attack) => attack.name === multiattackDispatchAttackName,
    );
    if (scimitar === undefined) {
      throw new Error("Expected SRD Goblin Warrior Scimitar.");
    }
    const attack = supportedStatBlockAttackActionOption(scimitar, {
      section: "actions",
      name: scimitar.name,
    }, "static");
    if (attack === null) {
      throw new Error("Expected static SRD Goblin Warrior Scimitar.");
    }
    const rider = {
      attackerId: goblinId,
      unitId: "synthetic_static_stat_block_damage_rider",
      label: "Synthetic Damage Rider",
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

    expect(
      supportedStatBlockAttackActionOption(
        rolledOnlyScimitar,
        {
          section: "actions",
          name: rolledOnlyScimitar.name,
        },
        "static",
      ),
    ).toBeNull();
  });

  it("discovers SRD static Stat Block damage notation as an attack subject", () => {
    const state = statBlockActionOrderingBattle(srdGoblinWarrior);
    expect(
      requireDiscoveredStatBlockAttackSubject(
        state,
        multiattackDispatchAttackName,
        "static",
      ),
    ).toMatchObject({
      tag: "action",
      action: "attack",
      attackName: multiattackDispatchAttackName,
      statBlockDamageNotation: "static",
    });
  });

  it("resolves SRD static Stat Block damage notation without a rolled-dice frontier", () => {
    const state = statBlockActionOrderingBattle(srdGoblinWarrior);
    const subject = requireDiscoveredStatBlockAttackSubject(
      state,
      multiattackDispatchAttackName,
      "static",
    );
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = attackTargetFill(
      targetHole,
      goblinId,
      fighterId,
      multiattackDispatchAttackName,
    );
    const attackRollHole = requireHole(
      resolveBattleSubject({
        state,
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
        state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
    );
    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(5);
  });

  it("projects Stat Block control, attack, damage, and recharge frontiers", async () => {
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
  }, MBT_TEST_TIMEOUT_MS);
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

function statBlockActionOrderingBattle(statBlock: StatBlockRecord): BattleState {
  return requireResolved(
    endTurn({
      state: startBattleRight({
        battleId: battleId("stat-block-action-ordering"),
        combatants: [
          characterSeed({ initiative: 20 }),
          statBlockCreatureInit({
            initiative: 10,
            statBlock,
          }),
        ],
      }),
      actorId: fighterId,
    }),
  ).state;
}

function statBlockAttackSubject(
  attackName: string,
  statBlockDamageNotation: StatBlockDamageNotation = "rolled",
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  return {
    tag: "action",
    actorId: goblinId,
    action: "attack",
    attackName,
    ...(statBlockDamageNotation === "rolled"
      ? {}
      : { statBlockDamageNotation }),
  };
}

function requireDiscoveredStatBlockAttackSubject(
  state: BattleState,
  attackName: string,
  statBlockDamageNotation: StatBlockDamageNotation,
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack" &&
      candidate.subject.actorId === goblinId &&
      candidate.subject.attackName === attackName &&
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

function spendRechargeAttack(): BattleState {
  const battle = statBlockActionOrderingBattle(monsterResourceStatBlock());
  const subject = statBlockAttackSubject(rechargeAttackName);
  const target = requireHole(
    resolveBattleSubject({ state: battle, subject, fills: [] }),
    "targetChoice",
  );
  const targetChoice = attackTargetFill(
    target,
    goblinId,
    fighterId,
    rechargeAttackName,
  );
  const attackRoll = requireHole(
    resolveBattleSubject({
      state: battle,
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
      state: battle,
      subject,
      fills: [targetChoice, attackRollResult],
    }),
    "rolledDice",
  );
  const spent = requireResolved(
    resolveBattleSubject({
      state: battle,
      subject,
      fills: [
        targetChoice,
        attackRollResult,
        damageRollFillWithGroups(damage, [[3]]),
      ],
    }),
  ).state;
  if (statBlockAttackAvailable(spent, rechargeAttackName)) {
    throw new Error("Expected spent recharge Stat Block attack to be hidden.");
  }
  return spent;
}

function statBlockAttackAvailable(
  state: BattleState,
  attackName: string,
): boolean {
  return discoverBattleActs(state).some(
    (act) =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      act.subject.actorId === goblinId &&
      act.subject.attackName === attackName,
  );
}

function statBlockAttackName(subject: BattleSubject): string {
  if (subject.tag === "action" && subject.action === "attack") {
    return subject.attackName;
  }
  throw new Error("Expected Stat Block attack subject.");
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
  return {
    stage: statBlockActionOrderingStage(state["qStage"]),
    holes: quintSet(state["qHoles"], "qHoles")
      .map(statBlockActionOrderingHole)
      .sort(),
    lastResult: statBlockActionOrderingResult(state["qLastResult"]),
    orderingError: statBlockActionOrderingError(state["qLastOrderingError"]),
    multiattackDispatchesAvailable: numberFromQuintInt(
      state["qMultiattackDispatchesAvailable"],
      "qMultiattackDispatchesAvailable",
    ),
    rechargeActionAvailable: booleanField(state, "qRechargeActionAvailable"),
    usesRolledDamage: booleanField(state, "qUsesRolledDamage"),
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

function statBlockActionOrderingResult(
  raw: unknown,
): StatBlockActionOrderingProjection["lastResult"] {
  if (
    raw === "init" ||
    raw === "needsHoles" ||
    raw === "resolved" ||
    raw === "invalid"
  ) {
    return raw;
  }
  throw new Error(`Unknown Stat Block action ordering result: ${String(raw)}.`);
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
