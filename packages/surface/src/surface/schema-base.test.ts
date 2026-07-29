import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  ClassLevelChoiceCountSchema,
  isSurfaceSchemaRole,
  ProficiencyGrantSchema,
  ProficiencyGrantSubjectSchema,
  ReadonlyNonEmptyArrayProficiencyGrantSubjectSchema,
  ReadonlyNonEmptyArrayToolProficiencyGrantSubjectSchema,
  ToolProficiencyGrantSubjectSchema,
} from "./schema-base.ts";

const decode = <A, I>(schema: Schema.Schema<A, I>, input: I): A =>
  Schema.decodeUnknownSync(schema)(input);

describe("Surface base schemas", () => {
  test("reads every proficiency-grant subject shape", () => {
    const subjects = [
      { kind: "skill", skill: "arcana" },
      { kind: "weapon_category", category: "simple" },
      { kind: "armor_category", category: "light" },
      { kind: "tool", toolId: "synthetic_tool" },
      { kind: "tool_category", category: "artisan_tool" },
    ] as const;

    for (const subject of subjects) {
      expect(decode(ProficiencyGrantSubjectSchema, subject)).toEqual(subject);
    }
    expect(
      decode(ToolProficiencyGrantSubjectSchema, {
        kind: "tool",
        toolId: "synthetic_tool",
      }),
    ).toEqual({ kind: "tool", toolId: "synthetic_tool" });
    expect(
      decode(ToolProficiencyGrantSubjectSchema, {
        kind: "tool_category",
        category: "gaming_set",
      }),
    ).toEqual({ kind: "tool_category", category: "gaming_set" });
    expect(
      decode(ReadonlyNonEmptyArrayProficiencyGrantSubjectSchema, subjects),
    ).toHaveLength(5);
    expect(
      decode(ReadonlyNonEmptyArrayToolProficiencyGrantSubjectSchema, [
        { kind: "tool_category", category: "musical_instrument" },
      ]),
    ).toHaveLength(1);
  });

  test("reads class-level choice counts and proficiency-grant compositions", () => {
    expect(
      decode(ClassLevelChoiceCountSchema, {
        kind: "class_level_additional_choices",
        initial: 2,
        increases: [{ atLevel: 5, choose: 1 }],
      }),
    ).toEqual({
      kind: "class_level_additional_choices",
      initial: 2,
      increases: [{ atLevel: 5, choose: 1 }],
    });
    expect(
      decode(ClassLevelChoiceCountSchema, {
        kind: "class_level_total_choices",
        levels: [{ atLevel: 1, total: 2 }],
      }),
    ).toEqual({
      kind: "class_level_total_choices",
      levels: [{ atLevel: 1, total: 2 }],
    });
    expect(
      decode(ProficiencyGrantSchema, {
        kind: "mixed",
        fixed: [{ kind: "skill", skill: "history" }],
        choice: {
          choiceKey: "synthetic_training",
          count: 1,
          options: [{ kind: "armor_category", category: "medium" }],
        },
      }),
    ).toMatchObject({ kind: "mixed" });
  });

  test("recognizes the vocabulary role", () => {
    expect(
      isSurfaceSchemaRole({ category: "vocabulary", kind: "literal" }),
    ).toBe(true);
    expect(
      isSurfaceSchemaRole({ category: "vocabulary", kind: "authored" }),
    ).toBe(false);
  });
});
