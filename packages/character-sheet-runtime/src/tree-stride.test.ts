// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.tree-stride-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.tree-stride-travel
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-08-L5-TELEPORT-TRAVEL tree_stride
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-08-L5-TELEPORT-TRAVEL tree_stride
// UNIT-IDENTITY-REPLAY: L19E-08-L5-TELEPORT-TRAVEL tree_stride doCastTreeStride doResolveTreeStrideTransit
import { describe, expect, it, test } from "vitest";

import {
  Either,
  Hp,
  armorClassBuild,
  castTreeStride,
  characterSheetId,
  characterSheetTreeStrideTreeId,
  characterSheetTreeStrideTreeKind,
  druidWildShapeFixtureKnownFormStatBlockIds,
  parseCharacterSheet,
  requireRight,
  resolveTreeStrideTransit,
  spellSlotLevel,
  storedAvailableSheetInput,
  unitLibrary,
} from "./test-support.ts";
import type {
  CharacterSheetTreeStrideDestinationTree,
  CharacterSheetTreeStrideTree,
} from "./index.ts";

const treeStrideSelectedIdentityDriverSchema = {
  doCastTreeStride: {},
  doResolveTreeStrideTransit: {},
} as const;

type TreeStrideSelectedIdentityDriverAction =
  keyof typeof treeStrideSelectedIdentityDriverSchema;

type TreeStrideSelectedIdentityProjection = {
  readonly spellId: string;
  readonly spellSlotCost: "ordinary";
  readonly slotLevel: number;
  readonly slotExpended: number;
  readonly durationMinutes: number;
  readonly entryMovementCostFeet: number;
  readonly destinationMovementCostFeet: number;
  readonly destinationSearchRadiusFeet: number;
  readonly arrivalTree: "entry" | "destination";
  readonly movementSpentFeet: number;
};

type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly TreeStrideSelectedIdentityDriverAction[];
  readonly expected: TreeStrideSelectedIdentityProjection;
};

type SelectedUnitIdentityReplay = {
  readonly taskId: "L19E-08-L5-TELEPORT-TRAVEL";
  readonly unitId: "tree_stride";
  readonly actions: readonly TreeStrideSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-08-L5-TELEPORT-TRAVEL",
    unitId: "tree_stride",
    actions: ["doCastTreeStride", "doResolveTreeStrideTransit"],
    sequences: [
      {
        name: "selected-tree-stride-slot-cast-returns-tree-travel-contract",
        actions: ["doCastTreeStride"],
        expected: expectedTreeStrideProjection({
          slotExpended: 1,
          arrivalTree: "entry",
          movementSpentFeet: 0,
        }),
      },
      {
        name: "selected-tree-stride-transit-reaches-destination-with-movement",
        actions: ["doResolveTreeStrideTransit"],
        expected: expectedTreeStrideProjection({
          slotExpended: 1,
          arrivalTree: "destination",
          movementSpentFeet: 10,
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

describe("Character Sheet runtime / Tree Stride", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<TreeStrideSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: TreeStrideSelectedIdentityProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = treeStrideSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("Tree Stride spends a level-5 prepared spell slot and returns a tree travel contract", () => {
    const result = requireRight(
      castTreeStride({
        sheet: treeStrideDruidSheet({
          preparedSpells: ["tree_stride"],
          slots: 1,
        }),
        unitLibrary,
      }),
    );

    expect(result.invocation).toEqual({
      tag: "treeStride",
      spellId: "tree_stride",
      spellLevel: 5,
      spellSlotCost: { kind: "ordinary", spellLevel: spellSlotLevel(5) },
      preparationRequirement: "prepared",
      requiredSpellAccess: "class_prepared",
      duration: { kind: "timeSpan", unit: "minute", amount: 1 },
      concentrationRequired: true,
      transport: {
        entryMovementCostFeet: 5,
        destinationMovementCostFeet: 5,
        destinationSearchRadiusFeet: 500,
        usesPerTurn: 1,
        mustEndTurnOutsideTree: true,
        destinationKindRequirement:
          "same_kind_living_tree_at_least_caster_size",
      },
    });
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Tree Stride resolves destination travel, entry-tree fallback, and once-per-turn rejection", () => {
    const cast = requireRight(
      castTreeStride({
        sheet: treeStrideDruidSheet({
          preparedSpells: ["tree_stride"],
          slots: 1,
        }),
        unitLibrary,
      }),
    );
    const destination = requireRight(
      resolveTreeStrideTransit({
        invocation: cast.invocation,
        entryTree,
        destinationTree,
        movementAvailableFeet: 10,
        usedThisTurn: false,
      }),
    );
    expect(destination).toEqual({
      arrivalTree: destinationTree,
      movementSpentFeet: 10,
      usedThisTurn: true,
      endsOutsideTree: true,
    });

    const fallback = requireRight(
      resolveTreeStrideTransit({
        invocation: cast.invocation,
        entryTree,
        destinationTree,
        movementAvailableFeet: 5,
        usedThisTurn: false,
      }),
    );
    expect(fallback.arrivalTree).toEqual(entryTree);
    expect(fallback.movementSpentFeet).toBe(5);

    const repeated = resolveTreeStrideTransit({
      invocation: cast.invocation,
      entryTree,
      destinationTree,
      movementAvailableFeet: 10,
      usedThisTurn: true,
    });
    expect(Either.isLeft(repeated)).toBe(true);
    if (Either.isLeft(repeated)) {
      expect(repeated.left.message).toBe(
        "Tree Stride can be used only once per turn.",
      );
    }
  });

  test("Tree Stride requires prepared class Spell Access", () => {
    const result = castTreeStride({
      sheet: treeStrideDruidSheet({ preparedSpells: [], slots: 1 }),
      unitLibrary,
    });

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left.message).toBe(
        "Tree Stride requires prepared class Spell Access.",
      );
    }
  });
});

const treeStrideSelectedIdentityActions = {
  doCastTreeStride: () => {
    const result = requireRight(
      castTreeStride({
        sheet: treeStrideDruidSheet({
          preparedSpells: ["tree_stride"],
          slots: 1,
        }),
        unitLibrary,
      }),
    );
    return treeStrideProjection({
      slotExpended:
        (result.sheet.spellSlotExpenditures ?? []).find(
          (slot) => slot.spellLevel === spellSlotLevel(5),
        )?.expended ?? 0,
      arrivalTree: "entry",
      movementSpentFeet: 0,
    });
  },
  doResolveTreeStrideTransit: () => {
    const result = requireRight(
      castTreeStride({
        sheet: treeStrideDruidSheet({
          preparedSpells: ["tree_stride"],
          slots: 1,
        }),
        unitLibrary,
      }),
    );
    const transit = requireRight(
      resolveTreeStrideTransit({
        invocation: result.invocation,
        entryTree,
        destinationTree,
        movementAvailableFeet: 10,
        usedThisTurn: false,
      }),
    );
    return treeStrideProjection({
      slotExpended:
        (result.sheet.spellSlotExpenditures ?? []).find(
          (slot) => slot.spellLevel === spellSlotLevel(5),
        )?.expended ?? 0,
      arrivalTree:
        transit.arrivalTree.treeId === destinationTree.treeId
          ? "destination"
          : "entry",
      movementSpentFeet: transit.movementSpentFeet,
    });
  },
} as const satisfies Record<
  TreeStrideSelectedIdentityDriverAction,
  () => TreeStrideSelectedIdentityProjection
>;

function treeStrideProjection(input: {
  readonly slotExpended: number;
  readonly arrivalTree: "entry" | "destination";
  readonly movementSpentFeet: number;
}): TreeStrideSelectedIdentityProjection {
  return {
    spellId: "tree_stride",
    spellSlotCost: "ordinary",
    slotLevel: 5,
    durationMinutes: 1,
    entryMovementCostFeet: 5,
    destinationMovementCostFeet: 5,
    destinationSearchRadiusFeet: 500,
    ...input,
  };
}

function expectedTreeStrideProjection(input: {
  readonly slotExpended: number;
  readonly arrivalTree: "entry" | "destination";
  readonly movementSpentFeet: number;
}): TreeStrideSelectedIdentityProjection {
  return treeStrideProjection(input);
}

const oakKind = requireRight(characterSheetTreeStrideTreeKind("oak"));
const entryTree = {
  treeId: requireRight(characterSheetTreeStrideTreeId("tree:entry-oak")),
  treeKind: oakKind,
  living: true,
  atLeastCasterSize: true,
} as const satisfies CharacterSheetTreeStrideTree;
const destinationTree = {
  treeId: requireRight(
    characterSheetTreeStrideTreeId("tree:destination-oak"),
  ),
  treeKind: oakKind,
  living: true,
  atLeastCasterSize: true,
  within500FeetOfEntryTree: true,
} as const satisfies CharacterSheetTreeStrideDestinationTree;

function treeStrideDruidSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}) {
  return requireRight(
    parseCharacterSheet(
      {
        ...storedAvailableSheetInput({
          characterId: characterSheetId("character:tree-stride-druid-9"),
          build: {
            ...armorClassBuild({
              startingClass: "class_druid",
              advancements: Array.from({ length: 8 }, () => "class_druid"),
            }),
            classFeatureLanguages: [
              {
                kind: "classFeatureLanguageGrant",
                sourceUnitId: "druid_druidic",
                language: "Druidic",
              },
            ],
            spellcasting: {
              sources: [
                {
                  sourceUnitId: "class_druid",
                  spellcastingAbility: "wis",
                  cantrips: ["druidcraft", "guidance", "produce_flame"],
                  spellbook: [],
                  preparedSpells: input.preparedSpells,
                  spellcastingFocuses: ["druidic_focus"],
                },
              ],
              slotPools: {
                spellcasting: {
                  kind: "spellcasting",
                  slots: [{ spellLevel: 5, count: input.slots }],
                },
              },
            },
          },
        }),
        hitPoints: { tag: "positive", currentHp: Hp(57), tempHp: Hp(0) },
        restFeatureUses: [],
        spellSlotExpenditures: [],
        createdSpellSlots: [],
        pactSlotExpenditure: undefined,
        druidWildShapeKnownForms: {
          statBlockIds: [
            ...druidWildShapeFixtureKnownFormStatBlockIds,
            "stat_block_cat",
            "stat_block_frog",
            "stat_block_bat",
            "stat_block_owl",
          ],
        },
      },
      unitLibrary,
    ),
  );
}
