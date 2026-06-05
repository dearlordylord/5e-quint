// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-antimagic-field-action-interdiction
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.ANTIMAGIC_FIELD_ACTION_INTERDICTION
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  attackBonus,
  classLevel,
  Hp,
  movementFeet,
  Round,
} from "@dnd/shared/types";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import { parseBattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import {
  antimagicFieldUnitId,
  clericChannelDivinityUnitId,
  clericPreserveLifeUnitId,
  counterspellUnitId,
  flameBladeUnitId,
  healingWordUnitId,
  levitateUnitId,
  oppositionSide,
  partySide,
  rayOfFrostUnitId,
  spellCasterId,
  spellTargetId,
  spiritualWeaponUnitId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  bonusSpellAct,
  knownWillingSpellTargetFill,
  maybeBonusSpellAct,
  maybeSpellAct,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import {
  characterCreature,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  battleAreaId,
  battleId,
  battleSpellEffectOccurrenceId,
  battleTablePositionId,
  battleUnitRefWithSupportProfiles,
  combatantId,
  discoverBattleActs,
  endTurn,
  resolveBattleSubject,
  removeBattleCombatants,
  spellSlotInvocationRef,
  startBattle,
  type BattleActiveEffect,
  type BattleAntimagicFieldAuraMembership,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type CombatantId,
} from "./index.ts";
import { battleMagicActionHealingPoolSupportForUnit } from "./unit-feature-support.ts";

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
    const state = activeAntimagicAuraState(
      spellInterdictionBattle(),
      auraMembership({
        sourceCombatantId: spellCasterId,
        originIncluded: true,
        nonOriginCombatantIds: [],
      }),
    );

    expect(maybeSpellAct({ state, spellId: rayOfFrostUnitId })).toBeUndefined();
    expect(
      maybeBonusSpellAct({ state, spellId: healingWordUnitId }),
    ).toBeUndefined();
  });

  test("origin-excluded aura does not block the origin creature", () => {
    const state = activeAntimagicAuraState(
      spellInterdictionBattle(),
      auraMembership({
        sourceCombatantId: spellCasterId,
        originIncluded: false,
        nonOriginCombatantIds: [],
      }),
    );

    expect(maybeSpellAct({ state, spellId: rayOfFrostUnitId })).toBeDefined();
    expect(
      maybeBonusSpellAct({ state, spellId: healingWordUnitId }),
    ).toBeDefined();
  });

  test("non-origin aura membership blocks the current actor without geometry state", () => {
    const state = activeAntimagicAuraState(
      spellInterdictionBattle(),
      auraMembership({
        sourceCombatantId: spellTargetId,
        originIncluded: false,
        nonOriginCombatantIds: [spellCasterId],
      }),
    );

    expect(maybeSpellAct({ state, spellId: rayOfFrostUnitId })).toBeUndefined();
  });

  test("stale spell subjects are rejected when refreshed membership puts the caster inside", () => {
    const base = spellInterdictionBattle();
    const act = spellAct({ state: base, spellId: rayOfFrostUnitId });
    const stale = activeAntimagicAuraState(
      base,
      auraMembership({
        sourceCombatantId: spellTargetId,
        originIncluded: false,
        nonOriginCombatantIds: [spellCasterId],
      }),
    );

    const result = resolveBattleSubject({
      state: stale,
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
    const stale = activeAntimagicAuraState(
      base,
      auraMembership({
        sourceCombatantId: spellTargetId,
        originIncluded: false,
        nonOriginCombatantIds: [spellCasterId],
      }),
    );

    expect(preserveLifeActOrUndefined(stale)).toBeUndefined();
    expect(
      resolveBattleSubject({ state: stale, subject: act.subject, fills: [] }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Magic Action is blocked inside an Antimagic Field aura.",
    });
  });

  test("interdicts non-spell action-spell Magic Action discovery and stale resolution", () => {
    const base = flameBladeAttackBattle();
    const attack = spellAct({ state: base, spellId: flameBladeUnitId });
    const stale = activeAntimagicAuraState(
      base,
      auraMembership({
        sourceCombatantId: spellTargetId,
        originIncluded: false,
        nonOriginCombatantIds: [spellCasterId],
      }),
    );

    expect(
      maybeSpellAct({ state: stale, spellId: flameBladeUnitId }),
    ).toBeUndefined();
    expect(
      resolveBattleSubject({
        state: stale,
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
      state: base,
      spellId: spiritualWeaponUnitId,
    });
    const stale = activeAntimagicAuraState(
      base,
      auraMembership({
        sourceCombatantId: spellTargetId,
        originIncluded: false,
        nonOriginCombatantIds: [spellCasterId],
      }),
    );

    expect(
      maybeBonusSpellAct({ state: stale, spellId: spiritualWeaponUnitId }),
    ).toBeDefined();
    expect(
      resolveBattleSubject({
        state: stale,
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
    const stale = activeAntimagicAuraState(
      base,
      auraMembership({
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
        state: stale,
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
    const state = activeAntimagicAuraState(
      spellInterdictionBattle(),
      auraMembership({
        sourceCombatantId: spellCasterId,
        originIncluded: true,
        nonOriginCombatantIds: [],
      }),
    );

    const result = resolveBattleSubject({
      state,
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
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Spellcasting is blocked inside an Antimagic Field aura.",
    });
  });

  test("combatant removal prunes removed non-origin members without dropping the aura witness", () => {
    const state = activeAntimagicAuraState(
      preserveLifeBattle(),
      auraMembership({
        sourceCombatantId: spellCasterId,
        originIncluded: true,
        nonOriginCombatantIds: [spellTargetId, secondTargetId],
      }),
    );

    const removed = removeBattleCombatants({
      state,
      combatantIds: [spellTargetId],
    });

    expect(Either.isRight(removed)).toBe(true);
    if (Either.isLeft(removed)) {
      throw new Error(removed.left.message);
    }
    expect(
      removed.right.combatants.get(spellCasterId)?.activeEffects,
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
    expect(preserveLifeActOrUndefined(removed.right)).toBeUndefined();
  });
});

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

function flameBladeAttackBattle(): BattleState {
  const state = spellBattle({
    preparedSpells: [spellRecord(flameBladeUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    targetHp: 20,
    targetMaxHp: 20,
  });
  const cast = resolveBattleSubject({
    state,
    subject: bonusSpellAct({
      state,
      spellId: flameBladeUnitId,
      slotLevel: 2,
    }).subject,
    fills: [],
  });
  if (cast.tag !== "resolved") {
    throw new Error("Expected Flame Blade held object to resolve.");
  }
  return cast.state;
}

function spiritualWeaponRepeatBattle(): BattleState {
  const state = spellBattle({
    preparedSpells: [spellRecord(spiritualWeaponUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
  const caster = state.combatants.get(spellCasterId);
  if (caster === undefined) {
    throw new Error("Expected Spiritual Weapon caster combatant.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...caster,
      activeEffects: [...caster.activeEffects, spiritualWeaponActiveEffect()],
    }),
  };
}

function spiritualWeaponActiveEffect(): Extract<
  BattleActiveEffect,
  { readonly kind: "spiritualWeapon" }
> {
  const sourceSpellLevel = parseBattleSpellEffectLevel(2);
  if (sourceSpellLevel === null) {
    throw new Error("Expected valid Spiritual Weapon spell effect level.");
  }
  return {
    kind: "spiritualWeapon",
    sourceEffectId: battleSpellEffectOccurrenceId(
      "antimagic-action-spiritual-weapon",
    ),
    sourceSpellId: spiritualWeaponUnitId,
    sourceCombatantId: spellCasterId,
    sourceSpellLevel,
    forcePositionId: battleTablePositionId(
      "antimagic-action-spiritual-weapon-force",
    ),
    forceReachFeet: movementFeet(5),
    repeatMoveMaxFeet: movementFeet(20),
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

function levitateCasterControlBattle(): BattleState {
  const spell = spellRecord(levitateUnitId);
  const state = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 2 }],
  });
  const act = spellAct({ state, spellId: levitateUnitId, slotLevel: 2 });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const needsInitialRise = resolveBattleSubject({
    state,
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
    state,
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
  return nextCasterTurn.state;
}

function levitateAltitudeControlAct(state: BattleState) {
  const act = discoverBattleActs(state).find(
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
    battleId: battleId("antimagic-field-preserve-life"),
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
