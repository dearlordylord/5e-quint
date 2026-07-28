import { createRequire } from "node:module";
import * as AST from "effect/SchemaAST";
import type { SurfaceSchemaFieldRole } from "./schema-base.ts";
import { Schema } from "effect";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const traversal = require("../../../../scripts/srd521-surface-authored-corpus-audit.cjs");
const {
  EffectAtomSchema,
  ReactionTriggerSchema,
  AttachmentBaseSchema,
  ComponentsSchema,
  CreatureModeSchema,
  CreatureNamedSpecialActionSchema,
  HoleLabelSchema,
  SpellRecordSchema,
} = require("./schema-spell.ts");
const {
  SURFACE_SCHEMA_ROLE_ANNOTATION,
  isSurfaceSchemaRole,
  readSurfaceSchemaRole,
  surfaceSchemaRole,
} = require("./schema-base.ts");
const {
  FeatureChoiceMechanicsSchema,
  GnomishLineageMechanicsSchema,
  SorcererMetamagicMechanicsSchema,
  StartingEquipmentChoiceSchema,
} = require("./schema-nonspell.ts");
const { RulesExcerptSchema, StatBlockRecordSchema } = require("./schema.ts");

const roleOf = (ast: AST.AST) => {
  const role = readSurfaceSchemaRole(ast);
  if (role === undefined) throw new Error("missing Surface schema role");
  return role;
};

const unionMemberRoleOf = (ast: AST.AST) => {
  if (!AST.isUnion(ast)) throw new Error("expected union schema");
  const owned = ast.types.find(
    (member) => readSurfaceSchemaRole(member) !== undefined,
  );
  if (owned === undefined) throw new Error("missing owned union member");
  return roleOf(owned);
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

describe("Surface authored string role traversal", () => {
  it("preserves schema-owned role validation and idempotence", () => {
    const reference = surfaceSchemaRole(Schema.String, {
      category: "dependency",
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
        category: "dependency",
      }).ast.annotations[SURFACE_SCHEMA_ROLE_ANNOTATION],
    ).toEqual({
      category: "dependency",
      relation: "spell-reference",
      targetKind: "unit",
    });
  });

  it("accepts only closed, category-consistent authored relation roles", () => {
    const validRoles = [
      {
        category: "reference",
        relation: "spell-list",
        targetKind: "unit",
      },
      {
        category: "dependency",
        relation: "spell-reference",
        targetKind: "unit",
      },
      {
        category: "reference",
        relation: "recommended-stat-block-reference",
        targetKind: "statBlock",
      },
      {
        category: "dependency",
        relation: "monster-reference",
        targetKind: "statBlock",
      },
    ] as const satisfies ReadonlyArray<SurfaceSchemaFieldRole>;

    fc.assert(
      fc.property(
        fc.constantFrom(...validRoles),
        fc.string(),
        (role, extra) => {
          expect(isSurfaceSchemaRole(role)).toBe(true);
          expect(
            isSurfaceSchemaRole({
              ...role,
              [extra === "" || extra in role ? "contradiction" : extra]: true,
            }),
          ).toBe(false);
        },
      ),
      { numRuns: 25 },
    );

    expect(
      isSurfaceSchemaRole({
        category: "dependency",
        relation: "spell-list",
        targetKind: "unit",
      }),
    ).toBe(false);
    expect(
      isSurfaceSchemaRole({
        category: "reference",
        relation: "monster-reference",
        targetKind: "statBlock",
      }),
    ).toBe(false);
  });

  it("preserves representative identity, prose evidence, protocol, and projection roles", () => {
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
    expect(
      roleOf(unionFieldSchema(AttachmentBaseSchema, "description")),
    ).toEqual({ category: "prose", evidence: "summary" });
    expect(unionMemberRoleOf(unionFieldSchema(ComponentsSchema, "m"))).toEqual({
      category: "prose",
      evidence: "exact",
    });
    expect(
      roleOf(fieldSchema(CreatureNamedSpecialActionSchema, "description")),
    ).toEqual({ category: "prose", evidence: "exact" });
    expect(roleOf(RulesExcerptSchema.ast)).toEqual({
      category: "prose",
      evidence: "exact",
    });
    expect(
      roleOf(unionFieldSchema(StartingEquipmentChoiceSchema, "id")),
    ).toEqual({
      category: "protocol",
      kind: "optionId",
    });
    expect(roleOf(HoleLabelSchema.ast)).toEqual({
      category: "projection",
      kind: "derived-label",
    });
    expect(roleOf(fieldSchema(CreatureModeSchema, "label"))).toEqual({
      category: "projection",
      kind: "derived-label",
    });
    expect(
      roleOf(unionFieldSchema(FeatureChoiceMechanicsSchema, "choiceKey")),
    ).toEqual({ category: "protocol", kind: "choiceKey" });
    expect(
      roleOf(fieldSchema(SorcererMetamagicMechanicsSchema, "choiceKey")),
    ).toEqual({ category: "protocol", kind: "choiceKey" });
    expect(
      roleOf(fieldSchema(GnomishLineageMechanicsSchema, "choiceKey")),
    ).toEqual({ category: "protocol", kind: "choiceKey" });
  });

  it("fails closed when a production schema string is unowned", () => {
    expect(() => traversal.assertSurfaceSchemaStringRoles()).not.toThrow();
  });

  it("traverses primitive reference-array members", () => {
    const references = traversal.collectAuthoredRelations(
      traversal.readSurfaceRecords(),
    );
    expect(
      references.some((reference: { readonly fieldPath: string }) =>
        /\[\d+\]$/.test(reference.fieldPath),
      ),
    ).toBe(true);
    expect(
      references.some(
        (reference: { readonly targetRecordId: string }) =>
          reference.targetRecordId === "find_familiar",
      ),
    ).toBe(true);
    expect(
      references.some(
        (reference: { readonly targetRecordId: string }) =>
          reference.targetRecordId === "sorcerer_font_of_magic",
      ),
    ).toBe(true);
  });

  it("rejects excess string-bearing content at the production decode boundary", () => {
    const record = traversal.readSurfaceRecords()[0];
    expect(() =>
      traversal.decodeSurfaceRecord({
        ...record,
        value: { ...record.value, unexpectedString: "not part of the schema" },
      }),
    ).toThrow();
    expect(() =>
      traversal.decodeSurfaceRecord({
        ...record,
        value: { ...record.value, kind: "malformed-discriminant" },
      }),
    ).toThrow();
  });

  it("walks arbitrarily deep production recursive values iteratively", () => {
    let effect: Record<string, unknown> = {
      kind: "condition_persists_after_full_duration",
      condition: "blinded",
      untilEndedBy: "deep effect leaf",
    };
    for (let index = 0; index < 1024; index += 1) {
      effect = {
        kind: "conditional_by_current_hp",
        threshold: 1,
        comparison: "gt",
        onMatch: effect,
      };
    }
    const effectLeaves: string[] = [];
    traversal.walkSurfaceValue(
      EffectAtomSchema,
      effect,
      (_path: string, value: string, role: { readonly category: string }) => {
        if (role.category === "prose") effectLeaves.push(value);
      },
    );
    expect(effectLeaves).toEqual(["deep effect leaf"]);

    let trigger: Record<string, unknown> = {
      kind: "targeted_by_named_spell",
      spellId: "find_familiar",
    };
    for (let index = 0; index < 1024; index += 1) {
      trigger = { kind: "any_of", triggers: [trigger] };
    }
    const triggerReferences: string[] = [];
    traversal.walkSurfaceValue(
      ReactionTriggerSchema,
      trigger,
      (_path: string, value: string, role: { readonly category: string }) => {
        if (role.category === "reference") triggerReferences.push(value);
      },
    );
    expect(triggerReferences).toEqual(["find_familiar"]);
  });

  it("keeps production audit traversal finite over the full corpus", () => {
    const audit = traversal.buildAudit();
    const records = traversal.readSurfaceRecords();
    expect(audit.metrics.recordsAudited).toBe(records.length);
    expect(traversal.collectAuthoredRelations(records).length).toBeGreaterThan(
      0,
    );
  }, 15_000);

  it("does not traverse an incompatible tagged branch", () => {
    const schema = Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("tagged"),
        text: surfaceSchemaRole(Schema.String, {
          category: "prose",
          evidence: "summary",
        }),
      }),
      Schema.Struct({
        kind: Schema.Literal("tagged"),
        text: Schema.Number,
      }),
    );
    const roles: string[] = [];
    traversal.walkSurfaceValue(
      schema,
      { kind: "tagged", text: "decoded by prose branch" },
      (_path: string, _value: string, role: { readonly category: string }) => {
        roles.push(role.category);
      },
    );
    expect(roles).toEqual(["vocabulary", "prose"]);
  });

  it("uses tuple shape and element compatibility for union reachability", () => {
    const roles: string[] = [];
    traversal.walkSurfaceValue(
      Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("same"),
          items: Schema.Tuple(
            surfaceSchemaRole(Schema.String, {
              category: "prose",
              evidence: "summary",
            }),
          ),
        }),
        Schema.Struct({
          kind: Schema.Literal("same"),
          items: Schema.Tuple(
            surfaceSchemaRole(Schema.String, {
              category: "identity",
              kind: "label",
            }),
            Schema.Number,
          ),
        }),
      ),
      { kind: "same", items: ["valid"] },
      (path: string, _value: string, role: { readonly category: string }) => {
        roles.push(`${path}:${role.category}`);
      },
    );
    expect(roles).toEqual(["value.kind:vocabulary", "value.items[0]:prose"]);
  });

  it("matches union branches to the decoder's excess-property rules", () => {
    const schema = Schema.Union(
      Schema.Struct({
        text: surfaceSchemaRole(Schema.String, {
          category: "prose",
          evidence: "summary",
        }),
      }),
      Schema.Struct({
        text: surfaceSchemaRole(Schema.String, {
          category: "identity",
          kind: "label",
        }),
        extra: Schema.Number,
      }),
    );
    const roles: string[] = [];
    traversal.walkSurfaceValue(
      schema,
      { text: "x", extra: 1 },
      (_path: string, _value: string, role: { readonly category: string }) => {
        roles.push(role.category);
      },
    );
    expect(roles).toEqual(["identity"]);
  });

  it("matches refinement-sensitive union reachability", () => {
    const schema = Schema.Union(
      Schema.Struct({
        text: surfaceSchemaRole(Schema.String.pipe(Schema.minLength(2)), {
          category: "prose",
          evidence: "summary",
        }),
      }),
      Schema.Struct({
        text: surfaceSchemaRole(Schema.String, {
          category: "identity",
          kind: "label",
        }),
      }),
    );
    const roles: string[] = [];
    traversal.walkSurfaceValue(
      schema,
      { text: "x" },
      (_path: string, _value: string, role: { readonly category: string }) => {
        roles.push(role.category);
      },
    );
    expect(roles).toEqual(["identity"]);
  });

  it("keeps a discriminator-compatible suspended branch reachable", () => {
    const suspendedBranch = Schema.suspend(() =>
      Schema.Struct({
        kind: Schema.Literal("a"),
        text: surfaceSchemaRole(Schema.String, {
          category: "prose",
          evidence: "summary",
        }),
      }),
    );
    const schema = Schema.Union(
      suspendedBranch,
      Schema.Struct({
        kind: Schema.Literal("b"),
        text: surfaceSchemaRole(Schema.String, {
          category: "identity",
          kind: "label",
        }),
      }),
    );
    const roles: string[] = [];
    traversal.walkSurfaceValue(
      schema,
      { kind: "a", text: "ok" },
      (_path: string, _value: string, role: { readonly category: string }) => {
        roles.push(role.category);
      },
    );
    expect(roles).toEqual(["vocabulary", "prose"]);
  });

  it("keeps suspended tagged branches with matching untagged branches", () => {
    const suspendedBranch = Schema.suspend(() =>
      Schema.Struct({
        kind: Schema.Literal("a"),
        text: surfaceSchemaRole(Schema.String, {
          category: "prose",
          evidence: "summary",
        }),
      }),
    );
    const schema = Schema.Union(
      suspendedBranch,
      Schema.Struct({
        kind: surfaceSchemaRole(Schema.String, {
          category: "vocabulary",
          kind: "literal",
        }),
        text: surfaceSchemaRole(Schema.String, {
          category: "identity",
          kind: "label",
        }),
      }),
    );
    expect(() =>
      traversal.walkSurfaceValue(
        schema,
        { kind: "a", text: "ambiguous" },
        () => {},
      ),
    ).toThrow("incompatible union roles");
  });

  it("excludes suspended branches that fail nested decoder compatibility", () => {
    const nestedRequired = Schema.suspend(() =>
      Schema.Struct({
        text: surfaceSchemaRole(Schema.String, {
          category: "prose",
          evidence: "summary",
        }),
        required: Schema.Number,
      }),
    );
    const schema = Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("same"),
        nested: nestedRequired,
      }),
      Schema.Struct({
        kind: Schema.Literal("same"),
        nested: Schema.Struct({
          text: surfaceSchemaRole(Schema.String, {
            category: "identity",
            kind: "label",
          }),
        }),
      }),
    );
    const roles: string[] = [];
    traversal.walkSurfaceValue(
      schema,
      { kind: "same", nested: { text: "x" } },
      (_path: string, _value: string, role: { readonly category: string }) => {
        roles.push(role.category);
      },
    );
    expect(roles).toEqual(["vocabulary", "identity"]);
  });

  it("keeps recursive competing branches decoder-compatible", () => {
    const proseRecursive: Schema.Schema.Any = Schema.suspend(() =>
      Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("leaf"),
          text: surfaceSchemaRole(Schema.String, {
            category: "prose",
            evidence: "summary",
          }),
        }),
        Schema.Struct({
          kind: Schema.Literal("next"),
          next: proseRecursive,
        }),
      ),
    );
    const identityRecursive: Schema.Schema.Any = Schema.suspend(() =>
      Schema.Union(
        Schema.Struct({
          kind: Schema.Literal("leaf"),
          text: surfaceSchemaRole(Schema.String, {
            category: "identity",
            kind: "label",
          }),
          required: Schema.Number,
        }),
        Schema.Struct({
          kind: Schema.Literal("next"),
          next: identityRecursive,
        }),
      ),
    );
    let value: { kind: "next"; next: unknown } = {
      kind: "next",
      next: { kind: "leaf", text: "x" },
    };
    for (let index = 0; index < 300; index += 1) {
      value = { kind: "next", next: value };
    }
    const roles: string[] = [];
    traversal.walkSurfaceValue(
      Schema.Union(proseRecursive, identityRecursive),
      value,
      (_path: string, _value: string, role: { readonly category: string }) => {
        roles.push(role.category);
      },
    );
    expect(roles.at(-1)).toBe("prose");
    expect(roles.filter((role) => role === "vocabulary")).toHaveLength(302);
  });

  it("traverses decoded transformation outputs", () => {
    const text = surfaceSchemaRole(Schema.String, {
      category: "prose",
      evidence: "summary",
    });
    const schema = Schema.transform(text, Schema.Struct({ text }), {
      strict: true,
      decode: (value) => ({ text: value }),
      encode: (value) => value.text,
    });
    const roles: string[] = [];
    traversal.walkSurfaceValue(
      schema,
      { text: "decoded" },
      (path: string, _value: string, role: { readonly category: string }) => {
        roles.push(`${path}:${role.category}`);
      },
    );
    expect(roles).toEqual(["value.text:prose"]);
  });

  it("rejects an unowned decoded transformation output", () => {
    const schema = Schema.transform(
      surfaceSchemaRole(Schema.String, {
        category: "prose",
        evidence: "summary",
      }),
      Schema.Struct({ text: Schema.String }),
      {
        strict: true,
        decode: (value: unknown) => ({ text: String(value) }),
        encode: (value) => value.text,
      },
    );
    expect(() =>
      traversal.walkSchemaShape(schema.ast, "Synthetic", () => {}),
    ).toThrow(/no role/);
  });

  it("selects competing transformation unions by decoded shape", () => {
    const source = Schema.String;
    const branch = (kind: "a" | "b", role: SurfaceSchemaFieldRole) =>
      Schema.transform(
        source,
        Schema.Struct({
          kind: Schema.Literal(kind),
          text: surfaceSchemaRole(Schema.String, role),
        }),
        {
          strict: true,
          decode: (value) => ({ kind, text: value }),
          encode: (value) => String(value.text),
        },
      );
    const roles: string[] = [];
    traversal.walkSurfaceValue(
      Schema.Union(
        branch("a", { category: "prose", evidence: "summary" }),
        branch("b", { category: "identity", kind: "label" }),
      ),
      { kind: "a", text: "decoded" },
      (_path: string, _value: string, role: { readonly category: string }) => {
        roles.push(role.category);
      },
    );
    expect(roles).toEqual(["vocabulary", "prose"]);
  });

  it("keeps variadic and trailing tuple roles in lockstep", () => {
    for (let fixedCount = 0; fixedCount <= 2; fixedCount += 1) {
      for (let postRestCount = 0; postRestCount <= 2; postRestCount += 1) {
        for (let repeatedCount = 0; repeatedCount <= 3; repeatedCount += 1) {
          const fixed = Array.from({ length: fixedCount }, () =>
            surfaceSchemaRole(Schema.String, {
              category: "prose",
              evidence: "summary",
            }),
          );
          const rest =
            repeatedCount > 0 || postRestCount > 0
              ? [
                  surfaceSchemaRole(Schema.String, {
                    category: "reference",
                    relation: "unit-reference",
                    targetKind: "unit",
                  }),
                  ...Array.from({ length: postRestCount }, () =>
                    surfaceSchemaRole(Schema.String, {
                      category: "identity",
                      kind: "label",
                    }),
                  ),
                ]
              : [];
          const schema = Schema.Tuple(fixed, ...rest);
          const value = [
            ...Array.from({ length: fixedCount }, () => "fixed"),
            ...Array.from({ length: repeatedCount }, () => "repeated"),
            ...Array.from({ length: postRestCount }, () => "tail"),
          ];
          const roles: string[] = [];
          traversal.walkSurfaceValue(
            schema,
            value,
            (
              path: string,
              _value: string,
              role: { readonly category: string },
            ) => {
              roles.push(`${path}:${role.category}`);
            },
          );
          expect(roles).toEqual([
            ...Array.from(
              { length: fixedCount },
              (_, index) => `value[${index}]:prose`,
            ),
            ...Array.from(
              { length: repeatedCount },
              (_, index) => `value[${fixedCount + index}]:reference`,
            ),
            ...Array.from(
              { length: postRestCount },
              (_, index) =>
                `value[${fixedCount + repeatedCount + index}]:identity`,
            ),
          ]);
        }
      }
    }
  });

  it("rejects overlapping tagged branches with conflicting roles", () => {
    const schema = Schema.Union(
      Schema.Struct({
        kind: Schema.Literal("same"),
        text: surfaceSchemaRole(Schema.String, {
          category: "prose",
          evidence: "summary",
        }),
      }),
      Schema.Struct({
        kind: Schema.Literal("same"),
        text: surfaceSchemaRole(Schema.String, {
          category: "identity",
          kind: "label",
        }),
      }),
    );
    expect(() =>
      traversal.walkSurfaceValue(
        schema,
        { kind: "same", text: "ambiguous" },
        () => {},
      ),
    ).toThrow();
  });

  it("rejects tagged and unrestricted branches with conflicting roles", () => {
    const tagged = Schema.Struct({
      kind: Schema.Literal("same"),
      text: surfaceSchemaRole(Schema.String, {
        category: "prose",
        evidence: "summary",
      }),
    });
    const unrestricted = Schema.Struct({
      kind: Schema.String,
      text: surfaceSchemaRole(Schema.String, {
        category: "identity",
        kind: "label",
      }),
    });
    expect(() =>
      traversal.walkSurfaceValue(
        Schema.Union(tagged, unrestricted),
        { kind: "same", text: "ambiguous" },
        () => {},
      ),
    ).toThrow();
  });

  it("resolves literal/unrestricted overlap to one role regardless of order", () => {
    for (const schema of [
      Schema.Union(
        surfaceSchemaRole(Schema.String, {
          category: "prose",
          evidence: "summary",
        }),
        Schema.Literal("same"),
      ),
      Schema.Union(
        Schema.Literal("same"),
        surfaceSchemaRole(Schema.String, {
          category: "prose",
          evidence: "summary",
        }),
      ),
    ]) {
      const roles: string[] = [];
      traversal.walkSurfaceValue(
        schema,
        "same",
        (
          _path: string,
          _value: string,
          role: { readonly category: string },
        ) => {
          roles.push(role.category);
        },
      );
      expect(roles).toEqual(["prose"]);
    }
  });

  it("traverses every decoded Surface string path", () => {
    for (const record of traversal.readSurfaceRecords()) {
      const decodedPaths = traversal.collectDecodedStringPaths(record.value);
      const traversedPaths = new Set<string>();
      traversal.walkDecodedSurfaceRecord(record, (path: string) =>
        traversedPaths.add(path),
      );
      expect(
        [...decodedPaths].filter((path) => !traversedPaths.has(path)),
      ).toEqual([]);
    }
  });
});
