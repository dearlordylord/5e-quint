import { describe, expect, test } from "vitest";
import { registeredSpellProcedureAdmissions } from "./admission-registry.ts";
import { spellProcedureExecutionFor } from "./execution-registry.ts";
import { spellProcedureExecutionRegistry } from "./execution-composition.ts";

describe("spell procedure registry views", () => {
  test("admission traversal exposes only authored admission operations", () => {
    const admissions = registeredSpellProcedureAdmissions();

    expect(admissions.length).toBeGreaterThan(0);
    expect(admissions.every((admission) => "admit" in admission)).toBe(true);
    expect(admissions.every((admission) => !("resolve" in admission))).toBe(
      true,
    );
  });

  test("execution lookup excludes authored admission operations", () => {
    const execution = spellProcedureExecutionFor(
      spellProcedureExecutionRegistry(),
      "damageReduction",
    );

    expect(execution.procedure).toBe("damageReduction");
    expect("admit" in execution).toBe(false);
    expect(execution.executionSchema).toBeDefined();
    expect(execution.discoverCastAct).toBeTypeOf("function");
    expect(execution.resolve).toBeTypeOf("function");
  });
});
