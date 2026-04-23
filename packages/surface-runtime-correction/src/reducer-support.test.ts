import { describe, expect, it } from "vitest";

import { loadSupportedUnit } from "#/supported-unit-library.ts";
import {
  assertSupportedUnit,
  UnsupportedUnitError,
} from "#/reducer-support.ts";

describe("assertSupportedUnit", () => {
  it("accepts a supported authored unit during load", () => {
    expect(loadSupportedUnit("fireball").id).toBe("fireball");
  });

  it("rejects chromatic orb during load because continuation is not in the first slice", () => {
    expect(() => loadSupportedUnit("chromatic_orb")).toThrow(
      UnsupportedUnitError,
    );
  });

  it("rejects an unsupported multi-phase shape", () => {
    const unit = loadSupportedUnit("fireball");
    if (unit.kind !== "spell" || unit.mechanics.family !== "activation") {
      throw new Error("expected activation spell");
    }

    const unsupported = {
      ...unit,
      mechanics: {
        ...unit.mechanics,
        phases: [...unit.mechanics.phases, unit.mechanics.phases[0]] as const,
      },
    };

    expect(() => assertSupportedUnit(unsupported)).toThrow(
      UnsupportedUnitError,
    );
  });
});
