// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-spell-created-held-object
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Flame Blade:
//   the spell evokes a fiery blade in a free hand; it lasts for the
//   Concentration duration, disappears if let go, can be evoked again as a
//   Bonus Action, sheds Bright Light and Dim Light, and enables a Magic Action
//   melee spell attack for Fire damage.
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration:
//   if the effect creator loses Concentration, the effect ends.
// - .references/srd-5.2.1/Playing-the-Game.md#Light:
//   Bright Light is normal illumination and Dim Light creates a Lightly
//   Obscured area.
// - UBIQUITOUS_LANGUAGE.md: Holding / Wielding, Free Hand, Magic Action,
//   Bonus Action, Spell Attack, Concentration, Illumination, and Spell Slot.
import {
  canSpendAction,
  canSpendBonusAction,
} from "@dnd/shared-algebras/action-economy-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { movementFeet, type HandUse } from "@dnd/shared/types";
import {
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
  AvailableBattleAct,
  BattleActiveEffect,
  BattleResolutionResult,
  BattleState,
  BattleSubject,
} from "./index.ts";
import {
  breakBattleConcentration,
  classLevel,
  discoverBattleActs,
  resolveBattleSubject,
  snapshotBattle,
} from "./unit-profile-admission-test-support.ts";
import {
  attackRollFill,
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  maybeBonusSpellAct,
  maybeSpellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  flameBladeUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";

const LAST_RESULTS = [
  "init",
  "castHeldObject",
  "attackedHeldObject",
  "releasedHeldObject",
  "nextCasterTurn",
  "reEvokedHeldObject",
  "concentrationCleaned",
  "durationCleaned",
] as const;
type LastResult = (typeof LAST_RESULTS)[number];
const LAST_RESULT_SET: ReadonlySet<string> = new Set(LAST_RESULTS);

type SpellCreatedHeldObjectProjection = {
  readonly magicActionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly initialCastAvailable: boolean;
  readonly heldObjectEffectActive: boolean;
  readonly heldObjectHeld: boolean;
  readonly freeHandAvailable: boolean;
  readonly casterConcentrating: boolean;
  readonly lightProjected: boolean;
  readonly spellSlotExpended: number;
  readonly spellSlotCommittedThisTurn: boolean;
  readonly attackAvailable: boolean;
  readonly reEvokeAvailable: boolean;
  readonly targetHp: number;
  readonly lastResult: LastResult;
};

type SpellCreatedHeldObjectRuntimeState = {
  readonly battle: BattleState;
  readonly lastResult: LastResult;
};

const INITIAL_TARGET_HP = 20;
const HIT_TARGET_HP = 8;
const FLAME_BLADE_DURATION_TICKS = elapsedTimeTicks(100);
const FLAME_BLADE_BRIGHT_RADIUS_FEET = movementFeet(10);
const FLAME_BLADE_DIM_ADDITIONAL_FEET = movementFeet(10);

const driverSchema = {
  init: {},
  doCastHeldObject: {},
  doAttackHeldObject: {},
  doReleaseHeldObject: {},
  doAdvanceToCasterTurn: {},
  doReEvokeHeldObject: {},
  doBreakConcentration: {},
  doExpireDuration: {},
  doStutter: {},
  step: {},
} as const;

function createSpellCreatedHeldObjectLifecycleDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doCastHeldObject: () => {
        state = castHeldObject(state);
      },
      doAttackHeldObject: () => {
        state = attackHeldObject(state);
      },
      doReleaseHeldObject: () => {
        state = releaseHeldObject(state);
      },
      doAdvanceToCasterTurn: () => {
        state = advanceToNextCasterTurn(state);
      },
      doReEvokeHeldObject: () => {
        state = reEvokeHeldObject(state);
      },
      doBreakConcentration: () => {
        state = {
          battle: breakBattleConcentration(state.battle, spellCasterId),
          lastResult: "concentrationCleaned",
        };
      },
      doExpireDuration: () => {
        state = expireHeldObjectDuration(state);
      },
      doStutter: () => {},
      step: () => {},
      getState: () => spellCreatedHeldObjectProjection(state),
    };
  });
}

const spellCreatedHeldObjectStateCheck = stateCheck(
  normalizeSpellCreatedHeldObjectQuintState,
  compareSpellCreatedHeldObjectStates,
);

describe("Spell-created held object lifecycle MBT parity", () => {
  it("casts Flame Blade into a free hand and projects its held light", () => {
    const cast = castHeldObject(initialRuntimeState());

    expect(spellCreatedHeldObjectProjection(cast)).toMatchObject({
      magicActionAvailable: true,
      bonusActionAvailable: false,
      initialCastAvailable: false,
      heldObjectEffectActive: true,
      heldObjectHeld: true,
      freeHandAvailable: false,
      casterConcentrating: true,
      lightProjected: true,
      spellSlotExpended: 1,
      spellSlotCommittedThisTurn: true,
      attackAvailable: true,
      reEvokeAvailable: false,
      targetHp: INITIAL_TARGET_HP,
      lastResult: "castHeldObject",
    });
  });

  it("attacks with the held object without spending another Spell Slot", () => {
    const attacked = attackHeldObject(castHeldObject(initialRuntimeState()));

    expect(spellCreatedHeldObjectProjection(attacked)).toMatchObject({
      magicActionAvailable: false,
      bonusActionAvailable: false,
      heldObjectEffectActive: true,
      heldObjectHeld: true,
      lightProjected: true,
      spellSlotExpended: 1,
      spellSlotCommittedThisTurn: true,
      attackAvailable: false,
      targetHp: HIT_TARGET_HP,
      lastResult: "attackedHeldObject",
    });
  });

  it("releases and later re-evokes the held object without a new Spell Slot spend", () => {
    const reEvoked = reEvokeHeldObject(
      advanceToNextCasterTurn(
        releaseHeldObject(castHeldObject(initialRuntimeState())),
      ),
    );

    expect(spellCreatedHeldObjectProjection(reEvoked)).toMatchObject({
      magicActionAvailable: true,
      bonusActionAvailable: false,
      heldObjectEffectActive: true,
      heldObjectHeld: true,
      freeHandAvailable: false,
      casterConcentrating: true,
      lightProjected: true,
      spellSlotExpended: 1,
      spellSlotCommittedThisTurn: false,
      attackAvailable: true,
      reEvokeAvailable: false,
      lastResult: "reEvokedHeldObject",
    });
  });

  it("cleans up held object state and light when Concentration ends or duration expires", () => {
    const broken: SpellCreatedHeldObjectRuntimeState = {
      battle: breakBattleConcentration(
        castHeldObject(initialRuntimeState()).battle,
        spellCasterId,
      ),
      lastResult: "concentrationCleaned",
    };
    const expired = expireHeldObjectDuration(
      castHeldObject(initialRuntimeState()),
    );

    expect(spellCreatedHeldObjectProjection(broken)).toMatchObject({
      heldObjectEffectActive: false,
      heldObjectHeld: false,
      freeHandAvailable: true,
      casterConcentrating: false,
      lightProjected: false,
      lastResult: "concentrationCleaned",
    });
    expect(spellCreatedHeldObjectProjection(expired)).toMatchObject({
      magicActionAvailable: true,
      bonusActionAvailable: true,
      heldObjectEffectActive: false,
      heldObjectHeld: false,
      freeHandAvailable: true,
      casterConcentrating: false,
      lightProjected: false,
      lastResult: "durationCleaned",
    });
  });

  it("matches the focused spell-created held object lifecycle against bounded random MBT traces", async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-spell-created-held-object-lifecycle.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createSpellCreatedHeldObjectLifecycleDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(6),
      stateCheck: spellCreatedHeldObjectStateCheck,
    });
  }, 120_000);
});

function initialRuntimeState(): SpellCreatedHeldObjectRuntimeState {
  return {
    battle: spellBattle({
      preparedSpells: [spellRecord(flameBladeUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "druid", level: classLevel(3) }],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      targetHp: INITIAL_TARGET_HP,
      targetMaxHp: INITIAL_TARGET_HP,
    }),
    lastResult: "init",
  };
}

function castHeldObject(
  state: SpellCreatedHeldObjectRuntimeState,
): SpellCreatedHeldObjectRuntimeState {
  const act = requireInitialCastAct(state.battle);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [],
    }),
    "Expected Flame Blade cast to resolve.",
  );
  return { battle: resolved.state, lastResult: "castHeldObject" };
}

function attackHeldObject(
  state: SpellCreatedHeldObjectRuntimeState,
): SpellCreatedHeldObjectRuntimeState {
  const act = requireAttackAct(state.battle);
  const targetFill = spellTargetFill(
    requireHole(act.initialHoles, "targetChoice"),
    flameBladeUnitId,
    spellCasterId,
    spellTargetId,
  );
  const attackRoll = requireResultHole(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );
  const damage = requireResultHole(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        targetFill,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
      ],
    }),
    "rolledDice",
  );
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        targetFill,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[2, 3, 4]]),
      ],
    }),
    "Expected Flame Blade attack to resolve.",
  );
  return { battle: resolved.state, lastResult: "attackedHeldObject" };
}

function releaseHeldObject(
  state: SpellCreatedHeldObjectRuntimeState,
): SpellCreatedHeldObjectRuntimeState {
  const act = requireReleaseAct(state.battle);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [],
    }),
    "Expected Flame Blade release to resolve.",
  );
  return { battle: resolved.state, lastResult: "releasedHeldObject" };
}

function advanceToNextCasterTurn(
  state: SpellCreatedHeldObjectRuntimeState,
): SpellCreatedHeldObjectRuntimeState {
  const casterEnd = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    }),
    "Expected caster end turn to resolve.",
  );
  const targetEnd = requireResolved(
    resolveBattleSubject({
      state: casterEnd.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [],
    }),
    "Expected target end turn to resolve.",
  );
  return { battle: targetEnd.state, lastResult: "nextCasterTurn" };
}

function reEvokeHeldObject(
  state: SpellCreatedHeldObjectRuntimeState,
): SpellCreatedHeldObjectRuntimeState {
  const act = requireReEvokeAct(state.battle);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [],
    }),
    "Expected Flame Blade re-evocation to resolve.",
  );
  return { battle: resolved.state, lastResult: "reEvokedHeldObject" };
}

function expireHeldObjectDuration(
  state: SpellCreatedHeldObjectRuntimeState,
): SpellCreatedHeldObjectRuntimeState {
  const expiring = withHeldObjectDurationTicks(
    state.battle,
    elapsedTimeTicks(1),
  );
  return {
    ...advanceToNextCasterTurn({
      battle: expiring,
      lastResult: state.lastResult,
    }),
    lastResult: "durationCleaned",
  };
}

function spellCreatedHeldObjectProjection(
  state: SpellCreatedHeldObjectRuntimeState,
): SpellCreatedHeldObjectProjection {
  const caster = requireCombatant(state.battle, spellCasterId);
  const activeEffect = spellCreatedHeldObjectEffect(state.battle);
  return {
    magicActionAvailable: canSpendAction(
      state.battle.currentTurnResources,
      "magic",
    ),
    bonusActionAvailable: canSpendBonusAction(
      state.battle.currentTurnResources,
    ),
    initialCastAvailable: maybeInitialCastAct(state.battle) !== undefined,
    heldObjectEffectActive: activeEffect !== undefined,
    heldObjectHeld: activeEffect?.objectState.kind === "held",
    freeHandAvailable:
      handUseIsFree(caster.armorClass.leftHandUse) ||
      handUseIsFree(caster.armorClass.rightHandUse),
    casterConcentrating:
      caster.concentration?.sourceSpellId === flameBladeUnitId &&
      caster.concentration.effectKind === "spellEffect",
    lightProjected: snapshotBattle(state.battle).lightEmitters.some(
      (emitter) =>
        emitter.kind === "spellLightEmitter" &&
        emitter.sourceSpellId === flameBladeUnitId &&
        emitter.sourceCombatantId === spellCasterId &&
        emitter.attachment.kind === "combatant" &&
        emitter.attachment.combatantId === spellCasterId &&
        emitter.emission.kind === "brightAndDim" &&
        emitter.emission.brightRadiusFeet === FLAME_BLADE_BRIGHT_RADIUS_FEET &&
        emitter.emission.dimAdditionalFeet === FLAME_BLADE_DIM_ADDITIONAL_FEET,
    ),
    spellSlotExpended: casterSpellSlotExpended(state.battle),
    spellSlotCommittedThisTurn:
      state.battle.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed" && use.combatantId === spellCasterId,
      ),
    attackAvailable: maybeAttackAct(state.battle) !== undefined,
    reEvokeAvailable: maybeReEvokeAct(state.battle) !== undefined,
    targetHp: Number(requireCombatant(state.battle, spellTargetId).hp),
    lastResult: state.lastResult,
  };
}

function maybeInitialCastAct(state: BattleState) {
  const act = maybeBonusSpellAct({
    state,
    spellId: flameBladeUnitId,
    slotLevel: 2,
  });
  return act?.subject.invocation.tag === "spellSlot" &&
    act.subject.invocation.procedure === "spellCreatedHeldObject"
    ? act
    : undefined;
}

function requireInitialCastAct(state: BattleState) {
  const act = maybeInitialCastAct(state);
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error("Expected Flame Blade initial cast act.");
  }
  return act;
}

function maybeAttackAct(state: BattleState) {
  const act = maybeSpellAct({ state, spellId: flameBladeUnitId });
  return act?.subject.invocation.tag === "spellEffect" &&
    act.subject.invocation.procedure === "spellCreatedHeldObjectAttack"
    ? act
    : undefined;
}

function requireAttackAct(state: BattleState) {
  const act = maybeAttackAct(state);
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error("Expected Flame Blade held-object attack act.");
  }
  return act;
}

function maybeReEvokeAct(state: BattleState) {
  const act = maybeBonusSpellAct({ state, spellId: flameBladeUnitId });
  return act?.subject.invocation.tag === "spellEffect" &&
    act.subject.invocation.procedure === "spellCreatedHeldObjectReEvoke"
    ? act
    : undefined;
}

function requireReEvokeAct(state: BattleState) {
  const act = maybeReEvokeAct(state);
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error("Expected Flame Blade re-evocation act.");
  }
  return act;
}

function requireReleaseAct(state: BattleState): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "releaseSpellCreatedHeldObject";
    }
  >;
} {
  const act = discoverBattleActs(state).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        BattleSubject,
        {
          readonly tag: "runtimeCommand";
          readonly command: "releaseSpellCreatedHeldObject";
        }
      >;
    } =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "releaseSpellCreatedHeldObject" &&
      candidate.subject.sourceSpellId === flameBladeUnitId,
  );
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error("Expected Flame Blade release act.");
  }
  return act;
}

function spellCreatedHeldObjectEffect(
  state: BattleState,
):
  | Extract<BattleActiveEffect, { readonly kind: "spellCreatedHeldObject" }>
  | undefined {
  return requireCombatant(state, spellCasterId).activeEffects.find(
    (
      effect,
    ): effect is Extract<
      BattleActiveEffect,
      { readonly kind: "spellCreatedHeldObject" }
    > =>
      effect.kind === "spellCreatedHeldObject" &&
      effect.sourceSpellId === flameBladeUnitId &&
      effect.sourceCombatantId === spellCasterId &&
      effect.expiresAt.kind === "concentration" &&
      effect.expiresAt.combatantId === spellCasterId,
  );
}

function withHeldObjectDurationTicks(
  state: BattleState,
  durationTicks: typeof FLAME_BLADE_DURATION_TICKS,
): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...caster,
      activeEffects: caster.activeEffects.map((effect) =>
        effect.kind === "spellCreatedHeldObject" &&
        effect.sourceSpellId === flameBladeUnitId
          ? {
              ...effect,
              expiresAt: { ...effect.expiresAt, durationTicks },
            }
          : effect,
      ),
    }),
  };
}

function casterSpellSlotExpended(state: BattleState): number {
  const caster = requireCombatant(state, spellCasterId);
  if (caster.origin.kind !== "character") {
    return 0;
  }
  const flameBladeSlot = caster.origin.spellcasting?.spellSlots.find(
    (slot) => Number(slot.spellLevel) === 2,
  );
  return Number(flameBladeSlot?.expended ?? 0);
}

function handUseIsFree(handUse: HandUse): boolean {
  return handUse === "free";
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

function normalizeSpellCreatedHeldObjectQuintState(
  raw: unknown,
): SpellCreatedHeldObjectProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const scenarioResult = lastResult(state["scenarioResult"]);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: spellCreatedHeldObjectUnexpectedHole,
  });
  assertWitnessProtocolConsistentWithScenario({
    label: "spell-created held object",
    scenarioResult,
    protocol,
  });
  return {
    magicActionAvailable: booleanField(state, "magicActionAvailable"),
    bonusActionAvailable: booleanField(state, "bonusActionAvailable"),
    initialCastAvailable: booleanField(state, "initialCastAvailable"),
    heldObjectEffectActive: booleanField(state, "heldObjectEffectActive"),
    heldObjectHeld: booleanField(state, "heldObjectHeld"),
    freeHandAvailable: booleanField(state, "freeHandAvailable"),
    casterConcentrating: booleanField(state, "casterConcentrating"),
    lightProjected: booleanField(state, "lightProjected"),
    spellSlotExpended: numberFromQuintInt(
      state["spellSlotExpended"],
      "qState.spellSlotExpended",
    ),
    spellSlotCommittedThisTurn: booleanField(
      state,
      "spellSlotCommittedThisTurn",
    ),
    attackAvailable: booleanField(state, "attackAvailable"),
    reEvokeAvailable: booleanField(state, "reEvokeAvailable"),
    targetHp: numberFromQuintInt(state["targetHp"], "qState.targetHp"),
    lastResult: scenarioResult,
  };
}

function compareSpellCreatedHeldObjectStates(
  runtime: SpellCreatedHeldObjectProjection,
  quint: SpellCreatedHeldObjectProjection,
): boolean {
  expect(runtime).toStrictEqual(quint);
  return true;
}

function lastResult(raw: unknown): LastResult {
  expect(raw).toBeTypeOf("string");
  if (typeof raw !== "string" || !isLastResult(raw)) {
    throw new Error(
      `Unexpected spell-created held object result ${String(raw)}.`,
    );
  }
  return raw;
}

function isLastResult(value: string): value is LastResult {
  return LAST_RESULT_SET.has(value);
}

function spellCreatedHeldObjectUnexpectedHole(raw: unknown): never {
  throw new Error(
    `Spell-created held object witness does not expect holes; received ${String(raw)}.`,
  );
}
