import { actionSurgeMaxCharges, indomitableMaxCharges, secondWindMaxCharges } from "#/features/class-fighter.ts"
import type { ConditionFlag } from "#/machine-helpers.ts"
import type {
  ActionType,
  ActiveEffect,
  Condition,
  CreatureKind,
  D20Roll,
  DamageType,
  DeathSaves,
  ExhaustionLevel,
  ExpiryPhase,
  HealAmount,
  HP,
  IncapSource,
  MovementFeet,
  ShoveChoice,
  Size,
  SpellSlots,
  TempHP
} from "#/types.ts"

// --- Shared turn-processing types (used by both START_TURN and END_TURN) ---

export interface TurnPhaseCtx {
  readonly hp: number
  readonly maxHp: number
  readonly tempHp: number
  readonly concentrationSpellId: string
  readonly activeEffects: ReadonlyArray<ActiveEffect>
  readonly incapacitatedSources: ReadonlySet<IncapSource>
  readonly dead: boolean
  readonly stable: boolean
  readonly deathSaves: DeathSaves
  readonly petrified: boolean
  readonly unconscious: boolean
}

export interface TurnPhaseResult {
  readonly conditions: Readonly<Partial<Record<ConditionFlag, boolean>>>
  readonly activeEffects: ReadonlyArray<ActiveEffect>
  readonly concentrationSpellId: string
  readonly hp: HP
  readonly incapacitatedSources: ReadonlySet<IncapSource>
  readonly tempHp: TempHP
  readonly dead: boolean
  readonly stable: boolean
  readonly deathSaves: DeathSaves
}

// --- Machine input ---

export interface DndMachineInput {
  readonly maxHp: number
  readonly hitDiceRemaining?: number
  readonly effectiveSpeed?: number
  readonly movementRemaining?: number
  readonly extraAttacksRemaining?: number
  readonly fighterLevel?: number
  readonly creatureKind?: CreatureKind
  readonly legendaryActionsMax?: number
  readonly legendaryResistancesMax?: number
  readonly legendaryActionsRemaining?: number
  readonly legendaryResistancesRemaining?: number
  readonly rechargeAvailable?: Readonly<Record<string, boolean>>
  readonly dailyUsesRemaining?: Readonly<Record<string, number>>
  readonly dailyUsesMax?: Readonly<Record<string, number>>
  readonly barbarianLevel?: number
  readonly monkLevel?: number
  readonly wholenessMax?: number
  readonly paladinLevel?: number
  readonly rogueLevel?: number
  readonly clericLevel?: number
  readonly druidLevel?: number
  readonly sorcererLevel?: number
  readonly warlockLevel?: number
  readonly wizardLevel?: number
}

// --- Context ---

export interface DndContext {
  readonly hp: HP
  readonly maxHp: HP
  readonly tempHp: TempHP
  readonly deathSaves: DeathSaves
  readonly stable: boolean
  readonly dead: boolean // bridge: endTurn (turnTrack) signals death to damageTrack via always guard
  readonly inCombat: boolean // bridge: turnPhase region signals combat mode to damageTrack guards
  readonly exhaustion: ExhaustionLevel
  readonly blinded: boolean
  readonly charmed: boolean
  readonly deafened: boolean
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
  readonly movementRemaining: MovementFeet
  readonly effectiveSpeed: MovementFeet
  /** Actions remaining this turn (default 1; counter enables Action Surge / Haste granting additional actions). */
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
  readonly slotsMax: SpellSlots
  readonly slotsCurrent: SpellSlots
  readonly pactSlotsMax: number
  readonly pactSlotsCurrent: number
  readonly pactSlotLevel: number
  readonly concentrationSpellId: string
  readonly hitDiceRemaining: number
  readonly activeEffects: ReadonlyArray<ActiveEffect>
  // Fighter charge state (Quint parity: fighterState)
  readonly secondWindCharges: number
  readonly secondWindMax: number
  readonly actionSurgeCharges: number
  readonly actionSurgeMax: number
  readonly actionSurgeUsedThisTurn: boolean
  readonly indomitableCharges: number
  readonly indomitableMax: number
  readonly heroicInspiration: boolean
  readonly fighterLevel: number
  readonly creatureKind: CreatureKind
  // MonsterResourceState (Quint parity: monsterResourceState)
  readonly legendaryActionsMax: number // effective max (includes lair bonus) — not compared in MBT
  readonly legendaryResistancesMax: number // effective max — not compared in MBT
  readonly legendaryActionsRemaining: number
  readonly legendaryResistancesRemaining: number
  readonly rechargeAvailable: Readonly<Record<string, boolean>>
  readonly dailyUsesRemaining: Readonly<Record<string, number>>
  readonly dailyUsesMax: Readonly<Record<string, number>> // not compared in MBT — derived from stat block
  // BarbarianState (Quint parity: barbarianState)
  readonly barbarianLevel: number
  readonly raging: boolean
  readonly rageCharges: number
  readonly rageMaxCharges: number
  readonly rageTurnsRemaining: number
  readonly attackedOrForcedSaveThisTurn: boolean
  readonly rageExtendedWithBA: boolean
  readonly recklessThisTurn: boolean
  readonly frenzyUsedThisTurn: boolean
  readonly intimidatingPresenceUsed: boolean
  readonly relentlessRageTimesUsed: number
  readonly brutalStrikeUsedThisTurn: boolean
  // MonkState (Quint parity: monkState)
  readonly monkLevel: number
  readonly focusPoints: number
  readonly focusMax: number
  readonly uncannyMetabolismUsed: boolean
  readonly stunningStrikeUsedThisTurn: boolean
  readonly wholenessCharges: number
  readonly wholenessMax: number
  // Stub class states (prep for parallel integration)
  readonly paladinLevel: number
  readonly layOnHandsPool: number
  readonly layOnHandsMax: number
  readonly paladinChannelDivinityCharges: number
  readonly paladinChannelDivinityMax: number
  readonly smiteFreeUsed: boolean
  readonly rogueLevel: number
  readonly sneakAttackUsedThisTurn: boolean
  readonly steadyAimUsedThisTurn: boolean
  readonly cunningStrikeUsesThisTurn: number
  readonly clericLevel: number
  readonly clericChannelDivinityCharges: number
  readonly clericChannelDivinityMax: number
  readonly druidLevel: number
  readonly wildShapeCharges: number
  readonly wildShapeMax: number
  readonly inWildShape: boolean
  readonly wildResurgenceSlotUsedThisLR: boolean
  readonly sorcererLevel: number
  readonly sorceryPoints: number
  readonly sorceryPointsMax: number
  readonly sorcerousRestorationUsed: boolean
  readonly innateSorceryActive: boolean
  readonly innateSorceryCharges: number
  readonly innateSorceryTurnsRemaining: number
  readonly metamagicUsedThisCast: ReadonlySet<string>
  readonly apotheosisUsedThisTurn: boolean
  readonly warlockLevel: number
  readonly mysticArcanumUsed: ReadonlySet<number>
  readonly magicalCunningUsed: boolean
  readonly eldritchSmiteUsedThisTurn: boolean
  readonly wizardLevel: number
  readonly arcaneRecoveryUsed: boolean
  readonly overchannelUsesThisLR: number
}

// --- Events ---

export interface EndTurnSave {
  readonly spellId: string
  readonly saveSucceeded: boolean
  readonly conditionsToRemove: ReadonlyArray<Condition>
}

export interface EndTurnDamage {
  readonly spellId: string
  readonly damage: number
  readonly damageType: DamageType
  readonly conSaveSucceeded: boolean
  readonly resistances: ReadonlySet<DamageType>
  readonly vulnerabilities: ReadonlySet<DamageType>
  readonly immunities: ReadonlySet<DamageType>
}

export interface StartTurnEffect {
  readonly spellId: string
  readonly healAmount: number
  readonly tempHpAmount: number
  readonly saveResult: boolean
  readonly damageAmount: number
  readonly damageType: DamageType
  readonly conSaveSucceeded: boolean
  readonly resistances: ReadonlySet<DamageType>
  readonly vulnerabilities: ReadonlySet<DamageType>
  readonly immunities: ReadonlySet<DamageType>
}

export type DndEvent =
  | {
      readonly type: "TAKE_DAMAGE"
      readonly amount: number
      readonly damageType: DamageType
      readonly resistances: ReadonlySet<DamageType>
      readonly vulnerabilities: ReadonlySet<DamageType>
      readonly immunities: ReadonlySet<DamageType>
      readonly isCritical: boolean
    }
  | { readonly type: "HEAL"; readonly amount: HealAmount }
  | { readonly type: "GRANT_TEMP_HP"; readonly amount: TempHP; readonly keepOld: boolean }
  | { readonly type: "DEATH_SAVE"; readonly d20Roll: D20Roll; readonly d20Roll2?: D20Roll }
  | { readonly type: "STABILIZE" }
  | { readonly type: "KNOCK_OUT" }
  | {
      readonly type: "APPLY_CONDITION"
      readonly condition: Condition
      readonly conditionImmunities?: ReadonlySet<Condition>
    }
  | { readonly type: "REMOVE_CONDITION"; readonly condition: Condition }
  | { readonly type: "ADD_EXHAUSTION"; readonly levels: number; readonly exhaustionImmune?: boolean }
  | { readonly type: "REDUCE_EXHAUSTION"; readonly levels: number }
  | {
      readonly type: "START_TURN"
      readonly baseSpeed: number
      readonly armorPenalty: number
      readonly extraAttacks: number
      readonly callerSpeedModifier: number
      readonly isGrappling: boolean
      readonly grappledTargetTwoSizesSmaller: boolean
      readonly deathSaveRoll?: D20Roll
      readonly deathSaveRoll2?: D20Roll
      readonly conMod?: number
      readonly startOfTurnEffects: ReadonlyArray<StartTurnEffect>
      readonly rechargedAbilities?: ReadonlyArray<string> // abilities that successfully recharged this turn
    }
  | {
      readonly type: "END_TURN"
      readonly endOfTurnSaves: ReadonlyArray<EndTurnSave>
      readonly endOfTurnDamage: ReadonlyArray<EndTurnDamage>
      readonly useLegendaryResistance?: boolean
    }
  | { readonly type: "USE_ACTION"; readonly actionType: ActionType }
  | { readonly type: "USE_BONUS_ACTION" }
  | { readonly type: "USE_REACTION" }
  | { readonly type: "USE_MOVEMENT"; readonly feet: number; readonly movementCost: number }
  | { readonly type: "USE_EXTRA_ATTACK" }
  | { readonly type: "STAND_FROM_PRONE" }
  | { readonly type: "DROP_PRONE" }
  | { readonly type: "MARK_BONUS_ACTION_SPELL" }
  | { readonly type: "MARK_NON_CANTRIP_ACTION_SPELL" }
  | {
      readonly type: "GRAPPLE"
      readonly attackerSize: Size
      readonly targetSize: Size
      readonly targetSaveFailed: boolean
      readonly attackerHasFreeHand: boolean
    }
  | { readonly type: "RELEASE_GRAPPLE" }
  | { readonly type: "ESCAPE_GRAPPLE"; readonly escapeSucceeded: boolean }
  | {
      readonly type: "SHOVE"
      readonly attackerSize: Size
      readonly targetSize: Size
      readonly targetSaveFailed: boolean
      readonly choice: ShoveChoice
    }
  | { readonly type: "GRANT_EXTRA_ACTION" }
  | { readonly type: "EXPEND_PACT_SLOT" }
  | { readonly type: "EXPEND_SLOT"; readonly level: number }
  | {
      readonly type: "START_CONCENTRATION"
      readonly spellId: string
      readonly durationTurns: number
      readonly expiresAt: ExpiryPhase
    }
  | {
      readonly type: "ADD_EFFECT"
      readonly spellId: string
      readonly durationTurns: number
      readonly expiresAt: ExpiryPhase
    }
  | { readonly type: "REMOVE_EFFECT"; readonly spellId: string }
  | { readonly type: "BREAK_CONCENTRATION" }
  | { readonly type: "CONCENTRATION_CHECK"; readonly conSaveSucceeded: boolean }
  | { readonly type: "SHORT_REST"; readonly conMod: number; readonly hdRolls: ReadonlyArray<number> }
  | { readonly type: "LONG_REST" }
  | { readonly type: "SPEND_HIT_DIE"; readonly conMod: number; readonly dieRoll: number }
  | {
      readonly type: "APPLY_FALL"
      readonly damageRoll: number
      readonly resistances: ReadonlySet<DamageType>
      readonly vulnerabilities: ReadonlySet<DamageType>
      readonly immunities: ReadonlySet<DamageType>
    }
  | { readonly type: "SUFFOCATE" }
  | { readonly type: "APPLY_STARVATION" }
  | { readonly type: "APPLY_DEHYDRATION" }
  | { readonly type: "USE_BONUS_MOVEMENT"; readonly feet: number }
  | { readonly type: "ENTER_COMBAT" }
  | { readonly type: "EXIT_COMBAT" }
  | { readonly type: "USE_SECOND_WIND"; readonly d10Roll: number }
  | { readonly type: "USE_ACTION_SURGE" }
  | { readonly type: "USE_INDOMITABLE" }
  | { readonly type: "USE_TACTICAL_MIND"; readonly boostedCheckSucceeds: boolean }
  | { readonly type: "USE_HEROIC_INSPIRATION" }
  | { readonly type: "SCORE_CRITICAL_HIT" }
  // Phase L: Monster resource events
  | { readonly type: "USE_LEGENDARY_ACTION"; readonly actionName: string }
  | { readonly type: "USE_RECHARGE_ABILITY"; readonly name: string }
  | { readonly type: "USE_DAILY_ABILITY"; readonly name: string }
  // Phase B: Barbarian events (all zero-payload)
  | { readonly type: "ENTER_RAGE" }
  | { readonly type: "END_RAGE" }
  | { readonly type: "EXTEND_RAGE_BA" }
  | { readonly type: "MARK_ATTACK_OR_FORCED_SAVE" }
  | { readonly type: "DECLARE_RECKLESS" }
  | { readonly type: "USE_INTIMIDATING_PRESENCE" }
  | { readonly type: "RESTORE_INTIMIDATING_PRESENCE" }
  | { readonly type: "USE_BRUTAL_STRIKE" }
  | { readonly type: "USE_RELENTLESS_RAGE"; readonly conSaveSucceeded: boolean }
  // Phase P: Paladin events
  | { readonly type: "USE_LAY_ON_HANDS"; readonly amount: number }
  | { readonly type: "USE_PALADIN_CHANNEL_DIVINITY" }
  | { readonly type: "USE_DIVINE_SMITE"; readonly slotLevel: number }
  | { readonly type: "USE_DIVINE_SMITE_FREE" }
  // Phase M: Monk events
  | { readonly type: "FLURRY_OF_BLOWS" }
  | { readonly type: "PATIENT_DEFENSE_FREE" }
  | { readonly type: "PATIENT_DEFENSE_FOCUS" }
  | { readonly type: "STEP_OF_THE_WIND_FREE" }
  | { readonly type: "STEP_OF_THE_WIND_FOCUS" }
  | { readonly type: "STUNNING_STRIKE" }
  | { readonly type: "WHOLENESS_OF_BODY"; readonly healRoll: number }
  | { readonly type: "UNCANNY_METABOLISM"; readonly healRoll: number }
  // Phase W: Wizard events
  | { readonly type: "USE_ARCANE_RECOVERY"; readonly slotLevel: number }
  | { readonly type: "USE_OVERCHANNEL" }
  // Phase R: Rogue events
  | { readonly type: "USE_SNEAK_ATTACK" }
  | { readonly type: "USE_STEADY_AIM" }
  | { readonly type: "CUNNING_ACTION_DASH" }
  | { readonly type: "CUNNING_ACTION_DISENGAGE" }
  | { readonly type: "CUNNING_ACTION_HIDE" }
  | { readonly type: "USE_UNCANNY_DODGE" }
  | { readonly type: "USE_CUNNING_STRIKE" }
  // Phase CL: Cleric events
  | { readonly type: "USE_CLERIC_CHANNEL_DIVINITY" }
  // Phase WK: Warlock events
  | { readonly type: "USE_MAGICAL_CUNNING" }
  | { readonly type: "USE_MYSTIC_ARCANUM"; readonly spellLevel: number }
  | { readonly type: "USE_ELDRITCH_SMITE" }
  // Phase S: Sorcerer events
  | { readonly type: "CONVERT_SLOT_TO_POINTS"; readonly slotLevel: number }
  | { readonly type: "CONVERT_POINTS_TO_SLOT"; readonly slotLevel: number }
  | { readonly type: "USE_INNATE_SORCERY" }
  | { readonly type: "USE_METAMAGIC"; readonly option: string }
  // Phase DR: Druid events
  | { readonly type: "ENTER_WILD_SHAPE" }
  | { readonly type: "EXIT_WILD_SHAPE" }
  | { readonly type: "USE_WILD_RESURGENCE_CHARGE"; readonly slotLevel: number }
  | { readonly type: "USE_WILD_RESURGENCE_SLOT" }

// Event extractors: extracted to machine-event-extractors.ts for max-lines
export {
  asAddEffect,
  asAddExhaustion,
  asApplyCondition,
  asApplyFall,
  asConcentrationCheck,
  asCondition,
  asDeathSave,
  asEndTurn,
  asEscapeGrapple,
  asExhaustion,
  asExpendSlot,
  asGrantTempHp,
  asGrapple,
  asHeal,
  asRemoveEffect,
  asShortRest,
  asShove,
  asSpendHitDie,
  asStartConcentration,
  asStartTurn,
  asTakeDamage,
  asUseAction,
  asUseBonusMovement,
  asUseMovement,
  asUseSecondWind,
  asUseTacticalMind
} from "#/machine-event-extractors.ts"

// --- Initial context constants ---

export const INITIAL_CONDITIONS = {
  blinded: false,
  charmed: false,
  deafened: false,
  frightened: false,
  grappled: false,
  invisible: false,
  paralyzed: false,
  petrified: false,
  poisoned: false,
  prone: false,
  restrained: false,
  stunned: false,
  unconscious: false
} as const

export function initialFighterState(fighterLevel: number) {
  const swMax = secondWindMaxCharges(fighterLevel)
  const asMax = actionSurgeMaxCharges(fighterLevel)
  const indMax = indomitableMaxCharges(fighterLevel)
  return {
    secondWindCharges: swMax,
    secondWindMax: swMax,
    actionSurgeCharges: asMax,
    actionSurgeMax: asMax,
    actionSurgeUsedThisTurn: false,
    indomitableCharges: indMax,
    indomitableMax: indMax,
    heroicInspiration: false
  }
}

export const INITIAL_TURN_STATE = {
  actionsRemaining: 1,
  attackActionUsed: false,
  bonusActionSpellCast: false,
  bonusActionUsed: false,
  disengaged: false,
  dodging: false,
  extraAttacksRemaining: 0,
  freeInteractionUsed: false,
  nonCantripActionSpellCast: false,
  readiedAction: false,
  reactionAvailable: true,
  bonusMovementRemaining: 0,
  bonusMovementOAFree: false
} as const
