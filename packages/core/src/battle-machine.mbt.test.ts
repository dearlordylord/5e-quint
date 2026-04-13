/**
 * Battle Machine MBT — battle-level state comparison against battleMachine.
 * One createActor(battleMachine), each Quint action maps to one actor.send() call.
 *
 * Complements battle-projection.mbt.test.ts (per-creature projection against creatureMachine).
 */
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Option } from "effect";
import { afterAll, beforeAll, describe, it } from "vitest";
import { createActor } from "xstate";
import { z } from "zod";

import { battleMachine } from "#/battle-machine.ts";
import { getBattleReadyableSpellPayload } from "#/features/spell-available-actions.ts";
import {
  getBattleMbtRunShape,
  getMbtBackend,
  withDefaultLocalBattleSeed,
} from "#/mbt-config.ts";
import type {
  BattleContext,
  BattleCreatureState,
  BattleEvent,
} from "#/battle-machine-types.ts";
import {
  killZombieEvaluators,
  registerEvaluatorCleanup,
} from "#/mbt-cleanup.ts";
import {
  compareNormalizedStates,
  ITFBigInt,
  ITFSize,
  ITFVariant,
  ITFVariantWithValue,
  logMbtSeed,
  mapAbility,
  mapDamageType,
  normalizeReactivePayload,
  parseDamageTypeSet,
  QUINT_CONDITION_MAP,
  QuintCreatureState,
  QuintMonsterResourceState,
  QuintSpellSlotState,
  QuintTurnState,
  variantToString,
} from "#/mbt-shared.ts";
import type { CreatureId, Size, SpellName } from "#/types.ts";
import {
  armorClass,
  CreatureId as mkCreatureId,
  difficultyClass,
  spellId as mkSpellId,
  spellSlotLevel,
} from "#/types.ts";

// ============================================================
// Quint state parsing (reuse battle-level schemas from B14)
// ============================================================

function mapHandUse(value: string): string {
  switch (value) {
    case "HFree":
      return "free";
    case "HMainWeapon":
      return "mainWeapon";
    case "HOffWeapon":
      return "offWeapon";
    case "HShield":
      return "shield";
    case "HGrapple":
      return "grapple";
    default:
      return value;
  }
}

const QuintCombatant = z.object({
  creature: QuintCreatureState,
  turn: QuintTurnState,
  slots: QuintSpellSlotState,
  kind: z.any().transform(variantToString),
  creatureSize: z
    .unknown()
    .optional()
    .transform((raw): Size => {
      if (raw === undefined) return "medium";
      return ITFSize.parse(raw);
    }),
  monsterResources: QuintMonsterResourceState,
  statBlock: z.any(),
  rogueLevel: z.bigint(),
  monkLevel: z.bigint(),
  hasEvasion: z.boolean(),
  saveMiscBonus: z.bigint(),
  critRange: z.bigint(),
  isWearingArmor: z.boolean(),
  defenseArmorClassBonus: z.bigint(),
  greatWeaponFightingDamageFloor: z.boolean(),
  hiddenDiscoveryDc: z.bigint(),
  rangedWeaponAttackRollBonus: z.bigint(),
  fighterState: z
    .object({
      actionSurgeCharges: z.bigint(),
      actionSurgeUsedThisTurn: z.boolean(),
    })
    .passthrough(),
  fighterLevel: z.bigint(),
  barbarianLevel: z.bigint(),
  rageCharges: z.bigint(),
  meleeDamageBonus: z.bigint(),
  recklessThisTurn: z.boolean(),
  ragingBlocksSpells: z.boolean(),
  combatantResistances: z.any(),
  sneakAttackDice: z.bigint(),
  sneakAttackUsedThisTurn: z.boolean(),
  baseWalkSpeed: z.bigint(),
  lightPropertyExtraAttackAddsAbilityModifier: z.boolean(),
  grappledBy: z.string(),
  grapplingTarget: z.string(),
  grappledTargetTwoSizesSmaller: z.boolean(),
  leftHandUse: z.any().transform((v) => mapHandUse(variantToString(v))),
  rightHandUse: z.any().transform((v) => mapHandUse(variantToString(v))),
});

type ParsedCombatant = z.infer<typeof QuintCombatant>;

const QuintBCreaturesMap = z.any().transform((raw: unknown) => {
  const result = new Map<string, ParsedCombatant>();
  if (raw instanceof Map) {
    for (const [k, v] of raw) result.set(String(k), QuintCombatant.parse(v));
  } else if (typeof raw === "object" && raw !== null) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>))
      result.set(k, QuintCombatant.parse(v));
  }
  return result;
});

const QuintInitiativeList = z.any().transform((raw: unknown) => {
  if (Array.isArray(raw)) return raw.map(String);
  return [] as Array<string>;
});

const QuintBattleState = z.object({
  bCreatures: QuintBCreaturesMap,
  bInitiative: QuintInitiativeList,
  bTurnIndex: z.bigint(),
  bRound: z.bigint(),
  bTurnStarted: z.boolean(),
  bPhase: z.any(),
  bSpellStack: z.any(),
});

// ============================================================
// Normalized battle creature state (for comparison)
// ============================================================

interface NormalizedBattleCreature {
  hp: number;
  maxHp: number;
  tempHp: number;
  deathSavesSuccesses: number;
  deathSavesFailures: number;
  stable: boolean;
  dead: boolean;
  blinded: boolean;
  charmed: boolean;
  deafened: boolean;
  exhaustion: number;
  frightened: boolean;
  grappled: boolean;
  grappledBy: string;
  grapplingTarget: string;
  grappledTargetTwoSizesSmaller: boolean;
  leftHandUse: string;
  rightHandUse: string;
  invisible: boolean;
  paralyzed: boolean;
  petrified: boolean;
  poisoned: boolean;
  prone: boolean;
  restrained: boolean;
  stunned: boolean;
  unconscious: boolean;
  incapacitatedSources: ReadonlySet<string>;
  activeEffects: ReadonlyArray<{
    spellId: string;
    turnsRemaining: number;
    expiresAt: string;
    casterId: string;
    parentSpellId: string;
    parentCasterId: string;
    grantedResistances: ReadonlySet<string>;
    grantedVulnerabilities: ReadonlySet<string>;
    grantedImmunities: ReadonlySet<string>;
    reactivePayload: string;
  }>;
  movementRemaining: number;
  effectiveSpeed: number;
  actionsRemaining: number;
  attackActionUsed: boolean;
  bonusActionUsed: boolean;
  reactionAvailable: boolean;
  freeInteractionUsed: boolean;
  extraAttacksRemaining: number;
  disengaged: boolean;
  dodging: boolean;
  readiedAction: boolean;
  bonusActionSpellCast: boolean;
  nonCantripActionSpellCast: boolean;
  bonusMovementRemaining: number;
  bonusMovementOAFree: boolean;
  actionSurgeActionPending: boolean;
  slotExpendedThisTurn: boolean;
  slotsMax: ReadonlyArray<number>;
  slotsCurrent: ReadonlyArray<number>;
  pactSlotsMax: number;
  pactSlotsCurrent: number;
  pactSlotLevel: number;
  concentrationSpellId: string;
  legendaryActionsRemaining: number;
  legendaryResistancesRemaining: number;
  rechargeAvailable: Readonly<Record<string, boolean>>;
  dailyUsesRemaining: Readonly<Record<string, number>>;
  creatureKind: string;
  creatureSize: string;
  hasEvasion: boolean;
  saveMiscBonus: number;
  critRange: number;
  isWearingArmor: boolean;
  defenseArmorClassBonus: number;
  greatWeaponFightingDamageFloor: boolean;
  hiddenDiscoveryDc: number;
  rangedWeaponAttackRollBonus: number;
  actionSurgeCharges: number;
  actionSurgeUsedThisTurn: boolean;
  fighterLevel: number;
  barbarianLevel: number;
  rageCharges: number;
  meleeDamageBonus: number;
  recklessThisTurn: boolean;
  ragingBlocksSpells: boolean;
  combatantResistances: ReadonlySet<string>;
  sneakAttackDice: number;
  sneakAttackUsedThisTurn: boolean;
  baseWalkSpeed: number;
  lightPropertyExtraAttackAddsAbilityModifier: boolean;
}

function quintCombatantToNormalized(
  c: ParsedCombatant,
): NormalizedBattleCreature {
  const s = c.creature;
  const t = c.turn;
  const ss = c.slots;
  return {
    creatureSize: c.creatureSize,
    hp: Number(s.hp),
    maxHp: Number(s.maxHp),
    tempHp: Number(s.tempHp),
    deathSavesSuccesses: Number(s.deathSaves.successes),
    deathSavesFailures: Number(s.deathSaves.failures),
    stable: s.stable,
    dead: s.dead,
    blinded: s.blinded,
    charmed: s.charmed,
    deafened: s.deafened,
    exhaustion: Number(s.exhaustion),
    frightened: s.frightened,
    grappled: s.grappled,
    grappledBy: c.grappledBy,
    grapplingTarget: c.grapplingTarget,
    grappledTargetTwoSizesSmaller: c.grappledTargetTwoSizesSmaller,
    leftHandUse: c.leftHandUse,
    rightHandUse: c.rightHandUse,
    invisible: s.invisible,
    paralyzed: s.paralyzed,
    petrified: s.petrified,
    poisoned: s.poisoned,
    prone: s.prone,
    restrained: s.restrained,
    stunned: s.stunned,
    unconscious: s.unconscious,
    incapacitatedSources: s.incapacitatedSources,
    activeEffects: s.activeEffects,
    movementRemaining: Number(t.movementRemaining),
    effectiveSpeed: Number(t.effectiveSpeed),
    actionsRemaining: Number(t.actionsRemaining),
    attackActionUsed: t.attackActionUsed,
    bonusActionUsed: t.bonusActionUsed,
    reactionAvailable: t.reactionAvailable,
    freeInteractionUsed: t.freeInteractionUsed,
    extraAttacksRemaining: Number(t.extraAttacksRemaining),
    disengaged: t.disengaged,
    dodging: t.dodging,
    readiedAction: t.readiedAction,
    bonusActionSpellCast: t.bonusActionSpellCast,
    nonCantripActionSpellCast: t.nonCantripActionSpellCast,
    bonusMovementRemaining: Number(t.bonusMovementRemaining),
    bonusMovementOAFree: t.bonusMovementOAFree,
    actionSurgeActionPending: t.actionSurgeActionPending,
    slotExpendedThisTurn: t.slotExpendedThisTurn,
    slotsMax: ss.slotsMax,
    slotsCurrent: ss.slotsCurrent,
    pactSlotsMax: Number(ss.pactSlotsMax),
    pactSlotsCurrent: Number(ss.pactSlotsCurrent),
    pactSlotLevel: Number(ss.pactSlotLevel),
    concentrationSpellId: ss.concentrationSpellId,
    legendaryActionsRemaining: Number(
      c.monsterResources.legendaryActionsRemaining,
    ),
    legendaryResistancesRemaining: Number(
      c.monsterResources.legendaryResistancesRemaining,
    ),
    rechargeAvailable: c.monsterResources.rechargeAvailable,
    dailyUsesRemaining: c.monsterResources.dailyUsesRemaining,
    creatureKind: c.kind,
    hasEvasion: c.hasEvasion,
    saveMiscBonus: Number(c.saveMiscBonus),
    critRange: Number(c.critRange),
    isWearingArmor: c.isWearingArmor,
    defenseArmorClassBonus: Number(c.defenseArmorClassBonus),
    greatWeaponFightingDamageFloor: c.greatWeaponFightingDamageFloor,
    hiddenDiscoveryDc: Number(c.hiddenDiscoveryDc),
    rangedWeaponAttackRollBonus: Number(c.rangedWeaponAttackRollBonus),
    actionSurgeCharges: Number(c.fighterState.actionSurgeCharges),
    actionSurgeUsedThisTurn: c.fighterState.actionSurgeUsedThisTurn,
    fighterLevel: Number(c.fighterLevel),
    barbarianLevel: Number(c.barbarianLevel),
    rageCharges: Number(c.rageCharges),
    meleeDamageBonus: Number(c.meleeDamageBonus),
    recklessThisTurn: c.recklessThisTurn,
    ragingBlocksSpells: c.ragingBlocksSpells,
    combatantResistances: parseDamageTypeSet(c.combatantResistances),
    sneakAttackDice: Number(c.sneakAttackDice),
    sneakAttackUsedThisTurn: c.sneakAttackUsedThisTurn,
    baseWalkSpeed: Number(c.baseWalkSpeed),
    lightPropertyExtraAttackAddsAbilityModifier:
      c.lightPropertyExtraAttackAddsAbilityModifier,
  };
}

const EMPTY_STRING_SET: ReadonlySet<string> = new Set<string>();

function xstateCreatureToNormalized(
  c: BattleCreatureState,
): NormalizedBattleCreature {
  return {
    creatureSize: c.creatureSize,
    hp: c.hp,
    maxHp: c.maxHp,
    tempHp: c.tempHp,
    deathSavesSuccesses: c.deathSaves.successes,
    deathSavesFailures: c.deathSaves.failures,
    stable: c.stable,
    dead: c.dead,
    blinded: c.blinded,
    charmed: c.charmed,
    deafened: c.deafened,
    exhaustion: c.exhaustion,
    frightened: c.frightened,
    grappled: c.grappled,
    grappledBy: c.grappledBy ?? "",
    grapplingTarget: c.grapplingTarget ?? "",
    grappledTargetTwoSizesSmaller: c.grappledTargetTwoSizesSmaller,
    leftHandUse: c.leftHandUse,
    rightHandUse: c.rightHandUse,
    invisible: c.invisible,
    paralyzed: c.paralyzed,
    petrified: c.petrified,
    poisoned: c.poisoned,
    prone: c.prone,
    restrained: c.restrained,
    stunned: c.stunned,
    unconscious: c.unconscious,
    incapacitatedSources: c.incapacitatedSources,
    activeEffects: [...c.activeEffects]
      .map((ae) => ({
        spellId: ae.spellId,
        turnsRemaining: ae.turnsRemaining,
        expiresAt: ae.expiresAt,
        casterId: ae.casterId,
        parentSpellId: ae.parentSpellId ?? "",
        parentCasterId: ae.parentCasterId ?? "",
        grantedResistances: ae.grantedResistances ?? EMPTY_STRING_SET,
        grantedVulnerabilities: ae.grantedVulnerabilities ?? EMPTY_STRING_SET,
        grantedImmunities: ae.grantedImmunities ?? EMPTY_STRING_SET,
        reactivePayload: normalizeReactivePayload(ae.reactivePayload),
      }))
      .sort((a, b) => a.spellId.localeCompare(b.spellId)),
    movementRemaining: c.movementRemaining,
    effectiveSpeed: c.effectiveSpeed,
    actionsRemaining: c.actionsRemaining,
    attackActionUsed: c.attackActionUsed,
    bonusActionUsed: c.bonusActionUsed,
    reactionAvailable: c.reactionAvailable,
    freeInteractionUsed: c.freeInteractionUsed,
    extraAttacksRemaining: c.extraAttacksRemaining,
    disengaged: c.disengaged,
    dodging: c.dodging,
    readiedAction: c.readiedAction,
    bonusActionSpellCast: c.bonusActionSpellCast,
    nonCantripActionSpellCast: c.nonCantripActionSpellCast,
    bonusMovementRemaining: c.bonusMovementRemaining,
    bonusMovementOAFree: c.bonusMovementOAFree,
    actionSurgeActionPending: c.actionSurgeActionPending,
    slotExpendedThisTurn: c.slotExpendedThisTurn,
    slotsMax: [...c.slotsMax],
    slotsCurrent: [...c.slotsCurrent],
    pactSlotsMax: c.pactSlotsMax,
    pactSlotsCurrent: c.pactSlotsCurrent,
    pactSlotLevel: c.pactSlotLevel,
    concentrationSpellId: Option.getOrElse(c.concentrationSpellId, () => ""),
    legendaryActionsRemaining: c.legendaryActionsRemaining,
    legendaryResistancesRemaining: c.legendaryResistancesRemaining,
    rechargeAvailable: c.rechargeAvailable,
    dailyUsesRemaining: c.dailyUsesRemaining,
    creatureKind: c.creatureKind,
    hasEvasion: c.hasEvasion,
    saveMiscBonus: c.saveMiscBonus,
    critRange: c.critRange,
    isWearingArmor: c.isWearingArmor,
    defenseArmorClassBonus: c.defenseArmorClassBonus,
    greatWeaponFightingDamageFloor: c.greatWeaponFightingDamageFloor,
    hiddenDiscoveryDc: c.hiddenDiscoveryDc,
    rangedWeaponAttackRollBonus: c.rangedWeaponAttackRollBonus,
    actionSurgeCharges: c.actionSurgeCharges,
    actionSurgeUsedThisTurn: c.actionSurgeUsedThisTurn,
    fighterLevel: c.fighterLevel,
    barbarianLevel: c.barbarianLevel,
    rageCharges: c.rageCharges,
    meleeDamageBonus: c.meleeDamageBonus,
    recklessThisTurn: c.recklessThisTurn,
    ragingBlocksSpells: c.ragingBlocksSpells,
    combatantResistances: c.combatantResistances,
    sneakAttackDice: c.sneakAttackDice,
    sneakAttackUsedThisTurn: c.sneakAttackUsedThisTurn,
    baseWalkSpeed: c.baseWalkSpeed,
    lightPropertyExtraAttackAddsAbilityModifier:
      c.lightPropertyExtraAttackAddsAbilityModifier,
  };
}

// ============================================================
// Battle-level state for comparison
// ============================================================

interface BattleCompareState {
  creatures: Map<string, NormalizedBattleCreature>;
  turnIndex: number;
  round: number;
  turnStarted: boolean;
  phase: string;
}

// ============================================================
// Driver
// ============================================================

const OI = ITFBigInt.optional();
const OV = ITFVariant.optional();
const OB = z.boolean().optional();
const OS = z.string().optional();

const battleDriverSchema = {
  bInit: {
    hp1: OI,
    hp2: OI,
    hp3: OI,
    hp4: OI,
    initRoll1: OI,
    initRoll2: OI,
    initRoll3: OI,
    initRoll4: OI,
    initRoll1b: OI,
    initRoll2b: OI,
    initRoll3b: OI,
    initRoll4b: OI,
    surprised1: OB,
    surprised2: OB,
    surprised3: OB,
    surprised4: OB,
    smb2: OI,
    smb4: OI,
  },
  bStartTurn: {
    rechargeD6: OI,
    sotDmg: OI,
    sotDt: OV,
    sotHeal: OI,
    sotSaveResult: OB,
    sotConSave: OB,
  },
  bAttack: {
    targetId: OS,
    attackRoll: OI,
    diceCount: OI,
    dieSize: OI,
    die1: OI,
    die2: OI,
    dmg: OI,
    dt: OV,
    hitRider: OV,
    crit: OB,
    tAc: OI,
    knockOut: OB,
    isMelee: OB,
    isFinesse: OB,
    attackerWithin5ft: OB,
    attackerWithin60ft: OB.optional(),
    hostileWithin5ft: OB,
    targetCanSeeAttacker: OB,
    attackerCanSeeTarget: OB,
    frightSourceInLOS: OB,
    hasAllyAdjacentToTarget: OB,
    saDmg: OI,
    hitReactionCandidates: z.any().optional(),
  },
  bResolveHitReaction: {
    reactorId: OS,
    parryBonus: OI,
    cwReduction: OI,
    decision: OV,
  },
  bResolveDmgReaction: { reactorId: OS, reductionAmt: OI, decision: OV },
  bAfterDamageDecline: { reactorId: OS },
  bAfterDamageSpellReaction: {
    reactionDmg: OI,
    reactionSaved: OB,
    reactionDt: OV.optional(),
    reactorId: OS,
  },
  bAfterDamageReactiveEffect: {
    reactionDmg: OI,
    reactorId: OS,
  },
  bAfterDamageRetaliation: {
    retAtkRoll: OI,
    retDmg: OI,
    retDt: OV,
    retCrit: OB,
    retTgtAc: OI,
    reactorId: OS,
  },
  bCastSaveSpell: {
    targetId: OS,
    saveDC: OI,
    saveRoll: OI,
    dmgOnFail: OI,
    halfOnSave: OB,
    dt: OV,
    cond: OV,
    applyCond: OB,
    slotLvl: OI,
    ritual: OB,
  },
  bResolveCounterspell: {
    reactorId: OS,
    decision: ITFVariantWithValue.optional(),
    csSlotLvl: OI,
  },
  bResolveSaveFailedReaction: { reactorId: OS, decision: OV },
  bCastConcentrationSpell: {
    targetId: OS,
    slotLvl: OI,
    duration: OI,
    spellId: OS,
    cond: OV,
    applyCond: OB,
    ritual: OB,
  },
  bConcentrationCheck: { targetId: OS, conSaveSucceeded: OB },
  bCastAoE: {
    saveDC: OI,
    dmgOnFail: OI,
    halfOnSave: OB,
    dt: OV,
    cond: OV,
    applyCond: OB,
    slotLvl: OI,
    ritual: OB,
  },
  bResolveAoETarget: { targetId: OS, saveRoll: OI },
  bMove: {
    threatened: z.any().optional(),
    provocationKind: OV,
  },
  bMovementOADecline: { reactorId: OS },
  bMovementOAAttack: {
    oaAtkRoll: OI,
    oaDmg: OI,
    oaDt: OV,
    oaCrit: OB,
    oaTgtAc: OI,
    reactorId: OS,
    knockOut: OB,
    isFinesse: OB,
    attackerWithin5ft: OB,
    attackerWithin60ft: OB.optional(),
    hostileWithin5ft: OB,
    targetCanSeeAttacker: OB,
    attackerCanSeeTarget: OB,
    frightSourceInLOS: OB,
    hasAllyAdjacentToTarget: OB,
    saDmg: OI,
    hitReactionCandidates: z.any().optional(),
  },
  bEndTurn: { eotSaveSucceeded: OB, eotDmg: OI, eotDt: OV, eotConSave: OB },
  bLegendaryPass: {},
  bLegendaryAttack: {
    monsterId: OS,
    laTarget: OS,
    laAtkRoll: OI,
    laDmg: OI,
    laDt: OV,
    laCrit: OB,
    laTgtAc: OI,
    knockOut: OB,
    isMelee: OB,
    isFinesse: OB,
    attackerWithin5ft: OB,
    attackerWithin60ft: OB.optional(),
    hostileWithin5ft: OB,
    targetCanSeeAttacker: OB,
    attackerCanSeeTarget: OB,
    frightSourceInLOS: OB,
    hasAllyAdjacentToTarget: OB,
    saDmg: OI,
    hitReactionCandidates: z.any().optional(),
  },
  bHeal: { targetId: OS, amount: OI },
  bDash: {},
  bDisengage: {},
  bBonusDisengage: {},
  bDodge: {},
  bHide: {
    stealthTotal: OI,
    hasCoverOrObscurement: OB,
    outOfEnemyLineOfSight: OB,
  },
  bBonusHide: {
    stealthTotal: OI,
    hasCoverOrObscurement: OB,
    outOfEnemyLineOfSight: OB,
  },
  bGrapple: {
    targetId: OS,
    targetSaveFailed: OB,
  },
  bReleaseGrapple: {},
  bEscapeGrapple: { escapeSucceeded: OB },
  bActionSurge: {},
  bEnterRage: {},
  bDeclareReckless: {},
  bReady: {},
  bReadySpell: {
    targetId: OS,
    saveDC: OI.optional(),
    dmgOnFail: OI.optional(),
    halfOnSave: OB.optional(),
    dt: OV.optional(),
    cond: OV.optional(),
    applyCond: OB.optional(),
    saveAb: OV.optional(),
    slotLvl: OI,
    spellName: OS,
  },
  bReadyPass: {},
  bReadyRelease: {
    releaserId: OS,
    targetId: OS,
    atkRoll: OI,
    dmg: OI,
    dt: OV,
    crit: OB,
    tgtAc: OI,
    knockOut: OB,
    isMelee: OB,
    isFinesse: OB,
    attackerWithin5ft: OB,
    attackerWithin60ft: OB.optional(),
    hostileWithin5ft: OB,
    targetCanSeeAttacker: OB,
    attackerCanSeeTarget: OB,
    frightSourceInLOS: OB,
    hasAllyAdjacentToTarget: OB,
    saDmg: OI,
    hitReactionCandidates: z.any().optional(),
  },
  bReadySpellRelease: {
    releaserId: OS,
    saveRoll: OI,
  },
  bSearch: {
    targetId: OS,
    perceptionTotal: OI,
  },
  bCastBonusActionSpell: {
    targetId: OS,
    saveDC: OI,
    saveRoll: OI,
    dmgOnFail: OI,
    halfOnSave: OB,
    dt: OV,
    cond: OV,
    applyCond: OB,
    slotLvl: OI,
    spellName: OS,
  },
  battleStep: {},
} as const;

function p(
  picks: Record<string, unknown>,
  key: string,
  fallback: number,
): number {
  const v = picks[key];
  return v != null ? Number(v) : fallback;
}
function ps(
  picks: Record<string, unknown>,
  key: string,
  fallback: string,
): string {
  const v = picks[key];
  return v != null ? String(v) : fallback;
}
/** Pick a string and brand as CreatureId (MBT boundary). */
function pc(
  picks: Record<string, unknown>,
  key: string,
  fallback: string,
): CreatureId {
  return mkCreatureId(ps(picks, key, fallback));
}
/** Pick a nullable string and brand as CreatureId | null (MBT boundary). */
function pcn(picks: Record<string, unknown>, key: string): CreatureId | null {
  return picks[key] != null ? mkCreatureId(String(picks[key])) : null;
}
function pb(
  picks: Record<string, unknown>,
  key: string,
  fallback: boolean,
): boolean {
  const v = picks[key];
  return typeof v === "boolean" ? v : fallback;
}
function pcs(
  picks: Record<string, unknown>,
  key: string,
): ReadonlySet<CreatureId> {
  const raw = picks[key];
  if (!(raw instanceof Set)) return new Set();
  const result = new Set<CreatureId>();
  for (const item of raw) result.add(mkCreatureId(String(item)));
  return result;
}
/** Common spatial/visibility/SA fields for attack event dispatch. */
function attackContextPicks(picks: Record<string, unknown>) {
  return {
    isFinesse: pb(picks, "isFinesse", false),
    attackerWithin5ft: pb(picks, "attackerWithin5ft", true),
    attackerWithin60ft: pb(picks, "attackerWithin60ft", true),
    hostileWithin5ft: pb(picks, "hostileWithin5ft", false),
    targetCanSeeAttacker: pb(picks, "targetCanSeeAttacker", true),
    attackerCanSeeTarget: pb(picks, "attackerCanSeeTarget", true),
    frightSourceInLOS: pb(picks, "frightSourceInLOS", false),
    hasAllyAdjacentToTarget: pb(picks, "hasAllyAdjacentToTarget", false),
    saDmg: p(picks, "saDmg", 0),
    hitReactionCandidates: pcs(picks, "hitReactionCandidates"),
  };
}

function currentTurnCreatureId(context: BattleContext): CreatureId {
  return context.initiative[context.turnIndex]!;
}

function onHitEffectFromPicks(
  picks: Record<string, unknown>,
  attackerId: CreatureId,
  targetId: CreatureId,
) {
  const hitRider = ps(picks, "hitRider", "NoAttackHitRider");
  if (hitRider === "AHRShockingGrasp") {
    return {
      spellId: mkSpellId("shocking_grasp"),
      turnsRemaining: 1,
      expiresAt: "start" as const,
      casterId: attackerId,
      expiryOwnerId: targetId,
      blocksOpportunityAttacks: true,
    };
  }
  if (hitRider === "AHRRayOfFrost") {
    return {
      spellId: mkSpellId("ray_of_frost"),
      turnsRemaining: 1,
      expiresAt: "start" as const,
      casterId: attackerId,
      expiryOwnerId: attackerId,
      speedDeltaFeet: -10,
    };
  }
  return undefined;
}

function createBattleMachineDriver() {
  return defineDriver(battleDriverSchema, () => {
    let actor: ReturnType<typeof createActor<typeof battleMachine>> | null =
      null;

    function send(event: BattleEvent) {
      if (!actor) throw new Error("Actor not initialized");
      actor.send(event);
    }

    function ctx(): BattleContext {
      if (!actor) throw new Error("Actor not initialized");
      return actor.getSnapshot().context;
    }

    function parseThreatenedSet(raw: unknown): Set<CreatureId> {
      if (raw instanceof Set)
        return new Set([...raw].map((x) => mkCreatureId(String(x))));
      if (Array.isArray(raw))
        return new Set(raw.map((x) => mkCreatureId(String(x))));
      return new Set();
    }

    return {
      bInit: (picks: Record<string, unknown>) => {
        actor = createActor(battleMachine);
        actor.start();
        send({
          type: "BATTLE_INIT",
          creatures: [
            {
              id: mkCreatureId("A"),
              maxHp: p(picks, "hp1", 20),
              kind: "PC",
              caster: true,
              rogueLevel: 5,
              hasEvasion: true,
              sneakAttackDice: 3,
              initiativeRoll: p(picks, "initRoll1", 10),
              initiativeRollB: p(picks, "initRoll1b", 10),
              surprised: pb(picks, "surprised1", false),
            },
            {
              id: mkCreatureId("B"),
              maxHp: p(picks, "hp2", 20),
              kind: "PC",
              caster: true,
              saveMiscBonus: p(picks, "smb2", 0),
              barbarianLevel: 5,
              baseWalkSpeed: 40, // 30 base + 10 Fast Movement (Barbarian L5)
              initiativeRoll: p(picks, "initRoll2", 10),
              initiativeRollB: p(picks, "initRoll2b", 10),
              surprised: pb(picks, "surprised2", false),
            },
            {
              id: mkCreatureId("C"),
              maxHp: p(picks, "hp3", 35),
              kind: "Monster",
              legendaryActions: 3,
              legendaryResistances: 3,
              baseWalkSpeed: 30,
              initiativeRoll: p(picks, "initRoll3", 10),
              initiativeRollB: p(picks, "initRoll3b", 10),
              surprised: pb(picks, "surprised3", false),
            },
            {
              id: mkCreatureId("D"),
              maxHp: p(picks, "hp4", 20),
              kind: "PC",
              caster: true,
              critRange: 19,
              fighterLevel: 5,
              saveMiscBonus: p(picks, "smb4", 0),
              initiativeRoll: p(picks, "initRoll4", 10),
              initiativeRollB: p(picks, "initRoll4b", 10),
              surprised: pb(picks, "surprised4", false),
            },
          ],
        });
      },
      bStartTurn: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_START_TURN",
          rechargeD6: p(picks, "rechargeD6", 3),
          sotDmg: p(picks, "sotDmg", 0),
          sotDt: mapDamageType(ps(picks, "sotDt", "Bludgeoning")),
          sotHeal: p(picks, "sotHeal", 0),
          sotSaveResult: pb(picks, "sotSaveResult", false),
          sotConSave: pb(picks, "sotConSave", false),
          deathSaveRoll: p(picks, "deathSaveRoll", 0),
        });
      },
      bAttack: (picks: Record<string, unknown>) => {
        const battleCtx = ctx();
        const targetId = pc(picks, "targetId", "");
        const diceCount = p(picks, "diceCount", 1);
        const dieSize = p(picks, "dieSize", 8);
        const die1 = p(picks, "die1", 1);
        const die2 = p(picks, "die2", 1);
        send({
          type: "BATTLE_ATTACK",
          targetId,
          attackRoll: p(picks, "attackRoll", 10),
          diceCount,
          dieSize,
          damageDieRolls: diceCount === 1 ? [die1] : [die1, die2],
          dmg: p(picks, "dmg", 5),
          dt: mapDamageType(ps(picks, "dt", "Slashing")),
          crit: pb(picks, "crit", false),
          tAc: armorClass(p(picks, "tAc", 15)),
          knockOut: pb(picks, "knockOut", false),
          isMelee: pb(picks, "isMelee", true),
          onHitEffect: onHitEffectFromPicks(
            picks,
            currentTurnCreatureId(battleCtx),
            targetId,
          ),
          ...attackContextPicks(picks),
        });
      },
      bResolveHitReaction: (picks: Record<string, unknown>) => {
        const tag = ps(picks, "decision", "RPass");
        const decision =
          tag === "RShield"
            ? ({ tag: "RShield" } as const)
            : tag === "RParry"
              ? ({ tag: "RParry", bonus: p(picks, "parryBonus", 3) } as const)
              : tag === "RCuttingWords"
                ? ({
                    tag: "RCuttingWords",
                    reduction: p(picks, "cwReduction", 6),
                  } as const)
                : ({ tag: "RPass" } as const);
        send({
          type: "BATTLE_RESOLVE_HIT_REACTION",
          reactorId: pcn(picks, "reactorId"),
          decision,
        });
      },
      bResolveDmgReaction: (picks: Record<string, unknown>) => {
        const tag = ps(picks, "decision", "RPass");
        const decision =
          tag === "RUncannyDodge"
            ? ({ tag: "RUncannyDodge" } as const)
            : tag === "RDeflectAttacks"
              ? ({
                  tag: "RDeflectAttacks",
                  amount: p(picks, "reductionAmt", 5),
                } as const)
              : ({ tag: "RPass" } as const);
        send({
          type: "BATTLE_RESOLVE_DMG_REACTION",
          reactorId: pcn(picks, "reactorId"),
          decision,
        });
      },
      bAfterDamageDecline: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_AFTER_DAMAGE_DECLINE",
          reactorId: pcn(picks, "reactorId"),
        });
      },
      bAfterDamageSpellReaction: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_AFTER_DAMAGE_SPELL_REACTION",
          reactorId: pcn(picks, "reactorId"),
          reactionDmg: p(picks, "reactionDmg", 10),
          reactionSaved: pb(picks, "reactionSaved", false),
          reactionDt: mapDamageType(ps(picks, "reactionDt", "Fire")),
        });
      },
      bAfterDamageReactiveEffect: (picks: Record<string, unknown>) => {
        const reactorId = pcn(picks, "reactorId");
        const reactor =
          reactorId == null ? null : ctx().creatures.get(reactorId);
        const payload = reactor?.activeEffects.find(
          (effect) => effect.reactivePayload?.trigger === "meleeHitWithin5ft",
        )?.reactivePayload;
        send({
          type: "BATTLE_AFTER_DAMAGE_REACTIVE_EFFECT",
          reactorId,
          reactionDmg: p(picks, "reactionDmg", 8),
          reactionDt: payload?.damageType ?? "fire",
        });
      },
      bAfterDamageRetaliation: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_AFTER_DAMAGE_RETALIATION",
          reactorId: pcn(picks, "reactorId"),
          retAtkRoll: p(picks, "retAtkRoll", 10),
          retDmg: p(picks, "retDmg", 5),
          retDt: mapDamageType(ps(picks, "retDt", "Slashing")),
          retCrit: pb(picks, "retCrit", false),
          retTgtAc: armorClass(p(picks, "retTgtAc", 15)),
        });
      },
      bCastSaveSpell: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_CAST_SAVE_SPELL",
          targetId: pc(picks, "targetId", ""),
          saveDC: difficultyClass(p(picks, "saveDC", 15)),
          saveRoll: p(picks, "saveRoll", 10),
          dmgOnFail: p(picks, "dmgOnFail", 10),
          halfOnSave: pb(picks, "halfOnSave", false),
          dt: mapDamageType(ps(picks, "dt", "Fire")),
          cond: QUINT_CONDITION_MAP[ps(picks, "cond", "CBlinded")] ?? "blinded",
          applyCond: pb(picks, "applyCond", false),
          saveAbility: mapAbility(ps(picks, "saveAb", "Con")),
          slotLvl: spellSlotLevel(p(picks, "slotLvl", 1)),
          spellName: ps(picks, "spellName", "guiding_bolt"),
          ritual: pb(picks, "ritual", false),
        });
      },
      bResolveCounterspell: (picks: Record<string, unknown>) => {
        const raw = picks["decision"] as
          | { tag: string; value: unknown }
          | undefined;
        const tag = raw ? variantToString(raw) : undefined;
        const decision =
          tag === "RCounterspell"
            ? ({
                tag: "RCounterspell",
                saveSucceeded: Boolean(raw!.value),
              } as const)
            : tag === "RPass"
              ? ({ tag: "RPass" } as const)
              : null;
        send({
          type: "BATTLE_RESOLVE_COUNTERSPELL",
          reactorId: pcn(picks, "reactorId"),
          decision,
          csSlotLvl: spellSlotLevel(p(picks, "csSlotLvl", 3)),
        });
      },
      bResolveSaveFailedReaction: (picks: Record<string, unknown>) => {
        const tag = ps(picks, "decision", "RPass");
        const decision =
          tag === "RLegendaryResistance"
            ? ({ tag: "RLegendaryResistance" } as const)
            : ({ tag: "RPass" } as const);
        send({
          type: "BATTLE_RESOLVE_SAVE_FAILED_REACTION",
          reactorId: pcn(picks, "reactorId"),
          decision,
        });
      },
      bCastConcentrationSpell: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_CAST_CONCENTRATION_SPELL",
          targetId: pc(picks, "targetId", ""),
          slotLvl: spellSlotLevel(p(picks, "slotLvl", 1)),
          duration: p(picks, "duration", 5),
          spellId: mkSpellId(ps(picks, "spellId", "hold_person")),
          cond:
            QUINT_CONDITION_MAP[ps(picks, "cond", "CParalyzed")] ?? "paralyzed",
          applyCond: pb(picks, "applyCond", false),
          ritual: pb(picks, "ritual", false),
        });
      },
      bConcentrationCheck: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_CONCENTRATION_CHECK",
          targetId: pc(picks, "targetId", ""),
          conSaveSucceeded: pb(picks, "conSaveSucceeded", false),
        });
      },
      bCastAoE: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_CAST_AOE",
          saveDC: difficultyClass(p(picks, "saveDC", 15)),
          dmgOnFail: p(picks, "dmgOnFail", 10),
          halfOnSave: pb(picks, "halfOnSave", false),
          dt: mapDamageType(ps(picks, "dt", "Fire")),
          cond: QUINT_CONDITION_MAP[ps(picks, "cond", "CBlinded")] ?? "blinded",
          applyCond: pb(picks, "applyCond", false),
          saveAbility: mapAbility(ps(picks, "saveAb", "Dex")),
          slotLvl: spellSlotLevel(p(picks, "slotLvl", 1)),
          spellName: ps(picks, "spellName", "fireball"),
          ritual: pb(picks, "ritual", false),
        });
      },
      bResolveAoETarget: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_RESOLVE_AOE_TARGET",
          targetId: pcn(picks, "targetId"),
          saveRoll: p(picks, "saveRoll", 10),
        });
      },
      bMove: (picks: Record<string, unknown>) => {
        const provocationKind = variantToString(
          picks["provocationKind"] ?? "MPProvokesOpportunityAttacks",
        );
        send({
          type: "BATTLE_MOVE",
          provocationKind:
            provocationKind === "MPDoesNotProvokeOpportunityAttacks"
              ? "doesNotProvokeOpportunityAttacks"
              : "provokesOpportunityAttacks",
          threatened: parseThreatenedSet(picks["threatened"]),
        });
      },
      bMovementOADecline: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_MOVEMENT_OA_DECLINE",
          reactorId: pcn(picks, "reactorId"),
        });
      },
      bMovementOAAttack: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_MOVEMENT_OA_ATTACK",
          reactorId: pcn(picks, "reactorId"),
          oaAtkRoll: p(picks, "oaAtkRoll", 10),
          oaDmg: p(picks, "oaDmg", 5),
          oaDt: mapDamageType(ps(picks, "oaDt", "Slashing")),
          oaCrit: pb(picks, "oaCrit", false),
          oaTgtAc: armorClass(p(picks, "oaTgtAc", 15)),
          knockOut: pb(picks, "knockOut", false),
          isMelee: true as const,
          ...attackContextPicks(picks),
        });
      },
      bEndTurn: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_END_TURN",
          eotSaveSucceeded: pb(picks, "eotSaveSucceeded", false),
          eotDmg: p(picks, "eotDmg", 0),
          eotDt: mapDamageType(ps(picks, "eotDt", "Bludgeoning")),
          eotConSave: pb(picks, "eotConSave", false),
        });
      },
      bLegendaryPass: () => {
        send({ type: "BATTLE_LEGENDARY_PASS" });
      },
      bLegendaryAttack: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_LEGENDARY_ATTACK",
          monsterId: pc(picks, "monsterId", ""),
          abilityId: ps(picks, "abilityId", "lash"),
          laTarget: pc(picks, "laTarget", ""),
          laAtkRoll: p(picks, "laAtkRoll", 10),
          laDmg: p(picks, "laDmg", 10),
          laDt: mapDamageType(ps(picks, "laDt", "Slashing")),
          laCrit: pb(picks, "laCrit", false),
          laTgtAc: armorClass(p(picks, "laTgtAc", 15)),
          knockOut: pb(picks, "knockOut", false),
          isMelee: pb(picks, "isMelee", true),
          ...attackContextPicks(picks),
        });
      },
      bHeal: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_HEAL",
          targetId: pc(picks, "targetId", ""),
          amount: p(picks, "amount", 5),
        });
      },
      bDash: () => {
        send({ type: "BATTLE_DASH" });
      },
      bDisengage: () => {
        send({ type: "BATTLE_DISENGAGE" });
      },
      bBonusDisengage: () => {
        send({ type: "BATTLE_BONUS_DISENGAGE" });
      },
      bDodge: () => {
        send({ type: "BATTLE_DODGE" });
      },
      bHide: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_HIDE",
          stealthTotal: p(picks, "stealthTotal", 1),
          hasCoverOrObscurement: pb(picks, "hasCoverOrObscurement", false),
          outOfEnemyLineOfSight: pb(picks, "outOfEnemyLineOfSight", false),
        });
      },
      bBonusHide: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_BONUS_HIDE",
          stealthTotal: p(picks, "stealthTotal", 1),
          hasCoverOrObscurement: pb(picks, "hasCoverOrObscurement", false),
          outOfEnemyLineOfSight: pb(picks, "outOfEnemyLineOfSight", false),
        });
      },
      bGrapple: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_GRAPPLE",
          targetId: pc(picks, "targetId", ""),
          targetSaveFailed: pb(picks, "targetSaveFailed", false),
        });
      },
      bReleaseGrapple: () => {
        send({ type: "BATTLE_RELEASE_GRAPPLE" });
      },
      bEscapeGrapple: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_ESCAPE_GRAPPLE",
          escapeSucceeded: pb(picks, "escapeSucceeded", false),
        });
      },
      bActionSurge: () => {
        send({ type: "BATTLE_ACTION_SURGE" });
      },
      bEnterRage: () => {
        send({ type: "BATTLE_ENTER_RAGE" });
      },
      bDeclareReckless: () => {
        send({ type: "BATTLE_DECLARE_RECKLESS" });
      },
      bReady: () => {
        send({ type: "BATTLE_READY" });
      },
      bReadySpell: (picks: Record<string, unknown>) => {
        const slotLvl = p(picks, "slotLvl", 1);
        const spellName = ps(picks, "spellName", "hold_person");
        const payload = getBattleReadyableSpellPayload(
          spellName as SpellName,
          spellSlotLevel(slotLvl),
        );
        const release = payload?.release;
        send({
          type: "BATTLE_READY_SPELL",
          targetId: pc(picks, "targetId", ""),
          saveDC: release?.saveDC ?? difficultyClass(13),
          dmgOnFail: release?.damageOnFail ?? 0,
          halfOnSave: release?.halfOnSuccess ?? false,
          dt: release?.damageType ?? "slashing",
          cond: release?.conditionOnFail ?? "blinded",
          applyCond: release?.applyCondition ?? false,
          saveAbility: release?.saveAbility ?? "dex",
          slotLvl: spellSlotLevel(slotLvl),
          spellName,
        });
      },
      bReadyPass: () => {
        send({ type: "BATTLE_READY_PASS" });
      },
      bReadyRelease: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_READY_RELEASE",
          releaserId: pc(picks, "releaserId", ""),
          targetId: pc(picks, "targetId", ""),
          atkRoll: p(picks, "atkRoll", 10),
          dmg: p(picks, "dmg", 5),
          dt: mapDamageType(ps(picks, "dt", "Slashing")),
          crit: pb(picks, "crit", false),
          tgtAc: armorClass(p(picks, "tgtAc", 15)),
          knockOut: pb(picks, "knockOut", false),
          isMelee: pb(picks, "isMelee", true),
          ...attackContextPicks(picks),
        });
      },
      bCastBonusActionSpell: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_CAST_SAVE_SPELL",
          targetId: pc(picks, "targetId", ""),
          saveDC: difficultyClass(p(picks, "saveDC", 15)),
          saveRoll: p(picks, "saveRoll", 10),
          dmgOnFail: p(picks, "dmgOnFail", 10),
          halfOnSave: pb(picks, "halfOnSave", false),
          dt: mapDamageType(ps(picks, "dt", "Fire")),
          cond: QUINT_CONDITION_MAP[ps(picks, "cond", "CBlinded")] ?? "blinded",
          applyCond: pb(picks, "applyCond", false),
          saveAbility: mapAbility(ps(picks, "saveAb", "Con")),
          slotLvl: spellSlotLevel(p(picks, "slotLvl", 1)),
          spellName: ps(picks, "spellName", "guiding_bolt"),
          ritual: false,
          bonusAction: true,
        });
      },
      bReadySpellRelease: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_READY_SPELL_RELEASE",
          releaserId: pc(picks, "releaserId", ""),
          saveRoll: p(picks, "saveRoll", 10),
        });
      },
      bSearch: (picks: Record<string, unknown>) => {
        send({
          type: "BATTLE_SEARCH",
          targetId: pc(picks, "targetId", ""),
          perceptionTotal: p(picks, "perceptionTotal", 10),
        });
      },
      battleStep: () => {},
      getState: (): BattleCompareState => {
        const c = ctx();
        const creatures = new Map<string, NormalizedBattleCreature>();
        for (const [id, cr] of c.creatures)
          creatures.set(id, xstateCreatureToNormalized(cr));
        // Extract XState phase from hierarchical state value
        const snap = actor!.getSnapshot();
        const stateVal = snap.value as Record<string, string> | string;
        const phase =
          typeof stateVal === "object" && "running" in stateVal
            ? stateVal.running
            : "idle";
        return {
          creatures,
          turnIndex: c.turnIndex,
          round: c.round,
          turnStarted: c.turnStarted,
          phase,
        };
      },
      config: () => ({ statePath: [] as Array<string> }),
    };
  });
}

// ============================================================
// State comparison
// ============================================================

/** Map Quint bPhase variant tag to XState child state name. */
function normalizeQuintPhase(raw: unknown): string {
  const tag = variantToString(raw);
  switch (tag) {
    case "BPActiveTurn":
      return "activeTurn";
    case "BPAwaitingReaction":
      return "awaitingReaction";
    case "BPResolvingAoE":
      return "resolvingAoE";
    case "BPResolvingMovement":
      return "resolvingMovement";
    case "BPAwaitingLegendaryAction":
      return "awaitingLegendaryAction";
    default:
      return `unknown(${tag})`;
  }
}

const battleMachineStateCheck = stateCheck(
  (raw: unknown) => {
    const parsed = QuintBattleState.parse(raw);
    const creatures = new Map<string, NormalizedBattleCreature>();
    for (const [id, combatant] of parsed.bCreatures)
      creatures.set(id, quintCombatantToNormalized(combatant));
    return {
      creatures,
      turnIndex: Number(parsed.bTurnIndex),
      round: Number(parsed.bRound),
      turnStarted: parsed.bTurnStarted,
      phase: normalizeQuintPhase(parsed.bPhase),
    } satisfies BattleCompareState;
  },
  (spec: BattleCompareState, impl: BattleCompareState) => {
    // Compare battle-level fields
    if (
      spec.turnIndex !== impl.turnIndex ||
      spec.round !== impl.round ||
      spec.turnStarted !== impl.turnStarted
    )
      return false;
    // Compare phase
    if (spec.phase !== impl.phase) return false;
    // Compare per-creature fields
    for (const [id, specState] of spec.creatures) {
      const implState = impl.creatures.get(id);
      if (!implState) return false;
      if (!compareNormalizedStates(specState, implState)) return false;
    }
    return true;
  },
);

// ============================================================
// Test harness
// ============================================================

describe("Battle Machine MBT", () => {
  beforeAll(() => {
    killZombieEvaluators();
    registerEvaluatorCleanup();
  });
  afterAll(() => {
    killZombieEvaluators();
  });

  const isDev = process.env["MBT_DEV"] === "1";
  const mbtBackend = getMbtBackend();
  const battleRunShape = getBattleMbtRunShape(isDev);
  const specPath = path.resolve(import.meta.dirname, "../../../battle.qnt");

  it("replays battle traces against battleMachine", async () => {
    const dir = process.env["MBT_REPLAY_DIR"];
    if (dir) {
      const { replayFromDir } = await import("./mbt-replay.js");
      const result = await replayFromDir({
        dir,
        driver: createBattleMachineDriver(),
        stateCheck: battleMachineStateCheck,
      });
      console.log(
        `[battle machine MBT] replayed ${result.tracesReplayed} traces from ${dir}`,
      );
    } else {
      await withDefaultLocalBattleSeed(async () => {
        // The compiled-input fast path is opt-in here. In this environment,
        // quint-connect's direct-evaluator write path can fail with EPIPE before
        // the run begins. The plain `quint run` path is slower but stable.
        const useCompiledInput = process.env["MBT_USE_COMPILED_CACHE"] === "1";
        const compiledInputPath = useCompiledInput
          ? path.resolve(
              import.meta.dirname,
              "../../../.quint-cache/battle-compiled.json",
            )
          : undefined;
        const result = await run({
          spec: specPath,
          init: "bInit",
          step: "battleStep",
          driver: createBattleMachineDriver(),
          backend: mbtBackend,
          nTraces: Number(
            process.env["MBT_TRACES"] ?? battleRunShape.traceCount,
          ),
          maxSteps: Number(
            process.env["MBT_STEPS"] ?? battleRunShape.stepCount,
          ),
          maxSamples: Number(
            process.env["MBT_MAX_SAMPLES"] ?? battleRunShape.maxSamples,
          ),
          stateCheck: battleMachineStateCheck,
          ...(compiledInputPath ? { compiledInput: compiledInputPath } : {}),
          ...(process.env["MBT_TRACE_DIR"]
            ? { traceDir: process.env["MBT_TRACE_DIR"] }
            : {}),
        });
        logMbtSeed("battle machine MBT", result);
      });
    }
  }, 600_000);
});
