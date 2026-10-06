import { resolve } from "node:path";
import ts from "typescript";
import {
  executionSubjectCarriers,
  namedCallImplementation,
  runtimeSources,
  ownerName,
} from "./execution-hole-constructions.ts";
import type { ExecutionEvidence } from "./operation-accounting-contract.ts";
import {
  implementedFunctions,
  repositoryRoot,
  executionSourceLocation,
} from "./operation-accounting-compiler.ts";

function literalProperty(
  checker: ts.TypeChecker,
  owner: ts.Node,
  type: ts.Type,
  field: string,
): readonly string[] | undefined {
  const property = checker.getPropertyOfType(type, field);
  if (!property) return undefined;
  const value = checker.getTypeOfSymbolAtLocation(property, owner);
  const branches = value.isUnion() ? value.types : [value];
  return branches.every((branch): branch is ts.StringLiteralType =>
    branch.isStringLiteral(),
  )
    ? branches.map((branch) => branch.value)
    : undefined;
}

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
  return ordinaryFrontiersForResult(checker, result, owner);
}

function ordinaryFrontiersForResult(
  checker: ts.TypeChecker,
  result: ts.Type,
  owner: ts.Node,
): ReturnType<typeof executionOwnerOrdinaryFrontiers> {
  const results = result.isUnion() ? result.types : [result];
  const frontiers: {
    subjects: readonly string[];
    holeKinds: readonly string[];
  }[] = [];
  for (const branch of results) {
    const tags = literalProperty(checker, owner, branch, "tag");
    if (!tags || tags.length !== 1)
      return {
        kind: "unclassified",
        reason: "Return branch has no single finite tag.",
      };
    if (tags[0] === "invalid" || tags[0] === "resolved") continue;
    if (tags[0] !== "needsHoles")
      return {
        kind: "unclassified",
        reason: "Owner does not return a Battle resolution result.",
      };
    const frontier = checker.getPropertyOfType(branch, "frontier");
    if (!frontier)
      return {
        kind: "unclassified",
        reason: "Needs-holes branch has no frontier.",
      };
    const type = checker.getTypeOfSymbolAtLocation(frontier, owner);
    for (const frontierType of type.isUnion() ? type.types : [type]) {
      const kinds = literalProperty(checker, owner, frontierType, "kind");
      if (!kinds || kinds.length !== 1)
        return {
          kind: "unclassified",
          reason: "Frontier has no single finite kind.",
        };
      if (kinds[0] === "interruptDecision") continue;
      if (kinds[0] !== "holes")
        return {
          kind: "unclassified",
          reason: "Unaccounted needs-holes frontier kind.",
        };
      const holes = checker.getPropertyOfType(frontierType, "holes");
      const element =
        holes &&
        checker.getIndexTypeOfType(
          checker.getTypeOfSymbolAtLocation(holes, owner),
          ts.IndexKind.Number,
        );
      if (!element)
        return {
          kind: "unclassified",
          reason: "Ordinary frontier has no hole element type.",
        };
      const holeKinds = literalProperty(checker, owner, element, "kind");
      if (!holeKinds)
        return {
          kind: "unclassified",
          reason: "Hole element kind is not finite.",
        };
      const replaySubject = checker.getPropertyOfType(
        frontierType,
        "replaySubject",
      );
      const subjects =
        replaySubject &&
        executionSubjectCarriers(
          checker.getTypeOfSymbolAtLocation(replaySubject, owner),
          owner,
          checker,
        );
      if (!subjects || subjects.kind !== "finite")
        return {
          kind: "unclassified",
          reason: "Ordinary frontier replay subject is not finite.",
        };
      frontiers.push({
        subjects: subjects.values,
        holeKinds: [...new Set(holeKinds)].sort(),
      });
    }
  }
  return { kind: "finite", frontiers };
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
        if (implementation?.typeParameters?.length) {
          const result = checker.getTypeAtLocation(node);
          for (const branch of result.isUnion() ? result.types : [result]) {
            const tags = literalProperty(checker, node, branch, "tag");
            let projected: ts.Type | undefined;
            let resultPath: readonly string[] = [];
            if (tags?.length === 1 && tags[0] === "needsHoles")
              projected = branch;
            if (tags?.length === 1 && tags[0] === "resolution") {
              const property = checker.getPropertyOfType(branch, "result");
              const nested =
                property && checker.getTypeOfSymbolAtLocation(property, node);
              if (
                nested &&
                (nested.isUnion() ? nested.types : [nested]).some((member) =>
                  literalProperty(checker, node, member, "tag")?.includes(
                    "needsHoles",
                  ),
                )
              ) {
                projected = nested;
                resultPath = ["result"];
              }
            }
            if (!projected) continue;
            calls.push({
              source: executionSourceLocation(node, ownerName(node)),
              producer: executionSourceLocation(
                implementation,
                implementation.name?.text ?? "anonymous producer",
              ),
              resultPath,
              result: ordinaryFrontiersForResult(checker, projected, node),
            });
          }
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
