/**
 * Battle machine creature-level pure functions — ports creature.qnt pure functions.
 * All functions are pure (no XState imports, no side effects).
 */
import { Match, Option } from "effect";
import {
  decrementInitiativeDurationRounds,
  type InitiativeDurationRounds,
} from "@dnd/shared-algebras/elapsed-time-algebra";

import { preparedBattleSpellAccess } from "#/battle-spell-access.ts";
import {
  makeSpellLibrary,
  SRD_SPELLS,
  type SpellLibrary,
} from "#/features/spell-registry.ts";
import type {
  BattleCreatureState,
  CreatureId,
} from "#/battle-machine-types.ts";
import {
  addIncapSource,
  ALL_DAMAGE_TYPES,
  removeIncapSource,
  resolveDeathSave,
} from "#/machine-helpers.ts";
import type {
  ActionType,
  ActiveEffect,
  BattleWeaponProfile,
  Condition,
  CreatureKind,
  DamageQualifier,
  DamageType,
  ExpiryPhase,
  HandUse,
  PhysicalDamageType,
  QualifiedPhysicalBypass,
  SpellId,
} from "#/types.ts";
import {
  armorClass,
  difficultyClass,
  resourceCount,
  spellId,
} from "#/types.ts";

const SPELL_LIBRARY = makeSpellLibrary(SRD_SPELLS);

function activeEffectId(effect: ActiveEffect): string {
  return effect.spellId;
}

function applyDamageModifiers(
  amount: number,
  damageType: DamageType,
  immunities: ReadonlySet<DamageType>,
  resistances: ReadonlySet<DamageType>,
  vulnerabilities: ReadonlySet<DamageType>,
  flatModifier: number,
): number {
  if (immunities.has(damageType)) return 0;
  const afterFlat = Math.max(0, amount - flatModifier);
  const afterResist = resistances.has(damageType)
    ? Math.trunc(afterFlat / 2)
    : afterFlat;
  return vulnerabilities.has(damageType) ? afterResist * 2 : afterResist;
}

function isPhysicalDamageType(
  damageType: DamageType,
): damageType is PhysicalDamageType {
  return (
    damageType === "bludgeoning" ||
    damageType === "piercing" ||
    damageType === "slashing"
  );
}

function isBypassed(
  rule: QualifiedPhysicalBypass,
  damageQualifiers: ReadonlySet<DamageQualifier>,
): boolean {
  for (const qualifier of rule.bypassedBy) {
    if (damageQualifiers.has(qualifier)) return true;
  }
  return false;
}

function qualifyingPhysicalRules(
  rules: ReadonlyArray<QualifiedPhysicalBypass>,
  damageType: DamageType,
  damageQualifiers: ReadonlySet<DamageQualifier>,
): ReadonlyArray<QualifiedPhysicalBypass> {
  if (!isPhysicalDamageType(damageType)) return [];
  return rules.filter(
    (rule) =>
      rule.damageType === damageType && !isBypassed(rule, damageQualifiers),
  );
}

export function effectiveMaxHp(c: BattleCreatureState): number {
  return Math.max(0, c.maxHp - Math.max(0, c.maxHpReduction));
}

function countHandUse(c: BattleCreatureState, use: HandUse): number {
  let count = 0;
  if (c.leftHandUse === use) count += 1;
  if (c.rightHandUse === use) count += 1;
  return count;
}

export function battleFreeHandCount(c: BattleCreatureState): number {
  return countHandUse(c, "free");
}

export function battleHasFreeHand(c: BattleCreatureState): boolean {
  return battleFreeHandCount(c) > 0;
}

export function battleShieldOccupiesHand(c: BattleCreatureState): boolean {
  return countHandUse(c, "shield") > 0;
}

export function battleMainHandUsesTwoHands(c: BattleCreatureState): boolean {
  return countHandUse(c, "mainWeapon") >= 2;
}

export function battleMainHandDamageDie(
  c: BattleCreatureState,
  isMeleeAttack: boolean,
): number | null {
  const weapon = c.mainHandWeapon;
  if (weapon == null) return null;
  const defaultDie = weapon.damageDie ?? null;
  if (!isMeleeAttack || !weapon.properties.has("versatile")) return defaultDie;
  const versatileDie = weapon.versatileDie ?? null;
  if (versatileDie == null) return defaultDie;
  return battleMainHandUsesTwoHands(c) ? versatileDie : defaultDie;
}

export function dropHeldItems(c: BattleCreatureState): BattleCreatureState {
  return {
    ...c,
    leftHandUse: "free",
    rightHandUse: "free",
  };
}

function markDead(c: BattleCreatureState): BattleCreatureState {
  return { ...dropHeldItems(c), dead: true };
}

function withFirstMatchingHand(
  c: BattleCreatureState,
  from: HandUse,
  to: HandUse,
): BattleCreatureState {
  if (c.leftHandUse === from) return { ...c, leftHandUse: to };
  if (c.rightHandUse === from) return { ...c, rightHandUse: to };
  return c;
}

export function releaseOneHandFromTwoHandGrip(
  c: BattleCreatureState,
): BattleCreatureState {
  if (!battleMainHandUsesTwoHands(c)) return c;
  return withFirstMatchingHand(c, "mainWeapon", "free");
}

export function prepareHandsForSpellComponents(
  c: BattleCreatureState,
): BattleCreatureState {
  return battleHasFreeHand(c) ? c : releaseOneHandFromTwoHandGrip(c);
}

export function occupyFreeHandWithGrapple(
  c: BattleCreatureState,
): BattleCreatureState {
  return withFirstMatchingHand(c, "free", "grapple");
}

export function releaseOneGrappleHand(
  c: BattleCreatureState,
): BattleCreatureState {
  return withFirstMatchingHand(c, "grapple", "free");
}

export function deriveBattleHandUses(params: {
  readonly mainHandWeapon: BattleWeaponProfile | null;
  readonly offHandWeapon: BattleWeaponProfile | null;
  readonly hasShieldEquipped: boolean;
  readonly mainHandUsesTwoHands: boolean;
}): Pick<BattleCreatureState, "leftHandUse" | "rightHandUse"> {
  if (params.mainHandWeapon == null) {
    if (params.offHandWeapon != null && params.hasShieldEquipped) {
      return { leftHandUse: "offWeapon", rightHandUse: "shield" };
    }
    if (params.offHandWeapon != null) {
      return { leftHandUse: "offWeapon", rightHandUse: "free" };
    }
    if (params.hasShieldEquipped) {
      return { leftHandUse: "shield", rightHandUse: "free" };
    }
    return { leftHandUse: "free", rightHandUse: "free" };
  }
  if (params.mainHandUsesTwoHands) {
    return { leftHandUse: "mainWeapon", rightHandUse: "mainWeapon" };
  }
  if (params.offHandWeapon != null) {
    return { leftHandUse: "mainWeapon", rightHandUse: "offWeapon" };
  }
  if (params.hasShieldEquipped) {
    return { leftHandUse: "mainWeapon", rightHandUse: "shield" };
  }
  return { leftHandUse: "mainWeapon", rightHandUse: "free" };
}

export function isIncapacitated(c: BattleCreatureState): boolean {
  return c.incapacitatedSources.size > 0;
}

function hasConditionFlag(c: BattleCreatureState, cond: Condition): boolean {
  return Match.value(cond).pipe(
    Match.when("blinded", () => c.blinded),
    Match.when("charmed", () => c.charmed),
    Match.when("deafened", () => c.deafened),
    Match.when("frightened", () => c.frightened),
    Match.when("grappled", () => c.grappled),
    Match.when("incapacitated", () => isIncapacitated(c)),
    Match.when("invisible", () => c.invisible),
    Match.when("paralyzed", () => c.paralyzed),
    Match.when("petrified", () => c.petrified),
    Match.when("poisoned", () => c.poisoned),
    Match.when("prone", () => c.prone),
    Match.when("restrained", () => c.restrained),
    Match.when("stunned", () => c.stunned),
    Match.when("unconscious", () => c.unconscious),
    Match.exhaustive,
  );
}

export function applyCondition(
  c: BattleCreatureState,
  cond: Condition,
): BattleCreatureState {
  return Match.value(cond).pipe(
    Match.when("blinded", () => ({ ...c, blinded: true })),
    Match.when("charmed", () => ({ ...c, charmed: true })),
    Match.when("deafened", () => ({ ...c, deafened: true })),
    Match.when("frightened", () => ({ ...c, frightened: true })),
    Match.when("grappled", () => ({ ...c, grappled: true })),
    Match.when("incapacitated", () => ({
      ...c,
      incapacitatedSources: addIncapSource(c.incapacitatedSources, "direct"),
    })),
    Match.when("invisible", () => ({ ...c, invisible: true })),
    Match.when("paralyzed", () => ({
      ...c,
      paralyzed: true,
      incapacitatedSources: addIncapSource(c.incapacitatedSources, "paralyzed"),
    })),
    Match.when("petrified", () => ({
      ...c,
      petrified: true,
      incapacitatedSources: addIncapSource(c.incapacitatedSources, "petrified"),
    })),
    Match.when("poisoned", () => (c.petrified ? c : { ...c, poisoned: true })),
    Match.when("prone", () => ({ ...c, prone: true })),
    Match.when("restrained", () => ({ ...c, restrained: true })),
    Match.when("stunned", () => ({
      ...c,
      stunned: true,
      incapacitatedSources: addIncapSource(c.incapacitatedSources, "stunned"),
    })),
    Match.when("unconscious", () => ({
      ...dropHeldItems(c),
      unconscious: true,
      prone: true,
      incapacitatedSources: addIncapSource(
        c.incapacitatedSources,
        "unconscious",
      ),
    })),
    Match.exhaustive,
  );
}

function removeConditionRaw(
  c: BattleCreatureState,
  cond: Condition,
): BattleCreatureState {
  return Match.value(cond).pipe(
    Match.when("blinded", () => ({ ...c, blinded: false })),
    Match.when("charmed", () => ({ ...c, charmed: false })),
    Match.when("deafened", () => ({ ...c, deafened: false })),
    Match.when("frightened", () => ({ ...c, frightened: false })),
    Match.when("grappled", () => ({ ...c, grappled: false })),
    Match.when("incapacitated", () => ({
      ...c,
      incapacitatedSources: removeIncapSource(c.incapacitatedSources, "direct"),
    })),
    Match.when("invisible", () => ({ ...c, invisible: false })),
    Match.when("paralyzed", () => ({
      ...c,
      paralyzed: false,
      incapacitatedSources: removeIncapSource(
        c.incapacitatedSources,
        "paralyzed",
      ),
    })),
    Match.when("petrified", () => ({
      ...c,
      petrified: false,
      incapacitatedSources: removeIncapSource(
        c.incapacitatedSources,
        "petrified",
      ),
    })),
    Match.when("poisoned", () => ({ ...c, poisoned: false })),
    Match.when("prone", () => ({ ...c, prone: false })),
    Match.when("restrained", () => ({ ...c, restrained: false })),
    Match.when("stunned", () => ({
      ...c,
      stunned: false,
      incapacitatedSources: removeIncapSource(
        c.incapacitatedSources,
        "stunned",
      ),
    })),
    Match.when("unconscious", () => ({
      ...c,
      unconscious: false,
      incapacitatedSources: removeIncapSource(
        c.incapacitatedSources,
        "unconscious",
      ),
    })),
    Match.exhaustive,
  );
}

function preserveZeroHpUnconscious(
  c: BattleCreatureState,
  cond: Condition,
): BattleCreatureState {
  if (cond === "unconscious" && c.hp === 0 && !c.dead) return c;
  return removeConditionRaw(c, cond);
}

function effectGrantsCondition(
  c: BattleCreatureState,
  effect: ActiveEffect,
  cond: Condition,
): boolean {
  if (effect.grantedConditions?.includes(cond) === true) return true;
  return (effect.conditionalGrantedConditions ?? []).some(
    (conditional) =>
      conditional.condition === cond &&
      hasConditionFlag(c, conditional.whileCondition),
  );
}

function conditionGrantedByActiveEffects(
  c: BattleCreatureState,
  cond: Condition,
): boolean {
  return c.activeEffects.some((effect) =>
    effectGrantsCondition(c, effect, cond),
  );
}

function removeConditionIfNoActiveEffectStillGrants(
  c: BattleCreatureState,
  cond: Condition,
): BattleCreatureState {
  return conditionGrantedByActiveEffects(c, cond)
    ? c
    : preserveZeroHpUnconscious(c, cond);
}

function removeUnsatisfiedConditionalConditions(
  c: BattleCreatureState,
): BattleCreatureState {
  let next = c;
  for (const effect of c.activeEffects) {
    for (const conditional of effect.conditionalGrantedConditions ?? []) {
      if (
        hasConditionFlag(next, conditional.condition) &&
        !hasConditionFlag(next, conditional.whileCondition)
      ) {
        next = removeConditionIfNoActiveEffectStillGrants(
          next,
          conditional.condition,
        );
      }
    }
  }
  return next;
}

export function removeCondition(
  c: BattleCreatureState,
  cond: Condition,
): BattleCreatureState {
  return removeUnsatisfiedConditionalConditions(removeConditionRaw(c, cond));
}

function removeConditionsEndedByDamage(
  c: BattleCreatureState,
): BattleCreatureState {
  if (c.hp === 0 || c.dead) return c;
  const endedConditions: Array<Condition> = [];
  const nextEffects: BattleCreatureState["activeEffects"] = c.activeEffects.map(
    (effect) => {
      const conditionalGrantedConditions =
        effect.conditionalGrantedConditions?.filter((conditional) => {
          const endsEarly = conditional.endsEarlyOnDamage === true;
          if (endsEarly) endedConditions.push(conditional.condition);
          return !endsEarly;
        }) ?? [];
      return conditionalGrantedConditions.length ===
        (effect.conditionalGrantedConditions?.length ?? 0)
        ? effect
        : {
            ...effect,
            conditionalGrantedConditions,
          };
    },
  );
  let next: BattleCreatureState = { ...c, activeEffects: nextEffects };
  for (const condition of endedConditions) {
    next = removeConditionIfNoActiveEffectStillGrants(next, condition);
  }
  return removeUnsatisfiedConditionalConditions(next);
}

export function wakeEffectTarget(
  c: BattleCreatureState,
  maxDistanceFeet: number,
): BattleCreatureState {
  if (c.hp === 0 || c.dead) return c;
  const endedConditions: Array<Condition> = [];
  const nextEffects: BattleCreatureState["activeEffects"] = c.activeEffects.map(
    (effect) => {
      const conditionalGrantedConditions =
        effect.conditionalGrantedConditions?.filter((conditional) => {
          const endsEarly =
            conditional.endsEarlyOnWakeActionWithinFeet != null &&
            conditional.endsEarlyOnWakeActionWithinFeet >= maxDistanceFeet;
          if (endsEarly) endedConditions.push(conditional.condition);
          return !endsEarly;
        }) ?? [];
      return conditionalGrantedConditions.length ===
        (effect.conditionalGrantedConditions?.length ?? 0)
        ? effect
        : {
            ...effect,
            conditionalGrantedConditions,
          };
    },
  );
  let next: BattleCreatureState = { ...c, activeEffects: nextEffects };
  for (const condition of endedConditions) {
    next = removeConditionIfNoActiveEffectStillGrants(next, condition);
  }
  return removeUnsatisfiedConditionalConditions(next);
}

function addDeathFailures(
  c: BattleCreatureState,
  count: number,
): BattleCreatureState {
  const newFails = Math.min(c.deathSaves.failures + count, 3);
  const c1 = {
    ...c,
    deathSaves: { successes: c.deathSaves.successes, failures: newFails },
  };
  return newFails >= 3 ? markDead(c1) : c1;
}

/** Death saving throw at start of turn. Delegates to resolveDeathSave for d20 logic. */
export function deathSave(
  c: BattleCreatureState,
  d20Roll: number,
): BattleCreatureState {
  if (c.dead || c.hp > 0 || c.stable) return c;
  const r = resolveDeathSave(
    d20Roll,
    c.deathSaves.successes,
    c.deathSaves.failures,
  );
  if (r.regainsConsciousness) {
    return removeCondition(
      { ...c, hp: 1, deathSaves: { successes: 0, failures: 0 } },
      "unconscious",
    );
  }
  const c1 = {
    ...c,
    deathSaves: { successes: r.newSuccesses, failures: r.newFailures },
  };
  if (r.isDead) return markDead(c1);
  if (r.isStabilized)
    return { ...c1, stable: true, deathSaves: { successes: 0, failures: 0 } };
  return c1;
}

export function takeDamage(
  c: BattleCreatureState,
  amount: number,
  damageType: DamageType,
  damageQualifiers: ReadonlySet<DamageQualifier>,
  isCritical: boolean,
): BattleCreatureState {
  if (c.dead) return c;
  const effResist = c.petrified ? ALL_DAMAGE_TYPES : new Set<DamageType>();
  // Merge active effect granted R/V/I + combatant-level resistances (rage etc.)
  const totalR = new Set(effResist);
  for (const r of c.combatantResistances) totalR.add(r);
  const totalV = new Set<DamageType>();
  const totalI = new Set<DamageType>();
  const qualifiedR: Array<QualifiedPhysicalBypass> = [
    ...c.qualifiedPhysicalResistances,
  ];
  const qualifiedV: Array<QualifiedPhysicalBypass> = [
    ...c.qualifiedPhysicalVulnerabilities,
  ];
  const qualifiedI: Array<QualifiedPhysicalBypass> = [
    ...c.qualifiedPhysicalImmunities,
  ];
  for (const e of c.activeEffects) {
    if (e.grantedResistances)
      for (const r of e.grantedResistances) totalR.add(r);
    if (e.grantedVulnerabilities)
      for (const v of e.grantedVulnerabilities) totalV.add(v);
    if (e.grantedImmunities) for (const i of e.grantedImmunities) totalI.add(i);
    if (e.grantedQualifiedPhysicalResistances)
      qualifiedR.push(...e.grantedQualifiedPhysicalResistances);
    if (e.grantedQualifiedPhysicalVulnerabilities)
      qualifiedV.push(...e.grantedQualifiedPhysicalVulnerabilities);
    if (e.grantedQualifiedPhysicalImmunities)
      qualifiedI.push(...e.grantedQualifiedPhysicalImmunities);
  }
  for (const rule of qualifyingPhysicalRules(
    qualifiedR,
    damageType,
    damageQualifiers,
  ))
    totalR.add(rule.damageType);
  for (const rule of qualifyingPhysicalRules(
    qualifiedV,
    damageType,
    damageQualifiers,
  ))
    totalV.add(rule.damageType);
  for (const rule of qualifyingPhysicalRules(
    qualifiedI,
    damageType,
    damageQualifiers,
  ))
    totalI.add(rule.damageType);
  const effAmount = applyDamageModifiers(
    amount,
    damageType,
    totalI,
    totalR,
    totalV,
    0,
  );
  if (effAmount <= 0) return c;
  const tempAbsorb = Math.min(c.tempHp, effAmount);
  const dmgThrough = effAmount - tempAbsorb;
  const c1 = { ...c, tempHp: c.tempHp - tempAbsorb };
  if (dmgThrough === 0) return c1;
  const effMax = effectiveMaxHp(c);
  if (c1.hp === 0) {
    if (c.creatureKind === "Monster") return markDead(c1);
    if (dmgThrough >= effMax) return markDead(c1);
    return addDeathFailures({ ...c1, stable: false }, isCritical ? 2 : 1);
  }
  const newHp = c1.hp - dmgThrough;
  if (newHp <= 0) {
    const overflow = -newHp;
    const c2 = { ...c1, hp: 0 };
    if (c.creatureKind === "Monster") return markDead(c2);
    if (overflow >= effMax) return markDead(c2);
    return applyCondition(c2, "unconscious");
  }
  return removeConditionsEndedByDamage({ ...c1, hp: newHp });
}

export function heal(
  c: BattleCreatureState,
  amount: number,
): BattleCreatureState {
  if (c.dead || amount <= 0) return c;
  const newHp = Math.min(c.hp + amount, effectiveMaxHp(c));
  const c1 = { ...c, hp: newHp };
  if (c.hp === 0 && newHp > 0) {
    return {
      ...removeCondition(c1, "unconscious"),
      deathSaves: { successes: 0, failures: 0 },
      stable: false,
    };
  }
  return c1;
}

/** Spend an action. Returns creature UNCHANGED (silent no-op) when blocked by actionSurgeActionPending
 *  or ragingBlocksSpells for magic actions. Callers MUST guard explicitly — this is not a guard. */
export function spendAction(
  c: BattleCreatureState,
  actionType: ActionType,
): BattleCreatureState {
  if (c.actionsRemaining <= 0 || isIncapacitated(c)) return c;
  if (c.actionSurgeActionPending && actionType === "magic") return c;
  if (c.ragingBlocksSpells && actionType === "magic") return c;
  let c1 = { ...c, actionsRemaining: c.actionsRemaining - 1 };
  if (actionType === "attack") c1 = { ...c1, attackActionUsed: true };
  else if (actionType === "disengage") c1 = { ...c1, disengaged: true };
  else if (actionType === "dodge") c1 = { ...c1, dodging: true };
  else if (actionType === "dash")
    c1 = { ...c1, movementRemaining: c1.movementRemaining + c1.effectiveSpeed };
  else if (actionType === "ready") c1 = { ...c1, readiedAction: true };
  if (c.actionSurgeActionPending)
    c1 = { ...c1, actionSurgeActionPending: false };
  return c1;
}

export function spendBonusActionForAction(
  c: BattleCreatureState,
  actionType: Extract<ActionType, "disengage" | "hide">,
): BattleCreatureState {
  if (c.bonusActionUsed || isIncapacitated(c)) return c;
  return actionType === "disengage"
    ? { ...c, bonusActionUsed: true, disengaged: true }
    : { ...c, bonusActionUsed: true };
}

export function spendReaction(c: BattleCreatureState): BattleCreatureState {
  return c.reactionAvailable ? { ...c, reactionAvailable: false } : c;
}

export function spendMovement(
  c: BattleCreatureState,
  feet: number,
  cost: number,
): BattleCreatureState {
  const totalCost = feet * cost;
  if (totalCost > c.movementRemaining || totalCost < 0) return c;
  return { ...c, movementRemaining: c.movementRemaining - totalCost };
}

export function spendExtraAttack(c: BattleCreatureState): BattleCreatureState {
  return c.extraAttacksRemaining > 0
    ? { ...c, extraAttacksRemaining: c.extraAttacksRemaining - 1 }
    : c;
}

export function expendSlot(
  c: BattleCreatureState,
  level: number,
): BattleCreatureState {
  const idx = level - 1;
  if (idx < 0 || idx >= c.slotsCurrent.length) return c;
  const current = c.slotsCurrent[idx];
  if (current <= 0) return c;
  const newSlots = [...c.slotsCurrent];
  newSlots[idx] = current - 1;
  return { ...c, slotsCurrent: newSlots };
}

/** Battle-level expendSlot: also marks "slot expended this turn" (SRD 5.2.1). */
export function battleExpendSlot(
  c: BattleCreatureState,
  level: number,
): BattleCreatureState {
  return { ...expendSlot(c, level), slotExpendedThisTurn: true };
}

export function breakConcentration(
  c: BattleCreatureState,
): BattleCreatureState {
  if (Option.isNone(c.concentrationSpellId)) return c;
  const sid = c.concentrationSpellId.value;
  return {
    ...c,
    concentrationSpellId: Option.none(),
    activeEffects: c.activeEffects.filter((e) => activeEffectId(e) !== sid),
    readiedSpellParams: null, // SRD 5.2.1: concentration break = readied spell fizzles
  };
}

export function startConcentration(
  c: BattleCreatureState,
  spellId: SpellId,
): BattleCreatureState {
  return { ...c, concentrationSpellId: Option.some(spellId) };
}

export function effectExpiryOwnerId(effect: ActiveEffect): CreatureId {
  return effect.expiryOwnerId ?? effect.casterId;
}

export function blocksOpportunityAttacks(c: BattleCreatureState): boolean {
  return c.activeEffects.some(
    (effect) => effect.blocksOpportunityAttacks === true,
  );
}

export function speedDeltaFromEffects(c: BattleCreatureState): number {
  return c.activeEffects.reduce(
    (total, effect) => total + (effect.speedDeltaFeet ?? 0),
    0,
  );
}

function qualifiesOneShotHit(
  effect: ActiveEffect,
  isWeaponAttack: boolean,
  isMeleeAttack: boolean,
): boolean {
  const trigger = effect.consumeOnQualifiedHit?.trigger;
  if (trigger == null) return false;
  if (trigger === "nextWeaponHit") return isWeaponAttack;
  return isWeaponAttack && isMeleeAttack;
}

export function consumeOneShotHitEffects(
  c: BattleCreatureState,
  isWeaponAttack: boolean,
  isMeleeAttack: boolean,
): BattleCreatureState {
  const removed = c.activeEffects.filter((effect) =>
    qualifiesOneShotHit(effect, isWeaponAttack, isMeleeAttack),
  );
  if (removed.length === 0) return c;
  return removeGrantedConditions(
    {
      ...c,
      activeEffects: c.activeEffects.filter(
        (effect) => !qualifiesOneShotHit(effect, isWeaponAttack, isMeleeAttack),
      ),
    },
    removed,
  );
}

function removeGrantedConditions(
  c: BattleCreatureState,
  effects: ReadonlyArray<ActiveEffect>,
): BattleCreatureState {
  let next = c;
  for (const effect of effects) {
    for (const condition of effect.grantedConditions ?? []) {
      next = removeConditionIfNoActiveEffectStillGrants(next, condition);
    }
    for (const conditional of effect.conditionalGrantedConditions ?? []) {
      next = removeConditionIfNoActiveEffectStillGrants(
        next,
        conditional.condition,
      );
    }
  }
  return removeUnsatisfiedConditionalConditions(next);
}

export function advanceEffectsForOwner(
  creature: BattleCreatureState,
  ownerId: CreatureId,
  phase: ExpiryPhase,
): BattleCreatureState {
  let changed = false;
  const advanced: Array<ActiveEffect> = [];
  const removed: Array<ActiveEffect> = [];
  for (const effect of creature.activeEffects) {
    if (effectExpiryOwnerId(effect) !== ownerId) {
      advanced.push(effect);
      continue;
    }
    changed = true;
    const roundsRemaining = decrementInitiativeDurationRounds(
      effect.roundsRemaining,
    );
    if (roundsRemaining <= 0 && effect.expiresAt === phase) {
      removed.push(effect);
      continue;
    }
    advanced.push({ ...effect, roundsRemaining });
  }
  if (!changed) return creature;
  return removeGrantedConditions(
    { ...creature, activeEffects: advanced },
    removed,
  );
}

export function addEffect(
  c: BattleCreatureState,
  effectId: string,
  duration: InitiativeDurationRounds,
  expiresAt: ExpiryPhase,
  casterId: CreatureId,
  options: Partial<
    Omit<ActiveEffect, "spellId" | "roundsRemaining" | "expiresAt" | "casterId">
  > = {},
): BattleCreatureState {
  return {
    ...c,
    activeEffects: [
      ...c.activeEffects.filter(
        (effect) => activeEffectId(effect) !== effectId,
      ),
      {
        spellId: effectId,
        roundsRemaining: duration,
        expiresAt,
        casterId,
        ...options,
      },
    ],
  };
}

export function removeEffect(
  c: BattleCreatureState,
  effectId: string,
): BattleCreatureState {
  const removed = c.activeEffects.filter((e) => activeEffectId(e) === effectId);
  if (removed.length === 0) return c;
  return removeGrantedConditions(
    {
      ...c,
      activeEffects: c.activeEffects.filter(
        (e) => activeEffectId(e) !== effectId,
      ),
    },
    removed,
  );
}

function dependsOnEffect(
  effect: ActiveEffect,
  parentCasterId: CreatureId,
  parentSpellId: SpellId,
): boolean {
  return (
    effect.parentCasterId === parentCasterId &&
    effect.parentSpellId === parentSpellId
  );
}

export function removeEffectAndDependents(
  c: BattleCreatureState,
  parentCasterId: CreatureId,
  parentSpellId: SpellId,
): BattleCreatureState {
  const removed = c.activeEffects.filter(
    (effect) =>
      (effect.casterId === parentCasterId &&
        activeEffectId(effect) === parentSpellId) ||
      dependsOnEffect(effect, parentCasterId, parentSpellId),
  );
  if (removed.length === 0) return c;
  return removeGrantedConditions(
    {
      ...c,
      activeEffects: c.activeEffects.filter(
        (effect) =>
          !(
            (effect.casterId === parentCasterId &&
              activeEffectId(effect) === parentSpellId) ||
            dependsOnEffect(effect, parentCasterId, parentSpellId)
          ),
      ),
    },
    removed,
  );
}

export function removeEffectsByCaster(
  c: BattleCreatureState,
  casterId: CreatureId,
): BattleCreatureState {
  const removed = c.activeEffects.filter(
    (effect) =>
      effect.casterId === casterId || effect.parentCasterId === casterId,
  );
  if (removed.length === 0) return c;
  return removeGrantedConditions(
    {
      ...c,
      activeEffects: c.activeEffects.filter(
        (effect) =>
          !(effect.casterId === casterId || effect.parentCasterId === casterId),
      ),
    },
    removed,
  );
}

export function endHidden(c: BattleCreatureState): BattleCreatureState {
  return c.hiddenDiscoveryDc > 0
    ? {
        ...c,
        hiddenDiscoveryDc: 0,
        invisible: c.activeEffects.some((effect) =>
          effect.grantedConditions?.includes("invisible"),
        ),
      }
    : c;
}

// --- Constants & factories (moved from battle-machine-types.ts) ---

export const FRESH_TURN_STATE = {
  movementRemaining: 0,
  effectiveSpeed: 0,
  actionsRemaining: 1,
  attackActionUsed: false,
  bonusActionUsed: false,
  reactionAvailable: true,
  freeInteractionUsed: false,
  extraAttacksRemaining: 1,
  disengaged: false,
  dodging: false,
  readiedAction: false,
  bonusActionSpellCast: false,
  nonCantripActionSpellCast: false,
  lightAttackUsedThisTurn: false,
  bonusMovementRemaining: 0,
  bonusMovementOAFree: false,
  actionSurgeActionPending: false,
  slotExpendedThisTurn: false,
} as const;

const EMPTY_SLOTS: ReadonlyArray<number> = [0, 0, 0, 0, 0, 0, 0, 0, 0];

const CASTER_SLOTS: ReadonlyArray<number> = [4, 3, 2, 0, 0, 0, 0, 0, 0];

const CASTER_PREPARED_SPELLS: ReadonlySet<SpellId> = new Set(
  [
    "hold_person",
    "bless",
    "haste",
    "spirit_guardians",
    "fireball",
    "burning_hands",
    "guiding_bolt",
    "inflict_wounds",
    "counterspell",
    "shield",
  ].map(spellId),
);

const CASTER_SPELL_ACCESSES = [...CASTER_PREPARED_SPELLS].map(
  (currentSpellId) =>
    preparedBattleSpellAccess({
      spellDictionary: SPELL_LIBRARY,
      spellId: currentSpellId,
      spellSaveDC: difficultyClass(13),
    }),
);

export function freshCreature(
  maxHp: number,
  kind: CreatureKind,
): BattleCreatureState {
  const spellAccesses = [] as const;
  return {
    hp: maxHp,
    maxHp,
    maxHpReduction: 0,
    tempHp: 0,
    deathSaves: { successes: 0, failures: 0 },
    stable: false,
    dead: false,
    blinded: false,
    charmed: false,
    deafened: false,
    exhaustion: 0,
    frightened: false,
    grappled: false,
    grappledBy: null,
    grapplingTarget: null,
    grappledTargetTwoSizesSmaller: false,
    invisible: false,
    paralyzed: false,
    petrified: false,
    poisoned: false,
    prone: false,
    restrained: false,
    stunned: false,
    unconscious: false,
    incapacitatedSources: new Set(),
    activeEffects: [],
    activeProjectedPersistents: new Set(),
    ...FRESH_TURN_STATE,
    movementRemaining: 30,
    effectiveSpeed: 30,
    slotsMax: EMPTY_SLOTS,
    slotsCurrent: EMPTY_SLOTS,
    pactSlotsMax: 0,
    pactSlotsCurrent: 0,
    pactSlotLevel: 0,
    concentrationSpellId: Option.none(),
    legendaryActionsRemaining: resourceCount(0),
    legendaryResistancesRemaining: resourceCount(0),
    rechargeAvailable: {},
    rechargeMinRolls: {},
    dailyUsesRemaining: {},
    creatureKind: kind,
    creatureSize: "medium",
    baseArmorClass: armorClass(10),
    battleSide: kind,
    battlePosition: { row: 0, col: 0 },
    rogueLevel: 0,
    monkLevel: 0,
    strMod: 0,
    dexMod: 0,
    spellAccesses,
    hasEvasion: false,
    saveMiscBonus: 0,
    saveAdvantageContexts: new Set(),
    critRange: 20,
    isWearingArmor: false,
    defenseArmorClassBonus: 0,
    greatWeaponFightingDamageFloor: false,
    hiddenDiscoveryDc: 0,
    rangedWeaponAttackRollBonus: 0,
    fighterLevel: 0,
    actionSurgeCharges: 0,
    actionSurgeUsedThisTurn: false,
    barbarianLevel: 0,
    rageCharges: 0,
    meleeDamageBonus: 0,
    recklessThisTurn: false,
    ragingBlocksSpells: false,
    combatantResistances: new Set(),
    qualifiedPhysicalResistances: [],
    qualifiedPhysicalVulnerabilities: [],
    qualifiedPhysicalImmunities: [],
    sneakAttackDice: 0,
    sneakAttackUsedThisTurn: false,
    readiedSpellParams: null,
    baseWalkSpeed: 30,
    bardLevel: 0,
    bardicInspirationCharges: 0,
    parryAcBonus: 0,
    lightPropertyExtraAttackAddsAbilityModifier: false,
    mainHandWeapon: null,
    offHandWeapon: null,
    leftHandUse: "free",
    rightHandUse: "free",
    battleBonusActionOptions: [],
    battleReactionOptions: [],
  };
}

export function freshCaster(
  maxHp: number,
  kind: CreatureKind,
  spellLibrary: SpellLibrary = SPELL_LIBRARY,
): BattleCreatureState {
  return {
    ...freshCreature(maxHp, kind),
    slotsMax: CASTER_SLOTS,
    slotsCurrent: CASTER_SLOTS,
    spellAccesses:
      spellLibrary === SPELL_LIBRARY
        ? CASTER_SPELL_ACCESSES
        : [...CASTER_PREPARED_SPELLS].map((currentSpellId) =>
            preparedBattleSpellAccess({
              spellDictionary: spellLibrary,
              spellId: currentSpellId,
              spellSaveDC: difficultyClass(13),
            }),
          ),
  };
}
