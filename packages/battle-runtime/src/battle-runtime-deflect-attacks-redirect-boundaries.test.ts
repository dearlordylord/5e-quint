import { classLevel } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import {
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
  Hp,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  battleRuntimeContextForStateForTest,
  battleId,
  characterBattleFeatureInitForTest,
  characterSeed,
  damageRollFill,
  damageRollFillWithGroups,
  discoverBattleActs,
  fighterId,
  findHole,
  goblinAttackSubject,
  goblinId,
  goblinScimitarHitReactionSetup,
  interruptDecisionFill,
  monkDeflectAttacksFocusResource,
  reactionModifierChoice,
  reactionModifierReductionRollFill,
  reactionModifierUnitRefWithProfile,
  requireHole,
  resolveBattleInterrupt,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  skeletonId,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";

describe("battle runtime: Deflect Attacks redirect boundaries", () => {
  test("static Stat Block damage reaches Deflect Attacks redirect without a damage-roll frontier", () => {
    const unit = unitLibrary.requireUnit("monk_deflect_attacks");
    const state = deflectAttacksBattle();
    const subject = discoverBattleActs(
      battleRuntimeSessionForTest({
        state,
        context: battleRuntimeContextForStateForTest(state),
      }),
    ).find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.statBlockDamageNotation === "static" &&
        act.presentation.kind === "attack" &&
        act.presentation.name === "Scimitar",
    )?.subject;
    if (
      subject?.tag !== "action" ||
      subject.action !== "attack" ||
      subject.statBlockDamageNotation !== "static"
    ) {
      throw new Error("Expected the discovered static Scimitar attack.");
    }
    const target = attackInitialTargetHole(state, subject);
    const attackRoll = attackRollHoleAfterTarget(
      state,
      target,
      subject,
      fighterId,
    );
    const prefixFills = [
      targetFill(target, fighterId),
      attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
    ];
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: prefixFills,
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(
        `Expected the static attack-hit Reaction window, got ${awaitingReaction.tag}${
          awaitingReaction.tag === "invalid"
            ? `: ${awaitingReaction.message}`
            : ""
        }.`,
      );
    }
    const choice = reactionModifierChoice(
      awaitingReaction.snapshot.pendingInterrupt!.choices,
      unit.id,
      "attackDamageReduction",
    );
    expect(choice.choice).toMatchObject({
      zeroDamageRedirect: { originalDamageType: "slashing" },
    });
    const awaitingRedirect = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        findHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "reactionRollOrDamageReduction",
            procedureRef: choice.choice.procedureRef,
            modifierKind: "attackDamageReduction",
            fills: [reactionModifierReductionRollFill(choice, 10)],
          },
        },
      ),
    });
    if (awaitingRedirect.tag !== "needsHoles") {
      throw new Error("Expected static Deflect Attacks redirect holes.");
    }
    expect(awaitingRedirect.holes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "targetChoice" }),
        expect.objectContaining({ kind: "savingThrowOutcome" }),
        expect.objectContaining({ kind: "rolledDice" }),
      ]),
    );

    const resolved = resolveBattleSubject({
      state: awaitingRedirect.state,
      subject,
      fills: [
        ...prefixFills,
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
          [[4, 4]],
        ),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") return;
    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(Hp(12));
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(Hp(2));
  });

  test("zero damage resolves without redirect facts when the Monk has no Focus Points", () => {
    const unit = unitLibrary.requireUnit("monk_deflect_attacks");
    const state = deflectAttacksBattle({ focusUsesRemaining: 0 });
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
            procedureRef: choice.choice.procedureRef,
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

    const resolved = resolveBattleSubject({
      state: afterReaction.state,
      subject: setup.subject,
      fills: [...setup.prefixFills, damageRollFill(damage, 6)],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") return;
    expect(resolved.state.combatants.get(fighterId)?.hp).toBe(Hp(12));
  });

  test("a ranged Deflect Attacks redirect accepts its ranged spatial witness", () => {
    const unit = unitLibrary.requireUnit("monk_deflect_attacks");
    const state = deflectAttacksBattle();
    const subject = goblinAttackSubject(state, "Shortbow");
    const target = attackInitialTargetHole(state, subject);
    const attackRoll = attackRollHoleAfterTarget(
      state,
      target,
      subject,
      fighterId,
    );
    const prefixFills = [
      targetFill(target, fighterId),
      attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
    ];
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: prefixFills,
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
            procedureRef: choice.choice.procedureRef,
            modifierKind: "attackDamageReduction",
            fills: [reactionModifierReductionRollFill(choice, 10)],
          },
        },
      ),
    });
    if (afterReaction.tag !== "needsHoles") {
      throw new Error("Expected Shortbow damage roll.");
    }
    const damage = requireHole(afterReaction, "rolledDice");
    const awaitingRedirect = resolveBattleSubject({
      state: afterReaction.state,
      subject,
      fills: [...prefixFills, damageRollFill(damage, 6)],
    });
    if (awaitingRedirect.tag !== "needsHoles") {
      throw new Error("Expected Deflect Attacks redirect holes.");
    }

    const resolved = resolveBattleSubject({
      state: awaitingRedirect.state,
      subject,
      fills: [
        ...prefixFills,
        damageRollFill(damage, 6),
        targetFill(
          findHole(awaitingRedirect.holes, "targetChoice"),
          skeletonId,
          [
            {
              kind: "rangedRedirectTargetWithin60FeetWithoutTotalCover",
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
          [[5, 5]],
        ),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") return;
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(Hp(0));
  });

  test("redirect choices retain the Monk and omit a creature already defeated", () => {
    const state = deflectAttacksBattle({ defeatedRedirectTarget: true });
    const setup = goblinScimitarHitReactionSetup(state);
    if (setup.result.tag !== "needsHoles") {
      throw new Error("Expected Deflect Attacks Reaction window.");
    }
    const unit = unitLibrary.requireUnit("monk_deflect_attacks");
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
            procedureRef: choice.choice.procedureRef,
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
    expect(redirectTarget.choices).toHaveLength(2);
    expect(redirectTarget.choices).toEqual(
      expect.arrayContaining([goblinId, fighterId]),
    );
    expect(redirectTarget.choices).not.toContain(skeletonId);
  });
});

function deflectAttacksBattle(input?: {
  readonly focusUsesRemaining?: number;
  readonly defeatedRedirectTarget?: boolean;
}) {
  const unit = unitLibrary.requireUnit("monk_deflect_attacks");
  return startBattleRight({
    battleId: battleId("battle-deflect-attacks-redirect-boundaries"),
    combatants: [
      statBlockCreatureInit({ initiative: 20 }),
      statBlockCreatureInit({
        combatantId: skeletonId,
        displayName: "Redirect target",
        initiative: 15,
        ...(input?.defeatedRedirectTarget === true ? { currentHp: 0 } : {}),
      }),
      characterSeed({
        combatantId: fighterId,
        displayName: "Monk",
        initiative: 10,
        classLevels: [{ className: "monk", level: 3 }],
        attack: null,
        resources: [
          monkDeflectAttacksFocusResource({
            usesRemaining: input?.focusUsesRemaining ?? 3,
          }),
        ],
        unitFeatures: [
          characterBattleFeatureInitForTest(unit, [
            { className: "monk", level: classLevel(3) },
          ]),
        ],
        characterUnitRefs: [
          reactionModifierUnitRefWithProfile(
            unit.id,
            ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SUPPORT_PROFILE,
          ),
        ],
      }),
    ],
  });
}
