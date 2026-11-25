import { describe, expect, test } from "vitest";
import {
  isCombatTurnStartHeroicInspirationMechanics,
  type ClassFeatureMechanics,
  type CombatTurnStartHeroicInspirationMechanics,
} from "./types.ts";

describe("combat turn-start Heroic Inspiration mechanics", () => {
  test("names the shape by its family alone", () => {
    const heroicInspiration = {
      family: "combat_turn_start_heroic_inspiration",
      trigger: {
        kind: "start_turn",
        encounter: "combat",
        requiresMissingHeroicInspiration: true,
      },
      grant: { kind: "heroic_inspiration" },
    } as const satisfies CombatTurnStartHeroicInspirationMechanics;
    const other: Pick<ClassFeatureMechanics, "family"> = {
      family: "marked_creature_defenses_disclosure",
    };

    expect(isCombatTurnStartHeroicInspirationMechanics(heroicInspiration)).toBe(
      true,
    );
    expect(isCombatTurnStartHeroicInspirationMechanics(other)).toBe(false);
  });
});
