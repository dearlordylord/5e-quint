// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT14 acid_splash magic_missile ray_of_frost
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV28B inflict_wounds poison_spray sacred_flame
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV89A chill_touch
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV28D guiding_bolt ray_of_sickness shocking_grasp vicious_mockery
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV29A burning_hands
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV54 fireball
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV55 shatter
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-MIND-SPIKE mind_spike
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-SPELL-LIGHTNING-BOLT-RUNTIME-SURVEY lightning_bolt
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-damage-save-or-attack
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { describe, expect, test } from "vitest";
import {
  acidSplashUnitId,
  burningHandsUnitId,
  chillTouchUnitId,
  fireballUnitId,
  guidingBoltUnitId,
  inflictWoundsUnitId,
  lightningBoltUnitId,
  magicMissileUnitId,
  mindSpikeDurationTicks,
  mindSpikeUnitId,
  poisonSprayUnitId,
  rayOfFrostUnitId,
  rayOfSicknessUnitId,
  sacredFlameUnitId,
  shockingGraspUnitId,
  shatterUnitId,
  spellCasterId,
  spellTargetId,
  viciousMockeryUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  maybeSpellAct,
  savingThrowOutcomeFill,
  spellAct,
  spellActInvocation,
  spellHoleInvocation,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleObjectId,
  cantripSpellInvocationRef,
  combatantId,
  Hp,
  resolveBattleSubject,
  snapshotBattle,
  spellId,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";
import type {
  ActivationPhase,
  BattleFill,
  BattleHole,
  BattleObjectDamageDisposition,
  BattleObjectIgnitionDisposition,
  CombatantId,
  EffectAtom,
} from "./unit-profile-admission-test-support.ts";
import { tickDurationEffects } from "./battle-reducer/turn-end-movement.ts";

const fireballObjectId = battleObjectId("unit-profile-fireball-object");

describe("QMBT14 deterministic damage Spell Unit admission", () => {
  test("magic_missile is admitted through catalog spell access and projected as a prepared slot spell", () => {
    const spell = spellRecord(magicMissileUnitId);
    const act = spellAct({
      state: spellBattle({ preparedSpells: [spell] }),
      spellId: magicMissileUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "magic_missile",
        1,
        "repeatedDamageAllocation",
      ),
      mode: { tag: "cast" },
    });
    expect(spellActInvocation(act)).toEqual(
      expect.objectContaining({
        procedure: "repeatedDamageAllocation",
        spell,
        resource: { tag: "spellSlot", slotLevel: 1 },
        targeting: {
          kind: "repeatedEffectTargetAllocation",
          repeatedEffectCount: 3,
        },
        damage: {
          expr: { dice: 1, dieSize: 4, flat: 1 },
          damageType: "force",
        },
        rangeFeet: 120,
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "spellTargetAllocation",
        allocationCount: 3,
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
  });
  test("ray_of_frost is admitted through catalog spell access and projected as a cantrip spell attack", () => {
    const spell = spellRecord(rayOfFrostUnitId);
    const act = spellAct({
      state: spellBattle({ cantrips: [spell] }),
      spellId: rayOfFrostUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    });
    expect(spell.mechanics.family).toBe("activation");
    expect(spell.mechanics.level).toBe(0);
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
  });
  test("acid_splash is admitted through catalog spell access and projected as a save-gated cantrip", () => {
    const spell = spellRecord(acidSplashUnitId);
    const act = spellAct({
      state: spellBattle({ cantrips: [spell] }),
      spellId: acidSplashUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
      mode: { tag: "cast" },
    });
    expect(spellActInvocation(act)).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        spell,
        ability: "dex",
        targeting: {
          kind: "pointOriginSphere",
          radiusFeet: 5,
        },
        damage: {
          expr: { dice: 1, dieSize: 6 },
          damageType: "acid",
        },
        successDamage: "none",
        rangeFeet: 60,
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "savingThrowOutcome",
        areaChoices: [],
        targetRollModes: [],
      }),
    ]);
  });
  test("poison_spray is admitted through catalog spell access and projected as a pure damage cantrip spell attack", () => {
    const spell = spellRecord(poisonSprayUnitId);
    const act = spellAct({
      state: spellBattle({ cantrips: [spell] }),
      spellId: poisonSprayUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef(
        "poison_spray",
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    });
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: spellBattle({ cantrips: [spell] }),
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            poisonSprayUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "attackRoll",
    );
    expect(spellHoleInvocation([attackRoll])).toEqual(
      expect.objectContaining({
        procedure: "spellAttackDamage",
        spell,
        targeting: { kind: "singleCombatant" },
        damage: {
          kind: "fixedSpellAttackDamage",
          expr: { dice: 1, dieSize: 12 },
          damageType: "poison",
        },
        rangeFeet: 30,
        postDamageRiders: [],
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
  });
  test("chill_touch is admitted as creature-or-object melee spell attack with Hit Point regain prevention rider", () => {
    const spell = spellRecord(chillTouchUnitId);
    const act = spellAct({
      state: spellBattle({ cantrips: [spell] }),
      spellId: chillTouchUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef("chill_touch", "spellAttackDamage"),
      mode: { tag: "cast" },
    });
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: spellBattle({ cantrips: [spell] }),
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            chillTouchUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "attackRoll",
    );
    expect(spellHoleInvocation([attackRoll])).toEqual(
      expect.objectContaining({
        procedure: "spellAttackDamage",
        spell,
        targeting: { kind: "singleCreatureOrObject" },
        damage: {
          kind: "fixedSpellAttackDamage",
          expr: { dice: 1, dieSize: 10 },
          damageType: "necrotic",
        },
        rangeFeet: 5,
        attackKind: "melee_spell_attack",
        postDamageRiders: [
          {
            kind: "hitPointRegainPrevented",
            expiresAt: "endOfCasterNextTurn",
          },
        ],
        objectHitEffect: { kind: "none" },
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
      expect.objectContaining({
        kind: "objectTargetChoice",
        requiresTableSpatialFact: true,
      }),
    ]);
  });
  test("shocking_grasp is admitted as melee spell attack with Opportunity Attack denial rider", () => {
    const spell = spellRecord(shockingGraspUnitId);
    const act = spellAct({
      state: spellBattle({ cantrips: [spell] }),
      spellId: shockingGraspUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef(
        "shocking_grasp",
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    });
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: spellBattle({ cantrips: [spell] }),
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            shockingGraspUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "attackRoll",
    );
    expect(spellHoleInvocation([attackRoll])).toEqual(
      expect.objectContaining({
        procedure: "spellAttackDamage",
        spell,
        attackKind: "melee_spell_attack",
        damage: {
          kind: "fixedSpellAttackDamage",
          expr: { dice: 1, dieSize: 8 },
          damageType: "lightning",
        },
        postDamageRiders: [
          {
            kind: "opportunityAttackDenied",
            expiresAt: "startOfTargetNextTurn",
          },
        ],
      }),
    );
  });
  test("guiding_bolt is admitted as ranged spell attack with next attack Advantage rider", () => {
    const spell = spellRecord(guidingBoltUnitId);
    const act = spellAct({
      state: spellBattle({ preparedSpells: [spell] }),
      spellId: guidingBoltUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "guiding_bolt",
        1,
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    });
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: spellBattle({ preparedSpells: [spell] }),
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            guidingBoltUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "attackRoll",
    );
    expect(spellHoleInvocation([attackRoll])).toEqual(
      expect.objectContaining({
        procedure: "spellAttackDamage",
        spell,
        attackKind: "ranged_spell_attack",
        damage: {
          kind: "fixedSpellAttackDamage",
          expr: { dice: 4, dieSize: 6 },
          damageType: "radiant",
        },
        postDamageRiders: [
          {
            kind: "nextAttackRollAgainstTarget",
            mode: "advantage",
            expiresAt: "endOfCasterNextTurn",
          },
        ],
      }),
    );
  });
  test("ray_of_sickness is admitted as ranged spell attack with Poisoned rider", () => {
    const spell = spellRecord(rayOfSicknessUnitId);
    const act = spellAct({
      state: spellBattle({ preparedSpells: [spell] }),
      spellId: rayOfSicknessUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "ray_of_sickness",
        1,
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    });
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: spellBattle({ preparedSpells: [spell] }),
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            rayOfSicknessUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "attackRoll",
    );
    expect(spellHoleInvocation([attackRoll])).toEqual(
      expect.objectContaining({
        procedure: "spellAttackDamage",
        spell,
        attackKind: "ranged_spell_attack",
        damage: {
          kind: "fixedSpellAttackDamage",
          expr: { dice: 2, dieSize: 8 },
          damageType: "poison",
        },
        postDamageRiders: [
          {
            kind: "condition",
            condition: "poisoned",
            expiresAt: "endOfCasterNextTurn",
          },
        ],
      }),
    );
  });
  test("vicious_mockery is admitted as save-gated cantrip with next attack Disadvantage rider", () => {
    const spell = spellRecord(viciousMockeryUnitId);
    const act = spellAct({
      state: spellBattle({ cantrips: [spell] }),
      spellId: viciousMockeryUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef(
        "vicious_mockery",
        "saveGatedDamage",
      ),
      mode: { tag: "cast" },
    });
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: spellBattle({ cantrips: [spell] }),
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            viciousMockeryUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "savingThrowOutcome",
    );
    expect(spellHoleInvocation([savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        spell,
        ability: "wis",
        targeting: { kind: "singleCombatant" },
        damage: {
          expr: { dice: 1, dieSize: 6 },
          damageType: "psychic",
        },
        successDamage: "none",
        failedSavePostDamageRiders: [
          {
            kind: "nextAttackRollByTarget",
            mode: "disadvantage",
            expiresAt: "endOfTargetNextTurn",
          },
        ],
      }),
    );
  });
  test("spell rider timing is admitted by effect shape, not authored identity", () => {
    const genericPoisonRay = {
      ...spellRecord(rayOfSicknessUnitId),
      id: "generic_poison_ray",
      name: "Generic Poison Ray",
      provenance: {
        kind: "srd-5.2.1" as const,
        section: "Spells/Descriptions-Q-R#Generic Poison Ray",
      },
    };
    const genericOpportunityAttackDenial = {
      ...spellRecord(shockingGraspUnitId),
      id: "generic_opportunity_attack_denial",
      name: "Generic Opportunity Attack Denial",
      provenance: {
        kind: "srd-5.2.1" as const,
        section: "Spells/Descriptions-S-Z#Generic Opportunity Attack Denial",
      },
    };
    const genericNextAttackAdvantage = {
      ...spellRecord(guidingBoltUnitId),
      id: "generic_next_attack_advantage",
      name: "Generic Next Attack Advantage",
      provenance: {
        kind: "srd-5.2.1" as const,
        section: "Spells/Descriptions-E-L#Generic Next Attack Advantage",
      },
    };
    const mockery = spellRecord(viciousMockeryUnitId);
    if (mockery.mechanics.family !== "activation") {
      throw new Error("Expected Vicious Mockery activation fixture.");
    }
    const mockeryPhase = mockery.mechanics.phases[0];
    if (
      mockeryPhase?.kind !== "save_gate" ||
      mockeryPhase.onFail.kind !== "composite"
    ) {
      throw new Error("Expected Vicious Mockery save-gate composite fixture.");
    }
    const [incomingAttackDisadvantageFirst, ...incomingAttackDisadvantageRest] =
      mockeryPhase.onFail.effects.map(
        (effect): EffectAtom =>
          effect.kind === "modify_roll_advantage"
            ? { ...effect, affects: "rolls_against_self" }
            : effect,
      );
    if (incomingAttackDisadvantageFirst === undefined) {
      throw new Error("Expected Vicious Mockery failed-save effects.");
    }
    const incomingAttackDisadvantageEffects = [
      incomingAttackDisadvantageFirst,
      ...incomingAttackDisadvantageRest,
    ] as const;
    const incomingAttackDisadvantagePhase = {
      ...mockeryPhase,
      onFail: {
        ...mockeryPhase.onFail,
        effects: incomingAttackDisadvantageEffects,
      },
    } satisfies ActivationPhase;
    const genericIncomingAttackDisadvantage = {
      ...mockery,
      id: "generic_incoming_attack_disadvantage",
      mechanics: {
        ...mockery.mechanics,
        phases: [incomingAttackDisadvantagePhase] as const,
      },
    };

    expect(
      maybeSpellAct({
        state: spellBattle({ preparedSpells: [genericPoisonRay] }),
        spellId: genericPoisonRay.id,
      }),
    ).toBeDefined();
    expect(
      maybeSpellAct({
        state: spellBattle({ cantrips: [genericOpportunityAttackDenial] }),
        spellId: genericOpportunityAttackDenial.id,
      }),
    ).toBeDefined();
    expect(
      maybeSpellAct({
        state: spellBattle({ preparedSpells: [genericNextAttackAdvantage] }),
        spellId: genericNextAttackAdvantage.id,
      }),
    ).toBeDefined();
    expect(
      maybeSpellAct({
        state: spellBattle({ cantrips: [genericIncomingAttackDisadvantage] }),
        spellId: genericIncomingAttackDisadvantage.id,
      }),
    ).toBeUndefined();
  });
  test("sacred_flame is admitted through catalog spell access and projected as single-target save-gated cantrip damage", () => {
    const spell = spellRecord(sacredFlameUnitId);
    const act = spellAct({
      state: spellBattle({ cantrips: [spell] }),
      spellId: sacredFlameUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef("sacred_flame", "saveGatedDamage"),
      mode: { tag: "cast" },
    });
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: spellBattle({ cantrips: [spell] }),
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            sacredFlameUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "savingThrowOutcome",
    );
    expect(spellHoleInvocation([savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        spell,
        ability: "dex",
        targeting: { kind: "singleCombatant" },
        damage: {
          expr: { dice: 1, dieSize: 8 },
          damageType: "radiant",
        },
        successDamage: "none",
        rangeFeet: 60,
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
  });
  test("inflict_wounds is admitted through prepared spell access and projected as single-target save-gated slot damage", () => {
    const spell = spellRecord(inflictWoundsUnitId);
    const act = spellAct({
      state: spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 3, count: 1 }],
      }),
      spellId: inflictWoundsUnitId,
      slotLevel: 3,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "inflict_wounds",
        3,
        "saveGatedDamage",
      ),
      mode: { tag: "cast" },
    });
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: spellBattle({
          preparedSpells: [spell],
          spellSlots: [{ spellLevel: 3, count: 1 }],
        }),
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            inflictWoundsUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "savingThrowOutcome",
    );
    expect(spellHoleInvocation([savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        spell,
        resource: { tag: "spellSlot", slotLevel: 3 },
        ability: "con",
        targeting: { kind: "singleCombatant" },
        damage: {
          expr: { dice: 4, dieSize: 10 },
          damageType: "necrotic",
        },
        successDamage: "half",
        rangeFeet: 5,
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
  });
  test("mind_spike is admitted as single-target Wisdom save Psychic slot damage", () => {
    const spell = spellRecord(mindSpikeUnitId);
    const act = spellAct({
      state: spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 3, count: 1 }],
      }),
      spellId: mindSpikeUnitId,
      slotLevel: 3,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(mindSpikeUnitId, 3, "saveGatedDamage"),
      mode: { tag: "cast" },
    });
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: spellBattle({
          preparedSpells: [spell],
          spellSlots: [{ spellLevel: 3, count: 1 }],
        }),
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            mindSpikeUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "savingThrowOutcome",
    );
    expect(spellHoleInvocation([savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        spell,
        resource: { tag: "spellSlot", slotLevel: 3 },
        ability: "wis",
        targeting: { kind: "singleCombatant" },
        damage: {
          expr: { dice: 4, dieSize: 8 },
          damageType: "psychic",
        },
        successDamage: "half",
        rangeFeet: 120,
        failedSavePostDamageRiders: [],
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
  });
  test("mind_spike failed save applies Psychic damage and owns Concentration without duplicate location state", () => {
    const spell = spellRecord(mindSpikeUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const act = spellAct({ state, spellId: mindSpikeUnitId, slotLevel: 2 });
    const targetFill = spellTargetFill(
      requireHole(act.initialHoles, "targetChoice"),
      mindSpikeUnitId,
      spellCasterId,
      spellTargetId,
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill, saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        saveFill,
        damageRollFillWithGroups(damageRoll, [[4, 4, 4]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Mind Spike to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(18);
    expect(
      requireCombatant(resolved.state, spellTargetId).activeEffects,
    ).toEqual([]);
    expect(
      requireCombatant(resolved.state, spellCasterId).concentration,
    ).toEqual({ sourceSpellId: mindSpikeUnitId, effectKind: "spellEffect" });
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toEqual([
      {
        kind: "spellConcentrationDuration",
        sourceCombatantId: spellCasterId,
        sourceSpellId: mindSpikeUnitId,
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: mindSpikeDurationTicks,
        },
      },
    ]);
    expect(
      snapshotBattle(resolved.state).combatants.find(
        (combatant) => combatant.combatantId === spellCasterId,
      )?.origin,
    ).toEqual(
      expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 2, expended: 1 }),
          ]),
        }),
      }),
    );
  });
  test("mind_spike failed-save Concentration expires after its one-hour maximum", () => {
    const spell = spellRecord(mindSpikeUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const act = spellAct({ state, spellId: mindSpikeUnitId, slotLevel: 2 });
    const targetFill = spellTargetFill(
      requireHole(act.initialHoles, "targetChoice"),
      mindSpikeUnitId,
      spellCasterId,
      spellTargetId,
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill, saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        saveFill,
        damageRollFillWithGroups(damageRoll, [[4, 4, 4]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Mind Spike to resolve.");
    }

    const caster = requireCombatant(resolved.state, spellCasterId);
    const nearlyExpiredCombatants = new Map(resolved.state.combatants).set(
      spellCasterId,
      {
        ...caster,
        activeEffects: caster.activeEffects.map((effect) =>
          effect.kind === "spellConcentrationDuration" &&
          effect.sourceSpellId === mindSpikeUnitId &&
          effect.expiresAt.kind === "concentration"
            ? {
                ...effect,
                expiresAt: {
                  ...effect.expiresAt,
                  durationTicks: elapsedTimeTicks(1),
                },
              }
            : effect,
        ),
      },
    );
    const expiredCombatants = tickDurationEffects(nearlyExpiredCombatants);

    expect(expiredCombatants.get(spellCasterId)?.concentration).toBeNull();
    expect(expiredCombatants.get(spellCasterId)?.activeEffects).toEqual([]);
    expect(expiredCombatants.get(spellTargetId)?.activeEffects).toEqual([]);
  });
  test("mind_spike self-target breaks prior Concentration before damage can request a save", () => {
    const spell = spellRecord(mindSpikeUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const caster = requireCombatant(state, spellCasterId);
    const concentratingState = {
      ...state,
      combatants: new Map(state.combatants).set(spellCasterId, {
        ...caster,
        concentration: {
          sourceSpellId: spellId("synthetic_prior_concentration"),
          effectKind: "spellEffect",
        },
      }),
    };
    const act = spellAct({
      state: concentratingState,
      spellId: mindSpikeUnitId,
      slotLevel: 2,
    });
    const targetFill = spellTargetFill(
      requireHole(act.initialHoles, "targetChoice"),
      mindSpikeUnitId,
      spellCasterId,
      spellCasterId,
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: concentratingState,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellCasterId, succeeded: false },
    ]);
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: concentratingState,
        subject: act.subject,
        fills: [targetFill, saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state: concentratingState,
      subject: act.subject,
      fills: [
        targetFill,
        saveFill,
        damageRollFillWithGroups(damageRoll, [[1, 1, 1]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected self-targeted Mind Spike to resolve.");
    }
    expect(
      requireCombatant(resolved.state, spellCasterId).concentration,
    ).toEqual({ sourceSpellId: mindSpikeUnitId, effectKind: "spellEffect" });
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toEqual([
      {
        kind: "spellConcentrationDuration",
        sourceCombatantId: spellCasterId,
        sourceSpellId: mindSpikeUnitId,
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: mindSpikeDurationTicks,
        },
      },
    ]);
  });
  test("mind_spike successful save applies half damage and breaks prior Concentration without starting Mind Spike", () => {
    const spell = spellRecord(mindSpikeUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const caster = requireCombatant(state, spellCasterId);
    const concentratingState = {
      ...state,
      combatants: new Map(state.combatants).set(spellCasterId, {
        ...caster,
        concentration: {
          sourceSpellId: spellId("synthetic_prior_concentration"),
          effectKind: "spellEffect",
        },
      }),
    };
    const act = spellAct({
      state: concentratingState,
      spellId: mindSpikeUnitId,
      slotLevel: 2,
    });
    const targetFill = spellTargetFill(
      requireHole(act.initialHoles, "targetChoice"),
      mindSpikeUnitId,
      spellCasterId,
      spellTargetId,
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: concentratingState,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: true },
    ]);
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: concentratingState,
        subject: act.subject,
        fills: [targetFill, saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state: concentratingState,
      subject: act.subject,
      fills: [
        targetFill,
        saveFill,
        damageRollFillWithGroups(damageRoll, [[4, 4, 4]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Mind Spike to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(24);
    expect(
      requireCombatant(resolved.state, spellCasterId).concentration,
    ).toBeNull();
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toEqual([]);
  });
  test("burning_hands is admitted as a self-origin Cone save-gated slot damage spell", () => {
    const spell = spellRecord(burningHandsUnitId);
    const act = spellAct({
      state: spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      }),
      spellId: burningHandsUnitId,
      slotLevel: 2,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef("burning_hands", 2, "saveGatedDamage"),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Burning Hands self-origin Cone Saving Throw outcomes",
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation([savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        spell,
        resource: { tag: "spellSlot", slotLevel: 2 },
        ability: "dex",
        targeting: { kind: "selfOriginCone", lengthFeet: 15 },
        damage: {
          expr: { dice: 4, dieSize: 6 },
          damageType: "fire",
        },
        successDamage: "half",
        rangeFeet: 0,
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "savingThrowOutcome",
        areaChoices: [],
      }),
    ]);
  });
  test("lightning_bolt is admitted as a self-origin Line save-gated slot damage spell", () => {
    const spell = spellRecord(lightningBoltUnitId);
    const act = spellAct({
      state: spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 4, count: 1 }],
      }),
      spellId: lightningBoltUnitId,
      slotLevel: 4,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        lightningBoltUnitId,
        4,
        "saveGatedDamage",
      ),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Lightning Bolt self-origin Line Saving Throw outcomes",
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation([savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        spell,
        resource: { tag: "spellSlot", slotLevel: 4 },
        ability: "dex",
        targeting: { kind: "selfOriginLine", lengthFeet: 100, widthFeet: 5 },
        damage: {
          expr: { dice: 9, dieSize: 6 },
          damageType: "lightning",
        },
        successDamage: "half",
        rangeFeet: 0,
        failedSavePostDamageRiders: [],
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "savingThrowOutcome",
        areaChoices: [],
      }),
    ]);
  });
  test("lightning_bolt resolves caller-supplied Line targets with full and half damage", () => {
    const secondTargetId = combatantId("unit-profile-lightning-bolt-target-2");
    const spell = spellRecord(lightningBoltUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
      extraTargetIds: [secondTargetId],
    });
    const act = spellAct({
      state,
      spellId: lightningBoltUnitId,
      slotLevel: 3,
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false },
      { targetId: secondTargetId, succeeded: true },
    ]);
    expect(saveFill).toMatchObject({
      value: {
        area: {
          originAnchorId: spellCasterId,
          affectedTargetIds: [spellTargetId, secondTargetId],
        },
      },
    });
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        saveFill,
        damageRollFillWithGroups(damageRoll, [[1, 1, 1, 1, 1, 1, 1, 1]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Lightning Bolt to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(22);
    expect(Number(requireCombatant(resolved.state, secondTargetId).hp)).toBe(8);
    expect(
      snapshotBattle(resolved.state).combatants.find(
        (combatant) => combatant.combatantId === spellCasterId,
      )?.origin,
    ).toEqual(
      expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 3, expended: 1 }),
          ]),
        }),
      }),
    );
  });
  test("fireball is admitted as point-origin Sphere save damage with object ignition facts", () => {
    const spell = spellRecord(fireballUnitId);
    const act = spellAct({
      state: spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 4, count: 1 }],
      }),
      spellId: fireballUnitId,
      slotLevel: 4,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(fireballUnitId, 4, "saveGatedDamage"),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Fireball point-origin Sphere Saving Throw outcomes",
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation([savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        spell,
        resource: { tag: "spellSlot", slotLevel: 4 },
        ability: "dex",
        targeting: { kind: "pointOriginSphere", radiusFeet: 20 },
        damage: {
          expr: { dice: 9, dieSize: 6 },
          damageType: "fire",
        },
        successDamage: "half",
        rangeFeet: 150,
        failedSavePostDamageRiders: [],
        postSaveAreaEffect: { kind: "fireballObjectIgnition" },
      }),
    );
  });
  test("fireball applies area save damage and emits unattended flammable object ignitions", () => {
    const spell = spellRecord(fireballUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      targetHp: 50,
      targetMaxHp: 50,
    });
    const act = spellAct({ state, spellId: fireballUnitId, slotLevel: 3 });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const saveFill = fireballSavingThrowOutcomeFill(
      savingThrow,
      [{ targetId: spellTargetId, succeeded: false }],
      [
        {
          objectId: fireballObjectId,
          disposition: { kind: "flammableUnattended" },
        },
      ],
    );
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        saveFill,
        damageRollFillWithGroups(damageRoll, [[4, 4, 4, 4, 4, 4, 4, 4]]),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      objectIgnitions: [
        {
          kind: "startsBurning",
          objectId: fireballObjectId,
          sourceCombatantId: spellCasterId,
          sourceSpellId: spellId(fireballUnitId),
        },
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Fireball to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(18);
    expect(
      snapshotBattle(resolved.state).combatants.find(
        (combatant) => combatant.combatantId === spellCasterId,
      )?.origin,
    ).toEqual(
      expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 3, expended: 1 }),
          ]),
        }),
      }),
    );
  });
  test("fireball can ignite unattended flammable objects when no creature is caught in the area", () => {
    const spell = spellRecord(fireballUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({ state, spellId: fireballUnitId, slotLevel: 3 });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        fireballSavingThrowOutcomeFill(
          savingThrow,
          [],
          [
            {
              objectId: fireballObjectId,
              disposition: { kind: "flammableUnattended" },
            },
          ],
        ),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      objectIgnitions: [
        {
          kind: "startsBurning",
          objectId: fireballObjectId,
          sourceCombatantId: spellCasterId,
          sourceSpellId: spellId(fireballUnitId),
        },
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Fireball to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(12);
  });
  test("fireball requires explicit object ignition area facts", () => {
    const spell = spellRecord(fireballUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({ state, spellId: fireballUnitId, slotLevel: 3 });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          savingThrowOutcomeFill(savingThrow, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Fireball requires caller-supplied object ignition area facts.",
    });
  });
  test("shatter is admitted as point-origin Sphere save damage", () => {
    const spell = spellRecord(shatterUnitId);
    const act = spellAct({
      state: spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 3, count: 1 }],
      }),
      spellId: shatterUnitId,
      slotLevel: 3,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(shatterUnitId, 3, "saveGatedDamage"),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Shatter point-origin Sphere Saving Throw outcomes",
        ability: "con",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation([savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        spell,
        resource: { tag: "spellSlot", slotLevel: 3 },
        ability: "con",
        targeting: { kind: "pointOriginSphere", radiusFeet: 10 },
        damage: {
          expr: { dice: 4, dieSize: 8 },
          damageType: "thunder",
        },
        successDamage: "half",
        rangeFeet: 60,
        failedSavePostDamageRiders: [],
        saveRollModeRule: {
          kind: "creatureType",
          creatureType: "construct",
          mode: "disadvantage",
        },
        postSaveAreaEffect: { kind: "shatterObjectDamage" },
      }),
    );
  });
  test("shatter marks Constructs with Disadvantage on the save", () => {
    const spell = spellRecord(shatterUnitId);
    const constructId = combatantId("unit-profile-shatter-construct");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      statBlockTargets: [
        {
          combatantId: constructId,
          statBlock: statBlockWithCreatureType("construct"),
          initiative: 9,
        },
      ],
    });
    const act = spellAct({ state, spellId: shatterUnitId, slotLevel: 2 });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");

    expect(savingThrow.targetRollModes).toEqual([
      { targetId: constructId, rollMode: "disadvantage" },
    ]);
  });
  test("shatter applies area save damage with explicit object damage facts", () => {
    const spell = spellRecord(shatterUnitId);
    const secondTargetId = combatantId("unit-profile-shatter-target-2");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      extraTargetIds: [secondTargetId],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const act = spellAct({ state, spellId: shatterUnitId, slotLevel: 2 });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const saveFill = shatterSavingThrowOutcomeFill(
      savingThrow,
      [
        { targetId: spellTargetId, succeeded: false },
        { targetId: secondTargetId, succeeded: true },
      ],
      [],
    );
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [saveFill, damageRollFillWithGroups(damageRoll, [[5, 5, 4]])],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Shatter to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(16);
    expect(Number(requireCombatant(resolved.state, secondTargetId).hp)).toBe(5);
  });
  test("shatter damages supplied nonmagical unattended object facts", () => {
    const spell = spellRecord(shatterUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({ state, spellId: shatterUnitId, slotLevel: 2 });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const objectId = battleObjectId("unit-profile-shatter-vase");
    const saveFill = shatterSavingThrowOutcomeFill(
      savingThrow,
      [],
      [
        {
          objectId,
          disposition: { kind: "hitPoints", hitPoints: Hp(20) },
        },
      ],
    );
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [saveFill, damageRollFillWithGroups(damageRoll, [[5, 5, 4]])],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId,
          damageType: "thunder",
          rolledDamage: 14,
          effectiveDamage: 14,
          priorHitPoints: 20,
          nextHitPoints: 6,
          destroyed: false,
        },
      ],
    });
  });
  test("shatter requires explicit object damage area facts", () => {
    const spell = spellRecord(shatterUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({ state, spellId: shatterUnitId, slotLevel: 2 });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          savingThrowOutcomeFill(savingThrow, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Shatter requires caller-supplied nonmagical unattended object damage area facts.",
    });
  });
});

function fireballSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
  objectIgnitionFacts: readonly {
    readonly objectId: ReturnType<typeof battleObjectId>;
    readonly disposition: BattleObjectIgnitionDisposition;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "fireballArea",
        originAnchorId: spellCasterId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
        objectIgnitionFacts,
      },
      outcomes,
    },
  };
}

function shatterSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
  nonmagicalUnattendedObjectDamageFacts: readonly {
    readonly objectId: ReturnType<typeof battleObjectId>;
    readonly disposition: BattleObjectDamageDisposition;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "shatterArea",
        originAnchorId: spellCasterId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
        nonmagicalUnattendedObjectDamageFacts,
      },
      outcomes,
    },
  };
}
