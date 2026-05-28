// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-fog-cloud-obscurement
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.FOG_CLOUD_OBSCUREMENT_LIFECYCLE
//
// The Fog Cloud Spell Procedure Profile: action-time Spell Slot casting creates
// a caster-owned Concentration Sphere of Heavily Obscured fog. The runtime owns
// Spell Slot spending, slot-scaled radius, Concentration duration, Heavily
// Obscured area projection, and typed strong-wind cleanup; the table owns
// spatial area membership, line-of-sight derivation, wind derivation, and map
// geometry.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-E-L.md "Fog Cloud": Action;
//     120 feet; Concentration up to 1 hour; 20-foot-radius Sphere centered on
//     a point within range; Sphere is Heavily Obscured; strong wind disperses
//     it; +20-foot radius per slot level above 1.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Concentration, Spell Slot, Spell
//     Invocation, Area of Effect/Sphere, and Heavily Obscured.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import { spellInvocationSchemaUnavailable } from "./profile.ts";
import type { LinearPerLevel, SpellRecord } from "@dnd/surface/surface/types";
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
import { spellAreaChoiceHole } from "../spells-holes-fills.ts";
import { resolveFogCloudObscurementSpellAct } from "../spells-resolve-area-effects.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";

type FogCloudObscurementSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "fogCloudObscurement" }
>;
type FogCloudObscurementResolveInput = SpellProcedureProfileResolveInput<
  FogCloudObscurementSpellInvocation,
  ActionSpellBattleResolutionInput
>;
type FogCloudObscurementProfileShape = {
  readonly durationTicks: ElapsedTimeTicks;
  readonly radius: LinearPerLevel<number>;
};

const FOG_CLOUD_LEVEL = 1;
const FOG_CLOUD_RANGE_FEET = 120;
const FOG_CLOUD_DURATION_HOURS = 1;
const FOG_CLOUD_OPERATION_COUNT = 1;
const FOG_CLOUD_BASE_RADIUS_FEET = 20;
const FOG_CLOUD_RADIUS_FEET_PER_SLOT_LEVEL = 20;

function admitFogCloudObscurement(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly FogCloudObscurementSpellInvocation[] {
  const fogCloud = fogCloudObscurementSpell(spell);
  if (fogCloud === null) {
    return [];
  }

  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly FogCloudObscurementSpellInvocation[] => {
      if (Number(slot.spellLevel) < FOG_CLOUD_LEVEL) {
        return [];
      }
      const radiusFeet =
        fogCloud.radius.base +
        Math.max(0, Number(slot.spellLevel) - fogCloud.radius.startingAtLevel) *
          fogCloud.radius.perLevel;
      return [
        {
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
          procedure: "fogCloudObscurement",
          spell,
          targeting: {
            kind: "pointOriginSphere",
            radiusFeet: movementFeet(radiusFeet),
          },
          durationTicks: fogCloud.durationTicks,
          rangeFeet: movementFeet(FOG_CLOUD_RANGE_FEET),
        },
      ];
    },
  );
}

function fogCloudObscurementSpell(
  spell: SpellRecord,
): FogCloudObscurementProfileShape | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const earlyEnd =
    spell.mechanics.duration.kind === "concentration"
      ? (spell.mechanics.duration.earlyEnd ?? [])
      : [];
  const attachment = spell.mechanics.attachment;
  const fogArea =
    attachment.kind === "hole" &&
    attachment.value.kind === "area" &&
    "shape" in attachment.value
      ? attachment.value
      : null;
  const radius =
    fogArea?.shape.kind === "sphere" ? fogArea.shape.radiusFeet : null;
  const obscurementOperation = spell.mechanics.operations[0];

  if (
    spell.mechanics.level !== FOG_CLOUD_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== FOG_CLOUD_RANGE_FEET ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "hour" ||
    spell.mechanics.duration.upTo.amount !== FOG_CLOUD_DURATION_HOURS ||
    earlyEnd.length !== 1 ||
    earlyEnd[0]?.kind !== "area_dispersed_by_strong_wind" ||
    spell.mechanics.operations.length !== FOG_CLOUD_OPERATION_COUNT ||
    obscurementOperation?.trigger.kind !== "passive" ||
    obscurementOperation.effect.kind !== "area_is_heavily_obscured" ||
    fogArea?.origin.kind !== "point_within_range" ||
    radius === null ||
    typeof radius !== "object" ||
    radius.kind !== "linear_per_level" ||
    radius.axis !== "slot" ||
    radius.startingAtLevel !== FOG_CLOUD_LEVEL ||
    radius.base !== FOG_CLOUD_BASE_RADIUS_FEET ||
    radius.perLevel !== FOG_CLOUD_RADIUS_FEET_PER_SLOT_LEVEL ||
    durationTicks === null ||
    Either.isLeft(durationTicks)
  ) {
    return null;
  }

  return {
    durationTicks: durationTicks.right,
    radius,
  };
}

function discoverFogCloudObscurementCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: FogCloudObscurementSpellInvocation,
): readonly AvailableBattleAct[] {
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        invocation: fogCloudObscurementInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: `${fogCloudObscurementCastSummary(
        invocation,
      )} The table supplies the fog area identity.`,
      initialHoles: [spellAreaChoiceHole(invocation)],
    },
  ];
}

function fogCloudObscurementInvocationRef(
  invocation: FogCloudObscurementSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "fogCloudObscurement",
  };
}

function fogCloudObscurementCastSummary(
  invocation: FogCloudObscurementSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveFogCloudObscurement(
  input: FogCloudObscurementResolveInput,
): BattleResolutionResult {
  return resolveFogCloudObscurementSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

export const fogCloudObscurementProfile = {
  procedure: "fogCloudObscurement",
  invocationSchema: spellInvocationSchemaUnavailable(),
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitFogCloudObscurement,
  discoverCastAct: discoverFogCloudObscurementCastAct,
  castSummary: fogCloudObscurementCastSummary,
  invocationRef: fogCloudObscurementInvocationRef,
  resolve: resolveFogCloudObscurement,
} satisfies SpellProcedureProfile<
  "fogCloudObscurement",
  FogCloudObscurementSpellInvocation,
  ActionSpellBattleResolutionInput
>;
