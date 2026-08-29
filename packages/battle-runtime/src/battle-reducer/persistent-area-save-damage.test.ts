import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { describe, expect, test } from "vitest";

import {
  battleId,
  battleEffectExecutionRefForTest,
  characterSeed,
  fighterId,
  startBattleRight,
  statBlockCreatureInit,
} from "../battle-runtime.test-support.ts";
import type { BattleFill } from "../battle-state-execution.ts";
import { battleAreaId, type BattleAreaId } from "../identity.ts";
import {
  resolveStationaryPersistentAreaAreaSaveDamage,
  resolveTranslatingPersistentAreaAreaSaveDamage,
} from "./persistent-area-save-damage.ts";
import { isPersistentAreaSubjectAllowedOutsideCurrentActorTurn } from "./persistent-spatial-spell-procedures.ts";

function persistentAreaBattle() {
  return startBattleRight({
    battleId: battleId("battle-persistent-area-save-damage"),
    combatants: [
      characterSeed({ initiative: 20 }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

const unrelatedFill = {
  kind: "damageTypeChoice",
  holeId: holeId("persistent-area-unrelated-fill"),
  value: "fire",
} satisfies BattleFill;

const persistentAreaEffectRef = battleEffectExecutionRefForTest(
  "persistent-area-save-damage-effect",
);

function appearanceTrigger(areaId: BattleAreaId) {
  return {
    kind: "appearsInArea" as const,
    areaId,
    effectRef: persistentAreaEffectRef,
  };
}

describe("persistent-area save/damage protocol", () => {
  test("identifies persistent-area subjects allowed outside the current actor turn", () => {
    const areaMembershipTrigger = appearanceTrigger(
      battleAreaId("test-persistent-area-appearance"),
    );

    expect(
      isPersistentAreaSubjectAllowedOutsideCurrentActorTurn({
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "persistentAreaSaveDamageSave",
        areaMembershipTrigger,
      }),
    ).toBe(true);
    expect(
      isPersistentAreaSubjectAllowedOutsideCurrentActorTurn({
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "persistentAreaSaveDamageSave",
        areaMembershipTrigger: {
          kind: "firstEntryOnTurn",
          areaId: areaMembershipTrigger.areaId,
          effectRef: persistentAreaEffectRef,
        },
      }),
    ).toBe(true);
    expect(
      isPersistentAreaSubjectAllowedOutsideCurrentActorTurn({
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "persistentAreaSaveDamageSave",
        areaMembershipTrigger: {
          kind: "turnEndInArea",
          areaId: areaMembershipTrigger.areaId,
          effectRef: persistentAreaEffectRef,
        },
      }),
    ).toBe(false);
    expect(
      isPersistentAreaSubjectAllowedOutsideCurrentActorTurn({
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "persistentAreaSaveDamageSave",
        areaMembershipTrigger: {
          kind: "turnEndInArea",
          areaId: areaMembershipTrigger.areaId,
          effectRef: persistentAreaEffectRef,
        },
      }),
    ).toBe(false);
  });

  test("rejects an unsupported stationary-area fill before stale-effect parsing", () => {
    const state = persistentAreaBattle();
    const result = resolveStationaryPersistentAreaAreaSaveDamage({
      state,
      subject: {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "persistentAreaSaveDamageSave",
        areaMembershipTrigger: appearanceTrigger(
          battleAreaId("test-stationary-persistent-area"),
        ),
      },
      fills: [unrelatedFill],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "stationary persistent area save accepts only save, damage, damage disposition, and Concentration fills.",
    });
  });

  test("rejects an unsupported translating-area fill before stale-effect parsing", () => {
    const state = persistentAreaBattle();
    const result = resolveTranslatingPersistentAreaAreaSaveDamage({
      state,
      subject: {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "persistentAreaSaveDamageSave",
        areaMembershipTrigger: appearanceTrigger(
          battleAreaId("test-translating-persistent-area"),
        ),
      },
      fills: [unrelatedFill],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "translating persistent area save accepts only save, damage, damage disposition, and Concentration fills.",
    });
  });
});
