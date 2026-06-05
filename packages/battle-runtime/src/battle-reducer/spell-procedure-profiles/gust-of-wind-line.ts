// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-gust-of-wind-line
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
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";

import type { SpellInvocationRef } from "../../battle-subjects.ts";
import {
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleCreatureState,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import {
  type SpellMetamagicApplicationFact,
  CAREFUL_METAMAGIC_EFFECT_KIND,
  discoverSpellMetamagicSelections,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  spellMetamagicApplications,
  spellMetamagicLabel,
} from "../metamagic-support.ts";
import {
  carefulSpellProtectedTargetsHole,
  heightenedSpellTargetChoiceHole,
  spellSavingThrowAbility,
  spellSavingThrowOutcomeHole,
  spellSavingThrowTargeting,
} from "../spells-holes-fills.ts";
import { resolveGustOfWindLineSpellAct } from "../spells-resolve-area-effects.ts";
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

type GustOfWindLineSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "gustOfWindLine" }
>;
type GustOfWindLineResolveInput = SpellProcedureProfileResolveInput<
  GustOfWindLineSpellInvocation,
  ActionSpellBattleResolutionInput
> & {
  readonly metamagicApplications?: readonly SpellMetamagicApplicationFact[];
};

type OngoingOperationEffect = Extract<
  SpellRecord["mechanics"],
  { readonly family: "ongoing_effect" }
>["operations"][number]["effect"];
type GustOfWindLineInitialPhase = Extract<
  SpellRecord["mechanics"],
  { readonly family: "ongoing_effect" }
>["initialPhase"];
type OngoingSaveGateEffect = Extract<
  OngoingOperationEffect,
  { readonly kind: "save_gate" }
>;
type GustOfWindLineSaveEffect = OngoingSaveGateEffect & {
  readonly onFail: Extract<
    OngoingSaveGateEffect["onFail"],
    { readonly kind: "force_move" }
  >;
};
type GustOfWindLineProfileShape = {
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

function admitGustOfWindLine(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly GustOfWindLineSpellInvocation[] {
  const line = gustOfWindLineSpell(spell);
  if (line === null) {
    return [];
  }

  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly GustOfWindLineSpellInvocation[] => {
      if (Number(slot.spellLevel) < GUST_OF_WIND_LEVEL) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
          procedure: "gustOfWindLine",
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

function gustOfWindLineSpell(
  spell: SpellRecord,
): GustOfWindLineProfileShape | null {
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
  const initialSave = isGustOfWindLineSaveGate(initialPhase, lineHole?.holeId)
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
    Either.isLeft(durationTicks) ||
    lineArea?.kind !== "area" ||
    lineArea.origin.kind !== "self" ||
    lineArea.shape.kind !== "line" ||
    lineArea.shape.lengthFeet !== GUST_OF_WIND_LINE_LENGTH_FEET ||
    lineArea.shape.widthFeet !== GUST_OF_WIND_LINE_WIDTH_FEET ||
    initialSave === null ||
    !isGustOfWindLineSaveGate(endTurnOperation?.effect, lineHole?.holeId) ||
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
    durationTicks: durationTicks.right,
    lengthFeet: lineArea.shape.lengthFeet,
    widthFeet: lineArea.shape.widthFeet,
    pushDistanceFeet: initialSave.onFail.distanceFeet,
  };
}

function isGustOfWindLineSaveGate(
  effect: OngoingOperationEffect | GustOfWindLineInitialPhase | undefined,
  areaHoleId: string | undefined,
): effect is GustOfWindLineSaveEffect {
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

function discoverGustOfWindLineCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: GustOfWindLineSpellInvocation,
): readonly AvailableBattleAct[] {
  const actor = state.combatants.get(actorId);
  const initialHole = spellSavingThrowOutcomeHole(state, actorId, invocation);
  const baseCastAct = gustOfWindLineCastAct(
    actorId,
    invocation,
    [initialHole],
    invocation.spell.name,
    gustOfWindLineCastSummaryWithSavingThrow(invocation),
  );
  return [
    baseCastAct,
    ...gustOfWindLineMetamagicCastActs({
      state,
      actorId,
      actor,
      invocation,
      baseCastAct,
      baseHoles: [initialHole],
    }),
  ];
}

function gustOfWindLineMetamagicCastActs(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly actor: BattleCreatureState | undefined;
  readonly invocation: GustOfWindLineSpellInvocation;
  readonly baseCastAct: AvailableBattleAct;
  readonly baseHoles: readonly BattleHole[];
}): readonly AvailableBattleAct[] {
  const actor = input.actor;
  if (actor === undefined) {
    return [];
  }
  return discoverSpellMetamagicSelections({
    actor,
    invocation: input.invocation,
  }).map((metamagic) => {
    const applications = spellMetamagicApplications(actor, metamagic);
    const metamagicInitialHoles = gustOfWindLineMetamagicInitialHoles(
      input.state,
      input.actorId,
      input.invocation,
      applications,
    );
    const label = spellMetamagicLabel(metamagic);
    return {
      ...input.baseCastAct,
      subject: {
        ...input.baseCastAct.subject,
        metamagic,
      },
      initialHoles:
        metamagicInitialHoles.length === 0
          ? input.baseHoles
          : metamagicInitialHoles,
      label: `${input.invocation.spell.name} (${label})`,
      summary: `${gustOfWindLineCastSummaryWithSavingThrow(
        input.invocation,
      )} Cast with ${label}.`,
    };
  });
}

function gustOfWindLineCastAct(
  actorId: CombatantId,
  invocation: GustOfWindLineSpellInvocation,
  initialHoles: readonly BattleHole[],
  label: string,
  summary: string,
): AvailableBattleAct {
  return {
    subject: {
      tag: "actionSpell",
      actorId,
      invocation: gustOfWindLineInvocationRef(invocation),
      mode: { tag: "cast" },
    },
    label,
    summary,
    initialHoles,
  };
}

function gustOfWindLineMetamagicInitialHoles(
  state: BattleState,
  actorId: CombatantId,
  invocation: GustOfWindLineSpellInvocation,
  metamagicApplications: readonly SpellMetamagicApplicationFact[],
): readonly BattleHole[] {
  const targeting = spellSavingThrowTargeting(invocation);
  const holes: BattleHole[] = [];
  if (
    targeting.kind !== "singleCombatant" &&
    metamagicApplications.some(
      (application) => application.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
    )
  ) {
    holes.push(carefulSpellProtectedTargetsHole(state, actorId, invocation));
  }
  if (
    targeting.kind !== "singleCombatant" &&
    metamagicApplications.some(
      (application) =>
        application.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
    )
  ) {
    holes.push(heightenedSpellTargetChoiceHole(state, actorId, invocation));
  }
  return holes;
}

function gustOfWindLineInvocationRef(
  invocation: GustOfWindLineSpellInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "gustOfWindLine",
  };
}

function gustOfWindLineCastSummary(
  invocation: GustOfWindLineSpellInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function gustOfWindLineCastSummaryWithSavingThrow(
  invocation: GustOfWindLineSpellInvocation,
): string {
  return `${gustOfWindLineCastSummary(
    invocation,
  )} Table-supplied affected targets make ${spellSavingThrowAbility(
    invocation,
  ).toUpperCase()} Saving Throws.`;
}

function resolveGustOfWindLine(
  input: GustOfWindLineResolveInput,
): BattleResolutionResult {
  return resolveGustOfWindLineSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
    ...(input.metamagicApplications === undefined
      ? {}
      : { metamagicApplications: input.metamagicApplications }),
  });
}

const GustOfWindLineInvocationSchema = spellProcedureInvocationSchema<
  Extract<SupportedSpellInvocation, { readonly procedure: "gustOfWindLine" }>
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("gustOfWindLine"),
    spell: BattleRuntimeObjectSchema,
    ability: Schema.Literal("str"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("selfOriginLine"),
      lengthFeet: MovementFeet,
      widthFeet: MovementFeet,
    }),
    durationTicks: Schema.Number,
    rangeFeet: MovementFeet,
    pushDistanceFeet: MovementFeet,
    movementCost: Schema.Struct({
      multiplier: Schema.Literal(2),
      appliesTo: Schema.Literal("towardSource"),
    }),
  }),
);
export const gustOfWindLineProfile = {
  procedure: "gustOfWindLine",
  invocationSchema: GustOfWindLineInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitGustOfWindLine,
  discoverCastAct: discoverGustOfWindLineCastAct,
  castSummary: gustOfWindLineCastSummary,
  invocationRef: gustOfWindLineInvocationRef,
  resolve: resolveGustOfWindLine,
} satisfies SpellProcedureProfile<
  "gustOfWindLine",
  GustOfWindLineSpellInvocation,
  ActionSpellBattleResolutionInput
>;
