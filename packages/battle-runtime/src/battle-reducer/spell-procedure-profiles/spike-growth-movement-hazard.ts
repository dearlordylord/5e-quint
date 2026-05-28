// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spike-growth-movement-hazard
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD
//
// The spikeGrowthMovementHazard Spell Procedure Profile: action-time Spell
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
import type {
  DamageType,
  DiceExpr,
  SpellRecord,
} from "@dnd/surface/surface/types";
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
import { resolveSpikeGrowthMovementHazardSpellAct } from "../spells-resolve-area-effects.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

type SpikeGrowthMovementHazardSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spikeGrowthMovementHazard" }
>;
type SpikeGrowthMovementHazardResolveInput = SpellProcedureProfileResolveInput<
  SpikeGrowthMovementHazardSpellInvocation,
  ActionSpellBattleResolutionInput
>;

type SpikeGrowthMovementHazardProfileShape = {
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
const SPIKE_GROWTH_OPERATION_COUNT = 2;
const SPIKE_GROWTH_RADIUS_FEET = 20;
const SPIKE_GROWTH_DAMAGE_PER_FEET = 5;
const SPIKE_GROWTH_DAMAGE_DICE = 2;
const SPIKE_GROWTH_DAMAGE_DIE_SIZE = 4;

function admitSpikeGrowthMovementHazard(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly SpikeGrowthMovementHazardSpellInvocation[] {
  const spikeGrowth = spikeGrowthMovementHazardSpell(spell);
  if (spikeGrowth === null) {
    return [];
  }

  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly SpikeGrowthMovementHazardSpellInvocation[] => {
      if (Number(slot.spellLevel) < SPIKE_GROWTH_LEVEL) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
          procedure: "spikeGrowthMovementHazard",
          spell,
          targeting: {
            kind: "pointOriginSphere",
            radiusFeet: movementFeet(spikeGrowth.radiusFeet),
          },
          durationTicks: spikeGrowth.durationTicks,
          rangeFeet: movementFeet(spikeGrowth.rangeFeet),
          damage: {
            expr: spikeGrowth.damage.expr,
            damageType: spikeGrowth.damage.damageType,
          },
          damagePerFeet: movementFeet(spikeGrowth.damagePerFeet),
        },
      ];
    },
  );
}

function spikeGrowthMovementHazardSpell(
  spell: SpellRecord,
): SpikeGrowthMovementHazardProfileShape | null {
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
    spell.mechanics.operations.length !== SPIKE_GROWTH_OPERATION_COUNT ||
    durationTicks === null ||
    Either.isLeft(durationTicks) ||
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
    durationTicks: durationTicks.right,
    radiusFeet: area.shape.radiusFeet,
    rangeFeet: spell.mechanics.range.feet,
    damage: {
      expr: movementDamageOperation.effect.amount.expr,
      damageType: movementDamageOperation.effect.damageType,
    },
    damagePerFeet: movementDamageOperation.trigger.perFeet,
  };
}

function discoverSpikeGrowthMovementHazardCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: SpikeGrowthMovementHazardSpellInvocation,
): readonly AvailableBattleAct[] {
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        invocation: spikeGrowthMovementHazardInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: `${spikeGrowthMovementHazardCastSummary(
        invocation,
      )} The table supplies the Spike Growth area identity.`,
      initialHoles: [spellAreaChoiceHole(invocation)],
    },
  ];
}

function spikeGrowthMovementHazardInvocationRef(
  invocation: SpikeGrowthMovementHazardSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "spikeGrowthMovementHazard",
  };
}

function spikeGrowthMovementHazardCastSummary(
  invocation: SpikeGrowthMovementHazardSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveSpikeGrowthMovementHazard(
  input: SpikeGrowthMovementHazardResolveInput,
): BattleResolutionResult {
  return resolveSpikeGrowthMovementHazardSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

export const spikeGrowthMovementHazardProfile = {
  procedure: "spikeGrowthMovementHazard",
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitSpikeGrowthMovementHazard,
  discoverCastAct: discoverSpikeGrowthMovementHazardCastAct,
  castSummary: spikeGrowthMovementHazardCastSummary,
  invocationRef: spikeGrowthMovementHazardInvocationRef,
  resolve: resolveSpikeGrowthMovementHazard,
} satisfies SpellProcedureProfile<
  "spikeGrowthMovementHazard",
  SpikeGrowthMovementHazardSpellInvocation,
  ActionSpellBattleResolutionInput
>;
