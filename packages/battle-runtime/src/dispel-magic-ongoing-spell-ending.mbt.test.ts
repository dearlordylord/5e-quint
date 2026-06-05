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
import * as path from "node:path";

import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, Round } from "@dnd/shared/types";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { describe, expect, it } from "vitest";

import { parseBattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import type {
  BattleOngoingSpellTarget,
  BattleOngoingSpellTargetWithinRangeFact,
} from "./battle-reducer.ts";
import { battleSpellEffectOccurrenceId } from "./identity.ts";
import {
  antimagicFieldUnitId,
  continualFlameUnitId,
  dispelMagicUnitId,
  heatMetalUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import { requireCombatant } from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellAct } from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleAreaId,
  battleObjectId,
  resolveBattleSubject,
  type BattleActiveEffect,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleTrackedOngoingSpellLightEmitter,
  type CharacterBattleCreatureState,
} from "./index.ts";

const LAST_RESULTS = [
  "init",
  "needsHigherLevelCheck",
  "failedHigherLevelCheck",
  "succeededHigherLevelCheck",
  "upcastAutoEnded",
  "antimagicAuraUnaffected",
] as const;
type LastResult = (typeof LAST_RESULTS)[number];
const LAST_RESULT_SET: ReadonlySet<string> = new Set(LAST_RESULTS);

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

type DispelMagicRuntimeState = {
  readonly battle: BattleState;
  readonly higherLevelCheckHoles: readonly Extract<
    BattleHole,
    { readonly kind: "spellcastingAbilityCheck" }
  >[];
  readonly lastResult: LastResult;
};

const dispelledObjectId = battleObjectId("focused-dispel-magic-object");
const lowLevelEffectId = battleSpellEffectOccurrenceId(
  "focused-dispel-magic-low-level-light",
);
const highLevelEffectId = battleSpellEffectOccurrenceId(
  "focused-dispel-magic-high-level-contact",
);
const antimagicFieldAreaId = battleAreaId("focused-dispel-antimagic-aura");
const BASE_DISPEL_SLOT_LEVEL = 3;
const UPCAST_DISPEL_SLOT_LEVEL = 4;
const HIGHER_LEVEL_SOURCE_SPELL_LEVEL = 4;
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
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doRequestHigherLevelCheck: () => {
        state = requestHigherLevelCheck(state);
      },
      doFailHigherLevelCheck: () => {
        state = resolveHigherLevelCheck(
          state,
          FAILED_HIGHER_LEVEL_CHECK_TOTAL,
          "failedHigherLevelCheck",
        );
      },
      doSucceedHigherLevelCheck: () => {
        state = resolveHigherLevelCheck(
          state,
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

  it("matches the focused ongoing spell ending slice against bounded random MBT traces", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-dispel-magic-ongoing-spell-ending.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createDispelMagicOngoingSpellEndingDriver(),
      backend: "typescript",
      nTraces: 10,
      maxSteps: 4,
      stateCheck: dispelMagicStateCheck,
    });
  }, 120_000);
});

function initialRuntimeState(): DispelMagicRuntimeState {
  const base = spellBattle({
    preparedSpells: [spellRecord(dispelMagicUnitId)],
    spellSlots: [
      { spellLevel: BASE_DISPEL_SLOT_LEVEL, count: 1 },
      { spellLevel: UPCAST_DISPEL_SLOT_LEVEL, count: 1 },
    ],
  });
  const caster = requireCombatant(base, spellCasterId);
  const target = requireCombatant(base, spellTargetId);
  return {
    battle: {
      ...base,
      combatants: new Map(base.combatants)
        .set(spellCasterId, {
          ...caster,
          concentration: {
            sourceSpellId: heatMetalUnitId,
            effectKind: "spellEffect",
          },
          activeEffects: [
            ...caster.activeEffects,
            highLevelObjectContactEffect(),
          ],
        })
        .set(spellTargetId, {
          ...target,
          concentration: {
            sourceSpellId: antimagicFieldUnitId,
            effectKind: "spellEffect",
          },
          activeEffects: [...target.activeEffects, antimagicFieldAuraEffect()],
        }),
      lightEmitters: [lowLevelObjectLightEmitter()],
    },
    higherLevelCheckHoles: [],
    lastResult: "init",
  };
}

function requestHigherLevelCheck(
  state: DispelMagicRuntimeState,
): DispelMagicRuntimeState {
  const act = spellAct({
    state: state.battle,
    spellId: dispelMagicUnitId,
    slotLevel: BASE_DISPEL_SLOT_LEVEL,
  });
  const targetFill = ongoingSpellTargetFill(
    requireOngoingSpellTargetChoiceHole(act.initialHoles),
  );
  const result = requireNeedsHoles(
    resolveBattleSubject({
      state: state.battle,
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
  expect(checkHoles[0]).toMatchObject({
    dc: HIGHER_LEVEL_CHECK_DC,
    spellcastingAbilityCheck: {
      casterId: spellCasterId,
      sourceSpellId: dispelMagicUnitId,
      target: { kind: "object", objectId: dispelledObjectId },
      effect: {
        kind: "spellActiveEffect",
        activeEffectKind: "spellObjectContactDamage",
        sourceEffectId: highLevelEffectId,
      },
      contestedSpellLevel: HIGHER_LEVEL_SOURCE_SPELL_LEVEL,
    },
  });
  return {
    battle: result.state,
    higherLevelCheckHoles: checkHoles,
    lastResult: "needsHigherLevelCheck",
  };
}

function resolveHigherLevelCheck(
  state: DispelMagicRuntimeState,
  total: number,
  lastResult: Extract<
    LastResult,
    "failedHigherLevelCheck" | "succeededHigherLevelCheck"
  >,
): DispelMagicRuntimeState {
  const checkHole = state.higherLevelCheckHoles[0];
  expect(checkHole).toBeDefined();
  if (checkHole === undefined) {
    throw new Error("Expected pending higher-level Dispel Magic check hole.");
  }
  const act = spellAct({
    state: state.battle,
    spellId: dispelMagicUnitId,
    slotLevel: BASE_DISPEL_SLOT_LEVEL,
  });
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill(
          requireOngoingSpellTargetChoiceHole(act.initialHoles),
        ),
        abilityCheckFill(checkHole, total),
      ],
    }),
    "Expected Dispel Magic check resolution to complete.",
  );
  return {
    battle: resolved.state,
    higherLevelCheckHoles: [],
    lastResult,
  };
}

function upcastAutoEnd(
  state: DispelMagicRuntimeState,
): DispelMagicRuntimeState {
  const act = spellAct({
    state: state.battle,
    spellId: dispelMagicUnitId,
    slotLevel: UPCAST_DISPEL_SLOT_LEVEL,
  });
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill(
          requireOngoingSpellTargetChoiceHole(act.initialHoles),
        ),
      ],
    }),
    "Expected upcast Dispel Magic to resolve.",
  );
  return {
    battle: resolved.state,
    higherLevelCheckHoles: [],
    lastResult: "upcastAutoEnded",
  };
}

function targetAntimagicAura(
  state: DispelMagicRuntimeState,
): DispelMagicRuntimeState {
  const act = spellAct({
    state: state.battle,
    spellId: dispelMagicUnitId,
    slotLevel: BASE_DISPEL_SLOT_LEVEL,
  });
  const target = {
    kind: "magicalEffect" as const,
    effect: {
      kind: "antimagicFieldAura" as const,
      areaId: antimagicFieldAreaId,
      sourceCombatantId: spellTargetId,
    },
  };
  expect(
    requireOngoingSpellTargetChoiceHole(act.initialHoles).choices,
  ).toContainEqual(target);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill(
          requireOngoingSpellTargetChoiceHole(act.initialHoles),
          target,
        ),
      ],
    }),
    "Expected Dispel Magic Antimagic Field aura target to resolve.",
  );
  return {
    battle: resolved.state,
    higherLevelCheckHoles: [],
    lastResult: "antimagicAuraUnaffected",
  };
}

function dispelProjection(
  state: DispelMagicRuntimeState,
): DispelMagicOngoingSpellEndingProjection {
  const caster = requireCharacterCombatant(state.battle, spellCasterId);
  const projection = {
    actionAvailable: canSpendAction(state.battle.currentTurnResources, "magic"),
    slot3Available: spellSlotAvailable(caster, BASE_DISPEL_SLOT_LEVEL),
    slot4Available: spellSlotAvailable(caster, UPCAST_DISPEL_SLOT_LEVEL),
    lowLevelEffectActive: state.battle.lightEmitters.some(
      (emitter) =>
        emitter.kind === "spellLightEmitter" &&
        "sourceEffectId" in emitter &&
        emitter.sourceEffectId === lowLevelEffectId,
    ),
    highLevelEffectActive: caster.activeEffects.some(
      (effect) =>
        effect.kind === "spellObjectContactDamage" &&
        effect.effectId === highLevelEffectId,
    ),
    antimagicAuraActive: requireCombatant(
      state.battle,
      spellTargetId,
    ).activeEffects.some(
      (effect) =>
        effect.kind === "antimagicFieldOngoingSpellSuppression" &&
        effect.areaId === antimagicFieldAreaId,
    ),
    higherLevelCheckHoleCount: state.higherLevelCheckHoles.length,
    higherLevelCheckDc: state.higherLevelCheckHoles[0]?.dc ?? 0,
    highLevelCasterConcentrating:
      caster.concentration?.sourceSpellId === heatMetalUnitId &&
      caster.concentration.effectKind === "spellEffect",
    lastResult: state.lastResult,
  };
  expect(projection.higherLevelCheckHoleCount).toBeLessThanOrEqual(1);
  return projection;
}

function antimagicFieldAuraEffect(): Extract<
  BattleActiveEffect,
  { readonly kind: "antimagicFieldOngoingSpellSuppression" }
> {
  return {
    kind: "antimagicFieldOngoingSpellSuppression",
    sourceSpellId: antimagicFieldUnitId,
    sourceCombatantId: spellTargetId,
    areaId: antimagicFieldAreaId,
    auraMembership: {
      kind: "antimagicFieldAuraMembership",
      originIncluded: true,
      nonOriginCombatantIds: [],
    },
    radiusFeet: movementFeet(10),
    suppressedOngoingSpellEffects: [],
    expiresAt: {
      kind: "concentration",
      combatantId: spellTargetId,
      durationTicks: elapsedTimeTicks(600),
    },
  };
}

function lowLevelObjectLightEmitter(): BattleTrackedOngoingSpellLightEmitter {
  return {
    kind: "spellLightEmitter",
    sourceSpellId: continualFlameUnitId,
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
  BattleActiveEffect,
  { readonly kind: "spellObjectContactDamage" }
> {
  return {
    kind: "spellObjectContactDamage",
    effectId: highLevelEffectId,
    sourceSpellId: heatMetalUnitId,
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
  target: BattleOngoingSpellTarget = {
    kind: "object",
    objectId: dispelledObjectId,
  },
): Extract<BattleFill, { readonly kind: "ongoingSpellTargetChoice" }> {
  return {
    kind: "ongoingSpellTargetChoice",
    holeId: hole.holeId,
    value: target,
    spatialFacts: [ongoingSpellTargetWithinRangeFact(target)],
  };
}

function ongoingSpellTargetWithinRangeFact(
  target: BattleOngoingSpellTarget,
): BattleOngoingSpellTargetWithinRangeFact {
  return {
    kind: "ongoingSpellTargetWithinRange",
    casterId: spellCasterId,
    spellId: dispelMagicUnitId,
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
  const state = quintStateRecord(raw);
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
    lastResult: lastResult(state["qLastResult"]),
  };
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
  if (isLastResult(raw)) {
    return raw;
  }
  throw new Error(`Unknown Dispel Magic result: ${String(raw)}.`);
}

function isLastResult(raw: unknown): raw is LastResult {
  return typeof raw === "string" && LAST_RESULT_SET.has(raw);
}

function isCharacterBattleCreatureState(
  combatant: BattleCreatureState,
): combatant is CharacterBattleCreatureState {
  return combatant.origin.kind === "character";
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(raw)) {
    throw new Error("Expected Quint Dispel Magic state.");
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
