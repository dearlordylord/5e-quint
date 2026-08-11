import { describe, expect, test } from "vitest";
import {
  damageRollFillWithGroups,
  resolveBattleSubject,
} from "./battle-runtime.test-support.ts";
import {
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { hasCondition } from "./unit-profile-admission.test-support.ts";
import {
  abilityChoiceFill,
  savingThrowOutcomeFill,
  spellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  contagionUnitId,
  mindSpikeDurationTicks,
  mindSpikeUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";

describe("battle runtime: save resolution coverage", () => {
  test("Contagion resolves a chosen failed-save ability and Poisoned lifecycle", () => {
    const session = spellBattle({
      preparedSpells: [spellRecord(contagionUnitId)],
      spellSlots: [{ spellLevel: 5, count: 1 }],
      casterClassLevels: [{ className: "cleric", level: 9 }],
      targetHp: 100,
      targetMaxHp: 100,
    });
    const act = spellAct({
      session,
      spellId: contagionUnitId,
      slotLevel: 5,
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const abilityHole = requireHole(act.initialHoles, "abilityChoice");
    const targetFill = spellTargetFill(
      targetHole,
      contagionUnitId,
      spellCasterId,
      spellTargetId,
    );
    const awaitingAbilityChoice = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetFill],
    });
    expect(requireResultHole(awaitingAbilityChoice, "abilityChoice")).toEqual(
      expect.objectContaining({
        choices: ["str", "dex", "con", "int", "wis", "cha"],
      }),
    );
    const abilityFill = abilityChoiceFill(abilityHole, "wis");
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [targetFill, abilityFill],
      }),
      "savingThrowOutcome",
    );
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const damage = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [targetFill, abilityFill, saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        targetFill,
        abilityFill,
        saveFill,
        damageRollFillWithGroups(damage, [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Contagion to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(89);
    expect(
      hasCondition(
        requireCombatant(resolved.state, spellTargetId).conditions,
        "poisoned",
      ),
    ).toBe(true);
    expect(
      requireCombatant(resolved.state, spellTargetId).activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "spellConditionCountedEndTurnSave",
        condition: "poisoned",
        savingThrowDisadvantageAbility: "wis",
        successes: 0,
        failures: 0,
        lockedIn: false,
      }),
    ]);
  });

  test("Mind Spike failed save applies damage and starts bounded Concentration", () => {
    const session = spellBattle({
      preparedSpells: [spellRecord(mindSpikeUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const act = spellAct({
      session,
      spellId: mindSpikeUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spellTargetFill(
      targetHole,
      mindSpikeUnitId,
      spellCasterId,
      spellTargetId,
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const damage = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [targetFill, saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        targetFill,
        saveFill,
        damageRollFillWithGroups(damage, [[4, 4, 4]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Mind Spike to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(18);
    expect(
      requireCombatant(resolved.state, spellCasterId).concentration,
    ).toEqual({
      sourceProcedureRef: act.subject.procedureRef,
      effectKind: "spellEffect",
    });
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toEqual([
      {
        kind: "spellConcentrationDuration",
        sourceProcedureRef: act.subject.procedureRef,
        sourceCombatantId: spellCasterId,
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: mindSpikeDurationTicks,
        },
      },
    ]);
  });
});
