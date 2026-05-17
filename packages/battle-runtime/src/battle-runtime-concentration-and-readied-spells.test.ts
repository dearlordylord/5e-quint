import {
  startBattleRight,
  requireElapsedHours,
  requireResolved,
  goblinAttackSubject,
  attackInitialTargetHole,
  attackRollHoleAfterTarget,
  attackDamageHoleAfterHit,
  requireHole,
  targetFill,
  spellTargetAllocationFill,
  attackRollFill,
  concentrationSavingThrowFill,
  damageRollFill,
  damageRollFillWithGroups,
  attackDamageDispositionFill,
  characterSeed,
  statBlockCreatureInit,
  wizardVsSkeletonBattle,
  wizardSpellcasting,
  spellRecord,
  magicSubject,
  expendedLevelOneSlots,
  fighterId,
  goblinId,
  skeletonId,
  wizardId,
  secondWizardId,
  battleId,
  breakBattleConcentration,
  cantripSpellInvocationRef,
  concentrationSavingThrowDc,
  discoverBattleActs,
  endTurn,
  resolveBattleConcentrationDamage,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
} from "./battle-runtime-test-support.ts";
import type {
  BattleState,
  BattleSubject,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: Concentration and readied spells", () => {
  test("readied spell attack misses consume next-attack spell riders", () => {
    const state = startBattleRight({
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
    const guidingSubject: BattleSubject = {
      tag: "actionSpell",
      actorId: fighterId,
      invocation: spellSlotInvocationRef(
        "guiding_bolt",
        1,
        "spellAttackDamage",
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
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
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
    const state = wizardVsSkeletonBattle();
    const wizard = state.combatants.get(wizardId)!;
    const skeleton = state.combatants.get(skeletonId)!;
    const concentrating = {
      ...state,
      combatants: new Map(state.combatants)
        .set(wizardId, {
          ...wizard,
          concentration: {
            sourceSpellId: "hold_person",
            effectKind: "spellEffect",
          },
        })
        .set(skeletonId, {
          ...skeleton,
          activeEffects: [
            {
              kind: "spellBaseArmorClass",
              sourceSpellId: "hold_person",
              sourceCombatantId: wizardId,
              base: 13,
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
    const state = startBattleRight({
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
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
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
          sourceSpellId: "hold_person",
          effectKind: "spellEffect",
        },
      }),
    } satisfies BattleState;

    const broken = breakBattleConcentration(concentrating, wizardId);

    expect(broken.combatants.get(wizardId)?.concentration).toBeNull();
    expect(broken.readiedSpells.has(wizardId)).toBe(true);
  });

  test("failed concentration damage save uses the same concentration lifecycle", () => {
    const state = wizardVsSkeletonBattle();
    const wizard = state.combatants.get(wizardId)!;
    const concentrating = {
      ...state,
      combatants: new Map(state.combatants).set(wizardId, {
        ...wizard,
        concentration: {
          sourceSpellId: "readied_acid_splash",
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
      sourceSpellId: "readied_acid_splash",
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
    const state = startBattleRight({
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
    const readySubject = {
      tag: "actionSpell" as const,
      actorId: wizardId,
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
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
      goblinAttackSubject("Scimitar"),
    );
    const roll = attackRollHoleAfterTarget(
      goblinTurn.state,
      target,
      goblinAttackSubject("Scimitar"),
      wizardId,
    );
    const damage = attackDamageHoleAfterHit(
      goblinTurn.state,
      target,
      roll,
      { total: 14, naturalD20: 10 },
      goblinAttackSubject("Scimitar"),
      wizardId,
    );
    const needsConcentration = resolveBattleSubject({
      state: goblinTurn.state,
      subject: goblinAttackSubject("Scimitar"),
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
      subject: goblinAttackSubject("Scimitar"),
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
    const state = startBattleRight({
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
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "actionSpell" as const,
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
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
      goblinAttackSubject("Scimitar"),
    );
    const roll = attackRollHoleAfterTarget(
      goblinTurn.state,
      target,
      goblinAttackSubject("Scimitar"),
      wizardId,
    );
    const damage = attackDamageHoleAfterHit(
      goblinTurn.state,
      target,
      roll,
      { total: 14, naturalD20: 10 },
      goblinAttackSubject("Scimitar"),
      wizardId,
    );
    const concentration = requireHole(
      resolveBattleSubject({
        state: goblinTurn.state,
        subject: goblinAttackSubject("Scimitar"),
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
        subject: goblinAttackSubject("Scimitar"),
        fills: [
          targetFill(target, wizardId),
          attackRollFill(roll, { total: 14, naturalD20: 10 }),
          damageRollFill(damage, 3),
          concentrationSavingThrowFill(concentration, true),
        ],
      }),
    );

    expect(maintained.state.combatants.get(wizardId)?.concentration).toEqual({
      sourceSpellId: "ray_of_frost",
      effectKind: "readiedSpell",
    });
  });

  test("Eldritch Mind does not affect ordinary Constitution spell saves", () => {
    const state = startBattleRight({
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

    const target = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("inflict_wounds"),
        fills: [],
      }),
      "targetChoice",
    );
    const savingThrow = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("inflict_wounds"),
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
    const state = startBattleRight({
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
    const readySubject = {
      tag: "actionSpell" as const,
      actorId: wizardId,
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
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
    const subject = goblinAttackSubject("Scimitar");
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
    const state = startBattleRight({
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
    const readied = resolveBattleSubject({
      state,
      subject: {
        tag: "actionSpell",
        actorId: wizardId,
        invocation: cantripSpellInvocationRef(
          "ray_of_frost",
          "spellAttackDamage",
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

  test("readied prepared slot spell releases without spending another Spell Slot", () => {
    const state = startBattleRight({
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
    const readied = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
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
    };
    const releaseAct = discoverBattleActs(goblinTurn.state).find(
      (act) =>
        act.subject.tag === "runtimeCommand" &&
        act.subject.command === "releaseReadiedSpell" &&
        act.subject.readiedSpellCasterId === wizardId,
    );
    expect(releaseAct?.initialHoles).toMatchObject([
      {
        kind: "spellTargetAllocation",
        label: "Magic Missile target allocation",
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
    const state = startBattleRight({
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
    const firstReadied = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready", trigger: "spellCast" },
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
          invocation: cantripSpellInvocationRef(
            "acid_splash",
            "saveGatedDamage",
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
