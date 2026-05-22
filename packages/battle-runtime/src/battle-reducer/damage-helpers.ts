// By-type damage math helpers extracted from battle-reducer.ts.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-warding-bond-linked-effect
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-creature-size-change
// KERNEL-COVERAGE: runtime-owner BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION
// Cluster N (damage_helpers). Mechanical extraction — no behavior change.
// Consumes only G (creature_state) and W (statblock_attacks).

import { DieRollResult, type DamageType } from "@dnd/shared/types";
import {
  holeId,
  holeInstanceKey,
  type AttackRollResult,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  rolledDiceTotal,
  validateRolledDiceForDiceExpr,
} from "@dnd/shared-algebras/runtime-dice-algebra";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Match } from "effect";
import type { CombatantId } from "../identity.ts";
import type {
  CharacterWeaponAttackActionOption,
  SupportedAttackActionOption,
} from "../battle-action-options.ts";
import type { OngoingFeatureDamageModifier } from "../unit-feature-support.ts";
import {
  type AttackDamageRider,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleRolledDiceFill,
  type BattleSpellDamageReductionRollHole,
  type SpellDamageReductionFill,
  type SpellDamageReductionRoll,
  type SpellMarkedDamageRider,
  type SpellAttackDamageComponent,
  type SpellWeaponDamageRider,
} from "../battle-reducer.ts";
import {
  activeOngoingFeatureOccurrencesForCombatant,
  ongoingFeatureProfileForSourceKey,
} from "./creature-state.ts";
import { combatantHasWardingBondResistance } from "./warding-bond.ts";
import {
  attackDamageComponents,
  attackDamageModifier,
} from "./statblock-attacks.ts";
import { attackAbilityMatchesModifier } from "./attack-roll.ts";
import {
  activeCreatureSizeChangeEffect,
  creatureSizeChangeAttackDamageComponent,
} from "./creature-size-change-effects.ts";

export type DamageAmountByTypeEntry = {
  readonly damageType: DamageType;
  readonly amount: number;
};

export function fixedAttackDamageAmount(
  attacker: BattleCreatureState | undefined,
  target: BattleCreatureState,
  attack: SupportedAttackActionOption,
): number | null {
  const entries = fixedAttackDamageByTypeEntries(attacker, attack);
  return entries === null
    ? null
    : damageAmountByTypeAfterTargetAdjustments(
        target,
        damageAmountByTypeEntriesToMap(entries),
      );
}

export function fixedAttackDamageByTypeEntries(
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
): readonly DamageAmountByTypeEntry[] | null {
  return Match.value(attack).pipe(
    Match.when({ kind: "unarmedStrike" }, (unarmedStrike) => {
      if (unarmedStrike.effect.damage.kind !== "base") {
        return null;
      }
      return [
        {
          damageType: unarmedStrike.effect.damage.damageType,
          amount: Math.max(
            0,
            attackDamageModifier(attack) +
              ongoingFeatureDamageModifier(attacker, attack),
          ),
        },
      ];
    }),
    Match.when({ kind: "weapon" }, () => null),
    Match.when({ kind: "statBlockAttack" }, () => null),
    Match.exhaustive,
  );
}

export function attackDamageByTypeEntries(
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
  damageRoll: BattleRolledDiceFill,
  critical: boolean,
  attackRoll?: AttackRollResult,
  attackDamageRiders: readonly AttackDamageRider[] = [],
  spellWeaponDamageRiders: readonly SpellAttackDamageComponent[] = [],
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
): readonly DamageAmountByTypeEntry[] {
  return [
    ...attackDamageByType(
      attacker,
      attack,
      damageRoll,
      critical,
      attackRoll,
      attackDamageRiders,
      spellWeaponDamageRiders,
      spellMarkedDamageRiders,
    ),
  ].map(([damageType, amount]) => ({ damageType, amount }));
}

export function attackDamageByType(
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
  damageRoll: BattleRolledDiceFill,
  critical: boolean,
  attackRoll?: AttackRollResult,
  attackDamageRiders: readonly AttackDamageRider[] = [],
  spellWeaponDamageRiders: readonly SpellAttackDamageComponent[] = [],
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
): ReadonlyMap<DamageType, number> {
  const components = attackDamageComponents(
    attack,
    critical,
    attackRoll,
    attackDamageRiders,
    spellWeaponDamageRiders,
    spellMarkedDamageRiders,
  );
  const fixedBaseDamageEntries = fixedAttackDamageByTypeEntries(
    attacker,
    attack,
  );
  const damageByType = damageRoll.value.reduce<ReadonlyMap<DamageType, number>>(
    (totals, group, index) => {
      const component = components[index];
      if (component === undefined) {
        return totals;
      }
      const diceTotal = group.results.reduce(
        (groupTotal, dieResult) => groupTotal + Number(dieResult),
        0,
      );
      const modifier =
        fixedBaseDamageEntries === null && index === 0
          ? attackDamageModifier(attack) +
            ongoingFeatureDamageModifier(attacker, attack)
          : 0;
      if (component.operation === "subtract") {
        return totals;
      }
      const unadjusted = diceTotal + modifier;
      return addDamageAmountForType(totals, component.damageType, unadjusted);
    },
    damageAmountByTypeEntriesToMap(fixedBaseDamageEntries ?? []),
  );
  const reducedDamageByType = damageRoll.value.reduce<
    ReadonlyMap<DamageType, number>
  >((totals, group, index) => {
    const component = components[index];
    if (component === undefined || component.operation !== "subtract") {
      return totals;
    }
    const diceTotal = group.results.reduce(
      (groupTotal, dieResult) => groupTotal + Number(dieResult),
      0,
    );
    return subtractDamageAmountForType({
      totals,
      amount: diceTotal,
      minimumDamageTotal: component.minimumDamageTotal ?? 0,
    });
  }, damageByType);
  return clampMinimumDamageTotal(reducedDamageByType, components);
}

export function damageAmountByTypeEntriesToMap(
  entries: readonly DamageAmountByTypeEntry[],
): ReadonlyMap<DamageType, number> {
  return entries.reduce<ReadonlyMap<DamageType, number>>(
    (totals, entry) =>
      addDamageAmountForType(totals, entry.damageType, entry.amount),
    new Map(),
  );
}

function clampMinimumDamageTotal(
  damageByType: ReadonlyMap<DamageType, number>,
  components: readonly {
    readonly damageType: DamageType;
    readonly minimumDamageTotal?: 1;
  }[],
): ReadonlyMap<DamageType, number> {
  const minimumComponent = components.find(
    (component) => component.minimumDamageTotal !== undefined,
  );
  const minimumTotal = minimumComponent?.minimumDamageTotal;
  if (minimumComponent === undefined || minimumTotal === undefined) {
    return damageByType;
  }
  const total = [...damageByType.values()].reduce(
    (sum, amount) => sum + amount,
    0,
  );
  if (total >= minimumTotal) {
    return damageByType;
  }
  return addDamageAmountForType(
    damageByType,
    minimumComponent.damageType,
    minimumTotal - total,
  );
}

function subtractDamageAmountForType(input: {
  readonly totals: ReadonlyMap<DamageType, number>;
  readonly amount: number;
  readonly minimumDamageTotal: number;
}): ReadonlyMap<DamageType, number> {
  const currentTotal = [...input.totals.values()].reduce(
    (sum, amount) => sum + Math.max(0, amount),
    0,
  );
  const maximumReduction = Math.max(
    0,
    currentTotal - input.minimumDamageTotal,
  );
  const remainingReduction = Math.min(
    Math.max(0, input.amount),
    maximumReduction,
  );
  if (remainingReduction === 0) {
    return input.totals;
  }
  return damageAmountByTypeEntriesToMap(
    entriesAfterProportionalDamageReduction(
      damageAmountByTypeMapEntries(input.totals),
      remainingReduction,
    ),
  );
}

export function damageAmountByTypeMapEntries(
  damageByType: ReadonlyMap<DamageType, number>,
): readonly DamageAmountByTypeEntry[] {
  return [...damageByType].map(([damageType, amount]) => ({
    damageType,
    amount,
  }));
}

const SPELL_DAMAGE_REDUCTION_ROLL_HOLE_PREFIX =
  "battle:spell-damage-reduction-roll";
const SPELL_ATTACK_SEQUENCE_PART_DAMAGE_REDUCTION_ROLL_HOLE_PREFIX =
  "battle:spell:attack-sequence-part-damage-reduction-roll";

export function isSpellDamageReductionRollFill(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): boolean {
  return (
    fill.holeId.startsWith(SPELL_DAMAGE_REDUCTION_ROLL_HOLE_PREFIX) ||
    fill.holeId.startsWith(SPELL_ATTACK_SEQUENCE_PART_DAMAGE_REDUCTION_ROLL_HOLE_PREFIX)
  );
}

export function spellDamageReductionRollProtocolId(
  reduction: Omit<SpellDamageReductionRoll, "amount">,
): string {
  return [
    SPELL_DAMAGE_REDUCTION_ROLL_HOLE_PREFIX,
    reduction.sourceSpellId,
    reduction.sourceCombatantId,
    reduction.targetId,
    reduction.damageType,
  ].join(":");
}

export function spellDamageReductionRollHole(
  reduction: SpellDamageReductionRoll,
): BattleSpellDamageReductionRollHole {
  const protocolId = spellDamageReductionRollProtocolId(reduction);
  return {
    kind: "rolledDice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: "Resistance damage reduction (1d4)",
    spellDamageReduction: reduction,
  };
}

export function availableSpellDamageReduction(
  target: BattleCreatureState,
  damageByType: ReadonlyMap<DamageType, number>,
): SpellDamageReductionRoll | null {
  const effect = target.activeEffects.find(
    (candidate) =>
      candidate.kind === "spellDamageReduction" &&
      !candidate.usedThisTurn &&
      (damageByType.get(candidate.damageType) ?? 0) > 0,
  );
  return effect?.kind === "spellDamageReduction"
    ? {
        sourceSpellId: effect.sourceSpellId,
        sourceCombatantId: effect.sourceCombatantId,
        targetId: target.combatantId,
        damageType: effect.damageType,
        amount: effect.amount,
      }
    : null;
}

export function spellDamageReductionRollForTarget(
  rolls: readonly Extract<BattleFill, { readonly kind: "rolledDice" }>[],
  target: BattleCreatureState,
): Extract<BattleFill, { readonly kind: "rolledDice" }> | undefined {
  return rolls.find((roll) => roll.holeId.includes(`:${target.combatantId}:`));
}

export function applyAvailableSpellDamageReduction(
  target: BattleCreatureState,
  damageByType: ReadonlyMap<DamageType, number>,
  roll: Extract<BattleFill, { readonly kind: "rolledDice" }> | undefined,
  rollHoleForReduction: (
    reduction: SpellDamageReductionRoll,
  ) => BattleSpellDamageReductionRollHole = spellDamageReductionRollHole,
):
  | {
      readonly tag: "ok";
      readonly target: BattleCreatureState;
      readonly damageByType: ReadonlyMap<DamageType, number>;
    }
  | { readonly tag: "needsHoles"; readonly holes: readonly BattleHole[] }
  | { readonly tag: "invalid" } {
  const reduction = availableSpellDamageReduction(target, damageByType);
  const reductionHole =
    reduction === null ? null : rollHoleForReduction(reduction);
  if (roll === undefined) {
    return reduction === null
      ? { tag: "ok", target, damageByType }
      : { tag: "needsHoles", holes: [rollHoleForReduction(reduction)] };
  }
  if (reduction === null || reductionHole === null || roll.holeId !== reductionHole.holeId) {
    return { tag: "invalid" };
  }
  const validation = validateRolledDiceForDiceExpr(roll.value, {
    dice: reduction.amount.dice,
    dieSize: reduction.amount.dieSize,
  });
  if (validation !== null) {
    return { tag: "invalid" };
  }
  const applied = applySpellDamageReductions(target, damageByType, [
    {
      sourceSpellId: reduction.sourceSpellId,
      sourceCombatantId: reduction.sourceCombatantId,
      targetId: reduction.targetId,
      damageType: reduction.damageType,
      roll: DieRollResult(rolledDiceTotal(roll.value)),
    },
  ]);
  return applied;
}

export function applySpellDamageReductions(
  target: BattleCreatureState,
  damageByType: ReadonlyMap<DamageType, number>,
  reductions: readonly SpellDamageReductionFill[],
):
  | {
      readonly tag: "ok";
      readonly target: BattleCreatureState;
      readonly damageByType: ReadonlyMap<DamageType, number>;
    }
  | { readonly tag: "invalid" } {
  if (reductions.length === 0) {
    return { tag: "ok", target, damageByType };
  }
  if (reductions.length !== 1) {
    return { tag: "invalid" };
  }
  const reduction = reductions[0];
  if (reduction === undefined || reduction.targetId !== target.combatantId) {
    return { tag: "invalid" };
  }
  const effectIndex = target.activeEffects.findIndex(
    (effect) =>
      effect.kind === "spellDamageReduction" &&
      effect.sourceSpellId === reduction.sourceSpellId &&
      effect.sourceCombatantId === reduction.sourceCombatantId &&
      effect.damageType === reduction.damageType &&
      !effect.usedThisTurn,
  );
  const effect = target.activeEffects[effectIndex];
  if (
    effect?.kind !== "spellDamageReduction" ||
    !Number.isInteger(Number(reduction.roll)) ||
    Number(reduction.roll) < effect.amount.dice ||
    Number(reduction.roll) > effect.amount.dice * effect.amount.dieSize ||
    (damageByType.get(reduction.damageType) ?? 0) <= 0
  ) {
    return { tag: "invalid" };
  }
  const reducedDamageByType = new Map(damageByType).set(
    reduction.damageType,
    Math.max(
      0,
      (damageByType.get(reduction.damageType) ?? 0) - Number(reduction.roll),
    ),
  );
  const activeEffects = target.activeEffects.map((candidate, index) =>
    index === effectIndex && candidate.kind === "spellDamageReduction"
      ? { ...candidate, usedThisTurn: true }
      : candidate,
  );
  return {
    tag: "ok",
    target: { ...target, activeEffects },
    damageByType: reducedDamageByType,
  };
}

export function entriesAfterProportionalDamageReduction(
  entries: readonly DamageAmountByTypeEntry[],
  reduction: number,
): readonly DamageAmountByTypeEntry[] {
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0);
  const totalReduction = Math.min(total, Math.max(0, reduction));
  if (total === 0 || totalReduction === 0) {
    return entries;
  }
  const allocations = entries.map((entry, index) => {
    const exact = (entry.amount * totalReduction) / total;
    const base = Math.floor(exact);
    return { index, base, remainder: exact - base };
  });
  const baseTotal = allocations.reduce(
    (sum, allocation) => sum + allocation.base,
    0,
  );
  const bonusIndexes = new Set(
    [...allocations]
      .sort(
        (left, right) =>
          right.remainder - left.remainder || left.index - right.index,
      )
      .slice(0, totalReduction - baseTotal)
      .map((allocation) => allocation.index),
  );
  return entries.map((entry, index) => ({
    ...entry,
    amount:
      entry.amount -
      (allocations[index]!.base + (bonusIndexes.has(index) ? 1 : 0)),
  }));
}

export function ongoingFeatureDamageModifier(
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
): number {
  if (attacker === undefined || attack.kind !== "weapon") {
    return 0;
  }
  return [...activeOngoingFeatureOccurrencesForCombatant(attacker)].reduce(
    (total, [key]) => {
      const profile = ongoingFeatureProfileForSourceKey(attacker, key);
      if (profile === null) return total;
      return (
        total +
        profile.damageModifiers.reduce(
          (ongoingFeatureTotal, modifier) =>
            ongoingFeatureTotal +
            (ongoingFeatureDamageModifierApplies(modifier, attack)
              ? modifier.amount
              : 0),
          0,
        )
      );
    },
    0,
  );
}

export function activeSpellWeaponDamageRiders(
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
): readonly SpellAttackDamageComponent[] {
  if (attacker === undefined) {
    return [];
  }
  const spellWeaponDamageRiders =
    attack.kind === "weapon"
      ? attacker.activeEffects.filter(
          (effect): effect is SpellWeaponDamageRider =>
            effect.kind === "spellWeaponDamageRider",
        )
      : [];
  const sizeChangeEffect =
    attack.kind === "weapon" || attack.kind === "unarmedStrike"
      ? activeCreatureSizeChangeEffect(attacker)
      : null;
  const sizeChangeDamage: readonly SpellAttackDamageComponent[] =
    sizeChangeEffect === null
      ? []
      : [creatureSizeChangeAttackDamageComponent(sizeChangeEffect, attack)];
  return [...spellWeaponDamageRiders, ...sizeChangeDamage];
}

export function activeMarkedDamageRiderEffect(
  attacker: BattleCreatureState | undefined,
  spellId?: SpellRecord["id"],
): SpellMarkedDamageRider | null {
  const effects =
    attacker?.activeEffects.filter(
      (effect): effect is SpellMarkedDamageRider =>
        effect.kind === "spellMarkedDamageRider" &&
        (spellId === undefined || effect.sourceSpellId === spellId),
    ) ?? [];
  return effects[0] ?? null;
}

export function activeMarkedDamageRiders(
  attacker: BattleCreatureState | undefined,
  targetId: CombatantId,
): readonly SpellMarkedDamageRider[] {
  return (
    attacker?.activeEffects.filter(
      (effect): effect is SpellMarkedDamageRider =>
        effect.kind === "spellMarkedDamageRider" &&
        effect.targetCombatantId === targetId,
    ) ?? []
  );
}

export function ongoingFeatureDamageModifierApplies(
  modifier: OngoingFeatureDamageModifier,
  attack: CharacterWeaponAttackActionOption,
): boolean {
  return (
    attackAbilityMatchesModifier(attack, modifier) &&
    (modifier.weaponUsageFilter === undefined ||
      modifier.weaponUsageFilter === attack.weapon.usage)
  );
}

export function addDamageAmountForType(
  totals: ReadonlyMap<DamageType, number>,
  damageType: DamageType,
  amount: number,
): ReadonlyMap<DamageType, number> {
  return new Map(totals).set(
    damageType,
    (totals.get(damageType) ?? 0) + amount,
  );
}

export function damageAmountByTypeAfterTargetAdjustments(
  target: BattleCreatureState,
  damageByType: ReadonlyMap<DamageType, number>,
): number {
  return [...damageByType].reduce(
    (total, [damageType, amount]) =>
      total + damageAmountAfterTargetAdjustments(target, amount, damageType),
    0,
  );
}

export function damageAmountAfterTargetAdjustments(
  target: BattleCreatureState,
  amount: number,
  damageType: DamageType,
): number {
  if (target.origin.kind !== "statBlock") {
    return targetHasRuntimeDamageResistance(target, damageType)
      ? Math.floor(amount / 2)
      : amount;
  }

  const statBlock = target.origin.statBlock.statBlock;
  if (statBlock.immunities?.damageTypes?.includes(damageType) === true) {
    return 0;
  }

  const afterResistance =
    targetHasRuntimeDamageResistance(target, damageType) ||
    (statBlock.resistances?.kind === "fixed" &&
      statBlock.resistances.damageTypes.includes(damageType))
      ? Math.floor(amount / 2)
      : amount;

  return statBlock.vulnerabilities?.damageTypes.includes(damageType) === true
    ? afterResistance * 2
    : afterResistance;
}

function targetHasRuntimeDamageResistance(
  target: BattleCreatureState,
  damageType: DamageType,
): boolean {
  return (
    target.activeEffects.some(
      (effect) =>
        effect.kind === "damageResistance" &&
        effect.damageType === damageType,
    ) ||
    combatantHasWardingBondResistance(target) ||
    [...activeOngoingFeatureOccurrencesForCombatant(target)].some(
      ([key]) =>
        ongoingFeatureProfileForSourceKey(target, key)?.resistances.includes(
          damageType,
        ) === true,
    )
  );
}
