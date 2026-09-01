import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import type * as tsTypes from "typescript";
import { Match } from "effect";

type TypeScriptApi = typeof tsTypes;
const AuthoredSourceAdmissionProof: unique symbol = Symbol(
  "AuthoredSourceAdmissionProof",
);

const requireFromWorkingDirectory = createRequire(
  resolve(process.cwd(), "package.json"),
);
const trustedCompilerRuntimePath = resolve(
  "tooling/typescript/lib/typescript.js",
);
const ts: TypeScriptApi = requireFromWorkingDirectory(
  existsSync(trustedCompilerRuntimePath)
    ? trustedCompilerRuntimePath
    : "typescript",
);

const AUTHORED_SOURCE_ROLES = [
  "player",
  "scenarioCharacter",
  "scenarioSetup",
] as const;
export type AuthoredSourceRole = (typeof AUTHORED_SOURCE_ROLES)[number];
const [PLAYER_ROLE, SCENARIO_CHARACTER_ROLE, SCENARIO_SETUP_ROLE] =
  AUTHORED_SOURCE_ROLES;

const SDK_SPECIFIER_BY_ROLE = {
  [PLAYER_ROLE]: "@dnd/player-sdk",
  [SCENARIO_CHARACTER_ROLE]: "@dnd/scenario-character-sdk",
  [SCENARIO_SETUP_ROLE]: "@dnd/scenario-setup-sdk",
} as const satisfies Readonly<Record<AuthoredSourceRole, string>>;

const FORBIDDEN_MODULE_EDGE_KINDS = [
  "valueImport",
  "sideEffectImport",
  "exportFrom",
  "importEquals",
  "importType",
  "dynamicImport",
  "requireCall",
] as const;
type ForbiddenModuleEdgeKind = (typeof FORBIDDEN_MODULE_EDGE_KINDS)[number];
const [
  VALUE_IMPORT_EDGE,
  SIDE_EFFECT_IMPORT_EDGE,
  EXPORT_FROM_EDGE,
  IMPORT_EQUALS_EDGE,
  IMPORT_TYPE_EDGE,
  DYNAMIC_IMPORT_EDGE,
  REQUIRE_CALL_EDGE,
] = FORBIDDEN_MODULE_EDGE_KINDS;

type SourceLocation = {
  readonly line: number;
  readonly column: number;
};

export type AuthoredSourceIssue =
  | {
      readonly tag: "unreadableSource";
      readonly message: string;
    }
  | ({
      readonly tag: "malformedSource";
      readonly message: string;
    } & SourceLocation)
  | ({
      readonly tag: "tripleSlashReference";
      readonly reference: "path" | "types" | "lib";
      readonly value: string;
    } & SourceLocation)
  | {
      readonly tag: "amdDependency";
      readonly path: string;
    }
  | ({
      readonly tag: "forbiddenModuleEdge";
      readonly edge: ForbiddenModuleEdgeKind;
    } & SourceLocation)
  | ({
      readonly tag: "unavailableModuleSpecifier";
      readonly expectedSpecifier: string;
      readonly actualSpecifier: string;
    } & SourceLocation);

export type AdmittedAuthoredSource<Role extends AuthoredSourceRole> = {
  readonly tag: "admitted";
  readonly [AuthoredSourceAdmissionProof]: true;
  readonly role: Role;
  readonly sourcePath: string;
  readonly source: string;
};

export type RejectedAuthoredSource<Role extends AuthoredSourceRole> = {
  readonly tag: "rejected";
  readonly role: Role;
  readonly sourcePath: string;
  readonly issues: readonly [AuthoredSourceIssue, ...AuthoredSourceIssue[]];
};

export type AuthoredSourceAdmissionResult<Role extends AuthoredSourceRole> =
  | AdmittedAuthoredSource<Role>
  | RejectedAuthoredSource<Role>;

function sourceLocation(
  sourceFile: tsTypes.SourceFile,
  position: number,
): SourceLocation {
  const location = sourceFile.getLineAndCharacterOfPosition(position);
  return { line: location.line + 1, column: location.character + 1 };
}

function diagnosticMessage(diagnostic: tsTypes.Diagnostic): string {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
}

function unparenthesizedExpression(
  expression: tsTypes.Expression,
): tsTypes.Expression {
  return ts.isParenthesizedExpression(expression)
    ? unparenthesizedExpression(expression.expression)
    : expression;
}

function isIdentifierRequireCall(
  node: tsTypes.Node,
): node is tsTypes.CallExpression {
  if (!ts.isCallExpression(node)) return false;
  const expression = unparenthesizedExpression(node.expression);
  return ts.isIdentifier(expression) && expression.text === "require";
}

function rejected<Role extends AuthoredSourceRole>(
  role: Role,
  sourcePath: string,
  issues: readonly AuthoredSourceIssue[],
): RejectedAuthoredSource<Role> {
  const [first, ...rest] = issues;
  if (first === undefined) {
    throw new Error("Rejected authored source requires at least one issue.");
  }
  return { tag: "rejected", role, sourcePath, issues: [first, ...rest] };
}

function tripleSlashIssues(
  sourceFile: tsTypes.SourceFile,
): readonly AuthoredSourceIssue[] {
  const referenceIssues = (
    references: readonly tsTypes.FileReference[],
    reference: "path" | "types" | "lib",
  ): readonly AuthoredSourceIssue[] =>
    references.map(({ fileName, pos }) => ({
      tag: "tripleSlashReference",
      reference,
      value: fileName,
      ...sourceLocation(sourceFile, pos),
    }));
  return [
    ...referenceIssues(sourceFile.referencedFiles, "path"),
    ...referenceIssues(sourceFile.typeReferenceDirectives, "types"),
    ...referenceIssues(sourceFile.libReferenceDirectives, "lib"),
    ...sourceFile.amdDependencies.map(({ path }) => ({
      tag: "amdDependency" as const,
      path,
    })),
  ];
}

function moduleEdgeIssues(
  sourceFile: tsTypes.SourceFile,
  expectedSpecifier: string,
): readonly AuthoredSourceIssue[] {
  const issues: AuthoredSourceIssue[] = [];
  const forbiddenEdge = (
    edge: ForbiddenModuleEdgeKind,
    node: tsTypes.Node,
  ): void => {
    issues.push({
      tag: "forbiddenModuleEdge",
      edge,
      ...sourceLocation(sourceFile, node.getStart(sourceFile)),
    });
  };
  const visit = (node: tsTypes.Node): void => {
    if (ts.isImportDeclaration(node)) {
      if (node.importClause === undefined) {
        forbiddenEdge(SIDE_EFFECT_IMPORT_EDGE, node);
      } else if (!node.importClause.isTypeOnly) {
        forbiddenEdge(VALUE_IMPORT_EDGE, node);
      } else if (
        ts.isStringLiteral(node.moduleSpecifier) &&
        node.moduleSpecifier.text !== expectedSpecifier
      ) {
        issues.push({
          tag: "unavailableModuleSpecifier",
          expectedSpecifier,
          actualSpecifier: node.moduleSpecifier.text,
          ...sourceLocation(
            sourceFile,
            node.moduleSpecifier.getStart(sourceFile),
          ),
        });
      }
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier !== undefined
    ) {
      forbiddenEdge(EXPORT_FROM_EDGE, node);
    } else if (ts.isImportEqualsDeclaration(node)) {
      forbiddenEdge(IMPORT_EQUALS_EDGE, node);
    } else if (ts.isImportTypeNode(node) || ts.isJSDocImportTag(node)) {
      forbiddenEdge(IMPORT_TYPE_EDGE, node);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      forbiddenEdge(DYNAMIC_IMPORT_EDGE, node);
    } else if (
      ts.isMetaProperty(node) &&
      node.keywordToken === ts.SyntaxKind.ImportKeyword &&
      node.name.text !== "meta"
    ) {
      forbiddenEdge(DYNAMIC_IMPORT_EDGE, node);
    } else if (isIdentifierRequireCall(node)) {
      forbiddenEdge(REQUIRE_CALL_EDGE, node);
    }
    for (const child of node.getChildren(sourceFile)) visit(child);
  };
  visit(sourceFile);
  return issues;
}

function parseAuthoredSource(
  sourcePath: string,
  source: string,
): {
  readonly sourceFile: tsTypes.SourceFile;
  readonly syntaxDiagnostics: readonly tsTypes.Diagnostic[];
} {
  const compilerOptions = {
    module: ts.ModuleKind.ESNext,
    noLib: true,
    noResolve: true,
    target: ts.ScriptTarget.ESNext,
  } as const satisfies tsTypes.CompilerOptions;
  const sourceFile = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const host: tsTypes.CompilerHost = {
    fileExists: (fileName) => fileName === sourcePath,
    getCanonicalFileName: (fileName) => fileName,
    getCurrentDirectory: () => "",
    getDefaultLibFileName: () => "",
    getNewLine: () => "\n",
    getSourceFile: (fileName) =>
      fileName === sourcePath ? sourceFile : undefined,
    readFile: (fileName) => (fileName === sourcePath ? source : undefined),
    useCaseSensitiveFileNames: () => true,
    writeFile: () => undefined,
  };
  const program = ts.createProgram([sourcePath], compilerOptions, host);
  return {
    sourceFile,
    syntaxDiagnostics: program.getSyntacticDiagnostics(sourceFile),
  };
}

export function admitAuthoredSource<Role extends AuthoredSourceRole>(input: {
  readonly role: Role;
  readonly source: string;
  readonly sourcePath: string;
}): AuthoredSourceAdmissionResult<Role> {
  const sourcePath = input.sourcePath;
  const { sourceFile, syntaxDiagnostics } = parseAuthoredSource(
    sourcePath,
    input.source,
  );
  if (syntaxDiagnostics.length > 0) {
    return rejected(
      input.role,
      sourcePath,
      syntaxDiagnostics.map((diagnostic) => ({
        tag: "malformedSource",
        message: diagnosticMessage(diagnostic),
        ...sourceLocation(sourceFile, diagnostic.start ?? 0),
      })),
    );
  }
  const issues = [
    ...tripleSlashIssues(sourceFile),
    ...moduleEdgeIssues(sourceFile, SDK_SPECIFIER_BY_ROLE[input.role]),
  ];
  if (issues.length > 0) return rejected(input.role, sourcePath, issues);
  return {
    tag: "admitted",
    [AuthoredSourceAdmissionProof]: true,
    role: input.role,
    sourcePath,
    source: input.source,
  };
}

export function readAuthoredSource<Role extends AuthoredSourceRole>(input: {
  readonly role: Role;
  readonly sourcePath: string;
}): AuthoredSourceAdmissionResult<Role> {
  const read = (():
    | { readonly tag: "read"; readonly source: string }
    | {
        readonly tag: "unreadable";
        readonly issue: Extract<
          AuthoredSourceIssue,
          { readonly tag: "unreadableSource" }
        >;
      } => {
    try {
      return { tag: "read", source: readFileSync(input.sourcePath, "utf8") };
    } catch (error) {
      return {
        tag: "unreadable",
        issue: {
          tag: "unreadableSource",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  })();
  if (read.tag === "unreadable") {
    return rejected(input.role, input.sourcePath, [read.issue]);
  }
  return admitAuthoredSource({
    role: input.role,
    sourcePath: input.sourcePath,
    source: read.source,
  });
}

export function authoredSourceIssuesMessage(
  rejection: Pick<
    RejectedAuthoredSource<AuthoredSourceRole>,
    "role" | "sourcePath" | "issues"
  >,
): string {
  const roleLabel = {
    player: "Player",
    scenarioCharacter: "Scenario character",
    scenarioSetup: "Scenario setup",
  }[rejection.role];
  const details = rejection.issues
    .map((issue) =>
      Match.value(issue).pipe(
        Match.when(
          { tag: "unreadableSource" },
          (narrowed) => `is unreadable: ${narrowed.message}`,
        ),
        Match.when(
          { tag: "malformedSource" },
          (narrowed) =>
            `is malformed at ${String(narrowed.line)}:${String(narrowed.column)}: ${narrowed.message}`,
        ),
        Match.when(
          { tag: "tripleSlashReference" },
          (narrowed) =>
            `uses a forbidden triple-slash ${narrowed.reference} reference at ${String(narrowed.line)}:${String(narrowed.column)}: ${narrowed.value}`,
        ),
        Match.when(
          { tag: "amdDependency" },
          (narrowed) => `uses a forbidden AMD dependency: ${narrowed.path}`,
        ),
        Match.when(
          { tag: "unavailableModuleSpecifier" },
          (narrowed) =>
            `imports ${narrowed.actualSpecifier} at ${String(narrowed.line)}:${String(narrowed.column)}; this role admits only ${narrowed.expectedSpecifier}.`,
        ),
        Match.when(
          { tag: "forbiddenModuleEdge" },
          (narrowed) =>
            `uses forbidden ${narrowed.edge} syntax at ${String(narrowed.line)}:${String(narrowed.column)}.`,
        ),
        Match.exhaustive,
      ),
    )
    .join(" ");
  return `${roleLabel} source ${rejection.sourcePath} ${details}`;
}

export function withAuthoredSourceSnapshot<Role extends AuthoredSourceRole>(
  authoredSource: AdmittedAuthoredSource<Role>,
  use: (snapshot: AdmittedAuthoredSource<Role>) => void,
): void {
  const snapshotPath = resolve(
    dirname(authoredSource.sourcePath),
    `.authored-source-${randomUUID()}.ts`,
  );
  writeFileSync(snapshotPath, authoredSource.source, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o400,
  });
  try {
    use({ ...authoredSource, sourcePath: snapshotPath });
  } finally {
    rmSync(snapshotPath, { force: true });
  }
}

export function authoredSourceModuleUrl(
  authoredSource: AdmittedAuthoredSource<AuthoredSourceRole>,
): string {
  const javascript = ts.transpileModule(authoredSource.source, {
    fileName: authoredSource.sourcePath,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      verbatimModuleSyntax: true,
    },
  }).outputText;
  return `data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}#${randomUUID()}`;
}
