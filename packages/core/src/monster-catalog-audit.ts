import {
  getMonsterStatBlock,
  MONSTER_STAT_BLOCK_IDS,
  statBlockProjectedBattleReadyableMonsterSpells,
  type MonsterStatBlockId,
} from "#/monster-catalog.ts";
import type {
  MonsterCatalogBlockerFamily,
  MonsterAction,
  MonsterBonusAction,
  MonsterLegendaryAction,
  MonsterReaction,
  MonsterTrait,
  StatBlock,
} from "#/monster-types.ts";

export const MONSTER_CATALOG_UNSUPPORTED_SECTIONS = [
  "traits",
  "actions",
  "bonusActions",
  "reactions",
  "legendaryActions",
] as const;

export type MonsterCatalogUnsupportedSection =
  (typeof MONSTER_CATALOG_UNSUPPORTED_SECTIONS)[number];

export interface UnsupportedMonsterCatalogAbility {
  readonly statBlockId: MonsterStatBlockId;
  readonly monsterName: string;
  readonly section: MonsterCatalogUnsupportedSection;
  readonly abilityId: string;
  readonly abilityName: string;
  readonly pattern: "textOnlyAbility" | "structuredSpellcasting";
  readonly blockerFamily: MonsterCatalogBlockerFamily;
  readonly srdCitation: StatBlock["provenance"]["provenance"]["citation"];
  readonly reason: string;
}

export interface MonsterCatalogBlockerFamilyCount {
  readonly blockerFamily: MonsterCatalogBlockerFamily;
  readonly count: number;
  readonly statBlockIds: ReadonlyArray<MonsterStatBlockId>;
}

export interface MonsterCatalogUnsupportedStatBlockCount {
  readonly statBlockId: MonsterStatBlockId;
  readonly monsterName: string;
  readonly count: number;
  readonly blockerFamilies: ReadonlyArray<{
    readonly blockerFamily: MonsterCatalogBlockerFamily;
    readonly count: number;
  }>;
}

export interface MonsterCatalogUnsupportedReport {
  readonly rows: ReadonlyArray<UnsupportedMonsterCatalogAbility>;
  readonly countsByBlockerFamily: ReadonlyArray<MonsterCatalogBlockerFamilyCount>;
  readonly countsByStatBlock: ReadonlyArray<MonsterCatalogUnsupportedStatBlockCount>;
  readonly markdown: string;
}

function sectionEntries(
  statBlockId: MonsterStatBlockId,
  section: MonsterCatalogUnsupportedSection,
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
        blockerFamily: ability.blockerFamily,
        srdCitation: statBlock.provenance.provenance.citation,
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
        blockerFamily: "spellReferenceGap",
        srdCitation: statBlock.provenance.provenance.citation,
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

function buildCountsByBlockerFamily(
  rows: ReadonlyArray<UnsupportedMonsterCatalogAbility>,
): ReadonlyArray<MonsterCatalogBlockerFamilyCount> {
  const counts = new Map<
    MonsterCatalogBlockerFamily,
    { count: number; statBlockIds: Set<MonsterStatBlockId> }
  >();
  for (const row of rows) {
    const existing = counts.get(row.blockerFamily) ?? {
      count: 0,
      statBlockIds: new Set<MonsterStatBlockId>(),
    };
    existing.count += 1;
    existing.statBlockIds.add(row.statBlockId);
    counts.set(row.blockerFamily, existing);
  }
  return [...counts.entries()]
    .map(([blockerFamily, value]) => ({
      blockerFamily,
      count: value.count,
      statBlockIds: [...value.statBlockIds].sort(),
    }))
    .sort(
      (a, b) =>
        b.count - a.count || a.blockerFamily.localeCompare(b.blockerFamily),
    );
}

function buildCountsByStatBlock(
  rows: ReadonlyArray<UnsupportedMonsterCatalogAbility>,
): ReadonlyArray<MonsterCatalogUnsupportedStatBlockCount> {
  const counts = new Map<
    MonsterStatBlockId,
    {
      monsterName: string;
      count: number;
      blockerFamilies: Map<MonsterCatalogBlockerFamily, number>;
    }
  >();
  for (const row of rows) {
    const existing = counts.get(row.statBlockId) ?? {
      monsterName: row.monsterName,
      count: 0,
      blockerFamilies: new Map<MonsterCatalogBlockerFamily, number>(),
    };
    existing.count += 1;
    existing.blockerFamilies.set(
      row.blockerFamily,
      (existing.blockerFamilies.get(row.blockerFamily) ?? 0) + 1,
    );
    counts.set(row.statBlockId, existing);
  }
  return [...counts.entries()]
    .map(([statBlockId, value]) => ({
      statBlockId,
      monsterName: value.monsterName,
      count: value.count,
      blockerFamilies: [...value.blockerFamilies.entries()]
        .map(([blockerFamily, count]) => ({ blockerFamily, count }))
        .sort(
          (a, b) =>
            b.count - a.count || a.blockerFamily.localeCompare(b.blockerFamily),
        ),
    }))
    .sort(
      (a, b) => b.count - a.count || a.monsterName.localeCompare(b.monsterName),
    );
}

function buildMarkdownReport(args: {
  readonly rows: ReadonlyArray<UnsupportedMonsterCatalogAbility>;
  readonly countsByBlockerFamily: ReadonlyArray<MonsterCatalogBlockerFamilyCount>;
  readonly countsByStatBlock: ReadonlyArray<MonsterCatalogUnsupportedStatBlockCount>;
}): string {
  const lines = [
    "# Monster Catalog Unsupported Pattern Report",
    "",
    `Rows: ${args.rows.length}`,
    `Stat blocks with blockers: ${args.countsByStatBlock.length}`,
    "",
    "## By blocker family",
    ...args.countsByBlockerFamily.map(
      (entry) =>
        `- ${entry.blockerFamily}: ${entry.count} rows across ${entry.statBlockIds.length} stat blocks (${entry.statBlockIds.join(", ")})`,
    ),
    "",
    "## By stat block",
    ...args.countsByStatBlock.map((entry) => {
      const familyBreakdown = entry.blockerFamilies
        .map((family) => `${family.blockerFamily} x${family.count}`)
        .join(", ");
      return `- ${entry.monsterName} (${entry.statBlockId}): ${entry.count} rows [${familyBreakdown}]`;
    }),
  ];
  return `${lines.join("\n")}\n`;
}

export const MONSTER_CATALOG_UNSUPPORTED_REPORT: MonsterCatalogUnsupportedReport =
  (() => {
    const rows = MONSTER_CATALOG_UNSUPPORTED_AUDIT;
    const countsByBlockerFamily = buildCountsByBlockerFamily(rows);
    const countsByStatBlock = buildCountsByStatBlock(rows);
    return {
      rows,
      countsByBlockerFamily,
      countsByStatBlock,
      markdown: buildMarkdownReport({
        rows,
        countsByBlockerFamily,
        countsByStatBlock,
      }),
    };
  })();
