import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  STAT_BLOCK_SPELL_INVOCATION_DELTA_KINDS,
  StatBlockSpellInvocationRestrictionSchema,
  StatBlockSpellReferenceSchema,
} from "./schema.ts";

const decode = <A, I>(schema: Schema.Schema<A, I>, input: unknown): A =>
  Schema.decodeUnknownSync(schema, { onExcessProperty: "error" })(input);

const allDeltas = [
  {
    kind: "transformation_form_creature_type_limit",
    creatureTypes: ["beast", "humanoid"],
  },
  {
    kind: "temporary_hit_points",
    spellGrant: "none",
    maintenanceRequirement: "not_required",
  },
  { kind: "concentration_requirement", requirement: "not_required" },
  {
    kind: "effect_termination",
    triggers: [
      {
        kind: "invoker_turn_boundary_in_illumination",
        turnBoundary: "start_or_end",
        illumination: "bright_light",
      },
      { kind: "same_invoker_recasts_spell" },
    ],
  },
  {
    kind: "created_substance_substitution",
    replaces: "water",
    substitute: "wine",
  },
  {
    kind: "duration_override",
    duration: { unit: "hour", amount: 24 },
  },
  { kind: "target_limit", target: "self" },
  {
    kind: "movement_trace_suppression",
    subject: "invoker",
    whileCondition: "invisible",
    trace: "none",
  },
  {
    kind: "appearance_options",
    sizes: ["large", "medium"],
    bodyPlan: "biped",
  },
  {
    kind: "armor_class_already_includes_effect",
    projection: "already_included",
  },
  { kind: "application_timing", timing: "before_combat" },
] as const;

describe("Stat Block spell invocation restriction schema", () => {
  test("parses the closed eleven-kind vocabulary and multiple deltas", () => {
    const restriction = {
      authoredExpression: "synthetic multi-delta expression",
      deltas: allDeltas,
    } as const;

    expect(
      decode(StatBlockSpellInvocationRestrictionSchema, restriction),
    ).toEqual(restriction);
    expect(allDeltas.map(({ kind }) => kind)).toEqual(
      STAT_BLOCK_SPELL_INVOCATION_DELTA_KINDS,
    );
  });

  test("distinguishes an unrestricted reference from a nonempty restriction", () => {
    expect(
      decode(StatBlockSpellReferenceSchema, {
        spellId: "unit_spell_synthetic_unrestricted",
      }),
    ).not.toHaveProperty("restriction");

    expect(() =>
      decode(StatBlockSpellReferenceSchema, {
        spellId: "unit_spell_synthetic_empty_restriction",
        restriction: {
          authoredExpression: "synthetic expression",
          deltas: [],
        },
      }),
    ).toThrow();
    expect(() =>
      decode(StatBlockSpellReferenceSchema, {
        spellId: "unit_spell_synthetic_prose_only",
        restriction: "synthetic expression",
      }),
    ).toThrow();
  });

  test("rejects repeated delta and nested value kinds", () => {
    expect(() =>
      decode(StatBlockSpellInvocationRestrictionSchema, {
        authoredExpression: "synthetic duplicate delta expression",
        deltas: [
          { kind: "target_limit", target: "self" },
          { kind: "target_limit", target: "self" },
        ],
      }),
    ).toThrow();
    expect(() =>
      decode(StatBlockSpellInvocationRestrictionSchema, {
        authoredExpression: "synthetic duplicate trigger expression",
        deltas: [
          {
            kind: "effect_termination",
            triggers: [
              { kind: "same_invoker_recasts_spell" },
              { kind: "same_invoker_recasts_spell" },
            ],
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      decode(StatBlockSpellInvocationRestrictionSchema, {
        authoredExpression: "synthetic duplicate form expression",
        deltas: [
          {
            kind: "transformation_form_creature_type_limit",
            creatureTypes: ["beast", "beast"],
          },
        ],
      }),
    ).toThrow();
  });

  test("keeps protected expression and free-form meaning out of delta payloads", () => {
    expect(() =>
      decode(StatBlockSpellInvocationRestrictionSchema, {
        authoredExpression: "synthetic expression at the authored boundary",
        deltas: [
          {
            kind: "target_limit",
            target: "self",
            authoredExpression: "must not enter the semantic payload",
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      decode(StatBlockSpellInvocationRestrictionSchema, {
        authoredExpression: "synthetic invalid duration expression",
        deltas: [
          {
            kind: "duration_override",
            duration: { unit: "hour", amount: "as long as needed" },
          },
        ],
      }),
    ).toThrow();
  });
});
