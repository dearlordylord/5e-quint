import { fileURLToPath } from "node:url";
import { resolve, relative } from "node:path";
import ts from "typescript";
import type {
  ExecutionEvidence,
  OperationAccount,
} from "./operation-accounting-contract.ts";

export const repositoryRoot = fileURLToPath(
  new URL("../../../", import.meta.url),
);
export const contractPath = resolve(
  repositoryRoot,
  "packages/mcp/src/chatgpt/execution-domains.ts",
);
export const decisionsPath = resolve(
  repositoryRoot,
  "packages/mcp/scripts/operation-accounting-decisions.ts",
);
export const chatGptPlanPath = resolve(
  repositoryRoot,
  "packages/mcp/src/chatgpt/operation-tool-plan.ts",
);
const registryPath = resolve(
  repositoryRoot,
  "packages/battle-runtime/src/battle-reducer/spell-procedure-profiles/registry.ts",
);

export function accountingProgram(
  overrides: ReadonlyMap<string, string> = new Map(),
) {
  const config = ts.readConfigFile(
    resolve(repositoryRoot, "packages/mcp/tsconfig.json"),
    ts.sys.readFile,
  );
  if (config.error)
    throw new Error(
      ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
    );
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    resolve(repositoryRoot, "packages/mcp"),
  );
  const host = ts.createCompilerHost(parsed.options);
  const read = host.readFile;
  host.readFile = (file) => overrides.get(file) ?? read(file);
  return ts.createProgram(
    [
      contractPath,
      decisionsPath,
      chatGptPlanPath,
      resolve(repositoryRoot, "packages/mcp/src/server.ts"),
      resolve(repositoryRoot, "packages/mcp/src/protocol-server.ts"),
    ],
    parsed.options,
    host,
  );
}
function sourceFor(program: ts.Program, path: string) {
  const source = program.getSourceFile(path);
  if (!source) throw new Error(`Missing compiler source ${path}`);
  return source;
}
function namedDeclaration(source: ts.SourceFile, name: string): ts.Declaration {
  for (const statement of source.statements) {
    if (ts.isInterfaceDeclaration(statement) && statement.name.text === name)
      return statement;
    if (ts.isVariableStatement(statement))
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === name)
          return declaration;
      }
  }
  throw new Error(`Missing declaration ${source.fileName}:${name}`);
}
export function finiteStrings(
  type: ts.Type,
  checker: ts.TypeChecker,
): readonly string[] {
  if (type.isUnion())
    return [
      ...new Set(
        type.types.flatMap((member) => finiteStrings(member, checker)),
      ),
    ].sort();
  if (type.isStringLiteral()) {
    if (type.value.includes("__unaccounted"))
      throw new Error(`Unprojected execution shape: ${type.value}`);
    return [type.value];
  }
  throw new Error(
    `Operation domain is not a finite string union: ${checker.typeToString(type)}`,
  );
}
export function executionDomains(
  program: ts.Program,
): ReadonlyMap<string, readonly string[]> {
  const checker = program.getTypeChecker();
  const declaration = namedDeclaration(
    sourceFor(program, contractPath),
    "OperationDomains",
  );
  return new Map(
    checker
      .getPropertiesOfType(checker.getTypeAtLocation(declaration))
      .map((property) => [
        property.name,
        finiteStrings(
          checker.getTypeOfSymbolAtLocation(property, declaration),
          checker,
        ),
      ]),
  );
}
export function accountingDiagnostics(program: ts.Program): readonly string[] {
  const packagesRoot = resolve(repositoryRoot, "packages") + "/";
  const proofSources = new Set([
    contractPath,
    decisionsPath,
    registryPath,
    ...program
      .getSourceFiles()
      .filter(
        (source) =>
          source.fileName.startsWith(packagesRoot) &&
          /^[@\w-]+\/src\//.test(source.fileName.slice(packagesRoot.length)) &&
          !/\.(?:test|node-test|d)\.ts$/.test(source.fileName),
      )
      .map((source) => source.fileName),
  ]);
  return [...proofSources].flatMap((file) => {
    const source = sourceFor(program, file);
    return [
      ...program.getSyntacticDiagnostics(source),
      ...program.getSemanticDiagnostics(source),
    ].map((diagnostic) => {
      const line =
        diagnostic.start === undefined
          ? 1
          : source.getLineAndCharacterOfPosition(diagnostic.start).line + 1;
      return `${relative(repositoryRoot, file)}:${line}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`;
    });
  });
}
export function exactCoverage(
  expected: readonly string[],
  actual: readonly string[],
  label: string,
): readonly string[] {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  return [
    ...expected
      .filter((key) => !actualSet.has(key))
      .map((key) => `${label}: unaccounted ${key}`),
    ...actual
      .filter((key) => !expectedSet.has(key))
      .map((key) => `${label}: stale ${key}`),
    ...(actualSet.size === actual.length ? [] : [`${label}: duplicate keys`]),
  ];
}
export type SourceLocation = {
  readonly file: string;
  readonly line: number;
  readonly symbol: string;
};
export function executionSourceLocation(
  node: ts.Node,
  symbol: string,
): SourceLocation {
  const source = node.getSourceFile();
  return {
    file: relative(repositoryRoot, source.fileName),
    line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
    symbol,
  };
}
export function implementedFunctions(source: ts.SourceFile, symbol: string) {
  const found: ts.FunctionDeclaration[] = [];
  function visit(node: ts.Node) {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name?.text === symbol &&
      node.body
    )
      found.push(node);
    ts.forEachChild(node, visit);
  }
  visit(source);
  return found;
}

/** Declared owner outcomes, not a transitive guarantee about its callers. */
export function executionOwnerResultTags(
  program: ts.Program,
  evidence: ExecutionEvidence,
):
  | { readonly kind: "tagged"; readonly tags: readonly string[] }
  | { readonly kind: "unclassified"; readonly reason: string } {
  const source = program.getSourceFile(resolve(repositoryRoot, evidence.file));
  const owners = source ? implementedFunctions(source, evidence.symbol) : [];
  const owner = owners.length === 1 ? owners[0] : undefined;
  if (!owner)
    return { kind: "unclassified", reason: "No unique implemented owner." };
  const checker = program.getTypeChecker();
  const signature = checker.getSignatureFromDeclaration(owner);
  if (!signature)
    return { kind: "unclassified", reason: "No callable signature." };
  const result = checker.getReturnTypeOfSignature(signature);
  const branches = result.isUnion() ? result.types : [result];
  const tags: string[] = [];
  for (const branch of branches) {
    const tag = checker.getPropertyOfType(branch, "tag");
    if (!tag)
      return { kind: "unclassified", reason: "Return branch has no tag." };
    const value = checker.getTypeOfSymbolAtLocation(tag, owner);
    const literals = value.isUnion() ? value.types : [value];
    for (const literal of literals) {
      if (!literal.isStringLiteral())
        return { kind: "unclassified", reason: "Return tag is not finite." };
      tags.push(literal.value);
    }
  }
  return { kind: "tagged", tags: [...new Set(tags)].sort() };
}
export function evidenceLocations(
  program: ts.Program,
  account: OperationAccount,
): {
  readonly locations: readonly SourceLocation[];
  readonly issues: readonly string[];
} {
  const locations: SourceLocation[] = [];
  const issues: string[] = [];
  for (const evidence of account.evidence) {
    const source = program.getSourceFile(
      resolve(repositoryRoot, evidence.file),
    );
    if (!source) {
      issues.push(
        `Evidence file is outside the execution graph: ${evidence.file}`,
      );
      continue;
    }
    const found = implementedFunctions(source, evidence.symbol);
    const implementation = found.length === 1 ? found[0] : undefined;
    if (!implementation)
      issues.push(
        `Expected one implemented function ${evidence.file}:${evidence.symbol}; found ${found.length}`,
      );
    else
      locations.push(executionSourceLocation(implementation, evidence.symbol));
  }
  return { locations, issues };
}
function unwrap(expression: ts.Expression): ts.Expression {
  if (
    ts.isSatisfiesExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isParenthesizedExpression(expression)
  )
    return unwrap(expression.expression);
  return expression;
}
export function spellDeclarationOwners(
  program: ts.Program,
  isStatic: boolean,
): ReadonlyMap<string, readonly SourceLocation[]> {
  const checker = program.getTypeChecker();
  const declaration = namedDeclaration(
    sourceFor(program, registryPath),
    isStatic
      ? "REGISTERED_STATIC_SPELL_MECHANICS_DECLARATIONS"
      : "REGISTERED_INVOCATION_SPELL_PROCEDURE_DECLARATIONS",
  );
  if (!ts.isVariableDeclaration(declaration) || !declaration.initializer)
    throw new Error("Registry has no initializer");
  const object = unwrap(declaration.initializer);
  if (!ts.isObjectLiteralExpression(object))
    throw new Error("Registry must declare its entries upfront");
  const result = new Map<string, readonly SourceLocation[]>();
  for (const property of object.properties) {
    if (
      !ts.isPropertyAssignment(property) ||
      !ts.isIdentifier(property.name) ||
      !ts.isCallExpression(property.initializer)
    )
      throw new Error("Unaccounted registry declaration shape");
    const key = property.name.text;
    const argument = property.initializer.arguments[isStatic ? 1 : 0];
    if (!argument) throw new Error(`Missing registry argument ${key}`);
    let symbol = checker.getSymbolAtLocation(argument);
    if (symbol && symbol.flags & ts.SymbolFlags.Alias)
      symbol = checker.getAliasedSymbol(symbol);
    const target = symbol?.valueDeclaration;
    if (
      !symbol ||
      !target ||
      !ts.isVariableDeclaration(target) ||
      !target.initializer
    )
      throw new Error(`No concrete profile owner ${key}`);
    const type = checker.getTypeAtLocation(argument);
    const procedure = type.getProperty("procedure");
    if (
      !isStatic &&
      (!procedure ||
        finiteStrings(
          checker.getTypeOfSymbolAtLocation(procedure, argument),
          checker,
        ).join() !== key)
    )
      throw new Error(`Profile procedure disagrees with registry key ${key}`);
    const owners = [executionSourceLocation(target, symbol.name)];
    for (const field of isStatic
      ? ["admitMechanics"]
      : ["resolve", "discoverCastAct"]) {
      const member = type.getProperty(field);
      if (
        !member ||
        checker.getTypeOfSymbolAtLocation(member, argument).getCallSignatures()
          .length === 0
      )
        throw new Error(`Missing executable callback ${key}.${field}`);
      for (const memberDeclaration of member.declarations ?? [])
        owners.push(executionSourceLocation(memberDeclaration, field));
    }
    if (result.has(key)) throw new Error(`Duplicate registry key ${key}`);
    result.set(key, owners);
  }
  return result;
}
