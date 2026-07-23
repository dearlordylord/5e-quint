#!/usr/bin/env node

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const ts = require("typescript");

const ROOT = path.resolve(__dirname, "..");
const BATTLE_RUNTIME_SRC = "packages/battle-runtime/src";

const EXECUTION_ROOT_DIRECTORIES = [
  `${BATTLE_RUNTIME_SRC}/procedure-execution`,
];
const EXECUTION_ROOT_FILES = [
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

const authoredSurfaceOwnerCache = new Map();
const SURFACE_SOURCE_ROOT = path.join(ROOT, "packages/surface/src");
const SURFACE_SCHEMA_ROOT = path.join(SURFACE_SOURCE_ROOT, "surface/schema");
const SURFACE_TYPES_MODULE = path.join(SURFACE_SOURCE_ROOT, "surface/types");

function isAuthoredSurfaceSymbol(name) {
  return (
    name.startsWith("Authored") ||
    name.startsWith("CreatureNamed") ||
    name.includes("Record") ||
    name.includes("SrdSurface") ||
    name.includes("Provenance")
  );
}

const PROTECTED_EXECUTION_SHAPES = new Map([
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

function protectedExecutionShapeLaundering(file) {
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
    const forbiddenFields = PROTECTED_EXECUTION_SHAPES.get(shapeName);
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
    file === SURFACE_SCHEMA_ROOT ||
    file.startsWith(`${SURFACE_SCHEMA_ROOT}-`)
  );
}

function surfaceModuleOwnership(specifier, importingFile) {
  const withoutExtension = specifier.replace(/\.[cm]?[jt]sx?$/, "");
  if (withoutExtension.startsWith("@dnd/surface")) {
    return withoutExtension === "@dnd/surface/surface/types" ||
      withoutExtension === "@dnd/surface/surface/schema" ||
      withoutExtension.startsWith("@dnd/surface/surface/schema-")
      ? "mixed"
      : "admission";
  }
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
  return isMixedSurfacePath(resolved) ? "mixed" : "admission";
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

function executionRoots() {
  const declaredFiles = EXECUTION_ROOT_FILES.map(normalizedRepoPath);
  assertDeclaredRootsExist(declaredFiles);
  return [
    ...declaredDirectoryRoots(
      EXECUTION_ROOT_DIRECTORIES.map(normalizedRepoPath),
    ),
    ...declaredFiles,
  ].sort();
}

function declaredDirectoryRoots(directories) {
  return directories.flatMap((directory) => {
    if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
      throw new Error(
        `Declared battle-runtime execution root directory does not exist: ${toRepoPath(directory)}`,
      );
    }
    const roots = listTypeScriptFiles(directory);
    if (roots.length === 0) {
      throw new Error(
        `Declared battle-runtime execution root directory has no TypeScript roots: ${toRepoPath(directory)}`,
      );
    }
    return roots;
  });
}

function assertDeclaredRootsExist(files) {
  const missing = files.filter((file) => !fs.existsSync(file));
  if (missing.length > 0) {
    throw new Error(
      `Declared battle-runtime execution root(s) do not exist:\n${missing
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
    (isAuthoredSurfaceFile(file) || importsAuthoredSurfaceSymbol(file))
  ) {
    return { zone: "admission", path: repoPath };
  }
  return undefined;
}

function importsAuthoredSurfaceSymbol(file) {
  const cached = authoredSurfaceOwnerCache.get(file);
  if (cached !== undefined) return cached;
  const source = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    false,
  );
  let importsAuthoredRecord = false;
  const visit = (node) => {
    if (importsAuthoredRecord) return;
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal) &&
      surfaceModuleOwnership(node.argument.literal.text, file) !== undefined
    ) {
      const importedName = node.qualifier?.getText(sourceFile) ?? "";
      importsAuthoredRecord =
        surfaceModuleOwnership(node.argument.literal.text, file) ===
          "admission" || isAuthoredSurfaceSymbol(importedName);
      if (importsAuthoredRecord) return;
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
      importsAuthoredRecord = true;
      break;
    }
    if (ts.isImportDeclaration(statement)) {
      const bindings = statement.importClause?.namedBindings;
      importsAuthoredRecord =
        bindings === undefined
          ? statement.importClause?.name !== undefined
          : ts.isNamespaceImport(bindings) ||
            bindings.elements.some((element) =>
              isAuthoredSurfaceSymbol(
                (element.propertyName ?? element.name).text,
              ),
            );
      if (importsAuthoredRecord) break;
      continue;
    }
    importsAuthoredRecord =
      statement.exportClause === undefined ||
      !ts.isNamedExports(statement.exportClause) ||
      statement.exportClause.elements.some((element) =>
        isAuthoredSurfaceSymbol((element.propertyName ?? element.name).text),
      );
    if (importsAuthoredRecord) break;
  }
  if (!importsAuthoredRecord) visit(sourceFile);
  authoredSurfaceOwnerCache.set(file, importsAuthoredRecord);
  return importsAuthoredRecord;
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
  roots,
  repositoryRoot = ROOT,
  options = compilerOptions(),
) {
  const resolutionCache = ts.createModuleResolutionCache(
    repositoryRoot,
    (fileName) => fileName,
    options,
  );
  const graph = new Map();
  const pending = [...roots];
  while (pending.length > 0) {
    const file = pending.pop();
    if (graph.has(file)) continue;
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
          `Opaque module loading is not allowed in a protected execution closure: ${toRepoPath(file)}.`,
        );
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
}

function shortestForbiddenPath(graph, root, classifyForbidden) {
  const queue = [[root]];
  const visited = new Set([root]);
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

function reachableFiles(graph, roots) {
  const reachable = new Set(roots);
  const queue = [...roots];
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
  const protectedReducerRoot = normalizedRepoPath(
    `${BATTLE_RUNTIME_SRC}/battle-reducer`,
  );
  const procedureProfilesRoot = normalizedRepoPath(
    `${BATTLE_RUNTIME_SRC}/battle-reducer/spell-procedure-profiles`,
  );
  const directResolutionViolations = [
    ...reachableFiles(graph, [dispatcher, glyphDispatcher]),
  ]
    .filter(
      (file) =>
        isWithin(file, protectedReducerRoot) &&
        !isWithin(file, procedureProfilesRoot),
    )
    .flatMap((file) => directResolveCalls(file));
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
    () => assertDeclaredRootsExist([path.join(ROOT, "missing-root.ts")]),
    /Declared battle-runtime execution root\(s\) do not exist/,
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
      () => declaredDirectoryRoots([path.join(fixtureRoot, "missing")]),
      /execution root directory does not exist/,
    );
    assert.throws(
      () => declaredDirectoryRoots([fixtureRoot]),
      /execution root directory has no TypeScript roots/,
    );
    const fixtureExecution = path.join(fixtureRoot, "execution.ts");
    const fixtureHelper = path.join(fixtureRoot, "helper.ts");
    const fixtureForbidden = path.join(fixtureRoot, "forbidden.ts");
    const fixtureAuthored = path.join(fixtureRoot, "authored.ts");
    const fixtureLaundered = path.join(fixtureRoot, "laundered.ts");
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
    assert.equal(importsAuthoredSurfaceSymbol(fixtureAuthored), true);
    fs.writeFileSync(
      fixtureAuthored,
      'import type { CreatureNamedAttackRoll } from "@dnd/surface/surface/types";\nexport type Fixture = CreatureNamedAttackRoll;\n',
    );
    authoredSurfaceOwnerCache.delete(fixtureAuthored);
    assert.equal(importsAuthoredSurfaceSymbol(fixtureAuthored), true);
    fs.writeFileSync(
      fixtureAuthored,
      'import type { CreatureAttackRollMechanics } from "@dnd/surface/surface/types";\nexport type Fixture = CreatureAttackRollMechanics;\n',
    );
    authoredSurfaceOwnerCache.delete(fixtureAuthored);
    assert.equal(importsAuthoredSurfaceSymbol(fixtureAuthored), false);
    fs.writeFileSync(
      fixtureLaundered,
      "export type CharacterWeaponAttackExecutionWeapon = { readonly name: string; readonly usage: 'melee' };\n",
    );
    assert.deepEqual(protectedExecutionShapeLaundering(fixtureLaundered), [
      { shapeName: "CharacterWeaponAttackExecutionWeapon", field: "name" },
    ]);
    fs.writeFileSync(
      fixtureLaundered,
      "export type CharacterWeaponAttackExecutionWeapon = { readonly weaponUnitId: string; readonly usage: 'melee' };\n",
    );
    assert.deepEqual(protectedExecutionShapeLaundering(fixtureLaundered), []);
    fs.writeFileSync(
      fixtureAuthored,
      'import type { AuthoredSpellSource, AuthoredUnitSource } from "@dnd/surface/surface/types";\nexport type Fixture = AuthoredSpellSource | AuthoredUnitSource;\n',
    );
    authoredSurfaceOwnerCache.delete(fixtureAuthored);
    assert.equal(importsAuthoredSurfaceSymbol(fixtureAuthored), true);
    fs.writeFileSync(
      fixtureAuthored,
      'type Fixture = import("@dnd/surface/surface/types").SpellRecord;\n',
    );
    authoredSurfaceOwnerCache.delete(fixtureAuthored);
    assert.equal(importsAuthoredSurfaceSymbol(fixtureAuthored), true);
    fs.writeFileSync(
      fixtureAuthored,
      'import { SrdSurfaceSchema } from "@dnd/surface/surface/schema";\nvoid SrdSurfaceSchema;\n',
    );
    authoredSurfaceOwnerCache.delete(fixtureAuthored);
    assert.equal(importsAuthoredSurfaceSymbol(fixtureAuthored), true);
    fs.writeFileSync(
      fixtureAuthored,
      'import { SrdProvenanceSchema } from "@dnd/surface/surface/schema";\nvoid SrdProvenanceSchema;\n',
    );
    authoredSurfaceOwnerCache.delete(fixtureAuthored);
    assert.equal(importsAuthoredSurfaceSymbol(fixtureAuthored), true);
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
      forbiddenOwner(fixtureAuthored, "admission")?.zone,
      "admission",
    );
    fs.writeFileSync(
      fixtureAuthored,
      'import { decodeSpellRecordSync } from "@dnd/surface/surface/schema";\nvoid decodeSpellRecordSync;\n',
    );
    authoredSurfaceOwnerCache.delete(fixtureAuthored);
    assert.equal(importsAuthoredSurfaceSymbol(fixtureAuthored), true);
    const relativeCatalog = path.relative(
      path.dirname(fixtureAuthored),
      path.join(SURFACE_SOURCE_ROOT, "surface/unit-catalog.ts"),
    );
    fs.writeFileSync(
      fixtureAuthored,
      `import { srdUnitCollection } from ${JSON.stringify(relativeCatalog)};\nvoid srdUnitCollection;\n`,
    );
    authoredSurfaceOwnerCache.delete(fixtureAuthored);
    assert.equal(importsAuthoredSurfaceSymbol(fixtureAuthored), true);
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
    authoredSurfaceOwnerCache.delete(fixtureAuthored);
    assert.equal(importsAuthoredSurfaceSymbol(fixtureAuthored), true);
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
      generatedGraph.set("root", [longPath[0], shortPath[0]]);
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
      const result = shortestForbiddenPath(generatedGraph, "root", classify);
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

function formatViolation(root, violation) {
  return [
    `${toRepoPath(root)} reaches ${violation.forbidden.zone} owner ${toRepoPath(
      violation.path[violation.path.length - 1],
    )}:`,
    ...violation.path.map(
      (file, index) => `${index === 0 ? "  " : "  -> "}${toRepoPath(file)}`,
    ),
  ].join("\n");
}

function checkRoots(roots, failOnViolation, forbiddenZones = [undefined]) {
  const startedAt = process.hrtime.bigint();
  const graph = importGraph(roots);
  const violations = roots.flatMap((root) =>
    forbiddenZones.flatMap((zone) => {
      const violation = shortestForbiddenPath(graph, root, (file) =>
        forbiddenOwner(file, zone),
      );
      return violation === undefined ? [] : [{ root, violation }];
    }),
  );
  const launderingViolations = [...graph.keys()].flatMap((file) =>
    protectedExecutionShapeLaundering(file).map((violation) => ({
      file,
      ...violation,
    })),
  );
  const spellExecutionViolations = spellExecutionBoundaryViolations(graph);
  const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
  for (const { root, violation } of violations) {
    console.error(formatViolation(root, violation));
  }
  for (const violation of launderingViolations) {
    console.error(
      `${toRepoPath(violation.file)} launders forbidden field ${violation.field} into protected execution shape ${violation.shapeName}.`,
    );
  }
  if (spellExecutionViolations.compositionPath !== undefined) {
    console.error(
      formatViolation(
        dispatcherRoot(),
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
    `Battle-runtime import ownership: ${roots.length} root(s), ${graph.size} transitive module(s), ${elapsedMs.toFixed(1)}ms.`,
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

function dispatcherRoot() {
  return normalizedRepoPath(
    `${BATTLE_RUNTIME_SRC}/battle-reducer/dispatcher.ts`,
  );
}

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
  console.log("Battle-runtime import ownership synthetic tests passed.");
} else {
  const roots = executionRoots();
  if (roots.length === 0) {
    throw new Error("No battle-runtime procedure-execution roots were found.");
  }
  checkRoots(roots, true);
}
