// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-cloudkill-area-hazard
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.CLOUDKILL_AREA_HAZARD_LIFECYCLE
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import { Schema } from "effect";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

import cloudkillInput from "../../surface/content/cloudkill.json";
import { battleAreaId, battleId, type CombatantId } from "./identity.ts";
import type {
  BattleActiveEffect,
  BattleCloudkillMovementHole,
  BattleStartTurnOccurrenceOrderHole,
  BattleState,
} from "./battle-state-execution.ts";
import {
  BattleFillSchema,
  BattleHoleSchema,
} from "./battle-reducer/battle-codecs.ts";
import {
  cloudkillAreaId,
  cloudkillUnitId,
  greaseAreaId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  cloudkillAreaFill,
  singleTargetSavingThrowOutcomeFill,
  spellAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  combatantId,
  elapsedTimeTicks,
  endTurn,
  movementFeet,
  resolveBattleInterrupt,
  resolveBattleSubject,
} from "./unit-profile-admission.test-support.ts";
import {
  damageRollFillWithGroups,
  interruptDecisionFill,
  requireHole,
  requireResultHole,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  attackRollFill,
  battleActiveEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  concentrationSavingThrowFill,
  characterSeed,
  damageRollFill,
  DieRollResult,
  monsterResourceStatBlock,
  reactionChoiceWithSubject,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
} from "./battle-runtime.test-support.ts";
import {
  readyTargetRayOfFrost,
  spellBattleWithTargetRayOfFrost,
} from "./unit-profile-admission-spell-battle.test-support.ts";

const cloudkillSecondaryTargetId = combatantId("cloudkill-secondary-target");

function withSecondCloudkillMovement(state: BattleState): BattleState {
  for (const [combatantId, combatant] of state.combatants) {
    const effect = combatant.activeEffects.find(
      (
        candidate,
      ): candidate is Extract<
        BattleActiveEffect,
        { readonly kind: "cloudkillAreaHazard" }
      > => candidate.kind === "cloudkillAreaHazard",
    );
    if (effect === undefined) continue;
    return {
      ...state,
      combatants: new Map(state.combatants).set(combatantId, {
        ...combatant,
        activeEffects: [
          ...combatant.activeEffects,
          {
            ...effect,
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              "second-cloudkill-movement-occurrence",
            ),
            areaId: battleAreaId("second-cloudkill-movement-area"),
          },
        ],
      }),
    };
  }
  throw new Error("Expected an active Cloudkill effect.");
}

function withGreaseGroundHazard(state: BattleState): BattleState {
  const source = state.combatants.get(spellCasterId);
  if (source === undefined) {
    throw new Error("Expected the persistent-spell source.");
  }
  const effect = {
    kind: "greaseGroundHazard",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      "cloudkill-composition-grease",
    ),
    sourceCombatantId: spellCasterId,
    areaId: greaseAreaId,
    heightenedSpellTargetDisadvantage: null,
    save: { ability: "dex", dc: { kind: "caster_spell_save_dc" } },
    expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
  } as const satisfies BattleActiveEffect;
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...source,
      activeEffects: [...source.activeEffects, effect],
    }),
  };
}

function withSourceStartTurnDamage(
  state: BattleState,
  sourceKey = "cloudkill-simultaneous-start-turn-order",
): BattleState {
  const source = state.combatants.get(spellCasterId);
  if (source === undefined) {
    throw new Error("Expected the Cloudkill source.");
  }
  const effect = {
    kind: "spellTurnStartDamageAndSave",
    source: "turnBoundaryEffectLifecycle",
    sourceProcedureRef: battleProcedureExecutionRefForTest(sourceKey),
    sourceCombatantId: spellTargetId,
    damage: { expr: { dice: 1, dieSize: 4 }, damageType: "fire" },
    save: {
      ability: "con",
      dc: { kind: "caster_spell_save_dc" },
      successEnds: "spell",
    },
    expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
  } as const satisfies BattleActiveEffect;
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...source,
      activeEffects: [...source.activeEffects, effect],
    }),
  };
}

function withSourceTurnStartTemporaryHitPoints(
  state: BattleState,
  input: {
    readonly sourceKey?: string;
    readonly amount?: number;
    readonly persistWithoutConcentration?: boolean;
    readonly concentrationCombatantId?: CombatantId;
  } = {},
): BattleState {
  const source = state.combatants.get(spellCasterId);
  if (source === undefined) {
    throw new Error("Expected the Cloudkill source.");
  }
  const effect = {
    kind: "turnStartTemporaryHitPoints",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      input.sourceKey ??
        "cloudkill-simultaneous-turn-start-temporary-hit-points",
    ),
    sourceCombatantId: spellTargetId,
    amount: input.amount ?? 3,
    expiresAt: input.persistWithoutConcentration
      ? { kind: "duration", durationTicks: elapsedTimeTicks(10) }
      : {
          kind: "concentration",
          combatantId: input.concentrationCombatantId ?? spellTargetId,
        },
  } as const satisfies BattleActiveEffect;
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...source,
      activeEffects: [...source.activeEffects, effect],
    }),
  };
}

function withCloudkillOwnedTurnStartTemporaryHitPoints(
  state: BattleState,
  amount: number,
): BattleState {
  const source = state.combatants.get(spellCasterId);
  const cloudkill = source?.activeEffects.find(
    (effect) => effect.kind === "cloudkillAreaHazard",
  );
  if (source === undefined || cloudkill === undefined) {
    throw new Error("Expected the Cloudkill source effect.");
  }
  const effect = {
    kind: "turnStartTemporaryHitPoints",
    sourceProcedureRef: cloudkill.sourceProcedureRef,
    sourceCombatantId: spellCasterId,
    amount,
    expiresAt: { kind: "concentration", combatantId: spellCasterId },
  } as const satisfies BattleActiveEffect;
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...source,
      activeEffects: [...source.activeEffects, effect],
    }),
  };
}

function withUnavailableSourceRecharge(state: BattleState): {
  readonly state: BattleState;
  readonly resourcePoolRef: import("./identity.ts").BattleResourcePoolExecutionRef;
} {
  const fixture = startBattleRight({
    battleId: battleId("cloudkill-source-recharge-fixture"),
    combatants: [
      statBlockCreatureInit({
        combatantId: spellCasterId,
        initiative: 20,
        statBlock: monsterResourceStatBlock(),
      }),
      characterSeed({ combatantId: spellTargetId, initiative: 10 }),
    ],
  });
  const fixtureSource = fixture.combatants.get(spellCasterId);
  const source = state.combatants.get(spellCasterId);
  if (fixtureSource?.origin.kind !== "statBlock" || source === undefined) {
    throw new Error("Expected the Cloudkill source recharge fixture.");
  }
  const rechargePool = fixtureSource.origin.execution.resourcePools.find(
    (pool) => pool.kind === "recharge",
  );
  if (rechargePool === undefined) {
    throw new Error("Expected a recharge resource pool.");
  }
  const origin = {
    ...fixtureSource.origin,
    execution: {
      ...fixtureSource.origin.execution,
      resourcePools: fixtureSource.origin.execution.resourcePools.map((pool) =>
        pool.kind === "recharge" ? { ...pool, available: false } : pool,
      ),
    },
  };
  return {
    resourcePoolRef: rechargePool.resourcePoolRef,
    state: {
      ...state,
      combatants: new Map(state.combatants).set(spellCasterId, {
        ...source,
        origin,
      }),
    },
  };
}

function withCommandGrovel(
  state: BattleState,
  actorId: CombatantId,
): {
  readonly state: BattleState;
  readonly effectRef: Extract<
    BattleActiveEffect,
    { readonly kind: "commandPending" }
  >["effectRef"];
} {
  const target = state.combatants.get(actorId);
  if (target === undefined) {
    throw new Error("Expected the Command Grovel target.");
  }
  const effectRef = battleActiveEffectExecutionRefForTest(
    "cloudkill-command-grovel",
  );
  const effect = {
    kind: "commandPending",
    effectRef,
    sourceCombatantId: spellCasterId,
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      "cloudkill-command-grovel",
    ),
    option: "grovel",
    expiresAt: {
      kind: "endOfTurn",
      combatantId: actorId,
      round: state.initiative.round,
    },
  } as const satisfies BattleActiveEffect;
  return {
    effectRef,
    state: {
      ...state,
      combatants: new Map(state.combatants).set(actorId, {
        ...target,
        activeEffects: [...target.activeEffects, effect],
      }),
    },
  };
}

function withCommandDrop(
  state: BattleState,
  actorId: CombatantId,
): {
  readonly state: BattleState;
  readonly effectRef: Extract<
    BattleActiveEffect,
    { readonly kind: "commandPending" }
  >["effectRef"];
} {
  const target = state.combatants.get(actorId);
  if (target === undefined) {
    throw new Error("Expected the Command Drop target.");
  }
  const effectRef = battleActiveEffectExecutionRefForTest(
    "cloudkill-command-drop",
  );
  const effect = {
    kind: "commandPending",
    effectRef,
    sourceCombatantId: spellCasterId,
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      "cloudkill-command-drop",
    ),
    option: "drop",
    expiresAt: {
      kind: "endOfTurn",
      combatantId: actorId,
      round: state.initiative.round,
    },
  } as const satisfies BattleActiveEffect;
  return {
    effectRef,
    state: {
      ...state,
      combatants: new Map(state.combatants).set(actorId, {
        ...target,
        activeEffects: [...target.activeEffects, effect],
      }),
    },
  };
}

function cloudkillMovementFill(
  hole: BattleCloudkillMovementHole,
  affectedCombatantIds: readonly CombatantId[],
) {
  return {
    kind: "cloudkillMovement" as const,
    holeId: hole.holeId,
    value: {
      affectedCombatantIds,
    },
  };
}

function startTurnOccurrenceOrderFill(
  hole: BattleStartTurnOccurrenceOrderHole,
  rank: (
    occurrence: BattleStartTurnOccurrenceOrderHole["occurrences"][number],
  ) => number,
) {
  const ordered = [...hole.occurrences].sort(
    (left, right) => rank(left) - rank(right),
  );
  const first = ordered[0];
  const second = ordered[1];
  if (first === undefined || second === undefined) {
    throw new Error("Expected at least two start-turn occurrences.");
  }
  return {
    kind: "startTurnOccurrenceOrder" as const,
    holeId: hole.holeId,
    value: {
      occurrenceIds: [
        first.occurrenceId,
        second.occurrenceId,
        ...ordered.slice(2).map(({ occurrenceId }) => occurrenceId),
      ] as const,
    },
  };
}

function castCloudkill(
  input: {
    readonly targetCanReadyRayOfFrost?: true;
    readonly targetHasLongsword?: true;
    readonly extraTargetIds?: readonly CombatantId[];
  } = {},
) {
  const spell = decodeUnitRecordSync(cloudkillInput);
  if (spell.kind !== "spell") {
    throw new Error("Expected the Cloudkill fixture to decode as a Spell.");
  }
  const session = input.targetCanReadyRayOfFrost
    ? spellBattleWithTargetRayOfFrost({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 5, count: 1 }],
        targetHp: 30,
        targetMaxHp: 30,
        ...(input.targetHasLongsword === true
          ? { targetAttack: zeroAbilityWeaponAttack("weapon_longsword") }
          : {}),
        ...(input.extraTargetIds === undefined
          ? {}
          : {
              extraTargetIds: input.extraTargetIds,
              extraTargetHp: 30,
              extraTargetMaxHp: 30,
            }),
      })
    : spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 5, count: 1 }],
        targetHp: 30,
        targetMaxHp: 30,
        ...(input.targetHasLongsword === true
          ? { targetAttack: zeroAbilityWeaponAttack("weapon_longsword") }
          : {}),
        ...(input.extraTargetIds === undefined
          ? {}
          : {
              extraTargetIds: input.extraTargetIds,
              extraTargetHp: 30,
              extraTargetMaxHp: 30,
            }),
      });
  const act = spellAct({
    session,
    spellId: cloudkillUnitId,
    slotLevel: 5,
  });
  const area = requireHole(act.initialHoles, "spellAreaChoice");
  const cast = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [cloudkillAreaFill(area)],
  });
  if (cast.tag !== "resolved") {
    throw new Error(`Expected Cloudkill to resolve: ${JSON.stringify(cast)}`);
  }
  return { session, state: cast.state };
}

function sourceTurnMovementBoundary() {
  const cast = castCloudkill();
  const targetTurn = endTurn({
    state: cast.state,
    actorId: spellCasterId,
  });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected the target turn to start.");
  }
  const movementFrontier = endTurn({
    state: targetTurn.state,
    actorId: spellTargetId,
  });
  if (movementFrontier.tag !== "needsHoles") {
    throw new Error("Expected the Cloudkill movement frontier.");
  }
  return {
    cast,
    boundaryState: targetTurn.state,
    movementHole: requireHole(movementFrontier.holes, "cloudkillMovement"),
  };
}

function activeCloudkill(state: BattleState) {
  const effect = [...state.combatants.values()]
    .flatMap((combatant) => combatant.activeEffects)
    .find((candidate) => candidate.kind === "cloudkillAreaHazard");
  if (effect?.kind !== "cloudkillAreaHazard") {
    throw new Error("Expected an active Cloudkill effect.");
  }
  return effect;
}

describe("Cloudkill source-turn movement", () => {
  test("lets the turn owner order simultaneous source-start damage and Cloudkill movement", () => {
    function resolveOrdering(choice: "cloudkillMovement" | "startTurnEffects") {
      const cast = castCloudkill();
      const targetTurn = endTurn({
        state: withSourceStartTurnDamage(cast.state),
        actorId: spellCasterId,
      });
      if (targetTurn.tag !== "resolved") {
        throw new Error("Expected the target turn to start.");
      }
      const orderFrontier = endTurn({
        state: targetTurn.state,
        actorId: spellTargetId,
      });
      expect(orderFrontier).toMatchObject({
        tag: "needsHoles",
        holes: [
          {
            kind: "startTurnOccurrenceOrder",
            actorId: spellCasterId,
            occurrences: [
              expect.objectContaining({ kind: "spellTurnStartDamageAndSave" }),
              expect.objectContaining({ kind: "cloudkillMovement" }),
            ],
          },
        ],
      });
      const orderFill = startTurnOccurrenceOrderFill(
        requireResultHole(orderFrontier, "startTurnOccurrenceOrder"),
        (occurrence) =>
          occurrence.kind === "cloudkillMovement"
            ? choice === "cloudkillMovement"
              ? 0
              : 1
            : choice === "cloudkillMovement"
              ? 1
              : 0,
      );
      const orderHole = requireResultHole(
        orderFrontier,
        "startTurnOccurrenceOrder",
      );
      const firstOccurrence = orderHole.occurrences[0];
      expect(
        endTurn({
          state: targetTurn.state,
          actorId: spellTargetId,
          fills: [
            {
              kind: "startTurnOccurrenceOrder",
              holeId: orderHole.holeId,
              value: {
                occurrenceIds: [
                  firstOccurrence.occurrenceId,
                  firstOccurrence.occurrenceId,
                ],
              },
            },
          ],
        }),
      ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
      expect(
        Schema.decodeUnknownSync(BattleHoleSchema)(
          Schema.encodeSync(BattleHoleSchema)(orderHole),
        ),
      ).toEqual(orderHole);
      expect(
        Schema.decodeUnknownSync(BattleFillSchema)(
          Schema.encodeSync(BattleFillSchema)(orderFill),
        ),
      ).toEqual(orderFill);
      if (choice === "cloudkillMovement") {
        return { state: targetTurn.state, fills: [orderFill] };
      }
      const startEffectFrontier = endTurn({
        state: targetTurn.state,
        actorId: spellTargetId,
        fills: [orderFill],
      });
      const startDamageFill = damageRollFillWithGroups(
        requireResultHole(startEffectFrontier, "rolledDice"),
        [[4]],
      );
      const concentrationFrontier = endTurn({
        state: targetTurn.state,
        actorId: spellTargetId,
        fills: [orderFill, startDamageFill],
      });
      const concentrationFill = concentrationSavingThrowFill(
        requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
        false,
      );
      const startSaveFrontier = endTurn({
        state: targetTurn.state,
        actorId: spellTargetId,
        fills: [orderFill, startDamageFill, concentrationFill],
      });
      const startSaveFill = singleTargetSavingThrowOutcomeFill(
        requireResultHole(startSaveFrontier, "savingThrowOutcome"),
        spellCasterId,
        false,
      );
      return {
        state: targetTurn.state,
        fills: [orderFill, startDamageFill, concentrationFill, startSaveFill],
      };
    }

    const startEffectsFirst = resolveOrdering("startTurnEffects");
    const startEffectsFirstResult = endTurn({
      state: startEffectsFirst.state,
      actorId: spellTargetId,
      fills: startEffectsFirst.fills,
    });
    expect(startEffectsFirstResult).toMatchObject({ tag: "resolved" });
    if (startEffectsFirstResult.tag !== "resolved") return;
    expect(
      [...startEffectsFirstResult.state.combatants.values()].some((combatant) =>
        combatant.activeEffects.some(
          (effect) => effect.kind === "cloudkillAreaHazard",
        ),
      ),
    ).toBe(false);
    expect(
      startEffectsFirstResult.state.combatants.get(spellTargetId)?.hp,
    ).toBe(30);

    const movementFirst = resolveOrdering("cloudkillMovement");
    const movementFrontier = endTurn({
      state: movementFirst.state,
      actorId: spellTargetId,
      fills: movementFirst.fills,
    });
    const movementFill = cloudkillMovementFill(
      requireResultHole(movementFrontier, "cloudkillMovement"),
      [spellTargetId],
    );
    const cloudkillSaveFrontier = endTurn({
      state: movementFirst.state,
      actorId: spellTargetId,
      fills: [...movementFirst.fills, movementFill],
    });
    const cloudkillSaveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(cloudkillSaveFrontier, "savingThrowOutcome"),
      spellTargetId,
      true,
    );
    const cloudkillDamageFrontier = endTurn({
      state: movementFirst.state,
      actorId: spellTargetId,
      fills: [...movementFirst.fills, movementFill, cloudkillSaveFill],
    });
    const cloudkillDamageFill = damageRollFillWithGroups(
      requireResultHole(cloudkillDamageFrontier, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    const sourceDamageFrontier = endTurn({
      state: movementFirst.state,
      actorId: spellTargetId,
      fills: [
        ...movementFirst.fills,
        movementFill,
        cloudkillSaveFill,
        cloudkillDamageFill,
      ],
    });
    const sourceDamageFill = damageRollFillWithGroups(
      requireResultHole(sourceDamageFrontier, "rolledDice"),
      [[4]],
    );
    const sourceConcentrationFrontier = endTurn({
      state: movementFirst.state,
      actorId: spellTargetId,
      fills: [
        ...movementFirst.fills,
        movementFill,
        cloudkillSaveFill,
        cloudkillDamageFill,
        sourceDamageFill,
      ],
    });
    const sourceConcentrationFill = concentrationSavingThrowFill(
      requireResultHole(
        sourceConcentrationFrontier,
        "concentrationSavingThrow",
      ),
      false,
    );
    const sourceSaveFrontier = endTurn({
      state: movementFirst.state,
      actorId: spellTargetId,
      fills: [
        ...movementFirst.fills,
        movementFill,
        cloudkillSaveFill,
        cloudkillDamageFill,
        sourceDamageFill,
        sourceConcentrationFill,
      ],
    });
    const sourceSaveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(sourceSaveFrontier, "savingThrowOutcome"),
      spellCasterId,
      false,
    );
    const movementFirstResult = endTurn({
      state: movementFirst.state,
      actorId: spellTargetId,
      fills: [
        ...movementFirst.fills,
        movementFill,
        cloudkillSaveFill,
        cloudkillDamageFill,
        sourceDamageFill,
        sourceConcentrationFill,
        sourceSaveFill,
      ],
    });
    expect(movementFirstResult).toMatchObject({ tag: "resolved" });
    if (movementFirstResult.tag !== "resolved") return;
    expect(movementFirstResult.state.combatants.get(spellTargetId)?.hp).toBe(
      28,
    );
    expect(
      [...movementFirstResult.state.combatants.values()].some((combatant) =>
        combatant.activeEffects.some(
          (effect) => effect.kind === "cloudkillAreaHazard",
        ),
      ),
    ).toBe(false);
  });

  test("orders each start-turn Temporary Hit Point grant against Cloudkill movement", () => {
    function resolveOrdering(choice: "cloudkillMovement" | "startTurnEffects") {
      const cast = castCloudkill();
      const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
      if (targetTurn.tag !== "resolved") {
        throw new Error("Expected the target turn to start.");
      }
      const boundaryState = withSourceTurnStartTemporaryHitPoints(
        targetTurn.state,
      );
      const orderFrontier = endTurn({
        state: boundaryState,
        actorId: spellTargetId,
      });
      const orderFill = startTurnOccurrenceOrderFill(
        requireResultHole(orderFrontier, "startTurnOccurrenceOrder"),
        (occurrence) =>
          occurrence.kind === "cloudkillMovement"
            ? choice === "cloudkillMovement"
              ? 0
              : 1
            : choice === "cloudkillMovement"
              ? 1
              : 0,
      );
      const movementFrontier = endTurn({
        state: boundaryState,
        actorId: spellTargetId,
        fills: [orderFill],
      });
      const movementFill = cloudkillMovementFill(
        requireResultHole(movementFrontier, "cloudkillMovement"),
        [spellCasterId],
      );
      const saveFrontier = endTurn({
        state: boundaryState,
        actorId: spellTargetId,
        fills: [orderFill, movementFill],
      });
      const saveFill = singleTargetSavingThrowOutcomeFill(
        requireResultHole(saveFrontier, "savingThrowOutcome"),
        spellCasterId,
        true,
      );
      const damageFrontier = endTurn({
        state: boundaryState,
        actorId: spellTargetId,
        fills: [orderFill, movementFill, saveFill],
      });
      const damageFill = damageRollFillWithGroups(
        requireResultHole(damageFrontier, "rolledDice"),
        [[1, 1, 1, 1, 1]],
      );
      const concentrationFrontier = endTurn({
        state: boundaryState,
        actorId: spellTargetId,
        fills: [orderFill, movementFill, saveFill, damageFill],
      });
      const concentrationFill = concentrationSavingThrowFill(
        requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
        true,
      );
      const result = endTurn({
        state: boundaryState,
        actorId: spellTargetId,
        fills: [
          orderFill,
          movementFill,
          saveFill,
          damageFill,
          concentrationFill,
        ],
      });
      if (result.tag !== "resolved") {
        throw new Error("Expected ordered start-turn occurrences to resolve.");
      }
      return result.state.combatants.get(spellCasterId);
    }

    expect(resolveOrdering("startTurnEffects")).toMatchObject({
      hp: 12,
      tempHp: 1,
    });
    expect(resolveOrdering("cloudkillMovement")).toMatchObject({
      hp: 10,
      tempHp: 3,
    });
  });

  test("executes reverse-storage Temporary Hit Point grants around movement", () => {
    const cast = castCloudkill();
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const withFirstGrant = withSourceTurnStartTemporaryHitPoints(
      targetTurn.state,
      { sourceKey: "cloudkill-before-movement-thp", amount: 2 },
    );
    const boundaryState = withSourceTurnStartTemporaryHitPoints(
      withFirstGrant,
      { sourceKey: "cloudkill-after-movement-thp", amount: 4 },
    );
    const orderFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
    });
    const orderHole = requireResultHole(
      orderFrontier,
      "startTurnOccurrenceOrder",
    );
    const temporaryHitPointOccurrences = orderHole.occurrences.filter(
      (occurrence) => occurrence.kind === "turnStartTemporaryHitPoints",
    );
    const movementOccurrence = orderHole.occurrences.find(
      (occurrence) => occurrence.kind === "cloudkillMovement",
    );
    const firstGrant = temporaryHitPointOccurrences[0];
    const secondGrant = temporaryHitPointOccurrences[1];
    if (
      firstGrant === undefined ||
      movementOccurrence === undefined ||
      secondGrant === undefined
    ) {
      throw new Error("Expected two Temporary Hit Point grants and movement.");
    }
    const orderFill = {
      kind: "startTurnOccurrenceOrder" as const,
      holeId: orderHole.holeId,
      value: {
        occurrenceIds: [
          secondGrant.occurrenceId,
          movementOccurrence.occurrenceId,
          firstGrant.occurrenceId,
        ] as const,
      },
    };
    const movementFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill],
    });
    const movementFill = cloudkillMovementFill(
      requireResultHole(movementFrontier, "cloudkillMovement"),
      [spellCasterId],
    );
    const saveFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill, movementFill],
    });
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(saveFrontier, "savingThrowOutcome"),
      spellCasterId,
      true,
    );
    const damageFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill, movementFill, saveFill],
    });
    const damageFill = damageRollFillWithGroups(
      requireResultHole(damageFrontier, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    const concentrationFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill, movementFill, saveFill, damageFill],
    });
    const concentrationFill = concentrationSavingThrowFill(
      requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
      true,
    );
    const result = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill, movementFill, saveFill, damageFill, concentrationFill],
    });

    expect(result).toMatchObject({ tag: "resolved" });
    if (result.tag !== "resolved") return;
    expect(result.state.combatants.get(spellCasterId)).toMatchObject({
      hp: 12,
      tempHp: 2,
    });
  });

  test("offers chosen Cloudkill movement before an exact start-turn damage occurrence", () => {
    const cast = castCloudkill();
    const targetTurn = endTurn({
      state: withSourceStartTurnDamage(cast.state),
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const sourceHpBeforeBoundary =
      targetTurn.state.combatants.get(spellCasterId)?.hp;
    if (sourceHpBeforeBoundary === undefined) {
      throw new Error("Expected the Cloudkill source.");
    }
    const orderFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    const orderFill = startTurnOccurrenceOrderFill(
      requireResultHole(orderFrontier, "startTurnOccurrenceOrder"),
      (occurrence) => (occurrence.kind === "cloudkillMovement" ? 0 : 1),
    );

    const movementFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [orderFill],
    });
    expect(movementFrontier).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "cloudkillMovement" }],
    });
    const movementFill = cloudkillMovementFill(
      requireResultHole(movementFrontier, "cloudkillMovement"),
      [],
    );
    const damageFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [orderFill, movementFill],
    });
    expect(damageFrontier).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
    });
    const damageFill = damageRollFillWithGroups(
      requireResultHole(damageFrontier, "rolledDice"),
      [[3]],
    );
    const concentrationFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [orderFill, movementFill, damageFill],
    });
    expect(concentrationFrontier).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "concentrationSavingThrow" }],
    });
    const concentrationFill = concentrationSavingThrowFill(
      requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
      true,
    );
    const saveFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [orderFill, movementFill, damageFill, concentrationFill],
    });
    expect(saveFrontier).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "savingThrowOutcome" }],
    });
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(saveFrontier, "savingThrowOutcome"),
      spellCasterId,
      false,
    );
    const result = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [orderFill, movementFill, damageFill, concentrationFill, saveFill],
    });
    expect(result).toMatchObject({ tag: "resolved" });
    if (result.tag !== "resolved") return;
    expect(result.state.combatants.get(spellCasterId)?.hp).toBe(
      sourceHpBeforeBoundary - 3,
    );
  });

  test("preserves reverse storage order across a damage-movement-damage permutation", () => {
    const cast = castCloudkill();
    const withFirstDamage = withSourceStartTurnDamage(
      cast.state,
      "cloudkill-before-movement-damage",
    );
    const targetTurn = endTurn({
      state: withSourceStartTurnDamage(
        withFirstDamage,
        "cloudkill-after-movement-damage",
      ),
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const orderFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    const orderHole = requireResultHole(
      orderFrontier,
      "startTurnOccurrenceOrder",
    );
    const damageOccurrences = orderHole.occurrences.filter(
      (occurrence) => occurrence.kind === "spellTurnStartDamageAndSave",
    );
    const movementOccurrence = orderHole.occurrences.find(
      (occurrence) => occurrence.kind === "cloudkillMovement",
    );
    const firstDamage = damageOccurrences[0];
    const secondDamage = damageOccurrences[1];
    if (
      firstDamage === undefined ||
      movementOccurrence === undefined ||
      secondDamage === undefined
    ) {
      throw new Error("Expected two damage occurrences and movement.");
    }
    const orderFill = {
      kind: "startTurnOccurrenceOrder" as const,
      holeId: orderHole.holeId,
      value: {
        occurrenceIds: [
          secondDamage.occurrenceId,
          movementOccurrence.occurrenceId,
          firstDamage.occurrenceId,
        ] as const,
      },
    };

    const firstDamageFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [orderFill],
    });
    expect(firstDamageFrontier).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "rolledDice",
          spellTurnStartDamage: {
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              "cloudkill-after-movement-damage",
            ),
          },
        },
      ],
    });
    const firstDamageHole = requireResultHole(
      firstDamageFrontier,
      "rolledDice",
    );
    const firstDamageFill = Schema.decodeUnknownSync(BattleFillSchema)(
      Schema.encodeSync(BattleFillSchema)(
        damageRollFillWithGroups(firstDamageHole, [[2]]),
      ),
    );
    const firstConcentrationFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [orderFill, firstDamageFill],
    });
    const firstConcentrationHole = requireResultHole(
      firstConcentrationFrontier,
      "concentrationSavingThrow",
    );
    const firstConcentrationFill = Schema.decodeUnknownSync(BattleFillSchema)(
      Schema.encodeSync(BattleFillSchema)(
        concentrationSavingThrowFill(firstConcentrationHole, true),
      ),
    );
    const firstSaveFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [orderFill, firstDamageFill, firstConcentrationFill],
    });
    const firstSaveHole = requireResultHole(
      firstSaveFrontier,
      "savingThrowOutcome",
    );
    const firstSaveFill = Schema.decodeUnknownSync(BattleFillSchema)(
      Schema.encodeSync(BattleFillSchema)(
        singleTargetSavingThrowOutcomeFill(firstSaveHole, spellCasterId, false),
      ),
    );
    const firstOccurrenceFills = [
      orderFill,
      firstDamageFill,
      firstConcentrationFill,
      firstSaveFill,
    ];
    const movementFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: firstOccurrenceFills,
    });
    expect(movementFrontier).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "cloudkillMovement" }],
    });
    const movementFill = cloudkillMovementFill(
      requireResultHole(movementFrontier, "cloudkillMovement"),
      [],
    );
    const secondDamageFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [...firstOccurrenceFills, movementFill],
    });
    expect(secondDamageFrontier).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "rolledDice",
          spellTurnStartDamage: {
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              "cloudkill-before-movement-damage",
            ),
          },
        },
      ],
    });
    const secondDamageHole = requireResultHole(
      secondDamageFrontier,
      "rolledDice",
    );
    expect(secondDamageHole.holeId).not.toBe(firstDamageHole.holeId);
    const secondDamageFill = damageRollFillWithGroups(secondDamageHole, [[3]]);
    const secondConcentrationFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [...firstOccurrenceFills, movementFill, secondDamageFill],
    });
    const secondConcentrationHole = requireResultHole(
      secondConcentrationFrontier,
      "concentrationSavingThrow",
    );
    expect(secondConcentrationHole.holeId).not.toBe(
      firstConcentrationHole.holeId,
    );
    const secondConcentrationFill = concentrationSavingThrowFill(
      secondConcentrationHole,
      true,
    );
    const secondSaveFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [
        ...firstOccurrenceFills,
        movementFill,
        secondDamageFill,
        secondConcentrationFill,
      ],
    });
    const secondSaveHole = requireResultHole(
      secondSaveFrontier,
      "savingThrowOutcome",
    );
    expect(secondSaveHole.holeId).not.toBe(firstSaveHole.holeId);
    const secondSaveFill = singleTargetSavingThrowOutcomeFill(
      secondSaveHole,
      spellCasterId,
      false,
    );
    const sourceHpBeforeBoundary =
      targetTurn.state.combatants.get(spellCasterId)?.hp;
    if (sourceHpBeforeBoundary === undefined) {
      throw new Error("Expected the Cloudkill source.");
    }
    const result = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [
        ...firstOccurrenceFills,
        movementFill,
        secondDamageFill,
        secondConcentrationFill,
        secondSaveFill,
      ],
    });
    expect(result).toMatchObject({ tag: "resolved" });
    if (result.tag !== "resolved") return;
    expect(result.state.combatants.get(spellCasterId)?.hp).toBe(
      sourceHpBeforeBoundary - 5,
    );
  });

  test("resolves two Cloudkill movement occurrences one complete frontier at a time", () => {
    const cast = castCloudkill();
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const boundaryState = withSecondCloudkillMovement(targetTurn.state);
    const orderFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
    });
    const orderHole = requireResultHole(
      orderFrontier,
      "startTurnOccurrenceOrder",
    );
    const movementOccurrences = orderHole.occurrences.filter(
      (occurrence) => occurrence.kind === "cloudkillMovement",
    );
    const firstOccurrence = movementOccurrences[0];
    const secondOccurrence = movementOccurrences[1];
    if (firstOccurrence === undefined || secondOccurrence === undefined) {
      throw new Error("Expected two Cloudkill movement occurrences.");
    }
    const orderFill = {
      kind: "startTurnOccurrenceOrder" as const,
      holeId: orderHole.holeId,
      value: {
        occurrenceIds: [
          firstOccurrence.occurrenceId,
          secondOccurrence.occurrenceId,
        ] as const,
      },
    };
    const firstMovementFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill],
    });
    const firstMovementHole = requireResultHole(
      firstMovementFrontier,
      "cloudkillMovement",
    );
    const firstMovementFill = cloudkillMovementFill(firstMovementHole, []);
    const secondMovementFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill, firstMovementFill],
    });
    const secondMovementHole = requireResultHole(
      secondMovementFrontier,
      "cloudkillMovement",
    );

    expect(secondMovementHole.holeId).not.toBe(firstMovementHole.holeId);
    expect(
      endTurn({
        state: boundaryState,
        actorId: spellTargetId,
        fills: [
          orderFill,
          firstMovementFill,
          cloudkillMovementFill(secondMovementHole, []),
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("applies an exact Temporary Hit Point occurrence between two movements", () => {
    const cast = castCloudkill();
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const withTemporaryHitPoints = withSourceTurnStartTemporaryHitPoints(
      targetTurn.state,
      { sourceKey: "cloudkill-between-movements-thp", amount: 4 },
    );
    const boundaryState = withSecondCloudkillMovement(withTemporaryHitPoints);
    const sourceHpBeforeBoundary =
      boundaryState.combatants.get(spellCasterId)?.hp;
    if (sourceHpBeforeBoundary === undefined) {
      throw new Error("Expected the Cloudkill source.");
    }
    const orderFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
    });
    const orderHole = requireResultHole(
      orderFrontier,
      "startTurnOccurrenceOrder",
    );
    const movements = orderHole.occurrences.filter(
      (occurrence) => occurrence.kind === "cloudkillMovement",
    );
    const temporaryHitPoints = orderHole.occurrences.find(
      (occurrence) => occurrence.kind === "turnStartTemporaryHitPoints",
    );
    const firstMovement = movements[0];
    const secondMovement = movements[1];
    if (
      firstMovement === undefined ||
      temporaryHitPoints === undefined ||
      secondMovement === undefined
    ) {
      throw new Error("Expected movement, Temporary Hit Points, movement.");
    }
    const orderFill = {
      kind: "startTurnOccurrenceOrder" as const,
      holeId: orderHole.holeId,
      value: {
        occurrenceIds: [
          firstMovement.occurrenceId,
          temporaryHitPoints.occurrenceId,
          secondMovement.occurrenceId,
        ] as const,
      },
    };
    const firstMovementFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill],
    });
    const firstMovementFill = cloudkillMovementFill(
      requireResultHole(firstMovementFrontier, "cloudkillMovement"),
      [],
    );
    const secondMovementFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill, firstMovementFill],
    });
    const secondMovementFill = cloudkillMovementFill(
      requireResultHole(secondMovementFrontier, "cloudkillMovement"),
      [spellCasterId],
    );
    const saveFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill, firstMovementFill, secondMovementFill],
    });
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(saveFrontier, "savingThrowOutcome"),
      spellCasterId,
      true,
    );
    const damageFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill, firstMovementFill, secondMovementFill, saveFill],
    });
    const damageFill = damageRollFillWithGroups(
      requireResultHole(damageFrontier, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    const concentrationFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [
        orderFill,
        firstMovementFill,
        secondMovementFill,
        saveFill,
        damageFill,
      ],
    });
    const concentrationFill = concentrationSavingThrowFill(
      requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
      true,
    );
    const result = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [
        orderFill,
        firstMovementFill,
        secondMovementFill,
        saveFill,
        damageFill,
        concentrationFill,
      ],
    });

    expect(result).toMatchObject({ tag: "resolved" });
    if (result.tag !== "resolved") return;
    expect(result.state.combatants.get(spellCasterId)).toMatchObject({
      hp: sourceHpBeforeBoundary,
      tempHp: 2,
    });
  });

  test("opens the fixed-distance movement frontier only at the source's start-turn boundary", () => {
    const cast = castCloudkill().state;

    const targetTurn = endTurn({ state: cast, actorId: spellCasterId });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;

    const sourceTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    expect(sourceTurn).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "cloudkillMovement",
          sourceCombatantId: spellCasterId,
          areaId: cloudkillAreaId,
          distanceFeet: movementFeet(10),
          directionRequirement: "awayFromSource",
          requiresTableSpatialFact: true,
        },
      ],
    });
  });

  test("advances exactly one turn after the table supplies movement facts", () => {
    const cast = castCloudkill().state;
    const targetTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const movementFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (movementFrontier.tag !== "needsHoles") {
      throw new Error("Expected the Cloudkill movement frontier.");
    }
    const movementHole = requireHole(
      movementFrontier.holes,
      "cloudkillMovement",
    );

    const sourceTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [cloudkillMovementFill(movementHole, [])],
    });

    expect(sourceTurn).toMatchObject({
      tag: "resolved",
      snapshot: {
        round: 2,
      },
    });
    if (sourceTurn.tag !== "resolved") return;
    expect(sourceTurn.state.initiative.stillToAct[0]?.creature).toBe(
      spellCasterId,
    );
  });

  test("keeps turn advancement suspended while movement-affected creatures resolve their saves", () => {
    const cast = castCloudkill().state;
    const targetTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const movementFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (movementFrontier.tag !== "needsHoles") {
      throw new Error("Expected the Cloudkill movement frontier.");
    }
    const movementHole = requireHole(
      movementFrontier.holes,
      "cloudkillMovement",
    );

    const saveFrontier = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [cloudkillMovementFill(movementHole, [spellTargetId])],
    });

    expect(saveFrontier).toMatchObject({
      tag: "needsHoles",
      holes: [
        {
          kind: "savingThrowOutcome",
          cloudkillAreaHazard: {
            targetId: spellTargetId,
            sourceCombatantId: spellCasterId,
            areaId: cloudkillAreaId,
            trigger: "movesIntoSpace",
          },
        },
      ],
    });
    if (saveFrontier.tag !== "needsHoles") return;
    expect(saveFrontier.state.initiative.stillToAct[0]?.creature).toBe(
      spellTargetId,
    );
  });

  test("applies movement-triggered save damage before advancing exactly once", () => {
    const { boundaryState, movementHole } = sourceTurnMovementBoundary();
    const movementFill = cloudkillMovementFill(movementHole, [spellTargetId]);
    expect(movementFill.value).not.toHaveProperty("distanceFeet");

    const saveFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [movementFill],
    });
    if (saveFrontier.tag !== "needsHoles") {
      throw new Error("Expected the movement-triggered save frontier.");
    }
    const saveHole = requireHole(saveFrontier.holes, "savingThrowOutcome");
    const saveFill = singleTargetSavingThrowOutcomeFill(
      saveHole,
      spellTargetId,
      true,
    );
    const damageFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [movementFill, saveFill],
    });
    if (damageFrontier.tag !== "needsHoles") {
      throw new Error("Expected the movement-triggered damage frontier.");
    }
    const damageHole = requireHole(damageFrontier.holes, "rolledDice");
    const resolved = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [
        movementFill,
        saveFill,
        damageRollFillWithGroups(damageHole, [[1, 1, 1, 1, 1]]),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { round: 2, currentActorId: spellCasterId },
    });
    if (resolved.tag !== "resolved") return;
    expect(resolved.state.combatants.get(spellTargetId)?.hp).toBe(28);
    expect(activeCloudkill(resolved.state).savedThisTurn).toEqual([
      spellTargetId,
    ]);
  });

  test("rejects duplicate, wrong-phase, and stale movement fills", () => {
    const { cast, boundaryState, movementHole } = sourceTurnMovementBoundary();
    const movementFill = cloudkillMovementFill(movementHole, []);

    expect(
      endTurn({
        state: boundaryState,
        actorId: spellTargetId,
        fills: [movementFill, movementFill],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    expect(
      endTurn({
        state: cast.state,
        actorId: spellCasterId,
        fills: [movementFill],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    const firstSourceTurn = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [movementFill],
    });
    if (firstSourceTurn.tag !== "resolved") {
      throw new Error("Expected the first source turn to start.");
    }
    const nextTargetTurn = endTurn({
      state: firstSourceTurn.state,
      actorId: spellCasterId,
    });
    if (nextTargetTurn.tag !== "resolved") {
      throw new Error("Expected the next target turn to start.");
    }
    expect(
      endTurn({
        state: nextTargetTurn.state,
        actorId: spellTargetId,
        fills: [movementFill],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });

  test("requires a fresh movement exactly once on every later source turn", () => {
    const { boundaryState, movementHole } = sourceTurnMovementBoundary();
    const firstSourceTurn = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [cloudkillMovementFill(movementHole, [])],
    });
    if (firstSourceTurn.tag !== "resolved") {
      throw new Error("Expected the first source turn to start.");
    }
    const nextTargetTurn = endTurn({
      state: firstSourceTurn.state,
      actorId: spellCasterId,
    });
    if (nextTargetTurn.tag !== "resolved") {
      throw new Error("Expected the next target turn to start.");
    }
    const nextMovement = endTurn({
      state: nextTargetTurn.state,
      actorId: spellTargetId,
    });

    expect(nextMovement).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "cloudkillMovement", distanceFeet: movementFeet(10) }],
    });
    if (nextMovement.tag !== "needsHoles") return;
    expect(
      requireHole(nextMovement.holes, "cloudkillMovement").holeId,
    ).not.toBe(movementHole.holeId);
  });

  test("does not accept a prior-round movement consequence fill", () => {
    const { boundaryState, movementHole } = sourceTurnMovementBoundary();
    const firstMovementFill = cloudkillMovementFill(movementHole, [
      spellTargetId,
    ]);
    const firstSaveFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [firstMovementFill],
    });
    const firstSaveHole = requireResultHole(
      firstSaveFrontier,
      "savingThrowOutcome",
    );
    const firstSaveFill = singleTargetSavingThrowOutcomeFill(
      firstSaveHole,
      spellTargetId,
      true,
    );
    const firstDamageFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [firstMovementFill, firstSaveFill],
    });
    const firstDamageFill = damageRollFillWithGroups(
      requireResultHole(firstDamageFrontier, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    const firstSourceTurn = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [firstMovementFill, firstSaveFill, firstDamageFill],
    });
    if (firstSourceTurn.tag !== "resolved") {
      throw new Error("Expected the first source turn to start.");
    }
    const nextTargetTurn = endTurn({
      state: firstSourceTurn.state,
      actorId: spellCasterId,
    });
    if (nextTargetTurn.tag !== "resolved") {
      throw new Error("Expected the next target turn to start.");
    }
    const nextMovementFrontier = endTurn({
      state: nextTargetTurn.state,
      actorId: spellTargetId,
    });
    const nextMovementFill = cloudkillMovementFill(
      requireResultHole(nextMovementFrontier, "cloudkillMovement"),
      [spellTargetId],
    );
    const nextSaveFrontier = endTurn({
      state: nextTargetTurn.state,
      actorId: spellTargetId,
      fills: [nextMovementFill],
    });
    const nextSaveHole = requireResultHole(
      nextSaveFrontier,
      "savingThrowOutcome",
    );

    expect(nextSaveHole.holeId).not.toBe(firstSaveHole.holeId);
    expect(
      endTurn({
        state: nextTargetTurn.state,
        actorId: spellTargetId,
        fills: [nextMovementFill, firstSaveFill],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "savingThrowOutcome" }],
    });
  });

  test("replays an interrupted movement save without advancing or reopening it", () => {
    const cast = castCloudkill({ targetCanReadyRayOfFrost: true });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({
        ...cast.session,
        state: targetTurn.state,
      }),
    );
    const recharging = withUnavailableSourceRecharge(readied.state);
    const orderFrontier = endTurn({
      state: recharging.state,
      actorId: spellTargetId,
    });
    const orderFill = startTurnOccurrenceOrderFill(
      requireResultHole(orderFrontier, "startTurnOccurrenceOrder"),
      (occurrence) => (occurrence.kind === "cloudkillMovement" ? 1 : 0),
    );
    const rechargeFrontier = endTurn({
      state: recharging.state,
      actorId: spellTargetId,
      fills: [orderFill],
    });
    const rechargeFill = {
      kind: "statBlockRechargeRoll" as const,
      holeId: requireResultHole(rechargeFrontier, "statBlockRechargeRoll")
        .holeId,
      value: [
        {
          target: recharging.resourcePoolRef,
          roll: DieRollResult(5),
        },
      ],
    };
    const movementFrontier = endTurn({
      state: recharging.state,
      actorId: spellTargetId,
      fills: [orderFill, rechargeFill],
    });
    if (movementFrontier.tag !== "needsHoles") {
      throw new Error("Expected the Cloudkill movement frontier.");
    }
    const movementFill = cloudkillMovementFill(
      requireHole(movementFrontier.holes, "cloudkillMovement"),
      [spellTargetId],
    );
    const saveFrontier = endTurn({
      state: recharging.state,
      actorId: spellTargetId,
      fills: [orderFill, rechargeFill, movementFill],
    });
    if (saveFrontier.tag !== "needsHoles") {
      throw new Error("Expected the movement-triggered save frontier.");
    }
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireHole(saveFrontier.holes, "savingThrowOutcome"),
      spellTargetId,
      false,
    );
    const interrupted = endTurn({
      state: recharging.state,
      actorId: spellTargetId,
      fills: [orderFill, rechargeFill, movementFill, saveFill],
    });

    expect(interrupted).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
      snapshot: {
        currentActorId: spellCasterId,
        pendingInterrupt: { trigger: "saveFailed" },
      },
    });
    if (interrupted.tag !== "needsHoles") return;
    const pendingInterrupt = interrupted.snapshot.pendingInterrupt;
    if (pendingInterrupt === null) {
      throw new Error("Expected the failed-save interrupt checkpoint.");
    }
    const declined = resolveBattleInterrupt({
      state: interrupted.state,
      fill: interruptDecisionFill(pendingInterrupt.decisionHole, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    expect(declined).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
      snapshot: {
        currentActorId: spellCasterId,
        pendingInterrupt: null,
      },
    });
    if (declined.tag !== "needsHoles") return;
    const damageHole = requireHole(declined.holes, "rolledDice");
    const damageFill = damageRollFillWithGroups(damageHole, [[1, 1, 1, 1, 1]]);
    const concentrationFrontier = resolveBattleSubject({
      state: declined.state,
      subject: declined.subject,
      fills: [movementFill, saveFill, damageFill],
    });
    expect(concentrationFrontier).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "concentrationSavingThrow" }],
      snapshot: {
        currentActorId: spellCasterId,
        pendingInterrupt: null,
      },
    });
    if (concentrationFrontier.tag !== "needsHoles") return;
    const concentrationHole = requireHole(
      concentrationFrontier.holes,
      "concentrationSavingThrow",
    );
    const resumed = resolveBattleSubject({
      state: concentrationFrontier.state,
      subject: concentrationFrontier.subject,
      fills: [
        orderFill,
        rechargeFill,
        movementFill,
        saveFill,
        damageFill,
        concentrationSavingThrowFill(concentrationHole, true),
      ].map((fill) =>
        Schema.decodeUnknownSync(BattleFillSchema)(
          Schema.encodeSync(BattleFillSchema)(fill),
        ),
      ),
    });

    expect(resumed).toMatchObject({
      tag: "resolved",
      snapshot: {
        round: 2,
        currentActorId: spellCasterId,
        pendingInterrupt: null,
      },
    });
  });

  test("resumes movement one through Temporary Hit Points to movement two in the retained order", () => {
    const cast = castCloudkill({ targetCanReadyRayOfFrost: true });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({ ...cast.session, state: targetTurn.state }),
    );
    const boundaryState = withSecondCloudkillMovement(
      withSourceTurnStartTemporaryHitPoints(readied.state, {
        sourceKey: "cloudkill-interrupted-between-movements-thp",
        amount: 4,
        persistWithoutConcentration: true,
      }),
    );
    const orderFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
    });
    const orderHole = requireResultHole(
      orderFrontier,
      "startTurnOccurrenceOrder",
    );
    const movements = orderHole.occurrences.filter(
      (occurrence) => occurrence.kind === "cloudkillMovement",
    );
    const temporaryHitPoints = orderHole.occurrences.find(
      (occurrence) => occurrence.kind === "turnStartTemporaryHitPoints",
    );
    const firstMovement = movements[0];
    const secondMovement = movements[1];
    if (
      firstMovement === undefined ||
      temporaryHitPoints === undefined ||
      secondMovement === undefined
    ) {
      throw new Error("Expected movement, Temporary Hit Points, movement.");
    }
    const orderFill = {
      kind: "startTurnOccurrenceOrder" as const,
      holeId: orderHole.holeId,
      value: {
        occurrenceIds: [
          firstMovement.occurrenceId,
          temporaryHitPoints.occurrenceId,
          secondMovement.occurrenceId,
        ] as const,
      },
    };
    const firstMovementFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill],
    });
    const firstMovementFill = cloudkillMovementFill(
      requireResultHole(firstMovementFrontier, "cloudkillMovement"),
      [spellTargetId],
    );
    const saveFrontier = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill, firstMovementFill],
    });
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(saveFrontier, "savingThrowOutcome"),
      spellTargetId,
      false,
    );
    const interrupted = endTurn({
      state: boundaryState,
      actorId: spellTargetId,
      fills: [orderFill, firstMovementFill, saveFill],
    });
    if (interrupted.tag !== "needsHoles") {
      throw new Error("Expected the first movement failed-save interrupt.");
    }
    const pending = interrupted.snapshot.pendingInterrupt;
    if (pending === null) {
      throw new Error("Expected a pending failed-save interrupt.");
    }
    const declined = resolveBattleInterrupt({
      state: interrupted.state,
      fill: interruptDecisionFill(pending.decisionHole, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    const damageFill = damageRollFillWithGroups(
      requireResultHole(declined, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    if (declined.tag !== "needsHoles") {
      throw new Error("Expected movement damage after declining.");
    }
    const concentrationFrontier = resolveBattleSubject({
      state: declined.state,
      subject: declined.subject,
      fills: [firstMovementFill, saveFill, damageFill],
    });
    const concentrationFill = concentrationSavingThrowFill(
      requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
      true,
    );
    if (concentrationFrontier.tag !== "needsHoles") {
      throw new Error("Expected movement Concentration frontier.");
    }
    const secondMovementFrontier = resolveBattleSubject({
      state: concentrationFrontier.state,
      subject: concentrationFrontier.subject,
      fills: [
        orderFill,
        firstMovementFill,
        saveFill,
        damageFill,
        concentrationFill,
      ],
    });

    expect(secondMovementFrontier).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "cloudkillMovement" }],
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellCasterId,
            tempHp: 4,
          }),
        ]),
      },
    });
    const secondMovementHole = requireResultHole(
      secondMovementFrontier,
      "cloudkillMovement",
    );
    expect(secondMovementHole.holeId).not.toBe(firstMovementFill.holeId);
  });

  test("offers the chosen movement occurrence before stat-block recharge", () => {
    const cast = castCloudkill();
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const recharging = withUnavailableSourceRecharge(targetTurn.state);
    const orderFrontier = endTurn({
      state: recharging.state,
      actorId: spellTargetId,
    });
    const orderFill = startTurnOccurrenceOrderFill(
      requireResultHole(orderFrontier, "startTurnOccurrenceOrder"),
      (occurrence) => (occurrence.kind === "cloudkillMovement" ? 0 : 1),
    );

    const movementFrontier = endTurn({
      state: recharging.state,
      actorId: spellTargetId,
      fills: [orderFill],
    });

    expect(movementFrontier).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "cloudkillMovement" }],
    });
    const rechargeFrontier = endTurn({
      state: recharging.state,
      actorId: spellTargetId,
      fills: [
        orderFill,
        cloudkillMovementFill(
          requireResultHole(movementFrontier, "cloudkillMovement"),
          [],
        ),
      ],
    });
    expect(rechargeFrontier).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "statBlockRechargeRoll" }],
    });
    const rechargeFill = {
      kind: "statBlockRechargeRoll" as const,
      holeId: requireResultHole(rechargeFrontier, "statBlockRechargeRoll")
        .holeId,
      value: [
        {
          target: recharging.resourcePoolRef,
          roll: DieRollResult(5),
        },
      ],
    };
    const completed = endTurn({
      state: recharging.state,
      actorId: spellTargetId,
      fills: [
        orderFill,
        cloudkillMovementFill(
          requireResultHole(movementFrontier, "cloudkillMovement"),
          [],
        ),
        rechargeFill,
      ],
    });
    if (completed.tag !== "resolved") {
      throw new Error("Expected the ordered start-turn occurrences to finish.");
    }
    const source = completed.state.combatants.get(spellCasterId);
    expect(source?.origin.kind).toBe("statBlock");
    if (source?.origin.kind !== "statBlock") {
      throw new Error("Expected the stat-block Cloudkill source.");
    }
    expect(
      source.origin.execution.resourcePools.find(
        (pool): pool is Extract<typeof pool, { readonly kind: "recharge" }> =>
          pool.kind === "recharge" &&
          pool.resourcePoolRef === recharging.resourcePoolRef,
      )?.available,
    ).toBe(true);
  });

  test("opens independent failed-save windows for two movement-affected targets", () => {
    const cast = castCloudkill({
      targetCanReadyRayOfFrost: true,
      extraTargetIds: [cloudkillSecondaryTargetId],
    });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({ ...cast.session, state: targetTurn.state }),
    );
    const secondaryTurn = endTurn({
      state: readied.state,
      actorId: spellTargetId,
    });
    if (secondaryTurn.tag !== "resolved") {
      throw new Error("Expected the secondary target's turn to start.");
    }
    const movementFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
    });
    const movementHole = requireResultHole(
      movementFrontier,
      "cloudkillMovement",
    );
    const movementFill = cloudkillMovementFill(movementHole, [
      cloudkillSecondaryTargetId,
      spellCasterId,
    ]);
    const firstSaveFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill],
    });
    const firstSaveHole = requireResultHole(
      firstSaveFrontier,
      "savingThrowOutcome",
    );
    expect(firstSaveHole).toMatchObject({
      cloudkillAreaHazard: { targetId: spellCasterId },
    });
    const firstSaveFill = singleTargetSavingThrowOutcomeFill(
      firstSaveHole,
      spellCasterId,
      false,
    );
    const firstInterrupted = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill, firstSaveFill],
    });
    const firstDecision = requireResultHole(
      firstInterrupted,
      "interruptDecision",
    );
    if (firstInterrupted.tag !== "needsHoles") {
      throw new Error("Expected the first failed-save window.");
    }
    const firstDeclined = resolveBattleInterrupt({
      state: firstInterrupted.state,
      fill: interruptDecisionFill(firstDecision, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    const firstDamageHole = requireResultHole(firstDeclined, "rolledDice");
    const firstDamageFill = damageRollFillWithGroups(firstDamageHole, [
      [1, 1, 1, 1, 1],
    ]);
    if (firstDeclined.tag !== "needsHoles") {
      throw new Error("Expected the first target's damage frontier.");
    }
    const concentrationFrontier = resolveBattleSubject({
      state: firstDeclined.state,
      subject: firstDeclined.subject,
      fills: [movementFill, firstSaveFill, firstDamageFill],
    });
    const concentrationFill = concentrationSavingThrowFill(
      requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
      true,
    );
    if (concentrationFrontier.tag !== "needsHoles") {
      throw new Error("Expected the source Concentration save frontier.");
    }
    const secondSaveFrontier = resolveBattleSubject({
      state: concentrationFrontier.state,
      subject: concentrationFrontier.subject,
      fills: [movementFill, firstSaveFill, firstDamageFill, concentrationFill],
    });
    const secondSaveHole = requireResultHole(
      secondSaveFrontier,
      "savingThrowOutcome",
    );
    const secondSaveFill = singleTargetSavingThrowOutcomeFill(
      secondSaveHole,
      cloudkillSecondaryTargetId,
      false,
    );
    if (secondSaveFrontier.tag !== "needsHoles") {
      throw new Error("Expected the second target's save frontier.");
    }
    const secondInterrupted = resolveBattleSubject({
      state: secondSaveFrontier.state,
      subject: secondSaveFrontier.subject,
      fills: [
        movementFill,
        firstSaveFill,
        firstDamageFill,
        concentrationFill,
        secondSaveFill,
      ],
    });

    expect(secondInterrupted).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
      snapshot: {
        pendingInterrupt: {
          trigger: "saveFailed",
          choices: [
            expect.objectContaining({ readiedSpellCasterId: spellTargetId }),
          ],
        },
      },
    });
  });

  test("cancels remaining movement targets when source damage ends Cloudkill Concentration", () => {
    const cast = castCloudkill({
      extraTargetIds: [cloudkillSecondaryTargetId],
    });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the first target's turn to start.");
    }
    const secondaryTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (secondaryTurn.tag !== "resolved") {
      throw new Error("Expected the second target's turn to start.");
    }
    const sourceHpBeforeMovement =
      secondaryTurn.state.combatants.get(spellCasterId)?.hp;
    if (sourceHpBeforeMovement === undefined) {
      throw new Error("Expected the Cloudkill source.");
    }
    const movementFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
    });
    const movementFill = cloudkillMovementFill(
      requireResultHole(movementFrontier, "cloudkillMovement"),
      [spellCasterId, cloudkillSecondaryTargetId],
    );
    const sourceSaveFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill],
    });
    const sourceSaveHole = requireResultHole(
      sourceSaveFrontier,
      "savingThrowOutcome",
    );
    expect(sourceSaveHole).toMatchObject({
      cloudkillAreaHazard: { targetId: spellCasterId },
    });
    const sourceSaveFill = singleTargetSavingThrowOutcomeFill(
      sourceSaveHole,
      spellCasterId,
      true,
    );
    const sourceDamageFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill, sourceSaveFill],
    });
    const sourceDamageFill = damageRollFillWithGroups(
      requireResultHole(sourceDamageFrontier, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    const concentrationFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill, sourceSaveFill, sourceDamageFill],
    });
    const concentrationFill = concentrationSavingThrowFill(
      requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
      false,
    );
    const resolved = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [
        movementFill,
        sourceSaveFill,
        sourceDamageFill,
        concentrationFill,
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { round: 2, currentActorId: spellCasterId },
    });
    if (resolved.tag !== "resolved") return;
    expect(resolved.state.combatants.get(spellCasterId)?.hp).toBe(
      sourceHpBeforeMovement - 2,
    );
    expect(resolved.state.combatants.get(cloudkillSecondaryTargetId)?.hp).toBe(
      30,
    );
    expect(
      [...resolved.state.combatants.values()].some((combatant) =>
        combatant.activeEffects.some(
          (effect) => effect.kind === "cloudkillAreaHazard",
        ),
      ),
    ).toBe(false);
  });

  test("later movement saves use the prefix state after an earlier target loses its readied spell", () => {
    const cast = castCloudkill({
      targetCanReadyRayOfFrost: true,
      extraTargetIds: [cloudkillSecondaryTargetId],
    });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the first affected target's turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({ ...cast.session, state: targetTurn.state }),
    );
    const secondaryTurn = endTurn({
      state: readied.state,
      actorId: spellTargetId,
    });
    if (secondaryTurn.tag !== "resolved") {
      throw new Error("Expected the second affected target's turn to start.");
    }
    const movementFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
    });
    const movementFill = cloudkillMovementFill(
      requireResultHole(movementFrontier, "cloudkillMovement"),
      [spellTargetId, cloudkillSecondaryTargetId],
    );
    const firstSaveFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill],
    });
    const firstSaveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(firstSaveFrontier, "savingThrowOutcome"),
      spellTargetId,
      false,
    );
    const firstInterrupted = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill, firstSaveFill],
    });
    const firstDecision = requireResultHole(
      firstInterrupted,
      "interruptDecision",
    );
    if (firstInterrupted.tag !== "needsHoles") {
      throw new Error(
        "Expected the first affected target's failed-save window.",
      );
    }
    const firstDeclined = resolveBattleInterrupt({
      state: firstInterrupted.state,
      fill: interruptDecisionFill(firstDecision, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    const firstDamageFill = damageRollFillWithGroups(
      requireResultHole(firstDeclined, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    if (firstDeclined.tag !== "needsHoles") {
      throw new Error("Expected the first affected target's damage frontier.");
    }
    const concentrationFrontier = resolveBattleSubject({
      state: firstDeclined.state,
      subject: firstDeclined.subject,
      fills: [movementFill, firstSaveFill, firstDamageFill],
    });
    const concentrationFill = concentrationSavingThrowFill(
      requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
      false,
    );
    if (concentrationFrontier.tag !== "needsHoles") {
      throw new Error(
        "Expected the first affected target's Concentration save.",
      );
    }
    const secondSaveFrontier = resolveBattleSubject({
      state: concentrationFrontier.state,
      subject: concentrationFrontier.subject,
      fills: [movementFill, firstSaveFill, firstDamageFill, concentrationFill],
    });
    if (secondSaveFrontier.tag !== "needsHoles") {
      throw new Error("Expected the second affected target's save frontier.");
    }
    expect(secondSaveFrontier.state.readiedSpells.has(spellTargetId)).toBe(
      false,
    );
    const secondSaveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(secondSaveFrontier, "savingThrowOutcome"),
      cloudkillSecondaryTargetId,
      false,
    );
    const secondDamageFrontier = resolveBattleSubject({
      state: secondSaveFrontier.state,
      subject: secondSaveFrontier.subject,
      fills: [
        movementFill,
        firstSaveFill,
        firstDamageFill,
        concentrationFill,
        secondSaveFill,
      ],
    });

    expect(secondDamageFrontier).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
      snapshot: { pendingInterrupt: null },
    });
  });

  test("preserves and resolves movement interrupt replay through delegated Command End Turn", () => {
    const cast = castCloudkill({
      targetCanReadyRayOfFrost: true,
      extraTargetIds: [cloudkillSecondaryTargetId],
    });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({ ...cast.session, state: targetTurn.state }),
    );
    const secondaryTurn = endTurn({
      state: readied.state,
      actorId: spellTargetId,
    });
    if (secondaryTurn.tag !== "resolved") {
      throw new Error("Expected the secondary target's turn to start.");
    }
    const commanded = withCommandGrovel(
      secondaryTurn.state,
      cloudkillSecondaryTargetId,
    );
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: cloudkillSecondaryTargetId,
      command: "commandGrovel" as const,
      effectRef: commanded.effectRef,
    };
    const movementFrontier = resolveBattleSubject({
      state: commanded.state,
      subject,
      fills: [],
    });
    const movementFill = cloudkillMovementFill(
      requireResultHole(movementFrontier, "cloudkillMovement"),
      [cloudkillSecondaryTargetId],
    );
    const saveFrontier = resolveBattleSubject({
      state: commanded.state,
      subject,
      fills: [movementFill],
    });
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(saveFrontier, "savingThrowOutcome"),
      cloudkillSecondaryTargetId,
      false,
    );
    const interrupted = resolveBattleSubject({
      state: commanded.state,
      subject,
      fills: [movementFill, saveFill],
    });

    expect(interrupted).toMatchObject({
      tag: "needsHoles",
      subject,
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
      state: {
        interruptStack: [
          {
            kind: "interruptCheckpoint",
            frame: {
              trigger: "saveFailed",
              continuation: {
                kind: "replay",
                subject,
                parentPosition: {
                  kind: "startTurnOccurrenceSequence",
                  child: {
                    kind: "cloudkillMovementSaveDamageSequence",
                    targetId: cloudkillSecondaryTargetId,
                  },
                },
              },
            },
          },
        ],
      },
    });
    if (interrupted.tag !== "needsHoles") {
      throw new Error("Expected delegated movement interrupt.");
    }
    const replayCheckpoint = interrupted.state.interruptStack.find(
      (entry) => entry.kind === "interruptCheckpoint",
    );
    if (
      replayCheckpoint?.kind !== "interruptCheckpoint" ||
      replayCheckpoint.frame.continuation.kind !== "replay" ||
      replayCheckpoint.frame.continuation.parentPosition === undefined
    ) {
      throw new Error("Expected the Cloudkill replay checkpoint.");
    }
    expect(
      replayCheckpoint.frame.continuation.parentPosition.child,
    ).not.toHaveProperty("movementHoleId");
    expect(
      replayCheckpoint.frame.continuation.parentPosition.child,
    ).not.toHaveProperty("saveHoleId");
    const pending = interrupted.snapshot.pendingInterrupt;
    if (pending === null) {
      throw new Error("Expected delegated pending interrupt.");
    }
    const declined = resolveBattleInterrupt({
      state: interrupted.state,
      fill: interruptDecisionFill(pending.decisionHole, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    expect(declined).toMatchObject({
      tag: "needsHoles",
      subject,
      holes: [{ kind: "rolledDice" }],
      state: {
        interruptStack: [
          {
            kind: "replayContinuation",
            continuation: {
              kind: "replay",
              subject,
              parentPosition: {
                kind: "startTurnOccurrenceSequence",
                child: {
                  kind: "cloudkillMovementSaveDamageSequence",
                  targetId: cloudkillSecondaryTargetId,
                },
              },
            },
          },
        ],
      },
    });
    if (declined.tag !== "needsHoles") {
      throw new Error("Expected delegated movement damage frontier.");
    }
    const damageFill = damageRollFillWithGroups(
      requireResultHole(declined, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    const resumed = resolveBattleSubject({
      state: declined.state,
      subject: declined.subject,
      fills: [movementFill, saveFill, damageFill],
    });

    expect(resumed).toMatchObject({
      tag: "resolved",
      snapshot: {
        round: 2,
        currentActorId: spellCasterId,
        pendingInterrupt: null,
      },
    });
  });

  test("preserves Command Drop outcomes through interrupted Cloudkill movement replay", () => {
    const cast = castCloudkill({
      targetCanReadyRayOfFrost: true,
      targetHasLongsword: true,
    });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({ ...cast.session, state: targetTurn.state }),
    );
    const commanded = withCommandDrop(readied.state, spellTargetId);
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "commandDrop" as const,
      effectRef: commanded.effectRef,
    };
    const movementFrontier = resolveBattleSubject({
      state: commanded.state,
      subject,
      fills: [],
    });
    const movementFill = cloudkillMovementFill(
      requireResultHole(movementFrontier, "cloudkillMovement"),
      [spellTargetId],
    );
    const saveFrontier = resolveBattleSubject({
      state: commanded.state,
      subject,
      fills: [movementFill],
    });
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(saveFrontier, "savingThrowOutcome"),
      spellTargetId,
      false,
    );
    const interrupted = resolveBattleSubject({
      state: commanded.state,
      subject,
      fills: [movementFill, saveFill],
    });
    if (interrupted.tag !== "needsHoles") {
      throw new Error("Expected Command Drop movement interruption.");
    }
    expect(interrupted.state.interruptStack).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "interruptCheckpoint",
          frame: expect.objectContaining({
            continuation: expect.objectContaining({
              objectOutcomes: expect.objectContaining({
                droppedObjects: [
                  expect.objectContaining({
                    actorId: spellTargetId,
                  }),
                ],
              }),
            }),
          }),
        }),
      ]),
    );
    const pending = interrupted.snapshot.pendingInterrupt;
    if (pending === null) {
      throw new Error("Expected the movement failed-save interrupt.");
    }
    const declined = resolveBattleInterrupt({
      state: interrupted.state,
      fill: interruptDecisionFill(pending.decisionHole, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    const damageFill = damageRollFillWithGroups(
      requireResultHole(declined, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    if (declined.tag !== "needsHoles") {
      throw new Error("Expected Command Drop movement damage frontier.");
    }
    const concentrationFrontier = resolveBattleSubject({
      state: declined.state,
      subject: declined.subject,
      fills: [movementFill, saveFill, damageFill],
    });
    const concentrationFill = concentrationSavingThrowFill(
      requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
      true,
    );
    if (concentrationFrontier.tag !== "needsHoles") {
      throw new Error("Expected Command Drop movement Concentration frontier.");
    }
    const resumed = resolveBattleSubject({
      state: concentrationFrontier.state,
      subject: concentrationFrontier.subject,
      fills: [movementFill, saveFill, damageFill, concentrationFill],
    });

    expect(resumed).toMatchObject({
      tag: "resolved",
      droppedObjects: [
        expect.objectContaining({
          kind: "objectDropped",
          actorId: spellTargetId,
        }),
      ],
      snapshot: {
        round: 2,
        currentActorId: spellCasterId,
        pendingInterrupt: null,
      },
    });
    if (resumed.tag !== "resolved") return;
    expect(resumed.droppedObjects).toHaveLength(1);
  });

  test("preserves a known-empty Command Drop outcome through interrupted movement replay", () => {
    const cast = castCloudkill({ targetCanReadyRayOfFrost: true });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({ ...cast.session, state: targetTurn.state }),
    );
    const commanded = withCommandDrop(readied.state, spellTargetId);
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "commandDrop" as const,
      effectRef: commanded.effectRef,
    };
    const movementFrontier = resolveBattleSubject({
      state: commanded.state,
      subject,
      fills: [],
    });
    const movementFill = cloudkillMovementFill(
      requireResultHole(movementFrontier, "cloudkillMovement"),
      [spellTargetId],
    );
    const saveFrontier = resolveBattleSubject({
      state: commanded.state,
      subject,
      fills: [movementFill],
    });
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(saveFrontier, "savingThrowOutcome"),
      spellTargetId,
      false,
    );
    const interrupted = resolveBattleSubject({
      state: commanded.state,
      subject,
      fills: [movementFill, saveFill],
    });
    expect(interrupted).toMatchObject({
      tag: "needsHoles",
      state: {
        interruptStack: expect.arrayContaining([
          expect.objectContaining({
            kind: "interruptCheckpoint",
            frame: expect.objectContaining({
              continuation: expect.objectContaining({
                objectOutcomes: { droppedObjects: [] },
              }),
            }),
          }),
        ]),
      },
    });
    if (interrupted.tag !== "needsHoles") {
      throw new Error("Expected Command Drop movement interruption.");
    }
    const pending = interrupted.snapshot.pendingInterrupt;
    if (pending === null) {
      throw new Error("Expected the movement failed-save interrupt.");
    }
    const declined = resolveBattleInterrupt({
      state: interrupted.state,
      fill: interruptDecisionFill(pending.decisionHole, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    const damageFill = damageRollFillWithGroups(
      requireResultHole(declined, "rolledDice"),
      [[1, 1, 1, 1, 1]],
    );
    if (declined.tag !== "needsHoles") {
      throw new Error("Expected Command Drop movement damage frontier.");
    }
    const concentrationFrontier = resolveBattleSubject({
      state: declined.state,
      subject: declined.subject,
      fills: [movementFill, saveFill, damageFill],
    });
    const concentrationFill = concentrationSavingThrowFill(
      requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
      true,
    );
    if (concentrationFrontier.tag !== "needsHoles") {
      throw new Error("Expected Command Drop movement Concentration frontier.");
    }
    const resumedWithEmptyDrop = resolveBattleSubject({
      state: concentrationFrontier.state,
      subject: concentrationFrontier.subject,
      fills: [movementFill, saveFill, damageFill, concentrationFill],
    });

    expect(resumedWithEmptyDrop).toMatchObject({
      tag: "resolved",
      droppedObjects: [],
      snapshot: {
        round: 2,
        currentActorId: spellCasterId,
        pendingInterrupt: null,
      },
    });
  });

  test("resolves Grease before advancing End Turn into Cloudkill movement", () => {
    const cast = castCloudkill({ targetCanReadyRayOfFrost: true });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({
        ...cast.session,
        state: withGreaseGroundHazard(targetTurn.state),
      }),
    );
    const subject = {
      tag: "runtimeCommand" as const,
      actorId: spellTargetId,
      command: "greaseGroundHazardSave" as const,
      areaId: greaseAreaId,
      trigger: "endsTurnInArea" as const,
    };
    const combinedFrontier = resolveBattleSubject({
      state: readied.state,
      subject,
      fills: [],
    });
    if (combinedFrontier.tag !== "needsHoles") {
      throw new Error("Expected the combined Grease and Cloudkill frontier.");
    }
    const greaseSaveHole = combinedFrontier.holes.find(
      (hole) =>
        hole.kind === "savingThrowOutcome" && "greaseGroundHazard" in hole,
    );
    if (greaseSaveHole?.kind !== "savingThrowOutcome") {
      throw new Error("Expected the Grease end-turn save frontier.");
    }
    expect(combinedFrontier.holes).toEqual([greaseSaveHole]);
    const greaseSaveFill = singleTargetSavingThrowOutcomeFill(
      greaseSaveHole,
      spellTargetId,
      false,
    );
    const greaseInterrupted = resolveBattleSubject({
      state: readied.state,
      subject,
      fills: [greaseSaveFill],
    });
    expect(greaseInterrupted).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
      snapshot: {
        currentActorId: spellTargetId,
        pendingInterrupt: { trigger: "saveFailed" },
      },
    });
    if (greaseInterrupted.tag !== "needsHoles") {
      throw new Error("Expected the Grease failed-save window.");
    }
    const greaseDecision = requireHole(
      greaseInterrupted.holes,
      "interruptDecision",
    );
    const cloudkillMovementFrontier = resolveBattleInterrupt({
      state: greaseInterrupted.state,
      fill: interruptDecisionFill(greaseDecision, {
        kind: "decline",
        responderId: spellTargetId,
      }),
    });
    expect(cloudkillMovementFrontier).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "cloudkillMovement" }],
      snapshot: {
        round: 1,
        currentActorId: spellTargetId,
        pendingInterrupt: null,
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            conditions: expect.arrayContaining(["prone"]),
          }),
        ]),
      },
    });
    if (cloudkillMovementFrontier.tag !== "needsHoles") {
      throw new Error("Expected Cloudkill movement after Grease resolved.");
    }
    const movementHole = requireHole(
      cloudkillMovementFrontier.holes,
      "cloudkillMovement",
    );
    const movementFill = cloudkillMovementFill(movementHole, [spellTargetId]);
    const cloudkillSaveFrontier = resolveBattleSubject({
      state: cloudkillMovementFrontier.state,
      subject: cloudkillMovementFrontier.subject,
      fills: [movementFill],
    });
    if (cloudkillSaveFrontier.tag !== "needsHoles") {
      throw new Error("Expected the Cloudkill movement save frontier.");
    }
    const cloudkillSaveHole = cloudkillSaveFrontier.holes.find(
      (hole) =>
        hole.kind === "savingThrowOutcome" && "cloudkillAreaHazard" in hole,
    );
    if (cloudkillSaveHole?.kind !== "savingThrowOutcome") {
      throw new Error("Expected the Cloudkill movement save hole.");
    }
    const cloudkillSaveFill = singleTargetSavingThrowOutcomeFill(
      cloudkillSaveHole,
      spellTargetId,
      false,
    );
    const cloudkillInterrupted = resolveBattleSubject({
      state: cloudkillSaveFrontier.state,
      subject: cloudkillSaveFrontier.subject,
      fills: [movementFill, cloudkillSaveFill],
    });
    expect(cloudkillInterrupted).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
      snapshot: {
        currentActorId: spellCasterId,
        pendingInterrupt: { trigger: "saveFailed" },
      },
    });
  });

  test("cancels remaining movement damage and advances once when an accepted reaction ends source Concentration", () => {
    const cast = castCloudkill({
      targetCanReadyRayOfFrost: true,
      extraTargetIds: [cloudkillSecondaryTargetId],
    });
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({ ...cast.session, state: targetTurn.state }),
    );
    const secondaryTurn = endTurn({
      state: readied.state,
      actorId: spellTargetId,
    });
    if (secondaryTurn.tag !== "resolved") {
      throw new Error("Expected the secondary target's turn to start.");
    }
    const sourceHpBeforeReaction =
      secondaryTurn.state.combatants.get(spellCasterId)?.hp;
    if (sourceHpBeforeReaction === undefined) {
      throw new Error("Expected the Cloudkill source.");
    }
    const movementFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
    });
    const movementFill = cloudkillMovementFill(
      requireResultHole(movementFrontier, "cloudkillMovement"),
      [cloudkillSecondaryTargetId],
    );
    const saveFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill],
    });
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(saveFrontier, "savingThrowOutcome"),
      cloudkillSecondaryTargetId,
      false,
    );
    const interrupted = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [movementFill, saveFill],
    });
    if (interrupted.tag !== "needsHoles") {
      throw new Error("Expected the failed-save reaction window.");
    }
    const pending = interrupted.snapshot.pendingInterrupt;
    if (pending === null) {
      throw new Error("Expected a pending failed-save interrupt.");
    }
    const choice = reactionChoiceWithSubject(pending.choices);
    if (
      choice.kind !== "releaseReadiedSpell" ||
      choice.subject.command !== "releaseReadiedSpell"
    ) {
      throw new Error("Expected the readied Ray of Frost choice.");
    }
    const released = resolveBattleInterrupt({
      state: interrupted.state,
      fill: interruptDecisionFill(pending.decisionHole, {
        kind: "resolve",
        responderId: spellTargetId,
        choice: {
          kind: "releaseReadiedSpell",
          readiedSpellCasterId: spellTargetId,
          procedureRef: choice.subject.procedureRef,
          fills: [],
        },
      }),
    });
    const reactionTargetHole = requireResultHole(released, "targetChoice");
    if (released.tag !== "needsHoles") {
      throw new Error("Expected the readied spell target frontier.");
    }
    const reactionTargetFill = targetFill(reactionTargetHole, spellCasterId);
    const attackFrontier = resolveBattleSubject({
      state: released.state,
      subject: released.subject,
      fills: [reactionTargetFill],
    });
    const attackHole = requireResultHole(attackFrontier, "attackRoll");
    const attackFill = attackRollFill(attackHole, {
      total: 20,
      naturalD20: 15,
    });
    const damageFrontier = resolveBattleSubject({
      state: released.state,
      subject: released.subject,
      fills: [reactionTargetFill, attackFill],
    });
    const damageHole = requireResultHole(damageFrontier, "rolledDice");
    const damageFill = damageRollFill(damageHole, 4);
    const concentrationFrontier = resolveBattleSubject({
      state: released.state,
      subject: released.subject,
      fills: [reactionTargetFill, attackFill, damageFill],
    });
    const concentrationHole = requireResultHole(
      concentrationFrontier,
      "concentrationSavingThrow",
    );
    if (concentrationFrontier.tag !== "needsHoles") {
      throw new Error("Expected the source Concentration save frontier.");
    }
    const resumed = resolveBattleSubject({
      state: released.state,
      subject: released.subject,
      fills: [
        reactionTargetFill,
        attackFill,
        damageFill,
        concentrationSavingThrowFill(concentrationHole, false),
      ],
    });

    expect(resumed).toMatchObject({
      tag: "resolved",
      snapshot: {
        round: 2,
        currentActorId: spellCasterId,
        pendingInterrupt: null,
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellCasterId,
            concentrating: false,
          }),
        ]),
      },
    });
    if (resumed.tag !== "resolved") return;
    expect(
      [...resumed.state.combatants.values()].flatMap(
        (combatant) => combatant.activeEffects,
      ),
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "cloudkillAreaHazard" }),
      ]),
    );
    expect(resumed.state.combatants.get(spellCasterId)?.hp).toBe(
      sourceHpBeforeReaction - 4,
    );
  });

  test("applies deferred source-start effects once when a movement reaction ends Cloudkill", () => {
    const cast = castCloudkill({
      targetCanReadyRayOfFrost: true,
      extraTargetIds: [cloudkillSecondaryTargetId],
    });
    const targetTurn = endTurn({
      state: withCloudkillOwnedTurnStartTemporaryHitPoints(
        withSourceStartTurnDamage(cast.state),
        6,
      ),
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected the target turn to start.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({ ...cast.session, state: targetTurn.state }),
    );
    const secondaryTurn = endTurn({
      state: readied.state,
      actorId: spellTargetId,
    });
    if (secondaryTurn.tag !== "resolved") {
      throw new Error("Expected the secondary target's turn to start.");
    }
    const sourceHpBeforeStartTurn =
      secondaryTurn.state.combatants.get(spellCasterId)?.hp;
    if (sourceHpBeforeStartTurn === undefined) {
      throw new Error("Expected the Cloudkill source.");
    }

    const orderFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
    });
    const orderFill = startTurnOccurrenceOrderFill(
      requireResultHole(orderFrontier, "startTurnOccurrenceOrder"),
      (occurrence) => (occurrence.kind === "cloudkillMovement" ? 0 : 1),
    );
    const startTurnFills = [orderFill];
    const movementFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: startTurnFills,
    });
    const movementFill = cloudkillMovementFill(
      requireResultHole(movementFrontier, "cloudkillMovement"),
      [cloudkillSecondaryTargetId],
    );
    const saveFrontier = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [...startTurnFills, movementFill],
    });
    const saveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(saveFrontier, "savingThrowOutcome"),
      cloudkillSecondaryTargetId,
      false,
    );
    const interrupted = endTurn({
      state: secondaryTurn.state,
      actorId: cloudkillSecondaryTargetId,
      fills: [...startTurnFills, movementFill, saveFill],
    });
    if (interrupted.tag !== "needsHoles") {
      throw new Error("Expected the failed-save reaction window.");
    }
    const pending = interrupted.snapshot.pendingInterrupt;
    if (pending === null) {
      throw new Error("Expected a pending failed-save interrupt.");
    }
    const choice = reactionChoiceWithSubject(pending.choices);
    if (
      choice.kind !== "releaseReadiedSpell" ||
      choice.subject.command !== "releaseReadiedSpell"
    ) {
      throw new Error("Expected the readied Ray of Frost choice.");
    }
    const released = resolveBattleInterrupt({
      state: interrupted.state,
      fill: interruptDecisionFill(pending.decisionHole, {
        kind: "resolve",
        responderId: spellTargetId,
        choice: {
          kind: "releaseReadiedSpell",
          readiedSpellCasterId: spellTargetId,
          procedureRef: choice.subject.procedureRef,
          fills: [],
        },
      }),
    });
    if (released.tag !== "needsHoles") {
      throw new Error("Expected the readied spell target frontier.");
    }
    const reactionTargetFill = targetFill(
      requireResultHole(released, "targetChoice"),
      spellCasterId,
    );
    const attackFrontier = resolveBattleSubject({
      state: released.state,
      subject: released.subject,
      fills: [reactionTargetFill],
    });
    const attackFill = attackRollFill(
      requireResultHole(attackFrontier, "attackRoll"),
      { total: 20, naturalD20: 15 },
    );
    const damageFrontier = resolveBattleSubject({
      state: released.state,
      subject: released.subject,
      fills: [reactionTargetFill, attackFill],
    });
    const damageFill = damageRollFill(
      requireResultHole(damageFrontier, "rolledDice"),
      4,
    );
    const concentrationFrontier = resolveBattleSubject({
      state: released.state,
      subject: released.subject,
      fills: [reactionTargetFill, attackFill, damageFill],
    });
    const reactionConcentrationFill = concentrationSavingThrowFill(
      requireResultHole(concentrationFrontier, "concentrationSavingThrow"),
      false,
    );
    const resumed = resolveBattleSubject({
      state: released.state,
      subject: released.subject,
      fills: [
        reactionTargetFill,
        attackFill,
        damageFill,
        reactionConcentrationFill,
      ],
    });

    expect(resumed).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
    });
    if (resumed.tag !== "needsHoles") return;
    const startDamageFill = damageRollFillWithGroups(
      requireResultHole(resumed, "rolledDice"),
      [[3]],
    );
    const startSaveFrontier = resolveBattleSubject({
      state: resumed.state,
      subject: resumed.subject,
      fills: [startDamageFill],
    });
    expect(startSaveFrontier).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "savingThrowOutcome" }],
    });
    const startSaveFill = singleTargetSavingThrowOutcomeFill(
      requireResultHole(startSaveFrontier, "savingThrowOutcome"),
      spellCasterId,
      false,
    );
    const completed = resolveBattleSubject({
      state: resumed.state,
      subject: resumed.subject,
      fills: [startDamageFill, startSaveFill],
    });
    expect(completed).toMatchObject({
      tag: "resolved",
      snapshot: {
        round: 2,
        currentActorId: spellCasterId,
        pendingInterrupt: null,
      },
    });
    if (completed.tag !== "resolved") return;
    expect(completed.state.combatants.get(spellCasterId)?.hp).toBe(
      sourceHpBeforeStartTurn - 7,
    );
    expect(completed.state.combatants.get(spellCasterId)?.tempHp).toBe(0);
    expect(
      [...completed.state.combatants.values()].flatMap(
        (combatant) => combatant.activeEffects,
      ),
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "cloudkillAreaHazard" }),
      ]),
    );
  });

  test("rejects the former anytime movement-save command", () => {
    const { state } = castCloudkill();

    expect(
      resolveBattleSubject({
        state,
        subject: {
          tag: "runtimeCommand",
          actorId: spellCasterId,
          command: "cloudkillAreaHazardSave",
          areaMembershipTrigger: {
            kind: "areaMovesIntoSpace",
            areaId: cloudkillAreaId,
          },
        },
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Cloudkill movement saves resolve only through the source's start-turn boundary.",
    });
  });

  test("movement holes and generated table facts round-trip through the battle codecs", () => {
    const { movementHole } = sourceTurnMovementBoundary();
    expect(
      Schema.decodeUnknownSync(BattleHoleSchema)(
        Schema.encodeSync(BattleHoleSchema)(movementHole),
      ),
    ).toEqual(movementHole);

    fc.assert(
      fc.property(
        fc.record({
          affectedCombatantIds: fc.shuffledSubarray([
            spellCasterId,
            spellTargetId,
          ]),
        }),
        ({ affectedCombatantIds }) => {
          const fill = {
            kind: "cloudkillMovement" as const,
            holeId: movementHole.holeId,
            value: {
              affectedCombatantIds,
            },
          };
          expect(
            Schema.decodeUnknownSync(BattleFillSchema)(
              Schema.encodeSync(BattleFillSchema)(fill),
            ),
          ).toEqual(fill);
        },
      ),
      { numRuns: 32, seed: 0x381c10d },
    );
  });
});
