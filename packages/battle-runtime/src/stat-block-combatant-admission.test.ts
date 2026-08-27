import { Hp } from "@dnd/shared/types";
import { initiativeEntries } from "@dnd/shared-algebras/initiative-algebra";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { Result } from "effect";
import { describe, expect, test } from "vitest";

import { addBattleStatBlockCombatant } from "./battle-reducer/stat-block-combatant-execution.ts";
import { battleCreatureInitFromStatBlock } from "./battle-init.ts";
import { battleAmmunitionStock } from "./battle-ammunition.ts";
import {
  battleExecutionScopeOrdinal,
  battleId,
  combatantId,
  initiativeScore,
} from "./identity.ts";
import { admitBattleStatBlockCombatant } from "./stat-block-combatant-admission.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import { startBattle } from "./battle-reducer/api-lifecycle.ts";
import {
  characterSeed,
  fighterId,
  removeBattleCombatantsRight,
  startBattleRight,
  statBlockCreatureInit,
  statBlockRecord,
} from "./battle-runtime.test-support.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.INITIAL_CONDITION_IMMUNITY

describe("Stat Block combatant admission capability", () => {
  const admittedCombatantId = combatantId("admitted-stat-block");
  const otherCombatantId = combatantId("other-stat-block");

  function admittedFor(
    admittedBattleId: ReturnType<typeof battleId>,
    combatant = admittedCombatantId,
  ) {
    const source = statBlockRecord();
    const admission = admitBattleStatBlockCombatant({
      battleId: admittedBattleId,
      combatantId: combatant,
      statBlock: source,
      startingScopeOrdinal: battleExecutionScopeOrdinal(0),
    });
    if (Result.isFailure(admission))
      throw new Error(battleStateInitIssueMessage(admission.failure));
    return { admission: admission.success, source };
  }

  function destinationState(destinationBattleId: ReturnType<typeof battleId>) {
    return startBattleRight({
      battleId: destinationBattleId,
      combatants: [characterSeed({ initiative: 20 })],
    });
  }

  function combatantFor(
    admission: ReturnType<typeof admittedFor>["admission"],
    input: {
      readonly initiative?: ReturnType<typeof initiativeScore>;
      readonly currentHp?: Hp;
    } = {},
  ): Parameters<typeof addBattleStatBlockCombatant>[0]["combatant"] {
    return {
      combatantId: admission.combatantId,
      initiative: input.initiative ?? initiativeScore(10),
      admission,
      currentHp: input.currentHp ?? Hp(1),
      tempHp: Hp(0),
      ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
      reactionAvailable: true,
    };
  }

  test("rejects unresolved choose-one resistance before execution allocation", () => {
    const source = statBlockRecord();
    const admission = admitBattleStatBlockCombatant({
      battleId: battleId("unresolved-resistance-choice"),
      combatantId: admittedCombatantId,
      statBlock: {
        ...source,
        statBlock: {
          ...source.statBlock,
          resistances: { kind: "choose_one_from", options: ["fire"] },
        },
      },
      startingScopeOrdinal: battleExecutionScopeOrdinal(0),
    });

    expect(
      Result.isFailure(admission)
        ? battleStateInitIssueMessage(admission.failure)
        : "admitted",
    ).toBe(
      "Battle runtime requires Stat Block resistance choices to be resolved before admission.",
    );
  });

  test("rejects fractional maximum HP as a typed issue before branding", () => {
    const source = statBlockRecord();
    const admission = admitBattleStatBlockCombatant({
      battleId: battleId("fractional-stat-block-hp"),
      combatantId: admittedCombatantId,
      statBlock: {
        ...source,
        statBlock: {
          ...source.statBlock,
          hp: { kind: "literal", value: 1.5 },
        },
      },
      startingScopeOrdinal: battleExecutionScopeOrdinal(0),
    });

    expect(
      Result.isFailure(admission)
        ? battleStateInitIssueMessage(admission.failure)
        : "admitted",
    ).toBe(
      "Battle runtime requires Stat Block maximum HP to be a positive integer.",
    );
  });

  test("returns a typed issue for nonliteral Stat Block initialization facts", () => {
    const source = statBlockRecord();
    const initialized = battleCreatureInitFromStatBlock({
      combatantId: admittedCombatantId,
      initiative: initiativeScore(10),
      ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
      conditions: [],
      statBlock: {
        ...source,
        statBlock: {
          ...source.statBlock,
          ac: { kind: "caster_derived", source: "spell_save_dc" },
        },
      },
    });

    expect(
      Result.isFailure(initialized)
        ? battleStateInitIssueMessage(initialized.failure)
        : "initialized",
    ).toBe("Battle runtime requires literal Stat Block Armor Class.");
  });

  test("retains caller-supplied initial conditions for Stat Block creatures", () => {
    const source = statBlockRecord();
    const initialized = battleCreatureInitFromStatBlock({
      combatantId: admittedCombatantId,
      initiative: initiativeScore(10),
      ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
      conditions: ["prone"],
      statBlock: source,
    });
    expect(Result.isSuccess(initialized)).toBe(true);
    if (Result.isFailure(initialized)) return;

    const started = startBattle({
      battleId: battleId("initial-stat-block-condition"),
      combatants: [initialized.success],
    });
    expect(Result.isSuccess(started)).toBe(true);
    if (Result.isFailure(started)) return;

    const combatant = started.success.state.combatants.get(admittedCombatantId);
    expect(combatant).toBeDefined();
    if (combatant === undefined) return;
    expect(hasCondition(combatant.conditions, "prone")).toBe(true);
  });

  test("startBattle rejects copied Stat Block initialization with an immune condition", () => {
    const source = statBlockRecord();
    const init = statBlockCreatureInit({
      initiative: 10,
      statBlock: {
        ...source,
        statBlock: {
          ...source.statBlock,
          immunities: { conditions: ["prone"] },
        },
      },
    });
    const directInit = {
      ...init,
      creatureInit: {
        ...init.creatureInit,
        conditions: ["prone"] as const,
      },
    };

    const result = startBattle({
      battleId: battleId("direct-stat-block-condition-immunity"),
      combatants: [directInit],
    });

    expect(
      Result.isFailure(result)
        ? battleStateInitIssueMessage(result.failure)
        : "started",
    ).toBe("Stat Block combatant is immune to initial prone condition.");
  });

  test("startBattle admits copied Stat Block initialization with a valid condition", () => {
    const init = statBlockCreatureInit({ initiative: 10 });
    const directInit = {
      ...init,
      creatureInit: {
        ...init.creatureInit,
        conditions: ["prone"] as const,
      },
    };

    const result = startBattle({
      battleId: battleId("direct-stat-block-condition-valid"),
      combatants: [directInit],
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isFailure(result)) return;
    const combatant = result.success.state.combatants.get(
      directInit.combatantId,
    );
    expect(combatant).toBeDefined();
    if (combatant === undefined) return;
    expect(hasCondition(combatant.conditions, "prone")).toBe(true);
  });

  test("rejects an initial condition forbidden by the Stat Block", () => {
    const source = statBlockRecord();
    const initialized = battleCreatureInitFromStatBlock({
      combatantId: admittedCombatantId,
      initiative: initiativeScore(10),
      ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
      conditions: ["prone"],
      statBlock: {
        ...source,
        statBlock: {
          ...source.statBlock,
          immunities: { conditions: ["prone"] },
        },
      },
    });

    expect(
      Result.isFailure(initialized)
        ? battleStateInitIssueMessage(initialized.failure)
        : "initialized",
    ).toBe("Stat Block combatant is immune to initial prone condition.");
  });

  test("retains only authored-free mechanics and execution bindings", () => {
    const admitted = admittedFor(battleId("authored-free-capability"));
    const serialized = JSON.stringify(admitted.admission);

    expect(Object.keys(admitted.admission)).toEqual([
      "battleId",
      "combatantId",
      "origin",
      "initialization",
      "cursorTransition",
    ]);
    expect(Object.keys(admitted.admission.origin)).toEqual([
      "statBlockId",
      "mechanics",
      "execution",
    ]);
    expect(Object.keys(admitted.admission.initialization)).toEqual([
      "armorClass",
      "maxHp",
      "size",
    ]);
    expect("statBlock" in admitted.admission).toBe(false);
    expect("displayName" in admitted.admission).toBe(false);
    expect(serialized).not.toContain(admitted.source.statBlock.displayName);
  });

  test("consumes transition and initialization facts without retaining them in the durable origin", () => {
    const destinationBattleId = battleId("consumed-admission-capability");
    const admission = admittedFor(destinationBattleId).admission;
    const added = addBattleStatBlockCombatant({
      state: destinationState(destinationBattleId),
      combatant: {
        combatantId: admittedCombatantId,
        initiative: initiativeScore(10),
        admission,
        currentHp: Hp(1),
        tempHp: Hp(0),
        ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        reactionAvailable: true,
      },
    });

    expect(Result.isSuccess(added)).toBe(true);
    if (Result.isFailure(added)) return;
    const combatant = added.success.combatants.get(admittedCombatantId);
    expect(combatant?.origin.kind).toBe("statBlock");
    if (combatant?.origin.kind !== "statBlock") return;
    expect(Object.keys(combatant.origin)).toEqual([
      "kind",
      "statBlockId",
      "mechanics",
      "execution",
    ]);
    expect(combatant.origin).not.toHaveProperty("battleId");
    expect(combatant.origin).not.toHaveProperty("combatantId");
    expect(combatant.origin).not.toHaveProperty("cursorTransition");
    expect(combatant.origin).not.toHaveProperty("initialization");
    expect(Object.keys(combatant.origin.mechanics)).toEqual([
      "creatureType",
      "speeds",
      "abilityScores",
      "savingThrowModifiers",
      "skillModifiers",
      "vulnerabilities",
      "resistances",
      "immunities",
      "specialSenses",
    ]);
  });

  test("rejects replay into a different battle", () => {
    const admission = admittedFor(battleId("source-battle")).admission;
    const added = addBattleStatBlockCombatant({
      state: destinationState(battleId("destination-battle")),
      combatant: {
        combatantId: admittedCombatantId,
        initiative: initiativeScore(10),
        admission,
        currentHp: Hp(1),
        tempHp: Hp(0),
        ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        reactionAvailable: true,
      },
    });

    expect(
      Result.isFailure(added)
        ? battleStateInitIssueMessage(added.failure)
        : "resolved",
    ).toBe("Stat Block combatant admission belongs to a different battle.");
  });

  test("rejects replay into a different combatant execution scope", () => {
    const destinationBattleId = battleId("same-battle-other-scope");
    const admission = admittedFor(destinationBattleId).admission;
    const added = addBattleStatBlockCombatant({
      state: destinationState(destinationBattleId),
      combatant: {
        combatantId: otherCombatantId,
        initiative: initiativeScore(10),
        admission,
        currentHp: Hp(1),
        tempHp: Hp(0),
        ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
        reactionAvailable: true,
      },
    });

    expect(
      Result.isFailure(added)
        ? battleStateInitIssueMessage(added.failure)
        : "resolved",
    ).toBe("Stat Block combatant admission belongs to a different combatant.");
  });

  test("rejects duplicate combatants before attempting to replay their admission", () => {
    const destinationBattleId = battleId("duplicate-admitted-combatant");
    const admission = admittedFor(destinationBattleId).admission;
    const first = addBattleStatBlockCombatant({
      state: destinationState(destinationBattleId),
      combatant: combatantFor(admission),
    });
    if (Result.isFailure(first)) {
      throw new Error(battleStateInitIssueMessage(first.failure));
    }

    const duplicate = addBattleStatBlockCombatant({
      state: first.success,
      combatant: combatantFor(admission),
    });
    expect(
      Result.isFailure(duplicate)
        ? battleStateInitIssueMessage(duplicate.failure)
        : "resolved",
    ).toBe(`Duplicate combatant id: ${admittedCombatantId}`);
  });

  test("rejects an execution scope belonging to a different admitted destination", () => {
    const destinationBattleId = battleId("mismatched-admission-scope");
    const admission = admittedFor(destinationBattleId).admission;
    const otherAdmission = admittedFor(
      destinationBattleId,
      otherCombatantId,
    ).admission;
    const mismatchedScopeAdmission = {
      ...admission,
      origin: {
        ...admission.origin,
        execution: {
          ...admission.origin.execution,
          scopeRef: otherAdmission.origin.execution.scopeRef,
        },
      },
    };

    const added = addBattleStatBlockCombatant({
      state: destinationState(destinationBattleId),
      combatant: combatantFor(mismatchedScopeAdmission),
    });
    expect(
      Result.isFailure(added)
        ? battleStateInitIssueMessage(added.failure)
        : "resolved",
    ).toBe(
      "Stat Block combatant admission execution scope belongs to a different destination.",
    );
  });

  test("rejects replay after removal advances the destination execution-scope cursor", () => {
    const destinationBattleId = battleId("retired-admission-cursor");
    const admission = admittedFor(destinationBattleId).admission;
    const first = addBattleStatBlockCombatant({
      state: destinationState(destinationBattleId),
      combatant: combatantFor(admission),
    });
    if (Result.isFailure(first)) {
      throw new Error(battleStateInitIssueMessage(first.failure));
    }
    const removed = removeBattleCombatantsRight({
      state: first.success,
      combatantIds: [admittedCombatantId],
    });

    const replayed = addBattleStatBlockCombatant({
      state: removed,
      combatant: combatantFor(admission),
    });
    expect(
      Result.isFailure(replayed)
        ? battleStateInitIssueMessage(replayed.failure)
        : "resolved",
    ).toBe(
      "Stat Block combatant admission does not match the current execution-scope cursor.",
    );
  });

  test("rejects current Hit Points above the admitted Stat Block maximum", () => {
    const destinationBattleId = battleId("admitted-current-hp-overflow");
    const admission = admittedFor(destinationBattleId).admission;
    const added = addBattleStatBlockCombatant({
      state: destinationState(destinationBattleId),
      combatant: combatantFor(admission, { currentHp: Hp(999) }),
    });

    expect(
      Result.isFailure(added)
        ? battleStateInitIssueMessage(added.failure)
        : "resolved",
    ).toBe("Battle initialization current HP exceeds max HP.");
  });

  test("inserts an admitted combatant after every existing Initiative tie", () => {
    const destinationBattleId = battleId("admitted-initiative-tie");
    const state = destinationState(destinationBattleId);
    const admission = admittedFor(destinationBattleId).admission;
    const added = addBattleStatBlockCombatant({
      state,
      combatant: combatantFor(admission, {
        initiative: initiativeScore(20),
      }),
    });
    if (Result.isFailure(added)) {
      throw new Error(battleStateInitIssueMessage(added.failure));
    }

    expect(
      initiativeEntries(added.success.initiative).map(
        (entry) => entry.creature,
      ),
    ).toEqual([fighterId, admittedCombatantId]);
  });

  test("inserts an Initiative tie before existing lower scores", () => {
    const destinationBattleId = battleId(
      "admitted-initiative-tie-before-lower",
    );
    const state = destinationState(destinationBattleId);
    const lowerAdmission = admittedFor(
      destinationBattleId,
      otherCombatantId,
    ).admission;
    const withLowerInitiative = addBattleStatBlockCombatant({
      state,
      combatant: combatantFor(lowerAdmission, {
        initiative: initiativeScore(10),
      }),
    });
    if (Result.isFailure(withLowerInitiative)) {
      throw new Error(battleStateInitIssueMessage(withLowerInitiative.failure));
    }
    const admission = admittedFor(destinationBattleId).admission;
    const added = addBattleStatBlockCombatant({
      state: withLowerInitiative.success,
      combatant: combatantFor(admission, {
        initiative: initiativeScore(20),
      }),
    });
    if (Result.isFailure(added)) {
      throw new Error(battleStateInitIssueMessage(added.failure));
    }

    expect(
      initiativeEntries(added.success.initiative).map(
        (entry) => entry.creature,
      ),
    ).toEqual([fighterId, admittedCombatantId, otherCombatantId]);
  });
});
