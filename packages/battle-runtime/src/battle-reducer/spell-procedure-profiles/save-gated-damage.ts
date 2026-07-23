import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-damage-save-or-attack
import {
  DamageTypeSchema,
  DcSourceSchema,
  DiceExprSchema,
} from "@dnd/surface/surface/schema";
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-careful-save-protection
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-heightened-save-disadvantage
// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.METAMAGIC_CAREFUL_SAVE_PROTECTION BATTLE.FEATURE.METAMAGIC_HEIGHTENED_SAVE_DISADVANTAGE
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
import { type CombatantId } from "../../identity.ts";
import {
  supportedCantripSaveGateDamageProfile,
  supportedPreparedSaveGateDamageProfile,
} from "./_save-gate-helpers.ts";
import { resolveSaveGateDamageSpellAct } from "../spells-resolve-save-gates.ts";
import { resolveTriggeredReactionSaveGatedDamage } from "../dispatcher.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import type { TriggeredReactionSaveGatedDamageResolution } from "./resolution-contract.ts";
import { Schema } from "effect";
import {
  AbilitySchema,
  ClassCantripSpellAccessSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  PreparedSpellAccessSchema,
  SpellFailedSavePostDamageRiderSchema,
  SpellPostSaveAreaEffectSchema,
  SpellSavingThrowRollModeRuleSchema,
  SpellSlotInvocationResourceSchema,
  SpellDamageSchema,
} from "../codec-building-blocks.ts";
import { SpellFailedSaveConditionEffectExecutionSchema } from "./save-gated-condition.ts";
import {
  type BattleActDiscoveryCandidate,
  type BattleCreatureState,
  type BattleExecutableSpellInvocation,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  CAREFUL_METAMAGIC_EFFECT_KIND,
  discoverSpellMetamagicSelections,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  spellMetamagicApplications,
} from "../metamagic-support.ts";
import {
  carefulSpellProtectedTargetsHole,
  heightenedSpellTargetChoiceHole,
  spellAbilityChoiceHole,
  spellSavingThrowOutcomeHole,
  spellSavingThrowTargeting,
  spellTargetHole,
} from "../spells-holes-fills.ts";
import {
  spellAdmissionCharacterLevel,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";

type SaveGatedDamageSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedDamage" }
>;

type SaveGatedDamageResolveInput =
  SpellProcedureProfileResolveInput<SaveGatedDamageSpellInvocation>;

function admitSaveGatedDamage(
  spell: BattleSpellAdmissionSource,
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
  invocation: BattleExecutableSpellInvocation<SaveGatedDamageSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
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
  invocation: BattleExecutableSpellInvocation<SaveGatedDamageSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  if (targetHole.choices.length === 0) {
    return [];
  }
  const baseCastAct = saveGatedDamageCastAct(actorId, invocation, [
    targetHole,
    ...saveGatedDamageAbilityChoiceHoles(invocation),
  ]);
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
  invocation: BattleExecutableSpellInvocation<SaveGatedDamageSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const savingThrowHole = spellSavingThrowOutcomeHole(
    state,
    actorId,
    invocation,
  );
  const baseCastAct = saveGatedDamageCastAct(actorId, invocation, [
    savingThrowHole,
    ...saveGatedDamageAbilityChoiceHoles(invocation),
  ]);
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
  readonly invocation: BattleExecutableSpellInvocation<SaveGatedDamageSpellInvocation>;
  readonly baseCastAct: BattleActDiscoveryCandidate;
  readonly baseHoles: readonly BattleHole[];
}): readonly BattleActDiscoveryCandidate[] {
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
    };
  });
}

function saveGatedDamageCastAct(
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<SaveGatedDamageSpellInvocation>,
  initialHoles: readonly BattleHole[],
): BattleActDiscoveryCandidate {
  return {
    subject: {
      tag: "actionSpell",
      actorId,
      procedureRef: invocation.sourceProcedureRef,
      mode: { tag: "cast" },
    },
    initialHoles,
  };
}

function saveGatedDamageMetamagicInitialHoles(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SaveGatedDamageSpellInvocation>,
  metamagicApplications: readonly SpellMetamagicApplicationFact[],
): readonly BattleHole[] {
  const targeting = spellSavingThrowTargeting(invocation);
  const holes: BattleHole[] = [
    ...saveGatedDamageAbilityChoiceHoles(invocation),
  ];
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

function saveGatedDamageAbilityChoiceHoles(
  invocation: BattleExecutableSpellInvocation<SaveGatedDamageSpellInvocation>,
): readonly BattleHole[] {
  return invocation.failedSaveAbilityChoices === null
    ? []
    : [spellAbilityChoiceHole(invocation)];
}

function readiedSaveGatedDamageActs(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<SaveGatedDamageSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  if (state.readiedSpells.has(actorId)) {
    return [];
  }
  return BATTLE_READIED_SPELL_TRIGGERS.map((trigger) => ({
    subject: {
      tag: "actionSpell",
      actorId,
      procedureRef: invocation.sourceProcedureRef,
      mode: { tag: "ready", trigger },
    },
    initialHoles: [],
  }));
}

function resolveSaveGatedDamage(
  input: SaveGatedDamageResolveInput,
): BattleResolutionResult {
  if (isTriggeredReactionSaveGatedDamageResolution(input)) {
    return resolveTriggeredReactionSaveGatedDamage(
      { ...input.input, invocation: input.invocation },
      input.fillSet,
    );
  }
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

function isTriggeredReactionSaveGatedDamageResolution(
  input: SaveGatedDamageResolveInput,
): input is TriggeredReactionSaveGatedDamageResolution {
  return (
    input.input.subject.tag === "runtimeCommand" &&
    input.input.subject.command === "castTriggeredReactionSpell"
  );
}

const ActionSpellInvocationCastingTimeSchema = Schema.Struct({
  kind: Schema.Literal("action"),
});
const ReactionSpellInvocationCastingTimeSchema = Schema.Struct({
  kind: Schema.Literal("reaction"),
});

const SaveGatedDamageInvocationSchema = spellProcedureExecutionSchema(
  Schema.Union(
    Schema.Struct({
      access: ClassCantripSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("saveGatedDamage"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      castingTime: ActionSpellInvocationCastingTimeSchema,
      ability: AbilitySchema,
      dc: DcSourceSchema,
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
        expr: DiceExprSchema,
        damageType: DamageTypeSchema,
      }),
      additionalDamageComponents: Schema.Array(SpellDamageSchema),
      successDamage: Schema.Literal("none", "half"),
      rangeFeet: MovementFeet,
      failedSavePostDamageRiders: Schema.Array(
        SpellFailedSavePostDamageRiderSchema,
      ),
      failedSaveConditionEffects: Schema.Array(
        SpellFailedSaveConditionEffectExecutionSchema,
      ),
      failedSaveAbilityChoices: Schema.NullOr(Schema.Array(AbilitySchema)),
      saveRollModeRule: Schema.NullOr(SpellSavingThrowRollModeRuleSchema),
      postSaveAreaEffect: Schema.optionalWith(SpellPostSaveAreaEffectSchema, {
        exact: true,
      }),
    }),
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: SpellSlotInvocationResourceSchema,
      procedure: Schema.Literal("saveGatedDamage"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      castingTime: Schema.Union(
        ActionSpellInvocationCastingTimeSchema,
        ReactionSpellInvocationCastingTimeSchema,
      ),
      ability: AbilitySchema,
      dc: DcSourceSchema,
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
        expr: DiceExprSchema,
        damageType: DamageTypeSchema,
      }),
      additionalDamageComponents: Schema.Array(SpellDamageSchema),
      successDamage: Schema.Literal("none", "half"),
      rangeFeet: MovementFeet,
      failedSavePostDamageRiders: Schema.Array(
        SpellFailedSavePostDamageRiderSchema,
      ),
      failedSaveConditionEffects: Schema.Array(
        SpellFailedSaveConditionEffectExecutionSchema,
      ),
      failedSaveAbilityChoices: Schema.NullOr(Schema.Array(AbilitySchema)),
      saveRollModeRule: Schema.NullOr(SpellSavingThrowRollModeRuleSchema),
      postSaveAreaEffect: Schema.optionalWith(SpellPostSaveAreaEffectSchema, {
        exact: true,
      }),
    }),
  ),
);
export const saveGatedDamageProfile = {
  procedure: "saveGatedDamage",
  executionSchema: SaveGatedDamageInvocationSchema,
  metamagicCompatibility: "bonusActionRewrite",
  admit: admitSaveGatedDamage,
  discoverCastAct: discoverSaveGatedDamageCastAct,
  resolve: resolveSaveGatedDamage,
} satisfies SpellProcedureDeclaration<
  "saveGatedDamage",
  SaveGatedDamageSpellInvocation
>;
import type { SpellMetamagicApplicationFact } from "../metamagic-support.ts";
