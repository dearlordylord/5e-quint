#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");
const PACKAGES_ROOT = path.join(REPO_ROOT, "packages");
const SURFACE_CONTENT_ROOT = path.join(PACKAGES_ROOT, "surface", "content");

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts"];
const SOURCE_EXTENSION_SET = new Set(SOURCE_EXTENSIONS);

const EXCLUDED_PATH_RULES = [
  {
    reason: "test-fixture-boundary",
    pattern:
      /(?:\.test\.[cm]?tsx?$|\.mbt\.test\.[cm]?tsx?$|\/test-support\/|\/__tests__\/)/,
  },
  {
    reason: "non-source-artifact",
    pattern: /\/(?:node_modules|dist|coverage)\//,
  },
];

const ALLOWLIST_PATH_RULES = [
  {
    reason: "catalog-boundary",
    pattern:
      /^packages\/surface\/src\/surface\/(?:unit-catalog|stat-block-catalog|schema-nonspell|types)\.ts$/,
  },
  {
    reason: "composition-selection-boundary",
    pattern: /^packages\/mcp\/src\/(?:composition-root|content-tools)\.ts$/,
  },
  {
    reason: "fixture-boundary",
    pattern: /^packages\/app\/src\/components\/trace-visualizer\//,
  },
  {
    reason: "character-creation-support-profile-boundary",
    pattern:
      /^packages\/character-creation-runtime\/src\/(?:phase1-manifest|support-gates)\.ts$/,
  },
  {
    reason: "battle-runtime-spell-access-boundary",
    pattern: /^packages\/battle-runtime\/src\/character-battle-resources\.ts$/,
  },
  {
    reason: "battle-runtime-unit-profile-admission-test-support-boundary",
    pattern:
      /^packages\/battle-runtime\/src\/unit-profile-admission-spell-fill-support\.ts$/,
  },
];

function escapeForRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function listFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (SOURCE_EXTENSION_SET.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function listSurfaceContentFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listSurfaceContentFiles(fullPath));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (path.extname(entry.name) === ".json") {
      files.push(fullPath);
    }
  }

  return files;
}

function classifyPath(relativePath, rules) {
  for (const rule of rules) {
    if (rule.pattern.test(relativePath)) {
      return rule.reason;
    }
  }

  return null;
}

function hasIdLikeToken(text) {
  return /\b(?:id|[A-Za-z_$][\w$]*Id)\b/.test(text);
}

function lineNumberForIndex(content, index) {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content.charCodeAt(i) === 10) {
      line += 1;
    }
  }
  return line;
}

function countChar(text, char) {
  let count = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === char) {
      count += 1;
    }
  }
  return count;
}

function extractParenthesizedExpression(text, openIndex) {
  if (openIndex < 0 || text[openIndex] !== "(") {
    return null;
  }

  let depth = 0;
  for (let i = openIndex; i < text.length; i += 1) {
    const char = text[i];
    if (char === "(") {
      depth += 1;
      continue;
    }
    if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(openIndex + 1, i);
      }
    }
  }

  return null;
}

function collectAuthoredIds() {
  if (!fs.existsSync(SURFACE_CONTENT_ROOT)) {
    throw new Error(
      "authored-id boundary check: surface content directory not found",
    );
  }

  const ids = new Set();
  const malformedContentFiles = [];

  function collectIdsFromValue(value, depth) {
    if (Array.isArray(value)) {
      for (const item of value) {
        collectIdsFromValue(item, depth + 1);
      }
      return;
    }

    if (value == null || typeof value !== "object") {
      return;
    }

    for (const [key, nestedValue] of Object.entries(value)) {
      const isTopLevelRecordId = depth === 0 && key === "id";
      const isAuthoredReferenceId = key.endsWith("Id") && key !== "holeId";

      if (
        (isTopLevelRecordId || isAuthoredReferenceId) &&
        typeof nestedValue === "string" &&
        nestedValue.length > 0
      ) {
        ids.add(nestedValue);
      }

      collectIdsFromValue(nestedValue, depth + 1);
    }
  }

  for (const filePath of listSurfaceContentFiles(SURFACE_CONTENT_ROOT)) {
    const relativePath = path
      .relative(REPO_ROOT, filePath)
      .replaceAll(path.sep, "/");

    const content = fs.readFileSync(filePath, "utf8");
    try {
      const parsed = JSON.parse(content);
      collectIdsFromValue(parsed, 0);
    } catch {
      malformedContentFiles.push(relativePath);
    }
  }

  return {
    ids,
    malformedContentFiles,
  };
}

function collectDispatchContainerUsages(content) {
  const usages = [];

  const membershipRegex =
    /\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s*\.\s*(?:includes|has|indexOf|get)\s*\(\s*([^)]*?)\s*\)/g;
  for (;;) {
    const match = membershipRegex.exec(content);
    if (match == null) {
      break;
    }

    const container = match[1];
    const argument = match[2] ?? "";
    if (container == null || !hasIdLikeToken(argument)) {
      continue;
    }

    usages.push({
      container,
      index: match.index,
      detail: match[0],
    });
  }

  const indexRegex =
    /\b([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)?)\s*\[\s*([^\]]+?)\s*\]/g;
  for (;;) {
    const match = indexRegex.exec(content);
    if (match == null) {
      break;
    }

    const container = match[1];
    const indexExpression = match[2] ?? "";
    if (container == null || !hasIdLikeToken(indexExpression)) {
      continue;
    }

    usages.push({
      container,
      index: match.index,
      detail: match[0],
    });
  }

  return usages;
}

function collectDispatchContainerNamesFromUsages(dispatchContainerUsages) {
  const names = new Set();

  for (const usage of dispatchContainerUsages) {
    names.add(usage.container);
    names.add(usage.container.split(".")[0]);
  }

  return names;
}

function collectLiteralAliasMap(content, authoredAlternation) {
  const aliases = new Map();
  const aliasRegex = new RegExp(
    `\\b(?:const|let|var)\\s+([A-Za-z_$][\\w$]*)\\s*=\\s*(["'\\x60])(${authoredAlternation})\\2`,
    "g",
  );

  for (;;) {
    const match = aliasRegex.exec(content);
    if (match == null) {
      break;
    }

    const aliasName = match[1];
    const literal = match[3];
    if (aliasName == null || literal == null) {
      continue;
    }
    aliases.set(aliasName, literal);
  }

  return aliases;
}

function collectLocalAuthoredContainerMap(
  content,
  authoredAlternation,
  literalAliases,
) {
  const authoredTokenRegex = new RegExp(`\\b(${authoredAlternation})\\b`);
  const declarationRegex =
    /\b(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*([\s\S]*?)(?=;|\n\s*(?:(?:export\s+)?(?:const|let|var|function|class|type|interface|enum)\b)|$)/g;
  const localContainers = new Map();

  for (;;) {
    const declarationMatch = declarationRegex.exec(content);
    if (declarationMatch == null) {
      break;
    }

    const variableName = declarationMatch[1];
    const initializer = declarationMatch[2] ?? "";
    if (variableName == null) {
      continue;
    }

    const initializerStart =
      declarationMatch.index + declarationMatch[0].indexOf(initializer);

    const authoredMatch = authoredTokenRegex.exec(initializer);
    if (authoredMatch != null) {
      const literal = authoredMatch[1] ?? "";
      localContainers.set(variableName, {
        literal,
        index: initializerStart + authoredMatch.index,
        source: "literal",
      });
      continue;
    }

    for (const [aliasName, aliasLiteral] of literalAliases.entries()) {
      const aliasUsageRegex = new RegExp(`\\b${escapeForRegExp(aliasName)}\\b`);
      const aliasUsage = aliasUsageRegex.exec(initializer);
      if (aliasUsage == null) {
        continue;
      }

      localContainers.set(variableName, {
        literal: aliasLiteral,
        index: initializerStart + aliasUsage.index,
        source: `alias ${aliasName}`,
      });
      break;
    }
  }

  return localContainers;
}

function collectExportedAuthoredContainers(content, localAuthoredContainers) {
  const exported = new Map();

  const directExportRegex =
    /\bexport\s+(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/g;
  for (;;) {
    const match = directExportRegex.exec(content);
    if (match == null) {
      break;
    }

    const localName = match[1];
    if (localName == null) {
      continue;
    }

    const info = localAuthoredContainers.get(localName);
    if (info != null) {
      exported.set(localName, info);
    }
  }

  const namedExportRegex =
    /\bexport\s*{\s*([^}]+)\s*}(?:\s*from\s*(["'\x60])([^"'\x60]+)\2)?/g;
  for (;;) {
    const match = namedExportRegex.exec(content);
    if (match == null) {
      break;
    }

    const fromSpecifier = match[3] ?? null;
    if (fromSpecifier != null) {
      // Re-exports are intentionally ignored here to keep resolution local.
      continue;
    }

    const entriesRaw = match[1] ?? "";
    for (const rawEntry of entriesRaw.split(",")) {
      const entry = rawEntry.trim();
      if (entry.length === 0) {
        continue;
      }

      const entryMatch =
        /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/.exec(entry);
      if (entryMatch == null) {
        continue;
      }

      const localName = entryMatch[1];
      const exportName = entryMatch[2] ?? localName;
      if (localName == null || exportName == null) {
        continue;
      }

      const info = localAuthoredContainers.get(localName);
      if (info != null) {
        exported.set(exportName, info);
      }
    }
  }

  return exported;
}

function resolveImportSpecifier(relativePath, specifier, sourceFilesSet) {
  if (!specifier.startsWith(".")) {
    return null;
  }

  const importerDir = path.dirname(relativePath);
  const moduleBase = path
    .normalize(path.join(importerDir, specifier))
    .replaceAll(path.sep, "/");

  const candidates = [moduleBase];
  for (const extension of SOURCE_EXTENSIONS) {
    candidates.push(`${moduleBase}${extension}`);
  }
  for (const extension of SOURCE_EXTENSIONS) {
    candidates.push(`${moduleBase}/index${extension}`);
  }

  for (const candidate of candidates) {
    if (sourceFilesSet.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

function collectImportedAuthoredBindings(
  content,
  relativePath,
  sourceFilesSet,
  authoredExportsByFile,
) {
  const importedLiteralAliases = new Map();
  const importedContainers = new Map();
  const importedNamespaceContainers = new Map();

  const importRegex =
    /\bimport\s+([\s\S]*?)\s+from\s*(["'\x60])([^"'\x60]+)\2/g;
  for (;;) {
    const match = importRegex.exec(content);
    if (match == null) {
      break;
    }

    const clause = (match[1] ?? "").trim();
    const specifier = match[3] ?? "";
    const resolvedImport = resolveImportSpecifier(
      relativePath,
      specifier,
      sourceFilesSet,
    );
    if (resolvedImport == null) {
      continue;
    }

    const exportedContainers = authoredExportsByFile.get(resolvedImport);
    if (exportedContainers == null || exportedContainers.size === 0) {
      continue;
    }

    const namespaceMatch =
      /(?:^|,)\s*\*\s+as\s+([A-Za-z_$][\w$]*)\s*(?:,|$)/.exec(clause);
    if (namespaceMatch != null) {
      const namespaceName = namespaceMatch[1];
      if (namespaceName != null) {
        importedNamespaceContainers.set(namespaceName, exportedContainers);
      }
    }

    const namedBlockMatch = /{([\s\S]+)}/.exec(clause);
    if (namedBlockMatch == null) {
      continue;
    }

    const namedEntries = namedBlockMatch[1] ?? "";
    for (const rawEntry of namedEntries.split(",")) {
      const entry = rawEntry.trim();
      if (entry.length === 0) {
        continue;
      }

      const entryMatch =
        /^([A-Za-z_$][\w$]*)(?:\s+as\s+([A-Za-z_$][\w$]*))?$/.exec(entry);
      if (entryMatch == null) {
        continue;
      }

      const importedName = entryMatch[1];
      const localName = entryMatch[2] ?? importedName;
      if (importedName == null || localName == null) {
        continue;
      }

      const exportedInfo = exportedContainers.get(importedName);
      if (exportedInfo == null) {
        continue;
      }

      importedLiteralAliases.set(localName, exportedInfo.literal);
      importedContainers.set(localName, {
        literal: exportedInfo.literal,
        sourceFile: resolvedImport,
        sourceExportName: importedName,
      });
    }
  }

  return {
    importedLiteralAliases,
    importedContainers,
    importedNamespaceContainers,
  };
}

function collectComparisonViolations(
  content,
  relativePath,
  authoredAlternation,
  literalAliases,
) {
  const violations = [];

  const authoredOnRight = new RegExp(
    `\\b([A-Za-z_$][\\w$.]*)\\s*(===|==|!==|!=)\\s*(["'\\x60])(${authoredAlternation})\\3`,
    "g",
  );
  for (;;) {
    const match = authoredOnRight.exec(content);
    if (match == null) {
      break;
    }

    const identifierExpression = match[1] ?? "";
    const literal = match[4] ?? "";
    if (!hasIdLikeToken(identifierExpression)) {
      continue;
    }

    violations.push({
      relativePath,
      line: lineNumberForIndex(content, match.index),
      literal,
      context: {
        kind: "id-comparison",
        detail: match[0],
      },
    });
  }

  const authoredOnLeft = new RegExp(
    `(["'\\x60])(${authoredAlternation})\\1\\s*(===|==|!==|!=)\\s*([A-Za-z_$][\\w$.]*)`,
    "g",
  );
  for (;;) {
    const match = authoredOnLeft.exec(content);
    if (match == null) {
      break;
    }

    const literal = match[2] ?? "";
    const identifierExpression = match[4] ?? "";
    if (!hasIdLikeToken(identifierExpression)) {
      continue;
    }

    violations.push({
      relativePath,
      line: lineNumberForIndex(content, match.index),
      literal,
      context: {
        kind: "id-comparison",
        detail: match[0],
      },
    });
  }

  const aliasOnRight =
    /\b([A-Za-z_$][\w$.]*)\s*(===|==|!==|!=)\s*([A-Za-z_$][\w$]*)\b/g;
  for (;;) {
    const match = aliasOnRight.exec(content);
    if (match == null) {
      break;
    }

    const identifierExpression = match[1] ?? "";
    const aliasName = match[3] ?? "";
    const literal = literalAliases.get(aliasName);
    if (literal == null || !hasIdLikeToken(identifierExpression)) {
      continue;
    }

    violations.push({
      relativePath,
      line: lineNumberForIndex(content, match.index),
      literal,
      context: {
        kind: "id-comparison-alias",
        detail: `${match[0]} -> ${aliasName}="${literal}"`,
      },
    });
  }

  const aliasOnLeft =
    /\b([A-Za-z_$][\w$]*)\s*(===|==|!==|!=)\s*([A-Za-z_$][\w$.]*)\b/g;
  for (;;) {
    const match = aliasOnLeft.exec(content);
    if (match == null) {
      break;
    }

    const aliasName = match[1] ?? "";
    const identifierExpression = match[3] ?? "";
    const literal = literalAliases.get(aliasName);
    if (literal == null || !hasIdLikeToken(identifierExpression)) {
      continue;
    }

    violations.push({
      relativePath,
      line: lineNumberForIndex(content, match.index),
      literal,
      context: {
        kind: "id-comparison-alias",
        detail: `${match[0]} -> ${aliasName}="${literal}"`,
      },
    });
  }

  return violations;
}

function switchExpressionBeforeCase(content, caseIndex) {
  const switchSearchWindow = content.slice(
    Math.max(0, caseIndex - 5000),
    caseIndex,
  );
  const switchLocalIndex = switchSearchWindow.lastIndexOf("switch");

  if (switchLocalIndex < 0) {
    return null;
  }

  const switchIndex = Math.max(0, caseIndex - 5000) + switchLocalIndex;
  const switchSnippet = content.slice(switchIndex, caseIndex);

  if (countChar(switchSnippet, "{") <= countChar(switchSnippet, "}")) {
    return null;
  }

  const openParenIndex = switchSnippet.indexOf("(");
  return extractParenthesizedExpression(switchSnippet, openParenIndex);
}

function collectSwitchViolations(
  content,
  relativePath,
  authoredAlternation,
  literalAliases,
) {
  const violations = [];
  const caseRegex = new RegExp(
    `case\\s*(["'\\x60])(${authoredAlternation})\\1\\s*:`,
    "g",
  );

  for (;;) {
    const match = caseRegex.exec(content);
    if (match == null) {
      break;
    }

    const literal = match[2] ?? "";
    const caseIndex = match.index;
    const expression = switchExpressionBeforeCase(content, caseIndex);
    if (expression == null || !hasIdLikeToken(expression)) {
      continue;
    }

    violations.push({
      relativePath,
      line: lineNumberForIndex(content, caseIndex),
      literal,
      context: {
        kind: "switch-id-branch",
        detail: `switch(${expression.trim()})`,
      },
    });
  }

  const caseAliasRegex = /case\s*([A-Za-z_$][\w$]*)\s*:/g;
  for (;;) {
    const match = caseAliasRegex.exec(content);
    if (match == null) {
      break;
    }

    const aliasName = match[1] ?? "";
    const literal = literalAliases.get(aliasName);
    if (literal == null) {
      continue;
    }

    const caseIndex = match.index;
    const expression = switchExpressionBeforeCase(content, caseIndex);
    if (expression == null || !hasIdLikeToken(expression)) {
      continue;
    }

    violations.push({
      relativePath,
      line: lineNumberForIndex(content, caseIndex),
      literal,
      context: {
        kind: "switch-id-branch-alias",
        detail: `switch(${expression.trim()}) case ${aliasName}`,
      },
    });
  }

  return violations;
}

function collectDispatchContainerViolations(
  content,
  relativePath,
  dispatchContainerUsages,
  dispatchContainerNames,
  localAuthoredContainers,
  importedContainers,
  importedNamespaceContainers,
) {
  if (
    dispatchContainerUsages.length === 0 &&
    dispatchContainerNames.size === 0
  ) {
    return [];
  }

  const violations = [];

  for (const [variableName, info] of localAuthoredContainers.entries()) {
    if (!dispatchContainerNames.has(variableName)) {
      continue;
    }

    violations.push({
      relativePath,
      line: lineNumberForIndex(content, info.index),
      literal: info.literal,
      context: {
        kind: "dispatch-container",
        detail: `${variableName} (${info.source})`,
      },
    });
  }

  for (const usage of dispatchContainerUsages) {
    const containerRoot = usage.container.split(".")[0];
    if (containerRoot == null) {
      continue;
    }

    const importedContainer = importedContainers.get(containerRoot);
    if (importedContainer != null) {
      violations.push({
        relativePath,
        line: lineNumberForIndex(content, usage.index),
        literal: importedContainer.literal,
        context: {
          kind: "dispatch-imported-container",
          detail: `${usage.detail} via ${containerRoot} from ${importedContainer.sourceFile}:${importedContainer.sourceExportName}`,
        },
      });
      continue;
    }

    const namespaceExports = importedNamespaceContainers.get(containerRoot);
    const containerSegments = usage.container.split(".");
    const namespaceMember =
      containerSegments.length > 1 ? containerSegments[1] : null;
    if (namespaceExports == null || namespaceMember == null) {
      continue;
    }

    const namespaceContainerInfo = namespaceExports.get(namespaceMember);
    if (namespaceContainerInfo == null) {
      continue;
    }

    violations.push({
      relativePath,
      line: lineNumberForIndex(content, usage.index),
      literal: namespaceContainerInfo.literal,
      context: {
        kind: "dispatch-imported-namespace-container",
        detail: `${usage.detail} via ${containerRoot}.${namespaceMember}`,
      },
    });
  }

  return violations;
}

function dedupeViolations(violations) {
  const unique = new Map();

  for (const violation of violations) {
    const key = `${violation.relativePath}:${violation.line}:${violation.literal}:${violation.context.kind}:${violation.context.detail}`;
    if (!unique.has(key)) {
      unique.set(key, violation);
    }
  }

  return Array.from(unique.values()).sort((left, right) => {
    if (left.relativePath !== right.relativePath) {
      return left.relativePath.localeCompare(right.relativePath);
    }
    if (left.line !== right.line) {
      return left.line - right.line;
    }
    if (left.literal !== right.literal) {
      return left.literal.localeCompare(right.literal);
    }
    return left.context.kind.localeCompare(right.context.kind);
  });
}

function findViolationsForFile(
  relativePath,
  content,
  authoredAlternation,
  sourceFilesSet,
  authoredExportsByFile,
) {
  const dispatchContainerUsages = collectDispatchContainerUsages(content);
  const dispatchContainerNames = collectDispatchContainerNamesFromUsages(
    dispatchContainerUsages,
  );

  const localLiteralAliases = collectLiteralAliasMap(
    content,
    authoredAlternation,
  );
  const {
    importedLiteralAliases,
    importedContainers,
    importedNamespaceContainers,
  } = collectImportedAuthoredBindings(
    content,
    relativePath,
    sourceFilesSet,
    authoredExportsByFile,
  );

  const allLiteralAliases = new Map(localLiteralAliases);
  for (const [aliasName, literal] of importedLiteralAliases.entries()) {
    allLiteralAliases.set(aliasName, literal);
  }

  const localAuthoredContainers = collectLocalAuthoredContainerMap(
    content,
    authoredAlternation,
    allLiteralAliases,
  );

  return dedupeViolations([
    ...collectComparisonViolations(
      content,
      relativePath,
      authoredAlternation,
      allLiteralAliases,
    ),
    ...collectSwitchViolations(
      content,
      relativePath,
      authoredAlternation,
      allLiteralAliases,
    ),
    ...collectDispatchContainerViolations(
      content,
      relativePath,
      dispatchContainerUsages,
      dispatchContainerNames,
      localAuthoredContainers,
      importedContainers,
      importedNamespaceContainers,
    ),
  ]);
}

function formatCountMapEntries(map) {
  return Array.from(map.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([reason, count]) => ({ reason, count }));
}

function buildAuthoredExportIndex(
  sourceFiles,
  sourceFilesSet,
  authoredAlternation,
) {
  const exportedByFile = new Map();

  for (const relativePath of sourceFiles) {
    const content = fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
    const localAliases = collectLiteralAliasMap(content, authoredAlternation);
    const localContainers = collectLocalAuthoredContainerMap(
      content,
      authoredAlternation,
      localAliases,
    );

    if (localContainers.size === 0) {
      continue;
    }

    const exported = collectExportedAuthoredContainers(
      content,
      localContainers,
    );
    if (exported.size > 0) {
      exportedByFile.set(relativePath, exported);
    }
  }

  return exportedByFile;
}

function main() {
  if (!fs.existsSync(PACKAGES_ROOT)) {
    console.error("authored-id boundary check: packages directory not found");
    process.exit(1);
  }

  const { ids: authoredIds, malformedContentFiles } = collectAuthoredIds();
  if (malformedContentFiles.length > 0) {
    console.error(
      "authored-id boundary check: malformed surface content file(s):",
    );
    for (const file of malformedContentFiles) {
      console.error(`  - ${file}`);
    }
    process.exit(1);
  }

  if (authoredIds.size === 0) {
    console.error(
      "authored-id boundary check: no authored ids discovered from surface content",
    );
    process.exit(1);
  }

  const authoredAlternation = Array.from(authoredIds)
    .sort(
      (left, right) => right.length - left.length || left.localeCompare(right),
    )
    .map((id) => escapeForRegExp(id))
    .join("|");

  const sourceFiles = listFiles(PACKAGES_ROOT)
    .map((filePath) =>
      path.relative(REPO_ROOT, filePath).replaceAll(path.sep, "/"),
    )
    .sort();

  const sourceFilesSet = new Set(sourceFiles);
  const authoredExportsByFile = buildAuthoredExportIndex(
    sourceFiles,
    sourceFilesSet,
    authoredAlternation,
  );

  const stats = {
    excluded: new Map(),
    allowlisted: new Map(),
    checked: 0,
  };

  const violations = [];

  for (const relativePath of sourceFiles) {
    const excludedReason = classifyPath(relativePath, EXCLUDED_PATH_RULES);
    if (excludedReason != null) {
      stats.excluded.set(
        excludedReason,
        (stats.excluded.get(excludedReason) ?? 0) + 1,
      );
      continue;
    }

    const allowlistReason = classifyPath(relativePath, ALLOWLIST_PATH_RULES);
    if (allowlistReason != null) {
      stats.allowlisted.set(
        allowlistReason,
        (stats.allowlisted.get(allowlistReason) ?? 0) + 1,
      );
      continue;
    }

    stats.checked += 1;
    const content = fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
    violations.push(
      ...findViolationsForFile(
        relativePath,
        content,
        authoredAlternation,
        sourceFilesSet,
        authoredExportsByFile,
      ),
    );
  }

  const uniqueViolations = dedupeViolations(violations);

  if (uniqueViolations.length > 0) {
    console.error("authored-id dispatch boundary violation(s) found:");
    for (const violation of uniqueViolations) {
      console.error(
        `  - ${violation.relativePath}:${violation.line} dispatches on authored id "${violation.literal}" (${violation.context.kind}: ${violation.context.detail})`,
      );
    }
    console.error("");
    console.error(
      "If this usage is a valid boundary (catalog/composition/fixture/legacy/support-profile), add an explicit allowlist rule in scripts/check-authored-id-dispatch-boundary.cjs.",
    );
    process.exit(1);
  }

  const excludedTotal = Array.from(stats.excluded.values()).reduce(
    (sum, count) => sum + count,
    0,
  );
  const allowlistedTotal = Array.from(stats.allowlisted.values()).reduce(
    (sum, count) => sum + count,
    0,
  );

  console.log("authored-id dispatch boundary check passed");
  console.log(`authored ids discovered: ${authoredIds.size}`);
  console.log(`checked source files: ${stats.checked}`);
  console.log(`excluded files: ${excludedTotal}`);
  console.log(`allowlisted files: ${allowlistedTotal}`);

  const allowlistEntries = formatCountMapEntries(stats.allowlisted);
  if (allowlistEntries.length > 0) {
    console.log("allowlist usage by boundary:");
    for (const entry of allowlistEntries) {
      console.log(`  - ${entry.reason}: ${entry.count}`);
    }
  }
}

main();
