// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-warding-bond-linked-effect
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-creature-size-change
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.attack-damage-die-floor
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.light-extra-attack-damage-ability-modifier
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.passive-damage-resistance
// KERNEL-COVERAGE: runtime-owner BATTLE.DAMAGE.TYPE_CHOICE_AND_REDUCTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.LINKED_EFFECT_DAMAGE_SHARING
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.RAY_OF_ENFEEBLEMENT_DAMAGE_PENALTY
// KERNEL-COVERAGE: runtime-owner BATTLE.SPELL.CREATURE_SIZE_CHANGE_LIFECYCLE
// KERNEL-COVERAGE: runtime-owner BATTLE.PROTOCOL.HOLE_FRONTIER_ORDERING
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.ATTACK_CONTROL
import { DieRollResult, type DamageType } from "@dnd/shared/types";
import {
  holeId,
  holeInstanceKey,
  type AttackRollResult,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import { rolledDiceTotal } from "@dnd/shared-algebras/runtime-dice-algebra";
import { Match } from "effect";
import type {
  BattleActiveEffectExecutionRef,
  BattleProcedureExecutionRef,
  CombatantId,
} from "../identity.ts";
import type {
  CharacterUnarmedStrikeActionOption,
  CharacterWeaponAttackActionOption,
  SupportedAttackActionOption,
} from "../battle-action-options.ts";
import {
  ATTACK_DAMAGE_DIE_FLOOR_MINIMUM_RESULT,
  type OngoingFeatureDamageModifier,
} from "../unit-feature-execution-constants.ts";
import {
  type AttackDamageRider,
  type BattleCreatureState,
  type BattleState,
  type BattleFill,
  type BattleHole,
  type BattleRolledDiceFill,
  type BattleSpellDamageReductionRollHole,
  type BattleSourceDamageRollPenaltyRollHole,
  type SpellDamageReductionRoll,
  type SpellMarkedDamageRider,
  type SpellAttackDamageComponent,
  type SpellWeaponDamageRider,
  type SourceDamageRollPenaltyRoll,
  validateRolledDiceFillForDiceExpr,
} from "../battle-state-execution.ts";
import {
  activeOngoingFeatureOccurrencesForCombatant,
  ongoingFeatureProfileForSourceKey,
} from "./creature-state-execution.ts";
import { combatantHasWardingBondResistance } from "./warding-bond.ts";
import {
  attackDamageComponents,
  attackDamageModifier,
  eligibleAttackDamageDieFloorProcedureRefsForAttacker,
  selectedAttackDamageDieFloorChoice,
  statBlockAttackDamage,
} from "./statblock-attacks.ts";
import { selectedAttackDamageAbilityModifierChoice } from "./attack-damage-ability-modifier-choice.ts";
import {
  activeCreatureSizeChangeEffect,
  creatureSizeChangeAttackDamageComponent,
} from "./creature-size-change-effects.ts";

export type DamageAmountByTypeEntry = {
  readonly damageType: DamageType;
  readonly amount: number;
};

export function fixedAttackDamageAmount(
  state: BattleState,
  attacker: BattleCreatureState | undefined,
  target: BattleCreatureState,
  attack: SupportedAttackActionOption,
  attackRoll?: AttackRollResult,
): number | null {
  const entries = fixedAttackDamageByTypeEntries(
    state,
    attacker,
    attack,
    attackRoll,
  );
  return entries === null
    ? null
    : damageAmountByTypeAfterTargetAdjustments(
        state,
        target,
        damageAmountByTypeEntriesToMap(entries),
      );
}

export function fixedAttackDamageByTypeEntries(
  state: BattleState,
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
  attackRoll?: AttackRollResult,
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
              ongoingFeatureDamageModifier(state, attacker, attack),
          ),
        },
      ];
    }),
    Match.when({ kind: "weapon" }, () => null),
    Match.when({ kind: "statBlockAttack" }, (statBlockAttack) => {
      if (statBlockAttack.damageNotation !== "static") {
        return null;
      }
      const damage = statBlockAttackDamage(statBlockAttack);
      const baseStaticDamage = damage.baseComponents.map((component) => ({
        damageType: component.damageType,
        amount: Math.max(0, component.static),
      }));
      const advantageBonus =
        damage.advantageBonus !== undefined &&
        attackRoll?.rollMode === "advantage"
          ? damage.advantageBonus
          : undefined;
      return [
        ...baseStaticDamage,
        ...(advantageBonus === undefined
          ? []
          : [
              {
                damageType: advantageBonus.damageType,
                amount: Math.max(0, advantageBonus.static),
              },
            ]),
      ];
    }),
    Match.exhaustive,
  );
}

export function attackDamageByTypeEntries(
  state: BattleState,
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
  attackProcedureRef: BattleProcedureExecutionRef,
  damageRoll: BattleRolledDiceFill,
  critical: boolean,
  attackRoll?: AttackRollResult,
  attackDamageRiders: readonly AttackDamageRider[] = [],
  spellWeaponDamageRiders: readonly SpellAttackDamageComponent[] = [],
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
): readonly DamageAmountByTypeEntry[] {
  return [
    ...attackDamageByType(
      state,
      attacker,
      attack,
      attackProcedureRef,
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
  state: BattleState,
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
  attackProcedureRef: BattleProcedureExecutionRef,
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
    state,
    attacker,
    attack,
    attackRoll,
  );
  const damageDieFloorMinimum = attackDamageDieFloorMinimum(
    attacker,
    attack,
    attackProcedureRef,
    damageRoll.attackDamageDieFloorChoice,
  );
  const damageByType = damageRoll.value.reduce<ReadonlyMap<DamageType, number>>(
    (totals, group, index) => {
      const component = components[index];
      if (component === undefined) {
        return totals;
      }
      const diceTotal = group.results.reduce(
        (groupTotal, dieResult) =>
          groupTotal + attackDamageDieResult(dieResult, damageDieFloorMinimum),
        0,
      );
      const modifier =
        fixedBaseDamageEntries === null && index === 0
          ? attackDamageModifier(attack) +
            selectedAttackDamageAbilityModifier(attack, damageRoll) +
            ongoingFeatureDamageModifier(state, attacker, attack)
          : 0;
      if (component.operation === "subtract") {
        return totals;
      }
      const unadjusted = diceTotal + (component.expr.flat ?? 0) + modifier;
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

function selectedAttackDamageAbilityModifier(
  attack: SupportedAttackActionOption,
  damageRoll: BattleRolledDiceFill,
): number {
  const offeredChoice =
    attack.kind === "weapon"
      ? attack.attackDamageAbilityModifierChoice
      : undefined;
  const selectedChoice = selectedAttackDamageAbilityModifierChoice(
    offeredChoice,
    damageRoll.attackDamageAbilityModifierChoice,
  );
  if (
    offeredChoice === undefined ||
    selectedChoice === null ||
    selectedChoice.selection !== "apply"
  ) {
    return 0;
  }
  return (
    Number(offeredChoice.appliedDamageAbilityModifier) -
    Number(offeredChoice.declinedDamageAbilityModifier)
  );
}

function attackDamageDieFloorMinimum(
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
  attackProcedureRef: BattleProcedureExecutionRef,
  choice: BattleRolledDiceFill["attackDamageDieFloorChoice"],
): typeof ATTACK_DAMAGE_DIE_FLOOR_MINIMUM_RESULT | null {
  const selectedChoice = selectedAttackDamageDieFloorChoice(
    eligibleAttackDamageDieFloorProcedureRefsForAttacker(
      attacker,
      attack,
      attackProcedureRef,
    ),
    choice,
  );
  if (selectedChoice?.selection !== "apply") {
    return null;
  }
  return ATTACK_DAMAGE_DIE_FLOOR_MINIMUM_RESULT;
}

function attackDamageDieResult(
  dieResult: DieRollResult,
  floorMinimum: typeof ATTACK_DAMAGE_DIE_FLOOR_MINIMUM_RESULT | null,
): number {
  const result = Number(dieResult);
  return floorMinimum === null ? result : Math.max(result, floorMinimum);
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
  const maximumReduction = Math.max(0, currentTotal - input.minimumDamageTotal);
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
const SOURCE_DAMAGE_ROLL_PENALTY_ROLL_HOLE_PREFIX =
  "battle:source-damage-roll-penalty-roll";
const SPELL_ATTACK_SEQUENCE_PART_DAMAGE_REDUCTION_ROLL_HOLE_PREFIX =
  "battle:spell:attack-sequence-part-damage-reduction-roll";

export function isSpellDamageReductionRollFill(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): boolean {
  return (
    fill.holeId.startsWith(SPELL_DAMAGE_REDUCTION_ROLL_HOLE_PREFIX) ||
    fill.holeId.startsWith(
      SPELL_ATTACK_SEQUENCE_PART_DAMAGE_REDUCTION_ROLL_HOLE_PREFIX,
    )
  );
}

export function isSourceDamageRollPenaltyRollFill(
  fill: Extract<BattleFill, { readonly kind: "rolledDice" }>,
): boolean {
  return fill.holeId.startsWith(SOURCE_DAMAGE_ROLL_PENALTY_ROLL_HOLE_PREFIX);
}

export type SpellDamageReductionIdentity = Omit<
  SpellDamageReductionRoll,
  "amount"
>;

export function spellDamageReductionRollProtocolId(
  reduction: SpellDamageReductionIdentity,
): string {
  return [
    SPELL_DAMAGE_REDUCTION_ROLL_HOLE_PREFIX,
    reduction.sourceProcedureRef,
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

export function sourceDamageRollPenaltyRollProtocolId(
  penalty: Omit<SourceDamageRollPenaltyRoll, "amount">,
): string {
  return [
    SOURCE_DAMAGE_ROLL_PENALTY_ROLL_HOLE_PREFIX,
    penalty.sourceProcedureRef,
    penalty.sourceCombatantId,
    penalty.affectedCombatantId,
    penalty.damageRollHoleId,
  ].join(":");
}

export function sourceDamageRollPenaltyRollHole(
  penalty: SourceDamageRollPenaltyRoll,
): BattleSourceDamageRollPenaltyRollHole {
  const protocolId = sourceDamageRollPenaltyRollProtocolId(penalty);
  return {
    kind: "rolledDice",
    holeId: holeId(protocolId),
    holeInstanceKey: holeInstanceKey(protocolId),
    label: "Source damage roll penalty (1d8)",
    sourceDamageRollPenalty: penalty,
  };
}

export function availableSpellDamageReduction(
  target: BattleCreatureState,
  damageByType: ReadonlyMap<DamageType, number>,
): SpellDamageReductionRoll | null {
  const available = availableSpellDamageReductionEffect(target, damageByType);
  if (available === null) {
    return null;
  }
  return spellDamageReductionRollForAvailable(target, available);
}

type AvailableSpellDamageReduction = {
  readonly effectIndex: number;
  readonly effect: Extract<
    BattleCreatureState["activeEffects"][number],
    { readonly kind: "spellDamageReduction" }
  >;
};

export type SpellDamageReductionConsumption =
  | { readonly kind: "none" }
  | {
      readonly kind: "spellDamageReduction";
      readonly identity: SpellDamageReductionIdentity;
    };

export function applySpellDamageReductionConsumption(
  target: BattleCreatureState,
  consumption: SpellDamageReductionConsumption,
): BattleCreatureState {
  if (consumption.kind === "none") {
    return target;
  }
  if (target.combatantId !== consumption.identity.targetId) {
    throw new Error(
      "Resolved spell damage reduction must belong to its application target.",
    );
  }
  const effectIndex = target.activeEffects.findIndex(
    (candidate) =>
      candidate.kind === "spellDamageReduction" &&
      candidate.sourceProcedureRef ===
        consumption.identity.sourceProcedureRef &&
      candidate.sourceCombatantId === consumption.identity.sourceCombatantId &&
      candidate.damageType === consumption.identity.damageType,
  );
  const effect = target.activeEffects[effectIndex];
  if (effect?.kind !== "spellDamageReduction") {
    return target;
  }
  if (effect.usedThisTurn) {
    return target;
  }
  return {
    ...target,
    activeEffects: target.activeEffects.map((candidate, index) =>
      index === effectIndex ? { ...effect, usedThisTurn: true } : candidate,
    ),
  };
}

function spellDamageReductionRollForAvailable(
  target: BattleCreatureState,
  available: AvailableSpellDamageReduction,
): SpellDamageReductionRoll {
  return {
    ...spellDamageReductionIdentityForAvailable(target, available),
    amount: available.effect.amount,
  };
}

function spellDamageReductionIdentityForAvailable(
  target: BattleCreatureState,
  available: AvailableSpellDamageReduction,
): SpellDamageReductionIdentity {
  const { effect } = available;
  return {
    sourceProcedureRef: effect.sourceProcedureRef,
    sourceCombatantId: effect.sourceCombatantId,
    targetId: target.combatantId,
    damageType: effect.damageType,
  };
}

function availableSpellDamageReductionEffect(
  target: BattleCreatureState,
  damageByType: ReadonlyMap<DamageType, number>,
): AvailableSpellDamageReduction | null {
  const effectIndex = target.activeEffects.findIndex(
    (candidate) =>
      candidate.kind === "spellDamageReduction" &&
      !candidate.usedThisTurn &&
      (damageByType.get(candidate.damageType) ?? 0) > 0,
  );
  const effect = target.activeEffects[effectIndex];
  return effect?.kind === "spellDamageReduction"
    ? { effectIndex, effect }
    : null;
}

export function availableSourceDamageRollPenalty(
  source: BattleCreatureState | undefined,
  damageByType: ReadonlyMap<DamageType, number>,
  damageRollHoleId: SourceDamageRollPenaltyRoll["damageRollHoleId"],
): SourceDamageRollPenaltyRoll | null {
  if (
    source === undefined ||
    [...damageByType.values()].reduce((total, amount) => total + amount, 0) <= 0
  ) {
    return null;
  }
  const effect = source.activeEffects.find(
    (candidate) => candidate.kind === "sourceDamageRollPenalty",
  );
  return effect?.kind === "sourceDamageRollPenalty"
    ? {
        sourceProcedureRef: effect.sourceProcedureRef,
        sourceCombatantId: effect.sourceCombatantId,
        affectedCombatantId: source.combatantId,
        damageRollHoleId,
        amount: effect.amount,
      }
    : null;
}

export function spellDamageReductionRollForTarget(
  rolls: readonly Extract<BattleFill, { readonly kind: "rolledDice" }>[],
  target: BattleCreatureState,
  damageByType: ReadonlyMap<DamageType, number>,
): Extract<BattleFill, { readonly kind: "rolledDice" }> | undefined {
  const reduction = availableSpellDamageReduction(target, damageByType);
  if (reduction === null) {
    return undefined;
  }
  const expectedHoleId = spellDamageReductionRollHole(reduction).holeId;
  return rolls.find((roll) => roll.holeId === expectedHoleId);
}

export function sourceDamageRollPenaltyRollForDamageRoll(
  rolls: readonly Extract<BattleFill, { readonly kind: "rolledDice" }>[],
  source: BattleCreatureState | undefined,
  damageByType: ReadonlyMap<DamageType, number>,
  damageRollHoleId: SourceDamageRollPenaltyRoll["damageRollHoleId"],
): Extract<BattleFill, { readonly kind: "rolledDice" }> | undefined {
  const penalty = availableSourceDamageRollPenalty(
    source,
    damageByType,
    damageRollHoleId,
  );
  return penalty === null
    ? undefined
    : rolls.find(
        (roll) =>
          roll.holeId === sourceDamageRollPenaltyRollHole(penalty).holeId,
      );
}

export function sourceDamageRollPenaltyRollHoleForDamageRoll(
  source: BattleCreatureState | undefined,
  damageByType: ReadonlyMap<DamageType, number>,
  damageRollHoleId: SourceDamageRollPenaltyRoll["damageRollHoleId"],
): BattleSourceDamageRollPenaltyRollHole | null {
  const penalty = availableSourceDamageRollPenalty(
    source,
    damageByType,
    damageRollHoleId,
  );
  return penalty === null ? null : sourceDamageRollPenaltyRollHole(penalty);
}

export function unexpectedSourceDamageRollPenaltyRoll(
  rolls: readonly Extract<BattleFill, { readonly kind: "rolledDice" }>[],
  expectedHoles: readonly BattleSourceDamageRollPenaltyRollHole[],
): Extract<BattleFill, { readonly kind: "rolledDice" }> | undefined {
  const expectedHoleIds = new Set(expectedHoles.map((hole) => hole.holeId));
  return rolls.find((roll) => !expectedHoleIds.has(roll.holeId));
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
      readonly consumption: SpellDamageReductionConsumption;
    }
  | { readonly tag: "needsHoles"; readonly holes: readonly BattleHole[] }
  | { readonly tag: "invalid" } {
  const available = availableSpellDamageReductionEffect(target, damageByType);
  if (roll === undefined) {
    if (available === null) {
      return {
        tag: "ok",
        target,
        damageByType,
        consumption: { kind: "none" },
      };
    }
    return {
      tag: "needsHoles",
      holes: [
        rollHoleForReduction(
          spellDamageReductionRollForAvailable(target, available),
        ),
      ],
    };
  }
  if (available === null) {
    return { tag: "invalid" };
  }
  const reduction = spellDamageReductionRollForAvailable(target, available);
  const reductionHole = rollHoleForReduction(reduction);
  if (roll.holeId !== reductionHole.holeId) {
    return { tag: "invalid" };
  }
  const validation = validateRolledDiceFillForDiceExpr(roll, {
    dice: reduction.amount.dice,
    dieSize: reduction.amount.dieSize,
  });
  if (validation !== null) {
    return { tag: "invalid" };
  }
  const rolledReduction = DieRollResult(rolledDiceTotal(roll.value));
  const reducedDamageByType = new Map(damageByType).set(
    reduction.damageType,
    Math.max(
      0,
      (damageByType.get(reduction.damageType) ?? 0) - Number(rolledReduction),
    ),
  );
  const activeEffects = target.activeEffects.map((candidate, index) =>
    index === available.effectIndex
      ? { ...available.effect, usedThisTurn: true }
      : candidate,
  );
  return {
    tag: "ok",
    target: { ...target, activeEffects },
    damageByType: reducedDamageByType,
    consumption: {
      kind: "spellDamageReduction",
      identity: spellDamageReductionIdentityForAvailable(target, available),
    },
  };
}

export function applyAvailableSourceDamageRollPenalty(
  source: BattleCreatureState | undefined,
  damageByType: ReadonlyMap<DamageType, number>,
  damageRollHoleId: SourceDamageRollPenaltyRoll["damageRollHoleId"],
  roll: Extract<BattleFill, { readonly kind: "rolledDice" }> | undefined,
  rollHoleForPenalty: (
    penalty: SourceDamageRollPenaltyRoll,
  ) => BattleSourceDamageRollPenaltyRollHole = sourceDamageRollPenaltyRollHole,
):
  | {
      readonly tag: "ok";
      readonly damageByType: ReadonlyMap<DamageType, number>;
    }
  | { readonly tag: "needsHoles"; readonly holes: readonly BattleHole[] }
  | { readonly tag: "invalid" } {
  const penalty = availableSourceDamageRollPenalty(
    source,
    damageByType,
    damageRollHoleId,
  );
  const penaltyHole = penalty === null ? null : rollHoleForPenalty(penalty);
  if (roll === undefined) {
    return penalty === null
      ? { tag: "ok", damageByType }
      : { tag: "needsHoles", holes: [rollHoleForPenalty(penalty)] };
  }
  if (
    penalty === null ||
    penaltyHole === null ||
    roll.holeId !== penaltyHole.holeId
  ) {
    return { tag: "invalid" };
  }
  const validation = validateRolledDiceFillForDiceExpr(roll, {
    dice: penalty.amount.dice,
    dieSize: penalty.amount.dieSize,
  });
  if (validation !== null) {
    return { tag: "invalid" };
  }
  const reducedEntries = entriesAfterProportionalDamageReduction(
    damageAmountByTypeMapEntries(damageByType),
    rolledDiceTotal(roll.value),
  );
  return {
    tag: "ok",
    damageByType: damageAmountByTypeEntriesToMap(reducedEntries),
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
  state: BattleState,
  attacker: BattleCreatureState | undefined,
  attack: SupportedAttackActionOption,
): number {
  if (
    attacker === undefined ||
    (attack.kind !== "weapon" && attack.kind !== "unarmedStrike")
  ) {
    return 0;
  }
  return [
    ...activeOngoingFeatureOccurrencesForCombatant(state, attacker),
  ].reduce((total, [key]) => {
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
  }, 0);
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
  effectRef: BattleActiveEffectExecutionRef,
): SpellMarkedDamageRider | null {
  return (
    attacker?.activeEffects.find(
      (effect): effect is SpellMarkedDamageRider =>
        effect.kind === "spellMarkedDamageRider" &&
        effect.effectRef === effectRef,
    ) ?? null
  );
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
  attack:
    | CharacterWeaponAttackActionOption
    | CharacterUnarmedStrikeActionOption,
): boolean {
  const ability =
    attack.kind === "weapon" ? attack.ability : attack.attackAbility;
  const abilityMatches =
    modifier.abilityFilter === undefined ||
    (ability !== "spellcasting" && modifier.abilityFilter.includes(ability));
  return (
    abilityMatches &&
    (modifier.weaponUsageFilter === undefined ||
      (attack.kind === "weapon" &&
        modifier.weaponUsageFilter === attack.weapon.usage))
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
  state: BattleState,
  target: BattleCreatureState,
  damageByType: ReadonlyMap<DamageType, number>,
): number {
  return [...damageByType].reduce(
    (total, [damageType, amount]) =>
      total +
      damageAmountAfterTargetAdjustments(state, target, amount, damageType),
    0,
  );
}

export function damageAmountAfterTargetAdjustments(
  state: BattleState,
  target: BattleCreatureState,
  amount: number,
  damageType: DamageType,
): number {
  if (target.origin.kind !== "statBlock") {
    return targetHasRuntimeDamageResistance(state, target, damageType)
      ? Math.floor(amount / 2)
      : amount;
  }

  const statBlock = target.origin.mechanics;
  if (statBlock.immunities.damageTypes.includes(damageType)) {
    return 0;
  }

  const afterResistance =
    targetHasRuntimeDamageResistance(state, target, damageType) ||
    statBlock.resistances.includes(damageType)
      ? Math.floor(amount / 2)
      : amount;

  return statBlock.vulnerabilities.includes(damageType)
    ? afterResistance * 2
    : afterResistance;
}

function targetHasRuntimeDamageResistance(
  state: BattleState,
  target: BattleCreatureState,
  damageType: DamageType,
): boolean {
  return (
    target.activeEffects.some(
      (effect) =>
        effect.kind === "damageResistance" && effect.damageType === damageType,
    ) ||
    combatantHasWardingBondResistance(target) ||
    characterExecutionGrantsPassiveDamageResistance(target, damageType) ||
    [...activeOngoingFeatureOccurrencesForCombatant(state, target)].some(
      ([key]) =>
        ongoingFeatureProfileForSourceKey(target, key)?.resistances.includes(
          damageType,
        ) === true,
    )
  );
}

function characterExecutionGrantsPassiveDamageResistance(
  target: BattleCreatureState,
  damageType: DamageType,
): boolean {
  return (
    target.origin.kind === "character" &&
    target.origin.execution.procedureBindings.some((binding) => {
      const procedure = binding.procedure;
      return (
        procedure.kind === "unitSupportProfile" &&
        typeof procedure.execution === "object" &&
        procedure.execution.kind === "passiveDamageResistance" &&
        procedure.execution.resistance.damageType.value === damageType
      );
    })
  );
}
