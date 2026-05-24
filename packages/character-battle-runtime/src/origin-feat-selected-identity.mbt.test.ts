// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B7-FEAT-IDENTITY-BATCH alert
// UNIT-IDENTITY-MBT-REPLAY: B7-FEAT-IDENTITY-BATCH alert doFinalizeCriminalAlertOriginFeat doProjectAlertInitiativeHandoff
import * as path from "node:path";

import {
  abilityScoreAssignment,
  characterBuildUnitRefs,
  characterDraftId,
  createCharacterDraft,
  creationChoiceOptionId,
  creationHoleId,
  fillCreationHoles,
  finalizeCharacterDraft,
  loadoutEquipmentUnitId,
  loadoutSourceHoleIdText,
  type CharacterBuild,
  type CharacterDraft,
  type CreationFill,
  type CreationHoleIdText,
  type LoadoutSlot,
  type UnitChoiceKey,
  unitChoiceSourceHoleIdText,
  unitChoiceSourceUnitId,
} from "@dnd/character-creation-runtime";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import { characterBattleInitiativeScore } from "./index.ts";

const TASK_ID = "B7-FEAT-IDENTITY-BATCH";
const ALERT_UNIT_ID = "alert";
const CRIMINAL_BACKGROUND_UNIT_ID = "background_criminal";

const originFeatSelectedIdentityResults = [
  "init",
  "criminal-alert-origin-feat",
  "alert-initiative-handoff",
] as const;
type OriginFeatSelectedIdentityResult =
  (typeof originFeatSelectedIdentityResults)[number];
type OriginFeatSelectedIdentityProjection = {
  readonly lastResult: OriginFeatSelectedIdentityResult;
  readonly originFeatUnitId: typeof ALERT_UNIT_ID | "none";
  readonly backgroundUnitId: typeof CRIMINAL_BACKGROUND_UNIT_ID | "none";
  readonly initiativeScore: number;
};
type OriginFeatSelectedIdentityDriverAction = Exclude<
  keyof typeof originFeatSelectedIdentityDriverSchema,
  "init" | "step"
>;
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly OriginFeatSelectedIdentityDriverAction[];
  readonly expected: OriginFeatSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: typeof TASK_ID;
  readonly unitId: typeof ALERT_UNIT_ID;
  readonly actions: readonly OriginFeatSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const originFeatSelectedIdentityDriverSchema = {
  init: {},
  doFinalizeCriminalAlertOriginFeat: {},
  doProjectAlertInitiativeHandoff: {},
  step: {},
} as const;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Origin feat selected identity Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "B7-FEAT-IDENTITY-BATCH",
    unitId: "alert",
    actions: [
      "doFinalizeCriminalAlertOriginFeat",
      "doProjectAlertInitiativeHandoff",
    ],
    sequences: [
      {
        name: "selected-criminal-background-retains-alert-origin-feat",
        actions: ["doFinalizeCriminalAlertOriginFeat"],
        expected: criminalAlertOriginFeatProjection(),
      },
      {
        name: "selected-alert-origin-feat-projects-initiative-handoff",
        actions: [
          "doFinalizeCriminalAlertOriginFeat",
          "doProjectAlertInitiativeHandoff",
        ],
        expected: alertInitiativeHandoffProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

const originFeatSelectedIdentityStateCheck = stateCheck(
  normalizeOriginFeatSelectedIdentityQuintState,
  compareOriginFeatSelectedIdentityState,
);

describe("Character Battle origin feat selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<OriginFeatSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createOriginFeatSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing origin feat selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Origin feat selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("retains SRD Origin feat identity through supported backgrounds", () => {
    const cases = [
      {
        backgroundUnitId: "background_acolyte",
        originFeatUnitId: "feat_magic_initiate_cleric",
        asiOptionId: "two_and_one:int:wis",
        toolOptionId: "calligraphers_supplies",
      },
      {
        backgroundUnitId: CRIMINAL_BACKGROUND_UNIT_ID,
        originFeatUnitId: ALERT_UNIT_ID,
        asiOptionId: "two_and_one:dex:con",
        toolOptionId: "thieves_tools",
      },
      {
        backgroundUnitId: "background_sage",
        originFeatUnitId: "feat_magic_initiate_wizard",
        asiOptionId: "two_and_one:int:wis",
        toolOptionId: "calligraphers_supplies",
      },
      {
        backgroundUnitId: "background_soldier",
        originFeatUnitId: "feat_savage_attacker",
        asiOptionId: "two_and_one:str:con",
        toolOptionId: "tool_dice_set",
      },
    ] as const;

    for (const expected of cases) {
      const build = finalizedFighterBuildForBackground(expected);
      const unitRefIds = characterBuildUnitRefs(build, unitLibrary).map(
        (ref) => ref.unitId,
      );

      expect(unitRefIds).toContain(expected.backgroundUnitId);
      expect(unitRefIds).toContain(expected.originFeatUnitId);
      expect(
        build.features.some(
          (feature) =>
            "unitId" in feature &&
            feature.unitId === expected.originFeatUnitId,
        ),
      ).toBe(false);
    }
  });

  it("replays Character Battle origin feat selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-battle-origin-feat-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createOriginFeatSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 2),
      stateCheck: originFeatSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createOriginFeatSelectedIdentityDriver() {
  return defineDriver(originFeatSelectedIdentityDriverSchema, () => {
    let projection = initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doFinalizeCriminalAlertOriginFeat: () => {
        projection = criminalAlertOriginFeatProjection();
      },
      doProjectAlertInitiativeHandoff: () => {
        projection = alertInitiativeHandoffProjection();
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function initialProjection(): OriginFeatSelectedIdentityProjection {
  return {
    lastResult: "init",
    originFeatUnitId: "none",
    backgroundUnitId: "none",
    initiativeScore: 0,
  };
}

function criminalAlertOriginFeatProjection(): OriginFeatSelectedIdentityProjection {
  const build = finalizedFighterBuildForBackground({
    backgroundUnitId: CRIMINAL_BACKGROUND_UNIT_ID,
    originFeatUnitId: ALERT_UNIT_ID,
    asiOptionId: "two_and_one:dex:con",
    toolOptionId: "thieves_tools",
  });
  const unitRefIds = characterBuildUnitRefs(build, unitLibrary).map(
    (ref) => ref.unitId,
  );
  if (!unitRefIds.includes(ALERT_UNIT_ID)) {
    throw new Error(
      "Expected finalized Criminal background build to retain Alert.",
    );
  }

  return {
    lastResult: "criminal-alert-origin-feat",
    originFeatUnitId: ALERT_UNIT_ID,
    backgroundUnitId: CRIMINAL_BACKGROUND_UNIT_ID,
    initiativeScore: 0,
  };
}

function alertInitiativeHandoffProjection(): OriginFeatSelectedIdentityProjection {
  const build = finalizedFighterBuildForBackground({
    backgroundUnitId: CRIMINAL_BACKGROUND_UNIT_ID,
    originFeatUnitId: ALERT_UNIT_ID,
    asiOptionId: "two_and_one:dex:con",
    toolOptionId: "thieves_tools",
  });
  const score = characterBattleInitiativeScore({
    build,
    unitLibrary,
    rollTotal: 14,
    proficiencyBonusChoice: "add",
  });
  if (Either.isLeft(score)) {
    throw new Error(score.left.message);
  }

  return {
    ...criminalAlertOriginFeatProjection(),
    lastResult: "alert-initiative-handoff",
    initiativeScore: score.right,
  };
}

function finalizedFighterBuildForBackground(input: {
  readonly backgroundUnitId: string;
  readonly originFeatUnitId: string;
  readonly asiOptionId: string;
  readonly toolOptionId: string;
}): CharacterBuild {
  const finalized = finalizeCharacterDraft({
    draft: completeFighterDraftForBackground(input),
    unitLibrary,
  });
  if (finalized.tag !== "ready") {
    throw new Error(
      `Expected ${input.backgroundUnitId} origin feat draft to finalize, received ${finalized.tag}.`,
    );
  }
  const unitRefIds = characterBuildUnitRefs(finalized.build, unitLibrary).map(
    (ref) => ref.unitId,
  );
  if (!unitRefIds.includes(input.originFeatUnitId)) {
    throw new Error(
      `Expected ${input.backgroundUnitId} build refs to include ${input.originFeatUnitId}.`,
    );
  }
  return finalized.build;
}

function completeFighterDraftForBackground(input: {
  readonly backgroundUnitId: string;
  readonly asiOptionId: string;
  readonly toolOptionId: string;
}): CharacterDraft {
  const draft = createCharacterDraft({
    unitLibrary,
    draftId: characterDraftId(`origin-feat-${input.backgroundUnitId}`),
  });
  const afterInitial = requireAcceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: [
        choiceFill(
          "cc:draft:draft.progression.initial",
          "13:class_fighter:level_1:maximum_hit_die",
        ),
        choiceFill("cc:draft:draft.background", input.backgroundUnitId),
        choiceFill("cc:draft:draft.species", "species_orc"),
        {
          kind: "abilityScores",
          holeId: creationHoleId("cc:draft:draft.abilityScoreGeneration"),
          method: "standardArray",
          value: expectRight(
            abilityScoreAssignment({
              str: 15,
              dex: 14,
              con: 13,
              int: 8,
              wis: 10,
              cha: 12,
            }),
          ),
        },
        choiceFill("cc:draft:draft.languages", "Dwarvish", "Goblin"),
        choiceFill("cc:draft:draft.alignment", "lawful_good"),
      ],
    }),
  );
  const afterChoices = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterInitial,
      unitLibrary,
      expectedRevision: afterInitial.revision,
      fills: [
        choiceFill(
          unitChoiceHoleId("class_fighter", "class_skill_proficiency_choice"),
          "perception",
          "survival",
        ),
        choiceFill(
          unitChoiceHoleId("fighter_fighting_style", "class_feature_feat_choice"),
          "defense",
        ),
        choiceFill(
          unitChoiceHoleId("fighter_weapon_mastery", "weapon_mastery_options"),
          "weapon_longsword",
          "weapon_spear",
          "weapon_flail",
        ),
        choiceFill(
          unitChoiceHoleId(
            input.backgroundUnitId,
            "background_ability_score_increase",
          ),
          input.asiOptionId,
        ),
        choiceFill(
          unitChoiceHoleId(input.backgroundUnitId, "background_tool_choice"),
          input.toolOptionId,
        ),
        choiceFill(
          unitChoiceHoleId("class_fighter", "class_equipment_choice"),
          "option_c",
        ),
        choiceFill(
          unitChoiceHoleId(input.backgroundUnitId, "background_equipment_choice"),
          "option_b",
        ),
      ],
    }),
  );
  const afterPurchase = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterChoices,
      unitLibrary,
      expectedRevision: afterChoices.revision,
      fills: [
        choiceFill(
          unitChoiceHoleId("class_fighter", "equipment_purchase"),
          "armor_chain_mail",
          "weapon_longsword",
          "equipment_shield",
        ),
      ],
    }),
  );

  return requireAcceptedBatch(
    fillCreationHoles({
      draft: afterPurchase,
      unitLibrary,
      expectedRevision: afterPurchase.revision,
      fills: [
        choiceFill(loadoutHoleId("armor_chain_mail", "armor"), "worn"),
        choiceFill(loadoutHoleId("equipment_shield", "shield"), "wielded"),
        choiceFill(
          loadoutHoleId("weapon_longsword", "weapon"),
          "wielded_one_handed",
        ),
      ],
    }),
  );
}

function requireAcceptedBatch(result: ReturnType<typeof fillCreationHoles>) {
  if (result.tag !== "accepted") {
    throw new Error(
      `Expected accepted origin feat fill batch, received ${JSON.stringify(result.issues)}`,
    );
  }

  return result.draft;
}

function choiceFill(
  holeId: CreationHoleIdText,
  ...optionIds: readonly string[]
): CreationFill {
  return {
    kind: "choice",
    holeId: creationHoleId(holeId),
    optionIds: optionIds.map(creationChoiceOptionId),
  };
}

function unitChoiceHoleId(
  unitId: string,
  choiceKey: UnitChoiceKey,
): CreationHoleIdText {
  const parsedUnitId = unitChoiceSourceUnitId(unitId);
  if (Either.isLeft(parsedUnitId)) {
    throw new Error(`Invalid unit choice source Unit id ${unitId}.`);
  }
  return unitChoiceSourceHoleIdText({
    tag: "unitChoice",
    unitId: parsedUnitId.right,
    choiceKey,
  });
}

function loadoutHoleId(
  equipmentUnitId: string,
  slot: LoadoutSlot,
): CreationHoleIdText {
  const parsedEquipmentUnitId = loadoutEquipmentUnitId(equipmentUnitId);
  if (Either.isLeft(parsedEquipmentUnitId)) {
    throw new Error(`Invalid loadout equipment Unit id ${equipmentUnitId}.`);
  }
  return loadoutSourceHoleIdText({
    tag: "loadout",
    equipmentUnitId: parsedEquipmentUnitId.right,
    slot,
  });
}

function normalizeOriginFeatSelectedIdentityQuintState(
  raw: unknown,
): OriginFeatSelectedIdentityProjection {
  const state = quintStateRecord(raw);
  return {
    lastResult: resultField(state["qLastResult"]),
    originFeatUnitId: originFeatUnitIdField(state["qOriginFeatUnitId"]),
    backgroundUnitId: backgroundUnitIdField(state["qBackgroundUnitId"]),
    initiativeScore: numberFromQuintInt(
      state["qInitiativeScore"],
      "qInitiativeScore",
    ),
  };
}

function compareOriginFeatSelectedIdentityState(
  runtime: OriginFeatSelectedIdentityProjection,
  quint: OriginFeatSelectedIdentityProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) throw new Error(error.message);
    throw error;
  }
  return true;
}

function resultField(raw: unknown): OriginFeatSelectedIdentityResult {
  if (
    raw === "init" ||
    raw === "criminal-alert-origin-feat" ||
    raw === "alert-initiative-handoff"
  ) {
    return raw;
  }
  throw new Error(`Unknown origin feat selected identity result ${String(raw)}.`);
}

function originFeatUnitIdField(
  raw: unknown,
): OriginFeatSelectedIdentityProjection["originFeatUnitId"] {
  if (raw === "none" || raw === ALERT_UNIT_ID) return raw;
  throw new Error(`Unknown origin feat Unit id ${String(raw)}.`);
}

function backgroundUnitIdField(
  raw: unknown,
): OriginFeatSelectedIdentityProjection["backgroundUnitId"] {
  if (raw === "none" || raw === CRIMINAL_BACKGROUND_UNIT_ID) return raw;
  throw new Error(`Unknown origin feat background Unit id ${String(raw)}.`);
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint origin feat selected identity state.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function expectRight<T, E>(result: Either.Either<T, E>): T {
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(String(result.left));
  }
  return result.right;
}
