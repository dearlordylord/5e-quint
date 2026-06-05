import {
  startBattleRight,
  requireResolved,
  goblinAttackSubject,
  attackInitialTargetHole,
  attackRollHoleAfterTarget,
  requireHole,
  findHole,
  targetFill,
  attackRollFill,
  interruptDecisionFill,
  savingThrowOutcomeFill,
  damageRollFill,
  damageRollFillWithGroups,
  characterSeed,
  statBlockCreatureInit,
  resistantSkeletonCreatureInit,
  rageResource,
  reactionModifierUnitRefWithProfile,
  monkDeflectAttacksFocusResource,
  goblinScimitarHitReactionSetup,
  reactionModifierChoice,
  reactionModifierReductionRollFill,
  barbarianRageUnit,
  fighterId,
  goblinId,
  skeletonId,
  unitLibrary,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
  battleId,
  battleReactionRollOrDamageReductionSupportForUnit,
  battleUnitSupportProfilesForUnit,
  Either,
  endTurn,
  Hp,
  resolveBattleInterrupt,
  resolveBattleSubject,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: Deflect Attacks", () => {
  test("Deflect Attacks redirect support comes from authored mechanics", () => {
    const unit = unitLibrary.requireUnit("monk_deflect_attacks");

    expect(battleReactionRollOrDamageReductionSupportForUnit(unit)).toBe(
      "attackDamageReductionZeroDamageRedirect",
    );
    expect(battleUnitSupportProfilesForUnit({ unit })).toEqual(
      Either.right([
        ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
      ]),
    );
  });

  test("Deflect Attacks asks for redirect facts after reducing attack damage to 0", () => {
    const unit = unitLibrary.requireUnit("monk_deflect_attacks");
    const state = startBattleRight({
      battleId: battleId("battle-deflect-attacks-redirect-holes"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        resistantSkeletonCreatureInit({ initiative: 15 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Monk",
          initiative: 10,
          classLevels: [{ className: "monk", level: 3 }],
          attack: null,
          resources: [monkDeflectAttacksFocusResource()],
          unitFeatures: [{ unit }],
          characterUnitRefs: [
            reactionModifierUnitRefWithProfile(
              unit.id,
              ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
            ),
          ],
        }),
      ],
    });
    const setup = goblinScimitarHitReactionSetup(state);
    if (setup.result.tag !== "needsHoles") {
      throw new Error("Expected Deflect Attacks Reaction window.");
    }
    const choice = reactionModifierChoice(
      setup.result.snapshot.pendingInterrupt!.choices,
      unit.id,
      "attackDamageReduction",
    );
    const afterReaction = resolveBattleInterrupt({
      state: setup.result.state,
      fill: interruptDecisionFill(
        findHole(setup.result.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: unit.id,
            modifierKind: "attackDamageReduction",
            fills: [reactionModifierReductionRollFill(choice, 10)],
          },
        },
      ),
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error("Expected attack damage roll.");
    }
    const damage = requireHole(afterReaction, "rolledDice");
    const awaitingRedirect = resolveBattleSubject({
      state: afterReaction.state,
      subject: setup.subject,
      fills: [...setup.prefixFills, damageRollFill(damage, 6)],
    });

    expect(awaitingRedirect).toMatchObject({
      tag: "needsHoles",
      holes: [
        { kind: "targetChoice", label: "Deflect Attacks redirect target" },
        {
          kind: "savingThrowOutcome",
          label: "Deflect Attacks Dexterity saving throw",
        },
        { kind: "rolledDice", label: "Deflect Attacks redirected damage" },
      ],
    });
  });

  test("Deflect Attacks does not redirect when Resistance alone lowers reduced damage to 0", () => {
    const unit = unitLibrary.requireUnit("monk_deflect_attacks");
    const rage = barbarianRageUnit();
    const state = startBattleRight({
      battleId: battleId("battle-deflect-attacks-redirect-pre-resistance"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Raging Monk",
          initiative: 20,
          classLevels: [
            { className: "monk", level: 3 },
            { className: "barbarian", level: 1 },
          ],
          attack: null,
          resources: [monkDeflectAttacksFocusResource(), rageResource()],
          unitFeatures: [{ unit }, { unit: rage }],
          characterUnitRefs: [
            reactionModifierUnitRefWithProfile(
              unit.id,
              ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
            ),
          ],
        }),
        statBlockCreatureInit({ initiative: 10 }),
        resistantSkeletonCreatureInit({ initiative: 5 }),
      ],
    });
    const raging = requireResolved(
      resolveBattleSubject({
        state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          unitId: "barbarian_rage",
        },
        fills: [],
      }),
    );
    const goblinTurn = requireResolved(
      endTurn({ state: raging.state, actorId: fighterId }),
    ).state;
    const setup = goblinScimitarHitReactionSetup(goblinTurn);
    if (setup.result.tag !== "needsHoles") {
      throw new Error("Expected Deflect Attacks Reaction window.");
    }
    const choice = reactionModifierChoice(
      setup.result.snapshot.pendingInterrupt!.choices,
      unit.id,
      "attackDamageReduction",
    );
    const afterReaction = resolveBattleInterrupt({
      state: setup.result.state,
      fill: interruptDecisionFill(
        findHole(setup.result.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: unit.id,
            modifierKind: "attackDamageReduction",
            fills: [reactionModifierReductionRollFill(choice, 4)],
          },
        },
      ),
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error("Expected attack damage roll.");
    }
    const damage = requireHole(afterReaction, "rolledDice");
    const resolved = resolveBattleSubject({
      state: afterReaction.state,
      subject: setup.subject,
      fills: [...setup.prefixFills, damageRollFill(damage, 6)],
    });

    if (resolved.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${resolved.tag}.`);
    }
    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(Hp(12));
    const monk = resolved.state.combatants.get(fighterId);
    if (monk?.origin.kind !== "character") {
      throw new Error("Expected character Monk.");
    }
    expect(
      monk.origin.resources.find(
        (resource) => resource.unit.id === "monk_monks_focus",
      )?.usesRemaining,
    ).toBe(3);
  });

  test("Deflect Attacks spends a Focus Point and deals same-type redirected damage on a failed save", () => {
    const unit = unitLibrary.requireUnit("monk_deflect_attacks");
    const state = startBattleRight({
      battleId: battleId("battle-deflect-attacks-redirect-damage"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        resistantSkeletonCreatureInit({ initiative: 15 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Monk",
          initiative: 10,
          classLevels: [{ className: "monk", level: 3 }],
          attack: null,
          resources: [monkDeflectAttacksFocusResource()],
          unitFeatures: [{ unit }],
          characterUnitRefs: [
            reactionModifierUnitRefWithProfile(
              unit.id,
              ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
            ),
          ],
        }),
      ],
    });
    const setup = goblinScimitarHitReactionSetup(state);
    if (setup.result.tag !== "needsHoles") {
      throw new Error("Expected Deflect Attacks Reaction window.");
    }
    const choice = reactionModifierChoice(
      setup.result.snapshot.pendingInterrupt!.choices,
      unit.id,
      "attackDamageReduction",
    );
    const afterReaction = resolveBattleInterrupt({
      state: setup.result.state,
      fill: interruptDecisionFill(
        findHole(setup.result.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: unit.id,
            modifierKind: "attackDamageReduction",
            fills: [reactionModifierReductionRollFill(choice, 10)],
          },
        },
      ),
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error("Expected attack damage roll.");
    }
    const damage = requireHole(afterReaction, "rolledDice");
    const awaitingRedirect = resolveBattleSubject({
      state: afterReaction.state,
      subject: setup.subject,
      fills: [...setup.prefixFills, damageRollFill(damage, 6)],
    });
    if (awaitingRedirect.tag !== "needsHoles") {
      throw new Error("Expected Deflect Attacks redirect holes.");
    }
    const redirectTarget = findHole(awaitingRedirect.holes, "targetChoice");
    const redirectSave = findHole(awaitingRedirect.holes, "savingThrowOutcome");
    const redirectDamage = findHole(awaitingRedirect.holes, "rolledDice");
    const redirectSaveFill = savingThrowOutcomeFill(redirectSave, [
      { targetId: skeletonId, succeeded: false },
    ]);
    expect("area" in redirectSaveFill.value).toBe(false);
    const resolved = resolveBattleSubject({
      state: awaitingRedirect.state,
      subject: setup.subject,
      fills: [
        ...setup.prefixFills,
        damageRollFill(damage, 6),
        targetFill(redirectTarget, skeletonId, [
          {
            kind: "meleeRedirectTargetWithin5Feet",
            sourceId: fighterId,
            targetId: skeletonId,
          },
        ]),
        redirectSaveFill,
        damageRollFillWithGroups(redirectDamage, [[5, 5]]),
      ],
    });

    if (resolved.tag !== "resolved") throw new Error("Expected resolved.");
    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(Hp(12));
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(Hp(8));
    const monk = resolved.state.combatants.get(fighterId);
    if (monk?.origin.kind !== "character") {
      throw new Error("Expected character Monk.");
    }
    expect(monk.origin.resources[0]?.usesRemaining).toBe(2);
  });

  test("Deflect Attacks rejects redirected damage dice outside the Martial Arts die", () => {
    const unit = unitLibrary.requireUnit("monk_deflect_attacks");
    const state = startBattleRight({
      battleId: battleId("battle-deflect-attacks-redirect-damage-invalid"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        resistantSkeletonCreatureInit({ initiative: 15 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Monk",
          initiative: 10,
          classLevels: [{ className: "monk", level: 3 }],
          attack: null,
          resources: [monkDeflectAttacksFocusResource()],
          unitFeatures: [{ unit }],
          characterUnitRefs: [
            reactionModifierUnitRefWithProfile(
              unit.id,
              ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
            ),
          ],
        }),
      ],
    });
    const setup = goblinScimitarHitReactionSetup(state);
    if (setup.result.tag !== "needsHoles") {
      throw new Error("Expected Deflect Attacks Reaction window.");
    }
    const choice = reactionModifierChoice(
      setup.result.snapshot.pendingInterrupt!.choices,
      unit.id,
      "attackDamageReduction",
    );
    const afterReaction = resolveBattleInterrupt({
      state: setup.result.state,
      fill: interruptDecisionFill(
        findHole(setup.result.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: unit.id,
            modifierKind: "attackDamageReduction",
            fills: [reactionModifierReductionRollFill(choice, 10)],
          },
        },
      ),
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error("Expected attack damage roll.");
    }
    const damage = requireHole(afterReaction, "rolledDice");
    const awaitingRedirect = resolveBattleSubject({
      state: afterReaction.state,
      subject: setup.subject,
      fills: [...setup.prefixFills, damageRollFill(damage, 6)],
    });
    if (awaitingRedirect.tag !== "needsHoles") {
      throw new Error("Expected Deflect Attacks redirect holes.");
    }
    const rejected = resolveBattleSubject({
      state: awaitingRedirect.state,
      subject: setup.subject,
      fills: [
        ...setup.prefixFills,
        damageRollFill(damage, 6),
        targetFill(
          findHole(awaitingRedirect.holes, "targetChoice"),
          skeletonId,
          [
            {
              kind: "meleeRedirectTargetWithin5Feet",
              sourceId: fighterId,
              targetId: skeletonId,
            },
          ],
        ),
        savingThrowOutcomeFill(
          findHole(awaitingRedirect.holes, "savingThrowOutcome"),
          [{ targetId: skeletonId, succeeded: false }],
        ),
        damageRollFillWithGroups(
          findHole(awaitingRedirect.holes, "rolledDice"),
          [[99, 99]],
        ),
      ],
    });

    expect(rejected).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Attack damage reduction redirect damage must match its projected dice.",
    });
  });

  test("Deflect Attacks successful redirected save spends Focus and applies no redirected damage", () => {
    const unit = unitLibrary.requireUnit("monk_deflect_attacks");
    const state = startBattleRight({
      battleId: battleId("battle-deflect-attacks-redirect-save-success"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        resistantSkeletonCreatureInit({ initiative: 15 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Monk",
          initiative: 10,
          classLevels: [{ className: "monk", level: 3 }],
          attack: null,
          resources: [monkDeflectAttacksFocusResource()],
          unitFeatures: [{ unit }],
          characterUnitRefs: [
            reactionModifierUnitRefWithProfile(
              unit.id,
              ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
            ),
          ],
        }),
      ],
    });
    const setup = goblinScimitarHitReactionSetup(state);
    if (setup.result.tag !== "needsHoles") {
      throw new Error("Expected Deflect Attacks Reaction window.");
    }
    const choice = reactionModifierChoice(
      setup.result.snapshot.pendingInterrupt!.choices,
      unit.id,
      "attackDamageReduction",
    );
    const afterReaction = resolveBattleInterrupt({
      state: setup.result.state,
      fill: interruptDecisionFill(
        findHole(setup.result.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: unit.id,
            modifierKind: "attackDamageReduction",
            fills: [reactionModifierReductionRollFill(choice, 10)],
          },
        },
      ),
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error("Expected attack damage roll.");
    }
    const damage = requireHole(afterReaction, "rolledDice");
    const awaitingRedirect = resolveBattleSubject({
      state: afterReaction.state,
      subject: setup.subject,
      fills: [...setup.prefixFills, damageRollFill(damage, 6)],
    });
    if (awaitingRedirect.tag !== "needsHoles") {
      throw new Error("Expected Deflect Attacks redirect holes.");
    }
    const resolved = resolveBattleSubject({
      state: awaitingRedirect.state,
      subject: setup.subject,
      fills: [
        ...setup.prefixFills,
        damageRollFill(damage, 6),
        targetFill(
          findHole(awaitingRedirect.holes, "targetChoice"),
          skeletonId,
          [
            {
              kind: "meleeRedirectTargetWithin5Feet",
              sourceId: fighterId,
              targetId: skeletonId,
            },
          ],
        ),
        savingThrowOutcomeFill(
          findHole(awaitingRedirect.holes, "savingThrowOutcome"),
          [{ targetId: skeletonId, succeeded: true }],
        ),
        damageRollFillWithGroups(
          findHole(awaitingRedirect.holes, "rolledDice"),
          [[5, 5]],
        ),
      ],
    });

    if (resolved.tag !== "resolved") throw new Error("Expected resolved.");
    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(Hp(12));
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(
      state.combatants.get(skeletonId)?.hp,
    );
    const monk = resolved.state.combatants.get(fighterId);
    if (monk?.origin.kind !== "character") {
      throw new Error("Expected character Monk.");
    }
    expect(monk.origin.resources[0]?.usesRemaining).toBe(2);
  });

  test("Deflect Attacks rejects redirect targets without the required attack-kind spatial fact", () => {
    const unit = unitLibrary.requireUnit("monk_deflect_attacks");
    const state = startBattleRight({
      battleId: battleId("battle-deflect-attacks-redirect-target-invalid"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Monk",
          initiative: 10,
          classLevels: [{ className: "monk", level: 3 }],
          attack: null,
          resources: [monkDeflectAttacksFocusResource()],
          unitFeatures: [{ unit }],
          characterUnitRefs: [
            reactionModifierUnitRefWithProfile(
              unit.id,
              ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
            ),
          ],
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
      throw new Error("Expected Deflect Attacks Reaction window.");
    }
    const choice = reactionModifierChoice(
      awaitingReaction.snapshot.pendingInterrupt!.choices,
      unit.id,
      "attackDamageReduction",
    );
    const afterReaction = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        findHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: unit.id,
            modifierKind: "attackDamageReduction",
            fills: [reactionModifierReductionRollFill(choice, 10)],
          },
        },
      ),
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error("Expected shortbow damage roll.");
    }
    const damage = requireHole(afterReaction, "rolledDice");
    const awaitingRedirect = resolveBattleSubject({
      state: afterReaction.state,
      subject,
      fills: [
        targetFill(target, fighterId),
        attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
        damageRollFill(damage, 6),
      ],
    });
    if (awaitingRedirect.tag !== "needsHoles") {
      throw new Error("Expected Deflect Attacks redirect holes.");
    }
    const rejected = resolveBattleSubject({
      state: awaitingRedirect.state,
      subject,
      fills: [
        targetFill(target, fighterId),
        attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
        damageRollFill(damage, 6),
        targetFill(findHole(awaitingRedirect.holes, "targetChoice"), goblinId, [
          {
            kind: "meleeRedirectTargetWithin5Feet",
            sourceId: fighterId,
            targetId: goblinId,
          },
        ]),
        savingThrowOutcomeFill(
          findHole(awaitingRedirect.holes, "savingThrowOutcome"),
          [{ targetId: goblinId, succeeded: false }],
        ),
        damageRollFillWithGroups(
          findHole(awaitingRedirect.holes, "rolledDice"),
          [[5, 5]],
        ),
      ],
    });

    expect(rejected).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Attack damage reduction redirect target is not eligible.",
    });
  });
});
