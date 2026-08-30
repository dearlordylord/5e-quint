// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-save-gated-condition-immunity spell.invocation-web-restraint-hazard spell.readied-action-time-spell
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SAVE_GATED_CONDITION_LIFECYCLE BATTLE.SPELL.WEB_RESTRAINT_HAZARD_LIFECYCLE BATTLE.SPELL.READIED_RESPONSE_PROCEDURE
// RAW: .references/srd-5.2.1/Spells/Descriptions-A-D.md#Calm-Emotions
// RAW: .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Web
// RAW: .references/srd-5.2.1/Spells/Descriptions-Q-R.md#Ray-of-Frost
// RAW: .references/srd-5.2.1/Rules-Glossary.md#Ready-Action
// RAW: .references/srd-5.2.1/Rules-Glossary.md#Concentration
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleFrontierInterruptDecisionForState,
  cantripSpellInvocationRef,
  concentrationSavingThrowFill,
  damageRollFill,
  interruptDecisionFill,
  requireCharacterSpellProcedureRefForTest,
  resolveBattleInterrupt,
} from "./battle-runtime.test-support.ts";
import { describe, expect, test } from "vitest";
import {
  attackRollFill,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  calmEmotionsUnitId,
  rayOfFrostUnitId,
  spellCasterId,
  spellTargetId,
  webAreaId,
  webUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  spellBattle,
  spellBattleWithTargetRayOfFrost,
} from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  savingThrowOutcomeFill,
  singleTargetSavingThrowOutcomeFill,
  spellAct,
  spellTargetFill,
  webAreaFill,
  persistentAreaSaveConditionEscapeSaveAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  breakBattleConcentration,
  classLevel,
  endTurn,
  resolveBattleSubject,
} from "./unit-profile-admission.test-support.ts";

describe("GH-227 active spell lifecycle coverage", () => {
  test("Calm Emotions records immunity for an unconditioned failed-save target and restores the state when Concentration ends", () => {
    const session = spellBattle({
      preparedSpells: [spellRecord(calmEmotionsUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "bard", level: classLevel(3) }],
    });
    const act = spellAct({
      session,
      spellId: calmEmotionsUnitId,
      slotLevel: 2,
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Calm Emotions to resolve.");
    }

    const target = requireCombatant(resolved.state, spellTargetId);
    expect(target.conditions).toMatchObject({
      charmed: false,
      frightened: false,
    });
    expect(target.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "conditionImmunity",
          condition: "charmed",
          conditionHadNonSpellSource: false,
          sourceCombatantId: spellCasterId,
        }),
        expect.objectContaining({
          kind: "conditionImmunity",
          condition: "frightened",
          conditionHadNonSpellSource: false,
          sourceCombatantId: spellCasterId,
        }),
      ]),
    );

    const concentrationBroken = breakBattleConcentration(
      resolved.state,
      spellCasterId,
    );
    expect(requireCombatant(concentrationBroken, spellCasterId)).toMatchObject({
      concentration: null,
    });
    expect(requireCombatant(concentrationBroken, spellTargetId)).toMatchObject({
      conditions: { charmed: false, frightened: false },
      activeEffects: [],
    });
  });

  test("a failed Web save can resolve a public readied Ray of Frost release before resuming the spell", () => {
    const { targetTurn } = castWebWithReadiedRay();
    const entryAct = persistentAreaSaveConditionEscapeSaveAct(
      targetTurn,
      spellTargetId,
      "entersArea",
    );
    const entrySave = requireHole(entryAct.initialHoles, "savingThrowOutcome");
    const awaitingReaction = resolveBattleSubject({
      state: targetTurn.state,
      subject: entryAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(entrySave, spellTargetId, false),
      ],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected the failed Web save Reaction window.");
    }
    const pending = battleFrontierInterruptDecisionForState(
      awaitingReaction.state,
    );
    if (pending === null) {
      throw new Error("Expected the failed Web save Reaction window.");
    }
    const releaseChoice = pending.choices.find(
      (choice) =>
        choice.kind === "nestedProcedure" &&
        choice.subject.command === "releaseReadiedSpell" &&
        choice.subject.readiedSpellCasterId === spellTargetId,
    );
    if (
      releaseChoice?.kind !== "nestedProcedure" ||
      releaseChoice.subject.tag !== "runtimeCommand" ||
      releaseChoice.subject.command !== "releaseReadiedSpell"
    ) {
      throw new Error("Expected the target's readied Ray of Frost release.");
    }

    const released = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(pending.decisionHole, {
        kind: "resolve",
        responderId: spellTargetId,
        choice: {
          kind: "releaseReadiedSpell",
          procedureRef: releaseChoice.subject.procedureRef,
          fills: [],
        },
      }),
    });
    if (released.tag !== "needsHoles") {
      throw new Error("Expected released Ray of Frost target holes.");
    }
    const rayTargetHole = requireHole(released.holes, "targetChoice");
    const rayTargetFill = spellTargetFill(
      rayTargetHole,
      rayOfFrostUnitId,
      spellTargetId,
      spellCasterId,
    );
    const rayAttackHole = requireResultHole(
      resolveBattleSubject({
        state: released.state,
        subject: releaseChoice.subject,
        fills: [rayTargetFill],
      }),
      "attackRoll",
    );
    const rayDamageHole = requireResultHole(
      resolveBattleSubject({
        state: released.state,
        subject: releaseChoice.subject,
        fills: [
          rayTargetFill,
          attackRollFill(rayAttackHole, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const releasedRayFills = [
      rayTargetFill,
      attackRollFill(rayAttackHole, { total: 15, naturalD20: 10 }),
      damageRollFill(rayDamageHole, 4),
    ];
    const resumed = resolveBattleSubject({
      state: released.state,
      subject: releaseChoice.subject,
      fills: releasedRayFills,
    });
    if (resumed.tag !== "needsHoles") {
      throw new Error("Expected the released Ray to request Concentration.");
    }
    const concentrationSave = requireHole(
      resumed.holes,
      "concentrationSavingThrow",
    );
    const completed = resolveBattleSubject({
      state: resumed.state,
      subject: releaseChoice.subject,
      fills: [
        ...releasedRayFills,
        concentrationSavingThrowFill(concentrationSave, true),
      ],
    });
    expect(completed.tag).toBe("resolved");
    if (completed.tag !== "resolved") {
      throw new Error("Expected the resumed Web spell to resolve.");
    }
    expect(battleFrontierInterruptDecisionForState(completed.state)).toBeNull();

    const caster = requireCombatant(completed.state, spellCasterId);
    expect(caster.hp).toBeLessThan(caster.maxHp);
    expect(caster.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "persistentAreaSaveConditionEscape",
          areaId: webAreaId,
          entrySavedThisTurn: [spellTargetId],
        }),
      ]),
    );
    expect(requireCombatant(completed.state, spellTargetId)).toMatchObject({
      conditions: { restrained: true },
      activeEffects: expect.arrayContaining([
        expect.objectContaining({
          kind: "spellCondition",
          condition: "restrained",
          sourceCombatantId: spellCasterId,
        }),
      ]),
      reactionAvailable: false,
    });
  });
});

function castWebWithReadiedRay() {
  const session = spellBattleWithTargetRayOfFrost({
    preparedSpells: [spellRecord(webUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    casterClassLevels: [{ className: "wizard", level: classLevel(3) }],
    targetClassLevels: [{ className: "wizard", level: classLevel(1) }],
  });
  const castAct = spellAct({ session, spellId: webUnitId, slotLevel: 2 });
  const area = requireHole(castAct.initialHoles, "spellAreaChoice");
  const cast = resolveBattleSubject({
    state: session.state,
    subject: castAct.subject,
    fills: [webAreaFill(area)],
  });
  if (cast.tag !== "resolved") {
    throw new Error("Expected Web cast with a readied target to resolve.");
  }
  const targetTurn = endTurn({
    state: cast.state,
    actorId: spellCasterId,
  });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected Web caster End Turn before the save.");
  }
  const targetSession = battleRuntimeSessionForTest({
    ...session,
    state: targetTurn.state,
  });
  const readySubject = {
    tag: "actionSpell" as const,
    actorId: spellTargetId,
    procedureRef: requireCharacterSpellProcedureRefForTest(
      targetSession,
      spellTargetId,
      cantripSpellInvocationRef(rayOfFrostUnitId, "spellAttackDamage"),
    ),
    mode: { tag: "ready" as const, trigger: "saveFailed" as const },
  };
  const readied = resolveBattleSubject({
    state: targetTurn.state,
    subject: readySubject,
    fills: [],
  });
  if (readied.tag !== "resolved") {
    throw new Error("Expected the target Ready action to resolve.");
  }
  return {
    targetTurn: battleRuntimeSessionForTest({
      ...targetSession,
      state: readied.state,
    }),
  };
}
