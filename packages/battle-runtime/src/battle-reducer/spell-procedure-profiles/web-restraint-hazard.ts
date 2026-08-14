import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
import { ongoingConcentrationAreaSpellFacts } from "../ongoing-concentration-area-spell.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-web-restraint-hazard
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
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

import { type ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import { Either } from "effect";

import {
  type BattleResolutionResult,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { discoverActionSpellAreaCastAct } from "../spell-area-cast-discovery.ts";
import { resolveWebRestraintHazardSpellAct } from "../spells-resolve-area-effects.ts";
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
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type WebRestraintHazardSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "webRestraintHazard" }
>;
type WebRestraintHazardResolveInput =
  SpellProcedureProfileResolveInput<WebRestraintHazardSpellInvocation>;
type OngoingOperationEffect = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>["operations"][number]["effect"];
type OngoingOperation = Extract<
  BattleSpellAdmissionSource["mechanics"],
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
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly WebRestraintHazardSpellInvocation[] {
  const web = webRestraintHazardSpell(spell);
  if (web === null) {
    return [];
  }

  return ctx.spellCastOptions.flatMap(
    (slot): readonly WebRestraintHazardSpellInvocation[] => {
      if (Number(slot.spellLevel) < WEB_LEVEL) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
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
  spell: BattleSpellAdmissionSource,
): WebRestraintHazardProfileShape | null {
  const ongoing = ongoingConcentrationAreaSpellFacts(spell);
  if (ongoing === null) {
    return null;
  }
  const { mechanics, duration, durationTicks, area } = ongoing;
  const enterOperation = mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_enters_area",
  );
  const startTurnOperation = mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_starts_turn_in_area",
  );
  const escapeOperation = mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_affected_creature_spends_action",
  );
  const difficultTerrainOperation = mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_is_difficult_terrain",
  );
  const lightlyObscuredOperation = mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_is_lightly_obscured",
  );
  const anchorOperation = mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_anchor_or_layering_requirement",
  );
  const burnAwayOperation = mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_section_burns_away",
  );

  if (
    mechanics.level !== WEB_LEVEL ||
    mechanics.castingTime.kind !== "action" ||
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== WEB_RANGE_FEET ||
    duration.upTo.unit !== "hour" ||
    duration.upTo.amount !== WEB_DURATION_HOURS ||
    mechanics.operations.length !== WEB_OPERATION_COUNT ||
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
    rangeFeet: mechanics.range.feet,
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

const WebRestraintHazardInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("webRestraintHazard"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    ability: Schema.Literal("dex"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("pointOriginCube"),
      sideFeet: MovementFeet,
    }),
    durationTicks: ElapsedTimeTicksSchema,
    rangeFeet: MovementFeet,
  }),
);
export const webRestraintHazardProfile = {
  procedure: "webRestraintHazard",
  executionSchema: WebRestraintHazardInvocationSchema,
  admit: admitWebRestraintHazard,
  discoverCastAct: discoverActionSpellAreaCastAct,
  resolve: resolveWebRestraintHazard,
} satisfies SpellProcedureDeclaration<
  "webRestraintHazard",
  WebRestraintHazardSpellInvocation
>;
import { spellInvocationResourceForCastOption } from "./profile.ts";
