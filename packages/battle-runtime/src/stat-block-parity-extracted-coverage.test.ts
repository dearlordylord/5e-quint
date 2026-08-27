import { assertStatBlockForTest } from "@dnd/surface/surface/stat-block-catalog.test-support";
import { statBlockId } from "@dnd/shared/game-facts";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";
import { ClassLevel } from "@dnd/shared/types";
import type { StatBlockRecord } from "@dnd/surface/surface/types";

import {
  statBlockCatalog,
  statBlockRecord,
} from "./battle-runtime.test-support.ts";
import {
  projectAuthoredStatBlock,
  projectAuthoredStatBlockWithCreatureType,
} from "./stat-block-authored-projection.ts";
import { wildShapeFormActionSurfaceInventory } from "./statblock-action-support.ts";
import type { BattleDruidWildShapeKnownFormSupportProfile } from "./druid-wild-shape-support-execution.ts";

const allBeastFormsProfile = {
  kind: "druidWildShapeKnownForm",
  classLevel: ClassLevel.make(20),
  knownFormRoster: {
    creatureType: "beast",
    count: 100,
    maxChallengeRating: 30,
    flySpeed: "allowed",
  },
} as const satisfies BattleDruidWildShapeKnownFormSupportProfile;

describe("extracted Stat Block parity branches", () => {
  test("reports a valid authored size choice at the projection boundary", () => {
    const source = statBlockRecord();
    const result = projectAuthoredStatBlock({
      ...source,
      statBlock: {
        ...source.statBlock,
        size: { kind: "alternatives", options: ["small", "medium"] },
      },
    });

    expect(result).toMatchObject({
      _tag: "Left",
      left: {
        tag: "battleStatBlockProjectionFailure",
        reason: "nonLiteralSize",
      },
    });
  });

  test("projects optional defenses, resources, senses, and authored prose", () => {
    const skeleton = projectAuthoredStatBlock(
      assertStatBlockForTest(
        statBlockCatalog,
        statBlockId("stat_block_skeleton"),
      ),
    );
    const sphinx = projectAuthoredStatBlock(
      assertStatBlockForTest(
        statBlockCatalog,
        statBlockId("stat_block_sphinx_of_wonder"),
      ),
    );

    expect(Either.isRight(skeleton)).toBe(true);
    expect(Either.isRight(sphinx)).toBe(true);
    if (Either.isLeft(skeleton) || Either.isLeft(sphinx)) return;

    expect(skeleton.right.runtime.statBlock).toMatchObject({
      savingThrowModifiers: expect.any(Array),
      vulnerabilities: { kind: "fixed", damageTypes: ["bludgeoning"] },
      immunities: {
        conditions: ["exhaustion", "poisoned"],
        damageTypes: ["poison"],
      },
    });
    expect(sphinx.right.runtime).toMatchObject({
      resources: [
        { ordinal: 1, ownership: "shared", limit: { kind: "daily", uses: 2 } },
      ],
    });
    expect(sphinx.right.presentation.orderedProcedures).toContainEqual({
      section: "reactions",
      procedureOrdinal: 1,
      name: "Burst of Ingenuity",
      description: expect.stringContaining("Trigger:"),
      kind: "textOnly",
      reason: "unsupported_procedure_family",
      resourceRefs: [1],
    });
  });

  test("projects hover, qualified darkvision, and a creature-type override", () => {
    const source = statBlockRecord();
    const record: StatBlockRecord = {
      ...source,
      statBlock: {
        ...source.statBlock,
        speeds: [
          { kind: "walk", feet: { kind: "literal", value: 30 } },
          { kind: "fly", feet: { kind: "literal", value: 60 }, hover: true },
        ],
        senses: [
          {
            kind: "darkvision",
            rangeFeet: 120,
            qualifier: "unimpeded_by_magical_darkness",
          },
        ],
      },
    };

    const result = projectAuthoredStatBlockWithCreatureType(record, "fey");
    expect(Either.isRight(result)).toBe(true);
    if (Either.isLeft(result)) return;
    expect(result.right.runtime.statBlock).toMatchObject({
      creatureType: "fey",
      speeds: [
        { kind: "walk", feet: { kind: "literal", value: 30 } },
        { kind: "fly", feet: { kind: "literal", value: 60 }, hover: true },
      ],
      senses: [
        {
          kind: "darkvision",
          rangeFeet: 120,
          qualifier: "unimpeded_by_magical_darkness",
        },
      ],
    });
  });

  test("classifies the executable and closed Beast action-surface families", () => {
    const inventory = wildShapeFormActionSurfaceInventory({
      forms: statBlockCatalog.listStatBlocks(),
      profile: allBeastFormsProfile,
    });
    const categories = inventory.map(({ category }) => category);

    expect(categories).toEqual(
      expect.arrayContaining([
        "simpleLiteralAttackSingleDamage",
        "multiDamageComponentsOnHit",
        "traitDerivedConditionalAttackRollAdvantage",
        "attackHitTargetSizeConditionRider",
        "tableOrProseOnlyTrait",
      ]),
    );
    expect(
      inventory
        .filter((entry) => "closedBoundary" in entry)
        .every((entry) => entry.closedBoundary.owner.length > 0),
    ).toBe(true);
  });
});
