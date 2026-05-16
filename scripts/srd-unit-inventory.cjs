const fs = require("node:fs");
const path = require("node:path");
const {
  battleReadinessClosureKinds,
} = require("./unit-profile-coverage-config.cjs");

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
const characterSheetOwnerEvidenceSchema =
  "dnd.srd-character-sheet-owner-evidence.v1";
const sharedAlgebraOwnerEvidenceSchema =
  "dnd.srd-shared-algebra-owner-evidence.v1";
const sharedMulticlassPrimaryAbilityOwner =
  "shared-algebras/multiclass-prerequisite-algebra";
const characterCreationOwnerEvidenceKinds = [
  "discovery",
  "fill",
  "finalization",
  "buildProjection",
];
const characterSheetOwnerEvidenceKinds = ["runtimeProjection", "tests"];

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
    "srd521:classes/wizard:level-1:class-container:wizard_class_container",
    {
      owner: "Surface class container plus character-creation-runtime",
      requirement:
        "Class-container admission must not stand in for every class fact; keep using narrower trait, feature, spell-access, equipment, and multiclass rows as the executable evidence boundary.",
    },
  ],
  [
    "srd521:classes/warlock:level-1:class-feature-grant:warlock_eldritch_invocations",
    {
      owner:
        "character-creation-runtime plus future Eldritch Invocation option catalog",
      requirement:
        "Character creation retains the Eldritch Invocations feature Unit reference, but feature-choice owner evidence still requires discoverable invocation option Units before fill, finalization, and build projection can be completed without treating a retained ref as choice evidence.",
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
    "srd521:classes/barbarian:level-1:class-feature-grant:barbarian_unarmored_defense",
    {
      owner: "catalog-only/dead-for-now",
      reason:
        "Barbarian Unarmored Defense is a character-sheet AC formula, and no promoted character-sheet AC derivation runtime owns class-derived Armor Class formulas yet.",
    },
  ],
  [
    "srd521:classes/monk:level-1:class-feature-grant:monk_unarmored_defense",
    {
      owner: "catalog-only/dead-for-now",
      reason:
        "Monk Unarmored Defense is a character-sheet AC formula, and no promoted character-sheet AC derivation runtime owns class-derived Armor Class formulas yet.",
    },
  ],
  [
    "srd521:classes/wizard:level-1:class-feature-grant:wizard_arcane_recovery",
    {
      owner: "catalog-only/dead-for-now",
      reason:
        "Spell Slot recovery after a Short Rest belongs to a future character-sheet/rest runtime, not the current character-creation or battle-runtime boundary.",
    },
  ],
]);

const authoredSpellUnitCatalogOnlyClosures = new Map([
  [
    "alarm",
    "Intrusion wards, designated exceptions, audible or mental alerts, and sleep wake-up effects are exploration/security state outside the current promoted runtime owners.",
  ],
  [
    "comprehend_languages",
    "Language comprehension, signed-language understanding, page-reading time, and secret-message exclusion are exploration/communication effects outside promoted runtime owners.",
  ],
  [
    "identify",
    "Magic item property discovery, Attunement and charge knowledge, ongoing-spell identification, and object/creature investigation are exploration/item-inspection effects outside promoted runtime owners.",
  ],
  [
    "silent_image",
    "Moveable visual illusion state, Magic action repositioning, physical-interaction reveal, and Study action adjudication are illusion/exploration state outside promoted runtime owners.",
  ],
  [
    "speak_with_animals",
    "Beast communication, Influence action options, and local-information discovery are exploration/social effects outside promoted runtime owners.",
  ],
]);

const spellUnitExecutableFollowUpBatches = [];

const spellUnitExecutableFollowUps = new Map(
  spellUnitExecutableFollowUpBatches.flatMap((batch) =>
    batch.unitIds.map((unitId) => [unitId, batch]),
  ),
);

const levelOneBattleReadinessLevelBands = new Set([
  "level-1",
  "spell-level-0",
  "spell-level-1",
]);

const battleRuntimeRelevantFeatureUnitIds = new Set([
  "barbarian_weapon_mastery",
  "bard_bardic_inspiration",
  "fighter_fighting_style",
  "fighter_weapon_mastery",
  "monk_martial_arts",
  "paladin_fighting_style",
  "paladin_weapon_mastery",
  "ranger_favored_enemy",
  "ranger_weapon_mastery",
  "rogue_weapon_mastery",
  "sorcerer_innate_sorcery",
  "warlock_eldritch_invocations",
]);

const classContainerSurfaceBlockers = new Map();

const classFeatureSurfaceBlockers = new Map();

const spellAccessSurfaceBlockers = new Map();

const spellUnitMissingClassifications = new Map([
  [
    "create_or_destroy_water",
    {
      kind: "catalog-only-closure",
      reason:
        "Creation/destruction of water, rain extinguishing exposed flames, and fog removal are exploration/environment effects outside the current promoted character-creation and battle-runtime owners.",
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
    "floating_disk",
    {
      kind: "catalog-only-closure",
      reason:
        "Created carrying disk, load capacity, terrain-following, and distance-based end behavior are object/exploration state outside promoted runtime owners.",
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
    "illusory_script",
    {
      kind: "catalog-only-closure",
      reason:
        "Authored writing illusion, designated readers, Truesight reading, and dispelled-script cleanup are document/exploration effects outside promoted runtime owners.",
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

function isBattleReadinessClosure(value) {
  return (
    isRecord(value) &&
    battleReadinessClosureKinds.has(value.kind) &&
    typeof value.owner === "string" &&
    value.owner.length > 0
  );
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
            rawRecord: record,
          },
        ];
      }),
  );
}

function authoredUnitForRow(row, authored) {
  if (!row.candidateUnitId) return undefined;
  const authoredUnit = authored.get(row.candidateUnitId);
  if (authoredUnit === undefined) return undefined;
  if (
    row.rowKind === "spell-access" &&
    authoredUnit.rawRecord?.spellcasting === undefined
  ) {
    return undefined;
  }
  return authoredUnit;
}

function catalogAdmissionForRow(row, authored, installedIds) {
  if (!row.candidateUnitId) return { state: "not-applicable" };
  if (
    row.rowKind === "spell-access" &&
    authoredUnitForRow(row, authored) === undefined
  ) {
    return { state: "not-installed", unitId: row.candidateUnitId };
  }
  return installedIds.has(row.candidateUnitId)
    ? { state: "installed", unitId: row.candidateUnitId }
    : { state: "not-installed", unitId: row.candidateUnitId };
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
  if (authoredUnitForRow(row, authored) === undefined) {
    return "missing-authored-record";
  }
  if (
    catalogAdmissionForRow(row, authored, installedIds).state !== "installed"
  ) {
    if (spellUnitExecutableFollowUps.has(row.candidateUnitId)) {
      return "catalog-authored-executable-follow-up";
    }
    return "catalog-only/dead-for-now";
  }
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

function nextAction(
  row,
  disposition,
  gate,
  ownerEvidenceSources,
  installedIds,
) {
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
  if (disposition === "catalog-authored-executable-follow-up") {
    const followUp = spellUnitExecutableFollowUps.get(row.candidateUnitId);
    return `Promote follow-up batch ${followUp.id}: ${followUp.nextAction}`;
  }
  if (
    disposition === "catalog-only/dead-for-now" &&
    installedClassification?.kind === "catalog-only-closure"
  )
    return installedClassification.reason;
  if (disposition === "non-runtime")
    return "No runtime work; keep classification as explicit closure.";
  if (disposition === "catalog-only/dead-for-now") {
    const catalogOnlyClosure = catalogOnlyClosures.get(row.id);
    if (catalogOnlyClosure !== undefined) return catalogOnlyClosure.reason;
    const spellUnitClassification = spellUnitMissingClassifications.get(
      row.candidateUnitId,
    );
    if (spellUnitClassification?.kind === "catalog-only-closure") {
      return spellUnitClassification.reason;
    }
    const authoredClosure = authoredSpellUnitCatalogOnlyClosures.get(
      row.candidateUnitId,
    );
    if (authoredClosure !== undefined) return authoredClosure;
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
    !row.candidateUnitId
  ) {
    return undefined;
  }
  const isInstalled = installedIds?.has(row.candidateUnitId) ?? false;
  if (
    !isInstalled &&
    !ownerEvidenceSources.unitClaims.has(row.candidateUnitId)
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
      owner:
        "Surface Spell Definition plus battle-runtime spell invocation/projection",
      missingConstruct: claim.issue,
    };
  }
  if (
    claim?.tag === "unsupported-profile" &&
    isBattleReadinessClosure(claim.battleReadinessClosure)
  ) {
    return {
      kind: "catalog-only-closure",
      owner: claim.battleReadinessClosure.owner,
      reason: claim.battleReadinessClosure.reason ?? claim.reason,
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
  const characterSheetEvidence = ownerEvidenceSources.characterSheet.get(
    row.id,
  );
  if (characterSheetEvidence) {
    return {
      kind: "evidence-present",
      owner: "character-sheet-runtime",
      evidence: characterSheetEvidence,
    };
  }
  if (isPrimaryAbilityRow(row)) {
    const evidence = ownerEvidenceSources.sharedMulticlassPrimaryAbility;
    if (evidence !== undefined) {
      return {
        kind: "evidence-present",
        owner: sharedMulticlassPrimaryAbilityOwner,
        evidence,
      };
    }
    return {
      kind: "evidence-required",
      owner: sharedMulticlassPrimaryAbilityOwner,
      requirement:
        "Primary Ability source facts feed multiclass prerequisite checks; close this through the shared algebra rather than character-creation build projection.",
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

function isPrimaryAbilityRow(row) {
  return row.rowKind === "core-trait" && row.id.endsWith("_primary_ability");
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
        : feature.name === "Pact Magic"
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
  characterSheetOwnerEvidence,
  sharedAlgebraOwnerEvidence,
}) {
  const admissionEvidenceEligibleSrdUnitIds = new Set(
    unitClaims
      .filter(
        (row) =>
          row.collectionId === "srd-5.2.1" &&
          (row.claim?.tag === "supported-profile" ||
            row.claim?.tag === "profile-subset-supported"),
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
    if (!admissionEvidenceEligibleSrdUnitIds.has(row.unitId)) continue;
    deterministicEvidenceByUnitId.set(
      row.unitId,
      [
        "plans/unit-profile-coverage/unit-claims.jsonl records this SRD Unit as supported or subset-supported",
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
    characterSheet: buildCharacterSheetEvidenceSources(
      root,
      characterSheetOwnerEvidence,
    ),
    sharedMulticlassPrimaryAbility: buildSharedAlgebraEvidenceSource(
      root,
      sharedAlgebraOwnerEvidence,
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

function buildCharacterSheetEvidenceSources(root, manifest) {
  if (
    manifest == null ||
    manifest.schema !== characterSheetOwnerEvidenceSchema
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
        hasCompleteCharacterSheetOwnerEvidence(evidence),
      )
      .filter(
        ([rowId, evidence]) =>
          characterSheetOwnerEvidenceReferenceIssues(root, rowId, evidence)
            .length === 0,
      )
      .map(([rowId, evidence]) => [
        rowId,
        [
          "plans/unit-profile-coverage/character-sheet-owner-evidence.json records row-level runtime projection evidence",
          `${evidence.taskId} ${evidence.profile}`,
          evidence.summary,
        ].join("; "),
      ]),
  );
}

function buildSharedAlgebraEvidenceSource(root, manifest) {
  const issues = sharedAlgebraOwnerEvidenceIssues(root, manifest);
  if (issues.length > 0) {
    return undefined;
  }
  return [
    "plans/unit-profile-coverage/shared-algebra-owner-evidence.json records shared-algebra owner evidence",
    `${manifest.taskId} ${manifest.profile}`,
    manifest.summary,
  ].join("; ");
}

function sharedAlgebraOwnerEvidenceIssues(root, manifest) {
  const issues = [];
  if (manifest == null) {
    return ["Shared-algebra owner evidence manifest is missing."];
  }
  if (manifest.schema !== sharedAlgebraOwnerEvidenceSchema) {
    issues.push(
      `Shared-algebra owner evidence manifest schema must be ${sharedAlgebraOwnerEvidenceSchema}.`,
    );
  }
  if (manifest.owner !== sharedMulticlassPrimaryAbilityOwner) {
    issues.push(
      `Shared-algebra owner evidence manifest owner must be ${sharedMulticlassPrimaryAbilityOwner}.`,
    );
  }
  if (manifest.appliesTo?.rowKind !== "core-trait") {
    issues.push(
      "Shared-algebra owner evidence manifest appliesTo.rowKind must be core-trait.",
    );
  }
  if (manifest.appliesTo?.rowIdSuffix !== "_primary_ability") {
    issues.push(
      "Shared-algebra owner evidence manifest appliesTo.rowIdSuffix must be _primary_ability.",
    );
  }
  if (!manifest.taskId) {
    issues.push("Shared-algebra owner evidence manifest lacks taskId.");
  }
  if (!manifest.profile) {
    issues.push("Shared-algebra owner evidence manifest lacks profile.");
  }
  if (!manifest.summary) {
    issues.push("Shared-algebra owner evidence manifest lacks summary.");
  }
  if (!isRecord(manifest.evidence)) {
    issues.push(
      "Shared-algebra owner evidence manifest evidence must be an object.",
    );
    return issues;
  }
  for (const kind of [
    "sourceProjection",
    "surfaceSource",
    "runtimeTests",
    "qntProof",
  ]) {
    if (!Array.isArray(manifest.evidence[kind])) {
      issues.push(
        `Shared-algebra owner evidence manifest lacks ${kind} evidence.`,
      );
      continue;
    }
    if (manifest.evidence[kind].length === 0) {
      issues.push(
        `Shared-algebra owner evidence manifest ${kind} evidence is empty.`,
      );
    }
    for (const reference of manifest.evidence[kind]) {
      issues.push(...evidenceReferenceIssues(root, reference, kind));
    }
  }
  return issues;
}

function summarizeSharedAlgebraOwnerEvidence(root, manifest) {
  return {
    schema: manifest?.schema ?? sharedAlgebraOwnerEvidenceSchema,
    owner: manifest?.owner,
    issues: sharedAlgebraOwnerEvidenceIssues(root, manifest),
  };
}

function hasCompleteCharacterCreationOwnerEvidence(evidence) {
  return (
    isRecord(evidence) &&
    characterCreationOwnerEvidenceKinds.every((kind) =>
      hasNonEmptyEvidenceList(evidence, kind),
    )
  );
}

function hasCompleteCharacterSheetOwnerEvidence(evidence) {
  return (
    isRecord(evidence) &&
    characterSheetOwnerEvidenceKinds.every((kind) =>
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

function summarizeCharacterSheetOwnerEvidence(root, manifest) {
  if (manifest == null) {
    return {
      schema: characterSheetOwnerEvidenceSchema,
      rowIds: [],
      issues: ["Character-sheet owner evidence manifest is missing."],
    };
  }
  const issues = [];
  if (manifest.schema !== characterSheetOwnerEvidenceSchema) {
    issues.push(
      `Character-sheet owner evidence manifest schema must be ${characterSheetOwnerEvidenceSchema}.`,
    );
  }
  if (manifest.owner !== "character-sheet-runtime") {
    issues.push(
      "Character-sheet owner evidence manifest owner must be character-sheet-runtime.",
    );
  }
  const rows = manifest.rows ?? {};
  if (!isRecord(rows)) {
    issues.push(
      "Character-sheet owner evidence manifest rows must be an object keyed by SRD inventory row id.",
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
        ...characterSheetOwnerEvidenceReferenceIssues(root, rowId, evidence),
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
    for (const kind of characterSheetOwnerEvidenceKinds) {
      if (!hasNonEmptyEvidenceList(evidence, kind)) {
        issues.push(`${rowId} lacks ${kind} evidence.`);
      }
    }
    issues.push(
      ...characterSheetOwnerEvidenceReferenceIssues(root, rowId, evidence),
    );
  }
  return {
    schema: manifest.schema,
    rowIds: Object.keys(rows).sort(),
    issues,
  };
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

function characterSheetOwnerEvidenceReferenceIssues(root, rowId, evidence) {
  const issues = [];
  if (!isRecord(evidence)) {
    return [`${rowId} manifest evidence must be an object.`];
  }
  for (const kind of characterSheetOwnerEvidenceKinds) {
    const references = evidence[kind];
    if (!Array.isArray(references)) continue;
    for (const reference of references) {
      issues.push(
        ...characterSheetOwnerEvidenceReferenceIssue(
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

function characterSheetOwnerEvidenceReferenceIssue(
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
  const symbolName = reference.slice(separator + 1);
  if (
    !relativePath.startsWith("packages/character-sheet-runtime/src/") ||
    !relativePath.endsWith(".ts")
  ) {
    return [
      `${rowId} ${kind} evidence reference must point under packages/character-sheet-runtime/src: ${reference}`,
    ];
  }
  if (!/^[A-Za-z_$][\w$]*$/.test(symbolName)) {
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
  const symbolPattern = new RegExp(
    `(?:^|\\n)\\s*(?:export\\s+)?(?:const|let|var|function|class|type|interface|enum)\\s+${escapeRegExp(symbolName)}\\b`,
  );
  return symbolPattern.test(content)
    ? []
    : [
        `${rowId} ${kind} evidence reference points to missing symbol ${symbolName}: ${reference}`,
      ];
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

function evidenceReferenceIssues(root, reference, kind) {
  if (typeof reference !== "string" || reference.length === 0) {
    return [`Shared-algebra ${kind} evidence reference must be a string.`];
  }
  const separator = reference.lastIndexOf(":");
  if (separator === -1) {
    return [
      `Shared-algebra ${kind} evidence reference must be path:searchText: ${reference}`,
    ];
  }
  const relativePath = reference.slice(0, separator);
  const searchText = reference.slice(separator + 1);
  if (
    !relativePath.startsWith("packages/shared-algebras/") &&
    !relativePath.startsWith("packages/surface/")
  ) {
    return [
      `Shared-algebra ${kind} evidence reference must point under packages/shared-algebras or packages/surface: ${reference}`,
    ];
  }
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    return [
      `Shared-algebra ${kind} evidence reference points to missing file: ${reference}`,
    ];
  }
  const content = fs.readFileSync(absolutePath, "utf8");
  if (!content.includes(searchText)) {
    return [
      `Shared-algebra ${kind} evidence reference points to missing text ${searchText}: ${reference}`,
    ];
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
    const authoredUnit = authoredUnitForRow(row, authored);
    const unitClaim = row.candidateUnitId
      ? ownerEvidenceSources.unitClaims.get(row.candidateUnitId)?.claim
      : undefined;
    const gate = surfaceGate(row, ownerEvidenceSources, installedIds);
    const disposition = finalDisposition(
      row,
      authored,
      installedIds,
      ownerEvidenceSources,
    );
    const catalogAdmission = catalogAdmissionForRow(
      row,
      authored,
      installedIds,
    );
    const installedClassification = installedOwnerClassification(
      row,
      ownerEvidenceSources,
      installedIds,
    );
    const battleReadinessClosure =
      battleReadinessClosureFromUnitClaim(unitClaim);
    const rowWithState = {
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
      unitProfileDisposition: unitClaim?.tag,
      finalDisposition: disposition,
      battleReadinessClosure,
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
    return {
      ...rowWithState,
      battleReadinessStatus: battleReadinessStatus(rowWithState),
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

function metricPercent(numerator, denominator) {
  if (denominator === 0) return "n/a";
  return `${Math.round((numerator / denominator) * 1000) / 10}%`;
}

function hasAcceptedOwnerEvidence(row, ownerPrefix) {
  return row.ownerEvidence?.some(
    (entry) =>
      entry.status === "owner evidence present" &&
      entry.owner.startsWith(ownerPrefix),
  );
}

function isLevelOneBattleReadinessRow(row) {
  return levelOneBattleReadinessLevelBands.has(row.levelBand);
}

function battleReadinessClosureFromUnitClaim(claim) {
  if (claim?.tag === "unsupported-profile") {
    if (!isBattleReadinessClosure(claim.battleReadinessClosure)) {
      return undefined;
    }
    return {
      source: "unit-claim",
      kind: claim.battleReadinessClosure.kind,
      owner: claim.battleReadinessClosure.owner,
      reason: claim.battleReadinessClosure.reason ?? claim.reason,
    };
  }
  if (claim?.tag !== "profile-subset-supported") {
    return undefined;
  }
  const deferredMechanics = claim.deferredMechanics ?? [];
  if (
    deferredMechanics.length === 0 ||
    deferredMechanics.some(
      (mechanic) => !isBattleReadinessClosure(mechanic.battleReadinessClosure),
    )
  ) {
    return undefined;
  }
  return {
    source: "deferred-mechanics",
    kind: "profile-subset-remaining-mechanics-closed",
    owner: [
      ...new Set(
        deferredMechanics.map(
          (mechanic) => mechanic.battleReadinessClosure.owner,
        ),
      ),
    ].join("; "),
    reason: deferredMechanics
      .map(
        (mechanic) =>
          mechanic.battleReadinessClosure.reason ?? mechanic.mechanic,
      )
      .join("; "),
  };
}

function isBattleRuntimeRelevantFeatureRow(row) {
  return (
    row.rowKind === "mastery-pressure" ||
    battleRuntimeRelevantFeatureUnitIds.has(row.candidateUnitId)
  );
}

function isAcceptedNoBattleEffectSpellRow(row) {
  return (
    row.rowKind === "spell-unit-pressure" &&
    row.finalDisposition === "catalog-only/dead-for-now"
  );
}

function battleReadinessStatus(row) {
  if (!isLevelOneBattleReadinessRow(row)) return undefined;
  if (row.finalDisposition === "non-runtime") {
    return "accepted-no-battle-effect";
  }
  if (row.rowKind === "spell-unit-pressure") {
    if (row.unitProfileDisposition === "supported-profile") {
      return hasAcceptedOwnerEvidence(row, "battle-runtime")
        ? "accepted"
        : "battle-runtime-required";
    }
    if (row.unitProfileDisposition === "profile-subset-supported") {
      return row.battleReadinessClosure !== undefined &&
        (hasAcceptedOwnerEvidence(row, "battle-runtime") ||
          row.finalDisposition === "catalog-installed-owner-evidence-present")
        ? "accepted"
        : "partial-battle-runtime";
    }
    if (isAcceptedNoBattleEffectSpellRow(row)) {
      return "accepted-no-battle-effect";
    }
    if (row.finalDisposition === "needs-surface-widening") {
      return "surface-widening-required";
    }
    return "battle-runtime-required";
  }
  if (
    (row.rowKind === "class-feature-grant" ||
      row.rowKind === "mastery-pressure") &&
    isBattleRuntimeRelevantFeatureRow(row)
  ) {
    if (
      row.unitProfileDisposition === "supported-profile" &&
      hasAcceptedOwnerEvidence(row, "battle-runtime")
    ) {
      return "accepted";
    }
    if (row.unitProfileDisposition === "profile-subset-supported") {
      return row.battleReadinessClosure !== undefined &&
        (hasAcceptedOwnerEvidence(row, "battle-runtime") ||
          row.finalDisposition === "catalog-installed-owner-evidence-present")
        ? "accepted"
        : "partial-battle-runtime";
    }
    if (row.battleReadinessClosure !== undefined) {
      return "accepted-no-battle-effect";
    }
    return "battle-runtime-required";
  }
  if (row.finalDisposition === "catalog-installed-owner-evidence-present") {
    return "accepted";
  }
  if (row.finalDisposition === "catalog-only/dead-for-now") {
    return "accepted-no-battle-effect";
  }
  if (row.finalDisposition === "needs-surface-widening") {
    return "surface-widening-required";
  }
  return "owner-evidence-required";
}

function countBattleReadiness(rows) {
  const scopedRows = rows.filter(isLevelOneBattleReadinessRow);
  const rowsByStatus = scopedRows.reduce((counts, row) => {
    const status = battleReadinessStatus(row);
    counts[status] = (counts[status] ?? 0) + 1;
    return counts;
  }, {});
  const accepted =
    (rowsByStatus.accepted ?? 0) +
    (rowsByStatus["accepted-no-battle-effect"] ?? 0);
  return {
    denominator: scopedRows.length,
    numerator: accepted,
    percent: metricPercent(accepted, scopedRows.length),
    rowsByStatus,
  };
}

function rowRefs(rows) {
  return rows.map((row) => row.id).sort();
}

const completedSrdInventoryBatchIds = new Set([
  "SRDINV31C",
  "SRDINV31D",
  "SRDINV31E",
  "SRDINV31F",
  "SRDINV33",
  "SRDINV34",
  "SRDINV35",
  "SRDINV36",
  "SRDINV37",
  "SRDINV38",
  "SRDINV39",
  "SRDINV40",
  "SRDINV41",
  "SRDINV42",
  "SRDINV43",
  "SRDINV44",
  "SRDINV45",
  "SRDINV46",
  "SRDINV47",
  "SRDINV48",
  "SRDINV49",
  "SRDINV50",
  "SRDINV51",
  "SRDINV52",
  "SRDINV53",
  "SRDINV54",
  "SRDINV55",
]);

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
    suggestedStatus: completedSrdInventoryBatchIds.has(id)
      ? "done"
      : suggestedStatus,
    intent,
    rowCount: rows.length,
    rowIds: rowRefs(rows),
    nextAction,
    acceptance,
  };
}

function readActivePlanTaskStatuses(root) {
  const activePlanPath = path.join(root, "plans/ACTIVE_PLAN.md");
  if (!fs.existsSync(activePlanPath)) {
    return new Map();
  }
  const content = fs.readFileSync(activePlanPath, "utf8");
  const match = content.match(/<!-- ralph-task-index\s*([\s\S]*?)\s*-->/m);
  if (match == null) {
    return new Map();
  }
  try {
    const parsed = JSON.parse(match[1]);
    if (!Array.isArray(parsed.tasks)) {
      return new Map();
    }
    return new Map(
      parsed.tasks
        .filter(
          (task) =>
            task != null &&
            typeof task.id === "string" &&
            typeof task.status === "string",
        )
        .map((task) => [task.id, task.status]),
    );
  } catch {
    return new Map();
  }
}

function withActivePlanStatuses(batches, activePlanTaskStatuses) {
  return batches.map((batch) => ({
    ...batch,
    suggestedStatus:
      activePlanTaskStatuses.get(batch.id) ?? batch.suggestedStatus,
  }));
}

const srdinv8ClassContainerBlockerIds = [
  "srd521:classes/bard:level-1:class-container:bard_class_container",
  "srd521:classes/druid:level-1:class-container:druid_class_container",
  "srd521:classes/monk:level-1:class-container:monk_class_container",
  "srd521:classes/ranger:level-1:class-container:ranger_class_container",
  "srd521:classes/rogue:level-1:class-container:rogue_class_container",
];

const warlockPactMagicFeatureRowId =
  "srd521:classes/warlock:level-1:class-feature-grant:warlock_pact_magic";

const srdinv10ClassFeatureBlockerIds = [
  "srd521:classes/bard:level-1:class-feature-grant:bard_bardic_inspiration",
  "srd521:classes/cleric:level-1:class-feature-grant:cleric_divine_order",
  "srd521:classes/druid:level-1:class-feature-grant:druid_druidic",
  "srd521:classes/druid:level-1:class-feature-grant:druid_primal_order",
  "srd521:classes/monk:level-1:class-feature-grant:monk_martial_arts",
  "srd521:classes/ranger:level-1:class-feature-grant:ranger_favored_enemy",
  "srd521:classes/rogue:level-1:class-feature-grant:rogue_expertise",
  "srd521:classes/rogue:level-1:class-feature-grant:rogue_thieves_cant",
  "srd521:classes/sorcerer:level-1:class-feature-grant:sorcerer_innate_sorcery",
  "srd521:classes/warlock:level-1:class-feature-grant:warlock_eldritch_invocations",
];

function rowsByIds(rows, rowIds) {
  const ids = new Set(rowIds);
  return rows.filter((row) => ids.has(row.id));
}

function srdinv8SurfaceWideningRows(levelOne) {
  return rowsByIds(levelOne, srdinv8ClassContainerBlockerIds);
}

function srdinv9SurfaceWideningRows(levelOne) {
  const spellAccessConstructs = new Set(spellAccessSurfaceBlockers.values());
  return levelOne.filter((row) => {
    if (row.finalDisposition !== "needs-surface-widening") return false;
    return (
      spellAccessConstructs.has(row.surface.missingConstruct) ||
      row.id === warlockPactMagicFeatureRowId
    );
  });
}

function srdinv10SurfaceWideningRows(levelOne) {
  return rowsByIds(levelOne, srdinv10ClassFeatureBlockerIds);
}

function spellExecutableFollowUpRows(spellPressure, batchId) {
  return spellPressure.filter((row) => {
    if (row.finalDisposition !== "catalog-authored-executable-follow-up") {
      return false;
    }
    if (!row.candidateUnitId) return false;
    return (
      spellUnitExecutableFollowUps.get(row.candidateUnitId)?.id === batchId
    );
  });
}

function hasRequiredOwnerEvidence(row, owner) {
  return row.ownerEvidence?.some(
    (entry) =>
      entry.owner === owner && entry.status === "owner evidence required",
  );
}

function buildRecommendedBatches(rows, activePlanTaskStatuses = new Map()) {
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
  const executableFollowUpSpellUnitPressureRows = spellPressure.filter(
    (row) => row.finalDisposition === "catalog-authored-executable-follow-up",
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
  const srdinv8Rows = srdinv8SurfaceWideningRows(levelOne);
  const srdinv9Rows = srdinv9SurfaceWideningRows(levelOne);
  const srdinv10Rows = srdinv10SurfaceWideningRows(levelOne);
  const missingMasteryRows = levelOne.filter(
    (row) =>
      row.rowKind === "mastery-pressure" &&
      row.finalDisposition === "missing-authored-record",
  );
  const srdinv17CharacterCreationClassRows = levelOne.filter(
    (row) =>
      row.finalDisposition === "catalog-installed-owner-evidence-required" &&
      (hasRequiredOwnerEvidence(
        row,
        "Surface class container plus character-creation-runtime",
      ) ||
        hasRequiredOwnerEvidence(row, "character-creation-runtime")) &&
      (row.category === "class container" ||
        row.category === "character-creation or progression mechanic" ||
        row.category === "equipment/weapon/armor pressure"),
  );
  const srdinv18CharacterCreationFeatureRows = levelOne.filter(
    (row) =>
      row.finalDisposition === "catalog-installed-owner-evidence-required" &&
      hasRequiredOwnerEvidence(row, "character-creation-runtime") &&
      row.category === "class feature",
  );
  const srdinv19CharacterCreationSpellAccessRows = levelOne.filter(
    (row) =>
      row.finalDisposition === "catalog-installed-owner-evidence-required" &&
      hasRequiredOwnerEvidence(row, "character-creation-runtime") &&
      row.category === "spell access/list pressure",
  );
  const srdinv20CharacterCreationMasteryRows = levelOne.filter(
    (row) =>
      row.finalDisposition === "catalog-installed-owner-evidence-required" &&
      hasRequiredOwnerEvidence(row, "character-creation-runtime") &&
      row.category === "mastery pressure",
  );
  const srdinv22SharedMulticlassPrimaryAbilityRows = levelOne.filter(
    (row) =>
      row.finalDisposition === "catalog-installed-owner-evidence-required" &&
      hasRequiredOwnerEvidence(
        row,
        "shared-algebras/multiclass-prerequisite-algebra",
      ),
  );
  const srdinv23CharacterSheetArmorClassRows = levelOne.filter(
    (row) =>
      row.finalDisposition === "catalog-only/dead-for-now" &&
      (row.id ===
        "srd521:classes/barbarian:level-1:class-feature-grant:barbarian_unarmored_defense" ||
        row.id ===
          "srd521:classes/monk:level-1:class-feature-grant:monk_unarmored_defense"),
  );
  const srdinv24CharacterSheetRestRecoveryRows = levelOne.filter(
    (row) =>
      row.id ===
      "srd521:classes/wizard:level-1:class-feature-grant:wizard_arcane_recovery",
  );
  const srdinv25CharacterSheetHealingResourceRows = levelOne.filter(
    (row) =>
      row.id ===
      "srd521:classes/paladin:level-1:class-feature-grant:paladin_lay_on_hands",
  );
  const srdinv26SpellInvocationRows = levelOne.filter(
    (row) =>
      row.finalDisposition === "catalog-installed-owner-evidence-required" &&
      hasRequiredOwnerEvidence(row, "future spell-access/invocation runtime"),
  );
  const srdinv28SpellAttackAndSaveDamageRows = spellExecutableFollowUpRows(
    spellPressure,
    "spell-attack-and-save-damage-runtime",
  );
  const spellRowsByUnitIds = (unitIds) =>
    spellPressure.filter((row) => unitIds.includes(row.candidateUnitId));
  const srdinv28PureDamageRows = spellRowsByUnitIds([]);
  const srdinv28SpellAttackDamageRows = spellRowsByUnitIds([
    "chill_touch",
    "guiding_bolt",
    "ray_of_sickness",
    "shocking_grasp",
    "starry_wisp",
  ]);
  const srdinv28RiderTimingRows = spellRowsByUnitIds([
    "chill_touch",
    "guiding_bolt",
    "ray_of_sickness",
    "shocking_grasp",
    "vicious_mockery",
  ]);
  const srdinv28StarryWispRows = spellRowsByUnitIds(["starry_wisp"]);
  const srdinv29ABurningHandsRows = spellRowsByUnitIds([]);
  const srdinv29BColorSprayRows = spellRowsByUnitIds([]);
  const srdinv29CEntangleRows = spellRowsByUnitIds([]);
  const srdinv29DGreaseRows = spellRowsByUnitIds([]);
  const srdinv29EIceKnifeRows = spellRowsByUnitIds(["ice_knife"]);
  const srdinv29FChromaticOrbRows = spellRowsByUnitIds(["chromatic_orb"]);
  const srdinv30ASimpleBuffRows = spellRowsByUnitIds([]);
  const srdinv30BRollModifierRows = spellRowsByUnitIds([]);
  const srdinv30CProtectionRows = spellRowsByUnitIds([]);
  const srdinv30DHeroismRows = spellRowsByUnitIds(["heroism"]);
  const srdinv30EFaerieFireRows = spellRowsByUnitIds([]);
  const srdinv30FResistanceRows = spellRowsByUnitIds(["resistance"]);
  const srdinv31ADivineFavorRows = spellRowsByUnitIds(["divine_favor"]);
  const srdinv31BHuntersMarkRows = spellRowsByUnitIds(["hunters_mark"]);
  const srdinv31CDivineSmiteRows = spellRowsByUnitIds(["divine_smite"]);
  const srdinv31DEnsnaringStrikeRows = spellRowsByUnitIds(["ensnaring_strike"]);
  const srdinv31ESearingSmiteRows = spellRowsByUnitIds(["searing_smite"]);
  const srdinv31FTrueStrikeRows = spellRowsByUnitIds(["true_strike"]);
  const srdinv32AProduceFlameLightRows = spellRowsByUnitIds(["produce_flame"]);
  const srdinv32BProduceFlameHurlRows = spellRowsByUnitIds(["produce_flame"]);
  const srdinv34StarryWispObjectTargetRows = spellRowsByUnitIds([
    "starry_wisp",
  ]);
  const srdinv35DetectAuthoringRows = spellRowsByUnitIds([
    "detect_evil_and_good",
    "detect_poison_and_disease",
  ]);
  const srdinv36HellishRebukeReactionRows = spellRowsByUnitIds([
    "hellish_rebuke",
  ]);
  const srdinv37CharmPersonRows = spellRowsByUnitIds(["charm_person"]);
  const srdinv38SleepRows = spellRowsByUnitIds(["sleep"]);
  const srdinv39EldritchBlastRows = spellRowsByUnitIds(["eldritch_blast"]);
  const srdinv40GreaseRows = spellRowsByUnitIds(["grease"]);
  const srdinv42CommandRows = spellRowsByUnitIds(["command"]);
  const srdinv43DissonantWhispersRows = spellRowsByUnitIds([
    "dissonant_whispers",
  ]);
  const srdinv44ThunderwaveRows = spellRowsByUnitIds(["thunderwave"]);
  const srdinv45ExpeditiousRetreatRows = spellRowsByUnitIds([
    "expeditious_retreat",
  ]);
  const srdinv46JumpRows = spellRowsByUnitIds(["jump"]);
  const srdinv47FeatherFallRows = spellRowsByUnitIds(["feather_fall"]);
  const srdinv49ExpeditiousRetreatRuntimeRows = spellRowsByUnitIds([
    "expeditious_retreat",
  ]);
  const srdinv50CommandRuntimeRows = spellRowsByUnitIds(["command"]);
  const srdinv51ThunderwaveRuntimeRows = spellRowsByUnitIds(["thunderwave"]);
  const srdinv52DissonantWhispersRuntimeRows = spellRowsByUnitIds([
    "dissonant_whispers",
  ]);
  const srdinv53JumpRuntimeRows = spellRowsByUnitIds(["jump"]);
  const srdinv54FeatherFallRuntimeRows = spellRowsByUnitIds(["feather_fall"]);

  const batches = [
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
        "Create or explicitly close missing SRD level-1 class container records.",
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
      rows: [
        ...catalogOnlySpellUnitPressureRows,
        ...executableFollowUpSpellUnitPressureRows,
      ],
      nextAction:
        executableFollowUpSpellUnitPressureRows.length === 0
          ? "Confirm catalog-only/dead-for-now closure or promote named follow-up batches for any spell rows that should become executable."
          : "Catalog-only/dead-for-now closures are explicit; authored executable spell rows are promoted into named follow-up batches.",
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
      suggestedStatus: "done",
      intent:
        "Reviewed SRDINV1-SRDINV6 findings and appended the next concrete Surface-widening batch.",
      rows: levelOne,
      nextAction:
        "Level-1 remains open; run SRDINV8-SRDINV10 before the next recursive SRDINV11 review.",
      acceptance:
        "SRDINV7 closed with inventory metrics and a concrete multi-task next batch, not a recursive-only continuation.",
    }),
    makeBatch({
      id: "SRDINV8",
      title: "Widen Class Container Proficiency Surface Facts",
      suggestedStatus: "done",
      intent:
        "Widen class-container proficiency and multiclass-entry Surface facts.",
      rows: srdinv8Rows,
      nextAction:
        "Completed Bard and Druid tool proficiency blockers, Monk and Rogue tool plus property-filtered Martial weapon proficiency blockers, and Ranger fixed-plus-choice multiclass-entry blockers.",
      acceptance:
        "Class-container proficiency and multiclass-entry blockers are expressible in Surface without parallel runtime data.",
    }),
    makeBatch({
      id: "SRDINV9",
      title: "Widen Non-Wizard Spell Access Surface Facts",
      suggestedStatus: "done",
      intent:
        "Widen non-Wizard spell-access facts and own the shared Warlock Pact Magic source shape.",
      rows: srdinv9Rows,
      nextAction:
        "Cover non-Wizard list-prepared and prepared-half-caster Spell Access, Spell Slot projection, focus and replacement timing facts, plus Warlock Pact Magic and Pact Slot recovery source facts.",
      acceptance:
        "Non-Wizard Spell Access blockers are expressible in Surface, and Pact Magic has one shared source shape for downstream class-feature projections.",
    }),
    makeBatch({
      id: "SRDINV10",
      title: "Widen Level-1 Class Feature Surface Mechanics",
      suggestedStatus: "done",
      intent:
        "Widen level-1 class-feature Surface mechanics after SRDINV9 lands the Pact Magic source shape.",
      rows: srdinv10Rows,
      nextAction:
        "Completed Bardic Inspiration, Divine Order, Druidic, Primal Order, Martial Arts, Favored Enemy, Expertise, Thieves' Cant, Innate Sorcery, and Eldritch Invocation blockers while consuming SRDINV9 Pact Magic facts.",
      acceptance:
        "Level-1 class-feature blockers are expressible in Surface without duplicating Pact Slot or recovery state.",
    }),
    makeBatch({
      id: "SRDINV11",
      title: "Recursive SRD Inventory Planning Review",
      suggestedStatus: "done",
      intent:
        "Reviewed the SRDINV8-SRDINV10 widening results and appended the next concrete authoring batch.",
      rows: levelOne,
      nextAction:
        "Level-1 remains open; run SRDINV12-SRDINV15 before the next recursive SRDINV16 review.",
      acceptance:
        "The next review either explicitly closes level-1 with final metrics or appends another concrete multi-task batch.",
    }),
    makeBatch({
      id: "SRDINV12",
      title: "Author Expressible Level-1 Class Containers",
      suggestedStatus: "done",
      intent:
        "Author missing SRD-provenance class container records now that class-container source facts are expressible.",
      rows: missingClassContainers,
      nextAction:
        "Completed Bard, Cleric, Druid, Monk, Paladin, Ranger, Rogue, and Sorcerer class container records from SRD source facts without creating standalone records for class-owned creation rows.",
      acceptance:
        "Missing level-1 class container count reaches zero, and class-owned creation rows continue to derive from the class container boundary.",
    }),
    makeBatch({
      id: "SRDINV13",
      title: "Author Expressible Level-1 Spell Access Records",
      suggestedStatus: "done",
      intent:
        "Author missing SRD-provenance class Spell Access records made expressible by SRDINV9.",
      rows: missingSpellAccessRows,
      nextAction:
        "Completed Bard, Cleric, Druid, Paladin, Ranger, and Sorcerer level-1 Spellcasting access records with their class-list preparation, slot, focus, and replacement source facts.",
      acceptance:
        "Level-1 class Spellcasting/access rows are authored where Surface can express the source facts, without admitting individual Spell Definitions as runtime-supported.",
    }),
    makeBatch({
      id: "SRDINV14",
      title: "Author Expressible Level-1 Class Feature Records",
      suggestedStatus: "done",
      intent:
        "Author missing SRD-provenance class feature records made expressible by SRDINV10.",
      rows: missingClassFeatureRows,
      nextAction:
        "Completed Bardic Inspiration, Divine Order, Druidic, Primal Order, Martial Arts, Favored Enemy, Expertise, Thieves' Cant, Innate Sorcery, and Eldritch Invocations records using the widened class-feature mechanics.",
      acceptance:
        "Level-1 class-feature rows that are not explicit catalog-only closures are authored or receive a narrower typed follow-up if authoring exposes a real remaining Surface gap.",
    }),
    makeBatch({
      id: "SRDINV15",
      title: "Author Level-1 Weapon Mastery Records",
      suggestedStatus: "done",
      intent:
        "Author missing SRD-provenance Weapon Mastery records for level-1 classes that grant mastery choices.",
      rows: missingMasteryRows,
      nextAction:
        "Completed Barbarian, Paladin, Ranger, and Rogue Weapon Mastery records as character-sheet choice facts; mastery property runtime behavior remains separate.",
      acceptance:
        "Level-1 mastery-pressure rows have authored records or explicit typed closure, while mastery property execution remains separate runtime work.",
    }),
    makeBatch({
      id: "SRDINV16",
      title: "Recursive SRD Inventory Planning Review",
      suggestedStatus: "done",
      intent:
        "Reviewed SRDINV12-SRDINV15 authoring results and appended the next concrete character-creation owner-evidence batch.",
      rows: levelOne,
      nextAction:
        "Level-1 remains open; run SRDINV17-SRDINV20 before the next recursive SRDINV21 review.",
      acceptance:
        "SRDINV16 closed with inventory metrics and a concrete multi-task next batch, not a recursive-only continuation.",
    }),
    makeBatch({
      id: "SRDINV17",
      title: "Close Character-Creation Class Container Evidence",
      intent:
        "Close character-creation owner evidence for authored class containers and class-owned level-1 creation facts.",
      rows: srdinv17CharacterCreationClassRows,
      nextAction:
        "Widen character-creation support profiles and the checker-readable owner-evidence manifest for class containers, core traits, starting equipment, and multiclass-entry facts without creating standalone duplicate records.",
      acceptance:
        "Class container, core trait, equipment, and multiclass-entry rows derive owner evidence from durable discovery, fill, finalization, and build-projection artifacts.",
    }),
    makeBatch({
      id: "SRDINV18",
      title: "Close Character-Creation Class Feature Evidence",
      suggestedStatus: "blocked-on-SRDINV17",
      intent:
        "Close character-creation owner evidence for authored level-1 class feature records that are retained on CharacterBuilds or discovered as choices.",
      rows: srdinv18CharacterCreationFeatureRows,
      nextAction:
        "Add durable character-creation evidence for Bardic Inspiration, Divine Order, Druidic, Primal Order, Martial Arts, Favored Enemy, Expertise, Thieves' Cant, Innate Sorcery, Eldritch Invocations, and Pact Magic where the current character-creation boundary owns the fact.",
      acceptance:
        "Each task-owned feature row either has manifest-backed character-creation owner evidence or a narrower typed closure if the row belongs to a future runtime owner.",
    }),
    makeBatch({
      id: "SRDINV19",
      title: "Close Character-Creation Spell Access Evidence",
      suggestedStatus: "blocked-on-SRDINV17",
      intent:
        "Close character-creation owner evidence for non-Wizard level-1 Spell Access records without admitting individual Spell Definitions as runtime-supported.",
      rows: srdinv19CharacterCreationSpellAccessRows,
      nextAction:
        "Widen character-creation discovery, fill, finalization, build projection, and manifest evidence for Bard, Cleric, Druid, Paladin, Ranger, and Sorcerer Spellcasting source facts.",
      acceptance:
        "Non-Wizard level-1 Spell Access rows have durable character-creation owner evidence while individual Spell Unit pressure remains separate.",
    }),
    makeBatch({
      id: "SRDINV20",
      title: "Close Character-Creation Weapon Mastery Evidence",
      suggestedStatus: "blocked-on-SRDINV17",
      intent:
        "Close character-creation owner evidence for non-Fighter level-1 Weapon Mastery choice records.",
      rows: srdinv20CharacterCreationMasteryRows,
      nextAction:
        "Widen character-creation discovery, fill, finalization, build projection, and manifest evidence for Barbarian, Paladin, Ranger, and Rogue Weapon Mastery choices.",
      acceptance:
        "Non-Fighter level-1 Weapon Mastery rows have durable character-creation owner evidence, and mastery property execution remains separate runtime work.",
    }),
    makeBatch({
      id: "SRDINV21",
      title: "Recursive SRD Inventory Planning Review",
      suggestedStatus: "done",
      intent:
        "Reviewed SRDINV17-SRDINV20 plus SRDINV18A owner-evidence closure and appended the next concrete promoted-runtime batch.",
      rows: levelOne,
      nextAction:
        "Level-1 remains open; run SRDINV22-SRDINV26 before the next recursive SRDINV27 review.",
      acceptance:
        "SRDINV21 closed with inventory metrics and a concrete multi-task next batch, not a recursive-only continuation.",
    }),
    makeBatch({
      id: "SRDINV22",
      title: "Close Shared Multiclass Primary Ability Evidence",
      suggestedStatus: "done",
      intent:
        "Close owner evidence for all level-1 Primary Ability rows through the shared multiclass prerequisite algebra.",
      rows: srdinv22SharedMulticlassPrimaryAbilityRows,
      nextAction:
        "Connect SRD class Primary Ability source facts to shared-algebra prerequisite checks, QNT coverage, runtime tests, and inventory evidence without duplicating character-creation source state.",
      acceptance:
        "All level-1 Primary Ability rows derive owner evidence from shared-algebras/multiclass-prerequisite-algebra rather than character-creation build projection.",
    }),
    makeBatch({
      id: "SRDINV23",
      title: "Promote Character-Sheet Armor Class Formula Runtime",
      intent:
        "Promote the character-sheet Armor Class derivation owner for base AC and class-derived Unarmored Defense formulas.",
      rows: srdinv23CharacterSheetArmorClassRows,
      nextAction:
        "Model the character-sheet AC formula selection boundary before runtime support, then close Barbarian and Monk Unarmored Defense as executable character-sheet evidence.",
      acceptance:
        "Barbarian and Monk Unarmored Defense rows no longer close as catalog-only/dead-for-now; they have promoted character-sheet runtime evidence for mutually exclusive AC formula derivation.",
    }),
    makeBatch({
      id: "SRDINV24",
      title: "Promote Character-Sheet Rest and Spell Slot Recovery",
      intent:
        "Promote the character-sheet rest recovery owner for Short Rest, Long Rest, Spell Slot recovery, and Wizard Arcane Recovery.",
      rows: srdinv24CharacterSheetRestRecoveryRows,
      nextAction:
        "Model rest completion and spell-slot recovery semantics before runtime support, preserving Spell Slot, Pact Slot, Hit Die, and feature recharge ownership as distinct facts.",
      acceptance:
        "Wizard Arcane Recovery no longer closes as catalog-only/dead-for-now; it has promoted character-sheet runtime evidence tied to Short Rest completion and Long Rest recharge.",
    }),
    makeBatch({
      id: "SRDINV25",
      title: "Promote Character-Sheet Healing Resource Actions",
      intent:
        "Promote the character-sheet resource-action owner for Lay On Hands healing and Poisoned-condition removal.",
      rows: srdinv25CharacterSheetHealingResourceRows,
      nextAction:
        "Model the Lay On Hands pool and Bonus Action spend boundary before runtime support, keeping healing amount and Poisoned removal costs coupled to one pool.",
      acceptance:
        "Paladin Lay On Hands no longer closes as catalog-only/dead-for-now; it has promoted runtime evidence for pool spend, HP restoration, and Poisoned-condition removal without duplicating resource state.",
    }),
    makeBatch({
      id: "SRDINV26",
      title: "Close Wizard Ritual Adept Invocation Ownership",
      intent:
        "Close Wizard Ritual Adept owner evidence through the promoted spell-access/invocation runtime boundary.",
      rows: srdinv26SpellInvocationRows,
      nextAction:
        "Model ritual casting as spell invocation over spellbook Spell Access and ritual-tagged Spell Definitions before runtime evidence, without treating the retained feature Unit ref as execution support.",
      acceptance:
        "Wizard Ritual Adept has owner evidence from the promoted spell-access/invocation runtime, while character creation remains limited to retaining the feature and spellbook facts.",
    }),
    makeBatch({
      id: "SRDINV27",
      title: "Recursive SRD Inventory Planning Review",
      suggestedStatus: "done",
      intent:
        "Reviewed SRDINV22-SRDINV26 promoted-runtime closure, recorded level-1 inventory completion, and appended the next concrete spell-runtime batch.",
      rows: levelOne,
      nextAction:
        "Level-1 is complete; run SRDINV28A-SRDINV28E, the split SRDINV29A-SRDINV32B spell-runtime slices, and then SRDINV33 review.",
      acceptance:
        "SRDINV27 closed with final level-1 metrics and a concrete multi-task spell-runtime batch, not a recursive-only continuation.",
    }),
    makeBatch({
      id: "SRDINV28A",
      title: "Generalize Spell Damage Invocation Runtime",
      intent:
        "Generalize the spell attack/save-damage invocation model before admitting more concrete Spell Definitions.",
      rows: srdinv28SpellAttackAndSaveDamageRows,
      nextAction:
        "Make attack-roll and save-gated spell damage representable for cantrips and prepared spell-slot invocations without Ray-of-Frost-only speed-rider assumptions or Acid-Splash-only area assumptions.",
      acceptance:
        "The shared spell-damage procedure shape is explicit enough for later selected Spell Unit rows to add deterministic admission/projection and promoted runtime evidence.",
    }),
    makeBatch({
      id: "SRDINV28B",
      title: "Promote Pure Spell Damage Runtime",
      suggestedStatus: "blocked-on-SRDINV28A",
      intent:
        "Promote the simplest pure damage Spell Definitions after the shared invocation shape exists.",
      rows: srdinv28PureDamageRows,
      nextAction:
        "Admit Poison Spray, Sacred Flame, Inflict Wounds, and Burning Hands if the slice also adds executable cone target-list support; otherwise leave Burning Hands for area targeting.",
      acceptance:
        "Pure damage Spell Unit rows have deterministic admission/projection without smuggling rider, object, or area semantics into metadata.",
    }),
    makeBatch({
      id: "SRDINV28C",
      title: "Promote Spell Attack Damage Runtime",
      suggestedStatus: "blocked-on-SRDINV28A",
      intent:
        "Promote spell attack damage without mandatory Ray-of-Frost speed-rider coupling.",
      rows: srdinv28SpellAttackDamageRows,
      nextAction:
        "Admit melee/ranged spell attack damage and scaling for damage-only or rider-deferred spell attacks such as Chill Touch, Shocking Grasp, Guiding Bolt, Ray of Sickness, and Starry Wisp only within the supported damage subset.",
      acceptance:
        "Spell attack damage has promoted runtime evidence while rider-deferred rows remain explicitly limited.",
    }),
    makeBatch({
      id: "SRDINV28D",
      title: "Promote Spell Rider Timing Runtime",
      suggestedStatus: "blocked-on-SRDINV28B-SRDINV28C",
      intent: "Promote simple spell rider timing with source-owned expiration.",
      rows: srdinv28RiderTimingRows,
      nextAction:
        "Add executable support for Poisoned, Opportunity Attack denial, next-attack advantage/disadvantage, healing suppression where modeled, and condition/source ownership without removing unrelated pre-existing conditions.",
      acceptance:
        "Rider-bearing Spell Unit rows have promoted runtime evidence only when each SRD expiration anchor is tested.",
    }),
    makeBatch({
      id: "SRDINV28E",
      title: "Decide Starry Wisp Object Targeting",
      suggestedStatus: "blocked-on-SRDINV28A-SRDINV28C",
      intent:
        "Decide Starry Wisp object targeting before claiming full runtime support.",
      rows: srdinv28StarryWispRows,
      nextAction:
        "Either add executable object target fill/fact support for Starry Wisp or keep it unsupported with explicit matrix evidence; do not claim object targeting as metadata only.",
      acceptance:
        "Starry Wisp has either real object-target support or a checker-visible unsupported blocker.",
    }),
    makeBatch({
      id: "SRDINV29A",
      title: "Promote Burning Hands Cone Damage Runtime",
      suggestedStatus: "blocked-on-SRDINV28A-SRDINV28E",
      intent:
        "Promote Burning Hands as self-origin cone save-for-half Fire damage with slot scaling.",
      rows: srdinv29ABurningHandsRows,
      nextAction:
        "Add the smallest self-origin cone target-list/fact boundary needed for Burning Hands while keeping spatial derivation caller supplied.",
      acceptance:
        "Burning Hands has deterministic admission/projection and promoted runtime evidence for cone save damage, half damage on success, slot scaling, and spell-slot/action spend.",
    }),
    makeBatch({
      id: "SRDINV29B",
      title: "Promote Color Spray Cone Condition Runtime",
      suggestedStatus: "blocked-on-SRDINV28A-SRDINV28E",
      intent:
        "Promote Color Spray as self-origin cone Blinded condition application with end-of-caster-next-turn expiration.",
      rows: srdinv29BColorSprayRows,
      nextAction:
        "Reuse the cone target-list/fact boundary from SRDINV29A if available, but keep condition source ownership and expiration tests explicit.",
      acceptance:
        "Color Spray has promoted runtime evidence for save-gated Blinded application and precise source-owned expiration without affecting unrelated Blinded sources.",
    }),
    makeBatch({
      id: "SRDINV29C",
      title: "Promote Entangle Area Restraint Runtime",
      suggestedStatus: "blocked-on-SRDINV28A-SRDINV28E",
      intent:
        "Promote Entangle as point-origin area Restrained application with Concentration duration and escape action.",
      rows: srdinv29CEntangleRows,
      nextAction:
        "Model caller-supplied square area facts, save-gated Restrained ownership, caster exclusion from the affected save set, Concentration ending, and the Strength (Athletics) escape action. Difficult Terrain remains table/spatial agenda because persistent spell-area movement-cost derivation is not executable in this slice.",
      acceptance:
        "Entangle has promoted runtime evidence for initial area save, caster exclusion, Restrained lifecycle, concentration cleanup, and escape action without grid/pathfinding derivation; Difficult Terrain is explicitly matrix-limited.",
    }),
    makeBatch({
      id: "SRDINV29D",
      title: "Promote Grease Ground Hazard Runtime",
      suggestedStatus: "blocked-on-SRDINV28A-SRDINV28E",
      intent:
        "Promote Grease as a timed ground area with on-cast Prone and recurring enter/end-turn saves.",
      rows: srdinv29DGreaseRows,
      nextAction:
        "Use SRD one-minute duration semantics and table-supplied area membership; a stored ground-area fact is not enough unless the runtime exposes executable enter-area/end-turn save procedures.",
      acceptance:
        "Grease has promoted runtime evidence for on-cast Prone and recurring hazard saves, or remains explicitly unsupported rather than shortened to next-turn semantics or claimed from inert metadata.",
    }),
    makeBatch({
      id: "SRDINV29E",
      title: "Promote Ice Knife Mixed Attack Burst Runtime",
      suggestedStatus: "blocked-on-SRDINV28A-SRDINV28E",
      intent:
        "Promote Ice Knife as a primary ranged spell attack followed by a mandatory burst save centered on the primary target.",
      rows: srdinv29EIceKnifeRows,
      nextAction:
        "Model the target hole, attack roll, hit-only Piercing damage, spell-attack critical hits for the Piercing dice only, hit-or-miss burst, primary-target anchored area facts, and Cold slot scaling.",
      acceptance:
        "Ice Knife has promoted runtime evidence proving the burst always happens, includes the primary target in the save set, stays anchored to that target, and doubles only the primary attack's Piercing dice on critical hits.",
    }),
    makeBatch({
      id: "SRDINV29F",
      title: "Research Chromatic Orb Chained Attack Runtime",
      suggestedStatus: "blocked-on-SRDINV28A-SRDINV28E",
      intent:
        "Research and, only if tractable, promote Chromatic Orb chosen damage type and chained attack loop.",
      rows: srdinv29FChromaticOrbRows,
      nextAction:
        "Treat Chromatic Orb as a state-machine research task: chosen damage type, duplicate-face damage-roll gate, one hole after each qualifying hit, target uniqueness, and slot-level maximum leaps. Use git-history restore sources from the deleted Core/prototype lanes for inspiration, especially commits 3066c771 and 1f192c9c. Do not add chosen damage-type fields to all prepared spell invocation refs unless the exported helper API and every caller can produce them.",
      acceptance:
        "Chromatic Orb is either split again into an implementable vertical slice with no support claim, or has promoted runtime evidence for the full chained-target loop; metadata-only continuation records are not support.",
    }),
    makeBatch({
      id: "SRDINV30A",
      title: "Promote Simple Scalar Buff Spell Runtime",
      suggestedStatus: "blocked-on-SRDINV28A-SRDINV28E",
      intent:
        "Promote False Life, Longstrider, and Shield of Faith as simple scalar HP, Speed, and AC effects.",
      rows: srdinv30ASimpleBuffRows,
      nextAction:
        "Cover temp HP, timed Speed bonus, concentration AC bonus, action/bonus-action cost, slot scaling, and source-owned cleanup.",
      acceptance:
        "The scalar buff rows have promoted runtime evidence without mixing in roll modifiers, creature-type protection, or recurring turn-start effects.",
    }),
    makeBatch({
      id: "SRDINV30B",
      title: "Promote Roll Modifier Spell Runtime",
      suggestedStatus: "blocked-on-SRDINV28A-SRDINV28E",
      intent: "Promote Bane, Bless, and Guidance as D20 roll modifier spells.",
      rows: srdinv30BRollModifierRows,
      nextAction:
        "Model save-gated negative modifiers, unconditional positive modifiers, ability-check skill filtering where authored, concentration, and slot-scaled target counts.",
      acceptance:
        "Roll modifier spell rows have promoted runtime evidence for the exact roll kinds they modify and do not duplicate roll facts beside the active effect.",
    }),
    makeBatch({
      id: "SRDINV30C",
      title: "Promote Protection and Charm Spell Runtime",
      suggestedStatus: "blocked-on-SRDINV28A-SRDINV28E",
      intent:
        "Promote Animal Friendship and Protection from Evil and Good as creature-type-scoped protection/charm effects.",
      rows: srdinv30CProtectionRows,
      nextAction:
        "Keep Beast and creature-type filters executable, and make early-ending or scoped condition/attack effects explicit rather than metadata-only.",
      acceptance:
        "Protection/charm rows have promoted runtime evidence for the selected executable subset and checker-visible blockers for any omitted SRD clauses.",
    }),
    makeBatch({
      id: "SRDINV30D",
      title: "Promote Heroism Turn-Start Runtime",
      suggestedStatus: "blocked-on-SRDINV28A-SRDINV28E",
      intent:
        "Promote Heroism as Frightened immunity plus turn-start Temporary Hit Points.",
      rows: srdinv30DHeroismRows,
      nextAction:
        "Model concentration cleanup, target scaling, condition immunity, and attached target turn-start temp HP refresh.",
      acceptance:
        "Heroism has promoted runtime evidence for both passive immunity and recurring turn-start temp HP without conflating those effects.",
    }),
    makeBatch({
      id: "SRDINV30E",
      title: "Promote Faerie Fire Area Reveal Runtime",
      suggestedStatus: "blocked-on-SRDINV28A-SRDINV28E",
      intent:
        "Promote Faerie Fire as area save-gated attack Advantage and visibility/invisibility-denial support where executable.",
      rows: srdinv30EFaerieFireRows,
      nextAction:
        "Use caller-supplied cube facts; prove save-gated affected targets, concentration cleanup, and any supported Invisible/Dim Light subset.",
      acceptance:
        "Faerie Fire has promoted runtime evidence for its attack-advantage effect and explicit blockers for object outline or light/invisibility clauses not yet executable.",
    }),
    makeBatch({
      id: "SRDINV30F",
      title: "Promote Resistance Damage Reduction Runtime",
      suggestedStatus: "blocked-on-SRDINV28A-SRDINV28E",
      intent:
        "Promote Resistance as chosen-damage-type reduction with once-per-turn semantics.",
      rows: srdinv30FResistanceRows,
      nextAction:
        "Model the damage type choice, concentration duration, damage reduction fill, and per-turn usage cap.",
      acceptance:
        "Resistance has promoted runtime evidence for one reduction per turn against the chosen damage type, or remains unsupported if the usage cap cannot be represented.",
    }),
    makeBatch({
      id: "SRDINV31A",
      title: "Promote Divine Favor Weapon Rider Runtime",
      suggestedStatus: "blocked-on-SRDINV28A-SRDINV28E",
      intent:
        "Promote Divine Favor as self-hosted extra Radiant damage on weapon hits.",
      rows: srdinv31ADivineFavorRows,
      nextAction:
        "Attach the spell effect to the caster's weapon-hit damage path with timed duration and no target mark state.",
      acceptance:
        "Divine Favor has promoted runtime evidence for extra weapon-hit damage without leaking into spell attacks or unarmed-only paths.",
    }),
    makeBatch({
      id: "SRDINV31B",
      title: "Promote Hunter's Mark Runtime",
      suggestedStatus: "blocked-on-SRDINV28A-SRDINV28E",
      intent:
        "Promote Hunter's Mark as marked-target damage plus zero-HP retargeting.",
      rows: srdinv31BHuntersMarkRows,
      nextAction:
        "Model mark identity, attack-roll hit damage against the mark, concentration, and Bonus Action retarget after the mark drops to 0 HP.",
      acceptance:
        "Hunter's Mark has promoted runtime evidence for mark-scoped damage and retargeting without treating all caster attacks as eligible.",
    }),
    makeBatch({
      id: "SRDINV31C",
      title: "Promote Divine Smite After-Hit Runtime",
      suggestedStatus: "blocked-on-SRDINV28A-SRDINV28E",
      intent:
        "Promote Divine Smite as an immediate after-hit Bonus Action damage spell.",
      rows: srdinv31CDivineSmiteRows,
      nextAction:
        "Model the already-hit melee weapon/unarmed trigger, Bonus Action and slot spend, Radiant damage scaling, and Fiend/Undead bonus.",
      acceptance:
        "Divine Smite has promoted runtime evidence for trigger eligibility and damage without replaying or duplicating the base attack.",
    }),
    makeBatch({
      id: "SRDINV31D",
      title: "Promote Ensnaring Strike Runtime",
      suggestedStatus: "blocked-on-SRDINV28A-SRDINV28E",
      intent:
        "Promote Ensnaring Strike as after-hit save-gated Restrained plus start-turn damage and escape.",
      rows: srdinv31DEnsnaringStrikeRows,
      nextAction:
        "Model the weapon-hit trigger, save gate, concentration, Restrained ownership, start-turn Piercing damage, slot scaling, and escape action.",
      acceptance:
        "Ensnaring Strike has promoted runtime evidence for both initial hit/save behavior and ongoing restrained damage lifecycle.",
    }),
    makeBatch({
      id: "SRDINV31E",
      title: "Promote Searing Smite Runtime",
      suggestedStatus: "blocked-on-SRDINV28A-SRDINV28E",
      intent:
        "Promote Searing Smite as after-hit Fire damage plus recurring start-turn damage/save-to-end.",
      rows: srdinv31ESearingSmiteRows,
      nextAction:
        "Model the immediate after-hit damage, timed duration, start-turn damage, Constitution save, success ending, and slot scaling.",
      acceptance:
        "Searing Smite has promoted runtime evidence for immediate and recurring damage without collapsing the end-save into fixed expiration.",
    }),
    makeBatch({
      id: "SRDINV31F",
      title: "Promote True Strike Weapon Spell Runtime",
      suggestedStatus: "blocked-on-SRDINV28A-SRDINV28E",
      intent:
        "Promote True Strike as a spell-hosted weapon attack using spellcasting ability and damage type choice.",
      rows: srdinv31FTrueStrikeRows,
      nextAction:
        "Model material-component weapon eligibility, spellcasting ability override, Radiant-or-normal damage choice, and cantrip scaling.",
      acceptance:
        "True Strike has promoted runtime evidence for the spell-hosted weapon attack without depending on generic weapon mastery behavior.",
    }),
    makeBatch({
      id: "SRDINV32A",
      title: "Promote Produce Flame Held Light Runtime",
      suggestedStatus: "blocked-on-SRDINV28A-SRDINV28E",
      intent: "Promote Produce Flame as held illumination with recast expiry.",
      rows: srdinv32AProduceFlameLightRows,
      nextAction:
        "Model Bonus Action casting, one active held flame, Bright Light and Dim Light facts, timed duration, and ending when the caster recasts the spell.",
      acceptance:
        "Produce Flame held-light state has promoted runtime evidence without coupling it to the later hurled attack.",
    }),
    makeBatch({
      id: "SRDINV32B",
      title: "Promote Produce Flame Hurled Attack Runtime",
      suggestedStatus: "blocked-on-SRDINV32A",
      intent:
        "Promote Produce Flame's later Magic action hurl as a ranged spell attack over the held-flame state.",
      rows: srdinv32BProduceFlameHurlRows,
      nextAction:
        "Model the later Magic action, held-state consumption or continuation per RAW, ranged spell attack, Fire damage, cantrip scaling, and explicit object-target blocker if object support is still absent.",
      acceptance:
        "Produce Flame hurl has promoted runtime evidence for the executable target subset, and object targeting is either real or checker-visible unsupported.",
    }),
    makeBatch({
      id: "SRDINV33",
      title: "Recursive SRD Inventory Planning Review",
      suggestedStatus: "blocked-on-SRDINV28A-SRDINV28E-SRDINV29A-SRDINV32B",
      intent:
        "Review SRDINV28A-SRDINV28E and SRDINV29A-SRDINV32B spell-runtime closure and append the next concrete spell frontier.",
      rows: spellPressure,
      nextAction:
        "Refresh spell Unit inventory metrics after the runtime-ready spell batch, then choose the next concrete frontier among installed unsupported spell evidence, missing Detect spell authoring, and remaining Spell Surface blockers; split any future task with multiple execution invariants before marking it runnable.",
      acceptance:
        "The next review records spell-runtime metrics and appends Ralph-sized follow-up work rather than a passive backlog list or omnibus runtime task.",
    }),
    makeBatch({
      id: "SRDINV34",
      title: "Promote Starry Wisp Object Target Runtime",
      suggestedStatus: "blocked-on-SRDINV33",
      intent:
        "Promote the Starry Wisp creature-or-object target boundary before claiming object-target spell support.",
      rows: srdinv34StarryWispObjectTargetRows,
      nextAction:
        "Add typed object target identity, caller-supplied range/spatial targetability facts, ranged spell attack hit/miss against object targets, object damage disposition, and an executable decision for Dim Light emission and Invisible-benefit denial.",
      acceptance:
        "Starry Wisp has promoted runtime evidence for the executable creature-or-object target subset, or any omitted object/rider clause remains checker-visible unsupported.",
    }),
    makeBatch({
      id: "SRDINV35",
      title: "Author Missing Detect Spell Records",
      suggestedStatus: "blocked-on-SRDINV33",
      intent:
        "Author missing SRD Detect Evil and Good and Detect Poison and Disease Spell Definition records using existing detection Surface atoms.",
      rows: srdinv35DetectAuthoringRows,
      nextAction:
        "Add SRD-provenance spell records for the two Detect spells without promoting detection, occlusion, or exploration runtime behavior.",
      acceptance:
        "Detect Evil and Good and Detect Poison and Disease no longer appear as missing-authored-record Spell Unit pressure, while detection execution remains outside promoted runtime support.",
    }),
    makeBatch({
      id: "SRDINV36",
      title: "Promote Hellish Rebuke Reaction Runtime",
      suggestedStatus: "blocked-on-SRDINV33",
      intent:
        "Promote Hellish Rebuke as a damage-triggered Reaction spell with Dexterity save and half damage on success.",
      rows: srdinv36HellishRebukeReactionRows,
      nextAction:
        "Model the taking-damage reaction window, visible-damager eligibility, Reaction and Spell Slot spend, Dexterity save, Fire damage, half damage on success, and slot scaling.",
      acceptance:
        "Hellish Rebuke has focused runtime-test evidence for its reaction trigger and save-damage resolution; Unit profile support remains unpromoted until the authoritative QNT model owns the behavior.",
    }),
    makeBatch({
      id: "SRDINV37",
      title: "Promote Charm Person Runtime",
      suggestedStatus: "blocked-on-SRDINV33",
      intent:
        "Promote Charm Person as Humanoid-target Charmed application with hostile-target save Advantage and damage-break cleanup.",
      rows: srdinv37CharmPersonRows,
      nextAction:
        "Model Humanoid target filtering, Wisdom save with hostile-target Advantage, Charmed condition ownership, one-hour duration, early ending when the caster or allies damage the target, and slot-scaled target count.",
      acceptance:
        "Charm Person has promoted runtime evidence for its SRD charm lifecycle without reusing Animal Friendship's Beast-specific target rule.",
    }),
    makeBatch({
      id: "SRDINV38",
      title: "Research Sleep Save Loop Runtime",
      suggestedStatus: "blocked-on-SRDINV33",
      intent:
        "Research and split Sleep's save loop and Incapacitated/Unconscious lifecycle before claiming installed support.",
      rows: srdinv38SleepRows,
      nextAction:
        "Design the point-origin target set, initial Wisdom save, next-turn repeat save, Incapacitated and Unconscious application, wake-up damage/help lifecycle, sleep-immunity and Exhaustion-immunity auto-success, and Concentration cleanup; split implementation if the save loop and condition lifecycle do not fit one Ralph task.",
      acceptance:
        "Sleep is either split into implementable vertical slices with no support claim, or has promoted runtime evidence for its save loop and condition lifecycle together.",
    }),
    makeBatch({
      id: "SRDINV39",
      title: "Promote Eldritch Blast Beam Runtime",
      suggestedStatus: "blocked-on-SRDINV33",
      intent:
        "Promote Eldritch Blast as one or more independent ranged spell attack beams with cantrip scaling.",
      rows: srdinv39EldritchBlastRows,
      nextAction:
        "Model per-beam target choice, attack roll, Force damage, cantrip beam-count scaling, independent hit/miss resolution, and one Magic action spell invocation spend.",
      acceptance:
        "Eldritch Blast has promoted runtime evidence for beam-by-beam attack resolution without conflating it with Chromatic Orb's chained continuation protocol.",
    }),
    makeBatch({
      id: "SRDINV40",
      title: "Research Grease Ground Hazard Runtime Retry",
      suggestedStatus: "blocked-on-SRDINV33",
      intent:
        "Research and retry Grease's timed ground area with on-cast Prone and recurring enter/end-turn saves as its own hazard lifecycle.",
      rows: srdinv40GreaseRows,
      nextAction:
        "Design the table-supplied ground-area membership boundary for on-cast creatures, later entering creatures, and end-turn occupants; split implementation before support if recurring hazard event hooks remain too broad.",
      acceptance:
        "Grease has either promoted runtime evidence for on-cast and recurring Prone saves, or a sharper split that keeps the authored spell unsupported without inert area metadata.",
    }),
    makeBatch({
      id: "SRDINV41",
      title: "Recursive SRD Inventory Planning Review",
      suggestedStatus: "blocked-on-SRDINV34-SRDINV40",
      intent:
        "Review the object-target, Detect authoring, reaction, charm, Sleep, beam, and Grease retry batch before selecting the next remaining spell Surface frontier.",
      rows: spellPressure,
      nextAction:
        "Refresh spell Unit inventory metrics, inspect any rejected partial-support findings, and append the next concrete Surface-blocker batch by execution invariant.",
      acceptance:
        "The review records refreshed spell metrics and appends concrete follow-up work rather than a passive backlog list.",
    }),
    makeBatch({
      id: "SRDINV42",
      title: "Widen Command Option Surface",
      suggestedStatus: "blocked-on-SRDINV41",
      intent:
        "Widen Surface for Command's named option grammar before runtime support.",
      rows: srdinv42CommandRows,
      nextAction:
        "Represent Approach, Drop, Flee, Grovel, Halt, next-turn execution, turn-ending clauses, and slot-scaled additional targets without smuggling pathfinding into authored data.",
      acceptance:
        "Command's SRD options are expressible as typed Surface facts, and runtime execution remains a separate follow-up.",
    }),
    makeBatch({
      id: "SRDINV43",
      title: "Widen Dissonant Whispers Forced Reaction Movement Surface",
      suggestedStatus: "blocked-on-SRDINV41",
      intent:
        "Widen Surface for Dissonant Whispers' save-gated damage plus forced Reaction movement.",
      rows: srdinv43DissonantWhispersRows,
      nextAction:
        "Represent failed-save Psychic damage, target Reaction movement away by safest route, no-Reaction fallback, half-damage success, and slot-scaled damage while keeping route derivation caller/table-owned.",
      acceptance:
        "Dissonant Whispers is expressible without claiming runtime movement/pathfinding support.",
    }),
    makeBatch({
      id: "SRDINV44",
      title: "Widen Thunderwave Push Surface",
      suggestedStatus: "blocked-on-SRDINV41",
      intent:
        "Widen Surface for Thunderwave's self-origin Cube damage plus push effects.",
      rows: srdinv44ThunderwaveRows,
      nextAction:
        "Represent Constitution save damage, failed-save creature push, unsecured-object push, audible boom, and slot-scaled Thunder damage without resolving push geometry.",
      acceptance:
        "Thunderwave is expressible as save damage plus typed push/noise facts, with runtime push resolution left separate.",
    }),
    makeBatch({
      id: "SRDINV45",
      title: "Widen Expeditious Retreat Dash Surface",
      suggestedStatus: "blocked-on-SRDINV41",
      intent:
        "Widen Surface for Expeditious Retreat's immediate and ongoing Dash grants.",
      rows: srdinv45ExpeditiousRetreatRows,
      nextAction:
        "Represent the Bonus Action casting-time Dash and Concentration-granted later Bonus Action Dash without duplicating Movement budget state.",
      acceptance:
        "Expeditious Retreat's Dash grants are authored as typed Surface facts while Dash execution stays with Movement/action runtime owners.",
    }),
    makeBatch({
      id: "SRDINV46",
      title: "Widen Jump Movement Replacement Surface",
      suggestedStatus: "blocked-on-SRDINV41",
      intent:
        "Widen Surface for Jump's once-per-turn movement-spend jump replacement.",
      rows: srdinv46JumpRows,
      nextAction:
        "Represent touched willing targets, one jump up to 30 feet by spending 10 feet of movement once on each target turn, timed duration, and slot-scaled additional targets.",
      acceptance:
        "Jump's movement replacement is expressible without deriving jump arcs, landing geometry, or movement execution.",
    }),
    makeBatch({
      id: "SRDINV47",
      title: "Widen Feather Fall Falling Reaction Surface",
      suggestedStatus: "blocked-on-SRDINV41",
      intent:
        "Widen Surface for Feather Fall's falling-trigger Reaction and per-target fall mitigation.",
      rows: srdinv47FeatherFallRows,
      nextAction:
        "Represent the falling trigger, up-to-five falling creature targets, fall-rate cap, fall-damage prevention, and per-target landing cleanup.",
      acceptance:
        "Feather Fall is expressible as a typed falling Reaction spell without adding runtime fall-distance or landing geometry simulation.",
    }),
    makeBatch({
      id: "SRDINV48",
      title: "Recursive SRD Inventory Planning Review",
      suggestedStatus: "blocked-on-SRDINV42-SRDINV47",
      intent:
        "Review the movement/action Surface widening batch before selecting the next spell Surface or runtime frontier.",
      rows: spellPressure,
      nextAction:
        "Refresh spell Unit inventory metrics after SRDINV42-SRDINV47, inspect remaining Surface blockers and deferred partial-support findings, and append the next concrete batch by execution invariant.",
      acceptance:
        "The next review records refreshed metrics and appends Ralph-sized follow-up work rather than an omnibus spell backlog.",
    }),
    makeBatch({
      id: "SRDINV49",
      title: "Promote Expeditious Retreat Dash Runtime",
      suggestedStatus: "blocked-on-SRDINV48",
      intent:
        "Promote Expeditious Retreat's immediate Dash and Concentration-granted Bonus Action Dash as the smallest movement/action runtime slice.",
      rows: srdinv49ExpeditiousRetreatRuntimeRows,
      nextAction:
        "Model the Bonus Action spell invocation, immediate Dash movement-budget increase, Concentration-owned later Bonus Action Dash permission, and cleanup without duplicating Speed or Movement state.",
      acceptance:
        "Expeditious Retreat has deterministic admission/projection and promoted runtime evidence for Dash grants, with Movement budget facts derived from the existing action/movement owner.",
    }),
    makeBatch({
      id: "SRDINV50",
      title: "Research Command Option Runtime Split",
      suggestedStatus: "blocked-on-SRDINV48",
      intent:
        "Split Command's named next-turn option execution into implementable runtime slices before claiming support.",
      rows: srdinv50CommandRuntimeRows,
      nextAction:
        "Design the failed-save next-turn command effect, per-option execution boundaries, turn-ending clauses, held-item drop fact, and caller-supplied route facts for Approach and Flee.",
      acceptance:
        "Command is either split into Ralph-sized executable option tasks or has a precise runtime support contract that keeps route/pathfinding ownership table-supplied.",
    }),
    makeBatch({
      id: "SRDINV51",
      title: "Promote Thunderwave Push Runtime Boundary",
      suggestedStatus: "blocked-on-SRDINV48",
      intent:
        "Promote Thunderwave's failed-save creature push and object/noise outcomes without runtime-owned geometry derivation.",
      rows: srdinv51ThunderwaveRuntimeRows,
      nextAction:
        "Model Constitution save damage, caller-supplied legal pushed positions or blocked-push outcomes, unsecured-object push disposition, audible-boom event evidence, and slot scaling.",
      acceptance:
        "Thunderwave has promoted runtime evidence for damage plus push/noise outcomes, and any push geometry remains caller/table-authored rather than stored as duplicate runtime spatial state.",
    }),
    makeBatch({
      id: "SRDINV52",
      title: "Promote Dissonant Whispers Forced Reaction Movement Runtime",
      suggestedStatus: "blocked-on-SRDINV49",
      intent:
        "Promote Dissonant Whispers' failed-save forced Reaction movement using the movement budget boundary from SRDINV49.",
      rows: srdinv52DissonantWhispersRuntimeRows,
      nextAction:
        "Model Wisdom save damage, failed-save Reaction availability and spend, caller-supplied safest-route movement result, no-Reaction fallback, and Opportunity Attack eligibility from Reaction-based movement.",
      acceptance:
        "Dissonant Whispers has promoted runtime evidence for forced Reaction movement without deriving safest routes or pathfinding inside battle runtime.",
    }),
    makeBatch({
      id: "SRDINV53",
      title: "Promote Jump Movement Replacement Runtime",
      suggestedStatus: "blocked-on-SRDINV49",
      intent:
        "Promote Jump's once-per-turn movement replacement over the movement budget boundary from SRDINV49.",
      rows: srdinv53JumpRuntimeRows,
      nextAction:
        "Model touched willing targets, spell-owned duration, once-per-target-turn use marker, 10-foot Movement spend for up to 30 feet of jump movement, caller-supplied landing facts, and slot-scaled target count.",
      acceptance:
        "Jump has promoted runtime evidence for its movement-spend replacement while jump arc geometry, landing legality, and Difficult Terrain checks remain caller-supplied facts.",
    }),
    makeBatch({
      id: "SRDINV54",
      title: "Research Feather Fall Falling Runtime Boundary",
      suggestedStatus: "done",
      intent:
        "Research the smallest executable falling boundary before promoting Feather Fall's Reaction mitigation.",
      rows: srdinv54FeatherFallRuntimeRows,
      nextAction:
        "Completed: use table-supplied fall-start and landing facts for a focused Feather Fall runtime slice covering falling-trigger discovery, up-to-five falling target admission, descent-rate cap projection, fall-damage prevention, per-target landing cleanup, and Falling-Prone suppression.",
      acceptance:
        "Feather Fall does not need a generic falling hazard simulator before promotion; fall distance, map elevation, and landing geometry remain caller/table-owned.",
    }),
    makeBatch({
      id: "SRDINV55",
      title: "Recursive SRD Inventory Planning Review",
      suggestedStatus: "blocked-on-SRDINV49-SRDINV54",
      intent:
        "Review the movement/action runtime batch before selecting the next spell Surface or runtime frontier.",
      rows: spellPressure,
      nextAction:
        "Refresh spell Unit metrics after SRDINV49-SRDINV54, inspect remaining owner-evidence-required and Surface-widening rows, and append the next concrete batch by execution invariant.",
      acceptance:
        "The review records refreshed metrics and appends Ralph-sized follow-up work rather than collapsing remaining spell pressure into one backlog.",
    }),
  ];
  return withActivePlanStatuses(batches, activePlanTaskStatuses);
}

function buildSrdUnitInventory({
  root,
  inventory,
  unitClaims = [],
  unitEvidence = [],
  characterCreationOwnerEvidence,
  characterSheetOwnerEvidence,
  sharedAlgebraOwnerEvidence,
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
    characterSheetOwnerEvidence,
    sharedAlgebraOwnerEvidence,
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
      characterSheetOwnerEvidence: summarizeCharacterSheetOwnerEvidence(
        root,
        characterSheetOwnerEvidence,
      ),
      sharedAlgebraOwnerEvidence: summarizeSharedAlgebraOwnerEvidence(
        root,
        sharedAlgebraOwnerEvidence,
      ),
    },
    metrics: {
      totalRows: rows.length,
      levelOneRows: levelOneRows.length,
      spellPressureRows: spellPressureRows.length,
      levelOneBattleReadiness: countBattleReadiness(rows),
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
    recommendedBatches: buildRecommendedBatches(
      rows,
      readActivePlanTaskStatuses(root),
    ),
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
    if (
      row.rowKind === "spell-unit-pressure" &&
      (row.levelBand === "spell-level-0" ||
        row.levelBand === "spell-level-1") &&
      row.authoredContent.state === "authored-record-present" &&
      row.catalogAdmission.state === "not-installed"
    ) {
      const reviewed =
        authoredSpellUnitCatalogOnlyClosures.has(row.candidateUnitId) ||
        spellUnitExecutableFollowUps.has(row.candidateUnitId);
      if (!reviewed) {
        issues.push(
          `${row.id} is an authored, not-installed Spell Unit row without SRDINV5D review classification.`,
        );
      }
      if (
        authoredSpellUnitCatalogOnlyClosures.has(row.candidateUnitId) &&
        row.finalDisposition !== "catalog-only/dead-for-now"
      ) {
        issues.push(
          `${row.id} is an authored Spell Unit catalog-only closure but is not classified catalog-only/dead-for-now.`,
        );
      }
      if (
        spellUnitExecutableFollowUps.has(row.candidateUnitId) &&
        row.finalDisposition !== "catalog-authored-executable-follow-up" &&
        row.finalDisposition !== "needs-surface-widening"
      ) {
        issues.push(
          `${row.id} is an authored Spell Unit executable follow-up but is not classified catalog-authored-executable-follow-up or needs-surface-widening.`,
        );
      }
    }
  }
  for (const unitId of authoredSpellUnitCatalogOnlyClosures.keys()) {
    const row = report.rows.find(
      (candidate) =>
        candidate.rowKind === "spell-unit-pressure" &&
        candidate.candidateUnitId === unitId,
    );
    if (row === undefined) {
      issues.push(
        `Authored Spell Unit catalog-only closure references unknown row ${unitId}.`,
      );
      continue;
    }
    if (
      row.authoredContent.state !== "authored-record-present" ||
      row.catalogAdmission.state !== "not-installed"
    ) {
      issues.push(
        `Authored Spell Unit catalog-only closure ${unitId} must reference an authored, not-installed Spell Unit row.`,
      );
    }
  }
  for (const batch of spellUnitExecutableFollowUpBatches) {
    const seenUnitIds = new Set();
    for (const unitId of batch.unitIds) {
      if (seenUnitIds.has(unitId)) {
        issues.push(
          `Spell Unit executable follow-up batch ${batch.id} repeats ${unitId}.`,
        );
      }
      seenUnitIds.add(unitId);
      const row = report.rows.find(
        (candidate) =>
          candidate.rowKind === "spell-unit-pressure" &&
          candidate.candidateUnitId === unitId,
      );
      if (row === undefined) {
        issues.push(
          `Spell Unit executable follow-up batch ${batch.id} references unknown row ${unitId}.`,
        );
        continue;
      }
      if (authoredSpellUnitCatalogOnlyClosures.has(unitId)) {
        issues.push(
          `Spell Unit executable follow-up batch ${batch.id} also marks ${unitId} as catalog-only closure.`,
        );
      }
      if (
        row.authoredContent.state !== "authored-record-present" ||
        row.catalogAdmission.state !== "not-installed"
      ) {
        issues.push(
          `Spell Unit executable follow-up ${unitId} must reference an authored, not-installed Spell Unit row.`,
        );
      }
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
  const sharedAlgebraArtifact =
    report.evidenceArtifacts?.sharedAlgebraOwnerEvidence;
  if (sharedAlgebraArtifact) {
    issues.push(...sharedAlgebraArtifact.issues);
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
  for (const [taskId, rowIds] of Object.entries({
    SRDINV8: srdinv8ClassContainerBlockerIds,
    SRDINV10: srdinv10ClassFeatureBlockerIds,
  })) {
    for (const rowId of rowIds) {
      if (!seen.has(rowId)) {
        issues.push(
          `${taskId} historical row group references unknown row ${rowId}.`,
        );
      }
    }
  }
  const spellUnitRowsByUnitId = new Map(
    report.rows
      .filter((row) => row.rowKind === "spell-unit-pressure")
      .map((row) => [row.candidateUnitId, row]),
  );
  for (const row of report.rows.filter(
    (candidate) =>
      candidate.rowKind === "spell-unit-pressure" &&
      candidate.unitProfileDisposition === "unsupported-profile" &&
      candidate.battleReadinessClosure !== undefined,
  )) {
    if (
      row.authoredContent.state !== "authored-record-present" ||
      row.catalogAdmission.state !== "installed" ||
      row.finalDisposition !== "catalog-only/dead-for-now"
    ) {
      issues.push(
        `Installed Spell Unit catalog-only closure ${row.candidateUnitId} must reference an authored, installed Spell Unit row classified catalog-only/dead-for-now.`,
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
    if (
      row.finalDisposition === "catalog-only/dead-for-now" &&
      row.rowKind !== "spell-unit-pressure" &&
      row.catalogAdmission.state !== "installed" &&
      !catalogOnlyClosures.has(row.id)
    ) {
      issues.push(
        `${row.id} is a nonspell catalog-only closure without an explicit SRDINV6 reason.`,
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
    "### Default Progress Metric: Level-1 Battle Readiness",
    "",
    "This is the default `%` for level-1 readiness questions. A row counts only when the Unit/source fact is loaded, character-creation availability is covered where applicable, and battle-relevant behavior is fully usable in battle. Rows with no battle effect count as accepted only through explicit non-runtime or catalog-only closure.",
    "",
    `- Accepted: ${report.metrics.levelOneBattleReadiness.numerator}/${report.metrics.levelOneBattleReadiness.denominator} (${report.metrics.levelOneBattleReadiness.percent})`,
    "",
    "#### Level-1 Battle Readiness by Status",
    "",
    ...Object.entries(report.metrics.levelOneBattleReadiness.rowsByStatus)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => `- ${key}: ${count}`),
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
    "These batches are generated planning recommendations for a separate SRD inventory Ralph run. Status values mirror `plans/ACTIVE_PLAN.md` when that task is present. They are not QMBT tasks unless a later batch explicitly promotes battle-runtime behavior.",
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
    "| Row | Category | Creation ownership | Surface | Authored | Catalog | Unit profile | Disposition | Battle readiness | Readiness closure | Owner evidence | Next action | Source |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...levelOne.map((row) =>
      [
        row.concept,
        row.category,
        row.characterCreationOwnership?.state ?? "",
        row.surface.state,
        row.authoredContent.state,
        row.catalogAdmission.state,
        row.unitProfileDisposition ?? "",
        row.finalDisposition,
        row.battleReadinessStatus ?? "",
        row.battleReadinessClosure === undefined
          ? ""
          : `${row.battleReadinessClosure.kind}: ${row.battleReadinessClosure.owner}`,
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
