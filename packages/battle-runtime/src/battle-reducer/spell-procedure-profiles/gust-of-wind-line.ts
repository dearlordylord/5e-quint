import { optionalProperty } from "../../optional-property.ts";
import { discoverSavingThrowSpellCastActs } from "../saving-throw-metamagic-holes.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-gust-of-wind-line unit-feature.metamagic-heightened-save-disadvantage
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE
//
// The Gust of Wind Line Spell Procedure Profile: action-time Spell Slot
// casting creates a caster-owned Concentration Line of strong wind. The
// runtime owns Spell Slot spending, Concentration duration, table-supplied
// Line identity and direction, Strength Saving Throw-gated push facts,
// Movement cost facts for moving closer to the caster through the Line, and
// later-turn Bonus Action direction changes; the table owns spatial
// membership, gas or vapor dispersal, flame presentation, and map geometry.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-E-L.md "Gust of Wind":
//     Action; Self; Concentration up to 1 minute; 60-foot by 10-foot Line;
//     Strength Saving Throw or 15-foot push away from the caster following the
//     Line; repeated save for creatures ending turns in the Line; 2 feet of
//     Movement per 1 foot closer to the caster; later-turn Bonus Action
//     direction change; gas/vapor/flame clauses are table/presentation facts.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Bonus Action, Concentration,
//     Spell Slot, Spell Invocation, Area of Effect/Line, Saving Throw,
//     Movement, and Opportunity Attack.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import { Result } from "effect";
import {
  type BattleActDiscoveryCandidate,
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { type CombatantId } from "../../identity.ts";
import { resolveDirectionalPersistentAreaSpellAct } from "../spells-resolve-area-effects.ts";
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

type DirectionalPersistentAreaSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "directionalPersistentArea" }
>;
type DirectionalPersistentAreaResolveInput =
  SpellProcedureProfileResolveInput<DirectionalPersistentAreaSpellInvocation>;

type OngoingOperationEffect = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>["operations"][number]["effect"];
type DirectionalPersistentAreaInitialPhase = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>["initialPhase"];
type OngoingSaveGateEffect = Extract<
  OngoingOperationEffect,
  { readonly kind: "save_gate" }
>;
type DirectionalPersistentAreaSaveEffect = OngoingSaveGateEffect & {
  readonly onFail: Extract<
    OngoingSaveGateEffect["onFail"],
    { readonly kind: "force_move" }
  >;
};
type DirectionalPersistentAreaProfileShape = {
  readonly durationTicks: ElapsedTimeTicks;
  readonly lengthFeet: number;
  readonly widthFeet: number;
  readonly pushDistanceFeet: number;
};

const GUST_OF_WIND_LEVEL = 2;
const GUST_OF_WIND_RANGE_FEET = 0;
const GUST_OF_WIND_DURATION_MINUTES = 1;
const GUST_OF_WIND_OPERATION_COUNT = 4;
const GUST_OF_WIND_LINE_LENGTH_FEET = 60;
const GUST_OF_WIND_LINE_WIDTH_FEET = 10;
const GUST_OF_WIND_PUSH_DISTANCE_FEET = 15;
const GUST_OF_WIND_MOVEMENT_COST_MULTIPLIER = 2;

function admitDirectionalPersistentArea(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly DirectionalPersistentAreaSpellInvocation[] {
  const line = directionalPersistentAreaSpell(spell);
  if (line === null) {
    return [];
  }

  return ctx.spellCastOptions.flatMap(
    (slot): readonly DirectionalPersistentAreaSpellInvocation[] => {
      if (Number(slot.spellLevel) < GUST_OF_WIND_LEVEL) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "directionalPersistentArea",
          spell,
          ability: "str",
          dc: { kind: "caster_spell_save_dc" },
          targeting: {
            kind: "selfOriginLine",
            lengthFeet: movementFeet(line.lengthFeet),
            widthFeet: movementFeet(line.widthFeet),
          },
          durationTicks: line.durationTicks,
          rangeFeet: movementFeet(GUST_OF_WIND_RANGE_FEET),
          pushDistanceFeet: movementFeet(line.pushDistanceFeet),
          movementCost: {
            multiplier: GUST_OF_WIND_MOVEMENT_COST_MULTIPLIER,
            appliesTo: "towardSource",
          },
        },
      ];
    },
  );
}

function directionalPersistentAreaSpell(
  spell: BattleSpellAdmissionSource,
): DirectionalPersistentAreaProfileShape | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const attachment = spell.mechanics.attachment;
  const lineHole =
    attachment.kind === "hole" && attachment.value.kind === "area"
      ? attachment
      : null;
  const lineArea = lineHole?.value ?? null;
  const initialPhase = spell.mechanics.initialPhase;
  const initialSave = isDirectionalPersistentAreaSaveGate(
    initialPhase,
    lineHole?.holeId,
  )
    ? initialPhase
    : null;
  const strongWindOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_has_strong_wind",
  );
  const movementCostOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_movement_cost_multiplier",
  );
  const endTurnOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_ends_turn_in_area",
  );
  const directionOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_caster_spends_action" &&
      operation.trigger.cost.kind === "bonus_action" &&
      operation.effect.kind === "reposition_attachment",
  );

  if (
    spell.mechanics.level !== GUST_OF_WIND_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "self" ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== GUST_OF_WIND_DURATION_MINUTES ||
    spell.mechanics.operations.length !== GUST_OF_WIND_OPERATION_COUNT ||
    durationTicks === null ||
    Result.isFailure(durationTicks) ||
    lineArea?.kind !== "area" ||
    lineArea.origin.kind !== "self" ||
    lineArea.shape.kind !== "line" ||
    lineArea.shape.lengthFeet !== GUST_OF_WIND_LINE_LENGTH_FEET ||
    lineArea.shape.widthFeet !== GUST_OF_WIND_LINE_WIDTH_FEET ||
    initialSave === null ||
    !isDirectionalPersistentAreaSaveGate(
      endTurnOperation?.effect,
      lineHole?.holeId,
    ) ||
    strongWindOperation?.effect.kind !== "area_has_strong_wind" ||
    movementCostOperation?.effect.kind !== "area_movement_cost_multiplier" ||
    movementCostOperation.effect.multiplier !==
      GUST_OF_WIND_MOVEMENT_COST_MULTIPLIER ||
    movementCostOperation.effect.appliesTo !== "toward_source" ||
    directionOperation?.effect.kind !== "reposition_attachment" ||
    directionOperation.effect.maxMoveFeet !== undefined
  ) {
    return null;
  }
  return {
    durationTicks: durationTicks.success,
    lengthFeet: lineArea.shape.lengthFeet,
    widthFeet: lineArea.shape.widthFeet,
    pushDistanceFeet: initialSave.onFail.distanceFeet,
  };
}

function isDirectionalPersistentAreaSaveGate(
  effect:
    | OngoingOperationEffect
    | DirectionalPersistentAreaInitialPhase
    | undefined,
  areaHoleId: string | undefined,
): effect is DirectionalPersistentAreaSaveEffect {
  return (
    effect?.kind === "save_gate" &&
    areaHoleId !== undefined &&
    effect.attachment?.kind === "hole" &&
    effect.attachment.holeId === areaHoleId &&
    effect.attachment.value.kind === "area" &&
    effect.attachment.value.origin.kind === "self" &&
    effect.attachment.value.shape.kind === "line" &&
    effect.attachment.value.shape.lengthFeet ===
      GUST_OF_WIND_LINE_LENGTH_FEET &&
    effect.attachment.value.shape.widthFeet === GUST_OF_WIND_LINE_WIDTH_FEET &&
    effect.ability === "str" &&
    effect.dc.kind === "caster_spell_save_dc" &&
    effect.onSuccess.kind === "none" &&
    effect.onFail.kind === "force_move" &&
    effect.onFail.movementKind === "push" &&
    effect.onFail.originDirection === "away_from_caster" &&
    effect.onFail.distanceFeet === GUST_OF_WIND_PUSH_DISTANCE_FEET
  );
}

function discoverDirectionalPersistentAreaCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: BattleExecutableSpellInvocation<DirectionalPersistentAreaSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return discoverSavingThrowSpellCastActs(state, actorId, invocation);
}

function resolveDirectionalPersistentArea(
  input: DirectionalPersistentAreaResolveInput,
): BattleResolutionResult {
  return resolveDirectionalPersistentAreaSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    ...optionalProperty("metamagicApplications", input.metamagicApplications),
  });
}

const DirectionalPersistentAreaInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("directionalPersistentArea"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    ability: Schema.Literal("str"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("selfOriginLine"),
      lengthFeet: MovementFeet,
      widthFeet: MovementFeet,
    }),
    durationTicks: ElapsedTimeTicksSchema,
    rangeFeet: MovementFeet,
    pushDistanceFeet: MovementFeet,
    movementCost: Schema.Struct({
      multiplier: Schema.Literal(2),
      appliesTo: Schema.Literal("towardSource"),
    }),
  }),
);
export const directionalPersistentAreaProfile = {
  procedure: "directionalPersistentArea",
  executionSchema: DirectionalPersistentAreaInvocationSchema,
  admit: admitDirectionalPersistentArea,
  discoverCastAct: discoverDirectionalPersistentAreaCastAct,
  resolve: resolveDirectionalPersistentArea,
} satisfies SpellProcedureDeclaration<
  "directionalPersistentArea",
  DirectionalPersistentAreaSpellInvocation
>;
import { spellInvocationResourceForCastOption } from "./profile.ts";
