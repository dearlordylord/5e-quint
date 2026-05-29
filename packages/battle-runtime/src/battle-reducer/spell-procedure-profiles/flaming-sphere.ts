// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-flaming-sphere-hazard-ram
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE
//
// The flamingSphere Spell Procedure Profile: action-time Spell Slot casting
// creates a caster-owned Concentration sphere hazard. The runtime owns Spell
// Slot spending, Concentration duration, Dexterity Saving Throw-gated Fire
// damage, and Bonus Action ram/reposition command witnesses; the table owns
// spatial placement, movement path, object ignition, and light presentation.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-E-L.md "Flaming Sphere":
//     Action; 60 feet; Concentration up to 1 minute; 5-foot-diameter sphere
//     in an unoccupied ground space; creatures ending turns within 5 feet make
//     Dexterity Saving Throws for Fire damage or half; Bonus Action movement
//     up to 30 feet can ram a creature; object ignition and Bright/Dim light
//     are table/presentation facts.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Bonus Action, Concentration,
//     Spell Slot, Spell Invocation, Saving Throw, Damage Type, and Movement.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
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
import { resolveFlamingSphereSpellAct } from "../spells-resolve-area-effects.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import { spellProcedureInvocationSchema } from "./profile.ts";
import {
  BattleRuntimeObjectSchema,
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type FlamingSphereSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "flamingSphere" }
>;
type FlamingSphereResolveInput = SpellProcedureProfileResolveInput<
  FlamingSphereSpellInvocation,
  ActionSpellBattleResolutionInput
>;

type OngoingOperationEffect = Extract<
  SpellRecord["mechanics"],
  { readonly family: "ongoing_effect" }
>["operations"][number]["effect"];
type OngoingSaveGateEffect = Extract<
  OngoingOperationEffect,
  { readonly kind: "save_gate" }
>;
type FlamingSphereSaveEffect = OngoingSaveGateEffect & {
  readonly onFail: Extract<
    OngoingSaveGateEffect["onFail"],
    { readonly kind: "damage" }
  >;
};
type FlamingSphereProfileShape = {
  readonly durationTicks: ElapsedTimeTicks;
  readonly diameterFeet: number;
  readonly ramMaxMoveFeet: number;
  readonly damageAmount: FlamingSphereSaveEffect["onFail"]["amount"];
};

const FLAMING_SPHERE_LEVEL = 2;
const FLAMING_SPHERE_RANGE_FEET = 60;
const FLAMING_SPHERE_DURATION_MINUTES = 1;
const FLAMING_SPHERE_OPERATION_COUNT = 5;
const FLAMING_SPHERE_DIAMETER_FEET = 5;
const FLAMING_SPHERE_RADIUS_FEET = FLAMING_SPHERE_DIAMETER_FEET / 2;
const FLAMING_SPHERE_END_DISTANCE_FEET = 5;
const FLAMING_SPHERE_RAM_MAX_MOVE_FEET = 30;
const FLAMING_SPHERE_LIGHT_BRIGHT_RADIUS_FEET = 20;
const FLAMING_SPHERE_LIGHT_DIM_ADDITIONAL_FEET = 20;
const FLAMING_SPHERE_BASE_DAMAGE_DICE = 2;
const FLAMING_SPHERE_DAMAGE_DIE_SIZE = 6;
const FLAMING_SPHERE_DAMAGE_DICE_PER_SLOT_LEVEL = 1;

function admitFlamingSphere(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly FlamingSphereSpellInvocation[] {
  const sphere = flamingSphereSpell(spell);
  if (sphere === null) {
    return [];
  }

  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly FlamingSphereSpellInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      const damageExpr = supportedDamageAmountExpr({
        amount: sphere.damageAmount,
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
          procedure: "flamingSphere",
          spell,
          ability: "dex",
          dc: { kind: "caster_spell_save_dc" },
          targeting: {
            kind: "pointOriginSphereDiameter",
            diameterFeet: movementFeet(sphere.diameterFeet),
          },
          durationTicks: sphere.durationTicks,
          rangeFeet: movementFeet(FLAMING_SPHERE_RANGE_FEET),
          ramMaxMoveFeet: movementFeet(sphere.ramMaxMoveFeet),
          damage: { expr: damageExpr, damageType: "fire" },
        },
      ];
    },
  );
}

function flamingSphereSpell(
  spell: SpellRecord,
): FlamingSphereProfileShape | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const attachment = spell.mechanics.attachment;
  const sphereHole =
    attachment.kind === "hole" && attachment.value.kind === "area"
      ? attachment
      : null;
  const sphereArea = sphereHole?.value ?? null;
  const endTurnOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind ===
        "on_creature_ends_turn_within_distance_of_area" &&
      operation.trigger.distanceFeet === FLAMING_SPHERE_END_DISTANCE_FEET,
  );
  const ramOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_area_moves_into_creature_space",
  );
  const repositionOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_caster_spends_action" &&
      operation.trigger.cost.kind === "bonus_action" &&
      operation.effect.kind === "reposition_attachment",
  );
  const igniteOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "ignite_objects",
  );
  const lightOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "emit_light",
  );

  if (
    spell.mechanics.level !== FLAMING_SPHERE_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== FLAMING_SPHERE_RANGE_FEET ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== FLAMING_SPHERE_DURATION_MINUTES ||
    spell.mechanics.operations.length !== FLAMING_SPHERE_OPERATION_COUNT ||
    durationTicks === null ||
    Either.isLeft(durationTicks) ||
    sphereHole?.holeId !== "flaming_sphere_area" ||
    sphereArea?.kind !== "area" ||
    sphereArea?.origin.kind !== "point_within_range" ||
    sphereArea.shape.kind !== "sphere" ||
    sphereArea.shape.radiusFeet !== FLAMING_SPHERE_RADIUS_FEET ||
    !isFlamingSphereSaveEffect(endTurnOperation?.effect, sphereHole?.holeId) ||
    !isFlamingSphereSaveEffect(ramOperation?.effect, sphereHole?.holeId) ||
    repositionOperation?.effect.kind !== "reposition_attachment" ||
    repositionOperation.effect.maxMoveFeet !==
      FLAMING_SPHERE_RAM_MAX_MOVE_FEET ||
    igniteOperation?.effect.kind !== "ignite_objects" ||
    igniteOperation.effect.filter.material !== "flammable" ||
    igniteOperation.effect.filter.targetRelation !== "not_worn_or_carried" ||
    lightOperation?.effect.kind !== "emit_light" ||
    lightOperation.effect.brightRadiusFeet !==
      FLAMING_SPHERE_LIGHT_BRIGHT_RADIUS_FEET ||
    lightOperation.effect.dimAdditionalFeet !==
      FLAMING_SPHERE_LIGHT_DIM_ADDITIONAL_FEET
  ) {
    return null;
  }
  return {
    durationTicks: durationTicks.right,
    diameterFeet: FLAMING_SPHERE_DIAMETER_FEET,
    ramMaxMoveFeet: repositionOperation.effect.maxMoveFeet,
    damageAmount: endTurnOperation.effect.onFail.amount,
  };
}

function isFlamingSphereSaveEffect(
  effect: OngoingOperationEffect | undefined,
  areaHoleId: string | undefined,
): effect is FlamingSphereSaveEffect {
  if (effect?.kind !== "save_gate") {
    return false;
  }
  const amount = effect.onFail.kind === "damage" ? effect.onFail.amount : null;
  return (
    areaHoleId !== undefined &&
    effect.attachment?.kind === "hole" &&
    effect.attachment.holeId === areaHoleId &&
    effect.attachment.value.kind === "area" &&
    effect.attachment.value.origin.kind === "point_within_range" &&
    effect.attachment.value.shape.kind === "sphere" &&
    effect.attachment.value.shape.radiusFeet === FLAMING_SPHERE_RADIUS_FEET &&
    effect.ability === "dex" &&
    effect.dc.kind === "caster_spell_save_dc" &&
    effect.onSuccess.kind === "half_damage" &&
    effect.onFail.kind === "damage" &&
    effect.onFail.damageType === "fire" &&
    amount?.kind === "linear_per_level" &&
    amount.axis === "slot" &&
    amount.startingAtLevel === FLAMING_SPHERE_LEVEL &&
    amount.base.dice === FLAMING_SPHERE_BASE_DAMAGE_DICE &&
    amount.base.dieSize === FLAMING_SPHERE_DAMAGE_DIE_SIZE &&
    amount.perLevel.dice === FLAMING_SPHERE_DAMAGE_DICE_PER_SLOT_LEVEL &&
    amount.perLevel.dieSize === FLAMING_SPHERE_DAMAGE_DIE_SIZE
  );
}

function discoverFlamingSphereCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: FlamingSphereSpellInvocation,
): readonly AvailableBattleAct[] {
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        invocation: flamingSphereInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: `${flamingSphereCastSummary(
        invocation,
      )} The table supplies the sphere area identity.`,
      initialHoles: [spellAreaChoiceHole(invocation)],
    },
  ];
}

function flamingSphereInvocationRef(
  invocation: FlamingSphereSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "flamingSphere",
  };
}

function flamingSphereCastSummary(
  invocation: FlamingSphereSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveFlamingSphere(
  input: FlamingSphereResolveInput,
): BattleResolutionResult {
  return resolveFlamingSphereSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

const FlamingSphereInvocationSchema = spellProcedureInvocationSchema<
  Extract<SupportedSpellInvocation, { readonly procedure: "flamingSphere" }>
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("flamingSphere"),
    spell: BattleRuntimeObjectSchema,
    ability: Schema.Literal("dex"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("pointOriginSphereDiameter"),
      diameterFeet: MovementFeet,
    }),
    durationTicks: BattleRuntimeObjectSchema,
    rangeFeet: MovementFeet,
    ramMaxMoveFeet: MovementFeet,
    damage: Schema.Struct({
      expr: BattleRuntimeObjectSchema,
      damageType: Schema.Literal("fire"),
    }),
  }),
);
export const flamingSphereProfile = {
  procedure: "flamingSphere",
  invocationSchema: FlamingSphereInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitFlamingSphere,
  discoverCastAct: discoverFlamingSphereCastAct,
  castSummary: flamingSphereCastSummary,
  invocationRef: flamingSphereInvocationRef,
  resolve: resolveFlamingSphere,
} satisfies SpellProcedureProfile<
  "flamingSphere",
  FlamingSphereSpellInvocation,
  ActionSpellBattleResolutionInput
>;
