// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-self-transformation-mode
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SELF_TRANSFORMATION_MODE
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Alter Self:
//   Alter Self is a level 2 Action spell with range Self and Concentration up
//   to 1 hour. The caster chooses Aquatic Adaptation, Change Appearance, or
//   Natural Weapons, and can take a later Magic action to replace the chosen
//   option with a different one.
// - Aquatic Adaptation grants underwater breathing and a Swim Speed equal to
//   Speed. Change Appearance changes appearance without changing statistics.
//   Natural Weapons replaces Unarmed Strike damage with 1d6 of the selected
//   damage type and uses the spellcasting ability modifier for attack and
//   damage rolls.
// - UBIQUITOUS_LANGUAGE.md: Action, Concentration, Damage Roll, Speed, Spell
//   Effect, Spell Slot, and Unarmed Strike.
import { PHYSICAL_DAMAGE_TYPES } from "@dnd/shared/types";
import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
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
import { describe, expect, it } from "vitest";

import {
  activeSelfTransformationModeEffect,
  battleCreatureCanBreatheUnderwater,
  discoverBattleActs,
  resolveBattleSubject,
  SELF_TRANSFORMATION_MODE_KINDS,
  snapshotBattle,
  type BattleResolutionResult,
  type BattleState,
} from "./index.ts";
import {
  alterSelfUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackTargetFill,
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  maybeSpellAct,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import { endTurn } from "./unit-profile-admission-test-support.ts";

const ALTER_SELF_DURATION_TICKS = 600;
const ALTER_SELF_DURATION_TICKS_AFTER_ONE_ROUND = ALTER_SELF_DURATION_TICKS - 1;
const NATURAL_WEAPON_DAMAGE_ON_ROLL_4 = 7;

const SELF_TRANSFORMATION_MODES = [
  "none",
  ...SELF_TRANSFORMATION_MODE_KINDS,
] as const;
type SelfTransformationModeProjection =
  (typeof SELF_TRANSFORMATION_MODES)[number];
const SELF_TRANSFORMATION_MODE_SET: ReadonlySet<string> = new Set(
  SELF_TRANSFORMATION_MODES,
);

const NATURAL_WEAPON_DAMAGE_TYPES = ["none", ...PHYSICAL_DAMAGE_TYPES] as const;
type NaturalWeaponDamageTypeProjection =
  (typeof NATURAL_WEAPON_DAMAGE_TYPES)[number];
const NATURAL_WEAPON_DAMAGE_TYPE_SET: ReadonlySet<string> = new Set(
  NATURAL_WEAPON_DAMAGE_TYPES,
);

const LAST_RESULTS = [
  "init",
  "aquaticCast",
  "naturalWeaponsCast",
  "nextCasterTurn",
  "changeAppearanceReplacement",
  "naturalWeaponsReplacement",
] as const;
type LastResult = (typeof LAST_RESULTS)[number];
const LAST_RESULT_SET: ReadonlySet<string> = new Set(LAST_RESULTS);

type SelfTransformationProjection = {
  readonly magicActionAvailable: boolean;
  readonly castSpellAvailable: boolean;
  readonly modeReplacementAvailable: boolean;
  readonly spellSlotExpended: number;
  readonly slotSpellCastThisTurn: boolean;
  readonly casterConcentrating: boolean;
  readonly activeMode: SelfTransformationModeProjection;
  readonly waterBreathing: boolean;
  readonly walkSpeedFeet: number;
  readonly swimSpeedFeet: number;
  readonly naturalWeaponDamageType: NaturalWeaponDamageTypeProjection;
  readonly naturalWeaponDamageDieSize: number;
  readonly naturalWeaponAttackBonus: number;
  readonly naturalWeaponDamageOnRoll4: number;
  readonly durationTicks: number;
  readonly lastResult: LastResult;
};

type SelfTransformationRuntimeState = {
  readonly battle: BattleState;
  readonly lastResult: LastResult;
};

const driverSchema = {
  init: {},
  doCastAquaticAdaptation: {},
  doCastNaturalWeapons: {},
  doStartNextCasterTurn: {},
  doReplaceChangeAppearance: {},
  doReplaceNaturalWeapons: {},
  doStutter: {},
  step: {},
} as const;

function createSelfTransformationModeLifecycleDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doCastAquaticAdaptation: () => {
        state = castSelfTransformationMode(state, {
          mode: "aquaticAdaptation",
          lastResult: "aquaticCast",
        });
      },
      doCastNaturalWeapons: () => {
        state = castSelfTransformationMode(state, {
          mode: "naturalWeapons",
          naturalWeaponDamageType: "slashing",
          lastResult: "naturalWeaponsCast",
        });
      },
      doStartNextCasterTurn: () => {
        state = startNextCasterTurn(state);
      },
      doReplaceChangeAppearance: () => {
        state = replaceSelfTransformationMode(state, {
          mode: "changeAppearance",
          lastResult: "changeAppearanceReplacement",
        });
      },
      doReplaceNaturalWeapons: () => {
        state = replaceSelfTransformationMode(state, {
          mode: "naturalWeapons",
          naturalWeaponDamageType: "piercing",
          lastResult: "naturalWeaponsReplacement",
        });
      },
      doStutter: () => {},
      step: () => {},
      getState: () => selfTransformationProjection(state),
    };
  });
}

const selfTransformationStateCheck = stateCheck(
  normalizeSelfTransformationQuintState,
  compareSelfTransformationStates,
);

describe("Self-transformation mode lifecycle MBT parity", () => {
  it("casts Aquatic Adaptation as a Concentration self transformation with Swim Speed projection", () => {
    const cast = castSelfTransformationMode(initialRuntimeState(), {
      mode: "aquaticAdaptation",
      lastResult: "aquaticCast",
    });

    expect(selfTransformationProjection(cast)).toMatchObject({
      magicActionAvailable: false,
      castSpellAvailable: false,
      modeReplacementAvailable: false,
      spellSlotExpended: 1,
      slotSpellCastThisTurn: true,
      casterConcentrating: true,
      activeMode: "aquaticAdaptation",
      waterBreathing: true,
      walkSpeedFeet: 30,
      swimSpeedFeet: 30,
      durationTicks: ALTER_SELF_DURATION_TICKS,
      lastResult: "aquaticCast",
    });
  });

  it("replaces the active option with a later Magic Action without spending another Spell Slot", () => {
    const cast = castSelfTransformationMode(initialRuntimeState(), {
      mode: "aquaticAdaptation",
      lastResult: "aquaticCast",
    });
    const nextTurn = startNextCasterTurn(cast);
    const replaced = replaceSelfTransformationMode(nextTurn, {
      mode: "changeAppearance",
      lastResult: "changeAppearanceReplacement",
    });

    expect(selfTransformationProjection(replaced)).toMatchObject({
      magicActionAvailable: false,
      castSpellAvailable: false,
      modeReplacementAvailable: false,
      spellSlotExpended: 1,
      slotSpellCastThisTurn: false,
      casterConcentrating: true,
      activeMode: "changeAppearance",
      waterBreathing: false,
      swimSpeedFeet: 0,
      durationTicks: ALTER_SELF_DURATION_TICKS_AFTER_ONE_ROUND,
      lastResult: "changeAppearanceReplacement",
    });
  });

  it("projects Natural Weapons as the selected Unarmed Strike replacement", () => {
    const cast = castSelfTransformationMode(initialRuntimeState(), {
      mode: "naturalWeapons",
      naturalWeaponDamageType: "slashing",
      lastResult: "naturalWeaponsCast",
    });
    const nextTurn = startNextCasterTurn(cast);

    expect(selfTransformationProjection(nextTurn)).toMatchObject({
      activeMode: "naturalWeapons",
      naturalWeaponDamageType: "slashing",
      naturalWeaponDamageDieSize: 6,
      naturalWeaponAttackBonus: 5,
      naturalWeaponDamageOnRoll4: NATURAL_WEAPON_DAMAGE_ON_ROLL_4,
      modeReplacementAvailable: true,
    });
    expect(unarmedStrikeAttackProjection(nextTurn.battle)).toMatchObject({
      attackAbility: "spellcasting",
      attackAbilityModifier: 3,
      attackBonus: 5,
      damageAbilityModifier: 3,
      effect: {
        kind: "damage",
        damage: {
          kind: "authoredReplacement",
          sourceUnitId: alterSelfUnitId,
          dice: 1,
          dieSize: 6,
          damageType: "slashing",
        },
      },
    });
  });

  it(
    "matches the focused self-transformation mode slice against bounded random MBT traces",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-self-transformation-mode-lifecycle.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createSelfTransformationModeLifecycleDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(6),
        stateCheck: selfTransformationStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function initialRuntimeState(): SelfTransformationRuntimeState {
  return {
    battle: spellBattle({
      preparedSpells: [spellRecord(alterSelfUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    }),
    lastResult: "init",
  };
}

function castSelfTransformationMode(
  state: SelfTransformationRuntimeState,
  input:
    | {
        readonly mode: "aquaticAdaptation";
        readonly lastResult: Extract<LastResult, "aquaticCast">;
      }
    | {
        readonly mode: "naturalWeapons";
        readonly naturalWeaponDamageType: Extract<
          NaturalWeaponDamageTypeProjection,
          "slashing"
        >;
        readonly lastResult: Extract<LastResult, "naturalWeaponsCast">;
      },
): SelfTransformationRuntimeState {
  const act = spellAct({
    state: state.battle,
    spellId: alterSelfUnitId,
    slotLevel: 2,
  });
  expect(act.subject.invocation).toMatchObject({
    tag: "spellSlot",
    spellId: alterSelfUnitId,
    slotLevel: 2,
    procedure: "selfTransformationMode",
  });
  const modeHole = requireHole(
    act.initialHoles,
    "selfTransformationModeChoice",
  );
  const modeFill = {
    kind: "selfTransformationModeChoice" as const,
    holeId: modeHole.holeId,
    value: input.mode,
  };
  const fills =
    input.mode === "naturalWeapons"
      ? [
          modeFill,
          {
            kind: "damageTypeChoice" as const,
            holeId: requireResultHole(
              resolveBattleSubject({
                state: state.battle,
                subject: act.subject,
                fills: [modeFill],
              }),
              "damageTypeChoice",
            ).holeId,
            value: input.naturalWeaponDamageType,
          },
        ]
      : [modeFill];
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills,
    }),
    "Expected Alter Self self-transformation mode to resolve.",
  );
  return { battle: resolved.state, lastResult: input.lastResult };
}

function startNextCasterTurn(
  state: SelfTransformationRuntimeState,
): SelfTransformationRuntimeState {
  const targetTurn = requireResolved(
    endTurn({ state: state.battle, actorId: spellCasterId }),
    "Expected caster end turn to resolve.",
  );
  const casterTurn = requireResolved(
    endTurn({ state: targetTurn.state, actorId: spellTargetId }),
    "Expected target end turn to resolve.",
  );
  return { battle: casterTurn.state, lastResult: "nextCasterTurn" };
}

function replaceSelfTransformationMode(
  state: SelfTransformationRuntimeState,
  input:
    | {
        readonly mode: "changeAppearance";
        readonly lastResult: Extract<LastResult, "changeAppearanceReplacement">;
      }
    | {
        readonly mode: "naturalWeapons";
        readonly naturalWeaponDamageType: Extract<
          NaturalWeaponDamageTypeProjection,
          "piercing"
        >;
        readonly lastResult: Extract<LastResult, "naturalWeaponsReplacement">;
      },
): SelfTransformationRuntimeState {
  const act = replacementAct(state.battle, input);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [],
    }),
    "Expected Alter Self mode replacement to resolve.",
  );
  return { battle: resolved.state, lastResult: input.lastResult };
}

function replacementAct(
  state: BattleState,
  input:
    | { readonly mode: "changeAppearance" }
    | {
        readonly mode: "naturalWeapons";
        readonly naturalWeaponDamageType: Extract<
          NaturalWeaponDamageTypeProjection,
          "piercing"
        >;
      },
) {
  const act =
    input.mode === "naturalWeapons"
      ? discoverBattleActs(state).find(
          (candidate) =>
            candidate.subject.tag === "runtimeCommand" &&
            candidate.subject.command === "replaceSelfTransformationMode" &&
            candidate.subject.mode === "naturalWeapons" &&
            candidate.subject.naturalWeaponDamageType ===
              input.naturalWeaponDamageType,
        )
      : discoverBattleActs(state).find(
          (candidate) =>
            candidate.subject.tag === "runtimeCommand" &&
            candidate.subject.command === "replaceSelfTransformationMode" &&
            candidate.subject.mode === "changeAppearance",
        );
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(`Expected ${input.mode} self-transformation replacement.`);
  }
  return act;
}

function selfTransformationProjection(
  state: SelfTransformationRuntimeState,
): SelfTransformationProjection {
  const caster = requireCombatant(state.battle, spellCasterId);
  const casterSnapshot = snapshotBattle(state.battle).combatants.find(
    (combatant) => combatant.combatantId === spellCasterId,
  );
  expect(casterSnapshot).toBeDefined();
  if (casterSnapshot === undefined) {
    throw new Error("Expected Alter Self caster in battle snapshot.");
  }
  const activeEffect = activeSelfTransformationModeEffect(caster);
  const swimSpeed = casterSnapshot.movement.speedKinds.find(
    (speed) => speed.kind === "swim",
  );
  const naturalWeaponDamageType =
    activeEffect?.mode === "naturalWeapons"
      ? naturalWeaponDamageTypeFromRuntime(activeEffect.naturalWeaponDamageType)
      : "none";
  return {
    magicActionAvailable: canSpendAction(
      state.battle.currentTurnResources,
      "magic",
    ),
    castSpellAvailable:
      maybeSpellAct({
        state: state.battle,
        spellId: alterSelfUnitId,
        slotLevel: 2,
      }) !== undefined,
    modeReplacementAvailable: discoverBattleActs(state.battle).some(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "replaceSelfTransformationMode",
    ),
    spellSlotExpended: casterSpellSlotExpended(state.battle),
    slotSpellCastThisTurn:
      state.battle.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed" && use.combatantId === spellCasterId,
      ),
    casterConcentrating:
      caster.concentration?.effectKind === "spellEffect" &&
      caster.concentration.sourceSpellId === alterSelfUnitId,
    activeMode: activeEffect?.mode ?? "none",
    waterBreathing: battleCreatureCanBreatheUnderwater(caster),
    walkSpeedFeet: Number(casterSnapshot.movement.speedFeet),
    swimSpeedFeet: Number(swimSpeed?.speedFeet ?? 0),
    naturalWeaponDamageType,
    naturalWeaponDamageDieSize:
      activeEffect?.mode === "naturalWeapons"
        ? activeEffect.naturalWeaponFacts.damage.dieSize
        : 0,
    naturalWeaponAttackBonus:
      activeEffect?.mode === "naturalWeapons"
        ? Number(activeEffect.naturalWeaponFacts.attackBonus)
        : 0,
    naturalWeaponDamageOnRoll4:
      activeEffect?.mode === "naturalWeapons"
        ? 4 +
          Number(activeEffect.naturalWeaponFacts.spellcastingAbilityModifier)
        : 0,
    durationTicks: Number(activeEffect?.expiresAt.durationTicks ?? 0),
    lastResult: state.lastResult,
  };
}

function unarmedStrikeAttackProjection(battle: BattleState) {
  const unarmedStrike = discoverBattleActs(battle).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack" &&
      candidate.subject.attackName === "Unarmed Strike",
  );
  expect(unarmedStrike).toBeDefined();
  if (unarmedStrike === undefined) {
    throw new Error("Expected Unarmed Strike attack act.");
  }
  const targetHole = requireHole(unarmedStrike.initialHoles, "targetChoice");
  const attackRoll = requireResultHole(
    resolveBattleSubject({
      state: battle,
      subject: unarmedStrike.subject,
      fills: [
        attackTargetFill(
          targetHole,
          spellCasterId,
          spellTargetId,
          "Unarmed Strike",
        ),
      ],
    }),
    "attackRoll",
  );
  if (!("attack" in attackRoll)) {
    throw new Error("Expected Unarmed Strike attack roll hole.");
  }
  return attackRoll.attack;
}

function casterSpellSlotExpended(state: BattleState): number {
  const caster = requireCombatant(state, spellCasterId);
  if (caster.origin.kind !== "character") {
    return 0;
  }
  const alterSelfSlot = caster.origin.spellcasting?.spellSlots.find(
    (slot) => Number(slot.spellLevel) === 2,
  );
  return Number(alterSelfSlot?.expended ?? 0);
}

function naturalWeaponDamageTypeFromRuntime(
  value: string,
): NaturalWeaponDamageTypeProjection {
  if (!isNaturalWeaponDamageType(value) || value === "none") {
    throw new Error(`Unexpected Alter Self runtime damage type ${value}.`);
  }
  return value;
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

function normalizeSelfTransformationQuintState(
  raw: unknown,
): SelfTransformationProjection {
  const state = quintStateRecord(raw);
  return {
    magicActionAvailable: booleanField(state, "qMagicActionAvailable"),
    castSpellAvailable: booleanField(state, "qCastSpellAvailable"),
    modeReplacementAvailable: booleanField(state, "qModeReplacementAvailable"),
    spellSlotExpended: numberFromQuintInt(
      state["qSpellSlotExpended"],
      "qSpellSlotExpended",
    ),
    slotSpellCastThisTurn: booleanField(state, "qSlotSpellCastThisTurn"),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    activeMode: selfTransformationMode(state["qActiveMode"]),
    waterBreathing: booleanField(state, "qWaterBreathing"),
    walkSpeedFeet: numberFromQuintInt(
      state["qWalkSpeedFeet"],
      "qWalkSpeedFeet",
    ),
    swimSpeedFeet: numberFromQuintInt(
      state["qSwimSpeedFeet"],
      "qSwimSpeedFeet",
    ),
    naturalWeaponDamageType: naturalWeaponDamageType(
      state["qNaturalWeaponDamageType"],
    ),
    naturalWeaponDamageDieSize: numberFromQuintInt(
      state["qNaturalWeaponDamageDieSize"],
      "qNaturalWeaponDamageDieSize",
    ),
    naturalWeaponAttackBonus: numberFromQuintInt(
      state["qNaturalWeaponAttackBonus"],
      "qNaturalWeaponAttackBonus",
    ),
    naturalWeaponDamageOnRoll4: numberFromQuintInt(
      state["qNaturalWeaponDamageOnRoll4"],
      "qNaturalWeaponDamageOnRoll4",
    ),
    durationTicks: numberFromQuintInt(
      state["qDurationTicks"],
      "qDurationTicks",
    ),
    lastResult: lastResult(state["qLastResult"]),
  };
}

function compareSelfTransformationStates(
  runtime: SelfTransformationProjection,
  quint: SelfTransformationProjection,
): boolean {
  expect(runtime).toStrictEqual(quint);
  return true;
}

function selfTransformationMode(
  raw: unknown,
): SelfTransformationModeProjection {
  expect(raw).toBeTypeOf("string");
  if (typeof raw !== "string" || !isSelfTransformationMode(raw)) {
    throw new Error(`Unexpected Alter Self mode ${String(raw)}.`);
  }
  return raw;
}

function naturalWeaponDamageType(
  raw: unknown,
): NaturalWeaponDamageTypeProjection {
  expect(raw).toBeTypeOf("string");
  if (typeof raw !== "string" || !isNaturalWeaponDamageType(raw)) {
    throw new Error(`Unexpected Alter Self damage type ${String(raw)}.`);
  }
  return raw;
}

function lastResult(raw: unknown): LastResult {
  expect(raw).toBeTypeOf("string");
  if (typeof raw !== "string" || !isLastResult(raw)) {
    throw new Error(`Unexpected Alter Self result ${String(raw)}.`);
  }
  return raw;
}

function isSelfTransformationMode(
  value: string,
): value is SelfTransformationModeProjection {
  return SELF_TRANSFORMATION_MODE_SET.has(value);
}

function isNaturalWeaponDamageType(
  value: string,
): value is NaturalWeaponDamageTypeProjection {
  return NATURAL_WEAPON_DAMAGE_TYPE_SET.has(value);
}

function isLastResult(value: string): value is LastResult {
  return LAST_RESULT_SET.has(value);
}
