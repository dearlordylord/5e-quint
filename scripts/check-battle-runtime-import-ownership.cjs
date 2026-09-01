#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const BATTLE_RUNTIME_SRC = "packages/battle-runtime/src";

const EXECUTION_ENTRY_POINT_DIRECTORIES = [
  `${BATTLE_RUNTIME_SRC}/procedure-execution`,
];
const EXECUTION_ENTRY_POINT_FILES = [
  `${BATTLE_RUNTIME_SRC}/character-execution.ts`,
  `${BATTLE_RUNTIME_SRC}/active-effect/codecs.ts`,
  `${BATTLE_RUNTIME_SRC}/active-effect/types.ts`,
  `${BATTLE_RUNTIME_SRC}/battle-reducer/battle-discovery.ts`,
  `${BATTLE_RUNTIME_SRC}/battle-reducer/reducer-route.ts`,
  `${BATTLE_RUNTIME_SRC}/battle-reducer/spells-resolve.ts`,
  `${BATTLE_RUNTIME_SRC}/battle-reducer/dispatcher.ts`,
];
const SPELL_EXECUTION_COMPOSITION_MODULE = `${BATTLE_RUNTIME_SRC}/battle-reducer/spell-procedure-profiles/execution-composition.ts`;
const SPELL_DECLARATION_REGISTRY_MODULE = `${BATTLE_RUNTIME_SRC}/battle-reducer/spell-procedure-profiles/registry.ts`;
const BATTLE_RUNTIME_PACKAGE_MANIFEST = "packages/battle-runtime/package.json";

const FORBIDDEN_OWNERS = [
  {
    zone: "admission",
    paths: [
      `${BATTLE_RUNTIME_SRC}/procedure-admission`,
      `${BATTLE_RUNTIME_SRC}/battle-composition-admission.ts`,
      `${BATTLE_RUNTIME_SRC}/stat-block-combatant-admission.ts`,
      `${BATTLE_RUNTIME_SRC}/stat-block-execution.ts`,
      `${BATTLE_RUNTIME_SRC}/statblock-action-execution-support.ts`,
    ],
  },
  {
    zone: "presentation",
    paths: [
      `${BATTLE_RUNTIME_SRC}/act-presentation`,
      `${BATTLE_RUNTIME_SRC}/battle-act-composition.ts`,
      `${BATTLE_RUNTIME_SRC}/battle-runtime-context.ts`,
      `${BATTLE_RUNTIME_SRC}/stat-block-presentation.ts`,
    ],
  },
];

const admissionSurfaceImportCache = new Map();
const SURFACE_SOURCE_ROOT = path.join(ROOT, "packages/surface/src");
const SURFACE_SCHEMA_ROOT = path.join(SURFACE_SOURCE_ROOT, "surface/schema");
const SURFACE_TYPES_MODULE = path.join(SURFACE_SOURCE_ROOT, "surface/types");
const SURFACE_STAT_BLOCK_TYPES_MODULE = path.join(
  SURFACE_SOURCE_ROOT,
  "surface/stat-block-types",
);
const MIXED_SURFACE_EXECUTION_SAFE_SYMBOLS = new Map([
  [
    SURFACE_SCHEMA_ROOT,
    new Set([
      "AbilitySchema",
      "ActionRestrictionSchema",
      "CUNNING_STRIKE_OPTION_SELECTION_IDS",
      "ClassNameSchema",
      "CreatureTypeSchema",
      "DamageTypeSchema",
      "DcSourceSchema",
      "DiceExprSchema",
      "DurationSchema",
      "RangeSchema",
      "SORCERER_METAMAGIC_EFFECT_KINDS",
      "SizeSchema",
      "SpellLevelSchema",
      "WeaponCategorySchema",
      "WeaponDamageSchema",
      "WeaponMasteryNameSchema",
      "WeaponPropertyDetailSchema",
      "WeaponUsageSchema",
    ]),
  ],
  [
    SURFACE_STAT_BLOCK_TYPES_MODULE,
    new Set([
      "ChallengeRating",
      "StatBlockId",
      "StatBlockProcedureOrdinal",
      "StatBlockProcedureResource",
      "StatBlockProcedureResourceOrdinal",
      "StatBlockTextOnlyReason",
    ]),
  ],
  [
    SURFACE_TYPES_MODULE,
    new Set([
      "Ability",
      "ActionRestriction",
      "ActionRestrictionAllowedAction",
      "ActivationPhase",
      "ActivationResource",
      "AreaDirectEffectAtom",
      "ArmorAcFormula",
      "ArmorCategory",
      "ArmorTrainingCategory",
      "Attachment",
      "ClassName",
      "CreatureAttackRollMechanics",
      "CreatureImmunityList",
      "CreatureLimitedUse",
      "CreatureRechargeMinimumRoll",
      "CreatureResistanceList",
      "CreatureSavingThrowModifier",
      "CreatureSense",
      "CreatureSkillModifier",
      "CreatureSpeed",
      "CreatureVulnerabilityList",
      "DamageType",
      "DamageTypeRef",
      "DcSource",
      "DiceAmount",
      "DiceExpr",
      "DiceExprDelta",
      "Duration",
      "EffectAtom",
      "GlyphWardingExplosiveRuneBranch",
      "GlyphWardingMechanics",
      "GlyphWardingOccurrence",
      "GlyphWardingSpellGlyphBranch",
      "GlyphWardingTrigger",
      "LinearPerLevel",
      "OngoingEffect",
      "PointPoolResource",
      "Range",
      "SKILLS",
      "SixAbilityScores",
      "Size",
      "Skill",
      "SkillFilter",
      "SpellLevel",
      "SpellMechanics",
      "StatBlockLiteralValue",
      "StatBlockValue",
      "TargetSelection",
      "TopLevelSpellCastingTime",
      "UsageLimit",
      "WeaponCategory",
      "WeaponDamage",
      "WeaponMasteryName",
      "WeaponProficiency",
      "WeaponPropertyDetail",
      "WeaponUsage",
      "isEffectAtom",
      "isFixedDistancePointRange",
      "isThresholdTierPointRange",
      "topLevelSpellCastingTime",
    ]),
  ],
]);

const EXECUTION_SHAPE_FORBIDDEN_FIELDS = new Map([
  [
    "CharacterWeaponAttackExecutionWeapon",
    new Set([
      "id",
      "name",
      "description",
      "provenance",
      "kind",
      "weightPounds",
    ]),
  ],
]);

function executionShapeLaundering(file) {
  const source = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    false,
  );
  const violations = [];
  for (const statement of sourceFile.statements) {
    const shapeName =
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement)
        ? statement.name.text
        : undefined;
    const forbiddenFields = EXECUTION_SHAPE_FORBIDDEN_FIELDS.get(shapeName);
    if (forbiddenFields === undefined) continue;
    const members = ts.isInterfaceDeclaration(statement)
      ? statement.members
      : ts.isTypeLiteralNode(statement.type)
        ? statement.type.members
        : [];
    for (const member of members) {
      if (!ts.isPropertySignature(member) || member.name === undefined)
        continue;
      const field =
        ts.isIdentifier(member.name) || ts.isStringLiteralLike(member.name)
          ? member.name.text
          : undefined;
      if (field !== undefined && forbiddenFields.has(field)) {
        violations.push({ shapeName, field });
      }
    }
  }
  return violations;
}

function withoutSourceExtension(file) {
  return file.replace(/\.[cm]?[jt]sx?$/, "");
}

function isMixedSurfacePath(file) {
  return (
    file === SURFACE_TYPES_MODULE ||
    file === SURFACE_STAT_BLOCK_TYPES_MODULE ||
    file === SURFACE_SCHEMA_ROOT ||
    file.startsWith(`${SURFACE_SCHEMA_ROOT}-`)
  );
}

function resolvedMixedSurfaceModule(specifier, importingFile) {
  const withoutExtension = specifier.replace(/\.[cm]?[jt]sx?$/, "");
  if (withoutExtension.startsWith("@dnd/surface/")) {
    const resolved = path.join(
      SURFACE_SOURCE_ROOT,
      withoutExtension.slice("@dnd/surface/".length),
    );
    return isMixedSurfacePath(resolved) ? resolved : undefined;
  }
  if (!specifier.startsWith(".")) return undefined;
  const resolved = withoutSourceExtension(
    path.resolve(path.dirname(importingFile), specifier),
  );
  return isMixedSurfacePath(resolved) ? resolved : undefined;
}

function surfaceModuleOwnership(specifier, importingFile) {
  if (resolvedMixedSurfaceModule(specifier, importingFile) !== undefined) {
    return "mixed";
  }
  const withoutExtension = specifier.replace(/\.[cm]?[jt]sx?$/, "");
  if (withoutExtension.startsWith("@dnd/surface")) return "admission";
  if (!specifier.startsWith(".")) return undefined;
  const resolved = withoutSourceExtension(
    path.resolve(path.dirname(importingFile), specifier),
  );
  if (
    resolved !== SURFACE_SOURCE_ROOT &&
    !resolved.startsWith(`${SURFACE_SOURCE_ROOT}${path.sep}`)
  ) {
    return undefined;
  }
  return "admission";
}

function mixedSurfaceSymbolsAreExecutionSafe(
  specifier,
  importingFile,
  importedNames,
) {
  const module = resolvedMixedSurfaceModule(specifier, importingFile);
  if (module === undefined || importedNames.length === 0) return false;
  const safeSymbols = MIXED_SURFACE_EXECUTION_SAFE_SYMBOLS.get(module);
  return (
    safeSymbols !== undefined &&
    importedNames.every((name) => safeSymbols.has(name))
  );
}

function isAuthoredSurfaceFile(file) {
  const resolved = withoutSourceExtension(path.resolve(file));
  return (
    resolved.startsWith(`${SURFACE_SOURCE_ROOT}${path.sep}`) &&
    !isMixedSurfacePath(resolved)
  );
}

function isMixedSurfaceFile(file) {
  return isMixedSurfacePath(withoutSourceExtension(path.resolve(file)));
}

function toRepoPath(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function normalizedRepoPath(file) {
  return path.normalize(path.resolve(ROOT, file));
}

function listTypeScriptFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  const pending = [directory];
  while (pending.length > 0) {
    const current = pending.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(target);
      else if (entry.isFile() && isTypeScriptSource(target)) files.push(target);
    }
  }
  return files.sort();
}

function isTypeScriptSource(file) {
  return !file.endsWith(".d.ts") && /(?:\.[cm]?ts|\.tsx)$/.test(file);
}

function isTraversableSource(file) {
  return !file.endsWith(".d.ts") && /(?:\.[cm]?[jt]s|\.[jt]sx)$/.test(file);
}

function isRepoLocalSpecifier(specifier) {
  return (
    specifier.startsWith(".") ||
    specifier.startsWith("#/") ||
    specifier.startsWith("@dnd/")
  );
}

function executionEntryPoints() {
  const declaredFiles = EXECUTION_ENTRY_POINT_FILES.map(normalizedRepoPath);
  assertDeclaredEntryPointsExist(declaredFiles);
  return [
    ...declaredDirectoryEntryPoints(
      EXECUTION_ENTRY_POINT_DIRECTORIES.map(normalizedRepoPath),
    ),
    ...declaredFiles,
  ].sort();
}

function battleRuntimeExecutionImportClosure() {
  const entryPoints = [
    ...executionEntryPoints(),
    normalizedRepoPath(SPELL_DECLARATION_REGISTRY_MODULE),
  ];
  if (entryPoints.length === 0) {
    throw new Error("No battle-runtime execution entry points were found.");
  }
  return [...reachableFiles(importGraph(entryPoints), entryPoints)]
    .map(toRepoPath)
    .sort();
}

function battleRuntimePublicExportOwnerFiles() {
  const manifestPath = normalizedRepoPath(BATTLE_RUNTIME_PACKAGE_MANIFEST);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const exportedEntrypoints = Object.values(manifest.exports ?? {}).map(
    (relativePath) => {
      assert.equal(
        typeof relativePath,
        "string",
        "Battle-runtime package exports must resolve directly to source entry points.",
      );
      return path.normalize(
        path.resolve(path.dirname(manifestPath), relativePath),
      );
    },
  );
  assertDeclaredEntryPointsExist(exportedEntrypoints);

  const options = compilerOptions();
  const resolutionCache = ts.createModuleResolutionCache(
    ROOT,
    (fileName) => fileName,
    options,
  );
  const owners = new Set(exportedEntrypoints);
  const pending = [...exportedEntrypoints];
  while (pending.length > 0) {
    const file = pending.pop();
    const source = fs.readFileSync(file, "utf8");
    const sourceFile = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      false,
    );
    for (const statement of sourceFile.statements) {
      if (
        !ts.isExportDeclaration(statement) ||
        statement.moduleSpecifier === undefined ||
        !ts.isStringLiteral(statement.moduleSpecifier)
      ) {
        continue;
      }
      const specifier = statement.moduleSpecifier.text;
      const resolved = ts.resolveModuleName(
        specifier,
        file,
        options,
        ts.sys,
        resolutionCache,
      ).resolvedModule?.resolvedFileName;
      if (resolved === undefined) {
        if (isRepoLocalSpecifier(specifier)) {
          throw new Error(
            `Could not resolve public re-export ${JSON.stringify(specifier)} from ${toRepoPath(file)}.`,
          );
        }
        continue;
      }
      const owner = path.normalize(resolved);
      if (
        !owner.startsWith(
          `${normalizedRepoPath(BATTLE_RUNTIME_SRC)}${path.sep}`,
        ) ||
        !isTypeScriptSource(owner) ||
        owners.has(owner)
      ) {
        continue;
      }
      owners.add(owner);
      pending.push(owner);
    }
  }
  return [...owners].map(toRepoPath).sort();
}

function declaredDirectoryEntryPoints(directories) {
  return directories.flatMap((directory) => {
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
      throw new Error(
        `Directory of declared battle-runtime execution entry points does not exist: ${toRepoPath(directory)}`,
      );
    }
    const entryPoints = listTypeScriptFiles(directory);
    if (entryPoints.length === 0) {
      throw new Error(
        `Directory of declared battle-runtime execution entry points has no TypeScript files: ${toRepoPath(directory)}`,
      );
    }
    return entryPoints;
  });
}

function assertDeclaredEntryPointsExist(files) {
  const missing = files.filter((file) => !fs.existsSync(file));
  if (missing.length > 0) {
    throw new Error(
      `Declared battle-runtime execution entry points do not exist:\n${missing
        .map(toRepoPath)
        .join("\n")}`,
    );
  }
}

function forbiddenOwner(file, zone) {
  const repoPath = toRepoPath(file);
  for (const owner of FORBIDDEN_OWNERS) {
    if (zone !== undefined && owner.zone !== zone) continue;
    for (const ownedPath of owner.paths) {
      if (repoPath === ownedPath || repoPath.startsWith(`${ownedPath}/`)) {
        return { zone: owner.zone, path: ownedPath };
      }
    }
  }
  if (isMixedSurfaceFile(file)) return undefined;
  if (
    (zone === undefined || zone === "admission") &&
    (isAuthoredSurfaceFile(file) || requiresSurfaceAdmission(file))
  ) {
    return { zone: "admission", path: repoPath };
  }
  return undefined;
}

function requiresSurfaceAdmission(file) {
  const cached = admissionSurfaceImportCache.get(file);
  if (cached !== undefined) return cached;
  const source = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    false,
  );
  let importsAdmissionSurface = false;
  const visit = (node) => {
    if (importsAdmissionSurface) return;
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require")) &&
      node.arguments.length === 1 &&
      ts.isStringLiteralLike(node.arguments[0]) &&
      surfaceModuleOwnership(node.arguments[0].text, file) !== undefined
    ) {
      importsAdmissionSurface = true;
      return;
    }
    if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression !== undefined &&
      ts.isStringLiteralLike(node.moduleReference.expression) &&
      surfaceModuleOwnership(node.moduleReference.expression.text, file) !==
        undefined
    ) {
      importsAdmissionSurface = true;
      return;
    }
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal) &&
      surfaceModuleOwnership(node.argument.literal.text, file) !== undefined
    ) {
      const importedName = node.qualifier?.getText(sourceFile);
      importsAdmissionSurface =
        surfaceModuleOwnership(node.argument.literal.text, file) ===
          "admission" ||
        importedName === undefined ||
        !mixedSurfaceSymbolsAreExecutionSafe(node.argument.literal.text, file, [
          importedName,
        ]);
      if (importsAdmissionSurface) return;
    }
    ts.forEachChild(node, visit);
  };
  for (const statement of sourceFile.statements) {
    if (
      (!ts.isImportDeclaration(statement) &&
        !ts.isExportDeclaration(statement)) ||
      statement.moduleSpecifier === undefined ||
      !ts.isStringLiteral(statement.moduleSpecifier) ||
      surfaceModuleOwnership(statement.moduleSpecifier.text, file) === undefined
    ) {
      visit(statement);
      continue;
    }
    const specifier = statement.moduleSpecifier.text;
    if (surfaceModuleOwnership(specifier, file) === "admission") {
      importsAdmissionSurface = true;
      break;
    }
    if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      const bindings = statement.importClause?.namedBindings;
      importsAdmissionSurface =
        clause === undefined ||
        clause.name !== undefined ||
        bindings === undefined ||
        ts.isNamespaceImport(bindings) ||
        !mixedSurfaceSymbolsAreExecutionSafe(
          specifier,
          file,
          bindings.elements.map(
            (element) => (element.propertyName ?? element.name).text,
          ),
        );
      if (importsAdmissionSurface) break;
      continue;
    }
    importsAdmissionSurface =
      statement.exportClause === undefined ||
      !ts.isNamedExports(statement.exportClause) ||
      !mixedSurfaceSymbolsAreExecutionSafe(
        specifier,
        file,
        ts.isNamedExports(statement.exportClause)
          ? statement.exportClause.elements.map(
              (element) => (element.propertyName ?? element.name).text,
            )
          : [],
      );
    if (importsAdmissionSurface) break;
  }
  if (!importsAdmissionSurface) visit(sourceFile);
  admissionSurfaceImportCache.set(file, importsAdmissionSurface);
  return importsAdmissionSurface;
}

function compilerOptions() {
  const configPath = normalizedRepoPath(
    "packages/battle-runtime/tsconfig.json",
  );
  const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
  if (loaded.error !== undefined) {
    throw new Error(
      ts.flattenDiagnosticMessageText(loaded.error.messageText, "\n"),
    );
  }
  return ts.parseJsonConfigFileContent(
    loaded.config,
    ts.sys,
    path.dirname(configPath),
  ).options;
}

function importGraph(
  entryPoints,
  repositoryRoot = ROOT,
  options = compilerOptions(),
) {
  const resolutionCache = ts.createModuleResolutionCache(
    repositoryRoot,
    (fileName) => fileName,
    options,
  );
  const graph = new Map();
  const pending = [...entryPoints];
  while (pending.length > 0) {
    const file = pending.pop();
    if (graph.has(file)) continue;
    if (isMixedSurfaceFile(file)) {
      graph.set(file, []);
      continue;
    }
    const source = fs.readFileSync(file, "utf8");
    rejectOpaqueModuleLoading(file, source);
    const preprocessed = ts.preProcessFile(source, true, true);
    const imports = preprocessed.importedFiles;
    const dependencies = [];
    for (const imported of imports) {
      const resolved = ts.resolveModuleName(
        imported.fileName,
        file,
        options,
        ts.sys,
        resolutionCache,
      ).resolvedModule?.resolvedFileName;
      if (resolved === undefined) {
        if (isRepoLocalSpecifier(imported.fileName)) {
          throw new Error(
            `Could not resolve repo-local import ${JSON.stringify(imported.fileName)} from ${toRepoPath(file)}.`,
          );
        }
        continue;
      }
      const dependency = path.normalize(resolved);
      if (
        !dependency.startsWith(`${repositoryRoot}${path.sep}`) ||
        dependency.includes(`${path.sep}node_modules${path.sep}`) ||
        !isTraversableSource(dependency)
      ) {
        continue;
      }
      dependencies.push(dependency);
      if (!graph.has(dependency)) pending.push(dependency);
    }
    for (const referenced of preprocessed.referencedFiles) {
      const dependency = path.normalize(
        path.resolve(path.dirname(file), referenced.fileName),
      );
      if (!fs.existsSync(dependency)) {
        throw new Error(
          `Could not resolve reference path ${JSON.stringify(referenced.fileName)} from ${toRepoPath(file)}.`,
        );
      }
      if (
        dependency.startsWith(`${repositoryRoot}${path.sep}`) &&
        isTraversableSource(dependency)
      ) {
        dependencies.push(dependency);
        if (!graph.has(dependency)) pending.push(dependency);
      }
    }
    graph.set(file, [...new Set(dependencies)].sort());
  }
  return graph;
}

function rejectOpaqueModuleLoading(file, source) {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    false,
  );
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const isDynamicImport =
        node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const isRequire =
        ts.isIdentifier(node.expression) && node.expression.text === "require";
      if (
        (isDynamicImport || isRequire) &&
        (node.arguments.length !== 1 ||
          !ts.isStringLiteralLike(node.arguments[0]))
      ) {
        throw new Error(
          `Opaque module loading is not allowed in an execution entry point's reachable import closure: ${toRepoPath(file)}.`,
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

function shortestForbiddenPath(graph, entryPoint, classifyForbidden) {
  const queue = [[entryPoint]];
  const visited = new Set([entryPoint]);
  while (queue.length > 0) {
    const candidatePath = queue.shift();
    const current = candidatePath[candidatePath.length - 1];
    const forbidden = classifyForbidden(current);
    if (forbidden !== undefined) {
      return { forbidden, path: candidatePath };
    }
    for (const dependency of graph.get(current) ?? []) {
      if (visited.has(dependency)) continue;
      visited.add(dependency);
      queue.push([...candidatePath, dependency]);
    }
  }
  return undefined;
}

function reachableFiles(graph, entryPoints) {
  const reachable = new Set(entryPoints);
  const queue = [...entryPoints];
  while (queue.length > 0) {
    const current = queue.shift();
    for (const dependency of graph.get(current) ?? []) {
      if (reachable.has(dependency)) continue;
      reachable.add(dependency);
      queue.push(dependency);
    }
  }
  return reachable;
}

function isWithin(file, directory) {
  return file === directory || file.startsWith(`${directory}${path.sep}`);
}

function directResolveCalls(file, source = fs.readFileSync(file, "utf8")) {
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    false,
  );
  const violations = [];
  const visit = (node) => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const receiver =
        ts.isPropertyAccessExpression(callee) && callee.name.text === "resolve"
          ? callee.expression
          : ts.isElementAccessExpression(callee) &&
              ts.isStringLiteralLike(callee.argumentExpression) &&
              callee.argumentExpression.text === "resolve"
            ? callee.expression
            : undefined;
      const isExecutionRegistryEntry =
        receiver !== undefined &&
        ts.isCallExpression(receiver) &&
        ((ts.isIdentifier(receiver.expression) &&
          receiver.expression.text === "spellProcedureExecutionFor") ||
          (ts.isPropertyAccessExpression(receiver.expression) &&
            receiver.expression.name.text === "executionFor"));
      if (receiver !== undefined && !isExecutionRegistryEntry) {
        violations.push({
          file,
          call: node.getText(sourceFile).replace(/\s+/g, " "),
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return violations;
}

function spellExecutionBoundaryViolations(graph) {
  const dispatcher = normalizedRepoPath(
    `${BATTLE_RUNTIME_SRC}/battle-reducer/dispatcher.ts`,
  );
  const glyphDispatcher = normalizedRepoPath(
    `${BATTLE_RUNTIME_SRC}/battle-reducer/glyph-durable-occurrence.ts`,
  );
  const forbiddenCompositionModules = new Set([
    normalizedRepoPath(SPELL_EXECUTION_COMPOSITION_MODULE),
    normalizedRepoPath(SPELL_DECLARATION_REGISTRY_MODULE),
  ]);
  const compositionPath = shortestForbiddenPath(graph, dispatcher, (file) =>
    forbiddenCompositionModules.has(file)
      ? { zone: "spell execution composition" }
      : undefined,
  );
  const executionReducerDirectory = normalizedRepoPath(
    `${BATTLE_RUNTIME_SRC}/battle-reducer`,
  );
  const canonicalRegistry = normalizedRepoPath(
    SPELL_DECLARATION_REGISTRY_MODULE,
  );
  const directResolutionViolations = [
    ...reachableFiles(graph, [dispatcher, glyphDispatcher]),
  ]
    .filter((file) => isWithin(file, executionReducerDirectory))
    .flatMap((file) => directResolveCalls(file))
    .filter(
      (violation) =>
        violation.file !== canonicalRegistry ||
        violation.call !== "declaration.resolve(resolution, registry)",
    );
  return {
    compositionPath,
    directResolutionViolations,
  };
}

function runSelfTests() {
  assert.deepEqual(
    directResolveCalls("direct.ts", "counterspellProfile.resolve(input)"),
    [
      {
        file: "direct.ts",
        call: "counterspellProfile.resolve(input)",
      },
    ],
  );
  assert.equal(
    directResolveCalls(
      "registry.ts",
      "spellProcedureExecutionFor(registry, procedure).resolve(input)",
    ).length,
    0,
  );
  assert.equal(
    directResolveCalls(
      "alias.ts",
      "const resolver = profile; resolver.resolve(input)",
    ).length,
    1,
  );
  assert.equal(
    directResolveCalls("bracket.ts", 'profile["resolve"](input)').length,
    1,
  );
  assert.throws(
    () =>
      assertDeclaredEntryPointsExist([
        path.join(ROOT, "missing-entry-point.ts"),
      ]),
    /Declared battle-runtime execution entry points do not exist/,
  );
  const graph = new Map([
    ["execution", ["long-a", "short-helper"]],
    ["long-a", ["long-b"]],
    ["long-b", ["forbidden-admission"]],
    ["short-helper", ["forbidden-presentation", "execution"]],
    ["forbidden-admission", []],
    ["forbidden-presentation", []],
    ["clean", ["leaf"]],
    ["leaf", []],
  ]);
  const classify = (file) =>
    file.startsWith("forbidden-") ? { zone: file.slice(10) } : undefined;
  assert.deepEqual(shortestForbiddenPath(graph, "execution", classify), {
    forbidden: { zone: "presentation" },
    path: ["execution", "short-helper", "forbidden-presentation"],
  });
  assert.equal(shortestForbiddenPath(graph, "clean", classify), undefined);

  const fixtureRoot = fs.mkdtempSync(
    path.join(os.tmpdir(), "battle-import-ownership-"),
  );
  try {
    assert.throws(
      () => declaredDirectoryEntryPoints([path.join(fixtureRoot, "missing")]),
      /execution entry points does not exist/,
    );
    assert.throws(
      () => declaredDirectoryEntryPoints([fixtureRoot]),
      /execution entry points has no TypeScript files/,
    );
    const fixtureExecution = path.join(fixtureRoot, "execution.ts");
    const fixtureHelper = path.join(fixtureRoot, "helper.ts");
    const fixtureForbidden = path.join(fixtureRoot, "forbidden.ts");
    const fixtureAuthored = path.join(fixtureRoot, "authored.ts");
    const fixtureLaundered = path.join(fixtureRoot, "laundered.ts");
    const assertSurfaceImportRequiresAdmission = (source, expected) => {
      fs.writeFileSync(fixtureAuthored, source);
      admissionSurfaceImportCache.delete(fixtureAuthored);
      assert.equal(requiresSurfaceAdmission(fixtureAuthored), expected);
    };
    fs.writeFileSync(fixtureExecution, 'import "./helper.ts";\n');
    fs.writeFileSync(fixtureHelper, 'export * from "./forbidden.ts";\n');
    fs.writeFileSync(fixtureForbidden, "export const forbidden = true;\n");
    fs.writeFileSync(
      fixtureAuthored,
      'import type { ClassFeatureRecord } from "@dnd/surface/surface/types";\nexport type Fixture = ClassFeatureRecord;\n',
    );
    const fixtureGraph = importGraph([fixtureExecution], fixtureRoot, {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      allowImportingTsExtensions: true,
    });
    assert.deepEqual(fixtureGraph.get(fixtureExecution), [fixtureHelper]);
    assert.deepEqual(fixtureGraph.get(fixtureHelper), [fixtureForbidden]);
    assert.deepEqual(
      shortestForbiddenPath(fixtureGraph, fixtureExecution, (file) =>
        file === fixtureForbidden ? { zone: "fixture" } : undefined,
      ),
      {
        forbidden: { zone: "fixture" },
        path: [fixtureExecution, fixtureHelper, fixtureForbidden],
      },
    );
    assert.equal(requiresSurfaceAdmission(fixtureAuthored), true);
    fs.writeFileSync(
      fixtureAuthored,
      'import type { CreatureNamedAttackRoll } from "@dnd/surface/surface/types";\nexport type Fixture = CreatureNamedAttackRoll;\n',
    );
    admissionSurfaceImportCache.delete(fixtureAuthored);
    assert.equal(requiresSurfaceAdmission(fixtureAuthored), true);
    assert.equal(
      forbiddenOwner(fixtureAuthored, "admission")?.zone,
      "admission",
    );
    fs.writeFileSync(
      fixtureAuthored,
      'import type { CreatureAttackRollMechanics } from "@dnd/surface/surface/types";\nexport type Fixture = CreatureAttackRollMechanics;\n',
    );
    admissionSurfaceImportCache.delete(fixtureAuthored);
    assert.equal(requiresSurfaceAdmission(fixtureAuthored), false);
    fs.writeFileSync(
      fixtureLaundered,
      "export type CharacterWeaponAttackExecutionWeapon = { readonly name: string; readonly usage: 'melee' };\n",
    );
    assert.deepEqual(executionShapeLaundering(fixtureLaundered), [
      { shapeName: "CharacterWeaponAttackExecutionWeapon", field: "name" },
    ]);
    fs.writeFileSync(
      fixtureLaundered,
      "export type CharacterWeaponAttackExecutionWeapon = { readonly weaponUnitId: string; readonly usage: 'melee' };\n",
    );
    assert.deepEqual(executionShapeLaundering(fixtureLaundered), []);
    fs.writeFileSync(
      fixtureAuthored,
      'import type { AuthoredSpellSource, AuthoredUnitSource } from "@dnd/surface/surface/types";\nexport type Fixture = AuthoredSpellSource | AuthoredUnitSource;\n',
    );
    admissionSurfaceImportCache.delete(fixtureAuthored);
    assert.equal(requiresSurfaceAdmission(fixtureAuthored), true);
    assert.equal(
      forbiddenOwner(fixtureAuthored, "admission")?.zone,
      "admission",
    );
    fs.writeFileSync(
      fixtureAuthored,
      'type Fixture = import("@dnd/surface/surface/types").SpellRecord;\n',
    );
    admissionSurfaceImportCache.delete(fixtureAuthored);
    assert.equal(requiresSurfaceAdmission(fixtureAuthored), true);
    fs.writeFileSync(
      fixtureAuthored,
      'import { SrdSurfaceSchema } from "@dnd/surface/surface/schema";\nvoid SrdSurfaceSchema;\n',
    );
    admissionSurfaceImportCache.delete(fixtureAuthored);
    assert.equal(requiresSurfaceAdmission(fixtureAuthored), true);
    fs.writeFileSync(
      fixtureAuthored,
      'import { SrdProvenanceSchema } from "@dnd/surface/surface/schema";\nvoid SrdProvenanceSchema;\n',
    );
    admissionSurfaceImportCache.delete(fixtureAuthored);
    assert.equal(requiresSurfaceAdmission(fixtureAuthored), true);
    assert.equal(
      forbiddenOwner(fixtureAuthored, "admission")?.zone,
      "admission",
    );
    assert.equal(
      surfaceModuleOwnership(
        "@dnd/surface/surface/unit-catalog",
        fixtureAuthored,
      ),
      "admission",
    );
    assert.equal(
      surfaceModuleOwnership(
        "@dnd/surface/surface/character-creation-readers",
        fixtureAuthored,
      ),
      "admission",
    );
    assert.equal(
      surfaceModuleOwnership("@dnd/surface/surface/schema", fixtureAuthored),
      "mixed",
    );
    assert.equal(
      surfaceModuleOwnership(
        "@dnd/surface/surface/stat-block-types",
        fixtureAuthored,
      ),
      "mixed",
    );
    assertSurfaceImportRequiresAdmission(
      'import type { DiceExpr } from "@dnd/surface/surface/types";\nexport type Fixture = DiceExpr;\n',
      false,
    );
    assertSurfaceImportRequiresAdmission(
      'import type { StandaloneStatBlock } from "@dnd/surface/surface/types";\nexport type Fixture = StandaloneStatBlock;\n',
      true,
    );
    assertSurfaceImportRequiresAdmission(
      'import { DiceExprSchema } from "@dnd/surface/surface/schema";\nvoid DiceExprSchema;\n',
      false,
    );
    assertSurfaceImportRequiresAdmission(
      'import { StandaloneStatBlockSchema } from "@dnd/surface/surface/schema";\nvoid StandaloneStatBlockSchema;\n',
      true,
    );
    assertSurfaceImportRequiresAdmission(
      'import SurfaceTypes from "@dnd/surface/surface/types";\nvoid SurfaceTypes;\n',
      true,
    );
    assertSurfaceImportRequiresAdmission(
      'import * as SurfaceTypes from "@dnd/surface/surface/types";\nvoid SurfaceTypes;\n',
      true,
    );
    assertSurfaceImportRequiresAdmission(
      'import "@dnd/surface/surface/types";\n',
      true,
    );
    assertSurfaceImportRequiresAdmission(
      'void import("@dnd/surface/surface/types");\n',
      true,
    );
    assertSurfaceImportRequiresAdmission(
      'const SurfaceTypes = require("@dnd/surface/surface/types");\nvoid SurfaceTypes;\n',
      true,
    );
    assertSurfaceImportRequiresAdmission(
      'import SurfaceTypes = require("@dnd/surface/surface/types");\nvoid SurfaceTypes;\n',
      true,
    );
    assertSurfaceImportRequiresAdmission(
      'import type { UnknownExecutionFact } from "@dnd/surface/surface/types";\nexport type Fixture = UnknownExecutionFact;\n',
      true,
    );
    assertSurfaceImportRequiresAdmission(
      'type Fixture = import("@dnd/surface/surface/types").DiceExpr;\n',
      false,
    );
    assertSurfaceImportRequiresAdmission(
      'type Fixture = import("@dnd/surface/surface/types").StandaloneStatBlock;\n',
      true,
    );
    assertSurfaceImportRequiresAdmission(
      'type Fixture = import("@dnd/surface/surface/types");\n',
      true,
    );
    assertSurfaceImportRequiresAdmission(
      'import { DiceExprSchema } from "@dnd/surface/surface/schema-spell";\nvoid DiceExprSchema;\n',
      true,
    );
    const relativeStatBlockTypes = path.relative(
      path.dirname(fixtureAuthored),
      `${SURFACE_STAT_BLOCK_TYPES_MODULE}.ts`,
    );
    fs.writeFileSync(
      fixtureAuthored,
      `import type { StatBlockRecord } from ${JSON.stringify(relativeStatBlockTypes)};\nexport type Fixture = StatBlockRecord;\n`,
    );
    admissionSurfaceImportCache.delete(fixtureAuthored);
    assert.equal(requiresSurfaceAdmission(fixtureAuthored), true);
    assert.equal(
      forbiddenOwner(fixtureAuthored, "admission")?.zone,
      "admission",
    );
    for (const authoredShape of [
      "StandaloneStatBlock",
      "StatBlockProcedureEntry",
      "StatBlockSpellReference",
    ]) {
      assertSurfaceImportRequiresAdmission(
        `import type { ${authoredShape} } from ${JSON.stringify(relativeStatBlockTypes)};\nexport type Fixture = ${authoredShape};\n`,
        true,
      );
    }
    fs.writeFileSync(
      fixtureAuthored,
      `import type { StatBlockProcedureOrdinal } from ${JSON.stringify(relativeStatBlockTypes)};\nexport type Fixture = StatBlockProcedureOrdinal;\n`,
    );
    admissionSurfaceImportCache.delete(fixtureAuthored);
    assert.equal(requiresSurfaceAdmission(fixtureAuthored), false);
    assert.equal(
      forbiddenOwner(`${SURFACE_STAT_BLOCK_TYPES_MODULE}.ts`),
      undefined,
    );
    for (const mixedOwner of [
      `${SURFACE_TYPES_MODULE}.ts`,
      `${SURFACE_SCHEMA_ROOT}.ts`,
      `${SURFACE_STAT_BLOCK_TYPES_MODULE}.ts`,
    ]) {
      assert.deepEqual(importGraph([mixedOwner]).get(mixedOwner), []);
    }
    assert.equal(forbiddenOwner(fixtureAuthored, "admission")?.zone, undefined);
    fs.writeFileSync(
      fixtureAuthored,
      'import { decodeSpellRecordSync } from "@dnd/surface/surface/schema";\nvoid decodeSpellRecordSync;\n',
    );
    admissionSurfaceImportCache.delete(fixtureAuthored);
    assert.equal(requiresSurfaceAdmission(fixtureAuthored), true);
    const relativeCatalog = path.relative(
      path.dirname(fixtureAuthored),
      path.join(SURFACE_SOURCE_ROOT, "surface/unit-catalog.ts"),
    );
    fs.writeFileSync(
      fixtureAuthored,
      `import { srdUnitCollection } from ${JSON.stringify(relativeCatalog)};\nvoid srdUnitCollection;\n`,
    );
    admissionSurfaceImportCache.delete(fixtureAuthored);
    assert.equal(requiresSurfaceAdmission(fixtureAuthored), true);
    assert.equal(
      forbiddenOwner(
        path.join(SURFACE_SOURCE_ROOT, "surface/unit-catalog.ts"),
        "admission",
      )?.zone,
      "admission",
    );
    fs.writeFileSync(
      fixtureAuthored,
      'import { decodeUnitRecordEither, BackgroundRecordKindSchema } from "@dnd/surface/surface/schema";\nvoid decodeUnitRecordEither;\nvoid BackgroundRecordKindSchema;\n',
    );
    admissionSurfaceImportCache.delete(fixtureAuthored);
    assert.equal(requiresSurfaceAdmission(fixtureAuthored), true);
    fs.writeFileSync(
      fixtureExecution,
      '/// <reference path="./forbidden.ts" />\nexport const execution = true;\n',
    );
    const referenceGraph = importGraph([fixtureExecution], fixtureRoot, {
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      allowImportingTsExtensions: true,
    });
    assert.deepEqual(referenceGraph.get(fixtureExecution), [fixtureForbidden]);
    fs.writeFileSync(
      fixtureExecution,
      'const target = "./helper.ts";\nvoid import(target);\n',
    );
    assert.throws(
      () =>
        importGraph([fixtureExecution], fixtureRoot, {
          module: ts.ModuleKind.ESNext,
          moduleResolution: ts.ModuleResolutionKind.Bundler,
          allowImportingTsExtensions: true,
        }),
      /Opaque module loading/,
    );
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true });
  }

  for (let shortLength = 1; shortLength <= 20; shortLength += 1) {
    for (let extraLength = 1; extraLength <= 20; extraLength += 1) {
      const generatedGraph = new Map();
      const shortPath = Array.from(
        { length: shortLength },
        (_, index) => `short-${index}`,
      );
      const longPath = Array.from(
        { length: shortLength + extraLength },
        (_, index) => `long-${index}`,
      );
      generatedGraph.set("entry-point", [longPath[0], shortPath[0]]);
      for (const branch of [shortPath, longPath]) {
        branch.forEach((node, index) => {
          generatedGraph.set(
            node,
            index === branch.length - 1
              ? [`forbidden-${branch[0]}`]
              : [branch[index + 1]],
          );
        });
      }
      const result = shortestForbiddenPath(
        generatedGraph,
        "entry-point",
        classify,
      );
      assert.equal(result?.path.length, shortLength + 2);
      assert.equal(result?.path.at(-1), "forbidden-short-0");
    }
  }

  assert.equal(
    forbiddenOwner(
      normalizedRepoPath(`${BATTLE_RUNTIME_SRC}/stat-block-presentation.ts`),
      "presentation",
    )?.zone,
    "presentation",
  );
  assert.equal(
    forbiddenOwner(
      normalizedRepoPath(`${BATTLE_RUNTIME_SRC}/stat-block-execution-state.ts`),
    ),
    undefined,
  );
  assert.equal(
    forbiddenOwner(
      normalizedRepoPath(`${BATTLE_RUNTIME_SRC}/stat-block-execution.ts`),
      "presentation",
    ),
    undefined,
    "Stat Block execution allocation must not be classified as presentation.",
  );
  assert.equal(
    forbiddenOwner(
      normalizedRepoPath(
        `${BATTLE_RUNTIME_SRC}/statblock-action-execution-support.ts`,
      ),
      "admission",
    )?.zone,
    "admission",
    "Named Stat Block action support is an admission owner.",
  );
  for (const formerPortal of [
    `${BATTLE_RUNTIME_SRC}/stat-block-execution.ts`,
    `${BATTLE_RUNTIME_SRC}/statblock-action-execution-support.ts`,
  ]) {
    assert.equal(
      forbiddenOwner(normalizedRepoPath(formerPortal), "admission")?.zone,
      "admission",
      `Former reducer portal must remain forbidden: ${formerPortal}.`,
    );
  }
}

function formatViolation(entryPoint, violation) {
  return [
    `${toRepoPath(entryPoint)} reaches ${violation.forbidden.zone} owner ${toRepoPath(
      violation.path[violation.path.length - 1],
    )}:`,
    ...violation.path.map(
      (file, index) => `${index === 0 ? "  " : "  -> "}${toRepoPath(file)}`,
    ),
  ].join("\n");
}

function checkEntryPoints(
  entryPoints,
  failOnViolation,
  forbiddenZones = [undefined],
) {
  const startedAt = process.hrtime.bigint();
  const graph = importGraph(entryPoints);
  const violations = entryPoints.flatMap((entryPoint) =>
    forbiddenZones.flatMap((zone) => {
      const violation = shortestForbiddenPath(graph, entryPoint, (file) =>
        forbiddenOwner(file, zone),
      );
      return violation === undefined ? [] : [{ entryPoint, violation }];
    }),
  );
  const launderingViolations = [...graph.keys()].flatMap((file) =>
    executionShapeLaundering(file).map((violation) => ({
      file,
      ...violation,
    })),
  );
  const spellExecutionViolations = spellExecutionBoundaryViolations(graph);
  const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  for (const { entryPoint, violation } of violations) {
    console.error(formatViolation(entryPoint, violation));
  }
  for (const violation of launderingViolations) {
    console.error(
      `${toRepoPath(violation.file)} launders forbidden field ${violation.field} into execution shape ${violation.shapeName}.`,
    );
  }
  if (spellExecutionViolations.compositionPath !== undefined) {
    console.error(
      formatViolation(
        dispatcherEntryPoint(),
        spellExecutionViolations.compositionPath,
      ),
    );
  }
  for (const violation of spellExecutionViolations.directResolutionViolations) {
    console.error(
      `${toRepoPath(violation.file)} bypasses the spell execution registry with ${violation.call}.`,
    );
  }
  console.log(
    `Battle-runtime import ownership: ${entryPoints.length} execution entry points, ${graph.size} modules in the reachable import closure, ${elapsedMs.toFixed(1)}ms.`,
  );
  if (
    failOnViolation &&
    (violations.length > 0 ||
      launderingViolations.length > 0 ||
      spellExecutionViolations.compositionPath !== undefined ||
      spellExecutionViolations.directResolutionViolations.length > 0)
  ) {
    process.exitCode = 1;
  }
  return violations;
}

function dispatcherEntryPoint() {
  return normalizedRepoPath(
    `${BATTLE_RUNTIME_SRC}/battle-reducer/dispatcher.ts`,
  );
}

module.exports = {
  battleRuntimeExecutionImportClosure,
  battleRuntimePublicExportOwnerFiles,
};

if (require.main === module) {
  const cliArguments = process.argv.slice(2);
  const supportedArguments = new Set(["--self-test"]);
  const unknownArguments = cliArguments.filter(
    (argument) => !supportedArguments.has(argument),
  );
  if (unknownArguments.length > 0) {
    throw new Error(
      `Unknown battle-runtime import ownership argument(s): ${unknownArguments.join(", ")}.`,
    );
  }
  if (cliArguments.length > 1) {
    throw new Error("Choose exactly one battle-runtime import ownership mode.");
  }

  runSelfTests();

  if (cliArguments.includes("--self-test")) {
    console.log(
      "Battle-runtime import ownership synthetic tests passed: reachable import closure traversal and shortest violation paths.",
    );
  } else {
    checkEntryPoints(executionEntryPoints(), true);
  }
}
