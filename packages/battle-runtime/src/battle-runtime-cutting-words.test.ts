import { attackDamageInterruptionFrame } from "./battle-reducer/attack-damage-events.ts";
import { classLevel } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import { Schema } from "effect";
import * as Either from "effect/Either";
import { combatantId } from "./identity.ts";
import {
  attackDamageHoleAfterHit,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  battleId,
  battleReactionRollOrDamageReductionSupportForUnit,
  characterBattleFeatureInitForTest,
  characterSeed,
  cuttingWordsAttackOnlyUnit,
  cuttingWordsDamageOnlyUnit,
  cuttingWordsResource,
  cuttingWordsUnit,
  damageRollFill,
  difficultyClass,
  fighterId,
  findHole,
  goblinAttackSubject,
  goblinId,
  holeId,
  Hp,
  interruptDecisionFill,
  movementFeet,
  reactionModifierChoice,
  reactionModifierUnitRef,
  requireCharacterUnitProcedureRefForTest,
  requireHole,
  resistantSkeletonCreatureInit,
  resolveBattleInterrupt,
  resolveBattleSubject,
  resolveSuccessfulAbilityCheckReactionReduction,
  battleFrontierInterruptDecisionForState,
  rolledDiceGroup,
  skeletonId,
  startBattleRight,
  startBattleSessionRight,
  statBlockCreatureInit,
  targetFill,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import {
  BattleCheckpointFrontierEnvelopeSchema,
  battleCheckpointFrontierEnvelope,
} from "./index.ts";

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
          unitFeatures: [
            characterBattleFeatureInitForTest(cuttingWordsAttackOnly, [
              { className: "bard", level: classLevel(3) },
            ]),
          ],
          characterUnitRefs: [
            {
              unit: cuttingWordsAttackOnly,
              supportProfiles: ["reactionRollOrDamageReduction"],
            },
          ],
        }),
      ],
    });
    const subject = goblinAttackSubject(state, "Scimitar");
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
      battleFrontierInterruptDecisionForState(awaitingReaction.state)!.choices,
      cuttingWordsAttackOnly.id,
      "attackRollReduction",
    );
    const encodedAttackRollFrontier = Schema.encodeSync(
      BattleCheckpointFrontierEnvelopeSchema,
    )(battleCheckpointFrontierEnvelope(awaitingReaction.state));
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleCheckpointFrontierEnvelopeSchema)(
          encodedAttackRollFrontier,
        ),
      ),
    ).toBe(true);
    if (encodedAttackRollFrontier.frontier.kind !== "interruptDecision") {
      throw new Error("Expected the encoded attack-roll Reaction frontier.");
    }
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleCheckpointFrontierEnvelopeSchema)({
          ...encodedAttackRollFrontier,
          frontier: {
            ...encodedAttackRollFrontier.frontier,
            trigger: "attackDamage",
            decisionHole: {
              ...encodedAttackRollFrontier.frontier.decisionHole,
              trigger: "attackDamage",
            },
          },
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleCheckpointFrontierEnvelopeSchema)({
          ...encodedAttackRollFrontier,
          frontier: {
            ...encodedAttackRollFrontier.frontier,
            choices: encodedAttackRollFrontier.frontier.choices.map(
              (candidate) =>
                candidate.kind === "reactionRollOrDamageReduction" &&
                candidate.choice.kind === "attackRollReduction"
                  ? {
                      ...candidate,
                      choice: {
                        ...candidate.choice,
                        kind: "abilityCheckReduction",
                      },
                    }
                  : candidate,
            ),
          },
        }),
      ),
    ).toBe(true);
    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        findHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            procedureRef: choice.choice.procedureRef,
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
            {
              unit: cuttingWordsDamageOnly,
              supportProfiles: ["reactionRollOrDamageReduction"],
            },
          ],
        }),
      ],
    });
    const subject = goblinAttackSubject(state, "Scimitar");
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
    const checkpoint = awaitingReaction.state.interruptStack.at(-1);
    if (
      checkpoint?.kind !== "interruptCheckpoint" ||
      checkpoint.frame.trigger !== "attackDamage"
    ) {
      throw new Error("Expected an Attack Damage interruption checkpoint.");
    }
    const frame = checkpoint.frame.continuation;
    expect(frame).toMatchObject({
      kind: "attackDamage",
      participant: subject,
      target: { combatantId: skeletonId },
      attackResult: { total: 20, naturalD20: 15 },
      damageInput: { kind: "rolledDamage" },
      criticalConsequence: { kind: "ordinaryHit" },
      phase: "attackDamage",
      continuation: { damageDisposition: { kind: "ordinaryDamage" } },
    });
    expect(
      attackDamageInterruptionFrame({
        participant: frame.participant,
        targetId: frame.target.combatantId,
        targetSpatialFacts: frame.target.spatialFacts,
        attackResult: frame.attackResult,
        damageInput: frame.damageInput,
        critical: true,
        continuation: frame.continuation,
      }).criticalConsequence,
    ).toEqual({ kind: "criticalHit" });
    const choice = reactionModifierChoice(
      battleFrontierInterruptDecisionForState(awaitingReaction.state)!.choices,
      cuttingWordsDamageOnly.id,
      "damageRollReduction",
    );
    const encodedDamageRollFrontier = Schema.encodeSync(
      BattleCheckpointFrontierEnvelopeSchema,
    )(battleCheckpointFrontierEnvelope(awaitingReaction.state));
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleCheckpointFrontierEnvelopeSchema)(
          encodedDamageRollFrontier,
        ),
      ),
    ).toBe(true);
    if (encodedDamageRollFrontier.frontier.kind !== "interruptDecision") {
      throw new Error("Expected the encoded damage-roll Reaction frontier.");
    }
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleCheckpointFrontierEnvelopeSchema)({
          ...encodedDamageRollFrontier,
          frontier: {
            ...encodedDamageRollFrontier.frontier,
            trigger: "attackHit",
            decisionHole: {
              ...encodedDamageRollFrontier.frontier.decisionHole,
              trigger: "attackHit",
            },
          },
        }),
      ),
    ).toBe(true);
    const resolved = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        findHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            procedureRef: choice.choice.procedureRef,
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
    const session = startBattleSessionRight({
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
          unitFeatures: [
            characterBattleFeatureInitForTest(cuttingWords, [
              { className: "bard", level: classLevel(3) },
            ]),
          ],
          characterUnitRefs: [reactionModifierUnitRef(cuttingWords.id)],
        }),
      ],
    });
    const state = session.state;
    const procedureRef = requireCharacterUnitProcedureRefForTest(
      session,
      fighterId,
      cuttingWords.id,
    );

    const resolved = resolveSuccessfulAbilityCheckReactionReduction({
      state,
      reactorId: fighterId,
      procedureRef,
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
            sourceProcedureRef: procedureRef,
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
    const session = startBattleSessionRight({
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
          unitFeatures: [
            characterBattleFeatureInitForTest(cuttingWords, [
              { className: "bard", level: classLevel(3) },
            ]),
          ],
          characterUnitRefs: [reactionModifierUnitRef(cuttingWords.id)],
        }),
      ],
    });
    const state = session.state;
    const procedureRef = requireCharacterUnitProcedureRefForTest(
      session,
      fighterId,
      cuttingWords.id,
    );

    const resolved = resolveSuccessfulAbilityCheckReactionReduction({
      state,
      reactorId: fighterId,
      procedureRef,
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
            sourceProcedureRef: procedureRef,
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

  test("Cutting Words ability-check reduction rejects pre-reduction failures, missing range facts, and missing actors", () => {
    const cuttingWords = cuttingWordsUnit();
    const session = startBattleSessionRight({
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
          unitFeatures: [
            characterBattleFeatureInitForTest(cuttingWords, [
              { className: "bard", level: classLevel(3) },
            ]),
          ],
          characterUnitRefs: [reactionModifierUnitRef(cuttingWords.id)],
        }),
      ],
    });
    const state = session.state;
    const procedureRef = requireCharacterUnitProcedureRefForTest(
      session,
      fighterId,
      cuttingWords.id,
    );

    expect(
      resolveSuccessfulAbilityCheckReactionReduction({
        state,
        reactorId: fighterId,
        procedureRef,
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
              sourceProcedureRef: procedureRef,
              rangeFeet: movementFeet(60),
            },
          ],
        },
        reductionRoll: 3,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Ability-check Reaction reduction requires an already-successful ability check.",
    });

    expect(
      resolveSuccessfulAbilityCheckReactionReduction({
        state,
        reactorId: fighterId,
        procedureRef,
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
      message:
        "Ability-check Reaction reduction requires the creature to be within range.",
    });

    expect(
      resolveSuccessfulAbilityCheckReactionReduction({
        state,
        reactorId: fighterId,
        procedureRef,
        abilityCheck: {
          actorId: combatantId("missing-cutting-words-target"),
          ability: "str",
          originalTotal: 15,
          dc: difficultyClass(14),
          targetSpatialFacts: [],
        },
        reductionRoll: 3,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Ability-check Reaction reduction is no longer available.",
    });
  });

  test("Cutting Words ability-check reduction requires Bardic Inspiration uses", () => {
    const cuttingWords = cuttingWordsUnit();
    const abilityCheck = (
      procedureRef: ReturnType<typeof requireCharacterUnitProcedureRefForTest>,
    ) => ({
      actorId: goblinId,
      ability: "str" as const,
      originalTotal: 15,
      dc: difficultyClass(14),
      targetSpatialFacts: [
        {
          kind: "reactionRollOrDamageReductionTargetWithinRange" as const,
          reactorId: fighterId,
          targetId: goblinId,
          sourceProcedureRef: procedureRef,
          rangeFeet: movementFeet(60),
        },
      ],
    });
    const sessionWithoutResource = startBattleSessionRight({
      battleId: battleId("battle-cutting-words-ability-check-no-resource"),
      combatants: [
        statBlockCreatureInit({ initiative: 20 }),
        characterSeed({
          combatantId: fighterId,
          displayName: "Lore Bard",
          initiative: 10,
          classLevels: [{ className: "bard", level: 3 }],
          attack: null,
          resources: [cuttingWordsResource({ usesRemaining: 0 })],
          unitFeatures: [
            characterBattleFeatureInitForTest(cuttingWords, [
              { className: "bard", level: classLevel(3) },
            ]),
          ],
          characterUnitRefs: [reactionModifierUnitRef(cuttingWords.id)],
        }),
      ],
    });

    expect(
      resolveSuccessfulAbilityCheckReactionReduction({
        state: sessionWithoutResource.state,
        reactorId: fighterId,
        procedureRef: requireCharacterUnitProcedureRefForTest(
          sessionWithoutResource,
          fighterId,
          cuttingWords.id,
        ),
        abilityCheck: abilityCheck(
          requireCharacterUnitProcedureRefForTest(
            sessionWithoutResource,
            fighterId,
            cuttingWords.id,
          ),
        ),
        reductionRoll: 3,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Ability-check Reaction reduction is no longer available.",
    });

    const sessionWithoutUses = startBattleSessionRight({
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
          unitFeatures: [
            characterBattleFeatureInitForTest(cuttingWords, [
              { className: "bard", level: classLevel(3) },
            ]),
          ],
          characterUnitRefs: [reactionModifierUnitRef(cuttingWords.id)],
        }),
      ],
    });

    expect(
      resolveSuccessfulAbilityCheckReactionReduction({
        state: sessionWithoutUses.state,
        reactorId: fighterId,
        procedureRef: requireCharacterUnitProcedureRefForTest(
          sessionWithoutUses,
          fighterId,
          cuttingWords.id,
        ),
        abilityCheck: abilityCheck(
          requireCharacterUnitProcedureRefForTest(
            sessionWithoutUses,
            fighterId,
            cuttingWords.id,
          ),
        ),
        reductionRoll: 3,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Ability-check Reaction reduction is no longer available.",
    });
  });
});
