// Chained spell attack-damage resolution, currently Chromatic Orb.
// Extracted from spells-resolve.ts as a procedure-local resolver slice.
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CHAINED_ATTACK_SEQUENCE

import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import {
  attackRollHits,
  attackRollResultIsValid,
} from "@dnd/shared-algebras/attack-roll-algebra";
import { validateRolledDiceForDiceExpr } from "@dnd/shared-algebras/runtime-dice-algebra";
import { damageAmount as toDamageAmount } from "@dnd/shared/types";
import type { DamageType } from "@dnd/surface/surface/types";
import {
  attackRollIsCriticalHit,
  maybeOpenReactionWindow,
  openAfterDamageSequenceReactionWindow,
  type ActionSpellBattleResolutionInput,
  type BattleAfterDamageEvent,
  type BattleAttackDamageDisposition,
  type BattleAttackDamageDispositionHole,
  type BattleConcentrationSavingThrowHole,
  type BattleCreatureState,
  type BattleFill,
  type BattleResolutionResult,
  type BattleState,
  type BattleSpellCastReactionFact,
  type BattleTargetSpatialFact,
  type SupportedSpellInvocation,
  snapshotBattle,
} from "../battle-reducer.ts";
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
  requiredSpellAttackRollMode,
} from "./attack-roll.ts";
import { validateUniqueAttackSightFacts } from "./attack-fill-set.ts";
import { activeEffectArmorClass } from "./creature-state.ts";
import {
  applyBattleHitPointDamage,
  concentrationSavingThrowHole,
  damageLifecycleConcentrationSavingThrowFillCheck,
  damageLifecycleConcentrationSavingThrowHoles,
  damageLifecycleHideousLaughterDamageRepeatSaveFillCheck,
  damageLifecycleHideousLaughterDamageRepeatSaveHoles,
} from "./damage-apply.ts";
import { damageAmountAfterTargetAdjustments } from "./damage-helpers.ts";
import { isHideousLaughterDamageRepeatSaveFill } from "./hideous-laughter-repeat-save.ts";
import { needsHolesResult } from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
import { sanctuaryTargetingInterdictionCheck } from "./sanctuary-targeting-interdiction.ts";
import { spellCastReactionFrame } from "./spell-cast-reaction-frame.ts";
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
import { spellAttackKindForRedirect } from "./spells-profiles.ts";
import {
  recordAttackRollMissToHitReplacementUsed,
  selectedAttackRollMissToHitReplacement,
} from "./statblock-attacks.ts";

import { spendSpellCastResources } from "./spells-resolve-resources.ts";

import { concentrationSavingThrowFillFor } from "./spells-resolve-fill-helpers.ts";
import {
  parseSpellCastReactionFactsFill,
  type SpellCastReactionFact,
} from "./spells-resolve-fill-set.ts";
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
      readonly hideousLaughterDamageRepeatSaves: readonly Extract<
        BattleFill,
        { readonly kind: "savingThrowOutcome" }
      >[];
      readonly damageDispositions: readonly Extract<
        BattleFill,
        { readonly kind: "attackDamageDisposition" }
      >[];
      readonly reactionSpellTargetFacts: readonly BattleSpellCastReactionFact[];
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
  const hideousLaughterDamageRepeatSaveHoleIds = new Set<string>();
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

    const targetEventId = chainedSpellTargetHoleId(input.invocation, stepIndex);
    const sanctuaryCheck = sanctuaryTargetingInterdictionCheck({
      state: replayState,
      triggeringCombatantId: input.actorId,
      wardedCombatantId: target.combatantId,
      triggeringTargetEventId: targetEventId,
      fills: input.input.fills,
    });
    if (sanctuaryCheck.tag === "needsHoles") {
      return needsHolesResult(replayState, input.input.subject, [
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
      });
    }
    if (sanctuaryCheck.tag === "newTarget") {
      const replacementTarget = replayState.combatants.get(
        sanctuaryCheck.targetId,
      );
      const replacementIsLegal =
        replacementTarget !== undefined &&
        (stepIndex === 0
          ? spellTargetIsLegal(
              replayState,
              input.actorId,
              replacementTarget.combatantId,
              input.invocation,
              sanctuaryCheck.spatialFacts,
            )
          : chainedSpellLeapTargetIsLegal(
              input.invocation,
              targeted[stepIndex - 1],
              replacementTarget.combatantId,
              sanctuaryCheck.spatialFacts,
            ));
      if (replacementTarget === undefined || !replacementIsLegal) {
        return invalidResult(
          input.input.state,
          "invalidFill",
          stepIndex === 0
            ? "Sanctuary replacement Chromatic Orb target must be legal for the selected spell."
            : "Sanctuary replacement Chromatic Orb leap target must be different and within 30 feet of the previous target.",
        );
      }
      const originalTargetFill = input.input.fills.find(
        (
          fill,
        ): fill is Extract<BattleFill, { readonly kind: "targetChoice" }> =>
          fill.kind === "targetChoice" && fill.holeId === targetEventId,
      );
      if (originalTargetFill === undefined) {
        return invalidResult(
          input.input.state,
          "invalidFill",
          "Sanctuary replacement requires the original Chromatic Orb target fill.",
        );
      }
      const fills = input.input.fills.map(
        (fill): BattleFill =>
          fill === originalTargetFill
            ? {
                ...fill,
                value: replacementTarget.combatantId,
                spatialFacts: sanctuaryCheck.spatialFacts,
              }
            : fill,
      );
      const replacementFillSet = chainedSpellFillSet(fills, input.invocation);
      if (replacementFillSet.tag === "invalid") {
        return invalidResult(
          input.input.state,
          "invalidFill",
          replacementFillSet.message,
        );
      }
      return resolveChainedSpellAttackDamageAct({
        ...input,
        input: { ...input.input, fills },
      });
    }

    if (stepIndex === 0 && input.opensSpellCastReactionWindow !== false) {
      const spellCastReactionWindow = maybeOpenReactionWindow(
        replayState,
        spellCastReactionFrame({
          casterId: input.actorId,
          invocation: input.invocation,
          targetIds: [target.combatantId],
          reactionSpellTargetFacts: fillSet.reactionSpellTargetFacts,
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
    }

    const requiredRollMode = requiredSpellAttackRollMode(
      replayState,
      input.actorId,
      target.combatantId,
      input.invocation,
      step.target.spatialFacts ?? [],
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
        hideousLaughterDamageRepeatSaveHoleIds,
        hideousLaughterDamageRepeatSaveFills:
          fillSet.hideousLaughterDamageRepeatSaves,
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
        attackHitTriggerKind: "otherAttack",
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
    const damageEventKey = [
      "battle:spell:chained-damage-event",
      input.invocation.spell.id,
      stepIndex,
      target.combatantId,
    ].join(":");
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
    if (concentrationSaveCheck.tag === "invalid") {
      return invalidResult(
        input.input.state,
        "invalidFill",
        concentrationSaveCheck.message,
      );
    }
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
    const hideousLaughterLifecycleHoles =
      damageLifecycleHideousLaughterDamageRepeatSaveHoles({
        state: replayState,
        target,
        damageAmount,
        damageEventKey,
      });
    const hideousLaughterLifecycleFills = matchingHoleIdFills(
      fillSet.hideousLaughterDamageRepeatSaves,
      hideousLaughterLifecycleHoles,
    );
    const hideousLaughterSaveCheck =
      damageLifecycleHideousLaughterDamageRepeatSaveFillCheck({
        state: replayState,
        target,
        damageAmount,
        fills: hideousLaughterLifecycleFills,
        damageEventKey,
      });
    if (hideousLaughterSaveCheck.tag === "needsHoles") {
      return needsHolesResult(replayState, input.input.subject, [
        ...hideousLaughterSaveCheck.holes,
      ]);
    }
    if (hideousLaughterSaveCheck.tag === "invalid") {
      return invalidResult(
        input.input.state,
        "invalidFill",
        hideousLaughterSaveCheck.message,
      );
    }
    for (const hole of hideousLaughterSaveCheck.holes) {
      hideousLaughterDamageRepeatSaveHoleIds.add(String(hole.holeId));
    }
    replayState = applyChainedSpellDamage(
      replayState,
      target.combatantId,
      input.invocation,
      selectedDamageType,
      step.damageRoll,
      critical,
      concentrationFill,
      damageDispositionForTarget(
        dispositionHole === null ? [] : [dispositionHole],
        fillSet.damageDispositions,
        target.combatantId,
      ),
      concentrationLifecycleFills,
      hideousLaughterLifecycleFills,
      damageEventKey,
    );
    afterDamageEvents.push({
      damageSourceId: input.actorId,
      damagedId: target.combatantId,
      damageAmount: toDamageAmount(damageAmount),
      reactionSpellTargetFacts: reactionSpellTargetFactsForAfterDamage({
        facts: step.target.spatialFacts ?? [],
        damagedId: target.combatantId,
        damageSourceId: input.actorId,
      }),
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
        hideousLaughterDamageRepeatSaveHoleIds,
        hideousLaughterDamageRepeatSaveFills:
          fillSet.hideousLaughterDamageRepeatSaves,
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
      objectDamages: [],
      objectIgnitions: [],
      droppedObjects: [],
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
    objectDamages: [],
    objectIgnitions: [],
    droppedObjects: [],
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
  const hideousLaughterDamageRepeatSaves: Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [];
  const damageDispositions: Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >[] = [];
  let reactionSpellTargetFacts: readonly SpellCastReactionFact[] = [];
  let reactionSpellTargetFactsFilled = false;

  for (const fill of fills) {
    const spellCastReactionFacts = parseSpellCastReactionFactsFill(fill);
    if (spellCastReactionFacts.tag !== "notSpellCastReactionFactsFill") {
      if (reactionSpellTargetFactsFilled) {
        return {
          tag: "invalid",
          message: "Spell-cast Reaction trigger facts were filled twice.",
        };
      }
      if (spellCastReactionFacts.tag === "invalid") {
        return {
          tag: "invalid",
          message: spellCastReactionFacts.message,
        };
      }
      reactionSpellTargetFacts = spellCastReactionFacts.facts;
      reactionSpellTargetFactsFilled = true;
      continue;
    }
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
        const sightFactValidation = chainedSpellAttackSightFactValidation(
          fill.spatialFacts ?? [],
        );
        if (sightFactValidation !== null) return sightFactValidation;
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
    if (
      fill.kind === "savingThrowOutcome" &&
      isHideousLaughterDamageRepeatSaveFill(fill)
    ) {
      if (
        hideousLaughterDamageRepeatSaves.some(
          (candidate) => candidate.holeId === fill.holeId,
        )
      ) {
        return {
          tag: "invalid",
          message: "Hideous Laughter repeat save was filled twice.",
        };
      }
      hideousLaughterDamageRepeatSaves.push(fill);
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
    if (fill.kind === "sanctuaryInterdictionOutcome") {
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
    hideousLaughterDamageRepeatSaves,
    damageDispositions,
    reactionSpellTargetFacts,
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
  readonly hideousLaughterDamageRepeatSaveHoleIds: ReadonlySet<string>;
  readonly hideousLaughterDamageRepeatSaveFills: readonly Extract<
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
  if (
    input.concentrationFills.some(
      (fill) => !concentrationHoleIds.has(fill.holeId),
    )
  ) {
    return "Concentration Saving Throw fill is only valid for a concentrating damaged target.";
  }
  if (
    input.hideousLaughterDamageRepeatSaveFills.some(
      (fill) =>
        !input.hideousLaughterDamageRepeatSaveHoleIds.has(String(fill.holeId)),
    )
  ) {
    return "Hideous Laughter repeat save fills are only valid for a damaged target affected by Hideous Laughter.";
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
  wardingBondDamageShareConcentrationSavingThrows: readonly Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[] = [],
  hideousLaughterDamageRepeatSaves: readonly Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [],
  hideousLaughterDamageRepeatSaveEventKey?: string,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const damageAmount = chainedSpellDamageAmountForTarget(
    target,
    invocation,
    damageType,
    damageRoll,
  );
  return applyBattleHitPointDamage({
    state,
    target,
    damageAmount,
    deathFailuresAtZeroHp: critical ? 2 : 1,
    damageDisposition,
    concentrationSavingThrow,
    wardingBondDamageShareConcentrationSavingThrows,
    hideousLaughterDamageRepeatSaves,
    hideousLaughterDamageRepeatSaveEventKey,
  });
}
