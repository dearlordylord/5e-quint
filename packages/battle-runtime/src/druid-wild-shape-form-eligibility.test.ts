import { assertStatBlockForTest } from "@dnd/surface/surface/stat-block-catalog.test-support";
import { ClassLevel } from "@dnd/shared/types";
import { statBlockId } from "@dnd/shared/game-facts";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";

import {
  statBlockCatalog,
  statBlockRecord,
} from "./battle-runtime.test-support.ts";
import type { BattleDruidWildShapeKnownFormSupportProfile } from "./druid-wild-shape-support-execution.ts";
import { wildShapeKnownFormEligibilityIssue } from "./druid-wild-shape-form-eligibility.ts";

const profile = {
  kind: "druidWildShapeKnownForm",
  classLevel: ClassLevel.make(2),
  knownFormRoster: {
    creatureType: "beast",
    count: 4,
    maxChallengeRating: 0.25,
    flySpeed: "forbidden",
  },
} satisfies BattleDruidWildShapeKnownFormSupportProfile;

function syntheticCrHalfBeast(): StatBlockRecord {
  const base = assertStatBlockForTest(
    statBlockCatalog,
    statBlockId("stat_block_riding_horse"),
  );
  return {
    ...base,
    id: statBlockId("synthetic_cr_half_beast"),
    name: "Synthetic CR-Half Beast",
    challengeRating: 0.5,
    provenance: {
      kind: "synthetic-test",
      section: "wild-shape-eligibility-test",
    },
    statBlock: {
      ...base.statBlock,
    },
  };
}

describe("Wild Shape known-form eligibility", () => {
  test("reports each closed roster boundary precisely", () => {
    expect(
      wildShapeKnownFormEligibilityIssue({
        form: statBlockRecord(),
        profile,
      }),
    ).toEqual({ code: "creatureType" });
    expect(
      wildShapeKnownFormEligibilityIssue({
        form: syntheticCrHalfBeast(),
        profile,
      }),
    ).toEqual({ code: "challengeRating" });
    expect(
      wildShapeKnownFormEligibilityIssue({
        form: assertStatBlockForTest(
          statBlockCatalog,
          statBlockId("stat_block_bat"),
        ),
        profile,
      }),
    ).toEqual({ code: "flySpeed" });
    expect(
      wildShapeKnownFormEligibilityIssue({
        form: assertStatBlockForTest(
          statBlockCatalog,
          statBlockId("stat_block_riding_horse"),
        ),
        profile,
      }),
    ).toBeUndefined();
  });
});
