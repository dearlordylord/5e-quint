import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { resetBattleTurnResources } from "./battle-reducer/turn-resource-reset.ts";
import { fighterVsGoblinBattle } from "./battle-runtime.test-support.ts";
import { combatantId } from "./identity.ts";

const PROPERTY_OPTIONS = { numRuns: 32, seed: 0xc1ea_2024 } as const;

describe("Cleave turn-resource reset", () => {
  test("permits every attacker to use Cleave again on a later turn", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 0, max: 20 }), {
          minLength: 1,
          maxLength: 8,
        }),
        (attackerOrdinals) => {
          const resources = fighterVsGoblinBattle().currentTurnResources;
          const afterTurnBoundary = resetBattleTurnResources({
            ...resources,
            weaponMasteryCleaveAttackersUsedThisTurn: attackerOrdinals.map(
              (ordinal) => combatantId(`cleave-attacker-${ordinal}`),
            ),
          });

          expect(
            afterTurnBoundary.weaponMasteryCleaveAttackersUsedThisTurn,
          ).toEqual([]);
          expect(resetBattleTurnResources(afterTurnBoundary)).toEqual(
            afterTurnBoundary,
          );
        },
      ),
      PROPERTY_OPTIONS,
    );
  });
});
