import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-ALTER-SELF-NATURAL-WEAPONS-RUNTIME alter_self
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-self-transformation-mode
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SELF_TRANSFORMATION_MODE
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { activeSelfTransformationModeEffect } from "./index.ts";
import { describe, expect, test } from "vitest";
import {
  alterSelfUnitId,
  assertBattleSnapshotCodecRoundTripForTest,
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
} from "./unit-profile-admission.test-support.ts";
import { decodeSpellRecordForTest } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  requireCharacterSpellProcedureRefForTest,
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
} from "./battle-runtime.test-support.ts";

describe("L12G Alter Self self-transformation Spell Unit admission", () => {
  test("rejects synthetic near-misses at the self-transformation admission boundary", () => {
    const spell = spellRecord(alterSelfUnitId);
    if (spell.mechanics.family !== "activation") {
      throw new Error("Expected self-transformation activation mechanics.");
    }
    const phase = spell.mechanics.phases[0];
    if (phase?.kind !== "direct" || phase.mode === undefined) {
      throw new Error("Expected self-transformation mode mechanics.");
    }
    const unsupportedSpells = [
      decodeSpellRecordForTest({
        ...spell,
        id: "synthetic_extended_self_transformation",
        name: "Synthetic Extended Self Transformation",
        provenance: {
          kind: "synthetic-test",
          section: "synthetic-extended-self-transformation",
        },
        mechanics: {
          ...spell.mechanics,
          duration: {
            kind: "concentration",
            upTo: { amount: 2, unit: "hour" },
          },
        },
      }),
      decodeSpellRecordForTest({
        ...spell,
        id: "synthetic_incomplete_self_transformation",
        name: "Synthetic Incomplete Self Transformation",
        provenance: {
          kind: "synthetic-test",
          section: "synthetic-incomplete-self-transformation",
        },
        mechanics: {
          ...spell.mechanics,
          phases: [
            {
              ...phase,
              mode: {
                ...phase.mode,
                options: phase.mode.options.filter(
                  (option) => option.effects !== undefined,
                ),
              },
            },
          ],
        },
      }),
      decodeSpellRecordForTest({
        ...spell,
        id: "synthetic_duplicate_self_transformation_activation_phase",
        name: "Synthetic Duplicate Self Transformation Activation Phase",
        provenance: {
          kind: "synthetic-test",
          section: "synthetic-duplicate-self-transformation-activation-phase",
        },
        mechanics: {
          ...spell.mechanics,
          phases: [phase, phase],
        },
      }),
      decodeSpellRecordForTest({
        ...spell,
        id: "synthetic_invalid_self_transformation_effect",
        name: "Synthetic Invalid Self Transformation Effect",
        provenance: {
          kind: "synthetic-test",
          section: "synthetic-invalid-self-transformation-effect",
        },
        mechanics: {
          ...spell.mechanics,
          phases: [
            {
              ...phase,
              mode: {
                ...phase.mode,
                options: phase.mode.options.map((option) =>
                  option.effects === undefined
                    ? {
                        ...option,
                        effects: [{ kind: "water_breathing" }],
                      }
                    : option,
                ),
              },
            },
          ],
        },
      }),
    ];

    for (const unsupported of unsupportedSpells) {
      const session = spellBattle({
        preparedSpells: [unsupported],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      });
      expect(
        discoverBattleActs(session).some(
          (candidate) =>
            candidate.subject.tag === "actionSpell" &&
            battleActSpellPresentation(candidate)?.invocation.procedure ===
              "selfTransformationMode",
        ),
      ).toBe(false);
    }
  });

  test("Aquatic Adaptation grants water breathing and a Swim Speed linked to Speed", () => {
    const spell = spellRecord(alterSelfUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: alterSelfUnitId,
      slotLevel: 2,
    });
    const modeHole = requireHole(
      act.initialHoles,
      "selfTransformationModeChoice",
    );
    const awaitingMode = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [],
    });
    if (awaitingMode.tag !== "needsHoles") {
      throw new Error("Expected Alter Self transformation mode choice.");
    }
    assertBattleSnapshotCodecRoundTripForTest(awaitingMode.snapshot);

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        spellCasterId,
        spellSlotInvocationRef(alterSelfUnitId, 2, "selfTransformationMode"),
      ),
      mode: { tag: "cast" },
    });
    expect(modeHole.choices).toEqual([
      "aquaticAdaptation",
      "changeAppearance",
      "naturalWeapons",
    ]);

    const resolved = resolveBattleSubject({
      state: state.state,
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
    expect(
      activeSelfTransformationModeEffect(caster, {
        sourceCombatantId: spellTargetId,
      }),
    ).toBeUndefined();
    expect(caster?.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "selfTransformation",
        sourceProcedureRef: act.subject.procedureRef,
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
      session: state,
      spellId: alterSelfUnitId,
      slotLevel: 2,
    });
    const modeHole = requireHole(
      act.initialHoles,
      "selfTransformationModeChoice",
    );
    const modeOnly = resolveBattleSubject({
      state: state.state,
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
      state: state.state,
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
        sourceProcedureRef: act.subject.procedureRef,
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

    const unarmedStrike = discoverBattleActs(
      battleRuntimeSessionForTest({
        ...state,
        state: casterTurn.state,
      }),
    ).find(
      (candidate) =>
        candidate.subject.tag === "action" &&
        candidate.subject.action === "attack" &&
        candidate.presentation.kind === "attack" &&
        candidate.presentation.name === "Unarmed Strike",
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
          kind: "procedureReplacement",
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

  test("rejects a stale Natural Weapons damage type fill after switching modes", () => {
    const spell = spellRecord(alterSelfUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: alterSelfUnitId,
      slotLevel: 2,
    });
    const modeHole = requireHole(
      act.initialHoles,
      "selfTransformationModeChoice",
    );
    const naturalMode = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        {
          kind: "selfTransformationModeChoice",
          holeId: modeHole.holeId,
          value: "naturalWeapons",
        },
      ],
    });
    const damageTypeHole = requireResultHole(naturalMode, "damageTypeChoice");

    expect(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [
          {
            kind: "selfTransformationModeChoice",
            holeId: modeHole.holeId,
            value: "aquaticAdaptation",
          },
          {
            kind: "damageTypeChoice",
            holeId: damageTypeHole.holeId,
            value: "slashing",
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Self-transformation damage type choice is only valid for Natural Weapons.",
    });
  });

  test("Magic action replacement swaps the selected mode without resetting duration", () => {
    const spell = spellRecord(alterSelfUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: alterSelfUnitId,
      slotLevel: 2,
    });
    const modeHole = requireHole(
      act.initialHoles,
      "selfTransformationModeChoice",
    );
    const cast = resolveBattleSubject({
      state: state.state,
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

    const replacementAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        ...state,
        state: casterTurn.state,
      }),
    ).find(
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
        sourceProcedureRef: activeBefore.sourceProcedureRef,
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

    expect(
      resolveBattleSubject({
        state: replaced.state,
        subject: replacementAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Magic action is no longer available for the current actor.",
    });

    expect(
      resolveBattleSubject({
        state: breakBattleConcentration(casterTurn.state, spellCasterId),
        subject: replacementAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Self-transformation mode replacement requires an active self-transformation effect.",
    });

    const afterCasterTurn = endTurn({
      state: replaced.state,
      actorId: spellCasterId,
    });
    if (afterCasterTurn.tag !== "resolved") {
      throw new Error("Expected caster end turn after replacement.");
    }
    const nextCasterTurn = endTurn({
      state: afterCasterTurn.state,
      actorId: spellTargetId,
    });
    if (nextCasterTurn.tag !== "resolved") {
      throw new Error("Expected target end turn after replacement.");
    }
    expect(
      resolveBattleSubject({
        state: nextCasterTurn.state,
        subject: replacementAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Self-transformation mode is already active.",
    });
  });

  test("Magic action replacement can switch into Natural Weapons with a selected damage type", () => {
    const spell = spellRecord(alterSelfUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: alterSelfUnitId,
      slotLevel: 2,
    });
    const modeHole = requireHole(
      act.initialHoles,
      "selfTransformationModeChoice",
    );
    const cast = resolveBattleSubject({
      state: state.state,
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

    const replacementAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        ...state,
        state: casterTurn.state,
      }),
    ).find(
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
        sourceProcedureRef: activeBefore.sourceProcedureRef,
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
      session: state,
      spellId: alterSelfUnitId,
      slotLevel: 2,
    });
    const modeHole = requireHole(
      act.initialHoles,
      "selfTransformationModeChoice",
    );
    const resolved = resolveBattleSubject({
      state: state.state,
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
          sourceProcedureRef: act.subject.procedureRef,
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
