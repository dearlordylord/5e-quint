// KERNEL-COVERAGE: parity-witness SHEET.HP_REST_HIT_DICE.TRANSITIONS
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import {
  abilityScoreAssignment,
  classUnitId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import { DieRollResult, Hp, resourceCount } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  CHARACTER_SHEET_LONG_REST_BASE_TICKS,
  CHARACTER_SHEET_LONG_REST_WAIT_TICKS,
  CHARACTER_SHEET_SHORT_REST_TICKS,
  characterSheetCurrentHp,
  characterSheetHitDice,
  characterSheetHitPointMaximum,
  characterSheetId,
  characterSheetLongRestCalendarGate,
  characterSheetTempHp,
  completeLongRest,
  completeShortRest,
  createFreshCharacterSheet,
  finishLongRest,
  finishShortRest,
  interruptLongRest,
  interruptShortRest,
  startLongRest,
  startShortRest,
  type CharacterSheet,
} from "./index.ts";

const hpRestHitDiceScenarios = [
  "init",
  "long-rest-start-zero-hp-rejected",
  "long-rest-sixteen-hour-wait-rejected",
  "short-rest-spend-hit-point-die",
  "short-rest-interrupted-no-benefit",
  "long-rest-restores-hp-hit-point-dice-and-maximum",
  "long-rest-interrupted-before-one-hour-no-benefit",
  "long-rest-interrupted-with-short-rest-benefits",
  "short-rest-start-zero-hp-rejected",
  "short-rest-duration-too-short-rejected",
  "long-rest-duration-too-short-rejected",
  "long-rest-physical-exertion-too-short-rejected",
  "short-rest-spend-hit-point-dice-sequentially",
  "long-rest-interruption-at-required-duration-rejected",
] as const;
type HpRestHitDiceScenario = (typeof hpRestHitDiceScenarios)[number];
const hpRestHitDiceReplayStepCount = hpRestHitDiceScenarios.length - 1;

type HpRestHitDiceProjection = {
  readonly outcome: HpRestHitDiceScenario;
  readonly accepted: boolean;
  readonly message: string;
  readonly currentHp: number;
  readonly hitPointMaximum: number;
  readonly hitPointMaximumReduction: number;
  readonly temporaryHitPoints: number;
  readonly spentHitDice: number;
  readonly requiredLongRestTicks: number;
  readonly remainingWaitTicks: number;
  readonly replayIndex: number;
};

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Character Sheet HP/rest/Hit Dice Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

const driverSchema = {
  init: {},
  doRejectLongRestStartAtZeroHp: {},
  doRejectLongRestBeforeSixteenHourWait: {},
  doSpendShortRestHitPointDie: {},
  doInterruptShortRestNoBenefit: {},
  doCompleteLongRestRestoresHpHitPointDiceAndMaximum: {},
  doInterruptLongRestBeforeOneHourNoBenefit: {},
  doInterruptLongRestWithShortRestBenefits: {},
  doRejectShortRestStartAtZeroHp: {},
  doRejectShortRestDurationTooShort: {},
  doRejectLongRestDurationTooShort: {},
  doRejectLongRestPhysicalExertionTooShort: {},
  doSpendShortRestHitPointDiceSequentially: {},
  doRejectLongRestInterruptionAtRequiredDuration: {},
  step: {},
} as const;

function createHpRestHitDiceDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doRejectLongRestStartAtZeroHp: () => {
        projection = rejectLongRestStartAtZeroHpProjection();
      },
      doRejectLongRestBeforeSixteenHourWait: () => {
        projection = rejectLongRestBeforeSixteenHourWaitProjection();
      },
      doSpendShortRestHitPointDie: () => {
        projection = spendShortRestHitPointDieProjection();
      },
      doInterruptShortRestNoBenefit: () => {
        projection = interruptShortRestNoBenefitProjection();
      },
      doCompleteLongRestRestoresHpHitPointDiceAndMaximum: () => {
        projection =
          completeLongRestRestoresHpHitPointDiceAndMaximumProjection();
      },
      doInterruptLongRestBeforeOneHourNoBenefit: () => {
        projection = interruptLongRestBeforeOneHourNoBenefitProjection();
      },
      doInterruptLongRestWithShortRestBenefits: () => {
        projection = interruptLongRestWithShortRestBenefitsProjection();
      },
      doRejectShortRestStartAtZeroHp: () => {
        projection = rejectShortRestStartAtZeroHpProjection();
      },
      doRejectShortRestDurationTooShort: () => {
        projection = rejectShortRestDurationTooShortProjection();
      },
      doRejectLongRestDurationTooShort: () => {
        projection = rejectLongRestDurationTooShortProjection();
      },
      doRejectLongRestPhysicalExertionTooShort: () => {
        projection = rejectLongRestPhysicalExertionTooShortProjection();
      },
      doSpendShortRestHitPointDiceSequentially: () => {
        projection = spendShortRestHitPointDiceSequentiallyProjection();
      },
      doRejectLongRestInterruptionAtRequiredDuration: () => {
        projection = rejectLongRestInterruptionAtRequiredDurationProjection();
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

const hpRestHitDiceStateCheck = stateCheck(
  normalizeHpRestHitDiceQuintState,
  compareHpRestHitDiceState,
);

describe("Character Sheet HP/rest/Hit Dice deterministic QNT replay", () => {
  it("replays HP lifecycle, rest gates, interruptions, and Hit Dice transitions", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-sheet-hp-rest-hit-dice.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createHpRestHitDiceDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: hpRestHitDiceReplayStepCount,
      stateCheck: hpRestHitDiceStateCheck,
    });
  }, 120_000);
});

function rejectLongRestStartAtZeroHpProjection(): HpRestHitDiceProjection {
  const sheet = sheetFixture({
    characterId: "character:hp-rest-zero",
    build: baseBuild("class_fighter"),
    maximumHp: 12,
    hitPointMaximumReduction: 0,
    currentHp: 0,
  });
  const result = startLongRest({
    sheet,
    timing: { tag: "noPriorLongRest" },
  });
  return projectResult({
    outcome: "long-rest-start-zero-hp-rejected",
    sheet,
    result,
    replayIndex: 1,
  });
}

function rejectShortRestStartAtZeroHpProjection(): HpRestHitDiceProjection {
  const sheet = sheetFixture({
    characterId: "character:hp-rest-short-zero",
    build: baseBuild("class_fighter"),
    maximumHp: 12,
    hitPointMaximumReduction: 0,
    currentHp: 0,
  });
  const result = startShortRest({ sheet });
  return projectResult({
    outcome: "short-rest-start-zero-hp-rejected",
    sheet,
    result,
    replayIndex: 8,
  });
}

function rejectShortRestDurationTooShortProjection(): HpRestHitDiceProjection {
  const sheet = woundedWizardSheet("character:hp-rest-short-too-short");
  const rest = requireRight(startShortRest({ sheet }));
  const result = finishShortRest({
    rest,
    restedTicks: elapsedTimeTicks(Number(CHARACTER_SHEET_SHORT_REST_TICKS) - 1),
  });
  return projectResult({
    outcome: "short-rest-duration-too-short-rejected",
    sheet,
    result,
    replayIndex: 9,
  });
}

function rejectLongRestDurationTooShortProjection(): HpRestHitDiceProjection {
  const sheet = woundedWizardSheet("character:hp-rest-long-too-short");
  const rest = requireRight(
    startLongRest({ sheet, timing: { tag: "noPriorLongRest" } }),
  );
  const result = finishLongRest({
    rest,
    restedTicks: elapsedTimeTicks(
      Number(CHARACTER_SHEET_LONG_REST_BASE_TICKS) - 1,
    ),
  });
  return projectResult({
    outcome: "long-rest-duration-too-short-rejected",
    sheet,
    result,
    requiredLongRestTicks: CHARACTER_SHEET_LONG_REST_BASE_TICKS,
    replayIndex: 10,
  });
}

function rejectLongRestPhysicalExertionTooShortProjection(): HpRestHitDiceProjection {
  const sheet = woundedWizardSheet("character:hp-rest-long-physical-too-short");
  const result = interruptLongRest({
    rest: requireRight(
      startLongRest({ sheet, timing: { tag: "noPriorLongRest" } }),
    ),
    unitLibrary,
    restedTicks: CHARACTER_SHEET_SHORT_REST_TICKS,
    interruption: {
      tag: "physicalExertion",
      durationTicks: elapsedTimeTicks(
        Number(CHARACTER_SHEET_SHORT_REST_TICKS) - 1,
      ),
    },
  });
  return projectResult({
    outcome: "long-rest-physical-exertion-too-short-rejected",
    sheet,
    result,
    replayIndex: 11,
  });
}

function rejectLongRestBeforeSixteenHourWaitProjection(): HpRestHitDiceProjection {
  const sheet = sheetFixture({
    characterId: "character:hp-rest-wait",
    build: baseBuild("class_fighter"),
    maximumHp: 12,
    hitPointMaximumReduction: 0,
    currentHp: 12,
  });
  const elapsedTicks = elapsedTimeTicks(
    Number(CHARACTER_SHEET_LONG_REST_WAIT_TICKS) - 1,
  );
  const gate = characterSheetLongRestCalendarGate({
    tag: "elapsedSinceLastLongRest",
    elapsedTicks,
  });
  const result = startLongRest({
    sheet,
    timing: {
      tag: "elapsedSinceLastLongRest",
      elapsedTicks,
    },
  });
  return projectResult({
    outcome: "long-rest-sixteen-hour-wait-rejected",
    sheet,
    result,
    remainingWaitTicks: gate.tag === "mustWait" ? gate.remainingTicks : 0,
    replayIndex: 2,
  });
}

function spendShortRestHitPointDieProjection(): HpRestHitDiceProjection {
  const sheet = woundedWizardSheet("character:hp-rest-short-rest");
  const rested = requireRight(
    completeShortRest({
      completion: shortRestCompletionForSheet(sheet),
      unitLibrary,
      spendHitDice: [{ classUnitId: "class_wizard", roll: DieRollResult(4) }],
    }),
  );
  return projectAccepted({
    outcome: "short-rest-spend-hit-point-die",
    sheet: rested,
    replayIndex: 3,
  });
}

function spendShortRestHitPointDiceSequentiallyProjection(): HpRestHitDiceProjection {
  const sheet = woundedWizardSheet("character:hp-rest-short-rest-loop");
  const rested = requireRight(
    completeShortRest({
      completion: shortRestCompletionForSheet(sheet),
      unitLibrary,
      spendHitDice: [
        { classUnitId: "class_wizard", roll: DieRollResult(4) },
        { classUnitId: "class_wizard", roll: DieRollResult(3) },
      ],
    }),
  );
  return projectAccepted({
    outcome: "short-rest-spend-hit-point-dice-sequentially",
    sheet: rested,
    replayIndex: 12,
  });
}

function rejectLongRestInterruptionAtRequiredDurationProjection(): HpRestHitDiceProjection {
  const sheet = woundedWizardSheet("character:hp-rest-long-interrupt-complete");
  const result = interruptLongRest({
    rest: requireRight(
      startLongRest({ sheet, timing: { tag: "noPriorLongRest" } }),
    ),
    unitLibrary,
    restedTicks: CHARACTER_SHEET_LONG_REST_BASE_TICKS,
    interruption: "takeDamage",
  });
  return projectResult({
    outcome: "long-rest-interruption-at-required-duration-rejected",
    sheet,
    result,
    requiredLongRestTicks: Number(CHARACTER_SHEET_LONG_REST_BASE_TICKS),
    replayIndex: 13,
  });
}

function interruptShortRestNoBenefitProjection(): HpRestHitDiceProjection {
  const sheet = woundedWizardSheet("character:hp-rest-short-interrupt");
  const interrupted = interruptShortRest({
    rest: requireRight(startShortRest({ sheet })),
    interruption: "takeDamage",
  });
  return projectAccepted({
    outcome: "short-rest-interrupted-no-benefit",
    sheet: interrupted.sheet,
    replayIndex: 4,
  });
}

function completeLongRestRestoresHpHitPointDiceAndMaximumProjection(): HpRestHitDiceProjection {
  const sheet = sheetFixture({
    characterId: "character:hp-rest-long-rest",
    build: wizardBuild(),
    maximumHp: 18,
    currentHp: 7,
    temporaryHitPoints: 2,
    hitPointMaximumReduction: 6,
    spentHitDice: 1,
  });
  const rested = requireRight(
    completeLongRest({
      completion: longRestCompletionForSheet(sheet),
      unitLibrary,
    }),
  );
  return projectAccepted({
    outcome: "long-rest-restores-hp-hit-point-dice-and-maximum",
    sheet: rested,
    replayIndex: 5,
  });
}

function interruptLongRestBeforeOneHourNoBenefitProjection(): HpRestHitDiceProjection {
  const sheet = woundedWizardSheet("character:hp-rest-long-early");
  const interrupted = requireRight(
    interruptLongRest({
      rest: requireRight(
        startLongRest({ sheet, timing: { tag: "noPriorLongRest" } }),
      ),
      unitLibrary,
      restedTicks: elapsedTimeTicks(
        Number(CHARACTER_SHEET_SHORT_REST_TICKS) - 1,
      ),
      interruption: "castNonCantripSpell",
    }),
  );
  return projectAccepted({
    outcome: "long-rest-interrupted-before-one-hour-no-benefit",
    sheet: interrupted.rest.sheet,
    requiredLongRestTicks: interrupted.requiredLongRestTicks,
    replayIndex: 6,
  });
}

function interruptLongRestWithShortRestBenefitsProjection(): HpRestHitDiceProjection {
  const interrupted = requireRight(
    interruptLongRest({
      rest: requireRight(
        startLongRest({
          sheet: woundedWizardSheet("character:hp-rest-long-short-benefit"),
          timing: { tag: "noPriorLongRest" },
        }),
      ),
      unitLibrary,
      restedTicks: CHARACTER_SHEET_SHORT_REST_TICKS,
      interruption: "rollInitiative",
      spendHitDice: [{ classUnitId: "class_wizard", roll: DieRollResult(4) }],
    }),
  );
  return projectAccepted({
    outcome: "long-rest-interrupted-with-short-rest-benefits",
    sheet: interrupted.rest.sheet,
    requiredLongRestTicks: interrupted.requiredLongRestTicks,
    replayIndex: 7,
  });
}

function initialProjection(): HpRestHitDiceProjection {
  return {
    outcome: "init",
    accepted: false,
    message: "none",
    currentHp: 0,
    hitPointMaximum: 1,
    hitPointMaximumReduction: 0,
    temporaryHitPoints: 0,
    spentHitDice: 0,
    requiredLongRestTicks: 0,
    remainingWaitTicks: 0,
    replayIndex: 0,
  };
}

function shortRestCompletionForSheet(sheet: CharacterSheet) {
  const rest = requireRight(startShortRest({ sheet }));
  return requireRight(
    finishShortRest({ rest, restedTicks: CHARACTER_SHEET_SHORT_REST_TICKS }),
  );
}

function longRestCompletionForSheet(sheet: CharacterSheet) {
  const rest = requireRight(
    startLongRest({ sheet, timing: { tag: "noPriorLongRest" } }),
  );
  return requireRight(
    finishLongRest({ rest, restedTicks: CHARACTER_SHEET_LONG_REST_BASE_TICKS }),
  );
}

function projectResult(input: {
  readonly outcome: HpRestHitDiceScenario;
  readonly sheet: CharacterSheet;
  readonly result: Either.Either<unknown, { readonly message: string }>;
  readonly requiredLongRestTicks?: number | undefined;
  readonly remainingWaitTicks?: number | undefined;
  readonly replayIndex: number;
}): HpRestHitDiceProjection {
  return Either.isRight(input.result)
    ? projectAccepted({
        outcome: input.outcome,
        sheet: input.sheet,
        requiredLongRestTicks: input.requiredLongRestTicks,
        remainingWaitTicks: input.remainingWaitTicks,
        replayIndex: input.replayIndex,
      })
    : projectFromSheet({
        outcome: input.outcome,
        accepted: false,
        message: input.result.left.message,
        sheet: input.sheet,
        requiredLongRestTicks: input.requiredLongRestTicks,
        remainingWaitTicks: input.remainingWaitTicks,
        replayIndex: input.replayIndex,
      });
}

function projectAccepted(input: {
  readonly outcome: HpRestHitDiceScenario;
  readonly sheet: CharacterSheet;
  readonly requiredLongRestTicks?: number | undefined;
  readonly remainingWaitTicks?: number | undefined;
  readonly replayIndex: number;
}): HpRestHitDiceProjection {
  return projectFromSheet({
    outcome: input.outcome,
    accepted: true,
    message: "none",
    sheet: input.sheet,
    requiredLongRestTicks: input.requiredLongRestTicks,
    remainingWaitTicks: input.remainingWaitTicks,
    replayIndex: input.replayIndex,
  });
}

function projectFromSheet(input: {
  readonly outcome: HpRestHitDiceScenario;
  readonly accepted: boolean;
  readonly message: string;
  readonly sheet: CharacterSheet;
  readonly requiredLongRestTicks?: number | undefined;
  readonly remainingWaitTicks?: number | undefined;
  readonly replayIndex: number;
}): HpRestHitDiceProjection {
  return {
    outcome: input.outcome,
    accepted: input.accepted,
    message: input.message,
    currentHp: Number(characterSheetCurrentHp(input.sheet)),
    hitPointMaximum: Number(characterSheetHitPointMaximum(input.sheet)),
    hitPointMaximumReduction: Number(input.sheet.hitPointMaximumReduction),
    temporaryHitPoints: Number(characterSheetTempHp(input.sheet)),
    spentHitDice: spentHitDiceTotal(input.sheet),
    requiredLongRestTicks: Number(input.requiredLongRestTicks ?? 0),
    remainingWaitTicks: Number(input.remainingWaitTicks ?? 0),
    replayIndex: input.replayIndex,
  };
}

function spentHitDiceTotal(sheet: CharacterSheet): number {
  return requireRight(characterSheetHitDice(sheet, unitLibrary)).reduce(
    (total, pool) => total + Number(pool.spent),
    0,
  );
}

function woundedWizardSheet(characterIdText: string): CharacterSheet {
  return sheetFixture({
    characterId: characterIdText,
    build: wizardBuild(),
    maximumHp: 18,
    hitPointMaximumReduction: 0,
    currentHp: 7,
  });
}

function sheetFixture(input: {
  readonly characterId: string;
  readonly build: CharacterBuild;
  readonly maximumHp: number;
  readonly hitPointMaximumReduction: number;
  readonly currentHp: number;
  readonly temporaryHitPoints?: number;
  readonly spentHitDice?: number;
}): CharacterSheet {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId(input.characterId),
      build: input.build,
      maximumHp: Hp(input.maximumHp),
      currentHp: Hp(input.currentHp),
      tempHp: Hp(input.temporaryHitPoints ?? 0),
      hitPointMaximumReduction: Hp(input.hitPointMaximumReduction),
      conditions: [],
      unitLibrary,
      spentHitDice:
        input.spentHitDice === undefined
          ? []
          : [
              {
                classUnitId: "class_wizard",
                spent: resourceCount(input.spentHitDice),
              },
            ],
    }),
  );
}

function wizardBuild(): CharacterBuild {
  return {
    ...baseBuild("class_wizard", ["class_wizard"]),
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_wizard",
          spellcastingAbility: "int",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [{ spellLevel: 1, count: 3 }],
        },
      },
    },
  };
}

function baseBuild(
  startingClass: string,
  advancements: readonly string[] = [],
): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(startingClass),
      advancements: advancements.map((classId) => ({
        classUnitId: classUnitId(classId),
        hitPointRule: { tag: "fixedHigherLevelGain" },
      })),
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: requireRight(
      abilityScoreAssignment({
        str: 13,
        dex: 14,
        con: 13,
        int: 8,
        wis: 16,
        cha: 10,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    equipment: {
      owned: [],
      loadout: {},
    },
  };
}

function normalizeHpRestHitDiceQuintState(
  raw: unknown,
): HpRestHitDiceProjection {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint HP/rest/Hit Dice state object.");
  }
  const root: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  const state = recordField(root, "qState");
  return {
    outcome: outcomeField(state["outcome"]),
    accepted: booleanField(state["accepted"], "qState.accepted"),
    message: stringField(state["message"], "qState.message"),
    currentHp: numberFromQuintInt(state["currentHp"], "qState.currentHp"),
    hitPointMaximum: numberFromQuintInt(
      state["hitPointMaximum"],
      "qState.hitPointMaximum",
    ),
    hitPointMaximumReduction: numberFromQuintInt(
      state["hitPointMaximumReduction"],
      "qState.hitPointMaximumReduction",
    ),
    temporaryHitPoints: numberFromQuintInt(
      state["temporaryHitPoints"],
      "qState.temporaryHitPoints",
    ),
    spentHitDice: numberFromQuintInt(
      state["spentHitDice"],
      "qState.spentHitDice",
    ),
    requiredLongRestTicks: numberFromQuintInt(
      state["requiredLongRestTicks"],
      "qState.requiredLongRestTicks",
    ),
    remainingWaitTicks: numberFromQuintInt(
      state["remainingWaitTicks"],
      "qState.remainingWaitTicks",
    ),
    replayIndex: numberFromQuintInt(state["replayIndex"], "qState.replayIndex"),
  };
}

function compareHpRestHitDiceState(
  runtime: HpRestHitDiceProjection,
  quint: HpRestHitDiceProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw error;
  }
  return true;
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(raw: unknown, field: string): boolean {
  if (typeof raw === "boolean") return raw;
  throw new Error(`Expected Quint boolean field ${field}.`);
}

function stringField(raw: unknown, field: string): string {
  if (typeof raw === "string") return raw;
  throw new Error(`Expected Quint string field ${field}.`);
}

const qntOutcomeByVariant = {
  CharacterSheetHpRestHitDiceInit: "init",
  CharacterSheetHpRestHitDiceLongRestStartZeroHpRejected:
    "long-rest-start-zero-hp-rejected",
  CharacterSheetHpRestHitDiceLongRestSixteenHourWaitRejected:
    "long-rest-sixteen-hour-wait-rejected",
  CharacterSheetHpRestHitDiceShortRestSpendHitPointDie:
    "short-rest-spend-hit-point-die",
  CharacterSheetHpRestHitDiceShortRestInterruptedNoBenefit:
    "short-rest-interrupted-no-benefit",
  CharacterSheetHpRestHitDiceLongRestRestoresHpHitPointDiceAndMaximum:
    "long-rest-restores-hp-hit-point-dice-and-maximum",
  CharacterSheetHpRestHitDiceLongRestInterruptedBeforeOneHourNoBenefit:
    "long-rest-interrupted-before-one-hour-no-benefit",
  CharacterSheetHpRestHitDiceLongRestInterruptedWithShortRestBenefits:
    "long-rest-interrupted-with-short-rest-benefits",
  CharacterSheetHpRestHitDiceShortRestStartZeroHpRejected:
    "short-rest-start-zero-hp-rejected",
  CharacterSheetHpRestHitDiceShortRestDurationTooShortRejected:
    "short-rest-duration-too-short-rejected",
  CharacterSheetHpRestHitDiceLongRestDurationTooShortRejected:
    "long-rest-duration-too-short-rejected",
  CharacterSheetHpRestHitDiceLongRestPhysicalExertionTooShortRejected:
    "long-rest-physical-exertion-too-short-rejected",
  CharacterSheetHpRestHitDiceShortRestSpendHitPointDiceSequentially:
    "short-rest-spend-hit-point-dice-sequentially",
  CharacterSheetHpRestHitDiceLongRestInterruptionAtRequiredDurationRejected:
    "long-rest-interruption-at-required-duration-rejected",
} as const;

function outcomeField(
  raw: unknown,
): (typeof qntOutcomeByVariant)[keyof typeof qntOutcomeByVariant] {
  const tag = nullaryVariantTag(raw, "qState.outcome");
  const outcome = Object.entries(qntOutcomeByVariant).find(
    ([variant]) => variant === tag,
  )?.[1];
  if (outcome !== undefined) return outcome;
  throw new Error(`Unknown Quint outcome variant ${tag}.`);
}

function nullaryVariantTag(raw: unknown, field: string): string {
  if (typeof raw === "string") return raw;
  if (raw !== null && typeof raw === "object" && "tag" in raw) {
    const record = Object.fromEntries(Object.entries(raw));
    const tag = record["tag"];
    if (typeof tag === "string") return tag;
  }
  throw new Error(`Expected Quint variant field ${field}.`);
}

function requireRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error(`Expected Either.right, got ${JSON.stringify(either.left)}.`);
}

function recordField(
  raw: Readonly<Record<string, unknown>>,
  field: string,
): Readonly<Record<string, unknown>> {
  const value = raw[field];
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Expected Quint record field ${field}.`);
  }
  return Object.fromEntries(Object.entries(value));
}
