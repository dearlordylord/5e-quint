#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const REPO_ROOT = path.resolve(__dirname, "..");
const PACKAGES_ROOT = path.join(REPO_ROOT, "packages");
const SURFACE_CONTENT_ROOT = path.join(PACKAGES_ROOT, "surface", "content");

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts"];
const SOURCE_EXTENSION_SET = new Set(SOURCE_EXTENSIONS);

const EXCLUDED_PATH_RULES = [
  {
    reason: "test-fixture-boundary",
    pattern:
      /(?:\.test\.[cm]?tsx?$|\.mbt\.test\.[cm]?tsx?$|\/test-support\/|\/__tests__\/|\/[^/]*(?:test|fixture)-support\.[cm]?tsx?$)/,
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
    reason: "character-sheet-retained-companion-support-admission-boundary",
    pattern: /^packages\/character-sheet-runtime\/src\/companions\.ts$/,
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

const INLINE_ALLOWLIST_PATH_RULES = [
  {
    reason: "battle-runtime-mbt-fixture-boundary",
    pattern: /^packages\/battle-runtime\/src\/battle-runtime-mbt-driver-kit\.ts$/,
  },
  {
    reason: "battle-runtime-unit-feature-support-profile-boundary",
    pattern: /^packages\/battle-runtime\/src\/unit-feature-support\.ts$/,
  },
  {
    reason: "character-creation-selected-choice-runtime-projection-boundary",
    pattern: /^packages\/character-creation-runtime\/src\/finalization\.ts$/,
  },
];

const INLINE_ALLOWLIST_COMMENT =
  /\bauthored-id-dispatch-allow:\s*([a-z0-9-]+)/;
const IDENTIFIER_EXPRESSION_PATTERN = String.raw`[A-Za-z_$][\w$]*(?:(?:\.|\?\.)[A-Za-z_$][\w$]*)*`;

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

function hasAuthoredIdentitySelector(text) {
  return (
    /\b(?:id|[A-Za-z_$][\w$]*Id|name|[A-Za-z_$][\w$]*Name|section|[A-Za-z_$][\w$]*Section)\b/.test(
      text,
    ) ||
    isAuthoredIdentityFieldExpression(text) ||
    isGenericSelectedAuthoredIdentityExpression(text)
  );
}

function isAuthoredIdentityFieldExpression(text) {
  const expression = expressionWithoutOptionalChaining(text);
  return (
    /(?:^|\.)(?:spell|unit)\.name$/.test(expression) ||
    /(?:^|\.)(?:spell|unit)\.provenance\.section$/.test(expression)
  );
}

function isGenericSelectedAuthoredIdentityExpression(text) {
  const expression = expressionWithoutOptionalChaining(text);
  return (
    /(?:^|\.)(?:fill|choiceFill|decision)\.value$/.test(expression) ||
    /(?:^|\.)(?:selected|selectedChoice|selectedOption|choice|option)\.value$/.test(
      expression,
    )
  );
}

function expressionWithoutOptionalChaining(text) {
  return text.trim().replace(/\?\./g, ".");
}

function transformedIdentityLiteralsFor(literal) {
  const transformed = new Set();
  const words = literal
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => word.length > 0);

  if (words.length > 1) {
    const [head, ...tail] = words;
    transformed.add(
      `${head.toLowerCase()}${tail
        .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
        .join("")}`,
    );
    transformed.add(
      words
        .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
        .join(""),
    );
  }

  return transformed;
}

function addAuthoredIdentityLiteral(identityLiterals, literal) {
  if (typeof literal !== "string" || literal.length === 0) {
    return;
  }

  identityLiterals.add(literal);
  for (const transformed of transformedIdentityLiteralsFor(literal)) {
    identityLiterals.add(transformed);
  }
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

  const closeIndex = findMatchingParenIndex(text, openIndex);
  return closeIndex == null ? null : text.slice(openIndex + 1, closeIndex);
}

function findMatchingParenIndex(text, openIndex) {
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
        return i;
      }
    }
  }

  return null;
}

function collectAuthoredIdentityLiterals() {
  if (!fs.existsSync(SURFACE_CONTENT_ROOT)) {
    throw new Error(
      "authored-id boundary check: surface content directory not found",
    );
  }

  const identityLiterals = new Set();
  const malformedContentFiles = [];

  function collectReferenceIdsFromValue(value) {
    if (Array.isArray(value)) {
      for (const item of value) {
        collectReferenceIdsFromValue(item);
      }
      return;
    }

    if (value == null || typeof value !== "object") {
      return;
    }

    for (const [key, nestedValue] of Object.entries(value)) {
      const isAuthoredReferenceId =
        (key === "id" || key.endsWith("Id")) && key !== "holeId";

      if (
        isAuthoredReferenceId &&
        typeof nestedValue === "string" &&
        nestedValue.length > 0
      ) {
        addAuthoredIdentityLiteral(identityLiterals, nestedValue);
      }

      collectReferenceIdsFromValue(nestedValue);
    }
  }

  for (const filePath of listSurfaceContentFiles(SURFACE_CONTENT_ROOT)) {
    const relativePath = path
      .relative(REPO_ROOT, filePath)
      .replaceAll(path.sep, "/");

    const content = fs.readFileSync(filePath, "utf8");
    try {
      const parsed = JSON.parse(content);
      if (parsed != null && typeof parsed === "object") {
        if (typeof parsed.id === "string" && parsed.id.length > 0) {
          addAuthoredIdentityLiteral(identityLiterals, parsed.id);
        }
        if (typeof parsed.name === "string" && parsed.name.length > 0) {
          addAuthoredIdentityLiteral(identityLiterals, parsed.name);
        }
        if (
          parsed.provenance != null &&
          typeof parsed.provenance === "object" &&
          typeof parsed.provenance.section === "string" &&
          parsed.provenance.section.length > 0
        ) {
          addAuthoredIdentityLiteral(
            identityLiterals,
            parsed.provenance.section,
          );
        }
      }
      collectReferenceIdsFromValue(parsed);
    } catch {
      malformedContentFiles.push(relativePath);
    }
  }

  return {
    identityLiterals,
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
    if (container == null || !hasAuthoredIdentitySelector(argument)) {
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
    if (container == null || !hasAuthoredIdentitySelector(indexExpression)) {
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
  const authoredTokenRegex = new RegExp(
    `(["'\\x60])(${authoredAlternation})\\1`,
  );
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
      const literal = authoredMatch[2] ?? "";
      localContainers.set(variableName, {
        literal,
        index: initializerStart + authoredMatch.index + 1,
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
    `\\b(${IDENTIFIER_EXPRESSION_PATTERN})\\s*(===|==|!==|!=)\\s*(["'\\x60])(${authoredAlternation})\\3`,
    "g",
  );
  for (;;) {
    const match = authoredOnRight.exec(content);
    if (match == null) {
      break;
    }

    const identifierExpression = match[1] ?? "";
    const literal = match[4] ?? "";
    if (!hasAuthoredIdentitySelector(identifierExpression)) {
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
    `(["'\\x60])(${authoredAlternation})\\1\\s*(===|==|!==|!=)\\s*(${IDENTIFIER_EXPRESSION_PATTERN})`,
    "g",
  );
  for (;;) {
    const match = authoredOnLeft.exec(content);
    if (match == null) {
      break;
    }

    const literal = match[2] ?? "";
    const identifierExpression = match[4] ?? "";
    if (!hasAuthoredIdentitySelector(identifierExpression)) {
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

  const aliasOnRight = new RegExp(
    `\\b(${IDENTIFIER_EXPRESSION_PATTERN})\\s*(===|==|!==|!=)\\s*([A-Za-z_$][\\w$]*)\\b`,
    "g",
  );
  for (;;) {
    const match = aliasOnRight.exec(content);
    if (match == null) {
      break;
    }

    const identifierExpression = match[1] ?? "";
    const aliasName = match[3] ?? "";
    const literal = literalAliases.get(aliasName);
    if (literal == null || !hasAuthoredIdentitySelector(identifierExpression)) {
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

  const aliasOnLeft = new RegExp(
    `\\b([A-Za-z_$][\\w$]*)\\s*(===|==|!==|!=)\\s*(${IDENTIFIER_EXPRESSION_PATTERN})\\b`,
    "g",
  );
  for (;;) {
    const match = aliasOnLeft.exec(content);
    if (match == null) {
      break;
    }

    const aliasName = match[1] ?? "";
    const identifierExpression = match[3] ?? "";
    const literal = literalAliases.get(aliasName);
    if (literal == null || !hasAuthoredIdentitySelector(identifierExpression)) {
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

function collectAuthoredIdentityFieldComparisonViolations(
  content,
  relativePath,
) {
  const violations = [];
  const lines = content.split("\n");
  const identifierExpression = IDENTIFIER_EXPRESSION_PATTERN;
  const stringLiteral = String.raw`(?:"[^"\n]*"|'[^'\n]*'|\x60[^\x60\n]*\x60)`;
  const comparableExpression = String.raw`(?:${identifierExpression}|${stringLiteral})`;
  const comparison = new RegExp(
    String.raw`\b(${identifierExpression}|${stringLiteral})\s*(===|==|!==|!=)\s*(${comparableExpression})`,
    "g",
  );

  for (const [index, line] of lines.entries()) {
    comparison.lastIndex = 0;
    for (;;) {
      const match = comparison.exec(line);
      if (match == null) {
        break;
      }

      const left = match[1] ?? "";
      const right = match[3] ?? "";
      const leftIsAuthoredIdentity =
        isAuthoredIdentityFieldExpression(left);
      const rightIsAuthoredIdentity =
        isAuthoredIdentityFieldExpression(right);
      if (!leftIsAuthoredIdentity && !rightIsAuthoredIdentity) {
        continue;
      }

      violations.push({
        relativePath,
        line: index + 1,
        literal: leftIsAuthoredIdentity ? left : right,
        context: {
          kind: "authored-identity-field-comparison",
          detail: match[0],
        },
      });
    }
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
    if (expression == null || !hasAuthoredIdentitySelector(expression)) {
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
    if (expression == null || !hasAuthoredIdentitySelector(expression)) {
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

function collectEffectMatchViolations(
  content,
  relativePath,
  authoredAlternation,
  literalAliases,
) {
  const violations = [];
  const matchValueRegex = /\bMatch\s*\.\s*value\s*\(/g;

  for (;;) {
    const matchValue = matchValueRegex.exec(content);
    if (matchValue == null) {
      break;
    }

    const valueOpenIndex = content.indexOf("(", matchValue.index);
    const valueExpression = extractParenthesizedExpression(
      content,
      valueOpenIndex,
    );
    if (
      valueExpression == null ||
      !hasAuthoredIdentitySelector(valueExpression)
    ) {
      continue;
    }

    const valueCloseIndex = findMatchingParenIndex(content, valueOpenIndex);
    if (valueCloseIndex == null) {
      continue;
    }

    const afterValue = content.slice(valueCloseIndex + 1);
    const pipeMatch = /^\s*\.\s*pipe\s*\(/.exec(afterValue);
    if (pipeMatch == null) {
      continue;
    }

    const pipeOpenIndex =
      valueCloseIndex + 1 + pipeMatch[0].lastIndexOf("(");
    const pipeCloseIndex = findMatchingParenIndex(content, pipeOpenIndex);
    if (pipeCloseIndex == null) {
      continue;
    }

    const pipeBody = content.slice(pipeOpenIndex + 1, pipeCloseIndex);
    const pipeBodyStart = pipeOpenIndex + 1;

    const whenLiteralRegex = new RegExp(
      `\\bMatch\\s*\\.\\s*when\\s*\\(\\s*(["'\\x60])(${authoredAlternation})\\1`,
      "g",
    );
    for (;;) {
      const whenMatch = whenLiteralRegex.exec(pipeBody);
      if (whenMatch == null) {
        break;
      }

      const literal = whenMatch[2] ?? "";
      violations.push({
        relativePath,
        line: lineNumberForIndex(content, pipeBodyStart + whenMatch.index),
        literal,
        context: {
          kind: "effect-match-identity-branch",
          detail: `Match.value(${valueExpression.trim()}).pipe(Match.when("${literal}", ...))`,
        },
      });
    }

    const whenAliasRegex =
      /\bMatch\s*\.\s*when\s*\(\s*([A-Za-z_$][\w$]*)\b/g;
    for (;;) {
      const whenMatch = whenAliasRegex.exec(pipeBody);
      if (whenMatch == null) {
        break;
      }

      const aliasName = whenMatch[1] ?? "";
      const literal = literalAliases.get(aliasName);
      if (literal == null) {
        continue;
      }

      violations.push({
        relativePath,
        line: lineNumberForIndex(content, pipeBodyStart + whenMatch.index),
        literal,
        context: {
          kind: "effect-match-identity-branch-alias",
          detail: `Match.value(${valueExpression.trim()}).pipe(Match.when(${aliasName}, ...)) -> ${aliasName}="${literal}"`,
        },
      });
    }
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
    ...collectAuthoredIdentityFieldComparisonViolations(content, relativePath),
    ...collectSwitchViolations(
      content,
      relativePath,
      authoredAlternation,
      allLiteralAliases,
    ),
    ...collectEffectMatchViolations(
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
  ]).filter(
    (violation) => !isInlineAllowlistedViolation(content, violation),
  );
}

function inlineAllowlistReasonForLine(content, line) {
  const lines = content.split("\n");
  const lineIndexes = [line - 1, line - 2];

  for (const lineIndex of lineIndexes) {
    if (lineIndex < 0 || lineIndex >= lines.length) {
      continue;
    }

    const match = INLINE_ALLOWLIST_COMMENT.exec(lines[lineIndex] ?? "");
    if (match != null && match[1] != null) {
      return match[1];
    }
  }

  return null;
}

function isInlineAllowlistedViolation(content, violation) {
  const boundaryReason = classifyPath(
    violation.relativePath,
    INLINE_ALLOWLIST_PATH_RULES,
  );
  if (boundaryReason == null) {
    return false;
  }

  return inlineAllowlistReasonForLine(content, violation.line) === boundaryReason;
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

function buildAuthoredAlternation(identityLiterals) {
  return Array.from(identityLiterals)
    .sort(
      (left, right) => right.length - left.length || left.localeCompare(right),
    )
    .map((id) => escapeForRegExp(id))
    .join("|");
}

function runSelfTest() {
  const selfTestLiterals = new Set();
  for (const literal of [
    "magic_missile",
    "Magic Missile",
    "Spells/Descriptions-M-P#Magic Missile",
    "Hunter's Prey",
    "Classes/Ranger.md:243-249",
    "colossus_slayer",
    "addle",
    "push",
    "topple",
  ]) {
    addAuthoredIdentityLiteral(selfTestLiterals, literal);
  }
  const authoredAlternation = buildAuthoredAlternation(selfTestLiterals);

  const productionBranch = [
    "export function productionSpellDispatch(invocation) {",
    '  if (invocation.spell.name === "Magic Missile") return "spell-name-comparison";',
    "  switch (invocation.spell.name) {",
    '    case "Magic Missile": return "spell-name-switch";',
    "  }",
    '  const spellNames = ["Magic Missile"];',
    "  if (spellNames.includes(invocation.spell.name)) return \"spell-name-container\";",
    "  Match.value(invocation.spell.name).pipe(",
    '    Match.when("Magic Missile", () => "spell-name-effect-match"),',
    "    Match.exhaustive,",
    "  );",
    '  if (invocation.spell.provenance.section === "Spells/Descriptions-M-P#Magic Missile") return "section-comparison";',
    "  return null;",
    "}",
  ].join("\n");

  const productionViolations = findViolationsForFile(
    "packages/battle-runtime/src/battle-reducer/representative-spell-dispatch.ts",
    productionBranch,
    authoredAlternation,
    new Set(),
    new Map(),
  );
  const productionKinds = new Set(
    productionViolations.map((violation) => violation.context.kind),
  );

  assert(
    productionKinds.has("authored-identity-field-comparison"),
    `Self-test failed: spell.name comparison was not caught. Got ${JSON.stringify(productionViolations)}`,
  );
  assert(
    productionKinds.has("switch-id-branch"),
    `Self-test failed: spell.name switch branch was not caught. Got ${JSON.stringify(productionViolations)}`,
  );
  assert(
    productionKinds.has("dispatch-container"),
    `Self-test failed: spell.name container dispatch was not caught. Got ${JSON.stringify(productionViolations)}`,
  );
  assert(
    productionKinds.has("effect-match-identity-branch"),
    `Self-test failed: effect/Match spell.name branch was not caught. Got ${JSON.stringify(productionViolations)}`,
  );

  const nonSpellUnitIdentityBranch = [
    'const unitNames = ["Hunter\'s Prey"];',
    "export function nonSpellUnitDispatch(unit) {",
    "  switch (unit.name) {",
    '    case "Hunter\'s Prey": return "unit-name-switch";',
    "  }",
    '  if (unitNames.includes(unit.name)) return "unit-name-container";',
    "  return Match.value(unit.provenance.section).pipe(",
    '    Match.when("Classes/Ranger.md:243-249", () => "unit-section-match"),',
    "    Match.exhaustive,",
    "  );",
    "}",
  ].join("\n");
  const nonSpellUnitViolations = findViolationsForFile(
    "packages/battle-runtime/src/battle-reducer/non-spell-unit-dispatch.ts",
    nonSpellUnitIdentityBranch,
    authoredAlternation,
    new Set(),
    new Map(),
  );
  assert(
    nonSpellUnitViolations.some(
      (violation) =>
        violation.literal === "Hunter's Prey" &&
        violation.context.kind === "switch-id-branch",
    ),
    `Self-test failed: non-spell unit.name switch branch was not caught. Got ${JSON.stringify(nonSpellUnitViolations)}`,
  );
  assert(
    nonSpellUnitViolations.some(
      (violation) =>
        violation.literal === "Hunter's Prey" &&
        violation.context.kind === "dispatch-container",
    ),
    `Self-test failed: non-spell unit.name container dispatch was not caught. Got ${JSON.stringify(nonSpellUnitViolations)}`,
  );
  assert(
    nonSpellUnitViolations.some(
      (violation) =>
        violation.literal === "Classes/Ranger.md:243-249" &&
        violation.context.kind === "effect-match-identity-branch",
    ),
    `Self-test failed: non-spell unit provenance section Match branch was not caught. Got ${JSON.stringify(nonSpellUnitViolations)}`,
  );

  const transformedSelectedOptionBranch = [
    "export function selectedOptionDispatch(selectedOption) {",
    "  return Match.value(selectedOption.optionId).pipe(",
    '    Match.when("colossusSlayer", () => "old-runtime-id-branch"),',
    "    Match.exhaustive,",
    "  );",
    "}",
  ].join("\n");
  const transformedSelectedOptionViolations = findViolationsForFile(
    "packages/battle-runtime/src/battle-reducer/selected-option-dispatch.ts",
    transformedSelectedOptionBranch,
    authoredAlternation,
    new Set(),
    new Map(),
  );
  assert(
    transformedSelectedOptionViolations.some(
      (violation) =>
        violation.literal === "colossusSlayer" &&
        violation.context.kind === "effect-match-identity-branch",
    ),
    `Self-test failed: transformed selected option authored ID branch was not caught. Got ${JSON.stringify(transformedSelectedOptionViolations)}`,
  );

  const selectedFillValueBranch = [
    "export function selectedFillValueDispatch(fill) {",
    '  if (fill.value === "push") return "old-runtime-fill-branch";',
    "  return null;",
    "}",
  ].join("\n");
  const selectedFillValueViolations = findViolationsForFile(
    "packages/battle-runtime/src/battle-reducer/selected-fill-value-dispatch.ts",
    selectedFillValueBranch,
    authoredAlternation,
    new Set(),
    new Map(),
  );
  assert(
    selectedFillValueViolations.some(
      (violation) =>
        violation.literal === "push" &&
        violation.context.kind === "id-comparison",
    ),
    `Self-test failed: generic fill.value authored ID branch was not caught. Got ${JSON.stringify(selectedFillValueViolations)}`,
  );

  const optionalSelectedValueBranch = [
    "export function optionalSelectedValueDispatch(input, fill) {",
    '  if (fill?.value === "push") return "old-optional-fill-branch";',
    "  return Match.value(input.decision?.value).pipe(",
    '    Match.when("push", () => "old-optional-decision-branch"),',
    "    Match.exhaustive,",
    "  );",
    "}",
  ].join("\n");
  const optionalSelectedValueViolations = findViolationsForFile(
    "packages/battle-runtime/src/battle-reducer/optional-selected-value-dispatch.ts",
    optionalSelectedValueBranch,
    authoredAlternation,
    new Set(),
    new Map(),
  );
  assert(
    optionalSelectedValueViolations.some(
      (violation) =>
        violation.literal === "push" &&
        violation.context.kind === "id-comparison",
    ),
    `Self-test failed: optional fill?.value authored ID branch was not caught. Got ${JSON.stringify(optionalSelectedValueViolations)}`,
  );
  assert(
    optionalSelectedValueViolations.some(
      (violation) =>
        violation.literal === "push" &&
        violation.context.kind === "effect-match-identity-branch",
    ),
    `Self-test failed: optional decision?.value authored ID branch was not caught. Got ${JSON.stringify(optionalSelectedValueViolations)}`,
  );

  const openHandDecisionBranch = [
    "export function openHandDecisionDispatch(input) {",
    "  return Match.value(input.decision.value).pipe(",
    '    Match.when("addle", () => "old-addle-branch"),',
    '    Match.when("push", () => "old-push-branch"),',
    '    Match.when("topple", () => "old-topple-branch"),',
    "    Match.exhaustive,",
    "  );",
    "}",
  ].join("\n");
  const openHandDecisionViolations = findViolationsForFile(
    "packages/battle-runtime/src/battle-reducer/open-hand-technique.ts",
    openHandDecisionBranch,
    authoredAlternation,
    new Set(),
    new Map(),
  );
  assert(
    ["addle", "push", "topple"].every((literal) =>
      openHandDecisionViolations.some(
        (violation) =>
          violation.literal === literal &&
          violation.context.kind === "effect-match-identity-branch",
      ),
    ),
    `Self-test failed: Open Hand decision.value authored choice branch was not caught. Got ${JSON.stringify(openHandDecisionViolations)}`,
  );

  const selectedIdentityProjection = [
    "export function selectedIdentityProjection(invocation) {",
    "  return {",
    "    spellId: invocation.spell.id,",
    "    label: invocation.spell.name,",
    "  };",
    "}",
  ].join("\n");

  const selectedIdentityViolations = findViolationsForFile(
    "packages/battle-runtime/src/battle-reducer/selected-identity-projection.ts",
    selectedIdentityProjection,
    authoredAlternation,
    new Set(),
    new Map(),
  );
  assert.deepEqual(
    selectedIdentityViolations,
    [],
    `Self-test failed: selected identity projection should not be a dispatch violation. Got ${JSON.stringify(selectedIdentityViolations)}`,
  );

  const battleRuntimeMbtFixtureProjection = [
    "export function fixtureProjection(usage) {",
    "  return {",
    "      // authored-id-dispatch-allow: battle-runtime-mbt-fixture-boundary",
    '    sneakAttackUsed: usage.unitId === "magic_missile",',
    "  };",
    "}",
  ].join("\n");

  const fixtureProjectionViolations = findViolationsForFile(
    "packages/battle-runtime/src/battle-runtime-mbt-driver-kit.ts",
    battleRuntimeMbtFixtureProjection,
    authoredAlternation,
    new Set(),
    new Map(),
  );
  assert.deepEqual(
    fixtureProjectionViolations,
    [],
    `Self-test failed: inline fixture-boundary allowlist should suppress only marked kit violations. Got ${JSON.stringify(fixtureProjectionViolations)}`,
  );

  const misplacedFixtureProjectionViolations = findViolationsForFile(
    "packages/battle-runtime/src/battle-reducer/runtime.ts",
    battleRuntimeMbtFixtureProjection,
    authoredAlternation,
    new Set(),
    new Map(),
  );
  assert(
    misplacedFixtureProjectionViolations.length > 0,
    "Self-test failed: inline fixture-boundary allowlist should not apply outside the driver kit.",
  );

  assert.equal(
    classifyPath(
      "packages/battle-runtime/src/unit-profile-admission-spell-fill-support.ts",
      ALLOWLIST_PATH_RULES,
    ),
    "battle-runtime-unit-profile-admission-test-support-boundary",
  );
  assert.equal(
    classifyPath(
      "packages/battle-runtime/src/unit-feature-support.ts",
      ALLOWLIST_PATH_RULES,
    ),
    null,
  );
  assert.equal(
    classifyPath(
      "packages/battle-runtime/src/battle-reducer/spells-discovery.test.ts",
      EXCLUDED_PATH_RULES,
    ),
    "test-fixture-boundary",
  );
}

function main() {
  runSelfTest();

  if (!fs.existsSync(PACKAGES_ROOT)) {
    console.error("authored-id boundary check: packages directory not found");
    process.exit(1);
  }

  const {
    identityLiterals: authoredIdentityLiterals,
    malformedContentFiles,
  } = collectAuthoredIdentityLiterals();
  if (malformedContentFiles.length > 0) {
    console.error(
      "authored-id boundary check: malformed surface content file(s):",
    );
    for (const file of malformedContentFiles) {
      console.error(`  - ${file}`);
    }
    process.exit(1);
  }

  if (authoredIdentityLiterals.size === 0) {
    console.error(
      "authored-id boundary check: no authored identity literals discovered from surface content",
    );
    process.exit(1);
  }

  const authoredAlternation = buildAuthoredAlternation(
    authoredIdentityLiterals,
  );

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
    console.error("authored-identity dispatch boundary violation(s) found:");
    for (const violation of uniqueViolations) {
      console.error(
        `  - ${violation.relativePath}:${violation.line} dispatches on authored identity "${violation.literal}" (${violation.context.kind}: ${violation.context.detail})`,
      );
    }
    console.error("");
    console.error(
      "If this usage is a valid boundary (catalog/composition/fixture/legacy/support-profile admission), add an explicit allowlist rule in scripts/check-authored-id-dispatch-boundary.cjs.",
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

  console.log("authored-identity dispatch boundary check passed");
  console.log(
    `authored identity literals discovered: ${authoredIdentityLiterals.size}`,
  );
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
