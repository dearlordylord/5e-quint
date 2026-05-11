// Spell resolution dispatch (Cluster L). Mechanical extraction from
// battle-reducer.ts. The largest cluster in the file: master spell-act
// resolvers (`resolveSpellAct`, `resolveAttackBurstSaveDamageSpellAct`,
// `resolveSpellRelease`, `resolvePreparedSlotSpellAct`, …),
// per-procedure resolver bodies (chained spells, healing, scalar buff,
// roll-modifier, creature-type protection, condition immunity, save-gate
// damage/condition/attack-roll-advantage), target-selection helpers, fill-set
// builders, and resource-spending helpers (`spendSpellCastResources`,
// `spellRequiresConcentration`, `startSpellEffectConcentration`).
//
// L sits at the top of the spell subsystem DAG. It consumes K (discovery),
// O (profiles), P (holes/fills), Q (spell-effects), M (damage-apply),
// N (damage-helpers), R (hole-helpers), S (movement-speed), T (attack-roll),
// U (attack-damage-apply), V (statblock), W (statblock-attacks), and G
// (creature-state). Calls into dispatcher-layer functions (`endTurn`,
// `snapshotBattle`, `discoverBattleActs`, etc.) round-trip through
// `../battle-reducer.ts` until Pass 19 merges the dispatcher.

import { Either, Match, Schema } from "effect";
import { isNonEmptyReadonlyArray } from "effect/Array";
import {
  AbilityModifier,
  AttackBonus,
  attackBonus,
  Hp,
  damageAmount as toDamageAmount,
  difficultyClass,
  movementFeet,
  spellSlotLevel,
  type Condition,
  type DamageDieSize,
  type ProficiencyBonus as ProficiencyBonusType,
  type Round as RoundType,
} from "@dnd/shared/types";
import {
  ATTACK_ROLL_MODES,
  holeId,
  holeInstanceKey,
  type AttackRollMode,
  type AttackRollResult,
  type RolledDiceGroup,
  type RuntimeHole,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  attackRollHits,
  attackRollResultIsValid,
} from "@dnd/shared-algebras/attack-roll-algebra";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import {
  rolledDiceTotal,
  validateRolledDiceForDiceExpr,
} from "@dnd/shared-algebras/runtime-dice-algebra";
import {
  applyCondition,
  hasCondition,
  isIncapacitated,
  removeCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import {
  actionRestrictionAllows,
  canSpendAction,
  spendAction,
  spendActivationResource,
  spendMatchingActionResource,
} from "@dnd/shared-algebras/action-economy-algebra";
import {
  elapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import type {
  Ability,
  Attachment,
  ActivationPhase,
  DamageType,
  DcSource,
  DiceAmount as SurfaceDiceAmount,
  DiceExpr,
  EffectAtom,
  Skill,
  SkillFilter,
  SpellRecord,
  TargetSelection,
} from "@dnd/surface/surface/types";
import { DamageTypeSchema } from "@dnd/surface/surface/schema";
import type { CombatantId } from "../identity.ts";
import { spellId } from "../identity.ts";
import {
  spellEffectInvocationRef,
  type BattleSubject,
  type SpellInvocationRef,
} from "../battle-subjects.ts";
import {
  expendSpellSlot,
  spellDamageComponents,
  spellDamageExpression,
  spellHealingAmount,
  spellHealingExpression,
  scalarBuffTemporaryHitPointsAmount,
  scalarBuffTemporaryHitPointsExpression,
  spellBurstDamageExpression,
} from "./spell-effects.ts";
import {
  attackDamageByType,
  damageAmountByTypeMapEntries,
  damageAmountByTypeAfterTargetAdjustments,
  applySpellDamageReductions,
  applyAvailableSpellDamageReduction,
  damageAmountAfterTargetAdjustments,
  activeSpellWeaponDamageRiders,
  activeMarkedDamageRiderEffect,
  activeMarkedDamageRiders,
  isSpellDamageReductionRollFill,
  spellDamageReductionRollForTarget,
} from "./damage-helpers.ts";
import {
  applyHpDamage,
  applyHpHealing,
  applyTemporaryHitPoints,
  breakBattleConcentration,
  breakBattleConcentrationAfterDamage,
  concentrationSavingThrowHole,
  markMarkedDamageRiderTransferAvailable,
} from "./damage-apply.ts";
import {
  needsHolesResult,
  revealHidden,
} from "./hole-helpers.ts";
import {
  attackKindForDeflectRedirect,
} from "./movement-speed.ts";
import {
  attackRollHole,
  attackRollModeMatches,
  attackRollOngoingFeatureActivationProfile,
  attackRollOngoingFeatureActivations,
  battleCreatureType,
  consumeHelpAttackForAttackRoll,
  consumeOneShotAttackRollEffects,
  extendSavingThrowOngoingFeatures,
  recordAttackRollOngoingFeatures,
  requiredAttackRollMode,
} from "./attack-roll.ts";
import {
  attackDamageHole,
  attackDamageHoleId,
  damageDispositionFillFor,
  damageDispositionFillsValidation,
  damageDispositionForTarget,
  iceKnifeDamageDispositionHoleKey,
  zeroHitPointReplacementDispositionHole,
} from "./attack-damage-apply.ts";
import {
  attackDamageComponents,
  attackDamageRiderForProfile,
  attackRollMissToHitReplacementHolePayload,
  clearPendingAttackRollMissToHitReplacementSelection,
  recordAttackRollMissToHitReplacementUsed,
  selectedAttackRollMissToHitReplacement,
  signedModifier,
} from "./statblock-attacks.ts";
import { invalidResult } from "./result-helpers.ts";
import {
  combatantsAreAllies,
  combatantsAreEnemies,
  currentActorId,
} from "./creature-state-leaves.ts";
import {
  activeEffectArmorClass,
  activeOngoingFeatureOccurrencesForCombatant,
  battleCreatureStateWithKnockOutPreservedConditions,
  isCharacterBattleCreatureState,
  ongoingFeatureSourceKey,
  ongoingFeatureSourceKeyForUnit,
} from "./creature-state.ts";
import {
  isScalarBuffTargetListInvocation,
  isTargetListSpellInvocation,
  type AttackFillSet,
  type BattleActiveEffect,
  type BattleAttackDamageDisposition,
  type BattleConcentration,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleHoleId,
  type BattleHoleInstanceKey,
  type BattleReadiedSpell,
  type BattleResolutionResult,
  type BattleRolledDiceFill,
  type BattleSavingThrowOutcome,
  type BattleSpellAreaChoice,
  type BattleSpellAttackRollHole,
  type BattleSpellDamageRollHole,
  type BattleSpellDamageTypeChoiceHole,
  type BattleSpellHealingRollHole,
  type BattleSpellSavingThrowOutcomeHole,
  type BattleSpellTargetAllocation,
  type BattleSpellTargetAllocationHole,
  type BattleSpellTargetListHole,
  type BattleState,
  type BattleStatBlockRechargeRollHole,
  type BattleStatBlockRechargeRollResult,
  type BattleTargetChoiceHole,
  type BattleTargetSpatialFact,
  type BattleTurnResources,
  type ActionSpellBattleResolutionInput,
  type BattleResolutionInputForSubject,
  type BonusActionSpellBattleResolutionInput,
  type DamageSpellSource,
  type HpDamageProjection,
  type ReadiedSpellInvocation,
  type SaveDamageResult,
  type SpellAttackKind,
  type SpellMarkedDamageRider,
  type SpellPostDamageRider,
  type SpellTargeting,
  type SpellWeaponDamageRider,
  type SupportedSpellInvocation,
  type SupportedDamageSpellInvocation,
  type TargetListSpellInvocation,
  type WeaponDamageDiceRollChoiceFill,
  activeOngoingFeaturesPreventSpellcasting,
  attackRollIsCriticalHit,
  resolveBattleSubjectInternal,
  resolveCastTriggeredReactionSpellCommand,
  zeroHpLifecycleIsTerminal,
  reactionTriggerLabel,
  abilityProficiencyDifficultyClass,
  endTurn,
  maybeOpenReactionWindow,
  openAfterDamageSequenceReactionWindow,
  snapshotBattle,
  ATTACK_ROLL_HOLE_ID,
  ATTACK_TARGET_HOLE_ID,
  type BattleAfterDamageEvent,
  type BattleAttackDamageDispositionHole,
  type BattleAttackRollResult,
  type BattleConcentrationSavingThrowHole,
  type BattleSpellSavingThrowOutcomeValue,
  type BattleSpellTargetListSpatialFact,
} from "../battle-reducer.ts";
import {
  isReadiedSpellInvocation,
  spellInvocationCastSummary,
  spellInvocationCasterPrerequisiteIsMet,
  spellInvocationIsSpellcasting,
  spellRequiresVerbal,
} from "./spells-discovery.ts";
import {
  damageReductionSpellProjection,
  diceExprWithDelta,
  markSpellSlotExpendedThisTurn,
  rollModifierActiveEffect,
  rollModifierSpellProjection,
  scalarBuffSpellEffect,
  scalarBuffSpellTargetCount,
  spellActTurnResourceAvailable,
  spellAttackKindForRedirect,
  spellHasAvailableSpend,
  supportedSpellActs,
} from "./spells-profiles.ts";
import {
  applyConditionImmunityAndTurnStartTemporaryHitPointsEffects,
  applyCreatureTypeProtectionSpellEffect,
  applyDamageReductionSpellEffect,
  applyFailedSaveAttackRollAdvantageEffects,
  applyFailedSaveSpellActiveEffects,
  applyFailedSaveSpellConditionEffects,
  applyHeldLightSpellEffect,
  applyMarkedDamageRiderSpellEffect,
  spellAttackRollHole,
  spellBurstDamageAmountForTarget,
  spellDamageByTypeForTarget,
  spellTargetAllocationHoleId,
  spellTargetListHoleId,
  sameCombatantIdSet,
  applyPersistentSpellActiveEffect,
  applyPreparedSlotSpellDamage,
  applyRollModifierSpellEffect,
  applyScalarBuffSpellEffect,
  applySpellActiveEffects,
  applySpellDamage,
  chainedSpellAttackRollHole,
  chainedSpellAttackRollHoleId,
  chainedSpellDamageRollHole,
  chainedSpellDamageRollHoleId,
  chainedSpellLeapTargetIsLegal,
  chainedSpellTargetHole,
  chainedSpellTargetHoleId,
  damageSpellInvocationRef,
  repeatedDamageAllocationSpellDamageAmount,
  saveGateDamageResultForOutcome,
  spellBurstDamageHole,
  spellDamageAmountForTarget,
  spellDamageHole,
  spellDamageTypeChoiceHole,
  spellDamageTypes,
  spellHealingRollHole,
  spellRollModifierSkillChoiceHole,
  spellRollModifierSkillChoiceHoleId,
  spellSavingThrowAbility,
  spellSavingThrowOutcomeHole,
  spellSavingThrowOutcomeHoleId,
  spellSavingThrowTargeting,
  spellScalarBuffRollHole,
  spellTargetAllocationHole,
  spellTargetHole,
  spellTargetIsLegal,
  spellTargetListHole,
  supportedSpellInvocationMatchesRef,
  supportedSpellInvocationRef,
  validatePreparedSlotSpellDamageGroups,
  validateScalarBuffTemporaryHitPointsFill,
  validateSpellBurstDamageFill,
  validateSpellDamageFill,
  validateSpellHealingFill,
  validateSpellTargetAllocation,
  validateSpellTargetList,
} from "./spells-holes-fills.ts";

export function resolveSpellAct(
  input: ActionSpellBattleResolutionInput,
): BattleResolutionResult {
  const subject = input.subject;
  const actor = input.state.combatants.get(subject.actorId);
  const invocation =
    actor?.origin.kind === "character"
      ? supportedSpellActs(actor).find((candidate) =>
          supportedSpellInvocationMatchesRef(candidate, subject.invocation),
        )
      : undefined;
  if (actor?.origin.kind !== "character" || invocation == null) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Action-time spell act requires a supported prepared spell or cantrip.",
    );
  }
  if (!spellHasAvailableSpend(actor, invocation)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Action-time spell act no longer has its required runtime spell resource.",
    );
  }
  if (!spellInvocationCasterPrerequisiteIsMet(actor, invocation)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Action-time spell act requires its active caster spell effect.",
    );
  }
  if (activeOngoingFeaturesPreventSpellcasting(actor)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Action-time spell act is unavailable while an active ongoing feature prevents spellcasting.",
    );
  }
  if ("actionCost" in invocation && invocation.actionCost === "bonusAction") {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Prepared Bonus Action spells must use the Bonus Action spell subject.",
    );
  }
  if (invocation.procedure === "shieldReaction") {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Triggered Reaction spells must use the pending Reaction decision.",
    );
  }
  if (
    !spellActTurnResourceAvailable(input.state.currentTurnResources, invocation)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }

  if (
    subject.mode.tag === "ready" &&
    (invocation.procedure === "directHitPointRestoration" ||
      invocation.procedure === "heldLightHurl" ||
      invocation.procedure === "damageReduction" ||
      invocation.procedure === "scalarBuff" ||
      invocation.procedure === "rollModifier" ||
      invocation.procedure === "creatureTypeProtection" ||
      invocation.procedure ===
        "conditionImmunityAndTurnStartTemporaryHitPoints" ||
      invocation.procedure === "saveGatedCondition" ||
      invocation.procedure === "saveGatedAttackRollAdvantage")
  ) {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "This spell procedure cannot be readied by this runtime lane.",
    );
  }

  const castingState = spellRequiresVerbal(invocation.spell)
    ? revealHidden(input.state, subject.actorId)
    : input.state;
  if (subject.mode.tag === "ready") {
    if (!isReadiedSpellInvocation(invocation)) {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "This spell procedure cannot be readied by this runtime lane.",
      );
    }
    return resolveReadySpellAct({ ...input, state: castingState }, invocation);
  }

  if (invocation.procedure === "chainedSpellAttackDamage") {
    return resolveChainedSpellAttackDamageAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
    });
  }

  const fillSet = spellFillSet(input.fills, invocation);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (invocation.procedure === "attackBurstSaveDamage") {
    return resolveAttackBurstSaveDamageSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "saveGatedDamage") {
    return resolveSaveGateDamageSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "saveGatedCondition") {
    return resolveSaveGateConditionSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "saveGatedAttackRollAdvantage") {
    return resolveSaveGateAttackRollAdvantageSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "repeatedDamageAllocation") {
    return resolvePreparedSlotSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "directHitPointRestoration") {
    return resolvePreparedHealingSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "scalarBuff") {
    return resolveScalarBuffSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "rollModifier") {
    return resolveRollModifierSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "creatureTypeProtection") {
    return resolveCreatureTypeProtectionSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "damageReduction") {
    return resolveDamageReductionSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (
    invocation.procedure === "conditionImmunityAndTurnStartTemporaryHitPoints"
  ) {
    return resolveConditionImmunityAndTurnStartTemporaryHitPointsSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }

  if (fillSet.targetId == null) {
    return needsHolesResult(castingState, input.subject, [
      spellTargetHole(castingState, subject.actorId, invocation),
    ]);
  }
  const target = input.state.combatants.get(fillSet.targetId);
  if (
    target == null ||
    !spellTargetIsLegal(
      input.state,
      subject.actorId,
      target.combatantId,
      invocation,
      fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell target must be a combatant within the selected spell's supported range.",
    );
  }

  if (invocation.procedure === "persistentArmorEffect") {
    if (
      fillSet.attackRoll != null ||
      fillSet.damageRoll != null ||
      fillSet.concentrationSavingThrows.length > 0
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Persistent spell effects do not use attack or damage fills.",
      );
    }
    const effected = applyPersistentSpellActiveEffect(
      castingState,
      subject.actorId,
      target.combatantId,
      invocation,
    );
    const spent = spendAction(effected.currentTurnResources, "magic");
    if (Either.isLeft(spent)) {
      return invalidResult(
        input.state,
        "staleSubject",
        "Magic action is no longer available for the current actor.",
      );
    }
    const slotTurnResources = markSpellSlotExpendedThisTurn(spent.right);
    if (Either.isLeft(slotTurnResources)) {
      return invalidResult(
        input.state,
        "staleSubject",
        "This turn has already expended a Spell Slot.",
      );
    }
    const slotted = expendSpellSlot(
      effected,
      subject.actorId,
      invocation.resource.slotLevel,
    );
    const nextState = {
      ...slotted,
      currentTurnResources: slotTurnResources.right,
    };
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    castingState,
    {
      trigger: "spellCast",
      casterId: subject.actorId,
      spellId: invocation.spell.id,
      targetIds: [target.combatantId],
      continuation: {
        kind: "replay",
        subject: input.subject,
        fills: input.fills,
      },
    },
    input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  let spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [];
  if (
    invocation.procedure === "spellAttackDamage" ||
    invocation.procedure === "heldLightHurl"
  ) {
    const requiredRollMode = requiredAttackRollMode(
      castingState,
      subject.actorId,
      target.combatantId,
    );
    if (fillSet.attackRoll == null) {
      return needsHolesResult(castingState, input.subject, [
        spellAttackRollHole(
          castingState,
          subject.actorId,
          invocation,
          requiredRollMode,
        ),
      ]);
    }
    if (!attackRollResultIsValid(fillSet.attackRoll)) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell attack roll result is outside the d20 attack-roll protocol.",
      );
    }
    if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell attack roll mode does not match the current attack-roll rule.",
      );
    }
    const ordinaryHit = attackRollHits(
      fillSet.attackRoll,
      currentArmorClass(activeEffectArmorClass(target)),
    );
    const missToHitReplacement = selectedAttackRollMissToHitReplacement({
      state: castingState,
      subject: input.subject,
      attackerId: subject.actorId,
      targetId: target.combatantId,
      attackRoll: fillSet.attackRoll,
      ordinaryHit,
    });
    if (
      fillSet.attackRoll.missToHitReplacementUnitId !== undefined &&
      missToHitReplacement === null
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        ordinaryHit
          ? "Attack-roll miss-to-hit replacement can only be selected after a miss."
          : "Attack-roll miss-to-hit replacement is not available for this spell attack roll.",
      );
    }
    const hit = ordinaryHit || missToHitReplacement !== null;
    const critical = attackRollIsCriticalHit(fillSet.attackRoll);
    const attackRolledState = recordAttackRollMissToHitReplacementUsed(
      consumeHelpAttackForAttackRoll(
        recordAttackRollOngoingFeatures(
          castingState,
          subject.actorId,
          target.combatantId,
          null,
        ),
        subject.actorId,
        target.combatantId,
      ),
      subject.actorId,
      missToHitReplacement,
      {
        subject: input.subject,
        targetId: target.combatantId,
        attackRoll: fillSet.attackRoll,
      },
    );
    spellMarkedDamageRiders = hit
      ? activeMarkedDamageRiders(
          attackRolledState.combatants.get(subject.actorId),
          target.combatantId,
        )
      : [];
    if (hit && input.suppressedReactionTrigger !== "attackHit") {
      const reactionWindow = maybeOpenReactionWindow(
        attackRolledState,
        {
          trigger: "attackHit",
          attackerId: subject.actorId,
          targetId: target.combatantId,
          attackRoll: fillSet.attackRoll,
          attackKind: spellAttackKindForRedirect(invocation.attackKind),
          damageTypes: [
            ...new Set([
              ...spellDamageTypes(invocation),
              ...spellMarkedDamageRiders.map(
                (rider) => rider.damage.damageType,
              ),
            ]),
          ],
          continuation: {
            kind: "replay",
            subject: input.subject,
            fills: input.fills,
          },
        },
        input.suppressedReactionTrigger,
      );
      if (reactionWindow !== null) {
        return reactionWindow;
      }
    }
    if (hit && fillSet.damageRoll == null) {
      return needsHolesResult(attackRolledState, input.subject, [
        spellDamageHole(invocation, critical, spellMarkedDamageRiders),
      ]);
    }
    if (
      !hit &&
      (fillSet.damageRoll != null || fillSet.damageDispositions.length > 0)
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage can only be filled after a hit.",
      );
    }
    if (!hit) {
      return spendSpellCastResources({
        state: attackRolledState,
        actorId: subject.actorId,
        invocation,
        errorState: input.state,
      });
    }
  } else if (fillSet.attackRoll != null) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Magic Missile does not use an attack roll.",
    );
  }

  if (fillSet.damageRoll == null) {
    return needsHolesResult(castingState, input.subject, [
      spellDamageHole(invocation),
    ]);
  }
  const spellAttackMissToHitReplacement =
    (invocation.procedure === "spellAttackDamage" ||
      invocation.procedure === "heldLightHurl") &&
    fillSet.attackRoll != null
      ? selectedAttackRollMissToHitReplacement({
          state: castingState,
          subject: input.subject,
          attackerId: subject.actorId,
          targetId: target.combatantId,
          attackRoll: fillSet.attackRoll,
          ordinaryHit: attackRollHits(
            fillSet.attackRoll,
            currentArmorClass(activeEffectArmorClass(target)),
          ),
        })
      : null;
  const spellResolutionState =
    (invocation.procedure === "spellAttackDamage" ||
      invocation.procedure === "heldLightHurl") &&
    fillSet.attackRoll != null
      ? recordAttackRollMissToHitReplacementUsed(
          consumeHelpAttackForAttackRoll(
            recordAttackRollOngoingFeatures(
              castingState,
              subject.actorId,
              target.combatantId,
              null,
            ),
            subject.actorId,
            target.combatantId,
          ),
          subject.actorId,
          spellAttackMissToHitReplacement,
          {
            subject: input.subject,
            targetId: target.combatantId,
            attackRoll: fillSet.attackRoll,
          },
        )
      : castingState;
  const critical =
    (invocation.procedure === "spellAttackDamage" ||
      invocation.procedure === "heldLightHurl") &&
    fillSet.attackRoll != null &&
    attackRollIsCriticalHit(fillSet.attackRoll);
  const damageValidation = validateSpellDamageFill(
    fillSet.damageRoll,
    invocation,
    critical,
    spellMarkedDamageRiders,
  );
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  const spellReductionRoll = spellDamageReductionRollForTarget(
    fillSet.spellDamageReductionRolls,
    target,
  );
  const spellReduction = applyAvailableSpellDamageReduction(
    target,
    spellDamageByTypeForTarget(
      target,
      invocation,
      fillSet.damageRoll,
      "full",
      spellMarkedDamageRiders,
      critical,
    ),
    spellReductionRoll,
  );
  if (spellReduction.tag === "invalid") {
    return invalidResult(
      input.state,
      "invalidFill",
      "Spell damage reduction roll does not match an unused matching damage-reduction spell effect.",
    );
  }
  if (spellReduction.tag === "needsHoles") {
    return needsHolesResult(spellResolutionState, input.subject, [
      ...spellReduction.holes,
    ]);
  }
  const spellDamageAmount = damageAmountByTypeAfterTargetAdjustments(
    spellReduction.target,
    spellReduction.damageByType,
  );
  const concentrationSave = concentrationSavingThrowHole(
    spellReduction.target,
    spellDamageAmount,
  );
  const concentrationFill =
    concentrationSave === null
      ? undefined
      : concentrationSavingThrowFillFor(
          fillSet.concentrationSavingThrows,
          concentrationSave,
        );
  if (concentrationSave !== null) {
    if (concentrationFill === undefined) {
      return needsHolesResult(spellResolutionState, input.subject, [
        concentrationSave,
      ]);
    }
    if (fillSet.concentrationSavingThrows.length > 1) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage accepts one Concentration Saving Throw fill for the damaged target.",
      );
    }
  } else if (fillSet.concentrationSavingThrows.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    );
  }
  const damageDispositionHole = zeroHitPointReplacementDispositionHole({
    damageSourceId: subject.actorId,
    target: spellReduction.target,
    damageAmount: spellDamageAmount,
  });
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHole === null ? [] : [damageDispositionHole],
    fills: fillSet.damageDispositions,
  });
  if (damageDispositionValidation !== null) {
    return invalidResult(
      input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  if (
    damageDispositionHole !== null &&
    damageDispositionFillFor(
      fillSet.damageDispositions,
      damageDispositionHole,
    ) === undefined
  ) {
    return needsHolesResult(spellResolutionState, input.subject, [
      damageDispositionHole,
    ]);
  }
  const damaged = applySpellDamage(
    spellResolutionState,
    target.combatantId,
    invocation,
    fillSet.damageRoll,
    critical,
    concentrationFill,
    "full",
    damageDispositionForTarget(
      damageDispositionHole === null ? [] : [damageDispositionHole],
      fillSet.damageDispositions,
      target.combatantId,
    ),
    spellMarkedDamageRiders,
    spellReductionRoll,
  );
  const effected = applySpellActiveEffects(
    damaged,
    subject.actorId,
    target.combatantId,
    invocation,
  );
  const spentResources = spendSpellCastResources({
    state: effected,
    actorId: subject.actorId,
    invocation,
    errorState: input.state,
  });
  if (spentResources.tag !== "resolved") {
    return spentResources;
  }
  const nextState = spentResources.state;
  const afterDamageReactionWindow = maybeOpenReactionWindow(
    nextState,
    {
      trigger: "afterDamage",
      damageSourceId: subject.actorId,
      damagedId: target.combatantId,
      damageAmount: toDamageAmount(spellDamageAmount),
      continuation: {
        kind: "resolved",
        subject: input.subject,
      },
    },
    input.suppressedReactionTrigger,
  );
  if (afterDamageReactionWindow !== null) {
    return afterDamageReactionWindow;
  }

  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export type ChainedSpellStepFills = {
  readonly target:
    | Extract<BattleFill, { readonly kind: "targetChoice" }>
    | undefined;
  readonly attackRoll:
    | Extract<BattleFill, { readonly kind: "attackRoll" }>
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
      readonly damageDispositions: readonly Extract<
        BattleFill,
        { readonly kind: "attackDamageDisposition" }
      >[];
    }
  | { readonly tag: "invalid"; readonly message: string };

export function resolveChainedSpellAttackDamageAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >;
  readonly opensSpellCastReactionWindow?: boolean;
  readonly spendsCastResources?: boolean;
}): BattleResolutionResult {
  const fillSet = chainedSpellFillSet(input.input.fills, input.invocation);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.input.state, "invalidFill", fillSet.message);
  }
  if (fillSet.damageType === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageTypeChoiceHole(input.invocation),
    ]);
  }
  const selectedDamageType = fillSet.damageType.value;
  if (!input.invocation.damageTypeChoices.includes(selectedDamageType)) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Chained spell damage type must be one of the selected spell's choices.",
    );
  }

  let replayState = input.input.state;
  let targeted: readonly CombatantId[] = [];
  const afterDamageEvents: BattleAfterDamageEvent[] = [];
  const concentrationHoles: BattleConcentrationSavingThrowHole[] = [];
  const damageDispositionHoles: BattleAttackDamageDispositionHole[] = [];
  const maxLeaps = Number(input.invocation.resource.slotLevel);

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
    if (target === undefined) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Chained spell target must be a combatant.",
      );
    }
    if (targeted.includes(target.combatantId)) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Chromatic Orb cannot target a creature more than once in the same casting.",
      );
    }
    if (
      stepIndex === 0
        ? !spellTargetIsLegal(
            replayState,
            input.actorId,
            target.combatantId,
            input.invocation,
            step.target.spatialFacts ?? [],
          )
        : !chainedSpellLeapTargetIsLegal(
            input.invocation,
            targeted[stepIndex - 1],
            target.combatantId,
            step.target.spatialFacts ?? [],
          )
    ) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        stepIndex === 0
          ? "Spell target must be a combatant within the selected spell's supported range."
          : "Chromatic Orb leap target must be different and within 30 feet of the previous target.",
      );
    }
    targeted = [...targeted, target.combatantId];

    if (stepIndex === 0 && input.opensSpellCastReactionWindow !== false) {
      const spellCastReactionWindow = maybeOpenReactionWindow(
        replayState,
        {
          trigger: "spellCast",
          casterId: input.actorId,
          spellId: input.invocation.spell.id,
          targetIds: [target.combatantId],
          continuation: {
            kind: "replay",
            subject: input.input.subject,
            fills: input.input.fills,
          },
        },
        input.input.suppressedReactionTrigger,
      );
      if (spellCastReactionWindow !== null) {
        return spellCastReactionWindow;
      }
    }

    const requiredRollMode = requiredAttackRollMode(
      replayState,
      input.actorId,
      target.combatantId,
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
    if (!attackRollResultIsValid(step.attackRoll.value)) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Spell attack roll result is outside the d20 attack-roll protocol.",
      );
    }
    if (!attackRollModeMatches(step.attackRoll.value, requiredRollMode)) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Spell attack roll mode does not match the current attack-roll rule.",
      );
    }

    const ordinaryHit = attackRollHits(
      step.attackRoll.value,
      currentArmorClass(activeEffectArmorClass(target)),
    );
    const missToHitReplacement = selectedAttackRollMissToHitReplacement({
      state: replayState,
      subject: input.input.subject,
      attackerId: input.actorId,
      targetId: target.combatantId,
      attackRoll: step.attackRoll.value,
      ordinaryHit,
    });
    if (
      step.attackRoll.value.missToHitReplacementUnitId !== undefined &&
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
    const attackRolledState = recordAttackRollMissToHitReplacementUsed(
      consumeHelpAttackForAttackRoll(
        recordAttackRollOngoingFeatures(
          replayState,
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
        attackRoll: step.attackRoll.value,
      },
    );
    replayState = attackRolledState;
    const hit = ordinaryHit || missToHitReplacement !== null;
    const critical = attackRollIsCriticalHit(step.attackRoll.value);
    if (!hit) {
      if (!chainedSpellLaterStepsAreEmpty(fillSet.steps, stepIndex)) {
        return invalidResult(
          input.input.state,
          "invalidFill",
          "Chromatic Orb chain cannot continue after a missed attack roll.",
        );
      }
      const extraFillValidation = validateChainedSpellFollowUpFills({
        concentrationHoles,
        concentrationFills: fillSet.concentrationSavingThrows,
        damageDispositionHoles,
        damageDispositionFills: fillSet.damageDispositions,
      });
      if (extraFillValidation !== null) {
        return invalidResult(
          input.input.state,
          "invalidFill",
          extraFillValidation,
        );
      }
      return resolveCompletedChainedSpell({
        input,
        state: replayState,
        afterDamageEvents,
      });
    }

    const attackHitReactionWindow = maybeOpenReactionWindow(
      replayState,
      {
        trigger: "attackHit",
        attackerId: input.actorId,
        targetId: target.combatantId,
        attackRoll: step.attackRoll.value,
        attackKind: spellAttackKindForRedirect(input.invocation.attackKind),
        damageTypes: [selectedDamageType],
        continuation: {
          kind: "replay",
          subject: input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (attackHitReactionWindow !== null) {
      return attackHitReactionWindow;
    }

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
    if (damageValidation !== null) {
      return invalidResult(input.input.state, "invalidFill", damageValidation);
    }
    const damageAmount = chainedSpellDamageAmountForTarget(
      target,
      input.invocation,
      selectedDamageType,
      step.damageRoll,
    );
    const concentrationSave = concentrationSavingThrowHole(
      target,
      damageAmount,
    );
    if (concentrationSave !== null) {
      concentrationHoles.push(concentrationSave);
      if (
        concentrationSavingThrowFillFor(
          fillSet.concentrationSavingThrows,
          concentrationSave,
        ) === undefined
      ) {
        return needsHolesResult(replayState, input.input.subject, [
          concentrationSave,
        ]);
      }
    }
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
    replayState = applyChainedSpellDamage(
      replayState,
      target.combatantId,
      input.invocation,
      selectedDamageType,
      step.damageRoll,
      critical,
      concentrationSave === null
        ? undefined
        : concentrationSavingThrowFillFor(
            fillSet.concentrationSavingThrows,
            concentrationSave,
          ),
      damageDispositionForTarget(
        dispositionHole === null ? [] : [dispositionHole],
        fillSet.damageDispositions,
        target.combatantId,
      ),
    );
    afterDamageEvents.push({
      damageSourceId: input.actorId,
      damagedId: target.combatantId,
      damageAmount: toDamageAmount(damageAmount),
    });

    if (
      !damageRollHasDuplicateD8Face(step.damageRoll) ||
      stepIndex >= maxLeaps
    ) {
      if (!chainedSpellLaterStepsAreEmpty(fillSet.steps, stepIndex)) {
        return invalidResult(
          input.input.state,
          "invalidFill",
          "Chromatic Orb chain can continue only after duplicate d8 damage faces and remaining leap budget.",
        );
      }
      const extraFillValidation = validateChainedSpellFollowUpFills({
        concentrationHoles,
        concentrationFills: fillSet.concentrationSavingThrows,
        damageDispositionHoles,
        damageDispositionFills: fillSet.damageDispositions,
      });
      if (extraFillValidation !== null) {
        return invalidResult(
          input.input.state,
          "invalidFill",
          extraFillValidation,
        );
      }
      return resolveCompletedChainedSpell({
        input,
        state: replayState,
        afterDamageEvents,
      });
    }
  }

  return invalidResult(
    input.input.state,
    "invalidFill",
    "Chromatic Orb chain exceeded its spell-slot leap budget.",
  );
}

export function resolveCompletedChainedSpell(input: {
  readonly input: {
    readonly input: ActionSpellBattleResolutionInput;
    readonly actorId: CombatantId;
    readonly invocation: Extract<
      SupportedSpellInvocation,
      { readonly procedure: "chainedSpellAttackDamage" }
    >;
    readonly spendsCastResources?: boolean;
  };
  readonly state: BattleState;
  readonly afterDamageEvents: readonly BattleAfterDamageEvent[];
}): BattleResolutionResult {
  if (input.input.spendsCastResources === false) {
    return openAfterDamageSequenceReactionWindow({
      state: input.state,
      subject: input.input.input.subject,
      events: input.afterDamageEvents,
      suppressedReactionTrigger: input.input.input.suppressedReactionTrigger,
    });
  }
  const spentResources = spendSpellCastResources({
    state: input.state,
    actorId: input.input.actorId,
    invocation: input.input.invocation,
    errorState: input.input.input.state,
  });
  if (spentResources.tag !== "resolved") {
    return spentResources;
  }
  return openAfterDamageSequenceReactionWindow({
    state: spentResources.state,
    subject: input.input.input.subject,
    events: input.afterDamageEvents,
    suppressedReactionTrigger: input.input.input.suppressedReactionTrigger,
  });
}

export function emptyChainedSpellStepFills(): ChainedSpellStepFills {
  return {
    target: undefined,
    attackRoll: undefined,
    damageRoll: undefined,
  };
}

export function chainedSpellFillSet(
  fills: readonly BattleFill[],
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
): ChainedSpellFillSet {
  let damageType:
    | Extract<BattleFill, { readonly kind: "damageTypeChoice" }>
    | undefined;
  const steps = Array.from(
    { length: Number(invocation.resource.slotLevel) + 1 },
    () => emptyChainedSpellStepFills(),
  );
  const concentrationSavingThrows: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[] = [];
  const damageDispositions: Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >[] = [];

  for (const fill of fills) {
    if (fill.kind === "damageTypeChoice") {
      if (fill.holeId !== spellDamageTypeChoiceHole(invocation).holeId) {
        return {
          tag: "invalid",
          message:
            "Damage type choice must use the selected chained spell act damage-type hole.",
        };
      }
      if (damageType !== undefined) {
        return {
          tag: "invalid",
          message: "Chained spell damage type was filled twice.",
        };
      }
      damageType = fill;
      continue;
    }
    if (
      fill.kind === "targetChoice" ||
      fill.kind === "attackRoll" ||
      fill.kind === "rolledDice"
    ) {
      const stepIndex = chainedSpellStepIndexForFill(fill, invocation);
      if (stepIndex === null || steps[stepIndex] === undefined) {
        return {
          tag: "invalid",
          message: `Fill ${fill.kind} does not match the chained spell replay holes.`,
        };
      }
      const step = steps[stepIndex];
      if (fill.kind === "targetChoice") {
        if (step.target !== undefined) {
          return {
            tag: "invalid",
            message: "Chained spell target was filled twice for one step.",
          };
        }
        steps[stepIndex] = { ...step, target: fill };
        continue;
      }
      if (fill.kind === "attackRoll") {
        if (step.attackRoll !== undefined) {
          return {
            tag: "invalid",
            message: "Chained spell attack roll was filled twice for one step.",
          };
        }
        steps[stepIndex] = { ...step, attackRoll: fill };
        continue;
      }
      if (step.damageRoll !== undefined) {
        return {
          tag: "invalid",
          message: "Chained spell damage roll was filled twice for one step.",
        };
      }
      steps[stepIndex] = { ...step, damageRoll: fill };
      continue;
    }
    if (fill.kind === "concentrationSavingThrow") {
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
      concentrationSavingThrows.push(fill);
      continue;
    }
    if (fill.kind === "attackDamageDisposition") {
      if (
        damageDispositions.some((candidate) => candidate.holeId === fill.holeId)
      ) {
        return {
          tag: "invalid",
          message: "Damage disposition was filled twice.",
        };
      }
      damageDispositions.push(fill);
      continue;
    }
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the chained spell replay holes.`,
    };
  }

  return {
    tag: "ok",
    damageType,
    steps,
    concentrationSavingThrows,
    damageDispositions,
  };
}

export function chainedSpellStepIndexForFill(
  fill: Extract<
    BattleFill,
    { readonly kind: "targetChoice" | "attackRoll" | "rolledDice" }
  >,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
): number | null {
  for (
    let stepIndex = 0;
    stepIndex <= Number(invocation.resource.slotLevel);
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
        step.damageRoll === undefined,
    );
}

export function validateChainedSpellFollowUpFills(input: {
  readonly concentrationHoles: readonly BattleConcentrationSavingThrowHole[];
  readonly concentrationFills: readonly Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
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
  if (
    input.concentrationFills.some(
      (fill) => !concentrationHoleIds.has(fill.holeId),
    )
  ) {
    return "Concentration Saving Throw fill is only valid for a concentrating damaged target.";
  }
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
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  damageType: DamageType,
  step: { readonly stepIndex: number; readonly critical: boolean },
): string | null {
  if (
    fill.holeId !==
    chainedSpellDamageRollHole(invocation, damageType, step).holeId
  ) {
    return step.critical
      ? "Critical hit chained spell damage must use the critical step damage hole."
      : "Chained spell damage must use the selected step damage hole.";
  }
  const validation = validateRolledDiceForDiceExpr(fill.value, {
    dice: invocation.damage.expr.dice * (step.critical ? 2 : 1),
    dieSize: invocation.damage.expr.dieSize,
  });
  return validation?.reason ?? null;
}

export function chainedSpellDamageAmountForTarget(
  target: BattleCreatureState,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  damageType: DamageType,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): number {
  const diceTotal = damageRoll.value.reduce(
    (total, group) =>
      total +
      group.results.reduce(
        (groupTotal, dieResult) => groupTotal + Number(dieResult),
        0,
      ),
    0,
  );
  return damageAmountAfterTargetAdjustments(
    target,
    diceTotal + (invocation.damage.expr.flat ?? 0),
    damageType,
  );
}

export function applyChainedSpellDamage(
  state: BattleState,
  targetId: CombatantId,
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "chainedSpellAttackDamage" }
  >,
  damageType: DamageType,
  damageRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
  critical: boolean,
  concentrationSavingThrow:
    | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
    | undefined,
  damageDisposition: BattleAttackDamageDisposition,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const damaged = applyHpDamage(
    target,
    chainedSpellDamageAmountForTarget(
      target,
      invocation,
      damageType,
      damageRoll,
    ),
    { deathFailuresAtZeroHp: critical ? 2 : 1, damageDisposition },
  );
  const nextState = {
    ...state,
    combatants: new Map(state.combatants).set(targetId, damaged),
  };
  const afterMarkDrop = markMarkedDamageRiderTransferAvailable(
    nextState,
    targetId,
    target.hp,
    damaged.hp,
  );
  return concentrationSavingThrow?.value.succeeded === false ||
    (target.concentration !== null && damaged.concentration === null)
    ? breakBattleConcentrationAfterDamage({
        state: afterMarkDrop,
        combatantId: targetId,
        priorConcentration: target.concentration,
      })
    : afterMarkDrop;
}

export function resolveBonusActionSpellAct(
  input: BonusActionSpellBattleResolutionInput,
): BattleResolutionResult {
  const subject = input.subject;
  const actor = input.state.combatants.get(subject.actorId);
  const invocation =
    actor?.origin.kind === "character"
      ? supportedSpellActs(actor).find((candidate) =>
          supportedSpellInvocationMatchesRef(candidate, subject.invocation),
        )
      : undefined;
  if (actor?.origin.kind !== "character" || invocation == null) {
    return invalidResult(
      input.state,
      "unsupportedActOption",
      "Bonus Action spell act requires a supported Bonus Action spell.",
    );
  }
  if (invocation.procedure === "heldLight") {
    if (invocation.actionCost !== "bonusAction") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Bonus Action spell subject requires a supported Bonus Action spell act.",
      );
    }
  } else if (invocation.procedure === "scalarBuff") {
    if (invocation.actionCost !== "bonusAction") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Bonus Action spell subject requires a supported Bonus Action spell act.",
      );
    }
  } else if (invocation.procedure === "weaponDamageRider") {
    if (invocation.actionCost !== "bonusAction") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Bonus Action spell subject requires a supported Bonus Action spell act.",
      );
    }
  } else if (invocation.procedure === "markedDamageRider") {
    if (invocation.actionCost !== "bonusAction") {
      return invalidResult(
        input.state,
        "unsupportedSubject",
        "Bonus Action spell subject requires a supported Bonus Action spell act.",
      );
    }
  } else if (
    invocation.procedure !== "directHitPointRestoration" ||
    invocation.actionCost !== "bonusAction"
  ) {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Bonus Action spell subject requires a supported Bonus Action spell act.",
    );
  }
  if (!spellHasAvailableSpend(actor, invocation)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action spell act no longer has its required runtime spell resource.",
    );
  }
  if (
    !spellActTurnResourceAvailable(input.state.currentTurnResources, invocation)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  if (
    spellInvocationIsSpellcasting(invocation) &&
    activeOngoingFeaturesPreventSpellcasting(actor)
  ) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Bonus Action spell act is unavailable while an active ongoing feature prevents spellcasting.",
    );
  }

  const castingState =
    spellInvocationIsSpellcasting(invocation) &&
    spellRequiresVerbal(invocation.spell)
      ? revealHidden(input.state, subject.actorId)
      : input.state;
  const fillSet = spellFillSet(input.fills, invocation);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (invocation.procedure === "heldLight") {
    return resolveHeldLightSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "scalarBuff") {
    return resolveScalarBuffSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "weaponDamageRider") {
    return resolveWeaponDamageRiderSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "markedDamageRider") {
    return resolveMarkedDamageRiderSpellAct({
      input: { ...input, state: castingState },
      actorId: subject.actorId,
      invocation,
      fillSet,
    });
  }
  return resolvePreparedHealingSpellAct({
    input: { ...input, state: castingState },
    actorId: subject.actorId,
    invocation,
    fillSet,
  });
}

export function resolveHeldLightSpellAct(input: {
  readonly input: BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "heldLight" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Held light spells do not use target, roll, damage, or save fills.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: [input.actorId],
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    },
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const effected = applyHeldLightSpellEffect(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

export function resolveWeaponDamageRiderSpellAct(input: {
  readonly input: BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "weaponDamageRider" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.targetId !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Weapon damage rider spells do not use target, roll, damage, or save fills.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: [input.actorId],
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    },
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const actor = input.input.state.combatants.get(input.actorId);
  if (actor === undefined) {
    return invalidResult(
      input.input.state,
      "missingCombatant",
      "Bonus Action spell actor is not in this battle.",
    );
  }
  const activeEffects = [
    ...actor.activeEffects.filter(
      (effect) =>
        !(
          effect.kind === "spellWeaponDamageRider" &&
          effect.sourceSpellId === input.invocation.spell.id &&
          effect.sourceCombatantId === input.actorId
        ),
    ),
    input.invocation.activeEffect,
  ];
  const effected = {
    ...input.input.state,
    combatants: new Map(input.input.state.combatants).set(input.actorId, {
      ...actor,
      activeEffects,
    }),
  };
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

export function resolveMarkedDamageRiderSpellAct(input: {
  readonly input: BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "markedDamageRider" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.targetList !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Marked damage rider spells use one target fill.",
    );
  }
  if (input.fillSet.targetId === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellTargetHole(input.input.state, input.actorId, input.invocation),
    ]);
  }
  if (
    !spellTargetIsLegal(
      input.input.state,
      input.actorId,
      input.fillSet.targetId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Marked spell target must be a combatant within the selected spell's supported range.",
    );
  }
  if (input.invocation.action === "transfer") {
    const activeMark = activeMarkedDamageRiderEffect(
      input.input.state.combatants.get(input.actorId),
      input.invocation.spell.id,
    );
    if (activeMark === null || !activeMark.transferAvailable) {
      return invalidResult(
        input.input.state,
        "staleSubject",
        "Hunter's Mark can move only after the marked target drops to 0 Hit Points.",
      );
    }
  }
  if (input.invocation.action === "cast") {
    const spellCastReactionWindow = maybeOpenReactionWindow(
      input.input.state,
      {
        trigger: "spellCast",
        casterId: input.actorId,
        spellId: input.invocation.spell.id,
        targetIds: [input.fillSet.targetId],
        continuation: {
          kind: "replay",
          subject: input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (spellCastReactionWindow !== null) {
      return spellCastReactionWindow;
    }
  }

  const spent = spendActivationResource(
    input.input.state.currentTurnResources,
    {
      kind: "bonusAction",
    },
  );
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Bonus Action spell is no longer available for the current actor.",
    );
  }
  if (input.invocation.action === "transfer") {
    const nextState = applyMarkedDamageRiderSpellEffect(
      {
        ...input.input.state,
        currentTurnResources:
          clearPendingAttackRollMissToHitReplacementSelection(
            spent.right,
            input.actorId,
          ),
      },
      input.actorId,
      input.fillSet.targetId,
      input.invocation,
    );
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }
  const slotTurnResources = markSpellSlotExpendedThisTurn(spent.right);
  if (Either.isLeft(slotTurnResources)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const concentrationBase = breakBattleConcentration(
    input.input.state,
    input.actorId,
  );
  const slotted = expendSpellSlot(
    {
      ...concentrationBase,
      currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
        slotTurnResources.right,
        input.actorId,
      ),
    },
    input.actorId,
    input.invocation.resource.slotLevel,
  );
  const effected = applyMarkedDamageRiderSpellEffect(
    slotted,
    input.actorId,
    input.fillSet.targetId,
    input.invocation,
  );
  const nextState = startSpellEffectConcentration(
    effected,
    input.actorId,
    input.invocation,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolvePreparedHealingSpellAct(input: {
  readonly input:
    | ActionSpellBattleResolutionInput
    | BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "directHitPointRestoration" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Hit Point restoration spells use target fills and one healing roll.",
    );
  }
  const targetSelection = healingSpellTargetSelection(input);
  if (targetSelection.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetSelection.hole,
    ]);
  }
  if (targetSelection.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      targetSelection.message,
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: targetSelection.targetIds,
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    },
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  if (input.fillSet.healingRoll == null) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellHealingRollHole(input.invocation),
    ]);
  }
  const healingValidation = validateSpellHealingFill(
    input.fillSet.healingRoll,
    input.invocation,
  );
  if (healingValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", healingValidation);
  }
  const healingAmount = spellHealingAmount(
    input.invocation,
    input.fillSet.healingRoll,
  );
  const healed = targetSelection.targetIds.reduce((state, targetId) => {
    const target = state.combatants.get(targetId);
    return target === undefined
      ? state
      : {
          ...state,
          combatants: new Map(state.combatants).set(
            targetId,
            applyHpHealing(target, healingAmount),
          ),
        };
  }, input.input.state);
  const spent =
    input.invocation.actionCost === "bonusAction"
      ? spendActivationResource(healed.currentTurnResources, {
          kind: "bonusAction",
        })
      : spendAction(healed.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      input.invocation.actionCost === "bonusAction"
        ? "Bonus Action spell is no longer available for the current actor."
        : "Magic action is no longer available for the current actor.",
    );
  }
  const slotTurnResources = markSpellSlotExpendedThisTurn(spent.right);
  if (Either.isLeft(slotTurnResources)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const slotted = expendSpellSlot(
    healed,
    input.actorId,
    input.invocation.resource.slotLevel,
  );
  const nextState = {
    ...slotted,
    currentTurnResources: slotTurnResources.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveScalarBuffSpellAct(input: {
  readonly input:
    | ActionSpellBattleResolutionInput
    | BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "scalarBuff" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Scalar buff spells use target fills and optional scalar dice roll.",
    );
  }
  const targetSelection = scalarBuffSpellTargetSelection(input);
  if (targetSelection.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetSelection.hole,
    ]);
  }
  if (targetSelection.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      targetSelection.message,
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: targetSelection.targetIds,
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    },
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  if (
    input.invocation.effect.kind === "temporaryHitPoints" &&
    input.fillSet.healingRoll == null
  ) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellScalarBuffRollHole(input.invocation),
    ]);
  }
  if (
    input.invocation.effect.kind === "temporaryHitPoints" &&
    input.fillSet.healingRoll !== undefined
  ) {
    const validation = validateScalarBuffTemporaryHitPointsFill(
      input.fillSet.healingRoll,
      input.invocation,
    );
    if (validation !== null) {
      return invalidResult(input.input.state, "invalidFill", validation);
    }
  }

  const concentrationBase = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.input.state, input.actorId)
    : input.input.state;
  const effected = applyScalarBuffSpellEffect(
    concentrationBase,
    input.actorId,
    targetSelection.targetIds,
    input.invocation,
    input.fillSet.healingRoll,
  );
  const spent =
    input.invocation.actionCost === "bonusAction"
      ? spendActivationResource(effected.currentTurnResources, {
          kind: "bonusAction",
        })
      : spendAction(effected.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      input.invocation.actionCost === "bonusAction"
        ? "Bonus Action spell is no longer available for the current actor."
        : "Magic action is no longer available for the current actor.",
    );
  }
  const slotTurnResources = markSpellSlotExpendedThisTurn(spent.right);
  if (Either.isLeft(slotTurnResources)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const slotted = expendSpellSlot(
    effected,
    input.actorId,
    input.invocation.resource.slotLevel,
  );
  const resourced = {
    ...slotted,
    currentTurnResources: slotTurnResources.right,
  };
  const nextState = spellRequiresConcentration(input.invocation)
    ? startSpellEffectConcentration(resourced, input.actorId, input.invocation)
    : resourced;
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveRollModifierSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "rollModifier" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Roll modifier spells use target, optional skill, and optional Saving Throw fills.",
    );
  }

  const targetSelection = rollModifierSpellTargetSelection(input);
  if (targetSelection.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetSelection.hole,
    ]);
  }
  if (targetSelection.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      targetSelection.message,
    );
  }

  const skillSelection = rollModifierSpellSkillSelection(input);
  if (skillSelection.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      skillSelection.hole,
    ]);
  }
  if (skillSelection.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      skillSelection.message,
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: targetSelection.targetIds,
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    },
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const affectedTargets = rollModifierSpellAffectedTargets(input);
  if (affectedTargets.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      affectedTargets.hole,
    ]);
  }
  if (affectedTargets.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      affectedTargets.message,
    );
  }

  const concentrationBase = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.input.state, input.actorId)
    : input.input.state;
  const effected = applyRollModifierSpellEffect(
    concentrationBase,
    input.actorId,
    affectedTargets.targetIds,
    input.invocation,
    skillSelection.skill,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

export function resolveCreatureTypeProtectionSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "creatureTypeProtection" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Creature-type protection spells use one target fill.",
    );
  }

  const targetSelection = creatureTypeProtectionSpellTargetSelection(input);
  if (targetSelection.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetSelection.hole,
    ]);
  }
  if (targetSelection.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      targetSelection.message,
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: targetSelection.targetIds,
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    },
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const concentrationBase = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.input.state, input.actorId)
    : input.input.state;
  const effected = applyCreatureTypeProtectionSpellEffect(
    concentrationBase,
    input.actorId,
    targetSelection.targetIds,
    input.invocation,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

export function resolveDamageReductionSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "damageReduction" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Damage-reduction spells use one target fill and one damage type choice.",
    );
  }

  const targetHole = spellTargetHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (input.fillSet.targetId === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetHole,
    ]);
  }
  if (
    !spellTargetIsLegal(
      input.input.state,
      input.actorId,
      input.fillSet.targetId,
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
  if (input.fillSet.damageTypeChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageTypeChoiceHole(input.invocation),
    ]);
  }
  if (
    !input.invocation.damageTypeChoices.includes(
      input.fillSet.damageTypeChoice.value,
    )
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Damage-reduction spell damage type must be one of the selected spell's choices.",
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: [input.fillSet.targetId],
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    },
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const concentrationBase = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.input.state, input.actorId)
    : input.input.state;
  const effected = applyDamageReductionSpellEffect(
    concentrationBase,
    input.actorId,
    input.fillSet.targetId,
    input.fillSet.damageTypeChoice.value,
    input.invocation,
  );
  const resourced = spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  return resourced.tag === "invalid"
    ? resourced
    : {
        tag: "resolved",
        state: resourced.state,
        snapshot: snapshotBattle(resourced.state),
      };
}

export type HealingSpellTargetSelection =
  | { readonly tag: "ok"; readonly targetIds: readonly CombatantId[] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

export function healingSpellTargetSelection(input: {
  readonly input:
    | ActionSpellBattleResolutionInput
    | BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "directHitPointRestoration" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): HealingSpellTargetSelection {
  if (input.invocation.targeting.maxTargets === 1) {
    if (input.fillSet.targetList !== undefined) {
      return {
        tag: "invalid",
        message: "Single-target healing spells use one target fill.",
      };
    }
    if (input.fillSet.targetId == null) {
      return {
        tag: "needsHoles",
        hole: spellTargetHole(
          input.input.state,
          input.actorId,
          input.invocation,
        ),
      };
    }
    const target = input.input.state.combatants.get(input.fillSet.targetId);
    if (
      target == null ||
      !spellTargetIsLegal(
        input.input.state,
        input.actorId,
        target.combatantId,
        input.invocation,
        input.fillSet.targetSpatialFacts,
      )
    ) {
      return {
        tag: "invalid",
        message:
          "Spell target must be a combatant within the selected spell's supported range.",
      };
    }
    return { tag: "ok", targetIds: [target.combatantId] };
  }

  if (input.fillSet.targetId !== undefined) {
    return {
      tag: "invalid",
      message: "Multi-target healing spells use a target-list fill.",
    };
  }
  if (input.fillSet.targetList === undefined) {
    return {
      tag: "needsHoles",
      hole: spellTargetListHole(
        input.input.state,
        input.actorId,
        input.invocation,
      ),
    };
  }
  const validation = validateSpellTargetList(
    input.input.state,
    input.actorId,
    input.invocation,
    input.fillSet.targetList.targetIds,
    input.fillSet.targetList.spatialFacts,
  );
  return validation === null
    ? { tag: "ok", targetIds: input.fillSet.targetList.targetIds }
    : { tag: "invalid", message: validation };
}

export type ScalarBuffSpellTargetSelection =
  | { readonly tag: "ok"; readonly targetIds: readonly CombatantId[] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

export function scalarBuffSpellTargetSelection(input: {
  readonly input:
    | ActionSpellBattleResolutionInput
    | BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "scalarBuff" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): ScalarBuffSpellTargetSelection {
  if (input.invocation.targeting.kind === "self") {
    return input.fillSet.targetId !== undefined ||
      input.fillSet.targetList !== undefined
      ? {
          tag: "invalid",
          message:
            "Self-targeting scalar buff spells do not accept target fills.",
        }
      : { tag: "ok", targetIds: [input.actorId] };
  }
  if (!isScalarBuffTargetListInvocation(input.invocation)) {
    return {
      tag: "invalid",
      message: "Scalar buff spell target shape is unsupported.",
    };
  }

  if (input.invocation.targeting.maxTargets === 1) {
    if (input.fillSet.targetList !== undefined) {
      return {
        tag: "invalid",
        message: "Single-target scalar buff spells require one target choice.",
      };
    }
    if (input.fillSet.targetId === undefined) {
      return {
        tag: "needsHoles",
        hole: spellTargetHole(
          input.input.state,
          input.actorId,
          input.invocation,
        ),
      };
    }
    return spellTargetIsLegal(
      input.input.state,
      input.actorId,
      input.fillSet.targetId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    )
      ? { tag: "ok", targetIds: [input.fillSet.targetId] }
      : {
          tag: "invalid",
          message:
            "Scalar buff spell target must be a combatant within the selected spell's supported range.",
        };
  }

  if (input.fillSet.targetId !== undefined) {
    return {
      tag: "invalid",
      message: "Multi-target scalar buff spells require a target list.",
    };
  }
  if (input.fillSet.targetList === undefined) {
    return {
      tag: "needsHoles",
      hole: spellTargetListHole(
        input.input.state,
        input.actorId,
        input.invocation,
      ),
    };
  }
  const validation = validateSpellTargetList(
    input.input.state,
    input.actorId,
    input.invocation,
    input.fillSet.targetList.targetIds,
    input.fillSet.targetList.spatialFacts,
  );
  return validation === null
    ? { tag: "ok", targetIds: input.fillSet.targetList.targetIds }
    : { tag: "invalid", message: validation };
}

export type RollModifierSpellTargetSelection =
  | { readonly tag: "ok"; readonly targetIds: readonly CombatantId[] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

export type ConditionImmunityAndTurnStartTemporaryHitPointsSpellTargetSelection =
  | { readonly tag: "ok"; readonly targetIds: readonly CombatantId[] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

export function conditionImmunityAndTurnStartTemporaryHitPointsSpellTargetSelection(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "conditionImmunityAndTurnStartTemporaryHitPoints" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): ConditionImmunityAndTurnStartTemporaryHitPointsSpellTargetSelection {
  if (input.invocation.targeting.maxTargets === 1) {
    if (input.fillSet.targetList !== undefined) {
      return {
        tag: "invalid",
        message: "Single-target Heroism requires one target choice.",
      };
    }
    if (input.fillSet.targetId === undefined) {
      return {
        tag: "needsHoles",
        hole: spellTargetHole(
          input.input.state,
          input.actorId,
          input.invocation,
        ),
      };
    }
    return spellTargetIsLegal(
      input.input.state,
      input.actorId,
      input.fillSet.targetId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    )
      ? { tag: "ok", targetIds: [input.fillSet.targetId] }
      : {
          tag: "invalid",
          message:
            "Heroism target must be a combatant within the selected spell's supported range.",
        };
  }

  if (input.fillSet.targetId !== undefined) {
    return {
      tag: "invalid",
      message: "Multi-target Heroism requires a target list.",
    };
  }
  if (input.fillSet.targetList === undefined) {
    return {
      tag: "needsHoles",
      hole: spellTargetListHole(
        input.input.state,
        input.actorId,
        input.invocation,
      ),
    };
  }
  const validation = validateSpellTargetList(
    input.input.state,
    input.actorId,
    input.invocation,
    input.fillSet.targetList.targetIds,
    input.fillSet.targetList.spatialFacts,
  );
  return validation === null
    ? { tag: "ok", targetIds: input.fillSet.targetList.targetIds }
    : { tag: "invalid", message: validation };
}

export function rollModifierSpellTargetSelection(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "rollModifier" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): RollModifierSpellTargetSelection {
  if (input.invocation.targeting.maxTargets === 1) {
    if (input.fillSet.targetList !== undefined) {
      return {
        tag: "invalid",
        message:
          "Single-target roll modifier spells require one target choice.",
      };
    }
    if (input.fillSet.targetId === undefined) {
      return {
        tag: "needsHoles",
        hole: spellTargetHole(
          input.input.state,
          input.actorId,
          input.invocation,
        ),
      };
    }
    return spellTargetIsLegal(
      input.input.state,
      input.actorId,
      input.fillSet.targetId,
      input.invocation,
      input.fillSet.targetSpatialFacts,
    )
      ? { tag: "ok", targetIds: [input.fillSet.targetId] }
      : {
          tag: "invalid",
          message:
            "Roll modifier spell target must be a combatant within the selected spell's supported range.",
        };
  }

  if (input.fillSet.targetId !== undefined) {
    return {
      tag: "invalid",
      message: "Multi-target roll modifier spells require a target list.",
    };
  }
  if (input.fillSet.targetList === undefined) {
    return {
      tag: "needsHoles",
      hole: spellTargetListHole(
        input.input.state,
        input.actorId,
        input.invocation,
      ),
    };
  }
  const validation = validateSpellTargetList(
    input.input.state,
    input.actorId,
    input.invocation,
    input.fillSet.targetList.targetIds,
    input.fillSet.targetList.spatialFacts,
  );
  return validation === null
    ? { tag: "ok", targetIds: input.fillSet.targetList.targetIds }
    : { tag: "invalid", message: validation };
}

export type CreatureTypeProtectionSpellTargetSelection =
  | { readonly tag: "ok"; readonly targetIds: readonly [CombatantId] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

export function creatureTypeProtectionSpellTargetSelection(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "creatureTypeProtection" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): CreatureTypeProtectionSpellTargetSelection {
  if (input.fillSet.targetList !== undefined) {
    return {
      tag: "invalid",
      message: "Creature-type protection spells require one target choice.",
    };
  }
  if (input.fillSet.targetId === undefined) {
    return {
      tag: "needsHoles",
      hole: spellTargetHole(input.input.state, input.actorId, input.invocation),
    };
  }
  return spellTargetIsLegal(
    input.input.state,
    input.actorId,
    input.fillSet.targetId,
    input.invocation,
    input.fillSet.targetSpatialFacts,
  )
    ? { tag: "ok", targetIds: [input.fillSet.targetId] }
    : {
        tag: "invalid",
        message:
          "Creature-type protection spell target must be a combatant within the selected spell's supported range.",
      };
}

export type RollModifierSpellSkillSelection =
  | { readonly tag: "ok"; readonly skill: Skill | null }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

export function rollModifierSpellSkillSelection(input: {
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "rollModifier" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): RollModifierSpellSkillSelection {
  if (input.invocation.skillChoices === null) {
    return input.fillSet.skillChoice === undefined
      ? { tag: "ok", skill: input.invocation.effect.skill }
      : {
          tag: "invalid",
          message: "This roll modifier spell does not choose a skill.",
        };
  }
  if (input.fillSet.skillChoice === undefined) {
    return {
      tag: "needsHoles",
      hole: spellRollModifierSkillChoiceHole(input.invocation),
    };
  }
  return input.invocation.skillChoices.includes(input.fillSet.skillChoice)
    ? { tag: "ok", skill: input.fillSet.skillChoice }
    : {
        tag: "invalid",
        message:
          "Roll modifier spell skill choice is not legal for this spell.",
      };
}

export type RollModifierSpellAffectedTargets =
  | { readonly tag: "ok"; readonly targetIds: readonly CombatantId[] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

export function rollModifierSpellAffectedTargets(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "rollModifier" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): RollModifierSpellAffectedTargets {
  if (input.invocation.saveGate === null) {
    if (input.fillSet.savingThrowOutcomes !== undefined) {
      return {
        tag: "invalid",
        message: "Ungated roll modifier spells do not use Saving Throw fills.",
      };
    }
    const targetSelection = rollModifierSpellTargetSelection(input);
    return targetSelection.tag === "ok"
      ? { tag: "ok", targetIds: targetSelection.targetIds }
      : targetSelection;
  }

  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return { tag: "needsHoles", hole: savingThrowHole };
  }
  const validation = validateSavingThrowOutcomes(
    input.fillSet.savingThrowOutcomes,
    savingThrowHole,
    input.input.state,
    input.actorId,
    undefined,
  );
  if (validation !== null) {
    return { tag: "invalid", message: validation };
  }
  const targetSelection = rollModifierSpellTargetSelection(input);
  if (targetSelection.tag !== "ok") {
    return targetSelection;
  }
  const outcomeTargetIds = input.fillSet.savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  if (!sameCombatantIdSet(targetSelection.targetIds, outcomeTargetIds)) {
    return {
      tag: "invalid",
      message:
        "Save-gated roll modifier spell Saving Throw outcomes must match the selected targets.",
    };
  }
  return {
    tag: "ok",
    targetIds: input.fillSet.savingThrowOutcomes.outcomes.flatMap((outcome) =>
      outcome.succeeded ? [] : [outcome.targetId],
    ),
  };
}

export function resolveConditionImmunityAndTurnStartTemporaryHitPointsSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "conditionImmunityAndTurnStartTemporaryHitPoints" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Heroism uses target fills only.",
    );
  }
  const targetSelection =
    conditionImmunityAndTurnStartTemporaryHitPointsSpellTargetSelection(input);
  if (targetSelection.tag === "needsHoles") {
    return needsHolesResult(input.input.state, input.input.subject, [
      targetSelection.hole,
    ]);
  }
  if (targetSelection.tag === "invalid") {
    return invalidResult(
      input.input.state,
      "invalidFill",
      targetSelection.message,
    );
  }

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: targetSelection.targetIds,
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    },
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const concentrationBase = breakBattleConcentration(
    input.input.state,
    input.actorId,
  );
  const effected = applyConditionImmunityAndTurnStartTemporaryHitPointsEffects(
    concentrationBase,
    input.actorId,
    targetSelection.targetIds,
    input.invocation,
  );
  const spent = spendAction(effected.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  const slotTurnResources = markSpellSlotExpendedThisTurn(spent.right);
  if (Either.isLeft(slotTurnResources)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const slotted = expendSpellSlot(
    effected,
    input.actorId,
    input.invocation.resource.slotLevel,
  );
  const resourced = {
    ...slotted,
    currentTurnResources: slotTurnResources.right,
  };
  const nextState = startSpellEffectConcentration(
    resourced,
    input.actorId,
    input.invocation,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveReadySpellAct(
  input: ActionSpellBattleResolutionInput,
  invocation: ReadiedSpellInvocation,
): BattleResolutionResult {
  if (input.fills.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Ready Spell does not accept release-time fills.",
    );
  }
  if (input.state.readiedSpells.has(input.subject.actorId)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This caster is already holding a readied spell.",
    );
  }
  if (input.subject.mode.tag !== "ready") {
    return invalidResult(
      input.state,
      "unsupportedSubject",
      "Ready Spell requires a selected Reaction trigger.",
    );
  }

  const afterPriorConcentration = breakBattleConcentration(
    input.state,
    input.subject.actorId,
  );
  const refreshedActor = afterPriorConcentration.combatants.get(
    input.subject.actorId,
  );
  if (refreshedActor?.origin.kind !== "character") {
    return invalidResult(
      input.state,
      "staleSubject",
      "Ready Spell caster is no longer available.",
    );
  }
  const concentratingActor = {
    ...refreshedActor,
    concentration: {
      sourceSpellId: invocation.spell.id,
      effectKind: "readiedSpell" as const,
    },
  };
  const withConcentration = {
    ...afterPriorConcentration,
    combatants: new Map(afterPriorConcentration.combatants).set(
      input.subject.actorId,
      concentratingActor,
    ),
    readiedSpells: new Map(afterPriorConcentration.readiedSpells).set(
      input.subject.actorId,
      {
        invocation,
        trigger: input.subject.mode.trigger,
        expiresAt: {
          kind: "startOfTurn" as const,
          combatantId: input.subject.actorId,
        },
      },
    ),
  };
  const spent = spendAction(withConcentration.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  const slotted =
    invocation.resource.tag === "spellSlot"
      ? expendSpellSlot(
          withConcentration,
          input.subject.actorId,
          invocation.resource.slotLevel,
        )
      : withConcentration;
  const nextTurnResources =
    invocation.resource.tag === "spellSlot"
      ? markSpellSlotExpendedThisTurn(spent.right)
      : Either.right(spent.right);
  if (Either.isLeft(nextTurnResources)) {
    return invalidResult(
      input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const nextState = {
    ...slotted,
    currentTurnResources: nextTurnResources.right,
  };
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveSpellRelease(
  input: ActionSpellBattleResolutionInput,
  invocation: ReadiedSpellInvocation,
): BattleResolutionResult {
  if (invocation.procedure === "chainedSpellAttackDamage") {
    return resolveChainedSpellAttackDamageAct({
      input,
      actorId: input.subject.actorId,
      invocation,
      opensSpellCastReactionWindow: false,
      spendsCastResources: false,
    });
  }
  const fillSet = spellFillSet(input.fills, invocation);
  if (fillSet.tag === "invalid") {
    return invalidResult(input.state, "invalidFill", fillSet.message);
  }
  if (invocation.procedure === "saveGatedDamage") {
    return resolveSaveGateDamageSpellRelease({
      input,
      actorId: input.subject.actorId,
      invocation,
      fillSet,
    });
  }
  if (invocation.procedure === "repeatedDamageAllocation") {
    return resolvePreparedSlotSpellRelease({
      input,
      actorId: input.subject.actorId,
      invocation,
      fillSet,
    });
  }

  if (fillSet.targetId == null) {
    return needsHolesResult(input.state, input.subject, [
      spellTargetHole(input.state, input.subject.actorId, invocation),
    ]);
  }
  const target = input.state.combatants.get(fillSet.targetId);
  if (
    target == null ||
    !spellTargetIsLegal(
      input.state,
      input.subject.actorId,
      target.combatantId,
      invocation,
      fillSet.targetSpatialFacts,
    )
  ) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Readied spell target must be a combatant within the selected spell's supported range.",
    );
  }
  let spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [];
  if (invocation.procedure === "spellAttackDamage") {
    const requiredRollMode = requiredAttackRollMode(
      input.state,
      input.subject.actorId,
      target.combatantId,
    );
    if (fillSet.attackRoll == null) {
      return needsHolesResult(input.state, input.subject, [
        spellAttackRollHole(
          input.state,
          input.subject.actorId,
          invocation,
          requiredRollMode,
        ),
      ]);
    }
    if (!attackRollResultIsValid(fillSet.attackRoll)) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell attack roll result is outside the d20 attack-roll protocol.",
      );
    }
    if (!attackRollModeMatches(fillSet.attackRoll, requiredRollMode)) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Readied spell attack roll mode does not match the current attack-roll rule.",
      );
    }
    const ordinaryHit = attackRollHits(
      fillSet.attackRoll,
      currentArmorClass(activeEffectArmorClass(target)),
    );
    const missToHitReplacement = selectedAttackRollMissToHitReplacement({
      state: input.state,
      subject: input.subject,
      attackerId: input.subject.actorId,
      targetId: target.combatantId,
      attackRoll: fillSet.attackRoll,
      ordinaryHit,
    });
    if (
      fillSet.attackRoll.missToHitReplacementUnitId !== undefined &&
      missToHitReplacement === null
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        ordinaryHit
          ? "Attack-roll miss-to-hit replacement can only be selected after a miss."
          : "Attack-roll miss-to-hit replacement is not available for this spell attack roll.",
      );
    }
    const releaseAttackRolledState = recordAttackRollMissToHitReplacementUsed(
      consumeHelpAttackForAttackRoll(
        recordAttackRollOngoingFeatures(
          input.state,
          input.subject.actorId,
          target.combatantId,
          null,
        ),
        input.subject.actorId,
        target.combatantId,
      ),
      input.subject.actorId,
      missToHitReplacement,
      {
        subject: input.subject,
        targetId: target.combatantId,
        attackRoll: fillSet.attackRoll,
      },
    );
    const hit = ordinaryHit || missToHitReplacement !== null;
    const critical = attackRollIsCriticalHit(fillSet.attackRoll);
    spellMarkedDamageRiders = hit
      ? activeMarkedDamageRiders(
          releaseAttackRolledState.combatants.get(input.subject.actorId),
          target.combatantId,
        )
      : [];
    if (hit && fillSet.damageRoll == null) {
      return needsHolesResult(releaseAttackRolledState, input.subject, [
        spellDamageHole(invocation, critical, spellMarkedDamageRiders),
      ]);
    }
    if (
      !hit &&
      (fillSet.damageRoll != null || fillSet.damageDispositions.length > 0)
    ) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Spell damage can only be filled after a hit.",
      );
    }
    if (!hit) {
      return {
        tag: "resolved",
        state: releaseAttackRolledState,
        snapshot: snapshotBattle(releaseAttackRolledState),
      };
    }
  } else if (fillSet.attackRoll != null) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Magic Missile does not use an attack roll.",
    );
  }

  if (fillSet.damageRoll == null) {
    return needsHolesResult(input.state, input.subject, [
      spellDamageHole(invocation),
    ]);
  }
  const critical =
    invocation.procedure === "spellAttackDamage" &&
    fillSet.attackRoll != null &&
    attackRollIsCriticalHit(fillSet.attackRoll);
  const damageValidation = validateSpellDamageFill(
    fillSet.damageRoll,
    invocation,
    critical,
    spellMarkedDamageRiders,
  );
  if (damageValidation !== null) {
    return invalidResult(input.state, "invalidFill", damageValidation);
  }
  const spellDamageAmount = spellDamageAmountForTarget(
    target,
    invocation,
    fillSet.damageRoll,
    "full",
    spellMarkedDamageRiders,
    critical,
  );
  const concentrationSave = concentrationSavingThrowHole(
    target,
    spellDamageAmount,
  );
  const concentrationFill =
    concentrationSave === null
      ? undefined
      : concentrationSavingThrowFillFor(
          fillSet.concentrationSavingThrows,
          concentrationSave,
        );
  if (concentrationSave !== null) {
    if (concentrationFill === undefined) {
      return needsHolesResult(input.state, input.subject, [concentrationSave]);
    }
    if (fillSet.concentrationSavingThrows.length > 1) {
      return invalidResult(
        input.state,
        "invalidFill",
        "Readied spell damage accepts one Concentration Saving Throw fill for the damaged target.",
      );
    }
  } else if (fillSet.concentrationSavingThrows.length > 0) {
    return invalidResult(
      input.state,
      "invalidFill",
      "Concentration Saving Throw fill is only valid for a concentrating damaged target.",
    );
  }
  const damageDispositionHole = zeroHitPointReplacementDispositionHole({
    damageSourceId: input.subject.actorId,
    target,
    damageAmount: spellDamageAmount,
  });
  const damageDispositionValidation = damageDispositionFillsValidation({
    holes: damageDispositionHole === null ? [] : [damageDispositionHole],
    fills: fillSet.damageDispositions,
  });
  if (damageDispositionValidation !== null) {
    return invalidResult(
      input.state,
      "invalidFill",
      damageDispositionValidation,
    );
  }
  if (
    damageDispositionHole !== null &&
    damageDispositionFillFor(
      fillSet.damageDispositions,
      damageDispositionHole,
    ) === undefined
  ) {
    return needsHolesResult(input.state, input.subject, [
      damageDispositionHole,
    ]);
  }
  const releaseResolutionState =
    invocation.procedure === "spellAttackDamage" && fillSet.attackRoll != null
      ? recordAttackRollMissToHitReplacementUsed(
          consumeHelpAttackForAttackRoll(
            recordAttackRollOngoingFeatures(
              input.state,
              input.subject.actorId,
              target.combatantId,
              null,
            ),
            input.subject.actorId,
            target.combatantId,
          ),
          input.subject.actorId,
          selectedAttackRollMissToHitReplacement({
            state: input.state,
            subject: input.subject,
            attackerId: input.subject.actorId,
            targetId: target.combatantId,
            attackRoll: fillSet.attackRoll,
            ordinaryHit: attackRollHits(
              fillSet.attackRoll,
              currentArmorClass(activeEffectArmorClass(target)),
            ),
          }),
          {
            subject: input.subject,
            targetId: target.combatantId,
            attackRoll: fillSet.attackRoll,
          },
        )
      : input.state;
  const damaged = applySpellDamage(
    releaseResolutionState,
    target.combatantId,
    invocation,
    fillSet.damageRoll,
    critical,
    concentrationFill,
    "full",
    damageDispositionForTarget(
      damageDispositionHole === null ? [] : [damageDispositionHole],
      fillSet.damageDispositions,
      target.combatantId,
    ),
    spellMarkedDamageRiders,
  );
  const effected = applySpellActiveEffects(
    damaged,
    input.subject.actorId,
    target.combatantId,
    invocation,
  );
  const resolvedState = {
    ...effected,
    currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
      effected.currentTurnResources,
      input.subject.actorId,
    ),
  };
  return {
    tag: "resolved",
    state: resolvedState,
    snapshot: snapshotBattle(resolvedState),
  };
}

export function resolveSaveGateDamageSpellRelease(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  const beforeSpend = resolveSaveGateDamageSpellAct(input);
  if (beforeSpend.tag !== "resolved") {
    return beforeSpend;
  }
  return {
    tag: "resolved",
    state: {
      ...beforeSpend.state,
      currentTurnResources: input.input.state.currentTurnResources,
    },
    snapshot: snapshotBattle({
      ...beforeSpend.state,
      currentTurnResources: input.input.state.currentTurnResources,
    }),
  };
}

export type SpellFillSet =
  | {
      readonly tag: "ok";
      readonly targetId: CombatantId | undefined;
      readonly targetSpatialFacts: readonly BattleTargetSpatialFact[];
      readonly targetAllocation:
        | {
            readonly allocations: readonly BattleSpellTargetAllocation[];
            readonly spatialFacts: readonly Extract<
              BattleTargetSpatialFact,
              { readonly kind: "spellTarget" }
            >[];
          }
        | undefined;
      readonly targetList:
        | {
            readonly targetIds: readonly CombatantId[];
            readonly spatialFacts: readonly BattleSpellTargetListSpatialFact[];
          }
        | undefined;
      readonly attackRoll: BattleAttackRollResult | undefined;
      readonly savingThrowOutcomes:
        | BattleSpellSavingThrowOutcomeValue
        | undefined;
      readonly skillChoice: Skill | undefined;
      readonly damageTypeChoice:
        | Extract<BattleFill, { readonly kind: "damageTypeChoice" }>
        | undefined;
      readonly concentrationSavingThrows: readonly Extract<
        BattleFill,
        { readonly kind: "concentrationSavingThrow" }
      >[];
      readonly damageDispositions: readonly Extract<
        BattleFill,
        { readonly kind: "attackDamageDisposition" }
      >[];
      readonly damageRoll:
        | Extract<BattleFill, { readonly kind: "rolledDice" }>
        | undefined;
      readonly spellDamageReductionRolls: readonly Extract<
        BattleFill,
        { readonly kind: "rolledDice" }
      >[];
      readonly attackBurstDamageRoll:
        | Extract<BattleFill, { readonly kind: "rolledDice" }>
        | undefined;
      readonly healingRoll:
        | Extract<BattleFill, { readonly kind: "rolledDice" }>
        | undefined;
    }
  | { readonly tag: "invalid"; readonly message: string };

export function spellFillSet(
  fills: readonly BattleFill[],
  invocation: SupportedSpellInvocation,
): SpellFillSet {
  let targetId: CombatantId | undefined;
  let targetSpatialFacts: readonly BattleTargetSpatialFact[] = [];
  let targetAllocation:
    | {
        readonly allocations: readonly BattleSpellTargetAllocation[];
        readonly spatialFacts: readonly Extract<
          BattleTargetSpatialFact,
          { readonly kind: "spellTarget" }
        >[];
      }
    | undefined;
  let targetList:
    | {
        readonly targetIds: readonly CombatantId[];
        readonly spatialFacts: readonly BattleSpellTargetListSpatialFact[];
      }
    | undefined;
  let attackRoll: AttackRollResult | undefined;
  let savingThrowOutcomes: BattleSpellSavingThrowOutcomeValue | undefined;
  let skillChoice: Skill | undefined;
  let damageTypeChoice:
    | Extract<BattleFill, { readonly kind: "damageTypeChoice" }>
    | undefined;
  const concentrationSavingThrows: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[] = [];
  const damageDispositions: Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >[] = [];
  let damageRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  const spellDamageReductionRolls: Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >[] = [];
  let attackBurstDamageRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  let healingRoll:
    | Extract<BattleFill, { readonly kind: "rolledDice" }>
    | undefined;
  for (const fill of fills) {
    if (fill.kind === "targetChoice" && fill.holeId === ATTACK_TARGET_HOLE_ID) {
      if (targetId !== undefined) {
        return { tag: "invalid", message: "Spell target was filled twice." };
      }
      targetId = fill.value;
      targetSpatialFacts = fill.spatialFacts ?? [];
      continue;
    }

    if (fill.kind === "spellTargetAllocation") {
      if (invocation.procedure !== "repeatedDamageAllocation") {
        return {
          tag: "invalid",
          message: "Spell target allocation does not match this spell act.",
        };
      }
      if (fill.holeId !== spellTargetAllocationHoleId(invocation)) {
        return {
          tag: "invalid",
          message:
            "Spell target allocation must use the selected spell act allocation hole.",
        };
      }
      if (targetAllocation !== undefined) {
        return {
          tag: "invalid",
          message: "Spell target allocation was filled twice.",
        };
      }
      targetAllocation = {
        allocations: fill.value.allocations,
        spatialFacts: fill.spatialFacts,
      };
      continue;
    }

    if (fill.kind === "spellTargetList") {
      if (
        invocation.procedure !== "directHitPointRestoration" &&
        invocation.procedure !== "scalarBuff" &&
        invocation.procedure !== "rollModifier" &&
        invocation.procedure !== "damageReduction" &&
        invocation.procedure !== "saveGatedCondition" &&
        invocation.procedure !==
          "conditionImmunityAndTurnStartTemporaryHitPoints"
      ) {
        return {
          tag: "invalid",
          message: "Spell target list does not match this spell act.",
        };
      }
      if (
        (invocation.procedure === "scalarBuff" &&
          !isScalarBuffTargetListInvocation(invocation)) ||
        (invocation.procedure === "saveGatedCondition" &&
          !isTargetListSpellInvocation(invocation))
      ) {
        return {
          tag: "invalid",
          message: "Spell target list does not match this spell act.",
        };
      }
      if (fill.holeId !== spellTargetListHoleId(invocation)) {
        return {
          tag: "invalid",
          message:
            "Spell target list must use the selected spell act target-list hole.",
        };
      }
      if (targetList !== undefined) {
        return {
          tag: "invalid",
          message: "Spell target list was filled twice.",
        };
      }
      targetList = {
        targetIds: fill.value.targetIds,
        spatialFacts: fill.spatialFacts,
      };
      continue;
    }

    if (fill.kind === "attackRoll" && fill.holeId === ATTACK_ROLL_HOLE_ID) {
      if (attackRoll !== undefined) {
        return {
          tag: "invalid",
          message: "Spell attack roll was filled twice.",
        };
      }
      attackRoll = fill.value;
      continue;
    }

    if (fill.kind === "savingThrowOutcome") {
      if (
        invocation.procedure !== "attackBurstSaveDamage" &&
        invocation.procedure !== "saveGatedDamage" &&
        invocation.procedure !== "saveGatedCondition" &&
        invocation.procedure !== "saveGatedAttackRollAdvantage" &&
        !(
          invocation.procedure === "rollModifier" &&
          invocation.saveGate !== null
        )
      ) {
        return {
          tag: "invalid",
          message: "Spell saving throw outcomes do not match this spell act.",
        };
      }
      if (fill.holeId !== spellSavingThrowOutcomeHoleId(invocation)) {
        return {
          tag: "invalid",
          message:
            "Spell saving throw outcomes must use the selected spell act outcome hole.",
        };
      }
      if (savingThrowOutcomes !== undefined) {
        return {
          tag: "invalid",
          message: "Spell saving throw outcomes were filled twice.",
        };
      }
      if (
        invocation.procedure !== "rollModifier" &&
        spellFillSetSavingThrowTargeting(invocation).kind !==
          "singleCombatant" &&
        spellFillSetSavingThrowTargeting(invocation).kind !== "targetList" &&
        !("area" in fill.value)
      ) {
        return {
          tag: "invalid",
          message: "Spell saving throw outcomes require area facts.",
        };
      }
      if (
        invocation.procedure !== "rollModifier" &&
        spellFillSetSavingThrowTargeting(invocation).kind ===
          "singleCombatant" &&
        "area" in fill.value
      ) {
        return {
          tag: "invalid",
          message:
            "Single-target save-gate spell outcomes must not include area facts.",
        };
      }
      savingThrowOutcomes = fill.value;
      continue;
    }

    if (fill.kind === "skillChoice") {
      if (
        invocation.procedure !== "rollModifier" ||
        invocation.skillChoices === null
      ) {
        return {
          tag: "invalid",
          message: "Spell skill choice does not match this spell act.",
        };
      }
      if (fill.holeId !== spellRollModifierSkillChoiceHoleId(invocation)) {
        return {
          tag: "invalid",
          message:
            "Spell skill choice must use the selected spell act skill-choice hole.",
        };
      }
      if (skillChoice !== undefined) {
        return {
          tag: "invalid",
          message: "Spell skill choice was filled twice.",
        };
      }
      skillChoice = fill.value;
      continue;
    }

    if (fill.kind === "damageTypeChoice") {
      if (invocation.procedure !== "damageReduction") {
        return {
          tag: "invalid",
          message: "Spell damage type choice does not match this spell act.",
        };
      }
      if (fill.holeId !== spellDamageTypeChoiceHole(invocation).holeId) {
        return {
          tag: "invalid",
          message:
            "Spell damage type choice must use the selected spell act choice hole.",
        };
      }
      if (damageTypeChoice !== undefined) {
        return {
          tag: "invalid",
          message: "Spell damage type choice was filled twice.",
        };
      }
      damageTypeChoice = fill;
      continue;
    }

    if (fill.kind === "rolledDice") {
      if (isSpellDamageReductionRollFill(fill)) {
        if (
          spellDamageReductionRolls.some(
            (candidate) => candidate.holeId === fill.holeId,
          )
        ) {
          return {
            tag: "invalid",
            message: "Spell damage reduction roll was filled twice.",
          };
        }
        spellDamageReductionRolls.push(fill);
        continue;
      }
      if (
        invocation.procedure === "directHitPointRestoration" ||
        (invocation.procedure === "scalarBuff" &&
          invocation.effect.kind === "temporaryHitPoints")
      ) {
        if (healingRoll !== undefined) {
          return {
            tag: "invalid",
            message: "Spell scalar dice result was filled twice.",
          };
        }
        healingRoll = fill;
        continue;
      }
      if (invocation.procedure === "attackBurstSaveDamage") {
        const attackDamageHole = spellDamageHole(invocation, false);
        const criticalAttackDamageHole = spellDamageHole(invocation, true);
        const burstDamageHole = spellBurstDamageHole(invocation);
        if (
          fill.holeId === attackDamageHole.holeId ||
          fill.holeId === criticalAttackDamageHole.holeId
        ) {
          if (attackBurstDamageRoll !== undefined) {
            return {
              tag: "invalid",
              message: "Ice Knife attack damage was filled twice.",
            };
          }
          attackBurstDamageRoll = fill;
          continue;
        }
        if (fill.holeId === burstDamageHole.holeId) {
          if (damageRoll !== undefined) {
            return {
              tag: "invalid",
              message: "Ice Knife burst damage was filled twice.",
            };
          }
          damageRoll = fill;
          continue;
        }
        return {
          tag: "invalid",
          message: "Ice Knife damage must use an Ice Knife damage hole.",
        };
      }
      if (damageRoll !== undefined) {
        return { tag: "invalid", message: "Spell damage was filled twice." };
      }
      damageRoll = fill;
      continue;
    }

    if (fill.kind === "concentrationSavingThrow") {
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
      concentrationSavingThrows.push(fill);
      continue;
    }

    if (fill.kind === "attackDamageDisposition") {
      if (
        damageDispositions.some((candidate) => candidate.holeId === fill.holeId)
      ) {
        return {
          tag: "invalid",
          message: "Damage disposition was filled twice.",
        };
      }
      damageDispositions.push(fill);
      continue;
    }

    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the spell replay holes.`,
    };
  }

  return {
    tag: "ok",
    targetId,
    targetSpatialFacts,
    targetAllocation,
    targetList,
    attackRoll,
    savingThrowOutcomes,
    skillChoice,
    damageTypeChoice,
    concentrationSavingThrows,
    damageDispositions,
    damageRoll,
    spellDamageReductionRolls,
    attackBurstDamageRoll,
    healingRoll,
  };
}

export function spellFillSetSavingThrowTargeting(
  invocation: SupportedSpellInvocation,
): SpellTargeting {
  return invocation.procedure === "attackBurstSaveDamage"
    ? invocation.burst.targeting
    : invocation.procedure === "saveGatedDamage" ||
        invocation.procedure === "saveGatedCondition" ||
        invocation.procedure === "saveGatedAttackRollAdvantage"
      ? invocation.targeting
      : { kind: "singleCombatant" };
}

export function concentrationSavingThrowFillFor(
  fills: readonly Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[],
  hole: BattleConcentrationSavingThrowHole,
):
  | Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>
  | undefined {
  return fills.find((fill) => fill.holeId === hole.holeId);
}

export function resolvePreparedSlotSpellRelease(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "repeatedDamageAllocation" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  return resolvePreparedSlotSpellAct({
    ...input,
    opensSpellCastReactionWindow: false,
    spendsCastResources: false,
    opensAfterDamageReactionWindow: false,
  });
}

export function resolvePreparedSlotSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "repeatedDamageAllocation" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly opensSpellCastReactionWindow?: boolean;
  readonly spendsCastResources?: boolean;
  readonly opensAfterDamageReactionWindow?: boolean;
}): BattleResolutionResult {
  const allocationHole = spellTargetAllocationHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (input.fillSet.targetId !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Repeated-damage slot spells use spell target allocation fills, not a single-target fill.",
    );
  }
  if (input.fillSet.attackRoll !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      `${input.invocation.spell.name} does not use an attack roll.`,
    );
  }
  if (input.fillSet.targetAllocation === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      allocationHole,
    ]);
  }
  const allocationValidation = validateSpellTargetAllocation(
    input.input.state,
    input.actorId,
    input.invocation,
    input.fillSet.targetAllocation.allocations,
    input.fillSet.targetAllocation.spatialFacts,
  );
  if (allocationValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      allocationValidation,
    );
  }

  if (input.opensSpellCastReactionWindow !== false) {
    const spellCastReactionWindow = maybeOpenReactionWindow(
      input.input.state,
      {
        trigger: "spellCast",
        casterId: input.actorId,
        spellId: input.invocation.spell.id,
        targetIds: input.fillSet.targetAllocation.allocations.map(
          (allocation) => allocation.targetId,
        ),
        continuation: {
          kind: "replay",
          subject: input.input.subject,
          fills: input.input.fills,
        },
      },
      input.input.suppressedReactionTrigger,
    );
    if (spellCastReactionWindow !== null) {
      return spellCastReactionWindow;
    }
  }

  if (input.fillSet.damageRoll == null) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageHole(input.invocation),
    ]);
  }
  const damageValidation =
    validateSpellDamageFill(
      input.fillSet.damageRoll,
      input.invocation,
      false,
    ) ??
    validatePreparedSlotSpellDamageGroups(
      input.fillSet.damageRoll,
      input.fillSet.targetAllocation.allocations,
    );
  if (damageValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", damageValidation);
  }

  const concentrationSaves = input.fillSet.targetAllocation.allocations.flatMap(
    (allocation, allocationIndex) => {
      const target = input.input.state.combatants.get(allocation.targetId);
      if (target === undefined) {
        return [];
      }
      const damageAmount = repeatedDamageAllocationSpellDamageAmount(
        target,
        input.invocation,
        input.fillSet.damageRoll!,
        allocationIndex,
        allocation.count,
      );
      const hole = concentrationSavingThrowHole(target, damageAmount);
      return hole === null ? [] : [hole];
    },
  );
  const missingConcentrationSaves = concentrationSaves.filter(
    (concentrationSave) =>
      concentrationSavingThrowFillFor(
        input.fillSet.concentrationSavingThrows,
        concentrationSave,
      ) === undefined,
  );
  if (missingConcentrationSaves.length > 0) {
    return needsHolesResult(
      input.input.state,
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
  const damageDispositionHoles =
    input.fillSet.targetAllocation.allocations.flatMap(
      (allocation, allocationIndex) => {
        const target = input.input.state.combatants.get(allocation.targetId);
        if (target === undefined) {
          return [];
        }
        const damageAmount = repeatedDamageAllocationSpellDamageAmount(
          target,
          input.invocation,
          input.fillSet.damageRoll!,
          allocationIndex,
          allocation.count,
        );
        const hole = zeroHitPointReplacementDispositionHole({
          damageSourceId: input.actorId,
          target,
          damageAmount,
        });
        return hole === null ? [] : [hole];
      },
    );
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
  const missingDamageDispositionHoles = damageDispositionHoles.filter(
    (hole) =>
      damageDispositionFillFor(input.fillSet.damageDispositions, hole) ===
      undefined,
  );
  if (missingDamageDispositionHoles.length > 0) {
    return needsHolesResult(input.input.state, input.input.subject, [
      ...missingDamageDispositionHoles,
    ]);
  }

  const damaged = input.fillSet.targetAllocation.allocations.reduce(
    (state, allocation, allocationIndex) => {
      const target = state.combatants.get(allocation.targetId);
      if (target === undefined) {
        return state;
      }
      const damageAmount = repeatedDamageAllocationSpellDamageAmount(
        target,
        input.invocation,
        input.fillSet.damageRoll!,
        allocationIndex,
        allocation.count,
      );
      const concentrationSave = concentrationSavingThrowHole(
        target,
        damageAmount,
      );
      return applyPreparedSlotSpellDamage(
        state,
        allocation.targetId,
        damageAmount,
        concentrationSave === null
          ? undefined
          : concentrationSavingThrowFillFor(
              input.fillSet.concentrationSavingThrows,
              concentrationSave,
            ),
        damageDispositionForTarget(
          damageDispositionHoles,
          input.fillSet.damageDispositions,
          allocation.targetId,
        ),
      );
    },
    input.input.state,
  );
  if (input.spendsCastResources === false) {
    return {
      tag: "resolved",
      state: damaged,
      snapshot: snapshotBattle(damaged),
    };
  }

  const spent = spendAction(damaged.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Magic action is no longer available for the current actor.",
    );
  }
  const slotTurnResources = markSpellSlotExpendedThisTurn(spent.right);
  if (Either.isLeft(slotTurnResources)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const slotted = expendSpellSlot(
    damaged,
    input.actorId,
    input.invocation.resource.slotLevel,
  );
  const nextState = {
    ...slotted,
    currentTurnResources: slotTurnResources.right,
  };
  if (input.opensAfterDamageReactionWindow !== false) {
    const damageRoll = input.fillSet.damageRoll;
    const afterDamageEvents =
      input.fillSet.targetAllocation.allocations.flatMap(
        (allocation, allocationIndex): readonly BattleAfterDamageEvent[] => {
          const target = input.input.state.combatants.get(allocation.targetId);
          if (target === undefined) {
            return [];
          }
          const damageAmount = repeatedDamageAllocationSpellDamageAmount(
            target,
            input.invocation,
            damageRoll,
            allocationIndex,
            allocation.count,
          );
          return [
            {
              damageSourceId: input.actorId,
              damagedId: allocation.targetId,
              damageAmount: toDamageAmount(damageAmount),
            },
          ];
        },
      );
    const afterDamageReactionWindow = openAfterDamageSequenceReactionWindow({
      state: nextState,
      subject: input.input.subject,
      events: afterDamageEvents,
      suppressedReactionTrigger: input.input.suppressedReactionTrigger,
    });
    if (afterDamageReactionWindow.tag === "needsHoles") {
      return afterDamageReactionWindow;
    }
  }

  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveAttackBurstSaveDamageSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "attackBurstSaveDamage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
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

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    {
      trigger: "spellCast",
      casterId: input.actorId,
      spellId: input.invocation.spell.id,
      targetIds: [target.combatantId],
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    },
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const requiredRollMode = requiredAttackRollMode(
    input.input.state,
    input.actorId,
    target.combatantId,
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
  const spellMarkedDamageRiders = hit
    ? activeMarkedDamageRiders(
        attackRolledState.combatants.get(input.actorId),
        target.combatantId,
      )
    : [];

  if (hit && input.input.suppressedReactionTrigger !== "attackHit") {
    const reactionWindow = maybeOpenReactionWindow(
      attackRolledState,
      {
        trigger: "attackHit",
        attackerId: input.actorId,
        targetId: target.combatantId,
        attackRoll: input.fillSet.attackRoll,
        attackKind: spellAttackKindForRedirect(input.invocation.attackKind),
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

  if (hit && input.fillSet.attackBurstDamageRoll === undefined) {
    return needsHolesResult(attackRolledState, input.input.subject, [
      spellDamageHole(input.invocation, critical, spellMarkedDamageRiders),
    ]);
  }
  if (!hit && input.fillSet.attackBurstDamageRoll !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Ice Knife attack damage can only be filled after a hit.",
    );
  }
  if (hit && input.fillSet.attackBurstDamageRoll !== undefined) {
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

  const attackDamageAmount =
    hit && input.fillSet.attackBurstDamageRoll !== undefined
      ? spellDamageAmountForTarget(
          target,
          input.invocation,
          input.fillSet.attackBurstDamageRoll,
          "full",
          spellMarkedDamageRiders,
          critical,
        )
      : 0;
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
      attackRolledState,
      input.input.subject,
      missingAttackDamageDispositionHoles,
    );
  }

  const damagedByAttack =
    hit && input.fillSet.attackBurstDamageRoll !== undefined
      ? applySpellDamage(
          attackRolledState,
          target.combatantId,
          input.invocation,
          input.fillSet.attackBurstDamageRoll,
          critical,
          undefined,
          "full",
          damageDispositionForTarget(
            attackDamageDispositionHoles,
            input.fillSet.damageDispositions,
            target.combatantId,
          ),
          spellMarkedDamageRiders,
        )
      : attackRolledState;

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

  const burstDamageByTargetId = new Map(
    failedTargets.flatMap((targetId): readonly [CombatantId, number][] => {
      const burstTarget = damagedByAttack.combatants.get(targetId);
      return burstTarget === undefined || input.fillSet.damageRoll === undefined
        ? []
        : [
            [
              targetId,
              spellBurstDamageAmountForTarget(
                burstTarget,
                input.invocation,
                input.fillSet.damageRoll,
                "full",
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
        ? null
        : concentrationSavingThrowHole(damagedTarget, damageAmount);
    },
  ).flatMap((hole) => (hole === null ? [] : [hole]));
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

  const damagedByAttackWithConcentration =
    hit && input.fillSet.attackBurstDamageRoll !== undefined
      ? applySpellDamage(
          attackRolledState,
          target.combatantId,
          input.invocation,
          input.fillSet.attackBurstDamageRoll,
          critical,
          concentrationSaveByTargetId.get(target.combatantId),
          "full",
          damageDispositionForTarget(
            attackDamageDispositionHoles,
            input.fillSet.damageDispositions,
            target.combatantId,
          ),
          spellMarkedDamageRiders,
        )
      : attackRolledState;
  const damagedByBurst =
    input.fillSet.damageRoll === undefined
      ? damagedByAttackWithConcentration
      : failedTargets.reduce((state, targetId) => {
          const damageAmount = burstDamageByTargetId.get(targetId);
          return damageAmount === undefined
            ? state
            : applyPreparedSlotSpellDamage(
                state,
                targetId,
                damageAmount,
                concentrationSaveByTargetId.get(targetId),
                damageDispositionForTarget(
                  burstDamageDispositionHoles,
                  input.fillSet.damageDispositions,
                  targetId,
                ),
              );
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
            },
          ];
    }),
  ];
  const afterDamageReactionWindow = openAfterDamageSequenceReactionWindow({
    state: spentResources.state,
    subject: input.input.subject,
    events: afterDamageEvents,
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

export function resolveSaveGateDamageSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedDamage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (
    input.invocation.targeting.kind !== "singleCombatant" &&
    input.invocation.targeting.kind !== "targetList" &&
    input.fillSet.targetId !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate damage spells use saving throw outcome fills, not a single-target fill.",
    );
  }
  if (input.invocation.targeting.kind === "singleCombatant") {
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
  }
  if (input.fillSet.attackRoll !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate damage spells do not use an attack roll.",
    );
  }
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowOutcomes = input.fillSet.savingThrowOutcomes;

  const savingThrowValidation = validateSavingThrowOutcomes(
    savingThrowOutcomes,
    savingThrowHole,
    input.input.state,
    input.actorId,
    input.fillSet.targetId,
    input.fillSet.targetList?.targetIds,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }

  const selectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  const saveDamageResultByTargetId = new Map(
    savingThrowOutcomes.outcomes.map((outcome) => [
      outcome.targetId,
      saveGateDamageResultForOutcome(
        input.input.state,
        outcome.targetId,
        input.invocation,
        outcome.succeeded,
      ),
    ]),
  );
  const saveDamageResultForTarget = (targetId: CombatantId): SaveDamageResult =>
    saveDamageResultByTargetId.get(targetId) ?? "none";
  const damageTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    saveDamageResultForTarget(outcome.targetId) === "none"
      ? []
      : [outcome.targetId],
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.input.state,
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
  if (damageTargets.length === 0) {
    if (
      input.fillSet.damageRoll !== undefined ||
      input.fillSet.damageDispositions.length > 0
    ) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Save-gate spell damage can only be filled when at least one target takes damage.",
      );
    }
    const effected = applyFailedSaveSpellActiveEffects(
      input.input.state,
      input.actorId,
      failedTargets,
      input.invocation,
    );
    return spendSpellCastResources({
      state: extendSavingThrowOngoingFeatures(
        effected,
        input.actorId,
        selectedTargetIds,
      ),
      actorId: input.actorId,
      invocation: input.invocation,
      errorState: input.input.state,
    });
  }

  if (input.fillSet.damageRoll == null) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellDamageHole(input.invocation),
    ]);
  }
  const damageRoll = input.fillSet.damageRoll;
  const damageValidation = validateSpellDamageFill(
    damageRoll,
    input.invocation,
    false,
  );
  if (damageValidation !== null) {
    return invalidResult(input.input.state, "invalidFill", damageValidation);
  }

  const concentrationSaves = damageTargets.flatMap((targetId) => {
    const target = input.input.state.combatants.get(targetId);
    if (target === undefined) {
      return [];
    }
    const damageAmount = spellDamageAmountForTarget(
      target,
      input.invocation,
      damageRoll,
      saveDamageResultForTarget(targetId),
    );
    const hole = concentrationSavingThrowHole(target, damageAmount);
    return hole === null ? [] : [hole];
  });
  const missingConcentrationSaves = concentrationSaves.filter(
    (concentrationSave) =>
      concentrationSavingThrowFillFor(
        input.fillSet.concentrationSavingThrows,
        concentrationSave,
      ) === undefined,
  );
  if (missingConcentrationSaves.length > 0) {
    return needsHolesResult(
      input.input.state,
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
  const damageDispositionHoles = damageTargets.flatMap((targetId) => {
    const target = input.input.state.combatants.get(targetId);
    if (target === undefined) {
      return [];
    }
    const damageAmount = spellDamageAmountForTarget(
      target,
      input.invocation,
      damageRoll,
      saveDamageResultForTarget(targetId),
    );
    const hole = zeroHitPointReplacementDispositionHole({
      damageSourceId: input.actorId,
      target,
      damageAmount,
    });
    return hole === null ? [] : [hole];
  });
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
  const missingDamageDispositionHoles = damageDispositionHoles.filter(
    (hole) =>
      damageDispositionFillFor(input.fillSet.damageDispositions, hole) ===
      undefined,
  );
  if (missingDamageDispositionHoles.length > 0) {
    return needsHolesResult(input.input.state, input.input.subject, [
      ...missingDamageDispositionHoles,
    ]);
  }
  const damaged = damageTargets.reduce(
    (state, targetId) =>
      applySpellDamage(
        state,
        targetId,
        input.invocation,
        damageRoll,
        false,
        concentrationSaveByTargetId.get(targetId),
        saveDamageResultForTarget(targetId),
        damageDispositionForTarget(
          damageDispositionHoles,
          input.fillSet.damageDispositions,
          targetId,
        ),
      ),
    input.input.state,
  );
  const effected = applyFailedSaveSpellActiveEffects(
    damaged,
    input.actorId,
    failedTargets,
    input.invocation,
  );
  const extended = extendSavingThrowOngoingFeatures(
    effected,
    input.actorId,
    selectedTargetIds,
  );
  const spentResources = spendSpellCastResources({
    state: extended,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (spentResources.tag !== "resolved") {
    return spentResources;
  }
  const nextState = spentResources.state;
  const afterDamageReactionWindow = maybeOpenReactionWindow(
    nextState,
    {
      trigger: "afterDamage",
      damageSourceId: input.actorId,
      damagedId: damageTargets[0]!,
      damageAmount: toDamageAmount(
        spellDamageAmountForTarget(
          input.input.state.combatants.get(damageTargets[0]!)!,
          input.invocation,
          damageRoll,
          saveDamageResultForTarget(damageTargets[0]!),
        ),
      ),
      continuation: {
        kind: "resolved",
        subject: input.input.subject,
      },
    },
    input.input.suppressedReactionTrigger,
  );
  if (afterDamageReactionWindow !== null) {
    return afterDamageReactionWindow;
  }

  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveSaveGateConditionSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedCondition" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (
    input.invocation.targeting.kind !== "singleCombatant" &&
    input.fillSet.targetId !== undefined
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate condition spells use saving throw outcome fills, not a single-target fill.",
    );
  }
  if (input.invocation.targeting.kind === "singleCombatant") {
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
  }
  if (input.invocation.targeting.kind === "targetList") {
    if (!isTargetListSpellInvocation(input.invocation)) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Save-gate condition spell target-list shape is unsupported.",
      );
    }
    if (input.fillSet.targetId !== undefined) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        "Multi-target save-gate condition spells require a target list.",
      );
    }
    if (input.fillSet.targetList === undefined) {
      return needsHolesResult(input.input.state, input.input.subject, [
        spellTargetListHole(input.input.state, input.actorId, input.invocation),
      ]);
    }
    const targetListValidation = validateSpellTargetList(
      input.input.state,
      input.actorId,
      input.invocation,
      input.fillSet.targetList.targetIds,
      input.fillSet.targetList.spatialFacts,
    );
    if (targetListValidation !== null) {
      return invalidResult(
        input.input.state,
        "invalidFill",
        targetListValidation,
      );
    }
  }
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate condition spells do not use attack or damage fills.",
    );
  }
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowOutcomes = input.fillSet.savingThrowOutcomes;
  const savingThrowValidation = validateSavingThrowOutcomes(
    savingThrowOutcomes,
    savingThrowHole,
    input.input.state,
    input.actorId,
    input.fillSet.targetId,
    input.fillSet.targetList?.targetIds,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }

  const selectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.input.state,
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

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applyFailedSaveSpellConditionEffects(
    resourced.state,
    input.actorId,
    failedTargets,
    input.invocation,
  );
  const nextState = extendSavingThrowOngoingFeatures(
    effected,
    input.actorId,
    selectedTargetIds,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function resolveSaveGateAttackRollAdvantageSpellAct(input: {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedAttackRollAdvantage" }
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): BattleResolutionResult {
  const savingThrowHole = spellSavingThrowOutcomeHole(
    input.input.state,
    input.actorId,
    input.invocation,
  );
  if (input.fillSet.targetId !== undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate attack-roll advantage spells use saving throw outcome fills, not a single-target fill.",
    );
  }
  if (
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.damageDispositions.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Save-gate attack-roll advantage spells do not use attack or damage fills.",
    );
  }
  if (input.fillSet.savingThrowOutcomes === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      savingThrowHole,
    ]);
  }
  const savingThrowOutcomes = input.fillSet.savingThrowOutcomes;
  const savingThrowValidation = validateSavingThrowOutcomes(
    savingThrowOutcomes,
    savingThrowHole,
    input.input.state,
    input.actorId,
    undefined,
    undefined,
  );
  if (savingThrowValidation !== null) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      savingThrowValidation,
    );
  }

  const selectedTargetIds = savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  const failedTargets = savingThrowOutcomes.outcomes.flatMap((outcome) =>
    outcome.succeeded ? [] : [outcome.targetId],
  );
  if (failedTargets.length > 0) {
    const saveFailedReactionWindow = maybeOpenReactionWindow(
      input.input.state,
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

  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applyFailedSaveAttackRollAdvantageEffects(
    resourced.state,
    input.actorId,
    failedTargets,
    input.invocation,
  );
  const nextState = extendSavingThrowOngoingFeatures(
    effected,
    input.actorId,
    selectedTargetIds,
  );
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function validateSavingThrowOutcomes(
  value: BattleSpellSavingThrowOutcomeValue,
  hole: BattleSpellSavingThrowOutcomeHole,
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId | undefined,
  targetListIds?: readonly CombatantId[],
): string | null {
  const outcomes = value.outcomes;
  if (hole.spell.procedure === "rollModifier") {
    if (outcomes.length === 0) {
      return "Save-gated roll modifier spell must include at least one target Saving Throw outcome.";
    }
    if ("area" in value) {
      return "Save-gated roll modifier spell outcomes must not include area facts.";
    }
    const seenTargets = new Set<CombatantId>();
    for (const outcome of outcomes) {
      if (!state.combatants.has(outcome.targetId)) {
        return "Save-gated roll modifier spell target must be a combatant in this battle.";
      }
      if (seenTargets.has(outcome.targetId)) {
        return "Save-gated roll modifier spell Saving Throw outcomes must not duplicate targets.";
      }
      seenTargets.add(outcome.targetId);
    }
    return outcomes.length <= hole.spell.targeting.maxTargets
      ? null
      : "Save-gated roll modifier spell Saving Throw outcomes exceed the selected spell's target count.";
  }
  const targeting = spellSavingThrowTargeting(hole.spell);
  if (targeting.kind === "singleCombatant") {
    if (outcomes.length === 0) {
      return "Save-gate spell must include at least one affected target Saving Throw outcome.";
    }
    if ("area" in value) {
      return "Single-target save-gate spell outcomes must not include area facts.";
    }
    if (targetId === undefined) {
      return "Single-target save-gate spell requires one target before Saving Throw outcomes.";
    }
    if (outcomes.length !== 1 || outcomes[0]?.targetId !== targetId) {
      return "Single-target save-gate spell Saving Throw outcome must match the selected target.";
    }
    return state.combatants.has(targetId)
      ? null
      : "Save-gate spell target must be a combatant in this battle.";
  }
  if (targeting.kind === "targetList") {
    if ("area" in value) {
      return "Target-list save-gate spell outcomes must not include area facts.";
    }
    if (targetListIds === undefined) {
      return "Target-list save-gate spell requires target choices before Saving Throw outcomes.";
    }
    if (outcomes.length === 0) {
      return "Target-list save-gate spell must include at least one target Saving Throw outcome.";
    }
    if (
      targetListIds.length < targeting.minTargets ||
      targetListIds.length > targeting.maxTargets
    ) {
      return "Target-list save-gate spell target count is outside the selected spell's target count.";
    }
    if (outcomes.length !== targetListIds.length) {
      return "Target-list save-gate spell Saving Throw outcomes exceed the selected spell's target count.";
    }
    const selectedTargets = new Set(targetListIds);
    const seenTargets = new Set<CombatantId>();
    for (const outcome of outcomes) {
      if (!selectedTargets.has(outcome.targetId)) {
        return "Target-list save-gate spell Saving Throw outcomes must match the selected targets.";
      }
      if (!state.combatants.has(outcome.targetId)) {
        return "Target-list save-gate spell target must be a combatant in this battle.";
      }
      if (seenTargets.has(outcome.targetId)) {
        return "Target-list save-gate spell Saving Throw outcomes must not duplicate targets.";
      }
      seenTargets.add(outcome.targetId);
    }
    return null;
  }
  if (!("area" in value)) {
    return `Save-gate spell Saving Throw outcomes require area facts for ${targeting.kind}.`;
  }
  if (!state.combatants.has(value.area.originAnchorId)) {
    return "Save-gate spell area origin anchor must be a combatant in this battle.";
  }
  if (
    targeting.kind === "selfOriginCone" &&
    value.area.originAnchorId !== actorId
  ) {
    return "Self-origin Cone save-gate spell area must originate from the caster.";
  }
  if (
    targeting.kind === "primaryTargetOriginEmanation" &&
    value.area.originAnchorId !== targetId
  ) {
    return "Ice Knife burst area must originate from the primary target.";
  }
  const affectedTargets = new Set(value.area.affectedTargetIds);
  if (affectedTargets.size !== value.area.affectedTargetIds.length) {
    return "Save-gate spell area affected targets must not duplicate targets.";
  }
  if (
    targeting.kind === "primaryTargetOriginEmanation" &&
    targetId !== undefined &&
    !affectedTargets.has(targetId)
  ) {
    return "Ice Knife burst area must include the primary target.";
  }
  if (
    targeting.kind === "pointOriginCubeExcludingCaster" &&
    affectedTargets.has(actorId)
  ) {
    return "Entangle area affected targets must exclude the caster.";
  }
  for (const targetId of affectedTargets) {
    if (!state.combatants.has(targetId)) {
      return "Save-gate spell area affected target must be a combatant in this battle.";
    }
  }
  const seenTargets = new Set<CombatantId>();
  for (const outcome of outcomes) {
    const targetId = outcome.targetId;
    if (!affectedTargets.has(targetId)) {
      return "Save-gate spell Saving Throw outcomes must match the table-supplied area affected targets.";
    }
    if (seenTargets.has(targetId)) {
      return "Save-gate spell Saving Throw outcomes must not duplicate targets.";
    }
    seenTargets.add(targetId);
  }
  if (seenTargets.size !== affectedTargets.size) {
    return "Save-gate spell Saving Throw outcomes must cover every table-supplied area affected target.";
  }
  return null;
}

export function spendSpellCastResources(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly invocation: SupportedSpellInvocation;
  readonly errorState: BattleState;
}): Extract<BattleResolutionResult, { readonly tag: "resolved" | "invalid" }> {
  const actionCost =
    "actionCost" in input.invocation
      ? input.invocation.actionCost
      : "magicAction";
  const spent =
    actionCost === "bonusAction"
      ? spendActivationResource(input.state.currentTurnResources, {
          kind: "bonusAction",
        })
      : spendAction(input.state.currentTurnResources, "magic");
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.errorState,
      "staleSubject",
      actionCost === "bonusAction"
        ? "Bonus Action spell is no longer available for the current actor."
        : "Magic action is no longer available for the current actor.",
    );
  }
  if (input.invocation.resource.tag === "none") {
    const afterPriorConcentration = spellRequiresConcentration(input.invocation)
      ? breakBattleConcentration(input.state, input.actorId)
      : input.state;
    const resourced = {
      ...afterPriorConcentration,
      currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
        spent.right,
        input.actorId,
      ),
    };
    const nextState = spellRequiresConcentration(input.invocation)
      ? startSpellEffectConcentration(
          resourced,
          input.actorId,
          input.invocation,
        )
      : resourced;
    return {
      tag: "resolved",
      state: nextState,
      snapshot: snapshotBattle(nextState),
    };
  }
  const slotTurnResources = markSpellSlotExpendedThisTurn(spent.right);
  if (Either.isLeft(slotTurnResources)) {
    return invalidResult(
      input.errorState,
      "staleSubject",
      "This turn has already expended a Spell Slot.",
    );
  }
  const afterPriorConcentration = spellRequiresConcentration(input.invocation)
    ? breakBattleConcentration(input.state, input.actorId)
    : input.state;
  const slotted = expendSpellSlot(
    afterPriorConcentration,
    input.actorId,
    input.invocation.resource.slotLevel,
  );
  const resourced = {
    ...slotted,
    currentTurnResources: clearPendingAttackRollMissToHitReplacementSelection(
      slotTurnResources.right,
      input.actorId,
    ),
  };
  const nextState = spellRequiresConcentration(input.invocation)
    ? startSpellEffectConcentration(resourced, input.actorId, input.invocation)
    : resourced;
  return {
    tag: "resolved",
    state: nextState,
    snapshot: snapshotBattle(nextState),
  };
}

export function spellRequiresConcentration(
  invocation: SupportedSpellInvocation,
): boolean {
  return invocation.spell.mechanics.duration.kind === "concentration";
}

export function startSpellEffectConcentration(
  state: BattleState,
  actorId: CombatantId,
  invocation: SupportedSpellInvocation,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      concentration: {
        sourceSpellId: invocation.spell.id,
        effectKind: "spellEffect",
      },
    }),
  };
}