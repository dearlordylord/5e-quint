// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV29B color_spray
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV29C entangle
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV38A sleep
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-condition-save spell.invocation-sleep-target-admission
import { describe, expect, test } from "vitest";
import {
  colorSprayUnitId,
  entangleUnitId,
  sleepUnitId,
  spellCasterId,
} from "./unit-profile-admission-catalog-support.ts";
import { requireHole } from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  spellAct,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  resourceCount,
  spellSlotInvocationRef,
  spellSlotLevel,
  supportedPreparedSaveGateConditionProfile,
  supportedPreparedSleepTargetAdmissionProfile,
} from "./unit-profile-admission-test-support.ts";

describe("QMBT14 deterministic save-condition Spell Unit admission", () => {
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
          condition: "blinded",
          expiresAt: "endOfCasterNextTurn",
          escape: null,
          turnStartDamage: null,
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
          condition: "restrained",
          expiresAt: "concentration",
          escape: {
            kind: "abilityCheck",
            ability: "str",
            skill: "athletics",
            successEnds: "condition",
          },
          turnStartDamage: null,
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
