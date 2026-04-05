/**
 * Battle events, reaction decisions, and pending interrupt types.
 * Split from battle-machine-types.ts for eslint max-lines compliance.
 */
import type {
  AfterDamageCtx,
  AoESpellCtx,
  AttackDamageCtx,
  AttackHitCtx,
  BattleContext,
  InitCreatureConfig,
  SaveFailedCtx,
  SpellCastCtx
} from "#/battle-machine-types.ts"
import type {
  Ability,
  ArmorClass,
  Condition,
  CreatureId,
  DamageType,
  DifficultyClass,
  SpellId,
  SpellSlotLevel
} from "#/types.ts"

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
      readonly isMelee: boolean
      readonly isFinesse: boolean
      readonly attackerWithin5ft: boolean
      readonly hostileWithin5ft: boolean
      readonly targetCanSeeAttacker: boolean
      readonly attackerCanSeeTarget: boolean
      readonly frightSourceInLOS: boolean
      readonly hasAllyAdjacentToTarget: boolean
      readonly saDmg: number
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
      readonly saveAbility: Ability
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
      readonly saveAbility: Ability
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
      readonly isMelee: true // OA attacks are always melee per RAW
      readonly isFinesse: boolean
      readonly hostileWithin5ft: boolean
      readonly targetCanSeeAttacker: boolean
      readonly attackerCanSeeTarget: boolean
      readonly frightSourceInLOS: boolean
      readonly hasAllyAdjacentToTarget: boolean
      readonly saDmg: number
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
      readonly isMelee: boolean
      readonly isFinesse: boolean
      readonly attackerWithin5ft: boolean
      readonly hostileWithin5ft: boolean
      readonly targetCanSeeAttacker: boolean
      readonly attackerCanSeeTarget: boolean
      readonly frightSourceInLOS: boolean
      readonly hasAllyAdjacentToTarget: boolean
      readonly saDmg: number
    }
  | { readonly type: "BATTLE_HEAL"; readonly targetId: CreatureId; readonly amount: number }
  | { readonly type: "BATTLE_DASH" }
  | { readonly type: "BATTLE_DISENGAGE" }
  | { readonly type: "BATTLE_DODGE" }
  | { readonly type: "BATTLE_ACTION_SURGE" }
  | { readonly type: "BATTLE_ENTER_RAGE" }
  | { readonly type: "BATTLE_DECLARE_RECKLESS" }
  | { readonly type: "BATTLE_READY" }
  | { readonly type: "BATTLE_READY_PASS" }
  | {
      readonly type: "BATTLE_READY_RELEASE"
      readonly releaserId: CreatureId
      readonly targetId: CreatureId
      readonly atkRoll: number
      readonly dmg: number
      readonly dt: DamageType
      readonly crit: boolean
      readonly tgtAc: ArmorClass
      readonly isMelee: boolean
      readonly isFinesse: boolean
      readonly attackerWithin5ft: boolean
      readonly hostileWithin5ft: boolean
      readonly targetCanSeeAttacker: boolean
      readonly attackerCanSeeTarget: boolean
      readonly frightSourceInLOS: boolean
      readonly hasAllyAdjacentToTarget: boolean
      readonly saDmg: number
    }

/** Narrows BattleEvent to a specific type member for action functions. */
export type BattleActionArgs<T extends BattleEvent["type"]> = {
  context: BattleContext
  event: Extract<BattleEvent, { type: T }>
}
