import { assertStatBlockForTest } from "@dnd/surface/surface/stat-block-catalog.test-support";
import {
  abilityScoreAssignment,
  classUnitId,
  copperPieceAmount,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import {
  battleCreatureInitFromStatBlock,
  battleAmmunitionStock,
  battleId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  settleBattleRuntimeTransaction,
  startBattle,
  startBattleWithInitialInitiativeSetup,
} from "@dnd/battle-runtime";
import {
  characterSheetBattleInit,
  type BattleRosterStatBlockCombatant,
} from "@dnd/character-battle-runtime";
import {
  characterSheetDruidWildShapeKnownForms,
  characterSheetId,
} from "@dnd/character-sheet-runtime";
import { Hp } from "@dnd/shared/types";
import { statBlockId, unitId } from "@dnd/shared/game-facts";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { Option, Result } from "effect";
import { describe, expect, test } from "vitest";

import {
  availableCharacterSession,
  createMcpSessionStore,
} from "./session-store.ts";
import { createMcpPlaySessionRoot } from "./composition-root.ts";

// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.class-feature-use-count-resource
const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error("MCP session store test catalogs must build.");
}
const unitLibrary = unitCatalogResult.catalog;
const statBlockCatalog = statBlockCatalogResult.catalog;
const DRUID_WILD_SHAPE_KNOWN_FORM_IDS = [
  statBlockId("stat_block_rat"),
  statBlockId("stat_block_riding_horse"),
  statBlockId("stat_block_spider"),
  statBlockId("stat_block_wolf"),
] as const;

describe("MCP character sessions", () => {
  test("drops a selected Stat Block projection after catalog drift", () => {
    const root = createMcpPlaySessionRoot();
    const selected = assertStatBlockForTest(
      root.statBlockCatalog,
      statBlockId("stat_block_goblin_warrior"),
    );
    let retained = true;
    const store = createMcpSessionStore({
      statBlockCatalog: {
        ...root.statBlockCatalog,
        getStatBlock: () => (retained ? Option.some(selected) : Option.none()),
      },
      unitLibrary: root.unitLibrary,
    });

    expect(store.selectStatBlock(selected.id)).toMatchObject({
      _tag: "Success",
    });
    retained = false;
    expect(store.getSelectedStatBlock()).toBeNull();
  });

  test("requires and stores explicit Wild Shape known forms", () => {
    const missingKnownForms = availableCharacterSession({
      characterId: characterSheetId("character:mcp-druid-wild-shape-missing"),
      build: druidWildShapeBuild(),
      currentHp: Hp(15),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      companion: { tag: "none" },
      unitLibrary,
    });
    expect(missingKnownForms).toMatchObject({
      _tag: "Failure",
      failure: {
        tag: "characterSessionIssue",
        message:
          "Wild Shape known forms require selected Beast Stat Block identities.",
      },
    });

    const session = availableCharacterSession({
      characterId: characterSheetId("character:mcp-druid-wild-shape"),
      build: druidWildShapeBuild(),
      currentHp: Hp(15),
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      companion: { tag: "none" },
      unitLibrary,
      statBlockCatalog,
      druidWildShapeKnownFormStatBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS,
    });

    expect(Result.isSuccess(session)).toBe(true);
    if (Result.isSuccess(session)) {
      expect(
        characterSheetDruidWildShapeKnownForms(session.success)?.statBlockIds,
      ).toEqual(DRUID_WILD_SHAPE_KNOWN_FORM_IDS);
    }
  });

  test("validates the full Character Session batch before committing it", () => {
    const root = createMcpPlaySessionRoot();
    const store = createMcpSessionStore({
      statBlockCatalog: root.statBlockCatalog,
      unitLibrary: root.unitLibrary,
    });
    const first = expectRight(
      availableCharacterSession({
        characterId: characterSheetId("character:mcp-batch-first"),
        build: druidWildShapeBuild(),
        currentHp: Hp(15),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        conditions: [],
        companion: { tag: "none" },
        unitLibrary,
        statBlockCatalog,
        druidWildShapeKnownFormStatBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS,
      }),
    );
    const second = expectRight(
      availableCharacterSession({
        characterId: characterSheetId("character:mcp-batch-second"),
        build: druidWildShapeBuild(),
        currentHp: Hp(15),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        conditions: [],
        companion: { tag: "none" },
        unitLibrary,
        statBlockCatalog,
        druidWildShapeKnownFormStatBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS,
      }),
    );
    store.characters.set(first);
    store.characters.set(second);

    expect(store.characters.setAll([first, first])).toEqual(
      Result.fail({
        tag: "duplicateCharacterSession",
        characterId: first.characterId,
      }),
    );
    expect(store.characters.get(first.characterId)).toBe(first);
    expect(store.characters.get(second.characterId)).toBe(second);

    const unknown = expectRight(
      availableCharacterSession({
        characterId: characterSheetId("character:mcp-batch-unknown"),
        build: druidWildShapeBuild(),
        currentHp: Hp(15),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        conditions: [],
        companion: { tag: "none" },
        unitLibrary,
        statBlockCatalog,
        druidWildShapeKnownFormStatBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS,
      }),
    );
    expect(store.characters.setAll([first, unknown])).toEqual(
      Result.fail({
        tag: "unknownCharacterSession",
        characterId: unknown.characterId,
      }),
    );
    expect(store.characters.get(first.characterId)).toBe(first);
    expect(store.characters.get(second.characterId)).toBe(second);
  });

  test("commits Battle and Character Session occupancy as one store transition", () => {
    const root = createMcpPlaySessionRoot();
    const store = createMcpSessionStore({
      statBlockCatalog: root.statBlockCatalog,
      unitLibrary: root.unitLibrary,
    });
    const character = expectRight(
      availableCharacterSession({
        characterId: characterSheetId("character:mcp-atomic-battle"),
        build: druidWildShapeBuild(),
        currentHp: Hp(15),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        conditions: [],
        companion: { tag: "none" },
        unitLibrary,
        statBlockCatalog,
        druidWildShapeKnownFormStatBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS,
      }),
    );
    const characterInit = expectRight(
      characterSheetBattleInit({
        combatantId: combatantId("mcp-atomic-battle-character"),
        displayName: "Atomic Character",
        sheet: character,
        initiative: initiativeScore(12),
        ammunitionStocks: [],
        unitLibrary,
        statBlockCatalog: root.statBlockCatalog,
      }),
    );
    const active = expectRight(
      startBattle({
        battleId: battleId("battle:mcp-atomic-store"),
        combatants: [characterInit],
      }),
    );
    store.characters.set(character);

    const replacement = { ...character };
    store.characters.set(replacement);
    const beforeRejectedStart = deepStoreState(store);
    expect(
      store.commitBattleStart({
        nextBattleState: { tag: "activeBattle", session: active },
        characterSessions: [character],
      }),
    ).toEqual(
      Result.fail({
        tag: "battleStateCharacterSessionChanged",
        affectedCharacterIds: [character.characterId],
      }),
    );
    expect(deepStoreState(store)).toEqual(beforeRejectedStart);

    expect(
      store.commitBattleStart({
        nextBattleState: { tag: "activeBattle", session: active },
        characterSessions: [replacement],
      }),
    ).toEqual(Result.succeed(undefined));
    expect(
      store.commitBattleStart({
        nextBattleState: { tag: "activeBattle", session: active },
        characterSessions: [replacement],
      }),
    ).toEqual(
      Result.fail({
        tag: "invalidBattleStateTransition",
        from: "activeBattle",
        to: "activeBattle",
      }),
    );
    const expectedInBattle = store.characters.get(character.characterId);
    if (expectedInBattle?.tag !== "inBattle") {
      throw new Error("Expected committed in-Battle Character Session.");
    }
    const interveningInBattle = { ...expectedInBattle };
    store.characters.set(interveningInBattle);
    const beforeRejectedEnd = deepStoreState(store);
    expect(
      store.commitBattleEnd({
        battleSession: active,
        characterSettlements: [
          { expected: expectedInBattle, next: replacement },
        ],
      }),
    ).toEqual(
      Result.fail({
        tag: "battleStateCharacterSessionChanged",
        affectedCharacterIds: [character.characterId],
      }),
    );
    expect(deepStoreState(store)).toEqual(beforeRejectedEnd);

    const foreignSessionIdentity = expectRight(
      startBattle({
        battleId: active.state.battleId,
        combatants: [characterInit],
      }),
    );
    expect(
      store.commitBattleEnd({
        battleSession: foreignSessionIdentity,
        characterSettlements: [
          { expected: interveningInBattle, next: replacement },
        ],
      }),
    ).toEqual(
      Result.fail({
        tag: "battleStateSessionChanged",
        battleId: active.state.battleId,
      }),
    );
    const mismatchedSettlement = expectRight(
      availableCharacterSession({
        characterId: characterSheetId("character:mcp-atomic-mismatched-next"),
        build: druidWildShapeBuild(),
        currentHp: Hp(15),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        conditions: [],
        companion: { tag: "none" },
        unitLibrary,
        statBlockCatalog,
        druidWildShapeKnownFormStatBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS,
      }),
    );
    expect(
      store.commitBattleEnd({
        battleSession: active,
        characterSettlements: [
          { expected: interveningInBattle, next: mismatchedSettlement },
        ],
      }),
    ).toEqual(
      Result.fail({
        tag: "battleStateCharacterSettlementMismatch",
        expectedCharacterId: character.characterId,
        nextCharacterId: mismatchedSettlement.characterId,
      }),
    );
    expect(
      store.commitBattleEnd({
        battleSession: active,
        characterSettlements: [],
      }),
    ).toEqual(
      Result.fail({
        tag: "battleStateCharacterRosterMismatch",
        battleCharacterIds: [character.characterId],
        transitionCharacterIds: [],
      }),
    );

    store.characters.set(expectedInBattle);
    expect(
      store.commitBattleEnd({
        battleSession: active,
        characterSettlements: [
          { expected: expectedInBattle, next: replacement },
        ],
      }),
    ).toEqual(Result.succeed(undefined));
    expect(store.battleState).toEqual({ tag: "none" });
    expect(store.characters.get(character.characterId)).toBe(replacement);
    expect(
      store.commitBattleEnd({
        battleSession: active,
        characterSettlements: [],
      }),
    ).toEqual(
      Result.fail({
        tag: "invalidBattleStateTransition",
        from: "none",
        to: "none",
      }),
    );
    expect(
      store.commitBattleStart({
        nextBattleState: { tag: "activeBattle", session: active },
        characterSessions: [],
      }),
    ).toEqual(
      Result.fail({
        tag: "battleStateCharacterRosterMismatch",
        battleCharacterIds: [character.characterId],
        transitionCharacterIds: [],
      }),
    );

    const duplicateCharacterInit = expectRight(
      characterSheetBattleInit({
        combatantId: combatantId("mcp-atomic-battle-character-duplicate"),
        displayName: "Duplicate Atomic Character",
        sheet: replacement,
        initiative: initiativeScore(11),
        ammunitionStocks: [],
        unitLibrary,
        statBlockCatalog: root.statBlockCatalog,
      }),
    );
    const duplicateCharacterBattle = expectRight(
      startBattle({
        battleId: battleId("battle:mcp-atomic-store-duplicate"),
        combatants: [characterInit, duplicateCharacterInit],
      }),
    );
    store.characters.set(mismatchedSettlement);
    const beforeDuplicateRoster = deepStoreState(store);
    expect(
      store.commitBattleStart({
        nextBattleState: {
          tag: "activeBattle",
          session: duplicateCharacterBattle,
        },
        characterSessions: [replacement, mismatchedSettlement],
      }),
    ).toEqual(
      Result.fail({
        tag: "battleStateCharacterRosterMismatch",
        battleCharacterIds: [character.characterId, character.characterId],
        transitionCharacterIds: [
          character.characterId,
          mismatchedSettlement.characterId,
        ],
      }),
    );
    expect(deepStoreState(store)).toEqual(beforeDuplicateRoster);
  });

  test("keeps owned battle setup transitions atomic across owners", () => {
    const root = createMcpPlaySessionRoot();
    const store = createMcpSessionStore({
      statBlockCatalog: root.statBlockCatalog,
      unitLibrary: root.unitLibrary,
    });
    const goblin = assertStatBlockForTest(
      root.statBlockCatalog,
      statBlockId("stat_block_goblin_warrior"),
    );
    const combatant = expectRight(
      battleCreatureInitFromStatBlock({
        combatantId: combatantId("store-transition-goblin"),
        statBlock: goblin,
        initiative: initiativeScore(10),
        currentHp: Hp(10),
        tempHp: Hp(0),
        conditions: [],
        ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
      }),
    );
    const ownedSetup = expectRight(
      startBattleWithInitialInitiativeSetup({
        battleId: battleId("battle:store-transition-owned"),
        combatants: [combatant],
      }),
    );
    const foreignActive = expectRight(
      startBattle({
        battleId: battleId("battle:store-transition-foreign-active"),
        combatants: [combatant],
      }),
    );
    const atomicSetupStore = createMcpSessionStore({
      statBlockCatalog: root.statBlockCatalog,
      unitLibrary: root.unitLibrary,
    });
    expect(
      atomicSetupStore.commitBattleStart({
        nextBattleState: { tag: "initialInitiativeSetup", setup: ownedSetup },
        characterSessions: [],
      }),
    ).toEqual(Result.succeed(undefined));
    expect(atomicSetupStore.battleState).toEqual({
      tag: "initialInitiativeSetup",
      setup: ownedSetup,
    });
    expect(
      store.planActiveBattleRosterTransition({
        kind: "remove",
        combatantId: combatant.combatantId,
      }),
    ).toEqual(
      Result.fail({
        tag: "invalidBattleStateTransition",
        from: "none",
        to: "activeBattle",
      }),
    );
    expect(
      store.applyInitialInitiativeSwap({
        sourceId: combatant.combatantId,
        candidateId: combatant.combatantId,
        candidateWitness: { tag: "willingAlly" },
      }),
    ).toEqual(
      Result.fail({
        tag: "invalidBattleStateTransition",
        from: "none",
        to: "initialInitiativeSetup",
      }),
    );
    expect(store.finalizeInitialInitiativeSetup()).toEqual(
      Result.fail({
        tag: "invalidBattleStateTransition",
        from: "none",
        to: "activeBattle",
      }),
    );
    expect(store.storeInitialInitiativeSetup(ownedSetup)).toEqual(
      Result.succeed(undefined),
    );
    expect(store.storeActiveBattle(foreignActive)).toEqual(
      Result.fail({
        tag: "invalidBattleStateTransition",
        from: "initialInitiativeSetup",
        to: "activeBattle",
      }),
    );
    const before = store.snapshot();
    expect(
      store.applyInitialInitiativeSwap({
        sourceId: combatant.combatantId,
        candidateId: combatant.combatantId,
        candidateWitness: { tag: "willingAlly" },
      }),
    ).toEqual(
      Result.fail({
        tag: "initialInitiativeSwapRejected",
        message: "Initiative Swap requires a distinct willing ally.",
      }),
    );
    expect(store.snapshot()).toEqual(before);

    const active = expectRight(store.finalizeInitialInitiativeSetup());
    expect(store.storeInitialInitiativeSetup(ownedSetup)).toEqual(
      Result.fail({
        tag: "invalidBattleStateTransition",
        from: "activeBattle",
        to: "initialInitiativeSetup",
      }),
    );
    expect(store.storeActiveBattle(foreignActive)).toEqual(
      Result.fail({
        tag: "battleStateBattleOwnershipConflict",
        expectedBattleId: active.state.battleId,
        actualBattleId: foreignActive.state.battleId,
      }),
    );
    expect(store.battleSession).toBe(active);
  });

  test("rejects stale and foreign roster plans without changing owned state", () => {
    const root = createMcpPlaySessionRoot();
    const store = createMcpSessionStore({
      statBlockCatalog: root.statBlockCatalog,
      unitLibrary: root.unitLibrary,
    });
    const goblin = assertStatBlockForTest(
      root.statBlockCatalog,
      statBlockId("stat_block_goblin_warrior"),
    );
    const skeleton = assertStatBlockForTest(
      root.statBlockCatalog,
      statBlockId("stat_block_skeleton"),
    );
    const wolf = assertStatBlockForTest(
      root.statBlockCatalog,
      statBlockId("stat_block_wolf"),
    );
    const initial = expectRight(
      battleCreatureInitFromStatBlock({
        combatantId: combatantId("store-plan-initial"),
        statBlock: goblin,
        initiative: initiativeScore(10),
        currentHp: Hp(10),
        tempHp: Hp(0),
        conditions: [],
        ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
      }),
    );
    const staleCombatant = expectStatBlockCombatant(
      expectRight(
        battleCreatureInitFromStatBlock({
          combatantId: combatantId("store-plan-stale"),
          statBlock: skeleton,
          initiative: initiativeScore(8),
          currentHp: Hp(10),
          tempHp: Hp(0),
          conditions: [],
          ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        }),
      ),
    );
    const interveningCombatant = expectStatBlockCombatant(
      expectRight(
        battleCreatureInitFromStatBlock({
          combatantId: combatantId("store-plan-intervening"),
          statBlock: wolf,
          initiative: initiativeScore(6),
          currentHp: Hp(10),
          tempHp: Hp(0),
          conditions: [],
          ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        }),
      ),
    );
    const foreignCombatant = expectStatBlockCombatant(
      expectRight(
        battleCreatureInitFromStatBlock({
          combatantId: combatantId("store-plan-foreign"),
          statBlock: skeleton,
          initiative: initiativeScore(4),
          currentHp: Hp(10),
          tempHp: Hp(0),
          conditions: [],
          ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        }),
      ),
    );
    const active = expectRight(
      startBattle({
        battleId: battleId("battle:store-plan-owned"),
        combatants: [initial],
      }),
    );
    expect(store.storeActiveBattle(active)).toEqual(Result.succeed(undefined));

    const stale = expectRight(
      store.planActiveBattleRosterTransition({
        kind: "addStatBlock",
        combatant: staleCombatant,
      }),
    );
    const intervening = expectRight(
      store.planActiveBattleRosterTransition({
        kind: "addStatBlock",
        combatant: interveningCombatant,
      }),
    );
    expect(store.commitActiveBattleRosterTransition(intervening.plan)).toEqual(
      Result.succeed(intervening.prospectiveBattle),
    );
    const afterIntervening = deepStoreState(store);

    expect(store.commitActiveBattleRosterTransition(stale.plan)).toEqual(
      Result.fail({
        tag: "battleRosterPlanBattleChanged",
        battleId: active.state.battleId,
      }),
    );
    expect(deepStoreState(store)).toEqual(afterIntervening);

    const foreignStore = createMcpSessionStore({
      statBlockCatalog: root.statBlockCatalog,
      unitLibrary: root.unitLibrary,
    });
    expect(foreignStore.storeActiveBattle(active)).toEqual(
      Result.succeed(undefined),
    );
    const foreignPlan = expectRight(
      foreignStore.planActiveBattleRosterTransition({
        kind: "addStatBlock",
        combatant: foreignCombatant,
      }),
    );
    expect(store.commitActiveBattleRosterTransition(foreignPlan.plan)).toEqual(
      Result.fail({ tag: "battleRosterUnknownPlan" }),
    );
    expect(deepStoreState(store)).toEqual(afterIntervening);
  });

  test("rejects a roster plan after an affected Character Session identity changes", () => {
    const root = createMcpPlaySessionRoot();
    const store = createMcpSessionStore({
      statBlockCatalog: root.statBlockCatalog,
      unitLibrary: root.unitLibrary,
    });
    const character = expectRight(
      availableCharacterSession({
        characterId: characterSheetId("character:mcp-roster-stale-character"),
        build: druidWildShapeBuild(),
        currentHp: Hp(15),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        conditions: [],
        companion: { tag: "none" },
        unitLibrary,
        statBlockCatalog,
        druidWildShapeKnownFormStatBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS,
      }),
    );
    const characterInit = expectRight(
      characterSheetBattleInit({
        combatantId: combatantId("store-plan-character"),
        displayName: "Stale Character",
        sheet: character,
        initiative: initiativeScore(12),
        ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        unitLibrary,
        statBlockCatalog: root.statBlockCatalog,
      }),
    );
    const goblin = expectRight(
      battleCreatureInitFromStatBlock({
        combatantId: combatantId("store-plan-character-goblin"),
        statBlock: assertStatBlockForTest(
          root.statBlockCatalog,
          statBlockId("stat_block_goblin_warrior"),
        ),
        initiative: initiativeScore(8),
        currentHp: Hp(10),
        tempHp: Hp(0),
        conditions: [],
        ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
      }),
    );
    const active = expectRight(
      startBattle({
        battleId: battleId("battle:store-plan-character-stale"),
        combatants: [characterInit, goblin],
      }),
    );
    expect(store.storeActiveBattle(active)).toEqual(Result.succeed(undefined));
    store.characters.set({
      tag: "inBattle",
      sheet: character,
      battleId: active.state.battleId,
    });

    const planned = expectRight(
      store.planActiveBattleRosterTransition({
        kind: "remove",
        combatantId: characterInit.combatantId,
      }),
    );
    const replacement = expectRight(
      availableCharacterSession({
        characterId: character.characterId,
        build: druidWildShapeBuild(),
        currentHp: Hp(15),
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        conditions: [],
        companion: { tag: "none" },
        unitLibrary,
        statBlockCatalog,
        druidWildShapeKnownFormStatBlockIds: DRUID_WILD_SHAPE_KNOWN_FORM_IDS,
      }),
    );
    store.characters.set(replacement);
    const beforeCommit = deepStoreState(store);

    expect(store.commitActiveBattleRosterTransition(planned.plan)).toEqual(
      Result.fail({
        tag: "battleRosterPlanCharacterChanged",
        characterIds: [character.characterId],
      }),
    );
    expect(deepStoreState(store)).toEqual(beforeCommit);
  });

  test("rejects a roster plan after atomic battle transaction advancement", () => {
    const root = createMcpPlaySessionRoot();
    const store = createMcpSessionStore({
      statBlockCatalog: root.statBlockCatalog,
      unitLibrary: root.unitLibrary,
    });
    const goblin = expectRight(
      battleCreatureInitFromStatBlock({
        combatantId: combatantId("store-plan-fills-goblin"),
        statBlock: assertStatBlockForTest(
          root.statBlockCatalog,
          statBlockId("stat_block_goblin_warrior"),
        ),
        initiative: initiativeScore(10),
        currentHp: Hp(10),
        tempHp: Hp(0),
        conditions: [],
        ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
      }),
    );
    const skeleton = expectStatBlockCombatant(
      expectRight(
        battleCreatureInitFromStatBlock({
          combatantId: combatantId("store-plan-fills-skeleton"),
          statBlock: assertStatBlockForTest(
            root.statBlockCatalog,
            statBlockId("stat_block_skeleton"),
          ),
          initiative: initiativeScore(6),
          currentHp: Hp(10),
          tempHp: Hp(0),
          conditions: [],
          ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        }),
      ),
    );
    const active = expectRight(
      startBattle({
        battleId: battleId("battle:store-plan-fills-stale"),
        combatants: [goblin],
      }),
    );
    expect(store.storeActiveBattle(active)).toEqual(Result.succeed(undefined));
    const planned = expectRight(
      store.planActiveBattleRosterTransition({
        kind: "addStatBlock",
        combatant: skeleton,
      }),
    );
    const subjectAct = discoverBattleActs(active)[0];
    if (subjectAct === undefined) {
      throw new Error("Expected an active battle subject for pending fills.");
    }
    const pending = settleBattleRuntimeTransaction({
      session: active,
      transaction: null,
      operation: {
        kind: "ordinarySubject",
        subject: subjectAct.subject,
        fills: [],
      },
      statBlockCatalog: root.statBlockCatalog,
    });
    if (pending.tag !== "needsHoles") {
      throw new Error("Expected a pending battle transaction for the plan.");
    }
    expect(pending.transaction).toBeDefined();
    expect(store.storeBattleTransactionResult(active, pending)).toEqual(
      Result.succeed(undefined),
    );
    const beforeCommit = deepStoreState(store);

    expect(store.commitActiveBattleRosterTransition(planned.plan)).toEqual(
      Result.fail({ tag: "battleRosterPlanFillsChanged" }),
    );
    expect(deepStoreState(store)).toEqual(beforeCommit);
  });
});

function deepStoreState(store: ReturnType<typeof createMcpSessionStore>) {
  return structuredClone({
    snapshot: store.snapshot(),
    battleState: store.battleState,
    battleSession: store.battleSession,
    characters: Array.from(store.characters.entries()),
    pendingBattleTransaction: store.getPendingBattleTransaction(),
  });
}

function druidWildShapeBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId(unitId("class_druid")),
      advancements: [
        {
          classUnitId: classUnitId(unitId("class_druid")),
          hitPointRule: { tag: "fixedHigherLevelGain" },
        },
      ],
    },
    background: unitId("background_soldier"),
    species: unitId("species_orc"),
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 10,
        dex: 14,
        con: 13,
        int: 8,
        wis: 16,
        cha: 12,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    magicInitiateSpellAccesses: [],
    equipment: {
      startingEquipmentCurrencyRemainderCp: copperPieceAmount(0),
      owned: [],
      loadout: {},
    },
    spellcasting: {
      sources: [
        {
          sourceUnitId: unitId("class_druid"),
          spellcastingAbility: "wis",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["druidic_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [{ spellLevel: 1, count: 3 }],
        },
      },
    },
  };
}

function expectRight<T, E>(value: Result.Result<T, E>): T {
  if (Result.isFailure(value)) {
    throw new Error(`Expected success: ${JSON.stringify(value.failure)}`);
  }
  return value.success;
}

function expectStatBlockCombatant(
  combatant: import("@dnd/battle-runtime").BattleCreatureInit,
): BattleRosterStatBlockCombatant {
  if (combatant.creatureInit.kind !== "statBlock") {
    throw new Error("Expected a Stat Block combatant.");
  }
  return {
    ...combatant,
    creatureInit: combatant.creatureInit,
  };
}
