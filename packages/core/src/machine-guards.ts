import { Option } from "effect"

import {
  canEnterRage as tsCanEnterRage,
  canUseBrutalStrike,
  canUseIntimidatingPresence as tsCanUseIP,
  canUseRelentlessRage
} from "#/features/class-barbarian.ts"
import { hasFontOfInspiration, hasPeerlessSkill } from "#/features/class-bard.ts"
import { canUseActionSurge, canUseIndomitable, canUseSecondWind, canUseTacticalMind } from "#/features/class-fighter.ts"
import { canUseNaturesVeil, canUseTireless } from "#/features/class-ranger.ts"
import { canUseCunningAction, maxCunningStrikeEffects } from "#/features/class-rogue.ts"
import {
  canConvertPointsToSlot,
  canConvertSlotToPoints,
  canUseInnateSorcery,
  canUseMetamagic,
} from "#/features/class-sorcerer.ts"
import { canEldritchSmite, canUseMagicalCunning, mysticArcanumLevels } from "#/features/class-warlock.ts"
import { arcaneRecoveryMaxLevels, canArcaneRecoverSlot, hasOverchannel } from "#/features/class-wizard.ts"
import { dmgR, dsR, fallR } from "#/machine-damage.ts"
import {
  addDeathFailures,
  effectiveMaxHp,
  MAX_EXHAUSTION,
  spendHalfSpeed,
  type TakeDamageResult
} from "#/machine-helpers.ts"
import { isIncapacitated } from "#/machine-queries.ts"
import { computeShortRest } from "#/machine-spells.ts"
import { asShortRest, asSpendHitDie, asTakeDamage, type DndContext, type DndEvent } from "#/machine-types.ts"
import type { MetamagicOption } from "#/features/class-sorcerer.ts"
import type { SpellSlotLevel } from "#/types.ts"
import { spellSlotLevel } from "#/types.ts"

type GuardArg = { context: DndContext; event: DndEvent }

const isInstantDeath = (r: TakeDamageResult) => r.dmgThrough > 0 && r.newHp === 0 && r.overflow >= r.effMax
const isDropToZero = (r: TakeDamageResult) => r.dmgThrough > 0 && r.newHp === 0 && r.overflow < r.effMax
const isInstantDeathFromDying = (r: TakeDamageResult) => r.dmgThrough > 0 && r.dmgThrough >= r.effMax

export function canUseHeroicInspirationNow(context: DndContext): boolean {
  return context.classStates.fighter?.heroicInspiration ?? false
}

export function legalMetamagicOptions(context: DndContext): ReadonlyArray<MetamagicOption> {
  const ss = context.classStates.sorcerer
  if (!ss) return []
  if (isIncapacitated(context) || ss.level < 2) return []
  // Query-time legality mirrors the same core-owned rules as execution.
  // This can legitimately become empty mid-cast after a non-stackable option
  // has already been applied, which means the query surface should omit
  // USE_METAMAGIC entirely rather than advertising an empty/invalid choice set.
  const state = {
    sorcererLevel: ss.level,
    sorceryPoints: ss.sorceryPoints,
    bonusActionUsed: context.bonusActionUsed,
    nonCantripActionSpellCast: context.nonCantripActionSpellCast,
    knownMetamagicOptions: ss.knownMetamagicOptions,
    metamagicUsedThisCast: ss.metamagicUsedThisCast,
    apotheosisUsedThisTurn: ss.apotheosisUsedThisTurn,
    innateSorceryActive: ss.innateSorceryActive
  }
  return [...ss.knownMetamagicOptions].filter((option) => canUseMetamagic(state, option))
}

function legalPreparedSlotLevels(
  slotsCurrent: ReadonlyArray<number>,
  predicate: (slotLevel: number) => boolean,
): ReadonlyArray<SpellSlotLevel> {
  return slotsCurrent.flatMap((count, index) => {
    const level = index + 1
    return count > 0 && predicate(level) ? [spellSlotLevel(level)] : []
  })
}

export function legalConvertSlotToPointsLevels(context: DndContext): ReadonlyArray<SpellSlotLevel> {
  const ss = context.classStates.sorcerer
  if (!ss || isIncapacitated(context) || ss.level < 2) return []
  return legalPreparedSlotLevels(
    context.slotsCurrent,
    (slotLevel) =>
      canConvertSlotToPoints(
        {
          sorceryPoints: ss.sorceryPoints,
          sorceryPointsMax: ss.sorceryPointsMax,
          slotsCurrent: context.slotsCurrent,
        },
        slotLevel,
      ),
  )
}

export function legalConvertPointsToSlotLevels(context: DndContext): ReadonlyArray<SpellSlotLevel> {
  const ss = context.classStates.sorcerer
  if (!ss || isIncapacitated(context) || ss.level < 2 || context.bonusActionUsed) return []
  return [1, 2, 3, 4, 5].flatMap((slotLevel) => {
    const idx = slotLevel - 1
    if (idx >= context.slotsCurrent.length || context.slotsCurrent[idx] >= context.slotsMax[idx]) return []
    return canConvertPointsToSlot(
      {
        sorceryPoints: ss.sorceryPoints,
        slotsCurrent: context.slotsCurrent,
        sorcererLevel: ss.level,
        bonusActionUsed: context.bonusActionUsed,
      },
      slotLevel,
    )
      ? [spellSlotLevel(slotLevel)]
      : []
  })
}

export function legalArcaneRecoveryLevels(context: DndContext): ReadonlyArray<SpellSlotLevel> {
  const ws = context.classStates.wizard
  if (!ws || ws.level < 1 || ws.arcaneRecoveryUsed) return []
  const budget = arcaneRecoveryMaxLevels(ws.level)
  return context.slotsCurrent.flatMap((count, index) => {
    const level = index + 1
    if (count >= context.slotsMax[index]) return []
    return canArcaneRecoverSlot(level) && level <= budget ? [spellSlotLevel(level)] : []
  })
}

export function legalMysticArcanumLevels(context: DndContext): ReadonlyArray<SpellSlotLevel> {
  const ws = context.classStates.warlock
  if (!ws || isIncapacitated(context) || ws.level < 11) return []
  return mysticArcanumLevels(ws.level)
    .filter((level) => !ws.mysticArcanumUsed.has(level))
    .map((level) => spellSlotLevel(level))
}

export function legalFontSlotRestoreLevels(context: DndContext): ReadonlyArray<SpellSlotLevel> {
  const bs = context.classStates.bard
  if (!bs || isIncapacitated(context) || bs.level < 5 || bs.bardicInspirationCharges >= bs.bardicInspirationMax) return []
  return legalPreparedSlotLevels(context.slotsCurrent, () => true)
}

export function legalWildResurgenceChargeLevels(context: DndContext): ReadonlyArray<SpellSlotLevel> {
  const ds = context.classStates.druid
  if (!ds || isIncapacitated(context) || ds.level < 5 || ds.wildShapeCharges !== 0) return []
  return legalPreparedSlotLevels(context.slotsCurrent, () => true)
}

export function legalDivineSmiteLevels(context: DndContext): ReadonlyArray<SpellSlotLevel> {
  const ps = context.classStates.paladin
  if (!ps || isIncapacitated(context) || ps.level < 2 || context.bonusActionUsed) return []
  return legalPreparedSlotLevels(context.slotsCurrent, () => true)
}

export function legalLayOnHandsAmounts(context: DndContext): ReadonlyArray<number> {
  const ps = context.classStates.paladin
  if (!ps || isIncapacitated(context) || context.bonusActionUsed || ps.layOnHandsPool <= 0) return []
  return Array.from({ length: ps.layOnHandsPool }, (_value, index) => index + 1)
}

export const guards = {
  instantDeathFromAlive: ({ context: c, event: e }: GuardArg) => isInstantDeath(dmgR(c, e)),
  dropsToZeroHp: ({ context: c, event: e }: GuardArg) => isDropToZero(dmgR(c, e)),
  noDamageThrough: ({ context: c, event: e }: GuardArg) => dmgR(c, e).dmgThrough === 0,
  instantDeathFromDying: ({ context: c, event: e }: GuardArg) => isInstantDeathFromDying(dmgR(c, e)),
  deathFromDamageFailures: ({ context: c, event: e }: GuardArg) => {
    const r = dmgR(c, e)
    if (r.dmgThrough === 0) return false
    return addDeathFailures(c.deathSaves.failures, asTakeDamage(e).isCritical).isDead
  },
  deathSaveRegainsConsciousness: ({ context: c, event: e }: GuardArg) => dsR(c, e).regainsConsciousness,
  deathSaveStabilizes: ({ context: c, event: e }: GuardArg) => dsR(c, e).isStabilized,
  deathSaveDies: ({ context: c, event: e }: GuardArg) => dsR(c, e).isDead,
  fallInstantDeath: ({ context: c, event: e }: GuardArg) => isInstantDeath(fallR(c, e)),
  fallDropsToZero: ({ context: c, event: e }: GuardArg) => isDropToZero(fallR(c, e)),
  fallInstantDeathFromDying: ({ context: c, event: e }: GuardArg) => isInstantDeathFromDying(fallR(c, e)),
  fallNoDamage: ({ context: c, event: e }: GuardArg) => fallR(c, e).effAmount === 0,
  deathFromFallFailures: ({ context: c, event: e }: GuardArg) => {
    const r = fallR(c, e)
    if (r.dmgThrough === 0) return false
    return addDeathFailures(c.deathSaves.failures, false).isDead
  },
  monsterSuffocates: ({ context: c }: GuardArg) => c.hp > 0 && c.creatureKind === "Monster",
  canSuffocate: ({ context: c }: GuardArg) => c.hp > 0,
  shortRestHeals: ({ context: c, event: e }: GuardArg) => {
    if (c.inCombat) return false
    const ev = asShortRest(e)
    const r = computeShortRest(c.hp, c.maxHp, c.hitDiceRemaining, c.pactSlotsMax, ev.conMod, ev.hdRolls)
    return c.hp === 0 && r.newHp > 0
  },
  longRestHeals: ({ context: c }: GuardArg) => !c.inCombat && c.hp >= 1,
  hitDieHeals: ({ context: c, event: e }: GuardArg) => {
    const ev = asSpendHitDie(e)
    if (c.hitDiceRemaining[ev.className] <= 0) return false
    return c.hp === 0 && Math.max(0, ev.dieRoll + ev.conMod) > 0
  },
  exhaustionDeath: ({ context: c }: GuardArg) => c.exhaustion >= MAX_EXHAUSTION,
  canStandFromProne: ({ context: c }: GuardArg) =>
    !isIncapacitated(c) && c.effectiveSpeed > 0 && spendHalfSpeed(c.movementRemaining, c.effectiveSpeed).success,
  shouldBreakConcentration: ({ context: c }: GuardArg) => Option.isNone(c.concentrationSpellId),
  canExpendSlot: ({ context: c }: GuardArg) => c.hp > 0 && !isIncapacitated(c),
  contextDead: ({ context: c }: GuardArg) => c.dead,
  hpZeroUnconscious: ({ context: c }: GuardArg) => c.hp === 0 && c.unconscious,
  isOutOfCombat: ({ context: c }: GuardArg) => !c.inCombat,
  regainedConsciousness: ({ context: c }: GuardArg) => c.hp > 0 && !c.dead,
  canConcentrate: ({ context: c }: GuardArg) => !c.dead && !isIncapacitated(c),
  // Monster death at 0 HP: SRD "Monsters and Death" — monsters die instead of entering death save track
  monsterDropsToZeroHp: ({ context: c, event: e }: GuardArg) =>
    c.creatureKind === "Monster" && isDropToZero(dmgR(c, e)),
  monsterFallDropsToZero: ({ context: c, event: e }: GuardArg) =>
    c.creatureKind === "Monster" && isDropToZero(fallR(c, e)),
  // Catch-all: if a monster is at 0 HP in dying state, it should be dead
  monsterAtZeroHp: ({ context: c }: GuardArg) => c.creatureKind === "Monster" && c.hp === 0,
  // Sync damageTrack sub-state with context when parallel branch (e.g. initTurn) changes stable/unstable
  contextStable: ({ context: c }: GuardArg) => c.stable,
  contextUnstable: ({ context: c }: GuardArg) => !c.stable && !c.dead && c.hp === 0,

  // ── R2.0: Resource guards (action economy) ──

  hasAction: ({ context: c }: GuardArg) => c.actionsRemaining > 0 && !isIncapacitated(c),
  hasBonusAction: ({ context: c }: GuardArg) => !c.bonusActionUsed && !isIncapacitated(c),
  hasReaction: ({ context: c }: GuardArg) => c.reactionAvailable,
  hasBonusMovement: ({ context: c }: GuardArg) => c.bonusMovementRemaining > 0,
  hasExtraAttack: ({ context: c }: GuardArg) => c.extraAttacksRemaining > 0,

  // ── R2.1: Fighter guards ──

  canSecondWind: ({ context: c }: GuardArg) => {
    const fs = c.classStates.fighter
    if (!fs) return false
    return (
      !isIncapacitated(c) &&
      canUseSecondWind({
        hp: c.hp,
        maxHp: effectiveMaxHp(c.maxHp),
        secondWindCharges: fs.secondWindCharges,
        bonusActionUsed: c.bonusActionUsed
      })
    )
  },
  canActionSurge: ({ context: c }: GuardArg) => {
    const fs = c.classStates.fighter
    if (!fs) return false
    return (
      !isIncapacitated(c) &&
      canUseActionSurge({
        actionSurgeCharges: fs.actionSurgeCharges,
        actionSurgeUsedThisTurn: fs.actionSurgeUsedThisTurn,
        actionsRemaining: c.actionsRemaining
      })
    )
  },
  canIndomitable: ({ context: c }: GuardArg) => {
    const fs = c.classStates.fighter
    if (!fs) return false
    return canUseIndomitable(fs.level, fs.indomitableCharges)
  },
  canTacticalMind: ({ context: c }: GuardArg) => {
    const fs = c.classStates.fighter
    if (!fs) return false
    return !isIncapacitated(c) && canUseTacticalMind(fs.secondWindCharges, fs.level, true)
  },
  canScoreCriticalHit: ({ context: c }: GuardArg) => {
    const fLevel = c.classStates.fighter?.level ?? 0
    return !isIncapacitated(c) && fLevel >= 3
  },

  // ── R2.2: Barbarian guards ──

  canEnterRage: ({ context: c }: GuardArg) => {
    const bs = c.classStates.barbarian
    if (!bs) return false
    return !c.bonusActionUsed && !isIncapacitated(c) && !bs.raging && tsCanEnterRage(bs.rageCharges, "none")
  },
  canExtendRageBA: ({ context: c }: GuardArg) => {
    const bs = c.classStates.barbarian
    if (!bs) return false
    return bs.raging && !c.bonusActionUsed
  },
  canDeclareReckless: ({ context: c }: GuardArg) => {
    const bs = c.classStates.barbarian
    if (!bs) return false
    return !bs.recklessThisTurn && bs.level >= 2
  },
  canIntimidatingPresence: ({ context: c }: GuardArg) => {
    const bs = c.classStates.barbarian
    if (!bs) return false
    return tsCanUseIP(bs.level, c.bonusActionUsed, bs.intimidatingPresenceUsed)
  },
  canBrutalStrike: ({ context: c }: GuardArg) => {
    const bs = c.classStates.barbarian
    if (!bs) return false
    return (
      !isIncapacitated(c) && canUseBrutalStrike(bs.recklessThisTurn, bs.level, true) && !bs.brutalStrikeUsedThisTurn
    )
  },
  isRaging: ({ context: c }: GuardArg) => !!c.classStates.barbarian?.raging,
  canRelentlessRage: ({ context: c }: GuardArg) => {
    const bs = c.classStates.barbarian
    if (!bs) return false
    return !isIncapacitated(c) && canUseRelentlessRage(bs.level, bs.raging)
  },

  // ── R2.3: Monk guards ──

  canMonkFreeBA: ({ context: c }: GuardArg) => {
    const ms = c.classStates.monk
    if (!ms) return false
    return !c.bonusActionUsed && !isIncapacitated(c) && ms.level >= 2
  },
  canMonkFocusBA: ({ context: c }: GuardArg) => {
    const ms = c.classStates.monk
    if (!ms) return false
    return !c.bonusActionUsed && !isIncapacitated(c) && ms.level >= 2 && ms.focusPoints >= 1
  },
  canStunningStrike: ({ context: c }: GuardArg) => {
    const ms = c.classStates.monk
    if (!ms) return false
    return !isIncapacitated(c) && ms.level >= 5 && !ms.stunningStrikeUsedThisTurn && ms.focusPoints >= 1
  },
  canWholenessOfBody: ({ context: c }: GuardArg) => {
    const ms = c.classStates.monk
    if (!ms) return false
    return !isIncapacitated(c) && ms.level >= 6 && ms.wholenessCharges > 0 && !c.bonusActionUsed
  },
  canUncannyMetabolism: ({ context: c }: GuardArg) => {
    const ms = c.classStates.monk
    if (!ms) return false
    return !isIncapacitated(c) && ms.level >= 2 && !ms.uncannyMetabolismUsed
  },

  // ── R2.4: Rogue guards ──

  canSneakAttack: ({ context: c }: GuardArg) => {
    const rs = c.classStates.rogue
    if (!rs) return false
    return !isIncapacitated(c) && rs.level >= 1 && !rs.sneakAttackUsedThisTurn
  },
  canSteadyAim: ({ context: c }: GuardArg) => {
    const rs = c.classStates.rogue
    if (!rs) return false
    return (
      !isIncapacitated(c) &&
      rs.level >= 3 &&
      !rs.steadyAimUsedThisTurn &&
      !c.bonusActionUsed &&
      c.movementRemaining === c.effectiveSpeed
    )
  },
  canCunningAction: ({ context: c }: GuardArg) => {
    const rs = c.classStates.rogue
    if (!rs) return false
    return !isIncapacitated(c) && canUseCunningAction(rs.level, c.bonusActionUsed)
  },
  canUncannyDodge: ({ context: c }: GuardArg) => {
    const rs = c.classStates.rogue
    if (!rs) return false
    return !isIncapacitated(c) && rs.level >= 5 && c.reactionAvailable
  },
  canCunningStrike: ({ context: c }: GuardArg) => {
    const rs = c.classStates.rogue
    if (!rs) return false
    return (
      !isIncapacitated(c) &&
      rs.level >= 5 &&
      rs.sneakAttackUsedThisTurn &&
      rs.cunningStrikeUsesThisTurn < maxCunningStrikeEffects(rs.level)
    )
  },

  // ── R2.5: Spellcaster guards ──

  // Wizard
  canArcaneRecovery: ({ context: c }: GuardArg) => {
    const ws = c.classStates.wizard
    if (!ws) return false
    return ws.level >= 1 && !ws.arcaneRecoveryUsed
  },
  canOverchannel: ({ context: c }: GuardArg) => {
    const ws = c.classStates.wizard
    if (!ws) return false
    return !isIncapacitated(c) && hasOverchannel(ws.level)
  },

  // Cleric
  canClericCD: ({ context: c }: GuardArg) => {
    const cs = c.classStates.cleric
    if (!cs) return false
    return !isIncapacitated(c) && cs.level >= 2 && cs.clericChannelDivinityCharges > 0
  },

  // Paladin
  canLayOnHands: ({ context: c }: GuardArg) => {
    const ps = c.classStates.paladin
    if (!ps) return false
    return !isIncapacitated(c) && !c.bonusActionUsed && ps.layOnHandsPool > 0
  },
  canPaladinCD: ({ context: c }: GuardArg) => {
    const ps = c.classStates.paladin
    if (!ps) return false
    return !isIncapacitated(c) && ps.level >= 3 && ps.paladinChannelDivinityCharges > 0
  },
  canDivineSmite: ({ context: c }: GuardArg) => {
    const ps = c.classStates.paladin
    if (!ps) return false
    return !isIncapacitated(c) && ps.level >= 2 && !c.bonusActionUsed
  },
  canDivineSmiteFree: ({ context: c }: GuardArg) => {
    const ps = c.classStates.paladin
    if (!ps) return false
    return !isIncapacitated(c) && ps.level >= 2 && !c.bonusActionUsed && !ps.smiteFreeUsed
  },

  // Bard
  canBardicInspiration: ({ context: c }: GuardArg) => {
    const bs = c.classStates.bard
    if (!bs) return false
    return !isIncapacitated(c) && bs.level >= 1 && bs.bardicInspirationCharges > 0 && !c.bonusActionUsed
  },
  canCuttingWords: ({ context: c }: GuardArg) => {
    const bs = c.classStates.bard
    if (!bs) return false
    return !isIncapacitated(c) && bs.level >= 3 && bs.bardicInspirationCharges > 0 && c.reactionAvailable
  },
  canFontSlotRestore: ({ context: c }: GuardArg) => {
    const bs = c.classStates.bard
    if (!bs) return false
    return (
      !isIncapacitated(c) && hasFontOfInspiration(bs.level) && bs.bardicInspirationCharges < bs.bardicInspirationMax
    )
  },
  canPeerlessSkill: ({ context: c }: GuardArg) => {
    const bs = c.classStates.bard
    if (!bs) return false
    return !isIncapacitated(c) && hasPeerlessSkill(bs.level) && bs.bardicInspirationCharges > 0
  },

  // Warlock
  canMagicalCunning: ({ context: c }: GuardArg) => {
    const ws = c.classStates.warlock
    if (!ws) return false
    return !isIncapacitated(c) && canUseMagicalCunning(ws.level, ws.magicalCunningUsed)
  },
  canMysticArcanum: ({ context: c }: GuardArg) => {
    const ws = c.classStates.warlock
    if (!ws) return false
    return !isIncapacitated(c) && ws.level >= 11
  },
  canEldritchSmite: ({ context: c }: GuardArg) => {
    const ws = c.classStates.warlock
    if (!ws) return false
    return !isIncapacitated(c) && canEldritchSmite(ws.level) && c.pactSlotsCurrent > 0 && !ws.eldritchSmiteUsedThisTurn
  },

  // Sorcerer
  canConvertSlotToPoints: ({ context: c }: GuardArg) => {
    const ss = c.classStates.sorcerer
    if (!ss) return false
    return !isIncapacitated(c) && ss.level >= 2
  },
  canConvertPointsToSlot: ({ context: c }: GuardArg) => {
    const ss = c.classStates.sorcerer
    if (!ss) return false
    return !isIncapacitated(c) && ss.level >= 2 && !c.bonusActionUsed
  },
  canHeroicInspiration: ({ context: c }: GuardArg) => canUseHeroicInspirationNow(c),
  canInnateSorcery: ({ context: c }: GuardArg) => {
    const ss = c.classStates.sorcerer
    if (!ss) return false
    if (isIncapacitated(c)) return false
    return canUseInnateSorcery({
      innateSorceryActive: ss.innateSorceryActive,
      innateSorceryCharges: ss.innateSorceryCharges,
      sorceryPoints: ss.sorceryPoints,
      sorcererLevel: ss.level,
      bonusActionUsed: c.bonusActionUsed
    })
  },
  canMetamagic: ({ context: c }: GuardArg) => {
    return legalMetamagicOptions(c).length > 0
  },

  // Druid
  canEnterWildShape: ({ context: c }: GuardArg) => {
    const ds = c.classStates.druid
    if (!ds) return false
    return !isIncapacitated(c) && ds.level >= 2 && ds.wildShapeCharges > 0 && !c.bonusActionUsed && !ds.inWildShape
  },
  canExitWildShape: ({ context: c }: GuardArg) => {
    const ds = c.classStates.druid
    if (!ds) return false
    return !isIncapacitated(c) && ds.inWildShape && !c.bonusActionUsed
  },
  canWildResurgenceCharge: ({ context: c }: GuardArg) => {
    const ds = c.classStates.druid
    if (!ds) return false
    return !isIncapacitated(c) && ds.level >= 5 && ds.wildShapeCharges === 0
  },
  canWildResurgenceSlot: ({ context: c }: GuardArg) => {
    const ds = c.classStates.druid
    if (!ds) return false
    return !isIncapacitated(c) && ds.level >= 5 && ds.wildShapeCharges > 0 && !ds.wildResurgenceSlotUsedThisLR
  },

  // Ranger
  canFreeHuntersMark: ({ context: c }: GuardArg) => {
    const rs = c.classStates.ranger
    if (!rs) return false
    return !isIncapacitated(c) && rs.level >= 1 && rs.huntersMarkFreeUses > 0
  },
  canTireless: ({ context: c }: GuardArg) => {
    const rs = c.classStates.ranger
    if (!rs) return false
    return !isIncapacitated(c) && canUseTireless(rs.level, rs.tirelessCharges) && c.actionsRemaining > 0
  },
  canNaturesVeil: ({ context: c }: GuardArg) => {
    const rs = c.classStates.ranger
    if (!rs) return false
    return !isIncapacitated(c) && canUseNaturesVeil(rs.level, rs.naturesVeilCharges, !c.bonusActionUsed)
  }
}
