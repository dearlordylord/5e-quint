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
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { sharedOncePerTurnLimitGroup } from "./usage-limit-admission.ts";
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
type MovablePersistentAreaMechanics = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>;

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
  if (!hasMovablePersistentAreaSpellContract(spell.mechanics)) return null;
  const durationTicks = movablePersistentAreaDurationTicks(spell.mechanics);
  if (durationTicks === null) return null;
  const cylinderHole = movablePersistentAreaCylinderAttachment(
    spell.mechanics.attachment,
  );
  if (cylinderHole === null) return null;
  const initialDamage = isMovablePersistentAreaInitialSaveGate(
    spell.mechanics.initialPhase,
    cylinderHole.holeId,
  );
  if (initialDamage === null) return null;
  const operations = movablePersistentAreaOperations(spell.mechanics);
  if (operations === null) return null;

  return {
    durationTicks,
    radiusFeet: cylinderHole.radiusFeet,
    heightFeet: cylinderHole.heightFeet,
    repositionMaxMoveFeet: operations.repositionMaxMoveFeet,
    damageAmount: initialDamage.amount,
  };
}

function hasMovablePersistentAreaSpellContract(
  mechanics: MovablePersistentAreaMechanics,
): boolean {
  return (
    mechanics.level === MOVABLE_PERSISTENT_AREA_LEVEL &&
    mechanics.castingTime.kind === "action" &&
    mechanics.range.kind === "point" &&
    mechanics.range.feet === MOVABLE_PERSISTENT_AREA_RANGE_FEET &&
    mechanics.duration.kind === "concentration" &&
    mechanics.duration.upTo.unit === "minute" &&
    mechanics.duration.upTo.amount ===
      MOVABLE_PERSISTENT_AREA_DURATION_MINUTES &&
    mechanics.operations.length === MOVABLE_PERSISTENT_AREA_OPERATION_COUNT
  );
}

function movablePersistentAreaDurationTicks(
  mechanics: MovablePersistentAreaMechanics,
): ElapsedTimeTicks | null {
  if (mechanics.duration.kind !== "concentration") return null;
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    mechanics.duration.upTo,
  );
  return Result.isFailure(durationTicks) ? null : durationTicks.success;
}

function movablePersistentAreaCylinderAttachment(
  attachment: MovablePersistentAreaMechanics["attachment"],
): {
  readonly holeId: string;
  readonly radiusFeet: number;
  readonly heightFeet: number;
} | null {
  if (attachment.kind !== "hole" || attachment.value.kind !== "area") {
    return null;
  }
  const dimensions = movablePersistentAreaCylinderDimensions(attachment.value);
  if (dimensions === null) return null;
  return {
    holeId: attachment.holeId,
    ...dimensions,
  };
}

function movablePersistentAreaCylinderDimensions(
  area: Extract<
    MovablePersistentAreaMechanics["attachment"],
    { readonly kind: "hole" }
  >["value"],
): { readonly radiusFeet: number; readonly heightFeet: number } | null {
  if (area.kind !== "area") return null;
  if (area.origin.kind !== "point_within_range") return null;
  if (area.shape.kind !== "cylinder") return null;
  if (area.shape.radiusFeet !== MOVABLE_PERSISTENT_AREA_RADIUS_FEET) {
    return null;
  }
  if (area.shape.heightFeet !== MOVABLE_PERSISTENT_AREA_HEIGHT_FEET) {
    return null;
  }
  return {
    radiusFeet: area.shape.radiusFeet,
    heightFeet: area.shape.heightFeet,
  };
}

function movablePersistentAreaOperations(
  mechanics: MovablePersistentAreaMechanics,
): { readonly repositionMaxMoveFeet: number } | null {
  const repositionOperation = mechanics.operations.find(
    isMovablePersistentAreaRepositionOperation,
  );
  const dimLightOperation = mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "passive" &&
      operation.effect.kind === "area_emits_dim_light",
  );

  if (!hasMovablePersistentAreaTriggeredSaveGates(mechanics)) return null;
  if (repositionOperation?.effect.kind !== "reposition_attachment") return null;
  if (dimLightOperation?.effect.kind !== "area_emits_dim_light") return null;

  return {
    repositionMaxMoveFeet: MOVABLE_PERSISTENT_AREA_REPOSITION_MAX_MOVE_FEET,
  };
}

function isMovablePersistentAreaRepositionOperation(
  operation: MovablePersistentAreaMechanics["operations"][number],
): boolean {
  return (
    operation.trigger.kind === "on_caster_spends_action" &&
    operation.trigger.cost.kind === "standard_action" &&
    operation.trigger.cost.action === "magic" &&
    operation.trigger.laterTurnsOnly === true &&
    operation.effect.kind === "reposition_attachment" &&
    operation.effect.maxMoveFeet ===
      MOVABLE_PERSISTENT_AREA_REPOSITION_MAX_MOVE_FEET
  );
}

function hasMovablePersistentAreaTriggeredSaveGates(
  mechanics: MovablePersistentAreaMechanics,
): boolean {
  const saveGates = movablePersistentAreaTriggeredSaveGates(mechanics);
  return (
    saveGates !== null &&
    isMovablePersistentAreaSaveGate(saveGates.endTurn.effect) !== null &&
    isMovablePersistentAreaSaveGate(saveGates.enter.effect) !== null &&
    isMovablePersistentAreaSaveGate(saveGates.moveInto.effect) !== null &&
    sharedOncePerTurnLimitGroup([
      saveGates.initial.usageLimit,
      saveGates.moveInto.usageLimit,
      saveGates.enter.usageLimit,
      saveGates.endTurn.usageLimit,
    ]) !== null
  );
}

function movablePersistentAreaTriggeredSaveGates(
  mechanics: MovablePersistentAreaMechanics,
) {
  const initial = mechanics.initialPhase;
  if (initial?.kind !== "save_gate") return null;
  const endTurnOperation = mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_ends_turn_in_area",
  );
  const enterOperation = mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_enters_area",
  );
  const moveIntoOperation = mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_area_moves_into_creature_space",
  );
  if (
    endTurnOperation === undefined ||
    enterOperation === undefined ||
    moveIntoOperation === undefined
  ) {
    return null;
  }
  return {
    initial,
    endTurn: endTurnOperation,
    enter: enterOperation,
    moveInto: moveIntoOperation,
  };
}

function isMovablePersistentAreaInitialSaveGate(
  effect: MovablePersistentAreaInitialPhase | undefined,
  areaHoleId: string,
): MovablePersistentAreaSaveGateDamage | null {
  if (effect?.kind !== "save_gate") return null;
  if (effect.attachment?.kind !== "hole") return null;
  if (effect.attachment.holeId !== areaHoleId) return null;
  if (
    movablePersistentAreaCylinderDimensions(effect.attachment.value) === null
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
  const damage = movablePersistentAreaFailedSaveDamage(effect.onFail.effects);
  if (damage === null) return null;
  return hasMovablePersistentAreaSaveRule(effect) ? damage : null;
}

function hasMovablePersistentAreaSaveRule(
  effect: Extract<
    OngoingOperationEffect | MovablePersistentAreaInitialPhase,
    { readonly kind: "save_gate" }
  >,
): boolean {
  return (
    effect.ability === "con" &&
    effect.dc.kind === "caster_spell_save_dc" &&
    effect.onSuccess.kind === "half_damage"
  );
}

function movablePersistentAreaFailedSaveDamage(
  effects: readonly MovablePersistentAreaFailedSaveEffect[],
): MovablePersistentAreaSaveGateDamage | null {
  const damageEffects = effects.flatMap(
    (effect): readonly MovablePersistentAreaSaveGateDamage[] => {
      const damage = movablePersistentAreaDamageEffect(effect);
      return damage === null ? [] : [damage];
    },
  );
  if (damageEffects.length !== 1) return null;
  if (
    !effects.some((effect) => effect.kind === "revert_shape_shift_to_true_form")
  ) {
    return null;
  }
  if (
    !effects.some(
      (effect) => effect.kind === "suppress_shape_shifting_while_in_area",
    )
  ) {
    return null;
  }
  return damageEffects[0] ?? null;
}

function movablePersistentAreaDamageEffect(
  effect: MovablePersistentAreaFailedSaveEffect,
): MovablePersistentAreaSaveGateDamage | null {
  if (
    effect.kind !== "damage" ||
    effect.damageType !== "radiant" ||
    effect.amount?.kind !== "linear_per_level"
  ) {
    return null;
  }
  return isMovablePersistentAreaDamageAmount(effect.amount) ? effect : null;
}

function isMovablePersistentAreaDamageAmount(
  amount: Extract<
    NonNullable<MovablePersistentAreaSaveGateDamage["amount"]>,
    { readonly kind: "linear_per_level" }
  >,
): boolean {
  return (
    amount.axis === "slot" &&
    amount.startingAtLevel === MOVABLE_PERSISTENT_AREA_LEVEL &&
    amount.base.dice === MOVABLE_PERSISTENT_AREA_BASE_DAMAGE_DICE &&
    amount.base.dieSize === MOVABLE_PERSISTENT_AREA_DAMAGE_DIE_SIZE &&
    amount.perLevel.dice ===
      MOVABLE_PERSISTENT_AREA_DAMAGE_DICE_PER_SLOT_LEVEL &&
    (amount.perLevel.dieSize === undefined ||
      amount.perLevel.dieSize === MOVABLE_PERSISTENT_AREA_DAMAGE_DIE_SIZE)
  );
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
