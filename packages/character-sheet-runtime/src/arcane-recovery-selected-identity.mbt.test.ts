// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt short-rest-spell-slot-recovery wizard_arcane_recovery
// UNIT-IDENTITY-MBT-REPLAY: short-rest-spell-slot-recovery wizard_arcane_recovery doRecoverSecondLevelSpellSlot doResetArcaneRecoveryOnLongRest doRejectPactSlotArcaneRecovery
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import {
  abilityScoreAssignment,
  characterBuildFeatureUnitIds,
  classUnitId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import { Hp, resourceCount, spellSlotLevel } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  characterSheetId,
  characterSheetPactSlots,
  characterSheetSpellSlots,
  completeLongRest,
  completeShortRest,
  createFreshCharacterSheet,
  type CharacterSheet,
} from "./index.ts";

const WIZARD_ARCANE_RECOVERY_UNIT_ID = "wizard_arcane_recovery";
const ARCANE_RECOVERY_PACT_SLOT_REJECTION =
  "Arcane Recovery cannot refund more Spell Slots than are expended.";

const arcaneRecoverySelectedIdentityDriverSchema = {
  init: {},
  doRecoverSecondLevelSpellSlot: {},
  doResetArcaneRecoveryOnLongRest: {},
  doRejectPactSlotArcaneRecovery: {},
  step: {},
} as const;
type ArcaneRecoverySelectedIdentityDriverAction = Exclude<
  keyof typeof arcaneRecoverySelectedIdentityDriverSchema,
  "init" | "step"
>;

type ArcaneRecoverySelectedIdentityProjection =
  | {
      readonly lastResult: "init";
      readonly featureUnitId: "none";
      readonly firstLevelSpellSlotsExpended: 0;
      readonly secondLevelSpellSlotsExpended: 0;
      readonly pactSlotsExpended: 0;
      readonly arcaneRecoveryUsedSinceLongRest: false;
      readonly accepted: false;
      readonly message: "none";
      readonly recoveredCombinedSlotLevels: 0;
    }
  | {
      readonly lastResult: "short_rest_recovered";
      readonly featureUnitId: typeof WIZARD_ARCANE_RECOVERY_UNIT_ID;
      readonly firstLevelSpellSlotsExpended: 2;
      readonly secondLevelSpellSlotsExpended: 0;
      readonly pactSlotsExpended: 0;
      readonly arcaneRecoveryUsedSinceLongRest: true;
      readonly accepted: true;
      readonly message: "none";
      readonly recoveredCombinedSlotLevels: 2;
    }
  | {
      readonly lastResult: "long_rest_reset";
      readonly featureUnitId: typeof WIZARD_ARCANE_RECOVERY_UNIT_ID;
      readonly firstLevelSpellSlotsExpended: 0;
      readonly secondLevelSpellSlotsExpended: 0;
      readonly pactSlotsExpended: 0;
      readonly arcaneRecoveryUsedSinceLongRest: false;
      readonly accepted: true;
      readonly message: "none";
      readonly recoveredCombinedSlotLevels: 0;
    }
  | {
      readonly lastResult: "pact_slot_rejected";
      readonly featureUnitId: typeof WIZARD_ARCANE_RECOVERY_UNIT_ID;
      readonly firstLevelSpellSlotsExpended: 0;
      readonly secondLevelSpellSlotsExpended: 0;
      readonly pactSlotsExpended: 1;
      readonly arcaneRecoveryUsedSinceLongRest: false;
      readonly accepted: false;
      readonly message: typeof ARCANE_RECOVERY_PACT_SLOT_REJECTION;
      readonly recoveredCombinedSlotLevels: 0;
    };
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly ArcaneRecoverySelectedIdentityDriverAction[];
  readonly expected: ArcaneRecoverySelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "short-rest-spell-slot-recovery";
  readonly unitId: typeof WIZARD_ARCANE_RECOVERY_UNIT_ID;
  readonly actions: readonly ArcaneRecoverySelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Character Sheet Arcane Recovery selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "short-rest-spell-slot-recovery",
    unitId: "wizard_arcane_recovery",
    actions: [
      "doRecoverSecondLevelSpellSlot",
      "doResetArcaneRecoveryOnLongRest",
      "doRejectPactSlotArcaneRecovery",
    ],
    sequences: [
      {
        name: "selected-wizard-arcane-recovery-restores-ordinary-spell-slot",
        actions: ["doRecoverSecondLevelSpellSlot"],
        expected: shortRestRecoveredProjection(),
      },
      {
        name: "selected-wizard-arcane-recovery-resets-on-long-rest",
        actions: ["doResetArcaneRecoveryOnLongRest"],
        expected: longRestResetProjection(),
      },
      {
        name: "selected-wizard-arcane-recovery-rejects-pact-slot-refund",
        actions: ["doRejectPactSlotArcaneRecovery"],
        expected: pactSlotRejectedProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet Arcane Recovery selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<ArcaneRecoverySelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createArcaneRecoverySelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Character Sheet Arcane Recovery selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Character Sheet Arcane Recovery selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Character Sheet Arcane Recovery selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-sheet-arcane-recovery-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createArcaneRecoverySelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: arcaneRecoverySelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createArcaneRecoverySelectedIdentityDriver() {
  return defineDriver(arcaneRecoverySelectedIdentityDriverSchema, () => {
    let projection: ArcaneRecoverySelectedIdentityProjection =
      initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doRecoverSecondLevelSpellSlot: () => {
        projection = recoverSecondLevelSpellSlotProjection();
      },
      doResetArcaneRecoveryOnLongRest: () => {
        projection = resetArcaneRecoveryOnLongRestProjection();
      },
      doRejectPactSlotArcaneRecovery: () => {
        projection = rejectPactSlotArcaneRecoveryProjection();
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function recoverSecondLevelSpellSlotProjection(): Extract<
  ArcaneRecoverySelectedIdentityProjection,
  { readonly lastResult: "short_rest_recovered" }
> {
  const sheet = arcaneRecoverySheet({
    firstLevelSpellSlotsExpended: 2,
    secondLevelSpellSlotsExpended: 1,
    pactSlotsExpended: 1,
    arcaneRecoveryUsedSinceLongRest: false,
  });
  const rested = requireRight(
    completeShortRest({
      sheet,
      unitLibrary,
      arcaneRecovery: {
        refundSpellSlots: [
          { spellLevel: spellSlotLevel(2), count: resourceCount(1) },
        ],
      },
    }),
  );
  return {
    lastResult: "short_rest_recovered",
    featureUnitId: wizardArcaneRecoveryFeatureUnitId(rested),
    firstLevelSpellSlotsExpended: expectSpellSlotsExpended(rested, 1, 2),
    secondLevelSpellSlotsExpended: expectSpellSlotsExpended(rested, 2, 0),
    pactSlotsExpended: expectPactSlotsExpended(rested, 0),
    arcaneRecoveryUsedSinceLongRest: expectArcaneRecoveryUsedSinceLongRest(
      rested,
      true,
    ),
    accepted: true,
    message: "none",
    recoveredCombinedSlotLevels: 2,
  };
}

function resetArcaneRecoveryOnLongRestProjection(): Extract<
  ArcaneRecoverySelectedIdentityProjection,
  { readonly lastResult: "long_rest_reset" }
> {
  const sheet = arcaneRecoverySheet({
    firstLevelSpellSlotsExpended: 1,
    secondLevelSpellSlotsExpended: 1,
    pactSlotsExpended: 1,
    arcaneRecoveryUsedSinceLongRest: true,
  });
  const rested = requireRight(completeLongRest({ sheet }));
  return {
    lastResult: "long_rest_reset",
    featureUnitId: wizardArcaneRecoveryFeatureUnitId(rested),
    firstLevelSpellSlotsExpended: expectSpellSlotsExpended(rested, 1, 0),
    secondLevelSpellSlotsExpended: expectSpellSlotsExpended(rested, 2, 0),
    pactSlotsExpended: expectPactSlotsExpended(rested, 0),
    arcaneRecoveryUsedSinceLongRest: expectArcaneRecoveryUsedSinceLongRest(
      rested,
      false,
    ),
    accepted: true,
    message: "none",
    recoveredCombinedSlotLevels: 0,
  };
}

function rejectPactSlotArcaneRecoveryProjection(): Extract<
  ArcaneRecoverySelectedIdentityProjection,
  { readonly lastResult: "pact_slot_rejected" }
> {
  const sheet = arcaneRecoverySheet({
    firstLevelSpellSlotsExpended: 0,
    secondLevelSpellSlotsExpended: 0,
    pactSlotsExpended: 1,
    arcaneRecoveryUsedSinceLongRest: false,
  });
  const result = completeShortRest({
    sheet,
    unitLibrary,
    arcaneRecovery: {
      refundSpellSlots: [
        { spellLevel: spellSlotLevel(1), count: resourceCount(1) },
      ],
    },
  });
  if (Either.isRight(result)) {
    throw new Error("Expected Arcane Recovery to reject Pact Slot recovery.");
  }
  if (result.left.message !== ARCANE_RECOVERY_PACT_SLOT_REJECTION) {
    throw new Error(
      `Expected Pact Slot rejection, got ${result.left.message}.`,
    );
  }
  return {
    lastResult: "pact_slot_rejected",
    featureUnitId: wizardArcaneRecoveryFeatureUnitId(sheet),
    firstLevelSpellSlotsExpended: expectSpellSlotsExpended(sheet, 1, 0),
    secondLevelSpellSlotsExpended: expectSpellSlotsExpended(sheet, 2, 0),
    pactSlotsExpended: expectPactSlotsExpended(sheet, 1),
    arcaneRecoveryUsedSinceLongRest: expectArcaneRecoveryUsedSinceLongRest(
      sheet,
      false,
    ),
    accepted: false,
    message: ARCANE_RECOVERY_PACT_SLOT_REJECTION,
    recoveredCombinedSlotLevels: 0,
  };
}

function arcaneRecoverySheet(input: {
  readonly firstLevelSpellSlotsExpended: number;
  readonly secondLevelSpellSlotsExpended: number;
  readonly pactSlotsExpended: number;
  readonly arcaneRecoveryUsedSinceLongRest: boolean;
}): CharacterSheet {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId("character:arcane-recovery-selected"),
      build: wizard4BuildWithPactSlots(),
      maximumHp: Hp(18),
      currentHp: Hp(18),
      tempHp: Hp(0),
      conditions: [],
      unitLibrary,
      spellSlots: [
        {
          spellLevel: spellSlotLevel(1),
          count: resourceCount(4),
          expended: resourceCount(input.firstLevelSpellSlotsExpended),
        },
        {
          spellLevel: spellSlotLevel(2),
          count: resourceCount(3),
          expended: resourceCount(input.secondLevelSpellSlotsExpended),
        },
      ],
      pactSlots: {
        slotLevel: spellSlotLevel(1),
        count: resourceCount(1),
        expended: resourceCount(input.pactSlotsExpended),
      },
      restFeatureUses: input.arcaneRecoveryUsedSinceLongRest
        ? [{ tag: "arcaneRecovery", usedSinceLongRest: true }]
        : [],
    }),
  );
}

function wizard4BuildWithPactSlots(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId("class_wizard"),
      advancements: [
        wizardAdvancement(),
        wizardAdvancement(),
        wizardAdvancement(),
      ],
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: requireRight(
      abilityScoreAssignment({
        str: 8,
        dex: 14,
        con: 13,
        int: 16,
        wis: 10,
        cha: 13,
      }),
    ),
    proficiencyChoices: [],
    features: [],
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
          slots: [
            { spellLevel: 1, count: 4 },
            { spellLevel: 2, count: 3 },
          ],
        },
        pactMagic: {
          kind: "pactMagic",
          slotLevel: 1,
          count: 1,
        },
      },
    },
    equipment: { owned: [], loadout: {} },
  };
}

function wizardAdvancement(): CharacterBuild["progression"]["advancements"][number] {
  return {
    classUnitId: classUnitId("class_wizard"),
    hitPointRule: { tag: "fixedHigherLevelGain" },
  };
}

function wizardArcaneRecoveryFeatureUnitId(
  sheet: CharacterSheet,
): typeof WIZARD_ARCANE_RECOVERY_UNIT_ID {
  const featureUnitIds = characterBuildFeatureUnitIds(sheet.build, unitLibrary);
  if (!featureUnitIds.includes(WIZARD_ARCANE_RECOVERY_UNIT_ID)) {
    throw new Error("Expected Wizard Arcane Recovery feature on the build.");
  }
  return WIZARD_ARCANE_RECOVERY_UNIT_ID;
}

function expectSpellSlotsExpended<const TExpected extends 0 | 2>(
  sheet: CharacterSheet,
  spellLevel: 1 | 2,
  expected: TExpected,
): TExpected {
  const spellSlots = characterSheetSpellSlots(sheet);
  if (spellSlots === undefined) {
    throw new Error("Expected ordinary Spell Slot state.");
  }
  const slot = spellSlots.find(
    (candidate) => candidate.spellLevel === spellSlotLevel(spellLevel),
  );
  if (slot === undefined) {
    throw new Error(`Expected level ${spellLevel} ordinary Spell Slots.`);
  }
  if (Number(slot.expended) !== expected) {
    throw new Error(
      `Expected level ${spellLevel} ordinary Spell Slots expended to equal ${expected}, got ${slot.expended}.`,
    );
  }
  return expected;
}

function expectPactSlotsExpended<const TExpected extends 0 | 1>(
  sheet: CharacterSheet,
  expected: TExpected,
): TExpected {
  const pactSlots = characterSheetPactSlots(sheet);
  if (pactSlots === undefined) {
    throw new Error("Expected Pact Slot state.");
  }
  if (Number(pactSlots.expended) !== expected) {
    throw new Error(
      `Expected Pact Slots expended to equal ${expected}, got ${pactSlots.expended}.`,
    );
  }
  return expected;
}

function expectArcaneRecoveryUsedSinceLongRest<const TExpected extends boolean>(
  sheet: CharacterSheet,
  expected: TExpected,
): TExpected {
  const usedSinceLongRest = sheet.restFeatureUses.some(
    (use) => use.tag === "arcaneRecovery" && use.usedSinceLongRest,
  );
  if (usedSinceLongRest !== expected) {
    throw new Error(
      `Expected Arcane Recovery used-since-Long-Rest state to equal ${String(expected)}, got ${String(usedSinceLongRest)}.`,
    );
  }
  return expected;
}

function initialProjection(): Extract<
  ArcaneRecoverySelectedIdentityProjection,
  { readonly lastResult: "init" }
> {
  return {
    lastResult: "init",
    featureUnitId: "none",
    firstLevelSpellSlotsExpended: 0,
    secondLevelSpellSlotsExpended: 0,
    pactSlotsExpended: 0,
    arcaneRecoveryUsedSinceLongRest: false,
    accepted: false,
    message: "none",
    recoveredCombinedSlotLevels: 0,
  };
}

function shortRestRecoveredProjection(): Extract<
  ArcaneRecoverySelectedIdentityProjection,
  { readonly lastResult: "short_rest_recovered" }
> {
  return {
    lastResult: "short_rest_recovered",
    featureUnitId: WIZARD_ARCANE_RECOVERY_UNIT_ID,
    firstLevelSpellSlotsExpended: 2,
    secondLevelSpellSlotsExpended: 0,
    pactSlotsExpended: 0,
    arcaneRecoveryUsedSinceLongRest: true,
    accepted: true,
    message: "none",
    recoveredCombinedSlotLevels: 2,
  };
}

function longRestResetProjection(): Extract<
  ArcaneRecoverySelectedIdentityProjection,
  { readonly lastResult: "long_rest_reset" }
> {
  return {
    lastResult: "long_rest_reset",
    featureUnitId: WIZARD_ARCANE_RECOVERY_UNIT_ID,
    firstLevelSpellSlotsExpended: 0,
    secondLevelSpellSlotsExpended: 0,
    pactSlotsExpended: 0,
    arcaneRecoveryUsedSinceLongRest: false,
    accepted: true,
    message: "none",
    recoveredCombinedSlotLevels: 0,
  };
}

function pactSlotRejectedProjection(): Extract<
  ArcaneRecoverySelectedIdentityProjection,
  { readonly lastResult: "pact_slot_rejected" }
> {
  return {
    lastResult: "pact_slot_rejected",
    featureUnitId: WIZARD_ARCANE_RECOVERY_UNIT_ID,
    firstLevelSpellSlotsExpended: 0,
    secondLevelSpellSlotsExpended: 0,
    pactSlotsExpended: 1,
    arcaneRecoveryUsedSinceLongRest: false,
    accepted: false,
    message: ARCANE_RECOVERY_PACT_SLOT_REJECTION,
    recoveredCombinedSlotLevels: 0,
  };
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

function normalizeArcaneRecoverySelectedIdentityQuintState(
  raw: unknown,
): ArcaneRecoverySelectedIdentityProjection {
  const state = quintStateRecord(raw);
  const lastResult = mbtLastResult(state["qLastResult"]);
  const projection = projectionForLastResult(lastResult);
  assertStringField(state, "qFeatureUnitId", projection.featureUnitId);
  assertNumberField(
    state,
    "qFirstLevelSpellSlotsExpended",
    projection.firstLevelSpellSlotsExpended,
  );
  assertNumberField(
    state,
    "qSecondLevelSpellSlotsExpended",
    projection.secondLevelSpellSlotsExpended,
  );
  assertNumberField(state, "qPactSlotsExpended", projection.pactSlotsExpended);
  assertBooleanField(
    state,
    "qArcaneRecoveryUsedSinceLongRest",
    projection.arcaneRecoveryUsedSinceLongRest,
  );
  assertBooleanField(state, "qAccepted", projection.accepted);
  assertStringField(state, "qMessage", projection.message);
  assertNumberField(
    state,
    "qRecoveredCombinedSlotLevels",
    projection.recoveredCombinedSlotLevels,
  );
  return projection;
}

function projectionForLastResult(
  lastResult: ArcaneRecoverySelectedIdentityProjection["lastResult"],
): ArcaneRecoverySelectedIdentityProjection {
  if (lastResult === "init") return initialProjection();
  if (lastResult === "short_rest_recovered")
    return shortRestRecoveredProjection();
  if (lastResult === "long_rest_reset") return longRestResetProjection();
  return pactSlotRejectedProjection();
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint state record.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function stringField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): string {
  const value = state[field];
  if (typeof value === "string") return value;
  throw new Error(`Expected Quint string field ${field}.`);
}

function assertStringField(
  state: Readonly<Record<string, unknown>>,
  field: string,
  expected: string,
): void {
  const value = stringField(state, field);
  if (value !== expected) {
    throw new Error(
      `Expected Quint string field ${field} to equal ${expected}.`,
    );
  }
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  const value = state[field];
  if (typeof value === "boolean") return value;
  throw new Error(`Expected Quint boolean field ${field}.`);
}

function assertBooleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
  expected: boolean,
): void {
  const value = booleanField(state, field);
  if (value !== expected) {
    throw new Error(
      `Expected Quint boolean field ${field} to equal ${expected}.`,
    );
  }
}

function assertNumberField(
  state: Readonly<Record<string, unknown>>,
  field: string,
  expected: number,
): void {
  const value = numberFromQuintInt(state[field], field);
  if (value !== expected) {
    throw new Error(
      `Expected Quint integer field ${field} to equal ${expected}.`,
    );
  }
}

function mbtLastResult(
  raw: unknown,
): ArcaneRecoverySelectedIdentityProjection["lastResult"] {
  if (
    raw === "init" ||
    raw === "short_rest_recovered" ||
    raw === "long_rest_reset" ||
    raw === "pact_slot_rejected"
  ) {
    return raw;
  }
  throw new Error(`Unexpected MBT result ${String(raw)}.`);
}

const arcaneRecoverySelectedIdentityStateCheck = stateCheck(
  normalizeArcaneRecoverySelectedIdentityQuintState,
  (
    spec: ArcaneRecoverySelectedIdentityProjection,
    impl: ArcaneRecoverySelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
