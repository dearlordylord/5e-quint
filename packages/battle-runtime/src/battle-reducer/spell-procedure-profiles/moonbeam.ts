// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-moonbeam-movable-zone
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
//
// The moonbeam Spell Procedure Profile: action-time Spell Slot casting creates
// a caster-owned Concentration Cylinder. The runtime owns Spell Slot spending,
// Concentration duration, Constitution Saving Throw-gated Radiant damage,
// once-per-creature-per-turn save limiting, shape-shift reversion/suppression
// hooks, and Magic Action reposition witnesses; the table owns spatial area
// membership, trigger emission, Dim Light presentation, and map geometry.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-M-P.md "Moonbeam": Action;
//     120 feet; Concentration up to 1 minute; 5-foot-radius, 40-foot-high
//     Cylinder; Dim Light; later-turn Magic Action move up to 60 feet;
//     Constitution Saving Throw for Radiant damage or half; failed-save
//     shape-shift reversion/suppression; appears/moved-into/enters/ends-turn
//     triggers; once per turn; +1d10 per slot level above 2.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Concentration, Spell Slot, Spell
//     Invocation, Area of Effect/Cylinder, Saving Throw, Damage Type, and
//     shape-shifting.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import { spellInvocationSchemaUnavailable } from "./profile.ts";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { spellAreaChoiceHole } from "../spells-holes-fills.ts";
import { supportedDamageAmountExpr } from "../spells-profile-shared.ts";
import { resolveMoonbeamSpellAct } from "../spells-resolve-area-effects.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

type MoonbeamSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "moonbeam" }
>;
type MoonbeamResolveInput = SpellProcedureProfileResolveInput<
  MoonbeamSpellInvocation,
  ActionSpellBattleResolutionInput
>;

type OngoingOperationEffect = Extract<
  SpellRecord["mechanics"],
  { readonly family: "ongoing_effect" }
>["operations"][number]["effect"];
type MoonbeamInitialPhase = Extract<
  SpellRecord["mechanics"],
  { readonly family: "ongoing_effect" }
>["initialPhase"];
type MoonbeamFailedSaveEffect = Extract<
  Extract<MoonbeamInitialPhase, { readonly kind: "save_gate" }>["onFail"],
  { readonly kind: "composite" }
>["effects"][number];
type MoonbeamSaveGateDamage = Extract<
  MoonbeamFailedSaveEffect,
  { readonly kind: "damage" }
>;
type MoonbeamProfileShape = {
  readonly durationTicks: ElapsedTimeTicks;
  readonly radiusFeet: number;
  readonly heightFeet: number;
  readonly repositionMaxMoveFeet: number;
  readonly damageAmount: MoonbeamSaveGateDamage["amount"];
};

const MOONBEAM_LEVEL = 2;
const MOONBEAM_RANGE_FEET = 120;
const MOONBEAM_DURATION_MINUTES = 1;
const MOONBEAM_OPERATION_COUNT = 5;
const MOONBEAM_RADIUS_FEET = 5;
const MOONBEAM_HEIGHT_FEET = 40;
const MOONBEAM_REPOSITION_MAX_MOVE_FEET = 60;
const MOONBEAM_BASE_DAMAGE_DICE = 2;
const MOONBEAM_DAMAGE_DIE_SIZE = 10;
const MOONBEAM_DAMAGE_DICE_PER_SLOT_LEVEL = 1;

function admitMoonbeam(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly MoonbeamSpellInvocation[] {
  const moonbeam = moonbeamSpell(spell);
  if (moonbeam === null) {
    return [];
  }

  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly MoonbeamSpellInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      const damageExpr = supportedDamageAmountExpr({
        amount: moonbeam.damageAmount,
        spellLevel: spell.mechanics.level,
        slotLevel: slot.spellLevel,
      });
      if (damageExpr === null) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
          procedure: "moonbeam",
          spell,
          ability: "con",
          dc: { kind: "caster_spell_save_dc" },
          targeting: {
            kind: "pointOriginCylinder",
            radiusFeet: movementFeet(moonbeam.radiusFeet),
            heightFeet: movementFeet(moonbeam.heightFeet),
          },
          durationTicks: moonbeam.durationTicks,
          rangeFeet: movementFeet(MOONBEAM_RANGE_FEET),
          repositionMaxMoveFeet: movementFeet(moonbeam.repositionMaxMoveFeet),
          damage: { expr: damageExpr, damageType: "radiant" },
        },
      ];
    },
  );
}

function moonbeamSpell(spell: SpellRecord): MoonbeamProfileShape | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const attachment = spell.mechanics.attachment;
  const cylinderHole =
    attachment.kind === "hole" && attachment.value.kind === "area"
      ? attachment
      : null;
  const cylinderArea = cylinderHole?.value ?? null;
  const initialDamage = isMoonbeamSaveGate(spell.mechanics.initialPhase);
  const endTurnOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_ends_turn_in_area",
  );
  const enterOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_enters_area",
  );
  const moveIntoOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_area_moves_into_creature_space",
  );
  const repositionOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_caster_spends_action" &&
      operation.trigger.cost.kind === "standard_action" &&
      operation.trigger.cost.action === "magic" &&
      operation.trigger.laterTurnsOnly === true &&
      operation.effect.kind === "reposition_attachment",
  );
  const dimLightOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_emits_dim_light",
  );

  if (
    spell.mechanics.level !== MOONBEAM_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== MOONBEAM_RANGE_FEET ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== MOONBEAM_DURATION_MINUTES ||
    spell.mechanics.operations.length !== MOONBEAM_OPERATION_COUNT ||
    durationTicks === null ||
    Either.isLeft(durationTicks) ||
    cylinderHole?.holeId !== "moonbeam_cylinder" ||
    cylinderArea?.kind !== "area" ||
    cylinderArea?.origin.kind !== "point_within_range" ||
    cylinderArea.shape.kind !== "cylinder" ||
    cylinderArea.shape.radiusFeet !== MOONBEAM_RADIUS_FEET ||
    cylinderArea.shape.heightFeet !== MOONBEAM_HEIGHT_FEET ||
    initialDamage === null ||
    isMoonbeamSaveGate(endTurnOperation?.effect) === null ||
    isMoonbeamSaveGate(enterOperation?.effect) === null ||
    isMoonbeamSaveGate(moveIntoOperation?.effect) === null ||
    repositionOperation?.effect.kind !== "reposition_attachment" ||
    repositionOperation.effect.maxMoveFeet !==
      MOONBEAM_REPOSITION_MAX_MOVE_FEET ||
    dimLightOperation?.effect.kind !== "area_emits_dim_light"
  ) {
    return null;
  }

  return {
    durationTicks: durationTicks.right,
    radiusFeet: cylinderArea.shape.radiusFeet,
    heightFeet: cylinderArea.shape.heightFeet,
    repositionMaxMoveFeet: repositionOperation.effect.maxMoveFeet,
    damageAmount: initialDamage.amount,
  };
}

function isMoonbeamSaveGate(
  effect: OngoingOperationEffect | MoonbeamInitialPhase | undefined,
): MoonbeamSaveGateDamage | null {
  if (effect?.kind !== "save_gate") {
    return null;
  }
  if (effect.onFail.kind !== "composite") {
    return null;
  }
  if (effect.onFail.effects.length !== 3) {
    return null;
  }
  const damageEffects = effect.onFail.effects.flatMap(
    (failedEffect): readonly MoonbeamSaveGateDamage[] => {
      const damage = moonbeamDamageEffect(failedEffect);
      return damage === null ? [] : [damage];
    },
  );
  const hasTrueFormReversion = effect.onFail.effects.some(
    (failedEffect) => failedEffect.kind === "revert_shape_shift_to_true_form",
  );
  const hasShapeShiftSuppression = effect.onFail.effects.some(
    (failedEffect) =>
      failedEffect.kind === "suppress_shape_shifting_while_in_area",
  );
  if (
    damageEffects.length !== 1 ||
    !hasTrueFormReversion ||
    !hasShapeShiftSuppression
  ) {
    return null;
  }
  const damage = damageEffects[0];
  if (
    damage === undefined ||
    effect.ability !== "con" ||
    effect.dc.kind !== "caster_spell_save_dc" ||
    effect.onSuccess.kind !== "half_damage"
  ) {
    return null;
  }
  return damage;
}

function moonbeamDamageEffect(
  effect: MoonbeamFailedSaveEffect,
): MoonbeamSaveGateDamage | null {
  if (
    effect.kind !== "damage" ||
    effect.damageType !== "radiant" ||
    effect.amount?.kind !== "linear_per_level" ||
    effect.amount.axis !== "slot" ||
    effect.amount.startingAtLevel !== MOONBEAM_LEVEL ||
    effect.amount.base.dice !== MOONBEAM_BASE_DAMAGE_DICE ||
    effect.amount.base.dieSize !== MOONBEAM_DAMAGE_DIE_SIZE ||
    effect.amount.perLevel.dice !== MOONBEAM_DAMAGE_DICE_PER_SLOT_LEVEL ||
    (effect.amount.perLevel.dieSize !== undefined &&
      effect.amount.perLevel.dieSize !== MOONBEAM_DAMAGE_DIE_SIZE)
  ) {
    return null;
  }
  return effect;
}

function discoverMoonbeamCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: MoonbeamSpellInvocation,
): readonly AvailableBattleAct[] {
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        invocation: moonbeamInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: `${moonbeamCastSummary(
        invocation,
      )} The table supplies the Moonbeam cylinder area identity.`,
      initialHoles: [spellAreaChoiceHole(invocation)],
    },
  ];
}

function moonbeamInvocationRef(
  invocation: MoonbeamSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "moonbeam",
  };
}

function moonbeamCastSummary(invocation: MoonbeamSpellInvocation): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveMoonbeam(input: MoonbeamResolveInput): BattleResolutionResult {
  return resolveMoonbeamSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

export const moonbeamProfile = {
  procedure: "moonbeam",
  invocationSchema: spellInvocationSchemaUnavailable(),
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitMoonbeam,
  discoverCastAct: discoverMoonbeamCastAct,
  castSummary: moonbeamCastSummary,
  invocationRef: moonbeamInvocationRef,
  resolve: resolveMoonbeam,
} satisfies SpellProcedureProfile<
  "moonbeam",
  MoonbeamSpellInvocation,
  ActionSpellBattleResolutionInput
>;
