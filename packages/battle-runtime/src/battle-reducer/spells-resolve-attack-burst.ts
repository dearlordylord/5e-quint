// Attack-burst save-damage spell resolution, currently Ice Knife.
// Extracted from spells-resolve.ts as a procedure-local resolver slice.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.remarkable-athlete
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.d20-test-natural-one-reroll
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION

import { optionalProperty } from "../optional-property.ts";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import {
  attackRollHits,
  attackRollResultIsValid,
} from "@dnd/shared-algebras/attack-roll-algebra";
import { damageAmount as toDamageAmount } from "@dnd/shared/types";
import {
  type ActionSpellBattleResolutionInput,
  type BattleAfterDamageEvent,
  type BattleCreatureState,
  type BattleFill,
  type BattleHoleId,
  type BattleResolutionResult,
  type BattleState,
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
import { spellReplayContinuation } from "./spell-reaction-continuation.ts";
import { snapshotBattle } from "./battle-snapshot.ts";
import { spellAttackRerollUnsupportedIssue } from "./spell-reroll-issues.ts";
import type { CharacterBattleMetamagicOptionFact } from "../character-battle-resource-execution.ts";
import type { CombatantId } from "../identity.ts";
import {
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  attackBurstDamageDispositionHoleKey,
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
  damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveFillCheck,
  damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveHoles,
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
import { duplicateHitInterceptionCheck } from "./duplicate-hit-interception.ts";
import { invalidResult } from "./result-helpers.ts";
import { resolveRemarkableAthleteCriticalHitMovement } from "./remarkable-athlete-critical-movement.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import {
  targetingSaveInterdictionCheck,
  targetChoiceFillAfterAttackRedirectionWardAttackRollReplacement,
} from "./targeting-save-interdiction.ts";
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
import { failedSavingThrowTargetIds } from "./saving-throw-outcomes.ts";
import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import { spellFillSet, type SpellFillSet } from "./spells-resolve-fill-set.ts";
import { saveGatedConditionDamageOccurrenceKeyForHole } from "./staged-condition-repeat-save.ts";
function resolveOrdinaryAttackBurstSaveDamageSpellAct(input: {
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
  return resolveAttackBurstSaveDamageSpellAct({
    ...input,
    release: { kind: "ordinaryCast" },
  });
}

export { resolveOrdinaryAttackBurstSaveDamageSpellAct as resolveAttackBurstSaveDamageSpellAct };

export function resolveStoredGlyphAttackBurstSaveDamageSpellRelease(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    { readonly procedure: "attackBurstSaveDamage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly triggeringTargetId: CombatantId;
}): BattleResolutionResult {
  return resolveAttackBurstSaveDamageSpellAct({
    ...input,
    release: {
      kind: "storedGlyphRelease",
      triggeringTargetId: input.triggeringTargetId,
    },
  });
}

function attackBurstFillShapeIsValid(
  fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>,
): boolean {
  return (
    fillSet.targetList === undefined &&
    fillSet.skillChoice === undefined &&
    fillSet.targetAbilityChoices === undefined
  );
}

function storedGlyphTargetMatches(input: {
  readonly release:
    | { readonly kind: "ordinaryCast" }
    | {
        readonly kind: "storedGlyphRelease";
        readonly triggeringTargetId: CombatantId;
      };
  readonly targetId: CombatantId | undefined;
}): boolean {
  return (
    input.release.kind === "ordinaryCast" ||
    input.targetId === input.release.triggeringTargetId
  );
}

function attackBurstTargetIsLegal(
  target: BattleCreatureState | undefined,
  input: {
    readonly state: BattleState;
    readonly actorId: CombatantId;
    readonly invocation: Extract<
      BattleExecutableSpellInvocation,
      { readonly procedure: "attackBurstSaveDamage" }
    >;
    readonly releaseKind: "ordinaryCast" | "storedGlyphRelease";
    readonly spatialFacts: Extract<
      SpellFillSet,
      { readonly tag: "ok" }
    >["targetSpatialFacts"];
  },
): target is BattleCreatureState {
  return (
    target !== undefined &&
    (input.releaseKind === "storedGlyphRelease" ||
      spellTargetIsLegal(
        input.state,
        input.actorId,
        target.combatantId,
        input.invocation,
        input.spatialFacts,
      ))
  );
}

function resolveAttackBurstSaveDamageSpellAct(input: {
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
  readonly release:
    | { readonly kind: "ordinaryCast" }
    | {
        readonly kind: "storedGlyphRelease";
        readonly triggeringTargetId: CombatantId;
      };
}): BattleResolutionResult {
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!attackBurstFillShapeIsValid(input.fillSet)) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Attack-burst save damage spells use one target and burst Saving Throw fills.",
    );
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed resolution input: stored Glyph release prepends the canonical triggering creature as the target fill. */
  if (
    !storedGlyphTargetMatches({
      release: input.release,
      targetId: input.fillSet.targetId,
    })
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Stored Glyph spell target must be the creature that triggered the glyph.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.targetId === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTargetHole(input.input.state, input.actorId, input.invocation),
    ]);
  }
  const target = input.input.state.combatants.get(input.fillSet.targetId);
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    !attackBurstTargetIsLegal(target, {
      state: input.input.state,
      actorId: input.actorId,
      invocation: input.invocation,
      releaseKind: input.release.kind,
      spatialFacts: input.fillSet.targetSpatialFacts,
    })
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell target must be a combatant within the selected spell's supported range.",
    );
  }
  /* v8 ignore stop -- @preserve */

  if (input.release.kind === "ordinaryCast") {
    const interdictionCheck = targetingSaveInterdictionCheck({
      state: input.input.state,
      triggeringProcedureRef: input.invocation.sourceProcedureRef,
      triggeringCombatantId: input.actorId,
      wardedCombatantId: target.combatantId,
      triggeringTargetEventId: ATTACK_TARGET_HOLE_ID,
      replacementTargetKind: "attackRoll",
      fills: input.input.fills,
    });
    if (interdictionCheck.tag === "needsHoles") {
      return needsHolesResult(input.input.state, input.input.subject, [
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
      return spendSpellCastResources({
        state: input.input.state,
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
      const replacementTarget = input.input.state.combatants.get(
        interdictionCheck.targetId,
      );
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        !attackBurstTargetIsLegal(replacementTarget, {
          state: input.input.state,
          actorId: input.actorId,
          invocation: input.invocation,
          releaseKind: "ordinaryCast",
          spatialFacts: interdictionCheck.spatialFacts,
        })
      ) {
        /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.input.state,
          "invalidFill",
          "attack-redirection ward replacement attack-burst damage target must be legal for the selected spell.",
        );
      }
      /* v8 ignore stop -- @preserve */
      const originalTargetFill = input.input.fills.find(
        (
          fill,
        ): fill is Extract<BattleFill, { readonly kind: "targetChoice" }> =>
          fill.kind === "targetChoice" && fill.value === target.combatantId,
      );
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (originalTargetFill === undefined) {
        /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(
          input.input.state,
          "invalidFill",
          "attack-redirection ward replacement requires the original attack-burst damage target fill.",
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
      const fillSet = spellFillSet(
        fills,
        input.invocation,
        input.invocation.sourceProcedureRef,
        input.actorId,
        input.input.state,
      );
      /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fillSet.tag === "invalid") {
        /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
        return invalidResult(input.input.state, "invalidFill", fillSet.message);
      }
      /* v8 ignore stop -- @preserve */
      return resolveAttackBurstSaveDamageSpellAct({
        ...input,
        input: { ...input.input, fills },
        fillSet,
      });
    }
  }

  if (input.release.kind === "ordinaryCast") {
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
        continuation: spellReplayContinuation(input.input),
      }),
      input.input.handledInterruptTrigger,
    );
    if (spellCastReactionWindow !== null) {
      return spellCastReactionWindow;
    }
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!attackRollResultIsValid(input.fillSet.attackRoll)) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell attack roll result is outside the d20 attack-roll protocol.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spellAttackRerollIssue = spellAttackRerollUnsupportedIssue(
    input.fillSet.attackRoll,
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
  if (!attackRollModeMatches(input.fillSet.attackRoll, requiredRollMode)) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell attack roll mode does not match the current attack-roll rule.",
    );
  }
  /* v8 ignore stop -- @preserve */
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.attackRoll.missToHitReplacementProcedureRef !== undefined &&
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

  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!hit && input.fillSet.duplicateHitInterceptionRoll !== undefined) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "duplicate-hit interception duplicate roll is only valid after a hit.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const duplicateInterceptionAttacker = hit
    ? attackRolledState.combatants.get(input.actorId)
    : undefined;
  const duplicateInterceptionCheck =
    hit && duplicateInterceptionAttacker !== undefined
      ? duplicateHitInterceptionCheck({
          state: attackRolledState,
          attacker: duplicateInterceptionAttacker,
          target,
          targetSpatialFacts: input.fillSet.targetSpatialFacts,
          triggeringAttackRollHoleId: ATTACK_ROLL_HOLE_ID,
          fill: input.fillSet.duplicateHitInterceptionRoll,
        })
      : { tag: "notAvailable" as const };
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (hit && duplicateInterceptionAttacker === undefined) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "duplicate-hit interception attacker is no longer present.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (duplicateInterceptionCheck.tag === "needsHoles") {
    return needsHolesResult(attackRolledState, input.input.subject, [
      duplicateInterceptionCheck.hole,
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (duplicateInterceptionCheck.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      duplicateInterceptionCheck.message,
    );
  }
  /* v8 ignore stop -- @preserve */
  const hitTarget = hit && duplicateInterceptionCheck.tag !== "hitDuplicate";
  const attackResolvedState =
    duplicateInterceptionCheck.tag === "hitDuplicate"
      ? duplicateInterceptionCheck.state
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
        continuation: spellReplayContinuation(input.input),
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!hitTarget && input.fillSet.attackBurstDamageRoll !== undefined) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "attack-burst damage attack damage can only be filled after a hit.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (hitTarget && input.fillSet.attackBurstDamageRoll !== undefined) {
    const attackDamageValidation = validateSpellDamageFill(
      input.fillSet.attackBurstDamageRoll,
      input.invocation,
      critical,
      spellMarkedDamageRiders,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (attackDamageValidation !== null) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        attackDamageValidation,
      );
    }
    /* v8 ignore stop -- @preserve */
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (attackSourcePenalty.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop -- @preserve */
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
  const attackDamageEventKey = saveGatedConditionDamageOccurrenceKeyForHole(
    attackBurstDamageDispositionHoleKey("attack", target.combatantId).holeId,
  );
  const attackDamageDispositionHole =
    attackDamageAmount > 0
      ? zeroHitPointReplacementDispositionHole({
          damageSourceId: input.actorId,
          target,
          damageAmount: attackDamageAmount,
          holeKey: attackBurstDamageDispositionHoleKey(
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (attackDamageDispositionValidation !== null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      attackDamageDispositionValidation,
    );
  }
  /* v8 ignore stop -- @preserve */
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
  const attackStagedConditionSaveHoles =
    damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveHoles({
      state: postRemarkableAthleteMovementState,
      target,
      damageAmount: attackDamageAmount,
      damageOccurrenceKey: attackDamageEventKey,
    });
  const attackStagedConditionSaveCheck =
    damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveFillCheck({
      state: postRemarkableAthleteMovementState,
      target,
      damageAmount: attackDamageAmount,
      fills: fillsMatchingHoleIds(
        input.fillSet.saveGatedConditionWithRepeatDamageRepeatSaves,
        attackStagedConditionSaveHoles,
      ),
      damageOccurrenceKey: attackDamageEventKey,
    });
  if (attackStagedConditionSaveCheck.tag === "needsHoles") {
    return needsHolesResult(
      postRemarkableAthleteMovementState,
      input.input.subject,
      [...attackStagedConditionSaveCheck.holes],
    );
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (attackStagedConditionSaveCheck.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      attackStagedConditionSaveCheck.message,
    );
  }
  /* v8 ignore stop -- @preserve */
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
  const attackStagedConditionLifecycleFills = fillsMatchingHoleIds(
    input.fillSet.saveGatedConditionWithRepeatDamageRepeatSaves,
    attackStagedConditionSaveHoles,
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
            linkedDefenseResistanceDamageShareConcentrationSavingThrows:
              attackConcentrationLifecycleFills,
            damageDisposition: damageDispositionForTarget(
              attackDamageDispositionHoles,
              input.fillSet.damageDispositions,
              target.combatantId,
            ),
            spellMarkedDamageRiders,
            saveGatedConditionDamageRepeatSave: {
              kind: "repeatSave",
              fills: attackStagedConditionLifecycleFills,
              occurrenceKey: attackDamageEventKey,
            },
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (savingThrowValidation !== null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }
  /* v8 ignore stop -- @preserve */

  const failedTargets = failedSavingThrowTargetIds(
    input.fillSet.savingThrowOutcomes.outcomes,
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenInterruptWindow(
      damagedByAttack,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceProcedureRef: input.invocation.sourceProcedureRef,
        continuation: spellReplayContinuation(input.input),
      },
      input.input.handledInterruptTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }

  if (failedTargets.length > 0 && input.fillSet.damageRoll === undefined) {
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      unexpectedSourceDamageRollPenaltyRoll(
        input.fillSet.sourceDamageRollPenaltyRolls,
        attackExpectedSourcePenaltyHole === null
          ? []
          : [attackExpectedSourcePenaltyHole],
      ) !== undefined
    ) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      );
    }
    /* v8 ignore stop -- @preserve */
    return needsHolesResult(damagedByAttack, input.input.subject, [
      spellBurstDamageHole(input.invocation),
    ]);
  }
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (failedTargets.length === 0 && input.fillSet.damageRoll !== undefined) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "attack-burst damage burst damage can only be filled when at least one target fails the Dexterity Saving Throw.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (input.fillSet.damageRoll !== undefined) {
    const burstDamageValidation = validateSpellBurstDamageFill(
      input.fillSet.damageRoll,
      input.invocation,
    );
    /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (burstDamageValidation !== null) {
      /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
      return invalidResult(
        input.input.state,
        "invalidFill",
        burstDamageValidation,
      );
    }
    /* v8 ignore stop -- @preserve */
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    unexpectedSourceDamageRollPenaltyRoll(
      input.fillSet.sourceDamageRollPenaltyRolls,
      expectedSourcePenaltyHoles,
    ) !== undefined
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop -- @preserve */
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (burstSourcePenalty.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
  /* v8 ignore stop -- @preserve */
  if (burstSourcePenalty.tag === "needsHoles") {
    return needsHolesResult(damagedByAttack, input.input.subject, [
      ...burstSourcePenalty.holes,
    ]);
  }

  const burstDamageByTargetId = new Map(
    failedTargets.flatMap((targetId): readonly [CombatantId, number][] => {
      const burstTarget = damagedByAttack.combatants.get(targetId);
      /* v8 ignore start -- @preserve -- Internal replay invariant: validated Ice Knife save outcomes name roster targets, and a failed save reaches this projection only after the burst damage roll is filled. */
      if (burstTarget === undefined || input.fillSet.damageRoll === undefined) {
        return [];
      }
      /* v8 ignore stop -- @preserve */
      return [
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
      /* v8 ignore start -- @preserve -- Internal replay invariant: burstDamageByTargetId contains only targets retained from the immediately preceding validated roster projection. */
      if (burstTarget === undefined) {
        return null;
      }
      /* v8 ignore stop -- @preserve */
      return zeroHitPointReplacementDispositionHole({
        damageSourceId: input.actorId,
        target: burstTarget,
        damageAmount,
        holeKey: attackBurstDamageDispositionHoleKey("burst", targetId),
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (damageDispositionValidation !== null) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  /* v8 ignore stop -- @preserve */
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
      /* v8 ignore start -- @preserve -- Internal replay invariant: concentrationDamageByTargetId is populated only from the retained primary target and validated burst target projection. */
      if (damagedTarget === undefined) {
        return [];
      }
      /* v8 ignore stop -- @preserve */
      return damageLifecycleConcentrationSavingThrowHoles({
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.concentrationSavingThrows.some(
      (fill) => !concentrationSaveIds.has(fill.holeId),
    )
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const concentrationSaveByTargetId = new Map(
    concentrationSaves.map((concentrationSave) => [
      concentrationSave.combatantId,
      concentrationSavingThrowFillFor(
        input.fillSet.concentrationSavingThrows,
        concentrationSave,
      ),
    ]),
  );
  const burstStagedConditionSaveChecks = failedTargets.map((targetId) => {
    const damagedTarget = damagedByAttack.combatants.get(targetId);
    const damageAmount = burstDamageByTargetId.get(targetId) ?? 0;
    const burstDamageEventKey = saveGatedConditionDamageOccurrenceKeyForHole(
      attackBurstDamageDispositionHoleKey("burst", targetId).holeId,
    );
    /* v8 ignore start -- @preserve -- Internal replay invariant: failedTargets was validated against the battle roster, and attack damage application preserves those combatants. */
    if (damagedTarget === undefined) {
      return { tag: "ok" as const, holes: [] };
    }
    /* v8 ignore stop -- @preserve */
    const holes =
      damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveHoles({
        state: damagedByAttack,
        target: damagedTarget,
        damageAmount,
        damageOccurrenceKey: burstDamageEventKey,
      });
    return damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveFillCheck(
      {
        state: damagedByAttack,
        target: damagedTarget,
        damageAmount,
        fills: fillsMatchingHoleIds(
          input.fillSet.saveGatedConditionWithRepeatDamageRepeatSaves,
          holes,
        ),
        damageOccurrenceKey: burstDamageEventKey,
      },
    );
  });
  const invalidBurstStagedConditionSaveCheck =
    burstStagedConditionSaveChecks.find((check) => check.tag === "invalid");
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (invalidBurstStagedConditionSaveCheck?.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      invalidBurstStagedConditionSaveCheck.message,
    );
  }
  /* v8 ignore stop -- @preserve */
  const missingBurstStagedConditionSaveHoles =
    burstStagedConditionSaveChecks.flatMap((check) =>
      check.tag === "needsHoles" ? [...check.holes] : [],
    );
  if (missingBurstStagedConditionSaveHoles.length > 0) {
    return needsHolesResult(damagedByAttack, input.input.subject, [
      ...missingBurstStagedConditionSaveHoles,
    ]);
  }
  const stagedConditionSaveHoleIds = new Set<BattleHoleId>(
    [
      ...attackStagedConditionSaveCheck.holes,
      ...burstStagedConditionSaveChecks.flatMap((check) =>
        check.tag === "invalid" ? [] : check.holes,
      ),
    ].map((hole) => hole.holeId),
  );
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (
    input.fillSet.saveGatedConditionWithRepeatDamageRepeatSaves.some(
      (fill) => !stagedConditionSaveHoleIds.has(fill.holeId),
    )
  ) {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      "damage-triggered repeat-save condition damage repeat save fill must match a requested damaged target.",
    );
  }
  /* v8 ignore stop -- @preserve */

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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (attackRelationshipCheck.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      attackRelationshipCheck.message,
    );
  }
  /* v8 ignore stop -- @preserve */
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
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (burstRelationshipCheck.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed resolution input: this branch rejects fills that contradict the admitted subject's discovered holes or current typed runtime constraints. */
    return invalidResult(
      input.input.state,
      "invalidFill",
      burstRelationshipCheck.message,
    );
  }
  /* v8 ignore stop -- @preserve */
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
            linkedDefenseResistanceDamageShareConcentrationSavingThrows:
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
            saveGatedConditionDamageRepeatSave: {
              kind: "repeatSave",
              fills: attackStagedConditionLifecycleFills,
              occurrenceKey: attackDamageEventKey,
            },
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
          const damagedTarget = damagedByAttack.combatants.get(targetId);
          /* v8 ignore start -- @preserve -- Internal replay invariant: every failed Ice Knife save target is retained in burstDamageByTargetId with its roster combatant before burst application. */
          if (damageAmount === undefined || damagedTarget === undefined) {
            return state;
          }
          /* v8 ignore stop -- @preserve */
          const concentrationLifecycleFills = fillsMatchingHoleIds(
            input.fillSet.concentrationSavingThrows,
            damageLifecycleConcentrationSavingThrowHoles({
              state: damagedByAttack,
              target: damagedTarget,
              damageAmount:
                concentrationDamageByTargetId.get(targetId) ?? damageAmount,
            }),
          );
          const burstDamageEventKey =
            saveGatedConditionDamageOccurrenceKeyForHole(
              attackBurstDamageDispositionHoleKey("burst", targetId).holeId,
            );
          const stagedConditionLifecycleFills = fillsMatchingHoleIds(
            input.fillSet.saveGatedConditionWithRepeatDamageRepeatSaves,
            damageLifecycleSaveGatedConditionWithRepeatDamageRepeatSaveHoles({
              state: damagedByAttack,
              target: damagedTarget,
              damageAmount,
              damageOccurrenceKey: burstDamageEventKey,
            }),
          );
          return applyPreparedSlotSpellDamage(state, targetId, damageAmount, {
            concentrationSavingThrow: concentrationSaveByTargetId.get(targetId),
            linkedDefenseResistanceDamageShareConcentrationSavingThrows:
              concentrationLifecycleFills,
            damageDisposition: damageDispositionForTarget(
              burstDamageDispositionHoles,
              input.fillSet.damageDispositions,
              targetId,
            ),
            saveGatedConditionDamageRepeatSave: {
              kind: "repeatSave",
              fills: stagedConditionLifecycleFills,
              occurrenceKey: burstDamageEventKey,
            },
            damageSourceId: input.actorId,
            spatialFacts: input.fillSet.targetSpatialFacts,
            ...(burstRelationshipCheck.decisions === undefined
              ? {}
              : {
                  relationshipDecisions: burstRelationshipCheck.decisions,
                }),
          });
        }, damagedByAttackWithConcentration);

  let afterResources = damagedByBurst;
  if (input.release.kind === "ordinaryCast") {
    const spentResources = spendSpellCastResources({
      state: damagedByBurst,
      actorId: input.actorId,
      invocation: input.invocation,
      errorState: input.input.state,
      ...optionalProperty("actionCostOverride", input.actionCostOverride),
      ...optionalProperty("metamagicApplications", input.metamagicApplications),
    });
    if (spentResources.tag !== "resolved") {
      return spentResources;
    }
    afterResources = spentResources.state;
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
    state: afterResources,
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
    state: afterResources,
    snapshot: snapshotBattle(afterResources),
  };
}
