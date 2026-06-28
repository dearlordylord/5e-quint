// KERNEL-COVERAGE: parity-witness BATTLE.ABILITY_CHECK.CHOICE_AND_SEARCH_HOLES

import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanValue,
  decodeReducerRoute,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintField,
  quintStateRecord,
  quintVariantMappedValue,
  run,
  stateCheck,
  stringLiteralField,
  type MbtWitnessLastResult,
  type ReducerRouteEvent,
  type ReducerRouteFill,
  type ReducerRouteHole,
  type ReducerRouteOwnerGroup,
  type ReducerRouteSubjectFamily,
} from "./battle-runtime-mbt-driver-kit.ts";
import { requiredAbilityCheckRollMode } from "./battle-reducer/hole-helpers.ts";
import {
  enhanceAbilityUnitId,
  guidanceUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  requireCombatant,
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  abilityChoiceFill,
  skillChoiceFill,
  spellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  abilityCheckFill,
  fighterId,
  fighterVsGoblinBattle,
  findAct,
  goblinId,
  hidePrerequisites,
  targetFill,
} from "./battle-runtime-test-support.ts";
import {
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

const abilityCheckChoiceSearchScenarios = [
  "init",
  "search-target-choice-open",
  "search-ability-check-open",
  "search-invalid-target-rejected",
  "search-invalid-ability-fill-rejected",
  "search-fails",
  "search-succeeds",
  "guidance-skill-choice-open",
  "guidance-invalid-ability-fill-rejected",
  "guidance-skill-athletics",
  "enhance-ability-choice-open",
  "enhance-ability-invalid-skill-fill-rejected",
  "enhance-ability-dex",
] as const;
type AbilityCheckChoiceSearchScenario =
  (typeof abilityCheckChoiceSearchScenarios)[number];
type AbilityCheckChoiceSearchReplayScenario = Exclude<
  AbilityCheckChoiceSearchScenario,
  "init"
>;

const abilityCheckChoiceSearchScenarioByQuintTag = {
  AbilityCheckChoiceSearchInit: "init",
  SearchTargetChoiceOpen: "search-target-choice-open",
  SearchAbilityCheckOpen: "search-ability-check-open",
  SearchInvalidTargetRejected: "search-invalid-target-rejected",
  SearchInvalidAbilityFillRejected: "search-invalid-ability-fill-rejected",
  SearchFails: "search-fails",
  SearchSucceeds: "search-succeeds",
  GuidanceSkillChoiceOpen: "guidance-skill-choice-open",
  GuidanceInvalidAbilityFillRejected: "guidance-invalid-ability-fill-rejected",
  GuidanceSkillAthletics: "guidance-skill-athletics",
  EnhanceAbilityChoiceOpen: "enhance-ability-choice-open",
  EnhanceAbilityInvalidSkillFillRejected:
    "enhance-ability-invalid-skill-fill-rejected",
  EnhanceAbilityDex: "enhance-ability-dex",
} as const satisfies Readonly<Record<string, AbilityCheckChoiceSearchScenario>>;

const protocolHoles = [
  "targetChoice",
  "abilityCheck",
  "skillChoice",
  "abilityChoice",
] as const;
type ProtocolHole = (typeof protocolHoles)[number];

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
] as const satisfies ReadonlyArray<
  Extract<BattleFill, { readonly kind: "skillChoice" }>["value"]
>;
type ReplaySkill = (typeof replaySkills)[number];

const abilityCheckModeAbilities = ["none", "dex"] as const;
type AbilityCheckModeAbility = (typeof abilityCheckModeAbilities)[number];

const targetDexRollModes = ["normal", "advantage"] as const;
type TargetDexRollMode = (typeof targetDexRollModes)[number];

type AbilityCheckChoiceSearchProjection = {
  readonly scenario: AbilityCheckChoiceSearchScenario;
  readonly lastResult: MbtWitnessLastResult;
  readonly lastInvalidReason: "none" | "invalidFill";
  readonly holes: readonly ProtocolHole[];
  readonly targetHidden: boolean;
  readonly actionAvailable: boolean;
  readonly targetEffectCount: number;
  readonly casterEffectCount: number;
  readonly d20ModifierSkill: ReplaySkill | "none";
  readonly abilityCheckModeAbility: AbilityCheckModeAbility;
  readonly targetDexRollMode: TargetDexRollMode;
};

const initialProjection: AbilityCheckChoiceSearchProjection = {
  scenario: "init",
  lastResult: "init",
  lastInvalidReason: "none",
  holes: [],
  targetHidden: false,
  actionAvailable: true,
  targetEffectCount: 0,
  casterEffectCount: 0,
  d20ModifierSkill: "none",
  abilityCheckModeAbility: "none",
  targetDexRollMode: "normal",
};

type AbilityCheckChoiceSearchRouteProjection = {
  readonly surface: AbilityCheckChoiceSearchScenario;
  readonly route: readonly ReducerRouteEvent[];
};

const ABILITY_CHECK_SEARCH_ROUTE_SUBJECT =
  "abilityCheckSearch" satisfies ReducerRouteSubjectFamily;
const ROLL_MODIFIER_ROUTE_SUBJECT =
  "rollModifierEffect" satisfies ReducerRouteSubjectFamily;
const ROUTE_START_OWNER =
  "battleActionEconomy" satisfies ReducerRouteOwnerGroup;
const SPELL_INVOCATION_OWNER =
  "battleSpellSlotAndActionEconomy" satisfies ReducerRouteOwnerGroup;

const driverSchema = {
  init: {},
  doSearchTargetChoiceOpen: {},
  doSearchAbilityCheckOpen: {},
  doSearchInvalidTargetRejected: {},
  doSearchInvalidAbilityFillRejected: {},
  doSearchFails: {},
  doSearchSucceeds: {},
  doGuidanceSkillChoiceOpen: {},
  doGuidanceInvalidAbilityFillRejected: {},
  doGuidanceSkillAthletics: {},
  doEnhanceAbilityChoiceOpen: {},
  doEnhanceAbilityInvalidSkillFillRejected: {},
  doEnhanceAbilityDex: {},
  step: {},
} as const;

function initialRouteProjection(): AbilityCheckChoiceSearchRouteProjection {
  return {
    surface: "init",
    route: [startRoute()],
  };
}

function routeState(
  surface: AbilityCheckChoiceSearchScenario,
  route: readonly ReducerRouteEvent[],
): AbilityCheckChoiceSearchRouteProjection {
  return { surface, route };
}

function routeHoles(
  ...values: ReducerRouteHole[]
): readonly ReducerRouteHole[] {
  return [...values].sort(compareStrings);
}

function startRoute(): ReducerRouteEvent {
  return { kind: "startBattle", owner: ROUTE_START_OWNER };
}

function discoverRoute(input: {
  readonly subject: ReducerRouteSubjectFamily;
  readonly holes: readonly ReducerRouteHole[];
  readonly owner: ReducerRouteOwnerGroup;
}): ReducerRouteEvent {
  return {
    kind: "discoverBattleActs",
    subject: input.subject,
    holes: [...input.holes].sort(compareStrings),
    owner: input.owner,
  };
}

function resolveRoute(input: {
  readonly subject: ReducerRouteSubjectFamily;
  readonly fill: ReducerRouteFill;
  readonly holes: readonly ReducerRouteHole[];
  readonly owner: ReducerRouteOwnerGroup;
}): ReducerRouteEvent {
  return {
    kind: "resolveBattleSubject",
    subject: input.subject,
    fill: input.fill,
    holes: [...input.holes].sort(compareStrings),
    owner: input.owner,
  };
}

function resolveRouteWithoutFill(input: {
  readonly subject: ReducerRouteSubjectFamily;
  readonly holes: readonly ReducerRouteHole[];
  readonly owner: ReducerRouteOwnerGroup;
}): ReducerRouteEvent {
  return {
    kind: "resolveBattleSubjectWithoutFill",
    subject: input.subject,
    holes: [...input.holes].sort(compareStrings),
    owner: input.owner,
  };
}

function searchDiscover(
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return discoverRoute({
    subject: ABILITY_CHECK_SEARCH_ROUTE_SUBJECT,
    holes,
    owner,
  });
}

function searchResolve(
  fill: ReducerRouteFill,
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveRoute({
    subject: ABILITY_CHECK_SEARCH_ROUTE_SUBJECT,
    fill,
    holes,
    owner,
  });
}

function rollModifierDiscover(
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return discoverRoute({
    subject: ROLL_MODIFIER_ROUTE_SUBJECT,
    holes,
    owner,
  });
}

function rollModifierResolve(
  fill: ReducerRouteFill,
  holes: readonly ReducerRouteHole[],
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveRoute({
    subject: ROLL_MODIFIER_ROUTE_SUBJECT,
    fill,
    holes,
    owner,
  });
}

function rollModifierResolveWithoutFill(
  owner: ReducerRouteOwnerGroup,
): ReducerRouteEvent {
  return resolveRouteWithoutFill({
    subject: ROLL_MODIFIER_ROUTE_SUBJECT,
    holes: routeHoles(),
    owner,
  });
}

function rollModifierOpeningRoute(
  choiceHole: "abilityChoice" | "skillChoice",
): readonly ReducerRouteEvent[] {
  return [
    startRoute(),
    rollModifierDiscover(
      routeHoles("targetChoice", choiceHole),
      SPELL_INVOCATION_OWNER,
    ),
    rollModifierResolve(
      "targetChoice",
      routeHoles(choiceHole),
      "battleTargetSelection",
    ),
  ];
}

function rollModifierChoiceAcceptedRoute(
  choiceHole: "abilityChoice" | "skillChoice",
  fill: ReducerRouteFill,
): readonly ReducerRouteEvent[] {
  return [
    ...rollModifierOpeningRoute(choiceHole),
    rollModifierResolve(fill, routeHoles(), "battleActiveEffect"),
    rollModifierResolveWithoutFill("battleConcentration"),
  ];
}

function rollModifierInvalidChoiceRoute(
  choiceHole: "abilityChoice" | "skillChoice",
  fill: ReducerRouteFill,
): readonly ReducerRouteEvent[] {
  return [
    ...rollModifierOpeningRoute(choiceHole),
    rollModifierResolve(fill, routeHoles(), "battleHoleFrontier"),
  ];
}

function searchTargetChoiceRoute(): readonly ReducerRouteEvent[] {
  return [
    startRoute(),
    searchDiscover(routeHoles("targetChoice"), ROUTE_START_OWNER),
  ];
}

function searchAbilityCheckRoute(): readonly ReducerRouteEvent[] {
  return [
    ...searchTargetChoiceRoute(),
    searchResolve(
      "targetChoice",
      routeHoles("abilityCheck"),
      "battleTargetSelection",
    ),
  ];
}

function searchInvalidTargetRoute(): readonly ReducerRouteEvent[] {
  return [
    ...searchTargetChoiceRoute(),
    searchResolve("targetChoice", routeHoles(), "battleTargetSelection"),
  ];
}

function searchInvalidAbilityFillRoute(): readonly ReducerRouteEvent[] {
  return [
    ...searchAbilityCheckRoute(),
    searchResolve(
      { kind: "skillChoice", skill: "athletics" },
      routeHoles(),
      "battleHoleFrontier",
    ),
  ];
}

function searchResolvedRoute(): readonly ReducerRouteEvent[] {
  return [
    ...searchAbilityCheckRoute(),
    searchResolve("abilityCheck", routeHoles(), "battleAbilityCheck"),
  ];
}

function createDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialProjection;

    function reset(): void {
      projection = initialProjection;
    }

    function replay(scenario: AbilityCheckChoiceSearchReplayScenario): void {
      projection = applyScenario(scenario);
    }

    function replayNext(): void {
      const currentIndex = abilityCheckChoiceSearchScenarios.indexOf(
        projection.scenario,
      );
      const nextScenario = abilityCheckChoiceSearchScenarios[currentIndex + 1];
      if (nextScenario !== undefined && nextScenario !== "init") {
        replay(nextScenario);
      }
    }

    return {
      init: reset,
      doSearchTargetChoiceOpen: () => replay("search-target-choice-open"),
      doSearchAbilityCheckOpen: () => replay("search-ability-check-open"),
      doSearchInvalidTargetRejected: () =>
        replay("search-invalid-target-rejected"),
      doSearchInvalidAbilityFillRejected: () =>
        replay("search-invalid-ability-fill-rejected"),
      doSearchFails: () => replay("search-fails"),
      doSearchSucceeds: () => replay("search-succeeds"),
      doGuidanceSkillChoiceOpen: () => replay("guidance-skill-choice-open"),
      doGuidanceInvalidAbilityFillRejected: () =>
        replay("guidance-invalid-ability-fill-rejected"),
      doGuidanceSkillAthletics: () => replay("guidance-skill-athletics"),
      doEnhanceAbilityChoiceOpen: () => replay("enhance-ability-choice-open"),
      doEnhanceAbilityInvalidSkillFillRejected: () =>
        replay("enhance-ability-invalid-skill-fill-rejected"),
      doEnhanceAbilityDex: () => replay("enhance-ability-dex"),
      step: replayNext,
      getState: () => projection,
    };
  });
}

function createRouteDriver() {
  return defineDriver(driverSchema, () => {
    let projection = initialRouteProjection();

    function reset(): void {
      projection = initialRouteProjection();
    }

    function replay(scenario: AbilityCheckChoiceSearchReplayScenario): void {
      projection = applyRouteScenario(scenario);
    }

    function replayNext(): void {
      const currentIndex = abilityCheckChoiceSearchScenarios.indexOf(
        projection.surface,
      );
      const nextScenario = abilityCheckChoiceSearchScenarios[currentIndex + 1];
      if (nextScenario !== undefined && nextScenario !== "init") {
        replay(nextScenario);
      }
    }

    return {
      init: reset,
      doSearchTargetChoiceOpen: () => replay("search-target-choice-open"),
      doSearchAbilityCheckOpen: () => replay("search-ability-check-open"),
      doSearchInvalidTargetRejected: () =>
        replay("search-invalid-target-rejected"),
      doSearchInvalidAbilityFillRejected: () =>
        replay("search-invalid-ability-fill-rejected"),
      doSearchFails: () => replay("search-fails"),
      doSearchSucceeds: () => replay("search-succeeds"),
      doGuidanceSkillChoiceOpen: () => replay("guidance-skill-choice-open"),
      doGuidanceInvalidAbilityFillRejected: () =>
        replay("guidance-invalid-ability-fill-rejected"),
      doGuidanceSkillAthletics: () => replay("guidance-skill-athletics"),
      doEnhanceAbilityChoiceOpen: () => replay("enhance-ability-choice-open"),
      doEnhanceAbilityInvalidSkillFillRejected: () =>
        replay("enhance-ability-invalid-skill-fill-rejected"),
      doEnhanceAbilityDex: () => replay("enhance-ability-dex"),
      step: replayNext,
      getState: () => projection,
    };
  });
}

function applyRouteScenario(
  scenario: AbilityCheckChoiceSearchReplayScenario,
): AbilityCheckChoiceSearchRouteProjection {
  const applicators = {
    "search-target-choice-open": () =>
      routeState("search-target-choice-open", searchTargetChoiceRoute()),
    "search-ability-check-open": () =>
      routeState("search-ability-check-open", searchAbilityCheckRoute()),
    "search-invalid-target-rejected": () =>
      routeState("search-invalid-target-rejected", searchInvalidTargetRoute()),
    "search-invalid-ability-fill-rejected": () =>
      routeState(
        "search-invalid-ability-fill-rejected",
        searchInvalidAbilityFillRoute(),
      ),
    "search-fails": () =>
      routeState("search-fails", searchResolvedRoute()),
    "search-succeeds": () =>
      routeState("search-succeeds", searchResolvedRoute()),
    "guidance-skill-choice-open": () =>
      routeState(
        "guidance-skill-choice-open",
        rollModifierOpeningRoute("skillChoice"),
      ),
    "guidance-invalid-ability-fill-rejected": () =>
      routeState(
        "guidance-invalid-ability-fill-rejected",
        rollModifierInvalidChoiceRoute("skillChoice", {
          kind: "abilityChoice",
          ability: "dex",
        }),
      ),
    "guidance-skill-athletics": () =>
      routeState(
        "guidance-skill-athletics",
        rollModifierChoiceAcceptedRoute("skillChoice", {
          kind: "skillChoice",
          skill: "athletics",
        }),
      ),
    "enhance-ability-choice-open": () =>
      routeState(
        "enhance-ability-choice-open",
        rollModifierOpeningRoute("abilityChoice"),
      ),
    "enhance-ability-invalid-skill-fill-rejected": () =>
      routeState(
        "enhance-ability-invalid-skill-fill-rejected",
        rollModifierInvalidChoiceRoute("abilityChoice", {
          kind: "skillChoice",
          skill: "athletics",
        }),
      ),
    "enhance-ability-dex": () =>
      routeState(
        "enhance-ability-dex",
        rollModifierChoiceAcceptedRoute("abilityChoice", {
          kind: "abilityChoice",
          ability: "dex",
        }),
      ),
  } satisfies Record<
    AbilityCheckChoiceSearchReplayScenario,
    () => AbilityCheckChoiceSearchRouteProjection
  >;
  return applicators[scenario]();
}

const abilityCheckChoiceSearchStateCheck = stateCheck(
  normalizeQuintState,
  compareState,
);

const abilityCheckChoiceSearchRouteStateCheck = stateCheck(
  normalizeRouteQuintState,
  compareRouteState,
);

describe("Ability Check choice and Search focused MBT", () => {
  it(
    "covers Search holes and roll-modifier skill/ability choices",
    async () => {
      expectGuidanceReplaySkillsMatchRuntimeChoices();

      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-ability-check-choice-search.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(
          abilityCheckChoiceSearchScenarios.length - 1,
        ),
        stateCheck: abilityCheckChoiceSearchStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes Search and choice holes through explicit reducer owners",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-ability-check-choice-search.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(
          abilityCheckChoiceSearchScenarios.length - 1,
        ),
        stateCheck: abilityCheckChoiceSearchRouteStateCheck,
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

function applyScenario(
  scenario: AbilityCheckChoiceSearchReplayScenario,
): AbilityCheckChoiceSearchProjection {
  const applicators = {
    "search-target-choice-open": searchTargetChoiceOpenScenario,
    "search-ability-check-open": searchAbilityCheckOpenScenario,
    "search-invalid-target-rejected": searchInvalidTargetRejectedScenario,
    "search-invalid-ability-fill-rejected":
      searchInvalidAbilityFillRejectedScenario,
    "search-fails": () => searchResolvedScenario("search-fails", 15),
    "search-succeeds": () => searchResolvedScenario("search-succeeds", 16),
    "guidance-skill-choice-open": guidanceSkillChoiceOpenScenario,
    "guidance-invalid-ability-fill-rejected":
      guidanceInvalidAbilityFillRejectedScenario,
    "guidance-skill-athletics": guidanceSkillAthleticsScenario,
    "enhance-ability-choice-open": enhanceAbilityChoiceOpenScenario,
    "enhance-ability-invalid-skill-fill-rejected":
      enhanceAbilityInvalidSkillFillRejectedScenario,
    "enhance-ability-dex": enhanceAbilityDexScenario,
  } satisfies Record<
    AbilityCheckChoiceSearchReplayScenario,
    () => AbilityCheckChoiceSearchProjection
  >;
  return applicators[scenario]();
}

function searchTargetChoiceOpenScenario(): AbilityCheckChoiceSearchProjection {
  const state = hiddenFighterOnGoblinTurn();
  const searchSubject = goblinSearchSubject();
  const result = resolveBattleSubject({
    state,
    subject: searchSubject,
    fills: [],
  });
  return projectState({
    state: resultState(result, state),
    result,
    scenario: "search-target-choice-open",
    targetId: fighterId,
    casterId: goblinId,
  });
}

function searchAbilityCheckOpenScenario(): AbilityCheckChoiceSearchProjection {
  const state = hiddenFighterOnGoblinTurn();
  const searchSubject = goblinSearchSubject();
  const target = requireResultHole(
    resolveBattleSubject({
      state,
      subject: searchSubject,
      fills: [],
    }),
    "targetChoice",
  );
  const result = resolveBattleSubject({
    state,
    subject: searchSubject,
    fills: [targetFill(target, fighterId)],
  });
  return projectState({
    state: resultState(result, state),
    result,
    scenario: "search-ability-check-open",
    targetId: fighterId,
    casterId: goblinId,
  });
}

function searchInvalidTargetRejectedScenario(): AbilityCheckChoiceSearchProjection {
  const state = hiddenFighterOnGoblinTurn();
  const searchSubject = goblinSearchSubject();
  const target = requireResultHole(
    resolveBattleSubject({
      state,
      subject: searchSubject,
      fills: [],
    }),
    "targetChoice",
  );
  const result = resolveBattleSubject({
    state,
    subject: searchSubject,
    fills: [targetFill(target, goblinId)],
  });
  return projectState({
    state,
    result,
    scenario: "search-invalid-target-rejected",
    targetId: fighterId,
    casterId: goblinId,
  });
}

function searchInvalidAbilityFillRejectedScenario(): AbilityCheckChoiceSearchProjection {
  const state = hiddenFighterOnGoblinTurn();
  const searchSubject = goblinSearchSubject();
  const target = requireResultHole(
    resolveBattleSubject({
      state,
      subject: searchSubject,
      fills: [],
    }),
    "targetChoice",
  );
  const searchCheck = requireResultHole(
    resolveBattleSubject({
      state,
      subject: searchSubject,
      fills: [targetFill(target, fighterId)],
    }),
    "abilityCheck",
  );
  const wrongFill: Extract<BattleFill, { readonly kind: "skillChoice" }> = {
    kind: "skillChoice",
    holeId: searchCheck.holeId,
    value: "athletics",
  };
  const result = resolveBattleSubject({
    state,
    subject: searchSubject,
    fills: [targetFill(target, fighterId), wrongFill],
  });
  return projectState({
    state,
    result,
    scenario: "search-invalid-ability-fill-rejected",
    targetId: fighterId,
    casterId: goblinId,
  });
}

function searchResolvedScenario(
  scenario: "search-fails" | "search-succeeds",
  searchTotal: number,
): AbilityCheckChoiceSearchProjection {
  const state = hiddenFighterOnGoblinTurn();
  const searchSubject = goblinSearchSubject();
  const target = requireResultHole(
    resolveBattleSubject({
      state,
      subject: searchSubject,
      fills: [],
    }),
    "targetChoice",
  );
  const searchCheck = requireResultHole(
    resolveBattleSubject({
      state,
      subject: searchSubject,
      fills: [targetFill(target, fighterId)],
    }),
    "abilityCheck",
  );
  const result = resolveBattleSubject({
    state,
    subject: searchSubject,
    fills: [
      targetFill(target, fighterId),
      abilityCheckFill(searchCheck, searchTotal),
    ],
  });
  return projectState({
    state: resultState(result, state),
    result,
    scenario,
    targetId: fighterId,
    casterId: goblinId,
  });
}

function hiddenFighterOnGoblinTurn(): BattleState {
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
  return requireResolved(endTurn({ state: hidden, actorId: fighterId })).state;
}

function goblinSearchSubject(): BattleSubject {
  return {
    tag: "action",
    actorId: goblinId,
    action: "search",
  };
}

function guidanceSkillChoiceOpenScenario(): AbilityCheckChoiceSearchProjection {
  const state = guidanceBattle();
  const act = spellAct({ state, spellId: guidanceUnitId });
  const target = requireHole(act.initialHoles, "targetChoice");
  const result = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      spellTargetFill(target, guidanceUnitId, spellCasterId, spellCasterId),
    ],
  });
  return projectState({
    state: resultState(result, state),
    result,
    scenario: "guidance-skill-choice-open",
    targetId: spellCasterId,
    casterId: spellCasterId,
  });
}

function guidanceInvalidAbilityFillRejectedScenario(): AbilityCheckChoiceSearchProjection {
  const state = guidanceBattle();
  const act = spellAct({ state, spellId: guidanceUnitId });
  const target = requireHole(act.initialHoles, "targetChoice");
  const skill = requireHole(act.initialHoles, "skillChoice");
  const wrongFill: Extract<BattleFill, { readonly kind: "abilityChoice" }> = {
    kind: "abilityChoice",
    holeId: skill.holeId,
    value: "dex",
  };
  const result = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      spellTargetFill(target, guidanceUnitId, spellCasterId, spellCasterId),
      wrongFill,
    ],
  });
  return projectState({
    state,
    result,
    scenario: "guidance-invalid-ability-fill-rejected",
    targetId: spellCasterId,
    casterId: spellCasterId,
  });
}

function guidanceSkillAthleticsScenario(): AbilityCheckChoiceSearchProjection {
  const state = guidanceBattle();
  const act = spellAct({ state, spellId: guidanceUnitId });
  const target = requireHole(act.initialHoles, "targetChoice");
  const skill = requireHole(act.initialHoles, "skillChoice");
  const result = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      spellTargetFill(target, guidanceUnitId, spellCasterId, spellCasterId),
      skillChoiceFill(skill, "athletics"),
    ],
  });
  return projectState({
    state: resultState(result, state),
    result,
    scenario: "guidance-skill-athletics",
    targetId: spellCasterId,
    casterId: spellCasterId,
  });
}

function guidanceBattle(): BattleState {
  return spellBattle({
    cantrips: [spellRecord(guidanceUnitId)],
    spellSlots: [],
  });
}

function enhanceAbilityChoiceOpenScenario(): AbilityCheckChoiceSearchProjection {
  const state = enhanceAbilityBattle();
  const act = spellAct({ state, spellId: enhanceAbilityUnitId });
  const target = requireHole(act.initialHoles, "targetChoice");
  const result = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      spellTargetFill(
        target,
        enhanceAbilityUnitId,
        spellCasterId,
        spellTargetId,
      ),
    ],
  });
  return projectState({
    state: resultState(result, state),
    result,
    scenario: "enhance-ability-choice-open",
    targetId: spellTargetId,
    casterId: spellCasterId,
  });
}

function enhanceAbilityInvalidSkillFillRejectedScenario(): AbilityCheckChoiceSearchProjection {
  const state = enhanceAbilityBattle();
  const act = spellAct({ state, spellId: enhanceAbilityUnitId });
  const target = requireHole(act.initialHoles, "targetChoice");
  const ability = requireHole(act.initialHoles, "abilityChoice");
  const wrongFill: Extract<BattleFill, { readonly kind: "skillChoice" }> = {
    kind: "skillChoice",
    holeId: ability.holeId,
    value: "athletics",
  };
  const result = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      spellTargetFill(
        target,
        enhanceAbilityUnitId,
        spellCasterId,
        spellTargetId,
      ),
      wrongFill,
    ],
  });
  return projectState({
    state,
    result,
    scenario: "enhance-ability-invalid-skill-fill-rejected",
    targetId: spellTargetId,
    casterId: spellCasterId,
  });
}

function enhanceAbilityDexScenario(): AbilityCheckChoiceSearchProjection {
  const state = enhanceAbilityBattle();
  const act = spellAct({ state, spellId: enhanceAbilityUnitId });
  const target = requireHole(act.initialHoles, "targetChoice");
  const ability = requireHole(act.initialHoles, "abilityChoice");
  const result = resolveBattleSubject({
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
  });
  return projectState({
    state: resultState(result, state),
    result,
    scenario: "enhance-ability-dex",
    targetId: spellTargetId,
    casterId: spellCasterId,
  });
}

function enhanceAbilityBattle(): BattleState {
  return spellBattle({
    preparedSpells: [spellRecord(enhanceAbilityUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
}

function projectState(input: {
  readonly state: BattleState;
  readonly result: BattleResolutionResult;
  readonly scenario: AbilityCheckChoiceSearchScenario;
  readonly targetId: CombatantId;
  readonly casterId: CombatantId;
}): AbilityCheckChoiceSearchProjection {
  const target = requireCombatant(input.state, input.targetId);
  const caster = requireCombatant(input.state, input.casterId);
  const snapshot = snapshotBattle(input.state);
  return {
    scenario: input.scenario,
    lastResult: lastResult(input.result),
    lastInvalidReason: invalidReason(input.result),
    holes: protocolHolesForResult(input.result),
    targetHidden: target.hidden !== null,
    actionAvailable: snapshot.turn.actionResources.length > 0,
    targetEffectCount: target.activeEffects.length,
    casterEffectCount: caster.activeEffects.length,
    d20ModifierSkill: d20ModifierSkill([
      ...target.activeEffects,
      ...caster.activeEffects,
    ]),
    abilityCheckModeAbility: abilityCheckModeAbility([
      ...target.activeEffects,
      ...caster.activeEffects,
    ]),
    targetDexRollMode: targetDexRollMode(input.state, input.targetId),
  };
}

function invalidReason(
  result: BattleResolutionResult,
): AbilityCheckChoiceSearchProjection["lastInvalidReason"] {
  if (result.tag !== "invalid") return "none";
  if (result.reason !== "invalidFill") {
    throw new Error(`Expected invalidFill, got ${result.reason}.`);
  }
  return result.reason;
}

function targetDexRollMode(
  state: BattleState,
  targetId: CombatantId,
): TargetDexRollMode {
  const rollMode =
    requiredAbilityCheckRollMode(state, targetId, "dex", {
      skill: "stealth",
    }) ?? "normal";
  if (rollMode === "normal" || rollMode === "advantage") {
    return rollMode;
  }
  throw new Error(
    `Expected normal or advantage Dex roll mode, got ${rollMode}.`,
  );
}

function resultState(
  result: BattleResolutionResult,
  fallback: BattleState,
): BattleState {
  return result.tag === "invalid" ? fallback : result.state;
}

function protocolHolesForResult(
  result: BattleResolutionResult,
): readonly ProtocolHole[] {
  return result.tag === "needsHoles"
    ? result.holes.map((hole) => protocolHole(hole.kind)).sort(compareStrings)
    : [];
}

function protocolHole(raw: string): ProtocolHole {
  if (isProtocolHole(raw)) return raw;
  throw new Error(`Unexpected Ability Check/Search protocol hole ${raw}.`);
}

function lastResult(
  result: Pick<BattleResolutionResult, "tag">,
): MbtWitnessLastResult {
  if (result.tag === "needsHoles") return "needsHoles";
  if (result.tag === "invalid") return "invalid";
  return "resolved";
}

function d20ModifierSkill(
  effects: readonly BattleActiveEffect[],
): AbilityCheckChoiceSearchProjection["d20ModifierSkill"] {
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
): AbilityCheckModeAbility {
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

function normalizeQuintState(raw: unknown): AbilityCheckChoiceSearchProjection {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint Ability Check/Search state object.");
  }
  const state: Readonly<Record<string, unknown>> = Object.fromEntries(
    Object.entries(raw),
  );
  const protocol = decodeWitnessProtocolState({
    state,
    noInvalidReason: "none",
    protocolField: "qProtocol",
    decodeHole: protocolHoleField,
    compareHoles: compareStrings,
  });
  return {
    scenario: quintVariantMappedValue(
      state["qScenario"],
      "qScenario",
      abilityCheckChoiceSearchScenarioByQuintTag,
      "Ability Check/Search scenario",
    ),
    lastResult: protocol.lastResult,
    lastInvalidReason: protocolInvalidReason(protocol.lastInvalidReason),
    holes: protocol.holes,
    targetHidden: booleanValue(state["qTargetHidden"], "qTargetHidden"),
    actionAvailable: booleanValue(
      state["qActionAvailable"],
      "qActionAvailable",
    ),
    targetEffectCount: numberFromQuintInt(
      state["qTargetEffectCount"],
      "qTargetEffectCount",
    ),
    casterEffectCount: numberFromQuintInt(
      state["qCasterEffectCount"],
      "qCasterEffectCount",
    ),
    d20ModifierSkill: d20ModifierSkillField(state["qD20ModifierSkill"]),
    abilityCheckModeAbility: stringLiteralField(
      state,
      "qAbilityCheckModeAbility",
      abilityCheckModeAbilities,
    ),
    targetDexRollMode: stringLiteralField(
      state,
      "qTargetDexRollMode",
      targetDexRollModes,
    ),
  };
}

function normalizeRouteQuintState(
  raw: unknown,
): AbilityCheckChoiceSearchRouteProjection {
  const state = quintStateRecord(raw);
  return {
    surface: quintVariantMappedValue(
      quintField(state, "qSurface"),
      "qSurface",
      abilityCheckChoiceSearchScenarioByQuintTag,
      "Ability Check/Search route surface",
    ),
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function protocolInvalidReason(
  raw: string,
): AbilityCheckChoiceSearchProjection["lastInvalidReason"] {
  if (raw === "none" || raw === "invalidFill") return raw;
  throw new Error(`Unexpected witness invalid reason ${raw}.`);
}

function compareState(
  runtime: AbilityCheckChoiceSearchProjection,
  quint: AbilityCheckChoiceSearchProjection,
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

function compareRouteState(
  runtime: AbilityCheckChoiceSearchRouteProjection,
  quint: AbilityCheckChoiceSearchRouteProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `${error.message}\nruntime=${JSON.stringify(runtime)}\nquint=${JSON.stringify(quint)}`,
      );
    }
    throw error;
  }
  return true;
}

function protocolHoleField(raw: unknown): ProtocolHole {
  return protocolHole(
    stringLiteralField({ value: raw }, "value", protocolHoles),
  );
}

function isProtocolHole(raw: string): raw is ProtocolHole {
  return protocolHoles.some((hole) => hole === raw);
}

function d20ModifierSkillField(
  raw: unknown,
): AbilityCheckChoiceSearchProjection["d20ModifierSkill"] {
  if (raw === "none") return raw;
  if (typeof raw === "string" && isReplaySkill(raw)) return raw;
  throw new Error(`Unknown d20 modifier skill ${String(raw)}.`);
}

function isReplaySkill(raw: string): raw is ReplaySkill {
  return replaySkills.some((skill) => skill === raw);
}

function compareStrings(left: string, right: string): number {
  return left.localeCompare(right);
}
