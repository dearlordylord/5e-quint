import type { MetamagicOption } from "#/features/class-sorcerer.ts"

// --- Per-class state interfaces ---

export interface FighterClassState {
  readonly level: number
  readonly secondWindCharges: number
  readonly secondWindMax: number
  readonly actionSurgeCharges: number
  readonly actionSurgeMax: number
  readonly actionSurgeUsedThisTurn: boolean
  readonly indomitableCharges: number
  readonly indomitableMax: number
  readonly heroicInspiration: boolean
}

export interface BarbarianClassState {
  readonly level: number
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
}

export interface MonkClassState {
  readonly level: number
  readonly focusPoints: number
  readonly focusMax: number
  readonly uncannyMetabolismUsed: boolean
  readonly stunningStrikeUsedThisTurn: boolean
  readonly wholenessCharges: number
  readonly wholenessMax: number
}

export interface PaladinClassState {
  readonly level: number
  readonly layOnHandsPool: number
  readonly layOnHandsMax: number
  readonly paladinChannelDivinityCharges: number
  readonly paladinChannelDivinityMax: number
  readonly smiteFreeUsed: boolean
}

export interface RogueClassState {
  readonly level: number
  readonly sneakAttackUsedThisTurn: boolean
  readonly steadyAimUsedThisTurn: boolean
  readonly cunningStrikeUsesThisTurn: number
}

export interface ClericClassState {
  readonly level: number
  readonly clericChannelDivinityCharges: number
  readonly clericChannelDivinityMax: number
}

export interface DruidClassState {
  readonly level: number
  readonly wildShapeCharges: number
  readonly wildShapeMax: number
  readonly inWildShape: boolean
  readonly wildResurgenceSlotUsedThisLR: boolean
}

export interface SorcererClassState {
  readonly level: number
  readonly sorceryPoints: number
  readonly sorceryPointsMax: number
  readonly sorcerousRestorationUsed: boolean
  readonly innateSorceryActive: boolean
  readonly innateSorceryCharges: number
  readonly innateSorceryTurnsRemaining: number
  readonly metamagicUsedThisCast: ReadonlySet<MetamagicOption>
  readonly apotheosisUsedThisTurn: boolean
}

export interface WarlockClassState {
  readonly level: number
  readonly mysticArcanumUsed: ReadonlySet<number>
  readonly magicalCunningUsed: boolean
  readonly eldritchSmiteUsedThisTurn: boolean
}

export interface WizardClassState {
  readonly level: number
  readonly arcaneRecoveryUsed: boolean
  readonly overchannelUsesThisLR: number
}

export interface RangerClassState {
  readonly level: number
  readonly huntersMarkFreeUses: number
  readonly tirelessCharges: number
  readonly tirelessMax: number
  readonly naturesVeilCharges: number
  readonly naturesVeilMax: number
}

export interface BardClassState {
  readonly level: number
  readonly bardicInspirationCharges: number
  readonly bardicInspirationMax: number
}

export interface ClassStateMap {
  readonly fighter: FighterClassState
  readonly barbarian: BarbarianClassState
  readonly monk: MonkClassState
  readonly paladin: PaladinClassState
  readonly rogue: RogueClassState
  readonly cleric: ClericClassState
  readonly druid: DruidClassState
  readonly sorcerer: SorcererClassState
  readonly warlock: WarlockClassState
  readonly wizard: WizardClassState
  readonly ranger: RangerClassState
  readonly bard: BardClassState
}
