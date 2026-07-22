import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-MISSING-CALM-EMOTIONS calm_emotions
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-save-gated-condition-immunity
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { requireCharacterSpellProcedureRefForTest } from "./battle-runtime-test-support.ts";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import {
  calmEmotionsUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  requireCombatant,
  requireHole,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  maybeSpellAct,
  savingThrowOutcomeFill,
  spellAct,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  applyCondition,
  breakBattleConcentration,
  combatantId,
  hasCondition,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";

describe("L12G deterministic Calm Emotions Spell Unit admission", () => {
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
        spellRuleFacts: expect.objectContaining({ spellId: spell.id }),
        resource: { tag: "spellSlot", slotLevel: 2 },
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
