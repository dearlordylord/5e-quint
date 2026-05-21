// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1D2-FIGHTER-FIGHTING-STYLE fighter_fighting_style
// UNIT-IDENTITY-MBT-REPLAY: L1D2-FIGHTER-FIGHTING-STYLE fighter_fighting_style doSelectDefenseFightingStyle doReplaceDefenseWithArcheryOnFighterLevelGain
// KERNEL-COVERAGE: parity-witness CREATION.CLASS_FEATURE_FEAT.CHOICE_FINALIZATION
// KERNEL-COVERAGE: parity-witness CREATION.ADVANCEMENT.CLASS_FEATURE_REPLACEMENT
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt character-creation.fighter-fighting-style-advancement-replacement
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Either } from "effect";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  abilityScoreAssignment,
  advanceCharacterBuildClassLevel,
  BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  BACKGROUND_EQUIPMENT_CHOICE_KEY,
  BACKGROUND_TOOL_CHOICE_KEY,
  characterBuildUnitRefs,
  characterDraftId,
  CLASS_EQUIPMENT_CHOICE_KEY,
  CLASS_FEATURE_FEAT_CHOICE_KEY,
  CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  classUnitId,
  classUnitIdFromUnitId,
  computeTotalLevel,
  createCharacterDraft,
  creationChoiceOptionId,
  discoverCreationHoles,
  EQUIPMENT_PURCHASE_CHOICE_KEY,
  fillCreationHoles,
  finalizeCharacterDraft,
  fighterLevelGainWithFightingStyleReplacement,
  LOADOUT_ARMOR_SLOT,
  LOADOUT_SHIELD_SLOT,
  LOADOUT_WEAPON_SLOT,
  PHASE1_ALIGNMENT_OPTION_ID,
  PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
  PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_OPTION_ID,
  PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID,
  PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
  PHASE1_BACKGROUND_TOOL_OPTION_ID,
  PHASE1_CLASS_EQUIPMENT_OPTION_ID,
  PHASE1_CLASS_FIGHTER_UNIT_ID,
  PHASE1_FIGHTING_STYLE_ARCHERY_UNIT_ID,
  PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID,
  PHASE1_LOADOUT_ARMOR_OPTION_ID,
  PHASE1_LOADOUT_SHIELD_OPTION_ID,
  PHASE1_LOADOUT_WEAPON_OPTION_ID,
  PHASE1_SHIELD_UNIT_ID,
  PHASE1_SPECIES_ORC_UNIT_ID,
  PHASE1_WEAPON_LONGSWORD_UNIT_ID,
  progressionOptionId,
  WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
  type CharacterBuild,
  type CharacterDraft,
  type CharacterDraftChoicePath,
  type CreationBatchFillResult,
  type CreationFill,
  type CreationHole,
  type LoadoutSlot,
  type UnitChoiceKey,
} from "./index.ts";
import {
  PHASE1_WEAPON_FLAIL_UNIT_ID,
  PHASE1_WEAPON_SPEAR_UNIT_ID,
} from "./phase1-manifest.ts";

const FIGHTER_FIGHTING_STYLE_UNIT_ID = "fighter_fighting_style";
type ChoiceCreationHole = Extract<CreationHole, { readonly kind: "choice" }>;
type SelectedClassChoiceFeature = Extract<
  CharacterBuild["features"][number],
  { readonly kind: "selectedClassChoice" }
>;

const fighterFightingStyleSelectedIdentityDriverSchema = {
  init: {},
  doSelectDefenseFightingStyle: {},
  doReplaceDefenseWithArcheryOnFighterLevelGain: {},
  step: {},
} as const;
type FighterFightingStyleSelectedIdentityDriverAction = Exclude<
  keyof typeof fighterFightingStyleSelectedIdentityDriverSchema,
  "init" | "step"
>;

const fighterFightingStyleSelectedIdentityProjectionSchema =
  z.discriminatedUnion("lastResult", [
    z.object({
      lastResult: z.literal("init"),
      selectedFromUnitId: z.literal("none"),
      selectedFeatUnitId: z.literal("none"),
      selectedFightingStyleFeatureRefCount: z.literal(0),
      fighterFightingStyleUnitRefPresent: z.literal(false),
      defenseUnitRefPresent: z.literal(false),
      archeryUnitRefPresent: z.literal(false),
      totalLevel: z.literal(1),
    }),
    z.object({
      lastResult: z.literal("finalized"),
      selectedFromUnitId: z.literal(FIGHTER_FIGHTING_STYLE_UNIT_ID),
      selectedFeatUnitId: z.literal(PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID),
      selectedFightingStyleFeatureRefCount: z.literal(1),
      fighterFightingStyleUnitRefPresent: z.literal(true),
      defenseUnitRefPresent: z.literal(true),
      archeryUnitRefPresent: z.literal(false),
      totalLevel: z.literal(1),
    }),
    z.object({
      lastResult: z.literal("replaced"),
      selectedFromUnitId: z.literal(FIGHTER_FIGHTING_STYLE_UNIT_ID),
      selectedFeatUnitId: z.literal(PHASE1_FIGHTING_STYLE_ARCHERY_UNIT_ID),
      selectedFightingStyleFeatureRefCount: z.literal(1),
      fighterFightingStyleUnitRefPresent: z.literal(true),
      defenseUnitRefPresent: z.literal(false),
      archeryUnitRefPresent: z.literal(true),
      totalLevel: z.literal(2),
    }),
  ]);
type FighterFightingStyleSelectedIdentityProjection = z.infer<
  typeof fighterFightingStyleSelectedIdentityProjectionSchema
>;
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly FighterFightingStyleSelectedIdentityDriverAction[];
  readonly expected: FighterFightingStyleSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "L1D2-FIGHTER-FIGHTING-STYLE";
  readonly unitId: typeof FIGHTER_FIGHTING_STYLE_UNIT_ID;
  readonly actions: readonly FighterFightingStyleSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Character Creation Fighter Fighting Style selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "L1D2-FIGHTER-FIGHTING-STYLE",
    unitId: "fighter_fighting_style",
    actions: [
      "doSelectDefenseFightingStyle",
      "doReplaceDefenseWithArcheryOnFighterLevelGain",
    ],
    sequences: [
      {
        name: "fighter-one-finalizes-selected-defense-fighting-style",
        actions: ["doSelectDefenseFightingStyle"],
        expected: finalizedDefenseProjection(),
      },
      {
        name: "fighter-level-gain-replaces-defense-with-archery",
        actions: ["doReplaceDefenseWithArcheryOnFighterLevelGain"],
        expected: replacedArcheryProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

const quintStateSchema = z.object({
  qLastResult: z.union([
    z.literal("init"),
    z.literal("finalized"),
    z.literal("replaced"),
  ]),
  qSelectedFromUnitId: z.union([
    z.literal("none"),
    z.literal(FIGHTER_FIGHTING_STYLE_UNIT_ID),
  ]),
  qSelectedFeatUnitId: z.union([
    z.literal("none"),
    z.literal(PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID),
    z.literal(PHASE1_FIGHTING_STYLE_ARCHERY_UNIT_ID),
  ]),
  qSelectedFightingStyleFeatureRefCount: z.bigint(),
  qFighterFightingStyleUnitRefPresent: z.boolean(),
  qDefenseUnitRefPresent: z.boolean(),
  qArcheryUnitRefPresent: z.boolean(),
  qTotalLevel: z.bigint(),
});

describe("Character Creation Fighter Fighting Style selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<FighterFightingStyleSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createFighterFightingStyleSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Character Creation Fighter Fighting Style selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Character Creation Fighter Fighting Style selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Character Creation Fighter Fighting Style selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-creation-fighter-fighting-style-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createFighterFightingStyleSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: fighterFightingStyleSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createFighterFightingStyleSelectedIdentityDriver() {
  return defineDriver(fighterFightingStyleSelectedIdentityDriverSchema, () => {
    let projection: FighterFightingStyleSelectedIdentityProjection =
      initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doSelectDefenseFightingStyle: () => {
        projection = finalizedDefenseProjection();
      },
      doReplaceDefenseWithArcheryOnFighterLevelGain: () => {
        projection = replacedArcheryProjection();
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function initialProjection(): Extract<
  FighterFightingStyleSelectedIdentityProjection,
  { readonly lastResult: "init" }
> {
  return {
    lastResult: "init",
    selectedFromUnitId: "none",
    selectedFeatUnitId: "none",
    selectedFightingStyleFeatureRefCount: 0,
    fighterFightingStyleUnitRefPresent: false,
    defenseUnitRefPresent: false,
    archeryUnitRefPresent: false,
    totalLevel: 1,
  };
}

function finalizedDefenseProjection(): Extract<
  FighterFightingStyleSelectedIdentityProjection,
  { readonly lastResult: "finalized" }
> {
  const facts = requiredFightingStyleBuildFacts(finalizedFighterOneBuild());
  if (facts.selectedFeatUnitId !== PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID) {
    throw new Error(
      `Expected finalized Fighter Fighting Style selection to be ${PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID}, received ${facts.selectedFeatUnitId}.`,
    );
  }
  if (facts.totalLevel !== 1) {
    throw new Error(
      `Expected finalized Fighter Fighting Style build to remain level 1, received ${facts.totalLevel}.`,
    );
  }
  if (
    !facts.fighterFightingStyleUnitRefPresent ||
    !facts.defenseUnitRefPresent ||
    facts.archeryUnitRefPresent
  ) {
    throw new Error(
      "Expected finalized Fighter Fighting Style Unit refs to include the container and Defense only.",
    );
  }

  return {
    lastResult: "finalized",
    selectedFromUnitId: FIGHTER_FIGHTING_STYLE_UNIT_ID,
    selectedFeatUnitId: facts.selectedFeatUnitId,
    selectedFightingStyleFeatureRefCount: 1,
    fighterFightingStyleUnitRefPresent: true,
    defenseUnitRefPresent: true,
    archeryUnitRefPresent: false,
    totalLevel: facts.totalLevel,
  };
}

function replacedArcheryProjection(): Extract<
  FighterFightingStyleSelectedIdentityProjection,
  { readonly lastResult: "replaced" }
> {
  const fighterClassUnitId = expectRight(
    classUnitIdFromUnitId({
      unitLibrary,
      classUnitId: PHASE1_CLASS_FIGHTER_UNIT_ID,
    }),
  );
  const levelGain = expectRight(
    fighterLevelGainWithFightingStyleReplacement({
      unitLibrary,
      classUnitId: fighterClassUnitId,
      hitPointRule: { tag: "fixedHigherLevelGain" },
      selectedFeatUnitId: PHASE1_FIGHTING_STYLE_ARCHERY_UNIT_ID,
    }),
  );
  const build = expectRight(
    advanceCharacterBuildClassLevel({
      build: finalizedFighterOneBuild(),
      unitLibrary,
      levelGain,
    }),
  );

  const facts = requiredFightingStyleBuildFacts(build);
  if (facts.selectedFeatUnitId !== PHASE1_FIGHTING_STYLE_ARCHERY_UNIT_ID) {
    throw new Error(
      `Expected replaced Fighter Fighting Style selection to be ${PHASE1_FIGHTING_STYLE_ARCHERY_UNIT_ID}, received ${facts.selectedFeatUnitId}.`,
    );
  }
  if (facts.totalLevel !== 2) {
    throw new Error(
      `Expected replaced Fighter Fighting Style build to advance to level 2, received ${facts.totalLevel}.`,
    );
  }
  if (
    !facts.fighterFightingStyleUnitRefPresent ||
    facts.defenseUnitRefPresent ||
    !facts.archeryUnitRefPresent
  ) {
    throw new Error(
      "Expected replaced Fighter Fighting Style Unit refs to include the container and Archery only.",
    );
  }

  return {
    lastResult: "replaced",
    selectedFromUnitId: FIGHTER_FIGHTING_STYLE_UNIT_ID,
    selectedFeatUnitId: facts.selectedFeatUnitId,
    selectedFightingStyleFeatureRefCount: 1,
    fighterFightingStyleUnitRefPresent: true,
    defenseUnitRefPresent: false,
    archeryUnitRefPresent: true,
    totalLevel: facts.totalLevel,
  };
}

function requiredFightingStyleBuildFacts(build: CharacterBuild): {
  readonly selectedFeatUnitId:
    | typeof PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID
    | typeof PHASE1_FIGHTING_STYLE_ARCHERY_UNIT_ID;
  readonly fighterFightingStyleUnitRefPresent: boolean;
  readonly defenseUnitRefPresent: boolean;
  readonly archeryUnitRefPresent: boolean;
  readonly totalLevel: number;
} {
  const selectedFightingStyleFeatures = build.features.filter(
    (feature): feature is SelectedClassChoiceFeature =>
      feature.kind === "selectedClassChoice" &&
      feature.selectedFromUnitId === FIGHTER_FIGHTING_STYLE_UNIT_ID,
  );
  if (selectedFightingStyleFeatures.length !== 1) {
    throw new Error(
      `Expected exactly one selected Fighter Fighting Style feature ref, received ${selectedFightingStyleFeatures.length}.`,
    );
  }
  const selectedFightingStyleFeature = selectedFightingStyleFeatures[0];
  if (
    selectedFightingStyleFeature.unitId !==
      PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID &&
    selectedFightingStyleFeature.unitId !==
      PHASE1_FIGHTING_STYLE_ARCHERY_UNIT_ID
  ) {
    throw new Error(
      `Expected selected Fighter Fighting Style feat to be Defense or Archery, received ${selectedFightingStyleFeature.unitId}.`,
    );
  }

  const unitRefIds = characterBuildUnitRefs(build, unitLibrary).map(
    (ref) => ref.unitId,
  );
  return {
    fighterFightingStyleUnitRefPresent: unitRefIds.includes(
      FIGHTER_FIGHTING_STYLE_UNIT_ID,
    ),
    defenseUnitRefPresent: unitRefIds.includes(
      PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID,
    ),
    archeryUnitRefPresent: unitRefIds.includes(
      PHASE1_FIGHTING_STYLE_ARCHERY_UNIT_ID,
    ),
    selectedFeatUnitId: selectedFightingStyleFeature.unitId,
    totalLevel: computeTotalLevel(build.progression),
  };
}

function finalizedFighterOneBuild(): CharacterBuild {
  const finalized = finalizeCharacterDraft({
    draft: completeFighterOneDraft(),
    unitLibrary,
  });
  if (finalized.tag !== "ready") {
    throw new Error(
      `Expected Fighter Fighting Style selected identity draft to finalize, received ${finalized.tag}.`,
    );
  }

  return finalized.build;
}

function completeFighterOneDraft(): CharacterDraft {
  const draft = createCharacterDraft({
    draftId: characterDraftId("fighter-fighting-style-selected-identity"),
  });
  const afterCharacterChoices = acceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: characterChoiceFills(
        discoverCreationHoles({ draft, unitLibrary }),
      ),
    }),
  );
  const afterClassChoices = acceptedBatch(
    fillCreationHoles({
      draft: afterCharacterChoices.draft,
      unitLibrary,
      expectedRevision: afterCharacterChoices.draft.revision,
      fills: classAndBackgroundChoiceFills(afterCharacterChoices.holes),
    }),
  );
  const afterPurchase = acceptedBatch(
    fillCreationHoles({
      draft: afterClassChoices.draft,
      unitLibrary,
      expectedRevision: afterClassChoices.draft.revision,
      fills: equipmentPurchaseFills(afterClassChoices.holes),
    }),
  );

  return acceptedBatch(
    fillCreationHoles({
      draft: afterPurchase.draft,
      unitLibrary,
      expectedRevision: afterPurchase.draft.revision,
      fills: loadoutFills(afterPurchase.holes),
    }),
  ).draft;
}

function characterChoiceFills(
  holes: readonly CreationHole[],
): readonly CreationFill[] {
  return [
    choiceFill(choiceHoleByDraftPath(holes, "draft.progression.initial"), [
      progressionOptionId({
        startingClass: classUnitId(PHASE1_CLASS_FIGHTER_UNIT_ID),
        advancements: [],
      }),
    ]),
    choiceFill(choiceHoleByDraftPath(holes, "draft.background"), [
      PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
    ]),
    choiceFill(choiceHoleByDraftPath(holes, "draft.species"), [
      PHASE1_SPECIES_ORC_UNIT_ID,
    ]),
    abilityScoreFill(holes),
    choiceFill(choiceHoleByDraftPath(holes, "draft.languages"), [
      "Dwarvish",
      "Goblin",
    ]),
    choiceFill(choiceHoleByDraftPath(holes, "draft.alignment"), [
      PHASE1_ALIGNMENT_OPTION_ID,
    ]),
  ];
}

function classAndBackgroundChoiceFills(
  holes: readonly CreationHole[],
): readonly CreationFill[] {
  return [
    choiceFill(
      choiceHoleByUnit(
        holes,
        PHASE1_CLASS_FIGHTER_UNIT_ID,
        CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
      ),
      ["perception", "survival"],
    ),
    choiceFill(
      choiceHoleByUnit(
        holes,
        FIGHTER_FIGHTING_STYLE_UNIT_ID,
        CLASS_FEATURE_FEAT_CHOICE_KEY,
      ),
      [PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID],
    ),
    choiceFill(
      choiceHoleByUnit(
        holes,
        "fighter_weapon_mastery",
        WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
      ),
      [
        PHASE1_WEAPON_LONGSWORD_UNIT_ID,
        PHASE1_WEAPON_SPEAR_UNIT_ID,
        PHASE1_WEAPON_FLAIL_UNIT_ID,
      ],
    ),
    choiceFill(
      choiceHoleByUnit(
        holes,
        PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
        BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY,
      ),
      [PHASE1_BACKGROUND_ABILITY_SCORE_INCREASE_OPTION_ID],
    ),
    choiceFill(
      choiceHoleByUnit(
        holes,
        PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
        BACKGROUND_TOOL_CHOICE_KEY,
      ),
      [PHASE1_BACKGROUND_TOOL_OPTION_ID],
    ),
    choiceFill(
      choiceHoleByUnit(
        holes,
        PHASE1_CLASS_FIGHTER_UNIT_ID,
        CLASS_EQUIPMENT_CHOICE_KEY,
      ),
      [PHASE1_CLASS_EQUIPMENT_OPTION_ID],
    ),
    choiceFill(
      choiceHoleByUnit(
        holes,
        PHASE1_BACKGROUND_SOLDIER_UNIT_ID,
        BACKGROUND_EQUIPMENT_CHOICE_KEY,
      ),
      [PHASE1_BACKGROUND_EQUIPMENT_OPTION_ID],
    ),
  ];
}

function equipmentPurchaseFills(
  holes: readonly CreationHole[],
): readonly CreationFill[] {
  return [
    choiceFill(
      choiceHoleByUnit(
        holes,
        PHASE1_CLASS_FIGHTER_UNIT_ID,
        EQUIPMENT_PURCHASE_CHOICE_KEY,
      ),
      [
        PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
        PHASE1_WEAPON_LONGSWORD_UNIT_ID,
        PHASE1_SHIELD_UNIT_ID,
      ],
    ),
  ];
}

function loadoutFills(holes: readonly CreationHole[]): readonly CreationFill[] {
  return [
    choiceFill(
      choiceHoleByLoadout(
        holes,
        PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID,
        LOADOUT_ARMOR_SLOT,
      ),
      [PHASE1_LOADOUT_ARMOR_OPTION_ID],
    ),
    choiceFill(
      choiceHoleByLoadout(holes, PHASE1_SHIELD_UNIT_ID, LOADOUT_SHIELD_SLOT),
      [PHASE1_LOADOUT_SHIELD_OPTION_ID],
    ),
    choiceFill(
      choiceHoleByLoadout(
        holes,
        PHASE1_WEAPON_LONGSWORD_UNIT_ID,
        LOADOUT_WEAPON_SLOT,
      ),
      [PHASE1_LOADOUT_WEAPON_OPTION_ID],
    ),
  ];
}

function abilityScoreFill(holes: readonly CreationHole[]): CreationFill {
  const hole = holes.find(
    (candidate) =>
      candidate.kind === "abilityScores" &&
      candidate.source.path === "draft.abilityScoreGeneration",
  );
  if (hole === undefined) {
    throw new Error(
      "Expected Fighter Fighting Style selected identity draft ability-score hole.",
    );
  }
  const scores = abilityScoreAssignment({
    str: 15,
    dex: 14,
    con: 13,
    int: 8,
    wis: 10,
    cha: 12,
  });
  if (Either.isLeft(scores)) {
    throw new Error(
      "Fighter Fighting Style selected identity Standard Array fixture must parse.",
    );
  }

  return {
    kind: "abilityScores",
    holeId: hole.holeId,
    method: "standardArray",
    value: scores.right,
  };
}

function choiceHoleByDraftPath(
  holes: readonly CreationHole[],
  draftPath: CharacterDraftChoicePath,
): ChoiceCreationHole {
  return choiceHole(
    holes,
    (hole) => hole.source.tag === "draft" && hole.source.path === draftPath,
    `draft path ${draftPath}`,
  );
}

function choiceHoleByUnit(
  holes: readonly CreationHole[],
  unitId: string,
  choiceKey: UnitChoiceKey,
): ChoiceCreationHole {
  return choiceHole(
    holes,
    (hole) =>
      hole.source.tag === "unitChoice" &&
      hole.source.unitId === unitId &&
      hole.source.choiceKey === choiceKey,
    `Unit choice ${unitId}/${choiceKey}`,
  );
}

function choiceHoleByLoadout(
  holes: readonly CreationHole[],
  equipmentUnitId: string,
  slot: LoadoutSlot,
): ChoiceCreationHole {
  return choiceHole(
    holes,
    (hole) =>
      hole.source.tag === "loadout" &&
      hole.source.equipmentUnitId === equipmentUnitId &&
      hole.source.slot === slot,
    `loadout ${equipmentUnitId}/${slot}`,
  );
}

function choiceHole(
  holes: readonly CreationHole[],
  predicate: (hole: ChoiceCreationHole) => boolean,
  label: string,
): ChoiceCreationHole {
  const hole = holes.find(
    (candidate): candidate is ChoiceCreationHole =>
      candidate.kind === "choice" && predicate(candidate),
  );
  if (hole === undefined) {
    throw new Error(
      `Expected Fighter Fighting Style selected identity choice hole for ${label}.`,
    );
  }

  return hole;
}

function choiceFill(
  hole: ChoiceCreationHole,
  optionIds: readonly string[],
): CreationFill {
  return {
    kind: "choice",
    holeId: hole.holeId,
    optionIds: optionIds.map(creationChoiceOptionId),
  };
}

function acceptedBatch(
  result: CreationBatchFillResult,
): Extract<CreationBatchFillResult, { readonly tag: "accepted" }> {
  if (result.tag !== "accepted") {
    throw new Error(
      `Expected Fighter Fighting Style selected identity fill batch to be accepted, received ${JSON.stringify(result.issues)}.`,
    );
  }

  return result;
}

function expectRight<T, E>(result: Either.Either<T, E>): T {
  if (Either.isLeft(result)) {
    throw new Error(
      `Expected Either.right, received ${JSON.stringify(result.left)}.`,
    );
  }

  return result.right;
}

function normalizeQuintState(
  raw: unknown,
): FighterFightingStyleSelectedIdentityProjection {
  const parsed = quintStateSchema.parse(raw);
  return fighterFightingStyleSelectedIdentityProjectionSchema.parse({
    lastResult: parsed.qLastResult,
    selectedFromUnitId: parsed.qSelectedFromUnitId,
    selectedFeatUnitId: parsed.qSelectedFeatUnitId,
    selectedFightingStyleFeatureRefCount: Number(
      parsed.qSelectedFightingStyleFeatureRefCount,
    ),
    fighterFightingStyleUnitRefPresent:
      parsed.qFighterFightingStyleUnitRefPresent,
    defenseUnitRefPresent: parsed.qDefenseUnitRefPresent,
    archeryUnitRefPresent: parsed.qArcheryUnitRefPresent,
    totalLevel: Number(parsed.qTotalLevel),
  });
}

function compareProjection(
  spec: FighterFightingStyleSelectedIdentityProjection,
  impl: FighterFightingStyleSelectedIdentityProjection,
): boolean {
  expect(impl).toEqual(spec);
  return true;
}

const fighterFightingStyleSelectedIdentityStateCheck = stateCheck(
  normalizeQuintState,
  compareProjection,
);
