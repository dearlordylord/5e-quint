const fs = require("node:fs");
const path = require("node:path");

const classDir = ".references/srd-5.2.1/Classes";
const classOrder = [
  "Barbarian",
  "Bard",
  "Cleric",
  "Druid",
  "Fighter",
  "Monk",
  "Paladin",
  "Ranger",
  "Rogue",
  "Sorcerer",
  "Warlock",
  "Wizard",
];

const nonRuntimeKinds = new Set(["class-narrative", "class-table-summary"]);

const exactSurfaceKinds = new Set([
  "class-container",
  "core-trait",
  "multiclass-entry",
  "class-feature-grant",
  "spell-access",
  "spell-unit-pressure",
  "equipment-pressure",
]);

const characterCreationEvidenceRequiredRowKinds = new Set([
  "class-feature-grant",
  "core-trait",
  "equipment-pressure",
  "mastery-pressure",
  "multiclass-entry",
  "spell-access",
]);

const classContainerOwnedCreationRowKinds = new Set([
  "core-trait",
  "equipment-pressure",
  "multiclass-entry",
]);

const deterministicAdmissionProjectionEvidenceTag =
  "deterministic-admission-projection";
const characterCreationOwnerEvidenceSchema =
  "dnd.srd-character-creation-owner-evidence.v1";
const characterCreationOwnerEvidenceKinds = [
  "discovery",
  "fill",
  "finalization",
  "buildProjection",
];

const ownerEvidenceRequired = new Map([
  [
    "srd521:classes/fighter:level-1:class-container:fighter_class_container",
    {
      owner: "Surface class container plus character-creation-runtime",
      requirement:
        "Class-container admission must not stand in for every class fact; keep using narrower trait, feature, equipment, mastery, and multiclass rows as the executable evidence boundary.",
    },
  ],
  [
    "srd521:classes/fighter:level-1:core-trait:fighter_primary_ability",
    {
      owner: "shared-algebras/multiclass-prerequisite-algebra",
      requirement:
        "Primary Ability is needed for multiclass prerequisite checks, but installed class records do not currently carry this source fact.",
    },
  ],
  [
    "srd521:classes/wizard:level-1:class-container:wizard_class_container",
    {
      owner: "Surface class container plus character-creation-runtime",
      requirement:
        "Class-container admission must not stand in for every class fact; keep using narrower trait, feature, spell-access, equipment, and multiclass rows as the executable evidence boundary.",
    },
  ],
  [
    "srd521:classes/wizard:level-1:core-trait:wizard_primary_ability",
    {
      owner: "shared-algebras/multiclass-prerequisite-algebra",
      requirement:
        "Primary Ability is needed for multiclass prerequisite checks, but installed class records do not currently carry this source fact.",
    },
  ],
  [
    "srd521:classes/wizard:level-1:class-feature-grant:wizard_ritual_adept",
    {
      owner: "future spell-access/invocation runtime",
      requirement:
        "Character creation retains the feature Unit reference, but ritual casting execution is not a promoted runtime owner yet.",
    },
  ],
]);

const catalogOnlyClosures = new Map([
  [
    "srd521:classes/wizard:level-1:class-feature-grant:wizard_arcane_recovery",
    {
      owner: "catalog-only/dead-for-now",
      reason:
        "Spell Slot recovery after a Short Rest belongs to a future character-sheet/rest runtime, not the current character-creation or battle-runtime boundary.",
    },
  ],
]);

const installedSpellUnitCatalogOnlyClosures = new Set([
  "detect_magic",
  "light",
]);

const spellAccessSurfaceBlockersByClass = {
  Bard: "ClassRecord spellcasting support for non-Wizard list-prepared casters: Bard cantrip choices, prepared Bard spells, Spell Slot projection, spellcasting ability, Musical Instrument focus, and level-up replacement timing",
  Cleric:
    "ClassRecord spellcasting support for non-Wizard list-prepared casters: Cleric cantrip choices, prepared Cleric spells, Spell Slot projection, spellcasting ability, Holy Symbol focus, and Long Rest prepared-spell replacement",
  Druid:
    "ClassRecord spellcasting support for non-Wizard list-prepared casters: Druid cantrip choices, prepared Druid spells, Spell Slot projection, spellcasting ability, Druidic Focus, and Long Rest prepared-spell replacement",
  Paladin:
    "ClassRecord spellcasting support for non-Wizard prepared casters without level-1 cantrips: Paladin prepared spells, Spell Slot projection, spellcasting ability, Holy Symbol focus, and Long Rest one-spell replacement",
  Ranger:
    "ClassRecord spellcasting support for non-Wizard prepared casters without level-1 cantrips: Ranger prepared spells, Spell Slot projection, spellcasting ability, Druidic Focus, and Long Rest one-spell replacement",
  Sorcerer:
    "ClassRecord spellcasting support for non-Wizard list-prepared casters with known cantrips: Sorcerer cantrip choices, prepared Sorcerer spells, Spell Slot projection, spellcasting ability, Arcane Focus, and level-up replacement timing",
};

const classContainerSurfaceBlockers = new Map([
  [
    "srd521:classes/bard:level-1:class-container:bard_class_container",
    "ClassRecord.toolProficiencies for Bard's Musical Instrument choice",
  ],
  [
    "srd521:classes/cleric:level-1:class-container:cleric_class_container",
    spellAccessSurfaceBlockersByClass.Cleric,
  ],
  [
    "srd521:classes/druid:level-1:class-container:druid_class_container",
    "ClassRecord.toolProficiencies for Druid's Herbalism Kit proficiency",
  ],
  [
    "srd521:classes/monk:level-1:class-container:monk_class_container",
    "ClassRecord.toolProficiencies plus property-filtered Martial weapon proficiencies for Monk",
  ],
  [
    "srd521:classes/paladin:level-1:class-container:paladin_class_container",
    spellAccessSurfaceBlockersByClass.Paladin,
  ],
  [
    "srd521:classes/ranger:level-1:class-container:ranger_class_container",
    "ClassRecord.multiclassProficiencies cannot combine fixed grants with Ranger's skill choice",
  ],
  [
    "srd521:classes/rogue:level-1:class-container:rogue_class_container",
    "ClassRecord.toolProficiencies plus property-filtered Martial weapon proficiencies for Rogue",
  ],
  [
    "srd521:classes/sorcerer:level-1:class-container:sorcerer_class_container",
    spellAccessSurfaceBlockersByClass.Sorcerer,
  ],
]);

const classFeatureSurfaceBlockers = new Map([
  [
    "srd521:classes/bard:level-1:class-feature-grant:bard_bardic_inspiration",
    "ClassFeature transferable timed Bardic Inspiration die with holder uniqueness, Charisma-modifier use-count floor, Bardic die tiers, and later failed D20 Test boost",
  ],
  [
    "srd521:classes/cleric:level-1:class-feature-grant:cleric_divine_order",
    "ClassFeature choice branches that grant alternate proficiencies, extra spell access, and ability-modifier-derived Ability Check bonuses with a minimum +1 floor",
  ],
  [
    "srd521:classes/druid:level-1:class-feature-grant:druid_druidic",
    "ClassFeature language knowledge grants plus always-prepared spell access and noncombat hidden-message capability",
  ],
  [
    "srd521:classes/druid:level-1:class-feature-grant:druid_primal_order",
    "ClassFeature choice branches that grant alternate proficiencies, extra spell access, and ability-modifier-derived Ability Check bonuses with a minimum +1 floor",
  ],
  [
    "srd521:classes/monk:level-1:class-feature-grant:monk_martial_arts",
    "ClassFeature Martial Arts combat package: Monk weapon predicate, Bonus Action Unarmed Strike, Martial Arts die replacement, Dexterity attack/damage substitution, and Unarmed Strike DC substitution",
  ],
  [
    "srd521:classes/ranger:level-1:class-feature-grant:ranger_favored_enemy",
    "ClassFeature spell access that grants Hunter's Mark as always prepared plus a level-scaling Long Rest casting pool without expending a Spell Slot",
  ],
  [
    "srd521:classes/rogue:level-1:class-feature-grant:rogue_expertise",
    "ClassFeature Expertise choice grants over already-proficient skills, including later additional Expertise choices",
  ],
  [
    "srd521:classes/rogue:level-1:class-feature-grant:rogue_thieves_cant",
    "ClassFeature character-sheet language ownership grants for fixed Thieves' Cant plus one player-chosen language from Character Creation language tables",
  ],
  [
    "srd521:classes/sorcerer:level-1:class-feature-grant:sorcerer_innate_sorcery",
    "ClassFeature timed self buff that scopes Spell Save DC increase and spell Attack Roll Advantage to Sorcerer spell invocations",
  ],
  [
    "srd521:classes/warlock:level-1:class-feature-grant:warlock_eldritch_invocations",
    "ClassFeature invocation choice grants with prerequisites, uniqueness, replacement rules, and invocation-count level progression",
  ],
  [
    "srd521:classes/warlock:level-1:class-feature-grant:warlock_pact_magic",
    "ClassFeature Pact Magic spell-access package: Warlock cantrip choices, prepared Warlock spells, Pact Slot projection, Short or Long Rest Pact Slot recovery, spellcasting ability, and Arcane Focus",
  ],
]);

const spellAccessSurfaceBlockers = new Map([
  [
    "srd521:classes/bard:level-1:spell-access:bard_spellcasting",
    spellAccessSurfaceBlockersByClass.Bard,
  ],
  [
    "srd521:classes/cleric:level-1:spell-access:cleric_spellcasting",
    spellAccessSurfaceBlockersByClass.Cleric,
  ],
  [
    "srd521:classes/druid:level-1:spell-access:druid_spellcasting",
    spellAccessSurfaceBlockersByClass.Druid,
  ],
  [
    "srd521:classes/paladin:level-1:spell-access:paladin_spellcasting",
    spellAccessSurfaceBlockersByClass.Paladin,
  ],
  [
    "srd521:classes/ranger:level-1:spell-access:ranger_spellcasting",
    spellAccessSurfaceBlockersByClass.Ranger,
  ],
  [
    "srd521:classes/sorcerer:level-1:spell-access:sorcerer_spellcasting",
    spellAccessSurfaceBlockersByClass.Sorcerer,
  ],
]);

const spellUnitMissingClassifications = new Map([
  [
    "command",
    {
      kind: "needs-surface-widening",
      missingConstruct:
        "Spell Definition command-option save outcomes: target-turn movement commands, forced item drop, Prone plus turn-ending, and slot-scaled additional targets",
    },
  ],
  [
    "create_or_destroy_water",
    {
      kind: "catalog-only-closure",
      reason:
        "Creation/destruction of water, rain extinguishing exposed flames, and fog removal are exploration/environment effects outside the current promoted character-creation and battle-runtime owners.",
    },
  ],
  [
    "detect_evil_and_good",
    {
      kind: "authoring-ready",
      nextAction:
        "Author an SRD-provenance Spell Definition record with existing Surface detect support for evil_and_good sensing; keep promoted runtime ownership for detection/occlusion as future exploration support.",
    },
  ],
  [
    "detect_poison_and_disease",
    {
      kind: "authoring-ready",
      nextAction:
        "Author an SRD-provenance Spell Definition record with existing Surface detect support for poison_and_disease sensing; keep promoted runtime ownership for detection/occlusion as future exploration support.",
    },
  ],
  [
    "disguise_self",
    {
      kind: "catalog-only-closure",
      reason:
        "Self-disguise appearance, physical-inspection failure, and Study action adjudication are social/exploration pressure outside the current promoted runtime owners.",
    },
  ],
  [
    "dissonant_whispers",
    {
      kind: "needs-surface-widening",
      missingConstruct:
        "Spell Definition failed-save forced Reaction movement using the safest route, including no-reaction fallback and half-damage success outcome",
    },
  ],
  [
    "druidcraft",
    {
      kind: "catalog-only-closure",
      reason:
        "Weather signs, harmless sensory effects, plant blossoming, and candle/torch/campfire narration are noncombat environmental effects outside promoted runtime owners.",
    },
  ],
  [
    "elementalism",
    {
      kind: "catalog-only-closure",
      reason:
        "Harmless elemental sensory changes, small water creation, surface marks, and crude shaping are noncombat environmental effects outside promoted runtime owners.",
    },
  ],
  [
    "expeditious_retreat",
    {
      kind: "needs-surface-widening",
      missingConstruct:
        "Spell Definition Dash grant: immediate Dash on Bonus Action casting plus ongoing Bonus Action Dash while Concentration lasts",
    },
  ],
  [
    "feather_fall",
    {
      kind: "needs-surface-widening",
      missingConstruct:
        "Spell Definition falling Reaction trigger, up-to-five falling creature targets, fall-rate cap, fall-damage prevention, and per-target early end on landing",
    },
  ],
  [
    "floating_disk",
    {
      kind: "catalog-only-closure",
      reason:
        "Created carrying disk, load capacity, terrain-following, and distance-based end behavior are object/exploration state outside promoted runtime owners.",
    },
  ],
  [
    "fog_cloud",
    {
      kind: "needs-surface-widening",
      missingConstruct:
        "Spell Definition slot-scaled area dimensions and strong-wind dispersal for a Heavily Obscured fog Sphere",
    },
  ],
  [
    "goodberry",
    {
      kind: "catalog-only-closure",
      reason:
        "Created consumable berries, nourishment, inventory persistence, and later Bonus Action consumption are item/character-sheet pressure outside current promoted runtime owners.",
    },
  ],
  [
    "hex",
    {
      kind: "needs-surface-widening",
      missingConstruct:
        "Spell Definition curse retargeting after the target drops to 0 Hit Points, ability-choice Ability Check Disadvantage, attack-hit bonus damage, and slot-scaled Concentration duration",
    },
  ],
  [
    "hideous_laughter",
    {
      kind: "needs-surface-widening",
      missingConstruct:
        "Spell Definition multi-trigger repeat saves with damage-triggered Advantage, Prone self-end suppression, and slot-scaled additional targets",
    },
  ],
  [
    "illusory_script",
    {
      kind: "catalog-only-closure",
      reason:
        "Authored writing illusion, designated readers, Truesight reading, and dispelled-script cleanup are document/exploration effects outside promoted runtime owners.",
    },
  ],
  [
    "jump",
    {
      kind: "needs-surface-widening",
      missingConstruct:
        "Spell Definition once-per-turn jump movement replacement, movement-spend requirement, and slot-scaled additional willing targets",
    },
  ],
  [
    "mage_hand",
    {
      kind: "catalog-only-closure",
      reason:
        "Remote hand creation, object manipulation, carry limit, repeated Magic action control, and distance/recast expiry are exploration object-control effects outside promoted runtime owners.",
    },
  ],
  [
    "mending",
    {
      kind: "catalog-only-closure",
      reason:
        "Object repair without restoring magic is equipment/exploration state outside promoted runtime owners.",
    },
  ],
  [
    "message",
    {
      kind: "catalog-only-closure",
      reason:
        "Private communication and barrier/silence blocking are exploration communication effects outside promoted runtime owners.",
    },
  ],
  [
    "prestidigitation",
    {
      kind: "catalog-only-closure",
      reason:
        "Minor sensory, cleaning, flavoring, marking, and trinket effects are noncombat utility effects outside promoted runtime owners.",
    },
  ],
  [
    "purify_food_and_drink",
    {
      kind: "catalog-only-closure",
      reason:
        "Removing poison and rot from nonmagical food and drink is exploration/inventory state outside promoted runtime owners.",
    },
  ],
  [
    "sanctuary",
    {
      kind: "needs-surface-widening",
      missingConstruct:
        "Spell Definition targeting interdiction for attack rolls and damaging spells, choose-new-target-or-lose outcome, area exclusion, and early end on warded attack/spell/damage",
    },
  ],
  [
    "shillelagh",
    {
      kind: "needs-surface-widening",
      missingConstruct:
        "Spell Definition held Club or Quarterstaff weapon override: spellcasting ability for attacks and damage, character-level damage die upgrade, Force-or-normal damage choice, and early end on recast or let-go",
    },
  ],
  [
    "sorcerous_burst",
    {
      kind: "needs-surface-widening",
      missingConstruct:
        "Spell Definition exploding d8 damage loop capped by spellcasting ability modifier, cast-time damage type choice, object target branch, and cantrip damage scaling",
    },
  ],
  [
    "spare_the_dying",
    {
      kind: "needs-surface-widening",
      missingConstruct:
        "Spell Definition Stable zero-HP lifecycle application plus character-level range scaling",
    },
  ],
  [
    "thaumaturgy",
    {
      kind: "catalog-only-closure",
      reason:
        "Minor wonders, voice-volume Advantage on Intimidation checks, unlocked-door/window movement, harmless tremors, and cosmetic effects are noncombat utility effects outside promoted runtime owners.",
    },
  ],
  [
    "unseen_servant",
    {
      kind: "catalog-only-closure",
      reason:
        "Created servant stat block, object-interaction commands, Bonus Action control, HP, and distance-based expiry are summoned helper/exploration state outside promoted runtime owners.",
    },
  ],
]);

function rowNeedsSurfaceWidening(row, ownerEvidenceSources, installedIds) {
  const installedClassification = installedOwnerClassification(
    row,
    ownerEvidenceSources,
    installedIds,
  );
  return (
    classContainerSurfaceBlockers.has(row.id) ||
    classFeatureSurfaceBlockers.has(row.id) ||
    spellAccessSurfaceBlockers.has(row.id) ||
    installedClassification?.kind === "needs-surface-widening" ||
    spellUnitMissingClassifications.get(row.candidateUnitId)?.kind ===
      "needs-surface-widening"
  );
}

function slug(text) {
  return text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function withoutTrailingPeriod(text) {
  return text.replace(/\.+$/, "");
}

function readLines(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8").split(/\r?\n/);
}

function sectionRange(lines, headingLine) {
  const heading = lines[headingLine - 1] ?? "";
  const depth = heading.match(/^(#+)\s/)?.[1].length ?? 1;
  let end = lines.length;
  for (let index = headingLine; index < lines.length; index += 1) {
    const match = lines[index].match(/^(#+)\s/);
    if (match && match[1].length <= depth) {
      end = index;
      break;
    }
  }
  return { startLine: headingLine, endLine: end };
}

function headingLine(lines, pattern) {
  const index = lines.findIndex((line) => pattern.test(line));
  return index === -1 ? undefined : index + 1;
}

function tableRows(lines, headingPattern) {
  const start = headingLine(lines, headingPattern);
  if (start === undefined) return [];
  const rows = [];
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index];
    if (index > start && /^#{1,6}\s/.test(line)) break;
    if (!line.startsWith("|")) continue;
    if (/^\|\s*-+/.test(line)) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length > 0) rows.push({ line: index + 1, cells });
  }
  return rows;
}

function firstLevelRow(lines, className) {
  const rows = tableRows(
    lines,
    new RegExp(`^### ${className} Features$|^## ${className} Features$`),
  );
  const header = rows[0]?.cells ?? [];
  const row = rows.find((entry) => entry.cells[0] === "1");
  return row ? { header, row } : undefined;
}

function levelOneFeatureHeadings(lines) {
  return lines
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter((entry) => /^### Level 1: /.test(entry.line))
    .map((entry) => ({
      name: entry.line.replace(/^### Level 1: /, "").trim(),
      lineNumber: entry.lineNumber,
    }));
}

function spellListEntries(lines, className, spellLevel) {
  const title =
    spellLevel === 0
      ? /^### Cantrips \(Level 0 .* Spells\)$/
      : new RegExp(`^### Level ${spellLevel} ${className} Spells$`);
  return tableRows(lines, title)
    .slice(1)
    .map((entry) => ({
      lineNumber: entry.line,
      name: entry.cells[0]?.replace(/\*/g, "") ?? "",
      spellLevel,
      school: entry.cells[1],
      special: entry.cells[2],
    }))
    .filter((entry) => entry.name.length > 0);
}

function findAuthored(root) {
  const contentDir = path.join(root, "packages/surface/content");
  return new Map(
    fs
      .readdirSync(contentDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => {
        const relativePath = `packages/surface/content/${entry.name}`;
        const record = JSON.parse(
          fs.readFileSync(path.join(root, relativePath), "utf8"),
        );
        return [
          record.id,
          {
            unitId: record.id,
            kind: record.kind,
            sourceRecordPath: relativePath,
            provenance: record.provenance,
            executableMechanics: Boolean(record.mechanics),
          },
        ];
      }),
  );
}

function sourceReference(sourcePath, startLine, endLine = startLine) {
  return {
    path: sourcePath,
    lineStart: startLine,
    lineEnd: endLine,
  };
}

function classifyFeature(name) {
  if (name === "Spellcasting") return "spell-access";
  if (name === "Weapon Mastery") return "mastery-pressure";
  return "class-feature";
}

function rowCategory(rowKind) {
  const categories = {
    "class-container": "class container",
    "class-narrative": "fluff/non-runtime text",
    "class-table-summary": "character-creation or progression mechanic",
    "core-trait": "character-creation or progression mechanic",
    "multiclass-entry": "character-creation or progression mechanic",
    "class-feature-grant": "class feature",
    "spell-access": "spell access/list pressure",
    "spell-unit-pressure": "spell Unit pressure",
    "equipment-pressure": "equipment/weapon/armor pressure",
    "mastery-pressure": "mastery pressure",
  };
  return categories[rowKind] ?? "unsupported/out of promoted scope";
}

function classContainerRowId(row) {
  return `srd521:classes/${slug(row.className)}:level-1:class-container:${slug(row.className)}_class_container`;
}

function characterCreationOwnership(row) {
  if (classContainerOwnedCreationRowKinds.has(row.rowKind)) {
    return {
      state: "class-container-owned-source-fact",
      owner: "Surface class container",
      evidenceBoundary:
        "Character-creation-runtime evidence is row-level only after the SRD class container is authored, installed, and exercised by a support profile.",
      classContainerRowId: classContainerRowId(row),
    };
  }
  if (row.rowKind === "class-table-summary") {
    return {
      state: "non-runtime-table-summary",
      owner: "not-applicable",
      evidenceBoundary:
        "The feature table summarizes level progression; narrower class trait, feature, spell-access, mastery, and equipment rows own executable evidence.",
    };
  }
  return undefined;
}

function surfaceGate(row, ownerEvidenceSources, installedIds) {
  const installedClassification = installedOwnerClassification(
    row,
    ownerEvidenceSources,
    installedIds,
  );
  if (installedClassification?.kind === "needs-surface-widening") {
    return {
      state: "current-surface-cannot-express-mechanics-yet",
      missingConstruct: installedClassification.missingConstruct,
    };
  }
  if (
    row.rowKind === "spell-unit-pressure" &&
    installedClassification?.kind === "catalog-only-closure"
  ) {
    return {
      state: "outside-surface-runtime-mechanics",
      missingConstruct: undefined,
    };
  }
  const spellUnitClassification = spellUnitMissingClassifications.get(
    row.candidateUnitId,
  );
  if (spellUnitClassification?.kind === "needs-surface-widening") {
    return {
      state: "current-surface-cannot-express-mechanics-yet",
      missingConstruct: spellUnitClassification.missingConstruct,
    };
  }
  if (spellUnitClassification?.kind === "catalog-only-closure") {
    return {
      state: "outside-surface-runtime-mechanics",
      missingConstruct: undefined,
    };
  }
  const classContainerBlocker = classContainerSurfaceBlockers.get(row.id);
  if (classContainerBlocker !== undefined) {
    return {
      state: "current-surface-cannot-express-mechanics-yet",
      missingConstruct: classContainerBlocker,
    };
  }
  const classFeatureBlocker = classFeatureSurfaceBlockers.get(row.id);
  if (classFeatureBlocker !== undefined) {
    return {
      state: "current-surface-cannot-express-mechanics-yet",
      missingConstruct: classFeatureBlocker,
    };
  }
  const spellAccessBlocker = spellAccessSurfaceBlockers.get(row.id);
  if (spellAccessBlocker !== undefined) {
    return {
      state: "current-surface-cannot-express-mechanics-yet",
      missingConstruct: spellAccessBlocker,
    };
  }
  if (nonRuntimeKinds.has(row.rowKind)) {
    return {
      state: "outside-surface-runtime-mechanics",
      missingConstruct: undefined,
    };
  }
  if (exactSurfaceKinds.has(row.rowKind)) {
    return {
      state: "current-surface-can-express-source-facts",
      missingConstruct: undefined,
    };
  }
  if (row.rowKind === "mastery-pressure") {
    return {
      state: "current-surface-can-express-source-facts",
      missingConstruct: undefined,
    };
  }
  return {
    state: "current-surface-cannot-express-mechanics-yet",
    missingConstruct: `missing ${row.rowKind} Surface construct`,
  };
}

function finalDisposition(row, authored, installedIds, ownerEvidenceSources) {
  if (nonRuntimeKinds.has(row.rowKind)) return "non-runtime";
  if (rowNeedsSurfaceWidening(row, ownerEvidenceSources, installedIds))
    return "needs-surface-widening";
  const spellUnitClassification = spellUnitMissingClassifications.get(
    row.candidateUnitId,
  );
  if (spellUnitClassification?.kind === "catalog-only-closure") {
    return "catalog-only/dead-for-now";
  }
  if (!row.candidateUnitId) return "needs-surface-widening";
  if (!authored.has(row.candidateUnitId)) return "missing-authored-record";
  if (!installedIds.has(row.candidateUnitId))
    return "catalog-only/dead-for-now";
  const installedClassification = installedOwnerClassification(
    row,
    ownerEvidenceSources,
    installedIds,
  );
  if (installedClassification?.kind === "evidence-present") {
    return "catalog-installed-owner-evidence-present";
  }
  if (installedClassification?.kind === "evidence-required") {
    return "catalog-installed-owner-evidence-required";
  }
  if (installedClassification?.kind === "catalog-only-closure") {
    return "catalog-only/dead-for-now";
  }
  return "catalog-installed-needs-owner-evidence";
}

function nextAction(row, disposition, gate, ownerEvidenceSources, installedIds) {
  const installedClassification = installedOwnerClassification(
    row,
    ownerEvidenceSources,
    installedIds,
  );
  if (disposition === "catalog-installed-owner-evidence-present") {
    return "Owner-specific operational evidence is classified and present.";
  }
  if (disposition === "catalog-installed-owner-evidence-required") {
    return installedClassification.requirement;
  }
  if (disposition === "catalog-installed-needs-owner-evidence") {
    return "Classify the operational owner and add owner-specific evidence, or explicitly close as catalog-only.";
  }
  if (
    disposition === "catalog-only/dead-for-now" &&
    installedClassification?.kind === "catalog-only-closure"
  )
    return installedClassification.reason;
  if (disposition === "non-runtime")
    return "No runtime work; keep classification as explicit closure.";
  if (disposition === "catalog-only/dead-for-now") {
    const spellUnitClassification = spellUnitMissingClassifications.get(
      row.candidateUnitId,
    );
    if (spellUnitClassification?.kind === "catalog-only-closure") {
      return spellUnitClassification.reason;
    }
    return "Decide whether to admit/support, or keep catalog-only closure counted.";
  }
  if (disposition === "missing-authored-record") {
    const spellUnitClassification = spellUnitMissingClassifications.get(
      row.candidateUnitId,
    );
    if (spellUnitClassification?.kind === "authoring-ready") {
      return spellUnitClassification.nextAction;
    }
    const ownership = characterCreationOwnership(row);
    if (ownership?.state === "class-container-owned-source-fact") {
      const classContainerBlocker = classContainerSurfaceBlockers.get(
        ownership.classContainerRowId,
      );
      if (classContainerBlocker !== undefined) {
        return `Do not author a standalone record for this character-creation fact; unblock the SRD class container by widening Surface: ${classContainerBlocker}.`;
      }
      return "Do not author a standalone record for this character-creation fact; author the SRD class container record and let row-level character-creation evidence come from runtime support-profile coverage.";
    }
    return "Author an SRD-provenance Surface record or explicitly close the row.";
  }
  if (disposition === "needs-surface-widening")
    return `Widen Surface: ${withoutTrailingPeriod(gate.missingConstruct)}.`;
  return "Classify owner-specific evidence before implementation.";
}

function installedOwnerClassification(row, ownerEvidenceSources, installedIds) {
  const spellUnitClassification = installedSpellUnitOwnerClassification(
    row,
    ownerEvidenceSources,
    installedIds,
  );
  if (spellUnitClassification !== undefined) return spellUnitClassification;
  return installedLevelOneOwnerClassification(row, ownerEvidenceSources);
}

function installedSpellUnitOwnerClassification(
  row,
  ownerEvidenceSources,
  installedIds,
) {
  if (
    row.rowKind !== "spell-unit-pressure" ||
    (row.levelBand !== "spell-level-0" && row.levelBand !== "spell-level-1") ||
    !row.candidateUnitId ||
    !installedIds?.has(row.candidateUnitId)
  ) {
    return undefined;
  }
  const battleRuntimeEvidence = ownerEvidenceSources.battleRuntime.get(
    row.candidateUnitId,
  );
  if (battleRuntimeEvidence) {
    return {
      kind: "evidence-present",
      owner: "battle-runtime spell invocation/projection",
      evidence: battleRuntimeEvidence,
    };
  }
  const claim = ownerEvidenceSources.unitClaims.get(row.candidateUnitId)?.claim;
  if (claim?.tag === "needs-surface-widening") {
    return {
      kind: "needs-surface-widening",
      owner: "Surface Spell Definition plus battle-runtime spell invocation/projection",
      missingConstruct: claim.issue,
    };
  }
  if (
    claim?.tag === "unsupported-profile" &&
    installedSpellUnitCatalogOnlyClosures.has(row.candidateUnitId)
  ) {
    return {
      kind: "catalog-only-closure",
      owner: "catalog-only/dead-for-now",
      reason: claim.reason,
    };
  }
  if (claim?.tag === "unsupported-profile") {
    return {
      kind: "evidence-required",
      owner: "battle-runtime spell invocation/projection",
      requirement: `Unit matrix records unsupported-profile: ${withoutTrailingPeriod(
        claim.reason,
      )}. Add runtime support and deterministic admission/projection evidence before treating this installed Spell Definition as operationally supported.`,
    };
  }
  return {
    kind: "evidence-required",
    owner: "battle-runtime spell invocation/projection",
    requirement:
      "Add a supported-profile Unit claim plus deterministic admission/projection evidence before treating this installed Spell Definition as operationally supported.",
  };
}

function installedLevelOneOwnerClassification(row, ownerEvidenceSources) {
  if (row.levelBand !== "level-1") return undefined;
  const battleRuntimeEvidence = row.candidateUnitId
    ? ownerEvidenceSources.battleRuntime.get(row.candidateUnitId)
    : undefined;
  if (battleRuntimeEvidence) {
    return {
      kind: "evidence-present",
      owner: "battle-runtime",
      evidence: battleRuntimeEvidence,
    };
  }
  const characterCreationEvidence = ownerEvidenceSources.characterCreation.get(
    row.id,
  );
  if (characterCreationEvidence) {
    return {
      kind: "evidence-present",
      owner: "character-creation-runtime",
      evidence: characterCreationEvidence,
    };
  }
  const required = ownerEvidenceRequired.get(row.id);
  if (required) {
    return {
      kind: "evidence-required",
      ...required,
    };
  }
  const closure = catalogOnlyClosures.get(row.id);
  if (closure) {
    return {
      kind: "catalog-only-closure",
      ...closure,
    };
  }
  if (row.rowKind === "class-container") {
    return {
      kind: "evidence-required",
      owner: "Surface class container plus character-creation-runtime",
      requirement:
        "Class-container admission must not stand in for every class fact; keep using narrower trait, feature, spell-access, equipment, mastery, and multiclass rows where applicable as executable evidence boundaries.",
    };
  }
  if (characterCreationEvidenceRequiredRowKinds.has(row.rowKind)) {
    return {
      kind: "evidence-required",
      owner: "character-creation-runtime",
      requirement:
        "Add a checker-readable character-creation owner-evidence artifact that maps this SRD inventory row to discovery, fill, finalization, and build projection coverage; until then, tests alone are not durable row-level evidence.",
    };
  }
  return undefined;
}

function makeRow(input) {
  return {
    id: `srd521:${input.sourcePath
      .replace(/^\.references\/srd-5\.2\.1\//, "")
      .replace(/\.md$/, "")
      .toLowerCase()}:${input.levelBand}:${input.rowKind}:${slug(input.concept)}`,
    source: sourceReference(input.sourcePath, input.lineStart, input.lineEnd),
    className: input.className,
    levelBand: input.levelBand,
    rowKind: input.rowKind,
    category: rowCategory(input.rowKind),
    concept: input.concept,
    detail: input.detail,
    candidateUnitId: input.candidateUnitId,
  };
}

function classRows(root, className) {
  const sourcePath = `${classDir}/${className}.md`;
  const lines = readLines(root, sourcePath);
  const classSlug = slug(className);
  const rows = [];
  const coreLine = headingLine(lines, /^## Core .* Traits$/);
  const becomingLine = headingLine(lines, /^## Becoming a /);
  const featureTable = firstLevelRow(lines, className);

  rows.push(
    makeRow({
      sourcePath,
      className,
      levelBand: "level-1",
      rowKind: "class-container",
      concept: `${className} class container`,
      detail:
        "SRD class identity, core traits, level-1 feature grants, and class progression entry.",
      lineStart: coreLine ?? 1,
      lineEnd: becomingLine
        ? sectionRange(lines, becomingLine).endLine
        : coreLine,
      candidateUnitId: `class_${classSlug}`,
    }),
  );

  for (const entry of tableRows(lines, /^## Core .* Traits$/).slice(1)) {
    const trait = entry.cells[0].replace(/\*/g, "");
    const rowKind =
      trait === "Starting Equipment" ? "equipment-pressure" : "core-trait";
    rows.push(
      makeRow({
        sourcePath,
        className,
        levelBand: "level-1",
        rowKind,
        concept: `${className} ${trait}`,
        detail: entry.cells[1],
        lineStart: entry.line,
        candidateUnitId: `class_${classSlug}`,
      }),
    );
  }

  const multiclassLine = headingLine(lines, /^### As a Multiclass Character$/);
  if (multiclassLine !== undefined) {
    rows.push(
      makeRow({
        sourcePath,
        className,
        levelBand: "level-1",
        rowKind: "multiclass-entry",
        concept: `${className} multiclass entry traits`,
        detail:
          "Multiclass entry grants listed under the class's level-1 onboarding section.",
        lineStart: multiclassLine,
        lineEnd: sectionRange(lines, multiclassLine).endLine,
        candidateUnitId: `class_${classSlug}`,
      }),
    );
  }

  if (featureTable) {
    rows.push(
      makeRow({
        sourcePath,
        className,
        levelBand: "level-1",
        rowKind: "class-table-summary",
        concept: `${className} level 1 feature table row`,
        detail: featureTable.row.cells.join(" | "),
        lineStart: featureTable.row.line,
        candidateUnitId: `class_${classSlug}`,
      }),
    );
  }

  for (const feature of levelOneFeatureHeadings(lines)) {
    const featureKind = classifyFeature(feature.name);
    const candidateUnitId =
      feature.name === "Spellcasting"
        ? `class_${classSlug}`
        : `${classSlug}_${slug(feature.name)}`;
    rows.push(
      makeRow({
        sourcePath,
        className,
        levelBand: "level-1",
        rowKind:
          featureKind === "class-feature" ? "class-feature-grant" : featureKind,
        concept: `${className} ${feature.name}`,
        detail: "Level 1 class feature.",
        lineStart: feature.lineNumber,
        lineEnd: sectionRange(lines, feature.lineNumber).endLine,
        candidateUnitId,
      }),
    );
  }

  for (const spell of [
    ...spellListEntries(lines, className, 0),
    ...spellListEntries(lines, className, 1),
  ]) {
    rows.push(
      makeRow({
        sourcePath,
        className,
        levelBand: spell.spellLevel === 0 ? "spell-level-0" : "spell-level-1",
        rowKind: "spell-unit-pressure",
        concept: `${className} spell list ${spell.name}`,
        detail: `${spell.name} (${spell.school}; ${spell.special})`,
        lineStart: spell.lineNumber,
        candidateUnitId: slug(spell.name),
      }),
    );
  }

  return rows;
}

function buildOwnerEvidenceSources({
  root,
  unitClaims,
  unitEvidence,
  characterCreationOwnerEvidence,
}) {
  const supportedSrdUnitIds = new Set(
    unitClaims
      .filter(
        (row) =>
          row.collectionId === "srd-5.2.1" &&
          row.claim?.tag === "supported-profile",
      )
      .map((row) => row.unitId),
  );
  const unitClaimsByUnitId = new Map(
    unitClaims
      .filter((row) => row.collectionId === "srd-5.2.1")
      .map((row) => [row.unitId, row]),
  );
  const deterministicEvidenceByUnitId = new Map();
  for (const row of unitEvidence) {
    if (row.evidence?.tag !== deterministicAdmissionProjectionEvidenceTag) {
      continue;
    }
    if (!supportedSrdUnitIds.has(row.unitId)) continue;
    deterministicEvidenceByUnitId.set(
      row.unitId,
      [
        "plans/unit-profile-coverage/unit-claims.jsonl records this SRD Unit as supported",
        `plans/unit-profile-coverage/unit-evidence.jsonl records ${deterministicAdmissionProjectionEvidenceTag} evidence`,
        `${row.evidence.taskId} at ${row.evidence.ownerPath}`,
      ].join("; "),
    );
  }
  return {
    battleRuntime: deterministicEvidenceByUnitId,
    unitClaims: unitClaimsByUnitId,
    characterCreation: buildCharacterCreationEvidenceSources(
      root,
      characterCreationOwnerEvidence,
    ),
  };
}

function buildCharacterCreationEvidenceSources(root, manifest) {
  if (
    manifest == null ||
    manifest.schema !== characterCreationOwnerEvidenceSchema
  ) {
    return new Map();
  }
  const rows = manifest.rows ?? {};
  if (!isRecord(rows)) {
    return new Map();
  }
  return new Map(
    Object.entries(rows)
      .filter(([, evidence]) =>
        hasCompleteCharacterCreationOwnerEvidence(evidence),
      )
      .filter(
        ([rowId, evidence]) =>
          characterCreationOwnerEvidenceReferenceIssues(root, rowId, evidence)
            .length === 0,
      )
      .map(([rowId, evidence]) => [
        rowId,
        [
          "plans/unit-profile-coverage/character-creation-owner-evidence.json records row-level discovery, fill, finalization, and build projection evidence",
          `${evidence.taskId} ${evidence.profile}`,
          evidence.summary,
        ].join("; "),
      ]),
  );
}

function hasCompleteCharacterCreationOwnerEvidence(evidence) {
  return (
    isRecord(evidence) &&
    characterCreationOwnerEvidenceKinds.every((kind) =>
      hasNonEmptyEvidenceList(evidence, kind),
    )
  );
}

function hasNonEmptyEvidenceList(evidence, kind) {
  return (
    isRecord(evidence) &&
    Array.isArray(evidence[kind]) &&
    evidence[kind].length > 0
  );
}

function summarizeCharacterCreationOwnerEvidence(root, manifest) {
  if (manifest == null) {
    return {
      schema: characterCreationOwnerEvidenceSchema,
      rowIds: [],
      issues: ["Character-creation owner evidence manifest is missing."],
    };
  }
  const issues = [];
  if (manifest.schema !== characterCreationOwnerEvidenceSchema) {
    issues.push(
      `Character-creation owner evidence manifest schema must be ${characterCreationOwnerEvidenceSchema}.`,
    );
  }
  if (manifest.owner !== "character-creation-runtime") {
    issues.push(
      "Character-creation owner evidence manifest owner must be character-creation-runtime.",
    );
  }
  const rows = manifest.rows ?? {};
  if (!isRecord(rows)) {
    issues.push(
      "Character-creation owner evidence manifest rows must be an object keyed by SRD inventory row id.",
    );
    return {
      schema: manifest.schema,
      rowIds: [],
      issues,
    };
  }
  for (const [rowId, evidence] of Object.entries(rows)) {
    if (!isRecord(evidence)) {
      issues.push(
        ...characterCreationOwnerEvidenceReferenceIssues(root, rowId, evidence),
      );
      continue;
    }
    if (!evidence.taskId) {
      issues.push(`${rowId} lacks taskId.`);
    }
    if (!evidence.profile) {
      issues.push(`${rowId} lacks profile.`);
    }
    if (!evidence.summary) {
      issues.push(`${rowId} lacks summary.`);
    }
    for (const kind of characterCreationOwnerEvidenceKinds) {
      if (!hasNonEmptyEvidenceList(evidence, kind)) {
        issues.push(`${rowId} lacks ${kind} evidence.`);
      }
    }
    issues.push(
      ...characterCreationOwnerEvidenceReferenceIssues(root, rowId, evidence),
    );
  }
  return {
    schema: manifest.schema,
    rowIds: Object.keys(rows).sort(),
    issues,
  };
}

function characterCreationOwnerEvidenceReferenceIssues(root, rowId, evidence) {
  const issues = [];
  if (!isRecord(evidence)) {
    return [`${rowId} manifest evidence must be an object.`];
  }
  for (const kind of characterCreationOwnerEvidenceKinds) {
    const references = evidence[kind];
    if (!Array.isArray(references)) continue;
    for (const reference of references) {
      issues.push(
        ...characterCreationOwnerEvidenceReferenceIssue(
          root,
          rowId,
          kind,
          reference,
        ),
      );
    }
  }
  return issues;
}

function characterCreationOwnerEvidenceReferenceIssue(
  root,
  rowId,
  kind,
  reference,
) {
  if (typeof reference !== "string" || reference.length === 0) {
    return [`${rowId} has non-string ${kind} evidence reference.`];
  }
  const separator = reference.lastIndexOf(":");
  if (separator === -1) {
    return [
      `${rowId} ${kind} evidence reference must be path:symbol: ${reference}`,
    ];
  }
  const relativePath = reference.slice(0, separator);
  const symbolPath = reference.slice(separator + 1);
  if (
    !relativePath.startsWith("packages/character-creation-runtime/src/") ||
    !relativePath.endsWith(".ts")
  ) {
    return [
      `${rowId} ${kind} evidence reference must point under packages/character-creation-runtime/src: ${reference}`,
    ];
  }
  if (!/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(symbolPath)) {
    return [
      `${rowId} ${kind} evidence reference has invalid symbol path: ${reference}`,
    ];
  }
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return [
      `${rowId} ${kind} evidence reference points to missing file: ${reference}`,
    ];
  }
  const content = fs.readFileSync(absolutePath, "utf8");
  const [symbolName, ...propertyPath] = symbolPath.split(".");
  const symbolPattern = new RegExp(
    `(?:^|\\n)\\s*(?:export\\s+)?(?:const|let|var|function|class|type|interface|enum)\\s+${escapeRegExp(symbolName)}\\b`,
  );
  if (!symbolPattern.test(content)) {
    return [
      `${rowId} ${kind} evidence reference points to missing symbol ${symbolName}: ${reference}`,
    ];
  }
  for (const propertyName of propertyPath) {
    const propertyPattern = new RegExp(
      `\\b${escapeRegExp(propertyName)}\\b\\s*:`,
    );
    if (!propertyPattern.test(content)) {
      return [
        `${rowId} ${kind} evidence reference points to missing property ${propertyName}: ${reference}`,
      ];
    }
  }
  return [];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isRecord(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function withState(rows, authored, installedIds, ownerEvidenceSources) {
  return rows.map((row) => {
    const authoredUnit = row.candidateUnitId
      ? authored.get(row.candidateUnitId)
      : undefined;
    const gate = surfaceGate(row, ownerEvidenceSources, installedIds);
    const disposition = finalDisposition(
      row,
      authored,
      installedIds,
      ownerEvidenceSources,
    );
    const catalogAdmission = row.candidateUnitId
      ? installedIds.has(row.candidateUnitId)
        ? { state: "installed", unitId: row.candidateUnitId }
        : { state: "not-installed", unitId: row.candidateUnitId }
      : { state: "not-applicable" };
    const installedClassification = installedOwnerClassification(
      row,
      ownerEvidenceSources,
      installedIds,
    );
    return {
      ...row,
      surface: gate,
      authoredContent: authoredUnit
        ? {
            state: "authored-record-present",
            unitId: authoredUnit.unitId,
            sourceRecordPath: authoredUnit.sourceRecordPath,
          }
        : { state: "missing-authored-record" },
      catalogAdmission,
      characterCreationOwnership: characterCreationOwnership(row),
      finalDisposition: disposition,
      ownerEvidence:
        catalogAdmission.state === "installed" &&
        (disposition === "catalog-installed-needs-owner-evidence" ||
          installedClassification !== undefined)
          ? [
              {
                owner: "Unit catalog/admission",
                evidence: `candidate Unit ${row.candidateUnitId} is installed in srdUnitCollection`,
                status:
                  installedClassification === undefined
                    ? "catalog-only evidence; operational owner evidence still required"
                    : "catalog evidence",
              },
              ...(installedClassification === undefined
                ? []
                : [ownerEvidenceEntry(installedClassification)]),
            ]
          : [],
      nextAction: nextAction(
        row,
        disposition,
        gate,
        ownerEvidenceSources,
        installedIds,
      ),
    };
  });
}

function ownerEvidenceEntry(classification) {
  if (classification.kind === "evidence-present") {
    return {
      owner: classification.owner,
      evidence: classification.evidence,
      status: "owner evidence present",
    };
  }
  if (classification.kind === "evidence-required") {
    return {
      owner: classification.owner,
      evidence: classification.requirement,
      status: "owner evidence required",
    };
  }
  if (classification.kind === "needs-surface-widening") {
    return {
      owner: classification.owner,
      evidence: classification.missingConstruct,
      status: "Surface widening required before owner evidence can be present",
    };
  }
  return {
    owner: classification.owner,
    evidence: classification.reason,
    status: "catalog-only/dead-for-now closure",
  };
}

function countBy(rows, key) {
  return rows.reduce((counts, row) => {
    const value = row[key];
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function countCharacterCreationOwnership(rows) {
  return rows
    .filter((row) => row.characterCreationOwnership !== undefined)
    .reduce((counts, row) => {
      const value = row.characterCreationOwnership.state;
      counts[value] = (counts[value] ?? 0) + 1;
      return counts;
    }, {});
}

function rowRefs(rows) {
  return rows.map((row) => row.id).sort();
}

function makeBatch({
  id,
  title,
  intent,
  rows,
  nextAction,
  acceptance,
  suggestedStatus = "ready-for-research",
}) {
  return {
    id,
    title,
    suggestedStatus,
    intent,
    rowCount: rows.length,
    rowIds: rowRefs(rows),
    nextAction,
    acceptance,
  };
}

function buildRecommendedBatches(rows) {
  const levelOne = rows.filter((row) => row.levelBand === "level-1");
  const spellPressure = rows.filter(
    (row) =>
      row.levelBand === "spell-level-0" || row.levelBand === "spell-level-1",
  );
  const missingClassContainers = levelOne.filter(
    (row) =>
      row.rowKind === "class-container" &&
      row.finalDisposition === "missing-authored-record",
  );
  const installedNeedsOwnerEvidence = levelOne.filter(
    (row) => row.finalDisposition === "catalog-installed-needs-owner-evidence",
  );
  const classifiedInstalledRows = levelOne.filter(
    (row) =>
      row.finalDisposition === "catalog-installed-owner-evidence-present" ||
      row.finalDisposition === "catalog-installed-owner-evidence-required" ||
      (row.finalDisposition === "catalog-only/dead-for-now" &&
        row.catalogAdmission.state === "installed"),
  );
  const missingClassFeatureRows = levelOne.filter(
    (row) =>
      row.rowKind === "class-feature-grant" &&
      row.finalDisposition === "missing-authored-record",
  );
  const missingCharacterCreationRows = levelOne.filter(
    (row) =>
      row.characterCreationOwnership !== undefined &&
      row.finalDisposition === "missing-authored-record",
  );
  const classifiedCharacterCreationRows = levelOne.filter(
    (row) => row.characterCreationOwnership !== undefined,
  );
  const missingSpellAccessRows = levelOne.filter(
    (row) =>
      row.rowKind === "spell-access" &&
      row.finalDisposition === "missing-authored-record",
  );
  const classifiedSpellAccessRows = levelOne.filter(
    (row) => row.rowKind === "spell-access",
  );
  const missingSpellUnitPressureRows = spellPressure.filter(
    (row) => row.finalDisposition === "missing-authored-record",
  );
  const unclassifiedInstalledSpellUnitPressureRows = spellPressure.filter(
    (row) => row.finalDisposition === "catalog-installed-needs-owner-evidence",
  );
  const classifiedInstalledSpellUnitPressureRows = spellPressure.filter(
    (row) =>
      row.catalogAdmission.state === "installed" &&
      row.authoredContent.state === "authored-record-present",
  );
  const catalogOnlySpellUnitPressureRows = spellPressure.filter(
    (row) => row.finalDisposition === "catalog-only/dead-for-now",
  );
  const catalogOnlyRows = rows.filter(
    (row) =>
      row.finalDisposition === "catalog-only/dead-for-now" &&
      row.levelBand !== "spell-level-0" &&
      row.levelBand !== "spell-level-1",
  );
  const surfaceWideningRows = rows.filter(
    (row) => row.finalDisposition === "needs-surface-widening",
  );

  return [
    makeBatch({
      id: "SRDINV1",
      title: "Classify Installed Level-1 Owner Evidence",
      intent:
        "Stop treating installed level-1 rows as done by catalog load alone; assign operational owner expectations or explicit catalog-only closure.",
      rows:
        installedNeedsOwnerEvidence.length === 0
          ? classifiedInstalledRows
          : installedNeedsOwnerEvidence,
      nextAction:
        installedNeedsOwnerEvidence.length === 0
          ? "Installed level-1 rows have owner-specific classifications; keep evidence-required and catalog-only closures visible in later planning."
          : "For each installed level-1 row, classify the operational owner and evidence requirement, then update generated state names if needed.",
      acceptance:
        "Installed level-1 rows no longer imply support from catalog admission alone; report distinguishes catalog evidence from operational owner evidence.",
    }),
    makeBatch({
      id: "SRDINV2",
      title: "Author Missing Level-1 Class Containers",
      suggestedStatus: "blocked-on-SRDINV1",
      intent:
        "Create or explicitly close the ten missing SRD level-1 class container records.",
      rows: missingClassContainers,
      nextAction:
        "Add SRD-provenance class container records where Surface already expresses the facts, or record explicit closure for any deferred container.",
      acceptance:
        "Missing class container count reaches zero or each remaining row has explicit closure; no PHB/private content enters this pass.",
    }),
    makeBatch({
      id: "SRDINV3",
      title: "Classify Missing Level-1 Class Feature Rows",
      suggestedStatus: "blocked-on-SRDINV1",
      intent:
        "Decide which missing level-1 class feature rows need authored content, Surface widening, non-runtime closure, or later runtime work.",
      rows: missingClassFeatureRows,
      nextAction:
        "Review feature rows by mechanics family and produce the next small authoring or Surface-widening batch.",
      acceptance:
        "Every missing level-1 class feature row has a sharper next action than generic author-or-close wording.",
    }),
    makeBatch({
      id: "SRDINV4",
      title: "Classify Level-1 Character Creation Rows",
      suggestedStatus: "blocked-on-SRDINV1",
      intent:
        "Separate class-container-owned creation/progression facts from rows that require standalone authored records.",
      rows:
        missingCharacterCreationRows.length === 0
          ? classifiedCharacterCreationRows
          : missingCharacterCreationRows,
      nextAction:
        missingCharacterCreationRows.length === 0
          ? "Level-1 hit dice, proficiencies, equipment, multiclass, and table-summary rows have class-container ownership or non-runtime closure classifications."
          : "For each missing class-container-owned creation row, unblock or author the SRD class container instead of creating standalone records.",
      acceptance:
        "Character-creation rows distinguish class-container ownership from missing standalone records.",
    }),
    makeBatch({
      id: "SRDINV5A",
      title: "Classify Level-1 Spell Access Rows",
      suggestedStatus: "blocked-on-SRDINV1",
      intent:
        "Keep class spell access/list facts separate from individual Spell Unit support.",
      rows:
        missingSpellAccessRows.length === 0
          ? classifiedSpellAccessRows
          : missingSpellAccessRows,
      nextAction:
        missingSpellAccessRows.length === 0
          ? "Level-1 class Spellcasting/access rows have owner-specific classifications; keep Surface-widening blockers separate from individual Spell Unit pressure."
          : "Classify missing class Spellcasting/access rows by class-container ownership, Surface widening, authored content, or closure.",
      acceptance:
        "Level-1 spell access rows have owner-specific next actions and are not mixed with individual Spell Unit pressure.",
    }),
    makeBatch({
      id: "SRDINV5B",
      title: "Classify Missing Cantrip and Level-1 Spell Units",
      suggestedStatus: "blocked-on-SRDINV1",
      intent:
        "Classify missing SRD cantrip and level-1 Spell Unit records without loading the whole spell-pressure backlog into one task.",
      rows: missingSpellUnitPressureRows,
      nextAction:
        "Group missing Spell Unit rows by authoring readiness, Surface blockers, and runtime-support pressure.",
      acceptance:
        "Missing cantrip and level-1 Spell Unit pressure rows have sharper next actions than generic author-or-close wording.",
    }),
    makeBatch({
      id: "SRDINV5C",
      title: "Classify Installed Cantrip and Level-1 Spell Units",
      suggestedStatus: "blocked-on-SRDINV1",
      intent:
        "Classify installed SRD cantrip and level-1 Spell Unit owner evidence separately from missing and catalog-only spell rows.",
      rows:
        unclassifiedInstalledSpellUnitPressureRows.length === 0
          ? classifiedInstalledSpellUnitPressureRows
          : unclassifiedInstalledSpellUnitPressureRows,
      nextAction:
        unclassifiedInstalledSpellUnitPressureRows.length === 0
          ? "Installed Spell Unit pressure rows are classified by catalog admission, spell access, invocation/projection evidence, runtime-support requirements, Surface blockers, or catalog-only closure."
          : "For each installed Spell Unit pressure row, classify whether catalog/access/invocation/projection evidence is required or whether the row closes as catalog-only.",
      acceptance:
        "Installed cantrip and level-1 Spell Unit rows distinguish catalog evidence from operational owner evidence.",
    }),
    makeBatch({
      id: "SRDINV5D",
      title: "Review Catalog-Only Cantrip and Level-1 Spell Units",
      suggestedStatus: "blocked-on-SRDINV1",
      intent:
        "Keep catalog-only spell pressure explicit and counted without forcing unrelated class or nonspell rows into the same task.",
      rows: catalogOnlySpellUnitPressureRows,
      nextAction:
        "Confirm catalog-only/dead-for-now closure or promote named follow-up batches for any spell rows that should become executable.",
      acceptance:
        "Catalog-only cantrip and level-1 Spell Unit rows remain counted deliberately, or become explicit follow-up work.",
    }),
    makeBatch({
      id: "SRDINV6",
      title: "Review Catalog-Only and Surface-Widening Rows",
      suggestedStatus: "blocked-on-SRDINV1",
      intent:
        "Preserve catalog-only/dead-for-now rows and name missing Surface constructs for nonspell and spell Surface-widening blockers.",
      rows: [...catalogOnlyRows, ...surfaceWideningRows],
      nextAction:
        "Either keep catalog-only rows explicitly catalog-only/dead-for-now or promote a named Surface-widening task for each blocker, including spell Surface pressure.",
      acceptance:
        "Catalog-only rows are counted deliberately, and every nonspell or spell Surface-widening row names the missing construct.",
    }),
    makeBatch({
      id: "SRDINV7",
      title: "Recursive SRD Inventory Planning Review",
      suggestedStatus: "blocked-on-SRDINV2-SRDINV5D-and-SRDINV6",
      intent:
        "Review SRDINV1-SRDINV6 findings and append the next concrete generated batch set.",
      rows: levelOne,
      nextAction:
        "Refresh metrics, decide whether level-1 can advance to authoring/support batches, and append at least three concrete next tasks unless level-1 is explicitly complete.",
      acceptance:
        "The SRD inventory lane remains measurable and has a concrete multi-task next batch, or level-1 is explicitly closed with final metrics; do not append a recursive-only continuation.",
    }),
  ];
}

function buildSrdUnitInventory({
  root,
  inventory,
  unitClaims = [],
  unitEvidence = [],
  characterCreationOwnerEvidence,
}) {
  const authored = findAuthored(root);
  const installedIds = new Set(
    inventory
      .filter((unit) => unit.collectionId === "srd-5.2.1")
      .map((unit) => unit.unitId),
  );
  const ownerEvidenceSources = buildOwnerEvidenceSources({
    root,
    unitClaims,
    unitEvidence,
    characterCreationOwnerEvidence,
  });
  const rows = withState(
    classOrder.flatMap((className) => classRows(root, className)),
    authored,
    installedIds,
    ownerEvidenceSources,
  ).sort((a, b) => a.id.localeCompare(b.id));
  const levelOneRows = rows.filter((row) => row.levelBand === "level-1");
  const spellPressureRows = rows.filter(
    (row) =>
      row.levelBand === "spell-level-0" || row.levelBand === "spell-level-1",
  );
  return {
    generatedBy: "scripts/unit-profile-coverage-check.cjs",
    sourceCorpus: ".references/srd-5.2.1/Classes",
    scope:
      "SRD 5.2.1 class-derived Unit/catalog backlog rows, prioritized around level 1 plus level-1 spell-list pressure.",
    evidenceArtifacts: {
      characterCreationOwnerEvidence: summarizeCharacterCreationOwnerEvidence(
        root,
        characterCreationOwnerEvidence,
      ),
    },
    metrics: {
      totalRows: rows.length,
      levelOneRows: levelOneRows.length,
      spellPressureRows: spellPressureRows.length,
      levelOneClassContainers: levelOneRows.filter(
        (row) => row.rowKind === "class-container",
      ).length,
      levelOneRowsByDisposition: countBy(levelOneRows, "finalDisposition"),
      allRowsByDisposition: countBy(rows, "finalDisposition"),
      spellPressureRowsByDisposition: countBy(
        spellPressureRows,
        "finalDisposition",
      ),
      levelOneRowsByCategory: countBy(levelOneRows, "category"),
      levelOneCharacterCreationOwnership:
        countCharacterCreationOwnership(levelOneRows),
      missingClassContainers: levelOneRows.filter(
        (row) =>
          row.rowKind === "class-container" &&
          row.finalDisposition === "missing-authored-record",
      ).length,
    },
    recommendedBatches: buildRecommendedBatches(rows),
    rows,
  };
}

function validateSrdUnitInventory(report) {
  const issues = [];
  const seen = new Set();
  for (const row of report.rows) {
    if (seen.has(row.id))
      issues.push(`Duplicate SRD inventory row id ${row.id}.`);
    seen.add(row.id);
    if (!row.category) issues.push(`${row.id} is unclassified.`);
    if (!row.finalDisposition) issues.push(`${row.id} lacks finalDisposition.`);
    if (
      row.finalDisposition === "needs-surface-widening" &&
      !row.surface.missingConstruct
    ) {
      issues.push(
        `${row.id} needs Surface widening but lacks missingConstruct.`,
      );
    }
    if (
      row.finalDisposition === "catalog-installed-needs-owner-evidence" &&
      row.ownerEvidence.length === 0
    ) {
      issues.push(`${row.id} is installed but lacks catalog evidence.`);
    }
    if (
      row.finalDisposition === "catalog-installed-owner-evidence-present" &&
      !row.ownerEvidence.some(
        (evidence) => evidence.status === "owner evidence present",
      )
    ) {
      issues.push(
        `${row.id} is classified as owner-evidence-present but lacks owner evidence.`,
      );
    }
    if (
      row.finalDisposition === "catalog-installed-owner-evidence-required" &&
      !row.ownerEvidence.some(
        (evidence) => evidence.status === "owner evidence required",
      )
    ) {
      issues.push(
        `${row.id} is classified as owner-evidence-required but lacks owner requirement.`,
      );
    }
    if (
      row.levelBand === "level-1" &&
      row.finalDisposition === "catalog-installed-needs-owner-evidence"
    ) {
      issues.push(
        `${row.id} is an installed level-1 row with generic owner evidence.`,
      );
    }
  }
  const characterCreationArtifact =
    report.evidenceArtifacts?.characterCreationOwnerEvidence;
  if (characterCreationArtifact) {
    issues.push(...characterCreationArtifact.issues);
    for (const rowId of characterCreationArtifact.rowIds) {
      if (!seen.has(rowId)) {
        issues.push(
          `Character-creation owner evidence references unknown SRD inventory row id ${rowId}.`,
        );
      }
    }
  }
  for (const rowId of [
    ...classFeatureSurfaceBlockers.keys(),
    ...spellAccessSurfaceBlockers.keys(),
  ]) {
    const row = report.rows.find((candidate) => candidate.id === rowId);
    if (row === undefined) {
      issues.push(`Surface blocker references unknown row ${rowId}.`);
      continue;
    }
    if (row.finalDisposition !== "needs-surface-widening") {
      issues.push(
        `Surface blocker ${rowId} must classify as needs-surface-widening.`,
      );
    }
  }
  const spellUnitRowsByUnitId = new Map(
    report.rows
      .filter((row) => row.rowKind === "spell-unit-pressure")
      .map((row) => [row.candidateUnitId, row]),
  );
  for (const unitId of installedSpellUnitCatalogOnlyClosures) {
    const row = spellUnitRowsByUnitId.get(unitId);
    if (row === undefined) {
      issues.push(
        `Installed Spell Unit catalog-only closure references unknown row ${unitId}.`,
      );
      continue;
    }
    if (
      row.authoredContent.state !== "authored-record-present" ||
      row.catalogAdmission.state !== "installed" ||
      row.finalDisposition !== "catalog-only/dead-for-now"
    ) {
      issues.push(
        `Installed Spell Unit catalog-only closure ${unitId} must reference an authored, installed Spell Unit row classified catalog-only/dead-for-now.`,
      );
    }
  }
  for (const unitId of spellUnitMissingClassifications.keys()) {
    const row = spellUnitRowsByUnitId.get(unitId);
    if (row === undefined) {
      issues.push(
        `Spell Unit classification references unknown row ${unitId}.`,
      );
      continue;
    }
    if (
      row.authoredContent.state !== "missing-authored-record" ||
      row.catalogAdmission.state !== "not-installed"
    ) {
      issues.push(
        `Spell Unit missing classification ${unitId} must reference a missing, not-installed Spell Unit row.`,
      );
    }
  }
  for (const row of report.rows) {
    if (
      row.rowKind === "spell-unit-pressure" &&
      row.authoredContent.state === "missing-authored-record" &&
      !spellUnitMissingClassifications.has(row.candidateUnitId)
    ) {
      issues.push(
        `${row.id} is a missing Spell Unit row without SRDINV5B classification.`,
      );
    }
    if (
      row.rowKind === "spell-unit-pressure" &&
      row.authoredContent.state === "authored-record-present" &&
      row.catalogAdmission.state === "installed" &&
      row.finalDisposition === "catalog-installed-needs-owner-evidence"
    ) {
      issues.push(
        `${row.id} is an installed Spell Unit row with generic owner evidence.`,
      );
    }
  }
  for (const batch of report.recommendedBatches) {
    if (!batch.id) issues.push("Recommended SRD inventory batch lacks id.");
    if (!batch.title) issues.push(`${batch.id} lacks title.`);
    if (!batch.nextAction) issues.push(`${batch.id} lacks nextAction.`);
    if (!batch.acceptance) issues.push(`${batch.id} lacks acceptance.`);
  }
  return issues;
}

function renderSrdUnitInventory(report) {
  const levelOne = report.rows.filter((row) => row.levelBand === "level-1");
  const missingClassContainers = levelOne
    .filter(
      (row) =>
        row.rowKind === "class-container" &&
        row.finalDisposition === "missing-authored-record",
    )
    .map((row) => row.concept.replace(/ class container$/, ""));
  const missingClassContainerDetail =
    missingClassContainers.length === 0
      ? ""
      : ` (${missingClassContainers.join(", ")})`;
  const lines = [
    "# SRD Unit Inventory",
    "",
    "Generated by `scripts/unit-profile-coverage-check.cjs`. Source corpus: `.references/srd-5.2.1/Classes/`.",
    "",
    "This is a Unit/catalog backlog denominator, not RAW span coverage and not an MBT queue.",
    "",
    "## Metrics",
    "",
    `- Total generated rows: ${report.metrics.totalRows}`,
    `- Level-1 rows: ${report.metrics.levelOneRows}`,
    `- Spell-list pressure rows for cantrips and level-1 spells: ${report.metrics.spellPressureRows}`,
    `- Missing level-1 class containers: ${report.metrics.missingClassContainers}${missingClassContainerDetail}`,
    "",
    "### Level-1 Rows by Disposition",
    "",
    ...Object.entries(report.metrics.levelOneRowsByDisposition)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => `- ${key}: ${count}`),
    "",
    "### Level-1 Rows by Category",
    "",
    ...Object.entries(report.metrics.levelOneRowsByCategory)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => `- ${key}: ${count}`),
    "",
    "### Level-1 Character-Creation Ownership",
    "",
    ...Object.entries(report.metrics.levelOneCharacterCreationOwnership)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => `- ${key}: ${count}`),
    "",
    "### Spell Unit Pressure by Disposition",
    "",
    ...Object.entries(report.metrics.spellPressureRowsByDisposition)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => `- ${key}: ${count}`),
    "",
    "## Recommended Ralph Batches",
    "",
    "These batches are generated planning recommendations for a separate SRD inventory Ralph run. They are not QMBT tasks unless a later batch explicitly promotes battle-runtime behavior.",
    "",
    "| Batch | Status | Rows | Intent | Next action | Acceptance |",
    "|---|---|---:|---|---|---|",
    ...report.recommendedBatches.map((batch) =>
      [
        batch.id,
        batch.suggestedStatus,
        batch.rowCount,
        batch.intent,
        batch.nextAction,
        batch.acceptance,
      ]
        .map((cell) => String(cell).replace(/\|/g, "\\|"))
        .join("|")
        .replace(/^/, "|")
        .replace(/$/, "|"),
    ),
    "",
    "## Level-1 Backlog Rows",
    "",
    "| Row | Category | Creation ownership | Surface | Authored | Catalog | Disposition | Owner evidence | Next action | Source |",
    "|---|---|---|---|---|---|---|---|---|---|",
    ...levelOne.map((row) =>
      [
        row.concept,
        row.category,
        row.characterCreationOwnership?.state ?? "",
        row.surface.state,
        row.authoredContent.state,
        row.catalogAdmission.state,
        row.finalDisposition,
        row.ownerEvidence
          .map((evidence) => `${evidence.owner}: ${evidence.status}`)
          .join("; "),
        row.nextAction,
        `${row.source.path}:${row.source.lineStart}`,
      ]
        .map((cell) => String(cell).replace(/\|/g, "\\|"))
        .join("|")
        .replace(/^/, "|")
        .replace(/$/, "|"),
    ),
    "",
  ];
  return `${lines.join("\n")}\n`;
}

module.exports = {
  buildSrdUnitInventory,
  renderSrdUnitInventory,
  validateSrdUnitInventory,
};
