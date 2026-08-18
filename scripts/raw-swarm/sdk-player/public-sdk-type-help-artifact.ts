import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import ts from "typescript";

import type {
  PublicSdkTypeHelpArtifact,
  PublicSdkTypeHelpEntry,
} from "./public-sdk-type-help.ts";
import {
  PUBLIC_SDK_TYPE_HELP_ARTIFACT_MAX_BYTES,
  PUBLIC_SDK_TYPE_HELP_ENTRY_MAX_BYTES,
  publicSdkDeclarationGraphSha256,
  publicSdkTypeHelpEntriesSha256,
} from "./public-sdk-type-help.ts";

type VirtualQuery = {
  readonly path: string;
  readonly source: string;
};

function fail(message: string): never {
  throw new Error(message);
}

function compilerOptions(configPath: string): ts.CompilerOptions {
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  if (config.error !== undefined) {
    fail(ts.flattenDiagnosticMessageText(config.error.messageText, "\n"));
  }
  return ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    resolve(configPath, ".."),
  ).options;
}

function programForQuery(
  query: VirtualQuery,
  options: ts.CompilerOptions,
): ts.Program {
  const host = ts.createCompilerHost(options);
  const readFile = host.readFile.bind(host);
  const fileExists = host.fileExists.bind(host);
  const getSourceFile = host.getSourceFile.bind(host);
  host.readFile = (path) =>
    path === query.path ? query.source : readFile(path);
  host.fileExists = (path) => path === query.path || fileExists(path);
  host.getSourceFile = (path, languageVersion, onError, shouldCreateNew) =>
    path === query.path
      ? ts.createSourceFile(path, query.source, languageVersion, true)
      : getSourceFile(path, languageVersion, onError, shouldCreateNew);
  return ts.createProgram([query.path], options, host);
}

function stringLiteralProperty(
  checker: ts.TypeChecker,
  type: ts.Type,
  name: string,
  location: ts.Node,
): string | undefined {
  const property = checker.getPropertyOfType(type, name);
  if (property === undefined) return undefined;
  const propertyType = checker.getTypeOfSymbolAtLocation(
    property,
    property.valueDeclaration ?? property.declarations?.[0] ?? location,
  );
  return propertyType.isStringLiteral() ? propertyType.value : undefined;
}

function cleanTypeText(value: string): string {
  return value
    .replace(/import\("[^"]+"\)\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function ignoredAlias(name: string): boolean {
  return (
    name === "Array" ||
    name === "ReadonlyArray" ||
    name === "ReadonlyNonEmptyArray" ||
    name === "Brand"
  );
}

function defaultLibraryAlias(alias: ts.Symbol): boolean {
  return (alias.declarations ?? []).some(
    (declaration) => declaration.getSourceFile().hasNoDefaultLib,
  );
}

function renderedAliasName(alias: ts.Symbol): string {
  const declaration = alias.declarations?.find(ts.isTypeAliasDeclaration);
  const parameters = declaration?.typeParameters?.map((parameter) =>
    cleanTypeText(parameter.getText()),
  );
  return parameters === undefined || parameters.length === 0
    ? alias.name
    : `${alias.name}<${parameters.join(", ")}>`;
}

function referenceTypeArguments(
  checker: ts.TypeChecker,
  type: ts.Type,
): readonly ts.Type[] {
  if ((type.flags & ts.TypeFlags.Object) === 0) return [];
  // TypeScript exposes ObjectFlags as this runtime discriminator but provides
  // no predicate that narrows Type to ObjectType.
  const objectType = type as ts.ObjectType;
  if ((objectType.objectFlags & ts.ObjectFlags.Reference) === 0) return [];
  // The Reference flag is TypeScript's runtime proof for TypeReference; its
  // public API likewise provides no narrowing predicate for that subtype.
  return checker.getTypeArguments(objectType as ts.TypeReference);
}

function fillDeclaration(
  checker: ts.TypeChecker,
  location: ts.Node,
  fillType: ts.Type,
): string {
  const formatFlags =
    ts.TypeFormatFlags.NoTruncation |
    ts.TypeFormatFlags.InTypeAlias |
    ts.TypeFormatFlags.MultilineObjectLiterals |
    ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;
  const aliases: ts.Symbol[] = [];
  const seenAliases = new Set<ts.Symbol>();
  const aliasNames = new Map<string, ts.Symbol>();
  const inspectedTypes = new Set<ts.Type>();
  if (fillType.aliasSymbol !== undefined) {
    seenAliases.add(fillType.aliasSymbol);
    aliasNames.set(fillType.aliasSymbol.name, fillType.aliasSymbol);
  }
  const registerAlias = (alias: ts.Symbol): void => {
    if (
      seenAliases.has(alias) ||
      ignoredAlias(alias.name) ||
      defaultLibraryAlias(alias)
    ) {
      return;
    }
    const existing = aliasNames.get(alias.name);
    if (existing !== undefined && existing !== alias) {
      fail(`Public fill type help has two aliases named ${alias.name}.`);
    }
    seenAliases.add(alias);
    aliasNames.set(alias.name, alias);
    aliases.push(alias);
  };
  const inspectTypeNode = (node: ts.Node): void => {
    if (ts.isTypeReferenceNode(node)) {
      const referenced = checker.getSymbolAtLocation(node.typeName);
      if (referenced !== undefined) {
        const resolved =
          (referenced.flags & ts.SymbolFlags.Alias) === 0
            ? referenced
            : checker.getAliasedSymbol(referenced);
        if ((resolved.flags & ts.SymbolFlags.TypeAlias) !== 0) {
          registerAlias(resolved);
        }
      }
    }
    ts.forEachChild(node, inspectTypeNode);
  };
  const inspect = (type: ts.Type): void => {
    if (inspectedTypes.has(type)) return;
    inspectedTypes.add(type);
    const alias = type.aliasSymbol;
    if (alias !== undefined) registerAlias(alias);
    if (type.isUnionOrIntersection()) {
      for (const member of type.types) inspect(member);
    }
    const typeArguments =
      type.aliasTypeArguments ?? referenceTypeArguments(checker, type);
    for (const argument of typeArguments) {
      inspect(argument);
    }
    if ((type.flags & ts.TypeFlags.Object) === 0) return;
    for (const property of checker.getPropertiesOfType(type)) {
      const propertyDeclaration =
        property.valueDeclaration ?? property.declarations?.[0];
      const propertyLocation = propertyDeclaration ?? location;
      if (
        propertyDeclaration !== undefined &&
        "type" in propertyDeclaration &&
        propertyDeclaration.type !== undefined
      ) {
        inspectTypeNode(propertyDeclaration.type);
      }
      inspect(checker.getTypeOfSymbolAtLocation(property, propertyLocation));
    }
  };
  const render = (name: string, type: ts.Type, typeLocation: ts.Node): string =>
    `type ${name} = ${cleanTypeText(
      checker.typeToString(type, typeLocation, formatFlags),
    )};`;
  let declaration = `${render("Fill", fillType, location)}\n`;
  inspect(fillType);
  for (let index = 0; index < aliases.length; index += 1) {
    const alias = aliases[index];
    if (alias === undefined) continue;
    const declared = checker.getDeclaredTypeOfSymbol(alias);
    const aliasLocation =
      alias.valueDeclaration ?? alias.declarations?.[0] ?? location;
    declaration += `${render(renderedAliasName(alias), declared, aliasLocation)}\n`;
    for (const aliasDeclaration of alias.declarations ?? []) {
      if (ts.isTypeAliasDeclaration(aliasDeclaration)) {
        inspectTypeNode(aliasDeclaration.type);
      }
    }
    inspect(declared);
  }
  return declaration;
}

function typeHelpEntries(input: {
  readonly declarationIndexPath: string;
  readonly configPath: string;
}): readonly PublicSdkTypeHelpEntry[] {
  const query: VirtualQuery = {
    path: resolve(input.configPath, "../public-sdk-type-help-query.ts"),
    source: `import type { BattleFill } from ${JSON.stringify(
      input.declarationIndexPath,
    )};\nexport type FillUnion = BattleFill;\n`,
  };
  const program = programForQuery(query, compilerOptions(input.configPath));
  const querySource = program.getSourceFile(query.path);
  const alias = querySource?.statements.find(ts.isTypeAliasDeclaration);
  if (querySource === undefined || alias === undefined) {
    fail("Public SDK type-help query could not be constructed.");
  }
  const diagnostics = program.getSemanticDiagnostics(querySource);
  if (diagnostics.length > 0) {
    fail(
      `Public SDK type-help query failed:\n${diagnostics
        .map(({ messageText }) =>
          ts.flattenDiagnosticMessageText(messageText, "\n"),
        )
        .join("\n")}`,
    );
  }
  const checker = program.getTypeChecker();
  const fillUnion = checker.getTypeAtLocation(alias);
  if (!fillUnion.isUnion()) {
    fail("Public BattleFill declaration is not a discriminated union.");
  }
  const membersByKind = new Map<string, ts.Type[]>();
  for (const member of fillUnion.types) {
    const kind = stringLiteralProperty(checker, member, "kind", alias);
    if (kind === undefined) {
      fail("Public BattleFill member has no string-literal kind.");
    }
    membersByKind.set(kind, [...(membersByKind.get(kind) ?? []), member]);
  }
  const entries = [...membersByKind.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([fillKind, members]) => {
      if (members.length !== 1) {
        fail(`Public BattleFill repeats the ${fillKind} discriminant.`);
      }
      const type = members[0];
      if (type === undefined) fail(`BattleFill ${fillKind} has no type.`);
      const declaration = fillDeclaration(checker, alias, type);
      const byteLength = Buffer.byteLength(declaration, "utf8");
      if (byteLength > PUBLIC_SDK_TYPE_HELP_ENTRY_MAX_BYTES) {
        fail(
          `BattleFill ${fillKind} type help is ${String(byteLength)} bytes; maximum is ${String(PUBLIC_SDK_TYPE_HELP_ENTRY_MAX_BYTES)}.`,
        );
      }
      return { fillKind, declaration, byteLength };
    });
  const totalByteLength = entries.reduce(
    (total, entry) => total + entry.byteLength,
    0,
  );
  if (totalByteLength > PUBLIC_SDK_TYPE_HELP_ARTIFACT_MAX_BYTES) {
    fail(
      `Public SDK type-help declarations are ${String(totalByteLength)} bytes; maximum is ${String(PUBLIC_SDK_TYPE_HELP_ARTIFACT_MAX_BYTES)}.`,
    );
  }
  return entries;
}

export function writePublicSdkTypeHelpArtifact(input: {
  readonly destination: string;
  readonly declarationsDirectory: string;
  readonly configPath: string;
}): PublicSdkTypeHelpArtifact {
  const graphSha256 = publicSdkDeclarationGraphSha256(
    input.declarationsDirectory,
  );
  if (graphSha256 === undefined) fail("Public declaration graph is empty.");
  const entries = typeHelpEntries({
    declarationIndexPath: resolve(
      input.declarationsDirectory,
      "packages/battle-runtime/src/index.d.ts",
    ),
    configPath: input.configPath,
  });
  const artifact: PublicSdkTypeHelpArtifact = {
    schemaVersion: 1,
    declarationGraphSha256: graphSha256,
    entriesSha256: publicSdkTypeHelpEntriesSha256(entries),
    entries,
  };
  writeFileSync(input.destination, `${JSON.stringify(artifact, null, 2)}\n`);
  return artifact;
}
