// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST dragons_breath
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-dragons-breath-initial
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE
import { describe, expect, test } from "vitest";
import dragonsBreathInput from "../../surface/content/dragons_breath.json";
import {
  dragonsBreathUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  knownWillingSpellTargetListFill,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import {
  breakBattleConcentration,
  decodeUnitRecordSync,
  elapsedTimeTicks,
  resolveBattleSubject,
  spellSaveDcForCaster,
  spellSlotInvocationRef,
  type BattleHole,
  type BattleState,
  type DamageType,
  type SpellRecord,
} from "./unit-profile-admission-test-support.ts";

describe("Dragon's Breath initial cast admission", () => {
  test("stores chosen damage type, original slot, and caster save DC on the willing target", () => {
    const spell = dragonsBreathSpell();
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
    });
    const act = bonusSpellAct({
      state,
      spellId: dragonsBreathUnitId,
      slotLevel: 3,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const damageTypeHole = requireHole(act.initialHoles, "damageTypeChoice");
    const expectedSpellSaveDc = spellSaveDcForCaster(state, spellCasterId);
    if (expectedSpellSaveDc === null) {
      throw new Error("Expected fixture caster Spell Save DC.");
    }

    expect(act.subject).toEqual({
      tag: "bonusActionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        dragonsBreathUnitId,
        3,
        "dragonsBreathInitial",
      ),
      mode: { tag: "cast" },
    });
    expect(damageTypeHole.choices).toEqual([
      "acid",
      "cold",
      "fire",
      "lightning",
      "poison",
    ]);

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetListFill(
          targetHole,
          spellCasterId,
          dragonsBreathUnitId,
          [spellTargetId],
        ),
        damageTypeChoiceFill(damageTypeHole, "fire"),
      ],
    });

    if (resolved.tag !== "resolved") {
      throw new Error(
        `Expected Dragon's Breath to resolve: ${JSON.stringify(resolved)}`,
      );
    }
    expect(resolved).toMatchObject({ tag: "resolved" });
    expect(requireCombatant(resolved.state, spellCasterId).concentration).toEqual(
      {
        sourceSpellId: dragonsBreathUnitId,
        effectKind: "spellEffect",
      },
    );
    expect(
      requireCombatant(resolved.state, spellTargetId).activeEffects,
    ).toContainEqual({
      kind: "dragonsBreath",
      sourceSpellId: dragonsBreathUnitId,
      sourceCombatantId: spellCasterId,
      originalSlotLevel: 3,
      damageType: "fire",
      spellSaveDc: expectedSpellSaveDc,
      expiresAt: {
        kind: "concentration",
        combatantId: spellCasterId,
        durationTicks: elapsedTimeTicks(10),
      },
    });
  });

  test("requires willing target evidence and removes the target-attached effect when concentration ends", () => {
    const spell = dragonsBreathSpell();
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = bonusSpellAct({
      state,
      spellId: dragonsBreathUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const damageTypeHole = requireHole(act.initialHoles, "damageTypeChoice");

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          spellTargetListFill(
            targetHole,
            spellCasterId,
            dragonsBreathUnitId,
            [spellTargetId],
          ),
          damageTypeChoiceFill(damageTypeHole, "acid"),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    const resolved = castDragonsBreath(state, "acid");
    const afterConcentration = breakBattleConcentration(
      resolved,
      spellCasterId,
    );

    expect(
      requireCombatant(afterConcentration, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "dragonsBreath",
      ),
    ).toBe(false);
  });
});

function castDragonsBreath(
  state: BattleState,
  damageType: DamageType,
): BattleState {
  const act = bonusSpellAct({
    state,
    spellId: dragonsBreathUnitId,
    slotLevel: 2,
  });
  const targetHole = requireHole(act.initialHoles, "spellTargetList");
  const damageTypeHole = requireHole(act.initialHoles, "damageTypeChoice");
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      knownWillingSpellTargetListFill(
        targetHole,
        spellCasterId,
        dragonsBreathUnitId,
        [spellTargetId],
      ),
      damageTypeChoiceFill(damageTypeHole, damageType),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error(
      `Expected Dragon's Breath to resolve: ${JSON.stringify(resolved)}`,
    );
  }
  expect(resolved).toMatchObject({ tag: "resolved" });
  return resolved.state;
}

function dragonsBreathSpell(): SpellRecord {
  const unit = decodeUnitRecordSync(dragonsBreathInput);
  if (unit.kind !== "spell") {
    throw new Error("Expected Dragon's Breath fixture to decode as a spell.");
  }
  return unit;
}

function damageTypeChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "damageTypeChoice" }>,
  damageType: DamageType,
) {
  return {
    kind: "damageTypeChoice" as const,
    holeId: hole.holeId,
    value: damageType,
  };
}
