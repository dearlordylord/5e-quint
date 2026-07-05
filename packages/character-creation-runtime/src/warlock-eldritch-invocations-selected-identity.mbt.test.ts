// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1D2-WARLOCK-ELDRITCH-INVOCATIONS warlock_eldritch_invocations
// UNIT-IDENTITY-REPLAY: L1D2-WARLOCK-ELDRITCH-INVOCATIONS warlock_eldritch_invocations doSelectLevelOneArmorOfShadows doGainLevelTwoInvocations doReplaceArmorWithEldritchMindOnWarlockLevelGain doReplaceRepeatableInvocationByChoice doRejectPrerequisiteRetainedInvocationReplacement doRejectDuplicateInvocationSelections
// KERNEL-COVERAGE: parity-witness CREATION.SPELL_ACCESS.PACT_MAGIC_PROGRESSION CREATION.ELDRITCH_INVOCATION.CHOICE_LIFECYCLE
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import type { AbilityScoreAssignment as RawAbilityScoreAssignment } from "@dnd/shared-algebras/ability-score-algebra";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";
import { Either } from "effect";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { parseCharacterProgressionShape } from "./character-progression-algebra.ts";
import {
  abilityScoreAssignment,
  advanceCharacterBuildClassLevel,
  characterBuildUnitRefs,
  characterDraftId,
  choiceCardinalityBounds,
  classUnitIdFromUnitId,
  computeTotalLevel,
  createCharacterDraft,
  creationChoiceOptionId,
  discoverCreationHoles,
  eldritchInvocationId,
  fillCreationHoles,
  finalizeCharacterDraft,
  progressionOptionId,
  warlockLevelGain,
  type AbilityScoreAssignment,
  type CharacterBuild,
  type CharacterBuildEldritchInvocationRepeatableChoice,
  type CharacterBuildWarlockEldritchInvocationSelectionInput,
  type CharacterBuildWarlockPactMagicLevelGain,
  type CharacterDraft,
  type CharacterProgression,
  type CreationBatchFillResult,
  type CreationChoiceOptionId,
  type CreationFill,
  type CreationHole,
  type EldritchInvocationId,
  type UnitChoiceKey,
} from "./index.ts";
import {
  CLASS_CANTRIP_CHOICE_KEY,
  CLASS_PREPARED_SPELL_CHOICE_KEY,
  ELDRITCH_INVOCATIONS_CHOICE_KEY,
  EQUIPMENT_PURCHASE_CHOICE_KEY,
} from "./phase1-manifest.ts";
import { supportedHoleOptionIds } from "./support-gates.ts";
import { soldierBackgroundFixtureOptionIds } from "./background-fixture.test-support.ts";

const WARLOCK_CLASS_UNIT_ID = "class_warlock";
const WARLOCK_ELDRITCH_INVOCATIONS_UNIT_ID = "warlock_eldritch_invocations";
const ARMOR_OF_SHADOWS_INVOCATION_ID = eldritchInvocationId("armor_of_shadows");
const PACT_OF_THE_BLADE_INVOCATION_ID =
  eldritchInvocationId("pact_of_the_blade");
const PACT_OF_THE_CHAIN_INVOCATION_ID =
  eldritchInvocationId("pact_of_the_chain");
const DEVILS_SIGHT_INVOCATION_ID = eldritchInvocationId("devils_sight");
const ELDRITCH_MIND_INVOCATION_ID = eldritchInvocationId("eldritch_mind");
const THIRSTING_BLADE_INVOCATION_ID = eldritchInvocationId("thirsting_blade");
const REPELLING_BLAST_INVOCATION_ID = eldritchInvocationId("repelling_blast");
const ELDRITCH_BLAST_CANTRIP_UNIT_ID = "eldritch_blast";
const POISON_SPRAY_CANTRIP_UNIT_ID = "poison_spray";
const LEVEL_ONE_CANTRIP_UNIT_IDS = [
  ELDRITCH_BLAST_CANTRIP_UNIT_ID,
  "minor_illusion",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const LEVEL_ONE_PREPARED_SPELL_UNIT_IDS = [
  "charm_person",
  "hellish_rebuke",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const WARLOCK_FIXTURE_PURCHASE_UNIT_IDS = [
  "weapon_longsword",
  "equipment_shield",
  "weapon_flail",
] as const satisfies ReadonlyArray<UnitRecord["id"]>;
const ELDRITCH_BLAST_CHOICE = {
  kind: "knownWarlockCantrip",
  cantripId: ELDRITCH_BLAST_CANTRIP_UNIT_ID,
} as const satisfies CharacterBuildEldritchInvocationRepeatableChoice;
const POISON_SPRAY_CHOICE = {
  kind: "knownWarlockCantrip",
  cantripId: POISON_SPRAY_CANTRIP_UNIT_ID,
} as const satisfies CharacterBuildEldritchInvocationRepeatableChoice;

const WARLOCK_INVOCATION_SELECTED_IDENTITY_RESULTS = [
  "init",
  "levelOneSelected",
  "levelTwoGained",
  "nonRepeatableReplaced",
  "repeatableReplaced",
  "lockedReplacementRejected",
  "duplicateSelectionRejected",
] as const;
type WarlockInvocationSelectedIdentityResult =
  (typeof WARLOCK_INVOCATION_SELECTED_IDENTITY_RESULTS)[number];
type ChoiceCreationHole = Extract<CreationHole, { readonly kind: "choice" }>;
type SelectedEldritchInvocationFeature = Extract<
  CharacterBuild["features"][number],
  { readonly kind: "selectedEldritchInvocation" }
>;
type PreferredOptionIdsBySource = Readonly<
  Record<string, readonly CreationChoiceOptionId[]>
>;
type WarlockInvocationFacts = {
  readonly selectedInvocationCount: number;
  readonly selectedClassChoiceFeatureRefCount: number;
  readonly warlockInvocationsUnitRefPresent: boolean;
  readonly armorOfShadowsInvocationPresent: boolean;
  readonly pactBladeInvocationPresent: boolean;
  readonly devilsSightInvocationPresent: boolean;
  readonly eldritchMindInvocationPresent: boolean;
  readonly thirstingBladeInvocationPresent: boolean;
  readonly repellingBlastEldritchBlastPresent: boolean;
  readonly repellingBlastPoisonSprayPresent: boolean;
  readonly armorOfShadowsUnitRefPresent: boolean;
  readonly pactMagicCantripCount: number;
  readonly pactMagicPreparedSpellCount: number;
  readonly pactMagicSlotCount: number;
  readonly pactMagicSlotLevel: number;
  readonly totalLevel: number;
};
type WarlockInvocationIssueFlags = {
  readonly lockedReplacementRejected: boolean;
  readonly duplicateNonRepeatableRejected: boolean;
  readonly duplicateRepeatableChoiceRejected: boolean;
};
type WarlockEldritchInvocationsSelectedIdentityDriverAction = Exclude<
  keyof typeof warlockEldritchInvocationsSelectedIdentityDriverSchema,
  "init" | "step"
>;
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly WarlockEldritchInvocationsSelectedIdentityDriverAction[];
  readonly expected: WarlockEldritchInvocationsSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "L1D2-WARLOCK-ELDRITCH-INVOCATIONS";
  readonly unitId: typeof WARLOCK_ELDRITCH_INVOCATIONS_UNIT_ID;
  readonly actions: readonly WarlockEldritchInvocationsSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const warlockEldritchInvocationsSelectedIdentityDriverSchema = {
  init: {},
  doSelectLevelOneArmorOfShadows: {},
  doGainLevelTwoInvocations: {},
  doReplaceArmorWithEldritchMindOnWarlockLevelGain: {},
  doReplaceRepeatableInvocationByChoice: {},
  doRejectPrerequisiteRetainedInvocationReplacement: {},
  doRejectDuplicateInvocationSelections: {},
  step: {},
} as const;

const noRejectedInvocationLifecycleSchema = {
  lockedReplacementRejected: z.literal(false),
  duplicateNonRepeatableRejected: z.literal(false),
  duplicateRepeatableChoiceRejected: z.literal(false),
} as const;
const NO_REJECTED_INVOCATION_LIFECYCLE = {
  lockedReplacementRejected: false,
  duplicateNonRepeatableRejected: false,
  duplicateRepeatableChoiceRejected: false,
} as const satisfies WarlockInvocationIssueFlags;
const selectedInvocationContainerSchema = {
  selectedFromUnitId: z.literal(WARLOCK_ELDRITCH_INVOCATIONS_UNIT_ID),
  selectedClassChoiceFeatureRefCount: z.literal(0),
  warlockInvocationsUnitRefPresent: z.literal(true),
  armorOfShadowsUnitRefPresent: z.literal(false),
} as const;
const noRepeatableBlastInvocationSchema = {
  repellingBlastEldritchBlastPresent: z.literal(false),
  repellingBlastPoisonSprayPresent: z.literal(false),
} as const;
const noDependentBladeInvocationSchema = {
  pactBladeInvocationPresent: z.literal(false),
  thirstingBladeInvocationPresent: z.literal(false),
} as const;
const warlockEldritchInvocationsSelectedIdentityProjectionSchema =
  z.discriminatedUnion("outcome", [
    z.object({
      outcome: z.literal("init"),
      selectedFromUnitId: z.literal("none"),
      selectedInvocationCount: z.literal(0),
      selectedClassChoiceFeatureRefCount: z.literal(0),
      warlockInvocationsUnitRefPresent: z.literal(false),
      armorOfShadowsInvocationPresent: z.literal(false),
      pactBladeInvocationPresent: z.literal(false),
      devilsSightInvocationPresent: z.literal(false),
      eldritchMindInvocationPresent: z.literal(false),
      thirstingBladeInvocationPresent: z.literal(false),
      ...noRepeatableBlastInvocationSchema,
      armorOfShadowsUnitRefPresent: z.literal(false),
      pactMagicCantripCount: z.literal(0),
      pactMagicPreparedSpellCount: z.literal(0),
      pactMagicSlotCount: z.literal(0),
      pactMagicSlotLevel: z.literal(0),
      totalLevel: z.literal(1),
      ...noRejectedInvocationLifecycleSchema,
    }),
    z.object({
      outcome: z.literal("levelOneSelected"),
      ...selectedInvocationContainerSchema,
      selectedInvocationCount: z.literal(1),
      armorOfShadowsInvocationPresent: z.literal(true),
      ...noDependentBladeInvocationSchema,
      devilsSightInvocationPresent: z.literal(false),
      eldritchMindInvocationPresent: z.literal(false),
      ...noRepeatableBlastInvocationSchema,
      pactMagicCantripCount: z.literal(2),
      pactMagicPreparedSpellCount: z.literal(2),
      pactMagicSlotCount: z.literal(1),
      pactMagicSlotLevel: z.literal(1),
      totalLevel: z.literal(1),
      ...noRejectedInvocationLifecycleSchema,
    }),
    z.object({
      outcome: z.literal("levelTwoGained"),
      ...selectedInvocationContainerSchema,
      selectedInvocationCount: z.literal(3),
      armorOfShadowsInvocationPresent: z.literal(true),
      pactBladeInvocationPresent: z.literal(true),
      devilsSightInvocationPresent: z.literal(true),
      eldritchMindInvocationPresent: z.literal(false),
      thirstingBladeInvocationPresent: z.literal(false),
      ...noRepeatableBlastInvocationSchema,
      pactMagicCantripCount: z.literal(2),
      pactMagicPreparedSpellCount: z.literal(3),
      pactMagicSlotCount: z.literal(2),
      pactMagicSlotLevel: z.literal(1),
      totalLevel: z.literal(2),
      ...noRejectedInvocationLifecycleSchema,
    }),
    z.object({
      outcome: z.literal("nonRepeatableReplaced"),
      ...selectedInvocationContainerSchema,
      selectedInvocationCount: z.literal(3),
      armorOfShadowsInvocationPresent: z.literal(false),
      pactBladeInvocationPresent: z.literal(true),
      devilsSightInvocationPresent: z.literal(true),
      eldritchMindInvocationPresent: z.literal(true),
      thirstingBladeInvocationPresent: z.literal(false),
      ...noRepeatableBlastInvocationSchema,
      pactMagicCantripCount: z.literal(2),
      pactMagicPreparedSpellCount: z.literal(4),
      pactMagicSlotCount: z.literal(2),
      pactMagicSlotLevel: z.literal(2),
      totalLevel: z.literal(3),
      ...noRejectedInvocationLifecycleSchema,
    }),
    z.object({
      outcome: z.literal("repeatableReplaced"),
      ...selectedInvocationContainerSchema,
      selectedInvocationCount: z.literal(3),
      armorOfShadowsInvocationPresent: z.literal(true),
      ...noDependentBladeInvocationSchema,
      devilsSightInvocationPresent: z.literal(true),
      eldritchMindInvocationPresent: z.literal(false),
      repellingBlastEldritchBlastPresent: z.literal(false),
      repellingBlastPoisonSprayPresent: z.literal(true),
      pactMagicCantripCount: z.literal(2),
      pactMagicPreparedSpellCount: z.literal(4),
      pactMagicSlotCount: z.literal(2),
      pactMagicSlotLevel: z.literal(2),
      totalLevel: z.literal(3),
      ...noRejectedInvocationLifecycleSchema,
    }),
    z.object({
      outcome: z.literal("lockedReplacementRejected"),
      ...selectedInvocationContainerSchema,
      selectedInvocationCount: z.literal(5),
      armorOfShadowsInvocationPresent: z.literal(true),
      pactBladeInvocationPresent: z.literal(true),
      devilsSightInvocationPresent: z.literal(true),
      eldritchMindInvocationPresent: z.literal(true),
      thirstingBladeInvocationPresent: z.literal(true),
      ...noRepeatableBlastInvocationSchema,
      pactMagicCantripCount: z.literal(3),
      pactMagicPreparedSpellCount: z.literal(6),
      pactMagicSlotCount: z.literal(2),
      pactMagicSlotLevel: z.literal(3),
      totalLevel: z.literal(5),
      lockedReplacementRejected: z.literal(true),
      duplicateNonRepeatableRejected: z.literal(false),
      duplicateRepeatableChoiceRejected: z.literal(false),
    }),
    z.object({
      outcome: z.literal("duplicateSelectionRejected"),
      ...selectedInvocationContainerSchema,
      selectedInvocationCount: z.literal(1),
      armorOfShadowsInvocationPresent: z.literal(true),
      ...noDependentBladeInvocationSchema,
      devilsSightInvocationPresent: z.literal(false),
      eldritchMindInvocationPresent: z.literal(false),
      ...noRepeatableBlastInvocationSchema,
      pactMagicCantripCount: z.literal(2),
      pactMagicPreparedSpellCount: z.literal(2),
      pactMagicSlotCount: z.literal(1),
      pactMagicSlotLevel: z.literal(1),
      totalLevel: z.literal(1),
      lockedReplacementRejected: z.literal(false),
      duplicateNonRepeatableRejected: z.literal(true),
      duplicateRepeatableChoiceRejected: z.literal(true),
    }),
  ]);
type WarlockEldritchInvocationsSelectedIdentityProjection = z.infer<
  typeof warlockEldritchInvocationsSelectedIdentityProjectionSchema
>;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Character Creation Warlock Eldritch Invocations selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "L1D2-WARLOCK-ELDRITCH-INVOCATIONS",
    unitId: "warlock_eldritch_invocations",
    actions: [
      "doSelectLevelOneArmorOfShadows",
      "doGainLevelTwoInvocations",
      "doReplaceArmorWithEldritchMindOnWarlockLevelGain",
      "doReplaceRepeatableInvocationByChoice",
      "doRejectPrerequisiteRetainedInvocationReplacement",
      "doRejectDuplicateInvocationSelections",
    ],
    sequences: [
      {
        name: "warlock-one-finalizes-selected-armor-of-shadows",
        actions: ["doSelectLevelOneArmorOfShadows"],
        expected: levelOneArmorOfShadowsProjection(),
      },
      {
        name: "warlock-two-gains-two-invocations-from-the-warlock-table",
        actions: ["doGainLevelTwoInvocations"],
        expected: levelTwoInvocationGainProjection(),
      },
      {
        name: "warlock-level-gain-replaces-armor-with-eldritch-mind",
        actions: ["doReplaceArmorWithEldritchMindOnWarlockLevelGain"],
        expected: nonRepeatableReplacementProjection(),
      },
      {
        name: "warlock-level-gain-replaces-one-repeatable-invocation-choice",
        actions: ["doReplaceRepeatableInvocationByChoice"],
        expected: repeatableReplacementProjection(),
      },
      {
        name: "warlock-level-gain-rejects-replacing-prerequisite-retained-invocation",
        actions: ["doRejectPrerequisiteRetainedInvocationReplacement"],
        expected: lockedReplacementRejectedProjection(),
      },
      {
        name: "warlock-level-gain-rejects-duplicate-invocation-selection-identity",
        actions: ["doRejectDuplicateInvocationSelections"],
        expected: duplicateSelectionRejectedProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

const quintStateSchema = z.object({
  outcome: z.unknown().transform(outcomeField),
  selectedFromUnitId: z.union([
    z.literal("none"),
    z.literal(WARLOCK_ELDRITCH_INVOCATIONS_UNIT_ID),
  ]),
  selectedInvocationCount: z.bigint(),
  selectedClassChoiceFeatureRefCount: z.bigint(),
  warlockInvocationsUnitRefPresent: z.boolean(),
  armorOfShadowsInvocationPresent: z.boolean(),
  pactBladeInvocationPresent: z.boolean(),
  devilsSightInvocationPresent: z.boolean(),
  eldritchMindInvocationPresent: z.boolean(),
  thirstingBladeInvocationPresent: z.boolean(),
  repellingBlastEldritchBlastPresent: z.boolean(),
  repellingBlastPoisonSprayPresent: z.boolean(),
  armorOfShadowsUnitRefPresent: z.boolean(),
  pactMagicCantripCount: z.bigint(),
  pactMagicPreparedSpellCount: z.bigint(),
  pactMagicSlotCount: z.bigint(),
  pactMagicSlotLevel: z.bigint(),
  totalLevel: z.bigint(),
  lockedReplacementRejected: z.boolean(),
  duplicateNonRepeatableRejected: z.boolean(),
  duplicateRepeatableChoiceRejected: z.boolean(),
});

const qntOutcomeByVariant = {
  CharacterCreationWarlockEldritchInvocationsSelectedIdentityInit: "init",
  CharacterCreationWarlockEldritchInvocationsSelectedIdentityLevelOneSelected:
    "levelOneSelected",
  CharacterCreationWarlockEldritchInvocationsSelectedIdentityLevelTwoGained:
    "levelTwoGained",
  CharacterCreationWarlockEldritchInvocationsSelectedIdentityNonRepeatableReplaced:
    "nonRepeatableReplaced",
  CharacterCreationWarlockEldritchInvocationsSelectedIdentityRepeatableReplaced:
    "repeatableReplaced",
  CharacterCreationWarlockEldritchInvocationsSelectedIdentityLockedReplacementRejected:
    "lockedReplacementRejected",
  CharacterCreationWarlockEldritchInvocationsSelectedIdentityDuplicateSelectionRejected:
    "duplicateSelectionRejected",
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

describe("Character Creation Warlock Eldritch Invocations selected identity replay", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<WarlockEldritchInvocationsSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver =
          createWarlockEldritchInvocationsSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Character Creation Warlock Eldritch Invocations selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Character Creation Warlock Eldritch Invocations selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Character Creation Warlock Eldritch Invocations selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-creation-warlock-eldritch-invocations-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createWarlockEldritchInvocationsSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: warlockEldritchInvocationsSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createWarlockEldritchInvocationsSelectedIdentityDriver() {
  return defineDriver(
    warlockEldritchInvocationsSelectedIdentityDriverSchema,
    () => {
      let projection: WarlockEldritchInvocationsSelectedIdentityProjection =
        initialProjection();

      function reset(): void {
        projection = initialProjection();
      }

      return {
        init: reset,
        doSelectLevelOneArmorOfShadows: () => {
          projection = levelOneArmorOfShadowsProjection();
        },
        doGainLevelTwoInvocations: () => {
          projection = levelTwoInvocationGainProjection();
        },
        doReplaceArmorWithEldritchMindOnWarlockLevelGain: () => {
          projection = nonRepeatableReplacementProjection();
        },
        doReplaceRepeatableInvocationByChoice: () => {
          projection = repeatableReplacementProjection();
        },
        doRejectPrerequisiteRetainedInvocationReplacement: () => {
          projection = lockedReplacementRejectedProjection();
        },
        doRejectDuplicateInvocationSelections: () => {
          projection = duplicateSelectionRejectedProjection();
        },
        step: () => {},
        getState: () => projection,
      };
    },
  );
}

function initialProjection(): WarlockEldritchInvocationsSelectedIdentityProjection {
  return warlockEldritchInvocationsSelectedIdentityProjectionSchema.parse({
    outcome: "init",
    selectedFromUnitId: "none",
    selectedInvocationCount: 0,
    selectedClassChoiceFeatureRefCount: 0,
    warlockInvocationsUnitRefPresent: false,
    armorOfShadowsInvocationPresent: false,
    pactBladeInvocationPresent: false,
    devilsSightInvocationPresent: false,
    eldritchMindInvocationPresent: false,
    thirstingBladeInvocationPresent: false,
    repellingBlastEldritchBlastPresent: false,
    repellingBlastPoisonSprayPresent: false,
    armorOfShadowsUnitRefPresent: false,
    pactMagicCantripCount: 0,
    pactMagicPreparedSpellCount: 0,
    pactMagicSlotCount: 0,
    pactMagicSlotLevel: 0,
    totalLevel: 1,
    lockedReplacementRejected: false,
    duplicateNonRepeatableRejected: false,
    duplicateRepeatableChoiceRejected: false,
  });
}

function levelOneArmorOfShadowsProjection(): WarlockEldritchInvocationsSelectedIdentityProjection {
  return projectionFromBuild({
    outcome: "levelOneSelected",
    build: finalizedWarlockBuild("warlock-eldritch-invocations-level-one"),
    issueFlags: NO_REJECTED_INVOCATION_LIFECYCLE,
  });
}

function levelTwoInvocationGainProjection(): WarlockEldritchInvocationsSelectedIdentityProjection {
  return projectionFromBuild({
    outcome: "levelTwoGained",
    build: levelTwoNonRepeatableInvocationBuild(),
    issueFlags: NO_REJECTED_INVOCATION_LIFECYCLE,
  });
}

function nonRepeatableReplacementProjection(): WarlockEldritchInvocationsSelectedIdentityProjection {
  return projectionFromBuild({
    outcome: "nonRepeatableReplaced",
    build: nonRepeatableReplacementBuild(),
    issueFlags: NO_REJECTED_INVOCATION_LIFECYCLE,
  });
}

function repeatableReplacementProjection(): WarlockEldritchInvocationsSelectedIdentityProjection {
  return projectionFromBuild({
    outcome: "repeatableReplaced",
    build: repeatableReplacementBuild(),
    issueFlags: NO_REJECTED_INVOCATION_LIFECYCLE,
  });
}

function lockedReplacementRejectedProjection(): WarlockEldritchInvocationsSelectedIdentityProjection {
  const build = warlockLevelFiveBuildWithThirstingBlade();
  const result = advanceCharacterBuildClassLevel({
    build,
    unitLibrary,
    levelGain: expectRight(
      warlockLevelGain({
        unitLibrary,
        classUnitId: warlockClassUnitId(),
        hitPointRule: { tag: "fixedHigherLevelGain" },
        pactMagic: warlockPactMagicLevelGain({
          gainedPreparedSpells: ["hideous_laughter"],
        }),
        gainedInvocations: [],
        replacement: {
          replaceInvocation: nonRepeatableEldritchInvocation(
            PACT_OF_THE_BLADE_INVOCATION_ID,
          ),
          selectedInvocation: nonRepeatableEldritchInvocation(
            PACT_OF_THE_CHAIN_INVOCATION_ID,
          ),
        },
      }),
    ),
  });
  expectLeftCode(result, "lockedEldritchInvocationReplacement");

  return projectionFromBuild({
    outcome: "lockedReplacementRejected",
    build,
    issueFlags: {
      lockedReplacementRejected: true,
      duplicateNonRepeatableRejected: false,
      duplicateRepeatableChoiceRejected: false,
    },
  });
}

function duplicateSelectionRejectedProjection(): WarlockEldritchInvocationsSelectedIdentityProjection {
  const build = warlockBuildWithKnownWarlockCantrips(
    finalizedWarlockBuild("warlock-eldritch-invocations-duplicates"),
    [ELDRITCH_BLAST_CANTRIP_UNIT_ID, POISON_SPRAY_CANTRIP_UNIT_ID],
  );
  const duplicateNonRepeatable = advanceCharacterBuildClassLevel({
    build,
    unitLibrary,
    levelGain: expectRight(
      warlockLevelGain({
        unitLibrary,
        classUnitId: warlockClassUnitId(),
        hitPointRule: { tag: "fixedHigherLevelGain" },
        pactMagic: warlockPactMagicLevelGain({
          gainedPreparedSpells: ["hex"],
        }),
        gainedInvocations: [
          nonRepeatableEldritchInvocation(ARMOR_OF_SHADOWS_INVOCATION_ID),
          nonRepeatableEldritchInvocation(DEVILS_SIGHT_INVOCATION_ID),
        ],
      }),
    ),
  });
  expectLeftCode(
    duplicateNonRepeatable,
    "duplicateEldritchInvocationSelection",
  );

  const duplicateRepeatable = advanceCharacterBuildClassLevel({
    build,
    unitLibrary,
    levelGain: expectRight(
      warlockLevelGain({
        unitLibrary,
        classUnitId: warlockClassUnitId(),
        hitPointRule: { tag: "fixedHigherLevelGain" },
        pactMagic: warlockPactMagicLevelGain({
          gainedPreparedSpells: ["hex"],
        }),
        gainedInvocations: [
          repeatableEldritchInvocation(
            REPELLING_BLAST_INVOCATION_ID,
            ELDRITCH_BLAST_CHOICE,
          ),
          repeatableEldritchInvocation(
            REPELLING_BLAST_INVOCATION_ID,
            ELDRITCH_BLAST_CHOICE,
          ),
        ],
      }),
    ),
  });
  expectLeftCode(duplicateRepeatable, "duplicateEldritchInvocationSelection");

  return projectionFromBuild({
    outcome: "duplicateSelectionRejected",
    build,
    issueFlags: {
      lockedReplacementRejected: false,
      duplicateNonRepeatableRejected: true,
      duplicateRepeatableChoiceRejected: true,
    },
  });
}

function projectionFromBuild(input: {
  readonly outcome: WarlockInvocationSelectedIdentityResult;
  readonly build: CharacterBuild;
  readonly issueFlags: WarlockInvocationIssueFlags;
}): WarlockEldritchInvocationsSelectedIdentityProjection {
  const facts = warlockInvocationFacts(input.build);
  return warlockEldritchInvocationsSelectedIdentityProjectionSchema.parse({
    outcome: input.outcome,
    selectedFromUnitId: WARLOCK_ELDRITCH_INVOCATIONS_UNIT_ID,
    selectedInvocationCount: facts.selectedInvocationCount,
    selectedClassChoiceFeatureRefCount:
      facts.selectedClassChoiceFeatureRefCount,
    warlockInvocationsUnitRefPresent: facts.warlockInvocationsUnitRefPresent,
    armorOfShadowsInvocationPresent: facts.armorOfShadowsInvocationPresent,
    pactBladeInvocationPresent: facts.pactBladeInvocationPresent,
    devilsSightInvocationPresent: facts.devilsSightInvocationPresent,
    eldritchMindInvocationPresent: facts.eldritchMindInvocationPresent,
    thirstingBladeInvocationPresent: facts.thirstingBladeInvocationPresent,
    repellingBlastEldritchBlastPresent:
      facts.repellingBlastEldritchBlastPresent,
    repellingBlastPoisonSprayPresent: facts.repellingBlastPoisonSprayPresent,
    armorOfShadowsUnitRefPresent: facts.armorOfShadowsUnitRefPresent,
    pactMagicCantripCount: facts.pactMagicCantripCount,
    pactMagicPreparedSpellCount: facts.pactMagicPreparedSpellCount,
    pactMagicSlotCount: facts.pactMagicSlotCount,
    pactMagicSlotLevel: facts.pactMagicSlotLevel,
    totalLevel: facts.totalLevel,
    lockedReplacementRejected: input.issueFlags.lockedReplacementRejected,
    duplicateNonRepeatableRejected:
      input.issueFlags.duplicateNonRepeatableRejected,
    duplicateRepeatableChoiceRejected:
      input.issueFlags.duplicateRepeatableChoiceRejected,
  });
}

function finalizedWarlockBuild(draftId: string): CharacterBuild {
  const result = finalizeCharacterDraft({
    draft: completeWarlockDraft(draftId),
    unitLibrary,
  });
  if (result.tag !== "ready") {
    throw new Error(
      `Expected Warlock Eldritch Invocations selected identity finalization to be ready, received ${result.tag}.`,
    );
  }

  return result.build;
}

function levelTwoNonRepeatableInvocationBuild(): CharacterBuild {
  return expectRight(
    advanceCharacterBuildClassLevel({
      build: finalizedWarlockBuild("warlock-eldritch-invocations-level-two"),
      unitLibrary,
      levelGain: expectRight(
        warlockLevelGain({
          unitLibrary,
          classUnitId: warlockClassUnitId(),
          hitPointRule: { tag: "fixedHigherLevelGain" },
          pactMagic: warlockPactMagicLevelGain({
            gainedPreparedSpells: ["hex"],
          }),
          gainedInvocations: [
            nonRepeatableEldritchInvocation(PACT_OF_THE_BLADE_INVOCATION_ID),
            nonRepeatableEldritchInvocation(DEVILS_SIGHT_INVOCATION_ID),
          ],
        }),
      ),
    }),
  );
}

function nonRepeatableReplacementBuild(): CharacterBuild {
  return expectRight(
    advanceCharacterBuildClassLevel({
      build: levelTwoNonRepeatableInvocationBuild(),
      unitLibrary,
      levelGain: expectRight(
        warlockLevelGain({
          unitLibrary,
          classUnitId: warlockClassUnitId(),
          hitPointRule: { tag: "fixedHigherLevelGain" },
          pactMagic: warlockPactMagicLevelGain({
            gainedPreparedSpells: ["bane"],
          }),
          gainedInvocations: [],
          replacement: {
            replaceInvocation: nonRepeatableEldritchInvocation(
              ARMOR_OF_SHADOWS_INVOCATION_ID,
            ),
            selectedInvocation: nonRepeatableEldritchInvocation(
              ELDRITCH_MIND_INVOCATION_ID,
            ),
          },
        }),
      ),
    }),
  );
}

function repeatableReplacementBuild(): CharacterBuild {
  const levelTwo = expectRight(
    advanceCharacterBuildClassLevel({
      build: warlockBuildWithKnownWarlockCantrips(
        finalizedWarlockBuild("warlock-eldritch-invocations-repeatable"),
        [ELDRITCH_BLAST_CANTRIP_UNIT_ID, POISON_SPRAY_CANTRIP_UNIT_ID],
      ),
      unitLibrary,
      levelGain: expectRight(
        warlockLevelGain({
          unitLibrary,
          classUnitId: warlockClassUnitId(),
          hitPointRule: { tag: "fixedHigherLevelGain" },
          pactMagic: warlockPactMagicLevelGain({
            gainedPreparedSpells: ["hex"],
          }),
          gainedInvocations: [
            repeatableEldritchInvocation(
              REPELLING_BLAST_INVOCATION_ID,
              ELDRITCH_BLAST_CHOICE,
            ),
            repeatableEldritchInvocation(
              REPELLING_BLAST_INVOCATION_ID,
              POISON_SPRAY_CHOICE,
            ),
          ],
        }),
      ),
    }),
  );

  return expectRight(
    advanceCharacterBuildClassLevel({
      build: levelTwo,
      unitLibrary,
      levelGain: expectRight(
        warlockLevelGain({
          unitLibrary,
          classUnitId: warlockClassUnitId(),
          hitPointRule: { tag: "fixedHigherLevelGain" },
          pactMagic: warlockPactMagicLevelGain({
            gainedPreparedSpells: ["bane"],
          }),
          gainedInvocations: [],
          replacement: {
            replaceInvocation: repeatableEldritchInvocation(
              REPELLING_BLAST_INVOCATION_ID,
              ELDRITCH_BLAST_CHOICE,
            ),
            selectedInvocation: nonRepeatableEldritchInvocation(
              DEVILS_SIGHT_INVOCATION_ID,
            ),
          },
        }),
      ),
    }),
  );
}

function warlockLevelFiveBuildWithThirstingBlade(): CharacterBuild {
  const levelTwo = levelTwoNonRepeatableInvocationBuild();
  const levelThree = expectRight(
    advanceCharacterBuildClassLevel({
      build: levelTwo,
      unitLibrary,
      levelGain: expectRight(
        warlockLevelGain({
          unitLibrary,
          classUnitId: warlockClassUnitId(),
          hitPointRule: { tag: "fixedHigherLevelGain" },
          pactMagic: warlockPactMagicLevelGain({
            gainedPreparedSpells: ["bane"],
          }),
          gainedInvocations: [],
        }),
      ),
    }),
  );
  const levelFour = expectRight(
    advanceCharacterBuildClassLevel({
      build: levelThree,
      unitLibrary,
      levelGain: expectRight(
        warlockLevelGain({
          unitLibrary,
          classUnitId: warlockClassUnitId(),
          hitPointRule: { tag: "fixedHigherLevelGain" },
          pactMagic: warlockPactMagicLevelGain({
            gainedCantrips: [POISON_SPRAY_CANTRIP_UNIT_ID],
            gainedPreparedSpells: ["detect_magic"],
          }),
          gainedInvocations: [],
        }),
      ),
    }),
  );

  return expectRight(
    advanceCharacterBuildClassLevel({
      build: levelFour,
      unitLibrary,
      levelGain: expectRight(
        warlockLevelGain({
          unitLibrary,
          classUnitId: warlockClassUnitId(),
          hitPointRule: { tag: "fixedHigherLevelGain" },
          pactMagic: warlockPactMagicLevelGain({
            gainedPreparedSpells: ["expeditious_retreat"],
          }),
          gainedInvocations: [
            nonRepeatableEldritchInvocation(THIRSTING_BLADE_INVOCATION_ID),
            nonRepeatableEldritchInvocation(ELDRITCH_MIND_INVOCATION_ID),
          ],
        }),
      ),
    }),
  );
}

function completeWarlockDraft(draftId: string): CharacterDraft {
  let draft = createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId(draftId),
  });
  const progression = warlockProgression();
  const preferredOptionIdsBySource = preferredWarlockOptionIdsBySource();

  for (let pass = 0; pass < 8; pass += 1) {
    const holes = fillableHolesForPass(
      discoverCreationHoles({ draft, unitLibrary }),
    );
    if (holes.length === 0) {
      return draft;
    }

    draft = acceptedBatch(
      fillCreationHoles({
        draft,
        unitLibrary,
        expectedRevision: draft.revision,
        fills: holes.map((hole) =>
          supportProfileFillForHole({
            hole,
            progression,
            preferredOptionIdsBySource,
          }),
        ),
      }),
    ).draft;
  }

  throw new Error(
    `Warlock Eldritch Invocations selected identity fixture still has holes after iterative fills: ${JSON.stringify(
      discoverCreationHoles({ draft, unitLibrary }).map((hole) => hole.holeId),
    )}`,
  );
}

function fillableHolesForPass(
  holes: readonly CreationHole[],
): readonly CreationHole[] {
  const seenHoleIds = new Set<string>();
  const seenLoadoutSlots = new Set<string>();
  return holes.filter((hole) => {
    const key = String(hole.holeId);
    if (seenHoleIds.has(key)) {
      return false;
    }
    seenHoleIds.add(key);
    if (hole.source.tag === "loadout") {
      const slot = String(hole.source.slot);
      if (seenLoadoutSlots.has(slot)) {
        return false;
      }
      seenLoadoutSlots.add(slot);
    }
    return true;
  });
}

function preferredWarlockOptionIdsBySource(): PreferredOptionIdsBySource {
  return {
    [choiceSourceKey(WARLOCK_CLASS_UNIT_ID, CLASS_CANTRIP_CHOICE_KEY)]:
      LEVEL_ONE_CANTRIP_UNIT_IDS.map(creationChoiceOptionId),
    [choiceSourceKey(WARLOCK_CLASS_UNIT_ID, CLASS_PREPARED_SPELL_CHOICE_KEY)]:
      LEVEL_ONE_PREPARED_SPELL_UNIT_IDS.map(creationChoiceOptionId),
    [choiceSourceKey(
      WARLOCK_ELDRITCH_INVOCATIONS_UNIT_ID,
      ELDRITCH_INVOCATIONS_CHOICE_KEY,
    )]: [creationChoiceOptionId(ARMOR_OF_SHADOWS_INVOCATION_ID)],
    [choiceSourceKey(WARLOCK_CLASS_UNIT_ID, EQUIPMENT_PURCHASE_CHOICE_KEY)]:
      WARLOCK_FIXTURE_PURCHASE_UNIT_IDS.map(creationChoiceOptionId),
  };
}

function supportProfileFillForHole(input: {
  readonly hole: CreationHole;
  readonly progression: CharacterProgression;
  readonly preferredOptionIdsBySource: PreferredOptionIdsBySource;
}): CreationFill {
  const hole = input.hole;
  if (hole.kind === "abilityScores") {
    return {
      kind: "abilityScores",
      holeId: hole.holeId,
      method: "standardArray",
      value: testAbilityScoreAssignment({
        str: 8,
        dex: 14,
        con: 13,
        int: 10,
        wis: 12,
        cha: 15,
      }),
    };
  }

  const supportedOptionIds = supportedHoleOptionIds(hole);
  if (supportedOptionIds === undefined) {
    throw new Error(
      `No support-profile options for Warlock Eldritch Invocations selected identity hole ${hole.holeId}.`,
    );
  }
  const holeOptionIdSet = new Set(
    hole.options.map((option) => option.optionId),
  );
  const supportedOptionIdSet = new Set(supportedOptionIds);
  const preferredOptionIds = preferredOptionIdsForHole({
    hole,
    progression: input.progression,
    preferredOptionIdsBySource: input.preferredOptionIdsBySource,
  });
  const defaultOptionIds = hole.options.map((option) => option.optionId);
  const selectedOptionIds = (preferredOptionIds ?? defaultOptionIds)
    .filter((optionId) => holeOptionIdSet.has(optionId))
    .filter((optionId) => supportedOptionIdSet.has(optionId))
    .slice(0, choiceCardinalityBounds(hole.cardinality).max);
  if (
    selectedOptionIds.length < choiceCardinalityBounds(hole.cardinality).max
  ) {
    throw new Error(
      `Not enough support-profile options for Warlock Eldritch Invocations selected identity hole ${hole.holeId}.`,
    );
  }

  return choiceFill(hole, selectedOptionIds);
}

function preferredOptionIdsForHole(input: {
  readonly hole: ChoiceCreationHole;
  readonly progression: CharacterProgression;
  readonly preferredOptionIdsBySource: PreferredOptionIdsBySource;
}): readonly CreationChoiceOptionId[] | undefined {
  const source = input.hole.source;
  if (source.tag === "draft" && source.path === "draft.progression.initial") {
    return [progressionOptionId(input.progression)];
  }
  if (source.tag === "draft" && source.path === "draft.background") {
    return [creationChoiceOptionId("background_soldier")];
  }
  if (source.tag === "draft" && source.path === "draft.species") {
    return [creationChoiceOptionId("species_orc")];
  }
  if (source.tag !== "unitChoice") {
    return undefined;
  }

  return (
    input.preferredOptionIdsBySource[
      choiceSourceKey(source.unitId, source.choiceKey)
    ] ?? soldierBackgroundFixtureOptionIds(source)
  );
}

function warlockProgression(): CharacterProgression {
  const parsedClassUnitId = classUnitIdFromUnitId({
    unitLibrary,
    classUnitId: WARLOCK_CLASS_UNIT_ID,
  });
  if (Either.isLeft(parsedClassUnitId)) {
    throw new Error(
      `Invalid Warlock class Unit id: ${JSON.stringify(parsedClassUnitId.left)}`,
    );
  }
  const parsedProgression = parseCharacterProgressionShape({
    startingClass: parsedClassUnitId.right,
    advancements: [],
  });
  if (Either.isLeft(parsedProgression)) {
    throw new Error(
      `Invalid Warlock Eldritch Invocations selected identity progression: ${JSON.stringify(parsedProgression.left)}`,
    );
  }

  return parsedProgression.right;
}

function warlockClassUnitId() {
  return expectRight(
    classUnitIdFromUnitId({
      unitLibrary,
      classUnitId: WARLOCK_CLASS_UNIT_ID,
    }),
  );
}

function warlockBuildWithKnownWarlockCantrips(
  build: CharacterBuild,
  cantripIds: readonly UnitRecord["id"][],
): CharacterBuild {
  const spellcasting = build.spellcasting;
  if (spellcasting === undefined) {
    throw new Error("Warlock selected identity build must have spellcasting.");
  }
  const firstSource = spellcasting.sources[0];
  if (firstSource === undefined) {
    throw new Error(
      "Warlock selected identity build must have a spellcasting source.",
    );
  }
  const withCantrips = (
    source: (typeof spellcasting.sources)[number],
  ): (typeof spellcasting.sources)[number] => {
    if (source.sourceUnitId !== WARLOCK_CLASS_UNIT_ID) return source;

    const nextCantrips = [
      ...cantripIds,
      ...source.cantrips.filter((cantripId) => !cantripIds.includes(cantripId)),
    ].slice(0, source.cantrips.length);
    return { ...source, cantrips: nextCantrips };
  };

  return {
    ...build,
    spellcasting: {
      ...spellcasting,
      sources: [
        withCantrips(firstSource),
        ...spellcasting.sources.slice(1).map(withCantrips),
      ],
    },
  };
}

function warlockPactMagicLevelGain(
  input: Partial<CharacterBuildWarlockPactMagicLevelGain> = {},
): CharacterBuildWarlockPactMagicLevelGain {
  return {
    gainedCantrips: input.gainedCantrips ?? [],
    ...(input.cantripReplacement === undefined
      ? {}
      : { cantripReplacement: input.cantripReplacement }),
    gainedPreparedSpells: input.gainedPreparedSpells ?? [],
    ...(input.preparedSpellReplacement === undefined
      ? {}
      : { preparedSpellReplacement: input.preparedSpellReplacement }),
  };
}

function nonRepeatableEldritchInvocation(
  invocationId: EldritchInvocationId,
): CharacterBuildWarlockEldritchInvocationSelectionInput {
  return {
    kind: "nonRepeatable",
    invocationId,
  };
}

function repeatableEldritchInvocation(
  invocationId: EldritchInvocationId,
  repeatableChoice: CharacterBuildEldritchInvocationRepeatableChoice,
): CharacterBuildWarlockEldritchInvocationSelectionInput {
  return {
    kind: "repeatable",
    invocationId,
    repeatableChoice,
  };
}

function warlockInvocationFacts(build: CharacterBuild): WarlockInvocationFacts {
  const selectedInvocationFeatures = build.features.filter(
    isWarlockEldritchInvocationFeature,
  );
  const selectedClassChoiceFeatureRefCount = build.features.filter(
    (feature) =>
      feature.kind === "selectedClassChoice" &&
      feature.selectedFromUnitId === WARLOCK_ELDRITCH_INVOCATIONS_UNIT_ID,
  ).length;
  const unitRefIds = characterBuildUnitRefs(build, unitLibrary).map(
    (ref) => ref.unitId,
  );
  const spellcasting = warlockSpellcastingFacts(build);

  return {
    selectedInvocationCount: selectedInvocationFeatures.length,
    selectedClassChoiceFeatureRefCount,
    warlockInvocationsUnitRefPresent: unitRefIds.includes(
      WARLOCK_ELDRITCH_INVOCATIONS_UNIT_ID,
    ),
    armorOfShadowsInvocationPresent: hasNonRepeatableInvocation(
      selectedInvocationFeatures,
      ARMOR_OF_SHADOWS_INVOCATION_ID,
    ),
    pactBladeInvocationPresent: hasNonRepeatableInvocation(
      selectedInvocationFeatures,
      PACT_OF_THE_BLADE_INVOCATION_ID,
    ),
    devilsSightInvocationPresent: hasNonRepeatableInvocation(
      selectedInvocationFeatures,
      DEVILS_SIGHT_INVOCATION_ID,
    ),
    eldritchMindInvocationPresent: hasNonRepeatableInvocation(
      selectedInvocationFeatures,
      ELDRITCH_MIND_INVOCATION_ID,
    ),
    thirstingBladeInvocationPresent: hasNonRepeatableInvocation(
      selectedInvocationFeatures,
      THIRSTING_BLADE_INVOCATION_ID,
    ),
    repellingBlastEldritchBlastPresent: hasRepeatableKnownCantripInvocation(
      selectedInvocationFeatures,
      REPELLING_BLAST_INVOCATION_ID,
      ELDRITCH_BLAST_CANTRIP_UNIT_ID,
    ),
    repellingBlastPoisonSprayPresent: hasRepeatableKnownCantripInvocation(
      selectedInvocationFeatures,
      REPELLING_BLAST_INVOCATION_ID,
      POISON_SPRAY_CANTRIP_UNIT_ID,
    ),
    armorOfShadowsUnitRefPresent: unitRefIds.includes("armor_of_shadows"),
    pactMagicCantripCount: spellcasting.cantripCount,
    pactMagicPreparedSpellCount: spellcasting.preparedSpellCount,
    pactMagicSlotCount: spellcasting.slotCount,
    pactMagicSlotLevel: spellcasting.slotLevel,
    totalLevel: computeTotalLevel(build.progression),
  };
}

function isWarlockEldritchInvocationFeature(
  feature: CharacterBuild["features"][number],
): feature is SelectedEldritchInvocationFeature {
  return (
    feature.kind === "selectedEldritchInvocation" &&
    feature.selectedFromUnitId === WARLOCK_ELDRITCH_INVOCATIONS_UNIT_ID
  );
}

function warlockSpellcastingFacts(build: CharacterBuild): {
  readonly cantripCount: number;
  readonly preparedSpellCount: number;
  readonly slotCount: number;
  readonly slotLevel: number;
} {
  const source = build.spellcasting?.sources.find(
    (candidate) => candidate.sourceUnitId === WARLOCK_CLASS_UNIT_ID,
  );
  const pactMagic = build.spellcasting?.slotPools.pactMagic;
  if (source === undefined || pactMagic === undefined) {
    throw new Error(
      "Warlock Eldritch Invocations selected identity build must have Pact Magic facts.",
    );
  }

  return {
    cantripCount: source.cantrips.length,
    preparedSpellCount: source.preparedSpells.length,
    slotCount: pactMagic.count,
    slotLevel: pactMagic.slotLevel,
  };
}

function hasNonRepeatableInvocation(
  features: readonly SelectedEldritchInvocationFeature[],
  invocationId: EldritchInvocationId,
): boolean {
  return features.some(
    (feature) =>
      feature.selection.kind === "nonRepeatable" &&
      feature.selection.invocationId === invocationId,
  );
}

function hasRepeatableKnownCantripInvocation(
  features: readonly SelectedEldritchInvocationFeature[],
  invocationId: EldritchInvocationId,
  cantripId: UnitRecord["id"],
): boolean {
  return features.some(
    (feature) =>
      feature.selection.kind === "repeatable" &&
      feature.selection.invocationId === invocationId &&
      feature.selection.repeatableChoice.kind === "knownWarlockCantrip" &&
      feature.selection.repeatableChoice.cantripId === cantripId,
  );
}

function choiceSourceKey(unitId: string, choiceKey: UnitChoiceKey): string {
  return `${unitId}/${choiceKey}`;
}

function choiceFill(
  hole: ChoiceCreationHole,
  optionIds: readonly CreationChoiceOptionId[],
): CreationFill {
  return {
    kind: "choice",
    holeId: hole.holeId,
    optionIds,
  };
}

function acceptedBatch(
  result: CreationBatchFillResult,
): Extract<CreationBatchFillResult, { readonly tag: "accepted" }> {
  if (result.tag !== "accepted") {
    throw new Error(
      `Expected Warlock Eldritch Invocations selected identity fill batch to be accepted, received ${JSON.stringify(result.issues)}.`,
    );
  }

  return result;
}

function testAbilityScoreAssignment(
  scores: RawAbilityScoreAssignment,
): AbilityScoreAssignment {
  const parsed = abilityScoreAssignment(scores);
  if (Either.isLeft(parsed)) {
    throw new Error(
      "Warlock Eldritch Invocations selected identity Standard Array fixture must parse.",
    );
  }

  return parsed.right;
}

function expectRight<T, E>(result: Either.Either<T, E>): T {
  if (Either.isLeft(result)) {
    throw new Error(
      `Expected Either.right, received ${JSON.stringify(result.left)}.`,
    );
  }

  return result.right;
}

function expectLeftCode<T, E extends { readonly code: string }>(
  result: Either.Either<T, E>,
  code: E["code"],
): void {
  if (Either.isRight(result)) {
    throw new Error(`Expected Either.left(${code}), received Either.right.`);
  }
  if (result.left.code !== code) {
    throw new Error(
      `Expected Either.left(${code}), received ${JSON.stringify(result.left)}.`,
    );
  }
}

function qStateValue(raw: unknown): unknown {
  if (
    raw !== null &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    "qState" in raw
  ) {
    return Object.fromEntries(Object.entries(raw))["qState"];
  }
  throw new Error("Expected Quint qState record.");
}

function normalizeQuintState(
  raw: unknown,
): WarlockEldritchInvocationsSelectedIdentityProjection {
  const parsed = quintStateSchema.parse(qStateValue(raw));
  return warlockEldritchInvocationsSelectedIdentityProjectionSchema.parse({
    outcome: parsed.outcome,
    selectedFromUnitId: parsed.selectedFromUnitId,
    selectedInvocationCount: Number(parsed.selectedInvocationCount),
    selectedClassChoiceFeatureRefCount: Number(
      parsed.selectedClassChoiceFeatureRefCount,
    ),
    warlockInvocationsUnitRefPresent: parsed.warlockInvocationsUnitRefPresent,
    armorOfShadowsInvocationPresent: parsed.armorOfShadowsInvocationPresent,
    pactBladeInvocationPresent: parsed.pactBladeInvocationPresent,
    devilsSightInvocationPresent: parsed.devilsSightInvocationPresent,
    eldritchMindInvocationPresent: parsed.eldritchMindInvocationPresent,
    thirstingBladeInvocationPresent: parsed.thirstingBladeInvocationPresent,
    repellingBlastEldritchBlastPresent:
      parsed.repellingBlastEldritchBlastPresent,
    repellingBlastPoisonSprayPresent: parsed.repellingBlastPoisonSprayPresent,
    armorOfShadowsUnitRefPresent: parsed.armorOfShadowsUnitRefPresent,
    pactMagicCantripCount: Number(parsed.pactMagicCantripCount),
    pactMagicPreparedSpellCount: Number(parsed.pactMagicPreparedSpellCount),
    pactMagicSlotCount: Number(parsed.pactMagicSlotCount),
    pactMagicSlotLevel: Number(parsed.pactMagicSlotLevel),
    totalLevel: Number(parsed.totalLevel),
    lockedReplacementRejected: parsed.lockedReplacementRejected,
    duplicateNonRepeatableRejected: parsed.duplicateNonRepeatableRejected,
    duplicateRepeatableChoiceRejected: parsed.duplicateRepeatableChoiceRejected,
  });
}

function compareProjection(
  spec: WarlockEldritchInvocationsSelectedIdentityProjection,
  impl: WarlockEldritchInvocationsSelectedIdentityProjection,
): boolean {
  expect(impl).toEqual(spec);
  return true;
}

const warlockEldritchInvocationsSelectedIdentityStateCheck = stateCheck(
  normalizeQuintState,
  compareProjection,
);
