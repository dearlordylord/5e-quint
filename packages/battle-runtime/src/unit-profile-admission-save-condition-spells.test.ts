// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV29B color_spray
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV29C entangle
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV38A sleep
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-BLINDNESS-DEAFNESS blindness_deafness
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-condition-save spell.invocation-sleep-target-admission
import { Schema } from "effect";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";
import {
  blindnessDeafnessUnitId,
  colorSprayUnitId,
  entangleUnitId,
  sleepUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  savingThrowOutcomeFill,
  spellConditionChoiceFill,
  spellAct,
  spellHoleInvocation,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  BattleFillSchema,
  BattleHoleSchema,
  endTurn,
  resolveBattleSubject,
} from "./index.ts";
import {
  resourceCount,
  spellSlotInvocationRef,
  spellSlotLevel,
  supportedPreparedSaveGateConditionProfile,
  supportedPreparedSleepTargetAdmissionProfile,
} from "./unit-profile-admission-test-support.ts";

describe("QMBT14 deterministic save-condition Spell Unit admission", () => {
  test("blindness_deafness is admitted with condition choice and end-turn save lifecycle", () => {
    const spell = spellRecord(blindnessDeafnessUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: blindnessDeafnessUnitId,
      slotLevel: 2,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "blindness_deafness",
        2,
        "saveGatedCondition",
      ),
      mode: { tag: "cast" },
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const conditionHole = requireHole(act.initialHoles, "conditionChoice");
    expect(targetHole).toEqual(
      expect.objectContaining({
        minTargets: 1,
        maxTargets: 1,
      }),
    );
    expect(conditionHole).toEqual(
      expect.objectContaining({
        choices: ["blinded", "deafened"],
      }),
    );
    expect(spellHoleInvocation([targetHole])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedCondition",
        spell,
        resource: { tag: "spellSlot", slotLevel: 2 },
        ability: "con",
        targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
        effect: {
          kind: "choice",
          choices: ["blinded", "deafened"],
          expiresAt: { kind: "duration", durationTicks: 10 },
          escape: null,
          turnStartDamage: null,
          repeatSave: {
            ability: "con",
            dc: { kind: "caster_spell_save_dc" },
          },
        },
        rangeFeet: 120,
      }),
    );

    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      blindnessDeafnessUnitId,
      [spellTargetId],
    );
    const conditionFill = spellConditionChoiceFill(conditionHole, "deafened");
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleHoleSchema)(conditionHole),
      ),
    ).toBe(true);
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleFillSchema)(conditionFill),
      ),
    ).toBe(true);
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill, conditionFill],
      }),
      "savingThrowOutcome",
    );
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        conditionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Blindness/Deafness to resolve.");
    }
    expect(resolved.state.combatants.get(spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ deafened: true }),
      activeEffects: [
        expect.objectContaining({
          kind: "spellConditionEndTurnSave",
          sourceSpellId: "blindness_deafness",
          sourceCombatantId: spellCasterId,
          condition: "deafened",
          save: { ability: "con", dc: { kind: "caster_spell_save_dc" } },
          expiresAt: { kind: "duration", durationTicks: 10 },
        }),
      ],
    });

    const targetTurn = endTurn({
      state: resolved.state,
      actorId: spellCasterId,
    });
    expect(targetTurn).toMatchObject({ tag: "resolved" });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const repeatSave = requireResultHole(
      endTurn({ state: targetTurn.state, actorId: spellTargetId }),
      "savingThrowOutcome",
    );
    expect(repeatSave).toEqual(
      expect.objectContaining({
        spellConditionEndTurnSave: expect.objectContaining({
          targetId: spellTargetId,
          sourceSpellId: "blindness_deafness",
          condition: "deafened",
        }),
        ability: "con",
      }),
    );
    expect(
      Either.isRight(Schema.decodeUnknownEither(BattleHoleSchema)(repeatSave)),
    ).toBe(true);
    const ended = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [
        savingThrowOutcomeFill(repeatSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    expect(ended).toMatchObject({ tag: "resolved" });
    if (ended.tag !== "resolved") {
      throw new Error("Expected successful repeat save to resolve.");
    }
    expect(ended.state.combatants.get(spellTargetId)).toMatchObject({
      conditions: expect.not.objectContaining({ deafened: true }),
      activeEffects: [],
    });
  });

  test("color_spray is admitted as a self-origin Cone save-gated slot condition spell", () => {
    const spell = spellRecord(colorSprayUnitId);
    const act = spellAct({
      state: spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      }),
      spellId: colorSprayUnitId,
      slotLevel: 1,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "color_spray",
        1,
        "saveGatedCondition",
      ),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Color Spray self-origin Cone Saving Throw outcomes",
        ability: "con",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation([savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedCondition",
        spell,
        resource: { tag: "spellSlot", slotLevel: 1 },
        ability: "con",
        targeting: { kind: "selfOriginCone", lengthFeet: 15 },
        effect: {
          kind: "fixed",
          condition: "blinded",
          expiresAt: "endOfCasterNextTurn",
          escape: null,
          turnStartDamage: null,
          repeatSave: null,
        },
        rangeFeet: 0,
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "savingThrowOutcome",
        areaChoices: [],
      }),
    ]);
  });
  test("entangle is admitted as a point-origin Cube save-gated slot condition spell", () => {
    const spell = spellRecord(entangleUnitId);
    const act = spellAct({
      state: spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      }),
      spellId: entangleUnitId,
      slotLevel: 1,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef("entangle", 1, "saveGatedCondition"),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Entangle point-origin Cube Saving Throw outcomes",
        ability: "str",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation([savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedCondition",
        spell,
        resource: { tag: "spellSlot", slotLevel: 1 },
        ability: "str",
        targeting: { kind: "pointOriginCubeExcludingCaster", sideFeet: 20 },
        effect: {
          kind: "fixed",
          condition: "restrained",
          expiresAt: "concentration",
          escape: {
            kind: "abilityCheck",
            ability: "str",
            skill: "athletics",
            successEnds: "condition",
          },
          turnStartDamage: null,
          repeatSave: null,
        },
        rangeFeet: 90,
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "savingThrowOutcome",
        areaChoices: [],
      }),
    ]);
  });
  test("sleep is admitted as point-origin Sphere target admission", () => {
    const spell = spellRecord(sleepUnitId);
    const act = spellAct({
      state: spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      }),
      spellId: sleepUnitId,
      slotLevel: 1,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef("sleep", 1, "sleepTargetAdmission"),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Sleep point-origin Sphere Saving Throw outcomes",
        ability: "wis",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation([savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "sleepTargetAdmission",
        spell,
        resource: { tag: "spellSlot", slotLevel: 1 },
        ability: "wis",
        targeting: { kind: "pointOriginSphere", radiusFeet: 5 },
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
  test("sleep is not admitted through the generic save-gated condition projection", () => {
    const spell = spellRecord(sleepUnitId);
    const spellSlots = [
      {
        spellLevel: spellSlotLevel(1),
        count: resourceCount(1),
        expended: resourceCount(0),
      },
    ];

    expect(
      supportedPreparedSaveGateConditionProfile(spell, spellSlots),
    ).toEqual([]);
    expect(
      supportedPreparedSleepTargetAdmissionProfile(spell, spellSlots),
    ).toEqual([
      expect.objectContaining({
        procedure: "sleepTargetAdmission",
        spell,
        targeting: { kind: "pointOriginSphere", radiusFeet: 5 },
      }),
    ]);
  });
});
