// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-GUST-OF-WIND-LINE-RUNTIME gust_of_wind
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-gust-of-wind-line
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE
import { describe, expect, test } from "vitest";
import {
  movementFill,
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  gustOfWindLineDirectionChangeAct,
  gustOfWindLineDirectionChoiceFill,
  gustOfWindLineEndTurnSaveAct,
  gustOfWindLineSavingThrowOutcomeFill,
  spellAct,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  breakBattleConcentration,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  movementFeet,
  resolveBattleSubject,
  spellSlotInvocationRef,
  type BattleState,
} from "./unit-profile-admission-test-support.ts";
import {
  greaseAreaId,
  greaseUnitId,
  gustOfWindAreaId,
  gustOfWindEastDirectionId,
  gustOfWindNorthDirectionId,
  gustOfWindUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";

describe("L12G deterministic Gust of Wind Line admission", () => {
  test("gust of wind is admitted as a self-origin Line STR-save concentration spell", () => {
    const spell = spellRecord(gustOfWindUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({ state, spellId: gustOfWindUnitId, slotLevel: 2 });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(gustOfWindUnitId, 2, "gustOfWindLine"),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Gust of Wind self-origin Line Saving Throw outcomes",
        ability: "str",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation([savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "gustOfWindLine",
        spell,
        resource: { tag: "spellSlot", slotLevel: 2 },
        ability: "str",
        targeting: {
          kind: "selfOriginLine",
          lengthFeet: movementFeet(60),
          widthFeet: movementFeet(10),
        },
        durationTicks: elapsedTimeTicks(10),
        rangeFeet: movementFeet(0),
        pushDistanceFeet: movementFeet(15),
        movementCost: {
          multiplier: 2,
          appliesTo: "towardSource",
        },
      }),
    );
  });

  test("gust of wind admission requires the repeated end-turn Line save", () => {
    const base = spellRecord(gustOfWindUnitId);
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected Gust of Wind ongoing effect mechanics.");
    }
    const operations = base.mechanics.operations.filter(
      (operation) => operation.trigger.kind !== "on_creature_ends_turn_in_area",
    );
    if (operations.length === 0) {
      throw new Error("Expected retained Gust of Wind operations.");
    }
    const spell = {
      ...base,
      mechanics: {
        ...base.mechanics,
        operations: operations as [
          (typeof operations)[number],
          ...(typeof operations)[number][],
        ],
      },
    };
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });

    expect(
      discoverBattleActs(state).some(
        (act) =>
          act.subject.tag === "actionSpell" &&
          act.subject.invocation.procedure === "gustOfWindLine",
      ),
    ).toBe(false);
  });

  test("gust of wind admission uses Line shape instead of authored hole id", () => {
    const spell = gustOfWindWithLineHoleId("synthetic_line_for_admission");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({ state, spellId: gustOfWindUnitId, slotLevel: 2 });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");

    expect(spellHoleInvocation([savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "gustOfWindLine",
        targeting: {
          kind: "selfOriginLine",
          lengthFeet: movementFeet(60),
          widthFeet: movementFeet(10),
        },
      }),
    );
  });

  test("cast records the source-owned Line and Concentration state", () => {
    const cast = castGustOfWind([]);
    const caster = requireCombatant(cast.state, spellCasterId);

    expect(caster.concentration).toEqual({
      sourceSpellId: gustOfWindUnitId,
      effectKind: "spellEffect",
    });
    expect(caster.activeEffects).toEqual([
      expect.objectContaining({
        kind: "gustOfWindLine",
        sourceSpellId: gustOfWindUnitId,
        sourceCombatantId: spellCasterId,
        areaId: gustOfWindAreaId,
        directionId: gustOfWindNorthDirectionId,
        castTurn: {
          actorId: spellCasterId,
          round: 1,
        },
        line: {
          lengthFeet: movementFeet(60),
          widthFeet: movementFeet(10),
        },
        save: { ability: "str", dc: { kind: "caster_spell_save_dc" } },
        pushDistanceFeet: movementFeet(15),
        movementCost: {
          multiplier: 2,
          appliesTo: "towardSource",
        },
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(10),
        },
      }),
    ]);
  });

  test("failed appearance save requires table-supplied Line push facts", () => {
    const spell = spellRecord(gustOfWindUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({ state, spellId: gustOfWindUnitId, slotLevel: 2 });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          gustOfWindLineSavingThrowOutcomeFill(
            savingThrow,
            [{ targetId: spellTargetId, succeeded: false }],
            { creaturePushes: [] },
          ),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Gust of Wind push facts must cover every failed-save target.",
    });
  });

  test("end-turn save resolves at the End Turn boundary", () => {
    const cast = castGustOfWind([]);
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const endTurnAct = gustOfWindLineEndTurnSaveAct(targetTurn.state);
    const endTurnSave = requireHole(
      endTurnAct.initialHoles,
      "savingThrowOutcome",
    );

    const resolved = resolveBattleSubject({
      state: targetTurn.state,
      subject: endTurnAct.subject,
      fills: [
        gustOfWindLineSavingThrowOutcomeFill(endTurnSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { currentActorId: spellCasterId },
    });
  });

  test("movement closer to the caster through the Line spends two feet per foot", () => {
    const cast = castGustOfWind([]);
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const act = moveAct(targetTurn.state);
    const movement = requireHole(act.initialHoles, "movement");
    const resolved = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 10,
          provokedOpportunityAttacks: [],
          gustOfWindLineMovement: {
            kind: "gustOfWindLineMovement",
            sourceCombatantId: spellCasterId,
            sourceSpellId: gustOfWindUnitId,
            areaId: gustOfWindAreaId,
            directionId: gustOfWindNorthDirectionId,
            totalDistanceFeet: movementFeet(5),
            closerDistanceFeet: movementFeet(5),
          },
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            movement: expect.objectContaining({ spentFeet: 10 }),
          }),
        ]),
      },
    });
  });

  test("movement closer to the caster rejects mismatched Line movement cost", () => {
    const cast = castGustOfWind([]);
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const act = moveAct(targetTurn.state);
    const movement = requireHole(act.initialHoles, "movement");

    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: [
          movementFill(movement, {
            movementCostFeet: 5,
            provokedOpportunityAttacks: [],
            gustOfWindLineMovement: {
              kind: "gustOfWindLineMovement",
              sourceCombatantId: spellCasterId,
              sourceSpellId: gustOfWindUnitId,
              areaId: gustOfWindAreaId,
              directionId: gustOfWindNorthDirectionId,
              totalDistanceFeet: movementFeet(5),
              closerDistanceFeet: movementFeet(5),
            },
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Gust of Wind Line movement must spend total distance plus 1 extra foot for every foot moved closer to the caster through the Line.",
    });
  });

  test("movement cost composes Grease and Gust of Wind Line facts", () => {
    const cast = castGustOfWind([]);
    const greased = withGreaseGroundHazard(cast.state);
    const targetTurn = endTurn({
      state: greased,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const act = moveAct(targetTurn.state);
    const movement = requireHole(act.initialHoles, "movement");
    const resolved = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 15,
          provokedOpportunityAttacks: [],
          areaDifficultTerrain: {
            kind: "areaDifficultTerrain",
            sources: [
              {
                kind: "greaseGroundHazard",
                sourceCombatantId: spellCasterId,
                sourceSpellId: greaseUnitId,
                areaId: greaseAreaId,
              },
            ],
            totalDistanceFeet: movementFeet(5),
            difficultTerrainDistanceFeet: movementFeet(5),
          },
          gustOfWindLineMovement: {
            kind: "gustOfWindLineMovement",
            sourceCombatantId: spellCasterId,
            sourceSpellId: gustOfWindUnitId,
            areaId: gustOfWindAreaId,
            directionId: gustOfWindNorthDirectionId,
            totalDistanceFeet: movementFeet(5),
            closerDistanceFeet: movementFeet(5),
          },
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            movement: expect.objectContaining({ spentFeet: 15 }),
          }),
        ]),
      },
    });
  });

  test("caster can spend a Bonus Action to replace the active Line direction", () => {
    const cast = castGustOfWind([]);
    expect(
      discoverBattleActs(cast.state).some(
        (act) =>
          act.subject.tag === "runtimeCommand" &&
          act.subject.command === "gustOfWindLineDirectionChange",
      ),
    ).toBe(false);
    const laterTurn = advanceToCasterLaterTurn(cast.state);
    const directionAct = gustOfWindLineDirectionChangeAct(laterTurn);
    const directionHole = requireHole(
      directionAct.initialHoles,
      "gustOfWindLineDirectionChoice",
    );

    const resolved = resolveBattleSubject({
      state: laterTurn,
      subject: directionAct.subject,
      fills: [gustOfWindLineDirectionChoiceFill(directionHole)],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { bonusActionAvailable: false } },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Gust of Wind direction change to resolve.");
    }
    expect(gustOfWindLineEffect(resolved.state)).toEqual(
      expect.objectContaining({
        areaId: gustOfWindAreaId,
        directionId: gustOfWindEastDirectionId,
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(9),
        },
      }),
    );
  });

  test("breaking Concentration removes the active Line", () => {
    const cast = castGustOfWind([]);
    const ended = breakBattleConcentration(cast.state, spellCasterId);

    expect(requireCombatant(ended, spellCasterId)).toEqual(
      expect.objectContaining({
        concentration: null,
        activeEffects: [],
      }),
    );
  });
});

function castGustOfWind(
  outcomes: readonly {
    readonly targetId: typeof spellTargetId;
    readonly succeeded: boolean;
  }[],
) {
  const spell = spellRecord(gustOfWindUnitId);
  const state = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
  const act = spellAct({ state, spellId: gustOfWindUnitId, slotLevel: 2 });
  const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [gustOfWindLineSavingThrowOutcomeFill(savingThrow, outcomes)],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Gust of Wind cast to resolve.");
  }
  return resolved;
}

function gustOfWindWithLineHoleId(
  holeId: string,
): ReturnType<typeof spellRecord> {
  const base = spellRecord(gustOfWindUnitId);
  if (base.mechanics.family !== "ongoing_effect") {
    throw new Error("Expected Gust of Wind ongoing effect mechanics.");
  }
  const attachment = base.mechanics.attachment;
  const initialPhase = base.mechanics.initialPhase;
  if (
    attachment.kind !== "hole" ||
    initialPhase?.kind !== "save_gate" ||
    initialPhase.attachment.kind !== "hole"
  ) {
    throw new Error("Expected Gust of Wind Line hole mechanics.");
  }
  const operations = base.mechanics.operations.map((operation) => {
    const effect = operation.effect;
    return operation.trigger.kind === "on_creature_ends_turn_in_area" &&
      effect.kind === "save_gate" &&
      effect.attachment?.kind === "hole"
      ? ({
          ...operation,
          effect: {
            ...effect,
            attachment: { ...effect.attachment, holeId },
          },
        } as typeof operation)
      : operation;
  }) as unknown as typeof base.mechanics.operations;
  return {
    ...base,
    mechanics: {
      ...base.mechanics,
      attachment: { ...attachment, holeId },
      initialPhase: {
        ...initialPhase,
        attachment: { ...initialPhase.attachment, holeId },
      },
      operations,
    },
  } as ReturnType<typeof spellRecord>;
}

function withGreaseGroundHazard(state: BattleState): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...caster,
      activeEffects: [
        ...caster.activeEffects,
        {
          kind: "greaseGroundHazard" as const,
          sourceCombatantId: spellCasterId,
          sourceSpellId: greaseUnitId,
          areaId: greaseAreaId,
          save: {
            ability: "dex" as const,
            dc: { kind: "caster_spell_save_dc" as const },
          },
          expiresAt: {
            kind: "duration" as const,
            durationTicks: elapsedTimeTicks(10),
          },
        },
      ],
    }),
  };
}

function moveAct(state: BattleState) {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "move",
  );
  if (act === undefined) {
    throw new Error("Expected Movement act.");
  }
  return act;
}

function advanceToCasterLaterTurn(state: BattleState) {
  const targetTurn = endTurn({
    state,
    actorId: spellCasterId,
  });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected caster End Turn to resolve.");
  }
  const endTurnAct = gustOfWindLineEndTurnSaveAct(targetTurn.state);
  const endTurnSave = requireHole(
    endTurnAct.initialHoles,
    "savingThrowOutcome",
  );
  const casterNextTurn = resolveBattleSubject({
    state: targetTurn.state,
    subject: endTurnAct.subject,
    fills: [
      gustOfWindLineSavingThrowOutcomeFill(endTurnSave, [
        { targetId: spellTargetId, succeeded: true },
      ]),
    ],
  });
  if (casterNextTurn.tag !== "resolved") {
    throw new Error("Expected target End Turn in Gust of Wind to resolve.");
  }
  return casterNextTurn.state;
}

function gustOfWindLineEffect(state: BattleState) {
  const effect = requireCombatant(state, spellCasterId).activeEffects.find(
    (candidate) => candidate.kind === "gustOfWindLine",
  );
  if (effect === undefined) {
    throw new Error("Expected active Gust of Wind Line effect.");
  }
  return effect;
}
