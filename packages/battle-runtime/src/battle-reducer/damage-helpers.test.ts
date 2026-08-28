import { DAMAGE_TYPES, type DamageType } from "@dnd/shared/types";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

import {
  spellCasterId,
  spellTargetId,
} from "../unit-profile-admission-catalog.test-support.ts";
import {
  battleProcedureExecutionRefForTest,
  testLongswordAttack,
} from "../battle-runtime.test-support.ts";
import { allocateBattleEffectExecutionRefForCreature } from "../effect-execution-ref.ts";
import {
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
} from "../unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "../unit-profile-admission-spell-battle.test-support.ts";
import { withResistanceEffect } from "../unit-profile-admission-spell-fill.test-support.ts";
import { combatantId } from "../identity.ts";
import type { BattleActiveEffect } from "../battle-state-execution.ts";
import {
  activeSpellWeaponDamageRiders,
  applyAvailableSpellDamageReduction,
  applySpellDamageReductionConsumption,
  applyAvailableSourceDamageRollPenalty,
  entriesAfterProportionalDamageReduction,
  ongoingFeatureDamageModifierApplies,
  spellDamageReductionRollForTarget,
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
    effectRef: typeof eligibleEffect.effectRef,
    source: string,
    damageType: DamageType,
    usedThisTurn: boolean,
  ) => {
    const sourceCombatantId = combatantId(source);
    return {
      ...eligibleEffect,
      effectRef,
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
  const fireAllocation = allocateBattleEffectExecutionRefForCreature({
    owner: targetWithEligibleEffect,
  });
  const spentAllocation = allocateBattleEffectExecutionRefForCreature({
    owner: fireAllocation.owner,
  });
  const target = {
    ...spentAllocation.owner,
    activeEffects: [
      neighboringReductionEffect(
        fireAllocation.effectRef,
        "fire-resistance-caster",
        "fire",
        false,
      ),
      eligibleEffect,
      neighboringReductionEffect(
        spentAllocation.effectRef,
        "spent-resistance-caster",
        "slashing",
        true,
      ),
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

function availableSourceDamageRollPenalty() {
  const session = spellBattle({ spellSlots: [] });
  const sourceWithoutPenalty = requireCombatant(session.state, spellTargetId);
  const effectAllocation = allocateBattleEffectExecutionRefForCreature({
    owner: sourceWithoutPenalty,
  });
  const source = {
    ...effectAllocation.owner,
    activeEffects: [
      ...sourceWithoutPenalty.activeEffects,
      {
        kind: "sourceDamageRollPenalty",
        effectRef: effectAllocation.effectRef,
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          "source-damage-roll-penalty",
        ),
        sourceCombatantId: spellCasterId,
        amount: { dice: 1, dieSize: 8 },
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
        },
      },
    ],
  } satisfies typeof sourceWithoutPenalty;
  const damageByType = new Map<DamageType, number>([
    ["slashing", 4],
    ["fire", 6],
  ]);
  const damageRollHoleId = holeId("battle:test:source-damage-roll");
  const requested = applyAvailableSourceDamageRollPenalty(
    source,
    damageByType,
    damageRollHoleId,
    undefined,
  );
  if (requested.tag !== "needsHoles") {
    throw new Error("Expected an available source damage roll penalty.");
  }
  const hole = requireHole(requested.holes, "rolledDice");
  if (!("sourceDamageRollPenalty" in hole)) {
    throw new Error("Expected a source damage roll penalty hole.");
  }
  return { source, damageByType, damageRollHoleId, hole };
}

describe("damage reduction helper boundaries", () => {
  test("a stale reduction roll cannot bind a mechanically identical replacement occurrence", () => {
    const first = availableSlashingReduction();
    const staleRoll = damageRollFillWithGroups(first.hole, [[3]]);
    const selected = first.target.activeEffects.find(
      (effect) =>
        effect.kind === "spellDamageReduction" &&
        effect.damageType === "slashing" &&
        !effect.usedThisTurn,
    );
    if (selected?.kind !== "spellDamageReduction") {
      throw new Error("Expected an available spell damage reduction.");
    }
    const replacementAllocation = allocateBattleEffectExecutionRefForCreature({
      owner: first.target,
    });
    const replacementTarget = {
      ...replacementAllocation.owner,
      activeEffects: first.target.activeEffects.map((effect) =>
        effect.effectRef === selected.effectRef
          ? { ...selected, effectRef: replacementAllocation.effectRef }
          : effect,
      ),
    };
    const replacementRequest = applyAvailableSpellDamageReduction(
      replacementTarget,
      first.damageByType,
      undefined,
    );
    if (replacementRequest.tag !== "needsHoles") {
      throw new Error("Expected the replacement reduction roll hole.");
    }

    expect(Number(replacementTarget.nextEffectOrdinal)).toBe(
      Number(first.target.nextEffectOrdinal) + 1,
    );
    expect(replacementRequest.holes[0]?.holeId).not.toBe(first.hole.holeId);
    expect(
      applyAvailableSpellDamageReduction(
        replacementTarget,
        first.damageByType,
        staleRoll,
      ),
    ).toEqual({ tag: "invalid" });

    const firstApplied = applyAvailableSpellDamageReduction(
      first.target,
      first.damageByType,
      staleRoll,
    );
    if (firstApplied.tag !== "ok") {
      throw new Error("Expected the selected reduction roll to apply.");
    }
    expect(
      applySpellDamageReductionConsumption(
        replacementTarget,
        firstApplied.consumption,
      ),
    ).toEqual(replacementTarget);
  });

  test("selects a target reduction roll by exact protocol identity", () => {
    const first = availableSlashingReduction();
    const eligibleEffect = first.target.activeEffects.find(
      (effect) =>
        effect.kind === "spellDamageReduction" &&
        effect.damageType === "slashing" &&
        !effect.usedThisTurn,
    );
    if (eligibleEffect?.kind !== "spellDamageReduction") {
      throw new Error("Expected the first target's available reduction.");
    }
    const secondTargetId = combatantId("second-reduction-target");
    const secondSession = spellBattle({
      spellSlots: [],
      extraTargetIds: [secondTargetId],
    });
    const secondTargetBeforeAllocation = requireCombatant(
      secondSession.state,
      secondTargetId,
    );
    const secondAllocation = allocateBattleEffectExecutionRefForCreature({
      owner: secondTargetBeforeAllocation,
    });
    const secondEffect = {
      ...eligibleEffect,
      effectRef: secondAllocation.effectRef,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "first-target-sourced-reduction",
      ),
      sourceCombatantId: first.target.combatantId,
      expiresAt: {
        kind: "concentration" as const,
        combatantId: first.target.combatantId,
      },
    };
    const secondTarget = {
      ...secondAllocation.owner,
      activeEffects: [
        ...secondTargetBeforeAllocation.activeEffects,
        secondEffect,
      ],
    };
    expect(Number(secondTarget.nextEffectOrdinal)).toBe(
      Number(secondTargetBeforeAllocation.nextEffectOrdinal) + 1,
    );
    expect(secondEffect.effectRef).not.toBe(eligibleEffect.effectRef);
    const secondRequest = applyAvailableSpellDamageReduction(
      secondTarget,
      first.damageByType,
      undefined,
    );
    if (secondRequest.tag !== "needsHoles") {
      throw new Error("Expected the second target's reduction roll hole.");
    }
    const secondHole = requireHole(secondRequest.holes, "rolledDice");
    if (!("spellDamageReduction" in secondHole)) {
      throw new Error("Expected the second target's reduction protocol.");
    }
    expect(secondHole.spellDamageReduction.effectRef).toBe(
      secondEffect.effectRef,
    );
    const firstRoll = damageRollFillWithGroups(first.hole, [[3]]);
    const secondRoll = damageRollFillWithGroups(secondHole, [[2]]);

    expect(
      spellDamageReductionRollForTarget(
        [secondRoll, firstRoll],
        first.target,
        first.damageByType,
      ),
    ).toEqual(firstRoll);
  });

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

    const consumed = applySpellDamageReductionConsumption(
      target,
      applied.consumption,
    );
    expect(consumed).toEqual(applied.target);
    expect(
      applySpellDamageReductionConsumption(consumed, applied.consumption),
    ).toEqual(consumed);

    const targetAfterEffectTeardown = {
      ...target,
      activeEffects: target.activeEffects.filter(
        (effect) => effect.kind !== "spellDamageReduction",
      ),
    };
    expect(
      applySpellDamageReductionConsumption(
        targetAfterEffectTeardown,
        applied.consumption,
      ),
    ).toEqual(targetAfterEffectTeardown);
    const mismatchedTarget = {
      ...target,
      combatantId: combatantId("unrelated-reduction-target"),
    };
    expect(() =>
      applySpellDamageReductionConsumption(
        mismatchedTarget,
        applied.consumption,
      ),
    ).toThrow(
      "Resolved spell damage reduction must belong to its application target.",
    );

    expect(
      applyAvailableSpellDamageReduction(target, damageByType, {
        ...validRoll,
        holeId: holeId("battle:unrelated-roll"),
      }),
    ).toEqual({ tag: "invalid" });
    expect(
      applyAvailableSpellDamageReduction(
        {
          ...target,
          activeEffects: target.activeEffects.map((effect) =>
            effect.kind === "spellDamageReduction"
              ? { ...effect, usedThisTurn: true }
              : effect,
          ),
        },
        damageByType,
        validRoll,
      ),
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

describe("source damage roll penalty helper boundaries", () => {
  test("a stale penalty roll cannot bind a mechanically identical replacement occurrence", () => {
    const first = availableSourceDamageRollPenalty();
    const staleRoll = damageRollFillWithGroups(first.hole, [[4]]);
    const selected = first.source.activeEffects.find(
      (effect) => effect.kind === "sourceDamageRollPenalty",
    );
    if (selected?.kind !== "sourceDamageRollPenalty") {
      throw new Error("Expected an available source damage roll penalty.");
    }
    const replacementAllocation = allocateBattleEffectExecutionRefForCreature({
      owner: first.source,
    });
    const replacementSource = {
      ...replacementAllocation.owner,
      activeEffects: first.source.activeEffects.map((effect) =>
        effect.effectRef === selected.effectRef
          ? {
              ...selected,
              effectRef: replacementAllocation.effectRef,
            }
          : effect,
      ),
    };
    const replacementRequest = applyAvailableSourceDamageRollPenalty(
      replacementSource,
      first.damageByType,
      first.damageRollHoleId,
      undefined,
    );
    if (replacementRequest.tag !== "needsHoles") {
      throw new Error("Expected the replacement penalty roll hole.");
    }

    expect(Number(replacementSource.nextEffectOrdinal)).toBe(
      Number(first.source.nextEffectOrdinal) + 1,
    );
    expect(replacementRequest.holes[0]?.holeId).not.toBe(first.hole.holeId);
    expect(
      applyAvailableSourceDamageRollPenalty(
        replacementSource,
        first.damageByType,
        first.damageRollHoleId,
        staleRoll,
      ),
    ).toEqual({ tag: "invalid" });
    expect(
      applyAvailableSourceDamageRollPenalty(
        first.source,
        first.damageByType,
        first.damageRollHoleId,
        staleRoll,
      ),
    ).toMatchObject({ tag: "ok" });
  });

  test("applies the requested roll and rejects stale, mismatched, or invalid fills", () => {
    const { source, damageByType, damageRollHoleId, hole } =
      availableSourceDamageRollPenalty();
    const validRoll = damageRollFillWithGroups(hole, [[4]]);

    const applied = applyAvailableSourceDamageRollPenalty(
      source,
      damageByType,
      damageRollHoleId,
      validRoll,
    );
    expect(applied).toMatchObject({ tag: "ok" });
    if (applied.tag !== "ok") {
      throw new Error("Expected the source damage roll penalty to apply.");
    }
    expect([...applied.damageByType]).toEqual([
      ["slashing", 2],
      ["fire", 4],
    ]);

    expect(
      applyAvailableSourceDamageRollPenalty(
        source,
        damageByType,
        damageRollHoleId,
        { ...validRoll, holeId: holeId("battle:unrelated-roll") },
      ),
    ).toEqual({ tag: "invalid" });
    expect(
      applyAvailableSourceDamageRollPenalty(
        {
          ...source,
          activeEffects: source.activeEffects.filter(
            (effect) => effect.kind !== "sourceDamageRollPenalty",
          ),
        },
        damageByType,
        damageRollHoleId,
        validRoll,
      ),
    ).toEqual({ tag: "invalid" });
    expect(
      applyAvailableSourceDamageRollPenalty(
        source,
        damageByType,
        damageRollHoleId,
        damageRollFillWithGroups(hole, [[9]]),
      ),
    ).toEqual({ tag: "invalid" });
  });
});

describe("attack damage modifier applicability", () => {
  test("distinguishes absent actors, ability filters, and weapon usage filters", () => {
    const caster = requireCombatant(
      spellBattle({ spellSlots: [], attack: testLongswordAttack() }).state,
      spellCasterId,
    );
    if (caster.origin.kind !== "character" || caster.origin.attack === null) {
      throw new Error("Expected the spellcaster's default weapon attack.");
    }
    const weaponAttack = caster.origin.attack;
    const unarmedStrike = caster.origin.unarmedStrike;

    expect(activeSpellWeaponDamageRiders(undefined, weaponAttack)).toEqual([]);
    expect(
      ongoingFeatureDamageModifierApplies(
        { amount: 2, abilityFilter: ["dex"] },
        weaponAttack,
      ),
    ).toBe(false);
    expect(
      ongoingFeatureDamageModifierApplies(
        { amount: 2, weaponUsageFilter: weaponAttack.weapon.usage },
        weaponAttack,
      ),
    ).toBe(true);
    expect(
      ongoingFeatureDamageModifierApplies(
        {
          amount: 2,
          weaponUsageFilter:
            weaponAttack.weapon.usage === "melee" ? "ranged" : "melee",
        },
        weaponAttack,
      ),
    ).toBe(false);
    expect(
      ongoingFeatureDamageModifierApplies(
        { amount: 2, weaponUsageFilter: weaponAttack.weapon.usage },
        unarmedStrike,
      ),
    ).toBe(false);
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
