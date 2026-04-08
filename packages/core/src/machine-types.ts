import type { Option } from "effect"
import type { ClassName, HitDiceRemaining } from "#/features/class-tables.ts"
import type { ClassStateMap } from "#/machine-class-states.ts"
import type { MetamagicOption } from "#/features/class-sorcerer.ts"
import type { ConditionFlag } from "#/machine-helpers.ts"
import type {
  AbilityModifier,
  ActionType,
  ActiveEffect,
  EffectTurnHook,
  ClassLevel,
  Condition,
  CreatureId,
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
  ResourceCount,
  ShoveChoice,
  Size,
  SpellId,
  SpellSlotLevel,
  SpellSlots,
  TempHP
} from "#/types.ts"

export const PEERLESS_SKILL_PENDING_MODES = ["abilityCheck", "attackRoll"] as const satisfies ReadonlyArray<string>
export type PeerlessSkillPendingMode = (typeof PEERLESS_SKILL_PENDING_MODES)[number]

export type PendingResolution =
  | null
  | { readonly kind: "tacticalMind" }
  | { readonly kind: "peerlessSkill"; readonly mode: PeerlessSkillPendingMode }
  | { readonly kind: "relentlessRage" }

// --- Shared turn-processing types (used by both START_TURN and END_TURN) ---

export interface TurnPhaseCtx {
  readonly selfId?: CreatureId
  readonly hp: number
  readonly maxHp: number
  readonly tempHp: number
  readonly concentrationSpellId: Option.Option<SpellId>
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
  readonly concentrationSpellId: Option.Option<SpellId>
  readonly hp: HP
  readonly incapacitatedSources: ReadonlySet<IncapSource>
  readonly tempHp: TempHP
  readonly dead: boolean
  readonly stable: boolean
  readonly deathSaves: DeathSaves
}

// --- Machine input ---

export interface DndMachineInput {
  readonly selfId?: CreatureId
  readonly maxHp: number
  readonly hitDiceRemaining?: HitDiceRemaining
  readonly baseWalkSpeed?: number
  readonly effectiveSpeed?: number
  readonly movementRemaining?: number
  readonly extraAttacksRemaining?: number
  readonly fighterLevel?: ClassLevel | undefined
  readonly creatureKind?: CreatureKind
  readonly legendaryActionsMax?: ResourceCount
  readonly legendaryResistancesMax?: ResourceCount
  readonly legendaryActionsRemaining?: ResourceCount
  readonly legendaryResistancesRemaining?: ResourceCount
  readonly rechargeAvailable?: Readonly<Record<string, boolean>>
  readonly dailyUsesRemaining?: Readonly<Record<string, number>>
  readonly dailyUsesMax?: Readonly<Record<string, number>>
  readonly barbarianLevel?: ClassLevel | undefined
  readonly monkLevel?: ClassLevel | undefined
  readonly wholenessMax?: ResourceCount
  readonly paladinLevel?: ClassLevel | undefined
  readonly rogueLevel?: ClassLevel | undefined
  readonly clericLevel?: ClassLevel | undefined
  readonly druidLevel?: ClassLevel | undefined
  readonly sorcererLevel?: ClassLevel | undefined
  readonly knownMetamagicOptions?: ReadonlyArray<MetamagicOption>
  readonly warlockLevel?: ClassLevel | undefined
  readonly wizardLevel?: ClassLevel | undefined
  readonly rangerLevel?: ClassLevel | undefined
  readonly wisMod?: AbilityModifier
  readonly bardLevel?: ClassLevel | undefined
  readonly chaMod?: AbilityModifier
  readonly slotsMax?: ReadonlyArray<number>
  readonly slotsCurrent?: ReadonlyArray<number>
}

// Per-class state interfaces: extracted to machine-class-states.ts for max-lines
export type {
  BarbarianClassState,
  BardClassState,
  ClassStateMap,
  ClericClassState,
  DruidClassState,
  FighterClassState,
  MonkClassState,
  PaladinClassState,
  RangerClassState,
  RogueClassState,
  SorcererClassState,
  WarlockClassState,
  WizardClassState
} from "#/machine-class-states.ts"

// --- Context ---

export interface DndContext {
  readonly selfId?: CreatureId
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
  readonly grappling: boolean
  readonly grappledTargetTwoSizesSmaller: boolean
  readonly invisible: boolean
  readonly paralyzed: boolean
  readonly petrified: boolean
  readonly poisoned: boolean
  readonly prone: boolean
  readonly restrained: boolean
  readonly stunned: boolean
  readonly unconscious: boolean
  readonly incapacitatedSources: ReadonlySet<IncapSource>
  readonly baseWalkSpeed: number
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
  readonly actionSurgeActionPending: boolean
  readonly slotsMax: SpellSlots
  readonly slotsCurrent: SpellSlots
  readonly pactSlotsMax: number
  readonly pactSlotsCurrent: number
  readonly pactSlotLevel: number
  readonly concentrationSpellId: Option.Option<SpellId>
  readonly hitDiceRemaining: HitDiceRemaining
  readonly activeEffects: ReadonlyArray<ActiveEffect>
  readonly pendingResolution: PendingResolution
  readonly creatureKind: CreatureKind
  // MonsterResourceState (Quint parity: monsterResourceState)
  readonly legendaryActionsMax: ResourceCount // effective max (includes lair bonus) — not compared in MBT
  readonly legendaryResistancesMax: ResourceCount // effective max — not compared in MBT
  readonly legendaryActionsRemaining: ResourceCount
  readonly legendaryResistancesRemaining: ResourceCount
  readonly rechargeAvailable: Readonly<Record<string, boolean>>
  readonly dailyUsesRemaining: Readonly<Record<string, number>>
  readonly dailyUsesMax: Readonly<Record<string, number>> // not compared in MBT — derived from stat block
  // Per-class state: only active classes have entries
  readonly classStates: Partial<ClassStateMap>
}

// --- Events ---

export interface TurnHookResolution {
  readonly spellId: SpellId
  readonly saveSucceeded: boolean
  readonly conSaveSucceeded?: boolean
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
      readonly extraAttacks?: number // override for monsters (multiattack); PCs derive from class levels
      readonly deathSaveRoll?: D20Roll
      readonly deathSaveRoll2?: D20Roll
      readonly conMod?: number
      readonly effectResolutions?: ReadonlyArray<TurnHookResolution>
      readonly rechargedAbilities?: ReadonlyArray<string> // abilities that successfully recharged this turn
    }
  | {
      readonly type: "END_TURN"
      readonly effectResolutions?: ReadonlyArray<TurnHookResolution>
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
  | {
      readonly type: "SET_GRAPPLING_STATE"
      readonly grappling: boolean
      readonly grappledTargetTwoSizesSmaller: boolean
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
  | { readonly type: "EXPEND_SLOT"; readonly level: SpellSlotLevel }
  | {
      readonly type: "START_CONCENTRATION"
      readonly spellId: SpellId
      readonly durationTurns: number
      readonly expiresAt: ExpiryPhase
      readonly casterId: CreatureId
    }
  | {
      readonly type: "ADD_EFFECT"
      readonly spellId: SpellId
      readonly durationTurns: number
      readonly expiresAt: ExpiryPhase
      readonly casterId: CreatureId
      readonly expiryOwnerId?: CreatureId
      readonly startOfTurnHook?: EffectTurnHook
      readonly endOfTurnHook?: EffectTurnHook
      readonly grantedResistances?: ReadonlySet<DamageType>
      readonly grantedVulnerabilities?: ReadonlySet<DamageType>
      readonly grantedImmunities?: ReadonlySet<DamageType>
      readonly blocksOpportunityAttacks?: boolean
      readonly speedDeltaFeet?: number
    }
  | { readonly type: "REMOVE_EFFECT"; readonly spellId: SpellId }
  | { readonly type: "BREAK_CONCENTRATION" }
  | { readonly type: "CONCENTRATION_CHECK"; readonly conSaveSucceeded: boolean }
  | {
      readonly type: "SHORT_REST"
      readonly conMod: number
      readonly hdRolls: ReadonlyArray<{ readonly className: ClassName; readonly roll: number }>
    }
  | { readonly type: "LONG_REST" }
  | { readonly type: "SPEND_HIT_DIE"; readonly className: ClassName; readonly conMod: number; readonly dieRoll: number }
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
  | { readonly type: "TRIGGER_TACTICAL_MIND" }
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
  | { readonly type: "USE_DIVINE_SMITE"; readonly slotLevel: SpellSlotLevel }
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
  | { readonly type: "USE_ARCANE_RECOVERY"; readonly slotLevel: SpellSlotLevel }
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
  | { readonly type: "USE_MYSTIC_ARCANUM"; readonly spellLevel: SpellSlotLevel }
  | { readonly type: "USE_ELDRITCH_SMITE" }
  // Phase S: Sorcerer events
  | { readonly type: "CONVERT_SLOT_TO_POINTS"; readonly slotLevel: SpellSlotLevel }
  | { readonly type: "CONVERT_POINTS_TO_SLOT"; readonly slotLevel: SpellSlotLevel }
  | { readonly type: "USE_INNATE_SORCERY" }
  | { readonly type: "USE_METAMAGIC"; readonly option: string }
  // Phase RN: Ranger events
  | { readonly type: "USE_FREE_HUNTERS_MARK" }
  | { readonly type: "USE_TIRELESS"; readonly d8Roll: number }
  | { readonly type: "USE_NATURES_VEIL" }
  // Phase BD: Bard events
  | { readonly type: "USE_BARDIC_INSPIRATION" }
  | { readonly type: "USE_CUTTING_WORDS" }
  | { readonly type: "USE_FONT_SLOT_RESTORE"; readonly slotLevel: SpellSlotLevel }
  | { readonly type: "USE_PEERLESS_SKILL"; readonly success: boolean }
  | { readonly type: "TRIGGER_PEERLESS_SKILL_ABILITY_CHECK" }
  | { readonly type: "TRIGGER_PEERLESS_SKILL_ATTACK_ROLL" }
  // Phase DR: Druid events
  | { readonly type: "ENTER_WILD_SHAPE" }
  | { readonly type: "EXIT_WILD_SHAPE" }
  | { readonly type: "USE_WILD_RESURGENCE_CHARGE"; readonly slotLevel: SpellSlotLevel }
  | { readonly type: "USE_WILD_RESURGENCE_SLOT" }
  | { readonly type: "CLEAR_PENDING_RESOLUTION" }

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
  grappling: false,
  grappledTargetTwoSizesSmaller: false,
  invisible: false,
  paralyzed: false,
  petrified: false,
  poisoned: false,
  prone: false,
  restrained: false,
  stunned: false,
  unconscious: false
} as const

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
  bonusMovementOAFree: false,
  actionSurgeActionPending: false
} as const
