import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-moonbeam-movable-zone
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
import { DiceExprSchema } from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.MOONBEAM_MOVABLE_ZONE_LIFECYCLE
//
// The Moonbeam Spell Procedure Profile: action-time Spell Slot casting creates
// a caster-owned Concentration Cylinder. The runtime owns Spell Slot spending,
// Concentration duration, Constitution Saving Throw-gated Radiant damage,
// once-per-creature-per-turn save limiting, shape-shift reversion/suppression
// hooks, and Magic Action reposition witnesses; the table owns spatial area
// membership, trigger emission, Dim Light presentation, and map geometry.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-M-P.md "Moonbeam": Action;
//     120 feet; Concentration up to 1 minute; 5-foot-radius, 40-foot-high
//     Cylinder; Dim Light; later-turn Magic Action move up to 60 feet;
//     Constitution Saving Throw for Radiant damage or half; failed-save
//     shape-shift reversion/suppression; appears/moved-into/enters/ends-turn
//     triggers; once per turn; +1d10 per slot level above 2.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Concentration, Spell Slot, Spell
//     Invocation, Area of Effect/Cylinder, Saving Throw, Damage Type, and
//     shape-shifting.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import { Match, Result, Schema } from "effect";

import {
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import { discoverActionSpellAreaCastAct } from "../spell-area-cast-discovery.ts";
import { supportedDamageAmountExpr } from "../spells-execution-facts.ts";
import { resolveMovablePersistentAreaSpellAct } from "../spells-resolve-area-effects.ts";
import { invalidResult } from "../result-helpers.ts";
import { hasSharedNonEmptyOncePerTurnLimitGroup } from "./once-per-turn-limit-group-admission.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  preparedSpellSlotInvocations,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import {
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";

type MovablePersistentAreaSpellInvocation = Extract<
  SupportedSpellInvocation,
  {
    readonly procedure: "persistentAreaSaveDamage";
    readonly lifecycle: {
      readonly kind: "casterActionReposition";
      readonly actionCost: "magicAction";
    };
  }
>;
type MovablePersistentAreaResolveInput = Omit<
  SpellProcedureProfileResolveInput<MovablePersistentAreaSpellInvocation>,
  "invocation"
> & {
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "persistentAreaSaveDamage";
      readonly lifecycle: {
        readonly kind: "casterActionReposition";
        readonly actionCost: "magicAction";
      };
    }
  >;
};

type OngoingOperationEffect = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>["operations"][number]["effect"];
type MovablePersistentAreaInitialPhase = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>["initialPhase"];
type MovablePersistentAreaFailedSaveEffect = Extract<
  Extract<
    MovablePersistentAreaInitialPhase,
    { readonly kind: "save_gate" }
  >["onFail"],
  { readonly kind: "composite" }
>["effects"][number];
type MovablePersistentAreaSaveGateDamage = Extract<
  MovablePersistentAreaFailedSaveEffect,
  { readonly kind: "damage" }
>;
type MovablePersistentAreaProfileShape = {
  readonly durationTicks: ElapsedTimeTicks;
  readonly radiusFeet: number;
  readonly heightFeet: number;
  readonly repositionMaxMoveFeet: number;
  readonly damageAmount: MovablePersistentAreaSaveGateDamage["amount"];
};

const MOVABLE_PERSISTENT_AREA_LEVEL = 2;
const MOVABLE_PERSISTENT_AREA_RANGE_FEET = 120;
const MOVABLE_PERSISTENT_AREA_DURATION_MINUTES = 1;
const MOVABLE_PERSISTENT_AREA_OPERATION_COUNT = 5;
const MOVABLE_PERSISTENT_AREA_RADIUS_FEET = 5;
const MOVABLE_PERSISTENT_AREA_HEIGHT_FEET = 40;
const MOVABLE_PERSISTENT_AREA_REPOSITION_MAX_MOVE_FEET = 60;
const MOVABLE_PERSISTENT_AREA_BASE_DAMAGE_DICE = 2;
const MOVABLE_PERSISTENT_AREA_DAMAGE_DIE_SIZE = 10;
const MOVABLE_PERSISTENT_AREA_DAMAGE_DICE_PER_SLOT_LEVEL = 1;

function admitMovablePersistentArea(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly MovablePersistentAreaSpellInvocation[] {
  const movablePersistentArea = movablePersistentAreaSpell(spell);
  if (movablePersistentArea === null) {
    return [];
  }

  return preparedSpellSlotInvocations(spell, ctx, (base, slotLevel) => {
    const damageExpr = supportedDamageAmountExpr({
      amount: movablePersistentArea.damageAmount,
      spellLevel: spell.mechanics.level,
      slotLevel,
    });
    return damageExpr === null
      ? null
      : {
          ...base,
          procedure: "persistentAreaSaveDamage",
          lifecycle: {
            kind: "casterActionReposition",
            actionCost: "magicAction",
            movedAreaOperation: "saveDamage",
            collisionDisposition: "ignoreObstacles",
          },
          ability: "con",
          dc: { kind: "caster_spell_save_dc" },
          targeting: {
            kind: "pointOriginCylinder",
            radiusFeet: movementFeet(movablePersistentArea.radiusFeet),
            heightFeet: movementFeet(movablePersistentArea.heightFeet),
          },
          durationTicks: movablePersistentArea.durationTicks,
          rangeFeet: movementFeet(MOVABLE_PERSISTENT_AREA_RANGE_FEET),
          repositionMaxMoveFeet: movementFeet(
            movablePersistentArea.repositionMaxMoveFeet,
          ),
          damage: { expr: damageExpr, damageType: "radiant" },
        };
  });
}

function movablePersistentAreaSpell(
  spell: BattleSpellAdmissionSource,
): MovablePersistentAreaProfileShape | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const attachment = spell.mechanics.attachment;
  const cylinderHole =
    attachment.kind === "hole" && attachment.value.kind === "area"
      ? attachment
      : null;
  const cylinderArea = cylinderHole?.value ?? null;
  const initialDamage = isMovablePersistentAreaInitialSaveGate(
    spell.mechanics.initialPhase,
    cylinderHole?.holeId,
  );
  const initialUsageLimit =
    spell.mechanics.initialPhase?.kind === "save_gate"
      ? spell.mechanics.initialPhase.usageLimit
      : undefined;
  const endTurnOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_ends_turn_in_area",
  );
  const enterOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_enters_area",
  );
  const moveIntoOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_area_moves_into_creature_space",
  );
  const repositionOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_caster_spends_action" &&
      operation.trigger.cost.kind === "standard_action" &&
      operation.trigger.cost.action === "magic" &&
      operation.trigger.laterTurnsOnly === true &&
      operation.effect.kind === "reposition_attachment",
  );
  const dimLightOperation = spell.mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_emits_dim_light",
  );

  if (
    spell.mechanics.level !== MOVABLE_PERSISTENT_AREA_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== MOVABLE_PERSISTENT_AREA_RANGE_FEET ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !==
      MOVABLE_PERSISTENT_AREA_DURATION_MINUTES ||
    spell.mechanics.operations.length !==
      MOVABLE_PERSISTENT_AREA_OPERATION_COUNT ||
    durationTicks === null ||
    Result.isFailure(durationTicks) ||
    cylinderArea?.kind !== "area" ||
    cylinderArea?.origin.kind !== "point_within_range" ||
    cylinderArea.shape.kind !== "cylinder" ||
    cylinderArea.shape.radiusFeet !== MOVABLE_PERSISTENT_AREA_RADIUS_FEET ||
    cylinderArea.shape.heightFeet !== MOVABLE_PERSISTENT_AREA_HEIGHT_FEET ||
    initialDamage === null ||
    isMovablePersistentAreaSaveGate(endTurnOperation?.effect) === null ||
    isMovablePersistentAreaSaveGate(enterOperation?.effect) === null ||
    isMovablePersistentAreaSaveGate(moveIntoOperation?.effect) === null ||
    !hasSharedNonEmptyOncePerTurnLimitGroup([
      initialUsageLimit,
      moveIntoOperation?.usageLimit,
      enterOperation?.usageLimit,
      endTurnOperation?.usageLimit,
    ]) ||
    repositionOperation?.effect.kind !== "reposition_attachment" ||
    repositionOperation.effect.maxMoveFeet !==
      MOVABLE_PERSISTENT_AREA_REPOSITION_MAX_MOVE_FEET ||
    dimLightOperation?.effect.kind !== "area_emits_dim_light"
  ) {
    return null;
  }

  return {
    durationTicks: durationTicks.success,
    radiusFeet: cylinderArea.shape.radiusFeet,
    heightFeet: cylinderArea.shape.heightFeet,
    repositionMaxMoveFeet: repositionOperation.effect.maxMoveFeet,
    damageAmount: initialDamage.amount,
  };
}

function isMovablePersistentAreaInitialSaveGate(
  effect: MovablePersistentAreaInitialPhase | undefined,
  areaHoleId: string | undefined,
): MovablePersistentAreaSaveGateDamage | null {
  if (
    effect?.kind !== "save_gate" ||
    areaHoleId === undefined ||
    effect.attachment?.kind !== "hole" ||
    effect.attachment.holeId !== areaHoleId ||
    effect.attachment.value.kind !== "area" ||
    effect.attachment.value.origin.kind !== "point_within_range" ||
    effect.attachment.value.shape.kind !== "cylinder" ||
    effect.attachment.value.shape.radiusFeet !==
      MOVABLE_PERSISTENT_AREA_RADIUS_FEET ||
    effect.attachment.value.shape.heightFeet !==
      MOVABLE_PERSISTENT_AREA_HEIGHT_FEET
  ) {
    return null;
  }
  return isMovablePersistentAreaSaveGate(effect);
}

function isMovablePersistentAreaSaveGate(
  effect:
    | OngoingOperationEffect
    | MovablePersistentAreaInitialPhase
    | undefined,
): MovablePersistentAreaSaveGateDamage | null {
  if (effect?.kind !== "save_gate") {
    return null;
  }
  if (effect.onFail.kind !== "composite") {
    return null;
  }
  if (effect.onFail.effects.length !== 3) {
    return null;
  }
  const damageEffects = effect.onFail.effects.flatMap(
    (failedEffect): readonly MovablePersistentAreaSaveGateDamage[] => {
      const damage = movablePersistentAreaDamageEffect(failedEffect);
      return damage === null ? [] : [damage];
    },
  );
  const hasTrueFormReversion = effect.onFail.effects.some(
    (failedEffect) => failedEffect.kind === "revert_shape_shift_to_true_form",
  );
  const hasShapeShiftSuppression = effect.onFail.effects.some(
    (failedEffect) =>
      failedEffect.kind === "suppress_shape_shifting_while_in_area",
  );
  if (
    damageEffects.length !== 1 ||
    !hasTrueFormReversion ||
    !hasShapeShiftSuppression
  ) {
    return null;
  }
  const damage = damageEffects[0];
  if (
    damage === undefined ||
    effect.ability !== "con" ||
    effect.dc.kind !== "caster_spell_save_dc" ||
    effect.onSuccess.kind !== "half_damage"
  ) {
    return null;
  }
  return damage;
}

function movablePersistentAreaDamageEffect(
  effect: MovablePersistentAreaFailedSaveEffect,
): MovablePersistentAreaSaveGateDamage | null {
  if (
    effect.kind !== "damage" ||
    effect.damageType !== "radiant" ||
    effect.amount?.kind !== "linear_per_level" ||
    effect.amount.axis !== "slot" ||
    effect.amount.startingAtLevel !== MOVABLE_PERSISTENT_AREA_LEVEL ||
    effect.amount.base.dice !== MOVABLE_PERSISTENT_AREA_BASE_DAMAGE_DICE ||
    effect.amount.base.dieSize !== MOVABLE_PERSISTENT_AREA_DAMAGE_DIE_SIZE ||
    effect.amount.perLevel.dice !==
      MOVABLE_PERSISTENT_AREA_DAMAGE_DICE_PER_SLOT_LEVEL ||
    (effect.amount.perLevel.dieSize !== undefined &&
      effect.amount.perLevel.dieSize !==
        MOVABLE_PERSISTENT_AREA_DAMAGE_DIE_SIZE)
  ) {
    return null;
  }
  return effect;
}

function resolveNarrowedMovablePersistentArea(
  input: MovablePersistentAreaResolveInput,
): BattleResolutionResult {
  return resolveMovablePersistentAreaSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

function resolveMovablePersistentArea(
  input: SpellProcedureProfileResolveInput<MovablePersistentAreaSpellInvocation>,
): BattleResolutionResult {
  return Match.value(input.invocation).pipe(
    Match.when(
      {
        lifecycle: {
          kind: "casterActionReposition",
          collisionDisposition: "ignoreObstacles",
        },
      },
      (invocation) =>
        resolveNarrowedMovablePersistentArea({ ...input, invocation }),
    ),
    Match.orElse(() =>
      invalidResult(
        input.input.state,
        "unsupportedSubject",
        "Stored procedure does not match the directed-reposition persistent-area profile.",
      ),
    ),
  );
}

const MovablePersistentAreaInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("persistentAreaSaveDamage"),
    lifecycle: Schema.Struct({
      kind: Schema.Literal("casterActionReposition"),
      actionCost: Schema.Literal("magicAction"),
      movedAreaOperation: Schema.Literal("saveDamage"),
      collisionDisposition: Schema.Literal("ignoreObstacles"),
    }),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    ability: Schema.Literal("con"),
    dc: DcSourceSchema,
    targeting: Schema.Struct({
      kind: Schema.Literal("pointOriginCylinder"),
      radiusFeet: MovementFeet,
      heightFeet: MovementFeet,
    }),
    durationTicks: ElapsedTimeTicksSchema,
    rangeFeet: MovementFeet,
    repositionMaxMoveFeet: MovementFeet,
    damage: Schema.Struct({
      expr: DiceExprSchema,
      damageType: Schema.Literal("radiant"),
    }),
  }),
);

export const directedRepositionPersistentAreaSaveDamageProfile = {
  procedure: "persistentAreaSaveDamage",
  executionSchema: MovablePersistentAreaInvocationSchema,
  admit: admitMovablePersistentArea,
  discoverCastAct: discoverActionSpellAreaCastAct,
  resolve: resolveMovablePersistentArea,
} satisfies SpellProcedureDeclaration<
  "persistentAreaSaveDamage",
  MovablePersistentAreaSpellInvocation
>;
