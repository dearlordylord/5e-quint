// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-roll-modifier spell.invocation-self-ability-check-advantage
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.ROLL_MODIFIER_ACTIVE_EFFECTS
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Bane:
//   failed Charisma Saving Throws subtract 1d4 from attack rolls and
//   Saving Throws while the spell lasts.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Bless:
//   targets add 1d4 to attack rolls and Saving Throws while the spell lasts.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Enhance Ability:
//   chosen targets have Advantage on Ability Checks using a chosen ability,
//   and higher-level slots can choose a different ability for each target.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Enthrall:
//   failed Wisdom Saving Throws impose a -10 penalty to Wisdom (Perception)
//   checks and Passive Perception.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Guidance:
//   a willing target adds 1d4 to Ability Checks using the chosen skill.
// - .references/srd-5.2.1/Spells/Descriptions-M-P.md#Pass without Trace:
//   chosen creatures in the aura get +10 to Dexterity (Stealth) checks.
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Thaumaturgy:
//   Booming Voice grants Advantage on Charisma (Intimidation) checks and
//   shares the three active 1-minute effect cap.
// - .references/srd-5.2.1/Playing-the-Game.md#Advantage/Disadvantage:
//   Advantage and Disadvantage cancel to a normal d20 roll.
// - UBIQUITOUS_LANGUAGE.md: D20 Rolls, Advantage and Disadvantage, Spell
//   Invocation, and Spell Effect.
import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { difficultyClass } from "@dnd/shared/types";
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
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  passivePerceptionModifierDelta,
  requiredAbilityCheckRollMode,
} from "./battle-reducer/hole-helpers.ts";
import {
  abilityChoiceFill,
  maybeSpellAct,
  savingThrowOutcomeFill,
  skillChoiceFill,
  spellTargetFill,
  spellTargetListFill,
  targetAbilityChoicesFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  baneUnitId,
  blessUnitId,
  enhanceAbilityUnitId,
  enthrallUnitId,
  guidanceUnitId,
  passWithoutTraceUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  breakBattleConcentration,
  combatantId,
  resolveBattleSubject,
  thaumaturgyBoomingVoiceInfluenceAbilityCheckHole,
  type BattleActiveEffect,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type CombatantId,
} from "./index.ts";

const thaumaturgyUnitId = "thaumaturgy";
const secondTargetId = combatantId("roll-modifier-active-effects-target-2");

const MODIFIERS = ["none", "+1d4", "-1d4", "+10", "-10"] as const;
type Modifier = (typeof MODIFIERS)[number];
const MODIFIER_SET: ReadonlySet<string> = new Set(MODIFIERS);

const CHOICES = ["none", "dex", "wis", "stealth", "perception"] as const;
type Choice = (typeof CHOICES)[number];
const CHOICE_SET: ReadonlySet<string> = new Set(CHOICES);

const ROLL_MODES = ["normal", "advantage", "disadvantage"] as const;
type RollMode = (typeof ROLL_MODES)[number];
const ROLL_MODE_SET: ReadonlySet<string> = new Set(ROLL_MODES);

const ROLL_MODIFIER_HOLES = [
  "AbilityChoice",
  "SavingThrowOutcome",
  "SkillChoice",
  "TargetAbilityChoices",
  "ThaumaturgyActiveOneMinuteEffectCount",
] as const;
type RollModifierHole = (typeof ROLL_MODIFIER_HOLES)[number];
const ROLL_MODIFIER_HOLE_SET: ReadonlySet<string> = new Set(
  ROLL_MODIFIER_HOLES,
);

const LAST_RESULTS = [
  "init",
  "needsBaneSave",
  "baneFailedTarget",
  "blessTarget",
  "needsGuidanceSkill",
  "guidanceStealth",
  "passWithoutTraceStealth",
  "needsEnhanceAbility",
  "enhanceDex",
  "needsEnhanceTargetAbilities",
  "enhancePerTarget",
  "enthrallPerception",
  "needsThaumaturgyCount",
  "thaumaturgyBoomingVoice",
  "thaumaturgyCancelled",
  "concentrationBroken",
] as const;
type LastResult = (typeof LAST_RESULTS)[number];
const LAST_RESULT_SET: ReadonlySet<string> = new Set(LAST_RESULTS);

type RollModifierActiveEffectsProjection = {
  readonly actionAvailable: boolean;
  readonly spellAvailable: boolean;
  readonly casterConcentrating: boolean;
  readonly targetAttackModifier: Modifier;
  readonly targetSavingThrowModifier: Modifier;
  readonly casterAbilityCheckModifier: Modifier;
  readonly targetAbilityCheckModifier: Modifier;
  readonly casterSkill: Choice;
  readonly targetSkill: Choice;
  readonly targetAbilityChoice: Choice;
  readonly secondTargetAbilityChoice: Choice;
  readonly targetAbilityCheckRollMode: RollMode;
  readonly secondTargetAbilityCheckRollMode: RollMode;
  readonly thaumaturgyIntimidationRollMode: RollMode;
  readonly thaumaturgyEffectActive: boolean;
  readonly holes: readonly RollModifierHole[];
  readonly passivePerceptionDelta: number;
  readonly lastResult: LastResult;
};

type RollModifierActiveEffectsRuntimeState = {
  readonly battle: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastResult: LastResult;
};

const driverSchema = {
  init: {},
  doDiscoverBaneSave: {},
  doCastBaneFailed: {},
  doCastBless: {},
  doDiscoverGuidanceSkillChoice: {},
  doCastGuidanceStealth: {},
  doCastPassWithoutTrace: {},
  doDiscoverEnhanceAbilityChoice: {},
  doCastEnhanceDex: {},
  doDiscoverEnhanceTargetAbilityChoices: {},
  doCastEnhancePerTarget: {},
  doCastEnthrall: {},
  doDiscoverThaumaturgyCount: {},
  doCastThaumaturgyBoomingVoice: {},
  doCastThaumaturgyCancelled: {},
  doBreakConcentration: {},
  doStutter: {},
  step: {},
} as const;

function createRollModifierActiveEffectsDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doDiscoverBaneSave: () => {
        state = discoverBaneSave(state);
      },
      doCastBaneFailed: () => {
        state = castBaneFailed(state);
      },
      doCastBless: () => {
        state = castBless(state);
      },
      doDiscoverGuidanceSkillChoice: () => {
        state = discoverGuidanceSkillChoice(state);
      },
      doCastGuidanceStealth: () => {
        state = castGuidanceStealth(state);
      },
      doCastPassWithoutTrace: () => {
        state = castPassWithoutTrace(state);
      },
      doDiscoverEnhanceAbilityChoice: () => {
        state = discoverEnhanceAbilityChoice(state);
      },
      doCastEnhanceDex: () => {
        state = castEnhanceDex(state);
      },
      doDiscoverEnhanceTargetAbilityChoices: () => {
        state = discoverEnhanceTargetAbilityChoices(state);
      },
      doCastEnhancePerTarget: () => {
        state = castEnhancePerTarget(state);
      },
      doCastEnthrall: () => {
        state = castEnthrall(state);
      },
      doDiscoverThaumaturgyCount: () => {
        state = discoverThaumaturgyCount(state);
      },
      doCastThaumaturgyBoomingVoice: () => {
        state = castThaumaturgyBoomingVoice(state, false);
      },
      doCastThaumaturgyCancelled: () => {
        state = castThaumaturgyBoomingVoice(state, true);
      },
      doBreakConcentration: () => {
        state = breakRollModifierConcentration(state);
      },
      doStutter: () => {},
      step: () => {},
      getState: () => rollModifierActiveEffectsProjection(state),
    };
  });
}

const rollModifierActiveEffectsStateCheck = stateCheck(
  normalizeRollModifierActiveEffectsQuintState,
  compareRollModifierActiveEffectsStates,
);

describe("roll-modifier active effects MBT parity", () => {
  it("projects d20 modifiers for Attack Rolls, Saving Throws, and Ability Checks", () => {
    expect(
      rollModifierActiveEffectsProjection(castBless(initialRuntimeState())),
    ).toMatchObject({
      targetAttackModifier: "+1d4",
      targetSavingThrowModifier: "+1d4",
      casterConcentrating: true,
      lastResult: "blessTarget",
    });
    expect(
      rollModifierActiveEffectsProjection(
        castBaneFailed(discoverBaneSave(initialRuntimeState())),
      ),
    ).toMatchObject({
      targetAttackModifier: "-1d4",
      targetSavingThrowModifier: "-1d4",
      casterConcentrating: true,
      lastResult: "baneFailedTarget",
    });
    expect(
      rollModifierActiveEffectsProjection(
        castGuidanceStealth(initialRuntimeState()),
      ),
    ).toMatchObject({
      casterAbilityCheckModifier: "+1d4",
      casterSkill: "stealth",
      casterConcentrating: true,
      lastResult: "guidanceStealth",
    });
    expect(
      rollModifierActiveEffectsProjection(
        castPassWithoutTrace(initialRuntimeState()),
      ),
    ).toMatchObject({
      casterAbilityCheckModifier: "+10",
      targetAbilityCheckModifier: "+10",
      casterSkill: "stealth",
      targetSkill: "stealth",
      casterConcentrating: true,
      lastResult: "passWithoutTraceStealth",
    });
  });

  it("stores selected Ability and per-target Ability choices for Ability Check Advantage", () => {
    expect(
      rollModifierActiveEffectsProjection(
        castEnhanceDex(initialRuntimeState()),
      ),
    ).toMatchObject({
      targetAbilityChoice: "dex",
      secondTargetAbilityChoice: "none",
      targetAbilityCheckRollMode: "advantage",
      secondTargetAbilityCheckRollMode: "normal",
      lastResult: "enhanceDex",
    });
    expect(
      rollModifierActiveEffectsProjection(
        castEnhancePerTarget(initialRuntimeState()),
      ),
    ).toMatchObject({
      targetAbilityChoice: "dex",
      secondTargetAbilityChoice: "wis",
      targetAbilityCheckRollMode: "advantage",
      secondTargetAbilityCheckRollMode: "advantage",
      lastResult: "enhancePerTarget",
    });
  });

  it("projects fixed skill modifiers and Thaumaturgy Booming Voice Advantage", () => {
    expect(
      rollModifierActiveEffectsProjection(castEnthrall(initialRuntimeState())),
    ).toMatchObject({
      targetAbilityCheckModifier: "-10",
      targetSkill: "perception",
      passivePerceptionDelta: -10,
      lastResult: "enthrallPerception",
    });
    expect(
      rollModifierActiveEffectsProjection(
        castThaumaturgyBoomingVoice(initialRuntimeState(), false),
      ),
    ).toMatchObject({
      thaumaturgyEffectActive: true,
      thaumaturgyIntimidationRollMode: "advantage",
      casterConcentrating: false,
      lastResult: "thaumaturgyBoomingVoice",
    });
    expect(
      rollModifierActiveEffectsProjection(
        castThaumaturgyBoomingVoice(initialRuntimeState(), true),
      ),
    ).toMatchObject({
      thaumaturgyEffectActive: true,
      thaumaturgyIntimidationRollMode: "normal",
      lastResult: "thaumaturgyCancelled",
    });
  });

  it(
    "matches the TS reducer slice against bounded random MBT traces",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-roll-modifier-active-effects.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createRollModifierActiveEffectsDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(4),
        stateCheck: rollModifierActiveEffectsStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function initialRuntimeState(): RollModifierActiveEffectsRuntimeState {
  return {
    battle: spellBattle({
      cantrips: [spellRecord(guidanceUnitId), spellRecord(thaumaturgyUnitId)],
      preparedSpells: [
        spellRecord(baneUnitId),
        spellRecord(blessUnitId),
        spellRecord(enhanceAbilityUnitId),
        spellRecord(enthrallUnitId),
        spellRecord(passWithoutTraceUnitId),
      ],
      spellSlots: [
        { spellLevel: 1, count: 1 },
        { spellLevel: 2, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
      extraTargetIds: [secondTargetId],
    }),
    holes: [],
    lastResult: "init",
  };
}

function discoverBaneSave(
  state: RollModifierActiveEffectsRuntimeState,
): RollModifierActiveEffectsRuntimeState {
  const act = spellActInState(state.battle, baneUnitId, 1);
  const targetList = requireHole(act.initialHoles, "spellTargetList");
  const result = resolveBattleSubject({
    state: state.battle,
    subject: act.subject,
    fills: [
      spellTargetListFill(targetList, spellCasterId, baneUnitId, [
        spellTargetId,
        secondTargetId,
      ]),
    ],
  });
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Bane Saving Throw outcome hole.");
  }
  return { ...state, holes: result.holes, lastResult: "needsBaneSave" };
}

function castBaneFailed(
  state: RollModifierActiveEffectsRuntimeState,
): RollModifierActiveEffectsRuntimeState {
  const act = spellActInState(state.battle, baneUnitId, 1);
  const targetList = requireHole(act.initialHoles, "spellTargetList");
  const save = requireHole(state.holes, "savingThrowOutcome");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        spellTargetListFill(targetList, spellCasterId, baneUnitId, [
          spellTargetId,
          secondTargetId,
        ]),
        savingThrowOutcomeFill(save, [
          { targetId: spellTargetId, succeeded: false },
          { targetId: secondTargetId, succeeded: true },
        ]),
      ],
    }),
    "Expected Bane failed target to resolve.",
  );
  return { battle: resolved.state, holes: [], lastResult: "baneFailedTarget" };
}

function castBless(
  state: RollModifierActiveEffectsRuntimeState,
): RollModifierActiveEffectsRuntimeState {
  const act = spellActInState(state.battle, blessUnitId, 1);
  const targetList = requireHole(act.initialHoles, "spellTargetList");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        spellTargetListFill(targetList, spellCasterId, blessUnitId, [
          spellTargetId,
        ]),
      ],
    }),
    "Expected Bless target to resolve.",
  );
  return { battle: resolved.state, holes: [], lastResult: "blessTarget" };
}

function discoverGuidanceSkillChoice(
  state: RollModifierActiveEffectsRuntimeState,
): RollModifierActiveEffectsRuntimeState {
  const act = spellActInState(state.battle, guidanceUnitId);
  return {
    ...state,
    holes: [requireHole(act.initialHoles, "skillChoice")],
    lastResult: "needsGuidanceSkill",
  };
}

function castGuidanceStealth(
  state: RollModifierActiveEffectsRuntimeState,
): RollModifierActiveEffectsRuntimeState {
  const act = spellActInState(state.battle, guidanceUnitId);
  const target = requireHole(act.initialHoles, "targetChoice");
  const skill = requireHole(act.initialHoles, "skillChoice");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        spellTargetFill(target, guidanceUnitId, spellCasterId, spellCasterId),
        skillChoiceFill(skill, "stealth"),
      ],
    }),
    "Expected Guidance Stealth target to resolve.",
  );
  return { battle: resolved.state, holes: [], lastResult: "guidanceStealth" };
}

function castPassWithoutTrace(
  state: RollModifierActiveEffectsRuntimeState,
): RollModifierActiveEffectsRuntimeState {
  const act = spellActInState(state.battle, passWithoutTraceUnitId, 2);
  const targetList = requireHole(act.initialHoles, "spellTargetList");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        spellTargetListFill(targetList, spellCasterId, passWithoutTraceUnitId, [
          spellCasterId,
          spellTargetId,
        ]),
      ],
    }),
    "Expected Pass without Trace targets to resolve.",
  );
  return {
    battle: resolved.state,
    holes: [],
    lastResult: "passWithoutTraceStealth",
  };
}

function discoverEnhanceAbilityChoice(
  state: RollModifierActiveEffectsRuntimeState,
): RollModifierActiveEffectsRuntimeState {
  const act = spellActInState(state.battle, enhanceAbilityUnitId, 2);
  return {
    ...state,
    holes: [requireHole(act.initialHoles, "abilityChoice")],
    lastResult: "needsEnhanceAbility",
  };
}

function castEnhanceDex(
  state: RollModifierActiveEffectsRuntimeState,
): RollModifierActiveEffectsRuntimeState {
  const act = spellActInState(state.battle, enhanceAbilityUnitId, 2);
  const target = requireHole(act.initialHoles, "targetChoice");
  const ability = requireHole(act.initialHoles, "abilityChoice");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        spellTargetFill(
          target,
          enhanceAbilityUnitId,
          spellCasterId,
          spellTargetId,
        ),
        abilityChoiceFill(ability, "dex"),
      ],
    }),
    "Expected Enhance Ability Dexterity target to resolve.",
  );
  return { battle: resolved.state, holes: [], lastResult: "enhanceDex" };
}

function discoverEnhanceTargetAbilityChoices(
  state: RollModifierActiveEffectsRuntimeState,
): RollModifierActiveEffectsRuntimeState {
  const act = spellActInState(state.battle, enhanceAbilityUnitId, 3);
  return {
    ...state,
    holes: [requireHole(act.initialHoles, "targetAbilityChoices")],
    lastResult: "needsEnhanceTargetAbilities",
  };
}

function castEnhancePerTarget(
  state: RollModifierActiveEffectsRuntimeState,
): RollModifierActiveEffectsRuntimeState {
  const act = spellActInState(state.battle, enhanceAbilityUnitId, 3);
  const targetList = requireHole(act.initialHoles, "spellTargetList");
  const abilityByTarget = requireHole(act.initialHoles, "targetAbilityChoices");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        spellTargetListFill(targetList, spellCasterId, enhanceAbilityUnitId, [
          spellTargetId,
          secondTargetId,
        ]),
        targetAbilityChoicesFill(abilityByTarget, [
          { targetId: spellTargetId, ability: "dex" },
          { targetId: secondTargetId, ability: "wis" },
        ]),
      ],
    }),
    "Expected upcast Enhance Ability per-target choices to resolve.",
  );
  return { battle: resolved.state, holes: [], lastResult: "enhancePerTarget" };
}

function castEnthrall(
  state: RollModifierActiveEffectsRuntimeState,
): RollModifierActiveEffectsRuntimeState {
  const act = spellActInState(state.battle, enthrallUnitId, 2);
  const targetList = requireHole(act.initialHoles, "spellTargetList");
  const targetFill = spellTargetListFill(
    targetList,
    spellCasterId,
    enthrallUnitId,
    [spellTargetId, secondTargetId],
  );
  const save = requireResultHole(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [targetFill],
    }),
    "savingThrowOutcome",
  );
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(save, [
          { targetId: spellTargetId, succeeded: false },
          { targetId: secondTargetId, succeeded: true },
        ]),
      ],
    }),
    "Expected Enthrall failed target to resolve.",
  );
  return {
    battle: resolved.state,
    holes: [],
    lastResult: "enthrallPerception",
  };
}

function discoverThaumaturgyCount(
  state: RollModifierActiveEffectsRuntimeState,
): RollModifierActiveEffectsRuntimeState {
  const act = spellActInState(state.battle, thaumaturgyUnitId);
  return {
    ...state,
    holes: [findThaumaturgyCountHole(act.initialHoles)],
    lastResult: "needsThaumaturgyCount",
  };
}

function castThaumaturgyBoomingVoice(
  state: RollModifierActiveEffectsRuntimeState,
  cancelWithDisadvantage: boolean,
): RollModifierActiveEffectsRuntimeState {
  const act = spellActInState(state.battle, thaumaturgyUnitId);
  const count = findThaumaturgyCountHole(act.initialHoles);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: cancelWithDisadvantage
        ? withCharismaDisadvantageAgainstCaster(state.battle)
        : state.battle,
      subject: act.subject,
      fills: [thaumaturgyCountFill(count, 0)],
    }),
    "Expected Thaumaturgy Booming Voice to resolve.",
  );
  return {
    battle: resolved.state,
    holes: [],
    lastResult: cancelWithDisadvantage
      ? "thaumaturgyCancelled"
      : "thaumaturgyBoomingVoice",
  };
}

function breakRollModifierConcentration(
  state: RollModifierActiveEffectsRuntimeState,
): RollModifierActiveEffectsRuntimeState {
  return {
    battle: breakBattleConcentration(state.battle, spellCasterId),
    holes: [],
    lastResult: "concentrationBroken",
  };
}

function rollModifierActiveEffectsProjection(
  state: RollModifierActiveEffectsRuntimeState,
): RollModifierActiveEffectsProjection {
  return {
    actionAvailable: canSpendAction(state.battle.currentTurnResources, "magic"),
    spellAvailable:
      maybeSpellAct({
        state: state.battle,
        spellId: blessUnitId,
        slotLevel: 1,
      }) !== undefined,
    casterConcentrating:
      requireCombatant(state.battle, spellCasterId).concentration !== null,
    targetAttackModifier: d20ModifierFor(
      state.battle,
      spellTargetId,
      "attack_roll",
    ),
    targetSavingThrowModifier: d20ModifierFor(
      state.battle,
      spellTargetId,
      "saving_throw",
    ),
    casterAbilityCheckModifier: d20ModifierFor(
      state.battle,
      spellCasterId,
      "ability_check",
    ),
    targetAbilityCheckModifier: d20ModifierFor(
      state.battle,
      spellTargetId,
      "ability_check",
    ),
    casterSkill: d20ModifierSkillFor(state.battle, spellCasterId),
    targetSkill: d20ModifierSkillFor(state.battle, spellTargetId),
    targetAbilityChoice: abilityCheckModeAbilityFor(
      state.battle,
      spellTargetId,
    ),
    secondTargetAbilityChoice: abilityCheckModeAbilityFor(
      state.battle,
      secondTargetId,
    ),
    targetAbilityCheckRollMode: abilityCheckModeFor(
      state.battle,
      spellTargetId,
      "dex",
      "stealth",
    ),
    secondTargetAbilityCheckRollMode: abilityCheckModeFor(
      state.battle,
      secondTargetId,
      "wis",
      "perception",
    ),
    thaumaturgyIntimidationRollMode: thaumaturgyIntimidationMode(state.battle),
    thaumaturgyEffectActive: thaumaturgyBoomingVoiceEffectActive(state.battle),
    holes: battleHolesToRollModifierHoles(state.holes),
    passivePerceptionDelta: passivePerceptionModifierDelta(
      state.battle,
      spellTargetId,
    ),
    lastResult: state.lastResult,
  };
}

type D20RollModifierKind = Extract<
  BattleActiveEffect,
  { readonly kind: "d20RollModifier" }
>["on"][number];

function d20ModifierFor(
  state: BattleState,
  actorId: CombatantId,
  on: D20RollModifierKind,
): Modifier {
  const effect = requireCombatant(state, actorId).activeEffects.find(
    (
      candidate,
    ): candidate is Extract<
      BattleActiveEffect,
      { readonly kind: "d20RollModifier" }
    > => candidate.kind === "d20RollModifier" && candidate.on.includes(on),
  );
  if (effect === undefined) return "none";
  if ("amount" in effect.delta) {
    return modifierFromString(
      `${effect.delta.sign}${effect.delta.amount}`,
      "d20 roll modifier",
    );
  }
  if (effect.delta.dieSize === 1) {
    return modifierFromString(
      `${effect.delta.sign}${effect.delta.dice}`,
      "d20 roll modifier",
    );
  }
  const modifier = `${effect.delta.sign}${effect.delta.dice}d${effect.delta.dieSize}`;
  return modifierFromString(modifier, "d20 roll modifier");
}

function d20ModifierSkillFor(state: BattleState, actorId: CombatantId): Choice {
  const skill = requireCombatant(state, actorId).activeEffects.find(
    (
      candidate,
    ): candidate is Extract<
      BattleActiveEffect,
      { readonly kind: "d20RollModifier" }
    > =>
      candidate.kind === "d20RollModifier" &&
      candidate.on.includes("ability_check"),
  )?.skill;
  if (skill === null || skill === undefined) return "none";
  // CHOICE_SET is derived from CHOICES, so membership proves the local harness literal union.
  if (CHOICE_SET.has(skill)) return skill as Choice;
  throw new Error(`Unexpected roll modifier skill ${skill}.`);
}

function abilityCheckModeAbilityFor(
  state: BattleState,
  actorId: CombatantId,
): Choice {
  const ability = requireCombatant(state, actorId).activeEffects.find(
    (
      candidate,
    ): candidate is Extract<
      BattleActiveEffect,
      { readonly kind: "abilityCheckRollMode" }
    > => candidate.kind === "abilityCheckRollMode",
  )?.ability;
  if (ability === undefined) return "none";
  // CHOICE_SET is derived from CHOICES, so membership proves the local harness literal union.
  if (CHOICE_SET.has(ability)) return ability as Choice;
  throw new Error(`Unexpected Ability Check roll-mode ability ${ability}.`);
}

function abilityCheckModeFor(
  state: BattleState,
  actorId: CombatantId,
  ability: "dex" | "wis",
  skill: "stealth" | "perception",
): RollMode {
  return (
    requiredAbilityCheckRollMode(state, actorId, ability, { skill }) ?? "normal"
  );
}

function thaumaturgyIntimidationMode(state: BattleState): RollMode {
  return (
    thaumaturgyBoomingVoiceInfluenceAbilityCheckHole(
      state,
      spellCasterId,
      difficultyClass(13),
    ).rollMode ?? "normal"
  );
}

function thaumaturgyBoomingVoiceEffectActive(state: BattleState): boolean {
  return requireCombatant(state, spellCasterId).activeEffects.some(
    (effect) => effect.kind === "thaumaturgyBoomingVoice",
  );
}

function battleHolesToRollModifierHoles(
  holes: readonly BattleHole[],
): readonly RollModifierHole[] {
  return holes
    .map((hole) => {
      if (hole.kind === "savingThrowOutcome") return "SavingThrowOutcome";
      if (hole.kind === "skillChoice") return "SkillChoice";
      if (hole.kind === "abilityChoice") return "AbilityChoice";
      if (hole.kind === "targetAbilityChoices") return "TargetAbilityChoices";
      if (hole.kind === "thaumaturgyActiveOneMinuteEffectCount") {
        return "ThaumaturgyActiveOneMinuteEffectCount";
      }
      throw new Error(`Unexpected roll modifier hole ${hole.kind}.`);
    })
    .sort();
}

function spellActInState(
  state: BattleState,
  spellId: string,
  slotLevel?: number,
) {
  const act = maybeSpellAct({
    state,
    spellId,
    ...(slotLevel === undefined ? {} : { slotLevel }),
  });
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(`Expected ${spellId} spell act.`);
  }
  return act;
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

function findThaumaturgyCountHole(holes: readonly BattleHole[]) {
  const hole = requireHole(holes, "thaumaturgyActiveOneMinuteEffectCount");
  if (hole.kind !== "thaumaturgyActiveOneMinuteEffectCount") {
    throw new Error("Expected Thaumaturgy active-effect count hole.");
  }
  return hole;
}

function thaumaturgyCountFill(
  hole: ReturnType<typeof findThaumaturgyCountHole>,
  activeOneMinuteEffectCount: number,
): BattleFill {
  return {
    kind: "thaumaturgyActiveOneMinuteEffectCount",
    holeId: hole.holeId,
    value: { activeOneMinuteEffectCount },
  };
}

function withCharismaDisadvantageAgainstCaster(
  state: BattleState,
): BattleState {
  const source = requireCombatant(state, spellTargetId);
  const hexEffect = {
    kind: "spellMarkedDamageRider",
    sourceSpellId: "hex",
    sourceCombatantId: spellTargetId,
    targetCombatantId: spellCasterId,
    transfer: {
      kind: "awaitingTargetDrop",
      retargetTiming: "sameTurn",
    },
    abilityCheckBehavior: { kind: "abilityDisadvantage", ability: "cha" },
    damage: { expr: { dice: 1, dieSize: 6 }, damageType: "necrotic" },
    expiresAt: {
      kind: "concentration",
      combatantId: spellTargetId,
      durationTicks: elapsedTimeTicks(600),
    },
  } satisfies Extract<
    BattleActiveEffect,
    { readonly kind: "spellMarkedDamageRider" }
  >;
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellTargetId, {
      ...source,
      activeEffects: [...source.activeEffects, hexEffect],
    }),
  };
}

function normalizeRollModifierActiveEffectsQuintState(
  raw: unknown,
): RollModifierActiveEffectsProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: rollModifierHole,
  });
  const lastResultValue = lastResultField(state, "qScenarioResult");
  assertWitnessProtocolConsistentWithScenario({
    label: "Roll modifier active effects",
    scenarioResult: lastResultValue,
    protocol,
  });
  return {
    actionAvailable: booleanField(state, "qActionAvailable"),
    spellAvailable: booleanField(state, "qSpellAvailable"),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    targetAttackModifier: modifierField(state, "qTargetAttackModifier"),
    targetSavingThrowModifier: modifierField(
      state,
      "qTargetSavingThrowModifier",
    ),
    casterAbilityCheckModifier: modifierField(
      state,
      "qCasterAbilityCheckModifier",
    ),
    targetAbilityCheckModifier: modifierField(
      state,
      "qTargetAbilityCheckModifier",
    ),
    casterSkill: choiceField(state, "qCasterSkill"),
    targetSkill: choiceField(state, "qTargetSkill"),
    targetAbilityChoice: choiceField(state, "qTargetAbilityChoice"),
    secondTargetAbilityChoice: choiceField(state, "qSecondTargetAbilityChoice"),
    targetAbilityCheckRollMode: rollModeField(
      state,
      "qTargetAbilityCheckRollMode",
    ),
    secondTargetAbilityCheckRollMode: rollModeField(
      state,
      "qSecondTargetAbilityCheckRollMode",
    ),
    thaumaturgyIntimidationRollMode: rollModeField(
      state,
      "qThaumaturgyIntimidationRollMode",
    ),
    thaumaturgyEffectActive: booleanField(state, "qThaumaturgyEffectActive"),
    holes: protocol.holes,
    passivePerceptionDelta: numberFromQuintInt(
      state["qPassivePerceptionDelta"],
      "qPassivePerceptionDelta",
    ),
    lastResult: lastResultValue,
  };
}

function compareRollModifierActiveEffectsStates(
  runtime: RollModifierActiveEffectsProjection,
  quint: RollModifierActiveEffectsProjection,
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

function modifierField(
  state: Record<string, unknown>,
  fieldName: string,
): Modifier {
  const raw = state[fieldName];
  if (typeof raw === "string") return modifierFromString(raw, fieldName);
  throw new Error(`Unknown ${fieldName}: ${String(raw)}.`);
}

function modifierFromString(raw: string, fieldName: string): Modifier {
  // MODIFIER_SET is derived from MODIFIERS, so membership proves the local harness literal union.
  if (MODIFIER_SET.has(raw)) return raw as Modifier;
  throw new Error(`Unknown ${fieldName}: ${String(raw)}.`);
}

function choiceField(
  state: Record<string, unknown>,
  fieldName: string,
): Choice {
  const raw = state[fieldName];
  // CHOICE_SET is derived from CHOICES, so membership proves the local harness literal union.
  if (typeof raw === "string" && CHOICE_SET.has(raw)) return raw as Choice;
  throw new Error(`Unknown ${fieldName}: ${String(raw)}.`);
}

function rollModeField(
  state: Record<string, unknown>,
  fieldName: string,
): RollMode {
  const raw = state[fieldName];
  // ROLL_MODE_SET is derived from ROLL_MODES, so membership proves the local harness literal union.
  if (typeof raw === "string" && ROLL_MODE_SET.has(raw)) return raw as RollMode;
  throw new Error(`Unknown ${fieldName}: ${String(raw)}.`);
}

function rollModifierHole(raw: unknown): RollModifierHole {
  if (typeof raw === "string" && ROLL_MODIFIER_HOLE_SET.has(raw)) {
    // ROLL_MODIFIER_HOLE_SET is derived from ROLL_MODIFIER_HOLES, so membership proves the union.
    return raw as RollModifierHole;
  }
  throw new Error(`Unknown roll modifier hole: ${String(raw)}.`);
}

function lastResultField(
  state: Record<string, unknown>,
  fieldName: string,
): LastResult {
  const raw = state[fieldName];
  if (typeof raw === "string" && LAST_RESULT_SET.has(raw)) {
    // LAST_RESULT_SET is derived from LAST_RESULTS, so membership proves the local harness union.
    return raw as LastResult;
  }
  throw new Error(`Unknown ${fieldName}: ${String(raw)}.`);
}
