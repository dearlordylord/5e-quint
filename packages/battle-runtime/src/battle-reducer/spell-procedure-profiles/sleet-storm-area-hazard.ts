// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-sleet-storm-area-hazard
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SLEET_STORM_AREA_HAZARD_LIFECYCLE
//
// The Sleet Storm Spell Procedure Profile: action-time Spell Slot casting
// creates a caster-owned Concentration Cylinder. The runtime owns Spell Slot
// spending, Concentration duration, caller-supplied Cylinder identity,
// Difficult Terrain and Heavily Obscured projections, a shared per-turn
// Dexterity Saving Throw ledger, failed-save Prone application, failed-save
// Concentration loss, and duration/concentration cleanup. Exposed-flame
// dousing, automatic table geometry, and pathfinding remain outside the battle
// runtime.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-S-Z.md "Sleet Storm":
//     Action; 150 feet; Concentration up to 1 minute; 40-foot-tall
//     20-foot-radius Cylinder; Heavily Obscured; exposed flames are doused;
//     ground is Difficult Terrain; first entry on a turn or turn start in the
//     Cylinder requires a Dexterity save or the creature has Prone and loses
//     Concentration.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Slot, Concentration, Spell
//     Invocation, Area of Effect/Cylinder, Difficult Terrain, Heavily Obscured,
//     Prone, and Saving Throw.

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
import { resolveSleetStormAreaHazardSpellAct } from "../spells-resolve-area-effects.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellProcedureInvocationSchema } from "./profile.ts";

type SleetStormAreaHazardSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "sleetStormAreaHazard" }
>;
type SleetStormAreaHazardResolveInput = SpellProcedureProfileResolveInput<
  SleetStormAreaHazardSpellInvocation,
  ActionSpellBattleResolutionInput
>;
type OngoingMechanics = Extract<
  SpellRecord["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type OngoingOperationEffect = OngoingMechanics["operations"][number]["effect"];
type OngoingSaveGateEffect = Extract<
  OngoingOperationEffect,
  { readonly kind: "save_gate" }
>;
type SleetStormAreaHazardSaveEffect = OngoingSaveGateEffect & {
  readonly onFail: Extract<
    OngoingSaveGateEffect["onFail"],
    { readonly kind: "composite" }
  >;
};
type SleetStormAreaHazardProfileShape = {
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: number;
  readonly radiusFeet: number;
  readonly heightFeet: number;
};

const SLEET_STORM_LEVEL = 3;
const SLEET_STORM_RANGE_FEET = 150;
const SLEET_STORM_DURATION_MINUTES = 1;
const SLEET_STORM_OPERATION_COUNT = 5;
const SLEET_STORM_RADIUS_FEET = 20;
const SLEET_STORM_HEIGHT_FEET = 40;

function admitSleetStormAreaHazard(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly SleetStormAreaHazardSpellInvocation[] {
  const sleetStorm = sleetStormAreaHazardSpell(spell);
  if (sleetStorm === null) {
    return [];
  }

  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly SleetStormAreaHazardSpellInvocation[] => {
      if (Number(slot.spellLevel) < SLEET_STORM_LEVEL) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
          procedure: "sleetStormAreaHazard",
          spell,
          ability: "dex",
          dc: { kind: "caster_spell_save_dc" },
          targeting: {
            kind: "pointOriginCylinder",
            radiusFeet: movementFeet(sleetStorm.radiusFeet),
            heightFeet: movementFeet(sleetStorm.heightFeet),
          },
          durationTicks: sleetStorm.durationTicks,
          rangeFeet: movementFeet(sleetStorm.rangeFeet),
        },
      ];
    },
  );
}

function sleetStormAreaHazardSpell(
  spell: SpellRecord,
): SleetStormAreaHazardProfileShape | null {
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
  const enterOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_enters_area",
  );
  const startTurnOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_starts_turn_in_area",
  );
  const difficultTerrainOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_is_difficult_terrain",
  );
  const heavilyObscuredOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_is_heavily_obscured",
  );
  const exposedFlamesOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "douse_exposed_flames",
  );
  const sharedSaveLimitGroup = sharedOncePerTurnLimitGroup(
    enterOperation,
    startTurnOperation,
  );

  if (
    spell.mechanics.level !== SLEET_STORM_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== SLEET_STORM_RANGE_FEET ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== SLEET_STORM_DURATION_MINUTES ||
    spell.mechanics.operations.length !== SLEET_STORM_OPERATION_COUNT ||
    durationTicks === null ||
    Either.isLeft(durationTicks) ||
    area?.kind !== "area" ||
    area.origin.kind !== "point_within_range" ||
    area.shape.kind !== "cylinder" ||
    area.shape.radiusFeet !== SLEET_STORM_RADIUS_FEET ||
    area.shape.heightFeet !== SLEET_STORM_HEIGHT_FEET ||
    !isSleetStormAreaHazardSaveGate(enterOperation?.effect) ||
    !isSleetStormAreaHazardSaveGate(startTurnOperation?.effect) ||
    sharedSaveLimitGroup === null ||
    difficultTerrainOperation === undefined ||
    heavilyObscuredOperation === undefined ||
    exposedFlamesOperation === undefined
  ) {
    return null;
  }

  return {
    durationTicks: durationTicks.right,
    rangeFeet: spell.mechanics.range.feet,
    radiusFeet: area.shape.radiusFeet,
    heightFeet: area.shape.heightFeet,
  };
}

function sharedOncePerTurnLimitGroup(
  enterOperation: OngoingMechanics["operations"][number] | undefined,
  startTurnOperation: OngoingMechanics["operations"][number] | undefined,
): string | null {
  const enterLimit = enterOperation?.usageLimit;
  const startTurnLimit = startTurnOperation?.usageLimit;
  if (
    enterLimit?.kind !== "once_per_turn" ||
    startTurnLimit?.kind !== "once_per_turn" ||
    enterLimit.limitGroup === undefined ||
    startTurnLimit.limitGroup === undefined ||
    enterLimit.limitGroup !== startTurnLimit.limitGroup
  ) {
    return null;
  }
  return enterLimit.limitGroup;
}

function isSleetStormAreaHazardSaveGate(
  effect: OngoingOperationEffect | undefined,
): effect is SleetStormAreaHazardSaveEffect {
  if (
    effect?.kind !== "save_gate" ||
    effect.ability !== "dex" ||
    effect.dc.kind !== "caster_spell_save_dc" ||
    effect.onSuccess.kind !== "none" ||
    effect.onFail.kind !== "composite" ||
    effect.onFail.effects.length !== 2
  ) {
    return false;
  }
  const appliesProne = effect.onFail.effects.some(
    (failedEffect) =>
      failedEffect.kind === "apply_condition" &&
      failedEffect.condition === "prone",
  );
  const breaksConcentration = effect.onFail.effects.some(
    (failedEffect) => failedEffect.kind === "break_concentration",
  );
  return appliesProne && breaksConcentration;
}

function discoverSleetStormAreaHazardCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: SleetStormAreaHazardSpellInvocation,
): readonly AvailableBattleAct[] {
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        invocation: sleetStormAreaHazardInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: `${sleetStormAreaHazardCastSummary(
        invocation,
      )} The table supplies the Sleet Storm cylinder area identity.`,
      initialHoles: [spellAreaChoiceHole(invocation)],
    },
  ];
}

function sleetStormAreaHazardInvocationRef(
  invocation: SleetStormAreaHazardSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "sleetStormAreaHazard",
  };
}

function sleetStormAreaHazardCastSummary(
  invocation: SleetStormAreaHazardSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveSleetStormAreaHazard(
  input: SleetStormAreaHazardResolveInput,
): BattleResolutionResult {
  return resolveSleetStormAreaHazardSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

const SleetStormAreaHazardInvocationSchema = spellProcedureInvocationSchema<
  Extract<
    SupportedSpellInvocation,
    { readonly procedure: "sleetStormAreaHazard" }
  >
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("sleetStormAreaHazard"),
    spell: BattleRuntimeObjectSchema,
    ability: Schema.Literal("dex"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("pointOriginCylinder"),
      radiusFeet: MovementFeet,
      heightFeet: MovementFeet,
    }),
    durationTicks: Schema.Number,
    rangeFeet: MovementFeet,
  }),
);

export const sleetStormAreaHazardProfile = {
  procedure: "sleetStormAreaHazard",
  invocationSchema: SleetStormAreaHazardInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitSleetStormAreaHazard,
  discoverCastAct: discoverSleetStormAreaHazardCastAct,
  castSummary: sleetStormAreaHazardCastSummary,
  invocationRef: sleetStormAreaHazardInvocationRef,
  resolve: resolveSleetStormAreaHazard,
} satisfies SpellProcedureProfile<
  "sleetStormAreaHazard",
  SleetStormAreaHazardSpellInvocation,
  ActionSpellBattleResolutionInput
>;
