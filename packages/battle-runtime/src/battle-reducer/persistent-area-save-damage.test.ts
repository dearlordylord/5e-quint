import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { currentActing } from "@dnd/shared-algebras/initiative-algebra";
import { describe, expect, test } from "vitest";

import {
  battleId,
  characterSeed,
  fighterId,
  startBattleRight,
  statBlockCreatureInit,
} from "../battle-runtime.test-support.ts";
import type { BattleFill, BattleState } from "../battle-state-execution.ts";
import { battleAreaId, type BattleAreaId } from "../identity.ts";
import {
  resolveCloudkillAreaSaveDamage,
  resolveInsectPlagueAreaSaveDamage,
} from "./persistent-area-save-damage.ts";
import { persistentAreaAppearanceSaveMayResolveOutsideCurrentTurn } from "./persistent-spatial-spell-procedures.ts";

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

function appearanceTrigger(state: BattleState, areaId: BattleAreaId) {
  return {
    kind: "appearsInArea" as const,
    areaId,
    triggerTurn: {
      actorId: currentActing(state.initiative),
      round: state.initiative.round,
    },
  };
}

describe("persistent-area save/damage protocol", () => {
  test("admits only appearance-triggered persistent-area saves outside the current turn", () => {
    const state = persistentAreaBattle();
    const areaMembershipTrigger = appearanceTrigger(
      state,
      battleAreaId("test-persistent-area-appearance"),
    );

    expect(
      persistentAreaAppearanceSaveMayResolveOutsideCurrentTurn(state, {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "insectPlagueAreaHazardSave",
        areaMembershipTrigger,
      }),
    ).toBe(true);
    expect(
      persistentAreaAppearanceSaveMayResolveOutsideCurrentTurn(state, {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "cloudkillAreaHazardSave",
        areaMembershipTrigger: {
          kind: "turnEndInArea",
          areaId: areaMembershipTrigger.areaId,
        },
      }),
    ).toBe(false);
  });

  test("rejects an unsupported Insect Plague fill before stale-effect parsing", () => {
    const state = persistentAreaBattle();
    const result = resolveInsectPlagueAreaSaveDamage({
      state,
      subject: {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "insectPlagueAreaHazardSave",
        areaMembershipTrigger: appearanceTrigger(
          state,
          battleAreaId("test-insect-plague-area"),
        ),
      },
      fills: [unrelatedFill],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Insect Plague save accepts only save, damage, and Concentration fills.",
    });
  });

  test("rejects an unsupported Cloudkill fill before stale-effect parsing", () => {
    const state = persistentAreaBattle();
    const result = resolveCloudkillAreaSaveDamage({
      state,
      subject: {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "cloudkillAreaHazardSave",
        areaMembershipTrigger: appearanceTrigger(
          state,
          battleAreaId("test-cloudkill-area"),
        ),
      },
      fills: [unrelatedFill],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Cloudkill save accepts only save, damage, and Concentration fills.",
    });
  });
});
