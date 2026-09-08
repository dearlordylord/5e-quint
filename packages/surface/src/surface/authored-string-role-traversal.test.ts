import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import * as AST from "effect/SchemaAST";
import { Schema, SchemaGetter } from "effect";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  surfaceSchemaRole,
  SURFACE_SCHEMA_ROLE_ANNOTATION,
  isSurfaceSchemaRole,
  readSurfaceSchemaRole,
  type SurfaceSchemaFieldRole,
} from "./schema-base.ts";
import {
  AttachmentBaseSchema,
  ComponentsSchema,
  CreatureModeSchema,
  CreatureNamedSpecialActionSchema,
  HoleLabelSchema,
  SpellRecordSchema,
} from "./schema-spell.ts";
import {
  FeatureChoiceMechanicsSchema,
  GnomishLineageMechanicsSchema,
  SorcererMetamagicMechanicsSchema,
  StartingEquipmentChoiceSchema,
} from "./schema-nonspell.ts";
import { RulesExcerptSchema, StatBlockRecordSchema } from "./schema.ts";
import { SHARED_HOST_TEST_TIMEOUT_MILLISECONDS } from "../../../../scripts/shared-host-test-policy.mjs";
import { walkSurfaceSchemaValue } from "./surface-relations-internal.ts";

const execFileAsync = promisify(execFile);

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
    const referenceArray = Schema.Array(
      surfaceSchemaRole(Schema.String, {
        category: "reference",
        relation: "spell-list",
        targetKind: "unit",
      }),
    );
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

  it(
    "preserves the CommonJS audit traversal contract in its own process",
    async () => {
      // tsx/cjs and Vite emit different offsets for the same source URL; mixing
      // those representations in one inspector corrupts V8 coverage aggregation.
      const { stdout } = await execFileAsync(
        "pnpm",
        [
          "exec",
          "vitest",
          "run",
          "scripts/srd521-surface-authored-role-traversal.test.ts",
          "--coverage.enabled=false",
          `--testTimeout=${SHARED_HOST_TEST_TIMEOUT_MILLISECONDS}`,
          "--pool=threads",
          "--maxWorkers=1",
        ],
        {
          cwd: fileURLToPath(new URL("../../../..", import.meta.url)),
          timeout: SHARED_HOST_TEST_TIMEOUT_MILLISECONDS,
          maxBuffer: 1024 * 1024,
        },
      );
      process.stdout.write(stdout);
    },
    SHARED_HOST_TEST_TIMEOUT_MILLISECONDS + 10_000,
  );
});
