import { describe, expect, test } from "vitest";
import { registeredSpellProcedureMechanicsAdmissions } from "./admission-registry.ts";
import { spellProcedureExecutionFor } from "./execution-registry.ts";
import { spellProcedureExecutionRegistry } from "./execution-composition.ts";

describe("spell procedure registry views", () => {
  test("mechanics admission projection exposes only static owner operations", () => {
    const admissions = registeredSpellProcedureMechanicsAdmissions();

    expect(admissions.length).toBeGreaterThan(0);
    expect(
      admissions.every(
        (admission) =>
          Object.keys(admission).sort().join(",") === "admitMechanics",
      ),
    ).toBe(true);
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
