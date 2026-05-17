import {
  startBattleRight,
  testBattleCreatureStateWithConditions,
  goblinAttackSubject,
  attackInitialTargetHole,
  attackRollHoleAfterTarget,
  requireHole,
  findHole,
  targetFill,
  attackRollFill,
  concentrationSavingThrowFill,
  reactionDecisionFill,
  rolledDiceGroup,
  characterSeed,
  statBlockCreatureInit,
  skeletonCreatureInit,
  reactionModifierUnitRef,
  cuttingWordsResource,
  goblinAttacksReactionModifierCharacter,
  goblinScimitarHitReactionSetup,
  resolveGoblinScimitarHitReduction,
  uncannyDodgeUnit,
  cuttingWordsDamageOnlyUnit,
  fighterId,
  goblinId,
  skeletonId,
  applyCondition,
  battleId,
  holeId,
  holeInstanceKey,
  Hp,
  resolveBattleReaction,
  resolveBattleSubject,
  snapshotBattle,
} from "./battle-runtime-test-support.ts";
import type {
  BattleReactionFrame,
  BattleState,
  BattleSubject,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: Uncanny Dodge and damage reductions", () => {
  test("Uncanny Dodge is chosen when the attack hits and halves later attack damage", () => {
    const state = goblinAttacksReactionModifierCharacter({
      unit: uncannyDodgeUnit(),
      className: "rogue",
      level: 5,
      unitId: "rogue_uncanny_dodge",
    });
    const resolved = resolveGoblinScimitarHitReduction({
      state,
      unitId: "rogue_uncanny_dodge",
      damageRoll: 6,
    });

    if (resolved.tag !== "resolved") throw new Error("Expected resolved.");
    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(Hp(8));
    expect(resolved.state.combatants.get(fighterId)?.reactionAvailable).toBe(
      false,
    );
  });

  test("pending hit-triggered damage reductions block unrelated subjects until damage is filled", () => {
    const state = goblinAttacksReactionModifierCharacter({
      unit: uncannyDodgeUnit(),
      className: "rogue",
      level: 5,
      unitId: "rogue_uncanny_dodge",
    });
    const setup = goblinScimitarHitReactionSetup(state);
    if (setup.result.tag !== "needsHoles") {
      throw new Error("Expected attack-hit Reaction window.");
    }
    const afterReaction = resolveBattleReaction({
      state: setup.result.state,
      fill: reactionDecisionFill(
        findHole(setup.result.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: "rogue_uncanny_dodge",
            modifierKind: "attackDamageReduction",
            fills: [],
          },
        },
      ),
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error("Expected pending damage roll.");
    }

    const blocked = resolveBattleSubject({
      state: afterReaction.state,
      subject: {
        tag: "runtimeCommand",
        actorId: goblinId,
        command: "endTurn",
      },
      fills: [],
    });

    expect(blocked).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });

  test("Uncanny Dodge can reduce visible ranged attack damage beyond 5 feet", () => {
    const state = startBattleRight({
      battleId: battleId("battle-uncanny-dodge-ranged"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Rogue",
          initiative: 10,
          classLevels: [{ className: "rogue", level: 5 }],
          attack: null,
          unitFeatures: [{ unit: uncannyDodgeUnit() }],
          characterUnitRefs: [reactionModifierUnitRef("rogue_uncanny_dodge")],
        }),
      ],
    });
    const subject = goblinAttackSubject("Shortbow");
    const target = attackInitialTargetHole(state, subject);
    const attackRoll = attackRollHoleAfterTarget(
      state,
      target,
      subject,
      fighterId,
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, fighterId),
        attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected attack-hit Reaction window.");
    }

    expect(awaitingReaction.snapshot.pendingReaction!.choices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "reactionRollOrDamageReduction",
          choice: expect.objectContaining({
            kind: "attackDamageReduction",
            unitId: "rogue_uncanny_dodge",
          }),
        }),
      ]),
    );
  });

  test("Incapacitated combatants cannot use reaction roll or damage reductions", () => {
    const base = goblinAttacksReactionModifierCharacter({
      unit: uncannyDodgeUnit(),
      className: "rogue",
      level: 5,
      unitId: "rogue_uncanny_dodge",
    });
    const fighter = base.combatants.get(fighterId)!;
    const state = {
      ...base,
      combatants: new Map(base.combatants).set(
        fighterId,
        testBattleCreatureStateWithConditions(
          fighter,
          applyCondition(fighter.conditions, "incapacitated"),
        ),
      ),
    } satisfies BattleState;
    const setup = goblinScimitarHitReactionSetup(state);

    expect(setup.result).toMatchObject({ tag: "needsHoles" });
    expect(setup.result.snapshot.pendingReaction).toBeNull();
  });

  test("hit and damage reduction reactions use their separate RAW windows", () => {
    const cuttingWordsDamageOnly = cuttingWordsDamageOnlyUnit();
    const state = startBattleRight({
      battleId: battleId("battle-single-scalar-damage-modifier-choice"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Rogue Bard",
          initiative: 10,
          classLevels: [
            { className: "rogue", level: 5 },
            { className: "bard", level: 3 },
          ],
          attack: null,
          resources: [cuttingWordsResource({ unit: cuttingWordsDamageOnly })],
          unitFeatures: [uncannyDodgeUnit(), cuttingWordsDamageOnly].map(
            (unit) => ({ unit }),
          ),
          characterUnitRefs: [
            reactionModifierUnitRef("rogue_uncanny_dodge"),
            reactionModifierUnitRef(cuttingWordsDamageOnly.id),
          ],
        }),
      ],
    });
    const hitReaction = goblinScimitarHitReactionSetup(state);
    if (hitReaction.result.tag !== "needsHoles") {
      throw new Error("Expected attack-hit Reaction window.");
    }

    const hitModifierChoices =
      hitReaction.result.snapshot.pendingReaction!.choices.filter(
        (choice) => choice.kind === "reactionRollOrDamageReduction",
      );
    expect(hitModifierChoices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "reactionRollOrDamageReduction",
          choice: expect.objectContaining({ kind: "attackDamageReduction" }),
        }),
      ]),
    );
    expect(hitModifierChoices).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "reactionRollOrDamageReduction",
          choice: expect.objectContaining({ kind: "damageRollReduction" }),
        }),
      ]),
    );
    const beforeDamage = resolveBattleReaction({
      state: hitReaction.result.state,
      fill: reactionDecisionFill(
        findHole(hitReaction.result.holes, "reactionDecision"),
        { kind: "decline", reactorId: fighterId },
      ),
    });
    if (beforeDamage.tag !== "needsHoles") {
      throw new Error("Expected damage roll after declining hit reaction.");
    }
    const damage = requireHole(beforeDamage, "rolledDice");
    const awaitingDamageReaction = resolveBattleSubject({
      state: beforeDamage.state,
      subject: hitReaction.subject,
      fills: [
        ...hitReaction.prefixFills,
        {
          kind: "rolledDice",
          holeId: damage.holeId,
          value: [rolledDiceGroup([6])],
        },
      ],
    });
    if (awaitingDamageReaction.tag !== "needsHoles") {
      throw new Error("Expected attack-damage Reaction window.");
    }
    const damageModifierChoices =
      awaitingDamageReaction.snapshot.pendingReaction!.choices.filter(
        (choice) => choice.kind === "reactionRollOrDamageReduction",
      );
    expect(damageModifierChoices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "reactionRollOrDamageReduction",
          choice: expect.objectContaining({ kind: "damageRollReduction" }),
        }),
      ]),
    );
  });

  test("attack damage scalar reductions apply proportionally to mixed damage entries", () => {
    const state = goblinAttacksReactionModifierCharacter({
      unit: uncannyDodgeUnit(),
      className: "rogue",
      level: 5,
      unitId: "rogue_uncanny_dodge",
    });
    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "attack",
      attackName: "Scimitar",
    };
    const frame: BattleReactionFrame = {
      trigger: "attackDamage",
      eligibleReactors: [fighterId],
      offeredReactors: [],
      choices: [
        {
          kind: "reactionRollOrDamageReduction",
          reactorId: fighterId,
          choice: {
            kind: "damageRollReduction",
            unitId: "test_cutting_words",
            label: "Cutting Words",
            reduction: {
              kind: "rolled",
              dice: 1,
              flatModifier: 0,
              dieSize: 6,
              spends: { resourceUnitId: "test_cutting_words", amount: 1 },
            },
          },
          initialHoles: [
            {
              kind: "rolledDice",
              holeId: holeId("battle:reaction:modifier-roll"),
              holeInstanceKey: holeInstanceKey("battle:reaction:modifier-roll"),
              label: "Cutting Words reduction roll",
              unitFeature: {
                unitId: "test_cutting_words",
                label: "Cutting Words",
                modifierKind: "damageRollReduction",
              },
            },
          ],
        },
      ],
      continuation: {
        kind: "attackDamage",
        subject,
        attackerId: goblinId,
        targetId: fighterId,
        damageEvent: {
          kind: "rolledDamage",
          damageRollByType: [
            { damageType: "slashing", amount: 5 },
            { damageType: "poison", amount: 4 },
          ],
        },
        fills: [],
        deathFailuresAtZeroHp: 1,
        damageDisposition: { kind: "ordinaryDamage" },
        attackDamageRiders: [],
      },
    };

    const pendingState = {
      ...state,
      interruptStack: [{ kind: "reaction", frame }],
    } satisfies BattleState;
    const decision = snapshotBattle(pendingState).pendingReaction?.decisionHole;
    if (decision === undefined) {
      throw new Error("Expected pending Reaction decision.");
    }
    const resolved = resolveBattleReaction({
      state: pendingState,
      fill: reactionDecisionFill(decision, {
        kind: "resolve",
        reactorId: fighterId,
        choice: {
          kind: "reactionRollOrDamageReduction",
          unitId: "test_cutting_words",
          modifierKind: "damageRollReduction",
          fills: [
            {
              kind: "rolledDice",
              holeId: holeId("battle:reaction:modifier-roll"),
              value: [rolledDiceGroup([3])] as const,
            },
          ],
        },
      }),
    });

    if (resolved.tag !== "resolved") throw new Error("Expected resolved.");
    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(Hp(6));
  });

  test("attack-damage reduction rejects impossible stat-block reactor choices", () => {
    const state = startBattleRight({
      battleId: battleId("battle-attack-damage-reduction-before-vulnerability"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        skeletonCreatureInit({ initiative: 10 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Lore Bard",
          initiative: 5,
          classLevels: [{ className: "bard", level: 3 }],
          attack: null,
        }),
      ],
    });
    const subject: Extract<
      BattleSubject,
      { readonly tag: "action"; readonly action: "attack" }
    > = {
      tag: "action",
      actorId: goblinId,
      action: "attack",
      attackName: "Scimitar",
      statBlockSection: "actions",
    };
    const frame: BattleReactionFrame = {
      trigger: "attackDamage",
      eligibleReactors: [skeletonId, fighterId],
      offeredReactors: [],
      choices: [
        {
          kind: "reactionRollOrDamageReduction",
          reactorId: skeletonId,
          choice: {
            kind: "attackDamageReduction",
            unitId: "test_uncanny_dodge",
            label: "Uncanny Dodge",
            reduction: { kind: "halfDamage" },
          },
          initialHoles: [],
        },
        {
          kind: "reactionRollOrDamageReduction",
          reactorId: fighterId,
          choice: {
            kind: "damageRollReduction",
            unitId: "test_cutting_words",
            label: "Cutting Words",
            reduction: {
              kind: "rolled",
              dice: 1,
              flatModifier: 0,
              dieSize: 6,
              spends: { resourceUnitId: "test_cutting_words", amount: 1 },
            },
          },
          initialHoles: [],
        },
      ],
      continuation: {
        kind: "attackDamage",
        subject,
        attackerId: goblinId,
        targetId: skeletonId,
        damageEvent: {
          kind: "rolledDamage",
          damageRollByType: [{ damageType: "bludgeoning", amount: 5 }],
        },
        fills: [],
        deathFailuresAtZeroHp: 1,
        damageDisposition: { kind: "ordinaryDamage" },
        attackDamageRiders: [],
      },
    };
    const pendingState = {
      ...state,
      interruptStack: [{ kind: "reaction", frame }],
    } satisfies BattleState;
    const decision = snapshotBattle(pendingState).pendingReaction?.decisionHole;
    if (decision === undefined) {
      throw new Error("Expected pending Reaction decision.");
    }

    const resolved = resolveBattleReaction({
      state: pendingState,
      fill: reactionDecisionFill(decision, {
        kind: "resolve",
        reactorId: skeletonId,
        choice: {
          kind: "reactionRollOrDamageReduction",
          unitId: "test_uncanny_dodge",
          modifierKind: "attackDamageReduction",
          fills: [],
        },
      }),
    });

    expect(resolved).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Attack damage reductions must be chosen when the attack roll hits.",
    });
  });

  test("reaction-modified attack damage requests Concentration after the final damage amount", () => {
    const base = goblinAttacksReactionModifierCharacter({
      unit: uncannyDodgeUnit(),
      className: "rogue",
      level: 5,
      unitId: "rogue_uncanny_dodge",
    });
    const fighter = base.combatants.get(fighterId)!;
    const state = {
      ...base,
      combatants: new Map(base.combatants).set(fighterId, {
        ...fighter,
        concentration: {
          sourceSpellId: "readied_acid_splash",
          effectKind: "readiedSpell",
        },
      }),
    } satisfies BattleState;
    const afterReaction = resolveGoblinScimitarHitReduction({
      state,
      unitId: "rogue_uncanny_dodge",
      damageRoll: 6,
    });
    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "attack",
      attackName: "Scimitar",
    };
    if (afterReaction.tag !== "needsHoles") {
      throw new Error("Expected post-reaction Concentration save.");
    }
    expect(afterReaction.snapshot.pendingReaction).toBeNull();
    const concentration = findHole(
      afterReaction.holes,
      "concentrationSavingThrow",
    );
    expect(concentration).toMatchObject({ damageAmount: 4, dc: 10 });

    const resolved = resolveBattleSubject({
      state: afterReaction.state,
      subject,
      fills: [concentrationSavingThrowFill(concentration, false)],
    });

    if (resolved.tag !== "resolved") throw new Error("Expected resolved.");
    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(Hp(8));
    expect(resolved.state.combatants.get(fighterId)?.concentration).toBeNull();
  });

  test("pending attack-damage Concentration save blocks unrelated subjects", () => {
    const base = goblinAttacksReactionModifierCharacter({
      unit: uncannyDodgeUnit(),
      className: "rogue",
      level: 5,
      unitId: "rogue_uncanny_dodge",
    });
    const fighter = base.combatants.get(fighterId)!;
    const state = {
      ...base,
      combatants: new Map(base.combatants).set(fighterId, {
        ...fighter,
        concentration: {
          sourceSpellId: "readied_acid_splash",
          effectKind: "readiedSpell",
        },
      }),
    } satisfies BattleState;
    const afterReaction = resolveGoblinScimitarHitReduction({
      state,
      unitId: "rogue_uncanny_dodge",
      damageRoll: 6,
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error("Expected post-reaction Concentration save.");
    }

    const blocked = resolveBattleSubject({
      state: afterReaction.state,
      subject: {
        tag: "runtimeCommand",
        actorId: goblinId,
        command: "endTurn",
      },
      fills: [],
    });

    expect(blocked).toMatchObject({ tag: "invalid", reason: "staleSubject" });
  });
});
