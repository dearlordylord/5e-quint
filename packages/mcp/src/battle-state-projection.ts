import type { BattleCreatureState, BattleState } from "@dnd/battle-runtime";

export function battleStateProjection(state: BattleState) {
  return {
    battleId: state.battleId,
    initiative: state.initiative,
    combatants: Array.from(state.combatants.values()).map(
      battleCreatureStateProjection,
    ),
    currentTurnResources: state.currentTurnResources,
    readiedSpells: Array.from(
      state.readiedSpells,
      ([casterId, readiedSpell]) => ({
        casterId,
        ...readiedSpell,
      }),
    ),
  };
}

function battleCreatureStateProjection(combatant: BattleCreatureState) {
  return {
    combatantId: combatant.combatantId,
    displayName: combatant.displayName,
    initiative: combatant.initiative,
    hp: combatant.hp,
    maxHp: combatant.maxHp,
    tempHp: combatant.tempHp,
    armorClass: combatant.armorClass,
    activeEffects: combatant.activeEffects,
    concentration: combatant.concentration,
    origin:
      combatant.origin.kind === "character"
        ? {
            kind: "character" as const,
            characterId: combatant.origin.characterId,
            resources: combatant.origin.resources.map((resource) => ({
              unitId: resource.unit.id,
              usesRemaining: resource.usesRemaining,
              usedThisTurn: resource.usedThisTurn,
            })),
            spellcasting:
              combatant.origin.spellcasting === undefined
                ? undefined
                : {
                    spellSlots: combatant.origin.spellcasting.spellSlots,
                  },
          }
        : {
            kind: "statBlock" as const,
            statBlockId: combatant.origin.statBlock.id,
          },
    zeroHpLifecycle: combatant.zeroHpLifecycle,
  };
}
