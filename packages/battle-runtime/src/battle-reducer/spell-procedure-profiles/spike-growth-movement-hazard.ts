import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spike-growth-movement-hazard
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
import { DiceExprSchema } from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD
//
// The areaMovementDistanceDamage Spell Procedure Profile: action-time Spell
// Slot casting creates a caster-owned Concentration Sphere of Difficult
// Terrain. The runtime owns Spell Slot spending, Concentration duration,
// table-supplied Sphere identity, Difficult Terrain movement-cost facts, and
// Piercing damage scaled by movement distance through the area; the table
// owns spatial path facts and the camouflaged terrain recognition check.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-S-Z.md "Spike Growth":
//     Action; 150 feet; Concentration up to 10 minutes; 20-foot-radius
//     Sphere; area becomes Difficult Terrain; moving into or within the area
//     deals 2d4 Piercing damage for every 5 feet traveled; camouflage
//     recognition requires a Search action and Wisdom (Perception or
//     Survival) check against the caster's spell save DC before entering.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Concentration, Spell Slot, Spell
//     Invocation, Area of Effect/Sphere, Difficult Terrain, Movement, Damage
//     Type, Search, and Skill.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import type { DamageType, DiceExpr } from "@dnd/surface/surface/types";
import { Result } from "effect";

import {
  type BattleResolutionResult,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { discoverActionSpellAreaCastAct } from "../spell-area-cast-discovery.ts";
import { resolveAreaMovementDistanceDamageSpellAct } from "../spells-resolve-area-effects.ts";
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
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type AreaMovementDistanceDamageSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "areaMovementDistanceDamage" }
>;
type AreaMovementDistanceDamageResolveInput =
  SpellProcedureProfileResolveInput<AreaMovementDistanceDamageSpellInvocation>;

type AreaMovementDistanceDamageProfileShape = {
  readonly durationTicks: ElapsedTimeTicks;
  readonly radiusFeet: number;
  readonly rangeFeet: number;
  readonly damage: {
    readonly expr: DiceExpr;
    readonly damageType: Extract<DamageType, "piercing">;
  };
  readonly damagePerFeet: number;
};

const SPIKE_GROWTH_LEVEL = 2;
const SPIKE_GROWTH_RANGE_FEET = 150;
const SPIKE_GROWTH_DURATION_MINUTES = 10;
const SPIKE_GROWTH_RADIUS_FEET = 20;
const SPIKE_GROWTH_DAMAGE_PER_FEET = 5;
const SPIKE_GROWTH_DAMAGE_DICE = 2;
const SPIKE_GROWTH_DAMAGE_DIE_SIZE = 4;

function admitAreaMovementDistanceDamage(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly AreaMovementDistanceDamageSpellInvocation[] {
  const areaMovementDistanceDamage = areaMovementDistanceDamageSpell(spell);
  if (areaMovementDistanceDamage === null) {
    return [];
  }

  return ctx.spellCastOptions.flatMap(
    (slot): readonly AreaMovementDistanceDamageSpellInvocation[] => {
      if (Number(slot.spellLevel) < SPIKE_GROWTH_LEVEL) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "areaMovementDistanceDamage",
          spell,
          targeting: {
            kind: "pointOriginSphere",
            radiusFeet: movementFeet(areaMovementDistanceDamage.radiusFeet),
          },
          durationTicks: areaMovementDistanceDamage.durationTicks,
          rangeFeet: movementFeet(areaMovementDistanceDamage.rangeFeet),
          damage: {
            expr: areaMovementDistanceDamage.damage.expr,
            damageType: areaMovementDistanceDamage.damage.damageType,
          },
          damagePerFeet: movementFeet(areaMovementDistanceDamage.damagePerFeet),
        },
      ];
    },
  );
}

function areaMovementDistanceDamageSpell(
  spell: BattleSpellAdmissionSource,
): AreaMovementDistanceDamageProfileShape | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const attachment = spell.mechanics.attachment;
  const area =
    attachment.kind === "hole" && attachment.value.kind === "area"
      ? attachment.value
      : null;
  const difficultTerrainOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_is_difficult_terrain",
  );
  const movementDamageOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_moves",
  );

  if (
    spell.mechanics.level !== SPIKE_GROWTH_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== SPIKE_GROWTH_RANGE_FEET ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== SPIKE_GROWTH_DURATION_MINUTES ||
    durationTicks === null ||
    Result.isFailure(durationTicks) ||
    attachment.kind !== "hole" ||
    area?.kind !== "area" ||
    area.origin.kind !== "point_within_range" ||
    area.shape.kind !== "sphere" ||
    area.shape.radiusFeet !== SPIKE_GROWTH_RADIUS_FEET ||
    difficultTerrainOperation?.effect.kind !== "area_is_difficult_terrain" ||
    movementDamageOperation?.trigger.kind !== "on_creature_moves" ||
    movementDamageOperation.trigger.perFeet !== SPIKE_GROWTH_DAMAGE_PER_FEET ||
    movementDamageOperation.effect.kind !== "damage" ||
    movementDamageOperation.effect.damageType !== "piercing" ||
    movementDamageOperation.effect.amount.kind !== "fixed" ||
    movementDamageOperation.effect.amount.expr.dice !==
      SPIKE_GROWTH_DAMAGE_DICE ||
    movementDamageOperation.effect.amount.expr.dieSize !==
      SPIKE_GROWTH_DAMAGE_DIE_SIZE
  ) {
    return null;
  }

  return {
    durationTicks: durationTicks.success,
    radiusFeet: area.shape.radiusFeet,
    rangeFeet: spell.mechanics.range.feet,
    damage: {
      expr: movementDamageOperation.effect.amount.expr,
      damageType: movementDamageOperation.effect.damageType,
    },
    damagePerFeet: movementDamageOperation.trigger.perFeet,
  };
}

function resolveAreaMovementDistanceDamage(
  input: AreaMovementDistanceDamageResolveInput,
): BattleResolutionResult {
  return resolveAreaMovementDistanceDamageSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

const AreaMovementDistanceDamageInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("areaMovementDistanceDamage"),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("pointOriginSphere"),
        radiusFeet: MovementFeet,
      }),
      durationTicks: ElapsedTimeTicksSchema,
      rangeFeet: MovementFeet,
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: Schema.Literal("piercing"),
      }),
      damagePerFeet: MovementFeet,
    }),
  );
export const areaMovementDistanceDamageProfile = {
  procedure: "areaMovementDistanceDamage",
  executionSchema: AreaMovementDistanceDamageInvocationSchema,
  admit: admitAreaMovementDistanceDamage,
  discoverCastAct: discoverActionSpellAreaCastAct,
  resolve: resolveAreaMovementDistanceDamage,
} satisfies SpellProcedureDeclaration<
  "areaMovementDistanceDamage",
  AreaMovementDistanceDamageSpellInvocation
>;
import { spellInvocationResourceForCastOption } from "./profile.ts";
