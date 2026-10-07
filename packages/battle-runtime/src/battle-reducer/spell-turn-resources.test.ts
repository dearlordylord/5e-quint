import { Result } from "effect";
import { expect, test } from "vitest";
import { fighterVsGoblinBattle } from "../battle-runtime.test-support.ts";
import { combatantId } from "../identity.ts";
import {
  claimPendingSpellSlotUseThisTurn,
  markSpellSlotExpendedThisTurn,
} from "./spell-turn-resources.ts";

test("a pending spell slot claim commits once and preserves other actors' claims", () => {
  const initial = fighterVsGoblinBattle().currentTurnResources;
  const caster = combatantId("synthetic-pending-slot-caster");
  const other = combatantId("synthetic-other-slot-caster");
  const claimed = claimPendingSpellSlotUseThisTurn(initial, caster);
  if (Result.isFailure(claimed)) throw new Error("Expected first slot claim");
  const others = claimPendingSpellSlotUseThisTurn(claimed.success, other);
  if (Result.isFailure(others))
    throw new Error("Expected independent slot claim");
  const committed = markSpellSlotExpendedThisTurn(others.success, caster);
  if (Result.isFailure(committed))
    throw new Error("Expected pending claim commitment");
  expect(committed.success.spellSlotUsesThisTurn).toEqual([
    { kind: "committed", combatantId: caster },
    { kind: "pending", combatantId: other },
  ]);
  expect(committed.success.levelOnePlusSpellCastsThisTurn).toContain(caster);
  expect(markSpellSlotExpendedThisTurn(committed.success, caster)).toEqual(
    Result.fail("spell slot already expended this turn"),
  );
  expect(claimPendingSpellSlotUseThisTurn(committed.success, caster)).toEqual(
    Result.fail("spell slot already expended this turn"),
  );
  expect(initial.spellSlotUsesThisTurn).toEqual([]);
  expect(others.success.spellSlotUsesThisTurn).toEqual([
    { kind: "pending", combatantId: caster },
    { kind: "pending", combatantId: other },
  ]);
});
