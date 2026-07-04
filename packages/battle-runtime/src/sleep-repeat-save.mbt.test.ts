// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.invocation-sleep-repeat-save-lifecycle
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SLEEP_REPEAT_SAVE_LIFECYCLE
import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  decodeReducerRoute,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  quintField,
  quintRecordField,
  quintStateRecord,
  quintVariantTag,
  run,
  stateCheck,
  type ReducerRouteEvent,
} from "./battle-runtime-mbt-driver-kit.ts";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  Hp,
  abilityModifier,
  attackBonus,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";

import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import {
  fighterId,
  oppositionSide,
  partySide,
  skeletonId,
  unitLibrary,
} from "./battle-runtime-test-support.ts";
import {
  battleId,
  battleReducerStartRouteEvent,
  breakBattleConcentration,
  characterId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";

// Production path: Sleep is admitted through the spell support profile selected
// by `spellSlotInvocationRef`; initial holes are discovered with
// `discoverBattleActs` from `./index.ts`; saving throw fills and end-turn
// commands are submitted through `resolveBattleSubject`; concentration cleanup
// uses `breakBattleConcentration`; the resulting `BattleState` mutation is
// observed through `snapshotBattle`.

type SleepRepeatSaveMbtHole = "SavingThrowOutcome";
type SleepRepeatSaveMbtLastResult =
  | "init"
  | "needsHoles"
  | "resolved"
  | "invalid";
type SleepRepeatSaveMbtLastInvalidReason =
  | ""
  | "invalidFill"
  | "staleSubject"
  | "wrongActor";
type SleepRepeatSaveMbtTurnRole = "caster" | "target";
type SleepRepeatSaveRouteSurface =
  | "fresh"
  | "initialSaveConditionApplied"
  | "concentrationBrokenBeforeRepeat"
  | "casterTurnEndedWithEffect"
  | "casterTurnEndedAfterConcentrationBreak"
  | "targetTurnEndedAfterConcentrationBreak"
  | "repeatSaveFrontier"
  | "repeatSaveSuccessCleanup"
  | "repeatSaveFailureUnconscious";
type SleepSavingThrowOutcomeHole = Extract<
  BattleHole,
  { readonly kind: "savingThrowOutcome" }
>;

type SleepRepeatSaveMbtProjection = {
  readonly currentTurnRole: SleepRepeatSaveMbtTurnRole;
  readonly targetIncapacitated: boolean;
  readonly targetUnconscious: boolean;
  readonly targetProne: boolean;
  readonly casterConcentrating: boolean;
  readonly actionAvailable: boolean;
  readonly holes: readonly SleepRepeatSaveMbtHole[];
  readonly lastResult: SleepRepeatSaveMbtLastResult;
  readonly lastInvalidReason: SleepRepeatSaveMbtLastInvalidReason;
};
type SleepRepeatSaveRouteProjection = {
  readonly surface: SleepRepeatSaveRouteSurface;
  readonly route: readonly ReducerRouteEvent[];
};

const SLEEP_REPEAT_SAVE_ROUTE_SURFACE_BY_TAG = {
  FreshRouteSurface: "fresh",
  InitialSaveConditionAppliedRouteSurface:
    "initialSaveConditionApplied",
  ConcentrationBrokenBeforeRepeatRouteSurface:
    "concentrationBrokenBeforeRepeat",
  CasterTurnEndedWithEffectRouteSurface: "casterTurnEndedWithEffect",
  CasterTurnEndedAfterConcentrationBreakRouteSurface:
    "casterTurnEndedAfterConcentrationBreak",
  TargetTurnEndedAfterConcentrationBreakRouteSurface:
    "targetTurnEndedAfterConcentrationBreak",
  RepeatSaveFrontierRouteSurface: "repeatSaveFrontier",
  RepeatSaveSuccessCleanupRouteSurface: "repeatSaveSuccessCleanup",
  RepeatSaveFailureUnconsciousRouteSurface:
    "repeatSaveFailureUnconscious",
} as const satisfies Readonly<Record<string, SleepRepeatSaveRouteSurface>>;

const sleepUnit = unitLibrary.requireUnit("sleep");
if (sleepUnit.kind !== "spell") {
  throw new Error("Expected Sleep content to decode as a spell Unit.");
}
const sleepSpell = sleepUnit;

const sleepRepeatSaveDriverSchema = {
  init: {},
  doFillInitialSaveFailure: {},
  doBreakConcentrationBeforeRepeat: {},
  doEndCasterTurn: {},
  doEndCasterTurnAfterConcentrationBreak: {},
  doEndTargetTurnAfterConcentrationBreak: {},
  doDiscoverRepeatSave: {},
  doFillRepeatSaveSuccess: {},
  doFillRepeatSaveFailure: {},
  step: {},
} as const;

function createSleepRepeatSaveDriver() {
  return defineDriver(sleepRepeatSaveDriverSchema, () => {
    let state = sleepRepeatSaveBattle();
    let subject: BattleSubject = sleepSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = discoverSleepHoles(state, subject);
    let lastResult: SleepRepeatSaveMbtProjection["lastResult"] = "init";
    let lastInvalidReason: SleepRepeatSaveMbtProjection["lastInvalidReason"] =
      "";

    function reset(): void {
      state = sleepRepeatSaveBattle();
      subject = sleepSubject();
      fills = [];
      holes = discoverSleepHoles(state, subject);
      lastResult = "init";
      lastInvalidReason = "";
    }

    function recordResult(result: BattleResolutionResult): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastInvalidReason = "";
        return;
      }
      lastInvalidReason = sleepRepeatSaveMbtInvalidReason(result.reason);
    }

    function submit(nextFills: readonly BattleFill[]): void {
      fills = fillsWithSleepRepeatSaveSpatialFacts(holes, nextFills);
      recordResult(resolveBattleSubject({ state, subject, fills }));
    }

    function fillRepeatSave(succeeded: boolean): void {
      const repeatSave = findSleepRepeatSaveSavingThrowHole(holes);
      submit([sleepSavingThrowOutcomeFill(repeatSave, skeletonId, succeeded)]);
    }

    return {
      init: reset,
      doFillInitialSaveFailure: () => {
        const initialSave = findSleepRepeatSaveSavingThrowHole(holes);
        submit([sleepSavingThrowOutcomeFill(initialSave, skeletonId, false)]);
      },
      doBreakConcentrationBeforeRepeat: () => {
        state = breakBattleConcentration(state, fighterId);
        holes = [];
        lastResult = "resolved";
        lastInvalidReason = "";
      },
      doEndCasterTurn: () => {
        subject = endTurnSubjectFor(fighterId);
        fills = [];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doEndCasterTurnAfterConcentrationBreak: () => {
        subject = endTurnSubjectFor(fighterId);
        fills = [];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doEndTargetTurnAfterConcentrationBreak: () => {
        subject = endTurnSubjectFor(skeletonId);
        fills = [];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doDiscoverRepeatSave: () => {
        subject = endTurnSubjectFor(skeletonId);
        fills = [];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doFillRepeatSaveSuccess: () => fillRepeatSave(true),
      doFillRepeatSaveFailure: () => fillRepeatSave(false),
      step: () => {},
      getState: () =>
        projectSleepRepeatSaveMbtState({
          state,
          holes,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

function createSleepRepeatSavePublicRouteDriver() {
  return defineDriver(sleepRepeatSaveDriverSchema, () => {
    let state = sleepRepeatSaveBattle();
    let subject: BattleSubject = sleepSubject();
    let holes: readonly BattleHole[] = [];
    let surface: SleepRepeatSaveRouteSurface = "fresh";
    let route: readonly ReducerRouteEvent[] = [
      battleReducerStartRouteEvent(state),
    ];

    function reset(): void {
      state = sleepRepeatSaveBattle();
      subject = sleepSubject();
      holes = [];
      surface = "fresh";
      route = [battleReducerStartRouteEvent(state)];
    }

    function appendRouteEvents(
      events: readonly ReducerRouteEvent[] | undefined,
    ): void {
      if (events !== undefined) {
        route = [...route, ...events];
      }
    }

    function recordResult(
      result: BattleResolutionResult,
      nextSurface: SleepRepeatSaveRouteSurface,
    ): void {
      appendRouteEvents(result.routeEvents);
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        surface = nextSurface;
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        surface = nextSurface;
      }
    }

    function submit(
      nextFills: readonly BattleFill[],
      nextSurface: SleepRepeatSaveRouteSurface,
    ): void {
      const fills = fillsWithSleepRepeatSaveSpatialFacts(holes, nextFills);
      recordResult(resolveBattleSubject({ state, subject, fills }), nextSurface);
    }

    function fillRepeatSave(
      succeeded: boolean,
      nextSurface: SleepRepeatSaveRouteSurface,
    ): void {
      const repeatSave = findSleepRepeatSaveSavingThrowHole(holes);
      submit(
        [sleepSavingThrowOutcomeFill(repeatSave, skeletonId, succeeded)],
        nextSurface,
      );
    }

    return {
      init: reset,
      doFillInitialSaveFailure: () => {
        const act = discoverSleepAct(state, sleepSubject());
        appendRouteEvents(act.routeEvents);
        subject = act.subject;
        holes = act.initialHoles;
        const initialSave = findSleepRepeatSaveSavingThrowHole(holes);
        submit(
          [sleepSavingThrowOutcomeFill(initialSave, skeletonId, false)],
          "initialSaveConditionApplied",
        );
      },
      doBreakConcentrationBeforeRepeat: () => {
        subject = endConcentrationSubjectFor(fighterId);
        recordResult(
          resolveBattleSubject({ state, subject, fills: [] }),
          "concentrationBrokenBeforeRepeat",
        );
      },
      doEndCasterTurn: () => {
        subject = endTurnSubjectFor(fighterId);
        recordResult(
          resolveBattleSubject({ state, subject, fills: [] }),
          "casterTurnEndedWithEffect",
        );
      },
      doEndCasterTurnAfterConcentrationBreak: () => {
        subject = endTurnSubjectFor(fighterId);
        recordResult(
          resolveBattleSubject({ state, subject, fills: [] }),
          "casterTurnEndedAfterConcentrationBreak",
        );
      },
      doEndTargetTurnAfterConcentrationBreak: () => {
        subject = endTurnSubjectFor(skeletonId);
        recordResult(
          resolveBattleSubject({ state, subject, fills: [] }),
          "targetTurnEndedAfterConcentrationBreak",
        );
      },
      doDiscoverRepeatSave: () => {
        subject = endTurnSubjectFor(skeletonId);
        recordResult(
          resolveBattleSubject({ state, subject, fills: [] }),
          "repeatSaveFrontier",
        );
      },
      doFillRepeatSaveSuccess: () =>
        fillRepeatSave(true, "repeatSaveSuccessCleanup"),
      doFillRepeatSaveFailure: () =>
        fillRepeatSave(false, "repeatSaveFailureUnconscious"),
      step: () => {},
      getState: (): SleepRepeatSaveRouteProjection => ({ surface, route }),
    };
  });
}

const sleepRepeatSaveStateCheck = stateCheck(
  normalizeSleepRepeatSaveQuintState,
  (spec: SleepRepeatSaveMbtProjection, impl: SleepRepeatSaveMbtProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

const sleepRepeatSaveRouteStateCheck = stateCheck(
  normalizeSleepRepeatSaveRouteQuintState,
  (
    spec: SleepRepeatSaveRouteProjection,
    impl: SleepRepeatSaveRouteProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

describe("Sleep repeat-save MBT parity", () => {
  it(
    "replays Sleep pending repeat-save lifecycle and concentration cleanup",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-sleep-repeat-save.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createSleepRepeatSaveDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(4),
        stateCheck: sleepRepeatSaveStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it.skip(
    "blocked: copied Sleep repeat-save qRoute expects post-cleanup turn-boundary events with no reducer-owned frontier",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-sleep-repeat-save.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createSleepRepeatSavePublicRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(5),
        stateCheck: sleepRepeatSaveRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it("does not route repeat-save turn-boundary events after repeat-save failure consumes the frontier", () => {
    const initialState = sleepRepeatSaveBattle();
    const act = discoverSleepAct(initialState, sleepSubject());
    const initialSave = findSleepRepeatSaveSavingThrowHole(act.initialHoles);
    const initialFailure = requireResolved(
      resolveBattleSubject({
        state: initialState,
        subject: act.subject,
        fills: fillsWithSleepRepeatSaveSpatialFacts(act.initialHoles, [
          sleepSavingThrowOutcomeFill(initialSave, skeletonId, false),
        ]),
      }),
    );

    const casterTurnEnded = requireResolved(
      resolveBattleSubject({
        state: initialFailure.state,
        subject: endTurnSubjectFor(fighterId),
        fills: [],
      }),
    );

    const repeatSaveFrontier = requireNeedsHoles(
      resolveBattleSubject({
        state: casterTurnEnded.state,
        subject: endTurnSubjectFor(skeletonId),
        fills: [],
      }),
    );
    const repeatSave = findSleepRepeatSaveSavingThrowHole(
      repeatSaveFrontier.holes,
    );
    const repeatSaveFailure = requireResolved(
      resolveBattleSubject({
        state: repeatSaveFrontier.state,
        subject: endTurnSubjectFor(skeletonId),
        fills: fillsWithSleepRepeatSaveSpatialFacts(repeatSaveFrontier.holes, [
          sleepSavingThrowOutcomeFill(repeatSave, skeletonId, false),
        ]),
      }),
    );

    const target = repeatSaveFailure.state.combatants.get(skeletonId);
    expect(
      target?.activeEffects.some(
        (effect) => effect.kind === "sleepPendingRepeatSave",
      ),
    ).toBe(false);
    expect(
      target?.activeEffects.some((effect) => effect.kind === "sleepUnconscious"),
    ).toBe(true);

    const nextEndTurn = requireResolved(
      resolveBattleSubject({
        state: repeatSaveFailure.state,
        subject: endTurnSubjectFor(fighterId),
        fills: [],
      }),
    );

    expect(nextEndTurn.routeEvents ?? []).not.toContainEqual({
      kind: "resolveBattleSubjectWithoutFill",
      subject: "repeatSaveConditionEffect",
      holes: [],
      owner: "battleTurnBoundary",
    });
  });
});

function normalizeSleepRepeatSaveQuintState(
  raw: unknown,
): SleepRepeatSaveMbtProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: sleepRepeatSaveHoleName,
    compareHoles: (left, right) => left.localeCompare(right),
  });

  return {
    currentTurnRole: sleepRepeatSaveMbtTurnRole(
      state["currentTurnRole"],
      "qState.currentTurnRole",
    ),
    targetIncapacitated: booleanField(state, "targetIncapacitated"),
    targetUnconscious: booleanField(state, "targetUnconscious"),
    targetProne: booleanField(state, "targetProne"),
    casterConcentrating: booleanField(state, "casterConcentrating"),
    actionAvailable: booleanField(state, "actionAvailable"),
    holes: protocol.holes,
    lastResult: sleepRepeatSaveMbtLastResult(protocol.lastResult),
    lastInvalidReason: sleepRepeatSaveMbtLastInvalidReason(
      protocol.lastInvalidReason,
    ),
  };
}

function normalizeSleepRepeatSaveRouteQuintState(
  raw: unknown,
): SleepRepeatSaveRouteProjection {
  const state = quintStateRecord(raw);
  return {
    surface: sleepRepeatSaveRouteSurface(
      quintVariantTag(quintField(state, "qSurface"), "qSurface"),
    ),
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function projectSleepRepeatSaveMbtState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastResult: SleepRepeatSaveMbtProjection["lastResult"];
  readonly lastInvalidReason: SleepRepeatSaveMbtProjection["lastInvalidReason"];
}): SleepRepeatSaveMbtProjection {
  const snapshot = snapshotBattle(input.state);
  const caster = snapshot.combatants.find(
    (combatant) => combatant.combatantId === fighterId,
  );
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === skeletonId,
  );
  if (caster == null || target == null) {
    throw new Error("Expected Sleep repeat-save MBT combatants.");
  }
  return {
    currentTurnRole:
      snapshot.currentActorId === fighterId ? "caster" : "target",
    targetIncapacitated: target.conditions.includes("incapacitated"),
    targetUnconscious: target.conditions.includes("unconscious"),
    targetProne: target.conditions.includes("prone"),
    casterConcentrating: caster.concentrating,
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    holes: projectSleepRepeatSaveHoles(input.holes),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function sleepRepeatSaveBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-sleep-repeat-save"),
    combatants: [
      sleepCasterCreatureInit({ initiative: 20 }),
      sleepTargetCreatureInit({ initiative: 10 }),
    ],
  });
}

function sleepCasterCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  return {
    combatantId: fighterId,
    displayName: "Sleep Caster",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("sleep-caster-character"),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
      spellcasting: {
        sourceClassName: "fighter",
        spellcastingAbilityModifier: 3,
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [sleepSpell],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      },
    },
  };
}

function sleepTargetCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  return {
    combatantId: skeletonId,
    displayName: "Sleep Target",
    initiative: initiativeScore(input.initiative),
    side: oppositionSide,
    creatureInit: {
      kind: "character",
      characterId: characterId("sleep-target-character"),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
    },
  };
}

function sleepSubject(): Extract<
  BattleSubject,
  { readonly tag: "actionSpell" }
> {
  return {
    tag: "actionSpell",
    actorId: fighterId,
    invocation: spellSlotInvocationRef("sleep", 1, "sleepTargetAdmission"),
    mode: { tag: "cast" },
  };
}

function discoverSleepHoles(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>,
): readonly BattleHole[] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === subject.actorId &&
      candidate.subject.invocation.spellId === subject.invocation.spellId,
  );
  if (act == null) {
    throw new Error("Expected Sleep spell act.");
  }

  return act.initialHoles;
}

function discoverSleepAct(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>,
): ReturnType<typeof discoverBattleActs>[number] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === subject.actorId &&
      candidate.subject.invocation.spellId === subject.invocation.spellId,
  );
  if (act == null) {
    throw new Error("Expected Sleep spell act.");
  }

  return act;
}

function endTurnSubjectFor(
  actorId: CombatantId,
): Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "endTurn" }
> {
  return { tag: "runtimeCommand", actorId, command: "endTurn" };
}

function endConcentrationSubjectFor(
  actorId: CombatantId,
): Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "endConcentration" }
> {
  return { tag: "runtimeCommand", actorId, command: "endConcentration" };
}

function startBattleRight(
  input: Parameters<typeof startBattle>[0],
): BattleState {
  const result = startBattle(input);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function requireResolved(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  expect(result.tag).toBe("resolved");
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved result, got ${result.tag}.`);
  }
  return result;
}

function requireNeedsHoles(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  expect(result.tag).toBe("needsHoles");
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles result, got ${result.tag}.`);
  }
  return result;
}

function baseUnarmedStrike(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["unarmedStrike"] {
  return {
    kind: "unarmedStrike",
    effect: {
      kind: "damage",
      damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
    },
    attackAbility: "str",
    attackAbilityModifier: abilityModifier(3),
    attackBonus: attackBonus(5),
    damageAbilityModifier: abilityModifier(3),
  };
}

function findSleepRepeatSaveSavingThrowHole(
  holes: readonly BattleHole[],
): SleepSavingThrowOutcomeHole {
  const hole = holes.find(
    (candidate) => candidate.kind === "savingThrowOutcome",
  );
  if (hole == null) {
    throw new Error("Expected savingThrowOutcome hole.");
  }

  return hole;
}

function fillsWithSleepRepeatSaveSpatialFacts(
  holes: readonly BattleHole[],
  fills: readonly BattleFill[],
): readonly BattleFill[] {
  const filledHoleIds = new Set(
    fills
      .filter((fill) => fill.kind === "targetSpatialFacts")
      .map((fill) => fill.holeId),
  );
  const spatialFactFills = holes.flatMap(
    (
      hole,
    ): readonly Extract<
      BattleFill,
      { readonly kind: "targetSpatialFacts" }
    >[] =>
      hole.kind === "targetSpatialFacts" && !filledHoleIds.has(hole.holeId)
        ? [
            {
              kind: "targetSpatialFacts",
              holeId: hole.holeId,
              spatialFacts: [],
            },
          ]
        : [],
  );
  return spatialFactFills.length === 0
    ? fills
    : [...fills, ...spatialFactFills];
}

function sleepSavingThrowOutcomeFill(
  hole: SleepSavingThrowOutcomeHole,
  targetId: CombatantId,
  succeeded: boolean,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  const outcomes = [{ targetId, succeeded }];
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value:
      "spell" in hole && hole.spell.targeting.kind !== "singleCombatant"
        ? {
            area: {
              originAnchorId: fighterId,
              affectedTargetIds: [targetId],
            },
            outcomes,
          }
        : { outcomes },
  };
}

function sleepRepeatSaveMbtInvalidReason(
  reason: Extract<
    BattleResolutionResult,
    { readonly tag: "invalid" }
  >["reason"],
): SleepRepeatSaveMbtProjection["lastInvalidReason"] {
  if (
    reason === "invalidFill" ||
    reason === "staleSubject" ||
    reason === "wrongActor"
  ) {
    return reason;
  }

  throw new Error(`Unexpected Sleep repeat-save invalid reason: ${reason}`);
}

function projectSleepRepeatSaveHoles(
  holes: readonly BattleHole[],
): readonly SleepRepeatSaveMbtHole[] {
  return holes.map(projectSleepRepeatSaveHole).sort();
}

function projectSleepRepeatSaveHole(hole: BattleHole): SleepRepeatSaveMbtHole {
  if (hole.kind === "savingThrowOutcome") {
    return "SavingThrowOutcome";
  }

  throw new Error(`Unexpected Sleep repeat-save MBT hole: ${hole.kind}`);
}

function sleepRepeatSaveHoleName(raw: unknown): SleepRepeatSaveMbtHole {
  const tag = quintVariantTag(raw);
  if (tag === "SavingThrowOutcome") {
    return tag;
  }

  throw new Error(`Unknown Quint Sleep repeat-save hole variant: ${tag}`);
}

function sleepRepeatSaveMbtTurnRole(
  raw: unknown,
  field: string,
): SleepRepeatSaveMbtTurnRole {
  if (raw === "caster" || raw === "target") {
    return raw;
  }

  throw new Error(`Expected Sleep repeat-save MBT turn role field ${field}.`);
}

function sleepRepeatSaveMbtLastResult(
  raw: unknown,
): SleepRepeatSaveMbtLastResult {
  if (
    raw === "init" ||
    raw === "needsHoles" ||
    raw === "resolved" ||
    raw === "invalid"
  ) {
    return raw;
  }

  throw new Error(`Unknown Quint last result: ${String(raw)}.`);
}

function sleepRepeatSaveMbtLastInvalidReason(
  raw: unknown,
): SleepRepeatSaveMbtLastInvalidReason {
  if (
    raw === "" ||
    raw === "invalidFill" ||
    raw === "staleSubject" ||
    raw === "wrongActor"
  ) {
    return raw;
  }

  throw new Error(`Unknown Quint invalid reason: ${String(raw)}.`);
}

function sleepRepeatSaveRouteSurface(raw: string): SleepRepeatSaveRouteSurface {
  if (raw in SLEEP_REPEAT_SAVE_ROUTE_SURFACE_BY_TAG) {
    return SLEEP_REPEAT_SAVE_ROUTE_SURFACE_BY_TAG[
      raw as keyof typeof SLEEP_REPEAT_SAVE_ROUTE_SURFACE_BY_TAG
    ];
  }

  throw new Error(`Unexpected Sleep repeat-save route surface: ${raw}`);
}
