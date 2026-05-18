// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-SCORCHING-RAY scorching_ray
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-independent-attack-sequence
import type { TargetSelection } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import {
  scorchingRayUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackRollFill,
  damageRollFillWithGroups,
  requireCombatant,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  maybeSpellAct,
  spellAct,
  spellHoleInvocation,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  attackBonus,
  combatantId,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";
import type {
  BattleFill,
  BattleHole,
  SpellRecord,
} from "./unit-profile-admission-test-support.ts";

describe("L12G-SPELL-SCORCHING-RAY deterministic Scorching Ray admission", () => {
  test("scorching_ray is admitted as slot-scaled creature-or-object spell attack rays", () => {
    const spell = spellRecord(scorchingRayUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
    });
    const act = spellAct({
      state,
      spellId: scorchingRayUnitId,
      slotLevel: 2,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        scorchingRayUnitId,
        2,
        "spellAttackSequence",
      ),
      mode: { tag: "cast" },
    });
    expect(act.initialHoles.map((hole) => hole.kind)).toEqual([
      "targetChoice",
      "objectTargetChoice",
      "targetChoice",
      "objectTargetChoice",
      "targetChoice",
      "objectTargetChoice",
    ]);
    expect(act.initialHoles).toEqual([
      expect.objectContaining({ label: "Scorching Ray ray 1 target" }),
      expect.objectContaining({
        label: "Scorching Ray ray 1 object target",
        requiresTableSpatialFact: true,
      }),
      expect.objectContaining({ label: "Scorching Ray ray 2 target" }),
      expect.objectContaining({
        label: "Scorching Ray ray 2 object target",
        requiresTableSpatialFact: true,
      }),
      expect.objectContaining({ label: "Scorching Ray ray 3 target" }),
      expect.objectContaining({
        label: "Scorching Ray ray 3 object target",
        requiresTableSpatialFact: true,
      }),
    ]);

    const targetFills = targetChoiceHoles(act.initialHoles).map((hole) =>
      spellTargetFill(hole, scorchingRayUnitId, spellCasterId, spellTargetId),
    );
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: targetFills,
      }),
      "attackRoll",
    );
    expect(spellHoleInvocation([attackRoll])).toEqual(
      expect.objectContaining({
        access: { tag: "prepared" },
        resource: { tag: "spellSlot", slotLevel: 2 },
        procedure: "spellAttackSequence",
        spell,
        targeting: {
          kind: "spellAttackSequenceCreatureOrObject",
          countSource: "spellSlotLevel",
          attackCount: 3,
        },
        damage: {
          expr: { dice: 2, dieSize: 6 },
          damageType: "fire",
        },
        rangeFeet: 120,
        attackKind: "ranged_spell_attack",
        attackBonus: attackBonus(5),
      }),
    );

    const upcast = spellAct({
      state,
      spellId: scorchingRayUnitId,
      slotLevel: 3,
    });
    expect(targetChoiceHoles(upcast.initialHoles)).toHaveLength(4);
    expect(
      upcast.initialHoles.filter((hole) => hole.kind === "objectTargetChoice"),
    ).toHaveLength(4);
    const upcastAttackRoll = requireResultHole(
      resolveBattleSubject({
        state,
        subject: upcast.subject,
        fills: targetChoiceHoles(upcast.initialHoles).map((hole) =>
          spellTargetFill(
            hole,
            scorchingRayUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ),
      }),
      "attackRoll",
    );
    expect(spellHoleInvocation([upcastAttackRoll])).toEqual(
      expect.objectContaining({
        resource: { tag: "spellSlot", slotLevel: 3 },
        targeting: {
          kind: "spellAttackSequenceCreatureOrObject",
          countSource: "spellSlotLevel",
          attackCount: 4,
        },
      }),
    );
  });

  test("malformed canonical Scorching Ray ray-count selections are not admitted", () => {
    const spell = spellRecord(scorchingRayUnitId);
    const creatureOrObjectTargets = ["creature", "object"] as const;
    const malformedSpells = [
      scorchingRayWithTargetSelection(spell, {
        mode: "choose_up_to",
        repeatsAllowed: true,
        targetKinds: creatureOrObjectTargets,
        count: {
          kind: "linear",
          base: 2,
          baseLevel: 2,
          perSlotAboveBase: 1,
        },
      }),
      scorchingRayWithTargetSelection(spell, {
        mode: "choose_up_to",
        repeatsAllowed: true,
        targetKinds: creatureOrObjectTargets,
        count: {
          kind: "linear",
          base: 3,
          baseLevel: 2,
          perSlotAboveBase: 2,
        },
      }),
      scorchingRayWithTargetSelection(spell, {
        mode: "one",
        targetKinds: creatureOrObjectTargets,
      }),
      scorchingRayWithTargetSelection(spell, {
        mode: "choose_up_to",
        targetKinds: creatureOrObjectTargets,
        count: {
          kind: "linear",
          base: 3,
          baseLevel: 2,
          perSlotAboveBase: 1,
        },
      }),
    ] as const satisfies readonly SpellRecord[];

    for (const malformedSpell of malformedSpells) {
      expect(
        maybeSpellAct({
          state: spellBattle({
            preparedSpells: [malformedSpell],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
          spellId: scorchingRayUnitId,
          slotLevel: 2,
        }),
      ).toBeUndefined();
    }
  });

  test("scorching_ray resolves independent repeated and split creature rays", () => {
    const spell = spellRecord(scorchingRayUnitId);
    const secondTargetId = combatantId("unit-profile-scorching-ray-target-2");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 20,
      targetMaxHp: 20,
      extraTargetIds: [secondTargetId],
    });
    const act = spellAct({
      state,
      spellId: scorchingRayUnitId,
      slotLevel: 2,
    });
    const targetFills = targetChoiceHoles(act.initialHoles).map((hole, index) =>
      spellTargetFill(
        hole,
        scorchingRayUnitId,
        spellCasterId,
        index === 1 ? secondTargetId : spellTargetId,
      ),
    );
    const fills: BattleFill[] = [...targetFills];

    const firstAttack = requireResultHole(
      resolveBattleSubject({ state, subject: act.subject, fills }),
      "attackRoll",
    );
    fills.push(attackRollFill(firstAttack, { total: 15, naturalD20: 10 }));
    const firstDamage = requireResultHole(
      resolveBattleSubject({ state, subject: act.subject, fills }),
      "rolledDice",
    );
    fills.push(damageRollFillWithGroups(firstDamage, [[3, 4]]));

    const secondAttack = requireResultHole(
      resolveBattleSubject({ state, subject: act.subject, fills }),
      "attackRoll",
    );
    fills.push(attackRollFill(secondAttack, { total: 15, naturalD20: 10 }));
    const secondDamage = requireResultHole(
      resolveBattleSubject({ state, subject: act.subject, fills }),
      "rolledDice",
    );
    fills.push(damageRollFillWithGroups(secondDamage, [[2, 3]]));

    const thirdAttack = requireResultHole(
      resolveBattleSubject({ state, subject: act.subject, fills }),
      "attackRoll",
    );
    fills.push(attackRollFill(thirdAttack, { total: 15, naturalD20: 10 }));
    const thirdDamage = requireResultHole(
      resolveBattleSubject({ state, subject: act.subject, fills }),
      "rolledDice",
    );
    fills.push(damageRollFillWithGroups(thirdDamage, [[1, 1]]));

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills,
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Scorching Ray to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(11);
    expect(Number(requireCombatant(resolved.state, secondTargetId).hp)).toBe(7);
    expect(
      snapshotBattle(resolved.state).combatants.find(
        (combatant) => combatant.combatantId === spellCasterId,
      )?.origin,
    ).toEqual(
      expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 2, expended: 1 }),
          ]),
        }),
      }),
    );
  });
});

function targetChoiceHoles(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "targetChoice" }>[] {
  return holes.filter(
    (hole): hole is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
      hole.kind === "targetChoice",
  );
}

function scorchingRayWithTargetSelection(
  base: SpellRecord,
  selection: TargetSelection,
): SpellRecord {
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected Scorching Ray activation mechanics.");
  }
  const [phase] = base.mechanics.phases;
  if (
    phase?.kind !== "attack_roll" ||
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target"
  ) {
    throw new Error("Expected Scorching Ray target hole.");
  }
  // Cast evidence: the guards above narrow this helper to activation mechanics
  // with an attack-roll target-hole phase. The returned record preserves every
  // SpellRecord field and only replaces that phase's TargetSelection; TypeScript
  // cannot retain the original SpellRecord mechanics union through the spread.
  return {
    ...base,
    mechanics: {
      ...base.mechanics,
      phases: [
        {
          ...phase,
          attachment: {
            ...phase.attachment,
            value: {
              ...phase.attachment.value,
              selection,
            },
          },
        },
      ],
    },
  } as SpellRecord;
}
