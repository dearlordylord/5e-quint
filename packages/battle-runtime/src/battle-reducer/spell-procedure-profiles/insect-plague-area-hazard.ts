// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-insect-plague-area-hazard
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS BATTLE.SPELL.INSECT_PLAGUE_AREA_HAZARD_LIFECYCLE
//
// Insect Plague: action-time Spell Slot casting creates a caster-owned
// Concentration Sphere. The runtime owns Spell Slot spending, Concentration
// duration, caller-supplied Sphere identity, Lightly Obscured and Difficult
// Terrain projections, Constitution Saving Throw-gated Piercing damage, and a
// once-per-turn save ledger. The table owns spatial membership and geometry.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-E-L.md "Insect Plague":
//     Action; 300 feet; Concentration up to 10 minutes; 20-foot-radius Sphere;
//     Lightly Obscured; Difficult Terrain; Constitution save for 4d10 Piercing
//     damage or half when the swarm appears, first entry on a turn, or end turn
//     in the area; once per turn; +1d10 per slot level above 5.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Slot, Concentration,
//     Area of Effect/Sphere, Difficult Terrain, Lightly Obscured, Saving
//     Throw, Damage Type.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either, Schema } from "effect";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import {
  BattleRuntimeObjectSchema,
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { spellAreaChoiceHole } from "../spells-holes-fills.ts";
import { supportedDamageAmountExpr } from "../spells-profile-shared.ts";
import { resolveInsectPlagueAreaHazardSpellAct } from "../spells-resolve-area-effects.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellProcedureInvocationSchema } from "./profile.ts";

type InsectPlagueAreaHazardSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "insectPlagueAreaHazard" }
>;
type InsectPlagueAreaHazardResolveInput = SpellProcedureProfileResolveInput<
  InsectPlagueAreaHazardSpellInvocation,
  ActionSpellBattleResolutionInput
>;
type InsectPlagueMechanics = Extract<
  SpellRecord["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type InsectPlagueSaveGate = Extract<
  NonNullable<InsectPlagueMechanics["initialPhase"]>,
  { readonly kind: "save_gate" }
>;
type InsectPlagueProfileShape = {
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: number;
  readonly radiusFeet: number;
  readonly damageAmount: Extract<
    InsectPlagueSaveGate["onFail"],
    { readonly kind: "damage" }
  >["amount"];
};

const INSECT_PLAGUE_LEVEL = 5;
const INSECT_PLAGUE_RANGE_FEET = 300;
const INSECT_PLAGUE_DURATION_MINUTES = 10;
const INSECT_PLAGUE_RADIUS_FEET = 20;
const INSECT_PLAGUE_OPERATION_COUNT = 3;
const INSECT_PLAGUE_BASE_DAMAGE_DICE = 4;
const INSECT_PLAGUE_DAMAGE_DIE_SIZE = 10;
const INSECT_PLAGUE_DAMAGE_DICE_PER_SLOT_LEVEL = 1;

function admitInsectPlagueAreaHazard(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly InsectPlagueAreaHazardSpellInvocation[] {
  const insectPlague = insectPlagueAreaHazardSpell(spell);
  if (insectPlague === null) {
    return [];
  }

  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly InsectPlagueAreaHazardSpellInvocation[] => {
      if (Number(slot.spellLevel) < INSECT_PLAGUE_LEVEL) {
        return [];
      }
      const damageExpr = supportedDamageAmountExpr({
        amount: insectPlague.damageAmount,
        spellLevel: INSECT_PLAGUE_LEVEL,
        slotLevel: slot.spellLevel,
      });
      if (damageExpr === null) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
          procedure: "insectPlagueAreaHazard",
          spell,
          ability: "con",
          dc: { kind: "caster_spell_save_dc" },
          targeting: {
            kind: "pointOriginSphere",
            radiusFeet: movementFeet(insectPlague.radiusFeet),
          },
          durationTicks: insectPlague.durationTicks,
          rangeFeet: movementFeet(insectPlague.rangeFeet),
          damage: { expr: damageExpr, damageType: "piercing" },
        },
      ];
    },
  );
}

function insectPlagueAreaHazardSpell(
  spell: SpellRecord,
): InsectPlagueProfileShape | null {
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
  const passiveOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "passive",
  );
  const enterOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_enters_area",
  );
  const endTurnOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_ends_turn_in_area",
  );
  const initialPhase = spell.mechanics.initialPhase;
  const initialDamageAmount = insectPlagueSaveGateDamageAmount(initialPhase);

  if (
    spell.mechanics.level !== INSECT_PLAGUE_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== INSECT_PLAGUE_RANGE_FEET ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== INSECT_PLAGUE_DURATION_MINUTES ||
    spell.mechanics.operations.length !== INSECT_PLAGUE_OPERATION_COUNT ||
    durationTicks === null ||
    Either.isLeft(durationTicks) ||
    area?.kind !== "area" ||
    area.origin.kind !== "point_within_range" ||
    area.shape.kind !== "sphere" ||
    area.shape.radiusFeet !== INSECT_PLAGUE_RADIUS_FEET ||
    !isInsectPlaguePassiveOperation(passiveOperation?.effect) ||
    initialDamageAmount === null ||
    insectPlagueSaveGateDamageAmount(enterOperation?.effect) === null ||
    insectPlagueSaveGateDamageAmount(endTurnOperation?.effect) === null ||
    enterOperation?.usageLimit?.kind !== "once_per_turn" ||
    endTurnOperation?.usageLimit?.kind !== "once_per_turn"
  ) {
    return null;
  }

  return {
    durationTicks: durationTicks.right,
    rangeFeet: spell.mechanics.range.feet,
    radiusFeet: area.shape.radiusFeet,
    damageAmount: initialDamageAmount,
  };
}

function isInsectPlaguePassiveOperation(
  effect: InsectPlagueMechanics["operations"][number]["effect"] | undefined,
): boolean {
  if (effect?.kind !== "composite" || effect.effects.length !== 2) {
    return false;
  }
  return (
    effect.effects.some(
      (candidate) => candidate.kind === "area_is_difficult_terrain",
    ) &&
    effect.effects.some(
      (candidate) => candidate.kind === "area_is_lightly_obscured",
    )
  );
}

function insectPlagueSaveGateDamageAmount(
  effect:
    | InsectPlagueMechanics["initialPhase"]
    | InsectPlagueMechanics["operations"][number]["effect"]
    | undefined,
): InsectPlagueProfileShape["damageAmount"] | null {
  if (
    effect?.kind === "save_gate" &&
    effect.ability === "con" &&
    effect.dc.kind === "caster_spell_save_dc" &&
    effect.onSuccess.kind === "half_damage" &&
    effect.onFail.kind === "damage" &&
    effect.onFail.damageType === "piercing" &&
    effect.onFail.amount.kind === "linear_per_level" &&
    effect.onFail.amount.axis === "slot" &&
    effect.onFail.amount.startingAtLevel === INSECT_PLAGUE_LEVEL &&
    effect.onFail.amount.base.dice === INSECT_PLAGUE_BASE_DAMAGE_DICE &&
    effect.onFail.amount.base.dieSize === INSECT_PLAGUE_DAMAGE_DIE_SIZE &&
    effect.onFail.amount.perLevel?.dice ===
      INSECT_PLAGUE_DAMAGE_DICE_PER_SLOT_LEVEL
  ) {
    return effect.onFail.amount;
  }
  return null;
}

function discoverInsectPlagueAreaHazardCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: InsectPlagueAreaHazardSpellInvocation,
): readonly AvailableBattleAct[] {
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        invocation: insectPlagueAreaHazardInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: `${insectPlagueAreaHazardCastSummary(
        invocation,
      )} The table supplies the Insect Plague sphere area identity.`,
      initialHoles: [spellAreaChoiceHole(invocation)],
    },
  ];
}

function insectPlagueAreaHazardInvocationRef(
  invocation: InsectPlagueAreaHazardSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "insectPlagueAreaHazard",
  };
}

function insectPlagueAreaHazardCastSummary(
  invocation: InsectPlagueAreaHazardSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveInsectPlagueAreaHazard(
  input: InsectPlagueAreaHazardResolveInput,
): BattleResolutionResult {
  return resolveInsectPlagueAreaHazardSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

const InsectPlagueAreaHazardInvocationSchema = spellProcedureInvocationSchema<
  Extract<
    SupportedSpellInvocation,
    { readonly procedure: "insectPlagueAreaHazard" }
  >
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("insectPlagueAreaHazard"),
    spell: BattleRuntimeObjectSchema,
    ability: Schema.Literal("con"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("pointOriginSphere"),
      radiusFeet: MovementFeet,
    }),
    durationTicks: BattleRuntimeObjectSchema,
    rangeFeet: MovementFeet,
    damage: Schema.Struct({
      expr: BattleRuntimeObjectSchema,
      damageType: Schema.Literal("piercing"),
    }),
  }),
);

export const insectPlagueAreaHazardProfile = {
  procedure: "insectPlagueAreaHazard",
  invocationSchema: InsectPlagueAreaHazardInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitInsectPlagueAreaHazard,
  discoverCastAct: discoverInsectPlagueAreaHazardCastAct,
  castSummary: insectPlagueAreaHazardCastSummary,
  invocationRef: insectPlagueAreaHazardInvocationRef,
  resolve: resolveInsectPlagueAreaHazard,
} satisfies SpellProcedureProfile<
  "insectPlagueAreaHazard",
  InsectPlagueAreaHazardSpellInvocation,
  ActionSpellBattleResolutionInput
>;
