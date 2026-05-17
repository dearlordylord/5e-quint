// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV29E ice_knife
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV29F3 chromatic_orb
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT14 mage_armor
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-chained-attack-damage
import { describe, expect, test } from "vitest";
import {
  acidSplashUnitId,
  chromaticOrbUnitId,
  iceKnifeUnitId,
  mageArmorUnitId,
  rayOfFrostUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  spellAct,
  spellActInvocation,
  spellHoleInvocation,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  cantripSpellInvocationRef,
  discoverBattleActs,
  movementDeltaFeet,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";
import type { ActionSpellAct } from "./unit-profile-admission-catalog-support.ts";

describe("QMBT14 deterministic chained attack and Mage Armor admission", () => {
  test("ice_knife is admitted as a mixed spell attack plus primary-target burst save", () => {
    const spell = spellRecord(iceKnifeUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: iceKnifeUnitId,
      slotLevel: 2,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "ice_knife",
        2,
        "attackBurstSaveDamage",
      ),
      mode: { tag: "cast" },
    });
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            iceKnifeUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "attackRoll",
    );
    expect(spellHoleInvocation([attackRoll])).toEqual(
      expect.objectContaining({
        procedure: "attackBurstSaveDamage",
        spell,
        resource: { tag: "spellSlot", slotLevel: 2 },
        targeting: { kind: "singleCombatant" },
        attackKind: "ranged_spell_attack",
        damage: {
          expr: { dice: 1, dieSize: 10 },
          damageType: "piercing",
        },
        burst: {
          ability: "dex",
          dc: { kind: "caster_spell_save_dc" },
          targeting: { kind: "primaryTargetOriginEmanation", radiusFeet: 5 },
          damage: {
            expr: { dice: 3, dieSize: 6 },
            damageType: "cold",
          },
          successDamage: "none",
        },
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
  test("chromatic_orb is admitted as a chained spell attack with a cast-local damage-type choice", () => {
    const spell = spellRecord(chromaticOrbUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: chromaticOrbUnitId,
      slotLevel: 2,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "chromatic_orb",
        2,
        "chainedSpellAttackDamage",
      ),
      mode: { tag: "cast" },
    });
    const damageType = requireHole(act.initialHoles, "damageTypeChoice");
    expect(damageType).toEqual(
      expect.objectContaining({
        label: "Chromatic Orb damage type",
        choices: ["acid", "cold", "fire", "lightning", "poison", "thunder"],
      }),
    );
    expect(spellHoleInvocation([damageType])).toEqual(
      expect.objectContaining({
        procedure: "chainedSpellAttackDamage",
        spell,
        resource: { tag: "spellSlot", slotLevel: 2 },
        targeting: { kind: "singleCombatant" },
        attackKind: "ranged_spell_attack",
        attackBonus: 5,
        damage: { expr: { dice: 4, dieSize: 8 } },
        damageTypeChoices: [
          "acid",
          "cold",
          "fire",
          "lightning",
          "poison",
          "thunder",
        ],
        rangeFeet: 90,
        leapRangeFeet: 30,
      }),
    );
  });
  test("damage-type choice refs do not widen ordinary spell damage admission profiles", () => {
    const spell = spellRecord(chromaticOrbUnitId);
    const state = spellBattle({
      cantrips: [spell],
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const acts = discoverBattleActs(state).filter(
      (candidate): candidate is ActionSpellAct =>
        candidate.subject.tag === "actionSpell" &&
        candidate.subject.invocation.spellId === chromaticOrbUnitId,
    );

    expect(
      [...new Set(acts.map((act) => act.subject.invocation.procedure))].sort(),
    ).toEqual(["chainedSpellAttackDamage"]);
    expect(
      acts.some(
        (act) => act.subject.invocation.procedure === "spellAttackDamage",
      ),
    ).toBe(false);
    expect(
      acts.some(
        (act) => act.subject.invocation.procedure === "saveGatedDamage",
      ),
    ).toBe(false);
  });
  test("damage-type choice refs preserve existing spell attack and save-gated projections", () => {
    const spellAttack = spellRecord(rayOfFrostUnitId);
    const spellAttackAct = spellAct({
      state: spellBattle({ cantrips: [spellAttack] }),
      spellId: rayOfFrostUnitId,
    });

    expect(spellAttackAct.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    });
    expect(spellAttackAct.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: spellBattle({ cantrips: [spellAttack] }),
        subject: spellAttackAct.subject,
        fills: [
          spellTargetFill(
            requireHole(spellAttackAct.initialHoles, "targetChoice"),
            rayOfFrostUnitId,
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
        spell: spellAttack,
        targeting: { kind: "singleCombatant" },
        attackKind: "ranged_spell_attack",
        damage: {
          kind: "fixedSpellAttackDamage",
          expr: { dice: 1, dieSize: 8 },
          damageType: "cold",
        },
        rangeFeet: 60,
        postDamageRiders: [
          {
            kind: "speedDelta",
            deltaFeet: movementDeltaFeet(-10),
          },
        ],
      }),
    );

    const saveGated = spellRecord(acidSplashUnitId);
    const saveGatedAct = spellAct({
      state: spellBattle({ cantrips: [saveGated] }),
      spellId: acidSplashUnitId,
    });

    expect(saveGatedAct.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
      mode: { tag: "cast" },
    });
    expect(saveGatedAct.initialHoles).toEqual([
      expect.objectContaining({
        kind: "savingThrowOutcome",
        areaChoices: [],
        targetRollModes: [],
      }),
    ]);
    expect(spellActInvocation(saveGatedAct)).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        spell: saveGated,
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
  });
  test("mage_armor is admitted through catalog spell access and projected as a persistent prepared spell", () => {
    const spell = spellRecord(mageArmorUnitId);
    const act = spellAct({
      state: spellBattle({ preparedSpells: [spell] }),
      spellId: mageArmorUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "mage_armor",
        1,
        "persistentArmorEffect",
      ),
      mode: { tag: "cast" },
    });
    expect(spell.mechanics.family).toBe("ongoing_effect");
    expect(spell.mechanics.level).toBe(1);
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId],
      }),
    ]);
  });
});
