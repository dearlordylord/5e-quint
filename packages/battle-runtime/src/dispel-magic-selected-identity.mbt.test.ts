// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-ongoing-spell-ending
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B21-DISPEL-MAGIC-IDENTITY-WITNESS dispel_magic
// UNIT-IDENTITY-MBT-REPLAY: B21-DISPEL-MAGIC-IDENTITY-WITNESS dispel_magic doEndObjectAttachedSpellLight doEndSelectedMagicalEffectActiveEffect doRejectOutOfRangeObjectTarget
import * as path from "node:path";

import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, Round } from "@dnd/shared/types";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";

import { parseBattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import { battleSpellEffectOccurrenceId } from "./identity.ts";
import {
  continualFlameUnitId,
  dispelMagicUnitId,
  heatMetalUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import { requireHole } from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellAct } from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleObjectId,
  resolveBattleSubject,
  type BattleActiveEffect,
  type BattleFill,
  type BattleHole,
  type BattleLightEmitter,
  type BattleResolutionResult,
  type BattleState,
  type BattleTrackedOngoingSpellLightEmitter,
} from "./index.ts";

type OngoingSpellTargetChoiceFill = Extract<
  BattleFill,
  { readonly kind: "ongoingSpellTargetChoice" }
>;
type OngoingSpellTarget = OngoingSpellTargetChoiceFill["value"];
type OngoingSpellTargetWithinRangeFact =
  OngoingSpellTargetChoiceFill["spatialFacts"][number];

type DispelMagicLastResult =
  | "init"
  | "objectSpellLightEnded"
  | "selectedMagicalEffectEnded"
  | "outOfRangeObjectRejected";
type DispelMagicSelectedIdentityState = {
  readonly magicActionAvailable: boolean;
  readonly thirdLevelSlotCommitted: boolean;
  readonly spellLightEmitterCount: number;
  readonly selectedActiveEffectPresent: boolean;
  readonly retainedActiveEffectPresent: boolean;
  readonly lastResult: DispelMagicLastResult;
};
type DispelMagicRuntimeState = {
  readonly battle: BattleState;
  readonly lastResult: DispelMagicLastResult;
};
type BattleSpellEffectOccurrenceId = ReturnType<
  typeof battleSpellEffectOccurrenceId
>;

const selectedObjectId = battleObjectId("selected-dispel-magic-object");
const selectedActiveEffectId = battleSpellEffectOccurrenceId(
  `${spellCasterId}:${heatMetalUnitId}:${selectedObjectId}:selected`,
);
const retainedActiveEffectId = battleSpellEffectOccurrenceId(
  `${spellTargetId}:${heatMetalUnitId}:${selectedObjectId}:retained`,
);

const driverSchema = {
  init: {},
  doEndObjectAttachedSpellLight: {},
  doEndSelectedMagicalEffectActiveEffect: {},
  doRejectOutOfRangeObjectTarget: {},
  step: {},
} as const;

type DispelMagicReplayAction = Exclude<
  keyof typeof driverSchema,
  "init" | "step"
>;
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly DispelMagicReplayAction[];
  readonly expected: DispelMagicSelectedIdentityState;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "B21-DISPEL-MAGIC-IDENTITY-WITNESS";
  readonly unitId: "dispel_magic";
  readonly actions: readonly DispelMagicReplayAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "B21-DISPEL-MAGIC-IDENTITY-WITNESS",
    unitId: "dispel_magic",
    actions: [
      "doEndObjectAttachedSpellLight",
      "doEndSelectedMagicalEffectActiveEffect",
      "doRejectOutOfRangeObjectTarget",
    ],
    sequences: [
      {
        name: "selected-dispel-magic-ends-object-attached-spell-light",
        actions: ["doEndObjectAttachedSpellLight"],
        expected: {
          magicActionAvailable: false,
          thirdLevelSlotCommitted: true,
          spellLightEmitterCount: 0,
          selectedActiveEffectPresent: false,
          retainedActiveEffectPresent: false,
          lastResult: "objectSpellLightEnded",
        },
      },
      {
        name: "selected-dispel-magic-ends-only-selected-active-effect",
        actions: ["doEndSelectedMagicalEffectActiveEffect"],
        expected: {
          magicActionAvailable: false,
          thirdLevelSlotCommitted: true,
          spellLightEmitterCount: 0,
          selectedActiveEffectPresent: false,
          retainedActiveEffectPresent: true,
          lastResult: "selectedMagicalEffectEnded",
        },
      },
      {
        name: "selected-dispel-magic-rejects-out-of-range-object-target",
        actions: ["doRejectOutOfRangeObjectTarget"],
        expected: {
          magicActionAvailable: true,
          thirdLevelSlotCommitted: false,
          spellLightEmitterCount: 1,
          selectedActiveEffectPresent: false,
          retainedActiveEffectPresent: false,
          lastResult: "outOfRangeObjectRejected",
        },
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

const dispelMagicStateCheck = stateCheck(
  normalizeDispelMagicQuintState,
  compareDispelMagicStates,
);

describe("Dispel Magic selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<DispelMagicReplayAction>();

      for (const sequence of replay.sequences) {
        const driver = createDispelMagicSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Dispel Magic selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Dispel Magic selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Dispel Magic selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-dispel-magic-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createDispelMagicSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: dispelMagicStateCheck,
    });
  }, 120_000);
});

function createDispelMagicSelectedIdentityDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();

    return {
      init: () => {
        state = initialRuntimeState();
      },
      doEndObjectAttachedSpellLight: () => {
        state = endObjectAttachedSpellLight();
      },
      doEndSelectedMagicalEffectActiveEffect: () => {
        state = endSelectedMagicalEffectActiveEffect();
      },
      doRejectOutOfRangeObjectTarget: () => {
        state = rejectOutOfRangeObjectTarget();
      },
      step: () => {},
      getState: () => dispelMagicProjection(state),
    };
  });
}

function initialRuntimeState(): DispelMagicRuntimeState {
  return {
    battle: battleWithSpellLightAndActiveEffects(),
    lastResult: "init",
  };
}

function endObjectAttachedSpellLight(): DispelMagicRuntimeState {
  const battle = battleWithLightEmitters([
    objectSpellEmitter({
      objectId: selectedObjectId,
      sourceSpellId: continualFlameUnitId,
      sourceSpellLevel: 2,
    }),
  ]);
  const act = spellAct({
    state: battle,
    spellId: dispelMagicUnitId,
    slotLevel: 3,
  });
  expect(act.subject.invocation).toMatchObject({
    spellId: dispelMagicUnitId,
    procedure: "ongoingSpellEnd",
  });
  const resolved = requireResolved(
    resolveBattleSubject({
      state: battle,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill({
          hole: requireHole(act.initialHoles, "ongoingSpellTargetChoice"),
          target: { kind: "object", objectId: selectedObjectId },
        }),
      ],
    }),
    "Expected selected Dispel Magic object target to resolve.",
  );
  return { battle: resolved.state, lastResult: "objectSpellLightEnded" };
}

function endSelectedMagicalEffectActiveEffect(): DispelMagicRuntimeState {
  const battle = battleWithActiveEffects([
    heatMetalObjectContactDamageEffect({
      objectId: selectedObjectId,
      sourceCombatantId: spellCasterId,
      effectId: selectedActiveEffectId,
    }),
    heatMetalObjectContactDamageEffect({
      objectId: selectedObjectId,
      sourceCombatantId: spellTargetId,
      effectId: retainedActiveEffectId,
    }),
  ]);
  const act = spellAct({
    state: battle,
    spellId: dispelMagicUnitId,
    slotLevel: 3,
  });
  expect(act.subject.invocation).toMatchObject({
    spellId: dispelMagicUnitId,
    procedure: "ongoingSpellEnd",
  });
  const resolved = requireResolved(
    resolveBattleSubject({
      state: battle,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill({
          hole: requireHole(act.initialHoles, "ongoingSpellTargetChoice"),
          target: {
            kind: "magicalEffect",
            effect: {
              kind: "spellActiveEffect",
              activeEffectKind: "spellObjectContactDamage",
              sourceEffectId: selectedActiveEffectId,
            },
          },
        }),
      ],
    }),
    "Expected selected Dispel Magic magical-effect target to resolve.",
  );
  return { battle: resolved.state, lastResult: "selectedMagicalEffectEnded" };
}

function rejectOutOfRangeObjectTarget(): DispelMagicRuntimeState {
  const battle = battleWithLightEmitters([
    objectSpellEmitter({
      objectId: selectedObjectId,
      sourceSpellId: continualFlameUnitId,
      sourceSpellLevel: 2,
    }),
  ]);
  const act = spellAct({
    state: battle,
    spellId: dispelMagicUnitId,
    slotLevel: 3,
  });
  expect(act.subject.invocation).toMatchObject({
    spellId: dispelMagicUnitId,
    procedure: "ongoingSpellEnd",
  });
  const target = { kind: "object" as const, objectId: selectedObjectId };
  const rejected = resolveBattleSubject({
    state: battle,
    subject: act.subject,
    fills: [
      ongoingSpellTargetFill({
        hole: requireHole(act.initialHoles, "ongoingSpellTargetChoice"),
        target,
        facts: [
          ongoingSpellTargetWithinRangeFact({
            target,
            rangeFeet: movementFeet(121),
          }),
        ],
      }),
    ],
  });
  expect(rejected).toMatchObject({
    tag: "invalid",
    reason: "invalidFill",
    message:
      "Ongoing spell target does not satisfy the selected spell's range.",
  });
  return { battle, lastResult: "outOfRangeObjectRejected" };
}

function battleWithLightEmitters(
  lightEmitters: readonly BattleLightEmitter[],
): BattleState {
  return {
    ...spellBattle({
      preparedSpells: [spellRecord(dispelMagicUnitId)],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    }),
    lightEmitters,
  };
}

function battleWithActiveEffects(
  activeEffects: readonly BattleActiveEffect[],
): BattleState {
  const battle = battleWithLightEmitters([]);
  const combatants = new Map(battle.combatants);
  const caster = combatants.get(spellCasterId);
  const target = combatants.get(spellTargetId);
  if (caster === undefined || target === undefined) {
    throw new Error("Expected Dispel Magic fixture combatants.");
  }
  combatants.set(spellCasterId, {
    ...caster,
    concentration: {
      sourceSpellId: heatMetalUnitId,
      effectKind: "spellEffect",
    },
    activeEffects: [
      ...caster.activeEffects,
      ...activeEffects.filter(
        (effect) => effect.sourceCombatantId === spellCasterId,
      ),
    ],
  });
  combatants.set(spellTargetId, {
    ...target,
    concentration: {
      sourceSpellId: heatMetalUnitId,
      effectKind: "spellEffect",
    },
    activeEffects: [
      ...target.activeEffects,
      ...activeEffects.filter(
        (effect) => effect.sourceCombatantId === spellTargetId,
      ),
    ],
  });
  return { ...battle, combatants };
}

function battleWithSpellLightAndActiveEffects(): BattleState {
  return {
    ...battleWithActiveEffects([
      heatMetalObjectContactDamageEffect({
        objectId: selectedObjectId,
        sourceCombatantId: spellCasterId,
        effectId: selectedActiveEffectId,
      }),
      heatMetalObjectContactDamageEffect({
        objectId: selectedObjectId,
        sourceCombatantId: spellTargetId,
        effectId: retainedActiveEffectId,
      }),
    ]),
    lightEmitters: [
      objectSpellEmitter({
        objectId: selectedObjectId,
        sourceSpellId: continualFlameUnitId,
        sourceSpellLevel: 2,
      }),
    ],
  };
}

function objectSpellEmitter(input: {
  readonly objectId: ReturnType<typeof battleObjectId>;
  readonly sourceSpellId: string;
  readonly sourceSpellLevel: number;
}): BattleTrackedOngoingSpellLightEmitter {
  return {
    kind: "spellLightEmitter",
    sourceSpellId: input.sourceSpellId,
    sourceCombatantId: spellTargetId,
    sourceEffectId: battleSpellEffectOccurrenceId(
      `${spellTargetId}:${input.sourceSpellId}:${input.objectId}:selected`,
    ),
    sourceSpellLevel: testBattleSpellEffectLevel(input.sourceSpellLevel),
    attachment: { kind: "object", objectId: input.objectId },
    emission: {
      kind: "brightAndDim",
      brightRadiusFeet: movementFeet(20),
      dimAdditionalFeet: movementFeet(20),
    },
    opaqueCoverInteraction: { kind: "blocksEmission" },
    expiresAt: { kind: "untilDispelled" },
  };
}

function heatMetalObjectContactDamageEffect(input: {
  readonly objectId: ReturnType<typeof battleObjectId>;
  readonly sourceCombatantId: typeof spellCasterId | typeof spellTargetId;
  readonly effectId: ReturnType<typeof battleSpellEffectOccurrenceId>;
}): Extract<BattleActiveEffect, { readonly kind: "spellObjectContactDamage" }> {
  return {
    kind: "spellObjectContactDamage",
    effectId: input.effectId,
    sourceSpellId: heatMetalUnitId,
    sourceCombatantId: input.sourceCombatantId,
    sourceSpellLevel: testBattleSpellEffectLevel(2),
    objectId: input.objectId,
    rangeFeet: movementFeet(60),
    damage: {
      expr: { dice: 2, dieSize: 8 },
      damageType: "fire",
    },
    startedOn: { actorId: input.sourceCombatantId, round: Round(1) },
    expiresAt: {
      kind: "concentration",
      combatantId: input.sourceCombatantId,
      durationTicks: elapsedTimeTicks(10),
    },
  };
}

function dispelMagicProjection(
  state: DispelMagicRuntimeState,
): DispelMagicSelectedIdentityState {
  return {
    magicActionAvailable: canSpendAction(
      state.battle.currentTurnResources,
      "magic",
    ),
    thirdLevelSlotCommitted: state.battle.currentTurnResources
      .spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed" && use.combatantId === spellCasterId,
      ),
    spellLightEmitterCount: state.battle.lightEmitters.filter(
      (emitter) => emitter.kind === "spellLightEmitter",
    ).length,
    selectedActiveEffectPresent: hasActiveEffect(
      state.battle,
      selectedActiveEffectId,
    ),
    retainedActiveEffectPresent: hasActiveEffect(
      state.battle,
      retainedActiveEffectId,
    ),
    lastResult: state.lastResult,
  };
}

function hasActiveEffect(
  state: BattleState,
  effectId: BattleSpellEffectOccurrenceId,
): boolean {
  return [...state.combatants.values()].some((combatant) =>
    combatant.activeEffects.some(
      (effect) =>
        effect.kind === "spellObjectContactDamage" &&
        effect.effectId === effectId,
    ),
  );
}

function ongoingSpellTargetFill(input: {
  readonly hole: Extract<
    BattleHole,
    { readonly kind: "ongoingSpellTargetChoice" }
  >;
  readonly target: OngoingSpellTarget;
  readonly facts?: readonly OngoingSpellTargetWithinRangeFact[];
}): OngoingSpellTargetChoiceFill {
  return {
    kind: "ongoingSpellTargetChoice",
    holeId: input.hole.holeId,
    value: input.target,
    spatialFacts: input.facts ?? [
      ongoingSpellTargetWithinRangeFact({ target: input.target }),
    ],
  };
}

function ongoingSpellTargetWithinRangeFact(input: {
  readonly target: OngoingSpellTarget;
  readonly rangeFeet?: ReturnType<typeof movementFeet>;
}): OngoingSpellTargetWithinRangeFact {
  return {
    kind: "ongoingSpellTargetWithinRange",
    casterId: spellCasterId,
    spellId: dispelMagicUnitId,
    target: input.target,
    rangeFeet: input.rangeFeet ?? movementFeet(120),
  };
}

function testBattleSpellEffectLevel(sourceSpellLevel: number) {
  const parsed = parseBattleSpellEffectLevel(sourceSpellLevel);
  if (parsed === null) {
    throw new Error("Expected test spell effect level to be in range.");
  }
  return parsed;
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

function normalizeDispelMagicQuintState(
  raw: unknown,
): DispelMagicSelectedIdentityState {
  const state = quintStateRecord(raw);
  return {
    magicActionAvailable: booleanField(state, "qMagicActionAvailable"),
    thirdLevelSlotCommitted: booleanField(state, "qThirdLevelSlotCommitted"),
    spellLightEmitterCount: numberFromQuintInt(
      state["qSpellLightEmitterCount"],
      "qSpellLightEmitterCount",
    ),
    selectedActiveEffectPresent: booleanField(
      state,
      "qSelectedActiveEffectPresent",
    ),
    retainedActiveEffectPresent: booleanField(
      state,
      "qRetainedActiveEffectPresent",
    ),
    lastResult: dispelMagicLastResult(state["qLastResult"]),
  };
}

function compareDispelMagicStates(
  runtime: DispelMagicSelectedIdentityState,
  quint: DispelMagicSelectedIdentityState,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw error;
  }
  return true;
}

function dispelMagicLastResult(raw: unknown): DispelMagicLastResult {
  if (
    raw === "init" ||
    raw === "objectSpellLightEnded" ||
    raw === "selectedMagicalEffectEnded" ||
    raw === "outOfRangeObjectRejected"
  ) {
    return raw;
  }
  throw new Error(
    `Unknown Dispel Magic selected identity result ${String(raw)}.`,
  );
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(raw)) {
    throw new Error("Expected Dispel Magic selected identity Quint state.");
  }
  return raw;
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  if (typeof state[field] === "boolean") {
    return state[field];
  }
  throw new Error(`Expected Quint Boolean field ${field}.`);
}

function isRecord(raw: unknown): raw is Readonly<Record<string, unknown>> {
  return typeof raw === "object" && raw !== null;
}
