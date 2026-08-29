import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectOccurrencesForTest,
} from "./battle-runtime.test-support.ts";
import { resolveBattleSubject } from "./battle-runtime.test-support.ts";
import { antimagicFieldAuraMembershipForTest } from "./antimagic-field.test-support.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-ongoing-spell-ending
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.DISPEL_MAGIC_ONGOING_SPELL_ENDING
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Dispel Magic:
//   choose a creature, object, or magical effect within range; ongoing spells
//   at or below the Dispel Magic slot level end; higher-level ongoing spells
//   require a spellcasting ability check against DC 10 plus that spell level;
//   higher-level slots automatically end same-or-lower-level ongoing spells.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Antimagic Field:
//   Dispel Magic has no effect on the aura.
// - .references/srd-5.2.1/Playing-the-Game.md#Ability Checks:
//   ability checks compare the total to a Difficulty Class.
// - UBIQUITOUS_LANGUAGE.md: Ability Check, Difficulty Class, Magic Action,
//   Spell Slot, and Concentration.
import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, Round } from "@dnd/shared/types";
import { describe, expect, it } from "vitest";

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
import { parseBattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import type {
  BattleOngoingSpellTarget,
  BattleOngoingSpellTargetWithinRangeFact,
  BattleStoredLightEmitterTemplate,
} from "./battle-state-execution.ts";
import type { BattleActiveEffectOccurrenceTemplate } from "./effect-execution-ref.ts";
import { battleSpellEffectOccurrenceId } from "./identity.ts";
import {
  antimagicFieldUnitId,
  continualFlameUnitId,
  dispelMagicUnitId,
  heatMetalUnitId,
  spellCasterId,
  spellTargetId,
  type ActionSpellAct,
} from "./unit-profile-admission-catalog.test-support.ts";
import { requireCombatant } from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { spellAct } from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  battleAreaId,
  battleObjectId,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  type BattleState,
  type BattleProcedureExecutionRef,
  type CharacterBattleCreatureState,
} from "./index.ts";
type LastResult =
  | "init"
  | "needsHigherLevelCheck"
  | "failedHigherLevelCheck"
  | "succeededHigherLevelCheck"
  | "upcastAutoEnded"
  | "antimagicAuraUnaffected";
const DISPEL_MAGIC_ONGOING_SPELL_ENDING_SCENARIO_OUTCOME_BY_TAG: Readonly<
  Record<string, LastResult>
> = {
  Init: "init",
  NeedsHigherLevelCheck: "needsHigherLevelCheck",
  FailedHigherLevelCheck: "failedHigherLevelCheck",
  SucceededHigherLevelCheck: "succeededHigherLevelCheck",
  UpcastAutoEnded: "upcastAutoEnded",
  AntimagicAuraUnaffected: "antimagicAuraUnaffected",
} as const;

type DispelMagicOngoingSpellEndingProjection = {
  readonly actionAvailable: boolean;
  readonly slot3Available: boolean;
  readonly slot4Available: boolean;
  readonly lowLevelEffectActive: boolean;
  readonly highLevelEffectActive: boolean;
  readonly antimagicAuraActive: boolean;
  readonly higherLevelCheckHoleCount: number;
  readonly higherLevelCheckDc: number;
  readonly highLevelCasterConcentrating: boolean;
  readonly lastResult: LastResult;
};

type PendingHigherLevelCheck = {
  readonly subject: ActionSpellAct["subject"];
  readonly targetFill: Extract<
    BattleFill,
    { readonly kind: "ongoingSpellTargetChoice" }
  >;
  readonly checkHole: Extract<
    BattleHole,
    { readonly kind: "spellcastingAbilityCheck" }
  >;
};

type DispelMagicInitialRuntimeState = {
  readonly battle: BattleRuntimeSession;
  readonly lastResult: "init";
};

type DispelMagicPendingHigherLevelCheckState = {
  readonly battle: BattleRuntimeSession;
  readonly pendingHigherLevelCheck: PendingHigherLevelCheck;
  readonly lastResult: "needsHigherLevelCheck";
};

type DispelMagicCompletedRuntimeState = {
  readonly battle: BattleRuntimeSession;
  readonly lastResult: Exclude<LastResult, "init" | "needsHigherLevelCheck">;
};

type DispelMagicRuntimeState =
  | DispelMagicInitialRuntimeState
  | DispelMagicPendingHigherLevelCheckState
  | DispelMagicCompletedRuntimeState;

const dispelledObjectId = battleObjectId("focused-dispel-magic-object");
const lowLevelEffectId = battleSpellEffectOccurrenceId(
  "focused-dispel-magic-low-level-light",
);
const antimagicFieldAreaId = battleAreaId("focused-dispel-antimagic-aura");
const BASE_DISPEL_SLOT_LEVEL = 3;
const UPCAST_DISPEL_SLOT_LEVEL = 4;
const HIGHER_LEVEL_SOURCE_SPELL_LEVEL = 4;
const LOW_LEVEL_SOURCE_SPELL_LEVEL = 2;
const HIGHER_LEVEL_CHECK_DC = 10 + HIGHER_LEVEL_SOURCE_SPELL_LEVEL;
const FAILED_HIGHER_LEVEL_CHECK_TOTAL = HIGHER_LEVEL_CHECK_DC - 1;
const SUCCESSFUL_HIGHER_LEVEL_CHECK_TOTAL = HIGHER_LEVEL_CHECK_DC;

const driverSchema = {
  init: {},
  doRequestHigherLevelCheck: {},
  doFailHigherLevelCheck: {},
  doSucceedHigherLevelCheck: {},
  doUpcastAutoEnd: {},
  doTargetAntimagicAura: {},
  doStutter: {},
  step: {},
} as const;

function createDispelMagicOngoingSpellEndingDriver() {
  return defineDriver(driverSchema, () => {
    let state: DispelMagicRuntimeState = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doRequestHigherLevelCheck: () => {
        state = requestHigherLevelCheck(state);
      },
      doFailHigherLevelCheck: () => {
        state = resolveHigherLevelCheck(
          requirePendingHigherLevelCheckState(state),
          FAILED_HIGHER_LEVEL_CHECK_TOTAL,
          "failedHigherLevelCheck",
        );
      },
      doSucceedHigherLevelCheck: () => {
        state = resolveHigherLevelCheck(
          requirePendingHigherLevelCheckState(state),
          SUCCESSFUL_HIGHER_LEVEL_CHECK_TOTAL,
          "succeededHigherLevelCheck",
        );
      },
      doUpcastAutoEnd: () => {
        state = upcastAutoEnd(state);
      },
      doTargetAntimagicAura: () => {
        state = targetAntimagicAura(state);
      },
      doStutter: () => {},
      step: () => {},
      getState: () => dispelProjection(state),
    };
  });
}

const dispelMagicStateCheck = stateCheck(
  normalizeDispelMagicQuintState,
  compareDispelMagicStates,
);

describe("Dispel Magic ongoing spell ending MBT parity", () => {
  it("requests a spellcasting ability check for higher-level ongoing spells", () => {
    const checked = requestHigherLevelCheck(initialRuntimeState());

    expect(dispelProjection(checked)).toMatchObject({
      actionAvailable: true,
      slot3Available: true,
      slot4Available: true,
      lowLevelEffectActive: true,
      highLevelEffectActive: true,
      antimagicAuraActive: true,
      higherLevelCheckHoleCount: 1,
      higherLevelCheckDc: HIGHER_LEVEL_CHECK_DC,
      highLevelCasterConcentrating: true,
      lastResult: "needsHigherLevelCheck",
    });
  });

  it("ends same-or-lower-level ongoing spells but retains higher-level spells after a failed check", () => {
    const failed = resolveHigherLevelCheck(
      requestHigherLevelCheck(initialRuntimeState()),
      FAILED_HIGHER_LEVEL_CHECK_TOTAL,
      "failedHigherLevelCheck",
    );

    expect(dispelProjection(failed)).toMatchObject({
      actionAvailable: false,
      slot3Available: false,
      slot4Available: true,
      lowLevelEffectActive: false,
      highLevelEffectActive: true,
      antimagicAuraActive: true,
      higherLevelCheckHoleCount: 0,
      higherLevelCheckDc: 0,
      highLevelCasterConcentrating: true,
      lastResult: "failedHigherLevelCheck",
    });
  });

  it("ends higher-level ongoing spells after a successful check or matching higher-level slot", () => {
    const succeeded = resolveHigherLevelCheck(
      requestHigherLevelCheck(initialRuntimeState()),
      SUCCESSFUL_HIGHER_LEVEL_CHECK_TOTAL,
      "succeededHigherLevelCheck",
    );
    const upcast = upcastAutoEnd(initialRuntimeState());

    expect(dispelProjection(succeeded)).toMatchObject({
      actionAvailable: false,
      slot3Available: false,
      slot4Available: true,
      lowLevelEffectActive: false,
      highLevelEffectActive: false,
      antimagicAuraActive: true,
      higherLevelCheckHoleCount: 0,
      higherLevelCheckDc: 0,
      highLevelCasterConcentrating: false,
      lastResult: "succeededHigherLevelCheck",
    });
    expect(dispelProjection(upcast)).toMatchObject({
      actionAvailable: false,
      slot3Available: true,
      slot4Available: false,
      lowLevelEffectActive: false,
      highLevelEffectActive: false,
      antimagicAuraActive: true,
      higherLevelCheckHoleCount: 0,
      higherLevelCheckDc: 0,
      highLevelCasterConcentrating: false,
      lastResult: "upcastAutoEnded",
    });
  });

  it("leaves an Antimagic Field aura active when selected as a magical effect", () => {
    const targeted = targetAntimagicAura(initialRuntimeState());

    expect(dispelProjection(targeted)).toMatchObject({
      actionAvailable: false,
      slot3Available: false,
      slot4Available: true,
      lowLevelEffectActive: true,
      highLevelEffectActive: true,
      antimagicAuraActive: true,
      higherLevelCheckHoleCount: 0,
      higherLevelCheckDc: 0,
      highLevelCasterConcentrating: true,
      lastResult: "antimagicAuraUnaffected",
    });
  });

  it(
    "matches the focused ongoing spell ending slice against bounded random MBT traces",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-dispel-magic-ongoing-spell-ending.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createDispelMagicOngoingSpellEndingDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(4),
        stateCheck: dispelMagicStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function initialRuntimeState(): DispelMagicInitialRuntimeState {
  const base = spellBattle({
    preparedSpells: [spellRecord(dispelMagicUnitId)],
    spellSlots: [
      { spellLevel: BASE_DISPEL_SLOT_LEVEL, count: 1 },
      { spellLevel: UPCAST_DISPEL_SLOT_LEVEL, count: 1 },
    ],
  });
  const allocatedState = battleStateWithAllocatedEffectOccurrencesForTest({
    state: base.state,
    occurrences: [
      {
        kind: "activeEffect",
        ownerId: spellCasterId,
        effect: highLevelObjectContactEffect(),
      },
      {
        kind: "activeEffect",
        ownerId: spellTargetId,
        effect: antimagicFieldAuraEffect(),
      },
      {
        kind: "storedLightEmitter",
        ownerId: spellTargetId,
        emitter: lowLevelObjectLightEmitter(),
      },
    ],
  }).state;
  const allocatedCaster = requireCombatant(allocatedState, spellCasterId);
  const allocatedTarget = requireCombatant(allocatedState, spellTargetId);
  return {
    battle: battleRuntimeSessionForTest({
      ...base,
      state: {
        ...allocatedState,
        combatants: new Map(allocatedState.combatants)
          .set(spellCasterId, {
            ...allocatedCaster,
            concentration: {
              sourceProcedureRef: battleProcedureExecutionRefForTest(
                String(heatMetalUnitId),
              ),
              effectKind: "spellEffect",
            },
          })
          .set(spellTargetId, {
            ...allocatedTarget,
            concentration: {
              sourceProcedureRef: battleProcedureExecutionRefForTest(
                String(antimagicFieldUnitId),
              ),
              effectKind: "spellEffect",
            },
          }),
      },
    }),
    lastResult: "init",
  };
}

function requestHigherLevelCheck(
  state: DispelMagicRuntimeState,
): DispelMagicPendingHigherLevelCheckState {
  const act = spellAct({
    session: state.battle,
    spellId: dispelMagicUnitId,
    slotLevel: BASE_DISPEL_SLOT_LEVEL,
  });
  const targetFill = ongoingSpellTargetFill(
    requireOngoingSpellTargetChoiceHole(act.initialHoles),
    act.subject.procedureRef,
  );
  const result = requireNeedsHoles(
    resolveBattleSubject({
      state: state.battle.state,
      subject: act.subject,
      fills: [targetFill],
    }),
    "Expected Dispel Magic to request a higher-level spellcasting ability check.",
  );
  const checkHoles = result.holes.filter(
    (
      hole,
    ): hole is Extract<
      BattleHole,
      { readonly kind: "spellcastingAbilityCheck" }
    > => hole.kind === "spellcastingAbilityCheck",
  );
  expect(checkHoles).toHaveLength(1);
  const checkHole = checkHoles[0];
  expect(checkHole).toBeDefined();
  if (checkHole === undefined) {
    throw new Error("Expected pending higher-level Dispel Magic check hole.");
  }
  expect(checkHole).toMatchObject({
    dc: HIGHER_LEVEL_CHECK_DC,
    spellcastingAbilityCheck: {
      casterId: spellCasterId,
      sourceProcedureRef: act.subject.procedureRef,
      target: { kind: "object", objectId: dispelledObjectId },
      checkedOccurrence: {
        ownerId: spellCasterId,
        target: { kind: "object", objectId: dispelledObjectId },
        effect: {
          kind: "spellActiveEffect",
          activeEffectKind: "spellObjectContactDamage",
        },
      },
      contestedSpellLevel: HIGHER_LEVEL_SOURCE_SPELL_LEVEL,
    },
  });
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: result.state,
    }),
    pendingHigherLevelCheck: {
      subject: act.subject,
      targetFill,
      checkHole,
    },
    lastResult: "needsHigherLevelCheck",
  };
}

function resolveHigherLevelCheck(
  state: DispelMagicPendingHigherLevelCheckState,
  total: number,
  lastResult: Extract<
    LastResult,
    "failedHigherLevelCheck" | "succeededHigherLevelCheck"
  >,
): DispelMagicCompletedRuntimeState {
  const pendingCheck = state.pendingHigherLevelCheck;
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle.state,
      subject: pendingCheck.subject,
      fills: [
        pendingCheck.targetFill,
        abilityCheckFill(pendingCheck.checkHole, total),
      ],
    }),
    "Expected Dispel Magic check resolution to complete.",
  );
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
    lastResult,
  };
}

function upcastAutoEnd(
  state: DispelMagicRuntimeState,
): DispelMagicCompletedRuntimeState {
  const act = spellAct({
    session: state.battle,
    spellId: dispelMagicUnitId,
    slotLevel: UPCAST_DISPEL_SLOT_LEVEL,
  });
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle.state,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill(
          requireOngoingSpellTargetChoiceHole(act.initialHoles),
          act.subject.procedureRef,
        ),
      ],
    }),
    "Expected upcast Dispel Magic to resolve.",
  );
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
    lastResult: "upcastAutoEnded",
  };
}

function targetAntimagicAura(
  state: DispelMagicRuntimeState,
): DispelMagicCompletedRuntimeState {
  const act = spellAct({
    session: state.battle,
    spellId: dispelMagicUnitId,
    slotLevel: BASE_DISPEL_SLOT_LEVEL,
  });
  const aura = requireCombatant(
    state.battle.state,
    spellTargetId,
  ).activeEffects.find((effect) => effect.kind === "magicSuppressionEmanation");
  if (aura?.kind !== "magicSuppressionEmanation") {
    throw new Error("Expected an allocated Antimagic Field aura.");
  }
  const target = {
    kind: "magicalEffect" as const,
    effect: {
      kind: "antimagicFieldAura" as const,
      effectRef: aura.effectRef,
      areaId: antimagicFieldAreaId,
      sourceCombatantId: spellTargetId,
    },
  };
  expect(
    requireOngoingSpellTargetChoiceHole(act.initialHoles).choices,
  ).toContainEqual(target);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle.state,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill(
          requireOngoingSpellTargetChoiceHole(act.initialHoles),
          act.subject.procedureRef,
          target,
        ),
      ],
    }),
    "Expected Dispel Magic Antimagic Field aura target to resolve.",
  );
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
    lastResult: "antimagicAuraUnaffected",
  };
}

function dispelProjection(
  state: DispelMagicRuntimeState,
): DispelMagicOngoingSpellEndingProjection {
  const caster = requireCharacterCombatant(state.battle.state, spellCasterId);
  const highLevelEffect = caster.activeEffects.find(
    (effect) => effect.kind === "spellObjectContactDamage",
  );
  const projection = {
    actionAvailable: canSpendAction(
      state.battle.state.currentTurnResources,
      "magic",
    ),
    slot3Available: spellSlotAvailable(caster, BASE_DISPEL_SLOT_LEVEL),
    slot4Available: spellSlotAvailable(caster, UPCAST_DISPEL_SLOT_LEVEL),
    lowLevelEffectActive: state.battle.state.lightEmitters.some(
      (emitter) =>
        emitter.kind === "spellLightEmitter" &&
        emitter.attachment.kind === "object" &&
        emitter.attachment.objectId === dispelledObjectId &&
        Number(emitter.sourceSpellLevel) === LOW_LEVEL_SOURCE_SPELL_LEVEL,
    ),
    highLevelEffectActive: highLevelEffect !== undefined,
    antimagicAuraActive: requireCombatant(
      state.battle.state,
      spellTargetId,
    ).activeEffects.some(
      (effect) =>
        effect.kind === "magicSuppressionEmanation" &&
        effect.areaId === antimagicFieldAreaId,
    ),
    higherLevelCheckHoleCount:
      state.lastResult === "needsHigherLevelCheck" ? 1 : 0,
    higherLevelCheckDc:
      state.lastResult === "needsHigherLevelCheck"
        ? state.pendingHigherLevelCheck.checkHole.dc
        : 0,
    highLevelCasterConcentrating:
      highLevelEffect !== undefined &&
      caster.concentration?.sourceProcedureRef ===
        highLevelEffect.sourceProcedureRef,
    lastResult: state.lastResult,
  };
  return projection;
}

function requirePendingHigherLevelCheckState(
  state: DispelMagicRuntimeState,
): DispelMagicPendingHigherLevelCheckState {
  if (state.lastResult !== "needsHigherLevelCheck") {
    throw new Error(
      "Expected the MBT driver to resolve a pending higher-level Dispel Magic check.",
    );
  }
  return state;
}

function antimagicFieldAuraEffect(): Extract<
  BattleActiveEffectOccurrenceTemplate,
  { readonly kind: "magicSuppressionEmanation" }
> {
  const aura = antimagicFieldAuraMembershipForTest({
    sourceCombatantId: spellTargetId,
    originIncluded: true,
    nonOriginCombatantIds: [],
  });
  return {
    kind: "magicSuppressionEmanation",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(antimagicFieldUnitId),
    ),
    sourceCombatantId: spellTargetId,
    areaId: antimagicFieldAreaId,
    auraMembership: aura.membership,
    radiusFeet: movementFeet(10),
    suppressedOngoingSpellEffects: [],
    expiresAt: {
      kind: "concentration",
      combatantId: spellTargetId,
      durationTicks: elapsedTimeTicks(600),
    },
  };
}

function lowLevelObjectLightEmitter(): Extract<
  BattleStoredLightEmitterTemplate,
  { readonly kind: "spellLightEmitter" }
> {
  return {
    kind: "spellLightEmitter",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(continualFlameUnitId),
    ),
    sourceCombatantId: spellTargetId,
    sourceEffectId: lowLevelEffectId,
    sourceSpellLevel: testBattleSpellEffectLevel(2),
    attachment: { kind: "object", objectId: dispelledObjectId },
    emission: {
      kind: "brightAndDim",
      brightRadiusFeet: movementFeet(20),
      dimAdditionalFeet: movementFeet(20),
    },
    opaqueCoverInteraction: { kind: "blocksEmission" },
    expiresAt: { kind: "untilDispelled" },
  };
}

function highLevelObjectContactEffect(): Extract<
  BattleActiveEffectOccurrenceTemplate,
  { readonly kind: "spellObjectContactDamage" }
> {
  return {
    kind: "spellObjectContactDamage",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(heatMetalUnitId),
    ),
    sourceCombatantId: spellCasterId,
    sourceSpellLevel: testBattleSpellEffectLevel(
      HIGHER_LEVEL_SOURCE_SPELL_LEVEL,
    ),
    objectId: dispelledObjectId,
    rangeFeet: movementFeet(60),
    damage: {
      expr: { dice: 2, dieSize: 8 },
      damageType: "fire",
    },
    startedOn: { actorId: spellCasterId, round: Round(1) },
    expiresAt: {
      kind: "concentration",
      combatantId: spellCasterId,
      durationTicks: elapsedTimeTicks(10),
    },
  };
}

function ongoingSpellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "ongoingSpellTargetChoice" }>,
  sourceProcedureRef: BattleProcedureExecutionRef,
  target: BattleOngoingSpellTarget = {
    kind: "object",
    objectId: dispelledObjectId,
  },
): Extract<BattleFill, { readonly kind: "ongoingSpellTargetChoice" }> {
  return {
    kind: "ongoingSpellTargetChoice",
    holeId: hole.holeId,
    value: target,
    spatialFacts: [
      ongoingSpellTargetWithinRangeFact(target, sourceProcedureRef),
    ],
  };
}

function ongoingSpellTargetWithinRangeFact(
  target: BattleOngoingSpellTarget,
  sourceProcedureRef: BattleProcedureExecutionRef,
): BattleOngoingSpellTargetWithinRangeFact {
  return {
    kind: "ongoingSpellTargetWithinRange",
    casterId: spellCasterId,
    sourceProcedureRef,
    target,
    rangeFeet: movementFeet(120),
  };
}

function abilityCheckFill(
  hole: Extract<BattleHole, { readonly kind: "spellcastingAbilityCheck" }>,
  total: number,
): Extract<BattleFill, { readonly kind: "abilityCheck" }> {
  return { kind: "abilityCheck", holeId: hole.holeId, value: { total } };
}

function requireOngoingSpellTargetChoiceHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "ongoingSpellTargetChoice" }> {
  const hole = holes.find(
    (
      candidate,
    ): candidate is Extract<
      BattleHole,
      { readonly kind: "ongoingSpellTargetChoice" }
    > => candidate.kind === "ongoingSpellTargetChoice",
  );
  expect(hole).toBeDefined();
  if (hole === undefined) {
    throw new Error("Expected Dispel Magic target choice hole.");
  }
  expect(hole.requiresTableSpatialFact).toBe(true);
  expect(hole.choices).toContainEqual({
    kind: "object",
    objectId: dispelledObjectId,
  });
  return hole;
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

function requireNeedsHoles(
  result: BattleResolutionResult,
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error(message);
  }
  return result;
}

function requireCharacterCombatant(
  state: BattleState,
  combatantId: typeof spellCasterId,
): CharacterBattleCreatureState {
  const combatant = requireCombatant(state, combatantId);
  if (!isCharacterBattleCreatureState(combatant)) {
    throw new Error("Expected Dispel Magic MBT combatant to be a character.");
  }
  return combatant;
}

function spellSlotAvailable(
  combatant: CharacterBattleCreatureState,
  level: typeof BASE_DISPEL_SLOT_LEVEL | typeof UPCAST_DISPEL_SLOT_LEVEL,
): boolean {
  const slot = combatant.origin.spellcasting?.spellSlots.find(
    (candidate) => Number(candidate.spellLevel) === level,
  );
  return slot !== undefined && Number(slot.count) > Number(slot.expended);
}

function testBattleSpellEffectLevel(sourceSpellLevel: number) {
  const parsed = parseBattleSpellEffectLevel(sourceSpellLevel);
  if (parsed === null) {
    throw new Error("Expected test spell effect level to be in range.");
  }
  return parsed;
}

function normalizeDispelMagicQuintState(
  raw: unknown,
): DispelMagicOngoingSpellEndingProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const scenarioResult = lastResult(state["qScenarioOutcome"]);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: dispelMagicOngoingSpellEndingUnexpectedHole,
  });
  if (protocol.holes.length !== 0) {
    throw new Error(
      "Expected Dispel Magic ongoing spell ending witness holes to be empty.",
    );
  }
  assertWitnessProtocolConsistentWithScenario({
    label: "Dispel Magic ongoing spell ending",
    scenarioOutcome: scenarioResult,
    protocol,
  });
  return {
    actionAvailable: booleanField(state, "qActionAvailable"),
    slot3Available: booleanField(state, "qSlot3Available"),
    slot4Available: booleanField(state, "qSlot4Available"),
    lowLevelEffectActive: booleanField(state, "qLowLevelEffectActive"),
    highLevelEffectActive: booleanField(state, "qHighLevelEffectActive"),
    antimagicAuraActive: booleanField(state, "qAntimagicAuraActive"),
    higherLevelCheckHoleCount: numberFromQuintInt(
      state["qHigherLevelCheckHoleCount"],
      "qHigherLevelCheckHoleCount",
    ),
    higherLevelCheckDc: numberFromQuintInt(
      state["qHigherLevelCheckDc"],
      "qHigherLevelCheckDc",
    ),
    highLevelCasterConcentrating: booleanField(
      state,
      "qHighLevelCasterConcentrating",
    ),
    lastResult: scenarioResult,
  };
}

function dispelMagicOngoingSpellEndingUnexpectedHole(raw: unknown): never {
  throw new Error(
    `Dispel Magic ongoing spell ending witness does not expect holes; received ${String(raw)}.`,
  );
}

function compareDispelMagicStates(
  runtime: DispelMagicOngoingSpellEndingProjection,
  quint: DispelMagicOngoingSpellEndingProjection,
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

function lastResult(raw: unknown): LastResult {
  const tag = quintVariantTag(raw, "qScenarioOutcome");
  const value = DISPEL_MAGIC_ONGOING_SPELL_ENDING_SCENARIO_OUTCOME_BY_TAG[tag];
  if (value !== undefined) {
    return value;
  }
  throw new Error(
    `Expected Quint scenario outcome variant qScenarioOutcome, got ${tag}.`,
  );
}

function isCharacterBattleCreatureState(
  combatant: BattleCreatureState,
): combatant is CharacterBattleCreatureState {
  return combatant.origin.kind === "character";
}
