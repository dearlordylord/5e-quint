// Build unit-queue.jsonl from SRD 5.2.1 + XPHB corpus.
//
// Emits one JSONL row per unit. The queue is an INDEX, not a text dump —
// rows reference source file + anchor / JSON key; workers load the
// actual text at runtime. This keeps PHB text out of main-repo files.
//
// Run from repo root:
//   pnpm --filter @dnd/prototype-content-surface exec tsx \
//     ../../scripts/content-surface-survey/unit-catalog.ts

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const refs = path.join(repoRoot, ".references");
const outPath = path.join(__dirname, "unit-queue.jsonl");

type UnitKind =
  | "spell"
  | "class_feature"
  | "feat"
  | "species_trait"
  | "mastery"
  | "magic_item"
  | "background";

// Source identifies the 5etools source code OR the SRD provenance class.
// Routing rule: `srd-5.2.1` → main repo; everything else → research repo
// (see worker.sh's source-based routing).
type Source =
  | "srd-5.2.1"
  | "xphb"
  | "tce"
  | "xge"
  | "phb"
  | "scc"
  | "bmt"
  | "egw"
  | "ftd"
  | "frhof"
  | "ai"
  | "aag"
  | "aitfr-avt"
  | "efa"
  | "ggr"
  | "idrotf"
  | "llk"
  | "sato";

type Tier = 0 | 1 | 2 | 3;

// Anchor discriminator. Workers use these to load the unit's source text
// at runtime — NO text embedded in the queue itself.
type Anchor =
  | { readonly kind: "srd_markdown"; readonly file: string; readonly heading: string }
  | {
      readonly kind: "fivetools_spell_json";
      readonly file: string;
      readonly spellName: string;
    }
  | { readonly kind: "hardcoded"; readonly note: string };

type QueueRow = {
  readonly slug: string;
  readonly name: string;
  readonly source: Source;
  readonly kind: UnitKind;
  readonly tier: Tier;
  readonly anchor: Anchor;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

// ------------------------------------------------------------
// Tier 0 — hand-picked for harness validation
// ------------------------------------------------------------
//
// Five SRD units covering the known scaling shape variety (cantrip tiers,
// class-level tiers both 2-tier and 10-tier, linear per level, pool-
// shaped healing, multi-axis scaling with extend-by-activity).

const tier0: ReadonlyArray<QueueRow> = [
  {
    slug: "fire_bolt",
    name: "Fire Bolt",
    source: "srd-5.2.1",
    kind: "spell",
    tier: 0,
    anchor: {
      kind: "fivetools_spell_json",
      file: ".references/5etools-src/data/spells/spells-xphb.json",
      spellName: "Fire Bolt",
    },
  },
  {
    slug: "rogue_sneak_attack",
    name: "Sneak Attack",
    source: "srd-5.2.1",
    kind: "class_feature",
    tier: 0,
    anchor: {
      kind: "srd_markdown",
      file: ".references/srd-5.2.1/Classes/Rogue.md",
      heading: "Sneak Attack",
    },
  },
  {
    slug: "monk_focus_points",
    name: "Focus Points",
    source: "srd-5.2.1",
    kind: "class_feature",
    tier: 0,
    anchor: {
      kind: "srd_markdown",
      file: ".references/srd-5.2.1/Classes/Monk.md",
      heading: "Monk's Focus",
    },
  },
  {
    slug: "paladin_lay_on_hands",
    name: "Lay On Hands",
    source: "srd-5.2.1",
    kind: "class_feature",
    tier: 0,
    anchor: {
      kind: "srd_markdown",
      file: ".references/srd-5.2.1/Classes/Paladin.md",
      heading: "Lay On Hands",
    },
  },
  {
    slug: "barbarian_rage",
    name: "Rage",
    source: "srd-5.2.1",
    kind: "class_feature",
    tier: 0,
    anchor: {
      kind: "srd_markdown",
      file: ".references/srd-5.2.1/Classes/Barbarian.md",
      heading: "Rage",
    },
  },
];

// ------------------------------------------------------------
// Tier 1 — strategic variety (~30)
// ------------------------------------------------------------
//
// Stocked manually: one representative per research-predicted shape
// variant, plus outliers. Additional Tier 1 rows can be added over
// time without disturbing the main corpus parsing.

const tier1Manual: ReadonlyArray<QueueRow> = [
  // Cantrip outliers and variants
  { slug: "eldritch_blast", name: "Eldritch Blast", source: "srd-5.2.1", kind: "spell", tier: 1,
    anchor: { kind: "fivetools_spell_json", file: ".references/5etools-src/data/spells/spells-xphb.json", spellName: "Eldritch Blast" } },
  { slug: "shillelagh", name: "Shillelagh", source: "srd-5.2.1", kind: "spell", tier: 1,
    anchor: { kind: "fivetools_spell_json", file: ".references/5etools-src/data/spells/spells-xphb.json", spellName: "Shillelagh" } },
  // Auto-hit / save / attack variety
  { slug: "magic_missile", name: "Magic Missile", source: "srd-5.2.1", kind: "spell", tier: 1,
    anchor: { kind: "fivetools_spell_json", file: ".references/5etools-src/data/spells/spells-xphb.json", spellName: "Magic Missile" } },
  { slug: "fireball", name: "Fireball", source: "srd-5.2.1", kind: "spell", tier: 1,
    anchor: { kind: "fivetools_spell_json", file: ".references/5etools-src/data/spells/spells-xphb.json", spellName: "Fireball" } },
  { slug: "shield", name: "Shield", source: "srd-5.2.1", kind: "spell", tier: 1,
    anchor: { kind: "fivetools_spell_json", file: ".references/5etools-src/data/spells/spells-xphb.json", spellName: "Shield" } },
  { slug: "counterspell", name: "Counterspell", source: "srd-5.2.1", kind: "spell", tier: 1,
    anchor: { kind: "fivetools_spell_json", file: ".references/5etools-src/data/spells/spells-xphb.json", spellName: "Counterspell" } },
  { slug: "hunters_mark", name: "Hunter's Mark", source: "srd-5.2.1", kind: "spell", tier: 1,
    anchor: { kind: "fivetools_spell_json", file: ".references/5etools-src/data/spells/spells-xphb.json", spellName: "Hunter's Mark" } },
  { slug: "alarm", name: "Alarm", source: "srd-5.2.1", kind: "spell", tier: 1,
    anchor: { kind: "fivetools_spell_json", file: ".references/5etools-src/data/spells/spells-xphb.json", spellName: "Alarm" } },
  { slug: "death_ward", name: "Death Ward", source: "srd-5.2.1", kind: "spell", tier: 1,
    anchor: { kind: "fivetools_spell_json", file: ".references/5etools-src/data/spells/spells-xphb.json", spellName: "Death Ward" } },
  { slug: "polymorph", name: "Polymorph", source: "srd-5.2.1", kind: "spell", tier: 1,
    anchor: { kind: "fivetools_spell_json", file: ".references/5etools-src/data/spells/spells-xphb.json", spellName: "Polymorph" } },
  { slug: "protection_from_energy", name: "Protection from Energy", source: "srd-5.2.1", kind: "spell", tier: 1,
    anchor: { kind: "fivetools_spell_json", file: ".references/5etools-src/data/spells/spells-xphb.json", spellName: "Protection from Energy" } },
  // Class features (variety of scaling axes)
  { slug: "fighter_action_surge", name: "Action Surge", source: "srd-5.2.1", kind: "class_feature", tier: 1,
    anchor: { kind: "srd_markdown", file: ".references/srd-5.2.1/Classes/Fighter.md", heading: "Action Surge" } },
  { slug: "fighter_second_wind", name: "Second Wind", source: "srd-5.2.1", kind: "class_feature", tier: 1,
    anchor: { kind: "srd_markdown", file: ".references/srd-5.2.1/Classes/Fighter.md", heading: "Second Wind" } },
  { slug: "fighter_extra_attack", name: "Extra Attack", source: "srd-5.2.1", kind: "class_feature", tier: 1,
    anchor: { kind: "srd_markdown", file: ".references/srd-5.2.1/Classes/Fighter.md", heading: "Extra Attack" } },
  { slug: "fighter_indomitable", name: "Indomitable", source: "srd-5.2.1", kind: "class_feature", tier: 1,
    anchor: { kind: "srd_markdown", file: ".references/srd-5.2.1/Classes/Fighter.md", heading: "Indomitable" } },
  { slug: "bard_bardic_inspiration", name: "Bardic Inspiration", source: "srd-5.2.1", kind: "class_feature", tier: 1,
    anchor: { kind: "srd_markdown", file: ".references/srd-5.2.1/Classes/Bard.md", heading: "Bardic Inspiration" } },
  { slug: "monk_martial_arts", name: "Martial Arts", source: "srd-5.2.1", kind: "class_feature", tier: 1,
    anchor: { kind: "srd_markdown", file: ".references/srd-5.2.1/Classes/Monk.md", heading: "Martial Arts" } },
  { slug: "cleric_channel_divinity", name: "Channel Divinity", source: "srd-5.2.1", kind: "class_feature", tier: 1,
    anchor: { kind: "srd_markdown", file: ".references/srd-5.2.1/Classes/Cleric.md", heading: "Channel Divinity" } },
  { slug: "cleric_divine_spark", name: "Divine Spark", source: "srd-5.2.1", kind: "class_feature", tier: 1,
    anchor: { kind: "srd_markdown", file: ".references/srd-5.2.1/Classes/Cleric.md", heading: "Divine Spark" } },
  // Species traits — Halfling Luck (simple trigger pattern)
  { slug: "halfling_luck", name: "Luck (Halfling)", source: "srd-5.2.1", kind: "species_trait", tier: 1,
    anchor: { kind: "srd_markdown", file: ".references/srd-5.2.1/Character-Origins.md", heading: "Halfling" } },
  // Masteries — mostly on-hit riders
  { slug: "mastery_sap", name: "Sap", source: "srd-5.2.1", kind: "mastery", tier: 1,
    anchor: { kind: "hardcoded", note: "SRD mastery; see UBIQUITOUS_LANGUAGE.md §Equipment" } },
  { slug: "mastery_topple", name: "Topple", source: "srd-5.2.1", kind: "mastery", tier: 1,
    anchor: { kind: "hardcoded", note: "SRD mastery; see UBIQUITOUS_LANGUAGE.md §Equipment" } },
  { slug: "mastery_cleave", name: "Cleave", source: "srd-5.2.1", kind: "mastery", tier: 1,
    anchor: { kind: "hardcoded", note: "SRD mastery; see UBIQUITOUS_LANGUAGE.md §Equipment" } },
];

// ------------------------------------------------------------
// Tier 2 — full SRD spell corpus from 5etools JSON
// ------------------------------------------------------------

type XphbSpell = {
  readonly name: string;
  readonly srd52?: boolean;
};

function loadXphbSpells(): ReadonlyArray<XphbSpell> {
  const p = path.join(refs, "5etools-src/data/spells/spells-xphb.json");
  const raw = fs.readFileSync(p, "utf8");
  const data = JSON.parse(raw) as { spell: XphbSpell[] };
  return data.spell;
}

function buildSpellTier2(spells: ReadonlyArray<XphbSpell>): ReadonlyArray<QueueRow> {
  const tier1Slugs = new Set(tier1Manual.filter((r) => r.kind === "spell").map((r) => r.slug));
  const tier0Slugs = new Set(tier0.filter((r) => r.kind === "spell").map((r) => r.slug));
  const rows: QueueRow[] = [];
  for (const sp of spells) {
    if (sp.srd52 !== true) continue;
    const slug = slugify(sp.name);
    if (tier0Slugs.has(slug) || tier1Slugs.has(slug)) continue;
    rows.push({
      slug,
      name: sp.name,
      source: "srd-5.2.1",
      kind: "spell",
      tier: 2,
      anchor: {
        kind: "fivetools_spell_json",
        file: ".references/5etools-src/data/spells/spells-xphb.json",
        spellName: sp.name,
      },
    });
  }
  return rows;
}

// ------------------------------------------------------------
// Tier 3 — PHB-extension and supplementary 5e spells (research only;
// never enter main repo). Walks every spells-*.json in
// .references/5etools-src/data/spells/, dedupes by slug, prefers XPHB
// over reprints, and falls back through TCE / XGE / PHB / others in
// priority order. Booming Blade and Green-Flame Blade live in TCE
// (and XGE before that) — neither is in XPHB, both belong here.
// ------------------------------------------------------------

type FivetoolsSpellRecord = {
  readonly name: string;
  readonly srd52?: boolean;
};

type FivetoolsSourceFile = {
  readonly source: Source;
  readonly file: string;
  readonly priority: number; // lower wins on slug collision
};

const FIVETOOLS_SOURCES: ReadonlyArray<FivetoolsSourceFile> = [
  // XPHB is the highest-priority 2024 reprint; non-srd52 XPHB rows are
  // PHB-only-2024 content (already produced by buildPhbTier3-equivalent below).
  { source: "xphb", file: "spells-xphb.json", priority: 0 },
  { source: "tce", file: "spells-tce.json", priority: 1 },
  { source: "xge", file: "spells-xge.json", priority: 2 },
  { source: "phb", file: "spells-phb.json", priority: 3 },
  { source: "scc", file: "spells-scc.json", priority: 4 },
  { source: "bmt", file: "spells-bmt.json", priority: 5 },
  { source: "egw", file: "spells-egw.json", priority: 6 },
  { source: "ftd", file: "spells-ftd.json", priority: 7 },
  { source: "frhof", file: "spells-frhof.json", priority: 8 },
  { source: "ai", file: "spells-ai.json", priority: 9 },
  { source: "aag", file: "spells-aag.json", priority: 10 },
  { source: "aitfr-avt", file: "spells-aitfr-avt.json", priority: 11 },
  { source: "efa", file: "spells-efa.json", priority: 12 },
  { source: "ggr", file: "spells-ggr.json", priority: 13 },
  { source: "idrotf", file: "spells-idrotf.json", priority: 14 },
  { source: "llk", file: "spells-llk.json", priority: 15 },
  { source: "sato", file: "spells-sato.json", priority: 16 },
];

function loadFivetoolsSpells(file: string): ReadonlyArray<FivetoolsSpellRecord> {
  const p = path.join(refs, "5etools-src/data/spells", file);
  if (!fs.existsSync(p)) return [];
  const raw = fs.readFileSync(p, "utf8");
  const data = JSON.parse(raw) as { spell: FivetoolsSpellRecord[] };
  return data.spell;
}

// Tier 3 — every non-SRD-5.2.1 5e spell from any 5etools source.
// Dedupes by slug; if multiple sources contain the same spell name,
// the lowest-priority (first declared) source wins. Slugs already
// taken by tier 0 / 1 / 2 are skipped (those carry SRD provenance).
function buildTier3FromAllSources(
  takenSrdSlugs: ReadonlySet<string>,
): ReadonlyArray<QueueRow> {
  const seen = new Map<string, QueueRow>();
  for (const srcFile of FIVETOOLS_SOURCES) {
    const spells = loadFivetoolsSpells(srcFile.file);
    for (const sp of spells) {
      // Skip srd52-flagged XPHB reprints — those go into the main-repo
      // tier 2 pool via buildSpellTier2(). All other rows are tier 3.
      if (srcFile.source === "xphb" && sp.srd52 === true) continue;
      const slug = slugify(sp.name);
      if (takenSrdSlugs.has(slug)) continue;
      if (seen.has(slug)) continue; // earlier (higher-priority) source wins
      seen.set(slug, {
        slug,
        name: sp.name,
        source: srcFile.source,
        kind: "spell",
        tier: 3,
        anchor: {
          kind: "fivetools_spell_json",
          file: `.references/5etools-src/data/spells/${srcFile.file}`,
          spellName: sp.name,
        },
      });
    }
  }
  return [...seen.values()];
}

// ------------------------------------------------------------
// Class features — parse ### Level N: ... headings in Classes/*.md
// ------------------------------------------------------------

const CLASS_FILES = [
  { className: "barbarian", file: ".references/srd-5.2.1/Classes/Barbarian.md" },
  { className: "bard", file: ".references/srd-5.2.1/Classes/Bard.md" },
  { className: "cleric", file: ".references/srd-5.2.1/Classes/Cleric.md" },
  { className: "druid", file: ".references/srd-5.2.1/Classes/Druid.md" },
  { className: "fighter", file: ".references/srd-5.2.1/Classes/Fighter.md" },
  { className: "monk", file: ".references/srd-5.2.1/Classes/Monk.md" },
  { className: "paladin", file: ".references/srd-5.2.1/Classes/Paladin.md" },
  { className: "ranger", file: ".references/srd-5.2.1/Classes/Ranger.md" },
  { className: "rogue", file: ".references/srd-5.2.1/Classes/Rogue.md" },
  { className: "sorcerer", file: ".references/srd-5.2.1/Classes/Sorcerer.md" },
  { className: "warlock", file: ".references/srd-5.2.1/Classes/Warlock.md" },
  { className: "wizard", file: ".references/srd-5.2.1/Classes/Wizard.md" },
] as const;

function parseClassFeatures(): ReadonlyArray<QueueRow> {
  const rows: QueueRow[] = [];
  for (const { className, file } of CLASS_FILES) {
    const content = fs.readFileSync(path.join(repoRoot, file), "utf8");
    const lines = content.split("\n");
    for (const line of lines) {
      const m = line.match(/^###\s+Level\s+(\d+):\s+(.+?)\s*$/);
      if (!m) continue;
      const level = Number(m[1]);
      const featureName = m[2] ?? "";
      if (!featureName) continue;
      const slug = `${className}_${slugify(featureName)}_l${level}`;
      rows.push({
        slug,
        name: `${featureName} (${className} L${level})`,
        source: "srd-5.2.1",
        kind: "class_feature",
        tier: 2,
        anchor: {
          kind: "srd_markdown",
          file,
          heading: `Level ${level}: ${featureName}`,
        },
      });
    }
  }
  return rows;
}

// ------------------------------------------------------------
// Feats — parse ### FeatName under feat-category ## headings.
// ------------------------------------------------------------

function parseFeats(): ReadonlyArray<QueueRow> {
  const file = ".references/srd-5.2.1/Feats.md";
  const content = fs.readFileSync(path.join(repoRoot, file), "utf8");
  const lines = content.split("\n");
  const rows: QueueRow[] = [];
  let inFeatCategory = false;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      const section = line.slice(3).trim();
      inFeatCategory =
        section.endsWith(" Feats") || section === "Feat Descriptions";
      // Only descent categories: Origin Feats, General Feats, Fighting
      // Style Feats, Epic Boon Feats. `Feat Descriptions` is the
      // umbrella. We accept both.
      continue;
    }
    if (!inFeatCategory) continue;
    const m = line.match(/^###\s+(.+?)\s*$/);
    if (!m) continue;
    const featName = m[1] ?? "";
    if (!featName || featName === "Parts of a Feat") continue;
    rows.push({
      slug: `feat_${slugify(featName)}`,
      name: featName,
      source: "srd-5.2.1",
      kind: "feat",
      tier: 2,
      anchor: {
        kind: "srd_markdown",
        file,
        heading: featName,
      },
    });
  }
  return rows;
}

// ------------------------------------------------------------
// Species traits — parse ***Trait Name.*** inline patterns per #### Species.
// ------------------------------------------------------------

function parseSpeciesTraits(): ReadonlyArray<QueueRow> {
  const file = ".references/srd-5.2.1/Character-Origins.md";
  const content = fs.readFileSync(path.join(repoRoot, file), "utf8");
  const lines = content.split("\n");
  const rows: QueueRow[] = [];
  let currentSpecies: string | null = null;
  // Known species headings at #### level. Other #### headings (like
  // "Ability Scores") are section preambles, not species.
  const KNOWN_SPECIES = new Set([
    "Aasimar", "Dragonborn", "Dwarf", "Elf", "Gnome", "Goliath",
    "Halfling", "Human", "Orc", "Tiefling",
  ]);
  for (const line of lines) {
    const headingMatch = line.match(/^####\s+(.+?)\s*$/);
    if (headingMatch) {
      const heading = headingMatch[1] ?? "";
      currentSpecies = KNOWN_SPECIES.has(heading) ? heading : null;
      continue;
    }
    if (!currentSpecies) continue;
    // Trait pattern: ***Trait Name.*** prose...
    const traitMatch = line.match(/^\*\*\*(.+?)\.\*\*\*/);
    if (!traitMatch) continue;
    const traitName = traitMatch[1] ?? "";
    if (!traitName) continue;
    rows.push({
      slug: `species_${slugify(currentSpecies)}_${slugify(traitName)}`,
      name: `${traitName} (${currentSpecies})`,
      source: "srd-5.2.1",
      kind: "species_trait",
      tier: 2,
      anchor: {
        kind: "srd_markdown",
        file,
        heading: currentSpecies,
      },
    });
  }
  return rows;
}

// ------------------------------------------------------------
// Masteries — 8 hardcoded; definitions in Rules-Glossary or Equipment.
// ------------------------------------------------------------

const MASTERY_NAMES = [
  "Cleave", "Graze", "Nick", "Push", "Sap", "Slow", "Topple", "Vex",
] as const;

function buildMasteries(): ReadonlyArray<QueueRow> {
  return MASTERY_NAMES.map((name) => ({
    slug: `mastery_${slugify(name)}`,
    name,
    source: "srd-5.2.1" as const,
    kind: "mastery" as const,
    tier: 2 as const,
    anchor: {
      kind: "hardcoded" as const,
      note: `SRD mastery '${name}' — see UBIQUITOUS_LANGUAGE.md §Equipment`,
    },
  }));
}

// ------------------------------------------------------------
// Backgrounds — parse #### BackgroundName entries under
// `### Background Descriptions` in Character-Origins.md.
// ------------------------------------------------------------

const KNOWN_BACKGROUNDS = new Set([
  "Acolyte",
  "Criminal",
  "Sage",
  "Soldier",
]);

function parseBackgrounds(): ReadonlyArray<QueueRow> {
  const file = ".references/srd-5.2.1/Character-Origins.md";
  const content = fs.readFileSync(path.join(repoRoot, file), "utf8");
  const lines = content.split("\n");
  const rows: QueueRow[] = [];
  let inBackgroundSection = false;
  for (const line of lines) {
    if (line.startsWith("### ")) {
      inBackgroundSection = line.includes("Background Descriptions");
      continue;
    }
    if (line.startsWith("## ")) {
      // Top-level section change closes the backgrounds block.
      inBackgroundSection = false;
      continue;
    }
    if (!inBackgroundSection) continue;
    const m = line.match(/^####\s+(.+?)\s*$/);
    if (!m) continue;
    const name = m[1] ?? "";
    if (!KNOWN_BACKGROUNDS.has(name)) continue;
    rows.push({
      slug: `background_${slugify(name)}`,
      name,
      source: "srd-5.2.1",
      kind: "background",
      tier: 2,
      anchor: {
        kind: "srd_markdown",
        file,
        heading: name,
      },
    });
  }
  return rows;
}

// ------------------------------------------------------------
// Magic items — parse ## ItemName headings in Magic-Items/Items-*.md
// ------------------------------------------------------------

const MAGIC_ITEM_FILES = [
  ".references/srd-5.2.1/Magic-Items/Items-A-H.md",
  ".references/srd-5.2.1/Magic-Items/Items-I-P.md",
  ".references/srd-5.2.1/Magic-Items/Items-Q-Z.md",
];

function parseMagicItems(): ReadonlyArray<QueueRow> {
  const rows: QueueRow[] = [];
  for (const file of MAGIC_ITEM_FILES) {
    const content = fs.readFileSync(path.join(repoRoot, file), "utf8");
    const lines = content.split("\n");
    for (const line of lines) {
      const m = line.match(/^##\s+(.+?)\s*$/);
      if (!m) continue;
      const itemName = m[1] ?? "";
      if (!itemName) continue;
      rows.push({
        slug: `magic_item_${slugify(itemName)}`,
        name: itemName,
        source: "srd-5.2.1",
        kind: "magic_item",
        tier: 2,
        anchor: {
          kind: "srd_markdown",
          file,
          heading: itemName,
        },
      });
    }
  }
  return rows;
}

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------

function dedupeAgainst(
  rows: ReadonlyArray<QueueRow>,
  taken: Set<string>,
): ReadonlyArray<QueueRow> {
  return rows.filter((r) => !taken.has(r.slug));
}

function main(): void {
  const spells = loadXphbSpells();
  const tier2Spells = buildSpellTier2(spells);
  // Slugs already claimed by tier 0/1/2 (all SRD-shipped); tier 3 must
  // not duplicate them — non-SRD reprints of SRD spells are skipped.
  const srdSpellSlugs = new Set<string>([
    ...tier0.filter((r) => r.kind === "spell").map((r) => r.slug),
    ...tier1Manual.filter((r) => r.kind === "spell").map((r) => r.slug),
    ...tier2Spells.map((r) => r.slug),
  ]);
  const tier3 = buildTier3FromAllSources(srdSpellSlugs);
  const classFeatures = parseClassFeatures();
  const feats = parseFeats();
  const speciesTraits = parseSpeciesTraits();
  const masteries = buildMasteries();
  const magicItems = parseMagicItems();
  const backgrounds = parseBackgrounds();

  const takenSlugs = new Set([
    ...tier0.map((r) => r.slug),
    ...tier1Manual.map((r) => r.slug),
  ]);

  const all: ReadonlyArray<QueueRow> = [
    ...tier0,
    ...tier1Manual,
    ...tier2Spells,
    ...dedupeAgainst(classFeatures, takenSlugs),
    ...dedupeAgainst(feats, takenSlugs),
    ...dedupeAgainst(speciesTraits, takenSlugs),
    ...dedupeAgainst(masteries, takenSlugs),
    ...dedupeAgainst(magicItems, takenSlugs),
    ...dedupeAgainst(backgrounds, takenSlugs),
    ...tier3,
  ];

  const lines = all.map((r) => JSON.stringify(r)).join("\n") + "\n";
  fs.writeFileSync(outPath, lines, "utf8");

  const counts = {
    tier0: tier0.length,
    tier1: tier1Manual.length,
    tier2_spells: tier2Spells.length,
    tier3_phb: tier3.length,
    total: all.length,
  };
  const byKind = all.reduce<Record<string, number>>((acc, r) => {
    acc[r.kind] = (acc[r.kind] ?? 0) + 1;
    return acc;
  }, {});
  const bySource = all.reduce<Record<string, number>>((acc, r) => {
    acc[r.source] = (acc[r.source] ?? 0) + 1;
    return acc;
  }, {});

  process.stdout.write(
    `wrote ${outPath}\ncounts: ${JSON.stringify(counts)}\nby kind: ${JSON.stringify(byKind)}\nby source: ${JSON.stringify(bySource)}\n`,
  );
}

main();
