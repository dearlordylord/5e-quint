import { maybeOpenSpellCastReactionWindow } from "../spell-cast-reaction-window.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-direct-condition-removal
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION
//
// The directConditionRemoval Spell Procedure Profile: a prepared Bonus Action
// spell that touches one creature and ends one chosen condition on it.

import { movementFeet } from "@dnd/shared/types";

import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleCreatureState,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type DirectConditionRemovalSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";

import {
  needsHolesResult,
  spellSelectionResolution,
} from "../needs-holes-result.ts";
import { invalidResult } from "../result-helpers.ts";
import { fillsBelongToSpellCastHoles } from "../fill-hole-protocol.ts";
import { ATTACK_TARGET_HOLE_ID } from "../battle-runtime-protocol.ts";
import {
  battleCreatureAfterConditionRemoval,
  combatantsAfterConcentrationSpellEffectsEndedIfNoEffects,
  concentrationSpellEffectSourcesDirectlyApplyingCondition,
} from "../spell-condition-effects-helpers.ts";
import { DIRECT_CONDITION_REMOVAL_CONDITIONS } from "../domain-constants.ts";
import { sameStringSet } from "../spells-execution-facts.ts";
import {
  spellConditionChoiceHole,
  spellTargetHole,
  spellTargetIsLegal,
} from "../spells-holes-fills.ts";
import { spellConditionChoiceHoleId } from "../spells-damage-fills.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type DirectConditionRemovalCondition =
  DirectConditionRemovalSpellInvocation["conditionChoices"][number];

type DirectConditionRemovalSpellTargetSelection =
  | { readonly tag: "ok"; readonly targetIds: readonly [CombatantId] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

function admitDirectConditionRemoval(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly DirectConditionRemovalSpellInvocation[] {
  const projection = directConditionRemovalProjection(spell);
  if (projection === null) {
    return [];
  }
  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly DirectConditionRemovalSpellInvocation[] =>
      Number(slot.spellLevel) < spell.mechanics.level
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "directConditionRemoval",
              spell,
              actionCost: "bonusAction",
              ...projection,
            },
          ],
  );
}

function directConditionRemovalProjection(
  spell: BattleSpellAdmissionSource,
): Pick<
  DirectConditionRemovalSpellInvocation,
  "conditionChoices" | "rangeFeet" | "targeting"
> | null {
  if (
    spell.mechanics.family !== "activation" ||
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "touch" ||
    spell.mechanics.duration.kind !== "instantaneous" ||
    spell.mechanics.phases.length !== 1
  ) {
    return null;
  }
  const [phase] = spell.mechanics.phases;
  const attachment = phase?.kind === "direct" ? phase.attachment : null;
  const selection =
    attachment?.kind === "hole" && attachment.value.kind === "target"
      ? attachment.value.selection
      : null;
  const effects = phase?.kind === "direct" ? (phase.effects ?? []) : [];
  const [effect, extraEffect] = effects;
  const condition =
    effect?.kind === "remove_condition" ? effect.condition : null;
  const conditionChoice =
    condition !== null &&
    typeof condition === "object" &&
    !Array.isArray(condition) &&
    "kind" in condition &&
    condition.kind === "choose"
      ? condition
      : null;
  if (
    selection === null ||
    selection.mode !== "one" ||
    !sameStringSet(selection.targetKinds ?? ["creature"], ["creature"]) ||
    extraEffect !== undefined ||
    conditionChoice === null ||
    !sameStringSet(conditionChoice.from, DIRECT_CONDITION_REMOVAL_CONDITIONS)
  ) {
    return null;
  }
  return {
    targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
    conditionChoices: DIRECT_CONDITION_REMOVAL_CONDITIONS,
    rangeFeet: movementFeet(5),
  };
}

function discoverDirectConditionRemovalCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<DirectConditionRemovalSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return targetHole.choices.length === 0
    ? []
    : [
        {
          subject: {
            tag: "bonusActionSpell",
            actorId,
            procedureRef: invocation.sourceProcedureRef,
            mode: { tag: "cast" },
          },
          initialHoles: [targetHole, spellConditionChoiceHole(invocation)],
        },
      ];
}

function resolveDirectConditionRemoval(
  input: SpellProcedureProfileResolveInput<DirectConditionRemovalSpellInvocation>,
): BattleResolutionResult {
  if (
    !fillsBelongToSpellCastHoles(input.input.fills, [
      ATTACK_TARGET_HOLE_ID,
      spellConditionChoiceHoleId(input.invocation),
    ])
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Direct condition-removal spells use one target fill and one condition choice.",
    );
  }

  const targetSelectionResolution = spellSelectionResolution(
    input.input.state,
    input.input.subject,
    directConditionRemovalSpellTargetSelection(input),
  );
  if (targetSelectionResolution.tag === "resolution")
    return targetSelectionResolution.result;
  const targetSelection = targetSelectionResolution.selection;
  const conditionChoice = input.fillSet.conditionChoice;
  if (conditionChoice === undefined) {
    return needsHolesResult(input.input.state, input.input.subject, [
      spellConditionChoiceHole(input.invocation),
    ]);
  }
  const selectedCondition = input.invocation.conditionChoices.find(
    (choice) => choice === conditionChoice,
  );
  if (selectedCondition === undefined) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell condition choice is not available for this spell.",
    );
  }

  const spellCastReactionWindow = maybeOpenSpellCastReactionWindow(
    input,
    targetSelection.targetIds,
    { kind: "bonusAction" },
    undefined,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }

  const effected = applyDirectConditionRemovalSpellEffect(
    input.input.state,
    targetSelection.targetIds,
    selectedCondition,
  );
  return spendSpellCastResources({
    state: effected,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
}

function directConditionRemovalSpellTargetSelection(input: {
  readonly input: BonusActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation<DirectConditionRemovalSpellInvocation>;
  readonly fillSet: Extract<SpellFillSet, { readonly tag: "ok" }>;
}): DirectConditionRemovalSpellTargetSelection {
  if (input.fillSet.targetList !== undefined) {
    return {
      tag: "invalid",
      message: "Direct condition-removal spells require one target choice.",
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
          "Direct condition-removal spell target must be a combatant within the selected spell's supported range.",
      };
}

function applyDirectConditionRemovalSpellEffect(
  state: BattleState,
  targetIds: readonly CombatantId[],
  condition: DirectConditionRemovalCondition,
): BattleState {
  return targetIds.reduce((nextState, targetId) => {
    const target = nextState.combatants.get(targetId);
    if (target === undefined) {
      return nextState;
    }
    const concentrationSources =
      concentrationSpellEffectSourcesDirectlyApplyingCondition(
        target,
        condition,
      );
    const cleansedTarget = battleCreatureAfterConditionRemoval(
      target,
      condition,
    );
    const combatantsWithTarget: ReadonlyMap<CombatantId, BattleCreatureState> =
      new Map(nextState.combatants).set(targetId, cleansedTarget);
    return {
      ...nextState,
      combatants: concentrationSources.reduce<
        ReadonlyMap<CombatantId, BattleCreatureState>
      >(
        (nextCombatants, source) =>
          combatantsAfterConcentrationSpellEffectsEndedIfNoEffects(
            nextCombatants,
            source,
          ),
        combatantsWithTarget,
      ),
    };
  }, state);
}

const DirectConditionRemovalInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("directConditionRemoval"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("bonusAction"),
    targeting: Schema.Struct({
      kind: Schema.Literal("targetList"),
      minTargets: Schema.Literal(1),
      maxTargets: Schema.Literal(1),
    }),
    conditionChoices: Schema.Tuple(
      Schema.Literal(DIRECT_CONDITION_REMOVAL_CONDITIONS[0]),
      Schema.Literal(DIRECT_CONDITION_REMOVAL_CONDITIONS[1]),
      Schema.Literal(DIRECT_CONDITION_REMOVAL_CONDITIONS[2]),
      Schema.Literal(DIRECT_CONDITION_REMOVAL_CONDITIONS[3]),
    ),
    rangeFeet: MovementFeet,
  }),
);
export const directConditionRemovalProfile: SpellProcedureDeclaration<
  "directConditionRemoval",
  DirectConditionRemovalSpellInvocation
> = {
  procedure: "directConditionRemoval",
  executionSchema: DirectConditionRemovalInvocationSchema,
  admit: admitDirectConditionRemoval,
  discoverCastAct: discoverDirectConditionRemovalCastAct,
  resolve: resolveDirectConditionRemoval,
};
