// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B6-CLASS-FEATURE-IDENTITY-BATCH-3 warlock_magical_cunning
// UNIT-IDENTITY-MBT-REPLAY: B6-CLASS-FEATURE-IDENTITY-BATCH-3 warlock_magical_cunning doMagicalCunningRecoversPactSlots doRejectMagicalCunningWithoutExpendedPactSlots
// KERNEL-COVERAGE: parity-witness SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS
// KERNEL-COVERAGE: parity-witness SHEET.SPELL_SLOTS.TABLE_DERIVATION
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import {
  abilityScoreAssignment,
  classUnitId,
  classSpellcastingCreationAtLevel,
  isListPreparedSpellcastingCreation,
  isPactMagicSpellcastingCreation,
  isWizardSpellcastingCreation,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import { readClassCreationFacts } from "@dnd/surface/surface/character-creation-readers";
import { Hp, resourceCount, spellSlotLevel } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  CHARACTER_SHEET_LONG_REST_BASE_TICKS,
  CHARACTER_SHEET_SHORT_REST_TICKS,
  characterSheetId,
  characterSheetPactSlots,
  characterSheetSpellSlotSourceState,
  completeLongRest,
  completeMagicalCunningRite,
  completeShortRest,
  convertFontOfMagicSorceryPointsToSpellSlot,
  createFreshCharacterSheet,
  finishLongRest,
  finishShortRest,
  interruptLongRest,
  interruptShortRest,
  startLongRest,
  startShortRest,
  type CharacterSheet,
  type CharacterSheetArcaneRecoverySlotRefund,
} from "./index.ts";

const slotScenarios = [
  "init",
  "ordinary-capacity-mismatch-rejected",
  "pact-expenditure-over-capacity-rejected",
  "short-rest-restores-pact-slots-only",
  "short-rest-arcane-recovery-refunds-ordinary-spell-slot",
  "long-rest-restores-ordinary-pact-and-clears-created-slots",
  "short-rest-interrupted-no-slot-benefit",
  "long-rest-interrupted-before-one-hour-no-slot-benefit",
  "long-rest-interrupted-with-short-rest-slot-benefits",
  "magical-cunning-recovers-pact-slots",
  "magical-cunning-no-expended-pact-slots-rejected",
  "arcane-recovery-pact-slot-refund-rejected",
] as const;
type SlotScenario = (typeof slotScenarios)[number];
const slotReplayStepCount = slotScenarios.length - 1;

type SlotProjection = {
  readonly lastResult: SlotScenario;
  readonly accepted: boolean;
  readonly message: string;
  readonly ordinaryLevel1Capacity: number;
  readonly ordinaryLevel1Expended: number;
  readonly ordinaryLevel2Capacity: number;
  readonly ordinaryLevel2Expended: number;
  readonly createdLevel1Capacity: number;
  readonly createdLevel1Expended: number;
  readonly pactSlotLevel: number;
  readonly pactSlotCapacity: number;
  readonly pactSlotExpended: number;
  readonly arcaneRecoveryUsedSinceLongRest: boolean;
  readonly magicalCunningUsedSinceLongRest: boolean;
  readonly replayIndex: number;
};

const driverSchema = {
  init: {},
  doRejectMismatchedOrdinarySpellSlotCapacity: {},
  doRejectPactSlotExpenditureOverCapacity: {},
  doShortRestRestoresPactSlotsOnly: {},
  doShortRestArcaneRecoveryRefundsOrdinarySpellSlot: {},
  doCompleteLongRestRestoresOrdinaryPactAndClearsCreatedSlots: {},
  doInterruptShortRestNoSlotBenefit: {},
  doInterruptLongRestBeforeOneHourNoSlotBenefit: {},
  doInterruptLongRestWithShortRestSlotBenefits: {},
  doMagicalCunningRecoversPactSlots: {},
  doRejectMagicalCunningWithoutExpendedPactSlots: {},
  doRejectArcaneRecoveryPactSlotRefund: {},
  step: {},
} as const;
type SlotDriverAction = Exclude<keyof typeof driverSchema, "init" | "step">;
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly SlotDriverAction[];
  readonly expected: SlotProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "B6-CLASS-FEATURE-IDENTITY-BATCH-3";
  readonly unitId: "warlock_magical_cunning";
  readonly actions: readonly SlotDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Character Sheet Spell Slot/Pact Slot Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const slotStateCheck = stateCheck(normalizeSlotQuintState, compareSlotState);

const selectedUnitIdentityReplays = [
  {
    taskId: "B6-CLASS-FEATURE-IDENTITY-BATCH-3",
    unitId: "warlock_magical_cunning",
    actions: [
      "doMagicalCunningRecoversPactSlots",
      "doRejectMagicalCunningWithoutExpendedPactSlots",
    ],
    sequences: [
      {
        name: "selected-warlock-magical-cunning-recovers-pact-slots",
        actions: ["doMagicalCunningRecoversPactSlots"],
        expected: magicalCunningRecoversPactSlotsProjection(),
      },
      {
        name: "selected-warlock-magical-cunning-rejects-fresh-pact-slots",
        actions: ["doRejectMagicalCunningWithoutExpendedPactSlots"],
        expected: rejectMagicalCunningWithoutExpendedPactSlotsProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet Spell Slot/Pact Slot deterministic QNT replay", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<SlotDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createSlotDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Character Sheet Spell Slot/Pact Slot action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Character Sheet Spell Slot/Pact Slot driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays slot capacity, current state, rest outcomes, and feature recovery", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-sheet-spell-slots-pact-slots.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createSlotDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: slotReplayStepCount,
      stateCheck: slotStateCheck,
    });
  }, 120_000);
});

function createSlotDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doRejectMismatchedOrdinarySpellSlotCapacity: () => {
        projection = rejectMismatchedOrdinarySpellSlotCapacityProjection();
      },
      doRejectPactSlotExpenditureOverCapacity: () => {
        projection = rejectPactSlotExpenditureOverCapacityProjection();
      },
      doShortRestRestoresPactSlotsOnly: () => {
        projection = shortRestRestoresPactSlotsOnlyProjection();
      },
      doShortRestArcaneRecoveryRefundsOrdinarySpellSlot: () => {
        projection =
          shortRestArcaneRecoveryRefundsOrdinarySpellSlotProjection();
      },
      doCompleteLongRestRestoresOrdinaryPactAndClearsCreatedSlots: () => {
        projection =
          completeLongRestRestoresOrdinaryPactAndClearsCreatedSlotsProjection();
      },
      doInterruptShortRestNoSlotBenefit: () => {
        projection = interruptShortRestNoSlotBenefitProjection();
      },
      doInterruptLongRestBeforeOneHourNoSlotBenefit: () => {
        projection = interruptLongRestBeforeOneHourNoSlotBenefitProjection();
      },
      doInterruptLongRestWithShortRestSlotBenefits: () => {
        projection = interruptLongRestWithShortRestSlotBenefitsProjection();
      },
      doMagicalCunningRecoversPactSlots: () => {
        projection = magicalCunningRecoversPactSlotsProjection();
      },
      doRejectMagicalCunningWithoutExpendedPactSlots: () => {
        projection = rejectMagicalCunningWithoutExpendedPactSlotsProjection();
      },
      doRejectArcaneRecoveryPactSlotRefund: () => {
        projection = rejectArcaneRecoveryPactSlotRefundProjection();
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function rejectMismatchedOrdinarySpellSlotCapacityProjection(): SlotProjection {
  const result = createFreshCharacterSheet({
    characterId: characterSheetId("character:slot-mismatch"),
    build: wizardSlotBuild({ wizardAdvancements: 1 }),
    maximumHp: Hp(12),
    currentHp: Hp(12),
    tempHp: Hp(0),
    hitPointMaximumReduction: Hp(0),
    conditions: [],
    unitLibrary,
    spellSlots: [
      {
        spellLevel: spellSlotLevel(1),
        count: resourceCount(2),
        expended: resourceCount(0),
      },
    ],
  });
  if (Either.isRight(result)) {
    throw new Error("Expected ordinary Spell Slot capacity mismatch.");
  }
  return projectFromParts({
    lastResult: "ordinary-capacity-mismatch-rejected",
    accepted: false,
    message: result.left.message,
    ordinaryLevel1Capacity: 3,
    replayIndex: 1,
  });
}

function rejectPactSlotExpenditureOverCapacityProjection(): SlotProjection {
  const result = createFreshCharacterSheet({
    characterId: characterSheetId("character:pact-mismatch"),
    build: warlockMagicalCunningBuild({
      warlockAdvancements: 1,
    }),
    maximumHp: Hp(12),
    currentHp: Hp(12),
    tempHp: Hp(0),
    hitPointMaximumReduction: Hp(0),
    conditions: [],
    unitLibrary,
    pactSlots: { expended: resourceCount(3) },
  });
  if (Either.isRight(result)) {
    throw new Error("Expected Pact Slot expenditure over capacity.");
  }
  return projectFromParts({
    lastResult: "pact-expenditure-over-capacity-rejected",
    accepted: false,
    message: result.left.message,
    pactSlotLevel: 1,
    pactSlotCapacity: 2,
    pactSlotExpended: 3,
    replayIndex: 2,
  });
}

function shortRestRestoresPactSlotsOnlyProjection(): SlotProjection {
  const sheet = wizardWarlockSpentSheet("character:short-rest-pact");
  const rested = requireRight(completeShortRestForSheet({ sheet }));
  return projectAccepted({
    lastResult: "short-rest-restores-pact-slots-only",
    sheet: rested,
    replayIndex: 3,
  });
}

function shortRestArcaneRecoveryRefundsOrdinarySpellSlotProjection(): SlotProjection {
  const sheet = arcaneRecoveryPactSheet({
    firstLevelExpended: 2,
    secondLevelExpended: 1,
    pactExpended: 1,
  });
  const rested = requireRight(
    completeShortRestForSheet({
      sheet,
      arcaneRecovery: {
        refundSpellSlots: [
          { spellLevel: spellSlotLevel(2), count: resourceCount(1) },
        ],
      },
    }),
  );
  return projectAccepted({
    lastResult: "short-rest-arcane-recovery-refunds-ordinary-spell-slot",
    sheet: rested,
    replayIndex: 4,
  });
}

function completeLongRestRestoresOrdinaryPactAndClearsCreatedSlotsProjection(): SlotProjection {
  const sheet = requireRight(
    convertFontOfMagicSorceryPointsToSpellSlot({
      sheet: sorcererWarlockLongRestSheet(),
      unitLibrary,
      spellLevel: spellSlotLevel(1),
    }),
  );
  const rested = requireRight(completeLongRestForSheet(sheet));
  return projectAccepted({
    lastResult: "long-rest-restores-ordinary-pact-and-clears-created-slots",
    sheet: rested,
    replayIndex: 5,
  });
}

function interruptShortRestNoSlotBenefitProjection(): SlotProjection {
  const sheet = wizardWarlockSpentSheet("character:short-rest-interrupt");
  const interrupted = interruptShortRest({
    rest: requireRight(startShortRest({ sheet })),
    interruption: "takeDamage",
  });
  return projectAccepted({
    lastResult: "short-rest-interrupted-no-slot-benefit",
    sheet: interrupted.sheet,
    replayIndex: 6,
  });
}

function interruptLongRestBeforeOneHourNoSlotBenefitProjection(): SlotProjection {
  const sheet = wizardWarlockSpentSheet("character:long-rest-early-interrupt");
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
    lastResult: "long-rest-interrupted-before-one-hour-no-slot-benefit",
    sheet: interrupted.rest.sheet,
    replayIndex: 7,
  });
}

function interruptLongRestWithShortRestSlotBenefitsProjection(): SlotProjection {
  const sheet = wizardWarlockSpentSheet("character:long-rest-short-benefit");
  const interrupted = requireRight(
    interruptLongRest({
      rest: requireRight(
        startLongRest({ sheet, timing: { tag: "noPriorLongRest" } }),
      ),
      unitLibrary,
      restedTicks: CHARACTER_SHEET_SHORT_REST_TICKS,
      interruption: "rollInitiative",
    }),
  );
  return projectAccepted({
    lastResult: "long-rest-interrupted-with-short-rest-slot-benefits",
    sheet: interrupted.rest.sheet,
    replayIndex: 8,
  });
}

function magicalCunningRecoversPactSlotsProjection(): SlotProjection {
  const sheet = warlockMagicalCunningSheet({
    characterIdText: "character:magical-cunning",
    warlockAdvancements: 1,
    pactExpended: 2,
  });
  const recovered = requireRight(
    completeMagicalCunningRite({ sheet, unitLibrary }),
  );
  return projectAccepted({
    lastResult: "magical-cunning-recovers-pact-slots",
    sheet: recovered,
    replayIndex: 9,
  });
}

function rejectMagicalCunningWithoutExpendedPactSlotsProjection(): SlotProjection {
  const sheet = warlockMagicalCunningSheet({
    characterIdText: "character:magical-cunning-no-expended",
    warlockAdvancements: 1,
    pactExpended: 0,
  });
  const result = completeMagicalCunningRite({ sheet, unitLibrary });
  if (Either.isRight(result)) {
    throw new Error("Expected Magical Cunning to reject fresh Pact Slots.");
  }
  return projectRejected({
    lastResult: "magical-cunning-no-expended-pact-slots-rejected",
    message: result.left.message,
    sheet,
    replayIndex: 10,
  });
}

function rejectArcaneRecoveryPactSlotRefundProjection(): SlotProjection {
  const sheet = arcaneRecoveryPactSheet({
    firstLevelExpended: 0,
    secondLevelExpended: 0,
    pactExpended: 1,
  });
  const result = completeShortRestForSheet({
    sheet,
    arcaneRecovery: {
      refundSpellSlots: [
        { spellLevel: spellSlotLevel(1), count: resourceCount(1) },
      ],
    },
  });
  if (Either.isRight(result)) {
    throw new Error("Expected Arcane Recovery to reject Pact Slot recovery.");
  }
  return projectRejected({
    lastResult: "arcane-recovery-pact-slot-refund-rejected",
    message: result.left.message,
    sheet,
    replayIndex: 11,
  });
}

function completeShortRestForSheet(input: {
  readonly sheet: CharacterSheet;
  readonly arcaneRecovery?:
    | {
        readonly refundSpellSlots: readonly CharacterSheetArcaneRecoverySlotRefund[];
      }
    | undefined;
}) {
  const rest = requireRight(startShortRest({ sheet: input.sheet }));
  const completion = requireRight(
    finishShortRest({ rest, restedTicks: CHARACTER_SHEET_SHORT_REST_TICKS }),
  );
  return completeShortRest({
    completion,
    unitLibrary,
    ...(input.arcaneRecovery === undefined
      ? {}
      : { arcaneRecovery: input.arcaneRecovery }),
  });
}

function completeLongRestForSheet(sheet: CharacterSheet) {
  const rest = requireRight(
    startLongRest({ sheet, timing: { tag: "noPriorLongRest" } }),
  );
  const completion = requireRight(
    finishLongRest({ rest, restedTicks: CHARACTER_SHEET_LONG_REST_BASE_TICKS }),
  );
  return completeLongRest({ completion, unitLibrary });
}

function wizardWarlockSpentSheet(characterIdText: string): CharacterSheet {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId(characterIdText),
      build: wizardWarlockSlotBuild(),
      maximumHp: Hp(12),
      currentHp: Hp(12),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary,
      spellSlots: [
        {
          spellLevel: spellSlotLevel(1),
          count: resourceCount(2),
          expended: resourceCount(1),
        },
      ],
      pactSlots: { expended: resourceCount(1) },
    }),
  );
}

function arcaneRecoveryPactSheet(input: {
  readonly firstLevelExpended: number;
  readonly secondLevelExpended: number;
  readonly pactExpended: number;
}): CharacterSheet {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId("character:arcane-recovery-pact"),
      build: wizard4BuildWithPactSlots(),
      maximumHp: Hp(18),
      currentHp: Hp(18),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary,
      spellSlots: [
        {
          spellLevel: spellSlotLevel(1),
          count: resourceCount(4),
          expended: resourceCount(input.firstLevelExpended),
        },
        {
          spellLevel: spellSlotLevel(2),
          count: resourceCount(3),
          expended: resourceCount(input.secondLevelExpended),
        },
      ],
      pactSlots: { expended: resourceCount(input.pactExpended) },
    }),
  );
}

function sorcererWarlockLongRestSheet(): CharacterSheet {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId("character:long-rest-created-slot"),
      build: sorcererWarlockSlotBuild(),
      maximumHp: Hp(18),
      currentHp: Hp(18),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary,
      spellSlots: [
        {
          spellLevel: spellSlotLevel(1),
          count: resourceCount(3),
          expended: resourceCount(2),
        },
      ],
      pactSlots: { expended: resourceCount(1) },
    }),
  );
}

function warlockMagicalCunningSheet(input: {
  readonly characterIdText: string;
  readonly warlockAdvancements: number;
  readonly pactExpended: number;
}): CharacterSheet {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId(input.characterIdText),
      build: warlockMagicalCunningBuild({
        warlockAdvancements: input.warlockAdvancements,
      }),
      maximumHp: Hp(12),
      currentHp: Hp(12),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary,
      pactSlots: { expended: resourceCount(input.pactExpended) },
    }),
  );
}

function wizardSlotBuild(input: {
  readonly wizardAdvancements: number;
}): CharacterBuild {
  const wizardLevel = input.wizardAdvancements + 1;
  return {
    ...baseBuild({
      startingClass: "class_wizard",
      advancements: Array.from(
        { length: input.wizardAdvancements },
        () => "class_wizard",
      ),
    }),
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
          slots: requireSpellcastingSlotsForClassLevel(
            "class_wizard",
            wizardLevel,
          ),
        },
      },
    },
  };
}

function wizardWarlockSlotBuild(): CharacterBuild {
  const pactSlots = requirePactMagicSlotsForWarlockLevel(1);
  return {
    ...baseBuild({
      startingClass: "class_wizard",
    }),
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
        {
          sourceUnitId: "class_warlock",
          spellcastingAbility: "cha",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: requireSpellcastingSlotsForClassLevel("class_wizard", 1),
        },
        pactMagic: {
          kind: "pactMagic",
          slotLevel: pactSlots.spellLevel,
          count: pactSlots.count,
        },
      },
    },
  };
}

function wizard4BuildWithPactSlots(): CharacterBuild {
  const pactSlots = requirePactMagicSlotsForWarlockLevel(1);
  return {
    ...baseBuild({
      startingClass: "class_wizard",
      advancements: ["class_wizard", "class_wizard", "class_wizard"],
    }),
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
        {
          sourceUnitId: "class_warlock",
          spellcastingAbility: "cha",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: requireSpellcastingSlotsForClassLevel("class_wizard", 4),
        },
        pactMagic: {
          kind: "pactMagic",
          slotLevel: pactSlots.spellLevel,
          count: pactSlots.count,
        },
      },
    },
  };
}

function warlockMagicalCunningBuild(input: {
  readonly warlockAdvancements: number;
}): CharacterBuild {
  const warlockLevel = input.warlockAdvancements + 1;
  const pactSlots = requirePactMagicSlotsForWarlockLevel(warlockLevel);
  return {
    ...baseBuild({
      startingClass: "class_warlock",
      advancements: Array.from(
        { length: input.warlockAdvancements },
        () => "class_warlock",
      ),
    }),
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_warlock",
          spellcastingAbility: "cha",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        pactMagic: {
          kind: "pactMagic",
          slotLevel: pactSlots.spellLevel,
          count: pactSlots.count,
        },
      },
    },
  };
}

function sorcererWarlockSlotBuild(): CharacterBuild {
  const pactSlots = requirePactMagicSlotsForWarlockLevel(2);
  return {
    ...baseBuild({
      startingClass: "class_sorcerer",
      advancements: ["class_sorcerer"],
    }),
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_sorcerer",
          spellcastingAbility: "cha",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["arcane_focus"],
        },
        {
          sourceUnitId: "class_warlock",
          spellcastingAbility: "cha",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: requireSpellcastingSlotsForClassLevel("class_sorcerer", 2),
        },
        pactMagic: {
          kind: "pactMagic",
          slotLevel: pactSlots.spellLevel,
          count: pactSlots.count,
        },
      },
    },
  };
}

function baseBuild(input: {
  readonly startingClass: string;
  readonly advancements?: readonly string[];
}): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(input.startingClass),
      advancements: (input.advancements ?? []).map((classId) => ({
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
        int: 16,
        wis: 10,
        cha: 13,
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

function requireSpellcastingSlotsForClassLevel(
  classId: "class_sorcerer" | "class_wizard",
  level: number,
): readonly {
  readonly spellLevel: number;
  readonly count: number;
}[] {
  const projected = requireClassSpellcastingAtLevel(classId, level);
  if (
    isWizardSpellcastingCreation(projected) ||
    isListPreparedSpellcastingCreation(projected)
  ) {
    return projected.spellSlotProjection.slots;
  }
  throw new Error(
    `Expected ${classId} to project ordinary Spell Slots at class level ${level}.`,
  );
}

function requirePactMagicSlotsForWarlockLevel(level: number): {
  readonly spellLevel: number;
  readonly count: number;
} {
  const projected = requireClassSpellcastingAtLevel("class_warlock", level);
  if (isPactMagicSpellcastingCreation(projected)) {
    return {
      spellLevel: projected.pactSlotProjection.spellLevel,
      count: projected.pactSlotProjection.count,
    };
  }
  throw new Error(
    `Expected class_warlock to project Pact Magic slots at class level ${level}.`,
  );
}

function requireClassSpellcastingAtLevel(
  classId: "class_sorcerer" | "class_warlock" | "class_wizard",
  level: number,
) {
  const facts = readClassCreationFacts(unitLibrary.requireUnit(classId));
  if (facts.tag !== "readable" || !("spellcasting" in facts.value)) {
    throw new Error(`Expected readable spellcasting facts for ${classId}.`);
  }
  const projected = classSpellcastingCreationAtLevel(
    facts.value.spellcasting,
    level,
  );
  if (projected !== undefined) return projected;
  throw new Error(
    `Expected ${classId} spellcasting progression at class level ${level}.`,
  );
}

function initialProjection(): SlotProjection {
  return projectFromParts({
    lastResult: "init",
    accepted: false,
    message: "none",
    replayIndex: 0,
  });
}

function projectAccepted(input: {
  readonly lastResult: SlotScenario;
  readonly sheet: CharacterSheet;
  readonly replayIndex: number;
}): SlotProjection {
  return projectFromSheet({
    lastResult: input.lastResult,
    accepted: true,
    message: "none",
    sheet: input.sheet,
    replayIndex: input.replayIndex,
  });
}

function projectRejected(input: {
  readonly lastResult: SlotScenario;
  readonly message: string;
  readonly sheet: CharacterSheet;
  readonly replayIndex: number;
}): SlotProjection {
  return projectFromSheet({
    lastResult: input.lastResult,
    accepted: false,
    message: input.message,
    sheet: input.sheet,
    replayIndex: input.replayIndex,
  });
}

function projectFromSheet(input: {
  readonly lastResult: SlotScenario;
  readonly accepted: boolean;
  readonly message: string;
  readonly sheet: CharacterSheet;
  readonly replayIndex: number;
}): SlotProjection {
  const sourceState = characterSheetSpellSlotSourceState(input.sheet);
  const pactSlots = characterSheetPactSlots(input.sheet);
  return projectFromParts({
    lastResult: input.lastResult,
    accepted: input.accepted,
    message: input.message,
    ordinaryLevel1Capacity: ordinarySpellSlotCapacity(input.sheet, 1),
    ordinaryLevel1Expended: ordinarySpellSlotExpended(sourceState, 1),
    ordinaryLevel2Capacity: ordinarySpellSlotCapacity(input.sheet, 2),
    ordinaryLevel2Expended: ordinarySpellSlotExpended(sourceState, 2),
    createdLevel1Capacity: createdSpellSlotCapacity(sourceState, 1),
    createdLevel1Expended: createdSpellSlotExpended(sourceState, 1),
    pactSlotLevel: pactSlots?.slotLevel ?? 0,
    pactSlotCapacity: pactSlots?.count ?? 0,
    pactSlotExpended: pactSlots?.expended ?? 0,
    arcaneRecoveryUsedSinceLongRest: input.sheet.restFeatureUses.some(
      (use) => use.tag === "arcaneRecovery",
    ),
    magicalCunningUsedSinceLongRest: input.sheet.restFeatureUses.some(
      (use) => use.tag === "magicalCunning",
    ),
    replayIndex: input.replayIndex,
  });
}

function projectFromParts(
  input: Pick<
    SlotProjection,
    "lastResult" | "accepted" | "message" | "replayIndex"
  > &
    Partial<
      Omit<
        SlotProjection,
        "lastResult" | "accepted" | "message" | "replayIndex"
      >
    >,
): SlotProjection {
  return {
    lastResult: input.lastResult,
    accepted: input.accepted,
    message: input.message,
    ordinaryLevel1Capacity: input.ordinaryLevel1Capacity ?? 0,
    ordinaryLevel1Expended: input.ordinaryLevel1Expended ?? 0,
    ordinaryLevel2Capacity: input.ordinaryLevel2Capacity ?? 0,
    ordinaryLevel2Expended: input.ordinaryLevel2Expended ?? 0,
    createdLevel1Capacity: input.createdLevel1Capacity ?? 0,
    createdLevel1Expended: input.createdLevel1Expended ?? 0,
    pactSlotLevel: input.pactSlotLevel ?? 0,
    pactSlotCapacity: input.pactSlotCapacity ?? 0,
    pactSlotExpended: input.pactSlotExpended ?? 0,
    arcaneRecoveryUsedSinceLongRest:
      input.arcaneRecoveryUsedSinceLongRest ?? false,
    magicalCunningUsedSinceLongRest:
      input.magicalCunningUsedSinceLongRest ?? false,
    replayIndex: input.replayIndex,
  };
}

function ordinarySpellSlotCapacity(
  sheet: CharacterSheet,
  spellLevel: 1 | 2,
): number {
  const slots = sheet.build.spellcasting?.slotPools.spellcasting?.slots ?? [];
  return slots.find((slot) => slot.spellLevel === spellLevel)?.count ?? 0;
}

function ordinarySpellSlotExpended(
  sourceState:
    | NonNullable<ReturnType<typeof characterSheetSpellSlotSourceState>>
    | undefined,
  spellLevel: 1 | 2,
): number {
  return (
    sourceState?.ordinarySpellSlotExpenditures.find(
      (slot) => slot.spellLevel === spellLevel,
    )?.expended ?? 0
  );
}

function createdSpellSlotCapacity(
  sourceState:
    | NonNullable<ReturnType<typeof characterSheetSpellSlotSourceState>>
    | undefined,
  spellLevel: 1,
): number {
  return (
    sourceState?.createdSpellSlots.find(
      (slot) => slot.spellLevel === spellLevel,
    )?.count ?? 0
  );
}

function createdSpellSlotExpended(
  sourceState:
    | NonNullable<ReturnType<typeof characterSheetSpellSlotSourceState>>
    | undefined,
  spellLevel: 1,
): number {
  return (
    sourceState?.createdSpellSlots.find(
      (slot) => slot.spellLevel === spellLevel,
    )?.expended ?? 0
  );
}

function normalizeSlotQuintState(raw: unknown): SlotProjection {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint Spell Slot/Pact Slot state object.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  return {
    lastResult: scenarioField(state["qLastResult"]),
    accepted: booleanField(state["qAccepted"], "qAccepted"),
    message: stringField(state["qMessage"], "qMessage"),
    ordinaryLevel1Capacity: numberFromQuintInt(
      state["qOrdinaryLevel1Capacity"],
      "qOrdinaryLevel1Capacity",
    ),
    ordinaryLevel1Expended: numberFromQuintInt(
      state["qOrdinaryLevel1Expended"],
      "qOrdinaryLevel1Expended",
    ),
    ordinaryLevel2Capacity: numberFromQuintInt(
      state["qOrdinaryLevel2Capacity"],
      "qOrdinaryLevel2Capacity",
    ),
    ordinaryLevel2Expended: numberFromQuintInt(
      state["qOrdinaryLevel2Expended"],
      "qOrdinaryLevel2Expended",
    ),
    createdLevel1Capacity: numberFromQuintInt(
      state["qCreatedLevel1Capacity"],
      "qCreatedLevel1Capacity",
    ),
    createdLevel1Expended: numberFromQuintInt(
      state["qCreatedLevel1Expended"],
      "qCreatedLevel1Expended",
    ),
    pactSlotLevel: numberFromQuintInt(
      state["qPactSlotLevel"],
      "qPactSlotLevel",
    ),
    pactSlotCapacity: numberFromQuintInt(
      state["qPactSlotCapacity"],
      "qPactSlotCapacity",
    ),
    pactSlotExpended: numberFromQuintInt(
      state["qPactSlotExpended"],
      "qPactSlotExpended",
    ),
    arcaneRecoveryUsedSinceLongRest: booleanField(
      state["qArcaneRecoveryUsedSinceLongRest"],
      "qArcaneRecoveryUsedSinceLongRest",
    ),
    magicalCunningUsedSinceLongRest: booleanField(
      state["qMagicalCunningUsedSinceLongRest"],
      "qMagicalCunningUsedSinceLongRest",
    ),
    replayIndex: numberFromQuintInt(state["qReplayIndex"], "qReplayIndex"),
  };
}

function compareSlotState(
  runtime: SlotProjection,
  quint: SlotProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `${runtime.lastResult}: ${error.message}\nruntime=${JSON.stringify(runtime)}\nquint=${JSON.stringify(quint)}`,
      );
    }
    throw error;
  }
  return true;
}

function scenarioField(raw: unknown): SlotScenario {
  if (typeof raw === "string" && isSlotScenario(raw)) return raw;
  throw new Error(`Unknown Spell Slot/Pact Slot scenario ${String(raw)}.`);
}

function isSlotScenario(raw: string): raw is SlotScenario {
  return slotScenarios.some((scenario) => scenario === raw);
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

function requireRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error(`Expected Either.right, got ${JSON.stringify(either.left)}.`);
}
