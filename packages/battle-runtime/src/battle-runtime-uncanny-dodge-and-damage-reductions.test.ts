import { attackDamageInterruptionFrame } from "./battle-reducer.ts";
import {
  classLevel,
  DieRollResult,
  NonNegativeInteger,
} from "@dnd/shared/types";
import {
  battleProcedureExecutionRef,
  battleResourcePoolExecutionRef,
  type BattleProcedureExecutionRef,
} from "./identity.ts";
import { isCharacterBattleCreatureState } from "./battle-reducer/creature-state.ts";
import { REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE } from "./unit-feature-support.ts";
import type {
  BattleInterruptCheckpoint,
  BattleState,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";
import {
  characterBattleFeatureInitForTest,
  applyCondition,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  battleId,
  battleProcedureExecutionRefForTest,
  characterSeed,
  concentrationSavingThrowFill,
  cuttingWordsDamageOnlyUnit,
  cuttingWordsResource,
  fighterId,
  findHole,
  goblinAttacksReactionModifierCharacter,
  goblinAttackSubject,
  goblinId,
  goblinScimitarHitReactionSetup,
  holeId,
  holeInstanceKey,
  Hp,
  interruptDecisionFill,
  reactionModifierChoice,
  reactionModifierUnitRef,
  requireHole,
  resolveBattleInterrupt,
  resolveBattleSubject,
  resolveGoblinScimitarHitReduction,
  rolledDiceGroup,
  skeletonCreatureInit,
  skeletonId,
  snapshotBattle,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  testBattleCreatureStateWithConditions,
  uncannyDodgeUnit,
} from "./battle-runtime-test-support.ts";

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
    const choice = reactionModifierChoice(
      setup.result.snapshot.pendingInterrupt!.choices,
      "rogue_uncanny_dodge",
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
            procedureRef: choice.choice.procedureRef,
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
          unitFeatures: [
            characterBattleFeatureInitForTest(uncannyDodgeUnit(), [
              { className: "rogue", level: classLevel(5) },
            ]),
          ],
          characterUnitRefs: [reactionModifierUnitRef("rogue_uncanny_dodge")],
        }),
      ],
    });
    const subject = goblinAttackSubject(state, "Shortbow");
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
    const procedureRef = requireReactionModifierProcedureRef(
      state,
      fighterId,
      "attackDamageReduction",
    );

    expect(awaitingReaction.snapshot.pendingInterrupt!.choices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "reactionRollOrDamageReduction",
          choice: expect.objectContaining({
            kind: "attackDamageReduction",
            procedureRef,
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
    expect(setup.result.snapshot.pendingInterrupt).toBeNull();
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
          unitFeatures: [
            characterBattleFeatureInitForTest(uncannyDodgeUnit(), [
              { className: "rogue", level: classLevel(5) },
              { className: "bard", level: classLevel(3) },
            ]),
            characterBattleFeatureInitForTest(cuttingWordsDamageOnly, [
              { className: "rogue", level: classLevel(5) },
              { className: "bard", level: classLevel(3) },
            ]),
          ],
          characterUnitRefs: [
            reactionModifierUnitRef("rogue_uncanny_dodge"),
            {
              unit: cuttingWordsDamageOnly,
              supportProfiles: [
                REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
              ],
            },
          ],
        }),
      ],
    });
    const hitReaction = goblinScimitarHitReactionSetup(state);
    if (hitReaction.result.tag !== "needsHoles") {
      throw new Error("Expected attack-hit Reaction window.");
    }

    const hitModifierChoices =
      hitReaction.result.snapshot.pendingInterrupt!.choices.filter(
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
    const beforeDamage = resolveBattleInterrupt({
      state: hitReaction.result.state,
      fill: interruptDecisionFill(
        findHole(hitReaction.result.holes, "interruptDecision"),
        { kind: "decline", responderId: fighterId },
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
      awaitingDamageReaction.snapshot.pendingInterrupt!.choices.filter(
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
    const cuttingWords = cuttingWordsDamageOnlyUnit();
    const state = goblinAttacksReactionModifierCharacter({
      unit: cuttingWords,
      className: "bard",
      level: 3,
      unitId: cuttingWords.id,
      resources: [cuttingWordsResource({ unit: cuttingWords })],
    });
    const subject = goblinAttackSubject(state, "Scimitar");
    const procedureRef = requireReactionModifierProcedureRef(
      state,
      fighterId,
      "attackDamageRollReduction",
    );
    const resourcePoolRef = requireCharacterProcedureResourcePoolRef(
      state,
      fighterId,
      procedureRef,
    );
    const frame: BattleInterruptCheckpoint = {
      trigger: "attackDamage",
      eligibleResponders: [fighterId],
      offeredResponders: [],
      choices: [
        {
          kind: "reactionRollOrDamageReduction",
          reactorId: fighterId,
          choice: {
            kind: "damageRollReduction",
            procedureRef,
            reduction: {
              kind: "rolled",
              dice: 1,
              flatModifier: 0,
              dieSize: 6,
              spends: { resourcePoolRef, amount: 1 },
            },
          },
          initialHoles: [
            {
              kind: "rolledDice",
              holeId: holeId("battle:reaction:modifier-roll"),
              holeInstanceKey: holeInstanceKey("battle:reaction:modifier-roll"),
              label: "Reaction modifier reduction roll",
            },
          ],
        },
      ],
      continuation: attackDamageInterruptionFrame({
        participant: subject,
        targetId: fighterId,
        targetSpatialFacts: [],
        attackResult: { total: 15, naturalD20: DieRollResult(10) },
        damageInput: {
          kind: "rolledDamage",
          damageRollByType: [
            { damageType: "slashing", amount: 5 },
            { damageType: "poison", amount: 4 },
          ],
        },
        critical: false,
        continuation: {
          concentrationSavingThrows: [],
          damageDisposition: { kind: "ordinaryDamage" },
          attackDamageRiders: [],
        },
      }),
    };

    const pendingState = {
      ...state,
      interruptStack: [{ kind: "interruptCheckpoint", frame }],
    } satisfies BattleState;
    const decision =
      snapshotBattle(pendingState).pendingInterrupt?.decisionHole;
    if (decision === undefined) {
      throw new Error("Expected pending interrupt decision.");
    }
    const resolved = resolveBattleInterrupt({
      state: pendingState,
      fill: interruptDecisionFill(decision, {
        kind: "resolve",
        responderId: fighterId,
        choice: {
          kind: "reactionRollOrDamageReduction",
          procedureRef,
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
    const subject = goblinAttackSubject(state, "Scimitar");
    const fighter = state.combatants.get(fighterId);
    if (!isCharacterBattleCreatureState(fighter)) {
      throw new Error(
        "Expected the invalid-choice witness owner to be a character.",
      );
    }
    const procedureRef = battleProcedureExecutionRef(
      fighter.origin.execution.scopeRef,
      NonNegativeInteger(0),
    );
    const resourcePoolRef = battleResourcePoolExecutionRef(
      fighter.origin.execution.scopeRef,
      NonNegativeInteger(0),
    );
    const frame: BattleInterruptCheckpoint = {
      trigger: "attackDamage",
      eligibleResponders: [skeletonId, fighterId],
      offeredResponders: [],
      choices: [
        {
          kind: "reactionRollOrDamageReduction",
          reactorId: skeletonId,
          choice: {
            kind: "attackDamageReduction",
            procedureRef,
            reduction: { kind: "halfDamage" },
          },
          initialHoles: [],
        },
        {
          kind: "reactionRollOrDamageReduction",
          reactorId: fighterId,
          choice: {
            kind: "damageRollReduction",
            procedureRef,
            reduction: {
              kind: "rolled",
              dice: 1,
              flatModifier: 0,
              dieSize: 6,
              spends: { resourcePoolRef, amount: 1 },
            },
          },
          initialHoles: [],
        },
      ],
      continuation: attackDamageInterruptionFrame({
        participant: subject,
        targetId: skeletonId,
        targetSpatialFacts: [],
        attackResult: { total: 15, naturalD20: DieRollResult(10) },
        damageInput: {
          kind: "rolledDamage",
          damageRollByType: [{ damageType: "bludgeoning", amount: 5 }],
        },
        critical: false,
        continuation: {
          concentrationSavingThrows: [],
          damageDisposition: { kind: "ordinaryDamage" },
          attackDamageRiders: [],
        },
      }),
    };
    const pendingState = {
      ...state,
      interruptStack: [{ kind: "interruptCheckpoint", frame }],
    } satisfies BattleState;
    const decision =
      snapshotBattle(pendingState).pendingInterrupt?.decisionHole;
    if (decision === undefined) {
      throw new Error("Expected pending interrupt decision.");
    }

    const resolved = resolveBattleInterrupt({
      state: pendingState,
      fill: interruptDecisionFill(decision, {
        kind: "resolve",
        responderId: skeletonId,
        choice: {
          kind: "reactionRollOrDamageReduction",
          procedureRef,
          modifierKind: "attackDamageReduction",
          fills: [],
        },
      }),
    });

    expect(resolved).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "The selected Reaction modifier is no longer bound to this responder.",
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
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("readied_acid_splash"),
          ),
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
    const subject = goblinAttackSubject(afterReaction.state, "Scimitar");
    expect(afterReaction.snapshot.pendingInterrupt).toBeNull();
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
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("readied_acid_splash"),
          ),
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

function requireReactionModifierProcedureRef(
  state: BattleState,
  combatantId: typeof fighterId,
  modifierKind:
    | "attackRollReduction"
    | "attackDamageRollReduction"
    | "attackDamageReduction"
    | "fallDamageReduction",
): BattleProcedureExecutionRef {
  const combatant = state.combatants.get(combatantId);
  if (!isCharacterBattleCreatureState(combatant)) {
    throw new Error(`Expected character combatant ${combatantId}.`);
  }
  const binding = combatant.origin.execution.procedureBindings.find(
    (candidate) =>
      candidate.procedure.kind === "unitFeature" &&
      candidate.procedure.execution.kind === "reactionRollOrDamageReduction" &&
      candidate.procedure.execution.modifiers.some(
        (modifier) => modifier.kind === modifierKind,
      ),
  );
  if (binding === undefined) {
    throw new Error(`Expected admitted ${modifierKind} procedure.`);
  }
  return binding.procedureRef;
}

function requireCharacterProcedureResourcePoolRef(
  state: BattleState,
  combatantId: typeof fighterId,
  procedureRef: BattleProcedureExecutionRef,
) {
  const combatant = state.combatants.get(combatantId);
  if (!isCharacterBattleCreatureState(combatant)) {
    throw new Error(`Expected character combatant ${combatantId}.`);
  }
  const binding = combatant.origin.execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
  if (
    binding === undefined ||
    (binding.procedure.kind !== "unitFeature" &&
      binding.procedure.kind !== "unitSupportProfile") ||
    binding.procedure.source.kind !== "resourcePool"
  ) {
    throw new Error(`Expected resource-backed procedure ${procedureRef}.`);
  }
  return binding.procedure.source.resourcePoolRef;
}
