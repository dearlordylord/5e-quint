import { describe, expect, test } from "vitest";
import { deathSaveCount } from "@dnd/shared/types";
import {
  DieRollResult,
  Hp,
  characterSheetId,
  rebuildCharacterSheetFixture,
  requireRight,
  stableSheet,
  timePassed,
  timeSpanDuration,
  unitLibrary,
  wizardBuild,
} from "./test-support.test-support.ts";
import type { CharacterSheetPendingDeathSaveCount } from "./sheet-types.ts";

describe("Character Sheet runtime / time passage", () => {
  test.each([
    {
      name: "positive HP",
      hitPoints: {
        tag: "positive",
        currentHp: Hp(1),
        tempHp: Hp(0),
      } as const,
    },
    {
      name: "unstable zero HP",
      hitPoints: {
        tag: "zero",
        tempHp: Hp(0),
        lifecycle: {
          tag: "unstable",
          deathSaves: {
            // deathSaveCount parses these literal 1 values; the cast only carries
            // the immediately established nonterminal fact into the narrower type.
            successes: deathSaveCount(1) as CharacterSheetPendingDeathSaveCount,
            failures: deathSaveCount(1) as CharacterSheetPendingDeathSaveCount,
          },
        },
      } as const,
    },
  ])(
    "leaves $name unchanged during Stable-only time passage",
    ({ hitPoints }) => {
      const sheet = {
        ...stableSheet("character:synthetic-no-stable-recovery"),
        hitPoints,
      };
      const result = timePassed({
        sheet,
        duration: requireRight(timeSpanDuration({ unit: "round", amount: 1 })),
        fills: [],
      });

      expect(result).toMatchObject({
        tag: "resolved",
        elapsedTicks: 1,
        sheet: { hitPoints },
      });
    },
  );

  test("timePassed accumulates Stable recovery time before one hour can pass", () => {
    const result = timePassed({
      sheet: stableSheet("character:stable-round"),
      duration: requireRight(timeSpanDuration({ unit: "round", amount: 1 })),
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      elapsedTicks: 1,
      sheet: {
        hitPoints: {
          tag: "zero",
          lifecycle: {
            tag: "stable",
            recovery: {
              kind: "regains1HpAfter1d4Hours",
              elapsedBeforeRecoveryRoll: 1,
            },
          },
        },
      },
    });
  });

  test("timePassed asks for a Stable recovery roll at the one-hour boundary", () => {
    const result = timePassed({
      sheet: stableSheet("character:stable-roll"),
      duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
      fills: [],
    });

    expect(result).toMatchObject({
      tag: "needsHoles",
      elapsedTicks: 0,
      remainingTicks: 600,
      holes: [
        {
          kind: "rolledDice",
          holeId: "character-sheet:character:stable-roll:stable-recovery-roll",
          label: "Stable recovery 1d4 hours",
        },
      ],
    });
  });

  test("timePassed reaches the Stable recovery roll boundary across multiple calls", () => {
    const firstHalfHour = timePassed({
      sheet: stableSheet("character:stable-halves"),
      duration: requireRight(timeSpanDuration({ unit: "minute", amount: 30 })),
      fills: [],
    });
    if (firstHalfHour.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${firstHalfHour.tag}.`);
    }

    const secondHalfHour = timePassed({
      sheet: firstHalfHour.sheet,
      duration: requireRight(timeSpanDuration({ unit: "minute", amount: 30 })),
      fills: [],
    });

    expect(secondHalfHour).toMatchObject({
      tag: "needsHoles",
      elapsedTicks: 0,
      remainingTicks: 600,
    });
  });

  test("timePassed rejects a Stable recovery roll before the one-hour boundary", () => {
    const sheet = stableSheet("character:stable-early-roll");
    const awaitingRoll = timePassed({
      sheet,
      duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
      fills: [],
    });
    if (awaitingRoll.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingRoll.tag}.`);
    }

    expect(
      timePassed({
        sheet,
        duration: requireRight(
          timeSpanDuration({ unit: "minute", amount: 30 }),
        ),
        fills: [
          {
            kind: "rolledDice",
            holeId: awaitingRoll.holes[0].holeId,
            value: [{ results: [DieRollResult(1)] }],
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("timePassed consumes a Stable recovery roll and recovers after the rolled duration", () => {
    const sheet = stableSheet("character:stable-recovery");
    const awaitingRoll = timePassed({
      sheet,
      duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
      fills: [],
    });
    if (awaitingRoll.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingRoll.tag}.`);
    }

    const firstHour = timePassed({
      sheet,
      duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
      fills: [
        {
          kind: "rolledDice",
          holeId: awaitingRoll.holes[0].holeId,
          value: [{ results: [DieRollResult(2)] }],
        },
      ],
    });

    expect(firstHour).toMatchObject({
      tag: "resolved",
      elapsedTicks: 600,
      sheet: {
        hitPoints: {
          tag: "zero",
          lifecycle: {
            tag: "stable",
            recovery: { kind: "regains1HpAfter", remaining: 600 },
          },
        },
      },
    });
    if (firstHour.tag !== "resolved") {
      throw new Error(`Expected resolved, got ${firstHour.tag}.`);
    }

    expect(
      timePassed({
        sheet: firstHour.sheet,
        duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
        fills: [],
      }),
    ).toMatchObject({
      tag: "resolved",
      elapsedTicks: 600,
      sheet: { hitPoints: { tag: "positive", currentHp: 1, tempHp: 0 } },
    });
  });

  test("preserves spell-slot state when Stable recovery restores 1 HP", () => {
    const spellcaster = requireRight(
      rebuildCharacterSheetFixture({
        characterId: characterSheetId(
          "character:synthetic-spellcaster-stable-recovery",
        ),
        build: wizardBuild({ wizardAdvancements: 0 }),
        currentHp: Hp(1),
        tempHp: Hp(0),
        unitLibrary,
      }),
    );
    const sheet = {
      ...spellcaster,
      hitPoints: stableSheet("character:synthetic-spellcaster-stable-recovery")
        .hitPoints,
    };
    const awaitingRoll = timePassed({
      sheet,
      duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
      fills: [],
    });
    if (awaitingRoll.tag !== "needsHoles") {
      throw new Error(`Expected needsHoles, got ${awaitingRoll.tag}.`);
    }

    const result = timePassed({
      sheet,
      duration: requireRight(timeSpanDuration({ unit: "hour", amount: 1 })),
      fills: [
        {
          kind: "rolledDice",
          holeId: awaitingRoll.holes[0].holeId,
          value: [{ results: [DieRollResult(1)] }],
        },
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      sheet: {
        hitPoints: { tag: "positive", currentHp: 1 },
        spellSlotExpenditures: [],
        createdSpellSlots: [],
      },
    });
  });
});
