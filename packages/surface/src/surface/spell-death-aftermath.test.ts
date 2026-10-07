import { Result, Schema } from "effect";
import { describe, expect, it } from "vitest";
import fingerOfDeath from "../../content/finger_of_death.json";
import {
  ActivationMechanicsSchema,
  SpellDeathAftermathSchema,
} from "./schema-spell.ts";

describe("spell death aftermath authored mechanics", () => {
  it("retains the SRD lethal reanimation obligation alongside initial damage", () => {
    const mechanics = Schema.decodeUnknownSync(ActivationMechanicsSchema)(
      fingerOfDeath.mechanics,
    );
    expect(mechanics.phases).toHaveLength(1);
    expect(mechanics.phases[0]?.kind).toBe("save_gate");
    expect(mechanics.deathAftermath).toEqual([
      {
        kind: "reanimate_creature_killed_by_spell",
        creatureType: "humanoid",
        timing: "start_of_caster_next_turn",
        statBlockId: "stat_block_zombie",
        control: "caster_verbal_orders",
      },
    ]);
    expect(Schema.encodeSync(ActivationMechanicsSchema)(mechanics)).toEqual(
      fingerOfDeath.mechanics,
    );
  });

  it("requires the killed creature filter, delayed timing, reanimation form and control", () => {
    const aftermath = {
      kind: "reanimate_creature_killed_by_spell",
      creatureType: "humanoid",
      timing: "start_of_caster_next_turn",
      statBlockId: "stat_block_synthetic_aftermath_form",
      control: "caster_verbal_orders",
    };
    for (const field of [
      "creatureType",
      "timing",
      "statBlockId",
      "control",
    ] as const) {
      const incomplete = { ...aftermath, [field]: undefined };
      expect(
        Result.isFailure(
          Schema.decodeUnknownResult(SpellDeathAftermathSchema)(incomplete),
        ),
      ).toBe(true);
    }
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(ActivationMechanicsSchema)({
          ...fingerOfDeath.mechanics,
          deathAftermath: [],
        }),
      ),
    ).toBe(true);
  });
});
