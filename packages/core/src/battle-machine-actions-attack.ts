import { Match } from "effect";

import {
  battleMainHandDamageDie,
  endHidden,
  prepareHandsForSpellComponents,
  isIncapacitated,
} from "#/battle-machine-creature.ts";
import {
  activeId,
  advanceFromHitPhase,
  awaitingReaction,
  byTag,
  applyDamageWithAfterReactions,
  expendSlot,
  firstAvailableSpellSlotLevel,
  isHit,
  isHitWithAttackRollBonus,
  legalDamageReactionsByCreature,
  legalHitReactions,
  mkAwait,
  redirectableAlliesByReactor,
  consumeHelp,
  findHelpAdvantage,
  piAfterDamage,
  piAttackDamage,
  piAttackHit,
  returnToState,
  setCreature,
  setDifference,
  spendAction,
  spendExtraAttack,
  spendReaction,
  triggerQualifiersFromAttack,
} from "#/battle-machine-helpers.ts";
import type {
  AfterDamageReturn,
  AttackHitCtx,
  BattleActionArgs,
  BattleContext,
  BattleCreatureState,
  PhaseFields,
} from "#/battle-machine-types.ts";
import { ADR_ACTIVE_TURN, phaseAwaitReaction } from "#/battle-machine-types.ts";
import { bardicInspirationDie } from "#/features/class-bard.ts";
import { deflectAttacksResult } from "#/features/class-monk-features.ts";
import { uncannyDodgeDamage } from "#/features/class-rogue.ts";
import {
  aggregateAttackMods,
  hasAttackDisadvantageSource,
} from "#/machine-combat.ts";
import type {
  AdvantageDamageDice,
  AttackContext,
  CreatureId,
  DamageQualifier,
  DamageType,
  FullAttackMods,
  WeaponProperty,
} from "#/types.ts";
import { armorClass, UNARMED_STRIKE_PROFILE } from "#/types.ts";

type Creatures = ReadonlyMap<CreatureId, BattleCreatureState>;

function squaresBetween(
  a: BattleCreatureState,
  b: BattleCreatureState,
): number {
  return Math.max(
    Math.abs(a.battlePosition.row - b.battlePosition.row),
    Math.abs(a.battlePosition.col - b.battlePosition.col),
  );
}

function greatWeaponFightingEligible(
  attacker: BattleCreatureState,
  isMelee: boolean,
  weaponProperties: ReadonlySet<WeaponProperty>,
): boolean {
  return (
    attacker.greatWeaponFightingDamageFloor &&
    isMelee &&
    attacker.leftHandUse === "mainWeapon" &&
    attacker.rightHandUse === "mainWeapon" &&
    (weaponProperties.has("twoHanded") || weaponProperties.has("versatile"))
  );
}

function battleWeaponDamage(
  attacker: BattleCreatureState,
  isMelee: boolean,
  weaponProperties: ReadonlySet<WeaponProperty>,
  diceCount: number,
  dieSize: number,
  fallbackDamage: number,
  damageDieRolls?: ReadonlyArray<number>,
): number | null {
  const useFloor = greatWeaponFightingEligible(
    attacker,
    isMelee,
    weaponProperties,
  );
  if (damageDieRolls == null) return useFloor ? null : fallbackDamage;
  if (damageDieRolls.length !== diceCount) return null;
  if (
    damageDieRolls.some(
      (roll) => !Number.isInteger(roll) || roll < 1 || roll > dieSize,
    )
  )
    return null;
  return damageDieRolls.reduce(
    (sum, roll) => sum + (useFloor && roll <= 2 ? 3 : roll),
    0,
  );
}

function averageDiceDamage(dice: AdvantageDamageDice): number {
  return dice.diceCount * Math.floor((dice.dieSize + 1) / 2);
}

/** Build AttackContext from battle creature state + per-attack parameters. */
export function buildBattleAttackContext(
  cs: Creatures,
  attackerId: CreatureId,
  targetId: CreatureId,
  isMelee: boolean,
  weaponProperties: ReadonlySet<WeaponProperty>,
  attackerWithin5ft: boolean,
  hostileWithin5ft: boolean,
  targetCanSeeAttacker: boolean,
  attackerCanSeeTarget: boolean,
  frightSourceInLOS: boolean,
  helpAdvantage = false,
): AttackContext {
  const atk = cs.get(attackerId)!;
  const tgt = cs.get(targetId)!;
  const attackerGrappled = atk.grappledBy != null || atk.grappled;
  return {
    attackerBlinded: atk.blinded,
    attackerProne: atk.prone,
    attackerRestrained: atk.restrained,
    attackerPoisoned: atk.poisoned,
    attackerFrightened: atk.frightened,
    attackerFrightSourceInLOS: frightSourceInLOS,
    targetBlinded: tgt.blinded,
    targetParalyzed: tgt.paralyzed,
    targetPetrified: tgt.petrified,
    targetStunned: tgt.stunned,
    targetUnconscious: tgt.unconscious,
    targetRestrained: tgt.restrained,
    targetProne: tgt.prone,
    attackerWithin5ft,
    targetDodging: tgt.dodging,
    targetIncapacitated: isIncapacitated(tgt),
    targetSpeedZero: tgt.effectiveSpeed === 0,
    targetCanSeeAttacker: targetCanSeeAttacker && atk.hiddenDiscoveryDc <= 0,
    attackerCanSeeTarget,
    attackerHelpedAgainstTarget: helpAdvantage,
    isRangedAttack: !isMelee,
    beyondNormalRange: false,
    hostileWithin5ft,
    isHeavyWeapon: weaponProperties.has("heavy"),
    wielderStrScore: 16, // not modeled in battle; safe default
    wielderDexScore: 14,
    attackerGrappled,
    targetIsGrappler: atk.grappledBy === targetId,
    underwater: false,
    attackerHasSwimSpeed: false,
    isUnderwaterMeleeException: false,
    isUnderwaterRangedException: false,
    attackerReckless: atk.recklessThisTurn,
    targetReckless: tgt.recklessThisTurn,
  };
}

/** Shared attack resolution: determines hit, enters reaction chain or deals damage. */
export function resolveAttack(
  cs: Creatures,
  attackerId: CreatureId,
  targetId: CreatureId,
  attackRoll: number,
  targetAc: number,
  damage: number,
  damageType: DamageType,
  damageQualifiers: ReadonlySet<DamageQualifier>,
  isCritical: boolean,
  critRange: number,
  returnTo: AfterDamageReturn,
  knockOut: boolean,
  isMelee: boolean,
  attackerWithin5ft: boolean,
  attackerWithin60ft: boolean,
  targetCanSeeAttackerAtHit: boolean,
  mods: FullAttackMods,
  weaponIsRanged: boolean,
  onHitEffect: AttackHitCtx["onHitEffect"],
  weaponProperties: ReadonlySet<WeaponProperty>,
  extraDamageOnAdvantageHit: AdvantageDamageDice | undefined,
  hasAllyAdjacentToTarget: boolean,
  hasAnyDisadvantageSource: boolean,
  saDmg: number,
  hitReactionCandidates: ReadonlySet<CreatureId>,
): { creatures: Map<CreatureId, BattleCreatureState> } & PhaseFields {
  const cs0 = new Map(cs);
  const attackRollBonus = weaponIsRanged
    ? cs0.get(attackerId)!.rangedWeaponAttackRollBonus
    : 0;
  const target = cs0.get(targetId)!;
  const effectiveTargetAc =
    targetAc + (target.isWearingArmor ? target.defenseArmorClassBonus : 0);
  const hit =
    !mods.autoMiss &&
    isHitWithAttackRollBonus(
      attackRoll,
      effectiveTargetAc,
      critRange,
      attackRollBonus,
    );
  const csAfterAttackRoll = setCreature(
    cs0,
    attackerId,
    endHidden(cs0.get(attackerId)!),
  );
  if (!hit) {
    return { creatures: csAfterAttackRoll, ...returnToState(returnTo) };
  }
  const atk = csAfterAttackRoll.get(attackerId)!;
  const meleeDmgBonus = isMelee ? atk.meleeDamageBonus : 0; // rage bonus: melee only (D1 fix)
  // Sneak Attack eligibility (SRD 5.2.1 Rogue "Sneak Attack")
  const eligibleWeapon = weaponProperties.has("finesse") || !isMelee;
  const saEligible =
    atk.sneakAttackDice > 0 &&
    !atk.sneakAttackUsedThisTurn &&
    eligibleWeapon &&
    !hasAnyDisadvantageSource &&
    (mods.hasAdvantage || hasAllyAdjacentToTarget);
  const effectiveSaDmg = saEligible ? saDmg : 0;
  const effectiveCrit = isCritical || mods.autoCrit;
  const effectiveAdvantageRiderDmg =
    mods.hasAdvantage && extraDamageOnAdvantageHit != null
      ? averageDiceDamage(extraDamageOnAdvantageHit) * (effectiveCrit ? 2 : 1)
      : 0;
  const totalDmg =
    damage + meleeDmgBonus + effectiveSaDmg + effectiveAdvantageRiderDmg;
  const effectiveKnockOut = knockOut && isMelee; // SRD: knock out is melee only
  const cs1 = saEligible
    ? setCreature(csAfterAttackRoll, attackerId, {
        ...atk,
        sneakAttackUsedThisTurn: true,
      })
    : csAfterAttackRoll;
  const atkCtx: AttackHitCtx = {
    attacker: attackerId,
    target: targetId,
    attackRoll,
    targetAc: armorClass(effectiveTargetAc),
    damage: totalDmg,
    damageType,
    damageQualifiers,
    isCritical: effectiveCrit,
    critRange,
    atkReturnTo: returnTo,
    knockOut: effectiveKnockOut,
    onHitEffect,
    targetCanSeeAttackerAtHit,
    attackerWithin5ftAtHit: attackerWithin5ft,
    attackerWithin60ftAtHit: attackerWithin60ft,
    isMeleeAttack: isMelee,
    isRangedWeaponAttack: weaponIsRanged,
    isWeaponAttack: onHitEffect == null,
    redirectableAlliesByReactor: new Map(),
    legalReactionsByCreature: new Map(),
  };
  const redirectableAllies = redirectableAlliesByReactor(cs1, atkCtx);
  const legalReactionsByCreature = legalHitReactions(
    cs1,
    atkCtx,
    hitReactionCandidates,
  );
  const elig = new Set(legalReactionsByCreature.keys());
  const hitCtx = {
    ...atkCtx,
    redirectableAlliesByReactor: redirectableAllies,
    legalReactionsByCreature,
  };
  if (elig.size > 0) {
    return {
      creatures: new Map(cs1),
      ...phaseAwaitReaction(
        mkAwait({ tag: "PIAttackHit", ctx: hitCtx }, "TAttackHits", elig),
      ),
    };
  }
  return advanceFromHitPhase(cs1, hitCtx, attackerId);
}

export function battleAttack({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_ATTACK">): Partial<BattleContext> {
  if (!c.turnStarted) return {};
  const id = activeId(c);
  const ac = c.creatures.get(id)!;
  const tc = c.creatures.get(e.targetId)!;
  if (ac.dead || isIncapacitated(ac) || tc.dead) return {};
  if (ac.actionsRemaining <= 0 && ac.extraAttacksRemaining <= 0) return {};
  const weapon = ac.mainHandWeapon ?? UNARMED_STRIKE_PROFILE;
  const isMeleeAttack = e.isMelee;
  const weaponProperties = new Set<WeaponProperty>(
    e.weaponProperties ?? weapon.properties ?? [],
  );
  if (e.isFinesse) weaponProperties.add("finesse");
  const expectedDamageDie = battleMainHandDamageDie(ac, isMeleeAttack);
  if (
    expectedDamageDie != null &&
    ac.mainHandWeapon != null &&
    ac.mainHandWeapon.properties.has("versatile") &&
    e.dieSize !== expectedDamageDie
  ) {
    return {};
  }
  let updatedAc =
    ac.attackActionUsed && ac.extraAttacksRemaining > 0
      ? spendExtraAttack(ac)
      : spendAction(ac, "attack");
  if (isMeleeAttack && weaponProperties.has("light")) {
    updatedAc = { ...updatedAc, lightAttackUsedThisTurn: true };
  }
  const cs = setCreature(c.creatures, id, updatedAc);
  const helpIdx = findHelpAdvantage(c.helpTargets, id, e.targetId);
  const ctx = buildBattleAttackContext(
    cs,
    id,
    e.targetId,
    isMeleeAttack,
    weaponProperties,
    e.attackerWithin5ft,
    e.hostileWithin5ft,
    e.targetCanSeeAttacker,
    e.attackerCanSeeTarget,
    e.frightSourceInLOS,
    helpIdx >= 0,
  );
  const mods = aggregateAttackMods(ctx);
  const hasAnyDisadvantageSource = hasAttackDisadvantageSource(ctx);
  const damage = battleWeaponDamage(
    ac,
    isMeleeAttack,
    weaponProperties,
    e.diceCount,
    e.dieSize,
    e.dmg,
    e.damageDieRolls,
  );
  if (damage == null) return {};
  const result = resolveAttack(
    cs,
    id,
    e.targetId,
    e.attackRoll,
    e.tAc,
    damage,
    e.dt,
    e.damageQualifiers ?? weapon.damageQualifiers ?? new Set(),
    e.crit,
    ac.critRange,
    ADR_ACTIVE_TURN,
    e.knockOut,
    isMeleeAttack,
    e.attackerWithin5ft,
    e.attackerWithin60ft ?? false,
    e.targetCanSeeAttacker,
    mods,
    !weapon.isMelee,
    e.onHitEffect,
    weaponProperties,
    weapon.statBlockAttackSource?.extraDamageOnAdvantageHit,
    e.hasAllyAdjacentToTarget,
    hasAnyDisadvantageSource,
    e.saDmg,
    e.hitReactionCandidates,
  );
  return helpIdx >= 0
    ? { ...result, helpTargets: consumeHelp(c.helpTargets, helpIdx) }
    : result;
}

export function battleResolveHitReaction({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_RESOLVE_HIT_REACTION">): Partial<BattleContext> {
  const aw = awaitingReaction(c);
  if (!aw) return {};
  const pi = piAttackHit(aw.interrupt);
  if (!pi) return {};
  const atk = pi.ctx;
  if (
    setDifference(aw.eligible, aw.offered).size === 0 ||
    e.reactorId === null
  ) {
    const result = advanceFromHitPhase(c.creatures, atk, activeId(c));
    return {
      creatures: result.creatures,
      awaitCtx: result.awaitCtx,
      aoeCtx: result.aoeCtx,
      movementCtx: result.movementCtx,
      laCtx: result.laCtx,
    };
  }
  const newOffered = new Set(aw.offered);
  newOffered.add(e.reactorId);
  if (!aw.eligible.has(e.reactorId)) return {};
  const legalReactions = atk.legalReactionsByCreature.get(e.reactorId);
  if (e.decision.tag !== "RPass" && !legalReactions?.has(e.decision.tag))
    return {};
  if (
    e.decision.tag === "RRedirectAttack" &&
    !atk.redirectableAlliesByReactor.get(e.reactorId)?.has(e.decision.allyId)
  ) {
    return {};
  }
  // TODO: This generic hit-reaction resolver currently owns the concrete rule
  // mutations for Shield, Parry, Cutting Words, and Goblin Boss Redirect
  // Attack, including the swap-and-retarget path. Keep parity, but move these
  // rule-specific branches toward the owning reaction surfaces when refactoring.
  const retroAtk = Match.value(e.decision).pipe(
    byTag("RShield", () => ({
      ...atk,
      targetAc: armorClass(atk.targetAc + 5),
    })),
    byTag("RParry", (d) => ({
      ...atk,
      targetAc: armorClass(atk.targetAc + d.bonus),
    })),
    byTag("RCuttingWords", (d) => ({
      ...atk,
      attackRoll: atk.attackRoll - d.reduction,
    })),
    byTag("RRedirectAttack", (d) => ({
      ...atk,
      target: d.allyId,
      targetAc:
        e.reactorId == null
          ? atk.targetAc
          : atk.redirectableAlliesByReactor.get(e.reactorId)!.get(d.allyId)!,
    })),
    byTag("RPass", () => atk),
    Match.exhaustive,
  );
  if (retroAtk !== atk) {
    if (e.reactorId == null) return {};
    const reactor = c.creatures.get(e.reactorId)!;
    const updatedReactor = Match.value(e.decision).pipe(
      byTag("RShield", () => {
        const slotLevel = firstAvailableSpellSlotLevel(reactor);
        return slotLevel == null
          ? reactor
          : expendSlot(
              spendReaction(prepareHandsForSpellComponents(reactor)),
              slotLevel,
            );
      }),
      byTag("RParry", (d) =>
        d.bonus === reactor.parryAcBonus ? spendReaction(reactor) : reactor,
      ),
      byTag("RCuttingWords", (d) => {
        const maxReduction = bardicInspirationDie(reactor.bardLevel);
        if (
          d.reduction < 1 ||
          d.reduction > maxReduction ||
          reactor.bardicInspirationCharges <= 0
        )
          return reactor;
        return {
          ...spendReaction(reactor),
          bardicInspirationCharges: reactor.bardicInspirationCharges - 1,
        };
      }),
      byTag("RRedirectAttack", () => spendReaction(reactor)),
      byTag("RPass", () => reactor),
      Match.exhaustive,
    );
    if (updatedReactor === reactor) return {};
    let cs = setCreature(c.creatures, e.reactorId, updatedReactor);
    let rebuiltAtk = retroAtk;
    if (e.decision.tag === "RRedirectAttack") {
      const ally = cs.get(e.decision.allyId)!;
      cs = setCreature(cs, e.reactorId, {
        ...cs.get(e.reactorId)!,
        battlePosition: ally.battlePosition,
      });
      cs = setCreature(cs, e.decision.allyId, {
        ...ally,
        battlePosition: reactor.battlePosition,
      });
      const attacker = cs.get(atk.attacker)!;
      const redirectedTarget = cs.get(e.decision.allyId)!;
      const redirectedSquares = squaresBetween(attacker, redirectedTarget);
      rebuiltAtk = {
        ...retroAtk,
        targetCanSeeAttackerAtHit: atk.targetCanSeeAttackerAtHit,
        attackerWithin5ftAtHit: redirectedSquares <= 1,
        attackerWithin60ftAtHit: redirectedSquares * 5 <= 60,
      };
    }
    const hitReactionCandidates = new Set(atk.legalReactionsByCreature.keys());
    const rebuiltRedirectableAllies = redirectableAlliesByReactor(
      cs,
      rebuiltAtk,
    );
    const rebuiltHitCtx: AttackHitCtx = {
      ...rebuiltAtk,
      redirectableAlliesByReactor: rebuiltRedirectableAllies,
      legalReactionsByCreature: legalHitReactions(
        cs,
        rebuiltAtk,
        hitReactionCandidates,
      ),
    };
    const newElig = new Set(rebuiltHitCtx.legalReactionsByCreature.keys());
    for (const offeredId of newOffered) newElig.delete(offeredId);
    return {
      creatures: cs,
      ...phaseAwaitReaction({
        interrupt: { tag: "PIAttackHit", ctx: rebuiltHitCtx },
        trigger: "TAttackHits",
        eligible: newElig,
        offered: newOffered,
      }),
    };
  }
  return { ...phaseAwaitReaction({ ...aw, offered: newOffered }) };
}

export function battleResolveDmgReaction({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_RESOLVE_DMG_REACTION">): Partial<BattleContext> {
  const aw = awaitingReaction(c);
  if (!aw) return {};
  const pi = piAttackDamage(aw.interrupt);
  if (!pi) return {};
  const atk = pi.ctx;
  if (
    setDifference(aw.eligible, aw.offered).size === 0 ||
    e.reactorId === null
  ) {
    const result = applyDamageWithAfterReactions(
      c.creatures,
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
    return {
      creatures: result.creatures,
      awaitCtx: result.awaitCtx,
      aoeCtx: result.aoeCtx,
      movementCtx: result.movementCtx,
      laCtx: result.laCtx,
    };
  }
  const newOffered = new Set(aw.offered);
  newOffered.add(e.reactorId);
  const reactor = c.creatures.get(e.reactorId)!;
  if (e.reactorId !== atk.target || !aw.eligible.has(e.reactorId)) return {};
  const legalReactions = atk.legalReactionsByCreature.get(e.reactorId);
  if (e.decision.tag !== "RPass" && !legalReactions?.has(e.decision.tag))
    return {};
  const newDmg = Match.value(e.decision).pipe(
    byTag("RUncannyDodge", () => uncannyDodgeDamage(atk.damage)),
    byTag(
      "RDeflectAttacks",
      (d) => deflectAttacksResult(atk.damage, d.amount).damageTaken,
    ),
    byTag("RPass", () => atk.damage),
    Match.exhaustive,
  );
  if (newDmg !== atk.damage) {
    const cs = setCreature(c.creatures, e.reactorId, spendReaction(reactor));
    const newElig = new Set(aw.eligible);
    newElig.delete(e.reactorId);
    const reducedCtx = { ...atk, damage: newDmg };
    return {
      creatures: cs,
      ...phaseAwaitReaction({
        interrupt: {
          tag: "PIAttackDamage",
          ctx: {
            ...reducedCtx,
            legalReactionsByCreature: legalDamageReactionsByCreature(
              cs,
              reducedCtx,
            ),
          },
        },
        trigger: "TAttackDamages",
        eligible: newElig,
        offered: newOffered,
      }),
    };
  }
  return { ...phaseAwaitReaction({ ...aw, offered: newOffered }) };
}

export function battleAfterDamageDecline({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_AFTER_DAMAGE_DECLINE">): Partial<BattleContext> {
  const aw = awaitingReaction(c);
  if (!aw) return {};
  const pi = piAfterDamage(aw.interrupt);
  if (!pi) return {};
  const ad = pi.ctx;
  if (setDifference(aw.eligible, aw.offered).size === 0 || e.reactorId === null)
    return { ...returnToState(ad.returnTo) };
  const newOffered = new Set(aw.offered);
  newOffered.add(e.reactorId);
  return { ...phaseAwaitReaction({ ...aw, offered: newOffered }) };
}

export function battleAfterDamageSpellReaction({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_AFTER_DAMAGE_SPELL_REACTION">): Partial<BattleContext> {
  const aw = awaitingReaction(c);
  if (!aw) return {};
  const pi = piAfterDamage(aw.interrupt);
  if (!pi) return {};
  const ad = pi.ctx;
  if (e.reactorId === null) return {};
  const reactor = c.creatures.get(e.reactorId);
  if (
    reactor == null ||
    !aw.eligible.has(e.reactorId) ||
    !reactor.reactionAvailable ||
    e.reactorId !== ad.damagedCreature ||
    !ad.sourceVisibleToDamagedCreature ||
    !ad.sourceWithin60ftOfDamagedCreature ||
    !reactor.preparedSpells.has("hellish_rebuke") ||
    !reactor.slotsCurrent.some((remaining) => remaining > 0)
  ) {
    return {};
  }
  const slotLevel = firstAvailableSpellSlotLevel(reactor);
  if (slotLevel == null) return {};
  const cs1 = setCreature(
    c.creatures,
    e.reactorId,
    expendSlot(spendReaction(reactor), slotLevel),
  );
  const actualDmg = e.reactionSaved
    ? Math.trunc(e.reactionDmg / 2)
    : e.reactionDmg;
  const result = applyDamageWithAfterReactions(
    cs1,
    ad.damageSource,
    e.reactorId,
    actualDmg,
    e.reactionDt,
    new Set(),
    false,
    false,
    ad.returnTo,
  );
  return { ...result };
}

export function battleAfterDamageRetaliation({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_AFTER_DAMAGE_RETALIATION">): Partial<BattleContext> {
  const aw = awaitingReaction(c);
  if (!aw) return {};
  const pi = piAfterDamage(aw.interrupt);
  if (!pi) return {};
  const ad = pi.ctx;
  if (e.reactorId === null) return {};
  const reactor = c.creatures.get(e.reactorId);
  if (
    reactor == null ||
    !aw.eligible.has(e.reactorId) ||
    !reactor.reactionAvailable ||
    e.reactorId !== ad.damagedCreature ||
    !ad.sourceWithin5ftOfDamagedCreature ||
    reactor.barbarianLevel < 10
  ) {
    return {};
  }
  const cs1 = setCreature(c.creatures, e.reactorId, spendReaction(reactor));
  const newOffered = new Set(aw.offered);
  newOffered.add(e.reactorId);
  if (!isHit(e.retAtkRoll, e.retTgtAc))
    return {
      creatures: cs1,
      ...phaseAwaitReaction({ ...aw, offered: newOffered }),
    };
  const result = applyDamageWithAfterReactions(
    cs1,
    ad.damageSource,
    e.reactorId,
    e.retDmg,
    e.retDt,
    new Set(),
    e.retCrit,
    false,
    ad.returnTo,
  );
  return { ...result };
}

export function battleAfterDamageReactiveEffect({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_AFTER_DAMAGE_REACTIVE_EFFECT">): Partial<BattleContext> {
  const aw = awaitingReaction(c);
  if (!aw) return {};
  const pi = piAfterDamage(aw.interrupt);
  if (!pi) return {};
  const ad = pi.ctx;
  if (e.reactorId === null) return {};
  const reactor = c.creatures.get(e.reactorId);
  const payload = reactor?.activeEffects.find(
    (effect) => effect.reactivePayload?.trigger === "meleeHitWithin5ft",
  )?.reactivePayload;
  if (
    reactor == null ||
    payload == null ||
    !aw.eligible.has(e.reactorId) ||
    e.reactorId !== ad.damagedCreature ||
    !ad.sourceWithin5ftOfDamagedCreature ||
    !ad.sourceHitWithMeleeAttackRoll ||
    e.reactionDt !== payload.damageType
  ) {
    return {};
  }
  const result = applyDamageWithAfterReactions(
    c.creatures,
    ad.damageSource,
    e.reactorId,
    e.reactionDmg,
    e.reactionDt,
    new Set(),
    false,
    false,
    ad.returnTo,
  );
  return { ...result };
}
