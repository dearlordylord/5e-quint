import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import ts from "typescript";

function normalizedText(node, sourceFile) {
  return node.getText(sourceFile).replaceAll(/\s+/gu, " ").trim();
}

function shortHash(value) {
  return createHash("sha256").update(value).digest("hex").slice(0, 12);
}

function declaredName(node, sourceFile) {
  if (node.name !== undefined) return normalizedText(node.name, sourceFile);
  let parent = node.parent;
  while (
    parent !== undefined &&
    (ts.isParenthesizedExpression(parent) ||
      ts.isAsExpression(parent) ||
      ts.isSatisfiesExpression(parent))
  ) {
    parent = parent.parent;
  }
  if (parent !== undefined && ts.isVariableDeclaration(parent)) {
    return normalizedText(parent.name, sourceFile);
  }
  if (
    parent !== undefined &&
    (ts.isPropertyAssignment(parent) || ts.isPropertyDeclaration(parent))
  ) {
    return normalizedText(parent.name, sourceFile);
  }
  return null;
}

function enclosingFunction(node) {
  let parent = node.parent;
  while (parent !== undefined) {
    if (ts.isFunctionLike(parent)) return parent;
    parent = parent.parent;
  }
  return null;
}

function callExpressionIdentity(call, node, sourceFile) {
  const expressionContainsNode =
    call.expression.pos <= node.pos && node.end <= call.expression.end;
  const operation = expressionContainsNode
    ? "iife"
    : normalizedText(call.expression, sourceFile);
  const argumentIndex = call.arguments.findIndex(
    (argument) => argument.pos <= node.pos && node.end <= argument.end,
  );
  const selectors = call.arguments
    .filter((_, index) => index !== argumentIndex)
    .map((argument) => normalizedText(argument, sourceFile))
    .join("|");
  const selectorSuffix =
    selectors === "" ? "" : `:selector-${shortHash(selectors)}`;
  return `call:${operation}:argument-${argumentIndex}${selectorSuffix}`;
}

function expressionOwnershipSite(parent, child, sourceFile) {
  if (ts.isPropertyAssignment(parent) || ts.isPropertyDeclaration(parent)) {
    return `property:${normalizedText(parent.name, sourceFile)}`;
  }
  if (ts.isVariableDeclaration(parent)) {
    return `variable:${normalizedText(parent.name, sourceFile)}`;
  }
  if (ts.isCallExpression(parent)) {
    return callExpressionIdentity(parent, child, sourceFile);
  }
  if (ts.isArrayLiteralExpression(parent)) {
    return `array-element:${parent.elements.findIndex(
      (element) => element.pos <= child.pos && child.end <= element.end,
    )}`;
  }
  if (ts.isConditionalExpression(parent)) {
    if (parent.whenTrue.pos <= child.pos && child.end <= parent.whenTrue.end) {
      return "conditional:true";
    }
    if (
      parent.whenFalse.pos <= child.pos &&
      child.end <= parent.whenFalse.end
    ) {
      return "conditional:false";
    }
  }
  return null;
}

function lexicalOwners(node, sourceFile) {
  const owners = [];
  let child = node;
  let parent = node.parent;
  let ownsExpression = ts.isFunctionExpression(node) && node.name !== undefined;
  while (parent !== undefined && !ts.isFunctionLike(parent)) {
    if (ts.isClassLike(parent)) {
      const name = declaredName(parent, sourceFile);
      owners.push(`class:${name ?? "anonymous"}`);
      ownsExpression = ts.isClassExpression(parent);
    } else if (ts.isObjectLiteralExpression(parent)) {
      const name = declaredName(parent, sourceFile);
      owners.push(`object:${name ?? "anonymous"}`);
      ownsExpression = true;
    } else if (ownsExpression) {
      const site = expressionOwnershipSite(parent, child, sourceFile);
      if (site !== null) owners.push(site);
    }
    child = parent;
    parent = parent.parent;
  }
  return owners.reverse();
}

function immediateCall(node) {
  let parent = node.parent;
  while (parent !== undefined && !ts.isFunctionLike(parent)) {
    if (ts.isCallExpression(parent)) return parent;
    parent = parent.parent;
  }
  return null;
}

function callIdentity(node, sourceFile) {
  const context = immediateCall(node);
  if (context === null) return "anonymous";
  return callExpressionIdentity(context, node, sourceFile);
}

function functionIdentity(node, sourceFile) {
  const enclosing = enclosingFunction(node);
  const functionPrefix =
    enclosing === null ? "module" : functionIdentity(enclosing, sourceFile);
  const prefix = lexicalOwners(node, sourceFile).reduce(
    (identity, owner) => `${identity}/owner:${owner}`,
    functionPrefix,
  );
  const name = declaredName(node, sourceFile);
  return name === null
    ? `${prefix}/${callIdentity(node, sourceFile)}`
    : `${prefix}/binding:${name}`;
}

function functionNodeAtDiagnostic(sourceFile, line, column) {
  const position = sourceFile.getPositionOfLineAndCharacter(
    line - 1,
    column - 1,
  );
  let match = null;
  function visit(node) {
    if (node.pos > position || position >= node.end) return;
    if (ts.isFunctionLike(node)) match = node;
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  if (match === null) {
    throw new Error(
      `No function syntax contains complexity diagnostic at ${sourceFile.fileName}:${line}:${column}.`,
    );
  }
  return match;
}

export function complexityIdentityResolver() {
  const sourceFiles = new Map();
  return (filename, diagnostic) => {
    let sourceFile = sourceFiles.get(filename);
    if (sourceFile === undefined) {
      const source = readFileSync(filename, "utf8");
      sourceFile = ts.createSourceFile(
        filename,
        source,
        ts.ScriptTarget.Latest,
        true,
        filename.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );
      sourceFiles.set(filename, sourceFile);
    }
    return functionIdentity(
      functionNodeAtDiagnostic(sourceFile, diagnostic.line, diagnostic.column),
      sourceFile,
    );
  };
}
