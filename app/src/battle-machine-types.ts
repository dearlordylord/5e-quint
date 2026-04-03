/**
 * Battle-level XState machine types — mirrors battle.qnt state variables and types.
 * Flat context with Map<CreatureId, BattleCreature>, phase as discriminated union.
 */
import type { ActiveEffect, Condition, CreatureKind, DamageType, IncapSource } from "#/types.ts"

export type CreatureId = string

export interface BattleCreatureState {
  readonly hp: number
  readonly maxHp: number
  readonly tempHp: number
  readonly deathSaves: { readonly successes: number; readonly failures: number }
  readonly stable: boolean
  readonly dead: boolean
  readonly blinded: boolean
  readonly charmed: boolean
  readonly deafened: boolean
  readonly exhaustion: number
  readonly frightened: boolean
  readonly grappled: boolean
  readonly invisible: boolean
  readonly paralyzed: boolean
  readonly petrified: boolean
  readonly poisoned: boolean
  readonly prone: boolean
  readonly restrained: boolean
  readonly stunned: boolean
  readonly unconscious: boolean
  readonly incapacitatedSources: ReadonlySet<IncapSource>
  readonly activeEffects: ReadonlyArray<ActiveEffect>
  // TurnState
  readonly movementRemaining: number
  readonly effectiveSpeed: number
  readonly actionsRemaining: number
  readonly attackActionUsed: boolean
  readonly bonusActionUsed: boolean
  readonly reactionAvailable: boolean
  readonly freeInteractionUsed: boolean
  readonly extraAttacksRemaining: number
  readonly disengaged: boolean
  readonly dodging: boolean
  readonly readiedAction: boolean
  readonly bonusActionSpellCast: boolean
  readonly nonCantripActionSpellCast: boolean
  readonly bonusMovementRemaining: number
  readonly bonusMovementOAFree: boolean
  readonly actionSurgeActionPending: boolean
  readonly slotExpendedThisTurn: boolean
  // SpellSlotState
  readonly slotsMax: ReadonlyArray<number>
  readonly slotsCurrent: ReadonlyArray<number>
  readonly pactSlotsMax: number
  readonly pactSlotsCurrent: number
  readonly pactSlotLevel: number
  readonly concentrationSpellId: string
  // MonsterResourceState
  readonly legendaryActionsRemaining: number
  readonly legendaryResistancesRemaining: number
  readonly rechargeAvailable: Readonly<Record<string, boolean>>
  readonly dailyUsesRemaining: Readonly<Record<string, number>>
  // Identity
  readonly creatureKind: CreatureKind
  // Class levels tracked by battle Combatant
  readonly rogueLevel: number
  readonly monkLevel: number
  // Prepared spells (for CS eligibility)
  readonly preparedSpells: ReadonlySet<string>
}

export interface AttackHitCtx {
  readonly attacker: CreatureId
  readonly target: CreatureId
  readonly attackRoll: number
  readonly targetAc: number
  readonly damage: number
  readonly damageType: DamageType
  readonly isCritical: boolean
  readonly atkReturnTo: AfterDamageReturn
}

export interface AttackDamageCtx {
  readonly attacker: CreatureId
  readonly target: CreatureId
  readonly damage: number
  readonly damageType: DamageType
  readonly isCritical: boolean
  readonly atkReturnTo: AfterDamageReturn
}

export interface AfterDamageCtx {
  readonly damageSource: CreatureId
  readonly damagedCreature: CreatureId
  readonly damageDealt: number
  readonly damageType: DamageType
  readonly returnTo: AfterDamageReturn
}

export type AfterDamageReturn =
  | { readonly tag: "ADRActiveTurn" }
  | { readonly tag: "ADRResolvingAoE"; readonly aoe: AoESpellCtx }
  | { readonly tag: "ADRResolvingMovement"; readonly mv: MovementCtx }

export const ADR_ACTIVE_TURN: AfterDamageReturn = { tag: "ADRActiveTurn" }

export interface SaveSpellCtx {
  readonly caster: CreatureId
  readonly target: CreatureId
  readonly saveDC: number
  readonly saveRoll: number
  readonly damageOnFail: number
  readonly halfOnSuccess: boolean
  readonly damageType: DamageType
  readonly conditionOnFail: Condition
  readonly applyCondition: boolean
}

export interface SaveFailedCtx {
  readonly caster: CreatureId
  readonly target: CreatureId
  readonly damageOnFail: number
  readonly halfOnSuccess: boolean
  readonly damageType: DamageType
  readonly conditionOnFail: Condition
  readonly applyCondition: boolean
  readonly saveSucceeded: boolean
}

export interface AoESpellCtx {
  readonly caster: CreatureId
  readonly saveDC: number
  readonly damageOnFail: number
  readonly halfOnSuccess: boolean
  readonly damageType: DamageType
  readonly conditionOnFail: Condition
  readonly applyCondition: boolean
  readonly remaining: ReadonlySet<CreatureId>
}

export interface ConcentrationCtx {
  readonly caster: CreatureId
  readonly target: CreatureId
  readonly spellId: string
  readonly duration: number
  readonly conditionOnFail: Condition
  readonly applyCondition: boolean
}

export interface SpellCastCtx {
  readonly caster: CreatureId
  readonly spellName: string
  readonly postCast: PostCastEffect
  readonly slotLvl: number
  readonly ritual: boolean
}

export type PostCastEffect =
  | { readonly tag: "PCESave"; readonly save: SaveSpellCtx }
  | { readonly tag: "PCEAoE"; readonly aoe: AoESpellCtx }
  | { readonly tag: "PCECounterspell"; readonly cs: CounterspellEffect }
  | { readonly tag: "PCEConcentration"; readonly conc: ConcentrationCtx }
  | { readonly tag: "PCEDone" }

export interface CounterspellEffect {
  readonly targetCasterId: CreatureId
  readonly conSaveSucceeded: boolean
}

export interface SpellStackEntry {
  readonly spellCasterId: CreatureId
  readonly spellPostCast: PostCastEffect
  readonly offered: ReadonlySet<CreatureId>
  readonly slotLvl: number
  readonly spellName: string
  readonly ritual: boolean
}

export interface MovementCtx {
  readonly mover: CreatureId
  readonly threatenedBy: ReadonlySet<CreatureId>
  readonly processed: ReadonlySet<CreatureId>
}

export interface LAWindowCtx {
  readonly eligibleMonsters: ReadonlySet<CreatureId>
  readonly endingTurnIndex: number
}

export interface AwaitCtx {
  readonly interrupt: PendingInterrupt
  readonly trigger: TriggerType
  readonly eligible: ReadonlySet<CreatureId>
  readonly offered: ReadonlySet<CreatureId>
}

export type TriggerType = "TAttackHits" | "TAttackDamages" | "TSpellBeingCast" | "TSaveFailed" | "TDamageTaken"

// Reaction decision unions — one per interrupt point, mirroring Quint's ReactionDecision
export type HitReactionDecision =
  | { readonly tag: "RPass" }
  | { readonly tag: "RShield" }
  | { readonly tag: "RParry"; readonly bonus: number }
  | { readonly tag: "RCuttingWords"; readonly reduction: number }

export type DmgReactionDecision =
  | { readonly tag: "RPass" }
  | { readonly tag: "RUncannyDodge" }
  | { readonly tag: "RDamageReduction"; readonly amount: number }

export type CSDecision =
  | { readonly tag: "RPass" }
  | { readonly tag: "RCounterspell"; readonly saveSucceeded: boolean }
  | null

export type SaveFailedDecision = { readonly tag: "RPass" } | { readonly tag: "RLegendaryResistance" }

export type PendingInterrupt =
  | { readonly tag: "PIAttackHit"; readonly ctx: AttackHitCtx }
  | { readonly tag: "PIAttackDamage"; readonly ctx: AttackDamageCtx }
  | { readonly tag: "PISpellCast"; readonly ctx: SpellCastCtx }
  | { readonly tag: "PISaveFailed"; readonly ctx: SaveFailedCtx }
  | { readonly tag: "PISaveFailedAoE"; readonly sf: SaveFailedCtx; readonly aoe: AoESpellCtx }
  | { readonly tag: "PIAfterDamage"; readonly ctx: AfterDamageCtx }

export type BattlePhase =
  | { readonly tag: "BPActiveTurn" }
  | { readonly tag: "BPAwaitingReaction"; readonly ctx: AwaitCtx }
  | { readonly tag: "BPResolvingAoE"; readonly aoe: AoESpellCtx }
  | { readonly tag: "BPResolvingMovement"; readonly mv: MovementCtx }
  | { readonly tag: "BPAwaitingLegendaryAction"; readonly la: LAWindowCtx }

export const BP_ACTIVE_TURN: BattlePhase = { tag: "BPActiveTurn" }

export interface BattleContext {
  readonly creatures: ReadonlyMap<CreatureId, BattleCreatureState>
  readonly initiative: ReadonlyArray<CreatureId>
  readonly turnIndex: number
  readonly round: number
  readonly turnStarted: boolean
  readonly phase: BattlePhase
  readonly spellStack: ReadonlyArray<SpellStackEntry>
}

export type BattleEvent =
  | {
      readonly type: "BATTLE_INIT"
      readonly hp1: number
      readonly hp2: number
      readonly hp3: number
      readonly hp4: number
    }
  | {
      readonly type: "BATTLE_START_TURN"
      readonly rechargeD6: number
      readonly sotDmg: number
      readonly sotDt: DamageType
      readonly sotHeal: number
      readonly sotSaveResult: boolean
      readonly sotConSave: boolean
    }
  | {
      readonly type: "BATTLE_ATTACK"
      readonly targetId: CreatureId
      readonly attackRoll: number
      readonly dmg: number
      readonly dt: DamageType
      readonly crit: boolean
      readonly tAc: number
    }
  | {
      readonly type: "BATTLE_RESOLVE_HIT_REACTION"
      readonly reactorId: CreatureId | null
      readonly decision: HitReactionDecision
    }
  | {
      readonly type: "BATTLE_RESOLVE_DMG_REACTION"
      readonly reactorId: CreatureId | null
      readonly decision: DmgReactionDecision
    }
  | { readonly type: "BATTLE_AFTER_DAMAGE_PASS"; readonly reactorId: CreatureId | null }
  | {
      readonly type: "BATTLE_AFTER_DAMAGE_HELLISH_REBUKE"
      readonly reactorId: CreatureId | null
      readonly rebukeDmg: number
      readonly rebukeSaved: boolean
    }
  | {
      readonly type: "BATTLE_AFTER_DAMAGE_RETALIATION"
      readonly reactorId: CreatureId | null
      readonly retAtkRoll: number
      readonly retDmg: number
      readonly retDt: DamageType
      readonly retCrit: boolean
      readonly retTgtAc: number
    }
  | {
      readonly type: "BATTLE_CAST_SAVE_SPELL"
      readonly targetId: CreatureId
      readonly saveDC: number
      readonly saveRoll: number
      readonly dmgOnFail: number
      readonly halfOnSave: boolean
      readonly dt: DamageType
      readonly cond: Condition
      readonly applyCond: boolean
      readonly slotLvl: number
      readonly spellName: string
      readonly ritual: boolean
    }
  | {
      readonly type: "BATTLE_RESOLVE_COUNTERSPELL"
      readonly reactorId: CreatureId | null
      readonly decision: CSDecision
      readonly csSlotLvl: number
    }
  | {
      readonly type: "BATTLE_RESOLVE_SAVE_FAILED_REACTION"
      readonly reactorId: CreatureId | null
      readonly decision: SaveFailedDecision
    }
  | {
      readonly type: "BATTLE_CAST_CONCENTRATION_SPELL"
      readonly targetId: CreatureId
      readonly slotLvl: number
      readonly duration: number
      readonly spellId: string
      readonly cond: Condition
      readonly applyCond: boolean
      readonly ritual: boolean
    }
  | { readonly type: "BATTLE_CONCENTRATION_CHECK"; readonly targetId: CreatureId; readonly conSaveSucceeded: boolean }
  | {
      readonly type: "BATTLE_CAST_AOE"
      readonly saveDC: number
      readonly dmgOnFail: number
      readonly halfOnSave: boolean
      readonly dt: DamageType
      readonly cond: Condition
      readonly applyCond: boolean
      readonly slotLvl: number
      readonly spellName: string
      readonly ritual: boolean
    }
  | { readonly type: "BATTLE_RESOLVE_AOE_TARGET"; readonly targetId: CreatureId | null; readonly saveRoll: number }
  | { readonly type: "BATTLE_MOVE"; readonly threatened: ReadonlySet<CreatureId> }
  | { readonly type: "BATTLE_MOVEMENT_OA_PASS"; readonly reactorId: CreatureId | null }
  | {
      readonly type: "BATTLE_MOVEMENT_OA_ATTACK"
      readonly reactorId: CreatureId | null
      readonly oaAtkRoll: number
      readonly oaDmg: number
      readonly oaDt: DamageType
      readonly oaCrit: boolean
      readonly oaTgtAc: number
    }
  | {
      readonly type: "BATTLE_END_TURN"
      readonly eotSaveSucceeded: boolean
      readonly eotDmg: number
      readonly eotDt: DamageType
      readonly eotConSave: boolean
    }
  | { readonly type: "BATTLE_LEGENDARY_PASS" }
  | {
      readonly type: "BATTLE_LEGENDARY_ATTACK"
      readonly monsterId: CreatureId
      readonly laTarget: CreatureId
      readonly laAtkRoll: number
      readonly laDmg: number
      readonly laDt: DamageType
      readonly laCrit: boolean
      readonly laTgtAc: number
    }
  | { readonly type: "BATTLE_HEAL"; readonly targetId: CreatureId; readonly amount: number }

export const FRESH_TURN_STATE = {
  movementRemaining: 30,
  effectiveSpeed: 30,
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
  bonusMovementRemaining: 0,
  bonusMovementOAFree: false,
  actionSurgeActionPending: false,
  slotExpendedThisTurn: false
} as const

export const EMPTY_SLOTS: ReadonlyArray<number> = [0, 0, 0, 0, 0, 0, 0, 0, 0]

export const CASTER_SLOTS: ReadonlyArray<number> = [4, 3, 2, 0, 0, 0, 0, 0, 0]

export const CASTER_PREPARED_SPELLS: ReadonlySet<string> = new Set([
  "hold_person",
  "bless",
  "haste",
  "spirit_guardians",
  "fireball",
  "burning_hands",
  "guiding_bolt",
  "inflict_wounds",
  "counterspell"
])

export function freshCreature(maxHp: number, kind: CreatureKind): BattleCreatureState {
  return {
    hp: maxHp,
    maxHp,
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
    ...FRESH_TURN_STATE,
    slotsMax: EMPTY_SLOTS,
    slotsCurrent: EMPTY_SLOTS,
    pactSlotsMax: 0,
    pactSlotsCurrent: 0,
    pactSlotLevel: 0,
    concentrationSpellId: "",
    legendaryActionsRemaining: 0,
    legendaryResistancesRemaining: 0,
    rechargeAvailable: {},
    dailyUsesRemaining: {},
    creatureKind: kind,
    rogueLevel: 0,
    monkLevel: 0,
    preparedSpells: new Set()
  }
}

export function freshCaster(maxHp: number, kind: CreatureKind): BattleCreatureState {
  return {
    ...freshCreature(maxHp, kind),
    slotsMax: CASTER_SLOTS,
    slotsCurrent: CASTER_SLOTS,
    preparedSpells: CASTER_PREPARED_SPELLS
  }
}
