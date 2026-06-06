// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-SPIKE-GROWTH-MOVEMENT-HAZARD-RUNTIME spike_growth
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-spike-growth-movement-hazard
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD
import { describe, expect, test } from "vitest";
import { tickDurationEffects } from "./battle-reducer/turn-end-movement.ts";
import {
  damageRollFillWithGroups,
  movementFill,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  commandApproachMovementFill,
  commandFleeMovementFill,
  jumpMovementReplacementAct,
  spellAct,
  spellHoleInvocation,
  spikeGrowthAreaFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  breakBattleConcentration,
  DieRollResult,
  elapsedTimeTicks,
  endTurn,
  Hp,
  movementFeet,
  resolveBattleSubject,
  spellId,
  spellSlotInvocationRef,
  type BattleFill,
  type BattleSubject,
  type BattleState,
} from "./unit-profile-admission-test-support.ts";
import {
  spellCasterId,
  spellTargetId,
  spikeGrowthAreaId,
  spikeGrowthUnitId,
  webAreaId,
  webUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import { EMPOWERED_SPELL_REROLL_UNSUPPORTED_DAMAGE_ROLL_OWNER_MESSAGE } from "./battle-reducer.ts";

const spikeGrowthDurationTicks = elapsedTimeTicks(100);

function spikeGrowthTargetTurnState(): {
  readonly spell: ReturnType<typeof spellRecord>;
  readonly state: BattleState;
} {
  const spell = spellRecord(spikeGrowthUnitId);
  const state = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
  const act = spellAct({
    state,
    spellId: spikeGrowthUnitId,
    slotLevel: 2,
  });
  const area = requireHole(act.initialHoles, "spellAreaChoice");
  const cast = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [spikeGrowthAreaFill(area)],
  });
  if (cast.tag !== "resolved") {
    throw new Error("Expected Spike Growth cast to resolve.");
  }
  const targetTurn = endTurn({
    state: cast.state,
    actorId: spellCasterId,
  });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected Spike Growth caster end turn to resolve.");
  }
  const target = requireCombatant(targetTurn.state, spellTargetId);
  return {
    spell,
    state: {
      ...targetTurn.state,
      combatants: new Map(targetTurn.state.combatants).set(spellTargetId, {
        ...target,
        hp: Hp(20),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    },
  };
}

function spikeGrowthAreaDifficultTerrain(
  spell: ReturnType<typeof spellRecord>,
  input: {
    readonly totalDistanceFeet: number;
    readonly difficultTerrainDistanceFeet: number;
    readonly damageDistanceFeet: number;
  },
): NonNullable<
  Extract<
    BattleFill,
    { readonly kind: "movement" }
  >["value"]["areaDifficultTerrain"]
> {
  return {
    kind: "areaDifficultTerrain",
    sources: [
      {
        kind: "spikeGrowthHazard",
        sourceCombatantId: spellCasterId,
        sourceSpellId: spell.id,
        areaId: spikeGrowthAreaId,
        damageDistanceFeet: movementFeet(input.damageDistanceFeet),
      },
    ],
    totalDistanceFeet: movementFeet(input.totalDistanceFeet),
    difficultTerrainDistanceFeet: movementFeet(
      input.difficultTerrainDistanceFeet,
    ),
  };
}

function withSpikeGrowthAreaDifficultTerrain(
  fill: Extract<BattleFill, { readonly kind: "movement" }>,
  spell: ReturnType<typeof spellRecord>,
  input: {
    readonly totalDistanceFeet: number;
    readonly difficultTerrainDistanceFeet: number;
    readonly damageDistanceFeet: number;
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    ...fill,
    value: {
      ...fill.value,
      areaDifficultTerrain: spikeGrowthAreaDifficultTerrain(spell, input),
    },
  };
}

function resolveSpikeGrowthMovementDamage(input: {
  readonly state: BattleState;
  readonly subject: Parameters<typeof resolveBattleSubject>[0]["subject"];
  readonly fills: readonly BattleFill[];
}): ReturnType<typeof resolveBattleSubject> {
  const pendingDamage = resolveBattleSubject(input);
  expect(pendingDamage).toMatchObject({
    tag: "needsHoles",
    holes: [expect.objectContaining({ kind: "rolledDice" })],
  });
  const damageHole = requireResultHole(pendingDamage, "rolledDice");
  return resolveBattleSubject({
    state: input.state,
    subject: input.subject,
    fills: [...input.fills, damageRollFillWithGroups(damageHole, [[1, 1]])],
  });
}

function expectSpikeGrowthDamageResolved(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly fills: readonly BattleFill[];
}): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const resolved = resolveSpikeGrowthMovementDamage(input);
  expect(resolved).toMatchObject({
    tag: "resolved",
    snapshot: {
      combatants: expect.arrayContaining([
        expect.objectContaining({
          combatantId: spellTargetId,
          hp: Hp(18),
        }),
      ]),
    },
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Spike Growth movement damage to resolve.");
  }
  return resolved;
}

function stateWithCommandPending(
  state: BattleState,
  option: "approach" | "flee",
): BattleState {
  const target = requireCombatant(state, spellTargetId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellTargetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects,
        {
          kind: "commandPending" as const,
          sourceCombatantId: spellCasterId,
          sourceSpellId: spikeGrowthUnitId,
          option,
          expiresAt: {
            kind: "endOfTurn" as const,
            combatantId: spellTargetId,
            round: state.initiative.round,
          },
        },
      ],
    }),
  };
}

describe("L12G deterministic Spike Growth movement-hazard admission", () => {
  test("spike growth is admitted as a ten-minute point-origin Sphere ground hazard", () => {
    const spell = spellRecord(spikeGrowthUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: spikeGrowthUnitId,
      slotLevel: 2,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        spikeGrowthUnitId,
        2,
        "spikeGrowthMovementHazard",
      ),
      mode: { tag: "cast" },
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    expect(area).toEqual(
      expect.objectContaining({
        label: "Spike Growth area",
        area: { kind: "pointOriginSphere", radiusFeet: movementFeet(20) },
      }),
    );
    expect(spellHoleInvocation([area])).toEqual(
      expect.objectContaining({
        procedure: "spikeGrowthMovementHazard",
        spell,
        resource: { tag: "spellSlot", slotLevel: 2 },
        targeting: { kind: "pointOriginSphere", radiusFeet: movementFeet(20) },
        durationTicks: spikeGrowthDurationTicks,
        rangeFeet: movementFeet(150),
        damagePerFeet: movementFeet(5),
      }),
    );
  });

  test("movement-hazard subset admission is shape-based and tolerates deferred operations", () => {
    const spell = spellRecord(spikeGrowthUnitId);
    const mechanics = spell.mechanics;
    if (mechanics.family !== "ongoing_effect") {
      throw new Error("Expected Spike Growth ongoing effect mechanics.");
    }
    const deferredOperation = mechanics.operations[0];
    if (deferredOperation === undefined) {
      throw new Error("Expected Spike Growth operation.");
    }
    const spellWithDeferredRecognitionShape = {
      ...spell,
      mechanics: {
        ...mechanics,
        attachment:
          mechanics.attachment.kind === "hole"
            ? {
                ...mechanics.attachment,
                holeId: "synthetic_spike_growth_area",
              }
            : mechanics.attachment,
        operations: [...mechanics.operations, deferredOperation] as const,
      },
    };
    const state = spellBattle({
      preparedSpells: [spellWithDeferredRecognitionShape],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: spikeGrowthUnitId,
      slotLevel: 2,
    });

    const area = requireHole(act.initialHoles, "spellAreaChoice");
    expect(spellHoleInvocation([area])).toMatchObject({
      procedure: "spikeGrowthMovementHazard",
      targeting: { kind: "pointOriginSphere", radiusFeet: movementFeet(20) },
    });
  });

  test("cast records the source-owned spike growth area and concentration", () => {
    const spell = spellRecord(spikeGrowthUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: spikeGrowthUnitId,
      slotLevel: 2,
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [spikeGrowthAreaFill(area)],
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: { actionResources: [] },
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Spike Growth cast to resolve.");
    }
    expect(requireCombatant(resolved.state, spellCasterId)).toMatchObject({
      concentration: {
        sourceSpellId: spikeGrowthUnitId,
        effectKind: "spellEffect",
      },
      activeEffects: [
        expect.objectContaining({
          kind: "spikeGrowthHazard",
          sourceSpellId: spikeGrowthUnitId,
          sourceCombatantId: spellCasterId,
          areaId: spikeGrowthAreaId,
          damage: {
            expr: { dice: 2, dieSize: 4 },
            damageType: "piercing",
          },
          damagePerFeet: movementFeet(5),
          expiresAt: {
            kind: "concentration",
            combatantId: spellCasterId,
            durationTicks: spikeGrowthDurationTicks,
          },
        }),
      ],
    });
  });

  test("movement through spike growth projects terrain cost and per-5-foot damage", () => {
    const spell = spellRecord(spikeGrowthUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: spikeGrowthUnitId,
      slotLevel: 2,
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [spikeGrowthAreaFill(area)],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Spike Growth cast to resolve.");
    }
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Spike Growth caster end turn to resolve.");
    }

    const target = requireCombatant(targetTurn.state, spellTargetId);
    const movementState = {
      ...targetTurn.state,
      combatants: new Map(targetTurn.state.combatants).set(spellTargetId, {
        ...target,
        hp: Hp(20),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    };
    const moveSubject = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "move" as const,
    };
    const moveAct = resolveBattleSubject({
      state: movementState,
      subject: moveSubject,
      fills: [],
    });
    const movement = requireResultHole(moveAct, "movement");
    const pendingDamage = resolveBattleSubject({
      state: movementState,
      subject: moveSubject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 15,
          provokedOpportunityAttacks: [],
          areaDifficultTerrain: {
            kind: "areaDifficultTerrain",
            sources: [
              {
                kind: "spikeGrowthHazard",
                sourceCombatantId: spellCasterId,
                sourceSpellId: spell.id,
                areaId: spikeGrowthAreaId,
                damageDistanceFeet: movementFeet(5),
              },
            ],
            totalDistanceFeet: movementFeet(10),
            difficultTerrainDistanceFeet: movementFeet(5),
          },
        }),
      ],
    });
    expect(pendingDamage).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "rolledDice" })],
    });
    const damageHole = requireResultHole(pendingDamage, "rolledDice");
    expect(
      resolveBattleSubject({
        state: movementState,
        subject: moveSubject,
        fills: [
          movementFill(movement, {
            movementCostFeet: 15,
            provokedOpportunityAttacks: [],
            areaDifficultTerrain: {
              kind: "areaDifficultTerrain",
              sources: [
                {
                  kind: "spikeGrowthHazard",
                  sourceCombatantId: spellCasterId,
                  sourceSpellId: spell.id,
                  areaId: spikeGrowthAreaId,
                  damageDistanceFeet: movementFeet(5),
                },
              ],
              totalDistanceFeet: movementFeet(10),
              difficultTerrainDistanceFeet: movementFeet(5),
            },
          }),
          damageRollFillWithGroups(damageHole, [[1, 1]]),
          damageRollFillWithGroups(damageHole, [[1, 1]]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Move received a fill that does not match a pending Spike Growth movement damage hole.",
    });
    const movementThroughHazardFill = movementFill(movement, {
      movementCostFeet: 15,
      provokedOpportunityAttacks: [],
      areaDifficultTerrain: {
        kind: "areaDifficultTerrain",
        sources: [
          {
            kind: "spikeGrowthHazard",
            sourceCombatantId: spellCasterId,
            sourceSpellId: spell.id,
            areaId: spikeGrowthAreaId,
            damageDistanceFeet: movementFeet(5),
          },
        ],
        totalDistanceFeet: movementFeet(10),
        difficultTerrainDistanceFeet: movementFeet(5),
      },
    });
    const spikeGrowthDamageFill = damageRollFillWithGroups(damageHole, [
      [1, 1],
    ]);
    expect(
      resolveBattleSubject({
        state: movementState,
        subject: moveSubject,
        fills: [
          movementThroughHazardFill,
          {
            ...spikeGrowthDamageFill,
            spellDamageReroll: {
              kind: "reroll",
              effectKind: "damage_dice_reroll",
              dice: [
                {
                  groupIndex: 0,
                  resultIndex: 0,
                  original: DieRollResult(1),
                  replacement: DieRollResult(2),
                },
              ],
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: EMPOWERED_SPELL_REROLL_UNSUPPORTED_DAMAGE_ROLL_OWNER_MESSAGE,
    });
    const resolved = resolveBattleSubject({
      state: movementState,
      subject: moveSubject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 15,
          provokedOpportunityAttacks: [],
          areaDifficultTerrain: {
            kind: "areaDifficultTerrain",
            sources: [
              {
                kind: "spikeGrowthHazard",
                sourceCombatantId: spellCasterId,
                sourceSpellId: spell.id,
                areaId: spikeGrowthAreaId,
                damageDistanceFeet: movementFeet(5),
              },
            ],
            totalDistanceFeet: movementFeet(10),
            difficultTerrainDistanceFeet: movementFeet(5),
          },
        }),
        damageRollFillWithGroups(damageHole, [[1, 1]]),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            hp: Hp(18),
            movement: expect.objectContaining({
              spentFeet: movementFeet(15),
            }),
          }),
        ]),
      },
    });
  });

  test("movement rejects spike growth damage distance beyond represented area distance", () => {
    const spell = spellRecord(spikeGrowthUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: spikeGrowthUnitId,
      slotLevel: 2,
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [spikeGrowthAreaFill(area)],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Spike Growth cast to resolve.");
    }
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Spike Growth caster end turn to resolve.");
    }
    const moveSubject = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "move" as const,
    };
    const movement = requireResultHole(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: moveSubject,
        fills: [],
      }),
      "movement",
    );

    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: moveSubject,
        fills: [
          movementFill(movement, {
            movementCostFeet: 25,
            provokedOpportunityAttacks: [],
            areaDifficultTerrain: {
              kind: "areaDifficultTerrain",
              sources: [
                {
                  kind: "spikeGrowthHazard",
                  sourceCombatantId: spellCasterId,
                  sourceSpellId: spell.id,
                  areaId: spikeGrowthAreaId,
                  damageDistanceFeet: movementFeet(20),
                },
              ],
              totalDistanceFeet: movementFeet(20),
              difficultTerrainDistanceFeet: movementFeet(5),
            },
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Spike Growth movement damage distance cannot exceed Difficult Terrain distance.",
    });
  });

  test("movement keeps Difficult Terrain cost noncumulative across overlapping hazards", () => {
    const spell = spellRecord(spikeGrowthUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const spikeAct = spellAct({
      state,
      spellId: spikeGrowthUnitId,
      slotLevel: 2,
    });
    const spikeArea = requireHole(spikeAct.initialHoles, "spellAreaChoice");
    const spikeCast = resolveBattleSubject({
      state,
      subject: spikeAct.subject,
      fills: [spikeGrowthAreaFill(spikeArea)],
    });
    if (spikeCast.tag !== "resolved") {
      throw new Error("Expected Spike Growth cast to resolve.");
    }
    const targetTurn = endTurn({
      state: spikeCast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster end turn to resolve.");
    }
    const target = requireCombatant(targetTurn.state, spellTargetId);
    const movementState = {
      ...targetTurn.state,
      combatants: new Map(targetTurn.state.combatants).set(spellTargetId, {
        ...target,
        hp: Hp(20),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
        activeEffects: [
          ...target.activeEffects,
          {
            kind: "webRestraintHazard" as const,
            sourceCombatantId: spellTargetId,
            sourceSpellId: webUnitId,
            areaId: webAreaId,
            sideFeet: movementFeet(20),
            save: {
              ability: "dex" as const,
              dc: { kind: "caster_spell_save_dc" as const },
            },
            entrySavedThisTurn: [],
            startTurnSavedThisTurn: [],
            expiresAt: {
              kind: "concentration" as const,
              combatantId: spellTargetId,
              durationTicks: elapsedTimeTicks(600),
            },
          },
        ],
      }),
    };
    const moveSubject = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "move" as const,
    };
    const movement = requireResultHole(
      resolveBattleSubject({
        state: movementState,
        subject: moveSubject,
        fills: [],
      }),
      "movement",
    );
    const pendingDamage = resolveBattleSubject({
      state: movementState,
      subject: moveSubject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 15,
          provokedOpportunityAttacks: [],
          areaDifficultTerrain: {
            kind: "areaDifficultTerrain",
            sources: [
              {
                kind: "spikeGrowthHazard",
                sourceCombatantId: spellCasterId,
                sourceSpellId: spell.id,
                areaId: spikeGrowthAreaId,
                damageDistanceFeet: movementFeet(5),
              },
              {
                kind: "webAreaHazard",
                sourceCombatantId: spellTargetId,
                sourceSpellId: webUnitId,
                areaId: webAreaId,
              },
            ],
            totalDistanceFeet: movementFeet(10),
            difficultTerrainDistanceFeet: movementFeet(5),
          },
        }),
      ],
    });
    expect(pendingDamage).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "rolledDice" })],
    });
  });

  test("Command Approach movement through spike growth applies movement damage", () => {
    const { spell, state } = spikeGrowthTargetTurnState();
    const commandState = stateWithCommandPending(state, "approach");
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "commandApproach" as const,
      sourceCombatantId: spellCasterId,
      sourceSpellId: spellId(spikeGrowthUnitId),
    } satisfies Extract<
      BattleSubject,
      { readonly tag: "runtimeCommand"; readonly command: "commandApproach" }
    >;
    const movement = requireResultHole(
      resolveBattleSubject({ state: commandState, subject, fills: [] }),
      "movement",
    );

    const resolved = expectSpikeGrowthDamageResolved({
      state: commandState,
      subject,
      fills: [
        withSpikeGrowthAreaDifficultTerrain(
          commandApproachMovementFill(movement, {
            movementCostFeet: 15,
            movedWithinFiveFeetOfCaster: false,
          }),
          spell,
          {
            totalDistanceFeet: 10,
            difficultTerrainDistanceFeet: 5,
            damageDistanceFeet: 5,
          },
        ),
      ],
    });

    expect(
      requireCombatant(resolved.state, spellTargetId).activeEffects,
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "commandPending" }),
      ]),
    );
    expect(requireCombatant(resolved.state, spellTargetId)).toMatchObject({
      movementSpentFeet: movementFeet(15),
    });
  });

  test("Command Flee movement through spike growth applies movement damage before ending turn", () => {
    const { spell, state } = spikeGrowthTargetTurnState();
    const commandState = stateWithCommandPending(state, "flee");
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "commandFlee" as const,
      sourceCombatantId: spellCasterId,
      sourceSpellId: spellId(spikeGrowthUnitId),
    } satisfies Extract<
      BattleSubject,
      { readonly tag: "runtimeCommand"; readonly command: "commandFlee" }
    >;
    const movement = requireResultHole(
      resolveBattleSubject({ state: commandState, subject, fills: [] }),
      "movement",
    );

    const resolved = expectSpikeGrowthDamageResolved({
      state: commandState,
      subject,
      fills: [
        withSpikeGrowthAreaDifficultTerrain(
          commandFleeMovementFill(movement, {
            movementCostFeet: 30,
            provokedOpportunityAttacks: [],
          }),
          spell,
          {
            totalDistanceFeet: 25,
            difficultTerrainDistanceFeet: 5,
            damageDistanceFeet: 5,
          },
        ),
      ],
    });

    expect(
      requireCombatant(resolved.state, spellTargetId).activeEffects,
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "commandPending" }),
      ]),
    );
    expect(requireCombatant(resolved.state, spellTargetId)).toMatchObject({
      movementSpentFeet: movementFeet(30),
    });
  });

  test("Jump movement replacement through spike growth applies movement damage", () => {
    const { spell, state } = spikeGrowthTargetTurnState();
    const target = requireCombatant(state, spellTargetId);
    const jumpState = {
      ...state,
      combatants: new Map(state.combatants).set(spellTargetId, {
        ...target,
        activeEffects: [
          ...target.activeEffects,
          {
            kind: "jumpMovementReplacement" as const,
            sourceCombatantId: spellCasterId,
            sourceSpellId: spikeGrowthUnitId,
            movementCostFeet: movementFeet(10),
            maxJumpDistanceFeet: movementFeet(30),
            usedThisTurn: false,
            expiresAt: {
              kind: "duration" as const,
              durationTicks: elapsedTimeTicks(10),
            },
          },
        ],
      }),
    };
    const jumpAct = jumpMovementReplacementAct(jumpState);
    const movement = requireHole(jumpAct.initialHoles, "movement");

    const resolved = expectSpikeGrowthDamageResolved({
      state: jumpState,
      subject: jumpAct.subject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 15,
          provokedOpportunityAttacks: [],
          jumpMovementReplacement: {
            kind: "jumpMovementReplacement",
            distanceFeet: movementFeet(30),
            landing: {
              kind: "legalLanding",
              difficultTerrainAcrobatics: "notRequired",
            },
          },
          areaDifficultTerrain: spikeGrowthAreaDifficultTerrain(spell, {
            totalDistanceFeet: 10,
            difficultTerrainDistanceFeet: 5,
            damageDistanceFeet: 5,
          }),
        }),
      ],
    });

    expect(
      requireCombatant(resolved.state, spellTargetId).activeEffects,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "jumpMovementReplacement",
          usedThisTurn: true,
        }),
      ]),
    );
  });

  test("Readied Movement release through spike growth applies movement damage", () => {
    const { spell, state } = spikeGrowthTargetTurnState();
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "releaseReadiedMovement" as const,
      readiedMovementActorId: spellTargetId,
    };
    const readiedState = {
      ...state,
      readiedMovements: new Map(state.readiedMovements).set(spellTargetId, {
        trigger: "attackHit" as const,
        expiresAt: {
          kind: "startOfTurn" as const,
          combatantId: spellTargetId,
        },
      }),
      interruptStack: [
        ...state.interruptStack,
        {
          kind: "interruptCheckpoint" as const,
          frame: {
            trigger: "opportunityAttack" as const,
            moverId: spellCasterId,
            threats: [],
            eligibleResponders: [spellTargetId],
            offeredResponders: [],
            choices: [],
            activeInterrupt: {
              responderId: spellTargetId,
              subject,
              fills: [],
            },
            continuation: {
              kind: "resolved" as const,
              subject,
            },
          },
        },
      ],
    } satisfies BattleState;
    const readiedInitial = resolveBattleSubject({
      state: readiedState,
      subject,
      fills: [],
    });
    const movement = requireResultHole(readiedInitial, "movement");

    const resolved = expectSpikeGrowthDamageResolved({
      state: readiedState,
      subject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 15,
          provokedOpportunityAttacks: [],
          areaDifficultTerrain: spikeGrowthAreaDifficultTerrain(spell, {
            totalDistanceFeet: 10,
            difficultTerrainDistanceFeet: 5,
            damageDistanceFeet: 5,
          }),
        }),
      ],
    });

    expect(resolved.state.readiedMovements.has(spellTargetId)).toBe(false);
    expect(requireCombatant(resolved.state, spellTargetId)).toMatchObject({
      movementSpentFeet: movementFeet(15),
    });
  });

  test("breaking concentration removes the spike growth hazard", () => {
    const spell = spellRecord(spikeGrowthUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: spikeGrowthUnitId,
      slotLevel: 2,
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [spikeGrowthAreaFill(area)],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Spike Growth cast to resolve.");
    }

    const broken = breakBattleConcentration(cast.state, spellCasterId);
    expect(requireCombatant(broken, spellCasterId).activeEffects).toEqual([]);
  });

  test("duration expiration removes the spike growth hazard and concentration at ten minutes", () => {
    const spell = spellRecord(spikeGrowthUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: spikeGrowthUnitId,
      slotLevel: 2,
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [spikeGrowthAreaFill(area)],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Spike Growth cast to resolve.");
    }
    expect(requireCombatant(cast.state, spellCasterId).activeEffects).toEqual([
      expect.objectContaining({
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: spikeGrowthDurationTicks,
        },
      }),
    ]);

    const caster = requireCombatant(cast.state, spellCasterId);
    const expiring = {
      ...cast.state,
      combatants: new Map(cast.state.combatants).set(spellCasterId, {
        ...caster,
        activeEffects: caster.activeEffects.map((effect) =>
          effect.kind === "spikeGrowthHazard"
            ? {
                ...effect,
                expiresAt: {
                  ...effect.expiresAt,
                  durationTicks: elapsedTimeTicks(1),
                },
              }
            : effect,
        ),
      }),
    };
    const expired = {
      ...expiring,
      combatants: tickDurationEffects(expiring.combatants).value,
    };

    expect(requireCombatant(expired, spellCasterId).activeEffects).toEqual([]);
    expect(requireCombatant(expired, spellCasterId).concentration).toBeNull();
  });
});
