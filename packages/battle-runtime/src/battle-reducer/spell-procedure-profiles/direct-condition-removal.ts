// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-direct-condition-removal
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION
//
// The directConditionRemoval Spell Procedure Profile: a prepared Bonus Action
// spell that touches one creature and ends one chosen condition on it.

import { movementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  maybeOpenReactionWindow,
  type AvailableBattleAct,
  type BattleCreatureState,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type DirectConditionRemovalSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { needsHolesResult } from "../hole-helpers.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
import {
  battleCreatureAfterConditionRemoval,
  combatantsAfterConcentrationSpellEffectsEndedIfNoEffects,
  concentrationSpellEffectSourcesDirectlyApplyingCondition,
} from "../spell-condition-effects-helpers.ts";
import { DIRECT_CONDITION_REMOVAL_CONDITIONS } from "../domain-constants.ts";
import { sameStringSet } from "../spells-profile-shared.ts";
import {
  spellConditionChoiceHole,
  spellTargetHole,
  spellTargetIsLegal,
} from "../spells-holes-fills.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

type DirectConditionRemovalCondition =
  DirectConditionRemovalSpellInvocation["conditionChoices"][number];

type DirectConditionRemovalSpellTargetSelection =
  | { readonly tag: "ok"; readonly targetIds: readonly [CombatantId] }
  | { readonly tag: "needsHoles"; readonly hole: BattleHole }
  | { readonly tag: "invalid"; readonly message: string };

function admitDirectConditionRemoval(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly DirectConditionRemovalSpellInvocation[] {
  const projection = directConditionRemovalProjection(spell);
  if (projection === null) {
    return [];
  }
  return ctx.spellcasting.spellSlots.flatMap(
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
  spell: SpellRecord,
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
  invocation: DirectConditionRemovalSpellInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return targetHole.choices.length === 0
    ? []
    : [
        {
          subject: {
            tag: "bonusActionSpell",
            actorId,
            invocation: directConditionRemovalInvocationRef(invocation),
            mode: { tag: "cast" },
          },
          label: invocation.spell.name,
          summary: directConditionRemovalCastSummary(invocation),
          initialHoles: [targetHole, spellConditionChoiceHole(invocation)],
        },
      ];
}

function directConditionRemovalInvocationRef(
  invocation: DirectConditionRemovalSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "directConditionRemoval",
  };
}

function directConditionRemovalCastSummary(
  invocation: DirectConditionRemovalSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveDirectConditionRemoval(
  input: SpellProcedureProfileResolveInput<
    DirectConditionRemovalSpellInvocation,
    BonusActionSpellBattleResolutionInput
  >,
): BattleResolutionResult {
  if (
    input.fillSet.objectTarget !== undefined ||
    input.fillSet.attackRoll !== undefined ||
    input.fillSet.targetAllocation !== undefined ||
    input.fillSet.attackSequencePartFills.length > 0 ||
    input.fillSet.targetList !== undefined ||
    input.fillSet.damageRoll !== undefined ||
    input.fillSet.attackBurstDamageRoll !== undefined ||
    input.fillSet.healingRoll !== undefined ||
    input.fillSet.skillChoice !== undefined ||
    input.fillSet.abilityChoice !== undefined ||
    input.fillSet.commandOptionChoice !== undefined ||
    input.fillSet.areaChoice !== undefined ||
    input.fillSet.teleportDestination !== undefined ||
    input.fillSet.dancingLightsPlacement !== undefined ||
    input.fillSet.damageTypeChoice !== undefined ||
    input.fillSet.savingThrowOutcomes !== undefined ||
    input.fillSet.movement !== undefined ||
    input.fillSet.thaumaturgyActiveOneMinuteEffectCount !== undefined ||
    input.fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    input.fillSet.damageDispositions.length > 0 ||
    input.fillSet.concentrationSavingThrows.length > 0 ||
    input.fillSet.spellDamageReductionRolls.length > 0
  ) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Direct condition-removal spells use one target fill and one condition choice.",
    );
  }

  const targetSelection = directConditionRemovalSpellTargetSelection(input);
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

  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: targetSelection.targetIds,
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "bonusAction" },
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
  readonly invocation: DirectConditionRemovalSpellInvocation;
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

export const directConditionRemovalProfile: SpellProcedureProfile<
  "directConditionRemoval",
  DirectConditionRemovalSpellInvocation,
  BonusActionSpellBattleResolutionInput
> = {
  procedure: "directConditionRemoval",
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: true,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitDirectConditionRemoval,
  discoverCastAct: discoverDirectConditionRemovalCastAct,
  castSummary: directConditionRemovalCastSummary,
  invocationRef: directConditionRemovalInvocationRef,
  resolve: resolveDirectConditionRemoval,
};
