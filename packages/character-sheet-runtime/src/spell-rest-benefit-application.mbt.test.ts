// KERNEL-COVERAGE: parity-witness SHEET.SPELL_REST_BENEFIT.APPLICATION
import * as path from "node:path";

import {
  classUnitId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { abilityScoreAssignment } from "@dnd/character-creation-runtime";
import { DieRollResult, Hp, spellSlotLevel } from "@dnd/shared/types";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  applyCharacterSheetSpellRestBenefit,
  characterSheetCurrentHp,
  characterSheetHitDice,
  characterSheetId,
  characterSheetSpellSlots,
  createFreshCharacterSheet,
  type CharacterSheet,
} from "./index.ts";

const spellRestBenefitScenarios = [
  "init",
  "applied",
  "recipient-lockout-rejected",
] as const;
type SpellRestBenefitScenario = (typeof spellRestBenefitScenarios)[number];
const spellRestBenefitReplayStepCount = spellRestBenefitScenarios.length - 1;

type SpellRestBenefitProjection = {
  readonly lastResult: SpellRestBenefitScenario;
  readonly slotSpent: boolean;
  readonly shortRestBenefitApplied: boolean;
  readonly healingApplied: boolean;
  readonly longRestLockoutStored: boolean;
  readonly replayIndex: number;
};

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Character Sheet Spell Rest Benefit Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const driverSchema = {
  init: {},
  doApplyPrayerOfHealingRestBenefit: {},
  doRejectRecipientLongRestLockout: {},
  step: {},
} as const;

function createSpellRestBenefitDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doApplyPrayerOfHealingRestBenefit: () => {
        projection = projectPrayerOfHealingApplication();
      },
      doRejectRecipientLongRestLockout: () => {
        projection = projectPrayerOfHealingRecipientLockoutRejection();
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

const spellRestBenefitStateCheck = stateCheck(
  normalizeSpellRestBenefitQuintState,
  compareSpellRestBenefitState,
);

describe("Character Sheet Spell Rest Benefit deterministic QNT replay", () => {
  it("replays Prayer of Healing slot spend, Short Rest benefit, healing, and lockout", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-sheet-spell-rest-benefit-application.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createSpellRestBenefitDriver(),
      backend: "typescript",
      nTraces: 1,
      maxSteps: spellRestBenefitReplayStepCount,
      stateCheck: spellRestBenefitStateCheck,
    });
  }, 120_000);
});

function initialProjection(): SpellRestBenefitProjection {
  return {
    lastResult: "init",
    slotSpent: false,
    shortRestBenefitApplied: false,
    healingApplied: false,
    longRestLockoutStored: false,
    replayIndex: 0,
  };
}

function projectPrayerOfHealingApplication(): SpellRestBenefitProjection {
  const caster = prayerCaster();
  const recipient = woundedFighter("character:prayer-recipient");
  const result = requireRight(
    applyCharacterSheetSpellRestBenefit({
      caster,
      spellId: "prayer_of_healing",
      unitLibrary,
      castLevel: spellSlotLevel(2),
      recipients: [
        {
          sheet: recipient,
          eligibility: { remainedWithinRangeForEntireCasting: true },
          spendHitDice: [
            { classUnitId: "class_fighter", roll: DieRollResult(4) },
          ],
          healingRolls: [DieRollResult(5), DieRollResult(6)],
        },
      ],
    }),
  );
  const recipientAfter = result.recipients[0] ?? fail("Expected recipient.");

  return {
    lastResult: "applied",
    slotSpent: spellSlotExpended(result.caster, 2) === 1,
    shortRestBenefitApplied:
      requireRight(characterSheetHitDice(recipientAfter, unitLibrary))[0]
        ?.spent === 1,
    healingApplied:
      characterSheetCurrentHp(recipientAfter) >
      characterSheetCurrentHp(recipient),
    longRestLockoutStored: hasPrayerOfHealingLockout(recipientAfter),
    replayIndex: 1,
  };
}

function projectPrayerOfHealingRecipientLockoutRejection(): SpellRestBenefitProjection {
  const caster = prayerCaster();
  const lockedRecipient = projectLockedRecipient();
  const rejected = applyCharacterSheetSpellRestBenefit({
    caster,
    spellId: "prayer_of_healing",
    unitLibrary,
    castLevel: spellSlotLevel(2),
    recipients: [
      {
        sheet: lockedRecipient,
        eligibility: { remainedWithinRangeForEntireCasting: true },
        healingRolls: [DieRollResult(1), DieRollResult(1)],
      },
    ],
  });
  if (Either.isRight(rejected)) {
    throw new Error("Expected Prayer of Healing recipient lockout rejection.");
  }

  return {
    lastResult: "recipient-lockout-rejected",
    slotSpent: false,
    shortRestBenefitApplied: false,
    healingApplied: false,
    longRestLockoutStored: hasPrayerOfHealingLockout(lockedRecipient),
    replayIndex: 2,
  };
}

function projectLockedRecipient(): CharacterSheet {
  const first = requireRight(
    applyCharacterSheetSpellRestBenefit({
      caster: prayerCaster(),
      spellId: "prayer_of_healing",
      unitLibrary,
      castLevel: spellSlotLevel(2),
      recipients: [
        {
          sheet: woundedFighter("character:locked-recipient"),
          eligibility: { remainedWithinRangeForEntireCasting: true },
          healingRolls: [DieRollResult(2), DieRollResult(2)],
        },
      ],
    }),
  );
  return first.recipients[0] ?? fail("Expected locked recipient.");
}

function prayerCaster(): CharacterSheet {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId("character:prayer-caster"),
      build: prayerOfHealingClericBuild(),
      maximumHp: Hp(18),
      hitPointMaximumReduction: Hp(0),
      currentHp: Hp(18),
      tempHp: Hp(0),
      conditions: [],
      unitLibrary,
    }),
  );
}

function woundedFighter(characterId: string): CharacterSheet {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId(characterId),
      build: characterBuild({ startingClass: "class_fighter" }),
      maximumHp: Hp(12),
      hitPointMaximumReduction: Hp(0),
      currentHp: Hp(3),
      tempHp: Hp(0),
      conditions: [],
      unitLibrary,
    }),
  );
}

function characterBuild(input: {
  readonly startingClass: string;
}): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(input.startingClass),
      advancements: [],
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

function prayerOfHealingClericBuild(): CharacterBuild {
  const build = characterBuild({ startingClass: "class_cleric" });
  return {
    ...build,
    progression: {
      ...build.progression,
      advancements: [
        {
          classUnitId: classUnitId("class_cleric"),
          hitPointRule: { tag: "fixedHigherLevelGain" },
        },
        {
          classUnitId: classUnitId("class_cleric"),
          hitPointRule: { tag: "fixedHigherLevelGain" },
        },
      ],
    },
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_cleric",
          spellcastingAbility: "wis",
          cantrips: [],
          spellbook: [],
          preparedSpells: ["prayer_of_healing"],
          spellcastingFocuses: ["holy_symbol"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [
            { spellLevel: 1, count: 4 },
            { spellLevel: 2, count: 2 },
          ],
        },
      },
    },
  };
}

function spellSlotExpended(sheet: CharacterSheet, spellLevel: number): number {
  return (
    characterSheetSpellSlots(sheet)?.find(
      (slot) => slot.spellLevel === spellLevel,
    )?.expended ?? 0
  );
}

function hasPrayerOfHealingLockout(sheet: CharacterSheet): boolean {
  return sheet.restFeatureUses.some(
    (use) =>
      use.tag === "spellRecipientRestLockout" &&
      use.spellId === "prayer_of_healing" &&
      use.usedSinceLongRest,
  );
}

function normalizeSpellRestBenefitQuintState(
  raw: unknown,
): SpellRestBenefitProjection {
  const state = quintStateRecord(raw);
  return {
    lastResult: scenarioField(state["qLastResult"]),
    slotSpent: booleanField(state["qSlotSpent"], "qSlotSpent"),
    shortRestBenefitApplied: booleanField(
      state["qShortRestBenefitApplied"],
      "qShortRestBenefitApplied",
    ),
    healingApplied: booleanField(state["qHealingApplied"], "qHealingApplied"),
    longRestLockoutStored: booleanField(
      state["qLongRestLockoutStored"],
      "qLongRestLockoutStored",
    ),
    replayIndex: numberFromQuintInt(state["qReplayIndex"], "qReplayIndex"),
  };
}

function compareSpellRestBenefitState(
  runtime: SpellRestBenefitProjection,
  quint: SpellRestBenefitProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message);
    throw error;
  }
  return true;
}

function scenarioField(raw: unknown): SpellRestBenefitScenario {
  if (typeof raw === "string" && isSpellRestBenefitScenario(raw)) return raw;
  throw new Error(`Unknown Spell Rest Benefit scenario ${String(raw)}.`);
}

function isSpellRestBenefitScenario(
  raw: string,
): raw is SpellRestBenefitScenario {
  return spellRestBenefitScenarios.some((scenario) => scenario === raw);
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint Spell Rest Benefit state.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function booleanField(raw: unknown, field: string): boolean {
  if (typeof raw === "boolean") return raw;
  throw new Error(`Expected boolean field ${field}.`);
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function requireRight<T, E>(result: Either.Either<T, E>): T {
  if (Either.isRight(result)) return result.right;
  const left = result.left;
  if (
    left !== null &&
    typeof left === "object" &&
    "message" in left &&
    typeof left.message === "string"
  ) {
    throw new Error(left.message);
  }
  throw new Error(JSON.stringify(left));
}

function fail(message: string): never {
  throw new Error(message);
}
