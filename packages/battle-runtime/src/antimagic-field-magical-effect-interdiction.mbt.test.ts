// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-antimagic-field-magical-effect-interdiction
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { classLevel, Hp, movementFeet } from "@dnd/shared/types";
import * as Either from "effect/Either";
import { describe, expect, it } from "vitest";

import {
  OTHER_MAGICAL_EFFECT_SOURCE,
  SPELL_MAGICAL_EFFECT_SOURCE,
  magicalEffectTargetsInterdictedByAntimagicField,
} from "./battle-reducer/antimagic-field-magical-effect-interdiction.ts";
import {
  antimagicFieldUnitId,
  burningHandsUnitId,
  clericChannelDivinityUnitId,
  clericPreserveLifeUnitId,
  cureWoundsUnitId,
  heatMetalUnitId,
  oppositionSide,
  partySide,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import {
  characterCreature,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  knownWillingSpellTargetFill,
  savingThrowOutcomeFill,
  spellAct,
  spellManufacturedMetalObjectTargetFill,
  spellObjectContactTargetsFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleAreaId,
  battleId,
  battleObjectId,
  battleUnitRefWithSupportProfiles,
  combatantId,
  discoverBattleActs,
  resolveBattleSubject,
  startBattle,
  type BattleActiveEffect,
  type BattleAntimagicFieldAuraMembership,
  type BattleFill,
  type BattleHitPointHealingPoolDistributionHole,
  type BattleState,
  type CombatantId,
} from "./index.ts";
import { battleMagicActionHealingPoolSupportForUnit } from "./unit-feature-support.ts";
import {
  MBT_TEST_TIMEOUT_MS,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";

type AntimagicMagicalEffectInterdictionProjection = {
  readonly spellTargetAllowed: boolean;
  readonly spellAreaDeliveryAllowed: boolean;
  readonly objectContactDeliveryAllowed: boolean;
  readonly otherMagicalEffectTargetAllowed: boolean;
  readonly lastResult: "init" | "allowed" | "invalid";
};

const antimagicFieldAreaId = battleAreaId(
  "antimagic-magical-effect-interdiction-mbt-area",
);
const otherTargetId = combatantId(
  "antimagic-magical-effect-interdiction-mbt-other-target",
);
const preserveLifeUnit = unitLibrary.requireUnit(clericPreserveLifeUnitId);
const channelDivinityUnit = unitLibrary.requireUnit(
  clericChannelDivinityUnitId,
);
const preserveLifeUnitRef = preserveLifeUnitRefWithSupport();

const antimagicMagicalEffectInterdictionDriverSchema = {
  init: {},
  doAllowOutsideAura: {},
  doRejectSpellTargetInsideAura: {},
  doRejectSpellAreaDeliveryInsideAura: {},
  doRejectObjectContactDeliveryInsideAura: {},
  doRejectOtherMagicalEffectTargetInsideAura: {},
  step: {},
} as const;

describe("Antimagic Field magical-effect interdiction MBT", () => {
  it("replays magical-effect target and delivery interdiction", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-antimagic-field-magical-effect-interdiction.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createAntimagicMagicalEffectInterdictionDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(3),
      stateCheck: antimagicMagicalEffectInterdictionStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);
});

function createAntimagicMagicalEffectInterdictionDriver() {
  return defineDriver(
    antimagicMagicalEffectInterdictionDriverSchema,
    () => {
      let projection = initProjection();

      return {
        init: () => {
          projection = initProjection();
        },
        doAllowOutsideAura: () => {
          projection = {
            spellTargetAllowed:
              !spellTargetInterdicted(outsideAuraSpellTargetState()),
            spellAreaDeliveryAllowed:
              !spellAreaDeliveryInterdicted(outsideAuraSpellAreaState()),
            objectContactDeliveryAllowed:
              !objectContactDeliveryInterdicted(outsideAuraObjectContactState()),
            otherMagicalEffectTargetAllowed:
              !otherMagicalEffectTargetInterdicted(
                outsideAuraOtherMagicalEffectState(),
              ),
            lastResult: "allowed",
          };
        },
        doRejectSpellTargetInsideAura: () => {
          projection = {
            ...initProjection(),
            spellTargetAllowed:
              !spellTargetInterdicted(insideAuraSpellTargetState()),
            lastResult: "invalid",
          };
        },
        doRejectSpellAreaDeliveryInsideAura: () => {
          projection = {
            ...initProjection(),
            spellAreaDeliveryAllowed:
              !spellAreaDeliveryInterdicted(insideAuraSpellAreaState()),
            lastResult: "invalid",
          };
        },
        doRejectObjectContactDeliveryInsideAura: () => {
          projection = {
            ...initProjection(),
            objectContactDeliveryAllowed:
              !objectContactDeliveryInterdicted(insideAuraObjectContactState()),
            lastResult: "invalid",
          };
        },
        doRejectOtherMagicalEffectTargetInsideAura: () => {
          projection = {
            ...initProjection(),
            otherMagicalEffectTargetAllowed:
              !otherMagicalEffectTargetInterdicted(
                insideAuraOtherMagicalEffectState(),
              ),
            lastResult: "invalid",
          };
        },
        step: () => {},
        getState: () => projection,
      };
    },
  );
}

const antimagicMagicalEffectInterdictionStateCheck = stateCheck(
  normalizeAntimagicMagicalEffectInterdictionQuintState,
  (
    spec: AntimagicMagicalEffectInterdictionProjection,
    impl: AntimagicMagicalEffectInterdictionProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

function normalizeAntimagicMagicalEffectInterdictionQuintState(
  raw: unknown,
): AntimagicMagicalEffectInterdictionProjection {
  const spellTargetAllowed = quintStateField(raw, "qSpellTargetAllowed");
  const spellAreaDeliveryAllowed = quintStateField(
    raw,
    "qSpellAreaDeliveryAllowed",
  );
  const objectContactDeliveryAllowed = quintStateField(
    raw,
    "qObjectContactDeliveryAllowed",
  );
  const otherMagicalEffectTargetAllowed = quintStateField(
    raw,
    "qOtherMagicalEffectTargetAllowed",
  );
  const lastResult = quintStateField(raw, "qLastResult");
  return {
    spellTargetAllowed: spellTargetAllowed === true,
    spellAreaDeliveryAllowed: spellAreaDeliveryAllowed === true,
    objectContactDeliveryAllowed: objectContactDeliveryAllowed === true,
    otherMagicalEffectTargetAllowed: otherMagicalEffectTargetAllowed === true,
    lastResult:
      lastResult === "init" ||
      lastResult === "allowed" ||
      lastResult === "invalid"
        ? lastResult
        : "invalid",
  };
}

function quintStateField(raw: unknown, fieldName: string): unknown {
  return raw !== null && typeof raw === "object"
    ? Reflect.get(raw, fieldName)
    : undefined;
}

function initProjection(): AntimagicMagicalEffectInterdictionProjection {
  return {
    spellTargetAllowed: true,
    spellAreaDeliveryAllowed: true,
    objectContactDeliveryAllowed: true,
    otherMagicalEffectTargetAllowed: true,
    lastResult: "init",
  };
}

function spellTargetInterdicted(state: BattleState): boolean {
  const act = spellAct({ state, spellId: cureWoundsUnitId, slotLevel: 1 });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const result = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      knownWillingSpellTargetFill(
        targetHole,
        cureWoundsUnitId,
        spellCasterId,
        spellTargetId,
      ),
    ],
  });
  return (
    magicalEffectTargetsInterdictedByAntimagicField({
      state,
      source: SPELL_MAGICAL_EFFECT_SOURCE,
      targetIds: [spellTargetId],
    }) || result.tag === "invalid"
  );
}

function spellAreaDeliveryInterdicted(state: BattleState): boolean {
  const act = spellAct({ state, spellId: burningHandsUnitId, slotLevel: 1 });
  const save = requireHole(act.initialHoles, "savingThrowOutcome");
  const result = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      savingThrowOutcomeFill(save, [
        { targetId: spellTargetId, succeeded: false },
      ]),
    ],
  });
  return result.tag === "invalid";
}

function objectContactDeliveryInterdicted(state: BattleState): boolean {
  const objectId = battleObjectId(
    "antimagic-field-magical-effect-mbt-heat-metal-object",
  );
  const act = spellAct({ state, spellId: heatMetalUnitId, slotLevel: 2 });
  const objectFill = spellManufacturedMetalObjectTargetFill({
    hole: requireHole(act.initialHoles, "objectTargetChoice"),
    objectId,
    spellId: heatMetalUnitId,
    casterId: spellCasterId,
  });
  const contact = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [objectFill],
  });
  const contactHole = requireHole(
    contact.tag === "needsHoles" ? contact.holes : [],
    "objectContactTargets",
  );
  const result = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      objectFill,
      spellObjectContactTargetsFill({
        hole: contactHole,
        targetIds: [spellTargetId],
      }),
    ],
  });
  return result.tag === "invalid";
}

function otherMagicalEffectTargetInterdicted(state: BattleState): boolean {
  const act = preserveLifeAct(state);
  const distribution = requireHole(
    act.initialHoles,
    "hitPointHealingDistribution",
  );
  const result = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      preserveLifeDistributionFill(distribution, [
        { targetId: spellTargetId, hitPoints: 1 },
      ]),
    ],
  });
  return (
    magicalEffectTargetsInterdictedByAntimagicField({
      state,
      source: OTHER_MAGICAL_EFFECT_SOURCE,
      targetIds: [spellTargetId],
    }) || result.tag === "invalid"
  );
}

function outsideAuraSpellTargetState(): BattleState {
  return spellTargetBattle();
}

function insideAuraSpellTargetState(): BattleState {
  return activeAntimagicAuraState(
    spellTargetBattle(),
    auraMembership({
      sourceCombatantId: spellTargetId,
      originIncluded: true,
      nonOriginCombatantIds: [],
    }),
  );
}

function spellTargetBattle(): BattleState {
  return spellBattle({
    preparedSpells: [spellRecord(cureWoundsUnitId)],
    spellSlots: [{ spellLevel: 1, count: 1 }],
    targetHp: 1,
    targetMaxHp: 20,
  });
}

function outsideAuraSpellAreaState(): BattleState {
  return spellAreaBattle();
}

function insideAuraSpellAreaState(): BattleState {
  return activeAntimagicAuraState(
    spellAreaBattle(),
    auraMembership({
      sourceCombatantId: spellTargetId,
      originIncluded: true,
      nonOriginCombatantIds: [],
    }),
  );
}

function spellAreaBattle(): BattleState {
  return spellBattle({
    preparedSpells: [spellRecord(burningHandsUnitId)],
    spellSlots: [{ spellLevel: 1, count: 1 }],
  });
}

function outsideAuraObjectContactState(): BattleState {
  return objectContactBattle();
}

function insideAuraObjectContactState(): BattleState {
  return activeAntimagicAuraState(
    objectContactBattle(),
    auraMembership({
      sourceCombatantId: spellTargetId,
      originIncluded: true,
      nonOriginCombatantIds: [],
    }),
  );
}

function objectContactBattle(): BattleState {
  return spellBattle({
    preparedSpells: [spellRecord(heatMetalUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    targetHp: 20,
    targetMaxHp: 20,
  });
}

function outsideAuraOtherMagicalEffectState(): BattleState {
  return preserveLifeBattle();
}

function insideAuraOtherMagicalEffectState(): BattleState {
  return activeAntimagicAuraState(
    preserveLifeBattle(),
    auraMembership({
      sourceCombatantId: spellTargetId,
      originIncluded: true,
      nonOriginCombatantIds: [],
    }),
  );
}

function activeAntimagicAuraState(
  state: BattleState,
  aura: TestAntimagicFieldAuraMembership,
): BattleState {
  const combatants = new Map(state.combatants);
  const source = combatants.get(aura.sourceCombatantId);
  if (source === undefined) {
    throw new Error("Antimagic Field test source must be in the battle.");
  }
  combatants.set(aura.sourceCombatantId, {
    ...source,
    activeEffects: [...source.activeEffects, antimagicFieldAuraEffect(aura)],
  });
  return {
    ...state,
    combatants,
  };
}

function antimagicFieldAuraEffect(
  aura: TestAntimagicFieldAuraMembership,
): BattleActiveEffect {
  return {
    kind: "antimagicFieldOngoingSpellSuppression",
    sourceSpellId: antimagicFieldUnitId,
    sourceCombatantId: aura.sourceCombatantId,
    areaId: antimagicFieldAreaId,
    auraMembership: aura.membership,
    radiusFeet: movementFeet(10),
    suppressedOngoingSpellEffects: [],
    expiresAt: {
      kind: "concentration",
      combatantId: aura.sourceCombatantId,
      durationTicks: elapsedTimeTicks(600),
    },
  };
}

type TestAntimagicFieldAuraMembership = {
  readonly sourceCombatantId: CombatantId;
  readonly membership: BattleAntimagicFieldAuraMembership;
};

function auraMembership(input: {
  readonly sourceCombatantId: CombatantId;
  readonly originIncluded: boolean;
  readonly nonOriginCombatantIds: readonly CombatantId[];
}): TestAntimagicFieldAuraMembership {
  return {
    sourceCombatantId: input.sourceCombatantId,
    membership: {
      kind: "antimagicFieldAuraMembership",
      originIncluded: input.originIncluded,
      nonOriginCombatantIds: input.nonOriginCombatantIds,
    },
  };
}

function preserveLifeBattle(): BattleState {
  const result = startBattle({
    battleId: battleId("antimagic-field-magical-effect-mbt-preserve-life"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Life Cleric",
        initiative: 20,
        side: partySide,
        classLevels: [{ className: "cleric", level: classLevel(3) }],
        currentHp: Hp(20),
        maxHp: Hp(20),
        characterUnitRefs: [preserveLifeUnitRef],
        unitFeatures: [{ unit: preserveLifeUnit }],
        resources: [{ unit: channelDivinityUnit, usesRemaining: 2 }],
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
        currentHp: Hp(2),
        maxHp: Hp(20),
      }),
      characterCreature({
        combatantId: otherTargetId,
        displayName: "Other Target",
        initiative: 9,
        side: oppositionSide,
        currentHp: Hp(3),
        maxHp: Hp(20),
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function preserveLifeAct(state: BattleState) {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "unitFeature" &&
      candidate.subject.actorId === spellCasterId &&
      candidate.subject.unitId === clericPreserveLifeUnitId,
  );
  if (act === undefined) {
    throw new Error("Expected Preserve Life act.");
  }
  return act;
}

function preserveLifeDistributionFill(
  hole: BattleHitPointHealingPoolDistributionHole,
  allocations: readonly {
    readonly targetId: CombatantId;
    readonly hitPoints: number;
  }[],
): Extract<BattleFill, { readonly kind: "hitPointHealingDistribution" }> {
  return {
    kind: "hitPointHealingDistribution",
    holeId: hole.holeId,
    value: {
      allocations: allocations.map((allocation) => ({
        targetId: allocation.targetId,
        hitPoints: Hp(allocation.hitPoints),
      })),
    },
    spatialFacts: allocations
      .filter((allocation) => allocation.targetId !== spellCasterId)
      .map((allocation) => ({
        kind: "magicActionHealingPoolTargetWithinRange" as const,
        actorId: spellCasterId,
        targetId: allocation.targetId,
        unitId: clericPreserveLifeUnitId,
        rangeFeet: movementFeet(30),
      })),
  };
}

function preserveLifeUnitRefWithSupport() {
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: clericPreserveLifeUnitId },
    unit: preserveLifeUnit,
    classLevels: [{ className: "cleric", level: classLevel(3) }],
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  const support = battleMagicActionHealingPoolSupportForUnit(preserveLifeUnit);
  if (support === null || support === "unsupported") {
    throw new Error("Expected Preserve Life Magic Action support.");
  }
  expect(unitRef.right.supportProfiles).toContainEqual(support);
  return unitRef.right;
}
