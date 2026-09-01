import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
import { ongoingConcentrationAreaSpellFacts } from "../ongoing-concentration-area-spell.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-insect-plague-area-hazard
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
import { DiceExprSchema } from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.INSECT_PLAGUE_AREA_HAZARD_LIFECYCLE
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

import { type ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import { Match, Result, Schema } from "effect";

import {
  type BattleExecutableSpellInvocation,
  type BattleResolutionResult,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { discoverActionSpellAreaCastAct } from "../spell-area-cast-discovery.ts";
import { supportedDamageAmountExpr } from "../spells-execution-facts.ts";
import { resolveStationaryPersistentAreaAreaHazardSpellAct } from "../spells-resolve-area-effects.ts";
import { invalidResult } from "../result-helpers.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";
import { sharedOncePerTurnLimitGroup } from "./usage-limit-admission.ts";

type StationaryPersistentAreaAreaHazardSpellInvocation = Extract<
  SupportedSpellInvocation,
  {
    readonly procedure: "persistentAreaSaveDamage";
    readonly lifecycle: { readonly kind: "stationary" };
  }
>;
type StationaryPersistentAreaAreaHazardResolveInput = Omit<
  SpellProcedureProfileResolveInput<StationaryPersistentAreaAreaHazardSpellInvocation>,
  "invocation"
> & {
  readonly invocation: Extract<
    BattleExecutableSpellInvocation,
    {
      readonly procedure: "persistentAreaSaveDamage";
      readonly lifecycle: { readonly kind: "stationary" };
    }
  >;
};
type StationaryPersistentAreaMechanics = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type StationaryPersistentAreaSaveGate = Extract<
  NonNullable<StationaryPersistentAreaMechanics["initialPhase"]>,
  { readonly kind: "save_gate" }
>;
type StationaryPersistentAreaProfileShape = {
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: number;
  readonly radiusFeet: number;
  readonly damageAmount: Extract<
    StationaryPersistentAreaSaveGate["onFail"],
    { readonly kind: "damage" }
  >["amount"];
};

const STATIONARY_PERSISTENT_AREA_LEVEL = 5;
const STATIONARY_PERSISTENT_AREA_RANGE_FEET = 300;
const STATIONARY_PERSISTENT_AREA_DURATION_MINUTES = 10;
const STATIONARY_PERSISTENT_AREA_RADIUS_FEET = 20;
const STATIONARY_PERSISTENT_AREA_OPERATION_COUNT = 3;
const STATIONARY_PERSISTENT_AREA_BASE_DAMAGE_DICE = 4;
const STATIONARY_PERSISTENT_AREA_DAMAGE_DIE_SIZE = 10;
const STATIONARY_PERSISTENT_AREA_DAMAGE_DICE_PER_SLOT_LEVEL = 1;

function admitStationaryPersistentAreaAreaHazard(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly StationaryPersistentAreaAreaHazardSpellInvocation[] {
  const stationaryPersistentArea = persistentAreaSaveDamageSpell(spell);
  if (stationaryPersistentArea === null) {
    return [];
  }

  return ctx.spellCastOptions.flatMap(
    (slot): readonly StationaryPersistentAreaAreaHazardSpellInvocation[] => {
      if (Number(slot.spellLevel) < STATIONARY_PERSISTENT_AREA_LEVEL) {
        return [];
      }
      const damageExpr = supportedDamageAmountExpr({
        amount: stationaryPersistentArea.damageAmount,
        spellLevel: STATIONARY_PERSISTENT_AREA_LEVEL,
        slotLevel: slot.spellLevel,
      });
      if (damageExpr === null) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: spellInvocationResourceForCastOption(slot),
          procedure: "persistentAreaSaveDamage",
          lifecycle: { kind: "stationary" },
          spell,
          ability: "con",
          dc: { kind: "caster_spell_save_dc" },
          targeting: {
            kind: "pointOriginSphere",
            radiusFeet: movementFeet(stationaryPersistentArea.radiusFeet),
          },
          durationTicks: stationaryPersistentArea.durationTicks,
          rangeFeet: movementFeet(stationaryPersistentArea.rangeFeet),
          damage: { expr: damageExpr, damageType: "piercing" },
        },
      ];
    },
  );
}

function persistentAreaSaveDamageSpell(
  spell: BattleSpellAdmissionSource,
): StationaryPersistentAreaProfileShape | null {
  const ongoing = ongoingConcentrationAreaSpellFacts(spell);
  return ongoing === null
    ? null
    : stationaryPersistentAreaProfileShape(ongoing);
}

function stationaryPersistentAreaProfileShape(
  ongoing: NonNullable<ReturnType<typeof ongoingConcentrationAreaSpellFacts>>,
): StationaryPersistentAreaProfileShape | null {
  const { mechanics, duration, durationTicks, area } = ongoing;
  const damageAmount = stationaryPersistentAreaOperationDamage(mechanics);

  if (!isStationaryPersistentAreaSpellHeader(mechanics)) return null;
  if (!isStationaryPersistentAreaDuration(duration)) return null;
  if (Result.isFailure(durationTicks)) return null;
  if (!isStationaryPersistentAreaGeometry(area)) return null;
  if (damageAmount === null) return null;
  return {
    durationTicks: durationTicks.success,
    rangeFeet: mechanics.range.feet,
    radiusFeet: area.shape.radiusFeet,
    damageAmount,
  };
}

function stationaryPersistentAreaOperationDamage(
  mechanics: StationaryPersistentAreaMechanics,
): StationaryPersistentAreaProfileShape["damageAmount"] | null {
  const { passiveOperation, enterOperation, endTurnOperation } =
    stationaryPersistentAreaOperations(mechanics);
  const initialDamageAmount = stationaryPersistentAreaSaveGateDamageAmount(
    mechanics.initialPhase,
  );
  if (initialDamageAmount === null) return null;
  const saveLimitGroup = sharedOncePerTurnLimitGroup([
    stationaryPersistentAreaInitialUsageLimit(mechanics.initialPhase),
    enterOperation?.usageLimit,
    endTurnOperation?.usageLimit,
  ]);
  return hasStationaryPersistentAreaOperations({
    mechanics,
    passiveOperation,
    enterOperation,
    endTurnOperation,
    saveLimitGroup,
  })
    ? initialDamageAmount
    : null;
}

function stationaryPersistentAreaInitialUsageLimit(
  initialPhase: StationaryPersistentAreaMechanics["initialPhase"],
) {
  return initialPhase?.kind === "save_gate"
    ? initialPhase.usageLimit
    : undefined;
}

function stationaryPersistentAreaOperations(
  mechanics: StationaryPersistentAreaMechanics,
) {
  return {
    passiveOperation: mechanics.operations.find(
      (operation) => operation.trigger.kind === "passive",
    ),
    enterOperation: mechanics.operations.find(
      (operation) => operation.trigger.kind === "on_creature_enters_area",
    ),
    endTurnOperation: mechanics.operations.find(
      (operation) => operation.trigger.kind === "on_creature_ends_turn_in_area",
    ),
  };
}

function isStationaryPersistentAreaSpellHeader(
  mechanics: StationaryPersistentAreaMechanics,
): mechanics is StationaryPersistentAreaMechanics & {
  readonly range: { readonly kind: "point"; readonly feet: number };
} {
  return (
    mechanics.level === STATIONARY_PERSISTENT_AREA_LEVEL &&
    mechanics.castingTime.kind === "action" &&
    mechanics.range.kind === "point" &&
    mechanics.range.feet === STATIONARY_PERSISTENT_AREA_RANGE_FEET
  );
}

function isStationaryPersistentAreaDuration(
  duration: NonNullable<
    ReturnType<typeof ongoingConcentrationAreaSpellFacts>
  >["duration"],
): boolean {
  return (
    duration.upTo.unit === "minute" &&
    duration.upTo.amount === STATIONARY_PERSISTENT_AREA_DURATION_MINUTES
  );
}

function isStationaryPersistentAreaGeometry(
  area: NonNullable<
    ReturnType<typeof ongoingConcentrationAreaSpellFacts>
  >["area"],
): area is NonNullable<
  ReturnType<typeof ongoingConcentrationAreaSpellFacts>
>["area"] & {
  readonly origin: { readonly kind: "point_within_range" };
  readonly shape: { readonly kind: "sphere"; readonly radiusFeet: number };
} {
  return (
    area.kind === "area" &&
    area.origin.kind === "point_within_range" &&
    area.shape.kind === "sphere" &&
    area.shape.radiusFeet === STATIONARY_PERSISTENT_AREA_RADIUS_FEET
  );
}

function hasStationaryPersistentAreaOperations(input: {
  readonly mechanics: StationaryPersistentAreaMechanics;
  readonly passiveOperation:
    | StationaryPersistentAreaMechanics["operations"][number]
    | undefined;
  readonly enterOperation:
    | StationaryPersistentAreaMechanics["operations"][number]
    | undefined;
  readonly endTurnOperation:
    | StationaryPersistentAreaMechanics["operations"][number]
    | undefined;
  readonly saveLimitGroup: ReturnType<typeof sharedOncePerTurnLimitGroup>;
}): boolean {
  if (
    input.mechanics.operations.length !==
    STATIONARY_PERSISTENT_AREA_OPERATION_COUNT
  ) {
    return false;
  }
  if (
    !isStationaryPersistentAreaPassiveOperation(input.passiveOperation?.effect)
  ) {
    return false;
  }
  return (
    hasStationaryPersistentAreaTriggeredDamage(
      input.enterOperation,
      input.endTurnOperation,
    ) && input.saveLimitGroup !== null
  );
}

function hasStationaryPersistentAreaTriggeredDamage(
  enterOperation:
    | StationaryPersistentAreaMechanics["operations"][number]
    | undefined,
  endTurnOperation:
    | StationaryPersistentAreaMechanics["operations"][number]
    | undefined,
): boolean {
  return (
    stationaryPersistentAreaSaveGateDamageAmount(enterOperation?.effect) !==
      null &&
    stationaryPersistentAreaSaveGateDamageAmount(endTurnOperation?.effect) !==
      null
  );
}

function isStationaryPersistentAreaPassiveOperation(
  effect:
    | StationaryPersistentAreaMechanics["operations"][number]["effect"]
    | undefined,
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

function stationaryPersistentAreaSaveGateDamageAmount(
  effect:
    | StationaryPersistentAreaMechanics["initialPhase"]
    | StationaryPersistentAreaMechanics["operations"][number]["effect"]
    | undefined,
): StationaryPersistentAreaProfileShape["damageAmount"] | null {
  if (
    effect?.kind === "save_gate" &&
    effect.ability === "con" &&
    effect.dc.kind === "caster_spell_save_dc" &&
    effect.onSuccess.kind === "half_damage" &&
    effect.onFail.kind === "damage" &&
    effect.onFail.damageType === "piercing" &&
    effect.onFail.amount.kind === "linear_per_level" &&
    effect.onFail.amount.axis === "slot" &&
    effect.onFail.amount.startingAtLevel === STATIONARY_PERSISTENT_AREA_LEVEL &&
    effect.onFail.amount.base.dice ===
      STATIONARY_PERSISTENT_AREA_BASE_DAMAGE_DICE &&
    effect.onFail.amount.base.dieSize ===
      STATIONARY_PERSISTENT_AREA_DAMAGE_DIE_SIZE &&
    effect.onFail.amount.perLevel?.dice ===
      STATIONARY_PERSISTENT_AREA_DAMAGE_DICE_PER_SLOT_LEVEL
  ) {
    return effect.onFail.amount;
  }
  return null;
}

function resolveNarrowedStationaryPersistentAreaAreaHazard(
  input: StationaryPersistentAreaAreaHazardResolveInput,
): BattleResolutionResult {
  return resolveStationaryPersistentAreaAreaHazardSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

function resolveStationaryPersistentAreaAreaHazard(
  input: SpellProcedureProfileResolveInput<StationaryPersistentAreaAreaHazardSpellInvocation>,
): BattleResolutionResult {
  return Match.value(input.invocation).pipe(
    Match.when({ lifecycle: { kind: "stationary" } }, (invocation) =>
      resolveNarrowedStationaryPersistentAreaAreaHazard({
        ...input,
        invocation,
      }),
    ),
    Match.orElse(() =>
      invalidResult(
        input.input.state,
        "unsupportedSubject",
        "Stored procedure does not match the stationary persistent-area profile.",
      ),
    ),
  );
}

const StationaryPersistentAreaAreaHazardInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("persistentAreaSaveDamage"),
      lifecycle: Schema.Struct({ kind: Schema.Literal("stationary") }),
      spellRuleFacts: SpellRuleExecutionFactsSchema,
      ability: Schema.Literal("con"),
      dc: DcSourceSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("pointOriginSphere"),
        radiusFeet: MovementFeet,
      }),
      durationTicks: ElapsedTimeTicksSchema,
      rangeFeet: MovementFeet,
      damage: Schema.Struct({
        expr: DiceExprSchema,
        damageType: Schema.Literal("piercing"),
      }),
    }),
  );

export const stationaryPersistentAreaSaveDamageProfile = {
  procedure: "persistentAreaSaveDamage",
  executionSchema: StationaryPersistentAreaAreaHazardInvocationSchema,
  admit: admitStationaryPersistentAreaAreaHazard,
  discoverCastAct: discoverActionSpellAreaCastAct,
  resolve: resolveStationaryPersistentAreaAreaHazard,
} satisfies SpellProcedureDeclaration<
  "persistentAreaSaveDamage",
  StationaryPersistentAreaAreaHazardSpellInvocation
>;
import { spellInvocationResourceForCastOption } from "./profile.ts";
