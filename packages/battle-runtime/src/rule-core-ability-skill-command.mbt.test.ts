// KERNEL-COVERAGE: parity-witness BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES
import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanValue,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  commandUnitId,
  enhanceAbilityUnitId,
  guidanceUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  requireCombatant,
  requireHole,
  requireResultHole,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  abilityChoiceFill,
  commandApproachMovementFill,
  commandFleeMovementFill,
  savingThrowOutcomeFill,
  skillChoiceFill,
  spellAct,
  spellTargetFill,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  abilityCheckFill,
  difficultyClass,
  fighterId,
  fighterVsGoblinBattle,
  findAct,
  goblinId,
  hasCondition,
  hidePrerequisites,
  movementFeet,
  targetFill,
} from "./battle-runtime-test-support.ts";
import {
  decodeRuleCoreComponentRoute,
  type RuleCoreComponentRoutedProjection,
  withRuleCoreComponentRoute,
} from "./rule-core-component-route.ts";
import {
  discoverBattleActs,
  endTurn,
  resolveBattleSubject,
  snapshotBattle,
  type BattleActiveEffect,
  type BattleFill,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";

type SkillChoiceValue = Extract<
  BattleFill,
  { readonly kind: "skillChoice" }
>["value"];

const replaySkills = [
  "acrobatics",
  "animal_handling",
  "arcana",
  "athletics",
  "deception",
  "history",
  "insight",
  "intimidation",
  "investigation",
  "medicine",
  "nature",
  "perception",
  "performance",
  "persuasion",
  "religion",
  "sleight_of_hand",
  "stealth",
  "survival",
] as const satisfies ReadonlyArray<SkillChoiceValue>;
type ReplaySkill = (typeof replaySkills)[number];

const guidanceSkillScenarioNames = [
  "guidance-skill-acrobatics",
  "guidance-skill-animal-handling",
  "guidance-skill-arcana",
  "guidance-skill-athletics",
  "guidance-skill-deception",
  "guidance-skill-history",
  "guidance-skill-insight",
  "guidance-skill-intimidation",
  "guidance-skill-investigation",
  "guidance-skill-medicine",
  "guidance-skill-nature",
  "guidance-skill-perception",
  "guidance-skill-performance",
  "guidance-skill-persuasion",
  "guidance-skill-religion",
  "guidance-skill-sleight-of-hand",
  "guidance-skill-stealth",
  "guidance-skill-survival",
] as const;
type GuidanceSkillScenario = (typeof guidanceSkillScenarioNames)[number];

const guidanceSkillByScenario = {
  "guidance-skill-acrobatics": "acrobatics",
  "guidance-skill-animal-handling": "animal_handling",
  "guidance-skill-arcana": "arcana",
  "guidance-skill-athletics": "athletics",
  "guidance-skill-deception": "deception",
  "guidance-skill-history": "history",
  "guidance-skill-insight": "insight",
  "guidance-skill-intimidation": "intimidation",
  "guidance-skill-investigation": "investigation",
  "guidance-skill-medicine": "medicine",
  "guidance-skill-nature": "nature",
  "guidance-skill-perception": "perception",
  "guidance-skill-performance": "performance",
  "guidance-skill-persuasion": "persuasion",
  "guidance-skill-religion": "religion",
  "guidance-skill-sleight-of-hand": "sleight_of_hand",
  "guidance-skill-stealth": "stealth",
  "guidance-skill-survival": "survival",
} as const satisfies Record<GuidanceSkillScenario, ReplaySkill>;

const scenarios = [
  "init",
  "search-fails",
  "search-succeeds",
  ...guidanceSkillScenarioNames,
  "enhance-ability-choice",
  "command-cast-grovel",
  "command-follow-grovel",
  "command-follow-drop",
  "command-halt-suppresses",
  "command-follow-approach-continues",
  "command-follow-approach-within-five",
  "command-follow-approach-no-movement",
  "command-follow-flee",
  "command-follow-flee-partial-rejected",
  "command-follow-flee-no-movement",
  "command-follow-flee-opportunity-attack",
] as const;
type Scenario = (typeof scenarios)[number];
type ReplayScenario = Exclude<Scenario, "init">;
const replayStepCount = scenarios.length - 1;

const pendingCommandOptions = [
  "none",
  "grovel",
  "halt",
  "drop",
  "approach",
  "flee",
] as const;
type PendingCommandOption = (typeof pendingCommandOptions)[number];

type Projection = RuleCoreComponentRoutedProjection & {
  readonly lastScenario: Scenario;
  readonly targetHidden: boolean;
  readonly targetProne: boolean;
  readonly targetEffectCount: number;
  readonly casterEffectCount: number;
  readonly actionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly movementSpentFeet: number;
  readonly currentActor: "Fighter" | "Goblin";
  readonly pendingCommandOption: PendingCommandOption;
  readonly droppedObjectCount: number;
  readonly reactionWindowOpen: boolean;
  readonly haltSuppressed: boolean;
  readonly d20ModifierSkill: ReplaySkill | "none";
  readonly abilityCheckModeAbility: "dex" | "none";
  readonly replayIndex: number;
};

type RuntimeCommandSubject = Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand" }
>;
type RuntimeCommandAct = ReturnType<typeof discoverBattleActs>[number] & {
  readonly subject: RuntimeCommandSubject;
};

const componentOwner = "RuleCoreAbilitySkillCommandOwner";

const initialProjection: Projection = withRuleCoreComponentRoute(componentOwner, {
  lastScenario: "init",
  targetHidden: false,
  targetProne: false,
  targetEffectCount: 0,
  casterEffectCount: 0,
  actionAvailable: true,
  bonusActionAvailable: true,
  movementSpentFeet: 0,
  currentActor: "Fighter",
  pendingCommandOption: "none",
  droppedObjectCount: 0,
  reactionWindowOpen: false,
  haltSuppressed: false,
  d20ModifierSkill: "none",
  abilityCheckModeAbility: "none",
  replayIndex: 0,
});

const driverSchema = {
  init: {},
  doSearchFails: {},
  doSearchSucceeds: {},
  doGuidanceSkillAcrobatics: {},
  doGuidanceSkillAnimalHandling: {},
  doGuidanceSkillArcana: {},
  doGuidanceSkillAthletics: {},
  doGuidanceSkillDeception: {},
  doGuidanceSkillHistory: {},
  doGuidanceSkillInsight: {},
  doGuidanceSkillIntimidation: {},
  doGuidanceSkillInvestigation: {},
  doGuidanceSkillMedicine: {},
  doGuidanceSkillNature: {},
  doGuidanceSkillPerception: {},
  doGuidanceSkillPerformance: {},
  doGuidanceSkillPersuasion: {},
  doGuidanceSkillReligion: {},
  doGuidanceSkillSleightOfHand: {},
  doGuidanceSkillStealth: {},
  doGuidanceSkillSurvival: {},
  doEnhanceAbilityChoice: {},
  doCommandCastGrovel: {},
  doCommandFollowGrovel: {},
  doCommandFollowDrop: {},
  doCommandHaltSuppresses: {},
  doCommandFollowApproachContinues: {},
  doCommandFollowApproachWithinFive: {},
  doCommandFollowApproachNoMovement: {},
  doCommandFollowFlee: {},
  doCommandFollowFleePartialRejected: {},
  doCommandFollowFleeNoMovement: {},
  doCommandFollowFleeOpportunityAttack: {},
  step: {},
} as const;

function createDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection;

    function reset(): void {
      projection = initialProjection;
    }

    function replay(scenario: ReplayScenario): void {
      projection = applyScenario(scenario);
    }

    function replayNext(): void {
      const scenario = scenarios[projection.replayIndex + 1];
      if (scenario === undefined || scenario === "init") return;
      replay(scenario);
    }

    return {
      init: reset,
      doSearchFails: () => replay("search-fails"),
      doSearchSucceeds: () => replay("search-succeeds"),
      doGuidanceSkillAcrobatics: () => replay("guidance-skill-acrobatics"),
      doGuidanceSkillAnimalHandling: () =>
        replay("guidance-skill-animal-handling"),
      doGuidanceSkillArcana: () => replay("guidance-skill-arcana"),
      doGuidanceSkillAthletics: () => replay("guidance-skill-athletics"),
      doGuidanceSkillDeception: () => replay("guidance-skill-deception"),
      doGuidanceSkillHistory: () => replay("guidance-skill-history"),
      doGuidanceSkillInsight: () => replay("guidance-skill-insight"),
      doGuidanceSkillIntimidation: () => replay("guidance-skill-intimidation"),
      doGuidanceSkillInvestigation: () =>
        replay("guidance-skill-investigation"),
      doGuidanceSkillMedicine: () => replay("guidance-skill-medicine"),
      doGuidanceSkillNature: () => replay("guidance-skill-nature"),
      doGuidanceSkillPerception: () => replay("guidance-skill-perception"),
      doGuidanceSkillPerformance: () => replay("guidance-skill-performance"),
      doGuidanceSkillPersuasion: () => replay("guidance-skill-persuasion"),
      doGuidanceSkillReligion: () => replay("guidance-skill-religion"),
      doGuidanceSkillSleightOfHand: () =>
        replay("guidance-skill-sleight-of-hand"),
      doGuidanceSkillStealth: () => replay("guidance-skill-stealth"),
      doGuidanceSkillSurvival: () => replay("guidance-skill-survival"),
      doEnhanceAbilityChoice: () => replay("enhance-ability-choice"),
      doCommandCastGrovel: () => replay("command-cast-grovel"),
      doCommandFollowGrovel: () => replay("command-follow-grovel"),
      doCommandFollowDrop: () => replay("command-follow-drop"),
      doCommandHaltSuppresses: () => replay("command-halt-suppresses"),
      doCommandFollowApproachContinues: () =>
        replay("command-follow-approach-continues"),
      doCommandFollowApproachWithinFive: () =>
        replay("command-follow-approach-within-five"),
      doCommandFollowApproachNoMovement: () =>
        replay("command-follow-approach-no-movement"),
      doCommandFollowFlee: () => replay("command-follow-flee"),
      doCommandFollowFleePartialRejected: () =>
        replay("command-follow-flee-partial-rejected"),
      doCommandFollowFleeNoMovement: () =>
        replay("command-follow-flee-no-movement"),
      doCommandFollowFleeOpportunityAttack: () =>
        replay("command-follow-flee-opportunity-attack"),
      step: replayNext,
      getState: () => projection,
    };
  });
}

const abilitySkillCommandStateCheck = stateCheck(
  normalizeQuintState,
  compareState,
);

describe("rule-core ability, skill, Search, and Command deterministic QNT replay", () => {
  it(
    "replays closed reducer choices and Command next-turn consequences",
    async () => {
      expectGuidanceReplaySkillsMatchRuntimeChoices();

      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "rule-core-ability-skill-command.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(replayStepCount),
        stateCheck: abilitySkillCommandStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function expectGuidanceReplaySkillsMatchRuntimeChoices(): void {
  const state = spellBattle({
    cantrips: [spellRecord(guidanceUnitId)],
    spellSlots: [],
  });
  const act = spellAct({ state, spellId: guidanceUnitId });
  const skill = requireHole(act.initialHoles, "skillChoice");
  expect(skill.choices).toEqual(replaySkills);
}

function applyScenario(scenario: ReplayScenario): Projection {
  if (isGuidanceSkillScenario(scenario)) {
    return guidanceScenario(guidanceSkillByScenario[scenario], scenario);
  }
  const applicators = {
    "search-fails": () => searchScenario(scenario, 15),
    "search-succeeds": () => searchScenario(scenario, 16),
    "enhance-ability-choice": enhanceAbilityScenario,
    "command-cast-grovel": () => commandCastScenario("grovel"),
    "command-follow-grovel": commandGrovelScenario,
    "command-follow-drop": commandDropScenario,
    "command-halt-suppresses": commandHaltScenario,
    "command-follow-approach-continues": commandApproachContinuesScenario,
    "command-follow-approach-within-five": commandApproachWithinFiveScenario,
    "command-follow-approach-no-movement": commandApproachNoMovementScenario,
    "command-follow-flee": commandFleeScenario,
    "command-follow-flee-partial-rejected": commandFleePartialRejectedScenario,
    "command-follow-flee-no-movement": commandFleeNoMovementScenario,
    "command-follow-flee-opportunity-attack":
      commandFleeOpportunityAttackScenario,
  } satisfies Record<
    Exclude<ReplayScenario, GuidanceSkillScenario>,
    () => Projection
  >;
  return applicators[scenario]();
}

function searchScenario(scenario: ReplayScenario, searchTotal: number) {
  const state = fighterVsGoblinBattle({
    hidePrerequisites: hidePrerequisites([
      [fighterId, { kind: "heavilyObscuredOutOfEnemyLineOfSight" }],
    ]),
  });
  const hideSubject: BattleSubject = {
    tag: "action",
    actorId: fighterId,
    action: "hide",
  };
  const hideAct = findAct(state, hideSubject);
  const hidden = requireResolved(
    resolveBattleSubject({
      state,
      subject: hideSubject,
      fills: [
        abilityCheckFill(requireHole(hideAct.initialHoles, "abilityCheck"), 16),
      ],
    }),
  ).state;
  const goblinTurn = requireResolved(
    endTurn({ state: hidden, actorId: fighterId }),
  ).state;
  const searchSubject: BattleSubject = {
    tag: "action",
    actorId: goblinId,
    action: "search",
  };
  const searchTarget = requireResultHole(
    resolveBattleSubject({
      state: goblinTurn,
      subject: searchSubject,
      fills: [],
    }),
    "targetChoice",
  );
  const searchCheck = requireResultHole(
    resolveBattleSubject({
      state: goblinTurn,
      subject: searchSubject,
      fills: [targetFill(searchTarget, fighterId)],
    }),
    "abilityCheck",
  );
  const searched = requireResolved(
    resolveBattleSubject({
      state: goblinTurn,
      subject: searchSubject,
      fills: [
        targetFill(searchTarget, fighterId),
        abilityCheckFill(searchCheck, searchTotal),
      ],
    }),
  );
  return projectState({
    state: searched.state,
    scenario,
    targetId: fighterId,
    casterId: fighterId,
  });
}

function guidanceScenario(
  skillSelection: ReplaySkill,
  scenario: GuidanceSkillScenario,
): Projection {
  const state = spellBattle({
    cantrips: [spellRecord(guidanceUnitId)],
    spellSlots: [],
  });
  const act = spellAct({ state, spellId: guidanceUnitId });
  const target = requireHole(act.initialHoles, "targetChoice");
  const skill = requireHole(act.initialHoles, "skillChoice");
  const guided = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(target, guidanceUnitId, spellCasterId, spellCasterId),
        skillChoiceFill(skill, skillSelection),
      ],
    }),
  );
  return projectState({
    state: guided.state,
    scenario,
    targetId: spellCasterId,
    casterId: spellCasterId,
  });
}

function enhanceAbilityScenario(): Projection {
  const state = spellBattle({
    preparedSpells: [spellRecord(enhanceAbilityUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
  const act = spellAct({ state, spellId: enhanceAbilityUnitId });
  const target = requireHole(act.initialHoles, "targetChoice");
  const ability = requireHole(act.initialHoles, "abilityChoice");
  const enhanced = requireResolved(
    resolveBattleSubject({
      state,
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
  );
  return projectState({
    state: enhanced.state,
    scenario: "enhance-ability-choice",
    targetId: spellTargetId,
    casterId: spellCasterId,
  });
}

function commandCastScenario(
  option: Extract<
    BattleFill,
    { readonly kind: "commandOptionChoice" }
  >["value"],
): Projection {
  const cast = castCommand(option);
  return projectState({
    state: cast.state,
    scenario: "command-cast-grovel",
    targetId: spellTargetId,
    casterId: spellCasterId,
  });
}

function commandGrovelScenario(): Projection {
  const targetTurn = commandTargetTurn("grovel");
  const command = requireRuntimeCommand(targetTurn, "commandGrovel");
  const grovelled = requireResolved(
    resolveBattleSubject({
      state: targetTurn,
      subject: command.subject,
      fills: [],
    }),
  );
  return projectState({
    state: grovelled.state,
    scenario: "command-follow-grovel",
    targetId: spellTargetId,
    casterId: spellCasterId,
  });
}

function commandDropScenario(): Projection {
  const targetTurn = commandTargetTurn("drop", {
    targetAttack: zeroAbilityWeaponAttack("weapon_longsword"),
  });
  const command = requireRuntimeCommand(targetTurn, "commandDrop");
  const dropped = requireResolved(
    resolveBattleSubject({
      state: targetTurn,
      subject: command.subject,
      fills: [],
    }),
  );
  return projectState({
    state: dropped.state,
    scenario: "command-follow-drop",
    targetId: spellTargetId,
    casterId: spellCasterId,
    droppedObjectCount: dropped.droppedObjects?.length ?? 0,
  });
}

function commandHaltScenario(): Projection {
  const targetTurn = commandTargetTurn("halt");
  return projectState({
    state: targetTurn,
    scenario: "command-halt-suppresses",
    targetId: spellTargetId,
    casterId: spellCasterId,
  });
}

function commandApproachContinuesScenario(): Projection {
  const targetTurn = commandTargetTurn("approach");
  const command = requireRuntimeCommand(targetTurn, "commandApproach");
  const movement = requireHole(command.initialHoles, "movement");
  const approached = requireResolved(
    resolveBattleSubject({
      state: targetTurn,
      subject: command.subject,
      fills: [
        commandApproachMovementFill(movement, {
          movementCostFeet: 10,
          movedWithinFiveFeetOfCaster: false,
        }),
      ],
    }),
  );
  return projectState({
    state: approached.state,
    scenario: "command-follow-approach-continues",
    targetId: spellTargetId,
    casterId: spellCasterId,
  });
}

function commandApproachWithinFiveScenario(): Projection {
  const targetTurn = commandTargetTurn("approach");
  const command = requireRuntimeCommand(targetTurn, "commandApproach");
  const movement = requireHole(command.initialHoles, "movement");
  const approached = requireResolved(
    resolveBattleSubject({
      state: targetTurn,
      subject: command.subject,
      fills: [
        commandApproachMovementFill(movement, {
          movementCostFeet: 10,
          movedWithinFiveFeetOfCaster: true,
        }),
      ],
    }),
  );
  return projectState({
    state: approached.state,
    scenario: "command-follow-approach-within-five",
    targetId: spellTargetId,
    casterId: spellCasterId,
  });
}

function commandApproachNoMovementScenario(): Projection {
  const targetTurn = grappledByCaster(commandTargetTurn("approach"));
  const command = requireRuntimeCommand(targetTurn, "commandApproach");
  const approached = requireResolved(
    resolveBattleSubject({
      state: targetTurn,
      subject: command.subject,
      fills: [],
    }),
  );
  return projectState({
    state: approached.state,
    scenario: "command-follow-approach-no-movement",
    targetId: spellTargetId,
    casterId: spellCasterId,
  });
}

function commandFleeScenario(): Projection {
  const targetTurn = commandTargetTurn("flee");
  const command = requireRuntimeCommand(targetTurn, "commandFlee");
  const movement = requireHole(command.initialHoles, "movement");
  const fled = requireResolved(
    resolveBattleSubject({
      state: targetTurn,
      subject: command.subject,
      fills: [
        commandFleeMovementFill(movement, {
          movementCostFeet: 30,
          provokedOpportunityAttacks: [],
        }),
      ],
    }),
  );
  return projectState({
    state: fled.state,
    scenario: "command-follow-flee",
    targetId: spellTargetId,
    casterId: spellCasterId,
  });
}

function commandFleePartialRejectedScenario(): Projection {
  const targetTurn = commandTargetTurn("flee");
  const command = requireRuntimeCommand(targetTurn, "commandFlee");
  const movement = requireHole(command.initialHoles, "movement");
  const rejected = resolveBattleSubject({
    state: targetTurn,
    subject: command.subject,
    fills: [
      commandFleeMovementFill(movement, {
        movementCostFeet: 10,
        provokedOpportunityAttacks: [],
      }),
    ],
  });
  if (rejected.tag !== "invalid" || rejected.reason !== "invalidFill") {
    throw new Error("Expected partial Command Flee movement to be rejected.");
  }
  return projectState({
    state: targetTurn,
    scenario: "command-follow-flee-partial-rejected",
    targetId: spellTargetId,
    casterId: spellCasterId,
  });
}

function commandFleeNoMovementScenario(): Projection {
  const targetTurn = grappledByCaster(commandTargetTurn("flee"));
  const command = requireRuntimeCommand(targetTurn, "commandFlee");
  const fled = requireResolved(
    resolveBattleSubject({
      state: targetTurn,
      subject: command.subject,
      fills: [],
    }),
  );
  return projectState({
    state: fled.state,
    scenario: "command-follow-flee-no-movement",
    targetId: spellTargetId,
    casterId: spellCasterId,
  });
}

function commandFleeOpportunityAttackScenario(): Projection {
  const targetTurn = commandTargetTurn("flee");
  const command = requireRuntimeCommand(targetTurn, "commandFlee");
  const movement = requireHole(command.initialHoles, "movement");
  const fled = resolveBattleSubject({
    state: targetTurn,
    subject: command.subject,
    fills: [
      commandFleeMovementFill(movement, {
        movementCostFeet: 30,
        provokedOpportunityAttacks: [
          { reactorId: spellCasterId, attackName: "Unarmed Strike" },
        ],
      }),
    ],
  });
  const reaction = requireResultHole(fled, "interruptDecision");
  if (reaction.trigger !== "opportunityAttack" || fled.tag !== "needsHoles") {
    throw new Error("Expected Command Flee to open an opportunity attack.");
  }
  return projectState({
    state: fled.state,
    scenario: "command-follow-flee-opportunity-attack",
    targetId: spellTargetId,
    casterId: spellCasterId,
  });
}

function commandTargetTurn(
  option: Extract<
    BattleFill,
    { readonly kind: "commandOptionChoice" }
  >["value"],
  battleInput: Partial<Parameters<typeof spellBattle>[0]> = {},
): BattleState {
  const cast = castCommand(option, battleInput);
  return requireResolved(endTurn({ state: cast.state, actorId: spellCasterId }))
    .state;
}

function castCommand(
  option: Extract<
    BattleFill,
    { readonly kind: "commandOptionChoice" }
  >["value"],
  battleInput: Partial<Parameters<typeof spellBattle>[0]> = {},
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  const state = spellBattle({
    ...battleInput,
    preparedSpells: [spellRecord(commandUnitId)],
    spellSlots: [{ spellLevel: 1, count: 1 }],
  });
  const act = spellAct({ state, spellId: commandUnitId, slotLevel: 1 });
  const target = requireHole(act.initialHoles, "spellTargetList");
  const commandOption = requireHole(act.initialHoles, "commandOptionChoice");
  const targetSelection = spellTargetListFill(
    target,
    spellCasterId,
    commandUnitId,
    [spellTargetId],
  );
  const optionSelection: Extract<
    BattleFill,
    { readonly kind: "commandOptionChoice" }
  > = {
    kind: "commandOptionChoice",
    holeId: commandOption.holeId,
    value: option,
  };
  const savingThrow = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetSelection, optionSelection],
    }),
    "savingThrowOutcome",
  );
  return requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetSelection,
        optionSelection,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    }),
  );
}

function grappledByCaster(state: BattleState): BattleState {
  return {
    ...state,
    grapples: [
      {
        grapplerId: spellCasterId,
        targetId: spellTargetId,
        escapeDc: difficultyClass(12),
        reachFeet: movementFeet(5),
        hand: "left",
      },
    ],
  };
}

function requireRuntimeCommand(
  state: BattleState,
  command: RuntimeCommandSubject["command"],
): RuntimeCommandAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is RuntimeCommandAct =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === command,
  );
  if (act === undefined) {
    throw new Error(`Expected runtime command ${command}.`);
  }
  return act;
}

function projectState(input: {
  readonly state: BattleState;
  readonly scenario: ReplayScenario;
  readonly targetId: CombatantId;
  readonly casterId: CombatantId;
  readonly droppedObjectCount?: number;
}): Projection {
  const target = requireCombatant(input.state, input.targetId);
  const caster = requireCombatant(input.state, input.casterId);
  const snapshot = snapshotBattle(input.state);
  const targetSnapshot = snapshot.combatants.find(
    (combatant) => combatant.combatantId === input.targetId,
  );
  if (targetSnapshot === undefined) {
    throw new Error(`Expected target snapshot ${input.targetId}.`);
  }
  return withRuleCoreComponentRoute(componentOwner, {
    lastScenario: input.scenario,
    targetHidden: target.hidden !== null,
    targetProne: hasCondition(target.conditions, "prone"),
    targetEffectCount: target.activeEffects.length,
    casterEffectCount: caster.activeEffects.length,
    actionAvailable: snapshot.turn.actionResources.length > 0,
    bonusActionAvailable: snapshot.turn.bonusActionAvailable,
    movementSpentFeet: Number(targetSnapshot.movement.spentFeet),
    currentActor: actorName(snapshot.currentActorId),
    pendingCommandOption: pendingCommandOption(target.activeEffects),
    droppedObjectCount: input.droppedObjectCount ?? 0,
    reactionWindowOpen: input.state.interruptStack.length > 0,
    haltSuppressed: input.state.currentTurnResources.commandHalt !== null,
    d20ModifierSkill: d20ModifierSkill([
      ...target.activeEffects,
      ...caster.activeEffects,
    ]),
    abilityCheckModeAbility: abilityCheckModeAbility([
      ...target.activeEffects,
      ...caster.activeEffects,
    ]),
    replayIndex: replayIndexForScenario(input.scenario),
  });
}

function actorName(actorId: CombatantId): Projection["currentActor"] {
  if (actorId === fighterId || actorId === spellCasterId) return "Fighter";
  if (actorId === goblinId || actorId === spellTargetId) return "Goblin";
  throw new Error(`Unexpected actor id ${actorId}.`);
}

function pendingCommandOption(
  effects: readonly BattleActiveEffect[],
): PendingCommandOption {
  const effect = effects.find(
    (candidate) => candidate.kind === "commandPending",
  );
  return effect?.kind === "commandPending" ? effect.option : "none";
}

function d20ModifierSkill(
  effects: readonly BattleActiveEffect[],
): Projection["d20ModifierSkill"] {
  const effect = effects.find(
    (candidate) => candidate.kind === "d20RollModifier",
  );
  if (effect?.kind !== "d20RollModifier" || effect.skill === null) {
    return "none";
  }
  if (isReplaySkill(effect.skill)) return effect.skill;
  throw new Error(`Unexpected d20 modifier skill ${effect.skill}.`);
}

function abilityCheckModeAbility(
  effects: readonly BattleActiveEffect[],
): Projection["abilityCheckModeAbility"] {
  const effect = effects.find(
    (candidate) => candidate.kind === "abilityCheckRollMode",
  );
  return effect?.kind === "abilityCheckRollMode" && effect.ability === "dex"
    ? "dex"
    : "none";
}

function requireResolved(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved result, got ${result.tag}.`);
  }
  return result;
}

function normalizeQuintState(raw: unknown): Projection {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint ability/skill/Command state object.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  return {
    componentRoute: decodeRuleCoreComponentRoute(state["qComponentRoute"]),
    lastScenario: scenarioField(state["qLastScenario"]),
    targetHidden: booleanValue(state["qTargetHidden"], "qTargetHidden"),
    targetProne: booleanValue(state["qTargetProne"], "qTargetProne"),
    targetEffectCount: numberFromQuintInt(
      state["qTargetEffectCount"],
      "qTargetEffectCount",
    ),
    casterEffectCount: numberFromQuintInt(
      state["qCasterEffectCount"],
      "qCasterEffectCount",
    ),
    actionAvailable: booleanValue(
      state["qActionAvailable"],
      "qActionAvailable",
    ),
    bonusActionAvailable: booleanValue(
      state["qBonusActionAvailable"],
      "qBonusActionAvailable",
    ),
    movementSpentFeet: numberFromQuintInt(
      state["qMovementSpentFeet"],
      "qMovementSpentFeet",
    ),
    currentActor: currentActorField(state["qCurrentActor"]),
    pendingCommandOption: pendingCommandOptionField(
      state["qPendingCommandOption"],
    ),
    droppedObjectCount: numberFromQuintInt(
      state["qDroppedObjectCount"],
      "qDroppedObjectCount",
    ),
    reactionWindowOpen: booleanValue(
      state["qReactionWindowOpen"],
      "qReactionWindowOpen",
    ),
    haltSuppressed: booleanValue(state["qHaltSuppressed"], "qHaltSuppressed"),
    d20ModifierSkill: d20ModifierSkillField(state["qD20ModifierSkill"]),
    abilityCheckModeAbility: abilityCheckModeAbilityField(
      state["qAbilityCheckModeAbility"],
    ),
    replayIndex: numberFromQuintInt(state["qReplayIndex"], "qReplayIndex"),
  };
}

function compareState(runtime: Projection, quint: Projection): boolean {
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

function scenarioField(raw: unknown): Scenario {
  if (typeof raw === "string" && isScenario(raw)) {
    return raw;
  }
  throw new Error(`Unknown scenario ${String(raw)}.`);
}

function isScenario(raw: string): raw is Scenario {
  return scenarios.some((scenario) => scenario === raw);
}

function isGuidanceSkillScenario(
  scenario: ReplayScenario,
): scenario is GuidanceSkillScenario {
  return guidanceSkillScenarioNames.some((candidate) => candidate === scenario);
}

function currentActorField(raw: unknown): Projection["currentActor"] {
  if (raw === "Fighter" || raw === "Goblin") return raw;
  throw new Error(`Unknown current actor ${String(raw)}.`);
}

function pendingCommandOptionField(raw: unknown): PendingCommandOption {
  if (typeof raw === "string" && isPendingCommandOption(raw)) return raw;
  throw new Error(`Unknown pending Command option ${String(raw)}.`);
}

function isPendingCommandOption(raw: string): raw is PendingCommandOption {
  return pendingCommandOptions.some((option) => option === raw);
}

function d20ModifierSkillField(raw: unknown): Projection["d20ModifierSkill"] {
  if (raw === "none") return raw;
  if (typeof raw === "string" && isReplaySkill(raw)) return raw;
  throw new Error(`Unknown d20 modifier skill ${String(raw)}.`);
}

function isReplaySkill(raw: string): raw is ReplaySkill {
  return replaySkills.some((skill) => skill === raw);
}

function abilityCheckModeAbilityField(
  raw: unknown,
): Projection["abilityCheckModeAbility"] {
  if (raw === "dex" || raw === "none") return raw;
  throw new Error(`Unknown ability-check mode ability ${String(raw)}.`);
}

function replayIndexForScenario(scenario: ReplayScenario): number {
  const index = scenarios.indexOf(scenario);
  if (index <= 0) {
    throw new Error(`Unexpected replay scenario ${scenario}.`);
  }
  return index;
}
