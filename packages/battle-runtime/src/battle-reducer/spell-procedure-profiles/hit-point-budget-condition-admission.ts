//
// The stagedSaveCondition Spell Procedure Profile: action-time Spell Slot
// casting where creatures chosen in a point-origin Sphere make a Wisdom Saving
// Throw before entering Sleep's two-stage Incapacitated-to-Unconscious
// lifecycle.
//
// RAW anchors:
//   - SRD 5.2.1 Spells: Sleep requires a Wisdom Saving Throw in a 5-foot-radius
//     Sphere, then repeats the save at the end of the target's next turn.
//   - UBIQUITOUS_LANGUAGE.md: Saving Throw, Condition, Unconscious, Magic
//     Action, and Spell Invocation.
import { actionSpellCastCandidate } from "../spell-cast-candidate.ts";

import { movementFeet, MovementFeet } from "@dnd/shared/types";
import type { ActivationPhase } from "@dnd/surface/surface/types";
import {
  SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SpellTargeting,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import { readiedSpellAct } from "../spells-discovery.ts";
import { resolveStagedSaveConditionSpellAct } from "../spells-resolve-save-gates.ts";
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
  DcSourceSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { discoverSpellMetamagicSelections } from "../metamagic-support.ts";
import { spellSavingThrowOutcomeHole } from "../spells-holes-fills.ts";

type StagedSaveConditionSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "stagedSaveCondition" }
>;

type StagedSaveConditionPhase = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
> & {
  readonly ability: "wis";
  readonly attachment: {
    readonly kind: "hole";
    readonly value: {
      readonly kind: "area";
      readonly origin: { readonly kind: "point_within_range" };
      readonly shape: {
        readonly kind: "sphere";
        readonly radiusFeet: number;
      };
    };
  };
  readonly autoSuccessIfTarget: {
    readonly kind: "any";
    readonly predicates: readonly [
      { readonly kind: "does_not_sleep" },
      {
        readonly kind: "has_condition_immunity";
        readonly condition: "exhaustion";
      },
    ];
  };
  readonly onFail: {
    readonly kind: "composite";
    readonly effects: readonly [
      { readonly kind: "apply_condition"; readonly condition: "incapacitated" },
      {
        readonly kind: "target_effect_escape_action";
        readonly actor: "another_creature";
        readonly cost: "action";
        readonly method: "shake_awake";
        readonly outcome: "end_current_effect";
      },
    ];
  };
};

type StagedSaveGatePhase = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
>;
type StagedSaveConditionFailedEffect = Extract<
  StagedSaveGatePhase["onFail"],
  { readonly kind: "composite" }
>["effects"][number];
type StagedSaveConditionRepeatSave = NonNullable<
  StagedSaveGatePhase["repeatSaves"]
>[number];

type StagedSaveConditionResolveInput =
  SpellProcedureProfileResolveInput<StagedSaveConditionSpellInvocation>;

function admitStagedSaveCondition(
  spell: StagedSaveConditionSpellInvocation["spell"],
  ctx: SpellAdmissionContext,
): readonly StagedSaveConditionSpellInvocation[] {
  return supportedPreparedStagedSaveConditionProfile(
    spell,
    ctx.spellCastOptions,
  );
}

export function supportedPreparedStagedSaveConditionProfile(
  spell: StagedSaveConditionSpellInvocation["spell"],
  castOptions: SpellAdmissionContext["spellCastOptions"],
): readonly StagedSaveConditionSpellInvocation[] {
  const hitPointBudgetConditionProfileShape = stagedSaveConditionSpell(spell);
  if (hitPointBudgetConditionProfileShape === null) {
    return [];
  }

  return castOptions.flatMap(
    (slot): readonly StagedSaveConditionSpellInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "stagedSaveCondition",
          spell,
          ability: hitPointBudgetConditionProfileShape.phase.ability,
          dc: hitPointBudgetConditionProfileShape.phase.dc,
          targeting: hitPointBudgetConditionProfileShape.targeting,
          rangeFeet: hitPointBudgetConditionProfileShape.rangeFeet,
          automaticSuccessPredicates:
            hitPointBudgetConditionProfileShape.automaticSuccessPredicates,
          escapeAction: hitPointBudgetConditionProfileShape.escapeAction,
        },
      ];
    },
  );
}

function stagedSaveConditionSpell(
  spell: StagedSaveConditionSpellInvocation["spell"],
): {
  readonly phase: StagedSaveConditionPhase;
  readonly targeting: Extract<
    SpellTargeting,
    { readonly kind: "pointOriginSphere" }
  >;
  readonly rangeFeet: MovementFeet;
  readonly automaticSuccessPredicates: readonly [
    { readonly kind: "doesNotSleep" },
    { readonly kind: "conditionImmunity"; readonly condition: "exhaustion" },
  ];
  readonly escapeAction: {
    readonly kind: "endCurrentEffect";
    readonly actor: "anotherCreature";
    readonly cost: "action";
    readonly method: "shakeAwake";
  };
} | null {
  if (spell.mechanics.family !== "activation") {
    return null;
  }
  const phase = spell.mechanics.phases[0];
  const earlyEnd =
    spell.mechanics.duration.kind === "concentration"
      ? (spell.mechanics.duration.earlyEnd ?? [])
      : [];
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    earlyEnd.length !== 1 ||
    earlyEnd[0]?.kind !== "target_takes_damage" ||
    spell.mechanics.phases.length !== 1 ||
    !isStagedSaveConditionPhase(phase)
  ) {
    return null;
  }

  return {
    phase,
    targeting: {
      kind: "pointOriginSphere",
      radiusFeet: movementFeet(phase.attachment.value.shape.radiusFeet),
    },
    rangeFeet: movementFeet(spell.mechanics.range.feet),
    automaticSuccessPredicates: [
      { kind: "doesNotSleep" },
      { kind: "conditionImmunity", condition: "exhaustion" },
    ],
    escapeAction: {
      kind: "endCurrentEffect",
      actor: "anotherCreature",
      cost: "action",
      method: "shakeAwake",
    },
  };
}

function isStagedSaveConditionPhase(
  phase: ActivationPhase | undefined,
): phase is StagedSaveConditionPhase {
  if (phase?.kind !== "save_gate") return false;
  const repeatSave =
    phase.repeatSaves?.length === 1 ? phase.repeatSaves[0] : undefined;
  return (
    phase.ability === "wis" &&
    phase.dc.kind === "caster_spell_save_dc" &&
    phase.onSuccess.kind === "none" &&
    stagedSaveConditionAttachmentIsSupported(phase.attachment) &&
    hasStagedSaveAutomaticSuccess(phase.autoSuccessIfTarget) &&
    stagedSaveConditionFailureIsSupported(phase.onFail) &&
    stagedSaveConditionRepeatIsSupported(repeatSave)
  );
}

function stagedSaveConditionAttachmentIsSupported(
  attachment: StagedSaveGatePhase["attachment"],
): boolean {
  return (
    attachment.kind === "hole" &&
    attachment.value.kind === "area" &&
    attachment.value.origin.kind === "point_within_range" &&
    attachment.value.shape.kind === "sphere" &&
    attachment.value.shape.radiusFeet ===
      SUPPORTED_POINT_SPHERE_SAVE_GATE_RADIUS_FEET
  );
}

function stagedSaveConditionFailureIsSupported(
  failure: StagedSaveGatePhase["onFail"],
): boolean {
  if (failure.kind !== "composite" || failure.effects.length !== 2) {
    return false;
  }
  return (
    isStagedSaveInitialCondition(failure.effects[0]) &&
    isStagedSaveEscapeAction(failure.effects[1])
  );
}

function isStagedSaveInitialCondition(
  effect: StagedSaveConditionFailedEffect | undefined,
): boolean {
  return (
    effect?.kind === "apply_condition" && effect.condition === "incapacitated"
  );
}

function isStagedSaveEscapeAction(
  effect: StagedSaveConditionFailedEffect | undefined,
): boolean {
  return (
    effect?.kind === "target_effect_escape_action" &&
    effect.actor === "another_creature" &&
    effect.cost === "action" &&
    effect.method === "shake_awake" &&
    effect.outcome === "end_current_effect"
  );
}

function stagedSaveConditionRepeatIsSupported(
  repeatSave: StagedSaveConditionRepeatSave | undefined,
): boolean {
  return (
    repeatSave?.cadence === "end_of_target_turn" &&
    repeatSave.rollMode === undefined &&
    repeatSave.onSuccess === "ends_on_target" &&
    repeatSave.onFailAgain?.kind === "apply_condition" &&
    repeatSave.onFailAgain.condition === "unconscious"
  );
}

function hasStagedSaveAutomaticSuccess(
  automaticSuccess: Extract<
    ActivationPhase,
    { readonly kind: "save_gate" }
  >["autoSuccessIfTarget"],
): boolean {
  return (
    automaticSuccess?.kind === "any" &&
    automaticSuccess.predicates.length === 2 &&
    automaticSuccess.predicates[0]?.kind === "does_not_sleep" &&
    automaticSuccess.predicates[1]?.kind === "has_condition_immunity" &&
    automaticSuccess.predicates[1].condition === "exhaustion"
  );
}

function discoverStagedSaveConditionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<StagedSaveConditionSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  const initialHole = spellSavingThrowOutcomeHole(state, actorId, invocation);
  const baseCastAct = actionSpellCastCandidate(
    actorId,
    invocation.sourceProcedureRef,
    [initialHole],
  );
  const metamagicCastActs =
    actor === undefined
      ? []
      : discoverSpellMetamagicSelections({ actor, invocation }).map(
          (metamagic) => {
            return {
              ...baseCastAct,
              subject: {
                ...baseCastAct.subject,
                metamagic,
              },
              initialHoles: [
                spellSavingThrowOutcomeHole(state, actorId, invocation),
              ],
            };
          },
        );
  const castActs = [baseCastAct, ...metamagicCastActs];
  return [...castActs, ...readiedSpellAct(state, actorId, invocation)];
}

function resolveStagedSaveCondition(
  input: StagedSaveConditionResolveInput,
): BattleResolutionResult {
  return resolveStagedSaveConditionSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

const StagedSaveConditionInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("stagedSaveCondition"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    ability: Schema.Literal("wis"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("pointOriginSphere"),
      radiusFeet: MovementFeet,
    }),
    rangeFeet: MovementFeet,
    automaticSuccessPredicates: Schema.Tuple([
      Schema.Struct({ kind: Schema.Literal("doesNotSleep") }),
      Schema.Struct({
        kind: Schema.Literal("conditionImmunity"),
        condition: Schema.Literal("exhaustion"),
      }),
    ]),
    escapeAction: Schema.Struct({
      kind: Schema.Literal("endCurrentEffect"),
      actor: Schema.Literal("anotherCreature"),
      cost: Schema.Literal("action"),
      method: Schema.Literal("shakeAwake"),
    }),
  }),
);
export const stagedSaveConditionProfile = {
  procedure: "stagedSaveCondition",
  executionSchema: StagedSaveConditionInvocationSchema,
  admit: admitStagedSaveCondition,
  discoverCastAct: discoverStagedSaveConditionCastAct,
  resolve: resolveStagedSaveCondition,
} satisfies SpellProcedureDeclaration<
  "stagedSaveCondition",
  StagedSaveConditionSpellInvocation
>;
import { spellInvocationResourceForCastOption } from "./profile.ts";
