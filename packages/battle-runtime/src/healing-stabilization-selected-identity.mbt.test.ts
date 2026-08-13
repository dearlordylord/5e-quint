import { battleProcedureExecutionRefForTest } from "./battle-runtime.test-support.ts";
import { resolveBattleSubject } from "./battle-runtime.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay healing-stabilization spare_the_dying
// UNIT-IDENTITY-REPLAY: healing-stabilization spare_the_dying doResolveSpareTheDyingStable
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.MAKE_STABLE_LIFECYCLE
import { Either } from "effect";
import { expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
  Hp,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";

import {
  booleanField,
  decodeReducerRoute,
  defineDriver,
  focusedMbtMaxSteps,
  MBT_TEST_TIMEOUT_MS,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintField,
  quintRecordField,
  quintStateRecord,
  quintVariantMappedValue,
  run,
  stateCheck,
  type ReducerRouteEvent,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import {
  battleId,
  battleReducerStartRouteEvent,
  characterId,
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
import type { BattleActDiscoveryCandidate } from "./battle-state-execution.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.test-support.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";

type HealingStabilizationProjection = {
  readonly targetHp: number;
  readonly targetStable: boolean;
  readonly targetUnconscious: boolean;
  readonly targetDeathSuccesses: number;
  readonly targetDeathFailures: number;
  readonly actionAvailable: boolean;
  readonly lastResult: "init" | "resolved";
};

type ZeroHitPointStabilizationRouteProjection = {
  readonly targetHp: number;
  readonly targetTemporaryHp: number;
  readonly targetStable: boolean;
  readonly targetUnconscious: boolean;
  readonly targetDead: boolean;
  readonly targetDeathSuccesses: number;
  readonly targetDeathFailures: number;
  readonly actionAvailable: boolean;
  readonly lastResult: "init" | "resolved";
  readonly route: readonly ReducerRouteEvent[];
};

type ActionSpellAct = BattleActDiscoveryCandidate & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};

const casterId = combatantId("healing-stabilization-caster");
const targetId = combatantId("healing-stabilization-target");
const dyingTargetTemporaryHp = 3;

const zeroHitPointStabilizationRouteReplayDriverSchema = {
  init: {},
  doResolveSpareTheDyingStable: {},
  step: {},
} as const;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Healing stabilization selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const HEALING_STABILIZATION_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  Resolved: "resolved",
} as const satisfies Readonly<Record<string, "init" | "resolved">>;

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Healing stabilization selected identity replay",
  taskId: "healing-stabilization",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-healing-stabilization-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: HEALING_STABILIZATION_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG,
  },
  projectionSchema: {
    targetHp: "int",
    targetStable: "bool",
    targetUnconscious: "bool",
    targetDeathSuccesses: "int",
    targetDeathFailures: "int",
    actionAvailable: "bool",
    lastResult: "variant",
  },
  initialProjection: {
    targetHp: 0,
    targetStable: false,
    targetUnconscious: true,
    targetDeathSuccesses: 2,
    targetDeathFailures: 1,
    actionAvailable: true,
    lastResult: "init",
  },
  units: [
    {
      unitId: "spare_the_dying",
      procedures: [
        {
          actionName: "doResolveSpareTheDyingStable",
          discover: () => {
            const state = spareTheDyingBattle();
            const act = spareTheDyingAct(state);
            const target = requireHole(act.initialHoles, "targetChoice");
            const result = resolveBattleSubject({
              state,
              subject: act.subject,
              fills: [spellTargetFill(target, targetId)],
            });
            return projectHealingStabilizationState(
              recordResolvedState(result),
              "resolved",
            );
          },
        },
      ],
    },
  ],
});

it(
  "observes selected healing stabilization qRoute through public reducer events",
  async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-healing-stabilization-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createZeroHitPointStabilizationRouteReplayDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(2),
      stateCheck: zeroHitPointStabilizationRouteStateCheck,
    });
  },
  MBT_TEST_TIMEOUT_MS,
);

function createZeroHitPointStabilizationRouteReplayDriver() {
  return defineDriver(zeroHitPointStabilizationRouteReplayDriverSchema, () => {
    let projection = initialZeroHitPointStabilizationRouteProjection();

    function reset(): void {
      projection = initialZeroHitPointStabilizationRouteProjection();
    }

    return {
      init: reset,
      doResolveSpareTheDyingStable: () => {
        projection = observeSpareTheDyingResolvedRoute();
      },
      step: () => {},
      getState: (): ZeroHitPointStabilizationRouteProjection => projection,
    };
  });
}

const zeroHitPointStabilizationRouteStateCheck = stateCheck(
  normalizeZeroHitPointStabilizationRouteQuintState,
  (
    spec: ZeroHitPointStabilizationRouteProjection,
    impl: ZeroHitPointStabilizationRouteProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

function recordResolvedState(result: BattleResolutionResult): BattleState {
  if (result.tag !== "resolved") {
    throw new Error(`Expected Spare the Dying to resolve, got ${result.tag}.`);
  }
  return result.state;
}

function spareTheDyingBattle(): BattleState {
  const spell = srdSpellRecord("spare_the_dying");
  const result = startBattle({
    battleId: battleId("healing-stabilization-selected-identity"),
    combatants: [
      healingCreature({
        combatantId: casterId,
        displayName: "Spare the Dying caster",
        initiative: 20,
        spellcasting: {
          sourceClassName: "cleric",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [spell],
          preparedSpells: [],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [],
        },
      }),
      healingCreature({
        combatantId: targetId,
        displayName: "Dying target",
        initiative: 10,
        currentHp: 0,
        temporaryHp: dyingTargetTemporaryHp,
        conditions: ["unconscious"],
        zeroHpLifecycle: {
          policy: "usesDeathSavingThrows",
          deathSaves: {
            deathSaves: { successes: 2, failures: 1 },
            stable: false,
            dead: false,
            hpRegained: false,
          },
        },
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right.state;
}

function healingCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly currentHp?: number;
  readonly temporaryHp?: number;
  readonly conditions?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["conditions"];
  readonly zeroHpLifecycle?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["zeroHpLifecycle"];
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "character",
      ammunitionStocks: [],
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: [
        {
          className: input.spellcasting?.sourceClassName ?? "fighter",
          level: 1,
        },
      ],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      weaponMasteries: [],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(input.currentHp ?? 12),
      maxHp: Hp(12),
      tempHp: Hp(input.temporaryHp ?? 0),
      ...(input.conditions === undefined
        ? {}
        : { conditions: input.conditions }),
      ...(input.zeroHpLifecycle === undefined
        ? {}
        : { zeroHpLifecycle: input.zeroHpLifecycle }),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

function srdSpellRecord(spellId: "spare_the_dying"): SpellRecord {
  const unit = unitLibrary.requireUnit(spellId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${spellId} to be a Spell.`);
  }
  return unit;
}

function spareTheDyingAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActCandidates(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell",
  );
  if (act === undefined) {
    throw new Error("Expected Spare the Dying act.");
  }
  return act;
}

function initialZeroHitPointStabilizationRouteProjection(): ZeroHitPointStabilizationRouteProjection {
  return {
    targetHp: 0,
    targetTemporaryHp: dyingTargetTemporaryHp,
    targetStable: false,
    targetUnconscious: true,
    targetDead: false,
    targetDeathSuccesses: 2,
    targetDeathFailures: 1,
    actionAvailable: true,
    lastResult: "init",
    route: [battleReducerStartRouteEvent()],
  };
}

function observeSpareTheDyingResolvedRoute(): ZeroHitPointStabilizationRouteProjection {
  const state = spareTheDyingBattle();
  const act = spareTheDyingAct(state);
  const target = requireHole(act.initialHoles, "targetChoice");
  const result = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [spellTargetFill(target, targetId)],
  });
  return {
    ...projectZeroHitPointStabilizationRouteState(
      recordResolvedState(result),
      "resolved",
    ),
    route: [
      battleReducerStartRouteEvent(),
      ...routeEventsOf(act, "Spare the Dying discovery"),
      ...routeEventsOf(result, "Spare the Dying resolution"),
    ],
  };
}

function routeEventsOf(
  source: { readonly routeEvents?: readonly ReducerRouteEvent[] },
  label: string,
): readonly ReducerRouteEvent[] {
  if (source.routeEvents === undefined || source.routeEvents.length === 0) {
    throw new Error(`Expected ${label} route events.`);
  }
  return source.routeEvents;
}

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  selectedTargetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: selectedTargetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId,
        targetId: selectedTargetId,
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String("spare_the_dying"),
        ),
      },
    ],
  };
}

function requireHole<K extends BattleHole["kind"]>(
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

function projectHealingStabilizationState(
  state: BattleState,
  lastResult: HealingStabilizationProjection["lastResult"],
): HealingStabilizationProjection {
  const snapshot = snapshotBattle(state);
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === targetId,
  );
  if (target === undefined) {
    throw new Error("Expected healing stabilization target.");
  }
  if (target.zeroHpLifecycle.policy !== "usesDeathSavingThrows") {
    throw new Error("Expected target with Death Saving Throw lifecycle.");
  }
  return {
    targetHp: target.hp,
    targetStable: target.zeroHpLifecycle.stable,
    targetUnconscious: target.conditions.includes("unconscious"),
    targetDeathSuccesses: target.zeroHpLifecycle.deathSaves.successes,
    targetDeathFailures: target.zeroHpLifecycle.deathSaves.failures,
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    lastResult,
  };
}

function projectZeroHitPointStabilizationRouteState(
  state: BattleState,
  lastResult: ZeroHitPointStabilizationRouteProjection["lastResult"],
): Omit<ZeroHitPointStabilizationRouteProjection, "route"> {
  const snapshot = snapshotBattle(state);
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === targetId,
  );
  if (target === undefined) {
    throw new Error("Expected healing stabilization target.");
  }
  if (target.zeroHpLifecycle.policy !== "usesDeathSavingThrows") {
    throw new Error("Expected target with Death Saving Throw lifecycle.");
  }
  return {
    targetHp: target.hp,
    targetTemporaryHp: Number(target.tempHp),
    targetStable: target.zeroHpLifecycle.stable,
    targetUnconscious: target.conditions.includes("unconscious"),
    targetDead: target.zeroHpLifecycle.dead,
    targetDeathSuccesses: target.zeroHpLifecycle.deathSaves.successes,
    targetDeathFailures: target.zeroHpLifecycle.deathSaves.failures,
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    lastResult,
  };
}

function normalizeZeroHitPointStabilizationRouteQuintState(
  raw: unknown,
): ZeroHitPointStabilizationRouteProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  return {
    targetHp: numberFromQuintInt(quintField(state, "qTargetHp"), "qTargetHp"),
    targetTemporaryHp: numberFromQuintInt(
      quintField(state, "qTargetTemporaryHp"),
      "qTargetTemporaryHp",
    ),
    targetStable: booleanField(state, "qTargetStable"),
    targetUnconscious: booleanField(state, "qTargetUnconscious"),
    targetDead: booleanField(state, "qTargetDead"),
    targetDeathSuccesses: numberFromQuintInt(
      quintField(state, "qTargetDeathSuccesses"),
      "qTargetDeathSuccesses",
    ),
    targetDeathFailures: numberFromQuintInt(
      quintField(state, "qTargetDeathFailures"),
      "qTargetDeathFailures",
    ),
    actionAvailable: booleanField(state, "qActionAvailable"),
    lastResult: quintVariantMappedValue(
      quintField(state, "qScenarioOutcome"),
      "qScenarioOutcome",
      HEALING_STABILIZATION_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG,
      "healing stabilization scenario outcome",
    ),
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}
