// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT14 acid_splash magic_missile ray_of_frost
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV28B inflict_wounds poison_spray sacred_flame
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV89A chill_touch
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV28D guiding_bolt ray_of_sickness shocking_grasp vicious_mockery
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV29A burning_hands
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-damage-save-or-attack
import { describe, expect, test } from "vitest";
import {
  acidSplashUnitId,
  burningHandsUnitId,
  chillTouchUnitId,
  guidingBoltUnitId,
  inflictWoundsUnitId,
  magicMissileUnitId,
  poisonSprayUnitId,
  rayOfFrostUnitId,
  rayOfSicknessUnitId,
  sacredFlameUnitId,
  shockingGraspUnitId,
  spellCasterId,
  spellTargetId,
  viciousMockeryUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  maybeSpellAct,
  spellAct,
  spellActInvocation,
  spellHoleInvocation,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  cantripSpellInvocationRef,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";
import type {
  ActivationPhase,
  EffectAtom,
} from "./unit-profile-admission-test-support.ts";

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
  test("spell rider timing is admitted only for exact SRD target semantics", () => {
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
    ).toBeUndefined();
    expect(
      maybeSpellAct({
        state: spellBattle({ cantrips: [genericOpportunityAttackDenial] }),
        spellId: genericOpportunityAttackDenial.id,
      }),
    ).toBeUndefined();
    expect(
      maybeSpellAct({
        state: spellBattle({ preparedSpells: [genericNextAttackAdvantage] }),
        spellId: genericNextAttackAdvantage.id,
      }),
    ).toBeUndefined();
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
});
