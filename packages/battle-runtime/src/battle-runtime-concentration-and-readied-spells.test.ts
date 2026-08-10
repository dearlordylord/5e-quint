import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import type {
  BattleState,
  BattleSubject,
} from "./battle-runtime.test-support.ts";
import type { BattleActiveEffect } from "./index.ts";
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { describe, expect, test } from "vitest";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./battle-reducer/creature-hit-point-state.ts";
import {
  attackDamageDispositionFill,
  armorClass,
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
  requireElapsedHours,
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
  statBlockRecord,
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
    const state = wizardVsSkeletonBattle().state;
    const wizard = state.combatants.get(wizardId)!;
    const skeleton = state.combatants.get(skeletonId)!;
    const concentrating = {
      ...state,
      combatants: new Map(state.combatants)
        .set(wizardId, {
          ...wizard,
          concentration: {
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              String("hold_person"),
            ),
            effectKind: "spellEffect",
          },
        })
        .set(skeletonId, {
          ...skeleton,
          activeEffects: [
            {
              kind: "spellBaseArmorClass",
              sourceProcedureRef: battleProcedureExecutionRefForTest(
                String("hold_person"),
              ),
              sourceCombatantId: wizardId,
              base: armorClass(13),
              ability: "dex",
              expiresAt: {
                kind: "concentration",
                combatantId: wizardId,
                durationTicks: requireElapsedHours(1),
              },
              earlyEnds: [{ kind: "concentrationBroken" }],
            },
          ],
        }),
    } satisfies BattleState;

    const broken = breakBattleConcentration(concentrating, wizardId);

    expect(snapshotBattle(broken).combatants).toMatchObject([
      { combatantId: wizardId, concentrating: false },
      { combatantId: skeletonId },
    ]);
    expect(broken.combatants.get(skeletonId)?.activeEffects).toEqual([]);
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
          spellcasting: wizardSpellcasting(),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Penalty Caster",
          initiative: 0,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const caster = session.state.combatants.get(wizardId);
    const laughterCaster = session.state.combatants.get(secondWizardId);
    const penaltyCaster = session.state.combatants.get(fighterId);
    const target = session.state.combatants.get(goblinId);
    if (
      caster === undefined ||
      laughterCaster === undefined ||
      penaltyCaster === undefined ||
      target === undefined
    ) {
      throw new Error("Expected readied spell caster and target.");
    }
    const hideousLaughter = {
      kind: "hideousLaughter",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic_readied_release_hideous_laughter",
      ),
      sourceCombatantId: secondWizardId,
      conditionHadNonSpellProneSource: false,
      conditionHadNonSpellIncapacitatedSource: false,
      repeatSaveRollMode: null,
      save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
      expiresAt: { kind: "concentration", combatantId: secondWizardId },
    } satisfies Extract<
      BattleActiveEffect,
      { readonly kind: "hideousLaughter" }
    >;
    const sourceDamageRollPenalty = {
      kind: "sourceDamageRollPenalty" as const,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic_readied_release_source_penalty",
      ),
      sourceCombatantId: fighterId,
      amount: { dice: 1, dieSize: 8 },
      expiresAt: { kind: "concentration" as const, combatantId: fighterId },
    } satisfies Extract<
      BattleActiveEffect,
      { readonly kind: "sourceDamageRollPenalty" }
    >;
    const enrichedState: BattleState = {
      ...session.state,
      combatants: new Map(session.state.combatants)
        .set(wizardId, {
          ...caster,
          activeEffects: [...caster.activeEffects, sourceDamageRollPenalty],
        })
        .set(secondWizardId, {
          ...laughterCaster,
          concentration: {
            sourceProcedureRef: hideousLaughter.sourceProcedureRef,
            effectKind: "spellEffect",
          },
        })
        .set(fighterId, {
          ...penaltyCaster,
          concentration: {
            sourceProcedureRef: sourceDamageRollPenalty.sourceProcedureRef,
            effectKind: "spellEffect",
          },
        })
        .set(goblinId, {
          ...battleCreatureStateWithKnockOutPreservedConditions(
            target,
            applyCondition(
              applyCondition(target.conditions, "prone"),
              "incapacitated",
            ),
          ),
          activeEffects: [...target.activeEffects, hideousLaughter],
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
    expect(released.state.combatants.get(wizardId)?.concentration).toBeNull();
  });

  test("readied save-gated release threads source penalties and repeat saves", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-readied-save-release-damage-lifecycle"),
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
          spellcasting: wizardSpellcasting(),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Penalty Caster",
          initiative: 0,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const caster = session.state.combatants.get(wizardId);
    const laughterCaster = session.state.combatants.get(secondWizardId);
    const penaltyCaster = session.state.combatants.get(fighterId);
    const target = session.state.combatants.get(goblinId);
    if (
      caster === undefined ||
      laughterCaster === undefined ||
      penaltyCaster === undefined ||
      target === undefined
    ) {
      throw new Error("Expected readied save spell caster and target.");
    }
    const hideousLaughter = {
      kind: "hideousLaughter",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic_save_release_hideous_laughter",
      ),
      sourceCombatantId: secondWizardId,
      conditionHadNonSpellProneSource: false,
      conditionHadNonSpellIncapacitatedSource: false,
      repeatSaveRollMode: null,
      save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
      expiresAt: { kind: "concentration", combatantId: secondWizardId },
    } satisfies Extract<
      BattleActiveEffect,
      { readonly kind: "hideousLaughter" }
    >;
    const sourceDamageRollPenalty = {
      kind: "sourceDamageRollPenalty" as const,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic_save_release_source_penalty",
      ),
      sourceCombatantId: fighterId,
      amount: { dice: 1, dieSize: 8 },
      expiresAt: { kind: "concentration" as const, combatantId: fighterId },
    } satisfies Extract<
      BattleActiveEffect,
      { readonly kind: "sourceDamageRollPenalty" }
    >;
    const enrichedState: BattleState = {
      ...session.state,
      combatants: new Map(session.state.combatants)
        .set(wizardId, {
          ...caster,
          activeEffects: [...caster.activeEffects, sourceDamageRollPenalty],
        })
        .set(secondWizardId, {
          ...laughterCaster,
          concentration: {
            sourceProcedureRef: hideousLaughter.sourceProcedureRef,
            effectKind: "spellEffect",
          },
        })
        .set(fighterId, {
          ...penaltyCaster,
          concentration: {
            sourceProcedureRef: sourceDamageRollPenalty.sourceProcedureRef,
            effectKind: "spellEffect",
          },
        })
        .set(goblinId, {
          ...battleCreatureStateWithKnockOutPreservedConditions(
            target,
            applyCondition(
              applyCondition(target.conditions, "prone"),
              "incapacitated",
            ),
          ),
          activeEffects: [...target.activeEffects, hideousLaughter],
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
            cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        fills: [],
      }),
    );
    const targetTurn = requireResolved(
      endTurn({ state: readied.state, actorId: wizardId }),
    );
    const releaseSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "releaseReadiedSpell" as const,
      readiedSpellCasterId: wizardId,
      procedureRef: readiedSpellProcedureRef(targetTurn.state),
    };
    const initialRelease = resolveBattleSubject({
      state: targetTurn.state,
      subject: releaseSubject,
      fills: [],
    });
    const saveHole = requireHole(initialRelease, "savingThrowOutcome");
    const failedSave = savingThrowOutcomeFill(saveHole, [
      { targetId: goblinId, succeeded: false },
    ]);
    const needsDamage = resolveBattleSubject({
      state: targetTurn.state,
      subject: releaseSubject,
      fills: [failedSave],
    });
    const damageHole = requireHole(needsDamage, "rolledDice");
    const damage = damageRollFillWithGroups(damageHole, [[6]]);
    const penaltyHole = requireHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: releaseSubject,
        fills: [failedSave, damage],
      }),
      "rolledDice",
    );
    const penalty = damageRollFillWithGroups(penaltyHole, [[1]]);
    const laughterHole = requireHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: releaseSubject,
        fills: [failedSave, damage, penalty],
      }),
      "savingThrowOutcome",
    );
    expect(laughterHole).toMatchObject({
      hideousLaughterRepeatSave: { targetId: goblinId, trigger: "damage" },
    });
    const released = resolveBattleSubject({
      state: targetTurn.state,
      subject: releaseSubject,
      fills: [
        failedSave,
        damage,
        penalty,
        savingThrowOutcomeFill(laughterHole, [
          { targetId: goblinId, succeeded: true },
        ]),
      ],
    });

    expect(released.tag).toBe("resolved");
    if (released.tag !== "resolved") {
      throw new Error("Expected save-gated readied spell to resolve.");
    }
    expect(released.state.readiedSpells.size).toBe(0);
    expect(released.state.combatants.get(goblinId)?.hp).toBe(5);
    expect(
      released.state.combatants
        .get(goblinId)
        ?.activeEffects.some((effect) => effect.kind === "hideousLaughter"),
    ).toBe(false);
  });

  test("readied Contagion release admits the failed-save ability and condition path", () => {
    const durableTarget = statBlockRecord();
    const durableTargetWithHp = {
      ...durableTarget,
      statBlock: {
        ...durableTarget.statBlock,
        hp: { kind: "literal" as const, value: 20 },
      },
    };
    const session = startBattleSessionRight({
      battleId: battleId("battle-readied-contagion-release"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("contagion")],
            spellSlots: [{ spellLevel: 5, count: 1 }],
          }),
        }),
        statBlockCreatureInit({
          initiative: 10,
          statBlock: durableTargetWithHp,
        }),
      ],
    });
    const readied = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            session,
            wizardId,
            spellSlotInvocationRef("contagion", 5, "saveGatedDamage"),
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        fills: [],
      }),
    );
    const targetTurn = requireResolved(
      endTurn({ state: readied.state, actorId: wizardId }),
    );
    const releaseSubject = {
      tag: "runtimeCommand" as const,
      actorId: goblinId,
      command: "releaseReadiedSpell" as const,
      readiedSpellCasterId: wizardId,
      procedureRef: readiedSpellProcedureRef(targetTurn.state),
    };
    const targetHole = requireHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: releaseSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const target = targetFill(targetHole, goblinId);
    const abilityHole = requireHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: releaseSubject,
        fills: [target],
      }),
      "abilityChoice",
    );
    const ability = {
      kind: "abilityChoice" as const,
      holeId: abilityHole.holeId,
      value: "wis" as const,
    };
    const saveHole = requireHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: releaseSubject,
        fills: [target, ability],
      }),
      "savingThrowOutcome",
    );
    const failedSave = savingThrowOutcomeFill(saveHole, [
      { targetId: goblinId, succeeded: false },
    ]);
    const damageHole = requireHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: releaseSubject,
        fills: [target, ability, failedSave],
      }),
      "rolledDice",
    );
    const damage = damageRollFillWithGroups(damageHole, [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ]);
    const released = resolveBattleSubject({
      state: targetTurn.state,
      subject: releaseSubject,
      fills: [target, ability, failedSave, damage],
    });

    expect(released.tag).toBe("resolved");
    if (released.tag !== "resolved") {
      throw new Error(
        "Expected Contagion to resolve from the readied release.",
      );
    }
    expect(released.state.readiedSpells.size).toBe(0);
    expect(released.state.combatants.get(goblinId)?.hp).toBe(9);
    expect(released.state.combatants.get(goblinId)?.conditions).toMatchObject({
      poisoned: true,
    });
    expect(released.state.combatants.get(goblinId)?.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "spellConditionCountedEndTurnSave",
          condition: "poisoned",
        }),
      ]),
    );
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
