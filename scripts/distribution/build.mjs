import {
  cpSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { root, output, packages } from "./packages.mjs";
import ts from "typescript";
import { buildMcpDistribution } from "./build-mcp.mjs";

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const sdkRoot = resolve(root, "distribution/sdk");
const sdk = readJson(resolve(sdkRoot, "package.json"));
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

// Export destinations also identify their canonical workspace source entrypoints.
const entrypoints = Object.values(sdk.exports).map((entry) =>
  resolve(
    root,
    "packages",
    entry.import.replace("./dist/", "").replace(/\.js$/, ".ts"),
  ),
);
const options = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  exactOptionalPropertyTypes: true,
  skipLibCheck: true,
  declaration: true,
  allowImportingTsExtensions: true,
  rewriteRelativeImportExtensions: true,
  resolveJsonModule: true,
  rootDir: resolve(root, "packages"),
  outDir: resolve(output, "sdk/dist"),
  types: [],
};
const host = ts.createCompilerHost(options);
const discovery = ts.createProgram(entrypoints, options, host);
const workspaceSources = discovery
  .getSourceFiles()
  .filter((source) =>
    source.fileName.startsWith(resolve(root, "packages") + "/"),
  );
const program = ts.createProgram(
  workspaceSources.map((source) => source.fileName),
  options,
  host,
  discovery,
);
const externalDependencies = new Map();
const rewriteImports = (context) => (source) => {
  const rewrite = (literal) => {
    const resolved = ts.resolveModuleName(
      literal.text,
      source.fileName,
      options,
      host,
    ).resolvedModule;
    if (!resolved?.resolvedFileName.startsWith(resolve(root, "packages") + "/"))
      return literal;
    const target = relative(
      dirname(source.fileName),
      resolved.resolvedFileName,
    ).replace(/(?:\.d)?\.ts$/, ".js");
    return context.factory.createStringLiteral(
      target.startsWith(".") ? target : `./${target}`,
    );
  };
  const visit = (original) => {
    const node = ts.visitEachChild(original, visit, context);
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      return context.factory.updateImportDeclaration(
        node,
        node.modifiers,
        node.importClause,
        rewrite(node.moduleSpecifier),
        node.attributes ??
          (node.moduleSpecifier.text.endsWith(".json")
            ? context.factory.createImportAttributes([
                context.factory.createImportAttribute(
                  context.factory.createIdentifier("type"),
                  context.factory.createStringLiteral("json"),
                ),
              ])
            : undefined),
      );
    }
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      return context.factory.updateExportDeclaration(
        node,
        node.modifiers,
        node.isTypeOnly,
        node.exportClause,
        rewrite(node.moduleSpecifier),
        node.attributes,
      );
    }
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    ) {
      return context.factory.updateImportTypeNode(
        node,
        context.factory.createLiteralTypeNode(rewrite(node.argument.literal)),
        node.attributes,
        node.qualifier,
        node.typeArguments,
        node.isTypeOf,
      );
    }
    return node;
  };
  return ts.visitNode(source, visit);
};
const diagnostics = ts.getPreEmitDiagnostics(program);
if (diagnostics.length > 0) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => root,
      getCanonicalFileName: (name) => name,
      getNewLine: () => "\n",
    }),
  );
  process.exit(1);
}
const result = program.emit(undefined, undefined, undefined, false, {
  before: [rewriteImports],
  afterDeclarations: [rewriteImports],
});
if (result.emitSkipped || result.diagnostics.length) {
  console.error(
    ts.formatDiagnosticsWithColorAndContext(result.diagnostics, {
      getCurrentDirectory: () => root,
      getCanonicalFileName: (name) => name,
      getNewLine: () => "\n",
    }),
  );
  process.exit(1);
}
for (const source of workspaceSources.filter(
  (source) => source.isDeclarationFile,
)) {
  const destination = resolve(
    output,
    "sdk/dist",
    relative(resolve(root, "packages"), source.fileName),
  );
  mkdirSync(dirname(destination), { recursive: true });
  const transformed = ts.transform(source, [rewriteImports]);
  writeFileSync(
    destination,
    ts.createPrinter().printFile(transformed.transformed[0]),
  );
  transformed.dispose();
}
for (const source of program.getSourceFiles()) {
  if (!source.fileName.startsWith(resolve(root, "packages") + "/")) continue;
  if (/test-support|\.test\.|\.mbt\.|qnt-proofs/.test(source.fileName)) {
    throw new Error(`SDK reaches verification-only source: ${source.fileName}`);
  }
  const owner = source.fileName
    .slice(resolve(root, "packages").length + 1)
    .split("/")[0];
  const manifest = readJson(resolve(root, "packages", owner, "package.json"));
  for (const [name, version] of Object.entries(manifest.dependencies ?? {})) {
    if (name.startsWith("@dnd/")) continue;
    if (
      externalDependencies.has(name) &&
      externalDependencies.get(name) !== version
    ) {
      throw new Error(`Conflicting dependency versions for ${name}`);
    }
    externalDependencies.set(name, version);
  }
}
for (const { kind, source, directory, manifest: inputManifest } of packages) {
  mkdirSync(directory, { recursive: true });
  const { private: _private, ...manifest } = inputManifest;
  writeFileSync(
    resolve(directory, "package.json"),
    JSON.stringify(
      {
        ...manifest,
        ...(kind === "sdk"
          ? { dependencies: Object.fromEntries(externalDependencies) }
          : {}),
      },
      null,
      2,
    ) + "\n",
  );
  for (const file of ["LICENSE", "NOTICE"])
    cpSync(resolve(root, file), resolve(directory, file));
  cpSync(resolve(source, "README.md"), resolve(directory, "README.md"));
}
await buildMcpDistribution();
console.log(`Built SDK and MCP packages in ${output}`);
