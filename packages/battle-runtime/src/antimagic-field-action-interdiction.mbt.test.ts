// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-antimagic-field-action-interdiction
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { classLevel, Hp, movementFeet } from "@dnd/shared/types";
import * as Either from "effect/Either";
import { describe, expect, it } from "vitest";

import {
  antimagicFieldUnitId,
  clericChannelDivinityUnitId,
  clericPreserveLifeUnitId,
  counterspellUnitId,
  healingWordUnitId,
  oppositionSide,
  partySide,
  rayOfFrostUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  maybeBonusSpellAct,
  maybeSpellAct,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { characterCreature } from "./unit-profile-admission-creature-fixture-support.ts";
import {
  battleAreaId,
  battleId,
  battleUnitRefWithSupportProfiles,
  combatantId,
  discoverBattleActs,
  resolveBattleSubject,
  spellSlotInvocationRef,
  startBattle,
  type BattleActiveEffect,
  type BattleAntimagicFieldAuraMembership,
  type BattleResolutionResult,
  type BattleState,
  type CombatantId,
} from "./index.ts";
import { battleMagicActionHealingPoolSupportForUnit } from "./unit-feature-support.ts";
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
} from "./battle-runtime-mbt-driver-kit.ts";

type AntimagicActionInterdictionProjection = {
  readonly actionSpellDiscovered: boolean;
  readonly bonusActionSpellDiscovered: boolean;
  readonly magicActionDiscovered: boolean;
  readonly lastResult: MbtWitnessLastResult;
  readonly lastInvalidReason: "" | "staleSubject";
};

const antimagicFieldAreaId = battleAreaId(
  "antimagic-action-interdiction-mbt-area",
);
const secondTargetId = combatantId("antimagic-action-interdiction-mbt-target");
const preserveLifeUnit = unitLibrary.requireUnit(clericPreserveLifeUnitId);
const channelDivinityUnit = unitLibrary.requireUnit(
  clericChannelDivinityUnitId,
);
const preserveLifeUnitRef = preserveLifeUnitRefWithSupport();

const antimagicActionInterdictionDriverSchema = {
  init: {},
  doBlockDiscoveryInsideAura: {},
  doAllowOriginExcluded: {},
  doRejectStaleActionSpell: {},
  doRejectStaleMagicAction: {},
  doRejectTriggeredReactionSpell: {},
  step: {},
} as const;

describe("Antimagic Field action interdiction MBT", () => {
  it("replays action spell, Bonus Action spell, Reaction spell, and Magic Action interdiction", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-antimagic-field-action-interdiction.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createAntimagicActionInterdictionDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(3),
      stateCheck: antimagicActionInterdictionStateCheck,
    });
  }, MBT_TEST_TIMEOUT_MS);
});

function createAntimagicActionInterdictionDriver() {
  return defineDriver(antimagicActionInterdictionDriverSchema, () => {
    let projection = initProjection();
    const actionHandlers = {
      doBlockDiscoveryInsideAura() {
        projection = discoveryProjection(
          activeAntimagicAuraState(
            spellInterdictionBattle(),
            auraMembership({
              sourceCombatantId: spellCasterId,
              originIncluded: true,
              nonOriginCombatantIds: [],
            }),
          ),
          activeAntimagicAuraState(
            preserveLifeBattle(),
            auraMembership({
              sourceCombatantId: spellTargetId,
              originIncluded: false,
              nonOriginCombatantIds: [spellCasterId],
            }),
          ),
        );
      },
      doAllowOriginExcluded() {
        projection = discoveryProjection(
          activeAntimagicAuraState(
            spellInterdictionBattle(),
            auraMembership({
              sourceCombatantId: spellCasterId,
              originIncluded: false,
              nonOriginCombatantIds: [],
            }),
          ),
          preserveLifeBattle(),
        );
      },
      doRejectStaleActionSpell() {
        const base = spellInterdictionBattle();
        const act = spellAct({ state: base, spellId: rayOfFrostUnitId });
        projection = invalidProjection(
          resolveBattleSubject({
            state: activeAntimagicAuraState(
              base,
              auraMembership({
                sourceCombatantId: spellTargetId,
                originIncluded: false,
                nonOriginCombatantIds: [spellCasterId],
              }),
            ),
            subject: act.subject,
            fills: [],
          }),
        );
      },
      doRejectStaleMagicAction() {
        const base = preserveLifeBattle();
        const act = preserveLifeAct(base);
        projection = invalidProjection(
          resolveBattleSubject({
            state: activeAntimagicAuraState(
              base,
              auraMembership({
                sourceCombatantId: spellTargetId,
                originIncluded: false,
                nonOriginCombatantIds: [spellCasterId],
              }),
            ),
            subject: act.subject,
            fills: [],
          }),
        );
      },
      doRejectTriggeredReactionSpell() {
        projection = invalidProjection(
          resolveBattleSubject({
            state: activeAntimagicAuraState(
              spellInterdictionBattle(),
              auraMembership({
                sourceCombatantId: spellCasterId,
                originIncluded: true,
                nonOriginCombatantIds: [],
              }),
            ),
            subject: {
              tag: "runtimeCommand",
              actorId: spellCasterId,
              command: "castTriggeredReactionSpell",
              reactorId: spellCasterId,
              invocation: spellSlotInvocationRef(
                counterspellUnitId,
                3,
                "counterspell",
              ),
            },
            fills: [],
          }),
        );
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

const antimagicActionInterdictionStateCheck = stateCheck(
  normalizeAntimagicActionInterdictionQuintState,
  (
    spec: AntimagicActionInterdictionProjection,
    impl: AntimagicActionInterdictionProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

function normalizeAntimagicActionInterdictionQuintState(
  raw: unknown,
): AntimagicActionInterdictionProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: antimagicActionInterdictionUnexpectedHole,
  });
  if (protocol.holes.length !== 0) {
    throw new Error(
      "Expected Antimagic Field action interdiction witness holes to be empty.",
    );
  }
  return {
    actionSpellDiscovered: booleanField(state, "qActionSpellDiscovered"),
    bonusActionSpellDiscovered: booleanField(
      state,
      "qBonusActionSpellDiscovered",
    ),
    magicActionDiscovered: booleanField(state, "qMagicActionDiscovered"),
    lastResult: protocol.lastResult,
    lastInvalidReason: antimagicActionInterdictionInvalidReason(
      protocol.lastInvalidReason,
    ),
  };
}

function antimagicActionInterdictionUnexpectedHole(raw: unknown): never {
  throw new Error(
    `Antimagic Field action interdiction witness does not expect holes; received ${String(raw)}.`,
  );
}

function antimagicActionInterdictionInvalidReason(
  raw: unknown,
): "" | "staleSubject" {
  if (raw === "" || raw === "staleSubject") {
    return raw;
  }

  throw new Error(
    `Unexpected Antimagic Field action interdiction invalid reason: ${String(raw)}.`,
  );
}

function initProjection(): AntimagicActionInterdictionProjection {
  return {
    actionSpellDiscovered: true,
    bonusActionSpellDiscovered: true,
    magicActionDiscovered: true,
    lastResult: "init",
    lastInvalidReason: "",
  };
}

function discoveryProjection(
  spellState: BattleState,
  magicActionState: BattleState,
): AntimagicActionInterdictionProjection {
  return {
    actionSpellDiscovered:
      maybeSpellAct({ state: spellState, spellId: rayOfFrostUnitId }) !==
      undefined,
    bonusActionSpellDiscovered:
      maybeBonusSpellAct({ state: spellState, spellId: healingWordUnitId }) !==
      undefined,
    magicActionDiscovered:
      preserveLifeActOrUndefined(magicActionState) !== undefined,
    lastResult: "resolved",
    lastInvalidReason: "",
  };
}

function invalidProjection(
  result: BattleResolutionResult,
): AntimagicActionInterdictionProjection {
  return {
    actionSpellDiscovered: false,
    bonusActionSpellDiscovered: false,
    magicActionDiscovered: false,
    lastResult: "invalid",
    lastInvalidReason:
      result.tag === "invalid" && result.reason === "staleSubject"
        ? "staleSubject"
        : "",
  };
}

function spellInterdictionBattle(): BattleState {
  return spellBattle({
    cantrips: [spellRecord(rayOfFrostUnitId)],
    preparedSpells: [spellRecord(healingWordUnitId)],
    spellSlots: [
      { spellLevel: 1, count: 1 },
      { spellLevel: 3, count: 1 },
    ],
  });
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
    battleId: battleId("antimagic-field-preserve-life-mbt"),
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
        combatantId: secondTargetId,
        displayName: "Second Target",
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
  const act = preserveLifeActOrUndefined(state);
  if (act === undefined) {
    throw new Error("Expected Preserve Life act.");
  }
  return act;
}

function preserveLifeActOrUndefined(state: BattleState) {
  return discoverBattleActs(state).find(
    (act) =>
      act.subject.tag === "unitFeature" &&
      act.subject.actorId === spellCasterId &&
      act.subject.unitId === clericPreserveLifeUnitId,
  );
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
