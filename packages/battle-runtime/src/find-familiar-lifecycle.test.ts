// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.find-familiar-lifecycle
import * as Either from "effect/Either";
import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import { Hp } from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { StatBlockRecord } from "@dnd/surface/surface/types";

import {
  applyFindFamiliarZeroHitPointDisappearance,
  battleCombatantSide,
  battleId,
  battleObjectId,
  BattleSnapshotSchema,
  castFindFamiliar,
  combatantId,
  findFamiliarFormEligibilityForSpell,
  findFamiliarCreatureTypeOverrideForOwner,
  initiativeScore,
  permanentlyDismissFindFamiliar,
  reappearTemporarilyDismissedFindFamiliar,
  snapshotBattle,
  startBattle,
  temporarilyDismissFindFamiliar,
  type BattleState,
  type FindFamiliarFormEligibility,
} from "./index.ts";

const partySide = battleCombatantSide("party");
const casterId = combatantId("caster");
const familiarId = combatantId("caster-familiar");
const otherCombatantId = combatantId("other-combatant");
const replacementFamiliarId = combatantId("replacement-familiar");
const droppedObjectId = battleObjectId("familiar-pack");

const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (statBlockCatalogResult.tag !== "ok") {
  throw new Error("Expected SRD Stat Block catalog for tests.");
}
const statBlockCatalog = statBlockCatalogResult.catalog;

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Expected SRD Unit catalog for tests.");
}
const findFamiliarSpell =
  unitCatalogResult.catalog.requireUnit("find_familiar");
if (findFamiliarSpell.kind !== "spell") {
  throw new Error("Expected Find Familiar spell record.");
}
const familiarEligibility: FindFamiliarFormEligibility =
  requireFindFamiliarEligibility(
    findFamiliarFormEligibilityForSpell(findFamiliarSpell),
  );

function requireFindFamiliarEligibility(
  eligibility: FindFamiliarFormEligibility | null,
): FindFamiliarFormEligibility {
  if (eligibility === null) {
    throw new Error("Expected Find Familiar form eligibility.");
  }
  return eligibility;
}
const firstTypeOverride = familiarEligibility.creatureTypeOverrideChoices[0];
if (firstTypeOverride === undefined) {
  throw new Error("Expected Find Familiar creature type override choices.");
}

function startFixtureBattle(
  input: {
    readonly extraCombatantId?: typeof otherCombatantId;
  } = {},
): BattleState {
  const skeleton = statBlockCatalog.requireStatBlock("stat_block_skeleton");
  const maxHp = literalHp(skeleton);
  const result = startBattle({
    battleId: battleId("find-familiar-lifecycle-test"),
    combatants: [
      {
        combatantId: casterId,
        displayName: "Caster",
        initiative: initiativeScore(12),
        side: partySide,
        creatureInit: {
          kind: "statBlock",
          statBlock: skeleton,
          currentHp: maxHp,
          maxHp,
          tempHp: Hp(0),
        },
      },
      ...(input.extraCombatantId === undefined
        ? []
        : [
            {
              combatantId: input.extraCombatantId,
              displayName: "Other Combatant",
              initiative: initiativeScore(10),
              side: partySide,
              creatureInit: {
                kind: "statBlock" as const,
                statBlock: skeleton,
                currentHp: maxHp,
                maxHp,
                tempHp: Hp(0),
              },
            },
          ]),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function castCatFamiliar(state: BattleState, id = familiarId) {
  return castFindFamiliar({
    state,
    casterId,
    catalog: statBlockCatalog,
    eligibility: familiarEligibility,
    selection: {
      tag: "normalNamedForm",
      formId: "cat",
    },
    creatureTypeOverrideChoiceId: firstTypeOverride.optionId,
    familiarId: id,
    initiative: initiativeScore(18),
    placement: { kind: "unoccupiedSpaceWithinSpellRange" },
  });
}

function castRatFamiliar(state: BattleState) {
  return castFindFamiliar({
    state,
    casterId,
    catalog: statBlockCatalog,
    eligibility: familiarEligibility,
    selection: {
      tag: "normalNamedForm",
      formId: "rat",
    },
    creatureTypeOverrideChoiceId: firstTypeOverride.optionId,
    familiarId: replacementFamiliarId,
    initiative: initiativeScore(15),
    placement: { kind: "unoccupiedSpaceWithinSpellRange" },
  });
}

function literalHp(statBlock: StatBlockRecord): Hp {
  const hp = statBlock.statBlock.hp;
  if (hp.kind !== "literal") {
    throw new Error("Test Stat Block must use literal HP.");
  }
  return Hp(hp.value);
}

function withFreshMagicAction(state: BattleState): BattleState {
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      actionResources: [{ kind: "action", source: "turn" }],
    },
  };
}

describe("Find Familiar lifecycle", () => {
  test("casts a familiar as owner-linked companion state without ordinary combatant insertion", () => {
    const initial = startFixtureBattle();
    const result = castCatFamiliar(initial);

    expect(result.tag).toBe("resolved");
    if (result.tag !== "resolved") return;
    const familiar = result.state.findFamiliars.get(casterId);
    expect(familiar).toMatchObject({
      status: "present",
      familiarId,
      creatureTypeOverride: firstTypeOverride.creatureType,
      formSelection: { tag: "normalNamedForm", formId: "cat" },
      initiative: initiativeScore(18),
      placement: { kind: "unoccupiedSpaceWithinSpellRange" },
    });
    expect(familiar).not.toHaveProperty("ownerId");
    expect(familiar).not.toHaveProperty("resolvedForm");
    expect(result.state.combatants.has(familiarId)).toBe(false);
    expect(result.state.combatants).toStrictEqual(initial.combatants);
    expect(result.state.initiative).toStrictEqual(initial.initiative);
    expect(
      findFamiliarCreatureTypeOverrideForOwner(result.state, casterId),
    ).toBe(firstTypeOverride.creatureType);
    expect(result.snapshot.findFamiliars).toMatchObject([
      {
        ownerId: casterId,
        familiarId,
      },
    ]);
  });

  test("keeps one familiar per caster and atomically replaces form on recast", () => {
    const first = castCatFamiliar(startFixtureBattle());
    expect(first.tag).toBe("resolved");
    if (first.tag !== "resolved") return;

    const second = castRatFamiliar(first.state);

    expect(second.tag).toBe("resolved");
    if (second.tag !== "resolved") return;
    expect(second.state.findFamiliars).toHaveLength(1);
    expect(second.state.combatants.has(familiarId)).toBe(false);
    expect(second.state.combatants.has(replacementFamiliarId)).toBe(false);
    expect(second.state.findFamiliars.get(casterId)).toMatchObject({
      status: "present",
      familiarId,
      formSelection: { tag: "normalNamedForm", formId: "rat" },
    });
  });

  test("rejects familiar identities that collide with ordinary combatants", () => {
    const casterCollision = castCatFamiliar(startFixtureBattle(), casterId);

    expect(casterCollision.tag).toBe("invalid");
    if (casterCollision.tag !== "invalid") return;
    expect(casterCollision.reason).toBe("invalidFill");
    expect(casterCollision.snapshot.findFamiliars).toEqual([]);

    const otherCollision = castCatFamiliar(
      startFixtureBattle({ extraCombatantId: otherCombatantId }),
      otherCombatantId,
    );

    expect(otherCollision.tag).toBe("invalid");
    if (otherCollision.tag !== "invalid") return;
    expect(otherCollision.reason).toBe("invalidFill");
    expect(otherCollision.snapshot.findFamiliars).toEqual([]);
  });

  test("temporarily dismisses and reappears by Magic-action boundary", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const dismissed = temporarilyDismissFindFamiliar({
      state: cast.state,
      casterId,
      heldObjectIds: [droppedObjectId],
    });

    expect(dismissed.tag).toBe("resolved");
    if (dismissed.tag !== "resolved") return;
    expect(dismissed.state.combatants.has(familiarId)).toBe(false);
    expect(dismissed.state.findFamiliars.get(casterId)).toMatchObject({
      status: "temporarilyDismissed",
    });
    expect(dismissed.state.currentTurnResources.actionResources).toEqual([]);
    expect(dismissed.droppedObjects).toEqual([
      {
        kind: "heldObjectDropped",
        actorId: familiarId,
        objectId: droppedObjectId,
        sourceCombatantId: casterId,
        sourceSpellId: "find_familiar",
      },
    ]);

    const blockedReappearance = reappearTemporarilyDismissedFindFamiliar({
      state: dismissed.state,
      casterId,
      familiarId,
      initiative: initiativeScore(14),
      placement: { kind: "unoccupiedSpaceWithin30Feet" },
    });
    expect(blockedReappearance.tag).toBe("invalid");
    if (blockedReappearance.tag !== "invalid") return;
    expect(blockedReappearance.reason).toBe("staleSubject");

    const reappeared = reappearTemporarilyDismissedFindFamiliar({
      state: withFreshMagicAction(dismissed.state),
      casterId,
      familiarId,
      initiative: initiativeScore(14),
      placement: { kind: "unoccupiedSpaceWithin30Feet" },
    });
    expect(reappeared.tag).toBe("resolved");
    if (reappeared.tag !== "resolved") return;
    expect(reappeared.state.currentTurnResources.actionResources).toEqual([]);
    expect(reappeared.state.combatants.has(familiarId)).toBe(false);
    expect(reappeared.state.findFamiliars.get(casterId)).toMatchObject({
      status: "present",
      initiative: initiativeScore(14),
      placement: { kind: "unoccupiedSpaceWithin30Feet" },
    });
  });

  test("rejects reappearance with an ordinary combatant identity", () => {
    const cast = castCatFamiliar(
      startFixtureBattle({ extraCombatantId: otherCombatantId }),
    );
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const dismissed = temporarilyDismissFindFamiliar({
      state: cast.state,
      casterId,
    });
    expect(dismissed.tag).toBe("resolved");
    if (dismissed.tag !== "resolved") return;

    const reappeared = reappearTemporarilyDismissedFindFamiliar({
      state: withFreshMagicAction(dismissed.state),
      casterId,
      familiarId: otherCombatantId,
      initiative: initiativeScore(14),
      placement: { kind: "unoccupiedSpaceWithin30Feet" },
    });

    expect(reappeared.tag).toBe("invalid");
    if (reappeared.tag !== "invalid") return;
    expect(reappeared.reason).toBe("invalidFill");
    expect(reappeared.snapshot.findFamiliars).toEqual([
      {
        status: "temporarilyDismissed",
        ownerId: casterId,
        formSelection: { tag: "normalNamedForm", formId: "cat" },
        creatureTypeOverride: firstTypeOverride.creatureType,
      },
    ]);
  });

  test("permanent dismissal removes the active familiar record", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const dismissed = permanentlyDismissFindFamiliar({
      state: cast.state,
      casterId,
    });

    expect(dismissed.tag).toBe("resolved");
    if (dismissed.tag !== "resolved") return;
    expect(dismissed.state.findFamiliars.has(casterId)).toBe(false);
    expect(dismissed.state.combatants.has(familiarId)).toBe(false);
    expect(dismissed.droppedObjects).toBeUndefined();
  });

  test("0 HP disappearance records absence and leaves recast state", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const disappeared = applyFindFamiliarZeroHitPointDisappearance({
      state: cast.state,
      familiarId,
      heldObjectIds: [droppedObjectId],
    });

    expect(disappeared.tag).toBe("resolved");
    if (disappeared.tag !== "resolved") return;
    expect(disappeared.state.combatants.has(familiarId)).toBe(false);
    expect(disappeared.state.findFamiliars.get(casterId)).toMatchObject({
      status: "disappearedAtZeroHitPoints",
    });
    expect(disappeared.droppedObjects).toHaveLength(1);

    const recast = castRatFamiliar(disappeared.state);
    expect(recast.tag).toBe("resolved");
    if (recast.tag !== "resolved") return;
    expect(recast.state.findFamiliars.get(casterId)).toMatchObject({
      status: "present",
      familiarId: replacementFamiliarId,
    });
  });

  test("snapshot schema encodes and rejects invalid familiar snapshots", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;

    const encoded = Schema.encodeSync(BattleSnapshotSchema)(cast.snapshot);
    expect(encoded.findFamiliars).toEqual([
      {
        status: "present",
        ownerId: casterId,
        familiarId,
        formSelection: { tag: "normalNamedForm", formId: "cat" },
        creatureTypeOverride: firstTypeOverride.creatureType,
        initiative: 18,
        placement: { kind: "unoccupiedSpaceWithinSpellRange" },
      },
    ]);

    const decoded = Schema.decodeUnknownEither(BattleSnapshotSchema)(encoded);
    expect(Either.isRight(decoded)).toBe(true);
    const invalid = Schema.decodeUnknownEither(BattleSnapshotSchema)({
      ...encoded,
      findFamiliars: [{ status: "present" }],
    });
    expect(Either.isLeft(invalid)).toBe(true);
  });

  test("snapshot derives familiar owner from the state map key", () => {
    const cast = castCatFamiliar(startFixtureBattle());
    expect(cast.tag).toBe("resolved");
    if (cast.tag !== "resolved") return;
    const familiar = cast.state.findFamiliars.get(casterId);
    expect(familiar).toBeDefined();
    if (familiar === undefined) return;
    const familiarWithContradictoryOwner = {
      ...familiar,
      ownerId: otherCombatantId,
    };

    const malformedState = {
      ...cast.state,
      findFamiliars: new Map([[casterId, familiarWithContradictoryOwner]]),
    };

    expect(snapshotBattle(malformedState).findFamiliars).toMatchObject([
      { ownerId: casterId },
    ]);
  });
});
