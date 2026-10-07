import {
  subjectCarriers,
  constructionKinds,
} from "./execution-type-projection.ts";
import { resolve } from "node:path";
import ts from "typescript";
import {
  executionSourceLocation,
  reflectionProjectionOperations,
  nativeObjectHoleKinds,
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
  type Binding =
    | { readonly kind: "expression"; readonly expression: ts.Expression }
    | { readonly kind: "symbol"; readonly symbol: ts.Symbol }
    | { readonly kind: "absent" }
    | { readonly kind: "unresolved" };
  const seen = new Set<ts.Symbol>();
  const unresolved: Binding = { kind: "unresolved" };
  const absent: Binding = { kind: "absent" };
  function unwrap(expression: ts.Expression): ts.Expression {
    while (
      ts.isParenthesizedExpression(expression) ||
      ts.isAsExpression(expression) ||
      ts.isSatisfiesExpression(expression) ||
      ts.isNonNullExpression(expression) ||
      ts.isTypeAssertionExpression(expression)
    )
      expression = expression.expression;
    return expression;
  }
  function nameOf(name: ts.PropertyName): string | undefined {
    if (
      ts.isIdentifier(name) ||
      ts.isStringLiteral(name) ||
      ts.isNumericLiteral(name)
    )
      return name.text;
    if (ts.isComputedPropertyName(name) && ts.isStringLiteral(name.expression))
      return name.expression.text;
    return undefined;
  }
  function symbolBinding(symbol: ts.Symbol | undefined): Binding {
    return symbol ? { kind: "symbol", symbol } : unresolved;
  }
  function expressionBinding(expression: ts.Expression): Binding {
    expression = unwrap(expression);
    if (ts.isIdentifier(expression))
      return symbolBinding(checker.getSymbolAtLocation(expression));
    if (ts.isPropertyAccessExpression(expression))
      return propertyBinding(
        expressionBinding(expression.expression),
        expression.name.text,
      );
    if (
      ts.isElementAccessExpression(expression) &&
      ts.isStringLiteral(expression.argumentExpression)
    )
      return propertyBinding(
        expressionBinding(expression.expression),
        expression.argumentExpression.text,
      );
    return { kind: "expression", expression };
  }
  function withSymbol<T>(
    symbol: ts.Symbol,
    fallback: T,
    resolve: (symbol: ts.Symbol) => T,
  ): T {
    if (seen.has(symbol)) return fallback;
    seen.add(symbol);
    try {
      return symbol.flags & ts.SymbolFlags.Alias
        ? withSymbol(checker.getAliasedSymbol(symbol), fallback, resolve)
        : resolve(symbol);
    } finally {
      seen.delete(symbol);
    }
  }
  function initializerBinding(declaration: ts.Declaration): Binding {
    if (
      ts.isVariableDeclaration(declaration) &&
      declaration.initializer &&
      ts.isVariableDeclarationList(declaration.parent) &&
      declaration.parent.flags & ts.NodeFlags.Const
    )
      return expressionBinding(declaration.initializer);
    if (
      ts.isBindingElement(declaration) &&
      !declaration.dotDotDotToken &&
      ts.isObjectBindingPattern(declaration.parent) &&
      ts.isVariableDeclaration(declaration.parent.parent)
    ) {
      const variable = declaration.parent.parent;
      const name = declaration.propertyName ?? declaration.name;
      const key =
        ts.isIdentifier(name) || ts.isStringLiteral(name)
          ? name.text
          : undefined;
      if (
        key !== undefined &&
        variable.initializer &&
        ts.isVariableDeclarationList(variable.parent) &&
        variable.parent.flags & ts.NodeFlags.Const
      )
        return propertyBinding(expressionBinding(variable.initializer), key);
    }
    return unresolved;
  }
  function propertyBinding(binding: Binding, name: string): Binding {
    if (binding.kind === "absent" || binding.kind === "unresolved")
      return binding;
    if (binding.kind === "symbol")
      return withSymbol(binding.symbol, unresolved, (symbol) => {
        if (
          symbol.flags &
          (ts.SymbolFlags.ValueModule | ts.SymbolFlags.NamespaceModule)
        ) {
          const member = checker
            .getExportsOfModule(symbol)
            .find((member) => member.name === name);
          return member ? symbolBinding(member) : absent;
        }
        const declaration =
          symbol.declarations?.length === 1
            ? symbol.declarations[0]
            : undefined;
        return declaration
          ? propertyBinding(initializerBinding(declaration), name)
          : unresolved;
      });
    const base = unwrap(binding.expression);
    if (!ts.isObjectLiteralExpression(base)) return unresolved;
    for (const property of [...base.properties].reverse()) {
      if (ts.isSpreadAssignment(property)) {
        const spread = propertyBinding(
          expressionBinding(property.expression),
          name,
        );
        if (spread.kind !== "absent") return spread;
        continue;
      }
      const key = nameOf(property.name);
      if (key === undefined) return unresolved;
      if (key !== name) continue;
      if (ts.isPropertyAssignment(property))
        return expressionBinding(property.initializer);
      if (ts.isShorthandPropertyAssignment(property))
        return symbolBinding(
          checker.getShorthandAssignmentValueSymbol(property),
        );
      return unresolved;
    }
    return absent;
  }
  function implementation(
    binding: Binding,
  ): ts.FunctionDeclaration | undefined {
    if (binding.kind !== "symbol") return undefined;
    return withSymbol(binding.symbol, undefined, (symbol) => {
      const bodies = symbol.declarations?.filter(
        (declaration): declaration is ts.FunctionDeclaration =>
          ts.isFunctionDeclaration(declaration) &&
          declaration.name !== undefined &&
          declaration.body !== undefined,
      );
      if (bodies?.length === 1) return bodies[0];
      const declaration =
        symbol.declarations?.length === 1 ? symbol.declarations[0] : undefined;
      return declaration
        ? implementation(initializerBinding(declaration))
        : undefined;
    });
  }
  // Named syntax bindings are evidence; opaque callbacks remain unanalyzed.
  return implementation(expressionBinding(call.expression));
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

function mayConstructExecutionHole(node: ts.ObjectLiteralExpression): boolean {
  // Spreads and computed names can introduce any required field. Keep them for
  // semantic classification; only plain, provably incomplete literals skip it.
  if (
    node.properties.some(
      (property) =>
        ts.isSpreadAssignment(property) ||
        (property.name !== undefined &&
          ts.isComputedPropertyName(property.name)),
    )
  )
    return true;
  const names = new Set(
    node.properties.flatMap((property) => {
      const name = property.name;
      return name &&
        (ts.isIdentifier(name) ||
          ts.isStringLiteral(name) ||
          ts.isNumericLiteral(name))
        ? [name.text]
        : [];
    }),
  );
  return ["kind", "holeId", "holeInstanceKey"].every((field) =>
    names.has(field),
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
      if (
        ts.isObjectLiteralExpression(node) &&
        mayConstructExecutionHole(node)
      ) {
        const native = nativeObjectHoleKinds(program, node);
        const classification =
          native.kind === "classified"
            ? native.classification
            : constructionKinds(
                reflectionProjectionOperations(checker, node),
                checker.getTypeAtLocation(node),
              );
        if (classification.kind === "hole")
          constructions.push({
            node,
            construction: {
              source: executionSourceLocation(node, ownerName(node)),
              kinds: classification.kinds,
            },
          });
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

export function executionSubjectCarriers(
  type: ts.Type,
  node: ts.Node,
  checker: ts.TypeChecker,
): HoleConstruction["kinds"] {
  return subjectCarriers(reflectionProjectionOperations(checker, node), type);
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
