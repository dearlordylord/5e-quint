// Pure spell-effect expression helpers extracted from battle-reducer.ts.
// Cluster Q (spell_effects). Mechanical extraction — no behavior change.
// Consumed by clusters L (spells_resolve) and P (spells_holes_fills).

import { resourceCount, SpellSlotLevel } from "@dnd/shared/types";
import { rolledDiceTotal } from "@dnd/shared-algebras/runtime-dice-algebra";
import type { CombatantId } from "../identity.ts";
import {
  type BattleFill,
  type BattleState,
  type SpellMarkedDamageRider,
  type SupportedDamageSpellInvocation,
  type SupportedSpellInvocation,
} from "../battle-reducer.ts";
import {
  signedModifier,
  type AttackDamageComponent,
} from "./statblock-attacks.ts";

export function expendSpellSlot(
  state: BattleState,
  actorId: CombatantId,
  spellLevel: SpellSlotLevel,
): BattleState {
  const actor = state.combatants.get(actorId);
  if (
    actor?.origin.kind !== "character" ||
    actor.origin.spellcasting === undefined
  ) {
    return state;
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(actorId, {
      ...actor,
      origin: {
        ...actor.origin,
        spellcasting: {
          ...actor.origin.spellcasting,
          spellSlots: actor.origin.spellcasting.spellSlots.map((slot) =>
            slot.spellLevel === spellLevel && slot.expended < slot.count
              ? { ...slot, expended: resourceCount(Number(slot.expended) + 1) }
              : slot,
          ),
        },
      },
    }),
  };
}

export function spellDamageExpression(
  invocation: SupportedDamageSpellInvocation,
  critical = false,
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
): string {
  return spellDamageComponents(invocation, critical, spellMarkedDamageRiders)
    .map((component, index) => {
      const flat = index === 0 ? component.flat : 0;
      return `${component.expr.dice}d${component.expr.dieSize}${signedModifier(flat)}-${component.damageType}`;
    })
    .join("+");
}

export function spellDamageComponents(
  invocation: SupportedDamageSpellInvocation,
  critical = false,
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
): readonly (AttackDamageComponent & { readonly flat: number })[] {
  const baseDice =
    invocation.procedure === "repeatedDamageAllocation"
      ? invocation.damage.expr.dice * invocation.targeting.repeatedEffectCount
      : invocation.damage.expr.dice *
        ((invocation.procedure === "heldLightHurl" ||
          invocation.procedure === "spellAttackBeamSequence" ||
          invocation.procedure === "spellAttackDamage" ||
          invocation.procedure === "attackBurstSaveDamage") &&
        critical
          ? 2
          : 1);
  const baseFlat =
    (invocation.damage.expr.flat ?? 0) *
    (invocation.procedure === "repeatedDamageAllocation"
      ? invocation.targeting.repeatedEffectCount
      : 1);
  return [
    {
      expr: { dice: baseDice, dieSize: invocation.damage.expr.dieSize },
      damageType: invocation.damage.damageType,
      flat: baseFlat,
    },
    ...spellMarkedDamageRiders.map((rider) => ({
      expr: {
        ...rider.damage.expr,
        dice: critical ? rider.damage.expr.dice * 2 : rider.damage.expr.dice,
      },
      damageType: rider.damage.damageType,
      flat: 0,
    })),
  ];
}

export function spellBurstDamageExpression(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "attackBurstSaveDamage" }
  >,
): string {
  return `${invocation.burst.damage.expr.dice}d${invocation.burst.damage.expr.dieSize}${signedModifier(invocation.burst.damage.expr.flat ?? 0)}-${invocation.burst.damage.damageType}`;
}

export function spellHealingExpression(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "directHitPointRestoration" }
  >,
): string {
  return `${invocation.healing.expr.dice}d${invocation.healing.expr.dieSize}${signedModifier(invocation.healing.expr.flat ?? 0)}`;
}

export function scalarBuffTemporaryHitPointsExpression(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "scalarBuff" }
  >,
): string {
  return invocation.effect.kind === "temporaryHitPoints"
    ? `${invocation.effect.amount.expr.dice}d${invocation.effect.amount.expr.dieSize}${signedModifier(invocation.effect.amount.expr.flat ?? 0)}`
    : "0d1";
}

export function spellHealingAmount(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "directHitPointRestoration" }
  >,
  healingRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): number {
  const diceTotal = healingRoll.value.reduce(
    (total, group) =>
      total +
      group.results.reduce(
        (groupTotal, dieResult) => groupTotal + Number(dieResult),
        0,
      ),
    0,
  );
  return diceTotal + (invocation.healing.expr.flat ?? 0);
}

export function scalarBuffTemporaryHitPointsAmount(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "scalarBuff" }
  >,
  temporaryHitPointsRoll: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): number {
  if (invocation.effect.kind !== "temporaryHitPoints") {
    return 0;
  }
  return (
    rolledDiceTotal(temporaryHitPointsRoll.value) +
    (invocation.effect.amount.expr.flat ?? 0)
  );
}
