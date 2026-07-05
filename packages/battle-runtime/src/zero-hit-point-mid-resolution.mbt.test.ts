// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.ZERO_HIT_POINT_MID_RESOLUTION
// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Dropping to 0 Hit Points:
//   a creature that reaches 0 Hit Points and does not die instantly gains the
//   Unconscious condition.
// - .references/srd-5.2.1/Rules-Glossary.md#Unconscious: Unconscious implies
//   Incapacitated.
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration and #Incapacitated:
//   Concentration ends when the creature has the Incapacitated condition.
// - .references/srd-5.2.1/Spells/Descriptions-S-Z.md#Shield of Faith:
//   the concentrating spell grants +2 AC to a selected creature.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Eldritch Blast:
//   separate attack rolls resolve for separate beams.
// - UBIQUITOUS_LANGUAGE.md: Hit Points, Unconscious, Incapacitated,
//   Concentration, Spell Effect.
// Boundary: bounded fixture-world composition witness for same-resolution
// ordering; not exhaustive spell-attack sequence or same-timing coverage.
import { describe, expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  assertWitnessProtocolConsistentWithScenario,
  booleanField,
  decodeReducerRoute,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintField,
  quintRecordField,
  quintStateRecord,
  quintVariantMappedValue,
  quintVariantTag,
  run,
  stateCheck,
  type ReducerRouteEvent,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  attackRollFill,
  cantripSpellInvocationRef,
  characterSeed,
  concentrationSavingThrowFill,
  damageRollFillWithGroups,
  defaultArmorClassState,
  requireHole,
  secondSkeletonId,
  skeletonId,
  spellRecord,
  startBattleRight,
  targetFill,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";
import {
  battleId,
  battleReducerStartRouteEvent,
  discoverBattleActs,
  resolveBattleSubject,
  spellId,
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleHole,
  type BattleReducerRouteEvent,
  type BattleResolutionResult,
  type BattleState,
} from "./index.ts";
import { requireCombatant } from "./unit-profile-admission-creature-fixture-support.ts";

const zeroHitPointMidResolutionScenarios = [
  "init",
  "spellAttackSequenceResolved",
] as const;
type ZeroHitPointMidResolutionScenario =
  (typeof zeroHitPointMidResolutionScenarios)[number];
const zeroHitPointRouteSurfaceByTag = {
  FreshRouteSurface: "fresh",
  SpellAttackSequenceResolvedRouteSurface: "spellAttackSequenceResolved",
} as const satisfies Readonly<Record<string, string>>;
type ZeroHitPointRouteSurface =
  (typeof zeroHitPointRouteSurfaceByTag)[keyof typeof zeroHitPointRouteSurfaceByTag];

const scenarioByQuintTag = {
  Init: "init",
  SpellAttackSequenceResolved: "spellAttackSequenceResolved",
} as const satisfies Readonly<
  Record<string, ZeroHitPointMidResolutionScenario>
>;
const scenarioByTag: Readonly<
  Record<string, ZeroHitPointMidResolutionScenario>
> = scenarioByQuintTag;

type ZeroHitPointMidResolutionHole = "zeroHitPointMidResolution";

type ZeroHitPointMidResolutionProjection = {
  readonly scenario: ZeroHitPointMidResolutionScenario;
  readonly sourceHp: number;
  readonly sourceUnconscious: boolean;
  readonly sourceConcentrating: boolean;
  readonly shieldOfFaithPresent: boolean;
  readonly protectedTargetHp: number;
  readonly sourceDamage: number;
  readonly protectedTargetDamage: number;
  readonly protectedTargetDamageIfShieldOfFaithRemained: number;
  readonly zeroHpAppliedBeforeSecondBeam: boolean;
  readonly teardownBeforeSecondBeam: boolean;
  readonly remainderUsedPostTeardownState: boolean;
};

type ZeroHitPointRouteProjection = {
  readonly surface: ZeroHitPointRouteSurface;
  readonly route: readonly ReducerRouteEvent[];
};

type ZeroHitPointMidResolutionRuntimeState = {
  readonly battle: BattleState;
  readonly scenario: ZeroHitPointMidResolutionScenario;
  readonly sourceDamage: number;
  readonly protectedTargetDamage: number;
  readonly protectedTargetDamageIfShieldOfFaithRemained: number;
  readonly zeroHpAppliedBeforeSecondBeam: boolean;
  readonly teardownBeforeSecondBeam: boolean;
  readonly remainderUsedPostTeardownState: boolean;
};

type ZeroHitPointSpellAttackAct = AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "actionSpell" }
  >;
};

const eldritchBlastUnitId = "eldritch_blast";
const shieldOfFaithUnitId = "shield_of_faith";
const sourceInitialHp = 4;
const protectedTargetInitialHp = 12;
const firstBeamDamage = 6;
const secondBeamDamage = 4;
const secondBeamAttackTotal = 11;
const protectedTargetDamageIfShieldOfFaithRemained = 0;

const driverSchema = {
  init: {},
  doResolveEldritchBlast: {},
  step: {},
} as const;

const routeDriverSchema = {
  init: {},
  doResolveEldritchBlast: {},
  step: {},
} as const;

const zeroHitPointMidResolutionStateCheck = stateCheck(
  normalizeZeroHitPointMidResolutionQuintState,
  compareZeroHitPointMidResolutionStates,
);
const zeroHitPointRouteStateCheck = stateCheck(
  normalizeZeroHitPointRouteQuintState,
  compareZeroHitPointRouteStates,
);

describe("zero-Hit-Point mid-resolution MBT parity", () => {
  it("replays the bounded zero-Hit-Point mid-resolution seam deterministically", async () => {
    const driver = createZeroHitPointMidResolutionDriver()();
    await driver.actions.doResolveEldritchBlast.handler({});
    const runtime = driver.getState?.();
    if (runtime === undefined) {
      throw new Error(
        "Zero-Hit-Point mid-resolution driver must expose getState.",
      );
    }
    expect(runtime).toEqual({
      scenario: "spellAttackSequenceResolved",
      sourceHp: 0,
      sourceUnconscious: true,
      sourceConcentrating: false,
      shieldOfFaithPresent: false,
      protectedTargetHp: 8,
      sourceDamage: firstBeamDamage,
      protectedTargetDamage: secondBeamDamage,
      protectedTargetDamageIfShieldOfFaithRemained,
      zeroHpAppliedBeforeSecondBeam: true,
      teardownBeforeSecondBeam: true,
      remainderUsedPostTeardownState: true,
    });
  });

  it(
    "matches focused zero-Hit-Point mid-resolution traces against Quint",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-zero-hit-point-mid-resolution.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createZeroHitPointMidResolutionDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: zeroHitPointMidResolutionStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "observes the copied zero-Hit-Point qRoute through public reducer entrypoints",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-zero-hit-point-mid-resolution.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createZeroHitPointRouteReplayDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: zeroHitPointRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it("does not route readied-spell concentration cleanup as Spell Effect teardown", () => {
    const projection = observeZeroHitPointMidResolutionPublicRoute(
      battleWithReadiedSpellConcentrationSource(),
    );

    expect(
      zeroHitPointSpellEffectTeardownEvents(projection.route),
    ).toHaveLength(0);
  });
});

function createZeroHitPointMidResolutionDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doResolveEldritchBlast: () => {
        state = resolveEldritchBlast(state);
      },
      step: () => {},
      getState: () => zeroHitPointMidResolutionProjection(state),
    };
  });
}

function createZeroHitPointRouteReplayDriver() {
  return defineDriver(routeDriverSchema, () => {
    let projection = initialZeroHitPointRouteProjection();
    return {
      init: () => {
        projection = initialZeroHitPointRouteProjection();
      },
      doResolveEldritchBlast: () => {
        projection = observeZeroHitPointMidResolutionPublicRoute();
      },
      step: () => {},
      getState: () => projection,
    };
  });
}

function initialRuntimeState(): ZeroHitPointMidResolutionRuntimeState {
  return {
    battle: battleWithConcentratingShieldOfFaithSource(),
    scenario: "init",
    sourceDamage: 0,
    protectedTargetDamage: 0,
    protectedTargetDamageIfShieldOfFaithRemained: 0,
    zeroHpAppliedBeforeSecondBeam: false,
    teardownBeforeSecondBeam: false,
    remainderUsedPostTeardownState: false,
  };
}

function initialZeroHitPointRouteProjection(): ZeroHitPointRouteProjection {
  return {
    surface: "fresh",
    route: [battleReducerStartRouteEvent()],
  };
}

function observeZeroHitPointMidResolutionPublicRoute(
  battle = battleWithConcentratingShieldOfFaithSource(),
): ZeroHitPointRouteProjection {
  const route: BattleReducerRouteEvent[] = [battleReducerStartRouteEvent()];
  const act = requireZeroHitPointSpellAttackAct(battle);
  route.push(
    ...requireRouteEvents(act.routeEvents, "Eldritch Blast discovery"),
  );
  const subject = act.subject;
  const firstTarget = requireHole(
    resolveBattleSubject({
      state: battle,
      subject,
      fills: [],
    }),
    "targetChoice",
  );
  const firstBeamTarget = targetFill(firstTarget, skeletonId);
  const secondTargetResult = resolveBattleSubject({
    state: battle,
    subject,
    fills: [firstBeamTarget],
  });
  route.push(
    ...requireRouteEvents(secondTargetResult.routeEvents, "first target"),
  );
  const secondTarget = requireHole(secondTargetResult, "targetChoice");
  const secondBeamTarget = targetFill(secondTarget, secondSkeletonId);
  const targetFills = [firstBeamTarget, secondBeamTarget] as const;
  const firstAttackResult = resolveBattleSubject({
    state: battle,
    subject,
    fills: targetFills,
  });
  route.push(
    ...requireRouteEvents(firstAttackResult.routeEvents, "second target"),
  );
  const firstAttack = requireHole(firstAttackResult, "attackRoll");
  const firstAttackFill = attackRollFill(firstAttack, {
    total: 18,
    naturalD20: 12,
  });
  const firstDamageResult = resolveBattleSubject({
    state: battle,
    subject,
    fills: [...targetFills, firstAttackFill],
  });
  route.push(
    ...requireRouteEvents(firstDamageResult.routeEvents, "first attack"),
  );
  const firstDamage = requireHole(firstDamageResult, "rolledDice");
  const firstDamageFill = damageRollFillWithGroups(firstDamage, [
    [firstBeamDamage],
  ]);
  const pendingConcentration = resolveBattleSubject({
    state: battle,
    subject,
    fills: [...targetFills, firstAttackFill, firstDamageFill],
  });
  route.push(
    ...requireRouteEvents(pendingConcentration.routeEvents, "first damage"),
  );
  expect(pendingConcentration).toMatchObject({ tag: "needsHoles" });
  if (pendingConcentration.tag !== "needsHoles") {
    throw new Error("Expected Eldritch Blast to request Concentration saves.");
  }
  const concentrationFills = concentrationSavingThrowHoles(
    pendingConcentration.holes,
  ).map((hole) => concentrationSavingThrowFill(hole, true));
  const secondAttackResult = resolveBattleSubject({
    state: battle,
    subject,
    fills: [
      ...targetFills,
      firstAttackFill,
      firstDamageFill,
      ...concentrationFills,
    ],
  });
  route.push(
    ...requireRouteEvents(
      secondAttackResult.routeEvents,
      "concentration saving throw",
    ),
  );
  const secondAttack = requireHole(secondAttackResult, "attackRoll");
  const secondAttackFill = attackRollFill(secondAttack, {
    total: secondBeamAttackTotal,
    naturalD20: 6,
  });
  const secondDamageResult = resolveBattleSubject({
    state: battle,
    subject,
    fills: [
      ...targetFills,
      firstAttackFill,
      firstDamageFill,
      ...concentrationFills,
      secondAttackFill,
    ],
  });
  route.push(
    ...requireRouteEvents(secondDamageResult.routeEvents, "second attack"),
  );
  const secondDamage = requireHole(secondDamageResult, "rolledDice");
  const secondDamageFill = damageRollFillWithGroups(secondDamage, [
    [secondBeamDamage],
  ]);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: battle,
      subject,
      fills: [
        ...targetFills,
        firstAttackFill,
        firstDamageFill,
        ...concentrationFills,
        secondAttackFill,
        secondDamageFill,
      ],
    }),
  );
  route.push(...requireRouteEvents(resolved.routeEvents, "second damage"));
  return {
    surface: "spellAttackSequenceResolved",
    route,
  };
}

function resolveEldritchBlast(
  state: ZeroHitPointMidResolutionRuntimeState,
): ZeroHitPointMidResolutionRuntimeState {
  expect(state.scenario).toBe("init");
  const subject = {
    tag: "actionSpell" as const,
    actorId: wizardId,
    invocation: cantripSpellInvocationRef(
      eldritchBlastUnitId,
      "spellAttackSequence",
    ),
    mode: { tag: "cast" as const },
  };
  const firstTarget = requireHole(
    resolveBattleSubject({
      state: state.battle,
      subject,
      fills: [],
    }),
    "targetChoice",
  );
  const firstBeamTarget = targetFill(firstTarget, skeletonId);
  const secondTarget = requireHole(
    resolveBattleSubject({
      state: state.battle,
      subject,
      fills: [firstBeamTarget],
    }),
    "targetChoice",
  );
  const secondBeamTarget = targetFill(secondTarget, secondSkeletonId);
  const targetFills = [firstBeamTarget, secondBeamTarget] as const;
  const firstAttack = requireHole(
    resolveBattleSubject({
      state: state.battle,
      subject,
      fills: targetFills,
    }),
    "attackRoll",
  );
  const firstAttackFill = attackRollFill(firstAttack, {
    total: 18,
    naturalD20: 12,
  });
  const firstDamage = requireHole(
    resolveBattleSubject({
      state: state.battle,
      subject,
      fills: [...targetFills, firstAttackFill],
    }),
    "rolledDice",
  );
  const firstDamageFill = damageRollFillWithGroups(firstDamage, [
    [firstBeamDamage],
  ]);
  const pendingConcentration = resolveBattleSubject({
    state: state.battle,
    subject,
    fills: [...targetFills, firstAttackFill, firstDamageFill],
  });
  expect(pendingConcentration).toMatchObject({ tag: "needsHoles" });
  if (pendingConcentration.tag !== "needsHoles") {
    throw new Error("Expected Eldritch Blast to request Concentration saves.");
  }
  const concentrationFills = concentrationSavingThrowHoles(
    pendingConcentration.holes,
  ).map((hole) => concentrationSavingThrowFill(hole, true));
  expect(concentrationFills).toHaveLength(1);
  const secondAttack = requireHole(
    resolveBattleSubject({
      state: state.battle,
      subject,
      fills: [
        ...targetFills,
        firstAttackFill,
        firstDamageFill,
        ...concentrationFills,
      ],
    }),
    "attackRoll",
  );
  const secondAttackFill = attackRollFill(secondAttack, {
    total: secondBeamAttackTotal,
    naturalD20: 6,
  });
  const secondDamage = requireHole(
    resolveBattleSubject({
      state: state.battle,
      subject,
      fills: [
        ...targetFills,
        firstAttackFill,
        firstDamageFill,
        ...concentrationFills,
        secondAttackFill,
      ],
    }),
    "rolledDice",
  );
  const secondDamageFill = damageRollFillWithGroups(secondDamage, [
    [secondBeamDamage],
  ]);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject,
      fills: [
        ...targetFills,
        firstAttackFill,
        firstDamageFill,
        ...concentrationFills,
        secondAttackFill,
        secondDamageFill,
      ],
    }),
  );
  const source = requireCombatant(resolved.state, skeletonId);
  const protectedTarget = requireCombatant(resolved.state, secondSkeletonId);
  const protectedTargetDamage =
    protectedTargetInitialHp - Number(protectedTarget.hp);
  const shieldOfFaithPresent = shieldOfFaithPresentOnProtectedTarget(
    resolved.state,
  );
  const zeroHpAppliedBeforeSecondBeam =
    Number(source.hp) === 0 &&
    source.conditions.unconscious === true &&
    source.concentration === null;
  const teardownBeforeSecondBeam = !shieldOfFaithPresent;
  return {
    ...state,
    battle: resolved.state,
    scenario: "spellAttackSequenceResolved",
    sourceDamage: firstBeamDamage,
    protectedTargetDamage,
    protectedTargetDamageIfShieldOfFaithRemained,
    zeroHpAppliedBeforeSecondBeam,
    teardownBeforeSecondBeam,
    remainderUsedPostTeardownState:
      zeroHpAppliedBeforeSecondBeam &&
      teardownBeforeSecondBeam &&
      protectedTargetDamage === secondBeamDamage,
  };
}

function battleWithConcentratingShieldOfFaithSource(): BattleState {
  const base = startBattleRight({
    battleId: battleId("battle-zero-hit-point-mid-resolution"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Beam Spellcaster",
        initiative: 20,
        attack: null,
        classLevel: 5,
        spellcasting: wizardSpellcasting({
          cantrips: [spellRecord(eldritchBlastUnitId)],
          preparedSpells: [],
        }),
      }),
      characterSeed({
        combatantId: skeletonId,
        displayName: "Shield of Faith Source",
        initiative: 10,
        currentHp: sourceInitialHp,
        maxHp: 12,
      }),
      characterSeed({
        combatantId: secondSkeletonId,
        displayName: "Shielded Target",
        initiative: 8,
        attack: null,
        currentHp: protectedTargetInitialHp,
        maxHp: protectedTargetInitialHp,
        armorClass: defaultArmorClassState(),
      }),
    ],
  });
  const source = requireCombatant(base, skeletonId);
  const protectedTarget = requireCombatant(base, secondSkeletonId);
  const shieldOfFaithEffect = {
    kind: "spellArmorClassBonus",
    sourceSpellId: spellId(shieldOfFaithUnitId),
    sourceCombatantId: skeletonId,
    bonus: 2,
    negatedSpellIds: [],
    expiresAt: {
      kind: "concentration",
      combatantId: skeletonId,
    },
  } satisfies Extract<
    BattleActiveEffect,
    { readonly kind: "spellArmorClassBonus" }
  >;
  return {
    ...base,
    combatants: new Map(base.combatants)
      .set(skeletonId, {
        ...source,
        concentration: {
          sourceSpellId: spellId(shieldOfFaithUnitId),
          effectKind: "spellEffect",
        },
      })
      .set(secondSkeletonId, {
        ...protectedTarget,
        activeEffects: [...protectedTarget.activeEffects, shieldOfFaithEffect],
      }),
  };
}

function battleWithReadiedSpellConcentrationSource(): BattleState {
  const base = battleWithConcentratingShieldOfFaithSource();
  const source = requireCombatant(base, skeletonId);
  const protectedTarget = requireCombatant(base, secondSkeletonId);
  return {
    ...base,
    combatants: new Map(base.combatants)
      .set(skeletonId, {
        ...source,
        concentration: {
          sourceSpellId: spellId(shieldOfFaithUnitId),
          effectKind: "readiedSpell",
        },
      })
      .set(secondSkeletonId, {
        ...protectedTarget,
        activeEffects: protectedTarget.activeEffects.filter(
          (effect) =>
            !(
              effect.kind === "spellArmorClassBonus" &&
              effect.sourceSpellId === spellId(shieldOfFaithUnitId) &&
              effect.sourceCombatantId === skeletonId
            ),
        ),
      }),
  };
}

function zeroHitPointSpellEffectTeardownEvents(
  route: readonly ReducerRouteEvent[],
): readonly Extract<
  ReducerRouteEvent,
  { readonly kind: "resolveBattleSubjectWithoutFill" }
>[] {
  return route.filter(
    (
      event,
    ): event is Extract<
      ReducerRouteEvent,
      { readonly kind: "resolveBattleSubjectWithoutFill" }
    > =>
      event.kind === "resolveBattleSubjectWithoutFill" &&
      event.subject === "zeroHitPointSpellEffectTeardown",
  );
}

function concentrationSavingThrowHoles(
  holes: readonly BattleHole[],
): readonly Extract<
  BattleHole,
  { readonly kind: "concentrationSavingThrow" }
>[] {
  const concentrationHoles = holes.filter(
    (
      hole,
    ): hole is Extract<
      BattleHole,
      { readonly kind: "concentrationSavingThrow" }
    > => hole.kind === "concentrationSavingThrow",
  );
  return [
    ...new Map(concentrationHoles.map((hole) => [hole.holeId, hole])).values(),
  ];
}

function zeroHitPointMidResolutionProjection(
  state: ZeroHitPointMidResolutionRuntimeState,
): ZeroHitPointMidResolutionProjection {
  const source = requireCombatant(state.battle, skeletonId);
  const protectedTarget = requireCombatant(state.battle, secondSkeletonId);
  return {
    scenario: state.scenario,
    sourceHp: Number(source.hp),
    sourceUnconscious: source.conditions.unconscious === true,
    sourceConcentrating: source.concentration !== null,
    shieldOfFaithPresent: shieldOfFaithPresentOnProtectedTarget(state.battle),
    protectedTargetHp: Number(protectedTarget.hp),
    sourceDamage: state.sourceDamage,
    protectedTargetDamage: state.protectedTargetDamage,
    protectedTargetDamageIfShieldOfFaithRemained:
      state.protectedTargetDamageIfShieldOfFaithRemained,
    zeroHpAppliedBeforeSecondBeam: state.zeroHpAppliedBeforeSecondBeam,
    teardownBeforeSecondBeam: state.teardownBeforeSecondBeam,
    remainderUsedPostTeardownState: state.remainderUsedPostTeardownState,
  };
}

function shieldOfFaithPresentOnProtectedTarget(state: BattleState): boolean {
  return requireCombatant(state, secondSkeletonId).activeEffects.some(
    (effect) =>
      effect.kind === "spellArmorClassBonus" &&
      effect.sourceSpellId === spellId(shieldOfFaithUnitId) &&
      effect.sourceCombatantId === skeletonId,
  );
}

function requireZeroHitPointSpellAttackAct(
  state: BattleState,
): ZeroHitPointSpellAttackAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ZeroHitPointSpellAttackAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === wizardId &&
      candidate.subject.invocation.spellId === spellId(eldritchBlastUnitId) &&
      candidate.subject.invocation.procedure === "spellAttackSequence",
  );
  if (act === undefined) {
    throw new Error("Expected Eldritch Blast spell attack sequence act.");
  }
  return act;
}

function requireRouteEvents(
  routeEvents: readonly BattleReducerRouteEvent[] | undefined,
  label: string,
): readonly BattleReducerRouteEvent[] {
  if (routeEvents === undefined) {
    throw new Error(`Expected public reducer route events for ${label}.`);
  }
  return routeEvents;
}

function requireResolved(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  if (result.tag !== "resolved") {
    throw new Error(
      `Expected battle resolution to resolve; got ${result.tag}${
        result.tag === "invalid" ? `: ${result.message}` : ""
      }.`,
    );
  }
  expect(result).toMatchObject({ tag: "resolved" });
  return result;
}

function normalizeZeroHitPointMidResolutionQuintState(
  raw: unknown,
): ZeroHitPointMidResolutionProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const scenario = zeroHitPointMidResolutionScenario(state["qScenario"]);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: zeroHitPointMidResolutionHole,
  });
  assertWitnessProtocolConsistentWithScenario({
    label: "zero-Hit-Point mid-resolution",
    scenarioOutcome: scenario,
    protocol,
  });
  return {
    scenario,
    sourceHp: numberFromQuintInt(state["qSourceHp"], "qSourceHp"),
    sourceUnconscious: booleanField(state, "qSourceUnconscious"),
    sourceConcentrating: booleanField(state, "qSourceConcentrating"),
    shieldOfFaithPresent: booleanField(state, "qShieldOfFaithPresent"),
    protectedTargetHp: numberFromQuintInt(
      state["qProtectedTargetHp"],
      "qProtectedTargetHp",
    ),
    sourceDamage: numberFromQuintInt(state["qSourceDamage"], "qSourceDamage"),
    protectedTargetDamage: numberFromQuintInt(
      state["qProtectedTargetDamage"],
      "qProtectedTargetDamage",
    ),
    protectedTargetDamageIfShieldOfFaithRemained: numberFromQuintInt(
      state["qProtectedTargetDamageIfShieldOfFaithRemained"],
      "qProtectedTargetDamageIfShieldOfFaithRemained",
    ),
    zeroHpAppliedBeforeSecondBeam: booleanField(
      state,
      "qZeroHpAppliedBeforeSecondBeam",
    ),
    teardownBeforeSecondBeam: booleanField(state, "qTeardownBeforeSecondBeam"),
    remainderUsedPostTeardownState: booleanField(
      state,
      "qRemainderUsedPostTeardownState",
    ),
  };
}

function normalizeZeroHitPointRouteQuintState(
  raw: unknown,
): ZeroHitPointRouteProjection {
  const state = quintStateRecord(raw);
  return {
    surface: quintVariantMappedValue(
      quintField(state, "qSurface"),
      "qSurface",
      zeroHitPointRouteSurfaceByTag,
      "zero-Hit-Point route surface",
    ),
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function zeroHitPointMidResolutionScenario(
  raw: unknown,
): ZeroHitPointMidResolutionScenario {
  const tag = quintVariantTag(raw, "qScenario");
  const scenario = scenarioByTag[tag];
  if (scenario !== undefined) {
    return scenario;
  }
  throw new Error(`Unexpected zero-Hit-Point scenario ${tag}.`);
}

function zeroHitPointMidResolutionHole(
  raw: unknown,
): ZeroHitPointMidResolutionHole {
  const tag = quintVariantTag(raw, "zero-Hit-Point witness hole");
  if (tag === "ZeroHitPointMidResolution") {
    return "zeroHitPointMidResolution";
  }
  throw new Error(`Unexpected zero-Hit-Point witness hole ${tag}.`);
}

function compareZeroHitPointMidResolutionStates(
  runtime: ZeroHitPointMidResolutionProjection,
  quint: ZeroHitPointMidResolutionProjection,
): boolean {
  expect(runtime).toStrictEqual(quint);
  return true;
}

function compareZeroHitPointRouteStates(
  runtime: ZeroHitPointRouteProjection,
  quint: ZeroHitPointRouteProjection,
): boolean {
  expect(runtime).toStrictEqual(quint);
  return true;
}
