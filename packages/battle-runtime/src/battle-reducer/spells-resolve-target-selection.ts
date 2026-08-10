// Spell target-selection projections extracted from spells-resolve.ts.
// Owns target, target-list, and roll-modifier choice interpretation for resolved spell fills.

// KERNEL-COVERAGE: runtime-owner BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS
import {
  type RollModifierSpellEffect,
  type SelectedRollModifierSpellEffect,
  type ActionSpellBattleResolutionInput,
  type BattleHole,
  type BattleExecutableSpellInvocation,
  type BonusActionSpellBattleResolutionInput,
  type SupportedSpellInvocation,
} from "../battle-state-execution.ts";
import { isScalarBuffTargetListInvocation } from "./spells-invocation-guards.ts";
import type { CombatantId } from "../identity.ts";
import {
  sameCombatantIdSet,
  rollModifierUsesTargetAbilityChoices,
  spellRollModifierAbilityChoiceHole,
  spellRollModifierSkillChoiceHole,
  spellRollModifierTargetAbilityChoicesHole,
  spellSavingThrowOutcomeHole,
  spellTargetHole,
  spellTargetIsLegal,
  spellTargetListHole,
  validateSpellTargetList,
} from "./spells-holes-fills.ts";

import { validateSavingThrowOutcomes } from "./spells-resolve-save-gates.ts";

import { type SpellFillSet } from "./spells-resolve-fill-set.ts";
import { failedSavingThrowTargetIds } from "./saving-throw-outcomes.ts";

export type HealingSpellTargetSelection =
  | { readonly tag: "ok"; readonly targetIds: readonly CombatantId[] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

export type SpellTargetListSelection =
  | { readonly tag: "ok"; readonly targetIds: readonly CombatantId[] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

export type SpellSingleTargetSelection =
  | { readonly tag: "ok"; readonly targetIds: readonly [CombatantId] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

export type ScalarBuffSpellTargetSelection =
  | { readonly tag: "ok"; readonly targetIds: readonly CombatantId[] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

export type RollModifierSpellTargetSelection =
  | { readonly tag: "ok"; readonly targetIds: readonly CombatantId[] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

export type RollModifierSpellEffectSelection =
  | {
      readonly tag: "ok";
      readonly selection:
        | {
            readonly kind: "sameForTargets";
            readonly effect: SelectedRollModifierSpellEffect;
          }
        | {
            readonly kind: "byTarget";
            readonly targetEffects: readonly {
              readonly targetId: CombatantId;
              readonly effect: RollModifierSpellEffect;
            }[];
          };
    }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

export type RollModifierSpellAffectedTargets =
  | { readonly tag: "ok"; readonly targetIds: readonly CombatantId[] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

export function spellSingleTargetSelection(input: {
  readonly state: ActionSpellBattleResolutionInput["state"];
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly targetListMessage: string;
  readonly invalidTargetMessage: string;
}): SpellSingleTargetSelection {
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fillSet.targetList !== undefined) {
    return { tag: "invalid", message: input.targetListMessage };
  }
  /* v8 ignore stop */
  if (input.fillSet.targetId === undefined) {
    return {
      tag: "needsHoles",
      hole: spellTargetHole(input.state, input.actorId, input.invocation),
    };
  }
  return spellTargetIsLegal(
    input.state,
    input.actorId,
    input.fillSet.targetId,
    input.invocation,
    input.fillSet.targetSpatialFacts,
  )
    ? { tag: "ok", targetIds: [input.fillSet.targetId] }
    : { tag: "invalid", message: input.invalidTargetMessage };
}

export function spellTargetListSelection(input: {
  readonly state: ActionSpellBattleResolutionInput["state"];
  readonly actorId: CombatantId;
  readonly invocation: Parameters<typeof validateSpellTargetList>[2];
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly singleTargetListMessage: string;
  readonly invalidSingleTargetMessage: string;
  readonly multiTargetChoiceMessage: string;
}): SpellTargetListSelection {
  if (
    "maxTargets" in input.invocation.targeting &&
    input.invocation.targeting.maxTargets === 1
  ) {
    return spellSingleTargetSelection({
      state: input.state,
      actorId: input.actorId,
      invocation: input.invocation,
      fillSet: input.fillSet,
      targetListMessage: input.singleTargetListMessage,
      invalidTargetMessage: input.invalidSingleTargetMessage,
    });
  }

  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fillSet.targetId !== undefined) {
    return { tag: "invalid", message: input.multiTargetChoiceMessage };
  }
  /* v8 ignore stop */
  if (input.fillSet.targetList === undefined) {
    return {
      tag: "needsHoles",
      hole: spellTargetListHole(input.state, input.actorId, input.invocation),
    };
  }
  const validation = validateSpellTargetList(
    input.state,
    input.actorId,
    input.invocation,
    input.fillSet.targetList.targetIds,
    input.fillSet.targetList.spatialFacts,
  );
  return validation === null
    ? { tag: "ok", targetIds: input.fillSet.targetList.targetIds }
    : { tag: "invalid", message: validation };
}

export function healingSpellTargetSelection(input: {
  readonly input:
    | ActionSpellBattleResolutionInput
    | BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<
    Extract<
      SupportedSpellInvocation,
      { readonly procedure: "directHitPointRestoration" }
    >
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): HealingSpellTargetSelection {
  return spellTargetListSelection({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    singleTargetListMessage:
      "Single-target healing spells use one target fill.",
    invalidSingleTargetMessage:
      "Spell target must be a combatant within the selected spell's supported range.",
    multiTargetChoiceMessage:
      "Multi-target healing spells use a target-list fill.",
  });
}

export function scalarBuffSpellTargetSelection(input: {
  readonly input:
    | ActionSpellBattleResolutionInput
    | BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<
    Extract<SupportedSpellInvocation, { readonly procedure: "scalarBuff" }>
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!isScalarBuffTargetListInvocation(input.invocation)) {
    return {
      tag: "invalid",
      message: "Scalar buff spell target shape is unsupported.",
    };
  }
  /* v8 ignore stop */

  return spellTargetListSelection({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    singleTargetListMessage:
      "Single-target scalar buff spells require one target choice.",
    invalidSingleTargetMessage:
      "Scalar buff spell target must be a combatant within the selected spell's supported range.",
    multiTargetChoiceMessage:
      "Multi-target scalar buff spells require a target list.",
  });
}

export function rollModifierSpellTargetSelection(input: {
  readonly input:
    | ActionSpellBattleResolutionInput
    | BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<
    Extract<SupportedSpellInvocation, { readonly procedure: "rollModifier" }>
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): RollModifierSpellTargetSelection {
  return spellTargetListSelection({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    singleTargetListMessage:
      "Single-target roll modifier spells require one target choice.",
    invalidSingleTargetMessage:
      "Roll modifier spell target must be a combatant within the selected spell's supported range.",
    multiTargetChoiceMessage:
      "Multi-target roll modifier spells require a target list.",
  });
}

export function rollModifierSpellEffectSelection(input: {
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<
    Extract<SupportedSpellInvocation, { readonly procedure: "rollModifier" }>
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
  readonly targetIds: readonly CombatantId[];
}): RollModifierSpellEffectSelection {
  if (input.invocation.effect.kind === "d20RollModifier") {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      input.fillSet.abilityChoice !== undefined ||
      input.fillSet.targetAbilityChoices !== undefined
    ) {
      return {
        tag: "invalid",
        message: "This roll modifier spell does not choose an ability.",
      };
    }
    /* v8 ignore stop */
    if (input.invocation.skillChoices === null) {
      return input.fillSet.skillChoice === undefined
        ? {
            tag: "ok",
            selection: {
              kind: "sameForTargets",
              effect: {
                ...input.invocation.effect,
                sourceCombatantId: input.actorId,
                skill: input.invocation.effect.skill,
              },
            },
          }
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
      ? {
          tag: "ok",
          selection: {
            kind: "sameForTargets",
            effect: {
              ...input.invocation.effect,
              sourceCombatantId: input.actorId,
              skill: input.fillSet.skillChoice,
            },
          },
        }
      : {
          tag: "invalid",
          message:
            "Roll modifier spell skill choice is not legal for this spell.",
        };
  }

  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fillSet.skillChoice !== undefined) {
    return {
      tag: "invalid",
      message: "This roll modifier spell does not choose a skill.",
    };
  }
  /* v8 ignore stop */
  const abilityChoices = input.invocation.abilityChoices;
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (abilityChoices === null) {
    return {
      tag: "invalid",
      message: "This roll modifier spell does not choose an ability.",
    };
  }
  /* v8 ignore stop */
  if (rollModifierUsesTargetAbilityChoices(input.invocation)) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (input.fillSet.abilityChoice !== undefined) {
      return {
        tag: "invalid",
        message:
          "Per-target roll modifier spells do not use one shared ability choice.",
      };
    }
    /* v8 ignore stop */
    const targetAbilityChoices = input.fillSet.targetAbilityChoices;
    if (targetAbilityChoices === undefined) {
      return {
        tag: "needsHoles",
        hole: spellRollModifierTargetAbilityChoicesHole(input.invocation),
      };
    }
    const selectedTargets = new Set(input.targetIds);
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (
      targetAbilityChoices.value.choices.length !== selectedTargets.size ||
      !targetAbilityChoices.value.choices.every((choice) =>
        selectedTargets.has(choice.targetId),
      )
    ) {
      return {
        tag: "invalid",
        message:
          "Roll modifier spell target ability choices must match the selected targets.",
      };
    }
    /* v8 ignore stop */
    return {
      tag: "ok",
      selection: {
        kind: "byTarget",
        targetEffects: targetAbilityChoices.value.choices.map((choice) => ({
          targetId: choice.targetId,
          effect: {
            ...input.invocation.effect,
            sourceCombatantId: input.actorId,
            ability: choice.ability,
          },
        })),
      },
    };
  }
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (input.fillSet.targetAbilityChoices !== undefined) {
    return {
      tag: "invalid",
      message: "This roll modifier spell does not choose abilities per target.",
    };
  }
  /* v8 ignore stop */
  if (input.fillSet.abilityChoice === undefined) {
    return {
      tag: "needsHoles",
      hole: spellRollModifierAbilityChoiceHole(input.invocation),
    };
  }
  return abilityChoices.includes(input.fillSet.abilityChoice)
    ? {
        tag: "ok",
        selection: {
          kind: "sameForTargets",
          effect: {
            ...input.invocation.effect,
            sourceCombatantId: input.actorId,
            ability: input.fillSet.abilityChoice,
          },
        },
      }
    : {
        tag: "invalid",
        message:
          "Roll modifier spell ability choice is not legal for this spell.",
      };
}

export function rollModifierSpellAffectedTargets(input: {
  readonly input:
    | ActionSpellBattleResolutionInput
    | BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<
    Extract<SupportedSpellInvocation, { readonly procedure: "rollModifier" }>
  >;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): RollModifierSpellAffectedTargets {
  if (input.invocation.saveGate === null) {
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (input.fillSet.savingThrowOutcomes !== undefined) {
      return {
        tag: "invalid",
        message: "Ungated roll modifier spells do not use Saving Throw fills.",
      };
    }
    /* v8 ignore stop */
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
    input.invocation,
    input.input.state,
    input.actorId,
    undefined,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (validation !== null) {
    return { tag: "invalid", message: validation };
  }
  /* v8 ignore stop */
  const targetSelection = rollModifierSpellTargetSelection(input);
  if (targetSelection.tag !== "ok") {
    return targetSelection;
  }
  const outcomeTargetIds = input.fillSet.savingThrowOutcomes.outcomes.map(
    (outcome) => outcome.targetId,
  );
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (!sameCombatantIdSet(targetSelection.targetIds, outcomeTargetIds)) {
    return {
      tag: "invalid",
      message:
        "Save-gated roll modifier spell Saving Throw outcomes must match the selected targets.",
    };
  }
  /* v8 ignore stop */
  return {
    tag: "ok",
    targetIds: failedSavingThrowTargetIds(
      input.fillSet.savingThrowOutcomes.outcomes,
    ),
  };
}
