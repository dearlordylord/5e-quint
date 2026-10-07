import { unitId } from "@dnd/shared/game-facts";
import { describe, expect, it } from "vitest";
import { spellRecord } from "../unit-profile-admission-spell-record.test-support.ts";
import { joinStatBlockSpellDefinition } from "./stat-block-spell-definition.ts";

describe("Stat Block spell definition admission", () => {
  const definition = spellRecord("magic_missile");

  it("joins the listed definition and uses its lowest level", () => {
    const result = joinStatBlockSpellDefinition(
      { spellId: definition.id },
      definition,
    );
    expect(result.kind).toBe("joined");
    if (result.kind !== "joined") throw new Error("Expected joined definition");
    expect(result.value.castLevel).toBe(1);
    expect(result.value.castingTime).toEqual({ kind: "action" });
    expect(result.value.continuation).toEqual({ kind: "unrestricted" });
  });

  it("retains an explicitly listed higher cast level", () => {
    const result = joinStatBlockSpellDefinition(
      { spellId: definition.id, castAtLevel: 5 },
      definition,
    );
    expect(result.kind === "joined" && result.value.castLevel).toBe(5);
  });

  it("returns precise absent and mismatched definition outcomes", () => {
    expect(
      joinStatBlockSpellDefinition({ spellId: definition.id }, undefined),
    ).toEqual({ kind: "missingDefinition" });
    expect(
      joinStatBlockSpellDefinition(
        { spellId: unitId("synthetic_other_spell") },
        definition,
      ),
    ).toEqual({ kind: "definitionReferenceMismatch" });
  });

  it("rejects a cast level below the spell level", () => {
    expect(
      joinStatBlockSpellDefinition(
        { spellId: definition.id, castAtLevel: 0 },
        definition,
      ),
    ).toEqual({
      kind: "invalidCastLevel",
      definitionLevel: 1,
      requestedLevel: 0,
    });
  });

  it("retains typed restriction deltas without their authored expression", () => {
    const result = joinStatBlockSpellDefinition(
      {
        spellId: definition.id,
        restriction: {
          authoredExpression:
            "Synthetic expression that must not reach execution",
          deltas: [
            { kind: "concentration_requirement", requirement: "not_required" },
          ],
        },
      },
      definition,
    );
    expect(result.kind).toBe("joined");
    if (result.kind !== "joined") throw new Error("Expected joined definition");
    expect(result.value.continuation).toEqual({
      kind: "restricted",
      deltas: [
        { kind: "concentration_requirement", requirement: "not_required" },
      ],
    });
  });
});
