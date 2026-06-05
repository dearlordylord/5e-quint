// Attack-burst save-damage spell resolution, currently Ice Knife.
// Extracted from spells-resolve.ts as a procedure-local resolver slice.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.remarkable-athlete
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.INDEPENDENT_ATTACK_SEQUENCE
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MIRROR_IMAGE_HIT_INTERCEPTION

import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import {
  attackRollHits,
  attackRollResultIsValid,
} from "@dnd/shared-algebras/attack-roll-algebra";
import { damageAmount as toDamageAmount } from "@dnd/shared/types";
import {
  ATTACK_ROLL_HOLE_ID,
  ATTACK_TARGET_HOLE_ID,
  attackRollIsCriticalHit,
  maybeOpenReactionWindow,
  openAfterDamageSequenceReactionWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type BattleAfterDamageEvent,
  type BattleFill,
  type BattleHoleId,
  type BattleResolutionResult,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
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
import { activeEffectArmorClass } from "./creature-state.ts";
import {
  damageLifecycleConcentrationSavingThrowHoles,
  damageLifecycleHideousLaughterDamageRepeatSaveFillCheck,
  damageLifecycleHideousLaughterDamageRepeatSaveHoles,
  fillsMatchingHoleIds,
} from "./damage-apply.ts";
import {
  activeMarkedDamageRiders,
  applyAvailableSourceDamageRollPenalty,
  damageAmountByTypeAfterTargetAdjustments,
  sourceDamageRollPenaltyRollHoleForDamageRoll,
  sourceDamageRollPenaltyRollForDamageRoll,
  unexpectedSourceDamageRollPenaltyRoll,
} from "./damage-helpers.ts";
import { needsHolesResult } from "./hole-helpers.ts";
import { mirrorImageHitInterceptionCheck } from "./mirror-image-hit-interception.ts";
import { invalidResult } from "./result-helpers.ts";
import { resolveRemarkableAthleteCriticalHitMovement } from "./remarkable-athlete-critical-movement.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import { sanctuaryTargetingInterdictionCheck } from "./sanctuary-targeting-interdiction.ts";
import { spellCastReactionFrame } from "./spell-cast-reaction-frame.ts";
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
import { spellAttackKindForRedirect } from "./spells-profiles.ts";
import {
  recordAttackRollMissToHitReplacementUsed,
  selectedAttackRollMissToHitReplacement,
} from "./statblock-attacks.ts";

import { spendSpellCastResources } from "./spells-resolve-resources.ts";

import { validateSavingThrowOutcomes } from "./spells-resolve-save-gates.ts";

import { type SpellFillSet } from "./spells-resolve-fill-set.ts";
import { spellFillSet } from "./spells-resolve-fill-set.ts";

import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
export function resolveAttackBurstSaveDamageSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "attackBurstSaveDamage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.targetList !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.targetAbilityChoices !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Attack-burst save damage spells use one target and burst Saving Throw fills.",
    );
  }
  if (input.fillSet.targetId === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTargetHole(input.input.state, input.actorId, input.invocation),
    ]);
  }
  const target = input.input.state.combatants.get(input.fillSet.targetId);
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
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell target must be a combatant within the selected spell's supported range.",
    );
  }

  const sanctuaryCheck = sanctuaryTargetingInterdictionCheck({
    state: input.input.state,
    triggeringCombatantId: input.actorId,
    wardedCombatantId: target.combatantId,
    triggeringTargetEventId: ATTACK_TARGET_HOLE_ID,
    fills: input.input.fills,
  });
  if (sanctuaryCheck.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      sanctuaryCheck.hole,
    ]);
  }
  if (sanctuaryCheck.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      sanctuaryCheck.message,
    );
  }
  if (sanctuaryCheck.tag === "lost") {
    return spendSpellCastResources({
      state: input.input.state,
      actorId: input.actorId,
      invocation: input.invocation,
      errorState: input.input.state,
    });
  }
  if (sanctuaryCheck.tag === "newTarget") {
    const replacementTarget = input.input.state.combatants.get(
      sanctuaryCheck.targetId,
    );
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
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Sanctuary replacement Ice Knife target must be legal for the selected spell.",
      );
    }
    const originalTargetFill = input.input.fills.find(
      (fill): fill is Extract<BattleFill, { readonly kind: "targetChoice" }> =>
        fill.kind === "targetChoice" && fill.value === target.combatantId,
    );
    if (originalTargetFill === undefined) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Sanctuary replacement requires the original Ice Knife target fill.",
      );
    }
    const fills = input.input.fills
      .filter((fill) => fill.kind !== "sanctuaryInterdictionOutcome")
      .map(
        (fill): BattleFill =>
          fill === originalTargetFill
            ? {
                ...fill,
                value: replacementTarget.combatantId,
                spatialFacts: sanctuaryCheck.spatialFacts,
              }
            : fill,
      );
    const fillSet = spellFillSet(fills, input.invocation);
    if (fillSet.tag === "invalid") {
      return invalidResult(input.input.state, "invalidFill", fillSet.message);
    }
    return resolveAttackBurstSaveDamageSpellAct({
      input: { ...input.input, fills },
      actorId: input.actorId,
      invocation: input.invocation,
      fillSet,
    });
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [target.combatantId],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "magicAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
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
  if (!attackRollResultIsValid(input.fillSet.attackRoll)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell attack roll result is outside the d20 attack-roll protocol.",
    );
  }
  if (!attackRollModeMatches(input.fillSet.attackRoll, requiredRollMode)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell attack roll mode does not match the current attack-roll rule.",
    );
  }

  const ordinaryHit = attackRollHits(
    input.fillSet.attackRoll,
    currentArmorClass(activeEffectArmorClass(target)),
  );
  const missToHitReplacement = selectedAttackRollMissToHitReplacement({
    state: input.input.state,
    subject: input.input.subject,
    attackerId: input.actorId,
    targetId: target.combatantId,
    attackRoll: input.fillSet.attackRoll,
    ordinaryHit,
  });
  if (
    input.fillSet.attackRoll.missToHitReplacementUnitId !== undefined &&
    missToHitReplacement === null
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      ordinaryHit
        ? "Attack-roll miss-to-hit replacement can only be selected after a miss."
        : "Attack-roll miss-to-hit replacement is not available for this spell attack roll.",
    );
  }
  const hit = ordinaryHit || missToHitReplacement !== null;
  const critical = attackRollIsCriticalHit(input.fillSet.attackRoll);
  const attackRolledState = recordAttackRollMissToHitReplacementUsed(
    consumeHelpAttackForAttackRoll(
      recordAttackRollOngoingFeatures(
        input.input.state,
        input.actorId,
        target.combatantId,
        null,
      ),
      input.actorId,
      target.combatantId,
    ),
    input.actorId,
    missToHitReplacement,
    {
      subject: input.input.subject,
      targetId: target.combatantId,
      attackRoll: input.fillSet.attackRoll,
    },
  );

  if (!hit && input.fillSet.mirrorImageDuplicateRoll !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Mirror Image duplicate roll is only valid after a hit.",
    );
  }
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
  if (hit && mirrorImageAttacker === undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Mirror Image attacker is no longer present.",
    );
  }
  if (mirrorImageCheck.tag === "needsHoles") {
    return needsHolesResult(attackRolledState, input.input.subject, [
      mirrorImageCheck.hole,
    ]);
  }
  if (mirrorImageCheck.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      mirrorImageCheck.message,
    );
  }
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

  if (hitTarget && input.input.suppressedReactionTrigger !== "attackHit") {
    const reactionWindow = maybeOpenReactionWindow(
      attackResolvedState,
      {
        trigger: "attackHit",
        attackerId: input.actorId,
        targetId: target.combatantId,
        attackRoll: input.fillSet.attackRoll,
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
      input.input.suppressedReactionTrigger,
    );
    if (reactionWindow !== null) {
      return reactionWindow;
    }
  }

  const remarkableAthleteMovement =
    resolveRemarkableAthleteCriticalHitMovement({
      state: attackResolvedState,
      subject: input.input.subject,
      attackerId: input.actorId,
      scoredCriticalHit: hitTarget && critical,
      fills: input.fillSet,
    });
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
  if (!hitTarget && input.fillSet.attackBurstDamageRoll !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Ice Knife attack damage can only be filled after a hit.",
    );
  }
  if (hitTarget && input.fillSet.attackBurstDamageRoll !== undefined) {
    const attackDamageValidation = validateSpellDamageFill(
      input.fillSet.attackBurstDamageRoll,
      input.invocation,
      critical,
      spellMarkedDamageRiders,
    );
    if (attackDamageValidation !== null) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        attackDamageValidation,
      );
    }
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
  if (attackSourcePenalty.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
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
  if (attackDamageDispositionValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      attackDamageDispositionValidation,
    );
  }
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
  if (attackHideousLaughterSaveCheck.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      attackHideousLaughterSaveCheck.message,
    );
  }
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
    savingThrowHole,
    damagedByAttack,
    input.actorId,
    target.combatantId,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }

  const failedTargets = input.fillSet.savingThrowOutcomes.outcomes.flatMap(
    (outcome) => (outcome.succeeded ? [] : [outcome.targetId]),
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      damagedByAttack,
      {
        trigger: "saveFailed",
        targetId: failedTargets[0]!,
        sourceSpellId: input.invocation.spell.id,
        continuation: {
          kind: "replay",
          subject:
            input.input.reactionContinuationSubject ?? input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (saveFailedReactionWindow !== null) {
      return saveFailedReactionWindow;
    }
  }

  if (failedTargets.length > 0 && input.fillSet.damageRoll === undefined) {
    if (
      unexpectedSourceDamageRollPenaltyRoll(
        input.fillSet.sourceDamageRollPenaltyRolls,
        attackExpectedSourcePenaltyHole === null
          ? []
          : [attackExpectedSourcePenaltyHole],
      ) !== undefined
    ) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Source damage roll penalty does not match an active source-side damage penalty.",
      );
    }
    return needsHolesResult(damagedByAttack, input.input.subject, [
      spellBurstDamageHole(input.invocation),
    ]);
  }
  if (failedTargets.length === 0 && input.fillSet.damageRoll !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Ice Knife burst damage can only be filled when at least one target fails the Dexterity Saving Throw.",
    );
  }
  if (input.fillSet.damageRoll !== undefined) {
    const burstDamageValidation = validateSpellBurstDamageFill(
      input.fillSet.damageRoll,
      input.invocation,
    );
    if (burstDamageValidation !== null) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        burstDamageValidation,
      );
    }
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
  if (
    unexpectedSourceDamageRollPenaltyRoll(
      input.fillSet.sourceDamageRollPenaltyRolls,
      expectedSourcePenaltyHoles,
    ) !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
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
  if (burstSourcePenalty.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Source damage roll penalty does not match an active source-side damage penalty.",
    );
  }
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
  if (damageDispositionValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
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
  if (
    input.fillSet.concentrationSavingThrows.some(
      (fill) => !concentrationSaveIds.has(fill.holeId),
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    );
  }
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
  if (invalidBurstHideousLaughterSaveCheck?.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      invalidBurstHideousLaughterSaveCheck.message,
    );
  }
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
  if (
    input.fillSet.hideousLaughterDamageRepeatSaves.some(
      (fill) => !hideousLaughterSaveHoleIds.has(fill.holeId),
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Hideous Laughter damage repeat save fill must match a requested damaged target.",
    );
  }

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
          });
        }, damagedByAttackWithConcentration);

  const spentResources = spendSpellCastResources({
    state: damagedByBurst,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
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
  const afterDamageReactionWindow = openAfterDamageSequenceReactionWindow({
    state: spentResources.state,
    subject: input.input.subject,
    events: afterDamageEvents,
    objectDamages: [],
    objectIgnitions: [],
    droppedObjects: [],
    suppressedReactionTrigger: input.input.suppressedReactionTrigger,
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
