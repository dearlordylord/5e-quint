import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleProcedureExecutionRefForTest } from "./battle-runtime.test-support.ts";
import { resolveBattleSubject } from "./battle-runtime.test-support.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-magic-suppression-emanation
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay B19-ANTIMAGIC-FIELD-IDENTITY-WITNESS antimagic_field
// UNIT-IDENTITY-REPLAY: B19-ANTIMAGIC-FIELD-IDENTITY-WITNESS antimagic_field doSuppressOrdinarySpell doSuppressArtifactSpell doBreakAntimagicConcentration
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.ANTIMAGIC_FIELD_ONGOING_SUPPRESSION
import { abilityModifier } from "@dnd/shared-algebras/armor-class-algebra";
import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { proficiencyBonus, Round } from "@dnd/shared/types";
import { describe, expect, it } from "vitest";

import { ongoingSpellEffectSuppressedByMagicSuppressionEmanation } from "./battle-reducer/magic-suppression-ongoing-effect.ts";
import {
  allocateBattleEffectExecutionRefForCreature,
  type BattleActiveEffectOccurrenceTemplate,
} from "./effect-execution-ref.ts";
import {
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  maybeSpellAct,
  spellAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  antimagicFieldUnitId,
  spellCasterId,
  spellTargetId,
  spiritualWeaponUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
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
  quintVariantTag,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import {
  battleAreaId,
  battleTablePositionId,
  breakBattleConcentration,
  endTurn,
  type BattleActiveEffect,
  type BattleMagicSuppressionAffectedOngoingSpellEffect,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  type BattleState,
} from "./index.ts";

const antimagicFieldAreaId = battleAreaId("focused-antimagic-field-area");

type SpiritualWeaponEffectRef = Extract<
  BattleActiveEffect,
  { readonly kind: "spatialMeleeSpellAttackProxy" }
>["effectRef"];

type AntimagicLastResult =
  | "init"
  | "suppressedOrdinarySpell"
  | "suppressedArtifactSpell"
  | "restored";
const ANTIMAGIC_FIELD_ONGOING_SUPPRESSION_SCENARIO_OUTCOME_BY_TAG: Readonly<
  Record<string, AntimagicLastResult>
> = {
  Init: "init",
  SuppressedOrdinarySpell: "suppressedOrdinarySpell",
  SuppressedArtifactSpell: "suppressedArtifactSpell",
  Restored: "restored",
} as const;

type AntimagicSuppressionSourceKind = Extract<
  BattleMagicSuppressionAffectedOngoingSpellEffect["sourceKind"],
  "ordinarySpell" | "artifact"
>;

type AntimagicFieldOngoingSuppressionState = {
  readonly actionAvailable: boolean;
  readonly spellAvailable: boolean;
  readonly ongoingSpellEffectActive: boolean;
  readonly suppressionActive: boolean;
  readonly suppressedEffectRefCount: number;
  readonly ongoingSpellSuppressed: boolean;
  readonly antimagicCasterConcentrating: boolean;
  readonly lastResult: AntimagicLastResult;
};

type AntimagicRuntimeState = {
  readonly battle: BattleRuntimeSession;
  readonly lastResult: AntimagicLastResult;
};

const driverSchema = {
  init: {},
  doSuppressOrdinarySpell: {},
  doSuppressArtifactSpell: {},
  doBreakAntimagicConcentration: {},
  step: {},
} as const;

type AntimagicFieldOngoingSuppressionReplayAction = Exclude<
  keyof typeof driverSchema,
  "init" | "step"
>;
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly AntimagicFieldOngoingSuppressionReplayAction[];
  readonly expected: AntimagicFieldOngoingSuppressionState;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "B19-ANTIMAGIC-FIELD-IDENTITY-WITNESS";
  readonly unitId: "antimagic_field";
  readonly actions: readonly AntimagicFieldOngoingSuppressionReplayAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const selectedUnitIdentityReplays = [
  {
    taskId: "B19-ANTIMAGIC-FIELD-IDENTITY-WITNESS",
    unitId: "antimagic_field",
    actions: [
      "doSuppressOrdinarySpell",
      "doSuppressArtifactSpell",
      "doBreakAntimagicConcentration",
    ],
    sequences: [
      {
        name: "selected-antimagic-field-suppresses-ordinary-ongoing-spell",
        actions: ["doSuppressOrdinarySpell"],
        expected: {
          actionAvailable: false,
          spellAvailable: false,
          ongoingSpellEffectActive: true,
          suppressionActive: true,
          suppressedEffectRefCount: 1,
          ongoingSpellSuppressed: true,
          antimagicCasterConcentrating: true,
          lastResult: "suppressedOrdinarySpell",
        },
      },
      {
        name: "selected-antimagic-field-excludes-artifact-ongoing-spell",
        actions: ["doSuppressArtifactSpell"],
        expected: {
          actionAvailable: false,
          spellAvailable: false,
          ongoingSpellEffectActive: true,
          suppressionActive: true,
          suppressedEffectRefCount: 0,
          ongoingSpellSuppressed: false,
          antimagicCasterConcentrating: true,
          lastResult: "suppressedArtifactSpell",
        },
      },
      {
        name: "selected-antimagic-field-concentration-end-restores-ordinary-ongoing-spell",
        actions: ["doSuppressOrdinarySpell", "doBreakAntimagicConcentration"],
        expected: {
          actionAvailable: false,
          spellAvailable: false,
          ongoingSpellEffectActive: true,
          suppressionActive: false,
          suppressedEffectRefCount: 0,
          ongoingSpellSuppressed: false,
          antimagicCasterConcentrating: false,
          lastResult: "restored",
        },
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

function createAntimagicFieldOngoingSuppressionDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doSuppressOrdinarySpell: () => {
        state = suppressOngoingSpell(state, "ordinarySpell");
      },
      doSuppressArtifactSpell: () => {
        state = suppressOngoingSpell(state, "artifact");
      },
      doBreakAntimagicConcentration: () => {
        state = breakAntimagicConcentration(state);
      },
      step: () => {},
      getState: () => antimagicProjection(state),
    };
  });
}

const antimagicStateCheck = stateCheck(
  normalizeAntimagicQuintState,
  compareAntimagicStates,
);

describe("Antimagic Field ongoing suppression MBT parity", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<AntimagicFieldOngoingSuppressionReplayAction>();

      for (const sequence of replay.sequences) {
        const driver = createAntimagicFieldOngoingSuppressionDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Antimagic Field selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Antimagic Field selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("records ordinary ongoing spell effects as suppressed without deleting them", () => {
    const suppressed = suppressOngoingSpell(
      initialRuntimeState(),
      "ordinarySpell",
    );

    expect(antimagicProjection(suppressed)).toMatchObject({
      ongoingSpellEffectActive: true,
      suppressionActive: true,
      suppressedEffectRefCount: 1,
      ongoingSpellSuppressed: true,
      antimagicCasterConcentrating: true,
      lastResult: "suppressedOrdinarySpell",
    });
  });

  it("does not record artifact-sourced ongoing spell effects as suppressed", () => {
    const suppressed = suppressOngoingSpell(initialRuntimeState(), "artifact");

    expect(antimagicProjection(suppressed)).toMatchObject({
      ongoingSpellEffectActive: true,
      suppressionActive: true,
      suppressedEffectRefCount: 0,
      ongoingSpellSuppressed: false,
      antimagicCasterConcentrating: true,
      lastResult: "suppressedArtifactSpell",
    });
  });

  it("restores ongoing spell effects when Antimagic Field concentration ends", () => {
    const suppressed = suppressOngoingSpell(
      initialRuntimeState(),
      "ordinarySpell",
    );
    const restored = breakAntimagicConcentration(suppressed);

    expect(antimagicProjection(restored)).toMatchObject({
      ongoingSpellEffectActive: true,
      suppressionActive: false,
      suppressedEffectRefCount: 0,
      ongoingSpellSuppressed: false,
      antimagicCasterConcentrating: false,
      lastResult: "restored",
    });
  });

  it(
    "matches the TS reducer slice against bounded random MBT traces",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-antimagic-field-ongoing-suppression.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createAntimagicFieldOngoingSuppressionDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(4),
        stateCheck: antimagicStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function initialRuntimeState(): AntimagicRuntimeState {
  const base = spellBattle({
    preparedSpells: [spellRecord(spiritualWeaponUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    targetSpellcasting: {
      spellcastingSource: {
        tag: "classSpellcasting",
        className: "wizard",
        abilityModifier: abilityModifier(3),
      },
      proficiencyBonus: proficiencyBonus(2),
      canCastSpells: true,
      cantrips: [],
      preparedSpells: [spellRecord(antimagicFieldUnitId)],
      featurePreparedSpells: [],
      spellAccesses: [],
      spellbookRitualSpellAccesses: [],
      invocationSpellAccesses: [],
      spellSlots: [{ spellLevel: 8, count: 1 }],
    },
  });
  const caster = requireCombatant(base.state, spellCasterId);
  const effectAllocation = allocateBattleEffectExecutionRefForCreature({
    owner: caster,
  });
  const ongoingSpell = {
    ...spatialMeleeSpellAttackProxyActiveEffectTemplate(),
    effectRef: effectAllocation.effectRef,
  };
  const withOngoingSpell = battleRuntimeSessionForTest({
    ...base,
    state: {
      ...base.state,
      combatants: new Map(base.state.combatants).set(spellCasterId, {
        ...effectAllocation.owner,
        activeEffects: [ongoingSpell],
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            "spiritual-weapon-effect-fixture",
          ),
          effectKind: "spellEffect",
        },
      }),
    },
  });
  expect(
    Number(
      requireCombatant(withOngoingSpell.state, spellCasterId).nextEffectOrdinal,
    ),
  ).toBe(Number(caster.nextEffectOrdinal) + 1);
  expect(
    requireSpiritualWeaponActiveEffect(withOngoingSpell.state).effectRef,
  ).toBe(effectAllocation.effectRef);
  const targetTurn = requireResolved(
    endTurn({ state: withOngoingSpell.state, actorId: spellCasterId }),
    "Expected target turn setup to resolve.",
  );
  return {
    battle: battleRuntimeSessionForTest({
      ...withOngoingSpell,
      state: targetTurn.state,
    }),
    lastResult: "init",
  };
}

function suppressOngoingSpell(
  state: AntimagicRuntimeState,
  sourceKind: AntimagicSuppressionSourceKind,
): AntimagicRuntimeState {
  const ongoingSpellEffectRef = requireSpiritualWeaponActiveEffect(
    state.battle.state,
  ).effectRef;
  const act = spellAct({
    session: state.battle,
    spellId: antimagicFieldUnitId,
    slotLevel: 8,
  });
  const areaHole = requireHole(act.initialHoles, "spellAreaChoice");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle.state,
      subject: act.subject,
      fills: [
        antimagicFieldAreaFill({
          hole: areaHole,
          affectedOngoingSpellEffects: [
            antimagicAffectedSpiritualWeapon(sourceKind, ongoingSpellEffectRef),
          ],
        }),
      ],
    }),
    "Expected Antimagic Field suppression to resolve.",
  );
  assertSuppressionActiveEffectShape(
    resolved.state,
    sourceKind,
    ongoingSpellEffectRef,
  );
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
    lastResult:
      sourceKind === "ordinarySpell"
        ? "suppressedOrdinarySpell"
        : "suppressedArtifactSpell",
  };
}

function breakAntimagicConcentration(
  state: AntimagicRuntimeState,
): AntimagicRuntimeState {
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: breakBattleConcentration(state.battle.state, spellTargetId),
    }),
    lastResult: "restored",
  };
}

function antimagicProjection(
  state: AntimagicRuntimeState,
): AntimagicFieldOngoingSuppressionState {
  const antimagicCaster = requireCombatant(state.battle.state, spellTargetId);
  const suppression = antimagicSuppressionEffect(state.battle.state);
  const ongoingSpell = requireSpiritualWeaponActiveEffect(state.battle.state);
  const ongoingSpellRef = {
    kind: "spellActiveEffect" as const,
    activeEffectKind: "spatialMeleeSpellAttackProxy" as const,
    effectRef: ongoingSpell.effectRef,
  };
  const projection = {
    actionAvailable: canSpendAction(
      state.battle.state.currentTurnResources,
      "magic",
    ),
    spellAvailable:
      maybeSpellAct({
        session: state.battle,
        spellId: antimagicFieldUnitId,
        slotLevel: 8,
      }) !== undefined,
    ongoingSpellEffectActive: ongoingSpell !== undefined,
    suppressionActive: suppression !== undefined,
    suppressedEffectRefCount:
      suppression?.suppressedOngoingSpellEffects.length ?? 0,
    ongoingSpellSuppressed:
      ongoingSpellEffectSuppressedByMagicSuppressionEmanation(
        state.battle.state,
        ongoingSpellRef,
      ),
    antimagicCasterConcentrating:
      suppression !== undefined &&
      antimagicCaster.concentration?.sourceProcedureRef ===
        suppression.sourceProcedureRef &&
      antimagicCaster.concentration.effectKind === "spellEffect",
    lastResult: state.lastResult,
  };
  expect(projection.ongoingSpellEffectActive).toBe(true);
  expect(projection.suppressionActive).toBe(
    projection.antimagicCasterConcentrating,
  );
  return projection;
}

function antimagicFieldAreaFill(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "spellAreaChoice" }>;
  readonly affectedOngoingSpellEffects: readonly BattleMagicSuppressionAffectedOngoingSpellEffect[];
}): Extract<BattleFill, { readonly kind: "spellAreaChoice" }> {
  return {
    kind: "spellAreaChoice",
    holeId: input.hole.holeId,
    value: {
      kind: "magicSuppressionSelfEmanation",
      areaId: antimagicFieldAreaId,
      auraMembership: {
        kind: "magicSuppressionEmanationMembership",
        originIncluded: true,
        nonOriginCombatantIds: [],
      },
      affectedOngoingSpellEffects: input.affectedOngoingSpellEffects,
    },
  };
}

function antimagicAffectedSpiritualWeapon(
  sourceKind: AntimagicSuppressionSourceKind,
  effectRef: SpiritualWeaponEffectRef,
): BattleMagicSuppressionAffectedOngoingSpellEffect {
  return {
    kind: "magicSuppressionAffectedOngoingSpellEffect",
    effect: {
      kind: "spellActiveEffect",
      activeEffectKind: "spatialMeleeSpellAttackProxy",
      effectRef,
    },
    sourceKind,
  };
}

function assertSuppressionActiveEffectShape(
  state: BattleState,
  sourceKind: AntimagicSuppressionSourceKind,
  effectRef: SpiritualWeaponEffectRef,
): void {
  const expectedSuppressedEffects =
    sourceKind === "ordinarySpell"
      ? [
          {
            kind: "spellActiveEffect",
            activeEffectKind: "spatialMeleeSpellAttackProxy",
            effectRef,
          },
        ]
      : [];
  expect(antimagicSuppressionEffect(state)).toMatchObject({
    kind: "magicSuppressionEmanation",
    sourceCombatantId: spellTargetId,
    areaId: antimagicFieldAreaId,
    suppressedOngoingSpellEffects: expectedSuppressedEffects,
    expiresAt: {
      kind: "concentration",
      combatantId: spellTargetId,
      durationTicks: elapsedTimeTicks(600),
    },
  });
}

function antimagicSuppressionEffect(
  state: BattleState,
):
  | Extract<BattleActiveEffect, { readonly kind: "magicSuppressionEmanation" }>
  | undefined {
  return requireCombatant(state, spellTargetId).activeEffects.find(
    (
      effect,
    ): effect is Extract<
      BattleActiveEffect,
      { readonly kind: "magicSuppressionEmanation" }
    > =>
      effect.kind === "magicSuppressionEmanation" &&
      effect.sourceCombatantId === spellTargetId &&
      effect.areaId === antimagicFieldAreaId,
  );
}

function spatialMeleeSpellAttackProxyActiveEffectTemplate(): Extract<
  BattleActiveEffectOccurrenceTemplate,
  { readonly kind: "spatialMeleeSpellAttackProxy" }
> {
  return {
    kind: "spatialMeleeSpellAttackProxy",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      "spiritual-weapon-effect-fixture",
    ),
    sourceCombatantId: spellCasterId,
    forcePositionId: battleTablePositionId(
      "focused-antimagic-spiritual-weapon-force",
    ),
    startedOn: {
      actorId: spellTargetId,
      round: Round(1),
    },
    expiresAt: {
      kind: "concentration",
      combatantId: spellCasterId,
      durationTicks: elapsedTimeTicks(3),
    },
  };
}

function requireSpiritualWeaponActiveEffect(state: BattleState) {
  const effect = requireCombatant(state, spellCasterId).activeEffects.find(
    (candidate) => candidate.kind === "spatialMeleeSpellAttackProxy",
  );
  if (effect?.kind !== "spatialMeleeSpellAttackProxy") {
    throw new Error("Expected allocated Spiritual Weapon active effect.");
  }
  return effect;
}

function normalizeAntimagicQuintState(
  raw: unknown,
): AntimagicFieldOngoingSuppressionState {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const scenarioResult = antimagicLastResult(state["qScenarioOutcome"]);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: antimagicOngoingSuppressionUnexpectedHole,
  });
  if (protocol.holes.length !== 0) {
    throw new Error(
      "Expected Antimagic Field ongoing suppression witness holes to be empty.",
    );
  }
  assertWitnessProtocolConsistentWithScenario({
    label: "Antimagic Field ongoing suppression",
    scenarioOutcome: scenarioResult,
    protocol,
  });
  return {
    actionAvailable: booleanField(state, "qActionAvailable"),
    spellAvailable: booleanField(state, "qSpellAvailable"),
    ongoingSpellEffectActive: booleanField(state, "qOngoingSpellEffectActive"),
    suppressionActive: booleanField(state, "qSuppressionActive"),
    suppressedEffectRefCount: numberFromQuintInt(
      state["qSuppressedEffectRefCount"],
      "qSuppressedEffectRefCount",
    ),
    ongoingSpellSuppressed: booleanField(state, "qOngoingSpellSuppressed"),
    antimagicCasterConcentrating: booleanField(
      state,
      "qAntimagicCasterConcentrating",
    ),
    lastResult: scenarioResult,
  };
}

function antimagicOngoingSuppressionUnexpectedHole(raw: unknown): never {
  throw new Error(
    `Antimagic Field ongoing suppression witness does not expect holes; received ${String(raw)}.`,
  );
}

function compareAntimagicStates(
  runtime: AntimagicFieldOngoingSuppressionState,
  quint: AntimagicFieldOngoingSuppressionState,
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

function antimagicLastResult(raw: unknown): AntimagicLastResult {
  const tag = quintVariantTag(raw, "qScenarioOutcome");
  const value =
    ANTIMAGIC_FIELD_ONGOING_SUPPRESSION_SCENARIO_OUTCOME_BY_TAG[tag];
  if (value !== undefined) {
    return value;
  }
  throw new Error(
    `Expected Quint scenario outcome variant qScenarioOutcome, got ${tag}.`,
  );
}
