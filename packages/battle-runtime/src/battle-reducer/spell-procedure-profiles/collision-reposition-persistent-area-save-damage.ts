import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-flaming-sphere-hazard-ram
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
import { DiceExprSchema } from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FLAMING_SPHERE_HAZARD_LIFECYCLE
//
// The ramMovablePersistentArea Spell Procedure Profile: action-time Spell Slot casting
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
import { Match, Result } from "effect";

import {
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { discoverActionSpellAreaCastAct } from "../spell-area-cast-discovery.ts";
import { supportedDamageAmountExpr } from "../spells-execution-facts.ts";
import { resolveRamMovablePersistentAreaSpellAct } from "../spells-resolve-area-effects.ts";
import { invalidResult } from "../result-helpers.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  preparedSpellSlotInvocations,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type RamMovablePersistentAreaSpellInvocation = Extract<
  SupportedSpellInvocation,
  {
    readonly procedure: "persistentAreaSaveDamage";
    readonly lifecycle: {
      readonly kind: "casterActionReposition";
      readonly actionCost: "bonusAction";
    };
  }
>;
type RamMovablePersistentAreaResolveInput = Omit<
  SpellProcedureProfileResolveInput<RamMovablePersistentAreaSpellInvocation>,
  "invocation"
> & {
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "persistentAreaSaveDamage";
      readonly lifecycle: {
        readonly kind: "casterActionReposition";
        readonly actionCost: "bonusAction";
      };
    }
  >;
};

type OngoingOperationEffect = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>["operations"][number]["effect"];
type OngoingSaveGateEffect = Extract<
  OngoingOperationEffect,
  { readonly kind: "save_gate" }
>;
type RamMovablePersistentAreaSaveEffect = OngoingSaveGateEffect & {
  readonly onFail: Extract<
    OngoingSaveGateEffect["onFail"],
    { readonly kind: "damage" }
  >;
};
type RamMovablePersistentAreaProfileShape = {
  readonly durationTicks: ElapsedTimeTicks;
  readonly diameterFeet: number;
  readonly ramMaxMoveFeet: number;
  readonly damageAmount: RamMovablePersistentAreaSaveEffect["onFail"]["amount"];
};

const RAM_MOVABLE_PERSISTENT_AREA_LEVEL = 2;
const RAM_MOVABLE_PERSISTENT_AREA_RANGE_FEET = 60;
const RAM_MOVABLE_PERSISTENT_AREA_DURATION_MINUTES = 1;
const RAM_MOVABLE_PERSISTENT_AREA_OPERATION_COUNT = 5;
const RAM_MOVABLE_PERSISTENT_AREA_DIAMETER_FEET = 5;
const RAM_MOVABLE_PERSISTENT_AREA_RADIUS_FEET =
  RAM_MOVABLE_PERSISTENT_AREA_DIAMETER_FEET / 2;
const RAM_MOVABLE_PERSISTENT_AREA_END_DISTANCE_FEET = 5;
const RAM_MOVABLE_PERSISTENT_AREA_RAM_MAX_MOVE_FEET = 30;
const RAM_MOVABLE_PERSISTENT_AREA_LIGHT_BRIGHT_RADIUS_FEET = 20;
const RAM_MOVABLE_PERSISTENT_AREA_LIGHT_DIM_ADDITIONAL_FEET = 20;
const RAM_MOVABLE_PERSISTENT_AREA_BASE_DAMAGE_DICE = 2;
const RAM_MOVABLE_PERSISTENT_AREA_DAMAGE_DIE_SIZE = 6;
const RAM_MOVABLE_PERSISTENT_AREA_DAMAGE_DICE_PER_SLOT_LEVEL = 1;

function admitRamMovablePersistentArea(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly RamMovablePersistentAreaSpellInvocation[] {
  const sphere = ramMovablePersistentAreaSpell(spell);
  if (sphere === null) {
    return [];
  }

  return preparedSpellSlotInvocations(spell, ctx, (base, slotLevel) => {
    const damageExpr = supportedDamageAmountExpr({
      amount: sphere.damageAmount,
      spellLevel: spell.mechanics.level,
      slotLevel,
    });
    return damageExpr === null
      ? null
      : {
          ...base,
          procedure: "persistentAreaSaveDamage",
          lifecycle: {
            kind: "casterActionReposition",
            actionCost: "bonusAction",
            movedAreaOperation: "saveDamage",
            collisionDisposition: "stopAndAffectAdjacent",
          },
          ability: "dex",
          dc: { kind: "caster_spell_save_dc" },
          targeting: {
            kind: "pointOriginSphereDiameter",
            diameterFeet: movementFeet(sphere.diameterFeet),
          },
          durationTicks: sphere.durationTicks,
          rangeFeet: movementFeet(RAM_MOVABLE_PERSISTENT_AREA_RANGE_FEET),
          ramMaxMoveFeet: movementFeet(sphere.ramMaxMoveFeet),
          damage: { expr: damageExpr, damageType: "fire" },
        };
  });
}

function ramMovablePersistentAreaSpell(
  spell: BattleSpellAdmissionSource,
): RamMovablePersistentAreaProfileShape | null {
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
      operation.trigger.distanceFeet ===
        RAM_MOVABLE_PERSISTENT_AREA_END_DISTANCE_FEET,
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
    spell.mechanics.level !== RAM_MOVABLE_PERSISTENT_AREA_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== RAM_MOVABLE_PERSISTENT_AREA_RANGE_FEET ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !==
      RAM_MOVABLE_PERSISTENT_AREA_DURATION_MINUTES ||
    spell.mechanics.operations.length !==
      RAM_MOVABLE_PERSISTENT_AREA_OPERATION_COUNT ||
    durationTicks === null ||
    Result.isFailure(durationTicks) ||
    sphereArea?.kind !== "area" ||
    sphereArea?.origin.kind !== "point_within_range" ||
    sphereArea.shape.kind !== "sphere" ||
    sphereArea.shape.radiusFeet !== RAM_MOVABLE_PERSISTENT_AREA_RADIUS_FEET ||
    !isRamMovablePersistentAreaSaveEffect(
      endTurnOperation?.effect,
      sphereHole?.holeId,
    ) ||
    !isRamMovablePersistentAreaSaveEffect(
      ramOperation?.effect,
      sphereHole?.holeId,
    ) ||
    repositionOperation?.effect.kind !== "reposition_attachment" ||
    repositionOperation.effect.maxMoveFeet !==
      RAM_MOVABLE_PERSISTENT_AREA_RAM_MAX_MOVE_FEET ||
    igniteOperation?.effect.kind !== "ignite_objects" ||
    igniteOperation.effect.filter.material !== "flammable" ||
    igniteOperation.effect.filter.targetRelation !== "not_worn_or_carried" ||
    lightOperation?.effect.kind !== "emit_light" ||
    lightOperation.effect.brightRadiusFeet !==
      RAM_MOVABLE_PERSISTENT_AREA_LIGHT_BRIGHT_RADIUS_FEET ||
    lightOperation.effect.dimAdditionalFeet !==
      RAM_MOVABLE_PERSISTENT_AREA_LIGHT_DIM_ADDITIONAL_FEET
  ) {
    return null;
  }
  return {
    durationTicks: durationTicks.success,
    diameterFeet: RAM_MOVABLE_PERSISTENT_AREA_DIAMETER_FEET,
    ramMaxMoveFeet: repositionOperation.effect.maxMoveFeet,
    damageAmount: endTurnOperation.effect.onFail.amount,
  };
}

function isRamMovablePersistentAreaSaveEffect(
  effect: OngoingOperationEffect | undefined,
  areaHoleId: string | undefined,
): effect is RamMovablePersistentAreaSaveEffect {
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
    effect.attachment.value.shape.radiusFeet ===
      RAM_MOVABLE_PERSISTENT_AREA_RADIUS_FEET &&
    effect.ability === "dex" &&
    effect.dc.kind === "caster_spell_save_dc" &&
    effect.onSuccess.kind === "half_damage" &&
    effect.onFail.kind === "damage" &&
    effect.onFail.damageType === "fire" &&
    amount?.kind === "linear_per_level" &&
    amount.axis === "slot" &&
    amount.startingAtLevel === RAM_MOVABLE_PERSISTENT_AREA_LEVEL &&
    amount.base.dice === RAM_MOVABLE_PERSISTENT_AREA_BASE_DAMAGE_DICE &&
    amount.base.dieSize === RAM_MOVABLE_PERSISTENT_AREA_DAMAGE_DIE_SIZE &&
    amount.perLevel.dice ===
      RAM_MOVABLE_PERSISTENT_AREA_DAMAGE_DICE_PER_SLOT_LEVEL &&
    amount.perLevel.dieSize === RAM_MOVABLE_PERSISTENT_AREA_DAMAGE_DIE_SIZE
  );
}

function resolveNarrowedRamMovablePersistentArea(
  input: RamMovablePersistentAreaResolveInput,
): BattleResolutionResult {
  return resolveRamMovablePersistentAreaSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

function resolveRamMovablePersistentArea(
  input: SpellProcedureProfileResolveInput<RamMovablePersistentAreaSpellInvocation>,
): BattleResolutionResult {
  return Match.value(input.invocation).pipe(
    Match.when(
      {
        lifecycle: {
          kind: "casterActionReposition",
          collisionDisposition: "stopAndAffectAdjacent",
        },
      },
      (invocation) =>
        resolveNarrowedRamMovablePersistentArea({ ...input, invocation }),
    ),
    Match.orElse(() =>
      invalidResult(
        input.input.state,
        "unsupportedSubject",
        "Stored procedure does not match the collision-reposition persistent-area profile.",
      ),
    ),
  );
}

const RamMovablePersistentAreaInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("persistentAreaSaveDamage"),
    lifecycle: Schema.Struct({
      kind: Schema.Literal("casterActionReposition"),
      actionCost: Schema.Literal("bonusAction"),
      movedAreaOperation: Schema.Literal("saveDamage"),
      collisionDisposition: Schema.Literal("stopAndAffectAdjacent"),
    }),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    ability: Schema.Literal("dex"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("pointOriginSphereDiameter"),
      diameterFeet: MovementFeet,
    }),
    durationTicks: ElapsedTimeTicksSchema,
    rangeFeet: MovementFeet,
    ramMaxMoveFeet: MovementFeet,
    damage: Schema.Struct({
      expr: DiceExprSchema,
      damageType: Schema.Literal("fire"),
    }),
  }),
);
export const collisionRepositionPersistentAreaSaveDamageProfile = {
  procedure: "persistentAreaSaveDamage",
  executionSchema: RamMovablePersistentAreaInvocationSchema,
  admit: admitRamMovablePersistentArea,
  discoverCastAct: discoverActionSpellAreaCastAct,
  resolve: resolveRamMovablePersistentArea,
} satisfies SpellProcedureDeclaration<
  "persistentAreaSaveDamage",
  RamMovablePersistentAreaSpellInvocation
>;
