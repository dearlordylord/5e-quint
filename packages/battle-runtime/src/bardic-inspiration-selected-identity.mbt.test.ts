// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1D2-BARDIC-INSPIRATION-SCALING bard_bardic_inspiration
// UNIT-IDENTITY-MBT-REPLAY: L1D2-BARDIC-INSPIRATION-SCALING bard_bardic_inspiration doGrantBardicInspirationD12
import * as path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import * as Either from "effect/Either";
import { describe, expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
  DAMAGE_DIE_SIZES,
  Hp,
  movementFeet,
  type DamageDieSize,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";

import {
  BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE,
  battleId,
  battleCombatantSide,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  sameBattleSubject,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
} from "./index.ts";

const bardicInspirationSelectedIdentityDriverSchema = {
  init: {},
  doGrantBardicInspirationD12: {},
  step: {},
} as const;
type BardicInspirationSelectedIdentityAction = Exclude<
  keyof typeof bardicInspirationSelectedIdentityDriverSchema,
  "init" | "step"
>;
type BardicInspirationSelectedIdentityProjection = {
  readonly bonusActionAvailable: boolean;
  readonly featureUsesRemaining: number;
  readonly targetBardicInspirationDieSize: DamageDieSize | 0;
  readonly lastResult: "init" | "resolved" | "invalid";
};
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly BardicInspirationSelectedIdentityAction[];
  readonly expected: BardicInspirationSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "L1D2-BARDIC-INSPIRATION-SCALING";
  readonly unitId: "bard_bardic_inspiration";
  readonly actions: readonly BardicInspirationSelectedIdentityAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const bardId = combatantId("bardic-inspiration-selected-identity-bard");
const targetId = combatantId("bardic-inspiration-selected-identity-target");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Bardic Inspiration selected identity Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitRuntimeBoundaryIds = new Set<string>();

const selectedUnitIdentityReplays = [
  {
    taskId: "L1D2-BARDIC-INSPIRATION-SCALING",
    unitId: "bard_bardic_inspiration",
    actions: ["doGrantBardicInspirationD12"],
    sequences: [
      {
        name: "level-15-grant",
        actions: ["doGrantBardicInspirationD12"],
        expected: {
          bonusActionAvailable: false,
          featureUsesRemaining: 0,
          targetBardicInspirationDieSize: 12,
          lastResult: "resolved",
        },
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

const bardicInspirationSelectedIdentityStateCheck = stateCheck(
  normalizeBardicInspirationSelectedIdentityQuintState,
  compareBardicInspirationSelectedIdentityState,
);

describe("Bardic Inspiration selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<BardicInspirationSelectedIdentityAction>();

      for (const sequence of replay.sequences) {
        const driver = createBardicInspirationSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          resetSelectedUnitRuntimeBoundaryIds();
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Bardic Inspiration selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
          expect(
            selectedUnitRuntimeBoundaryIds.has(replay.unitId),
            `${replay.unitId}:${sequence.name}:${actionName} must bind its Unit id`,
          ).toBe(true);
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Bardic Inspiration selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Bardic Inspiration selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../bardic-inspiration-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createBardicInspirationSelectedIdentityDriver(),
      backend: "typescript",
      seed: process.env["QUINT_SEED"],
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: bardicInspirationSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createBardicInspirationSelectedIdentityDriver() {
  return defineDriver(bardicInspirationSelectedIdentityDriverSchema, () => {
    let state = bardicInspirationBattle();
    let projection = initialProjection();

    function reset(): void {
      state = bardicInspirationBattle();
      projection = initialProjection();
    }

    function recordResult(result: BattleResolutionResult): void {
      if (result.tag === "resolved") {
        state = result.state;
        projection = {
          bonusActionAvailable:
            result.state.currentTurnResources.currentHasBonusAction,
          featureUsesRemaining: resourceUsesRemaining(
            result.state,
            "bard_bardic_inspiration",
          ),
          targetBardicInspirationDieSize:
            targetBardicInspirationDieSize(result.state),
          lastResult: "resolved",
        };
        return;
      }
      projection = { ...projection, lastResult: "invalid" };
    }

    return {
      init: reset,
      doGrantBardicInspirationD12: () => {
        state = bardicInspirationBattle();
        projection = initialProjection();
        const subject = bardicInspirationSubject(
          recordSelectedUnitRuntimeBoundaryId("bard_bardic_inspiration"),
        );
        const target = findHole(
          findAct(state, subject).initialHoles,
          "targetChoice",
        );
        recordResult(
          resolveBattleSubject({
            state,
            subject,
            fills: [bardicInspirationTargetFill(target)],
          }),
        );
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function initialProjection(): BardicInspirationSelectedIdentityProjection {
  return {
    bonusActionAvailable: true,
    featureUsesRemaining: 1,
    targetBardicInspirationDieSize: 0,
    lastResult: "init",
  };
}

function resetSelectedUnitRuntimeBoundaryIds(): void {
  selectedUnitRuntimeBoundaryIds.clear();
}

function recordSelectedUnitRuntimeBoundaryId<UnitId extends string>(
  unitId: UnitId,
): UnitId {
  selectedUnitRuntimeBoundaryIds.add(unitId);
  return unitId;
}

function bardicInspirationBattle(): BattleState {
  const result = startBattle({
    battleId: battleId("bardic-inspiration-selected-identity"),
    combatants: [bardicInspirationBard(), targetCreature()],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function bardicInspirationBard(): BattleCreatureInit {
  const unit = bardicInspirationUnit();
  return {
    combatantId: bardId,
    displayName: "Bard",
    initiative: initiativeScore(20),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("bardic-inspiration-selected-identity-bard"),
      characterUnitRefs: [
        {
          unitId: unit.id,
          supportProfiles: [BARDIC_INSPIRATION_GRANT_SUPPORT_PROFILE],
        },
      ],
      classLevels: [{ className: "bard", level: 15 }],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: selectedIdentityUnarmedStrike(),
      resources: [
        {
          unit,
          capAbilityModifier: abilityModifier(1),
        },
      ],
    },
  };
}

function targetCreature(): BattleCreatureInit {
  return {
    combatantId: targetId,
    displayName: "Target",
    initiative: initiativeScore(10),
    side: oppositionSide,
    creatureInit: {
      kind: "character",
      characterId: characterId("bardic-inspiration-selected-identity-target"),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 1 }],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: selectedIdentityUnarmedStrike(),
    },
  };
}

function selectedIdentityUnarmedStrike(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["unarmedStrike"] {
  return {
    kind: "unarmedStrike",
    effect: {
      kind: "damage",
      damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
    },
    attackAbility: "str",
    attackAbilityModifier: abilityModifier(0),
    attackBonus: attackBonus(2),
    damageAbilityModifier: abilityModifier(0),
  };
}

function bardicInspirationUnit(): Extract<
  UnitRecord,
  { readonly kind: "class_feature" }
> {
  const unit = unitLibrary.requireUnit("bard_bardic_inspiration");
  if (unit.kind !== "class_feature") {
    throw new Error("Expected Bardic Inspiration class feature Unit.");
  }
  return unit;
}

function bardicInspirationSubject(unitId: string): BattleSubject {
  return { tag: "unitFeature", actorId: bardId, unitId };
}

function bardicInspirationTargetFill(
  hole: BattleHole,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "bardicInspirationTargetWithinRange",
        bardId,
        targetId,
        unitId: "bard_bardic_inspiration",
        rangeFeet: movementFeet(60),
      },
    ],
  };
}

function targetBardicInspirationDieSize(
  state: BattleState,
): DamageDieSize | 0 {
  const target = state.combatants.get(targetId);
  const effect = target?.activeEffects.find(
    (candidate) => candidate.kind === "bardicInspirationDie",
  );
  return effect?.kind === "bardicInspirationDie" ? effect.dieSize : 0;
}

function resourceUsesRemaining(state: BattleState, unitId: string): number {
  const bard = state.combatants.get(bardId);
  if (bard?.origin.kind !== "character") {
    throw new Error("Expected Bardic Inspiration selected identity Bard.");
  }
  const resource = bard.origin.resources.find(
    (candidate) => candidate.unit.id === unitId,
  );
  return Number(resource?.usesRemaining ?? 0);
}

function findAct(state: BattleState, subject: BattleSubject) {
  const act = discoverBattleActs(state).find((candidate) =>
    sameBattleSubject(candidate.subject, subject),
  );
  if (act === undefined) {
    throw new Error("Expected Bardic Inspiration selected identity act.");
  }
  return act;
}

function findHole<Kind extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: Kind,
): Extract<BattleHole, { readonly kind: Kind }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: Kind }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(
      `Expected Bardic Inspiration selected identity ${kind} hole.`,
    );
  }
  return hole;
}

function normalizeBardicInspirationSelectedIdentityQuintState(
  raw: unknown,
): BardicInspirationSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    featureUsesRemaining: numberFromQuintInt(
      state["qFeatureUsesRemaining"],
      "qFeatureUsesRemaining",
    ),
    targetBardicInspirationDieSize: dieSizeFromQuintInt(
      state["qTargetBardicInspirationDieSize"],
      "qTargetBardicInspirationDieSize",
    ),
    lastResult: resultField(state["qLastResult"]),
  };
}

function compareBardicInspirationSelectedIdentityState(
  quint: BardicInspirationSelectedIdentityProjection,
  runtime: BardicInspirationSelectedIdentityProjection,
): boolean {
  return isDeepStrictEqual(runtime, quint);
}

function quintStateRecord(raw: unknown): Record<string, unknown> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Bardic Inspiration selected identity Quint state.");
  }
  // Cast justification: after the object guard above, the Quint state is a
  // string-keyed record; every field is parsed before use below.
  return raw as Record<string, unknown>;
}

function booleanField(
  state: Record<string, unknown>,
  field: string,
): boolean {
  const value = state[field];
  if (typeof value !== "boolean") {
    throw new Error(`Expected boolean Quint field ${field}.`);
  }
  return value;
}

function numberFromQuintInt(value: unknown, field: string): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (value !== null && typeof value === "object" && "#bigint" in value) {
    return Number((value as { readonly "#bigint": string })["#bigint"]);
  }
  throw new Error(`Expected integer Quint field ${field}.`);
}

function dieSizeFromQuintInt(
  value: unknown,
  field: string,
): DamageDieSize | 0 {
  const dieSize = numberFromQuintInt(value, field);
  if (dieSize === 0 || isDamageDieSize(dieSize)) {
    return dieSize;
  }
  throw new Error(`Expected Bardic Inspiration die-size Quint field ${field}.`);
}

function isDamageDieSize(dieSize: number): dieSize is DamageDieSize {
  return DAMAGE_DIE_SIZES.some((candidate) => candidate === dieSize);
}

function resultField(
  value: unknown,
): BardicInspirationSelectedIdentityProjection["lastResult"] {
  if (value === "init" || value === "resolved" || value === "invalid") {
    return value;
  }
  throw new Error("Expected Bardic Inspiration selected identity result.");
}
