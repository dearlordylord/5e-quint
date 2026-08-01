import { DAMAGE_TYPES, type DamageType } from "@dnd/shared/types";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { spellTargetId } from "../unit-profile-admission-catalog.test-support.ts";
import { battleProcedureExecutionRefForTest } from "../battle-runtime.test-support.ts";
import {
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
} from "../unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "../unit-profile-admission-spell-battle-support.ts";
import { withResistanceEffect } from "../unit-profile-admission-spell-fill.test-support.ts";
import { combatantId } from "../identity.ts";
import type { BattleActiveEffect } from "../battle-state-execution.ts";
import {
  applyAvailableSpellDamageReduction,
  entriesAfterProportionalDamageReduction,
  type DamageAmountByTypeEntry,
} from "./damage-helpers.ts";

function availableSlashingReduction() {
  const session = spellBattle({ spellSlots: [] });
  const state = withResistanceEffect(
    session.state,
    spellTargetId,
    "slashing",
    false,
  );
  const targetWithEligibleEffect = requireCombatant(state, spellTargetId);
  const eligibleEffect = targetWithEligibleEffect.activeEffects.find(
    (effect) => effect.kind === "spellDamageReduction",
  );
  if (eligibleEffect?.kind !== "spellDamageReduction") {
    throw new Error("Expected the Resistance effect fixture.");
  }
  const neighboringReductionEffect = (
    source: string,
    damageType: DamageType,
    usedThisTurn: boolean,
  ) => {
    const sourceCombatantId = combatantId(source);
    return {
      ...eligibleEffect,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        `${source}:resistance`,
      ),
      sourceCombatantId,
      damageType,
      usedThisTurn,
      expiresAt: { kind: "concentration", combatantId: sourceCombatantId },
    } satisfies Extract<
      BattleActiveEffect,
      { readonly kind: "spellDamageReduction" }
    >;
  };
  const target = {
    ...targetWithEligibleEffect,
    activeEffects: [
      neighboringReductionEffect("fire-resistance-caster", "fire", false),
      eligibleEffect,
      neighboringReductionEffect("spent-resistance-caster", "slashing", true),
    ],
  };
  const damageByType = new Map<DamageType, number>([["slashing", 6]]);
  const requested = applyAvailableSpellDamageReduction(
    target,
    damageByType,
    undefined,
  );
  if (requested.tag !== "needsHoles") {
    throw new Error("Expected an available Resistance reduction roll.");
  }
  const hole = requireHole(requested.holes, "rolledDice");
  if (!("spellDamageReduction" in hole)) {
    throw new Error("Expected a spell damage reduction roll hole.");
  }
  return { target, damageByType, hole };
}

describe("damage reduction helper boundaries", () => {
  test("accepts the requested roll and rejects mismatched or invalid dice fills", () => {
    const { target, damageByType, hole } = availableSlashingReduction();
    const validRoll = damageRollFillWithGroups(hole, [[3]]);

    const applied = applyAvailableSpellDamageReduction(
      target,
      damageByType,
      validRoll,
    );
    expect(applied).toMatchObject({ tag: "ok" });
    if (applied.tag !== "ok") {
      throw new Error("Expected the requested Resistance roll to apply.");
    }
    expect(applied.damageByType.get("slashing")).toBe(3);
    expect(applied.target.activeEffects).toEqual(
      target.activeEffects.map((effect, index) =>
        index === 1 ? { ...effect, usedThisTurn: true } : effect,
      ),
    );

    expect(
      applyAvailableSpellDamageReduction(target, damageByType, {
        ...validRoll,
        holeId: holeId("battle:unrelated-roll"),
      }),
    ).toEqual({ tag: "invalid" });
    expect(
      applyAvailableSpellDamageReduction(
        target,
        damageByType,
        damageRollFillWithGroups(hole, [[5]]),
      ),
    ).toEqual({ tag: "invalid" });
  });
});

describe("proportional damage reduction", () => {
  test("preserves entry identity and removes exactly the bounded reduction", () => {
    fc.assert(
      fc.property(
        fc.tuple(
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
        ),
        fc.integer({ min: 0, max: 400 }),
        ([slashing, fire, cold], reduction) => {
          const entries = [
            { damageType: "slashing", amount: slashing },
            { damageType: "fire", amount: fire },
            { damageType: "cold", amount: cold },
          ] as const satisfies readonly DamageAmountByTypeEntry[];
          const reduced = entriesAfterProportionalDamageReduction(
            entries,
            reduction,
          );
          const total = entries.reduce((sum, entry) => sum + entry.amount, 0);

          expect(reduced.map(({ damageType }) => damageType)).toEqual(
            entries.map(({ damageType }) => damageType),
          );
          expect(reduced.every((entry) => entry.amount >= 0)).toBe(true);
          expect(
            reduced.every(
              (entry, index) => entry.amount <= entries[index]!.amount,
            ),
          ).toBe(true);
          expect(reduced.reduce((sum, entry) => sum + entry.amount, 0)).toBe(
            total - Math.min(total, reduction),
          );
          if (total === 0) {
            return;
          }
          const boundedReduction = Math.min(total, reduction);
          const allocations = entries.map((entry, index) => {
            const exact = (entry.amount * boundedReduction) / total;
            return {
              index,
              allocated: entry.amount - reduced[index]!.amount,
              floor: Math.floor(exact),
              remainder: exact - Math.floor(exact),
            };
          });
          for (const allocation of allocations) {
            expect(allocation.allocated).toBeGreaterThanOrEqual(
              allocation.floor,
            );
            expect(allocation.allocated).toBeLessThanOrEqual(
              Math.ceil(allocation.floor + allocation.remainder),
            );
          }
          const bonusAllocations = allocations.filter(
            (allocation) => allocation.allocated > allocation.floor,
          );
          const baseAllocations = allocations.filter(
            (allocation) => allocation.allocated === allocation.floor,
          );
          for (const bonus of bonusAllocations) {
            for (const base of baseAllocations) {
              expect(
                bonus.remainder > base.remainder ||
                  (bonus.remainder === base.remainder &&
                    bonus.index < base.index),
              ).toBe(true);
            }
          }
        },
      ),
    );
  });

  test("breaks equal largest-remainder ties in authored entry order", () => {
    expect(
      entriesAfterProportionalDamageReduction(
        [
          { damageType: "slashing", amount: 1 },
          { damageType: "fire", amount: 1 },
          { damageType: "cold", amount: 1 },
        ],
        2,
      ),
    ).toEqual([
      { damageType: "slashing", amount: 0 },
      { damageType: "fire", amount: 0 },
      { damageType: "cold", amount: 1 },
    ]);
  });

  test("leaves zero totals and zero reductions unchanged", () => {
    const zeroEntries = DAMAGE_TYPES.slice(0, 2).map((damageType) => ({
      damageType,
      amount: 0,
    }));
    const entries = [{ damageType: "force" as const, amount: 8 }];

    expect(entriesAfterProportionalDamageReduction(zeroEntries, 3)).toEqual(
      zeroEntries,
    );
    expect(entriesAfterProportionalDamageReduction(entries, 0)).toEqual(
      entries,
    );
  });
});
