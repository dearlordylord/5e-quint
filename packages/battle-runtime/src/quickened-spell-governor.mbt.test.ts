// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.metamagic-cast-governor-quickened
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_QUICKENED_CAST_GOVERNOR
// RAW trace:
// - .references/srd-5.2.1/Classes/Sorcerer.md#Level 2: Metamagic:
//   Metamagic options are known choices, each costs Sorcery Points, and a
//   spell can use only one option unless an option says otherwise.
// - .references/srd-5.2.1/Classes/Sorcerer.md#Quickened Spell:
//   Quickened Spell costs 2 Sorcery Points, changes an action casting time
//   to a Bonus Action for that casting, and bars level 1+ spell casts before
//   or after the modified spell on the same turn.
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Casting Time:
//   spells use the Casting Time entry and a turn can expend only one Spell
//   Slot to cast a spell.
// - UBIQUITOUS_LANGUAGE.md: Magic Action, Bonus Action, Spell Slot,
//   Sorcery Points as a Pool, and Spend.
import {
  canSpendAction,
  spendAction,
} from "@dnd/shared-algebras/action-economy-algebra";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { resourceCount } from "@dnd/shared/types";
import * as Either from "effect/Either";
import { describe, expect, it } from "vitest";

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
  EMPOWERED_METAMAGIC_EFFECT_KIND,
  QUICKENED_METAMAGIC_EFFECT_KIND,
  QUICKENED_SPELL_METAMAGIC_SELECTION,
} from "./battle-reducer/metamagic.ts";
import {
  type AvailableBattleAct,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type CharacterBattleMetamagicOptionFact,
  type CombatantId,
  characterBattleResourceIsPointPool,
  discoverBattleActs,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./index.ts";
import {
  battleId,
  characterSeed,
  damageRollFillWithGroups,
  fighterId,
  findHole,
  partySide,
  requireResolved,
  savingThrowOutcomeFill,
  skeletonId,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  unitLibrary,
  wizardId,
  wizardSpellcasting,
  spellRecord,
} from "./battle-runtime-test-support.ts";

const INVALID_KINDS = [
  "none",
  "unaffordable",
  "unknownOption",
  "unsupportedSecondOption",
  "onePerSpell",
  "sameTurnLevelOnePlus",
] as const;
type InvalidKind = (typeof INVALID_KINDS)[number];
const INVALID_KIND_SET: ReadonlySet<string> = new Set(INVALID_KINDS);

const LAST_RESULTS = [
  "init",
  "resolvedQuickenedRestoration",
  "resolvedQuickenedSaveGatedCondition",
  "resolvedQuickenedSaveGatedConditionImmunity",
  "resolvedQuickenedDirectCondition",
  "resolvedQuickenedRollModifier",
  "resolvedAfterMagicActionSpent",
  "rejectedUnaffordable",
  "rejectedUnknownOption",
  "rejectedUnsupportedSecondOption",
  "rejectedOnePerSpell",
  "rejectedPriorLevelOnePlusSpell",
] as const;
type LastResult = (typeof LAST_RESULTS)[number];
const LAST_RESULT_SET: ReadonlySet<string> = new Set(LAST_RESULTS);

type QuickenedSpellGovernorProjection = {
  readonly quickenedCureWoundsOffered: boolean;
  readonly colorSprayBlinded: boolean;
  readonly calmEmotionsImmunity: boolean;
  readonly invisibilityActive: boolean;
  readonly blessActive: boolean;
  readonly magicActionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly sorceryPointsRemaining: number;
  readonly targetHp: number;
  readonly spellSlotCommitted: boolean;
  readonly levelOnePlusCastThisTurn: boolean;
  readonly quickenedLevelOnePlusCastThisTurn: boolean;
  readonly spellSlotActsAvailable: boolean;
  readonly invalidKind: InvalidKind;
  readonly lastResult: LastResult;
};

type QuickenedSpellGovernorRuntimeState = {
  readonly battle: BattleState;
  readonly invalidKind: InvalidKind;
  readonly lastResult: LastResult;
};

type MetamagicOptionFixture = CharacterBattleMetamagicOptionFact;

const INITIAL_SORCERY_POINTS = 4;
const HIGH_SORCERY_POINTS = 5;
const UNAFFORDABLE_SORCERY_POINTS = 1;
const INITIAL_TARGET_HP = 4;
const QUICKENED_HEALING_RESULT_HP = 14;

const driverSchema = {
  init: {},
  doResolveQuickenedRestoration: {},
  doResolveQuickenedSaveGatedCondition: {},
  doResolveQuickenedSaveGatedConditionImmunity: {},
  doResolveQuickenedDirectCondition: {},
  doResolveQuickenedRollModifier: {},
  doResolveQuickenedAfterMagicActionSpent: {},
  doRejectUnaffordable: {},
  doRejectUnknownOption: {},
  doRejectUnsupportedSecondOption: {},
  doRejectOnePerSpell: {},
  doRejectPriorLevelOnePlusSpell: {},
  step: {},
} as const;

function createQuickenedSpellGovernorDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doResolveQuickenedRestoration: () => {
        state = resolveQuickenedRestoration(initialRuntimeState());
      },
      doResolveQuickenedSaveGatedCondition: () => {
        state = resolveQuickenedSaveGatedCondition(initialRuntimeState());
      },
      doResolveQuickenedSaveGatedConditionImmunity: () => {
        state = resolveQuickenedSaveGatedConditionImmunity(
          initialRuntimeState(),
        );
      },
      doResolveQuickenedDirectCondition: () => {
        state = resolveQuickenedDirectCondition(initialRuntimeState());
      },
      doResolveQuickenedRollModifier: () => {
        state = resolveQuickenedRollModifier(initialRuntimeState());
      },
      doResolveQuickenedAfterMagicActionSpent: () => {
        state = resolveQuickenedRestoration({
          battle: magicActionSpent(initialRuntimeState().battle),
          invalidKind: "none",
          lastResult: "init",
        });
        state = { ...state, lastResult: "resolvedAfterMagicActionSpent" };
      },
      doRejectUnaffordable: () => {
        state = rejectUnaffordable();
      },
      doRejectUnknownOption: () => {
        state = rejectUnknownOption();
      },
      doRejectUnsupportedSecondOption: () => {
        state = rejectUnsupportedSecondOption();
      },
      doRejectOnePerSpell: () => {
        state = rejectOnePerSpell();
      },
      doRejectPriorLevelOnePlusSpell: () => {
        state = rejectPriorLevelOnePlusSpell();
      },
      step: () => {},
      getState: () => quickenedSpellGovernorProjection(state),
    };
  });
}

const quickenedSpellGovernorStateCheck = stateCheck(
  normalizeQuickenedSpellGovernorQuintState,
  compareQuickenedSpellGovernorStates,
);

describe("Quickened Spell governor MBT parity", () => {
  it("discovers and resolves known affordable Quickened action spells as Bonus Action casts", () => {
    const resolved = resolveQuickenedRestoration(initialRuntimeState());

    expect(quickenedSpellGovernorProjection(resolved)).toMatchObject({
      quickenedCureWoundsOffered: false,
      colorSprayBlinded: false,
      calmEmotionsImmunity: false,
      invisibilityActive: false,
      blessActive: false,
      magicActionAvailable: true,
      bonusActionAvailable: false,
      sorceryPointsRemaining: INITIAL_SORCERY_POINTS - 2,
      targetHp: QUICKENED_HEALING_RESULT_HP,
      spellSlotCommitted: true,
      levelOnePlusCastThisTurn: true,
      quickenedLevelOnePlusCastThisTurn: true,
      spellSlotActsAvailable: false,
      invalidKind: "none",
      lastResult: "resolvedQuickenedRestoration",
    });
  });

  it("resolves Quickened condition and roll modifier procedure families", () => {
    expect(
      quickenedSpellGovernorProjection(
        resolveQuickenedSaveGatedCondition(initialRuntimeState()),
      ),
    ).toMatchObject({
      colorSprayBlinded: true,
      calmEmotionsImmunity: false,
      invisibilityActive: false,
      blessActive: false,
      magicActionAvailable: true,
      bonusActionAvailable: false,
      sorceryPointsRemaining: INITIAL_SORCERY_POINTS - 2,
      spellSlotCommitted: true,
      levelOnePlusCastThisTurn: true,
      quickenedLevelOnePlusCastThisTurn: true,
      spellSlotActsAvailable: false,
      invalidKind: "none",
      lastResult: "resolvedQuickenedSaveGatedCondition",
    });
    expect(
      quickenedSpellGovernorProjection(
        resolveQuickenedSaveGatedConditionImmunity(initialRuntimeState()),
      ),
    ).toMatchObject({
      colorSprayBlinded: false,
      calmEmotionsImmunity: true,
      invisibilityActive: false,
      blessActive: false,
      magicActionAvailable: true,
      bonusActionAvailable: false,
      sorceryPointsRemaining: INITIAL_SORCERY_POINTS - 2,
      spellSlotCommitted: true,
      levelOnePlusCastThisTurn: true,
      quickenedLevelOnePlusCastThisTurn: true,
      spellSlotActsAvailable: false,
      invalidKind: "none",
      lastResult: "resolvedQuickenedSaveGatedConditionImmunity",
    });
    expect(
      quickenedSpellGovernorProjection(
        resolveQuickenedDirectCondition(initialRuntimeState()),
      ),
    ).toMatchObject({
      colorSprayBlinded: false,
      calmEmotionsImmunity: false,
      invisibilityActive: true,
      blessActive: false,
      magicActionAvailable: true,
      bonusActionAvailable: false,
      sorceryPointsRemaining: INITIAL_SORCERY_POINTS - 2,
      spellSlotCommitted: true,
      levelOnePlusCastThisTurn: true,
      quickenedLevelOnePlusCastThisTurn: true,
      spellSlotActsAvailable: false,
      invalidKind: "none",
      lastResult: "resolvedQuickenedDirectCondition",
    });
    expect(
      quickenedSpellGovernorProjection(
        resolveQuickenedRollModifier(initialRuntimeState()),
      ),
    ).toMatchObject({
      colorSprayBlinded: false,
      calmEmotionsImmunity: false,
      invisibilityActive: false,
      blessActive: true,
      magicActionAvailable: true,
      bonusActionAvailable: false,
      sorceryPointsRemaining: INITIAL_SORCERY_POINTS - 2,
      spellSlotCommitted: true,
      levelOnePlusCastThisTurn: true,
      quickenedLevelOnePlusCastThisTurn: true,
      spellSlotActsAvailable: false,
      invalidKind: "none",
      lastResult: "resolvedQuickenedRollModifier",
    });
  });

  it("allows the Bonus Action rewrite after the Magic action has been spent without casting a level 1+ spell", () => {
    const resolved = resolveQuickenedRestoration({
      battle: magicActionSpent(initialRuntimeState().battle),
      invalidKind: "none",
      lastResult: "init",
    });

    expect(quickenedSpellGovernorProjection(resolved)).toMatchObject({
      magicActionAvailable: false,
      bonusActionAvailable: false,
      sorceryPointsRemaining: INITIAL_SORCERY_POINTS - 2,
      targetHp: QUICKENED_HEALING_RESULT_HP,
      spellSlotCommitted: true,
      quickenedLevelOnePlusCastThisTurn: true,
    });
  });

  it("rejects unknown, unaffordable, unsupported, and same-turn level 1+ Quickened casts", () => {
    expect(
      quickenedSpellGovernorProjection(rejectUnaffordable()),
    ).toMatchObject({
      quickenedCureWoundsOffered: false,
      sorceryPointsRemaining: UNAFFORDABLE_SORCERY_POINTS,
      invalidKind: "unaffordable",
      lastResult: "rejectedUnaffordable",
    });
    expect(
      quickenedSpellGovernorProjection(rejectUnknownOption()),
    ).toMatchObject({
      quickenedCureWoundsOffered: true,
      invalidKind: "unknownOption",
      lastResult: "rejectedUnknownOption",
    });
    expect(
      quickenedSpellGovernorProjection(rejectUnsupportedSecondOption()),
    ).toMatchObject({
      sorceryPointsRemaining: HIGH_SORCERY_POINTS,
      invalidKind: "unsupportedSecondOption",
      lastResult: "rejectedUnsupportedSecondOption",
    });
    expect(quickenedSpellGovernorProjection(rejectOnePerSpell())).toMatchObject(
      {
        sorceryPointsRemaining: HIGH_SORCERY_POINTS,
        invalidKind: "onePerSpell",
        lastResult: "rejectedOnePerSpell",
      },
    );
    expect(
      quickenedSpellGovernorProjection(rejectPriorLevelOnePlusSpell()),
    ).toMatchObject({
      quickenedCureWoundsOffered: false,
      levelOnePlusCastThisTurn: true,
      invalidKind: "sameTurnLevelOnePlus",
      lastResult: "rejectedPriorLevelOnePlusSpell",
    });
  });

  it(
    "matches the focused Quickened Spell governor slice against bounded random MBT traces",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-quickened-spell-governor.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createQuickenedSpellGovernorDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(4),
        stateCheck: quickenedSpellGovernorStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function initialRuntimeState(
  input?: Partial<{
    readonly sorceryPoints: number;
    readonly knownOptions: readonly MetamagicOptionFixture[];
  }>,
): QuickenedSpellGovernorRuntimeState {
  return {
    battle: metamagicBattle(input),
    invalidKind: "none",
    lastResult: "init",
  };
}

function resolveQuickenedRestoration(
  state: QuickenedSpellGovernorRuntimeState,
): QuickenedSpellGovernorRuntimeState {
  const act = quickenedCureWoundsAct(state.battle);
  expect(act.subject).toEqual(quickenedCureWoundsSubject());
  const targetHole = findHole(act.initialHoles, "targetChoice");
  const target = targetFill(targetHole, fighterId, [
    {
      kind: "spellTarget",
      casterId: wizardId,
      targetId: fighterId,
      spellId: "cure_wounds",
    },
  ]);
  const awaitingHealingRoll = resolveBattleSubject({
    state: state.battle,
    subject: act.subject,
    fills: [target],
  });
  const healingRoll = findHole(
    awaitingHealingRoll.tag === "needsHoles" ? awaitingHealingRoll.holes : [],
    "rolledDice",
  );
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [target, damageRollFillWithGroups(healingRoll, [[4, 3]])],
    }),
  );
  return {
    battle: resolved.state,
    invalidKind: "none",
    lastResult: "resolvedQuickenedRestoration",
  };
}

function resolveQuickenedSaveGatedCondition(
  state: QuickenedSpellGovernorRuntimeState,
): QuickenedSpellGovernorRuntimeState {
  const act = quickenedSpellAct(state.battle, "color_spray");
  const saveHole = findHole(act.initialHoles, "savingThrowOutcome");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(saveHole, [
          { targetId: skeletonId, succeeded: false },
        ]),
      ],
    }),
  );
  return {
    battle: resolved.state,
    invalidKind: "none",
    lastResult: "resolvedQuickenedSaveGatedCondition",
  };
}

function resolveQuickenedSaveGatedConditionImmunity(
  state: QuickenedSpellGovernorRuntimeState,
): QuickenedSpellGovernorRuntimeState {
  const act = quickenedSpellAct(state.battle, "calm_emotions");
  const saveHole = findHole(act.initialHoles, "savingThrowOutcome");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(saveHole, [
          { targetId: fighterId, succeeded: false },
        ]),
      ],
    }),
  );
  return {
    battle: resolved.state,
    invalidKind: "none",
    lastResult: "resolvedQuickenedSaveGatedConditionImmunity",
  };
}

function resolveQuickenedDirectCondition(
  state: QuickenedSpellGovernorRuntimeState,
): QuickenedSpellGovernorRuntimeState {
  const act = quickenedSpellAct(state.battle, "invisibility");
  const targetHole = findSpellTargetListHole(act.initialHoles);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [spellTargetListFill(targetHole, "invisibility", [fighterId])],
    }),
  );
  return {
    battle: resolved.state,
    invalidKind: "none",
    lastResult: "resolvedQuickenedDirectCondition",
  };
}

function resolveQuickenedRollModifier(
  state: QuickenedSpellGovernorRuntimeState,
): QuickenedSpellGovernorRuntimeState {
  const act = quickenedSpellAct(state.battle, "bless");
  const targetHole = findSpellTargetListHole(act.initialHoles);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle,
      subject: act.subject,
      fills: [spellTargetListFill(targetHole, "bless", [fighterId])],
    }),
  );
  return {
    battle: resolved.state,
    invalidKind: "none",
    lastResult: "resolvedQuickenedRollModifier",
  };
}

function rejectUnaffordable(): QuickenedSpellGovernorRuntimeState {
  const state = initialRuntimeState({
    sorceryPoints: UNAFFORDABLE_SORCERY_POINTS,
  });
  expect(hasQuickenedCureWoundsAct(state.battle)).toBe(false);
  expectInvalid(
    resolveBattleSubject({
      state: state.battle,
      subject: quickenedCureWoundsSubject(),
      fills: [],
    }),
    "Metamagic requires enough unexpended Sorcery Points.",
  );
  return {
    battle: state.battle,
    invalidKind: "unaffordable",
    lastResult: "rejectedUnaffordable",
  };
}

function rejectUnknownOption(): QuickenedSpellGovernorRuntimeState {
  const state = initialRuntimeState({
    knownOptions: [quickenedMetamagicOption()],
  });
  expect(hasQuickenedCureWoundsAct(state.battle)).toBe(true);
  expectInvalid(
    resolveBattleSubject({
      state: state.battle,
      subject: {
        ...quickenedCureWoundsSubject(),
        metamagic: [{ effectKind: "saving_throw_disadvantage" }],
      },
      fills: [],
    }),
    "Metamagic selection must be one of the actor's known Metamagic options.",
  );
  return {
    battle: state.battle,
    invalidKind: "unknownOption",
    lastResult: "rejectedUnknownOption",
  };
}

function rejectUnsupportedSecondOption(): QuickenedSpellGovernorRuntimeState {
  const state = initialRuntimeState({
    sorceryPoints: HIGH_SORCERY_POINTS,
    knownOptions: [quickenedMetamagicOption(), empoweredMetamagicOption()],
  });
  expectInvalid(
    resolveBattleSubject({
      state: state.battle,
      subject: {
        ...quickenedCureWoundsSubject(),
        metamagic: [
          { effectKind: QUICKENED_METAMAGIC_EFFECT_KIND },
          { effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND },
        ],
      },
      fills: [],
    }),
    "Selected Metamagic option effect is not supported for this spell procedure.",
  );
  return {
    battle: state.battle,
    invalidKind: "unsupportedSecondOption",
    lastResult: "rejectedUnsupportedSecondOption",
  };
}

function rejectOnePerSpell(): QuickenedSpellGovernorRuntimeState {
  const state = initialRuntimeState({
    sorceryPoints: HIGH_SORCERY_POINTS,
    knownOptions: [quickenedMetamagicOption(), heightenedMetamagicOption()],
  });
  expectInvalid(
    resolveBattleSubject({
      state: state.battle,
      subject: {
        ...quickenedCureWoundsSubject(),
        metamagic: [
          { effectKind: QUICKENED_METAMAGIC_EFFECT_KIND },
          { effectKind: "saving_throw_disadvantage" },
        ],
      },
      fills: [],
    }),
    "A spell can use only one Metamagic option unless one selected option explicitly combines with a different Metamagic option.",
  );
  return {
    battle: state.battle,
    invalidKind: "onePerSpell",
    lastResult: "rejectedOnePerSpell",
  };
}

function rejectPriorLevelOnePlusSpell(): QuickenedSpellGovernorRuntimeState {
  const base = initialRuntimeState();
  const state: QuickenedSpellGovernorRuntimeState = {
    battle: {
      ...base.battle,
      currentTurnResources: {
        ...base.battle.currentTurnResources,
        levelOnePlusSpellCastsThisTurn: [wizardId],
      },
    },
    invalidKind: "none",
    lastResult: "init",
  };
  expect(hasQuickenedCureWoundsAct(state.battle)).toBe(false);
  expectInvalid(
    resolveBattleSubject({
      state: state.battle,
      subject: quickenedCureWoundsSubject(),
      fills: [],
    }),
    "Quickened Spell cannot modify a spell after this turn has already cast a level 1+ spell.",
  );
  return {
    battle: state.battle,
    invalidKind: "sameTurnLevelOnePlus",
    lastResult: "rejectedPriorLevelOnePlusSpell",
  };
}

function quickenedSpellGovernorProjection(
  state: QuickenedSpellGovernorRuntimeState,
): QuickenedSpellGovernorProjection {
  const resources = state.battle.currentTurnResources;
  const skeleton = state.battle.combatants.get(skeletonId);
  return {
    quickenedCureWoundsOffered: hasQuickenedCureWoundsAct(state.battle),
    colorSprayBlinded:
      skeleton === undefined
        ? false
        : hasCondition(skeleton.conditions, "blinded"),
    calmEmotionsImmunity:
      state.battle.combatants
        .get(fighterId)
        ?.activeEffects.some((effect) => effect.kind === "conditionImmunity") ??
      false,
    invisibilityActive:
      state.battle.combatants
        .get(fighterId)
        ?.activeEffects.some(
          (effect) => effect.kind === "targetActionEndedSpellCondition",
        ) ?? false,
    blessActive:
      state.battle.combatants
        .get(fighterId)
        ?.activeEffects.some((effect) => effect.kind === "d20RollModifier") ??
      false,
    magicActionAvailable: canSpendAction(resources, "magic"),
    bonusActionAvailable: resources.currentHasBonusAction,
    sorceryPointsRemaining: Number(sorceryPointsRemaining(state.battle)),
    targetHp: state.battle.combatants.get(fighterId)?.hp ?? 0,
    spellSlotCommitted: resources.spellSlotUsesThisTurn.some(
      (use) => use.kind === "committed" && use.combatantId === wizardId,
    ),
    levelOnePlusCastThisTurn:
      resources.levelOnePlusSpellCastsThisTurn.includes(wizardId),
    quickenedLevelOnePlusCastThisTurn:
      resources.quickenedLevelOnePlusSpellCastsThisTurn.includes(wizardId),
    spellSlotActsAvailable: discoverBattleActs(state.battle).some(
      (candidate) =>
        "invocation" in candidate.subject &&
        candidate.subject.invocation.tag === "spellSlot",
    ),
    invalidKind: state.invalidKind,
    lastResult: state.lastResult,
  };
}

function metamagicBattle(input?: {
  readonly sorceryPoints?: number;
  readonly knownOptions?: readonly MetamagicOptionFixture[];
}): BattleState {
  return startBattleRight({
    battleId: battleId("battle:quickened-spell-governor-mbt"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Sorcerer",
        initiative: 20,
        side: partySide,
        attack: null,
        classLevels: [{ className: "sorcerer", level: 5 }],
        resources: [
          {
            unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
            pointsRemaining: resourceCount(
              input?.sorceryPoints ?? INITIAL_SORCERY_POINTS,
            ),
          },
        ],
        metamagic: {
          sorceryPointResourceUnitId: "sorcerer_font_of_magic",
          spellUseLimit: "one_per_spell_unless_option_allows_stacking",
          knownOptions: input?.knownOptions ?? [
            quickenedMetamagicOption(),
            empoweredMetamagicOption(),
          ],
        },
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: [
              spellRecord("cure_wounds"),
              spellRecord("color_spray"),
              spellRecord("calm_emotions"),
              spellRecord("invisibility"),
              spellRecord("bless"),
            ],
            spellSlots: [
              { spellLevel: 1, count: 2 },
              { spellLevel: 2, count: 2 },
            ],
          }),
          sourceClassName: "sorcerer",
        },
      }),
      characterSeed({
        combatantId: fighterId,
        displayName: "Wounded Ally",
        initiative: 10,
        side: partySide,
        currentHp: INITIAL_TARGET_HP,
        maxHp: 20,
      }),
      statBlockCreatureInit({
        combatantId: skeletonId,
        displayName: "Skeleton",
        initiative: 5,
      }),
    ],
  });
}

function magicActionSpent(state: BattleState): BattleState {
  return {
    ...state,
    currentTurnResources: expectRight(
      spendAction(state.currentTurnResources, "magic"),
    ),
  };
}

function quickenedMetamagicOption(): MetamagicOptionFixture {
  return {
    effectKind: QUICKENED_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(2),
  };
}

function empoweredMetamagicOption(): MetamagicOptionFixture {
  return {
    effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND,
    stackingMode: "can_combine_with_different_metamagic",
    sorceryPointCost: resourceCount(1),
  };
}

function heightenedMetamagicOption(): MetamagicOptionFixture {
  return {
    effectKind: "saving_throw_disadvantage",
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(2),
  };
}

type QuickenedBonusActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "bonusActionSpell" }
  >;
};

function quickenedCureWoundsAct(
  state: BattleState,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(state).find(isQuickenedCureWoundsAct);
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error("Expected Quickened Cure Wounds act.");
  }
  return act;
}

function hasQuickenedCureWoundsAct(state: BattleState): boolean {
  return discoverBattleActs(state).some(isQuickenedCureWoundsAct);
}

function isQuickenedCureWoundsAct(
  candidate: AvailableBattleAct,
): candidate is QuickenedBonusActionSpellAct {
  return (
    candidate.subject.tag === "bonusActionSpell" &&
    candidate.subject.invocation.spellId === "cure_wounds" &&
    candidate.subject.metamagic?.some(
      (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function quickenedCureWoundsSubject(): QuickenedBonusActionSpellAct["subject"] {
  return {
    tag: "bonusActionSpell",
    actorId: wizardId,
    invocation: spellSlotInvocationRef(
      "cure_wounds",
      1,
      "directHitPointRestoration",
    ),
    mode: { tag: "cast" },
    metamagic: QUICKENED_SPELL_METAMAGIC_SELECTION,
  };
}

type QuickenedSpellId =
  | "bless"
  | "calm_emotions"
  | "color_spray"
  | "invisibility";

function quickenedSpellAct(
  state: BattleState,
  spellId: QuickenedSpellId,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is QuickenedBonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.spellId === spellId &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(`Expected Quickened ${spellId} act.`);
  }
  return act;
}

function findSpellTargetListHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "spellTargetList" }> {
  const hole = findHole(holes, "spellTargetList");
  if (hole.kind !== "spellTargetList") {
    throw new Error("Expected spellTargetList hole.");
  }
  return hole;
}

function spellTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  spellId: "bless" | "invisibility",
  targetIds: readonly CombatantId[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: targetIds.map((targetId) => ({
      kind: "spellTarget",
      casterId: wizardId,
      targetId,
      spellId,
    })),
  };
}

function sorceryPointsRemaining(state: BattleState) {
  const actor = state.combatants.get(wizardId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected Sorcerer combatant.");
  }
  const resource = actor.origin.resources.find(
    characterBattleResourceIsPointPool,
  );
  if (resource === undefined) {
    throw new Error("Expected Sorcery Point resource.");
  }
  return resource.pointsRemaining;
}

function expectInvalid(result: BattleResolutionResult, message: string): void {
  expect(result).toMatchObject({ tag: "invalid", message });
}

function expectRight<T, E>(result: Either.Either<T, E>): T {
  if (Either.isLeft(result)) {
    throw new Error(`Expected Right, got ${JSON.stringify(result.left)}`);
  }
  return result.right;
}

function normalizeQuickenedSpellGovernorQuintState(
  raw: unknown,
): QuickenedSpellGovernorProjection {
  const state = quintStateRecord(raw);
  return {
    quickenedCureWoundsOffered: booleanField(
      state,
      "qQuickenedCureWoundsOffered",
    ),
    colorSprayBlinded: booleanField(state, "qColorSprayBlinded"),
    calmEmotionsImmunity: booleanField(state, "qCalmEmotionsImmunity"),
    invisibilityActive: booleanField(state, "qInvisibilityActive"),
    blessActive: booleanField(state, "qBlessActive"),
    magicActionAvailable: booleanField(state, "qMagicActionAvailable"),
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    sorceryPointsRemaining: numberFromQuintInt(
      state["qSorceryPointsRemaining"],
      "qSorceryPointsRemaining",
    ),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    spellSlotCommitted: booleanField(state, "qSpellSlotCommitted"),
    levelOnePlusCastThisTurn: booleanField(state, "qLevelOnePlusCastThisTurn"),
    quickenedLevelOnePlusCastThisTurn: booleanField(
      state,
      "qQuickenedLevelOnePlusCastThisTurn",
    ),
    spellSlotActsAvailable: booleanField(state, "qSpellSlotActsAvailable"),
    invalidKind: invalidKind(state["qInvalidKind"]),
    lastResult: lastResult(state["qLastResult"]),
  };
}

function compareQuickenedSpellGovernorStates(
  runtime: QuickenedSpellGovernorProjection,
  quint: QuickenedSpellGovernorProjection,
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

function invalidKind(raw: unknown): InvalidKind {
  if (typeof raw === "string" && INVALID_KIND_SET.has(raw)) {
    return raw as InvalidKind;
  }
  throw new Error(`Unknown Quickened Spell invalid kind: ${String(raw)}.`);
}

function lastResult(raw: unknown): LastResult {
  if (typeof raw === "string" && LAST_RESULT_SET.has(raw)) {
    return raw as LastResult;
  }
  throw new Error(`Unknown Quickened Spell result: ${String(raw)}.`);
}
