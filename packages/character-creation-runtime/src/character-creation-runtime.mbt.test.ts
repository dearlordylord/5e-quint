// KERNEL-COVERAGE: parity-witness CREATION.DRAFT.FILL_BATCH_SLICE_REPLAY
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { describe, expect, it } from "vitest";
import { Either } from "effect";
import { z } from "zod";

import {
  characterDraftId,
  createCharacterDraft,
  CREATION_BATCH_ISSUE_CODES,
  CREATION_FILL_ISSUE_CODES,
  abilityScoreAssignment,
  creationChoiceOptionId,
  creationHoleId,
  discoverCreationHoles,
  draftRevision,
  fillCreationHoles,
  finalizeCharacterDraft,
  computeTotalLevel,
  loadoutEquipmentUnitId,
  loadoutSourceHoleIdText,
  startingClassUnitId,
  type CharacterDraft,
  type CreationBatchIssueCode,
  type CreationBatchFillResult,
  type CreationFill,
  type CreationFillIssueCode,
  type CreationHole,
  type DraftRevision,
} from "./index.ts";
import { qntLoadoutSlot } from "./qnt-loadout-bridge.test-support.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});

if (unitCatalogResult.tag !== "ok") {
  throw new Error("SRD Unit catalog MBT fixture must build successfully.");
}

const unitLibrary = unitCatalogResult.catalog;

function loadoutEquipmentUnitIdRight(value: string) {
  const result = loadoutEquipmentUnitId(value);
  if (Either.isLeft(result)) {
    throw new Error(`Invalid MBT loadout equipment Unit id: ${value}`);
  }
  return result.right;
}

type DraftProjection = {
  readonly revision: number;
  readonly progression: ProgressionSelectionProjection;
  readonly background: boolean;
  readonly species: boolean;
  readonly abilityScores: boolean;
  readonly languages: boolean;
  readonly alignment: boolean;
  readonly classSkills: boolean;
  readonly fighterFightingStyle: boolean;
  readonly fighterWeaponMastery: boolean;
  readonly backgroundAbilityScoreIncrease: boolean;
  readonly backgroundTool: boolean;
  readonly classEquipment: boolean;
  readonly backgroundEquipment: boolean;
  readonly equipmentPurchase: boolean;
  readonly loadoutArmor: boolean;
  readonly loadoutShield: boolean;
  readonly loadoutWeapon: boolean;
};
type ProgressionSelectionProjection =
  | "NoProgression"
  | "FighterLevel1"
  | "FighterLevel2"
  | "WizardLevel1";

type RuntimeMbtState = {
  readonly draft: DraftProjection;
  readonly holes: readonly HoleVariant[];
  readonly finalization: "ready" | "incomplete" | "invalid";
  readonly lastResult: "init" | "accepted" | "rejected";
  readonly lastBatchIssueCodes: readonly CreationBatchIssueCode[];
  readonly lastFillIssues: readonly FillIssueProjection[];
};

type FillIssueProjection = {
  readonly fillIndex: number;
  readonly hole: HoleVariant;
  readonly code: CreationFillIssueCode;
};

type HoleVariant = keyof typeof holeIds;

const quintDraftSchema = z.object({
  revision: z.bigint(),
  progression: z.unknown().transform((value) => {
    const progression = variantToString(value);
    if (
      progression === "NoProgression" ||
      progression === "FighterLevel1" ||
      progression === "FighterLevel2" ||
      progression === "WizardLevel1"
    ) {
      return progression;
    }

    throw new Error(`Unknown Quint progression variant: ${progression}`);
  }),
  background: z.boolean(),
  species: z.boolean(),
  abilityScores: z.boolean(),
  languages: z.boolean(),
  alignment: z.boolean(),
  classSkills: z.boolean(),
  fighterFightingStyle: z.boolean(),
  fighterWeaponMastery: z.boolean(),
  backgroundAbilityScoreIncrease: z.boolean(),
  backgroundTool: z.boolean(),
  classEquipment: z.boolean(),
  backgroundEquipment: z.boolean(),
  equipmentPurchase: z.boolean(),
  loadoutArmor: z.boolean(),
  loadoutShield: z.boolean(),
  loadoutWeapon: z.boolean(),
});

const quintStateSchema = z.object({
  qDraft: quintDraftSchema,
  qHoles: z.unknown(),
  qFinalization: z.unknown(),
  qLastResult: z.union([
    z.literal("init"),
    z.literal("accepted"),
    z.literal("rejected"),
  ]),
  qLastBatchIssueCodes: z.unknown(),
  qLastFillIssues: z.unknown(),
});

function normalizeQuintState(raw: unknown): RuntimeMbtState {
  const parsed = quintStateSchema.parse(raw);
  return {
    draft: {
      ...parsed.qDraft,
      revision: Number(parsed.qDraft.revision),
    },
    holes: normalizeHoleSet(parsed.qHoles),
    finalization: normalizeFinalization(parsed.qFinalization),
    lastResult: parsed.qLastResult,
    lastBatchIssueCodes: normalizeBatchIssueCodeSet(
      parsed.qLastBatchIssueCodes,
    ),
    lastFillIssues: normalizeFillIssueSet(parsed.qLastFillIssues),
  };
}

function normalizeHoleSet(raw: unknown): readonly HoleVariant[] {
  if (!(raw instanceof Set)) {
    throw new Error(`Expected Quint hole Set, received ${String(raw)}`);
  }

  return [...raw].map(holeVariantFromQuint).sort();
}

const creationBatchIssueCodeSchema = z.enum(CREATION_BATCH_ISSUE_CODES);
const creationFillIssueCodeSchema = z.enum(CREATION_FILL_ISSUE_CODES);

function normalizeBatchIssueCodeSet(
  raw: unknown,
): readonly CreationBatchIssueCode[] {
  if (!(raw instanceof Set)) {
    throw new Error(`Expected Quint batch issue Set, received ${String(raw)}`);
  }

  return [...raw]
    .map((code) => creationBatchIssueCodeSchema.parse(code))
    .sort();
}

const quintFillIssueProjectionSchema = z.object({
  fillIndex: z.bigint(),
  hole: z.unknown(),
  code: z.string(),
});

function normalizeFillIssueSet(raw: unknown): readonly FillIssueProjection[] {
  if (!(raw instanceof Set)) {
    throw new Error(`Expected Quint fill issue Set, received ${String(raw)}`);
  }

  return [...raw]
    .map((issue) => {
      const parsed = quintFillIssueProjectionSchema.parse(issue);
      return {
        fillIndex: Number(parsed.fillIndex),
        hole: holeVariantFromQuint(parsed.hole),
        code: creationFillIssueCodeSchema.parse(parsed.code),
      };
    })
    .sort(compareFillIssueProjections);
}

function compareFillIssueProjections(
  left: FillIssueProjection,
  right: FillIssueProjection,
): number {
  return (
    left.fillIndex - right.fillIndex ||
    left.hole.localeCompare(right.hole) ||
    left.code.localeCompare(right.code)
  );
}

function variantToString(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && value !== null && "tag" in value) {
    return String((value as { readonly tag: unknown }).tag);
  }

  throw new Error(
    `Expected Quint variant or string, received ${String(value)}`,
  );
}

function normalizeFinalization(raw: unknown): RuntimeMbtState["finalization"] {
  const tag = variantToString(raw);
  if (tag === "Ready") {
    return "ready";
  }
  if (tag === "Incomplete") {
    return "incomplete";
  }
  if (tag === "Invalid") {
    return "invalid";
  }
  throw new Error(`Unknown Quint finalization status: ${tag}`);
}

function compareState(spec: RuntimeMbtState, impl: RuntimeMbtState): boolean {
  expect(impl).toEqual(spec);
  return true;
}

const holeIds = {
  HProgression: "cc:draft:draft.progression.initial",
  HBackground: "cc:draft:draft.background",
  HSpecies: "cc:draft:draft.species",
  HAbilityScores: "cc:draft:draft.abilityScoreGeneration",
  HLanguages: "cc:draft:draft.languages",
  HAlignment: "cc:draft:draft.alignment",
  HClassSkills:
    "cc:unit-source:u:13:class_fighter:c:class_skill_proficiency_choice",
  HFighterFightingStyle:
    "cc:unit-source:u:22:fighter_fighting_style:c:class_feature_feat_choice",
  HFighterWeaponMastery:
    "cc:unit-source:u:22:fighter_weapon_mastery:c:weapon_mastery_options",
  HBackgroundAbilityScoreIncrease:
    "cc:unit-source:u:18:background_soldier:c:background_ability_score_increase",
  HBackgroundTool:
    "cc:unit-source:u:18:background_soldier:c:background_tool_choice",
  HClassEquipment: "cc:unit-source:u:13:class_fighter:c:class_equipment_choice",
  HBackgroundEquipment:
    "cc:unit-source:u:18:background_soldier:c:background_equipment_choice",
  HEquipmentPurchase: "cc:unit-source:u:13:class_fighter:c:equipment_purchase",
  HLoadoutArmor: "cc:loadout-source:e:16:armor_chain_mail:s:armor",
  HLoadoutShield: "cc:loadout-source:e:16:equipment_shield:s:shield",
  HLoadoutWeapon: "cc:loadout-source:e:16:weapon_longsword:s:weapon",
} as const;

assertUniqueHoleIds(holeIds);

function assertUniqueHoleIds(ids: Readonly<Record<HoleVariant, string>>): void {
  const values = Object.values(ids);
  if (new Set(values).size !== values.length) {
    throw new Error("Character creation MBT hole id table must be one-to-one.");
  }
}

function holeVariantFromQuint(raw: unknown): HoleVariant {
  const tag = variantToString(raw);
  if (tag in holeIds) {
    return tag as HoleVariant;
  }

  throw new Error(`Unknown Quint creation hole variant: ${tag}`);
}

function choiceFill(
  holes: readonly CreationHole[],
  hole: keyof typeof holeIds,
  optionIds: readonly string[],
): CreationFill {
  return {
    kind: "choice",
    holeId: discoveredHoleId(holes, hole),
    optionIds: optionIds.map(creationChoiceOptionId),
  };
}

function standardArrayFill(
  holes: readonly CreationHole[],
  hole: keyof typeof holeIds,
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
    throw new Error("Standard Array MBT fixture must parse.");
  }

  return {
    kind: "abilityScores",
    holeId: discoveredHoleId(holes, hole),
    method: "standardArray",
    value: scores.right,
  };
}

function initialManifestFills(
  holes: readonly CreationHole[],
): readonly CreationFill[] {
  return [
    choiceFill(holes, "HProgression", [
      "13:class_fighter:level_1:maximum_hit_die",
    ]),
    choiceFill(holes, "HBackground", ["background_soldier"]),
    choiceFill(holes, "HSpecies", ["species_orc"]),
    standardArrayFill(holes, "HAbilityScores"),
    choiceFill(holes, "HLanguages", ["Dwarvish", "Goblin"]),
    choiceFill(holes, "HAlignment", ["lawful_good"]),
  ];
}

function initialChoicesOnlyFills(
  holes: readonly CreationHole[],
): readonly CreationFill[] {
  return [
    choiceFill(holes, "HProgression", [
      "13:class_fighter:level_1:maximum_hit_die",
    ]),
    choiceFill(holes, "HBackground", ["background_soldier"]),
    choiceFill(holes, "HSpecies", ["species_orc"]),
    choiceFill(holes, "HLanguages", ["Dwarvish", "Goblin"]),
    choiceFill(holes, "HAlignment", ["lawful_good"]),
  ];
}

function abilityScoresOnlyFills(
  holes: readonly CreationHole[],
): readonly CreationFill[] {
  return [standardArrayFill(holes, "HAbilityScores")];
}

function manifestChoiceFills(
  holes: readonly CreationHole[],
): readonly CreationFill[] {
  return [
    choiceFill(holes, "HClassSkills", ["perception", "survival"]),
    choiceFill(holes, "HFighterFightingStyle", ["defense"]),
    choiceFill(holes, "HFighterWeaponMastery", [
      "weapon_longsword",
      "weapon_spear",
      "weapon_flail",
    ]),
    choiceFill(holes, "HBackgroundAbilityScoreIncrease", [
      "two_and_one:str:con",
    ]),
    choiceFill(holes, "HBackgroundTool", ["tool_dice_set"]),
    choiceFill(holes, "HClassEquipment", ["option_c"]),
    choiceFill(holes, "HBackgroundEquipment", ["option_b"]),
  ];
}

function manifestPurchaseFills(
  holes: readonly CreationHole[],
): readonly CreationFill[] {
  return [
    choiceFill(holes, "HEquipmentPurchase", [
      "armor_chain_mail",
      "weapon_longsword",
      "equipment_shield",
    ]),
  ];
}

function manifestLoadoutFills(
  holes: readonly CreationHole[],
): readonly CreationFill[] {
  return [
    choiceFill(holes, "HLoadoutArmor", ["worn"]),
    choiceFill(holes, "HLoadoutShield", ["wielded"]),
    choiceFill(holes, "HLoadoutWeapon", ["wielded_one_handed"]),
  ];
}

const driverSchema = {
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
  doRejectTooFewLanguages: {},
  doRejectTooManyLanguages: {},
  doRejectWrongKindPrimaryClass: {},
  doRejectUnknownLoadoutArmor: {},
  doRejectUnsupportedClassEquipment: {},
  step: {},
} as const;

function createCharacterCreationDriver() {
  return defineDriver(driverSchema, () => {
    let draft = newDraft();
    let holes: readonly CreationHole[] = [];
    let finalization = finalizeCharacterDraft({ draft, unitLibrary });
    let lastResult: RuntimeMbtState["lastResult"] = "init";
    let lastBatchIssueCodes: readonly CreationBatchIssueCode[] = [];
    let lastFillIssues: readonly FillIssueProjection[] = [];

    function reset(): void {
      draft = newDraft();
      holes = discoverCreationHoles({ draft, unitLibrary });
      finalization = finalizeCharacterDraft({ draft, unitLibrary });
      lastResult = "init";
      lastBatchIssueCodes = [];
      lastFillIssues = [];
    }

    function submit(
      expectedRevision: DraftRevision,
      fills: readonly CreationFill[],
    ): void {
      const result = fillCreationHoles({
        draft,
        fills,
        expectedRevision,
        unitLibrary,
      });
      draft = result.draft;
      holes = result.holes;
      finalization = result.finalization;
      lastResult = result.tag;
      lastBatchIssueCodes = batchIssueCodes(result);
      lastFillIssues = fillIssues(result);
    }

    return {
      init: reset,
      doFillInitialManifest: () =>
        submit(draft.revision, initialManifestFills(holes)),
      doFillInitialChoicesOnly: () =>
        submit(draft.revision, initialChoicesOnlyFills(holes)),
      doFillAbilityScoresOnly: () =>
        submit(draft.revision, abilityScoresOnlyFills(holes)),
      doFillManifestChoices: () =>
        submit(draft.revision, manifestChoiceFills(holes)),
      doFillManifestPurchase: () =>
        submit(draft.revision, manifestPurchaseFills(holes)),
      doFillManifestLoadout: () =>
        submit(draft.revision, manifestLoadoutFills(holes)),
      doRejectStaleInitialManifest: () =>
        submit(draftRevision(999), initialManifestFills(holes)),
      doRejectUnsupportedLanguage: () =>
        submit(draft.revision, [
          choiceFill(holes, "HLanguages", ["Dwarvish", "Elvish"]),
        ]),
      doRejectDuplicateLanguage: () =>
        submit(draft.revision, [
          choiceFill(holes, "HLanguages", ["Dwarvish", "Dwarvish"]),
        ]),
      doRejectTooFewLanguages: () =>
        submit(draft.revision, [choiceFill(holes, "HLanguages", ["Dwarvish"])]),
      doRejectTooManyLanguages: () =>
        submit(draft.revision, [
          choiceFill(holes, "HLanguages", ["Dwarvish", "Goblin", "Elvish"]),
        ]),
      doRejectWrongKindPrimaryClass: () =>
        submit(draft.revision, [standardArrayFill(holes, "HProgression")]),
      doRejectUnknownLoadoutArmor: () =>
        submit(draft.revision, [
          choiceFillForKnownProtocolHole("HLoadoutArmor", ["worn"]),
        ]),
      doRejectUnsupportedClassEquipment: () =>
        submit(draft.revision, [
          choiceFill(holes, "HClassEquipment", ["option_a"]),
        ]),
      step: () => {},
      getState: () => ({
        draft: projectDraft(draft),
        holes: holes
          .map((hole) => holeVariantForId(String(hole.holeId)))
          .sort(),
        finalization: finalization.tag,
        lastResult,
        lastBatchIssueCodes,
        lastFillIssues,
      }),
    };
  });
}

function newDraft(): CharacterDraft {
  return createCharacterDraft({
    draftId: characterDraftId("cc:mbt-draft"),
  });
}

function discoveredHoleId(
  holes: readonly CreationHole[],
  hole: keyof typeof holeIds,
): CreationHole["holeId"] {
  const holeId = holeIds[hole];
  const discovered = holes.find((candidate) => candidate.holeId === holeId);
  if (discovered == null) {
    throw new Error(`Expected open creation hole ${hole} (${holeId}).`);
  }

  return discovered.holeId;
}

function choiceFillForKnownProtocolHole(
  hole: keyof typeof holeIds,
  optionIds: readonly string[],
): CreationFill {
  if (hole !== "HLoadoutArmor") {
    throw new Error(`No known-future hole constructor for ${hole}.`);
  }

  return {
    kind: "choice",
    // This rejection case intentionally targets a valid protocol hole before
    // it is open, so it cannot derive the id from current hole discovery.
    holeId: creationHoleId(
      loadoutSourceHoleIdText({
        tag: "loadout",
        equipmentUnitId: loadoutEquipmentUnitIdRight("armor_chain_mail"),
        slot: "armor",
      }),
    ),
    optionIds: optionIds.map(creationChoiceOptionId),
  };
}

function batchIssueCodes(
  result: CreationBatchFillResult,
): readonly CreationBatchIssueCode[] {
  return result.tag === "accepted"
    ? []
    : result.issues
        .filter((issue) => issue.tag === "illegalBatch")
        .map((issue) => issue.code)
        .sort();
}

function fillIssues(
  result: CreationBatchFillResult,
): readonly FillIssueProjection[] {
  return result.tag === "accepted"
    ? []
    : result.issues
        .filter((issue) => issue.tag === "illegalFill")
        .map((issue) => ({
          fillIndex: issue.fillIndex,
          hole: holeVariantForId(String(issue.holeId)),
          code: issue.code,
        }))
        .sort(compareFillIssueProjections);
}

function projectDraft(draft: CharacterDraft): DraftProjection {
  const selections = draft.selections;
  return {
    revision: draft.revision,
    progression: projectProgression(selections.progression),
    background: selections.background != null,
    species: selections.species != null,
    abilityScores: selections.abilityScoreGeneration != null,
    languages: selections.languages != null,
    alignment: selections.alignment != null,
    classSkills: hasChoice(
      selections.choices,
      "class_skill_proficiency_choice",
    ),
    fighterFightingStyle: hasChoice(
      selections.choices,
      "class_feature_feat_choice",
    ),
    fighterWeaponMastery: hasChoice(
      selections.choices,
      "weapon_mastery_options",
    ),
    backgroundAbilityScoreIncrease:
      selections.backgroundAbilityScoreIncrease != null,
    backgroundTool: hasChoice(selections.choices, "background_tool_choice"),
    classEquipment: hasChoice(selections.choices, "class_equipment_choice"),
    backgroundEquipment: hasChoice(
      selections.choices,
      "background_equipment_choice",
    ),
    equipmentPurchase: selections.equipment != null,
    loadoutArmor: hasChoice(selections.choices, "loadout_armor"),
    loadoutShield: hasChoice(selections.choices, "loadout_shield"),
    loadoutWeapon: hasChoice(selections.choices, "loadout_weapon"),
  };
}

function projectProgression(
  progression: CharacterDraft["selections"]["progression"],
): ProgressionSelectionProjection {
  if (progression == null) {
    return "NoProgression";
  }

  if (startingClassUnitId(progression) === "class_wizard") {
    return "WizardLevel1";
  }

  return computeTotalLevel(progression) === 1
    ? "FighterLevel1"
    : "FighterLevel2";
}

function hasChoice(
  choices: CharacterDraft["selections"]["choices"],
  choiceKey: string,
): boolean {
  const loadoutSlot = qntLoadoutSlot(choiceKey);
  return choices.some(
    (choice) =>
      (choice.kind === "unitChoice" &&
        String(choice.source.choiceKey) === choiceKey) ||
      (choice.kind === "loadout" && choice.source.slot === loadoutSlot),
  );
}

function holeVariantForId(holeId: string): HoleVariant {
  const entry = Object.entries(holeIds).find(([, id]) => id === holeId);
  if (entry == null) {
    throw new Error(`Unmapped creation hole id in MBT: ${holeId}`);
  }

  return entry[0] as HoleVariant;
}

const runtimeStateCheck = stateCheck(normalizeQuintState, compareState);

describe("Character creation runtime MBT", () => {
  it("replays character creation fill traces against the runtime reducer", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-creation-runtime.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createCharacterCreationDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 16),
      stateCheck: runtimeStateCheck,
    });
  }, 120_000);
});
