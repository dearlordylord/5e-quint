import { battleActSpellPresentation } from "./battle-act-composition.ts";
import type {
  BattleHole,
  BattleReadiedSpellTrigger,
  BattleState,
} from "./battle-runtime-test-support.ts";
import type { BattleRuntimeSession } from "./index.ts";
import { describe, expect, test } from "vitest";
import {
  armorClass,
  attackRollFill,
  battleId,
  battleObjectId,
  battleProcedureExecutionRefForTest,
  cantripSpellInvocationRef,
  characterSeed,
  concentrationSavingThrowFill,
  damageAmount,
  damageRollFillWithGroups,
  endTurn,
  expendedLevelOneSlots,
  findAct,
  findHole,
  Hp,
  magicSubject,
  movementFeet,
  objectTargetFill,
  requireCharacterSpellProcedureRefForTest,
  requireCharacterUnitProcedureRefForTest,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  secondWizardId,
  skeletonCreatureInit,
  skeletonId,
  spellRecord,
  startBattleSessionRight,
  targetFill,
  unitLibrary,
  wizardId,
  wizardSpellcasting,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
} from "./battle-runtime-test-support.ts";

describe("battle runtime: Eldritch Blast", () => {
  test("Eldritch Blast resolves independent creature and object beams for one Magic action", () => {
    const objectId = battleObjectId("eldritch-training-crystal");
    const session = startBattleSessionRight({
      battleId: battleId("battle-eldritch-blast-beams"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Warlock",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("eldritch_blast")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const act = findAct(session, magicSubject("eldritch_blast"));
    const subject = act.subject;
    const targetHoles = act.initialHoles.filter(
      (hole): hole is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
        hole.kind === "targetChoice",
    );
    const objectTargetHoles = act.initialHoles.filter(
      (
        hole,
      ): hole is Extract<BattleHole, { readonly kind: "objectTargetChoice" }> =>
        hole.kind === "objectTargetChoice",
    );
    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        wizardId,
        cantripSpellInvocationRef("eldritch_blast", "spellAttackSequence"),
      ),
      mode: { tag: "cast" },
    });
    expect(targetHoles).toHaveLength(2);
    expect(objectTargetHoles).toHaveLength(2);
    expect(act.initialHoles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Spell attack 1 target" }),
        expect.objectContaining({
          label: "Spell attack 1 object target",
        }),
        expect.objectContaining({ label: "Spell attack 2 target" }),
        expect.objectContaining({
          label: "Spell attack 2 object target",
        }),
      ]),
    );

    const beamOneTarget = targetFill(targetHoles[0]!, skeletonId);
    const beamTwoTarget = objectTargetFill({
      hole: objectTargetHoles[1]!,
      objectId,
      rangeFeet: movementFeet(120),
      armorClass: armorClass(13),
      damageDisposition: { kind: "hitPoints", hitPoints: Hp(5) },
    });
    const firstAttackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [beamOneTarget, beamTwoTarget],
      }),
      "attackRoll",
    );
    expect(firstAttackRoll).toMatchObject({
      label: "Spell attack 1 spell attack roll",
    });
    const firstDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(firstDamage).toMatchObject({
      label: "Spell attack 1 damage (1d10-force)",
    });
    const secondAttackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(firstDamage, [[6]]),
        ],
      }),
      "attackRoll",
    );
    expect(secondAttackRoll).toMatchObject({
      label: "Spell attack 2 spell attack roll",
    });
    const secondDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(firstDamage, [[6]]),
          attackRollFill(secondAttackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(secondDamage).toMatchObject({
      label: "Spell attack 2 damage (1d10-force)",
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        beamOneTarget,
        beamTwoTarget,
        attackRollFill(firstAttackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(firstDamage, [[6]]),
        attackRollFill(secondAttackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(secondDamage, [[4]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId,
          damageType: "force",
          rolledDamage: damageAmount(4),
          effectiveDamage: damageAmount(4),
          priorHitPoints: Hp(5),
          nextHitPoints: Hp(1),
          destroyed: false,
        },
      ],
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 7 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(expendedLevelOneSlots(requireResolved(result), wizardId)).toBe(0);
  });

  test("Eldritch Blast beams can target the same creature and miss independently", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-eldritch-blast-same-target-miss"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Warlock",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("eldritch_blast")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const act = findAct(session, magicSubject("eldritch_blast"));
    const subject = act.subject;
    const targetHoles = act.initialHoles.filter(
      (hole): hole is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
        hole.kind === "targetChoice",
    );
    const beamOneTarget = targetFill(targetHoles[0]!, skeletonId);
    const beamTwoTarget = targetFill(targetHoles[1]!, skeletonId);
    const firstAttackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [beamOneTarget, beamTwoTarget],
      }),
      "attackRoll",
    );
    const firstDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const secondAttackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(firstDamage, [[6]]),
        ],
      }),
      "attackRoll",
    );
    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        beamOneTarget,
        beamTwoTarget,
        attackRollFill(firstAttackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(firstDamage, [[6]]),
        attackRollFill(secondAttackRoll, { total: 1, naturalD20: 1 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 7 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect("objectDamages" in requireResolved(result)).toBe(false);
  });

  test("Eldritch Blast same-target hits use independent damage lifecycle holes", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-eldritch-blast-same-target-lifecycle"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Warlock",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("eldritch_blast")],
            preparedSpells: [],
          }),
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Concentrating Target",
          initiative: 10,
          attack: null,
        }),
      ],
    });
    const baseState = session.state;
    const target = baseState.combatants.get(skeletonId)!;
    const state = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(skeletonId, {
        ...target,
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("test_concentration"),
          ),
          effectKind: "readiedSpell",
        },
        activeEffects: [
          ...target.activeEffects,
          {
            kind: "spellDamageReduction" as const,
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              String("resistance"),
            ),
            sourceCombatantId: wizardId,
            damageType: "force" as const,
            amount: { dice: 1 as const, dieSize: 4 as const },
            usedThisTurn: false,
            expiresAt: {
              kind: "concentration" as const,
              combatantId: wizardId,
            },
          },
        ],
      }),
    } satisfies BattleState;
    const act = findAct({ ...session, state }, magicSubject("eldritch_blast"));
    const subject = act.subject;
    const targetHoles = act.initialHoles.filter(
      (hole): hole is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
        hole.kind === "targetChoice",
    );
    const beamOneTarget = targetFill(targetHoles[0]!, skeletonId);
    const beamTwoTarget = targetFill(targetHoles[1]!, skeletonId);
    const firstAttack = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [beamOneTarget, beamTwoTarget],
      }),
      "attackRoll",
    );
    const firstDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttack, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const firstReduction = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(firstDamage, [[6]]),
        ],
      }),
      "rolledDice",
    );
    expect(firstReduction).toMatchObject({
      label: "Spell attack 1 damage reduction",
    });
    const firstConcentration = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(firstDamage, [[6]]),
          damageRollFillWithGroups(firstReduction, [[2]]),
        ],
      }),
      "concentrationSavingThrow",
    );
    const secondAttack = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(firstDamage, [[6]]),
          damageRollFillWithGroups(firstReduction, [[2]]),
          concentrationSavingThrowFill(firstConcentration, true),
        ],
      }),
      "attackRoll",
    );
    const secondDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(firstDamage, [[6]]),
          damageRollFillWithGroups(firstReduction, [[2]]),
          concentrationSavingThrowFill(firstConcentration, true),
          attackRollFill(secondAttack, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const secondConcentration = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(firstDamage, [[6]]),
          damageRollFillWithGroups(firstReduction, [[2]]),
          concentrationSavingThrowFill(firstConcentration, true),
          attackRollFill(secondAttack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(secondDamage, [[4]]),
        ],
      }),
      "concentrationSavingThrow",
    );
    expect(secondConcentration.holeId).not.toBe(firstConcentration.holeId);

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          beamOneTarget,
          beamTwoTarget,
          attackRollFill(firstAttack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(firstDamage, [[6]]),
          damageRollFillWithGroups(firstReduction, [[2]]),
          concentrationSavingThrowFill(firstConcentration, true),
          attackRollFill(secondAttack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(secondDamage, [[4]]),
          concentrationSavingThrowFill(secondConcentration, true),
        ],
      }),
    );
    const damagedTarget = result.state.combatants.get(skeletonId);
    expect(damagedTarget).toMatchObject({
      hp: Hp(4),
      concentration: {
        sourceProcedureRef: expect.any(String),
        effectKind: "readiedSpell",
      },
    });
    expect(
      damagedTarget?.activeEffects.find(
        (effect) => effect.kind === "spellDamageReduction",
      ),
    ).toMatchObject({ usedThisTurn: true });
  });

  test("Eldritch Blast beam count scales at levels 1, 5, 11, and 17", () => {
    const cases = [
      [1, 1],
      [5, 2],
      [11, 3],
      [17, 4],
    ] as const;

    for (const [classLevel, beamCount] of cases) {
      const session = startBattleSessionRight({
        battleId: battleId(`battle-eldritch-blast-level-${classLevel}`),
        combatants: [
          characterSeed({
            combatantId: wizardId,
            displayName: "Warlock",
            initiative: 20,
            attack: null,
            classLevel,
            spellcasting: wizardSpellcasting({
              cantrips: [spellRecord("eldritch_blast")],
              preparedSpells: [],
            }),
          }),
          skeletonCreatureInit({ initiative: 10 }),
        ],
      });
      const holes = findAct(
        session,
        magicSubject("eldritch_blast"),
      ).initialHoles;
      expect(holes.filter((hole) => hole.kind === "targetChoice")).toHaveLength(
        beamCount,
      );
      expect(
        holes.filter((hole) => hole.kind === "objectTargetChoice"),
      ).toHaveLength(beamCount);
    }
  });

  test("Eldritch Blast creature beams use Concentration, spell reduction, and zero-HP damage lifecycle holes", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-eldritch-blast-concentration"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Warlock",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("eldritch_blast")],
            preparedSpells: [],
          }),
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Concentrating Target",
          initiative: 10,
          attack: null,
        }),
      ],
    });
    const concentrationState = session.state;
    const concentratingTarget = concentrationState.combatants.get(skeletonId)!;
    const state = {
      ...concentrationState,
      combatants: new Map(concentrationState.combatants).set(skeletonId, {
        ...concentratingTarget,
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("test_concentration"),
          ),
          effectKind: "readiedSpell",
        },
      }),
    } satisfies BattleState;
    const act = findAct(
      { ...session, state },
      magicSubject("eldritch_blast"),
    );
    const subject = act.subject;
    const target = findHole(act.initialHoles, "targetChoice");
    const attack = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attack, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const concentration = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[4]]),
        ],
      }),
      "concentrationSavingThrow",
    );
    expect(concentration).toMatchObject({ combatantId: skeletonId, dc: 10 });
    const failedConcentration = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[4]]),
          concentrationSavingThrowFill(concentration, false),
        ],
      }),
    );
    expect(failedConcentration.state.combatants.get(skeletonId)).toMatchObject({
      hp: Hp(8),
      concentration: null,
    });

    const reductionTarget = state.combatants.get(skeletonId)!;
    const reductionState = {
      ...state,
      combatants: new Map(state.combatants).set(skeletonId, {
        ...reductionTarget,
        concentration: null,
        activeEffects: [
          ...reductionTarget.activeEffects,
          {
            kind: "spellDamageReduction" as const,
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              String("resistance"),
            ),
            sourceCombatantId: wizardId,
            damageType: "force" as const,
            amount: { dice: 1 as const, dieSize: 4 as const },
            usedThisTurn: false,
            expiresAt: {
              kind: "concentration" as const,
              combatantId: wizardId,
            },
          },
        ],
      }),
    } satisfies BattleState;
    const reduction = requireHole(
      resolveBattleSubject({
        state: reductionState,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[4]]),
        ],
      }),
      "rolledDice",
    );
    expect(reduction).toMatchObject({
      label: "Spell attack 1 damage reduction",
    });
    const reduced = requireResolved(
      resolveBattleSubject({
        state: reductionState,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[4]]),
          damageRollFillWithGroups(reduction, [[3]]),
        ],
      }),
    );
    expect(reduced.state.combatants.get(skeletonId)?.hp).toBe(Hp(11));

    const relentlessEndurance = unitLibrary.requireUnit(
      "orc_relentless_endurance",
    );
    const zeroHpSession = startBattleSessionRight({
      battleId: battleId("battle-eldritch-blast-zero-hp"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Warlock",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("eldritch_blast")],
            preparedSpells: [],
          }),
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Fragile Target",
          initiative: 10,
          attack: null,
          currentHp: 4,
          maxHp: 12,
          resources: [{ unit: relentlessEndurance }],
          characterUnitRefs: [
            {
              unit: unitLibrary.requireUnit("orc_relentless_endurance"),
              supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
            },
          ],
        }),
      ],
    });
    const zeroHpState = zeroHpSession.state;
    const zeroHpAct = findAct(
      zeroHpSession,
      magicSubject("eldritch_blast"),
    );
    const zeroHpSubject = zeroHpAct.subject;
    const zeroTarget = findHole(
      zeroHpAct.initialHoles,
      "targetChoice",
    );
    const zeroAttack = requireHole(
      resolveBattleSubject({
        state: zeroHpState,
        subject: zeroHpSubject,
        fills: [targetFill(zeroTarget, skeletonId)],
      }),
      "attackRoll",
    );
    const zeroDamage = requireHole(
      resolveBattleSubject({
        state: zeroHpState,
        subject: zeroHpSubject,
        fills: [
          targetFill(zeroTarget, skeletonId),
          attackRollFill(zeroAttack, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const disposition = requireHole(
      resolveBattleSubject({
        state: zeroHpState,
        subject: zeroHpSubject,
        fills: [
          targetFill(zeroTarget, skeletonId),
          attackRollFill(zeroAttack, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(zeroDamage, [[4]]),
        ],
      }),
      "attackDamageDisposition",
    );
    expect(disposition).toMatchObject({
      targetId: skeletonId,
      choices: expect.arrayContaining([
        { kind: "ordinaryDamage" },
        {
          kind: "zeroHitPointReplacement",
          procedureRef: requireCharacterUnitProcedureRefForTest(
            zeroHpSession,
            skeletonId,
            "orc_relentless_endurance",
          ),
        },
      ]),
    });
  });

  test("Eldritch Blast beams open attack-hit and after-damage reaction windows", () => {
    const subjectSelector = magicSubject("eldritch_blast");
    const warlockTurnWithReadiedRay = (
      trigger: BattleReadiedSpellTrigger,
    ): BattleRuntimeSession => {
      const session = startBattleSessionRight({
        battleId: battleId(`battle-eldritch-blast-readied-${trigger}`),
        combatants: [
          characterSeed({
            combatantId: secondWizardId,
            displayName: "Second Wizard",
            initiative: 30,
            attack: null,
            spellcasting: wizardSpellcasting(),
          }),
          characterSeed({
            combatantId: wizardId,
            displayName: "Warlock",
            initiative: 20,
            attack: null,
            spellcasting: wizardSpellcasting({
              cantrips: [spellRecord("eldritch_blast")],
              preparedSpells: [],
            }),
          }),
          skeletonCreatureInit({ initiative: 10 }),
        ],
      });
      const readied = resolveBattleSubject({
        state: session.state,
        subject: {
          tag: "actionSpell",
          actorId: secondWizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            session,
            secondWizardId,
            cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
          ),
          mode: { tag: "ready", trigger },
        },
        fills: [],
      });
      if (readied.tag !== "resolved") {
        throw new Error(`Expected resolved Ready Spell, got ${readied.tag}.`);
      }
      const next = endTurn({ state: readied.state, actorId: secondWizardId });
      if (next.tag !== "resolved") {
        throw new Error(`Expected resolved End Turn, got ${next.tag}.`);
      }
      return { ...session, state: next.state };
    };
    const attackHitSession = warlockTurnWithReadiedRay("attackHit");
    const attackHitState = attackHitSession.state;
    const attackHitSubject = findAct(attackHitSession, subjectSelector).subject;
    const attackHitTarget = findHole(
      findAct(attackHitState, attackHitSubject).initialHoles,
      "targetChoice",
    );
    const attackHitRoll = requireHole(
      resolveBattleSubject({
        state: attackHitState,
        subject: attackHitSubject,
        fills: [targetFill(attackHitTarget, skeletonId)],
      }),
      "attackRoll",
    );
    expect(
      resolveBattleSubject({
        state: attackHitState,
        subject: attackHitSubject,
        fills: [
          targetFill(attackHitTarget, skeletonId),
          attackRollFill(attackHitRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "attackHit" }],
    });

    const afterDamageSession = warlockTurnWithReadiedRay("afterDamage");
    const afterDamageState = afterDamageSession.state;
    const afterDamageSubject = findAct(
      afterDamageSession,
      subjectSelector,
    ).subject;
    const afterDamageTarget = findHole(
      findAct(afterDamageState, afterDamageSubject).initialHoles,
      "targetChoice",
    );
    const afterDamageRoll = requireHole(
      resolveBattleSubject({
        state: afterDamageState,
        subject: afterDamageSubject,
        fills: [targetFill(afterDamageTarget, skeletonId)],
      }),
      "attackRoll",
    );
    const afterDamageRollFill = attackRollFill(afterDamageRoll, {
      total: 18,
      naturalD20: 12,
    });
    const afterDamageDamage = requireHole(
      resolveBattleSubject({
        state: afterDamageState,
        subject: afterDamageSubject,
        fills: [targetFill(afterDamageTarget, skeletonId), afterDamageRollFill],
      }),
      "rolledDice",
    );
    expect(
      resolveBattleSubject({
        state: afterDamageState,
        subject: afterDamageSubject,
        fills: [
          targetFill(afterDamageTarget, skeletonId),
          afterDamageRollFill,
          damageRollFillWithGroups(afterDamageDamage, [[4]]),
        ],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "afterDamage" }],
    });
  });
});
