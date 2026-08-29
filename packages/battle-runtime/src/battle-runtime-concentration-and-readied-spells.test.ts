import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import type {
  BattleState,
  BattleSubject,
} from "./battle-runtime.test-support.ts";
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { Round } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./battle-reducer/creature-hit-point-state.ts";
import { allocateBattleEffectOccurrenceForCreature } from "./effect-execution-ref.ts";
import {
  attackDamageDispositionFill,
  battleStateWithAllSpellSlotsExpended,
  attackDamageHoleAfterHit,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  battleId,
  battleProcedureExecutionRefForTest,
  breakBattleConcentration,
  cantripSpellInvocationRef,
  characterSeed,
  concentrationSavingThrowDc,
  concentrationSavingThrowFill,
  damageRollFill,
  damageRollFillWithGroups,
  discoverBattleActCandidates,
  endTurn,
  expendedLevelOneSlots,
  findAct,
  fighterId,
  goblinAttackSubject,
  goblinId,
  magicSubject,
  requireCharacterSpellProcedureRefForTest,
  requireHole,
  requireResolved,
  resolveBattleConcentrationDamage,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  secondWizardId,
  skeletonId,
  snapshotBattle,
  spellRecord,
  spellSlotInvocationRef,
  spellTargetAllocationFill,
  startBattleSessionRight,
  statBlockCreatureInit,
  targetFill,
  wizardId,
  wizardSpellcasting,
  wizardVsSkeletonBattle,
} from "./battle-runtime.test-support.ts";

function readiedSpellProcedureRef(state: BattleState) {
  const readied = state.readiedSpells.get(wizardId);
  if (readied === undefined) {
    throw new Error("Expected the Wizard to hold a readied spell.");
  }
  return readied.procedureRef;
}

describe("battle runtime: Concentration and readied spells", () => {
  test("readied spell attack misses consume next-attack spell riders", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-readied-spell-miss-consumes-rider"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Cleric",
          initiative: 30,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("guiding_bolt")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("ray_of_frost")],
          }),
        }),
        statBlockCreatureInit({
          combatantId: goblinId,
          initiative: 10,
        }),
      ],
    });
    const state = session.state;
    const guidingSubject: BattleSubject = {
      tag: "actionSpell",
      actorId: fighterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        fighterId,
        spellSlotInvocationRef("guiding_bolt", 1, "spellAttackDamage"),
      ),
      mode: { tag: "cast" },
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject: guidingSubject, fills: [] }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject: guidingSubject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject: guidingSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const guided = requireResolved(
      resolveBattleSubject({
        state,
        subject: guidingSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[1, 1, 1, 1]]),
        ],
      }),
    ).state;
    const wizardTurn = requireResolved(
      endTurn({ state: guided, actorId: fighterId }),
    ).state;
    const readied = requireResolved(
      resolveBattleSubject({
        state: wizardTurn,
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            battleRuntimeSessionForTest({
              state: wizardTurn,
              context: session.context,
            }),
            wizardId,
            cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        fills: [],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: readied, actorId: wizardId }),
    ).state;
    const releaseSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: goblinId,
      command: "releaseReadiedSpell",
      readiedSpellCasterId: wizardId,
      procedureRef: readiedSpellProcedureRef(goblinTurn),
    };
    const releaseTarget = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject: releaseSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const releaseRoll = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject: releaseSubject,
        fills: [targetFill(releaseTarget, goblinId)],
      }),
      "attackRoll",
    );
    expect(releaseRoll).toMatchObject({ rollMode: "advantage" });
    const missed = requireResolved(
      resolveBattleSubject({
        state: goblinTurn,
        subject: releaseSubject,
        fills: [
          targetFill(releaseTarget, goblinId),
          attackRollFill(releaseRoll, {
            total: 1,
            naturalD20: 1,
            rollMode: "advantage",
          }),
        ],
      }),
    );

    expect(missed.state.combatants.get(goblinId)?.activeEffects).toEqual([]);
  });

  test("breaking concentration clears concentration-owned spell effects", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-concentration-owned-hideous-laughter"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("hideous_laughter")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          initiative: 10,
        }),
      ],
    });
    const expendedState = battleStateWithAllSpellSlotsExpended(
      session.state,
      wizardId,
    );
    const state: BattleState = {
      ...expendedState,
      initiative: {
        ...expendedState.initiative,
        round: Round(2),
      },
    };
    const wizard = state.combatants.get(wizardId)!;
    const skeleton = state.combatants.get(skeletonId)!;
    const sourceProcedureRef = requireCharacterSpellProcedureRefForTest(
      session,
      wizardId,
      spellSlotInvocationRef("hideous_laughter", 1, "hideousLaughter"),
    );
    const allocatedEffect = allocateBattleEffectOccurrenceForCreature({
      owner: skeleton,
      effect: {
        kind: "hideousLaughter",
        sourceProcedureRef,
        sourceCombatantId: wizardId,
        conditionHadNonSpellProneSource: false,
        conditionHadNonSpellIncapacitatedSource: false,
        repeatSaveRollMode: null,
        save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
        expiresAt: {
          kind: "concentration",
          combatantId: wizardId,
          durationTicks: elapsedTimeTicks(9),
        },
      },
    });
    const concentrating = {
      ...state,
      combatants: new Map(state.combatants)
        .set(wizardId, {
          ...wizard,
          concentration: {
            sourceProcedureRef,
            effectKind: "spellEffect",
          },
        })
        .set(skeletonId, {
          ...battleCreatureStateWithKnockOutPreservedConditions(
            allocatedEffect.owner,
            applyCondition(
              applyCondition(skeleton.conditions, "prone"),
              "incapacitated",
            ),
          ),
          activeEffects: [allocatedEffect.effect],
        }),
    } satisfies BattleState;

    const broken = breakBattleConcentration(concentrating, wizardId);

    expect(snapshotBattle(broken).combatants).toMatchObject([
      { combatantId: wizardId, concentrating: false },
      { combatantId: skeletonId },
    ]);
    expect(broken.combatants.get(skeletonId)?.activeEffects).toEqual([]);
    expect(broken.combatants.get(skeletonId)?.conditions.prone).toBe(false);
    expect(
      broken.combatants.get(skeletonId)?.conditions.directIncapacitated,
    ).toBe(false);
  });

  test("breaking ordinary concentration does not clear a non-owned readied spell entry", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-ordinary-concentration-preserves-readied"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            session,
            wizardId,
            cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
          ),
          mode: { tag: "ready", trigger: "spellCast" },
        },
        fills: [],
      }),
    ).state;
    const wizard = readied.combatants.get(wizardId)!;
    const concentrating = {
      ...readied,
      combatants: new Map(readied.combatants).set(wizardId, {
        ...wizard,
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("hold_person"),
          ),
          effectKind: "spellEffect",
        },
      }),
    } satisfies BattleState;

    const broken = breakBattleConcentration(concentrating, wizardId);

    expect(broken.combatants.get(wizardId)?.concentration).toBeNull();
    expect(broken.readiedSpells.has(wizardId)).toBe(true);
  });

  test("failed concentration damage save uses the same concentration lifecycle", () => {
    const state = wizardVsSkeletonBattle().state;
    const wizard = state.combatants.get(wizardId)!;
    const concentrating = {
      ...state,
      combatants: new Map(state.combatants).set(wizardId, {
        ...wizard,
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("readied_acid_splash"),
          ),
          effectKind: "readiedSpell",
        },
      }),
    } satisfies BattleState;

    expect(concentrationSavingThrowDc(24)).toBe(12);
    expect(concentrationSavingThrowDc(80)).toBe(30);
    expect(
      resolveBattleConcentrationDamage({
        state: concentrating,
        combatantId: wizardId,
        damageAmount: 24,
        savingThrowSucceeded: true,
      }).combatants.get(wizardId)?.concentration,
    ).toEqual({
      sourceProcedureRef: expect.any(String),
      effectKind: "readiedSpell",
    });
    expect(
      resolveBattleConcentrationDamage({
        state: concentrating,
        combatantId: wizardId,
        damageAmount: 24,
        savingThrowSucceeded: false,
      }).combatants.get(wizardId)?.concentration,
    ).toBeNull();
  });

  test("attack damage requests and consumes a Concentration save for a readied spell", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-readied-concentration-damage"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const readySubject = {
      tag: "actionSpell" as const,
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        wizardId,
        cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
      ),
      mode: { tag: "ready" as const, trigger: "spellCast" as const },
    };
    const readied = resolveBattleSubject({
      state,
      subject: readySubject,
      fills: [],
    });
    if (readied.tag !== "resolved") {
      throw new Error(`Expected resolved Ready Spell, got ${readied.tag}.`);
    }
    const goblinTurn = endTurn({ state: readied.state, actorId: wizardId });
    if (goblinTurn.tag !== "resolved") {
      throw new Error(`Expected resolved End Turn, got ${goblinTurn.tag}.`);
    }
    const target = attackInitialTargetHole(
      goblinTurn.state,
      goblinAttackSubject(goblinTurn.state, "Scimitar"),
    );
    const roll = attackRollHoleAfterTarget(
      goblinTurn.state,
      target,
      goblinAttackSubject(goblinTurn.state, "Scimitar"),
      wizardId,
    );
    const damage = attackDamageHoleAfterHit(
      goblinTurn.state,
      target,
      roll,
      { total: 14, naturalD20: 10 },
      goblinAttackSubject(goblinTurn.state, "Scimitar"),
      wizardId,
    );
    const needsConcentration = resolveBattleSubject({
      state: goblinTurn.state,
      subject: goblinAttackSubject(goblinTurn.state, "Scimitar"),
      fills: [
        targetFill(target, wizardId),
        attackRollFill(roll, { total: 14, naturalD20: 10 }),
        damageRollFill(damage, 3),
      ],
    });
    const concentration = requireHole(
      needsConcentration,
      "concentrationSavingThrow",
    );

    expect(concentration).toMatchObject({
      kind: "concentrationSavingThrow",
      combatantId: wizardId,
      dc: 10,
      damageAmount: 5,
    });

    const failed = resolveBattleSubject({
      state: goblinTurn.state,
      subject: goblinAttackSubject(goblinTurn.state, "Scimitar"),
      fills: [
        targetFill(target, wizardId),
        attackRollFill(roll, { total: 14, naturalD20: 10 }),
        damageRollFill(damage, 3),
        concentrationSavingThrowFill(concentration, false),
      ],
    });

    expect(failed).toMatchObject({
      tag: "resolved",
      snapshot: {
        readiedResponses: { spells: [] },
        combatants: [
          { combatantId: wizardId, hp: 7, concentrating: false },
          { combatantId: goblinId },
        ],
      },
    });
  });

  test("Eldritch Mind gives Advantage only to damage-triggered Concentration saves", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-eldritch-mind-concentration-save"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Warlock",
          initiative: 20,
          attack: null,
          invocationFeatures: [{ tag: "eldritchMind" }],
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "actionSpell" as const,
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            session,
            wizardId,
            cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
          ),
          mode: { tag: "ready" as const, trigger: "spellCast" as const },
        },
        fills: [],
      }),
    );
    const goblinTurn = requireResolved(
      endTurn({ state: readied.state, actorId: wizardId }),
    );
    const target = attackInitialTargetHole(
      goblinTurn.state,
      goblinAttackSubject(goblinTurn.state, "Scimitar"),
    );
    const roll = attackRollHoleAfterTarget(
      goblinTurn.state,
      target,
      goblinAttackSubject(goblinTurn.state, "Scimitar"),
      wizardId,
    );
    const damage = attackDamageHoleAfterHit(
      goblinTurn.state,
      target,
      roll,
      { total: 14, naturalD20: 10 },
      goblinAttackSubject(goblinTurn.state, "Scimitar"),
      wizardId,
    );
    const concentration = requireHole(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: goblinAttackSubject(goblinTurn.state, "Scimitar"),
        fills: [
          targetFill(target, wizardId),
          attackRollFill(roll, { total: 14, naturalD20: 10 }),
          damageRollFill(damage, 3),
        ],
      }),
      "concentrationSavingThrow",
    );

    expect(concentration).toMatchObject({
      combatantId: wizardId,
      dc: 10,
      damageAmount: 5,
      rollMode: "advantage",
    });

    const maintained = requireResolved(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: goblinAttackSubject(goblinTurn.state, "Scimitar"),
        fills: [
          targetFill(target, wizardId),
          attackRollFill(roll, { total: 14, naturalD20: 10 }),
          damageRollFill(damage, 3),
          concentrationSavingThrowFill(concentration, true),
        ],
      }),
    );

    expect(maintained.state.combatants.get(wizardId)?.concentration).toEqual({
      sourceProcedureRef: expect.any(String),
      effectKind: "readiedSpell",
    });
  });

  test("Eldritch Mind does not affect ordinary Constitution spell saves", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-eldritch-mind-ordinary-con-save"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Warlock",
          initiative: 20,
          attack: null,
          invocationFeatures: [{ tag: "eldritchMind" }],
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("inflict_wounds")],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    const state = session.state;
    const subject = findAct(session, magicSubject("inflict_wounds")).subject;
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [],
      }),
      "targetChoice",
    );
    const savingThrow = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, goblinId)],
      }),
      "savingThrowOutcome",
    );

    expect(savingThrow).toMatchObject({
      ability: "con",
      targetRollModes: [],
    });
  });

  test("attack damage disposition replay accepts the following Concentration save", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-knock-out-concentration-damage"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          currentHp: 3,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const readySubject = {
      tag: "actionSpell" as const,
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        wizardId,
        cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
      ),
      mode: { tag: "ready" as const, trigger: "spellCast" as const },
    };
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: readySubject,
        fills: [],
      }),
    );
    const goblinTurn = requireResolved(
      endTurn({ state: readied.state, actorId: wizardId }),
    );
    const subject = goblinAttackSubject(goblinTurn.state, "Scimitar");
    const target = attackInitialTargetHole(goblinTurn.state, subject);
    const roll = attackRollHoleAfterTarget(
      goblinTurn.state,
      target,
      subject,
      wizardId,
    );
    const damage = attackDamageHoleAfterHit(
      goblinTurn.state,
      target,
      roll,
      { total: 14, naturalD20: 10 },
      subject,
      wizardId,
    );
    const disposition = requireHole(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject,
        fills: [
          targetFill(target, wizardId),
          attackRollFill(roll, { total: 14, naturalD20: 10 }),
          damageRollFill(damage, 3),
        ],
      }),
      "attackDamageDisposition",
    );
    const needsConcentration = resolveBattleSubject({
      state: goblinTurn.state,
      subject,
      fills: [
        targetFill(target, wizardId),
        attackRollFill(roll, { total: 14, naturalD20: 10 }),
        damageRollFill(damage, 3),
        attackDamageDispositionFill(disposition, { kind: "knockOut" }),
      ],
    });
    const concentration = requireHole(
      needsConcentration,
      "concentrationSavingThrow",
    );

    const completed = resolveBattleSubject({
      state: goblinTurn.state,
      subject,
      fills: [
        targetFill(target, wizardId),
        attackRollFill(roll, { total: 14, naturalD20: 10 }),
        damageRollFill(damage, 3),
        attackDamageDispositionFill(disposition, { kind: "knockOut" }),
        concentrationSavingThrowFill(concentration, true),
      ],
    });

    expect(completed).toMatchObject({
      tag: "resolved",
      snapshot: {
        readiedResponses: { spells: [] },
        combatants: [
          {
            combatantId: wizardId,
            hp: 1,
            concentrating: false,
            conditions: expect.arrayContaining(["unconscious", "prone"]),
          },
          { combatantId: goblinId },
        ],
      },
    });
  });

  test("readied spell release uses the held spell and ends Concentration", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-readied-release"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const readied = resolveBattleSubject({
      state,
      subject: {
        tag: "actionSpell",
        actorId: wizardId,
        procedureRef: requireCharacterSpellProcedureRefForTest(
          session,
          wizardId,
          cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
        ),
        mode: { tag: "ready", trigger: "attackHit" },
      },
      fills: [],
    });
    if (readied.tag !== "resolved") {
      throw new Error(`Expected resolved Ready Spell, got ${readied.tag}.`);
    }
    const goblinTurn = endTurn({ state: readied.state, actorId: wizardId });
    if (goblinTurn.tag !== "resolved") {
      throw new Error(`Expected resolved End Turn, got ${goblinTurn.tag}.`);
    }
    const releaseSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "releaseReadiedSpell" as const,
      readiedSpellCasterId: wizardId,
      procedureRef: readiedSpellProcedureRef(goblinTurn.state),
    };
    const target = requireHole(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: releaseSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: releaseSubject,
        fills: [targetFill(target, goblinId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: releaseSubject,
        fills: [
          targetFill(target, goblinId),
          attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const released = resolveBattleSubject({
      state: goblinTurn.state,
      subject: releaseSubject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
        damageRollFill(damage, 4),
      ],
    });

    expect(released).toMatchObject({
      tag: "resolved",
      snapshot: {
        readiedResponses: { spells: [] },
        combatants: [
          { combatantId: wizardId, concentrating: false },
          {
            combatantId: goblinId,
            hp: 6,
          },
        ],
      },
    });
    expect(
      requireResolved(released).state.combatants.get(goblinId),
    ).toMatchObject({
      activeEffects: [{ kind: "speedDelta" }],
    });
  });

  test("readied spell release threads source penalties and damage repeat saves", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-readied-release-damage-lifecycle"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        characterSeed({
          combatantId: secondWizardId,
          displayName: "Second Wizard",
          initiative: 5,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("hideous_laughter")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Penalty Caster",
          initiative: 0,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("ray_of_enfeeblement")],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const expendedState = battleStateWithAllSpellSlotsExpended(
      battleStateWithAllSpellSlotsExpended(session.state, secondWizardId),
      fighterId,
    );
    const mechanicallyPossibleState: BattleState = {
      ...expendedState,
      initiative: {
        ...expendedState.initiative,
        round: Round(2),
      },
    };
    const caster = mechanicallyPossibleState.combatants.get(wizardId);
    const laughterCaster =
      mechanicallyPossibleState.combatants.get(secondWizardId);
    const penaltyCaster = mechanicallyPossibleState.combatants.get(fighterId);
    const target = mechanicallyPossibleState.combatants.get(goblinId);
    if (
      caster === undefined ||
      laughterCaster === undefined ||
      penaltyCaster === undefined ||
      target === undefined
    ) {
      throw new Error("Expected readied spell caster and target.");
    }
    const hideousLaughter = allocateBattleEffectOccurrenceForCreature({
      owner: target,
      effect: {
        kind: "hideousLaughter",
        sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
          session,
          secondWizardId,
          spellSlotInvocationRef("hideous_laughter", 1, "hideousLaughter"),
        ),
        sourceCombatantId: secondWizardId,
        conditionHadNonSpellProneSource: false,
        conditionHadNonSpellIncapacitatedSource: false,
        repeatSaveRollMode: null,
        save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
        expiresAt: {
          kind: "concentration",
          combatantId: secondWizardId,
          durationTicks: elapsedTimeTicks(9),
        },
      },
    });
    const sourceD20TestRollMode = allocateBattleEffectOccurrenceForCreature({
      owner: caster,
      effect: {
        kind: "abilityD20TestRollModeEndTurnSave",
        sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
          session,
          fighterId,
          spellSlotInvocationRef(
            "ray_of_enfeeblement",
            2,
            "abilityD20TestRollModeSaveGate",
          ),
        ),
        sourceCombatantId: fighterId,
        ability: "str",
        mode: "disadvantage",
        save: { ability: "con", dc: { kind: "caster_spell_save_dc" } },
        expiresAt: {
          kind: "concentration",
          combatantId: fighterId,
          durationTicks: elapsedTimeTicks(9),
        },
      },
    });
    const sourceDamageRollPenalty = allocateBattleEffectOccurrenceForCreature({
      owner: sourceD20TestRollMode.owner,
      effect: {
        kind: "sourceDamageRollPenalty",
        sourceProcedureRef: sourceD20TestRollMode.effect.sourceProcedureRef,
        sourceCombatantId: fighterId,
        amount: { dice: 1, dieSize: 8 },
        expiresAt: {
          kind: "concentration",
          combatantId: fighterId,
          durationTicks: elapsedTimeTicks(9),
        },
      },
    });
    const enrichedState: BattleState = {
      ...mechanicallyPossibleState,
      combatants: new Map(mechanicallyPossibleState.combatants)
        .set(wizardId, {
          ...sourceDamageRollPenalty.owner,
          activeEffects: [
            ...caster.activeEffects,
            sourceD20TestRollMode.effect,
            sourceDamageRollPenalty.effect,
          ],
        })
        .set(secondWizardId, {
          ...laughterCaster,
          concentration: {
            sourceProcedureRef: hideousLaughter.effect.sourceProcedureRef,
            effectKind: "spellEffect",
          },
        })
        .set(fighterId, {
          ...penaltyCaster,
          concentration: {
            sourceProcedureRef:
              sourceDamageRollPenalty.effect.sourceProcedureRef,
            effectKind: "spellEffect",
          },
        })
        .set(goblinId, {
          ...battleCreatureStateWithKnockOutPreservedConditions(
            hideousLaughter.owner,
            applyCondition(
              applyCondition(target.conditions, "prone"),
              "incapacitated",
            ),
          ),
          activeEffects: [...target.activeEffects, hideousLaughter.effect],
        }),
    };
    const enrichedSession = battleRuntimeSessionForTest({
      ...session,
      state: enrichedState,
    });
    const readied = requireResolved(
      resolveBattleSubject({
        state: enrichedState,
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            enrichedSession,
            wizardId,
            cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        fills: [],
      }),
    );
    const awaitingRayRepeatSave = endTurn({
      state: readied.state,
      actorId: wizardId,
    });
    const rayRepeatSave = requireHole(
      awaitingRayRepeatSave,
      "savingThrowOutcome",
    );
    const goblinTurn = requireResolved(
      endTurn({
        state: readied.state,
        actorId: wizardId,
        fills: [
          savingThrowOutcomeFill(rayRepeatSave, [
            { targetId: wizardId, succeeded: false },
          ]),
        ],
      }),
    );
    const releaseSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "releaseReadiedSpell" as const,
      readiedSpellCasterId: wizardId,
      procedureRef: readiedSpellProcedureRef(goblinTurn.state),
    };
    const targetHole = requireHole(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: releaseSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const targetFillValue = targetFill(targetHole, goblinId);
    const attackHole = requireHole(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: releaseSubject,
        fills: [targetFillValue],
      }),
      "attackRoll",
    );
    const attackFillValue = attackRollFill(attackHole, {
      total: 15,
      naturalD20: 10,
    });
    const damageHole = requireHole(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: releaseSubject,
        fills: [targetFillValue, attackFillValue],
      }),
      "rolledDice",
    );
    const damageFillValue = damageRollFill(damageHole, 4);
    const penaltyHole = requireHole(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: releaseSubject,
        fills: [targetFillValue, attackFillValue, damageFillValue],
      }),
      "rolledDice",
    );
    const penaltyFillValue = damageRollFillWithGroups(penaltyHole, [[1]]);
    const laughterHole = requireHole(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: releaseSubject,
        fills: [
          targetFillValue,
          attackFillValue,
          damageFillValue,
          penaltyFillValue,
        ],
      }),
      "savingThrowOutcome",
    );
    expect(laughterHole).toMatchObject({
      hideousLaughterRepeatSave: { targetId: goblinId, trigger: "damage" },
    });
    const released = requireResolved(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: releaseSubject,
        fills: [
          targetFillValue,
          attackFillValue,
          damageFillValue,
          penaltyFillValue,
          savingThrowOutcomeFill(laughterHole, [
            { targetId: goblinId, succeeded: true },
          ]),
        ],
      }),
    );

    expect(released.state.combatants.get(goblinId)?.hp).toBe(7);
    expect(
      released.state.combatants
        .get(goblinId)
        ?.activeEffects.some((effect) => effect.kind === "hideousLaughter"),
    ).toBe(false);
    expect(released.state.combatants.get(goblinId)?.conditions.prone).toBe(
      false,
    );
    expect(
      released.state.combatants.get(goblinId)?.conditions.directIncapacitated,
    ).toBe(false);
    expect(released.state.combatants.get(wizardId)?.concentration).toBeNull();
  });

  test("rejects a stale release command when no spell is held", () => {
    const state = wizardVsSkeletonBattle().state;

    expect(
      resolveBattleSubject({
        state,
        subject: {
          tag: "runtimeCommand",
          actorId: wizardId,
          command: "releaseReadiedSpell",
          readiedSpellCasterId: wizardId,
          procedureRef: battleProcedureExecutionRefForTest(
            "stale-readied-spell",
          ),
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "No matching readied spell is currently being held.",
    });
  });

  test("readied prepared slot spell releases without spending another Spell Slot", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-readied-slot-spell-release"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            session,
            wizardId,
            spellSlotInvocationRef(
              "magic_missile",
              1,
              "repeatedDamageAllocation",
            ),
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        fills: [],
      }),
    );
    expect(expendedLevelOneSlots(readied, wizardId)).toBe(1);
    const goblinTurn = requireResolved(
      endTurn({ state: readied.state, actorId: wizardId }),
    );
    const releaseSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "releaseReadiedSpell" as const,
      readiedSpellCasterId: wizardId,
      procedureRef: readiedSpellProcedureRef(goblinTurn.state),
    };
    const releaseAct = discoverBattleActCandidates(goblinTurn.state).find(
      (act) =>
        act.subject.tag === "runtimeCommand" &&
        act.subject.command === "releaseReadiedSpell" &&
        act.subject.readiedSpellCasterId === wizardId,
    );
    expect(releaseAct?.initialHoles).toMatchObject([
      {
        kind: "spellTargetAllocation",
        label: "Spell target allocation",
        allocationCount: 3,
      },
    ]);
    const target = requireHole(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: releaseSubject,
        fills: [],
      }),
      "spellTargetAllocation",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: releaseSubject,
        fills: [
          spellTargetAllocationFill(target, [{ targetId: goblinId, count: 3 }]),
        ],
      }),
      "rolledDice",
    );
    const released = requireResolved(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: releaseSubject,
        fills: [
          spellTargetAllocationFill(target, [{ targetId: goblinId, count: 3 }]),
          damageRollFillWithGroups(damage, [[1, 1, 1]]),
        ],
      }),
    );

    expect(expendedLevelOneSlots(released, wizardId)).toBe(1);
  });

  test("readied spells are held per caster", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-readied-per-caster"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        characterSeed({
          combatantId: secondWizardId,
          displayName: "Second Wizard",
          initiative: 15,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const state = session.state;
    const firstReadied = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            session,
            wizardId,
            cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        fills: [],
      }),
    ).state;
    const secondWizardTurn = requireResolved(
      endTurn({ state: firstReadied, actorId: wizardId }),
    ).state;
    const secondReadied = requireResolved(
      resolveBattleSubject({
        state: secondWizardTurn,
        subject: {
          tag: "actionSpell",
          actorId: secondWizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            battleRuntimeSessionForTest({
              state: secondWizardTurn,
              context: session.context,
            }),
            secondWizardId,
            cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
          ),
          mode: { tag: "ready", trigger: "saveFailed" },
        },
        fills: [],
      }),
    ).state;

    expect(snapshotBattle(secondReadied)).toMatchObject({
      readiedResponses: {
        spells: [{ casterId: wizardId }, { casterId: secondWizardId }],
      },
      combatants: [
        {
          combatantId: wizardId,
          concentrating: true,
        },
        {
          combatantId: secondWizardId,
          concentrating: true,
        },
        { combatantId: goblinId },
      ],
    });
  });
});
