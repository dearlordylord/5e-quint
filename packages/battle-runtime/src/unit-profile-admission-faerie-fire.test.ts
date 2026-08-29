import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV58C faerie_fire
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-attack-roll-advantage-save
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import fc from "fast-check";
import { describe, expect, test } from "vitest";
import { characterAttackSubjectForTest } from "./battle-runtime.test-support.ts";
import {
  burningHandsUnitId,
  faerieFireUnitId,
  gustOfWindUnitId,
  spellCasterId,
  spellTargetId,
  starryWispUnitId,
  thunderwaveUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  attackTargetFill,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  declineTargetReadiedSpellAfterFailedSave,
  spellBattle,
  spellBattleWithTargetReadiedRay,
} from "./unit-profile-admission-spell-battle.test-support.ts";
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

type SavingThrowFill = ReturnType<typeof savingThrowOutcomeFill>;

function malformedAreaSavingThrowFill(
  hole: Parameters<typeof savingThrowOutcomeFill>[0],
  area: unknown,
): SavingThrowFill {
  const base = savingThrowOutcomeFill(hole, [
    { targetId: spellTargetId, succeeded: false },
  ]);
  // Deliberately cross the typed fill boundary to model caller-mutated
  // runtime data. `resolveBattleSubject` receives typed fills; it does not
  // parse unknown input, and the branded ids/types are erased at runtime.
  return {
    ...base,
    value:
      area === undefined
        ? { outcomes: base.value.outcomes }
        : { area, outcomes: base.value.outcomes },
  } as SavingThrowFill;
}

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

  test.each([
    {
      name: "missing area facts",
      spellId: faerieFireUnitId,
      area: undefined,
      message: "Spell saving throw outcomes require area facts.",
    },
    {
      name: "Grease area facts on a non-Grease spell",
      spellId: faerieFireUnitId,
      area: {
        kind: "persistentAreaSaveConditionArea",
        originAnchorId: spellCasterId,
        affectedTargetIds: [spellTargetId],
      },
      message: "Grease ground-area facts are only valid for Grease.",
    },
    {
      name: "Gust of Wind area facts on a non-Gust spell",
      spellId: faerieFireUnitId,
      area: {
        kind: "directionalPersistentAreaArea",
        originAnchorId: spellCasterId,
        affectedTargetIds: [spellTargetId],
      },
      message: "Gust of Wind Line area facts are only valid for Gust of Wind.",
    },
    {
      name: "Slow area facts on a non-Slow spell",
      spellId: faerieFireUnitId,
      area: {
        kind: "saveGatedTurnConstraintBundleArea",
        originAnchorId: spellCasterId,
        affectedTargetIds: [spellTargetId],
      },
      message: "Slow area facts are only valid for Slow.",
    },
    {
      name: "Sleep non-sleeper facts on a non-Sleep spell",
      spellId: faerieFireUnitId,
      area: {
        sleepNonSleeperFacts: [],
        originAnchorId: spellCasterId,
        affectedTargetIds: [spellTargetId],
      },
      message:
        "Sleep non-sleeper facts are only valid for Sleep target admission.",
    },
    {
      name: "Faerie Fire area facts on a non-Faerie Fire spell",
      spellId: burningHandsUnitId,
      area: {
        kind: "saveGatedTargetProjectionArea",
        originAnchorId: spellCasterId,
        affectedTargetIds: [],
        affectedObjectIds: [],
      },
      message: "Faerie Fire object area facts are only valid for Faerie Fire.",
    },
    {
      name: "duplicate Faerie Fire object ids",
      spellId: faerieFireUnitId,
      area: {
        kind: "saveGatedTargetProjectionArea",
        originAnchorId: spellCasterId,
        affectedTargetIds: [],
        affectedObjectIds: [
          battleObjectId("faerie-fire-boundary-duplicate"),
          battleObjectId("faerie-fire-boundary-duplicate"),
        ],
      },
      message:
        "Faerie Fire area affected objects must not duplicate object ids.",
    },
    {
      name: "self-origin Cone anchored away from the caster",
      spellId: burningHandsUnitId,
      area: {
        originAnchorId: spellTargetId,
        affectedTargetIds: [spellTargetId],
      },
      message:
        "Self-origin Cone save-gate spell area must originate from the caster.",
    },
    {
      name: "origin anchor outside this battle",
      spellId: faerieFireUnitId,
      area: {
        originAnchorId: combatantId("faerie-fire-boundary-foreign-origin"),
        affectedTargetIds: [spellTargetId],
      },
      message:
        "Save-gate spell area origin anchor must be a combatant in this battle.",
    },
    {
      name: "self-origin Cube anchored away from the caster",
      spellId: thunderwaveUnitId,
      area: {
        originAnchorId: spellTargetId,
        affectedTargetIds: [spellTargetId],
      },
      message:
        "Self-origin Cube save-gate spell area must originate from the caster.",
    },
    {
      name: "self-origin Line anchored away from the caster",
      spellId: gustOfWindUnitId,
      area: {
        originAnchorId: spellTargetId,
        affectedTargetIds: [spellTargetId],
      },
      message:
        "Self-origin Line save-gate spell area must originate from the caster.",
    },
    {
      name: "duplicate affected targets",
      spellId: faerieFireUnitId,
      area: {
        originAnchorId: spellCasterId,
        affectedTargetIds: [spellTargetId, spellTargetId],
      },
      message:
        "Save-gate spell area affected targets must not duplicate targets.",
    },
    {
      name: "affected target outside this battle",
      spellId: faerieFireUnitId,
      area: {
        originAnchorId: spellCasterId,
        affectedTargetIds: [combatantId("faerie-fire-boundary-foreign-target")],
      },
      message:
        "Save-gate spell area affected target must be a combatant in this battle.",
    },
    {
      name: "Thunderwave push facts on a non-Thunderwave spell",
      spellId: burningHandsUnitId,
      area: {
        kind: "thunderwaveArea",
        originAnchorId: spellCasterId,
        affectedTargetIds: [spellTargetId],
      },
      message: "Thunderwave push facts are only valid for Thunderwave.",
    },
    {
      name: "Fireball ignition facts on a non-Fireball spell",
      spellId: burningHandsUnitId,
      area: {
        kind: "fireballArea",
        originAnchorId: spellCasterId,
        affectedTargetIds: [spellTargetId],
      },
      message: "Fireball object ignition facts are only valid for Fireball.",
    },
    {
      name: "Shatter object facts on a non-Shatter spell",
      spellId: burningHandsUnitId,
      area: {
        kind: "shatterArea",
        originAnchorId: spellCasterId,
        affectedTargetIds: [spellTargetId],
      },
      message: "Shatter object damage facts are only valid for Shatter.",
    },
  ] as const)("public save-gate area validation: $name", (testCase) => {
    const state = spellBattle({
      preparedSpells: [spellRecord(testCase.spellId)],
      spellSlots: [
        { spellLevel: 1, count: 1 },
        { spellLevel: 2, count: 1 },
      ],
    });
    const act = spellAct({ session: state, spellId: testCase.spellId });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");

    expect(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [malformedAreaSavingThrowFill(savingThrow, testCase.area)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: testCase.message,
    });
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
          kind: "saveGatedTargetProjection",
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

  test("a failed Faerie Fire save opens the target's readied-spell Reaction", () => {
    const spell = spellRecord(faerieFireUnitId);
    const session = spellBattleWithTargetReadiedRay({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      casterClassLevels: [{ className: "druid", level: 1 }],
    });
    const act = spellAct({ session, spellId: faerieFireUnitId });
    const savingThrows = requireHole(act.initialHoles, "savingThrowOutcome");
    const awaitingReaction = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(savingThrows, [
          { targetId: spellCasterId, succeeded: true },
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    const declined = declineTargetReadiedSpellAfterFailedSave(awaitingReaction);
    const target = declined.state.combatants.get(spellTargetId);
    if (target === undefined) {
      throw new Error("Expected Faerie Fire target combatant.");
    }
    expect(target.activeEffects).toEqual([
      expect.objectContaining({
        kind: "saveGatedTargetProjection",
        sourceCombatantId: spellCasterId,
      }),
    ]);
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
        kind: "saveGatedTargetProjectionObject",
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
      fill.value.area.kind !== "saveGatedTargetProjectionArea"
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
                kind: "saveGatedTargetProjectionArea",
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
