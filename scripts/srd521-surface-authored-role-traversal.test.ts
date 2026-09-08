import { createRequire } from "node:module";
import * as AST from "effect/SchemaAST";
import { Schema, SchemaGetter } from "effect";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  surfaceSchemaRole,
  type SurfaceSchemaFieldRole,
} from "../packages/surface/src/surface/schema-base.ts";

// The full-corpus audit acceptance commands use a 120-second liveness bound:
// https://github.com/dearlordylord/5e-quint/issues/97
const CORPUS_AUDIT_TEST_TIMEOUT_MILLISECONDS = 120_000;

const require = createRequire(import.meta.url);
const traversal = require("./srd521-surface-authored-corpus-audit.cjs");
const {
  EffectAtomSchema,
  ReactionTriggerSchema,
} = require("../packages/surface/src/surface/schema-spell.ts");
const {
  surfaceSchemaRole,
  SURFACE_SCHEMA_ROLE_ANNOTATION,
} = require("../packages/surface/src/surface/schema-base.ts");

const unionTypes = (schema: Schema.Schema<unknown>): readonly AST.AST[] => {
  if (!AST.isUnion(schema.ast)) throw new Error("expected union schema");
  return schema.ast.types;
};

describe("CommonJS Surface authored string role traversal", () => {
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

  it(
    "keeps production audit traversal finite over the full corpus",
    () => {
      const audit = traversal.buildAudit();
      const records = traversal.readSurfaceRecords();
      expect(audit.metrics.recordsAudited).toBe(records.length);
      expect(
        traversal.collectAuthoredRelations(records).length,
      ).toBeGreaterThan(0);
    },
    CORPUS_AUDIT_TEST_TIMEOUT_MILLISECONDS,
  );

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

  it("matches a deeply recursive sole tagged branch without recursive decoding", () => {
    type RecursiveCodec = Schema.Codec<unknown, unknown>;
    const recursive: RecursiveCodec = Schema.suspend(() =>
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
          next: recursive,
        }),
      ]),
    );
    const schema = Schema.Union([recursive, Schema.Unknown]);
    const types = unionTypes(schema);
    const value = Array.from({ length: 1_024 }).reduce<unknown>(
      (next) => ({ kind: "next", next }),
      { kind: "leaf", text: "deep" },
    );

    const selected = traversal.matchingUnionBranches(types, value);
    const retained = traversal.decoderCompatibleUnionBranches(types, value);
    expect(selected).toHaveLength(2);
    expect(selected).toEqual(retained);
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
