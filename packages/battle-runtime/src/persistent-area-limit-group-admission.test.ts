import { describe, expect, test } from "vitest";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  cloudkillUnitId,
  insectPlagueUnitId,
  moonbeamUnitId,
  sleetStormUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import { inspectRegisteredSpellMechanicsForTest } from "./unit-profile-admission.test-support.ts";

const persistentAreaProfiles = [
  {
    procedure: "stationary persistent-area save damage",
    unitId: insectPlagueUnitId,
    limitGateCount: 3,
  },
  {
    procedure: "translating persistent-area save damage",
    unitId: cloudkillUnitId,
    limitGateCount: 4,
  },
  {
    procedure: "directed-reposition persistent-area save damage",
    unitId: moonbeamUnitId,
    limitGateCount: 4,
  },
  {
    procedure: "persistent-area save composite",
    unitId: sleetStormUnitId,
    limitGateCount: 2,
  },
] as const;

type LimitGroupFixture = "nonempty" | "missing" | "empty" | "inconsistent";

function oncePerTurnUsageLimitForFixture(
  fixture: LimitGroupFixture,
  groupPosition: "shared" | "distinct",
) {
  if (fixture === "missing") {
    return { kind: "once_per_turn" } as const;
  }
  return {
    kind: "once_per_turn",
    limitGroup:
      fixture === "empty"
        ? ""
        : fixture === "inconsistent" && groupPosition === "distinct"
          ? "synthetic_distinct_save_per_turn"
          : "synthetic_shared_save_per_turn",
  } as const;
}

function withEveryOncePerTurnLimitGroup(
  spell: SpellRecord,
  fixture: LimitGroupFixture,
  distinctGateIndex = 0,
): SpellRecord {
  if (spell.mechanics.family !== "ongoing_effect") {
    throw new Error("Expected persistent-area ongoing-effect mechanics.");
  }
  const initialPhase = spell.mechanics.initialPhase;
  const initialPhaseHasOncePerTurnLimit =
    initialPhase?.kind === "save_gate" &&
    initialPhase.usageLimit?.kind === "once_per_turn";
  const limitedOperationIndexes = spell.mechanics.operations.flatMap(
    (operation, index) =>
      operation.usageLimit?.kind === "once_per_turn" ? [index] : [],
  );

  return decodeSpellRecordForTest({
    ...spell,
    mechanics: {
      ...spell.mechanics,
      ...(initialPhase === undefined
        ? {}
        : {
            initialPhase:
              initialPhase.kind === "save_gate" &&
              initialPhase.usageLimit?.kind === "once_per_turn"
                ? {
                    ...initialPhase,
                    usageLimit: oncePerTurnUsageLimitForFixture(
                      fixture,
                      distinctGateIndex === 0 ? "distinct" : "shared",
                    ),
                  }
                : initialPhase,
          }),
      operations: spell.mechanics.operations.map((operation, index) =>
        operation.usageLimit?.kind === "once_per_turn"
          ? {
              ...operation,
              usageLimit: oncePerTurnUsageLimitForFixture(
                fixture,
                limitedOperationIndexes.indexOf(index) +
                  (initialPhaseHasOncePerTurnLimit ? 1 : 0) ===
                  distinctGateIndex
                  ? "distinct"
                  : "shared",
              ),
            }
          : operation,
      ),
    },
  });
}

describe.each(persistentAreaProfiles)(
  "$procedure once-per-turn limit-group admission",
  ({ unitId, limitGateCount }) => {
    test("admits one shared nonempty group", () => {
      expect(
        inspectRegisteredSpellMechanicsForTest(
          withEveryOncePerTurnLimitGroup(spellRecord(unitId), "nonempty"),
        ).tag,
      ).toBe("admitted");
    });

    test("rejects an empty shared group", () => {
      expect(
        inspectRegisteredSpellMechanicsForTest(
          withEveryOncePerTurnLimitGroup(spellRecord(unitId), "empty"),
        ).tag,
      ).toBe("rejected");
    });

    test("rejects missing groups", () => {
      expect(
        inspectRegisteredSpellMechanicsForTest(
          withEveryOncePerTurnLimitGroup(spellRecord(unitId), "missing"),
        ).tag,
      ).toBe("rejected");
    });

    test.each(Array.from({ length: limitGateCount }, (_, index) => index))(
      "rejects an inconsistent group at gate %i",
      (distinctGateIndex) => {
        expect(
          inspectRegisteredSpellMechanicsForTest(
            withEveryOncePerTurnLimitGroup(
              spellRecord(unitId),
              "inconsistent",
              distinctGateIndex,
            ),
          ).tag,
        ).toBe("rejected");
      },
    );
  },
);
