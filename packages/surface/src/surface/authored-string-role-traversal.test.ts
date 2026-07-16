import * as AST from "effect/SchemaAST";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  StatBlockRecordSchema,
  UnitRecordSchema,
  SURFACE_SCHEMA_ROLE_ANNOTATION,
  readSurfaceSchemaRole,
  surfaceSchemaRole,
  surfaceSchemaRolesEqual,
} from "./schema.ts";
import { AttachmentBaseSchema, SpellRecordSchema } from "./schema-spell.ts";
import {
  FeatureChoiceMechanicsSchema,
  GnomishLineageMechanicsSchema,
  SorcererMetamagicMechanicsSchema,
} from "./schema-nonspell.ts";

const roleOf = (ast: AST.AST) => {
  const role = readSurfaceSchemaRole(ast);
  if (role === undefined) throw new Error("missing Surface schema role");
  return role;
};

const fieldSchema = (schema: { readonly ast: AST.AST }, name: string) => {
  const field = AST.getPropertySignatures(schema.ast).find(
    (candidate) => candidate.name === name,
  );
  if (field === undefined) throw new Error(`missing schema field: ${name}`);
  return field.type;
};

const unionFieldSchema = (schema: { readonly ast: AST.AST }, name: string) => {
  const members = AST.isUnion(schema.ast) ? schema.ast.types : [schema.ast];
  for (const member of members) {
    const field = AST.getPropertySignatures(member).find(
      (candidate) => candidate.name === name,
    );
    if (field !== undefined) return field.type;
  }
  throw new Error(`missing schema field: ${name}`);
};

const isStringAst = (ast: AST.AST): boolean => {
  let current = ast;
  while (AST.isRefinement(current) || AST.isTransformation(current)) {
    current = current.from;
  }
  return (
    current._tag === "StringKeyword" ||
    (current._tag === "Literal" && typeof current.literal === "string")
  );
};

const isStructuralStringLiteral = (ast: AST.AST): boolean => {
  let current = ast;
  while (AST.isRefinement(current) || AST.isTransformation(current)) {
    current = current.from;
  }
  return current._tag === "Literal" && typeof current.literal === "string";
};

const directStringRoles = (ast: AST.AST): Map<string, unknown> => {
  const roles = new Map<string, unknown>();
  if (!AST.isTypeLiteral(ast)) return roles;
  for (const property of ast.propertySignatures) {
    if (!isStringAst(property.type)) continue;
    const role =
      readSurfaceSchemaRole(property.type) ??
      (isStructuralStringLiteral(property.type)
        ? { category: "vocabulary", kind: "literal" }
        : undefined);
    roles.set(String(property.name), role);
  }
  return roles;
};

const directLiteralFields = (ast: AST.AST): Map<string, string> => {
  const literals = new Map<string, string>();
  if (!AST.isTypeLiteral(ast)) return literals;
  for (const property of ast.propertySignatures) {
    let current = property.type;
    while (AST.isRefinement(current) || AST.isTransformation(current)) {
      current = current.from;
    }
    if (current._tag === "Literal" && typeof current.literal === "string") {
      literals.set(String(property.name), current.literal);
    }
  }
  return literals;
};

const branchesCanOverlap = (left: AST.AST, right: AST.AST): boolean => {
  const leftLiterals = directLiteralFields(left);
  const rightLiterals = directLiteralFields(right);
  for (const [name, value] of leftLiterals) {
    if (rightLiterals.has(name) && rightLiterals.get(name) !== value) {
      return false;
    }
  }
  return true;
};

const inspectSchema = (root: AST.AST): string[] => {
  const issues: string[] = [];
  const visited = new Set<AST.AST>();
  const walk = (ast: AST.AST, path: string): void => {
    if (visited.has(ast)) return;
    visited.add(ast);

    if (isStringAst(ast)) {
      const hasAnnotation =
        "annotations" in ast &&
        Object.hasOwn(ast.annotations, SURFACE_SCHEMA_ROLE_ANNOTATION);
      const role = readSurfaceSchemaRole(ast);
      if (role === undefined) {
        if (hasAnnotation) issues.push(`${path}: malformed role`);
        else if (ast._tag !== "Literal") issues.push(`${path}: missing role`);
      }
      return;
    }
    if (AST.isTypeLiteral(ast)) {
      for (const property of ast.propertySignatures) {
        walk(property.type, `${path}.${String(property.name)}`);
      }
      return;
    }
    if (AST.isUnion(ast)) {
      const branchRoles = ast.types.map(directStringRoles);
      for (let left = 0; left < branchRoles.length; left += 1) {
        for (let right = left + 1; right < branchRoles.length; right += 1) {
          if (!branchesCanOverlap(ast.types[left], ast.types[right])) continue;
          for (const [name, role] of branchRoles[left]) {
            const otherRole = branchRoles[right].get(name);
            if (
              otherRole !== undefined &&
              !surfaceSchemaRolesEqual(role, otherRole)
            ) {
              issues.push(`${path}.${name}: conflicting union roles`);
            }
          }
        }
      }
      ast.types.forEach((member, index) => walk(member, `${path}[${index}]`));
      return;
    }
    if (AST.isTupleType(ast)) {
      ast.elements.forEach((element, index) =>
        walk(element.type, `${path}[${index}]`),
      );
      ast.rest.forEach((element) => walk(element.type, `${path}[]`));
      return;
    }
    if (AST.isSuspend(ast)) {
      walk(ast.f(), path);
      return;
    }
    if (AST.isRefinement(ast) || AST.isTransformation(ast)) {
      walk(ast.from, path);
    }
  };
  walk(root, "value");
  return issues;
};

describe("Surface schema roles", () => {
  it("rejects conflicting roles and accepts idempotent annotation", () => {
    const reference = surfaceSchemaRole(Schema.String, {
      category: "reference",
      relation: "spell-reference",
      targetKind: "unit",
    });
    expect(() =>
      surfaceSchemaRole(reference, { category: "identity", kind: "label" }),
    ).toThrow("Conflicting Surface schema roles");
    expect(
      surfaceSchemaRole(reference, {
        targetKind: "unit",
        relation: "spell-reference",
        category: "reference",
      }).ast.annotations[SURFACE_SCHEMA_ROLE_ANNOTATION],
    ).toEqual({
      category: "reference",
      relation: "spell-reference",
      targetKind: "unit",
    });
  });

  it("fails closed for malformed roles, unowned strings, and conflicting unions", () => {
    const malformedRoles = [
      { category: "identity", kind: "label", relation: "spell-reference" },
      { category: "protocol", kind: "holeId", targetKind: "unit" },
      { category: "vocabulary", kind: "literal", relation: "unit-reference" },
      {
        category: "projection",
        kind: "derived-label",
        relation: "unit-reference",
      },
      {
        category: "reference",
        relation: "spell-reference",
        targetKind: "unit",
        kind: "id",
      },
      { category: "not-a-role" },
    ];
    for (const role of malformedRoles) {
      const malformed = Schema.String.annotations({
        [SURFACE_SCHEMA_ROLE_ANNOTATION]: role,
      });
      expect(inspectSchema(malformed.ast)).toEqual(["value: malformed role"]);
    }
    const malformedLiteral = Schema.Literal("fixed").annotations({
      [SURFACE_SCHEMA_ROLE_ANNOTATION]: malformedRoles[0],
    });
    expect(inspectSchema(malformedLiteral.ast)).toEqual([
      "value: malformed role",
    ]);
    expect(inspectSchema(Schema.String.ast)).toEqual(["value: missing role"]);
    const conflicting = Schema.Union(
      Schema.Struct({
        text: surfaceSchemaRole(Schema.String, { category: "prose" }),
      }),
      Schema.Struct({
        text: surfaceSchemaRole(Schema.String, {
          category: "identity",
          kind: "label",
        }),
      }),
    );
    expect(inspectSchema(conflicting.ast)).toContain(
      "value.text: conflicting union roles",
    );
    expect(
      inspectSchema(
        Schema.Union(
          Schema.Literal("structural"),
          surfaceSchemaRole(Schema.String, { category: "prose" }),
        ).ast,
      ),
    ).toEqual([]);
  });

  it("inspects every string position in Unit and Stat Block owners", () => {
    expect(inspectSchema(UnitRecordSchema.ast)).toEqual([]);
    expect(inspectSchema(StatBlockRecordSchema.ast)).toEqual([]);
  });

  it("annotates representative identity fields on Unit and Stat Block owners", () => {
    expect(roleOf(fieldSchema(SpellRecordSchema, "id"))).toEqual({
      category: "identity",
      kind: "id",
    });
    expect(roleOf(fieldSchema(SpellRecordSchema, "name"))).toEqual({
      category: "identity",
      kind: "name",
    });
    expect(roleOf(fieldSchema(StatBlockRecordSchema, "id"))).toEqual({
      category: "identity",
      kind: "id",
    });
    expect(roleOf(fieldSchema(StatBlockRecordSchema, "name"))).toEqual({
      category: "identity",
      kind: "name",
    });
  });

  it("classifies authored attachment descriptions as prose", () => {
    expect(
      roleOf(unionFieldSchema(AttachmentBaseSchema, "description")),
    ).toEqual({
      category: "prose",
    });
  });

  it("annotates fixed choice keys as protocol slots", () => {
    expect(
      roleOf(unionFieldSchema(FeatureChoiceMechanicsSchema, "choiceKey")),
    ).toEqual({ category: "protocol", kind: "choiceKey" });
    expect(
      roleOf(fieldSchema(SorcererMetamagicMechanicsSchema, "choiceKey")),
    ).toEqual({
      category: "protocol",
      kind: "choiceKey",
    });
    expect(
      roleOf(fieldSchema(GnomishLineageMechanicsSchema, "choiceKey")),
    ).toEqual({
      category: "protocol",
      kind: "choiceKey",
    });
  });

  it("detects annotated and structural union conflicts in either order", () => {
    const annotated = Schema.Struct({
      text: surfaceSchemaRole(Schema.String, { category: "prose" }),
    });
    const structural = Schema.Struct({
      text: Schema.Literal("structural"),
    });
    for (const schema of [
      Schema.Union(annotated, structural),
      Schema.Union(structural, annotated),
    ]) {
      expect(inspectSchema(schema.ast)).toContain(
        "value.text: conflicting union roles",
      );
    }
  });
});
