// UNIT-IDENTITY-EVIDENCE: selected-identity-replay B7-FEAT-IDENTITY-BATCH alert
// UNIT-IDENTITY-REPLAY: B7-FEAT-IDENTITY-BATCH alert doFinalizeCriminalAlertOriginFeat doProjectAlertInitiativeHandoff
import { assertStatBlockForTest } from "@dnd/surface/surface/stat-block-catalog.test-support";
import {
  statBlockId as authoredStatBlockId,
  unitId as authoredUnitId,
} from "@dnd/shared/game-facts";
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
  battleAmmunitionStock,
  battleId,
  battleInitializationIssueMessage,
  combatantId,
  initiativeScore,
  startBattle,
} from "@dnd/battle-runtime";
import {
  characterSheetId,
  rebuildCharacterSheet,
} from "@dnd/character-sheet-runtime";
import { Hp } from "@dnd/shared/types";
import { srdStatBlockCollection } from "@dnd/surface/surface/stat-block-catalog";
import { buildStatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Result } from "effect";
import { describe, expect, it } from "vitest";

import { requireResultSuccess as expectSuccess } from "./result.test-support.ts";

import {
  characterBattleInitiativeScore,
  characterBattleRuntimeIssueMessage,
  characterSheetBattleInitWithRoute,
  composeBattleRoster,
  type CharacterBattleRouteEvent,
} from "./index.ts";

const ALERT_UNIT_ID = "alert";
const CRIMINAL_BACKGROUND_UNIT_ID = "background_criminal";

type OriginFeatSelectedIdentityResult =
  | "init"
  | "criminal-alert-origin-feat"
  | "alert-initiative-handoff";
type OriginFeatSelectedIdentityProjection = {
  readonly outcome: OriginFeatSelectedIdentityResult;
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
  readonly taskId: "B7-FEAT-IDENTITY-BATCH";
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
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error("Origin feat selected identity catalogs must build.");
}
const unitLibrary = unitCatalogResult.catalog;
const statBlockCatalog = statBlockCatalogResult.catalog;

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

describe("Character Battle origin feat selected identity replay", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<OriginFeatSelectedIdentityDriverAction>();

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
        magicInitiate: {
          cantrips: ["guidance", "sacred_flame"],
          levelOneSpell: "bless",
          ability: "wis",
        },
      },
      {
        backgroundUnitId: CRIMINAL_BACKGROUND_UNIT_ID,
        originFeatUnitId: ALERT_UNIT_ID,
        asiOptionId: "two_and_one:dex:con",
        toolOptionId: "thieves_tools",
        magicInitiate: false,
      },
      {
        backgroundUnitId: "background_sage",
        originFeatUnitId: "feat_magic_initiate_wizard",
        asiOptionId: "two_and_one:int:wis",
        toolOptionId: "calligraphers_supplies",
        magicInitiate: {
          cantrips: ["fire_bolt", "light"],
          levelOneSpell: "burning_hands",
          ability: "int",
        },
      },
      {
        backgroundUnitId: "background_soldier",
        originFeatUnitId: "feat_savage_attacker",
        asiOptionId: "two_and_one:str:con",
        toolOptionId: "tool_dice_set",
        magicInitiate: false,
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
            "unitId" in feature && feature.unitId === expected.originFeatUnitId,
        ),
      ).toBe(false);
    }
  });

  it("observes selected Origin feat qRoute through public handoff entrypoints", () => {
    const build = finalizedFighterBuildForBackground({
      backgroundUnitId: CRIMINAL_BACKGROUND_UNIT_ID,
      originFeatUnitId: ALERT_UNIT_ID,
      asiOptionId: "two_and_one:dex:con",
      toolOptionId: "thieves_tools",
      magicInitiate: false,
    });
    const unitRefIds = characterBuildUnitRefs(build, unitLibrary).map(
      (ref) => ref.unitId,
    );
    const retentionRoute =
      publicCharacterSheetBattleInitSelectedReferenceRetentionRoute(build);
    const initiativeHandoffRoute =
      publicStartBattleSelectedReferenceRuntimeRoute(build);

    expect(unitRefIds).toContain(CRIMINAL_BACKGROUND_UNIT_ID);
    expect(unitRefIds).toContain(ALERT_UNIT_ID);
    expect(retentionRoute).toEqual([
      {
        kind: "projectCharacterSheetToBattle",
        subject: "handoffSelectedReference",
        owner: "characterBattleBuildProjection",
      },
      {
        kind: "recordCharacterBattleHandoffFacts",
        subject: "handoffSelectedReference",
        facts: ["selectedReferenceRetention"],
        owner: "characterBattleBuildProjection",
      },
    ]);
    expect(initiativeHandoffRoute).toEqual([
      {
        kind: "projectCharacterSheetToBattle",
        subject: "handoffSelectedReference",
        owner: "characterBattleBuildProjection",
      },
      {
        kind: "recordCharacterBattleHandoffFacts",
        subject: "handoffSelectedReference",
        facts: ["selectedReferenceRetention"],
        owner: "characterBattleBuildProjection",
      },
      {
        kind: "projectCharacterSheetToBattle",
        subject: "handoffSelectedReference",
        owner: "characterBattleInitProjection",
      },
      {
        kind: "enterBattleRuntime",
        subject: "handoffSelectedReference",
        owner: "characterBattleRuntime",
      },
    ]);
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
    outcome: "init",
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
    magicInitiate: false,
  });
  const unitRefIds = characterBuildUnitRefs(build, unitLibrary).map(
    (ref) => ref.unitId,
  );
  if (!unitRefIds.includes(authoredUnitId(ALERT_UNIT_ID))) {
    throw new Error(
      "Expected finalized Criminal background build to retain Alert.",
    );
  }

  return {
    outcome: "criminal-alert-origin-feat",
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
    magicInitiate: false,
  });
  const score = characterBattleInitiativeScore({
    build,
    unitLibrary,
    rollTotal: 14,
    proficiencyBonusChoice: "add",
  });
  if (Result.isFailure(score)) {
    throw new Error(characterBattleRuntimeIssueMessage(score.failure));
  }

  return {
    ...criminalAlertOriginFeatProjection(),
    outcome: "alert-initiative-handoff",
    initiativeScore: score.success,
  };
}

function publicCharacterSheetBattleInitSelectedReferenceRetentionRoute(
  build: CharacterBuild,
): readonly CharacterBattleRouteEvent[] {
  const projection = characterSheetBattleInitWithRoute({
    sheet: characterSheetForBuild(build),
    unitLibrary,
    statBlockCatalog,
    combatantId: combatantId("combatant:origin-feat-retention"),
    displayName: "Origin Feat Retention",
    initiative: alertInitiativeScoreForBuild(build),
    ammunitionStocks: [],
  });
  if (Result.isFailure(projection)) {
    throw new Error(characterBattleRuntimeIssueMessage(projection.failure));
  }

  return selectedReferenceRouteEvents(projection.success.routeEvents).filter(
    (event) => event.owner === "characterBattleBuildProjection",
  );
}

function publicStartBattleSelectedReferenceRuntimeRoute(
  build: CharacterBuild,
): readonly CharacterBattleRouteEvent[] {
  const character = {
    sheet: characterSheetForBuild(build),
    unitLibrary,
    statBlockCatalog,
    combatantId: combatantId("combatant:origin-feat-runtime-entry"),
    displayName: "Origin Feat Runtime Entry",
    initiative: alertInitiativeScoreForBuild(build),
    ammunitionStocks: [],
  };
  const statBlockEntryInput = {
    combatantId: combatantId("combatant:origin-feat-skeleton"),
    statBlock: assertStatBlockForTest(
      statBlockCatalog,
      authoredStatBlockId("stat_block_skeleton"),
    ),
    initiative: initiativeScore(10),
    ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
    conditions: [],
  };
  const roster = composeBattleRoster([
    {
      kind: "characterSheet",
      source: { kind: "available", input: character },
    },
    {
      kind: "statBlock",
      source: { kind: "available", input: statBlockEntryInput },
    },
  ]);
  if (roster.tag === "rejected") {
    throw new Error(`Roster admission failed: ${roster.issues[0].kind}`);
  }
  const session = startBattle({
    battleId: battleId("battle:origin-feat-runtime-entry"),
    combatants: roster.admissions.map((admission) => admission.combatant),
  });
  if (Result.isFailure(session)) {
    throw new Error(battleInitializationIssueMessage(session.failure));
  }

  return selectedReferenceRouteEvents(
    roster.admissions.flatMap((admission) =>
      admission.kind === "characterSheet" ? admission.routeEvents : [],
    ),
  );
}

function selectedReferenceRouteEvents(
  routeEvents: readonly CharacterBattleRouteEvent[],
): readonly CharacterBattleRouteEvent[] {
  return routeEvents.filter(
    (event) => event.subject === "handoffSelectedReference",
  );
}

function characterSheetForBuild(build: CharacterBuild) {
  const sheet = rebuildCharacterSheet({
    characterId: characterSheetId("character:origin-feat"),
    build,
    tempHp: Hp(0),
    hitPointMaximumReduction: Hp(0),
    conditions: [],
    companion: { tag: "none" },
    unitLibrary,
  });
  if (Result.isFailure(sheet)) {
    throw new Error(JSON.stringify(sheet.failure));
  }
  return sheet.success;
}

function alertInitiativeScoreForBuild(build: CharacterBuild) {
  const score = characterBattleInitiativeScore({
    build,
    unitLibrary,
    rollTotal: 14,
    proficiencyBonusChoice: "add",
  });
  if (Result.isFailure(score)) {
    throw new Error(characterBattleRuntimeIssueMessage(score.failure));
  }
  return score.success;
}

type FighterBackgroundFixtureInput = {
  readonly backgroundUnitId: string;
  readonly originFeatUnitId: string;
  readonly asiOptionId: string;
  readonly toolOptionId: string;
  readonly magicInitiate:
    | false
    | {
        readonly cantrips: readonly [string, string];
        readonly levelOneSpell: string;
        readonly ability: "int" | "wis" | "cha";
      };
};

function finalizedFighterBuildForBackground(
  input: FighterBackgroundFixtureInput,
): CharacterBuild {
  const finalized = finalizeCharacterDraft({
    draft: completeFighterDraftForBackground(input),
    unitLibrary,
  });
  if (finalized.tag !== "ready") {
    throw new Error(
      `Expected ${input.backgroundUnitId} origin feat draft to finalize, received ${finalized.tag}${finalized.tag === "incomplete" ? ` with holes ${JSON.stringify(finalized.holes.map((hole) => hole.holeId))}` : ` with issues ${JSON.stringify(finalized.issues)}`}.`,
    );
  }
  const unitRefIds = characterBuildUnitRefs(finalized.build, unitLibrary).map(
    (ref) => ref.unitId,
  );
  if (!unitRefIds.includes(authoredUnitId(input.originFeatUnitId))) {
    throw new Error(
      `Expected ${input.backgroundUnitId} build refs to include ${input.originFeatUnitId}.`,
    );
  }
  return finalized.build;
}

function completeFighterDraftForBackground(
  input: FighterBackgroundFixtureInput,
): CharacterDraft {
  const background = unitLibrary.requireUnit(
    authoredUnitId(input.backgroundUnitId),
  );
  if (background.kind !== "background") {
    throw new Error("Origin feat fixture requires a background Unit.");
  }
  const originFeatUnitId = background.originFeatId;
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
          value: expectSuccess(
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
  const afterOriginFeatChoices =
    input.magicInitiate === false
      ? afterInitial
      : requireAcceptedBatch(
          fillCreationHoles({
            draft: afterInitial,
            unitLibrary,
            expectedRevision: afterInitial.revision,
            fills: [
              choiceFill(
                unitChoiceHoleId(
                  originFeatUnitId,
                  "origin_feat_magic_initiate_cantrip_choice",
                ),
                ...input.magicInitiate.cantrips,
              ),
              choiceFill(
                unitChoiceHoleId(
                  originFeatUnitId,
                  "origin_feat_magic_initiate_level_one_spell_choice",
                ),
                input.magicInitiate.levelOneSpell,
              ),
              choiceFill(
                unitChoiceHoleId(
                  originFeatUnitId,
                  "origin_feat_magic_initiate_spellcasting_ability_choice",
                ),
                input.magicInitiate.ability,
              ),
            ],
          }),
        );
  const afterChoices = requireAcceptedBatch(
    fillCreationHoles({
      draft: afterOriginFeatChoices,
      unitLibrary,
      expectedRevision: afterOriginFeatChoices.revision,
      fills: [
        choiceFill(
          unitChoiceHoleId("class_fighter", "class_skill_proficiency_choice"),
          "perception",
          "survival",
        ),
        choiceFill(
          unitChoiceHoleId(
            "fighter_fighting_style",
            "class_feature_feat_choice",
          ),
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
          unitChoiceHoleId(
            input.backgroundUnitId,
            "background_equipment_choice",
          ),
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
  const parsedUnitId = unitChoiceSourceUnitId(authoredUnitId(unitId));
  if (Result.isFailure(parsedUnitId)) {
    throw new Error(`Invalid unit choice source Unit id ${unitId}.`);
  }
  return unitChoiceSourceHoleIdText({
    tag: "unitChoice",
    unitId: parsedUnitId.success,
    choiceKey,
  });
}

function loadoutHoleId(
  equipmentUnitId: string,
  slot: LoadoutSlot,
): CreationHoleIdText {
  const parsedEquipmentUnitId = loadoutEquipmentUnitId(
    authoredUnitId(equipmentUnitId),
  );
  if (Result.isFailure(parsedEquipmentUnitId)) {
    throw new Error(`Invalid loadout equipment Unit id ${equipmentUnitId}.`);
  }
  return loadoutSourceHoleIdText({
    tag: "loadout",
    equipmentUnitId: parsedEquipmentUnitId.success,
    slot,
  });
}

function normalizeOriginFeatSelectedIdentityQuintState(
  raw: unknown,
): OriginFeatSelectedIdentityProjection {
  const state = recordField(quintStateRecord(raw), "qState");
  return {
    outcome: outcomeField(state["outcome"]),
    originFeatUnitId: originFeatUnitIdField(state["originFeatUnitId"]),
    backgroundUnitId: backgroundUnitIdField(state["backgroundUnitId"]),
    initiativeScore: numberFromQuintInt(
      state["initiativeScore"],
      "qState.initiativeScore",
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

const qntOutcomeByVariant = {
  CharacterBattleOriginFeatSelectedIdentityInit: "init",
  CharacterBattleOriginFeatSelectedIdentityCriminalAlertOriginFeat:
    "criminal-alert-origin-feat",
  CharacterBattleOriginFeatSelectedIdentityAlertInitiativeHandoff:
    "alert-initiative-handoff",
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

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint origin feat selected identity state.");
  }
  return Object.fromEntries(Object.entries(raw));
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

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}
