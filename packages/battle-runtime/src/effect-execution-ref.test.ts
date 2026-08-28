import {
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
  characterSeed,
  battleEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
} from "./battle-runtime.test-support.ts";
import { describe, expect, test } from "vitest";

import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";

import { combatantId, type BattleProcedureExecutionRef } from "./identity.ts";
import {
  addBattleCombatant,
  removeBattleCombatants,
} from "./battle-reducer/api-lifecycle.ts";
import { Result } from "effect";
import type { SpellActiveEffect } from "./effect-execution-ref.ts";
import {
  allocateBattleEffectExecutionRef,
  spellActiveEffectExecutionRef,
  spellActiveEffectForExecutionRef,
} from "./effect-execution-ref.ts";

const sourceId = combatantId("effect-source");

function syntheticEffect(
  sourceProcedureRef: BattleProcedureExecutionRef,
  condition: "charmed" | "frightened",
): SpellActiveEffect {
  return {
    kind: "spellCondition",
    effectRef: battleEffectExecutionRefForTest(
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
  test("reports an absent owner without allocating an occurrence", () => {
    const initial = fighterVsGoblinBattle();
    const missingOwnerId = combatantId("missing-effect-owner");

    expect(
      allocateBattleEffectExecutionRef({
        state: initial,
        ownerId: missingOwnerId,
      }),
    ).toEqual({ tag: "ownerNotFound", ownerId: missingOwnerId });
  });

  test("allocates repeated refs from canonical owner state without replacing other combatants", () => {
    const initial = fighterVsGoblinBattle();
    const goblin = initial.combatants.get(goblinId);
    const first = allocateBattleEffectExecutionRef({
      state: initial,
      ownerId: fighterId,
    });
    expect(first.tag).toBe("allocated");
    if (first.tag !== "allocated") return;

    const second = allocateBattleEffectExecutionRef({
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
    expect(Number(second.owner.nextEffectOrdinal)).toBe(
      Number(initial.combatants.get(fighterId)?.nextEffectOrdinal) + 2,
    );
  });

  test("does not reuse an active-effect occurrence ref after owner re-admission", () => {
    const initial = fighterVsGoblinBattle();
    const first = allocateBattleEffectExecutionRef({
      state: initial,
      ownerId: fighterId,
    });
    if (first.tag !== "allocated") return;
    const removed = removeBattleCombatants({
      state: first.state,
      combatantIds: [fighterId],
    });
    expect(Result.isSuccess(removed)).toBe(true);
    if (Result.isFailure(removed)) return;
    const readmitted = addBattleCombatant({
      state: removed.success,
      combatant: characterSeed({ initiative: 5 }),
    });
    expect(Result.isSuccess(readmitted)).toBe(true);
    if (Result.isFailure(readmitted)) return;
    const second = allocateBattleEffectExecutionRef({
      state: readmitted.success,
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
        battleEffectExecutionRefForTest("missing-effect"),
      ),
    ).toBeUndefined();
  });
});
