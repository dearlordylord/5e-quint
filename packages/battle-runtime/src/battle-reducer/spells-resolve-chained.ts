// Chained spell attack-damage resolution, currently Chromatic Orb.
// Extracted from spells-resolve.ts as a procedure-local resolver slice.
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll

import { optionalProperty } from "../optional-property.ts";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import {
  attackRollHits,
  attackRollResultIsValid,
} from "@dnd/shared-algebras/attack-roll-algebra";
import { rolledDiceTotal } from "@dnd/shared-algebras/runtime-dice-algebra";
import { damageAmount as toDamageAmount, Index } from "@dnd/shared/types";
import type { DamageType } from "@dnd/surface/surface/types";
import {
  type ActionSpellBattleResolutionInput,
  type BattleAfterDamageEvent,
  type BattleAttackDamageDisposition,
  type BattleAttackDamageDispositionHole,
  type BattleConcentrationSavingThrowHole,
  type BattleCreatureState,
  type BattleDamageRelationshipDecisions,
  type BattleFill,
  type BattleResolutionResult,
  type BattleState,
  type BattleSpellCastReactionFact,
  type BattleTargetSpatialFact,
  type BonusActionSpellBattleResolutionInput,
  type BattleExecutableSpellInvocation,
  validateRolledDiceFillForDiceExpr,
} from "../battle-state-execution.ts";
import { attackRollIsCriticalHit } from "./attack-resolution.ts";
import {
  maybeOpenInterruptWindow,
  openAfterDamageSequenceInterruptWindow,
} from "./interrupt-execution.ts";
import { spellReplayContinuation } from "./spell-reaction-continuation.ts";
import { spellInvocationCastLevel } from "./spells-effective-level.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { spellAttackRerollUnsupportedIssue } from "./spell-reroll-issues.ts";
import type { CharacterBattleMetamagicOptionFact } from "../character-battle-resource-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import {
  attackRollModeMatches,
  consumeHelpAttackForAttackRoll,
  recordAttackRollOngoingFeatures,
  ongoingFeatureEnemyRelationshipDecisionRequired,
  requiredSpellAttackRollMode,
} from "./attack-roll.ts";
import { validateUniqueAttackSightFacts } from "./attack-fill-set.ts";
import {
  DamageRelationshipDecisionsByHole,
  damageRelationshipDecisionFillCheck,
} from "./damage-relationship-decisions.ts";
import { activeEffectArmorClass } from "./creature-state-execution.ts";
import {
  applyBattleHitPointDamage,
  concentrationSavingThrowHole,
  damageLifecycleConcentrationSavingThrowFillCheck,
  damageLifecycleConcentrationSavingThrowHoles,
  damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveFillCheck,
  damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveHoles,
} from "./damage-apply.ts";
import {
  addDamageAmountForType,
  applyAvailableSourceDamageRollPenalty,
  damageAmountByTypeAfterTargetAdjustments,
  isSourceDamageRollPenaltyRollFill,
  sourceDamageRollPenaltyRollForDamageRoll,
} from "./damage-helpers.ts";
import {
  attackRollHoleWithD20TestNaturalOneRerollOption,
  d20TestNaturalOneRerollRollDecisionRequired,
  d20TestNaturalOneRerollRollIssue,
  effectiveD20TestNaturalOneRerollAttackRoll,
} from "./d20-test-natural-one-reroll.ts";
import {
  REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_DECISION_HOLE_ID,
  REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_HOLE_ID,
} from "./domain-constants.ts";
import {
  isSaveGatedConditionWithRepeatDamageRepeatSaveFill,
  saveGatedConditionDamageOccurrenceKeyForChainedSpellStep,
} from "./staged-condition-repeat-save.ts";

import { needsHolesResult } from "./needs-holes-result.ts";
import { invalidResult } from "./result-helpers.ts";
import {
  parseAttackTargetChoiceFill,
  type BattleAttackTargetChoiceFill,
} from "./roll-trigger-relationship-facts.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import { resolveRemarkableAthleteCriticalHitMovement } from "./remarkable-athlete-critical-movement.ts";
import {
  targetingSaveInterdictionCheck,
  targetChoiceFillAfterAttackRedirectionWardAttackRollReplacement,
} from "./targeting-save-interdiction.ts";
import { spellCastInterruptFrame } from "./spell-cast-interrupt-frame.ts";
import {
  chainedSpellAttackRollHole,
  chainedSpellAttackRollHoleId,
  chainedSpellDamageRollHole,
  chainedSpellDamageRollHoleId,
  chainedSpellLeapTargetIsLegal,
  chainedSpellTargetHole,
  chainedSpellTargetHoleId,
  spellDamageTypeChoiceHole,
  spellTargetIsLegal,
} from "./spells-holes-fills.ts";
import { spellAttackKindForRedirect } from "./spells-profiles-attack-damage.ts";
import {
  recordAttackRollMissToHitReplacementUsed,
  selectedAttackRollMissToHitReplacement,
} from "./statblock-attacks.ts";

import {
  spellCastingTimeResourceForSpellCast,
  spendSpellCastResources,
} from "./spells-resolve-resources.ts";

import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import {
  parseSpellCastReactionFactsFill,
  type SpellCastReactionFact,
} from "./spells-resolve-fill-set.ts";

type ChainedSpellTargetChoiceFill = Omit<
  BattleAttackTargetChoiceFill,
  "spatialFacts"
> & {
  readonly spatialFacts: readonly BattleTargetSpatialFact[];
};

export type ChainedSpellStepFills = {
  readonly target: ChainedSpellTargetChoiceFill | undefined;
  readonly attackRoll:
    | Extract<BattleFill, { readonly kind: "attackRoll" }>
    | undefined;
  readonly remarkableAthleteCriticalHitMovementDecision:
    | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
    | undefined;
  readonly remarkableAthleteCriticalHitMovement:
    | Extract<BattleFill, { readonly kind: "movement" }>
    | undefined;
  readonly damageRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
};

export type ChainedSpellFillSet =
  | {
      readonly tag: "ok";
      readonly damageType:
        | Extract<BattleFill, { readonly kind: "damageTypeChoice" }>
        | undefined;
      readonly steps: readonly ChainedSpellStepFills[];
      readonly concentrationSavingThrows: readonly Extract<
        BattleFill,
        { readonly kind: "concentrationSavingThrow" }
      >[];
      readonly saveGatedConditionWithRepeatDamageRepeatSaves: readonly Extract<
        BattleFill,
        { readonly kind: "savingThrowOutcome" }
      >[];
      readonly damageDispositions: readonly Extract<
        BattleFill,
        { readonly kind: "attackDamageDisposition" }
      >[];
      readonly sourceDamageRollPenaltyRolls: readonly Extract<
        BattleFill,
        { readonly kind: "rolledDice" }
      >[];
      readonly reactionSpellTargetFacts: readonly BattleSpellCastReactionFact[];
      readonly damageRelationshipDecisions: DamageRelationshipDecisionsByHole;
    }
  | { readonly tag: "invalid"; readonly message: string };

function matchingHoleIdFills<F extends { readonly holeId: unknown }>(
  fills: readonly F[],
  holes: readonly { readonly holeId: unknown }[],
): readonly F[] {
  const holeIds = new Set(holes.map((hole) => String(hole.holeId)));
  return fills.filter((fill) => holeIds.has(String(fill.holeId)));
}

export function resolveChainedSpellAttackDamageAct(input: {
  readonly input:
    | ActionSpellBattleResolutionInput
    | BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >;
  readonly fillSet?: ChainedSpellFillSet;
  readonly opensSpellCastReactionWindow?: boolean;
  readonly spendsCastResources?: boolean;
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly CharacterBattleMetamagicOptionFact[];
}): BattleResolutionResult {
  const fillSet =
    input.fillSet ??
    chainedSpellFillSet(
      input.input.fills,
      input.invocation,
      input.actorId,
      input.input.state,
    );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (fillSet.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(input.input.state, "invalidFill", fillSet.message);
  }
  /* v8 ignore stop -- @preserve */
  if (fillSet.damageType === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageTypeChoiceHole(input.invocation),
    ]);
  }
  const selectedDamageType = fillSet.damageType.value;
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!input.invocation.damageTypeChoices.includes(selectedDamageType)) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Chained spell damage type must be one of the selected spell's choices.",
    );
  }
  /* v8 ignore stop -- @preserve */

  let replayState = input.input.state;
  let targeted: readonly CombatantId[] = [];
  const afterDamageEvents: BattleAfterDamageEvent[] = [];
  const concentrationHoles: BattleConcentrationSavingThrowHole[] = [];
  const stagedConditionDamageRepeatSaveHoleIds = new Set<string>();
  const damageDispositionHoles: BattleAttackDamageDispositionHole[] = [];
  const maxLeaps = Number(spellInvocationCastLevel(input.invocation));

  for (let stepIndex = 0; stepIndex <= maxLeaps; stepIndex += 1) {
    const step = fillSet.steps[stepIndex] ?? emptyChainedSpellStepFills();
    if (step.target === undefined) {
      return needsHolesResult(replayState, input.input.subject, [
        chainedSpellTargetHole({
          state: replayState,
          actorId: input.actorId,
          invocation: input.invocation,
          stepIndex,
          targeted,
        }),
      ]);
    }
    const target = replayState.combatants.get(step.target.value);
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (target === undefined) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Chained spell target must be a combatant.",
      );
    }
    /* v8 ignore stop -- @preserve */
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (targeted.includes(target.combatantId)) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        "chosen-damage bouncing attack cannot target a creature more than once in the same casting.",
      );
    }
    /* v8 ignore stop -- @preserve */
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      stepIndex === 0
        ? !spellTargetIsLegal(
            replayState,
            input.actorId,
            target.combatantId,
            input.invocation,
            step.target.spatialFacts,
          )
        : !chainedSpellLeapTargetIsLegal(
            input.invocation,
            targeted[stepIndex - 1],
            target.combatantId,
            step.target.spatialFacts,
          )
    ) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        stepIndex === 0
          ? "Spell target must be a combatant within the selected spell's supported range."
          : "chosen-damage bouncing attack leap target must be different and within 30 feet of the previous target.",
      );
    }
    /* v8 ignore stop -- @preserve */
    targeted = [...targeted, target.combatantId];

    const targetEventId = chainedSpellTargetHoleId(input.invocation, stepIndex);
    const interdictionCheck = targetingSaveInterdictionCheck({
      state: replayState,
      triggeringProcedureRef: input.invocation.sourceProcedureRef,
      triggeringCombatantId: input.actorId,
      wardedCombatantId: target.combatantId,
      triggeringTargetEventId: targetEventId,
      replacementTargetKind: "attackRoll",
      fills: input.input.fills,
    });
    if (interdictionCheck.tag === "needsHoles") {
      return needsHolesResult(replayState, input.input.subject, [
        interdictionCheck.hole,
      ]);
    }
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (interdictionCheck.tag === "invalid") {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        interdictionCheck.message,
      );
    }
    /* v8 ignore stop -- @preserve */
    if (interdictionCheck.tag === "lost") {
      if (input.spendsCastResources === false) {
        return {
          tag: "resolved",
          state: replayState,
          snapshot: snapshotBattle(replayState),
        };
      }
      return spendSpellCastResources({
        state: replayState,
        actorId: input.actorId,
        invocation: input.invocation,
        errorState: input.input.state,
        ...optionalProperty("actionCostOverride", input.actionCostOverride),
        ...optionalProperty(
          "metamagicApplications",
          input.metamagicApplications,
        ),
      });
    }
    if (interdictionCheck.tag === "newTarget") {
      const replacementTarget = replayState.combatants.get(
        interdictionCheck.targetId,
      );
      const replacementIsLegal =
        replacementTarget !== undefined &&
        (stepIndex === 0
          ? spellTargetIsLegal(
              replayState,
              input.actorId,
              replacementTarget.combatantId,
              input.invocation,
              interdictionCheck.spatialFacts,
            )
          : chainedSpellLeapTargetIsLegal(
              input.invocation,
              targeted[stepIndex - 1],
              replacementTarget.combatantId,
              interdictionCheck.spatialFacts,
            ));
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (replacementTarget === undefined || !replacementIsLegal) {
        /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.input.state,
          "invalidFill",
          stepIndex === 0
            ? "attack-redirection ward replacement chosen-damage bouncing attack target must be legal for the selected spell."
            : "Attack-redirection ward replacement chosen-damage bouncing attack leap target must be different and within 30 feet of the previous target.",
        );
      }
      /* v8 ignore stop -- @preserve */
      const originalTargetFill = input.input.fills.find(
        (
          fill,
        ): fill is Extract<BattleFill, { readonly kind: "targetChoice" }> =>
          fill.kind === "targetChoice" && fill.holeId === targetEventId,
      );
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (originalTargetFill === undefined) {
        /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.input.state,
          "invalidFill",
          "attack-redirection ward replacement requires the original chosen-damage bouncing attack target fill.",
        );
      }
      /* v8 ignore stop -- @preserve */
      const fills = input.input.fills
        .filter((fill) => fill.kind !== "targetingSaveInterdictionOutcome")
        .map(
          (fill): BattleFill =>
            fill === originalTargetFill
              ? targetChoiceFillAfterAttackRedirectionWardAttackRollReplacement(
                  {
                    fill,
                    replacement: interdictionCheck,
                  },
                )
              : fill,
        );
      const replacementFillSet = chainedSpellFillSet(
        fills,
        input.invocation,
        input.actorId,
        input.input.state,
      );
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (replacementFillSet.tag === "invalid") {
        /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.input.state,
          "invalidFill",
          replacementFillSet.message,
        );
      }
      /* v8 ignore stop -- @preserve */
      return resolveChainedSpellAttackDamageAct({
        ...input,
        input: { ...input.input, fills },
        fillSet: replacementFillSet,
      });
    }

    if (stepIndex === 0 && input.opensSpellCastReactionWindow !== false) {
      const spellCastReactionWindow = maybeOpenInterruptWindow(
        replayState,
        spellCastInterruptFrame({
          casterId: input.actorId,
          invocation: input.invocation,
          targetIds: [target.combatantId],
          reactionSpellTargetFacts: fillSet.reactionSpellTargetFacts,
          castingResource: spellCastingTimeResourceForSpellCast({
            invocation: input.invocation,
            actionCostOverride: input.actionCostOverride,
          }),
          continuation: spellReplayContinuation(input.input),
        }),
        input.input.handledInterruptTrigger,
      );
      if (spellCastReactionWindow !== null) {
        return spellCastReactionWindow;
      }
    }

    const requiredRollMode = requiredSpellAttackRollMode(
      replayState,
      input.actorId,
      target.combatantId,
      input.invocation,
      step.target.spatialFacts,
    );
    if (step.attackRoll === undefined) {
      return needsHolesResult(replayState, input.input.subject, [
        chainedSpellAttackRollHole(
          replayState,
          input.actorId,
          input.invocation,
          stepIndex,
          requiredRollMode,
        ),
      ]);
    }
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (!attackRollResultIsValid(step.attackRoll.value)) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Spell attack roll result is outside the d20 attack-roll protocol.",
      );
    }
    /* v8 ignore stop -- @preserve */
    const spellAttackRerollIssue = spellAttackRerollUnsupportedIssue(
      step.attackRoll.value,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (spellAttackRerollIssue !== null) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        spellAttackRerollIssue,
      );
    }
    /* v8 ignore stop -- @preserve */
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (!attackRollModeMatches(step.attackRoll.value, requiredRollMode)) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Spell attack roll mode does not match the current attack-roll rule.",
      );
    }
    /* v8 ignore stop -- @preserve */
    const actorBeforeSpellAttack = replayState.combatants.get(input.actorId);
    if (
      d20TestNaturalOneRerollRollDecisionRequired({
        actor: actorBeforeSpellAttack,
        originalNaturalD20: Number(step.attackRoll.value.naturalD20),
        rollMode: step.attackRoll.value.rollMode,
        rolledD20s: step.attackRoll.value.rolledD20s,
        decision: step.attackRoll.value.d20TestNaturalOneReroll,
      })
    ) {
      return needsHolesResult(input.input.state, input.input.subject, [
        attackRollHoleWithD20TestNaturalOneRerollOption(
          chainedSpellAttackRollHole(
            replayState,
            input.actorId,
            input.invocation,
            stepIndex,
            requiredRollMode,
          ),
        ),
      ]);
    }
    const d20TestNaturalOneRerollIssue = d20TestNaturalOneRerollRollIssue({
      actor: actorBeforeSpellAttack,
      total: step.attackRoll.value.total,
      originalNaturalD20: Number(step.attackRoll.value.naturalD20),
      rollMode: step.attackRoll.value.rollMode,
      rolledD20s: step.attackRoll.value.rolledD20s,
      decision: step.attackRoll.value.d20TestNaturalOneReroll,
      requiredRollMode,
    });
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (d20TestNaturalOneRerollIssue !== null) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        d20TestNaturalOneRerollIssue,
      );
    }
    /* v8 ignore stop -- @preserve */
    const effectiveAttackRoll = effectiveD20TestNaturalOneRerollAttackRoll(
      step.attackRoll.value,
    );

    const ordinaryHit = attackRollHits(
      effectiveAttackRoll,
      currentArmorClass(activeEffectArmorClass(replayState, target)),
    );
    const missToHitReplacement = selectedAttackRollMissToHitReplacement({
      state: replayState,
      subject: input.input.subject,
      attackerId: input.actorId,
      targetId: target.combatantId,
      attackRoll: effectiveAttackRoll,
      ordinaryHit,
    });
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      step.attackRoll.value.missToHitReplacementProcedureRef !== undefined &&
      missToHitReplacement === null
    ) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        ordinaryHit
          ? "Attack-roll miss-to-hit replacement can only be selected after a miss."
          : "Attack-roll miss-to-hit replacement is not available for this spell attack roll.",
      );
    }
    /* v8 ignore stop -- @preserve */
    const attackRolledState = recordAttackRollMissToHitReplacementUsed(
      consumeHelpAttackForAttackRoll(
        recordAttackRollOngoingFeatures(
          replayState,
          input.actorId,
          target.combatantId,
          null,
          [...(step.target.relationshipFacts ?? [])],
        ),
        input.actorId,
        target.combatantId,
      ),
      input.actorId,
      missToHitReplacement,
      {
        subject: input.input.subject,
        targetId: target.combatantId,
        attackRoll: effectiveAttackRoll,
      },
    );
    replayState = attackRolledState;
    const hit = ordinaryHit || missToHitReplacement !== null;
    const critical = attackRollIsCriticalHit(effectiveAttackRoll);
    if (!hit) {
      const remarkableAthleteMovement =
        resolveRemarkableAthleteCriticalHitMovement({
          state: replayState,
          subject: input.input.subject,
          attackerId: input.actorId,
          scoredCriticalHit: false,
          fills: step,
        });
      if (remarkableAthleteMovement.tag === "result") {
        return remarkableAthleteMovement.result;
      }
      replayState = remarkableAthleteMovement.state;
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (!chainedSpellLaterStepsAreEmpty(fillSet.steps, stepIndex)) {
        /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.input.state,
          "invalidFill",
          "chosen-damage bouncing attack chain cannot continue after a missed attack roll.",
        );
      }
      /* v8 ignore stop -- @preserve */
      const extraFillValidation = validateChainedSpellFollowUpFills({
        concentrationHoles,
        concentrationFills: fillSet.concentrationSavingThrows,
        stagedConditionDamageRepeatSaveHoleIds,
        stagedConditionDamageRepeatSaveFills:
          fillSet.saveGatedConditionWithRepeatDamageRepeatSaves,
        damageDispositionHoles,
        damageDispositionFills: fillSet.damageDispositions,
      });
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (extraFillValidation !== null) {
        /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.input.state,
          "invalidFill",
          extraFillValidation,
        );
      }
      /* v8 ignore stop -- @preserve */
      return resolveCompletedChainedSpell({
        input,
        state: replayState,
        afterDamageEvents,
      });
    }

    const attackHitReactionWindow = maybeOpenInterruptWindow(
      replayState,
      {
        trigger: "attackHit",
        attackerId: input.actorId,
        targetId: target.combatantId,
        attackRoll: effectiveAttackRoll,
        attackKind: spellAttackKindForRedirect(input.invocation.attackKind),
        attackHitTriggerKind: "otherAttack",
        damageTypes: [selectedDamageType],
        continuation: spellReplayContinuation(input.input),
      },
      input.input.handledInterruptTrigger,
    );
    if (attackHitReactionWindow !== null) {
      return attackHitReactionWindow;
    }

    const remarkableAthleteMovement =
      resolveRemarkableAthleteCriticalHitMovement({
        state: replayState,
        subject: input.input.subject,
        attackerId: input.actorId,
        scoredCriticalHit: critical,
        fills: step,
      });
    if (remarkableAthleteMovement.tag === "result") {
      return remarkableAthleteMovement.result;
    }
    replayState = remarkableAthleteMovement.state;

    if (step.damageRoll === undefined) {
      return needsHolesResult(replayState, input.input.subject, [
        chainedSpellDamageRollHole(input.invocation, selectedDamageType, {
          stepIndex,
          critical,
        }),
      ]);
    }
    const damageValidation = validateChainedSpellDamageFill(
      step.damageRoll,
      input.invocation,
      selectedDamageType,
      { stepIndex, critical },
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (damageValidation !== null) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.input.state, "invalidFill", damageValidation);
    }
    /* v8 ignore stop -- @preserve */
    const damageByType = chainedSpellDamageByType(
      input.invocation,
      selectedDamageType,
      step.damageRoll,
    );
    const damageSource = replayState.combatants.get(input.actorId);
    const sourcePenalty = applyAvailableSourceDamageRollPenalty(
      damageSource,
      damageByType,
      step.damageRoll.holeId,
      sourceDamageRollPenaltyRollForDamageRoll(
        fillSet.sourceDamageRollPenaltyRolls,
        damageSource,
        damageByType,
        step.damageRoll.holeId,
      ),
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (sourcePenalty.tag === "invalid") {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      );
    }
    /* v8 ignore stop -- @preserve */
    if (sourcePenalty.tag === "needsHoles") {
      return needsHolesResult(replayState, input.input.subject, [
        ...sourcePenalty.holes,
      ]);
    }
    const damageAmount = damageAmountByTypeAfterTargetAdjustments(
      replayState,
      target,
      sourcePenalty.damageByType,
    );
    const damageOccurrenceKey =
      saveGatedConditionDamageOccurrenceKeyForChainedSpellStep({
        sourceProcedureRef: input.invocation.sourceProcedureRef,
        stepIndex: Index(stepIndex),
        targetId: target.combatantId,
      });
    const concentrationLifecycleHoles =
      damageLifecycleConcentrationSavingThrowHoles({
        state: replayState,
        target,
        damageAmount,
      });
    concentrationHoles.push(...concentrationLifecycleHoles);
    const concentrationLifecycleFills = matchingHoleIdFills(
      fillSet.concentrationSavingThrows,
      concentrationLifecycleHoles,
    );
    const concentrationSaveCheck =
      damageLifecycleConcentrationSavingThrowFillCheck({
        state: replayState,
        target,
        damageAmount,
        fills: concentrationLifecycleFills,
      });
    if (concentrationSaveCheck.tag === "needsHoles") {
      return needsHolesResult(replayState, input.input.subject, [
        ...concentrationSaveCheck.holes,
      ]);
    }
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (concentrationSaveCheck.tag === "invalid") {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        concentrationSaveCheck.message,
      );
    }
    /* v8 ignore stop -- @preserve */
    const concentrationSave = concentrationSavingThrowHole(
      target,
      damageAmount,
    );
    const concentrationFill =
      concentrationSave === null
        ? undefined
        : concentrationSavingThrowFillFor(
            concentrationLifecycleFills,
            concentrationSave,
          );
    const dispositionHole = zeroHitPointReplacementDispositionHole({
      damageSourceId: input.actorId,
      target,
      damageAmount,
    });
    if (dispositionHole !== null) {
      damageDispositionHoles.push(dispositionHole);
      if (
        damageDispositionFillFor(
          fillSet.damageDispositions,
          dispositionHole,
        ) === undefined
      ) {
        return needsHolesResult(replayState, input.input.subject, [
          dispositionHole,
        ]);
      }
    }
    const stagedConditionLifecycleHoles =
      damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveHoles({
        state: replayState,
        target,
        damageAmount,
        damageOccurrenceKey: damageOccurrenceKey,
      });
    const stagedConditionLifecycleFills = matchingHoleIdFills(
      fillSet.saveGatedConditionWithRepeatDamageRepeatSaves,
      stagedConditionLifecycleHoles,
    );
    const stagedConditionSaveCheck =
      damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveFillCheck({
        state: replayState,
        target,
        damageAmount,
        fills: stagedConditionLifecycleFills,
        damageOccurrenceKey: damageOccurrenceKey,
      });
    if (stagedConditionSaveCheck.tag === "needsHoles") {
      return needsHolesResult(replayState, input.input.subject, [
        ...stagedConditionSaveCheck.holes,
      ]);
    }
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (stagedConditionSaveCheck.tag === "invalid") {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        stagedConditionSaveCheck.message,
      );
    }
    /* v8 ignore stop -- @preserve */
    for (const hole of stagedConditionSaveCheck.holes) {
      stagedConditionDamageRepeatSaveHoleIds.add(String(hole.holeId));
    }
    const damageDisposition = damageDispositionForTarget(
      dispositionHole === null ? [] : [dispositionHole],
      fillSet.damageDispositions,
      target.combatantId,
    );
    const relationshipCheck = damageRelationshipDecisionFillCheck({
      state: replayState,
      damageEventHoleId: step.damageRoll.holeId,
      damageSourceId: input.actorId,
      targets:
        damageAmount <= 0
          ? []
          : [
              {
                targetId: target.combatantId,
                damageAmount: toDamageAmount(damageAmount),
                damageDisposition,
              },
            ],
      spatialFacts: step.target.spatialFacts,
      decisionsByRelationshipHole: fillSet.damageRelationshipDecisions,
    });
    if (relationshipCheck.tag === "needsHoles") {
      return needsHolesResult(
        replayState,
        input.input.subject,
        relationshipCheck.holes,
      );
    }
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (relationshipCheck.tag === "invalid") {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        relationshipCheck.message,
      );
    }
    /* v8 ignore stop -- @preserve */
    replayState = applyChainedSpellDamage(
      replayState,
      target,
      damageAmount,
      critical,
      {
        concentrationSavingThrow: concentrationFill,
        damageDisposition,
        linkedDefenseResistanceDamageShareConcentrationSavingThrows:
          concentrationLifecycleFills,
        saveGatedConditionDamageRepeatSave: {
          kind: "repeatSave",
          fills: stagedConditionLifecycleFills,
          occurrenceKey: damageOccurrenceKey,
        },
        damageSourceId: input.actorId,
        spatialFacts: step.target.spatialFacts,
        ...optionalProperty(
          "relationshipDecisions",
          relationshipCheck.decisions,
        ),
      },
    );
    afterDamageEvents.push({
      damageSourceId: input.actorId,
      damagedId: target.combatantId,
      damageAmount: toDamageAmount(damageAmount),
      reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
        facts: step.target.spatialFacts,
        damagedId: target.combatantId,
        damageSourceId: input.actorId,
      }),
    });

    if (
      !damageRollHasDuplicateD8Face(step.damageRoll) ||
      stepIndex >= maxLeaps
    ) {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (!chainedSpellLaterStepsAreEmpty(fillSet.steps, stepIndex)) {
        /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.input.state,
          "invalidFill",
          "chosen-damage bouncing attack chain can continue only after duplicate d8 damage faces and remaining leap budget.",
        );
      }
      /* v8 ignore stop -- @preserve */
      const extraFillValidation = validateChainedSpellFollowUpFills({
        concentrationHoles,
        concentrationFills: fillSet.concentrationSavingThrows,
        stagedConditionDamageRepeatSaveHoleIds,
        stagedConditionDamageRepeatSaveFills:
          fillSet.saveGatedConditionWithRepeatDamageRepeatSaves,
        damageDispositionHoles,
        damageDispositionFills: fillSet.damageDispositions,
      });
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (extraFillValidation !== null) {
        /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.input.state,
          "invalidFill",
          extraFillValidation,
        );
      }
      /* v8 ignore stop -- @preserve */
      return resolveCompletedChainedSpell({
        input,
        state: replayState,
        afterDamageEvents,
      });
    }
  }

  /* v8 ignore start -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
  return invalidResult(
    input.input.state,
    "invalidFill",
    "chosen-damage bouncing attack chain exceeded its spell-slot leap budget.",
  );
  /* v8 ignore stop -- @preserve */
}

export function resolveCompletedChainedSpell(input: {
  readonly input: {
    readonly input:
      | ActionSpellBattleResolutionInput
      | BonusActionSpellBattleResolutionInput;
    readonly actorId: CombatantId;
    readonly invocation: Extract<
      BattleExecutableSpellInvocation,
      { readonly procedure: "chainedSpellAttackDamage" }
    >;
    readonly spendsCastResources?: boolean;
    readonly actionCostOverride?: "magicAction" | "bonusAction";
    readonly metamagicApplications?: readonly CharacterBattleMetamagicOptionFact[];
  };
  readonly state: BattleState;
  readonly afterDamageEvents: readonly BattleAfterDamageEvent[];
}): BattleResolutionResult {
  if (input.input.spendsCastResources === false) {
    return openAfterDamageSequenceInterruptWindow({
      state: input.state,
      subject: input.input.input.subject,
      events: input.afterDamageEvents,
      objectDamages: [],
      objectIgnitions: [],
      droppedObjects: [],
      handledInterruptTrigger: input.input.input.handledInterruptTrigger,
    });
  }
  const spentResources = spendSpellCastResources({
    state: input.state,
    actorId: input.input.actorId,
    invocation: input.input.invocation,
    errorState: input.input.input.state,
    ...optionalProperty("actionCostOverride", input.input.actionCostOverride),
    ...optionalProperty(
      "metamagicApplications",
      input.input.metamagicApplications,
    ),
  });
  if (spentResources.tag !== "resolved") {
    return spentResources;
  }
  return openAfterDamageSequenceInterruptWindow({
    state: spentResources.state,
    subject: input.input.input.subject,
    events: input.afterDamageEvents,
    objectDamages: [],
    objectIgnitions: [],
    droppedObjects: [],
    handledInterruptTrigger: input.input.input.handledInterruptTrigger,
  });
}

export function emptyChainedSpellStepFills(): ChainedSpellStepFills {
  return {
    target: undefined,
    attackRoll: undefined,
    remarkableAthleteCriticalHitMovementDecision: undefined,
    remarkableAthleteCriticalHitMovement: undefined,
    damageRoll: undefined,
  };
}

export function chainedSpellFillSet(
  fills: readonly BattleFill[],
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  actorId: CombatantId,
  state: BattleState,
): ChainedSpellFillSet {
  let damageType:
    | Extract<BattleFill, { readonly kind: "damageTypeChoice" }>
    | undefined;
  const steps = Array.from(
    { length: Number(spellInvocationCastLevel(invocation)) + 1 },
    () => emptyChainedSpellStepFills(),
  );
  const concentrationSavingThrows: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[] = [];
  const saveGatedConditionWithRepeatDamageRepeatSaves: Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [];
  const damageDispositions: Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >[] = [];
  const sourceDamageRollPenaltyRolls: Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >[] = [];
  let reactionSpellTargetFacts: readonly SpellCastReactionFact[] = [];
  let reactionSpellTargetFactsFilled = false;

  for (const fill of fills) {
    if (fill.kind === "damageRelationshipDecisions") {
      continue;
    }
    if (fill.kind === "turnConstraintSomaticSpellFailureOutcome") {
      continue;
    }

    const spellCastReactionFacts = parseSpellCastReactionFactsFill(fill);
    if (spellCastReactionFacts.tag !== "notSpellCastReactionFactsFill") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (reactionSpellTargetFactsFilled) {
        return {
          tag: "invalid",
          message: "Spell-cast Reaction trigger facts were filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (spellCastReactionFacts.tag === "invalid") {
        return {
          tag: "invalid",
          message: spellCastReactionFacts.message,
        };
      }
      /* v8 ignore stop -- @preserve */
      reactionSpellTargetFacts = spellCastReactionFacts.facts;
      reactionSpellTargetFactsFilled = true;
      continue;
    }
    if (fill.kind === "rolledDice" && isSourceDamageRollPenaltyRollFill(fill)) {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        sourceDamageRollPenaltyRolls.some(
          (candidate) => candidate.holeId === fill.holeId,
        )
      ) {
        return {
          tag: "invalid",
          message: "Source damage roll penalty was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      sourceDamageRollPenaltyRolls.push(fill);
      continue;
    }
    if (fill.kind === "damageTypeChoice") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.holeId !== spellDamageTypeChoiceHole(invocation).holeId) {
        return {
          tag: "invalid",
          message:
            "Damage type choice must use the selected chained spell act damage-type hole.",
        };
      }
      /* v8 ignore stop -- @preserve */
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (damageType !== undefined) {
        return {
          tag: "invalid",
          message: "Chained spell damage type was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      damageType = fill;
      continue;
    }
    if (
      fill.kind === "unitFeatureDecision" &&
      fill.holeId === REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_DECISION_HOLE_ID
    ) {
      const stepIndex =
        latestChainedSpellStepIndexForRemarkableAthleteDecision(steps);
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (stepIndex === null) {
        return {
          tag: "invalid",
          message:
            "Remarkable Athlete movement decision must follow a chained spell attack roll.",
        };
      }
      /* v8 ignore stop -- @preserve */
      const step = steps[stepIndex];
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (step === undefined) {
        return {
          tag: "invalid",
          message:
            "Remarkable Athlete movement decision is outside this chained spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      steps[stepIndex] = {
        ...step,
        remarkableAthleteCriticalHitMovementDecision: fill,
      };
      continue;
    }
    if (
      fill.kind === "movement" &&
      fill.holeId === REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_HOLE_ID
    ) {
      const stepIndex =
        latestChainedSpellStepIndexForRemarkableAthleteMovement(steps);
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (stepIndex === null) {
        return {
          tag: "invalid",
          message:
            "Remarkable Athlete movement must follow a chained spell use decision.",
        };
      }
      /* v8 ignore stop -- @preserve */
      const step = steps[stepIndex];
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (step === undefined) {
        return {
          tag: "invalid",
          message:
            "Remarkable Athlete movement is outside this chained spell act.",
        };
      }
      /* v8 ignore stop -- @preserve */
      steps[stepIndex] = {
        ...step,
        remarkableAthleteCriticalHitMovement: fill,
      };
      continue;
    }
    if (
      fill.kind === "targetChoice" ||
      fill.kind === "attackRoll" ||
      fill.kind === "rolledDice"
    ) {
      const stepIndex = chainedSpellStepIndexForFill(fill, invocation);
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (stepIndex === null || steps[stepIndex] === undefined) {
        return {
          tag: "invalid",
          message: `Fill ${fill.kind} does not match the chained spell replay holes.`,
        };
      }
      /* v8 ignore stop -- @preserve */
      const step = steps[stepIndex];
      if (fill.kind === "targetChoice") {
        const parsed = parseAttackTargetChoiceFill(
          fill,
          actorId,
          ongoingFeatureEnemyRelationshipDecisionRequired(
            state,
            actorId,
            "attackRollAgainstEnemy",
          ),
        );
        if (parsed.tag === "invalid") return parsed;
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (step.target !== undefined) {
          return {
            tag: "invalid",
            message: "Chained spell target was filled twice for one step.",
          };
        }
        /* v8 ignore stop -- @preserve */
        const spatialFacts = fill.spatialFacts ?? [];
        const sightFactValidation =
          chainedSpellAttackSightFactValidation(spatialFacts);
        if (sightFactValidation !== null) return sightFactValidation;
        steps[stepIndex] = {
          ...step,
          target: { ...parsed.fill, spatialFacts },
        };
        continue;
      }
      if (fill.kind === "attackRoll") {
        /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (step.attackRoll !== undefined) {
          return {
            tag: "invalid",
            message: "Chained spell attack roll was filled twice for one step.",
          };
        }
        /* v8 ignore stop -- @preserve */
        steps[stepIndex] = { ...step, attackRoll: fill };
        continue;
      }
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (step.damageRoll !== undefined) {
        return {
          tag: "invalid",
          message: "Chained spell damage roll was filled twice for one step.",
        };
      }
      /* v8 ignore stop -- @preserve */
      steps[stepIndex] = { ...step, damageRoll: fill };
      continue;
    }
    if (fill.kind === "concentrationSavingThrow") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        concentrationSavingThrows.some(
          (candidate) => candidate.holeId === fill.holeId,
        )
      ) {
        return {
          tag: "invalid",
          message: "Concentration Saving Throw was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      concentrationSavingThrows.push(fill);
      continue;
    }
    if (
      fill.kind === "savingThrowOutcome" &&
      isSaveGatedConditionWithRepeatDamageRepeatSaveFill(fill)
    ) {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        saveGatedConditionWithRepeatDamageRepeatSaves.some(
          (candidate) => candidate.holeId === fill.holeId,
        )
      ) {
        return {
          tag: "invalid",
          message: "Staged-condition repeat save was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      saveGatedConditionWithRepeatDamageRepeatSaves.push(fill);
      continue;
    }
    if (fill.kind === "attackDamageDisposition") {
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        damageDispositions.some((candidate) => candidate.holeId === fill.holeId)
      ) {
        return {
          tag: "invalid",
          message: "Damage disposition was filled twice.",
        };
      }
      /* v8 ignore stop -- @preserve */
      damageDispositions.push(fill);
      continue;
    }
    if (fill.kind === "targetingSaveInterdictionOutcome") {
      continue;
    }
    /* v8 ignore start -- @preserve -- Malformed resolution input: every fill kind emitted for a chained-spell replay is consumed by a preceding parser branch. */
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the chained spell replay holes.`,
    };
    /* v8 ignore stop -- @preserve */
  }

  const relationshipDecisions = DamageRelationshipDecisionsByHole.parse({
    fills,
    damageEventHoleIds: new Set(
      steps.flatMap((step) =>
        [step.damageRoll].flatMap((fill) =>
          fill === undefined ? [] : [fill.holeId],
        ),
      ),
    ),
    owner: "a chained Spell",
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipDecisions.tag === "invalid") {
    return {
      tag: "invalid",
      message: relationshipDecisions.message,
    };
  }
  /* v8 ignore stop -- @preserve */

  return {
    tag: "ok",
    damageType,
    steps,
    concentrationSavingThrows,
    saveGatedConditionWithRepeatDamageRepeatSaves,
    damageDispositions,
    sourceDamageRollPenaltyRolls,
    reactionSpellTargetFacts,
    damageRelationshipDecisions:
      relationshipDecisions.decisionsByRelationshipHole,
  };
}

function chainedSpellAttackSightFactValidation(
  facts: readonly BattleTargetSpatialFact[],
): Extract<ChainedSpellFillSet, { readonly tag: "invalid" }> | null {
  const message = validateUniqueAttackSightFacts(facts);
  return message === null ? null : { tag: "invalid", message };
}

export function chainedSpellStepIndexForFill(
  fill: Extract<
    BattleFill,
    { readonly kind: "targetChoice" | "attackRoll" | "rolledDice" }
  >,
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
): number | null {
  for (
    let stepIndex = 0;
    stepIndex <= Number(spellInvocationCastLevel(invocation));
    stepIndex += 1
  ) {
    if (
      fill.kind === "targetChoice" &&
      fill.holeId === chainedSpellTargetHoleId(invocation, stepIndex)
    ) {
      return stepIndex;
    }
    if (
      fill.kind === "attackRoll" &&
      fill.holeId === chainedSpellAttackRollHoleId(invocation, stepIndex)
    ) {
      return stepIndex;
    }
    if (
      fill.kind === "rolledDice" &&
      (fill.holeId ===
        chainedSpellDamageRollHoleId(invocation, stepIndex, false) ||
        fill.holeId ===
          chainedSpellDamageRollHoleId(invocation, stepIndex, true))
    ) {
      return stepIndex;
    }
  }
  /* v8 ignore next -- @preserve -- Malformed resolution input: callers pass only target, attack-roll, or damage fills whose hole ids were emitted for this chained spell. */
  return null;
}

export function chainedSpellLaterStepsAreEmpty(
  steps: readonly ChainedSpellStepFills[],
  completedStepIndex: number,
): boolean {
  return steps
    .slice(completedStepIndex + 1)
    .every(
      (step) =>
        step.target === undefined &&
        step.attackRoll === undefined &&
        step.remarkableAthleteCriticalHitMovementDecision === undefined &&
        step.remarkableAthleteCriticalHitMovement === undefined &&
        step.damageRoll === undefined,
    );
}

function latestChainedSpellStepIndexForRemarkableAthleteDecision(
  steps: readonly ChainedSpellStepFills[],
): number | null {
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index];
    if (
      step !== undefined &&
      step.attackRoll !== undefined &&
      step.remarkableAthleteCriticalHitMovementDecision === undefined
    ) {
      return index;
    }
  }
  /* v8 ignore next -- @preserve -- Malformed resolution input: this helper is called only after a decoded Remarkable Athlete decision fill, which requires a preceding chained attack roll. */
  return null;
}

function latestChainedSpellStepIndexForRemarkableAthleteMovement(
  steps: readonly ChainedSpellStepFills[],
): number | null {
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index];
    if (
      step !== undefined &&
      step.remarkableAthleteCriticalHitMovementDecision !== undefined &&
      step.remarkableAthleteCriticalHitMovement === undefined
    ) {
      return index;
    }
  }
  /* v8 ignore next -- @preserve -- Malformed resolution input: this helper is called only after a decoded Remarkable Athlete movement fill, which requires a preceding use decision. */
  return null;
}

export function validateChainedSpellFollowUpFills(input: {
  readonly concentrationHoles: readonly BattleConcentrationSavingThrowHole[];
  readonly concentrationFills: readonly Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[];
  readonly stagedConditionDamageRepeatSaveHoleIds: ReadonlySet<string>;
  readonly stagedConditionDamageRepeatSaveFills: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[];
  readonly damageDispositionHoles: readonly BattleAttackDamageDispositionHole[];
  readonly damageDispositionFills: readonly Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >[];
}): string | null {
  const concentrationHoleIds = new Set(
    input.concentrationHoles.map((hole) => hole.holeId),
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: replay accepts Concentration fills only for holes derived from the damaged chained-spell targets. */
  if (
    input.concentrationFills.some(
      (fill) => !concentrationHoleIds.has(fill.holeId),
    )
  ) {
    return "Concentration Saving Throw fill is only valid for a concentrating damaged target.";
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: replay accepts Hideous Laughter repeat saves only for event-scoped holes derived while applying chained damage. */
  if (
    input.stagedConditionDamageRepeatSaveFills.some(
      (fill) =>
        !input.stagedConditionDamageRepeatSaveHoleIds.has(String(fill.holeId)),
    )
  ) {
    return "damage-triggered repeat-save condition repeat save fills are only valid for a damaged target affected by damage-triggered repeat-save condition.";
  }
  /* v8 ignore stop -- @preserve */
  return damageDispositionFillsValidation({
    holes: input.damageDispositionHoles,
    fills: input.damageDispositionFills,
  });
}

export function damageRollHasDuplicateD8Face(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): boolean {
  const counts = new Map<number, number>();
  for (const group of fill.value) {
    for (const result of group.results) {
      const face = Number(result);
      counts.set(face, (counts.get(face) ?? 0) + 1);
    }
  }
  return [...counts.values()].some((count) => count >= 2);
}

export function validateChainedSpellDamageFill(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  damageType: DamageType,
  step: { readonly stepIndex: number; readonly critical: boolean },
): string | null {
  /* v8 ignore start -- @preserve -- Malformed resolution input: discovery emits the damage hole for this exact chained step and critical-hit state. */
  if (
    fill.holeId !==
    chainedSpellDamageRollHole(invocation, damageType, step).holeId
  ) {
    return step.critical
      ? "Critical hit chained spell damage must use the critical step damage hole."
      : "Chained spell damage must use the selected step damage hole.";
  }
  /* v8 ignore stop -- @preserve */
  return validateRolledDiceFillForDiceExpr(fill, {
    dice: invocation.damage.expr.dice * (step.critical ? 2 : 1),
    dieSize: invocation.damage.expr.dieSize,
  });
}

function chainedSpellDamageByType(
  invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  damageType: DamageType,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): ReadonlyMap<DamageType, number> {
  const diceTotal = rolledDiceTotal(damageRoll.value);
  return addDamageAmountForType(
    new Map(),
    damageType,
    diceTotal + (invocation.damage.expr.flat ?? 0),
  );
}

type ChainedSpellDamageContext = {
  concentrationSavingThrow:
    | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
    | undefined;
  readonly damageDisposition: BattleAttackDamageDisposition;
  readonly linkedDefenseResistanceDamageShareConcentrationSavingThrows: readonly Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[];
  readonly saveGatedConditionDamageRepeatSave: Parameters<
    typeof applyBattleHitPointDamage
  >[0]["saveGatedConditionDamageRepeatSave"];
  readonly damageSourceId: CombatantId;
  readonly spatialFacts: readonly BattleTargetSpatialFact[];
  readonly relationshipDecisions?: BattleDamageRelationshipDecisions;
};

export function applyChainedSpellDamage(
  state: BattleState,
  target: BattleCreatureState,
  damageAmount: number,
  critical: boolean,
  context: ChainedSpellDamageContext,
): BattleState {
  return applyBattleHitPointDamage({
    state,
    target,
    damageAmount,
    deathFailuresAtZeroHp: critical ? 2 : 1,
    damageDisposition: context.damageDisposition,
    damageSourceId: context.damageSourceId,
    spatialFacts: context.spatialFacts,
    ...optionalProperty("relationshipDecisions", context.relationshipDecisions),
    concentrationSavingThrow: context.concentrationSavingThrow,
    linkedDefenseResistanceDamageShareConcentrationSavingThrows:
      context.linkedDefenseResistanceDamageShareConcentrationSavingThrows,
    saveGatedConditionDamageRepeatSave:
      context.saveGatedConditionDamageRepeatSave,
  });
}
