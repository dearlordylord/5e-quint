import { describe, expect, test } from "vitest";

import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  concentrationSavingThrowFill,
  requireResolved,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import {
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  flamingSphereUnitId,
  greaseUnitId,
  sleetStormUnitId,
  spellCasterId,
  spellTargetId,
  webUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  flamingSphereAreaFill,
  flamingSphereRamAct,
  flamingSphereRamMovementFill,
  persistentAreaSaveConditionEndTurnAct,
  greaseSavingThrowOutcomeFill,
  singleTargetSavingThrowOutcomeFill,
  sleetStormAreaFill,
  persistentAreaSaveCompositeSaveAct,
  spellAct,
  webAreaFill,
  persistentAreaSaveConditionEscapeAreaRemovedAct,
  persistentAreaSaveConditionEscapeSaveAct,
  webRestrainedNoLongerInAreaAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  breakBattleConcentration,
  endTurn,
  resolveBattleSubject,
} from "./unit-profile-admission.test-support.ts";

describe("battle runtime spatial-effect coverage", () => {
  test("caller-supplied Sleet Storm and expired Grease subjects become stale", () => {
    const sleet = castSleetStorm();
    const sleetSave = persistentAreaSaveCompositeSaveAct(
      sleet.targetTurn,
      spellTargetId,
      "entersArea",
    );
    expect(
      resolveBattleSubject({
        state: sleet.targetTurn,
        subject: sleetSave.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "savingThrowOutcome" })],
    });
    expect(
      resolveBattleSubject({
        state: breakBattleConcentration(sleet.targetTurn, spellCasterId),
        subject: sleetSave.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Sleet Storm save is no longer available.",
    });

    const grease = castGrease();
    const greaseSave = persistentAreaSaveConditionEndTurnAct(
      battleRuntimeSessionForTest({
        ...grease.session,
        state: grease.targetTurn,
      }),
      spellTargetId,
    );
    let expiredGrease = grease.targetTurn;
    for (let turn = 0; turn < 20; turn += 1) {
      expiredGrease = requireResolved(
        endTurn({
          state: expiredGrease,
          actorId: turn % 2 === 0 ? spellTargetId : spellCasterId,
        }),
      ).state;
    }
    expect(
      resolveBattleSubject({
        state: expiredGrease,
        subject: greaseSave.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Grease ground-hazard save is no longer available.",
    });
  });

  test("Web failed saves replace the source condition after a new turn and clean up through discovered lifecycle commands", () => {
    const { cast, targetTurn } = castWeb();
    const firstSaveAct = persistentAreaSaveConditionEscapeSaveAct(
      targetTurn,
      spellTargetId,
      "startsTurnInArea",
    );
    const firstSave = requireHole(
      firstSaveAct.initialHoles,
      "savingThrowOutcome",
    );
    const firstFailed = requireResolved(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: firstSaveAct.subject,
        fills: [
          singleTargetSavingThrowOutcomeFill(firstSave, spellTargetId, false),
        ],
      }),
    );

    expect(requireCombatant(firstFailed.state, spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ restrained: true }),
    });
    expect(
      requireCombatant(firstFailed.state, spellCasterId).activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "persistentAreaSaveConditionEscape",
        startTurnSavedThisTurn: [spellTargetId],
      }),
    ]);

    const casterTurn = requireResolved(
      endTurn({ state: firstFailed.state, actorId: spellTargetId }),
    );
    const nextTargetTurn = requireResolved(
      endTurn({ state: casterTurn.state, actorId: spellCasterId }),
    );
    const secondTurnSession = battleRuntimeSessionForTest({
      ...cast,
      state: nextTargetTurn.state,
    });
    const secondSaveAct = persistentAreaSaveConditionEscapeSaveAct(
      secondTurnSession,
      spellTargetId,
      "startsTurnInArea",
    );
    const secondSave = requireHole(
      secondSaveAct.initialHoles,
      "savingThrowOutcome",
    );
    const secondFailed = requireResolved(
      resolveBattleSubject({
        state: nextTargetTurn.state,
        subject: secondSaveAct.subject,
        fills: [
          singleTargetSavingThrowOutcomeFill(secondSave, spellTargetId, false),
        ],
      }),
    );

    const restrainedEffects = requireCombatant(
      secondFailed.state,
      spellTargetId,
    ).activeEffects.filter(
      (effect) =>
        effect.kind === "spellCondition" && effect.condition === "restrained",
    );
    expect(restrainedEffects).toHaveLength(1);
    expect(
      requireCombatant(secondFailed.state, spellCasterId).activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "persistentAreaSaveConditionEscape",
        startTurnSavedThisTurn: [spellTargetId],
      }),
    ]);

    const cleanupAct = webRestrainedNoLongerInAreaAct(
      battleRuntimeSessionForTest({ ...cast, state: secondFailed.state }),
      spellTargetId,
    );
    const cleaned = requireResolved(
      resolveBattleSubject({
        state: secondFailed.state,
        subject: cleanupAct.subject,
        fills: [],
      }),
    );
    expect(requireCombatant(cleaned.state, spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ restrained: false }),
    });
    expect(
      requireCombatant(cleaned.state, spellCasterId).activeEffects,
    ).toEqual([
      expect.objectContaining({ kind: "persistentAreaSaveConditionEscape" }),
    ]);

    const areaRemoved = requireResolved(
      resolveBattleSubject({
        state: cleaned.state,
        subject: persistentAreaSaveConditionEscapeAreaRemovedAct(
          battleRuntimeSessionForTest({ ...cast, state: cleaned.state }),
        ).subject,
        fills: [],
      }),
    );
    expect(requireCombatant(areaRemoved.state, spellCasterId)).toMatchObject({
      concentration: null,
      activeEffects: [],
    });
  });

  test("Flaming Sphere ram discovers and resolves a target Concentration save before spending its Bonus Action", () => {
    const initial = spellBattle({
      preparedSpells: [spellRecord(flamingSphereUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 3 }],
      targetClassLevels: [{ className: "wizard", level: 3 }],
      targetSpellcasting: wizardSpellcasting({
        preparedSpells: [spellRecord(webUnitId)],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      }),
      targetHp: 30,
      targetMaxHp: 30,
    });
    const sphereAct = spellAct({
      session: initial,
      spellId: flamingSphereUnitId,
      slotLevel: 2,
    });
    const cast = requireResolved(
      resolveBattleSubject({
        state: initial.state,
        subject: sphereAct.subject,
        fills: [
          flamingSphereAreaFill(
            requireHole(sphereAct.initialHoles, "spellAreaChoice"),
          ),
        ],
      }),
    );

    const targetTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const targetSession = battleRuntimeSessionForTest({
      ...initial,
      state: targetTurn.state,
    });
    const webAct = spellAct({
      session: targetSession,
      spellId: webUnitId,
      slotLevel: 2,
    });
    const webCast = requireResolved(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: webAct.subject,
        fills: [
          webAreaFill(requireHole(webAct.initialHoles, "spellAreaChoice")),
        ],
      }),
    );
    const casterTurn = requireResolved(
      endTurn({ state: webCast.state, actorId: spellTargetId }),
    );

    const casterSession = battleRuntimeSessionForTest({
      ...initial,
      state: casterTurn.state,
    });
    const ram = flamingSphereRamAct(casterSession);
    const movement = requireHole(ram.initialHoles, "movableZoneRamMovement");
    const save = requireHole(ram.initialHoles, "savingThrowOutcome");
    const movementFill = flamingSphereRamMovementFill(movement, 30);
    const saveFill = singleTargetSavingThrowOutcomeFill(
      save,
      spellTargetId,
      false,
    );
    const needsDamage = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: ram.subject,
        fills: [movementFill, saveFill],
      }),
      "rolledDice",
    );
    const damageFill = damageRollFillWithGroups(needsDamage, [[3, 4]]);
    const needsConcentration = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: ram.subject,
        fills: [movementFill, saveFill, damageFill],
      }),
      "concentrationSavingThrow",
    );
    expect(needsConcentration).toMatchObject({ damageAmount: 7 });

    const resolved = requireResolved(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: ram.subject,
        fills: [
          movementFill,
          saveFill,
          damageFill,
          concentrationSavingThrowFill(needsConcentration, false),
        ],
      }),
    );
    expect(requireCombatant(resolved.state, spellTargetId)).toMatchObject({
      hp: 23,
      concentration: null,
    });
    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
  });
});

function castWeb() {
  const session = spellBattle({
    preparedSpells: [spellRecord(webUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    casterClassLevels: [{ className: "wizard", level: 3 }],
  });
  const act = spellAct({ session, spellId: webUnitId, slotLevel: 2 });
  const cast = requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [webAreaFill(requireHole(act.initialHoles, "spellAreaChoice"))],
    }),
  );
  const targetTurn = requireResolved(
    endTurn({ state: cast.state, actorId: spellCasterId }),
  );
  return {
    session,
    cast: battleRuntimeSessionForTest({ ...session, state: cast.state }),
    targetTurn: battleRuntimeSessionForTest({
      ...session,
      state: targetTurn.state,
    }),
  };
}

function castSleetStorm() {
  const session = spellBattle({
    preparedSpells: [spellRecord(sleetStormUnitId)],
    spellSlots: [{ spellLevel: 3, count: 1 }],
    casterClassLevels: [{ className: "wizard", level: 5 }],
  });
  const act = spellAct({
    session,
    spellId: sleetStormUnitId,
    slotLevel: 3,
  });
  const cast = requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        sleetStormAreaFill(requireHole(act.initialHoles, "spellAreaChoice")),
      ],
    }),
  );
  const targetTurn = requireResolved(
    endTurn({ state: cast.state, actorId: spellCasterId }),
  );
  return {
    targetTurn: targetTurn.state,
  };
}

function castGrease() {
  const session = spellBattle({
    preparedSpells: [spellRecord(greaseUnitId)],
    spellSlots: [{ spellLevel: 1, count: 1 }],
  });
  const act = spellAct({ session, spellId: greaseUnitId, slotLevel: 1 });
  const cast = requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        greaseSavingThrowOutcomeFill(
          requireHole(act.initialHoles, "savingThrowOutcome"),
          [],
        ),
      ],
    }),
  );
  const targetTurn = requireResolved(
    endTurn({ state: cast.state, actorId: spellCasterId }),
  );
  return {
    session,
    targetTurn: targetTurn.state,
  };
}
