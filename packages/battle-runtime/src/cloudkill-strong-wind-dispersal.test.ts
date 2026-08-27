// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
import { describe, expect, test } from "vitest";

import { spellActiveEffectExecutionRef } from "./active-effect/execution-ref.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleSubjectBoundExecutionReferences } from "./battle-subjects.ts";
import {
  cloudkillAreaFill,
  spellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  cloudkillUnitId,
  longstriderUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  breakBattleConcentration,
  discoverBattleActs,
  endTurn,
  resolveBattleSubject,
} from "./unit-profile-admission.test-support.ts";
import {
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";

function castCloudkill() {
  const session = spellBattle({
    preparedSpells: [spellRecord(cloudkillUnitId)],
    spellSlots: [{ spellLevel: 5, count: 2 }],
  });
  const act = spellAct({
    session,
    spellId: cloudkillUnitId,
    slotLevel: 5,
  });
  const areaHole = requireHole(act.initialHoles, "spellAreaChoice");
  const cast = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [cloudkillAreaFill(areaHole)],
  });
  if (cast.tag !== "resolved") {
    throw new Error(`Expected Cloudkill cast to resolve: ${cast.tag}.`);
  }
  return { session, state: cast.state };
}

function cloudkillDispersalAct() {
  const cast = castCloudkill();
  const act = discoverBattleActs(
    battleRuntimeSessionForTest({ ...cast.session, state: cast.state }),
  ).find(
    (candidate) =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "disperseCloudkill",
  );
  if (act === undefined) {
    throw new Error("Expected active Cloudkill dispersal act.");
  }
  return { ...cast, act };
}

describe("Cloudkill strong-wind dispersal", () => {
  test("binds the dispersal reference to the containing effect owner while retaining its source", () => {
    const { session, state } = castCloudkill();
    const caster = requireCombatant(state, spellCasterId);
    const containingOwner = requireCombatant(state, spellTargetId);
    const cloudkill = caster.activeEffects.find(
      (effect) => effect.kind === "cloudkillAreaHazard",
    );
    if (cloudkill === undefined) {
      throw new Error("Expected active Cloudkill effect.");
    }
    const combatants = new Map(state.combatants)
      .set(spellCasterId, {
        ...caster,
        activeEffects: caster.activeEffects.filter(
          (effect) => effect !== cloudkill,
        ),
      })
      .set(spellTargetId, {
        ...containingOwner,
        activeEffects: [...containingOwner.activeEffects, cloudkill],
      });
    const relocatedState = { ...state, combatants };
    const act = discoverBattleActs(
      battleRuntimeSessionForTest({ ...session, state: relocatedState }),
    ).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "disperseCloudkill",
    );
    if (act === undefined) {
      throw new Error("Expected relocated Cloudkill dispersal act.");
    }
    const effectRef = spellActiveEffectExecutionRef(cloudkill);

    expect(cloudkill.sourceCombatantId).toBe(spellCasterId);
    expect(act.subject).toMatchObject({
      effectOwnerId: spellTargetId,
      effectRef,
    });
    expect(battleSubjectBoundExecutionReferences(act.subject)).toEqual([
      { kind: "activeEffect", ownerId: spellTargetId, effectRef },
    ]);
  });

  test("requests the table-owned area wind fact before dispersal", () => {
    const { act, state } = cloudkillDispersalAct();

    expect(act.subject).not.toHaveProperty("areaId");
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "areaWindStrength",
        areaId: "unit-profile-cloudkill-area",
      }),
    ]);
    expect(
      resolveBattleSubject({ state, subject: act.subject, fills: [] }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "areaWindStrength" })],
    });
  });

  test("rejects an established non-strong wind fact without cleanup", () => {
    const { act, state } = cloudkillDispersalAct();
    const windHole = requireHole(act.initialHoles, "areaWindStrength");

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          {
            kind: "areaWindStrength",
            holeId: windHole.holeId,
            value: { kind: "notStrong" },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Cloudkill dispersal requires strong wind in its area.",
      snapshot: {
        obscurementZones: [
          expect.objectContaining({
            area: expect.objectContaining({
              areaId: "unit-profile-cloudkill-area",
            }),
          }),
        ],
      },
    });
  });

  test("rejects a stale dispersal subject after a replacement uses the same area identity", () => {
    const { act, session, state } = cloudkillDispersalAct();
    const staleWindHole = requireHole(act.initialHoles, "areaWindStrength");
    const withoutFirstCloudkill = breakBattleConcentration(
      state,
      spellCasterId,
    );
    const targetTurn = endTurn({
      state: withoutFirstCloudkill,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster turn to end.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected target turn to end.");
    }
    const replacementAct = spellAct({
      session: battleRuntimeSessionForTest({
        ...session,
        state: casterTurn.state,
      }),
      spellId: cloudkillUnitId,
      slotLevel: 5,
    });
    const replacementAreaHole = requireHole(
      replacementAct.initialHoles,
      "spellAreaChoice",
    );
    const replacement = resolveBattleSubject({
      state: casterTurn.state,
      subject: replacementAct.subject,
      fills: [cloudkillAreaFill(replacementAreaHole)],
    });
    if (replacement.tag !== "resolved") {
      throw new Error("Expected replacement Cloudkill cast to resolve.");
    }

    expect(
      resolveBattleSubject({
        state: replacement.state,
        subject: act.subject,
        fills: [
          {
            kind: "areaWindStrength",
            holeId: staleWindHole.holeId,
            value: { kind: "strong" },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Cloudkill area is no longer active for this dispersal subject.",
      snapshot: {
        obscurementZones: [expect.anything()],
      },
    });
  });

  test("qualified strong wind removes only Cloudkill and its obscurement projection", () => {
    const session = spellBattle({
      preparedSpells: [
        spellRecord(longstriderUnitId),
        spellRecord(cloudkillUnitId),
      ],
      spellSlots: [
        { spellLevel: 1, count: 1 },
        { spellLevel: 5, count: 1 },
      ],
    });
    const longstriderAct = spellAct({
      session,
      spellId: longstriderUnitId,
      slotLevel: 1,
    });
    const longstriderTarget = requireHole(
      longstriderAct.initialHoles,
      "targetChoice",
    );
    const longstrider = resolveBattleSubject({
      state: session.state,
      subject: longstriderAct.subject,
      fills: [
        spellTargetFill(
          longstriderTarget,
          longstriderUnitId,
          spellCasterId,
          spellCasterId,
        ),
      ],
    });
    if (longstrider.tag !== "resolved") {
      throw new Error("Expected Longstrider cast to resolve.");
    }
    const targetTurn = endTurn({
      state: longstrider.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster turn to end after Longstrider.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected target turn to end after Longstrider.");
    }
    const cloudkillAct = spellAct({
      session: battleRuntimeSessionForTest({
        ...session,
        state: casterTurn.state,
      }),
      spellId: cloudkillUnitId,
      slotLevel: 5,
    });
    const areaHole = requireHole(cloudkillAct.initialHoles, "spellAreaChoice");
    const cloudkill = resolveBattleSubject({
      state: casterTurn.state,
      subject: cloudkillAct.subject,
      fills: [cloudkillAreaFill(areaHole)],
    });
    if (cloudkill.tag !== "resolved") {
      throw new Error("Expected Cloudkill cast to resolve.");
    }
    const dispersal = discoverBattleActs(
      battleRuntimeSessionForTest({ ...session, state: cloudkill.state }),
    ).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "disperseCloudkill",
    );
    if (dispersal === undefined) {
      throw new Error("Expected active Cloudkill dispersal act.");
    }
    const windHole = requireHole(dispersal.initialHoles, "areaWindStrength");

    const dispersed = resolveBattleSubject({
      state: cloudkill.state,
      subject: dispersal.subject,
      fills: [
        {
          kind: "areaWindStrength",
          holeId: windHole.holeId,
          value: { kind: "strong" },
        },
      ],
    });
    if (dispersed.tag !== "resolved") {
      throw new Error("Expected qualified Cloudkill dispersal to resolve.");
    }

    expect(dispersed.snapshot.obscurementZones).toEqual([]);
    expect(requireCombatant(dispersed.state, spellCasterId)).toMatchObject({
      concentration: null,
      activeEffects: [expect.objectContaining({ kind: "speedDelta" })],
    });
  });
});
