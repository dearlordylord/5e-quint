import type { Option } from "effect";
import type { ReadiedSpellParams } from "#/battle-ready-types.ts";
import type {
  LAWindowCtx,
  MonsterCommandSelection,
  ReadyWindowCtx,
} from "#/battle-machine-phase-types.ts";
import type {
  DmgReactionKind,
  HitReactionKind,
  PendingInterrupt,
  TriggerType,
} from "#/battle-machine-events.ts";
import type { BattleReadyableSpellPayload } from "#/features/spell-registry.ts";
import type {
  MonsterResourceState,
  MonsterBattleBonusActionOption,
  MonsterBattleReactionOption,
  MonsterSaveTriggerKind,
} from "#/monster-types.ts";
import type {
  ActiveEffect,
  Ability,
  ArmorClass,
  BattleWeaponProfile,
  Condition,
  CreatureId,
  CreatureKind,
  DamageQualifier,
  DamageType,
  DifficultyClass,
  ExpiryPhase,
  HandUse,
  IncapSource,
  QualifiedPhysicalBypass,
  Size,
  SpellId,
  SpellSlotLevel,
} from "#/types.ts";

export type { CreatureId } from "#/types.ts";
type DeathSaves = { readonly successes: number; readonly failures: number };
export type BattlePosition = Readonly<{ row: number; col: number }>;

export interface BattleCreatureState extends Pick<
  MonsterResourceState,
  | "legendaryActionsRemaining"
  | "legendaryResistancesRemaining"
  | "rechargeAvailable"
  | "dailyUsesRemaining"
> {
  readonly hp: number;
  readonly maxHp: number;
  readonly maxHpReduction: number;
  readonly tempHp: number;
  readonly deathSaves: DeathSaves;
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
  readonly lightAttackUsedThisTurn: boolean;
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
  readonly rechargeMinRolls: Readonly<Record<string, number>>;
  // Identity
  readonly creatureKind: CreatureKind;
  readonly creatureSize: Size;
  readonly baseArmorClass: ArmorClass;
  readonly battleSide: string;
  readonly battlePosition: BattlePosition;
  readonly rogueLevel: number;
  readonly monkLevel: number;
  // Static combatant modifiers owned by battle when battle-resolved rules need them.
  readonly strMod: number;
  readonly dexMod: number;
  // Prepared spells (for CS eligibility)
  readonly preparedSpells: ReadonlySet<SpellId>;
  // Battle-owned payload facts for readyable action-casting-time spells.
  readonly readyableSpellPayloads: ReadonlyMap<
    SpellId,
    BattleReadyableSpellPayload
  >;
  // Evasion (Rogue 7, Monk 7): DEX save success = 0 dmg, fail = half
  readonly hasEvasion: boolean;
  // Misc save bonus (Paladin Aura, Ring of Protection, etc.)
  readonly saveMiscBonus: number;
  readonly saveAdvantageContexts: ReadonlySet<MonsterSaveTriggerKind>;
  // Natural roll >= critRange is a critical hit (default 20, Champion 19/18)
  readonly critRange: number;
  readonly isWearingArmor: boolean;
  readonly defenseArmorClassBonus: number;
  readonly greatWeaponFightingDamageFloor: boolean;
  readonly hiddenDiscoveryDc: number;
  readonly rangedWeaponAttackRollBonus: number;
  readonly fighterLevel: number;
  readonly actionSurgeCharges: number;
  readonly actionSurgeUsedThisTurn: boolean;
  readonly barbarianLevel: number;
  readonly rageCharges: number;
  readonly meleeDamageBonus: number;
  readonly recklessThisTurn: boolean;
  readonly ragingBlocksSpells: boolean;
  readonly combatantResistances: ReadonlySet<DamageType>;
  readonly qualifiedPhysicalResistances: ReadonlyArray<QualifiedPhysicalBypass>;
  readonly qualifiedPhysicalVulnerabilities: ReadonlyArray<QualifiedPhysicalBypass>;
  readonly qualifiedPhysicalImmunities: ReadonlyArray<QualifiedPhysicalBypass>;
  readonly sneakAttackDice: number;
  readonly sneakAttackUsedThisTurn: boolean;
  readonly readiedSpellParams: ReadiedSpellParams | null;
  readonly baseWalkSpeed: number;
  readonly bardLevel: number;
  readonly bardicInspirationCharges: number;
  readonly parryAcBonus: number;
  readonly lightPropertyExtraAttackAddsAbilityModifier: boolean;
  /**
   * Owned attack profile for the combatant's primary attack lane.
   *
   * PCs populate this from character equipment/loadout facts.
   * Monsters may populate this by projecting a named stat-block attack into a
   * `BattleWeaponProfile`; this does not imply the monster follows normal
   * `Equipment` semantics for that attack.
   */
  readonly mainHandWeapon: BattleWeaponProfile | null;
  readonly offHandWeapon: BattleWeaponProfile | null;
  readonly leftHandUse: HandUse;
  readonly rightHandUse: HandUse;
  readonly battleBonusActionOptions: ReadonlyArray<MonsterBattleBonusActionOption>;
  readonly battleReactionOptions: ReadonlyArray<MonsterBattleReactionOption>;
  readonly monsterStatBlockId?: string;
}

export interface AttackHitCtx {
  readonly attacker: CreatureId;
  readonly target: CreatureId;
  readonly attackRoll: number;
  readonly targetAc: ArmorClass;
  readonly damage: number;
  readonly damageType: DamageType;
  readonly damageQualifiers: ReadonlySet<DamageQualifier>;
  readonly isCritical: boolean;
  readonly critRange: number;
  readonly atkReturnTo: AfterDamageReturn;
  readonly knockOut: boolean;
  readonly onHitEffect?: ActiveEffect;
  readonly targetCanSeeAttackerAtHit: boolean;
  readonly attackerWithin5ftAtHit: boolean;
  readonly attackerWithin60ftAtHit: boolean;
  readonly isMeleeAttack: boolean;
  readonly isRangedWeaponAttack: boolean;
  readonly isWeaponAttack: boolean;
  readonly redirectableAlliesByReactor: ReadonlyMap<
    CreatureId,
    ReadonlyMap<CreatureId, ArmorClass>
  >;
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
  readonly damageQualifiers: ReadonlySet<DamageQualifier>;
  readonly isCritical: boolean;
  readonly atkReturnTo: AfterDamageReturn;
  readonly knockOut: boolean;
  readonly targetCanSeeAttackerAtHit: boolean;
  readonly attackerWithin5ftAtHit: boolean;
  readonly attackerWithin60ftAtHit: boolean;
  readonly isMeleeAttack: boolean;
  readonly isWeaponAttack: boolean;
  readonly legalReactionsByCreature: ReadonlyMap<
    CreatureId,
    ReadonlySet<DmgReactionKind>
  >;
}

/** Trigger qualifiers for after-damage reactions. Spatial and visibility facts are caller-owned. */
export interface AfterDamageTriggerQualifiers {
  readonly sourceVisibleToDamagedCreature: boolean;
  readonly sourceWithin5ftOfDamagedCreature: boolean;
  readonly sourceWithin60ftOfDamagedCreature: boolean;
  readonly sourceHitWithMeleeAttackRoll: boolean;
}

export interface AfterDamageCtx extends AfterDamageTriggerQualifiers {
  readonly damageSource: CreatureId;
  readonly damagedCreature: CreatureId;
  readonly damageDealt: number;
  readonly damageType: DamageType;
  readonly damageQualifiers: ReadonlySet<DamageQualifier>;
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

export type BattleSaveTriggerKind = MonsterSaveTriggerKind | "none";

export interface SaveFailureConditionDuration {
  readonly effectId: string;
  readonly turnsRemaining: number;
  readonly expiresAt: ExpiryPhase;
  readonly expiryOwnerId?: CreatureId;
}

export interface SaveFailureBandCondition {
  readonly minimumMargin: number;
  readonly condition: Condition;
  readonly whileCondition: Condition;
  readonly endsEarlyOnDamage?: boolean;
  readonly endsEarlyOnWakeActionWithinFeet?: number;
}

export interface SaveSpellCtx {
  readonly caster: CreatureId;
  readonly target: CreatureId;
  readonly saveDC: DifficultyClass;
  readonly saveRoll: number;
  readonly saveRollB?: number;
  readonly damageOnFail: number;
  readonly halfOnSuccess: boolean;
  readonly damageType: DamageType;
  readonly conditionOnFail?: Condition;
  readonly applyCondition: boolean;
  readonly saveAbility: Ability;
  readonly saveTriggerKind: BattleSaveTriggerKind;
  readonly conditionDurationOnFail?: SaveFailureConditionDuration;
  readonly failureBandCondition?: SaveFailureBandCondition;
}

export interface SaveFailedCtx {
  readonly caster: CreatureId;
  readonly target: CreatureId;
  readonly damageOnFail: number;
  readonly halfOnSuccess: boolean;
  readonly damageType: DamageType;
  readonly conditionOnFail?: Condition;
  readonly applyCondition: boolean;
  readonly saveSucceeded: boolean;
  readonly failedMargin?: number;
  readonly conditionDurationOnFail?: SaveFailureConditionDuration;
  readonly failureBandCondition?: SaveFailureBandCondition;
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
  readonly saveTriggerKind: BattleSaveTriggerKind;
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

/** SRD 5.2.1 Help "Assist an Attack Roll": a chosen ally's next attack against the
 *  chosen enemy gains Advantage. Consumed by the first qualifying attack; expires
 *  at the start of the helper's next turn. */
export interface HelpTarget {
  readonly helperId: CreatureId;
  readonly allyId: CreatureId;
  readonly targetEnemyId: CreatureId;
}

export interface MovementCtx {
  readonly mover: CreatureId;
  readonly threatenedBy: ReadonlySet<CreatureId>;
  readonly processed: ReadonlySet<CreatureId>;
}

export type { InitCreatureConfig } from "#/battle-init-creature-config.ts";
export type {
  LAWindowCtx,
  MonsterCommandSelection,
  ReadyWindowCtx,
} from "#/battle-machine-phase-types.ts";

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
  readonly selectedMonsterCommand: MonsterCommandSelection | null;
  readonly awaitCtx: AwaitCtx | null;
  readonly aoeCtx: AoESpellCtx | null;
  readonly movementCtx: MovementCtx | null;
  readonly laCtx: LAWindowCtx | null;
  readonly readyCtx: ReadyWindowCtx | null;
  readonly spellStack: ReadonlyArray<SpellStackEntry>;
  readonly helpTargets: ReadonlyArray<HelpTarget>;
}

/** All phase fields nulled — machine is in activeTurn. */
export const PHASE_ACTIVE: Pick<
  BattleContext,
  | "selectedMonsterCommand"
  | "awaitCtx"
  | "aoeCtx"
  | "movementCtx"
  | "laCtx"
  | "readyCtx"
> = {
  selectedMonsterCommand: null,
  awaitCtx: null,
  aoeCtx: null,
  movementCtx: null,
  laCtx: null,
  readyCtx: null,
};

export type PhaseFields = typeof PHASE_ACTIVE;

export function phaseAwaitReaction(ctx: AwaitCtx): PhaseFields {
  return { ...PHASE_ACTIVE, awaitCtx: ctx };
}
export function phaseResolvingAoE(aoe: AoESpellCtx): PhaseFields {
  return { ...PHASE_ACTIVE, aoeCtx: aoe };
}
export function phaseResolvingMovement(mv: MovementCtx): PhaseFields {
  return { ...PHASE_ACTIVE, movementCtx: mv };
}
export function phaseAwaitingLegendary(la: LAWindowCtx): PhaseFields {
  return { ...PHASE_ACTIVE, laCtx: la };
}
export function phaseAwaitingReady(ready: ReadyWindowCtx): PhaseFields {
  return { ...PHASE_ACTIVE, readyCtx: ready };
}
