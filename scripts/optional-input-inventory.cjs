const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const ts = require("typescript");

// Syntactic inventory: optional parameters and top-level undefined unions;
// independently defaulted parameters and optional object members are outside this scan.
function includesUndefined(type) {
  return (
    type !== undefined &&
    (type.kind === ts.SyntaxKind.UndefinedKeyword ||
      (ts.isUnionTypeNode(type) && type.types.some(includesUndefined)) ||
      (ts.isParenthesizedTypeNode(type) && includesUndefined(type.type)))
  );
}
const files = execFileSync("git", ["ls-files", "-z", "*.ts", "*.tsx"], {
  encoding: "utf8",
})
  .split("\0")
  .filter(Boolean);
const candidates = [];
for (const file of files) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  function visit(node) {
    if (ts.isFunctionLike(node) && node.parameters) {
      const optional = node.parameters.filter(
        (parameter) =>
          parameter.questionToken || includesUndefined(parameter.type),
      );
      if (optional.length >= 2) {
        candidates.push({
          file,
          line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
          name:
            node.name?.getText(source) ??
            node.parent?.name?.getText(source) ??
            "<anonymous>",
          parameters: optional.map((parameter) =>
            parameter.name.getText(source),
          ),
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
process.stdout.write(
  `${JSON.stringify({ files: files.length, candidates }, null, 2)}\n`,
);
