// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-magical-darkness-point-origin
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE
//
// The magicalDarknessPointOrigin Spell Procedure Profile: action-time Spell
// Slot casting creates a caster-owned Concentration Sphere of magical
// Darkness. The runtime owns Spell Slot spending, Concentration duration,
// caller-supplied point-origin Sphere identity, magical Darkness sight and
// nonmagical-light projection, overlap dispel of tracked spell-created light,
// and cleanup. The object-origin Emanation branch remains a separate
// object-origin spell-area boundary.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-A-D.md "Darkness": Action;
//     60 feet; Concentration up to 10 minutes; magical Darkness spreads from
//     a point within range and fills a 15-foot-radius Sphere; Darkvision can't
//     see through it; nonmagical light can't illuminate it; overlapping Bright
//     Light or Dim Light created by a spell of level 2 or lower is dispelled.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Concentration, Spell Slot, Spell
//     Invocation, Area of Effect/Sphere, Darkness, Heavily Obscured,
//     Darkvision, Bright Light, Dim Light, and Illumination.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import { spellInvocationSchemaUnavailable } from "./profile.ts";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import type { SpellInvocationRef } from "../../battle-subjects.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import {
  parseBattleSpellEffectLevel,
  type BattleSpellEffectLevel,
} from "../spells-effective-level.ts";
import { spellAreaChoiceHole } from "../spells-holes-fills.ts";
import { resolveMagicalDarknessPointOriginSpellAct } from "../spells-resolve-area-effects.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

type MagicalDarknessPointOriginSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "magicalDarknessPointOrigin" }
>;
type MagicalDarknessPointOriginResolveInput = SpellProcedureProfileResolveInput<
  MagicalDarknessPointOriginSpellInvocation,
  ActionSpellBattleResolutionInput
>;
type MagicalDarknessPointOriginProfileShape = {
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: number;
  readonly radiusFeet: number;
  readonly dispelledSpellCreatedLightMaxSpellLevel: BattleSpellEffectLevel;
};

const DARKNESS_LEVEL = 2;
const DARKNESS_RANGE_FEET = 60;
const DARKNESS_DURATION_MINUTES = 10;
const DARKNESS_OPERATION_COUNT = 2;
const DARKNESS_RADIUS_FEET = 15;
const DARKNESS_DISPELLED_LIGHT_MAX_SPELL_LEVEL = 2;

function admitMagicalDarknessPointOrigin(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly MagicalDarknessPointOriginSpellInvocation[] {
  const darkness = magicalDarknessPointOriginSpell(spell);
  if (darkness === null) {
    return [];
  }

  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly MagicalDarknessPointOriginSpellInvocation[] => {
      if (Number(slot.spellLevel) < DARKNESS_LEVEL) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
          procedure: "magicalDarknessPointOrigin",
          spell,
          targeting: {
            kind: "pointOriginSphere",
            radiusFeet: movementFeet(darkness.radiusFeet),
          },
          durationTicks: darkness.durationTicks,
          rangeFeet: movementFeet(darkness.rangeFeet),
          dispelledSpellCreatedLightMaxSpellLevel:
            darkness.dispelledSpellCreatedLightMaxSpellLevel,
        },
      ];
    },
  );
}

function magicalDarknessPointOriginSpell(
  spell: SpellRecord,
): MagicalDarknessPointOriginProfileShape | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const attachment = spell.mechanics.attachment;
  const darknessOperation = spell.mechanics.operations[0];
  const overlapOperation = spell.mechanics.operations[1];
  const maxSpellLevel =
    overlapOperation?.effect.kind ===
    "end_overlapping_spell_created_bright_or_dim_light"
      ? parseBattleSpellEffectLevel(overlapOperation.effect.maxSpellLevel)
      : null;
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const earlyEnd =
    spell.mechanics.duration.kind === "concentration"
      ? (spell.mechanics.duration.earlyEnd ?? [])
      : [];
  const rangeFeet =
    spell.mechanics.range.kind === "point" ? spell.mechanics.range.feet : null;
  const area =
    attachment.kind === "hole" &&
    attachment.value.kind === "area" &&
    "shape" in attachment.value
      ? attachment.value
      : null;
  const radius = area?.shape.kind === "sphere" ? area.shape.radiusFeet : null;

  if (
    spell.mechanics.level !== DARKNESS_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    rangeFeet !== DARKNESS_RANGE_FEET ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== DARKNESS_DURATION_MINUTES ||
    earlyEnd.length !== 0 ||
    spell.mechanics.operations.length !== DARKNESS_OPERATION_COUNT ||
    darknessOperation?.trigger.kind !== "passive" ||
    darknessOperation.effect.kind !== "area_is_magical_darkness" ||
    overlapOperation?.trigger.kind !== "passive" ||
    maxSpellLevel !== DARKNESS_DISPELLED_LIGHT_MAX_SPELL_LEVEL ||
    area?.origin.kind !== "point_within_range" ||
    radius !== DARKNESS_RADIUS_FEET ||
    durationTicks === null ||
    Either.isLeft(durationTicks)
  ) {
    return null;
  }

  return {
    durationTicks: durationTicks.right,
    rangeFeet,
    radiusFeet: radius,
    dispelledSpellCreatedLightMaxSpellLevel: maxSpellLevel,
  };
}

function discoverMagicalDarknessPointOriginCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: MagicalDarknessPointOriginSpellInvocation,
): readonly AvailableBattleAct[] {
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        invocation: magicalDarknessPointOriginInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: `${magicalDarknessPointOriginCastSummary(
        invocation,
      )} The table supplies the magical Darkness area identity.`,
      initialHoles: [spellAreaChoiceHole(invocation)],
    },
  ];
}

function magicalDarknessPointOriginInvocationRef(
  invocation: MagicalDarknessPointOriginSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "magicalDarknessPointOrigin",
  };
}

function magicalDarknessPointOriginCastSummary(
  invocation: MagicalDarknessPointOriginSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveMagicalDarknessPointOrigin(
  input: MagicalDarknessPointOriginResolveInput,
): BattleResolutionResult {
  return resolveMagicalDarknessPointOriginSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

export const magicalDarknessPointOriginProfile = {
  procedure: "magicalDarknessPointOrigin",
  invocationSchema: spellInvocationSchemaUnavailable(),
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitMagicalDarknessPointOrigin,
  discoverCastAct: discoverMagicalDarknessPointOriginCastAct,
  castSummary: magicalDarknessPointOriginCastSummary,
  invocationRef: magicalDarknessPointOriginInvocationRef,
  resolve: resolveMagicalDarknessPointOrigin,
} satisfies SpellProcedureProfile<
  "magicalDarknessPointOrigin",
  MagicalDarknessPointOriginSpellInvocation,
  ActionSpellBattleResolutionInput
>;
