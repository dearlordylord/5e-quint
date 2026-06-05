// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-save-gated-condition-immunity
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-heightened-save-disadvantage
//
// The saveGatedConditionImmunity Spell Procedure Profile: action-time Spell
// Slot casting where Humanoid area targets make a Saving Throw before failed
// saves gain condition Immunity.
//
// RAW anchors:
//   - SRD 5.2.1 Spells: Calm Emotions has Humanoids in a point-origin Sphere
//     make a Charisma Saving Throw; failed-save targets can gain Immunity to
//     the Charmed and Frightened conditions until the spell ends.
//   - SRD 5.2.1 Rules Glossary / Playing the Game: Immunity to a condition
//     means the condition does not affect the creature.
//   - UBIQUITOUS_LANGUAGE.md: Saving Throw, Condition Immunity, Magic Action,
//     and Spell Invocation.

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleCreatureState,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import {
  type SpellMetamagicApplicationFact,
  CAREFUL_METAMAGIC_EFFECT_KIND,
  discoverSpellMetamagicSelections,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  spellMetamagicApplications,
  spellMetamagicLabel,
} from "../metamagic-support.ts";
import {
  carefulSpellProtectedTargetsHole,
  heightenedSpellTargetChoiceHole,
  spellSavingThrowAbility,
  spellSavingThrowOutcomeHole,
  spellSavingThrowTargeting,
} from "../spells-holes-fills.ts";
import { supportedPreparedSaveGateConditionImmunityProfile } from "./_save-gate-helpers.ts";
import { resolveSaveGateConditionImmunitySpellAct } from "../spells-resolve-save-gates.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import {
  AbilitySchema,
  BattleRuntimeObjectSchema,
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type SaveGatedConditionImmunitySpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedConditionImmunity" }
>;

type SaveGatedConditionImmunityResolveInput = SpellProcedureProfileResolveInput<
  SaveGatedConditionImmunitySpellInvocation,
  ActionSpellBattleResolutionInput | BonusActionSpellBattleResolutionInput
> & {
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
};

function admitSaveGatedConditionImmunity(
  spell: SaveGatedConditionImmunitySpellInvocation["spell"],
  ctx: SpellAdmissionContext,
): readonly SaveGatedConditionImmunitySpellInvocation[] {
  return supportedPreparedSaveGateConditionImmunityProfile(
    ctx.actor.combatantId,
    spell,
    ctx.actor.origin.spellcasting.spellSlots,
  ).filter(isSaveGatedConditionImmunityInvocation);
}

function isSaveGatedConditionImmunityInvocation(
  invocation: SupportedSpellInvocation,
): invocation is SaveGatedConditionImmunitySpellInvocation {
  return invocation.procedure === "saveGatedConditionImmunity";
}

function discoverSaveGatedConditionImmunityCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: SaveGatedConditionImmunitySpellInvocation,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  const savingThrowHole = spellSavingThrowOutcomeHole(
    state,
    actorId,
    invocation,
  );
  const baseCastAct = saveGatedConditionImmunityCastAct(
    actorId,
    invocation,
    [savingThrowHole],
    invocation.spell.name,
    saveGatedConditionImmunityCastSummaryWithSavingThrow(invocation),
  );
  return [
    baseCastAct,
    ...saveGatedConditionImmunityMetamagicCastActs({
      state,
      actorId,
      actor,
      invocation,
      baseCastAct,
      baseHoles: [savingThrowHole],
    }),
  ];
}

function saveGatedConditionImmunityMetamagicCastActs(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly actor: BattleCreatureState | undefined;
  readonly invocation: SaveGatedConditionImmunitySpellInvocation;
  readonly baseCastAct: AvailableBattleAct;
  readonly baseHoles: readonly BattleHole[];
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
    const metamagicInitialHoles =
      saveGatedConditionImmunityMetamagicInitialHoles(
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
      initialHoles:
        metamagicInitialHoles.length === 0
          ? input.baseHoles
          : metamagicInitialHoles,
      label: `${input.invocation.spell.name} (${label})`,
      summary: `${saveGatedConditionImmunityCastSummaryWithSavingThrow(
        input.invocation,
      )} Cast with ${label}.`,
    };
  });
}

function saveGatedConditionImmunityCastAct(
  actorId: CombatantId,
  invocation: SaveGatedConditionImmunitySpellInvocation,
  initialHoles: readonly BattleHole[],
  label: string,
  summary: string,
): AvailableBattleAct {
  return {
    subject: {
      tag: "actionSpell",
      actorId,
      invocation: saveGatedConditionImmunityInvocationRef(invocation),
      mode: { tag: "cast" },
    },
    label,
    summary,
    initialHoles,
  };
}

function saveGatedConditionImmunityMetamagicInitialHoles(
  state: BattleState,
  actorId: CombatantId,
  invocation: SaveGatedConditionImmunitySpellInvocation,
  metamagicApplications: readonly SpellMetamagicApplicationFact[],
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

function saveGatedConditionImmunityInvocationRef(
  invocation: SaveGatedConditionImmunitySpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "saveGatedConditionImmunity",
  };
}

function saveGatedConditionImmunityCastSummary(
  invocation: SaveGatedConditionImmunitySpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function saveGatedConditionImmunityCastSummaryWithSavingThrow(
  invocation: SaveGatedConditionImmunitySpellInvocation,
): string {
  return `${saveGatedConditionImmunityCastSummary(
    invocation,
  )} Table-supplied affected targets make ${spellSavingThrowAbility(
    invocation,
  ).toUpperCase()} Saving Throws.`;
}

function resolveSaveGatedConditionImmunity(
  input: SaveGatedConditionImmunityResolveInput,
): BattleResolutionResult {
  return resolveSaveGateConditionImmunitySpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    ...(input.actionCostOverride === undefined
      ? {}
      : { actionCostOverride: input.actionCostOverride }),
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
}

const SaveGatedConditionImmunityInvocationSchema =
  spellProcedureInvocationSchema<
    Extract<
      SupportedSpellInvocation,
      { readonly procedure: "saveGatedConditionImmunity" }
    >
  >(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("saveGatedConditionImmunity"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("magicAction"),
      ability: AbilitySchema,
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("pointOriginSphere"),
        radiusFeet: MovementFeet,
      }),
      targetCreatureTypes: Schema.Array(Schema.String),
      activeEffects: Schema.Tuple(
        BattleRuntimeObjectSchema,
        BattleRuntimeObjectSchema,
      ),
      rangeFeet: MovementFeet,
    }),
  );
export const saveGatedConditionImmunityProfile = {
  procedure: "saveGatedConditionImmunity",
  invocationSchema: SaveGatedConditionImmunityInvocationSchema,
  metamagicCompatibility: "bonusActionRewrite",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitSaveGatedConditionImmunity,
  discoverCastAct: discoverSaveGatedConditionImmunityCastAct,
  castSummary: saveGatedConditionImmunityCastSummary,
  invocationRef: saveGatedConditionImmunityInvocationRef,
  resolve: resolveSaveGatedConditionImmunity,
} satisfies SpellProcedureProfile<
  "saveGatedConditionImmunity",
  SaveGatedConditionImmunitySpellInvocation,
  ActionSpellBattleResolutionInput | BonusActionSpellBattleResolutionInput
>;
