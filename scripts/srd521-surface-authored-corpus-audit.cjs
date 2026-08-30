const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const { isDeepStrictEqual } = require("node:util");
require("tsx/cjs");
const surfaceRequire = createRequire(
  path.resolve(__dirname, "../packages/surface/package.json"),
);
const { Result, Schema } = surfaceRequire("effect");
const SchemaAST = surfaceRequire("effect/SchemaAST");
const { DAMAGE_TYPES } = require("../packages/shared/src/types.ts");
const {
  PublishedSrdSurfaceSchema,
  StatBlockRecordSchema,
  UnitRecordSchema,
} = require("../packages/surface/src/surface/schema.ts");
const {
  srdSurface,
} = require("../packages/surface/src/surface/surface-catalog.ts");
const {
  CLASS_NAMES,
  SURFACE_SCHEMA_ROLE_ANNOTATION,
  isSurfaceSchemaRole,
  readSurfaceSchemaRole,
  surfaceSchemaRolesEqual,
} = require("../packages/surface/src/surface/schema-base.ts");

const root = path.resolve(__dirname, "..");
const referenceRoot = path.join(root, ".references/srd-5.2.1");
const reportDir = path.join(root, "plans/srd-corpus-audit");
const jsonReportPath = path.join(
  reportDir,
  "surface-authored-corpus-audit.json",
);
const mdReportPath = path.join(reportDir, "surface-authored-corpus-audit.md");

const STRUCTURAL_VOCABULARY_ROLE = Object.freeze({
  category: "vocabulary",
  kind: "literal",
});

function schemaRoleAt(ast) {
  const annotation = SchemaAST.resolveAt(SURFACE_SCHEMA_ROLE_ANNOTATION)(ast);
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
  return SchemaAST.isLiteral(ast) && typeof ast.literal === "string"
    ? STRUCTURAL_VOCABULARY_ROLE
    : undefined;
}

const suspendAstCache = new WeakMap();

function suspendedAst(ast) {
  const cached = suspendAstCache.get(ast);
  if (cached !== undefined) return cached;
  const resolved = ast.thunk();
  suspendAstCache.set(ast, resolved);
  return resolved;
}

function decodedSchemaAst(ast) {
  return SchemaAST.toType(ast);
}

function encodedSchemaAst(ast) {
  return SchemaAST.toEncoded(ast);
}

function schemaRolesAt(ast) {
  const roles = [];
  for (const candidate of [ast, decodedSchemaAst(ast), encodedSchemaAst(ast)]) {
    const role = schemaRoleAt(candidate);
    if (
      role !== undefined &&
      !roles.some((existing) => rolesEqual(existing, role))
    ) {
      roles.push(role);
    }
  }
  return roles;
}

function walkSchemaShape(
  ast,
  pathName,
  visitString,
  inheritedRole,
  state = { seen: new WeakMap() },
) {
  if (!SchemaAST.isAST(ast)) {
    throw new Error(
      `Surface schema traversal reached a non-AST node at ${pathName}`,
    );
  }

  const branch = decodedSchemaAst(ast);
  const ownRole = schemaRoleAt(branch) ?? schemaRoleAt(ast);
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

  if (SchemaAST.isLiteral(branch)) {
    if (typeof branch.literal === "string") {
      visitString(pathName, schemaStringRole(branch, role), branch);
    }
    return;
  }
  if (SchemaAST.isString(branch)) {
    const stringRole = schemaStringRole(branch, role);
    if (stringRole === undefined) {
      throw new Error(
        `Surface schema string has no role at ${pathName}; annotate the schema owner`,
      );
    }
    visitString(pathName, stringRole, branch);
    return;
  }
  if (
    SchemaAST.isNull(branch) ||
    SchemaAST.isBoolean(branch) ||
    SchemaAST.isNumber(branch) ||
    SchemaAST.isNever(branch) ||
    SchemaAST.isUnknown(branch) ||
    SchemaAST.isAny(branch)
  ) {
    return;
  }
  if (SchemaAST.isSuspend(branch)) {
    return;
  }
  if (SchemaAST.isUnion(branch)) {
    for (const type of branch.types) {
      walkSchemaShape(type, pathName, visitString, role, state);
    }
    return;
  }
  if (SchemaAST.isArrays(branch)) {
    for (const element of [...branch.elements, ...branch.rest]) {
      walkSchemaShape(element, `${pathName}[]`, visitString, role, state);
    }
    return;
  }
  if (SchemaAST.isObjects(branch)) {
    if (branch.indexSignatures.length > 0) {
      throw new Error(
        `Surface schema traversal cannot prove ownership for an index signature at ${pathName}`,
      );
    }
    for (const property of branch.propertySignatures) {
      walkSchemaShape(
        property.type,
        `${pathName}.${String(property.name)}`,
        visitString,
        role,
        state,
      );
    }
    return;
  }
  throw new Error(
    `Surface schema traversal does not support AST shape ${String(branch._tag)} at ${pathName}`,
  );
}

function assertSurfaceSchemaStringRoles() {
  for (const [rootName, schema] of [
    ["Unit", UnitRecordSchema],
    ["StatBlock", StatBlockRecordSchema],
  ]) {
    walkSchemaShape(schema.ast, rootName, () => {});
  }
}

function unwrappedSchemaAst(ast) {
  return SchemaAST.isAST(ast) ? decodedSchemaAst(ast) : ast;
}

function structuralSchemaAst(ast) {
  return unwrappedSchemaAst(ast);
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
    if (SchemaAST.isLiteral(current)) {
      values.push(current.literal);
    } else if (SchemaAST.isUnion(current)) {
      for (const type of current.types) pending.push(type);
    }
  }
  literalValuesCache.set(ast, values);
  return values;
}

function isLiteralDiscriminatorProperty(ast) {
  const branch = structuralSchemaAst(ast);
  if (!branch || typeof branch !== "object") return false;
  if (SchemaAST.isLiteral(branch)) return true;
  return (
    SchemaAST.isUnion(branch) &&
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

function checkPasses(check, value, ast) {
  if (check._tag === "Filter") {
    return check.run(value, ast, {}) === undefined;
  }
  return check.checks.every((nested) => checkPasses(nested, value, ast));
}

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
    if (SchemaAST.isSuspend(branch))
      return [{ ast: suspendedAst(branch), value: current }];
    if (SchemaAST.isUnion(branch))
      return branch.types.map((type) => ({ ast: type, value: current }));
    if (SchemaAST.isArrays(branch) && Array.isArray(current))
      return current.flatMap((item, index) => {
        const element = tupleElementAt(branch, index, current.length);
        return element === undefined ? [] : [{ ast: element, value: item }];
      });
    if (
      SchemaAST.isObjects(branch) &&
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
    if (SchemaAST.isLiteral(branch))
      return current === branch.literal ? "match" : "no-match";
    if (SchemaAST.isString(branch))
      return typeof current === "string" ? "match" : "no-match";
    if (SchemaAST.isNull(branch))
      return current === null ? "match" : "no-match";
    if (SchemaAST.isNumber(branch))
      return typeof current === "number" ? "match" : "no-match";
    if (SchemaAST.isBoolean(branch))
      return typeof current === "boolean" ? "match" : "no-match";
    if (SchemaAST.isArrays(branch)) {
      if (!Array.isArray(current)) return "no-match";
      const required =
        branch.elements.filter((element) => !SchemaAST.isOptional(element))
          .length + Math.max(0, branch.rest.length - 1);
      if (current.length < required) return "no-match";
      return branch.rest.length === 0 && current.length > branch.elements.length
        ? "no-match"
        : undefined;
    }
    if (!SchemaAST.isObjects(branch)) return undefined;
    if (!current || typeof current !== "object" || Array.isArray(current))
      return "no-match";
    for (const property of branch.propertySignatures) {
      if (
        !SchemaAST.isOptional(property.type) &&
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
        !SchemaAST.isOptional(property.type) &&
        isLiteralDiscriminatorProperty(property.type),
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
      if (SchemaAST.isUnion(branch)) {
        result = statuses.includes("match")
          ? "match"
          : statuses.includes("unknown")
            ? "unknown"
            : "no-match";
      } else if (SchemaAST.isSuspend(branch)) {
        result = statuses[0] ?? "unknown";
      } else if (result === undefined) {
        result = statuses.includes("no-match")
          ? "no-match"
          : statuses.includes("unknown")
            ? "unknown"
            : "match";
      }
      if (
        result !== "no-match" &&
        branch?.checks !== undefined &&
        !branch.checks.every((check) => checkPasses(check, task.value, branch))
      ) {
        result = "no-match";
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
  if (SchemaAST.isSuspend(branch)) {
    const result = branchHasLiteralDiscriminator(suspendedAst(branch));
    discriminatorCache.set(ast, result);
    return result;
  }
  if (SchemaAST.isUnion(branch)) {
    const result = branch.types.some(branchHasLiteralDiscriminator);
    discriminatorCache.set(ast, result);
    return result;
  }
  const result =
    SchemaAST.isObjects(branch) &&
    branch.propertySignatures.some(
      (property) =>
        !SchemaAST.isOptional(property.type) &&
        isLiteralDiscriminatorProperty(property.type),
    );
  discriminatorCache.set(ast, result);
  return result;
}

function branchDiscriminatorMatches(ast, value) {
  const branch = structuralSchemaAst(ast);
  if (!branch || typeof branch !== "object") return false;
  if (SchemaAST.isSuspend(branch))
    return branchDiscriminatorMatches(suspendedAst(branch), value);
  if (SchemaAST.isUnion(branch))
    return branch.types.some((type) => branchDiscriminatorMatches(type, value));
  if (
    !SchemaAST.isObjects(branch) ||
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return false;
  }
  let hasDiscriminator = false;
  let hasPresentDiscriminator = false;
  for (const property of branch.propertySignatures) {
    if (
      SchemaAST.isOptional(property.type) ||
      !isLiteralDiscriminatorProperty(property.type)
    )
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
    const branch = decodedSchemaAst(ast);
    const localRoles = schemaRolesAt(ast);
    if (localRoles.length > 1) {
      throw new Error(`Surface schema roles conflict at ${currentPath}`);
    }
    const ownRole = localRoles[0];
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
      const seenForAst = seenObjects.get(branch) ?? new WeakMap();
      const roles = seenForAst.get(current) ?? new Set();
      if ([...roles].some((seenRole) => rolesEqual(seenRole, role))) continue;
      roles.add(role);
      seenForAst.set(current, roles);
      seenObjects.set(branch, seenForAst);
    }

    if (SchemaAST.isLiteral(branch)) {
      if (typeof current === "string" && typeof branch.literal === "string") {
        const stringRole = schemaStringRole(branch, role);
        if (stringRole !== undefined) {
          observations.push({
            path: currentPath,
            value: current,
            role: stringRole,
            ast: branch,
          });
        }
      }
    } else if (SchemaAST.isString(branch)) {
      if (typeof current === "string") {
        const stringRole = schemaStringRole(branch, role);
        if (stringRole === undefined) {
          throw new Error(
            `Surface value string has no schema role at ${currentPath}`,
          );
        }
        observations.push({
          path: currentPath,
          value: current,
          role: stringRole,
          ast: branch,
        });
      }
    } else if (
      SchemaAST.isNull(branch) ||
      SchemaAST.isBoolean(branch) ||
      SchemaAST.isNumber(branch) ||
      SchemaAST.isNever(branch) ||
      SchemaAST.isUnknown(branch) ||
      SchemaAST.isAny(branch)
    ) {
      // Primitive non-string values do not carry authored text.
    } else if (SchemaAST.isSuspend(branch)) {
      pending.push({
        ast: suspendedAst(branch),
        current,
        currentPath,
        inheritedRole: role,
      });
    } else if (SchemaAST.isUnion(branch)) {
      for (const member of matchingUnionBranches(branch.types, current)) {
        pending.push({
          ast: member,
          current,
          currentPath,
          inheritedRole: role,
        });
      }
    } else if (SchemaAST.isArrays(branch)) {
      if (Array.isArray(current)) {
        for (let index = current.length - 1; index >= 0; index -= 1) {
          const element = tupleElementAt(branch, index, current.length);
          if (element !== undefined) {
            pending.push({
              ast: element,
              current: current[index],
              currentPath: `${currentPath}[${index}]`,
              inheritedRole: role,
            });
          }
        }
      }
    } else if (SchemaAST.isObjects(branch)) {
      if (current && typeof current === "object" && !Array.isArray(current)) {
        for (
          let index = branch.propertySignatures.length - 1;
          index >= 0;
          index -= 1
        ) {
          const property = branch.propertySignatures[index];
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
    } else {
      throw new Error(
        `Surface value traversal does not support AST shape ${String(branch._tag)} at ${currentPath}`,
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
  const decoded = Schema.decodeUnknownResult(schema, {
    onExcessProperty: "error",
  })(record.value);
  if (Result.isFailure(decoded)) {
    throw new Error(
      `Surface record failed schema decoding at ${record.contentPath}: ${decoded.failure.message}`,
    );
  }
  return { ...record, value: decoded.success };
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
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".md") &&
      entry.name !== "ATTRIBUTION.md"
    ) {
      files.push(filePath);
    }
  }
  return files;
}

function lineNumber(raw, index) {
  return raw.slice(0, index).split("\n").length + (raw[index] === "\n" ? 1 : 0);
}

function buildReferenceIndex(sourceRoot = referenceRoot) {
  const markdownFiles = walkMarkdownFiles(sourceRoot).sort();
  const fileByRel = new Map();
  const rawByRel = new Map();
  const headingsByFile = new Map();
  const proseAnchorsByFile = new Map();

  for (const filePath of markdownFiles) {
    const rel = path.relative(sourceRoot, filePath).replace(/\\/g, "/");
    const raw = fs.readFileSync(filePath, "utf8");
    fileByRel.set(rel, filePath);
    rawByRel.set(rel, raw);

    const headings = [...raw.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((match) => ({
      rel,
      level: match[1].length,
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
      isList: /^[-*]\s+/.test(
        raw.split("\n")[lineNumber(raw, match.index) - 1] ?? "",
      ),
    }));
    proseAnchorsByFile.set(rel, proseAnchors);
  }

  return {
    sourceRoot,
    fileByRel,
    rawByRel,
    headingsByFile,
    proseAnchorsByFile,
  };
}

function scanSurfaceRecords(workspaceRoot = root) {
  const records = [];
  const issues = [];
  const workspaceContentDir = path.join(
    workspaceRoot,
    "packages/surface/content",
  );
  function visit(value, file, index) {
    const objectValue =
      value !== null && typeof value === "object" && !Array.isArray(value)
        ? value
        : {};
    const record = {
      contentPath: `packages/surface/content/${file}`,
      contentFile: file,
      index,
      id: objectValue.id,
      kind: objectValue.kind ?? "unknown",
      name:
        objectValue.name ??
        objectValue.statBlock?.displayName ??
        objectValue.id,
      section: objectValue.provenance?.section,
      value,
    };
    try {
      records.push(decodeSurfaceRecord(record));
    } catch (error) {
      issues.push({
        code: "surface-decode-failure",
        contentPath: `packages/surface/content/${file}`,
        recordId:
          typeof objectValue.id === "string" ? objectValue.id : undefined,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function visitDocument(value, file) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        issues.push({
          code: "surface-content-empty",
          contentPath: `packages/surface/content/${file}`,
          message: "Surface content arrays must contain at least one record",
        });
      }
      value.forEach((entry, entryIndex) => visit(entry, file, entryIndex));
    } else {
      visit(value, file);
    }
  }

  let files = [];
  try {
    files = fs
      .readdirSync(workspaceContentDir)
      .filter((entry) => entry.endsWith(".json"))
      .sort();
  } catch (error) {
    issues.push({
      code: "surface-corpus-unreadable",
      contentPath: "packages/surface/content",
      message: error instanceof Error ? error.message : String(error),
    });
  }
  for (const file of files) {
    try {
      visitDocument(
        JSON.parse(
          fs.readFileSync(path.join(workspaceContentDir, file), "utf8"),
        ),
        file,
      );
    } catch (error) {
      issues.push({
        code: "surface-content-unreadable",
        contentPath: `packages/surface/content/${file}`,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return { records, issues };
}

function readSurfaceRecords(workspaceRoot = root) {
  const scan = scanSurfaceRecords(workspaceRoot);
  if (scan.issues.length > 0) {
    throw new Error(
      `Surface corpus scan failed: ${scan.issues
        .map((issue) => `${issue.contentPath}: ${issue.message}`)
        .join("; ")}`,
    );
  }
  return scan.records;
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

function resolveLineRanges(part, base, suffix, files, index) {
  const rel = files[0];
  const lineCount = (index.rawByRel.get(rel) ?? "").split("\n").length;
  const rangeParts = suffix.split(",").map((range) => range.trim());
  const ranges = [];
  const invalidRanges = [];
  let precedingLast = 0;
  for (const range of rangeParts) {
    if (range.length === 0) {
      invalidRanges.push(range);
      continue;
    }
    const match = range.match(/^(\d+)(?:-(\d+))?$/);
    if (match === null) {
      invalidRanges.push(range);
      continue;
    }
    const first = Number(match[1]);
    const last = match[2] === undefined ? first : Number(match[2]);
    if (
      first < 1 ||
      last < first ||
      last > lineCount ||
      first <= precedingLast
    ) {
      invalidRanges.push(range);
      continue;
    }
    ranges.push({ first, last });
    precedingLast = last;
  }
  const legacyBase = rel !== base && rel !== `${base}.md`;

  return {
    part,
    status:
      invalidRanges.length > 0
        ? "bad-line-range"
        : legacyBase
          ? "ok-line-range-alias"
          : "ok-line-range",
    canonical: `${rel}:${suffix}`,
    legacyBase,
    invalidRanges,
    lineRanges:
      invalidRanges.length === 0
        ? {
            rel,
            ranges,
          }
        : undefined,
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
  const ownerContext = normalizeAnchor(base.split("/").at(-1));

  function contextualMatch(rel, matches) {
    const headings = index.headingsByFile.get(rel) ?? [];
    return [...matches].sort((left, right) => {
      const score = (candidate) =>
        headings
          .filter((heading) => heading.line < candidate.line)
          .filter(
            (heading) =>
              heading.normalized.includes(ownerContext) ||
              ownerContext.includes(heading.normalized),
          ).length;
      const specificity = (candidate) =>
        Math.abs(candidate.normalized.length - target.length);
      return (
        specificity(left) - specificity(right) ||
        score(right) - score(left) ||
        left.line - right.line
      );
    })[0];
  }

  for (const mode of ["exact", "prefix", "suffix"]) {
    for (const rel of files) {
      const headings = index.headingsByFile.get(rel) ?? [];
      const matches = anchorMatches(headings, target, mode);
      if (matches.length > 0) {
        const match = contextualMatch(rel, matches);
        return {
          part,
          status:
            rel === base || rel === `${base}.md`
              ? "ok-heading"
              : "ok-heading-alias",
          canonical: `${match.rel}#${match.text}`,
          evidence: {
            rel: match.rel,
            lines: headingEvidenceLines(match, index),
          },
        };
      }
    }
  }
  for (const mode of ["exact", "prefix", "suffix"]) {
    for (const rel of files) {
      const proseAnchors = index.proseAnchorsByFile.get(rel) ?? [];
      const matches = anchorMatches(proseAnchors, target, mode);
      if (matches.length > 0) {
        const match = contextualMatch(rel, matches);
        return {
          part,
          status:
            rel === base || rel === `${base}.md`
              ? "ok-prose-anchor"
              : "ok-prose-anchor-alias",
          canonical: `${match.rel}:${match.line} (${match.text})`,
          evidence: {
            rel: match.rel,
            lines: proseEvidenceLines(match, index),
          },
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
    .map((part) => {
      if (part.length === 0) {
        return {
          part,
          status: "empty-section-part",
          canonical: "",
        };
      }
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
        return resolveLineRanges(
          part,
          parsed.base,
          parsed.suffix,
          files,
          index,
        );
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

function collectAuthoredRelations(records) {
  const refs = [];

  function add(record, fieldPath, targetRecordId, role) {
    refs.push({
      contentPath: record.contentPath,
      id: record.id,
      kind: record.kind,
      name: record.name,
      fieldPath,
      targetRecordId,
      relationKind: role.category,
      relation: role.relation,
      targetKind: role.targetKind,
    });
  }

  for (const record of records) {
    walkDecodedSurfaceRecord(record, (fieldPath, value, role) => {
      if (
        (role.category !== "reference" && role.category !== "dependency") ||
        typeof value !== "string"
      ) {
        return;
      }
      add(record, fieldPath.replace(/^value\./, ""), value, role);
    });
  }

  return refs;
}

const auditContextState = new WeakMap();

const ID_NAMESPACE_PREFIXES = [
  "armor",
  "background",
  "barbarian",
  "bard",
  "class",
  "cleric",
  "druid",
  "equipment",
  "feat",
  "fighter",
  "magic_item",
  "mastery",
  "monk",
  "orc",
  "paladin",
  "ranger",
  "rogue",
  "sorcerer",
  "species",
  "stat_block",
  "subclass",
  "warlock",
  "weapon",
  "wizard",
];

function sourceWords(value) {
  return (
    String(value)
      .toLowerCase()
      .replace(/['’]/g, "")
      .match(/[a-z0-9]+/g) ?? []
  );
}

function stemSourceWord(value) {
  const word = value.toLowerCase();
  const irregular = {
    added: "add",
    adding: "add",
    changing: "change",
    collapses: "collapse",
    choice: "choose",
    choices: "choose",
    chosen: "choose",
    choosing: "choose",
    chose: "choose",
    dms: "dm",
    failed: "fail",
    failure: "fail",
    failures: "fail",
    fails: "fail",
    forced: "force",
    forcing: "force",
    gave: "give",
    given: "give",
    giving: "give",
    held: "hold",
    has: "have",
    holding: "hold",
    increases: "increase",
    increased: "increase",
    increasing: "increase",
    known: "know",
    knowing: "know",
    made: "make",
    makes: "make",
    making: "make",
    moved: "move",
    moving: "move",
    perceives: "perceive",
    provides: "provide",
    recast: "cast",
    recasting: "cast",
    replaced: "replace",
    replacing: "replace",
    releases: "release",
    requires: "require",
    saving: "save",
    saves: "save",
    spoken: "speak",
    speaking: "speak",
    struck: "strike",
    succeeds: "succeed",
    success: "succeed",
    successful: "succeed",
    taken: "take",
    taking: "take",
    temp: "temporary",
    used: "use",
    uses: "use",
    using: "use",
    worn: "wear",
    wearing: "wear",
  };
  if (irregular[word] !== undefined) return irregular[word];
  if (word.endsWith("ied")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.endsWith("ing")) {
    const base = word.slice(0, -3).replace(/(.)\1$/, "$1");
    return /(?:at|gat)$/.test(base) ? `${base}e` : base;
  }
  if (word.endsWith("ed")) {
    const base = word.slice(0, -2).replace(/(.)\1$/, "$1");
    return /(?:at|gat)$/.test(base) ? `${base}e` : base;
  }
  if (/(?:ses|xes|zes|ches|shes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

function containsWordSequence(haystack, needle) {
  if (needle.length === 0 || haystack.length < needle.length) return false;
  for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    if (needle.every((word, index) => haystack[start + index] === word)) {
      return true;
    }
  }
  return false;
}

function containsStemmedWordSequence(haystack, needle) {
  if (needle.length === 0 || haystack.length < needle.length) return false;
  const identityWordForms = (word) =>
    new Set([
      word,
      ...(word.endsWith("s") ? [word.slice(0, -1)] : []),
      ...(word.endsWith("ies") ? [`${word.slice(0, -3)}y`] : []),
    ]);
  const sameIdentityWord = (left, right) => {
    const rightForms = identityWordForms(right);
    return [...identityWordForms(left)].some((form) => rightForms.has(form));
  };
  for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    if (
      needle.every((word, index) =>
        sameIdentityWord(haystack[start + index], word),
      )
    ) {
      return true;
    }
  }
  return false;
}

function sourceIdentityCandidates(value) {
  const raw = String(value).trim();
  const withoutLevelSuffix = raw.replace(/_l\d+$/, "");
  const withoutQualifier = raw.replace(/\s*\([^)]*\)\s*$/, "");
  const candidates = new Set([
    raw,
    raw.replace(/_/g, " "),
    withoutLevelSuffix.replace(/_/g, " "),
    withoutQualifier,
    withoutQualifier.replace(/,\s*\+\d+\s*$/, ""),
  ]);
  for (const candidate of [raw, withoutLevelSuffix]) {
    const prefix = ID_NAMESPACE_PREFIXES.find((namespace) =>
      candidate.startsWith(`${namespace}_`),
    );
    if (prefix !== undefined) {
      const withoutPrefix = candidate.slice(prefix.length + 1);
      candidates.add(withoutPrefix.replace(/_/g, " "));
      if (
        CLASS_NAMES.includes(prefix) &&
        withoutPrefix.startsWith(`${prefix}s_`)
      ) {
        candidates.add(
          withoutPrefix.slice(prefix.length + 2).replace(/_/g, " "),
        );
      }
      if (prefix === "subclass") {
        const className = CLASS_NAMES.find((name) =>
          withoutPrefix.startsWith(`${name}_`),
        );
        if (className !== undefined) {
          candidates.add(
            withoutPrefix.slice(className.length + 1).replace(/_/g, " "),
          );
        }
      }
    }
  }
  return [...candidates].map(sourceWords).filter((words) => words.length > 0);
}

function sourceContainsIdentity(value, source) {
  const haystack = sourceWords(source);
  return sourceIdentityCandidates(value).some((candidate) =>
    containsStemmedWordSequence(haystack, candidate),
  );
}

function sourceContainsAuthoredName(value, source) {
  const raw = String(value).trim();
  const withoutQualifier = raw.replace(/\s*\([^)]*\)\s*$/, "");
  const candidates = new Set([
    raw,
    withoutQualifier,
    withoutQualifier.replace(/,\s*\+\d+\s*$/, ""),
  ]);
  const haystack = sourceWords(source);
  return [...candidates]
    .map(sourceWords)
    .filter((words) => words.length > 0)
    .some((candidate) => containsStemmedWordSequence(haystack, candidate));
}

function sourceContainsCanonicalReference(value, source) {
  const candidate = sourceWords(String(value).replace(/_/g, " "));
  return containsStemmedWordSequence(sourceWords(source), candidate);
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .replace(/_+/g, "_");
}

function idBelongsToName(id, name) {
  const recordId = slug(id);
  const nameSlug = slug(String(name).replace(/\s*\([^)]*\)\s*$/, ""));
  if (recordId === nameSlug || recordId.endsWith(`_${nameSlug}`)) return true;
  const withoutCategory = nameSlug.replace(/_(armor|weapon)$/, "");
  if (
    withoutCategory !== nameSlug &&
    (recordId === withoutCategory || recordId.endsWith(`_${withoutCategory}`))
  ) {
    return true;
  }
  return (
    nameSlug === "ability_score_improvement" &&
    new RegExp(`(?:^|_)${nameSlug}_l(?:[1-9]|1[0-9]|20)$`).test(recordId)
  );
}

function unsupportedSummaryWords(value, source, checkClauseLocal = true) {
  const normalizedValue = normalizeAnchor(value);
  const normalizedSource = normalizeAnchor(source);
  if (
    normalizedValue.length > 0 &&
    normalizedSource.includes(normalizedValue)
  ) {
    return [];
  }
  const valueWords = summaryContentWords(value);
  const sourceStems = new Set(sourceWords(source).map(stemSourceWord));
  return [
    ...valueWords.filter(
      (word) => !summaryWordHasLocalEvidence(word, sourceStems),
    ),
    ...unsupportedSummaryDomainOrder(value, source),
    ...unsupportedSummaryRelations(value, source),
    ...unsupportedTypedSummaryRelations(value, source),
    ...unsupportedNumericSummaryRelations(value, source),
    ...(checkClauseLocal
      ? unsupportedCrossSentenceClauseVocabulary(value, source)
      : []),
    ...unsupportedExactClauseOrder(value, source),
    ...unsupportedOrderedSummaryClauses(value, source),
  ];
}

const SUMMARY_SOURCE_EQUIVALENTS = Object.freeze({
  "1d6": ["d6"],
  ac: ["armor", "class"],
  cr: ["challenge", "rating"],
  ft: ["feet"],
  hp: ["hit", "point"],
  per: ["each"],
});

function summaryWordHasLocalEvidence(word, sourceStems) {
  const stem = stemSourceWord(word);
  if (sourceStems.has(stem)) return true;
  const requiredSourceWords = SUMMARY_SOURCE_EQUIVALENTS[word];
  return (
    requiredSourceWords !== undefined &&
    requiredSourceWords.every((sourceWord) =>
      sourceStems.has(stemSourceWord(sourceWord)),
    )
  );
}

const SUMMARY_COUNTED_DOMAIN_WORDS = new Set([
  "ally",
  "area",
  "attack",
  "aura",
  "condition",
  "creature",
  "damage",
  "object",
  "point",
  "regain",
  "spell",
  "start",
  "target",
  "wall",
  "weapon",
]);

function unsupportedSummaryDomainOrder(value, source) {
  const sourceSentenceWords = summarySentences(source);
  return summarySentences(value).flatMap((candidateWords) => {
    const candidateDomainWords = candidateWords
      .map(stemSourceWord)
      .filter((word) => SUMMARY_COUNTED_DOMAIN_WORDS.has(word));
    if (candidateDomainWords.length < 2) return [];
    const candidateStems = candidateWords.map(stemSourceWord);
    const stronglyMatchingSourceSentences = sourceSentenceWords.filter(
      (sourceWordsForSentence) =>
        longestCommonSubsequenceLength(
          candidateStems,
          sourceWordsForSentence.map(stemSourceWord),
        ) /
          candidateStems.length >=
        SUMMARY_DOMAIN_ORDER_MATCH_RATIO,
    );
    if (stronglyMatchingSourceSentences.length === 0) return [];
    return stronglyMatchingSourceSentences.some((sourceWordsForSentence) => {
      const sourceDomainWords = sourceWordsForSentence
        .map(stemSourceWord)
        .filter((word) => SUMMARY_COUNTED_DOMAIN_WORDS.has(word));
      let sourceCursor = 0;
      return candidateDomainWords.every((word) => {
        const relativeIndex = sourceDomainWords
          .slice(sourceCursor)
          .indexOf(word);
        if (relativeIndex === -1) return false;
        sourceCursor += relativeIndex + 1;
        return true;
      });
    })
      ? []
      : candidateDomainWords;
  });
}

const SUMMARY_GRAMMAR_WORDS = new Set();
const SUMMARY_RELATION_WORDS = new Set([
  "and",
  "or",
  "when",
  "where",
  "whether",
]);

function summaryContentWords(value) {
  return sourceWords(value).filter((word) => !SUMMARY_GRAMMAR_WORDS.has(word));
}

function summarySentences(value) {
  return String(value)
    .split(/[.!?;]+/)
    .map(summaryContentWords)
    .filter((words) => words.length > 0);
}

function summarySourceClauseRecords(value) {
  return String(value)
    .split(/\n+/)
    .flatMap((rawLine) => {
      const line = rawLine.trim();
      if (
        line.length === 0 ||
        /^#{1,6}\s/.test(line) ||
        /^-{3,}$/.test(line) ||
        /^\|(?:\s*:?-+:?\s*\|)+$/.test(line) ||
        (/^\*[^*].*\*$/.test(line) && !/^\*{2,3}/.test(line))
      ) {
        return [];
      }
      const sentences = line
        .replace(/(\*{2,3}[^*\n]+)\.(\*{2,3})/g, "$1:$2")
        .split(/[.!?;]+/)
        .map(summaryContentWords)
        .filter((words) => words.length > 0);
      return [
        ...sentences.map((words) => ({ words, parts: [words] })),
        ...sentences.slice(0, -1).map((sentence, index) => ({
          words: [...sentence, ...sentences[index + 1]],
          parts: [sentence, sentences[index + 1]],
        })),
      ];
    });
}

function summarySourceClauses(value) {
  return summarySourceClauseRecords(value).map((clause) => clause.words);
}

function unsupportedSummaryRelations(value, source) {
  const valueSentences = summarySentences(value);
  const sourceSentenceWords = summarySentences(source);
  return valueSentences.flatMap((words) => {
    const candidateOccurrences = words.flatMap((word, index) =>
      SUMMARY_RELATION_WORDS.has(word)
        ? [
            {
              previous: words[index - 1],
              word,
              next: words[index + 1],
            },
          ]
        : [],
    );
    if (candidateOccurrences.length === 0) return [];
    const candidateStems = words.map(stemSourceWord);
    const stronglyMatchingSourceSentences = sourceSentenceWords.filter(
      (sourceWordsForSentence) =>
        longestCommonSubsequenceLength(
          candidateStems,
          sourceWordsForSentence.map(stemSourceWord),
        ) /
          candidateStems.length >=
        SUMMARY_STRONG_CLAUSE_MATCH_RATIO,
    );
    const sourceSentences =
      stronglyMatchingSourceSentences.length === 0
        ? sourceSentenceWords
        : stronglyMatchingSourceSentences;
    const supported = sourceSentences.some((sourceWordsForSentence) => {
      const sourceOccurrences = sourceWordsForSentence.flatMap((word, index) =>
        SUMMARY_RELATION_WORDS.has(word)
          ? [{ words: sourceWordsForSentence, word, index }]
          : [],
      );
      let sourceCursor = 0;
      for (const candidate of candidateOccurrences) {
        const relativeIndex = sourceOccurrences
          .slice(sourceCursor)
          .findIndex(
            (sourceOccurrence) =>
              sourceOccurrence.word === candidate.word &&
              sourceRelationOccurrenceMatches(sourceOccurrence, candidate),
          );
        if (relativeIndex === -1) return false;
        sourceCursor += relativeIndex + 1;
      }
      return true;
    });
    if (supported) return [];
    if (stronglyMatchingSourceSentences.length > 0) {
      return candidateOccurrences.map(({ word }) => word);
    }
    return candidateOccurrences.flatMap((candidate) =>
      sourceSentenceWords.some((sourceWordsForSentence) =>
        sourceWordsForSentence.some(
          (word, index) =>
            word === candidate.word &&
            sourceRelationOccurrenceMatches(
              { words: sourceWordsForSentence, word, index },
              candidate,
            ),
        ),
      )
        ? []
        : [candidate.word],
    );
  });
}

const SUMMARY_RELATION_SOURCE_WINDOW = 12;
const SUMMARY_TYPED_RELATION_SOURCE_WINDOW = 12;
const SUMMARY_TYPED_RELATION_CANDIDATE_WINDOW = 3;
const SUMMARY_NUMERIC_RELATION_SOURCE_WINDOW = 12;
const SUMMARY_ORDERED_CLAUSE_MINIMUM_RATIO = 0.51;
const SUMMARY_DOMAIN_ORDER_MATCH_RATIO = 0.65;
const SUMMARY_STRONG_CLAUSE_MATCH_RATIO = 0.8;
const SUMMARY_CLAUSE_ORDER_IGNORED_WORDS = new Set(["a", "an", "its", "the"]);
const SUMMARY_LOCAL_CLAUSE_IGNORED_WORDS = new Set([
  ...SUMMARY_CLAUSE_ORDER_IGNORED_WORDS,
  "at",
  "by",
  "for",
  "from",
  "in",
  "it",
  "of",
  "on",
  "that",
  "to",
  "with",
]);
const SUMMARY_NUMERIC_UNIT_WORDS = new Set(
  ["day", "feet", "foot", "hour", "mile", "minute", "round", "second"].map(
    stemSourceWord,
  ),
);
const SUMMARY_NUMERIC_ANCHORS = new Set(
  [
    "ally",
    "attack",
    "bonus",
    "damage",
    "diameter",
    "level",
    "move",
    "movement",
    "radius",
    "regain",
    "slot",
  ].map(stemSourceWord),
);
const SUMMARY_TYPED_MODIFIERS = new Set([
  "charisma",
  "constitution",
  "dexterity",
  "intelligence",
  "strength",
  "wisdom",
  ...DAMAGE_TYPES,
]);
const SUMMARY_TYPED_NOUNS = new Set([
  "attack",
  "check",
  "damage",
  "immunity",
  "resistance",
  "save",
  "saving",
  "throw",
]);

function summaryWordEvidenceAlternatives(word) {
  return [
    [word],
    ...(SUMMARY_SOURCE_EQUIVALENTS[word] === undefined
      ? []
      : [SUMMARY_SOURCE_EQUIVALENTS[word]]),
  ];
}

function candidateEvidenceSequences(words, index = 0, prefix = []) {
  if (index === words.length) return [prefix];
  return summaryWordEvidenceAlternatives(words[index]).flatMap((alternative) =>
    candidateEvidenceSequences(words, index + 1, [...prefix, ...alternative]),
  );
}

function sourceContainsBoundedSummaryWords(
  sourceWordList,
  candidateWords,
  maximumWindow,
) {
  for (const requiredWords of candidateEvidenceSequences(candidateWords)) {
    const required = requiredWords.map(stemSourceWord);
    for (let start = 0; start < sourceWordList.length; start += 1) {
      if (stemSourceWord(sourceWordList[start]) !== required[0]) continue;
      let cursor = start + 1;
      let matched = 1;
      while (
        matched < required.length &&
        cursor < sourceWordList.length &&
        cursor - start <= maximumWindow
      ) {
        if (stemSourceWord(sourceWordList[cursor]) === required[matched]) {
          matched += 1;
        }
        cursor += 1;
      }
      if (matched === required.length) return true;
    }
  }
  return false;
}

function sourceRelationOccurrenceMatches(sourceOccurrence, candidate) {
  const previousMatches =
    candidate.previous === undefined ||
    sourceContainsBoundedSummaryWords(
      sourceOccurrence.words.slice(
        Math.max(0, sourceOccurrence.index - SUMMARY_RELATION_SOURCE_WINDOW),
        sourceOccurrence.index,
      ),
      [candidate.previous],
      SUMMARY_RELATION_SOURCE_WINDOW,
    );
  const nextMatches =
    candidate.next === undefined ||
    sourceContainsBoundedSummaryWords(
      sourceOccurrence.words.slice(
        sourceOccurrence.index + 1,
        sourceOccurrence.index + 1 + SUMMARY_RELATION_SOURCE_WINDOW,
      ),
      [candidate.next],
      SUMMARY_RELATION_SOURCE_WINDOW,
    );
  return previousMatches && nextMatches;
}

function unsupportedTypedSummaryRelations(value, source) {
  const unsupported = [];
  const sourceSentenceWords = summarySentences(source);
  const sentences = summarySentences(value);
  for (const words of sentences) {
    for (let index = 0; index < words.length; index += 1) {
      if (!SUMMARY_TYPED_MODIFIERS.has(words[index])) continue;
      const nounOffset = words
        .slice(index + 1, index + 1 + SUMMARY_TYPED_RELATION_CANDIDATE_WINDOW)
        .findIndex((word) => SUMMARY_TYPED_NOUNS.has(word));
      if (nounOffset === -1) continue;
      const noun = words[index + 1 + nounOffset];
      if (
        !sourceSentenceWords.some((sourceWordsForSentence) =>
          sourceContainsBoundedSummaryWords(
            sourceWordsForSentence,
            [words[index], noun],
            SUMMARY_TYPED_RELATION_SOURCE_WINDOW,
          ),
        )
      ) {
        unsupported.push(noun);
      }
    }
  }
  return unsupported;
}

function isNumericRuleWord(word) {
  return /^(?:\d+(?:d\d+s?)?|d\d+s?)$/.test(word);
}

function canonicalNumericRuleWord(word) {
  const singular = word.endsWith("s") ? word.slice(0, -1) : word;
  return /^d\d+$/.test(singular) ? `1${singular}` : singular;
}

function candidateStructurallySpansSourcePart(candidateWords, sourcePart) {
  const candidateStems = candidateWords
    .filter((word) => !isNumericRuleWord(word))
    .map(stemSourceWord);
  const sourceStems = sourcePart
    .filter((word) => !isNumericRuleWord(word))
    .map(stemSourceWord);
  if (sourceStems.length === 0) return false;
  const shared = longestCommonSubsequenceLength(candidateStems, sourceStems);
  return (
    shared >= Math.min(2, sourceStems.length) &&
    shared / sourceStems.length >= 0.3
  );
}

function unsupportedNumericSummaryRelations(value, source) {
  // Numeric facts retain their source-sentence ownership. Adjacent source
  // sentences may jointly support prose vocabulary, but must never form a
  // synthetic clause from which a candidate can borrow another sentence's
  // number or unit.
  const structuralSourceClauseRecords = summarySourceClauseRecords(source);
  const sourceSentenceWords = structuralSourceClauseRecords
    .filter((clause) => clause.parts.length === 1)
    .map((clause) => clause.words);
  const structuralSourceClauses = structuralSourceClauseRecords.map(
    (clause) => clause.words,
  );
  return summarySentences(value).flatMap((words) => {
    const candidateNumbers = words.flatMap((word, index) =>
      isNumericRuleWord(word)
        ? [
            {
              canonical: canonicalNumericRuleWord(word),
              index,
              sequenceKey: numericSequenceKey(words, index),
              word,
            },
          ]
        : [],
    );
    if (candidateNumbers.length === 0) return [];
    const candidateNonNumericStems = words
      .filter((word) => !isNumericRuleWord(word))
      .map(stemSourceWord);
    const exactVocabularySourceSentences = sourceSentenceWords.filter(
      (sourceWordsForSentence) =>
        sameWordMultiset(
          candidateNonNumericStems,
          sourceWordsForSentence
            .filter((word) => !isNumericRuleWord(word))
            .map(stemSourceWord),
        ),
    );
    const sourceSentencesByStructuralMatch = structuralSourceClauses.map(
      (sourceWordsForSentence) => {
        const sourceNonNumericStems = sourceWordsForSentence
          .filter((word) => !isNumericRuleWord(word))
          .map(stemSourceWord);
        return {
          ratio:
            longestCommonSubsequenceLength(
              candidateNonNumericStems,
              sourceNonNumericStems,
            ) / candidateNonNumericStems.length,
          words: sourceWordsForSentence,
        };
      },
    );
    const strongestStructuralMatch = sourceSentencesByStructuralMatch.reduce(
      (maximum, candidate) => Math.max(maximum, candidate.ratio),
      0,
    );
    const exactSingleSentenceOwners = sourceSentenceWords
      .map((sourceWordsForSentence) => ({
        ratio:
          longestCommonSubsequenceLength(
            candidateNonNumericStems,
            sourceWordsForSentence
              .filter((word) => !isNumericRuleWord(word))
              .map(stemSourceWord),
          ) / candidateNonNumericStems.length,
        words: sourceWordsForSentence,
      }))
      .filter((candidate) => candidate.ratio === 1)
      .map((candidate) => candidate.words);
    const exactPairedOwners =
      exactSingleSentenceOwners.length > 0
        ? []
        : structuralSourceClauseRecords
            .filter(
              (clause) =>
                clause.parts.length === 2 &&
                longestCommonSubsequenceLength(
                  candidateNonNumericStems,
                  clause.words
                    .filter((word) => !isNumericRuleWord(word))
                    .map(stemSourceWord),
                ) === candidateNonNumericStems.length &&
                clause.parts.every((part) =>
                  candidateStructurallySpansSourcePart(words, part),
                ),
            )
            .map((clause) => clause.words);
    const owningSourceSentences = [
      ...exactSingleSentenceOwners,
      ...exactPairedOwners,
    ];
    if (
      owningSourceSentences.length > 0 &&
      !owningSourceSentences.some((sourceWordsForSentence) => {
        const sourceNumbers = sourceWordsForSentence.flatMap((word, index) =>
          isNumericRuleWord(word)
            ? [numericSequenceKey(sourceWordsForSentence, index)]
            : [],
        );
        return sharedNumericSequenceOrderMatches(
          candidateNumbers.map(({ sequenceKey }) => sequenceKey),
          sourceNumbers,
        );
      })
    ) {
      return candidateNumbers.map(({ word }) => word);
    }
    const stronglyMatchingSourceSentences = exactVocabularySourceSentences;
    if (
      stronglyMatchingSourceSentences.length > 0 &&
      !stronglyMatchingSourceSentences.some((sourceWordsForSentence) => {
        const sourceNumbers = sourceWordsForSentence.flatMap((word, index) =>
          isNumericRuleWord(word)
            ? [numericSequenceKey(sourceWordsForSentence, index)]
            : [],
        );
        let sourceCursor = 0;
        return candidateNumbers.every(({ sequenceKey }) => {
          const relativeIndex = sourceNumbers
            .slice(sourceCursor)
            .indexOf(sequenceKey);
          if (relativeIndex === -1) return false;
          sourceCursor += relativeIndex + 1;
          return true;
        });
      })
    ) {
      return candidateNumbers.map(({ word }) => word);
    }
    const bestStructuralSourceSentences =
      strongestStructuralMatch >= SUMMARY_ORDERED_CLAUSE_MINIMUM_RATIO
        ? sourceSentencesByStructuralMatch
            .filter((candidate) => candidate.ratio === strongestStructuralMatch)
            .map((candidate) => candidate.words)
        : [];
    const structurallyDisplacedNumbers = new Set();
    const sourceSequences = bestStructuralSourceSentences
      .map((sourceWordsForSentence) =>
        sourceWordsForSentence.flatMap((word, index) =>
          isNumericRuleWord(word)
            ? [numericSequenceKey(sourceWordsForSentence, index)]
            : [],
        ),
      )
      .filter((sequence) => sequence.length > 0);
    const chargeCostCount = candidateNumbers.filter(
      (candidate) =>
        stemSourceWord(words[candidate.index + 1] ?? "") ===
        stemSourceWord("charge"),
    ).length;
    if (
      words.length > 4 &&
      chargeCostCount === 0 &&
      sourceSequences.length === 0
    ) {
      return candidateNumbers.map(({ word }) => word);
    }
    if (
      words.length > 4 &&
      chargeCostCount < 2 &&
      sourceSequences.length > 0 &&
      !sourceSequences.some((sequence) =>
        sharedNumericSequenceOrderMatches(
          candidateNumbers.map(({ sequenceKey }) => sequenceKey),
          sequence,
        ),
      )
    ) {
      for (const candidate of candidateNumbers) {
        structurallyDisplacedNumbers.add(candidate.index);
      }
    }
    return candidateNumbers.flatMap((candidate) => {
      if (structurallyDisplacedNumbers.has(candidate.index)) {
        return [candidate.word];
      }
      const immediateAssociations = [
        ...(candidate.index === 0
          ? []
          : [[words[candidate.index - 1], candidate.word]]),
        ...(candidate.index === words.length - 1
          ? []
          : [[candidate.word, words[candidate.index + 1]]]),
      ];
      const followingWord = words[candidate.index + 1];
      const chargeRowLabel =
        candidate.index > 0 &&
        followingWord !== undefined &&
        stemSourceWord(followingWord) === stemSourceWord("charge") &&
        !isNumericRuleWord(words[candidate.index - 1])
          ? longestSourceBackedNumericLabel(
              words,
              candidate.index,
              sourceSentenceWords,
            )
          : undefined;
      const chargeRowAssociation =
        candidate.index > 0 &&
        followingWord !== undefined &&
        stemSourceWord(followingWord) === stemSourceWord("charge")
          ? isNumericRuleWord(words[candidate.index - 1])
            ? [words[0], candidate.word]
            : [
                ...(chargeRowLabel ?? [words[candidate.index - 1]]),
                candidate.word,
              ]
          : undefined;
      const chargeRowWindow =
        chargeRowAssociation === undefined
          ? 0
          : isNumericRuleWord(words[candidate.index - 1])
            ? 4
            : chargeRowAssociation.length - 1;
      const unitAssociations =
        followingWord !== undefined &&
        SUMMARY_NUMERIC_UNIT_WORDS.has(stemSourceWord(followingWord))
          ? [
              ...(candidate.index === 0
                ? []
                : [
                    [words[candidate.index - 1], candidate.word, followingWord],
                  ]),
              ...(candidate.index + 2 >= words.length
                ? []
                : [
                    [candidate.word, followingWord, words[candidate.index + 2]],
                  ]),
            ]
          : [];
      const associations = [
        ...words
          .slice(Math.max(0, candidate.index - 6), candidate.index)
          .filter((word) => SUMMARY_NUMERIC_ANCHORS.has(stemSourceWord(word)))
          .map((anchor) => [anchor, candidate.word]),
        ...words
          .slice(candidate.index + 1, candidate.index + 7)
          .filter((word) => SUMMARY_NUMERIC_ANCHORS.has(stemSourceWord(word)))
          .map((anchor) => [candidate.word, anchor]),
      ];
      return sourceSentenceWords.some((sourceWordsForSentence) =>
        sourceWordsForSentence.some(
          (word) =>
            isNumericRuleWord(word) &&
            canonicalNumericRuleWord(word) === candidate.canonical &&
            (chargeRowAssociation === undefined ||
              sourceContainsBoundedSummaryWords(
                sourceWordsForSentence,
                chargeRowAssociation,
                chargeRowWindow,
              )) &&
            (immediateAssociations.length === 0 ||
              immediateAssociations.some((association) =>
                sourceContainsBoundedSummaryWords(
                  sourceWordsForSentence,
                  association,
                  SUMMARY_NUMERIC_RELATION_SOURCE_WINDOW,
                ),
              )) &&
            (unitAssociations.length === 0 ||
              unitAssociations.some((association) =>
                sourceContainsBoundedSummaryWords(
                  sourceWordsForSentence,
                  association,
                  SUMMARY_NUMERIC_RELATION_SOURCE_WINDOW,
                ),
              )) &&
            (chargeRowAssociation !== undefined ||
              associations.every((association) =>
                sourceContainsBoundedSummaryWords(
                  sourceWordsForSentence,
                  association,
                  SUMMARY_NUMERIC_RELATION_SOURCE_WINDOW,
                ),
              )),
        ),
      )
        ? []
        : [candidate.word];
    });
  });
}

function numericSequenceKey(words, index) {
  const canonical = canonicalNumericRuleWord(words[index]);
  const followingStem = stemSourceWord(words[index + 1] ?? "");
  return SUMMARY_NUMERIC_UNIT_WORDS.has(followingStem)
    ? `${canonical}:${followingStem}`
    : canonical;
}

function longestSourceBackedNumericLabel(
  candidateWords,
  numericIndex,
  sourceSentenceWords,
) {
  const maximumLength = Math.min(5, numericIndex);
  for (let length = maximumLength; length >= 1; length -= 1) {
    const label = candidateWords.slice(numericIndex - length, numericIndex);
    if (
      sourceSentenceWords.some((sourceWordsForSentence) =>
        sourceContainsBoundedSummaryWords(
          sourceWordsForSentence,
          label,
          label.length - 1,
        ),
      )
    ) {
      return label;
    }
  }
  return undefined;
}

function sharedNumericSequenceOrderMatches(candidate, source) {
  return sequenceContainsInOrder(source, candidate);
}

function sequenceContainsInOrder(source, candidate) {
  let sourceCursor = 0;
  return candidate.every((word) => {
    const relativeIndex = source.slice(sourceCursor).indexOf(word);
    if (relativeIndex === -1) return false;
    sourceCursor += relativeIndex + 1;
    return true;
  });
}

function unsupportedOrderedSummaryClauses(value, source) {
  const sourceSentenceWords = summarySentences(source);
  return summarySentences(value).flatMap((candidate) => {
    if (candidate.length < 5) return [];
    const candidateStems = candidate.map(stemSourceWord);
    const maximumRatio = sourceSentenceWords.reduce(
      (maximum, sourceSentence) =>
        Math.max(
          maximum,
          longestCommonSubsequenceLength(
            candidateStems,
            sourceSentence.map(stemSourceWord),
          ) / candidateStems.length,
        ),
      0,
    );
    return maximumRatio >= SUMMARY_ORDERED_CLAUSE_MINIMUM_RATIO
      ? []
      : [candidate[0]];
  });
}

function unsupportedExactClauseOrder(value, source) {
  const sourceSentenceWords = summarySentences(source);
  return summarySentences(value).flatMap((candidateWords) => {
    const candidateStems = candidateWords
      .filter((word) => !SUMMARY_CLAUSE_ORDER_IGNORED_WORDS.has(word))
      .map(stemSourceWord);
    const sameVocabularySourceSentences = sourceSentenceWords.filter(
      (sourceWordsForSentence) =>
        sameWordMultiset(
          candidateStems,
          sourceWordsForSentence
            .filter((word) => !SUMMARY_CLAUSE_ORDER_IGNORED_WORDS.has(word))
            .map(stemSourceWord),
        ),
    );
    if (sameVocabularySourceSentences.length === 0) return [];
    return sameVocabularySourceSentences.some(
      (sourceWordsForSentence) =>
        candidateStems.join("\u0000") ===
        sourceWordsForSentence
          .filter((word) => !SUMMARY_CLAUSE_ORDER_IGNORED_WORDS.has(word))
          .map(stemSourceWord)
          .join("\u0000"),
    )
      ? []
      : [candidateStems[0]];
  });
}

function unsupportedCrossSentenceClauseVocabulary(value, source) {
  const clauseEvidenceStem = (word) => {
    const stem = stemSourceWord(word);
    if (stem === "book" || stem === "manual") return "tome";
    if (stem === "determin") return "choose";
    return stem;
  };
  const sourceSentenceWords = summarySourceClauses(source);
  const sourceLabelStems = new Set(
    [
      ...String(source).matchAll(/^#{1,6}\s+(.+)$/gm),
      ...String(source).matchAll(/\*{2,3}([^*\n]+?)\.?\*{2,3}/g),
      ...String(source).matchAll(/^\|(.+)\|$/gm),
    ].flatMap((match) => sourceWords(match[1]).map(clauseEvidenceStem)),
  );
  const clauseDeltas = summarySentences(value).flatMap((candidateWords) => {
    const candidateStems = candidateWords.map(clauseEvidenceStem);
    const matches = sourceSentenceWords
      .map((words, sourceIndex) => {
        const stems = words.map(clauseEvidenceStem);
        return {
          ratio:
            longestCommonSubsequenceLength(candidateStems, stems) /
            candidateStems.length,
          sourceIndex,
          stems,
        };
      })
      .sort((left, right) => right.ratio - left.ratio);
    const strongest = matches[0];
    if (
      strongest === undefined ||
      strongest.ratio < SUMMARY_STRONG_CLAUSE_MATCH_RATIO
    ) {
      return [];
    }
    const meaningful = (word) =>
      !SUMMARY_LOCAL_CLAUSE_IGNORED_WORDS.has(word) && !isNumericRuleWord(word);
    return [
      {
        borrowed: multisetDifference(
          candidateStems.filter(meaningful),
          strongest.stems.filter(meaningful),
        ),
        omitted: multisetDifference(
          strongest.stems.filter(meaningful),
          candidateStems.filter(meaningful),
        ),
        sourceIndex: strongest.sourceIndex,
      },
    ];
  });
  return clauseDeltas.flatMap((delta, index) =>
    delta.borrowed.filter((borrowed) => {
      const oneForOneBorrow =
        delta.borrowed.length === 1 &&
        delta.omitted.length === 1 &&
        sourceSentenceWords.some(
          (words, sourceIndex) =>
            sourceIndex !== delta.sourceIndex &&
            words.map(clauseEvidenceStem).includes(borrowed),
        );
      const reciprocalBorrow = clauseDeltas.some(
        (other, otherIndex) =>
          otherIndex !== index &&
          other.omitted.includes(borrowed) &&
          delta.omitted.some((omitted) => other.borrowed.includes(omitted)),
      );
      return (
        !sourceLabelStems.has(borrowed) && (oneForOneBorrow || reciprocalBorrow)
      );
    }),
  );
}

function multisetDifference(left, right) {
  const remaining = new Map();
  for (const word of right) {
    remaining.set(word, (remaining.get(word) ?? 0) + 1);
  }
  return left.filter((word) => {
    const available = remaining.get(word) ?? 0;
    if (available === 0) return true;
    remaining.set(word, available - 1);
    return false;
  });
}

function sameWordMultiset(left, right) {
  if (left.length !== right.length) return false;
  return [...left].sort().join("\u0000") === [...right].sort().join("\u0000");
}

function longestCommonSubsequenceLength(left, right) {
  let previous = new Uint16Array(right.length + 1);
  for (const leftWord of left) {
    const current = new Uint16Array(right.length + 1);
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] =
        leftWord === right[rightIndex - 1]
          ? previous[rightIndex - 1] + 1
          : Math.max(previous[rightIndex], current[rightIndex - 1]);
    }
    previous = current;
  }
  return previous[right.length];
}

function sourceContainsSummary(value, source, checkClauseLocal = true) {
  const normalizedValue = normalizeAnchor(value);
  const normalizedSource = normalizeAnchor(source);
  if (
    normalizedValue.length > 0 &&
    normalizedSource.includes(normalizedValue)
  ) {
    return true;
  }
  const contentWords = summaryContentWords(value);
  if (contentWords.length === 0) return false;
  if (!checkClauseLocal) {
    const sourceStems = new Set(sourceWords(source).map(stemSourceWord));
    return contentWords.every((word) =>
      summaryWordHasLocalEvidence(word, sourceStems),
    );
  }
  return unsupportedSummaryWords(value, source).length === 0;
}

function sourceContainsExactProse(value, source) {
  const words = sourceWords(value);
  return words.length > 0 && containsWordSequence(sourceWords(source), words);
}

function sourceContainsLabel(value, source) {
  if (sourceContainsIdentity(value, source)) return true;
  const words = summaryContentWords(value);
  const sourceStems = new Set(sourceWords(source).map(stemSourceWord));
  return (
    words.length > 0 &&
    words.filter((word) => sourceStems.has(stemSourceWord(word))).length /
      words.length >
      0.5
  );
}

function sourceContainsDisplayName(value, source) {
  if (sourceContainsIdentity(value, source)) return true;
  const words = sourceWords(value).filter((word) => word.length >= 3);
  const firstWord = words[0];
  const aliases = {
    caster: ["you"],
    chosen: ["choose"],
  };
  const sourceStems = new Set(sourceWords(source).map(stemSourceWord));
  const firstWordOwned =
    firstWord !== undefined &&
    [firstWord, ...(aliases[firstWord] ?? [])].some((word) =>
      sourceStems.has(stemSourceWord(word)),
    );
  return firstWordOwned && sourceContainsLabel(value, source);
}

function headingEvidenceLines(match, index) {
  const headings = index.headingsByFile.get(match.rel) ?? [];
  const rawLines = (index.rawByRel.get(match.rel) ?? "").split("\n");
  const matchIndex = headings.indexOf(match);
  const following = headings
    .slice(matchIndex + 1)
    .find((heading) => heading.level <= match.level);
  const lines = [];
  let ancestorLevel = match.level;
  for (
    let cursor = matchIndex - 1;
    cursor >= 0 && ancestorLevel > 1;
    cursor -= 1
  ) {
    const heading = headings[cursor];
    if (heading.level < ancestorLevel) {
      lines.unshift(heading.line);
      ancestorLevel = heading.level;
    }
  }
  for (
    let line = match.line;
    line < (following?.line ?? rawLines.length + 1);
    line += 1
  ) {
    lines.push(line);
  }
  return lines;
}

function proseEvidenceLines(match, index) {
  const headings = index.headingsByFile.get(match.rel) ?? [];
  const anchors = index.proseAnchorsByFile.get(match.rel) ?? [];
  const rawLines = (index.rawByRel.get(match.rel) ?? "").split("\n");
  const nextHeading = headings.find((heading) => heading.line > match.line);
  const nextAnchor = anchors.find((anchor) => anchor.line > match.line);
  const boundary = match.isList
    ? Math.min(
        nextHeading?.line ?? rawLines.length + 1,
        nextAnchor?.line ?? rawLines.length + 1,
      )
    : (nextHeading?.line ?? rawLines.length + 1);
  const lines = [];
  let ancestorLevel = Number.POSITIVE_INFINITY;
  for (let cursor = headings.length - 1; cursor >= 0; cursor -= 1) {
    const heading = headings[cursor];
    if (heading.line >= match.line || heading.level >= ancestorLevel) continue;
    lines.unshift(heading.line);
    ancestorLevel = heading.level;
  }
  for (let line = match.line; line < boundary; line += 1) lines.push(line);
  return lines;
}

function evidenceForResolution(resolution, index) {
  if (resolution.evidence !== undefined) return resolution.evidence;
  if (resolution.lineRanges !== undefined) {
    const { rel, ranges } = resolution.lineRanges;
    return {
      rel,
      lines: ranges.flatMap(({ first, last }) => {
        const precedingHeading = [...(index.headingsByFile.get(rel) ?? [])]
          .reverse()
          .find((heading) => heading.line < first);
        return [
          ...(precedingHeading === undefined ? [] : [precedingHeading.line]),
          ...Array.from(
            { length: last - first + 1 },
            (_, offset) => first + offset,
          ),
        ];
      }),
    };
  }
  const rel = resolution.canonical.split(/[#:]/, 1)[0];
  if (!index.rawByRel.has(rel)) return { rel, lines: [] };
  const headingName = resolution.canonical.match(/^[^#]+#(.+)$/)?.[1];
  if (headingName !== undefined) {
    const heading = (index.headingsByFile.get(rel) ?? []).find(
      (candidate) => candidate.normalized === normalizeAnchor(headingName),
    );
    return {
      rel,
      lines: heading === undefined ? [] : headingEvidenceLines(heading, index),
    };
  }
  const proseLine = resolution.canonical.match(/^[^:]+:(\d+) \(/)?.[1];
  if (proseLine !== undefined) {
    const anchor = (index.proseAnchorsByFile.get(rel) ?? []).find(
      (candidate) => candidate.line === Number(proseLine),
    );
    return {
      rel,
      lines: anchor === undefined ? [] : proseEvidenceLines(anchor, index),
    };
  }
  return {
    rel,
    lines: Array.from(
      { length: (index.rawByRel.get(rel) ?? "").split("\n").length },
      (_, line) => line + 1,
    ),
  };
}

function sourceTextForResolution(resolution, index) {
  const evidence = evidenceForResolution(resolution, index);
  const rawLines = (index.rawByRel.get(evidence.rel) ?? "").split("\n");
  return evidence.lines
    .map((line) => rawLines[line - 1] ?? "")
    .join("\n")
    .trim();
}

function exactLocatedTextForResolution(resolution, index) {
  if (resolution.status !== "ok-line-range") {
    return {
      tag: "ok",
      text: sourceTextForResolution(resolution, index),
    };
  }

  if (resolution.lineRanges === undefined) {
    return { tag: "invalid-resolution" };
  }
  const { rel, ranges } = resolution.lineRanges;
  const rawLines = (index.rawByRel.get(rel) ?? "").split("\n");
  return {
    tag: "ok",
    text: ranges
      .flatMap(({ first, last }) =>
        Array.from(
          { length: last - first + 1 },
          (_, offset) => rawLines[first + offset - 1],
        ),
      )
      .join("\n")
      .trim(),
  };
}

function excerptResolutionDiagnostics(resolutions) {
  return resolutions.map(({ part, status }) => ({ part, status }));
}

function rulesExcerptForSection(section, index) {
  const resolutions = resolveSection(section, index);
  const invalid = resolutions.filter(
    (resolution) => statusSeverity(resolution.status) !== "ok",
  );
  if (invalid.length > 0) {
    return {
      tag: "invalid-locator",
      resolutions: excerptResolutionDiagnostics(invalid),
    };
  }

  const located = resolutions.map((resolution) =>
    exactLocatedTextForResolution(resolution, index),
  );
  if (located.some((result) => result.tag === "invalid-resolution")) {
    return {
      tag: "invalid-resolution",
      resolutions: excerptResolutionDiagnostics(resolutions),
    };
  }
  if (located.some((result) => result.text.length === 0)) {
    return {
      tag: "empty-excerpt",
      resolutions: excerptResolutionDiagnostics(resolutions),
    };
  }
  const rulesExcerpt = located.map((result) => result.text).join("\n\n");
  return rulesExcerpt.length === 0
    ? {
        tag: "empty-excerpt",
        resolutions: excerptResolutionDiagnostics(resolutions),
      }
    : {
        tag: "ok",
        rulesExcerpt,
      };
}

function freezeResult(value) {
  if (Array.isArray(value)) {
    value.forEach(freezeResult);
  } else if (value !== null && typeof value === "object") {
    Object.values(value).forEach(freezeResult);
  }
  return Object.freeze(value);
}

function observationForRecord(record) {
  const observations = [];
  walkDecodedSurfaceRecord(record, (fieldPath, value, role) => {
    observations.push({
      fieldPath: fieldPath.replace(/^value\./, ""),
      value,
      role,
    });
  });
  return observations;
}

function recordIdentityKey(record) {
  const family = record.kind === "statBlock" ? "statBlock" : "unit";
  return `${family}:${record.id}`;
}

function loadPublishedSurface(workspaceRoot, publication) {
  if (publication !== undefined) return { tag: "loaded", value: publication };
  try {
    return {
      tag: "loaded",
      value: JSON.parse(
        fs.readFileSync(
          path.join(
            workspaceRoot,
            "packages/surface/publication/srd-surface.json",
          ),
          "utf8",
        ),
      ),
    };
  } catch (error) {
    return {
      tag: "unreadable",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

function canonicalProjectionOfPublishedRecord(record) {
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => key !== "rulesExcerpt"),
  );
}

function canonicalRedistributableRecordKeys() {
  return [
    ...srdSurface.units.map((record) => ["unit", record.id]),
    ...srdSurface.statBlocks.map((record) => ["statBlock", record.id]),
  ];
}

function publishedSurfaceMembership(workspaceRoot, records, publication) {
  const issues = [];
  const loaded = loadPublishedSurface(workspaceRoot, publication);
  const unitIds = new Set();
  const statBlockIds = new Set();
  if (loaded.tag === "unreadable") {
    issues.push({
      code: "published-surface-unreadable",
      contentPath: "packages/surface/publication/srd-surface.json",
      message: loaded.message,
    });
    return { unitIds, statBlockIds, issues };
  }

  const decoded = Schema.decodeUnknownResult(PublishedSrdSurfaceSchema, {
    onExcessProperty: "error",
  })(loaded.value);
  if (Result.isFailure(decoded)) {
    issues.push({
      code: "published-surface-invalid",
      contentPath: "packages/surface/publication/srd-surface.json",
      message: decoded.failure.message,
    });
    return { unitIds, statBlockIds, issues };
  }

  const value = decoded.success;
  const canonicalRecords = new Map(
    records.map((record) => [recordIdentityKey(record), record.value]),
  );
  for (const [family, entries, target] of [
    ["unit", value.units, unitIds],
    ["statBlock", value.statBlocks, statBlockIds],
  ]) {
    for (const entry of entries) {
      if (target.has(entry.id)) {
        issues.push({
          code: "duplicate-published-authored-identity",
          contentPath: "packages/surface/publication/srd-surface.json",
          recordId: entry.id,
          message: `Published ${family} identity ${entry.id} is duplicated`,
        });
      }
      target.add(entry.id);
      const canonical = canonicalRecords.get(`${family}:${entry.id}`);
      if (
        canonical !== undefined &&
        !isDeepStrictEqual(
          canonicalProjectionOfPublishedRecord(entry),
          canonical,
        )
      ) {
        issues.push({
          code: "published-record-differs-from-corpus",
          contentPath: "packages/surface/publication/srd-surface.json",
          recordId: entry.id,
          message: `Published ${family} ${entry.id} differs from its canonical Surface record`,
        });
      }
    }
  }

  const corpusKeys = new Set(records.map(recordIdentityKey));
  for (const [family, ids] of [
    ["unit", unitIds],
    ["statBlock", statBlockIds],
  ]) {
    for (const id of ids) {
      if (!corpusKeys.has(`${family}:${id}`)) {
        issues.push({
          code: "published-record-missing-from-corpus",
          contentPath: "packages/surface/publication/srd-surface.json",
          recordId: id,
          message: `Published ${family} ${id} has no canonical Surface record`,
        });
      }
    }
  }

  const canonicalRecordsByIdentity = new Map(
    records.map((record) => [recordIdentityKey(record), record]),
  );
  for (const [family, id] of canonicalRedistributableRecordKeys()) {
    if (unitIds.has(id) && family === "unit") continue;
    if (statBlockIds.has(id) && family === "statBlock") continue;
    const canonical = canonicalRecordsByIdentity.get(`${family}:${id}`);
    issues.push({
      code: "canonical-record-missing-from-publication",
      contentPath:
        canonical?.contentPath ??
        "packages/surface/publication/srd-surface.json",
      recordId: id,
      recordKind: family,
      message: `Canonical ${family} ${id} is missing from the published Surface catalog`,
    });
  }

  return { unitIds, statBlockIds, issues };
}

function createAuditContext(options = {}) {
  const workspaceRoot = options.root ?? root;
  const contextIssues = [];
  const sourceRoot = path.join(workspaceRoot, ".references/srd-5.2.1");
  let index;
  try {
    index = buildReferenceIndex(sourceRoot);
  } catch (error) {
    contextIssues.push({
      code: "srd-source-index-unreadable",
      contentPath: ".references/srd-5.2.1",
      message: error instanceof Error ? error.message : String(error),
    });
    index = {
      sourceRoot,
      fileByRel: new Map(),
      rawByRel: new Map(),
      headingsByFile: new Map(),
      proseAnchorsByFile: new Map(),
    };
  }
  const corpusScan =
    options.records === undefined
      ? scanSurfaceRecords(workspaceRoot)
      : { records: structuredClone(options.records), issues: [] };
  const records = corpusScan.records;
  contextIssues.push(...corpusScan.issues);
  if (records.length === 0) {
    contextIssues.push({
      code: "surface-corpus-empty",
      contentPath: "packages/surface/content",
      message: "The production Surface corpus must contain at least one record",
    });
  }
  try {
    assertSurfaceSchemaStringRoles();
  } catch (error) {
    contextIssues.push({
      code: "schema-role-incomplete",
      contentPath: "packages/surface/src/surface/schema.ts",
      message: error instanceof Error ? error.message : String(error),
    });
  }
  const observationsByRecord = new Map();
  for (const record of records) {
    try {
      observationsByRecord.set(record, observationForRecord(record));
    } catch (error) {
      contextIssues.push({
        code: "surface-traversal-failure",
        contentPath: record.contentPath,
        recordId: record.id,
        message: error instanceof Error ? error.message : String(error),
      });
      observationsByRecord.set(record, []);
    }
  }
  const unitIds = new Set();
  const statBlockIds = new Set();
  const sourceResolutionsByIdentity = new Map();
  const provenanceSectionByIdentity = new Map();
  for (const record of records) {
    (record.kind === "statBlock" ? statBlockIds : unitIds).add(record.id);
    const key = recordIdentityKey(record);
    if (!sourceResolutionsByIdentity.has(key)) {
      provenanceSectionByIdentity.set(
        key,
        record.value.provenance?.section ?? record.section ?? "",
      );
      sourceResolutionsByIdentity.set(
        key,
        resolveSection(
          record.value.provenance?.section ?? record.section ?? "",
          index,
        ),
      );
    }
  }
  const publishedMembership =
    options.records !== undefined && options.publication === undefined
      ? {
          unitIds: new Set(
            records
              .filter((record) => record.kind !== "statBlock")
              .map((record) => record.id),
          ),
          statBlockIds: new Set(
            records
              .filter((record) => record.kind === "statBlock")
              .map((record) => record.id),
          ),
          issues: [],
        }
      : publishedSurfaceMembership(workspaceRoot, records, options.publication);
  contextIssues.push(...publishedMembership.issues);
  const token = Object.freeze({
    kind: "srd521-surface-corpus-audit-context",
  });
  auditContextState.set(token, {
    workspaceRoot,
    index,
    records,
    observationsByRecord,
    unitIds,
    statBlockIds,
    admittedUnitIds: publishedMembership.unitIds,
    admittedStatBlockIds: publishedMembership.statBlockIds,
    sourceResolutionsByIdentity,
    provenanceSectionByIdentity,
    contextIssues,
    publishabilityPolicy: Object.freeze({
      productionProvenance: "srd-5.2.1",
      productionContentPrefix: "packages/surface/content/",
    }),
  });
  return token;
}

function stateForContext(context) {
  const state = auditContextState.get(context);
  if (state === undefined) {
    throw new TypeError("Unknown SRD corpus audit context");
  }
  return state;
}

function issueForRecord(code, record, message, details = {}) {
  return {
    code,
    contentPath: record.contentPath,
    recordId: record.id,
    message,
    ...details,
  };
}

function sourceEvidenceForRecord(state, record, observations) {
  const issues = [];
  const warnings = [];
  const resolutions =
    state.sourceResolutionsByIdentity.get(recordIdentityKey(record)) ?? [];
  const accepted = resolutions.filter(
    (resolution) => statusSeverity(resolution.status) !== "failure",
  );
  for (const resolution of resolutions) {
    const severity = statusSeverity(resolution.status);
    if (severity === "failure") {
      issues.push(
        issueForRecord(
          "unresolved-provenance",
          record,
          `SRD source ${resolution.part} did not resolve (${resolution.status})`,
          { sourcePart: resolution.part, sourceStatus: resolution.status },
        ),
      );
    } else if (severity === "warning") {
      warnings.push({
        code: "noncanonical-provenance",
        contentPath: record.contentPath,
        recordId: record.id,
        message: `${resolution.part} resolves through ${resolution.status}`,
      });
    }
  }
  const sourceParts = accepted.map((resolution) =>
    sourceTextForResolution(resolution, state.index),
  );
  if (sourceParts.some((source) => source.length === 0)) {
    issues.push(
      issueForRecord(
        "empty-source-evidence",
        record,
        "An accepted SRD source resolution produced no evidence text",
      ),
    );
  }
  const source = sourceParts.filter(Boolean).join("\n");
  for (const observation of observations) {
    if (
      observation.role.category === "vocabulary" ||
      observation.role.category === "provenance" ||
      observation.role.category === "projection"
    ) {
      continue;
    }
    if (
      observation.role.category === "reference" ||
      observation.role.category === "dependency"
    ) {
      continue;
    }
    if (observation.role.category === "protocol") {
      continue;
    }
    if (observation.role.category === "identity") {
      let supported;
      if (observation.role.kind === "id" && observation.fieldPath === "id") {
        supported =
          (idBelongsToName(observation.value, record.name) ||
            sourceContainsSummary(observation.value, source, false)) &&
          sourceContainsIdentity(record.name, source);
      } else if (observation.role.kind === "id") {
        supported = sourceContainsLabel(observation.value, source);
      } else if (observation.role.kind === "catalog-reference") {
        supported = sourceContainsAuthoredName(observation.value, source);
      } else if (observation.role.kind === "label") {
        supported = sourceContainsLabel(observation.value, source);
      } else if (observation.role.kind === "displayName") {
        supported = sourceContainsDisplayName(observation.value, source);
      } else {
        supported = sourceContainsIdentity(observation.value, source);
      }
      if (!supported) {
        const unsupportedWords = unsupportedSummaryWords(
          observation.value,
          source,
        );
        issues.push(
          issueForRecord(
            "identity-evidence-missing",
            record,
            `${observation.fieldPath} identity has no exact local SRD evidence`,
            {
              fieldPath: observation.fieldPath,
              value: observation.value,
              unsupportedWords,
            },
          ),
        );
      }
      continue;
    }
    if (
      observation.role.category === "prose" &&
      !(observation.role.evidence === "exact"
        ? sourceContainsExactProse(observation.value, source)
        : sourceContainsSummary(observation.value, source))
    ) {
      const unsupportedWords = unsupportedSummaryWords(
        observation.value,
        source,
      );
      issues.push(
        issueForRecord(
          "prose-evidence-missing",
          record,
          `${observation.fieldPath} prose has no exact local SRD evidence`,
          { fieldPath: observation.fieldPath, unsupportedWords },
        ),
      );
    }
  }
  return { issues, warnings, source };
}

function authoredRelationIssuesForRecord(state, record, observations, source) {
  const issues = [];
  const warnings = [];
  for (const observation of observations) {
    if (
      observation.role.category !== "reference" &&
      observation.role.category !== "dependency"
    ) {
      continue;
    }
    const targetIds =
      observation.role.targetKind === "statBlock"
        ? state.statBlockIds
        : state.unitIds;
    const admittedTargetIds =
      observation.role.targetKind === "statBlock"
        ? state.admittedStatBlockIds
        : state.admittedUnitIds;
    const referringRecordAdmitted = (
      record.kind === "statBlock"
        ? state.admittedStatBlockIds
        : state.admittedUnitIds
    ).has(record.id);
    const locallyVisible = sourceContainsIdentity(observation.value, source);
    if (
      observation.role.category === "dependency" &&
      !referringRecordAdmitted &&
      (locallyVisible ||
        sourceContainsCanonicalReference(observation.value, source))
    ) {
      continue;
    }
    if (
      locallyVisible &&
      (observation.role.category === "reference"
        ? targetIds.has(observation.value)
        : admittedTargetIds.has(observation.value))
    ) {
      continue;
    }
    const details = {
      fieldPath: observation.fieldPath,
      relation: observation.role.relation,
      targetKind: observation.role.targetKind,
      targetRecordId: observation.value,
    };
    if (
      observation.role.category === "reference" &&
      !targetIds.has(observation.value) &&
      sourceContainsCanonicalReference(observation.value, source)
    ) {
      warnings.push({
        code: "source-visible-reference",
        contentPath: record.contentPath,
        recordId: record.id,
        ...details,
        message: `${observation.value} has SRD evidence but no authored Surface record`,
      });
    } else {
      const targetExists = targetIds.has(observation.value);
      const relationKind =
        observation.role.category === "dependency"
          ? "authored-dependency"
          : "authored-reference";
      const targetIsOutsidePublishedSlice =
        targetExists && !admittedTargetIds.has(observation.value);
      issues.push(
        issueForRecord(
          targetIsOutsidePublishedSlice &&
            observation.role.category === "dependency"
            ? "unadmitted-authored-dependency"
            : targetExists
              ? `${relationKind}-evidence-missing`
              : `missing-${relationKind}`,
          record,
          targetIsOutsidePublishedSlice &&
            observation.role.category === "dependency"
            ? `${observation.fieldPath} ${observation.role.relation} requires ${observation.role.targetKind} ${observation.value} outside the published Surface slice`
            : targetExists
              ? `${observation.fieldPath} ${relationKind} has no exact local SRD evidence`
              : `${observation.fieldPath} ${observation.role.relation} requires missing ${observation.role.targetKind} ${observation.value}`,
          details,
        ),
      );
    }
  }
  return { issues, warnings };
}

function auditRecordAgainstState(state, record, observations) {
  const issues = [];
  const warnings = [];
  if (
    !record.contentPath.startsWith(
      state.publishabilityPolicy.productionContentPrefix,
    )
  ) {
    issues.push(
      issueForRecord(
        "nonpublishable-content-path",
        record,
        `Production Surface content must live under ${state.publishabilityPolicy.productionContentPrefix}`,
      ),
    );
  }
  if (
    record.value.provenance?.kind !==
    state.publishabilityPolicy.productionProvenance
  ) {
    issues.push(
      issueForRecord(
        "non-srd-provenance",
        record,
        `Production Surface content has ${String(record.value.provenance?.kind)} provenance`,
      ),
    );
  }
  const sourceEvidence = sourceEvidenceForRecord(state, record, observations);
  const authoredRelations = authoredRelationIssuesForRecord(
    state,
    record,
    observations,
    sourceEvidence.source,
  );
  issues.push(...sourceEvidence.issues, ...authoredRelations.issues);
  warnings.push(...sourceEvidence.warnings, ...authoredRelations.warnings);
  return { issues, warnings };
}

function licensingIssues(state) {
  const requirements = [
    {
      rel: "NOTICE",
      fragments: [
        "System Reference Document 5.2.1",
        "Wizards of the Coast LLC",
        "https://creativecommons.org/licenses/by/4.0/legalcode",
      ],
    },
    {
      rel: ".references/srd-5.2.1/ATTRIBUTION.md",
      fragments: [
        "System Reference Document 5.2.1",
        "Wizards of the Coast LLC",
        "https://creativecommons.org/licenses/by/4.0/legalcode",
      ],
    },
  ];
  return requirements.flatMap(({ rel, fragments }) => {
    const filePath = path.join(state.workspaceRoot, rel);
    if (!fs.existsSync(filePath)) {
      return [
        {
          code: "missing-attribution",
          contentPath: rel,
          message: `${rel} is required for SRD attribution`,
        },
      ];
    }
    let raw;
    try {
      raw = fs.readFileSync(filePath, "utf8");
    } catch (error) {
      return [
        {
          code: "attribution-unreadable",
          contentPath: rel,
          message: error instanceof Error ? error.message : String(error),
        },
      ];
    }
    return fragments
      .filter((fragment) => !raw.includes(fragment))
      .map((fragment) => ({
        code: "incomplete-attribution",
        contentPath: rel,
        message: `${rel} is missing required attribution fragment: ${fragment}`,
      }));
  });
}

function duplicateIdentityIssues(state) {
  const seen = new Map();
  const issues = [];
  for (const record of state.records) {
    const family = record.kind === "statBlock" ? "statBlock" : "unit";
    const key = `${family}:${record.id}`;
    const prior = seen.get(key);
    if (prior !== undefined) {
      issues.push(
        issueForRecord(
          "duplicate-authored-identity",
          record,
          `${family} identity ${record.id} is also declared by ${prior}`,
        ),
      );
    } else {
      seen.set(key, record.contentPath);
    }
  }
  return issues;
}

function finalizeAuditResult(scope, recordsAudited, issues, warnings) {
  const issueCounts = {};
  const warningCounts = {};
  for (const issue of issues) {
    issueCounts[issue.code] = (issueCounts[issue.code] ?? 0) + 1;
  }
  for (const warning of warnings) {
    warningCounts[warning.code] = (warningCounts[warning.code] ?? 0) + 1;
  }
  return freezeResult({
    status: issues.length === 0 ? "accepted" : "rejected",
    scope,
    metrics: {
      recordsAudited,
      issues: issues.length,
      warnings: warnings.length,
      issueCounts,
      warningCounts,
    },
    issues: [...issues].sort((left, right) =>
      `${left.contentPath}:${left.code}:${left.fieldPath ?? ""}`.localeCompare(
        `${right.contentPath}:${right.code}:${right.fieldPath ?? ""}`,
      ),
    ),
    warnings: [...warnings].sort((left, right) =>
      `${left.contentPath}:${left.code}:${left.fieldPath ?? ""}`.localeCompare(
        `${right.contentPath}:${right.code}:${right.fieldPath ?? ""}`,
      ),
    ),
  });
}

function auditCorpus(context) {
  const state = stateForContext(context);
  const issues = [
    ...state.contextIssues,
    ...duplicateIdentityIssues(state),
    ...licensingIssues(state),
  ];
  const warnings = [];
  for (const record of state.records) {
    const result = auditRecordAgainstState(
      state,
      record,
      state.observationsByRecord.get(record) ?? [],
    );
    issues.push(...result.issues);
    warnings.push(...result.warnings);
  }
  return finalizeAuditResult(
    {
      kind: "corpus",
      description:
        "Complete generated SRD 5.2.1 Surface Unit and Stat Block corpus",
    },
    state.records.length,
    issues,
    warnings,
  );
}

function auditRecordDelta(context, record) {
  const state = stateForContext(context);
  const issues = [];
  const objectValue =
    record.value !== null &&
    typeof record.value === "object" &&
    !Array.isArray(record.value)
      ? record.value
      : {};
  const candidate = {
    ...record,
    id: objectValue.id,
    kind: objectValue.kind ?? "unknown",
    name:
      objectValue.name ?? objectValue.statBlock?.displayName ?? objectValue.id,
    section: objectValue.provenance?.section,
  };
  let decodedRecord;
  try {
    decodedRecord = decodeSurfaceRecord(candidate);
  } catch (error) {
    issues.push(
      issueForRecord(
        "surface-decode-failure",
        candidate,
        error instanceof Error ? error.message : String(error),
      ),
    );
    return finalizeAuditResult(
      { kind: "record-delta", recordId: String(candidate.id ?? "unknown") },
      1,
      issues,
      [],
    );
  }
  if (
    !state.sourceResolutionsByIdentity.has(recordIdentityKey(decodedRecord))
  ) {
    issues.push(
      issueForRecord(
        "delta-record-not-in-context",
        decodedRecord,
        "Delta records must belong to the immutable audit context",
      ),
    );
  } else {
    const baselineSection = state.provenanceSectionByIdentity.get(
      recordIdentityKey(decodedRecord),
    );
    if (decodedRecord.value.provenance.section !== baselineSection) {
      issues.push(
        issueForRecord(
          "delta-provenance-mismatch",
          decodedRecord,
          "Delta provenance must match the immutable audit context",
          {
            baselineSection,
            candidateSection: decodedRecord.value.provenance.section,
          },
        ),
      );
    }
  }
  let observations = [];
  try {
    observations = observationForRecord(decodedRecord);
  } catch (error) {
    issues.push(
      issueForRecord(
        "surface-traversal-failure",
        decodedRecord,
        error instanceof Error ? error.message : String(error),
      ),
    );
  }
  const result = auditRecordAgainstState(state, decodedRecord, observations);
  return finalizeAuditResult(
    { kind: "record-delta", recordId: decodedRecord.id },
    1,
    [...issues, ...result.issues],
    result.warnings,
  );
}

function renderJsonReport(result) {
  return `${JSON.stringify(result, null, 2)}\n`;
}

function renderMarkdownReport(result) {
  const cell = (value) =>
    String(value).replaceAll("|", "\\|").replaceAll(/\r?\n/g, " ");
  const table = (entries) => {
    const headings = ["Code", "Content", "Message"];
    const rows =
      entries.length === 0
        ? [["_none_", "_none_", "_none_"]]
        : entries.map((entry) => [
            `\`${cell(entry.code)}\``,
            `\`${cell(entry.contentPath)}\``,
            cell(entry.message),
          ]);
    const widths = headings.map((heading, index) =>
      Math.max(heading.length, ...rows.map((row) => row[index].length)),
    );
    const renderRow = (row) =>
      `| ${row.map((value, index) => value.padEnd(widths[index])).join(" | ")} |`;
    return [
      renderRow(headings),
      renderRow(widths.map((width) => "-".repeat(width))),
      ...rows.map(renderRow),
    ];
  };
  return [
    "# SRD 5.2.1 Surface Authored Corpus Audit",
    "",
    "Generated by `node scripts/srd521-surface-authored-corpus-audit.cjs`.",
    "",
    `Status: ${result.status}`,
    "",
    `- Records audited: ${result.metrics.recordsAudited}`,
    `- Issues: ${result.metrics.issues}`,
    `- Warnings: ${result.metrics.warnings}`,
    "",
    "## Issues",
    "",
    ...table(result.issues),
    "",
    "## Warnings",
    "",
    ...table(result.warnings),
    "",
  ].join("\n");
}

function buildAudit() {
  return auditCorpus(createAuditContext());
}

if (require.main === module) {
  const result = buildAudit();
  fs.mkdirSync(reportDir, { recursive: true });
  fs.writeFileSync(jsonReportPath, renderJsonReport(result));
  fs.writeFileSync(mdReportPath, renderMarkdownReport(result));
  console.log(`Wrote ${jsonReportPath}`);
  console.log(`Wrote ${mdReportPath}`);
  console.log(
    `Surface authored corpus audit: ${result.status}; ${result.metrics.issues} issue(s), ${result.metrics.warnings} warning(s), ${result.metrics.recordsAudited} record(s).`,
  );
  if (result.status === "rejected") process.exitCode = 1;
}

module.exports = {
  assertSurfaceSchemaStringRoles,
  auditCorpus,
  auditRecordDelta,
  buildAudit,
  buildReferenceIndex,
  collectDecodedStringPaths,
  collectAuthoredRelations,
  createAuditContext,
  decodeSurfaceRecord,
  readSurfaceRecords,
  renderJsonReport,
  renderMarkdownReport,
  resolveSection,
  rulesExcerptForSection,
  sourceContainsIdentity,
  sourceTextForResolution,
  unsupportedSummaryWords,
  walkDecodedSurfaceRecord,
  walkSchemaShape,
  walkSurfaceValue,
};
