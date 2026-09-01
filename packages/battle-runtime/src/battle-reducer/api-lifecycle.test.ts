import { Result } from "effect";
import { statBlockId, unitId } from "@dnd/shared/game-facts";
import { Hp } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import {
  battleCompanionFormId,
  battleId,
  battleObjectId,
  combatantId,
} from "../identity.ts";
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
  battleInitializationIssueFactFields,
  battleInitializationIssueLeaves,
  createInitialInitiativeForCombatants,
  finishInitialInitiativeSetup as finishInitialInitiativeSetupFromApi,
  removeBattleRuntimeCombatants,
  requiredInitiativeRollModeForCombatant,
  startBattle,
  startBattleWithInitialInitiativeSetup as startBattleWithInitialInitiativeSetupFromApi,
} from "./api-lifecycle.ts";
import type {
  BattleInitializationIssue,
  BattleInitializationIssueFacts,
  BattleInitializationLeafIssue,
} from "../battle-state-execution.ts";

describe("battle lifecycle admission issue aggregation", () => {
  const baseCombatant = characterSeed({ initiative: 20 });

  function mismatchedMainHandCombatant(id = "mismatched-main") {
    return characterSeed({
      combatantId: combatantId(id),
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

  function missingWeaponPresentationCombatant(id: string, initiative: number) {
    const character = characterSeed({
      combatantId: combatantId(id),
      initiative,
    });
    if (character.creatureInit.kind !== "character") {
      throw new Error("Expected character fixture.");
    }
    return {
      ...character,
      creatureInit: {
        ...character.creatureInit,
        characterUnitRefs: [],
      },
    };
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
        ownerPath: ["initialCombatants", 0],
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
        kind: "emptyRoster",
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
        kind: "duplicateCombatantId",
        combatantId: baseCombatant.combatantId,
        ownerPath: ["initialCombatants", 1],
      });
    }
  });

  test("projects every initialization fact without dropping its structured fields", () => {
    const factCombatantId = combatantId("initialization-fact-combatant");
    const otherFactCombatantId = combatantId(
      "initialization-fact-other-combatant",
    );
    const factStatBlockId = statBlockId("initialization-fact-stat-block");
    const otherFactStatBlockId = statBlockId(
      "initialization-fact-other-stat-block",
    );
    const factWeaponUnitId = unitId("initialization-fact-weapon");
    const facts = [
      { kind: "emptyRoster" },
      {
        kind: "duplicateCombatantId",
        combatantId: factCombatantId,
      },
      {
        kind: "ammunitionStockInvalid",
        combatantId: factCombatantId,
        ammunition: "arrow",
      },
      {
        kind: "currentHpExceedsMaximum",
        combatantId: factCombatantId,
        currentHp: Hp(3),
        maximumHp: Hp(2),
      },
      {
        kind: "positiveHpUnconsciousInvalid",
        combatantId: factCombatantId,
        requirement: "oneCurrentHp",
      },
      {
        kind: "zeroHpLifecycleInvalid",
        combatantId: factCombatantId,
        requirement: "absentAtPositiveHp",
      },
      {
        kind: "initialConditionImmune",
        combatantId: factCombatantId,
        condition: "blinded",
      },
      {
        kind: "statBlockSourceInvalid",
        statBlockId: factStatBlockId,
        constraint: "literalArmorClassRequired",
      },
      {
        kind: "statBlockCombatantInvalid",
        combatantId: factCombatantId,
        constraint: "concreteCreatureTypeRequired",
      },
      {
        kind: "characterClassLevelsInvalid",
        combatantId: factCombatantId,
        issueIndex: 0,
      },
      {
        kind: "characterSupportProjectionInvalid",
        combatantId: factCombatantId,
        issueIndex: 1,
      },
      {
        kind: "characterResourceInvalid",
        combatantId: factCombatantId,
        issueIndex: 2,
      },
      {
        kind: "characterFeatureInvalid",
        combatantId: factCombatantId,
        issueIndex: 3,
      },
      {
        kind: "characterSpellcastingInvalid",
        combatantId: factCombatantId,
        issueIndex: 4,
      },
      {
        kind: "characterAdmissionInvalid",
        combatantId: factCombatantId,
        phase: "weaponExecution",
        issueIndex: 5,
      },
      {
        kind: "executionScopeUnavailable",
        combatantId: factCombatantId,
      },
      {
        kind: "runtimeContextMissing",
        combatantId: factCombatantId,
      },
      {
        kind: "weaponPresentationUnavailable",
        combatantId: factCombatantId,
        weaponUnitId: factWeaponUnitId,
        availability: "missing",
      },
      {
        kind: "hidePrerequisiteReferencesUnknownCombatant",
        combatantId: factCombatantId,
        referencedCombatantId: otherFactCombatantId,
      },
      {
        kind: "hidePrerequisiteSelfReference",
        combatantId: factCombatantId,
      },
      {
        kind: "initialCombatantOrderMissing",
        combatantId: factCombatantId,
      },
      {
        kind: "initialInitiativeInvalid",
        initializationReason: "emptyRoster",
      },
      {
        kind: "runtimeAdmissionInvalid",
        combatantId: factCombatantId,
        origin: "character",
        issueIndex: 6,
      },
      {
        kind: "companionOwnerMissing",
        ownerId: factCombatantId,
      },
      {
        kind: "companionDurableIdentityMissing",
        ownerId: factCombatantId,
      },
      {
        kind: "companionOwnerAlreadyHasCompanion",
        ownerId: factCombatantId,
      },
      {
        kind: "companionDurableIdentityInUse",
        ownerId: factCombatantId,
        durableCompanionId: "initialization-fact-companion",
        existingOwnerId: otherFactCombatantId,
      },
      {
        kind: "companionManifestationInvalid",
        ownerId: factCombatantId,
        requirement: "embodiedOutsideBattle",
      },
      {
        kind: "companionFormStatBlockMissing",
        formAccess: "spawnedCompanion",
        resolvedStatBlockId: factStatBlockId,
      },
      {
        kind: "companionFormAccessMismatch",
        storedFormAccess: "spawnedCompanion",
        eligibilityFormAccess: "pactOfTheChain",
      },
      {
        kind: "companionFormResolvedStatBlockMismatch",
        formAccess: "spawnedCompanion",
        expectedStatBlockId: factStatBlockId,
        resolvedStatBlockId: otherFactStatBlockId,
      },
      {
        kind: "companionFormSelectionStatBlockMissing",
        formAccess: "spawnedCompanion",
        selectedStatBlockId: factStatBlockId,
      },
      {
        kind: "companionFormSelectionStatBlockInvalid",
        formAccess: "spawnedCompanion",
        selectedStatBlockId: factStatBlockId,
        expectedCreatureType: "beast",
        expectedChallengeRating: 0,
      },
      {
        kind: "companionFormSpecialFormUnknown",
        formAccess: "pactOfTheChain",
        formId: battleCompanionFormId("initialization-fact-special-form"),
      },
      {
        kind: "companionFormNormalFormIneligible",
        formAccess: "spawnedCompanion",
        formId: battleCompanionFormId("initialization-fact-normal-form"),
      },
      {
        kind: "companionCombatantAdmissionInvalid",
        ownerId: factCombatantId,
        companionCombatantId: otherFactCombatantId,
      },
      {
        kind: "companionInitialInitiativeInvalid",
        ownerId: factCombatantId,
        companionCombatantId: otherFactCombatantId,
        requirement: "stackConstruction",
      },
      {
        kind: "companionOwnerRuntimeContextMissing",
        ownerId: factCombatantId,
      },
      {
        kind: "companionPresentationStatBlockMissing",
        companionCombatantId: otherFactCombatantId,
        statBlockId: factStatBlockId,
      },
      {
        kind: "companionPresentationCombatantMissing",
        companionCombatantId: otherFactCombatantId,
        statBlockId: factStatBlockId,
      },
    ] satisfies ReadonlyArray<BattleInitializationIssueFacts>;

    for (const fact of facts) {
      const { kind, ...fields } = fact;
      expect(battleInitializationIssueFactFields(fact)).toEqual({
        reason: kind,
        ...fields,
      });
    }

    const first = {
      tag: "battleStateInitIssue",
      message: "fact leaf",
      kind: "emptyRoster",
    } as const satisfies BattleInitializationLeafIssue;
    const second = {
      tag: "weaponLoadoutMismatch",
      slot: "off-hand",
    } as const satisfies BattleInitializationLeafIssue;
    const nested = {
      tag: "battleStateInitIssues",
      issues: [first, second],
    } as const satisfies BattleInitializationIssue;
    expect(battleInitializationIssueLeaves(nested)).toEqual([first, second]);
    expect(battleInitializationIssueLeaves(first)).toEqual([first]);
    expect(battleInitializationIssueLeaves(second)).toEqual([second]);
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
          {
            tag: "weaponLoadoutMismatch",
            slot: "main-hand",
            ownerPath: ["initialCombatants", 0],
          },
          {
            tag: "weaponLoadoutMismatch",
            slot: "off-hand",
            ownerPath: ["initialCombatants", 0],
          },
        ],
      });
    }
  });

  test("startBattle accumulates independent admission failures across combatants", () => {
    const result = startBattle({
      battleId: battleId("aggregate-cross-combatant-issues"),
      combatants: [
        mismatchedMainHandCombatant(),
        mismatchedMainHandCombatant("mismatched-main-second"),
      ],
    });

    expect(Result.isFailure(result)).toBe(true);
    if (Result.isFailure(result)) {
      expect(result.failure).toEqual({
        tag: "battleStateInitIssues",
        issues: [
          {
            tag: "weaponLoadoutMismatch",
            slot: "main-hand",
            ownerPath: ["initialCombatants", 0],
          },
          {
            tag: "weaponLoadoutMismatch",
            slot: "main-hand",
            ownerPath: ["initialCombatants", 1],
          },
        ],
      });
    }
  });

  test.each([
    {
      name: "invalid entry first",
      combatants: [
        mismatchedMainHandCombatant("shared-combatant"),
        characterSeed({
          combatantId: combatantId("shared-combatant"),
          initiative: 16,
        }),
      ],
      issues: [
        {
          tag: "weaponLoadoutMismatch",
          slot: "main-hand",
          ownerPath: ["initialCombatants", 0],
        },
        {
          tag: "battleStateInitIssue",
          kind: "duplicateCombatantId",
          combatantId: "shared-combatant",
          ownerPath: ["initialCombatants", 1],
          message: "Duplicate combatant id: shared-combatant",
        },
      ],
    },
    {
      name: "valid entry first",
      combatants: [
        characterSeed({
          combatantId: combatantId("shared-combatant"),
          initiative: 20,
        }),
        mismatchedMainHandCombatant("shared-combatant"),
      ],
      issues: [
        {
          tag: "battleStateInitIssue",
          kind: "duplicateCombatantId",
          combatantId: "shared-combatant",
          ownerPath: ["initialCombatants", 1],
          message: "Duplicate combatant id: shared-combatant",
        },
        {
          tag: "weaponLoadoutMismatch",
          slot: "main-hand",
          ownerPath: ["initialCombatants", 1],
        },
      ],
    },
  ])(
    "startBattle retains duplicate and admission issues when $name",
    ({ combatants, issues }) => {
      const result = startBattle({
        battleId: battleId(`duplicate-and-admission-${issues.length}`),
        combatants,
      });

      expect(result).toEqual(
        Result.fail({
          tag: "battleStateInitIssues",
          issues,
        }),
      );
    },
  );

  test("startBattle accumulates missing weapon presentation sources across characters", () => {
    const result = startBattle({
      battleId: battleId("aggregate-presentation-sources"),
      combatants: [
        missingWeaponPresentationCombatant("missing-source-first", 20),
        missingWeaponPresentationCombatant("missing-source-second", 18),
      ],
    });

    expect(result).toEqual(
      Result.fail({
        tag: "battleStateInitIssues",
        issues: [
          {
            tag: "battleStateInitIssue",
            kind: "weaponPresentationUnavailable",
            combatantId: "missing-source-first",
            weaponUnitId: "weapon_longsword",
            availability: "missing",
            ownerPath: ["initialCombatants", 0],
            message:
              "Character missing-source-first weapon weapon_longsword has missing authored presentation source.",
          },
          {
            tag: "battleStateInitIssue",
            kind: "weaponPresentationUnavailable",
            combatantId: "missing-source-second",
            weaponUnitId: "weapon_longsword",
            availability: "missing",
            ownerPath: ["initialCombatants", 1],
            message:
              "Character missing-source-second weapon weapon_longsword has missing authored presentation source.",
          },
        ],
      }),
    );
  });

  test("startBattle accumulates admission and presentation issues across stages", () => {
    const result = startBattle({
      battleId: battleId("aggregate-admission-and-presentation"),
      combatants: [
        mismatchedMainHandCombatant("loadout-mismatch"),
        missingWeaponPresentationCombatant("missing-source", 16),
      ],
    });

    expect(result).toEqual(
      Result.fail({
        tag: "battleStateInitIssues",
        issues: [
          {
            tag: "weaponLoadoutMismatch",
            slot: "main-hand",
            ownerPath: ["initialCombatants", 0],
          },
          {
            tag: "battleStateInitIssue",
            kind: "weaponPresentationUnavailable",
            combatantId: "missing-source",
            weaponUnitId: "weapon_longsword",
            availability: "missing",
            ownerPath: ["initialCombatants", 1],
            message:
              "Character missing-source weapon weapon_longsword has missing authored presentation source.",
          },
        ],
      }),
    );
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
        ownerPath: ["combatant"],
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
          {
            tag: "weaponLoadoutMismatch",
            slot: "main-hand",
            ownerPath: ["combatant"],
          },
          {
            tag: "weaponLoadoutMismatch",
            slot: "off-hand",
            ownerPath: ["combatant"],
          },
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
      _tag: "Failure",
      failure: {
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
      _tag: "Failure",
      failure: {
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
      _tag: "Failure",
      failure: {
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
      _tag: "Failure",
      failure: {
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
      _tag: "Failure",
      failure: {
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
      _tag: "Failure",
      failure: { message: "Initial Initiative setup is already complete." },
    });

    expect(
      addBattleRuntimeCombatant({
        session: finished,
        combatant: baseCombatant,
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: {
        message: `Duplicate combatant id: ${baseCombatant.combatantId}`,
      },
    });
  });
});
