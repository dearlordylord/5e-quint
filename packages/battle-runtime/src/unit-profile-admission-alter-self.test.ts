// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-ALTER-SELF-NATURAL-WEAPONS-RUNTIME alter_self
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-self-transformation-mode
import { describe, expect, test } from "vitest";
import {
  alterSelfUnitId,
  battleCreatureCanBreatheUnderwater,
  breakBattleConcentration,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  requireHole,
  requireResultHole,
  resolveBattleSubject,
  snapshotBattle,
  spellAct,
  spellBattle,
  spellCasterId,
  spellRecord,
  spellSlotInvocationRef,
  spellTargetId,
} from "./unit-profile-admission-test-support.ts";
import {
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
} from "./battle-runtime-test-support.ts";

describe("L12G Alter Self self-transformation Spell Unit admission", () => {
  test("Aquatic Adaptation grants water breathing and a Swim Speed linked to Speed", () => {
    const spell = spellRecord(alterSelfUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: alterSelfUnitId,
      slotLevel: 2,
    });
    const modeHole = requireHole(
      act.initialHoles,
      "selfTransformationModeChoice",
    );

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        alterSelfUnitId,
        2,
        "selfTransformationMode",
      ),
      mode: { tag: "cast" },
    });
    expect(modeHole.choices).toEqual([
      "aquaticAdaptation",
      "changeAppearance",
      "naturalWeapons",
    ]);

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        {
          kind: "selfTransformationModeChoice",
          holeId: modeHole.holeId,
          value: "aquaticAdaptation",
        },
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.objectContaining({
            combatantId: spellCasterId,
            concentrating: true,
            movement: expect.objectContaining({
              speedKinds: expect.arrayContaining([
                expect.objectContaining({
                  kind: "swim",
                  speedFeet: 30,
                  remainingFeet: 30,
                }),
              ]),
            }),
          }),
          expect.anything(),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Alter Self to resolve.");
    }
    const caster = resolved.state.combatants.get(spellCasterId);
    expect(battleCreatureCanBreatheUnderwater(caster)).toBe(true);
    expect(caster?.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "selfTransformation",
        sourceSpellId: alterSelfUnitId,
        sourceCombatantId: spellCasterId,
        mode: "aquaticAdaptation",
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(600),
        },
      }),
    );
  });

  test("Natural Weapons uses a selected damage type and spellcasting ability for Unarmed Strike damage", () => {
    const spell = spellRecord(alterSelfUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: alterSelfUnitId,
      slotLevel: 2,
    });
    const modeHole = requireHole(
      act.initialHoles,
      "selfTransformationModeChoice",
    );
    const modeOnly = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        {
          kind: "selfTransformationModeChoice",
          holeId: modeHole.holeId,
          value: "naturalWeapons",
        },
      ],
    });
    const damageTypeHole = requireResultHole(modeOnly, "damageTypeChoice");
    expect(damageTypeHole.choices).toEqual([
      "slashing",
      "piercing",
      "bludgeoning",
    ]);

    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        {
          kind: "selfTransformationModeChoice",
          holeId: modeHole.holeId,
          value: "naturalWeapons",
        },
        {
          kind: "damageTypeChoice",
          holeId: damageTypeHole.holeId,
          value: "slashing",
        },
      ],
    });
    expect(cast).toMatchObject({ tag: "resolved" });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Natural Weapons Alter Self to resolve.");
    }
    expect(
      cast.state.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "selfTransformation",
        sourceSpellId: alterSelfUnitId,
        sourceCombatantId: spellCasterId,
        mode: "naturalWeapons",
        naturalWeaponDamageType: "slashing",
        naturalWeaponFacts: {
          damage: {
            dice: 1,
            dieSize: 6,
            damageTypeChoices: ["slashing", "piercing", "bludgeoning"],
          },
          spellcastingAbilityModifier: 3,
          attackBonus: 5,
        },
      }),
    );

    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster end turn to resolve.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected target end turn to resolve.");
    }

    const unarmedStrike = discoverBattleActs(casterTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "action" &&
        candidate.subject.action === "attack" &&
        candidate.subject.attackName === "Unarmed Strike",
    );
    expect(unarmedStrike).toBeDefined();
    if (unarmedStrike === undefined) {
      throw new Error("Expected Unarmed Strike attack act.");
    }
    const targetHole = requireHole(unarmedStrike.initialHoles, "targetChoice");
    const targetFill = attackTargetFill(
      targetHole,
      spellCasterId,
      spellTargetId,
      "Unarmed Strike",
    );
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: unarmedStrike.subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    if (!("attack" in attackRoll)) {
      throw new Error("Expected Unarmed Strike attack roll hole.");
    }
    expect(attackRoll.attack).toMatchObject({
      kind: "unarmedStrike",
      attackAbility: "spellcasting",
      attackAbilityModifier: 3,
      attackBonus: 5,
      damageAbilityModifier: 3,
      effect: {
        kind: "damage",
        damage: {
          kind: "authoredReplacement",
          sourceUnitId: alterSelfUnitId,
          dice: 1,
          dieSize: 6,
          damageType: "slashing",
        },
      },
    });

    const hit = resolveBattleSubject({
      state: casterTurn.state,
      subject: unarmedStrike.subject,
      fills: [
        targetFill,
        attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
      ],
    });
    const damage = requireResultHole(hit, "rolledDice");
    expect(damage).toMatchObject({
      critical: false,
      label: "Unarmed Strike damage (1d6+3-slashing)",
    });

    const resolved = resolveBattleSubject({
      state: casterTurn.state,
      subject: unarmedStrike.subject,
      fills: [
        targetFill,
        attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
        damageRollFillWithGroups(damage, [[4]]),
      ],
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: spellCasterId },
          { combatantId: spellTargetId, hp: 5 },
        ],
      },
    });
  });

  test("Magic action replacement swaps the selected mode without resetting duration", () => {
    const spell = spellRecord(alterSelfUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: alterSelfUnitId,
      slotLevel: 2,
    });
    const modeHole = requireHole(
      act.initialHoles,
      "selfTransformationModeChoice",
    );
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        {
          kind: "selfTransformationModeChoice",
          holeId: modeHole.holeId,
          value: "aquaticAdaptation",
        },
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Alter Self to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster end turn to resolve.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected target end turn to resolve.");
    }
    const activeBefore = casterTurn.state.combatants
      .get(spellCasterId)
      ?.activeEffects.find((effect) => effect.kind === "selfTransformation");
    expect(activeBefore).toBeDefined();
    if (activeBefore?.kind !== "selfTransformation") {
      throw new Error("Expected active self-transformation effect.");
    }

    const replacementAct = discoverBattleActs(casterTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "replaceSelfTransformationMode" &&
        candidate.subject.mode === "changeAppearance",
    );
    expect(replacementAct).toBeDefined();
    if (replacementAct === undefined) {
      throw new Error("Expected Change Appearance replacement act.");
    }

    const replaced = resolveBattleSubject({
      state: casterTurn.state,
      subject: replacementAct.subject,
      fills: [],
    });

    expect(replaced).toMatchObject({ tag: "resolved" });
    if (replaced.tag !== "resolved") {
      throw new Error("Expected mode replacement to resolve.");
    }
    const caster = replaced.state.combatants.get(spellCasterId);
    expect(battleCreatureCanBreatheUnderwater(caster)).toBe(false);
    expect(caster?.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "selfTransformation",
        sourceSpellId: alterSelfUnitId,
        sourceCombatantId: spellCasterId,
        mode: "changeAppearance",
        expiresAt: activeBefore.expiresAt,
      }),
    );
    const casterSnapshot = snapshotBattle(replaced.state).combatants.find(
      (combatant) => combatant.combatantId === spellCasterId,
    );
    expect(casterSnapshot?.movement.speedKinds).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "swim" })]),
    );
  });

  test("Magic action replacement can switch into Natural Weapons with a selected damage type", () => {
    const spell = spellRecord(alterSelfUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: alterSelfUnitId,
      slotLevel: 2,
    });
    const modeHole = requireHole(
      act.initialHoles,
      "selfTransformationModeChoice",
    );
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        {
          kind: "selfTransformationModeChoice",
          holeId: modeHole.holeId,
          value: "aquaticAdaptation",
        },
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Alter Self to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster end turn to resolve.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected target end turn to resolve.");
    }
    const activeBefore = casterTurn.state.combatants
      .get(spellCasterId)
      ?.activeEffects.find((effect) => effect.kind === "selfTransformation");
    if (activeBefore?.kind !== "selfTransformation") {
      throw new Error("Expected active self-transformation effect.");
    }

    const replacementAct = discoverBattleActs(casterTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "replaceSelfTransformationMode" &&
        candidate.subject.mode === "naturalWeapons" &&
        candidate.subject.naturalWeaponDamageType === "piercing",
    );
    expect(replacementAct).toBeDefined();
    if (replacementAct === undefined) {
      throw new Error("Expected Natural Weapons replacement act.");
    }

    const replaced = resolveBattleSubject({
      state: casterTurn.state,
      subject: replacementAct.subject,
      fills: [],
    });

    expect(replaced).toMatchObject({ tag: "resolved" });
    if (replaced.tag !== "resolved") {
      throw new Error("Expected Natural Weapons mode replacement to resolve.");
    }
    const caster = replaced.state.combatants.get(spellCasterId);
    expect(battleCreatureCanBreatheUnderwater(caster)).toBe(false);
    expect(caster?.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "selfTransformation",
        sourceSpellId: alterSelfUnitId,
        sourceCombatantId: spellCasterId,
        mode: "naturalWeapons",
        naturalWeaponDamageType: "piercing",
        expiresAt: activeBefore.expiresAt,
      }),
    );
    const casterSnapshot = snapshotBattle(replaced.state).combatants.find(
      (combatant) => combatant.combatantId === spellCasterId,
    );
    expect(casterSnapshot?.movement.speedKinds).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "swim" })]),
    );
  });

  test("Concentration cleanup removes the active option projection", () => {
    const spell = spellRecord(alterSelfUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: alterSelfUnitId,
      slotLevel: 2,
    });
    const modeHole = requireHole(
      act.initialHoles,
      "selfTransformationModeChoice",
    );
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        {
          kind: "selfTransformationModeChoice",
          holeId: modeHole.holeId,
          value: "aquaticAdaptation",
        },
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Alter Self to resolve.");
    }

    const broken = breakBattleConcentration(resolved.state, spellCasterId);
    const caster = broken.combatants.get(spellCasterId);

    expect(battleCreatureCanBreatheUnderwater(caster)).toBe(false);
    expect(caster?.activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "selfTransformation",
          sourceSpellId: alterSelfUnitId,
        }),
      ]),
    );
    const casterSnapshot = snapshotBattle(broken).combatants.find(
      (combatant) => combatant.combatantId === spellCasterId,
    );
    expect(casterSnapshot?.movement.speedKinds).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "swim" })]),
    );
  });
});
