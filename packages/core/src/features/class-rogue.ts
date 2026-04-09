import { featureSaveDC } from "#/srd-constants.ts";
import type {
  AbilityModifier,
  Condition,
  DifficultyClass,
  Size,
} from "#/types.ts";

// --- Constants ---

const UNCANNY_DODGE_LEVEL = 5;
const CUNNING_ACTION_LEVEL = 2;
const STEADY_AIM_LEVEL = 3;
const CUNNING_STRIKE_LEVEL = 5;
const IMPROVED_CS_LEVEL = 11;
const DEVIOUS_STRIKES_LEVEL = 14;

// --- Types (arrays first, types derived) ---

const CUNNING_STRIKE_EFFECTS = ["poison", "trip", "withdraw"] as const;
const DEVIOUS_STRIKE_EFFECTS = ["daze", "knockOut", "obscure"] as const;
export const ALL_STRIKE_EFFECTS = [
  ...CUNNING_STRIKE_EFFECTS,
  ...DEVIOUS_STRIKE_EFFECTS,
] as const;

/** Cunning Strike effects available at L5 */
export type CunningStrikeEffect = (typeof CUNNING_STRIKE_EFFECTS)[number];

/** Devious Strikes effects available at L14 */
export type DeviousStrikeEffect = (typeof DEVIOUS_STRIKE_EFFECTS)[number];

/** All possible strike effects */
export type StrikeEffect = (typeof ALL_STRIKE_EFFECTS)[number];

const DEVIOUS_EFFECTS: ReadonlySet<string> = new Set(DEVIOUS_STRIKE_EFFECTS);
const TRIP_VALID_SIZES: ReadonlySet<string> = new Set([
  "tiny",
  "small",
  "medium",
  "large",
] as const satisfies ReadonlyArray<Size>);

/** Cunning Action choices (L2 Rogue) */
export const CUNNING_ACTION_CHOICES = ["dash", "disengage", "hide"] as const;

export type CunningActionChoice = (typeof CUNNING_ACTION_CHOICES)[number];

/** Result of using Cunning Action */
export interface CunningActionResult {
  readonly bonusActionUsed: true;
  readonly action: CunningActionChoice;
  readonly dashGranted: boolean;
  readonly disengageGranted: boolean;
  readonly hideGranted: boolean;
}

/** Result of applying Steady Aim */
export interface SteadyAimResult {
  readonly hasAdvantage: boolean;
  readonly speed: number;
  readonly steadyAimUsedThisTurn: boolean;
}

/** Result of applying Sneak Attack damage */
export interface SneakAttackResult {
  readonly extraDamage: number;
  readonly sneakAttackUsedThisTurn: boolean;
}

/** Result of applying a Cunning Strike effect */
export interface CunningStrikeResult {
  readonly remainingDice: number;
  readonly appliedCondition: Condition | null;
  readonly withdrawMovement: number;
  readonly dazeApplied: boolean;
}

// --- Sneak Attack ---

/** Number of Sneak Attack dice at a given Rogue level. Matches SRD table: ceil(level/2). */
export function sneakAttackDice(rogueLevel: number): number {
  if (rogueLevel < 1) return 0;
  return Math.ceil(rogueLevel / 2);
}

/**
 * Whether Sneak Attack can be applied.
 * SRD: Must use Finesse or Ranged weapon. Must have Advantage OR an ally within 5ft
 * who is not Incapacitated (and you don't have Disadvantage).
 */
export function canSneakAttack(params: {
  readonly hasAdvantage: boolean;
  readonly hasDisadvantage: boolean;
  readonly allyAdjacentAndNotIncapacitated: boolean;
  readonly isFinesse: boolean;
  readonly isRanged: boolean;
  readonly sneakAttackUsedThisTurn: boolean;
}): boolean {
  if (params.sneakAttackUsedThisTurn) return false;
  if (!params.isFinesse && !params.isRanged) return false;
  if (params.hasAdvantage) return true;
  if (params.allyAdjacentAndNotIncapacitated && !params.hasDisadvantage)
    return true;
  return false;
}

/** Apply Sneak Attack: returns extra damage from dice result plus marks SA as used. */
export function applySneakAttack(diceResult: number): SneakAttackResult {
  return {
    extraDamage: diceResult,
    sneakAttackUsedThisTurn: true,
  };
}

// --- Cunning Action (L2) ---

/**
 * SRD: "Your quick thinking and agility allow you to move and act quickly.
 * On your turn, you can take one of the following actions as a Bonus Action:
 * Dash, Disengage, or Hide."
 * Requires L2+ Rogue and bonus action not yet used.
 */
export function canUseCunningAction(
  rogueLevel: number,
  bonusActionUsed: boolean,
): boolean {
  if (rogueLevel < CUNNING_ACTION_LEVEL) return false;
  if (bonusActionUsed) return false;
  return true;
}

/** Use Cunning Action: consumes bonus action and grants the chosen action effect. */
export function useCunningAction(
  choice: CunningActionChoice,
): CunningActionResult {
  return {
    bonusActionUsed: true,
    action: choice,
    dashGranted: choice === "dash",
    disengageGranted: choice === "disengage",
    hideGranted: choice === "hide",
  };
}

// --- Steady Aim (L3) ---

/**
 * Apply Steady Aim as a Bonus Action.
 * SRD: Can only use if you haven't moved this turn. Grants Advantage on next attack roll.
 * Speed becomes 0 until end of turn.
 */
export function canSteadyAim(params: {
  readonly rogueLevel: number;
  readonly hasMovedThisTurn: boolean;
  readonly steadyAimUsedThisTurn: boolean;
  readonly bonusActionUsed: boolean;
}): boolean {
  if (params.rogueLevel < STEADY_AIM_LEVEL) return false;
  if (params.bonusActionUsed) return false;
  if (params.hasMovedThisTurn) return false;
  if (params.steadyAimUsedThisTurn) return false;
  return true;
}

export function applySteadyAim(): SteadyAimResult {
  return {
    hasAdvantage: true,
    speed: 0,
    steadyAimUsedThisTurn: true,
  };
}

// --- Cunning Strike (L5) ---

/** Die cost for each Cunning Strike / Devious Strike effect. */
export function strikeDieCost(effect: StrikeEffect): number {
  /* eslint-disable no-magic-numbers */
  switch (effect) {
    case "poison":
      return 1;
    case "trip":
      return 1;
    case "withdraw":
      return 1;
    case "daze":
      return 2;
    case "knockOut":
      return 6;
    case "obscure":
      return 3;
  }
  /* eslint-enable no-magic-numbers */
}

/** Whether a Cunning Strike effect can be applied given remaining SA dice. */
export function canApplyCunningStrike(params: {
  readonly rogueLevel: number;
  readonly sneakAttackDiceRemaining: number;
  readonly effect: StrikeEffect;
}): boolean {
  if (params.rogueLevel < CUNNING_STRIKE_LEVEL) return false;
  if (
    DEVIOUS_EFFECTS.has(params.effect) &&
    params.rogueLevel < DEVIOUS_STRIKES_LEVEL
  )
    return false;

  return params.sneakAttackDiceRemaining >= strikeDieCost(params.effect);
}

/** Maximum number of Cunning Strike effects per Sneak Attack. */
export function maxCunningStrikeEffects(rogueLevel: number): number {
  if (rogueLevel < CUNNING_STRIKE_LEVEL) return 0;
  if (rogueLevel >= IMPROVED_CS_LEVEL) return 2;
  return 1;
}

/** SRD: DC = 8 + Dexterity modifier + Proficiency Bonus. */
export const cunningStrikeDC: (
  dexModifier: AbilityModifier,
  profBonus: number,
) => DifficultyClass = featureSaveDC;

/**
 * Apply a Cunning Strike effect. Deducts dice cost and applies the effect if save fails.
 * Returns remaining dice and what was applied.
 *
 * SRD effects on failed save:
 * - Poison: Poisoned condition for 1 minute
 * - Trip: Prone condition (target must be Large or smaller)
 * - Withdraw: Move up to half speed without OAs (no save needed)
 * - Daze: Incapacitated-like (modeled as condition) until end of target's next turn
 * - Knock Out: Unconscious for 1 minute (wakes on damage)
 * - Obscure: Blinded until end of target's next turn
 */
export function applyCunningStrike(params: {
  readonly effect: StrikeEffect;
  readonly sneakAttackDiceRemaining: number;
  readonly savePassed: boolean;
  readonly targetSize: Size;
  readonly halfSpeed: number;
}): CunningStrikeResult {
  const cost = strikeDieCost(params.effect);
  const remainingDice = params.sneakAttackDiceRemaining - cost;

  // Withdraw has no save — it always works
  if (params.effect === "withdraw") {
    return {
      remainingDice,
      appliedCondition: null,
      withdrawMovement: params.halfSpeed,
      dazeApplied: false,
    };
  }

  // All other effects require a failed save
  if (params.savePassed) {
    return {
      remainingDice,
      appliedCondition: null,
      withdrawMovement: 0,
      dazeApplied: false,
    };
  }

  switch (params.effect) {
    case "poison":
      return {
        remainingDice,
        appliedCondition: "poisoned",
        withdrawMovement: 0,
        dazeApplied: false,
      };
    case "trip": {
      // SRD: "If the target is Large or smaller"
      if (!TRIP_VALID_SIZES.has(params.targetSize)) {
        return {
          remainingDice,
          appliedCondition: null,
          withdrawMovement: 0,
          dazeApplied: false,
        };
      }
      return {
        remainingDice,
        appliedCondition: "prone",
        withdrawMovement: 0,
        dazeApplied: false,
      };
    }
    case "daze":
      // SRD: "it can do only one of the following: move or take an action or a Bonus Action"
      // Modeled as a special flag rather than a standard condition
      return {
        remainingDice,
        appliedCondition: null,
        withdrawMovement: 0,
        dazeApplied: true,
      };
    case "knockOut":
      return {
        remainingDice,
        appliedCondition: "unconscious",
        withdrawMovement: 0,
        dazeApplied: false,
      };
    case "obscure":
      return {
        remainingDice,
        appliedCondition: "blinded",
        withdrawMovement: 0,
        dazeApplied: false,
      };
  }
}

// --- Turn reset ---

/** Reset Rogue per-turn state at start of turn. */
export function resetRogueTurnState(): {
  readonly sneakAttackUsedThisTurn: boolean;
  readonly steadyAimUsedThisTurn: boolean;
} {
  return {
    sneakAttackUsedThisTurn: false,
    steadyAimUsedThisTurn: false,
  };
}

// --- Uncanny Dodge (L5) ---

/** SRD 5.2.1: Halve attack damage (round down). */
export function uncannyDodgeDamage(damage: number): number {
  return Math.floor(damage / 2);
}

/** Gate: can use Uncanny Dodge right now? */
export function canUncannyDodge(params: {
  readonly rogueLevel: number;
  readonly reactionAvailable: boolean;
  readonly attackerVisible: boolean;
  readonly isIncapacitated: boolean;
}): boolean {
  return (
    params.rogueLevel >= UNCANNY_DODGE_LEVEL &&
    params.reactionAvailable &&
    params.attackerVisible &&
    !params.isIncapacitated
  );
}

// --- Evasion (L7) ---

/**
 * SRD 5.2.1 Evasion (Rogue 7, Monk 7): DEX save success -> 0; fail -> half.
 * Can't use if Incapacitated.
 */
export function evasionDamage(
  hasEvasion: boolean,
  isIncapacitated: boolean,
  dexSaveSucceeded: boolean,
  fullDamage: number,
): number {
  if (!hasEvasion || isIncapacitated) return fullDamage;
  if (dexSaveSucceeded) return 0;
  return Math.floor(fullDamage / 2);
}

// --- Passive Features (High-Level) ---

export const RELIABLE_TALENT_LEVEL = 7;
export const SLIPPERY_MIND_LEVEL = 15;
export const ELUSIVE_LEVEL = 18;
export const STROKE_OF_LUCK_LEVEL = 20;

/** Result of using Stroke of Luck on an attack */
export interface StrokeOfLuckAttackResult {
  readonly turnMissIntoHit: true;
  readonly strokeOfLuckUsed: true;
}

/** Result of using Stroke of Luck on an ability check */
export interface StrokeOfLuckAbilityCheckResult {
  readonly treatAs20: true;
  readonly strokeOfLuckUsed: true;
}

// --- Reliable Talent (L7) ---

/**
 * SRD 5.2.1: Whenever you make an ability check that uses one of your skill or tool
 * proficiencies, you can treat a d20 roll of 9 or lower as a 10.
 */
export function reliableTalent(
  rogueLevel: number,
  d20Roll: number,
  isProficient: boolean,
): number {
  /* eslint-disable no-magic-numbers */
  if (rogueLevel < RELIABLE_TALENT_LEVEL) return d20Roll;
  if (!isProficient) return d20Roll;
  return Math.max(10, d20Roll);
  /* eslint-enable no-magic-numbers */
}

// --- Slippery Mind (L15) ---

/** SRD 5.2.1: You gain proficiency in Wisdom and Charisma saving throws. */
export function hasSlipperyMind(rogueLevel: number): boolean {
  return rogueLevel >= SLIPPERY_MIND_LEVEL;
}

// --- Elusive (L18) ---

/**
 * SRD: No attack roll can have Advantage against you unless you have the
 * Incapacitated condition.
 * Returns true if Elusive cancels incoming advantage.
 */
export function elusiveCancelsAdvantage(
  rogueLevel: number,
  isIncapacitated: boolean,
): boolean {
  if (rogueLevel < ELUSIVE_LEVEL) return false;
  if (isIncapacitated) return false;
  return true;
}

// --- Stroke of Luck (L20) ---

/**
 * SRD: If you fail a D20 Test, you can turn the roll into a 20.
 * Once per Short or Long Rest.
 */
export function canUseStrokeOfLuck(
  rogueLevel: number,
  strokeOfLuckUsed: boolean,
): boolean {
  if (rogueLevel < STROKE_OF_LUCK_LEVEL) return false;
  if (strokeOfLuckUsed) return false;
  return true;
}

/** Use Stroke of Luck to turn a missed attack into a hit. */
export function strokeOfLuckAttack(): StrokeOfLuckAttackResult {
  return { turnMissIntoHit: true, strokeOfLuckUsed: true };
}

/** Use Stroke of Luck to treat a failed ability check d20 roll as a 20. */
export function strokeOfLuckAbilityCheck(): StrokeOfLuckAbilityCheckResult {
  return { treatAs20: true, strokeOfLuckUsed: true };
}

// =============================================================================
// Thief Subclass (SRD 5.2.1)
//
// TS-only: all features are capability flags, movement modifiers, or
// positional checks — no state transitions trackable in Quint.
// =============================================================================

const THIEF_SUBCLASS_LEVEL = 3;
const SUPREME_SNEAK_LEVEL = 9;
const USE_MAGIC_DEVICE_LEVEL = 13;
const THIEFS_REFLEXES_LEVEL = 17;
// --- Fast Hands (L3) ---

/**
 * SRD: "As a Bonus Action, you can do one of the following: Sleight of Hand
 * (pick lock, disarm trap, pick pocket) or Use an Object (Utilize or Magic action)."
 * Extends Cunning Action options. Capability flag — caller handles the action.
 */
export function hasFastHands(rogueLevel: number): boolean {
  return rogueLevel >= THIEF_SUBCLASS_LEVEL;
}

// --- Second-Story Work (L3) ---

/**
 * SRD: "You gain a Climb Speed equal to your Speed."
 * Returns the climb speed granted (equal to walk speed), or 0 if below L3.
 */
export function secondStoryClimbSpeed(
  rogueLevel: number,
  walkSpeed: number,
): number {
  return rogueLevel >= THIEF_SUBCLASS_LEVEL ? walkSpeed : 0;
}

/**
 * SRD: "You can determine your jump distance using your Dexterity
 * rather than your Strength."
 * Returns which ability score to use for jump distance calculation.
 */
export function jumpAbility(rogueLevel: number): "dexterity" | "strength" {
  return rogueLevel >= THIEF_SUBCLASS_LEVEL ? "dexterity" : "strength";
}

// --- Supreme Sneak (L9) — Stealth Attack Cunning Strike option ---

/**
 * SRD: "Stealth Attack (Cost: 1d6). If you have the Hide action's Invisible
 * condition, this attack doesn't end that condition on you if you end the turn
 * behind Three-Quarters Cover or Total Cover."
 */
export function hasStealthAttack(rogueLevel: number): boolean {
  return rogueLevel >= SUPREME_SNEAK_LEVEL;
}

/**
 * Returns whether the Invisible condition is preserved after a Stealth Attack.
 * Requires ending the turn behind 3/4 or Total Cover.
 */
export function stealthAttackPreservesInvisible(
  behindCover: string | null,
): boolean {
  return behindCover === "threeQuarters" || behindCover === "total";
}

/** SA dice cost for Stealth Attack (1d6). */
export const STEALTH_ATTACK_DICE_COST = 1;

// --- Use Magic Device (L13) ---

/**
 * SRD: Attune up to 4 items; chance to not expend charges (roll 6 on d6);
 * can use any Spell Scroll (INT as spellcasting ability).
 * Capability flag — caller handles attunement and scroll logic.
 */
export function hasUseMagicDevice(rogueLevel: number): boolean {
  return rogueLevel >= USE_MAGIC_DEVICE_LEVEL;
}

/** Roll d6; on 6, charges are not expended. Returns true if charges saved. */
export function magicDeviceChargesSaved(d6Roll: number): boolean {
  return d6Roll === 6;
}

/** Spell Scroll DC for Use Magic Device: 10 + spell level. */
export function magicDeviceScrollDC(spellLevel: number): number {
  return 10 + spellLevel;
}

// --- Thief's Reflexes (L17) ---

/**
 * SRD: "You can take two turns during the first round of any combat.
 * You take your first turn at your normal Initiative and your second turn
 * at your Initiative minus 10."
 * Capability flag — caller manages the extra turn.
 */
export function hasThiefsReflexes(rogueLevel: number): boolean {
  return rogueLevel >= THIEFS_REFLEXES_LEVEL;
}

/** Returns the initiative value for the second turn. */
export function thiefsReflexesSecondInitiative(
  normalInitiative: number,
): number {
  return normalInitiative - 10;
}
