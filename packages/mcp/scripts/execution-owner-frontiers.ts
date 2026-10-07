import { ordinaryFrontiersForResult } from "./execution-type-projection.ts";
import { resolve } from "node:path";
import ts from "typescript";
import {
  namedCallImplementation,
  runtimeSources,
  ownerName,
} from "./execution-hole-constructions.ts";
import type { ExecutionEvidence } from "./operation-accounting-contract.ts";
import {
  implementedFunctions,
  nativeCallGenericFrontierResults,
  genericFrontierResults,
  reflectionProjectionOperations,
  repositoryRoot,
  executionSourceLocation,
} from "./operation-accounting-compiler.ts";

/** Declared ordinary frontier kinds; callers, interrupts and replay need separate coverage. */
export function executionOwnerOrdinaryFrontiers(
  program: ts.Program,
  evidence: ExecutionEvidence,
):
  | {
      readonly kind: "finite";
      readonly frontiers: readonly {
        readonly subjects: readonly string[];
        readonly holeKinds: readonly string[];
      }[];
    }
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
  return ordinaryFrontiersForResult(
    reflectionProjectionOperations(checker, owner),
    result,
  );
}

/** Ordinary branches of instantiated generic producers; not a reachability proof. */
export function executionGenericOrdinaryFrontierCalls(program: ts.Program) {
  const checker = program.getTypeChecker();
  const calls: {
    readonly source: ReturnType<typeof executionSourceLocation>;
    readonly producer: ReturnType<typeof executionSourceLocation>;
    readonly resultPath: readonly string[];
    readonly result: ReturnType<typeof executionOwnerOrdinaryFrontiers>;
  }[] = [];
  for (const source of runtimeSources(program)) {
    function visit(node: ts.Node): void {
      if (ts.isCallExpression(node)) {
        const implementation = namedCallImplementation(node, checker);
        // Guards and explicitly primitive results cannot contain a frontier.
        // Skip their argument instantiation, retaining every structural result.
        const returnType = implementation?.type;
        const primitiveResult =
          returnType &&
          (ts.isTypePredicateNode(returnType) ||
            returnType.kind === ts.SyntaxKind.BooleanKeyword ||
            returnType.kind === ts.SyntaxKind.StringKeyword ||
            returnType.kind === ts.SyntaxKind.NumberKeyword ||
            returnType.kind === ts.SyntaxKind.BigIntKeyword ||
            returnType.kind === ts.SyntaxKind.SymbolKeyword ||
            returnType.kind === ts.SyntaxKind.VoidKeyword ||
            returnType.kind === ts.SyntaxKind.NeverKeyword ||
            returnType.kind === ts.SyntaxKind.UndefinedKeyword);
        if (implementation?.typeParameters?.length && !primitiveResult) {
          const results =
            nativeCallGenericFrontierResults(program, node) ??
            genericFrontierResults(
              reflectionProjectionOperations(checker, node),
              checker.getTypeAtLocation(node),
            );
          for (const result of results)
            calls.push({
              source: executionSourceLocation(node, ownerName(node)),
              producer: executionSourceLocation(
                implementation,
                implementation.name?.text ?? "anonymous producer",
              ),
              ...result,
            });
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return calls.sort(
    (left, right) =>
      left.source.file.localeCompare(right.source.file) ||
      left.source.line - right.source.line,
  );
}

export function executionOwnerOrdinaryHoleKinds(
  program: ts.Program,
  evidence: ExecutionEvidence,
):
  | { readonly kind: "finite"; readonly values: readonly string[] }
  | { readonly kind: "unclassified"; readonly reason: string } {
  const result = executionOwnerOrdinaryFrontiers(program, evidence);
  return result.kind === "unclassified"
    ? result
    : {
        kind: "finite",
        values: [
          ...new Set(
            result.frontiers.flatMap((frontier) => frontier.holeKinds),
          ),
        ].sort(),
      };
}
