import { describe, expect, it } from "vitest";

import { loadAuthoredUnit } from "#/authored-library.ts";
import {
  checkSupportedUnit,
  UnsupportedUnitShapeError,
} from "#/reducer-support.ts";

describe("checkSupportedUnit", () => {
  it("accepts a supported authored unit during load", () => {
    expect(loadAuthoredUnit("fireball").id).toBe("fireball");
  });

  it("rejects chromatic orb during load because continuation is not in the first slice", () => {
    expect(() => loadAuthoredUnit("chromatic_orb")).toThrow(
      UnsupportedUnitShapeError,
    );
  });

  it("rejects an unsupported multi-phase shape", () => {
    const unit = loadAuthoredUnit("fireball");
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

    expect(() => checkSupportedUnit(unsupported)).toThrow(
      UnsupportedUnitShapeError,
    );
  });
});
