import {
  startBattleRight,
  goblinAttackSubject,
  attackInitialTargetHole,
  attackRollHoleAfterTarget,
  attackDamageHoleAfterHit,
  requireHole,
  findHole,
  targetFill,
  attackRollFill,
  reactionDecisionFill,
  damageRollFill,
  rolledDiceGroup,
  characterSeed,
  statBlockCreatureInit,
  resistantSkeletonCreatureInit,
  reactionModifierUnitRef,
  cuttingWordsResource,
  reactionModifierChoice,
  cuttingWordsUnit,
  cuttingWordsDamageOnlyUnit,
  cuttingWordsAttackOnlyUnit,
  fighterId,
  goblinId,
  skeletonId,
  unitLibrary,
  battleId,
  battleReactionRollOrDamageReductionSupportForUnit,
  difficultyClass,
  holeId,
  Hp,
  movementFeet,
  resolveBattleReaction,
  resolveBattleSubject,
  resolveSuccessfulAbilityCheckReactionReduction,
} from "./battle-runtime-test-support.ts";
import type { BattleSubject } from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: Cutting Words", () => {
  test("full SRD Cutting Words is admitted with ability-check reactions supported", () => {
    expect(
      battleReactionRollOrDamageReductionSupportForUnit(
        unitLibrary.requireUnit("bard_cutting_words"),
      ),
    ).toBe("reactionRollOrDamageReduction");
  });

  test("Cutting Words attack-roll reduction can turn a hit into a miss and ignores stale damage fills", () => {
    const cuttingWordsAttackOnly = cuttingWordsAttackOnlyUnit();
    const state = startBattleRight({
      battleId: battleId("battle-cutting-words-attack-roll"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Lore Bard",
          initiative: 10,
          classLevels: [{ className: "bard", level: 3 }],
          attack: null,
          resources: [cuttingWordsResource({ unit: cuttingWordsAttackOnly })],
          unitFeatures: [{ unit: cuttingWordsAttackOnly }],
          characterUnitRefs: [
            reactionModifierUnitRef(cuttingWordsAttackOnly.id),
          ],
        }),
      ],
    });
    const subject: BattleSubject = {
      tag: "action",
      actorId: goblinId,
      action: "attack",
      attackName: "Scimitar",
    };
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
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, fighterId),
        attackRollFill(attackRoll, { total: 12, naturalD20: 10 }),
        {
          kind: "rolledDice",
          holeId: holeId("battle:attack:damage-result:1d6+2-slashing"),
          value: [rolledDiceGroup([6])],
        },
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Cutting Words attack-hit Reaction window.");
    }
    const choice = reactionModifierChoice(
      awaitingReaction.snapshot.pendingReaction!.choices,
      cuttingWordsAttackOnly.id,
      "attackRollReduction",
    );
    const resolved = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        findHole(awaitingReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: cuttingWordsAttackOnly.id,
            modifierKind: "attackRollReduction",
            fills: [
              {
                kind: "rolledDice",
                holeId: choice.initialHoles[0]!.holeId,
                value: [rolledDiceGroup([3])],
              },
            ],
          },
        },
      ),
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      state: {
        combatants: expect.any(Map),
      },
    });
    if (resolved.tag !== "resolved") throw new Error("Expected resolved.");
    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(Hp(12));
    const bard = resolved.state.combatants.get(fighterId);
    if (bard?.origin.kind !== "character") {
      throw new Error("Expected character Bard.");
    }
    expect(bard.origin.resources[0]?.usesRemaining).toBe(0);
  });

  test("Cutting Words damage-roll reduction applies before target damage adjustments", () => {
    const cuttingWordsDamageOnly = cuttingWordsDamageOnlyUnit();
    const state = startBattleRight({
      battleId: battleId("battle-cutting-words-damage-roll"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        resistantSkeletonCreatureInit({ initiative: 10 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Lore Bard",
          initiative: 5,
          classLevels: [{ className: "bard", level: 3 }],
          attack: null,
          resources: [cuttingWordsResource({ unit: cuttingWordsDamageOnly })],
          characterUnitRefs: [
            reactionModifierUnitRef(cuttingWordsDamageOnly.id),
          ],
        }),
      ],
    });
    const subject = goblinAttackSubject("Scimitar");
    const target = attackInitialTargetHole(state, subject);
    const attackRoll = attackRollHoleAfterTarget(
      state,
      target,
      subject,
      skeletonId,
    );
    const damage = attackDamageHoleAfterHit(
      state,
      target,
      attackRoll,
      { total: 20, naturalD20: 15 },
      subject,
      skeletonId,
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, skeletonId),
        attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
        damageRollFill(damage, 6),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Cutting Words damage Reaction window.");
    }
    const choice = reactionModifierChoice(
      awaitingReaction.snapshot.pendingReaction!.choices,
      cuttingWordsDamageOnly.id,
      "damageRollReduction",
    );
    const resolved = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        findHole(awaitingReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            unitId: cuttingWordsDamageOnly.id,
            modifierKind: "damageRollReduction",
            fills: [
              {
                kind: "rolledDice",
                holeId: choice.initialHoles[0]!.holeId,
                value: [rolledDiceGroup([3])],
              },
            ],
          },
        },
      ),
    });

    if (resolved.tag !== "resolved") throw new Error("Expected resolved.");
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(Hp(11));
  });

  test("Cutting Words ability-check reduction can turn a success into a failure", () => {
    const cuttingWords = cuttingWordsUnit();
    const state = startBattleRight({
      battleId: battleId("battle-cutting-words-ability-check-converted"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Lore Bard",
          initiative: 10,
          classLevels: [{ className: "bard", level: 3 }],
          attack: null,
          resources: [cuttingWordsResource({ unit: cuttingWords })],
          unitFeatures: [{ unit: cuttingWords }],
          characterUnitRefs: [reactionModifierUnitRef(cuttingWords.id)],
        }),
      ],
    });

    const resolved = resolveSuccessfulAbilityCheckReactionReduction({
      state,
      reactorId: fighterId,
      unitId: cuttingWords.id,
      abilityCheck: {
        actorId: goblinId,
        ability: "str",
        originalTotal: 15,
        dc: difficultyClass(14),
        targetSpatialFacts: [
          {
            kind: "reactionRollOrDamageReductionTargetWithinRange",
            reactorId: fighterId,
            targetId: goblinId,
            unitId: cuttingWords.id,
            rangeFeet: movementFeet(60),
          },
        ],
      },
      reductionRoll: 3,
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      abilityCheckReduction: {
        reducedTotal: 12,
        reducedSucceeded: false,
      },
    });
    if (resolved.tag !== "resolved") throw new Error("Expected resolved.");
    const bard = resolved.state.combatants.get(fighterId);
    if (bard?.origin.kind !== "character") {
      throw new Error("Expected character Bard.");
    }
    expect(bard.reactionAvailable).toBe(false);
    expect(bard.origin.resources[0]?.usesRemaining).toBe(0);
  });

  test("Cutting Words ability-check reduction can leave a success successful", () => {
    const cuttingWords = cuttingWordsUnit();
    const state = startBattleRight({
      battleId: battleId("battle-cutting-words-ability-check-still-success"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Lore Bard",
          initiative: 10,
          classLevels: [{ className: "bard", level: 3 }],
          attack: null,
          resources: [cuttingWordsResource({ unit: cuttingWords })],
          unitFeatures: [{ unit: cuttingWords }],
          characterUnitRefs: [reactionModifierUnitRef(cuttingWords.id)],
        }),
      ],
    });

    const resolved = resolveSuccessfulAbilityCheckReactionReduction({
      state,
      reactorId: fighterId,
      unitId: cuttingWords.id,
      abilityCheck: {
        actorId: goblinId,
        ability: "dex",
        skillOrToolLabel: "Stealth",
        originalTotal: 19,
        dc: difficultyClass(14),
        targetSpatialFacts: [
          {
            kind: "reactionRollOrDamageReductionTargetWithinRange",
            reactorId: fighterId,
            targetId: goblinId,
            unitId: cuttingWords.id,
            rangeFeet: movementFeet(60),
          },
        ],
      },
      reductionRoll: 3,
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      abilityCheckReduction: {
        reducedTotal: 16,
        reducedSucceeded: true,
      },
    });
    if (resolved.tag !== "resolved") throw new Error("Expected resolved.");
    const bard = resolved.state.combatants.get(fighterId);
    if (bard?.origin.kind !== "character") {
      throw new Error("Expected character Bard.");
    }
    expect(bard.reactionAvailable).toBe(false);
    expect(bard.origin.resources[0]?.usesRemaining).toBe(0);
  });

  test("Cutting Words ability-check reduction rejects pre-reduction failures and missing range facts", () => {
    const cuttingWords = cuttingWordsUnit();
    const state = startBattleRight({
      battleId: battleId("battle-cutting-words-ability-check-rejected"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Lore Bard",
          initiative: 10,
          classLevels: [{ className: "bard", level: 3 }],
          attack: null,
          resources: [cuttingWordsResource({ unit: cuttingWords })],
          unitFeatures: [{ unit: cuttingWords }],
          characterUnitRefs: [reactionModifierUnitRef(cuttingWords.id)],
        }),
      ],
    });

    expect(
      resolveSuccessfulAbilityCheckReactionReduction({
        state,
        reactorId: fighterId,
        unitId: cuttingWords.id,
        abilityCheck: {
          actorId: goblinId,
          ability: "str",
          originalTotal: 13,
          dc: difficultyClass(14),
          targetSpatialFacts: [
            {
              kind: "reactionRollOrDamageReductionTargetWithinRange",
              reactorId: fighterId,
              targetId: goblinId,
              unitId: cuttingWords.id,
              rangeFeet: movementFeet(60),
            },
          ],
        },
        reductionRoll: 3,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Cutting Words requires an already-successful ability check.",
    });

    expect(
      resolveSuccessfulAbilityCheckReactionReduction({
        state,
        reactorId: fighterId,
        unitId: cuttingWords.id,
        abilityCheck: {
          actorId: goblinId,
          ability: "str",
          originalTotal: 15,
          dc: difficultyClass(14),
          targetSpatialFacts: [],
        },
        reductionRoll: 3,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Cutting Words requires the creature to be within range.",
    });
  });

  test("Cutting Words ability-check reduction requires Bardic Inspiration uses", () => {
    const cuttingWords = cuttingWordsUnit();
    const abilityCheck = {
      actorId: goblinId,
      ability: "str" as const,
      originalTotal: 15,
      dc: difficultyClass(14),
      targetSpatialFacts: [
        {
          kind: "reactionRollOrDamageReductionTargetWithinRange" as const,
          reactorId: fighterId,
          targetId: goblinId,
          unitId: cuttingWords.id,
          rangeFeet: movementFeet(60),
        },
      ],
    };
    const stateWithoutResource = startBattleRight({
      battleId: battleId("battle-cutting-words-ability-check-no-resource"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Lore Bard",
          initiative: 10,
          classLevels: [{ className: "bard", level: 3 }],
          attack: null,
          resources: [],
          unitFeatures: [{ unit: cuttingWords }],
          characterUnitRefs: [reactionModifierUnitRef(cuttingWords.id)],
        }),
      ],
    });

    expect(
      resolveSuccessfulAbilityCheckReactionReduction({
        state: stateWithoutResource,
        reactorId: fighterId,
        unitId: cuttingWords.id,
        abilityCheck,
        reductionRoll: 3,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Ability-check Reaction reduction is no longer available.",
    });

    const stateWithoutUses = startBattleRight({
      battleId: battleId("battle-cutting-words-ability-check-zero-resource"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Lore Bard",
          initiative: 10,
          classLevels: [{ className: "bard", level: 3 }],
          attack: null,
          resources: [
            cuttingWordsResource({ unit: cuttingWords, usesRemaining: 0 }),
          ],
          unitFeatures: [{ unit: cuttingWords }],
          characterUnitRefs: [reactionModifierUnitRef(cuttingWords.id)],
        }),
      ],
    });

    expect(
      resolveSuccessfulAbilityCheckReactionReduction({
        state: stateWithoutUses,
        reactorId: fighterId,
        unitId: cuttingWords.id,
        abilityCheck,
        reductionRoll: 3,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Ability-check Reaction reduction is no longer available.",
    });
  });
});
