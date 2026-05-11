// Spell target-selection projections extracted from spells-resolve.ts.
// Owns target, target-list, and skill-choice interpretation for resolved spell fills.

import type { Skill } from "@dnd/surface/surface/types";
import {
isScalarBuffTargetListInvocation,
type ActionSpellBattleResolutionInput,
type BattleHole,
type BonusActionSpellBattleResolutionInput,
type SupportedSpellInvocation
} from "../battle-reducer.ts";
import type { CombatantId } from "../identity.ts";
import {
sameCombatantIdSet,
spellRollModifierSkillChoiceHole,
spellSavingThrowOutcomeHole,
spellTargetHole,
spellTargetIsLegal,
spellTargetListHole,
validateSpellTargetList
} from "./spells-holes-fills.ts";

import { validateSavingThrowOutcomes } from "./spells-resolve-save-gates.ts";

import { type SpellFillSet } from "./spells-resolve-fill-set.ts";

export type HealingSpellTargetSelection =
  | { readonly tag: "ok"; readonly targetIds: readonly CombatantId[] }
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

export type ConditionImmunityAndTurnStartTemporaryHitPointsSpellTargetSelection =
  | { readonly tag: "ok"; readonly targetIds: readonly CombatantId[] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

export type CreatureTypeProtectionSpellTargetSelection =
  | { readonly tag: "ok"; readonly targetIds: readonly [CombatantId] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

export type RollModifierSpellSkillSelection =
  | { readonly tag: "ok"; readonly skill: Skill | null }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

export type RollModifierSpellAffectedTargets =
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
