import fc from "fast-check";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import { battleStatBlockCombatantSource } from "./stat-block-combatant-admission.ts";
import {
  battleExecutionScopeOrdinal,
  battleId,
  combatantId,
} from "./identity.ts";
import { projectAuthoredStatBlock } from "./stat-block-authored-projection.ts";
import {
  restoreStatBlockExecutionAdmission,
  statBlockExecutionAdmissionCohort,
  statBlockExecutionSnapshot,
} from "./stat-block-execution.ts";
import {
  monsterResourceStatBlock,
  projectedStatBlockRuntimeSource,
} from "./battle-runtime.test-support.ts";

const PROPERTY_OPTIONS = { numRuns: 32, seed: 0x341 } as const;
const malformedLegendaryActionUses = fc.oneof(
  fc.constant(0),
  fc.integer({ min: -10_000, max: -1 }),
  fc
    .tuple(
      fc.integer({ min: -10_000, max: 10_000 }),
      fc.constantFrom(0.25, 0.5, 0.75),
    )
    .map(([whole, fraction]) => whole + fraction),
);

describe("Stat Block Legendary Action use-count boundaries", () => {
  test("returns a typed failure for a structurally typed but malformed authored count", () => {
    const authored = monsterResourceStatBlock();
    const legendaryActions = authored.statBlock.legendaryActions;
    expect(legendaryActions).toBeDefined();
    if (legendaryActions === undefined) return;

    const malformed: typeof authored = {
      ...authored,
      statBlock: {
        ...authored.statBlock,
        legendaryActions: {
          ...legendaryActions,
          uses: 0,
        },
      },
    };
    let projection: ReturnType<typeof projectAuthoredStatBlock> | undefined;
    expect(() => {
      projection = projectAuthoredStatBlock(malformed);
    }).not.toThrow();
    expect(projection).toBeDefined();
    if (projection === undefined) return;
    expect(Either.isLeft(projection)).toBe(true);
    if (Either.isRight(projection)) return;
    expect(projection.left).toEqual({
      tag: "battleStatBlockProjectionFailure",
      reason: "invalidLegendaryActionUses",
    });
  });

  test("reject malformed counts without throwing or crossing admission boundaries", () => {
    const authored = monsterResourceStatBlock();
    const projected = projectAuthoredStatBlock(authored);
    expect(Either.isRight(projected)).toBe(true);
    if (Either.isLeft(projected)) return;

    const source = projected.right.runtime;
    const execution = statBlockExecutionAdmissionCohort(
      battleId("legendary-use-count-boundary"),
      combatantId("legendary-use-count-boundary"),
      [source],
      battleExecutionScopeOrdinal(0),
    ).admissions[0];
    expect(execution).toBeDefined();
    if (execution === undefined) return;
    const snapshot = statBlockExecutionSnapshot(execution.execution);

    fc.assert(
      fc.property(malformedLegendaryActionUses, (legendaryActionUses) => {
        const malformed = {
          ...source,
          legendaryActionUses,
        };
        let sourceAdmission:
          | ReturnType<typeof battleStatBlockCombatantSource>
          | undefined;
        expect(() => {
          sourceAdmission = battleStatBlockCombatantSource(malformed);
        }).not.toThrow();
        expect(sourceAdmission).toMatchObject({
          _tag: "Left",
          left: {
            tag: "battleStateInitIssue",
            message:
              "Battle runtime requires Stat Block Legendary Action uses to be a positive integer.",
          },
        });

        const malformedForRestore = Object.assign(
          { ...source },
          { legendaryActionUses },
        );
        let restoredAdmission:
          | ReturnType<typeof restoreStatBlockExecutionAdmission>
          | undefined;
        expect(() => {
          restoredAdmission = restoreStatBlockExecutionAdmission(
            battleId("legendary-use-count-boundary"),
            combatantId("legendary-use-count-boundary"),
            malformedForRestore,
            snapshot,
          );
        }).not.toThrow();
        expect(restoredAdmission).toMatchObject({
          _tag: "Left",
          left: {
            reason: "invalidLegendaryActionUses",
          },
        });
      }),
      PROPERTY_OPTIONS,
    );
  });

  test.each([
    ["NaN", Number.NaN],
    ["positive infinity", Number.POSITIVE_INFINITY],
    ["negative infinity", Number.NEGATIVE_INFINITY],
  ] as const)("rejects %s without throwing", (_label, legendaryActionUses) => {
    const source = projectedStatBlockRuntimeSource(monsterResourceStatBlock());
    const malformed = {
      ...source,
      legendaryActionUses,
    };
    let sourceAdmission:
      | ReturnType<typeof battleStatBlockCombatantSource>
      | undefined;
    expect(() => {
      sourceAdmission = battleStatBlockCombatantSource(malformed);
    }).not.toThrow();
    expect(sourceAdmission).toMatchObject({
      _tag: "Left",
      left: {
        tag: "battleStateInitIssue",
        message:
          "Battle runtime requires Stat Block Legendary Action uses to be a positive integer.",
      },
    });
  });
});
