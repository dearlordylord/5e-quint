import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleProcedureExecutionRefForTest,
  battleFrontierInterruptDecisionForState,
  characterSpellInvocationRefForProcedureRefForTest,
  requireCharacterSpellProcedureRefForTest,
} from "./battle-runtime.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { battleRuntimeSessionWithState } from "./battle-runtime-context.ts";
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
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Counterspell:
//   Counterspell makes the caster roll a Constitution save; on failure the
//   spell has no effect and its Spell Slot is not expended.
// - .references/srd-5.2.1/Rules-Glossary.md#Concentration:
//   a creature maintains at most one Concentration effect at a time.
// - UBIQUITOUS_LANGUAGE.md: Magic Action, Bonus Action, Reaction, Saving
//   Throw, Spell Effect, Spell Slot, Concentration, Decline, Sorcery Points
//   as a Pool, and Spend.
import {
  canSpendAction,
  spendAction,
} from "@dnd/shared-algebras/action-economy-algebra";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { movementFeet, resourceCount } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import * as Result from "effect/Result";
import { describe, expect, it } from "vitest";

import { combatantEffectiveSize } from "./battle-reducer/druid-wild-shape.ts";
import {
  EMPOWERED_METAMAGIC_EFFECT_KIND,
  QUICKENED_METAMAGIC_EFFECT_KIND,
  QUICKENED_SPELL_METAMAGIC_SELECTION,
} from "./battle-reducer/metamagic.ts";
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
  quintVariantMappedValue,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import {
  attackRollFill,
  battleId,
  characterSeed,
  damageRollFillWithGroups,
  fighterId,
  findHole,
  interruptDecisionFill,
  requireResolved,
  savingThrowOutcomeFill,
  skeletonId,
  spellRecord,
  startBattleSessionRight,
  statBlockCreatureInit,
  targetFill,
  unitLibrary,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import { enlargeReduceUnitId } from "./unit-profile-admission-catalog.test-support.ts";
import {
  knownWillingSpellTargetFill,
  knownWillingSpellTargetListFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  type AvailableBattleAct,
  type BattleFill,
  type BattleHole,
  type BattleInterruptSubject,
  type BattleInterruptProcedureChoice,
  type BattleReducerRouteEvent,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  type BattleState,
  type CharacterBattleMetamagicOptionFact,
  type CombatantId,
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
  battleReducerStartRouteEvent,
  characterBattleResourceIsPointPool,
  discoverBattleActs,
  resolveBattleInterrupt,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./index.ts";

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

type LastResult =
  | "init"
  | "resolvedQuickenedRestoration"
  | "resolvedQuickenedSaveGatedCondition"
  | "resolvedQuickenedSaveGatedConditionImmunity"
  | "resolvedQuickenedDirectCondition"
  | "resolvedQuickenedRollModifier"
  | "resolvedQuickenedCreatureSizeChange"
  | "resolvedAfterMagicActionSpent"
  | "counteredQuickenedConcentration"
  | "counteredQuickenedNonConcentrationWithPriorConcentration"
  | "resolvedQuickenedConcentrationAfterCounterspellDeclined"
  | "resolvedQuickenedConcentrationAfterCounterspellFailed"
  | "rejectedUnaffordable"
  | "rejectedUnknownOption"
  | "rejectedUnsupportedSecondOption"
  | "rejectedOnePerSpell"
  | "rejectedPriorLevelOnePlusSpell";
const LAST_RESULT_BY_SCENARIO_OUTCOME_TAG = {
  Init: "init",
  ResolvedQuickenedRestoration: "resolvedQuickenedRestoration",
  ResolvedQuickenedSaveGatedCondition: "resolvedQuickenedSaveGatedCondition",
  ResolvedQuickenedSaveGatedConditionImmunity:
    "resolvedQuickenedSaveGatedConditionImmunity",
  ResolvedQuickenedDirectCondition: "resolvedQuickenedDirectCondition",
  ResolvedQuickenedRollModifier: "resolvedQuickenedRollModifier",
  ResolvedQuickenedCreatureSizeChange: "resolvedQuickenedCreatureSizeChange",
  ResolvedAfterMagicActionSpent: "resolvedAfterMagicActionSpent",
  CounteredQuickenedConcentration: "counteredQuickenedConcentration",
  CounteredQuickenedNonConcentrationWithPriorConcentration:
    "counteredQuickenedNonConcentrationWithPriorConcentration",
  ResolvedQuickenedConcentrationAfterCounterspellDeclined:
    "resolvedQuickenedConcentrationAfterCounterspellDeclined",
  ResolvedQuickenedConcentrationAfterCounterspellFailed:
    "resolvedQuickenedConcentrationAfterCounterspellFailed",
  RejectedUnaffordable: "rejectedUnaffordable",
  RejectedUnknownOption: "rejectedUnknownOption",
  RejectedUnsupportedSecondOption: "rejectedUnsupportedSecondOption",
  RejectedOnePerSpell: "rejectedOnePerSpell",
  RejectedPriorLevelOnePlusSpell: "rejectedPriorLevelOnePlusSpell",
} as const satisfies Readonly<Record<string, LastResult>>;

type QuickenedSpellGovernorProjection = {
  readonly quickenedCureWoundsOffered: boolean;
  readonly colorSprayBlinded: boolean;
  readonly calmEmotionsImmunity: boolean;
  readonly invisibilityActive: boolean;
  readonly blessActive: boolean;
  readonly creatureSizeIncreased: boolean;
  readonly magicActionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly sorceryPointsRemaining: number;
  readonly targetHp: number;
  readonly spellSlotCommitted: boolean;
  readonly levelOnePlusCastThisTurn: boolean;
  readonly quickenedLevelOnePlusCastThisTurn: boolean;
  readonly spellSlotActsAvailable: boolean;
  readonly casterConcentrating: boolean;
  readonly invalidKind: InvalidKind;
  readonly lastResult: LastResult;
};

type QuickenedSpellGovernorRuntimeState = {
  readonly battle: BattleRuntimeSession;
  readonly invalidKind: InvalidKind;
  readonly lastResult: LastResult;
};

type MetamagicOptionFixture = CharacterBattleMetamagicOptionFact;

type MetamagicBattleInput = {
  readonly sorceryPoints?: number;
  readonly knownOptions?: readonly MetamagicOptionFixture[];
  readonly preparedSpellIds?: readonly SpellRecord["id"][];
  readonly casterSpellSlots?: readonly {
    readonly spellLevel: 1 | 2 | 3 | 4 | 5;
    readonly count: number;
  }[];
  readonly spellCastInterruptionReactioner?: true;
};

const INITIAL_SORCERY_POINTS = 4;
const HIGH_SORCERY_POINTS = 5;
const UNAFFORDABLE_SORCERY_POINTS = 1;
const INITIAL_TARGET_HP = 4;
const QUICKENED_HEALING_RESULT_HP = 14;
type CounterspellOutcome = "success" | "decline" | "failure";
const CONCENTRATION_COUNTERSPELL_LAST_RESULT = {
  success: "counteredQuickenedConcentration",
  decline: "resolvedQuickenedConcentrationAfterCounterspellDeclined",
  failure: "resolvedQuickenedConcentrationAfterCounterspellFailed",
} as const satisfies Readonly<Record<CounterspellOutcome, LastResult>>;

const driverSchema = {
  init: {},
  doResolveQuickenedRestoration: {},
  doResolveQuickenedSaveGatedCondition: {},
  doResolveQuickenedSaveGatedConditionImmunity: {},
  doResolveQuickenedDirectCondition: {},
  doResolveQuickenedRollModifier: {},
  doResolveQuickenedCreatureSizeChange: {},
  doResolveQuickenedAfterMagicActionSpent: {},
  doCounterQuickenedConcentration: {},
  doCounterQuickenedNonConcentrationWithPriorConcentration: {},
  doResolveQuickenedConcentrationAfterCounterspellDeclined: {},
  doResolveQuickenedConcentrationAfterCounterspellFailed: {},
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
      doResolveQuickenedCreatureSizeChange: () => {
        state = resolveQuickenedCreatureSizeChange();
      },
      doResolveQuickenedAfterMagicActionSpent: () => {
        state = resolveQuickenedRestoration({
          battle: withMagicActionSpent(initialRuntimeState().battle),
          invalidKind: "none",
          lastResult: "init",
        });
        state = { ...state, lastResult: "resolvedAfterMagicActionSpent" };
      },
      doCounterQuickenedConcentration: () => {
        state = resolveQuickenedConcentrationCounterspell("success");
      },
      doCounterQuickenedNonConcentrationWithPriorConcentration: () => {
        state = resolveQuickenedNonConcentrationCounterspellWithPriorBless();
      },
      doResolveQuickenedConcentrationAfterCounterspellDeclined: () => {
        state = resolveQuickenedConcentrationCounterspell("decline");
      },
      doResolveQuickenedConcentrationAfterCounterspellFailed: () => {
        state = resolveQuickenedConcentrationCounterspell("failure");
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

  it("resolves Quickened creature size-change procedures", () => {
    expect(
      quickenedSpellGovernorProjection(resolveQuickenedCreatureSizeChange()),
    ).toMatchObject({
      creatureSizeIncreased: true,
      magicActionAvailable: true,
      bonusActionAvailable: false,
      sorceryPointsRemaining: INITIAL_SORCERY_POINTS - 2,
      spellSlotCommitted: true,
      levelOnePlusCastThisTurn: true,
      quickenedLevelOnePlusCastThisTurn: true,
      spellSlotActsAvailable: false,
      invalidKind: "none",
      lastResult: "resolvedQuickenedCreatureSizeChange",
    });
  });

  it("allows the Bonus Action rewrite after the Magic action has been spent without casting a level 1+ spell", () => {
    const resolved = resolveQuickenedRestoration({
      battle: withMagicActionSpent(initialRuntimeState().battle),
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
      spellSlotActsAvailable: false,
    });
  });

  it("observes the copied quickened qRoute through public reducer entrypoints", () => {
    const session = initialRuntimeState().battle;
    const act = quickenedRayOfFrostAct(session);
    const targetHole = findHole(act.initialHoles, "targetChoice");
    const target = targetFill(targetHole, skeletonId);
    const awaitingAttackRoll = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [target],
    });
    const attackRollHole = findHole(
      awaitingAttackRoll.tag === "needsHoles" ? awaitingAttackRoll.holes : [],
      "attackRoll",
    );
    const attackRoll = attackRollFill(attackRollHole, {
      total: 15,
      naturalD20: 10,
    });
    const awaitingDamageRoll = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [target, attackRoll],
    });
    const damageRollHole = findHole(
      awaitingDamageRoll.tag === "needsHoles" ? awaitingDamageRoll.holes : [],
      "rolledDice",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [
          target,
          attackRoll,
          damageRollFillWithGroups(damageRollHole, [[4, 3]]),
        ],
      }),
    );
    const observedRoute = [
      battleReducerStartRouteEvent(),
      ...(act.routeEvents ?? []),
      ...(awaitingAttackRoll.routeEvents ?? []),
      ...(awaitingDamageRoll.routeEvents ?? []),
      ...(resolved.routeEvents ?? []),
    ];

    expect(observedRoute).toEqual([
      { kind: "startBattle", owner: "battleActionEconomy" },
      {
        kind: "discoverBattleActs",
        subject: "metamagicBonusActionCastingTime",
        holes: ["targetChoice"],
        owner: "battleFeatureResource",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "metamagicBonusActionCastingTime",
        holes: ["targetChoice"],
        owner: "battleActionEconomy",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "metamagicBonusActionCastingTime",
        holes: ["targetChoice"],
        owner: "battleSpellSlotAndActionEconomy",
      },
      {
        kind: "resolveBattleSubject",
        subject: "metamagicBonusActionCastingTime",
        fill: "targetChoice",
        holes: ["attackRoll"],
        owner: "battleTargetSelection",
      },
      {
        kind: "resolveBattleSubject",
        subject: "metamagicBonusActionCastingTime",
        fill: "attackRoll",
        holes: ["rolledDice"],
        owner: "battleSpellAttackProcedure",
      },
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "metamagicBonusActionCastingTime",
        holes: [],
        owner: "battleTurnBoundary",
      },
    ]);
  });

  it("observes copied quickened successful branch qRoutes through public reducer entrypoints", () => {
    const base = initialRuntimeState().battle;

    expect(observeQuickenedRestorationRoute(base)).toEqual(
      quickenedRestorationPublicRoute(),
    );
    expect(
      observeQuickenedRestorationRoute(withMagicActionSpent(base)),
    ).toEqual(quickenedRestorationPublicRoute());
    expect(observeQuickenedSaveGatedRoute("color_spray", skeletonId)).toEqual(
      quickenedSaveGatedPublicRoute("battleActiveEffect"),
    );
    expect(observeQuickenedSaveGatedRoute("calm_emotions", fighterId)).toEqual(
      quickenedSaveGatedPublicRoute("battleActiveEffect"),
    );
    expect(observeQuickenedTargetListRoute("invisibility")).toEqual(
      quickenedTargetListActiveEffectPublicRoute(),
    );
    expect(observeQuickenedTargetListRoute("bless")).toEqual(
      quickenedTargetListActiveEffectPublicRoute(),
    );
  });

  it("observes copied quickened rejection qRoutes through public reducer entrypoints", () => {
    const unaffordableState = initialRuntimeState({
      sorceryPoints: UNAFFORDABLE_SORCERY_POINTS,
    }).battle;
    expect(
      invalidQuickenedRoute({
        session: unaffordableState,
        subject: quickenedCureWoundsSubject(unaffordableState),
      }),
    ).toEqual(quickenedResourceGovernorRoute());
    const unknownOptionState = initialRuntimeState({
      knownOptions: [quickenedMetamagicOption()],
    }).battle;
    expect(
      invalidQuickenedRoute({
        session: unknownOptionState,
        subject: {
          ...quickenedCureWoundsSubject(unknownOptionState),
          metamagic: [{ effectKind: "saving_throw_disadvantage" }],
        },
      }),
    ).toEqual(quickenedResourceGovernorRoute());
    const duplicateStackingState = initialRuntimeState({
      sorceryPoints: HIGH_SORCERY_POINTS,
      knownOptions: [quickenedMetamagicOption(), empoweredMetamagicOption()],
    }).battle;
    expect(
      invalidQuickenedRoute({
        session: duplicateStackingState,
        subject: {
          ...quickenedCureWoundsSubject(duplicateStackingState),
          metamagic: [
            { effectKind: QUICKENED_METAMAGIC_EFFECT_KIND },
            { effectKind: EMPOWERED_METAMAGIC_EFFECT_KIND },
          ],
        },
      }),
    ).toEqual(quickenedResourceGovernorRoute());
    const incompatibleStackingState = initialRuntimeState({
      sorceryPoints: HIGH_SORCERY_POINTS,
      knownOptions: [quickenedMetamagicOption(), heightenedMetamagicOption()],
    }).battle;
    expect(
      invalidQuickenedRoute({
        session: incompatibleStackingState,
        subject: {
          ...quickenedCureWoundsSubject(incompatibleStackingState),
          metamagic: [
            { effectKind: QUICKENED_METAMAGIC_EFFECT_KIND },
            { effectKind: "saving_throw_disadvantage" },
          ],
        },
      }),
    ).toEqual(quickenedResourceGovernorRoute());

    const priorLevelOnePlusBase = initialRuntimeState().battle;
    const priorLevelOnePlusState = battleRuntimeSessionForTest({
      ...priorLevelOnePlusBase,
      state: {
        ...priorLevelOnePlusBase.state,
        currentTurnResources: {
          ...priorLevelOnePlusBase.state.currentTurnResources,
          levelOnePlusSpellCastsThisTurn: [wizardId],
        },
      },
    });
    expect(
      invalidQuickenedRoute({
        session: priorLevelOnePlusState,
        subject: quickenedCureWoundsSubject(priorLevelOnePlusState),
      }),
    ).toEqual([
      battleReducerStartRouteEvent(),
      {
        kind: "resolveBattleSubjectWithoutFill",
        subject: "metamagicBonusActionCastingTime",
        holes: [],
        owner: "battleTurnBoundary",
      },
    ]);
  });

  it("rejects unknown, unaffordable, unsupported, and same-turn level 1+ Quickened casts", () => {
    expect(
      quickenedSpellGovernorProjection(rejectUnaffordable()),
    ).toMatchObject({
      quickenedCureWoundsOffered: false,
      sorceryPointsRemaining: UNAFFORDABLE_SORCERY_POINTS,
      spellSlotActsAvailable: true,
      invalidKind: "unaffordable",
      lastResult: "rejectedUnaffordable",
    });
    expect(
      quickenedSpellGovernorProjection(rejectUnknownOption()),
    ).toMatchObject({
      quickenedCureWoundsOffered: true,
      spellSlotActsAvailable: true,
      invalidKind: "unknownOption",
      lastResult: "rejectedUnknownOption",
    });
    expect(
      quickenedSpellGovernorProjection(rejectUnsupportedSecondOption()),
    ).toMatchObject({
      sorceryPointsRemaining: HIGH_SORCERY_POINTS,
      spellSlotActsAvailable: true,
      invalidKind: "unsupportedSecondOption",
      lastResult: "rejectedUnsupportedSecondOption",
    });
    expect(quickenedSpellGovernorProjection(rejectOnePerSpell())).toMatchObject(
      {
        sorceryPointsRemaining: HIGH_SORCERY_POINTS,
        spellSlotActsAvailable: true,
        invalidKind: "onePerSpell",
        lastResult: "rejectedOnePerSpell",
      },
    );
    expect(
      quickenedSpellGovernorProjection(rejectPriorLevelOnePlusSpell()),
    ).toMatchObject({
      quickenedCureWoundsOffered: false,
      levelOnePlusCastThisTurn: true,
      spellSlotActsAvailable: true,
      invalidKind: "sameTurnLevelOnePlus",
      lastResult: "rejectedPriorLevelOnePlusSpell",
    });
  });

  it("connects Quickened Spell commitments and Concentration across Counterspell outcomes", () => {
    expect(
      quickenedSpellGovernorProjection(
        resolveQuickenedConcentrationCounterspell("success"),
      ),
    ).toMatchObject({
      blessActive: false,
      bonusActionAvailable: false,
      sorceryPointsRemaining: INITIAL_SORCERY_POINTS - 2,
      spellSlotCommitted: false,
      levelOnePlusCastThisTurn: false,
      quickenedLevelOnePlusCastThisTurn: true,
      spellSlotActsAvailable: false,
      casterConcentrating: false,
      lastResult: "counteredQuickenedConcentration",
    });
    expect(
      quickenedSpellGovernorProjection(
        resolveQuickenedNonConcentrationCounterspellWithPriorBless(),
      ),
    ).toMatchObject({
      blessActive: true,
      bonusActionAvailable: false,
      sorceryPointsRemaining: INITIAL_SORCERY_POINTS - 2,
      targetHp: INITIAL_TARGET_HP,
      spellSlotCommitted: false,
      levelOnePlusCastThisTurn: false,
      quickenedLevelOnePlusCastThisTurn: true,
      spellSlotActsAvailable: false,
      casterConcentrating: true,
      lastResult: "counteredQuickenedNonConcentrationWithPriorConcentration",
    });
    expect(
      quickenedSpellGovernorProjection(
        resolveQuickenedConcentrationCounterspell("decline"),
      ),
    ).toMatchObject({
      blessActive: true,
      bonusActionAvailable: false,
      sorceryPointsRemaining: INITIAL_SORCERY_POINTS - 2,
      spellSlotCommitted: true,
      levelOnePlusCastThisTurn: true,
      quickenedLevelOnePlusCastThisTurn: true,
      spellSlotActsAvailable: false,
      casterConcentrating: true,
      lastResult: "resolvedQuickenedConcentrationAfterCounterspellDeclined",
    });
    expect(
      quickenedSpellGovernorProjection(
        resolveQuickenedConcentrationCounterspell("failure"),
      ),
    ).toMatchObject({
      blessActive: true,
      bonusActionAvailable: false,
      sorceryPointsRemaining: INITIAL_SORCERY_POINTS - 2,
      spellSlotCommitted: true,
      levelOnePlusCastThisTurn: true,
      quickenedLevelOnePlusCastThisTurn: true,
      spellSlotActsAvailable: false,
      casterConcentrating: true,
      lastResult: "resolvedQuickenedConcentrationAfterCounterspellFailed",
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
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(4),
        stateCheck: quickenedSpellGovernorStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function initialRuntimeState(
  input?: MetamagicBattleInput,
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
  const targetHole = findHole(act.initialHoles, "targetChoice");
  const target = targetFill(targetHole, fighterId, [
    {
      kind: "spellTarget",
      casterId: wizardId,
      targetId: fighterId,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("cure_wounds"),
      ),
    },
  ]);
  const awaitingHealingRoll = resolveBattleSubject({
    state: state.battle.state,
    subject: act.subject,
    fills: [target],
  });
  const healingRoll = findHole(
    awaitingHealingRoll.tag === "needsHoles" ? awaitingHealingRoll.holes : [],
    "rolledDice",
  );
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle.state,
      subject: act.subject,
      fills: [target, damageRollFillWithGroups(healingRoll, [[4, 3]])],
    }),
  );
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
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
      state: state.battle.state,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(saveHole, [
          { targetId: skeletonId, succeeded: false },
        ]),
      ],
    }),
  );
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
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
      state: state.battle.state,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(saveHole, [
          { targetId: fighterId, succeeded: false },
        ]),
      ],
    }),
  );
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
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
      state: state.battle.state,
      subject: act.subject,
      fills: [spellTargetListFill(targetHole, "invisibility", [fighterId])],
    }),
  );
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
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
      state: state.battle.state,
      subject: act.subject,
      fills: [spellTargetListFill(targetHole, "bless", [fighterId])],
    }),
  );
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: resolved.state,
    }),
    invalidKind: "none",
    lastResult: "resolvedQuickenedRollModifier",
  };
}

function resolveQuickenedCreatureSizeChange(): QuickenedSpellGovernorRuntimeState {
  const state: QuickenedSpellGovernorRuntimeState = {
    battle: metamagicBattle({
      preparedSpellIds: [parseSharedUnitId(enlargeReduceUnitId)],
    }),
    invalidKind: "none",
    lastResult: "init",
  };
  const act = quickenedCreatureSizeChangeAct(state.battle);
  const targetHole = findHole(act.initialHoles, "targetChoice");
  if (targetHole.kind !== "targetChoice") {
    throw new Error("Expected Quickened creature size-change target hole.");
  }
  const resolved = requireResolved(
    resolveBattleSubject({
      state: state.battle.state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          targetHole,
          enlargeReduceUnitId,
          wizardId,
          fighterId,
        ),
      ],
    }),
  );
  return {
    battle: battleRuntimeSessionWithState(state.battle, resolved.state),
    invalidKind: "none",
    lastResult: "resolvedQuickenedCreatureSizeChange",
  };
}

function resolveQuickenedConcentrationCounterspell(
  outcome: CounterspellOutcome,
): QuickenedSpellGovernorRuntimeState {
  const state = initialRuntimeState({
    spellCastInterruptionReactioner: true,
    preparedSpellIds: [parseSharedUnitId("bless")],
    casterSpellSlots: [{ spellLevel: 1, count: 1 }],
  });
  const act = quickenedSpellAct(state.battle, "bless");
  const targetHole = findSpellTargetListHole(act.initialHoles);
  const awaitingCounterspell = requireCounterspellWindow(
    resolveBattleSubject({
      state: state.battle.state,
      subject: act.subject,
      fills: [
        spellTargetListFill(targetHole, "bless", [fighterId]),
        spellCastReactionFactsFill([
          spellCastInterruptionReactionTriggerFact(state.battle),
        ]),
      ],
    }),
  );
  const resolved = resolveCounterspellOutcome({
    session: state.battle,
    awaitingCounterspell,
    outcome,
  });
  return {
    battle: battleRuntimeSessionWithState(state.battle, resolved.state),
    invalidKind: "none",
    lastResult: CONCENTRATION_COUNTERSPELL_LAST_RESULT[outcome],
  };
}

function resolveQuickenedNonConcentrationCounterspellWithPriorBless(): QuickenedSpellGovernorRuntimeState {
  const initial = initialRuntimeState({
    spellCastInterruptionReactioner: true,
    preparedSpellIds: [
      parseSharedUnitId("bless"),
      parseSharedUnitId("cure_wounds"),
    ],
    casterSpellSlots: [{ spellLevel: 1, count: 2 }],
  });
  const state = {
    ...initial,
    battle: withPriorBlessConcentration(initial.battle),
  };
  const act = quickenedCureWoundsAct(state.battle);
  const targetHole = findHole(act.initialHoles, "targetChoice");
  const target = targetFill(targetHole, fighterId, [
    {
      kind: "spellTarget",
      casterId: wizardId,
      targetId: fighterId,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("cure_wounds"),
      ),
    },
  ]);
  const awaitingCounterspell = requireCounterspellWindow(
    resolveBattleSubject({
      state: state.battle.state,
      subject: act.subject,
      fills: [
        target,
        spellCastReactionFactsFill([
          spellCastInterruptionReactionTriggerFact(state.battle),
        ]),
      ],
    }),
  );
  const resolved = resolveCounterspellOutcome({
    session: state.battle,
    awaitingCounterspell,
    outcome: "success",
  });
  return {
    battle: battleRuntimeSessionWithState(state.battle, resolved.state),
    invalidKind: "none",
    lastResult: "counteredQuickenedNonConcentrationWithPriorConcentration",
  };
}

function withPriorBlessConcentration(
  session: BattleRuntimeSession,
): BattleRuntimeSession {
  const act = discoverBattleActs(session).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId === "bless",
  );
  if (act?.subject.tag !== "actionSpell") {
    throw new Error("Expected ordinary Bless act for prior Concentration.");
  }
  const targetHole = findSpellTargetListHole(act.initialHoles);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [spellTargetListFill(targetHole, "bless", [fighterId])],
    }),
  );
  return battleRuntimeSessionWithState(session, {
    ...resolved.state,
    currentTurnResources: session.state.currentTurnResources,
  });
}

function requireCounterspellWindow(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Counterspell interrupt window.");
  }
  return result;
}

function resolveCounterspellOutcome(input: {
  readonly session: BattleRuntimeSession;
  readonly awaitingCounterspell: Extract<
    BattleResolutionResult,
    { readonly tag: "needsHoles" }
  >;
  readonly outcome: CounterspellOutcome;
}): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  const interruptHole = findHole(
    input.awaitingCounterspell.holes,
    "interruptDecision",
  );
  const value =
    input.outcome === "decline"
      ? { kind: "decline" as const, responderId: fighterId }
      : triggeredCounterspellDecision({
          session: input.session,
          awaitingCounterspell: input.awaitingCounterspell,
          outcome: input.outcome,
        });
  return requireResolved(
    resolveBattleInterrupt({
      state: input.awaitingCounterspell.state,
      fill: interruptDecisionFill(interruptHole, value),
    }),
  );
}

function triggeredCounterspellDecision(input: {
  readonly session: BattleRuntimeSession;
  readonly awaitingCounterspell: Extract<
    BattleResolutionResult,
    { readonly tag: "needsHoles" }
  >;
  readonly outcome: Exclude<CounterspellOutcome, "decline">;
}) {
  const choice = requireCounterspellChoice(
    input.awaitingCounterspell,
    battleRuntimeSessionWithState(
      input.session,
      input.awaitingCounterspell.state,
    ),
  );
  const fills = [
    savingThrowOutcomeFill(
      findHole(choice.initialHoles, "savingThrowOutcome"),
      [{ targetId: wizardId, succeeded: input.outcome === "failure" }],
    ),
  ];
  return {
    kind: "resolve" as const,
    responderId: fighterId,
    choice: {
      kind: "castTriggeredReactionSpell" as const,
      procedureRef: choice.subject.procedureRef,
      fills,
    },
  };
}

function rejectUnaffordable(): QuickenedSpellGovernorRuntimeState {
  const state = initialRuntimeState({
    sorceryPoints: UNAFFORDABLE_SORCERY_POINTS,
  });
  expect(hasQuickenedCureWoundsAct(state.battle)).toBe(false);
  expectInvalid(
    resolveBattleSubject({
      state: state.battle.state,
      subject: quickenedCureWoundsSubject(state.battle),
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
      state: state.battle.state,
      subject: {
        ...quickenedCureWoundsSubject(state.battle),
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
      state: state.battle.state,
      subject: {
        ...quickenedCureWoundsSubject(state.battle),
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
      state: state.battle.state,
      subject: {
        ...quickenedCureWoundsSubject(state.battle),
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
    battle: battleRuntimeSessionForTest({
      ...base.battle,
      state: {
        ...base.battle.state,
        currentTurnResources: {
          ...base.battle.state.currentTurnResources,
          levelOnePlusSpellCastsThisTurn: [wizardId],
        },
      },
    }),
    invalidKind: "none",
    lastResult: "init",
  };
  expect(hasQuickenedCureWoundsAct(state.battle)).toBe(false);
  expectInvalid(
    resolveBattleSubject({
      state: state.battle.state,
      subject: quickenedCureWoundsSubject(state.battle),
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
  const resources = state.battle.state.currentTurnResources;
  const caster = state.battle.state.combatants.get(wizardId);
  const skeleton = state.battle.state.combatants.get(skeletonId);
  const fighter = state.battle.state.combatants.get(fighterId);
  return {
    quickenedCureWoundsOffered: hasQuickenedCureWoundsAct(state.battle),
    colorSprayBlinded:
      skeleton === undefined
        ? false
        : hasCondition(skeleton.conditions, "blinded"),
    calmEmotionsImmunity:
      state.battle.state.combatants
        .get(fighterId)
        ?.activeEffects.some((effect) => effect.kind === "conditionImmunity") ??
      false,
    invisibilityActive:
      state.battle.state.combatants
        .get(fighterId)
        ?.activeEffects.some(
          (effect) => effect.kind === "targetActionEndedSpellCondition",
        ) ?? false,
    blessActive:
      state.battle.state.combatants
        .get(fighterId)
        ?.activeEffects.some((effect) => effect.kind === "d20RollModifier") ??
      false,
    creatureSizeIncreased:
      fighter === undefined
        ? false
        : combatantEffectiveSize(fighter) === "large",
    magicActionAvailable: canSpendAction(resources, "magic"),
    bonusActionAvailable: resources.currentHasBonusAction,
    sorceryPointsRemaining: Number(sorceryPointsRemaining(state.battle.state)),
    targetHp: state.battle.state.combatants.get(fighterId)?.hp ?? 0,
    spellSlotCommitted: resources.spellSlotUsesThisTurn.some(
      (use) => use.kind === "committed" && use.combatantId === wizardId,
    ),
    levelOnePlusCastThisTurn:
      resources.levelOnePlusSpellCastsThisTurn.includes(wizardId),
    quickenedLevelOnePlusCastThisTurn:
      resources.quickenedLevelOnePlusSpellCastsThisTurn.includes(wizardId),
    spellSlotActsAvailable: discoverBattleActs(state.battle).some(
      (candidate) =>
        battleActSpellPresentation(candidate)?.invocation.tag === "spellSlot",
    ),
    casterConcentrating: (caster?.concentration ?? null) !== null,
    invalidKind: state.invalidKind,
    lastResult: state.lastResult,
  };
}

function invalidQuickenedRoute(input: {
  readonly session: BattleRuntimeSession;
  readonly subject: QuickenedBonusActionSpellAct["subject"];
}) {
  const result = resolveBattleSubject({
    state: input.session.state,
    subject: input.subject,
    fills: [],
  });
  expect(result.tag).toBe("invalid");
  return [battleReducerStartRouteEvent(), ...(result.routeEvents ?? [])];
}

function observeQuickenedRestorationRoute(
  session: BattleRuntimeSession,
): readonly BattleReducerRouteEvent[] {
  const act = quickenedCureWoundsAct(session);
  const targetHole = findHole(act.initialHoles, "targetChoice");
  const target = targetFill(targetHole, fighterId, [
    {
      kind: "spellTarget",
      casterId: wizardId,
      targetId: fighterId,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("cure_wounds"),
      ),
    },
  ]);
  const awaitingHealingRoll = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [target],
  });
  const healingRoll = findHole(
    awaitingHealingRoll.tag === "needsHoles" ? awaitingHealingRoll.holes : [],
    "rolledDice",
  );
  const resolved = requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [target, damageRollFillWithGroups(healingRoll, [[4, 3]])],
    }),
  );
  return [
    battleReducerStartRouteEvent(),
    ...(act.routeEvents ?? []),
    ...(awaitingHealingRoll.routeEvents ?? []),
    ...(resolved.routeEvents ?? []),
  ];
}

function observeQuickenedSaveGatedRoute(
  spellId: Extract<QuickenedSpellId, "calm_emotions" | "color_spray">,
  targetId: CombatantId,
): readonly BattleReducerRouteEvent[] {
  const session = initialRuntimeState().battle;
  const act = quickenedSpellAct(session, spellId);
  const saveHole = findHole(act.initialHoles, "savingThrowOutcome");
  const resolved = requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(saveHole, [{ targetId, succeeded: false }]),
      ],
    }),
  );
  return [
    battleReducerStartRouteEvent(),
    ...(act.routeEvents ?? []),
    ...(resolved.routeEvents ?? []),
  ];
}

function observeQuickenedTargetListRoute(
  spellId: Extract<QuickenedSpellId, "bless" | "invisibility">,
): readonly BattleReducerRouteEvent[] {
  const session = initialRuntimeState().battle;
  const act = quickenedSpellAct(session, spellId);
  const targetHole = findSpellTargetListHole(act.initialHoles);
  const resolved = requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [spellTargetListFill(targetHole, spellId, [fighterId])],
    }),
  );
  return [
    battleReducerStartRouteEvent(),
    ...(act.routeEvents ?? []),
    ...(resolved.routeEvents ?? []),
  ];
}

function quickenedResourceGovernorRoute() {
  return [
    { kind: "startBattle", owner: "battleActionEconomy" },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicSpellGovernor",
      holes: [],
      owner: "battleFeatureResource",
    },
  ];
}

function quickenedRestorationPublicRoute(): readonly BattleReducerRouteEvent[] {
  return [
    { kind: "startBattle", owner: "battleActionEconomy" },
    {
      kind: "discoverBattleActs",
      subject: "metamagicBonusActionCastingTime",
      holes: ["targetChoice"],
      owner: "battleFeatureResource",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicBonusActionCastingTime",
      holes: ["targetChoice"],
      owner: "battleActionEconomy",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicBonusActionCastingTime",
      holes: ["targetChoice"],
      owner: "battleSpellSlotAndActionEconomy",
    },
    {
      kind: "resolveBattleSubject",
      subject: "metamagicBonusActionCastingTime",
      fill: "targetChoice",
      holes: ["rolledDice"],
      owner: "battleTargetSelection",
    },
    {
      kind: "resolveBattleSubject",
      subject: "metamagicBonusActionCastingTime",
      fill: "rolledDice",
      holes: [],
      owner: "battleHitPointAndZeroHpLifecycle",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicBonusActionCastingTime",
      holes: [],
      owner: "battleTurnBoundary",
    },
  ];
}

function quickenedSaveGatedPublicRoute(
  finalOwner: "battleConditionLifecycle" | "battleActiveEffect",
): readonly BattleReducerRouteEvent[] {
  return [
    { kind: "startBattle", owner: "battleActionEconomy" },
    {
      kind: "discoverBattleActs",
      subject: "metamagicBonusActionCastingTime",
      holes: ["savingThrowOutcome"],
      owner: "battleFeatureResource",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicBonusActionCastingTime",
      holes: ["savingThrowOutcome"],
      owner: "battleActionEconomy",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicBonusActionCastingTime",
      holes: ["savingThrowOutcome"],
      owner: "battleSpellSlotAndActionEconomy",
    },
    {
      kind: "resolveBattleSubject",
      subject: "metamagicBonusActionCastingTime",
      fill: "savingThrowOutcome",
      holes: [],
      owner: "battleSavingThrowOutcome",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicBonusActionCastingTime",
      holes: [],
      owner: finalOwner,
    },
  ];
}

function quickenedTargetListActiveEffectPublicRoute(): readonly BattleReducerRouteEvent[] {
  return [
    { kind: "startBattle", owner: "battleActionEconomy" },
    {
      kind: "discoverBattleActs",
      subject: "metamagicBonusActionCastingTime",
      holes: ["spellTargetList"],
      owner: "battleFeatureResource",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicBonusActionCastingTime",
      holes: ["spellTargetList"],
      owner: "battleActionEconomy",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicBonusActionCastingTime",
      holes: ["spellTargetList"],
      owner: "battleSpellSlotAndActionEconomy",
    },
    {
      kind: "resolveBattleSubject",
      subject: "metamagicBonusActionCastingTime",
      fill: "spellTargetList",
      holes: [],
      owner: "battleTargetSelection",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "metamagicBonusActionCastingTime",
      holes: [],
      owner: "battleActiveEffect",
    },
  ];
}

function metamagicBattle(input?: MetamagicBattleInput): BattleRuntimeSession {
  return startBattleSessionRight({
    battleId: battleId("battle:quickened-spell-governor-mbt"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Sorcerer",
        initiative: 20,
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
          sorceryPointResourceUnitId: parseSharedUnitId(
            "sorcerer_font_of_magic",
          ),
          spellUseLimit: "one_per_spell_unless_option_allows_stacking",
          knownOptions: input?.knownOptions ?? [
            quickenedMetamagicOption(),
            empoweredMetamagicOption(),
          ],
        },
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: (
              input?.preparedSpellIds ?? [
                "cure_wounds",
                "color_spray",
                "calm_emotions",
                "invisibility",
                "bless",
                "ray_of_frost",
              ]
            ).map((spellId) => spellRecord(spellId)),
            spellSlots: input?.casterSpellSlots ?? [
              { spellLevel: 1, count: 2 },
              { spellLevel: 2, count: 2 },
            ],
          }),
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "sorcerer",
            abilityModifier: 3,
          },
        },
      }),
      characterSeed({
        combatantId: fighterId,
        displayName: "Wounded Ally",
        initiative: 10,
        currentHp: INITIAL_TARGET_HP,
        maxHp: 20,
        ...(input?.spellCastInterruptionReactioner === true
          ? {
              spellcasting: wizardSpellcasting({
                preparedSpells: [spellRecord("spellCastInterruptionReaction")],
                spellSlots: [{ spellLevel: 3, count: 1 }],
              }),
            }
          : {}),
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
    currentTurnResources: expectSuccess(
      spendAction(state.currentTurnResources, "magic"),
    ),
  };
}

function withMagicActionSpent(
  session: BattleRuntimeSession,
): BattleRuntimeSession {
  return battleRuntimeSessionForTest({
    ...session,
    state: magicActionSpent(session.state),
  });
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
  state: BattleRuntimeSession,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(state).find(isQuickenedCureWoundsAct);
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error("Expected Quickened Cure Wounds act.");
  }
  return act;
}

function hasQuickenedCureWoundsAct(state: BattleRuntimeSession): boolean {
  return discoverBattleActs(state).some(isQuickenedCureWoundsAct);
}

function isQuickenedCureWoundsAct(
  candidate: AvailableBattleAct,
): candidate is QuickenedBonusActionSpellAct {
  return (
    candidate.subject.tag === "bonusActionSpell" &&
    battleActSpellPresentation(candidate)?.invocation.spellId ===
      "cure_wounds" &&
    candidate.subject.metamagic?.some(
      (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function quickenedCureWoundsSubject(
  state: BattleRuntimeSession,
): QuickenedBonusActionSpellAct["subject"] {
  const actionSpell = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        "cure_wounds",
  );
  if (actionSpell?.subject.tag !== "actionSpell") {
    throw new Error("Expected bound Cure Wounds spell procedure.");
  }
  return {
    tag: "bonusActionSpell",
    actorId: actionSpell.subject.actorId,
    procedureRef: actionSpell.subject.procedureRef,
    mode: { tag: "cast" },
    metamagic: QUICKENED_SPELL_METAMAGIC_SELECTION,
  };
}

type QuickenedSpellId =
  | "bless"
  | "calm_emotions"
  | "color_spray"
  | "invisibility";

function quickenedCreatureSizeChangeAct(
  state: BattleRuntimeSession,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is QuickenedBonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        enlargeReduceUnitId &&
      battleActSpellPresentation(candidate)?.invocation.procedure ===
        "creatureSizeIncrease" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error("Expected Quickened creature size-change act.");
  }
  return act;
}

function quickenedRayOfFrostAct(
  state: BattleRuntimeSession,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is QuickenedBonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        "ray_of_frost" &&
      battleActSpellPresentation(candidate)?.invocation.procedure ===
        "spellAttackDamage" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error("Expected Quickened Ray of Frost act.");
  }
  return act;
}

function quickenedSpellAct(
  state: BattleRuntimeSession,
  spellId: QuickenedSpellId,
): QuickenedBonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is QuickenedBonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId === spellId &&
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
  return knownWillingSpellTargetListFill(hole, wizardId, spellId, targetIds);
}

type CounterspellTriggerFact = Extract<
  Extract<
    BattleFill,
    { readonly kind: "targetSpatialFacts" }
  >["spatialFacts"][number],
  { readonly kind: "spellCastInterruptionTriggerCasterVisibleWithinRange" }
>;

function spellCastInterruptionReactionTriggerFact(
  session: BattleRuntimeSession,
): CounterspellTriggerFact {
  return {
    kind: "spellCastInterruptionTriggerCasterVisibleWithinRange",
    reactorId: fighterId,
    casterId: wizardId,
    sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
      session,
      fighterId,
      spellSlotInvocationRef(
        "spellCastInterruptionReaction",
        3,
        "spellCastInterruptionReaction",
      ),
    ),
    rangeFeet: movementFeet(60),
  };
}

function spellCastReactionFactsFill(
  facts: readonly CounterspellTriggerFact[],
): Extract<BattleFill, { readonly kind: "targetSpatialFacts" }> {
  return {
    kind: "targetSpatialFacts",
    holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
    spatialFacts: facts,
  };
}

type CounterspellChoice = Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "nestedProcedure" }
> & {
  readonly subject: Extract<
    BattleInterruptSubject,
    { readonly command: "castTriggeredReactionSpell" }
  >;
};

function requireCounterspellChoice(
  result: Extract<BattleResolutionResult, { readonly tag: "needsHoles" }>,
  session: BattleRuntimeSession,
): CounterspellChoice {
  const choice = battleFrontierInterruptDecisionForState(
    result.state,
  )?.choices.find((candidate): candidate is CounterspellChoice => {
    if (
      candidate.kind !== "nestedProcedure" ||
      candidate.subject.command !== "castTriggeredReactionSpell" ||
      candidate.subject.reactorId !== fighterId
    ) {
      return false;
    }
    const invocation = characterSpellInvocationRefForProcedureRefForTest(
      session,
      candidate.subject.reactorId,
      candidate.subject.procedureRef,
    );
    return (
      invocation.tag === "spellSlot" &&
      invocation.spellId === "spellCastInterruptionReaction" &&
      invocation.procedure === "spellCastInterruptionReaction" &&
      Number(invocation.slotLevel) === 3
    );
  });
  if (choice === undefined) {
    throw new Error("Expected Counterspell Reaction choice.");
  }
  return choice;
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

function expectSuccess<T, E>(result: Result.Result<T, E>): T {
  if (Result.isFailure(result)) {
    throw new Error(`Expected Success, got ${JSON.stringify(result.failure)}`);
  }
  return result.success;
}

function normalizeQuickenedSpellGovernorQuintState(
  raw: unknown,
): QuickenedSpellGovernorProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: quickenedSpellGovernorUnexpectedHole,
  });
  if (protocol.holes.length !== 0) {
    throw new Error(
      "Expected Quickened Spell Governor witness holes to be empty.",
    );
  }
  const lastResultValue = lastResult(state["qScenarioOutcome"]);
  assertWitnessProtocolConsistentWithScenario({
    label: "Quickened Spell Governor",
    scenarioOutcome: lastResultValue,
    protocol,
  });
  const calmEmotionsImmunity = booleanField(state, "qCalmEmotionsImmunity");
  const invisibilityActive = booleanField(state, "qInvisibilityActive");
  const blessActive = booleanField(state, "qBlessActive");
  const creatureSizeIncreased = booleanField(state, "qCreatureSizeIncreased");
  return {
    quickenedCureWoundsOffered: booleanField(
      state,
      "qQuickenedCureWoundsOffered",
    ),
    colorSprayBlinded: booleanField(state, "qColorSprayBlinded"),
    calmEmotionsImmunity,
    invisibilityActive,
    blessActive,
    creatureSizeIncreased,
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
    casterConcentrating:
      calmEmotionsImmunity ||
      invisibilityActive ||
      blessActive ||
      creatureSizeIncreased,
    invalidKind: invalidKind(state["qInvalidKind"]),
    lastResult: lastResultValue,
  };
}

function quickenedSpellGovernorUnexpectedHole(raw: unknown): never {
  throw new Error(
    `Quickened Spell Governor witness does not expect holes; received ${String(raw)}.`,
  );
}

function compareQuickenedSpellGovernorStates(
  runtime: QuickenedSpellGovernorProjection,
  quint: QuickenedSpellGovernorProjection,
): boolean {
  expect(runtime).toEqual(quint);
  return true;
}

function invalidKind(raw: unknown): InvalidKind {
  if (typeof raw === "string" && INVALID_KIND_SET.has(raw)) {
    return raw as InvalidKind;
  }
  throw new Error(`Unknown Quickened Spell invalid kind: ${String(raw)}.`);
}

function lastResult(raw: unknown): LastResult {
  return quintVariantMappedValue(
    raw,
    "qScenarioOutcome",
    LAST_RESULT_BY_SCENARIO_OUTCOME_TAG,
    "Quickened Spell result",
  );
}
