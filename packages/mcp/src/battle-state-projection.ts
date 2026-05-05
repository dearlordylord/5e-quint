import {
  characterBattleResourceUsage,
  snapshotBattle,
} from "@dnd/battle-runtime";
import type { BattleCreatureState, BattleState } from "@dnd/battle-runtime";

export function battleStateProjection(state: BattleState) {
  const snapshot = snapshotBattle(state);
  const snapshotsById = new Map(
    snapshot.combatants.map((combatant) => [combatant.combatantId, combatant]),
  );
  return {
    battleId: state.battleId,
    initiative: state.initiative,
    combatants: Array.from(state.combatants.values()).map((combatant) =>
      battleCreatureStateProjection(
        combatant,
        snapshotsById.get(combatant.combatantId),
      ),
    ),
    currentTurnResources: state.currentTurnResources,
    pendingReaction: snapshot.pendingReaction,
    readiedSpells: Array.from(
      state.readiedSpells,
      ([casterId, readiedSpell]) => ({
        casterId,
        ...readiedSpell,
      }),
    ),
  };
}

function battleCreatureStateProjection(
  combatant: BattleCreatureState,
  snapshot: ReturnType<typeof snapshotBattle>["combatants"][number] | undefined,
) {
  return {
    combatantId: combatant.combatantId,
    displayName: combatant.displayName,
    initiative: combatant.initiative,
    side: combatant.side,
    hp: combatant.hp,
    maxHp: combatant.maxHp,
    tempHp: combatant.tempHp,
    reactionAvailable: combatant.reactionAvailable,
    movementSpentFeet: combatant.movementSpentFeet,
    hidden: combatant.hidden,
    armorClass: combatant.armorClass,
    activeEffects: combatant.activeEffects,
    activeOngoingFeatureOccurrences:
      snapshot?.activeOngoingFeatureOccurrences ?? [],
    positiveHpConditionRecovery: snapshot?.positiveHpConditionRecovery ?? null,
    concentration: combatant.concentration,
    size: combatant.size,
    hands: snapshot?.hands,
    grappling: snapshot?.grappling ?? [],
    grappledBy: snapshot?.grappledBy ?? null,
    origin:
      combatant.origin.kind === "character"
        ? {
            kind: "character" as const,
            characterId: combatant.origin.characterId,
            resources: combatant.origin.resources.map((resource) => {
              const usage = characterBattleResourceUsage(resource);
              return {
                unitId: resource.unit.id,
                usage,
                ...(usage === "limited" && "usesRemaining" in resource
                  ? { usesRemaining: resource.usesRemaining }
                  : {}),
                usedThisTurn: resource.usedThisTurn,
              };
            }),
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
