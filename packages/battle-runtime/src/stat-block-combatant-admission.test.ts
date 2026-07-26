import { Hp } from "@dnd/shared/types";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import { addBattleStatBlockCombatant } from "./battle-reducer/stat-block-combatant-execution.ts";
import { battleCreatureInitFromStatBlock } from "./battle-init.ts";
import {
  battleExecutionScopeOrdinal,
  battleId,
  combatantId,
  initiativeScore,
} from "./identity.ts";
import { admitBattleStatBlockCombatant } from "./stat-block-combatant-admission.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import {
  characterSeed,
  startBattleRight,
  statBlockRecord,
} from "./battle-runtime.test-support.ts";

describe("Stat Block combatant admission capability", () => {
  const admittedCombatantId = combatantId("admitted-stat-block");
  const otherCombatantId = combatantId("other-stat-block");

  function admittedFor(admittedBattleId: ReturnType<typeof battleId>) {
    const source = statBlockRecord();
    const admission = admitBattleStatBlockCombatant({
      battleId: admittedBattleId,
      combatantId: admittedCombatantId,
      statBlock: source,
      startingScopeOrdinal: battleExecutionScopeOrdinal(0),
    });
    if (Either.isLeft(admission))
      throw new Error(battleStateInitIssueMessage(admission.left));
    return { admission: admission.right, source };
  }

  function destinationState(destinationBattleId: ReturnType<typeof battleId>) {
    return startBattleRight({
      battleId: destinationBattleId,
      combatants: [characterSeed({ initiative: 20 })],
    });
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
      Either.isLeft(admission)
        ? battleStateInitIssueMessage(admission.left)
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
      Either.isLeft(admission)
        ? battleStateInitIssueMessage(admission.left)
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
      statBlock: {
        ...source,
        statBlock: {
          ...source.statBlock,
          ac: { kind: "caster_derived", source: "spell_save_dc" },
        },
      },
    });

    expect(
      Either.isLeft(initialized)
        ? battleStateInitIssueMessage(initialized.left)
        : "initialized",
    ).toBe("Battle runtime requires literal Stat Block Armor Class.");
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
      },
    });

    expect(Either.isRight(added)).toBe(true);
    if (Either.isLeft(added)) return;
    const combatant = added.right.combatants.get(admittedCombatantId);
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
      },
    });

    expect(
      Either.isLeft(added)
        ? battleStateInitIssueMessage(added.left)
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
      },
    });

    expect(
      Either.isLeft(added)
        ? battleStateInitIssueMessage(added.left)
        : "resolved",
    ).toBe("Stat Block combatant admission belongs to a different combatant.");
  });
});
