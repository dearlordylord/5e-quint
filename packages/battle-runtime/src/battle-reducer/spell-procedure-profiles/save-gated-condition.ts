// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-condition-save
//
// The saveGatedCondition Spell Procedure Profile: action-time Spell Slot
// casting where affected targets make a Saving Throw before a condition is
// applied.
//
// RAW anchors:
//   - SRD 5.2.1 Spells: Animal Friendship, Blindness/Deafness, Charm Person,
//     Color Spray, Entangle, and Hold Person each use a Saving Throw to gate a
//     condition.
//   - UBIQUITOUS_LANGUAGE.md: Saving Throw, Condition, Magic Action, and Spell
//     Invocation.

import { spellInvocationSchemaUnavailable } from "./profile.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  isTargetListSpellInvocation,
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleCreatureState,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import type { CharacterBattleMetamagicOptionFact } from "../../character-battle-resources.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import {
  CAREFUL_METAMAGIC_EFFECT_KIND,
  discoverSpellMetamagicSelections,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  spellMetamagicApplications,
  spellMetamagicLabel,
} from "../metamagic.ts";
import {
  carefulSpellProtectedTargetsHole,
  heightenedSpellTargetChoiceHole,
  saveGatedConditionHasConditionChoice,
  spellConditionChoiceHole,
  spellSavingThrowAbility,
  spellSavingThrowOutcomeHole,
  spellSavingThrowTargeting,
  spellTargetHole,
  spellTargetListHole,
} from "../spells-holes-fills.ts";
import { supportedPreparedSaveGateConditionProfile } from "./_save-gate-helpers.ts";
import { resolveSaveGateConditionSpellAct } from "../spells-resolve-save-gates.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

type SaveGatedConditionSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedCondition" }
>;

type SaveGatedConditionResolveInput = SpellProcedureProfileResolveInput<
  SaveGatedConditionSpellInvocation,
  ActionSpellBattleResolutionInput
> & {
  readonly metamagicApplications?: readonly CharacterBattleMetamagicOptionFact[];
};

function admitSaveGatedCondition(
  spell: SaveGatedConditionSpellInvocation["spell"],
  ctx: SpellAdmissionContext,
): readonly SaveGatedConditionSpellInvocation[] {
  return supportedPreparedSaveGateConditionProfile(
    spell,
    ctx.actor.origin.spellcasting.spellSlots,
  ).filter(isSaveGatedConditionInvocation);
}

function isSaveGatedConditionInvocation(
  invocation: SupportedSpellInvocation,
): invocation is SaveGatedConditionSpellInvocation {
  return invocation.procedure === "saveGatedCondition";
}

function discoverSaveGatedConditionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: SaveGatedConditionSpellInvocation,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  return invocation.targeting.kind === "singleCombatant" ||
    invocation.targeting.kind === "targetList"
    ? discoverTargetedSaveGatedConditionCastActs(
        state,
        actorId,
        actor,
        invocation,
      )
    : discoverAreaSaveGatedConditionCastActs(state, actorId, actor, invocation);
}

function discoverTargetedSaveGatedConditionCastActs(
  state: BattleState,
  actorId: CombatantId,
  actor: BattleCreatureState | undefined,
  invocation: SaveGatedConditionSpellInvocation,
): readonly AvailableBattleAct[] {
  const targetHole =
    invocation.targeting.kind === "singleCombatant"
      ? spellTargetHole(state, actorId, invocation)
      : isTargetListSpellInvocation(invocation)
        ? spellTargetListHole(state, actorId, invocation)
        : null;
  if (targetHole === null || targetHole.choices.length === 0) {
    return [];
  }
  const conditionChoiceHoles = saveGatedConditionChoiceHoles(invocation);
  const baseCastAct = saveGatedConditionCastAct(
    actorId,
    invocation,
    [targetHole, ...conditionChoiceHoles],
    invocation.spell.name,
    saveGatedConditionCastSummaryWithSavingThrow(invocation),
  );
  return [
    baseCastAct,
    ...saveGatedConditionMetamagicCastActs({
      state,
      actorId,
      actor,
      invocation,
      baseCastAct,
      metamagicInitialHoles: (saveMetamagicSelectionHoles) =>
        saveMetamagicSelectionHoles.length === 0
          ? [targetHole]
          : [targetHole, ...saveMetamagicSelectionHoles],
      conditionChoiceHoles,
    }),
  ];
}

function discoverAreaSaveGatedConditionCastActs(
  state: BattleState,
  actorId: CombatantId,
  actor: BattleCreatureState | undefined,
  invocation: SaveGatedConditionSpellInvocation,
): readonly AvailableBattleAct[] {
  const savingThrowHole = spellSavingThrowOutcomeHole(
    state,
    actorId,
    invocation,
  );
  const conditionChoiceHoles = saveGatedConditionChoiceHoles(invocation);
  const baseCastAct = saveGatedConditionCastAct(
    actorId,
    invocation,
    [savingThrowHole, ...conditionChoiceHoles],
    invocation.spell.name,
    saveGatedConditionCastSummaryWithSavingThrow(invocation),
  );
  return [
    baseCastAct,
    ...saveGatedConditionMetamagicCastActs({
      state,
      actorId,
      actor,
      invocation,
      baseCastAct,
      metamagicInitialHoles: (saveMetamagicSelectionHoles) =>
        saveMetamagicSelectionHoles.length === 0
          ? [savingThrowHole]
          : saveMetamagicSelectionHoles,
      conditionChoiceHoles,
    }),
  ];
}

function saveGatedConditionChoiceHoles(
  invocation: SaveGatedConditionSpellInvocation,
): readonly BattleHole[] {
  return saveGatedConditionHasConditionChoice(invocation)
    ? [spellConditionChoiceHole(invocation)]
    : [];
}

function saveGatedConditionMetamagicCastActs(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly actor: BattleCreatureState | undefined;
  readonly invocation: SaveGatedConditionSpellInvocation;
  readonly baseCastAct: AvailableBattleAct;
  readonly metamagicInitialHoles: (
    saveMetamagicSelectionHoles: readonly BattleHole[],
  ) => readonly BattleHole[];
  readonly conditionChoiceHoles: readonly BattleHole[];
}): readonly AvailableBattleAct[] {
  const actor = input.actor;
  if (actor === undefined) {
    return [];
  }
  return discoverSpellMetamagicSelections({
    actor,
    invocation: input.invocation,
  }).map((metamagic) => {
    const applications = spellMetamagicApplications(actor, metamagic);
    const metamagicInitialHoles = saveGatedConditionMetamagicInitialHoles(
      input.state,
      input.actorId,
      input.invocation,
      applications,
    );
    const label = spellMetamagicLabel(metamagic);
    return {
      ...input.baseCastAct,
      subject: {
        ...input.baseCastAct.subject,
        metamagic,
      },
      initialHoles: [
        ...input.metamagicInitialHoles(metamagicInitialHoles),
        ...input.conditionChoiceHoles,
      ],
      label: `${input.invocation.spell.name} (${label})`,
      summary: `${saveGatedConditionCastSummaryWithSavingThrow(
        input.invocation,
      )} Cast with ${label}.`,
    };
  });
}

function saveGatedConditionCastAct(
  actorId: CombatantId,
  invocation: SaveGatedConditionSpellInvocation,
  initialHoles: readonly BattleHole[],
  label: string,
  summary: string,
): AvailableBattleAct {
  return {
    subject: {
      tag: "actionSpell",
      actorId,
      invocation: saveGatedConditionInvocationRef(invocation),
      mode: { tag: "cast" },
    },
    label,
    summary,
    initialHoles,
  };
}

function saveGatedConditionMetamagicInitialHoles(
  state: BattleState,
  actorId: CombatantId,
  invocation: SaveGatedConditionSpellInvocation,
  metamagicApplications: readonly CharacterBattleMetamagicOptionFact[],
): readonly BattleHole[] {
  const targeting = spellSavingThrowTargeting(invocation);
  const holes: BattleHole[] = [];
  if (
    targeting.kind !== "singleCombatant" &&
    metamagicApplications.some(
      (application) => application.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
    )
  ) {
    holes.push(carefulSpellProtectedTargetsHole(state, actorId, invocation));
  }
  if (
    targeting.kind !== "singleCombatant" &&
    metamagicApplications.some(
      (application) =>
        application.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
    )
  ) {
    holes.push(heightenedSpellTargetChoiceHole(state, actorId, invocation));
  }
  return holes;
}

function saveGatedConditionInvocationRef(
  invocation: SaveGatedConditionSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "saveGatedCondition",
  };
}

function saveGatedConditionCastSummary(
  invocation: SaveGatedConditionSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function saveGatedConditionCastSummaryWithSavingThrow(
  invocation: SaveGatedConditionSpellInvocation,
): string {
  return `${saveGatedConditionCastSummary(
    invocation,
  )} Table-supplied affected targets make ${spellSavingThrowAbility(
    invocation,
  ).toUpperCase()} Saving Throws.`;
}

function resolveSaveGatedCondition(
  input: SaveGatedConditionResolveInput,
): BattleResolutionResult {
  return resolveSaveGateConditionSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
}

export const saveGatedConditionProfile = {
  procedure: "saveGatedCondition",
  invocationSchema: spellInvocationSchemaUnavailable(),
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: true,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitSaveGatedCondition,
  discoverCastAct: discoverSaveGatedConditionCastAct,
  castSummary: saveGatedConditionCastSummary,
  invocationRef: saveGatedConditionInvocationRef,
  resolve: resolveSaveGatedCondition,
} satisfies SpellProcedureProfile<
  "saveGatedCondition",
  SaveGatedConditionSpellInvocation,
  ActionSpellBattleResolutionInput
>;
