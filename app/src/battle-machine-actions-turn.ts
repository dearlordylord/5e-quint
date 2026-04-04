import { freshCaster, freshCreature } from "#/battle-machine-creature.ts"
import {
  activeId,
  dealDamage,
  heal,
  isHit,
  nextTurn,
  processEndTurn,
  processStartTurn,
  setCreature,
  spendAction
} from "#/battle-machine-helpers.ts"
import type { BattleActionArgs, BattleContext, BattleCreatureState, CreatureId } from "#/battle-machine-types.ts"
import { BP_ACTIVE_TURN } from "#/battle-machine-types.ts"

export function battleInit({ event: e }: BattleActionArgs<"BATTLE_INIT">): Partial<BattleContext> {
  const creatures = new Map<CreatureId, BattleCreatureState>()
  const initiative: Array<CreatureId> = []
  for (const cfg of e.creatures) {
    const base = cfg.caster ? freshCaster(cfg.maxHp, cfg.kind) : freshCreature(cfg.maxHp, cfg.kind)
    creatures.set(cfg.id, {
      ...base,
      ...(cfg.rogueLevel != null ? { rogueLevel: cfg.rogueLevel } : {}),
      ...(cfg.monkLevel != null ? { monkLevel: cfg.monkLevel } : {}),
      ...(cfg.legendaryActions != null ? { legendaryActionsRemaining: cfg.legendaryActions } : {}),
      ...(cfg.legendaryResistances != null ? { legendaryResistancesRemaining: cfg.legendaryResistances } : {}),
      ...(cfg.preparedSpells != null ? { preparedSpells: cfg.preparedSpells } : {})
    })
    initiative.push(cfg.id)
  }
  return {
    creatures,
    initiative,
    turnIndex: 0,
    round: 1,
    phase: BP_ACTIVE_TURN,
    spellStack: [],
    turnStarted: false
  }
}

export function battleStartTurn({
  context: c,
  event: e
}: BattleActionArgs<"BATTLE_START_TURN">): Partial<BattleContext> {
  if (c.phase.tag !== "BPActiveTurn" || c.turnStarted) return {}
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
  return { creatures: result, turnStarted: true }
}

export function battleEndTurn({ context: c, event: e }: BattleActionArgs<"BATTLE_END_TURN">): Partial<BattleContext> {
  if (c.phase.tag !== "BPActiveTurn") return {}
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
      phase: { tag: "BPAwaitingLegendaryAction", la: { eligibleMonsters: laEligible, endingTurnIndex: c.turnIndex } }
    }
  }
  const nt = nextTurn(c.turnIndex, c.initiative.length, c.round)
  return { creatures: cs, turnIndex: nt.idx, round: nt.round, phase: BP_ACTIVE_TURN, turnStarted: false }
}

export function battleLegendaryPass({ context: c }: BattleActionArgs<"BATTLE_LEGENDARY_PASS">): Partial<BattleContext> {
  if (c.phase.tag !== "BPAwaitingLegendaryAction") return {}
  const nt = nextTurn(c.turnIndex, c.initiative.length, c.round)
  return { turnIndex: nt.idx, round: nt.round, phase: BP_ACTIVE_TURN, turnStarted: false }
}

export function battleLegendaryAttack({
  context: c,
  event: e
}: BattleActionArgs<"BATTLE_LEGENDARY_ATTACK">): Partial<BattleContext> {
  if (c.phase.tag !== "BPAwaitingLegendaryAction") return {}
  const m = c.creatures.get(e.monsterId)!
  let cs = setCreature(c.creatures, e.monsterId, { ...m, legendaryActionsRemaining: m.legendaryActionsRemaining - 1 })
  if (isHit(e.laAtkRoll, e.laTgtAc)) cs = dealDamage(cs, e.laTarget, e.laDmg, e.laDt, e.laCrit)
  const nt = nextTurn(c.turnIndex, c.initiative.length, c.round)
  return { creatures: cs, turnIndex: nt.idx, round: nt.round, phase: BP_ACTIVE_TURN, turnStarted: false }
}

export function battleHeal({ context: c, event: e }: BattleActionArgs<"BATTLE_HEAL">): Partial<BattleContext> {
  if (c.phase.tag !== "BPActiveTurn") return {}
  const id = activeId(c)
  const ac = c.creatures.get(id)!
  if (ac.dead || ac.actionsRemaining <= 0) return {}
  let cs = setCreature(c.creatures, id, spendAction(ac, "magic"))
  cs = setCreature(cs, e.targetId, heal(cs.get(e.targetId)!, e.amount))
  return { creatures: cs }
}
