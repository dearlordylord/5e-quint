// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-antimagic-field-ongoing-spell-suppression
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt B19-ANTIMAGIC-FIELD-IDENTITY-WITNESS antimagic_field
// UNIT-IDENTITY-MBT-REPLAY: B19-ANTIMAGIC-FIELD-IDENTITY-WITNESS antimagic_field doSuppressOrdinarySpell doSuppressArtifactSpell doBreakAntimagicConcentration
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.ANTIMAGIC_FIELD_ONGOING_SUPPRESSION
import { abilityModifier } from "@dnd/shared-algebras/armor-class-algebra";
import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  attackBonus,
  movementFeet,
  proficiencyBonus,
  Round,
} from "@dnd/shared/types";
import { describe, expect, it } from "vitest";

import { parseBattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import { ongoingSpellEffectSuppressedByAntimagicField } from "./battle-reducer/antimagic-field-suppression.ts";
import { battleSpellEffectOccurrenceId } from "./identity.ts";
import {
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  maybeSpellAct,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  antimagicFieldUnitId,
  spellCasterId,
  spellTargetId,
  spiritualWeaponUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintStateRecord,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  battleAreaId,
  battleTablePositionId,
  breakBattleConcentration,
  endTurn,
  resolveBattleSubject,
  type BattleActiveEffect,
  type BattleAntimagicFieldAffectedOngoingSpellEffect,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
} from "./index.ts";

const antimagicFieldAreaId = battleAreaId("focused-antimagic-field-area");
const spiritualWeaponEffectId = battleSpellEffectOccurrenceId(
  "focused-antimagic-spiritual-weapon",
);

type AntimagicLastResult =
  | "init"
  | "suppressedOrdinarySpell"
  | "suppressedArtifactSpell"
  | "restored";
type AntimagicSuppressionSourceKind = Extract<
  BattleAntimagicFieldAffectedOngoingSpellEffect["sourceKind"],
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
  readonly battle: BattleState;
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
      sourceClassName: "wizard",
      spellcastingAbilityModifier: abilityModifier(3),
      proficiencyBonus: proficiencyBonus(2),
      canCastSpells: true,
      cantrips: [],
      preparedSpells: [spellRecord(antimagicFieldUnitId)],
      featurePreparedSpells: [],
      spellbookRitualSpellAccesses: [],
      invocationSpellAccesses: [],
      spellSlots: [{ spellLevel: 8, count: 1 }],
    },
  });
  const caster = requireCombatant(base, spellCasterId);
  const withOngoingSpell = {
    ...base,
    combatants: new Map(base.combatants).set(spellCasterId, {
      ...caster,
      activeEffects: [spiritualWeaponActiveEffect()],
      concentration: {
        sourceSpellId: spiritualWeaponUnitId,
        effectKind: "spellEffect",
      },
    }),
  };
  const targetTurn = requireResolved(
    endTurn({ state: withOngoingSpell, actorId: spellCasterId }),
    "Expected target turn setup to resolve.",
  );
  return { battle: targetTurn.state, lastResult: "init" };
}

function suppressOngoingSpell(
  state: AntimagicRuntimeState,
  sourceKind: AntimagicSuppressionSourceKind,
): AntimagicRuntimeState {
  const act = spellAct({
    state: state.battle,
    spellId: antimagicFieldUnitId,
    slotLevel: 8,
  });
  const areaHole = requireHole(act.initialHoles, "spellAreaChoice");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        antimagicFieldAreaFill({
          hole: areaHole,
          affectedOngoingSpellEffects: [
            antimagicAffectedSpiritualWeapon(sourceKind),
          ],
        }),
      ],
    }),
    "Expected Antimagic Field suppression to resolve.",
  );
  assertSuppressionActiveEffectShape(resolved.state, sourceKind);
  return {
    battle: resolved.state,
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
    battle: breakBattleConcentration(state.battle, spellTargetId),
    lastResult: "restored",
  };
}

function antimagicProjection(
  state: AntimagicRuntimeState,
): AntimagicFieldOngoingSuppressionState {
  const antimagicCaster = requireCombatant(state.battle, spellTargetId);
  const ongoingCaster = requireCombatant(state.battle, spellCasterId);
  const suppression = antimagicSuppressionEffect(state.battle);
  const ongoingSpell = ongoingCaster.activeEffects.find(
    (effect) =>
      effect.kind === "spiritualWeapon" &&
      effect.sourceEffectId === spiritualWeaponEffectId,
  );
  const ongoingSpellRef = {
    kind: "spellActiveEffect" as const,
    activeEffectKind: "spiritualWeapon" as const,
    sourceEffectId: spiritualWeaponEffectId,
  };
  const projection = {
    actionAvailable: canSpendAction(state.battle.currentTurnResources, "magic"),
    spellAvailable:
      maybeSpellAct({
        state: state.battle,
        spellId: antimagicFieldUnitId,
        slotLevel: 8,
      }) !== undefined,
    ongoingSpellEffectActive: ongoingSpell !== undefined,
    suppressionActive: suppression !== undefined,
    suppressedEffectRefCount:
      suppression?.suppressedOngoingSpellEffects.length ?? 0,
    ongoingSpellSuppressed: ongoingSpellEffectSuppressedByAntimagicField(
      state.battle,
      ongoingSpellRef,
    ),
    antimagicCasterConcentrating:
      antimagicCaster.concentration?.sourceSpellId === antimagicFieldUnitId &&
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
  readonly affectedOngoingSpellEffects: readonly BattleAntimagicFieldAffectedOngoingSpellEffect[];
}): Extract<BattleFill, { readonly kind: "spellAreaChoice" }> {
  return {
    kind: "spellAreaChoice",
    holeId: input.hole.holeId,
    value: {
      kind: "antimagicFieldSelfEmanation",
      areaId: antimagicFieldAreaId,
      auraMembership: {
        kind: "antimagicFieldAuraMembership",
        originIncluded: true,
        nonOriginCombatantIds: [],
      },
      affectedOngoingSpellEffects: input.affectedOngoingSpellEffects,
    },
  };
}

function antimagicAffectedSpiritualWeapon(
  sourceKind: AntimagicSuppressionSourceKind,
): BattleAntimagicFieldAffectedOngoingSpellEffect {
  return {
    kind: "antimagicFieldAffectedOngoingSpellEffect",
    effect: {
      kind: "spellActiveEffect",
      activeEffectKind: "spiritualWeapon",
      sourceEffectId: spiritualWeaponEffectId,
    },
    sourceKind,
  };
}

function assertSuppressionActiveEffectShape(
  state: BattleState,
  sourceKind: AntimagicSuppressionSourceKind,
): void {
  const expectedSuppressedEffects =
    sourceKind === "ordinarySpell"
      ? [
          {
            kind: "spellActiveEffect",
            activeEffectKind: "spiritualWeapon",
            sourceEffectId: spiritualWeaponEffectId,
          },
        ]
      : [];
  expect(antimagicSuppressionEffect(state)).toMatchObject({
    kind: "antimagicFieldOngoingSpellSuppression",
    sourceSpellId: antimagicFieldUnitId,
    sourceCombatantId: spellTargetId,
    areaId: antimagicFieldAreaId,
    radiusFeet: movementFeet(10),
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
  | Extract<
      BattleActiveEffect,
      { readonly kind: "antimagicFieldOngoingSpellSuppression" }
    >
  | undefined {
  return requireCombatant(state, spellTargetId).activeEffects.find(
    (
      effect,
    ): effect is Extract<
      BattleActiveEffect,
      { readonly kind: "antimagicFieldOngoingSpellSuppression" }
    > =>
      effect.kind === "antimagicFieldOngoingSpellSuppression" &&
      effect.sourceSpellId === antimagicFieldUnitId &&
      effect.sourceCombatantId === spellTargetId &&
      effect.areaId === antimagicFieldAreaId,
  );
}

function spiritualWeaponActiveEffect(): Extract<
  BattleActiveEffect,
  { readonly kind: "spiritualWeapon" }
> {
  const sourceSpellLevel = parseBattleSpellEffectLevel(2);
  if (sourceSpellLevel === null) {
    throw new Error("Expected valid Spiritual Weapon spell effect level.");
  }
  return {
    kind: "spiritualWeapon",
    sourceEffectId: spiritualWeaponEffectId,
    sourceSpellId: spiritualWeaponUnitId,
    sourceCombatantId: spellCasterId,
    sourceSpellLevel,
    forcePositionId: battleTablePositionId(
      "focused-antimagic-spiritual-weapon-force",
    ),
    forceReachFeet: movementFeet(5),
    repeatMoveMaxFeet: movementFeet(20),
    startedOn: {
      actorId: spellTargetId,
      round: Round(1),
    },
    damage: {
      kind: "fixedSpellAttackDamage",
      expr: { dice: 1, dieSize: 8, flat: 3 },
      damageType: "force",
    },
    attackKind: "melee_spell_attack",
    attackBonus: attackBonus(5),
    expiresAt: {
      kind: "concentration",
      combatantId: spellCasterId,
      durationTicks: elapsedTimeTicks(3),
    },
  };
}

function normalizeAntimagicQuintState(
  raw: unknown,
): AntimagicFieldOngoingSuppressionState {
  const state = quintStateRecord(raw);
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
    lastResult: antimagicLastResult(state["qLastResult"]),
  };
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
  if (
    raw === "init" ||
    raw === "suppressedOrdinarySpell" ||
    raw === "suppressedArtifactSpell" ||
    raw === "restored"
  ) {
    return raw;
  }
  throw new Error(`Unknown Antimagic Field result: ${String(raw)}.`);
}
