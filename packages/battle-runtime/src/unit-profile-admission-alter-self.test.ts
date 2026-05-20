// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-ALTER-SELF-AQUATIC-RUNTIME alter_self
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-self-transformation-mode
import { describe, expect, test } from "vitest";
import {
  alterSelfUnitId,
  battleCreatureCanBreatheUnderwater,
  breakBattleConcentration,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  requireHole,
  resolveBattleSubject,
  snapshotBattle,
  spellAct,
  spellBattle,
  spellCasterId,
  spellRecord,
  spellSlotInvocationRef,
  spellTargetId,
} from "./unit-profile-admission-test-support.ts";

describe("L12G Alter Self self-transformation Spell Unit admission", () => {
  test("Aquatic Adaptation grants water breathing and a Swim Speed linked to Speed", () => {
    const spell = spellRecord(alterSelfUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: alterSelfUnitId,
      slotLevel: 2,
    });
    const modeHole = requireHole(
      act.initialHoles,
      "selfTransformationModeChoice",
    );

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        alterSelfUnitId,
        2,
        "selfTransformationMode",
      ),
      mode: { tag: "cast" },
    });
    expect(modeHole.choices).toEqual([
      "aquaticAdaptation",
      "changeAppearance",
    ]);

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        {
          kind: "selfTransformationModeChoice",
          holeId: modeHole.holeId,
          value: "aquaticAdaptation",
        },
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.objectContaining({
            combatantId: spellCasterId,
            concentrating: true,
            movement: expect.objectContaining({
              speedKinds: expect.arrayContaining([
                expect.objectContaining({
                  kind: "swim",
                  speedFeet: 30,
                  remainingFeet: 30,
                }),
              ]),
            }),
          }),
          expect.anything(),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Alter Self to resolve.");
    }
    const caster = resolved.state.combatants.get(spellCasterId);
    expect(battleCreatureCanBreatheUnderwater(caster)).toBe(true);
    expect(caster?.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "selfTransformation",
        sourceSpellId: alterSelfUnitId,
        sourceCombatantId: spellCasterId,
        mode: "aquaticAdaptation",
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(600),
        },
      }),
    );
  });

  test("Magic action replacement swaps the selected mode without resetting duration", () => {
    const spell = spellRecord(alterSelfUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: alterSelfUnitId,
      slotLevel: 2,
    });
    const modeHole = requireHole(
      act.initialHoles,
      "selfTransformationModeChoice",
    );
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        {
          kind: "selfTransformationModeChoice",
          holeId: modeHole.holeId,
          value: "aquaticAdaptation",
        },
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Alter Self to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster end turn to resolve.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected target end turn to resolve.");
    }
    const activeBefore = casterTurn.state.combatants
      .get(spellCasterId)
      ?.activeEffects.find(
        (effect) => effect.kind === "selfTransformation",
      );
    expect(activeBefore).toBeDefined();
    if (activeBefore?.kind !== "selfTransformation") {
      throw new Error("Expected active self-transformation effect.");
    }

    const replacementAct = discoverBattleActs(casterTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "replaceSelfTransformationMode" &&
        candidate.subject.mode === "changeAppearance",
    );
    expect(replacementAct).toBeDefined();
    if (replacementAct === undefined) {
      throw new Error("Expected Change Appearance replacement act.");
    }

    const replaced = resolveBattleSubject({
      state: casterTurn.state,
      subject: replacementAct.subject,
      fills: [],
    });

    expect(replaced).toMatchObject({ tag: "resolved" });
    if (replaced.tag !== "resolved") {
      throw new Error("Expected mode replacement to resolve.");
    }
    const caster = replaced.state.combatants.get(spellCasterId);
    expect(battleCreatureCanBreatheUnderwater(caster)).toBe(false);
    expect(caster?.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "selfTransformation",
        sourceSpellId: alterSelfUnitId,
        sourceCombatantId: spellCasterId,
        mode: "changeAppearance",
        expiresAt: activeBefore.expiresAt,
      }),
    );
    const casterSnapshot = snapshotBattle(replaced.state).combatants.find(
      (combatant) => combatant.combatantId === spellCasterId,
    );
    expect(casterSnapshot?.movement.speedKinds).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "swim" })]),
    );
  });

  test("Concentration cleanup removes the active option projection", () => {
    const spell = spellRecord(alterSelfUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: alterSelfUnitId,
      slotLevel: 2,
    });
    const modeHole = requireHole(
      act.initialHoles,
      "selfTransformationModeChoice",
    );
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        {
          kind: "selfTransformationModeChoice",
          holeId: modeHole.holeId,
          value: "aquaticAdaptation",
        },
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Alter Self to resolve.");
    }

    const broken = breakBattleConcentration(resolved.state, spellCasterId);
    const caster = broken.combatants.get(spellCasterId);

    expect(battleCreatureCanBreatheUnderwater(caster)).toBe(false);
    expect(caster?.activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "selfTransformation",
          sourceSpellId: alterSelfUnitId,
        }),
      ]),
    );
    const casterSnapshot = snapshotBattle(broken).combatants.find(
      (combatant) => combatant.combatantId === spellCasterId,
    );
    expect(casterSnapshot?.movement.speedKinds).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "swim" })]),
    );
  });
});
