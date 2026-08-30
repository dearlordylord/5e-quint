import { optionalProperty } from "../../optional-property.ts";
import { discoverSavingThrowSpellCastActs } from "../saving-throw-metamagic-holes.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.metamagic-heightened-save-disadvantage
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
//
// The persistentAreaSaveCondition Spell Procedure Profile: action-time Spell Slot
// casting that creates a one-minute ground-area Difficult Terrain hazard and
// gates Prone application behind Dexterity Saving Throws when the profileShape
// appears, when a creature enters it, and when a creature ends its turn there.
//
// RAW anchors:
//   - SRD 5.2.1 Spells: Grease creates a 10-foot square of Difficult Terrain
//     for 1 minute; creatures standing there when it appears, entering it, or
//     ending their turn there make Dexterity Saving Throws or fall Prone.
//   - UBIQUITOUS_LANGUAGE.md: Difficult Terrain, Saving Throw, Condition,
//     Prone, Magic Action, and Spell Invocation.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, MovementFeet } from "@dnd/shared/types";
import {
  type BattleSpellAdmissionSource,
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import { resolvePersistentAreaSaveConditionSpellAct } from "../spells-resolve-save-gates.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DcSourceSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { Result, Schema } from "effect";

type PersistentAreaSaveConditionSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "persistentAreaSaveCondition" }
>;

type PersistentAreaSaveConditionMechanics = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type PersistentAreaSaveConditionPhase = Extract<
  NonNullable<PersistentAreaSaveConditionMechanics["initialPhase"]>,
  { readonly kind: "save_gate" }
> & {
  readonly ability: "dex";
  readonly attachment: {
    readonly kind: "hole";
    readonly value: {
      readonly kind: "area";
      readonly origin: { readonly kind: "point_within_range" };
      readonly shape: {
        readonly kind: "ground_square";
        readonly sideFeet: 10;
      };
    };
  };
};

type PersistentAreaSaveConditionResolveInput =
  SpellProcedureProfileResolveInput<PersistentAreaSaveConditionSpellInvocation>;

function admitPersistentAreaSaveCondition(
  spell: PersistentAreaSaveConditionSpellInvocation["spell"],
  ctx: SpellAdmissionContext,
): readonly PersistentAreaSaveConditionSpellInvocation[] {
  return supportedPreparedPersistentAreaSaveConditionProfile(
    spell,
    ctx.spellCastOptions,
  );
}

export function supportedPreparedPersistentAreaSaveConditionProfile(
  spell: PersistentAreaSaveConditionSpellInvocation["spell"],
  castOptions: SpellAdmissionContext["spellCastOptions"],
): readonly PersistentAreaSaveConditionSpellInvocation[] {
  const profileShape = persistentAreaSaveConditionSpell(spell);
  if (profileShape === null) {
    return [];
  }

  return castOptions.flatMap(
    (slot): readonly PersistentAreaSaveConditionSpellInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "persistentAreaSaveCondition",
          spell,
          ability: profileShape.phase.ability,
          dc: profileShape.phase.dc,
          targeting: profileShape.targeting,
          durationTicks: profileShape.durationTicks,
          rangeFeet: profileShape.rangeFeet,
        },
      ];
    },
  );
}

function persistentAreaSaveConditionSpell(
  spell: PersistentAreaSaveConditionSpellInvocation["spell"],
): {
  readonly phase: PersistentAreaSaveConditionPhase;
  readonly targeting: {
    readonly kind: "pointOriginGroundSquare";
    readonly sideFeet: MovementFeet;
  };
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: MovementFeet;
} | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const phase = spell.mechanics.initialPhase;
  const passiveOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "passive",
  );
  const enterOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_enters_area",
  );
  const endTurnOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_ends_turn_in_area",
  );
  const durationTicks =
    spell.mechanics.duration.kind === "timed"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.value)
      : null;
  if (
    spell.mechanics.level !== 1 ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "timed" ||
    spell.mechanics.duration.value.unit !== "minute" ||
    spell.mechanics.duration.value.amount !== 1 ||
    spell.mechanics.operations.length !== 3 ||
    !isPersistentAreaSaveConditionPhase(phase) ||
    passiveOperation?.effect.kind !== "area_is_difficult_terrain" ||
    !isPersistentAreaSaveConditionEffect(enterOperation?.effect) ||
    !isPersistentAreaSaveConditionEffect(endTurnOperation?.effect) ||
    durationTicks === null ||
    Result.isFailure(durationTicks)
  ) {
    return null;
  }

  return {
    phase,
    targeting: {
      kind: "pointOriginGroundSquare",
      sideFeet: movementFeet(phase.attachment.value.shape.sideFeet),
    },
    durationTicks: durationTicks.success,
    rangeFeet: movementFeet(spell.mechanics.range.feet),
  };
}

function isPersistentAreaSaveConditionPhase(
  phase: PersistentAreaSaveConditionMechanics["initialPhase"],
): phase is PersistentAreaSaveConditionPhase {
  return (
    isPersistentAreaSaveConditionEffect(phase) &&
    phase.attachment.kind === "hole" &&
    phase.attachment.value.kind === "area" &&
    phase.attachment.value.origin.kind === "point_within_range" &&
    phase.attachment.value.shape.kind === "ground_square" &&
    phase.attachment.value.shape.sideFeet === 10
  );
}

function isPersistentAreaSaveConditionEffect(
  effect:
    | PersistentAreaSaveConditionMechanics["initialPhase"]
    | PersistentAreaSaveConditionMechanics["operations"][number]["effect"]
    | undefined,
): effect is Extract<
  NonNullable<typeof effect>,
  { readonly kind: "save_gate" }
> {
  const failedEffect = effect?.kind === "save_gate" ? effect.onFail : undefined;
  return (
    effect?.kind === "save_gate" &&
    (!("repeatSaves" in effect) || effect.repeatSaves === undefined) &&
    effect.ability === "dex" &&
    effect.dc.kind === "caster_spell_save_dc" &&
    effect.onSuccess.kind === "none" &&
    failedEffect?.kind === "apply_condition" &&
    failedEffect.condition === "prone"
  );
}

function discoverPersistentAreaSaveConditionCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<PersistentAreaSaveConditionSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return discoverSavingThrowSpellCastActs(state, actorId, invocation);
}

function resolvePersistentAreaSaveCondition(
  input: PersistentAreaSaveConditionResolveInput,
): BattleResolutionResult {
  return resolvePersistentAreaSaveConditionSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    ...optionalProperty("metamagicApplications", input.metamagicApplications),
  });
}

const PersistentAreaSaveConditionInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("persistentAreaSaveCondition"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      ability: Schema.Literal("dex"),
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("pointOriginGroundSquare"),
        sideFeet: MovementFeet,
      }),
      durationTicks: ElapsedTimeTicksSchema,
      rangeFeet: MovementFeet,
    }),
  );
export const persistentAreaSaveConditionProfile = {
  procedure: "persistentAreaSaveCondition",
  executionSchema: PersistentAreaSaveConditionInvocationSchema,
  admit: admitPersistentAreaSaveCondition,
  discoverCastAct: discoverPersistentAreaSaveConditionCastAct,
  resolve: resolvePersistentAreaSaveCondition,
} satisfies SpellProcedureDeclaration<
  "persistentAreaSaveCondition",
  PersistentAreaSaveConditionSpellInvocation
>;
import { spellInvocationResourceForCastOption } from "./profile.ts";
