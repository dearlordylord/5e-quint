import { Result } from "effect";
import { unitId } from "@dnd/shared/game-facts";
import { describe, expect, test } from "vitest";

import { battleId, battleObjectId, combatantId } from "../identity.ts";
import {
  characterSeed,
  startBattleRight,
  statBlockCreatureInit,
  testCharacterWeaponAttackForUnit,
} from "../battle-runtime.test-support.ts";
import {
  addBattleCombatant,
  addBattleRuntimeCombatant,
  applyInitiativeSwap,
  battleStateInitIssueFromAdmissionIssues,
  createInitialInitiativeForCombatants,
  finishInitialInitiativeSetup as finishInitialInitiativeSetupFromApi,
  removeBattleRuntimeCombatants,
  requiredInitiativeRollModeForCombatant,
  startBattle,
  startBattleWithInitialInitiativeSetup as startBattleWithInitialInitiativeSetupFromApi,
} from "./api-lifecycle.ts";

describe("battle lifecycle admission issue aggregation", () => {
  const baseCombatant = characterSeed({ initiative: 20 });

  function mismatchedMainHandCombatant() {
    return characterSeed({
      combatantId: combatantId("mismatched-main"),
      initiative: 18,
      attack: testCharacterWeaponAttackForUnit(unitId("weapon_longsword")),
      selectedLoadout: {
        weapon: {
          itemId: battleObjectId("main:weapon_dagger"),
          unitId: unitId("weapon_dagger"),
          grip: "one_handed",
        },
      },
    });
  }

  function mismatchedBothHandsCombatant() {
    return characterSeed({
      combatantId: combatantId("mismatched-both"),
      initiative: 18,
      attack: testCharacterWeaponAttackForUnit(unitId("weapon_longsword")),
      offHandAttack: testCharacterWeaponAttackForUnit(unitId("weapon_dagger")),
      selectedLoadout: {
        weapon: {
          itemId: battleObjectId("main:weapon_dagger"),
          unitId: unitId("weapon_dagger"),
          grip: "one_handed",
        },
        offHandWeapon: {
          itemId: battleObjectId("off:weapon_shortsword"),
          unitId: unitId("weapon_shortsword"),
        },
      },
    });
  }

  test("startBattle returns a single leaf issue when there is one admission failure", () => {
    const result = startBattle({
      battleId: battleId("single-issue"),
      combatants: [mismatchedMainHandCombatant()],
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure).toEqual({
        tag: "weaponLoadoutMismatch",
        slot: "main-hand",
      });
    }
  });

  test("startBattle rejects empty and duplicate combatant rosters as typed boundary issues", () => {
    const empty = startBattle({
      battleId: battleId("empty-roster"),
      combatants: [],
    });
    expect(Result.isFailure(empty)).toBe(true);
    if (Result.isFailure(empty)) {
      expect(empty.failure).toEqual({
        tag: "battleStateInitIssue",
        message: "startBattle requires at least one combatant.",
      });
    }

    const duplicate = startBattle({
      battleId: battleId("duplicate-roster"),
      combatants: [baseCombatant, baseCombatant],
    });
    expect(Result.isFailure(duplicate)).toBe(true);
    if (Result.isFailure(duplicate)) {
      expect(duplicate.failure).toEqual({
        tag: "battleStateInitIssue",
        message: `Duplicate combatant id: ${baseCombatant.combatantId}`,
      });
    }
  });

  test("initial Initiative rejects incomplete caller ordering and empty rosters", () => {
    const state = startBattleRight({
      battleId: battleId("initiative-order-boundary"),
      combatants: [baseCombatant],
    });
    const combatant = state.combatants.get(baseCombatant.combatantId);
    expect(combatant).toBeDefined();
    if (combatant === undefined) return;

    const incompleteOrder = createInitialInitiativeForCombatants({
      combatants: [combatant],
      initialCombatantOrder: new Map(),
      emptyRosterMessage: "synthetic empty roster",
    });
    expect(Result.isFailure(incompleteOrder)).toBe(true);
    if (Result.isFailure(incompleteOrder)) {
      expect(incompleteOrder.failure).toEqual({
        tag: "battleStateInitIssue",
        message: "Initial combatant order must include every combatant.",
      });
    }

    const empty = createInitialInitiativeForCombatants({
      combatants: [],
      emptyRosterMessage: "synthetic empty roster",
    });
    expect(Result.isFailure(empty)).toBe(true);
    if (Result.isFailure(empty)) {
      expect(empty.failure).toEqual({
        tag: "battleStateInitIssue",
        message: "synthetic empty roster",
      });
    }
  });

  test("startBattle returns a flat aggregate retaining both slots when there are two admission failures", () => {
    const result = startBattle({
      battleId: battleId("aggregate-issue"),
      combatants: [mismatchedBothHandsCombatant()],
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure).toEqual({
        tag: "battleStateInitIssues",
        issues: [
          { tag: "weaponLoadoutMismatch", slot: "main-hand" },
          { tag: "weaponLoadoutMismatch", slot: "off-hand" },
        ],
      });
    }
  });

  test("addBattleCombatant follows the same leaf/aggregate contract as startBattle", () => {
    const state = startBattleRight({
      battleId: battleId("add-combatant"),
      combatants: [baseCombatant],
    });

    const single = addBattleCombatant({
      state,
      combatant: mismatchedMainHandCombatant(),
    });
    expect(Result.isFailure(single)).toBe(true);
    if (Result.isFailure(single)) {
      expect(single.failure).toEqual({
        tag: "weaponLoadoutMismatch",
        slot: "main-hand",
      });
    }

    const aggregate = addBattleCombatant({
      state,
      combatant: mismatchedBothHandsCombatant(),
    });
    expect(Result.isFailure(aggregate)).toBe(true);
    if (Result.isFailure(aggregate)) {
      expect(aggregate.failure).toEqual({
        tag: "battleStateInitIssues",
        issues: [
          { tag: "weaponLoadoutMismatch", slot: "main-hand" },
          { tag: "weaponLoadoutMismatch", slot: "off-hand" },
        ],
      });
    }
  });

  test("runtime add/remove keeps authored context aligned with the combatant roster", () => {
    const started = startBattle({
      battleId: battleId("runtime-roster-context"),
      combatants: [baseCombatant],
    });
    expect(Result.isSuccess(started)).toBe(true);
    if (Result.isFailure(started)) return;

    const addedCombatant = characterSeed({
      combatantId: combatantId("runtime-added-character"),
      initiative: 18,
    });
    const added = addBattleRuntimeCombatant({
      session: started.success,
      combatant: addedCombatant,
    });
    expect(Result.isSuccess(added)).toBe(true);
    if (Result.isFailure(added)) return;
    expect(added.success.state.combatants.has(addedCombatant.combatantId)).toBe(
      true,
    );
    expect(
      added.success.context.characters.has(addedCombatant.combatantId),
    ).toBe(true);

    const addedStatBlock = statBlockCreatureInit({
      combatantId: combatantId("runtime-added-stat-block"),
      initiative: 16,
    });
    const addedWithStatBlock = addBattleRuntimeCombatant({
      session: added.success,
      combatant: addedStatBlock,
    });
    expect(Result.isSuccess(addedWithStatBlock)).toBe(true);
    if (Result.isFailure(addedWithStatBlock)) return;
    expect(
      addedWithStatBlock.success.context.statBlocks.has(
        addedStatBlock.combatantId,
      ),
    ).toBe(true);
    expect(
      addedWithStatBlock.success.context.characters.has(
        addedCombatant.combatantId,
      ),
    ).toBe(true);

    const removed = removeBattleRuntimeCombatants({
      session: addedWithStatBlock.success,
      combatantIds: [addedCombatant.combatantId, addedStatBlock.combatantId],
    });
    expect(Result.isSuccess(removed)).toBe(true);
    if (Result.isFailure(removed)) return;
    expect(
      removed.success.state.combatants.has(addedCombatant.combatantId),
    ).toBe(false);
    expect(
      removed.success.context.characters.has(addedCombatant.combatantId),
    ).toBe(false);
    expect(
      removed.success.context.statBlocks.has(addedStatBlock.combatantId),
    ).toBe(false);
    expect(
      requiredInitiativeRollModeForCombatant(
        removed.success.state,
        baseCombatant.combatantId,
      ),
    ).toBeUndefined();
  });

  test("battleStateInitIssueFromAdmissionIssues returns a single leaf for one issue", () => {
    const result = battleStateInitIssueFromAdmissionIssues([
      { tag: "weaponLoadoutMismatch", slot: "main-hand" },
    ]);

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure).toEqual({
        tag: "weaponLoadoutMismatch",
        slot: "main-hand",
      });
    }
  });

  test("battleStateInitIssueFromAdmissionIssues aggregates two or more issues", () => {
    const result = battleStateInitIssueFromAdmissionIssues([
      { tag: "weaponLoadoutMismatch", slot: "main-hand" },
      { tag: "weaponLoadoutMismatch", slot: "off-hand" },
      { tag: "battleStateInitIssue", message: "third issue" },
    ]);

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure).toEqual({
        tag: "battleStateInitIssues",
        issues: [
          { tag: "weaponLoadoutMismatch", slot: "main-hand" },
          { tag: "weaponLoadoutMismatch", slot: "off-hand" },
          { tag: "battleStateInitIssue", message: "third issue" },
        ],
      });
    }
  });

  test("battleStateInitIssueFromAdmissionIssues converts support-profile issues to leaf issues", () => {
    const result = battleStateInitIssueFromAdmissionIssues([
      {
        tag: "battleUnitSupportProfileIssue",
        message: "support profile mismatch",
      },
    ]);

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure).toEqual({
        tag: "battleStateInitIssue",
        message: "support profile mismatch",
      });
    }
  });

  test("public setup and roster APIs preserve typed lifecycle rejection boundaries", () => {
    const emptySetup = startBattleWithInitialInitiativeSetupFromApi({
      battleId: battleId("empty-initial-setup"),
      combatants: [],
    });
    expect(emptySetup).toMatchObject({
      _tag: "Left",
      left: {
        tag: "battleStateInitIssue",
        message: "startBattle requires at least one combatant.",
      },
    });

    const statBlock = statBlockCreatureInit({
      combatantId: combatantId("lifecycle-stat-block"),
      initiative: 10,
    });
    const setupResult = startBattleWithInitialInitiativeSetupFromApi({
      battleId: battleId("initial-setup-boundaries"),
      combatants: [baseCombatant, statBlock],
    });
    expect(Result.isSuccess(setupResult)).toBe(true);
    if (Result.isFailure(setupResult)) return;

    const setup = setupResult.success;
    expect(
      requiredInitiativeRollModeForCombatant(
        setup.state,
        statBlock.combatantId,
      ),
    ).toBeUndefined();
    expect(
      requiredInitiativeRollModeForCombatant(
        setup.state,
        combatantId("missing-initiative-actor"),
      ),
    ).toBeUndefined();
    expect(
      requiredInitiativeRollModeForCombatant(
        setup.state,
        baseCombatant.combatantId,
      ),
    ).toBeUndefined();

    expect(
      applyInitiativeSwap({
        setup,
        sourceId: baseCombatant.combatantId,
        candidateId: baseCombatant.combatantId,
        candidateWitness: { tag: "willingAlly" },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Initiative Swap requires a distinct willing ally.",
      },
    });
    expect(
      applyInitiativeSwap({
        setup,
        sourceId: combatantId("missing-initiative-source"),
        candidateId: statBlock.combatantId,
        candidateWitness: { tag: "willingAlly" },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: "Initiative Swap source must be a combatant in this battle.",
      },
    });
    expect(
      applyInitiativeSwap({
        setup,
        sourceId: baseCombatant.combatantId,
        candidateId: combatantId("missing-initiative-candidate"),
        candidateWitness: { tag: "willingAlly" },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Initiative Swap candidate must be a combatant in this battle.",
      },
    });
    expect(
      applyInitiativeSwap({
        setup,
        sourceId: baseCombatant.combatantId,
        candidateId: statBlock.combatantId,
        candidateWitness: { tag: "willingAlly" },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message:
          "Initiative Swap source lacks an admitted Initiative swap support profile.",
      },
    });

    const finished = finishInitialInitiativeSetupFromApi(setup);
    expect(finished.state).toBe(setup.state);
    expect(
      applyInitiativeSwap({
        setup,
        sourceId: baseCombatant.combatantId,
        candidateId: statBlock.combatantId,
        candidateWitness: { tag: "willingAlly" },
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: "Initial Initiative setup is already complete." },
    });

    expect(
      addBattleRuntimeCombatant({
        session: finished,
        combatant: baseCombatant,
      }),
    ).toMatchObject({
      _tag: "Left",
      left: {
        message: `Duplicate combatant id: ${baseCombatant.combatantId}`,
      },
    });
  });
});
