import { resolve } from "node:path";
import ts from "typescript";
import {
  executionSourceLocation,
  repositoryRoot,
  type SourceLocation,
} from "./operation-accounting-compiler.ts";

type HoleConstruction = {
  readonly source: SourceLocation;
  readonly directNamedOwnerCalls: readonly SourceLocation[];
  readonly kinds:
    | { readonly kind: "finite"; readonly values: readonly string[] }
    | { readonly kind: "unclassified" };
};

function enclosingOwner(node: ts.Node): ts.FunctionDeclaration | undefined {
  for (let owner = node.parent; owner; owner = owner.parent)
    if (ts.isFunctionDeclaration(owner) && owner.name) return owner;
  return undefined;
}

export function ownerName(node: ts.Node): string {
  return enclosingOwner(node)?.name?.text ?? "no enclosing named declaration";
}

function compareLocations(left: SourceLocation, right: SourceLocation): number {
  return left.file.localeCompare(right.file) || left.line - right.line;
}

export function namedCallImplementation(
  call: ts.CallExpression,
  checker: ts.TypeChecker,
): ts.FunctionDeclaration | undefined {
  const declaration = checker.getResolvedSignature(call)?.declaration;
  if (
    !declaration ||
    !ts.isFunctionDeclaration(declaration) ||
    !declaration.name
  )
    return undefined;
  const symbol = checker.getSymbolAtLocation(declaration.name);
  const implementations = symbol?.declarations?.filter(
    (candidate): candidate is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(candidate) && candidate.body !== undefined,
  );
  return implementations?.length === 1 ? implementations[0] : undefined;
}

type NamedCallSite = {
  readonly source: SourceLocation;
  readonly owner: ts.FunctionDeclaration | undefined;
};
type NamedCalls = ReadonlyMap<ts.FunctionDeclaration, readonly NamedCallSite[]>;

export function runtimeSources(program: ts.Program): readonly ts.SourceFile[] {
  const root = resolve(repositoryRoot, "packages/battle-runtime/src") + "/";
  return program
    .getSourceFiles()
    .filter(
      (source) =>
        source.fileName.startsWith(root) &&
        !/\.(?:test|node-test)\.ts$/.test(source.fileName),
    );
}

function namedCalls(program: ts.Program): NamedCalls {
  const checker = program.getTypeChecker();
  const calls = new Map<ts.FunctionDeclaration, NamedCallSite[]>();
  for (const source of runtimeSources(program)) {
    function visit(node: ts.Node): void {
      if (ts.isCallExpression(node)) {
        const implementation = namedCallImplementation(node, checker);
        if (implementation) {
          const sites = calls.get(implementation) ?? [];
          sites.push({
            source: executionSourceLocation(node, ownerName(node)),
            owner: enclosingOwner(node),
          });
          calls.set(implementation, sites);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  for (const sites of calls.values())
    sites.sort((left, right) => compareLocations(left.source, right.source));
  return calls;
}

function namedCallerAncestors(
  owner: ts.FunctionDeclaration | undefined,
  calls: NamedCalls,
): readonly {
  readonly source: SourceLocation;
  readonly distance: number;
}[] {
  if (!owner) return [];
  const seen = new Set([owner]);
  const pending = [{ owner, distance: 0 }];
  const ancestors: { source: SourceLocation; distance: number }[] = [];
  for (const entry of pending) {
    for (const site of calls.get(entry.owner) ?? []) {
      if (!site.owner || seen.has(site.owner)) continue;
      seen.add(site.owner);
      const distance = entry.distance + 1;
      ancestors.push({
        source: executionSourceLocation(
          site.owner,
          site.owner.name?.text ?? "unnamed function",
        ),
        distance,
      });
      pending.push({ owner: site.owner, distance });
    }
  }
  return ancestors.sort(
    (left, right) =>
      left.distance - right.distance ||
      compareLocations(left.source, right.source),
  );
}

/** Construction and direct named-call evidence; indirect and transitive calls remain unanalyzed. */
export function executionHoleConstructions(
  program: ts.Program,
): readonly HoleConstruction[] {
  const checker = program.getTypeChecker();
  const constructions: {
    readonly node: ts.ObjectLiteralExpression;
    readonly construction: Omit<HoleConstruction, "directNamedOwnerCalls">;
  }[] = [];
  const sources = runtimeSources(program);
  for (const source of sources) {
    function visit(node: ts.Node): void {
      if (ts.isObjectLiteralExpression(node)) {
        const type = checker.getTypeAtLocation(node);
        const kind = checker.getPropertyOfType(type, "kind");
        if (
          kind &&
          checker.getPropertyOfType(type, "holeId") &&
          checker.getPropertyOfType(type, "holeInstanceKey")
        ) {
          const discriminator = checker.getTypeOfSymbolAtLocation(kind, node);
          const branches = discriminator.isUnion()
            ? discriminator.types
            : [discriminator];
          constructions.push({
            node,
            construction: {
              source: executionSourceLocation(node, ownerName(node)),
              kinds: branches.every((branch) => branch.isStringLiteral())
                ? {
                    kind: "finite",
                    values: [
                      ...new Set(branches.map((branch) => branch.value)),
                    ].sort(),
                  }
                : { kind: "unclassified" },
            },
          });
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  const directCalls = namedCalls(program);
  return constructions
    .map(({ node, construction }) => {
      const owner = enclosingOwner(node);
      return {
        ...construction,
        directNamedOwnerCalls: owner
          ? (directCalls.get(owner) ?? []).map((site) => site.source)
          : [],
      };
    })
    .sort((left, right) => compareLocations(left.source, right.source));
}

function literalStrings(type: ts.Type): readonly string[] | undefined {
  // Intersections can leave impossible discriminator branches with type never.
  const branches = (type.isUnion() ? type.types : [type]).filter(
    (branch) => (branch.flags & ts.TypeFlags.Never) === 0,
  );
  return branches.every((branch) => branch.isStringLiteral())
    ? branches.map((branch) => branch.value)
    : undefined;
}

/** Independent structural projection, checked against the canonical key type by accounting. */
export function executionSubjectCarriers(
  type: ts.Type,
  node: ts.Node,
  checker: ts.TypeChecker,
): HoleConstruction["kinds"] {
  const values: string[] = [];
  const subjectType = checker.getBaseConstraintOfType(type) ?? type;
  for (const member of subjectType.isUnion()
    ? subjectType.types
    : [subjectType]) {
    // A narrowed intersection can reduce to never without carrying the Never flag.
    if (checker.isTypeAssignableTo(member, checker.getNeverType())) continue;
    const propertyType = (field: string) => {
      const property = member.getProperty(field);
      return property && checker.getTypeOfSymbolAtLocation(property, node);
    };
    const tagType = propertyType("tag");
    const tags = tagType && literalStrings(tagType);
    if (!tags) return { kind: "unclassified" };
    const discriminator = ["command", "action", "option"].find((field) =>
      member.getProperty(field),
    );
    const operationType = discriminator && propertyType(discriminator);
    const operations = discriminator
      ? operationType && literalStrings(operationType)
      : [""];
    if (!operations) return { kind: "unclassified" };
    const modeType = propertyType("mode");
    const modes: string[] = [];
    if (modeType) {
      for (const mode of modeType.isUnion() ? modeType.types : [modeType]) {
        const direct = literalStrings(mode);
        const tag = mode.getProperty("tag");
        const tagged =
          tag && literalStrings(checker.getTypeOfSymbolAtLocation(tag, node));
        const selected = direct ?? tagged;
        if (!selected) return { kind: "unclassified" };
        modes.push(...selected);
      }
    } else modes.push("");
    for (const tag of tags)
      for (const operation of operations)
        for (const mode of modes)
          values.push(
            [tag, operation, mode].filter((part) => part !== "").join("."),
          );
  }
  return { kind: "finite", values: [...new Set(values)].sort() };
}

export function canonicalSubjectCarriers(
  program: ts.Program,
): HoleConstruction["kinds"] {
  const source = program.getSourceFile(
    resolve(
      repositoryRoot,
      "packages/battle-runtime/src/battle-reducer/needs-holes-result.ts",
    ),
  );
  const helper = source?.statements.find(
    (statement): statement is ts.FunctionDeclaration =>
      ts.isFunctionDeclaration(statement) &&
      statement.name?.text === "needsHolesResult",
  );
  const subject = helper?.parameters[1];
  if (!subject)
    throw new Error(
      "Canonical ordinary-hole helper must declare its subject parameter.",
    );
  const checker = program.getTypeChecker();
  return executionSubjectCarriers(
    checker.getTypeAtLocation(subject),
    subject,
    checker,
  );
}

/** Requests at the canonical result boundary; this does not prove transitive reachability. */
export function executionHoleRequests(program: ts.Program): readonly {
  readonly source: SourceLocation;
  readonly kinds: HoleConstruction["kinds"];
  readonly subjects: HoleConstruction["kinds"];
  readonly namedCallerAncestors: ReturnType<typeof namedCallerAncestors>;
}[] {
  const checker = program.getTypeChecker();
  const helperPath = resolve(
    repositoryRoot,
    "packages/battle-runtime/src/battle-reducer/needs-holes-result.ts",
  );
  const calls = namedCalls(program);
  const requests: {
    readonly source: SourceLocation;
    readonly kinds: HoleConstruction["kinds"];
    readonly subjects: HoleConstruction["kinds"];
    readonly namedCallerAncestors: ReturnType<typeof namedCallerAncestors>;
  }[] = [];
  for (const source of runtimeSources(program)) {
    function visit(node: ts.Node): void {
      if (ts.isCallExpression(node)) {
        const implementation = namedCallImplementation(node, checker);
        if (
          implementation?.getSourceFile().fileName === helperPath &&
          (implementation.name?.text === "needsHolesResult" ||
            implementation.name?.text === "needsHolesResultWithProcedure")
        ) {
          const result = checker.getTypeAtLocation(node);
          const frontierProperty = result.getProperty("frontier");
          const frontier =
            frontierProperty &&
            checker.getTypeOfSymbolAtLocation(frontierProperty, node);
          const holesProperty = frontier?.getProperty("holes");
          const holes =
            holesProperty &&
            checker.getTypeOfSymbolAtLocation(holesProperty, node);
          const hole =
            holes && checker.getIndexTypeOfType(holes, ts.IndexKind.Number);
          const kindProperty = hole?.getProperty("kind");
          const kind =
            kindProperty &&
            checker.getTypeOfSymbolAtLocation(kindProperty, node);
          const branches = kind?.isUnion() ? kind.types : kind ? [kind] : [];
          const subject = node.arguments[1];
          requests.push({
            subjects: subject
              ? executionSubjectCarriers(
                  checker.getTypeAtLocation(subject),
                  subject,
                  checker,
                )
              : { kind: "unclassified" },
            source: executionSourceLocation(node, ownerName(node)),
            namedCallerAncestors: namedCallerAncestors(
              enclosingOwner(node),
              calls,
            ),
            kinds:
              branches.length > 0 &&
              branches.every((branch) => branch.isStringLiteral())
                ? {
                    kind: "finite",
                    values: [
                      ...new Set(branches.map((branch) => branch.value)),
                    ].sort(),
                  }
                : { kind: "unclassified" },
          });
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  return requests.sort((left, right) =>
    compareLocations(left.source, right.source),
  );
}
