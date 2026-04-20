/**
 * Battle-level helpers (ported from battle.qnt section 3).
 * Creature-level pure functions are in battle-machine-creature.ts.
 */
import { Match, Option } from "effect";

import { hasBattleSpellAccess } from "#/battle-spell-access.ts";
import {
  addEffect,
  advanceEffectsForOwner,
  applyCondition,
  battleHasFreeHand,
  blocksOpportunityAttacks,
  breakConcentration,
  consumeOneShotHitEffects,
  deathSave,
  endHidden,
  FRESH_TURN_STATE,
  heal,
  isIncapacitated,
  prepareHandsForSpellComponents,
  removeEffect,
  removeEffectAndDependents,
  removeEffectsByCaster,
  releaseOneGrappleHand,
  speedDeltaFromEffects,
  takeDamage,
  occupyFreeHandWithGrapple,
} from "#/battle-machine-creature.ts";
import { calculateEffectiveSpeed } from "#/machine-helpers.ts";
import type {
  AfterDamageReturn,
  AfterDamageTriggerQualifiers,
  AttackDamageCtx,
  AttackHitCtx,
  AwaitCtx,
  BattleSaveTriggerKind,
  BattleContext,
  BattleCreatureState,
  CreatureId,
  HelpTarget,
  PendingInterrupt,
  PhaseFields,
  SaveFailedCtx,
  SaveSpellCtx,
  TriggerType,
} from "#/battle-machine-types.ts";
import {
  PHASE_ACTIVE,
  phaseAwaitingLegendary,
  phaseAwaitingReady,
  phaseAwaitReaction,
  phaseResolvingAoE,
  phaseResolvingMovement,
  phaseResolvingTraversal,
} from "#/battle-machine-types.ts";
import {
  canDeflectAttacks,
  hasDeflectEnergy,
} from "#/features/class-monk-features.ts";
import { hasCuttingWords } from "#/features/class-bard.ts";
import { canUncannyDodge, evasionDamage } from "#/features/class-rogue.ts";
import { battleCurrentArmorClass } from "#/projected-persistent.ts";
import { canCastShield } from "#/features/spell-abjuration.ts";
import { getSpellComponentRequirements } from "#/features/spell-available-actions.ts";
import type {
  ActiveEffect,
  ArmorClass,
  ConditionalGrantedCondition,
  DamageQualifier,
  DamageType,
  ExpiryPhase,
  SpellId,
} from "#/types.ts";
import { resourceCount, spellId } from "#/types.ts";

function activeEffectId(effect: ActiveEffect): string {
  return effect.spellId;
}

/** Exhaustive discriminator for tagged unions using `tag` field. */
export const byTag = Match.discriminator("tag");

// Re-export creature-level functions used by actions.
// battleExpendSlot re-exported as expendSlot — battle callers always mark "slot expended this turn".
export {
  applyCondition,
  battleExpendSlot as expendSlot,
  heal,
  spendAction,
  spendBonusActionForAction,
  spendExtraAttack,
  spendMovement,
  spendReaction,
  takeDamage,
} from "#/battle-machine-creature.ts";

type Creatures = ReadonlyMap<CreatureId, BattleCreatureState>;

export function setDifference<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): Set<T> {
  const result = new Set<T>();
  for (const item of a) {
    if (!b.has(item)) result.add(item);
  }
  return result;
}

export function isHit(roll: number, ac: number, critRange = 20): boolean {
  return roll >= ac || roll >= critRange;
}

export function isHitWithAttackRollBonus(
  roll: number,
  ac: number,
  critRange: number,
  attackRollBonus: number,
): boolean {
  return roll + attackRollBonus >= ac || roll >= critRange;
}

export function activeId(c: BattleContext): CreatureId {
  return c.initiative[c.turnIndex];
}

export function awaitingReaction(c: BattleContext): AwaitCtx | null {
  return c.awaitCtx;
}

export function piAttackHit(pi: PendingInterrupt) {
  return pi.tag === "PIAttackHit" ? pi : null;
}
export function piAttackDamage(pi: PendingInterrupt) {
  return pi.tag === "PIAttackDamage" ? pi : null;
}
export function piAfterDamage(pi: PendingInterrupt) {
  return pi.tag === "PIAfterDamage" ? pi : null;
}
export function piSpellCast(pi: PendingInterrupt) {
  return pi.tag === "PISpellCast" ? pi : null;
}
export function piSaveFailed(pi: PendingInterrupt) {
  return pi.tag === "PISaveFailed" ? pi : null;
}
export function piSaveFailedAoE(pi: PendingInterrupt) {
  return pi.tag === "PISaveFailedAoE" ? pi : null;
}
export function piSaveFailedTraversal(pi: PendingInterrupt) {
  return pi.tag === "PISaveFailedTraversal" ? pi : null;
}

export function setCreature(
  cs: Creatures,
  id: CreatureId,
  c: BattleCreatureState,
): Map<CreatureId, BattleCreatureState> {
  const m = new Map(cs);
  m.set(id, c);
  return m;
}

function hasSaveAdvantageAgainst(
  creature: BattleCreatureState,
  triggerKind: BattleSaveTriggerKind,
): boolean {
  if (triggerKind === "none") return false;
  return creature.saveAdvantageContexts.has(triggerKind);
}

function effectiveSaveRoll(
  primaryRoll: number,
  secondaryRoll: number | undefined,
  hasAdvantage: boolean,
): number {
  if (!hasAdvantage) return primaryRoll;
  return Math.max(primaryRoll, secondaryRoll ?? primaryRoll);
}

export function effectiveBattleSaveRollForCreature(
  creature: BattleCreatureState,
  triggerKind: BattleSaveTriggerKind,
  primaryRoll: number,
  secondaryRoll?: number,
): number {
  return effectiveSaveRoll(
    primaryRoll,
    secondaryRoll,
    hasSaveAdvantageAgainst(creature, triggerKind),
  );
}

function battleEffectiveSpeed(c: BattleCreatureState): number {
  return calculateEffectiveSpeed({
    baseSpeed: Math.max(0, c.baseWalkSpeed + speedDeltaFromEffects(c)),
    armorPenalty: 0,
    grappled: c.grappled,
    paralyzed: c.paralyzed,
    petrified: c.petrified,
    restrained: c.restrained,
    unconscious: c.unconscious,
    exhaustion: c.exhaustion,
    isGrappling: false,
    grappledTargetTwoSizesSmaller: false,
  });
}

function refreshProjectedSpeed(
  previous: BattleCreatureState,
  updated: BattleCreatureState,
): BattleCreatureState {
  const newSpeed = battleEffectiveSpeed(updated);
  const spentMovement = Math.max(
    0,
    previous.effectiveSpeed - previous.movementRemaining,
  );
  return {
    ...updated,
    effectiveSpeed: newSpeed,
    movementRemaining: Math.max(0, newSpeed - spentMovement),
  };
}

function releaseGrapplePair(
  cs: Creatures,
  grapplerId: CreatureId,
  targetId: CreatureId,
): Map<CreatureId, BattleCreatureState> {
  let result = new Map(cs);
  const grappler = result.get(grapplerId);
  if (grappler) {
    result.set(grapplerId, {
      ...releaseOneGrappleHand(grappler),
      grapplingTarget: null,
      grappledTargetTwoSizesSmaller: false,
    });
  }
  const target = result.get(targetId);
  if (target) {
    result.set(targetId, {
      ...target,
      grappled: false,
      grappledBy: null,
    });
  }
  return result;
}

function refreshCurrentTurnCreatureSpeed(
  cs: Creatures,
  currentTurnCreatureId: CreatureId,
): Map<CreatureId, BattleCreatureState> {
  const current = cs.get(currentTurnCreatureId);
  if (!current) return new Map(cs);
  return setCreature(
    cs,
    currentTurnCreatureId,
    refreshProjectedSpeed(current, current),
  );
}

function refreshCreatureSpeedProjection(
  cs: Creatures,
  creatureId: CreatureId,
): Map<CreatureId, BattleCreatureState> {
  const current = cs.get(creatureId);
  if (!current) return new Map(cs);
  return setCreature(cs, creatureId, refreshProjectedSpeed(current, current));
}

function refreshCurrentTurnTargetSpeedOnly(
  cs: Creatures,
  targetId: CreatureId,
  currentTurnCreatureId: CreatureId,
): Map<CreatureId, BattleCreatureState> {
  return targetId === currentTurnCreatureId
    ? refreshCurrentTurnCreatureSpeed(cs, currentTurnCreatureId)
    : new Map(cs);
}

export function linkBattleGrapple(
  cs: Creatures,
  grapplerId: CreatureId,
  targetId: CreatureId,
  targetTwoSizesSmaller: boolean,
  currentTurnCreatureId: CreatureId,
): Map<CreatureId, BattleCreatureState> {
  const grappler = cs.get(grapplerId)!;
  const target = cs.get(targetId)!;
  let result = new Map(cs);
  result.set(grapplerId, {
    ...occupyFreeHandWithGrapple(grappler),
    grapplingTarget: targetId,
    grappledTargetTwoSizesSmaller: targetTwoSizesSmaller,
  });
  result.set(targetId, {
    ...target,
    grappled: true,
    grappledBy: grapplerId,
  });
  result = refreshCreatureSpeedProjection(result, targetId);
  return refreshCurrentTurnTargetSpeedOnly(
    result,
    targetId,
    currentTurnCreatureId,
  );
}

export function releaseBattleGrappleByGrappler(
  cs: Creatures,
  grapplerId: CreatureId,
  currentTurnCreatureId: CreatureId,
): Map<CreatureId, BattleCreatureState> {
  const grappler = cs.get(grapplerId);
  if (!grappler?.grapplingTarget) return new Map(cs);
  let result = releaseGrapplePair(cs, grapplerId, grappler.grapplingTarget);
  result = refreshCreatureSpeedProjection(result, grappler.grapplingTarget);
  return refreshCurrentTurnTargetSpeedOnly(
    result,
    grappler.grapplingTarget,
    currentTurnCreatureId,
  );
}

export function escapeBattleGrapple(
  cs: Creatures,
  targetId: CreatureId,
  currentTurnCreatureId: CreatureId,
): Map<CreatureId, BattleCreatureState> {
  const target = cs.get(targetId);
  if (!target?.grappledBy) return new Map(cs);
  let result = releaseGrapplePair(cs, target.grappledBy, targetId);
  result = refreshCreatureSpeedProjection(result, targetId);
  return refreshCurrentTurnTargetSpeedOnly(
    result,
    targetId,
    currentTurnCreatureId,
  );
}

export function normalizeBattleGrapples(
  cs: Creatures,
): Map<CreatureId, BattleCreatureState> {
  let result = new Map(cs);
  for (const [grapplerId, grappler] of result) {
    if (!grappler.grapplingTarget) continue;
    const target = result.get(grappler.grapplingTarget);
    const linkBroken =
      target == null ||
      target.dead ||
      !target.grappled ||
      target.grappledBy !== grapplerId ||
      grappler.dead ||
      isIncapacitated(grappler);
    if (linkBroken) {
      result = releaseGrapplePair(result, grapplerId, grappler.grapplingTarget);
    }
  }
  for (const [targetId, target] of result) {
    if (!target.grappledBy) continue;
    const grappler = result.get(target.grappledBy);
    const linkBroken =
      grappler == null ||
      grappler.grapplingTarget !== targetId ||
      !target.grappled;
    if (linkBroken) {
      result.set(targetId, {
        ...target,
        grappled: false,
        grappledBy: null,
      });
    }
  }
  return result;
}

export function applyDamage(
  cs: Creatures,
  targetId: CreatureId,
  dmg: number,
  dt: DamageType,
  damageQualifiers: ReadonlySet<DamageQualifier>,
  crit: boolean,
  knockOut: boolean,
): Map<CreatureId, BattleCreatureState> {
  const old = cs.get(targetId)!;
  const nc = takeDamage(old, dmg, dt, damageQualifiers, crit);
  // TODO: This generic damage helper currently owns the SRD 5.2.1
  // "Knocking Out a Creature" melee-attacker choice. Keep the behavior, but
  // move the rule-specific override closer to the owning battle damage rule
  // surface when we refactor helper ownership.
  // SRD 5.2.1 "Knocking Out a Creature": melee attacker's choice when damage
  // would reduce a PC to 0 HP (not instant death). Sets HP to 1 + Unconscious.
  if (
    knockOut &&
    old.creatureKind === "PC" &&
    old.hp > 0 &&
    nc.hp === 0 &&
    !nc.dead
  ) {
    return normalizeBattleGrapples(
      setCreature(
        cs,
        targetId,
        applyCondition({ ...old, hp: 1 }, "unconscious"),
      ),
    );
  }
  return normalizeBattleGrapples(setCreature(cs, targetId, nc));
}

/** Auto-break concentration if the concentrated spell's effect no longer exists. Matches Quint pAutoBreakExpiredConcentration. */
function autoBreakExpiredConcentration(
  c: BattleCreatureState,
): BattleCreatureState {
  if (Option.isNone(c.concentrationSpellId)) return c;
  const cid = c.concentrationSpellId.value;
  return c.activeEffects.some((a) => activeEffectId(a) === cid)
    ? c
    : breakConcentration(c);
}

export function breakConcentrationAndPropagate(
  cs: Creatures,
  casterId: CreatureId,
): Map<CreatureId, BattleCreatureState> {
  const caster = cs.get(casterId)!;
  const concOpt = caster.concentrationSpellId;
  if (Option.isNone(concOpt)) return new Map(cs);
  const spellId = concOpt.value;
  const result = setCreature(cs, casterId, {
    ...removeEffectAndDependents(caster, casterId, spellId),
    concentrationSpellId: Option.none(),
    readiedSpellParams: null,
  });
  for (const [cid, c] of result) {
    if (cid === casterId) continue;
    const cleaned = removeEffectAndDependents(c, casterId, spellId);
    if (cleaned !== c) result.set(cid, cleaned);
  }
  return result;
}

export function removeCasterEffectsAndDependents(
  cs: Creatures,
  casterId: CreatureId,
): Map<CreatureId, BattleCreatureState> {
  const result = new Map(cs);
  for (const [id, creature] of result) {
    const cleaned = removeEffectsByCaster(creature, casterId);
    if (cleaned !== creature) result.set(id, cleaned);
  }
  return result;
}

export function eligibleExcluding(
  cs: Creatures,
  excludeId: CreatureId,
): Set<CreatureId> {
  const result = new Set<CreatureId>();
  for (const [id, c] of cs) {
    if (id !== excludeId && c.reactionAvailable && !c.dead && !c.unconscious)
      result.add(id);
  }
  return result;
}

function hasAnySpellSlot(c: BattleCreatureState, minimumLevel = 1): boolean {
  for (let i = Math.max(0, minimumLevel - 1); i < c.slotsCurrent.length; i++) {
    if (c.slotsCurrent[i]! > 0) return true;
  }
  return false;
}

function canBattleSpeak(c: BattleCreatureState): boolean {
  return !c.paralyzed && !c.petrified && !c.unconscious;
}

export function canProvideBattleSpellComponents(
  c: BattleCreatureState,
  spellName: string,
): boolean {
  // Temporary TS seam: component requirements still come from spell registry
  // lookup by SRD spell id. This is compatibility logic, not battle-owned
  // semantic authority; Quint/main ownership now lives on the common-lingo
  // execution surface.
  const requirements = getSpellComponentRequirements(spellName);
  if (requirements == null) return true;
  if (requirements.requiresVerbal && !canBattleSpeak(c)) return false;
  if (!requirements.requiresHandComponent) return true;
  return battleHasFreeHand(prepareHandsForSpellComponents(c));
}

export function prepareBattleCasterForSpell(
  c: BattleCreatureState,
  spellName: string,
): BattleCreatureState {
  const requirements = getSpellComponentRequirements(spellName);
  const prepared =
    requirements == null || !requirements.requiresHandComponent
      ? c
      : prepareHandsForSpellComponents(c);
  return requirements?.requiresVerbal === true ? endHidden(prepared) : prepared;
}

export function firstAvailableSpellSlotLevel(
  c: BattleCreatureState,
  minimumLevel = 1,
): number | null {
  for (let i = Math.max(0, minimumLevel - 1); i < c.slotsCurrent.length; i++) {
    if (c.slotsCurrent[i]! > 0) return i + 1;
  }
  return null;
}

export function eligibleTarget(
  cs: Creatures,
  targetId: CreatureId,
): Set<CreatureId> {
  const t = cs.get(targetId)!;
  return t.reactionAvailable && !t.dead && !t.unconscious
    ? new Set([targetId])
    : new Set();
}

function areAllies(a: BattleCreatureState, b: BattleCreatureState): boolean {
  return a.battleSide === b.battleSide;
}

function squaresBetween(
  a: BattleCreatureState,
  b: BattleCreatureState,
): number {
  return Math.max(
    Math.abs(a.battlePosition.row - b.battlePosition.row),
    Math.abs(a.battlePosition.col - b.battlePosition.col),
  );
}

function isRedirectAlly(
  reactor: BattleCreatureState,
  candidate: BattleCreatureState,
): boolean {
  // TODO: Redirect Attack is the Goblin Boss SRD 5.2.1 reaction
  // (.references/srd-5.2.1/Monsters/Monsters-E-G.md, "Goblin Boss"),
  // which is limited to a Small or Medium ally within 5 feet.
  // This rule-specific size filter does not belong in a generic battle helper;
  // move it closer to the Redirect Attack rule surface when we refactor it.
  return (
    areAllies(reactor, candidate) &&
    (candidate.creatureSize === "small" ||
      candidate.creatureSize === "medium") &&
    squaresBetween(reactor, candidate) <= 1
  );
}

export function redirectableAlliesByReactor(
  cs: Creatures,
  atk: Pick<AttackHitCtx, "attacker" | "target" | "targetCanSeeAttackerAtHit">,
) {
  const alliesByReactor = new Map<
    CreatureId,
    ReadonlyMap<CreatureId, ArmorClass>
  >();
  if (!atk.targetCanSeeAttackerAtHit) return alliesByReactor;
  for (const [id, c] of cs) {
    if (
      id !== atk.target ||
      !c.reactionAvailable ||
      c.dead ||
      c.unconscious ||
      isIncapacitated(c) ||
      !c.battleReactionOptions.includes("redirectAttack")
    ) {
      continue;
    }
    const allies = new Map<CreatureId, ArmorClass>();
    for (const [candidateId, candidate] of cs) {
      if (
        candidateId !== id &&
        candidateId !== atk.attacker &&
        !candidate.dead &&
        !candidate.unconscious &&
        isRedirectAlly(c, candidate)
      ) {
        allies.set(candidateId, battleCurrentArmorClass(candidate));
      }
    }
    if (allies.size > 0) alliesByReactor.set(id, allies);
  }
  return alliesByReactor;
}

export function legalHitReactions(
  cs: Creatures,
  atk: AttackHitCtx,
  candidates: ReadonlySet<CreatureId>,
) {
  // TODO: This helper still carries a TS compatibility seam for some
  // spell-named reactions (`shield`) while Quint/main semantics already route
  // through access/projection fields. Keep parity, but continue moving
  // rule-specific spell eligibility out of id-based helper branches.
  const legalByCreature = new Map<
    CreatureId,
    Set<"RShield" | "RParry" | "RCuttingWords" | "RRedirectAttack">
  >();
  const redirectableAllies = redirectableAlliesByReactor(cs, atk);
  for (const [id, c] of cs) {
    if (
      !c.reactionAvailable ||
      c.dead ||
      c.unconscious ||
      isIncapacitated(c) ||
      id === atk.attacker
    )
      continue;
    const legal = new Set<
      "RShield" | "RParry" | "RCuttingWords" | "RRedirectAttack"
    >();
    if (
      id === atk.target &&
      canCastShield(c.reactionAvailable, hasAnySpellSlot(c)) &&
      hasBattleSpellAccess(c.spellAccesses, spellId("shield")) &&
      !c.slotExpendedThisTurn &&
      canProvideBattleSpellComponents(c, "shield")
    ) {
      legal.add("RShield");
    }
    if (
      id === atk.target &&
      atk.isMeleeAttack &&
      atk.isWeaponAttack &&
      c.parryAcBonus > 0
    ) {
      legal.add("RParry");
    }
    if (
      candidates.has(id) &&
      hasCuttingWords(c.bardLevel) &&
      c.bardicInspirationCharges > 0
    ) {
      legal.add("RCuttingWords");
    }
    if (redirectableAllies.has(id)) {
      legal.add("RRedirectAttack");
    }
    if (legal.size > 0) legalByCreature.set(id, legal);
  }
  return legalByCreature;
}

export function legalDamageReactionsByCreature(
  cs: Creatures,
  atk: AttackDamageCtx,
) {
  // TODO: This generic helper currently owns damage-reaction legality for
  // Uncanny Dodge and Deflect Attacks. Keep parity, but move rule-specific
  // eligibility closer to the owning feature surfaces when we refactor.
  const target = cs.get(atk.target)!;
  const legal = new Set<"RUncannyDodge" | "RDeflectAttacks">();
  if (
    canUncannyDodge({
      rogueLevel: target.rogueLevel,
      reactionAvailable: target.reactionAvailable,
      attackerVisible: atk.targetCanSeeAttackerAtHit,
      isIncapacitated: isIncapacitated(target),
    })
  ) {
    legal.add("RUncannyDodge");
  }
  if (
    canDeflectAttacks(
      target.monkLevel,
      target.reactionAvailable,
      atk.isWeaponAttack,
      hasDeflectEnergy(target.monkLevel),
    ) &&
    (atk.damageType === "bludgeoning" ||
      atk.damageType === "piercing" ||
      atk.damageType === "slashing" ||
      hasDeflectEnergy(target.monkLevel))
  ) {
    legal.add("RDeflectAttacks");
  }
  const legalByCreature = new Map<
    CreatureId,
    Set<"RUncannyDodge" | "RDeflectAttacks">
  >();
  if (legal.size > 0) legalByCreature.set(atk.target, legal);
  return legalByCreature;
}

export function canMakeOpportunityAttack(c: BattleCreatureState): boolean {
  return (
    c.reactionAvailable &&
    !c.dead &&
    !isIncapacitated(c) &&
    !blocksOpportunityAttacks(c)
  );
}

/** Eligible for Legendary Resistance: alive + conscious + has LR charges remaining. */
export function eligibleForLR(
  cs: Creatures,
  targetId: CreatureId,
): Set<CreatureId> {
  const t = cs.get(targetId)!;
  return !t.dead && !t.unconscious && t.legendaryResistancesRemaining > 0
    ? new Set([targetId])
    : new Set();
}

/** Spend one Legendary Resistance charge. */
export function spendLR(cs: Creatures, id: CreatureId): Creatures {
  const c = cs.get(id)!;
  return setCreature(cs, id, {
    ...c,
    legendaryResistancesRemaining: resourceCount(
      c.legendaryResistancesRemaining - 1,
    ),
  });
}

// slotExpendedThisTurn is guarded both here (for reactions) and at all spell-casting
// actions (for action/BA spells). SRD 5.2.1 "One Spell with a Spell Slot per Turn".
export function eligibleForCounterspell(
  cs: Creatures,
  excludeId: CreatureId,
): Set<CreatureId> {
  // TODO: This remains a TS compatibility seam. It still recognizes the
  // reaction by SRD spell id while Quint/main semantics use access/projection
  // fields. Preserve parity for now, but do not widen id-based logic here.
  const result = new Set<CreatureId>();
  for (const [id, c] of cs) {
    if (id === excludeId || !c.reactionAvailable || c.dead || c.unconscious)
      continue;
    let hasSlot = false;
    for (let i = 2; i < c.slotsCurrent.length; i++) {
      if (c.slotsCurrent[i] > 0) {
        hasSlot = true;
        break;
      }
    }
    if (
      hasSlot &&
      hasBattleSpellAccess(c.spellAccesses, spellId("counterspell")) &&
      !c.slotExpendedThisTurn &&
      canProvideBattleSpellComponents(c, "counterspell")
    )
      result.add(id);
  }
  return result;
}

export function mkAwait(
  pi: PendingInterrupt,
  tt: TriggerType,
  elig: Set<CreatureId>,
): AwaitCtx {
  return { interrupt: pi, trigger: tt, eligible: elig, offered: new Set() };
}

export function returnToState(r: AfterDamageReturn): PhaseFields {
  return Match.value(r).pipe(
    byTag("ADRActiveTurn", () => PHASE_ACTIVE),
    byTag("ADRResolvingAoE", (v) => phaseResolvingAoE(v.aoe)),
    byTag("ADRResolvingMovement", (v) => phaseResolvingMovement(v.mv)),
    byTag("ADRResolvingTraversal", (v) => phaseResolvingTraversal(v.traversal)),
    byTag("ADRAwaitingLegendaryAction", (v) => phaseAwaitingLegendary(v.la)),
    byTag("ADRAwaitingReadiedAction", (v) => phaseAwaitingReady(v.ready)),
    Match.exhaustive,
  );
}

export function triggerQualifiersFromAttack(atk: {
  readonly targetCanSeeAttackerAtHit: boolean;
  readonly attackerWithin5ftAtHit: boolean;
  readonly attackerWithin60ftAtHit: boolean;
  readonly isMeleeAttack: boolean;
}): AfterDamageTriggerQualifiers {
  return {
    sourceVisibleToDamagedCreature: atk.targetCanSeeAttackerAtHit,
    sourceWithin5ftOfDamagedCreature: atk.attackerWithin5ftAtHit,
    sourceWithin60ftOfDamagedCreature: atk.attackerWithin60ftAtHit,
    sourceHitWithMeleeAttackRoll: atk.isMeleeAttack,
  };
}

const DEFAULT_AFTER_DAMAGE_TRIGGER_QUALIFIERS: AfterDamageTriggerQualifiers = {
  sourceVisibleToDamagedCreature: false,
  sourceWithin5ftOfDamagedCreature: false,
  sourceWithin60ftOfDamagedCreature: false,
  sourceHitWithMeleeAttackRoll: false,
};

export function applyDamageWithAfterReactions(
  cs: Creatures,
  targetId: CreatureId,
  sourceId: CreatureId,
  dmg: number,
  dt: DamageType,
  damageQualifiers: ReadonlySet<DamageQualifier>,
  crit: boolean,
  knockOut: boolean,
  returnTo: AfterDamageReturn,
  triggerFacts: AfterDamageTriggerQualifiers = DEFAULT_AFTER_DAMAGE_TRIGGER_QUALIFIERS,
): { creatures: Map<CreatureId, BattleCreatureState> } & PhaseFields {
  const oldT = cs.get(targetId)!;
  const cs1 = applyDamage(
    cs,
    targetId,
    dmg,
    dt,
    damageQualifiers,
    crit,
    knockOut,
  );
  const newT = cs1.get(targetId)!;
  const actualDmg = oldT.hp + oldT.tempHp - (newT.hp + newT.tempHp);
  const elig = eligibleTarget(cs1, targetId);
  if (actualDmg > 0 && elig.size > 0) {
    return {
      creatures: cs1,
      ...phaseAwaitReaction(
        mkAwait(
          {
            tag: "PIAfterDamage",
            ctx: {
              damageSource: sourceId,
              damagedCreature: targetId,
              damageDealt: actualDmg,
              damageType: dt,
              damageQualifiers,
              ...triggerFacts,
              returnTo,
            },
          },
          "TDamageTaken",
          elig,
        ),
      ),
    };
  }
  return { creatures: cs1, ...returnToState(returnTo) };
}

export function advanceFromHitPhase(
  cs: Creatures,
  atk: AttackHitCtx,
  currentTurnCreatureId: CreatureId,
): { creatures: Map<CreatureId, BattleCreatureState> } & PhaseFields {
  const attackRollBonus = atk.isRangedWeaponAttack
    ? cs.get(atk.attacker)!.rangedWeaponAttackRollBonus
    : 0;
  const stillHit = isHitWithAttackRollBonus(
    atk.attackRoll,
    atk.targetAc,
    atk.critRange,
    attackRollBonus,
  );
  if (!stillHit)
    return { creatures: new Map(cs), ...returnToState(atk.atkReturnTo) };
  let cs1 = applyOnHitEffect(
    cs,
    atk.target,
    atk.onHitEffect,
    currentTurnCreatureId,
  );
  const attacker = cs1.get(atk.attacker);
  if (attacker != null) {
    cs1 = setCreature(
      cs1,
      atk.attacker,
      consumeOneShotHitEffects(attacker, atk.isWeaponAttack, atk.isMeleeAttack),
    );
  }
  const dmgBase: Omit<AttackDamageCtx, "legalReactionsByCreature"> = {
    attacker: atk.attacker,
    target: atk.target,
    damage: atk.damage,
    damageType: atk.damageType,
    damageQualifiers: atk.damageQualifiers,
    isCritical: atk.isCritical,
    atkReturnTo: atk.atkReturnTo,
    knockOut: atk.knockOut,
    targetCanSeeAttackerAtHit: atk.targetCanSeeAttackerAtHit,
    attackerWithin5ftAtHit: atk.attackerWithin5ftAtHit,
    attackerWithin60ftAtHit: atk.attackerWithin60ftAtHit,
    isMeleeAttack: atk.isMeleeAttack,
    isWeaponAttack: atk.isWeaponAttack,
  };
  const dmgCtx: AttackDamageCtx = {
    ...dmgBase,
    legalReactionsByCreature: legalDamageReactionsByCreature(cs1, {
      ...dmgBase,
      legalReactionsByCreature: new Map(),
    }),
  };
  const elig = new Set(dmgCtx.legalReactionsByCreature.keys());
  if (elig.size > 0) {
    return {
      creatures: new Map(cs1),
      ...phaseAwaitReaction(
        mkAwait({ tag: "PIAttackDamage", ctx: dmgCtx }, "TAttackDamages", elig),
      ),
    };
  }
  return applyDamageWithAfterReactions(
    cs1,
    atk.target,
    atk.attacker,
    atk.damage,
    atk.damageType,
    atk.damageQualifiers,
    atk.isCritical,
    atk.knockOut,
    atk.atkReturnTo,
    triggerQualifiersFromAttack(atk),
  );
}

export function resolveSave(
  cs: Creatures,
  save: SaveSpellCtx,
  returnTo: AfterDamageReturn,
  saveFailedInterruptFactory:
    | ((ctx: SaveFailedCtx) => PendingInterrupt)
    | null = null,
): { creatures: Map<CreatureId, BattleCreatureState> } & PhaseFields {
  const tgt = cs.get(save.target)!;
  const saveRoll = effectiveBattleSaveRollForCreature(
    tgt,
    save.saveTriggerKind,
    save.saveRoll,
    save.saveRollB,
  );
  const totalSave = saveRoll + tgt.saveMiscBonus;
  const saved = totalSave >= save.saveDC;
  const isDex = save.saveAbility === "dex";
  const tgtIncap = isIncapacitated(tgt);
  if (saved) {
    if (save.halfOnSuccess && save.damageOnFail > 0) {
      const halfDmg = Math.trunc(save.damageOnFail / 2);
      const evDmg = isDex
        ? evasionDamage(tgt.hasEvasion, tgtIncap, true, halfDmg)
        : halfDmg;
      if (evDmg === 0) {
        return { creatures: new Map(cs), ...returnToState(returnTo) };
      }
      return applyDamageWithAfterReactions(
        cs,
        save.target,
        save.caster,
        evDmg,
        save.damageType,
        new Set<DamageQualifier>(),
        false,
        false,
        returnTo,
      );
    }
    return { creatures: new Map(cs), ...returnToState(returnTo) };
  }
  const evDmgOnFail = isDex
    ? evasionDamage(tgt.hasEvasion, tgtIncap, false, save.damageOnFail)
    : save.damageOnFail;
  const elig = eligibleForLR(cs, save.target);
  const failCtx: SaveFailedCtx = {
    caster: save.caster,
    target: save.target,
    damageOnFail: evDmgOnFail,
    halfOnSuccess: save.halfOnSuccess,
    damageType: save.damageType,
    conditionOnFail: save.conditionOnFail,
    applyCondition: save.applyCondition,
    saveSucceeded: false,
    failedMargin: save.saveDC - totalSave,
    conditionDurationOnFail: save.conditionDurationOnFail,
    failureBandCondition: save.failureBandCondition,
  };
  if (elig.size > 0) {
    return {
      creatures: new Map(cs),
      ...phaseAwaitReaction(
        mkAwait(
          saveFailedInterruptFactory?.(failCtx) ?? {
            tag: "PISaveFailed",
            ctx: failCtx,
          },
          "TSaveFailed",
          elig,
        ),
      ),
    };
  }
  return applyFailEffects(cs, failCtx, returnTo);
}

export function applyFailEffects(
  cs: Creatures,
  ctx: SaveFailedCtx,
  returnTo: AfterDamageReturn,
): { creatures: Map<CreatureId, BattleCreatureState> } & PhaseFields {
  if (ctx.saveSucceeded) {
    if (ctx.halfOnSuccess && ctx.damageOnFail > 0) {
      return applyDamageWithAfterReactions(
        cs,
        ctx.target,
        ctx.caster,
        Math.trunc(ctx.damageOnFail / 2),
        ctx.damageType,
        new Set<DamageQualifier>(),
        false,
        false,
        returnTo,
      );
    }
    return { creatures: new Map(cs), ...returnToState(returnTo) };
  }
  let cs1: Map<CreatureId, BattleCreatureState> = new Map(cs);
  const applyDurationCondition = (
    creatures: Map<CreatureId, BattleCreatureState>,
  ): Map<CreatureId, BattleCreatureState> => {
    const duration = ctx.conditionDurationOnFail;
    if (duration == null || ctx.conditionOnFail == null) return creatures;
    const conditionalGrantedConditions: Array<ConditionalGrantedCondition> = [];
    if (
      ctx.failureBandCondition != null &&
      (ctx.failedMargin ?? 0) >= ctx.failureBandCondition.minimumMargin
    ) {
      conditionalGrantedConditions.push({
        condition: ctx.failureBandCondition.condition,
        whileCondition: ctx.failureBandCondition.whileCondition,
        ...(ctx.failureBandCondition.endsEarlyOnDamage === true
          ? { endsEarlyOnDamage: true }
          : {}),
        ...(ctx.failureBandCondition.endsEarlyOnWakeActionWithinFeet != null
          ? {
              endsEarlyOnWakeActionWithinFeet:
                ctx.failureBandCondition.endsEarlyOnWakeActionWithinFeet,
            }
          : {}),
      });
    }
    const currentTarget = creatures.get(ctx.target)!;
    if (currentTarget.dead) return creatures;
    let target = addEffect(
      currentTarget,
      duration.effectId,
      duration.turnsRemaining,
      duration.expiresAt,
      ctx.caster,
      {
        ...(duration.expiryOwnerId != null
          ? { expiryOwnerId: duration.expiryOwnerId }
          : {}),
        grantedConditions: [ctx.conditionOnFail],
        ...(conditionalGrantedConditions.length > 0
          ? { conditionalGrantedConditions }
          : {}),
      },
    );
    target = applyCondition(target, ctx.conditionOnFail);
    for (const conditional of conditionalGrantedConditions) {
      target = applyCondition(target, conditional.condition);
    }
    return normalizeBattleGrapples(setCreature(creatures, ctx.target, target));
  };
  if (
    ctx.applyCondition &&
    ctx.conditionOnFail != null &&
    ctx.conditionDurationOnFail != null
  ) {
    if (ctx.damageOnFail > 0) {
      const damaged = applyDamageWithAfterReactions(
        cs1,
        ctx.target,
        ctx.caster,
        ctx.damageOnFail,
        ctx.damageType,
        new Set<DamageQualifier>(),
        false,
        false,
        returnTo,
      );
      return {
        ...damaged,
        creatures: applyDurationCondition(damaged.creatures),
      };
    }
    cs1 = applyDurationCondition(cs1);
  } else if (ctx.applyCondition && ctx.conditionOnFail != null) {
    cs1 = normalizeBattleGrapples(
      setCreature(
        cs1,
        ctx.target,
        applyCondition(cs1.get(ctx.target)!, ctx.conditionOnFail),
      ),
    );
  }
  if (ctx.damageOnFail > 0)
    return applyDamageWithAfterReactions(
      cs1,
      ctx.target,
      ctx.caster,
      ctx.damageOnFail,
      ctx.damageType,
      new Set<DamageQualifier>(),
      false,
      false,
      returnTo,
    );
  return { creatures: cs1, ...returnToState(returnTo) };
}

export function nextTurn(
  turnIndex: number,
  initLen: number,
  round: number,
): { idx: number; round: number } {
  const nextIdx = turnIndex + 1 < initLen ? turnIndex + 1 : 0;
  return { idx: nextIdx, round: nextIdx === 0 ? round + 1 : round };
}

/** Apply damage to a creature and handle concentration break + propagation in one step. */
function applyDamageWithConcBreak(
  cs: Creatures,
  id: CreatureId,
  creature: BattleCreatureState,
  dmg: number,
  dt: DamageType,
  conSaveSucceeded: boolean,
): {
  creatures: Map<CreatureId, BattleCreatureState>;
  creature: BattleCreatureState;
} {
  const hadConc = Option.isSome(creature.concentrationSpellId);
  let c = takeDamage(creature, dmg, dt, new Set(), false);
  if (hadConc && (c.dead || isIncapacitated(c))) c = breakConcentration(c);
  if (Option.isSome(c.concentrationSpellId) && !conSaveSucceeded)
    c = breakConcentration(c);
  let result = setCreature(cs, id, c);
  if (hadConc && Option.isNone(c.concentrationSpellId)) {
    result = breakConcentrationAndPropagate(result, id);
    c = result.get(id)!;
  }
  return { creatures: result, creature: c };
}

function autoBreakAllExpiredConcentration(
  cs: Creatures,
): Map<CreatureId, BattleCreatureState> {
  const result = new Map(cs);
  for (const [id, creature] of result) {
    const updated = autoBreakExpiredConcentration(creature);
    if (updated !== creature) result.set(id, updated);
  }
  return result;
}

function advanceEffectsAtPhase(
  cs: Creatures,
  ownerId: CreatureId,
  phase: ExpiryPhase,
): Map<CreatureId, BattleCreatureState> {
  let changed = false;
  const result = new Map<CreatureId, BattleCreatureState>();
  for (const [id, creature] of cs) {
    const updated = advanceEffectsForOwner(creature, ownerId, phase);
    if (updated !== creature) changed = true;
    result.set(id, updated);
  }
  return changed ? autoBreakAllExpiredConcentration(result) : new Map(cs);
}

export function applyOnHitEffect(
  cs: Creatures,
  targetId: CreatureId,
  effect: ActiveEffect | undefined,
  currentTurnCreatureId: CreatureId,
): Map<CreatureId, BattleCreatureState> {
  if (!effect) return new Map(cs);
  const target = cs.get(targetId)!;
  const activeEffects = [
    ...target.activeEffects.filter(
      (existing) => activeEffectId(existing) !== activeEffectId(effect),
    ),
    effect,
  ];
  const updatedTarget = { ...target, activeEffects };
  const nextTarget =
    targetId === currentTurnCreatureId
      ? refreshProjectedSpeed(target, updatedTarget)
      : updatedTarget;
  return setCreature(cs, targetId, nextTarget);
}

export function processStartTurn(
  cs: Creatures,
  activeId: CreatureId,
  sotDmg: number,
  sotDt: DamageType,
  sotHeal: number,
  _sotSaveResult: boolean,
  sotConSave: boolean,
  rechargedAbilities: ReadonlyArray<string> | undefined,
  deathSaveRoll: number,
): Map<CreatureId, BattleCreatureState> {
  let result = advanceEffectsAtPhase(cs, activeId, "start");
  let c = result.get(activeId)!;
  // Death save: if at 0 HP, not stable, not dead, and roll provided
  if (c.hp === 0 && !c.stable && !c.dead && deathSaveRoll > 0) {
    c = deathSave(c, deathSaveRoll);
  }
  result = setCreature(result, activeId, c);
  const hasEffects = c.activeEffects.length > 0 && (sotDmg > 0 || sotHeal > 0);
  if (hasEffects) {
    if (sotHeal > 0) c = heal(c, sotHeal);
    if (sotDmg > 0) {
      const r = applyDamageWithConcBreak(
        result,
        activeId,
        c,
        sotDmg,
        sotDt,
        sotConSave,
      );
      result = r.creatures;
      c = r.creature;
    } else {
      result = setCreature(result, activeId, c);
    }
  }
  result = normalizeBattleGrapples(result);
  c = result.get(activeId)!;
  const speed = battleEffectiveSpeed(c);
  c = {
    ...c,
    ...FRESH_TURN_STATE,
    effectiveSpeed: speed,
    movementRemaining: speed,
  };
  if (c.creatureKind === "Monster" && rechargedAbilities) {
    const newRecharge = { ...c.rechargeAvailable };
    for (const name of rechargedAbilities) newRecharge[name] = true;
    c = { ...c, rechargeAvailable: newRecharge };
  }
  result = setCreature(result, activeId, c);
  // Reset slotExpendedThisTurn for non-active creatures (active already reset by FRESH_TURN_STATE)
  for (const [cid, cr] of result) {
    if (cid !== activeId && cr.slotExpendedThisTurn)
      result.set(cid, { ...cr, slotExpendedThisTurn: false });
  }
  return normalizeBattleGrapples(result);
}

export function processEndTurn(
  cs: Creatures,
  activeId: CreatureId,
  eotSaveSucceeded: boolean,
  eotDmg: number,
  eotDt: DamageType,
  eotConSave: boolean,
): Map<CreatureId, BattleCreatureState> {
  let c = cs.get(activeId)!;
  const hasEotEffects = c.activeEffects.length > 0;
  if (hasEotEffects && eotSaveSucceeded) {
    const idsToRemove = new Set<SpellId>();
    for (const ae of c.activeEffects) {
      if (ae.expiresAt === "end") idsToRemove.add(ae.spellId as SpellId);
    }
    if (idsToRemove.size > 0) {
      for (const spellId of idsToRemove) c = removeEffect(c, spellId);
    }
  }
  let baseCreatures: Creatures;
  if (hasEotEffects && eotDmg > 0) {
    const r = applyDamageWithConcBreak(
      cs,
      activeId,
      c,
      eotDmg,
      eotDt,
      eotConSave,
    );
    c = r.creature;
    baseCreatures = r.creatures;
  } else {
    baseCreatures = cs;
  }
  let result = setCreature(baseCreatures, activeId, c);
  result = advanceEffectsAtPhase(result, activeId, "end");
  c = result.get(activeId)!;
  const oldConcId = cs.get(activeId)!.concentrationSpellId;
  if (
    Option.isSome(oldConcId) &&
    Option.isNone(result.get(activeId)!.concentrationSpellId)
  ) {
    result = breakConcentrationAndPropagate(result, activeId);
  }
  return normalizeBattleGrapples(result);
}

/** Return the index of the matching Help entry to consume, or -1 if none applies. */
export function findHelpAdvantage(
  helpTargets: ReadonlyArray<HelpTarget>,
  attackerId: CreatureId,
  targetId: CreatureId,
): number {
  return helpTargets.findIndex(
    (h) => h.allyId === attackerId && h.targetEnemyId === targetId,
  );
}

/** Remove the consumed Help entry by index. */
export function consumeHelp(
  helpTargets: ReadonlyArray<HelpTarget>,
  idx: number,
): ReadonlyArray<HelpTarget> {
  return [...helpTargets.slice(0, idx), ...helpTargets.slice(idx + 1)];
}
