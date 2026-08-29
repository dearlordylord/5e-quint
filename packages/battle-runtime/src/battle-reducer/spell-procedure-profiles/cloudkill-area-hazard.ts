import { spellInvocationResourceForCastOption } from "./profile.ts";
import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
import { ongoingConcentrationAreaSpellFacts } from "../ongoing-concentration-area-spell.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-translatingPersistentArea-area-hazard
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
import { DiceExprSchema } from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.TRANSLATING_PERSISTENT_AREA_AREA_HAZARD_LIFECYCLE
//
// TranslatingPersistentArea-shaped hazard: action-time Spell Slot casting creates a
// caster-owned Concentration Sphere. The runtime owns Spell Slot spending,
// Concentration duration, caller-supplied Sphere identity, Heavily Obscured
// projection, Constitution Saving Throw-gated Poison damage, once-per-turn save
// ledger, and strong-wind cleanup. The table owns spatial membership, cloud
// movement geometry away from the caster, descending terrain behavior, and wind
// predicate facts.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-A-D.md "TranslatingPersistentArea":
//     Action; 120 feet; Concentration up to 10 minutes; 20-foot-radius Sphere;
//     Heavily Obscured; Constitution save for 5d8 Poison damage or half when
//     the cloud appears, moves into a creature's space, a creature enters it,
//     or a creature ends its turn there; once per turn; strong wind disperses;
//     +1d8 per slot level above 5.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Slot, Concentration,
//     Area of Effect/Sphere, Obscurement, Saving Throw, Damage Type.

import { type ElapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import { Result, Schema } from "effect";

import {
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
import { resolveTranslatingPersistentAreaAreaHazardSpellAct } from "../spells-resolve-area-effects.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";

type TranslatingPersistentAreaAreaHazardSpellInvocation = Extract<
  SupportedSpellInvocation,
  {
    readonly procedure: "persistentAreaSaveDamage";
    readonly lifecycle: { readonly kind: "sourceTurnTranslation" };
  }
>;
type TranslatingPersistentAreaAreaHazardResolveInput =
  SpellProcedureProfileResolveInput<TranslatingPersistentAreaAreaHazardSpellInvocation>;
type TranslatingPersistentAreaMechanics = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type TranslatingPersistentAreaSaveGate = Extract<
  NonNullable<TranslatingPersistentAreaMechanics["initialPhase"]>,
  { readonly kind: "save_gate" }
>;
type TranslatingPersistentAreaProfileShape = {
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: number;
  readonly radiusFeet: number;
  readonly translationDistanceFeet: number;
  readonly damageAmount: Extract<
    TranslatingPersistentAreaSaveGate["onFail"],
    { readonly kind: "damage" }
  >["amount"];
};

const TRANSLATING_PERSISTENT_AREA_LEVEL = 5;
const TRANSLATING_PERSISTENT_AREA_RANGE_FEET = 120;
const TRANSLATING_PERSISTENT_AREA_DURATION_MINUTES = 10;
const TRANSLATING_PERSISTENT_AREA_RADIUS_FEET = 20;
const TRANSLATING_PERSISTENT_AREA_OPERATION_COUNT = 5;
const TRANSLATING_PERSISTENT_AREA_BASE_DAMAGE_DICE = 5;
const TRANSLATING_PERSISTENT_AREA_DAMAGE_DIE_SIZE = 8;
const TRANSLATING_PERSISTENT_AREA_DAMAGE_DICE_PER_SLOT_LEVEL = 1;

function admitTranslatingPersistentAreaAreaHazard(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly TranslatingPersistentAreaAreaHazardSpellInvocation[] {
  const translatingPersistentArea = persistentAreaSaveDamageSpell(spell);
  if (translatingPersistentArea === null) {
    return [];
  }

  return ctx.spellCastOptions.flatMap(
    (slot): readonly TranslatingPersistentAreaAreaHazardSpellInvocation[] => {
      if (Number(slot.spellLevel) < TRANSLATING_PERSISTENT_AREA_LEVEL) {
        return [];
      }
      const damageExpr = supportedDamageAmountExpr({
        amount: translatingPersistentArea.damageAmount,
        spellLevel: TRANSLATING_PERSISTENT_AREA_LEVEL,
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
          lifecycle: {
            kind: "sourceTurnTranslation",
            distanceFeet: movementFeet(
              translatingPersistentArea.translationDistanceFeet,
            ),
            direction: "awayFromSource",
            movedAreaOperation: "saveDamage",
            environmentalEnd: "strongWind",
          },
          spell,
          ability: "con",
          dc: { kind: "caster_spell_save_dc" },
          targeting: {
            kind: "pointOriginSphere",
            radiusFeet: movementFeet(translatingPersistentArea.radiusFeet),
          },
          durationTicks: translatingPersistentArea.durationTicks,
          rangeFeet: movementFeet(translatingPersistentArea.rangeFeet),
          damage: { expr: damageExpr, damageType: "poison" },
        },
      ];
    },
  );
}

function persistentAreaSaveDamageSpell(
  spell: BattleSpellAdmissionSource,
): TranslatingPersistentAreaProfileShape | null {
  const ongoing = ongoingConcentrationAreaSpellFacts(spell);
  if (ongoing === null) {
    return null;
  }
  const { mechanics, duration, durationTicks, area } = ongoing;
  const passiveOperation = mechanics.operations.find(
    (operation) => operation.trigger.kind === "passive",
  );
  const moveOperation = mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_caster_turn_start",
  );
  const movedAreaOperation = mechanics.operations.find(
    (operation) =>
      operation.trigger.kind === "on_area_moves_into_creature_space",
  );
  const enterOperation = mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_enters_area",
  );
  const endTurnOperation = mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_ends_turn_in_area",
  );
  const initialPhase = mechanics.initialPhase;
  const initialDamageAmount =
    translatingPersistentAreaSaveGateDamageAmount(initialPhase);
  const initialUsageLimit =
    initialPhase?.kind === "save_gate" ? initialPhase.usageLimit : undefined;

  if (
    mechanics.level !== TRANSLATING_PERSISTENT_AREA_LEVEL ||
    mechanics.castingTime.kind !== "action" ||
    mechanics.range.kind !== "point" ||
    mechanics.range.feet !== TRANSLATING_PERSISTENT_AREA_RANGE_FEET ||
    duration.upTo.unit !== "minute" ||
    duration.upTo.amount !== TRANSLATING_PERSISTENT_AREA_DURATION_MINUTES ||
    duration.earlyEnd?.some(
      (earlyEnd) => earlyEnd.kind === "area_dispersed_by_strong_wind",
    ) !== true ||
    mechanics.operations.length !==
      TRANSLATING_PERSISTENT_AREA_OPERATION_COUNT ||
    Result.isFailure(durationTicks) ||
    area?.kind !== "area" ||
    area.origin.kind !== "point_within_range" ||
    area.shape.kind !== "sphere" ||
    area.shape.radiusFeet !== TRANSLATING_PERSISTENT_AREA_RADIUS_FEET ||
    passiveOperation?.effect.kind !== "area_is_heavily_obscured" ||
    moveOperation?.effect.kind !== "move_area" ||
    moveOperation.effect.direction !== "away_from_caster" ||
    initialDamageAmount === null ||
    translatingPersistentAreaSaveGateDamageAmount(
      movedAreaOperation?.effect,
    ) === null ||
    translatingPersistentAreaSaveGateDamageAmount(enterOperation?.effect) ===
      null ||
    translatingPersistentAreaSaveGateDamageAmount(endTurnOperation?.effect) ===
      null ||
    sharedOncePerTurnLimitGroup([
      initialUsageLimit,
      movedAreaOperation?.usageLimit,
      enterOperation?.usageLimit,
      endTurnOperation?.usageLimit,
    ]) === null
  ) {
    return null;
  }

  return {
    durationTicks: durationTicks.success,
    rangeFeet: mechanics.range.feet,
    radiusFeet: area.shape.radiusFeet,
    translationDistanceFeet: moveOperation.effect.distanceFeet,
    damageAmount: initialDamageAmount,
  };
}

function sharedOncePerTurnLimitGroup(
  limits: readonly (
    | {
        readonly kind: "once_per_round" | "once_per_turn";
        readonly limitGroup?: string;
      }
    | undefined
  )[],
): string | null {
  const [first, ...remaining] = limits;
  return first?.kind === "once_per_turn" &&
    typeof first.limitGroup === "string" &&
    first.limitGroup.length > 0 &&
    remaining.every(
      (limit) =>
        limit?.kind === "once_per_turn" &&
        limit.limitGroup === first.limitGroup,
    )
    ? first.limitGroup
    : null;
}

function translatingPersistentAreaSaveGateDamageAmount(
  effect:
    | TranslatingPersistentAreaMechanics["initialPhase"]
    | TranslatingPersistentAreaMechanics["operations"][number]["effect"]
    | undefined,
): TranslatingPersistentAreaProfileShape["damageAmount"] | null {
  if (
    effect?.kind === "save_gate" &&
    effect.ability === "con" &&
    effect.dc.kind === "caster_spell_save_dc" &&
    effect.onSuccess.kind === "half_damage" &&
    effect.onFail.kind === "damage" &&
    effect.onFail.damageType === "poison" &&
    effect.onFail.amount.kind === "linear_per_level" &&
    effect.onFail.amount.axis === "slot" &&
    effect.onFail.amount.startingAtLevel ===
      TRANSLATING_PERSISTENT_AREA_LEVEL &&
    effect.onFail.amount.base.dice ===
      TRANSLATING_PERSISTENT_AREA_BASE_DAMAGE_DICE &&
    effect.onFail.amount.base.dieSize ===
      TRANSLATING_PERSISTENT_AREA_DAMAGE_DIE_SIZE &&
    effect.onFail.amount.perLevel?.dice ===
      TRANSLATING_PERSISTENT_AREA_DAMAGE_DICE_PER_SLOT_LEVEL
  ) {
    return effect.onFail.amount;
  }
  return null;
}

function resolveTranslatingPersistentAreaAreaHazard(
  input: TranslatingPersistentAreaAreaHazardResolveInput,
): BattleResolutionResult {
  return resolveTranslatingPersistentAreaAreaHazardSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

const TranslatingPersistentAreaAreaHazardInvocationSchema =
  spellProcedureExecutionSchema(
    Schema.Struct({
      access: PreparedSpellAccessSchema,
      resource: LeveledSpellInvocationResourceSchema,
      procedure: Schema.Literal("persistentAreaSaveDamage"),
      lifecycle: Schema.Struct({
        kind: Schema.Literal("sourceTurnTranslation"),
        distanceFeet: MovementFeet,
        direction: Schema.Literal("awayFromSource"),
        movedAreaOperation: Schema.Literal("saveDamage"),
        environmentalEnd: Schema.Literal("strongWind"),
      }),
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
        damageType: Schema.Literal("poison"),
      }),
    }),
  );

export const sourceTurnTranslationPersistentAreaSaveDamageProfile = {
  procedure: "persistentAreaSaveDamage",
  executionSchema: TranslatingPersistentAreaAreaHazardInvocationSchema,
  admit: admitTranslatingPersistentAreaAreaHazard,
  discoverCastAct: discoverActionSpellAreaCastAct,
  resolve: resolveTranslatingPersistentAreaAreaHazard,
} satisfies SpellProcedureDeclaration<
  "persistentAreaSaveDamage",
  TranslatingPersistentAreaAreaHazardSpellInvocation
>;
