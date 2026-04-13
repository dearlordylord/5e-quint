import { Option } from "effect";

import {
  buildBattleAttackContext,
  resolveAttack,
} from "#/battle-machine-actions-attack.ts";
import {
  battleExpendSlot,
  battleHasFreeHand,
  deriveBattleHandUses,
  freshCaster,
  freshCreature,
  isIncapacitated,
  startConcentration,
} from "#/battle-machine-creature.ts";
import {
  activeId,
  breakConcentrationAndPropagate,
  canProvideBattleSpellComponents,
  prepareBattleCasterForSpell,
  consumeHelp,
  eligibleForCounterspell,
  escapeBattleGrapple,
  findHelpAdvantage,
  heal,
  linkBattleGrapple,
  mkAwait,
  nextTurn,
  processEndTurn,
  processStartTurn,
  releaseBattleGrappleByGrappler,
  removeCasterEffectsAndDependents,
  resolveSave,
  setCreature,
  spendAction,
  spendBonusActionForAction,
  spendExtraAttack,
} from "#/battle-machine-helpers.ts";
import type {
  BattleActionArgs,
  BattleContext,
  BattleCreatureState,
  BattleEvent,
  CreatureId,
  InitCreatureConfig,
} from "#/battle-machine-types.ts";
import {
  ADR_ACTIVE_TURN,
  PHASE_ACTIVE,
  phaseAwaitingLegendary,
  phaseAwaitingReady,
  phaseAwaitReaction,
} from "#/battle-machine-types.ts";
import {
  rageDamageBonus,
  rageMaxCharges,
  rageResistances,
} from "#/features/class-barbarian.ts";
import { actionSurgeMaxCharges } from "#/features/class-fighter.ts";
import {
  battleReadyableSpellPayloadsFromPreparedSpells,
  getBattleReadyableSpellPayloadForSlots,
} from "#/features/spell-available-actions.ts";
import { getSpellRecordStrict } from "#/features/spell-registry.ts";
import {
  aggregateAttackMods,
  hasAttackDisadvantageSource,
  resolveGrapple,
  targetTwoSizesSmaller,
} from "#/machine-combat.ts";
import {
  getMonsterStatBlockByStateId,
  statBlockLegendaryAction,
} from "#/monster-catalog.ts";
import {
  resourceCount,
  spellId as mkSpellId,
  type SpellId,
  type SpellName,
} from "#/types.ts";

// TODO style: combinators
function readyEligible(
  cs: ReadonlyMap<CreatureId, BattleCreatureState>,
): ReadonlySet<CreatureId> {
  const result = new Set<CreatureId>();
  for (const [id, c] of cs) {
    if (
      c.readiedAction &&
      c.reactionAvailable &&
      !c.dead &&
      !isIncapacitated(c)
    )
      result.add(id);
  }
  return result;
}

function canonicalPreparedSpellIds(
  spellRefs: ReadonlySet<string>,
): ReadonlySet<SpellId> {
  return new Set(
    [...spellRefs].map((spellRef) => getSpellRecordStrict(spellRef).id),
  );
}

/** Check for ready-eligible creatures, enter ready window or advance turn. */
function readyWindowOrAdvance(
  cs: ReadonlyMap<CreatureId, BattleCreatureState>,
  turnIndex: number,
  initLen: number,
  round: number,
): Partial<BattleContext> {
  const rElig = readyEligible(cs);
  if (rElig.size > 0) {
    return {
      ...phaseAwaitingReady({
        eligibleCreatures: rElig,
        endingTurnIndex: turnIndex,
      }),
    };
  }
  const nt = nextTurn(turnIndex, initLen, round);
  return {
    turnIndex: nt.idx,
    round: nt.round,
    ...PHASE_ACTIVE,
    turnStarted: false,
  };
}

/** Effective initiative roll: surprised = Disadvantage (min of two d20s). */
export function effectiveInitRoll(
  roll1: number,
  roll2: number,
  surprised: boolean,
): number {
  return surprised ? Math.min(roll1, roll2) : roll1;
}

export function buildCreatureState(
  cfg: InitCreatureConfig,
  positionIndex: number,
): BattleCreatureState {
  const base = cfg.caster
    ? freshCaster(cfg.maxHp, cfg.kind)
    : freshCreature(cfg.maxHp, cfg.kind);
  const mainHandWeapon = cfg.mainHandWeapon ?? base.mainHandWeapon;
  const offHandWeapon = cfg.offHandWeapon ?? base.offHandWeapon;
  const handUses = deriveBattleHandUses({
    mainHandWeapon,
    offHandWeapon,
    hasShieldEquipped: cfg.hasShieldEquipped ?? false,
    mainHandUsesTwoHands: cfg.mainHandUsesTwoHands ?? false,
  });
  const preparedSpells =
    cfg.preparedSpells == null
      ? base.preparedSpells
      : canonicalPreparedSpellIds(cfg.preparedSpells);
  const slotsMax = cfg.slotsMax ?? base.slotsMax;
  const slotsCurrent = cfg.slotsCurrent ?? base.slotsCurrent;
  return {
    ...base,
    ...(cfg.monsterStatBlockId != null
      ? { monsterStatBlockId: cfg.monsterStatBlockId }
      : {}),
    ...(cfg.creatureSize != null ? { creatureSize: cfg.creatureSize } : {}),
    ...(cfg.baseArmorClass != null
      ? { baseArmorClass: cfg.baseArmorClass }
      : {}),
    ...(cfg.battleSide != null ? { battleSide: cfg.battleSide } : {}),
    ...(cfg.battlePosition != null
      ? { battlePosition: cfg.battlePosition }
      : {
          battlePosition: {
            row: positionIndex * 2,
            col: 0,
          },
        }),
    ...(cfg.maxHpReduction != null
      ? { maxHpReduction: cfg.maxHpReduction }
      : {}),
    ...(cfg.rogueLevel != null ? { rogueLevel: cfg.rogueLevel } : {}),
    ...(cfg.monkLevel != null ? { monkLevel: cfg.monkLevel } : {}),
    ...(cfg.strMod != null ? { strMod: cfg.strMod } : {}),
    ...(cfg.dexMod != null ? { dexMod: cfg.dexMod } : {}),
    ...(cfg.legendaryActions != null
      ? { legendaryActionsRemaining: resourceCount(cfg.legendaryActions) }
      : {}),
    ...(cfg.legendaryResistances != null
      ? {
          legendaryResistancesRemaining: resourceCount(
            cfg.legendaryResistances,
          ),
        }
      : {}),
    ...(cfg.rechargeAvailable != null
      ? { rechargeAvailable: cfg.rechargeAvailable }
      : {}),
    ...(cfg.rechargeMinRolls != null
      ? { rechargeMinRolls: cfg.rechargeMinRolls }
      : {}),
    ...(cfg.dailyUsesRemaining != null
      ? { dailyUsesRemaining: cfg.dailyUsesRemaining }
      : {}),
    preparedSpells,
    slotsMax,
    slotsCurrent,
    ...(cfg.pactSlotsMax != null ? { pactSlotsMax: cfg.pactSlotsMax } : {}),
    ...(cfg.pactSlotsCurrent != null
      ? { pactSlotsCurrent: cfg.pactSlotsCurrent }
      : {}),
    ...(cfg.pactSlotLevel != null ? { pactSlotLevel: cfg.pactSlotLevel } : {}),
    readyableSpellPayloads:
      cfg.readyableSpellPayloads ??
      battleReadyableSpellPayloadsFromPreparedSpells(
        preparedSpells,
        slotsCurrent,
      ),
    ...(cfg.hasEvasion != null ? { hasEvasion: cfg.hasEvasion } : {}),
    ...(cfg.saveMiscBonus != null ? { saveMiscBonus: cfg.saveMiscBonus } : {}),
    ...(cfg.critRange != null ? { critRange: cfg.critRange } : {}),
    ...(cfg.isWearingArmor != null
      ? { isWearingArmor: cfg.isWearingArmor }
      : {}),
    ...(cfg.defenseArmorClassBonus != null
      ? { defenseArmorClassBonus: cfg.defenseArmorClassBonus }
      : {}),
    ...(cfg.greatWeaponFightingDamageFloor != null
      ? {
          greatWeaponFightingDamageFloor: cfg.greatWeaponFightingDamageFloor,
        }
      : {}),
    ...(cfg.hiddenDiscoveryDc != null
      ? { hiddenDiscoveryDc: cfg.hiddenDiscoveryDc }
      : {}),
    ...(cfg.rangedWeaponAttackRollBonus != null
      ? { rangedWeaponAttackRollBonus: cfg.rangedWeaponAttackRollBonus }
      : {}),
    ...(cfg.fighterLevel != null
      ? (() => {
          const asCharges = actionSurgeMaxCharges(cfg.fighterLevel);
          return {
            fighterLevel: cfg.fighterLevel,
            ...(asCharges > 0
              ? {
                  actionSurgeCharges: asCharges,
                  actionSurgeUsedThisTurn: false,
                }
              : {}),
          };
        })()
      : {}),
    ...(cfg.barbarianLevel != null
      ? (() => {
          const maxCharges = rageMaxCharges(cfg.barbarianLevel);
          return {
            barbarianLevel: cfg.barbarianLevel,
            rageCharges: maxCharges,
          };
        })()
      : {}),
    ...(cfg.meleeDamageBonus != null
      ? { meleeDamageBonus: cfg.meleeDamageBonus }
      : {}),
    ...(cfg.sneakAttackDice != null
      ? { sneakAttackDice: cfg.sneakAttackDice }
      : {}),
    ...(cfg.bardLevel != null ? { bardLevel: cfg.bardLevel } : {}),
    ...(cfg.bardicInspirationCharges != null
      ? { bardicInspirationCharges: cfg.bardicInspirationCharges }
      : {}),
    ...(cfg.parryAcBonus != null ? { parryAcBonus: cfg.parryAcBonus } : {}),
    ...(cfg.lightPropertyExtraAttackAddsAbilityModifier != null
      ? {
          lightPropertyExtraAttackAddsAbilityModifier:
            cfg.lightPropertyExtraAttackAddsAbilityModifier,
        }
      : {}),
    ...(cfg.invisible === true ? { invisible: true } : {}),
    ...(cfg.prone === true ? { prone: true } : {}),
    ...(cfg.activeEffects != null ? { activeEffects: cfg.activeEffects } : {}),
    ...(cfg.baseWalkSpeed != null
      ? {
          baseWalkSpeed: cfg.baseWalkSpeed,
          movementRemaining: cfg.baseWalkSpeed,
          effectiveSpeed: cfg.baseWalkSpeed,
        }
      : {}),
    ...(cfg.mainHandWeapon != null
      ? { mainHandWeapon: cfg.mainHandWeapon }
      : {}),
    ...(cfg.offHandWeapon != null ? { offHandWeapon: cfg.offHandWeapon } : {}),
    ...(cfg.battleBonusActionOptions != null
      ? { battleBonusActionOptions: cfg.battleBonusActionOptions }
      : {}),
    ...(cfg.battleReactionOptions != null
      ? { battleReactionOptions: cfg.battleReactionOptions }
      : {}),
    ...handUses,
    ...(cfg.qualifiedPhysicalResistances != null
      ? { qualifiedPhysicalResistances: cfg.qualifiedPhysicalResistances }
      : {}),
    ...(cfg.qualifiedPhysicalVulnerabilities != null
      ? {
          qualifiedPhysicalVulnerabilities:
            cfg.qualifiedPhysicalVulnerabilities,
        }
      : {}),
    ...(cfg.qualifiedPhysicalImmunities != null
      ? { qualifiedPhysicalImmunities: cfg.qualifiedPhysicalImmunities }
      : {}),
  };
}

function isDefaultBattlePosition(
  creature: BattleCreatureState,
  initiativeIndex: number,
): boolean {
  return (
    creature.battlePosition.row === initiativeIndex * 2 &&
    creature.battlePosition.col === 0
  );
}

export function battleInit({
  event: e,
}: BattleActionArgs<"BATTLE_INIT">): Partial<BattleContext> {
  // BATTLE_INIT establishes the initial battle roster from already-authored
  // creatures using the same projection path later reused by BATTLE_ADD_CREATURE.
  const creatures = new Map<CreatureId, BattleCreatureState>();
  const scored = e.creatures.map((cfg) => ({
    cfg,
    score: effectiveInitRoll(
      cfg.initiativeRoll ?? 10,
      cfg.initiativeRollB ?? cfg.initiativeRoll ?? 10,
      cfg.surprised ?? false,
    ),
  }));
  // Stable sort: ES2019+ guarantees Array.sort stability.
  const sorted = [...scored].sort((a, b) => b.score - a.score);
  const initiative: Array<CreatureId> = [];
  for (const { cfg } of sorted) {
    creatures.set(cfg.id, buildCreatureState(cfg, initiative.length));
    initiative.push(cfg.id);
  }
  return {
    creatures,
    initiative,
    turnIndex: 0,
    round: 1,
    ...PHASE_ACTIVE,
    spellStack: [],
    turnStarted: false,
    helpTargets: [],
  };
}

export function battleAddCreature({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_ADD_CREATURE">): Partial<BattleContext> {
  // BATTLE_ADD_CREATURE changes battle participation, not creature existence.
  // The added creatures are already-authored inputs projected into battle state.
  if (!c.turnStarted) return {};
  if (e.insertAtIndex < 0 || e.insertAtIndex > c.initiative.length) return {};
  if (e.creatures.length === 0) return {};
  if (new Set(e.creatures.map((cfg) => cfg.id)).size !== e.creatures.length)
    return {};
  if (e.creatures.some((cfg) => c.creatures.has(cfg.id))) return {};

  const scored = e.creatures.map((cfg, index) => ({
    cfg,
    index,
    score: effectiveInitRoll(
      cfg.initiativeRoll ?? 10,
      cfg.initiativeRollB ?? cfg.initiativeRoll ?? 10,
      cfg.surprised ?? false,
    ),
  }));
  const sorted = [...scored].sort(
    (a, b) => b.score - a.score || a.index - b.index,
  );

  const creatures = new Map(c.creatures);
  const initiative = [
    ...c.initiative.slice(0, e.insertAtIndex),
    ...sorted.map(({ cfg }) => cfg.id),
    ...c.initiative.slice(e.insertAtIndex),
  ];
  const insertedCount = sorted.length;

  for (
    let oldIndex = e.insertAtIndex;
    oldIndex < c.initiative.length;
    oldIndex++
  ) {
    const shiftedId = c.initiative[oldIndex]!;
    const shiftedCreature = creatures.get(shiftedId)!;
    if (!isDefaultBattlePosition(shiftedCreature, oldIndex)) continue;
    creatures.set(shiftedId, {
      ...shiftedCreature,
      battlePosition: {
        row: (oldIndex + insertedCount) * 2,
        col: 0,
      },
    });
  }

  for (const [offset, { cfg }] of sorted.entries()) {
    creatures.set(cfg.id, buildCreatureState(cfg, e.insertAtIndex + offset));
  }

  return {
    creatures,
    initiative,
    turnIndex:
      e.insertAtIndex <= c.turnIndex
        ? c.turnIndex + insertedCount
        : c.turnIndex,
  };
}

export function battleRemoveCreature({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_REMOVE_CREATURE">): Partial<BattleContext> {
  if (!c.turnStarted) return {};

  const creatureIds = [...new Set(e.creatureIds)];
  if (creatureIds.length === 0) return {};
  if (creatureIds.length !== e.creatureIds.length) return {};
  if (creatureIds.some((id) => !c.creatures.has(id))) return {};
  if (creatureIds.length >= c.initiative.length) return {};

  const removedIds = new Set(creatureIds);
  const currentActiveId = activeId(c);
  const activeRemoved = removedIds.has(currentActiveId);
  let creatures = new Map(c.creatures);

  for (const id of creatureIds) {
    const creature = creatures.get(id);
    if (!creature) continue;
    if (Option.isSome(creature.concentrationSpellId)) {
      creatures = breakConcentrationAndPropagate(creatures, id);
    }
    creatures = removeCasterEffectsAndDependents(creatures, id);
    const updated = creatures.get(id);
    if (!updated) continue;
    if (updated.grapplingTarget != null) {
      creatures = releaseBattleGrappleByGrappler(
        creatures,
        id,
        currentActiveId,
      );
    }
    if (updated.grappledBy != null) {
      creatures = escapeBattleGrapple(creatures, id, currentActiveId);
    }
  }

  for (const id of creatureIds) {
    creatures.delete(id);
  }

  const initiative = c.initiative.filter((id) => !removedIds.has(id));
  const removedBefore = c.initiative
    .slice(0, c.turnIndex)
    .filter((id) => removedIds.has(id)).length;
  let turnIndex = c.turnIndex - removedBefore;
  let round = c.round;
  if (activeRemoved && turnIndex >= initiative.length) {
    turnIndex = 0;
    round += 1;
  }

  return {
    creatures,
    initiative,
    turnIndex,
    round,
    turnStarted: activeRemoved ? false : c.turnStarted,
    helpTargets: c.helpTargets.filter(
      (target) =>
        !removedIds.has(target.helperId) &&
        !removedIds.has(target.allyId) &&
        !removedIds.has(target.targetEnemyId),
    ),
  };
}

export function battleStartTurn({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_START_TURN">): Partial<BattleContext> {
  if (c.turnStarted) return {};
  const id = activeId(c);
  const creature = c.creatures.get(id)!;
  let cs: Map<CreatureId, BattleCreatureState> = new Map(c.creatures);
  if (creature.creatureKind === "Monster") {
    cs = setCreature(cs, id, {
      ...creature,
      legendaryActionsRemaining: resourceCount(3),
    });
  }
  let rechargedAbilities: ReadonlyArray<string> | undefined;
  if (creature.creatureKind === "Monster") {
    const recharged: Array<string> = [];
    for (const [name, available] of Object.entries(
      cs.get(id)!.rechargeAvailable,
    )) {
      if (!available && e.rechargeD6 >= (creature.rechargeMinRolls[name] ?? 5))
        recharged.push(name);
    }
    if (recharged.length > 0) rechargedAbilities = recharged;
  }
  const result = processStartTurn(
    cs,
    id,
    e.sotDmg,
    e.sotDt,
    e.sotHeal,
    e.sotSaveResult,
    e.sotConSave,
    rechargedAbilities,
    e.deathSaveRoll,
  );
  const afterFs = result.get(id)!;
  // If creature had a readied spell, break its concentration (SRD 5.2.1:
  // "Concentration, which you can maintain up to the start of your next turn")
  const afterReadyClear =
    afterFs.readiedSpellParams != null
      ? breakConcentrationAndPropagate(
          setCreature(result, id, { ...afterFs, readiedSpellParams: null }),
          id,
        )
      : result;
  const afterConc = afterReadyClear.get(id)!;
  const resetResult = setCreature(afterReadyClear, id, {
    ...afterConc,
    actionSurgeUsedThisTurn: false,
    recklessThisTurn: false,
    sneakAttackUsedThisTurn: false,
    readiedSpellParams: null,
  });
  const helpTargets = c.helpTargets.filter((h) => h.helperId !== id);
  return { creatures: resetResult, turnStarted: true, helpTargets };
}

export function battleEndTurn({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_END_TURN">): Partial<BattleContext> {
  const id = activeId(c);
  const cs = processEndTurn(
    c.creatures,
    id,
    e.eotSaveSucceeded,
    e.eotDmg,
    e.eotDt,
    e.eotConSave,
  );
  const laEligible = new Set<CreatureId>();
  for (const [cid, cr] of cs) {
    if (
      cid !== id &&
      cr.creatureKind === "Monster" &&
      cr.legendaryActionsRemaining > 0 &&
      !cr.dead &&
      cr.incapacitatedSources.size === 0
    )
      laEligible.add(cid);
  }
  if (laEligible.size > 0) {
    return {
      creatures: cs,
      ...phaseAwaitingLegendary({
        eligibleMonsters: laEligible,
        endingTurnIndex: c.turnIndex,
      }),
    };
  }
  return {
    creatures: cs,
    ...readyWindowOrAdvance(cs, c.turnIndex, c.initiative.length, c.round),
  };
}

export function battleGrapple({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_GRAPPLE">): Partial<BattleContext> {
  if (!c.turnStarted) return {};
  const id = activeId(c);
  const ac = c.creatures.get(id)!;
  const tc = c.creatures.get(e.targetId)!;
  if (ac.dead || isIncapacitated(ac) || tc.dead) return {};
  if (ac.actionsRemaining <= 0 && ac.extraAttacksRemaining <= 0) return {};
  if (ac.grapplingTarget != null || tc.grappledBy != null) return {};
  if (!battleHasFreeHand(ac)) return {};
  const attackerSize = ac.creatureSize;
  const targetSize = tc.creatureSize;
  const updatedAc =
    ac.attackActionUsed && ac.extraAttacksRemaining > 0
      ? spendExtraAttack(ac)
      : spendAction(ac, "attack");
  let cs = setCreature(c.creatures, id, updatedAc);
  const success = resolveGrapple(
    attackerSize,
    targetSize,
    e.targetSaveFailed,
    true,
    isIncapacitated(tc),
  );
  if (success) {
    cs = linkBattleGrapple(
      cs,
      id,
      e.targetId,
      targetTwoSizesSmaller(attackerSize, targetSize),
      id,
    );
  }
  return { creatures: cs };
}

export function battleReleaseGrapple({
  context: c,
}: BattleActionArgs<"BATTLE_RELEASE_GRAPPLE">): Partial<BattleContext> {
  if (!c.turnStarted) return {};
  const id = activeId(c);
  return { creatures: releaseBattleGrappleByGrappler(c.creatures, id, id) };
}

export function battleEscapeGrapple({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_ESCAPE_GRAPPLE">): Partial<BattleContext> {
  if (!c.turnStarted) return {};
  const id = activeId(c);
  const ac = c.creatures.get(id)!;
  if (
    ac.dead ||
    isIncapacitated(ac) ||
    ac.actionsRemaining <= 0 ||
    ac.grappledBy == null
  )
    return {};
  const cs = setCreature(c.creatures, id, spendAction(ac, "utilize"));
  if (!e.escapeSucceeded) return { creatures: cs };
  return { creatures: escapeBattleGrapple(cs, id, id) };
}

export function battleLegendaryPass({
  context: c,
}: BattleActionArgs<"BATTLE_LEGENDARY_PASS">): Partial<BattleContext> {
  return readyWindowOrAdvance(
    c.creatures,
    c.turnIndex,
    c.initiative.length,
    c.round,
  );
}

export function battleUseLegendaryAction({
  context: c,
  event: e,
}: BattleActionArgs<"USE_LEGENDARY_ACTION">): Partial<BattleContext> {
  const laCtx = c.laCtx;
  if (laCtx == null || !laCtx.eligibleMonsters.has(e.monsterId)) return {};
  const monster = c.creatures.get(e.monsterId);
  const statBlock = getMonsterStatBlockByStateId(monster?.monsterStatBlockId);
  const legendary =
    statBlock == null ? null : statBlockLegendaryAction(statBlock, e.abilityId);
  if (
    monster == null ||
    monster.creatureKind !== "Monster" ||
    monster.dead ||
    isIncapacitated(monster) ||
    legendary == null ||
    legendary.kind !== "legendaryAction" ||
    monster.legendaryActionsRemaining < legendary.cost
  ) {
    return {};
  }
  return {
    selectedMonsterCommand: {
      type: "USE_LEGENDARY_ACTION",
      monsterId: e.monsterId,
      abilityId: e.abilityId,
    },
  };
}

export function battleUseRechargeAbility({
  context: c,
  event: e,
}: BattleActionArgs<"USE_RECHARGE_ABILITY">): Partial<BattleContext> {
  if (!c.turnStarted || activeId(c) !== e.monsterId) return {};
  const monster = c.creatures.get(e.monsterId);
  const statBlock = getMonsterStatBlockByStateId(monster?.monsterStatBlockId);
  if (
    monster == null ||
    monster.creatureKind !== "Monster" ||
    monster.dead ||
    isIncapacitated(monster) ||
    statBlock == null ||
    statBlock.rechargeAbilities[e.abilityId] == null ||
    !monster.rechargeAvailable[e.abilityId]
  ) {
    return {};
  }
  return {
    selectedMonsterCommand: {
      type: "USE_RECHARGE_ABILITY",
      monsterId: e.monsterId,
      abilityId: e.abilityId,
    },
  };
}

export function battleUseDailyAbility({
  context: c,
  event: e,
}: BattleActionArgs<"USE_DAILY_ABILITY">): Partial<BattleContext> {
  if (!c.turnStarted || activeId(c) !== e.monsterId) return {};
  const monster = c.creatures.get(e.monsterId);
  const statBlock = getMonsterStatBlockByStateId(monster?.monsterStatBlockId);
  const remaining = monster?.dailyUsesRemaining[e.abilityId] ?? 0;
  if (
    monster == null ||
    monster.creatureKind !== "Monster" ||
    monster.dead ||
    isIncapacitated(monster) ||
    statBlock == null ||
    statBlock.dailyAbilities[e.abilityId] == null ||
    remaining <= 0
  ) {
    return {};
  }
  return {
    selectedMonsterCommand: {
      type: "USE_DAILY_ABILITY",
      monsterId: e.monsterId,
      abilityId: e.abilityId,
    },
  };
}

export function battleReadyPass({
  context: c,
}: BattleActionArgs<"BATTLE_READY_PASS">): Partial<BattleContext> {
  const nt = nextTurn(c.turnIndex, c.initiative.length, c.round);
  return {
    turnIndex: nt.idx,
    round: nt.round,
    ...PHASE_ACTIVE,
    turnStarted: false,
  };
}

export function battleReadyRelease({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_READY_RELEASE">): Partial<BattleContext> {
  const releaser = c.creatures.get(e.releaserId)!;
  const cs = setCreature(c.creatures, e.releaserId, {
    ...releaser,
    reactionAvailable: false,
    readiedAction: false,
  });
  const readyReturn = {
    tag: "ADRAwaitingReadiedAction" as const,
    ready: c.readyCtx!,
  };
  const helpIdx = findHelpAdvantage(c.helpTargets, e.releaserId, e.targetId);
  const readyCtx = buildBattleAttackContext(
    cs,
    e.releaserId,
    e.targetId,
    e.isMelee,
    e.weaponProperties ?? new Set(e.isFinesse === true ? ["finesse"] : []),
    e.attackerWithin5ft,
    e.hostileWithin5ft,
    e.targetCanSeeAttacker,
    e.attackerCanSeeTarget,
    e.frightSourceInLOS,
    helpIdx >= 0,
  );
  const readyMods = aggregateAttackMods(readyCtx);
  const readyHasAnyDisadvantageSource = hasAttackDisadvantageSource(readyCtx);
  const result = resolveAttack(
    cs,
    e.releaserId,
    e.targetId,
    e.atkRoll,
    e.tgtAc,
    e.dmg,
    e.dt,
    e.damageQualifiers ?? new Set(),
    e.crit,
    releaser.critRange,
    readyReturn,
    e.knockOut,
    e.isMelee,
    e.attackerWithin5ft,
    e.attackerWithin60ft ?? false,
    e.targetCanSeeAttacker,
    readyMods,
    releaser.mainHandWeapon != null
      ? !releaser.mainHandWeapon.isMelee
      : !e.isMelee,
    undefined,
    e.weaponProperties ?? new Set(e.isFinesse === true ? ["finesse"] : []),
    undefined,
    e.hasAllyAdjacentToTarget,
    readyHasAnyDisadvantageSource,
    e.saDmg,
    e.hitReactionCandidates,
  );
  return helpIdx >= 0
    ? { ...result, helpTargets: consumeHelp(c.helpTargets, helpIdx) }
    : result;
}

export function battleLegendaryAttack({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_LEGENDARY_ATTACK">): Partial<BattleContext> {
  const m = c.creatures.get(e.monsterId);
  const selected = c.selectedMonsterCommand;
  const statBlock = getMonsterStatBlockByStateId(m?.monsterStatBlockId);
  const legendary =
    statBlock == null ? null : statBlockLegendaryAction(statBlock, e.abilityId);
  if (
    m == null ||
    c.laCtx == null ||
    selected == null ||
    selected.type !== "USE_LEGENDARY_ACTION" ||
    selected.monsterId !== e.monsterId ||
    selected.abilityId !== e.abilityId ||
    legendary == null ||
    legendary.kind !== "legendaryAction" ||
    legendary.attackId == null ||
    m.legendaryActionsRemaining < legendary.cost
  ) {
    return {};
  }
  const cs = setCreature(c.creatures, e.monsterId, {
    ...m,
    legendaryActionsRemaining: resourceCount(
      m.legendaryActionsRemaining - legendary.cost,
    ),
  });
  const laReturn = { tag: "ADRAwaitingLegendaryAction" as const, la: c.laCtx! };
  const helpIdx = findHelpAdvantage(c.helpTargets, e.monsterId, e.laTarget);
  const laCtx = buildBattleAttackContext(
    cs,
    e.monsterId,
    e.laTarget,
    e.isMelee,
    e.weaponProperties ?? new Set(e.isFinesse === true ? ["finesse"] : []),
    e.attackerWithin5ft,
    e.hostileWithin5ft,
    e.targetCanSeeAttacker,
    e.attackerCanSeeTarget,
    e.frightSourceInLOS,
    helpIdx >= 0,
  );
  const laMods = aggregateAttackMods(laCtx);
  const laHasAnyDisadvantageSource = hasAttackDisadvantageSource(laCtx);
  const result = resolveAttack(
    cs,
    e.monsterId,
    e.laTarget,
    e.laAtkRoll,
    e.laTgtAc,
    e.laDmg,
    e.laDt,
    e.damageQualifiers ?? new Set(),
    e.laCrit,
    m.critRange,
    laReturn,
    e.knockOut,
    e.isMelee,
    e.attackerWithin5ft,
    e.attackerWithin60ft ?? false,
    e.targetCanSeeAttacker,
    laMods,
    m.mainHandWeapon != null ? !m.mainHandWeapon.isMelee : !e.isMelee,
    undefined,
    e.weaponProperties ?? new Set(e.isFinesse === true ? ["finesse"] : []),
    undefined,
    e.hasAllyAdjacentToTarget,
    laHasAnyDisadvantageSource,
    e.saDmg,
    e.hitReactionCandidates,
  );
  return helpIdx >= 0
    ? {
        ...result,
        selectedMonsterCommand: null,
        helpTargets: consumeHelp(c.helpTargets, helpIdx),
      }
    : { ...result, selectedMonsterCommand: null };
}

export function battleHeal({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_HEAL">): Partial<BattleContext> {
  if (!c.turnStarted) return {};
  const id = activeId(c);
  const ac = c.creatures.get(id)!;
  if (ac.dead || isIncapacitated(ac) || ac.actionsRemaining <= 0) return {};
  if (ac.actionSurgeActionPending || ac.ragingBlocksSpells) return {};
  let cs = setCreature(c.creatures, id, spendAction(ac, "magic"));
  cs = setCreature(cs, e.targetId, heal(cs.get(e.targetId)!, e.amount));
  return { creatures: cs };
}

export function battleHelpAttack({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_HELP_ATTACK">): Partial<BattleContext> {
  if (!c.turnStarted) return {};
  const id = activeId(c);
  const helper = c.creatures.get(id)!;
  const ally = c.creatures.get(e.allyId);
  const target = c.creatures.get(e.targetId);
  if (
    helper.dead ||
    isIncapacitated(helper) ||
    helper.actionsRemaining <= 0 ||
    ally == null ||
    target == null ||
    ally.dead ||
    target.dead ||
    !e.helperWithin5ftOfTarget ||
    e.allyId === id ||
    e.targetId === id ||
    e.allyId === e.targetId
  ) {
    return {};
  }
  const spent = spendAction(helper, "help");
  return {
    creatures: setCreature(c.creatures, id, spent),
    helpTargets: [
      ...c.helpTargets,
      { helperId: id, allyId: e.allyId, targetEnemyId: e.targetId },
    ],
  };
}

function hasBattleBonusActionOption(
  creature: BattleCreatureState,
  option: "disengage" | "hide",
): boolean {
  return creature.battleBonusActionOptions.includes(option);
}

function isHideSuccessful(
  stealthTotal: number,
  hasCoverOrObscurement: boolean,
  outOfEnemyLineOfSight: boolean,
): boolean {
  return stealthTotal >= 15 && hasCoverOrObscurement && outOfEnemyLineOfSight;
}

export function battleHide({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_HIDE">): Partial<BattleContext> {
  return battleHideWithResource(c, e, "action");
}

function battleHideWithResource(
  c: BattleContext,
  e: Extract<
    BattleEvent,
    { readonly type: "BATTLE_HIDE" | "BATTLE_BONUS_HIDE" }
  >,
  resource: "action" | "bonusAction",
): Partial<BattleContext> {
  if (!c.turnStarted) return {};
  const id = activeId(c);
  const ac = c.creatures.get(id)!;
  if (ac.dead || isIncapacitated(ac)) return {};
  if (resource === "action" && ac.actionsRemaining <= 0) return {};
  if (
    resource === "bonusAction" &&
    (ac.bonusActionUsed || !hasBattleBonusActionOption(ac, "hide"))
  ) {
    return {};
  }
  const next =
    resource === "action"
      ? spendAction(ac, "hide")
      : spendBonusActionForAction(ac, "hide");
  const hidden = isHideSuccessful(
    e.stealthTotal,
    e.hasCoverOrObscurement,
    e.outOfEnemyLineOfSight,
  );
  return {
    creatures: setCreature(c.creatures, id, {
      ...next,
      hiddenDiscoveryDc: hidden ? e.stealthTotal : 0,
      invisible: hidden ? true : next.invisible,
    }),
  };
}

export function battleBonusHide({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_BONUS_HIDE">): Partial<BattleContext> {
  return battleHideWithResource(c, e, "bonusAction");
}

export function battleSearch({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_SEARCH">): Partial<BattleContext> {
  if (!c.turnStarted) return {};
  const id = activeId(c);
  const ac = c.creatures.get(id)!;
  const target = c.creatures.get(e.targetId);
  if (
    target == null ||
    ac.dead ||
    isIncapacitated(ac) ||
    ac.actionsRemaining <= 0
  )
    return {};
  const nextSearch = spendAction(ac, "search");
  let creatures = setCreature(c.creatures, id, nextSearch);
  if (
    target.hiddenDiscoveryDc > 0 &&
    e.perceptionTotal >= target.hiddenDiscoveryDc
  ) {
    creatures = setCreature(creatures, e.targetId, {
      ...target,
      hiddenDiscoveryDc: 0,
      invisible: target.activeEffects.some((effect) =>
        effect.grantedConditions?.includes("invisible"),
      ),
    });
  }
  return { creatures };
}

export function battleOffHandAttack({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_OFF_HAND_ATTACK">): Partial<BattleContext> {
  if (!c.turnStarted) return {};
  const id = activeId(c);
  const attacker = c.creatures.get(id)!;
  const target = c.creatures.get(e.targetId)!;
  const mainHand = attacker.mainHandWeapon;
  const offHand = attacker.offHandWeapon;
  if (
    attacker.dead ||
    target.dead ||
    isIncapacitated(attacker) ||
    attacker.bonusActionUsed ||
    !attacker.attackActionUsed ||
    !attacker.lightAttackUsedThisTurn ||
    mainHand == null ||
    offHand == null
  ) {
    return {};
  }
  if (
    !mainHand.isMelee ||
    !offHand.isMelee ||
    !mainHand.properties.has("light") ||
    !offHand.properties.has("light")
  ) {
    return {};
  }
  const cs = setCreature(c.creatures, id, {
    ...attacker,
    bonusActionUsed: true,
  });
  const isMeleeAttack =
    offHand.isMelee &&
    (e.attackerWithin5ft || !offHand.properties.has("thrown"));
  const abilityMod = offHand.properties.has("finesse")
    ? Math.max(attacker.strMod, attacker.dexMod)
    : attacker.strMod;
  const effectiveAbilityMod =
    attacker.lightPropertyExtraAttackAddsAbilityModifier
      ? abilityMod
      : Math.min(0, abilityMod);
  const damage = Math.max(0, e.dmg + effectiveAbilityMod);
  const ctx = buildBattleAttackContext(
    cs,
    id,
    e.targetId,
    isMeleeAttack,
    offHand.properties,
    e.attackerWithin5ft,
    e.hostileWithin5ft,
    e.targetCanSeeAttacker,
    e.attackerCanSeeTarget,
    e.frightSourceInLOS,
  );
  const mods = aggregateAttackMods(ctx);
  const hasAnyDisadvantageSource = hasAttackDisadvantageSource(ctx);
  return resolveAttack(
    cs,
    id,
    e.targetId,
    e.attackRoll,
    e.tAc,
    damage,
    offHand.damageType,
    offHand.damageQualifiers ?? new Set(),
    e.crit,
    attacker.critRange,
    ADR_ACTIVE_TURN,
    e.knockOut,
    isMeleeAttack,
    e.attackerWithin5ft,
    e.attackerWithin60ft ?? false,
    e.targetCanSeeAttacker,
    mods,
    false,
    undefined,
    offHand.properties,
    undefined,
    e.hasAllyAdjacentToTarget,
    hasAnyDisadvantageSource,
    e.saDmg,
    e.hitReactionCandidates,
  );
}

type SimpleActionType = "dash" | "disengage" | "dodge" | "ready";

function simpleAction(
  c: BattleContext,
  actionType: SimpleActionType,
  resource: "action" | "bonusAction" = "action",
): Partial<BattleContext> {
  if (!c.turnStarted) return {};
  const id = activeId(c);
  const ac = c.creatures.get(id)!;
  if (ac.dead || isIncapacitated(ac)) return {};
  if (resource === "action" && ac.actionsRemaining <= 0) return {};
  if (
    resource === "bonusAction" &&
    (ac.bonusActionUsed || !hasBattleBonusActionOption(ac, "disengage"))
  ) {
    return {};
  }
  return {
    creatures: setCreature(
      c.creatures,
      id,
      resource === "action"
        ? spendAction(ac, actionType)
        : spendBonusActionForAction(ac, "disengage"),
    ),
  };
}

export function battleDash({
  context: c,
}: BattleActionArgs<"BATTLE_DASH">): Partial<BattleContext> {
  return simpleAction(c, "dash");
}

export function battleDisengage({
  context: c,
}: BattleActionArgs<"BATTLE_DISENGAGE">): Partial<BattleContext> {
  return simpleAction(c, "disengage");
}

export function battleBonusDisengage({
  context: c,
}: BattleActionArgs<"BATTLE_BONUS_DISENGAGE">): Partial<BattleContext> {
  return simpleAction(c, "disengage", "bonusAction");
}

export function battleDodge({
  context: c,
}: BattleActionArgs<"BATTLE_DODGE">): Partial<BattleContext> {
  return simpleAction(c, "dodge");
}

export function battleActionSurge({
  context: c,
}: BattleActionArgs<"BATTLE_ACTION_SURGE">): Partial<BattleContext> {
  if (!c.turnStarted) return {};
  const id = activeId(c);
  const ac = c.creatures.get(id)!;
  if (
    isIncapacitated(ac) ||
    ac.actionSurgeCharges <= 0 ||
    ac.actionSurgeUsedThisTurn
  )
    return {};
  return {
    creatures: setCreature(c.creatures, id, {
      ...ac,
      actionsRemaining: ac.actionsRemaining + 1,
      actionSurgeActionPending: true,
      actionSurgeCharges: ac.actionSurgeCharges - 1,
      actionSurgeUsedThisTurn: true,
    }),
  };
}

export function battleEnterRage({
  context: c,
}: BattleActionArgs<"BATTLE_ENTER_RAGE">): Partial<BattleContext> {
  if (!c.turnStarted) return {};
  const id = activeId(c);
  const ac = c.creatures.get(id)!;
  if (
    ac.dead ||
    isIncapacitated(ac) ||
    ac.bonusActionUsed ||
    ac.ragingBlocksSpells ||
    ac.barbarianLevel <= 0 ||
    ac.rageCharges <= 0
  )
    return {};
  return {
    creatures: setCreature(c.creatures, id, {
      ...ac,
      bonusActionUsed: true,
      rageCharges: ac.rageCharges - 1,
      meleeDamageBonus: rageDamageBonus(ac.barbarianLevel),
      ragingBlocksSpells: true,
      combatantResistances: rageResistances(true),
    }),
  };
}

export function battleReady({
  context: c,
}: BattleActionArgs<"BATTLE_READY">): Partial<BattleContext> {
  return simpleAction(c, "ready");
}

/** Ready a spell: spend action + slot, start Concentration, store spell params. */
export function battleReadySpell({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_READY_SPELL">): Partial<BattleContext> {
  if (!c.turnStarted) return {};
  const id = activeId(c);
  const ac = c.creatures.get(id)!;
  if (ac.dead || isIncapacitated(ac) || ac.actionsRemaining <= 0) return {};
  if (
    ac.actionSurgeActionPending ||
    ac.ragingBlocksSpells ||
    ac.slotExpendedThisTurn
  )
    return {};
  if (ac.preparedSpells.size === 0) return {};
  const readyableDefinition = ac.readyableSpellPayloads.get(
    mkSpellId(e.spellName),
  );
  const readyablePayload =
    readyableDefinition == null
      ? null
      : getBattleReadyableSpellPayloadForSlots(
          e.spellName as SpellName,
          readyableDefinition.baseLevel,
          ac.slotsCurrent,
        );
  if (readyablePayload == null) return {};
  if (e.slotLvl !== readyablePayload.slotLevel) return {};
  if ((ac.slotsCurrent[e.slotLvl - 1] ?? 0) <= 0) return {};
  if (e.saveDC !== readyablePayload.release.saveDC) return {};
  if (e.dmgOnFail !== readyablePayload.release.damageOnFail) return {};
  if (e.halfOnSave !== readyablePayload.release.halfOnSuccess) return {};
  if (e.dt !== readyablePayload.release.damageType) return {};
  if (e.cond !== readyablePayload.release.conditionOnFail) return {};
  if (e.applyCond !== readyablePayload.release.applyCondition) return {};
  if (e.saveAbility !== readyablePayload.release.saveAbility) return {};
  if (!canProvideBattleSpellComponents(ac, e.spellName)) return {};
  const preparedCaster = prepareBattleCasterForSpell(ac, e.spellName);
  const afterAction = spendAction(preparedCaster, "ready");
  let cs = setCreature(
    c.creatures,
    id,
    battleExpendSlot(afterAction, e.slotLvl),
  );
  // Break existing concentration (must happen on full map for cross-creature propagation)
  cs = breakConcentrationAndPropagate(cs, id);
  // Start concentration + store params in one setCreature
  cs = setCreature(cs, id, {
    ...startConcentration(cs.get(id)!, mkSpellId(e.spellName)),
    readiedSpellParams: {
      caster: id,
      target: e.targetId,
      saveDC: e.saveDC,
      damageOnFail: e.dmgOnFail,
      halfOnSuccess: e.halfOnSave,
      damageType: e.dt,
      conditionOnFail: e.cond,
      applyCondition: e.applyCond,
      saveAbility: e.saveAbility,
      spellName: e.spellName,
      slotLvl: e.slotLvl,
    },
  });
  return { creatures: cs };
}

/** Ready window: release readied spell → Counterspell window → save resolution. */
export function battleReadySpellRelease({
  context: c,
  event: e,
}: BattleActionArgs<"BATTLE_READY_SPELL_RELEASE">): Partial<BattleContext> {
  const releaser = c.creatures.get(e.releaserId)!;
  const rsp = releaser.readiedSpellParams;
  if (!rsp) return {}; // no readied spell
  if (!canProvideBattleSpellComponents(releaser, rsp.spellName)) return {};
  const preparedReleaser = prepareBattleCasterForSpell(releaser, rsp.spellName);
  // Spend reaction, clear readiedAction and readiedSpellParams
  let cs = setCreature(c.creatures, e.releaserId, {
    ...preparedReleaser,
    reactionAvailable: false,
    readiedAction: false,
    readiedSpellParams: null,
  });
  // Break concentration (spell energy discharged)
  cs = breakConcentrationAndPropagate(cs, e.releaserId);
  const readyReturn = {
    tag: "ADRAwaitingReadiedAction" as const,
    ready: c.readyCtx!,
  };
  const saveCtx = {
    caster: rsp.caster,
    target: rsp.target,
    saveDC: rsp.saveDC,
    saveRoll: e.saveRoll,
    damageOnFail: rsp.damageOnFail,
    halfOnSuccess: rsp.halfOnSuccess,
    damageType: rsp.damageType,
    conditionOnFail: rsp.conditionOnFail,
    applyCondition: rsp.applyCondition,
    saveAbility: rsp.saveAbility,
  };
  const spellCtx = {
    caster: rsp.caster,
    spellName: rsp.spellName,
    postCast: { tag: "PCESave" as const, save: saveCtx },
    slotLvl: 0 as const, // slot already spent at ready time — 0 skips expenditure in resolveSpellEntry
    ritual: false,
  };
  const csElig = eligibleForCounterspell(cs, e.releaserId);
  if (csElig.size > 0) {
    return {
      creatures: cs,
      ...phaseAwaitReaction(
        mkAwait(
          { tag: "PISpellCast", ctx: spellCtx },
          "TSpellBeingCast",
          csElig,
        ),
      ),
    };
  }
  const result = resolveSave(cs, saveCtx, readyReturn);
  return { ...result };
}

export function battleDeclareReckless({
  context: c,
}: BattleActionArgs<"BATTLE_DECLARE_RECKLESS">): Partial<BattleContext> {
  if (!c.turnStarted) return {};
  const id = activeId(c);
  const ac = c.creatures.get(id)!;
  if (
    ac.dead ||
    isIncapacitated(ac) ||
    ac.actionsRemaining <= 0 ||
    ac.attackActionUsed ||
    ac.recklessThisTurn ||
    ac.barbarianLevel < 2
  )
    return {};
  return {
    creatures: setCreature(c.creatures, id, { ...ac, recklessThisTurn: true }),
  };
}
