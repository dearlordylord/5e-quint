import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleStateWithAllocatedEffectForTest,
  resolveBattleSubject,
} from "./battle-runtime.test-support.ts";
import {
  antimagicFieldAuraEffectTemplateForTest,
  antimagicFieldAuraMembershipForTest,
  type TestAntimagicFieldAuraMembership,
} from "./antimagic-field.test-support.ts";
import { battleActUnitPresentation } from "./battle-act-composition.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-antimagic-field-action-interdiction
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  attackBonus,
  classLevel,
  Hp,
  movementFeet,
  Round,
  NonNegativeInteger,
} from "@dnd/shared/types";
import { Result } from "effect";
import { describe, expect, test } from "vitest";

import { parseBattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import { removeBattleCombatants } from "./battle-reducer/api-lifecycle.ts";
import { isCharacterBattleCreatureState } from "./battle-reducer/creature-state.ts";
import { characterExecutionWithSpiritualWeaponRepeatAttack } from "./character-execution-admission.ts";
import {
  allocateBattleEffectExecutionRefForCreature,
  type BattleActiveEffectOccurrenceTemplate,
} from "./effect-execution-ref.ts";
import {
  battleProcedureExecutionRef,
  type BattleProcedureExecutionRef,
} from "./identity.ts";
import {
  clericChannelDivinityUnitId,
  clericPreserveLifeUnitId,
  flameBladeUnitId,
  healingWordUnitId,
  levitateUnitId,
  rayOfFrostUnitId,
  spellCasterId,
  spellTargetId,
  spiritualWeaponUnitId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  bonusSpellAct,
  knownWillingSpellTargetFill,
  maybeBonusSpellAct,
  maybeSpellAct,
  spellAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  characterCreature,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { characterBattleFeatureInitForTest } from "./battle-runtime.test-support.ts";
import {
  battleAreaId,
  battleId,
  battleTablePositionId,
  battleUnitRefWithSupportProfiles,
  combatantId,
  discoverBattleActs,
  endTurn,
  startBattle,
  type BattleFill,
  type BattleHole,
  type BattleRuntimeSession,
  type BattleState,
} from "./index.ts";
import { battleMagicActionHealingPoolSupportForUnit } from "./unit-feature-support.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";

const antimagicFieldAreaId = battleAreaId(
  "unit-profile-antimagic-action-interdiction-area",
);
const secondTargetId = combatantId("antimagic-action-second-target");
const preserveLifeUnit = unitLibrary.requireUnit(clericPreserveLifeUnitId);
const channelDivinityUnit = unitLibrary.requireUnit(
  clericChannelDivinityUnitId,
);
const preserveLifeUnitRef = preserveLifeUnitRefWithSupport();

describe("Antimagic Field action interdiction", () => {
  test("origin-included aura blocks action and Bonus Action spell discovery", () => {
    const session = activeAntimagicAuraSession(
      spellInterdictionBattle(),
      antimagicFieldAuraMembershipForTest({
        sourceCombatantId: spellCasterId,
        originIncluded: true,
        nonOriginCombatantIds: [],
      }),
    );

    expect(
      maybeSpellAct({ session, spellId: rayOfFrostUnitId }),
    ).toBeUndefined();
    expect(
      maybeBonusSpellAct({ session, spellId: healingWordUnitId }),
    ).toBeUndefined();
  });

  test("origin-excluded aura does not block the origin creature", () => {
    const session = activeAntimagicAuraSession(
      spellInterdictionBattle(),
      antimagicFieldAuraMembershipForTest({
        sourceCombatantId: spellCasterId,
        originIncluded: false,
        nonOriginCombatantIds: [],
      }),
    );

    expect(maybeSpellAct({ session, spellId: rayOfFrostUnitId })).toBeDefined();
    expect(
      maybeBonusSpellAct({ session, spellId: healingWordUnitId }),
    ).toBeDefined();
  });

  test("non-origin aura membership blocks the current actor without geometry state", () => {
    const session = activeAntimagicAuraSession(
      spellInterdictionBattle(),
      antimagicFieldAuraMembershipForTest({
        sourceCombatantId: spellTargetId,
        originIncluded: false,
        nonOriginCombatantIds: [spellCasterId],
      }),
    );

    expect(
      maybeSpellAct({ session, spellId: rayOfFrostUnitId }),
    ).toBeUndefined();
  });

  test("stale spell subjects are rejected when refreshed membership puts the caster inside", () => {
    const base = spellInterdictionBattle();
    const act = spellAct({ session: base, spellId: rayOfFrostUnitId });
    const stale = activeAntimagicAuraSession(
      base,
      antimagicFieldAuraMembershipForTest({
        sourceCombatantId: spellTargetId,
        originIncluded: false,
        nonOriginCombatantIds: [spellCasterId],
      }),
    );

    const result = resolveBattleSubject({
      state: stale.state,
      subject: act.subject,
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Spellcasting is blocked inside an Antimagic Field aura.",
    });
  });

  test("interdicts non-spell Magic Action feature discovery and stale resolution", () => {
    const base = preserveLifeBattle();
    const act = preserveLifeAct(base);
    const stale = activeAntimagicAuraSession(
      base,
      antimagicFieldAuraMembershipForTest({
        sourceCombatantId: spellTargetId,
        originIncluded: false,
        nonOriginCombatantIds: [spellCasterId],
      }),
    );

    expect(preserveLifeActOrUndefined(stale)).toBeUndefined();
    expect(
      resolveBattleSubject({
        state: stale.state,
        subject: act.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Magic Action is blocked inside an Antimagic Field aura.",
    });
  });

  test("interdicts non-spell action-spell Magic Action discovery and stale resolution", () => {
    const base = flameBladeAttackBattle();
    const attack = spellAct({ session: base, spellId: flameBladeUnitId });
    const stale = activeAntimagicAuraSession(
      base,
      antimagicFieldAuraMembershipForTest({
        sourceCombatantId: spellTargetId,
        originIncluded: false,
        nonOriginCombatantIds: [spellCasterId],
      }),
    );

    expect(
      maybeSpellAct({ session: stale, spellId: flameBladeUnitId }),
    ).toBeUndefined();
    expect(
      resolveBattleSubject({
        state: stale.state,
        subject: attack.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Magic Action is blocked inside an Antimagic Field aura.",
    });
  });

  test("does not interdict non-spell Bonus Action spell-effect discovery or stale resolution", () => {
    const base = spiritualWeaponRepeatBattle();
    const repeat = bonusSpellAct({
      session: base,
      spellId: spiritualWeaponUnitId,
    });
    const stale = activeAntimagicAuraSession(
      base,
      antimagicFieldAuraMembershipForTest({
        sourceCombatantId: spellTargetId,
        originIncluded: false,
        nonOriginCombatantIds: [spellCasterId],
      }),
    );

    expect(
      maybeBonusSpellAct({ session: stale, spellId: spiritualWeaponUnitId }),
    ).toBeDefined();
    expect(
      resolveBattleSubject({
        state: stale.state,
        subject: repeat.subject,
        fills: [],
      }),
    ).not.toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Magic Action is blocked inside an Antimagic Field aura.",
    });
  });

  test("interdicts runtime-command Magic Action discovery and stale resolution", () => {
    const base = levitateCasterControlBattle();
    const altitudeAct = levitateAltitudeControlAct(base);
    const stale = activeAntimagicAuraSession(
      base,
      antimagicFieldAuraMembershipForTest({
        sourceCombatantId: spellTargetId,
        originIncluded: false,
        nonOriginCombatantIds: [spellCasterId],
      }),
    );

    expect(
      discoverBattleActs(stale).some(
        (candidate) =>
          candidate.subject.tag === "runtimeCommand" &&
          candidate.subject.command === "levitateAltitudeControl",
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: stale.state,
        subject: altitudeAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Magic Action is blocked inside an Antimagic Field aura.",
    });
  });

  test("interdicts stale triggered Reaction spell subjects", () => {
    const session = activeAntimagicAuraSession(
      spellInterdictionBattle(),
      antimagicFieldAuraMembershipForTest({
        sourceCombatantId: spellCasterId,
        originIncluded: true,
        nonOriginCombatantIds: [],
      }),
    );

    const result = resolveBattleSubject({
      state: session.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "castTriggeredReactionSpell",
        reactorId: spellCasterId,
        procedureRef: requireCounterspellProcedureRef(session.state),
      },
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Spellcasting is blocked inside an Antimagic Field aura.",
    });
  });

  test("combatant removal prunes removed non-origin members without dropping the aura witness", () => {
    const session = activeAntimagicAuraSession(
      preserveLifeBattle(),
      antimagicFieldAuraMembershipForTest({
        sourceCombatantId: spellCasterId,
        originIncluded: true,
        nonOriginCombatantIds: [spellTargetId, secondTargetId],
      }),
    );

    const removed = removeBattleCombatants({
      state: session.state,
      combatantIds: [spellTargetId],
    });

    expect(Result.isSuccess(removed)).toBe(true);
    if (Result.isFailure(removed)) {
      throw new Error(battleStateInitIssueMessage(removed.failure));
    }
    expect(
      removed.success.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "antimagicFieldOngoingSpellSuppression",
        auraMembership: {
          kind: "antimagicFieldAuraMembership",
          originIncluded: true,
          nonOriginCombatantIds: [secondTargetId],
        },
      }),
    );
    expect(
      preserveLifeActOrUndefined(
        battleRuntimeSessionForTest({ ...session, state: removed.success }),
      ),
    ).toBeUndefined();
  });
});

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

function flameBladeAttackBattle(): BattleRuntimeSession {
  const session = spellBattle({
    preparedSpells: [spellRecord(flameBladeUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    targetHp: 20,
    targetMaxHp: 20,
  });
  const cast = resolveBattleSubject({
    state: session.state,
    subject: bonusSpellAct({
      session,
      spellId: flameBladeUnitId,
      slotLevel: 2,
    }).subject,
    fills: [],
  });
  if (cast.tag !== "resolved") {
    throw new Error("Expected Flame Blade held object to resolve.");
  }
  return battleRuntimeSessionForTest({ ...session, state: cast.state });
}

function spiritualWeaponRepeatBattle(): BattleRuntimeSession {
  const session = spellBattle({
    preparedSpells: [spellRecord(spiritualWeaponUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
  const caster = session.state.combatants.get(spellCasterId);
  if (!isCharacterBattleCreatureState(caster)) {
    throw new Error("Expected Spiritual Weapon caster combatant.");
  }
  const sourceBinding = caster.origin.execution.procedureBindings.find(
    (binding) =>
      binding.procedure.kind === "spellInvocation" &&
      binding.procedure.execution.procedure === "spiritualWeaponAttackProxy",
  );
  if (
    sourceBinding?.procedure.kind !== "spellInvocation" ||
    sourceBinding.procedure.execution.procedure !== "spiritualWeaponAttackProxy"
  ) {
    throw new Error("Expected Spiritual Weapon source procedure binding.");
  }
  const effectAllocation = allocateBattleEffectExecutionRefForCreature({
    owner: caster,
  });
  const activeEffect = {
    ...spiritualWeaponActiveEffectTemplate(sourceBinding.procedureRef),
    effectRef: effectAllocation.effectRef,
  };
  expect(Number(effectAllocation.owner.nextEffectOrdinal)).toBe(
    Number(caster.nextEffectOrdinal) + 1,
  );
  const execution = characterExecutionWithSpiritualWeaponRepeatAttack(
    caster.origin.execution,
    {
      procedure: "spiritualWeaponRepeatAttack",
      activeEffectRef: activeEffect.effectRef,
      activeEffectSourceProcedureRef: sourceBinding.procedureRef,
    },
  );
  return battleRuntimeSessionForTest({
    ...session,
    state: {
      ...session.state,
      combatants: new Map(session.state.combatants).set(spellCasterId, {
        ...effectAllocation.owner,
        activeEffects: [...caster.activeEffects, activeEffect],
        origin: { ...caster.origin, execution },
      }),
    },
  });
}

function spiritualWeaponActiveEffectTemplate(
  sourceProcedureRef: BattleProcedureExecutionRef,
): Extract<
  BattleActiveEffectOccurrenceTemplate,
  { readonly kind: "spiritualWeapon" }
> {
  const sourceSpellLevel = parseBattleSpellEffectLevel(2);
  if (sourceSpellLevel === null) {
    throw new Error("Expected valid Spiritual Weapon spell effect level.");
  }
  return {
    kind: "spiritualWeapon",
    sourceProcedureRef,
    sourceCombatantId: spellCasterId,
    sourceSpellLevel,
    forcePositionId: battleTablePositionId(
      "antimagic-action-spiritual-weapon-force",
    ),
    forceReachFeet: movementFeet(5),
    repeatMoveMaxFeet: movementFeet(20),
    repeatTargeting: { kind: "unrestricted" },
    startedOn: {
      actorId: spellTargetId,
      round: Round(1),
    },
    damage: {
      kind: "fixedSpellAttackDamage",
      expr: { dice: 1, dieSize: 8, flat: 3 },
      damageType: "force",
    },
    attackKind: "melee_spell_attack",
    attackBonus: attackBonus(5),
    expiresAt: {
      kind: "concentration",
      combatantId: spellCasterId,
      durationTicks: elapsedTimeTicks(600),
    },
  };
}

function levitateCasterControlBattle(): BattleRuntimeSession {
  const spell = spellRecord(levitateUnitId);
  const session = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 2 }],
  });
  const act = spellAct({
    session,
    spellId: levitateUnitId,
    slotLevel: 2,
  });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const needsInitialRise = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      knownWillingSpellTargetFill(
        targetHole,
        levitateUnitId,
        spellCasterId,
        spellTargetId,
      ),
    ],
  });
  if (needsInitialRise.tag !== "needsHoles") {
    throw new Error("Expected Levitate initial-rise hole.");
  }
  const initialRiseHole = requireHole(
    needsInitialRise.holes,
    "levitateInitialRise",
  );
  const cast = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      knownWillingSpellTargetFill(
        targetHole,
        levitateUnitId,
        spellCasterId,
        spellTargetId,
      ),
      levitateInitialRiseFill(initialRiseHole, 20),
    ],
  });
  if (cast.tag !== "resolved") {
    throw new Error("Expected Levitate to resolve.");
  }
  const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected caster end turn.");
  }
  const nextCasterTurn = endTurn({
    state: targetTurn.state,
    actorId: spellTargetId,
  });
  if (nextCasterTurn.tag !== "resolved") {
    throw new Error("Expected target end turn.");
  }
  return battleRuntimeSessionForTest({
    ...session,
    state: nextCasterTurn.state,
  });
}

function levitateAltitudeControlAct(session: BattleRuntimeSession) {
  const act = discoverBattleActs(session).find(
    (candidate) =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "levitateAltitudeControl",
  );
  if (act === undefined) {
    throw new Error("Expected Levitate altitude control act.");
  }
  return act;
}

function levitateInitialRiseFill(
  hole: Extract<BattleHole, { readonly kind: "levitateInitialRise" }>,
  distanceFeet: number,
): Extract<BattleFill, { readonly kind: "levitateInitialRise" }> {
  return {
    kind: "levitateInitialRise",
    holeId: hole.holeId,
    value: { distanceFeet: movementFeet(distanceFeet) },
  };
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
    effect: antimagicFieldAuraEffectTemplateForTest({
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
    battleId: battleId("antimagic-field-preserve-life"),
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
