import { describe, expect, test } from "vitest";

import type { DamageType } from "@dnd/shared/types";
import {
  flameStrikeUnitId,
  iceKnifeUnitId,
  magicMissileUnitId,
  spellCasterId,
  spellTargetId,
} from "../unit-profile-admission-catalog.test-support.ts";
import {
  damageRollFillWithGroups,
  requireCombatant,
} from "../unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "../unit-profile-admission-spell-battle.test-support.ts";
import {
  spellAct,
  withResistanceEffect,
} from "../unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "../unit-profile-admission-spell-record.test-support.ts";
import type { BattleSelectedSpellInvocation } from "../battle-state-execution.ts";
import {
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectForTest,
  characterSpellInvocationForProcedureRefForTest,
  slotAttackDamageSpell,
} from "../battle-runtime.test-support.ts";
import {
  spellDamageByTypeForTarget,
  spellDamageHole,
  applySpellDamage,
  saveDamageReplacementForInvocation,
  spellSavingThrowAbility,
} from "./spells-damage-fills.ts";

function spellInvocationFor(
  session: ReturnType<typeof spellBattle>,
  spellId: string,
  slotLevel?: number,
) {
  const act = spellAct({
    session,
    spellId,
    ...(slotLevel === undefined ? {} : { slotLevel }),
  });
  return characterSpellInvocationForProcedureRefForTest(
    session,
    spellCasterId,
    act.subject.procedureRef,
  );
}

function isPreparedSpellAttackDamageInvocation(
  invocation: BattleSelectedSpellInvocation,
): invocation is Extract<
  BattleSelectedSpellInvocation,
  {
    readonly procedure: "spellAttackDamage";
    readonly access: { readonly tag: "prepared" };
    readonly damage: { readonly kind: "fixedSpellAttackDamage" };
  }
> {
  return (
    invocation.procedure === "spellAttackDamage" &&
    invocation.access.tag === "prepared" &&
    invocation.damage.kind === "fixedSpellAttackDamage"
  );
}

describe("spell damage fill projections", () => {
  test("projects repeated Magic Missile allocation dice and its repeated flat damage", () => {
    const session = spellBattle({
      preparedSpells: [spellRecord(magicMissileUnitId)],
    });
    const invocation = spellInvocationFor(session, magicMissileUnitId);
    if (invocation.procedure !== "repeatedDamageAllocation") {
      throw new Error("Expected a repeated-damage spell invocation.");
    }
    const damageHole = spellDamageHole(invocation);
    const damageRoll = damageRollFillWithGroups(damageHole, [[1, 2, 3]]);
    const damageByType = spellDamageByTypeForTarget(
      requireCombatant(session.state, spellTargetId),
      invocation,
      damageRoll,
    );

    expect([...damageByType]).toEqual([["force", 9]]);
  });

  test("projects each Flame Strike damage component for failed and successful saves", () => {
    const session = spellBattle({
      preparedSpells: [spellRecord(flameStrikeUnitId)],
      spellSlots: [{ spellLevel: 5, count: 1 }],
    });
    const invocation = spellInvocationFor(session, flameStrikeUnitId, 5);
    if (invocation.procedure !== "saveGatedDamage") {
      throw new Error("Expected a save-gated damage spell invocation.");
    }
    const damageHole = spellDamageHole(invocation);
    const damageRoll = damageRollFillWithGroups(damageHole, [
      [1, 1, 1, 1, 1],
      [2, 2, 2, 2, 2],
    ]);
    const target = requireCombatant(session.state, spellTargetId);

    expect([
      ...spellDamageByTypeForTarget(target, invocation, damageRoll, "full"),
    ]).toEqual([
      ["fire", 5],
      ["radiant", 10],
    ]);
    expect([
      ...spellDamageByTypeForTarget(target, invocation, damageRoll, "half"),
    ]).toEqual([
      ["fire", 2],
      ["radiant", 5],
    ]);
    expect([
      ...spellDamageByTypeForTarget(target, invocation, damageRoll, "none"),
    ]).toEqual([
      ["fire", 0],
      ["radiant", 0],
    ]);
  });

  test("projects the attack-burst Saving Throw ability from Ice Knife", () => {
    const session = spellBattle({
      preparedSpells: [spellRecord(iceKnifeUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const invocation = spellInvocationFor(session, iceKnifeUnitId, 2);
    if (invocation.procedure !== "attackBurstSaveDamage") {
      throw new Error("Expected an attack-burst save damage invocation.");
    }

    expect(spellSavingThrowAbility(invocation)).toBe("dex");
  });

  test("applies a resolved spell damage map supplied by a precomputed source penalty", () => {
    const spell = slotAttackDamageSpell();
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const invocation = spellInvocationFor(session, spell.id, 1);
    if (!isPreparedSpellAttackDamageInvocation(invocation)) {
      throw new Error("Expected a spell attack damage invocation.");
    }
    const damageRoll = damageRollFillWithGroups(spellDamageHole(invocation), [
      [4, 4],
    ]);
    const state = applySpellDamage(
      session.state,
      spellTargetId,
      invocation,
      damageRoll,
      false,
      {
        spatialFacts: [],
        damageSourceId: spellCasterId,
        sourcePenaltyDamageByType: new Map<DamageType, number>([["cold", 3]]),
      },
    );

    expect(Number(requireCombatant(state, spellTargetId).hp)).toBe(9);
  });

  test("applies spell damage with no source combatant when the context has no source penalty", () => {
    const spell = slotAttackDamageSpell();
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const invocation = spellInvocationFor(session, spell.id, 1);
    if (!isPreparedSpellAttackDamageInvocation(invocation)) {
      throw new Error("Expected a spell attack damage invocation.");
    }
    const damageRoll = damageRollFillWithGroups(spellDamageHole(invocation), [
      [4, 4],
    ]);
    const state = applySpellDamage(
      session.state,
      spellTargetId,
      invocation,
      damageRoll,
      false,
      { spatialFacts: [] },
    );

    expect(Number(requireCombatant(state, spellTargetId).hp)).toBe(4);
  });

  test("leaves damage unapplied while a low-level source-side penalty still needs its roll", () => {
    const spell = slotAttackDamageSpell();
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const invocation = spellInvocationFor(session, spell.id, 1);
    if (!isPreparedSpellAttackDamageInvocation(invocation)) {
      throw new Error("Expected a spell attack damage invocation.");
    }
    const caster = requireCombatant(session.state, spellCasterId);
    const sourceProcedureRef = battleProcedureExecutionRefForTest(
      "synthetic-low-level-spells-damage-fills-source-penalty",
    );
    const concentratingState = {
      ...session.state,
      combatants: new Map(session.state.combatants).set(spellCasterId, {
        ...caster,
        concentration: { sourceProcedureRef, effectKind: "spellEffect" },
      }),
    };
    const stateWithPenalty = battleStateWithAllocatedEffectForTest({
      state: concentratingState,
      ownerId: spellCasterId,
      effect: {
        kind: "sourceDamageRollPenalty",
        sourceProcedureRef,
        sourceCombatantId: spellCasterId,
        amount: { dice: 1, dieSize: 8 },
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
        },
      },
    });
    const damageRoll = damageRollFillWithGroups(spellDamageHole(invocation), [
      [4, 4],
    ]);
    const state = applySpellDamage(
      stateWithPenalty,
      spellTargetId,
      invocation,
      damageRoll,
      false,
      { spatialFacts: [], damageSourceId: spellCasterId },
    );

    expect(state).toBe(stateWithPenalty);
  });

  test("leaves damage unapplied while the target's resistance roll is unresolved", () => {
    const spell = slotAttackDamageSpell();
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const invocation = spellInvocationFor(session, spell.id, 1);
    if (!isPreparedSpellAttackDamageInvocation(invocation)) {
      throw new Error("Expected a spell attack damage invocation.");
    }
    const stateWithResistance = withResistanceEffect(
      session.state,
      spellTargetId,
      "cold",
      false,
    );
    const damageRoll = damageRollFillWithGroups(spellDamageHole(invocation), [
      [4, 4],
    ]);
    const state = applySpellDamage(
      stateWithResistance,
      spellTargetId,
      invocation,
      damageRoll,
      false,
      { spatialFacts: [], damageSourceId: spellCasterId },
    );

    expect(state).toBe(stateWithResistance);
  });

  test("does not select a Save Damage Replacement from non-feature character procedures", () => {
    const session = spellBattle({
      cantrips: [spellRecord("acid_splash")],
    });
    const saveDamageInvocation = spellInvocationFor(session, "acid_splash");
    if (saveDamageInvocation.procedure !== "saveGatedDamage") {
      throw new Error("Expected a save-gated damage invocation.");
    }

    expect(
      saveDamageReplacementForInvocation(
        requireCombatant(session.state, spellCasterId),
        saveDamageInvocation,
      ),
    ).toBeNull();
  });
});
