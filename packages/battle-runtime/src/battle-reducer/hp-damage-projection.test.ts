import { Hp } from "@dnd/shared/types";
import { expect, test } from "vitest";

import {
  applyHpDamage,
  zeroHitPointReplacementCapabilities,
} from "./damage-apply.ts";
import { spellTargetId } from "../unit-profile-admission-catalog.test-support.ts";
import { relentlessEnduranceBattle } from "../unit-profile-admission-feature-fixture.test-support.ts";

test("a valid replacement disposition cannot revive a creature already at 0 Hit Points", () => {
  const state = relentlessEnduranceBattle({ targetHp: 0 }).state;
  const target = state.combatants.get(spellTargetId);
  if (target?.origin.kind !== "character") {
    throw new Error("Expected the Relentless Endurance character target.");
  }
  const capability = zeroHitPointReplacementCapabilities(target.origin)[0];
  if (capability === undefined) {
    throw new Error("Expected an available zero-HP replacement capability.");
  }

  const damaged = applyHpDamage(target, 1, {
    deathFailuresAtZeroHp: 1,
    damageDisposition: {
      kind: "zeroHitPointReplacement",
      procedureRef: capability.procedureRef,
    },
  });

  expect(damaged.hp).toBe(Hp(0));
  expect(damaged.origin).toEqual(target.origin);
});
