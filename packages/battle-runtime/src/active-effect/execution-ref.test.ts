import {
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
  characterSeed,
  battleActiveEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
} from "../battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";

import { combatantId, type BattleProcedureExecutionRef } from "../identity.ts";
import {
  addBattleCombatant,
  removeBattleCombatants,
} from "../battle-state-execution.ts";
import * as Either from "effect/Either";
import type { SpellActiveEffect } from "./execution-ref.ts";
import {
  allocateBattleActiveEffectRef,
  spellActiveEffectExecutionRef,
  spellActiveEffectForExecutionRef,
} from "./execution-ref.ts";

const sourceId = combatantId("effect-source");

function syntheticEffect(
  sourceProcedureRef: BattleProcedureExecutionRef,
  condition: "charmed" | "frightened",
): SpellActiveEffect {
  return {
    kind: "spellCondition",
    effectRef: battleActiveEffectExecutionRefForTest(
      `${sourceProcedureRef}:${condition}`,
    ),
    sourceProcedureRef,
    sourceCombatantId: sourceId,
    condition,
    conditionHadNonSpellSource: false,
    escape: null,
    turnStartDamage: null,
    expiresAt: {
      kind: "duration",
      durationTicks: elapsedTimeTicks(60),
    },
  };
}

describe("spell active-effect execution references", () => {
  test("allocates repeated refs from canonical owner state without replacing other combatants", () => {
    const initial = fighterVsGoblinBattle();
    const goblin = initial.combatants.get(goblinId);
    const first = allocateBattleActiveEffectRef({
      state: initial,
      ownerId: fighterId,
    });
    expect(first.tag).toBe("allocated");
    if (first.tag !== "allocated") return;

    const second = allocateBattleActiveEffectRef({
      state: first.state,
      ownerId: fighterId,
    });
    expect(second.tag).toBe("allocated");
    if (second.tag !== "allocated") return;

    expect(second.effectRef).not.toBe(first.effectRef);
    expect(second.state.combatants.get(goblinId)).toBe(goblin);
    expect(second.owner.activeEffects).toEqual(
      initial.combatants.get(fighterId)?.activeEffects,
    );
    expect(Number(second.owner.nextActiveEffectOrdinal)).toBe(
      Number(initial.combatants.get(fighterId)?.nextActiveEffectOrdinal) + 2,
    );
  });

  test("does not reuse an active-effect occurrence ref after owner re-admission", () => {
    const initial = fighterVsGoblinBattle();
    const first = allocateBattleActiveEffectRef({
      state: initial,
      ownerId: fighterId,
    });
    if (first.tag !== "allocated") return;
    const removed = removeBattleCombatants({
      state: first.state,
      combatantIds: [fighterId],
    });
    expect(Either.isRight(removed)).toBe(true);
    if (Either.isLeft(removed)) return;
    const readmitted = addBattleCombatant({
      state: removed.right,
      combatant: characterSeed({ initiative: 5 }),
    });
    expect(Either.isRight(readmitted)).toBe(true);
    if (Either.isLeft(readmitted)) return;
    const second = allocateBattleActiveEffectRef({
      state: readmitted.right,
      ownerId: fighterId,
    });
    expect(second.tag).toBe("allocated");
    if (second.tag !== "allocated") return;
    expect(second.effectRef).not.toBe(first.effectRef);
  });

  test("exclude authored source identity while retaining runtime distinctions", () => {
    const firstCharm = syntheticEffect(
      battleProcedureExecutionRefForTest("synthetic-first-spell"),
      "charmed",
    );
    const renamedCharm = syntheticEffect(
      battleProcedureExecutionRefForTest("synthetic-renamed-spell"),
      "charmed",
    );
    const frightened = syntheticEffect(
      battleProcedureExecutionRefForTest("synthetic-first-spell"),
      "frightened",
    );

    expect(spellActiveEffectExecutionRef(firstCharm)).not.toBe(
      spellActiveEffectExecutionRef(renamedCharm),
    );
    expect(spellActiveEffectExecutionRef(firstCharm)).not.toBe(
      spellActiveEffectExecutionRef(frightened),
    );
    expect(spellActiveEffectExecutionRef(firstCharm)).toBe(
      firstCharm.effectRef,
    );
  });

  test("looks up an effect only by its branded runtime projection", () => {
    const charm = syntheticEffect(
      battleProcedureExecutionRefForTest("synthetic-charm"),
      "charmed",
    );
    const frightened = syntheticEffect(
      battleProcedureExecutionRefForTest("synthetic-fright"),
      "frightened",
    );
    const ref = spellActiveEffectExecutionRef(frightened);

    expect(spellActiveEffectForExecutionRef([charm, frightened], ref)).toBe(
      frightened,
    );
    expect(
      spellActiveEffectForExecutionRef(
        [charm, frightened],
        battleActiveEffectExecutionRefForTest("missing-effect"),
      ),
    ).toBeUndefined();
  });
});
