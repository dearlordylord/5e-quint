import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { describe, expect, test } from "vitest";
import {
  battleActSpellPresentation,
  battleSelectedSpellInvocationForProcedure,
} from "./battle-act-composition.ts";
import type {
  BattleState,
  BattleSubject,
} from "./battle-runtime.test-support.ts";
import {
  attackRollFill,
  battleId,
  battleProcedureExecutionRefForSpellHoleForTest,
  battleProcedureExecutionRefForTest,
  cantripSpellInvocationRef,
  characterSeed,
  combatantId,
  damageRollFill,
  damageRollFillWithGroups,
  discoverBattleActs,
  endTurn,
  expendedLevelOneSlots,
  fighterId,
  fighterTurnWithReadiedRayAndHealer,
  findHole,
  holeId,
  interruptDecisionFill,
  magicSubject,
  movementDeltaFeet,
  requireCharacterSpellProcedureRefForTest,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  secondWizardId,
  skeletonCreatureInit,
  skeletonId,
  slotAttackDamageSpell,
  slotSaveDamageSpell,
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

describe("battle runtime: spellcasting actions and slots", () => {
  test("Wizard action-time spell acts spend slots for prepared level-1 spells but not cantrips", () => {
    const magicMissileState = wizardVsSkeletonBattle();
    const magicMissileProcedureRef = requireCharacterSpellProcedureRefForTest(
      magicMissileState,
      wizardId,
      spellSlotInvocationRef("magic_missile", 1, "repeatedDamageAllocation"),
    );
    expect(
      battleSelectedSpellInvocationForProcedure(
        magicMissileState,
        wizardId,
        magicMissileProcedureRef,
      ),
    ).toMatchObject({ spell: { id: "magic_missile" } });
    expect(
      battleSelectedSpellInvocationForProcedure(
        magicMissileState,
        skeletonId,
        magicMissileProcedureRef,
      ),
    ).toBeUndefined();
    expect(
      discoverBattleActs(magicMissileState).map((act) => act.subject),
    ).toEqual(
      expect.arrayContaining([
        { tag: "action", actorId: wizardId, action: "grapple" },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: magicMissileProcedureRef,
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: magicMissileProcedureRef,
          mode: { tag: "ready", trigger: "attackHit" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: magicMissileProcedureRef,
          mode: { tag: "ready", trigger: "spellCast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: magicMissileProcedureRef,
          mode: { tag: "ready", trigger: "saveFailed" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: magicMissileProcedureRef,
          mode: { tag: "ready", trigger: "afterDamage" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            magicMissileState,
            wizardId,
            cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
          ),
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            magicMissileState,
            wizardId,
            cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            magicMissileState,
            wizardId,
            cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
          ),
          mode: { tag: "ready", trigger: "spellCast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            magicMissileState,
            wizardId,
            cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
          ),
          mode: { tag: "ready", trigger: "saveFailed" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            magicMissileState,
            wizardId,
            cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
          ),
          mode: { tag: "ready", trigger: "afterDamage" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            magicMissileState,
            wizardId,
            cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
          ),
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            magicMissileState,
            wizardId,
            cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            magicMissileState,
            wizardId,
            cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
          ),
          mode: { tag: "ready", trigger: "spellCast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            magicMissileState,
            wizardId,
            cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
          ),
          mode: { tag: "ready", trigger: "saveFailed" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            magicMissileState,
            wizardId,
            cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
          ),
          mode: { tag: "ready", trigger: "afterDamage" },
        },
        { tag: "runtimeCommand", actorId: wizardId, command: "move" },
        { tag: "runtimeCommand", actorId: wizardId, command: "endTurn" },
      ]),
    );

    const magicMissileTarget = requireHole(
      resolveBattleSubject({
        session: magicMissileState,
        subject: magicSubject("magic_missile"),
        fills: [],
      }),
      "spellTargetAllocation",
    );
    expect(magicMissileTarget).toMatchObject({
      label: "Spell target allocation",
      allocationCount: 3,
      choices: [wizardId, skeletonId],
    });
    expect(
      resolveBattleSubject({
        session: magicMissileState,
        subject: magicSubject("magic_missile"),
        fills: [
          spellTargetAllocationFill(magicMissileTarget, [
            { targetId: wizardId, count: 0 },
            { targetId: skeletonId, count: 3 },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Spell target allocation entries must assign a positive integer count.",
    });
    const magicMissileDamage = requireHole(
      resolveBattleSubject({
        session: magicMissileState,
        subject: magicSubject("magic_missile"),
        fills: [
          spellTargetAllocationFill(magicMissileTarget, [
            { targetId: skeletonId, count: 3 },
          ]),
        ],
      }),
      "rolledDice",
    );
    expect(magicMissileDamage).toMatchObject({
      label: "Spell damage (3d4+3-force)",
    });
    expect(
      resolveBattleSubject({
        session: magicMissileState,
        subject: magicSubject("magic_missile"),
        fills: [
          {
            kind: "savingThrowOutcome",
            holeId: holeId("battle:spell:saving-throw-outcome:magic_missile"),
            value: {
              area: {
                originAnchorId: wizardId,
                affectedTargetIds: [skeletonId],
              },
              outcomes: [{ targetId: skeletonId, succeeded: false }],
            },
          },
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    const magicMissile = resolveBattleSubject({
      session: magicMissileState,
      subject: magicSubject("magic_missile"),
      fills: [
        spellTargetAllocationFill(magicMissileTarget, [
          { targetId: skeletonId, count: 3 },
        ]),
        damageRollFillWithGroups(magicMissileDamage, [[1, 1, 1]]),
      ],
    });
    expect(magicMissile).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 7 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(expendedLevelOneSlots(requireResolved(magicMissile), wizardId)).toBe(
      1,
    );

    const healingWordState = startBattleSessionRight({
      battleId: battleId("battle-healing-word-bonus-action"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Healer",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("healing_word")],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          initiative: 10,
          currentHp: 4,
        }),
      ],
    });
    const healingWordAct = discoverBattleActs(healingWordState).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "healing_word",
    );
    expect(healingWordAct).toMatchObject({
      subject: {
        tag: "bonusActionSpell",
        actorId: wizardId,
        procedureRef: requireCharacterSpellProcedureRefForTest(
          healingWordState,
          wizardId,
          spellSlotInvocationRef(
            "healing_word",
            1,
            "directHitPointRestoration",
          ),
        ),
        mode: { tag: "cast" },
      },
      initialHoles: [{ kind: "targetChoice" }],
    });
    if (healingWordAct === undefined) {
      throw new Error("Expected Healing Word Bonus Action spell act.");
    }
    const healingWordTarget = findHole(
      healingWordAct.initialHoles,
      "targetChoice",
    );
    const healingWordRoll = requireHole(
      resolveBattleSubject({
        state: healingWordState.state,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, fighterId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: fighterId,
              sourceProcedureRef:
                battleProcedureExecutionRefForSpellHoleForTest(
                  healingWordTarget,
                ),
            },
          ]),
        ],
      }),
      "rolledDice",
    );
    const healingWord = requireResolved(
      resolveBattleSubject({
        state: healingWordState.state,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, fighterId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: fighterId,
              sourceProcedureRef:
                battleProcedureExecutionRefForSpellHoleForTest(
                  healingWordTarget,
                ),
            },
          ]),
          damageRollFillWithGroups(healingWordRoll, [[4, 3]]),
        ],
      }),
    );
    expect(healingWord.snapshot.turn.bonusActionAvailable).toBe(false);
    expect(healingWord.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: fighterId, hp: 12 }),
      ]),
    );
    expect(expendedLevelOneSlots(healingWord, wizardId)).toBe(1);
    expect(
      discoverBattleActs(healingWordState).some(
        (act) =>
          act.subject.tag === "bonusActionSpell" &&
          battleActSpellPresentation(act)?.invocation.spellId ===
            "magic_missile",
      ),
    ).toBe(false);

    const slotTurnState = startBattleSessionRight({
      battleId: battleId("battle-one-slot-spell-per-turn"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Healer",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [
              spellRecord("magic_missile"),
              spellRecord("healing_word"),
            ],
          }),
        }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          initiative: 10,
          currentHp: 10,
        }),
      ],
    });
    const slotTurnMissileTarget = requireHole(
      resolveBattleSubject({
        session: slotTurnState,
        subject: magicSubject("magic_missile"),
        fills: [],
      }),
      "spellTargetAllocation",
    );
    const slotTurnMissileDamage = requireHole(
      resolveBattleSubject({
        session: slotTurnState,
        subject: magicSubject("magic_missile"),
        fills: [
          spellTargetAllocationFill(slotTurnMissileTarget, [
            { targetId: skeletonId, count: 3 },
          ]),
        ],
      }),
      "rolledDice",
    );
    const afterSlotSpell = requireResolved(
      resolveBattleSubject({
        session: slotTurnState,
        subject: magicSubject("magic_missile"),
        fills: [
          spellTargetAllocationFill(slotTurnMissileTarget, [
            { targetId: skeletonId, count: 3 },
          ]),
          damageRollFillWithGroups(slotTurnMissileDamage, [[1, 1, 1]]),
        ],
      }),
    ).state;
    expect(afterSlotSpell.currentTurnResources).toMatchObject({
      currentHasBonusAction: true,
      commandHalt: null,
      spellSlotUsesThisTurn: [{ kind: "committed", combatantId: wizardId }],
      levelOnePlusSpellCastsThisTurn: [wizardId],
    });
    expect(
      discoverBattleActs(
        battleRuntimeSessionForTest({
          ...slotTurnState,
          state: afterSlotSpell,
        }),
      ).some(
        (act) =>
          act.subject.tag === "bonusActionSpell" &&
          battleActSpellPresentation(act)?.invocation.spellId ===
            "healing_word",
      ),
    ).toBe(false);
    expect(
      resolveBattleSubject({
        state: afterSlotSpell,
        subject: {
          tag: "bonusActionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            battleRuntimeSessionForTest({
              ...slotTurnState,
              state: afterSlotSpell,
            }),
            wizardId,
            spellSlotInvocationRef(
              "healing_word",
              1,
              "directHitPointRestoration",
            ),
          ),
          mode: { tag: "cast" },
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "This turn has already expended a Spell Slot.",
    });

    const healingWordReactionState =
      fighterTurnWithReadiedRayAndHealer("spellCast");
    const healingWordReactionAct = discoverBattleActs(
      healingWordReactionState,
    ).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "healing_word",
    );
    if (healingWordReactionAct === undefined) {
      throw new Error("Expected Healing Word Bonus Action spell act.");
    }
    const reactionTarget = findHole(
      healingWordReactionAct.initialHoles,
      "targetChoice",
    );
    const reactionTargetFill = targetFill(reactionTarget, fighterId, [
      {
        kind: "spellTarget",
        casterId: fighterId,
        targetId: fighterId,
        sourceProcedureRef:
          battleProcedureExecutionRefForSpellHoleForTest(reactionTarget),
      },
    ]);
    const awaitingSpellCastReaction = resolveBattleSubject({
      state: healingWordReactionState.state,
      subject: healingWordReactionAct.subject,
      fills: [reactionTargetFill],
    });
    expect(awaitingSpellCastReaction).toMatchObject({
      tag: "needsHoles",
      subject: healingWordReactionAct.subject,
      holes: [{ kind: "interruptDecision", trigger: "spellCast" }],
      snapshot: {
        pendingInterrupt: {
          trigger: "spellCast",
        },
      },
    });
    if (awaitingSpellCastReaction.tag !== "needsHoles") {
      throw new Error(
        `Expected needsHoles, got ${awaitingSpellCastReaction.tag}.`,
      );
    }
    const afterDecline = resolveBattleInterrupt({
      state: awaitingSpellCastReaction.state,
      fill: interruptDecisionFill(
        awaitingSpellCastReaction.snapshot.pendingInterrupt!.decisionHole,
        { kind: "decline", responderId: wizardId },
      ),
    });
    expect(afterDecline).toMatchObject({
      tag: "needsHoles",
      subject: healingWordReactionAct.subject,
      holes: [{ kind: "rolledDice", label: "Spell healing (2d4+3)" }],
      snapshot: { pendingInterrupt: null },
    });

    const levelTwoState = startBattleSessionRight({
      battleId: battleId("battle-magic-missile-split-targets"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            spellSlots: [
              { spellLevel: 1, count: 2 },
              { spellLevel: 2, count: 1 },
            ],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Fighter",
          initiative: 15,
          attack: null,
          currentHp: 20,
          maxHp: 20,
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    expect(discoverBattleActs(levelTwoState).map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            levelTwoState,
            wizardId,
            spellSlotInvocationRef(
              "magic_missile",
              2,
              "repeatedDamageAllocation",
            ),
          ),
          mode: { tag: "cast" },
        },
      ]),
    );
    const levelTwoSubject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        levelTwoState,
        wizardId,
        spellSlotInvocationRef("magic_missile", 2, "repeatedDamageAllocation"),
      ),
      mode: { tag: "cast" },
    };
    const levelTwoTargets = requireHole(
      resolveBattleSubject({
        state: levelTwoState.state,
        subject: levelTwoSubject,
        fills: [],
      }),
      "spellTargetAllocation",
    );
    expect(levelTwoTargets).toMatchObject({ allocationCount: 4 });
    const levelTwoDamage = requireHole(
      resolveBattleSubject({
        state: levelTwoState.state,
        subject: levelTwoSubject,
        fills: [
          spellTargetAllocationFill(levelTwoTargets, [
            { targetId: skeletonId, count: 3 },
            { targetId: fighterId, count: 1 },
          ]),
        ],
      }),
      "rolledDice",
    );
    expect(levelTwoDamage).toMatchObject({
      label: "Spell damage (4d4+4-force)",
    });
    const splitMagicMissile = resolveBattleSubject({
      state: levelTwoState.state,
      subject: levelTwoSubject,
      fills: [
        spellTargetAllocationFill(levelTwoTargets, [
          { targetId: skeletonId, count: 3 },
          { targetId: fighterId, count: 1 },
        ]),
        damageRollFillWithGroups(levelTwoDamage, [[1, 1, 1], [4]]),
      ],
    });
    expect(splitMagicMissile).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: fighterId, hp: 15 },
          { combatantId: skeletonId, hp: 7 },
        ],
      },
    });

    const secondWizardSession = startBattleSessionRight({
      battleId: battleId("battle-second-wizard-ready-after-damage"),
      combatants: [
        characterSeed({
          combatantId: secondWizardId,
          displayName: "Second Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting(),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const secondWizardReady = requireResolved(
      resolveBattleSubject({
        state: secondWizardSession.state,
        subject: {
          tag: "actionSpell",
          actorId: secondWizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            secondWizardSession,
            secondWizardId,
            cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
          ),
          mode: { tag: "ready", trigger: "afterDamage" },
        },
        fills: [],
      }),
    ).state;
    const readiedRay = secondWizardReady.readiedSpells.get(secondWizardId);
    const concentratingSecondWizard =
      secondWizardReady.combatants.get(secondWizardId);
    if (readiedRay === undefined || concentratingSecondWizard === undefined) {
      throw new Error("Expected Second Wizard to hold a Readied Spell.");
    }
    const afterDamageSequenceState = {
      ...levelTwoState.state,
      combatants: new Map(levelTwoState.state.combatants).set(
        secondWizardId,
        concentratingSecondWizard,
      ),
      readiedSpells: new Map([[secondWizardId, readiedRay]]),
    } satisfies BattleState;
    const splitWithAfterDamageReaction = resolveBattleSubject({
      state: afterDamageSequenceState,
      subject: levelTwoSubject,
      fills: [
        spellTargetAllocationFill(levelTwoTargets, [
          { targetId: skeletonId, count: 3 },
          { targetId: fighterId, count: 1 },
        ]),
        damageRollFillWithGroups(levelTwoDamage, [[1, 1, 1], [4]]),
      ],
    });
    expect(splitWithAfterDamageReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "afterDamage" }],
      snapshot: {
        pendingInterrupt: {
          trigger: "afterDamage",
        },
      },
    });
    if (splitWithAfterDamageReaction.tag !== "needsHoles") {
      throw new Error("Expected first after-damage reaction window.");
    }
    const secondAfterDamageReaction = resolveBattleInterrupt({
      state: splitWithAfterDamageReaction.state,
      fill: interruptDecisionFill(
        splitWithAfterDamageReaction.snapshot.pendingInterrupt!.decisionHole,
        { kind: "decline", responderId: secondWizardId },
      ),
    });
    expect(secondAfterDamageReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "afterDamage" }],
      snapshot: {
        pendingInterrupt: {
          trigger: "afterDamage",
        },
      },
    });

    const rayState = wizardVsSkeletonBattle();
    const rayTarget = requireHole(
      resolveBattleSubject({
        session: rayState,
        subject: magicSubject("ray_of_frost"),
        fills: [],
      }),
      "targetChoice",
    );
    const rayProcedureRef =
      battleProcedureExecutionRefForSpellHoleForTest(rayTarget);
    const rayRoll = requireHole(
      resolveBattleSubject({
        session: rayState,
        subject: magicSubject("ray_of_frost"),
        fills: [targetFill(rayTarget, skeletonId)],
      }),
      "attackRoll",
    );
    expect(rayRoll).toMatchObject({
      attackBonus: 5,
    });
    const rayDamage = requireHole(
      resolveBattleSubject({
        session: rayState,
        subject: magicSubject("ray_of_frost"),
        fills: [
          targetFill(rayTarget, skeletonId),
          attackRollFill(rayRoll, { total: 14, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const ray = resolveBattleSubject({
      session: rayState,
      subject: magicSubject("ray_of_frost"),
      fills: [
        targetFill(rayTarget, skeletonId),
        attackRollFill(rayRoll, { total: 14, naturalD20: 10 }),
        damageRollFill(rayDamage, 4),
      ],
    });

    expect(ray).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          {
            combatantId: skeletonId,
            hp: 9,
          },
        ],
      },
    });
    expect(requireResolved(ray).state.combatants.get(skeletonId)).toMatchObject(
      {
        activeEffects: [
          {
            kind: "speedDelta",
            sourceProcedureRef: rayProcedureRef,
            sourceCombatantId: wizardId,
            deltaFeet: movementDeltaFeet(-10),
            expiresAt: {
              kind: "startOfTurn",
              combatantId: wizardId,
            },
          },
        ],
      },
    );
    expect(expendedLevelOneSlots(requireResolved(ray), wizardId)).toBe(0);

    const existingSpeedDeltaProcedureRef = battleProcedureExecutionRefForTest(
      "existing-speed-delta-procedure",
    );
    const stackedRayState = {
      ...rayState.state,
      combatants: new Map(rayState.state.combatants).set(skeletonId, {
        ...rayState.state.combatants.get(skeletonId)!,
        activeEffects: [
          {
            kind: "speedDelta",
            sourceProcedureRef: existingSpeedDeltaProcedureRef,
            sourceCombatantId: combatantId("other-wizard"),
            deltaFeet: movementDeltaFeet(-10),
            expiresAt: {
              kind: "startOfTurn",
              combatantId: combatantId("other-wizard"),
            },
          },
        ],
      }),
    } satisfies BattleState;
    const refreshedRay = resolveBattleSubject({
      session: battleRuntimeSessionForTest({
        ...rayState,
        state: stackedRayState,
      }),
      subject: magicSubject("ray_of_frost"),
      fills: [
        targetFill(rayTarget, skeletonId),
        attackRollFill(rayRoll, { total: 14, naturalD20: 10 }),
        damageRollFill(rayDamage, 4),
      ],
    });
    expect(refreshedRay).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [{ combatantId: wizardId }, { combatantId: skeletonId }],
      },
    });
    expect(
      requireResolved(refreshedRay).state.combatants.get(skeletonId),
    ).toMatchObject({
      activeEffects: [
        {
          kind: "speedDelta",
          sourceProcedureRef: existingSpeedDeltaProcedureRef,
          sourceCombatantId: combatantId("other-wizard"),
          deltaFeet: movementDeltaFeet(-10),
          expiresAt: {
            kind: "startOfTurn",
            combatantId: combatantId("other-wizard"),
          },
        },
        {
          kind: "speedDelta",
          sourceProcedureRef: rayProcedureRef,
          sourceCombatantId: wizardId,
          deltaFeet: movementDeltaFeet(-10),
          expiresAt: {
            kind: "startOfTurn",
            combatantId: wizardId,
          },
        },
      ],
    });

    const criticalRayState = wizardVsSkeletonBattle();
    const criticalRayTarget = requireHole(
      resolveBattleSubject({
        session: criticalRayState,
        subject: magicSubject("ray_of_frost"),
        fills: [],
      }),
      "targetChoice",
    );
    const criticalRayRoll = requireHole(
      resolveBattleSubject({
        session: criticalRayState,
        subject: magicSubject("ray_of_frost"),
        fills: [targetFill(criticalRayTarget, skeletonId)],
      }),
      "attackRoll",
    );
    const criticalRayDamage = requireHole(
      resolveBattleSubject({
        session: criticalRayState,
        subject: magicSubject("ray_of_frost"),
        fills: [
          targetFill(criticalRayTarget, skeletonId),
          attackRollFill(criticalRayRoll, { total: 20, naturalD20: 20 }),
        ],
      }),
      "rolledDice",
    );
    expect(criticalRayDamage).toMatchObject({
      label: "Spell damage (2d8-cold)",
      critical: true,
    });
    expect(
      resolveBattleSubject({
        session: criticalRayState,
        subject: magicSubject("ray_of_frost"),
        fills: [
          targetFill(criticalRayTarget, skeletonId),
          attackRollFill(criticalRayRoll, { total: 20, naturalD20: 20 }),
          damageRollFill(criticalRayDamage, 4),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(
      resolveBattleSubject({
        session: criticalRayState,
        subject: magicSubject("ray_of_frost"),
        fills: [
          targetFill(criticalRayTarget, skeletonId),
          attackRollFill(criticalRayRoll, { total: 20, naturalD20: 20 }),
          damageRollFillWithGroups(criticalRayDamage, [[4, 4]]),
        ],
      }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 5 },
        ],
      },
    });

    const afterWizardTurn = endTurn({
      state: requireResolved(ray).state,
      actorId: wizardId,
    });
    if (afterWizardTurn.tag !== "resolved") {
      throw new Error(
        `Expected resolved Wizard End Turn, got ${afterWizardTurn.tag}.`,
      );
    }
    const afterSkeletonTurn = endTurn({
      state: afterWizardTurn.state,
      actorId: skeletonId,
    });
    expect(afterSkeletonTurn).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: wizardId,
        combatants: [{ combatantId: wizardId }, { combatantId: skeletonId }],
      },
    });
    if (afterSkeletonTurn.tag !== "resolved") {
      throw new Error("Expected Ray of Frost cleanup turn to resolve.");
    }
    expect(
      afterSkeletonTurn.state.combatants.get(skeletonId)?.activeEffects,
    ).toEqual([]);

    const rayMiss = resolveBattleSubject({
      session: rayState,
      subject: magicSubject("ray_of_frost"),
      fills: [
        targetFill(rayTarget, skeletonId),
        attackRollFill(rayRoll, { total: 1, naturalD20: 1 }),
      ],
    });
    expect(rayMiss).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: { actionResources: [] },
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 13 },
        ],
      },
    });
    expect(expendedLevelOneSlots(requireResolved(rayMiss), wizardId)).toBe(0);
  });

  test("prepared spell-slot damage can use spell attack or save-gated invocation refs", () => {
    const state = startBattleSessionRight({
      battleId: battleId("battle-prepared-damage-invocation-refs"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [slotAttackDamageSpell(), slotSaveDamageSpell()],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });

    expect(discoverBattleActs(state).map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            state,
            wizardId,
            spellSlotInvocationRef(
              "slot_attack_damage",
              1,
              "spellAttackDamage",
            ),
          ),
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            state,
            wizardId,
            spellSlotInvocationRef("slot_save_damage", 1, "saveGatedDamage"),
          ),
          mode: { tag: "cast" },
        },
      ]),
    );

    const attackSubject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        wizardId,
        spellSlotInvocationRef("slot_attack_damage", 1, "spellAttackDamage"),
      ),
      mode: { tag: "cast" },
    };
    const attackTarget = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject: attackSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              sourceProcedureRef:
                battleProcedureExecutionRefForSpellHoleForTest(attackTarget),
            },
          ]),
        ],
      }),
      "attackRoll",
    );
    const attackDamage = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              sourceProcedureRef:
                battleProcedureExecutionRefForSpellHoleForTest(attackTarget),
            },
          ]),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(attackDamage).toMatchObject({
      label: "Spell damage (2d8-cold)",
    });
    const afterAttackSpell = requireResolved(
      resolveBattleSubject({
        state: state.state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              sourceProcedureRef:
                battleProcedureExecutionRefForSpellHoleForTest(attackTarget),
            },
          ]),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(attackDamage, [[4, 4]]),
        ],
      }),
    );
    expect(expendedLevelOneSlots(afterAttackSpell, wizardId)).toBe(1);
    expect(
      afterAttackSpell.state.combatants.get(skeletonId)?.activeEffects,
    ).toHaveLength(0);

    const saveSubject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        wizardId,
        spellSlotInvocationRef("slot_save_damage", 1, "saveGatedDamage"),
      ),
      mode: { tag: "cast" },
    };
    const saveOutcome = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject: saveSubject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const saveDamage = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject: saveSubject,
        fills: [
          savingThrowOutcomeFill(saveOutcome, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
      "rolledDice",
    );
    expect(saveDamage).toMatchObject({
      label: "Spell damage (2d6-acid)",
    });
    const afterSaveSpell = requireResolved(
      resolveBattleSubject({
        state: state.state,
        subject: saveSubject,
        fills: [
          savingThrowOutcomeFill(saveOutcome, [
            { targetId: skeletonId, succeeded: false },
          ]),
          damageRollFillWithGroups(saveDamage, [[3, 3]]),
        ],
      }),
    );
    expect(expendedLevelOneSlots(afterSaveSpell, wizardId)).toBe(1);
  });

  test("prepared spell-slot damage supports only slot-axis linear scaling", () => {
    const state = startBattleSessionRight({
      battleId: battleId("battle-prepared-damage-axis"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [
              slotAttackDamageSpell({ axis: "slot" }),
              slotAttackDamageSpell({
                id: "character_axis_attack_damage",
                name: "Character Axis Attack Damage",
                axis: "character",
              }),
            ],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const spellAttackSubjects = discoverBattleActs(state)
      .flatMap((act) => {
        if (
          act.subject.tag !== "actionSpell" &&
          act.subject.tag !== "bonusActionSpell"
        ) {
          return [];
        }
        const presentation = battleActSpellPresentation(act);
        return presentation === undefined ? [] : [presentation.invocation];
      })
      .filter(
        (invocation) =>
          invocation.procedure === "spellAttackDamage" &&
          invocation.tag === "spellSlot",
      )
      .map((invocation) => invocation.spellId);

    expect(spellAttackSubjects).toContain("slot_attack_damage");
    expect(spellAttackSubjects).not.toContain("character_axis_attack_damage");
  });

  test("cantrip damage uses character-tier scaling from the authored source", () => {
    const state = startBattleSessionRight({
      battleId: battleId("battle-cantrip-scaling"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("ray_of_frost")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        wizardId,
        cantripSpellInvocationRef("ray_of_frost", "spellAttackDamage"),
      ),
      mode: { tag: "cast" },
    };
    const target = requireHole(
      resolveBattleSubject({ state: state.state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          targetFill(target, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              sourceProcedureRef:
                battleProcedureExecutionRefForSpellHoleForTest(target),
            },
          ]),
        ],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [
          targetFill(target, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              sourceProcedureRef:
                battleProcedureExecutionRefForSpellHoleForTest(target),
            },
          ]),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );

    expect(damage).toMatchObject({
      label: "Spell damage (2d8-cold)",
    });
  });

  test("prepared spell-slot damage discovery summaries name Spell Slot casting", () => {
    const state = startBattleSessionRight({
      battleId: battleId("battle-prepared-damage-summaries"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [slotAttackDamageSpell(), slotSaveDamageSpell()],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const acts = discoverBattleActs(state);

    expect(
      acts.find(
        (act) =>
          act.subject.tag === "actionSpell" &&
          battleActSpellPresentation(act)?.invocation.tag === "spellSlot" &&
          battleActSpellPresentation(act)?.invocation.spellId ===
            "slot_attack_damage" &&
          battleActSpellPresentation(act)?.invocation.procedure ===
            "spellAttackDamage",
      )?.summary,
    ).toBe("Use Slot Attack Damage.");
    expect(
      acts.find(
        (act) =>
          act.subject.tag === "actionSpell" &&
          battleActSpellPresentation(act)?.invocation.tag === "spellSlot" &&
          battleActSpellPresentation(act)?.invocation.spellId ===
            "slot_save_damage" &&
          battleActSpellPresentation(act)?.invocation.procedure ===
            "saveGatedDamage",
      )?.summary,
    ).toBe("Use Slot Save Damage.");
  });
});
