import fc from "fast-check";
import * as Result from "effect/Result";
import { describe, expect, test } from "vitest";
import type { StatBlockRecord } from "@dnd/surface/surface/types";

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

const fixedLegendaryActionUses = fc.integer({ min: 1, max: 10_000 });
const lairBonusLegendaryActionUses = fc.record({
  usesOutsideLair: fc.integer({ min: 1, max: 5_000 }),
  additionalUsesInLair: fc.integer({ min: 1, max: 5_000 }),
});

type AuthoredLegendaryActionUses = NonNullable<
  StatBlockRecord["statBlock"]["legendaryActions"]
>["uses"];

function withLegendaryActionUses(
  record: StatBlockRecord,
  uses: AuthoredLegendaryActionUses,
): StatBlockRecord {
  const legendaryActions = record.statBlock.legendaryActions;
  if (legendaryActions === undefined) {
    throw new Error("Expected the Legendary Action property fixture.");
  }
  return {
    ...record,
    statBlock: {
      ...record.statBlock,
      legendaryActions: { ...legendaryActions, uses },
    },
  };
}

describe("Stat Block Legendary Action use-count boundaries", () => {
  test("projects every positive fixed authored count without changing it", () => {
    const authored = monsterResourceStatBlock();
    fc.assert(
      fc.property(fixedLegendaryActionUses, (uses) => {
        const projection = projectAuthoredStatBlock(
          withLegendaryActionUses(authored, { kind: "fixed", uses }),
        );
        expect(Result.isSuccess(projection)).toBe(true);
        if (Result.isFailure(projection)) return;
        expect(projection.success.runtime.legendaryActionUses).toBe(uses);
      }),
      PROPERTY_OPTIONS,
    );
  });

  test("returns the precise unsupported-context failure for every valid lair bonus", () => {
    const authored = monsterResourceStatBlock();
    fc.assert(
      fc.property(
        lairBonusLegendaryActionUses,
        ({ usesOutsideLair, additionalUsesInLair }) => {
          const projection = projectAuthoredStatBlock(
            withLegendaryActionUses(authored, {
              kind: "lair_bonus",
              usesOutsideLair,
              additionalUsesInLair,
            }),
          );
          expect(projection).toEqual(
            Result.fail({
              tag: "battleStatBlockProjectionFailure",
              reason: "unsupportedLairConditionalLegendaryActionUses",
            }),
          );
        },
      ),
      {
        ...PROPERTY_OPTIONS,
        examples: [[{ usesOutsideLair: 3, additionalUsesInLair: 1 }]],
      },
    );
  });

  test("reject malformed counts without throwing or crossing admission boundaries", () => {
    const authored = monsterResourceStatBlock();
    const projected = projectAuthoredStatBlock(authored);
    expect(Result.isSuccess(projected)).toBe(true);
    if (Result.isFailure(projected)) return;

    const source = projected.success.runtime;
    const admittedSource = Result.getOrThrow(
      battleStatBlockCombatantSource(source),
    );
    const execution = statBlockExecutionAdmissionCohort(
      battleId("legendary-use-count-boundary"),
      combatantId("legendary-use-count-boundary"),
      [admittedSource],
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
        const sourceAdmission = battleStatBlockCombatantSource(malformed);
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
        const restoredAdmission = restoreStatBlockExecutionAdmission(
          battleId("legendary-use-count-boundary"),
          combatantId("legendary-use-count-boundary"),
          malformedForRestore,
          snapshot,
        );
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
    const sourceAdmission = battleStatBlockCombatantSource(malformed);
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
