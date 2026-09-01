import {
  DieRollResult,
  Hp,
  Integer,
  movementFeet,
  PositiveInteger,
} from "@dnd/shared/types";
import { decodeCreatureImmunityDeclarationSync } from "@dnd/surface/surface/schema";
import { statBlockId as parseSharedStatBlockId } from "@dnd/shared/game-facts";
import {
  battleSubjectUsesOnlyStatBlockDamageComponentNotationForTest,
  nonSpellExecutableProcedureEntry,
  resolveBattleSubject,
} from "./battle-runtime.test-support.ts";
import { isDeepStrictEqual } from "node:util";

import { Result } from "effect";
import { describe, it } from "vitest";

import type {
  AuthoredExecutableProcedure,
  StatBlockRecord,
} from "@dnd/surface/surface/types";

import {
  MBT_TEST_TIMEOUT_MS,
  decodeReducerRoute,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintField,
  quintStateRecord,
  quintVariantMappedValue,
  reducerRouteDiscoverBattleActs,
  reducerRouteResolveBattleSubject,
  reducerRouteStartBattle,
  run,
  stateCheck,
  type MbtWitnessLastInvalidReason,
  type MbtWitnessLastResult,
  type ReducerRouteEvent,
  type ReducerRouteFill,
  type ReducerRouteOwnerGroup,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import {
  battleId,
  battleInitializationIssueMessage,
  combatantId,
  discoverBattleActCandidates,
  initiativeScore,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
type StatBlockMultiDamageHole = "TargetChoice" | "AttackRoll" | "DamageRoll";

type StatBlockMultiDamageMode = "rolled" | "static";

type StatBlockMultiDamageProjection = {
  readonly targetHp: number;
  readonly damageMode: StatBlockMultiDamageMode;
  readonly holes: readonly StatBlockMultiDamageHole[];
  readonly lastResult: MbtWitnessLastResult;
  readonly lastInvalidReason: MbtWitnessLastInvalidReason<"none">;
};
type StatBlockMultiDamageRouteProjection = StatBlockMultiDamageProjection & {
  readonly route: readonly ReducerRouteEvent[];
};

type StatBlockAttack = Extract<
  AuthoredExecutableProcedure,
  { readonly kind: "attack_roll" }
>;

const actorId = combatantId("stat-block-multi-damage-mbt-actor");
const targetId = combatantId("stat-block-multi-damage-mbt-target");
const multiDamageAttackName = "Venom Dart";

const DAMAGE_MODE_BY_TAG = {
  RolledDamageMode: "rolled",
  StaticDamageMode: "static",
} as const satisfies Readonly<Record<string, StatBlockMultiDamageMode>>;

const HOLE_BY_TAG = {
  TargetChoice: "TargetChoice",
  AttackRoll: "AttackRoll",
  DamageRoll: "DamageRoll",
} as const satisfies Readonly<Record<string, StatBlockMultiDamageHole>>;

const driverSchema = {
  initRolled: {},
  initStatic: {},
  doFillTargetChoice: {},
  doFillHitAttackRoll: {},
  doResolveRolledDamage: {},
  step: {},
} as const;

function createStatBlockMultiDamageDriver() {
  return createStatBlockMultiDamageDriverWithProjection(
    (projection) => projection,
  );
}

function createStatBlockMultiDamageRouteDriver() {
  return createStatBlockMultiDamageDriverWithProjection(
    (projection, route) => ({ ...projection, route }),
  );
}

function createStatBlockMultiDamageDriverWithProjection<State>(
  projectState: (
    projection: StatBlockMultiDamageProjection,
    route: readonly ReducerRouteEvent[],
  ) => State,
) {
  return defineDriver<typeof driverSchema, State>(driverSchema, () => {
    let state = statBlockMultiDamageBattle();
    let resolutionState = state;
    let subject = requireDiscoveredStatBlockAttackSubject(state, "rolled");
    let damageMode: StatBlockMultiDamageMode = "rolled";
    let holes: readonly BattleHole[] = [];
    let route: readonly ReducerRouteEvent[] = [];
    let targetChoice: Extract<
      BattleFill,
      { readonly kind: "targetChoice" }
    > | null = null;
    let attackRoll: Extract<
      BattleFill,
      { readonly kind: "attackRoll" }
    > | null = null;
    let lastResult: MbtWitnessLastResult = "init";

    function reset(mode: StatBlockMultiDamageMode): void {
      state = statBlockMultiDamageBattle();
      resolutionState = state;
      subject = requireDiscoveredStatBlockAttackSubject(state, mode);
      damageMode = mode;
      targetChoice = null;
      attackRoll = null;
      const result = resolveBattleSubject({
        state: resolutionState,
        subject,
        fills: [],
      });
      if (result.tag !== "needsHoles") {
        throw new Error(
          `Expected initial Stat Block multi-damage target choice, got ${result.tag}.`,
        );
      }
      state = result.state;
      holes = result.holes;
      route = [
        reducerRouteStartBattle("battleActionEconomy"),
        reducerRouteDiscoverBattleActs({
          subject: "statBlockAction",
          holes,
          owner: "battleStatBlockAction",
        }),
      ];
      lastResult = "init";
    }

    function recordResult(
      result: BattleResolutionResult,
      routeFill: ReducerRouteFill,
      routeOwner: ReducerRouteOwnerGroup,
    ): void {
      const routeHoles =
        result.tag === "needsHoles"
          ? result.holes
          : result.tag === "resolved"
            ? []
            : holes;
      if (result.tag === "resolved") {
        state = result.state;
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
        lastResult = "resolved";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
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
        lastResult = "needsHoles";
        return;
      }
      throw new Error(
        `Unexpected Stat Block multi-damage MBT invalid result: ${result.reason}`,
      );
    }

    function resolveCurrentSubject(input: {
      readonly fills: readonly BattleFill[];
      readonly routeFill: ReducerRouteFill;
      readonly routeOwner: ReducerRouteOwnerGroup;
    }): void {
      recordResult(
        resolveBattleSubject({
          state: resolutionState,
          subject,
          fills: input.fills,
        }),
        input.routeFill,
        input.routeOwner,
      );
    }

    return {
      initRolled: () => reset("rolled"),
      initStatic: () => reset("static"),
      doFillTargetChoice: () => {
        targetChoice = targetChoiceFill(requireHole(holes, "targetChoice"));
        resolveCurrentSubject({
          fills: [targetChoice],
          routeFill: "targetChoice",
          routeOwner: "battleTargetSelection",
        });
      },
      doFillHitAttackRoll: () => {
        const selectedTargetChoice = requireTargetChoice(targetChoice);
        attackRoll = attackRollFill(requireHole(holes, "attackRoll"), {
          total: 20,
          naturalD20: 12,
        });
        resolveCurrentSubject({
          fills: [selectedTargetChoice, attackRoll],
          routeFill: "attackRoll",
          routeOwner:
            damageMode === "rolled" ? "battleAttackRoll" : "battleHitPoint",
        });
      },
      doResolveRolledDamage: () => {
        const selectedTargetChoice = requireTargetChoice(targetChoice);
        const selectedAttackRoll = requireAttackRoll(attackRoll);
        resolveCurrentSubject({
          fills: [
            selectedTargetChoice,
            selectedAttackRoll,
            damageRollFillWithGroups(requireHole(holes, "rolledDice"), [
              [1],
              [2],
            ]),
          ],
          routeFill: "rolledDice",
          routeOwner: "battleHitPoint",
        });
      },
      step: () => {},
      getState: () => {
        const projection = projectStatBlockMultiDamageState({
          state,
          damageMode,
          holes,
          lastResult,
        });
        return projectState(projection, route);
      },
    };
  });
}

const statBlockMultiDamageStateCheck = stateCheck(
  normalizeStatBlockMultiDamageQuintState,
  compareStatBlockMultiDamageStates,
);
const statBlockMultiDamageRouteStateCheck = stateCheck(
  normalizeStatBlockMultiDamageRouteQuintState,
  compareStatBlockMultiDamageStates,
);

const statBlockMultiDamageDefaultMbtSteps = 3;

describe("Stat Block multi-component damage focused MBT", () => {
  it(
    "replays rolled multi-component Stat Block damage by damage type",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-stat-block-multi-damage.mbt.qnt",
        ),
        init: "initRolled",
        step: "step",
        driver: createStatBlockMultiDamageDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(statBlockMultiDamageDefaultMbtSteps),
        stateCheck: statBlockMultiDamageStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "replays static multi-component Stat Block damage by damage type",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-stat-block-multi-damage.mbt.qnt",
        ),
        init: "initStatic",
        step: "step",
        driver: createStatBlockMultiDamageDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(statBlockMultiDamageDefaultMbtSteps),
        stateCheck: statBlockMultiDamageStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes rolled multi-component Stat Block damage through the shared reducer surface",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-stat-block-multi-damage.route.mbt.qnt",
        ),
        init: "initRolled",
        step: "step",
        driver: createStatBlockMultiDamageRouteDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(statBlockMultiDamageDefaultMbtSteps),
        stateCheck: statBlockMultiDamageRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes static multi-component Stat Block damage through the shared reducer surface",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-stat-block-multi-damage.route.mbt.qnt",
        ),
        init: "initStatic",
        step: "step",
        driver: createStatBlockMultiDamageRouteDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(statBlockMultiDamageDefaultMbtSteps),
        stateCheck: statBlockMultiDamageRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function requireDiscoveredStatBlockAttackSubject(
  state: BattleState,
  damageMode: StatBlockMultiDamageMode,
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  const act = discoverBattleActCandidates(state).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack" &&
      candidate.subject.actorId === actorId &&
      battleSubjectUsesOnlyStatBlockDamageComponentNotationForTest(
        candidate.subject,
        damageMode,
      ),
  );
  if (
    act === undefined ||
    act.subject.tag !== "action" ||
    act.subject.action !== "attack"
  ) {
    throw new Error(
      `Expected discovered ${damageMode} Stat Block multi-damage attack subject.`,
    );
  }
  return act.subject;
}

function statBlockMultiDamageBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("stat-block-multi-damage-mbt"),
    combatants: [
      statBlockCreature({
        combatantId: actorId,
        displayName: "Stat Block Multi-Damage Attacker",
        initiative: 20,
        statBlock: multiDamageAttackerStatBlock(),
      }),
      statBlockCreature({
        combatantId: targetId,
        displayName: "Stat Block Poison-Immune Target",
        initiative: 10,
        statBlock: poisonImmuneTargetStatBlock(),
      }),
    ],
  });
}

function startBattleRight(
  input: Parameters<typeof startBattle>[0],
): BattleState {
  const result = startBattle(input);
  if (Result.isFailure(result)) {
    throw new Error(battleInitializationIssueMessage(result.failure));
  }
  return result.success.state;
}

function statBlockCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly statBlock: StatBlockRecord;
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    initiative: initiativeScore(input.initiative),
    statBlock: { ...input.statBlock, name: input.displayName },
    currentHp: Hp(12),
    tempHp: Hp(0),
    ammunitionStocks: [],
    conditions: [],
  };
}

function multiDamageAttackerStatBlock(): StatBlockRecord {
  const base = baseStatBlockRecord("stat_block_multi_damage_mbt_attacker");
  return {
    ...base,
    name: "Stat Block Multi-Damage Attacker",
    statBlock: {
      ...base.statBlock,
      actions: [nonSpellExecutableProcedureEntry(1, venomDartAttack())],
    },
  };
}

function poisonImmuneTargetStatBlock(): StatBlockRecord {
  const base = baseStatBlockRecord("stat_block_multi_damage_mbt_target");
  return {
    ...base,
    name: "Stat Block Poison-Immune Target",
    statBlock: {
      ...base.statBlock,
      immunities: decodeCreatureImmunityDeclarationSync({
        damageTypes: ["poison"],
      }),
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
      section: "Stat Block multi-damage MBT fixture",
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

function venomDartAttack(): StatBlockAttack {
  return {
    kind: "attack_roll",
    attackAbility: "dex",
    attackBonus: { kind: "literal", value: Integer(4) },
    attackType: "ranged",
    name: multiDamageAttackName,
    onHit: [
      {
        amount: {
          kind: "fixed",
          expr: {
            dice: PositiveInteger(1),
            dieSize: 4,
            flat: Integer(1),
          },
          static: PositiveInteger(3),
        },
        damageType: "piercing",
        kind: "damage",
      },
      {
        amount: {
          kind: "fixed",
          expr: { dice: PositiveInteger(1), dieSize: 6 },
          static: PositiveInteger(3),
        },
        damageType: "poison",
        kind: "damage",
      },
    ],
    rangeFeet: { normal: PositiveInteger(30), long: PositiveInteger(120) },
  };
}

function targetChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  if (hole.attack?.actorId !== actorId) {
    throw new Error("Expected typed Stat Block attack target selection facts.");
  }
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
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

function damageRollFillWithGroups(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  groups: readonly (readonly number[])[],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: rolledDiceGroups(groups),
  };
}

type DamageRollValue = Extract<
  BattleFill,
  { readonly kind: "rolledDice" }
>["value"];

function rolledDiceGroups(
  groups: readonly (readonly number[])[],
): DamageRollValue {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }

  return [
    rolledDiceGroup(firstGroup),
    ...restGroups.map((group) => rolledDiceGroup(group)),
  ];
}

function rolledDiceGroup(group: readonly number[]): DamageRollValue[number] {
  const [first, ...rest] = group;
  if (first === undefined) {
    throw new Error("Expected at least one die result.");
  }

  return {
    results: [
      DieRollResult(first),
      ...rest.map((dieResult) => DieRollResult(dieResult)),
    ],
  };
}

function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holesOfKind(holes, kind)[0];
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function holesOfKind<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }>[] {
  return holes.filter(
    (hole): hole is Extract<BattleHole, { readonly kind: K }> =>
      hole.kind === kind,
  );
}

function requireTargetChoice(
  targetChoice: Extract<BattleFill, { readonly kind: "targetChoice" }> | null,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  if (targetChoice === null) {
    throw new Error("Expected selected Stat Block multi-damage target.");
  }
  return targetChoice;
}

function requireAttackRoll(
  attackRoll: Extract<BattleFill, { readonly kind: "attackRoll" }> | null,
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  if (attackRoll === null) {
    throw new Error("Expected selected Stat Block multi-damage attack roll.");
  }
  return attackRoll;
}

function projectStatBlockMultiDamageState(input: {
  readonly state: BattleState;
  readonly damageMode: StatBlockMultiDamageMode;
  readonly holes: readonly BattleHole[];
  readonly lastResult: MbtWitnessLastResult;
}): StatBlockMultiDamageProjection {
  return {
    targetHp: combatantHp(input.state, targetId),
    damageMode: input.damageMode,
    holes: input.holes.map(projectStatBlockMultiDamageHole).sort(),
    lastResult: input.lastResult,
    lastInvalidReason: "none",
  };
}

function combatantHp(state: BattleState, combatantId: CombatantId): number {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${combatantId}.`);
  }
  return Number(combatant.hp);
}

function projectStatBlockMultiDamageHole(
  hole: BattleHole,
): StatBlockMultiDamageHole {
  if (hole.kind === "targetChoice") return "TargetChoice";
  if (hole.kind === "attackRoll") return "AttackRoll";
  if (hole.kind === "rolledDice") return "DamageRoll";
  throw new Error(`Unexpected Stat Block multi-damage MBT hole: ${hole.kind}`);
}

function normalizeStatBlockMultiDamageQuintState(
  raw: unknown,
): StatBlockMultiDamageProjection {
  const state = quintStateRecord(raw);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "qProtocol",
    noInvalidReason: "none",
    decodeHole: statBlockMultiDamageHole,
    compareHoles: (left, right) => left.localeCompare(right),
  });

  return {
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    damageMode: quintVariantMappedValue(
      state["qDamageMode"],
      "qDamageMode",
      DAMAGE_MODE_BY_TAG,
      "Stat Block multi-damage mode",
    ),
    holes: protocol.holes,
    lastResult: protocol.lastResult,
    lastInvalidReason: protocol.lastInvalidReason,
  };
}

function normalizeStatBlockMultiDamageRouteQuintState(
  raw: unknown,
): StatBlockMultiDamageRouteProjection {
  const state = quintStateRecord(raw);
  return {
    ...normalizeStatBlockMultiDamageQuintState(raw),
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function statBlockMultiDamageHole(raw: unknown): StatBlockMultiDamageHole {
  return quintVariantMappedValue(
    raw,
    "qProtocol.holes",
    HOLE_BY_TAG,
    "Stat Block multi-damage hole",
  );
}

function compareStatBlockMultiDamageStates(
  quint: StatBlockMultiDamageProjection,
  runtime: StatBlockMultiDamageProjection,
): boolean {
  if (!isDeepStrictEqual(runtime, quint)) {
    throw new Error(
      `Stat Block multi-damage MBT mismatch:\nruntime=${JSON.stringify(
        runtime,
      )}\nquint=${JSON.stringify(quint)}`,
    );
  }
  return true;
}
