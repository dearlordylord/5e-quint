import type { BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
import {
  ongoingSpellRepeatCastIsAvailable,
  ongoingSpellRepeatIsOnLaterTurn,
} from "../ongoing-spell-repeat-cast.ts";
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-object-contact-damage
import { ElapsedTimeTicksSchema } from "@dnd/shared/elapsed-time";
import { DiceExprSchema } from "@dnd/surface/surface/schema";
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.HEAT_METAL_OBJECT_CONTACT_LIFECYCLE
//
// The objectContactDamage profile family: an action-time spell heats a
// selected manufactured metal object, damages table-witnessed physical-contact
// creatures at cast time, and lets the caster spend later-turn Bonus Actions
// to repeat that contact damage while Concentration persists.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-E-L.md "Heat Metal":
//     Action; 60 feet; Concentration up to 1 minute; selected manufactured
//     metal object visible in range; physical-contact creatures take Fire
//     damage when cast; later-turn Bonus Action repeats the damage if the
//     object is within range; holding or wearing damaged creatures make a
//     Constitution save, dropping the object if possible on failure, otherwise
//     taking Disadvantage on attack rolls and ability checks until the start of
//     the caster's next turn; higher-level slots add 1d8 per slot level above 2.
//   - UBIQUITOUS_LANGUAGE.md: Magic Action, Bonus Action, Concentration, Spell
//     Slot, Spell Invocation, Spell Effect, and Holding / Wielding.
//
// What stays in shared infrastructure: the object-contact resolver body remains
// in spells-resolve-object-contact-damage.ts because it owns object witnesses,
// damage rolls, holding/wearing saves, drop outcomes, damage reactions,
// Concentration saves, and active-effect cleanup.

import {
  elapsedTimeTicksFromTimeSpanDuration,
  type ElapsedTimeTicks,
} from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, MovementFeet } from "@dnd/shared/types";
import type {
  DamageType,
  DiceAmount,
  DiceExpr,
  DiceExprDelta,
  EffectAtom,
} from "@dnd/surface/surface/types";
import { Result } from "effect";
import {
  type BattleActDiscoveryCandidate,
  type BattleResolutionResult,
  type BattleState,
  type SpellObjectContactDamageActiveEffect,
  type SupportedSpellInvocation,
} from "../../battle-state-execution.ts";
import {
  BattleEffectExecutionRef,
  BattleProcedureExecutionRef,
  CombatantId,
} from "../../identity.ts";
import { magicSuppressionOngoingSpellEffectRefForActiveEffect } from "../antimagic-field-suppression.ts";
import {
  resolveObjectContactDamageRepeatSpellAct,
  resolveObjectContactDamageSpellAct,
} from "../spells-resolve-object-contact-damage.ts";
import {
  spellObjectContactTargetsHole,
  spellObjectTargetHole,
} from "../spells-targeting.ts";
import {
  sameStringSet,
  supportedDamageAmountExpr,
} from "../spells-execution-facts.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureDeclaration,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { Schema } from "effect";
import {
  DamageTypeSchema,
  PreparedSpellAccessSchema,
  LeveledSpellInvocationResourceSchema,
} from "../codec-building-blocks.ts";
import {
  preparedSpellSlotInvocations,
  spellAdmissionBattleTurn,
  spellAdmissionOngoingSpellEffectSuppressed,
  SpellRuleExecutionFactsSchema,
  spellProcedureExecutionSchema,
} from "./profile.ts";

type ObjectContactDamageInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "objectContactDamage" }
>;
type ObjectContactDamageRepeatInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "objectContactDamageRepeat" }
>;
type ObjectContactDamageResolveInput =
  SpellProcedureProfileResolveInput<ObjectContactDamageInvocation>;
type ObjectContactDamageRepeatResolveInput =
  SpellProcedureProfileResolveInput<ObjectContactDamageRepeatInvocation>;

type OngoingEffectSpellMechanics = Extract<
  BattleSpellAdmissionSource["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type OngoingOperationEffect =
  OngoingEffectSpellMechanics["operations"][number]["effect"];
type OngoingInitialEffect = NonNullable<
  Extract<
    NonNullable<OngoingEffectSpellMechanics["initialPhase"]>,
    { readonly kind: "direct" }
  >["effects"]
>[number];

function admitObjectContactDamage(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly ObjectContactDamageInvocation[] {
  const profile = objectContactDamageSpell(spell);
  if (profile === null) {
    return [];
  }
  return preparedSpellSlotInvocations(spell, ctx, (base, slotLevel) => {
    const damageExpr = supportedDamageAmountExpr({
      amount: profile.damageAmount,
      spellLevel: spell.mechanics.level,
      slotLevel,
    });
    return damageExpr === null
      ? null
      : {
          ...base,
          procedure: "objectContactDamage",
          actionCost: "magicAction",
          targeting: { kind: "singleManufacturedMetalObject" },
          damage: {
            expr: damageExpr,
            damageType: profile.damageType,
          },
          rangeFeet: profile.rangeFeet,
          durationTicks: profile.durationTicks,
        };
  });
}

function admitObjectContactDamageRepeat(
  spell: BattleSpellAdmissionSource,
  ctx: SpellAdmissionContext,
): readonly ObjectContactDamageRepeatInvocation[] {
  if (objectContactDamageSpell(spell) === null) {
    return [];
  }
  return ctx.actor.activeEffects.flatMap(
    (effect): readonly ObjectContactDamageRepeatInvocation[] => {
      if (
        effect.kind !== "spellObjectContactDamage" ||
        effect.sourceCombatantId !== ctx.actor.combatantId ||
        spellAdmissionOngoingSpellEffectSuppressed(
          ctx,
          magicSuppressionOngoingSpellEffectRefForActiveEffect(effect),
        ) ||
        !objectContactDamageRepeatIsDiscoverable(effect, ctx)
      ) {
        return [];
      }
      return [
        {
          access: {
            tag: "spellEffect",
            sourceCombatantId: effect.sourceCombatantId,
          },
          resource: { tag: "none" },
          procedure: "objectContactDamageRepeat",
          spell,
          actionCost: "bonusAction",
          activeEffect: effect,
        },
      ];
    },
  );
}

function objectContactDamageRepeatIsDiscoverable(
  effect: SpellObjectContactDamageActiveEffect,
  ctx: SpellAdmissionContext,
): boolean {
  const battleTurn = spellAdmissionBattleTurn(ctx);
  return (
    battleTurn !== undefined &&
    ongoingSpellRepeatIsOnLaterTurn(battleTurn, effect)
  );
}

function objectContactDamageSpell(spell: BattleSpellAdmissionSource): {
  readonly damageAmount: DiceAmount;
  readonly damageType: Extract<DamageType, "fire">;
  readonly durationTicks: ElapsedTimeTicks;
  readonly rangeFeet: MovementFeet;
} | null {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const rangeFeet =
    spell.mechanics.range.kind === "point" ? spell.mechanics.range.feet : null;
  const attachment = spell.mechanics.attachment;
  const initialPhase = spell.mechanics.initialPhase;
  const initialEffect =
    initialPhase?.kind === "direct" ? initialPhase.effects?.[0] : undefined;
  const repeatOperation = spell.mechanics.operations[0];
  const repeatEffect = repeatOperation?.effect;
  if (
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "action" ||
    rangeFeet !== 60 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    durationTicks === null ||
    Result.isFailure(durationTicks) ||
    spell.mechanics.operations.length !== 1 ||
    !isManufacturedMetalObjectAttachment(attachment) ||
    initialPhase?.kind !== "direct" ||
    !isManufacturedMetalObjectAttachment(initialPhase.attachment) ||
    !sameManufacturedMetalObjectHole(attachment, initialPhase.attachment) ||
    initialPhase.effects?.length !== 1 ||
    !isObjectContactDamageEffect(initialEffect) ||
    repeatOperation?.trigger.kind !== "on_caster_spends_action" ||
    repeatOperation.trigger.cost?.kind !== "bonus_action" ||
    repeatOperation.trigger.laterTurnsOnly !== true ||
    repeatOperation.predicate?.kind !==
      "table_witnessed_attachment_within_spell_range" ||
    !isObjectContactDamageEffect(repeatEffect) ||
    !sameObjectContactDamageEffect(initialEffect, repeatEffect)
  ) {
    return null;
  }
  return {
    damageAmount: initialEffect.amount,
    damageType: initialEffect.damageType,
    durationTicks: durationTicks.success,
    rangeFeet: movementFeet(rangeFeet),
  };
}

type ManufacturedMetalObjectAttachment = Extract<
  OngoingEffectSpellMechanics["attachment"],
  { readonly kind: "hole" }
> & {
  readonly value: {
    readonly kind: "object";
    readonly count: 1;
    readonly filter: {
      readonly manufactured: true;
      readonly material: "metal";
      readonly visibility: "caster_can_see";
    };
  };
};

function isManufacturedMetalObjectAttachment(
  attachment: OngoingEffectSpellMechanics["attachment"],
): attachment is ManufacturedMetalObjectAttachment {
  return (
    attachment.kind === "hole" &&
    attachment.value.kind === "object" &&
    attachment.value.count === 1 &&
    attachment.value.filter?.manufactured === true &&
    attachment.value.filter?.material === "metal" &&
    attachment.value.filter?.visibility === "caster_can_see"
  );
}

function sameManufacturedMetalObjectHole(
  left: ManufacturedMetalObjectAttachment,
  right: ManufacturedMetalObjectAttachment,
): boolean {
  return left.holeId === right.holeId;
}

type ObjectContactDamageEffect = Extract<
  EffectAtom,
  { readonly kind: "object_contact_damage" }
>;
type LinearPerLevelDiceAmount = Extract<
  DiceAmount,
  { readonly kind: "linear_per_level" }
>;
type SupportedHeatMetalDamageAmount = LinearPerLevelDiceAmount & {
  readonly axis: "slot";
  readonly base: DiceExpr & {
    readonly dice: 2;
    readonly dieSize: 8;
    readonly flat?: undefined;
    readonly spellcastingMod?: undefined;
    readonly abilityModifier?: undefined;
  };
  readonly perLevel: DiceExprDelta & {
    readonly dice: 1;
    readonly dieSize?: undefined;
    readonly flat?: undefined;
  };
  readonly startingAtLevel: 3;
};
type SupportedObjectContactDamageEffect = ObjectContactDamageEffect & {
  readonly damageType: Extract<DamageType, "fire">;
  readonly amount: SupportedHeatMetalDamageAmount;
};

function isObjectContactDamageEffect(
  effect: OngoingInitialEffect | OngoingOperationEffect | undefined,
): effect is SupportedObjectContactDamageEffect {
  if (effect?.kind !== "object_contact_damage") {
    return false;
  }
  const amount = effect.amount;
  return (
    effect.contact.kind ===
      "table_witnessed_physical_contact_with_spell_object" &&
    effect.damageType === "fire" &&
    isSupportedHeatMetalDamageAmount(amount) &&
    isSupportedObjectContactHoldingOrWearingSave(effect.holdingOrWearingSave)
  );
}

function isSupportedHeatMetalDamageAmount(
  amount: DiceAmount,
): amount is SupportedHeatMetalDamageAmount {
  return (
    amount.kind === "linear_per_level" &&
    amount.axis === "slot" &&
    amount.startingAtLevel === 3 &&
    amount.base.dice === 2 &&
    amount.base.dieSize === 8 &&
    amount.base.flat === undefined &&
    amount.base.spellcastingMod === undefined &&
    amount.base.abilityModifier === undefined &&
    amount.perLevel.dice === 1 &&
    amount.perLevel.dieSize === undefined &&
    amount.perLevel.flat === undefined
  );
}

function sameObjectContactDamageEffect(
  left: SupportedObjectContactDamageEffect,
  right: SupportedObjectContactDamageEffect,
): boolean {
  return (
    left.damageType === right.damageType &&
    left.amount.axis === right.amount.axis &&
    left.amount.startingAtLevel === right.amount.startingAtLevel &&
    left.amount.base.dice === right.amount.base.dice &&
    left.amount.base.dieSize === right.amount.base.dieSize &&
    left.amount.base.flat === right.amount.base.flat &&
    left.amount.base.spellcastingMod === right.amount.base.spellcastingMod &&
    left.amount.base.abilityModifier === right.amount.base.abilityModifier &&
    left.amount.perLevel.dice === right.amount.perLevel.dice &&
    left.amount.perLevel.dieSize === right.amount.perLevel.dieSize &&
    left.amount.perLevel.flat === right.amount.perLevel.flat &&
    left.contact.kind === right.contact.kind &&
    isSupportedObjectContactHoldingOrWearingSave(right.holdingOrWearingSave)
  );
}

function isSupportedObjectContactHoldingOrWearingSave(
  save: ObjectContactDamageEffect["holdingOrWearingSave"],
): boolean {
  const fallbackRolls = save.onFailure.fallback.on;
  return (
    save.appliesIf.kind === "table_witnessed_holding_or_wearing_spell_object" &&
    save.ability === "con" &&
    save.dc.kind === "caster_spell_save_dc" &&
    save.onSuccess.kind === "none" &&
    save.onFailure.kind === "drop_if_possible_else_disadvantage" &&
    save.onFailure.dropCapabilityWitness.kind ===
      "table_witnessed_drop_capability" &&
    save.onFailure.dropCapabilityWitness.subject === "damaged_creature" &&
    save.onFailure.dropCapabilityWitness.object === "spell_object" &&
    save.onFailure.dropResultWitness.kind === "table_witnessed_drop_result" &&
    save.onFailure.dropResultWitness.subject === "damaged_creature" &&
    save.onFailure.dropResultWitness.object === "spell_object" &&
    save.onFailure.fallbackWhen === "object_not_dropped" &&
    save.onFailure.fallback.kind === "modify_roll_advantage" &&
    save.onFailure.fallback.mode === "disadvantage" &&
    sameStringSet(fallbackRolls, ["attack_roll", "ability_check"]) &&
    save.onFailure.fallback.expiresOn.kind === "caster_turn_start"
  );
}

function discoverObjectContactDamageCastAct(
  _state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<ObjectContactDamageInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  return [
    {
      subject: {
        tag: "actionSpell" as const,
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" as const },
      },
      initialHoles: [spellObjectTargetHole(invocation)],
    },
  ];
}

function discoverObjectContactDamageRepeatCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: import("../../battle-state-execution.ts").BattleExecutableSpellInvocation<ObjectContactDamageRepeatInvocation>,
): readonly BattleActDiscoveryCandidate[] {
  if (!ongoingSpellRepeatCastIsAvailable(state, invocation.activeEffect)) {
    return [];
  }
  return [
    {
      subject: {
        tag: "bonusActionSpell" as const,
        actorId,
        procedureRef: invocation.sourceProcedureRef,
        mode: { tag: "cast" as const },
      },
      initialHoles: [
        spellObjectContactTargetsHole({
          state,
          sourceCombatantId: invocation.activeEffect.sourceCombatantId,
          objectId: invocation.activeEffect.objectId,
          invocation: {
            ...invocation,
            sourceProcedureRef: invocation.activeEffect.sourceProcedureRef,
          },
          requiresObjectWithinRange: true,
        }),
      ],
    },
  ];
}

function resolveObjectContactDamage(
  input: ObjectContactDamageResolveInput,
): BattleResolutionResult {
  return resolveObjectContactDamageSpellAct(input);
}

function resolveObjectContactDamageRepeat(
  input: ObjectContactDamageRepeatResolveInput,
): BattleResolutionResult {
  return resolveObjectContactDamageRepeatSpellAct(input);
}

const ObjectContactDamageInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: LeveledSpellInvocationResourceSchema,
    procedure: Schema.Literal("objectContactDamage"),
    spellRuleFacts: SpellRuleExecutionFactsSchema,
    actionCost: Schema.Literal("magicAction"),
    targeting: Schema.Struct({
      kind: Schema.Literal("singleManufacturedMetalObject"),
    }),
    damage: Schema.Struct({
      expr: DiceExprSchema,
      damageType: DamageTypeSchema,
    }),
    rangeFeet: MovementFeet,
    durationTicks: ElapsedTimeTicksSchema,
  }),
);

const ObjectContactDamageRepeatInvocationSchema = spellProcedureExecutionSchema(
  Schema.Struct({
    procedure: Schema.Literal("objectContactDamageRepeat"),
    spellRuleFacts: Schema.optionalKey(Schema.Never),
    activeEffectRef: BattleEffectExecutionRef,
    activeEffectSourceProcedureRef: BattleProcedureExecutionRef,
  }),
);
export const objectContactDamageProfile: SpellProcedureDeclaration<
  "objectContactDamage",
  ObjectContactDamageInvocation
> = {
  procedure: "objectContactDamage",
  executionSchema: ObjectContactDamageInvocationSchema,
  admit: admitObjectContactDamage,
  discoverCastAct: discoverObjectContactDamageCastAct,
  resolve: resolveObjectContactDamage,
};

export const objectContactDamageRepeatProfile: SpellProcedureDeclaration<
  "objectContactDamageRepeat",
  ObjectContactDamageRepeatInvocation
> = {
  procedure: "objectContactDamageRepeat",
  executionSchema: ObjectContactDamageRepeatInvocationSchema,
  admit: admitObjectContactDamageRepeat,
  discoverCastAct: discoverObjectContactDamageRepeatCastAct,
  resolve: resolveObjectContactDamageRepeat,
};
