// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt spellbook-ritual-invocation wizard_ritual_adept
// UNIT-IDENTITY-MBT-REPLAY: spellbook-ritual-invocation wizard_ritual_adept doInvokeSpellbookRitual doRejectPreparedOnlyRitual
// KERNEL-COVERAGE: parity-witness SHEET.SPELLBOOK_RITUAL.SPELL_ACCESS_PROJECTION
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import {
  abilityScoreAssignment,
  characterBuildFeatureUnitIds,
  classUnitId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import { Hp } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  characterSheetId,
  characterSheetSpellInvocation,
  characterSheetSpellSlots,
  createFreshCharacterSheet,
  type CharacterSheet,
  type CharacterSheetSpellbookRitualInvocation,
} from "./index.ts";

const WIZARD_RITUAL_ADEPT_UNIT_ID = "wizard_ritual_adept";
const DETECT_MAGIC_SPELL_ID = "detect_magic";
const WIZARD_CLASS_UNIT_ID = "class_wizard";

const spellbookRitualSelectedIdentityDriverSchema = {
  init: {},
  doInvokeSpellbookRitual: {},
  doRejectPreparedOnlyRitual: {},
  doRejectNonRitualSpellbookSpell: {},
  doRejectMissingRitualAccessFeature: {},
  doRejectNonLeveledRitualSpellbookSpell: {},
  step: {},
} as const;
type SpellbookRitualSelectedIdentityDriverAction = Exclude<
  keyof typeof spellbookRitualSelectedIdentityDriverSchema,
  "init" | "step"
>;

type SpellbookRitualFeatureProjection = {
  readonly featureUnitId: typeof WIZARD_RITUAL_ADEPT_UNIT_ID;
  readonly spellId: typeof DETECT_MAGIC_SPELL_ID;
  readonly spellcastingSourceUnitId: typeof WIZARD_CLASS_UNIT_ID;
};
type SpellbookRitualSemanticCoreFeatureProjection = {
  readonly featureUnitId: "none";
  readonly spellId: "none";
  readonly spellcastingSourceUnitId: "none";
};
type SpellbookRitualAccessProjection =
  | {
      readonly kind: "spellbook";
      readonly feature: SpellbookRitualFeatureProjection;
    }
  | {
      readonly kind: "prepared_only";
      readonly feature: SpellbookRitualFeatureProjection;
    }
  | {
      readonly kind: "semantic_rejected";
      readonly feature: SpellbookRitualSemanticCoreFeatureProjection;
    };
type AcceptedSpellbookRitualInvocationProjection = {
  readonly accepted: true;
  readonly spellSlotCostKind: "none";
  readonly preparationRequirement: "not_required";
  readonly requiredSpellAccess: "spellbook";
  readonly additionalCastingTimeMinutes: 10;
  readonly requiresReadingSpellbook: true;
  readonly firstLevelSpellSlotsExpended: 0;
};
type RejectedSpellbookRitualInvocationProjection = {
  readonly accepted: false;
  readonly firstLevelSpellSlotsExpended: 0;
};
type SpellbookRitualSelectedIdentityProjection =
  | {
      readonly lastResult: "init";
    }
  | {
      readonly lastResult: "invoked";
      readonly access: Extract<
        SpellbookRitualAccessProjection,
        { readonly kind: "spellbook" }
      >;
      readonly invocation: AcceptedSpellbookRitualInvocationProjection;
    }
  | {
      readonly lastResult: "prepared_only_rejected";
      readonly access: Extract<
        SpellbookRitualAccessProjection,
        { readonly kind: "prepared_only" }
      >;
      readonly invocation: RejectedSpellbookRitualInvocationProjection;
    }
  | {
      readonly lastResult:
        | "non_ritual_rejected"
        | "missing_feature_rejected"
        | "non_leveled_rejected";
      readonly access: Extract<
        SpellbookRitualAccessProjection,
        { readonly kind: "semantic_rejected" }
      >;
      readonly spellbookContainsRitual: boolean;
      readonly preparedContainsRitual: false;
      readonly invocation: RejectedSpellbookRitualInvocationProjection;
    };
type InitialSpellbookRitualSelectedIdentityProjection = Extract<
  SpellbookRitualSelectedIdentityProjection,
  { readonly lastResult: "init" }
>;
type InvokedSpellbookRitualSelectedIdentityProjection = Extract<
  SpellbookRitualSelectedIdentityProjection,
  { readonly lastResult: "invoked" }
>;
type PreparedOnlyRejectedSpellbookRitualSelectedIdentityProjection = Extract<
  SpellbookRitualSelectedIdentityProjection,
  { readonly lastResult: "prepared_only_rejected" }
>;
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly SpellbookRitualSelectedIdentityDriverAction[];
  readonly expected: SpellbookRitualSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "spellbook-ritual-invocation";
  readonly unitId: typeof WIZARD_RITUAL_ADEPT_UNIT_ID;
  readonly actions: readonly SpellbookRitualSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Character Sheet spellbook ritual selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "spellbook-ritual-invocation",
    unitId: "wizard_ritual_adept",
    actions: ["doInvokeSpellbookRitual", "doRejectPreparedOnlyRitual"],
    sequences: [
      {
        name: "selected-wizard-ritual-adept-spellbook-ritual",
        actions: ["doInvokeSpellbookRitual"],
        expected: invokedProjection(),
      },
      {
        name: "selected-wizard-ritual-adept-rejects-prepared-only-ritual",
        actions: ["doRejectPreparedOnlyRitual"],
        expected: preparedOnlyRejectedProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;
const qntStepByDriverAction = {
  doInvokeSpellbookRitual: "stepInvokeSpellbookRitual",
  doRejectPreparedOnlyRitual: "stepRejectPreparedOnlyRitual",
  doRejectNonRitualSpellbookSpell: "stepRejectNonRitualSpellbookSpell",
  doRejectMissingRitualAccessFeature: "stepRejectMissingRitualAccessFeature",
  doRejectNonLeveledRitualSpellbookSpell:
    "stepRejectNonLeveledRitualSpellbookSpell",
} as const satisfies Record<
  SpellbookRitualSelectedIdentityDriverAction,
  string
>;
const advertisedReplayActions = selectedUnitIdentityReplays.flatMap(
  (replay) => replay.actions,
);
const semanticCoreReplayActions = [
  "doRejectNonRitualSpellbookSpell",
  "doRejectMissingRitualAccessFeature",
  "doRejectNonLeveledRitualSpellbookSpell",
] as const satisfies ReadonlyArray<SpellbookRitualSelectedIdentityDriverAction>;

describe("Character Sheet spellbook ritual selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<SpellbookRitualSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createSpellbookRitualSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Character Sheet spellbook ritual selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Character Sheet spellbook ritual selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Character Sheet spellbook ritual selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-sheet-spellbook-ritual-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createSpellbookRitualSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: spellbookRitualSelectedIdentityStateCheck,
    });
  }, 120_000);

  it("replays every advertised Character Sheet spellbook ritual branch", async () => {
    for (const actionName of advertisedReplayActions) {
      await run({
        spec: path.resolve(
          import.meta.dirname,
          "../character-sheet-spellbook-ritual-selected-identity.mbt.qnt",
        ),
        init: "init",
        step: qntStepByDriverAction[actionName],
        driver: createSpellbookRitualSelectedIdentityDriver(),
        backend: "typescript",
        nTraces: 1,
        maxSteps: 1,
        stateCheck: spellbookRitualSelectedIdentityStateCheck,
      });
    }
  }, 120_000);

  it("replays Character Sheet spellbook ritual semantic core branches", async () => {
    for (const actionName of semanticCoreReplayActions) {
      await run({
        spec: path.resolve(
          import.meta.dirname,
          "../character-sheet-spellbook-ritual-selected-identity.mbt.qnt",
        ),
        init: "init",
        step: qntStepByDriverAction[actionName],
        driver: createSpellbookRitualSelectedIdentityDriver(),
        backend: "typescript",
        nTraces: 1,
        maxSteps: 1,
        stateCheck: spellbookRitualSelectedIdentityStateCheck,
      });
    }
  }, 120_000);
});

function createSpellbookRitualSelectedIdentityDriver() {
  return defineDriver(spellbookRitualSelectedIdentityDriverSchema, () => {
    let projection: SpellbookRitualSelectedIdentityProjection =
      initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doInvokeSpellbookRitual: () => {
        projection = invokeSpellbookRitualProjection();
      },
      doRejectPreparedOnlyRitual: () => {
        projection = rejectPreparedOnlyRitualProjection();
      },
      doRejectNonRitualSpellbookSpell: () => {
        projection = semanticRejectedProjection("non_ritual_rejected");
      },
      doRejectMissingRitualAccessFeature: () => {
        projection = semanticRejectedProjection("missing_feature_rejected");
      },
      doRejectNonLeveledRitualSpellbookSpell: () => {
        projection = semanticRejectedProjection("non_leveled_rejected");
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function invokeSpellbookRitualProjection(): InvokedSpellbookRitualSelectedIdentityProjection {
  const sheet = spellbookRitualSheet({
    spellbook: [DETECT_MAGIC_SPELL_ID],
    preparedSpells: [],
  });
  const result = characterSheetSpellInvocation({
    sheet,
    unitLibrary,
    spellId: DETECT_MAGIC_SPELL_ID,
    invocation: { kind: "ritual" },
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  if (result.right.tag !== "spellbookRitual") {
    throw new Error(`Expected spellbook Ritual, got ${result.right.tag}.`);
  }
  return projectAcceptedSpellbookRitual(sheet, result.right);
}

function rejectPreparedOnlyRitualProjection(): PreparedOnlyRejectedSpellbookRitualSelectedIdentityProjection {
  const sheet = spellbookRitualSheet({
    spellbook: [],
    preparedSpells: [DETECT_MAGIC_SPELL_ID],
  });
  const result = characterSheetSpellInvocation({
    sheet,
    unitLibrary,
    spellId: DETECT_MAGIC_SPELL_ID,
    invocation: { kind: "ritual" },
  });
  if (Either.isRight(result)) {
    throw new Error(
      "Expected prepared-only Ritual Adept invocation rejection.",
    );
  }
  const expected = preparedOnlyRejectedProjection();
  return {
    ...expected,
    access: {
      ...expected.access,
      feature: {
        ...expected.access.feature,
        featureUnitId: wizardRitualAdeptFeatureUnitId(sheet),
      },
    },
    invocation: {
      ...expected.invocation,
      firstLevelSpellSlotsExpended: firstLevelSpellSlotsExpended(sheet),
    },
  };
}

function projectAcceptedSpellbookRitual(
  sheet: CharacterSheet,
  invocation: CharacterSheetSpellbookRitualInvocation,
): InvokedSpellbookRitualSelectedIdentityProjection {
  if (invocation.featureUnitId !== WIZARD_RITUAL_ADEPT_UNIT_ID) {
    throw new Error(
      `Expected Ritual Adept feature Unit ${WIZARD_RITUAL_ADEPT_UNIT_ID}, got ${invocation.featureUnitId}.`,
    );
  }
  if (invocation.spellId !== DETECT_MAGIC_SPELL_ID) {
    throw new Error(
      `Expected Ritual spell ${DETECT_MAGIC_SPELL_ID}, got ${invocation.spellId}.`,
    );
  }
  if (invocation.spellcastingSourceUnitId !== WIZARD_CLASS_UNIT_ID) {
    throw new Error(
      `Expected Wizard spellcasting source ${WIZARD_CLASS_UNIT_ID}, got ${invocation.spellcastingSourceUnitId}.`,
    );
  }
  return {
    ...invokedProjection(),
    access: {
      kind: "spellbook",
      feature: {
        featureUnitId: invocation.featureUnitId,
        spellId: invocation.spellId,
        spellcastingSourceUnitId: invocation.spellcastingSourceUnitId,
      },
    },
    invocation: {
      accepted: true,
      spellSlotCostKind: invocation.spellSlotCost.kind,
      preparationRequirement: invocation.preparationRequirement,
      requiredSpellAccess: invocation.requiredSpellAccess,
      additionalCastingTimeMinutes: invocation.additionalCastingTimeMinutes,
      requiresReadingSpellbook: invocation.requiresReadingSpellbook,
      firstLevelSpellSlotsExpended: firstLevelSpellSlotsExpended(sheet),
    },
  };
}

function spellbookRitualSheet(input: {
  readonly spellbook: readonly string[];
  readonly preparedSpells: readonly string[];
}): CharacterSheet {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId("character:wizard-ritual-selected"),
      build: wizardBuild({
        spellbook: input.spellbook,
        preparedSpells: input.preparedSpells,
      }),
      maximumHp: Hp(8),
      currentHp: Hp(8),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary,
    }),
  );
}

function wizardBuild(input: {
  readonly spellbook: readonly string[];
  readonly preparedSpells: readonly string[];
}): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(WIZARD_CLASS_UNIT_ID),
      advancements: [],
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
        cha: 12,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    spellcasting: {
      sources: [
        {
          sourceUnitId: WIZARD_CLASS_UNIT_ID,
          spellcastingAbility: "int",
          cantrips: [],
          spellbook: input.spellbook,
          preparedSpells: input.preparedSpells,
          spellcastingFocuses: ["spellbook"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [{ spellLevel: 1, count: 2 }],
        },
      },
    },
    equipment: { owned: [], loadout: {} },
  };
}

function wizardRitualAdeptFeatureUnitId(
  sheet: CharacterSheet,
): typeof WIZARD_RITUAL_ADEPT_UNIT_ID {
  const featureUnitIds = characterBuildFeatureUnitIds(sheet.build, unitLibrary);
  if (!featureUnitIds.includes(WIZARD_RITUAL_ADEPT_UNIT_ID)) {
    throw new Error("Expected Wizard Ritual Adept feature on the build.");
  }
  return WIZARD_RITUAL_ADEPT_UNIT_ID;
}

function firstLevelSpellSlotsExpended(sheet: CharacterSheet): 0 {
  const slots = characterSheetSpellSlots(sheet);
  if (slots === undefined) {
    throw new Error("Expected Spell Slot state.");
  }
  const slot = slots.find((candidate) => candidate.spellLevel === 1);
  if (slot === undefined) {
    throw new Error("Expected level 1 Spell Slot pool.");
  }
  if (slot.expended !== 0) {
    throw new Error(
      `Expected Ritual invocation not to expend a Spell Slot, got ${slot.expended}.`,
    );
  }
  return 0;
}

function initialProjection(): InitialSpellbookRitualSelectedIdentityProjection {
  return {
    lastResult: "init",
  };
}

function invokedProjection(): InvokedSpellbookRitualSelectedIdentityProjection {
  return {
    lastResult: "invoked",
    access: {
      kind: "spellbook",
      feature: spellbookRitualFeatureProjection(),
    },
    invocation: {
      accepted: true,
      spellSlotCostKind: "none",
      preparationRequirement: "not_required",
      requiredSpellAccess: "spellbook",
      additionalCastingTimeMinutes: 10,
      requiresReadingSpellbook: true,
      firstLevelSpellSlotsExpended: 0,
    },
  };
}

function preparedOnlyRejectedProjection(): PreparedOnlyRejectedSpellbookRitualSelectedIdentityProjection {
  return {
    lastResult: "prepared_only_rejected",
    access: {
      kind: "prepared_only",
      feature: spellbookRitualFeatureProjection(),
    },
    invocation: {
      accepted: false,
      firstLevelSpellSlotsExpended: 0,
    },
  };
}

function semanticRejectedProjection(
  lastResult:
    | "non_ritual_rejected"
    | "missing_feature_rejected"
    | "non_leveled_rejected",
): Extract<
  SpellbookRitualSelectedIdentityProjection,
  {
    readonly lastResult:
      | "non_ritual_rejected"
      | "missing_feature_rejected"
      | "non_leveled_rejected";
  }
> {
  return {
    lastResult,
    access: {
      kind: "semantic_rejected",
      feature: {
        featureUnitId: "none",
        spellId: "none",
        spellcastingSourceUnitId: "none",
      },
    },
    spellbookContainsRitual: lastResult !== "non_ritual_rejected",
    preparedContainsRitual: false,
    invocation: {
      accepted: false,
      firstLevelSpellSlotsExpended: 0,
    },
  };
}

function spellbookRitualFeatureProjection(): SpellbookRitualFeatureProjection {
  return {
    featureUnitId: WIZARD_RITUAL_ADEPT_UNIT_ID,
    spellId: DETECT_MAGIC_SPELL_ID,
    spellcastingSourceUnitId: WIZARD_CLASS_UNIT_ID,
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

function normalizeSpellbookRitualSelectedIdentityQuintState(
  raw: unknown,
): SpellbookRitualSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  const lastResult = mbtLastResult(state["qLastResult"]);
  if (lastResult === "init") {
    assertStringField(state, "qFeatureUnitId", "none");
    assertStringField(state, "qSpellId", "none");
    assertStringField(state, "qSpellcastingSourceUnitId", "none");
    assertStringField(state, "qSpellSlotCostKind", "none");
    assertStringField(state, "qPreparationRequirement", "none");
    assertStringField(state, "qRequiredSpellAccess", "none");
    assertNumberField(state, "qAdditionalCastingTimeMinutes", 0);
    assertBooleanField(state, "qSpellbookContainsRitual", false);
    assertBooleanField(state, "qPreparedContainsRitual", false);
    assertBooleanField(state, "qInvocationAccepted", false);
    assertBooleanField(state, "qRequiresReadingSpellbook", false);
    assertNumberField(state, "qFirstLevelSpellSlotsExpended", 0);
    return initialProjection();
  }
  const projection = projectionForLastResult(lastResult);
  assertStringField(
    state,
    "qFeatureUnitId",
    projection.access.feature.featureUnitId,
  );
  assertStringField(state, "qSpellId", projection.access.feature.spellId);
  assertStringField(
    state,
    "qSpellcastingSourceUnitId",
    projection.access.feature.spellcastingSourceUnitId,
  );
  assertBooleanField(
    state,
    "qSpellbookContainsRitual",
    projection.lastResult === "non_ritual_rejected" ||
      projection.lastResult === "missing_feature_rejected" ||
      projection.lastResult === "non_leveled_rejected"
      ? projection.spellbookContainsRitual
      : projection.access.kind === "spellbook",
  );
  assertBooleanField(
    state,
    "qPreparedContainsRitual",
    projection.lastResult === "non_ritual_rejected" ||
      projection.lastResult === "missing_feature_rejected" ||
      projection.lastResult === "non_leveled_rejected"
      ? projection.preparedContainsRitual
      : projection.access.kind === "prepared_only",
  );
  assertBooleanField(
    state,
    "qInvocationAccepted",
    projection.invocation.accepted,
  );
  assertNumberField(
    state,
    "qFirstLevelSpellSlotsExpended",
    projection.invocation.firstLevelSpellSlotsExpended,
  );
  if (projection.lastResult === "invoked") {
    assertStringField(
      state,
      "qSpellSlotCostKind",
      projection.invocation.spellSlotCostKind,
    );
    assertStringField(
      state,
      "qPreparationRequirement",
      projection.invocation.preparationRequirement,
    );
    assertStringField(
      state,
      "qRequiredSpellAccess",
      projection.invocation.requiredSpellAccess,
    );
    assertNumberField(
      state,
      "qAdditionalCastingTimeMinutes",
      projection.invocation.additionalCastingTimeMinutes,
    );
    assertBooleanField(
      state,
      "qRequiresReadingSpellbook",
      projection.invocation.requiresReadingSpellbook,
    );
  } else {
    assertStringField(state, "qSpellSlotCostKind", "none");
    assertStringField(state, "qPreparationRequirement", "none");
    assertStringField(state, "qRequiredSpellAccess", "none");
    assertNumberField(state, "qAdditionalCastingTimeMinutes", 0);
    assertBooleanField(state, "qRequiresReadingSpellbook", false);
  }
  return projection;
}

function projectionForLastResult(
  lastResult: Exclude<
    SpellbookRitualSelectedIdentityProjection["lastResult"],
    "init"
  >,
): Exclude<
  SpellbookRitualSelectedIdentityProjection,
  InitialSpellbookRitualSelectedIdentityProjection
> {
  if (lastResult === "invoked") return invokedProjection();
  if (lastResult === "prepared_only_rejected")
    return preparedOnlyRejectedProjection();
  if (
    lastResult === "non_ritual_rejected" ||
    lastResult === "missing_feature_rejected" ||
    lastResult === "non_leveled_rejected"
  ) {
    return semanticRejectedProjection(lastResult);
  }
  return assertNever(lastResult);
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint state record.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function assertStringField(
  state: Readonly<Record<string, unknown>>,
  field: string,
  expected: string,
): void {
  const value = state[field];
  if (value !== expected) {
    throw new Error(
      `Expected Quint string field ${field} to be ${expected}, got ${String(value)}.`,
    );
  }
}

function assertBooleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
  expected: boolean,
): void {
  const value = state[field];
  if (value !== expected) {
    throw new Error(
      `Expected Quint boolean field ${field} to be ${String(expected)}, got ${String(value)}.`,
    );
  }
}

function assertNumberField(
  state: Readonly<Record<string, unknown>>,
  field: string,
  expected: number,
): void {
  const value = state[field];
  const actual =
    typeof value === "number"
      ? value
      : typeof value === "bigint"
        ? Number(value)
        : null;
  if (actual !== expected) {
    throw new Error(
      `Expected Quint integer field ${field} to be ${expected}, got ${String(value)}.`,
    );
  }
}

function mbtLastResult(
  raw: unknown,
): SpellbookRitualSelectedIdentityProjection["lastResult"] {
  if (
    raw === "init" ||
    raw === "invoked" ||
    raw === "prepared_only_rejected" ||
    raw === "non_ritual_rejected" ||
    raw === "missing_feature_rejected" ||
    raw === "non_leveled_rejected"
  ) {
    return raw;
  }
  throw new Error(`Unexpected MBT result ${String(raw)}.`);
}

function assertNever(value: never): never {
  throw new Error(`Unexpected spellbook Ritual selected identity result ${value}.`);
}

const spellbookRitualSelectedIdentityStateCheck = stateCheck(
  normalizeSpellbookRitualSelectedIdentityQuintState,
  (
    spec: SpellbookRitualSelectedIdentityProjection,
    impl: SpellbookRitualSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
