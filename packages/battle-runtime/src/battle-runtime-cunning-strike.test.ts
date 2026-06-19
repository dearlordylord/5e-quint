// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.cunning-strike
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L5-A13-ROGUE-CUNNING-STRIKE-BATTLE-RUNTIME rogue_cunning_strike
import { describe, expect, test } from "vitest";

import {
  battleFillEquals,
  type BattleActiveEffect,
  type BattleDamageRollHole,
  type BattleFill,
  type BattleHole,
  type BattleState,
} from "./battle-reducer.ts";
import {
  attackDamageDispositionFill,
  attackDamageHoleAfterHit,
  attackInitialTargetHole,
  attackTargetFill,
  attackRollFill,
  attackRollHoleAfterTarget,
  battleId,
  characterSeed,
  combatantId,
  concentrationSavingThrowFill,
  cunningStrikeFeature,
  cunningStrikeUnitRefs,
  damageRollFillWithGroups,
  elapsedTimeTicks,
  endTurn,
  fighterAttackSubject,
  fighterId,
  goblinId,
  hasCondition,
  interruptDecisionFill,
  movementFill,
  reactionChoiceWithSubject,
  requireHole,
  requireResolved,
  resolveBattleInterrupt,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  sneakAttackFeature,
  startBattleRight,
  statBlockRecord,
  statBlockCreatureInit,
  targetFill,
  testCharacterD20Statistics,
  testDaggerAttack,
  testShortswordAttack,
} from "./battle-runtime-test-support.ts";
import { difficultyClass, movementFeet } from "@dnd/shared/types";

describe("battle runtime: Cunning Strike", () => {
  test("exposes typed Cunning Strike options from an eligible Sneak Attack damage rider", () => {
    const window = cunningStrikeDamageWindow("trip");

    expect(window.damage).toMatchObject({
      kind: "rolledDice",
      attackDamageRiders: [
        expect.objectContaining({
          unitId: "rogue_sneak_attack",
          damage: { dice: 3, dieSize: 6, damageType: "piercing" },
        }),
      ],
      cunningStrikeOptions: [
        expect.objectContaining({
          unitId: "rogue_cunning_strike",
          optionId: "poison",
          sourceDamageRiderUnitId: "rogue_sneak_attack",
          dieCost: { dice: 1, dieSize: 6 },
        }),
        expect.objectContaining({
          unitId: "rogue_cunning_strike",
          optionId: "trip",
          sourceDamageRiderUnitId: "rogue_sneak_attack",
          dieCost: { dice: 1, dieSize: 6 },
        }),
        expect.objectContaining({
          unitId: "rogue_cunning_strike",
          optionId: "withdraw",
          sourceDamageRiderUnitId: "rogue_sneak_attack",
          dieCost: { dice: 1, dieSize: 6 },
        }),
      ],
    });
  });

  test("rolled-dice fill equality includes the selected Cunning Strike option", () => {
    const window = cunningStrikeDamageWindow("trip");
    const roll = requireRolledDiceFill(window.damageAppliedFills);
    const omittedSelection = damageRollFillWithGroups(
      window.damage,
      [[4], [6, 5]],
      ["rogue_sneak_attack"],
    );

    expect(battleFillEquals(roll, { ...roll })).toBe(true);
    expect(battleFillEquals(roll, omittedSelection)).toBe(false);
    expect(
      battleFillEquals(roll, {
        ...roll,
        cunningStrikeOption: {
          unitId: "rogue_cunning_strike",
          optionId: "poison",
        },
      }),
    ).toBe(false);
  });

  test("Trip forgoes one Sneak Attack die before rolling and applies Prone after damage", () => {
    const window = cunningStrikeDamageWindow("trip");
    const save = requireHole(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: window.damageAppliedFills,
      }),
      "savingThrowOutcome",
    );

    expect(save).toMatchObject({
      ability: "dex",
      dc: { kind: "fixed", dc: difficultyClass(14) },
      targetIds: [goblinId],
    });

    const resolved = requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.damageAppliedFills,
          savingThrowOutcomeFill(save, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    );
    const target = resolved.state.combatants.get(goblinId);
    if (target === undefined) {
      throw new Error("Expected Cunning Strike Trip target.");
    }

    expect(hasCondition(target.conditions, "prone")).toBe(true);
  });

  test("Trip staged resume keeps attack damage single-applied", () => {
    const window = cunningStrikeDamageWindow("trip");
    const needsTripSave = resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: window.damageAppliedFills,
    });
    const tripSave = requireHole(needsTripSave, "savingThrowOutcome");
    if (needsTripSave.tag !== "needsHoles") {
      throw new Error("Expected Cunning Strike Trip staged save.");
    }

    expect(targetTempHp(needsTripSave.state)).toBe(40);

    const resolved = requireResolved(
      resolveBattleSubject({
        state: needsTripSave.state,
        subject: window.subject,
        fills: [
          ...window.damageAppliedFills,
          savingThrowOutcomeFill(tripSave, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    );

    expect(targetTempHp(resolved.state)).toBe(22);
    expect(
      resolved.state.currentTurnResources.attackDamageRidersUsedThisTurn,
    ).toEqual([{ attackerId: fighterId, unitId: "rogue_sneak_attack" }]);
    expect(resolved.snapshot.turn.actionResources).toHaveLength(0);
  });

  test("Trip staged resume keeps off-hand attack damage single-applied", () => {
    const window = cunningStrikeOffHandDamageWindow("trip");
    expectStagedTripResumeSingleAppliesDamage(window);
  });

  test("Trip staged resume keeps Opportunity Attack damage single-applied", () => {
    const window = cunningStrikeOpportunityAttackDamageWindow("trip");
    const resolved = expectStagedTripResumeSingleAppliesDamage(window);
    expect(resolved.combatants.get(fighterId)).toMatchObject({
      reactionAvailable: false,
    });
  });

  test("Trip survives attack damage continuations and resolves immediately after damage", () => {
    const window = cunningStrikeDamageWindow("trip", {
      targetConcentrating: true,
    });
    const needsConcentration = resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: window.damageAppliedFills,
    });
    const concentration = requireHole(
      needsConcentration,
      "concentrationSavingThrow",
    );
    expect(concentration).toMatchObject({ combatantId: goblinId });
    if (needsConcentration.tag !== "needsHoles") {
      throw new Error(
        "Expected Cunning Strike damage to request Concentration.",
      );
    }

    const needsTripSave = resolveBattleSubject({
      state: needsConcentration.state,
      subject: window.subject,
      fills: [
        ...window.damageAppliedFills,
        concentrationSavingThrowFill(concentration, true),
      ],
    });
    const tripSave = requireHole(needsTripSave, "savingThrowOutcome");
    expect(tripSave).toMatchObject({
      ability: "dex",
      targetIds: [goblinId],
    });
    if (needsTripSave.tag !== "needsHoles") {
      throw new Error(
        "Expected Cunning Strike Trip to request a saving throw.",
      );
    }

    const resolved = requireResolved(
      resolveBattleSubject({
        state: needsTripSave.state,
        subject: window.subject,
        fills: [
          ...window.damageAppliedFills,
          concentrationSavingThrowFill(concentration, true),
          savingThrowOutcomeFill(tripSave, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    );
    const target = resolved.state.combatants.get(goblinId);
    if (target === undefined) {
      throw new Error("Expected Cunning Strike Trip continuation target.");
    }

    expect(hasCondition(target.conditions, "prone")).toBe(true);
    expect(target.concentration).not.toBeNull();
  });

  test("Trip eligibility uses effective target size", () => {
    const damage = requireAttackDamageHole(
      cunningStrikeDamagePreview({
        targetStatBlock: largeTargetStatBlock(),
        targetActiveEffects: [targetSizeChangeEffect("increase")],
      }).damage,
    );

    expect(
      damage.cunningStrikeOptions?.map((option) => option.optionId),
    ).toEqual(["poison", "withdraw"]);
  });

  test("Poison requires Poisoner's Kit possession, then applies Poisoned with an end-turn repeat save", () => {
    const window = cunningStrikeDamageWindow("poison");
    const kit = requireHole(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: window.damageAppliedFills,
      }),
      "toolPossessionFacts",
    );
    expect(kit).toMatchObject({
      actorId: fighterId,
      toolIds: ["poisoners_kit"],
    });

    const save = requireHole(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.damageAppliedFills,
          toolPossessionFactsFill(kit, ["poisoners_kit"]),
        ],
      }),
      "savingThrowOutcome",
    );
    expect(save).toMatchObject({
      ability: "con",
      dc: { kind: "fixed", dc: difficultyClass(14) },
      targetIds: [goblinId],
    });

    const poisoned = requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.damageAppliedFills,
          toolPossessionFactsFill(kit, ["poisoners_kit"]),
          savingThrowOutcomeFill(save, [
            { targetId: goblinId, succeeded: false },
          ]),
        ],
      }),
    ).state;
    const poisonedTarget = poisoned.combatants.get(goblinId);
    if (poisonedTarget === undefined) {
      throw new Error("Expected Cunning Strike Poison target.");
    }
    expect(hasCondition(poisonedTarget.conditions, "poisoned")).toBe(true);
    expect(poisonedTarget.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "unitFeatureConditionEndTurnSave",
          sourceUnitId: "rogue_cunning_strike",
          sourceCombatantId: fighterId,
          condition: "poisoned",
          expiresAt: {
            kind: "duration",
            durationTicks: elapsedTimeTicks(10),
          },
        }),
      ]),
    );

    const targetTurn = requireResolved(
      endTurn({ state: poisoned, actorId: fighterId }),
    ).state;
    const repeatSave = requireHole(
      endTurn({ state: targetTurn, actorId: goblinId }),
      "savingThrowOutcome",
    );
    const afterRepeatSave = requireResolved(
      endTurn({
        state: targetTurn,
        actorId: goblinId,
        fills: [
          savingThrowOutcomeFill(repeatSave, [
            { targetId: goblinId, succeeded: true },
          ]),
        ],
      }),
    ).state;
    const recoveredTarget = afterRepeatSave.combatants.get(goblinId);
    if (recoveredTarget === undefined) {
      throw new Error(
        "Expected Cunning Strike Poison target after repeat save.",
      );
    }
    expect(hasCondition(recoveredTarget.conditions, "poisoned")).toBe(false);
  });

  test("Withdraw moves up to half Speed after damage without provoking Opportunity Attacks or spending turn movement", () => {
    const window = cunningStrikeDamageWindow("withdraw");
    const move = requireHole(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: window.damageAppliedFills,
      }),
      "movement",
    );
    expect(move).toMatchObject({
      actorId: fighterId,
      movementBudgetFeet: movementFeet(15),
      speedKinds: [{ kind: "walk", movementBudgetFeet: movementFeet(15) }],
    });

    expect(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.damageAppliedFills,
          movementFill(move, {
            movementCostFeet: 15,
            provokedOpportunityAttacks: [
              { reactorId: goblinId, attackName: "Scimitar" },
            ],
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Cunning Strike movement does not provoke Opportunity Attacks.",
    });

    const resolved = requireResolved(
      resolveBattleSubject({
        state: window.state,
        subject: window.subject,
        fills: [
          ...window.damageAppliedFills,
          movementFill(move, {
            movementCostFeet: 15,
            provokedOpportunityAttacks: [],
          }),
        ],
      }),
    );
    expect(resolved.state.combatants.get(fighterId)).toMatchObject({
      movementSpentFeet: movementFeet(0),
    });
  });
});

type CunningStrikeOptionId = NonNullable<
  Extract<BattleFill, { readonly kind: "rolledDice" }>["cunningStrikeOption"]
>["optionId"];

type CunningStrikeBattleInput = {
  readonly targetActiveEffects?: readonly BattleActiveEffect[];
  readonly targetConcentrating?: boolean;
  readonly targetStatBlock?: ReturnType<typeof statBlockRecord>;
  readonly withOffHandAttack?: boolean;
  readonly withSneakAttackAlly?: boolean;
};

const cunningStrikeAllyId = combatantId("cunning-strike-ally");

function cunningStrikeDamagePreview(input: CunningStrikeBattleInput = {}): {
  readonly state: BattleState;
  readonly subject: ReturnType<typeof fighterAttackSubject>;
  readonly target: BattleHole;
  readonly roll: BattleHole;
  readonly attackRoll: {
    readonly total: number;
    readonly naturalD20: number;
    readonly rollMode: "advantage";
  };
  readonly damage: BattleHole;
} {
  const state = cunningStrikeBattle(input);
  const subject = fighterAttackSubject("Dagger");
  const target = attackInitialTargetHole(state, subject);
  const roll = attackRollHoleAfterTarget(state, target, subject);
  const attackRoll = {
    total: 15,
    naturalD20: 10,
    rollMode: "advantage" as const,
  };
  const damage = attackDamageHoleAfterHit(
    state,
    target,
    roll,
    attackRoll,
    subject,
  );

  return { state, subject, target, roll, attackRoll, damage };
}

type CunningStrikeStagedDamageWindow = {
  readonly state: BattleState;
  readonly subject: Parameters<typeof resolveBattleSubject>[0]["subject"];
  readonly damageAppliedFills: readonly BattleFill[];
};

function cunningStrikeDamageWindow(
  optionId: CunningStrikeOptionId,
  input: CunningStrikeBattleInput = {},
): CunningStrikeStagedDamageWindow & { readonly damage: BattleHole } {
  const { state, subject, target, roll, attackRoll, damage } =
    cunningStrikeDamagePreview(input);

  return {
    state,
    subject,
    damage,
    damageAppliedFills: cunningStrikeDamageAppliedFills({
      state,
      subject,
      prefixFills: [
        targetFill(target, goblinId),
        attackRollFill(roll, attackRoll),
      ],
      damage,
      optionId,
    }),
  };
}

function cunningStrikeOffHandDamageWindow(
  optionId: CunningStrikeOptionId,
): CunningStrikeStagedDamageWindow {
  const state = cunningStrikeBattle({
    withOffHandAttack: true,
    withSneakAttackAlly: true,
  });
  const attackSubject = fighterAttackSubject("Shortsword");
  const attackTarget = attackInitialTargetHole(state, attackSubject);
  const qualifyingAttackRoll = attackRollHoleAfterTarget(
    state,
    attackTarget,
    attackSubject,
  );
  const afterQualifyingAttack = requireResolved(
    resolveBattleSubject({
      state,
      subject: attackSubject,
      fills: [
        targetFill(attackTarget, goblinId),
        attackRollFill(qualifyingAttackRoll, {
          total: 1,
          naturalD20: 1,
          rollMode: "advantage",
        }),
      ],
    }),
  ).state;
  const subject = {
    tag: "bonusAction",
    actorId: fighterId,
    action: "offHandAttack",
    attackName: "Dagger",
  } as const;
  const target = requireHole(
    resolveBattleSubject({ state: afterQualifyingAttack, subject, fills: [] }),
    "targetChoice",
  );
  const targetSelection = attackTargetFill(
    target,
    fighterId,
    goblinId,
    "Dagger",
    [
      {
        kind: "attackerAllyWithin5FeetOfTarget",
        attackerId: fighterId,
        targetId: goblinId,
        allyId: cunningStrikeAllyId,
      },
    ],
  );
  const roll = requireHole(
    resolveBattleSubject({
      state: afterQualifyingAttack,
      subject,
      fills: [targetSelection],
    }),
    "attackRoll",
  );
  const attackRoll = { total: 15, naturalD20: 10 };
  const damage = requireHole(
    resolveBattleSubject({
      state: afterQualifyingAttack,
      subject,
      fills: [targetSelection, attackRollFill(roll, attackRoll)],
    }),
    "rolledDice",
  );

  return {
    state: afterQualifyingAttack,
    subject,
    damageAppliedFills: cunningStrikeDamageAppliedFills({
      state: afterQualifyingAttack,
      subject,
      prefixFills: [targetSelection, attackRollFill(roll, attackRoll)],
      damage,
      optionId,
    }),
  };
}

function cunningStrikeOpportunityAttackDamageWindow(
  optionId: CunningStrikeOptionId,
): CunningStrikeStagedDamageWindow {
  const state = requireResolved(
    endTurn({
      state: cunningStrikeBattle({ withSneakAttackAlly: true }),
      actorId: fighterId,
    }),
  ).state;
  const moveSubject = {
    tag: "runtimeCommand",
    actorId: goblinId,
    command: "move",
  } as const;
  const move = requireHole(
    resolveBattleSubject({ state, subject: moveSubject, fills: [] }),
    "movement",
  );
  const awaitingReaction = resolveBattleSubject({
    state,
    subject: moveSubject,
    fills: [
      movementFill(move, {
        movementCostFeet: 5,
        provokedOpportunityAttacks: [
          { reactorId: fighterId, attackName: "Dagger" },
        ],
      }),
    ],
  });
  if (awaitingReaction.tag !== "needsHoles") {
    throw new Error("Expected Cunning Strike Opportunity Attack interrupt.");
  }
  const choice = reactionChoiceWithSubject(
    awaitingReaction.snapshot.pendingInterrupt!.choices,
  );
  const startedReaction = resolveBattleInterrupt({
    state: awaitingReaction.state,
    fill: interruptDecisionFill(
      awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
      {
        kind: "resolve",
        responderId: fighterId,
        choice: {
          kind: "opportunityAttack",
          reactorId: fighterId,
          fills: [],
        },
      },
    ),
  });
  if (startedReaction.tag !== "needsHoles") {
    throw new Error("Expected Cunning Strike Opportunity Attack roll.");
  }
  const subject = choice.subject;
  const roll = requireHole(startedReaction, "attackRoll");
  const attackRoll = {
    total: 15,
    naturalD20: 10,
    rollMode: "advantage" as const,
  };
  const damage = requireHole(
    resolveBattleSubject({
      state: startedReaction.state,
      subject,
      fills: [attackRollFill(roll, attackRoll)],
    }),
    "rolledDice",
  );

  return {
    state: startedReaction.state,
    subject,
    damageAppliedFills: cunningStrikeDamageAppliedFills({
      state: startedReaction.state,
      subject,
      prefixFills: [attackRollFill(roll, attackRoll)],
      damage,
      optionId,
    }),
  };
}

function cunningStrikeDamageAppliedFills(input: {
  readonly state: BattleState;
  readonly subject: Parameters<typeof resolveBattleSubject>[0]["subject"];
  readonly prefixFills: readonly BattleFill[];
  readonly damage: BattleHole;
  readonly optionId: CunningStrikeOptionId;
}): readonly BattleFill[] {
  const throughDamageRoll = [
    ...input.prefixFills,
    damageRollFillWithGroups(
      input.damage,
      [[4], [6, 5]],
      ["rogue_sneak_attack"],
      undefined,
      { unitId: "rogue_cunning_strike", optionId: input.optionId },
    ),
  ];
  const afterDamageRoll = resolveBattleSubject({
    state: input.state,
    subject: input.subject,
    fills: throughDamageRoll,
  });
  const disposition =
    afterDamageRoll.tag === "needsHoles"
      ? afterDamageRoll.holes.find(
          (hole) => hole.kind === "attackDamageDisposition",
        )
      : undefined;
  return disposition === undefined
    ? throughDamageRoll
    : [
        ...throughDamageRoll,
        attackDamageDispositionFill(disposition, {
          kind: "ordinaryDamage",
        }),
      ];
}

function expectStagedTripResumeSingleAppliesDamage(
  window: CunningStrikeStagedDamageWindow,
): BattleState {
  const needsTripSave = resolveBattleSubject({
    state: window.state,
    subject: window.subject,
    fills: window.damageAppliedFills,
  });
  const tripSave = requireHole(needsTripSave, "savingThrowOutcome");
  if (needsTripSave.tag !== "needsHoles") {
    throw new Error("Expected Cunning Strike Trip staged save.");
  }
  expect(targetTempHp(needsTripSave.state)).toBe(40);
  const finalFills = [
    ...window.damageAppliedFills,
    savingThrowOutcomeFill(tripSave, [
      { targetId: goblinId, succeeded: false },
    ]),
  ];
  const direct = requireResolved(
    resolveBattleSubject({
      state: window.state,
      subject: window.subject,
      fills: finalFills,
    }),
  );
  const staged = requireResolved(
    resolveBattleSubject({
      state: needsTripSave.state,
      subject: window.subject,
      fills: finalFills,
    }),
  );
  expect(targetTempHp(staged.state)).toBe(targetTempHp(direct.state));
  const target = staged.state.combatants.get(goblinId);
  if (target === undefined) {
    throw new Error("Expected Cunning Strike staged target.");
  }
  expect(hasCondition(target.conditions, "prone")).toBe(true);
  return staged.state;
}

function cunningStrikeBattle(
  input: CunningStrikeBattleInput = {},
): BattleState {
  const attack = input.withOffHandAttack
    ? testShortswordAttack()
    : testDaggerAttack();
  const visibleState = startBattleRight({
    battleId: battleId("battle-cunning-strike"),
    combatants: [
      characterSeed({
        displayName: "Cunning Strike Rogue",
        initiative: 20,
        classLevels: [{ className: "rogue", level: 5 }],
        d20Statistics: testCharacterD20Statistics({ dex: 16 }),
        unitFeatures: [sneakAttackFeature(), cunningStrikeFeature()],
        characterUnitRefs: cunningStrikeUnitRefs(),
        attack,
        ...(input.withOffHandAttack === true
          ? {
              offHandAttack: testDaggerAttack(),
              selectedLoadout: {
                weapon: {
                  itemId: "main:weapon_shortsword",
                  unitId: "weapon_shortsword",
                  grip: "one_handed" as const,
                },
                offHandWeapon: {
                  itemId: "off:weapon_dagger",
                  unitId: "weapon_dagger",
                },
              },
            }
          : {}),
      }),
      ...(input.withSneakAttackAlly === true
        ? [
            characterSeed({
              combatantId: cunningStrikeAllyId,
              displayName: "Cunning Strike Ally",
              initiative: 5,
              attack: null,
            }),
          ]
        : []),
      statBlockCreatureInit({
        initiative: 10,
        tempHp: 40,
        ...(input.targetStatBlock === undefined
          ? {}
          : { statBlock: input.targetStatBlock }),
      }),
    ],
  });
  const rogue = visibleState.combatants.get(fighterId);
  if (rogue === undefined) {
    throw new Error("Expected Cunning Strike rogue combatant.");
  }
  const target = visibleState.combatants.get(goblinId);
  if (target === undefined) {
    throw new Error("Expected Cunning Strike target combatant.");
  }
  return {
    ...visibleState,
    combatants: new Map(visibleState.combatants)
      .set(fighterId, {
        ...rogue,
        hidden: { discoveryDc: difficultyClass(16) },
      })
      .set(goblinId, {
        ...target,
        activeEffects: [
          ...target.activeEffects,
          ...(input.targetActiveEffects ?? []),
        ],
        ...(input.targetConcentrating === true
          ? {
              concentration: {
                sourceSpellId: "synthetic_cunning_strike_concentration",
                effectKind: "spellEffect" as const,
              },
            }
          : {}),
      }),
  };
}

function largeTargetStatBlock(): ReturnType<typeof statBlockRecord> {
  const base = statBlockRecord();
  return {
    ...base,
    id: "stat_block_synthetic_cunning_strike_large_target",
    name: "Synthetic Cunning Strike Large Target",
    statBlock: {
      ...base.statBlock,
      displayName: "Synthetic Cunning Strike Large Target",
      size: "large",
    },
  };
}

function targetSizeChangeEffect(
  direction: "increase" | "decrease",
): Extract<BattleActiveEffect, { readonly kind: "spellCreatureSizeChange" }> {
  return {
    kind: "spellCreatureSizeChange",
    sourceSpellId: "enlarge_reduce",
    sourceCombatantId: fighterId,
    direction,
    expiresAt: {
      kind: "concentration",
      combatantId: fighterId,
      durationTicks: elapsedTimeTicks(60),
    },
  };
}

function requireAttackDamageHole(hole: BattleHole): BattleDamageRollHole {
  if (hole.kind !== "rolledDice" || !("attack" in hole)) {
    throw new Error("Expected attack damage roll hole.");
  }
  return hole;
}

function requireRolledDiceFill(
  fills: readonly BattleFill[],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const fill = fills.find((candidate) => candidate.kind === "rolledDice");
  if (fill === undefined || fill.kind !== "rolledDice") {
    throw new Error("Expected rolledDice fill.");
  }
  return fill;
}

function toolPossessionFactsFill(
  hole: BattleHole,
  toolIdsOnPerson: readonly "poisoners_kit"[],
): Extract<BattleFill, { readonly kind: "toolPossessionFacts" }> {
  if (hole.kind !== "toolPossessionFacts") {
    throw new Error("Expected toolPossessionFacts hole.");
  }
  return {
    kind: "toolPossessionFacts",
    holeId: hole.holeId,
    value: { toolIdsOnPerson },
  };
}

function targetTempHp(state: BattleState): number {
  return Number(state.combatants.get(goblinId)?.tempHp ?? 0);
}
