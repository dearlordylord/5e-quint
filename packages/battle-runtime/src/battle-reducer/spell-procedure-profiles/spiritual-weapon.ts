// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-spiritual-weapon-attack-proxy
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.PROCEDURE_PROFILE_SEMANTICS
//
// The Spiritual Weapon profile family: a prepared Bonus Action spell creates a
// spell-owned spectral force attack proxy, and later Bonus Actions move the
// force and repeat the melee Spell Attack.
//
// RAW anchors:
//   - .references/srd-5.2.1/Spells/Descriptions-S-Z.md "Spiritual Weapon":
//     Bonus Action; 60 feet; Concentration up to 1 minute; spectral force
//     appears in a chosen space; immediate melee Spell Attack against one
//     creature within 5 feet of the force; Force damage 1d8 plus spellcasting
//     ability modifier; later-turn Bonus Action moves up to 20 feet and repeats
//     the attack; higher-level slots add 1d8 per slot level above 2.
//   - UBIQUITOUS_LANGUAGE.md: Bonus Action, Spell Attack, Attack Roll, Damage
//     Roll, Damage Type, Spell Slot, Spell Invocation, and Spell Effect.
//
// What lives here: shape admission, active-effect repeat admission, discovery,
// cast summaries, invocation references, and the profile-owned resolve entry.
//
// What stays in shared infrastructure: the attack/damage resolver body remains
// in spells-resolve.ts because ordinary spell attacks, held-light hurls,
// spell-created held-object attacks, object-contact repeats, and Spiritual
// Weapon attacks share one target, attack-roll, damage, reaction, reduction,
// and concentration-save lifecycle.

import { elapsedTimeTicksFromTimeSpanDuration } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  attackBonus,
  movementFeet,
  type AbilityModifier,
  type ProficiencyBonus as ProficiencyBonusType,
} from "@dnd/shared/types";
import { spellInvocationSchemaUnavailable } from "./profile.ts";
import type {
  Attachment,
  DiceAmount,
  DiceExpr,
  DiceExprDelta,
  EffectAtom,
  SpellRecord,
} from "@dnd/surface/surface/types";
import { Either } from "effect";

import {
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleResolutionResult,
  type BattleState,
  type BonusActionSpellBattleResolutionInput,
  type SupportedSpellInvocation,
} from "../../battle-reducer.ts";
import {
  type SpellInvocationRef,
  spellEffectInvocationRef,
} from "../../battle-subjects.ts";
import { spellId, type CombatantId } from "../../identity.ts";
import { antimagicFieldOngoingSpellEffectRefForActiveEffect } from "../antimagic-field-suppression.ts";
import {
  spiritualWeaponForcePositionHole,
  spellTargetHole,
} from "../spells-targeting.ts";
import { resolveBonusActionSpellAttackProxyAct } from "../spells-resolve.ts";
import { supportedDamageAmountExpr } from "../spells-profile-shared.ts";
import type {
  SpellAdmissionContext,
  SpellProcedureProfile,
  SpellProcedureProfileResolveInput,
} from "./profile.ts";
import {
  spellAdmissionBattleTurn,
  spellAdmissionOngoingSpellEffectSuppressed,
} from "./profile.ts";

type SpiritualWeaponAttackProxyInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spiritualWeaponAttackProxy" }
>;
type SpiritualWeaponRepeatAttackInvocation = Extract<
  SupportedSpellInvocation,
  { readonly procedure: "spiritualWeaponRepeatAttack" }
>;
type SpiritualWeaponInvocation =
  | SpiritualWeaponAttackProxyInvocation
  | SpiritualWeaponRepeatAttackInvocation;
type SpiritualWeaponResolveInput = SpellProcedureProfileResolveInput<
  SpiritualWeaponInvocation,
  BonusActionSpellBattleResolutionInput
>;
type LinearPerLevelDiceAmount = Extract<
  DiceAmount,
  { readonly kind: "linear_per_level" }
>;
type SupportedSpiritualWeaponDamageAmount = LinearPerLevelDiceAmount & {
  readonly axis: "slot";
  readonly base: DiceExpr & {
    readonly dice: 1;
    readonly dieSize: 8;
    readonly flat?: undefined;
    readonly spellcastingMod: true;
    readonly abilityModifier?: undefined;
  };
  readonly perLevel: DiceExprDelta & {
    readonly dice: 1;
    readonly dieSize: 8;
    readonly flat?: undefined;
  };
  readonly startingAtLevel: 2;
};
type SupportedSpiritualWeaponDamageEffect = Extract<
  EffectAtom,
  { readonly kind: "damage" }
> & {
  readonly damageType: "force";
  readonly amount: SupportedSpiritualWeaponDamageAmount;
};

function admitSpiritualWeaponAttackProxy(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly SpiritualWeaponAttackProxyInvocation[] {
  const proxy = spiritualWeaponSpell(spell);
  if (proxy === null) {
    return [];
  }
  const spellcasting = ctx.actor.origin.spellcasting;
  return spellcasting.spellSlots.flatMap(
    (slot): readonly SpiritualWeaponAttackProxyInvocation[] => {
      if (Number(slot.spellLevel) < spell.mechanics.level) {
        return [];
      }
      const damageExpr = supportedDamageAmountExpr({
        amount: proxy.damageAmount,
        spellLevel: spell.mechanics.level,
        slotLevel: slot.spellLevel,
      });
      if (damageExpr === null) {
        return [];
      }
      return [
        {
          access: { tag: "prepared" },
          resource: { tag: "spellSlot", slotLevel: slot.spellLevel },
          procedure: "spiritualWeaponAttackProxy",
          spell,
          actionCost: "bonusAction",
          targeting: { kind: "singleCombatant" },
          durationTicks: proxy.durationTicks,
          rangeFeet: movementFeet(proxy.rangeFeet),
          forceReachFeet: movementFeet(proxy.forceReachFeet),
          repeatMoveMaxFeet: movementFeet(proxy.repeatMoveMaxFeet),
          damage: {
            kind: "fixedSpellAttackDamage",
            expr: {
              ...damageExpr,
              flat: Number(spellcasting.spellcastingAbilityModifier),
            },
            damageType: "force",
          },
          attackKind: "melee_spell_attack",
          attackBonus: spiritualWeaponAttackBonus({
            spellcastingAbilityModifier:
              spellcasting.spellcastingAbilityModifier,
            proficiencyBonus: spellcasting.proficiencyBonus,
          }),
        },
      ];
    },
  );
}

function admitSpiritualWeaponRepeatAttack(
  spell: SpellRecord,
  ctx: SpellAdmissionContext,
): readonly SpiritualWeaponRepeatAttackInvocation[] {
  if (spiritualWeaponSpell(spell) === null) {
    return [];
  }
  return ctx.actor.activeEffects.flatMap(
    (effect): readonly SpiritualWeaponRepeatAttackInvocation[] => {
      if (
        effect.kind !== "spiritualWeapon" ||
        effect.sourceCombatantId !== ctx.actor.combatantId ||
        effect.sourceSpellId !== spell.id ||
        spellAdmissionOngoingSpellEffectSuppressed(
          ctx,
          antimagicFieldOngoingSpellEffectRefForActiveEffect(effect),
        ) ||
        !spiritualWeaponRepeatIsLaterTurn(effect, ctx)
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
          procedure: "spiritualWeaponRepeatAttack",
          spell,
          actionCost: "bonusAction",
          activeEffect: effect,
          targeting: { kind: "singleCombatant" },
          damage: effect.damage,
          attackKind: effect.attackKind,
          attackBonus: effect.attackBonus,
          forceReachFeet: effect.forceReachFeet,
          repeatMoveMaxFeet: effect.repeatMoveMaxFeet,
        },
      ];
    },
  );
}

function spiritualWeaponAttackBonus(input: {
  readonly spellcastingAbilityModifier: AbilityModifier;
  readonly proficiencyBonus: ProficiencyBonusType;
}) {
  return attackBonus(
    Number(input.spellcastingAbilityModifier) + Number(input.proficiencyBonus),
  );
}

function spiritualWeaponRepeatIsLaterTurn(
  effect: Extract<BattleActiveEffect, { readonly kind: "spiritualWeapon" }>,
  ctx: SpellAdmissionContext,
): boolean {
  const battleTurn = spellAdmissionBattleTurn(ctx);
  return (
    battleTurn !== undefined &&
    (battleTurn.currentActorId !== effect.startedOn.actorId ||
      battleTurn.round !== effect.startedOn.round)
  );
}

function spiritualWeaponSpell(spell: SpellRecord) {
  if (spell.mechanics.family !== "ongoing_effect") {
    return null;
  }
  const durationTicks =
    spell.mechanics.duration.kind === "concentration"
      ? elapsedTimeTicksFromTimeSpanDuration(spell.mechanics.duration.upTo)
      : null;
  const forceAttachment = spell.mechanics.attachment;
  const initialAttack = spell.mechanics.initialPhase;
  const [repeatOperation, ...extraOperations] = spell.mechanics.operations;
  const repeatEffects =
    repeatOperation?.effect.kind === "composite_ongoing"
      ? repeatOperation.effect.effects
      : [];
  const [reposition, repeatAttack, ...extraRepeatEffects] = repeatEffects;
  const initialHit =
    initialAttack?.kind === "attack_roll" ? initialAttack.onHit[0] : undefined;
  const initialMiss =
    initialAttack?.kind === "attack_roll" ? initialAttack.onMiss[0] : undefined;
  const repeatHit =
    repeatAttack?.kind === "attack_roll" ? repeatAttack.onHit[0] : undefined;
  const repeatMiss =
    repeatAttack?.kind === "attack_roll" ? repeatAttack.onMiss[0] : undefined;

  if (
    spell.mechanics.level !== 2 ||
    spell.mechanics.castingTime.kind !== "bonus_action" ||
    spell.mechanics.range.kind !== "point" ||
    spell.mechanics.range.feet !== 60 ||
    spell.mechanics.duration.kind !== "concentration" ||
    spell.mechanics.duration.upTo.unit !== "minute" ||
    spell.mechanics.duration.upTo.amount !== 1 ||
    extraOperations.length !== 0 ||
    durationTicks === null ||
    Either.isLeft(durationTicks) ||
    forceAttachment.kind !== "hole" ||
    forceAttachment.value.kind !== "location" ||
    initialAttack?.kind !== "attack_roll" ||
    initialAttack.attackKind !== "melee_spell_attack" ||
    initialAttack.attachment.kind !== "hole" ||
    !spiritualWeaponAttackTargetMatchesForce(
      initialAttack.attachment,
      forceAttachment.holeId,
    ) ||
    initialAttack.onHit.length !== 1 ||
    initialAttack.onMiss.length !== 1 ||
    !isSupportedSpiritualWeaponDamageEffect(initialHit) ||
    !isSupportedSpiritualWeaponMissEffect(initialMiss) ||
    repeatOperation?.trigger.kind !== "on_caster_spends_action" ||
    repeatOperation.trigger.cost.kind !== "bonus_action" ||
    repeatOperation.trigger.laterTurnsOnly !== true ||
    repeatOperation.predicate !== undefined ||
    repeatOperation.targetLimit !== undefined ||
    repeatOperation.usageLimit !== undefined ||
    repeatOperation.effect.kind !== "composite_ongoing" ||
    extraRepeatEffects.length !== 0 ||
    reposition?.kind !== "reposition_attachment" ||
    reposition.maxMoveFeet !== 20 ||
    repeatAttack?.kind !== "attack_roll" ||
    repeatAttack.attackKind !== "melee_spell_attack" ||
    !spiritualWeaponAttackTargetMatchesForce(
      repeatAttack.attachment,
      forceAttachment.holeId,
    ) ||
    repeatAttack.onHit.length !== 1 ||
    repeatAttack.onMiss.length !== 1 ||
    !isSupportedSpiritualWeaponDamageEffect(repeatHit) ||
    !isSupportedSpiritualWeaponMissEffect(repeatMiss) ||
    !sameSpiritualWeaponDamageEffect(initialHit, repeatHit)
  ) {
    return null;
  }
  return {
    durationTicks: durationTicks.right,
    rangeFeet: 60,
    forceReachFeet: 5,
    repeatMoveMaxFeet: reposition.maxMoveFeet,
    damageAmount: initialHit.amount,
  };
}

function isSupportedSpiritualWeaponDamageEffect(
  effect: EffectAtom | undefined,
): effect is SupportedSpiritualWeaponDamageEffect {
  if (effect?.kind !== "damage") {
    return false;
  }
  return (
    effect.damageType === "force" &&
    isSupportedSpiritualWeaponDamageAmount(effect.amount)
  );
}

function isSupportedSpiritualWeaponMissEffect(
  effect: EffectAtom | undefined,
): effect is Extract<EffectAtom, { readonly kind: "none" }> {
  return effect?.kind === "none";
}

function isSupportedSpiritualWeaponDamageAmount(
  amount: DiceAmount,
): amount is SupportedSpiritualWeaponDamageAmount {
  return (
    amount.kind === "linear_per_level" &&
    amount.axis === "slot" &&
    amount.startingAtLevel === 2 &&
    amount.base.dice === 1 &&
    amount.base.dieSize === 8 &&
    amount.base.flat === undefined &&
    amount.base.spellcastingMod === true &&
    amount.base.abilityModifier === undefined &&
    amount.perLevel.dice === 1 &&
    amount.perLevel.dieSize === 8 &&
    amount.perLevel.flat === undefined
  );
}

function sameSpiritualWeaponDamageEffect(
  left: SupportedSpiritualWeaponDamageEffect,
  right: SupportedSpiritualWeaponDamageEffect,
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
    left.amount.perLevel.flat === right.amount.perLevel.flat
  );
}

function spiritualWeaponAttackTargetMatchesForce(
  attachment: Attachment | undefined,
  forceHoleId: string,
): boolean {
  if (
    attachment?.kind !== "hole" ||
    attachment.value.kind !== "target" ||
    attachment.value.selection.mode !== "one" ||
    attachment.value.selection.targetKinds === undefined ||
    attachment.value.selection.targetKinds.length !== 1 ||
    attachment.value.selection.targetKinds[0] !== "creature"
  ) {
    return false;
  }
  const relativePosition =
    "relativePosition" in attachment.value.selection
      ? attachment.value.selection.relativePosition
      : undefined;
  return (
    relativePosition?.kind === "within_feet_of_attachment" &&
    relativePosition.attachmentHoleId === forceHoleId &&
    relativePosition.feet === 5
  );
}

function discoverSpiritualWeaponAttackProxyCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: SpiritualWeaponAttackProxyInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return targetHole.choices.length === 0
    ? []
    : [
        {
          subject: {
            tag: "bonusActionSpell" as const,
            actorId,
            invocation: spiritualWeaponAttackProxyInvocationRef(invocation),
            mode: { tag: "cast" as const },
          },
          label: invocation.spell.name,
          summary: `${spiritualWeaponAttackProxyCastSummary(invocation)} The table supplies the spectral force position and target adjacency.`,
          initialHoles: [
            spiritualWeaponForcePositionHole(invocation),
            targetHole,
          ],
        },
      ];
}

function discoverSpiritualWeaponRepeatAttackCastAct(
  state: BattleState,
  actorId: CombatantId,
  invocation: SpiritualWeaponRepeatAttackInvocation,
): readonly AvailableBattleAct[] {
  const targetHole = spellTargetHole(state, actorId, invocation);
  return targetHole.choices.length === 0
    ? []
    : [
        {
          subject: {
            tag: "bonusActionSpell" as const,
            actorId,
            invocation: spiritualWeaponRepeatAttackInvocationRef(invocation),
            mode: { tag: "cast" as const },
          },
          label: `${invocation.spell.name} attack`,
          summary: spiritualWeaponRepeatAttackCastSummary(invocation),
          initialHoles: [
            spiritualWeaponForcePositionHole(invocation),
            targetHole,
          ],
        },
      ];
}

function spiritualWeaponAttackProxyInvocationRef(
  invocation: SpiritualWeaponAttackProxyInvocation,
): SpellInvocationRef {
  return {
    tag: "spellSlot",
    spellId: spellId(invocation.spell.id),
    slotLevel: invocation.resource.slotLevel,
    procedure: "spiritualWeaponAttackProxy",
  };
}

function spiritualWeaponRepeatAttackInvocationRef(
  invocation: SpiritualWeaponRepeatAttackInvocation,
): SpellInvocationRef {
  return spellEffectInvocationRef(
    invocation.spell.id,
    invocation.activeEffect.sourceCombatantId,
    "spiritualWeaponRepeatAttack",
  );
}

function spiritualWeaponAttackProxyCastSummary(
  invocation: SpiritualWeaponAttackProxyInvocation,
): string {
  return `Cast ${invocation.spell.name} using a level ${invocation.resource.slotLevel} Spell Slot.`;
}

function spiritualWeaponRepeatAttackCastSummary(
  invocation: SpiritualWeaponRepeatAttackInvocation,
): string {
  return `Use a Bonus Action to move ${invocation.spell.name}'s force and repeat the attack.`;
}

function resolveSpiritualWeapon(
  input: SpiritualWeaponResolveInput,
): BattleResolutionResult {
  return resolveBonusActionSpellAttackProxyAct(input.input);
}

export const spiritualWeaponAttackProxyProfile: SpellProcedureProfile<
  "spiritualWeaponAttackProxy",
  SpiritualWeaponAttackProxyInvocation,
  BonusActionSpellBattleResolutionInput
> = {
  procedure: "spiritualWeaponAttackProxy",
  invocationSchema: spellInvocationSchemaUnavailable(),
  metamagicCompatibility: "actionSpellResolverNotRewritten",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitSpiritualWeaponAttackProxy,
  discoverCastAct: discoverSpiritualWeaponAttackProxyCastAct,
  castSummary: spiritualWeaponAttackProxyCastSummary,
  invocationRef: spiritualWeaponAttackProxyInvocationRef,
  resolve: resolveSpiritualWeapon,
};

export const spiritualWeaponRepeatAttackProfile: SpellProcedureProfile<
  "spiritualWeaponRepeatAttack",
  SpiritualWeaponRepeatAttackInvocation,
  BonusActionSpellBattleResolutionInput
> = {
  procedure: "spiritualWeaponRepeatAttack",
  invocationSchema: spellInvocationSchemaUnavailable(),
  metamagicCompatibility: "notActionSpellCasting",
  isTargetListInvocation: false,
  isReadiedSpellCompatible: false,
  knownWillingTargetSpellIds: [],
  admit: admitSpiritualWeaponRepeatAttack,
  discoverCastAct: discoverSpiritualWeaponRepeatAttackCastAct,
  castSummary: spiritualWeaponRepeatAttackCastSummary,
  invocationRef: spiritualWeaponRepeatAttackInvocationRef,
  resolve: resolveSpiritualWeapon,
};
