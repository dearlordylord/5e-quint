import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import type { SimpleActionMap, SimpleDriver } from "@firfi/quint-connect";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import {
  BACKGROUND_ABILITY_SCORE_INCREASE_CHOICE_KEY,
  BACKGROUND_EQUIPMENT_CHOICE_KEY,
  BACKGROUND_TOOL_CHOICE_KEY,
  CLASS_EQUIPMENT_CHOICE_KEY,
  CLASS_FEATURE_FEAT_CHOICE_KEY,
  CLASS_SKILL_PROFICIENCY_CHOICE_KEY,
  EQUIPMENT_PURCHASE_CHOICE_KEY,
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
  PHASE1_FIGHTING_STYLE_DEFENSE_UNIT_ID,
  PHASE1_LOADOUT_ARMOR_OPTION_ID,
  PHASE1_LOADOUT_SHIELD_OPTION_ID,
  PHASE1_LOADOUT_WEAPON_OPTION_ID,
  PHASE1_SHIELD_UNIT_ID,
  PHASE1_SPECIES_ORC_UNIT_ID,
  PHASE1_WEAPON_LONGSWORD_UNIT_ID,
  PHASE1_WEAPON_MASTERY_UNIT_IDS,
  WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
  abilityScoreAssignment,
  characterDraftId,
  classUnitId,
  createCharacterDraft as createRuntimeCharacterDraft,
  creationChoiceOptionId,
  creationHoleId,
  discoverCreationHoles as discoverRuntimeCreationHoles,
  draftRevision,
  fillCreationHoles,
  finalizeCharacterDraft as finalizeRuntimeCharacterDraft,
  loadoutEquipmentUnitId,
  loadoutSourceHoleIdText,
  progressionOptionId,
  type CharacterDraft,
  type CreationBatchFillResult,
  type CreationFill,
  type CreationHole,
  type DraftRevision,
  type LoadoutSlot,
  type UnitChoiceKey,
} from "./index.ts";

const MBT_TEST_TIMEOUT_MS = 120_000;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("SRD Unit catalog route MBT fixture must build.");
}
const unitLibrary = unitCatalogResult.catalog;

const SUBJECT_BY_TAG = {
  CreationDraftStateRouteSubject: "draftState",
  CreationOptionDiscoveryRouteSubject: "optionDiscovery",
  CreationFillBatchRouteSubject: "fillBatch",
  CreationSelectedReferenceRouteSubject: "selectedReference",
  CreationBuildProjectionRouteSubject: "buildProjection",
  CreationFinalizationRouteSubject: "finalization",
} as const;
type CharacterCreationRouteSubject =
  (typeof SUBJECT_BY_TAG)[keyof typeof SUBJECT_BY_TAG];

const HOLE_BY_TAG = {
  CreationDraftStructureHoleFamily: "draftStructure",
  CreationUnitChoiceHoleFamily: "unitChoice",
  CreationAbilityScoreHoleFamily: "abilityScore",
  CreationEquipmentSelectionHoleFamily: "equipmentSelection",
  CreationLoadoutHoleFamily: "loadout",
} as const;
type CharacterCreationRouteHole =
  (typeof HOLE_BY_TAG)[keyof typeof HOLE_BY_TAG];

const FILL_BY_TAG = {
  CreationChoiceSetFill: "choiceSet",
  CreationAbilityScoreAssignmentFill: "abilityScoreAssignment",
  CreationEquipmentSelectionFill: "equipmentSelection",
  CreationLoadoutSelectionFill: "loadoutSelection",
} as const;
type CharacterCreationRouteFill =
  (typeof FILL_BY_TAG)[keyof typeof FILL_BY_TAG];

const OWNER_BY_TAG = {
  CharacterDraftOwner: "characterDraft",
  CharacterBuildOwner: "characterBuild",
  CreationHoleFrontierOwner: "creationHoleFrontier",
  CreationSupportProfileAdmissionOwner: "creationSupportProfileAdmission",
  CreationSelectedReferenceOwner: "creationSelectedReference",
} as const;
type CharacterCreationRouteOwner =
  (typeof OWNER_BY_TAG)[keyof typeof OWNER_BY_TAG];

type CharacterCreationRouteEvent =
  | {
      readonly kind: "createCharacterDraft";
      readonly owner: CharacterCreationRouteOwner;
    }
  | {
      readonly kind: "discoverCreationHoles";
      readonly subject: CharacterCreationRouteSubject;
      readonly holes: readonly CharacterCreationRouteHole[];
      readonly owner: CharacterCreationRouteOwner;
    }
  | {
      readonly kind: "applyCreationFillBatch";
      readonly subject: CharacterCreationRouteSubject;
      readonly fills: readonly CharacterCreationRouteFill[];
      readonly holes: readonly CharacterCreationRouteHole[];
      readonly owner: CharacterCreationRouteOwner;
    }
  | {
      readonly kind: "retainCreationSelectedReferences";
      readonly subject: CharacterCreationRouteSubject;
      readonly owner: CharacterCreationRouteOwner;
    }
  | {
      readonly kind: "projectCharacterBuildFacts";
      readonly subject: CharacterCreationRouteSubject;
      readonly owner: CharacterCreationRouteOwner;
    }
  | {
      readonly kind: "finalizeCharacterDraft";
      readonly subject: CharacterCreationRouteSubject;
      readonly owner: CharacterCreationRouteOwner;
    };

type RouteProjection = {
  readonly route: readonly CharacterCreationRouteEvent[];
};

type RouteDriverSchema = Record<string, Record<string, never>>;
type RouteActionMap<Schema extends RouteDriverSchema> = Partial<
  Record<
    keyof Schema,
    (
      route: readonly CharacterCreationRouteEvent[],
    ) => readonly CharacterCreationRouteEvent[]
  >
>;
type RouteReducerSession = {
  draft: CharacterDraft;
  holes: readonly CreationHole[];
  route: readonly CharacterCreationRouteEvent[];
};

const runtimeRouteDriverSchema = {
  init: {},
  doFillInitialManifest: {},
  doFillInitialChoicesOnly: {},
  doFillAbilityScoresOnly: {},
  doFillManifestChoices: {},
  doFillManifestPurchase: {},
  doFillManifestLoadout: {},
  doRejectStaleInitialManifest: {},
  doRejectUnsupportedLanguage: {},
  doRejectDuplicateLanguage: {},
  doRejectDuplicateFill: {},
  doRejectTooFewLanguages: {},
  doRejectTooManyLanguages: {},
  doRejectWrongKindPrimaryClass: {},
  doRejectClosedInitialProgressionHole: {},
  doRejectUnknownLoadoutArmor: {},
  doRejectUnsupportedClassEquipment: {},
  step: {},
} as const;

const classFeatureProjectionRouteDriverSchema = {
  init: {},
  doProjectMonkFocusAndUncannyMetabolism: {},
  doProjectSorcererFontAndMetamagic: {},
  step: {},
} as const;

const classFeatureSelectedIdentityRouteDriverSchema = {
  init: {},
  doSelectBardExpertise: {},
  doProjectClericChannelDivinity: {},
  doProjectDruidWildShape: {},
  doProjectDruidWildCompanion: {},
  doProjectMonksFocus: {},
  doProjectMonkUncannyMetabolism: {},
  doSelectPaladinFightingStyle: {},
  doSelectRangerDeftExplorer: {},
  doSelectRangerFightingStyle: {},
  doProjectWarlockPactMagic: {},
  doSelectWizardScholar: {},
  doSelectWizardEvocationSavant: {},
  step: {},
} as const;

const clericDruidOrderRouteDriverSchema = {
  init: {},
  doSelectClericProtectorOrder: {},
  doSelectClericThaumaturgeOrder: {},
  doSelectDruidMagicianOrder: {},
  doSelectDruidWardenOrder: {},
  step: {},
} as const;

const fighterFightingStyleRouteDriverSchema = {
  init: {},
  doSelectDefenseFightingStyle: {},
  doSelectArcheryFightingStyle: {},
  doSelectGreatWeaponFightingStyle: {},
  doSelectTwoWeaponFightingStyle: {},
  doReplaceArcheryWithDefenseOnFighterLevelGain: {},
  doReplaceDefenseWithArcheryOnFighterLevelGain: {},
  doReplaceDefenseWithGreatWeaponFightingOnFighterLevelGain: {},
  doReplaceDefenseWithTwoWeaponFightingOnFighterLevelGain: {},
  step: {},
} as const;

const rogueExpertiseRouteDriverSchema = {
  init: {},
  doSelectLevelOneOwnedSkillExpertise: {},
  step: {},
} as const;

const warlockInvocationRouteDriverSchema = {
  init: {},
  doSelectLevelOneArmorOfShadows: {},
  doGainLevelTwoInvocations: {},
  doReplaceArmorWithEldritchMindOnWarlockLevelGain: {},
  doReplaceRepeatableInvocationByChoice: {},
  doRejectPrerequisiteRetainedInvocationReplacement: {},
  doRejectDuplicateInvocationSelections: {},
  step: {},
} as const;

const weaponMasteryRouteDriverSchema = {
  init: {},
  doFinalizeFighterWeaponMastery: {},
  doFinalizeBarbarianWeaponMastery: {},
  doFinalizePaladinWeaponMastery: {},
  doFinalizeRangerWeaponMastery: {},
  doFinalizeRogueWeaponMastery: {},
  step: {},
} as const;

const routeStateCheck = stateCheck(
  normalizeCharacterCreationRouteQuintState,
  (spec: RouteProjection, impl: RouteProjection) => {
    expect(impl.route).toEqual(spec.route);
    return true;
  },
);

describe("character creation reducer route connector MBT", () => {
  it("routes draft fill batches through the creation reducer surface", async () => {
    await runRouteMbt({
      specFileName: "character-creation-runtime.route.mbt.qnt",
      driver: createRuntimeRouteDriver(),
      maxSteps: focusedMbtMaxSteps(6),
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes class-feature build projections through the creation reducer surface", async () => {
    await runRouteMbt({
      specFileName: "character-creation-class-feature-projections.route.mbt.qnt",
      driver: createCompletedReducerRouteDriver(
        classFeatureProjectionRouteDriverSchema,
        "cc:route-class-feature-projection",
        {
          doProjectMonkFocusAndUncannyMetabolism:
            projectCharacterBuildFactsRoute,
          doProjectSorcererFontAndMetamagic: projectCharacterBuildFactsRoute,
        },
      ),
      maxSteps: focusedMbtMaxSteps(2),
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes class-feature selected references through the creation reducer surface", async () => {
    await runRouteMbt({
      specFileName:
        "character-creation-class-feature-selected-identity.route.mbt.qnt",
      driver: createCompletedReducerRouteDriver(
        classFeatureSelectedIdentityRouteDriverSchema,
        "cc:route-class-feature-selected-identity",
        {
          doSelectBardExpertise: retainSelectedReferenceRoute,
          doProjectClericChannelDivinity: projectSelectedReferenceRoute,
          doProjectDruidWildShape: projectSelectedReferenceRoute,
          doProjectDruidWildCompanion: projectSelectedReferenceRoute,
          doProjectMonksFocus: projectSelectedReferenceRoute,
          doProjectMonkUncannyMetabolism: projectSelectedReferenceRoute,
          doSelectPaladinFightingStyle: retainSelectedReferenceRoute,
          doSelectRangerDeftExplorer: retainSelectedReferenceRoute,
          doSelectRangerFightingStyle: retainSelectedReferenceRoute,
          doProjectWarlockPactMagic: projectSelectedReferenceRoute,
          doSelectWizardScholar: retainSelectedReferenceRoute,
          doSelectWizardEvocationSavant: retainSelectedReferenceRoute,
        },
      ),
      maxSteps: focusedMbtMaxSteps(1),
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes Cleric and Druid order selections through the creation reducer surface", async () => {
    await runRouteMbt({
      specFileName:
        "character-creation-cleric-druid-order-selected-identity.route.mbt.qnt",
      driver: createCompletedReducerRouteDriver(
        clericDruidOrderRouteDriverSchema,
        "cc:route-cleric-druid-order",
        {
          doSelectClericProtectorOrder: retainAndProjectSelectedReferenceRoute,
          doSelectClericThaumaturgeOrder: retainAndProjectSelectedReferenceRoute,
          doSelectDruidMagicianOrder: retainAndProjectSelectedReferenceRoute,
          doSelectDruidWardenOrder: retainAndProjectSelectedReferenceRoute,
        },
      ),
      maxSteps: focusedMbtMaxSteps(1),
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes Fighter Fighting Style selections through the creation reducer surface", async () => {
    await runRouteMbt({
      specFileName:
        "character-creation-fighter-fighting-style-selected-identity.route.mbt.qnt",
      driver: createCompletedReducerRouteDriver(
        fighterFightingStyleRouteDriverSchema,
        "cc:route-fighter-fighting-style",
        {
          doSelectDefenseFightingStyle: retainSelectedReferenceRoute,
          doSelectArcheryFightingStyle: retainSelectedReferenceRoute,
          doSelectGreatWeaponFightingStyle: retainSelectedReferenceRoute,
          doSelectTwoWeaponFightingStyle: retainSelectedReferenceRoute,
          doReplaceArcheryWithDefenseOnFighterLevelGain:
            replaceSelectedReferenceRoute,
          doReplaceDefenseWithArcheryOnFighterLevelGain:
            replaceSelectedReferenceRoute,
          doReplaceDefenseWithGreatWeaponFightingOnFighterLevelGain:
            replaceSelectedReferenceRoute,
          doReplaceDefenseWithTwoWeaponFightingOnFighterLevelGain:
            replaceSelectedReferenceRoute,
        },
      ),
      maxSteps: focusedMbtMaxSteps(1),
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes Rogue Expertise selections through the creation reducer surface", async () => {
    await runRouteMbt({
      specFileName:
        "character-creation-rogue-expertise-selected-identity.route.mbt.qnt",
      driver: createCompletedReducerRouteDriver(
        rogueExpertiseRouteDriverSchema,
        "cc:route-rogue-expertise",
        {
          doSelectLevelOneOwnedSkillExpertise: retainSelectedReferenceRoute,
        },
      ),
      maxSteps: focusedMbtMaxSteps(1),
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes Warlock invocation selections through the creation reducer surface", async () => {
    await runRouteMbt({
      specFileName:
        "character-creation-warlock-eldritch-invocations-selected-identity.route.mbt.qnt",
      driver: createCompletedReducerRouteDriver(
        warlockInvocationRouteDriverSchema,
        "cc:route-warlock-invocations",
        {
          doSelectLevelOneArmorOfShadows: retainAndProjectSelectedReferenceRoute,
          doGainLevelTwoInvocations: replaceSelectedReferenceRoute,
          doReplaceArmorWithEldritchMindOnWarlockLevelGain:
            replaceSelectedReferenceRoute,
          doReplaceRepeatableInvocationByChoice: replaceSelectedReferenceRoute,
          doRejectPrerequisiteRetainedInvocationReplacement:
            rejectedInvocationSelectionRoute,
          doRejectDuplicateInvocationSelections: rejectedInvocationSelectionRoute,
        },
      ),
      maxSteps: focusedMbtMaxSteps(1),
    });
  }, MBT_TEST_TIMEOUT_MS);

  it("routes Weapon Mastery selected weapon refs through the creation reducer surface", async () => {
    await runRouteMbt({
      specFileName:
        "character-creation-weapon-mastery-containers-selected-identity.route.mbt.qnt",
      driver: createCompletedReducerRouteDriver(
        weaponMasteryRouteDriverSchema,
        "cc:route-weapon-mastery",
        {
          doFinalizeFighterWeaponMastery: retainSelectedReferenceRoute,
          doFinalizeBarbarianWeaponMastery: retainSelectedReferenceRoute,
          doFinalizePaladinWeaponMastery: retainSelectedReferenceRoute,
          doFinalizeRangerWeaponMastery: retainSelectedReferenceRoute,
          doFinalizeRogueWeaponMastery: retainSelectedReferenceRoute,
        },
      ),
      maxSteps: focusedMbtMaxSteps(1),
    });
  }, MBT_TEST_TIMEOUT_MS);
});

function createRuntimeRouteDriver() {
  return defineDriver(runtimeRouteDriverSchema, () => {
    let session = createRouteReducerSession("cc:route-runtime");

    function reset(): void {
      session = createRouteReducerSession("cc:route-runtime");
    }

    return {
      init: reset,
      doFillInitialManifest: () => {
        submitCreationFillBatch(session, {
          fills: initialManifestFills(session.holes),
          owner: "characterDraft",
        });
      },
      doFillInitialChoicesOnly: () => {
        submitCreationFillBatch(session, {
          fills: initialChoicesOnlyFills(session.holes),
          owner: "characterDraft",
        });
      },
      doFillAbilityScoresOnly: () => {
        submitCreationFillBatch(session, {
          fills: abilityScoresOnlyFills(session.holes),
          owner: "characterDraft",
        });
      },
      doFillManifestChoices: () => {
        submitCreationFillBatch(session, {
          fills: manifestChoiceFills(session.holes),
          owner: "creationSupportProfileAdmission",
        });
      },
      doFillManifestPurchase: () => {
        submitCreationFillBatch(session, {
          fills: manifestPurchaseFills(session.holes),
          owner: "creationSupportProfileAdmission",
        });
      },
      doFillManifestLoadout: () => {
        submitCreationFillBatch(session, {
          fills: manifestLoadoutFills(session.holes),
          owner: "characterDraft",
        });
        appendFinalizationRoute(session);
      },
      doRejectStaleInitialManifest: () => {
        submitCreationFillBatch(session, {
          fills: initialManifestFills(session.holes),
          owner: "characterDraft",
          expectedRevision: draftRevision(999),
        });
      },
      doRejectUnsupportedLanguage: () => {
        submitCreationFillBatch(session, {
          fills: [
            choiceFill(choiceHoleByDraftPath(session.holes, "draft.languages"), [
              "Dwarvish",
              "Elvish",
            ]),
          ],
          owner: "creationSupportProfileAdmission",
        });
      },
      doRejectDuplicateLanguage: () => {
        submitCreationFillBatch(session, {
          fills: [
            choiceFill(choiceHoleByDraftPath(session.holes, "draft.languages"), [
              "Dwarvish",
              "Dwarvish",
            ]),
          ],
          owner: "characterDraft",
        });
      },
      doRejectDuplicateFill: () => {
        submitCreationFillBatch(session, {
          fills: duplicateLanguageHoleFills(session.holes),
          owner: "characterDraft",
        });
      },
      doRejectTooFewLanguages: () => {
        submitCreationFillBatch(session, {
          fills: [
            choiceFill(choiceHoleByDraftPath(session.holes, "draft.languages"), [
              "Dwarvish",
            ]),
          ],
          owner: "characterDraft",
        });
      },
      doRejectTooManyLanguages: () => {
        submitCreationFillBatch(session, {
          fills: [
            choiceFill(choiceHoleByDraftPath(session.holes, "draft.languages"), [
              "Dwarvish",
              "Goblin",
              "Elvish",
            ]),
          ],
          owner: "characterDraft",
        });
      },
      doRejectWrongKindPrimaryClass: () => {
        submitCreationFillBatch(session, {
          fills: [
            wrongKindAbilityScoreFill(
              choiceHoleByDraftPath(session.holes, "draft.progression.initial"),
            ),
          ],
          owner: "characterDraft",
        });
      },
      doRejectClosedInitialProgressionHole: () => {
        submitCreationFillBatch(session, {
          fills: closedInitialProgressionHoleFills(),
          owner: "creationHoleFrontier",
        });
      },
      doRejectUnknownLoadoutArmor: () => {
        submitCreationFillBatch(session, {
          fills: [choiceFillForKnownProtocolLoadoutArmor(["worn"])],
          owner: "creationHoleFrontier",
        });
      },
      doRejectUnsupportedClassEquipment: () => {
        submitCreationFillBatch(session, {
          fills: [
            choiceFill(
              choiceHoleByUnit(
                session.holes,
                PHASE1_CLASS_FIGHTER_UNIT_ID,
                CLASS_EQUIPMENT_CHOICE_KEY,
              ),
              ["option_a"],
            ),
          ],
          owner: "creationSupportProfileAdmission",
        });
      },
      step: () => {},
      getState: (): RouteProjection => ({ route: session.route }),
    };
  });
}

function createCompletedReducerRouteDriver<const Schema extends RouteDriverSchema>(
  schema: Schema,
  draftId: string,
  actionRoutes: RouteActionMap<Schema>,
) {
  return defineDriver(schema, () => {
    let route = completedReducerSurfaceRoute(draftId);
    const handlers: Partial<Record<keyof Schema, () => void>> = {};

    // Object.keys returns string[], but this loop only replays keys from the
    // schema object that also defines the driver action type.
    for (const actionName of Object.keys(schema) as Array<keyof Schema>) {
      if (actionName === "init") {
        handlers[actionName] = () => {
          route = completedReducerSurfaceRoute(draftId);
        };
        continue;
      }
      if (actionName === "step") {
        handlers[actionName] = () => {};
        continue;
      }
      const routeForAction = actionRoutes[actionName];
      handlers[actionName] =
        routeForAction === undefined
          ? () => {}
          : () => {
              route = routeForAction(route);
            };
    }

    // Every schema key receives a handler in the loop above, including init
    // and step, so the partial builder is complete at the driver boundary.
    return {
      ...(handlers as Record<keyof Schema, () => void>),
      getState: (): RouteProjection => ({ route }),
    };
  });
}

function completedReducerSurfaceRoute(
  draftId: string,
): readonly CharacterCreationRouteEvent[] {
  const session = createRouteReducerSession(draftId);
  submitCreationFillBatch(session, {
    fills: initialManifestFills(session.holes),
    owner: "characterDraft",
  });
  submitCreationFillBatch(session, {
    fills: manifestChoiceFills(session.holes),
    owner: "creationSupportProfileAdmission",
  });
  submitCreationFillBatch(session, {
    fills: manifestPurchaseFills(session.holes),
    owner: "creationSupportProfileAdmission",
  });
  submitCreationFillBatch(session, {
    fills: manifestLoadoutFills(session.holes),
    owner: "characterDraft",
  });
  appendFinalizationRoute(session);
  return session.route;
}

function createRouteReducerSession(draftId: string): RouteReducerSession {
  const draft = createRuntimeCharacterDraft({
    draftId: characterDraftId(draftId),
  });
  const holes = discoverRuntimeCreationHoles({ draft, unitLibrary });
  return {
    draft,
    holes,
    route: [
      createCharacterDraft("characterDraft"),
      discoverCreationHoles({
        subject: "draftState",
        holes: routeHoleFamilies(holes),
        owner: "creationHoleFrontier",
      }),
    ],
  };
}

function submitCreationFillBatch(
  session: RouteReducerSession,
  input: {
    readonly fills: readonly CreationFill[];
    readonly owner: CharacterCreationRouteOwner;
    readonly expectedRevision?: DraftRevision;
  },
): CreationBatchFillResult {
  const result = fillCreationHoles({
    draft: session.draft,
    fills: input.fills,
    expectedRevision: input.expectedRevision ?? session.draft.revision,
    unitLibrary,
  });
  const fillFamilies = routeFillFamilies(input.fills, session.holes);
  session.draft = result.draft;
  session.holes = result.holes;
  session.route = [
    ...session.route,
    applyCreationFillBatch({
      subject: "fillBatch",
      fills: fillFamilies,
      holes: routeHoleFamilies(result.holes),
      owner: input.owner,
    }),
    discoverCreationHoles({
      subject: "optionDiscovery",
      holes: routeHoleFamilies(result.holes),
      owner: "creationHoleFrontier",
    }),
  ];
  return result;
}

function appendFinalizationRoute(session: RouteReducerSession): void {
  const finalization = finalizeRuntimeCharacterDraft({
    draft: session.draft,
    unitLibrary,
  });
  if (finalization.tag !== "ready") {
    throw new Error(
      `Expected reducer-backed creation route draft to finalize, received ${finalization.tag}.`,
    );
  }
  session.route = [
    ...session.route,
    finalizeCharacterDraft({
      subject: "finalization",
      owner: "characterBuild",
    }),
  ];
}

function routeHoleFamilies(
  holes: readonly CreationHole[],
): readonly CharacterCreationRouteHole[] {
  return uniqueSorted(holes.map(routeHoleFamily));
}

function routeHoleFamily(hole: CreationHole): CharacterCreationRouteHole {
  if (hole.kind === "abilityScores") return "abilityScore";
  if (hole.source.tag === "draft") return "draftStructure";
  if (hole.source.tag === "loadout") return "loadout";
  return equipmentChoiceKey(hole.source.choiceKey)
    ? "equipmentSelection"
    : "unitChoice";
}

function routeFillFamilies(
  fills: readonly CreationFill[],
  openHoles: readonly CreationHole[],
): readonly CharacterCreationRouteFill[] {
  return uniqueSorted(
    fills.map((fill) => {
      if (fill.kind === "abilityScores") return "abilityScoreAssignment";
      const hole = openHoles.find(
        (candidate) => candidate.holeId === fill.holeId,
      );
      if (hole?.kind === "choice") {
        if (hole.source.tag === "loadout") return "loadoutSelection";
        if (
          hole.source.tag === "unitChoice" &&
          equipmentChoiceKey(hole.source.choiceKey)
        ) {
          return "equipmentSelection";
        }
      }
      return String(fill.holeId).startsWith("cc:loadout-source:")
        ? "loadoutSelection"
        : "choiceSet";
    }),
  );
}

function equipmentChoiceKey(choiceKey: UnitChoiceKey): boolean {
  return (
    choiceKey === CLASS_EQUIPMENT_CHOICE_KEY ||
    choiceKey === BACKGROUND_EQUIPMENT_CHOICE_KEY ||
    choiceKey === EQUIPMENT_PURCHASE_CHOICE_KEY
  );
}

function initialManifestFills(
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
    standardArrayFill(holes, "draft.abilityScoreGeneration"),
    choiceFill(choiceHoleByDraftPath(holes, "draft.languages"), [
      "Dwarvish",
      "Goblin",
    ]),
    choiceFill(choiceHoleByDraftPath(holes, "draft.alignment"), [
      PHASE1_ALIGNMENT_OPTION_ID,
    ]),
  ];
}

function initialChoicesOnlyFills(
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
    choiceFill(choiceHoleByDraftPath(holes, "draft.languages"), [
      "Dwarvish",
      "Goblin",
    ]),
    choiceFill(choiceHoleByDraftPath(holes, "draft.alignment"), [
      PHASE1_ALIGNMENT_OPTION_ID,
    ]),
  ];
}

function abilityScoresOnlyFills(
  holes: readonly CreationHole[],
): readonly CreationFill[] {
  return [standardArrayFill(holes, "draft.abilityScoreGeneration")];
}

function duplicateLanguageHoleFills(
  holes: readonly CreationHole[],
): readonly CreationFill[] {
  const languageHole = choiceHoleByDraftPath(holes, "draft.languages");
  return [
    choiceFill(languageHole, ["Dwarvish", "Goblin"]),
    choiceFill(languageHole, ["Dwarvish", "Goblin"]),
  ];
}

function closedInitialProgressionHoleFills(): readonly CreationFill[] {
  return [
    {
      kind: "choice",
      holeId: creationHoleId("cc:draft:draft.progression.initial"),
      optionIds: [
        progressionOptionId({
          startingClass: classUnitId(PHASE1_CLASS_FIGHTER_UNIT_ID),
          advancements: [],
        }),
      ],
    },
  ];
}

function manifestChoiceFills(
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
        "fighter_fighting_style",
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
      PHASE1_WEAPON_MASTERY_UNIT_IDS.slice(0, 3),
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

function manifestPurchaseFills(
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

function manifestLoadoutFills(
  holes: readonly CreationHole[],
): readonly CreationFill[] {
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

function choiceHoleByDraftPath(
  holes: readonly CreationHole[],
  path: Extract<CreationHole["source"], { readonly tag: "draft" }>["path"],
): Extract<CreationHole, { readonly kind: "choice" }> {
  return choiceHoleByPredicate(
    holes,
    (hole) => hole.source.tag === "draft" && hole.source.path === path,
    `draft path ${path}`,
  );
}

function choiceHoleByUnit(
  holes: readonly CreationHole[],
  unitId: string,
  choiceKey: UnitChoiceKey,
): Extract<CreationHole, { readonly kind: "choice" }> {
  return choiceHoleByPredicate(
    holes,
    (hole) =>
      hole.source.tag === "unitChoice" &&
      hole.source.unitId === unitId &&
      hole.source.choiceKey === choiceKey,
    `${unitId}/${choiceKey}`,
  );
}

function choiceHoleByLoadout(
  holes: readonly CreationHole[],
  equipmentUnitId: string,
  slot: LoadoutSlot,
): Extract<CreationHole, { readonly kind: "choice" }> {
  return choiceHoleByPredicate(
    holes,
    (hole) =>
      hole.source.tag === "loadout" &&
      hole.source.equipmentUnitId === equipmentUnitId &&
      hole.source.slot === slot,
    `${equipmentUnitId}/${slot}`,
  );
}

function choiceHoleByPredicate(
  holes: readonly CreationHole[],
  predicate: (
    hole: Extract<CreationHole, { readonly kind: "choice" }>,
  ) => boolean,
  label: string,
): Extract<CreationHole, { readonly kind: "choice" }> {
  const hole = holes.find(
    (candidate): candidate is Extract<CreationHole, { readonly kind: "choice" }> =>
      candidate.kind === "choice" && predicate(candidate),
  );
  if (hole === undefined) {
    throw new Error(`Expected reducer-discovered creation choice hole ${label}.`);
  }
  return hole;
}

function choiceFill(
  hole: Extract<CreationHole, { readonly kind: "choice" }>,
  optionIds: readonly string[],
): CreationFill {
  return {
    kind: "choice",
    holeId: hole.holeId,
    optionIds: optionIds.map((optionId) =>
      creationChoiceOptionId(String(optionId)),
    ),
  };
}

function standardArrayFill(
  holes: readonly CreationHole[],
  path: Extract<CreationHole["source"], { readonly tag: "draft" }>["path"],
): CreationFill {
  const hole = holes.find(
    (candidate): candidate is Extract<
      CreationHole,
      { readonly kind: "abilityScores" }
    > =>
      candidate.kind === "abilityScores" &&
      candidate.source.tag === "draft" &&
      candidate.source.path === path,
  );
  if (hole === undefined) {
    throw new Error(`Expected reducer-discovered ability score hole ${path}.`);
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
    throw new Error("Standard Array route MBT fixture must parse.");
  }
  return {
    kind: "abilityScores",
    holeId: hole.holeId,
    method: "standardArray",
    value: scores.right,
  };
}

function wrongKindAbilityScoreFill(
  hole: Extract<CreationHole, { readonly kind: "choice" }>,
): CreationFill {
  const scores = abilityScoreAssignment({
    str: 15,
    dex: 14,
    con: 13,
    int: 8,
    wis: 10,
    cha: 12,
  });
  if (Either.isLeft(scores)) {
    throw new Error("Wrong-kind ability score route MBT fixture must parse.");
  }
  return {
    kind: "abilityScores",
    holeId: hole.holeId,
    method: "standardArray",
    value: scores.right,
  };
}

function choiceFillForKnownProtocolLoadoutArmor(
  optionIds: readonly string[],
): CreationFill {
  const equipmentUnitId = loadoutEquipmentUnitId(PHASE1_ARMOR_CHAIN_MAIL_UNIT_ID);
  if (Either.isLeft(equipmentUnitId)) {
    throw new Error("Known route MBT loadout armor Unit id must parse.");
  }
  return {
    kind: "choice",
    holeId: creationHoleId(
      loadoutSourceHoleIdText({
        tag: "loadout",
        equipmentUnitId: equipmentUnitId.right,
        slot: "armor",
      }),
    ),
    optionIds: optionIds.map(creationChoiceOptionId),
  };
}

function projectCharacterBuildFactsRoute(
  route: readonly CharacterCreationRouteEvent[],
): readonly CharacterCreationRouteEvent[] {
  return [
    ...route,
    projectCharacterBuildFacts({
      subject: "buildProjection",
      owner: "characterBuild",
    }),
  ];
}

function retainSelectedReferenceRoute(
  route: readonly CharacterCreationRouteEvent[],
): readonly CharacterCreationRouteEvent[] {
  return [
    ...route,
    retainCreationSelectedReferences({
      subject: "selectedReference",
      owner: "creationSelectedReference",
    }),
  ];
}

function retainAndProjectSelectedReferenceRoute(
  route: readonly CharacterCreationRouteEvent[],
): readonly CharacterCreationRouteEvent[] {
  return [
    ...route,
    retainCreationSelectedReferences({
      subject: "selectedReference",
      owner: "creationSelectedReference",
    }),
    projectCharacterBuildFacts({
      subject: "buildProjection",
      owner: "characterBuild",
    }),
  ];
}

function projectSelectedReferenceRoute(
  route: readonly CharacterCreationRouteEvent[],
): readonly CharacterCreationRouteEvent[] {
  return [
    ...route,
    retainCreationSelectedReferences({
      subject: "selectedReference",
      owner: "creationSelectedReference",
    }),
    projectCharacterBuildFacts({
      subject: "buildProjection",
      owner: "characterBuild",
    }),
  ];
}

function replaceSelectedReferenceRoute(
  route: readonly CharacterCreationRouteEvent[],
): readonly CharacterCreationRouteEvent[] {
  return [
    ...route,
    applyCreationFillBatch({
      subject: "selectedReference",
      fills: ["choiceSet"],
      holes: [],
      owner: "characterBuild",
    }),
    retainCreationSelectedReferences({
      subject: "selectedReference",
      owner: "creationSelectedReference",
    }),
    projectCharacterBuildFacts({
      subject: "buildProjection",
      owner: "characterBuild",
    }),
  ];
}

function rejectedInvocationSelectionRoute(
  route: readonly CharacterCreationRouteEvent[],
): readonly CharacterCreationRouteEvent[] {
  return [
    ...route,
    applyCreationFillBatch({
      subject: "selectedReference",
      fills: ["choiceSet"],
      holes: ["unitChoice"],
      owner: "creationSupportProfileAdmission",
    }),
  ];
}

function createCharacterDraft(
  owner: CharacterCreationRouteOwner,
): CharacterCreationRouteEvent {
  return { kind: "createCharacterDraft", owner };
}

function discoverCreationHoles(input: {
  readonly subject: CharacterCreationRouteSubject;
  readonly holes: readonly CharacterCreationRouteHole[];
  readonly owner: CharacterCreationRouteOwner;
}): CharacterCreationRouteEvent {
  return {
    kind: "discoverCreationHoles",
    subject: input.subject,
    holes: uniqueSorted(input.holes),
    owner: input.owner,
  };
}

function applyCreationFillBatch(input: {
  readonly subject: CharacterCreationRouteSubject;
  readonly fills: readonly CharacterCreationRouteFill[];
  readonly holes: readonly CharacterCreationRouteHole[];
  readonly owner: CharacterCreationRouteOwner;
}): CharacterCreationRouteEvent {
  return {
    kind: "applyCreationFillBatch",
    subject: input.subject,
    fills: uniqueSorted(input.fills),
    holes: uniqueSorted(input.holes),
    owner: input.owner,
  };
}

function retainCreationSelectedReferences(input: {
  readonly subject: CharacterCreationRouteSubject;
  readonly owner: CharacterCreationRouteOwner;
}): CharacterCreationRouteEvent {
  return {
    kind: "retainCreationSelectedReferences",
    subject: input.subject,
    owner: input.owner,
  };
}

function projectCharacterBuildFacts(input: {
  readonly subject: CharacterCreationRouteSubject;
  readonly owner: CharacterCreationRouteOwner;
}): CharacterCreationRouteEvent {
  return {
    kind: "projectCharacterBuildFacts",
    subject: input.subject,
    owner: input.owner,
  };
}

function finalizeCharacterDraft(input: {
  readonly subject: CharacterCreationRouteSubject;
  readonly owner: CharacterCreationRouteOwner;
}): CharacterCreationRouteEvent {
  return {
    kind: "finalizeCharacterDraft",
    subject: input.subject,
    owner: input.owner,
  };
}

async function runRouteMbt<Actions extends SimpleActionMap>(input: {
  readonly specFileName: string;
  readonly driver: () => SimpleDriver<RouteProjection, Actions>;
  readonly maxSteps: number;
}): Promise<void> {
  await run({
    spec: path.resolve(import.meta.dirname, "..", input.specFileName),
    init: "init",
    step: "step",
    driver: input.driver,
    backend: "typescript",
    nTraces: mbtTraceCount(),
    maxSteps: input.maxSteps,
    stateCheck: routeStateCheck,
  });
}

function mbtTraceCount(): number {
  return numberFromEnv("MBT_TRACES", 1);
}

function focusedMbtMaxSteps(domainMaxSteps: number): number {
  return Math.min(numberFromEnv("MBT_STEPS", domainMaxSteps), domainMaxSteps);
}

function numberFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeCharacterCreationRouteQuintState(raw: unknown): RouteProjection {
  const root = quintStateRecord(raw);
  const state = Object.hasOwn(root, "qState")
    ? quintRecordField(root, "qState")
    : root;
  return {
    route: decodeCharacterCreationRoute(quintField(state, "qRoute")),
  };
}

function decodeCharacterCreationRoute(
  raw: unknown,
): readonly CharacterCreationRouteEvent[] {
  return quintList(raw, "qRoute").map(decodeCharacterCreationRouteEvent);
}

function decodeCharacterCreationRouteEvent(
  raw: unknown,
): CharacterCreationRouteEvent {
  const tag = quintVariantTag(raw, "qRoute[]");
  if (tag === "RouteCreateCharacterDraft") {
    const payload = routePayload(raw, tag);
    return createCharacterDraft(routeOwner(quintField(payload, "owner")));
  }
  if (tag === "RouteDiscoverCreationHoles") {
    const payload = routePayload(raw, tag);
    return discoverCreationHoles({
      subject: routeSubject(quintField(payload, "subject")),
      holes: routeHoles(quintField(payload, "holes")),
      owner: routeOwner(quintField(payload, "owner")),
    });
  }
  if (tag === "RouteApplyCreationFillBatch") {
    const payload = routePayload(raw, tag);
    return applyCreationFillBatch({
      subject: routeSubject(quintField(payload, "subject")),
      fills: routeFills(quintField(payload, "fills")),
      holes: routeHoles(quintField(payload, "holes")),
      owner: routeOwner(quintField(payload, "owner")),
    });
  }
  if (tag === "RouteRetainCreationSelectedReferences") {
    const payload = routePayload(raw, tag);
    return retainCreationSelectedReferences({
      subject: routeSubject(quintField(payload, "subject")),
      owner: routeOwner(quintField(payload, "owner")),
    });
  }
  if (tag === "RouteProjectCharacterBuildFacts") {
    const payload = routePayload(raw, tag);
    return projectCharacterBuildFacts({
      subject: routeSubject(quintField(payload, "subject")),
      owner: routeOwner(quintField(payload, "owner")),
    });
  }
  if (tag === "RouteFinalizeCharacterDraft") {
    const payload = routePayload(raw, tag);
    return finalizeCharacterDraft({
      subject: routeSubject(quintField(payload, "subject")),
      owner: routeOwner(quintField(payload, "owner")),
    });
  }
  throw new Error(`Unknown character-creation route event: ${tag}.`);
}

function routePayload(
  raw: unknown,
  expectedTag: string,
): Readonly<Record<string, unknown>> {
  const value = quintVariantValue(raw, expectedTag, "qRoute[]");
  if (isRecord(value)) return value;
  throw new Error(`Expected character-creation route ${expectedTag} payload.`);
}

function routeSubject(raw: unknown): CharacterCreationRouteSubject {
  return mappedVariant(raw, SUBJECT_BY_TAG, "character-creation route subject");
}

function routeOwner(raw: unknown): CharacterCreationRouteOwner {
  return mappedVariant(raw, OWNER_BY_TAG, "character-creation route owner");
}

function routeHole(raw: unknown): CharacterCreationRouteHole {
  return mappedVariant(raw, HOLE_BY_TAG, "character-creation route hole");
}

function routeHoles(raw: unknown): readonly CharacterCreationRouteHole[] {
  return uniqueSorted(quintSet(raw, "qRoute[].holes").map(routeHole));
}

function routeFill(raw: unknown): CharacterCreationRouteFill {
  return mappedVariant(raw, FILL_BY_TAG, "character-creation route fill");
}

function routeFills(raw: unknown): readonly CharacterCreationRouteFill[] {
  return uniqueSorted(quintSet(raw, "qRoute[].fills").map(routeFill));
}

function mappedVariant<
  const Value extends string,
  const Mapping extends Readonly<Record<string, Value>>,
>(
  raw: unknown,
  mapping: Mapping,
  label: string,
): Value {
  const tag = quintVariantTag(raw, label);
  if (hasOwnKey(mapping, tag)) {
    return mapping[tag];
  }
  throw new Error(`Unknown ${label}: ${tag}.`);
}

function hasOwnKey<T extends object>(
  value: T,
  key: PropertyKey,
): key is keyof T {
  return Object.hasOwn(value, key);
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (isRecord(raw)) return raw;
  throw new Error("Expected Quint state to be an object.");
}

function quintField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): unknown {
  if (Object.hasOwn(state, field)) return state[field];
  throw new Error(`Expected Quint state field ${field}.`);
}

function quintRecordField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): Readonly<Record<string, unknown>> {
  const value = quintField(state, field);
  if (isRecord(value)) return value;
  throw new Error(`Expected Quint state field ${field} to be a record.`);
}

function quintList(raw: unknown, field: string): readonly unknown[] {
  if (Array.isArray(raw)) return raw;
  throw new Error(`Expected Quint list field ${field}.`);
}

function quintSet(raw: unknown, field: string): readonly unknown[] {
  if (raw instanceof Set) return [...raw];
  throw new Error(`Expected Quint set field ${field}.`);
}

function quintVariantTag(raw: unknown, field: string): string {
  if (typeof raw === "string") return raw;
  if (isRecord(raw) && typeof raw["tag"] === "string") return raw["tag"];
  throw new Error(`Expected Quint variant tag field ${field}.`);
}

function quintVariantValue(
  raw: unknown,
  expectedTag: string,
  field: string,
): unknown {
  if (
    isRecord(raw) &&
    raw["tag"] === expectedTag &&
    Object.hasOwn(raw, "value")
  ) {
    return raw["value"];
  }
  throw new Error(`Expected Quint ${expectedTag} variant value field ${field}.`);
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function uniqueSorted<const Value extends string>(
  values: readonly Value[],
): readonly Value[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
