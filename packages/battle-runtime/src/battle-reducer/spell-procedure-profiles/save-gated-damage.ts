// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-damage-save-or-attack
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-careful-save-protection
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-heightened-save-disadvantage
//
// The saveGatedDamage Spell Procedure Profile: action-time cantrip or Spell
// Slot casting where affected targets make a Saving Throw before spell damage
// is applied.
//
// RAW anchors:
//   - SRD 5.2.1 Spells: Acid Splash, Burning Hands, Fireball, Sacred Flame,
//     and Shatter each use a Saving Throw to gate damage.
//   - UBIQUITOUS_LANGUAGE.md: Saving Throw, Damage Type, Magic Action, and
//     Spell Invocation.

import { BATTLE_READIED_SPELL_TRIGGERS } from "../../battle-interrupt-triggers.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  interruptTriggerLabel,
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
  spellTargetHole,
} from "../spells-holes-fills.ts";
import {
  supportedCantripSaveGateDamageProfile,
  supportedPreparedSaveGateDamageProfile,
} from "./_save-gate-helpers.ts";
import { resolveSaveGateDamageSpellAct } from "../spells-resolve-save-gates.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellAdmissionCharacterLevel } from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import {
  BattleRuntimeObjectSchema,
  ClassCantripSpellAccessSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  PreparedSpellAccessSchema,
  SpellFailedSavePostDamageRiderSchema,
  SpellPostSaveAreaEffectSchema,
  SpellSavingThrowRollModeRuleSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type SaveGatedDamageSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedDamage" }
>;

type SaveGatedDamageResolveInput = SpellProcedureProfileResolveInput<
  SaveGatedDamageSpellInvocation,
  ActionSpellBattleResolutionInput | BonusActionSpellBattleResolutionInput
> & {
  readonly actionCostOverride?: "magicAction" | "bonusAction";
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
};

function admitSaveGatedDamage(
  spell: SaveGatedDamageSpellInvocation["spell"],
  ctx: SpellAdmissionContext,
): readonly SaveGatedDamageSpellInvocation[] {
  const invocations =
    spell.mechanics.level === 0
      ? supportedCantripSaveGateDamageProfile(
          spell,
          spellAdmissionCharacterLevel(ctx),
        )
      : supportedPreparedSaveGateDamageProfile(
          spell,
          ctx.actor.origin.spellcasting.spellSlots,
        );
  return invocations.filter(isSaveGatedDamageInvocation);
}

function isSaveGatedDamageInvocation(
  invocation: SupportedSpellInvocation,
): invocation is SaveGatedDamageSpellInvocation {
  return invocation.procedure === "saveGatedDamage";
}

function discoverSaveGatedDamageCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: SaveGatedDamageSpellInvocation,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  const castActs =
    invocation.targeting.kind === "singleCombatant"
      ? discoverSingleTargetSaveGatedDamageCastActs(
          state,
          actorId,
          actor,
          invocation,
        )
      : discoverAreaSaveGatedDamageCastActs(state, actorId, actor, invocation);
  return [
    ...castActs,
    ...readiedSaveGatedDamageActs(state, actorId, invocation),
  ];
}

function discoverSingleTargetSaveGatedDamageCastActs(
  state: BattleState,
  actorId: CombatantId,
  actor: BattleCreatureState | undefined,
  invocation: SaveGatedDamageSpellInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  if (targetHole.choices.length === 0) {
    return [];
  }
  const baseCastAct = saveGatedDamageCastAct(
    actorId,
    invocation,
    [targetHole],
    invocation.spell.name,
    saveGatedDamageCastSummaryWithSavingThrow(invocation),
  );
  return [
    baseCastAct,
    ...saveGatedDamageMetamagicCastActs({
      state,
      actorId,
      actor,
      invocation,
      baseCastAct,
      baseHoles: [targetHole],
    }),
  ];
}

function discoverAreaSaveGatedDamageCastActs(
  state: BattleState,
  actorId: CombatantId,
  actor: BattleCreatureState | undefined,
  invocation: SaveGatedDamageSpellInvocation,
): readonly AvailableBattleAct[] {
  const savingThrowHole = spellSavingThrowOutcomeHole(
    state,
    actorId,
    invocation,
  );
  const baseCastAct = saveGatedDamageCastAct(
    actorId,
    invocation,
    [savingThrowHole],
    invocation.spell.name,
    saveGatedDamageCastSummaryWithSavingThrow(invocation),
  );
  return [
    baseCastAct,
    ...saveGatedDamageMetamagicCastActs({
      state,
      actorId,
      actor,
      invocation,
      baseCastAct,
      baseHoles: [savingThrowHole],
    }),
  ];
}

function saveGatedDamageMetamagicCastActs(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly actor: BattleCreatureState | undefined;
  readonly invocation: SaveGatedDamageSpellInvocation;
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
    const metamagicInitialHoles = saveGatedDamageMetamagicInitialHoles(
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
      summary: `${saveGatedDamageCastSummaryWithSavingThrow(
        input.invocation,
      )} Cast with ${label}.`,
    };
  });
}

function saveGatedDamageCastAct(
  actorId: CombatantId,
  invocation: SaveGatedDamageSpellInvocation,
  initialHoles: readonly BattleHole[],
  label: string,
  summary: string,
): AvailableBattleAct {
  return {
    subject: {
      tag: "actionSpell",
      actorId,
      invocation: saveGatedDamageInvocationRef(invocation),
      mode: { tag: "cast" },
    },
    label,
    summary,
    initialHoles,
  };
}

function saveGatedDamageMetamagicInitialHoles(
  state: BattleState,
  actorId: CombatantId,
  invocation: SaveGatedDamageSpellInvocation,
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

function readiedSaveGatedDamageActs(
  state: BattleState,
  actorId: CombatantId,
  invocation: SaveGatedDamageSpellInvocation,
): readonly AvailableBattleAct[] {
  if (state.readiedSpells.has(actorId)) {
    return [];
  }
  return BATTLE_READIED_SPELL_TRIGGERS.map((trigger) => ({
    subject: {
      tag: "actionSpell",
      actorId,
      invocation: saveGatedDamageInvocationRef(invocation),
      mode: { tag: "ready", trigger },
    },
    label: `Ready ${invocation.spell.name}`,
    summary: `Ready ${invocation.spell.name} for ${interruptTriggerLabel(trigger)}; holding the spell requires Concentration until the start of your next turn.`,
    initialHoles: [],
  }));
}

function saveGatedDamageInvocationRef(
  invocation: SaveGatedDamageSpellInvocation,
): SpellInvocationRef {
  return invocation.resource.tag === "spellSlot"
    ? {
        tag: "spellSlot",
        spellId: spellId(invocation.spell.id),
        slotLevel: invocation.resource.slotLevel,
        procedure: "saveGatedDamage",
      }
    : {
        tag: "cantrip",
        spellId: spellId(invocation.spell.id),
        procedure: "saveGatedDamage",
      };
}

function saveGatedDamageCastSummary(
  invocation: SaveGatedDamageSpellInvocation,
): string {
  return invocation.resource.tag === "spellSlot"
    ? `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`
    : `Cast ${invocation.spell.name} as a cantrip.`;
}

function saveGatedDamageCastSummaryWithSavingThrow(
  invocation: SaveGatedDamageSpellInvocation,
): string {
  return `${saveGatedDamageCastSummary(
    invocation,
  )} Table-supplied affected targets make ${spellSavingThrowAbility(
    invocation,
  ).toUpperCase()} Saving Throws.`;
}

function resolveSaveGatedDamage(
  input: SaveGatedDamageResolveInput,
): BattleResolutionResult {
  return resolveSaveGateDamageSpellAct({
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

const ActionSpellInvocationCastingTimeSchema = Schema.Struct({
  kind: Schema.Literal("action"),
});
const ReactionSpellInvocationCastingTimeSchema = Schema.Struct({
  kind: Schema.Literal("reaction"),
});

const SaveGatedDamageInvocationSchema = spellProcedureInvocationSchema<
  Extract<SupportedSpellInvocation, { readonly procedure: "saveGatedDamage" }>
>(
  Schema.Union(
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("saveGatedDamage"),
      spell: BattleRuntimeObjectSchema,
      castingTime: ActionSpellInvocationCastingTimeSchema,
      ability: Schema.String,
      dc: BattleRuntimeObjectSchema,
      targeting: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("singleCombatant"),
        }),
        Schema.Struct({
          kind: Schema.Literal("targetList"),
          minTargets: Schema.Literal(1),
          maxTargets: Schema.Number,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginSphere"),
          radiusFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginCubeExcludingCaster"),
          sideFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginCube"),
          sideFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("selfOriginCube"),
          sideFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("selfOriginCone"),
          lengthFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("selfOriginLine"),
          lengthFeet: MovementFeet,
          widthFeet: MovementFeet,
        }),
      ),
      damage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
        damageType: Schema.String,
      }),
      successDamage: Schema.Literal("none", "half"),
      rangeFeet: MovementFeet,
      failedSavePostDamageRiders: Schema.Array(
        SpellFailedSavePostDamageRiderSchema,
      ),
      saveRollModeRule: Schema.NullOr(SpellSavingThrowRollModeRuleSchema),
      postSaveAreaEffect: Schema.optionalWith(SpellPostSaveAreaEffectSchema, {
        exact: true,
      }),
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("saveGatedDamage"),
      spell: BattleRuntimeObjectSchema,
      castingTime: Schema.Union(
        ActionSpellInvocationCastingTimeSchema,
        ReactionSpellInvocationCastingTimeSchema,
      ),
      ability: Schema.String,
      dc: BattleRuntimeObjectSchema,
      targeting: Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("singleCombatant"),
        }),
        Schema.Struct({
          kind: Schema.Literal("targetList"),
          minTargets: Schema.Literal(1),
          maxTargets: Schema.Number,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginSphere"),
          radiusFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginCubeExcludingCaster"),
          sideFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("pointOriginCube"),
          sideFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("selfOriginCube"),
          sideFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("selfOriginCone"),
          lengthFeet: MovementFeet,
        }),
        Schema.Struct({
          kind: Schema.Literal("selfOriginLine"),
          lengthFeet: MovementFeet,
          widthFeet: MovementFeet,
        }),
      ),
      damage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
        damageType: Schema.String,
      }),
      successDamage: Schema.Literal("none", "half"),
      rangeFeet: MovementFeet,
      failedSavePostDamageRiders: Schema.Array(
        SpellFailedSavePostDamageRiderSchema,
      ),
      saveRollModeRule: Schema.NullOr(SpellSavingThrowRollModeRuleSchema),
      postSaveAreaEffect: Schema.optionalWith(SpellPostSaveAreaEffectSchema, {
        exact: true,
      }),
    }),
  ),
);
export const saveGatedDamageProfile = {
  procedure: "saveGatedDamage",
  invocationSchema: SaveGatedDamageInvocationSchema,
  metamagicCompatibility: "bonusActionRewrite",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: true,
  knownWillingTargetSpellIds: [],
  admit: admitSaveGatedDamage,
  discoverCastAct: discoverSaveGatedDamageCastAct,
  castSummary: saveGatedDamageCastSummary,
  invocationRef: saveGatedDamageInvocationRef,
  resolve: resolveSaveGatedDamage,
} satisfies SpellProcedureProfile<
  "saveGatedDamage",
  SaveGatedDamageSpellInvocation,
  ActionSpellBattleResolutionInput | BonusActionSpellBattleResolutionInput
>;
