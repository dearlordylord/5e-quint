import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  existsSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { root, output, packages } from "./packages.mjs";
import ts from "typescript";
import { buildMcpDistribution } from "./build-mcp.mjs";

export const sdkCompilerOptions = {
  target: "ES2022",
  module: "ESNext",
  moduleResolution: "Bundler",
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
  noEmitOnError: true,
};

const rewriteImports =
  (originalSourceFileName, options, host) => (context) => (source) => {
    const rewrite = (literal) => {
      const resolved = ts.resolveModuleName(
        literal.text,
        originalSourceFileName,
        options,
        host,
      ).resolvedModule;
      if (
        !resolved?.resolvedFileName.startsWith(resolve(root, "packages") + "/")
      )
        return literal;
      const target = relative(
        dirname(originalSourceFileName),
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

export function rewriteSdkOutput(text, originalSourceFileName, options, host) {
  const source = ts.createSourceFile(
    originalSourceFileName,
    text,
    ts.ScriptTarget.ES2022,
    true,
  );
  const transformed = ts.transform(source, [
    rewriteImports(originalSourceFileName, options, host),
  ]);
  try {
    return ts.createPrinter().printFile(transformed.transformed[0]);
  } finally {
    transformed.dispose();
  }
}

export async function buildDistribution() {
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
  const options = ts.convertCompilerOptionsFromJson(
    sdkCompilerOptions,
    root,
  ).options;
  const host = ts.createCompilerHost(options);
  const discovery = ts.createProgram(entrypoints, options, host);
  const workspaceSources = discovery
    .getSourceFiles()
    .filter((source) =>
      source.fileName.startsWith(resolve(root, "packages") + "/"),
    );
  const program = discovery;
  const externalDependencies = new Map();
  const temporaryConfigDirectory = mkdtempSync(
    resolve(output, "sdk-compiler-"),
  );
  try {
    const configPath = resolve(temporaryConfigDirectory, "tsconfig.json");
    writeFileSync(
      configPath,
      JSON.stringify({
        compilerOptions: sdkCompilerOptions,
        files: workspaceSources.map((source) => source.fileName),
      }),
    );
    const nativePackage = createRequire(import.meta.url).resolve(
      "@typescript/native/package.json",
    );
    const result = spawnSync(
      process.execPath,
      [resolve(dirname(nativePackage), "bin/tsc"), "-p", configPath],
      {
        cwd: root,
        stdio: "inherit",
      },
    );
    if (result.error) throw result.error;
    if (result.status !== 0)
      throw new Error(
        `Native SDK compiler failed (${result.signal ?? result.status}).`,
      );
  } finally {
    rmSync(temporaryConfigDirectory, { recursive: true, force: true });
  }
  for (const source of workspaceSources.filter(
    (source) => !source.isDeclarationFile && source.fileName.endsWith(".ts"),
  )) {
    for (const extension of [".js", ".d.ts"]) {
      const destination = resolve(
        output,
        "sdk/dist",
        relative(resolve(root, "packages"), source.fileName).replace(
          /\.ts$/,
          extension,
        ),
      );
      if (!existsSync(destination))
        throw new Error(`SDK compiler omitted output: ${destination}`);
      writeFileSync(
        destination,
        rewriteSdkOutput(
          readFileSync(destination, "utf8"),
          source.fileName,
          options,
          host,
        ),
      );
    }
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
    const transformed = ts.transform(source, [
      rewriteImports(source.fileName, options, host),
    ]);
    writeFileSync(
      destination,
      ts.createPrinter().printFile(transformed.transformed[0]),
    );
    transformed.dispose();
  }
  for (const source of program.getSourceFiles()) {
    if (!source.fileName.startsWith(resolve(root, "packages") + "/")) continue;
    if (/test-support|\.test\.|\.mbt\.|qnt-proofs/.test(source.fileName)) {
      throw new Error(
        `SDK reaches verification-only source: ${source.fileName}`,
      );
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
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await buildDistribution();
