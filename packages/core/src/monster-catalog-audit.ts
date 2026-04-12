import {
  getMonsterStatBlock,
  MONSTER_STAT_BLOCK_IDS,
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
      unsupported.push({
        statBlockId,
        monsterName: statBlock.name,
        section,
        abilityId: ability.id,
        abilityName: ability.name,
        pattern: "structuredSpellcasting",
        reason:
          "Spellcasting is cataloged structurally, but monster spell resolution still needs the generic spellcasting execution surface tracked by MCPA6.",
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
