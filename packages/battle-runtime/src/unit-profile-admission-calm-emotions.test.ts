import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-MISSING-CALM-EMOTIONS calm_emotions
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-save-gated-condition-immunity
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { requireCharacterSpellProcedureRefForTest } from "./battle-runtime.test-support.ts";
import type { SpellRecord, UnitRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import {
  calmEmotionsUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  requireCombatant,
  requireHole,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  declineTargetReadiedSpellAfterFailedSave,
  spellBattle,
  spellBattleWithTargetReadiedRay,
} from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  maybeSpellAct,
  savingThrowOutcomeFill,
  spellAct,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  spellAdmissionSource,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import { supportedPreparedSaveGateConditionImmunityProfile } from "./battle-reducer/spell-procedure-profiles/_save-gate-helpers.ts";
import {
  abilityModifier,
  applyCondition,
  breakBattleConcentration,
  combatantId,
  endTurn,
  hasCondition,
  proficiencyBonus,
  resolveBattleSubject,
  spellSlotInvocationRef,
  spellSlotLevel,
} from "./unit-profile-admission.test-support.ts";

describe("L12G deterministic Calm Emotions Spell Unit admission", () => {
  test("calm_emotions rejects a slot below its spell level", () => {
    expect(
      supportedPreparedSaveGateConditionImmunityProfile(
        spellCasterId,
        spellAdmissionSource(spellRecord(calmEmotionsUnitId)),
        [
          {
            spellLevel: spellSlotLevel(1),
            payment: { tag: "slot" as const },
          },
        ],
      ),
    ).toEqual([]);
  });

  test("calm_emotions is admitted as Humanoid Sphere save-gated condition immunity", () => {
    const spell = spellRecord(calmEmotionsUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: calmEmotionsUnitId,
      slotLevel: 2,
    });
    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        spellCasterId,
        spellSlotInvocationRef(
          calmEmotionsUnitId,
          2,
          "saveGatedConditionImmunity",
        ),
      ),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Spell point-origin Sphere Saving Throw outcomes",
        ability: "cha",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation(session, [savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedConditionImmunity",
        resource: {
          tag: "spellSlot",
          slotLevel: 2,
        },
        ability: "cha",
        targeting: { kind: "pointOriginSphere", radiusFeet: 20 },
        targetCreatureTypes: ["humanoid"],
        activeEffects: [
          expect.objectContaining({
            kind: "conditionImmunity",
            sourceCombatantId: spellCasterId,
            condition: "charmed",
            expiresAt: { kind: "concentration", combatantId: spellCasterId },
          }),
          expect.objectContaining({
            kind: "conditionImmunity",
            sourceCombatantId: spellCasterId,
            condition: "frightened",
            expiresAt: { kind: "concentration", combatantId: spellCasterId },
          }),
        ],
        rangeFeet: 60,
      }),
    );
  });

  test("condition-immunity admission rejects extra failed-save effects", () => {
    const spell = calmEmotionsWithExtraFailedSaveEffect(
      spellRecord(calmEmotionsUnitId),
    );
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });

    expect(maybeSpellAct({ session, spellId: spell.id })).toBeUndefined();
  });

  test("failed Humanoid saves gain Charmed and Frightened immunity until Concentration ends", () => {
    const spell = spellRecord(calmEmotionsUnitId);
    const baseSession = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const target = requireCombatant(baseSession.state, spellTargetId);
    if (target.positiveHpUnconscious !== null) {
      throw new Error("Expected Calm Emotions target to be conscious.");
    }
    const state = {
      ...baseSession.state,
      combatants: new Map(baseSession.state.combatants).set(spellTargetId, {
        ...target,
        conditions: applyCondition(
          applyCondition(target.conditions, "charmed"),
          "frightened",
        ),
      }),
    };
    const act = spellAct({
      session: battleRuntimeSessionForTest({ ...baseSession, state }),
      spellId: calmEmotionsUnitId,
    });
    const procedureRef = act.subject.procedureRef;
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(savingThrow, [
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
          expect.objectContaining({
            combatantId: spellTargetId,
            conditions: expect.not.arrayContaining(["charmed", "frightened"]),
          }),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Calm Emotions to resolve.");
    }
    expect(resolved.state.combatants.get(spellTargetId)?.activeEffects).toEqual(
      [
        expect.objectContaining({
          kind: "conditionImmunity",
          sourceProcedureRef: procedureRef,
          sourceCombatantId: spellCasterId,
          condition: "charmed",
          conditionHadNonSpellSource: true,
          expiresAt: { kind: "concentration", combatantId: spellCasterId },
        }),
        expect.objectContaining({
          kind: "conditionImmunity",
          sourceProcedureRef: procedureRef,
          sourceCombatantId: spellCasterId,
          condition: "frightened",
          conditionHadNonSpellSource: true,
          expiresAt: { kind: "concentration", combatantId: spellCasterId },
        }),
      ],
    );

    const concentrationBroken = breakBattleConcentration(
      resolved.state,
      spellCasterId,
    );
    expect(
      concentrationBroken.combatants.get(spellTargetId)?.activeEffects,
    ).toEqual([]);
    const restoredTarget = concentrationBroken.combatants.get(spellTargetId);
    expect(
      restoredTarget === undefined
        ? false
        : hasCondition(restoredTarget.conditions, "charmed"),
    ).toBe(true);
    expect(
      restoredTarget === undefined
        ? false
        : hasCondition(restoredTarget.conditions, "frightened"),
    ).toBe(true);
  });

  test("a repeated synthetic-feature free cast ends its prior effects and preserves another caster's immunities", () => {
    const spell = spellRecord(calmEmotionsUnitId);
    const source = {
      acquiredAtLevel: 3,
      className: "wizard",
      id: parseSharedUnitId("wizard_synthetic_calming_reserve"),
      kind: "class_feature",
      name: "Synthetic Calming Reserve",
      provenance: { kind: "synthetic-test", section: "casting boundary" },
      mechanics: {
        family: "passive",
        grants: [
          {
            kind: "grant_spell_access",
            mode: "prepared",
            spellId: spell.id,
          },
          {
            kind: "grant_spell_free_casts",
            spellId: spell.id,
            count: 2,
            resetCadence: "long_rest",
          },
        ],
      },
    } as const satisfies UnitRecord;
    const session = spellBattle({
      casterClassLevels: [{ className: "wizard", level: 3 }],
      spellSlots: [],
      casterResources: [
        {
          unit: source,
          spellAccessFreeCast: { spellId: spell.id, count: 2 },
          usesRemaining: 2,
        },
      ],
      casterUnitRefs: [{ unit: source, supportProfiles: [] }],
      casterFeaturePreparedSpells: [{ sourceUnitId: source.id, spell }],
      targetClassLevels: [{ className: "bard", level: 3 }],
      targetSpellcasting: {
        spellcastingSource: {
          tag: "classSpellcasting",
          className: "bard",
          abilityModifier: abilityModifier(3),
        },
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [spell],
        featurePreparedSpells: [],
        spellAccesses: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      },
    });

    const cast = (castSession: typeof session) => {
      const act = spellAct({
        session: castSession,
        spellId: calmEmotionsUnitId,
      });
      expect(battleActSpellPresentation(act)?.invocation.tag).toBe(
        "spellAccessFreeCast",
      );
      const resolved = resolveBattleSubject({
        state: castSession.state,
        subject: act.subject,
        fills: [
          savingThrowOutcomeFill(
            requireHole(act.initialHoles, "savingThrowOutcome"),
            [{ targetId: spellTargetId, succeeded: false }],
          ),
        ],
      });
      if (resolved.tag !== "resolved") {
        throw new Error("Expected source-scoped Calm Emotions to resolve.");
      }
      return resolved.state;
    };

    const conditionImmunities = (state: typeof session.state) =>
      requireCombatant(state, spellTargetId).activeEffects.filter(
        (effect) => effect.kind === "conditionImmunity",
      );
    const firstCast = cast(session);
    const firstEffects = conditionImmunities(firstCast);
    expect(firstEffects).toHaveLength(2);
    expect(
      requireCombatant(firstCast, spellCasterId).concentration,
    ).not.toBeNull();
    const targetTurn = endTurn({ state: firstCast, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected target turn to begin.");
    }
    const targetSession = battleRuntimeSessionForTest({
      state: targetTurn.state,
      context: session.context,
    });
    const targetAct = spellAct({
      session: targetSession,
      spellId: calmEmotionsUnitId,
      slotLevel: 2,
    });
    const targetCast = resolveBattleSubject({
      state: targetTurn.state,
      subject: targetAct.subject,
      fills: [
        savingThrowOutcomeFill(
          requireHole(targetAct.initialHoles, "savingThrowOutcome"),
          [{ targetId: spellTargetId, succeeded: false }],
        ),
      ],
    });
    if (targetCast.tag !== "resolved") {
      throw new Error("Expected the target's Calm Emotions to resolve.");
    }
    const overlappingEffects = conditionImmunities(targetCast.state);
    expect(overlappingEffects).toHaveLength(4);
    const bardEffects = overlappingEffects.filter(
      (effect) => !firstEffects.includes(effect),
    );
    expect(bardEffects).toHaveLength(2);
    const nextCasterTurn = endTurn({
      state: targetCast.state,
      actorId: spellTargetId,
    });
    if (nextCasterTurn.tag !== "resolved") {
      throw new Error("Expected the next caster turn to begin.");
    }
    expect(
      conditionImmunities(nextCasterTurn.state).filter((effect) =>
        firstEffects.some(
          (firstEffect) =>
            firstEffect.sourceProcedureRef === effect.sourceProcedureRef,
        ),
      ),
    ).toEqual(firstEffects);
    expect(
      requireCombatant(nextCasterTurn.state, spellCasterId).concentration,
    ).not.toBeNull();
    const secondCast = cast(
      battleRuntimeSessionForTest({
        state: nextCasterTurn.state,
        context: session.context,
      }),
    );
    const targetEffects = conditionImmunities(secondCast);

    expect(targetEffects).toHaveLength(4);
    for (const firstEffect of firstEffects) {
      expect(targetEffects).not.toContain(firstEffect);
    }
    expect(
      targetEffects.filter((effect) => bardEffects.includes(effect)),
    ).toEqual(bardEffects);
    const firstSourceEffects = targetEffects.filter((effect) =>
      firstEffects.some(
        (firstEffect) =>
          firstEffect.sourceProcedureRef === effect.sourceProcedureRef,
      ),
    );
    expect(firstSourceEffects.map((effect) => effect.condition).sort()).toEqual(
      ["charmed", "frightened"],
    );
    expect(
      firstSourceEffects.map((effect) => effect.sourceProcedureRef),
    ).toEqual(firstEffects.map((effect) => effect.sourceProcedureRef));
    const freeCastResourcePoolRef = session.context.characters
      .get(spellCasterId)
      ?.resourceOwnership.find(
        (owner) => owner.unit.id === source.id,
      )?.resourcePoolRef;
    const caster = requireCombatant(secondCast, spellCasterId);
    expect(
      caster.origin.kind === "character"
        ? caster.origin.resources.find(
            (resource) => resource.resourcePoolRef === freeCastResourcePoolRef,
          )
        : undefined,
    ).toMatchObject({ usesRemaining: 0 });
  });

  test("a failed Calm Emotions save opens the target's readied-spell Reaction", () => {
    const spell = spellRecord(calmEmotionsUnitId);
    const session = spellBattleWithTargetReadiedRay({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "bard", level: 3 }],
    });
    const act = spellAct({
      session,
      spellId: calmEmotionsUnitId,
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const awaitingReaction = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });

    const declined = declineTargetReadiedSpellAfterFailedSave(awaitingReaction);
    const target = requireCombatant(declined.state, spellTargetId);
    expect(target.conditions).toEqual(
      expect.not.objectContaining({ charmed: true, frightened: true }),
    );
    expect(target.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "conditionImmunity",
          condition: "charmed",
        }),
        expect.objectContaining({
          kind: "conditionImmunity",
          condition: "frightened",
        }),
      ]),
    );
  });

  test("non-Humanoids are rejected by the condition-immunity branch", () => {
    const spell = spellRecord(calmEmotionsUnitId);
    const beastId = combatantId("unit-profile-calm-emotions-beast");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      statBlockTargets: [
        {
          combatantId: beastId,
          statBlock: statBlockWithCreatureType("beast"),
          initiative: 8,
        },
      ],
    });
    const act = spellAct({ session, spellId: calmEmotionsUnitId });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");

    const rejected = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(savingThrow, [
          { targetId: beastId, succeeded: false },
        ]),
      ],
    });

    expect(rejected).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });
});

function calmEmotionsWithExtraFailedSaveEffect(base: SpellRecord): SpellRecord {
  if (base.mechanics.family !== "activation") {
    throw new Error("Expected Calm Emotions activation mechanics.");
  }
  const phase = base.mechanics.phases[0];
  if (phase?.kind !== "save_gate" || phase.onFail.kind !== "composite") {
    throw new Error("Expected Calm Emotions composite failed-save effect.");
  }
  const phaseWithExtraFailedSaveEffect = {
    ...phase,
    onFail: {
      kind: "composite",
      effects: [...phase.onFail.effects, { kind: "make_stable" }],
    },
  } satisfies typeof phase;
  const spellWithExtraFailedSaveEffect: SpellRecord = {
    ...base,
    id: parseSharedUnitId("synthetic_calm_emotions_extra_failed_save_effect"),
    mechanics: {
      ...base.mechanics,
      phases: [phaseWithExtraFailedSaveEffect],
    },
  };
  return spellWithExtraFailedSaveEffect;
}
