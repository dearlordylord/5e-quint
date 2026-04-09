/**
 * Battle-level XState machine types — mirrors battle.qnt state variables and types.
 * Flat context with Map<CreatureId, BattleCreature>, phase as discriminated union.
 */
import type { Option } from "effect";

// Events, decisions, and interrupts extracted to battle-machine-events.ts for max-lines compliance.
import type {
  DmgReactionKind,
  HitReactionKind,
  PendingInterrupt,
  TriggerType,
} from "#/battle-machine-events.ts";
import type {
  Ability,
  ActiveEffect,
  ArmorClass,
  Condition,
  CreatureId,
  CreatureKind,
  DamageType,
  DifficultyClass,
  IncapSource,
  Size,
  SpellId,
  SpellSlotLevel,
} from "#/types.ts";

export type { CreatureId } from "#/types.ts";

export interface BattleCreatureState {
  readonly hp: number;
  readonly maxHp: number;
  readonly tempHp: number;
  readonly deathSaves: {
    readonly successes: number;
    readonly failures: number;
  };
  readonly stable: boolean;
  readonly dead: boolean;
  readonly blinded: boolean;
  readonly charmed: boolean;
  readonly deafened: boolean;
  readonly exhaustion: number;
  readonly frightened: boolean;
  readonly grappled: boolean;
  readonly grappledBy: CreatureId | null;
  readonly grapplingTarget: CreatureId | null;
  readonly grappledTargetTwoSizesSmaller: boolean;
  readonly invisible: boolean;
  readonly paralyzed: boolean;
  readonly petrified: boolean;
  readonly poisoned: boolean;
  readonly prone: boolean;
  readonly restrained: boolean;
  readonly stunned: boolean;
  readonly unconscious: boolean;
  readonly incapacitatedSources: ReadonlySet<IncapSource>;
  readonly activeEffects: ReadonlyArray<ActiveEffect>;
  // TurnState
  readonly movementRemaining: number;
  readonly effectiveSpeed: number;
  readonly actionsRemaining: number;
  readonly attackActionUsed: boolean;
  readonly bonusActionUsed: boolean;
  readonly reactionAvailable: boolean;
  readonly freeInteractionUsed: boolean;
  readonly extraAttacksRemaining: number;
  readonly disengaged: boolean;
  readonly dodging: boolean;
  readonly readiedAction: boolean;
  readonly bonusActionSpellCast: boolean;
  readonly nonCantripActionSpellCast: boolean;
  readonly bonusMovementRemaining: number;
  readonly bonusMovementOAFree: boolean;
  readonly actionSurgeActionPending: boolean;
  readonly slotExpendedThisTurn: boolean;
  // SpellSlotState
  readonly slotsMax: ReadonlyArray<number>;
  readonly slotsCurrent: ReadonlyArray<number>;
  readonly pactSlotsMax: number;
  readonly pactSlotsCurrent: number;
  readonly pactSlotLevel: number;
  readonly concentrationSpellId: Option.Option<SpellId>;
  // MonsterResourceState
  readonly legendaryActionsRemaining: number;
  readonly legendaryResistancesRemaining: number;
  readonly rechargeAvailable: Readonly<Record<string, boolean>>;
  readonly dailyUsesRemaining: Readonly<Record<string, number>>;
  // Identity
  readonly creatureKind: CreatureKind;
  // Class levels tracked by battle Combatant
  readonly rogueLevel: number;
  readonly monkLevel: number;
  // Static combatant modifier owned by battle when battle-resolved rules need it.
  readonly dexMod: number;
  // Prepared spells (for CS eligibility)
  readonly preparedSpells: ReadonlySet<string>;
  // Evasion (Rogue 7, Monk 7): DEX save success = 0 dmg, fail = half
  readonly hasEvasion: boolean;
  // Misc save bonus (Paladin Aura, Ring of Protection, etc.)
  readonly saveMiscBonus: number;
  // Natural roll >= critRange is a critical hit (default 20, Champion 19/18)
  readonly critRange: number;
  // Fighter state
  readonly fighterLevel: number;
  readonly actionSurgeCharges: number;
  readonly actionSurgeUsedThisTurn: boolean;
  // Barbarian state
  readonly barbarianLevel: number;
  readonly meleeDamageBonus: number;
  readonly recklessThisTurn: boolean;
  readonly ragingBlocksSpells: boolean;
  readonly combatantResistances: ReadonlySet<DamageType>;
  // Rogue state
  readonly sneakAttackDice: number;
  readonly sneakAttackUsedThisTurn: boolean;
  // Readied spell (SRD 5.2.1 Ready action)
  readonly readiedSpellParams: ReadiedSpellParams | null;
  // Walk speed (PC: 30, Monster: from stat block)
  readonly baseWalkSpeed: number;
  readonly bardLevel: number;
  readonly bardicInspirationCharges: number;
  readonly parryAcBonus: number;
}

/** Parameters for a readied spell held with Concentration (SRD 5.2.1 Ready). */
export interface ReadiedSpellParams {
  readonly caster: CreatureId;
  readonly target: CreatureId;
  readonly saveDC: DifficultyClass;
  readonly damageOnFail: number;
  readonly halfOnSuccess: boolean;
  readonly damageType: DamageType;
  readonly conditionOnFail: Condition;
  readonly applyCondition: boolean;
  readonly saveAbility: Ability;
  readonly spellName: string;
  readonly slotLvl: SpellSlotLevel;
}

export interface AttackHitCtx {
  readonly attacker: CreatureId;
  readonly target: CreatureId;
  readonly attackRoll: number;
  readonly targetAc: ArmorClass;
  readonly damage: number;
  readonly damageType: DamageType;
  readonly isCritical: boolean;
  readonly critRange: number;
  readonly atkReturnTo: AfterDamageReturn;
  readonly knockOut: boolean;
  readonly onHitEffect?: ActiveEffect;
  readonly targetCanSeeAttackerAtHit: boolean;
  readonly isMeleeAttack: boolean;
  readonly isWeaponAttack: boolean;
  readonly legalReactionsByCreature: ReadonlyMap<
    CreatureId,
    ReadonlySet<HitReactionKind>
  >;
}

export interface AttackDamageCtx {
  readonly attacker: CreatureId;
  readonly target: CreatureId;
  readonly damage: number;
  readonly damageType: DamageType;
  readonly isCritical: boolean;
  readonly atkReturnTo: AfterDamageReturn;
  readonly knockOut: boolean;
  readonly targetCanSeeAttackerAtHit: boolean;
  readonly isWeaponAttack: boolean;
  readonly legalReactionsByCreature: ReadonlyMap<
    CreatureId,
    ReadonlySet<DmgReactionKind>
  >;
}

export interface AfterDamageCtx {
  readonly damageSource: CreatureId;
  readonly damagedCreature: CreatureId;
  readonly damageDealt: number;
  readonly damageType: DamageType;
  readonly returnTo: AfterDamageReturn;
}

export type AfterDamageReturn =
  | { readonly tag: "ADRActiveTurn" }
  | { readonly tag: "ADRResolvingAoE"; readonly aoe: AoESpellCtx }
  | { readonly tag: "ADRResolvingMovement"; readonly mv: MovementCtx }
  | { readonly tag: "ADRAwaitingLegendaryAction"; readonly la: LAWindowCtx }
  | {
      readonly tag: "ADRAwaitingReadiedAction";
      readonly ready: ReadyWindowCtx;
    };

export const ADR_ACTIVE_TURN: AfterDamageReturn = { tag: "ADRActiveTurn" };

export interface SaveSpellCtx {
  readonly caster: CreatureId;
  readonly target: CreatureId;
  readonly saveDC: DifficultyClass;
  readonly saveRoll: number;
  readonly damageOnFail: number;
  readonly halfOnSuccess: boolean;
  readonly damageType: DamageType;
  readonly conditionOnFail: Condition;
  readonly applyCondition: boolean;
  readonly saveAbility: Ability;
}

export interface SaveFailedCtx {
  readonly caster: CreatureId;
  readonly target: CreatureId;
  readonly damageOnFail: number;
  readonly halfOnSuccess: boolean;
  readonly damageType: DamageType;
  readonly conditionOnFail: Condition;
  readonly applyCondition: boolean;
  readonly saveSucceeded: boolean;
}

export interface AoESpellCtx {
  readonly caster: CreatureId;
  readonly saveDC: DifficultyClass;
  readonly damageOnFail: number;
  readonly halfOnSuccess: boolean;
  readonly damageType: DamageType;
  readonly conditionOnFail: Condition;
  readonly applyCondition: boolean;
  readonly remaining: ReadonlySet<CreatureId>;
  readonly saveAbility: Ability;
}

export interface ConcentrationCtx {
  readonly caster: CreatureId;
  readonly target: CreatureId;
  readonly spellId: SpellId;
  readonly duration: number;
  readonly conditionOnFail: Condition;
  readonly applyCondition: boolean;
}

export interface SpellCastCtx {
  readonly caster: CreatureId;
  readonly spellName: string;
  readonly postCast: PostCastEffect;
  // TODO encode readied spell release more properly
  readonly slotLvl: SpellSlotLevel | 0; // 0 = slot already spent (readied spell release)
  readonly ritual: boolean;
}

export type PostCastEffect =
  | { readonly tag: "PCESave"; readonly save: SaveSpellCtx }
  | { readonly tag: "PCEAoE"; readonly aoe: AoESpellCtx }
  | { readonly tag: "PCECounterspell"; readonly cs: CounterspellEffect }
  | { readonly tag: "PCEConcentration"; readonly conc: ConcentrationCtx }
  | { readonly tag: "PCEDone" };

export interface CounterspellEffect {
  readonly targetCasterId: CreatureId;
  readonly conSaveSucceeded: boolean;
}

export interface SpellStackEntry {
  readonly spellCasterId: CreatureId;
  readonly spellPostCast: PostCastEffect;
  readonly offered: ReadonlySet<CreatureId>;
  // TODO encode readied spell release more properly
  readonly slotLvl: SpellSlotLevel | 0; // 0 = slot already spent (readied spell release)
  readonly spellName: string;
  readonly ritual: boolean;
}

export interface MovementCtx {
  readonly mover: CreatureId;
  readonly threatenedBy: ReadonlySet<CreatureId>;
  readonly processed: ReadonlySet<CreatureId>;
}

export interface LAWindowCtx {
  readonly eligibleMonsters: ReadonlySet<CreatureId>;
  readonly endingTurnIndex: number;
}

export interface ReadyWindowCtx {
  readonly eligibleCreatures: ReadonlySet<CreatureId>;
  readonly endingTurnIndex: number;
}

export interface AwaitCtx {
  readonly interrupt: PendingInterrupt;
  readonly trigger: TriggerType;
  readonly eligible: ReadonlySet<CreatureId>;
  readonly offered: ReadonlySet<CreatureId>;
}
export type {
  BattleActionArgs,
  BattleEvent,
  CSDecision,
  DmgReactionDecision,
  HitReactionDecision,
  PendingInterrupt,
  SaveFailedDecision,
  TriggerType,
} from "#/battle-machine-events.ts";

export interface BattleContext {
  readonly creatures: ReadonlyMap<CreatureId, BattleCreatureState>;
  readonly initiative: ReadonlyArray<CreatureId>;
  readonly turnIndex: number;
  readonly round: number;
  readonly turnStarted: boolean;
  readonly awaitCtx: AwaitCtx | null;
  readonly aoeCtx: AoESpellCtx | null;
  readonly movementCtx: MovementCtx | null;
  readonly laCtx: LAWindowCtx | null;
  readonly readyCtx: ReadyWindowCtx | null;
  readonly spellStack: ReadonlyArray<SpellStackEntry>;
}

/** All phase fields nulled — machine is in activeTurn. */
export const PHASE_ACTIVE: Pick<
  BattleContext,
  "awaitCtx" | "aoeCtx" | "movementCtx" | "laCtx" | "readyCtx"
> = {
  awaitCtx: null,
  aoeCtx: null,
  movementCtx: null,
  laCtx: null,
  readyCtx: null,
};

export type PhaseFields = typeof PHASE_ACTIVE;

export function phaseAwaitReaction(ctx: AwaitCtx): PhaseFields {
  return {
    awaitCtx: ctx,
    aoeCtx: null,
    movementCtx: null,
    laCtx: null,
    readyCtx: null,
  };
}
export function phaseResolvingAoE(aoe: AoESpellCtx): PhaseFields {
  return {
    awaitCtx: null,
    aoeCtx: aoe,
    movementCtx: null,
    laCtx: null,
    readyCtx: null,
  };
}
export function phaseResolvingMovement(mv: MovementCtx): PhaseFields {
  return {
    awaitCtx: null,
    aoeCtx: null,
    movementCtx: mv,
    laCtx: null,
    readyCtx: null,
  };
}
export function phaseAwaitingLegendary(la: LAWindowCtx): PhaseFields {
  return {
    awaitCtx: null,
    aoeCtx: null,
    movementCtx: null,
    laCtx: la,
    readyCtx: null,
  };
}
export function phaseAwaitingReady(ready: ReadyWindowCtx): PhaseFields {
  return {
    awaitCtx: null,
    aoeCtx: null,
    movementCtx: null,
    laCtx: null,
    readyCtx: ready,
  };
}

/** Creature config for BATTLE_INIT — determines initial state per combatant. */
export interface InitCreatureConfig {
  readonly id: CreatureId;
  readonly maxHp: number;
  readonly kind: CreatureKind;
  readonly caster?: boolean;
  readonly rogueLevel?: number;
  readonly monkLevel?: number;
  readonly dexMod?: number;
  readonly legendaryActions?: number;
  readonly legendaryResistances?: number;
  readonly preparedSpells?: ReadonlySet<string>;
  readonly hasEvasion?: boolean;
  readonly saveMiscBonus?: number;
  readonly critRange?: number;
  readonly fighterLevel?: number;
  readonly barbarianLevel?: number;
  readonly meleeDamageBonus?: number;
  readonly sneakAttackDice?: number;
  readonly bardLevel?: number;
  readonly bardicInspirationCharges?: number;
  readonly parryAcBonus?: number;
  /** Walk speed (PC: 30, Monster: from stat block). Defaults to 30. */
  readonly baseWalkSpeed?: number;
  /** Pre-resolved d20 initiative roll (1-20). Defaults to 10 (no roll). */
  readonly initiativeRoll?: number;
  /** Second d20 for Disadvantage. Required when surprised=true; defaults to initiativeRoll (no effect). */
  readonly initiativeRollB?: number;
  /** SRD 5.2.1: surprised combatant has Disadvantage on Initiative roll. Defaults to false. */
  readonly surprised?: boolean;
}

export interface GrappleParams {
  readonly attackerSize: Size;
  readonly targetSize: Size;
  readonly targetSaveFailed: boolean;
  readonly attackerHasFreeHand: boolean;
}
