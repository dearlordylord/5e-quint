// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.TURN_BOUNDARY_EFFECT_LIFECYCLE_ORDERING
// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#The Order of Combat: combat
//   advances through initiative-ordered turns and then the next round.
// - .references/srd-5.2.1/Rules-Glossary.md#Simultaneous Effects: multiple
//   same-timing effects on a turn have a table-chosen order.
// - .references/srd-5.2.1/Rules-Glossary.md#Reaction and #Ready Action:
//   effects may last until the start of a creature's next turn.
// - .references/srd-5.2.1/Rules-Glossary.md#Burning: start-of-turn damage is a
//   rules-defined turn-boundary trigger shape.
// - UBIQUITOUS_LANGUAGE.md: Boundary Crossing, Spell Effect, Reaction, Timer.
// Boundary: bounded source/target fixture; not exhaustive same-timing ordering.
// Death Saving Throw ordering is intentionally outside this witness;
// ASSUMPTIONS.md#A6 records the current owner-decision issue.
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { difficultyClass, Hp, Round } from "@dnd/shared/types";
import type { SpellRecord, UnitRecord } from "@dnd/surface/surface/types";
import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  assertWitnessProtocolConsistentWithScenario,
  booleanField,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintRecordField,
  quintStateRecord,
  quintVariantTag,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  damageRollFillWithGroups,
  fighterId,
  fighterVsGoblinBattle,
  findHole,
  goblinId,
  savingThrowOutcomeFill,
} from "./battle-runtime-test-support.ts";
import {
  endTurn,
  type ActiveOngoingFeatureOccurrence,
  type BattleActiveEffect,
  type BattleCreatureState,
  type BattleHole,
  type BattleState,
  type OngoingFeatureSourceKey,
} from "./index.ts";
import type { SupportedUnitFeatureProfile } from "./unit-feature-support.ts";

const turnBoundaryLifecycleScenarios = [
  "init",
  "targetStartTurnResolved",
  "sourceNextTurnResolved",
] as const;
type TurnBoundaryLifecycleScenario =
  (typeof turnBoundaryLifecycleScenarios)[number];

const turnBoundaryActors = ["sourceTurn", "targetTurn"] as const;
type TurnBoundaryActor = (typeof turnBoundaryActors)[number];

const turnBoundaryHoleOrders = [
  "noBoundaryHoles",
  "turnStartDamageThenSave",
  "turnEndDamageOnly",
] as const;
type TurnBoundaryHoleOrder = (typeof turnBoundaryHoleOrders)[number];

const scenarioByQuintTag = {
  Init: "init",
  TargetStartTurnResolved: "targetStartTurnResolved",
  SourceNextTurnResolved: "sourceNextTurnResolved",
} as const satisfies Readonly<Record<string, TurnBoundaryLifecycleScenario>>;

const actorByQuintTag = {
  SourceTurn: "sourceTurn",
  TargetTurn: "targetTurn",
} as const satisfies Readonly<Record<string, TurnBoundaryActor>>;

const holeOrderByQuintTag = {
  NoBoundaryHoles: "noBoundaryHoles",
  TurnStartDamageThenSave: "turnStartDamageThenSave",
  TurnEndDamageOnly: "turnEndDamageOnly",
} as const satisfies Readonly<Record<string, TurnBoundaryHoleOrder>>;

type TurnBoundaryLifecycleHole =
  | "turnStartDamage"
  | "turnStartSave"
  | "turnEndDamage"
  | "turnBoundaryLifecycle";

type TurnBoundaryLifecycleProjection = {
  readonly scenario: TurnBoundaryLifecycleScenario;
  readonly actor: TurnBoundaryActor;
  readonly round: number;
  readonly targetHp: number;
  readonly turnStartDamageActive: boolean;
  readonly turnEndDamageActive: boolean;
  readonly untilNextTurnActive: boolean;
  readonly startTurnOngoingFeatureActive: boolean;
  readonly endTurnOngoingFeatureActive: boolean;
  readonly turnStartDamageAppliedBeforeEndDamage: boolean;
  readonly turnEndDamageAppliedBeforeExpiry: boolean;
  readonly endTurnOngoingExpiredAtTargetEnd: boolean;
  readonly untilNextTurnExpiredAtSourceStart: boolean;
  readonly startTurnOngoingExpiredAtSourceStart: boolean;
  readonly turnStartDurationExpiredAfterRoundTick: boolean;
  readonly lastHoleOrder: TurnBoundaryHoleOrder;
};

type TurnBoundaryLifecycleRuntimeState = {
  readonly battle: BattleState;
  readonly scenario: TurnBoundaryLifecycleScenario;
  readonly turnStartDamageAppliedBeforeEndDamage: boolean;
  readonly turnEndDamageAppliedBeforeExpiry: boolean;
  readonly endTurnOngoingExpiredAtTargetEnd: boolean;
  readonly untilNextTurnExpiredAtSourceStart: boolean;
  readonly startTurnOngoingExpiredAtSourceStart: boolean;
  readonly turnStartDurationExpiredAfterRoundTick: boolean;
  readonly lastHoleOrder: TurnBoundaryHoleOrder;
};

type TurnBoundaryLifecycleDriverAction =
  | "doResolveTargetStartTurn"
  | "doResolveSourceNextTurn";

type TurnBoundaryLifecycleReplaySequence = {
  readonly name: string;
  readonly actions: readonly TurnBoundaryLifecycleDriverAction[];
  readonly expected: TurnBoundaryLifecycleProjection;
};

const turnStartDamageSpellId = syntheticSpellId(
  "synthetic_turn_boundary_start_damage",
);
const turnEndDamageSpellId = syntheticSpellId(
  "synthetic_turn_boundary_end_damage",
);
const untilNextTurnSpellId = syntheticSpellId(
  "synthetic_turn_boundary_until_next_turn",
);
const startTurnOngoingFeatureKey = syntheticOngoingFeatureSourceKey(
  "synthetic_turn_boundary_start_ongoing_feature",
);
const endTurnOngoingFeatureKey = syntheticOngoingFeatureSourceKey(
  "synthetic_turn_boundary_end_ongoing_feature",
);
const initialTargetHp = 10;
const turnStartDamageRoll = 2;
const turnEndDamageRoll = 3;

function syntheticSpellId(id: string): SpellRecord["id"] {
  // SpellRecord["id"] is a branded string whose brand is compile-time-only and
  // erased at runtime. This bounded fixture never looks the synthetic id up in
  // Surface content; active-effect lifecycle code only carries and compares the
  // raw string for equality.
  return id as SpellRecord["id"];
}

function syntheticOngoingFeatureSourceKey(id: string): OngoingFeatureSourceKey {
  // OngoingFeatureSourceKey is a branded string whose brand is compile-time-only
  // and erased at runtime. This fixture uses the raw synthetic string only as a
  // Map key paired with the synthetic profile below.
  return id as OngoingFeatureSourceKey;
}

const driverSchema = {
  init: {},
  doResolveTargetStartTurn: {},
  doResolveSourceNextTurn: {},
  step: {},
} as const;

const replaySequences = [
  {
    name: "target-start-turn-damage-before-target-end-turn-damage",
    actions: ["doResolveTargetStartTurn"],
    expected: {
      scenario: "targetStartTurnResolved",
      actor: "targetTurn",
      round: 1,
      targetHp: 8,
      turnStartDamageActive: true,
      turnEndDamageActive: true,
      untilNextTurnActive: true,
      startTurnOngoingFeatureActive: true,
      endTurnOngoingFeatureActive: true,
      turnStartDamageAppliedBeforeEndDamage: true,
      turnEndDamageAppliedBeforeExpiry: false,
      endTurnOngoingExpiredAtTargetEnd: false,
      untilNextTurnExpiredAtSourceStart: false,
      startTurnOngoingExpiredAtSourceStart: false,
      turnStartDurationExpiredAfterRoundTick: false,
      lastHoleOrder: "turnStartDamageThenSave",
    },
  },
  {
    name: "source-next-turn-expiry-after-target-end-turn-damage",
    actions: ["doResolveTargetStartTurn", "doResolveSourceNextTurn"],
    expected: {
      scenario: "sourceNextTurnResolved",
      actor: "sourceTurn",
      round: 2,
      targetHp: 5,
      turnStartDamageActive: false,
      turnEndDamageActive: false,
      untilNextTurnActive: false,
      startTurnOngoingFeatureActive: false,
      endTurnOngoingFeatureActive: false,
      turnStartDamageAppliedBeforeEndDamage: true,
      turnEndDamageAppliedBeforeExpiry: true,
      endTurnOngoingExpiredAtTargetEnd: true,
      untilNextTurnExpiredAtSourceStart: true,
      startTurnOngoingExpiredAtSourceStart: true,
      turnStartDurationExpiredAfterRoundTick: true,
      lastHoleOrder: "turnEndDamageOnly",
    },
  },
] as const satisfies ReadonlyArray<TurnBoundaryLifecycleReplaySequence>;

describe("turn-boundary effect lifecycle MBT", () => {
  it("replays the bounded turn-boundary lifecycle sequence deterministically", async () => {
    const replayedActions = new Set<TurnBoundaryLifecycleDriverAction>();

    for (const sequence of replaySequences) {
      const driver = createTurnBoundaryLifecycleDriver()();

      for (const actionName of sequence.actions) {
        replayedActions.add(actionName);
        await driver.actions[actionName].handler({});
      }

      const runtime = driver.getState?.();
      if (runtime === undefined) {
        throw new Error("Turn-boundary lifecycle driver must expose getState.");
      }
      expect(runtime, sequence.name).toEqual(sequence.expected);
    }

    expect(replayedActions).toEqual(
      new Set(replaySequences.flatMap((sequence) => sequence.actions)),
    );
  });

  it(
    "matches focused turn-boundary lifecycle traces against Quint",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-turn-boundary-effect-lifecycle.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createTurnBoundaryLifecycleDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(2),
        stateCheck: turnBoundaryLifecycleStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function createTurnBoundaryLifecycleDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doResolveTargetStartTurn: () => {
        state = resolveTargetStartTurn(state);
      },
      doResolveSourceNextTurn: () => {
        state = resolveSourceNextTurn(state);
      },
      step: () => {},
      getState: () => turnBoundaryLifecycleProjection(state),
    };
  });
}

function initialRuntimeState(): TurnBoundaryLifecycleRuntimeState {
  return {
    battle: battleWithTurnBoundaryEffects(),
    scenario: "init",
    turnStartDamageAppliedBeforeEndDamage: false,
    turnEndDamageAppliedBeforeExpiry: false,
    endTurnOngoingExpiredAtTargetEnd: false,
    untilNextTurnExpiredAtSourceStart: false,
    startTurnOngoingExpiredAtSourceStart: false,
    turnStartDurationExpiredAfterRoundTick: false,
    lastHoleOrder: "noBoundaryHoles",
  };
}

function resolveTargetStartTurn(
  state: TurnBoundaryLifecycleRuntimeState,
): TurnBoundaryLifecycleRuntimeState {
  expect(state.scenario).toBe("init");
  const awaitingBoundary = endTurn({ state: state.battle, actorId: fighterId });
  expect(awaitingBoundary).toMatchObject({ tag: "needsHoles" });
  if (awaitingBoundary.tag !== "needsHoles") {
    throw new Error("Expected target start-turn damage and save holes.");
  }
  expect(holeOrder(awaitingBoundary.holes)).toBe("turnStartDamageThenSave");
  const resolved = endTurn({
    state: state.battle,
    actorId: fighterId,
    fills: [
      damageRollFillWithGroups(findHole(awaitingBoundary.holes, "rolledDice"), [
        [turnStartDamageRoll],
      ]),
      savingThrowOutcomeFill(
        findHole(awaitingBoundary.holes, "savingThrowOutcome"),
        [{ targetId: goblinId, succeeded: false }],
      ),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected target start-turn boundary to resolve.");
  }
  return {
    ...state,
    battle: resolved.state,
    scenario: "targetStartTurnResolved",
    turnStartDamageAppliedBeforeEndDamage:
      targetHp(resolved.state) === initialTargetHp - turnStartDamageRoll &&
      hasEffect(resolved.state, goblinId, turnEndDamageSpellId),
    lastHoleOrder: "turnStartDamageThenSave",
  };
}

function resolveSourceNextTurn(
  state: TurnBoundaryLifecycleRuntimeState,
): TurnBoundaryLifecycleRuntimeState {
  expect(state.scenario).toBe("targetStartTurnResolved");
  const hpBeforeEndTurn = targetHp(state.battle);
  const awaitingBoundary = endTurn({ state: state.battle, actorId: goblinId });
  expect(awaitingBoundary).toMatchObject({ tag: "needsHoles" });
  if (awaitingBoundary.tag !== "needsHoles") {
    throw new Error("Expected target end-turn damage hole.");
  }
  expect(holeOrder(awaitingBoundary.holes)).toBe("turnEndDamageOnly");
  const resolved = endTurn({
    state: state.battle,
    actorId: goblinId,
    fills: [
      damageRollFillWithGroups(findHole(awaitingBoundary.holes, "rolledDice"), [
        [turnEndDamageRoll],
      ]),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected source next-turn boundary to resolve.");
  }
  return {
    ...state,
    battle: resolved.state,
    scenario: "sourceNextTurnResolved",
    turnEndDamageAppliedBeforeExpiry:
      targetHp(resolved.state) === hpBeforeEndTurn - turnEndDamageRoll &&
      !hasEffect(resolved.state, goblinId, turnEndDamageSpellId),
    endTurnOngoingExpiredAtTargetEnd: !hasOngoingFeature(
      resolved.state,
      fighterId,
      endTurnOngoingFeatureKey,
    ),
    untilNextTurnExpiredAtSourceStart: !hasEffect(
      resolved.state,
      fighterId,
      untilNextTurnSpellId,
    ),
    startTurnOngoingExpiredAtSourceStart: !hasOngoingFeature(
      resolved.state,
      fighterId,
      startTurnOngoingFeatureKey,
    ),
    turnStartDurationExpiredAfterRoundTick: !hasEffect(
      resolved.state,
      goblinId,
      turnStartDamageSpellId,
    ),
    lastHoleOrder: "turnEndDamageOnly",
  };
}

function battleWithTurnBoundaryEffects(): BattleState {
  const battle = fighterVsGoblinBattle();
  const fighter = requireCombatant(battle, fighterId);
  const goblin = requireCombatant(battle, goblinId);
  if (fighter.origin.kind !== "character") {
    throw new Error(
      "Turn-boundary lifecycle fixture source must be a character.",
    );
  }
  return {
    ...battle,
    combatants: new Map(battle.combatants)
      .set(fighterId, {
        ...fighter,
        origin: {
          ...fighter.origin,
          ongoingFeatureProfiles: new Map([
            ...fighter.origin.ongoingFeatureProfiles,
            [
              startTurnOngoingFeatureKey,
              syntheticOngoingFeatureProfile(
                startTurnOngoingFeatureKey,
                syntheticOngoingFeatureUnit("start"),
              ),
            ],
            [
              endTurnOngoingFeatureKey,
              syntheticOngoingFeatureProfile(
                endTurnOngoingFeatureKey,
                syntheticOngoingFeatureUnit("end"),
              ),
            ],
          ]),
        },
        activeEffects: [...fighter.activeEffects, untilNextTurnEffect()],
        activeOngoingFeatureOccurrences: new Map([
          ...fighter.activeOngoingFeatureOccurrences,
          [startTurnOngoingFeatureKey, startTurnOngoingFeature()],
          [endTurnOngoingFeatureKey, endTurnOngoingFeature()],
        ]),
      })
      .set(goblinId, {
        ...goblin,
        hp: Hp(initialTargetHp),
        maxHp: Hp(initialTargetHp),
        positiveHpUnconscious: null,
        activeEffects: [
          ...goblin.activeEffects,
          turnStartDamageEffect(),
          turnEndDamageEffect(),
        ],
      }),
  };
}

function syntheticOngoingFeatureUnit(boundary: "start" | "end"): UnitRecord {
  const unit = {
    id: `synthetic_turn_boundary_${boundary}_ongoing_feature`,
    name: `Synthetic Turn Boundary ${boundary} Ongoing Feature`,
  };
  // SupportedUnitFeatureProfile stores a UnitRecord, but this fixture does not
  // run Surface readers or unit-feature discovery against the synthetic unit.
  // The exercised reducer path reads only the lifecycle profile and carries the
  // unit id/name as inert identity for the paired Map key.
  return unit as UnitRecord;
}

function syntheticOngoingFeatureProfile(
  sourceKey: OngoingFeatureSourceKey,
  unit: UnitRecord,
): Extract<SupportedUnitFeatureProfile, { readonly kind: "ongoingFeature" }> {
  return {
    kind: "ongoingFeature",
    unit,
    activationTrigger: "bonusAction",
    spendsUse: false,
    lifecycle:
      sourceKey === startTurnOngoingFeatureKey
        ? {
            kind: "turnBoundary",
            initialExpiration: "startOfNextTurn",
            earlyEndConditions: [],
            earlyEndArmorCategories: [],
            extensionTriggers: [],
          }
        : {
            kind: "fixedDuration",
            maximumDurationRounds: 1,
            earlyEndConditions: [],
            earlyEndArmorCategories: [],
            extensionTriggers: [],
          },
    actionRestrictions: [],
    rollModifiers: [],
    spellModifiers: [],
    damageModifiers: [],
    resistances: [],
  };
}

function startTurnOngoingFeature(): ActiveOngoingFeatureOccurrence {
  return {
    kind: "turnBoundary",
    expiresAt: { kind: "startOfTurn", combatantId: fighterId },
  };
}

function endTurnOngoingFeature(): ActiveOngoingFeatureOccurrence {
  return {
    kind: "fixedDuration",
    expiresAt: { kind: "endOfTurn", combatantId: goblinId, round: Round(1) },
  };
}

function turnStartDamageEffect(): BattleActiveEffect {
  return {
    kind: "spellTurnStartDamageAndSave",
    sourceSpellId: turnStartDamageSpellId,
    sourceCombatantId: fighterId,
    damage: {
      expr: { dice: 1, dieSize: 4 },
      damageType: "fire",
    },
    save: {
      ability: "con",
      dc: { kind: "fixed", dc: difficultyClass(12) },
      successEnds: "spell",
    },
    expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(1) },
  };
}

function turnEndDamageEffect(): BattleActiveEffect {
  return {
    kind: "spellTurnEndDamage",
    sourceSpellId: turnEndDamageSpellId,
    sourceCombatantId: fighterId,
    damage: {
      expr: { dice: 1, dieSize: 6 },
      damageType: "fire",
    },
    expiresAt: { kind: "endOfTurn", combatantId: goblinId, round: Round(1) },
  };
}

function untilNextTurnEffect(): BattleActiveEffect {
  return {
    kind: "nextAttackRollBySelf",
    sourceSpellId: untilNextTurnSpellId,
    sourceCombatantId: fighterId,
    mode: "advantage",
    expiresAt: { kind: "startOfTurn", combatantId: fighterId },
  };
}

function turnBoundaryLifecycleProjection(
  state: TurnBoundaryLifecycleRuntimeState,
): TurnBoundaryLifecycleProjection {
  return {
    scenario: state.scenario,
    actor: currentActorProjection(state.battle),
    round: Number(state.battle.initiative.round),
    targetHp: targetHp(state.battle),
    turnStartDamageActive: hasEffect(
      state.battle,
      goblinId,
      turnStartDamageSpellId,
    ),
    turnEndDamageActive: hasEffect(
      state.battle,
      goblinId,
      turnEndDamageSpellId,
    ),
    untilNextTurnActive: hasEffect(
      state.battle,
      fighterId,
      untilNextTurnSpellId,
    ),
    startTurnOngoingFeatureActive: hasOngoingFeature(
      state.battle,
      fighterId,
      startTurnOngoingFeatureKey,
    ),
    endTurnOngoingFeatureActive: hasOngoingFeature(
      state.battle,
      fighterId,
      endTurnOngoingFeatureKey,
    ),
    turnStartDamageAppliedBeforeEndDamage:
      state.turnStartDamageAppliedBeforeEndDamage,
    turnEndDamageAppliedBeforeExpiry: state.turnEndDamageAppliedBeforeExpiry,
    endTurnOngoingExpiredAtTargetEnd: state.endTurnOngoingExpiredAtTargetEnd,
    untilNextTurnExpiredAtSourceStart: state.untilNextTurnExpiredAtSourceStart,
    startTurnOngoingExpiredAtSourceStart:
      state.startTurnOngoingExpiredAtSourceStart,
    turnStartDurationExpiredAfterRoundTick:
      state.turnStartDurationExpiredAfterRoundTick,
    lastHoleOrder: state.lastHoleOrder,
  };
}

const turnBoundaryLifecycleStateCheck = stateCheck(
  turnBoundaryLifecycleProjectionFromQuint,
  (
    spec: TurnBoundaryLifecycleProjection,
    impl: TurnBoundaryLifecycleProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

function turnBoundaryLifecycleProjectionFromQuint(
  rawState: unknown,
): TurnBoundaryLifecycleProjection {
  const state = quintRecordField(quintStateRecord(rawState), "qState");
  const scenario = variantValue(
    state["qScenario"],
    "qScenario",
    scenarioByQuintTag,
  );
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "none",
    decodeHole: turnBoundaryLifecycleHole,
  });
  assertWitnessProtocolConsistentWithScenario({
    label: "turn-boundary lifecycle",
    scenarioResult: scenario,
    protocol,
  });
  return {
    scenario,
    actor: variantValue(state["qActor"], "qActor", actorByQuintTag),
    round: numberFromQuintInt(state["qRound"], "qRound"),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    turnStartDamageActive: booleanField(state, "qTurnStartDamageActive"),
    turnEndDamageActive: booleanField(state, "qTurnEndDamageActive"),
    untilNextTurnActive: booleanField(state, "qUntilNextTurnActive"),
    startTurnOngoingFeatureActive: booleanField(
      state,
      "qStartTurnOngoingFeatureActive",
    ),
    endTurnOngoingFeatureActive: booleanField(
      state,
      "qEndTurnOngoingFeatureActive",
    ),
    turnStartDamageAppliedBeforeEndDamage: booleanField(
      state,
      "qTurnStartDamageAppliedBeforeEndDamage",
    ),
    turnEndDamageAppliedBeforeExpiry: booleanField(
      state,
      "qTurnEndDamageAppliedBeforeExpiry",
    ),
    endTurnOngoingExpiredAtTargetEnd: booleanField(
      state,
      "qEndTurnOngoingExpiredAtTargetEnd",
    ),
    untilNextTurnExpiredAtSourceStart: booleanField(
      state,
      "qUntilNextTurnExpiredAtSourceStart",
    ),
    startTurnOngoingExpiredAtSourceStart: booleanField(
      state,
      "qStartTurnOngoingExpiredAtSourceStart",
    ),
    turnStartDurationExpiredAfterRoundTick: booleanField(
      state,
      "qTurnStartDurationExpiredAfterRoundTick",
    ),
    lastHoleOrder: variantValue(
      state["qLastHoleOrder"],
      "qLastHoleOrder",
      holeOrderByQuintTag,
    ),
  };
}

function turnBoundaryLifecycleHole(raw: unknown): TurnBoundaryLifecycleHole {
  const tag = quintVariantTag(raw);
  const byTag: Readonly<Record<string, TurnBoundaryLifecycleHole>> = {
    TurnStartDamage: "turnStartDamage",
    TurnStartSave: "turnStartSave",
    TurnEndDamage: "turnEndDamage",
    TurnBoundaryLifecycle: "turnBoundaryLifecycle",
  };
  const value = byTag[tag];
  if (value !== undefined) {
    return value;
  }
  throw new Error(`Unexpected turn-boundary lifecycle hole ${tag}.`);
}

function variantValue<const Value extends string>(
  raw: unknown,
  field: string,
  byTag: Readonly<Record<string, Value>>,
): Value {
  const tag = quintVariantTag(raw, field);
  const value = byTag[tag];
  if (value !== undefined) {
    return value;
  }
  throw new Error(`Unexpected ${field} variant ${tag}.`);
}

function currentActorProjection(state: BattleState): TurnBoundaryActor {
  return state.initiative.stillToAct[0]?.creature === fighterId
    ? "sourceTurn"
    : "targetTurn";
}

function holeOrder(holes: readonly BattleHole[]): TurnBoundaryHoleOrder {
  const kinds = holes.map((hole) => hole.kind);
  if (kinds.length === 0) {
    return "noBoundaryHoles";
  }
  if (
    kinds.length === 2 &&
    kinds[0] === "rolledDice" &&
    kinds[1] === "savingThrowOutcome"
  ) {
    return "turnStartDamageThenSave";
  }
  if (kinds.length === 1 && kinds[0] === "rolledDice") {
    return "turnEndDamageOnly";
  }
  throw new Error(`Unexpected turn-boundary hole order ${kinds.join(",")}.`);
}

function hasEffect(
  state: BattleState,
  combatantId: typeof fighterId | typeof goblinId,
  sourceSpellId: SpellRecord["id"],
): boolean {
  return requireCombatant(state, combatantId).activeEffects.some(
    (effect) =>
      "sourceSpellId" in effect && effect.sourceSpellId === sourceSpellId,
  );
}

function hasOngoingFeature(
  state: BattleState,
  combatantId: typeof fighterId | typeof goblinId,
  sourceKey: OngoingFeatureSourceKey,
): boolean {
  return requireCombatant(
    state,
    combatantId,
  ).activeOngoingFeatureOccurrences.has(sourceKey);
}

function targetHp(state: BattleState): number {
  return Number(requireCombatant(state, goblinId).hp);
}

function requireCombatant(
  state: BattleState,
  combatantId: typeof fighterId | typeof goblinId,
): BattleCreatureState {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${combatantId}.`);
  }
  return combatant;
}
