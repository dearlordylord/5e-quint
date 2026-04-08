import type { MetamagicOption } from "#/features/class-sorcerer.ts"
import type { ClassLevel, ResourceCount } from "#/types.ts"

// --- Per-class state interfaces ---

export interface FighterClassState {
  readonly level: ClassLevel
  readonly secondWindCharges: ResourceCount
  readonly secondWindMax: ResourceCount
  readonly actionSurgeCharges: ResourceCount
  readonly actionSurgeMax: ResourceCount
  readonly actionSurgeUsedThisTurn: boolean
  readonly indomitableCharges: ResourceCount
  readonly indomitableMax: ResourceCount
  readonly heroicInspiration: boolean
}

export interface BarbarianClassState {
  readonly level: ClassLevel
  readonly raging: boolean
  readonly rageCharges: ResourceCount
  readonly rageMaxCharges: ResourceCount
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
  readonly level: ClassLevel
  readonly focusPoints: ResourceCount
  readonly focusMax: ResourceCount
  readonly uncannyMetabolismUsed: boolean
  readonly stunningStrikeUsedThisTurn: boolean
  readonly wholenessCharges: ResourceCount
  readonly wholenessMax: ResourceCount
}

export interface PaladinClassState {
  readonly level: ClassLevel
  readonly layOnHandsPool: ResourceCount
  readonly layOnHandsMax: ResourceCount
  readonly paladinChannelDivinityCharges: ResourceCount
  readonly paladinChannelDivinityMax: ResourceCount
  readonly smiteFreeUsed: boolean
}

export interface RogueClassState {
  readonly level: ClassLevel
  readonly sneakAttackUsedThisTurn: boolean
  readonly steadyAimUsedThisTurn: boolean
  readonly cunningStrikeUsesThisTurn: number
}

export interface ClericClassState {
  readonly level: ClassLevel
  readonly clericChannelDivinityCharges: ResourceCount
  readonly clericChannelDivinityMax: ResourceCount
}

export interface DruidClassState {
  readonly level: ClassLevel
  readonly wildShapeCharges: ResourceCount
  readonly wildShapeMax: ResourceCount
  readonly inWildShape: boolean
  readonly wildResurgenceSlotUsedThisLR: boolean
}

export interface SorcererClassState {
  readonly level: ClassLevel
  readonly sorceryPoints: ResourceCount
  readonly sorceryPointsMax: ResourceCount
  readonly sorcerousRestorationUsed: boolean
  readonly innateSorceryActive: boolean
  readonly innateSorceryCharges: ResourceCount
  readonly innateSorceryTurnsRemaining: number
  readonly knownMetamagicOptions: ReadonlySet<MetamagicOption>
  readonly metamagicUsedThisCast: ReadonlySet<MetamagicOption>
  readonly apotheosisUsedThisTurn: boolean
}

export interface WarlockClassState {
  readonly level: ClassLevel
  readonly mysticArcanumUsed: ReadonlySet<number>
  readonly magicalCunningUsed: boolean
  readonly eldritchSmiteUsedThisTurn: boolean
}

export interface WizardClassState {
  readonly level: ClassLevel
  readonly arcaneRecoveryUsed: boolean
  readonly overchannelUsesThisLR: number
}

export interface RangerClassState {
  readonly level: ClassLevel
  readonly huntersMarkFreeUses: ResourceCount
  readonly tirelessCharges: ResourceCount
  readonly tirelessMax: ResourceCount
  readonly naturesVeilCharges: ResourceCount
  readonly naturesVeilMax: ResourceCount
}

export interface BardClassState {
  readonly level: ClassLevel
  readonly bardicInspirationCharges: ResourceCount
  readonly bardicInspirationMax: ResourceCount
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
