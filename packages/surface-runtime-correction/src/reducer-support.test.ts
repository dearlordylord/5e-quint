import { describe, expect, it } from "vitest";
import type {
  ActivationPhase,
  UnitRecord,
} from "@dnd/prototype-content-surface/surface/types";

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

    const unsupported: UnitRecord = {
      ...unit,
      mechanics: {
        ...unit.mechanics,
        phases: [
          ...unit.mechanics.phases,
          unit.mechanics.phases[0],
        ] as unknown as readonly [ActivationPhase, ...ActivationPhase[]],
      },
    };

    expect(() => assertSupportedUnit(unsupported)).toThrow(
      UnsupportedUnitError,
    );
  });

  it("rejects attack-roll units without a target hole at load time", () => {
    const unit = loadSupportedUnit("fire_bolt");
    if (unit.kind !== "spell" || unit.mechanics.family !== "activation") {
      throw new Error("expected activation spell");
    }

    const [phase] = unit.mechanics.phases;
    if (phase.kind !== "attack_roll") {
      throw new Error("expected attack-roll phase");
    }

    const unsupported: UnitRecord = {
      ...unit,
      mechanics: {
        ...unit.mechanics,
        phases: [
          {
            ...phase,
            attachment: { kind: "self" },
          },
        ],
      },
    };

    expect(() => assertSupportedUnit(unsupported)).toThrow(
      UnsupportedUnitError,
    );
  });

  it("rejects attack-roll damage amounts the reducer cannot execute", () => {
    const unit = loadSupportedUnit("fire_bolt");
    if (unit.kind !== "spell" || unit.mechanics.family !== "activation") {
      throw new Error("expected activation spell");
    }

    const [phase] = unit.mechanics.phases;
    if (phase.kind !== "attack_roll" || phase.onHit[0].kind !== "damage") {
      throw new Error("expected attack-roll damage phase");
    }

    const unsupported: UnitRecord = {
      ...unit,
      mechanics: {
        ...unit.mechanics,
        phases: [
          {
            ...phase,
            onHit: [
              {
                ...phase.onHit[0],
                amount: {
                  kind: "resource_spent",
                },
              },
            ],
          },
        ],
      },
    };

    expect(() => assertSupportedUnit(unsupported)).toThrow(
      UnsupportedUnitError,
    );
  });

  it("rejects non-area save-gate units at load time", () => {
    const unit = loadSupportedUnit("fireball");
    if (unit.kind !== "spell" || unit.mechanics.family !== "activation") {
      throw new Error("expected activation spell");
    }

    const [phase] = unit.mechanics.phases;
    if (phase.kind !== "save_gate") {
      throw new Error("expected save-gate phase");
    }

    const unsupported: UnitRecord = {
      ...unit,
      mechanics: {
        ...unit.mechanics,
        phases: [
          {
            ...phase,
            attachment: { kind: "self" },
          },
        ],
      },
    };

    expect(() => assertSupportedUnit(unsupported)).toThrow(
      UnsupportedUnitError,
    );
  });
});
