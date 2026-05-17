import {
  startBattleRight,
  testBattleCreatureStateWithConditions,
  requireElapsedHours,
  requireResolved,
  fighterVsGoblinBattle,
  fighterTurnWithReadiedRayAndHealer,
  fighterAttackSubject,
  goblinAttackSubject,
  attackInitialTargetHole,
  attackRollHoleAfterTarget,
  attackDamageHoleAfterHit,
  requireHole,
  findHole,
  findAct,
  sleepShakeAwakeSubject,
  sleepShakeAwakeTargetFill,
  battleAfterFailedSleepInitialSave,
  battleAfterGoblinFailedSleepRepeatSave,
  shakeAwakeGoblinFromSleep,
  targetFill,
  objectTargetFill,
  spellTargetAllocationFill,
  attackTargetFill,
  abilityCheckFill,
  attackRollFill,
  concentrationSavingThrowFill,
  reactionDecisionFill,
  movementFill,
  fogCloudBattle,
  castFogCloud,
  fogCloudAreaFill,
  savingThrowOutcomeFill,
  damageRollFill,
  damageRollFillWithGroups,
  attackDamageDispositionFill,
  rolledDiceGroups,
  characterSeed,
  statBlockCreatureInit,
  skeletonCreatureInit,
  rageResource,
  rangerFavoredEnemyResource,
  wizardVsSkeletonBattle,
  wizardVsRogueBattle,
  wizardSpellcasting,
  acidSplashWithRadius,
  slotAttackDamageSpell,
  slotSaveDamageSpell,
  spellRecord,
  magicSubject,
  expendedLevelOneSlots,
  partySide,
  oppositionSide,
  fighterId,
  goblinId,
  skeletonId,
  wizardId,
  secondWizardId,
  secondSkeletonId,
  unitLibrary,
  statBlockCatalog,
  abilityModifier,
  applyBattleHitPointDamage,
  applyCondition,
  armorClass,
  armorOfShadowsSpellInvocationRef,
  attackBonus,
  BattleFillSchema,
  BattleHoleSchema,
  battleId,
  battleObjectId,
  battleObscurementZones,
  breakBattleConcentration,
  cantripSpellInvocationRef,
  characterBattleResourceIsUnlimited,
  characterBattleResourceSupportedForUnit,
  classFeatureFreeCastSpellInvocationRef,
  combatantCanSee,
  combatantId,
  concentrationSavingThrowDc,
  damageAmount,
  decodeUnitRecordSync,
  defaultArmorClassState,
  difficultyClass,
  discoverBattleActs,
  Either,
  elapsedTimeTicks,
  endTurn,
  findFamiliarFormEligibilityForSpell,
  findFamiliarInput,
  hasCondition,
  holeId,
  holeInstanceKey,
  Hp,
  movementDeltaFeet,
  movementFeet,
  objectInvisibleBenefitDenied,
  PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE,
  pactOfTheChainFindFamiliarFormEligibilityForSpell,
  removeCondition,
  requiredAbilityCheckRollMode,
  resolveBattleConcentrationDamage,
  resolveBattleReaction,
  resolveBattleSubject,
  resolveFindFamiliarForm,
  resolveMarkedDamageRiderSpellAct,
  resolvePactOfTheChainFindFamiliarForm,
  resourceCount,
  sameBattleSubject,
  Schema,
  snapshotBattle,
  spellFillSet,
  spellSlotInvocationRef,
  startBattle,
  supportedSpellActs,
  supportedSpellInvocationMatchesRef,
  tickDurationEffects,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
} from "./battle-runtime-test-support.ts";
import type {
  ActiveOngoingFeatureOccurrence,
  BattleFill,
  BattleHole,
  BattleReadiedSpellTrigger,
  BattleState,
  BattleSubject,
  CombatantId,
  OngoingFeatureSourceKey,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime", () => {
  test("Wizard action-time spell acts spend slots for prepared level-1 spells but not cantrips", () => {
    const magicMissileState = wizardVsSkeletonBattle();
    expect(
      discoverBattleActs(magicMissileState).map((act) => act.subject),
    ).toEqual(
      expect.arrayContaining([
        { tag: "action", actorId: wizardId, action: "grapple" },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "ready", trigger: "spellCast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "ready", trigger: "saveFailed" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "ready", trigger: "afterDamage" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready", trigger: "spellCast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready", trigger: "saveFailed" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
          ),
          mode: { tag: "ready", trigger: "afterDamage" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "acid_splash",
            "saveGatedDamage",
          ),
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "acid_splash",
            "saveGatedDamage",
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "acid_splash",
            "saveGatedDamage",
          ),
          mode: { tag: "ready", trigger: "spellCast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "acid_splash",
            "saveGatedDamage",
          ),
          mode: { tag: "ready", trigger: "saveFailed" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: cantripSpellInvocationRef(
            "acid_splash",
            "saveGatedDamage",
          ),
          mode: { tag: "ready", trigger: "afterDamage" },
        },
        { tag: "runtimeCommand", actorId: wizardId, command: "move" },
        { tag: "runtimeCommand", actorId: wizardId, command: "endTurn" },
      ]),
    );

    const magicMissileTarget = requireHole(
      resolveBattleSubject({
        state: magicMissileState,
        subject: magicSubject("magic_missile"),
        fills: [],
      }),
      "spellTargetAllocation",
    );
    expect(magicMissileTarget).toMatchObject({
      label: "Magic Missile target allocation",
      allocationCount: 3,
      choices: [wizardId, skeletonId],
    });
    expect(
      resolveBattleSubject({
        state: magicMissileState,
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
        state: magicMissileState,
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
      label: "Magic Missile damage (3d4+3-force)",
    });
    expect(
      resolveBattleSubject({
        state: magicMissileState,
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
      state: magicMissileState,
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

    const healingWordState = startBattleRight({
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
        candidate.subject.invocation.spellId === "healing_word",
    );
    expect(healingWordAct).toMatchObject({
      subject: {
        tag: "bonusActionSpell",
        actorId: wizardId,
        invocation: spellSlotInvocationRef(
          "healing_word",
          1,
          "directHitPointRestoration",
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
        state: healingWordState,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, fighterId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: fighterId,
              spellId: "healing_word",
            },
          ]),
        ],
      }),
      "rolledDice",
    );
    const healingWord = requireResolved(
      resolveBattleSubject({
        state: healingWordState,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, fighterId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: fighterId,
              spellId: "healing_word",
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
      resolveBattleSubject({
        state: healingWordState,
        subject: {
          tag: "bonusActionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "cast" },
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
    });

    const slotTurnState = startBattleRight({
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
        state: slotTurnState,
        subject: magicSubject("magic_missile"),
        fills: [],
      }),
      "spellTargetAllocation",
    );
    const slotTurnMissileDamage = requireHole(
      resolveBattleSubject({
        state: slotTurnState,
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
        state: slotTurnState,
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
      spellSlotExpendedThisTurn: true,
    });
    expect(
      discoverBattleActs(afterSlotSpell).map((act) => act.subject),
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tag: "bonusActionSpell",
          spellId: "healing_word",
        }),
      ]),
    );
    expect(
      resolveBattleSubject({
        state: afterSlotSpell,
        subject: {
          tag: "bonusActionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "healing_word",
            1,
            "directHitPointRestoration",
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
        candidate.subject.invocation.spellId === "healing_word",
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
        spellId: "healing_word",
      },
    ]);
    const awaitingSpellCastReaction = resolveBattleSubject({
      state: healingWordReactionState,
      subject: healingWordReactionAct.subject,
      fills: [reactionTargetFill],
    });
    expect(awaitingSpellCastReaction).toMatchObject({
      tag: "needsHoles",
      subject: healingWordReactionAct.subject,
      holes: [{ kind: "reactionDecision", trigger: "spellCast" }],
      snapshot: {
        pendingReaction: {
          trigger: "spellCast",
        },
      },
    });
    if (awaitingSpellCastReaction.tag !== "needsHoles") {
      throw new Error(
        `Expected needsHoles, got ${awaitingSpellCastReaction.tag}.`,
      );
    }
    const afterDecline = resolveBattleReaction({
      state: awaitingSpellCastReaction.state,
      fill: reactionDecisionFill(
        awaitingSpellCastReaction.snapshot.pendingReaction!.decisionHole,
        { kind: "decline", reactorId: wizardId },
      ),
    });
    expect(afterDecline).toMatchObject({
      tag: "needsHoles",
      subject: healingWordReactionAct.subject,
      holes: [{ kind: "rolledDice", label: "Healing Word healing (2d4+3)" }],
      snapshot: { pendingReaction: null },
    });

    const levelTwoState = startBattleRight({
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
          invocation: spellSlotInvocationRef(
            "magic_missile",
            2,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "cast" },
        },
      ]),
    );
    const levelTwoSubject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      invocation: spellSlotInvocationRef(
        "magic_missile",
        2,
        "repeatedDamageAllocation",
      ),
      mode: { tag: "cast" },
    };
    const levelTwoTargets = requireHole(
      resolveBattleSubject({
        state: levelTwoState,
        subject: levelTwoSubject,
        fills: [],
      }),
      "spellTargetAllocation",
    );
    expect(levelTwoTargets).toMatchObject({ allocationCount: 4 });
    const levelTwoDamage = requireHole(
      resolveBattleSubject({
        state: levelTwoState,
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
      label: "Magic Missile damage (4d4+4-force)",
    });
    const splitMagicMissile = resolveBattleSubject({
      state: levelTwoState,
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

    const secondWizardReady = requireResolved(
      resolveBattleSubject({
        state: startBattleRight({
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
        }),
        subject: {
          tag: "actionSpell",
          actorId: secondWizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
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
      ...levelTwoState,
      combatants: new Map(levelTwoState.combatants).set(
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
      holes: [{ kind: "reactionDecision", trigger: "afterDamage" }],
      snapshot: {
        pendingReaction: {
          trigger: "afterDamage",
        },
      },
    });
    if (splitWithAfterDamageReaction.tag !== "needsHoles") {
      throw new Error("Expected first after-damage reaction window.");
    }
    const secondAfterDamageReaction = resolveBattleReaction({
      state: splitWithAfterDamageReaction.state,
      fill: reactionDecisionFill(
        splitWithAfterDamageReaction.snapshot.pendingReaction!.decisionHole,
        { kind: "decline", reactorId: secondWizardId },
      ),
    });
    expect(secondAfterDamageReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "reactionDecision", trigger: "afterDamage" }],
      snapshot: {
        pendingReaction: {
          trigger: "afterDamage",
        },
      },
    });

    const rayState = wizardVsSkeletonBattle();
    const rayTarget = requireHole(
      resolveBattleSubject({
        state: rayState,
        subject: magicSubject("ray_of_frost"),
        fills: [],
      }),
      "targetChoice",
    );
    const rayRoll = requireHole(
      resolveBattleSubject({
        state: rayState,
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
        state: rayState,
        subject: magicSubject("ray_of_frost"),
        fills: [
          targetFill(rayTarget, skeletonId),
          attackRollFill(rayRoll, { total: 14, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const ray = resolveBattleSubject({
      state: rayState,
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
            sourceSpellId: "ray_of_frost",
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

    const stackedRayState = {
      ...rayState,
      combatants: new Map(rayState.combatants).set(skeletonId, {
        ...rayState.combatants.get(skeletonId)!,
        activeEffects: [
          {
            kind: "speedDelta",
            sourceSpellId: "ray_of_frost",
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
      state: stackedRayState,
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
        expect.objectContaining({
          sourceSpellId: "ray_of_frost",
          sourceCombatantId: wizardId,
        }),
      ],
    });

    const criticalRayState = wizardVsSkeletonBattle();
    const criticalRayTarget = requireHole(
      resolveBattleSubject({
        state: criticalRayState,
        subject: magicSubject("ray_of_frost"),
        fills: [],
      }),
      "targetChoice",
    );
    const criticalRayRoll = requireHole(
      resolveBattleSubject({
        state: criticalRayState,
        subject: magicSubject("ray_of_frost"),
        fills: [targetFill(criticalRayTarget, skeletonId)],
      }),
      "attackRoll",
    );
    const criticalRayDamage = requireHole(
      resolveBattleSubject({
        state: criticalRayState,
        subject: magicSubject("ray_of_frost"),
        fills: [
          targetFill(criticalRayTarget, skeletonId),
          attackRollFill(criticalRayRoll, { total: 20, naturalD20: 20 }),
        ],
      }),
      "rolledDice",
    );
    expect(criticalRayDamage).toMatchObject({
      label: "Ray of Frost damage (2d8-cold)",
      critical: true,
    });
    expect(
      resolveBattleSubject({
        state: criticalRayState,
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
        state: criticalRayState,
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
      state: rayState,
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
    const state = startBattleRight({
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
          invocation: spellSlotInvocationRef(
            "slot_attack_damage",
            1,
            "spellAttackDamage",
          ),
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "slot_save_damage",
            1,
            "saveGatedDamage",
          ),
          mode: { tag: "cast" },
        },
      ]),
    );

    const attackSubject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      invocation: spellSlotInvocationRef(
        "slot_attack_damage",
        1,
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    };
    const attackTarget = requireHole(
      resolveBattleSubject({ state, subject: attackSubject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "slot_attack_damage",
            },
          ]),
        ],
      }),
      "attackRoll",
    );
    const attackDamage = requireHole(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "slot_attack_damage",
            },
          ]),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(attackDamage).toMatchObject({
      label: "Slot Attack Damage damage (2d8-cold)",
    });
    const afterAttackSpell = requireResolved(
      resolveBattleSubject({
        state,
        subject: attackSubject,
        fills: [
          targetFill(attackTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "slot_attack_damage",
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
      invocation: spellSlotInvocationRef(
        "slot_save_damage",
        1,
        "saveGatedDamage",
      ),
      mode: { tag: "cast" },
    };
    const saveOutcome = requireHole(
      resolveBattleSubject({ state, subject: saveSubject, fills: [] }),
      "savingThrowOutcome",
    );
    const saveDamage = requireHole(
      resolveBattleSubject({
        state,
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
      label: "Slot Save Damage damage (2d6-acid)",
    });
    const afterSaveSpell = requireResolved(
      resolveBattleSubject({
        state,
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

  test("spell attack riders use SRD-specific expiration anchors", () => {
    const state = startBattleRight({
      battleId: battleId("battle-spell-rider-anchors"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("shocking_grasp")],
            preparedSpells: [
              spellRecord("guiding_bolt"),
              spellRecord("ray_of_sickness"),
            ],
            spellSlots: [{ spellLevel: 1, count: 3 }],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Fighter",
          initiative: 15,
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
        }),
      ],
    });

    const sickTarget = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("ray_of_sickness"),
        fills: [],
      }),
      "targetChoice",
    );
    const sickRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("ray_of_sickness"),
        fills: [targetFill(sickTarget, skeletonId)],
      }),
      "attackRoll",
    );
    const sickDamage = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("ray_of_sickness"),
        fills: [
          targetFill(sickTarget, skeletonId),
          attackRollFill(sickRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const sick = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("ray_of_sickness"),
        fills: [
          targetFill(sickTarget, skeletonId),
          attackRollFill(sickRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(sickDamage, [[1, 1]]),
        ],
      }),
    );
    expect(sick.state.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.objectContaining({ poisoned: true }),
      activeEffects: [
        expect.objectContaining({
          kind: "spellCondition",
          condition: "poisoned",
          expiresAt: {
            kind: "endOfTurn",
            combatantId: wizardId,
            round: 2,
          },
        }),
      ],
    });
    const afterWizard = endTurn({ state: sick.state, actorId: wizardId });
    const afterFighter =
      afterWizard.tag === "resolved"
        ? endTurn({ state: afterWizard.state, actorId: fighterId })
        : afterWizard;
    const afterSkeleton =
      afterFighter.tag === "resolved"
        ? endTurn({ state: afterFighter.state, actorId: skeletonId })
        : afterFighter;
    const afterNextWizard =
      afterSkeleton.tag === "resolved"
        ? endTurn({ state: afterSkeleton.state, actorId: wizardId })
        : afterSkeleton;
    expect(afterNextWizard).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: fighterId },
          {
            combatantId: skeletonId,
            conditions: expect.not.arrayContaining(["poisoned"]),
          },
        ],
      },
    });

    const graspTarget = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("shocking_grasp"),
        fills: [],
      }),
      "targetChoice",
    );
    const graspRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("shocking_grasp"),
        fills: [targetFill(graspTarget, skeletonId)],
      }),
      "attackRoll",
    );
    const graspDamage = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("shocking_grasp"),
        fills: [
          targetFill(graspTarget, skeletonId),
          attackRollFill(graspRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const grasp = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("shocking_grasp"),
        fills: [
          targetFill(graspTarget, skeletonId),
          attackRollFill(graspRoll, { total: 18, naturalD20: 12 }),
          damageRollFill(graspDamage, 1),
        ],
      }),
    );
    expect(
      grasp.state.combatants.get(skeletonId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "opportunityAttackDenied",
        expiresAt: { kind: "startOfTurn", combatantId: skeletonId },
      }),
    );
    const fighterTurn = requireResolved(
      endTurn({ state: grasp.state, actorId: wizardId }),
    ).state;
    const moveSubject: BattleSubject = {
      tag: "runtimeCommand",
      actorId: fighterId,
      command: "move",
    };
    const move = requireHole(
      resolveBattleSubject({
        state: fighterTurn,
        subject: moveSubject,
        fills: [],
      }),
      "movement",
    );
    expect(
      resolveBattleSubject({
        state: fighterTurn,
        subject: moveSubject,
        fills: [
          movementFill(move, {
            movementCostFeet: 5,
            provokedOpportunityAttacks: [
              { reactorId: skeletonId, attackName: "Longsword" },
            ],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: { pendingReaction: null },
    });
  });

  test("spell condition riders preserve unrelated pre-existing conditions", () => {
    const poisoned = startBattleRight({
      battleId: battleId("battle-spell-condition-rider-source"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("ray_of_sickness")],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
          conditions: ["poisoned"],
        }),
      ],
    });
    const target = requireHole(
      resolveBattleSubject({
        state: poisoned,
        subject: magicSubject("ray_of_sickness"),
        fills: [],
      }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state: poisoned,
        subject: magicSubject("ray_of_sickness"),
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: poisoned,
        subject: magicSubject("ray_of_sickness"),
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(roll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state: poisoned,
        subject: magicSubject("ray_of_sickness"),
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(roll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[1, 1]]),
        ],
      }),
    );
    const skeletonTurn = requireResolved(
      endTurn({ state: resolved.state, actorId: wizardId }),
    ).state;
    const nextWizard = endTurn({ state: skeletonTurn, actorId: skeletonId });
    if (nextWizard.tag !== "resolved") {
      throw new Error("Expected turn sequence to resolve.");
    }
    const refreshRoll = requireHole(
      resolveBattleSubject({
        state: nextWizard.state,
        subject: magicSubject("ray_of_sickness"),
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    const refreshDamage = requireHole(
      resolveBattleSubject({
        state: nextWizard.state,
        subject: magicSubject("ray_of_sickness"),
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(refreshRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const refreshed = requireResolved(
      resolveBattleSubject({
        state: nextWizard.state,
        subject: magicSubject("ray_of_sickness"),
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(refreshRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(refreshDamage, [[1, 1]]),
        ],
      }),
    );
    const nextSkeletonAfterRefresh = requireResolved(
      endTurn({ state: refreshed.state, actorId: wizardId }),
    ).state;
    const nextWizardAfterRefresh = requireResolved(
      endTurn({ state: nextSkeletonAfterRefresh, actorId: skeletonId }),
    ).state;
    const expired = endTurn({
      state: nextWizardAfterRefresh,
      actorId: wizardId,
    });
    expect(expired).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          {
            combatantId: skeletonId,
            conditions: expect.arrayContaining(["poisoned"]),
          },
        ],
      },
    });
  });

  test("overlapping spell condition riders preserve a pre-existing non-spell condition source", () => {
    const poisoned = startBattleRight({
      battleId: battleId("battle-spell-condition-rider-overlap-source"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("ray_of_sickness")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: secondWizardId,
          displayName: "Second Wizard",
          initiative: 15,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("ray_of_sickness")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
          conditions: ["poisoned"],
        }),
      ],
    });

    const castRayOfSickness = (state: BattleState, actorId: CombatantId) => {
      const spatialFacts = [
        {
          kind: "spellTarget" as const,
          casterId: actorId,
          targetId: skeletonId,
          spellId: "ray_of_sickness",
        },
      ];
      const subject: BattleSubject = {
        tag: "actionSpell",
        actorId,
        invocation: spellSlotInvocationRef(
          "ray_of_sickness",
          1,
          "spellAttackDamage",
        ),
        mode: { tag: "cast" },
      };
      const target = requireHole(
        resolveBattleSubject({ state, subject, fills: [] }),
        "targetChoice",
      );
      const roll = requireHole(
        resolveBattleSubject({
          state,
          subject,
          fills: [targetFill(target, skeletonId, spatialFacts)],
        }),
        "attackRoll",
      );
      const damage = requireHole(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            targetFill(target, skeletonId, spatialFacts),
            attackRollFill(roll, { total: 18, naturalD20: 12 }),
          ],
        }),
        "rolledDice",
      );
      return requireResolved(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            targetFill(target, skeletonId, spatialFacts),
            attackRollFill(roll, { total: 18, naturalD20: 12 }),
            damageRollFillWithGroups(damage, [[1, 1]]),
          ],
        }),
      ).state;
    };

    const firstSpell = castRayOfSickness(poisoned, wizardId);
    const secondWizardTurn = requireResolved(
      endTurn({ state: firstSpell, actorId: wizardId }),
    ).state;
    const secondSpell = castRayOfSickness(secondWizardTurn, secondWizardId);
    const skeletonTurn = requireResolved(
      endTurn({ state: secondSpell, actorId: secondWizardId }),
    ).state;
    const nextWizardTurn = requireResolved(
      endTurn({ state: skeletonTurn, actorId: skeletonId }),
    ).state;
    const firstSpellExpired = requireResolved(
      endTurn({ state: nextWizardTurn, actorId: wizardId }),
    ).state;
    expect(firstSpellExpired.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.objectContaining({ poisoned: true }),
      activeEffects: [
        expect.objectContaining({
          kind: "spellCondition",
          sourceCombatantId: secondWizardId,
          condition: "poisoned",
        }),
      ],
    });

    const allSpellSourcesExpired = endTurn({
      state: firstSpellExpired,
      actorId: secondWizardId,
    });
    expect(allSpellSourcesExpired).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: secondWizardId },
          {
            combatantId: skeletonId,
            conditions: expect.arrayContaining(["poisoned"]),
          },
        ],
      },
    });
    expect(
      requireResolved(allSpellSourcesExpired).state.combatants.get(skeletonId)
        ?.activeEffects,
    ).not.toContainEqual(
      expect.objectContaining({
        kind: "spellCondition",
        condition: "poisoned",
      }),
    );
  });

  test("one-shot spell attack-roll riders affect only matching attack rolls", () => {
    const state = startBattleRight({
      battleId: battleId("battle-spell-one-shot-riders"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("vicious_mockery")],
            preparedSpells: [spellRecord("guiding_bolt")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Fighter",
          initiative: 15,
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
        }),
      ],
    });
    const guidingTarget = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("guiding_bolt"),
        fills: [],
      }),
      "targetChoice",
    );
    const guidingRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("guiding_bolt"),
        fills: [targetFill(guidingTarget, skeletonId)],
      }),
      "attackRoll",
    );
    const guidingDamage = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("guiding_bolt"),
        fills: [
          targetFill(guidingTarget, skeletonId),
          attackRollFill(guidingRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const guided = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("guiding_bolt"),
        fills: [
          targetFill(guidingTarget, skeletonId),
          attackRollFill(guidingRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(guidingDamage, [[1, 1, 1, 1]]),
        ],
      }),
    );
    const fighterTurn = endTurn({ state: guided.state, actorId: wizardId });
    if (fighterTurn.tag !== "resolved") {
      throw new Error("Expected Fighter turn after Guiding Bolt.");
    }
    const fighterAttack: BattleSubject = {
      tag: "action",
      actorId: fighterId,
      action: "attack",
      attackName: "Longsword",
    };
    const fighterTarget = requireHole(
      resolveBattleSubject({
        state: fighterTurn.state,
        subject: fighterAttack,
        fills: [],
      }),
      "targetChoice",
    );
    const fighterRoll = requireHole(
      resolveBattleSubject({
        state: fighterTurn.state,
        subject: fighterAttack,
        fills: [attackTargetFill(fighterTarget, fighterId, skeletonId)],
      }),
      "attackRoll",
    );
    expect(fighterRoll).toMatchObject({ rollMode: "advantage" });
    const consumed = resolveBattleSubject({
      state: fighterTurn.state,
      subject: fighterAttack,
      fills: [
        attackTargetFill(fighterTarget, fighterId, skeletonId),
        attackRollFill(fighterRoll, {
          total: 8,
          naturalD20: 4,
          rollMode: "advantage",
        }),
      ],
    });
    expect(consumed).toMatchObject({ tag: "resolved" });
    expect(
      requireResolved(consumed).state.combatants.get(skeletonId)?.activeEffects,
    ).toEqual([]);

    const mockeryTarget = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("vicious_mockery"),
        fills: [],
      }),
      "targetChoice",
    );
    const save = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("vicious_mockery"),
        fills: [targetFill(mockeryTarget, skeletonId)],
      }),
      "savingThrowOutcome",
    );
    const mockeryDamage = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("vicious_mockery"),
        fills: [
          targetFill(mockeryTarget, skeletonId),
          savingThrowOutcomeFill(save, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
      "rolledDice",
    );
    const mocked = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("vicious_mockery"),
        fills: [
          targetFill(mockeryTarget, skeletonId),
          savingThrowOutcomeFill(save, [
            { targetId: skeletonId, succeeded: false },
          ]),
          damageRollFill(mockeryDamage, 1),
        ],
      }),
    );
    const afterWizard = endTurn({ state: mocked.state, actorId: wizardId });
    const afterFighter =
      afterWizard.tag === "resolved"
        ? endTurn({ state: afterWizard.state, actorId: fighterId })
        : afterWizard;
    if (afterFighter.tag !== "resolved") {
      throw new Error("Expected Skeleton turn after Vicious Mockery.");
    }
    const skeletonAttack: BattleSubject = {
      tag: "action",
      actorId: skeletonId,
      action: "attack",
      attackName: "Longsword",
    };
    const skeletonTarget = requireHole(
      resolveBattleSubject({
        state: afterFighter.state,
        subject: skeletonAttack,
        fills: [],
      }),
      "targetChoice",
    );
    const skeletonRoll = requireHole(
      resolveBattleSubject({
        state: afterFighter.state,
        subject: skeletonAttack,
        fills: [
          attackTargetFill(skeletonTarget, skeletonId, wizardId, "Longsword"),
        ],
      }),
      "attackRoll",
    );
    expect(skeletonRoll).toMatchObject({ rollMode: "disadvantage" });
  });

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

  test("spell damage invocation holes reject contradictory access and resource pairs", () => {
    const spell = slotAttackDamageSpell();
    const baseHole = {
      kind: "rolledDice",
      holeId: holeId("battle:test:invalid-spell-damage"),
      holeInstanceKey: holeInstanceKey("battle:test:invalid-spell-damage"),
      label: "Invalid spell damage",
      critical: false,
      spell: {
        procedure: "spellAttackDamage",
        spell,
        targeting: { kind: "singleCombatant" },
        damage: { expr: { dice: 1, dieSize: 8 }, damageType: "cold" },
        rangeFeet: movementFeet(60),
        attackKind: "ranged_spell_attack",
        attackBonus: attackBonus(5),
        postDamageRiders: [],
      },
    };

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseHole.spell,
            access: { tag: "classCantrip" },
            resource: { tag: "spellSlot", slotLevel: 1 },
          },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseHole.spell,
            access: { tag: "prepared" },
            resource: { tag: "none" },
          },
        }),
      ),
    ).toBe(true);
  });

  test("persistent armor invocation holes reject contradictory Armor of Shadows resource pairs", () => {
    const baseHole = {
      kind: "spellTargetList",
      holeId: holeId("battle:test:invalid-persistent-armor"),
      holeInstanceKey: holeInstanceKey("battle:test:invalid-persistent-armor"),
      label: "Invalid persistent armor target",
      minTargets: 1,
      maxTargets: 1,
      choices: [fighterId],
      requiresTableSpatialFact: true,
      spell: {
        procedure: "persistentArmorEffect",
        spell: { id: "mage_armor" },
        rangeFeet: movementFeet(0),
        activeEffect: { tag: "mageArmor" },
      },
    };

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseHole.spell,
            access: { tag: "prepared" },
            resource: { tag: "none" },
          },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseHole.spell,
            access: { tag: "armorOfShadows" },
            resource: { tag: "spellSlot", slotLevel: 1 },
          },
        }),
      ),
    ).toBe(true);
  });

  test("spell saving throw outcome codec preserves target roll modes", () => {
    const hole = {
      kind: "savingThrowOutcome",
      holeId: holeId("battle:test:charm-person-save"),
      holeInstanceKey: holeInstanceKey("battle:test:charm-person-save"),
      label: "Charm Person Saving Throw outcomes",
      spell: {
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: 1 },
        procedure: "saveGatedCondition",
        spell: { id: "charm_person" },
        ability: "wis",
        dc: { kind: "caster_spell_save_dc" },
        targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
        targetCreatureTypes: ["humanoid"],
        effect: {
          condition: "charmed",
          expiresAt: {
            kind: "duration",
            durationTicks: elapsedTimeTicks(600),
          },
          escape: { kind: "targetDamagedByCasterOrAlly" },
          turnStartDamage: null,
        },
        saveRollModeRule: { kind: "hostileTarget", mode: "advantage" },
        rangeFeet: movementFeet(30),
      },
      ability: "wis",
      dc: { kind: "caster_spell_save_dc" },
      areaChoices: [],
      targetRollModes: [{ targetId: goblinId, rollMode: "advantage" }],
    };

    const decoded = Schema.decodeUnknownEither(BattleHoleSchema)(hole);

    if (Either.isLeft(decoded)) {
      throw new Error(String(decoded.left));
    }
    expect(decoded.right).toMatchObject({
      kind: "savingThrowOutcome",
      targetRollModes: [{ targetId: goblinId, rollMode: "advantage" }],
    });
  });

  test("spell saving throw outcome codec rejects incomplete Grease area facts", () => {
    const invalidGreaseArea = {
      originAnchorId: wizardId,
      affectedTargetIds: [goblinId],
      kind: "greaseGroundArea",
    };
    const greaseInvocation = {
      access: { tag: "prepared" },
      resource: { tag: "spellSlot", slotLevel: 1 },
      procedure: "greaseGroundHazard",
      spell: { id: "grease" },
      ability: "dex",
      dc: { kind: "caster_spell_save_dc" },
      targeting: { kind: "pointOriginCube", sideFeet: movementFeet(10) },
      durationTicks: elapsedTimeTicks(10),
      rangeFeet: movementFeet(60),
    };

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          kind: "savingThrowOutcome",
          holeId: holeId("battle:test:invalid-grease-area-hole"),
          holeInstanceKey: holeInstanceKey(
            "battle:test:invalid-grease-area-hole",
          ),
          label: "Invalid Grease area facts",
          spell: greaseInvocation,
          ability: "dex",
          dc: { kind: "caster_spell_save_dc" },
          areaChoices: [invalidGreaseArea],
          targetRollModes: [],
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleFillSchema)({
          kind: "savingThrowOutcome",
          holeId: "battle:test:invalid-grease-area-fill",
          value: {
            area: invalidGreaseArea,
            outcomes: [{ targetId: goblinId, succeeded: false }],
          },
        }),
      ),
    ).toBe(true);
  });

  test("Sanctuary interdiction codec admits only Wisdom save holes", () => {
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          kind: "sanctuaryInterdictionOutcome",
          holeId: holeId("battle:test:invalid-sanctuary-save"),
          holeInstanceKey: holeInstanceKey(
            "battle:test:invalid-sanctuary-save",
          ),
          label: "Invalid Sanctuary save",
          sourceSpellId: "sanctuary",
          sourceCombatantId: wizardId,
          wardedCombatantId: wizardId,
          triggeringCombatantId: goblinId,
          triggeringTargetEventId: holeId(
            "battle:test:invalid-sanctuary-target-event",
          ),
          ability: "str",
          dc: { kind: "caster_spell_save_dc" },
          choices: [fighterId],
        }),
      ),
    ).toBe(true);
  });

  test("Sanctuary replacement target fills reject malformed spatial facts", () => {
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleFillSchema)({
          kind: "sanctuaryInterdictionOutcome",
          holeId: holeId("battle:test:invalid-sanctuary-replacement-fact"),
          value: {
            saveSucceeded: false,
            outcome: {
              kind: "newTarget",
              targetId: fighterId,
              spatialFacts: [
                {
                  kind: "notBattleTargetSpatialFact",
                  targetId: fighterId,
                },
              ],
            },
          },
        }),
      ),
    ).toBe(true);
  });

  test("spell-hosted weapon invocation holes reject non-weapon component attacks", () => {
    const baseHole = {
      kind: "attackRoll",
      holeId: holeId("battle:test:invalid-true-strike-component"),
      holeInstanceKey: holeInstanceKey(
        "battle:test:invalid-true-strike-component",
      ),
      label: "Invalid True Strike component attack",
      attackBonus: attackBonus(3),
      spell: {
        access: { tag: "classCantrip" },
        resource: { tag: "none" },
        procedure: "spellHostedWeaponAttack",
        spell: { id: "true_strike" },
        actionCost: "magicAction",
        componentWeapon: {
          itemId: "main:unarmed",
          attack: {
            kind: "unarmedStrike",
            effect: {
              kind: "damage",
              damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
            },
            attackAbility: "str",
            attackAbilityModifier: 0,
            attackBonus: 2,
            damageAbilityModifier: 0,
          },
        },
        spellcastingAbilityModifier: 3,
        damageTypeChoices: ["radiant", "bludgeoning"],
        bonusDamage: {
          expr: { dice: 1, dieSize: 6 },
          damageType: "radiant",
        },
      },
    };

    expect(
      Either.isLeft(Schema.decodeUnknownEither(BattleHoleSchema)(baseHole)),
    ).toBe(true);
  });

  test("prepared spell-slot damage supports only slot-axis linear scaling", () => {
    const state = startBattleRight({
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
      .flatMap((act) =>
        act.subject.tag === "actionSpell" ||
        act.subject.tag === "bonusActionSpell"
          ? [act.subject.invocation]
          : [],
      )
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
    const state = startBattleRight({
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
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "ray_of_frost",
            },
          ]),
        ],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "ray_of_frost",
            },
          ]),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );

    expect(damage).toMatchObject({
      label: "Ray of Frost damage (2d8-cold)",
    });
  });

  test("prepared spell-slot damage discovery summaries name Spell Slot casting", () => {
    const state = startBattleRight({
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
          act.subject.invocation.tag === "spellSlot" &&
          act.subject.invocation.spellId === "slot_attack_damage" &&
          act.subject.invocation.procedure === "spellAttackDamage",
      )?.summary,
    ).toBe("Cast Slot Attack Damage using a level 1 Spell Slot.");
    expect(
      acts.find(
        (act) =>
          act.subject.tag === "actionSpell" &&
          act.subject.invocation.tag === "spellSlot" &&
          act.subject.invocation.spellId === "slot_save_damage" &&
          act.subject.invocation.procedure === "saveGatedDamage",
      )?.summary,
    ).toBe(
      "Cast Slot Save Damage using a level 1 Spell Slot. Table-supplied affected targets make DEX Saving Throws.",
    );
  });

  test("Acid Splash support is gated to the authored 5-foot point-origin Sphere", () => {
    const unsupportedState = startBattleRight({
      battleId: battleId("battle-acid-splash-unsupported-area"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [acidSplashWithRadius(10)],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });

    expect(
      discoverBattleActs(unsupportedState).map((act) => act.subject),
    ).toEqual(
      expect.arrayContaining([
        { tag: "action", actorId: wizardId, action: "grapple" },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "cast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "ready", trigger: "attackHit" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "ready", trigger: "spellCast" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "ready", trigger: "saveFailed" },
        },
        {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "magic_missile",
            1,
            "repeatedDamageAllocation",
          ),
          mode: { tag: "ready", trigger: "afterDamage" },
        },
        { tag: "runtimeCommand", actorId: wizardId, command: "move" },
        { tag: "runtimeCommand", actorId: wizardId, command: "endTurn" },
      ]),
    );
  });

  test("Mage Armor creates a persistent base AC spell effect with typed early end", () => {
    const unarmoredDex = {
      ...defaultArmorClassState(),
      abilityModifiers: {
        ...defaultArmorClassState().abilityModifiers,
        dex: abilityModifier(2),
      },
    };
    const state = startBattleRight({
      battleId: battleId("battle-mage-armor"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          armorClass: unarmoredDex,
          spellcasting: wizardSpellcasting({
            preparedSpells: [
              spellRecord("magic_missile"),
              spellRecord("mage_armor"),
            ],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });

    expect(discoverBattleActs(state).map((act) => act.subject)).toContainEqual({
      tag: "actionSpell",
      actorId: wizardId,
      invocation: spellSlotInvocationRef(
        "mage_armor",
        1,
        "persistentArmorEffect",
      ),
      mode: { tag: "cast" },
    });

    const target = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("mage_armor"),
        fills: [],
      }),
      "targetChoice",
    );
    if (target.kind !== "targetChoice") {
      throw new Error("Expected targetChoice hole.");
    }
    expect(target.choices).toEqual([wizardId]);
    const result = resolveBattleSubject({
      state,
      subject: magicSubject("mage_armor"),
      fills: [targetFill(target, wizardId)],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          {
            combatantId: wizardId,
            armorClass: 15,
          },
          { combatantId: skeletonId },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(
      requireResolved(result).state.combatants.get(wizardId),
    ).toMatchObject({
      activeEffects: [
        {
          kind: "spellBaseArmorClass",
          sourceSpellId: "mage_armor",
          sourceCombatantId: wizardId,
          base: 13,
          ability: "dex",
          expiresAt: {
            kind: "duration",
            durationTicks: requireElapsedHours(8),
          },
          earlyEnds: [{ kind: "targetDonsArmor" }],
        },
      ],
    });
    expect(expendedLevelOneSlots(requireResolved(result), wizardId)).toBe(1);
  });

  test("Mage Armor rejects armored targets before spending resources", () => {
    const armored = {
      ...defaultArmorClassState(),
      base: {
        kind: "armor" as const,
        category: "medium" as const,
        formula: { kind: "medium_dex_max_2" as const, base: 14 },
      },
    };
    const state = startBattleRight({
      battleId: battleId("battle-mage-armor-armored-target"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("mage_armor")],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Armored Fighter",
          initiative: 10,
          armorClass: armored,
          attack: null,
        }),
      ],
    });

    const target = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("mage_armor"),
        fills: [],
      }),
      "targetChoice",
    );
    if (target.kind !== "targetChoice") {
      throw new Error("Expected targetChoice hole.");
    }

    expect(target.choices).toEqual([wizardId]);
    expect(
      resolveBattleSubject({
        state,
        subject: magicSubject("mage_armor"),
        fills: [targetFill(target, fighterId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    expect(state.combatants.get(wizardId)?.origin.kind).toBe("character");
  });

  test("Armor of Shadows casts self-only Mage Armor without expending a Spell Slot", () => {
    const unarmoredDex = {
      ...defaultArmorClassState(),
      abilityModifiers: {
        ...defaultArmorClassState().abilityModifiers,
        dex: abilityModifier(2),
      },
    };
    const state = startBattleRight({
      battleId: battleId("battle-armor-of-shadows"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Warlock",
          initiative: 20,
          attack: null,
          armorClass: unarmoredDex,
          spellcasting: wizardSpellcasting({
            preparedSpells: [],
            spellSlots: [{ spellLevel: 1, count: 1 }],
            invocationSpellAccesses: [
              {
                tag: "armorOfShadowsMageArmor",
                spell: spellRecord("mage_armor"),
              },
            ],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = {
      tag: "actionSpell" as const,
      actorId: wizardId,
      invocation: armorOfShadowsSpellInvocationRef("mage_armor"),
      mode: { tag: "cast" as const },
    };
    const act = findAct(state, subject);
    const target = findHole(act.initialHoles, "targetChoice");
    if (target.kind !== "targetChoice") {
      throw new Error("Expected targetChoice hole.");
    }

    expect(act.summary).toBe("Cast Mage Armor using Armor of Shadows.");
    expect(target.choices).toEqual([wizardId]);
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, wizardId)],
      }),
    );
    const warlock = result.state.combatants.get(wizardId);

    expect(
      result.snapshot.combatants.find(
        (combatant) => combatant.combatantId === wizardId,
      ),
    ).toMatchObject({ armorClass: 15 });
    expect(result.snapshot.turn).toMatchObject({
      actionResources: [],
      spellSlotExpendedThisTurn: false,
    });
    expect(warlock?.origin.kind).toBe("character");
    if (warlock?.origin.kind !== "character") {
      throw new Error("Expected Warlock caster.");
    }
    expect(warlock.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 0 },
    ]);
    expect(warlock.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellBaseArmorClass",
        sourceSpellId: "mage_armor",
        sourceCombatantId: wizardId,
        earlyEnds: [{ kind: "targetDonsArmor" }],
      }),
    ]);

    const recastState = {
      ...result.state,
      currentTurnResources: state.currentTurnResources,
    };
    const recast = requireResolved(
      resolveBattleSubject({
        state: recastState,
        subject,
        fills: [targetFill(target, wizardId)],
      }),
    );

    expect(
      recast.state.combatants
        .get(wizardId)
        ?.activeEffects.filter(
          (effect) =>
            effect.kind === "spellBaseArmorClass" &&
            effect.sourceSpellId === "mage_armor",
        ),
    ).toHaveLength(1);
  });

  test("Armor of Shadows Spell Access rejects non-Mage-Armor spell records", () => {
    const mageArmorWithWrongRuntimeId = {
      ...spellRecord("mage_armor"),
      id: "misidentified_mage_armor",
    };

    expect(
      startBattle({
        battleId: battleId("battle-armor-of-shadows-invalid-spell-access"),
        combatants: [
          characterSeed({
            combatantId: wizardId,
            displayName: "Warlock",
            initiative: 20,
            attack: null,
            spellcasting: wizardSpellcasting({
              preparedSpells: [],
              spellSlots: [{ spellLevel: 1, count: 1 }],
              invocationSpellAccesses: [
                {
                  tag: "armorOfShadowsMageArmor",
                  spell: mageArmorWithWrongRuntimeId,
                },
              ],
            }),
          }),
        ],
      }),
    ).toEqual(
      Either.left({
        tag: "battleStateInitIssue",
        message: "Armor of Shadows Spell Access must grant Mage Armor.",
      }),
    );
  });

  test("Pact of the Chain Spell Access retains no-slot Find Familiar forms", () => {
    const findFamiliar = spellRecord("find_familiar");
    const eligibleForms =
      pactOfTheChainFindFamiliarFormEligibilityForSpell(findFamiliar);

    expect(eligibleForms).not.toBeNull();
    if (eligibleForms === null) {
      throw new Error("Expected Pact of the Chain familiar form catalog.");
    }

    const state = startBattleRight({
      battleId: battleId("battle-pact-chain-find-familiar-access"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Pact of the Chain Warlock",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [],
            spellSlots: [{ spellLevel: 1, count: 1 }],
            invocationSpellAccesses: [
              {
                tag: "pactOfTheChainFindFamiliar",
                spell: findFamiliar,
              },
            ],
          }),
        }),
      ],
    });
    const warlock = state.combatants.get(wizardId);

    expect(warlock?.origin.kind).toBe("character");
    if (warlock?.origin.kind !== "character") {
      throw new Error("Expected Warlock caster.");
    }
    expect(warlock.origin.spellcasting?.invocationSpellAccesses).toEqual([
      {
        tag: "pactOfTheChainFindFamiliar",
        spell: findFamiliar,
        invocationMode: PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE,
        eligibleForms,
      },
    ]);
    expect(discoverBattleActs(state)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          summary: expect.stringContaining("Find Familiar"),
        }),
      ]),
    );
  });

  test("Pact of the Chain special form resolution keeps type override as invocation input", () => {
    const eligibleForms = pactOfTheChainFindFamiliarFormEligibilityForSpell(
      spellRecord("find_familiar"),
    );

    expect(eligibleForms).not.toBeNull();
    if (eligibleForms === null) {
      throw new Error("Expected Pact of the Chain familiar form catalog.");
    }
    expect(eligibleForms.specialForms.map((form) => form.formId)).toEqual([
      "imp",
      "pseudodragon",
      "quasit",
      "skeleton",
      "sphinx_of_wonder",
      "sprite",
      "venomous_snake",
    ]);
    for (const form of eligibleForms.specialForms) {
      expect(
        resolvePactOfTheChainFindFamiliarForm({
          catalog: statBlockCatalog,
          eligibility: eligibleForms,
          selection: {
            tag: "pactOfTheChainSpecialForm",
            formId: form.formId,
          },
          creatureTypeOverrideChoiceId: "fey",
        }),
      ).toEqual({
        tag: "resolved",
        form: {
          statBlock: statBlockCatalog.requireStatBlock(form.statBlockId),
          creatureTypeOverride: "fey",
        },
      });
    }
  });

  test("Find Familiar base form eligibility does not include Pact-only special forms", () => {
    const eligibleForms = findFamiliarFormEligibilityForSpell(
      spellRecord("find_familiar"),
    );

    expect(eligibleForms).not.toBeNull();
    if (eligibleForms === null) {
      throw new Error("Expected familiar form catalog.");
    }
    expect(eligibleForms).not.toHaveProperty("specialForms");
    expect(eligibleForms.creatureTypeOverrideChoices).toEqual([
      {
        creatureType: "celestial",
        displayName: "Celestial",
        optionId: "celestial",
      },
      { creatureType: "fey", displayName: "Fey", optionId: "fey" },
      { creatureType: "fiend", displayName: "Fiend", optionId: "fiend" },
    ]);
  });

  test("Find Familiar form eligibility requires creature type override choices from spell mode", () => {
    const malformedFindFamiliar = decodeUnitRecordSync({
      ...findFamiliarInput,
      mechanics: {
        ...findFamiliarInput.mechanics,
        mode: {
          label: "creature type",
          options: [
            {
              displayName: "Celestial",
              id: "celestial",
              overrides: {},
            },
          ],
        },
      },
    });

    expect(malformedFindFamiliar.kind).toBe("spell");
    if (malformedFindFamiliar.kind !== "spell") {
      throw new Error(
        "Expected malformed Find Familiar fixture to be a spell.",
      );
    }
    expect(
      findFamiliarFormEligibilityForSpell(malformedFindFamiliar),
    ).toBeNull();
  });

  test("Find Familiar form eligibility rejects creature type overrides outside Celestial, Fey, and Fiend", () => {
    const malformedFindFamiliar = decodeUnitRecordSync({
      ...findFamiliarInput,
      mechanics: {
        ...findFamiliarInput.mechanics,
        mode: {
          label: "creature type",
          options: [
            ...findFamiliarInput.mechanics.mode.options,
            {
              displayName: "Beast",
              id: "beast",
              overrides: { creatureType: "beast" },
            },
          ],
        },
      },
    });

    expect(malformedFindFamiliar.kind).toBe("spell");
    if (malformedFindFamiliar.kind !== "spell") {
      throw new Error(
        "Expected malformed Find Familiar fixture to be a spell.",
      );
    }
    expect(
      findFamiliarFormEligibilityForSpell(malformedFindFamiliar),
    ).toBeNull();
  });

  test("Find Familiar form eligibility rejects duplicate normal form ids", () => {
    const malformedFindFamiliar = decodeUnitRecordSync({
      ...findFamiliarInput,
      mechanics: {
        ...findFamiliarInput.mechanics,
        creature: {
          ...findFamiliarInput.mechanics.creature,
          normalForms: [
            ...findFamiliarInput.mechanics.creature.normalForms,
            {
              displayName: "Duplicate Owl",
              formId: "owl",
              statBlockId: "stat_block_bat",
            },
          ],
        },
      },
    });

    expect(malformedFindFamiliar.kind).toBe("spell");
    if (malformedFindFamiliar.kind !== "spell") {
      throw new Error(
        "Expected malformed Find Familiar fixture to be a spell.",
      );
    }
    expect(
      findFamiliarFormEligibilityForSpell(malformedFindFamiliar),
    ).toBeNull();
  });

  test("Find Familiar form eligibility rejects duplicate creature type option ids", () => {
    const malformedFindFamiliar = decodeUnitRecordSync({
      ...findFamiliarInput,
      mechanics: {
        ...findFamiliarInput.mechanics,
        mode: {
          label: "creature type",
          options: [
            {
              displayName: "Celestial",
              id: "celestial",
              overrides: { creatureType: "celestial" },
            },
            {
              displayName: "Fey",
              id: "fey",
              overrides: { creatureType: "fey" },
            },
            {
              displayName: "Fiend With Duplicate Option Id",
              id: "fey",
              overrides: { creatureType: "fiend" },
            },
          ],
        },
      },
    });

    expect(malformedFindFamiliar.kind).toBe("spell");
    if (malformedFindFamiliar.kind !== "spell") {
      throw new Error(
        "Expected malformed Find Familiar fixture to be a spell.",
      );
    }
    expect(
      findFamiliarFormEligibilityForSpell(malformedFindFamiliar),
    ).toBeNull();
  });

  test("Find Familiar normal forms resolve only through CR 0 Beast Stat Blocks", () => {
    const eligibleForms = findFamiliarFormEligibilityForSpell(
      spellRecord("find_familiar"),
    );

    expect(eligibleForms).not.toBeNull();
    if (eligibleForms === null) {
      throw new Error("Expected familiar form catalog.");
    }
    for (const form of eligibleForms.normalForms) {
      expect(
        resolveFindFamiliarForm({
          catalog: statBlockCatalog,
          eligibility: eligibleForms,
          selection: { tag: "normalNamedForm", formId: form.formId },
          creatureTypeOverrideChoiceId: "celestial",
        }),
      ).toEqual({
        tag: "resolved",
        form: {
          statBlock: statBlockCatalog.requireStatBlock(form.statBlockId),
          creatureTypeOverride: "celestial",
        },
      });
    }
    expect(
      resolveFindFamiliarForm({
        catalog: statBlockCatalog,
        eligibility: eligibleForms,
        selection: {
          tag: "challengeRatingZeroBeast",
          statBlockId: "stat_block_skeleton",
        },
        creatureTypeOverrideChoiceId: "fiend",
      }),
    ).toEqual({
      tag: "issue",
      message:
        "Find Familiar normal form must resolve to a CR 0 Beast Stat Block: stat_block_skeleton.",
    });
    expect(
      resolveFindFamiliarForm({
        catalog: statBlockCatalog,
        eligibility: eligibleForms,
        selection: { tag: "normalNamedForm", formId: "owl" },
        creatureTypeOverrideChoiceId: "beast",
      }),
    ).toEqual({
      tag: "issue",
      message: "Find Familiar creature type override is not eligible: beast.",
    });
  });

  test("Pact of the Chain Spell Access rejects the old inline placeholder shape", () => {
    const inlinePlaceholderCreatureTypeOptions =
      findFamiliarInput.mechanics.mode.options.map(
        (option) => option.overrides.creatureType,
      );
    const inlinePlaceholderUnitRecord = decodeUnitRecordSync({
      ...findFamiliarInput,
      mechanics: {
        ...findFamiliarInput.mechanics,
        creature: {
          kind: "inline",
          statBlock: {
            abilityScores: {
              cha: 7,
              con: 8,
              dex: 13,
              int: 2,
              str: 3,
              wis: 12,
            },
            ac: { kind: "literal", value: 11 },
            creatureType: {
              kind: "choice",
              label: "creature type",
              options: inlinePlaceholderCreatureTypeOptions,
            },
            displayName: "Familiar (CR-0 Beast form)",
            hp: { kind: "literal", value: 1 },
            size: "tiny",
            speeds: [{ feet: { kind: "literal", value: 5 }, kind: "walk" }],
          },
        },
      },
    });
    if (inlinePlaceholderUnitRecord.kind !== "spell") {
      throw new Error(
        "Inline placeholder test input must decode to a spell record.",
      );
    }

    expect(
      startBattle({
        battleId: battleId("battle-pact-chain-inline-placeholder-rejected"),
        combatants: [
          characterSeed({
            combatantId: wizardId,
            displayName: "Warlock",
            initiative: 20,
            attack: null,
            spellcasting: wizardSpellcasting({
              preparedSpells: [],
              spellSlots: [{ spellLevel: 1, count: 1 }],
              invocationSpellAccesses: [
                {
                  tag: "pactOfTheChainFindFamiliar",
                  spell: inlinePlaceholderUnitRecord,
                },
              ],
            }),
          }),
        ],
      }),
    ).toEqual(
      Either.left({
        tag: "battleStateInitIssue",
        message:
          "Pact of the Chain Find Familiar access requires familiar form catalog references.",
      }),
    );
  });

  test("Pact of the Chain Spell Access rejects non-Find-Familiar spell records", () => {
    const findFamiliarWithWrongRuntimeId = {
      ...spellRecord("find_familiar"),
      id: "misidentified_find_familiar",
    };

    expect(
      startBattle({
        battleId: battleId("battle-pact-chain-invalid-spell-access"),
        combatants: [
          characterSeed({
            combatantId: wizardId,
            displayName: "Warlock",
            initiative: 20,
            attack: null,
            spellcasting: wizardSpellcasting({
              preparedSpells: [],
              spellSlots: [{ spellLevel: 1, count: 1 }],
              invocationSpellAccesses: [
                {
                  tag: "pactOfTheChainFindFamiliar",
                  spell: findFamiliarWithWrongRuntimeId,
                },
              ],
            }),
          }),
        ],
      }),
    ).toEqual(
      Either.left({
        tag: "battleStateInitIssue",
        message: "Pact of the Chain Spell Access must grant Find Familiar.",
      }),
    );
  });

  test("Book of Shadows Spell Access derives effective Warlock cantrip and Ritual access", () => {
    const state = startBattleRight({
      battleId: battleId("battle-book-of-shadows-access"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Pact of the Tome Warlock",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [],
            spellSlots: [{ spellLevel: 1, count: 1 }],
            bookOfShadowsSpellAccesses: [
              {
                tag: "bookOfShadows",
                bookPresence: { tag: "onPerson" },
                cantrips: [
                  spellRecord("poison_spray"),
                  spellRecord("chill_touch"),
                  spellRecord("starry_wisp"),
                ],
                ritualSpells: [
                  spellRecord("detect_magic"),
                  spellRecord("detect_poison_and_disease"),
                ],
                spellcastingFocus: "book_of_shadows",
              },
            ],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const warlock = state.combatants.get(wizardId);

    expect(warlock?.origin.kind).toBe("character");
    if (warlock?.origin.kind !== "character") {
      throw new Error("Expected Warlock caster.");
    }
    expect(warlock.origin.spellcasting?.cantrips).toEqual([]);
    expect(warlock.origin.spellcasting?.preparedSpells).toEqual([]);
    expect(warlock.origin.spellcasting?.bookOfShadowsSpellAccesses).toEqual([
      {
        tag: "bookOfShadows",
        bookPresence: { tag: "onPerson" },
        cantrips: [
          spellRecord("poison_spray"),
          spellRecord("chill_touch"),
          spellRecord("starry_wisp"),
        ],
        ritualSpells: [
          spellRecord("detect_magic"),
          spellRecord("detect_poison_and_disease"),
        ],
        spellcastingFocus: "book_of_shadows",
      },
    ]);
    expect(discoverBattleActs(state)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          summary: expect.stringContaining("Poison Spray"),
        }),
      ]),
    );
  });

  test("Book of Shadows Spell Access is stored but ineffective when the book is not on person", () => {
    const state = startBattleRight({
      battleId: battleId("battle-book-of-shadows-not-on-person"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Pact of the Tome Warlock",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [],
            spellSlots: [{ spellLevel: 1, count: 1 }],
            bookOfShadowsSpellAccesses: [
              {
                tag: "bookOfShadows",
                bookPresence: { tag: "notOnPerson" },
                cantrips: [
                  spellRecord("poison_spray"),
                  spellRecord("chill_touch"),
                  spellRecord("starry_wisp"),
                ],
                ritualSpells: [
                  spellRecord("detect_magic"),
                  spellRecord("detect_poison_and_disease"),
                ],
                spellcastingFocus: "book_of_shadows",
              },
            ],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const warlock = state.combatants.get(wizardId);

    expect(warlock?.origin.kind).toBe("character");
    if (warlock?.origin.kind !== "character") {
      throw new Error("Expected Warlock caster.");
    }
    expect(
      warlock.origin.spellcasting?.bookOfShadowsSpellAccesses,
    ).toHaveLength(1);
    expect(discoverBattleActs(state)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          summary: expect.stringContaining("Poison Spray"),
        }),
      ]),
    );
  });

  test("Armor of Shadows rejects armored self before spending resources", () => {
    const armored = {
      ...defaultArmorClassState(),
      base: {
        kind: "armor" as const,
        category: "medium" as const,
        formula: { kind: "medium_dex_max_2" as const, base: 14 },
      },
    };
    const state = startBattleRight({
      battleId: battleId("battle-armor-of-shadows-armored-self"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Armored Warlock",
          initiative: 20,
          attack: null,
          armorClass: armored,
          spellcasting: wizardSpellcasting({
            preparedSpells: [],
            spellSlots: [{ spellLevel: 1, count: 1 }],
            invocationSpellAccesses: [
              {
                tag: "armorOfShadowsMageArmor",
                spell: spellRecord("mage_armor"),
              },
            ],
          }),
        }),
      ],
    });
    const subject = {
      tag: "actionSpell" as const,
      actorId: wizardId,
      invocation: armorOfShadowsSpellInvocationRef("mage_armor"),
      mode: { tag: "cast" as const },
    };
    expect(
      discoverBattleActs(state).some((candidate) =>
        sameBattleSubject(candidate.subject, subject),
      ),
    ).toBe(false);
    const target = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [],
      }),
      "targetChoice",
    );
    if (target.kind !== "targetChoice") {
      throw new Error("Expected targetChoice hole.");
    }

    expect(target.choices).toEqual([]);
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, wizardId)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    const warlock = state.combatants.get(wizardId);
    expect(warlock?.origin.kind).toBe("character");
    if (warlock?.origin.kind !== "character") {
      throw new Error("Expected Warlock caster.");
    }
    expect(warlock.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 0 },
    ]);
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

  test("Acid Splash save-gate damage applies only to failed Saving Throws", () => {
    const state = wizardVsSkeletonBattle({
      extraCombatants: [
        statBlockCreatureInit({
          combatantId: secondSkeletonId,
          displayName: "Second Skeleton",
          initiative: 8,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
        }),
      ],
    });
    const subject = magicSubject("acid_splash");
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Acid Splash point-origin Sphere Saving Throw outcomes",
      ability: "dex",
      dc: { kind: "caster_spell_save_dc" },
      areaChoices: [],
    });
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: false },
            {
              targetId: secondSkeletonId,
              succeeded: true,
            },
          ]),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Acid Splash damage (1d6-acid)",
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: skeletonId, succeeded: false },
          {
            targetId: secondSkeletonId,
            succeeded: true,
          },
        ]),
        damageRollFill(damage, 4),
      ],
    });
    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 9 },
          { combatantId: secondSkeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(expendedLevelOneSlots(requireResolved(result), wizardId)).toBe(0);

    const allSucceeded = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: skeletonId, succeeded: true },
          {
            targetId: secondSkeletonId,
            succeeded: true,
          },
        ]),
      ],
    });
    expect(allSucceeded).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 13 },
          { combatantId: secondSkeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
  });

  test("Poison Spray uses creature target spell attack damage and cantrip scaling", () => {
    const state = startBattleRight({
      battleId: battleId("battle-poison-spray"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("poison_spray")],
            preparedSpells: [],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Target",
          initiative: 10,
          attack: null,
        }),
      ],
    });
    const subject = magicSubject("poison_spray");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, fighterId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, fighterId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Poison Spray damage (2d12-poison)",
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, fighterId),
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[5, 6]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: fighterId, hp: 1 },
        ],
        turn: { actionResources: [] },
      },
    });
  });

  test("Chill Touch uses melee spell attack damage and prevents Hit Point regain on hit", () => {
    const state = startBattleRight({
      battleId: battleId("battle-chill-touch"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("chill_touch")],
            preparedSpells: [spellRecord("healing_word")],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("chill_touch");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    expect(attackRoll).toMatchObject({
      label: "Chill Touch spell attack roll",
      attackBonus: 5,
    });
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Chill Touch damage (2d10-necrotic)",
      spell: expect.objectContaining({
        attackKind: "melee_spell_attack",
        postDamageRiders: [
          {
            kind: "hitPointRegainPrevented",
            expiresAt: "endOfCasterNextTurn",
          },
        ],
      }),
    });

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[5, 6]]),
        ],
      }),
    );

    expect(result).toMatchObject({
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 2 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(
      result.state.combatants.get(skeletonId)?.activeEffects,
    ).toContainEqual({
      kind: "hitPointRegainPrevented",
      sourceSpellId: "chill_touch",
      sourceCombatantId: wizardId,
      expiresAt: {
        kind: "endOfTurn",
        combatantId: wizardId,
        round: 2,
      },
    });

    const healingWordAct = discoverBattleActs(result.state).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === "healing_word",
    );
    if (healingWordAct === undefined) {
      throw new Error("Expected Healing Word bonus action spell act.");
    }
    const healingWordTarget = requireHole(
      resolveBattleSubject({
        state: result.state,
        subject: healingWordAct.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const healingWordRoll = requireHole(
      resolveBattleSubject({
        state: result.state,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "healing_word",
            },
          ]),
        ],
      }),
      "rolledDice",
    );
    const blockedHealing = requireResolved(
      resolveBattleSubject({
        state: result.state,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "healing_word",
            },
          ]),
          damageRollFillWithGroups(healingWordRoll, [[4, 4]]),
        ],
      }),
    );

    expect(blockedHealing.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: skeletonId, hp: 2 }),
      ]),
    );

    const skeletonTurn = requireResolved(
      endTurn({ state: result.state, actorId: wizardId }),
    );
    const wizardNextTurn = requireResolved(
      endTurn({ state: skeletonTurn.state, actorId: skeletonId }),
    );
    const afterWizardNextTurn = requireResolved(
      endTurn({ state: wizardNextTurn.state, actorId: wizardId }),
    );
    expect(
      afterWizardNextTurn.state.combatants
        .get(skeletonId)
        ?.activeEffects.some(
          (effect) => effect.kind === "hitPointRegainPrevented",
        ),
    ).toBe(false);
    expect(expendedLevelOneSlots(result, wizardId)).toBe(0);
  });

  test("Chill Touch miss applies no Hit Point regain prevention rider", () => {
    const state = startBattleRight({
      battleId: battleId("battle-chill-touch-miss"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("chill_touch")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("chill_touch");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ],
      }),
    );

    expect(result.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: skeletonId, hp: 13 }),
      ]),
    );
    expect(result.state.combatants.get(skeletonId)?.activeEffects).toEqual([]);
  });

  test("Chill Touch expired rider allows later Hit Point regain", () => {
    const state = startBattleRight({
      battleId: battleId("battle-chill-touch-heal-after-expiry"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("chill_touch")],
            preparedSpells: [spellRecord("healing_word")],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("chill_touch");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
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
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const hit = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[5, 6]]),
        ],
      }),
    );
    const skeletonTurn = requireResolved(
      endTurn({ state: hit.state, actorId: wizardId }),
    );
    const wizardNextTurn = requireResolved(
      endTurn({ state: skeletonTurn.state, actorId: skeletonId }),
    );
    const expired = requireResolved(
      endTurn({ state: wizardNextTurn.state, actorId: wizardId }),
    );
    const wizardThirdTurn = requireResolved(
      endTurn({ state: expired.state, actorId: skeletonId }),
    );
    const healingWordAct = discoverBattleActs(wizardThirdTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === "healing_word",
    );
    if (healingWordAct === undefined) {
      throw new Error("Expected Healing Word bonus action spell act.");
    }
    const healingWordTarget = requireHole(
      resolveBattleSubject({
        state: wizardThirdTurn.state,
        subject: healingWordAct.subject,
        fills: [],
      }),
      "targetChoice",
    );
    const healingWordRoll = requireHole(
      resolveBattleSubject({
        state: wizardThirdTurn.state,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "healing_word",
            },
          ]),
        ],
      }),
      "rolledDice",
    );
    const healed = requireResolved(
      resolveBattleSubject({
        state: wizardThirdTurn.state,
        subject: healingWordAct.subject,
        fills: [
          targetFill(healingWordTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: wizardId,
              targetId: skeletonId,
              spellId: "healing_word",
            },
          ]),
          damageRollFillWithGroups(healingWordRoll, [[4, 4]]),
        ],
      }),
    );

    expect(healed.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ combatantId: skeletonId, hp: 13 }),
      ]),
    );
  });

  test("Chill Touch old damage path still spends no Spell Slot", () => {
    const state = startBattleRight({
      battleId: battleId("battle-chill-touch-slot"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("chill_touch")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("chill_touch");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
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
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[5, 6]]),
        ],
      }),
    );

    expect(result).toMatchObject({
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 2 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(expendedLevelOneSlots(result, wizardId)).toBe(0);
  });

  test("Chill Touch admits caller-supplied object targets for melee spell attack damage", () => {
    const state = startBattleRight({
      battleId: battleId("battle-chill-touch-object-hit"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("chill_touch")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("chill_touch");
    const act = findAct(state, subject);
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: expect.arrayContaining([skeletonId]),
      }),
      expect.objectContaining({ kind: "objectTargetChoice" }),
    ]);

    const objectId = battleObjectId("chill-touch-training-object");
    const objectTarget = objectTargetFill({
      hole: findHole(act.initialHoles, "objectTargetChoice"),
      objectId,
      spellId: "chill_touch",
      rangeFeet: movementFeet(5),
      damageDisposition: { kind: "hitPoints", hitPoints: Hp(12) },
    });
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [objectTarget],
      }),
      "attackRoll",
    );
    expect(attackRoll).toMatchObject({
      label: "Chill Touch spell attack roll",
      spell: expect.objectContaining({
        targeting: { kind: "singleCreatureOrObject" },
        attackKind: "melee_spell_attack",
      }),
    });
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          objectTarget,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Chill Touch damage (2d10-necrotic)",
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        objectTarget,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[4, 5]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId,
          damageType: "necrotic",
          rolledDamage: damageAmount(9),
          effectiveDamage: damageAmount(9),
          priorHitPoints: Hp(12),
          nextHitPoints: Hp(3),
          destroyed: false,
        },
      ],
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(expendedLevelOneSlots(requireResolved(result), wizardId)).toBe(0);
    expect(
      requireResolved(result).state.combatants.get(skeletonId)?.activeEffects,
    ).toEqual([]);
  });

  test("Chill Touch object targeting rejects missing matching object facts", () => {
    const state = startBattleRight({
      battleId: battleId("battle-chill-touch-object-reject"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("chill_touch")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("chill_touch");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        objectTargetFill({
          hole: objectTarget,
          spellId: "chill_touch",
          rangeFeet: movementFeet(30),
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Spell object target must include a matching table-supplied range and object Armor Class fact.",
    });
  });

  test("Starry Wisp applies a shared Dim Light emitter to a hit creature until the caster's next turn ends", () => {
    const state = startBattleRight({
      battleId: battleId("battle-starry-wisp-creature"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("starry_wisp")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("starry_wisp");
    const act = findAct(state, subject);
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: expect.arrayContaining([skeletonId]),
      }),
      expect.objectContaining({ kind: "objectTargetChoice" }),
    ]);

    const target = findHole(act.initialHoles, "targetChoice");
    const attackRoll = requireHole(
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
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Starry Wisp damage (2d8-radiant)",
      spell: expect.objectContaining({
        targeting: { kind: "singleCreatureOrObject" },
        attackKind: "ranged_spell_attack",
        damage: {
          kind: "fixedSpellAttackDamage",
          expr: { dice: 2, dieSize: 8 },
          damageType: "radiant",
        },
        postDamageRiders: [
          {
            kind: "lightEmission",
            emission: { kind: "dim", radiusFeet: 10 },
            expiresAt: "endOfCasterNextTurn",
          },
          {
            kind: "invisibleBenefitDenied",
            expiresAt: "endOfCasterNextTurn",
          },
        ],
      }),
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, skeletonId),
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[5, 6]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        lightEmitters: [
          {
            sourceSpellId: "starry_wisp",
            sourceCombatantId: wizardId,
            attachment: { kind: "combatant", combatantId: skeletonId },
            emission: { kind: "dim", radiusFeet: movementFeet(10) },
            expiresAt: {
              kind: "endOfTurn",
              combatantId: wizardId,
              round: 2,
            },
          },
        ],
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 2 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect("objectDamages" in requireResolved(result)).toBe(false);
    expect(expendedLevelOneSlots(requireResolved(result), wizardId)).toBe(0);

    const afterWizardTurn = requireResolved(
      endTurn({
        state: requireResolved(result).state,
        actorId: wizardId,
      }),
    );
    expect(afterWizardTurn.state.lightEmitters).toHaveLength(1);

    const afterSkeletonTurn = requireResolved(
      endTurn({
        state: afterWizardTurn.state,
        actorId: skeletonId,
      }),
    );
    expect(afterSkeletonTurn.state.lightEmitters).toHaveLength(1);

    const afterWizardNextTurn = requireResolved(
      endTurn({
        state: afterSkeletonTurn.state,
        actorId: wizardId,
      }),
    );
    expect(afterWizardNextTurn.state.lightEmitters).toEqual([]);
  });

  test("Starry Wisp hit denies Invisible benefit without removing the condition until the caster's next turn ends", () => {
    const allyId = combatantId("starry-wisp-ally");
    const state = startBattleRight({
      battleId: battleId("battle-starry-wisp-invisible-denial"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("starry_wisp")],
            preparedSpells: [],
          }),
        }),
        characterSeed({
          combatantId: allyId,
          displayName: "Ally",
          initiative: 15,
        }),
        skeletonCreatureInit({
          initiative: 10,
        }),
      ],
    });
    const skeleton = state.combatants.get(skeletonId);
    if (skeleton === undefined) {
      throw new Error("Expected Starry Wisp target combatant.");
    }
    const invisibleState = {
      ...state,
      combatants: new Map(state.combatants).set(
        skeletonId,
        testBattleCreatureStateWithConditions(
          skeleton,
          applyCondition(skeleton.conditions, "invisible"),
        ),
      ),
    };
    const subject = magicSubject("starry_wisp");
    const target = findHole(
      findAct(invisibleState, subject).initialHoles,
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state: invisibleState,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    expect(combatantCanSee(invisibleState, allyId, skeletonId)).toBe(false);
    const damage = requireHole(
      resolveBattleSubject({
        state: invisibleState,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const hit = requireResolved(
      resolveBattleSubject({
        state: invisibleState,
        subject,
        fills: [
          targetFill(target, skeletonId),
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[1, 1]]),
        ],
      }),
    );
    const hitTarget = hit.state.combatants.get(skeletonId);
    if (hitTarget === undefined) {
      throw new Error("Expected Starry Wisp hit target combatant.");
    }
    expect(hitTarget?.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "invisibleBenefitDenied",
          sourceSpellId: "starry_wisp",
          sourceCombatantId: wizardId,
          expiresAt: {
            kind: "endOfTurn",
            combatantId: wizardId,
            round: 2,
          },
        }),
      ]),
    );
    expect(hasCondition(hitTarget.conditions, "invisible")).toBe(true);
    expect(combatantCanSee(hit.state, allyId, skeletonId)).toBe(true);

    const allyTurn = requireResolved(
      endTurn({ state: hit.state, actorId: wizardId }),
    );
    const allyAttack: BattleSubject = {
      tag: "action",
      actorId: allyId,
      action: "attack",
      attackName: "Longsword",
    };
    const allyTarget = requireHole(
      resolveBattleSubject({
        state: allyTurn.state,
        subject: allyAttack,
        fills: [],
      }),
      "targetChoice",
    );
    const allyAttackRoll = requireHole(
      resolveBattleSubject({
        state: allyTurn.state,
        subject: allyAttack,
        fills: [attackTargetFill(allyTarget, allyId, skeletonId)],
      }),
      "attackRoll",
    );
    expect(allyAttackRoll).not.toHaveProperty("rollMode");

    const skeletonTurn = requireResolved(
      endTurn({ state: allyTurn.state, actorId: allyId }),
    );
    const wizardNextTurn = requireResolved(
      endTurn({ state: skeletonTurn.state, actorId: skeletonId }),
    );
    const expired = requireResolved(
      endTurn({ state: wizardNextTurn.state, actorId: wizardId }),
    );
    const expiredTarget = expired.state.combatants.get(skeletonId);
    if (expiredTarget === undefined) {
      throw new Error("Expected expired Starry Wisp target combatant.");
    }
    expect(expiredTarget?.activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "invisibleBenefitDenied" }),
      ]),
    );
    expect(hasCondition(expiredTarget.conditions, "invisible")).toBe(true);
    expect(combatantCanSee(expired.state, allyId, skeletonId)).toBe(false);
  });

  test("Eldritch Blast resolves independent creature and object beams for one Magic action", () => {
    const objectId = battleObjectId("eldritch-training-crystal");
    const state = startBattleRight({
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
    const subject = magicSubject("eldritch_blast");
    const act = findAct(state, subject);
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
    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: wizardId,
      invocation: cantripSpellInvocationRef(
        "eldritch_blast",
        "spellAttackBeamSequence",
      ),
      mode: { tag: "cast" },
    });
    expect(targetHoles).toHaveLength(2);
    expect(objectTargetHoles).toHaveLength(2);
    expect(act.initialHoles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Eldritch Blast beam 1 target" }),
        expect.objectContaining({
          label: "Eldritch Blast beam 1 object target",
        }),
        expect.objectContaining({ label: "Eldritch Blast beam 2 target" }),
        expect.objectContaining({
          label: "Eldritch Blast beam 2 object target",
        }),
      ]),
    );

    const beamOneTarget = targetFill(targetHoles[0]!, skeletonId);
    const beamTwoTarget = objectTargetFill({
      hole: objectTargetHoles[1]!,
      objectId,
      spellId: "eldritch_blast",
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
      label: "Eldritch Blast beam 1 spell attack roll",
      spell: expect.objectContaining({
        targeting: { kind: "beamSequenceCreatureOrObject", beamCount: 2 },
        damage: {
          expr: { dice: 1, dieSize: 10 },
          damageType: "force",
        },
        rangeFeet: 120,
        attackKind: "ranged_spell_attack",
      }),
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
      label: "Eldritch Blast beam 1 damage (1d10-force)",
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
      label: "Eldritch Blast beam 2 spell attack roll",
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
      label: "Eldritch Blast beam 2 damage (1d10-force)",
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
    const state = startBattleRight({
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
    const subject = magicSubject("eldritch_blast");
    const targetHoles = findAct(state, subject).initialHoles.filter(
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
    const baseState = startBattleRight({
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
          side: oppositionSide,
          attack: null,
        }),
      ],
    });
    const target = baseState.combatants.get(skeletonId)!;
    const state = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(skeletonId, {
        ...target,
        concentration: {
          sourceSpellId: "test_concentration",
          effectKind: "readiedSpell",
        },
        activeEffects: [
          ...target.activeEffects,
          {
            kind: "spellDamageReduction" as const,
            sourceSpellId: "resistance",
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
    const subject = magicSubject("eldritch_blast");
    const targetHoles = findAct(state, subject).initialHoles.filter(
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
      label: "Eldritch Blast beam 1 damage reduction",
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
        sourceSpellId: "test_concentration",
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
      const state = startBattleRight({
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
      const holes = findAct(state, magicSubject("eldritch_blast")).initialHoles;
      expect(holes.filter((hole) => hole.kind === "targetChoice")).toHaveLength(
        beamCount,
      );
      expect(
        holes.filter((hole) => hole.kind === "objectTargetChoice"),
      ).toHaveLength(beamCount);
    }
  });

  test("Eldritch Blast creature beams use Concentration, spell reduction, and zero-HP damage lifecycle holes", () => {
    const concentrationState = startBattleRight({
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
          side: oppositionSide,
          attack: null,
        }),
      ],
    });
    const concentratingTarget = concentrationState.combatants.get(skeletonId)!;
    const state = {
      ...concentrationState,
      combatants: new Map(concentrationState.combatants).set(skeletonId, {
        ...concentratingTarget,
        concentration: {
          sourceSpellId: "test_concentration",
          effectKind: "readiedSpell",
        },
      }),
    } satisfies BattleState;
    const subject = magicSubject("eldritch_blast");
    const target = findHole(
      findAct(state, subject).initialHoles,
      "targetChoice",
    );
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
            sourceSpellId: "resistance",
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
      label: "Eldritch Blast beam 1 damage reduction",
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
    const zeroHpState = startBattleRight({
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
          side: oppositionSide,
          attack: null,
          currentHp: 4,
          maxHp: 12,
          resources: [{ unit: relentlessEndurance }],
          characterUnitRefs: [
            {
              unitId: "orc_relentless_endurance",
              supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
            },
          ],
        }),
      ],
    });
    const zeroTarget = findHole(
      findAct(zeroHpState, subject).initialHoles,
      "targetChoice",
    );
    const zeroAttack = requireHole(
      resolveBattleSubject({
        state: zeroHpState,
        subject,
        fills: [targetFill(zeroTarget, skeletonId)],
      }),
      "attackRoll",
    );
    const zeroDamage = requireHole(
      resolveBattleSubject({
        state: zeroHpState,
        subject,
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
        subject,
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
        { kind: "zeroHitPointReplacement", unitId: "orc_relentless_endurance" },
      ]),
    });
  });

  test("Eldritch Blast beams open attack-hit and after-damage reaction windows", () => {
    const subject = magicSubject("eldritch_blast");
    const warlockTurnWithReadiedRay = (
      trigger: BattleReadiedSpellTrigger,
    ): BattleState => {
      const readied = resolveBattleSubject({
        state: startBattleRight({
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
        }),
        subject: {
          tag: "actionSpell",
          actorId: secondWizardId,
          invocation: cantripSpellInvocationRef(
            "ray_of_frost",
            "spellAttackDamage",
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
      return next.state;
    };
    const attackHitState = warlockTurnWithReadiedRay("attackHit");
    const attackHitTarget = findHole(
      findAct(attackHitState, subject).initialHoles,
      "targetChoice",
    );
    const attackHitRoll = requireHole(
      resolveBattleSubject({
        state: attackHitState,
        subject,
        fills: [targetFill(attackHitTarget, skeletonId)],
      }),
      "attackRoll",
    );
    expect(
      resolveBattleSubject({
        state: attackHitState,
        subject,
        fills: [
          targetFill(attackHitTarget, skeletonId),
          attackRollFill(attackHitRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "reactionDecision", trigger: "attackHit" }],
    });

    const afterDamageState = warlockTurnWithReadiedRay("afterDamage");
    const afterDamageTarget = findHole(
      findAct(afterDamageState, subject).initialHoles,
      "targetChoice",
    );
    const afterDamageRoll = requireHole(
      resolveBattleSubject({
        state: afterDamageState,
        subject,
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
        subject,
        fills: [targetFill(afterDamageTarget, skeletonId), afterDamageRollFill],
      }),
      "rolledDice",
    );
    expect(
      resolveBattleSubject({
        state: afterDamageState,
        subject,
        fills: [
          targetFill(afterDamageTarget, skeletonId),
          afterDamageRollFill,
          damageRollFillWithGroups(afterDamageDamage, [[4]]),
        ],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "reactionDecision", trigger: "afterDamage" }],
    });
  });

  test("Starry Wisp object targeting requires a matching caller-supplied object fact", () => {
    const state = startBattleRight({
      battleId: battleId("battle-starry-wisp-object-fact"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("starry_wisp")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("starry_wisp");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        objectTargetFill({
          hole: objectTarget,
          spellId: "starry_wisp",
          rangeFeet: movementFeet(30),
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Spell object target must include a matching table-supplied range and object Armor Class fact.",
    });
  });

  test("Starry Wisp object target miss spends the Magic action without object damage", () => {
    const state = startBattleRight({
      battleId: battleId("battle-starry-wisp-object-miss"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("starry_wisp")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("starry_wisp");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );
    const targetFillForObject = objectTargetFill({
      hole: objectTarget,
      spellId: "starry_wisp",
      armorClass: armorClass(13),
    });
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFillForObject],
      }),
      "attackRoll",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFillForObject,
        attackRollFill(attackRoll, { total: 12, naturalD20: 7 }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect("objectDamages" in requireResolved(result)).toBe(false);
    expect(requireResolved(result).state.lightEmitters).toEqual([]);
    expect(
      objectInvisibleBenefitDenied(
        requireResolved(result).state,
        targetFillForObject.value,
      ),
    ).toBe(false);
  });

  test("Fire Bolt object target requires ignition facts before resolving the object attack", () => {
    const state = startBattleRight({
      battleId: battleId("battle-fire-bolt-object-missing-ignition"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("fire_bolt")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("fire_bolt");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        objectTargetFill({
          hole: objectTarget,
          spellId: "fire_bolt",
          rangeFeet: movementFeet(120),
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Spell object target must include a matching table-supplied object ignition fact.",
    });
  });

  test("Fire Bolt applies cantrip-scaled Fire damage and ignites unattended flammable object hits", () => {
    const state = startBattleRight({
      battleId: battleId("battle-fire-bolt-object-hit"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("fire_bolt")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("fire_bolt");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );
    const objectId = battleObjectId("dry-training-dummy");
    const targetFillForObject = objectTargetFill({
      hole: objectTarget,
      objectId,
      spellId: "fire_bolt",
      rangeFeet: movementFeet(120),
      damageDisposition: { kind: "hitPoints", hitPoints: Hp(8) },
      spatialFacts: [
        {
          kind: "spellObjectTarget",
          casterId: wizardId,
          objectId,
          spellId: "fire_bolt",
          rangeFeet: movementFeet(120),
          armorClass: armorClass(13),
          damageDisposition: { kind: "hitPoints", hitPoints: Hp(8) },
        },
        {
          kind: "spellObjectIgnition",
          casterId: wizardId,
          objectId,
          spellId: "fire_bolt",
          disposition: { kind: "flammableUnattended" },
        },
      ],
    });
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFillForObject],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFillForObject,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );

    expect(damage).toMatchObject({
      label: "Fire Bolt damage (2d10-fire)",
      spell: {
        damage: {
          expr: { dice: 2, dieSize: 10 },
          damageType: "fire",
        },
      },
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFillForObject,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[4, 5]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId,
          damageType: "fire",
          rolledDamage: damageAmount(9),
          effectiveDamage: damageAmount(9),
          priorHitPoints: Hp(8),
          nextHitPoints: Hp(0),
          destroyed: true,
        },
      ],
      objectIgnitions: [
        {
          kind: "startsBurning",
          objectId,
          sourceCombatantId: wizardId,
          sourceSpellId: "fire_bolt",
        },
      ],
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
  });

  test("Fire Bolt object miss and non-igniting object hit do not emit object ignition outcomes", () => {
    const state = startBattleRight({
      battleId: battleId("battle-fire-bolt-object-no-ignition"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("fire_bolt")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("fire_bolt");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );
    const objectId = battleObjectId("training-object");
    const targetFillForObject = objectTargetFill({
      hole: objectTarget,
      objectId,
      spellId: "fire_bolt",
      rangeFeet: movementFeet(120),
      damageDisposition: { kind: "tableResolved" },
      spatialFacts: [
        {
          kind: "spellObjectTarget",
          casterId: wizardId,
          objectId,
          spellId: "fire_bolt",
          rangeFeet: movementFeet(120),
          armorClass: armorClass(13),
          damageDisposition: { kind: "tableResolved" },
        },
        {
          kind: "spellObjectIgnition",
          casterId: wizardId,
          objectId,
          spellId: "fire_bolt",
          disposition: { kind: "wornOrCarried" },
        },
      ],
    });
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFillForObject],
      }),
      "attackRoll",
    );

    const miss = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFillForObject,
        attackRollFill(attackRoll, { total: 12, naturalD20: 7 }),
      ],
    });

    expect(miss).toMatchObject({ tag: "resolved" });
    expect("objectDamages" in requireResolved(miss)).toBe(false);
    expect("objectIgnitions" in requireResolved(miss)).toBe(false);

    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFillForObject,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const hit = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFillForObject,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[6]]),
      ],
    });

    expect(hit).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "tableResolved",
          damageType: "fire",
          rolledDamage: damageAmount(6),
        },
      ],
    });
    expect("objectIgnitions" in requireResolved(hit)).toBe(false);
  });

  test("Starry Wisp object attack rolls enforce attacker-wide disadvantage", () => {
    const state = startBattleRight({
      battleId: battleId("battle-starry-wisp-object-poisoned"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          conditions: ["poisoned"],
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("starry_wisp")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("starry_wisp");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );
    const targetFillForObject = objectTargetFill({
      hole: objectTarget,
      spellId: "starry_wisp",
      armorClass: armorClass(13),
    });
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFillForObject],
      }),
      "attackRoll",
    );
    expect(attackRoll).toMatchObject({ rollMode: "disadvantage" });
    expect(attackRoll).not.toHaveProperty("missToHitReplacements");

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFillForObject,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Spell attack roll mode does not match the current attack-roll rule.",
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFillForObject,
        attackRollFill(attackRoll, {
          total: 12,
          naturalD20: 7,
          rollMode: "disadvantage",
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect("objectDamages" in requireResolved(result)).toBe(false);
  });

  test("Starry Wisp applies object hit point and damage-threshold disposition on a hit", () => {
    const state = startBattleRight({
      battleId: battleId("battle-starry-wisp-object-hit"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("starry_wisp")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("starry_wisp");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );
    const objectId = battleObjectId("training-crystal");
    const targetFillForObject = objectTargetFill({
      hole: objectTarget,
      objectId,
      spellId: "starry_wisp",
      damageDisposition: { kind: "hitPoints", hitPoints: Hp(5) },
    });
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFillForObject],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFillForObject,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFillForObject,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[3, 3]]),
      ],
    });
    expect(result).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId,
          damageType: "radiant",
          rolledDamage: damageAmount(6),
          effectiveDamage: damageAmount(6),
          priorHitPoints: Hp(5),
          nextHitPoints: Hp(0),
          destroyed: true,
        },
      ],
      snapshot: {
        lightEmitters: [
          {
            kind: "objectInvisibleRevealLightEmitter",
            sourceSpellId: "starry_wisp",
            sourceCombatantId: wizardId,
            objectId,
            emission: { kind: "dim", radiusFeet: movementFeet(10) },
          },
        ],
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
    const resolved = requireResolved(result);
    expect(objectInvisibleBenefitDenied(resolved.state, objectId)).toBe(true);
    expect(resolved.state.objectOutlines).toEqual([]);

    const thresholdObjectId = battleObjectId("reinforced-training-crystal");
    const thresholdTargetFill = objectTargetFill({
      hole: objectTarget,
      objectId: thresholdObjectId,
      spellId: "starry_wisp",
      damageDisposition: {
        kind: "hitPointsWithDamageThreshold",
        hitPoints: Hp(10),
        damageThreshold: damageAmount(10),
      },
    });
    const thresholdDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          thresholdTargetFill,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const thresholdResult = resolveBattleSubject({
      state,
      subject,
      fills: [
        thresholdTargetFill,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(thresholdDamage, [[3, 3]]),
      ],
    });

    expect(thresholdResult).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId: thresholdObjectId,
          rolledDamage: damageAmount(6),
          effectiveDamage: damageAmount(0),
          priorHitPoints: Hp(10),
          nextHitPoints: Hp(10),
          destroyed: false,
        },
      ],
    });
  });

  test("Starry Wisp object Invisible-benefit denial expires with its object Dim Light emitter", () => {
    const state = startBattleRight({
      battleId: battleId("battle-starry-wisp-object-invisible-denial"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("starry_wisp")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("starry_wisp");
    const objectId = battleObjectId("invisible-training-crystal");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );
    const objectFill = objectTargetFill({
      hole: objectTarget,
      objectId,
      spellId: "starry_wisp",
      damageDisposition: { kind: "tableResolved" },
    });
    const attackRoll = requireHole(
      resolveBattleSubject({ state, subject, fills: [objectFill] }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          objectFill,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const hit = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          objectFill,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
          damageRollFillWithGroups(damage, [[3, 3]]),
        ],
      }),
    );

    expect(objectInvisibleBenefitDenied(hit.state, objectId)).toBe(true);
    expect(hit.state.lightEmitters).toEqual([
      expect.objectContaining({
        kind: "objectInvisibleRevealLightEmitter",
        sourceSpellId: "starry_wisp",
        objectId,
      }),
    ]);

    const afterWizardTurn = requireResolved(
      endTurn({ state: hit.state, actorId: wizardId }),
    );
    const afterSkeletonTurn = requireResolved(
      endTurn({ state: afterWizardTurn.state, actorId: skeletonId }),
    );
    const afterWizardNextTurn = requireResolved(
      endTurn({ state: afterSkeletonTurn.state, actorId: wizardId }),
    );

    expect(objectInvisibleBenefitDenied(afterWizardTurn.state, objectId)).toBe(
      true,
    );
    expect(
      objectInvisibleBenefitDenied(afterSkeletonTurn.state, objectId),
    ).toBe(true);
    expect(
      objectInvisibleBenefitDenied(afterWizardNextTurn.state, objectId),
    ).toBe(false);
    expect(afterWizardNextTurn.state.lightEmitters).toEqual([]);
    expect(afterWizardNextTurn.state.objectOutlines).toEqual([]);
  });

  test("Sacred Flame uses a creature target before Dexterity Saving Throw damage", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sacred-flame"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Cleric",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("sacred_flame")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("sacred_flame");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Sacred Flame Saving Throw outcome",
      ability: "dex",
      dc: { kind: "caster_spell_save_dc" },
    });
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Sacred Flame damage (1d8-radiant)",
    });
    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, skeletonId),
        savingThrowOutcomeFill(savingThrows, [
          { targetId: skeletonId, succeeded: false },
        ]),
        damageRollFill(damage, 7),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 6 },
        ],
        turn: { actionResources: [] },
      },
    });

    const success = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, skeletonId),
        savingThrowOutcomeFill(savingThrows, [
          { targetId: skeletonId, succeeded: true },
        ]),
      ],
    });
    expect(success).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 13 },
        ],
      },
    });
  });

  test("Inflict Wounds spends a slot and applies half damage on a successful Constitution save", () => {
    const state = startBattleRight({
      battleId: battleId("battle-inflict-wounds"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Cleric",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("inflict_wounds")],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      invocation: spellSlotInvocationRef(
        "inflict_wounds",
        2,
        "saveGatedDamage",
      ),
      mode: { tag: "cast" },
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, skeletonId)],
      }),
      "savingThrowOutcome",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: true },
          ]),
        ],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Inflict Wounds damage (3d10-necrotic)",
    });

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, skeletonId),
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: true },
          ]),
          damageRollFillWithGroups(damage, [[5, 5, 5]]),
        ],
      }),
    );

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 6 },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(expendedLevelOneSlots(result, wizardId)).toBe(0);
    const caster = result.state.combatants.get(wizardId);
    if (caster?.origin.kind !== "character") {
      throw new Error("Expected character spellcaster.");
    }
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 2, count: 1, expended: 1 },
    ]);
  });

  test("Burning Hands uses self-origin Cone outcomes, Fire damage, slot scaling, and slot spend", () => {
    const state = startBattleRight({
      battleId: battleId("battle-burning-hands"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("burning_hands")],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({
          combatantId: secondSkeletonId,
          displayName: "Second Skeleton",
          initiative: 8,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
        }),
      ],
    });
    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      invocation: spellSlotInvocationRef("burning_hands", 2, "saveGatedDamage"),
      mode: { tag: "cast" },
    };
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Burning Hands self-origin Cone Saving Throw outcomes",
      ability: "dex",
      spell: {
        targeting: { kind: "selfOriginCone", lengthFeet: 15 },
        damage: { expr: { dice: 4, dieSize: 6 }, damageType: "fire" },
        successDamage: "half",
        rangeFeet: 0,
      },
    });
    const saveFill = savingThrowOutcomeFill(savingThrows, [
      { targetId: skeletonId, succeeded: false },
      { targetId: secondSkeletonId, succeeded: true },
    ]);
    if (!("area" in saveFill.value)) {
      throw new Error("Expected area Saving Throw fill.");
    }
    expect(saveFill.value.area).toEqual({
      originAnchorId: wizardId,
      affectedTargetIds: [skeletonId, secondSkeletonId],
    });
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [saveFill],
      }),
      "rolledDice",
    );
    expect(damage).toMatchObject({
      label: "Burning Hands damage (4d6-fire)",
    });

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [saveFill, damageRollFillWithGroups(damage, [[3, 3, 3, 3]])],
      }),
    );

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 1 },
          { combatantId: secondSkeletonId, hp: 7 },
        ],
        turn: { actionResources: [] },
      },
    });
    const caster = result.state.combatants.get(wizardId);
    if (caster?.origin.kind !== "character") {
      throw new Error("Expected character spellcaster.");
    }
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 2, count: 1, expended: 1 },
    ]);
  });

  test("Burning Hands rejects self-origin Cone outcomes anchored to another combatant", () => {
    const state = startBattleRight({
      battleId: battleId("battle-burning-hands-invalid-origin"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("burning_hands")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("burning_hands");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: skeletonId,
                affectedTargetIds: [skeletonId],
              },
              outcomes: [{ targetId: skeletonId, succeeded: false }],
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Self-origin Cone save-gate spell area must originate from the caster.",
    });
  });

  test("Burning Hands can resolve with an empty table-supplied Cone membership", () => {
    const state = startBattleRight({
      battleId: battleId("battle-burning-hands-empty-cone"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("burning_hands")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("burning_hands");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [savingThrowOutcomeFill(savingThrows, [])],
      }),
    );

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
    const caster = result.state.combatants.get(wizardId);
    if (caster?.origin.kind !== "character") {
      throw new Error("Expected character spellcaster.");
    }
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 1 },
    ]);
  });

  test("Ice Knife resolves critical attack damage and mandatory primary-target burst", () => {
    const primaryTargetId = combatantId("ice-knife-primary");
    const baseState = startBattleRight({
      battleId: battleId("battle-ice-knife"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("ice_knife")],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: primaryTargetId,
          displayName: "Primary Target",
          initiative: 10,
          side: oppositionSide,
          currentHp: 30,
          maxHp: 30,
        }),
        statBlockCreatureInit({
          combatantId: secondSkeletonId,
          displayName: "Nearby Skeleton",
          initiative: 8,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
        }),
      ],
    });
    const primaryTarget = baseState.combatants.get(primaryTargetId);
    if (primaryTarget === undefined) {
      throw new Error("Expected primary target.");
    }
    const state = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(primaryTargetId, {
        ...primaryTarget,
        concentration: {
          sourceSpellId: "mage_armor",
          effectKind: "spellEffect" as const,
        },
      }),
    };
    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: wizardId,
      invocation: spellSlotInvocationRef(
        "ice_knife",
        2,
        "attackBurstSaveDamage",
      ),
      mode: { tag: "cast" },
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, primaryTargetId);
    const attack = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetChoice] }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attack, { total: 25, naturalD20: 20 });
    const attackDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
      "rolledDice",
    );
    expect(attackDamage).toMatchObject({
      label: "Ice Knife damage (2d10-piercing)",
    });
    const attackDamageRoll = damageRollFillWithGroups(attackDamage, [[5, 5]]);
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll, attackDamageRoll],
      }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Ice Knife primary-target-origin Emanation Saving Throw outcomes",
      ability: "dex",
      spell: {
        burst: {
          targeting: { kind: "primaryTargetOriginEmanation", radiusFeet: 5 },
          damage: { expr: { dice: 3, dieSize: 6 }, damageType: "cold" },
        },
      },
    });
    const saveFill: Extract<
      BattleFill,
      { readonly kind: "savingThrowOutcome" }
    > = {
      kind: "savingThrowOutcome",
      holeId: savingThrows.holeId,
      value: {
        area: {
          originAnchorId: primaryTargetId,
          affectedTargetIds: [primaryTargetId, secondSkeletonId],
        },
        outcomes: [
          { targetId: primaryTargetId, succeeded: false },
          { targetId: secondSkeletonId, succeeded: true },
        ],
      },
    };
    const burstDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll, attackDamageRoll, saveFill],
      }),
      "rolledDice",
    );
    expect(burstDamage).toMatchObject({
      label: "Ice Knife burst damage (3d6-cold)",
    });

    const burstDamageRoll = damageRollFillWithGroups(burstDamage, [[2, 2, 2]]);
    const concentration = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          attackDamageRoll,
          saveFill,
          burstDamageRoll,
        ],
      }),
      "concentrationSavingThrow",
    );
    expect(concentration).toMatchObject({
      combatantId: primaryTargetId,
      dc: 10,
      damageAmount: 16,
    });
    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          attackDamageRoll,
          saveFill,
          burstDamageRoll,
          concentrationSavingThrowFill(concentration, false),
        ],
      }),
    );

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: primaryTargetId, hp: 14, concentrating: false },
          { combatantId: secondSkeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
    const caster = result.state.combatants.get(wizardId);
    if (caster?.origin.kind !== "character") {
      throw new Error("Expected character spellcaster.");
    }
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 2, count: 1, expended: 1 },
    ]);
  });

  test("Ice Knife attack damage requests zero-HP replacement disposition before the burst save", () => {
    const primaryTargetId = combatantId("ice-knife-attack-relentless-primary");
    const relentlessEndurance = unitLibrary.requireUnit(
      "orc_relentless_endurance",
    );
    const state = startBattleRight({
      battleId: battleId("battle-ice-knife-attack-relentless"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("ice_knife")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: primaryTargetId,
          displayName: "Relentless Primary",
          initiative: 10,
          side: oppositionSide,
          currentHp: 3,
          maxHp: 12,
          resources: [{ unit: relentlessEndurance }],
          characterUnitRefs: [
            {
              unitId: "orc_relentless_endurance",
              supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
            },
          ],
        }),
      ],
    });
    const subject = magicSubject("ice_knife");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, primaryTargetId);
    const attack = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetChoice] }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attack, { total: 20, naturalD20: 12 });
    const attackDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
      "rolledDice",
    );
    const attackDamageRoll = damageRollFillWithGroups(attackDamage, [[4]]);
    const disposition = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll, attackDamageRoll],
      }),
      "attackDamageDisposition",
    );
    expect(disposition).toMatchObject({
      label: "Ice Knife attack damage disposition",
      targetId: primaryTargetId,
      choices: expect.arrayContaining([
        {
          kind: "zeroHitPointReplacement",
          unitId: "orc_relentless_endurance",
        },
      ]),
    });

    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          attackDamageRoll,
          attackDamageDispositionFill(disposition, {
            kind: "zeroHitPointReplacement",
            unitId: "orc_relentless_endurance",
          }),
        ],
      }),
      "savingThrowOutcome",
    );
    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          attackDamageRoll,
          attackDamageDispositionFill(disposition, {
            kind: "zeroHitPointReplacement",
            unitId: "orc_relentless_endurance",
          }),
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: primaryTargetId,
                affectedTargetIds: [primaryTargetId],
              },
              outcomes: [{ targetId: primaryTargetId, succeeded: true }],
            },
          },
        ],
      }),
    );

    expect(result).toMatchObject({
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: primaryTargetId,
            hp: 1,
            conditions: expect.not.arrayContaining(["unconscious"]),
          }),
        ]),
      },
    });
  });

  test("Ice Knife burst damage requests a separate zero-HP replacement disposition for the primary target", () => {
    const primaryTargetId = combatantId("ice-knife-burst-relentless-primary");
    const relentlessEndurance = unitLibrary.requireUnit(
      "orc_relentless_endurance",
    );
    const state = startBattleRight({
      battleId: battleId("battle-ice-knife-burst-relentless"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("ice_knife")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: primaryTargetId,
          displayName: "Relentless Primary",
          initiative: 10,
          side: oppositionSide,
          currentHp: 5,
          maxHp: 12,
          resources: [{ unit: relentlessEndurance }],
          characterUnitRefs: [
            {
              unitId: "orc_relentless_endurance",
              supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
            },
          ],
        }),
      ],
    });
    const subject = magicSubject("ice_knife");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, primaryTargetId);
    const attack = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetChoice] }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attack, { total: 20, naturalD20: 12 });
    const attackDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
      "rolledDice",
    );
    const attackDamageRoll = damageRollFillWithGroups(attackDamage, [[4]]);
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll, attackDamageRoll],
      }),
      "savingThrowOutcome",
    );
    const saveFill: Extract<
      BattleFill,
      { readonly kind: "savingThrowOutcome" }
    > = {
      kind: "savingThrowOutcome",
      holeId: savingThrows.holeId,
      value: {
        area: {
          originAnchorId: primaryTargetId,
          affectedTargetIds: [primaryTargetId],
        },
        outcomes: [{ targetId: primaryTargetId, succeeded: false }],
      },
    };
    const burstDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll, attackDamageRoll, saveFill],
      }),
      "rolledDice",
    );
    const burstDamageRoll = damageRollFillWithGroups(burstDamage, [[1, 1]]);
    const disposition = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          attackDamageRoll,
          saveFill,
          burstDamageRoll,
        ],
      }),
      "attackDamageDisposition",
    );
    expect(disposition).toMatchObject({
      label: "Ice Knife burst damage disposition",
      targetId: primaryTargetId,
      choices: expect.arrayContaining([
        {
          kind: "zeroHitPointReplacement",
          unitId: "orc_relentless_endurance",
        },
      ]),
    });
    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          attackDamageRoll,
          saveFill,
          burstDamageRoll,
          attackDamageDispositionFill(disposition, {
            kind: "zeroHitPointReplacement",
            unitId: "orc_relentless_endurance",
          }),
        ],
      }),
    );

    expect(result).toMatchObject({
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: primaryTargetId,
            hp: 1,
            conditions: expect.not.arrayContaining(["unconscious"]),
          }),
        ]),
      },
    });
  });

  test("Ice Knife miss still requires a primary-target-anchored burst save", () => {
    const state = startBattleRight({
      battleId: battleId("battle-ice-knife-miss"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("ice_knife")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("ice_knife");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, skeletonId);
    const attack = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetChoice] }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attack, { total: 1, naturalD20: 1 });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
      "savingThrowOutcome",
    );
    const invalidAttackDamage = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetChoice,
        attackRoll,
        {
          kind: "rolledDice",
          holeId: savingThrows.holeId,
          value: rolledDiceGroups([[1]]),
        },
      ],
    });
    expect(invalidAttackDamage).toMatchObject({
      tag: "invalid",
      message: "Ice Knife damage must use an Ice Knife damage hole.",
    });
    const missingPrimary = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetChoice,
        attackRoll,
        {
          kind: "savingThrowOutcome",
          holeId: savingThrows.holeId,
          value: {
            area: {
              originAnchorId: skeletonId,
              affectedTargetIds: [],
            },
            outcomes: [],
          },
        },
      ],
    });
    expect(missingPrimary).toMatchObject({
      tag: "invalid",
      message: "Ice Knife burst area must include the primary target.",
    });
  });

  test("Ice Knife burst damage requests Concentration follow-up for damaged burst targets", () => {
    const baseState = startBattleRight({
      battleId: battleId("battle-ice-knife-concentration"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("ice_knife")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
        characterSeed({
          combatantId: secondWizardId,
          displayName: "Concentrating Target",
          initiative: 8,
          side: oppositionSide,
          currentHp: 20,
          maxHp: 20,
        }),
      ],
    });
    const concentrating = baseState.combatants.get(secondWizardId);
    if (concentrating === undefined) {
      throw new Error("Expected concentrating target.");
    }
    const state = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(secondWizardId, {
        ...concentrating,
        concentration: {
          sourceSpellId: "mage_armor",
          effectKind: "spellEffect" as const,
        },
      }),
    };
    const subject = magicSubject("ice_knife");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, skeletonId);
    const attack = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetChoice] }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(attack, { total: 1, naturalD20: 1 });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll],
      }),
      "savingThrowOutcome",
    );
    const saveFill: Extract<
      BattleFill,
      { readonly kind: "savingThrowOutcome" }
    > = {
      kind: "savingThrowOutcome",
      holeId: savingThrows.holeId,
      value: {
        area: {
          originAnchorId: skeletonId,
          affectedTargetIds: [skeletonId, secondWizardId],
        },
        outcomes: [
          { targetId: skeletonId, succeeded: true },
          { targetId: secondWizardId, succeeded: false },
        ],
      },
    };
    const burstDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackRoll, saveFill],
      }),
      "rolledDice",
    );
    const needsConcentration = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetChoice,
        attackRoll,
        saveFill,
        damageRollFillWithGroups(burstDamage, [[3, 3]]),
      ],
    });
    const concentration = requireHole(
      needsConcentration,
      "concentrationSavingThrow",
    );
    expect(concentration).toMatchObject({
      combatantId: secondWizardId,
      dc: 10,
      damageAmount: 6,
    });
    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackRoll,
          saveFill,
          damageRollFillWithGroups(burstDamage, [[3, 3]]),
          concentrationSavingThrowFill(concentration, false),
        ],
      }),
    );
    expect(result).toMatchObject({
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 13 },
          { combatantId: secondWizardId, hp: 14, concentrating: false },
        ],
      },
    });
  });

  test("Color Spray applies spell-owned Blinded to failed self-origin Cone saves", () => {
    const state = startBattleRight({
      battleId: battleId("battle-color-spray"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("color_spray")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({
          combatantId: secondSkeletonId,
          displayName: "Second Skeleton",
          initiative: 8,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
        }),
      ],
    });
    const subject = magicSubject("color_spray");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Color Spray self-origin Cone Saving Throw outcomes",
      ability: "con",
      spell: {
        targeting: { kind: "selfOriginCone", lengthFeet: 15 },
        effect: { condition: "blinded", expiresAt: "endOfCasterNextTurn" },
        rangeFeet: 0,
      },
    });

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: false },
            { targetId: secondSkeletonId, succeeded: true },
          ]),
        ],
      }),
    );

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          {
            combatantId: skeletonId,
            hp: 13,
            conditions: expect.arrayContaining(["blinded"]),
          },
          {
            combatantId: secondSkeletonId,
            hp: 13,
            conditions: expect.not.arrayContaining(["blinded"]),
          },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(
      result.state.combatants.get(skeletonId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellCondition",
        sourceSpellId: "color_spray",
        sourceCombatantId: wizardId,
        condition: "blinded",
        expiresAt: { kind: "endOfTurn", combatantId: wizardId, round: 2 },
      }),
    );
    expect(expendedLevelOneSlots(result, wizardId)).toBe(1);
  });

  test("Color Spray expiration does not erase unrelated Blinded sources", () => {
    const state = startBattleRight({
      battleId: battleId("battle-color-spray-source-preservation"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("color_spray")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: skeletonId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
          conditions: ["blinded"],
        }),
      ],
    });
    const subject = magicSubject("color_spray");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    const sprayed = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
    );

    const skeletonTurn = requireResolved(
      endTurn({ state: sprayed.state, actorId: wizardId }),
    ).state;
    const nextWizardTurn = requireResolved(
      endTurn({ state: skeletonTurn, actorId: skeletonId }),
    ).state;
    const expired = requireResolved(
      endTurn({ state: nextWizardTurn, actorId: wizardId }),
    );

    expect(expired.state.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.objectContaining({ blinded: true }),
      activeEffects: [],
    });
  });

  test("Entangle applies concentration-owned Restrained to failed point-origin Cube saves", () => {
    const state = startBattleRight({
      battleId: battleId("battle-entangle"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Druid",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("entangle")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({
          combatantId: secondSkeletonId,
          displayName: "Second Skeleton",
          initiative: 8,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
        }),
      ],
    });
    const subject = magicSubject("entangle");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Entangle point-origin Cube Saving Throw outcomes",
      ability: "str",
      spell: {
        targeting: { kind: "pointOriginCubeExcludingCaster", sideFeet: 20 },
        effect: { condition: "restrained", expiresAt: "concentration" },
        rangeFeet: 90,
      },
    });

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: false },
            { targetId: secondSkeletonId, succeeded: true },
          ]),
        ],
      }),
    );

    expect(result).toMatchObject({
      snapshot: {
        combatants: [
          { combatantId: wizardId, concentrating: true },
          {
            combatantId: skeletonId,
            conditions: expect.arrayContaining(["restrained"]),
          },
          {
            combatantId: secondSkeletonId,
            conditions: expect.not.arrayContaining(["restrained"]),
          },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(
      result.state.combatants.get(skeletonId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellCondition",
        sourceSpellId: "entangle",
        sourceCombatantId: wizardId,
        condition: "restrained",
        expiresAt: { kind: "concentration", combatantId: wizardId },
      }),
    );
    expect(expendedLevelOneSlots(result, wizardId)).toBe(1);

    const casterIncluded = resolveBattleSubject({
      state,
      subject,
      fills: [
        {
          kind: "savingThrowOutcome",
          holeId: savingThrows.holeId,
          value: {
            area: {
              originAnchorId: wizardId,
              affectedTargetIds: [wizardId, skeletonId],
            },
            outcomes: [
              { targetId: wizardId, succeeded: false },
              { targetId: skeletonId, succeeded: false },
            ],
          },
        },
      ],
    });
    expect(casterIncluded).toMatchObject({
      tag: "invalid",
      message: "Entangle area affected targets must exclude the caster.",
    });
  });

  test("Entangle Restrained ends on Concentration break or Strength Athletics escape", () => {
    const state = startBattleRight({
      battleId: battleId("battle-entangle-cleanup"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Druid",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("entangle")],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("entangle"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const entangled = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("entangle"),
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
    ).state;

    const broken = breakBattleConcentration(entangled, wizardId);
    expect(broken.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.not.objectContaining({ restrained: true }),
      activeEffects: [],
    });

    const skeletonTurn = requireResolved(
      endTurn({ state: entangled, actorId: wizardId }),
    ).state;
    const escapeAct = discoverBattleActs(skeletonTurn).find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "escapeSpellRestraint",
    );
    expect(escapeAct).toMatchObject({
      label: "Escape entangle",
      initialHoles: [
        expect.objectContaining({
          kind: "abilityCheck",
          ability: "str",
          skill: "athletics",
          dc: 13,
        }),
      ],
    });
    if (
      escapeAct?.subject.tag !== "action" ||
      escapeAct.subject.action !== "escapeSpellRestraint"
    ) {
      throw new Error("Expected Entangle escape action.");
    }
    const failed = requireResolved(
      resolveBattleSubject({
        state: skeletonTurn,
        subject: escapeAct.subject,
        fills: [abilityCheckFill(escapeAct.initialHoles[0]!, 12)],
      }),
    );
    expect(failed.state.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.objectContaining({ restrained: true }),
    });

    const escaped = requireResolved(
      resolveBattleSubject({
        state: skeletonTurn,
        subject: escapeAct.subject,
        fills: [abilityCheckFill(escapeAct.initialHoles[0]!, 13)],
      }),
    );
    expect(escaped.state.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.not.objectContaining({ restrained: true }),
      activeEffects: [],
    });
    expect(escaped.state.combatants.get(wizardId)?.concentration).toEqual({
      sourceSpellId: "entangle",
      effectKind: "spellEffect",
    });
  });

  test("Entangle escape actions identify the restraining caster", () => {
    const secondDruidEntangle: BattleSubject = {
      tag: "actionSpell",
      actorId: secondWizardId,
      invocation: spellSlotInvocationRef("entangle", 1, "saveGatedCondition"),
      mode: { tag: "cast" },
    };
    const state = startBattleRight({
      battleId: battleId("battle-entangle-two-casters"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Druid",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("entangle")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: secondWizardId,
          displayName: "Second Druid",
          initiative: 15,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("entangle")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const firstSavingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("entangle"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const firstEntangled = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("entangle"),
        fills: [
          savingThrowOutcomeFill(firstSavingThrows, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const secondDruidTurn = requireResolved(
      endTurn({ state: firstEntangled, actorId: wizardId }),
    ).state;
    const secondSavingThrows = requireHole(
      resolveBattleSubject({
        state: secondDruidTurn,
        subject: secondDruidEntangle,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const twiceEntangled = requireResolved(
      resolveBattleSubject({
        state: secondDruidTurn,
        subject: secondDruidEntangle,
        fills: [
          savingThrowOutcomeFill(secondSavingThrows, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const skeletonTurn = requireResolved(
      endTurn({ state: twiceEntangled, actorId: secondWizardId }),
    ).state;
    const escapeActs = discoverBattleActs(skeletonTurn).filter(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "escapeSpellRestraint",
    );

    expect(escapeActs.map((act) => act.subject)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceCombatantId: wizardId }),
        expect.objectContaining({ sourceCombatantId: secondWizardId }),
      ]),
    );
    const secondDruidEscape = escapeActs.find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "escapeSpellRestraint" &&
        act.subject.sourceCombatantId === secondWizardId,
    );
    if (
      secondDruidEscape?.subject.tag !== "action" ||
      secondDruidEscape.subject.action !== "escapeSpellRestraint"
    ) {
      throw new Error("Expected second Druid Entangle escape action.");
    }

    const escapedSecondDruidRestraint = requireResolved(
      resolveBattleSubject({
        state: skeletonTurn,
        subject: secondDruidEscape.subject,
        fills: [abilityCheckFill(secondDruidEscape.initialHoles[0]!, 13)],
      }),
    ).state;

    expect(
      escapedSecondDruidRestraint.combatants
        .get(skeletonId)
        ?.activeEffects.map((effect) =>
          effect.kind === "spellCondition" ? effect.sourceCombatantId : null,
        ),
    ).toEqual([wizardId]);
    expect(
      escapedSecondDruidRestraint.combatants.get(skeletonId),
    ).toMatchObject({
      conditions: expect.objectContaining({ restrained: true }),
    });
  });

  test("Entangle recast preserves the newly applied same-spell restraint", () => {
    const state = startBattleRight({
      battleId: battleId("battle-entangle-recast"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Druid",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("entangle")],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const firstSavingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("entangle"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const firstEntangled = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("entangle"),
        fills: [
          savingThrowOutcomeFill(firstSavingThrows, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const nextDruidTurn = requireResolved(
      endTurn({
        state: requireResolved(
          endTurn({ state: firstEntangled, actorId: wizardId }),
        ).state,
        actorId: skeletonId,
      }),
    ).state;
    const secondSavingThrows = requireHole(
      resolveBattleSubject({
        state: nextDruidTurn,
        subject: magicSubject("entangle"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const recast = requireResolved(
      resolveBattleSubject({
        state: nextDruidTurn,
        subject: magicSubject("entangle"),
        fills: [
          savingThrowOutcomeFill(secondSavingThrows, [
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
    );

    expect(recast.state.combatants.get(skeletonId)).toMatchObject({
      conditions: expect.objectContaining({ restrained: true }),
    });
    expect(
      recast.state.combatants
        .get(skeletonId)
        ?.activeEffects.filter(
          (effect) =>
            effect.kind === "spellCondition" &&
            effect.sourceSpellId === "entangle" &&
            effect.sourceCombatantId === wizardId,
        ),
    ).toHaveLength(1);
    expect(expendedLevelOneSlots(recast, wizardId)).toBe(2);
  });

  test("Sleep failed initial saves apply pending Incapacitated and spend cast resources", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sleep-admission"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
        skeletonCreatureInit({ initiative: 8 }),
      ],
    });
    const subject = magicSubject("sleep");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    expect(savingThrows).toMatchObject({
      label: "Sleep point-origin Sphere Saving Throw outcomes",
      ability: "wis",
      spell: {
        procedure: "sleepTargetAdmission",
        targeting: { kind: "pointOriginSphere", radiusFeet: 5 },
        rangeFeet: 60,
      },
    });

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: wizardId,
                affectedTargetIds: [goblinId, skeletonId],
              },
              outcomes: [{ targetId: goblinId, succeeded: false }],
            },
          },
        ],
      }),
    );

    expect(result).toMatchObject({
      snapshot: {
        combatants: [
          { combatantId: wizardId, concentrating: true },
          { combatantId: goblinId },
          { combatantId: skeletonId },
        ],
        turn: { actionResources: [] },
      },
    });
    expect(result.state.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({ directIncapacitated: true }),
      activeEffects: [
        expect.objectContaining({
          kind: "sleepPendingRepeatSave",
          sourceSpellId: "sleep",
          sourceCombatantId: wizardId,
          save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
          repeatAt: { kind: "endOfTurn", combatantId: goblinId, round: 1 },
          expiresAt: { kind: "concentration", combatantId: wizardId },
        }),
      ],
    });
    expect(expendedLevelOneSlots(result, wizardId)).toBe(1);
  });

  test("Sleep failed initial save breaks affected target Concentration", () => {
    const base = startBattleRight({
      battleId: battleId("battle-sleep-admission-breaks-target-concentration"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
        }),
      ],
    });
    const goblin = base.combatants.get(goblinId)!;
    const state = {
      ...base,
      combatants: new Map(base.combatants).set(goblinId, {
        ...goblin,
        concentration: {
          sourceSpellId: "mage_armor",
          effectKind: "spellEffect",
        },
        activeEffects: [
          {
            kind: "spellBaseArmorClass",
            sourceSpellId: "mage_armor",
            sourceCombatantId: goblinId,
            base: 13,
            ability: "dex",
            expiresAt: {
              kind: "concentration",
              combatantId: goblinId,
              durationTicks: requireElapsedHours(8),
            },
            earlyEnds: [{ kind: "concentrationBroken" }],
          },
        ],
      }),
    } satisfies BattleState;
    const subject = magicSubject("sleep");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    );

    expect(result.state.combatants.get(goblinId)).toMatchObject({
      concentration: null,
      conditions: expect.objectContaining({ directIncapacitated: true }),
      activeEffects: [
        expect.objectContaining({
          kind: "sleepPendingRepeatSave",
          sourceSpellId: "sleep",
          sourceCombatantId: wizardId,
        }),
      ],
    });
  });

  test("Sleep self-target failed initial save immediately ends its own Concentration", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sleep-self-target-breaks-concentration"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Observer",
          initiative: 10,
          side: oppositionSide,
        }),
      ],
    });
    const subject = magicSubject("sleep");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );

    const result = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: wizardId,
                affectedTargetIds: [wizardId],
              },
              outcomes: [{ targetId: wizardId, succeeded: false }],
            },
          },
        ],
      }),
    );

    expect(result.state.combatants.get(wizardId)).toMatchObject({
      concentration: null,
      conditions: expect.not.objectContaining({ directIncapacitated: true }),
      activeEffects: [],
    });
    expect(expendedLevelOneSlots(result, wizardId)).toBe(1);
  });

  test("Sleep concentration break removes pending repeat saves before they can escalate", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sleep-repeat-concentration-break"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
        }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;

    const broken = breakBattleConcentration(slept, wizardId);

    expect(broken.combatants.get(goblinId)).toMatchObject({
      conditions: expect.not.objectContaining({ directIncapacitated: true }),
      activeEffects: [],
    });
    const goblinTurn = requireResolved(
      endTurn({ state: broken, actorId: wizardId }),
    ).state;
    expect(endTurn({ state: goblinTurn, actorId: goblinId })).toMatchObject({
      tag: "resolved",
      state: {
        combatants: expect.any(Map),
      },
    });
  });

  test("Sleep repeat save is requested at the failed target's next end turn and success ends that target's effect", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sleep-repeat-success"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
        }),
        skeletonCreatureInit({ initiative: 8 }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;

    const goblinTurn = requireResolved(
      endTurn({ state: slept, actorId: wizardId }),
    ).state;
    expect(goblinTurn.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({ directIncapacitated: true }),
    });
    const repeatSave = requireHole(
      endTurn({ state: goblinTurn, actorId: goblinId }),
      "savingThrowOutcome",
    );
    expect(repeatSave).toMatchObject({
      label: "sleep repeat WIS save",
      ability: "wis",
      sleepRepeatSave: {
        targetId: goblinId,
        sourceSpellId: "sleep",
        sourceCombatantId: wizardId,
        save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
      },
    });

    const repeated = requireResolved(
      endTurn({
        state: goblinTurn,
        actorId: goblinId,
        fills: [
          savingThrowOutcomeFill(repeatSave, [
            { targetId: goblinId, succeeded: true },
          ]),
        ],
      }),
    );

    expect(repeated.state.combatants.get(goblinId)).toMatchObject({
      conditions: expect.not.objectContaining({ directIncapacitated: true }),
      activeEffects: [],
    });
  });

  test("Sleep failed repeat save escalates pending Incapacitated to spell-owned Unconscious", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sleep-repeat-failure"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
        }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: slept, actorId: wizardId }),
    ).state;
    const repeatSave = requireHole(
      endTurn({ state: goblinTurn, actorId: goblinId }),
      "savingThrowOutcome",
    );

    const repeated = requireResolved(
      endTurn({
        state: goblinTurn,
        actorId: goblinId,
        fills: [
          savingThrowOutcomeFill(repeatSave, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    );

    expect(repeated.state.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({
        unconscious: true,
        prone: true,
        directIncapacitated: false,
      }),
      activeEffects: [
        expect.objectContaining({
          kind: "sleepUnconscious",
          sourceSpellId: "sleep",
          sourceCombatantId: wizardId,
          expiresAt: { kind: "concentration", combatantId: wizardId },
        }),
      ],
    });
  });

  test("Sleep concentration break removes escalated Unconscious effects", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sleep-unconscious-concentration-break"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
        }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: slept, actorId: wizardId }),
    ).state;
    const repeatSave = requireHole(
      endTurn({ state: goblinTurn, actorId: goblinId }),
      "savingThrowOutcome",
    );
    const repeated = requireResolved(
      endTurn({
        state: goblinTurn,
        actorId: goblinId,
        fills: [
          savingThrowOutcomeFill(repeatSave, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;

    const broken = breakBattleConcentration(repeated, wizardId);

    expect(broken.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({
        unconscious: false,
        prone: true,
      }),
      activeEffects: [],
    });
  });

  test("Sleep failed repeat save breaks affected target Concentration", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sleep-repeat-failure-breaks-concentration"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
        }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const goblinTurnBase = requireResolved(
      endTurn({ state: slept, actorId: wizardId }),
    ).state;
    const goblin = goblinTurnBase.combatants.get(goblinId)!;
    const goblinTurn = {
      ...goblinTurnBase,
      combatants: new Map(goblinTurnBase.combatants).set(goblinId, {
        ...goblin,
        concentration: {
          sourceSpellId: "mage_armor",
          effectKind: "spellEffect",
        },
        activeEffects: [
          ...goblin.activeEffects,
          {
            kind: "spellBaseArmorClass",
            sourceSpellId: "mage_armor",
            sourceCombatantId: goblinId,
            base: 13,
            ability: "dex",
            expiresAt: {
              kind: "concentration",
              combatantId: goblinId,
              durationTicks: requireElapsedHours(8),
            },
            earlyEnds: [{ kind: "concentrationBroken" }],
          },
        ],
      }),
    } satisfies BattleState;
    const repeatSave = requireHole(
      endTurn({ state: goblinTurn, actorId: goblinId }),
      "savingThrowOutcome",
    );

    const repeated = requireResolved(
      endTurn({
        state: goblinTurn,
        actorId: goblinId,
        fills: [
          savingThrowOutcomeFill(repeatSave, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    );

    expect(repeated.state.combatants.get(goblinId)).toMatchObject({
      concentration: null,
      conditions: expect.objectContaining({ unconscious: true }),
      activeEffects: [
        expect.objectContaining({
          kind: "sleepUnconscious",
          sourceSpellId: "sleep",
          sourceCombatantId: wizardId,
        }),
      ],
    });
  });

  test("Sleep pending effect ends when the target takes damage from a non-caster", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sleep-pending-damage-cleanup"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        statBlockCreatureInit({ initiative: 15 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Target",
          initiative: 10,
          side: partySide,
          currentHp: 20,
          maxHp: 20,
        }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: fighterId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: slept, actorId: wizardId }),
    ).state;
    const subject = goblinAttackSubject("Scimitar");
    const target = requireHole(
      resolveBattleSubject({ state: goblinTurn, subject, fills: [] }),
      "targetChoice",
    );
    const attack = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [attackTargetFill(target, goblinId, fighterId, "Scimitar")],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [
          attackTargetFill(target, goblinId, fighterId, "Scimitar"),
          attackRollFill(attack, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const damaged = requireResolved(
      resolveBattleSubject({
        state: goblinTurn,
        subject,
        fills: [
          attackTargetFill(target, goblinId, fighterId, "Scimitar"),
          attackRollFill(attack, { total: 15, naturalD20: 10 }),
          damageRollFill(damage, 1),
        ],
      }),
    ).state;

    expect(damaged.combatants.get(fighterId)).toMatchObject({
      conditions: expect.objectContaining({ directIncapacitated: false }),
      activeEffects: [],
    });
  });

  test("Sleep Unconscious ends on damage and leaves Prone", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sleep-unconscious-damage-cleanup"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 15,
          side: oppositionSide,
          currentHp: 20,
          maxHp: 20,
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Helper",
          initiative: 10,
        }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: slept, actorId: wizardId }),
    ).state;
    const repeatSave = requireHole(
      endTurn({ state: goblinTurn, actorId: goblinId }),
      "savingThrowOutcome",
    );
    const fighterTurn = requireResolved(
      endTurn({
        state: goblinTurn,
        actorId: goblinId,
        fills: [
          savingThrowOutcomeFill(repeatSave, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const subject = fighterAttackSubject();
    const target = requireHole(
      resolveBattleSubject({ state: fighterTurn, subject, fills: [] }),
      "targetChoice",
    );
    const attack = requireHole(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: [attackTargetFill(target, fighterId, goblinId)],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: [
          attackTargetFill(target, fighterId, goblinId),
          attackRollFill(attack, {
            total: 15,
            naturalD20: 10,
            rollMode: "advantage",
          }),
        ],
      }),
      "rolledDice",
    );

    const damaged = requireResolved(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: [
          attackTargetFill(target, fighterId, goblinId),
          attackRollFill(attack, {
            total: 15,
            naturalD20: 10,
            rollMode: "advantage",
          }),
          damageRollFill(damage, 1),
        ],
      }),
    ).state;

    expect(damaged.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({
        unconscious: false,
        prone: true,
      }),
      activeEffects: [],
    });
  });

  test("Sleep pending effect ends when the target takes spell damage", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sleep-spell-damage-cleanup"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Magic Missile Caster",
          initiative: 15,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("magic_missile")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
          currentHp: 20,
          maxHp: 20,
        }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const fighterTurn = requireResolved(
      endTurn({ state: slept, actorId: wizardId }),
    ).state;
    const subject: BattleSubject = {
      tag: "actionSpell",
      actorId: fighterId,
      invocation: spellSlotInvocationRef(
        "magic_missile",
        1,
        "repeatedDamageAllocation",
      ),
      mode: { tag: "cast" },
    };
    const targetAllocation = requireHole(
      resolveBattleSubject({ state: fighterTurn, subject, fills: [] }),
      "spellTargetAllocation",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: [
          spellTargetAllocationFill(
            targetAllocation,
            [{ targetId: goblinId, count: 3 }],
            fighterId,
          ),
        ],
      }),
      "rolledDice",
    );

    const damaged = requireResolved(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: [
          spellTargetAllocationFill(
            targetAllocation,
            [{ targetId: goblinId, count: 3 }],
            fighterId,
          ),
          damageRollFillWithGroups(damage, [[1, 1, 1]]),
        ],
      }),
    ).state;

    expect(damaged.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({ directIncapacitated: false }),
      activeEffects: [],
    });
  });

  test("Sleep damage cleanup ignores no-damage events and is idempotent", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sleep-damage-cleanup-idempotent"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
          currentHp: 20,
          maxHp: 20,
        }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const sleeping = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const sleepingTarget = sleeping.combatants.get(goblinId)!;

    const noDamage = applyBattleHitPointDamage({
      state: sleeping,
      target: sleepingTarget,
      damageAmount: 0,
      deathFailuresAtZeroHp: 1,
      damageSourceId: fighterId,
    });
    expect(noDamage.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({ directIncapacitated: true }),
      activeEffects: [
        expect.objectContaining({ kind: "sleepPendingRepeatSave" }),
      ],
    });

    const damaged = applyBattleHitPointDamage({
      state: sleeping,
      target: sleepingTarget,
      damageAmount: 1,
      deathFailuresAtZeroHp: 1,
      damageSourceId: fighterId,
    });
    const damagedAgain = applyBattleHitPointDamage({
      state: damaged,
      target: damaged.combatants.get(goblinId)!,
      damageAmount: 1,
      deathFailuresAtZeroHp: 1,
      damageSourceId: fighterId,
    });

    expect(damagedAgain.combatants.get(goblinId)).toMatchObject({
      hp: Hp(18),
      conditions: expect.objectContaining({ directIncapacitated: false }),
      activeEffects: [],
    });
  });

  test("Sleep damage cleanup preserves unrelated Incapacitated and Unconscious sources", () => {
    const incapacitatedState = startBattleRight({
      battleId: battleId("battle-sleep-damage-cleanup-preserves-incapacitated"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
          currentHp: 20,
          maxHp: 20,
          conditions: ["incapacitated"],
        }),
      ],
    });
    const incapacitatedSavingThrows = requireHole(
      resolveBattleSubject({
        state: incapacitatedState,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const sleptIncapacitated = requireResolved(
      resolveBattleSubject({
        state: incapacitatedState,
        subject: magicSubject("sleep"),
        fills: [
          savingThrowOutcomeFill(incapacitatedSavingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const incapacitatedTarget = sleptIncapacitated.combatants.get(goblinId)!;
    const afterIncapacitatedDamage = applyBattleHitPointDamage({
      state: sleptIncapacitated,
      target: incapacitatedTarget,
      damageAmount: 1,
      deathFailuresAtZeroHp: 1,
      damageSourceId: fighterId,
    });

    expect(afterIncapacitatedDamage.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({ directIncapacitated: true }),
      activeEffects: [],
    });

    const unconsciousState = startBattleRight({
      battleId: battleId("battle-sleep-damage-cleanup-preserves-unconscious"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
          currentHp: 20,
          maxHp: 20,
          conditions: ["unconscious"],
        }),
      ],
    });
    const unconsciousSavingThrows = requireHole(
      resolveBattleSubject({
        state: unconsciousState,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const sleptUnconscious = requireResolved(
      resolveBattleSubject({
        state: unconsciousState,
        subject: magicSubject("sleep"),
        fills: [
          savingThrowOutcomeFill(unconsciousSavingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: sleptUnconscious, actorId: wizardId }),
    ).state;
    const repeatSave = requireHole(
      endTurn({ state: goblinTurn, actorId: goblinId }),
      "savingThrowOutcome",
    );
    const repeated = requireResolved(
      endTurn({
        state: goblinTurn,
        actorId: goblinId,
        fills: [
          savingThrowOutcomeFill(repeatSave, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const unconsciousTarget = repeated.combatants.get(goblinId)!;
    const afterUnconsciousDamage = applyBattleHitPointDamage({
      state: repeated,
      target: unconsciousTarget,
      damageAmount: 1,
      deathFailuresAtZeroHp: 1,
      damageSourceId: fighterId,
    });

    expect(afterUnconsciousDamage.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({ unconscious: true }),
      activeEffects: [],
    });
  });

  test("Sleep shake-awake spends an action and requires an adjacent target fact", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sleep-shake-awake"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Helper",
          initiative: 15,
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
        }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const fighterTurn = requireResolved(
      endTurn({ state: slept, actorId: wizardId }),
    ).state;
    const subject: Extract<
      BattleSubject,
      { readonly tag: "action"; readonly action: "shakeAwakeFromSleep" }
    > = { tag: "action", actorId: fighterId, action: "shakeAwakeFromSleep" };
    const act = findAct(fighterTurn, subject);
    const target = act.initialHoles[0]!;

    expect(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: [targetFill(target, goblinId, [])],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Sleep shake-awake target must be within 5 feet of the actor by table-supplied fact.",
    });

    const shaken = requireResolved(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: [
          targetFill(target, goblinId, [
            {
              kind: "sleepShakeAwakeActorWithin5Feet",
              actorId: fighterId,
              targetId: goblinId,
            },
          ]),
        ],
      }),
    ).state;

    expect(shaken.currentTurnResources.actionResources).toHaveLength(0);
    expect(shaken.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({ directIncapacitated: false }),
      activeEffects: [],
    });
  });

  test("Sleep shake-awake preserves unrelated Incapacitated and Unconscious sources", () => {
    const shakenIncapacitated = shakeAwakeGoblinFromSleep(
      battleAfterFailedSleepInitialSave({
        battle: "battle-sleep-shake-awake-preserves-incapacitated",
        targetConditions: ["incapacitated"],
      }),
    );

    expect(shakenIncapacitated.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({ directIncapacitated: true }),
      activeEffects: [],
    });

    const shakenUnconscious = shakeAwakeGoblinFromSleep(
      battleAfterGoblinFailedSleepRepeatSave({
        battle: "battle-sleep-shake-awake-preserves-unconscious",
        helperInitiative: 5,
        targetConditions: ["unconscious"],
      }),
    );

    expect(shakenUnconscious.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({ unconscious: true }),
      activeEffects: [],
    });
  });

  test("Sleep shake-awake cannot be repeated after the target is awake", () => {
    const fighterTurn = battleAfterFailedSleepInitialSave({
      battle: "battle-sleep-shake-awake-repeat",
    });
    const subject = sleepShakeAwakeSubject();
    const target = findAct(fighterTurn, subject).initialHoles[0]!;
    const fill = sleepShakeAwakeTargetFill(target);

    const shaken = requireResolved(
      resolveBattleSubject({
        state: fighterTurn,
        subject,
        fills: [fill],
      }),
    ).state;

    expect(discoverBattleActs(shaken)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ subject })]),
    );
    expect(
      resolveBattleSubject({
        state: shaken,
        subject,
        fills: [fill],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Sleep shake-awake target must be within 5 feet of the actor by table-supplied fact.",
    });
  });

  test("Sleep repeat success preserves unrelated Incapacitated sources", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sleep-repeat-preserve-incapacitated"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
          conditions: ["incapacitated"],
        }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: slept, actorId: wizardId }),
    ).state;
    const repeatSave = requireHole(
      endTurn({ state: goblinTurn, actorId: goblinId }),
      "savingThrowOutcome",
    );

    const repeated = requireResolved(
      endTurn({
        state: goblinTurn,
        actorId: goblinId,
        fills: [
          savingThrowOutcomeFill(repeatSave, [
            { targetId: goblinId, succeeded: true },
          ]),
        ],
      }),
    );

    expect(repeated.state.combatants.get(goblinId)).toMatchObject({
      conditions: expect.objectContaining({ directIncapacitated: true }),
      activeEffects: [],
    });
  });

  test("Sleep repeat success removes direct Sleep Incapacitated while preserving stronger conditions", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sleep-repeat-preserve-paralyzed"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
          conditions: ["paralyzed"],
        }),
      ],
    });
    const savingThrows = requireHole(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const slept = requireResolved(
      resolveBattleSubject({
        state,
        subject: magicSubject("sleep"),
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const goblinTurn = requireResolved(
      endTurn({ state: slept, actorId: wizardId }),
    ).state;
    const repeatSave = requireHole(
      endTurn({ state: goblinTurn, actorId: goblinId }),
      "savingThrowOutcome",
    );

    const repeated = requireResolved(
      endTurn({
        state: goblinTurn,
        actorId: goblinId,
        fills: [
          savingThrowOutcomeFill(repeatSave, [
            { targetId: goblinId, succeeded: true },
          ]),
        ],
      }),
    );

    const target = repeated.state.combatants.get(goblinId)!;
    expect(target).toMatchObject({
      conditions: expect.objectContaining({
        paralyzed: true,
        directIncapacitated: false,
      }),
      activeEffects: [],
    });
    expect(removeCondition(target.conditions, "paralyzed")).toMatchObject({
      directIncapacitated: false,
      paralyzed: false,
    });
  });

  test("Sleep rejects rolled outcomes for automatic-success targets", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sleep-auto-success"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("sleep");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: wizardId,
                affectedTargetIds: [skeletonId],
              },
              outcomes: [{ targetId: skeletonId, succeeded: true }],
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Sleep targets that do not sleep or have Exhaustion Immunity automatically succeed and must not receive a rolled Saving Throw outcome.",
    });
  });

  test("Sleep non-sleeper facts automatically succeed without a save outcome", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sleep-non-sleeper-auto-success"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
        }),
      ],
    });
    const subject = magicSubject("sleep");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: wizardId,
                affectedTargetIds: [goblinId],
                sleepNonSleeperFacts: [
                  { kind: "doesNotSleep", targetId: goblinId },
                ],
              },
              outcomes: [{ targetId: goblinId, succeeded: true }],
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Sleep targets that do not sleep or have Exhaustion Immunity automatically succeed and must not receive a rolled Saving Throw outcome.",
    });

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: wizardId,
                affectedTargetIds: [goblinId],
                sleepNonSleeperFacts: [
                  { kind: "doesNotSleep", targetId: goblinId },
                ],
              },
              outcomes: [],
            },
          },
        ],
      }),
    );

    const target = resolved.state.combatants.get(goblinId)!;
    expect(target.conditions.directIncapacitated).toBe(false);
    expect(target.activeEffects).toEqual([]);
    expect(
      resolved.state.currentTurnResources.actionResources.some(
        (resource) => resource.source === "turn",
      ),
    ).toBe(false);
    expect(resolved.state.currentTurnResources.spellSlotExpendedThisTurn).toBe(
      true,
    );
  });

  test("Sleep rejects duplicate or unselected non-sleeper facts", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sleep-non-sleeper-validation"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Target",
          initiative: 10,
          side: oppositionSide,
        }),
      ],
    });
    const subject = magicSubject("sleep");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: wizardId,
                affectedTargetIds: [goblinId],
                sleepNonSleeperFacts: [
                  { kind: "doesNotSleep", targetId: fighterId },
                ],
              },
              outcomes: [{ targetId: goblinId, succeeded: true }],
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Sleep non-sleeper facts must match selected Sphere targets.",
    });

    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            kind: "savingThrowOutcome",
            holeId: savingThrows.holeId,
            value: {
              area: {
                originAnchorId: wizardId,
                affectedTargetIds: [goblinId],
                sleepNonSleeperFacts: [
                  { kind: "doesNotSleep", targetId: goblinId },
                  { kind: "doesNotSleep", targetId: goblinId },
                ],
              },
              outcomes: [],
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Sleep non-sleeper facts must not duplicate targets.",
    });
  });

  test("Sleep cannot be readied through direct reducer input", () => {
    const state = startBattleRight({
      battleId: battleId("battle-sleep-ready-rejected"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("sleep")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    expect(
      resolveBattleSubject({
        state,
        subject: {
          tag: "actionSpell",
          actorId: wizardId,
          invocation: spellSlotInvocationRef(
            "sleep",
            1,
            "sleepTargetAdmission",
          ),
          mode: { tag: "ready", trigger: "spellCast" },
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedSubject",
      message: "This spell procedure cannot be readied by this runtime lane.",
    });
    expect(state.readiedSpells.has(wizardId)).toBe(false);
  });

  test("save-damage replacement riders reduce failed half-damage saves", () => {
    const state = wizardVsRogueBattle({ evasion: true });
    const subject = magicSubject("dex_half_cantrip");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: fighterId, succeeded: false },
          ]),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: fighterId, succeeded: false },
        ]),
        damageRollFill(damage, 6),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: fighterId, hp: 9 },
        ],
      },
    });
  });

  test("save-damage replacement riders replace successful half-damage saves with no damage", () => {
    const state = wizardVsRogueBattle({ evasion: true });
    const subject = magicSubject("dex_half_cantrip");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: fighterId, succeeded: true },
        ]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: fighterId, hp: 12 },
        ],
      },
    });
  });

  test("half-damage save gates still damage targets without replacement riders", () => {
    const state = wizardVsRogueBattle({ evasion: false });
    const subject = magicSubject("dex_half_cantrip");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: fighterId, succeeded: true },
          ]),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: fighterId, succeeded: true },
        ]),
        damageRollFill(damage, 6),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: fighterId, hp: 9 },
        ],
      },
    });
  });

  test("save-damage replacement riders require admitted Unit support", () => {
    const state = wizardVsRogueBattle({
      evasion: true,
      saveDamageReplacementSupport: false,
    });
    const subject = magicSubject("dex_half_cantrip");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: fighterId, succeeded: true },
          ]),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: fighterId, succeeded: true },
        ]),
        damageRollFill(damage, 6),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: fighterId, hp: 9 },
        ],
      },
    });
  });

  test("save-damage replacement riders ignore non-Dexterity save mechanics", () => {
    const state = wizardVsRogueBattle({
      evasion: true,
      evasionAbility: "con",
    });
    const subject = magicSubject("dex_half_cantrip");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: fighterId, succeeded: true },
          ]),
        ],
      }),
      "rolledDice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: fighterId, succeeded: true },
        ]),
        damageRollFill(damage, 6),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: fighterId, hp: 9 },
        ],
      },
    });
  });

  test("Acid Splash damage requests and consumes Concentration saves", () => {
    const baseState = wizardVsSkeletonBattle();
    const skeleton = baseState.combatants.get(skeletonId);
    if (skeleton === undefined) {
      throw new Error("Expected Skeleton in battle.");
    }
    const state = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(skeletonId, {
        ...skeleton,
        concentration: {
          sourceSpellId: "mage_armor",
          effectKind: "spellEffect" as const,
        },
      }),
    };
    const subject = magicSubject("acid_splash");
    const savingThrows = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: wizardId, succeeded: true },
            { targetId: skeletonId, succeeded: false },
          ]),
        ],
      }),
      "rolledDice",
    );
    const needsConcentration = resolveBattleSubject({
      state,
      subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: wizardId, succeeded: true },
          { targetId: skeletonId, succeeded: false },
        ]),
        damageRollFill(damage, 4),
      ],
    });
    const concentration = requireHole(
      needsConcentration,
      "concentrationSavingThrow",
    );

    expect(concentration).toMatchObject({
      combatantId: skeletonId,
      dc: 10,
      damageAmount: 4,
    });
    expect(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          savingThrowOutcomeFill(savingThrows, [
            { targetId: wizardId, succeeded: true },
            { targetId: skeletonId, succeeded: false },
          ]),
          damageRollFill(damage, 4),
          concentrationSavingThrowFill(concentration, false),
        ],
      }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          { combatantId: wizardId },
          { combatantId: skeletonId, hp: 9, concentrating: false },
        ],
      },
    });
  });

  test("Hunter's Mark adds Force damage to attack-roll hits against the mark and transfers after the mark drops", () => {
    const state = startBattleRight({
      battleId: battleId("battle-hunters-mark"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [
            { className: "barbarian", level: 1 },
            { className: "fighter", level: 1 },
          ],
          resources: [rageResource()],
          spellcasting: {
            ...wizardSpellcasting({
              preparedSpells: [
                spellRecord("hunters_mark"),
                spellRecord("magic_missile"),
              ],
            }),
            sourceClassName: "fighter",
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
        skeletonCreatureInit({ initiative: 5 }),
      ],
    });
    const markAct = discoverBattleActs(state).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === "hunters_mark",
    );
    if (markAct === undefined) {
      throw new Error("Expected Hunter's Mark Bonus Action spell act.");
    }
    const markTarget = findHole(markAct.initialHoles, "targetChoice");
    const marked = requireResolved(
      resolveBattleSubject({
        state,
        subject: markAct.subject,
        fills: [
          targetFill(markTarget, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "hunters_mark",
            },
          ]),
        ],
      }),
    );

    expect(marked.state.combatants.get(fighterId)?.concentration).toEqual({
      sourceSpellId: "hunters_mark",
      effectKind: "spellEffect",
    });
    expect(marked.state.combatants.get(fighterId)?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        targetCombatantId: goblinId,
        transfer: {
          kind: "awaitingTargetDrop",
          retargetTiming: "sameTurn",
        },
      }),
    ]);

    const magicMissileReady = requireResolved(
      endTurn({ state: marked.state, actorId: fighterId }),
    ).state;
    const magicMissileAfterGoblin = requireResolved(
      endTurn({ state: magicMissileReady, actorId: goblinId }),
    ).state;
    const magicMissileTurn = requireResolved(
      endTurn({ state: magicMissileAfterGoblin, actorId: skeletonId }),
    ).state;
    const magicMissileSubject = {
      tag: "actionSpell" as const,
      actorId: fighterId,
      invocation: spellSlotInvocationRef(
        "magic_missile",
        1,
        "repeatedDamageAllocation",
      ),
      mode: { tag: "cast" as const },
    };
    const magicMissileTargetAllocation = requireHole(
      resolveBattleSubject({
        state: magicMissileTurn,
        subject: magicMissileSubject,
        fills: [],
      }),
      "spellTargetAllocation",
    );
    const magicMissileAllocationFill: BattleFill = {
      kind: "spellTargetAllocation",
      holeId: magicMissileTargetAllocation.holeId,
      value: { allocations: [{ targetId: goblinId, count: 3 }] },
      spatialFacts: [
        {
          kind: "spellTarget",
          casterId: fighterId,
          targetId: goblinId,
          spellId: "magic_missile",
        },
      ],
    };
    const magicMissileDamage = requireHole(
      resolveBattleSubject({
        state: magicMissileTurn,
        subject: magicMissileSubject,
        fills: [magicMissileAllocationFill],
      }),
      "rolledDice",
    );
    const magicMissileDropped = requireResolved(
      resolveBattleSubject({
        state: magicMissileTurn,
        subject: magicMissileSubject,
        fills: [
          magicMissileAllocationFill,
          damageRollFillWithGroups(magicMissileDamage, [[3, 3, 3]]),
        ],
      }),
    );
    expect(magicMissileDropped.state.combatants.get(goblinId)?.hp).toBe(0);
    expect(
      magicMissileDropped.state.combatants.get(fighterId)?.activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        targetCombatantId: goblinId,
        transfer: { kind: "available", retargetTiming: "sameTurn" },
      }),
    ]);

    const spellSubject = {
      tag: "actionSpell" as const,
      actorId: fighterId,
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "cast" as const },
    };
    const spellAct = findAct(marked.state, spellSubject);
    const spellTarget = findHole(spellAct.initialHoles, "targetChoice");
    const spellAttack = requireHole(
      resolveBattleSubject({
        state: marked.state,
        subject: spellSubject,
        fills: [
          targetFill(spellTarget, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "ray_of_frost",
            },
          ]),
        ],
      }),
      "attackRoll",
    );
    const spellDamage = requireHole(
      resolveBattleSubject({
        state: marked.state,
        subject: spellSubject,
        fills: [
          targetFill(spellTarget, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "ray_of_frost",
            },
          ]),
          attackRollFill(spellAttack, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    expect(spellDamage).toMatchObject({
      label: "Ray of Frost damage (1d8-cold+1d6-force)",
      spellMarkedDamageRiders: [
        expect.objectContaining({ targetCombatantId: goblinId }),
      ],
    });

    const target = attackInitialTargetHole(marked.state);
    const roll = attackRollHoleAfterTarget(
      marked.state,
      target,
      undefined,
      goblinId,
    );
    const damage = attackDamageHoleAfterHit(
      marked.state,
      target,
      roll,
      { total: 15, naturalD20: 10 },
      undefined,
      goblinId,
    );

    expect(damage).toMatchObject({
      label: "Longsword damage (1d8+1d6+3-slashing)",
      spellMarkedDamageRiders: [
        expect.objectContaining({ targetCombatantId: goblinId }),
      ],
    });

    const nicked = requireResolved(
      resolveBattleSubject({
        state: marked.state,
        subject: fighterAttackSubject(),
        fills: [
          targetFill(target, goblinId),
          attackRollFill(roll, { total: 15, naturalD20: 10 }),
          damageRollFillWithGroups(damage, [[1], [1]]),
        ],
      }),
    );
    expect(nicked.state.combatants.get(goblinId)?.hp).toBe(Hp(5));

    const attackFills = [
      targetFill(target, goblinId),
      attackRollFill(roll, { total: 15, naturalD20: 10 }),
      damageRollFillWithGroups(damage, [[4], [6]]),
    ];
    const disposition = requireHole(
      resolveBattleSubject({
        state: marked.state,
        subject: fighterAttackSubject(),
        fills: attackFills,
      }),
      "attackDamageDisposition",
    );
    const dropped = requireResolved(
      resolveBattleSubject({
        state: marked.state,
        subject: fighterAttackSubject(),
        fills: [
          ...attackFills,
          attackDamageDispositionFill(disposition, { kind: "ordinaryDamage" }),
        ],
      }),
    );
    expect(dropped.state.combatants.get(goblinId)?.hp).toBe(0);
    expect(dropped.state.combatants.get(fighterId)?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        targetCombatantId: goblinId,
        transfer: { kind: "available", retargetTiming: "sameTurn" },
      }),
    ]);

    const afterFighterTurn = requireResolved(
      endTurn({ state: dropped.state, actorId: fighterId }),
    ).state;
    const afterGoblinTurn = requireResolved(
      endTurn({ state: afterFighterTurn, actorId: goblinId }),
    ).state;
    const nextFighterTurn = requireResolved(
      endTurn({ state: afterGoblinTurn, actorId: skeletonId }),
    ).state;
    const transferAct = discoverBattleActs(nextFighterTurn).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.tag === "spellEffect" &&
        candidate.subject.invocation.spellId === "hunters_mark",
    );
    if (transferAct === undefined) {
      throw new Error("Expected Hunter's Mark transfer act.");
    }
    const transferTarget = findHole(transferAct.initialHoles, "targetChoice");
    if (transferTarget.kind !== "targetChoice") {
      throw new Error("Expected Hunter's Mark target choice.");
    }
    expect(transferTarget.choices).not.toContain(goblinId);
    expect(
      resolveBattleSubject({
        state: nextFighterTurn,
        subject: transferAct.subject,
        fills: [
          targetFill(transferTarget, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "hunters_mark",
            },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const restrictedActor = nextFighterTurn.combatants.get(fighterId);
    if (restrictedActor === undefined) {
      throw new Error("Expected Hunter's Mark caster.");
    }
    const spellcastingRestrictedOccurrence: ActiveOngoingFeatureOccurrence = {
      kind: "fixedDuration",
      expiresAt: {
        kind: "endOfTurn",
        combatantId: fighterId,
        round: nextFighterTurn.initiative.round,
      },
    };
    const restrictedHiddenTransferState: BattleState = {
      ...nextFighterTurn,
      combatants: new Map(nextFighterTurn.combatants).set(fighterId, {
        ...restrictedActor,
        hidden: { discoveryDc: difficultyClass(17) },
        activeOngoingFeatureOccurrences: new Map([
          ...restrictedActor.activeOngoingFeatureOccurrences,
          [
            "barbarian_rage" as OngoingFeatureSourceKey,
            spellcastingRestrictedOccurrence,
          ],
        ]),
      }),
    };
    const restrictedTransferAct = discoverBattleActs(
      restrictedHiddenTransferState,
    ).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.tag === "spellEffect" &&
        candidate.subject.invocation.spellId === "hunters_mark",
    );
    if (restrictedTransferAct === undefined) {
      throw new Error(
        "Expected Hunter's Mark transfer act through spellcasting restriction.",
      );
    }
    const restrictedTransferTarget = findHole(
      restrictedTransferAct.initialHoles,
      "targetChoice",
    );
    const restrictedTransferred = requireResolved(
      resolveBattleSubject({
        state: restrictedHiddenTransferState,
        subject: restrictedTransferAct.subject,
        fills: [
          targetFill(restrictedTransferTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: skeletonId,
              spellId: "hunters_mark",
            },
          ]),
        ],
      }),
    );
    expect(
      restrictedTransferred.state.combatants.get(fighterId)?.hidden,
    ).toEqual({ discoveryDc: difficultyClass(17) });

    const transferred = requireResolved(
      resolveBattleSubject({
        state: nextFighterTurn,
        subject: transferAct.subject,
        fills: [
          targetFill(transferTarget, skeletonId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: skeletonId,
              spellId: "hunters_mark",
            },
          ]),
        ],
      }),
    );

    expect(transferred.state.combatants.get(fighterId)?.concentration).toEqual({
      sourceSpellId: "hunters_mark",
      effectKind: "spellEffect",
    });
    expect(transferred.state.combatants.get(fighterId)?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        targetCombatantId: skeletonId,
        transfer: {
          kind: "awaitingTargetDrop",
          retargetTiming: "sameTurn",
        },
      }),
    ]);
  });

  test("Hunter's Mark projects Advantage on owner checks to find the marked target", () => {
    const state = startBattleRight({
      battleId: battleId("battle-hunters-mark-finding-advantage"),
      combatants: [
        characterSeed({
          initiative: 20,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("hunters_mark")],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
        skeletonCreatureInit({ initiative: 5 }),
      ],
    });
    const markAct = discoverBattleActs(state).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === "hunters_mark",
    );
    if (markAct === undefined) {
      throw new Error("Expected Hunter's Mark Bonus Action spell act.");
    }
    const marked = requireResolved(
      resolveBattleSubject({
        state,
        subject: markAct.subject,
        fills: [
          targetFill(findHole(markAct.initialHoles, "targetChoice"), goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "hunters_mark",
            },
          ]),
        ],
      }),
    ).state;

    expect(
      requiredAbilityCheckRollMode(marked, fighterId, "wis", {
        skill: "perception",
        targetId: goblinId,
      }),
    ).toBe("advantage");
    expect(
      requiredAbilityCheckRollMode(marked, fighterId, "wis", {
        skill: "survival",
        targetId: goblinId,
      }),
    ).toBe("advantage");
    expect(
      requiredAbilityCheckRollMode(marked, fighterId, "wis", {
        skill: "athletics",
        targetId: goblinId,
      }),
    ).toBeUndefined();
    expect(
      requiredAbilityCheckRollMode(marked, goblinId, "wis", {
        skill: "perception",
        targetId: fighterId,
      }),
    ).toBeUndefined();
    expect(
      requiredAbilityCheckRollMode(marked, fighterId, "wis", {
        skill: "perception",
        targetId: skeletonId,
      }),
    ).toBeUndefined();

    const hiddenGoblinState: BattleState = {
      ...marked,
      combatants: new Map(marked.combatants).set(goblinId, {
        ...marked.combatants.get(goblinId)!,
        hidden: { discoveryDc: difficultyClass(15) },
      }),
    };
    const searchSubject = {
      tag: "action" as const,
      actorId: fighterId,
      action: "search" as const,
    };
    const searchAct = findAct(hiddenGoblinState, searchSubject);
    const searchCheck = requireHole(
      resolveBattleSubject({
        state: hiddenGoblinState,
        subject: searchSubject,
        fills: [
          targetFill(
            findHole(searchAct.initialHoles, "targetChoice"),
            goblinId,
          ),
        ],
      }),
      "abilityCheck",
    );
    expect(searchCheck).toMatchObject({
      ability: "wis",
      skill: "perception",
      rollMode: "advantage",
    });

    const dropped = applyBattleHitPointDamage({
      state: marked,
      target: marked.combatants.get(goblinId)!,
      damageAmount: 99,
      deathFailuresAtZeroHp: 1,
      damageSourceId: fighterId,
    });
    const nextFighterTurn = requireResolved(
      endTurn({
        state: requireResolved(
          endTurn({
            state: requireResolved(
              endTurn({ state: dropped, actorId: fighterId }),
            ).state,
            actorId: goblinId,
          }),
        ).state,
        actorId: skeletonId,
      }),
    ).state;
    const transferAct = discoverBattleActs(nextFighterTurn).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === "hunters_mark",
    );
    if (transferAct === undefined) {
      throw new Error("Expected Hunter's Mark transfer act.");
    }
    const transferred = requireResolved(
      resolveBattleSubject({
        state: nextFighterTurn,
        subject: transferAct.subject,
        fills: [
          targetFill(
            findHole(transferAct.initialHoles, "targetChoice"),
            skeletonId,
            [
              {
                kind: "spellTarget",
                casterId: fighterId,
                targetId: skeletonId,
                spellId: "hunters_mark",
              },
            ],
          ),
        ],
      }),
    ).state;
    expect(
      requiredAbilityCheckRollMode(transferred, fighterId, "wis", {
        skill: "perception",
        targetId: goblinId,
      }),
    ).toBeUndefined();
    expect(
      requiredAbilityCheckRollMode(transferred, fighterId, "wis", {
        skill: "perception",
        targetId: skeletonId,
      }),
    ).toBe("advantage");

    const broken = breakBattleConcentration(transferred, fighterId);
    expect(
      requiredAbilityCheckRollMode(broken, fighterId, "wis", {
        skill: "perception",
        targetId: skeletonId,
      }),
    ).toBeUndefined();
  });

  test("breaking Hunter's Mark concentration clears the marked target rider", () => {
    const state = startBattleRight({
      battleId: battleId("battle-hunters-mark-concentration"),
      combatants: [
        characterSeed({
          displayName: "Wizard",
          initiative: 20,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("hunters_mark")],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const markAct = discoverBattleActs(state).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === "hunters_mark",
    );
    if (markAct === undefined) {
      throw new Error("Expected Hunter's Mark Bonus Action spell act.");
    }
    const markTarget = findHole(markAct.initialHoles, "targetChoice");
    const marked = requireResolved(
      resolveBattleSubject({
        state,
        subject: markAct.subject,
        fills: [
          targetFill(markTarget, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "hunters_mark",
            },
          ]),
        ],
      }),
    );

    const broken = breakBattleConcentration(marked.state, fighterId);

    expect(broken.combatants.get(fighterId)?.concentration).toBeNull();
    expect(broken.combatants.get(fighterId)?.activeEffects).toEqual([]);
  });

  test("Hunter's Mark projects slot-scaled Concentration maximum duration", () => {
    const expectedTicksBySlot = [
      [1, 600],
      [2, 600],
      [3, 4_800],
      [4, 4_800],
      [5, 14_400],
    ] as const;

    for (const [slotLevel, expectedTicks] of expectedTicksBySlot) {
      const state = startBattleRight({
        battleId: battleId(`battle-hunters-mark-slot-${slotLevel}`),
        combatants: [
          characterSeed({
            initiative: 20,
            spellcasting: wizardSpellcasting({
              preparedSpells: [spellRecord("hunters_mark")],
              spellSlots: [{ spellLevel: slotLevel, count: 1 }],
            }),
          }),
          statBlockCreatureInit({ initiative: 10 }),
        ],
      });
      const subject = {
        tag: "bonusActionSpell" as const,
        actorId: fighterId,
        invocation: spellSlotInvocationRef(
          "hunters_mark",
          slotLevel,
          "markedDamageRider",
        ),
        mode: { tag: "cast" as const },
      };
      const act = findAct(state, subject);
      const markTarget = findHole(act.initialHoles, "targetChoice");
      const marked = requireResolved(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            targetFill(markTarget, goblinId, [
              {
                kind: "spellTarget",
                casterId: fighterId,
                targetId: goblinId,
                spellId: "hunters_mark",
              },
            ]),
          ],
        }),
      );

      expect(marked.state.combatants.get(fighterId)?.activeEffects).toEqual([
        expect.objectContaining({
          kind: "spellMarkedDamageRider",
          targetCombatantId: goblinId,
          expiresAt: {
            kind: "concentration",
            combatantId: fighterId,
            durationTicks: expectedTicks,
          },
        }),
      ]);
    }
  });

  test("Hex applies Necrotic attack-hit damage and chosen-ability check Disadvantage", () => {
    const state = startBattleRight({
      battleId: battleId("battle-hex"),
      combatants: [
        characterSeed({
          displayName: "Wizard",
          initiative: 20,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("hex")],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const hexAct = discoverBattleActs(state).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === "hex",
    );
    if (hexAct === undefined) {
      throw new Error("Expected Hex Bonus Action spell act.");
    }
    const hexTarget = findHole(hexAct.initialHoles, "targetChoice");
    const hexAbility = findHole(hexAct.initialHoles, "abilityChoice");
    if (hexAbility.kind !== "abilityChoice") {
      throw new Error("Expected Hex ability choice.");
    }
    expect(hexAbility.choices).toEqual([
      "str",
      "dex",
      "con",
      "int",
      "wis",
      "cha",
    ]);
    const hexed = requireResolved(
      resolveBattleSubject({
        state,
        subject: hexAct.subject,
        fills: [
          targetFill(hexTarget, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "hex",
            },
          ]),
          { kind: "abilityChoice", holeId: hexAbility.holeId, value: "wis" },
        ],
      }),
    );

    expect(hexed.state.combatants.get(fighterId)?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        targetCombatantId: goblinId,
        abilityCheckBehavior: { kind: "abilityDisadvantage", ability: "wis" },
        damage: expect.objectContaining({ damageType: "necrotic" }),
      }),
    ]);

    const target = attackInitialTargetHole(hexed.state);
    const roll = attackRollHoleAfterTarget(
      hexed.state,
      target,
      undefined,
      goblinId,
    );
    const damage = attackDamageHoleAfterHit(
      hexed.state,
      target,
      roll,
      { total: 15, naturalD20: 10 },
      undefined,
      goblinId,
    );
    expect(damage).toMatchObject({
      label: "Longsword damage (1d8+1d6+3-slashing)",
      spellMarkedDamageRiders: [
        expect.objectContaining({
          targetCombatantId: goblinId,
          damage: expect.objectContaining({ damageType: "necrotic" }),
        }),
      ],
    });

    const goblinTurn = requireResolved(
      endTurn({ state: hexed.state, actorId: fighterId }),
    ).state;
    const hiddenFighterState: BattleState = {
      ...goblinTurn,
      combatants: new Map(goblinTurn.combatants).set(fighterId, {
        ...goblinTurn.combatants.get(fighterId)!,
        hidden: { discoveryDc: difficultyClass(15) },
      }),
    };
    const searchSubject = {
      tag: "action" as const,
      actorId: goblinId,
      action: "search" as const,
    };
    const searchAct = findAct(hiddenFighterState, searchSubject);
    const searchTarget = findHole(searchAct.initialHoles, "targetChoice");
    const searchCheck = requireHole(
      resolveBattleSubject({
        state: hiddenFighterState,
        subject: searchSubject,
        fills: [targetFill(searchTarget, fighterId)],
      }),
      "abilityCheck",
    );
    expect(searchCheck).toMatchObject({
      ability: "wis",
      skill: "perception",
      rollMode: "disadvantage",
    });
  });

  test("Fog Cloud admits caller-supplied fog area and slot-scaled radius", () => {
    const state = startBattleRight({
      battleId: battleId("battle-fog-cloud-admission"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("fog_cloud")],
            spellSlots: [
              { spellLevel: 1, count: 1 },
              { spellLevel: 3, count: 1 },
            ],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    const levelOneAct = discoverBattleActs(state).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        candidate.subject.invocation.tag === "spellSlot" &&
        candidate.subject.invocation.spellId === "fog_cloud" &&
        candidate.subject.invocation.slotLevel === 1 &&
        candidate.subject.invocation.procedure === "fogCloudObscurement",
    );
    if (levelOneAct === undefined) {
      throw new Error("Expected level-1 Fog Cloud action spell act.");
    }
    expect(levelOneAct.initialHoles).toEqual([
      expect.objectContaining({
        kind: "spellAreaChoice",
        area: { kind: "pointOriginSphere", radiusFeet: movementFeet(20) },
      }),
    ]);

    const wizard = state.combatants.get(wizardId);
    if (wizard === undefined) {
      throw new Error("Expected Wizard.");
    }
    const levelThree = supportedSpellActs(wizard).find(
      (invocation) =>
        invocation.procedure === "fogCloudObscurement" &&
        invocation.resource.slotLevel === 3,
    );
    expect(levelThree).toMatchObject({
      targeting: { kind: "pointOriginSphere", radiusFeet: movementFeet(60) },
      durationTicks: requireElapsedHours(1),
      rangeFeet: movementFeet(120),
    });
  });

  test("Fog Cloud creates a Concentration-owned Heavily Obscured area", () => {
    const state = fogCloudBattle("battle-fog-cloud-cast");
    const subject = magicSubject("fog_cloud");
    const area = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "spellAreaChoice",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [fogCloudAreaFill(area, "fog-1")],
      }),
    );
    const caster = resolved.state.combatants.get(wizardId);

    expect(caster?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "fogCloudObscurement",
        sourceSpellId: "fog_cloud",
        sourceCombatantId: wizardId,
        areaId: "fog-1",
        radiusFeet: movementFeet(20),
        expiresAt: {
          kind: "concentration",
          combatantId: wizardId,
          durationTicks: requireElapsedHours(1),
        },
      }),
    ]);
    expect(caster?.concentration).toMatchObject({
      sourceSpellId: "fog_cloud",
    });
    expect(resolved.snapshot.obscurementZones).toEqual([
      {
        kind: "spellObscurementZone",
        sourceSpellId: "fog_cloud",
        sourceCombatantId: wizardId,
        obscurement: "heavilyObscured",
        area: {
          kind: "pointOriginSphere",
          areaId: "fog-1",
          radiusFeet: movementFeet(20),
        },
        expiresAt: {
          kind: "concentration",
          combatantId: wizardId,
          durationTicks: requireElapsedHours(1),
        },
      },
    ]);
    expect(expendedLevelOneSlots(resolved, wizardId)).toBe(1);
  });

  test("Fog Cloud ends when Concentration breaks or strong wind disperses it", () => {
    const cast = castFogCloud("battle-fog-cloud-ends", "fog-1");
    const broken = breakBattleConcentration(cast.state, wizardId);

    expect(broken.combatants.get(wizardId)?.activeEffects).toEqual([]);
    expect(broken.combatants.get(wizardId)?.concentration).toBeNull();
    expect(battleObscurementZones(broken)).toEqual([]);

    const command = discoverBattleActs(cast.state).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "disperseFogCloud" &&
        candidate.subject.areaId === "fog-1",
    );
    if (command === undefined) {
      throw new Error("Expected Fog Cloud strong-wind dispersal command.");
    }
    const dispersed = requireResolved(
      resolveBattleSubject({
        state: cast.state,
        subject: command.subject,
        fills: [],
      }),
    );

    expect(dispersed.state.combatants.get(wizardId)?.activeEffects).toEqual([]);
    expect(dispersed.state.combatants.get(wizardId)?.concentration).toBeNull();
    expect(dispersed.snapshot.obscurementZones).toEqual([]);
  });

  test("Fog Cloud source zone does not impose attack-roll Disadvantage without a sight witness", () => {
    const cast = castFogCloud("battle-fog-cloud-no-implicit-sight", "fog-1");
    const goblinTurn = requireResolved(
      endTurn({ state: cast.state, actorId: wizardId }),
    ).state;
    const subject = goblinAttackSubject("Scimitar");
    const target = attackInitialTargetHole(goblinTurn, subject);
    const roll = attackRollHoleAfterTarget(
      goblinTurn,
      target,
      subject,
      wizardId,
    );

    expect(cast.snapshot.obscurementZones).toHaveLength(1);
    expect(roll).not.toHaveProperty("rollMode");
  });

  test("Hex retarget waits until a later turn after the cursed target drops", () => {
    const state = startBattleRight({
      battleId: battleId("battle-hex-later-turn-retarget"),
      combatants: [
        characterSeed({
          initiative: 20,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("hex")],
          }),
        }),
        statBlockCreatureInit({
          combatantId: goblinId,
          initiative: 10,
          currentHp: Hp(1),
        }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Skeleton",
          initiative: 5,
        }),
      ],
    });
    const hexAct = discoverBattleActs(state).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === "hex",
    );
    if (hexAct === undefined) {
      throw new Error("Expected Hex cast act.");
    }
    const hexed = requireResolved(
      resolveBattleSubject({
        state,
        subject: hexAct.subject,
        fills: [
          targetFill(findHole(hexAct.initialHoles, "targetChoice"), goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "hex",
            },
          ]),
          {
            kind: "abilityChoice",
            holeId: findHole(hexAct.initialHoles, "abilityChoice").holeId,
            value: "wis",
          },
        ],
      }),
    ).state;
    const nextFighterTurn = requireResolved(
      endTurn({
        state: requireResolved(
          endTurn({
            state: requireResolved(
              endTurn({ state: hexed, actorId: fighterId }),
            ).state,
            actorId: goblinId,
          }),
        ).state,
        actorId: skeletonId,
      }),
    ).state;
    const dropped = applyBattleHitPointDamage({
      state: nextFighterTurn,
      target: nextFighterTurn.combatants.get(goblinId)!,
      damageAmount: 1,
      deathFailuresAtZeroHp: 1,
      damageSourceId: fighterId,
    });

    expect(dropped.combatants.get(fighterId)?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        transfer: {
          kind: "availableAfterTurn",
          retargetTiming: "laterTurn",
          droppedOnTurn: {
            actorId: fighterId,
            round: dropped.initiative.round,
          },
        },
      }),
    ]);
    expect(
      discoverBattleActs(dropped).some(
        (candidate) =>
          candidate.subject.tag === "bonusActionSpell" &&
          candidate.subject.invocation.spellId === "hex",
      ),
    ).toBe(false);

    const laterTurn = requireResolved(
      endTurn({
        state: requireResolved(
          endTurn({
            state: requireResolved(
              endTurn({ state: dropped, actorId: fighterId }),
            ).state,
            actorId: goblinId,
          }),
        ).state,
        actorId: skeletonId,
      }),
    ).state;
    const transferAct = discoverBattleActs(laterTurn).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.spellId === "hex",
    );
    if (transferAct === undefined) {
      throw new Error("Expected later-turn Hex transfer act.");
    }
    const transferred = requireResolved(
      resolveBattleSubject({
        state: laterTurn,
        subject: transferAct.subject,
        fills: [
          targetFill(
            findHole(transferAct.initialHoles, "targetChoice"),
            skeletonId,
            [
              {
                kind: "spellTarget",
                casterId: fighterId,
                targetId: skeletonId,
                spellId: "hex",
              },
            ],
          ),
        ],
      }),
    ).state;

    expect(transferred.combatants.get(fighterId)?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        targetCombatantId: skeletonId,
        abilityCheckBehavior: { kind: "abilityDisadvantage", ability: "wis" },
        transfer: {
          kind: "awaitingTargetDrop",
          retargetTiming: "laterTurn",
        },
      }),
    ]);
  });

  test("Favored Enemy casts Hunter's Mark without expending a Spell Slot", () => {
    const favoredEnemy = rangerFavoredEnemyResource();
    const state = startBattleRight({
      battleId: battleId("battle-favored-enemy-hunters-mark"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "ranger", level: 1 }],
          resources: [favoredEnemy],
          spellcasting: {
            ...wizardSpellcasting({
              preparedSpells: [],
              spellSlots: [{ spellLevel: 1, count: 1 }],
            }),
            featurePreparedSpells: [
              {
                sourceUnitId: favoredEnemy.unit.id,
                spell: spellRecord("hunters_mark"),
              },
            ],
            sourceClassName: "ranger",
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = {
      tag: "bonusActionSpell" as const,
      actorId: fighterId,
      invocation: classFeatureFreeCastSpellInvocationRef(
        "hunters_mark",
        "ranger_favored_enemy",
        "markedDamageRider",
      ),
      mode: { tag: "cast" as const },
    };
    const act = findAct(state, subject);
    const markTarget = findHole(act.initialHoles, "targetChoice");
    const marked = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(markTarget, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "hunters_mark",
            },
          ]),
        ],
      }),
    );
    const ranger = marked.state.combatants.get(fighterId);

    expect(ranger?.origin.kind).toBe("character");
    if (ranger?.origin.kind !== "character") {
      throw new Error("Expected Ranger caster.");
    }
    expect(ranger.origin.resources[0]?.usesRemaining).toBe(resourceCount(1));
    expect(ranger.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 0 },
    ]);
    expect(marked.state.currentTurnResources.spellSlotExpendedThisTurn).toBe(
      false,
    );
    expect(ranger.concentration).toEqual({
      sourceSpellId: "hunters_mark",
      effectKind: "spellEffect",
    });
    expect(ranger.activeEffects).toEqual([
      expect.objectContaining({
        kind: "spellMarkedDamageRider",
        targetCombatantId: goblinId,
        expiresAt: {
          kind: "concentration",
          combatantId: fighterId,
          durationTicks: elapsedTimeTicks(600),
        },
      }),
    ]);
    expect(
      requiredAbilityCheckRollMode(marked.state, fighterId, "wis", {
        skill: "survival",
        targetId: goblinId,
      }),
    ).toBe("advantage");
  });

  test("stale Favored Enemy Hunter's Mark free-cast resolution preserves turn resources and Concentration", () => {
    const favoredEnemy = rangerFavoredEnemyResource();
    const state = startBattleRight({
      battleId: battleId("battle-favored-enemy-stale-hunters-mark"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "ranger", level: 1 }],
          resources: [favoredEnemy],
          spellcasting: {
            ...wizardSpellcasting({
              preparedSpells: [],
              spellSlots: [{ spellLevel: 1, count: 1 }],
            }),
            featurePreparedSpells: [
              {
                sourceUnitId: favoredEnemy.unit.id,
                spell: spellRecord("hunters_mark"),
              },
            ],
            sourceClassName: "ranger",
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = {
      tag: "bonusActionSpell" as const,
      actorId: fighterId,
      invocation: classFeatureFreeCastSpellInvocationRef(
        "hunters_mark",
        "ranger_favored_enemy",
        "markedDamageRider",
      ),
      mode: { tag: "cast" as const },
    };
    const act = findAct(state, subject);
    const markTarget = findHole(act.initialHoles, "targetChoice");
    const ranger = state.combatants.get(fighterId);
    if (ranger?.origin.kind !== "character") {
      throw new Error("Expected Ranger caster.");
    }
    const invocation = supportedSpellActs(ranger).find(
      (candidate) =>
        candidate.procedure === "markedDamageRider" &&
        supportedSpellInvocationMatchesRef(candidate, subject.invocation),
    );
    if (
      invocation === undefined ||
      invocation.procedure !== "markedDamageRider" ||
      invocation.resource.tag !== "classFeatureFreeCast"
    ) {
      throw new Error("Expected Favored Enemy Hunter's Mark invocation.");
    }
    const existingConcentration = {
      sourceSpellId: "existing_concentration",
      effectKind: "spellEffect",
    } as const;
    const [favoredEnemyResource] = ranger.origin.resources;
    if (
      favoredEnemyResource === undefined ||
      characterBattleResourceIsUnlimited(favoredEnemyResource)
    ) {
      throw new Error("Expected Favored Enemy to be a limited resource.");
    }
    const staleState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(fighterId, {
        ...ranger,
        concentration: existingConcentration,
        origin: {
          ...ranger.origin,
          resources: [
            { ...favoredEnemyResource, usesRemaining: resourceCount(0) },
            ...ranger.origin.resources.slice(1),
          ],
        },
      }),
    };
    const staleSnapshot = snapshotBattle(staleState);
    const fills = [
      targetFill(markTarget, goblinId, [
        {
          kind: "spellTarget",
          casterId: fighterId,
          targetId: goblinId,
          spellId: "hunters_mark",
        },
      ]),
    ];
    const fillSet = spellFillSet(fills, invocation);
    if (fillSet.tag === "invalid") {
      throw new Error(fillSet.message);
    }

    const result = resolveMarkedDamageRiderSpellAct({
      input: {
        state: staleState,
        subject,
        fills,
      },
      actorId: fighterId,
      invocation,
      fillSet,
    });

    expect(result).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(result.snapshot).toEqual(staleSnapshot);
    expect(staleState.currentTurnResources.currentHasBonusAction).toBe(true);
    expect(staleState.combatants.get(fighterId)?.concentration).toEqual(
      existingConcentration,
    );
  });

  test("Favored Enemy initializes at its level-1 Long Rest use cap", () => {
    const state = startBattleRight({
      battleId: battleId("battle-favored-enemy-long-rest-cap"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "ranger", level: 17 }],
          resources: [rangerFavoredEnemyResource()],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const ranger = state.combatants.get(fighterId);

    expect(ranger?.origin.kind).toBe("character");
    if (ranger?.origin.kind !== "character") {
      throw new Error("Expected Ranger caster.");
    }
    expect(ranger.origin.resources[0]?.usesRemaining).toBe(resourceCount(2));
  });

  test("Favored Enemy free-cast support requires Hunter's Mark grant identity", () => {
    const favoredEnemy = unitLibrary.requireUnit("ranger_favored_enemy");
    if (
      favoredEnemy.kind !== "class_feature" ||
      favoredEnemy.mechanics.family !== "passive"
    ) {
      throw new Error("Expected Ranger Favored Enemy passive class feature.");
    }
    const mismatchedFreeCast = {
      ...favoredEnemy,
      mechanics: {
        ...favoredEnemy.mechanics,
        grants: favoredEnemy.mechanics.grants.map((grant) =>
          grant.kind === "grant_spell_free_casts"
            ? { ...grant, spellId: "magic_missile" }
            : grant,
        ),
      },
    };

    expect(characterBattleResourceSupportedForUnit(mismatchedFreeCast)).toBe(
      false,
    );
  });

  test("Favored Enemy falls back to normal Hunter's Mark Spell Slot casting when free casts are exhausted", () => {
    const favoredEnemy = rangerFavoredEnemyResource({ usesRemaining: 0 });
    const state = startBattleRight({
      battleId: battleId("battle-favored-enemy-hunters-mark-slot-fallback"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "ranger", level: 1 }],
          resources: [favoredEnemy],
          spellcasting: {
            ...wizardSpellcasting({
              preparedSpells: [],
              spellSlots: [{ spellLevel: 1, count: 1 }],
            }),
            featurePreparedSpells: [
              {
                sourceUnitId: favoredEnemy.unit.id,
                spell: spellRecord("hunters_mark"),
              },
            ],
            sourceClassName: "ranger",
          },
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    expect(
      discoverBattleActs(state).some(
        (candidate) =>
          candidate.subject.tag === "bonusActionSpell" &&
          candidate.subject.invocation.tag === "classFeatureFreeCast" &&
          candidate.subject.invocation.spellId === "hunters_mark",
      ),
    ).toBe(false);

    const subject = {
      tag: "bonusActionSpell" as const,
      actorId: fighterId,
      invocation: spellSlotInvocationRef(
        "hunters_mark",
        1,
        "markedDamageRider",
      ),
      mode: { tag: "cast" as const },
    };
    const act = findAct(state, subject);
    const markTarget = findHole(act.initialHoles, "targetChoice");
    const marked = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(markTarget, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "hunters_mark",
            },
          ]),
        ],
      }),
    );
    const ranger = marked.state.combatants.get(fighterId);

    expect(ranger?.origin.kind).toBe("character");
    if (ranger?.origin.kind !== "character") {
      throw new Error("Expected Ranger caster.");
    }
    expect(ranger.origin.resources[0]?.usesRemaining).toBe(resourceCount(0));
    expect(ranger.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 1, expended: 1 },
    ]);
    expect(marked.state.currentTurnResources.spellSlotExpendedThisTurn).toBe(
      true,
    );
  });

  test("Hunter's Mark maximum duration expiry clears Concentration and preserves damage behavior before expiry", () => {
    const state = startBattleRight({
      battleId: battleId("battle-hunters-mark-duration-expiry"),
      combatants: [
        characterSeed({
          initiative: 20,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("hunters_mark")],
            spellSlots: [{ spellLevel: 3, count: 1 }],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = {
      tag: "bonusActionSpell" as const,
      actorId: fighterId,
      invocation: spellSlotInvocationRef(
        "hunters_mark",
        3,
        "markedDamageRider",
      ),
      mode: { tag: "cast" as const },
    };
    const act = findAct(state, subject);
    const markTarget = findHole(act.initialHoles, "targetChoice");
    const marked = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(markTarget, goblinId, [
            {
              kind: "spellTarget",
              casterId: fighterId,
              targetId: goblinId,
              spellId: "hunters_mark",
            },
          ]),
        ],
      }),
    );
    const caster = marked.state.combatants.get(fighterId);
    const rider = caster?.activeEffects.find(
      (effect) => effect.kind === "spellMarkedDamageRider",
    );
    if (caster === undefined || rider === undefined) {
      throw new Error("Expected active Hunter's Mark rider.");
    }
    if (rider.expiresAt.kind !== "concentration") {
      throw new Error("Expected Hunter's Mark to be Concentration-owned.");
    }
    const nearlyExpired: BattleState = {
      ...marked.state,
      combatants: new Map(marked.state.combatants).set(fighterId, {
        ...caster,
        activeEffects: [
          {
            ...rider,
            expiresAt: {
              kind: "concentration",
              combatantId: rider.expiresAt.combatantId,
              durationTicks: elapsedTimeTicks(1),
            },
          },
        ],
      }),
    };

    const target = attackInitialTargetHole(nearlyExpired);
    const roll = attackRollHoleAfterTarget(
      nearlyExpired,
      target,
      undefined,
      goblinId,
    );
    const damage = attackDamageHoleAfterHit(
      nearlyExpired,
      target,
      roll,
      { total: 15, naturalD20: 10 },
      undefined,
      goblinId,
    );
    expect(damage).toMatchObject({
      label: "Longsword damage (1d8+1d6+3-slashing)",
      spellMarkedDamageRiders: [
        expect.objectContaining({ targetCombatantId: goblinId }),
      ],
    });

    const expiredCombatants = tickDurationEffects(nearlyExpired.combatants);
    expect(expiredCombatants.get(fighterId)?.concentration).toBeNull();
    expect(expiredCombatants.get(fighterId)?.activeEffects).toEqual([]);
  });

  test("Hunter's Mark invocation holes reject contradictory cast and transfer shapes", () => {
    const spell = spellRecord("hunters_mark");
    const baseSpell = {
      access: { tag: "prepared" },
      procedure: "markedDamageRider",
      spell,
      actionCost: "bonusAction",
      targeting: { kind: "singleCombatant" },
      damage: { expr: { dice: 1, dieSize: 6 }, damageType: "force" },
      rangeFeet: movementFeet(90),
    };
    const baseHole = {
      kind: "rolledDice",
      holeId: holeId("battle:test:invalid-hunters-mark-invocation"),
      holeInstanceKey: holeInstanceKey(
        "battle:test:invalid-hunters-mark-invocation",
      ),
      label: "Invalid Hunter's Mark invocation",
      critical: false,
      spellMarkedDamageRiders: [],
    };

    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseSpell,
            action: "cast",
            resource: { tag: "none" },
            expiresAt: { kind: "concentration" },
          },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...baseHole,
          spell: {
            ...baseSpell,
            action: "transfer",
            resource: { tag: "spellSlot", slotLevel: 1 },
            activeEffect: {
              kind: "spellMarkedDamageRider",
              sourceCombatantId: fighterId,
              sourceSpellId: "hunters_mark",
              targetCombatantId: goblinId,
              transfer: { kind: "available", retargetTiming: "sameTurn" },
              damage: { expr: { dice: 1, dieSize: 6 }, damageType: "force" },
              expiresAt: { kind: "concentration" },
            },
          },
        }),
      ),
    ).toBe(true);
  });

  test("endTurn advances to a new round after the last actor acts", () => {
    const afterFighter = endTurn({
      state: fighterVsGoblinBattle(),
      actorId: fighterId,
    });
    if (afterFighter.tag !== "resolved") {
      throw new Error(`Expected resolved End Turn, got ${afterFighter.tag}.`);
    }

    const afterGoblin = endTurn({
      state: afterFighter.state,
      actorId: goblinId,
    });

    expect(afterGoblin).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: fighterId,
        round: 2,
        turnOrder: [fighterId, goblinId],
        turn: {
          actionResources: [{ kind: "action", source: "turn" }],
          bonusActionAvailable: true,
        },
      },
    });
  });

  test("endTurn rejects fills because it is a runtime command, not an Action hole protocol", () => {
    const state = fighterVsGoblinBattle();
    const targetHole = attackInitialTargetHole(state);

    const result = resolveBattleSubject({
      state,
      subject: {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "endTurn",
      },
      fills: [targetFill(targetHole, goblinId)],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      snapshot: {
        currentActorId: fighterId,
        round: 1,
      },
    });
  });
});
