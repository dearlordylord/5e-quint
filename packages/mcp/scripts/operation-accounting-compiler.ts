import {
  ordinaryFrontiersForResult,
  constructionKinds,
  literalProperty,
  type TypeProjectionOperations,
} from "./execution-type-projection.ts";
import { fileURLToPath } from "node:url";
import { resolve, relative } from "node:path";
import ts from "typescript";
import {
  API,
  TypeFlags,
  type Project,
  type Diagnostic,
  type Type,
} from "@typescript/native/unstable/sync";
import {
  isCallExpression as isNativeCallExpression,
  isObjectLiteralExpression as isNativeObjectLiteralExpression,
} from "@typescript/native/unstable/ast/is";
import type {
  CallExpression as NativeCallExpression,
  ObjectLiteralExpression as NativeObjectLiteralExpression,
} from "@typescript/native/unstable/ast";
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

const accountingConfigPath = resolve(
  repositoryRoot,
  "packages/mcp/tsconfig.json",
);
const nativeInputs = new WeakMap<ts.Program, ReadonlyMap<string, string>>();
type NativeAccountingSession = {
  readonly api: API;
  readonly files: Map<string, string>;
  snapshot: ReturnType<API["updateSnapshot"]> | undefined;
  program: ts.Program | undefined;
  project: Project | undefined;
  readonly expressions: Map<
    string,
    ReadonlyMap<string, NativeCallExpression | NativeObjectLiteralExpression>
  >;
};
let nativeSession: NativeAccountingSession | undefined;

export function closeAccountingCompiler(): void {
  const session = nativeSession;
  nativeSession = undefined;
  if (session) {
    try {
      session.snapshot?.dispose();
    } finally {
      session.api.close();
    }
  }
}

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
  const sourceOverrides = new Map(overrides);
  const read = host.readFile;
  host.readFile = (file) => sourceOverrides.get(file) ?? read(file);
  const program = ts.createProgram(
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
  nativeInputs.set(
    program,
    new Map([
      ...sourceOverrides,
      [
        accountingConfigPath,
        JSON.stringify({
          ...config.config,
          files: program.getRootFileNames(),
          include: [],
          exclude: [],
        }),
      ],
    ]),
  );
  return program;
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
function ensureNativeProject(program: ts.Program): Project {
  const inputs = nativeInputs.get(program);
  if (!inputs) throw new Error("Missing accounting compiler inputs.");
  if (!nativeSession) {
    const files = new Map<string, string>();
    nativeSession = {
      api: new API({
        cwd: repositoryRoot,
        fs: { readFile: (file) => files.get(file) },
      }),
      files,
      snapshot: undefined,
      program: undefined,
      project: undefined,
      expressions: new Map(),
    };
  }
  const session = nativeSession;
  if (session.program === program && session.project) return session.project;
  try {
    const changed = [
      ...new Set([...session.files.keys(), ...inputs.keys()]),
    ].filter((file) => session.files.get(file) !== inputs.get(file));
    const firstSnapshot = session.snapshot === undefined;
    session.snapshot?.dispose();
    session.files.clear();
    for (const [file, text] of inputs) session.files.set(file, text);
    session.snapshot = session.api.updateSnapshot({
      ...(firstSnapshot ? { openProjects: [accountingConfigPath] } : {}),
      fileChanges: { changed },
    });
    const project = session.snapshot.getProject(accountingConfigPath);
    if (!project) throw new Error("Missing native accounting project.");
    const expectedRoots = new Set(program.getRootFileNames());
    if (
      project.rootFiles.length !== expectedRoots.size ||
      project.rootFiles.some((file) => !expectedRoots.has(file))
    )
      throw new Error("Native accounting compiler root files differ.");
    session.program = program;
    session.project = project;
    session.expressions.clear();
    return project;
  } catch (error) {
    closeAccountingCompiler();
    throw error;
  }
}
function nativeAccountingExpression(
  program: ts.Program,
  expression: ts.CallExpression | ts.ObjectLiteralExpression,
) {
  const project = ensureNativeProject(program);
  const session = nativeSession;
  if (!session) throw new Error("Missing native accounting session.");
  const source = expression.getSourceFile();
  const nativeSource = project.program.getSourceFile(source.fileName);
  if (!nativeSource)
    throw new Error(`Missing native accounting source ${source.fileName}.`);
  if (nativeSource.text !== source.text)
    throw new Error(`Native accounting source differs ${source.fileName}.`);
  const span = (kind: string, start: number, end: number) =>
    `${kind}:${start}:${end}`;
  const expressions =
    session.expressions.get(source.fileName) ??
    (() => {
      const index = new Map<
        string,
        NativeCallExpression | NativeObjectLiteralExpression
      >();
      function visit(
        node: import("@typescript/native/unstable/ast").Node,
      ): void {
        if (isNativeCallExpression(node))
          index.set(span("call", node.getStart(), node.end), node);
        if (isNativeObjectLiteralExpression(node))
          index.set(span("object", node.getStart(), node.end), node);
        node.forEachChild(visit);
      }
      visit(nativeSource);
      session.expressions.set(source.fileName, index);
      return index;
    })();
  const kind = ts.isCallExpression(expression) ? "call" : "object";
  const node = expressions.get(
    span(kind, expression.getStart(), expression.end),
  );
  if (!node)
    throw new Error(
      `Missing native accounting ${kind} ${source.fileName}:${expression.getStart()}.`,
    );
  return { project, node };
}

export function nativeDiagnosticMessage(diagnostic: Diagnostic): string {
  return [
    diagnostic.text,
    ...(diagnostic.messageChain ?? []).map(nativeDiagnosticMessage),
  ].join("\n");
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
  const project = ensureNativeProject(program);
  try {
    const nativeFiles = new Set(project.program.getSourceFileNames());
    return [...proofSources].flatMap((file) => {
      if (!nativeFiles.has(file))
        throw new Error(`Native accounting compiler omitted ${file}.`);
      const source = sourceFor(program, file);
      return [
        ...project.program.getSyntacticDiagnostics(file),
        ...project.program.getBindDiagnostics(file),
        ...project.program.getSemanticDiagnostics(file),
      ].map((diagnostic) => {
        const line =
          source.getLineAndCharacterOfPosition(diagnostic.pos).line + 1;
        return `${relative(repositoryRoot, file)}:${line}: ${nativeDiagnosticMessage(diagnostic)}`;
      });
    });
  } catch (error) {
    closeAccountingCompiler();
    throw error;
  }
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
/** Follow only same-source immutable named bindings; ambiguous or dynamic owners fail closed. */
export function registryFactoryCall(
  expression: ts.Expression,
  checker: ts.TypeChecker,
): ts.CallExpression | undefined {
  const visited = new Set<ts.Symbol>();
  function resolveCall(value: ts.Expression): ts.CallExpression | undefined {
    const unwrapped = unwrap(value);
    if (ts.isCallExpression(unwrapped)) return unwrapped;
    if (!ts.isIdentifier(unwrapped)) return undefined;
    const symbol = checker.getSymbolAtLocation(unwrapped);
    if (!symbol || visited.has(symbol)) return undefined;
    const declarations = symbol.declarations ?? [];
    if (declarations.length !== 1) return undefined;
    const declaration = declarations[0];
    if (
      !declaration ||
      !ts.isVariableDeclaration(declaration) ||
      !declaration.initializer ||
      declaration.getSourceFile() !== expression.getSourceFile() ||
      !ts.isVariableDeclarationList(declaration.parent) ||
      !(declaration.parent.flags & ts.NodeFlags.Const)
    )
      return undefined;
    visited.add(symbol);
    return resolveCall(declaration.initializer);
  }
  return resolveCall(expression);
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
    if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name))
      throw new Error("Unaccounted registry declaration shape");
    const key = property.name.text;
    const call = registryFactoryCall(property.initializer, checker);
    const factory = isStatic
      ? "registeredStaticSpellMechanicsDeclaration"
      : "registeredSpellProcedureDeclaration";
    if (
      !call ||
      !ts.isIdentifier(call.expression) ||
      call.expression.text !== factory
    )
      throw new Error("Unaccounted registry factory binding");
    const argument = call.arguments[isStatic ? 1 : 0];
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

export function reflectionProjectionOperations(
  checker: ts.TypeChecker,
  node: ts.Node,
): TypeProjectionOperations<ts.Type> {
  return {
    branches: (type) => (type.isUnion() ? type.types : [type]),
    literalStrings: (type) => {
      const branches = type.isUnion() ? type.types : [type];
      return branches.every((branch): branch is ts.StringLiteralType =>
        branch.isStringLiteral(),
      )
        ? branches.map((branch) => branch.value)
        : undefined;
    },
    property: (type, name) => {
      const symbol = checker.getPropertyOfType(type, name);
      return symbol && checker.getTypeOfSymbolAtLocation(symbol, node);
    },
    numberElement: (type) =>
      checker.getIndexTypeOfType(type, ts.IndexKind.Number),
    baseConstraint: (type) => checker.getBaseConstraintOfType(type) ?? type,
    isNever: (type) => checker.isTypeAssignableTo(type, checker.getNeverType()),
  };
}
export function nativeProjectionOperations(
  project: Project,
  node: NativeCallExpression | NativeObjectLiteralExpression,
): TypeProjectionOperations<Type> {
  const checker = project.checker;
  return {
    branches: (type) => (type.isUnionType() ? type.getTypes() : [type]),
    literalStrings: (type) => {
      const branches = type.isUnionType() ? type.getTypes() : [type];
      return branches.every((branch) => branch.isStringLiteralType())
        ? branches.flatMap((branch) =>
            branch.isStringLiteralType() ? [branch.value] : [],
          )
        : undefined;
    },
    property: (type, name) => {
      const symbol = checker.getPropertyOfType(type, name);
      return symbol && checker.getTypeOfSymbolAtLocation(symbol, node);
    },
    numberElement: (type) =>
      checker
        .getIndexInfosOfType(type)
        .find((info) => info.keyType.flags & TypeFlags.Number)?.valueType,
    baseConstraint: (type) => checker.getBaseConstraintOfType(type) ?? type,
    isNever: (type) => checker.isTypeAssignableTo(type, checker.getNeverType()),
  };
}
export function nativeCallGenericFrontierResults(
  program: ts.Program,
  call: ts.CallExpression,
) {
  if (!nativeInputs.has(program)) return undefined;
  const { project, node } = nativeAccountingExpression(program, call);
  if (!isNativeCallExpression(node))
    throw new Error("Native accounting call kind differs.");
  const type = project.checker.getTypeAtLocation(node);
  if (!type) throw new Error("Missing native accounting call type.");
  const operations = nativeProjectionOperations(project, node);
  return genericFrontierResults(operations, type);
}
export function genericFrontierResults<T>(
  operations: TypeProjectionOperations<T>,
  type: T,
) {
  return operations.branches(type).flatMap((branch) => {
    const tags = literalProperty(operations, branch, "tag");
    if (tags?.length === 1 && tags[0] === "needsHoles")
      return [
        {
          resultPath: [],
          result: ordinaryFrontiersForResult(operations, branch),
        },
      ];
    if (tags?.length === 1 && tags[0] === "resolution") {
      const nested = operations.property(branch, "result");
      if (
        nested &&
        operations
          .branches(nested)
          .some((member) =>
            literalProperty(operations, member, "tag")?.includes("needsHoles"),
          )
      )
        return [
          {
            resultPath: ["result"],
            result: ordinaryFrontiersForResult(operations, nested),
          },
        ];
    }
    return [];
  });
}

export function nativeObjectHoleKinds(
  program: ts.Program,
  object: ts.ObjectLiteralExpression,
) {
  if (!nativeInputs.has(program))
    return { kind: "reflectionRequired" } as const;
  const { project, node } = nativeAccountingExpression(program, object);
  if (!isNativeObjectLiteralExpression(node))
    throw new Error("Native accounting object kind differs.");
  const type = project.checker.getTypeAtLocation(node);
  if (!type) throw new Error("Missing native accounting object type.");
  return {
    kind: "classified",
    classification: constructionKinds(
      nativeProjectionOperations(project, node),
      type,
    ),
  } as const;
}
