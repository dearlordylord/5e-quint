#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");
const PACKAGES_ROOT = path.join(REPO_ROOT, "packages");
const MBT_TEST_SUFFIX = ".mbt.test.ts";

const DEFAULT_TEST_EXCLUDE_PATTERN = "**/*.mbt.test.ts";
const SELECTED_IDENTITY_VOCABULARY_SCOPES = [
  {
    label: "package source",
    root: path.join(REPO_ROOT, "packages"),
    include: /\.(ts|tsx|js|mjs|cjs|qnt)$/,
  },
  {
    label: "checker scripts",
    root: path.join(REPO_ROOT, "scripts"),
    include: /\.(js|mjs|cjs|ts)$/,
  },
  {
    label: "active planning docs",
    root: path.join(REPO_ROOT, "plans"),
    include: /\.(md|json|jsonl)$/,
  },
  {
    label: "product docs",
    root: path.join(REPO_ROOT, "prd"),
    include: /\.md$/,
  },
];
const SELECTED_IDENTITY_VOCABULARY_EXCLUDED_PATHS = new Set([
  "plans/SELECTED_IDENTITY_EVIDENCE_RECLASSIFICATION_PLAN.md",
  "plans/unit-profile-coverage/SRDINV91D_SELECTED_IDENTITY_MBT_FRONTIER_BATCH.md",
]);
const SELECTED_IDENTITY_VOCABULARY_EXCLUDED_PREFIXES = [
  "plans/ralph-artifacts/",
  "plans/cleanroom-scaffolds/trials/",
];
const FORBIDDEN_SELECTED_IDENTITY_VOCABULARY = [
  {
    pattern: /selected-identity-mbt/,
    reason: "use selected-identity-replay for bookkeeping evidence",
  },
  {
    pattern: /UNIT-IDENTITY-MBT-REPLAY/,
    reason: "use UNIT-IDENTITY-REPLAY for selected identity replay markers",
  },
  {
    pattern: /selected[- ]identity MBT/i,
    reason: "selected identity replay is not MBT by itself",
  },
  {
    pattern: /replays MBT parity/,
    reason: "name deterministic QNT parity or focused MBT explicitly",
  },
  {
    pattern: /selectedIdentityMbt|unitIdentityMbt|MbtReplays/,
    reason: "use selected identity replay names for bookkeeping evidence",
  },
];

const ACCEPTED_MBT_GROUPS = {
  "@dnd/battle-runtime": [
    {
      label: "selected-identity QNT replay owners",
      reason:
        "selected-identity QNT replay owners remain in the explicit MBT lane during replay split migration",
      pattern: /^src\/.*selected-identity\.mbt\.test\.ts$/,
      requiresSelectedIdentityQntReplay: true,
    },
    {
      label: "rule-core witnesses",
      reason:
        "rule-core spell and feature families have package scripts for their split witness groups",
      pattern: /^src\/rule-core-.*\.mbt\.test\.ts$/,
    },
    {
      label: "route and ordering witnesses",
      reason:
        "route/order contract witnesses are grouped by reducer protocol surface",
      pattern: /^src\/.*(?:-route|-routes|-ordering)\.mbt\.test\.ts$/,
    },
    {
      label: "lifecycle witnesses",
      reason:
        "state lifecycle witnesses are grouped by runtime lifecycle protocol",
      pattern: /^src\/.*lifecycle(?:-routes)?\.mbt\.test\.ts$/,
    },
    {
      label: "retired grouped fixture lane",
      reason:
        "AGENTS.md documents this focused grouped battle-runtime lane for legacy fixture coverage",
      files: new Set([
        "src/adrenaline-rush.mbt.test.ts",
        "src/extra-attack-count.mbt.test.ts",
        "src/magic-missile-allocation.mbt.test.ts",
        "src/scalar-buff.mbt.test.ts",
        "src/weapon-attack-skeleton.mbt.test.ts",
      ]),
    },
    {
      label: "single-scenario witness backlog",
      reason:
        "focused one-file witnesses are opt-in by direct vitest file selection until promoted to package scripts",
      files: new Set([
        "src/antimagic-field-action-interdiction.mbt.test.ts",
        "src/antimagic-field-magical-effect-interdiction.mbt.test.ts",
        "src/death-saving-throw.mbt.test.ts",
        "src/dragonborn-breath-weapon-runtime.mbt.test.ts",
        "src/eldritch-blast.mbt.test.ts",
        "src/paladin-sacred-weapon-activation.mbt.test.ts",
        "src/reducer-spine-contract.mbt.test.ts",
        "src/rogue-steady-aim.mbt.test.ts",
        "src/sleep-repeat-save.mbt.test.ts",
        "src/spiritual-weapon.mbt.test.ts",
        "src/starry-wisp-object.mbt.test.ts",
        "src/stat-block-multi-damage.mbt.test.ts",
        "src/stat-block-size-gated-condition-rider.mbt.test.ts",
      ]),
    },
  ],
  "@dnd/character-battle-runtime": [
    {
      label: "selected-identity QNT replay owners",
      reason: "character-to-battle selected-identity QNT replay owners are grouped",
      pattern: /^src\/.*selected-identity\.mbt\.test\.ts$/,
      requiresSelectedIdentityQntReplay: true,
    },
    {
      label: "character battle projection witnesses",
      reason:
        "character battle handoff/projection witnesses share one package boundary",
      files: new Set([
        "src/character-battle-init-projection.mbt.test.ts",
        "src/character-battle-settlement.mbt.test.ts",
        "src/character-layer-projection-lifecycle.mbt.test.ts",
        "src/character-sheet-feature-resources.mbt.test.ts",
      ]),
    },
  ],
  "@dnd/character-creation-runtime": [
    {
      label: "selected-identity QNT replay owners",
      reason: "character creation selected-identity QNT replay owners are grouped",
      pattern: /^src\/.*selected-identity\.mbt\.test\.ts$/,
      requiresSelectedIdentityQntReplay: true,
    },
    {
      label: "character creation projection and route witnesses",
      reason:
        "projection and reducer-route witnesses share the character creation package boundary",
      files: new Set([
        "src/character-creation-runtime.mbt.test.ts",
        "src/class-feature-projections.mbt.test.ts",
        "src/reducer-route-connectors.mbt.test.ts",
      ]),
    },
  ],
  "@dnd/character-sheet-runtime": [
    {
      label: "selected-identity QNT replay owners",
      reason: "character sheet selected-identity QNT replay owners are grouped",
      pattern: /^src\/.*selected-identity\.mbt\.test\.ts$/,
      requiresSelectedIdentityQntReplay: true,
    },
    {
      label: "character sheet projection and resource witnesses",
      reason:
        "sheet-derived proficiency, resource, rest, and hit-point witnesses share the sheet runtime package boundary",
      files: new Set([
        "src/ability-check-proficiency-bonus.mbt.test.ts",
        "src/hit-point-maximum.mbt.test.ts",
        "src/hp-rest-hit-dice.mbt.test.ts",
        "src/reducer-route-connectors.mbt.test.ts",
        "src/spell-rest-benefit-application.mbt.test.ts",
        "src/spell-slots-pact-slots.mbt.test.ts",
      ]),
    },
  ],
};

function listPackageJsonFiles() {
  return fs
    .readdirSync(PACKAGES_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(PACKAGES_ROOT, entry.name, "package.json"))
    .filter((file) => fs.existsSync(file))
    .sort();
}

function readPackage(packageJsonPath) {
  const json = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const packageRoot = path.dirname(packageJsonPath);
  return {
    name: json.name,
    root: packageRoot,
    scripts: json.scripts ?? {},
  };
}

function toPackagePath(pkg, filePath) {
  return path.relative(pkg.root, filePath).split(path.sep).join("/");
}

function listFiles(dir, predicate) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath, predicate));
      continue;
    }
    if (entry.isFile() && predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function selectedIdentityVocabularyFailures() {
  const failures = [];
  for (const scope of SELECTED_IDENTITY_VOCABULARY_SCOPES) {
    for (const filePath of listFiles(scope.root, (file) =>
      scope.include.test(file),
    )) {
      const repoPath = path.relative(REPO_ROOT, filePath).split(path.sep).join("/");
      if (repoPath === "scripts/check-mbt-test-lanes.cjs") continue;
      if (SELECTED_IDENTITY_VOCABULARY_EXCLUDED_PATHS.has(repoPath)) continue;
      if (
        SELECTED_IDENTITY_VOCABULARY_EXCLUDED_PREFIXES.some((prefix) =>
          repoPath.startsWith(prefix),
        )
      ) {
        continue;
      }
      const text = fs.readFileSync(filePath, "utf8");
      for (const rule of FORBIDDEN_SELECTED_IDENTITY_VOCABULARY) {
        if (rule.pattern.test(text)) {
          failures.push(`${repoPath}: ${rule.reason}`);
        }
      }
      if (
        repoPath !== "packages/battle-runtime/src/selected-identity-witness.ts" &&
        /defineSelectedIdentityWitness\s*\(/.test(text)
      ) {
        failures.push(
          `${repoPath}: use defineSelectedIdentityReplayWitness, defineSelectedIdentityQntReplay, or defineSelectedIdentityReplayAndQntReplay`,
        );
      }
    }
  }
  return failures;
}

function listMbtTests(pkg) {
  return listFiles(pkg.root, (filePath) =>
    path.basename(filePath).endsWith(MBT_TEST_SUFFIX),
  ).map((filePath) => toPackagePath(pkg, filePath));
}

function listQntReplaySupportFiles() {
  return listFiles(PACKAGES_ROOT, (filePath) =>
    path.basename(filePath).endsWith(".qnt-replay.test-support.ts"),
  );
}

function relativeTsImports(text) {
  return [
    ...text.matchAll(/from\s+"(\.{1,2}\/[^"]+\.ts)"/g),
    ...text.matchAll(/import\s*\(\s*"(\.{1,2}\/[^"]+\.ts)"\s*\)/g),
  ].map((match) => match[1]);
}

function importedTsFilesFromMbtTests(packages) {
  const importedFiles = new Set();
  for (const pkg of packages) {
    for (const file of listMbtTests(pkg)) {
      const filePath = path.join(pkg.root, ...file.split("/"));
      const text = fs.readFileSync(filePath, "utf8");
      for (const importPath of relativeTsImports(text)) {
        importedFiles.add(path.resolve(path.dirname(filePath), importPath));
      }
    }
  }
  return importedFiles;
}

function qntReplaySupportFailures(packages) {
  const importedFiles = importedTsFilesFromMbtTests(packages);
  return listQntReplaySupportFiles()
    .filter((filePath) => !importedFiles.has(filePath))
    .map(
      (filePath) =>
        `${path.relative(REPO_ROOT, filePath).split(path.sep).join("/")}: QNT replay support files must be imported by a runnable .mbt.test.ts owner.`,
    );
}

function listVitestConfigs(pkg) {
  return [
    "vitest.config.ts",
    "vitest.config.mts",
    "vitest.config.cts",
    "vitest.config.js",
    "vitest.config.mjs",
    "vitest.config.cjs",
    "vite.config.ts",
    "vite.config.mts",
    "vite.config.cts",
    "vite.config.js",
    "vite.config.mjs",
    "vite.config.cjs",
  ].filter((file) => fs.existsSync(path.join(pkg.root, file)));
}

function commandHasMbtExclude(command) {
  return (
    command.includes("--exclude") &&
    command.includes(DEFAULT_TEST_EXCLUDE_PATTERN)
  );
}

function configHasMbtExclude(pkg) {
  return listVitestConfigs(pkg).some((config) => {
    const configText = fs.readFileSync(path.join(pkg.root, config), "utf8");
    const testObject = objectLiteralForProperty(configText, "test");
    return (
      testObject != null &&
      topLevelPropertyContains(
        testObject,
        "exclude",
        DEFAULT_TEST_EXCLUDE_PATTERN,
      )
    );
  });
}

function commandExplicitlyTargetsMbt(command) {
  const commandWithoutMbtExcludes = command.replace(
    /--exclude\s+(?:"\*\*\/\*\.mbt\.test\.ts"|'(?:\*\*\/\*\.mbt\.test\.ts)'|\*\*\/\*\.mbt\.test\.ts)/g,
    "",
  );
  return /\.mbt\.test\.[cm]?tsx?\b/.test(commandWithoutMbtExcludes);
}

function objectLiteralForProperty(text, propertyName) {
  const propertyPattern = new RegExp(`\\b${propertyName}\\s*:`);
  const propertyMatch = propertyPattern.exec(text);
  if (propertyMatch == null) return null;

  const openBraceIndex = text.indexOf("{", propertyMatch.index);
  if (openBraceIndex < 0) return null;

  const closeBraceIndex = matchingDelimiterIndex(
    text,
    openBraceIndex,
    "{",
    "}",
  );
  if (closeBraceIndex == null) return null;

  return text.slice(openBraceIndex + 1, closeBraceIndex);
}

function topLevelPropertyContains(objectText, propertyName, needle) {
  for (const property of topLevelProperties(objectText)) {
    if (property.name === propertyName && property.value.includes(needle)) {
      return true;
    }
  }

  return false;
}

function topLevelProperties(objectText) {
  const properties = [];
  let index = 0;

  while (index < objectText.length) {
    const propertyStart = nextNonWhitespaceIndex(objectText, index);
    if (propertyStart == null) break;

    const nameMatch = /^["']?([A-Za-z_$][\w$-]*)["']?\s*:/.exec(
      objectText.slice(propertyStart),
    );
    if (nameMatch == null) {
      index = propertyStart + 1;
      continue;
    }

    const name = nameMatch[1];
    const valueStart = propertyStart + nameMatch[0].length;
    const valueEnd = topLevelValueEnd(objectText, valueStart);
    properties.push({
      name,
      value: objectText.slice(valueStart, valueEnd),
    });
    index = valueEnd + 1;
  }

  return properties;
}

function topLevelValueEnd(text, valueStart) {
  let index = valueStart;
  let quote = null;
  let depth = 0;

  while (index < text.length) {
    const char = text[index];
    if (quote != null) {
      if (char === "\\" && index + 1 < text.length) {
        index += 2;
        continue;
      }
      if (char === quote) quote = null;
      index += 1;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      index += 1;
      continue;
    }

    if (char === "{" || char === "[" || char === "(") {
      depth += 1;
      index += 1;
      continue;
    }

    if (char === "}" || char === "]" || char === ")") {
      depth -= 1;
      index += 1;
      continue;
    }

    if (char === "," && depth === 0) {
      return index;
    }

    index += 1;
  }

  return text.length;
}

function matchingDelimiterIndex(
  text,
  openIndex,
  openDelimiter,
  closeDelimiter,
) {
  let quote = null;
  let depth = 0;

  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index];
    if (quote != null) {
      if (char === "\\" && index + 1 < text.length) {
        index += 1;
        continue;
      }
      if (char === quote) quote = null;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === openDelimiter) {
      depth += 1;
      continue;
    }

    if (char === closeDelimiter) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return null;
}

function nextNonWhitespaceIndex(text, start) {
  for (let index = start; index < text.length; index += 1) {
    if (!/\s/.test(text[index])) return index;
  }

  return null;
}

function extractScriptMbtTargets(pkg, scriptName, command) {
  const targets = [];
  const targetPattern = /(?:^|[\s"'])([^"'\s]+\.mbt\.test\.ts)\b/g;
  let match;
  while ((match = targetPattern.exec(command)) !== null) {
    const rawTarget = match[1];
    const normalized = path.normalize(rawTarget).split(path.sep).join("/");
    targets.push({
      file: normalized,
      scriptName,
    });
  }

  return targets.filter((target) =>
    fs.existsSync(path.join(pkg.root, ...target.file.split("/"))),
  );
}

function explicitMbtTargets(pkg) {
  const targets = new Map();

  for (const [scriptName, command] of Object.entries(pkg.scripts)) {
    if (!scriptName.startsWith("test:mbt")) continue;
    for (const target of extractScriptMbtTargets(pkg, scriptName, command)) {
      if (!targets.has(target.file)) {
        targets.set(target.file, []);
      }
      targets.get(target.file).push(target.scriptName);
    }
  }

  return targets;
}

function matchingGroup(pkg, file) {
  for (const group of ACCEPTED_MBT_GROUPS[pkg.name] ?? []) {
    if (
      (group.files?.has(file) || group.pattern?.test(file)) &&
      acceptedGroupFileShape(pkg, file, group)
    ) {
      return group;
    }
  }

  return null;
}

function acceptedGroupFileShape(pkg, file, group) {
  if (group.requiresSelectedIdentityQntReplay !== true) return true;
  const text = fs.readFileSync(path.join(pkg.root, ...file.split("/")), "utf8");
  const hasQntReplayMarker = /UNIT-IDENTITY-QNT-REPLAY:/.test(text);
  const hasLegacyReplayMarker = /UNIT-IDENTITY-REPLAY:/.test(text);
  const hasSplitQntHelper = /defineSelectedIdentityQntReplay\s*\(/.test(text);
  const hasCombinedQntHelper =
    /defineSelectedIdentityReplayAndQntReplay\s*\(/.test(text);
  const hasHandRolledQntReplay =
    /\brun\s*\(\s*\{/.test(text) && /\bstateCheck\s*:/.test(text);
  const hasQntReplayShape =
    hasSplitQntHelper || hasCombinedQntHelper || hasHandRolledQntReplay;
  return (hasQntReplayMarker || hasLegacyReplayMarker) && hasQntReplayShape;
}

function groupCounts(pkg, files, explicitTargets) {
  const counts = new Map();

  for (const file of files) {
    if (explicitTargets.has(file)) continue;
    const group = matchingGroup(pkg, file);
    if (group == null) continue;
    counts.set(group.label, {
      reason: group.reason,
      count: (counts.get(group.label)?.count ?? 0) + 1,
    });
  }

  return counts;
}

function runTestLaneHygiene() {
  const packages = listPackageJsonFiles().map(readPackage);
  const failures = [
    ...selectedIdentityVocabularyFailures(),
    ...qntReplaySupportFailures(packages),
  ];

  console.log("Default test lane hygiene:");

  for (const pkg of packages) {
    const mbtTests = listMbtTests(pkg);
    const testScript = pkg.scripts.test;
    const hasMbtExclude =
      typeof testScript === "string" && commandHasMbtExclude(testScript);
    const hasConfigExclude = configHasMbtExclude(pkg);

    if (mbtTests.length === 0) {
      console.log(`- ${pkg.name}: 0 MBT tests`);
      continue;
    }

    console.log(`- ${pkg.name}: ${mbtTests.length} MBT tests`);

    if (typeof testScript !== "string") {
      failures.push(`${pkg.name}: package has MBT tests but no test script.`);
      continue;
    }

    if (commandExplicitlyTargetsMbt(testScript)) {
      failures.push(`${pkg.name}: default test script targets an MBT file.`);
    }

    if (!hasMbtExclude && !hasConfigExclude) {
      failures.push(
        `${pkg.name}: default test script/config does not exclude ${DEFAULT_TEST_EXCLUDE_PATTERN}.`,
      );
    }
  }

  if (failures.length > 0) {
    console.error("\nTest lane hygiene failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    "\nAll packages with MBT tests exclude MBT from default test lanes.",
  );
}

function runMbtScriptInventory() {
  const packages = listPackageJsonFiles().map(readPackage);
  const failures = [];

  console.log("MBT script inventory:");

  for (const pkg of packages) {
    const mbtTests = listMbtTests(pkg);
    if (mbtTests.length === 0) continue;

    const explicitTargets = explicitMbtTargets(pkg);
    const groups = groupCounts(pkg, mbtTests, explicitTargets);
    const uncovered = mbtTests.filter(
      (file) => !explicitTargets.has(file) && matchingGroup(pkg, file) == null,
    );

    console.log(`- ${pkg.name}: ${mbtTests.length} MBT tests`);
    console.log(`  explicit script targets: ${explicitTargets.size}`);

    for (const [label, details] of groups) {
      console.log(`  grouped ${label}: ${details.count} (${details.reason})`);
    }

    if (uncovered.length > 0) {
      failures.push({
        packageName: pkg.name,
        files: uncovered,
      });
    }
  }

  if (failures.length > 0) {
    console.error("\nMBT script inventory failed:");
    for (const failure of failures) {
      console.error(`- ${failure.packageName}: missing MBT lane/grouping`);
      for (const file of failure.files) {
        console.error(`  - ${file}`);
      }
    }
    process.exitCode = 1;
    return;
  }

  console.log(
    "\nEvery MBT file is covered by an explicit test:mbt script or an accepted grouping rationale.",
  );
}

const mode = process.argv[2];

if (mode === "test-lane-hygiene") {
  runTestLaneHygiene();
} else if (mode === "mbt-script-inventory") {
  runMbtScriptInventory();
} else {
  console.error(
    "Usage: node scripts/check-mbt-test-lanes.cjs <test-lane-hygiene|mbt-script-inventory>",
  );
  process.exitCode = 1;
}
