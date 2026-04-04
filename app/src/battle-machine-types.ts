/**
 * Battle-level XState machine types — mirrors battle.qnt state variables and types.
 * Flat context with Map<CreatureId, BattleCreature>, phase as discriminated union.
 */
import type { Option } from "effect"

import type {
  ActiveEffect,
  ArmorClass,
  Condition,
  CreatureId,
  CreatureKind,
  DamageType,
  DifficultyClass,
  IncapSource,
  SpellId,
  SpellSlotLevel
} from "#/types.ts"

export type { CreatureId } from "#/types.ts"

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
  readonly concentrationSpellId: Option.Option<SpellId>
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
  readonly targetAc: ArmorClass
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
  readonly saveDC: DifficultyClass
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
  readonly saveDC: DifficultyClass
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
  readonly spellId: SpellId
  readonly duration: number
  readonly conditionOnFail: Condition
  readonly applyCondition: boolean
}

export interface SpellCastCtx {
  readonly caster: CreatureId
  readonly spellName: string
  readonly postCast: PostCastEffect
  readonly slotLvl: SpellSlotLevel
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
  readonly slotLvl: SpellSlotLevel
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

export interface BattleContext {
  readonly creatures: ReadonlyMap<CreatureId, BattleCreatureState>
  readonly initiative: ReadonlyArray<CreatureId>
  readonly turnIndex: number
  readonly round: number
  readonly turnStarted: boolean
  readonly awaitCtx: AwaitCtx | null
  readonly aoeCtx: AoESpellCtx | null
  readonly movementCtx: MovementCtx | null
  readonly laCtx: LAWindowCtx | null
  readonly spellStack: ReadonlyArray<SpellStackEntry>
}

/** All phase fields nulled — machine is in activeTurn. */
export const PHASE_ACTIVE: Pick<BattleContext, "awaitCtx" | "aoeCtx" | "movementCtx" | "laCtx"> = {
  awaitCtx: null,
  aoeCtx: null,
  movementCtx: null,
  laCtx: null
}

export type PhaseFields = typeof PHASE_ACTIVE

export function phaseAwaitReaction(ctx: AwaitCtx): PhaseFields {
  return { awaitCtx: ctx, aoeCtx: null, movementCtx: null, laCtx: null }
}
export function phaseResolvingAoE(aoe: AoESpellCtx): PhaseFields {
  return { awaitCtx: null, aoeCtx: aoe, movementCtx: null, laCtx: null }
}
export function phaseResolvingMovement(mv: MovementCtx): PhaseFields {
  return { awaitCtx: null, aoeCtx: null, movementCtx: mv, laCtx: null }
}
export function phaseAwaitingLegendary(la: LAWindowCtx): PhaseFields {
  return { awaitCtx: null, aoeCtx: null, movementCtx: null, laCtx: la }
}

/** Creature config for BATTLE_INIT — determines initial state per combatant. */
export interface InitCreatureConfig {
  readonly id: CreatureId
  readonly maxHp: number
  readonly kind: CreatureKind
  readonly caster?: boolean
  readonly rogueLevel?: number
  readonly monkLevel?: number
  readonly legendaryActions?: number
  readonly legendaryResistances?: number
  readonly preparedSpells?: ReadonlySet<string>
  /** Pre-resolved d20 initiative roll (1-20). Defaults to 10 (no roll). */
  readonly initiativeRoll?: number
  /** Second d20 for Disadvantage. Required when surprised=true; defaults to initiativeRoll (no effect). */
  readonly initiativeRollB?: number
  /** SRD 5.2.1: surprised combatant has Disadvantage on Initiative roll. Defaults to false. */
  readonly surprised?: boolean
}

export type BattleEvent =
  | { readonly type: "BATTLE_INIT"; readonly creatures: ReadonlyArray<InitCreatureConfig> }
  | {
      readonly type: "BATTLE_START_TURN"
      readonly rechargeD6: number
      readonly sotDmg: number
      readonly sotDt: DamageType
      readonly sotHeal: number
      readonly sotSaveResult: boolean
      readonly sotConSave: boolean
      readonly deathSaveRoll: number
    }
  | {
      readonly type: "BATTLE_ATTACK"
      readonly targetId: CreatureId
      readonly attackRoll: number
      readonly diceCount: number
      readonly dieSize: number
      readonly dmg: number
      readonly dt: DamageType
      readonly crit: boolean
      readonly tAc: ArmorClass
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
      readonly type: "BATTLE_AFTER_DAMAGE_SPELL_REACTION"
      readonly reactorId: CreatureId | null
      readonly reactionDmg: number
      readonly reactionSaved: boolean
      readonly reactionDt: DamageType
    }
  | {
      readonly type: "BATTLE_AFTER_DAMAGE_RETALIATION"
      readonly reactorId: CreatureId | null
      readonly retAtkRoll: number
      readonly retDmg: number
      readonly retDt: DamageType
      readonly retCrit: boolean
      readonly retTgtAc: ArmorClass
    }
  | {
      readonly type: "BATTLE_CAST_SAVE_SPELL"
      readonly targetId: CreatureId
      readonly saveDC: DifficultyClass
      readonly saveRoll: number
      readonly dmgOnFail: number
      readonly halfOnSave: boolean
      readonly dt: DamageType
      readonly cond: Condition
      readonly applyCond: boolean
      readonly slotLvl: SpellSlotLevel
      readonly spellName: string
      readonly ritual: boolean
      readonly bonusAction?: boolean
    }
  | {
      readonly type: "BATTLE_RESOLVE_COUNTERSPELL"
      readonly reactorId: CreatureId | null
      readonly decision: CSDecision
      readonly csSlotLvl: SpellSlotLevel
    }
  | {
      readonly type: "BATTLE_RESOLVE_SAVE_FAILED_REACTION"
      readonly reactorId: CreatureId | null
      readonly decision: SaveFailedDecision
    }
  | {
      readonly type: "BATTLE_CAST_CONCENTRATION_SPELL"
      readonly targetId: CreatureId
      readonly slotLvl: SpellSlotLevel
      readonly duration: number
      readonly spellId: SpellId
      readonly cond: Condition
      readonly applyCond: boolean
      readonly ritual: boolean
    }
  | { readonly type: "BATTLE_CONCENTRATION_CHECK"; readonly targetId: CreatureId; readonly conSaveSucceeded: boolean }
  | {
      readonly type: "BATTLE_CAST_AOE"
      readonly saveDC: DifficultyClass
      readonly dmgOnFail: number
      readonly halfOnSave: boolean
      readonly dt: DamageType
      readonly cond: Condition
      readonly applyCond: boolean
      readonly slotLvl: SpellSlotLevel
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
      readonly oaTgtAc: ArmorClass
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
      readonly laTgtAc: ArmorClass
    }
  | { readonly type: "BATTLE_HEAL"; readonly targetId: CreatureId; readonly amount: number }
  | { readonly type: "BATTLE_DASH" }
  | { readonly type: "BATTLE_DISENGAGE" }
  | { readonly type: "BATTLE_DODGE" }

/** Narrows BattleEvent to a specific type member for action functions. */
export type BattleActionArgs<T extends BattleEvent["type"]> = {
  context: BattleContext
  event: Extract<BattleEvent, { type: T }>
}
