// Damage application + HP lifecycle + concentration helpers extracted from
// battle-reducer.ts. Cluster M (damage_apply). Mechanical extraction — no
// behavior change. Pass 9 also absorbs:
//   - breakBattleConcentration, breakBattleConcentrationAfterDamage,
//     resolveBattleConcentrationDamage (from H, cycle #10)
//   - applyTemporaryHitPoints (from H, cycle #13)
// Spell-condition expiration helpers live in spell-condition-effects-helpers.ts
// (cycle #19) so both M and P can import them without a cycle.

import { Match } from "effect";
import {
  DieRollResult,
  Hp,
  damageAmount as toDamageAmount,
  type DamageAmount,
} from "@dnd/shared/types";
import {
  applyCondition,
  removeCondition,
} from "@dnd/shared-algebras/conditions-algebra";
import {
  addDeathFailures,
  resetDeathSaveRuntimeState,
  resolveDeathSavingThrow,
} from "@dnd/shared-algebras/death-saves-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type { StatBlockRecord, UnitRecord } from "@dnd/surface/surface/types";
import type { ZeroHpLifecycle } from "../zero-hp-lifecycle.ts";
import type { CombatantId } from "../identity.ts";
import { KNOCKED_OUT_UNCONSCIOUS } from "../battle-init.ts";
import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
  type CharacterBattleResourceState,
} from "../character-battle-resources.ts";
import {
  parseSupportedUnitFeatureProfile,
} from "../unit-feature-support.ts";
import type {
  StatBlockMutableResourceState,
  StatBlockPartKey,
} from "../battle-action-options.ts";
import {
  CONCENTRATION_SAVING_THROW_HOLE_INSTANCE_PREFIX,
  DEATH_SAVING_THROW_HOLE_ID,
  DEATH_SAVING_THROW_HOLE_INSTANCE,
  STAT_BLOCK_RECHARGE_ROLL_HOLE_ID,
  STAT_BLOCK_RECHARGE_ROLL_HOLE_INSTANCE,
  type AttackDamageRider,
  type BattleActiveEffect,
  type BattleAttackDamageDisposition,
  type BattleConcentration,
  type BattleConcentrationSavingThrowHole,
  type BattleCreatureState,
  type BattleDeathSavingThrowHole,
  type BattleFill,
  type BattleReadiedSpell,
  type BattleState,
  type BattleStatBlockRechargeRollHole,
  type BattleStatBlockRechargeRollResult,
  type SpellMarkedDamageRider,
  type SpellWeaponDamageRider,
  type WeaponDamageDiceRollChoiceFill,
  type WeaponDamageDiceRollChoiceUsage,
} from "../battle-reducer.ts";
import { concentrationSavingThrowDc } from "./domain-helpers.ts";
import {
  combatantsAreAllies,
  normalizeBattleGrapples,
} from "./creature-state-leaves.ts";
import {
  battleCreatureStateWithDamageProjection,
  battleCreatureStateWithKnockOutPreservedConditions,
  battleCreatureStateWithoutKnockOut,
  knockedOutConditionState,
  knockedOutOneHp,
} from "./creature-state.ts";
import { zeroHpLifecycleIsTerminal } from "../battle-reducer.ts";
import {
  applySpellDamageReductions,
  attackDamageByType,
  damageAmountByTypeAfterTargetAdjustments,
} from "./damage-helpers.ts";
import {
  sameStatBlockPartKey,
  statBlockLimitedUseForPart,
} from "./statblock.ts";
import { conditionsAfterExpiringSpellConditionEffects } from "./spell-condition-effects-helpers.ts";
import type { AttackFillSet } from "../battle-reducer.ts";

export function breakBattleConcentration(
  state: BattleState,
  combatantId: CombatantId,
): BattleState {
  const concentration = state.combatants.get(combatantId)?.concentration;
  let readiedSpells: ReadonlyMap<CombatantId, BattleReadiedSpell> =
    state.readiedSpells;
  if (concentration?.effectKind === "readiedSpell") {
    const remainingReadiedSpells = new Map(state.readiedSpells);
    remainingReadiedSpells.delete(combatantId);
    readiedSpells = remainingReadiedSpells;
  }
  return {
    ...state,
    combatants: breakCombatantConcentration(state.combatants, combatantId),
    readiedSpells,
  };
}

export function breakBattleConcentrationAfterDamage(input: {
  readonly state: BattleState;
  readonly combatantId: CombatantId;
  readonly priorConcentration: BattleConcentration | null;
}): BattleState {
  const currentConcentration =
    input.state.combatants.get(input.combatantId)?.concentration ?? null;
  if (currentConcentration !== null) {
    return breakBattleConcentration(input.state, input.combatantId);
  }
  if (input.priorConcentration?.effectKind === "spellEffect") {
    return {
      ...input.state,
      combatants: breakCombatantConcentration(
        input.state.combatants,
        input.combatantId,
        input.priorConcentration,
      ),
    };
  }
  if (input.priorConcentration?.effectKind !== "readiedSpell") {
    return input.state;
  }
  const readiedSpells = new Map(input.state.readiedSpells);
  readiedSpells.delete(input.combatantId);
  return { ...input.state, readiedSpells };
}

export function resolveBattleConcentrationDamage(input: {
  readonly state: BattleState;
  readonly combatantId: CombatantId;
  readonly damageAmount: number;
  readonly savingThrowSucceeded: boolean;
}): BattleState {
  const combatant = input.state.combatants.get(input.combatantId);
  if (
    combatant?.concentration === null ||
    combatant === undefined ||
    input.damageAmount <= 0 ||
    input.savingThrowSucceeded
  ) {
    return input.state;
  }
  return breakBattleConcentration(input.state, input.combatantId);
}

export function applyTemporaryHitPoints(
  combatant: BattleCreatureState,
  temporaryHitPoints: number,
): BattleCreatureState {
  return {
    ...combatant,
    tempHp: Hp(Math.max(Number(combatant.tempHp), temporaryHitPoints)),
  };
}

export function applyAttackDamage(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  attack: import("../battle-action-options.ts").SupportedAttackActionOption,
  fillSet: Extract<AttackFillSet, { readonly tag: "ok" }>,
  critical: boolean,
  attackDamageRiders: readonly AttackDamageRider[] = [],
  spellWeaponDamageRiders: readonly SpellWeaponDamageRider[] = [],
  spellMarkedDamageRiders: readonly SpellMarkedDamageRider[] = [],
): BattleState {
  if (fillSet.damageRoll == null) {
    return state;
  }

  const target = state.combatants.get(targetId);
  if (target == null) {
    return state;
  }
  const reduction = applySpellDamageReductions(
    target,
    attackDamageByType(
      state.combatants.get(attackerId),
      attack,
      fillSet.damageRoll,
      critical,
      fillSet.attackRoll,
      attackDamageRiders,
      spellWeaponDamageRiders,
      spellMarkedDamageRiders,
    ),
    [],
  );
  if (reduction.tag === "invalid") {
    return state;
  }
  const damageAmount = damageAmountByTypeAfterTargetAdjustments(
    reduction.target,
    reduction.damageByType,
  );
  const damagedTarget = reduction.target;
  const damaged = applyHpDamage(damagedTarget, damageAmount, {
    deathFailuresAtZeroHp: critical ? 2 : 1,
    damageDisposition: fillSet.damageDisposition,
  });
  const combatants = new Map(state.combatants).set(targetId, damaged);

  const nextState = {
    ...state,
    combatants,
  };
  const afterMarkDrop = markMarkedDamageRiderTransferAvailable(
    nextState,
    targetId,
    target.hp,
    damaged.hp,
  );
  const concentrated =
    fillSet.concentrationSavingThrow?.value.succeeded === false ||
    (target.concentration !== null && damaged.concentration === null)
      ? breakBattleConcentrationAfterDamage({
          state: afterMarkDrop,
          combatantId: targetId,
          priorConcentration: target.concentration,
        })
      : afterMarkDrop;
  return normalizeBattleGrapples(
    recordAttackDamageUnitsUsed(concentrated, attackDamageRiders),
  );
}

export function applyAttackDamageAmount(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
  damageAmount: DamageAmount,
  deathFailuresAtZeroHp: 1 | 2,
  damageDisposition: BattleAttackDamageDisposition,
  attackDamageRiders: readonly AttackDamageRider[],
  weaponDamageDiceRollChoice?: WeaponDamageDiceRollChoiceFill,
  concentrationSavingThrow?: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target == null) {
    return state;
  }
  const damaged = applyHpDamage(target, Number(damageAmount), {
    deathFailuresAtZeroHp,
    damageDisposition,
  });
  const combatants = new Map(state.combatants).set(targetId, damaged);
  const nextState = {
    ...state,
    combatants,
  };
  const afterMarkDrop = markMarkedDamageRiderTransferAvailable(
    nextState,
    targetId,
    target.hp,
    damaged.hp,
  );
  const concentrated =
    Number(damageAmount) > 0 &&
    (concentrationSavingThrow?.value.succeeded === false ||
      (target.concentration !== null && damaged.concentration === null))
      ? breakBattleConcentrationAfterDamage({
          state: afterMarkDrop,
          combatantId: targetId,
          priorConcentration: target.concentration,
        })
      : afterMarkDrop;
  const afterDamageEscapes =
    Number(damageAmount) > 0
      ? removeSpellConditionEffectsFromTargetDamagedByCasterOrAllyAttack(
          concentrated,
          attackerId,
          targetId,
        )
      : concentrated;
  return normalizeBattleGrapples(
    recordAttackDamageUnitsUsed(
      afterDamageEscapes,
      attackDamageRiders.map((rider) => ({ ...rider, attackerId })),
      weaponDamageDiceRollChoice === undefined
        ? []
        : [{ attackerId, unitId: weaponDamageDiceRollChoice.unitId }],
    ),
  );
}

export function recordAttackDamageUnitsUsed(
  state: BattleState,
  attackDamageRiders: readonly AttackDamageRider[],
  weaponDamageDiceRollChoices: readonly WeaponDamageDiceRollChoiceUsage[] = [],
): BattleState {
  if (
    attackDamageRiders.length === 0 &&
    weaponDamageDiceRollChoices.length === 0
  ) {
    return state;
  }
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      attackDamageRidersUsedThisTurn: [
        ...state.currentTurnResources.attackDamageRidersUsedThisTurn,
        ...attackDamageRiders.map((rider) => ({
          attackerId: rider.attackerId,
          unitId: rider.unitId,
        })),
      ],
      weaponDamageDiceRollChoicesUsedThisTurn: [
        ...state.currentTurnResources.weaponDamageDiceRollChoicesUsedThisTurn,
        ...weaponDamageDiceRollChoices,
      ],
    },
  };
}

export function markMarkedDamageRiderTransferAvailable(
  state: BattleState,
  targetId: CombatantId,
  priorHp: Hp,
  nextHp: Hp,
): BattleState {
  if (priorHp <= 0 || nextHp !== 0) {
    return state;
  }
  const combatants = new Map(state.combatants);
  let changed = false;
  for (const [combatantId, combatant] of combatants) {
    const activeEffects = combatant.activeEffects.map((effect) =>
      effect.kind === "spellMarkedDamageRider" &&
      effect.targetCombatantId === targetId &&
      !effect.transferAvailable
        ? { ...effect, transferAvailable: true }
        : effect,
    );
    if (
      activeEffects.some(
        (effect, index) => effect !== combatant.activeEffects[index],
      )
    ) {
      changed = true;
      combatants.set(combatantId, { ...combatant, activeEffects });
    }
  }
  return changed ? { ...state, combatants } : state;
}

export function removeSpellConditionEffectsFromTargetDamagedByCasterOrAllyAttack(
  state: BattleState,
  attackerId: CombatantId,
  targetId: CombatantId,
): BattleState {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    return state;
  }
  const expiring = target.activeEffects.filter(
    (
      effect,
    ): effect is Extract<
      BattleActiveEffect,
      { readonly kind: "spellCondition" }
    > =>
      effect.kind === "spellCondition" &&
      effect.escape?.kind === "targetDamagedByCasterOrAlly" &&
      combatantsAreAllies(state, attackerId, effect.sourceCombatantId),
  );
  if (expiring.length === 0) {
    return state;
  }
  const activeEffects = target.activeEffects.filter(
    (effect) => !expiring.includes(effect),
  );
  const nextCombatant: BattleCreatureState =
    target.positiveHpUnconscious === null
      ? {
          ...target,
          activeEffects,
          conditions: conditionsAfterExpiringSpellConditionEffects(
            target.conditions,
            activeEffects,
            expiring,
          ),
        }
      : { ...target, activeEffects };
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, nextCombatant),
  };
}

type BattleDamageContext = {
  readonly deathFailuresAtZeroHp: 1 | 2;
  readonly damageDisposition?: BattleAttackDamageDisposition;
};

export function applyHpDamage(
  combatant: BattleCreatureState,
  damageAmount: number,
  context: BattleDamageContext,
): BattleCreatureState {
  const projection = hpDamageProjection(combatant, damageAmount);
  if (projection.effectiveDamage <= 0 || zeroHpLifecycleIsTerminal(combatant)) {
    return combatant;
  }

  const damaged = battleCreatureStateWithDamageProjection(
    combatant,
    projection,
  );

  if (projection.currentHp <= 0) {
    return projection.massiveDamageKills
      ? applyInstantDeath(damaged)
      : applyDamageAtZeroHp(damaged, context);
  }

  if (Number(projection.nextHp) > 0) {
    return damaged;
  }

  if (context.damageDisposition?.kind === "knockOut") {
    return applyKnockOut(damaged);
  }

  if (
    context.damageDisposition?.kind === "zeroHitPointReplacement" &&
    zeroHitPointReplacementCanApply(
      combatant,
      projection,
      context.damageDisposition.unitId,
    )
  ) {
    return applyZeroHitPointReplacement(
      combatant,
      projection,
      context.damageDisposition.unitId,
    );
  }

  return projection.massiveDamageKills
    ? applyInstantDeath(damaged)
    : applyDropToZeroHpLifecycle(damaged);
}

import type { HpDamageProjection } from "../battle-reducer.ts";

export function hpDamageProjection(
  combatant: BattleCreatureState,
  damageAmount: number,
): HpDamageProjection {
  const effectiveDamage = Math.max(0, Math.floor(damageAmount));
  const currentTempHp = Number(combatant.tempHp);
  const currentHp = Number(combatant.hp);
  const tempHpAbsorbed = Math.min(currentTempHp, effectiveDamage);
  const hpDamage = effectiveDamage - tempHpAbsorbed;
  const nextHp = Hp(Math.max(0, currentHp - hpDamage));
  return {
    effectiveDamage,
    currentTempHp,
    tempHpAbsorbed,
    currentHp,
    hpDamage,
    nextHp,
    massiveDamageKills:
      hpDamage > 0 &&
      (currentHp <= 0 ? hpDamage : hpDamage - currentHp) >=
        Number(combatant.maxHp),
  };
}

export function damageAllowsKnockOut(
  combatant: BattleCreatureState,
  damageAmount: number,
): boolean {
  const projection = hpDamageProjection(combatant, damageAmount);
  return projection.currentHp > 0 && Number(projection.nextHp) === 0;
}

function zeroHitPointReplacementCanApply(
  combatant: BattleCreatureState,
  projection: HpDamageProjection,
  unitId: UnitRecord["id"],
): boolean {
  return (
    projection.currentHp > 0 &&
    Number(projection.nextHp) === 0 &&
    !projection.massiveDamageKills &&
    zeroHitPointReplacementResource(combatant, unitId) !== null
  );
}

export function zeroHitPointReplacementResource(
  combatant: BattleCreatureState,
  unitId: UnitRecord["id"],
): CharacterBattleResourceState | null {
  if (combatant.origin.kind !== "character") return null;
  const resource = combatant.origin.resources.find(
    (candidate) => candidate.unit.id === unitId,
  );
  if (resource === undefined || !resourceHasUsesRemaining(resource)) {
    return null;
  }
  const profile = parseSupportedUnitFeatureProfile(
    resource.unit,
    combatant.origin.classLevels,
  );
  return profile?.kind === "zeroHitPointReplacement" ? resource : null;
}

function applyZeroHitPointReplacement(
  combatant: BattleCreatureState,
  projection: HpDamageProjection,
  unitId: UnitRecord["id"],
): BattleCreatureState {
  const nextCombatant = {
    ...battleCreatureStateWithoutKnockOut(
      combatant,
      Hp(1),
      combatant.conditions,
    ),
    tempHp: Hp(projection.currentTempHp - projection.tempHpAbsorbed),
  };
  if (nextCombatant.origin.kind !== "character") {
    return nextCombatant;
  }
  return {
    ...nextCombatant,
    origin: {
      ...nextCombatant.origin,
      resources: nextCombatant.origin.resources.map((resource) =>
        resource.unit.id === unitId
          ? spendCharacterResourceUse(resource)
          : resource,
      ),
    },
  };
}

function battleCreatureStateWithKnockedOutUnconsciousFields(
  combatant: BattleCreatureState,
): BattleCreatureState {
  return {
    ...combatant,
    hp: knockedOutOneHp(),
    conditions: knockedOutConditionState(combatant.conditions),
    positiveHpUnconscious: KNOCKED_OUT_UNCONSCIOUS,
  };
}

function applyKnockOut(combatant: BattleCreatureState): BattleCreatureState {
  return battleCreatureStateWithKnockedOutUnconsciousFields(
    withoutConcentration(combatant),
  );
}

export function applyHpHealing(
  combatant: BattleCreatureState,
  healingAmount: number,
): BattleCreatureState {
  const effectiveHealing = Math.max(0, Math.floor(healingAmount));
  if (effectiveHealing <= 0 || zeroHpLifecycleIsTerminal(combatant)) {
    return combatant;
  }

  const currentHp = Number(combatant.hp);
  const nextHp = Hp(
    Math.min(Number(combatant.maxHp), currentHp + effectiveHealing),
  );
  const regainedHitPoints = Number(nextHp) > currentHp;
  if (currentHp <= 0 && Number(nextHp) > 0) {
    return {
      ...battleCreatureStateWithoutKnockOut(
        combatant,
        nextHp,
        removeCondition(combatant.conditions, "unconscious"),
      ),
      zeroHpLifecycle:
        combatant.zeroHpLifecycle.policy === "usesDeathSavingThrows"
          ? {
              ...combatant.zeroHpLifecycle,
              deathSaves: resetDeathSaveRuntimeState(),
            }
          : combatant.zeroHpLifecycle,
    };
  }
  if (regainedHitPoints && combatant.positiveHpUnconscious !== null) {
    return battleCreatureStateWithoutKnockOut(
      combatant,
      nextHp,
      removeCondition(combatant.conditions, "unconscious"),
    );
  }

  return regainedHitPoints
    ? battleCreatureStateWithoutKnockOut(
        combatant,
        nextHp,
        combatant.conditions,
      )
    : combatant;
}

export function applyInitialZeroHpLifecycle(
  combatant: BattleCreatureState,
): BattleCreatureState {
  if (Number(combatant.hp) > 0) {
    return combatant;
  }

  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () =>
      withoutConcentration(combatant),
    ),
    Match.when({ policy: "usesDeathSavingThrows" }, () => ({
      ...battleCreatureStateWithKnockOutPreservedConditions(
        combatant,
        applyCondition(combatant.conditions, "unconscious"),
      ),
    })),
    Match.exhaustive,
  );
}

function applyDropToZeroHpLifecycle(
  combatant: BattleCreatureState,
): BattleCreatureState {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () => ({
      ...battleCreatureStateWithoutKnockOut(
        withoutConcentration(combatant),
        combatant.hp,
        combatant.conditions,
      ),
    })),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      ...battleCreatureStateWithoutKnockOut(
        withoutConcentration(combatant),
        combatant.hp,
        applyCondition(combatant.conditions, "unconscious"),
      ),
      zeroHpLifecycle: {
        ...lifecycle,
        deathSaves: resetDeathSaveRuntimeState(),
      },
    })),
    Match.exhaustive,
  );
}

function applyDamageAtZeroHp(
  combatant: BattleCreatureState,
  context: BattleDamageContext,
): BattleCreatureState {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () => ({
      ...battleCreatureStateWithoutKnockOut(
        withoutConcentration(combatant),
        combatant.hp,
        combatant.conditions,
      ),
    })),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      ...battleCreatureStateWithoutKnockOut(
        withoutConcentration(combatant),
        combatant.hp,
        applyCondition(combatant.conditions, "unconscious"),
      ),
      zeroHpLifecycle: {
        ...lifecycle,
        deathSaves: addDeathFailures(
          lifecycle.deathSaves,
          context.deathFailuresAtZeroHp,
        ),
      },
    })),
    Match.exhaustive,
  );
}

export function startTurnDeathSavingThrowRequired(
  combatant: BattleCreatureState | undefined,
): combatant is BattleCreatureState & {
  readonly zeroHpLifecycle: Extract<
    ZeroHpLifecycle,
    { readonly policy: "usesDeathSavingThrows" }
  >;
} {
  return (
    combatant !== undefined &&
    Number(combatant.hp) === 0 &&
    combatant.zeroHpLifecycle.policy === "usesDeathSavingThrows" &&
    !combatant.zeroHpLifecycle.deathSaves.stable &&
    !combatant.zeroHpLifecycle.deathSaves.dead
  );
}

export function applyStartTurnDeathSavingThrow(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  roll: DieRollResult,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const combatant = combatants.get(actorId);
  if (!startTurnDeathSavingThrowRequired(combatant)) {
    return combatants;
  }

  const deathSaves = resolveDeathSavingThrow(
    combatant.zeroHpLifecycle.deathSaves,
    Number(roll),
  );
  const nextCombatant = {
    ...battleCreatureStateWithoutKnockOut(
      combatant,
      deathSaves.hpRegained ? Hp(1) : combatant.hp,
      deathSaves.hpRegained
        ? removeCondition(combatant.conditions, "unconscious")
        : combatant.conditions,
    ),
    zeroHpLifecycle: {
      ...combatant.zeroHpLifecycle,
      deathSaves,
    },
  };

  return new Map(combatants).set(actorId, nextCombatant);
}

export function deathSavingThrowHole(
  actorId: CombatantId,
): BattleDeathSavingThrowHole {
  return {
    kind: "deathSavingThrow",
    holeInstanceKey: DEATH_SAVING_THROW_HOLE_INSTANCE,
    holeId: DEATH_SAVING_THROW_HOLE_ID,
    label: "Death Saving Throw",
    combatantId: actorId,
  };
}

export function statBlockRechargeRollHole(
  combatant: BattleCreatureState | undefined,
): BattleStatBlockRechargeRollHole | null {
  if (combatant?.origin.kind !== "statBlock") return null;
  const rechargeTargets = unavailableRechargeTargets(
    combatant.origin.statBlock.statBlock,
    combatant.origin.resources,
  );
  if (rechargeTargets.length === 0) return null;
  return {
    kind: "statBlockRechargeRoll",
    holeInstanceKey: STAT_BLOCK_RECHARGE_ROLL_HOLE_INSTANCE,
    holeId: STAT_BLOCK_RECHARGE_ROLL_HOLE_ID,
    label: "Stat Block Recharge roll",
    combatantId: combatant.combatantId,
    rechargeTargets,
  };
}

export function unavailableRechargeTargets(
  statBlock: StatBlockRecord["statBlock"],
  resources: StatBlockMutableResourceState,
): readonly StatBlockPartKey[] {
  return resources.unavailableRechargeParts.filter(
    (key) => statBlockLimitedUseForPart(statBlock, key)?.kind === "recharge",
  );
}

export function processStatBlockRechargeRolls(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  rolls: readonly BattleStatBlockRechargeRollResult[],
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const combatant = combatants.get(actorId);
  if (combatant?.origin.kind !== "statBlock") return combatants;
  const statBlock = combatant.origin.statBlock.statBlock;
  const nextResources = {
    ...combatant.origin.resources,
    unavailableRechargeParts:
      combatant.origin.resources.unavailableRechargeParts.filter((key) => {
        const limitedUse = statBlockLimitedUseForPart(statBlock, key);
        const result = rolls.find((roll) =>
          sameStatBlockPartKey(roll.target, key),
        );
        return (
          limitedUse?.kind !== "recharge" ||
          result === undefined ||
          result.roll < limitedUse.minimumRoll
        );
      }),
  };
  return new Map(combatants).set(actorId, {
    ...combatant,
    origin: {
      ...combatant.origin,
      resources: nextResources,
    },
  });
}

export function concentrationSavingThrowHole(
  combatant: BattleCreatureState,
  damageAmount: number,
): BattleConcentrationSavingThrowHole | null {
  const effectiveDamage = Math.max(0, Math.floor(damageAmount));
  if (combatant.concentration === null || effectiveDamage <= 0) {
    return null;
  }
  const holeKey = `${CONCENTRATION_SAVING_THROW_HOLE_INSTANCE_PREFIX}:${combatant.combatantId}`;
  return {
    kind: "concentrationSavingThrow",
    holeInstanceKey: holeInstanceKey(holeKey),
    holeId: holeId(holeKey),
    label: "Concentration Constitution Saving Throw",
    combatantId: combatant.combatantId,
    dc: concentrationSavingThrowDc(effectiveDamage),
    damageAmount: toDamageAmount(effectiveDamage),
  };
}

function applyInstantDeath(
  combatant: BattleCreatureState,
): BattleCreatureState {
  return Match.value(combatant.zeroHpLifecycle).pipe(
    Match.when({ policy: "diesAtZeroHp" }, () => ({
      ...battleCreatureStateWithoutKnockOut(
        withoutConcentration(combatant),
        combatant.hp,
        combatant.conditions,
      ),
    })),
    Match.when({ policy: "usesDeathSavingThrows" }, (lifecycle) => ({
      ...battleCreatureStateWithoutKnockOut(
        withoutConcentration(combatant),
        combatant.hp,
        applyCondition(combatant.conditions, "unconscious"),
      ),
      zeroHpLifecycle: {
        ...lifecycle,
        deathSaves: addDeathFailures(lifecycle.deathSaves, 3),
      },
    })),
    Match.exhaustive,
  );
}

function withoutConcentration(
  combatant: BattleCreatureState,
): BattleCreatureState {
  if (combatant.concentration === null) {
    return combatant;
  }
  return {
    ...combatant,
    concentration: null,
    activeEffects: combatant.activeEffects.filter(
      (effect) =>
        !("expiresAt" in effect && effect.expiresAt.kind === "concentration") &&
        (effect.kind !== "spellBaseArmorClass" ||
          !effect.earlyEnds.some(
            (earlyEnd) => earlyEnd.kind === "concentrationBroken",
          )),
    ),
  };
}

export function breakCombatantConcentration(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  combatantId: CombatantId,
  priorConcentration?: BattleConcentration,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const broken =
    combatants.get(combatantId)?.concentration ?? priorConcentration;
  if (broken === undefined) {
    return combatants;
  }
  return new Map(
    [...combatants].map(([id, combatant]) => {
      const expiring = combatant.activeEffects.filter((effect) =>
        concentrationBrokenEffectFrom(effect, combatantId, broken),
      );
      const activeEffects = combatant.activeEffects.filter(
        (effect) => !expiring.includes(effect),
      );
      const nextCombatant =
        combatant.positiveHpUnconscious === null
          ? {
              ...combatant,
              concentration:
                id === combatantId ? null : combatant.concentration,
              activeEffects,
              conditions: conditionsAfterExpiringSpellConditionEffects(
                combatant.conditions,
                activeEffects,
                expiring,
              ),
            }
          : {
              ...combatant,
              concentration:
                id === combatantId ? null : combatant.concentration,
              activeEffects,
            };
      return [id, nextCombatant];
    }),
  );
}

function concentrationBrokenEffectFrom(
  effect: BattleActiveEffect,
  combatantId: CombatantId,
  concentration: BattleConcentration | null,
): boolean {
  if (effect.sourceCombatantId !== combatantId) {
    return false;
  }
  if (
    concentration?.effectKind === "spellEffect" &&
    effect.sourceSpellId === concentration.sourceSpellId &&
    "expiresAt" in effect &&
    effect.expiresAt.kind === "concentration"
  ) {
    return true;
  }
  return (
    effect.kind === "spellBaseArmorClass" &&
    effect.earlyEnds.some((earlyEnd) => earlyEnd.kind === "concentrationBroken")
  );
}
