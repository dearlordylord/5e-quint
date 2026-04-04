import { resolveAttack } from "#/battle-machine-actions-attack.ts"
import { freshCaster, freshCreature, isIncapacitated } from "#/battle-machine-creature.ts"
import {
  activeId,
  heal,
  nextTurn,
  processEndTurn,
  processStartTurn,
  setCreature,
  spendAction
} from "#/battle-machine-helpers.ts"
import type { BattleActionArgs, BattleContext, BattleCreatureState, CreatureId } from "#/battle-machine-types.ts"
import { PHASE_ACTIVE, phaseAwaitingLegendary } from "#/battle-machine-types.ts"

/** Effective initiative roll: surprised = Disadvantage (min of two d20s). */
export function effectiveInitRoll(roll1: number, roll2: number, surprised: boolean): number {
  return surprised ? Math.min(roll1, roll2) : roll1
}

export function battleInit({ event: e }: BattleActionArgs<"BATTLE_INIT">): Partial<BattleContext> {
  const creatures = new Map<CreatureId, BattleCreatureState>()
  const scored = e.creatures.map((cfg) => ({
    cfg,
    score: effectiveInitRoll(
      cfg.initiativeRoll ?? 10,
      cfg.initiativeRollB ?? cfg.initiativeRoll ?? 10,
      cfg.surprised ?? false
    )
  }))
  // Stable sort: ES2019+ guarantees Array.sort stability.
  const sorted = [...scored].sort((a, b) => b.score - a.score)
  const initiative: Array<CreatureId> = []
  for (const { cfg } of sorted) {
    const base = cfg.caster ? freshCaster(cfg.maxHp, cfg.kind) : freshCreature(cfg.maxHp, cfg.kind)
    creatures.set(cfg.id, {
      ...base,
      ...(cfg.rogueLevel != null ? { rogueLevel: cfg.rogueLevel } : {}),
      ...(cfg.monkLevel != null ? { monkLevel: cfg.monkLevel } : {}),
      ...(cfg.legendaryActions != null ? { legendaryActionsRemaining: cfg.legendaryActions } : {}),
      ...(cfg.legendaryResistances != null ? { legendaryResistancesRemaining: cfg.legendaryResistances } : {}),
      ...(cfg.preparedSpells != null ? { preparedSpells: cfg.preparedSpells } : {}),
      ...(cfg.hasEvasion != null ? { hasEvasion: cfg.hasEvasion } : {}),
      ...(cfg.saveMiscBonus != null ? { saveMiscBonus: cfg.saveMiscBonus } : {}),
      ...(cfg.critRange != null ? { critRange: cfg.critRange } : {}),
      ...(cfg.fighterLevel != null && cfg.fighterLevel >= 2
        ? { actionSurgeCharges: cfg.fighterLevel >= 17 ? 2 : 1, actionSurgeUsedThisTurn: false }
        : {})
    })
    initiative.push(cfg.id)
  }
  return {
    creatures,
    initiative,
    turnIndex: 0,
    round: 1,
    ...PHASE_ACTIVE,
    spellStack: [],
    turnStarted: false
  }
}

export function battleStartTurn({
  context: c,
  event: e
}: BattleActionArgs<"BATTLE_START_TURN">): Partial<BattleContext> {
  if (c.turnStarted) return {}
  const id = activeId(c)
  const creature = c.creatures.get(id)!
  let cs: Map<CreatureId, BattleCreatureState> = new Map(c.creatures)
  if (creature.creatureKind === "Monster") {
    cs = setCreature(cs, id, { ...creature, legendaryActionsRemaining: 3 })
  }
  let rechargedAbilities: ReadonlyArray<string> | undefined
  if (creature.creatureKind === "Monster") {
    const minRolls: Record<string, number> = { breath_weapon: 5 }
    const recharged: Array<string> = []
    for (const [name, available] of Object.entries(cs.get(id)!.rechargeAvailable)) {
      if (!available && e.rechargeD6 >= (minRolls[name] ?? 5)) recharged.push(name)
    }
    if (recharged.length > 0) rechargedAbilities = recharged
  }
  const result = processStartTurn(
    cs,
    id,
    e.sotDmg,
    e.sotDt,
    e.sotHeal,
    e.sotSaveResult,
    e.sotConSave,
    rechargedAbilities,
    e.deathSaveRoll
  )
  // Reset fighter per-turn state
  const afterFs = result.get(id)!
  const resetResult = setCreature(result, id, { ...afterFs, actionSurgeUsedThisTurn: false })
  return { creatures: resetResult, turnStarted: true }
}

export function battleEndTurn({ context: c, event: e }: BattleActionArgs<"BATTLE_END_TURN">): Partial<BattleContext> {
  const id = activeId(c)
  const cs = processEndTurn(c.creatures, id, e.eotSaveSucceeded, e.eotDmg, e.eotDt, e.eotConSave)
  const laEligible = new Set<CreatureId>()
  for (const [cid, cr] of cs) {
    if (
      cid !== id &&
      cr.creatureKind === "Monster" &&
      cr.legendaryActionsRemaining > 0 &&
      !cr.dead &&
      cr.incapacitatedSources.size === 0
    )
      laEligible.add(cid)
  }
  if (laEligible.size > 0) {
    return {
      creatures: cs,
      ...phaseAwaitingLegendary({ eligibleMonsters: laEligible, endingTurnIndex: c.turnIndex })
    }
  }
  const nt = nextTurn(c.turnIndex, c.initiative.length, c.round)
  return { creatures: cs, turnIndex: nt.idx, round: nt.round, ...PHASE_ACTIVE, turnStarted: false }
}

export function battleLegendaryPass({ context: c }: BattleActionArgs<"BATTLE_LEGENDARY_PASS">): Partial<BattleContext> {
  const nt = nextTurn(c.turnIndex, c.initiative.length, c.round)
  return { turnIndex: nt.idx, round: nt.round, ...PHASE_ACTIVE, turnStarted: false }
}

export function battleLegendaryAttack({
  context: c,
  event: e
}: BattleActionArgs<"BATTLE_LEGENDARY_ATTACK">): Partial<BattleContext> {
  const m = c.creatures.get(e.monsterId)!
  const cs = setCreature(c.creatures, e.monsterId, { ...m, legendaryActionsRemaining: m.legendaryActionsRemaining - 1 })
  const laReturn = { tag: "ADRAwaitingLegendaryAction" as const, la: c.laCtx! }
  return resolveAttack(
    cs,
    e.monsterId,
    e.laTarget,
    e.laAtkRoll,
    e.laTgtAc,
    e.laDmg,
    e.laDt,
    e.laCrit,
    m.critRange,
    laReturn
  )
}

export function battleHeal({ context: c, event: e }: BattleActionArgs<"BATTLE_HEAL">): Partial<BattleContext> {
  const id = activeId(c)
  const ac = c.creatures.get(id)!
  if (ac.dead || isIncapacitated(ac) || ac.actionsRemaining <= 0) return {}
  let cs = setCreature(c.creatures, id, spendAction(ac, "magic"))
  cs = setCreature(cs, e.targetId, heal(cs.get(e.targetId)!, e.amount))
  return { creatures: cs }
}

type SimpleActionType = "dash" | "disengage" | "dodge"

function simpleAction(c: BattleContext, actionType: SimpleActionType): Partial<BattleContext> {
  const id = activeId(c)
  const ac = c.creatures.get(id)!
  if (ac.dead || isIncapacitated(ac) || ac.actionsRemaining <= 0) return {}
  return { creatures: setCreature(c.creatures, id, spendAction(ac, actionType)) }
}

export function battleDash({ context: c }: BattleActionArgs<"BATTLE_DASH">): Partial<BattleContext> {
  return simpleAction(c, "dash")
}

export function battleDisengage({ context: c }: BattleActionArgs<"BATTLE_DISENGAGE">): Partial<BattleContext> {
  return simpleAction(c, "disengage")
}

export function battleDodge({ context: c }: BattleActionArgs<"BATTLE_DODGE">): Partial<BattleContext> {
  return simpleAction(c, "dodge")
}

export function battleActionSurge({ context: c }: BattleActionArgs<"BATTLE_ACTION_SURGE">): Partial<BattleContext> {
  const id = activeId(c)
  const ac = c.creatures.get(id)!
  if (isIncapacitated(ac) || ac.actionSurgeCharges <= 0 || ac.actionSurgeUsedThisTurn) return {}
  return {
    creatures: setCreature(c.creatures, id, {
      ...ac,
      actionsRemaining: ac.actionsRemaining + 1,
      actionSurgeActionPending: true,
      actionSurgeCharges: ac.actionSurgeCharges - 1,
      actionSurgeUsedThisTurn: true
    })
  }
}
