import ts from "typescript";

const wrappers = new Set([
  "AwaitExpression",
  "ChainExpression",
  "TSAsExpression",
  "TSTypeAssertion",
  "TSNonNullExpression",
  "TSSatisfiesExpression",
]);
const calls = new Set([
  "CallExpression",
  "NewExpression",
  "TaggedTemplateExpression",
]);

const explicitCallResults = {
  meta: {
    type: "problem",
    docs: {
      description: "Consume call results or bind an explicitly typed discard.",
    },
    schema: [],
    messages: {
      discarded:
        "Consume this call result or bind it with const and an explicit type (for example, const _logged: void = log()).",
      untyped:
        "An explicit discard must be a const binding with a type annotation.",
    },
  },
  create(context) {
    const services = context.sourceCode.parserServices;
    if (!services.program || !services.esTreeNodeToTSNodeMap) {
      throw new Error(
        "explicit-call-results requires TypeScript project information.",
      );
    }
    const checker = services.program.getTypeChecker();
    const reported = new WeakSet();
    const controlsFlow = (node) => {
      if (node.type !== "CallExpression") return false;
      const signature = checker.getResolvedSignature(
        services.esTreeNodeToTSNodeMap.get(node),
      );
      if (!signature) return false;
      const predicate = checker.getTypePredicateOfSignature(signature);
      return (
        predicate?.kind === ts.TypePredicateKind.AssertsIdentifier ||
        predicate?.kind === ts.TypePredicateKind.AssertsThis ||
        (checker.getReturnTypeOfSignature(signature).flags &
          ts.TypeFlags.Never) !==
          0
      );
    };
    const checkDiscard = (node) => {
      if (wrappers.has(node.type))
        return checkDiscard(node.expression ?? node.argument);
      if (node.type === "UnaryExpression" && node.operator === "void")
        return checkDiscard(node.argument);
      if (calls.has(node.type)) {
        if (!controlsFlow(node) && !reported.has(node)) {
          reported.add(node);
          context.report({ node, messageId: "discarded" });
        }
      } else if (node.type === "ConditionalExpression") {
        checkDiscard(node.consequent);
        checkDiscard(node.alternate);
      } else if (node.type === "LogicalExpression") {
        checkDiscard(node.right);
      } else if (node.type === "SequenceExpression") {
        for (const expression of node.expressions) checkDiscard(expression);
      }
    };
    const contextDiscardsReturn = (node) => {
      const contextualType = checker.getContextualType(
        services.esTreeNodeToTSNodeMap.get(node),
      );
      return (
        contextualType
          ?.getCallSignatures()
          .some(
            (signature) =>
              (checker.getReturnTypeOfSignature(signature).flags &
                ts.TypeFlags.Void) !==
              0,
          ) ?? false
      );
    };
    return {
      ExpressionStatement(node) {
        checkDiscard(node.expression);
      },
      UnaryExpression(node) {
        if (node.operator === "void") checkDiscard(node.argument);
      },
      ForStatement(node) {
        if (node.init && node.init.type !== "VariableDeclaration")
          checkDiscard(node.init);
        if (node.update) checkDiscard(node.update);
      },
      SequenceExpression(node) {
        if (node.parent.type === "ExpressionStatement") return;
        for (const expression of node.expressions.slice(0, -1))
          checkDiscard(expression);
      },
      ArrowFunctionExpression(node) {
        if (node.body.type !== "BlockStatement" && contextDiscardsReturn(node))
          checkDiscard(node.body);
      },
      ReturnStatement(node) {
        if (!node.argument) return;
        const owner = context.sourceCode
          .getAncestors(node)
          .reverse()
          .find(
            (ancestor) =>
              ancestor.type === "ArrowFunctionExpression" ||
              ancestor.type === "FunctionExpression" ||
              ancestor.type === "FunctionDeclaration",
          );
        if (
          owner &&
          owner.type !== "FunctionDeclaration" &&
          contextDiscardsReturn(owner)
        )
          checkDiscard(node.argument);
      },
      VariableDeclarator(node) {
        if (
          node.id.type !== "Identifier" ||
          !node.id.name.startsWith("_") ||
          !node.init
        )
          return;
        if (node.parent.kind !== "const" || !node.id.typeAnnotation) {
          context.report({ node: node.id, messageId: "untyped" });
          return;
        }
        context.sourceCode.markVariableAsUsed(node.id.name, node);
      },
    };
  },
};

export default { rules: { "explicit-call-results": explicitCallResults } };
