// Chained spell attack-damage resolution, currently Chromatic Orb.
// Extracted from spells-resolve.ts as a procedure-local resolver slice.

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
  type SupportedSpellInvocation,
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
  requiredAttackRollMode,
} from "./attack-roll.ts";
import { activeEffectArmorClass } from "./creature-state.ts";
import {
  applyBattleHitPointDamage,
  concentrationSavingThrowHole,
} from "./damage-apply.ts";
import { damageAmountAfterTargetAdjustments } from "./damage-helpers.ts";
import { needsHolesResult } from "./hole-helpers.ts";
import { invalidResult } from "./result-helpers.ts";
import { reactionSpellTargetFactsForAfterDamage } from "./reaction-triggered-spells.ts";
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
  });
}
