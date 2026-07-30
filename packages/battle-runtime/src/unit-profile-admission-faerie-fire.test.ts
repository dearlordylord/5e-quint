import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV58C faerie_fire
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-attack-roll-advantage-save
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { characterAttackSubjectForTest } from "./battle-runtime.test-support.ts";
import {
  faerieFireUnitId,
  spellCasterId,
  spellTargetId,
  starryWispUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  attackTargetFill,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  applyCondition,
  battleIlluminationFromLightEmitters,
  battleObjectId,
  breakBattleConcentration,
  combatantId,
  movementFeet,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
  validateSavingThrowOutcomes,
} from "./unit-profile-admission.test-support.ts";
import { characterSpellProcedure } from "./character-execution-admission.ts";
import {
  faerieFireObjectOutlineFill,
  savingThrowOutcomeFill,
  spellAct,
  spellObjectTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import type { BattleSubject } from "./unit-profile-admission.test-support.ts";

describe("SRDINV30E deterministic Faerie Fire Spell Unit admission", () => {
  test("faerie_fire is admitted as point-origin Cube save-gated outline effects", () => {
    const spell = spellRecord(faerieFireUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: faerieFireUnitId,
      slotLevel: 1,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
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
        label: "Spell point-origin Cube Saving Throw outcomes",
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(savingThrow).toMatchObject({ outcomeTargeting: "area" });
    expect("spell" in savingThrow).toBe(false);
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
    const act = spellAct({ session: state, spellId: faerieFireUnitId });
    const savingThrows = requireHole(act.initialHoles, "savingThrowOutcome");
    const resolved = resolveBattleSubject({
      state: state.state,
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
          sourceProcedureRef: expect.any(String),
          sourceCombatantId: spellCasterId,
          expiresAt: { kind: "concentration", combatantId: spellCasterId },
        }),
      ],
    );
    expect(resolved.snapshot.lightEmitters).toEqual([
      {
        kind: "spellLightEmitter",
        sourceProcedureRef: expect.any(String),
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
    const attackSubject: BattleSubject = characterAttackSubjectForTest(
      afterTargetTurn.state,
      spellCasterId,
      "Unarmed Strike",
    );
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
    const act = spellAct({ session: state, spellId: faerieFireUnitId });
    const savingThrows = requireHole(act.initialHoles, "savingThrowOutcome");
    const resolved = resolveBattleSubject({
      state: state.state,
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
    const attackSubject: BattleSubject = characterAttackSubjectForTest(
      afterTargetTurn.state,
      spellCasterId,
      "Unarmed Strike",
    );
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
    const act = spellAct({ session: state, spellId: faerieFireUnitId });
    const savingThrows = requireHole(act.initialHoles, "savingThrowOutcome");
    const resolved = resolveBattleSubject({
      state: state.state,
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
      session: battleRuntimeSessionForTest({
        ...state,
        state: afterTargetTurn.state,
      }),
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
    const act = spellAct({ session: state, spellId: faerieFireUnitId });
    const savingThrows = requireHole(act.initialHoles, "savingThrowOutcome");
    const resolved = resolveBattleSubject({
      state: state.state,
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
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: spellCasterId,
        expiresAt: { kind: "concentration", combatantId: spellCasterId },
      },
    ]);
    expect(resolved.snapshot.lightEmitters).toEqual([
      {
        kind: "spellLightEmitter",
        sourceProcedureRef: expect.any(String),
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
    const act = spellAct({ session: state, spellId: faerieFireUnitId });
    const savingThrows = requireHole(act.initialHoles, "savingThrowOutcome");
    if (!("outcomeTargeting" in savingThrows)) {
      throw new Error("Expected spell Saving Throw outcome hole.");
    }
    const actor = state.state.combatants.get(spellCasterId);
    const invocation =
      actor?.origin.kind === "character"
        ? characterSpellProcedure(
            actor.origin.execution,
            act.subject.procedureRef,
          )
        : undefined;
    if (invocation === undefined) {
      throw new Error("Expected an executable Faerie Fire procedure.");
    }
    if (invocation.procedure !== "saveGatedAttackRollAdvantage") {
      throw new Error("Expected Faerie Fire save-gated attack Advantage.");
    }
    expect(battleActSpellPresentation(act)?.invocation.spellId).toBe(spell.id);
    const fill = faerieFireObjectOutlineFill(savingThrows, [objectId]);
    if (
      !("area" in fill.value) ||
      !("kind" in fill.value.area) ||
      fill.value.area.kind !== "faerieFireArea"
    ) {
      throw new Error("Expected Faerie Fire object-area facts.");
    }

    expect(
      validateSavingThrowOutcomes(
        fill.value,
        invocation,
        state.state,
        spellCasterId,
        undefined,
      ),
    ).toBeNull();
    expect(
      validateSavingThrowOutcomes(
        {
          ...fill.value,
          area: {
            ...fill.value.area,
            affectedObjectIds: [objectId, objectId],
          },
        },
        invocation,
        state.state,
        spellCasterId,
        undefined,
      ),
    ).toBe("Faerie Fire area affected objects must not duplicate object ids.");
    expect(
      validateSavingThrowOutcomes(
        {
          ...fill.value,
          area: {
            ...fill.value.area,
            originAnchorId: combatantId("combatant:faerie-fire-foreign-origin"),
          },
        },
        invocation,
        state.state,
        spellCasterId,
        undefined,
      ),
    ).toBe(
      "Save-gate spell area origin anchor must be a combatant in this battle.",
    );
  });

  test("faerie_fire area outcomes form a bijection with current-battle affected targets", () => {
    const spell = spellRecord(faerieFireUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = spellAct({ session: state, spellId: faerieFireUnitId });
    const actor = state.state.combatants.get(spellCasterId);
    const invocation =
      actor?.origin.kind === "character"
        ? characterSpellProcedure(
            actor.origin.execution,
            act.subject.procedureRef,
          )
        : undefined;
    if (invocation?.procedure !== "saveGatedAttackRollAdvantage") {
      throw new Error("Expected Faerie Fire save-gated attack Advantage.");
    }
    const foreignTargetId = combatantId("combatant:faerie-fire-foreign-target");
    const targetId = fc.constantFrom(
      spellCasterId,
      spellTargetId,
      foreignTargetId,
    );
    const affectedTargetIds = fc.array(targetId, { maxLength: 4 });
    const outcomes = fc.array(
      fc.record({ targetId, succeeded: fc.boolean() }),
      { maxLength: 4 },
    );

    fc.assert(
      fc.property(
        affectedTargetIds,
        outcomes,
        (generatedAffectedTargetIds, generatedOutcomes) => {
          const validation = validateSavingThrowOutcomes(
            {
              area: {
                kind: "faerieFireArea",
                originAnchorId: spellCasterId,
                affectedTargetIds: generatedAffectedTargetIds,
                affectedObjectIds: [],
              },
              outcomes: generatedOutcomes,
            },
            invocation,
            state.state,
            spellCasterId,
            undefined,
          );
          const affectedSet = new Set(generatedAffectedTargetIds);
          const outcomeSet = new Set(
            generatedOutcomes.map((outcome) => outcome.targetId),
          );
          const isBijectionOfCurrentBattleTargets =
            affectedSet.size === generatedAffectedTargetIds.length &&
            outcomeSet.size === generatedOutcomes.length &&
            affectedSet.size === outcomeSet.size &&
            generatedAffectedTargetIds.every(
              (generatedTargetId) =>
                state.state.combatants.has(generatedTargetId) &&
                outcomeSet.has(generatedTargetId),
            );

          expect(validation === null).toBe(isBijectionOfCurrentBattleTargets);
        },
      ),
      {
        examples: [
          [
            [spellCasterId, spellTargetId],
            [
              { targetId: spellTargetId, succeeded: false },
              { targetId: spellCasterId, succeeded: true },
            ],
          ],
          [
            [spellTargetId, spellTargetId],
            [{ targetId: spellTargetId, succeeded: true }],
          ],
          [[foreignTargetId], [{ targetId: foreignTargetId, succeeded: true }]],
          [[spellTargetId], [{ targetId: spellCasterId, succeeded: true }]],
          [
            [spellTargetId],
            [
              { targetId: spellTargetId, succeeded: true },
              { targetId: spellTargetId, succeeded: false },
            ],
          ],
          [
            [spellTargetId, spellCasterId],
            [{ targetId: spellTargetId, succeeded: true }],
          ],
        ],
      },
    );
  });

  test("faerie_fire object outline grants object-target attack Advantage from supplied sight facts", () => {
    const faerieFire = spellRecord(faerieFireUnitId);
    const starryWisp = spellRecord(starryWispUnitId);
    const objectId = battleObjectId("faerie-fire-starry-wisp-object");
    const state = spellBattle({
      preparedSpells: [faerieFire],
      cantrips: [starryWisp],
    });
    const faerieFireAct = spellAct({
      session: state,
      spellId: faerieFireUnitId,
    });
    const savingThrows = requireHole(
      faerieFireAct.initialHoles,
      "savingThrowOutcome",
    );
    const outlined = resolveBattleSubject({
      state: state.state,
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
      session: battleRuntimeSessionForTest({
        ...state,
        state: afterTargetTurn.state,
      }),
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
