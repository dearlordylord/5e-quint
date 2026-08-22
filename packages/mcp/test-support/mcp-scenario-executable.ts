import ts from "typescript";

function isScenarioTestCall(node: ts.CallExpression): boolean {
  return (
    ts.isIdentifier(node.expression) &&
    (node.expression.text === "test" || node.expression.text === "it")
  );
}

function isSkippedSuiteCall(node: ts.CallExpression): boolean {
  return (
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    (node.expression.expression.text === "describe" ||
      node.expression.expression.text === "suite") &&
    node.expression.name.text === "skip"
  );
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
    if (ts.isCallExpression(node) && isSkippedSuiteCall(node)) {
      ts.forEachChild(node, (child) => visit(child, true));
      return;
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
