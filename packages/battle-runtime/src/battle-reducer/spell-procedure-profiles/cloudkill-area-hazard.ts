// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-cloudkill-area-hazard
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
import { DiceExprSchema } from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
//
// Cloudkill-shaped hazard: action-time Spell Slot casting creates a
// caster-owned Concentration Sphere. The runtime owns Spell Slot spending,
// Concentration duration, caller-supplied Sphere identity, Heavily Obscured
// projection, Constitution Saving Throw-gated Poison damage, once-per-turn save
// ledger, and strong-wind cleanup. The table owns spatial membership, cloud
// movement geometry away from the caster, descending terrain behavior, and wind
// predicate facts.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-A-D.md "Cloudkill":
//     Action; 120 feet; Concentration up to 10 minutes; 20-foot-radius Sphere;
//     Heavily Obscured; Constitution save for 5d8 Poison damage or half when
//     the cloud appears, moves into a creature's space, a creature enters it,
//     or a creature ends its turn there; once per turn; strong wind disperses;
//     +1d8 per slot level above 5.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Spell Slot, Concentration,
//     Area of Effect/Sphere, Obscurement, Saving Throw, Damage Type.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Either, Schema } from "effect";

import {
  type ActionSpellBattleResolutionInput,
  type BattleActDiscoveryCandidate,
  type BattleResolutionResult,
  type BattleState,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import { type CombatantId } from "../../identity.ts";
import {
  DcSourceSchema,
  MovementFeet,
  PreparedSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import { spellAreaChoiceHole } from "../spells-holes-fills.ts";
import { supportedDamageAmountExpr } from "../spells-profile-shared.ts";
import { resolveCloudkillAreaHazardSpellAct } from "../spells-resolve-area-effects.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";

type CloudkillAreaHazardSpellInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "cloudkillAreaHazard" }
>;
type CloudkillAreaHazardResolveInput = SpellProcedureProfileResolveInput<
  CloudkillAreaHazardSpellInvocation,
  ActionSpellBattleResolutionInput
>;
type CloudkillMechanics = Extract<
  SpellRecord["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type CloudkillSaveGate = Extract<
  NonNullable<CloudkillMechanics["initialPhase"]>,
  { readonly kind: "save_gate" }
>;
type CloudkillProfileShape = {
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: number;
  readonly radiusFeet: number;
  readonly damageAmount: Extract<
    CloudkillSaveGate["onFail"],
    { readonly kind: "damage" }
  >["amount"];
};

const CLOUDKILL_LEVEL = 5;
const CLOUDKILL_RANGE_FEET = 120;
const CLOUDKILL_DURATION_MINUTES = 10;
const CLOUDKILL_RADIUS_FEET = 20;
const CLOUDKILL_OPERATION_COUNT = 4;
const CLOUDKILL_BASE_DAMAGE_DICE = 5;
const CLOUDKILL_DAMAGE_DIE_SIZE = 8;
const CLOUDKILL_DAMAGE_DICE_PER_SLOT_LEVEL = 1;

function admitCloudkillAreaHazard(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly CloudkillAreaHazardSpellInvocation[] {
  const cloudkill = cloudkillAreaHazardSpell(spell);
  if (cloudkill === null) {
    return [];
  }

  return ctx.actor.origin.spellcasting.spellSlots.flatMap(
    (slot): readonly CloudkillAreaHazardSpellInvocation[] => {
      if (Number(slot.spellLevel) < CLOUDKILL_LEVEL) {
        return [];
      }
      const damageExpr = supportedDamageAmountExpr({
        amount: cloudkill.damageAmount,
        spellLevel: CLOUDKILL_LEVEL,
        slotLevel: slot.spellLevel,
      });
      if (damageExpr === null) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
          procedure: "cloudkillAreaHazard",
          spell,
          ability: "con",
          dc: { kind: "caster_spell_save_dc" },
          targeting: {
            kind: "pointOriginSphere",
            radiusFeet: movementFeet(cloudkill.radiusFeet),
          },
          durationTicks: cloudkill.durationTicks,
          rangeFeet: movementFeet(cloudkill.rangeFeet),
          damage: { expr: damageExpr, damageType: "poison" },
        },
      ];
    },
  );
}

function cloudkillAreaHazardSpell(
  spell: SpellRecord,
): CloudkillProfileShape | null {
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
  const passiveOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "passive",
  );
  const moveOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_attached_turn_start",
  );
  const enterOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_enters_area",
  );
  const endTurnOperation = spell.mechanics.operations.find(
    (operation) => operation.trigger.kind === "on_creature_ends_turn_in_area",
  );
  const initialPhase = spell.mechanics.initialPhase;
  const initialDamageAmount = cloudkillSaveGateDamageAmount(initialPhase);

  if (
    spell.mechanics.level !== CLOUDKILL_LEVEL ||
    spell.mechanics.castingTime.kind !== "action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== CLOUDKILL_RANGE_FEET ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== CLOUDKILL_DURATION_MINUTES ||
    spell.mechanics.duration.earlyEnd?.some(
      (earlyEnd) => earlyEnd.kind === "area_dispersed_by_strong_wind",
    ) !== true ||
    spell.mechanics.operations.length !== CLOUDKILL_OPERATION_COUNT ||
    durationTicks === null ||
    Either.isLeft(durationTicks) ||
    area?.kind !== "area" ||
    area.origin.kind !== "point_within_range" ||
    area.shape.kind !== "sphere" ||
    area.shape.radiusFeet !== CLOUDKILL_RADIUS_FEET ||
    passiveOperation?.effect.kind !== "area_is_heavily_obscured" ||
    initialDamageAmount === null ||
    cloudkillSaveGateDamageAmount(moveOperation?.effect) === null ||
    cloudkillSaveGateDamageAmount(enterOperation?.effect) === null ||
    cloudkillSaveGateDamageAmount(endTurnOperation?.effect) === null ||
    enterOperation?.usageLimit?.kind !== "once_per_turn" ||
    endTurnOperation?.usageLimit?.kind !== "once_per_turn"
  ) {
    return null;
  }

  return {
    durationTicks: durationTicks.right,
    rangeFeet: spell.mechanics.range.feet,
    radiusFeet: area.shape.radiusFeet,
    damageAmount: initialDamageAmount,
  };
}

function cloudkillSaveGateDamageAmount(
  effect:
    | CloudkillMechanics["initialPhase"]
    | CloudkillMechanics["operations"][number]["effect"]
    | undefined,
): CloudkillProfileShape["damageAmount"] | null {
  if (
    effect?.kind === "save_gate" &&
    effect.ability === "con" &&
    effect.dc.kind === "caster_spell_save_dc" &&
    effect.onSuccess.kind === "half_damage" &&
    effect.onFail.kind === "damage" &&
    effect.onFail.damageType === "poison" &&
    effect.onFail.amount.kind === "linear_per_level" &&
    effect.onFail.amount.axis === "slot" &&
    effect.onFail.amount.startingAtLevel === CLOUDKILL_LEVEL &&
    effect.onFail.amount.base.dice === CLOUDKILL_BASE_DAMAGE_DICE &&
    effect.onFail.amount.base.dieSize === CLOUDKILL_DAMAGE_DIE_SIZE &&
    effect.onFail.amount.perLevel?.dice === CLOUDKILL_DAMAGE_DICE_PER_SLOT_LEVEL
  ) {
    return effect.onFail.amount;
  }
  return null;
}

function discoverCloudkillAreaHazardCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-reducer.ts").BattleExecutableSpellInvocation<CloudkillAreaHazardSpellInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [
    {
      subject: {
        tag: "actionSpell",
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" },
      },
      initialHoles: [spellAreaChoiceHole(invocation)],
    },
  ];
}

function resolveCloudkillAreaHazard(
  input: CloudkillAreaHazardResolveInput,
): BattleResolutionResult {
  return resolveCloudkillAreaHazardSpellAct({
    input: input.input,
    actorId: input.actorId,
    invocation: input.invocation,
    fillSet: input.fillSet,
  });
}

const CloudkillAreaHazardInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("cloudkillAreaHazard"),
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

export const cloudkillAreaHazardProfile = {
  procedure: "cloudkillAreaHazard",
  executionSchema: CloudkillAreaHazardInvocationSchema,
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  admit: admitCloudkillAreaHazard,
  discoverCastAct: discoverCloudkillAreaHazardCastAct,
  resolve: resolveCloudkillAreaHazard,
} satisfies SpellProcedureProfile<
  "cloudkillAreaHazard",
  CloudkillAreaHazardSpellInvocation,
  ActionSpellBattleResolutionInput
>;
