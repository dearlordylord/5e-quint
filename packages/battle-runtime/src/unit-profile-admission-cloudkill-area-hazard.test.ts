// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-03-CLOUDKILL-AREA-HAZARD cloudkill
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-cloudkill-area-hazard
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
import { describe, expect, test } from "vitest";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";
import cloudkillInput from "../../surface/content/cloudkill.json";

import {
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  cloudkillAreaFill,
  cloudkillAreaHazardSaveAct,
  singleTargetSavingThrowOutcomeFill,
  spellAct,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill-support.ts";
import {
  cloudkillAreaId,
  cloudkillUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  battleObscurementZones,
  elapsedTimeTicks,
  endTurn,
  Hp,
  movementFeet,
  resolveBattleSubject,
  spellId,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";

function castCloudkill() {
  const spell = cloudkillSpellRecord();
  const state = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 5, count: 1 }],
    targetHp: 30,
    targetMaxHp: 30,
  });
  const act = spellAct({ state, spellId: cloudkillUnitId, slotLevel: 5 });
  const area = requireHole(act.initialHoles, "spellAreaChoice");
  const cast = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [cloudkillAreaFill(area)],
  });
  if (cast.tag !== "resolved") {
    throw new Error(
      `Expected Cloudkill cast to resolve: ${JSON.stringify(cast)}`,
    );
  }
  const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected Cloudkill caster End Turn to resolve.");
  }
  return { spell, state, act, cast: cast.state, targetTurn: targetTurn.state };
}

function cloudkillSpellRecord(): SpellRecord {
  const unit = decodeUnitRecordSync(cloudkillInput);
  expect(unit.kind).toBe("spell");
  return unit as SpellRecord;
}

function resolveCloudkillSave(input: {
  readonly state: ReturnType<typeof castCloudkill>["cast"];
  readonly succeeded: boolean;
}) {
  const saveAct = cloudkillAreaHazardSaveAct(
    input.state,
    spellTargetId,
    "appearsInArea",
  );
  const saveHole = requireHole(saveAct.initialHoles, "savingThrowOutcome");
  const pendingDamage = resolveBattleSubject({
    state: input.state,
    subject: saveAct.subject,
    fills: [
      singleTargetSavingThrowOutcomeFill(
        saveHole,
        spellTargetId,
        input.succeeded,
      ),
    ],
  });
  if (pendingDamage.tag === "invalid") {
    throw new Error(
      `Expected Cloudkill save to request damage: ${JSON.stringify(pendingDamage)}`,
    );
  }
  expect(pendingDamage).toMatchObject({
    tag: "needsHoles",
    holes: [expect.objectContaining({ kind: "rolledDice" })],
  });
  const damageHole = requireResultHole(pendingDamage, "rolledDice");
  return resolveBattleSubject({
    state: input.state,
    subject: saveAct.subject,
    fills: [
      singleTargetSavingThrowOutcomeFill(
        saveHole,
        spellTargetId,
        input.succeeded,
      ),
      damageRollFillWithGroups(damageHole, [[6, 6, 6, 6, 6]]),
    ],
  });
}

describe("L19E deterministic Cloudkill area-hazard admission", () => {
  test("cloudkill is admitted as a ten-minute point-origin Sphere hazard", () => {
    const { spell, act } = castCloudkill();

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        cloudkillUnitId,
        5,
        "cloudkillAreaHazard",
      ),
      mode: { tag: "cast" },
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    expect(area).toEqual(
      expect.objectContaining({
        label: "Cloudkill area",
        area: { kind: "pointOriginSphere", radiusFeet: movementFeet(20) },
      }),
    );
    expect(spellHoleInvocation([area])).toEqual(
      expect.objectContaining({
        procedure: "cloudkillAreaHazard",
        spell,
        resource: { tag: "spellSlot", slotLevel: 5 },
        ability: "con",
        targeting: { kind: "pointOriginSphere", radiusFeet: movementFeet(20) },
        durationTicks: elapsedTimeTicks(100),
        rangeFeet: movementFeet(120),
        damage: {
          expr: { dice: 5, dieSize: 8 },
          damageType: "poison",
        },
      }),
    );
  });

  test("cast records the active hazard and projects a Heavily Obscured sphere", () => {
    const { spell, cast } = castCloudkill();

    expect(requireCombatant(cast, spellCasterId)).toMatchObject({
      concentration: {
        sourceSpellId: cloudkillUnitId,
        effectKind: "spellEffect",
      },
      activeEffects: [
        expect.objectContaining({
          kind: "cloudkillAreaHazard",
          sourceSpellId: cloudkillUnitId,
          sourceCombatantId: spellCasterId,
          areaId: cloudkillAreaId,
          radiusFeet: movementFeet(20),
          save: { ability: "con", dc: { kind: "caster_spell_save_dc" } },
          damage: { expr: { dice: 5, dieSize: 8 }, damageType: "poison" },
          savedThisTurn: [],
          expiresAt: {
            kind: "concentration",
            combatantId: spellCasterId,
            durationTicks: elapsedTimeTicks(100),
          },
        }),
      ],
    });
    expect(battleObscurementZones(cast)).toEqual([
      expect.objectContaining({
        kind: "spellObscurementZone",
        sourceSpellId: spell.id,
        sourceCombatantId: spellCasterId,
        obscurement: "heavilyObscured",
        area: {
          kind: "pointOriginSphere",
          areaId: cloudkillAreaId,
          radiusFeet: movementFeet(20),
        },
      }),
    ]);
  });

  test("appearance save applies full or half Poison damage through the active hazard", () => {
    const { cast } = castCloudkill();
    const failed = resolveCloudkillSave({ state: cast, succeeded: false });
    expect(failed).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: spellTargetId, hp: Hp(0) }),
        ]),
      },
    });

    const { cast: secondCast } = castCloudkill();
    const succeeded = resolveCloudkillSave({
      state: secondCast,
      succeeded: true,
    });
    expect(succeeded).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({ combatantId: spellTargetId, hp: Hp(15) }),
        ]),
      },
    });
  });

  test("cloud movement, entry, and end-turn saves share the once-per-turn hazard ledger", () => {
    const { targetTurn } = castCloudkill();
    const moveAct = cloudkillAreaHazardSaveAct(
      targetTurn,
      spellTargetId,
      "movesIntoSpace",
    );
    const saveHole = requireHole(moveAct.initialHoles, "savingThrowOutcome");
    const pendingDamage = resolveBattleSubject({
      state: targetTurn,
      subject: moveAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(saveHole, spellTargetId, true),
      ],
    });
    if (pendingDamage.tag === "invalid") {
      throw new Error(
        `Expected Cloudkill movement save to request damage: ${JSON.stringify(pendingDamage)}`,
      );
    }
    const damageHole = requireResultHole(pendingDamage, "rolledDice");
    const movedIntoSpace = resolveBattleSubject({
      state: targetTurn,
      subject: moveAct.subject,
      fills: [
        singleTargetSavingThrowOutcomeFill(saveHole, spellTargetId, true),
        damageRollFillWithGroups(damageHole, [[1, 1, 1, 1, 1]]),
      ],
    });
    if (movedIntoSpace.tag !== "resolved") {
      throw new Error("Expected Cloudkill movement save to resolve.");
    }

    expect(
      resolveBattleSubject({
        state: movedIntoSpace.state,
        subject: cloudkillAreaHazardSaveAct(
          movedIntoSpace.state,
          spellTargetId,
          "entersArea",
        ).subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Cloudkill save was already resolved for this target this turn.",
    });
  });

  test("strong wind dispersal ends the active Cloudkill hazard", () => {
    const { cast } = castCloudkill();
    const dispersed = resolveBattleSubject({
      state: cast,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "disperseCloudkill",
        sourceCombatantId: spellCasterId,
        sourceSpellId: spellId(cloudkillUnitId),
        areaId: cloudkillAreaId,
      },
      fills: [],
    });
    expect(dispersed).toMatchObject({
      tag: "resolved",
      snapshot: {
        obscurementZones: [],
      },
    });
    if (dispersed.tag !== "resolved") {
      throw new Error("Expected Cloudkill dispersal to resolve.");
    }
    expect(requireCombatant(dispersed.state, spellCasterId)).toMatchObject({
      concentration: null,
      activeEffects: [],
    });
  });
});
