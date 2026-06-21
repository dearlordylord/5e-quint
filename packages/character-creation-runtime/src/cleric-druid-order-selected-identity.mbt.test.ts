// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1D2-CLERIC-DRUID-ORDER cleric_divine_order druid_primal_order
// UNIT-IDENTITY-MBT-REPLAY: L1D2-CLERIC-DRUID-ORDER cleric_divine_order doSelectClericProtectorOrder doSelectClericThaumaturgeOrder
// UNIT-IDENTITY-MBT-REPLAY: L1D2-CLERIC-DRUID-ORDER druid_primal_order doSelectDruidMagicianOrder doSelectDruidWardenOrder
// KERNEL-COVERAGE: parity-witness CREATION.CLASS_FEATURE_OPTION.PROJECTION
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
  characterBuildArmorTraining,
  characterBuildProficiencies,
  characterBuildUnitRefs,
  characterDraftId,
  choiceCardinalityBounds,
  classUnitId,
  computeTotalLevel,
  createCharacterDraft,
  creationChoiceOptionId,
  discoverCreationHoles,
  fillCreationHoles,
  finalizeCharacterDraft,
  progressionOptionId,
  unitChoiceKey,
  unitChoiceSourceKey,
  unitChoiceSourceUnitId,
  type CharacterBuild,
  type CharacterBuildFeature,
  type CharacterDraft,
  type CharacterProgression,
  type CreationBatchFillResult,
  type CreationChoiceOptionId,
  type CreationFill,
  type CreationHole,
  type UnitChoiceKey,
} from "./index.ts";
import {
  CLASS_CANTRIP_CHOICE_KEY,
  DIVINE_ORDER_CHOICE_KEY,
  PRIMAL_ORDER_CHOICE_KEY,
} from "./phase1-manifest.ts";
import { supportedHoleOptionIds } from "./support-gates.ts";
import { soldierBackgroundFixtureOptionIds } from "./background-fixture.test-support.ts";

const CLERIC_CLASS_UNIT_ID = "class_cleric";
const DRUID_CLASS_UNIT_ID = "class_druid";
const CLERIC_DIVINE_ORDER_UNIT_ID = "cleric_divine_order";
const DRUID_PRIMAL_ORDER_UNIT_ID = "druid_primal_order";
const PROTECTOR_OPTION_ID = "protector";
const THAUMATURGE_OPTION_ID = "thaumaturge";
const MAGICIAN_OPTION_ID = "magician";
const WARDEN_OPTION_ID = "warden";
const LIGHT_CANTRIP_UNIT_ID = "light";
const GUIDANCE_CANTRIP_UNIT_ID = "guidance";

const ORDER_ABILITY_CHECK_BONUS_KINDS = [
  "none",
  "int_arcana_religion_wis_min1",
  "int_arcana_nature_wis_min1",
] as const;
type OrderAbilityCheckBonusKind =
  (typeof ORDER_ABILITY_CHECK_BONUS_KINDS)[number];

type ChoiceCreationHole = Extract<CreationHole, { readonly kind: "choice" }>;
type AbilityCheckBonusFeature = Extract<
  CharacterBuildFeature,
  { readonly kind: "abilityCheckBonus" }
>;
type OrderDriverAction = Exclude<
  keyof typeof clericDruidOrderSelectedIdentityDriverSchema,
  "init" | "step"
>;
type ClericOrderProjectionInput = {
  readonly draftId: string;
  readonly classUnitId: typeof CLERIC_CLASS_UNIT_ID;
  readonly orderUnitId: typeof CLERIC_DIVINE_ORDER_UNIT_ID;
  readonly orderChoiceKey: typeof DIVINE_ORDER_CHOICE_KEY;
  readonly selectedOrderOptionId:
    | typeof PROTECTOR_OPTION_ID
    | typeof THAUMATURGE_OPTION_ID;
  readonly extraCantripUnitId: typeof LIGHT_CANTRIP_UNIT_ID | "none";
  readonly outcome: "clericProtector" | "clericThaumaturge";
};
type DruidOrderProjectionInput = {
  readonly draftId: string;
  readonly classUnitId: typeof DRUID_CLASS_UNIT_ID;
  readonly orderUnitId: typeof DRUID_PRIMAL_ORDER_UNIT_ID;
  readonly orderChoiceKey: typeof PRIMAL_ORDER_CHOICE_KEY;
  readonly selectedOrderOptionId:
    | typeof MAGICIAN_OPTION_ID
    | typeof WARDEN_OPTION_ID;
  readonly extraCantripUnitId: typeof GUIDANCE_CANTRIP_UNIT_ID | "none";
  readonly outcome: "druidMagician" | "druidWarden";
};
type OrderProjectionInput =
  | ClericOrderProjectionInput
  | DruidOrderProjectionInput;
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly OrderDriverAction[];
  readonly expected: ClericDruidOrderSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "L1D2-CLERIC-DRUID-ORDER";
  readonly unitId:
    | typeof CLERIC_DIVINE_ORDER_UNIT_ID
    | typeof DRUID_PRIMAL_ORDER_UNIT_ID;
  readonly actions: readonly OrderDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const clericDruidOrderSelectedIdentityDriverSchema = {
  init: {},
  doSelectClericProtectorOrder: {},
  doSelectClericThaumaturgeOrder: {},
  doSelectDruidMagicianOrder: {},
  doSelectDruidWardenOrder: {},
  step: {},
} as const;

const orderProjectionBaseSchema = {
  selectedOrderOptionCount: z.literal(1),
  selectedSuborderClassChoiceFeatureCount: z.literal(0),
  orderUnitRefPresent: z.literal(true),
  totalLevel: z.literal(1),
} as const;
const clericDruidOrderSelectedIdentityProjectionSchema = z.discriminatedUnion(
  "outcome",
  [
    z.object({
      outcome: z.literal("init"),
      selectedOrderUnitId: z.literal("none"),
      selectedOrderOptionId: z.literal("none"),
      extraCantripUnitId: z.literal("none"),
      selectedOrderOptionCount: z.literal(0),
      selectedSuborderClassChoiceFeatureCount: z.literal(0),
      orderUnitRefPresent: z.literal(false),
      extraCantripUnitRefPresent: z.literal(false),
      martialWeaponProficiencyPresent: z.literal(false),
      heavyArmorTrainingPresent: z.literal(false),
      mediumArmorTrainingPresent: z.literal(false),
      abilityCheckBonusKind: z.literal("none"),
      abilityCheckBonusFeatureCount: z.literal(0),
      totalLevel: z.literal(1),
    }),
    z.object({
      outcome: z.literal("clericProtector"),
      selectedOrderUnitId: z.literal(CLERIC_DIVINE_ORDER_UNIT_ID),
      selectedOrderOptionId: z.literal(PROTECTOR_OPTION_ID),
      extraCantripUnitId: z.literal("none"),
      ...orderProjectionBaseSchema,
      extraCantripUnitRefPresent: z.literal(false),
      martialWeaponProficiencyPresent: z.literal(true),
      heavyArmorTrainingPresent: z.literal(true),
      mediumArmorTrainingPresent: z.literal(true),
      abilityCheckBonusKind: z.literal("none"),
      abilityCheckBonusFeatureCount: z.literal(0),
    }),
    z.object({
      outcome: z.literal("clericThaumaturge"),
      selectedOrderUnitId: z.literal(CLERIC_DIVINE_ORDER_UNIT_ID),
      selectedOrderOptionId: z.literal(THAUMATURGE_OPTION_ID),
      extraCantripUnitId: z.literal(LIGHT_CANTRIP_UNIT_ID),
      ...orderProjectionBaseSchema,
      extraCantripUnitRefPresent: z.literal(true),
      martialWeaponProficiencyPresent: z.literal(false),
      heavyArmorTrainingPresent: z.literal(false),
      mediumArmorTrainingPresent: z.literal(true),
      abilityCheckBonusKind: z.literal("int_arcana_religion_wis_min1"),
      abilityCheckBonusFeatureCount: z.literal(1),
    }),
    z.object({
      outcome: z.literal("druidMagician"),
      selectedOrderUnitId: z.literal(DRUID_PRIMAL_ORDER_UNIT_ID),
      selectedOrderOptionId: z.literal(MAGICIAN_OPTION_ID),
      extraCantripUnitId: z.literal(GUIDANCE_CANTRIP_UNIT_ID),
      ...orderProjectionBaseSchema,
      extraCantripUnitRefPresent: z.literal(true),
      martialWeaponProficiencyPresent: z.literal(false),
      heavyArmorTrainingPresent: z.literal(false),
      mediumArmorTrainingPresent: z.literal(false),
      abilityCheckBonusKind: z.literal("int_arcana_nature_wis_min1"),
      abilityCheckBonusFeatureCount: z.literal(1),
    }),
    z.object({
      outcome: z.literal("druidWarden"),
      selectedOrderUnitId: z.literal(DRUID_PRIMAL_ORDER_UNIT_ID),
      selectedOrderOptionId: z.literal(WARDEN_OPTION_ID),
      extraCantripUnitId: z.literal("none"),
      ...orderProjectionBaseSchema,
      extraCantripUnitRefPresent: z.literal(false),
      martialWeaponProficiencyPresent: z.literal(true),
      heavyArmorTrainingPresent: z.literal(false),
      mediumArmorTrainingPresent: z.literal(true),
      abilityCheckBonusKind: z.literal("none"),
      abilityCheckBonusFeatureCount: z.literal(0),
    }),
  ],
);
type ClericDruidOrderSelectedIdentityProjection = z.infer<
  typeof clericDruidOrderSelectedIdentityProjectionSchema
>;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Character Creation Cleric and Druid Order selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "L1D2-CLERIC-DRUID-ORDER",
    unitId: "cleric_divine_order",
    actions: ["doSelectClericProtectorOrder", "doSelectClericThaumaturgeOrder"],
    sequences: [
      {
        name: "cleric-one-finalizes-protector-divine-order",
        actions: ["doSelectClericProtectorOrder"],
        expected: clericProtectorProjection(),
      },
      {
        name: "cleric-one-finalizes-thaumaturge-divine-order",
        actions: ["doSelectClericThaumaturgeOrder"],
        expected: clericThaumaturgeProjection(),
      },
    ],
  },
  {
    taskId: "L1D2-CLERIC-DRUID-ORDER",
    unitId: "druid_primal_order",
    actions: ["doSelectDruidMagicianOrder", "doSelectDruidWardenOrder"],
    sequences: [
      {
        name: "druid-one-finalizes-magician-primal-order",
        actions: ["doSelectDruidMagicianOrder"],
        expected: druidMagicianProjection(),
      },
      {
        name: "druid-one-finalizes-warden-primal-order",
        actions: ["doSelectDruidWardenOrder"],
        expected: druidWardenProjection(),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

const quintStateSchema = z.object({
  outcome: z.unknown().transform(outcomeField),
  selectedOrderUnitId: z.union([
    z.literal("none"),
    z.literal(CLERIC_DIVINE_ORDER_UNIT_ID),
    z.literal(DRUID_PRIMAL_ORDER_UNIT_ID),
  ]),
  selectedOrderOptionId: z.union([
    z.literal("none"),
    z.literal(PROTECTOR_OPTION_ID),
    z.literal(THAUMATURGE_OPTION_ID),
    z.literal(MAGICIAN_OPTION_ID),
    z.literal(WARDEN_OPTION_ID),
  ]),
  extraCantripUnitId: z.union([
    z.literal("none"),
    z.literal(LIGHT_CANTRIP_UNIT_ID),
    z.literal(GUIDANCE_CANTRIP_UNIT_ID),
  ]),
  selectedOrderOptionCount: z.bigint(),
  selectedSuborderClassChoiceFeatureCount: z.bigint(),
  orderUnitRefPresent: z.boolean(),
  extraCantripUnitRefPresent: z.boolean(),
  martialWeaponProficiencyPresent: z.boolean(),
  heavyArmorTrainingPresent: z.boolean(),
  mediumArmorTrainingPresent: z.boolean(),
  abilityCheckBonusKind: z.enum(ORDER_ABILITY_CHECK_BONUS_KINDS),
  abilityCheckBonusFeatureCount: z.bigint(),
  totalLevel: z.bigint(),
});

const qntOutcomeByVariant = {
  CharacterCreationClericDruidOrderSelectedIdentityInit: "init",
  CharacterCreationClericDruidOrderSelectedIdentityClericProtector:
    "clericProtector",
  CharacterCreationClericDruidOrderSelectedIdentityClericThaumaturge:
    "clericThaumaturge",
  CharacterCreationClericDruidOrderSelectedIdentityDruidMagician:
    "druidMagician",
  CharacterCreationClericDruidOrderSelectedIdentityDruidWarden: "druidWarden",
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

describe("Character Creation Cleric and Druid Order selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<OrderDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createClericDruidOrderSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Character Creation Cleric and Druid Order selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Character Creation Cleric and Druid Order selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Character Creation Cleric and Druid Order selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../character-creation-cleric-druid-order-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createClericDruidOrderSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: clericDruidOrderSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createClericDruidOrderSelectedIdentityDriver() {
  return defineDriver(clericDruidOrderSelectedIdentityDriverSchema, () => {
    let projection: ClericDruidOrderSelectedIdentityProjection =
      initialProjection();

    function reset(): void {
      projection = initialProjection();
    }

    return {
      init: reset,
      doSelectClericProtectorOrder: () => {
        projection = clericProtectorProjection();
      },
      doSelectClericThaumaturgeOrder: () => {
        projection = clericThaumaturgeProjection();
      },
      doSelectDruidMagicianOrder: () => {
        projection = druidMagicianProjection();
      },
      doSelectDruidWardenOrder: () => {
        projection = druidWardenProjection();
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function initialProjection(): Extract<
  ClericDruidOrderSelectedIdentityProjection,
  { readonly outcome: "init" }
> {
  return {
    outcome: "init",
    selectedOrderUnitId: "none",
    selectedOrderOptionId: "none",
    extraCantripUnitId: "none",
    selectedOrderOptionCount: 0,
    selectedSuborderClassChoiceFeatureCount: 0,
    orderUnitRefPresent: false,
    extraCantripUnitRefPresent: false,
    martialWeaponProficiencyPresent: false,
    heavyArmorTrainingPresent: false,
    mediumArmorTrainingPresent: false,
    abilityCheckBonusKind: "none",
    abilityCheckBonusFeatureCount: 0,
    totalLevel: 1,
  };
}

function clericProtectorProjection(): ClericDruidOrderSelectedIdentityProjection {
  return orderProjection({
    draftId: "cleric-divine-order-selected-identity-protector",
    classUnitId: CLERIC_CLASS_UNIT_ID,
    orderUnitId: CLERIC_DIVINE_ORDER_UNIT_ID,
    orderChoiceKey: DIVINE_ORDER_CHOICE_KEY,
    selectedOrderOptionId: PROTECTOR_OPTION_ID,
    extraCantripUnitId: "none",
    outcome: "clericProtector",
  });
}

function clericThaumaturgeProjection(): ClericDruidOrderSelectedIdentityProjection {
  return orderProjection({
    draftId: "cleric-divine-order-selected-identity-thaumaturge",
    classUnitId: CLERIC_CLASS_UNIT_ID,
    orderUnitId: CLERIC_DIVINE_ORDER_UNIT_ID,
    orderChoiceKey: DIVINE_ORDER_CHOICE_KEY,
    selectedOrderOptionId: THAUMATURGE_OPTION_ID,
    extraCantripUnitId: LIGHT_CANTRIP_UNIT_ID,
    outcome: "clericThaumaturge",
  });
}

function druidMagicianProjection(): ClericDruidOrderSelectedIdentityProjection {
  return orderProjection({
    draftId: "druid-primal-order-selected-identity-magician",
    classUnitId: DRUID_CLASS_UNIT_ID,
    orderUnitId: DRUID_PRIMAL_ORDER_UNIT_ID,
    orderChoiceKey: PRIMAL_ORDER_CHOICE_KEY,
    selectedOrderOptionId: MAGICIAN_OPTION_ID,
    extraCantripUnitId: GUIDANCE_CANTRIP_UNIT_ID,
    outcome: "druidMagician",
  });
}

function druidWardenProjection(): ClericDruidOrderSelectedIdentityProjection {
  return orderProjection({
    draftId: "druid-primal-order-selected-identity-warden",
    classUnitId: DRUID_CLASS_UNIT_ID,
    orderUnitId: DRUID_PRIMAL_ORDER_UNIT_ID,
    orderChoiceKey: PRIMAL_ORDER_CHOICE_KEY,
    selectedOrderOptionId: WARDEN_OPTION_ID,
    extraCantripUnitId: "none",
    outcome: "druidWarden",
  });
}

function orderProjection(
  input: OrderProjectionInput,
): ClericDruidOrderSelectedIdentityProjection {
  const finalized = finalizedOrderState(input);
  const facts = orderBuildFacts(finalized, input);
  const projection = {
    outcome: input.outcome,
    selectedOrderUnitId: input.orderUnitId,
    selectedOrderOptionId: input.selectedOrderOptionId,
    extraCantripUnitId: input.extraCantripUnitId,
    selectedOrderOptionCount: facts.selectedOrderOptionCount,
    selectedSuborderClassChoiceFeatureCount:
      facts.selectedSuborderClassChoiceFeatureCount,
    orderUnitRefPresent: facts.orderUnitRefPresent,
    extraCantripUnitRefPresent: facts.extraCantripUnitRefPresent,
    martialWeaponProficiencyPresent: facts.martialWeaponProficiencyPresent,
    heavyArmorTrainingPresent: facts.heavyArmorTrainingPresent,
    mediumArmorTrainingPresent: facts.mediumArmorTrainingPresent,
    abilityCheckBonusKind: facts.abilityCheckBonusKind,
    abilityCheckBonusFeatureCount: facts.abilityCheckBonusFeatureCount,
    totalLevel: facts.totalLevel,
  };

  return clericDruidOrderSelectedIdentityProjectionSchema.parse(projection);
}

function finalizedOrderState(input: OrderProjectionInput): {
  readonly draft: CharacterDraft;
  readonly build: CharacterBuild;
} {
  const draft = completeOrderDraft(input);
  const finalized = finalizeCharacterDraft({ draft, unitLibrary });
  if (finalized.tag !== "ready") {
    throw new Error(
      `Expected ${input.orderUnitId} selected identity draft to finalize, received ${finalized.tag}.`,
    );
  }

  return { draft, build: finalized.build };
}

function completeOrderDraft(input: OrderProjectionInput): CharacterDraft {
  let draft = createCharacterDraft({
    draftId: characterDraftId(input.draftId),
  });
  const progression = levelOneProgression(input.classUnitId);
  const preferredOptionIdsBySource = preferredOrderOptionIdsBySource(input);
  draft = acceptedBatch(
    fillCreationHoles({
      draft,
      unitLibrary,
      expectedRevision: draft.revision,
      fills: initialOrderFills({
        holes: discoverCreationHoles({ draft, unitLibrary }),
        progression,
        preferredOptionIdsBySource,
      }),
    }),
  ).draft;

  for (let pass = 0; pass < 8; pass += 1) {
    const holes = discoverCreationHoles({ draft, unitLibrary });
    if (holes.length === 0) {
      assertOrderDraftSelections(draft, input);
      return draft;
    }

    draft = acceptedBatch(
      fillCreationHoles({
        draft,
        unitLibrary,
        expectedRevision: draft.revision,
        fills: holes.map((hole) =>
          supportProfileFillForHole(hole, preferredOptionIdsBySource),
        ),
      }),
    ).draft;
  }

  throw new Error(
    `Order selected identity fixture still has holes after iterative fills: ${JSON.stringify(
      discoverCreationHoles({ draft, unitLibrary }),
    )}`,
  );
}

function initialOrderFills(input: {
  readonly holes: readonly CreationHole[];
  readonly progression: CharacterProgression;
  readonly preferredOptionIdsBySource: PreferredOrderOptionIdsBySource;
}): readonly CreationFill[] {
  return input.holes.map((hole) => {
    if (
      hole.kind === "choice" &&
      hole.source.tag === "draft" &&
      hole.source.path === "draft.progression.initial"
    ) {
      return choiceFill(hole, [progressionOptionId(input.progression)]);
    }

    return supportProfileFillForHole(hole, input.preferredOptionIdsBySource);
  });
}

type PreferredOrderOptionIdsBySource = Readonly<
  Record<string, readonly CreationChoiceOptionId[]>
>;

function preferredOrderOptionIdsBySource(
  input: OrderProjectionInput,
): PreferredOrderOptionIdsBySource {
  return {
    [orderChoiceSourceKey(input.orderUnitId, input.orderChoiceKey)]: [
      creationChoiceOptionId(input.selectedOrderOptionId),
    ],
    ...(input.extraCantripUnitId === "none"
      ? {}
      : {
          [orderChoiceSourceKey(input.orderUnitId, CLASS_CANTRIP_CHOICE_KEY)]: [
            creationChoiceOptionId(input.extraCantripUnitId),
          ],
        }),
  };
}

function supportProfileFillForHole(
  hole: CreationHole,
  preferredOptionIdsBySource: PreferredOrderOptionIdsBySource,
): CreationFill {
  if (hole.kind === "abilityScores") {
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
        "Order selected identity Standard Array fixture must parse.",
      );
    }

    return {
      kind: "abilityScores",
      holeId: hole.holeId,
      method: "standardArray",
      value: scores.right,
    };
  }
  const supportedOptionIds = supportedHoleOptionIds(hole);
  if (supportedOptionIds === undefined) {
    throw new Error(
      `No support-profile options for Order selected identity hole ${hole.holeId}.`,
    );
  }
  const supportedOptionIdSet = new Set(supportedOptionIds);
  const holeOptionIdSet = new Set(
    hole.options.map((option) => option.optionId),
  );
  const preferredOptionIds =
    hole.source.tag === "draft" && hole.source.path === "draft.background"
      ? [creationChoiceOptionId("background_soldier")]
      : hole.source.tag === "draft" && hole.source.path === "draft.species"
        ? [creationChoiceOptionId("species_orc")]
        : hole.source.tag === "unitChoice"
          ? (preferredOptionIdsBySource[unitChoiceSourceKey(hole.source)] ??
            soldierBackgroundFixtureOptionIds(hole.source))
          : undefined;
  const defaultOptionIds = hole.options.map((option) => option.optionId);
  const selectedOptionIds = (preferredOptionIds ?? defaultOptionIds)
    .filter((optionId) => holeOptionIdSet.has(optionId))
    .filter((optionId) => supportedOptionIdSet.has(optionId))
    .slice(0, choiceCardinalityBounds(hole.cardinality).max);
  if (
    selectedOptionIds.length < choiceCardinalityBounds(hole.cardinality).max
  ) {
    throw new Error(
      `Not enough support-profile options for Order selected identity hole ${hole.holeId}.`,
    );
  }

  return choiceFill(hole, selectedOptionIds);
}

function orderBuildFacts(
  finalized: { readonly draft: CharacterDraft; readonly build: CharacterBuild },
  input: OrderProjectionInput,
): {
  readonly selectedOrderOptionCount: 1;
  readonly selectedSuborderClassChoiceFeatureCount: number;
  readonly orderUnitRefPresent: boolean;
  readonly extraCantripUnitRefPresent: boolean;
  readonly martialWeaponProficiencyPresent: boolean;
  readonly heavyArmorTrainingPresent: boolean;
  readonly mediumArmorTrainingPresent: boolean;
  readonly abilityCheckBonusKind: OrderAbilityCheckBonusKind;
  readonly abilityCheckBonusFeatureCount: number;
  readonly totalLevel: number;
} {
  const selectedOrderOptions = selectedChoiceOptionIds(
    finalized.draft,
    input.orderUnitId,
    input.orderChoiceKey,
  );
  if (
    selectedOrderOptions.length !== 1 ||
    selectedOrderOptions[0] !== input.selectedOrderOptionId
  ) {
    throw new Error(
      `Expected ${input.orderUnitId} selected option ${input.selectedOrderOptionId}, received ${selectedOrderOptions.join(",")}.`,
    );
  }

  const selectedExtraCantrips = selectedChoiceOptionIds(
    finalized.draft,
    input.orderUnitId,
    CLASS_CANTRIP_CHOICE_KEY,
  );
  if (input.extraCantripUnitId === "none") {
    if (selectedExtraCantrips.length !== 0) {
      throw new Error(
        `Expected no extra ${input.orderUnitId} cantrip, received ${selectedExtraCantrips.join(",")}.`,
      );
    }
  } else if (
    selectedExtraCantrips.length !== 1 ||
    selectedExtraCantrips[0] !== input.extraCantripUnitId
  ) {
    throw new Error(
      `Expected extra ${input.orderUnitId} cantrip ${input.extraCantripUnitId}, received ${selectedExtraCantrips.join(",")}.`,
    );
  }

  const unitRefIds = characterBuildUnitRefs(finalized.build, unitLibrary).map(
    (ref) => ref.unitId,
  );
  const proficiencies = expectRight(
    characterBuildProficiencies(finalized.build, unitLibrary),
  );
  const armorTraining = expectRight(
    characterBuildArmorTraining(finalized.build, unitLibrary),
  );
  const abilityCheckBonusFacts = orderAbilityCheckBonusFacts(
    finalized.build.features,
    input.orderUnitId,
  );

  return {
    selectedOrderOptionCount: 1,
    selectedSuborderClassChoiceFeatureCount: finalized.build.features.filter(
      (feature) =>
        feature.kind === "selectedClassChoice" &&
        feature.selectedFromUnitId === input.orderUnitId,
    ).length,
    orderUnitRefPresent: unitRefIds.includes(input.orderUnitId),
    extraCantripUnitRefPresent:
      input.extraCantripUnitId !== "none" &&
      unitRefIds.includes(input.extraCantripUnitId),
    martialWeaponProficiencyPresent: proficiencies.weapon.includes("martial"),
    heavyArmorTrainingPresent: armorTraining.includes("heavy"),
    mediumArmorTrainingPresent: armorTraining.includes("medium"),
    abilityCheckBonusKind: abilityCheckBonusFacts.kind,
    abilityCheckBonusFeatureCount: abilityCheckBonusFacts.count,
    totalLevel: computeTotalLevel(finalized.build.progression),
  };
}

function orderAbilityCheckBonusFacts(
  features: readonly CharacterBuildFeature[],
  orderUnitId:
    | typeof CLERIC_DIVINE_ORDER_UNIT_ID
    | typeof DRUID_PRIMAL_ORDER_UNIT_ID,
): { readonly kind: OrderAbilityCheckBonusKind; readonly count: number } {
  const matchingFeatures = features.filter(
    (feature): feature is AbilityCheckBonusFeature =>
      feature.kind === "abilityCheckBonus" &&
      feature.selectedFromUnitId === orderUnitId,
  );
  const feature = matchingFeatures[0];
  if (feature === undefined) {
    return { kind: "none", count: 0 };
  }
  if (matchingFeatures.length !== 1) {
    throw new Error(
      `Expected at most one ${orderUnitId} ability-check bonus feature, received ${matchingFeatures.length}.`,
    );
  }
  if (
    feature.ability === "int" &&
    feature.bonus.kind === "abilityModifier" &&
    feature.bonus.ability === "wis" &&
    feature.bonus.minimum === 1 &&
    feature.skills.length === 2 &&
    feature.skills[0] === "arcana" &&
    feature.skills[1] === "religion"
  ) {
    return { kind: "int_arcana_religion_wis_min1", count: 1 };
  }
  if (
    feature.ability === "int" &&
    feature.bonus.kind === "abilityModifier" &&
    feature.bonus.ability === "wis" &&
    feature.bonus.minimum === 1 &&
    feature.skills.length === 2 &&
    feature.skills[0] === "arcana" &&
    feature.skills[1] === "nature"
  ) {
    return { kind: "int_arcana_nature_wis_min1", count: 1 };
  }

  throw new Error(
    `Unexpected ${orderUnitId} ability-check bonus feature ${JSON.stringify(feature)}.`,
  );
}

function assertOrderDraftSelections(
  draft: CharacterDraft,
  input: OrderProjectionInput,
): void {
  const selectedOptionIds = selectedChoiceOptionIds(
    draft,
    input.orderUnitId,
    input.orderChoiceKey,
  );
  if (
    selectedOptionIds.length !== 1 ||
    selectedOptionIds[0] !== input.selectedOrderOptionId
  ) {
    throw new Error(
      `Expected ${input.orderUnitId} ${input.orderChoiceKey} selection ${input.selectedOrderOptionId}, received ${selectedOptionIds.join(",")}.`,
    );
  }
}

function levelOneProgression(
  classId: typeof CLERIC_CLASS_UNIT_ID | typeof DRUID_CLASS_UNIT_ID,
): CharacterProgression {
  return {
    startingClass: classUnitId(classId),
    advancements: [],
  };
}

function selectedChoiceOptionIds(
  draft: CharacterDraft,
  unitId: string,
  choiceKey: string,
): readonly CreationChoiceOptionId[] {
  return draft.selections.choices.flatMap((selection) =>
    selection.kind === "unitChoice" &&
    selection.source.unitId === unitId &&
    selection.source.choiceKey === choiceKey
      ? selection.options.map((option) => option.optionId)
      : [],
  );
}

function orderChoiceSourceKey(
  unitId: string,
  choiceKey: UnitChoiceKey,
): string {
  return unitChoiceSourceKey({
    tag: "unitChoice",
    unitId: expectRight(unitChoiceSourceUnitId(unitId)),
    choiceKey: expectRight(unitChoiceKey(choiceKey)),
  });
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
      `Expected Order selected identity fill batch to be accepted, received ${JSON.stringify(result.issues)}.`,
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
): ClericDruidOrderSelectedIdentityProjection {
  const parsed = quintStateSchema.parse(qStateValue(raw));
  return clericDruidOrderSelectedIdentityProjectionSchema.parse({
    outcome: parsed.outcome,
    selectedOrderUnitId: parsed.selectedOrderUnitId,
    selectedOrderOptionId: parsed.selectedOrderOptionId,
    extraCantripUnitId: parsed.extraCantripUnitId,
    selectedOrderOptionCount: Number(parsed.selectedOrderOptionCount),
    selectedSuborderClassChoiceFeatureCount: Number(
      parsed.selectedSuborderClassChoiceFeatureCount,
    ),
    orderUnitRefPresent: parsed.orderUnitRefPresent,
    extraCantripUnitRefPresent: parsed.extraCantripUnitRefPresent,
    martialWeaponProficiencyPresent: parsed.martialWeaponProficiencyPresent,
    heavyArmorTrainingPresent: parsed.heavyArmorTrainingPresent,
    mediumArmorTrainingPresent: parsed.mediumArmorTrainingPresent,
    abilityCheckBonusKind: parsed.abilityCheckBonusKind,
    abilityCheckBonusFeatureCount: Number(parsed.abilityCheckBonusFeatureCount),
    totalLevel: Number(parsed.totalLevel),
  });
}

function compareProjection(
  spec: ClericDruidOrderSelectedIdentityProjection,
  impl: ClericDruidOrderSelectedIdentityProjection,
): boolean {
  expect(impl).toEqual(spec);
  return true;
}

const clericDruidOrderSelectedIdentityStateCheck = stateCheck(
  normalizeQuintState,
  compareProjection,
);
