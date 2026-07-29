// Attack-burst save-damage spell resolution, currently Ice Knife.
// Extracted from spells-resolve.ts as a procedure-local resolver slice.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.remarkable-athlete
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION

import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import {
  attackRollHits,
  attackRollResultIsValid,
} from "@dnd/shared-algebras/attack-roll-algebra";
import { damageAmount as toDamageAmount } from "@dnd/shared/types";
import {
  type ActionSpellBattleResolutionInput,
  type BattleAfterDamageEvent,
  type BattleFill,
  type BattleHoleId,
  type BattleResolutionResult,
  type BonusActionSpellBattleResolutionInput,
  type BattleExecutableSpellInvocation,
} from "../battle-state-execution.ts";
import {
  ATTACK_ROLL_HOLE_ID,
  ATTACK_TARGET_HOLE_ID,
} from "./battle-runtime-protocol.ts";
import { attackRollIsCriticalHit } from "./attack-resolution.ts";
import {
  maybeOpenInterruptWindow,
  openAfterDamageSequenceInterruptWindow,
} from "./interrupt-execution.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { spellAttackRerollUnsupportedIssue } from "./spell-reroll-issues.ts";
import type { CharacterBattleMetamagicOptionFact } from "../character-battle-resource-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  iceKnifeDamageDispositionHoleKey,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import {
  attackRollModeMatches,
  consumeHelpAttackForAttackRoll,
  recordAttackRollOngoingFeatures,
  requiredSpellAttackRollMode,
} from "./attack-roll.ts";
import { activeEffectArmorClass } from "./creature-state-execution.ts";
import {
  damageLifecycleConcentrationSavingThrowHoles,
  damageLifecycleHideousLaughterDamageRepeatSaveFillCheck,
  damageLifecycleHideousLaughterDamageRepeatSaveHoles,
  fillsMatchingHoleIds,
} from "./damage-apply.ts";
import { damageRelationshipDecisionFillCheck } from "./damage-relationship-decisions.ts";
import {
  activeMarkedDamageRiders,
  applyAvailableSourceDamageRollPenalty,
  damageAmountByTypeAfterTargetAdjustments,
  sourceDamageRollPenaltyRollHoleForDamageRoll,
  sourceDamageRollPenaltyRollForDamageRoll,
  unexpectedSourceDamageRollPenaltyRoll,
} from "./damage-helpers.ts";
import {
  attackRollHoleWithD20TestNaturalOneRerollOption,
  d20TestNaturalOneRerollRollDecisionRequired,
  d20TestNaturalOneRerollRollIssue,
  effectiveD20TestNaturalOneRerollAttackRoll,
} from "./d20-test-natural-one-reroll.ts";

import { needsHolesResult } from "./needs-holes-result.ts";
import { mirrorImageHitInterceptionCheck } from "./mirror-image-hit-interception.ts";
import { invalidResult } from "./result-helpers.ts";
import { resolveRemarkableAthleteCriticalHitMovement } from "./remarkable-athlete-critical-movement.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import {
  sanctuaryTargetingInterdictionCheck,
  targetChoiceFillAfterSanctuaryAttackRollReplacement,
} from "./sanctuary-targeting-interdiction.ts";
import { spellCastInterruptFrame } from "./spell-cast-interrupt-frame.ts";
import {
  applyPreparedSlotSpellDamage,
  applySpellDamage,
  spellAttackRollHole,
  spellBurstDamageByTypeForTarget,
  spellBurstDamageHole,
  spellDamageByTypeForTarget,
  spellDamageHole,
  spellSavingThrowOutcomeHole,
  spellTargetHole,
  spellTargetIsLegal,
  validateSpellBurstDamageFill,
  validateSpellDamageFill,
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
import { validateSavingThrowOutcomes } from "./spells-resolve-save-gates.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import { spellFillSet, type SpellFillSet } from "./spells-resolve-fill-set.ts";
export function resolveAttackBurstSaveDamageSpellAct(input: {
  readonly input:
    | ActionSpellBattleResolutionInput
    | BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "attackBurstSaveDamage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly CharacterBattleMetamagicOptionFact[];
}): BattleResolutionResult {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.targetList !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.targetAbilityChoices !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Attack-burst save damage spells use one target and burst Saving Throw fills.",
    );
  }
  /* v8 ignore stop */
  if (input.fillSet.targetId === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTargetHole(input.input.state, input.actorId, input.invocation),
    ]);
  }
  const target = input.input.state.combatants.get(input.fillSet.targetId);
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    target === undefined ||
    !spellTargetIsLegal(
      input.input.state,
      input.actorId,
      target.combatantId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    )
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell target must be a combatant within the selected spell's supported range.",
    );
  }
  /* v8 ignore stop */

  const sanctuaryCheck = sanctuaryTargetingInterdictionCheck({
    state: input.input.state,
    triggeringProcedureRef: input.invocation.sourceProcedureRef,
    triggeringCombatantId: input.actorId,
    wardedCombatantId: target.combatantId,
    triggeringTargetEventId: ATTACK_TARGET_HOLE_ID,
    replacementTargetKind: "attackRoll",
    fills: input.input.fills,
  });
  if (sanctuaryCheck.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      sanctuaryCheck.hole,
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (sanctuaryCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      sanctuaryCheck.message,
    );
  }
  /* v8 ignore stop */
  if (sanctuaryCheck.tag === "lost") {
    return spendSpellCastResources({
      state: input.input.state,
      actorId: input.actorId,
      invocation: input.invocation,
      errorState: input.input.state,
      ...(input.actionCostOverride === undefined
        ? {}
        : { actionCostOverride: input.actionCostOverride }),
      ...(input.metamagicApplications === undefined
        ? {}
        : { metamagicApplications: input.metamagicApplications }),
    });
  }
  if (sanctuaryCheck.tag === "newTarget") {
    const replacementTarget = input.input.state.combatants.get(
      sanctuaryCheck.targetId,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      replacementTarget === undefined ||
      !spellTargetIsLegal(
        input.input.state,
        input.actorId,
        replacementTarget.combatantId,
        input.invocation,
        sanctuaryCheck.spatialFacts,
      )
    ) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Sanctuary replacement Ice Knife target must be legal for the selected spell.",
      );
    }
    /* v8 ignore stop */
    const originalTargetFill = input.input.fills.find(
      (fill): fill is Extract<BattleFill, { readonly kind: "targetChoice" }> =>
        fill.kind === "targetChoice" && fill.value === target.combatantId,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (originalTargetFill === undefined) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Sanctuary replacement requires the original Ice Knife target fill.",
      );
    }
    /* v8 ignore stop */
    const fills = input.input.fills
      .filter((fill) => fill.kind !== "sanctuaryInterdictionOutcome")
      .map(
        (fill): BattleFill =>
          fill === originalTargetFill
            ? targetChoiceFillAfterSanctuaryAttackRollReplacement({
                fill,
                replacement: sanctuaryCheck,
              })
            : fill,
      );
    const fillSet = spellFillSet(
      fills,
      input.invocation,
      input.invocation.sourceProcedureRef,
      input.actorId,
      input.input.state,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (fillSet.tag === "invalid") {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(input.input.state, "invalidFill", fillSet.message);
    }
    /* v8 ignore stop */
    return resolveAttackBurstSaveDamageSpellAct({
      input: { ...input.input, fills },
      actorId: input.actorId,
      invocation: input.invocation,
      fillSet,
      ...(input.actionCostOverride === undefined
        ? {}
        : { actionCostOverride: input.actionCostOverride }),
      ...(input.metamagicApplications === undefined
        ? {}
        : { metamagicApplications: input.metamagicApplications }),
    });
  }

  const spellCastReactionWindow = maybeOpenInterruptWindow(
    input.input.state,
    spellCastInterruptFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [target.combatantId],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: spellCastingTimeResourceForSpellCast({
        invocation: input.invocation,
        actionCostOverride: input.actionCostOverride,
      }),
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.handledInterruptTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const requiredRollMode = requiredSpellAttackRollMode(
    input.input.state,
    input.actorId,
    target.combatantId,
    input.invocation,
    input.fillSet.targetSpatialFacts,
  );
  if (input.fillSet.attackRoll === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellAttackRollHole(
        input.input.state,
        input.actorId,
        input.invocation,
        requiredRollMode,
      ),
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!attackRollResultIsValid(input.fillSet.attackRoll)) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell attack roll result is outside the d20 attack-roll protocol.",
    );
  }
  /* v8 ignore stop */
  const spellAttackRerollIssue = spellAttackRerollUnsupportedIssue(
    input.fillSet.attackRoll,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (spellAttackRerollIssue !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      spellAttackRerollIssue,
    );
  }
  /* v8 ignore stop */
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!attackRollModeMatches(input.fillSet.attackRoll, requiredRollMode)) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell attack roll mode does not match the current attack-roll rule.",
    );
  }
  /* v8 ignore stop */
  const actorBeforeSpellAttack = input.input.state.combatants.get(
    input.actorId,
  );
  if (
    d20TestNaturalOneRerollRollDecisionRequired({
      actor: actorBeforeSpellAttack,
      originalNaturalD20: Number(input.fillSet.attackRoll.naturalD20),
      rollMode: input.fillSet.attackRoll.rollMode,
      rolledD20s: input.fillSet.attackRoll.rolledD20s,
      decision: input.fillSet.attackRoll.d20TestNaturalOneReroll,
    })
  ) {
    return needsHolesResult(input.input.state, input.input.subject, [
      attackRollHoleWithD20TestNaturalOneRerollOption(
        spellAttackRollHole(
          input.input.state,
          input.actorId,
          input.invocation,
          requiredRollMode,
        ),
      ),
    ]);
  }
  const d20TestNaturalOneRerollIssue = d20TestNaturalOneRerollRollIssue({
    actor: actorBeforeSpellAttack,
    total: input.fillSet.attackRoll.total,
    originalNaturalD20: Number(input.fillSet.attackRoll.naturalD20),
    rollMode: input.fillSet.attackRoll.rollMode,
    rolledD20s: input.fillSet.attackRoll.rolledD20s,
    decision: input.fillSet.attackRoll.d20TestNaturalOneReroll,
    requiredRollMode,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (d20TestNaturalOneRerollIssue !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      d20TestNaturalOneRerollIssue,
    );
  }
  /* v8 ignore stop */
  const effectiveAttackRoll = effectiveD20TestNaturalOneRerollAttackRoll(
    input.fillSet.attackRoll,
  );

  const ordinaryHit = attackRollHits(
    effectiveAttackRoll,
    currentArmorClass(activeEffectArmorClass(input.input.state, target)),
  );
  const missToHitReplacement = selectedAttackRollMissToHitReplacement({
    state: input.input.state,
    subject: input.input.subject,
    attackerId: input.actorId,
    targetId: target.combatantId,
    attackRoll: effectiveAttackRoll,
    ordinaryHit,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.attackRoll.missToHitReplacementProcedureRef !== undefined &&
    missToHitReplacement === null
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      ordinaryHit
        ? "Attack-roll miss-to-hit replacement can only be selected after a miss."
        : "Attack-roll miss-to-hit replacement is not available for this spell attack roll.",
    );
  }
  /* v8 ignore stop */
  const hit = ordinaryHit || missToHitReplacement !== null;
  const critical = attackRollIsCriticalHit(effectiveAttackRoll);
  const attackRolledState = recordAttackRollMissToHitReplacementUsed(
    consumeHelpAttackForAttackRoll(
      recordAttackRollOngoingFeatures(
        input.input.state,
        input.actorId,
        target.combatantId,
        null,
        input.fillSet.targetRelationshipFacts,
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

  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!hit && input.fillSet.mirrorImageDuplicateRoll !== undefined) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Mirror Image duplicate roll is only valid after a hit.",
    );
  }
  /* v8 ignore stop */
  const mirrorImageAttacker = hit
    ? attackRolledState.combatants.get(input.actorId)
    : undefined;
  const mirrorImageCheck =
    hit && mirrorImageAttacker !== undefined
      ? mirrorImageHitInterceptionCheck({
          state: attackRolledState,
          attacker: mirrorImageAttacker,
          target,
          targetSpatialFacts: input.fillSet.targetSpatialFacts,
          triggeringAttackRollHoleId: ATTACK_ROLL_HOLE_ID,
          fill: input.fillSet.mirrorImageDuplicateRoll,
        })
      : { tag: "notAvailable" as const };
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (hit && mirrorImageAttacker === undefined) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Mirror Image attacker is no longer present.",
    );
  }
  /* v8 ignore stop */
  if (mirrorImageCheck.tag === "needsHoles") {
    return needsHolesResult(attackRolledState, input.input.subject, [
      mirrorImageCheck.hole,
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (mirrorImageCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      mirrorImageCheck.message,
    );
  }
  /* v8 ignore stop */
  const hitTarget = hit && mirrorImageCheck.tag !== "hitDuplicate";
  const attackResolvedState =
    mirrorImageCheck.tag === "hitDuplicate"
      ? mirrorImageCheck.state
      : attackRolledState;
  const spellMarkedDamageRiders = hitTarget
    ? activeMarkedDamageRiders(
        attackResolvedState.combatants.get(input.actorId),
        target.combatantId,
      )
    : [];

  if (hitTarget && input.input.handledInterruptTrigger !== "attackHit") {
    const reactionWindow = maybeOpenInterruptWindow(
      attackResolvedState,
      {
        trigger: "attackHit",
        attackerId: input.actorId,
        targetId: target.combatantId,
        attackRoll: effectiveAttackRoll,
        attackKind: spellAttackKindForRedirect(input.invocation.attackKind),
        attackHitTriggerKind: "otherAttack",
        damageTypes: [
          ...new Set([
            input.invocation.damage.damageType,
            ...spellMarkedDamageRiders.map((rider) => rider.damage.damageType),
          ]),
        ],
        continuation: {
          kind: "replay",
          subject: input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.handledInterruptTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
  }

  const remarkableAthleteMovement = resolveRemarkableAthleteCriticalHitMovement(
    {
      state: attackResolvedState,
      subject: input.input.subject,
      attackerId: input.actorId,
      scoredCriticalHit: hitTarget && critical,
      fills: input.fillSet,
    },
  );
  if (remarkableAthleteMovement.tag === "result") {
    return remarkableAthleteMovement.result;
  }
  const postRemarkableAthleteMovementState = remarkableAthleteMovement.state;

  if (hitTarget && input.fillSet.attackBurstDamageRoll === undefined) {
    return needsHolesResult(
      postRemarkableAthleteMovementState,
      input.input.subject,
      [spellDamageHole(input.invocation, critical, spellMarkedDamageRiders)],
    );
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!hitTarget && input.fillSet.attackBurstDamageRoll !== undefined) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Ice Knife attack damage can only be filled after a hit.",
    );
  }
  /* v8 ignore stop */
  if (hitTarget && input.fillSet.attackBurstDamageRoll !== undefined) {
    const attackDamageValidation = validateSpellDamageFill(
      input.fillSet.attackBurstDamageRoll,
      input.invocation,
      critical,
      spellMarkedDamageRiders,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (attackDamageValidation !== null) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        attackDamageValidation,
      );
    }
    /* v8 ignore stop */
  }

  const attackDamageByType =
    hitTarget && input.fillSet.attackBurstDamageRoll !== undefined
      ? spellDamageByTypeForTarget(
          target,
          input.invocation,
          input.fillSet.attackBurstDamageRoll,
          "full",
          spellMarkedDamageRiders,
          critical,
        )
      : undefined;
  const attackExpectedSourcePenaltyHole =
    attackDamageByType === undefined ||
    input.fillSet.attackBurstDamageRoll === undefined
      ? null
      : sourceDamageRollPenaltyRollHoleForDamageRoll(
          postRemarkableAthleteMovementState.combatants.get(input.actorId),
          attackDamageByType,
          input.fillSet.attackBurstDamageRoll.holeId,
        );
  const attackSourcePenalty =
    attackDamageByType !== undefined &&
    input.fillSet.attackBurstDamageRoll !== undefined
      ? applyAvailableSourceDamageRollPenalty(
          postRemarkableAthleteMovementState.combatants.get(input.actorId),
          attackDamageByType,
          input.fillSet.attackBurstDamageRoll.holeId,
          sourceDamageRollPenaltyRollForDamageRoll(
            input.fillSet.sourceDamageRollPenaltyRolls,
            postRemarkableAthleteMovementState.combatants.get(input.actorId),
            attackDamageByType,
            input.fillSet.attackBurstDamageRoll.holeId,
          ),
        )
      : ({ tag: "ok", damageByType: new Map() } as const);
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (attackSourcePenalty.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop */
  if (attackSourcePenalty.tag === "needsHoles") {
    return needsHolesResult(
      postRemarkableAthleteMovementState,
      input.input.subject,
      [...attackSourcePenalty.holes],
    );
  }
  const attackDamageAmount =
    hitTarget && input.fillSet.attackBurstDamageRoll !== undefined
      ? damageAmountByTypeAfterTargetAdjustments(
          postRemarkableAthleteMovementState,
          target,
          attackSourcePenalty.damageByType,
        )
      : 0;
  const attackDamageEventKey = String(
    iceKnifeDamageDispositionHoleKey("attack", target.combatantId).holeId,
  );
  const attackDamageDispositionHole =
    attackDamageAmount > 0
      ? zeroHitPointReplacementDispositionHole({
          damageSourceId: input.actorId,
          target,
          damageAmount: attackDamageAmount,
          holeKey: iceKnifeDamageDispositionHoleKey(
            "attack",
            target.combatantId,
          ),
        })
      : null;
  const attackDamageDispositionHoles =
    attackDamageDispositionHole === null ? [] : [attackDamageDispositionHole];
  const attackDamageDispositionHoleIds = new Set<BattleHoleId>(
    attackDamageDispositionHoles.map((hole) => hole.holeId),
  );
  const attackDamageDispositionFills = input.fillSet.damageDispositions.filter(
    (fill) => attackDamageDispositionHoleIds.has(fill.holeId),
  );
  const attackDamageDispositionValidation = damageDispositionFillsValidation({
    holes: attackDamageDispositionHoles,
    fills: attackDamageDispositionFills,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (attackDamageDispositionValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      attackDamageDispositionValidation,
    );
  }
  /* v8 ignore stop */
  const missingAttackDamageDispositionHoles =
    attackDamageDispositionHoles.filter(
      (hole) =>
        damageDispositionFillFor(input.fillSet.damageDispositions, hole) ===
        undefined,
    );
  if (missingAttackDamageDispositionHoles.length > 0) {
    return needsHolesResult(
      postRemarkableAthleteMovementState,
      input.input.subject,
      missingAttackDamageDispositionHoles,
    );
  }
  const attackHideousLaughterSaveHoles =
    damageLifecycleHideousLaughterDamageRepeatSaveHoles({
      state: postRemarkableAthleteMovementState,
      target,
      damageAmount: attackDamageAmount,
      damageEventKey: attackDamageEventKey,
    });
  const attackHideousLaughterSaveCheck =
    damageLifecycleHideousLaughterDamageRepeatSaveFillCheck({
      state: postRemarkableAthleteMovementState,
      target,
      damageAmount: attackDamageAmount,
      fills: fillsMatchingHoleIds(
        input.fillSet.hideousLaughterDamageRepeatSaves,
        attackHideousLaughterSaveHoles,
      ),
      damageEventKey: attackDamageEventKey,
    });
  if (attackHideousLaughterSaveCheck.tag === "needsHoles") {
    return needsHolesResult(
      postRemarkableAthleteMovementState,
      input.input.subject,
      [...attackHideousLaughterSaveCheck.holes],
    );
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (attackHideousLaughterSaveCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      attackHideousLaughterSaveCheck.message,
    );
  }
  /* v8 ignore stop */
  const attackConcentrationLifecycleHoles =
    damageLifecycleConcentrationSavingThrowHoles({
      state: postRemarkableAthleteMovementState,
      target,
      damageAmount: attackDamageAmount,
    });
  const attackConcentrationLifecycleFills = fillsMatchingHoleIds(
    input.fillSet.concentrationSavingThrows,
    attackConcentrationLifecycleHoles,
  );
  const attackHideousLaughterLifecycleFills = fillsMatchingHoleIds(
    input.fillSet.hideousLaughterDamageRepeatSaves,
    attackHideousLaughterSaveHoles,
  );

  const damagedByAttack =
    hitTarget && input.fillSet.attackBurstDamageRoll !== undefined
      ? applySpellDamage(
          postRemarkableAthleteMovementState,
          target.combatantId,
          input.invocation,
          input.fillSet.attackBurstDamageRoll,
          critical,
          {
            wardingBondDamageShareConcentrationSavingThrows:
              attackConcentrationLifecycleFills,
            damageDisposition: damageDispositionForTarget(
              attackDamageDispositionHoles,
              input.fillSet.damageDispositions,
              target.combatantId,
            ),
            spellMarkedDamageRiders,
            hideousLaughterDamageRepeatSaves:
              attackHideousLaughterLifecycleFills,
            hideousLaughterDamageRepeatSaveEventKey: attackDamageEventKey,
            sourceDamageRollPenaltyRoll:
              sourceDamageRollPenaltyRollForDamageRoll(
                input.fillSet.sourceDamageRollPenaltyRolls,
                postRemarkableAthleteMovementState.combatants.get(
                  input.actorId,
                ),
                spellDamageByTypeForTarget(
                  target,
                  input.invocation,
                  input.fillSet.attackBurstDamageRoll,
                  "full",
                  spellMarkedDamageRiders,
                  critical,
                ),
                input.fillSet.attackBurstDamageRoll.holeId,
              ),
            damageSourceId: input.actorId,
            spatialFacts: input.fillSet.targetSpatialFacts,
          },
        )
      : postRemarkableAthleteMovementState;

  const savingThrowHole = spellSavingThrowOutcomeHole(
    damagedByAttack,
    input.actorId,
    input.invocation,
  );
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(damagedByAttack, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowValidation = validateSavingThrowOutcomes(
    input.fillSet.savingThrowOutcomes,
    input.invocation,
    damagedByAttack,
    input.actorId,
    target.combatantId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (savingThrowValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }
  /* v8 ignore stop */

  const failedTargets = input.fillSet.savingThrowOutcomes.outcomes.flatMap(
    (outcome) => (outcome.succeeded ? [] : [outcome.targetId]),
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      damagedByAttack,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceProcedureRef: input.invocation.sourceProcedureRef,
        continuation: {
          kind: "replay",
          subject:
            ("reactionContinuationSubject" in input.input
              ? input.input.reactionContinuationSubject
              : undefined) ?? input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.handledInterruptTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }

  if (failedTargets.length > 0 && input.fillSet.damageRoll === undefined) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      unexpectedSourceDamageRollPenaltyRoll(
        input.fillSet.sourceDamageRollPenaltyRolls,
        attackExpectedSourcePenaltyHole === null
          ? []
          : [attackExpectedSourcePenaltyHole],
      ) !== undefined
    ) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      );
    }
    /* v8 ignore stop */
    return needsHolesResult(damagedByAttack, input.input.subject, [
      spellBurstDamageHole(input.invocation),
    ]);
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (failedTargets.length === 0 && input.fillSet.damageRoll !== undefined) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Ice Knife burst damage can only be filled when at least one target fails the Dexterity Saving Throw.",
    );
  }
  /* v8 ignore stop */
  if (input.fillSet.damageRoll !== undefined) {
    const burstDamageValidation = validateSpellBurstDamageFill(
      input.fillSet.damageRoll,
      input.invocation,
    );
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (burstDamageValidation !== null) {
      /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        burstDamageValidation,
      );
    }
    /* v8 ignore stop */
  }
  const burstDamageByType =
    failedTargets.length > 0 && input.fillSet.damageRoll !== undefined
      ? spellBurstDamageByTypeForTarget(
          target,
          input.invocation,
          input.fillSet.damageRoll,
          "full",
        )
      : undefined;
  const burstExpectedSourcePenaltyHole =
    burstDamageByType === undefined || input.fillSet.damageRoll === undefined
      ? null
      : sourceDamageRollPenaltyRollHoleForDamageRoll(
          damagedByAttack.combatants.get(input.actorId),
          burstDamageByType,
          input.fillSet.damageRoll.holeId,
        );
  const expectedSourcePenaltyHoles = [
    ...(attackExpectedSourcePenaltyHole === null
      ? []
      : [attackExpectedSourcePenaltyHole]),
    ...(burstExpectedSourcePenaltyHole === null
      ? []
      : [burstExpectedSourcePenaltyHole]),
  ];
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    unexpectedSourceDamageRollPenaltyRoll(
      input.fillSet.sourceDamageRollPenaltyRolls,
      expectedSourcePenaltyHoles,
    ) !== undefined
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop */
  const burstSourcePenalty =
    burstDamageByType !== undefined && input.fillSet.damageRoll !== undefined
      ? applyAvailableSourceDamageRollPenalty(
          damagedByAttack.combatants.get(input.actorId),
          burstDamageByType,
          input.fillSet.damageRoll.holeId,
          sourceDamageRollPenaltyRollForDamageRoll(
            input.fillSet.sourceDamageRollPenaltyRolls,
            damagedByAttack.combatants.get(input.actorId),
            burstDamageByType,
            input.fillSet.damageRoll.holeId,
          ),
        )
      : ({ tag: "ok", damageByType: new Map() } as const);
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (burstSourcePenalty.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop */
  if (burstSourcePenalty.tag === "needsHoles") {
    return needsHolesResult(damagedByAttack, input.input.subject, [
      ...burstSourcePenalty.holes,
    ]);
  }

  const burstDamageByTargetId = new Map(
    failedTargets.flatMap((targetId): readonly [CombatantId, number][] => {
      const burstTarget = damagedByAttack.combatants.get(targetId);
      return burstTarget === undefined || input.fillSet.damageRoll === undefined
        ? []
        : [
            [
              targetId,
              damageAmountByTypeAfterTargetAdjustments(
                damagedByAttack,
                burstTarget,
                burstSourcePenalty.damageByType,
              ),
            ],
          ];
    }),
  );
  const burstDamageDispositionHoles = Array.from(
    burstDamageByTargetId,
    ([targetId, damageAmount]) => {
      const burstTarget = damagedByAttack.combatants.get(targetId);
      return burstTarget === undefined
        ? null
        : zeroHitPointReplacementDispositionHole({
            damageSourceId: input.actorId,
            target: burstTarget,
            damageAmount,
            holeKey: iceKnifeDamageDispositionHoleKey("burst", targetId),
          });
    },
  ).flatMap((hole) => (hole === null ? [] : [hole]));
  const damageDispositionHoles = [
    ...attackDamageDispositionHoles,
    ...burstDamageDispositionHoles,
  ];
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHoles,
    fills: input.fillSet.damageDispositions,
  });
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageDispositionValidation !== null) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  /* v8 ignore stop */
  const missingBurstDamageDispositionHoles = burstDamageDispositionHoles.filter(
    (hole) =>
      damageDispositionFillFor(input.fillSet.damageDispositions, hole) ===
      undefined,
  );
  if (missingBurstDamageDispositionHoles.length > 0) {
    return needsHolesResult(
      damagedByAttack,
      input.input.subject,
      missingBurstDamageDispositionHoles,
    );
  }
  const concentrationDamageByTargetId = new Map<CombatantId, number>();
  if (attackDamageAmount > 0) {
    concentrationDamageByTargetId.set(target.combatantId, attackDamageAmount);
  }
  for (const [targetId, burstDamageAmount] of burstDamageByTargetId) {
    concentrationDamageByTargetId.set(
      targetId,
      (concentrationDamageByTargetId.get(targetId) ?? 0) + burstDamageAmount,
    );
  }
  const concentrationSaves = Array.from(
    concentrationDamageByTargetId,
    ([targetId, damageAmount]) => {
      const damagedTarget = damagedByAttack.combatants.get(targetId);
      return damagedTarget === undefined
        ? []
        : damageLifecycleConcentrationSavingThrowHoles({
            state: damagedByAttack,
            target: damagedTarget,
            damageAmount,
          });
    },
  ).flat();
  const missingConcentrationSaves = concentrationSaves.filter(
    (concentrationSave) =>
      concentrationSavingThrowFillFor(
        input.fillSet.concentrationSavingThrows,
        concentrationSave,
      ) === undefined,
  );
  if (missingConcentrationSaves.length > 0) {
    return needsHolesResult(
      damagedByAttack,
      input.input.subject,
      missingConcentrationSaves,
    );
  }
  const concentrationSaveIds = new Set<BattleHoleId>(
    concentrationSaves.map((concentrationSave) => concentrationSave.holeId),
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.concentrationSavingThrows.some(
      (fill) => !concentrationSaveIds.has(fill.holeId),
    )
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    );
  }
  /* v8 ignore stop */
  const concentrationSaveByTargetId = new Map(
    concentrationSaves.map((concentrationSave) => [
      concentrationSave.combatantId,
      concentrationSavingThrowFillFor(
        input.fillSet.concentrationSavingThrows,
        concentrationSave,
      ),
    ]),
  );
  const burstHideousLaughterSaveChecks = failedTargets.map((targetId) => {
    const damagedTarget = damagedByAttack.combatants.get(targetId);
    const damageAmount = burstDamageByTargetId.get(targetId) ?? 0;
    const burstDamageEventKey = String(
      iceKnifeDamageDispositionHoleKey("burst", targetId).holeId,
    );
    if (damagedTarget === undefined) {
      return { tag: "ok" as const, holes: [] };
    }
    const holes = damageLifecycleHideousLaughterDamageRepeatSaveHoles({
      state: damagedByAttack,
      target: damagedTarget,
      damageAmount,
      damageEventKey: burstDamageEventKey,
    });
    return damageLifecycleHideousLaughterDamageRepeatSaveFillCheck({
      state: damagedByAttack,
      target: damagedTarget,
      damageAmount,
      fills: fillsMatchingHoleIds(
        input.fillSet.hideousLaughterDamageRepeatSaves,
        holes,
      ),
      damageEventKey: burstDamageEventKey,
    });
  });
  const invalidBurstHideousLaughterSaveCheck =
    burstHideousLaughterSaveChecks.find((check) => check.tag === "invalid");
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (invalidBurstHideousLaughterSaveCheck?.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      invalidBurstHideousLaughterSaveCheck.message,
    );
  }
  /* v8 ignore stop */
  const missingBurstHideousLaughterSaveHoles =
    burstHideousLaughterSaveChecks.flatMap((check) =>
      check.tag === "needsHoles" ? [...check.holes] : [],
    );
  if (missingBurstHideousLaughterSaveHoles.length > 0) {
    return needsHolesResult(damagedByAttack, input.input.subject, [
      ...missingBurstHideousLaughterSaveHoles,
    ]);
  }
  const hideousLaughterSaveHoleIds = new Set<BattleHoleId>(
    [
      ...attackHideousLaughterSaveCheck.holes,
      ...burstHideousLaughterSaveChecks.flatMap((check) =>
        check.tag === "invalid" ? [] : check.holes,
      ),
    ].map((hole) => hole.holeId),
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.hideousLaughterDamageRepeatSaves.some(
      (fill) => !hideousLaughterSaveHoleIds.has(fill.holeId),
    )
  ) {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Hideous Laughter damage repeat save fill must match a requested damaged target.",
    );
  }
  /* v8 ignore stop */

  const attackDamageDisposition = damageDispositionForTarget(
    attackDamageDispositionHoles,
    input.fillSet.damageDispositions,
    target.combatantId,
  );
  const attackRelationshipCheck = damageRelationshipDecisionFillCheck({
    state: postRemarkableAthleteMovementState,
    damageEventHoleId:
      input.fillSet.attackBurstDamageRoll?.holeId ?? ATTACK_ROLL_HOLE_ID,
    damageSourceId: input.actorId,
    targets:
      hitTarget && attackDamageAmount > 0
        ? [
            {
              targetId: target.combatantId,
              damageAmount: toDamageAmount(attackDamageAmount),
              damageDisposition: attackDamageDisposition,
            },
          ]
        : [],
    spatialFacts: input.fillSet.targetSpatialFacts,
    decisionsByRelationshipHole: input.fillSet.damageRelationshipDecisions,
  });
  if (attackRelationshipCheck.tag === "needsHoles") {
    return needsHolesResult(
      postRemarkableAthleteMovementState,
      input.input.subject,
      attackRelationshipCheck.holes,
    );
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (attackRelationshipCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      attackRelationshipCheck.message,
    );
  }
  /* v8 ignore stop */
  const burstRelationshipCheck = damageRelationshipDecisionFillCheck({
    state: damagedByAttack,
    damageEventHoleId: input.fillSet.damageRoll?.holeId ?? ATTACK_ROLL_HOLE_ID,
    damageSourceId: input.actorId,
    targets: failedTargets.flatMap((targetId) => {
      const damageAmount = burstDamageByTargetId.get(targetId) ?? 0;
      return damageAmount > 0
        ? [
            {
              targetId,
              damageAmount: toDamageAmount(damageAmount),
              damageDisposition: damageDispositionForTarget(
                burstDamageDispositionHoles,
                input.fillSet.damageDispositions,
                targetId,
              ),
            },
          ]
        : [];
    }),
    spatialFacts: input.fillSet.targetSpatialFacts,
    decisionsByRelationshipHole: input.fillSet.damageRelationshipDecisions,
  });
  if (burstRelationshipCheck.tag === "needsHoles") {
    return needsHolesResult(
      damagedByAttack,
      input.input.subject,
      burstRelationshipCheck.holes,
    );
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (burstRelationshipCheck.tag === "invalid") {
    /* v8 ignore next -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      burstRelationshipCheck.message,
    );
  }
  /* v8 ignore stop */
  const damagedByAttackWithConcentration =
    hitTarget && input.fillSet.attackBurstDamageRoll !== undefined
      ? applySpellDamage(
          postRemarkableAthleteMovementState,
          target.combatantId,
          input.invocation,
          input.fillSet.attackBurstDamageRoll,
          critical,
          {
            concentrationSavingThrow: concentrationSaveByTargetId.get(
              target.combatantId,
            ),
            wardingBondDamageShareConcentrationSavingThrows:
              fillsMatchingHoleIds(
                input.fillSet.concentrationSavingThrows,
                damageLifecycleConcentrationSavingThrowHoles({
                  state: damagedByAttack,
                  target,
                  damageAmount:
                    concentrationDamageByTargetId.get(target.combatantId) ??
                    attackDamageAmount,
                }),
              ),
            damageDisposition: attackDamageDisposition,
            spellMarkedDamageRiders,
            hideousLaughterDamageRepeatSaves:
              attackHideousLaughterLifecycleFills,
            hideousLaughterDamageRepeatSaveEventKey: attackDamageEventKey,
            sourceDamageRollPenaltyRoll:
              sourceDamageRollPenaltyRollForDamageRoll(
                input.fillSet.sourceDamageRollPenaltyRolls,
                postRemarkableAthleteMovementState.combatants.get(
                  input.actorId,
                ),
                spellDamageByTypeForTarget(
                  target,
                  input.invocation,
                  input.fillSet.attackBurstDamageRoll,
                  "full",
                  spellMarkedDamageRiders,
                  critical,
                ),
                input.fillSet.attackBurstDamageRoll.holeId,
              ),
            damageSourceId: input.actorId,
            spatialFacts: input.fillSet.targetSpatialFacts,
            ...(attackRelationshipCheck.decisions === undefined
              ? {}
              : {
                  relationshipDecisions: attackRelationshipCheck.decisions,
                }),
          },
        )
      : postRemarkableAthleteMovementState;
  const damagedByBurst =
    input.fillSet.damageRoll === undefined
      ? damagedByAttackWithConcentration
      : failedTargets.reduce((state, targetId) => {
          const damageAmount = burstDamageByTargetId.get(targetId);
          if (damageAmount === undefined) {
            return state;
          }
          const damagedTarget = damagedByAttack.combatants.get(targetId);
          const concentrationLifecycleFills =
            damagedTarget === undefined
              ? []
              : fillsMatchingHoleIds(
                  input.fillSet.concentrationSavingThrows,
                  damageLifecycleConcentrationSavingThrowHoles({
                    state: damagedByAttack,
                    target: damagedTarget,
                    damageAmount:
                      concentrationDamageByTargetId.get(targetId) ??
                      damageAmount,
                  }),
                );
          const burstDamageEventKey = String(
            iceKnifeDamageDispositionHoleKey("burst", targetId).holeId,
          );
          const hideousLaughterLifecycleFills =
            damagedTarget === undefined
              ? []
              : fillsMatchingHoleIds(
                  input.fillSet.hideousLaughterDamageRepeatSaves,
                  damageLifecycleHideousLaughterDamageRepeatSaveHoles({
                    state: damagedByAttack,
                    target: damagedTarget,
                    damageAmount,
                    damageEventKey: burstDamageEventKey,
                  }),
                );
          return applyPreparedSlotSpellDamage(state, targetId, damageAmount, {
            concentrationSavingThrow: concentrationSaveByTargetId.get(targetId),
            wardingBondDamageShareConcentrationSavingThrows:
              concentrationLifecycleFills,
            damageDisposition: damageDispositionForTarget(
              burstDamageDispositionHoles,
              input.fillSet.damageDispositions,
              targetId,
            ),
            hideousLaughterDamageRepeatSaves: hideousLaughterLifecycleFills,
            hideousLaughterDamageRepeatSaveEventKey: burstDamageEventKey,
            damageSourceId: input.actorId,
            spatialFacts: input.fillSet.targetSpatialFacts,
            ...(burstRelationshipCheck.decisions === undefined
              ? {}
              : {
                  relationshipDecisions: burstRelationshipCheck.decisions,
                }),
          });
        }, damagedByAttackWithConcentration);

  const spentResources = spendSpellCastResources({
    state: damagedByBurst,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
    ...(input.actionCostOverride === undefined
      ? {}
      : { actionCostOverride: input.actionCostOverride }),
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
  if (spentResources.tag !== "resolved") {
    return spentResources;
  }

  const afterDamageEvents: BattleAfterDamageEvent[] = [
    ...(attackDamageAmount > 0
      ? [
          {
            damageSourceId: input.actorId,
            damagedId: target.combatantId,
            damageAmount: toDamageAmount(attackDamageAmount),
            reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
              facts: input.fillSet.targetSpatialFacts,
              damagedId: target.combatantId,
              damageSourceId: input.actorId,
            }),
          },
        ]
      : []),
    ...failedTargets.flatMap((targetId): readonly BattleAfterDamageEvent[] => {
      const damageAmount = burstDamageByTargetId.get(targetId);
      return damageAmount === undefined || damageAmount <= 0
        ? []
        : [
            {
              damageSourceId: input.actorId,
              damagedId: targetId,
              damageAmount: toDamageAmount(damageAmount),
              reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
                facts: input.fillSet.targetSpatialFacts,
                damagedId: targetId,
                damageSourceId: input.actorId,
              }),
            },
          ];
    }),
  ];
  const afterDamageReactionWindow = openAfterDamageSequenceInterruptWindow({
    state: spentResources.state,
    subject: input.input.subject,
    events: afterDamageEvents,
    objectDamages: [],
    objectIgnitions: [],
    droppedObjects: [],
    handledInterruptTrigger: input.input.handledInterruptTrigger,
  });
  if (afterDamageReactionWindow.tag === "needsHoles") {
    return afterDamageReactionWindow;
  }

  return {
    tag: "resolved",
    state: spentResources.state,
    snapshot: snapshotBattle(spentResources.state),
  };
}
