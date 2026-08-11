import { describe, expect, test } from "vitest";

import { battleActDruidWildShapePresentation } from "./battle-act-composition.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  characterSeed,
  discoverBattleActs,
  requireNeedsHoles,
  requireResolved,
  startBattleSessionRight,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import {
  battleAreaId,
  battleId,
  breakBattleConcentration,
  endTurn,
  resolveBattleSubject,
} from "./unit-profile-admission.test-support.ts";
import {
  flamingSphereAreaFill,
  flamingSphereEndTurnAct,
  flamingSphereRepositionAct,
  gustOfWindLineDirectionChangeAct,
  gustOfWindLineDirectionChoiceFill,
  gustOfWindLineEndTurnSaveAct,
  gustOfWindLineSavingThrowOutcomeFill,
  greaseGroundHazardEndTurnAct,
  greaseSavingThrowOutcomeFill,
  moonbeamAreaFill,
  moonbeamEndTurnSaveAct,
  singleTargetSavingThrowOutcomeFill,
  spellAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  flamingSphereUnitId,
  greaseUnitId,
  gustOfWindUnitId,
  moonbeamUnitId,
  spellCasterId,
  spellTargetId,
  statBlockCatalog,
  thunderwaveSecondTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  damageRollFillWithGroups,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";

const deathSaveFrontierActorId = thunderwaveSecondTargetId;

describe("persistent spatial spell boundary procedures", () => {
  test("Gust of Wind rejects incomplete, mismatched, and retargeted Line save witnesses", () => {
    const initial = spellBattle({
      preparedSpells: [spellRecord(gustOfWindUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 3 }],
    });
    const castAct = spellAct({
      session: initial,
      spellId: gustOfWindUnitId,
      slotLevel: 2,
    });
    const castSave = requireHole(castAct.initialHoles, "savingThrowOutcome");
    const cast = requireResolved(
      resolveBattleSubject({
        state: initial.state,
        subject: castAct.subject,
        fills: [
          gustOfWindLineSavingThrowOutcomeFill(castSave, [
            { targetId: spellTargetId, succeeded: true },
          ]),
        ],
      }),
    );
    const targetTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const saveAct = gustOfWindLineEndTurnSaveAct(targetTurn.state);
    const save = requireHole(saveAct.initialHoles, "savingThrowOutcome");

    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: saveAct.subject,
        fills: [
          {
            ...gustOfWindLineSavingThrowOutcomeFill(save, [
              { targetId: spellTargetId, succeeded: true },
            ]),
            value: { outcomes: [{ targetId: spellTargetId, succeeded: true }] },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Gust of Wind Line Saving Throw outcome requires Line area facts.",
    });

    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: saveAct.subject,
        fills: [
          gustOfWindLineSavingThrowOutcomeFill(
            save,
            [{ targetId: spellTargetId, succeeded: true }],
            { areaId: battleAreaId("wrong-gust-line") },
          ),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Gust of Wind Line Saving Throw outcome must match the active Line area.",
    });

    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: saveAct.subject,
        fills: [
          gustOfWindLineSavingThrowOutcomeFill(save, [
            { targetId: spellCasterId, succeeded: true },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Gust of Wind Line Saving Throw outcome must match the ending-turn target.",
    });
  });

  test("Gust of Wind direction change spends one Bonus Action and rejects stale subjects", () => {
    const initial = spellBattle({
      preparedSpells: [spellRecord(gustOfWindUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 3 }],
    });
    const castAct = spellAct({
      session: initial,
      spellId: gustOfWindUnitId,
      slotLevel: 2,
    });
    const cast = requireResolved(
      resolveBattleSubject({
        state: initial.state,
        subject: castAct.subject,
        fills: [
          gustOfWindLineSavingThrowOutcomeFill(
            requireHole(castAct.initialHoles, "savingThrowOutcome"),
            [],
          ),
        ],
      }),
    );
    const targetTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const saveAct = gustOfWindLineEndTurnSaveAct(targetTurn.state);
    const resolvedTargetTurn = requireResolved(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: saveAct.subject,
        fills: [
          gustOfWindLineSavingThrowOutcomeFill(
            requireHole(saveAct.initialHoles, "savingThrowOutcome"),
            [{ targetId: spellTargetId, succeeded: true }],
          ),
        ],
      }),
    );
    const directionAct = gustOfWindLineDirectionChangeAct(
      resolvedTargetTurn.state,
    );
    const directionHole = requireHole(
      directionAct.initialHoles,
      "gustOfWindLineDirectionChoice",
    );
    const changed = requireResolved(
      resolveBattleSubject({
        state: resolvedTargetTurn.state,
        subject: directionAct.subject,
        fills: [gustOfWindLineDirectionChoiceFill(directionHole)],
      }),
    );
    expect(changed.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );

    expect(
      resolveBattleSubject({
        state: changed.state,
        subject: directionAct.subject,
        fills: [gustOfWindLineDirectionChoiceFill(directionHole)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Gust of Wind Line direction change is no longer available.",
    });

    expect(
      resolveBattleSubject({
        state: breakBattleConcentration(changed.state, spellCasterId),
        subject: directionAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Gust of Wind Line direction change is no longer available.",
    });
  });

  test("Flaming Sphere validates damage then yields to the next actor's Death Save frontier before mutation", () => {
    const initial = spellBattle({
      preparedSpells: [spellRecord(flamingSphereUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 3 }],
      extraTargetIds: [deathSaveFrontierActorId],
      extraTargetHp: 0,
      extraTargetMaxHp: 12,
    });
    const castAct = spellAct({
      session: initial,
      spellId: flamingSphereUnitId,
      slotLevel: 2,
    });
    const cast = requireResolved(
      resolveBattleSubject({
        state: initial.state,
        subject: castAct.subject,
        fills: [
          flamingSphereAreaFill(
            requireHole(castAct.initialHoles, "spellAreaChoice"),
          ),
        ],
      }),
    );
    const targetTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const saveAct = flamingSphereEndTurnAct(
      battleRuntimeSessionForTest({
        ...initial,
        state: targetTurn.state,
      }),
      spellTargetId,
    );
    const save = requireHole(saveAct.initialHoles, "savingThrowOutcome");
    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: saveAct.subject,
        fills: [singleTargetSavingThrowOutcomeFill(save, spellCasterId, true)],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Movable zone saving throw outcome must match the triggering target.",
    });

    const failedSave = singleTargetSavingThrowOutcomeFill(
      save,
      spellTargetId,
      false,
    );
    const needsDamage = resolveBattleSubject({
      state: targetTurn.state,
      subject: saveAct.subject,
      fills: [failedSave],
    });
    const damage = requireResultHole(needsDamage, "rolledDice");
    const damageFill = damageRollFillWithGroups(damage, [[2, 3]]);
    const resolved = requireNeedsHoles(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: saveAct.subject,
        fills: [failedSave, damageFill],
      }),
    );
    expect(resolved).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "deathSavingThrow" })],
    });
    expect(resolved.state.combatants.get(spellTargetId)?.hp).toBe(
      targetTurn.state.combatants.get(spellTargetId)?.hp,
    );
  });

  test("Flaming Sphere reposition becomes stale when Concentration ends", () => {
    const initial = spellBattle({
      preparedSpells: [spellRecord(flamingSphereUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 3 }],
    });
    const castAct = spellAct({
      session: initial,
      spellId: flamingSphereUnitId,
      slotLevel: 2,
    });
    const cast = requireResolved(
      resolveBattleSubject({
        state: initial.state,
        subject: castAct.subject,
        fills: [
          flamingSphereAreaFill(
            requireHole(castAct.initialHoles, "spellAreaChoice"),
          ),
        ],
      }),
    );
    const targetTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const saveAct = flamingSphereEndTurnAct(
      battleRuntimeSessionForTest({ ...initial, state: targetTurn.state }),
      spellTargetId,
    );
    const targetSave = singleTargetSavingThrowOutcomeFill(
      requireHole(saveAct.initialHoles, "savingThrowOutcome"),
      spellTargetId,
      true,
    );
    const needsDamage = resolveBattleSubject({
      state: targetTurn.state,
      subject: saveAct.subject,
      fills: [targetSave],
    });
    const afterTarget = requireResolved(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: saveAct.subject,
        fills: [
          targetSave,
          damageRollFillWithGroups(
            requireResultHole(needsDamage, "rolledDice"),
            [[2, 3]],
          ),
        ],
      }),
    );
    const reposition = flamingSphereRepositionAct(
      battleRuntimeSessionForTest({ ...initial, state: afterTarget.state }),
      spellCasterId,
    );
    expect(
      resolveBattleSubject({
        state: breakBattleConcentration(afterTarget.state, spellCasterId),
        subject: reposition.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Movable zone reposition is no longer available.",
    });
  });

  test("Moonbeam validates damage then yields to the next actor's Death Save frontier before mutation", () => {
    const initial = spellBattle({
      preparedSpells: [spellRecord(moonbeamUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "druid", level: 3 }],
      targetHp: 30,
      targetMaxHp: 30,
      extraTargetIds: [deathSaveFrontierActorId],
      extraTargetHp: 0,
      extraTargetMaxHp: 12,
    });
    const castAct = spellAct({
      session: initial,
      spellId: moonbeamUnitId,
      slotLevel: 2,
    });
    const cast = requireResolved(
      resolveBattleSubject({
        state: initial.state,
        subject: castAct.subject,
        fills: [
          moonbeamAreaFill(
            requireHole(castAct.initialHoles, "spellAreaChoice"),
          ),
        ],
      }),
    );
    const targetTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const saveAct = moonbeamEndTurnSaveAct(
      battleRuntimeSessionForTest({ ...initial, state: targetTurn.state }),
    );
    const save = requireHole(saveAct.initialHoles, "savingThrowOutcome");
    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: saveAct.subject,
        fills: [singleTargetSavingThrowOutcomeFill(save, spellCasterId, true)],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Movable zone saving throw outcome must match the triggering target.",
    });

    const failedSave = singleTargetSavingThrowOutcomeFill(
      save,
      spellTargetId,
      false,
    );
    const needsDamage = resolveBattleSubject({
      state: targetTurn.state,
      subject: saveAct.subject,
      fills: [failedSave],
    });
    const damage = requireResultHole(needsDamage, "rolledDice");
    const damageFill = damageRollFillWithGroups(damage, [[2, 3]]);
    const resolved = requireNeedsHoles(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: saveAct.subject,
        fills: [failedSave, damageFill],
      }),
    );
    expect(resolved).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "deathSavingThrow" })],
    });
    expect(resolved.state.combatants.get(spellTargetId)?.hp).toBe(
      targetTurn.state.combatants.get(spellTargetId)?.hp,
    );
  });

  test("Moonbeam repeats no damage in the same turn but still returns End Turn holes", () => {
    const initial = spellBattle({
      preparedSpells: [spellRecord(moonbeamUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "druid", level: 3 }],
      targetHp: 30,
      targetMaxHp: 30,
      extraTargetIds: [deathSaveFrontierActorId],
      extraTargetHp: 0,
      extraTargetMaxHp: 12,
    });
    const castAct = spellAct({
      session: initial,
      spellId: moonbeamUnitId,
      slotLevel: 2,
    });
    const cast = requireResolved(
      resolveBattleSubject({
        state: initial.state,
        subject: castAct.subject,
        fills: [
          moonbeamAreaFill(
            requireHole(castAct.initialHoles, "spellAreaChoice"),
          ),
        ],
      }),
    );
    const targetTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const endTurnAct = moonbeamEndTurnSaveAct(
      battleRuntimeSessionForTest({ ...initial, state: targetTurn.state }),
    );
    const entersSubject = {
      ...endTurnAct.subject,
      trigger: "entersArea" as const,
    };
    const entersSave = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: entersSubject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const entersSaveFill = singleTargetSavingThrowOutcomeFill(
      entersSave,
      spellTargetId,
      true,
    );
    const entersDamage = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: entersSubject,
        fills: [entersSaveFill],
      }),
      "rolledDice",
    );
    const entered = requireResolved(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: entersSubject,
        fills: [
          entersSaveFill,
          damageRollFillWithGroups(entersDamage, [[2, 3]]),
        ],
      }),
    );

    const repeated = requireNeedsHoles(
      resolveBattleSubject({
        state: entered.state,
        subject: endTurnAct.subject,
        fills: [],
      }),
    );
    expect(repeated).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "deathSavingThrow" })],
    });
    expect(repeated.state.combatants.get(spellTargetId)?.hp).toBe(
      entered.state.combatants.get(spellTargetId)?.hp,
    );
  });

  test("Moonbeam Cylinder exit is stale after its suppression is cleared", () => {
    const initial = startBattleSessionRight({
      battleId: battleId("persistent-spatial-moonbeam-exit"),
      combatants: [
        characterSeed({
          combatantId: spellTargetId,
          displayName: "Shape-shifted Target",
          initiative: 20,
          classLevels: [{ className: "druid", level: 2 }],
          resources: [{ unit: unitLibrary.requireUnit("druid_wild_shape") }],
          druidWildShapeAvailableForms: [
            statBlockCatalog.requireStatBlock("stat_block_riding_horse"),
          ],
          currentHp: 30,
          maxHp: 30,
        }),
        characterSeed({
          combatantId: spellCasterId,
          displayName: "Moonbeam Caster",
          initiative: 10,
          classLevels: [{ className: "druid", level: 3 }],
          spellcasting: {
            ...wizardSpellcasting({
              preparedSpells: [spellRecord(moonbeamUnitId)],
              spellSlots: [{ spellLevel: 2, count: 1 }],
            }),
            sourceClassName: "druid",
          },
        }),
      ],
    });
    const wildShapeAct = discoverBattleActs(initial).find(
      (candidate) =>
        candidate.subject.tag === "druidWildShape" &&
        candidate.subject.action === "assumeForm" &&
        battleActDruidWildShapePresentation(candidate)?.formStatBlockId ===
          "stat_block_riding_horse",
    );
    if (
      wildShapeAct === undefined ||
      wildShapeAct.subject.tag !== "druidWildShape"
    ) {
      throw new Error("Expected a discovered Wild Shape assume-form act.");
    }
    const initialAssume = resolveBattleSubject({
      state: initial.state,
      subject: wildShapeAct.subject,
      fills: [],
    });
    const equipmentDispositionHole =
      initialAssume.tag === "needsHoles"
        ? initialAssume.holes.find(
            (hole) => hole.kind === "wildShapeEquipmentDisposition",
          )
        : undefined;
    const assumed =
      equipmentDispositionHole === undefined
        ? initialAssume
        : resolveBattleSubject({
            state: initial.state,
            subject: wildShapeAct.subject,
            fills: [
              {
                kind: "wildShapeEquipmentDisposition",
                holeId: equipmentDispositionHole.holeId,
                value: {
                  formLimbs: { kind: "canHandleObjects" },
                  choices: equipmentDispositionHole.candidates.map((item) => ({
                    item,
                    disposition: "merges" as const,
                  })),
                },
              },
            ],
          });
    const casterTurn = requireResolved(
      endTurn({
        state: requireResolved(assumed).state,
        actorId: spellTargetId,
      }),
    );
    const castAct = spellAct({
      session: battleRuntimeSessionForTest({
        ...initial,
        state: casterTurn.state,
      }),
      spellId: moonbeamUnitId,
      slotLevel: 2,
    });
    const cast = requireResolved(
      resolveBattleSubject({
        state: casterTurn.state,
        subject: castAct.subject,
        fills: [
          moonbeamAreaFill(
            requireHole(castAct.initialHoles, "spellAreaChoice"),
          ),
        ],
      }),
    );
    const targetTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const endTurnAct = moonbeamEndTurnSaveAct(
      battleRuntimeSessionForTest({ ...initial, state: targetTurn.state }),
    );
    const appearsSubject = {
      ...endTurnAct.subject,
      trigger: "appearsInArea" as const,
    };
    const appearsSave = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: appearsSubject,
        fills: [],
      }),
      "savingThrowOutcome",
    );
    const appearsSaveFill = singleTargetSavingThrowOutcomeFill(
      appearsSave,
      spellTargetId,
      false,
    );
    const appearsDamage = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: appearsSubject,
        fills: [appearsSaveFill],
      }),
      "rolledDice",
    );
    const suppressed = requireResolved(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: appearsSubject,
        fills: [
          appearsSaveFill,
          damageRollFillWithGroups(appearsDamage, [[2, 3]]),
        ],
      }),
    );
    const exitAct = discoverBattleActs(
      battleRuntimeSessionForTest({ ...initial, state: suppressed.state }),
    ).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "moonbeamCylinderExit" &&
        candidate.subject.actorId === spellTargetId,
    );
    if (exitAct === undefined) {
      throw new Error("Expected a discovered Moonbeam Cylinder exit act.");
    }
    const exited = requireResolved(
      resolveBattleSubject({
        state: suppressed.state,
        subject: exitAct.subject,
        fills: [],
      }),
    );
    expect(
      resolveBattleSubject({
        state: exited.state,
        subject: exitAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Moonbeam shape-shift suppression is no longer active.",
    });
  });

  test("Grease continues to the next actor's Death Save frontier after its hazard save", () => {
    const initial = spellBattle({
      preparedSpells: [spellRecord(greaseUnitId)],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      extraTargetIds: [deathSaveFrontierActorId],
      extraTargetHp: 0,
      extraTargetMaxHp: 12,
    });
    const castAct = spellAct({
      session: initial,
      spellId: greaseUnitId,
      slotLevel: 1,
    });
    const cast = requireResolved(
      resolveBattleSubject({
        state: initial.state,
        subject: castAct.subject,
        fills: [
          greaseSavingThrowOutcomeFill(
            requireHole(castAct.initialHoles, "savingThrowOutcome"),
            [],
          ),
        ],
      }),
    );
    const targetTurn = requireResolved(
      endTurn({ state: cast.state, actorId: spellCasterId }),
    );
    const saveAct = greaseGroundHazardEndTurnAct(
      battleRuntimeSessionForTest({ ...initial, state: targetTurn.state }),
      spellTargetId,
    );
    const save = requireHole(saveAct.initialHoles, "savingThrowOutcome");
    const greaseResult = resolveBattleSubject({
      state: targetTurn.state,
      subject: saveAct.subject,
      fills: [singleTargetSavingThrowOutcomeFill(save, spellTargetId, false)],
    });
    expect(greaseResult).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "deathSavingThrow" })],
    });
  });
});
