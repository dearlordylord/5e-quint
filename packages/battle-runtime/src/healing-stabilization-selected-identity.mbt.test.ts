// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt healing-stabilization spare_the_dying
// UNIT-IDENTITY-MBT-REPLAY: healing-stabilization spare_the_dying doResolveSpareTheDyingStable
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.MAKE_STABLE_LIFECYCLE
import * as path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  Hp,
  abilityModifier,
  attackBonus,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  battleCombatantSide,
  battleId,
  cantripSpellInvocationRef,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";

const healingStabilizationSelectedIdentityDriverSchema = {
  init: {},
  doResolveSpareTheDyingStable: {},
  step: {},
} as const;
type HealingStabilizationSelectedIdentityDriverAction = Exclude<
  keyof typeof healingStabilizationSelectedIdentityDriverSchema,
  "init" | "step"
>;

type HealingStabilizationSelectedIdentityProjection = {
  readonly targetHp: number;
  readonly targetStable: boolean;
  readonly targetUnconscious: boolean;
  readonly targetDeathSuccesses: number;
  readonly targetDeathFailures: number;
  readonly actionAvailable: boolean;
  readonly lastResult: "init" | "resolved";
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly HealingStabilizationSelectedIdentityDriverAction[];
  readonly expected: HealingStabilizationSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "healing-stabilization";
  readonly unitId: "spare_the_dying";
  readonly actions: readonly HealingStabilizationSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};

const casterId = combatantId("healing-stabilization-caster");
const targetId = combatantId("healing-stabilization-target");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Healing stabilization selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "healing-stabilization",
    unitId: "spare_the_dying",
    actions: ["doResolveSpareTheDyingStable"],
    sequences: [
      {
        name: "zero-hit-point-character-becomes-stable",
        actions: ["doResolveSpareTheDyingStable"],
        expected: expectedProjection({
          targetStable: true,
          targetDeathSuccesses: 0,
          targetDeathFailures: 0,
          actionAvailable: false,
          lastResult: "resolved",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Healing stabilization selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<HealingStabilizationSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createHealingStabilizationSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing healing stabilization selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Healing stabilization selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays healing stabilization selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-healing-stabilization-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createHealingStabilizationSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: healingStabilizationSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createHealingStabilizationSelectedIdentityDriver() {
  return defineDriver(healingStabilizationSelectedIdentityDriverSchema, () => {
    let state = spareTheDyingBattle();
    let lastResult: HealingStabilizationSelectedIdentityProjection["lastResult"] =
      "init";

    function reset(): void {
      state = spareTheDyingBattle();
      lastResult = "init";
    }

    function recordResolvedResult(result: BattleResolutionResult): void {
      if (result.tag !== "resolved") {
        throw new Error(
          `Expected Spare the Dying to resolve, got ${result.tag}.`,
        );
      }
      state = result.state;
      lastResult = "resolved";
    }

    return {
      init: reset,
      doResolveSpareTheDyingStable: () => {
        state = spareTheDyingBattle();
        const act = spareTheDyingAct(state);
        const target = requireHole(act.initialHoles, "targetChoice");
        recordResolvedResult(
          resolveBattleSubject({
            state,
            subject: act.subject,
            fills: [spellTargetFill(target, targetId)],
          }),
        );
      },
      step: () => {},
      getState: () =>
        projectHealingStabilizationSelectedIdentityState(state, lastResult),
    };
  });
}

function expectedProjection(
  overrides: Partial<HealingStabilizationSelectedIdentityProjection> = {},
): HealingStabilizationSelectedIdentityProjection {
  return {
    targetHp: 0,
    targetStable: false,
    targetUnconscious: true,
    targetDeathSuccesses: 2,
    targetDeathFailures: 1,
    actionAvailable: true,
    lastResult: "init",
    ...overrides,
  };
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
        side: partySide,
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
        side: oppositionSide,
        currentHp: 0,
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
    throw new Error(result.left.message);
  }
  return result.right;
}

function healingCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly currentHp?: number;
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
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: [
        {
          className: input.spellcasting?.sourceClassName ?? "fighter",
          level: 1,
        },
      ],
      d20Statistics: testCharacterD20Statistics(),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(input.currentHp ?? 12),
      maxHp: Hp(12),
      tempHp: Hp(0),
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
  const subject = spareTheDyingSubject();
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === "spare_the_dying",
  );
  if (act === undefined) {
    throw new Error("Expected Spare the Dying act.");
  }
  if (!isDeepStrictEqual(act.subject, subject)) {
    throw new Error("Unexpected Spare the Dying subject.");
  }
  return act;
}

function spareTheDyingSubject(): Extract<
  BattleSubject,
  { readonly tag: "actionSpell" }
> {
  return {
    tag: "actionSpell",
    actorId: casterId,
    invocation: cantripSpellInvocationRef("spare_the_dying", "makeStable"),
    mode: { tag: "cast" },
  };
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
        spellId: "spare_the_dying",
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

function projectHealingStabilizationSelectedIdentityState(
  state: BattleState,
  lastResult: HealingStabilizationSelectedIdentityProjection["lastResult"],
): HealingStabilizationSelectedIdentityProjection {
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

function normalizeHealingStabilizationSelectedIdentityQuintState(
  raw: unknown,
): HealingStabilizationSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    targetStable: booleanField(state, "qTargetStable"),
    targetUnconscious: booleanField(state, "qTargetUnconscious"),
    targetDeathSuccesses: numberFromQuintInt(
      state["qTargetDeathSuccesses"],
      "qTargetDeathSuccesses",
    ),
    targetDeathFailures: numberFromQuintInt(
      state["qTargetDeathFailures"],
      "qTargetDeathFailures",
    ),
    actionAvailable: booleanField(state, "qActionAvailable"),
    lastResult: mbtLastResult(state["qLastResult"]),
  };
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint state record.");
  }
  return Object.fromEntries(Object.entries(raw));
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

function mbtLastResult(
  raw: unknown,
): HealingStabilizationSelectedIdentityProjection["lastResult"] {
  if (raw === "init" || raw === "resolved") {
    return raw;
  }
  throw new Error(`Unexpected MBT result ${String(raw)}.`);
}

const healingStabilizationSelectedIdentityStateCheck = stateCheck(
  normalizeHealingStabilizationSelectedIdentityQuintState,
  (
    spec: HealingStabilizationSelectedIdentityProjection,
    impl: HealingStabilizationSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
