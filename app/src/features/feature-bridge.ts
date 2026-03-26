import {
  canApplyFrenzy,
  canEnterRage,
  canRetaliate,
  canUseIntimidatingPresence,
  frenzyDamageDice,
  intimidatingPresenceDC,
  mindlessRageImmunities,
  mindlessRageOnEnterRage,
  rageDamageBonus,
  rageResistances
} from "#/features/class-barbarian.ts"
import { canUseActionSurge, canUseSecondWind, useSecondWind as applySecondWind } from "#/features/class-fighter.ts"
import {
  auraOfProtectionBonus as auraOfProtectionBonusPure,
  canLayOnHandsCure as canLayOnHandsCurePure,
  canLayOnHandsHeal as canLayOnHandsHealPure,
  canPaladinSmiteFree as canPaladinSmiteFreePure,
  canUseAuraOfProtection as canUseAuraOfProtectionPure,
  hasDivineHealth as hasDivineHealthPure,
  pDivineSmiteDamage as pDivineSmiteDamagePure,
  pLayOnHands as pLayOnHandsPure,
  pLayOnHandsCure as pLayOnHandsCurePure,
  pRadiantStrikes as pRadiantStrikesPure,
  type RadiantStrikesConfig
} from "#/features/class-paladin.ts"
import type { FeatureAction, FeatureState } from "#/features/feature-store.ts"
import type { DndContext, DndEvent } from "#/machine-types.ts"
import type { Condition, DamageType } from "#/types.ts"
import { healAmount } from "#/types.ts"

export interface BridgeResult {
  readonly featureAction: FeatureAction
  readonly machineEvents: ReadonlyArray<DndEvent>
}

// --- Fighter: Second Wind ---

export function canExecuteSecondWind(featureState: FeatureState, ctx: DndContext): boolean {
  if (!featureState.fighter) return false
  return canUseSecondWind({
    hp: ctx.hp,
    maxHp: ctx.maxHp,
    secondWindCharges: featureState.fighter.secondWindCharges,
    bonusActionUsed: ctx.bonusActionUsed
  })
}

export function executeSecondWind(
  featureState: FeatureState,
  ctx: DndContext,
  d10Roll: number,
  fighterLevel: number
): BridgeResult {
  if (!featureState.fighter) throw new Error("executeSecondWind called without fighter state")
  const result = applySecondWind(
    {
      hp: ctx.hp,
      maxHp: ctx.maxHp,
      secondWindCharges: featureState.fighter.secondWindCharges,
      bonusActionUsed: ctx.bonusActionUsed
    },
    { d10Roll, fighterLevel },
    ctx.effectiveSpeed
  )

  return {
    featureAction: { type: "FIGHTER_USE_SECOND_WIND" },
    machineEvents: [{ type: "USE_BONUS_ACTION" }, { type: "HEAL", amount: healAmount(result.healAmount) }]
  }
}

// --- Fighter: Action Surge ---

export function canExecuteActionSurge(featureState: FeatureState, ctx: DndContext): boolean {
  if (!featureState.fighter) return false
  return canUseActionSurge({
    actionSurgeCharges: featureState.fighter.actionSurgeCharges,
    actionSurgeUsedThisTurn: featureState.fighter.actionSurgeUsedThisTurn,
    actionsRemaining: ctx.actionsRemaining
  })
}

export function executeActionSurge(featureState: FeatureState): BridgeResult {
  if (!featureState.fighter) throw new Error("executeActionSurge called without fighter state")
  return {
    featureAction: { type: "FIGHTER_USE_ACTION_SURGE" },
    machineEvents: [{ type: "GRANT_EXTRA_ACTION" }]
  }
}

// --- Barbarian: Rage ---

export function canExecuteEnterRage(featureState: FeatureState, ctx: DndContext): boolean {
  if (!featureState.barbarian) return false
  const b = featureState.barbarian
  // TODO: armor weight should come from context/config, not hardcoded.
  // Currently no heavy armor tracking in DndContext — caller must prevent raging in heavy armor.
  return !b.raging && !ctx.bonusActionUsed && canEnterRage(b.rageCharges, "light")
}

export function executeEnterRage(_featureState: FeatureState, ctx: DndContext): BridgeResult {
  // Entering rage costs a Bonus Action and breaks concentration if active
  const machineEvents: ReadonlyArray<DndEvent> =
    ctx.concentrationSpellId !== ""
      ? [{ type: "USE_BONUS_ACTION" }, { type: "BREAK_CONCENTRATION" }]
      : [{ type: "USE_BONUS_ACTION" }]
  return {
    featureAction: { type: "BARBARIAN_ENTER_RAGE" },
    machineEvents
  }
}

export function canExecuteEndRage(featureState: FeatureState): boolean {
  return featureState.barbarian?.raging === true
}

export function executeEndRage(): BridgeResult {
  return {
    featureAction: { type: "BARBARIAN_END_RAGE" },
    machineEvents: []
  }
}

export function canExecuteExtendRageBA(featureState: FeatureState, ctx: DndContext): boolean {
  if (!featureState.barbarian) return false
  return featureState.barbarian.raging && !ctx.bonusActionUsed
}

export function executeExtendRageBA(): BridgeResult {
  return {
    featureAction: { type: "BARBARIAN_EXTEND_RAGE_BA" },
    machineEvents: [{ type: "USE_BONUS_ACTION" }]
  }
}

export function canExecuteDeclareReckless(featureState: FeatureState): boolean {
  if (!featureState.barbarian) return false
  return !featureState.barbarian.recklessThisTurn
}

export function executeDeclareReckless(): BridgeResult {
  return {
    featureAction: { type: "BARBARIAN_DECLARE_RECKLESS" },
    machineEvents: []
  }
}

// --- Barbarian: Query functions (no BridgeResult -- pure data for UI) ---

export function getRageResistances(featureState: FeatureState): ReadonlySet<DamageType> {
  if (!featureState.barbarian) return new Set()
  return rageResistances(featureState.barbarian.raging)
}

export function getIsRaging(featureState: FeatureState): boolean {
  return featureState.barbarian?.raging === true
}

export function getRageDamageBonus(featureState: FeatureState, barbarianLevel: number): number {
  if (!featureState.barbarian?.raging) return 0
  return rageDamageBonus(barbarianLevel)
}

// --- Berserker: Frenzy (L3) ---

export function canExecuteFrenzy(
  featureState: FeatureState,
  berserkerLevel: number,
  isStrengthBased: boolean
): boolean {
  if (!featureState.barbarian || berserkerLevel < 3) return false
  const b = featureState.barbarian
  return canApplyFrenzy(b.raging, b.recklessThisTurn, isStrengthBased, b.frenzyUsedThisTurn)
}

export function executeFrenzy(): BridgeResult {
  return {
    featureAction: { type: "BERSERKER_APPLY_FRENZY" },
    machineEvents: []
  }
}

export function getFrenzyDamageDice(featureState: FeatureState, barbarianLevel: number): number {
  if (!featureState.barbarian?.raging) return 0
  return frenzyDamageDice(rageDamageBonus(barbarianLevel))
}

// --- Berserker: Mindless Rage (L6) ---

export function getMindlessRageImmunities(featureState: FeatureState, berserkerLevel: number): ReadonlySet<Condition> {
  if (!featureState.barbarian) return new Set()
  return mindlessRageImmunities(featureState.barbarian.raging, berserkerLevel)
}

export const getEnterRageConditionsToRemove: (
  currentConditions: ReadonlyArray<Condition>,
  berserkerLevel: number
) => ReadonlyArray<Condition> = mindlessRageOnEnterRage

export function executeEnterRageWithMindlessRage(
  _featureState: FeatureState,
  ctx: DndContext,
  berserkerLevel: number,
  currentConditions: ReadonlyArray<Condition>
): BridgeResult {
  const conditionsToRemove = mindlessRageOnEnterRage(currentConditions, berserkerLevel)
  const baseEvents: ReadonlyArray<DndEvent> =
    ctx.concentrationSpellId !== ""
      ? [{ type: "USE_BONUS_ACTION" }, { type: "BREAK_CONCENTRATION" }]
      : [{ type: "USE_BONUS_ACTION" }]
  const removeEvents: ReadonlyArray<DndEvent> = conditionsToRemove.map((c) => ({
    type: "REMOVE_CONDITION" as const,
    condition: c
  }))
  return {
    featureAction: { type: "BARBARIAN_ENTER_RAGE" },
    machineEvents: [...baseEvents, ...removeEvents]
  }
}

// --- Berserker: Retaliation (L10) ---

export function canExecuteRetaliation(
  featureState: FeatureState,
  ctx: DndContext,
  berserkerLevel: number,
  damagedByCreatureWithin5ft: boolean
): boolean {
  if (!featureState.barbarian) return false
  return canRetaliate(berserkerLevel, ctx.reactionAvailable, damagedByCreatureWithin5ft)
}

export function executeRetaliation(): BridgeResult {
  return {
    featureAction: { type: "BERSERKER_USE_RETALIATION" },
    machineEvents: [{ type: "USE_REACTION" }]
  }
}

// --- Berserker: Intimidating Presence (L14) ---

export function canExecuteIntimidatingPresence(
  featureState: FeatureState,
  ctx: DndContext,
  berserkerLevel: number
): boolean {
  if (!featureState.barbarian) return false
  return canUseIntimidatingPresence(
    berserkerLevel,
    ctx.bonusActionUsed,
    featureState.barbarian.intimidatingPresenceUsed
  )
}

export function executeIntimidatingPresence(): BridgeResult {
  return {
    featureAction: { type: "BERSERKER_USE_INTIMIDATING_PRESENCE" },
    machineEvents: [{ type: "USE_BONUS_ACTION" }]
  }
}

export const getIntimidatingPresenceDC: (strMod: number, profBonus: number) => number = intimidatingPresenceDC

// --- Paladin: Lay on Hands ---

export function canExecuteLayOnHandsHeal(featureState: FeatureState, ctx: DndContext): boolean {
  if (!featureState.paladin) return false
  return canLayOnHandsHealPure({
    hp: ctx.hp,
    maxHp: ctx.maxHp,
    layOnHandsPool: featureState.paladin.layOnHandsPool,
    conditions: []
  })
}

export function executeLayOnHandsHeal(featureState: FeatureState, ctx: DndContext, amount: number): BridgeResult {
  if (!featureState.paladin) throw new Error("executeLayOnHandsHeal called without paladin state")
  const result = pLayOnHandsPure(
    {
      hp: ctx.hp,
      maxHp: ctx.maxHp,
      layOnHandsPool: featureState.paladin.layOnHandsPool,
      conditions: []
    },
    amount
  )
  return {
    featureAction: { type: "PALADIN_LAY_ON_HANDS", poolAfter: result.layOnHandsPool },
    machineEvents: [{ type: "HEAL", amount: healAmount(result.healedAmount) }]
  }
}

export function canExecuteLayOnHandsCure(
  featureState: FeatureState,
  condition: Condition,
  paladinLevel: number,
  currentConditions: ReadonlyArray<Condition>
): boolean {
  if (!featureState.paladin) return false
  return canLayOnHandsCurePure(
    {
      hp: 1,
      maxHp: 1,
      layOnHandsPool: featureState.paladin.layOnHandsPool,
      conditions: currentConditions
    },
    condition,
    paladinLevel
  )
}

export function executeLayOnHandsCure(featureState: FeatureState, condition: Condition): BridgeResult {
  if (!featureState.paladin) throw new Error("executeLayOnHandsCure called without paladin state")
  const result = pLayOnHandsCurePure(
    {
      hp: 1,
      maxHp: 1,
      layOnHandsPool: featureState.paladin.layOnHandsPool,
      conditions: [condition]
    },
    condition
  )
  return {
    featureAction: { type: "PALADIN_LAY_ON_HANDS_CURE", poolAfter: result.layOnHandsPool },
    machineEvents: [{ type: "REMOVE_CONDITION", condition }]
  }
}

// --- Paladin: Smite (free use per turn) ---

export function canExecutePaladinSmiteFree(featureState: FeatureState): boolean {
  if (!featureState.paladin) return false
  return canPaladinSmiteFreePure({ paladinSmiteFreeUseAvailable: !featureState.paladin.smiteFreeUsed })
}

export function executePaladinSmiteFree(): BridgeResult {
  return {
    featureAction: { type: "PALADIN_SMITE_FREE" },
    machineEvents: []
  }
}

// --- Paladin: Query functions ---

export const getDivineSmiteDamage: (slotLevel: number, isUndeadOrFiend: boolean) => number = pDivineSmiteDamagePure

export const getAuraOfProtectionBonus: (paladinLevel: number, chaMod: number) => number = auraOfProtectionBonusPure

export const getCanUseAuraOfProtection: (paladinLevel: number, isConscious: boolean) => boolean =
  canUseAuraOfProtectionPure

export const getHasDivineHealth: (paladinLevel: number) => boolean = hasDivineHealthPure

export const getRadiantStrikesDice: (config: RadiantStrikesConfig) => number = pRadiantStrikesPure

// --- Monk bridge: extracted to feature-bridge-monk.ts to stay under max-lines ---
export {
  canExecuteFlurryOfBlows,
  canExecutePatientDefenseFocus,
  canExecutePatientDefenseFree,
  canExecuteStepOfTheWindFocus,
  canExecuteStepOfTheWindFree,
  canExecuteStunningStrike,
  canExecuteUncannyMetabolism,
  executeFlurryOfBlows,
  executePatientDefenseFocus,
  executePatientDefenseFree,
  executeStepOfTheWindFocus,
  executeStepOfTheWindFree,
  executeStunningStrike,
  executeUncannyMetabolism,
  getBonusUnarmedStrikeEligible,
  getMartialArtsDie
} from "#/features/feature-bridge-monk.ts"
