import { requireCharacterSpellProcedureRefForTest } from "./battle-runtime.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
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
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  spellAct,
  spellActInvocation,
  spellHoleInvocation,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import {
  cantripSpellInvocationRef,
  discoverBattleActs,
  movementDeltaFeet,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission.test-support.ts";
import type { ActionSpellAct } from "./unit-profile-admission-catalog.test-support.ts";

describe("QMBT14 deterministic chained attack and Mage Armor admission", () => {
  test("ice_knife is admitted as a mixed spell attack plus primary-target burst save", () => {
    const spell = spellRecord(iceKnifeUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: iceKnifeUnitId,
      slotLevel: 2,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        spellCasterId,
        spellSlotInvocationRef("ice_knife", 2, "attackBurstSaveDamage"),
      ),
      mode: { tag: "cast" },
    });
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: session.state,
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
    expect(spellHoleInvocation(session, [attackRoll])).toEqual(
      expect.objectContaining({
        procedure: "attackBurstSaveDamage",
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
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: chromaticOrbUnitId,
      slotLevel: 2,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        spellCasterId,
        spellSlotInvocationRef("chromatic_orb", 2, "chainedSpellAttackDamage"),
      ),
      mode: { tag: "cast" },
    });
    const damageType = requireHole(act.initialHoles, "damageTypeChoice");
    expect(damageType).toEqual(
      expect.objectContaining({
        label: "Spell damage type",
        choices: ["acid", "cold", "fire", "lightning", "poison", "thunder"],
      }),
    );
    expect(spellHoleInvocation(session, [damageType])).toEqual(
      expect.objectContaining({
        procedure: "chainedSpellAttackDamage",
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
    const session = spellBattle({
      cantrips: [spell],
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const acts = discoverBattleActs(session).filter(
      (candidate): candidate is ActionSpellAct =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          chromaticOrbUnitId,
    );

    expect(
      [
        ...new Set(
          acts.map(
            (act) => battleActSpellPresentation(act)?.invocation.procedure,
          ),
        ),
      ].sort(),
    ).toEqual(["chainedSpellAttackDamage"]);
    expect(
      acts.some(
        (act) =>
          battleActSpellPresentation(act)?.invocation.procedure ===
          "spellAttackDamage",
      ),
    ).toBe(false);
    expect(
      acts.some(
        (act) =>
          battleActSpellPresentation(act)?.invocation.procedure ===
          "saveGatedDamage",
      ),
    ).toBe(false);
  });
  test("damage-type choice refs preserve existing spell attack and save-gated projections", () => {
    const spellAttack = spellRecord(rayOfFrostUnitId);
    const spellAttackSession = spellBattle({ cantrips: [spellAttack] });
    const spellAttackAct = spellAct({
      session: spellAttackSession,
      spellId: rayOfFrostUnitId,
    });

    expect({
      ...spellAttackAct.subject,
      invocation: battleActSpellPresentation(spellAttackAct)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        spellAttackSession,
        spellCasterId,
        cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
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
        state: spellAttackSession.state,
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
    expect(spellHoleInvocation(spellAttackSession, [attackRoll])).toEqual(
      expect.objectContaining({
        procedure: "spellAttackDamage",
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
    const saveGatedSession = spellBattle({ cantrips: [saveGated] });
    const saveGatedAct = spellAct({
      session: saveGatedSession,
      spellId: acidSplashUnitId,
    });

    expect({
      ...saveGatedAct.subject,
      invocation: battleActSpellPresentation(saveGatedAct)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        saveGatedSession,
        spellCasterId,
        cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
      ),
      mode: { tag: "cast" },
    });
    expect(saveGatedAct.initialHoles).toEqual([
      expect.objectContaining({
        kind: "savingThrowOutcome",
        areaChoices: [],
        targetRollModes: [],
      }),
    ]);
    expect(spellActInvocation(saveGatedSession, saveGatedAct)).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
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
    const session = spellBattle({ preparedSpells: [spell] });
    const act = spellAct({
      session,
      spellId: mageArmorUnitId,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        spellCasterId,
        spellSlotInvocationRef("mage_armor", 1, "persistentArmorEffect"),
      ),
      mode: { tag: "cast" },
    });
    expect(spell.mechanics.family).toBe("ongoing_effect");
    expect(spell.mechanics.level).toBe(1);
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
  });
  test("mage_armor admission rejects a creature target without willing disposition", () => {
    const mageArmor = spellRecord(mageArmorUnitId);
    if (
      mageArmor.mechanics.family !== "ongoing_effect" ||
      mageArmor.mechanics.attachment.kind !== "hole" ||
      mageArmor.mechanics.attachment.value.kind !== "target"
    ) {
      throw new Error("Expected Mage Armor to have an ongoing target hole.");
    }
    const synthetic = decodeSpellRecordForTest({
      ...mageArmor,
      id: "synthetic_mage_armor_missing_willing",
      name: "Synthetic Mage Armor missing willingness",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_mage_armor_missing_willing",
      },
      mechanics: {
        ...mageArmor.mechanics,
        attachment: {
          ...mageArmor.mechanics.attachment,
          value: {
            ...mageArmor.mechanics.attachment.value,
            selection: { mode: "one", targetKinds: ["creature"] },
          },
        },
      },
    });
    const session = spellBattle({ preparedSpells: [synthetic] });

    expect(
      discoverBattleActs(session).some(
        (candidate) =>
          String(battleActSpellPresentation(candidate)?.invocation.spellId) ===
          String(synthetic.id),
      ),
    ).toBe(false);
  });
});
