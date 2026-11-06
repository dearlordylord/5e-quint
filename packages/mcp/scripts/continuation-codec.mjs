import ts from "typescript";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";

const root = resolve(import.meta.dirname, "..");
const entry = resolve(root, "src/play-session-continuation.ts");
const output = resolve(root, "src/play-session-continuation-descriptor.gen.ts");
const config = ts.readConfigFile(
  resolve(root, "tsconfig.json"),
  ts.sys.readFile,
);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
const program = ts.createProgram([entry], parsed.options);
const checker = program.getTypeChecker();
const source = program.getSourceFile(entry);
const declaration = source.statements.find(
  (statement) =>
    ts.isTypeAliasDeclaration(statement) &&
    statement.name.text === "PlaySessionContinuation",
);
if (!declaration)
  throw new Error("The canonical continuation contract is absent.");
const descriptors = [];
const indices = new Map();
const refinements = [];
const imports = [];
const trace = [];
const schemas = new Map();
for (const file of program.getSourceFiles()) {
  if (
    !file.fileName.includes("/packages/") ||
    file.fileName.includes("node_modules/")
  )
    continue;
  const module = checker.getSymbolAtLocation(file);
  if (!module) continue;
  for (const symbol of checker.getExportsOfModule(module)) {
    if (
      !symbol.valueDeclaration ||
      !symbol.declarations?.some(
        (declaration) => declaration.getSourceFile() === file,
      )
    )
      continue;
    const value = checker.getTypeOfSymbolAtLocation(
      symbol,
      symbol.valueDeclaration,
    );
    const field = value.getProperty("Type");
    const type =
      field &&
      checker.getTypeOfSymbolAtLocation(field, symbol.valueDeclaration);
    const marker = type?.getProperty("~effect/Brand");
    const markerDeclaration =
      marker?.valueDeclaration ?? marker?.declarations?.[0];
    const brands =
      marker &&
      markerDeclaration &&
      /\/effect\/.*\/Brand\.(d\.)?ts$/u.test(
        markerDeclaration.getSourceFile().fileName,
      )
        ? checker
            .getTypeOfSymbolAtLocation(marker, markerDeclaration)
            .getProperties()
            .map((property) => property.name)
        : [];
    const ownerName = symbol.name.replace(/Schema$/u, "");
    const owner = file.statements.find(
      (statement) =>
        ts.isTypeAliasDeclaration(statement) &&
        statement.name.text === ownerName,
    );
    if (
      value.getProperty("ast") &&
      brands.includes(ownerName) &&
      owner &&
      checker.getTypeAtLocation(owner) === type
    ) {
      const previous = schemas.get(type);
      if (previous && previous !== symbol)
        throw new Error(`Multiple canonical schema owners for ${ownerName}.`);
      schemas.set(type, symbol);
    }
  }
}

function refinement(type) {
  const symbol = schemas.get(type) ?? type.aliasSymbol ?? type.symbol;
  if (!symbol || !symbol.valueDeclaration) return undefined;
  const value = checker.getTypeOfSymbolAtLocation(
    symbol,
    symbol.valueDeclaration,
  );
  const schema = Boolean(value.getProperty("ast"));
  const primitive = type.isIntersection()
    ? type.types.find(
        (part) => part.flags & (ts.TypeFlags.Number | ts.TypeFlags.String),
      )
    : undefined;
  if (!schema && !(primitive && value.getProperty("result"))) return undefined;
  const file = symbol.valueDeclaration.getSourceFile();
  const exported = checker
    .getExportsOfModule(checker.getSymbolAtLocation(file))
    .find((candidate) => candidate === symbol);
  if (!exported) return undefined;
  const name = `Refinement${imports.length}`;
  const path = relative(dirname(output), file.fileName).replaceAll("\\", "/");
  imports.push(
    `import { ${symbol.name} as ${name} } from ${JSON.stringify(path.startsWith(".") ? path : `./${path}`)};`,
  );
  refinements.push(
    schema
      ? `schemaPredicate(${name})`
      : `(value: unknown) => typeof value === ${JSON.stringify(primitive.flags & ts.TypeFlags.Number ? "number" : "string")} && Result.isSuccess(${name}.result(value))`,
  );
  return refinements.length - 1;
}

function describe(type) {
  const prior = indices.get(type);
  if (prior !== undefined) return prior;
  const index = descriptors.length;
  indices.set(type, index);
  descriptors.push(null);
  const check = refinement(type);
  if (schemas.has(type) && check !== undefined)
    descriptors[index] = { kind: "schema", refinement: check };
  else {
    trace.push(checker.typeToString(type));
    const data = shape(type);
    if (data.kind === "refined")
      throw new Error("Continuation shape must not nest a refinement.");
    trace.pop();
    descriptors[index] =
      check === undefined
        ? data
        : { kind: "refined", type: data, refinement: check };
  }
  return index;
}

function shape(type) {
  const flags = type.flags;
  if (flags & ts.TypeFlags.StringLiteral)
    return { kind: "literal", value: type.value };
  if (flags & ts.TypeFlags.NumberLiteral)
    return { kind: "literal", value: type.value };
  if (flags & ts.TypeFlags.BooleanLiteral)
    return { kind: "literal", value: type.intrinsicName === "true" };
  if (flags & ts.TypeFlags.Null) return { kind: "literal", value: null };
  if (flags & ts.TypeFlags.Undefined) return { kind: "undefined" };
  if (flags & ts.TypeFlags.Never || checker.typeToString(type) === "never")
    return { kind: "never" };
  if (flags & ts.TypeFlags.String) return { kind: "string" };
  if (flags & ts.TypeFlags.Number) return { kind: "number" };
  if (flags & ts.TypeFlags.BigInt) return { kind: "bigint" };
  if (flags & ts.TypeFlags.TemplateLiteral)
    return {
      kind: "template",
      texts: type.texts,
      types: type.types.map(describe),
    };
  if (type.isUnion()) return { kind: "union", types: type.types.map(describe) };
  if (type.isIntersection()) {
    const primitive = type.types.find(
      (part) =>
        part.flags &
        (ts.TypeFlags.StringLike |
          ts.TypeFlags.NumberLike |
          ts.TypeFlags.BigIntLike),
    );
    if (primitive) return shape(primitive);
    const collection = type.types.find(
      (part) =>
        checker.isArrayType(part) ||
        checker.isTupleType(part) ||
        ["ReadonlyMap", "Map", "ReadonlySet", "Set"].includes(
          part.symbol?.name,
        ),
    );
    if (collection) return shape(collection);
  }
  const name = type.symbol?.name;
  if (
    ["Some", "None"].includes(name) &&
    type.symbol.declarations?.some(
      (declaration) =>
        declaration.getSourceFile().fileName.includes("effect/") &&
        /\/Option\.(d\.)?ts$/u.test(declaration.getSourceFile().fileName),
    )
  ) {
    return name === "None"
      ? { kind: "none" }
      : { kind: "some", value: describe(checker.getTypeArguments(type)[0]) };
  }
  if (["ReadonlyMap", "Map"].includes(name)) {
    const [key, value] = checker.getTypeArguments(type);
    return { kind: "map", key: describe(key), value: describe(value) };
  }
  if (["ReadonlySet", "Set"].includes(name)) {
    return { kind: "set", value: describe(checker.getTypeArguments(type)[0]) };
  }
  if (checker.isTupleType(type)) {
    const args = checker.getTypeArguments(type);
    const flags = type.target.elementFlags;
    return { kind: "tuple", elements: args.map(describe), flags };
  }
  if (checker.isArrayType(type))
    return {
      kind: "array",
      value: describe(checker.getTypeArguments(type)[0]),
    };
  if (flags & (ts.TypeFlags.Object | ts.TypeFlags.Intersection)) {
    if (type.getCallSignatures().length || type.getConstructSignatures().length)
      throw new Error(`Non-data continuation type: ${trace.join(" -> ")}`);
    const fields = {};
    for (const field of type.getProperties()) {
      if (field.escapedName.toString().startsWith("__@")) continue;
      if (
        field.name === "~effect/Brand" &&
        field.declarations?.some((declaration) =>
          /\/effect\/.*\/Brand\.(d\.)?ts$/u.test(
            declaration.getSourceFile().fileName,
          ),
        )
      )
        continue;
      const declaration = field.valueDeclaration ?? field.declarations?.[0];
      if (
        declaration &&
        ((declaration.name && ts.isPrivateIdentifier(declaration.name)) ||
          declaration.modifiers?.some(
            (modifier) => modifier.kind === ts.SyntaxKind.PrivateKeyword,
          ))
      )
        throw new Error(
          `Nominal continuation field: ${checker.typeToString(type)}.${field.name} in ${declaration.getSourceFile().fileName}`,
        );
      fields[field.name] = {
        type: describe(
          checker.getTypeOfSymbolAtLocation(field, declaration ?? source),
        ),
        optional: Boolean(field.flags & ts.SymbolFlags.Optional),
      };
    }
    if (Object.keys(fields).length === 0)
      throw new Error(
        `Unbounded continuation object: ${checker.typeToString(type)}`,
      );
    return { kind: "object", fields };
  }
  throw new Error(
    `Unhandled continuation type: ${checker.typeToString(type)} (${flags})`,
  );
}

const rootIndex = describe(checker.getTypeAtLocation(declaration));
const text = `// Generated by scripts/continuation-codec.mjs from PlaySessionContinuation.\nimport { Result } from "effect";\nimport { schemaPredicate, parseContinuationDescriptors } from "./continuation-type-descriptor.ts";\n${imports.join("\n")}\nexport const continuationRefinements = [${refinements.join(",")}];\nexport const continuationRoot = ${rootIndex};\nexport const continuationDescriptor = parseContinuationDescriptors(JSON.parse(${JSON.stringify(JSON.stringify(descriptors))}));\n`;
if (process.argv.includes("--check")) {
  if (readFileSync(output, "utf8") !== text)
    throw new Error(
      "Run the continuation codec generator after changing canonical continuation types.",
    );
} else writeFileSync(process.argv[2] ?? output, text);
console.log(
  JSON.stringify({
    descriptors: descriptors.length,
    refinements: refinements.length,
    bytes: Buffer.byteLength(text),
  }),
);
