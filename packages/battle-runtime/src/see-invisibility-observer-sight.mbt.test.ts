// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-see-invisible-observer-sight
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SEE_INVISIBILITY_OBSERVER_SIGHT
import * as path from "node:path";

import {
  applyCondition,
  hasCondition,
  removeCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import { tickDurationEffects } from "./battle-reducer/turn-end-movement.ts";
import {
  combatantCanSee,
  resolveBattleSubject,
  seeInvisibleRevealsEtherealWitness,
  seeInvisibleRevealsInvisibleObject,
  type BattleActiveEffect,
  type BattleResolutionResult,
  type BattleState,
} from "./index.ts";
import {
  seeInvisibilityUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import { requireCombatant } from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { maybeSpellAct } from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleCreatureStateWithKnockOutPreservedConditions,
  canSpendAction,
  difficultyClass,
} from "./unit-profile-admission-test-support.ts";

const WITNESS_PLANES = ["material", "ethereal"] as const;
type SeeInvisibilityWitnessPlane = (typeof WITNESS_PLANES)[number];

type SeeInvisibilityObserverEffect =
  | { readonly tag: "absent" }
  | { readonly tag: "active"; readonly durationTicks: number };

type SeeInvisibilityObjectWitness = {
  readonly objectHasInvisibleCondition: boolean;
  readonly hasSightLine: boolean;
  readonly blockedByOpaqueCover: boolean;
};

type SeeInvisibilityEtherealWitness = {
  readonly targetPlane: SeeInvisibilityWitnessPlane;
  readonly hasSightLine: boolean;
  readonly blockedByOpaqueCover: boolean;
};

type SeeInvisibilityObserverSightState = {
  readonly actionAvailable: boolean;
  readonly slotSpellCastThisTurn: boolean;
  readonly observerEffect: SeeInvisibilityObserverEffect;
  readonly targetHasInvisibleCondition: boolean;
  readonly targetHidden: boolean;
  readonly objectWitness: SeeInvisibilityObjectWitness;
  readonly etherealWitness: SeeInvisibilityEtherealWitness;
  readonly projectedTargetVisibleToObserver: boolean;
  readonly projectedObjectVisibleToObserver: boolean;
  readonly projectedEtherealVisibleToObserver: boolean;
};

type SeeInvisibilityObserverSightRuntimeState = {
  readonly battle: BattleState;
  readonly objectWitness: SeeInvisibilityObjectWitness;
  readonly etherealWitness: SeeInvisibilityEtherealWitness;
};

const boolSchema = Schema.standardSchemaV1(Schema.Boolean);
const unknownSchema = Schema.standardSchemaV1(Schema.Unknown);

const driverSchema = {
  init: {
    targetHasInvisibleCondition: boolSchema,
    targetHidden: boolSchema,
    objectHasInvisibleCondition: boolSchema,
    objectHasSightLine: boolSchema,
    objectBlockedByOpaqueCover: boolSchema,
    etherealTargetPlane: unknownSchema,
    etherealHasSightLine: boolSchema,
    etherealBlockedByOpaqueCover: boolSchema,
  },
  doCastSeeInvisibility: {},
  doSetTargetFacts: {
    targetHasInvisibleCondition: boolSchema,
    targetHidden: boolSchema,
  },
  doSetObjectWitness: {
    objectHasInvisibleCondition: boolSchema,
    objectHasSightLine: boolSchema,
    objectBlockedByOpaqueCover: boolSchema,
  },
  doSetEtherealWitness: {
    etherealTargetPlane: unknownSchema,
    etherealHasSightLine: boolSchema,
    etherealBlockedByOpaqueCover: boolSchema,
  },
  doMakeObserverEffectNearlyExpired: {},
  doDurationTick: {},
  step: {},
} as const;

function initialRuntimeState(
  input: {
    readonly targetHasInvisibleCondition?: boolean;
    readonly targetHidden?: boolean;
    readonly objectWitness?: SeeInvisibilityObjectWitness;
    readonly etherealWitness?: SeeInvisibilityEtherealWitness;
  } = {},
): SeeInvisibilityObserverSightRuntimeState {
  return {
    battle: withTargetFacts(
      spellBattle({
        preparedSpells: [spellRecord(seeInvisibilityUnitId)],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      }),
      {
        targetHasInvisibleCondition: input.targetHasInvisibleCondition ?? false,
        targetHidden: input.targetHidden ?? false,
      },
    ),
    objectWitness: input.objectWitness ?? {
      objectHasInvisibleCondition: false,
      hasSightLine: false,
      blockedByOpaqueCover: false,
    },
    etherealWitness: input.etherealWitness ?? {
      targetPlane: "material",
      hasSightLine: false,
      blockedByOpaqueCover: false,
    },
  };
}

function createSeeInvisibilityObserverSightDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: (input: {
        readonly targetHasInvisibleCondition: boolean;
        readonly targetHidden: boolean;
        readonly objectHasInvisibleCondition: boolean;
        readonly objectHasSightLine: boolean;
        readonly objectBlockedByOpaqueCover: boolean;
        readonly etherealTargetPlane: unknown;
        readonly etherealHasSightLine: boolean;
        readonly etherealBlockedByOpaqueCover: boolean;
      }) => {
        state = initialRuntimeState({
          targetHasInvisibleCondition: input.targetHasInvisibleCondition,
          targetHidden: input.targetHidden,
          objectWitness: {
            objectHasInvisibleCondition: input.objectHasInvisibleCondition,
            hasSightLine: input.objectHasSightLine,
            blockedByOpaqueCover: input.objectBlockedByOpaqueCover,
          },
          etherealWitness: {
            targetPlane: witnessPlaneFromQuint(input.etherealTargetPlane),
            hasSightLine: input.etherealHasSightLine,
            blockedByOpaqueCover: input.etherealBlockedByOpaqueCover,
          },
        });
      },
      doCastSeeInvisibility: () => {
        state = castSeeInvisibilityInRuntimeState(state);
      },
      doSetTargetFacts: (input: {
        readonly targetHasInvisibleCondition: boolean;
        readonly targetHidden: boolean;
      }) => {
        state = {
          ...state,
          battle: withTargetFacts(state.battle, input),
        };
      },
      doSetObjectWitness: (input: {
        readonly objectHasInvisibleCondition: boolean;
        readonly objectHasSightLine: boolean;
        readonly objectBlockedByOpaqueCover: boolean;
      }) => {
        state = {
          ...state,
          objectWitness: {
            objectHasInvisibleCondition: input.objectHasInvisibleCondition,
            hasSightLine: input.objectHasSightLine,
            blockedByOpaqueCover: input.objectBlockedByOpaqueCover,
          },
        };
      },
      doSetEtherealWitness: (input: {
        readonly etherealTargetPlane: unknown;
        readonly etherealHasSightLine: boolean;
        readonly etherealBlockedByOpaqueCover: boolean;
      }) => {
        state = {
          ...state,
          etherealWitness: {
            targetPlane: witnessPlaneFromQuint(input.etherealTargetPlane),
            hasSightLine: input.etherealHasSightLine,
            blockedByOpaqueCover: input.etherealBlockedByOpaqueCover,
          },
        };
      },
      doMakeObserverEffectNearlyExpired: () => {
        state = {
          ...state,
          battle: withNearlyExpiredObserverEffect(state.battle),
        };
      },
      doDurationTick: () => {
        state = {
          ...state,
          battle: {
            ...state.battle,
            combatants: tickDurationEffects(state.battle.combatants).value,
          },
        };
      },
      step: () => {},
      getState: () => seeInvisibilityObserverSightProjection(state),
    };
  });
}

const seeInvisibilityObserverSightStateCheck = stateCheck(
  normalizeSeeInvisibilityObserverSightQuintState,
  compareSeeInvisibilityObserverSightState,
);

describe("See Invisibility observer-sight MBT parity", () => {
  it("creates a self observer effect without mutating the target's Invisible condition", () => {
    const state = initialRuntimeState({
      targetHasInvisibleCondition: true,
      targetHidden: false,
      objectWitness: {
        objectHasInvisibleCondition: true,
        hasSightLine: true,
        blockedByOpaqueCover: false,
      },
    });

    const cast = castSeeInvisibilityInRuntimeState(state);

    expect(seeInvisibilityObserverSightProjection(cast)).toMatchObject({
      actionAvailable: false,
      slotSpellCastThisTurn: true,
      observerEffect: { tag: "active", durationTicks: 600 },
      targetHasInvisibleCondition: true,
      projectedTargetVisibleToObserver: true,
      projectedObjectVisibleToObserver: true,
    });
  });

  it("keeps Hidden and caller witness facts authoritative", () => {
    const cast = castSeeInvisibilityInRuntimeState(
      initialRuntimeState({
        targetHasInvisibleCondition: true,
        targetHidden: true,
        objectWitness: {
          objectHasInvisibleCondition: true,
          hasSightLine: false,
          blockedByOpaqueCover: false,
        },
        etherealWitness: {
          targetPlane: "material",
          hasSightLine: true,
          blockedByOpaqueCover: false,
        },
      }),
    );

    expect(seeInvisibilityObserverSightProjection(cast)).toMatchObject({
      projectedTargetVisibleToObserver: false,
      projectedObjectVisibleToObserver: false,
      projectedEtherealVisibleToObserver: false,
    });
  });

  it("expires the observer effect on duration cleanup", () => {
    const cast = castSeeInvisibilityInRuntimeState(initialRuntimeState());
    const expiring = {
      ...cast,
      battle: withNearlyExpiredObserverEffect(cast.battle),
    };
    const expired = {
      ...expiring,
      battle: {
        ...expiring.battle,
        combatants: tickDurationEffects(expiring.battle.combatants).value,
      },
    };

    expect(
      seeInvisibilityObserverSightProjection(expired).observerEffect,
    ).toEqual({ tag: "absent" });
  });

  it("matches the TS reducer slice against bounded random MBT traces", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-see-invisibility-observer-sight.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createSeeInvisibilityObserverSightDriver(),
      backend: "typescript",
      nTraces: 10,
      maxSteps: 6,
      stateCheck: seeInvisibilityObserverSightStateCheck,
    });
  }, 120_000);
});

function castSeeInvisibilityInRuntimeState(
  state: SeeInvisibilityObserverSightRuntimeState,
): SeeInvisibilityObserverSightRuntimeState {
  const act = maybeSpellAct({
    state: state.battle,
    spellId: seeInvisibilityUnitId,
    slotLevel: 2,
  });
  if (act === undefined) {
    return state;
  }
  return {
    ...state,
    battle: requireResolved(
      resolveBattleSubject({
        state: state.battle,
        subject: act.subject,
        fills: [],
      }),
    ).state,
  };
}

function withTargetFacts(
  battle: BattleState,
  input: {
    readonly targetHasInvisibleCondition: boolean;
    readonly targetHidden: boolean;
  },
): BattleState {
  const target = requireCombatant(battle, spellTargetId);
  return {
    ...battle,
    combatants: new Map(battle.combatants).set(spellTargetId, {
      ...battleCreatureStateWithKnockOutPreservedConditions(
        target,
        input.targetHasInvisibleCondition
          ? applyCondition(target.conditions, "invisible")
          : removeCondition(target.conditions, "invisible"),
      ),
      hidden: input.targetHidden ? { discoveryDc: difficultyClass(16) } : null,
    }),
  };
}

function withNearlyExpiredObserverEffect(battle: BattleState): BattleState {
  const observer = requireCombatant(battle, spellCasterId);
  if (observerEffectProjection(battle).tag === "absent") {
    return battle;
  }
  return {
    ...battle,
    combatants: new Map(battle.combatants).set(spellCasterId, {
      ...observer,
      activeEffects: observer.activeEffects.map((effect) =>
        isSeeInvisibilityObserverEffect(effect)
          ? {
              ...effect,
              expiresAt: {
                kind: "duration",
                durationTicks: elapsedTimeTicks(1),
              },
            }
          : effect,
      ),
    }),
  };
}

function seeInvisibilityObserverSightProjection(
  state: SeeInvisibilityObserverSightRuntimeState,
): SeeInvisibilityObserverSightState {
  return {
    actionAvailable: canSpendAction(state.battle.currentTurnResources, "magic"),
    slotSpellCastThisTurn:
      state.battle.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed" && use.combatantId === spellCasterId,
      ),
    observerEffect: observerEffectProjection(state.battle),
    targetHasInvisibleCondition: hasCondition(
      requireCombatant(state.battle, spellTargetId).conditions,
      "invisible",
    ),
    targetHidden: requireCombatant(state.battle, spellTargetId).hidden !== null,
    objectWitness: state.objectWitness,
    etherealWitness: state.etherealWitness,
    projectedTargetVisibleToObserver: combatantCanSee(
      state.battle,
      spellCasterId,
      spellTargetId,
    ),
    projectedObjectVisibleToObserver: seeInvisibleRevealsInvisibleObject(
      state.battle,
      {
        observerId: spellCasterId,
        ...state.objectWitness,
      },
    ),
    projectedEtherealVisibleToObserver: seeInvisibleRevealsEtherealWitness(
      state.battle,
      {
        observerId: spellCasterId,
        ...state.etherealWitness,
      },
    ),
  };
}

function observerEffectProjection(
  battle: BattleState,
): SeeInvisibilityObserverEffect {
  const observer = requireCombatant(battle, spellCasterId);
  const durationTicks = observer.activeEffects
    .filter(isSeeInvisibilityObserverEffect)
    .map((effect) =>
      effect.expiresAt.kind === "duration"
        ? Number(effect.expiresAt.durationTicks)
        : 0,
    )
    .reduce((highest, ticks) => Math.max(highest, ticks), 0);
  return durationTicks === 0
    ? { tag: "absent" }
    : { tag: "active", durationTicks };
}

function isSeeInvisibilityObserverEffect(
  effect: BattleActiveEffect,
): effect is Extract<
  BattleActiveEffect,
  { readonly kind: "seeInvisibleAndEthereal" }
> {
  return (
    effect.kind === "seeInvisibleAndEthereal" &&
    effect.sourceSpellId === seeInvisibilityUnitId &&
    effect.sourceCombatantId === spellCasterId
  );
}

function requireResolved(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  expect(result).toMatchObject({ tag: "resolved" });
  if (result.tag !== "resolved") {
    throw new Error("Expected See Invisibility to resolve.");
  }
  return result;
}

function normalizeSeeInvisibilityObserverSightQuintState(
  raw: unknown,
): SeeInvisibilityObserverSightState {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint See Invisibility observer-sight state.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  return {
    actionAvailable: booleanFromQuint(
      state["qActionAvailable"],
      "qActionAvailable",
    ),
    slotSpellCastThisTurn: booleanFromQuint(
      state["qSlotSpellCastThisTurn"],
      "qSlotSpellCastThisTurn",
    ),
    observerEffect: observerEffectFromQuint(state["qObserverEffect"]),
    targetHasInvisibleCondition: booleanFromQuint(
      state["qTargetHasInvisibleCondition"],
      "qTargetHasInvisibleCondition",
    ),
    targetHidden: booleanFromQuint(state["qTargetHidden"], "qTargetHidden"),
    objectWitness: {
      objectHasInvisibleCondition: booleanFromQuint(
        state["qObjectHasInvisibleCondition"],
        "qObjectHasInvisibleCondition",
      ),
      hasSightLine: booleanFromQuint(
        state["qObjectHasSightLine"],
        "qObjectHasSightLine",
      ),
      blockedByOpaqueCover: booleanFromQuint(
        state["qObjectBlockedByOpaqueCover"],
        "qObjectBlockedByOpaqueCover",
      ),
    },
    etherealWitness: {
      targetPlane: witnessPlaneFromQuint(state["qEtherealTargetPlane"]),
      hasSightLine: booleanFromQuint(
        state["qEtherealHasSightLine"],
        "qEtherealHasSightLine",
      ),
      blockedByOpaqueCover: booleanFromQuint(
        state["qEtherealBlockedByOpaqueCover"],
        "qEtherealBlockedByOpaqueCover",
      ),
    },
    projectedTargetVisibleToObserver: booleanFromQuint(
      state["qProjectedTargetVisibleToObserver"],
      "qProjectedTargetVisibleToObserver",
    ),
    projectedObjectVisibleToObserver: booleanFromQuint(
      state["qProjectedObjectVisibleToObserver"],
      "qProjectedObjectVisibleToObserver",
    ),
    projectedEtherealVisibleToObserver: booleanFromQuint(
      state["qProjectedEtherealVisibleToObserver"],
      "qProjectedEtherealVisibleToObserver",
    ),
  };
}

function compareSeeInvisibilityObserverSightState(
  runtime: SeeInvisibilityObserverSightState,
  quint: SeeInvisibilityObserverSightState,
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

function observerEffectFromQuint(raw: unknown): SeeInvisibilityObserverEffect {
  const tag = quintVariantTag(raw);
  if (tag === "SeeInvisibilityObserverEffectAbsent") {
    return { tag: "absent" };
  }
  if (tag === "SeeInvisibilityObserverEffectActive") {
    return {
      tag: "active",
      durationTicks: numberFromQuintInt(
        quintVariantRecordValue(raw, tag)["durationTicks"],
        "qObserverEffect.durationTicks",
      ),
    };
  }
  throw new Error(`Unknown Quint See Invisibility observer effect: ${tag}`);
}

function witnessPlaneFromQuint(raw: unknown): SeeInvisibilityWitnessPlane {
  const tag = quintVariantTag(raw);
  if (tag === "MaterialPlane") return "material";
  if (tag === "EtherealPlane") return "ethereal";
  throw new Error(`Unknown Quint See Invisibility witness plane: ${tag}`);
}

function quintVariantTag(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (isRecord(raw) && typeof raw["tag"] === "string") {
    return raw["tag"];
  }
  throw new Error(`Expected Quint variant tag, got ${String(raw)}.`);
}

function quintVariantRecordValue(
  raw: unknown,
  tag: string,
): Readonly<Record<string, unknown>> {
  if (isRecord(raw) && raw["tag"] === tag && isRecord(raw["value"])) {
    return raw["value"];
  }
  throw new Error(`Expected Quint ${tag} variant record value.`);
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanFromQuint(raw: unknown, field: string): boolean {
  if (typeof raw === "boolean") return raw;
  throw new Error(`Expected Quint Boolean field ${field}.`);
}

function isRecord(raw: unknown): raw is Readonly<Record<string, unknown>> {
  return typeof raw === "object" && raw !== null;
}
