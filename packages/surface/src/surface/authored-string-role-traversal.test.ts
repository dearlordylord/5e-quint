import { createRequire } from "node:module";
import * as AST from "effect/SchemaAST";
import {
  surfaceSchemaRole,
  type SurfaceSchemaFieldRole,
} from "./schema-base.ts";
import { Schema, SchemaGetter } from "effect";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { walkSurfaceSchemaValue } from "./surface-relations-internal.ts";

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
  if (!AST.isObjects(schema.ast)) throw new Error("expected object schema");
  const field = schema.ast.propertySignatures.find(
    (candidate) => candidate.name === name,
  );
  if (field === undefined) throw new Error(`missing schema field: ${name}`);
  return field.type;
};

const unionFieldSchema = (schema: { readonly ast: AST.AST }, name: string) => {
  const members = AST.isUnion(schema.ast) ? schema.ast.types : [schema.ast];
  for (const member of members) {
    if (!AST.isObjects(member)) continue;
    const field = member.propertySignatures.find(
      (candidate) => candidate.name === name,
    );
    if (field !== undefined) return field.type;
  }
  throw new Error(`missing schema field: ${name}`);
};

const inspectSurfaceSchemaValue = <A>(schema: Schema.Schema<A>, value: A) => {
  const visits: Array<{
    readonly path: string;
    readonly value: unknown;
    readonly role: SurfaceSchemaFieldRole;
  }> = [];
  const issues = walkSurfaceSchemaValue(schema, value, (path, current, role) =>
    visits.push({ path, value: current, role }),
  );
  return { issues, visits };
};

const unionTypes = (schema: Schema.Schema<unknown>): readonly AST.AST[] => {
  if (!AST.isUnion(schema.ast)) throw new Error("expected union schema");
  return schema.ast.types;
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
      }).ast.annotations?.[SURFACE_SCHEMA_ROLE_ANNOTATION],
    ).toEqual({
      category: "dependency",
      relation: "spell-reference",
      targetKind: "unit",
    });
  });

  it("resolves roles attached to checked string annotations", () => {
    const checked = surfaceSchemaRole(
      Schema.String.pipe(Schema.check(Schema.isMinLength(2))),
      { category: "prose", evidence: "summary" },
    );
    expect(checked.ast.annotations?.[SURFACE_SCHEMA_ROLE_ANNOTATION]).toBe(
      undefined,
    );
    expect(
      AST.resolveAt<unknown>(SURFACE_SCHEMA_ROLE_ANNOTATION)(checked.ast),
    ).toEqual({ category: "prose", evidence: "summary" });

    const roles: string[] = [];
    traversal.walkSurfaceValue(
      Schema.Struct({ text: checked }),
      { text: "checked" },
      (_path: string, _value: string, role: { readonly category: string }) => {
        roles.push(role.category);
      },
    );
    expect(roles).toEqual(["prose"]);
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
    const referenceArray = Schema.Array(
      surfaceSchemaRole(Schema.String, {
        category: "reference",
        relation: "spell-list",
        targetKind: "unit",
      }),
    );
    const references: Array<{
      readonly fieldPath: string;
      readonly targetRecordId: string;
    }> = [];

    traversal.walkSurfaceValue(
      referenceArray,
      ["synthetic_spell_alpha", "synthetic_spell_beta"],
      (
        fieldPath: string,
        targetRecordId: string,
        role: SurfaceSchemaFieldRole,
      ) => {
        if (role.category === "reference") {
          references.push({ fieldPath, targetRecordId });
        }
      },
    );

    expect(references).toEqual([
      {
        fieldPath: "value[0]",
        targetRecordId: "synthetic_spell_alpha",
      },
      {
        fieldPath: "value[1]",
        targetRecordId: "synthetic_spell_beta",
      },
    ]);

    const productionTraversal = inspectSurfaceSchemaValue(referenceArray, [
      "synthetic_spell_alpha",
      "synthetic_spell_beta",
    ]);
    expect(productionTraversal.issues).toEqual([]);
    expect(
      productionTraversal.visits.map(({ path, value, role }) => ({
        path,
        value,
        category: role.category,
      })),
    ).toEqual([
      {
        path: "value[0]",
        value: "synthetic_spell_alpha",
        category: "reference",
      },
      {
        path: "value[1]",
        value: "synthetic_spell_beta",
        category: "reference",
      },
    ]);
  });

  it("rejects excess string-bearing content at the production decode boundary", () => {
    const record = traversal.readSurfaceRecords()[0];
    expect(() =>
      traversal.decodeSurfaceRecord({
        ...record,
        value: { ...record.value, unexpectedString: "not part of the schema" },
      }),
    ).toThrow(
      /Surface record failed schema decoding at .*: Expected no excess property[\s\S]*\["unexpectedString"\]/,
    );
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

  it("reports schema traversal contract violations as typed issues", () => {
    const unowned = inspectSurfaceSchemaValue(Schema.String, "unowned");
    const conflicting = inspectSurfaceSchemaValue(
      Schema.Struct({
        target: surfaceSchemaRole(Schema.String, {
          category: "reference",
          relation: "unit-reference",
          targetKind: "unit",
        }),
      }).annotate({
        [SURFACE_SCHEMA_ROLE_ANNOTATION]: {
          category: "prose",
          evidence: "summary",
        },
      }),
      { target: "synthetic_unit" },
    );
    const unsupported = inspectSurfaceSchemaValue(
      Schema.instanceOf(Date),
      new Date(0),
    );

    expect(unowned.issues).toEqual([
      expect.objectContaining({ code: "unownedString", path: "value" }),
    ]);
    expect(conflicting.issues).toEqual([
      expect.objectContaining({
        code: "conflictingRole",
        path: "value.target",
      }),
    ]);
    expect(unsupported.issues).toEqual([
      expect.objectContaining({ code: "unsupportedSchemaAst", path: "value" }),
    ]);
  });

  it("selects primitive, object, and tuple union branches by decoded shape", () => {
    const primitive = Schema.Union([
      surfaceSchemaRole(Schema.String, {
        category: "identity",
        kind: "label",
      }),
      Schema.Number,
      Schema.Boolean,
    ]);
    expect(inspectSurfaceSchemaValue(primitive, "label").visits).toHaveLength(
      1,
    );
    expect(inspectSurfaceSchemaValue(primitive, 1).visits).toEqual([]);
    expect(inspectSurfaceSchemaValue(primitive, true).visits).toEqual([]);
    expect(
      inspectSurfaceSchemaValue(
        Schema.Union([Schema.Unknown, Schema.Literal("literal")]),
        null,
      ),
    ).toEqual({ issues: [], visits: [] });

    const objectOrString = Schema.Union([
      Schema.Struct({ required: Schema.Number }),
      surfaceSchemaRole(Schema.String, {
        category: "prose",
        evidence: "summary",
      }),
    ]);
    expect(
      inspectSurfaceSchemaValue(objectOrString, "decoded string").visits[0],
    ).toMatchObject({ path: "value", value: "decoded string" });

    const tupleOrString = Schema.Union([
      Schema.Tuple([
        surfaceSchemaRole(Schema.String, {
          category: "prose",
          evidence: "summary",
        }),
      ]),
      surfaceSchemaRole(Schema.String, {
        category: "identity",
        kind: "label",
      }),
    ]);
    expect(
      inspectSurfaceSchemaValue(tupleOrString, "decoded scalar").visits,
    ).toEqual([
      expect.objectContaining({ path: "value", value: "decoded scalar" }),
    ]);
  });

  it("visits a shared decoded object once for the same schema and role", () => {
    const schema = Schema.Array(
      Schema.Struct({
        label: surfaceSchemaRole(Schema.String, {
          category: "identity",
          kind: "label",
        }),
      }),
    );
    const shared = { label: "shared label" };
    const result = inspectSurfaceSchemaValue(schema, [shared, shared]);

    expect(result.issues).toEqual([]);
    expect(result.visits).toEqual([
      expect.objectContaining({
        path: "value[0].label",
        value: "shared label",
      }),
    ]);
  });

  it("traverses refinement, transformation, and suspension output shapes", () => {
    const refined = surfaceSchemaRole(
      Schema.String.check(Schema.isMinLength(1)),
      {
        category: "prose",
        evidence: "summary",
      },
    );
    const transformedText = surfaceSchemaRole(Schema.String, {
      category: "prose",
      evidence: "summary",
    });
    const transformed = transformedText.pipe(
      Schema.decodeTo(Schema.Struct({ text: transformedText }), {
        decode: SchemaGetter.transform<{ readonly text: string }, string>(
          (value) => ({ text: value }),
        ),
        encode: SchemaGetter.transform<string, { readonly text: string }>(
          (value) => value.text,
        ),
      }),
    );
    const suspended = Schema.suspend(() =>
      Schema.Struct({
        text: surfaceSchemaRole(Schema.String, {
          category: "identity",
          kind: "label",
        }),
      }),
    );

    expect(inspectSurfaceSchemaValue(refined, "refined").visits).toEqual([
      expect.objectContaining({ path: "value", value: "refined" }),
    ]);
    expect(
      inspectSurfaceSchemaValue(transformed, { text: "decoded" }).visits,
    ).toEqual([
      expect.objectContaining({ path: "value.text", value: "decoded" }),
    ]);
    expect(
      inspectSurfaceSchemaValue(suspended, { text: "suspended" }).visits,
    ).toEqual([
      expect.objectContaining({ path: "value.text", value: "suspended" }),
    ]);
  });

  it("does not traverse an incompatible tagged branch", () => {
    const schema = Schema.Union([
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
    ]);
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

  it("selects a sole decoded literal branch exactly like decoder compatibility", () => {
    const schema = Schema.Union([
      Schema.Struct({
        kind: Schema.Literal("alpha"),
        text: surfaceSchemaRole(Schema.String, {
          category: "prose",
          evidence: "summary",
        }),
      }),
      Schema.Struct({
        kind: Schema.Literal("beta"),
        text: surfaceSchemaRole(Schema.String, {
          category: "identity",
          kind: "label",
        }),
      }),
      Schema.Struct({
        kind: Schema.Literal("gamma"),
        text: surfaceSchemaRole(Schema.String, {
          category: "protocol",
          kind: "choiceKey",
        }),
      }),
    ]);
    const types = unionTypes(schema);

    fc.assert(
      fc.property(
        fc.constantFrom("alpha", "beta", "gamma"),
        fc.string(),
        (kind, text) => {
          const value = { kind, text };
          expect(traversal.matchingUnionBranches(types, value)).toEqual(
            traversal.decoderCompatibleUnionBranches(types, value),
          );
        },
      ),
      { numRuns: 50 },
    );

    const sharedDiscriminator = Schema.Union([
      Schema.Struct({
        kind: Schema.Literal("shared"),
        alpha: Schema.Number,
        text: surfaceSchemaRole(Schema.String, {
          category: "prose",
          evidence: "summary",
        }),
      }),
      Schema.Struct({
        kind: Schema.Literal("shared"),
        beta: Schema.Boolean,
        text: surfaceSchemaRole(Schema.String, {
          category: "identity",
          kind: "label",
        }),
      }),
    ]);
    const sharedTypes = unionTypes(sharedDiscriminator);
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({
            kind: fc.constant("shared"),
            alpha: fc.integer(),
            text: fc.string(),
          }),
          fc.record({
            kind: fc.constant("shared"),
            beta: fc.boolean(),
            text: fc.string(),
          }),
        ),
        (value) => {
          expect(traversal.matchingUnionBranches(sharedTypes, value)).toEqual(
            traversal.decoderCompatibleUnionBranches(sharedTypes, value),
          );
        },
      ),
      { numRuns: 50 },
    );
  });

  it("preserves decoder-compatible relation order for corpus records", () => {
    const representativeIds = new Set([
      "class_fighter",
      "druid_wild_shape",
      "find_familiar",
      "stat_block_skeleton",
    ]);
    const records = traversal
      .readSurfaceRecords()
      .filter((record: { readonly id: string }) =>
        representativeIds.has(record.id),
      );
    expect(
      records.map((record: { readonly id: string }) => record.id).sort(),
    ).toEqual([...representativeIds].sort());
    expect(traversal.collectAuthoredRelations(records)).toEqual(
      traversal.collectAuthoredRelationsWithDecoderCompatibleUnions(records),
    );
  });

  it("excludes an incompatible sole tagged branch beside an untagged match", () => {
    const schema = Schema.Union([
      Schema.Struct({
        kind: Schema.Literal("tagged"),
        required: Schema.String.pipe(Schema.check(Schema.isMinLength(2))),
        text: surfaceSchemaRole(Schema.String, {
          category: "prose",
          evidence: "summary",
        }),
      }),
      Schema.Struct({
        kind: surfaceSchemaRole(Schema.String, {
          category: "vocabulary",
          kind: "literal",
        }),
        required: Schema.optionalKey(Schema.Unknown),
        extra: Schema.optionalKey(Schema.Unknown),
        text: surfaceSchemaRole(Schema.String, {
          category: "identity",
          kind: "label",
        }),
      }),
    ]);
    const types = unionTypes(schema);
    const incompatibleValues = [
      { kind: "tagged", text: "missing required" },
      { kind: "tagged", required: 1, text: "wrong required type" },
      { kind: "tagged", required: "x", text: "failed refinement" },
      {
        kind: "tagged",
        required: "valid",
        text: "excess property",
        extra: true,
      },
      { kind: "tagged", text: "missing and excess", extra: true },
      {
        kind: "tagged",
        required: 1,
        text: "wrong type and excess",
        extra: true,
      },
      {
        kind: "tagged",
        required: "x",
        text: "failed refinement and excess",
        extra: true,
      },
    ];

    for (const value of incompatibleValues) {
      const retained = traversal.decoderCompatibleUnionBranches(types, value);
      expect(retained).toHaveLength(1);
      expect(traversal.matchingUnionBranches(types, value)).toEqual(retained);
      const roles: string[] = [];
      expect(() =>
        traversal.walkSurfaceValue(
          schema,
          value,
          (
            _path: string,
            _value: string,
            role: { readonly category: string },
          ) => roles.push(role.category),
        ),
      ).not.toThrow();
      expect(roles).toEqual(["vocabulary", "identity"]);
    }

    fc.assert(
      fc.property(
        fc.string({ minLength: 2 }),
        fc.string(),
        fc.jsonValue(),
        (required, text, extra) => {
          const value = { kind: "tagged", required, text, extra };
          const retained = traversal.decoderCompatibleUnionBranches(
            types,
            value,
          );
          expect(retained).toHaveLength(1);
          expect(traversal.matchingUnionBranches(types, value)).toEqual(
            retained,
          );
        },
      ),
      { numRuns: 50 },
    );
  });

  it("uses tuple shape and element compatibility for union reachability", () => {
    const roles: string[] = [];
    traversal.walkSurfaceValue(
      Schema.Union([
        Schema.Struct({
          kind: Schema.Literal("same"),
          items: Schema.Tuple([
            surfaceSchemaRole(Schema.String, {
              category: "prose",
              evidence: "summary",
            }),
          ]),
        }),
        Schema.Struct({
          kind: Schema.Literal("same"),
          items: Schema.Tuple([
            surfaceSchemaRole(Schema.String, {
              category: "identity",
              kind: "label",
            }),
            Schema.Number,
          ]),
        }),
      ]),
      { kind: "same", items: ["valid"] },
      (path: string, _value: string, role: { readonly category: string }) => {
        roles.push(`${path}:${role.category}`);
      },
    );
    expect(roles).toEqual(["value.kind:vocabulary", "value.items[0]:prose"]);
  });

  it("matches union branches to the decoder's excess-property rules", () => {
    const schema = Schema.Union([
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
    ]);
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
    const schema = Schema.Union([
      Schema.Struct({
        text: surfaceSchemaRole(
          Schema.String.pipe(Schema.check(Schema.isMinLength(2))),
          {
            category: "prose",
            evidence: "summary",
          },
        ),
      }),
      Schema.Struct({
        text: surfaceSchemaRole(Schema.String, {
          category: "identity",
          kind: "label",
        }),
      }),
    ]);
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
    const schema = Schema.Union([
      suspendedBranch,
      Schema.Struct({
        kind: Schema.Literal("b"),
        text: surfaceSchemaRole(Schema.String, {
          category: "identity",
          kind: "label",
        }),
      }),
    ]);
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
    const schema = Schema.Union([
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
    ]);
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
    const schema = Schema.Union([
      Schema.Struct({
        kind: Schema.Literal("same"),
        nested: nestedRequired,
      }),
      Schema.Struct({
        kind: Schema.Literal("same"),
        nested: Schema.Struct({
          text: surfaceSchemaRole<string, string, never, never>(Schema.String, {
            category: "identity",
            kind: "label",
          }),
        }),
      }),
    ]);
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
    type RecursiveCodec = Schema.Codec<unknown, unknown>;
    const proseRecursive: RecursiveCodec = Schema.suspend(() =>
      Schema.Union([
        Schema.Struct({
          kind: Schema.Literal("leaf"),
          text: surfaceSchemaRole<string, string, never, never>(Schema.String, {
            category: "prose",
            evidence: "summary",
          }),
        }),
        Schema.Struct({
          kind: Schema.Literal("next"),
          next: proseRecursive,
        }),
      ]),
    );
    const identityRecursive: RecursiveCodec = Schema.suspend(() =>
      Schema.Union([
        Schema.Struct({
          kind: Schema.Literal("leaf"),
          text: surfaceSchemaRole<string, string, never, never>(Schema.String, {
            category: "identity",
            kind: "label",
          }),
          required: Schema.Number,
        }),
        Schema.Struct({
          kind: Schema.Literal("next"),
          next: identityRecursive,
        }),
      ]),
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
      Schema.Union([proseRecursive, identityRecursive]),
      value,
      (_path: string, _value: string, role: { readonly category: string }) => {
        roles.push(role.category);
      },
    );
    expect(roles.at(-1)).toBe("prose");
    expect(roles.filter((role) => role === "vocabulary")).toHaveLength(302);
  });

  it("traverses decoded transformation outputs", () => {
    const text = surfaceSchemaRole<string, string, never, never>(
      Schema.String,
      {
        category: "prose",
        evidence: "summary",
      },
    );
    const target = Schema.Struct({ text: Schema.String });
    const schema = text.pipe(
      Schema.decodeTo(target, {
        decode: SchemaGetter.transform<{ readonly text: string }, string>(
          (value) => ({ text: value }),
        ),
        encode: SchemaGetter.transform<string, { readonly text: string }>(
          (value) => value.text,
        ),
      }),
    );
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
    const schemaSource = surfaceSchemaRole<string, string, never, never>(
      Schema.String,
      {
        category: "prose",
        evidence: "summary",
      },
    );
    const target = Schema.Struct({ text: Schema.String });
    const schema = schemaSource.pipe(
      Schema.decodeTo(target, {
        decode: SchemaGetter.transform<{ readonly text: string }, string>(
          (value) => ({ text: value }),
        ),
        encode: SchemaGetter.transform<string, { readonly text: string }>(
          (value) => value.text,
        ),
      }),
    );
    expect(() =>
      traversal.walkSchemaShape(schema.ast, "Synthetic", () => {}),
    ).toThrow(/no role/);
  });

  it("selects competing transformation unions by decoded shape", () => {
    const source = Schema.String;
    const branch = <const Kind extends "a" | "b">(
      kind: Kind,
      role: SurfaceSchemaFieldRole,
    ) => {
      const target = Schema.Struct({
        kind: Schema.Literal(kind),
        text: surfaceSchemaRole<string, string, never, never>(
          Schema.String,
          role,
        ),
      });
      return source.pipe(
        Schema.decodeTo(target, {
          decode: SchemaGetter.transform<
            { readonly kind: Kind; readonly text: string },
            string
          >((value) => ({ kind, text: value })),
          encode: SchemaGetter.transform<
            string,
            { readonly kind: Kind; readonly text: string }
          >((value) => value.text),
        }),
      );
    };
    const roles: string[] = [];
    traversal.walkSurfaceValue(
      Schema.Union([
        branch("a", { category: "prose", evidence: "summary" }),
        branch("b", { category: "identity", kind: "label" }),
      ]),
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
          const schema =
            repeatedCount > 0 || postRestCount > 0
              ? Schema.TupleWithRest(Schema.Tuple(fixed), [
                  surfaceSchemaRole<string, string, never, never>(
                    Schema.String,
                    {
                      category: "reference",
                      relation: "unit-reference",
                      targetKind: "unit",
                    },
                  ),
                  ...Array.from({ length: postRestCount }, () =>
                    surfaceSchemaRole<string, string, never, never>(
                      Schema.String,
                      {
                        category: "identity",
                        kind: "label",
                      },
                    ),
                  ),
                ])
              : Schema.Tuple(fixed);
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

  it("walks every variadic reference before a trailing identity", () => {
    const schema = Schema.TupleWithRest(Schema.Tuple([]), [
      surfaceSchemaRole<string, string, never, never>(Schema.String, {
        category: "reference",
        relation: "unit-reference",
        targetKind: "unit",
      }),
      surfaceSchemaRole<string, string, never, never>(Schema.String, {
        category: "identity",
        kind: "label",
      }),
    ]);
    const value = Schema.decodeUnknownSync(schema)([
      "reference-one",
      "reference-two",
      "reference-three",
      "trailing-identity",
    ]);

    const inspected = inspectSurfaceSchemaValue(schema, value);

    expect(inspected.issues).toEqual([]);
    expect(
      inspected.visits.map(({ path, value: visited, role }) => ({
        path,
        value: visited,
        role: role.category,
      })),
    ).toEqual([
      { path: "value[0]", value: "reference-one", role: "reference" },
      { path: "value[1]", value: "reference-two", role: "reference" },
      { path: "value[2]", value: "reference-three", role: "reference" },
      {
        path: "value[3]",
        value: "trailing-identity",
        role: "identity",
      },
    ]);
  });

  it("rejects overlapping tagged branches with conflicting roles", () => {
    const schema = Schema.Union([
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
    ]);
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
        Schema.Union([tagged, unrestricted]),
        { kind: "same", text: "ambiguous" },
        () => {},
      ),
    ).toThrow();
  });

  it("resolves literal/unrestricted overlap to one role regardless of order", () => {
    for (const schema of [
      Schema.Union([
        surfaceSchemaRole(Schema.String, {
          category: "prose",
          evidence: "summary",
        }),
        Schema.Literal("same"),
      ]),
      Schema.Union([
        Schema.Literal("same"),
        surfaceSchemaRole(Schema.String, {
          category: "prose",
          evidence: "summary",
        }),
      ]),
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

  it("terminates null AST branches without requiring a string role", () => {
    const schema = Schema.Struct({
      resetCadence: Schema.Struct({
        regain: Schema.NullOr(
          surfaceSchemaRole(Schema.String, {
            category: "prose",
            evidence: "summary",
          }),
        ),
      }),
    });
    expect(() =>
      traversal.walkSchemaShape(schema.ast, "Synthetic", () => {}),
    ).not.toThrow();
    const roles: string[] = [];
    traversal.walkSurfaceValue(
      schema,
      { resetCadence: { regain: null } },
      (_path: string, _value: string, role: { readonly category: string }) => {
        roles.push(role.category);
      },
    );
    expect(roles).toEqual([]);

    traversal.walkSurfaceValue(
      schema,
      { resetCadence: { regain: "restored" } },
      (_path: string, _value: string, role: { readonly category: string }) => {
        roles.push(role.category);
      },
    );
    expect(roles).toEqual(["prose"]);
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
  }, 30_000);
});
