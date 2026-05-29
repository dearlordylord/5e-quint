// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spell-created-held-object
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE
//
// The spellCreatedHeldObject profile family: a prepared Bonus Action spell
// creates a spell effect held in the caster's free hand, the held object can be
// used for a Magic Action melee Spell Attack, and the same spell effect can be
// re-evoked with a Bonus Action after the caster lets it go.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-E-L.md "Flame Blade":
//     Bonus Action; Self; Concentration up to 10 minutes; evoke a fiery blade
//     in a free hand; disappears when let go; can be evoked again as a Bonus
//     Action; Magic Action melee Spell Attack; Fire damage equal to 3d6 plus
//     spellcasting ability modifier; sheds Bright and Dim Light; higher-level
//     slots add 1d6 damage.
//   - UBIQUITOUS_LANGUAGE.md: Free Hand, Holding / Wielding, Magic Action,
//     Spell Attack, Spell Slot, Spell Invocation, and Spell Effect.
//
// What stays in shared infrastructure:
//   - The active-effect state transitions and light projection stay in
//     spells-active-effects.ts.
//   - The Magic Action spell attack damage lifecycle stays in the shared
//     spell attack resolver because held-light hurls, spell-created held-object
//     attacks, spiritual weapon attacks, object-contact repeats, and ordinary
//     spell attacks share target, attack-roll, damage, reaction, and reduction
//     flow.
//   - The release runtime command remains outside this profile because it is a
//     command over an existing Spell Effect, not a Spell Invocation.

import { spendActivationResource } from "@dnd/shared-algebras/action-economy-algebra";
import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  attackBonus,
  movementFeet,
  type AbilityModifier,
  type ProficiencyBonus as ProficiencyBonusType,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import { DamageTypeSchema } from "@dnd/surface/surface/schema";
import type {
  DiceAmount as SurfaceDiceAmount,
  DiceExpr,
  SpellRecord,
} from "@dnd/surface/surface/types";
import { Either, Schema } from "effect";

import {
  maybeOpenReactionWindow,
  snapshotBattle,
  type ActionSpellBattleResolutionInput,
  type AvailableBattleAct,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type SpellCreatedHeldObjectActiveEffect,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import {
  type SpellInvocationRef,
  spellEffectInvocationRef,
} from "../../battle-subjects.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { invalidResult } from "../result-helpers.ts";
import { spellCastReactionFrame } from "../spell-cast-reaction-frame.ts";
import { spellCreatedHeldObjectHasFreeHand } from "../spell-created-held-object.ts";
import { applySpellCreatedHeldObjectEffect } from "../spells-active-effects.ts";
import { spellCreatedHeldObjectEffectForSource } from "../spells-active-effects.ts";
import { setSpellCreatedHeldObjectState } from "../spells-active-effects.ts";
import { spellTargetHole } from "../spells-targeting.ts";
import { resolveSpellAttackDamageAct } from "../spells-resolve.ts";
import { spendSpellCastResources } from "../spells-resolve-resources.ts";
import { sameStringSet } from "../spells-profile-shared.ts";
import type {
  OkSpellFillSet,
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import { spellProcedureInvocationSchema } from "./profile.ts";
import {
  AttackBonus,
  BattleRuntimeObjectSchema,
  MovementFeet,
  NoSpellInvocationResourceSchema,
  PreparedSpellAccessSchema,
  SpellEffectSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../codec-building-blocks.ts";

const SPELL_CREATED_HELD_OBJECT_MELEE_REACH_FEET = movementFeet(5);

type SpellCreatedHeldObjectInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spellCreatedHeldObject" }
>;
type SpellCreatedHeldObjectAttackInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spellCreatedHeldObjectAttack" }
>;
type SpellCreatedHeldObjectReEvokeInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spellCreatedHeldObjectReEvoke" }
>;
type SpellCreatedHeldObjectFamilyInvocation =
  | SpellCreatedHeldObjectInvocation
  | SpellCreatedHeldObjectAttackInvocation
  | SpellCreatedHeldObjectReEvokeInvocation;

type OngoingEffectSpellMechanics = Extract<
  SpellRecord["mechanics"],
  { readonly family: "ongoing_effect" }
>;
type OngoingEffectInitialEffect = NonNullable<
  Extract<
    NonNullable<OngoingEffectSpellMechanics["initialPhase"]>,
    { readonly kind: "direct" }
  >["effects"]
>[number];
type SpellCreatedHeldObjectEffect = Extract<
  OngoingEffectInitialEffect,
  { readonly kind: "spell_created_held_object" }
>;
type SpellCreatedHeldObjectAttackOperation =
  OngoingEffectSpellMechanics["operations"][number] & {
    readonly effect: Extract<
      OngoingEffectSpellMechanics["operations"][number]["effect"],
      { readonly kind: "attack_roll" }
    >;
  };
type SpellCreatedHeldObjectLightOperation =
  OngoingEffectSpellMechanics["operations"][number] & {
    readonly effect: Extract<
      OngoingEffectSpellMechanics["operations"][number]["effect"],
      { readonly kind: "emit_light" }
    >;
  };

type SpellCreatedHeldObjectResolveInput = SpellProcedureProfileResolveInput<
  SpellCreatedHeldObjectInvocation,
  BonusActionSpellBattleResolutionInput
>;
type SpellCreatedHeldObjectAttackResolveInput =
  SpellProcedureProfileResolveInput<
    SpellCreatedHeldObjectAttackInvocation,
    ActionSpellBattleResolutionInput
  >;
type SpellCreatedHeldObjectReEvokeResolveInput =
  SpellProcedureProfileResolveInput<
    SpellCreatedHeldObjectReEvokeInvocation,
    BonusActionSpellBattleResolutionInput
  >;

function admitSpellCreatedHeldObject(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly SpellCreatedHeldObjectInvocation[] {
  const spellcasting = ctx.actor.origin.spellcasting;
  return spellcasting.spellSlots.flatMap(
    (slot): readonly SpellCreatedHeldObjectInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      const activeEffect = spellCreatedHeldObjectActiveEffectProjection({
        actorId: ctx.actor.combatantId,
        spell,
        slotLevel: slot.spellLevel,
        spellcastingAbilityModifier: spellcasting.spellcastingAbilityModifier,
        proficiencyBonus: spellcasting.proficiencyBonus,
      });
      return activeEffect === null
        ? []
        : [
            {
              access: { tag: "prepared" },
              resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
              procedure: "spellCreatedHeldObject",
              spell,
              actionCost: "bonusAction",
              activeEffect,
            },
          ];
    },
  );
}

function admitSpellCreatedHeldObjectAttack(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly SpellCreatedHeldObjectAttackInvocation[] {
  return spellCreatedHeldObjectEffectsForSpell(ctx, spell).flatMap(
    (effect): readonly SpellCreatedHeldObjectAttackInvocation[] =>
      effect.objectState.kind === "held"
        ? [
            {
              access: {
                tag: "spellEffect",
                sourceCombatantId: effect.sourceCombatantId,
              },
              resource: { tag: "none" },
              procedure: "spellCreatedHeldObjectAttack",
              spell,
              targeting: { kind: "singleCombatant" },
              damage: effect.attack.damage,
              rangeFeet: SPELL_CREATED_HELD_OBJECT_MELEE_REACH_FEET,
              attackKind: effect.attack.attackKind,
              attackBonus: effect.attack.attackBonus,
              activeEffect: { ...effect, objectState: { kind: "held" } },
            },
          ]
        : [],
  );
}

function admitSpellCreatedHeldObjectReEvoke(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly SpellCreatedHeldObjectReEvokeInvocation[] {
  return spellCreatedHeldObjectEffectsForSpell(ctx, spell).flatMap(
    (effect): readonly SpellCreatedHeldObjectReEvokeInvocation[] =>
      effect.objectState.kind === "notHeld"
        ? [
            {
              access: {
                tag: "spellEffect",
                sourceCombatantId: effect.sourceCombatantId,
              },
              resource: { tag: "none" },
              procedure: "spellCreatedHeldObjectReEvoke",
              spell,
              actionCost: "bonusAction",
              activeEffect: { ...effect, objectState: { kind: "notHeld" } },
            },
          ]
        : [],
  );
}

function spellCreatedHeldObjectEffectsForSpell(
  ctx: SpellAdmissionContext,
  spell: SpellRecord,
): readonly SpellCreatedHeldObjectActiveEffect[] {
  return ctx.actor.activeEffects.filter(
    (effect): effect is SpellCreatedHeldObjectActiveEffect =>
      effect.kind === "spellCreatedHeldObject" &&
      effect.sourceCombatantId === ctx.actor.combatantId &&
      effect.sourceSpellId === spell.id,
  );
}

function spellCreatedHeldObjectActiveEffectProjection(input: {
  readonly actorId: CombatantId;
  readonly spell: SpellRecord;
  readonly slotLevel: SpellSlotLevel;
  readonly spellcastingAbilityModifier: AbilityModifier;
  readonly proficiencyBonus: ProficiencyBonusType;
}):
  | (SpellCreatedHeldObjectActiveEffect & {
      readonly objectState: { readonly kind: "held" };
    })
  | null {
  const spell = input.spell;
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const mechanics = spell.mechanics;
  const initialPhase = mechanics.initialPhase;
  if (
    mechanics.castingTime.kind !== "bonus_action" ||
    mechanics.range.kind !== "self" ||
    mechanics.attachment.kind !== "self" ||
    mechanics.duration.kind !== "concentration" ||
    initialPhase?.kind !== "direct" ||
    initialPhase.attachment.kind !== "self" ||
    initialPhase.effects === undefined
  ) {
    return null;
  }
  const heldObjectEffects = initialPhase.effects.filter(
    (effect) => effect.kind === "spell_created_held_object",
  );
  const lightOperations = mechanics.operations.filter(
    (operation): operation is SpellCreatedHeldObjectLightOperation =>
      operation.trigger.kind === "passive" &&
      operation.predicate?.kind === "spell_created_held_object_active" &&
      operation.effect.kind === "emit_light",
  );
  const attackOperations = mechanics.operations.filter(
    (operation): operation is SpellCreatedHeldObjectAttackOperation =>
      operation.trigger.kind === "on_caster_spends_action" &&
      operation.trigger.cost?.kind === "standard_action" &&
      operation.trigger.cost.action === "magic" &&
      operation.predicate?.kind === "spell_created_held_object_active" &&
      operation.effect.kind === "attack_roll",
  );
  const heldObject = heldObjectEffects[0];
  const lightOperation = lightOperations[0];
  const attackOperation = attackOperations[0];
  const durationTicks = elapsedTimeTicksFromTimeSpanDuration(
    mechanics.duration.upTo,
  );
  if (
    initialPhase.effects.length !== 1 ||
    heldObjectEffects.length !== 1 ||
    mechanics.operations.length !== 2 ||
    lightOperations.length !== 1 ||
    attackOperations.length !== 1 ||
    heldObject?.kind !== "spell_created_held_object" ||
    !spellCreatedHeldObjectLifecycleIsSupported(heldObject) ||
    lightOperation?.effect.kind !== "emit_light" ||
    lightOperation.effect.brightRadiusFeet === undefined ||
    lightOperation.effect.dimAdditionalFeet === undefined ||
    attackOperation === undefined ||
    Either.isLeft(durationTicks)
  ) {
    return null;
  }
  const damageEffect = attackOperation.effect.onHit[0];
  const missEffect = attackOperation.effect.onMiss[0];
  if (
    attackOperation.effect.attackKind !== "melee_spell_attack" ||
    attackOperation.effect.onHit.length !== 1 ||
    damageEffect?.kind !== "damage" ||
    damageEffect.amount === undefined ||
    !Schema.is(DamageTypeSchema)(damageEffect.damageType) ||
    attackOperation.effect.onMiss.length !== 1 ||
    missEffect?.kind !== "none"
  ) {
    return null;
  }
  const damageExpr = spellCreatedHeldObjectDamageExpr(
    damageEffect.amount,
    mechanics.level,
    input.slotLevel,
    input.spellcastingAbilityModifier,
  );
  if (damageExpr === null) {
    return null;
  }
  return {
    kind: "spellCreatedHeldObject",
    sourceSpellId: spell.id,
    sourceCombatantId: input.actorId,
    objectState: { kind: "held" },
    light: {
      brightRadiusFeet: movementFeet(lightOperation.effect.brightRadiusFeet),
      dimAdditionalFeet: movementFeet(lightOperation.effect.dimAdditionalFeet),
    },
    attack: {
      damage: {
        expr: damageExpr,
        damageType: damageEffect.damageType,
      },
      attackKind: attackOperation.effect.attackKind,
      attackBonus: attackBonus(
        Number(input.spellcastingAbilityModifier) +
          Number(input.proficiencyBonus),
      ),
    },
    expiresAt: {
      kind: "concentration",
      combatantId: input.actorId,
      durationTicks: durationTicks.right,
    },
  };
}

function spellCreatedHeldObjectLifecycleIsSupported(
  effect: SpellCreatedHeldObjectEffect,
): boolean {
  return (
    effect.heldBy === "caster" &&
    sameStringSet(effect.requirements, ["free_hand"]) &&
    sameStringSet(effect.disappearsWhen, ["caster_lets_go"]) &&
    effect.reEvoke.cost.kind === "bonus_action" &&
    sameStringSet(effect.reEvoke.requirements, ["free_hand"])
  );
}

function spellCreatedHeldObjectDamageExpr(
  amount: SurfaceDiceAmount,
  spellLevel: number,
  slotLevel: SpellSlotLevel,
  spellcastingAbilityModifier: AbilityModifier,
): DiceExpr | null {
  if (
    amount.kind !== "linear_per_level" ||
    amount.axis !== "slot" ||
    amount.startingAtLevel !== spellLevel ||
    amount.base.dieSize === undefined ||
    amount.base.spellcastingMod !== true ||
    amount.base.abilityModifier !== undefined ||
    amount.perLevel?.dieSize !== amount.base.dieSize
  ) {
    return null;
  }
  const slotDelta = Math.max(0, Number(slotLevel) - amount.startingAtLevel);
  return {
    dice: amount.base.dice + (amount.perLevel?.dice ?? 0) * slotDelta,
    dieSize: amount.base.dieSize,
    flat:
      (amount.base.flat ?? 0) +
      (amount.perLevel?.flat ?? 0) * slotDelta +
      Number(spellcastingAbilityModifier),
  };
}

function discoverSpellCreatedHeldObjectCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: SpellCreatedHeldObjectInvocation,
): readonly AvailableBattleAct[] {
  if (!spellCreatedHeldObjectHasFreeHand(state, actorId)) {
    return [];
  }
  return [
    {
      subject: {
        tag: "bonusActionSpell",
        actorId,
        invocation: spellCreatedHeldObjectInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: invocation.spell.name,
      summary: spellCreatedHeldObjectCastSummary(invocation),
      initialHoles: [],
    },
  ];
}

function discoverSpellCreatedHeldObjectAttackCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: SpellCreatedHeldObjectAttackInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return targetHole.choices.length === 0
    ? []
    : [
        {
          subject: {
            tag: "actionSpell",
            actorId,
            invocation: spellCreatedHeldObjectAttackInvocationRef(invocation),
            mode: { tag: "cast" },
          },
          label: `${invocation.spell.name} attack`,
          summary: spellCreatedHeldObjectAttackCastSummary(invocation),
          initialHoles: [targetHole],
        },
      ];
}

function discoverSpellCreatedHeldObjectReEvokeCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: SpellCreatedHeldObjectReEvokeInvocation,
): readonly AvailableBattleAct[] {
  if (!spellCreatedHeldObjectHasFreeHand(state, actorId)) {
    return [];
  }
  return [
    {
      subject: {
        tag: "bonusActionSpell",
        actorId,
        invocation: spellCreatedHeldObjectReEvokeInvocationRef(invocation),
        mode: { tag: "cast" },
      },
      label: `${invocation.spell.name} re-evoke`,
      summary: spellCreatedHeldObjectReEvokeCastSummary(invocation),
      initialHoles: [],
    },
  ];
}

function spellCreatedHeldObjectInvocationRef(
  invocation: SpellCreatedHeldObjectInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "spellCreatedHeldObject",
  };
}

function spellCreatedHeldObjectAttackInvocationRef(
  invocation: SpellCreatedHeldObjectAttackInvocation,
): SpellInvocationRef {
  return spellCreatedHeldObjectEffectInvocationRef(
    invocation,
    "spellCreatedHeldObjectAttack",
  );
}

function spellCreatedHeldObjectReEvokeInvocationRef(
  invocation: SpellCreatedHeldObjectReEvokeInvocation,
): SpellInvocationRef {
  return spellCreatedHeldObjectEffectInvocationRef(
    invocation,
    "spellCreatedHeldObjectReEvoke",
  );
}

function spellCreatedHeldObjectEffectInvocationRef(
  invocation: Extract<
    SpellCreatedHeldObjectFamilyInvocation,
    {
      readonly procedure:
        | "spellCreatedHeldObjectAttack"
        | "spellCreatedHeldObjectReEvoke";
    }
  >,
  procedure: "spellCreatedHeldObjectAttack" | "spellCreatedHeldObjectReEvoke",
): SpellInvocationRef {
  return spellEffectInvocationRef(
    invocation.spell.id,
    invocation.activeEffect.sourceCombatantId,
    procedure,
  );
}

function spellCreatedHeldObjectCastSummary(
  invocation: SpellCreatedHeldObjectInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function spellCreatedHeldObjectAttackCastSummary(
  invocation: SpellCreatedHeldObjectAttackInvocation,
): string {
  return `Take a Magic action to attack with ${invocation.spell.name}.`;
}

function spellCreatedHeldObjectReEvokeCastSummary(
  invocation: SpellCreatedHeldObjectReEvokeInvocation,
): string {
  return `Re-evoke ${invocation.spell.name} with a Bonus Action.`;
}

function resolveSpellCreatedHeldObject(
  input: SpellCreatedHeldObjectResolveInput,
): BattleResolutionResult {
  const handStateError = spellCreatedHeldObjectHandStateError(
    input.input.state,
    input.actorId,
    input.fillSet,
    {
      allowSpellCastReactionFacts: true,
      unrelatedFillsMessage:
        "Spell-created held object creation only accepts spell-cast Reaction facts.",
    },
  );
  if (handStateError !== null) {
    return invalidResult(
      input.input.state,
      handStateError.reason,
      handStateError.message,
    );
  }
  const spellCastReactionWindow = maybeOpenReactionWindow(
    input.input.state,
    spellCastReactionFrame({
      casterId: input.actorId,
      invocation: input.invocation,
      targetIds: [input.actorId],
      reactionSpellTargetFacts: input.fillSet.reactionSpellTargetFacts,
      castingResource: { kind: "bonusAction" },
      continuation: {
        kind: "replay",
        subject: input.input.subject,
        fills: input.input.fills,
      },
    }),
    input.input.suppressedReactionTrigger,
  );
  if (spellCastReactionWindow !== null) {
    return spellCastReactionWindow;
  }
  const resourced = spendSpellCastResources({
    state: input.input.state,
    actorId: input.actorId,
    invocation: input.invocation,
    errorState: input.input.state,
  });
  if (resourced.tag === "invalid") {
    return resourced;
  }
  const effected = applySpellCreatedHeldObjectEffect({
    state: resourced.state,
    actorId: input.actorId,
    activeEffect: input.invocation.activeEffect,
  });
  if (effected.tag === "invalid") {
    return invalidResult(input.input.state, "staleSubject", effected.message);
  }
  return {
    tag: "resolved",
    state: effected.state,
    snapshot: snapshotBattle(effected.state),
  };
}

function resolveSpellCreatedHeldObjectAttack(
  input: SpellCreatedHeldObjectAttackResolveInput,
): BattleResolutionResult {
  if (input.fillSet.reactionSpellTargetFacts.length > 0) {
    return invalidResult(
      input.input.state,
      "invalidFill",
      "Spell-created held object attacks are not spell casts and do not accept spell-cast Reaction facts.",
    );
  }
  return resolveSpellAttackDamageAct(input);
}

function resolveSpellCreatedHeldObjectReEvoke(
  input: SpellCreatedHeldObjectReEvokeResolveInput,
): BattleResolutionResult {
  const handStateError = spellCreatedHeldObjectHandStateError(
    input.input.state,
    input.actorId,
    input.fillSet,
    {
      allowSpellCastReactionFacts: false,
      unrelatedFillsMessage:
        "Spell-created held object re-evocation does not accept fills.",
    },
  );
  if (handStateError !== null) {
    return invalidResult(
      input.input.state,
      handStateError.reason,
      handStateError.message,
    );
  }
  const actor = input.input.state.combatants.get(input.actorId);
  const activeEffect = spellCreatedHeldObjectEffectForSource(
    actor,
    input.invocation.activeEffect.sourceCombatantId,
    input.invocation.spell.id,
  );
  if (
    activeEffect === undefined ||
    activeEffect.objectState.kind !== "notHeld"
  ) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Spell-created held object can no longer be re-evoked.",
    );
  }
  const spent = spendActivationResource(
    input.input.state.currentTurnResources,
    {
      kind: "bonusAction",
    },
  );
  if (Either.isLeft(spent)) {
    return invalidResult(
      input.input.state,
      "staleSubject",
      "Bonus Action spell-created held object re-evocation is no longer available.",
    );
  }
  const reEvoked = setSpellCreatedHeldObjectState({
    state: { ...input.input.state, currentTurnResources: spent.right },
    actorId: input.actorId,
    effect: activeEffect,
    objectState: { kind: "held" },
  });
  if (reEvoked.tag === "invalid") {
    return invalidResult(input.input.state, "staleSubject", reEvoked.message);
  }
  return {
    tag: "resolved",
    state: reEvoked.state,
    snapshot: snapshotBattle(reEvoked.state),
  };
}

function spellCreatedHeldObjectHandStateError(
  state: BattleState,
  actorId: CombatantId,
  fillSet: OkSpellFillSet,
  options: {
    readonly allowSpellCastReactionFacts: boolean;
    readonly unrelatedFillsMessage: string;
  },
): {
  readonly reason: "invalidFill" | "staleSubject";
  readonly message: string;
} | null {
  if (
    spellCreatedHeldObjectHasUnrelatedFills(fillSet) ||
    (!options.allowSpellCastReactionFacts &&
      fillSet.reactionSpellTargetFacts.length > 0)
  ) {
    return { reason: "invalidFill", message: options.unrelatedFillsMessage };
  }
  if (!spellCreatedHeldObjectHasFreeHand(state, actorId)) {
    return {
      reason: "staleSubject",
      message: "Spell-created held object requires a free hand.",
    };
  }
  return null;
}

function spellCreatedHeldObjectHasUnrelatedFills(
  fillSet: OkSpellFillSet,
): boolean {
  return (
    fillSet.targetId !== undefined ||
    fillSet.objectTarget !== undefined ||
    fillSet.targetSpatialFacts.length > 0 ||
    fillSet.targetAllocation !== undefined ||
    fillSet.targetList !== undefined ||
    fillSet.attackSequencePartFills.some(
      (attackSequencePartFill) =>
        attackSequencePartFill.target !== undefined ||
        attackSequencePartFill.attackRoll !== undefined ||
        attackSequencePartFill.mirrorImageDuplicateRoll !== undefined ||
        attackSequencePartFill.damageRoll !== undefined,
    ) ||
    fillSet.attackRoll !== undefined ||
    fillSet.savingThrowOutcomes !== undefined ||
    fillSet.skillChoice !== undefined ||
    fillSet.abilityChoice !== undefined ||
    fillSet.thaumaturgyActiveOneMinuteEffectCount !== undefined ||
    fillSet.commandOptionChoice !== undefined ||
    fillSet.selfTransformationModeChoice !== undefined ||
    fillSet.conditionChoice !== undefined ||
    fillSet.areaChoice !== undefined ||
    fillSet.teleportDestination !== undefined ||
    fillSet.dancingLightsPlacement !== undefined ||
    fillSet.damageTypeChoice !== undefined ||
    fillSet.concentrationSavingThrows.length > 0 ||
    fillSet.hideousLaughterDamageRepeatSaves.length > 0 ||
    fillSet.damageDispositions.length > 0 ||
    fillSet.damageRoll !== undefined ||
    fillSet.mirrorImageDuplicateRoll !== undefined ||
    fillSet.movement !== undefined ||
    fillSet.spellDamageReductionRolls.length > 0 ||
    fillSet.attackBurstDamageRoll !== undefined ||
    fillSet.healingRoll !== undefined
  );
}

const SpellCreatedHeldObjectInvocationSchema = spellProcedureInvocationSchema<
  Extract<
    SupportedSpellInvocation,
    { readonly procedure: "spellCreatedHeldObject" }
  >
>(
  Schema.Struct({
    access: PreparedSpellAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
    procedure: Schema.Literal("spellCreatedHeldObject"),
    spell: BattleRuntimeObjectSchema,
    actionCost: Schema.Literal("bonusAction"),
    activeEffect: BattleRuntimeObjectSchema,
  }),
);

const SpellCreatedHeldObjectAttackInvocationSchema =
  spellProcedureInvocationSchema<
    Extract<
      SupportedSpellInvocation,
      { readonly procedure: "spellCreatedHeldObjectAttack" }
    >
  >(
    Schema.Struct({
      access: SpellEffectSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("spellCreatedHeldObjectAttack"),
      spell: BattleRuntimeObjectSchema,
      targeting: Schema.Struct({
        kind: Schema.Literal("singleCombatant"),
      }),
      damage: Schema.Struct({
        expr: BattleRuntimeObjectSchema,
        damageType: DamageTypeSchema,
      }),
      rangeFeet: MovementFeet,
      attackKind: Schema.Literal("melee_spell_attack"),
      attackBonus: AttackBonus,
      activeEffect: BattleRuntimeObjectSchema,
    }),
  );

const SpellCreatedHeldObjectReEvokeInvocationSchema =
  spellProcedureInvocationSchema<
    Extract<
      SupportedSpellInvocation,
      { readonly procedure: "spellCreatedHeldObjectReEvoke" }
    >
  >(
    Schema.Struct({
      access: SpellEffectSpellAccessSchema,
      resource: NoSpellInvocationResourceSchema,
      procedure: Schema.Literal("spellCreatedHeldObjectReEvoke"),
      spell: BattleRuntimeObjectSchema,
      actionCost: Schema.Literal("bonusAction"),
      activeEffect: BattleRuntimeObjectSchema,
    }),
  );
export const spellCreatedHeldObjectProfile: SpellProcedureProfile<
  "spellCreatedHeldObject",
  SpellCreatedHeldObjectInvocation,
  BonusActionSpellBattleResolutionInput
> = {
  procedure: "spellCreatedHeldObject",
  invocationSchema: SpellCreatedHeldObjectInvocationSchema,
  metamagicCompatibility: "notActionSpellCasting",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitSpellCreatedHeldObject,
  discoverCastAct: discoverSpellCreatedHeldObjectCastAct,
  castSummary: spellCreatedHeldObjectCastSummary,
  invocationRef: spellCreatedHeldObjectInvocationRef,
  resolve: resolveSpellCreatedHeldObject,
};

export const spellCreatedHeldObjectAttackProfile: SpellProcedureProfile<
  "spellCreatedHeldObjectAttack",
  SpellCreatedHeldObjectAttackInvocation,
  ActionSpellBattleResolutionInput
> = {
  procedure: "spellCreatedHeldObjectAttack",
  invocationSchema: SpellCreatedHeldObjectAttackInvocationSchema,
  metamagicCompatibility: "notActionSpellCasting",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitSpellCreatedHeldObjectAttack,
  discoverCastAct: discoverSpellCreatedHeldObjectAttackCastAct,
  castSummary: spellCreatedHeldObjectAttackCastSummary,
  invocationRef: spellCreatedHeldObjectAttackInvocationRef,
  resolve: resolveSpellCreatedHeldObjectAttack,
};

export const spellCreatedHeldObjectReEvokeProfile: SpellProcedureProfile<
  "spellCreatedHeldObjectReEvoke",
  SpellCreatedHeldObjectReEvokeInvocation,
  BonusActionSpellBattleResolutionInput
> = {
  procedure: "spellCreatedHeldObjectReEvoke",
  invocationSchema: SpellCreatedHeldObjectReEvokeInvocationSchema,
  metamagicCompatibility: "notActionSpellCasting",
  targetListInvocation: { kind: "none" },
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitSpellCreatedHeldObjectReEvoke,
  discoverCastAct: discoverSpellCreatedHeldObjectReEvokeCastAct,
  castSummary: spellCreatedHeldObjectReEvokeCastSummary,
  invocationRef: spellCreatedHeldObjectReEvokeInvocationRef,
  resolve: resolveSpellCreatedHeldObjectReEvoke,
};
