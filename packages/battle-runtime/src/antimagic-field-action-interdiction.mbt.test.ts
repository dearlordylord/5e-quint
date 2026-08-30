import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleStateWithAllocatedEffectForTest,
  resolveBattleSubject,
} from "./battle-runtime.test-support.ts";
import {
  magicSuppressionEmanationEffectTemplateForTest,
  magicSuppressionEmanationMembershipForTest,
  type TestAntimagicFieldAuraMembership,
} from "./antimagic-field.test-support.ts";
import { battleActUnitPresentation } from "./battle-act-composition.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-magic-suppression-action-interdiction
import { classLevel, Hp, NonNegativeInteger } from "@dnd/shared/types";
import { Result } from "effect";
import { describe, expect, it } from "vitest";
import { isCharacterBattleCreatureState } from "./battle-reducer/creature-state.ts";
import { battleProcedureExecutionRef } from "./identity.ts";

import {
  clericChannelDivinityUnitId,
  clericPreserveLifeUnitId,
  healingWordUnitId,
  rayOfFrostUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  maybeBonusSpellAct,
  maybeSpellAct,
  spellAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { characterCreature } from "./unit-profile-admission-creature-fixture.test-support.ts";
import { characterBattleFeatureInitForTest } from "./battle-runtime.test-support.ts";
import {
  battleAreaId,
  battleId,
  battleUnitRefWithSupportProfiles,
  combatantId,
  discoverBattleActs,
  startBattle,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  type BattleState,
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
  it(
    "replays action spell, Bonus Action spell, Reaction spell, and Magic Action interdiction",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-magic-suppression-action-interdiction.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createAntimagicActionInterdictionDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(3),
        stateCheck: antimagicActionInterdictionStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function createAntimagicActionInterdictionDriver() {
  return defineDriver(antimagicActionInterdictionDriverSchema, () => {
    let projection = initProjection();
    const actionHandlers = {
      doBlockDiscoveryInsideAura() {
        projection = discoveryProjection(
          activeAntimagicAuraSession(
            spellInterdictionBattle(),
            magicSuppressionEmanationMembershipForTest({
              sourceCombatantId: spellCasterId,
              originIncluded: true,
              nonOriginCombatantIds: [],
            }),
          ),
          activeAntimagicAuraSession(
            preserveLifeBattle(),
            magicSuppressionEmanationMembershipForTest({
              sourceCombatantId: spellTargetId,
              originIncluded: false,
              nonOriginCombatantIds: [spellCasterId],
            }),
          ),
        );
      },
      doAllowOriginExcluded() {
        projection = discoveryProjection(
          activeAntimagicAuraSession(
            spellInterdictionBattle(),
            magicSuppressionEmanationMembershipForTest({
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
        const act = spellAct({ session: base, spellId: rayOfFrostUnitId });
        projection = invalidProjection(
          resolveBattleSubject({
            state: activeAntimagicAuraSession(
              base,
              magicSuppressionEmanationMembershipForTest({
                sourceCombatantId: spellTargetId,
                originIncluded: false,
                nonOriginCombatantIds: [spellCasterId],
              }),
            ).state,
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
            state: activeAntimagicAuraSession(
              base,
              magicSuppressionEmanationMembershipForTest({
                sourceCombatantId: spellTargetId,
                originIncluded: false,
                nonOriginCombatantIds: [spellCasterId],
              }),
            ).state,
            subject: act.subject,
            fills: [],
          }),
        );
      },
      doRejectTriggeredReactionSpell() {
        projection = invalidProjection(
          resolveBattleSubject({
            state: activeAntimagicAuraSession(
              spellInterdictionBattle(),
              magicSuppressionEmanationMembershipForTest({
                sourceCombatantId: spellCasterId,
                originIncluded: true,
                nonOriginCombatantIds: [],
              }),
            ).state,
            subject: {
              tag: "runtimeCommand",
              actorId: spellCasterId,
              command: "castTriggeredReactionSpell",
              reactorId: spellCasterId,
              procedureRef: requireCounterspellProcedureRef(
                spellInterdictionBattle().state,
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
  spellSession: BattleRuntimeSession,
  magicActionSession: BattleRuntimeSession,
): AntimagicActionInterdictionProjection {
  return {
    actionSpellDiscovered:
      maybeSpellAct({ session: spellSession, spellId: rayOfFrostUnitId }) !==
      undefined,
    bonusActionSpellDiscovered:
      maybeBonusSpellAct({
        session: spellSession,
        spellId: healingWordUnitId,
      }) !== undefined,
    magicActionDiscovered:
      preserveLifeActOrUndefined(magicActionSession) !== undefined,
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

function spellInterdictionBattle(): BattleRuntimeSession {
  return spellBattle({
    cantrips: [spellRecord(rayOfFrostUnitId)],
    preparedSpells: [spellRecord(healingWordUnitId)],
    spellSlots: [
      { spellLevel: 1, count: 1 },
      { spellLevel: 3, count: 1 },
    ],
  });
}

function activeAntimagicAuraSession(
  session: BattleRuntimeSession,
  aura: TestAntimagicFieldAuraMembership,
): BattleRuntimeSession {
  const sourceBefore = session.state.combatants.get(aura.sourceCombatantId);
  if (sourceBefore === undefined) {
    throw new Error("Antimagic Field test source must be in the battle.");
  }
  const state = battleStateWithAllocatedEffectForTest({
    state: session.state,
    ownerId: aura.sourceCombatantId,
    effect: magicSuppressionEmanationEffectTemplateForTest({
      areaId: antimagicFieldAreaId,
      aura,
    }),
  });
  expect(
    Number(state.combatants.get(aura.sourceCombatantId)?.nextEffectOrdinal),
  ).toBe(Number(sourceBefore.nextEffectOrdinal) + 1);
  return battleRuntimeSessionForTest({
    ...session,
    state,
  });
}

function preserveLifeBattle(): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId("antimagic-field-preserve-life-mbt"),
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
        combatantId: secondTargetId,
        displayName: "Second Target",
        initiative: 9,
        currentHp: Hp(3),
        maxHp: Hp(20),
      }),
    ],
  });
  if (Result.isFailure(result)) {
    throw new Error(battleStateInitIssueMessage(result.failure));
  }
  return result.success;
}

function preserveLifeAct(session: BattleRuntimeSession) {
  const act = preserveLifeActOrUndefined(session);
  if (act === undefined) {
    throw new Error("Expected Preserve Life act.");
  }
  return act;
}

function preserveLifeActOrUndefined(session: BattleRuntimeSession) {
  return discoverBattleActs(session).find(
    (act) =>
      act.subject.tag === "unitFeature" &&
      act.subject.actorId === spellCasterId &&
      battleActUnitPresentation(act)?.unitId === clericPreserveLifeUnitId,
  );
}

function preserveLifeUnitRefWithSupport() {
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: parseSharedUnitId(clericPreserveLifeUnitId) },
    unit: preserveLifeUnit,
    classLevels: [{ className: "cleric", level: classLevel(3) }],
  });
  if (Result.isFailure(unitRef)) {
    throw new Error(unitRef.failure.message);
  }
  const support = battleMagicActionHealingPoolSupportForUnit(preserveLifeUnit);
  if (support === null || support === "unsupported") {
    throw new Error("Expected Preserve Life Magic Action support.");
  }
  expect(unitRef.success.supportProfiles).toContainEqual(support);
  return unitRef.success;
}

function requireCounterspellProcedureRef(state: BattleState) {
  const caster = state.combatants.get(spellCasterId);
  if (!isCharacterBattleCreatureState(caster)) {
    throw new Error("Expected the spell caster to be a character.");
  }
  return battleProcedureExecutionRef(
    caster.origin.execution.scopeRef,
    NonNegativeInteger(0),
  );
}
