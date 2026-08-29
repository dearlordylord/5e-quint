import { Schema } from "effect";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";

import {
  BattleFillSchema,
  BattleHoleSchema,
} from "./battle-reducer/battle-codecs.ts";
import { battleAreaId } from "./identity.ts";

const PROPERTY_OPTIONS = { numRuns: 64, seed: 0x381c10d } as const;

describe("area wind-strength codecs", () => {
  test("generated holes and explicit strength fills preserve their boundary representation", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.constantFrom("strong" as const, "notStrong" as const),
        (suffix, strength) => {
          const key = `battle:area-wind-strength:property:${suffix}`;
          const hole = {
            kind: "areaWindStrength" as const,
            holeId: holeId(key),
            holeInstanceKey: holeInstanceKey(key),
            label: "Wind strength in the area",
            areaId: battleAreaId(`area-wind-strength:${suffix}`),
          };
          const fill = {
            kind: "areaWindStrength" as const,
            holeId: hole.holeId,
            value: { kind: strength },
          };

          const encodedHole = Schema.encodeSync(BattleHoleSchema)(hole);
          expect(
            Schema.decodeUnknownSync(BattleHoleSchema)(encodedHole),
          ).toEqual(hole);
          const encodedFill = Schema.encodeSync(BattleFillSchema)(fill);
          expect(
            Schema.decodeUnknownSync(BattleFillSchema)(encodedFill),
          ).toEqual(fill);
        },
      ),
      PROPERTY_OPTIONS,
    );
  });
});
