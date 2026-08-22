import ts from "typescript";

function isScenarioTestCall(node: ts.CallExpression): boolean {
  return (
    ts.isIdentifier(node.expression) &&
    (node.expression.text === "test" || node.expression.text === "it")
  );
}

type SuiteExecution = "active" | "skipped";

function staticBoolean(node: ts.Expression | undefined): boolean | undefined {
  if (node === undefined) return undefined;
  if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
  return undefined;
}

function suiteExecution(node: ts.CallExpression): SuiteExecution | undefined {
  const modifierCall = ts.isCallExpression(node.expression)
    ? node.expression
    : node;
  const modifier = modifierCall.expression;
  if (
    !ts.isPropertyAccessExpression(modifier) ||
    !ts.isIdentifier(modifier.expression) ||
    (modifier.expression.text !== "describe" &&
      modifier.expression.text !== "suite")
  ) {
    return undefined;
  }
  if (modifier.name.text === "skip") return "skipped";
  if (modifier.name.text === "skipIf") {
    const condition = staticBoolean(modifierCall.arguments[0]);
    return condition === undefined
      ? "skipped"
      : condition
        ? "skipped"
        : "active";
  }
  if (modifier.name.text === "runIf") {
    const condition = staticBoolean(modifierCall.arguments[0]);
    return condition === undefined
      ? "skipped"
      : condition
        ? "active"
        : "skipped";
  }
  return undefined;
}

export function sourceDefinesVitestScenario(
  source: string,
  scenarioId: string,
): boolean {
  const sourceFile = ts.createSourceFile(
    "scenario.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  let found = false;
  const visit = (node: ts.Node, skippedSuiteAncestor: boolean): void => {
    if (found) return;
    if (ts.isCallExpression(node)) {
      const execution = suiteExecution(node);
      if (execution !== undefined) {
        const skipped = skippedSuiteAncestor || execution === "skipped";
        ts.forEachChild(node, (child) => visit(child, skipped));
        return;
      }
    }
    if (
      ts.isCallExpression(node) &&
      isScenarioTestCall(node) &&
      node.arguments.length > 0
    ) {
      const [title] = node.arguments;
      if (
        (ts.isStringLiteral(title) ||
          ts.isNoSubstitutionTemplateLiteral(title)) &&
        title.text === scenarioId
      ) {
        if (!skippedSuiteAncestor) found = true;
        return;
      }
    }
    ts.forEachChild(node, (child) => visit(child, skippedSuiteAncestor));
  };
  visit(sourceFile, false);
  return found;
}
