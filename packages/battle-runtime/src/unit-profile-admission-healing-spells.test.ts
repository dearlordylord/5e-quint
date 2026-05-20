// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT25 healing_word
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT32 cure_wounds mass_healing_word
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT34 mass_cure_wounds
import { describe, expect, test } from "vitest";
import {
  cureWoundsUnitId,
  healingWordUnitId,
  massCureWoundsUnitId,
  massHealingTargetIds,
  massHealingWordUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import { requireHole } from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  spellAct,
  spellHoleInvocation,
  spellTargetFill,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleAreaId,
  movementFeet,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";

describe("QMBT25 deterministic Spell Unit admission re-triage", () => {
  test("healing_word is admitted through catalog spell access and projected as a Bonus Action healing spell", () => {
    const spell = spellRecord(healingWordUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = bonusSpellAct({
      state,
      spellId: healingWordUnitId,
    });

    expect(act.subject).toEqual({
      tag: "bonusActionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "healing_word",
        1,
        "directHitPointRestoration",
      ),
      mode: { tag: "cast" },
    });
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const awaitingHealingRoll = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          healingWordUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(awaitingHealingRoll).toMatchObject({ tag: "needsHoles" });
    if (awaitingHealingRoll.tag !== "needsHoles") {
      throw new Error("Expected Healing Word healing roll hole.");
    }

    expect(spellHoleInvocation(awaitingHealingRoll.holes)).toEqual(
      expect.objectContaining({
        procedure: "directHitPointRestoration",
        spell,
        resource: { tag: "spellSlot", slotLevel: 1 },
        healing: {
          expr: { dice: 2, dieSize: 4, flat: 3 },
        },
        rangeFeet: 60,
      }),
    );
  });
});

describe("QMBT32 deterministic direct Hit Point restoration spell admission", () => {
  test("cure_wounds is admitted through catalog spell access and projected as a Magic Action healing spell", () => {
    const spell = spellRecord(cureWoundsUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = spellAct({
      state,
      spellId: cureWoundsUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "cure_wounds",
        1,
        "directHitPointRestoration",
      ),
      mode: { tag: "cast" },
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const awaitingHealingRoll = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          cureWoundsUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(awaitingHealingRoll).toMatchObject({ tag: "needsHoles" });
    if (awaitingHealingRoll.tag !== "needsHoles") {
      throw new Error("Expected Cure Wounds healing roll hole.");
    }
    expect(spellHoleInvocation(awaitingHealingRoll.holes)).toEqual(
      expect.objectContaining({
        procedure: "directHitPointRestoration",
        spell,
        actionCost: "magicAction",
        targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
        resource: { tag: "spellSlot", slotLevel: 1 },
        healing: {
          expr: { dice: 2, dieSize: 8, flat: 3 },
        },
        rangeFeet: 5,
      }),
    );
  });

  test("mass_healing_word is admitted as up-to-six Bonus Action healing and rejects adjacent invalid target counts", () => {
    const spell = spellRecord(massHealingWordUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      extraTargetIds: massHealingTargetIds.slice(1),
    });
    const act = bonusSpellAct({
      state,
      spellId: massHealingWordUnitId,
    });

    expect(act.subject).toEqual({
      tag: "bonusActionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "mass_healing_word",
        3,
        "directHitPointRestoration",
      ),
      mode: { tag: "cast" },
    });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");
    expect(targetListHole).toEqual(
      expect.objectContaining({
        minTargets: 1,
        maxTargets: 6,
      }),
    );
    expect(spellHoleInvocation(act.initialHoles)).toEqual(
      expect.objectContaining({
        procedure: "directHitPointRestoration",
        actionCost: "bonusAction",
        targeting: { kind: "targetList", minTargets: 1, maxTargets: 6 },
        resource: { tag: "spellSlot", slotLevel: 3 },
        healing: {
          expr: { dice: 2, dieSize: 4, flat: 3 },
        },
      }),
    );

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          spellTargetListFill(
            targetListHole,
            spellCasterId,
            massHealingWordUnitId,
            [],
          ),
        ],
      }),
    ).toMatchObject({ tag: "invalid" });
    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          spellTargetListFill(
            targetListHole,
            spellCasterId,
            massHealingWordUnitId,
            massHealingTargetIds,
          ),
        ],
      }),
    ).toMatchObject({ tag: "invalid" });
  });

  test("mass_cure_wounds is admitted as up-to-six point-origin Sphere Magic Action healing", () => {
    const spell = spellRecord(massCureWoundsUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 5, count: 1 }],
      extraTargetIds: massHealingTargetIds.slice(1),
    });
    const act = spellAct({
      state,
      spellId: massCureWoundsUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "mass_cure_wounds",
        5,
        "directHitPointRestoration",
      ),
      mode: { tag: "cast" },
    });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");
    expect(targetListHole).toEqual(
      expect.objectContaining({
        minTargets: 1,
        maxTargets: 6,
      }),
    );
    expect(spellHoleInvocation(act.initialHoles)).toEqual(
      expect.objectContaining({
        procedure: "directHitPointRestoration",
        spell,
        actionCost: "magicAction",
        targeting: {
          kind: "pointOriginSphereTargetList",
          minTargets: 1,
          maxTargets: 6,
          area: { kind: "pointOriginSphere", radiusFeet: 30 },
        },
        resource: { tag: "spellSlot", slotLevel: 5 },
        healing: {
          expr: { dice: 5, dieSize: 8, flat: 3 },
        },
        rangeFeet: 60,
      }),
    );
  });

  test("mass_cure_wounds rejects target lists without one shared point-origin Sphere", () => {
    const spell = spellRecord(massCureWoundsUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 5, count: 1 }],
      extraTargetIds: massHealingTargetIds.slice(1),
    });
    const act = spellAct({
      state,
      spellId: massCureWoundsUnitId,
    });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");
    const targetIds = [spellTargetId, massHealingTargetIds[1]];

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          {
            kind: "spellTargetList",
            holeId: targetListHole.holeId,
            value: { targetIds },
            spatialFacts: [
              {
                kind: "spellTargetsInPointOriginSphere",
                casterId: spellCasterId,
                spellId: massCureWoundsUnitId,
                areaId: battleAreaId("area-a"),
                radiusFeet: movementFeet(30),
                targetIds: [targetIds[0]],
              },
              {
                kind: "spellTargetsInPointOriginSphere",
                casterId: spellCasterId,
                spellId: massCureWoundsUnitId,
                areaId: battleAreaId("area-b"),
                radiusFeet: movementFeet(30),
                targetIds: [targetIds[1]],
              },
            ],
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Area healing targets must share one selected point-origin Sphere.",
    });
  });

  test("mass_cure_wounds level 6 slot scaling adds one healing die", () => {
    const spell = spellRecord(massCureWoundsUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 6, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: massCureWoundsUnitId,
      slotLevel: 6,
    });
    const targetListHole = requireHole(act.initialHoles, "spellTargetList");
    const awaitingHealingRoll = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetListFill(
          targetListHole,
          spellCasterId,
          massCureWoundsUnitId,
          [spellTargetId],
        ),
      ],
    });

    expect(awaitingHealingRoll).toMatchObject({ tag: "needsHoles" });
    if (awaitingHealingRoll.tag !== "needsHoles") {
      throw new Error("Expected Mass Cure Wounds healing roll hole.");
    }
    expect(spellHoleInvocation(awaitingHealingRoll.holes)).toEqual(
      expect.objectContaining({
        procedure: "directHitPointRestoration",
        resource: { tag: "spellSlot", slotLevel: 6 },
        healing: {
          expr: { dice: 6, dieSize: 8, flat: 3 },
        },
      }),
    );
  });
});
