// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE
//
// The Web Spell Procedure Profile: action-time Spell Slot casting creates a
// caster-owned Concentration Cube of sticky webs. The runtime owns Spell Slot
// spending, Concentration duration, table-supplied Cube identity, Difficult
// Terrain and Lightly Obscured projections, the per-turn entry/start-turn
// Dexterity Saving Throw ledger, failed-save Restrained application, Strength
// (Athletics) escape, and cleanup when table/spatial/environment witnesses say
// the effect ends or a creature is no longer in the webs.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-S-Z.md "Web": Action; 60
//     feet; Concentration up to 1 hour; 20-foot Cube at a point within range;
//     webs are Difficult Terrain and Lightly Obscured; the first time a
//     creature enters the webs on a turn or starts its turn there, it makes a
//     Dexterity save or has Restrained while in the webs or until escape; an
//     affected creature can spend an action on a Strength (Athletics) check
//     against the caster's spell save DC to break free; anchoring/depth/fire
//     clauses remain table/environment facts.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Slot, Concentration, Spell
//     Invocation, Area of Effect/Cube, Difficult Terrain, Lightly Obscured,
//     Restrained, Saving Throw, Ability Check, Movement, and Condition.

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
import { resolveWebRestraintHazardSpellAct } from "../spells-resolve-area-effects.ts";
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

type WebRestraintHazardSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "webRestraintHazard" }
>;
type WebRestraintHazardResolveInput = SpellProcedureProfileResolveInput<
  WebRestraintHazardSpellInvocation,
  ActionSpellBattleResolutionInput
>;
type OngoingOperationEffect = Extract<
  SpellRecord["mechanics"],
  { readonly family: "ongoing_effect" }
>["operations"][number]["effect"];
type OngoingOperation = Extract<
  SpellRecord["mechanics"],
  { readonly family: "ongoing_effect" }
>["operations"][number];
type OngoingSaveGateEffect = Extract<
  OngoingOperationEffect,
  { readonly kind: "save_gate" }
>;
type WebRestraintSaveEffect = OngoingSaveGateEffect & {
  readonly onFail: Extract<
    OngoingSaveGateEffect["onFail"],
    { readonly kind: "apply_condition_while_in_area_or_until_escape" }
  >;
};
type WebRestraintHazardProfileShape = {
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: number;
  readonly sideFeet: number;
};

const WEB_LEVEL = 2;
const WEB_RANGE_FEET = 60;
const WEB_DURATION_HOURS = 1;
const WEB_OPERATION_COUNT = 7;
const WEB_CUBE_SIDE_FEET = 20;

function admitWebRestraintHazard(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly WebRestraintHazardSpellInvocation[] {
  const web = webRestraintHazardSpell(spell);
  if (web === null) {
    return [];
  }

  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly WebRestraintHazardSpellInvocation[] => {
      if (Number(slot.spellLevel) < WEB_LEVEL) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
          procedure: "webRestraintHazard",
          spell,
          ability: "dex",
          dc: { kind: "caster_spell_save_dc" },
          targeting: {
            kind: "pointOriginCube",
            sideFeet: movementFeet(web.sideFeet),
          },
          durationTicks: web.durationTicks,
          rangeFeet: movementFeet(web.rangeFeet),
        },
      ];
    },
  );
}

function webRestraintHazardSpell(
  spell: SpellRecord,
): WebRestraintHazardProfileShape | null {
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
  const escapeOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_affected_creature_spends_action",
  );
  const difficultTerrainOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_is_difficult_terrain",
  );
  const lightlyObscuredOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_is_lightly_obscured",
  );
  const anchorOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_anchor_or_layering_requirement",
  );
  const burnAwayOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_section_burns_away",
  );

  if (
    spell.mechanics.level !== WEB_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== WEB_RANGE_FEET ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "hour" ||
    spell.mechanics.duration.upTo.amount !== WEB_DURATION_HOURS ||
    spell.mechanics.operations.length !== WEB_OPERATION_COUNT ||
    durationTicks === null ||
    Either.isLeft(durationTicks) ||
    area?.kind !== "area" ||
    area.origin.kind !== "point_within_range" ||
    area.shape.kind !== "cube" ||
    area.shape.sideFeet !== WEB_CUBE_SIDE_FEET ||
    !isWebRestraintSaveGate(enterOperation?.effect) ||
    enterOperation?.usageLimit?.kind !== "once_per_turn" ||
    !isWebRestraintSaveGate(startTurnOperation?.effect) ||
    !isWebRestraintEscapeOperation(escapeOperation) ||
    difficultTerrainOperation === undefined ||
    lightlyObscuredOperation === undefined ||
    anchorOperation?.effect.kind !== "area_anchor_or_layering_requirement" ||
    burnAwayOperation?.effect.kind !== "area_section_burns_away"
  ) {
    return null;
  }

  return {
    durationTicks: durationTicks.right,
    rangeFeet: spell.mechanics.range.feet,
    sideFeet: area.shape.sideFeet,
  };
}

function isWebRestraintSaveGate(
  effect: OngoingOperationEffect | undefined,
): effect is WebRestraintSaveEffect {
  return (
    effect?.kind === "save_gate" &&
    effect.ability === "dex" &&
    effect.dc.kind === "caster_spell_save_dc" &&
    effect.onSuccess.kind === "none" &&
    effect.onFail.kind === "apply_condition_while_in_area_or_until_escape" &&
    effect.onFail.condition === "restrained"
  );
}

function isWebRestraintEscapeOperation(
  operation: OngoingOperation | undefined,
): boolean {
  return (
    operation?.trigger.kind === "on_affected_creature_spends_action" &&
    operation.trigger.cost.kind === "action" &&
    operation.predicate?.kind === "has_condition" &&
    operation.predicate.condition === "restrained" &&
    operation.effect.kind === "ability_check_gate" &&
    operation.effect.ability === "str" &&
    operation.effect.skill === "athletics" &&
    operation.effect.dc.kind === "caster_spell_save_dc" &&
    operation.effect.onPass.kind === "remove_condition" &&
    operation.effect.onPass.condition === "restrained"
  );
}

function discoverWebRestraintHazardCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: WebRestraintHazardSpellInvocation,
): readonly AvailableBattleAct[] {
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        invocation: webRestraintHazardInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: `${webRestraintHazardCastSummary(
        invocation,
      )} The table supplies the Web cube area identity.`,
      initialHoles: [spellAreaChoiceHole(invocation)],
    },
  ];
}

function webRestraintHazardInvocationRef(
  invocation: WebRestraintHazardSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "webRestraintHazard",
  };
}

function webRestraintHazardCastSummary(
  invocation: WebRestraintHazardSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function resolveWebRestraintHazard(
  input: WebRestraintHazardResolveInput,
): BattleResolutionResult {
  return resolveWebRestraintHazardSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

const WebRestraintHazardInvocationSchema = spellProcedureInvocationSchema<
  Extract<
    SupportedSpellInvocation,
    { readonly procedure: "webRestraintHazard" }
  >
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("webRestraintHazard"),
    spell: BattleRuntimeObjectSchema,
    ability: Schema.Literal("dex"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("pointOriginCube"),
      sideFeet: MovementFeet,
    }),
    durationTicks: Schema.Number,
    rangeFeet: MovementFeet,
  }),
);
export const webRestraintHazardProfile = {
  procedure: "webRestraintHazard",
  invocationSchema: WebRestraintHazardInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitWebRestraintHazard,
  discoverCastAct: discoverWebRestraintHazardCastAct,
  castSummary: webRestraintHazardCastSummary,
  invocationRef: webRestraintHazardInvocationRef,
  resolve: resolveWebRestraintHazard,
} satisfies SpellProcedureProfile<
  "webRestraintHazard",
  WebRestraintHazardSpellInvocation,
  ActionSpellBattleResolutionInput
>;
