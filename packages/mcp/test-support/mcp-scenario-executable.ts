import ts from "typescript";

function isScenarioTestCall(node: ts.CallExpression): boolean {
  return (
    ts.isIdentifier(node.expression) &&
    (node.expression.text === "test" || node.expression.text === "it")
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
  const visit = (node: ts.Node): void => {
    if (found) return;
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
        found = true;
        return;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}
