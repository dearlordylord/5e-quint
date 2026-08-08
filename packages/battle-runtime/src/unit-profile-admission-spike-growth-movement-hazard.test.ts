// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-SPIKE-GROWTH-MOVEMENT-HAZARD-RUNTIME spike_growth
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-spike-growth-movement-hazard
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SPIKE_GROWTH_MOVEMENT_HAZARD
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { describe, expect, test } from "vitest";
import { tickDurationEffects } from "./battle-reducer/turn-boundary-lifecycle.ts";
import {
  attackDamageDispositionFill,
  damageRollFillWithGroups,
  movementFill,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  commandApproachMovementFill,
  commandFleeMovementFill,
  jumpMovementReplacementAct,
  spellAct,
  spellHoleInvocation,
  spikeGrowthAreaFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  DieRollResult,
  discoverBattleActCandidates,
  elapsedTimeTicks,
  endTurn,
  Hp,
  movementFeet,
  resolveBattleSubject,
  spellSlotInvocationRef,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
  type BattleFill,
  type BattleSubject,
  type BattleState,
} from "./unit-profile-admission.test-support.ts";
import {
  orcRelentlessEnduranceUnitId,
  spellCasterId,
  spellTargetId,
  spikeGrowthAreaId,
  spikeGrowthUnitId,
  unitLibrary,
  webAreaId,
  webUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { EMPOWERED_SPELL_REROLL_UNSUPPORTED_DAMAGE_ROLL_OWNER_MESSAGE } from "./battle-reducer/spell-reroll-issues.ts";
import {
  battleActiveEffectExecutionRefForTest,
  battleAreaId,
  battleProcedureExecutionRefForTest,
  concentrationSavingThrowFill,
  fogCloudAreaFill,
  requireCharacterSpellProcedureRefForTest,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import type { BattleProcedureExecutionRef } from "./identity.ts";

const spikeGrowthDurationTicks = elapsedTimeTicks(100);

function spikeGrowthTargetTurnState(
  input: {
    readonly targetHp?: number;
    readonly targetHasRelentlessEndurance?: boolean;
  } = {},
): {
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly state: BattleState;
} {
  const spell = spellRecord(spikeGrowthUnitId);
  const relentlessEnduranceUnit = input.targetHasRelentlessEndurance
    ? unitLibrary.requireUnit(orcRelentlessEnduranceUnitId)
    : undefined;
  const state = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    ...(relentlessEnduranceUnit === undefined
      ? {}
      : {
          targetResources: [{ unit: relentlessEnduranceUnit }],
          targetUnitRefs: [
            {
              unit: relentlessEnduranceUnit,
              supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
            },
          ],
        }),
  });
  const act = spellAct({
    session: state,
    spellId: spikeGrowthUnitId,
    slotLevel: 2,
  });
  const area = requireHole(act.initialHoles, "spellAreaChoice");
  const cast = resolveBattleSubject({
    state: state.state,
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
    sourceProcedureRef: act.subject.procedureRef,
    state: {
      ...targetTurn.state,
      combatants: new Map(targetTurn.state.combatants).set(spellTargetId, {
        ...target,
        hp: Hp(input.targetHp ?? 20),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    },
  };
}

function spikeGrowthAreaDifficultTerrain(
  sourceProcedureRef: BattleProcedureExecutionRef,
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
        sourceProcedureRef,
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
  sourceProcedureRef: BattleProcedureExecutionRef,
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
      areaDifficultTerrain: spikeGrowthAreaDifficultTerrain(
        sourceProcedureRef,
        input,
      ),
    },
  };
}

function resolveSpikeGrowthMovementDamage(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
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
          effectRef: battleActiveEffectExecutionRefForTest("command-pending"),
          sourceCombatantId: spellCasterId,
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(spikeGrowthUnitId),
          ),
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
      session: state,
      spellId: spikeGrowthUnitId,
      slotLevel: 2,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        spellCasterId,
        spellSlotInvocationRef(
          spikeGrowthUnitId,
          2,
          "spikeGrowthMovementHazard",
        ),
      ),
      mode: { tag: "cast" },
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    expect(area).toEqual(
      expect.objectContaining({
        label: "Spell area",
        area: { kind: "pointOriginSphere", radiusFeet: movementFeet(20) },
      }),
    );
    expect(spellHoleInvocation(state, [area])).toEqual(
      expect.objectContaining({
        procedure: "spikeGrowthMovementHazard",
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
      session: state,
      spellId: spikeGrowthUnitId,
      slotLevel: 2,
    });

    const area = requireHole(act.initialHoles, "spellAreaChoice");
    expect(spellHoleInvocation(state, [area])).toMatchObject({
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
      session: state,
      spellId: spikeGrowthUnitId,
      slotLevel: 2,
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");

    const resolved = resolveBattleSubject({
      state: state.state,
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
        sourceProcedureRef: expect.any(String),
        effectKind: "spellEffect",
      },
      activeEffects: [
        expect.objectContaining({
          kind: "spikeGrowthHazard",
          sourceProcedureRef: expect.any(String),
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
      session: state,
      spellId: spikeGrowthUnitId,
      slotLevel: 2,
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state: state.state,
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
                sourceProcedureRef: act.subject.procedureRef,
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
                  sourceProcedureRef: act.subject.procedureRef,
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
            sourceProcedureRef: act.subject.procedureRef,
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
                sourceProcedureRef: act.subject.procedureRef,
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

  test("movement damage requests and consumes the mover's Concentration save", () => {
    const spikeGrowth = spellRecord(spikeGrowthUnitId);
    const fogCloud = spellRecord("fog_cloud");
    const session = spellBattle({
      preparedSpells: [spikeGrowth],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetSpellcasting: wizardSpellcasting({
        preparedSpells: [fogCloud],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      }),
      targetHp: 20,
      targetMaxHp: 20,
    });
    const spikeGrowthAct = spellAct({
      session,
      spellId: spikeGrowthUnitId,
      slotLevel: 2,
    });
    const spikeGrowthCast = resolveBattleSubject({
      state: session.state,
      subject: spikeGrowthAct.subject,
      fills: [
        spikeGrowthAreaFill(
          requireHole(spikeGrowthAct.initialHoles, "spellAreaChoice"),
        ),
      ],
    });
    if (spikeGrowthCast.tag !== "resolved") {
      throw new Error("Expected Spike Growth cast to resolve.");
    }
    const fogCloudTurn = endTurn({
      state: spikeGrowthCast.state,
      actorId: spellCasterId,
    });
    if (fogCloudTurn.tag !== "resolved") {
      throw new Error("Expected Spike Growth caster End Turn to resolve.");
    }
    const fogCloudAct = spellAct({
      session: battleRuntimeSessionForTest({
        state: fogCloudTurn.state,
        context: session.context,
      }),
      spellId: "fog_cloud",
      slotLevel: 1,
    });
    const fogCloudCast = resolveBattleSubject({
      state: fogCloudTurn.state,
      subject: fogCloudAct.subject,
      fills: [
        fogCloudAreaFill(
          requireHole(fogCloudAct.initialHoles, "spellAreaChoice"),
          battleAreaId("spike-growth-mover-fog-cloud"),
        ),
      ],
    });
    if (fogCloudCast.tag !== "resolved") {
      throw new Error("Expected Fog Cloud cast to resolve.");
    }
    const casterTurn = endTurn({
      state: fogCloudCast.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected Fog Cloud caster End Turn to resolve.");
    }
    const movementTurn = endTurn({
      state: casterTurn.state,
      actorId: spellCasterId,
    });
    if (movementTurn.tag !== "resolved") {
      throw new Error("Expected Spike Growth caster End Turn to resolve.");
    }
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "move" as const,
    };
    const movement = requireResultHole(
      resolveBattleSubject({
        state: movementTurn.state,
        subject,
        fills: [],
      }),
      "movement",
    );
    const movementThroughHazard = movementFill(movement, {
      movementCostFeet: 15,
      provokedOpportunityAttacks: [],
      areaDifficultTerrain: spikeGrowthAreaDifficultTerrain(
        spikeGrowthAct.subject.procedureRef,
        {
          totalDistanceFeet: 10,
          difficultTerrainDistanceFeet: 5,
          damageDistanceFeet: 5,
        },
      ),
    });
    const pendingDamage = resolveBattleSubject({
      state: movementTurn.state,
      subject,
      fills: [movementThroughHazard],
    });
    const damage = requireResultHole(pendingDamage, "rolledDice");
    const damageFill = damageRollFillWithGroups(damage, [[1, 1]]);
    const pendingConcentration = resolveBattleSubject({
      state: movementTurn.state,
      subject,
      fills: [movementThroughHazard, damageFill],
    });
    const concentration = requireResultHole(
      pendingConcentration,
      "concentrationSavingThrow",
    );
    const resolved = resolveBattleSubject({
      state: movementTurn.state,
      subject,
      fills: [
        movementThroughHazard,
        damageFill,
        concentrationSavingThrowFill(concentration, true),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            hp: Hp(18),
            concentrating: true,
          }),
        ]),
      },
    });
  });

  test("spike growth movement damage can trigger Relentless Endurance", () => {
    const { sourceProcedureRef, state } = spikeGrowthTargetTurnState({
      targetHp: 2,
      targetHasRelentlessEndurance: true,
    });
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "move" as const,
    };
    const movement = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );
    const movementThroughHazard = movementFill(movement, {
      movementCostFeet: 15,
      provokedOpportunityAttacks: [],
      areaDifficultTerrain: spikeGrowthAreaDifficultTerrain(
        sourceProcedureRef,
        {
          totalDistanceFeet: 10,
          difficultTerrainDistanceFeet: 5,
          damageDistanceFeet: 5,
        },
      ),
    });
    const pendingDamage = resolveBattleSubject({
      state,
      subject,
      fills: [movementThroughHazard],
    });
    const damageHole = requireResultHole(pendingDamage, "rolledDice");
    const damage = damageRollFillWithGroups(damageHole, [[1, 1]]);
    const pendingDisposition = resolveBattleSubject({
      state,
      subject,
      fills: [movementThroughHazard, damage],
    });
    const disposition = requireResultHole(
      pendingDisposition,
      "attackDamageDisposition",
    );
    const replacement = disposition.choices.find(
      (choice) => choice.kind === "zeroHitPointReplacement",
    );
    if (replacement === undefined) {
      throw new Error("Expected Relentless Endurance disposition.");
    }

    const resolved = resolveBattleSubject({
      state,
      subject,
      fills: [
        movementThroughHazard,
        damage,
        attackDamageDispositionFill(disposition, replacement),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            hp: Hp(1),
            conditions: expect.not.arrayContaining(["unconscious"]),
            movement: expect.objectContaining({
              spentFeet: movementFeet(15),
            }),
          }),
        ]),
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Spike Growth movement damage to resolve.");
    }
    const target = requireCombatant(resolved.state, spellTargetId);
    if (target.origin.kind !== "character") {
      throw new Error("Expected Relentless Endurance target character.");
    }
    expect(target.origin.resources).toContainEqual(
      expect.objectContaining({ usesRemaining: 0 }),
    );
  });

  test("movement rejects spike growth damage distance beyond represented area distance", () => {
    const spell = spellRecord(spikeGrowthUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: spikeGrowthUnitId,
      slotLevel: 2,
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state: state.state,
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
                  sourceProcedureRef: expect.any(String),
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
      session: state,
      spellId: spikeGrowthUnitId,
      slotLevel: 2,
    });
    const spikeArea = requireHole(spikeAct.initialHoles, "spellAreaChoice");
    const spikeCast = resolveBattleSubject({
      state: state.state,
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
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              String(webUnitId),
            ),
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
                sourceProcedureRef: spikeAct.subject.procedureRef,
                areaId: spikeGrowthAreaId,
                damageDistanceFeet: movementFeet(5),
              },
              {
                kind: "webAreaHazard",
                sourceCombatantId: spellTargetId,
                sourceProcedureRef: battleProcedureExecutionRefForTest(
                  String(webUnitId),
                ),
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
    const { sourceProcedureRef, state } = spikeGrowthTargetTurnState();
    const commandState = stateWithCommandPending(state, "approach");
    const subject = discoverBattleActCandidates(commandState).find(
      (act) =>
        act.subject.tag === "runtimeCommand" &&
        act.subject.command === "commandApproach",
    )?.subject;
    if (
      subject?.tag !== "runtimeCommand" ||
      subject.command !== "commandApproach"
    ) {
      throw new Error("Expected Command Approach act.");
    }
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
            provokedOpportunityAttacks: [],
          }),
          sourceProcedureRef,
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
    const { sourceProcedureRef, state } = spikeGrowthTargetTurnState();
    const commandState = stateWithCommandPending(state, "flee");
    const subject = discoverBattleActCandidates(commandState).find(
      (act) =>
        act.subject.tag === "runtimeCommand" &&
        act.subject.command === "commandFlee",
    )?.subject;
    if (
      subject?.tag !== "runtimeCommand" ||
      subject.command !== "commandFlee"
    ) {
      throw new Error("Expected Command Flee act.");
    }
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
          sourceProcedureRef,
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
    const { sourceProcedureRef, state } = spikeGrowthTargetTurnState();
    const target = requireCombatant(state, spellTargetId);
    const jumpState = {
      ...state,
      combatants: new Map(state.combatants).set(spellTargetId, {
        ...target,
        activeEffects: [
          ...target.activeEffects,
          {
            kind: "jumpMovementReplacement" as const,
            effectRef: battleActiveEffectExecutionRefForTest("spike-jump"),
            sourceCombatantId: spellCasterId,
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              String(spikeGrowthUnitId),
            ),
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
          areaDifficultTerrain: spikeGrowthAreaDifficultTerrain(
            sourceProcedureRef,
            {
              totalDistanceFeet: 10,
              difficultTerrainDistanceFeet: 5,
              damageDistanceFeet: 5,
            },
          ),
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
    const { sourceProcedureRef, state } = spikeGrowthTargetTurnState();
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
          areaDifficultTerrain: spikeGrowthAreaDifficultTerrain(
            sourceProcedureRef,
            {
              totalDistanceFeet: 10,
              difficultTerrainDistanceFeet: 5,
              damageDistanceFeet: 5,
            },
          ),
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
      session: state,
      spellId: spikeGrowthUnitId,
      slotLevel: 2,
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [spikeGrowthAreaFill(area)],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Spike Growth cast to resolve.");
    }

    const broken = resolveBattleSubject({
      state: cast.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endConcentration",
      },
      fills: [],
    });
    if (broken.tag !== "resolved") {
      throw new Error("Expected Spike Growth concentration to end.");
    }
    expect(requireCombatant(broken.state, spellCasterId).activeEffects).toEqual(
      [],
    );
    expect(broken.routeEvents).toEqual([
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "concentrationTeardown",
        holes: [],
        owner: "battleConcentration",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "concentrationTeardown",
        holes: [],
        owner: "battleActiveEffect",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "spatialEffect",
        holes: [],
        owner: "battleConcentration",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "spatialEffect",
        holes: [],
        owner: "battleAreaHazard",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "spatialEffect",
        holes: [],
        owner: "battleActiveEffect",
      },
    ]);
  });

  test("duration expiration removes the spike growth hazard and concentration at ten minutes", () => {
    const spell = spellRecord(spikeGrowthUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: spikeGrowthUnitId,
      slotLevel: 2,
    });
    const area = requireHole(act.initialHoles, "spellAreaChoice");
    const cast = resolveBattleSubject({
      state: state.state,
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
