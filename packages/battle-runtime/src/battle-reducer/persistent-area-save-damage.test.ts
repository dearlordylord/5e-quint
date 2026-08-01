import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import { describe, expect, test } from "vitest";

import {
  battleId,
  characterSeed,
  fighterId,
  startBattleRight,
  statBlockCreatureInit,
} from "../battle-runtime.test-support.ts";
import type { BattleFill } from "../battle-state-execution.ts";
import { battleAreaId } from "../identity.ts";
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

describe("persistent-area save/damage protocol", () => {
  test("admits only appearance-triggered persistent-area saves outside the current turn", () => {
    const areaMembershipTrigger = {
      kind: "appearsInArea",
      areaId: battleAreaId("test-persistent-area-appearance"),
    } as const;

    expect(
      persistentAreaAppearanceSaveMayResolveOutsideCurrentTurn({
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "insectPlagueAreaHazardSave",
        areaMembershipTrigger,
      }),
    ).toBe(true);
    expect(
      persistentAreaAppearanceSaveMayResolveOutsideCurrentTurn({
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "cloudkillAreaHazardSave",
        areaMembershipTrigger: {
          ...areaMembershipTrigger,
          kind: "turnEndInArea",
        },
      }),
    ).toBe(false);
  });

  test("rejects an unsupported Insect Plague fill before stale-effect parsing", () => {
    const result = resolveInsectPlagueAreaSaveDamage({
      state: persistentAreaBattle(),
      subject: {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "insectPlagueAreaHazardSave",
        areaMembershipTrigger: {
          kind: "appearsInArea",
          areaId: battleAreaId("test-insect-plague-area"),
        },
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
    const result = resolveCloudkillAreaSaveDamage({
      state: persistentAreaBattle(),
      subject: {
        tag: "runtimeCommand",
        actorId: fighterId,
        command: "cloudkillAreaHazardSave",
        areaMembershipTrigger: {
          kind: "appearsInArea",
          areaId: battleAreaId("test-cloudkill-area"),
        },
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
