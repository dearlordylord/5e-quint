// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV58C faerie_fire
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-attack-roll-advantage-save
import { describe, expect, test } from "vitest";
import {
  faerieFireUnitId,
  spellCasterId,
  spellTargetId,
  starryWispUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackTargetFill,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  faerieFireObjectOutlineFill,
  savingThrowOutcomeFill,
  spellAct,
  spellHoleInvocation,
  spellObjectTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  applyCondition,
  battleIlluminationFromLightEmitters,
  battleObjectId,
  breakBattleConcentration,
  movementFeet,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
  validateSavingThrowOutcomes,
} from "./unit-profile-admission-test-support.ts";
import type {
  BattleSpellSavingThrowOutcomeHole,
  BattleSubject,
} from "./unit-profile-admission-test-support.ts";

describe("SRDINV30E deterministic Faerie Fire Spell Unit admission", () => {
  test("faerie_fire is admitted as point-origin Cube save-gated outline effects", () => {
    const spell = spellRecord(faerieFireUnitId);
    const act = spellAct({
      state: spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      }),
      spellId: faerieFireUnitId,
      slotLevel: 1,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        faerieFireUnitId,
        1,
        "saveGatedAttackRollAdvantage",
      ),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Faerie Fire point-origin Cube Saving Throw outcomes",
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation([savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedAttackRollAdvantage",
        spell,
        resource: { tag: "spellSlot", slotLevel: 1 },
        ability: "dex",
        targeting: { kind: "pointOriginCube", sideFeet: 20 },
        effect: expect.objectContaining({
          kind: "faerieFireOutline",
          sourceSpellId: faerieFireUnitId,
          sourceCombatantId: spellCasterId,
          expiresAt: { kind: "concentration", combatantId: spellCasterId },
        }),
        rangeFeet: 60,
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "savingThrowOutcome",
        areaChoices: [],
      }),
    ]);
  });

  test("faerie_fire grants persistent attack Advantage against failed-save creatures", () => {
    const spell = spellRecord(faerieFireUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = spellAct({ state, spellId: faerieFireUnitId });
    const savingThrows = requireHole(act.initialHoles, "savingThrowOutcome");
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: spellCasterId, succeeded: true },
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.objectContaining({
            combatantId: spellCasterId,
            concentrating: true,
          }),
          expect.objectContaining({ combatantId: spellTargetId }),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Faerie Fire to resolve.");
    }
    expect(resolved.state.combatants.get(spellCasterId)?.activeEffects).toEqual(
      [],
    );
    expect(resolved.state.combatants.get(spellTargetId)?.activeEffects).toEqual(
      [
        expect.objectContaining({
          kind: "faerieFireOutline",
          sourceSpellId: faerieFireUnitId,
          sourceCombatantId: spellCasterId,
          expiresAt: { kind: "concentration", combatantId: spellCasterId },
        }),
      ],
    );
    expect(resolved.snapshot.lightEmitters).toEqual([
      {
        kind: "spellLightEmitter",
        sourceSpellId: faerieFireUnitId,
        sourceCombatantId: spellCasterId,
        attachment: { kind: "combatant", combatantId: spellTargetId },
        emission: { kind: "dim", radiusFeet: movementFeet(10) },
        opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
        expiresAt: { kind: "concentration", combatantId: spellCasterId },
      },
    ]);

    const afterCasterTurn = resolveBattleSubject({
      state: resolved.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    if (afterCasterTurn.tag !== "resolved") {
      throw new Error("Expected Faerie Fire caster end turn to resolve.");
    }
    const afterTargetTurn = resolveBattleSubject({
      state: afterCasterTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [],
    });
    if (afterTargetTurn.tag !== "resolved") {
      throw new Error("Expected Faerie Fire target end turn to resolve.");
    }
    const attackSubject: BattleSubject = {
      tag: "action",
      actorId: spellCasterId,
      action: "attack",
      attackName: "Unarmed Strike",
    };
    const targetHole = requireResultHole(
      resolveBattleSubject({
        state: afterTargetTurn.state,
        subject: attackSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: afterTargetTurn.state,
        subject: attackSubject,
        fills: [attackTargetFill(targetHole, spellCasterId, spellTargetId)],
      }),
      "attackRoll",
    );
    expect(attackRoll).toMatchObject({ rollMode: "advantage" });
  });

  test("faerie_fire outline denies Invisible benefit for affected creatures", () => {
    const spell = spellRecord(faerieFireUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = spellAct({ state, spellId: faerieFireUnitId });
    const savingThrows = requireHole(act.initialHoles, "savingThrowOutcome");
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Faerie Fire to resolve.");
    }
    const target = resolved.state.combatants.get(spellTargetId);
    if (target === undefined) {
      throw new Error("Expected Faerie Fire target combatant.");
    }
    if (target.positiveHpUnconscious !== null) {
      throw new Error("Expected a conscious Faerie Fire target combatant.");
    }
    const unseenState = {
      ...resolved.state,
      combatants: new Map(resolved.state.combatants).set(spellTargetId, {
        ...target,
        conditions: applyCondition(target.conditions, "invisible"),
      }),
    };
    const afterCasterTurn = resolveBattleSubject({
      state: unseenState,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    if (afterCasterTurn.tag !== "resolved") {
      throw new Error("Expected Faerie Fire caster end turn to resolve.");
    }
    const afterTargetTurn = resolveBattleSubject({
      state: afterCasterTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [],
    });
    if (afterTargetTurn.tag !== "resolved") {
      throw new Error("Expected Faerie Fire target end turn to resolve.");
    }
    const attackSubject: BattleSubject = {
      tag: "action",
      actorId: spellCasterId,
      action: "attack",
      attackName: "Unarmed Strike",
    };
    const targetHole = requireResultHole(
      resolveBattleSubject({
        state: afterTargetTurn.state,
        subject: attackSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: afterTargetTurn.state,
        subject: attackSubject,
        fills: [attackTargetFill(targetHole, spellCasterId, spellTargetId)],
      }),
      "attackRoll",
    );
    expect(attackRoll).toMatchObject({ rollMode: "advantage" });
  });

  test("breaking faerie_fire Concentration clears its attack Advantage effect", () => {
    const spell = spellRecord(faerieFireUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = spellAct({ state, spellId: faerieFireUnitId });
    const savingThrows = requireHole(act.initialHoles, "savingThrowOutcome");
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Faerie Fire to resolve.");
    }

    const afterCasterTurn = resolveBattleSubject({
      state: resolved.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    if (afterCasterTurn.tag !== "resolved") {
      throw new Error("Expected Faerie Fire caster end turn to resolve.");
    }
    const afterTargetTurn = resolveBattleSubject({
      state: afterCasterTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [],
    });
    if (afterTargetTurn.tag !== "resolved") {
      throw new Error("Expected Faerie Fire target end turn to resolve.");
    }
    const recast = spellAct({
      state: afterTargetTurn.state,
      spellId: faerieFireUnitId,
    });
    const recastSavingThrows = requireHole(
      recast.initialHoles,
      "savingThrowOutcome",
    );
    const broken = resolveBattleSubject({
      state: afterTargetTurn.state,
      subject: recast.subject,
      fills: [
        savingThrowOutcomeFill(recastSavingThrows, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });

    expect(broken).toMatchObject({ tag: "resolved" });
    if (broken.tag !== "resolved") {
      throw new Error("Expected Faerie Fire recast to resolve.");
    }
    expect(broken.state.combatants.get(spellTargetId)?.activeEffects).toEqual(
      [],
    );
  });

  test("faerie_fire stores caller-supplied object outlines until Concentration ends", () => {
    const spell = spellRecord(faerieFireUnitId);
    const objectId = battleObjectId("faerie-fire-object");
    const state = spellBattle({ preparedSpells: [spell] });
    const act = spellAct({ state, spellId: faerieFireUnitId });
    const savingThrows = requireHole(act.initialHoles, "savingThrowOutcome");
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [faerieFireObjectOutlineFill(savingThrows, [objectId])],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Faerie Fire object outline to resolve.");
    }
    expect(resolved.state.objectOutlines).toEqual([
      {
        kind: "faerieFireObjectOutline",
        objectId,
        sourceSpellId: faerieFireUnitId,
        sourceCombatantId: spellCasterId,
        expiresAt: { kind: "concentration", combatantId: spellCasterId },
      },
    ]);
    expect(resolved.snapshot.lightEmitters).toEqual([
      {
        kind: "spellLightEmitter",
        sourceSpellId: faerieFireUnitId,
        sourceCombatantId: spellCasterId,
        attachment: { kind: "object", objectId },
        emission: { kind: "dim", radiusFeet: movementFeet(10) },
        opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
        expiresAt: { kind: "concentration", combatantId: spellCasterId },
      },
    ]);
    expect(
      battleIlluminationFromLightEmitters(resolved.snapshot.lightEmitters, [
        {
          kind: "object",
          objectId,
          distanceFeet: movementFeet(10),
          opaqueCover: true,
        },
      ]),
    ).toBe("dimLight");
    const concentrationBroken = breakBattleConcentration(
      resolved.state,
      spellCasterId,
    );
    expect(concentrationBroken.objectOutlines).toEqual([]);
    expect(snapshotBattle(concentrationBroken).lightEmitters).toEqual([]);
  });

  test("faerie_fire object area facts require outline mechanics, not spell identity", () => {
    const spell = spellRecord(faerieFireUnitId);
    const objectId = battleObjectId("faerie-fire-rejected-object");
    const state = spellBattle({ preparedSpells: [spell] });
    const act = spellAct({ state, spellId: faerieFireUnitId });
    const savingThrows = requireHole(act.initialHoles, "savingThrowOutcome");
    if (!("spell" in savingThrows) || !("areaChoices" in savingThrows)) {
      throw new Error("Expected spell Saving Throw outcome hole.");
    }
    const spellSavingThrows: BattleSpellSavingThrowOutcomeHole = savingThrows;
    const invocation = spellHoleInvocation([savingThrows]);
    if (invocation.procedure !== "saveGatedAttackRollAdvantage") {
      throw new Error("Expected Faerie Fire save-gated attack Advantage.");
    }
    const sameProcedureNonFaerieFireHole: BattleSpellSavingThrowOutcomeHole = {
      ...spellSavingThrows,
      spell: {
        ...invocation,
        spell: {
          ...spell,
          name: "Future Save Advantage",
        },
      },
    };
    const fill = faerieFireObjectOutlineFill(savingThrows, [objectId]);

    expect(
      validateSavingThrowOutcomes(
        fill.value,
        sameProcedureNonFaerieFireHole,
        state,
        spellCasterId,
        undefined,
      ),
    ).toBeNull();
  });

  test("faerie_fire object outline grants object-target attack Advantage from supplied sight facts", () => {
    const faerieFire = spellRecord(faerieFireUnitId);
    const starryWisp = spellRecord(starryWispUnitId);
    const objectId = battleObjectId("faerie-fire-starry-wisp-object");
    const state = spellBattle({
      preparedSpells: [faerieFire],
      cantrips: [starryWisp],
    });
    const faerieFireAct = spellAct({ state, spellId: faerieFireUnitId });
    const savingThrows = requireHole(
      faerieFireAct.initialHoles,
      "savingThrowOutcome",
    );
    const outlined = resolveBattleSubject({
      state,
      subject: faerieFireAct.subject,
      fills: [faerieFireObjectOutlineFill(savingThrows, [objectId])],
    });
    if (outlined.tag !== "resolved") {
      throw new Error("Expected Faerie Fire object outline to resolve.");
    }
    const afterCasterTurn = resolveBattleSubject({
      state: outlined.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    if (afterCasterTurn.tag !== "resolved") {
      throw new Error("Expected Faerie Fire caster end turn to resolve.");
    }
    const afterTargetTurn = resolveBattleSubject({
      state: afterCasterTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [],
    });
    if (afterTargetTurn.tag !== "resolved") {
      throw new Error("Expected Faerie Fire target end turn to resolve.");
    }
    const attackAct = spellAct({
      state: afterTargetTurn.state,
      spellId: starryWispUnitId,
    });
    const objectTarget = requireHole(
      attackAct.initialHoles,
      "objectTargetChoice",
    );
    const objectFill = spellObjectTargetFill({
      hole: objectTarget,
      objectId,
      spellId: starryWispUnitId,
      casterId: attackAct.subject.actorId,
      attackerCanSeeObject: true,
    });
    const attackRequest = resolveBattleSubject({
      state: afterTargetTurn.state,
      subject: attackAct.subject,
      fills: [objectFill],
    });
    if (attackRequest.tag === "invalid") {
      throw new Error(attackRequest.message);
    }
    const attackRoll = requireResultHole(attackRequest, "attackRoll");

    expect(attackRoll).toMatchObject({ rollMode: "advantage" });
  });
});
