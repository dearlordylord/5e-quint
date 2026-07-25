const fs = require("node:fs");
const path = require("node:path");
require("tsx/cjs");
const { Either, Schema } = require("effect");
const {
  StatBlockRecordSchema,
  UnitRecordSchema,
} = require("../packages/surface/src/surface/schema.ts");
const {
  SURFACE_SCHEMA_ROLE_ANNOTATION,
  isSurfaceSchemaRole,
  readSurfaceSchemaRole,
  surfaceSchemaRolesEqual,
} = require("../packages/surface/src/surface/schema-base.ts");

const root = path.resolve(__dirname, "..");
const referenceRoot = path.join(root, ".references/srd-5.2.1");
const contentDir = path.join(root, "packages/surface/content");
const reportDir = path.join(root, "plans/srd-corpus-audit");
const jsonReportPath = path.join(
  reportDir,
  "surface-authored-corpus-audit.json",
);
const mdReportPath = path.join(reportDir, "surface-authored-corpus-audit.md");
const unitCatalogPath = path.join(
  root,
  "packages/surface/src/surface/unit-catalog.ts",
);
const statBlockCatalogPath = path.join(
  root,
  "packages/surface/src/surface/stat-block-catalog.ts",
);

const STRUCTURAL_VOCABULARY_ROLE = Object.freeze({
  category: "vocabulary",
  kind: "literal",
});

function schemaRoleAt(ast) {
  const annotation = ast?.annotations?.[SURFACE_SCHEMA_ROLE_ANNOTATION];
  if (annotation === undefined) return undefined;
  if (!isSurfaceSchemaRole(annotation)) {
    throw new Error("Surface schema role annotation is malformed");
  }
  return readSurfaceSchemaRole(ast);
}

function rolesEqual(left, right) {
  if (left === undefined || right === undefined) return left === right;
  return surfaceSchemaRolesEqual(left, right);
}

function schemaStringRole(ast, inheritedRole) {
  const role = schemaRoleAt(ast) ?? inheritedRole;
  if (role !== undefined) return role;
  return ast?._tag === "Literal" && typeof ast.literal === "string"
    ? STRUCTURAL_VOCABULARY_ROLE
    : undefined;
}

function schemaChild(ast) {
  return ast.type ?? ast.from;
}

function decodedSchemaChild(ast) {
  return ast.to ?? ast.type ?? ast.from;
}

const suspendAstCache = new WeakMap();

function suspendedAst(ast) {
  const cached = suspendAstCache.get(ast);
  if (cached !== undefined) return cached;
  const resolved = ast.f();
  suspendAstCache.set(ast, resolved);
  return resolved;
}

function walkSchemaShape(
  ast,
  pathName,
  visitString,
  inheritedRole,
  state = { seen: new WeakMap() },
) {
  if (!ast || typeof ast !== "object") {
    throw new Error(
      `Surface schema traversal reached a non-AST node at ${pathName}`,
    );
  }

  const ownRole = schemaRoleAt(ast);
  if (
    ownRole !== undefined &&
    inheritedRole !== undefined &&
    !rolesEqual(ownRole, inheritedRole)
  ) {
    throw new Error(`Surface schema roles conflict at ${pathName}`);
  }
  const role = ownRole ?? inheritedRole;
  const seenRoles = state.seen.get(ast) ?? new Set();
  if ([...seenRoles].some((seenRole) => rolesEqual(seenRole, role))) return;
  seenRoles.add(role);
  state.seen.set(ast, seenRoles);

  switch (ast._tag) {
    case "Literal":
      if (typeof ast.literal === "string") {
        visitString(pathName, schemaStringRole(ast, inheritedRole), ast);
      }
      return;
    case "StringKeyword": {
      const stringRole = schemaStringRole(ast, inheritedRole);
      if (stringRole === undefined) {
        throw new Error(
          `Surface schema string has no role at ${pathName}; annotate the schema owner`,
        );
      }
      visitString(pathName, stringRole, ast);
      return;
    }
    case "BooleanKeyword":
    case "NumberKeyword":
    case "NeverKeyword":
    case "UnknownKeyword":
      return;
    case "Refinement":
    case "OptionalType":
      walkSchemaShape(schemaChild(ast), pathName, visitString, role, state);
      return;
    case "Transformation":
      walkSchemaShape(
        decodedSchemaChild(ast),
        pathName,
        visitString,
        role,
        state,
      );
      return;
    case "Suspend":
      // A suspend is the schema recursion boundary. Decoded-value traversal
      // expands it with pair-aware memoization; forcing Effect's recursive AST
      // here can eagerly materialize an unbounded transformed graph.
      return;
    case "Union":
      for (const type of ast.types) {
        walkSchemaShape(type, pathName, visitString, role, state);
      }
      return;
    case "TupleType":
      for (const element of ast.elements) {
        walkSchemaShape(
          element.type ?? element,
          `${pathName}[]`,
          visitString,
          role,
          state,
        );
      }
      for (const element of ast.rest) {
        walkSchemaShape(
          element.type ?? element,
          `${pathName}[]`,
          visitString,
          role,
          state,
        );
      }
      return;
    case "TypeLiteral":
      if ((ast.indexSignatures ?? []).length > 0) {
        throw new Error(
          `Surface schema traversal cannot prove ownership for an index signature at ${pathName}`,
        );
      }
      for (const property of ast.propertySignatures) {
        walkSchemaShape(
          property.type,
          `${pathName}.${String(property.name)}`,
          visitString,
          role,
          state,
        );
      }
      return;
    default:
      throw new Error(
        `Surface schema traversal does not support AST shape ${String(ast._tag)} at ${pathName}`,
      );
  }
}

function assertSurfaceSchemaStringRoles() {
  for (const [rootName, schema] of [
    ["Unit", UnitRecordSchema],
    ["StatBlock", StatBlockRecordSchema],
  ]) {
    walkSchemaShape(schema.ast, rootName, () => {});
  }
}

function buildSurfaceSchemaFieldRoles() {
  assertSurfaceSchemaStringRoles();
  const roles = new Map();
  for (const schema of [UnitRecordSchema, StatBlockRecordSchema]) {
    walkSchemaShape(schema.ast, "Surface", (_path, role, ast) => {
      if (role !== undefined && ast !== undefined) roles.set(ast, role);
    });
  }
  return roles;
}

function unwrappedSchemaAst(ast) {
  let current = ast;
  while (current && ["Transformation", "OptionalType"].includes(current._tag)) {
    current = decodedSchemaChild(current);
  }
  return current;
}

function structuralSchemaAst(ast) {
  let current = unwrappedSchemaAst(ast);
  while (current?._tag === "Refinement") current = current.from;
  return current;
}

const literalValuesCache = new WeakMap();

function literalValues(ast) {
  const cached = literalValuesCache.get(ast);
  if (cached !== undefined) return cached;
  const values = [];
  const pending = [ast];
  const seen = new WeakSet();
  while (pending.length > 0) {
    const current = structuralSchemaAst(pending.pop());
    if (!current || typeof current !== "object") continue;
    if (seen.has(current)) continue;
    seen.add(current);
    if (current._tag === "Literal") {
      values.push(current.literal);
    } else if (current._tag === "Union") {
      for (const type of current.types) pending.push(type);
    }
  }
  literalValuesCache.set(ast, values);
  return values;
}

function isLiteralDiscriminatorProperty(ast) {
  const branch = structuralSchemaAst(ast);
  if (!branch || typeof branch !== "object") return false;
  if (branch._tag === "Literal") return true;
  return (
    branch._tag === "Union" &&
    branch.types.length > 0 &&
    branch.types.every((type) => isLiteralDiscriminatorProperty(type))
  );
}

function tupleElementAt(tuple, index, valueLength) {
  if (index < tuple.elements.length) return tuple.elements[index];
  if (tuple.rest.length === 0) return undefined;
  const postRestCount = tuple.rest.length - 1;
  const postRestStart = valueLength - postRestCount;
  if (index < postRestStart) return tuple.rest[0];
  return tuple.rest[1 + index - postRestStart];
}

const branchMatchCache = new WeakMap();

function branchMatchStatus(ast, value) {
  const local = new Map();
  const pending = [{ ast, value, done: false }];
  const queued = new Map();
  const keyFor = (branch) => {
    let values = queued.get(branch);
    if (values === undefined) {
      values = new Map();
      queued.set(branch, values);
    }
    return values;
  };
  const getResult = (schemaAst, current) => {
    const branch = unwrappedSchemaAst(schemaAst);
    const localValues = local.get(branch);
    if (localValues?.has(current)) return localValues.get(current);
    if (current !== null && typeof current === "object") {
      const cached = branchMatchCache.get(branch)?.get(current);
      if (cached !== undefined) return cached;
    }
    return undefined;
  };
  const putResult = (schemaAst, current, result) => {
    const branch = unwrappedSchemaAst(schemaAst);
    let values = local.get(branch);
    if (values === undefined) {
      values = new Map();
      local.set(branch, values);
    }
    values.set(current, result);
    if (current !== null && typeof current === "object") {
      const cached = branchMatchCache.get(branch) ?? new WeakMap();
      cached.set(current, result);
      branchMatchCache.set(branch, cached);
    }
  };
  const schedule = (schemaAst, current) => {
    const branch = unwrappedSchemaAst(schemaAst);
    if (getResult(schemaAst, current) !== undefined) return;
    const values = keyFor(branch, current);
    if (values.has(current)) return;
    values.set(current, true);
    pending.push({ ast: schemaAst, value: current, done: false });
  };
  const dependencies = (schemaAst, current) => {
    const branch = unwrappedSchemaAst(schemaAst);
    if (!branch || typeof branch !== "object") return [];
    if (branch._tag === "Refinement")
      return [{ ast: branch.from, value: current }];
    if (branch._tag === "Suspend")
      return [{ ast: suspendedAst(branch), value: current }];
    if (branch._tag === "Union")
      return branch.types.map((type) => ({ ast: type, value: current }));
    if (branch._tag === "TupleType" && Array.isArray(current))
      return current.flatMap((item, index) => {
        const element = tupleElementAt(branch, index, current.length);
        return element === undefined
          ? []
          : [{ ast: element.type ?? element, value: item }];
      });
    if (
      branch._tag === "TypeLiteral" &&
      current &&
      typeof current === "object" &&
      !Array.isArray(current)
    ) {
      return branch.propertySignatures.flatMap((property) =>
        Object.prototype.hasOwnProperty.call(current, property.name)
          ? [{ ast: property.type, value: current[property.name] }]
          : [],
      );
    }
    return [];
  };
  const directStatus = (schemaAst, current) => {
    const branch = unwrappedSchemaAst(schemaAst);
    if (!branch || typeof branch !== "object") return "unknown";
    if (branch._tag === "Literal")
      return current === branch.literal ? "match" : "no-match";
    if (branch._tag === "StringKeyword")
      return typeof current === "string" ? "match" : "no-match";
    if (branch._tag === "NumberKeyword")
      return typeof current === "number" ? "match" : "no-match";
    if (branch._tag === "BooleanKeyword")
      return typeof current === "boolean" ? "match" : "no-match";
    if (branch._tag === "TupleType") {
      if (!Array.isArray(current)) return "no-match";
      const required =
        branch.elements.filter((element) => !element.isOptional).length +
        Math.max(0, branch.rest.length - 1);
      if (current.length < required) return "no-match";
      return branch.rest.length === 0 && current.length > branch.elements.length
        ? "no-match"
        : undefined;
    }
    if (branch._tag !== "TypeLiteral") return undefined;
    if (!current || typeof current !== "object" || Array.isArray(current))
      return "no-match";
    for (const property of branch.propertySignatures) {
      if (
        !property.isOptional &&
        !Object.prototype.hasOwnProperty.call(current, property.name)
      )
        return "no-match";
    }
    if (branch.indexSignatures.length === 0) {
      const known = new Set(
        branch.propertySignatures.map((property) => String(property.name)),
      );
      if (Object.keys(current).some((name) => !known.has(name)))
        return "no-match";
    }
    const discriminators = branch.propertySignatures.filter(
      (property) =>
        !property.isOptional && isLiteralDiscriminatorProperty(property.type),
    );
    return discriminators.length > 0 &&
      !discriminators.some((property) =>
        Object.prototype.hasOwnProperty.call(current, property.name),
      )
      ? "unknown"
      : undefined;
  };
  while (pending.length > 0) {
    const task = pending.pop();
    const branch = unwrappedSchemaAst(task.ast);
    if (task.done) {
      const deps = dependencies(task.ast, task.value);
      const statuses = deps.map(
        (dependency) =>
          getResult(dependency.ast, dependency.value) ?? "unknown",
      );
      let result = directStatus(task.ast, task.value);
      if (branch?._tag === "Refinement") {
        const underlying = statuses[0] ?? "unknown";
        if (underlying === "no-match") result = "no-match";
        else {
          try {
            result =
              branch.filter(task.value, {}, branch)._tag === "Some"
                ? "no-match"
                : underlying;
          } catch {
            result = "unknown";
          }
        }
      } else if (branch?._tag === "Union") {
        result = statuses.includes("match")
          ? "match"
          : statuses.includes("unknown")
            ? "unknown"
            : "no-match";
      } else if (branch?._tag === "Suspend") {
        result = statuses[0] ?? "unknown";
      } else if (result === undefined) {
        result = statuses.includes("no-match")
          ? "no-match"
          : statuses.includes("unknown")
            ? "unknown"
            : "match";
      }
      putResult(task.ast, task.value, result);
      continue;
    }
    if (getResult(task.ast, task.value) !== undefined) continue;
    const values = keyFor(branch, task.value);
    if (values.has("active")) {
      putResult(task.ast, task.value, "unknown");
      continue;
    }
    values.set("active", true);
    pending.push({ ...task, done: true });
    for (const dependency of dependencies(task.ast, task.value))
      schedule(dependency.ast, dependency.value);
    values.delete("active");
  }
  return getResult(ast, value) ?? "unknown";
}

const discriminatorCache = new WeakMap();

function branchHasLiteralDiscriminator(ast) {
  const cached = discriminatorCache.get(ast);
  if (cached !== undefined) return cached;
  const branch = structuralSchemaAst(ast);
  if (!branch || typeof branch !== "object") return false;
  if (branch._tag === "Suspend") {
    const result = branchHasLiteralDiscriminator(suspendedAst(branch));
    discriminatorCache.set(ast, result);
    return result;
  }
  if (branch._tag === "Union") {
    const result = branch.types.some(branchHasLiteralDiscriminator);
    discriminatorCache.set(ast, result);
    return result;
  }
  const result =
    branch._tag === "TypeLiteral" &&
    branch.propertySignatures.some(
      (property) =>
        !property.isOptional && isLiteralDiscriminatorProperty(property.type),
    );
  discriminatorCache.set(ast, result);
  return result;
}

function branchDiscriminatorMatches(ast, value) {
  const branch = structuralSchemaAst(ast);
  if (!branch || typeof branch !== "object") return false;
  if (branch._tag === "Suspend")
    return branchDiscriminatorMatches(suspendedAst(branch), value);
  if (branch._tag === "Union")
    return branch.types.some((type) => branchDiscriminatorMatches(type, value));
  if (
    branch._tag !== "TypeLiteral" ||
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }
  let hasDiscriminator = false;
  let hasPresentDiscriminator = false;
  for (const property of branch.propertySignatures) {
    if (property.isOptional || !isLiteralDiscriminatorProperty(property.type))
      continue;
    const values = literalValues(property.type);
    hasDiscriminator = true;
    if (!Object.prototype.hasOwnProperty.call(value, property.name)) continue;
    hasPresentDiscriminator = true;
    if (!values.includes(value[property.name])) return false;
  }
  return hasDiscriminator && hasPresentDiscriminator;
}

function matchingUnionBranches(types, value) {
  const taggedCandidates = types.filter(
    (type) =>
      branchHasLiteralDiscriminator(type) &&
      branchDiscriminatorMatches(type, value),
  );
  const taggedMatches = taggedCandidates.filter(
    (type) => branchMatchStatus(type, value) === "match",
  );
  const taggedUnknowns = taggedCandidates.filter(
    (type) => branchMatchStatus(type, value) === "unknown",
  );
  const untaggedCandidates = types.filter(
    (type) => !branchHasLiteralDiscriminator(type),
  );
  const untaggedMatches = untaggedCandidates.filter(
    (type) => branchMatchStatus(type, value) === "match",
  );
  if (
    taggedMatches.length > 0 ||
    taggedUnknowns.length > 0 ||
    untaggedMatches.length > 0
  ) {
    return [...taggedMatches, ...taggedUnknowns, ...untaggedMatches];
  }
  if (taggedUnknowns.length > 0) return taggedUnknowns;
  // Effect transformations can decode a value into a representation whose
  // discriminator is not present in the source-side union AST. Keep those
  // reachable schema/value pairs for the role conflict check below.
  return types;
}

function walkSurfaceValue(schema, value, visitString, pathName = "value") {
  const seenObjects = new WeakMap();
  const pending = [
    {
      ast: schema.ast,
      current: value,
      currentPath: pathName,
      inheritedRole: undefined,
    },
  ];
  const observations = [];

  while (pending.length > 0) {
    const task = pending.pop();
    const { ast, current, currentPath, inheritedRole } = task;
    if (current === undefined) continue;
    const ownRole = schemaRoleAt(ast);
    if (
      ownRole !== undefined &&
      inheritedRole !== undefined &&
      !rolesEqual(ownRole, inheritedRole)
    ) {
      throw new Error(`Surface schema roles conflict at ${currentPath}`);
    }
    const role = ownRole ?? inheritedRole;
    const objectLike = current !== null && typeof current === "object";
    if (objectLike) {
      const seenForAst = seenObjects.get(ast) ?? new WeakMap();
      const roles = seenForAst.get(current) ?? new Set();
      if ([...roles].some((seenRole) => rolesEqual(seenRole, role))) continue;
      roles.add(role);
      seenForAst.set(current, roles);
      seenObjects.set(ast, seenForAst);
    }

    switch (ast._tag) {
      case "Literal":
        if (typeof current === "string" && typeof ast.literal === "string") {
          const stringRole = schemaStringRole(ast, inheritedRole);
          if (stringRole === undefined) break;
          observations.push({
            path: currentPath,
            value: current,
            role: stringRole,
            ast,
          });
        }
        break;
      case "StringKeyword":
        if (typeof current === "string") {
          const stringRole = schemaStringRole(ast, inheritedRole);
          if (stringRole === undefined) {
            throw new Error(
              `Surface value string has no schema role at ${currentPath}`,
            );
          }
          observations.push({
            path: currentPath,
            value: current,
            role: stringRole,
            ast,
          });
        }
        break;
      case "BooleanKeyword":
      case "NumberKeyword":
      case "NeverKeyword":
      case "UnknownKeyword":
        break;
      case "Refinement":
      case "Transformation":
      case "OptionalType":
        pending.push({
          ast: decodedSchemaChild(ast),
          current,
          currentPath,
          inheritedRole: role,
        });
        break;
      case "Suspend":
        pending.push({
          ast: suspendedAst(ast),
          current,
          currentPath,
          inheritedRole: role,
        });
        break;
      case "Union": {
        for (const branch of matchingUnionBranches(ast.types, current)) {
          pending.push({
            ast: branch,
            current,
            currentPath,
            inheritedRole: role,
          });
        }
        break;
      }
      case "TupleType":
        if (Array.isArray(current)) {
          for (let index = current.length - 1; index >= 0; index -= 1) {
            const element = tupleElementAt(ast, index, current.length);
            if (element !== undefined) {
              pending.push({
                ast: element.type ?? element,
                current: current[index],
                currentPath: `${currentPath}[${index}]`,
                inheritedRole: role,
              });
            }
          }
        }
        break;
      case "TypeLiteral":
        if (current && typeof current === "object" && !Array.isArray(current)) {
          for (
            let index = ast.propertySignatures.length - 1;
            index >= 0;
            index -= 1
          ) {
            const property = ast.propertySignatures[index];
            if (Object.prototype.hasOwnProperty.call(current, property.name)) {
              pending.push({
                ast: property.type,
                current: current[property.name],
                currentPath: `${currentPath}.${String(property.name)}`,
                inheritedRole: role,
              });
            }
          }
        }
        break;
      default:
        throw new Error(
          `Surface value traversal does not support AST shape ${String(ast._tag)} at ${currentPath}`,
        );
    }
  }

  const observationsByValue = new Map();
  for (const observation of observations) {
    const key = `${observation.path}\u0000${observation.value}`;
    const group = observationsByValue.get(key) ?? [];
    group.push(observation);
    observationsByValue.set(key, group);
  }
  for (const group of observationsByValue.values()) {
    const roles = [];
    for (const observation of group) {
      if (
        !roles.some((existing) => rolesEqual(existing.role, observation.role))
      ) {
        roles.push(observation);
      }
    }
    const explicit = roles.filter(
      (observation) => observation.role.category !== "vocabulary",
    );
    const finalObservations = explicit.length > 0 ? explicit : roles;
    if (explicit.length > 1) {
      throw new Error(
        `Surface value has incompatible union roles at ${group[0].path}`,
      );
    }
    const observation = finalObservations[0];
    if (observation === undefined) continue;
    visitString(
      observation.path,
      observation.value,
      observation.role,
      observation.ast,
    );
  }
}

function walkDecodedSurfaceRecord(record, visitString) {
  const schema =
    record.kind === "statBlock" ? StatBlockRecordSchema : UnitRecordSchema;
  walkSurfaceValue(schema, record.value, visitString);
}

function collectDecodedStringPaths(value, path = "value", paths = new Set()) {
  if (typeof value === "string") {
    paths.add(path);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) =>
      collectDecodedStringPaths(item, `${path}[${index}]`, paths),
    );
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      collectDecodedStringPaths(item, `${path}.${key}`, paths);
    }
  }
  return paths;
}

function decodeSurfaceRecord(record) {
  const schema =
    record.kind === "statBlock" ? StatBlockRecordSchema : UnitRecordSchema;
  const decoded = Schema.decodeUnknownEither(schema, {
    onExcessProperty: "error",
  })(record.value);
  if (Either.isLeft(decoded)) {
    throw new Error(
      `Surface record failed schema decoding at ${record.contentPath}`,
    );
  }
  return { ...record, value: decoded.right };
}

function normalizeAnchor(value) {
  return String(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function walkMarkdownFiles(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkMarkdownFiles(filePath, files);
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      files.push(filePath);
    }
  }
  return files;
}

function lineNumber(raw, index) {
  return raw.slice(0, index).split("\n").length;
}

function buildReferenceIndex() {
  const markdownFiles = walkMarkdownFiles(referenceRoot).sort();
  const fileByRel = new Map();
  const headingsByFile = new Map();
  const proseAnchorsByFile = new Map();

  for (const filePath of markdownFiles) {
    const rel = path.relative(referenceRoot, filePath).replace(/\\/g, "/");
    const raw = fs.readFileSync(filePath, "utf8");
    fileByRel.set(rel, filePath);

    const headings = [...raw.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((match) => ({
      rel,
      line: lineNumber(raw, match.index),
      text: match[2].trim(),
      normalized: normalizeAnchor(match[2]),
    }));
    headingsByFile.set(rel, headings);

    const proseAnchors = [
      ...raw.matchAll(
        /(?:^|\n)(?:[-*]\s+)?\*\*\*?([^*\n.]+(?: [^*\n.]+)*)\.\*\*\*?/g,
      ),
    ].map((match) => ({
      rel,
      line: lineNumber(raw, match.index),
      text: match[1].trim(),
      normalized: normalizeAnchor(match[1]),
    }));
    proseAnchorsByFile.set(rel, proseAnchors);
  }

  return { fileByRel, headingsByFile, proseAnchorsByFile };
}

function readSurfaceRecords() {
  const records = [];
  const installedUnitFiles = importedContentFiles(unitCatalogPath);
  const installedStatBlockFiles = importedContentFiles(statBlockCatalogPath);

  function visit(value, file, index) {
    if (Array.isArray(value)) {
      value.forEach((entry, entryIndex) => visit(entry, file, entryIndex));
      return;
    }
    if (
      value &&
      typeof value === "object" &&
      value.provenance?.kind === "srd-5.2.1"
    ) {
      records.push(
        decodeSurfaceRecord({
          contentPath: `packages/surface/content/${file}`,
          contentFile: file,
          index,
          id: value.id,
          kind: value.kind ?? "unknown",
          name: value.name ?? value.statBlock?.displayName ?? value.id,
          section: value.provenance.section,
          value,
          catalogBoundary:
            value.kind === "statBlock"
              ? installedStatBlockFiles.has(file)
                ? "srd-stat-block-collection"
                : "not-installed"
              : installedUnitFiles.has(file)
                ? "srd-unit-collection"
                : "authored-not-installed",
        }),
      );
    }
  }

  for (const file of fs
    .readdirSync(contentDir)
    .filter((entry) => entry.endsWith(".json"))
    .sort()) {
    visit(
      JSON.parse(fs.readFileSync(path.join(contentDir, file), "utf8")),
      file,
    );
  }

  return records;
}

function importedContentFiles(sourcePath) {
  if (!fs.existsSync(sourcePath)) {
    return new Set();
  }
  const raw = fs.readFileSync(sourcePath, "utf8");
  return new Set(
    [...raw.matchAll(/from\s+"..\/..\/content\/([^"]+\.json)"/g)].map(
      (match) => match[1],
    ),
  );
}

function addIfPresent(paths, fileByRel, rel) {
  if (fileByRel.has(rel)) {
    paths.push(rel);
  }
}

function candidateFiles(base, fileByRel) {
  const files = [];
  const withoutMd = base.replace(/\.md$/, "");

  addIfPresent(files, fileByRel, base);
  addIfPresent(files, fileByRel, `${withoutMd}.md`);

  if (base === "MagicItems") {
    for (const rel of fileByRel.keys()) {
      if (rel.startsWith("Magic-Items/Items-")) {
        files.push(rel);
      }
    }
  }
  if (base === "Equipment") {
    addIfPresent(files, fileByRel, "Equipment.md");
  }
  if (base === "Feats" || base.startsWith("Feats/")) {
    addIfPresent(files, fileByRel, "Feats.md");
  }
  if (base === "Character-Origins" || base.startsWith("Character-Origins/")) {
    addIfPresent(files, fileByRel, "Character-Origins.md");
  }
  if (base.startsWith("Species/")) {
    addIfPresent(files, fileByRel, "Character-Origins.md");
  }
  if (base.startsWith("Classes/")) {
    const className = base.split("/")[1];
    addIfPresent(files, fileByRel, `Classes/${className}.md`);
  }
  if (base.startsWith("Spells/Descriptions-")) {
    for (const rel of fileByRel.keys()) {
      if (rel.startsWith("Spells/Descriptions-")) {
        files.push(rel);
      }
    }
  }

  return [...new Set(files)];
}

function splitSectionPart(part) {
  const hashIndex = part.indexOf("#");
  const colonIndex = part.indexOf(":");
  if (hashIndex !== -1 && (colonIndex === -1 || hashIndex < colonIndex)) {
    return {
      base: part.slice(0, hashIndex),
      separator: "#",
      suffix: part.slice(hashIndex + 1),
    };
  }
  if (colonIndex !== -1) {
    return {
      base: part.slice(0, colonIndex),
      separator: ":",
      suffix: part.slice(colonIndex + 1),
    };
  }
  return { base: part, separator: "", suffix: "" };
}

function lineCountFor(rel) {
  return fs.readFileSync(path.join(referenceRoot, rel), "utf8").split("\n")
    .length;
}

function resolveLineRanges(part, base, suffix, files) {
  const rel = files[0];
  const lineCount = lineCountFor(rel);
  const invalidRanges = suffix
    .split(",")
    .map((range) => range.trim())
    .filter(Boolean)
    .filter((range) => {
      const match = range.match(/^(\d+)(?:-(\d+))?$/);
      if (!match) {
        return true;
      }
      const start = Number(match[1]);
      const end = match[2] === undefined ? start : Number(match[2]);
      return start < 1 || end < start || end > lineCount;
    });

  return {
    part,
    status: invalidRanges.length === 0 ? "ok-line-range" : "bad-line-range",
    canonical: `${rel}:${suffix}`,
    legacyBase: rel !== base && rel !== `${base}.md`,
    invalidRanges,
  };
}

function anchorMatches(anchors, target, mode) {
  return anchors.filter((anchor) => {
    if (mode === "exact") {
      return anchor.normalized === target;
    }
    if (mode === "prefix") {
      return anchor.normalized.startsWith(target);
    }
    return (
      anchor.normalized.endsWith(target) || target.endsWith(anchor.normalized)
    );
  });
}

function resolveAnchor(part, base, suffix, files, index) {
  const target = normalizeAnchor(suffix);

  for (const mode of ["exact", "prefix", "suffix"]) {
    for (const rel of files) {
      const headings = index.headingsByFile.get(rel) ?? [];
      const matches = anchorMatches(headings, target, mode);
      if (matches.length > 0) {
        const match = matches[0];
        return {
          part,
          status:
            rel === base || rel === `${base}.md`
              ? "ok-heading"
              : "ok-heading-alias",
          canonical: `${match.rel}#${match.text}`,
        };
      }
    }

    for (const rel of files) {
      const proseAnchors = index.proseAnchorsByFile.get(rel) ?? [];
      const matches = anchorMatches(proseAnchors, target, mode);
      if (matches.length > 0) {
        const match = matches[0];
        return {
          part,
          status:
            rel === base || rel === `${base}.md`
              ? "ok-prose-anchor"
              : "ok-prose-anchor-alias",
          canonical: `${match.rel}:${match.line} (${match.text})`,
        };
      }
    }
  }

  return {
    part,
    status: "missing-anchor",
    canonical: "",
  };
}

function resolveSection(section, index) {
  return section
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const parsed = splitSectionPart(part);
      const files = candidateFiles(parsed.base, index.fileByRel);
      if (files.length === 0) {
        return {
          part,
          status: "missing-file",
          canonical: "",
        };
      }
      if (parsed.separator === ":") {
        return resolveLineRanges(part, parsed.base, parsed.suffix, files);
      }
      if (parsed.separator === "#") {
        return resolveAnchor(part, parsed.base, parsed.suffix, files, index);
      }
      return {
        part,
        status:
          files[0] === parsed.base || files[0] === `${parsed.base}.md`
            ? "ok-file"
            : "ok-file-alias",
        canonical: files[0],
      };
    });
}

function statusSeverity(status) {
  if (status.startsWith("ok-") && status.endsWith("-alias")) {
    return "warning";
  }
  if (status.startsWith("ok-")) {
    return "ok";
  }
  return "failure";
}

function collectUnitReferences(records) {
  const refs = [];

  function add(record, fieldPath, targetRecordId, role) {
    refs.push({
      contentPath: record.contentPath,
      id: record.id,
      kind: record.kind,
      name: record.name,
      fieldPath,
      targetRecordId,
      relation: role.relation,
      targetKind: role.targetKind,
    });
  }

  for (const record of records) {
    walkDecodedSurfaceRecord(record, (fieldPath, value, role) => {
      if (role.category !== "reference" || typeof value !== "string") return;
      add(record, fieldPath.replace(/^value\./, ""), value, role);
    });
  }

  return refs;
}

function buildSpellHeadingSet(index) {
  const spellHeadings = new Set();
  for (const [rel, headings] of index.headingsByFile.entries()) {
    if (!rel.startsWith("Spells/Descriptions-")) {
      continue;
    }
    for (const heading of headings) {
      spellHeadings.add(heading.normalized);
    }
  }
  return spellHeadings;
}

function buildStatBlockHeadingSet(index) {
  const statBlockHeadings = new Set();
  for (const [rel, headings] of index.headingsByFile.entries()) {
    if (!rel.startsWith("Monsters/")) continue;
    for (const heading of headings) statBlockHeadings.add(heading.normalized);
  }
  return statBlockHeadings;
}

function buildAudit() {
  assertSurfaceSchemaStringRoles();
  const index = buildReferenceIndex();
  const records = readSurfaceRecords();
  const spellHeadings = buildSpellHeadingSet(index);
  const statBlockHeadings = buildStatBlockHeadingSet(index);
  const authoredUnitIds = new Set(
    records
      .filter((record) => record.kind !== "statBlock")
      .map((record) => record.id),
  );
  const authoredStatBlockIds = new Set(
    records
      .filter((record) => record.kind === "statBlock")
      .map((record) => record.id),
  );
  const checks = records.flatMap((record) =>
    resolveSection(record.section, index).map((resolution) => {
      const { value: _value, ...recordForReport } = record;
      return {
        ...recordForReport,
        ...resolution,
        severity: statusSeverity(resolution.status),
      };
    }),
  );
  const unitReferenceChecks = collectUnitReferences(records).map((ref) => {
    const authored =
      ref.targetKind === "statBlock"
        ? authoredStatBlockIds.has(ref.targetRecordId)
        : authoredUnitIds.has(ref.targetRecordId);
    const scannerVisibleSrdSpell =
      ref.targetKind === "unit" &&
      spellHeadings.has(normalizeAnchor(ref.targetRecordId.replace(/_/g, " ")));
    const scannerVisibleSrdStatBlock =
      ref.targetKind === "statBlock" &&
      statBlockHeadings.has(
        normalizeAnchor(ref.targetRecordId.replace(/_/g, " ")),
      );
    return {
      ...ref,
      status: authored
        ? "ok-authored-reference"
        : scannerVisibleSrdSpell
          ? "srd-spell-reference-without-authored-unit"
          : scannerVisibleSrdStatBlock
            ? "srd-stat-block-reference-without-authored-record"
            : ref.targetKind === "statBlock"
              ? "missing-authored-stat-block"
              : "missing-authored-unit",
      severity:
        authored || scannerVisibleSrdSpell || scannerVisibleSrdStatBlock
          ? authored
            ? "ok"
            : "warning"
          : "failure",
    };
  });
  const statusCounts = {};
  const kindCounts = {};
  const catalogBoundaryCounts = {};
  for (const check of checks) {
    statusCounts[check.status] = (statusCounts[check.status] ?? 0) + 1;
    kindCounts[check.kind] = (kindCounts[check.kind] ?? 0) + 1;
    catalogBoundaryCounts[check.catalogBoundary] =
      (catalogBoundaryCounts[check.catalogBoundary] ?? 0) + 1;
  }
  const unitReferenceStatusCounts = {};
  for (const check of unitReferenceChecks) {
    unitReferenceStatusCounts[check.status] =
      (unitReferenceStatusCounts[check.status] ?? 0) + 1;
  }

  return {
    generatedAt: new Date().toISOString(),
    scope:
      "SRD 5.2.1 authored Surface corpus provenance audit over generated packages/surface/content JSON records. Includes Unit records and StatBlock records with SRD provenance.",
    metrics: {
      authoredRecords: records.length,
      provenanceParts: checks.length,
      failures: checks.filter((check) => check.severity === "failure").length,
      warnings: checks.filter((check) => check.severity === "warning").length,
      unitReferenceChecks: unitReferenceChecks.length,
      unitReferenceFailures: unitReferenceChecks.filter(
        (check) => check.severity === "failure",
      ).length,
      unitReferenceWarnings: unitReferenceChecks.filter(
        (check) => check.severity === "warning",
      ).length,
      statusCounts,
      kindCounts,
      catalogBoundaryCounts,
      unitReferenceStatusCounts,
    },
    checks,
    unitReferenceChecks,
  };
}

function renderRows(checks) {
  if (checks.length === 0) {
    return ["| _none_ | _none_ | _none_ | _none_ | _none_ | _none_ |"];
  }
  return checks.map(
    (check) =>
      `| \`${check.id ?? ""}\` | ${check.kind} | ${check.name ?? ""} | \`${check.contentPath}${check.index == null ? "" : `[${check.index}]`}\` | ${check.status} | \`${check.part}\` -> \`${check.canonical}\` |`,
  );
}

function renderMarkdownReport(audit) {
  const failures = audit.checks.filter((check) => check.severity === "failure");
  const warnings = audit.checks.filter((check) => check.severity === "warning");
  const referenceFailures = audit.unitReferenceChecks.filter(
    (check) => check.severity === "failure",
  );
  const referenceWarnings = audit.unitReferenceChecks.filter(
    (check) => check.severity === "warning",
  );
  return [
    "# SRD 5.2.1 Surface Authored Corpus Audit",
    "",
    "Generated by `node scripts/srd521-surface-authored-corpus-audit.cjs`.",
    "",
    "This report audits SRD-provenance authored Surface content, not only spells. It checks generated `packages/surface/content/*.json` records because those are the production authored-content projection consumed by Surface catalogs. When a source fix is needed, edit the matching `.dhall` source and regenerate JSON.",
    "",
    "A provenance part is considered scanner-visible when this script can resolve it to a local SRD markdown file, heading, prose anchor, or line range under `.references/srd-5.2.1/`.",
    "",
    "## Metrics",
    "",
    `- Authored SRD records: ${audit.metrics.authoredRecords}`,
    `- Provenance parts checked: ${audit.metrics.provenanceParts}`,
    `- Failures: ${audit.metrics.failures}`,
    `- Warnings: ${audit.metrics.warnings}`,
    `- Unit reference checks: ${audit.metrics.unitReferenceChecks}`,
    `- Unit reference failures: ${audit.metrics.unitReferenceFailures}`,
    `- Unit reference warnings: ${audit.metrics.unitReferenceWarnings}`,
    "",
    "### Status Counts",
    "",
    "| Status | Count |",
    "|---|---:|",
    ...Object.entries(audit.metrics.statusCounts)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([status, count]) => `| ${status} | ${count} |`),
    "",
    "### Authored Record Kinds",
    "",
    "| Kind | Count |",
    "|---|---:|",
    ...Object.entries(audit.metrics.kindCounts)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([kind, count]) => `| ${kind} | ${count} |`),
    "",
    "### Catalog Boundaries",
    "",
    "| Boundary | Provenance parts |",
    "|---|---:|",
    ...Object.entries(audit.metrics.catalogBoundaryCounts)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([boundary, count]) => `| ${boundary} | ${count} |`),
    "",
    "### Unit Reference Closure",
    "",
    "This checks scanner-visible Unit references inside authored records: class/subclass feature grants, subclass choices, species trait maps, starting-equipment Unit refs, resource Unit links, and spell-list `spellIds` arrays.",
    "",
    "| Status | Count |",
    "|---|---:|",
    ...Object.entries(audit.metrics.unitReferenceStatusCounts)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([status, count]) => `| ${status} | ${count} |`),
    "",
    "#### Unit Reference Failures",
    "",
    "| Owner | Relation | Field | Target Unit |",
    "|---|---|---|---|",
    ...(referenceFailures.length === 0
      ? ["| _none_ | _none_ | _none_ | _none_ |"]
      : referenceFailures.map(
          (check) =>
            `| \`${check.id}\` | ${check.relation} | \`${check.fieldPath}\` | \`${check.targetRecordId}\` |`,
        )),
    "",
    "#### Unit Reference Warnings",
    "",
    "These references point to scanner-visible SRD spell sections, but the target spell is not authored as a Surface Unit yet.",
    "",
    "| Owner | Relation | Field | Target Unit |",
    "|---|---|---|---|",
    ...(referenceWarnings.length === 0
      ? ["| _none_ | _none_ | _none_ | _none_ |"]
      : referenceWarnings.map(
          (check) =>
            `| \`${check.id}\` | ${check.relation} | \`${check.fieldPath}\` | \`${check.targetRecordId}\` |`,
        )),
    "",
    "## Failures",
    "",
    "| Id | Kind | Name | Content | Status | Resolution |",
    "|---|---|---|---|---|---|",
    ...renderRows(failures),
    "",
    "## Warnings",
    "",
    "Warnings are scanner-visible through a known legacy alias, but the provenance string is not canonical for the markdown file it resolves to. They do not block the audit.",
    "",
    "| Id | Kind | Name | Content | Status | Resolution |",
    "|---|---|---|---|---|---|",
    ...renderRows(warnings.slice(0, 200)),
    ...(warnings.length > 200
      ? [
          `| ... | ... | ... | ... | ... | ${warnings.length - 200} additional warnings omitted; see JSON report. |`,
        ]
      : []),
    "",
  ].join("\n");
}

if (require.main === module) {
  const audit = buildAudit();
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(jsonReportPath, `${JSON.stringify(audit, null, 2)}\n`);
  fs.writeFileSync(mdReportPath, renderMarkdownReport(audit));

  console.log(`Wrote ${jsonReportPath}`);
  console.log(`Wrote ${mdReportPath}`);
  console.log(
    `Surface authored corpus audit: ${audit.metrics.failures} provenance failures, ${audit.metrics.unitReferenceFailures} unit reference failures, ${audit.metrics.warnings} warnings, ${audit.metrics.provenanceParts} provenance parts.`,
  );

  if (audit.metrics.failures > 0 || audit.metrics.unitReferenceFailures > 0) {
    process.exitCode = 1;
  }
}

module.exports = {
  assertSurfaceSchemaStringRoles,
  buildAudit,
  buildReferenceIndex,
  buildSurfaceSchemaFieldRoles,
  collectUnitReferences,
  decodeSurfaceRecord,
  readSurfaceRecords,
  collectDecodedStringPaths,
  walkDecodedSurfaceRecord,
  walkSchemaShape,
  walkSurfaceValue,
};
