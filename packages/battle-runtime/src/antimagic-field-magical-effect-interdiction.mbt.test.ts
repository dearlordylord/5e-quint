import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleProcedureExecutionRefForTest } from "./battle-runtime.test-support.ts";
import { resolveBattleSubject } from "./battle-runtime.test-support.ts";
import {
  antimagicFieldAuraEffectForTest,
  antimagicFieldAuraMembershipForTest,
  type TestAntimagicFieldAuraMembership,
} from "./antimagic-field.test-support.ts";
import { battleActUnitPresentation } from "./battle-act-composition.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.ANTIMAGIC_FIELD_MAGICAL_EFFECT_INTERDICTION
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-antimagic-field-magical-effect-interdiction
import { classLevel, Hp, movementFeet } from "@dnd/shared/types";
import * as Either from "effect/Either";
import { describe, expect, it } from "vitest";

import {
  OTHER_MAGICAL_EFFECT_SOURCE,
  SPELL_MAGICAL_EFFECT_SOURCE,
  magicalEffectTargetsInterdictedByAntimagicField,
} from "./battle-reducer/antimagic-field-magical-effect-interdiction.ts";
import {
  burningHandsUnitId,
  clericChannelDivinityUnitId,
  clericPreserveLifeUnitId,
  cureWoundsUnitId,
  heatMetalUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  characterCreature,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { characterBattleFeatureInitForTest } from "./battle-runtime.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  knownWillingSpellTargetFill,
  savingThrowOutcomeFill,
  spellAct,
  spellManufacturedMetalObjectTargetFill,
  spellObjectContactTargetsFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  battleAreaId,
  battleId,
  battleObjectId,
  battleUnitRefWithSupportProfiles,
  combatantId,
  discoverBattleActs,
  startBattle,
  type BattleFill,
  type BattleHitPointHealingPoolDistributionHole,
  type BattleRuntimeSession,
  type CombatantId,
} from "./index.ts";
import { battleMagicActionHealingPoolSupportForUnit } from "./unit-feature-support.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  quintRecordField,
  quintStateRecord,
  run,
  stateCheck,
  type MbtWitnessLastResult,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";

type AntimagicMagicalEffectInterdictionProjection = {
  readonly spellTargetAllowed: boolean;
  readonly spellAreaDeliveryAllowed: boolean;
  readonly objectContactDeliveryAllowed: boolean;
  readonly otherMagicalEffectTargetAllowed: boolean;
  readonly lastResult: MbtWitnessLastResult;
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
  it(
    "replays magical-effect target and delivery interdiction",
    async () => {
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
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function createAntimagicMagicalEffectInterdictionDriver() {
  return defineDriver(antimagicMagicalEffectInterdictionDriverSchema, () => {
    let projection = initProjection();
    const actionHandlers = {
      doAllowOutsideAura() {
        projection = {
          spellTargetAllowed: !spellTargetInterdicted(
            outsideAuraSpellTargetState(),
          ),
          spellAreaDeliveryAllowed: !spellAreaDeliveryInterdicted(
            outsideAuraSpellAreaState(),
          ),
          objectContactDeliveryAllowed: !objectContactDeliveryInterdicted(
            outsideAuraObjectContactState(),
          ),
          otherMagicalEffectTargetAllowed: !otherMagicalEffectTargetInterdicted(
            outsideAuraOtherMagicalEffectState(),
          ),
          lastResult: "resolved",
        };
      },
      doRejectSpellTargetInsideAura() {
        projection = {
          ...initProjection(),
          spellTargetAllowed: !spellTargetInterdicted(
            insideAuraSpellTargetState(),
          ),
          lastResult: "invalid",
        };
      },
      doRejectSpellAreaDeliveryInsideAura() {
        projection = {
          ...initProjection(),
          spellAreaDeliveryAllowed: !spellAreaDeliveryInterdicted(
            insideAuraSpellAreaState(),
          ),
          lastResult: "invalid",
        };
      },
      doRejectObjectContactDeliveryInsideAura() {
        projection = {
          ...initProjection(),
          objectContactDeliveryAllowed: !objectContactDeliveryInterdicted(
            insideAuraObjectContactState(),
          ),
          lastResult: "invalid",
        };
      },
      doRejectOtherMagicalEffectTargetInsideAura() {
        projection = {
          ...initProjection(),
          otherMagicalEffectTargetAllowed: !otherMagicalEffectTargetInterdicted(
            insideAuraOtherMagicalEffectState(),
          ),
          lastResult: "invalid",
        };
      },
    } as const;

    return {
      init: () => {
        projection = initProjection();
      },
      ...actionHandlers,
      step: () => {},
      getState: () => projection,
    };
  });
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
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: antimagicMagicalEffectInterdictionUnexpectedHole,
  });
  if (protocol.holes.length !== 0) {
    throw new Error(
      "Expected Antimagic Field magical-effect interdiction witness holes to be empty.",
    );
  }
  return {
    spellTargetAllowed: booleanField(state, "qSpellTargetAllowed"),
    spellAreaDeliveryAllowed: booleanField(state, "qSpellAreaDeliveryAllowed"),
    objectContactDeliveryAllowed: booleanField(
      state,
      "qObjectContactDeliveryAllowed",
    ),
    otherMagicalEffectTargetAllowed: booleanField(
      state,
      "qOtherMagicalEffectTargetAllowed",
    ),
    lastResult: protocol.lastResult,
  };
}

function antimagicMagicalEffectInterdictionUnexpectedHole(raw: unknown): never {
  throw new Error(
    `Antimagic Field magical-effect interdiction witness does not expect holes; received ${String(raw)}.`,
  );
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

function spellTargetInterdicted(session: BattleRuntimeSession): boolean {
  const act = spellAct({
    session,
    spellId: cureWoundsUnitId,
    slotLevel: 1,
  });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const result = resolveBattleSubject({
    state: session.state,
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
      state: session.state,
      source: SPELL_MAGICAL_EFFECT_SOURCE,
      targetIds: [spellTargetId],
    }) || result.tag === "invalid"
  );
}

function spellAreaDeliveryInterdicted(session: BattleRuntimeSession): boolean {
  const act = spellAct({
    session,
    spellId: burningHandsUnitId,
    slotLevel: 1,
  });
  const save = requireHole(act.initialHoles, "savingThrowOutcome");
  const result = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      savingThrowOutcomeFill(save, [
        { targetId: spellTargetId, succeeded: false },
      ]),
    ],
  });
  return result.tag === "invalid";
}

function objectContactDeliveryInterdicted(
  session: BattleRuntimeSession,
): boolean {
  const objectId = battleObjectId(
    "antimagic-field-magical-effect-mbt-heat-metal-object",
  );
  const act = spellAct({
    session,
    spellId: heatMetalUnitId,
    slotLevel: 2,
  });
  const objectFill = spellManufacturedMetalObjectTargetFill({
    hole: requireHole(act.initialHoles, "objectTargetChoice"),
    objectId,
    spellId: heatMetalUnitId,
    casterId: spellCasterId,
  });
  const contact = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [objectFill],
  });
  const contactHole = requireHole(
    contact.tag === "needsHoles" ? contact.holes : [],
    "objectContactTargets",
  );
  const result = resolveBattleSubject({
    state: session.state,
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

function otherMagicalEffectTargetInterdicted(
  session: BattleRuntimeSession,
): boolean {
  const act = preserveLifeAct(session);
  const distribution = requireHole(
    act.initialHoles,
    "hitPointHealingDistribution",
  );
  const result = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      preserveLifeDistributionFill(distribution, [
        { targetId: spellTargetId, hitPoints: 1 },
      ]),
    ],
  });
  return (
    magicalEffectTargetsInterdictedByAntimagicField({
      state: session.state,
      source: OTHER_MAGICAL_EFFECT_SOURCE,
      targetIds: [spellTargetId],
    }) || result.tag === "invalid"
  );
}

function outsideAuraSpellTargetState(): BattleRuntimeSession {
  return spellTargetBattle();
}

function insideAuraSpellTargetState(): BattleRuntimeSession {
  return activeAntimagicAuraSession(
    spellTargetBattle(),
    antimagicFieldAuraMembershipForTest({
      sourceCombatantId: spellTargetId,
      originIncluded: true,
      nonOriginCombatantIds: [],
    }),
  );
}

function spellTargetBattle(): BattleRuntimeSession {
  return spellBattle({
    preparedSpells: [spellRecord(cureWoundsUnitId)],
    spellSlots: [{ spellLevel: 1, count: 1 }],
    targetHp: 1,
    targetMaxHp: 20,
  });
}

function outsideAuraSpellAreaState(): BattleRuntimeSession {
  return spellAreaBattle();
}

function insideAuraSpellAreaState(): BattleRuntimeSession {
  return activeAntimagicAuraSession(
    spellAreaBattle(),
    antimagicFieldAuraMembershipForTest({
      sourceCombatantId: spellTargetId,
      originIncluded: true,
      nonOriginCombatantIds: [],
    }),
  );
}

function spellAreaBattle(): BattleRuntimeSession {
  return spellBattle({
    preparedSpells: [spellRecord(burningHandsUnitId)],
    spellSlots: [{ spellLevel: 1, count: 1 }],
  });
}

function outsideAuraObjectContactState(): BattleRuntimeSession {
  return objectContactBattle();
}

function insideAuraObjectContactState(): BattleRuntimeSession {
  return activeAntimagicAuraSession(
    objectContactBattle(),
    antimagicFieldAuraMembershipForTest({
      sourceCombatantId: spellTargetId,
      originIncluded: true,
      nonOriginCombatantIds: [],
    }),
  );
}

function objectContactBattle(): BattleRuntimeSession {
  return spellBattle({
    preparedSpells: [spellRecord(heatMetalUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    targetHp: 20,
    targetMaxHp: 20,
  });
}

function outsideAuraOtherMagicalEffectState(): BattleRuntimeSession {
  return preserveLifeBattle();
}

function insideAuraOtherMagicalEffectState(): BattleRuntimeSession {
  return activeAntimagicAuraSession(
    preserveLifeBattle(),
    antimagicFieldAuraMembershipForTest({
      sourceCombatantId: spellTargetId,
      originIncluded: true,
      nonOriginCombatantIds: [],
    }),
  );
}

function activeAntimagicAuraSession(
  session: BattleRuntimeSession,
  aura: TestAntimagicFieldAuraMembership,
): BattleRuntimeSession {
  const combatants = new Map(session.state.combatants);
  const source = combatants.get(aura.sourceCombatantId);
  if (source === undefined) {
    throw new Error("Antimagic Field test source must be in the battle.");
  }
  combatants.set(aura.sourceCombatantId, {
    ...source,
    activeEffects: [
      ...source.activeEffects,
      antimagicFieldAuraEffectForTest({
        areaId: antimagicFieldAreaId,
        aura,
      }),
    ],
  });
  return battleRuntimeSessionForTest({
    ...session,
    state: { ...session.state, combatants },
  });
}

function preserveLifeBattle(): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId("antimagic-field-magical-effect-mbt-preserve-life"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Life Cleric",
        initiative: 20,
        classLevels: [{ className: "cleric", level: classLevel(3) }],
        currentHp: Hp(20),
        maxHp: Hp(20),
        characterUnitRefs: [preserveLifeUnitRef],
        unitFeatures: [
          characterBattleFeatureInitForTest(preserveLifeUnit, [
            { className: "cleric", level: classLevel(3) },
          ]),
        ],
        resources: [{ unit: channelDivinityUnit, usesRemaining: 2 }],
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        currentHp: Hp(2),
        maxHp: Hp(20),
      }),
      characterCreature({
        combatantId: otherTargetId,
        displayName: "Other Target",
        initiative: 9,
        currentHp: Hp(3),
        maxHp: Hp(20),
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right;
}

function preserveLifeAct(session: BattleRuntimeSession) {
  const act = discoverBattleActs(session).find(
    (candidate) =>
      candidate.subject.tag === "unitFeature" &&
      candidate.subject.actorId === spellCasterId &&
      battleActUnitPresentation(candidate)?.unitId === clericPreserveLifeUnitId,
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
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String(clericPreserveLifeUnitId),
        ),
        rangeFeet: movementFeet(30),
      })),
  };
}

function preserveLifeUnitRefWithSupport() {
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: parseSharedUnitId(clericPreserveLifeUnitId) },
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
