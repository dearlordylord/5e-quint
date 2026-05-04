import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SRD_SUBCLASSES } from "../packages/core/src/character-feature-types.ts";
import { SRD_SPELLS } from "../packages/core/src/features/spell-registry.ts";
import {
  CLASS_NAMES,
  type ClassName,
} from "../packages/shared/src/game-facts.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const outputPath = path.join(repoRoot, "character-creation-spell-data.qnt");
const spellcastingDataSourcePath = path.join(
  repoRoot,
  "packages/core/src/character-spellcasting-data.ts",
);

function normalizeSpellName(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function qntClassName(className: ClassName): string {
  switch (className) {
    case "barbarian":
      return "Barbarian";
    case "bard":
      return "Bard";
    case "cleric":
      return "Cleric";
    case "druid":
      return "Druid";
    case "fighter":
      return "Fighter";
    case "monk":
      return "Monk";
    case "paladin":
      return "Paladin";
    case "ranger":
      return "Ranger";
    case "rogue":
      return "Rogue";
    case "sorcerer":
      return "Sorcerer";
    case "warlock":
      return "Warlock";
    case "wizard":
      return "Wizard";
  }
}

function buildIfChain<T>(
  entries: ReadonlyArray<readonly [string, T]>,
  renderValue: (value: T) => string,
  fallback: string,
): string {
  if (entries.length === 0) return fallback;
  return entries
    .map(
      ([key, value], index) =>
        `${index === 0 ? "if" : "else if"} (spellId == "${key}") ${renderValue(value)}`,
    )
    .concat(`else ${fallback}`)
    .join("\n    ");
}

function buildClassLevelIfChain(
  values: ReadonlyMap<ClassName, ReadonlyArray<number>>,
): string {
  const lines: string[] = [];
  CLASS_NAMES.forEach((className, classIndex) => {
    const levelValues =
      values.get(className) ?? Array.from({ length: 20 }, () => 0);
    const levelExpr = levelValues
      .map(
        (value, index) =>
          `${index === 0 ? "if" : "else if"} (level == ${index + 1}) ${value}`,
      )
      .concat("else 0")
      .join("\n        ");
    lines.push(
      `${classIndex === 0 ? "if" : "else if"} (className == ${qntClassName(className)})\n        ${levelExpr}`,
    );
  });
  lines.push("else 0");
  return lines.join("\n    ");
}

function buildSubclassIfChain(): string {
  const lines = CLASS_NAMES.map((className, classIndex) => {
    const subclasses = SRD_SUBCLASSES[className];
    const expr =
      subclasses.length === 0
        ? "false"
        : subclasses
            .map(
              (subclass, subclassIndex) =>
                `${subclassIndex === 0 ? "subclass ==" : "or subclass =="} "${subclass}"`,
            )
            .join(" ");
    return `${classIndex === 0 ? "if" : "else if"} (className == ${qntClassName(className)}) ${expr}`;
  });

  lines.push("else false");
  return lines.join("\n    ");
}

async function loadSpellcastingCountTables(): Promise<{
  readonly fullCasterCantripCounts: Record<string, ReadonlyArray<number>>;
  readonly preparedSpellCounts: Record<string, ReadonlyArray<number>>;
}> {
  const source = await fs.readFile(spellcastingDataSourcePath, "utf8");
  const cantripMatch = source.match(
    /const FULL_CASTER_CANTRIP_COUNTS = (\{[\s\S]*?\}) as const;/,
  );
  const preparedMatch = source.match(
    /const PREPARED_SPELL_COUNTS = (\{[\s\S]*?\}) as const;/,
  );

  if (cantripMatch == null || preparedMatch == null) {
    throw new Error(
      "Failed to read spellcasting count tables from character-spellcasting-data.ts",
    );
  }

  return {
    fullCasterCantripCounts: Function(
      `return (${cantripMatch[1]})`,
    )() as Record<string, ReadonlyArray<number>>,
    preparedSpellCounts: Function(`return (${preparedMatch[1]})`)() as Record<
      string,
      ReadonlyArray<number>
    >,
  };
}

async function main(): Promise<void> {
  const { fullCasterCantripCounts, preparedSpellCounts } =
    await loadSpellcastingCountTables();
  const spellEntries = SRD_SPELLS.map((spell) => ({
    id: normalizeSpellName(spell.name),
    level: spell.level,
    classes: spell.classes.map((className) => qntClassName(className)),
  })).sort((a, b) => a.id.localeCompare(b.id));

  const baseCantripCounts = new Map<ClassName, ReadonlyArray<number>>(
    CLASS_NAMES.map((className) => [
      className,
      fullCasterCantripCounts[className] ?? Array.from({ length: 20 }, () => 0),
    ]),
  );

  const preparedCounts = new Map<ClassName, ReadonlyArray<number>>(
    CLASS_NAMES.map((className) => [
      className,
      preparedSpellCounts[className] ?? Array.from({ length: 20 }, () => 0),
    ]),
  );

  const maxSpellLevels = new Map<ClassName, ReadonlyArray<number>>(
    CLASS_NAMES.map((className) => [
      className,
      Array.from({ length: 20 }, (_, levelIndex) => {
        const level = levelIndex + 1;
        if (
          className === "bard" ||
          className === "cleric" ||
          className === "druid" ||
          className === "sorcerer" ||
          className === "wizard"
        ) {
          return Math.min(9, Math.floor((level + 1) / 2));
        }
        if (className === "paladin" || className === "ranger") {
          return level < 2 ? 0 : Math.min(5, Math.floor((level + 3) / 4));
        }
        if (className === "warlock") {
          return Math.min(5, Math.floor((level + 1) / 2));
        }
        return 0;
      }),
    ]),
  );

  const content = `// Auto-generated from packages/core/src/character-spellcasting-data.ts and packages/core/src/features/spell-registry.ts.
// Do not edit by hand; run \`pnpm exec tsx scripts/generate-character-creation-spell-data.ts\`.

module characterCreationSpellData {
  import creature.* from "./creature"

  pure def pBaseCantripChoiceCount(className: ClassName, level: int): int =
    ${buildClassLevelIfChain(baseCantripCounts)}

  pure def pPreparedSpellChoiceCount(className: ClassName, level: int): int =
    ${buildClassLevelIfChain(preparedCounts)}

  pure def pWizardSpellbookCount(level: int): int =
    if (level <= 0) 0 else ${Array.from(
      { length: 20 },
      (_, levelIndex) =>
        `${levelIndex === 0 ? "if" : "else if"} (level == ${levelIndex + 1}) ${6 + levelIndex * 2}`,
    )
      .concat("else 0")
      .join("\n    ")}

  pure def pMaxSpellLevelForClass(className: ClassName, level: int): int =
    ${buildClassLevelIfChain(maxSpellLevels)}

  pure def pValidSubclassSelection(className: ClassName, subclass: str): bool =
    ${buildSubclassIfChain()}

  pure def pSpellExists(spellId: str): bool =
    ${buildIfChain(
      spellEntries.map((spell) => [spell.id, true] as const),
      () => "true",
      "false",
    )}

  pure def pSpellLevel(spellId: str): int =
    ${buildIfChain(
      spellEntries.map((spell) => [spell.id, spell.level] as const),
      (value) => String(value),
      "99",
    )}

  pure def pSpellIsCantrip(spellId: str): bool =
    pSpellExists(spellId) and pSpellLevel(spellId) == 0

  pure def pSpellAvailableForClass(spellId: str, className: ClassName): bool =
    ${buildIfChain(
      spellEntries.map((spell) => [spell.id, spell.classes] as const),
      (classes) =>
        classes.map((className) => `className == ${className}`).join(" or "),
      "false",
    )}
}
`;

  await fs.writeFile(outputPath, content);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
