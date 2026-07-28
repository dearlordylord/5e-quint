import { Either } from "effect";
import { describe, expect, test } from "vitest";

import { decodeFillCreationHolesArgs } from "./character-creation-fill-tool-input.ts";

describe("character creation fill tool input", () => {
  test("reports arguments rejected by the boundary schema", () => {
    expect(
      Either.isLeft(decodeFillCreationHolesArgs(null, "fill_creation_holes")),
    ).toBe(true);
  });
});
