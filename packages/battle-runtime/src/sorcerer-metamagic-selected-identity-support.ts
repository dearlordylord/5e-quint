import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { DieRollResult, resourceCount } from "@dnd/shared/types";

import {
  CAREFUL_METAMAGIC_EFFECT_KIND,
  EMPOWERED_METAMAGIC_EFFECT_KIND,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  QUICKENED_METAMAGIC_EFFECT_KIND,
  SEEKING_METAMAGIC_EFFECT_KIND,
  TRANSMUTED_METAMAGIC_EFFECT_KIND,
  TWINNED_METAMAGIC_EFFECT_KIND,
} from "./battle-reducer/metamagic.ts";
import {
  type AvailableBattleAct,
  type BattleFill,
  type BattleHole,
  type BattleReducerRouteEvent,
  type BattleState,
  type CharacterBattleMetamagicOptionFact,
  battleReducerStartRouteEvent,
  battleLineDirectionId,
  characterBattleResourceIsPointPool,
  discoverBattleActs,
  resolveBattleSubject,
} from "./index.ts";
import {
  attackRollFill,
  battleAreaId,
  battleId,
  characterSeed,
  damageRollFillWithGroups,
  endTurn,
  fighterId,
  findHole,
  partySide,
  requireResolved,
  secondSkeletonId,
  skeletonId,
  spellRecord,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  unitLibrary,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";

export type SorcererMetamagicProjection = {
  readonly magicActionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly sorceryPointsRemaining: number;
  readonly targetHp: number;
  readonly targetActiveEffectCount: number;
  readonly lastResult:
    | "init"
    | "carefulSaveGatedDamage"
    | "carefulSaveGatedNoEffect"
    | "heightenedSaveGatedDamage"
    | "empoweredSpellDamageReroll"
    | "quickenedSaveGatedDamage"
    | "quickenedSpellAttack"
    | "quickenedSpellAttackSequence"
    | "seekingSpellAttackReroll"
    | "transmutedSaveGatedDamage"
    | "transmutedSpellAttack"
    | "twinnedTargetCount"
    | "heightenedHideousLaughter"
    | "heightenedGreaseEntrySave"
    | "heightenedGustOfWindEndTurnSave"
    | "heightenedSaveGatedConditionEndTurnSave";
};

export function resolveQuickenedBurningHands(state: BattleState): BattleState {
  const act = quickenedBurningHandsAct(state);
  const savingThrowFill = burningHandsSaveFill(act.initialHoles);
  const awaitingDamage = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [savingThrowFill],
  });
  const damageHole = findHole(
    awaitingDamage.tag === "needsHoles" ? awaitingDamage.holes : [],
    "rolledDice",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        savingThrowFill,
        damageRollFillWithGroups(damageHole, [[4, 3, 2]]),
      ],
    }),
  ).state;
}

export function resolveQuickenedRayOfFrost(state: BattleState): BattleState {
  const act = quickenedRayOfFrostAct(state);
  const targetHole = findHole(act.initialHoles, "targetChoice");
  const target = targetFill(targetHole, skeletonId);
  const awaitingAttackRoll = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [target],
  });
  const attackRollHole = findHole(
    awaitingAttackRoll.tag === "needsHoles" ? awaitingAttackRoll.holes : [],
    "attackRoll",
  );
  const attackRoll = attackRollFill(attackRollHole, {
    total: 15,
    naturalD20: 10,
  });
  const awaitingDamage = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [target, attackRoll],
  });
  const damageHole = findHole(
    awaitingDamage.tag === "needsHoles" ? awaitingDamage.holes : [],
    "rolledDice",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        target,
        attackRoll,
        damageRollFillWithGroups(damageHole, [[4, 3]]),
      ],
    }),
  ).state;
}

export function resolveSeekingRayOfFrost(state: BattleState): BattleState {
  return resolveSeekingRayOfFrostSubject(state).resolved.state;
}

export function observeSeekingRayOfFrostRoute(
  state: BattleState,
): readonly BattleReducerRouteEvent[] {
  const resolved = resolveSeekingRayOfFrostSubject(state);
  return [
    battleReducerStartRouteEvent(resolved.initialState),
    ...(resolved.awaitingSeeking.routeEvents ?? []),
    ...(resolved.awaitingDamage.routeEvents ?? []),
    ...(resolved.resolved.routeEvents ?? []),
  ];
}

function resolveSeekingRayOfFrostSubject(state: BattleState) {
  const act = actionRayOfFrostAct(state);
  const targetHole = findHole(act.initialHoles, "targetChoice");
  const target = targetFill(targetHole, skeletonId);
  const awaitingAttackRoll = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [target],
  });
  const attackRollHole = findHole(
    awaitingAttackRoll.tag === "needsHoles" ? awaitingAttackRoll.holes : [],
    "attackRoll",
  );
  const missedAttackRoll = attackRollFill(attackRollHole, {
    total: 5,
    naturalD20: 2,
  });
  const awaitingSeeking = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [target, missedAttackRoll],
  });
  const seekingHole = findHole(
    awaitingSeeking.tag === "needsHoles" ? awaitingSeeking.holes : [],
    "attackRoll",
  );
  const rerolledAttack = attackRollFill(seekingHole, {
    total: 5,
    naturalD20: 2,
    spellAttackReroll: {
      kind: "reroll",
      effectKind: SEEKING_METAMAGIC_EFFECT_KIND,
      replacement: { total: 15, naturalD20: DieRollResult(10) },
    },
  });
  const awaitingDamage = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [target, rerolledAttack],
  });
  const damageHole = findHole(
    awaitingDamage.tag === "needsHoles" ? awaitingDamage.holes : [],
    "rolledDice",
  );
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        target,
        rerolledAttack,
        damageRollFillWithGroups(damageHole, [[4, 3]]),
      ],
    }),
  );
  return { initialState: state, act, awaitingSeeking, awaitingDamage, resolved };
}

export function resolveEmpoweredRayOfFrost(state: BattleState): BattleState {
  return resolveEmpoweredRayOfFrostSubject(state).resolved.state;
}

export function observeEmpoweredRayOfFrostRoute(
  state: BattleState,
): readonly BattleReducerRouteEvent[] {
  const resolved = resolveEmpoweredRayOfFrostSubject(state);
  return [
    battleReducerStartRouteEvent(resolved.initialState),
    ...(resolved.awaitingDamage.routeEvents ?? []),
    ...(resolved.resolved.routeEvents ?? []),
  ];
}

function resolveEmpoweredRayOfFrostSubject(state: BattleState) {
  const act = actionRayOfFrostAct(state);
  const targetHole = findHole(act.initialHoles, "targetChoice");
  const target = targetFill(targetHole, skeletonId);
  const awaitingAttackRoll = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [target],
  });
  const attackRollHole = findHole(
    awaitingAttackRoll.tag === "needsHoles" ? awaitingAttackRoll.holes : [],
    "attackRoll",
  );
  const attackRoll = attackRollFill(attackRollHole, {
    total: 15,
    naturalD20: 10,
  });
  const awaitingDamage = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [target, attackRoll],
  });
  const damageHole = findHole(
    awaitingDamage.tag === "needsHoles" ? awaitingDamage.holes : [],
    "rolledDice",
  );
  const damageRoll = damageRollFillWithGroups(damageHole, [[8, 8]]);
  if (damageRoll.kind !== "rolledDice") {
    throw new Error("Expected Ray of Frost damage roll fill.");
  }
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        target,
        attackRoll,
        {
          ...damageRoll,
          spellDamageReroll: {
            kind: "reroll",
            effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND,
            dice: [
              {
                groupIndex: 0,
                resultIndex: 0,
                original: DieRollResult(8),
                replacement: DieRollResult(1),
              },
            ],
          },
        },
      ],
    }),
  );
  return { initialState: state, act, awaitingDamage, resolved };
}

export function resolveQuickenedEldritchBlast(state: BattleState): BattleState {
  const act = quickenedEldritchBlastAct(state);
  const targetHoles = targetChoiceHoles(act.initialHoles);
  const firstTarget = eldritchBlastTargetFill(targetHoles[0]!);
  const secondTarget = eldritchBlastTargetFill(targetHoles[1]!);
  const fills: BattleFill[] = [firstTarget, secondTarget];

  const firstAttack = nextSpellHole(state, act.subject, fills, "attackRoll");
  fills.push(attackRollFill(firstAttack, { total: 15, naturalD20: 10 }));
  const firstDamage = nextSpellHole(state, act.subject, fills, "rolledDice");
  fills.push(damageRollFillWithGroups(firstDamage, [[4]]));
  const secondAttack = nextSpellHole(state, act.subject, fills, "attackRoll");
  fills.push(attackRollFill(secondAttack, { total: 1, naturalD20: 1 }));

  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills,
    }),
  ).state;
}

export function resolveCarefulBurningHands(state: BattleState): BattleState {
  const act = carefulBurningHandsAct(state);
  const protectedTargets = protectedTargetsFill(act.initialHoles);
  const awaitingSave = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [protectedTargets],
  });
  if (awaitingSave.tag !== "needsHoles") {
    throw new Error("Expected Careful Burning Hands to request a save hole.");
  }
  const savingThrow = findHole(awaitingSave.holes, "savingThrowOutcome");
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        protectedTargets,
        {
          kind: "savingThrowOutcome",
          holeId: savingThrow.holeId,
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
  ).state;
}

export function resolveCarefulCommand(state: BattleState): BattleState {
  const act = carefulCommandAct(state);
  const target = targetListFill(act.initialHoles, "Command targets", "command");
  const protectedTargets = targetListFill(
    act.initialHoles,
    "Command Careful Spell protected targets",
    "command",
  );
  const option = commandOptionFill(act.initialHoles);
  const awaitingSave = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [target, protectedTargets, option],
  });
  if (awaitingSave.tag !== "needsHoles") {
    throw new Error("Expected Careful Command to request a save hole.");
  }
  const savingThrow = findHole(awaitingSave.holes, "savingThrowOutcome");
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        target,
        protectedTargets,
        option,
        {
          kind: "savingThrowOutcome",
          holeId: savingThrow.holeId,
          value: {
            outcomes: [{ targetId: skeletonId, succeeded: true }],
          },
        },
      ],
    }),
  ).state;
}

export function observeCarefulSavingThrowProtectionRoute(
  state: BattleState,
): readonly BattleReducerRouteEvent[] {
  const act = carefulBurningHandsAct(state);
  const protectedTargets = targetListFill(
    act.initialHoles,
    "Burning Hands Careful Spell protected targets",
    "burning_hands",
    [fighterId],
  );
  const awaitingSave = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [protectedTargets],
  });
  if (awaitingSave.tag !== "needsHoles") {
    throw new Error("Expected Careful Burning Hands to request a save hole.");
  }
  const savingThrowFill = carefulBurningHandsMixedSaveFill(
    awaitingSave.holes,
  );
  const awaitingDamage = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [protectedTargets, savingThrowFill],
  });
  if (awaitingDamage.tag !== "needsHoles") {
    throw new Error("Expected Careful Burning Hands to request damage dice.");
  }
  const damage = findHole(awaitingDamage.holes, "rolledDice");
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        protectedTargets,
        savingThrowFill,
        damageRollFillWithGroups(damage, [[4, 3, 2]]),
      ],
    }),
  );

  return [
    battleReducerStartRouteEvent(state),
    ...(act.routeEvents ?? []),
    ...(awaitingSave.routeEvents ?? []),
    ...(awaitingDamage.routeEvents ?? []),
    ...(resolved.routeEvents ?? []),
  ];
}

export function observeCarefulCommandNoEffectRoute(
  state: BattleState,
): readonly BattleReducerRouteEvent[] {
  const act = carefulCommandAct(state);
  const target = targetListFill(act.initialHoles, "Command targets", "command");
  const protectedTargets = targetListFill(
    act.initialHoles,
    "Command Careful Spell protected targets",
    "command",
  );
  const option = commandOptionFill(act.initialHoles);
  const awaitingSave = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [target, protectedTargets, option],
  });
  if (awaitingSave.tag !== "needsHoles") {
    throw new Error("Expected Careful Command to request a save hole.");
  }
  const savingThrow = findHole(awaitingSave.holes, "savingThrowOutcome");
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        target,
        protectedTargets,
        option,
        {
          kind: "savingThrowOutcome",
          holeId: savingThrow.holeId,
          value: {
            outcomes: [{ targetId: skeletonId, succeeded: true }],
          },
        },
      ],
    }),
  );

  return [
    battleReducerStartRouteEvent(state),
    ...(act.routeEvents ?? []),
    ...(awaitingSave.routeEvents ?? []),
    ...(resolved.routeEvents ?? []),
  ];
}

export function resolveHeightenedBurningHands(state: BattleState): BattleState {
  const act = heightenedBurningHandsAct(state);
  const heightenedTarget = targetFill(
    findHole(act.initialHoles, "targetChoice"),
    skeletonId,
  );
  const awaitingSave = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [heightenedTarget],
  });
  if (awaitingSave.tag !== "needsHoles") {
    throw new Error(
      "Expected Heightened Burning Hands to request a save hole.",
    );
  }
  const savingThrow = findHole(awaitingSave.holes, "savingThrowOutcome");
  const savingThrowFill: Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  > = {
    kind: "savingThrowOutcome",
    holeId: savingThrow.holeId,
    value: {
      area: {
        originAnchorId: wizardId,
        affectedTargetIds: [skeletonId],
      },
      outcomes: [{ targetId: skeletonId, succeeded: false }],
    },
  };
  const awaitingDamage = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [heightenedTarget, savingThrowFill],
  });
  if (awaitingDamage.tag !== "needsHoles") {
    throw new Error(
      "Expected Heightened Burning Hands to request a damage hole.",
    );
  }
  const damage = findHole(awaitingDamage.holes, "rolledDice");
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        heightenedTarget,
        savingThrowFill,
        damageRollFillWithGroups(damage, [[4, 3, 2]]),
      ],
    }),
  ).state;
}

export function resolveHeightenedHideousLaughter(
  state: BattleState,
): BattleState {
  return resolveHeightenedHideousLaughterSubject(state).resolved.state;
}

export function observeHeightenedHideousLaughterRoute(
  state: BattleState,
): readonly BattleReducerRouteEvent[] {
  const resolved = resolveHeightenedHideousLaughterSubject(state);
  return [
    battleReducerStartRouteEvent(resolved.initialState),
    ...(resolved.awaitingSave.routeEvents ?? []),
    ...(resolved.resolved.routeEvents ?? []),
  ];
}

function resolveHeightenedHideousLaughterSubject(state: BattleState) {
  const act = heightenedHideousLaughterAct(state);
  const target = targetListFill(
    act.initialHoles,
    "Hideous Laughter targets",
    "hideous_laughter",
  );
  const heightenedTarget = targetFill(
    findHole(act.initialHoles, "targetChoice"),
    skeletonId,
  );
  const awaitingSave = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [target, heightenedTarget],
  });
  if (awaitingSave.tag !== "needsHoles") {
    throw new Error(
      "Expected Heightened Hideous Laughter to request a save hole.",
    );
  }
  const savingThrow = findHole(awaitingSave.holes, "savingThrowOutcome");
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        target,
        heightenedTarget,
        {
          kind: "savingThrowOutcome",
          holeId: savingThrow.holeId,
          value: {
            outcomes: [{ targetId: skeletonId, succeeded: false }],
          },
        },
      ],
    }),
  );
  return { initialState: state, act, awaitingSave, resolved };
}

export function resolveHeightenedGreaseEntrySave(state: BattleState): BattleState {
  const act = heightenedGreaseAct(state);
  const heightenedTarget = targetFill(
    findHole(act.initialHoles, "targetChoice"),
    skeletonId,
  );
  const awaitingSave = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [heightenedTarget],
  });
  if (awaitingSave.tag !== "needsHoles") {
    throw new Error("Expected Heightened Grease to request a save hole.");
  }
  const savingThrow = findHole(awaitingSave.holes, "savingThrowOutcome");
  const cast = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        heightenedTarget,
        {
          kind: "savingThrowOutcome",
          holeId: savingThrow.holeId,
          value: {
            area: {
              kind: "greaseGroundArea",
              areaId: battleAreaId("heightened-grease-ground-area"),
              originAnchorId: wizardId,
              affectedTargetIds: [skeletonId],
            },
            outcomes: [{ targetId: skeletonId, succeeded: true }],
          },
        },
      ],
    }),
  ).state;
  const targetTurn = requireResolved(
    endTurn({ state: cast, actorId: wizardId }),
  ).state;
  const entryAct = discoverBattleActs(targetTurn).find(
    (candidate) =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "greaseGroundHazardSave" &&
      candidate.subject.trigger === "entersArea",
  );
  if (entryAct === undefined) {
    throw new Error("Expected Heightened Grease entry save act.");
  }
  const entryTargetId = entryAct.subject.actorId;
  const entrySave = findHole(entryAct.initialHoles, "savingThrowOutcome");
  if (entrySave.kind !== "savingThrowOutcome") {
    throw new Error("Expected Heightened Grease entry save hole.");
  }
  if (
    !entrySave.targetRollModes.some(
      (projection) =>
        projection.targetId === entryTargetId &&
        projection.rollMode === "disadvantage",
    )
  ) {
    throw new Error(
      "Expected Heightened Grease entry save to project Disadvantage for the selected target.",
    );
  }
  return requireResolved(
    resolveBattleSubject({
      state: targetTurn,
      subject: entryAct.subject,
      fills: [
        {
          kind: "savingThrowOutcome",
          holeId: entrySave.holeId,
          value: {
            outcomes: [{ targetId: entryTargetId, succeeded: false }],
          },
        },
      ],
    }),
  ).state;
}

export function resolveHeightenedGustOfWindEndTurnSave(
  state: BattleState,
): BattleState {
  const act = heightenedGustOfWindAct(state);
  const heightenedTarget = targetFill(
    findHole(act.initialHoles, "targetChoice"),
    skeletonId,
  );
  const awaitingSave = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [heightenedTarget],
  });
  if (awaitingSave.tag !== "needsHoles") {
    throw new Error("Expected Heightened Gust of Wind to request a save hole.");
  }
  const savingThrow = findHole(awaitingSave.holes, "savingThrowOutcome");
  const areaId = battleAreaId("heightened-gust-of-wind-line-area");
  const directionId = battleLineDirectionId(
    "heightened-gust-of-wind-line-north",
  );
  const cast = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        heightenedTarget,
        {
          kind: "savingThrowOutcome",
          holeId: savingThrow.holeId,
          value: {
            area: {
              kind: "gustOfWindLineArea",
              areaId,
              directionId,
              originAnchorId: wizardId,
              affectedTargetIds: [skeletonId],
              creaturePushes: [],
            },
            outcomes: [{ targetId: skeletonId, succeeded: true }],
          },
        },
      ],
    }),
  ).state;
  const targetTurn = requireResolved(endTurn({ state: cast, actorId: wizardId }))
    .state;
  const endTurnAct = discoverBattleActs(targetTurn).find(
    (candidate) =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "gustOfWindLineSave" &&
      candidate.subject.areaId === areaId &&
      candidate.subject.directionId === directionId,
  );
  if (endTurnAct === undefined) {
    throw new Error("Expected Heightened Gust of Wind end-turn save act.");
  }
  const endTurnSave = findHole(endTurnAct.initialHoles, "savingThrowOutcome");
  if (endTurnSave.kind !== "savingThrowOutcome") {
    throw new Error("Expected Heightened Gust of Wind end-turn save hole.");
  }
  if (
    !endTurnSave.targetRollModes.some(
      (projection) =>
        projection.targetId === endTurnAct.subject.actorId &&
        projection.rollMode === "disadvantage",
    )
  ) {
    throw new Error(
      "Expected Heightened Gust of Wind end-turn save to project Disadvantage for the selected target.",
    );
  }
  return requireResolved(
    resolveBattleSubject({
      state: targetTurn,
      subject: endTurnAct.subject,
      fills: [
        {
          kind: "savingThrowOutcome",
          holeId: endTurnSave.holeId,
          value: {
            area: {
              kind: "gustOfWindLineArea",
              areaId,
              directionId,
              originAnchorId: wizardId,
              affectedTargetIds: [endTurnAct.subject.actorId],
              creaturePushes: [],
            },
            outcomes: [{ targetId: endTurnAct.subject.actorId, succeeded: true }],
          },
        },
      ],
    }),
  ).state;
}

export function resolveHeightenedSaveGatedConditionEndTurnSave(
  state: BattleState,
): BattleState {
  const act = heightenedSaveGatedConditionAct(state);
  const targetHole = findHole(act.initialHoles, "spellTargetList");
  if (targetHole.kind !== "spellTargetList") {
    throw new Error("Expected Heightened Blindness/Deafness target list.");
  }
  const conditionHole = findHole(act.initialHoles, "conditionChoice");
  const heightenedTarget = targetFill(
    findHole(act.initialHoles, "targetChoice"),
    skeletonId,
  );
  const target = {
    kind: "spellTargetList" as const,
    holeId: targetHole.holeId,
    value: { targetIds: [skeletonId, secondSkeletonId] },
    spatialFacts: [skeletonId, secondSkeletonId].map((targetId) => ({
      kind: "spellTarget" as const,
      casterId: wizardId,
      targetId,
      spellId: "blindness_deafness",
    })),
  };
  const condition = {
    kind: "conditionChoice" as const,
    holeId: conditionHole.holeId,
    value: "blinded" as const,
  };
  const awaitingSave = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [target, heightenedTarget, condition],
  });
  if (awaitingSave.tag !== "needsHoles") {
    throw new Error(
      "Expected Heightened Blindness/Deafness to request a save hole.",
    );
  }
  const savingThrow = findHole(awaitingSave.holes, "savingThrowOutcome");
  const cast = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        target,
        heightenedTarget,
        condition,
        {
          kind: "savingThrowOutcome",
          holeId: savingThrow.holeId,
          value: {
            outcomes: [
              { targetId: skeletonId, succeeded: false },
              { targetId: secondSkeletonId, succeeded: false },
            ],
          },
        },
      ],
    }),
  ).state;
  const targetTurn = requireResolved(endTurn({ state: cast, actorId: wizardId }))
    .state;
  const awaitingEndTurnSave = endTurn({ state: targetTurn, actorId: skeletonId });
  if (awaitingEndTurnSave.tag !== "needsHoles") {
    throw new Error(
      "Expected Heightened Blindness/Deafness end turn to request a save hole.",
    );
  }
  const endTurnSave = findHole(
    awaitingEndTurnSave.holes,
    "savingThrowOutcome",
  );
  if (endTurnSave.kind !== "savingThrowOutcome") {
    throw new Error("Expected Heightened Blindness/Deafness repeat save hole.");
  }
  if (!("spellConditionEndTurnSave" in endTurnSave)) {
    throw new Error(
      "Expected Heightened Blindness/Deafness spell condition repeat save hole.",
    );
  }
  if (
    !endTurnSave.targetRollModes.some(
      (projection) =>
        projection.targetId === endTurnSave.spellConditionEndTurnSave.targetId &&
        projection.rollMode === "disadvantage",
    )
  ) {
    throw new Error(
      "Expected Heightened Blindness/Deafness repeat save to project Disadvantage.",
    );
  }
  return requireResolved(
    endTurn({
      state: targetTurn,
      actorId: skeletonId,
      fills: [
        {
          kind: "savingThrowOutcome",
          holeId: endTurnSave.holeId,
          value: {
            outcomes: [{ targetId: skeletonId, succeeded: true }],
          },
        },
      ],
    }),
  ).state;
}

export function resolveTransmutedBurningHandsToPoison(
  state: BattleState,
): BattleState {
  const act = transmutedBurningHandsToPoisonAct(state);
  const savingThrowFill = burningHandsSaveFill(act.initialHoles);
  const awaitingDamage = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [savingThrowFill],
  });
  const damageHole = findHole(
    awaitingDamage.tag === "needsHoles" ? awaitingDamage.holes : [],
    "rolledDice",
  );
  assertTransmutedDamageHole(damageHole);
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        savingThrowFill,
        damageRollFillWithGroups(damageHole, [[4, 3, 2]]),
      ],
    }),
  ).state;
}

export function resolveTransmutedRayOfFrostToPoison(
  state: BattleState,
): BattleState {
  const act = transmutedRayOfFrostToPoisonAct(state);
  const targetHole = findHole(act.initialHoles, "targetChoice");
  const target = targetFill(targetHole, skeletonId);
  const awaitingAttackRoll = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [target],
  });
  const attackRollHole = findHole(
    awaitingAttackRoll.tag === "needsHoles" ? awaitingAttackRoll.holes : [],
    "attackRoll",
  );
  const attackRoll = attackRollFill(attackRollHole, {
    total: 15,
    naturalD20: 10,
  });
  const awaitingDamage = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [target, attackRoll],
  });
  const damageHole = findHole(
    awaitingDamage.tag === "needsHoles" ? awaitingDamage.holes : [],
    "rolledDice",
  );
  assertTransmutedDamageHole(damageHole);
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        target,
        attackRoll,
        damageRollFillWithGroups(damageHole, [[4, 3]]),
      ],
    }),
  ).state;
}

export function resolveTwinnedBless(state: BattleState): BattleState {
  const act = twinnedBlessAct(state);
  const targetHole = findHole(act.initialHoles, "spellTargetList");
  if (targetHole.kind !== "spellTargetList") {
    throw new Error("Expected Twinned Bless to request a target-list hole.");
  }
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetListFill(act.initialHoles, "Bless targets", "bless", [
          wizardId,
          fighterId,
          skeletonId,
          secondSkeletonId,
        ]),
      ],
    }),
  ).state;
}

export function projectBattleState(
  state: BattleState,
  lastResult: SorcererMetamagicProjection["lastResult"],
): SorcererMetamagicProjection {
  return {
    magicActionAvailable: canSpendAction(state.currentTurnResources, "magic"),
    bonusActionAvailable: state.currentTurnResources.currentHasBonusAction,
    sorceryPointsRemaining: Number(sorceryPointsRemaining(state)),
    targetHp: state.combatants.get(skeletonId)?.hp ?? 0,
    targetActiveEffectCount:
      state.combatants.get(skeletonId)?.activeEffects.length ?? 0,
    lastResult,
  };
}

export function sorcererMetamagicBattle(): BattleState {
  return sorcererMetamagicBattleWithOptions([quickenedMetamagicOption()]);
}

export function carefulSorcererMetamagicBattle(): BattleState {
  return sorcererMetamagicBattleWithOptions([carefulMetamagicOption()]);
}

export function heightenedSorcererMetamagicBattle(): BattleState {
  return sorcererMetamagicBattleWithOptions([heightenedMetamagicOption()]);
}

export function transmutedSorcererMetamagicBattle(): BattleState {
  return sorcererMetamagicBattleWithOptions([transmutedMetamagicOption()]);
}

export function twinnedSorcererMetamagicBattle(): BattleState {
  return sorcererMetamagicBattleWithOptions([twinnedMetamagicOption()]);
}

export function seekingSorcererMetamagicBattle(): BattleState {
  return sorcererMetamagicBattleWithOptions([seekingMetamagicOption()]);
}

export function empoweredSorcererMetamagicBattle(): BattleState {
  return sorcererMetamagicBattleWithOptions([empoweredMetamagicOption()]);
}

function sorcererMetamagicBattleWithOptions(
  knownOptions: readonly CharacterBattleMetamagicOptionFact[],
): BattleState {
  return startBattleRight({
    battleId: battleId("battle:sorcerer-metamagic-selected-identity"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Sorcerer",
        initiative: 20,
        side: partySide,
        attack: null,
        classLevels: [{ className: "sorcerer", level: 5 }],
        resources: [
          {
            unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
            pointsRemaining: resourceCount(4),
          },
        ],
        metamagic: {
          sorceryPointResourceUnitId: "sorcerer_font_of_magic",
          spellUseLimit: "one_per_spell_unless_option_allows_stacking",
          knownOptions,
        },
        spellcasting: {
          ...wizardSpellcasting({
            cantrips: [
              spellRecord("ray_of_frost"),
              spellRecord("eldritch_blast"),
            ],
            preparedSpells: [
              spellRecord("blindness_deafness"),
              spellRecord("bless"),
              spellRecord("burning_hands"),
              spellRecord("command"),
              spellRecord("grease"),
              spellRecord("gust_of_wind"),
              spellRecord("hideous_laughter"),
            ],
            spellSlots: [
              { spellLevel: 1, count: 3 },
              { spellLevel: 2, count: 1 },
              { spellLevel: 3, count: 1 },
            ],
          }),
          sourceClassName: "sorcerer",
        },
      }),
      statBlockCreatureInit({
        combatantId: skeletonId,
        displayName: "Skeleton",
        initiative: 10,
      }),
      characterSeed({
        combatantId: fighterId,
        displayName: "Nearby Ally",
        initiative: 9,
        side: partySide,
        currentHp: 12,
        maxHp: 20,
      }),
      statBlockCreatureInit({
        combatantId: secondSkeletonId,
        displayName: "Second Skeleton",
        initiative: 8,
      }),
    ],
  });
}

function quickenedMetamagicOption(): CharacterBattleMetamagicOptionFact {
  return {
    effectKind: QUICKENED_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(2),
  };
}

function carefulMetamagicOption(): CharacterBattleMetamagicOptionFact {
  return {
    effectKind: CAREFUL_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(1),
  };
}

function heightenedMetamagicOption(): CharacterBattleMetamagicOptionFact {
  return {
    effectKind: HEIGHTENED_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(2),
  };
}

function transmutedMetamagicOption(): CharacterBattleMetamagicOptionFact {
  return {
    effectKind: TRANSMUTED_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(1),
  };
}

function twinnedMetamagicOption(): CharacterBattleMetamagicOptionFact {
  return {
    effectKind: TWINNED_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(1),
  };
}

function seekingMetamagicOption(): CharacterBattleMetamagicOptionFact {
  return {
    effectKind: SEEKING_METAMAGIC_EFFECT_KIND,
    stackingMode: "can_combine_with_different_metamagic",
    sorceryPointCost: resourceCount(1),
  };
}

function empoweredMetamagicOption(): CharacterBattleMetamagicOptionFact {
  return {
    effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND,
    stackingMode: "can_combine_with_different_metamagic",
    sorceryPointCost: resourceCount(1),
  };
}

type QuickenedBonusActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "bonusActionSpell" }
  >;
};

function quickenedBurningHandsAct(
  state: BattleState,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is QuickenedBonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.procedure === "saveGatedDamage" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Quickened Burning Hands act.");
  }
  return act;
}

function quickenedRayOfFrostAct(
  state: BattleState,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is QuickenedBonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.procedure === "spellAttackDamage" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Quickened Ray of Frost act.");
  }
  return act;
}

function quickenedEldritchBlastAct(
  state: BattleState,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is QuickenedBonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.procedure === "spellAttackSequence" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Quickened Eldritch Blast act.");
  }
  return act;
}

function targetChoiceHoles(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "targetChoice" }>[] {
  return holes.filter(
    (hole): hole is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
      hole.kind === "targetChoice",
  );
}

function nextSpellHole(
  state: BattleState,
  subject: QuickenedBonusActionSpellAct["subject"],
  fills: readonly BattleFill[],
  kind: BattleHole["kind"],
): BattleHole {
  const result = resolveBattleSubject({ state, subject, fills });
  if (result.tag !== "needsHoles") {
    const detail = "message" in result ? `: ${result.message}` : "";
    throw new Error(`Expected ${kind} spell hole, got ${result.tag}${detail}.`);
  }
  return findHole(result.holes, kind);
}

function eldritchBlastTargetFill(hole: BattleHole): BattleFill {
  return targetFill(hole, skeletonId, [
    {
      kind: "spellTarget",
      casterId: wizardId,
      targetId: skeletonId,
      spellId: "eldritch_blast",
    },
  ]);
}

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "actionSpell" }
  >;
};

function actionRayOfFrostAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "spellAttackDamage",
  );
  if (act === undefined) {
    throw new Error("Expected Ray of Frost action spell act.");
  }
  return act;
}

function carefulBurningHandsAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "saveGatedDamage" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Careful Burning Hands act.");
  }
  return act;
}

function carefulCommandAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "command" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Careful Command act.");
  }
  return act;
}

function heightenedBurningHandsAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "saveGatedDamage" &&
      candidate.subject.metamagic?.some(
        (selection) =>
          selection.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Heightened Burning Hands act.");
  }
  return act;
}

function heightenedHideousLaughterAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "hideousLaughter" &&
      candidate.subject.metamagic?.some(
        (selection) =>
          selection.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Heightened Hideous Laughter act.");
  }
  return act;
}

function heightenedGreaseAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "greaseGroundHazard" &&
      candidate.subject.metamagic?.some(
        (selection) =>
          selection.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Heightened Grease act.");
  }
  return act;
}

function heightenedGustOfWindAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "gustOfWindLine" &&
      candidate.subject.metamagic?.some(
        (selection) =>
          selection.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Heightened Gust of Wind act.");
  }
  return act;
}

function heightenedSaveGatedConditionAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "saveGatedCondition" &&
      candidate.subject.invocation.tag === "spellSlot" &&
      Number(candidate.subject.invocation.slotLevel) === 3 &&
      candidate.initialHoles.some((hole) => hole.kind === "conditionChoice") &&
      candidate.subject.metamagic?.some(
        (selection) =>
          selection.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Heightened Blindness/Deafness act.");
  }
  return act;
}

function transmutedBurningHandsToPoisonAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "saveGatedDamage" &&
      candidate.subject.metamagic?.some(
        (selection) =>
          selection.effectKind === TRANSMUTED_METAMAGIC_EFFECT_KIND &&
          selection.targetDamageType === "poison",
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Transmuted Burning Hands to Poison act.");
  }
  return act;
}

function transmutedRayOfFrostToPoisonAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "spellAttackDamage" &&
      candidate.subject.metamagic?.some(
        (selection) =>
          selection.effectKind === TRANSMUTED_METAMAGIC_EFFECT_KIND &&
          selection.targetDamageType === "poison",
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Transmuted Ray of Frost to Poison act.");
  }
  return act;
}

function twinnedBlessAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.procedure === "rollModifier" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === TWINNED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Twinned Bless act.");
  }
  return act;
}

function burningHandsSaveFill(
  holes: readonly BattleHole[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  const savingThrow = findHole(holes, "savingThrowOutcome");
  return {
    kind: "savingThrowOutcome",
    holeId: savingThrow.holeId,
    value: {
      area: {
        originAnchorId: wizardId,
        affectedTargetIds: [skeletonId],
      },
      outcomes: [{ targetId: skeletonId, succeeded: false }],
    },
  };
}

function assertTransmutedDamageHole(damageHole: BattleHole): void {
  if (
    damageHole.kind !== "rolledDice" ||
    !("spell" in damageHole) ||
    !("damage" in damageHole.spell) ||
    !("damageType" in damageHole.spell.damage) ||
    damageHole.spell.damage.damageType !== "poison"
  ) {
    throw new Error("Expected Transmuted Spell damage hole to use Poison.");
  }
}

function protectedTargetsFill(
  holes: readonly BattleHole[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return targetListFill(
    holes,
    "Burning Hands Careful Spell protected targets",
    "burning_hands",
  );
}

function carefulBurningHandsMixedSaveFill(
  holes: readonly BattleHole[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  const savingThrow = findHole(holes, "savingThrowOutcome");
  return {
    kind: "savingThrowOutcome",
    holeId: savingThrow.holeId,
    value: {
      area: {
        originAnchorId: wizardId,
        affectedTargetIds: [fighterId, skeletonId],
      },
      outcomes: [
        { targetId: fighterId, succeeded: true },
        { targetId: skeletonId, succeeded: false },
      ],
    },
  };
}

function targetListFill(
  holes: readonly BattleHole[],
  label: string,
  spellId: "bless" | "burning_hands" | "command" | "hideous_laughter",
  targetIds: readonly (typeof wizardId)[] = [skeletonId],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  const hole = holes.find(
    (candidate) =>
      candidate.kind === "spellTargetList" && candidate.label === label,
  );
  if (hole === undefined || hole.kind !== "spellTargetList") {
    throw new Error(`Expected ${label} target-list hole.`);
  }
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: targetIds.map((targetId) => ({
      kind: "spellTarget",
      casterId: wizardId,
      targetId,
      spellId,
    })),
  };
}

function commandOptionFill(
  holes: readonly BattleHole[],
): Extract<BattleFill, { readonly kind: "commandOptionChoice" }> {
  const hole = findHole(holes, "commandOptionChoice");
  return {
    kind: "commandOptionChoice",
    holeId: hole.holeId,
    value: "halt",
  };
}

function sorceryPointsRemaining(state: BattleState) {
  const actor = state.combatants.get(wizardId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Sorcerer combatant.");
  }
  const resource = actor.origin.resources.find(
    characterBattleResourceIsPointPool,
  );
  if (resource === undefined) {
    throw new Error("Expected Sorcery Point resource.");
  }
  return resource.pointsRemaining;
}
