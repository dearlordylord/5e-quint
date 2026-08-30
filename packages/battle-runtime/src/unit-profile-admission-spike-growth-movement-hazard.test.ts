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
  interruptDecisionFill,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  executeCompelledApproachMovementFill,
  executeCompelledFleeMovementFill,
  bonusSpellAct,
  fixedCostMovementReplacementAct,
  jumpSpellTargetListFill,
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
  resolveBattleInterrupt,
  spellSlotInvocationRef,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
  type BattleFill,
  type BattleActiveEffect,
  type BattleSubject,
  type BattleState,
} from "./unit-profile-admission.test-support.ts";
import {
  orcRelentlessEnduranceUnitId,
  jumpUnitId,
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
  battleEffectExecutionRefForTest,
  attackExecutionSelectionForSubjectForTest,
  battleAreaId,
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectForTest,
  concentrationSavingThrowFill,
  persistentAreaTraitAreaFill,
  requireCharacterSpellProcedureRefForTest,
  readyTriggerDescriptionForTest,
  wizardSpellcasting,
  characterAttackSubjectForTest,
} from "./battle-runtime.test-support.ts";

type SpikeGrowthHazardEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "areaMovementDistanceDamage" }
>;

const spikeGrowthDurationTicks = elapsedTimeTicks(100);

function spikeGrowthTargetTurnState(
  input: {
    readonly targetHp?: number;
    readonly targetHasRelentlessEndurance?: boolean;
  } = {},
): {
  readonly hazard: SpikeGrowthHazardEffect;
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
  const hazard = requireSpikeGrowthHazard(targetTurn.state);
  return {
    hazard,
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

function areaMovementDistanceDamageAreaDifficultTerrain(
  hazard: SpikeGrowthHazardEffect,
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
        kind: "areaMovementDistanceDamage",
        effectRef: hazard.effectRef,
        sourceCombatantId: spellCasterId,
        sourceProcedureRef: hazard.sourceProcedureRef,
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
  hazard: SpikeGrowthHazardEffect,
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
      areaDifficultTerrain: areaMovementDistanceDamageAreaDifficultTerrain(
        hazard,
        input,
      ),
    },
  };
}

function requireSpikeGrowthHazard(state: BattleState): SpikeGrowthHazardEffect {
  const hazard = requireCombatant(state, spellCasterId).activeEffects.find(
    (effect) => effect.kind === "areaMovementDistanceDamage",
  );
  if (hazard === undefined) {
    throw new Error("Expected active Spike Growth hazard.");
  }
  return hazard;
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
          kind: "compelledNextTurnBehavior" as const,
          effectRef: battleEffectExecutionRefForTest("command-pending"),
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
          "areaMovementDistanceDamage",
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
        procedure: "areaMovementDistanceDamage",
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
      procedure: "areaMovementDistanceDamage",
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
          kind: "areaMovementDistanceDamage",
          sourceProcedureRef: expect.any(String),
          sourceCombatantId: spellCasterId,
          areaId: spikeGrowthAreaId,
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
    const hazard = requireSpikeGrowthHazard(movementState);
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
                kind: "areaMovementDistanceDamage",
                effectRef: hazard.effectRef,
                sourceCombatantId: spellCasterId,
                sourceProcedureRef: hazard.sourceProcedureRef,
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
                  kind: "areaMovementDistanceDamage",
                  effectRef: hazard.effectRef,
                  sourceCombatantId: spellCasterId,
                  sourceProcedureRef: hazard.sourceProcedureRef,
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
        "Move received a fill that does not match a pending area movement-distance damage movement damage hole.",
    });
    const movementThroughHazardFill = movementFill(movement, {
      movementCostFeet: 15,
      provokedOpportunityAttacks: [],
      areaDifficultTerrain: {
        kind: "areaDifficultTerrain",
        sources: [
          {
            kind: "areaMovementDistanceDamage",
            effectRef: hazard.effectRef,
            sourceCombatantId: spellCasterId,
            sourceProcedureRef: hazard.sourceProcedureRef,
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
                kind: "areaMovementDistanceDamage",
                effectRef: hazard.effectRef,
                sourceCombatantId: spellCasterId,
                sourceProcedureRef: hazard.sourceProcedureRef,
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
        persistentAreaTraitAreaFill(
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
    const hazard = requireSpikeGrowthHazard(movementTurn.state);
    const movementThroughHazard = movementFill(movement, {
      movementCostFeet: 15,
      provokedOpportunityAttacks: [],
      areaDifficultTerrain: areaMovementDistanceDamageAreaDifficultTerrain(
        hazard,
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
    const { hazard, state } = spikeGrowthTargetTurnState({
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
      areaDifficultTerrain: areaMovementDistanceDamageAreaDifficultTerrain(
        hazard,
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
    const hazard = requireSpikeGrowthHazard(targetTurn.state);
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
                  kind: "areaMovementDistanceDamage",
                  effectRef: hazard.effectRef,
                  sourceCombatantId: spellCasterId,
                  sourceProcedureRef: hazard.sourceProcedureRef,
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
        "area movement-distance damage movement damage distance cannot exceed Difficult Terrain distance.",
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
    const movementStateWithoutWeb = {
      ...targetTurn.state,
      combatants: new Map(targetTurn.state.combatants).set(spellTargetId, {
        ...target,
        hp: Hp(20),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    };
    const movementState = battleStateWithAllocatedEffectForTest({
      state: movementStateWithoutWeb,
      ownerId: spellTargetId,
      effect: {
        kind: "persistentAreaSaveConditionEscape",
        sourceCombatantId: spellTargetId,
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String(webUnitId),
        ),
        areaId: webAreaId,
        entrySavedThisTurn: [],
        startTurnSavedThisTurn: [],
        expiresAt: {
          kind: "concentration",
          combatantId: spellTargetId,
          durationTicks: elapsedTimeTicks(600),
        },
      },
    });
    const spikeHazard = requireSpikeGrowthHazard(movementState);
    const webHazard = requireCombatant(
      movementState,
      spellTargetId,
    ).activeEffects.find(
      (effect) => effect.kind === "persistentAreaSaveConditionEscape",
    );
    if (webHazard === undefined) {
      throw new Error("Expected allocated Web hazard.");
    }
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
                kind: "areaMovementDistanceDamage",
                effectRef: spikeHazard.effectRef,
                sourceCombatantId: spellCasterId,
                sourceProcedureRef: spikeHazard.sourceProcedureRef,
                areaId: spikeGrowthAreaId,
                damageDistanceFeet: movementFeet(5),
              },
              {
                kind: "persistentAreaSaveConditionEscape",
                effectRef: webHazard.effectRef,
                sourceCombatantId: spellTargetId,
                sourceProcedureRef: webHazard.sourceProcedureRef,
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
    const { hazard, state } = spikeGrowthTargetTurnState();
    const commandState = stateWithCommandPending(state, "approach");
    const subject = discoverBattleActCandidates(commandState).find(
      (act) =>
        act.subject.tag === "runtimeCommand" &&
        act.subject.command === "executeCompelledApproach",
    )?.subject;
    if (
      subject?.tag !== "runtimeCommand" ||
      subject.command !== "executeCompelledApproach"
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
          executeCompelledApproachMovementFill(movement, {
            movementCostFeet: 15,
            movedWithinFiveFeetOfCaster: false,
            provokedOpportunityAttacks: [],
          }),
          hazard,
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
        expect.objectContaining({ kind: "compelledNextTurnBehavior" }),
      ]),
    );
    expect(requireCombatant(resolved.state, spellTargetId)).toMatchObject({
      movementSpentFeet: movementFeet(15),
    });
  });

  test("Command Flee movement through spike growth applies movement damage before ending turn", () => {
    const { hazard, state } = spikeGrowthTargetTurnState();
    const commandState = stateWithCommandPending(state, "flee");
    const subject = discoverBattleActCandidates(commandState).find(
      (act) =>
        act.subject.tag === "runtimeCommand" &&
        act.subject.command === "executeCompelledFlee",
    )?.subject;
    if (
      subject?.tag !== "runtimeCommand" ||
      subject.command !== "executeCompelledFlee"
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
          executeCompelledFleeMovementFill(movement, {
            movementCostFeet: 30,
            provokedOpportunityAttacks: [],
          }),
          hazard,
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
        expect.objectContaining({ kind: "compelledNextTurnBehavior" }),
      ]),
    );
    expect(requireCombatant(resolved.state, spellTargetId)).toMatchObject({
      movementSpentFeet: movementFeet(30),
    });
  });

  test("Jump movement replacement through spike growth applies movement damage", () => {
    const jump = spellRecord(jumpUnitId);
    const spikeGrowth = spellRecord(spikeGrowthUnitId);
    const session = spellBattle({
      preparedSpells: [jump, spikeGrowth],
      spellSlots: [
        { spellLevel: 1, count: 1 },
        { spellLevel: 2, count: 1 },
      ],
    });
    const jumpCastAct = bonusSpellAct({
      session,
      spellId: jumpUnitId,
      slotLevel: 1,
    });
    const jumpTargets = requireHole(
      jumpCastAct.initialHoles,
      "spellTargetList",
    );
    const jumpCast = resolveBattleSubject({
      state: session.state,
      subject: jumpCastAct.subject,
      fills: [
        jumpSpellTargetListFill(jumpTargets, spellCasterId, jumpUnitId, [
          spellTargetId,
        ]),
      ],
    });
    if (jumpCast.tag !== "resolved") {
      throw new Error("Expected Jump cast to resolve.");
    }
    const firstTargetTurn = endTurn({
      state: jumpCast.state,
      actorId: spellCasterId,
    });
    if (firstTargetTurn.tag !== "resolved") {
      throw new Error("Expected first target turn after Jump.");
    }
    const nextCasterTurn = endTurn({
      state: firstTargetTurn.state,
      actorId: spellTargetId,
    });
    if (nextCasterTurn.tag !== "resolved") {
      throw new Error("Expected next caster turn after Jump.");
    }
    const spikeGrowthSession = battleRuntimeSessionForTest({
      ...session,
      state: nextCasterTurn.state,
    });
    const spikeGrowthAct = spellAct({
      session: spikeGrowthSession,
      spellId: spikeGrowthUnitId,
      slotLevel: 2,
    });
    const spikeGrowthArea = requireHole(
      spikeGrowthAct.initialHoles,
      "spellAreaChoice",
    );
    const spikeGrowthCast = resolveBattleSubject({
      state: nextCasterTurn.state,
      subject: spikeGrowthAct.subject,
      fills: [spikeGrowthAreaFill(spikeGrowthArea)],
    });
    if (spikeGrowthCast.tag !== "resolved") {
      throw new Error("Expected Spike Growth cast to resolve after Jump.");
    }
    const targetTurn = endTurn({
      state: spikeGrowthCast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected target turn after Spike Growth.");
    }
    const target = requireCombatant(targetTurn.state, spellTargetId);
    const jumpState = {
      ...targetTurn.state,
      combatants: new Map(targetTurn.state.combatants).set(spellTargetId, {
        ...target,
        hp: Hp(20),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    };
    const hazard = requireSpikeGrowthHazard(jumpState);
    const jumpAct = fixedCostMovementReplacementAct(jumpState);
    const movement = requireHole(jumpAct.initialHoles, "movement");

    const resolved = expectSpikeGrowthDamageResolved({
      state: jumpState,
      subject: jumpAct.subject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 15,
          provokedOpportunityAttacks: [],
          fixedCostMovementReplacement: {
            kind: "fixedCostMovementReplacement",
            distanceFeet: movementFeet(30),
            landing: {
              kind: "legalLanding",
              difficultTerrainAcrobatics: "notRequired",
            },
          },
          areaDifficultTerrain: areaMovementDistanceDamageAreaDifficultTerrain(
            hazard,
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
          kind: "fixedCostMovementReplacement",
          usedThisTurn: true,
        }),
      ]),
    );
  });

  test("Readied Movement release through spike growth applies movement damage", () => {
    const { hazard, state } = spikeGrowthTargetTurnState();
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "releaseReadiedMovement" as const,
      readiedMovementActorId: spellTargetId,
    };
    const readiedState = {
      ...state,
      readiedResponses: new Map(state.readiedResponses).set(spellTargetId, {
        trigger: readyTriggerDescriptionForTest("the enemy attacks"),
        response: { kind: "movement" as const },
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
          areaDifficultTerrain: areaMovementDistanceDamageAreaDifficultTerrain(
            hazard,
            {
              totalDistanceFeet: 10,
              difficultTerrainDistanceFeet: 5,
              damageDistanceFeet: 5,
            },
          ),
        }),
      ],
    });

    expect(resolved.state.readiedResponses.has(spellTargetId)).toBe(false);
    expect(requireCombatant(resolved.state, spellTargetId)).toMatchObject({
      movementSpentFeet: movementFeet(0),
    });
  });

  test("declined Opportunity Attack remains handled across a Spike Growth movement damage hole", () => {
    const { hazard, state } = spikeGrowthTargetTurnState({
      targetHp: 2,
      targetHasRelentlessEndurance: true,
    });
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "move" as const,
    };
    const movementHole = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "movement",
    );
    const movement = movementFill(movementHole, {
      movementCostFeet: 15,
      provokedOpportunityAttacks: [
        {
          reactorId: spellCasterId,
          distanceFeet: movementFeet(5),
          ...attackExecutionSelectionForSubjectForTest(
            characterAttackSubjectForTest(
              state,
              spellCasterId,
              "Unarmed Strike",
            ),
          ),
        },
      ],
      areaDifficultTerrain: areaMovementDistanceDamageAreaDifficultTerrain(
        hazard,
        {
          totalDistanceFeet: 10,
          difficultTerrainDistanceFeet: 5,
          damageDistanceFeet: 5,
        },
      ),
    });
    const awaitingOpportunity = resolveBattleSubject({
      state,
      subject,
      fills: [movement],
    });
    const decision = requireResultHole(
      awaitingOpportunity,
      "interruptDecision",
    );
    if (awaitingOpportunity.tag !== "needsHoles") {
      throw new Error("Expected Opportunity Attack decision.");
    }
    const awaitingDamage = resolveBattleInterrupt({
      state: awaitingOpportunity.state,
      fill: interruptDecisionFill(decision, {
        kind: "decline",
        responderId: spellCasterId,
      }),
    });
    expect(awaitingDamage).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "rolledDice" })],
      state: {
        subjectResolutionPhase: {
          kind: "subjectContinuation",
          handledInterruptTrigger: "opportunityAttack",
        },
      },
    });
    const damage = requireResultHole(awaitingDamage, "rolledDice");
    if (awaitingDamage.tag !== "needsHoles") {
      throw new Error("Expected Spike Growth movement damage hole.");
    }
    const awaitingDisposition = resolveBattleSubject({
      state: awaitingDamage.state,
      subject,
      fills: [movement, damageRollFillWithGroups(damage, [[1, 1]])],
    });
    expect(awaitingDisposition).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "attackDamageDisposition" })],
      state: {
        subjectResolutionPhase: {
          kind: "subjectContinuation",
          handledInterruptTrigger: "opportunityAttack",
        },
      },
    });
    const disposition = requireResultHole(
      awaitingDisposition,
      "attackDamageDisposition",
    );
    const replacement = disposition.choices.find(
      (choice) => choice.kind === "zeroHitPointReplacement",
    );
    if (replacement === undefined) {
      throw new Error("Expected Relentless Endurance disposition.");
    }
    if (awaitingDisposition.tag !== "needsHoles") {
      throw new Error("Expected zero-hit-point replacement choice.");
    }
    const resolved = resolveBattleSubject({
      state: awaitingDisposition.state,
      subject,
      fills: [
        movement,
        damageRollFillWithGroups(damage, [[1, 1]]),
        attackDamageDispositionFill(disposition, replacement),
      ],
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      movements: [
        expect.objectContaining({
          moverId: spellTargetId,
          movementCostFeet: movementFeet(15),
        }),
      ],
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
          effect.kind === "areaMovementDistanceDamage"
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
