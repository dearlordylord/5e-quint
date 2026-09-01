import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import type * as tsTypes from "typescript";

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

export const AUTHORED_SOURCE_ROLES = [
  "player",
  "scenarioCharacter",
  "scenarioSetup",
] as const;
export type AuthoredSourceRole = (typeof AUTHORED_SOURCE_ROLES)[number];

const SDK_SPECIFIER_BY_ROLE = {
  player: "@dnd/player-sdk",
  scenarioCharacter: "@dnd/scenario-character-sdk",
  scenarioSetup: "@dnd/scenario-setup-sdk",
} as const satisfies Readonly<Record<AuthoredSourceRole, string>>;

export const FORBIDDEN_MODULE_EDGE_KINDS = [
  "valueImport",
  "sideEffectImport",
  "exportFrom",
  "importEquals",
  "importType",
  "dynamicImport",
  "requireCall",
] as const;
export type ForbiddenModuleEdgeKind =
  (typeof FORBIDDEN_MODULE_EDGE_KINDS)[number];

type SourceLocation = {
  readonly line: number;
  readonly column: number;
};

export type AuthoredSourceIssue =
  | {
      readonly tag: "unreadableSource";
      readonly sourcePath: string;
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

export type AuthoredSourceAdmissionResult<Role extends AuthoredSourceRole> =
  | AdmittedAuthoredSource<Role>
  | {
      readonly tag: "rejected";
      readonly issues: readonly [AuthoredSourceIssue, ...AuthoredSourceIssue[]];
    };

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

function rejected(
  issues: readonly AuthoredSourceIssue[],
): Extract<
  AuthoredSourceAdmissionResult<AuthoredSourceRole>,
  { tag: "rejected" }
> {
  const [first, ...rest] = issues;
  if (first === undefined) {
    throw new Error("Rejected authored source requires at least one issue.");
  }
  return { tag: "rejected", issues: [first, ...rest] };
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
        forbiddenEdge("sideEffectImport", node);
      } else if (!node.importClause.isTypeOnly) {
        forbiddenEdge("valueImport", node);
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
      forbiddenEdge("exportFrom", node);
    } else if (ts.isImportEqualsDeclaration(node)) {
      forbiddenEdge("importEquals", node);
    } else if (ts.isImportTypeNode(node) || ts.isJSDocImportTag(node)) {
      forbiddenEdge("importType", node);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword
    ) {
      forbiddenEdge("dynamicImport", node);
    } else if (isIdentifierRequireCall(node)) {
      forbiddenEdge("requireCall", node);
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
  if (issues.length > 0) return rejected(issues);
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
          sourcePath: input.sourcePath,
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  })();
  if (read.tag === "unreadable") {
    return { tag: "rejected", issues: [read.issue] };
  }
  return admitAuthoredSource({
    role: input.role,
    sourcePath: input.sourcePath,
    source: read.source,
  });
}

export function authoredSourceIssuesMessage(
  issues: readonly [AuthoredSourceIssue, ...AuthoredSourceIssue[]],
): string {
  return issues
    .map((issue) => {
      if (issue.tag === "unreadableSource") {
        return `Authored source is unreadable: ${issue.message}`;
      }
      if (issue.tag === "malformedSource") {
        return `Authored source is malformed at ${String(issue.line)}:${String(issue.column)}: ${issue.message}`;
      }
      if (issue.tag === "tripleSlashReference") {
        return `Authored source uses a forbidden triple-slash ${issue.reference} reference at ${String(issue.line)}:${String(issue.column)}: ${issue.value}`;
      }
      if (issue.tag === "unavailableModuleSpecifier") {
        return `Authored source imports ${issue.actualSpecifier} at ${String(issue.line)}:${String(issue.column)}; this role admits only ${issue.expectedSpecifier}.`;
      }
      return `Authored source uses forbidden ${issue.edge} syntax at ${String(issue.line)}:${String(issue.column)}.`;
    })
    .join(" ");
}
