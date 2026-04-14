import {
  getMonsterStatBlock,
  MONSTER_STAT_BLOCK_IDS,
  statBlockProjectedBattleReadyableMonsterSpells,
  type MonsterStatBlockId,
} from "#/monster-catalog.ts";
import type {
  MonsterAction,
  MonsterBonusAction,
  MonsterLegendaryAction,
  MonsterReaction,
  MonsterTrait,
} from "#/monster-types.ts";

export interface UnsupportedMonsterCatalogAbility {
  readonly statBlockId: MonsterStatBlockId;
  readonly monsterName: string;
  readonly section:
    | "traits"
    | "actions"
    | "bonusActions"
    | "reactions"
    | "legendaryActions";
  readonly abilityId: string;
  readonly abilityName: string;
  readonly pattern: "textOnlyAbility" | "structuredSpellcasting";
  readonly reason: string;
}

function sectionEntries(
  statBlockId: MonsterStatBlockId,
  section:
    | "traits"
    | "actions"
    | "bonusActions"
    | "reactions"
    | "legendaryActions",
  abilities: ReadonlyArray<
    | MonsterTrait
    | MonsterAction
    | MonsterBonusAction
    | MonsterReaction
    | MonsterLegendaryAction
  >,
): ReadonlyArray<UnsupportedMonsterCatalogAbility> {
  const statBlock = getMonsterStatBlock(statBlockId);
  const unsupported: UnsupportedMonsterCatalogAbility[] = [];
  for (const ability of abilities) {
    if (ability.kind === "text") {
      unsupported.push({
        statBlockId,
        monsterName: statBlock.name,
        section,
        abilityId: ability.id,
        abilityName: ability.name,
        pattern: "textOnlyAbility",
        reason: ability.nonExecutableReason,
      });
      continue;
    }
    if (ability.kind === "spellcasting") {
      const projectedSpells =
        statBlockProjectedBattleReadyableMonsterSpells(statBlock);
      const unsupportedSpellIds = ability.spells
        .map((spell) => spell.spellId)
        .filter((spellId) => !projectedSpells.has(spellId));
      if (unsupportedSpellIds.length === 0) continue;
      unsupported.push({
        statBlockId,
        monsterName: statBlock.name,
        section,
        abilityId: ability.id,
        abilityName: ability.name,
        pattern: "structuredSpellcasting",
        reason:
          projectedSpells.size === 0
            ? "This spellcasting entry has no modeled spell references on the current generic battle spell surface."
            : `This spellcasting entry still includes unmodeled spell references outside the current generic battle spell surface: ${unsupportedSpellIds.join(", ")}.`,
      });
    }
  }
  return unsupported;
}

export const MONSTER_CATALOG_UNSUPPORTED_AUDIT = MONSTER_STAT_BLOCK_IDS.flatMap(
  (statBlockId) => {
    const statBlock = getMonsterStatBlock(statBlockId);
    return [
      ...sectionEntries(statBlockId, "traits", statBlock.traits),
      ...sectionEntries(statBlockId, "actions", statBlock.actions),
      ...sectionEntries(statBlockId, "bonusActions", statBlock.bonusActions),
      ...sectionEntries(statBlockId, "reactions", statBlock.reactions),
      ...sectionEntries(
        statBlockId,
        "legendaryActions",
        statBlock.legendaryActions,
      ),
    ];
  },
);
