import {
  canApplyFrenzy,
  canEnterRage,
  canRetaliate,
  canUseDangerSense,
  canUseIntimidatingPresence,
  canUseRelentlessRage,
  fastMovementBonus,
  frenzyDamageDice,
  hasFeralInstinct,
  indomitableMight,
  instinctivePounceDistance,
  intimidatingPresenceDC,
  mindlessRageImmunities,
  mindlessRageOnEnterRage,
  primalChampionBonus,
  rageDamageBonus,
  rageResistances,
  relentlessRageDC,
  relentlessRageResult
} from "#/features/class-barbarian.ts"
import {
  canUseActionSurge,
  canUseIndomitable,
  canUseSecondWind,
  canUseTacticalMind,
  championCritRange,
  hasRemarkableAthlete,
  heroicWarriorInspiration,
  remarkableAthleteCritMovement,
  survivorDefyDeathAdvantage,
  survivorHeroicRally,
  useSecondWind as applySecondWind
} from "#/features/class-fighter.ts"
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

// --- Fighter: Tactical Mind ---

export function canExecuteTacticalMind(
  featureState: FeatureState,
  fighterLevel: number,
  checkFailed: boolean
): boolean {
  if (!featureState.fighter) return false
  return canUseTacticalMind(featureState.fighter.secondWindCharges, fighterLevel, checkFailed)
}

// SRD: "If the check still fails, this use of Second Wind isn't expended."
// Only dispatch the charge-decrement action if the boosted check succeeded.
export function executeTacticalMind(boostedCheckSucceeded: boolean): BridgeResult {
  return {
    featureAction: boostedCheckSucceeded ? { type: "FIGHTER_USE_TACTICAL_MIND" } : { type: "NOTIFY_START_TURN" }, // no-op: charge not consumed
    machineEvents: []
  }
}

// --- Fighter: Indomitable ---

export function canExecuteIndomitable(featureState: FeatureState, fighterLevel: number): boolean {
  if (!featureState.fighter) return false
  return canUseIndomitable(fighterLevel, featureState.fighter.indomitableCharges)
}

export function executeIndomitable(): BridgeResult {
  return {
    featureAction: { type: "FIGHTER_USE_INDOMITABLE" },
    machineEvents: []
  }
}

// --- Champion subclass queries (passive — no state) ---

export {
  championCritRange,
  hasRemarkableAthlete,
  heroicWarriorInspiration,
  remarkableAthleteCritMovement,
  survivorDefyDeathAdvantage,
  survivorHeroicRally
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

const EMPTY_SET: ReadonlySet<never> = new Set()

export function getRageResistances(featureState: FeatureState): ReadonlySet<DamageType> {
  if (!featureState.barbarian) return EMPTY_SET
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
  if (!featureState.barbarian) return EMPTY_SET
  return mindlessRageImmunities(featureState.barbarian.raging, berserkerLevel)
}

export const getEnterRageConditionsToRemove: (
  currentConditions: ReadonlyArray<Condition>,
  berserkerLevel: number
) => ReadonlyArray<Condition> = mindlessRageOnEnterRage

export function executeEnterRageWithMindlessRage(
  featureState: FeatureState,
  ctx: DndContext,
  berserkerLevel: number,
  currentConditions: ReadonlyArray<Condition>
): BridgeResult {
  const base = executeEnterRage(featureState, ctx)
  const conditionsToRemove = mindlessRageOnEnterRage(currentConditions, berserkerLevel)
  if (conditionsToRemove.length === 0) return base
  const removeEvents: ReadonlyArray<DndEvent> = conditionsToRemove.map((c) => ({
    type: "REMOVE_CONDITION" as const,
    condition: c
  }))
  return {
    featureAction: base.featureAction,
    machineEvents: [...base.machineEvents, ...removeEvents]
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

// --- Barbarian: Passive queries (re-exported pure functions) ---

export {
  canUseDangerSense,
  fastMovementBonus,
  hasFeralInstinct,
  indomitableMight,
  instinctivePounceDistance,
  primalChampionBonus
}

// --- Barbarian: Relentless Rage (needs BridgeResult / state) ---

export function canExecuteRelentlessRage(featureState: FeatureState, barbarianLevel: number): boolean {
  if (!featureState.barbarian) return false
  return canUseRelentlessRage(barbarianLevel, featureState.barbarian.raging)
}

export function executeRelentlessRage(conSaveSucceeded: boolean, barbarianLevel: number): BridgeResult {
  // relentlessRageResult is available for callers to check HP outcome;
  // the rage ending on failure is handled by the caller based on result
  void relentlessRageResult(conSaveSucceeded, barbarianLevel)
  return {
    featureAction: { type: "BARBARIAN_USE_RELENTLESS_RAGE" },
    machineEvents: []
  }
}

export function getRelentlessRageDC(featureState: FeatureState): number {
  if (!featureState.barbarian) return 0
  return relentlessRageDC(featureState.barbarian.relentlessRageTimesUsed)
}

// --- Paladin bridge: extracted to feature-bridge-paladin.ts to stay under max-lines ---
export {
  canExecuteAbjureFoes,
  canExecuteFaithfulSteed,
  canExecuteLayOnHandsCure,
  canExecuteLayOnHandsHeal,
  canExecutePaladinSmiteFree,
  canExecuteRestoringTouch,
  executeAbjureFoes,
  executeFaithfulSteed,
  executeLayOnHandsCure,
  executeLayOnHandsHeal,
  executePaladinSmiteFree,
  executeRestoringTouch,
  getAbjureFoesResult,
  getAuraOfCourageRange,
  getAuraOfProtectionBonus,
  getAuraOfProtectionRange,
  getCanUseAuraOfCourage,
  getCanUseAuraOfProtection,
  getDivineSmiteDamage,
  getRadiantStrikesDice
} from "#/features/feature-bridge-paladin.ts"

// --- Monk bridge: extracted to feature-bridge-monk.ts to stay under max-lines ---
export {
  canExecuteDeflectAttacks,
  canExecuteDisciplinedSurvivorReroll,
  canExecuteFlurryOfBlows,
  canExecutePatientDefenseFocus,
  canExecutePatientDefenseFree,
  canExecuteQuiveringPalm,
  canExecuteSlowFall,
  canExecuteStepOfTheWindFocus,
  canExecuteStepOfTheWindFree,
  canExecuteStunningStrike,
  canExecuteSuperiorDefense,
  canExecuteUncannyMetabolism,
  canExecuteWholenessOfBody,
  canSelfRestore,
  executeDeflectAttacks,
  executeDisciplinedSurvivorReroll,
  executeFlurryOfBlows,
  executePatientDefenseFocus,
  executePatientDefenseFree,
  executeQuiveringPalm,
  executeSlowFall,
  executeStepOfTheWindFocus,
  executeStepOfTheWindFree,
  executeStunningStrike,
  executeSuperiorDefense,
  executeTriggerQuiveringPalm,
  executeUncannyMetabolism,
  executeWholenessOfBody,
  getBonusUnarmedStrikeEligible,
  getMartialArtsDie,
  hasDeflectEnergy,
  hasDisciplinedSurvivor,
  hasFleetStep,
  hasFocusEmpoweredStrikes,
  selfRestorationConditions,
  unarmoredMovementBonus
} from "#/features/feature-bridge-monk.ts"

// --- Rogue bridge: extracted to feature-bridge-rogue.ts to stay under max-lines ---
export {
  canExecuteCunningAction,
  canExecuteCunningStrike,
  canExecuteSneakAttack,
  canExecuteSteadyAim,
  canExecuteStrokeOfLuck,
  executeCunningAction,
  executeSneakAttack,
  executeSteadyAim,
  executeStrokeOfLuck,
  getElusiveCancelsAdvantage,
  getHasSlipperyMind,
  getReliableTalent,
  getSneakAttackDice
} from "#/features/feature-bridge-rogue.ts"
