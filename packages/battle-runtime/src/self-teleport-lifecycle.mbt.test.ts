// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-self-teleport
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SELF_TELEPORT_LIFECYCLE BATTLE.SPELL.ANTIMAGIC_FIELD_TRANSIT_BLOCKING
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-M-P.md#Misty Step:
//   Misty Step is a level 2 Bonus Action spell with range Self that teleports
//   the caster up to 30 feet to an unoccupied space they can see.
// - .references/srd-5.2.1/Rules-Glossary.md#Teleportation:
//   teleportation does not expend Movement, never provokes Opportunity
//   Attacks, and transports equipment the creature is wearing and carrying.
// - .references/srd-5.2.1/Playing-the-Game.md#Bonus Actions and
//   #Opportunity Attacks: a creature can take one Bonus Action on its turn,
//   and teleportation avoids Opportunity Attacks.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Antimagic Field:
//   no one can teleport into or out of the aura or use planar travel there.
// - UBIQUITOUS_LANGUAGE.md: Bonus Action, Spell Slot, Movement,
//   Opportunity Attack, Teleportation, and Holding / Wielding.
import { canSpendBonusAction } from "@dnd/shared-algebras/action-economy-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  MBT_TEST_TIMEOUT_MS,
  assertWitnessProtocolConsistentWithScenario,
  booleanField,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintRecordField,
  quintStateRecord,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import { describe, expect, it } from "vitest";

import type {
  BattleActiveEffect,
  BattleAntimagicFieldAuraMembership,
  BattleAntimagicFieldTransitWitness,
  BattleHole,
  BattleResolutionResult,
  BattleState,
  CombatantId,
} from "./index.ts";
import { resolveBattleSubject, snapshotBattle } from "./index.ts";
import {
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  maybeBonusSpellAct,
  teleportDestinationFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleAreaId,
  battleTablePositionId,
  movementFeet,
} from "./unit-profile-admission-test-support.ts";
import { antimagicFieldTransitInvalidReason } from "./battle-reducer/antimagic-field-transit-blocking.ts";
import {
  antimagicFieldUnitId,
  mistyStepUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";

const LAST_RESULTS = [
  "init",
  "destinationWitnessRequired",
  "selfTeleported",
  "antimagicTransitBlocked",
] as const;
type LastResult = (typeof LAST_RESULTS)[number];
const LAST_RESULT_SET: ReadonlySet<string> = new Set(LAST_RESULTS);

type SelfTeleportProjection = {
  readonly bonusActionAvailable: boolean;
  readonly spellAvailable: boolean;
  readonly destinationWitnessAvailable: boolean;
  readonly destinationWitnessConsumed: boolean;
  readonly teleportEmitted: boolean;
  readonly movementSpentFeet: number;
  readonly movementRemainingFeet: number;
  readonly spellSlotExpended: number;
  readonly spellSlotCommittedThisTurn: boolean;
  readonly noOpportunityAttackProjected: boolean;
  readonly equipmentTransportProjected: boolean;
  readonly destinationDistanceFeet: number;
  readonly destinationInsideAntimagicAuraWitness: boolean;
  readonly antimagicTransitBlocked: boolean;
  readonly lastResult: LastResult;
};

type SelfTeleportOutcome = NonNullable<
  Extract<BattleResolutionResult, { readonly tag: "resolved" }>["teleports"]
>[number];

type SelfTeleportRuntimeState = {
  readonly battle: BattleState;
  readonly lastTeleport: SelfTeleportOutcome | undefined;
  readonly lastAntimagicTransitWitness:
    | BattleAntimagicFieldTransitWitness
    | undefined;
  readonly lastResult: LastResult;
};

const MISTY_STEP_DESTINATION_ID = battleTablePositionId(
  "focused-misty-step-destination",
);
const MISTY_STEP_DESTINATION_DISTANCE_FEET = movementFeet(30);
const ANTIMAGIC_FIELD_AREA_ID = battleAreaId(
  "focused-misty-step-antimagic-field-area",
);

const driverSchema = {
  init: {},
  doRequestDestinationWitness: {},
  doCastSelfTeleport: {},
  doRejectAntimagicDestinationTransit: {},
  doStutter: {},
  step: {},
} as const;

function createSelfTeleportLifecycleDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doRequestDestinationWitness: () => {
        state = requestDestinationWitness(state);
      },
      doCastSelfTeleport: () => {
        state = castSelfTeleport(state);
      },
      doRejectAntimagicDestinationTransit: () => {
        state = castSelfTeleportIntoAntimagicAura(state);
      },
      doStutter: () => {},
      step: () => {},
      getState: () => selfTeleportProjection(state),
    };
  });
}

const selfTeleportStateCheck = stateCheck(
  normalizeSelfTeleportQuintState,
  compareSelfTeleportStates,
);

describe("Self-teleport lifecycle MBT parity", () => {
  it("requires a caller-supplied destination witness before resolving", () => {
    const requested = requestDestinationWitness(initialRuntimeState());

    expect(selfTeleportProjection(requested)).toMatchObject({
      bonusActionAvailable: true,
      spellAvailable: true,
      destinationWitnessAvailable: true,
      destinationWitnessConsumed: false,
      teleportEmitted: false,
      movementSpentFeet: 0,
      movementRemainingFeet: 30,
      spellSlotExpended: 0,
      spellSlotCommittedThisTurn: false,
      noOpportunityAttackProjected: false,
      equipmentTransportProjected: false,
      destinationDistanceFeet: 0,
      destinationInsideAntimagicAuraWitness: false,
      antimagicTransitBlocked: false,
      lastResult: "destinationWitnessRequired",
    });
  });

  it("spends a Bonus Action and Spell Slot for the self-teleport", () => {
    const cast = castSelfTeleport(initialRuntimeState());

    expect(selfTeleportProjection(cast)).toMatchObject({
      bonusActionAvailable: false,
      spellAvailable: false,
      destinationWitnessAvailable: false,
      destinationWitnessConsumed: true,
      teleportEmitted: true,
      movementSpentFeet: 0,
      movementRemainingFeet: 30,
      spellSlotExpended: 1,
      spellSlotCommittedThisTurn: true,
      destinationInsideAntimagicAuraWitness: false,
      antimagicTransitBlocked: false,
      lastResult: "selfTeleported",
    });
  });

  it("projects teleport as non-Movement, non-Opportunity-Attack transport with worn and carried equipment", () => {
    const cast = castSelfTeleport(initialRuntimeState());

    expect(selfTeleportProjection(cast)).toMatchObject({
      teleportEmitted: true,
      movementSpentFeet: 0,
      movementRemainingFeet: 30,
      noOpportunityAttackProjected: true,
      equipmentTransportProjected: true,
      destinationDistanceFeet: 30,
      destinationInsideAntimagicAuraWitness: false,
      antimagicTransitBlocked: false,
      lastResult: "selfTeleported",
    });
    expect(cast.lastTeleport).toMatchObject({
      kind: "selfTeleport",
      actorId: spellCasterId,
      destination: {
        kind: "unoccupiedVisibleDestination",
        destinationId: MISTY_STEP_DESTINATION_ID,
        distanceFeet: MISTY_STEP_DESTINATION_DISTANCE_FEET,
      },
      spendsMovement: false,
      provokesOpportunityAttacks: false,
      transportsWornAndCarriedEquipment: true,
    });
  });

  it("rejects Misty Step into an active Antimagic Field aura from a caller-supplied destination witness", () => {
    const blocked = castSelfTeleportIntoAntimagicAura(initialRuntimeState());

    expect(selfTeleportProjection(blocked)).toMatchObject({
      bonusActionAvailable: true,
      spellAvailable: true,
      destinationWitnessAvailable: true,
      destinationWitnessConsumed: false,
      teleportEmitted: false,
      movementSpentFeet: 0,
      movementRemainingFeet: 30,
      spellSlotExpended: 0,
      spellSlotCommittedThisTurn: false,
      noOpportunityAttackProjected: false,
      equipmentTransportProjected: false,
      destinationDistanceFeet: 0,
      destinationInsideAntimagicAuraWitness: true,
      antimagicTransitBlocked: true,
      lastResult: "antimagicTransitBlocked",
    });
  });

  it("rejects outbound Antimagic Field transit from a caller-supplied destination witness", () => {
    const battle = activeAntimagicAuraState(
      initialRuntimeState().battle,
      auraMembership({
        sourceCombatantId: spellTargetId,
        originIncluded: true,
        nonOriginCombatantIds: [spellCasterId],
      }),
    );

    expect(
      antimagicFieldTransitInvalidReason({
        state: battle,
        actorId: spellCasterId,
        witnesses: [
          {
            kind: "antimagicFieldTransit",
            areaId: ANTIMAGIC_FIELD_AREA_ID,
            sourceCombatantId: spellTargetId,
            originInsideAura: true,
            destinationInsideAura: false,
          },
        ],
      }),
    ).toBe("Teleportation into or out of an Antimagic Field aura is blocked.");
  });

  it("requires an Antimagic Field transit witness for every active aura", () => {
    const battle = activeAntimagicAuraState(
      initialRuntimeState().battle,
      auraMembership({
        sourceCombatantId: spellTargetId,
        originIncluded: true,
        nonOriginCombatantIds: [],
      }),
    );
    const act = requireSelfTeleportAct(battle);
    const destinationHole = requireTeleportDestinationHole(act.initialHoles);

    expect(
      resolveBattleSubject({
        state: battle,
        subject: act.subject,
        fills: [
          teleportDestinationFill({
            hole: destinationHole,
            destinationId: "missing-antimagic-transit-witness",
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Teleport destination table fact must include one Antimagic Field transit witness for each active aura.",
    });
  });

  it(
    "matches the focused self-teleport lifecycle against bounded random MBT traces",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-self-teleport-lifecycle.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createSelfTeleportLifecycleDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(4),
        stateCheck: selfTeleportStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function initialRuntimeState(): SelfTeleportRuntimeState {
  return {
    battle: spellBattle({
      preparedSpells: [spellRecord(mistyStepUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    }),
    lastTeleport: undefined,
    lastAntimagicTransitWitness: undefined,
    lastResult: "init",
  };
}

function requestDestinationWitness(
  state: SelfTeleportRuntimeState,
): SelfTeleportRuntimeState {
  const act = requireSelfTeleportAct(state.battle);
  const destinationHole = requireTeleportDestinationHole(act.initialHoles);
  expect(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [],
    }),
  ).toMatchObject({ tag: "needsHoles", holes: [destinationHole] });
  return {
    ...state,
    lastAntimagicTransitWitness: undefined,
    lastResult: "destinationWitnessRequired",
  };
}

function castSelfTeleport(
  state: SelfTeleportRuntimeState,
): SelfTeleportRuntimeState {
  const act = requireSelfTeleportAct(state.battle);
  const destinationHole = requireTeleportDestinationHole(act.initialHoles);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        teleportDestinationFill({
          hole: destinationHole,
          destinationId: MISTY_STEP_DESTINATION_ID,
          distanceFeet: Number(MISTY_STEP_DESTINATION_DISTANCE_FEET),
        }),
      ],
    }),
    "Expected Misty Step self-teleport to resolve.",
  );
  const teleport = singleSelfTeleportOutcome(resolved);
  return {
    battle: resolved.state,
    lastTeleport: teleport,
    lastAntimagicTransitWitness: undefined,
    lastResult: "selfTeleported",
  };
}

function castSelfTeleportIntoAntimagicAura(
  state: SelfTeleportRuntimeState,
): SelfTeleportRuntimeState {
  const battle = activeAntimagicAuraState(
    state.battle,
    auraMembership({
      sourceCombatantId: spellTargetId,
      originIncluded: true,
      nonOriginCombatantIds: [],
    }),
  );
  const act = requireSelfTeleportAct(battle);
  const destinationHole = requireTeleportDestinationHole(act.initialHoles);
  const transitWitness: BattleAntimagicFieldTransitWitness = {
    kind: "antimagicFieldTransit",
    areaId: ANTIMAGIC_FIELD_AREA_ID,
    sourceCombatantId: spellTargetId,
    originInsideAura: false,
    destinationInsideAura: true,
  };

  expect(
    resolveBattleSubject({
      state: battle,
      subject: act.subject,
      fills: [
        teleportDestinationFill({
          hole: destinationHole,
          destinationId: "misty-step-antimagic-field-destination",
          antimagicFieldTransit: [transitWitness],
        }),
      ],
    }),
  ).toMatchObject({
    tag: "invalid",
    reason: "invalidFill",
    message: "Teleportation into or out of an Antimagic Field aura is blocked.",
  });

  return {
    battle: state.battle,
    lastTeleport: undefined,
    lastAntimagicTransitWitness: transitWitness,
    lastResult: "antimagicTransitBlocked",
  };
}

function selfTeleportProjection(
  state: SelfTeleportRuntimeState,
): SelfTeleportProjection {
  const snapshot = snapshotBattle(state.battle);
  const caster = snapshot.combatants.find(
    (combatant) => combatant.combatantId === spellCasterId,
  );
  if (caster === undefined) {
    throw new Error("Expected self-teleport caster in battle snapshot.");
  }
  const act = maybeSelfTeleportAct(state.battle);
  return {
    bonusActionAvailable: canSpendBonusAction(
      state.battle.currentTurnResources,
    ),
    spellAvailable: act !== undefined,
    destinationWitnessAvailable:
      act?.initialHoles.some((hole) => hole.kind === "teleportDestination") ??
      false,
    destinationWitnessConsumed: state.lastTeleport !== undefined,
    teleportEmitted: state.lastTeleport !== undefined,
    movementSpentFeet: Number(caster.movement.spentFeet),
    movementRemainingFeet: Number(caster.movement.remainingFeet),
    spellSlotExpended: casterSpellSlotExpended(state.battle),
    spellSlotCommittedThisTurn:
      state.battle.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed" && use.combatantId === spellCasterId,
      ),
    noOpportunityAttackProjected:
      state.lastTeleport?.provokesOpportunityAttacks === false,
    equipmentTransportProjected:
      state.lastTeleport?.transportsWornAndCarriedEquipment === true,
    destinationDistanceFeet: Number(
      state.lastTeleport?.destination.distanceFeet ?? 0,
    ),
    destinationInsideAntimagicAuraWitness:
      state.lastAntimagicTransitWitness?.destinationInsideAura === true,
    antimagicTransitBlocked: state.lastResult === "antimagicTransitBlocked",
    lastResult: state.lastResult,
  };
}

function maybeSelfTeleportAct(state: BattleState) {
  const act = maybeBonusSpellAct({
    state,
    spellId: mistyStepUnitId,
    slotLevel: 2,
  });
  return act?.subject.invocation.tag === "spellSlot" &&
    act.subject.invocation.procedure === "selfTeleport"
    ? act
    : undefined;
}

function requireSelfTeleportAct(state: BattleState) {
  const act = maybeSelfTeleportAct(state);
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error("Expected Misty Step self-teleport act.");
  }
  return act;
}

function requireTeleportDestinationHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "teleportDestination" }> {
  return requireHole(holes, "teleportDestination");
}

function requireResolved(
  result: BattleResolutionResult,
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  expect(result).toMatchObject({ tag: "resolved" });
  if (result.tag !== "resolved") {
    throw new Error(message);
  }
  return result;
}

function singleSelfTeleportOutcome(
  result: Extract<BattleResolutionResult, { readonly tag: "resolved" }>,
): SelfTeleportOutcome {
  expect(result.teleports).toHaveLength(1);
  const teleport = result.teleports?.[0];
  if (teleport === undefined) {
    throw new Error("Expected Misty Step self-teleport outcome.");
  }
  return teleport;
}

function casterSpellSlotExpended(state: BattleState): number {
  const caster = requireCombatant(state, spellCasterId);
  if (caster.origin.kind !== "character") {
    return 0;
  }
  const mistyStepSlot = caster.origin.spellcasting?.spellSlots.find(
    (slot) => Number(slot.spellLevel) === 2,
  );
  return Number(mistyStepSlot?.expended ?? 0);
}

function activeAntimagicAuraState(
  state: BattleState,
  aura: TestAntimagicFieldAuraMembership,
): BattleState {
  const combatants = new Map(state.combatants);
  const source = combatants.get(aura.sourceCombatantId);
  if (source === undefined) {
    throw new Error("Antimagic Field test source must be in the battle.");
  }
  combatants.set(aura.sourceCombatantId, {
    ...source,
    activeEffects: [...source.activeEffects, antimagicFieldAuraEffect(aura)],
  });
  return {
    ...state,
    combatants,
  };
}

function antimagicFieldAuraEffect(
  aura: TestAntimagicFieldAuraMembership,
): BattleActiveEffect {
  return {
    kind: "antimagicFieldOngoingSpellSuppression",
    sourceSpellId: antimagicFieldUnitId,
    sourceCombatantId: aura.sourceCombatantId,
    areaId: ANTIMAGIC_FIELD_AREA_ID,
    auraMembership: aura.membership,
    radiusFeet: movementFeet(10),
    suppressedOngoingSpellEffects: [],
    expiresAt: {
      kind: "concentration",
      combatantId: aura.sourceCombatantId,
      durationTicks: elapsedTimeTicks(600),
    },
  };
}

type TestAntimagicFieldAuraMembership = {
  readonly sourceCombatantId: CombatantId;
  readonly membership: BattleAntimagicFieldAuraMembership;
};

function auraMembership(input: {
  readonly sourceCombatantId: CombatantId;
  readonly originIncluded: boolean;
  readonly nonOriginCombatantIds: readonly CombatantId[];
}): TestAntimagicFieldAuraMembership {
  return {
    sourceCombatantId: input.sourceCombatantId,
    membership: {
      kind: "antimagicFieldAuraMembership",
      originIncluded: input.originIncluded,
      nonOriginCombatantIds: input.nonOriginCombatantIds,
    },
  };
}

function normalizeSelfTeleportQuintState(raw: unknown): SelfTeleportProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const scenarioResult = lastResult(state["scenarioResult"]);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: selfTeleportUnexpectedHole,
  });
  assertWitnessProtocolConsistentWithScenario({
    label: "self teleport",
    scenarioResult,
    protocol,
  });
  return {
    bonusActionAvailable: booleanField(state, "bonusActionAvailable"),
    spellAvailable: booleanField(state, "spellAvailable"),
    destinationWitnessAvailable: booleanField(
      state,
      "destinationWitnessAvailable",
    ),
    destinationWitnessConsumed: booleanField(
      state,
      "destinationWitnessConsumed",
    ),
    teleportEmitted: booleanField(state, "teleportEmitted"),
    movementSpentFeet: numberFromQuintInt(
      state["movementSpentFeet"],
      "qState.movementSpentFeet",
    ),
    movementRemainingFeet: numberFromQuintInt(
      state["movementRemainingFeet"],
      "qState.movementRemainingFeet",
    ),
    spellSlotExpended: numberFromQuintInt(
      state["spellSlotExpended"],
      "qState.spellSlotExpended",
    ),
    spellSlotCommittedThisTurn: booleanField(
      state,
      "spellSlotCommittedThisTurn",
    ),
    noOpportunityAttackProjected: booleanField(
      state,
      "noOpportunityAttackProjected",
    ),
    equipmentTransportProjected: booleanField(
      state,
      "equipmentTransportProjected",
    ),
    destinationDistanceFeet: numberFromQuintInt(
      state["destinationDistanceFeet"],
      "qState.destinationDistanceFeet",
    ),
    destinationInsideAntimagicAuraWitness: booleanField(
      state,
      "destinationInsideAntimagicAuraWitness",
    ),
    antimagicTransitBlocked: booleanField(state, "antimagicTransitBlocked"),
    lastResult: scenarioResult,
  };
}

function compareSelfTeleportStates(
  runtime: SelfTeleportProjection,
  quint: SelfTeleportProjection,
): boolean {
  expect(runtime).toStrictEqual(quint);
  return true;
}

function lastResult(raw: unknown): LastResult {
  expect(raw).toBeTypeOf("string");
  if (typeof raw !== "string" || !isLastResult(raw)) {
    throw new Error(`Unexpected self-teleport result ${String(raw)}.`);
  }
  return raw;
}

function isLastResult(value: string): value is LastResult {
  return LAST_RESULT_SET.has(value);
}

function selfTeleportUnexpectedHole(raw: unknown): never {
  throw new Error(
    `Self-teleport witness does not expect holes; received ${String(raw)}.`,
  );
}
