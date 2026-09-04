import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { PositiveInteger, spellSlotLevel } from "@dnd/shared/types";
import {
  spellDurationEndingPath,
  spellDurationExtensionPath,
  spellDurationValuePath,
  spellMaterialComponentPath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellMechanics, SpellRecord } from "@dnd/surface/surface/types";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV51 thunderwave
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV52 dissonant_whispers
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-forced-reaction-movement
import { describe, expect, test } from "vitest";
import {
  requireCharacterSpellProcedureRefForTest,
  attackExecutionSelectionForSubjectForTest,
  characterAttackSubjectForTest,
} from "./battle-runtime.test-support.ts";
import {
  dissonantWhispersUnitId,
  spellCasterId,
  spellTargetId,
  spikeGrowthUnitId,
  thunderwaveSecondTargetId,
  thunderwaveUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  damageRollFillWithGroups,
  interruptDecisionFill,
  movementFill,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  maybeSpellAct,
  savingThrowOutcomeFill,
  spellAct,
  spellHoleInvocation,
  spellTargetFill,
  selfOriginCubePushArea,
  thunderwaveSavingThrowOutcomeFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
  thunderwaveWithFailedSaveDamage,
  thunderwaveWithFixedSaveDc,
  thunderwaveWithoutDirectPhase,
  thunderwaveWithoutFailedSavePush,
  thunderwaveWithSaveGateCone,
} from "./unit-profile-admission-spell-record.test-support.ts";
import {
  type BattleRuntimeSession,
  difficultyClass,
  movementFeet,
  resolveBattleInterrupt,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission.test-support.ts";
import { areaMovementDistanceDamageProfile } from "./battle-reducer/spell-procedure-profiles/area-movement-distance-damage.ts";
import type { SpellMechanicsAdmissionSource } from "./battle-reducer/spell-procedure-profiles/spell-mechanics-admission.ts";
import type { SpellAdmissionActor } from "./battle-reducer/spell-procedure-profiles/profile.ts";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleCreatureState,
  type BattleSpellAdmissionSource,
} from "./battle-state-execution.ts";

describe("SRDINV51 deterministic Thunderwave Spell Unit admission", () => {
  test("thunderwave is admitted as self-origin Cube save damage with push and boom facts", () => {
    const spell = spellRecord(thunderwaveUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: thunderwaveUnitId,
      slotLevel: 2,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        thunderwaveUnitId,
        2,
        "saveGatedDamage",
      ),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Spell self-origin Cube Saving Throw outcomes",
        ability: "con",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation(state, [savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        resource: { tag: "spellSlot", slotLevel: 2 },
        ability: "con",
        targeting: { kind: "selfOriginCube", sideFeet: 15 },
        damage: {
          expr: { dice: 3, dieSize: 8 },
          damageType: "thunder",
        },
        successDamage: "half",
        rangeFeet: 0,
        failedSavePostDamageRiders: [],
        postSaveAreaEffect: {
          kind: "selfOriginCubePush",
          creaturePush: {
            distanceFeet: 10,
            originDirection: "away_from_caster",
          },
          unsecuredObjectPush: {
            distanceFeet: 10,
            originDirection: "away_from_caster",
            objectLocation: "entirely_within_area",
          },
          audibleBoom: {
            sound: "thunderous boom",
            audibleRadiusFeet: 300,
          },
        },
      }),
    );
  });

  test("thunderwave consumes failed-save push, object push, and audible-boom facts while applying save damage", () => {
    const spell = spellRecord(thunderwaveUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      targetHp: 30,
      targetMaxHp: 30,
      extraTargetIds: [thunderwaveSecondTargetId],
    });
    const act = spellAct({ session: state, spellId: thunderwaveUnitId });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [
          thunderwaveSavingThrowOutcomeFill(savingThrow, [
            { targetId: spellTargetId, succeeded: false },
            { targetId: thunderwaveSecondTargetId, succeeded: true },
          ]),
        ],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        thunderwaveSavingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
          { targetId: thunderwaveSecondTargetId, succeeded: true },
        ]),
        damageRollFillWithGroups(damageRoll, [[4, 4]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Thunderwave to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(22);
    expect(
      Number(requireCombatant(resolved.state, thunderwaveSecondTargetId).hp),
    ).toBe(8);
  });

  test("thunderwave without object-push and audible-boom facts is not admitted", () => {
    const spell = thunderwaveWithoutDirectPhase(
      spellRecord(thunderwaveUnitId),
      "thunderwave_missing_direct_phase",
    );

    expect(
      maybeSpellAct({
        session: spellBattle({ preparedSpells: [spell] }),
        spellId: spell.id,
      }),
    ).toBeUndefined();
  });

  test("thunderwave without failed-save creature push is not admitted", () => {
    const spell = thunderwaveWithoutFailedSavePush(
      spellRecord(thunderwaveUnitId),
      "thunderwave_missing_failed_push",
    );

    expect(
      maybeSpellAct({
        session: spellBattle({ preparedSpells: [spell] }),
        spellId: spell.id,
      }),
    ).toBeUndefined();
  });

  test("thunderwave with a non-Cube save-gate area is not admitted", () => {
    const spell = thunderwaveWithSaveGateCone(
      spellRecord(thunderwaveUnitId),
      "thunderwave_wrong_save_area",
    );

    expect(
      maybeSpellAct({
        session: spellBattle({ preparedSpells: [spell] }),
        spellId: spell.id,
      }),
    ).toBeUndefined();
  });

  test("thunderwave with a non-Thunder failed-save damage type is not admitted", () => {
    const spell = thunderwaveWithFailedSaveDamage(
      spellRecord(thunderwaveUnitId),
      "thunderwave_wrong_damage_type",
      (damage) => ({ ...damage, damageType: "fire" }),
    );

    expect(
      maybeSpellAct({
        session: spellBattle({ preparedSpells: [spell] }),
        spellId: spell.id,
      }),
    ).toBeUndefined();
  });

  test("thunderwave with the wrong failed-save base dice is not admitted", () => {
    const spell = thunderwaveWithFailedSaveDamage(
      spellRecord(thunderwaveUnitId),
      "thunderwave_wrong_base_dice",
      (damage) => {
        if (damage.amount.kind !== "linear_per_level") {
          throw new Error("Expected Thunderwave slot-scaled damage.");
        }
        return {
          ...damage,
          amount: {
            ...damage.amount,
            base: { ...damage.amount.base, dice: 3 },
          },
        };
      },
    );

    expect(
      maybeSpellAct({
        session: spellBattle({ preparedSpells: [spell] }),
        spellId: spell.id,
      }),
    ).toBeUndefined();
  });

  test("thunderwave without slot-scaled failed-save damage is not admitted", () => {
    const spell = thunderwaveWithFailedSaveDamage(
      spellRecord(thunderwaveUnitId),
      "thunderwave_fixed_damage",
      (damage) => ({
        ...damage,
        amount: { kind: "fixed", expr: { dice: 2, dieSize: 8 } },
      }),
    );

    expect(
      maybeSpellAct({
        session: spellBattle({ preparedSpells: [spell] }),
        spellId: spell.id,
      }),
    ).toBeUndefined();
  });

  test("thunderwave with incorrect slot scaling is not admitted", () => {
    const spell = thunderwaveWithFailedSaveDamage(
      spellRecord(thunderwaveUnitId),
      "thunderwave_wrong_slot_scaling",
      (damage) => {
        if (damage.amount.kind !== "linear_per_level") {
          throw new Error("Expected Thunderwave slot-scaled damage.");
        }
        return {
          ...damage,
          amount: {
            ...damage.amount,
            perLevel: { dice: 2 },
          },
        };
      },
    );

    expect(
      maybeSpellAct({
        session: spellBattle({ preparedSpells: [spell] }),
        spellId: spell.id,
      }),
    ).toBeUndefined();
  });

  test("thunderwave with a non-caster spell save DC is not admitted", () => {
    const spell = thunderwaveWithFixedSaveDc(
      spellRecord(thunderwaveUnitId),
      "thunderwave_fixed_save_dc",
    );

    expect(
      maybeSpellAct({
        session: spellBattle({ preparedSpells: [spell] }),
        spellId: spell.id,
      }),
    ).toBeUndefined();
  });

  test("thunderwave rejects missing failed-save creature push facts", () => {
    const spell = spellRecord(thunderwaveUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = spellAct({ session: state, spellId: thunderwaveUnitId });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const invalid = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        {
          ...thunderwaveSavingThrowOutcomeFill(savingThrow, [
            { targetId: spellTargetId, succeeded: false },
          ]),
          value: {
            ...thunderwaveSavingThrowOutcomeFill(savingThrow, [
              { targetId: spellTargetId, succeeded: false },
            ]).value,
            area: {
              ...selfOriginCubePushArea([spellTargetId], [spellTargetId]),
              creaturePushes: [],
            },
          },
        },
      ],
    });

    expect(invalid).toMatchObject({
      tag: "invalid",
      message:
        "forced-movement cube burst creature push facts must cover every failed-save target.",
    });
  });

  test.each(
    (() => {
      const area = selfOriginCubePushArea([spellTargetId], [spellTargetId]);
      return [
        {
          caseName: "a creature push for a target that did not fail",
          area: {
            ...area,
            creaturePushes: area.creaturePushes.map((push) => ({
              ...push,
              targetId: spellCasterId,
            })),
          },
          message:
            "forced-movement cube burst creature push facts must match failed-save targets.",
        },
        {
          caseName: "duplicate creature pushes",
          area: {
            ...area,
            creaturePushes: [...area.creaturePushes, ...area.creaturePushes],
          },
          message:
            "forced-movement cube burst creature push facts must not duplicate targets.",
        },
        {
          caseName: "a creature push with the wrong distance",
          area: {
            ...area,
            creaturePushes: area.creaturePushes.map((push) => ({
              ...push,
              disposition: {
                ...push.disposition,
                distanceFeet: movementFeet(5),
              },
            })),
          },
          message:
            "forced-movement cube burst push disposition must use the spell's 10-foot distance.",
        },
        {
          caseName: "duplicate unsecured-object pushes",
          area: {
            ...area,
            unsecuredObjectPushes: [
              ...area.unsecuredObjectPushes,
              ...area.unsecuredObjectPushes,
            ],
          },
          message:
            "forced-movement cube burst unsecured-object push facts must not duplicate objects.",
        },
        {
          caseName: "an incorrect audible radius",
          area: {
            ...area,
            audibleBoom: {
              ...area.audibleBoom,
              audibleRadiusFeet: movementFeet(5),
            },
          },
          message:
            "forced-movement cube burst audible-boom fact must match the spell's thunderous boom within 300 feet.",
        },
      ] as const;
    })(),
  )("thunderwave rejects $caseName", ({ area, message }) => {
    const spell = spellRecord(thunderwaveUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = spellAct({ session: state, spellId: thunderwaveUnitId });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const fill = thunderwaveSavingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false },
    ]);

    expect(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [{ ...fill, value: { ...fill.value, area } }],
      }),
    ).toMatchObject({ tag: "invalid", message });
  });
});

describe("SRDINV52 deterministic Dissonant Whispers Spell Unit admission", () => {
  test("dissonant whispers is admitted as single-target Wisdom save damage with forced Reaction movement", () => {
    const spell = spellRecord(dissonantWhispersUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: dissonantWhispersUnitId,
      slotLevel: 2,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        spellCasterId,
        spellSlotInvocationRef(dissonantWhispersUnitId, 2, "saveGatedDamage"),
      ),
      mode: { tag: "cast" },
    });
    const target = requireHole(act.initialHoles, "targetChoice");
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            target,
            dissonantWhispersUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "savingThrowOutcome",
    );
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Spell Saving Throw outcome",
        ability: "wis",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation(state, [savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        resource: { tag: "spellSlot", slotLevel: 2 },
        ability: "wis",
        targeting: { kind: "singleCombatant" },
        damage: {
          expr: { dice: 4, dieSize: 6 },
          damageType: "psychic",
        },
        successDamage: "half",
        rangeFeet: 60,
        failedSavePostDamageRiders: [
          {
            kind: "forcedReactionMovement",
            direction: "awayFromCaster",
            route: "safest",
            distance: "asFarAsPossible",
            cost: "targetReactionIfAvailable",
          },
        ],
      }),
    );
  });

  test("dissonant whispers failed save spends the target Reaction and consumes caller movement", () => {
    const spell = spellRecord(dissonantWhispersUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const act = spellAct({ session: state, spellId: dissonantWhispersUnitId });
    const target = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spellTargetFill(
      target,
      dissonantWhispersUnitId,
      spellCasterId,
      spellTargetId,
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [targetFill, saveFill],
      }),
      "rolledDice",
    );
    const movement = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [
          targetFill,
          saveFill,
          damageRollFillWithGroups(damageRoll, [[3, 4, 5]]),
        ],
      }),
      "movement",
    );

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        targetFill,
        saveFill,
        damageRollFillWithGroups(damageRoll, [[3, 4, 5]]),
        movementFill(movement, {
          movementCostFeet: 30,
          provokedOpportunityAttacks: [],
        }),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dissonant Whispers to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(18);
    expect(
      requireCombatant(resolved.state, spellTargetId).reactionAvailable,
    ).toBe(false);
  });

  test("dissonant whispers successful save deals half damage only", () => {
    const spell = spellRecord(dissonantWhispersUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = spellAct({ session: state, spellId: dissonantWhispersUnitId });
    const target = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spellTargetFill(
      target,
      dissonantWhispersUnitId,
      spellCasterId,
      spellTargetId,
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: true },
    ]);
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [targetFill, saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        targetFill,
        saveFill,
        damageRollFillWithGroups(damageRoll, [[3, 4, 5]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dissonant Whispers to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(6);
    expect(
      requireCombatant(resolved.state, spellTargetId).reactionAvailable,
    ).toBe(true);
  });

  test("dissonant whispers rejects stale movement after the save or Reaction changes", () => {
    const spell = spellRecord(dissonantWhispersUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const act = spellAct({ session, spellId: dissonantWhispersUnitId });
    const target = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spellTargetFill(
      target,
      dissonantWhispersUnitId,
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
    const failedSave = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [targetFill, failedSave],
      }),
      "rolledDice",
    );
    const damageFill = damageRollFillWithGroups(damageRoll, [[3, 4, 5]]);
    const movement = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [targetFill, failedSave, damageFill],
      }),
      "movement",
    );
    const staleMovement = movementFill(movement, {
      movementCostFeet: 30,
      provokedOpportunityAttacks: [],
    });

    const successfulSave = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: true },
    ]);
    expect(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [targetFill, successfulSave, damageFill, staleMovement],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Failed-save forced reaction movement is only valid after a failed save.",
    });

    const targetWithoutReaction = {
      ...requireCombatant(session.state, spellTargetId),
      reactionAvailable: false,
    };
    expect(
      resolveBattleSubject({
        state: {
          ...session.state,
          combatants: new Map(session.state.combatants).set(
            spellTargetId,
            targetWithoutReaction,
          ),
        },
        subject: act.subject,
        fills: [targetFill, failedSave, damageFill, staleMovement],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Failed-save forced reaction movement is unavailable when the failed target has no Reaction.",
    });
  });

  test("dissonant whispers failed save does not request movement when the target has no Reaction", () => {
    const spell = spellRecord(dissonantWhispersUnitId);
    const battle = spellBattle({ preparedSpells: [spell] });
    const target = requireCombatant(battle.state, spellTargetId);
    const session = battleRuntimeSessionForTest({
      state: {
        ...battle.state,
        combatants: new Map(battle.state.combatants).set(spellTargetId, {
          ...target,
          reactionAvailable: false,
        }),
      },
      context: battle.context,
    });
    const act = spellAct({ session, spellId: dissonantWhispersUnitId });
    const targetChoice = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spellTargetFill(
      targetChoice,
      dissonantWhispersUnitId,
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
    const damageRoll = requireResultHole(
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
        damageRollFillWithGroups(damageRoll, [[3, 4, 5]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dissonant Whispers to resolve.");
    }
    expect(
      requireCombatant(resolved.state, spellTargetId).reactionAvailable,
    ).toBe(false);
  });

  test("dissonant whispers failed save spends Reaction without movement when the target cannot move", () => {
    const spell = spellRecord(dissonantWhispersUnitId);
    const battle = spellBattle({
      preparedSpells: [spell],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const session: BattleRuntimeSession = battleRuntimeSessionForTest({
      state: {
        ...battle.state,
        grapples: [
          {
            grapplerId: spellCasterId,
            targetId: spellTargetId,
            escapeDc: difficultyClass(12),
            reachFeet: movementFeet(5),
            hand: "left",
          },
        ],
      },
      context: battle.context,
    });
    const act = spellAct({ session, spellId: dissonantWhispersUnitId });
    const targetChoice = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spellTargetFill(
      targetChoice,
      dissonantWhispersUnitId,
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
    const damageRoll = requireResultHole(
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
        damageRollFillWithGroups(damageRoll, [[3, 4, 5]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dissonant Whispers to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(18);
    expect(
      requireCombatant(resolved.state, spellTargetId).reactionAvailable,
    ).toBe(false);
  });

  test("dissonant whispers movement opens Opportunity Attack eligibility from Reaction movement", () => {
    const spell = spellRecord(dissonantWhispersUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const act = spellAct({ session: state, spellId: dissonantWhispersUnitId });
    const target = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spellTargetFill(
      target,
      dissonantWhispersUnitId,
      spellCasterId,
      spellTargetId,
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [targetFill, saveFill],
      }),
      "rolledDice",
    );
    const movement = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [
          targetFill,
          saveFill,
          damageRollFillWithGroups(damageRoll, [[3, 4, 5]]),
        ],
      }),
      "movement",
    );

    const result = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        targetFill,
        saveFill,
        damageRollFillWithGroups(damageRoll, [[3, 4, 5]]),
        movementFill(movement, {
          movementCostFeet: 30,
          provokedOpportunityAttacks: [
            {
              reactorId: spellCasterId,
              distanceFeet: movementFeet(5),
              ...attackExecutionSelectionForSubjectForTest(
                characterAttackSubjectForTest(
                  state.state,
                  spellCasterId,
                  "Unarmed Strike",
                ),
              ),
            },
          ],
        }),
      ],
    });

    const reaction = requireResultHole(result, "interruptDecision");
    expect(reaction.trigger).toBe("opportunityAttack");
    if (result.tag !== "needsHoles") {
      throw new Error("Expected Dissonant Whispers opportunity interrupt.");
    }
    const afterDecline = resolveBattleInterrupt({
      state: result.state,
      fill: interruptDecisionFill(reaction, {
        kind: "decline",
        responderId: spellCasterId,
      }),
    });
    expect(afterDecline).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            hp: 18,
            reactionAvailable: false,
          }),
        ]),
      },
    });
  });
});

type OngoingSpellMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;

function spikeGrowthMechanics(): OngoingSpellMechanics {
  const mechanics = spellRecord(spikeGrowthUnitId).mechanics;
  if (mechanics.family !== "ongoing_effect")
    throw new Error("Expected Spike Growth ongoing-effect mechanics.");
  return mechanics;
}

function syntheticSpikeGrowthRecord(
  mutate: (mechanics: OngoingSpellMechanics) => unknown,
  suffix: string,
): SpellRecord {
  return decodeSpellRecordForTest({
    id: `synthetic_movement_hazard_${suffix}`,
    kind: "spell",
    name: `Synthetic Movement Hazard ${suffix}`,
    provenance: {
      kind: "synthetic-test",
      section: `synthetic_movement_hazard_${suffix}`,
    },
    mechanics: mutate(spikeGrowthMechanics()),
  });
}

function mechanicsSource(
  source: BattleSpellAdmissionSource,
): SpellMechanicsAdmissionSource {
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

function staticSpellAdmissionActor(): SpellAdmissionActor {
  const actor = spellBattle({ preparedSpells: [] }).state.combatants.get(
    spellCasterId,
  );
  if (!isSpellAdmissionActor(actor))
    throw new Error("Expected a spellcasting character fixture.");
  return actor;
}

function isSpellAdmissionActor(
  actor: BattleCreatureState | undefined,
): actor is SpellAdmissionActor {
  return (
    actor?.origin.kind === "character" &&
    actor.origin.spellcasting?.canCastSpells === true
  );
}

function issueShape(result: {
  readonly tag: string;
  readonly issues?: readonly {
    readonly failedFact: string;
    readonly mechanicsPath: unknown;
  }[];
}): readonly {
  readonly failedFact: string;
  readonly mechanicsPath: unknown;
}[] {
  return result.tag === "unsupported"
    ? (result.issues ?? []).map(({ failedFact, mechanicsPath }) => ({
        failedFact,
        mechanicsPath,
      }))
    : [];
}

describe("areaMovementDistanceDamage static admission", () => {
  test("projects Spike Growth mechanics once and binds mechanics-free execution", () => {
    const source = spellAdmissionSource(spellRecord(spikeGrowthUnitId));
    const result = areaMovementDistanceDamageProfile.admitMechanics(
      mechanicsSource(source),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.facts).toMatchObject({
      level: 2,
      rangeFeet: 150,
      radiusFeet: 20,
      durationTicks: 100,
      damage: {
        expr: { dice: 2, dieSize: 4 },
        damageType: "piercing",
      },
      damagePerFeet: 5,
    });
    expect(result.admitted.evidence).toEqual({
      consumed: [
        spellMechanicsHeaderPath("level"),
        spellMechanicsHeaderPath("school"),
        spellMechanicsHeaderPath("range"),
        spellMechanicsHeaderPath("components"),
        spellMechanicsHeaderPath("duration"),
        spellMechanicsHeaderPath("castingTime"),
        spellMechanicsHeaderPath("family"),
        spellDurationValuePath(),
        spellOngoingAttachmentPath(),
        spellOngoingOperationPath(PositiveInteger(1)),
        spellOngoingOperationEffectPath(PositiveInteger(1)),
        spellOngoingOperationPath(PositiveInteger(2)),
        spellOngoingOperationEffectPath(PositiveInteger(2)),
      ],
      unowned: [],
    });

    const invocations = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      {
        actor: staticSpellAdmissionActor(),
        castingSource: source.castingSource,
        battle: undefined,
        spellCastOptions: [
          { spellLevel: spellSlotLevel(1), payment: { tag: "slot" } },
          { spellLevel: spellSlotLevel(2), payment: { tag: "slot" } },
        ],
      },
    );

    expect(invocations).toHaveLength(1);
    expect(invocations[0]).toMatchObject({
      resource: { tag: "spellSlot", slotLevel: 2 },
      targeting: { kind: "pointOriginSphere", radiusFeet: 20 },
      durationTicks: 100,
      rangeFeet: 150,
      damage: {
        expr: { dice: 2, dieSize: 4 },
        damageType: "piercing",
      },
      damagePerFeet: 5,
    });
    expect(invocations[0]?.spell).not.toHaveProperty("mechanics");
  });

  test("recognizes identical mechanics independently of authored identity", () => {
    const original = spellAdmissionSource(spellRecord(spikeGrowthUnitId));
    const renamed = spellAdmissionSource(
      syntheticSpikeGrowthRecord((mechanics) => mechanics, "renamed"),
    );
    const originalResult = areaMovementDistanceDamageProfile.admitMechanics(
      mechanicsSource(original),
    );
    const renamedResult = areaMovementDistanceDamageProfile.admitMechanics(
      mechanicsSource(renamed),
    );

    expect(originalResult.tag).toBe("supported");
    expect(renamedResult.tag).toBe("supported");
    if (originalResult.tag !== "supported" || renamedResult.tag !== "supported")
      return;
    expect(renamedResult.admitted.facts).toEqual(originalResult.admitted.facts);
    expect(renamedResult.admitted.evidence).toEqual(
      originalResult.admitted.evidence,
    );
  });

  test.each([
    [
      "level",
      (mechanics: OngoingSpellMechanics) => ({ ...mechanics, level: 3 }),
      "level",
      spellMechanicsHeaderPath("level"),
    ],
    [
      "radius",
      (mechanics: OngoingSpellMechanics) => {
        if (
          mechanics.attachment.kind !== "hole" ||
          mechanics.attachment.value.kind !== "area" ||
          mechanics.attachment.value.shape.kind !== "sphere"
        )
          throw new Error("Expected Spike Growth Sphere mechanics.");
        return {
          ...mechanics,
          attachment: {
            ...mechanics.attachment,
            value: {
              ...mechanics.attachment.value,
              shape: { ...mechanics.attachment.value.shape, radiusFeet: 25 },
            },
          },
        };
      },
      "attachment",
      spellOngoingAttachmentPath(),
    ],
    [
      "movement interval",
      (mechanics: OngoingSpellMechanics) => ({
        ...mechanics,
        operations: mechanics.operations.map((operation) =>
          operation.trigger.kind === "on_creature_moves"
            ? {
                ...operation,
                trigger: { ...operation.trigger, perFeet: 10 },
              }
            : operation,
        ),
      }),
      "movementDamageOperation",
      spellOngoingOperationPath(PositiveInteger(2)),
    ],
  ] as const)(
    "keeps a one-field %s mutation represented with one exact issue",
    (_label, mutate, failedFact, mechanicsPath) => {
      const result = areaMovementDistanceDamageProfile.admitMechanics(
        mechanicsSource(
          spellAdmissionSource(
            syntheticSpikeGrowthRecord(mutate, `mutation_${failedFact}`),
          ),
        ),
      );

      expect(result.tag).toBe("unsupported");
      expect(issueShape(result)).toEqual([{ failedFact, mechanicsPath }]);
    },
  );

  test("accumulates exact material and duration child coordinates without parent issues", () => {
    const record = syntheticSpikeGrowthRecord((mechanics) => {
      if (mechanics.duration.kind !== "concentration")
        throw new Error("Expected Spike Growth Concentration mechanics.");
      return {
        ...mechanics,
        components: {
          ...mechanics.components,
          materialCostGp: 5,
          materialConsumed: true,
        },
        duration: {
          ...mechanics.duration,
          upTo: {
            ...mechanics.duration.upTo,
            upcastTiers: [{ atSlot: 3, amount: 20 }],
          },
          earlyEnd: [{ kind: "caster_recasts_spell" as const }],
        },
      };
    }, "nested_children");
    const result = areaMovementDistanceDamageProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(record)),
    );

    expect(issueShape(result)).toEqual([
      {
        failedFact: "components",
        mechanicsPath: spellMaterialComponentPath("cost"),
      },
      {
        failedFact: "components",
        mechanicsPath: spellMaterialComponentPath("consumption"),
      },
      {
        failedFact: "durationExtension",
        mechanicsPath: spellDurationExtensionPath(PositiveInteger(1)),
      },
      {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(1)),
      },
    ]);
  });

  test("preserves operation ordinals when the authored operation order changes", () => {
    const record = syntheticSpikeGrowthRecord(
      (mechanics) => ({
        ...mechanics,
        operations: [mechanics.operations[1], mechanics.operations[0]],
      }),
      "reordered_operations",
    );
    const result = areaMovementDistanceDamageProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(record)),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.evidence.consumed.slice(-4)).toEqual([
      spellOngoingOperationPath(PositiveInteger(2)),
      spellOngoingOperationEffectPath(PositiveInteger(2)),
      spellOngoingOperationPath(PositiveInteger(1)),
      spellOngoingOperationEffectPath(PositiveInteger(1)),
    ]);
  });

  test("does not claim a different point-origin difficult-terrain spell", () => {
    const source = spellAdmissionSource(spellRecord("fog_cloud"));

    expect(
      areaMovementDistanceDamageProfile.admitMechanics(mechanicsSource(source)),
    ).toEqual({ tag: "notRepresented" });
  });
});
