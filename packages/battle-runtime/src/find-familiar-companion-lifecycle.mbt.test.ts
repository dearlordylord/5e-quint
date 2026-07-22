import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { resolveBattleSubject } from "./battle-runtime-test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.find-familiar-lifecycle
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
// RAW trace:
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Find Familiar:
//   chosen familiar form, Celestial/Fey/Fiend type override, telepathic
//   connection within 100 feet, Bonus Action shared senses, Touch spell
//   delivery using the familiar's Reaction, combatant Initiative, and one
//   familiar only with recast form replacement.
// - .references/srd-5.2.1/Classes/Warlock.md#Pact of the Chain:
//   Pact of the Chain learns Find Familiar, widens eligible forms, and lets
//   the owner forgo one Attack-action attack so the familiar attacks with its
//   Reaction.
// - UBIQUITOUS_LANGUAGE.md: Companion, Magic Action, Bonus Action, Reaction,
//   Spell Invocation, Spell Effect, Attack Roll, and Hit Points.
import { canSpendBonusAction } from "@dnd/shared-algebras/action-economy-algebra";
import {
  abilityModifier,
  DieRollResult,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  findFamiliarFormEligibilityForSpell,
  type FindFamiliarFormEligibility,
} from "@dnd/surface/surface/find-familiar-forms";
import * as Either from "effect/Either";
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
  quintVariantTag,
  run,
  stateCheck,
  type ReducerRouteEvent,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  battleReducerStartRouteEvent,
  battleId,
  castFindFamiliar,
  combatantId,
  deliverTouchSpellThroughFindFamiliar,
  discoverBattleActs,
  findFamiliarCompanionEntryForOwner,
  findFamiliarTelepathicConnection,
  initiativeScore,
  reappearTemporarilyDismissedFindFamiliar,
  sameBattleSubject,
  shareFindFamiliarSenses,
  startBattle,
  temporarilyDismissFindFamiliar,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  type BattleState,
  type BattleCompanionState,
  type AvailableBattleAct,
  type BattleSubject,
  type PactOfTheChainFamiliarAttackSubject,
} from "./index.ts";
import {
  characterCreature,
  requireCombatant,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import { statBlockCatalog } from "./unit-profile-admission-catalog-support.ts";
import { statBlockProcedurePresentations } from "./stat-block-presentation.ts";

const FAMILIAR_STATUSES = ["none", "present"] as const;
type FamiliarStatus = (typeof FAMILIAR_STATUSES)[number];
const FAMILIAR_IDS = ["none", "primary"] as const;
type FamiliarIdentity = (typeof FAMILIAR_IDS)[number];
const FAMILIAR_FORMS = ["none", "cat", "rat"] as const;
type FamiliarForm = (typeof FAMILIAR_FORMS)[number];
const CREATURE_TYPE_OVERRIDES = ["none", "fey"] as const;
type CreatureTypeOverride = (typeof CREATURE_TYPE_OVERRIDES)[number];
const LAST_RESULTS = [
  "init",
  "createdCat",
  "replacedRat",
  "sharedSenses",
  "touchDelivered",
  "pactAttack",
] as const;
type LastResult = (typeof LAST_RESULTS)[number];
const FIND_FAMILIAR_COMPANION_LIFECYCLE_SCENARIO_OUTCOME_BY_TAG: Readonly<
  Record<string, LastResult>
> = {
  Init: "init",
  CreatedCat: "createdCat",
  ReplacedRat: "replacedRat",
  SharedSenses: "sharedSenses",
  TouchDelivered: "touchDelivered",
  PactAttack: "pactAttack",
};

type FindFamiliarCompanionProjection = {
  readonly familiarStatus: FamiliarStatus;
  readonly familiarId: FamiliarIdentity;
  readonly familiarForm: FamiliarForm;
  readonly creatureTypeOverride: CreatureTypeOverride;
  readonly companionCount: number;
  readonly telepathyAvailable: boolean;
  readonly sharedSensesActive: boolean;
  readonly bonusActionAvailable: boolean;
  readonly ownerAttackAvailable: boolean;
  readonly familiarReactionAvailable: boolean;
  readonly touchDeliveryReactionSpent: boolean;
  readonly pactReactionAttackResolved: boolean;
  readonly spellSlotCommitted: boolean;
  readonly targetHp: number;
  readonly lastResult: LastResult;
};

type FindFamiliarCompanionRuntimeState = {
  readonly battle: BattleRuntimeSession;
  readonly lastResult: LastResult;
};

const casterId = combatantId("find-familiar-mbt-caster");
const familiarId = combatantId("find-familiar-mbt-familiar");
const targetId = combatantId("find-familiar-mbt-target");
const initialTargetHp = 12;
const findFamiliarSpell = spellRecord("find_familiar");
const cureWoundsSpell = spellRecord("cure_wounds");
const familiarEligibility = requireFindFamiliarEligibility(
  findFamiliarFormEligibilityForSpell(findFamiliarSpell),
);

const driverSchema = {
  init: {},
  doCreateCatFamiliar: {},
  doReplaceWithRatFamiliar: {},
  doShareSenses: {},
  doDeliverTouchSpell: {},
  doPactFamiliarAttack: {},
  step: {},
} as const;

const findFamiliarCompanionRouteDriverSchema = {
  init: {},
  doRouteFamiliarCreation: {},
  doRouteFamiliarReplacement: {},
  doRouteFamiliarDismissalReappearance: {},
  doRouteSharedSenses: {},
  doRouteTouchDelivery: {},
  doRoutePactFamiliarAttack: {},
  step: {},
} as const;

function createFindFamiliarCompanionLifecycleDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doCreateCatFamiliar: () => {
        state = createCatFamiliar(state);
      },
      doReplaceWithRatFamiliar: () => {
        state = replaceWithRatFamiliar(state);
      },
      doShareSenses: () => {
        state = shareSenses(state);
      },
      doDeliverTouchSpell: () => {
        state = deliverTouchSpell(state);
      },
      doPactFamiliarAttack: () => {
        state = resolvePactFamiliarAttack(state);
      },
      step: () => {},
      getState: () => findFamiliarCompanionProjection(state),
    };
  });
}

type FindFamiliarCompanionRouteState = {
  readonly route: readonly ReducerRouteEvent[];
};

function createFindFamiliarCompanionRouteDriver() {
  return defineDriver(findFamiliarCompanionRouteDriverSchema, () => {
    let route: readonly ReducerRouteEvent[] = [battleReducerStartRouteEvent()];
    return {
      init: () => {
        route = [battleReducerStartRouteEvent()];
      },
      doRouteFamiliarCreation: () => {
        route = observeFamiliarCreationRoute();
      },
      doRouteFamiliarReplacement: () => {
        route = observeFamiliarReplacementRoute();
      },
      doRouteFamiliarDismissalReappearance: () => {
        route = observeFamiliarDismissalReappearanceRoute();
      },
      doRouteSharedSenses: () => {
        route = observeSharedSensesRoute();
      },
      doRouteTouchDelivery: () => {
        route = observeTouchDeliveryRoute();
      },
      doRoutePactFamiliarAttack: () => {
        route = observePactFamiliarAttackRoute();
      },
      step: () => {},
      getState: (): FindFamiliarCompanionRouteState => ({ route }),
    };
  });
}

const findFamiliarCompanionStateCheck = stateCheck(
  normalizeFindFamiliarCompanionQuintState,
  compareFindFamiliarCompanionStates,
);

const findFamiliarCompanionRouteStateCheck = stateCheck(
  normalizeFindFamiliarCompanionRouteQuintState,
  (
    spec: FindFamiliarCompanionRouteState,
    impl: FindFamiliarCompanionRouteState,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

describe("Find Familiar companion lifecycle MBT parity", () => {
  it("creates and replaces one owner-linked companion with selected form and type facts", () => {
    const created = createCatFamiliar(initialRuntimeState());
    const replaced = replaceWithRatFamiliar(created);

    expect(findFamiliarCompanionProjection(created)).toMatchObject({
      familiarStatus: "present",
      familiarId: "primary",
      familiarForm: "cat",
      creatureTypeOverride: "fey",
      companionCount: 1,
      telepathyAvailable: true,
      lastResult: "createdCat",
    });
    expect(findFamiliarCompanionProjection(replaced)).toMatchObject({
      familiarStatus: "present",
      familiarId: "primary",
      familiarForm: "rat",
      creatureTypeOverride: "fey",
      companionCount: 1,
      telepathyAvailable: true,
      lastResult: "replacedRat",
    });
  });

  it("projects telepathy, shared senses, and Touch delivery through runtime state", () => {
    const shared = shareSenses(createCatFamiliar(initialRuntimeState()));
    const delivered = deliverTouchSpell(shared);

    expect(findFamiliarCompanionProjection(shared)).toMatchObject({
      telepathyAvailable: true,
      sharedSensesActive: true,
      bonusActionAvailable: false,
      familiarReactionAvailable: true,
      lastResult: "sharedSenses",
    });
    expect(findFamiliarCompanionProjection(delivered)).toMatchObject({
      familiarReactionAvailable: false,
      touchDeliveryReactionSpent: true,
      spellSlotCommitted: true,
      targetHp: initialTargetHp,
      lastResult: "touchDelivered",
    });
  });

  it("spends the owner Attack-action attack and familiar Reaction for Pact of the Chain", () => {
    const resolved = resolvePactFamiliarAttack(
      createCatFamiliar(initialRuntimeState()),
    );

    expect(findFamiliarCompanionProjection(resolved)).toMatchObject({
      ownerAttackAvailable: false,
      familiarReactionAvailable: false,
      pactReactionAttackResolved: true,
      targetHp: initialTargetHp - 1,
      lastResult: "pactAttack",
    });
  });

  it(
    "matches the focused companion lifecycle against bounded random MBT traces",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-find-familiar-companion-lifecycle.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createFindFamiliarCompanionLifecycleDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(5),
        stateCheck: findFamiliarCompanionStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "routes companion lifecycle and familiar actions through battle owners",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-find-familiar-companion-lifecycle.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createFindFamiliarCompanionRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: findFamiliarCompanionRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function observeFamiliarCreationRoute(): readonly ReducerRouteEvent[] {
  const created = castNormalFamiliarResult(initialRuntimeState(), "cat");
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOf(created, "Find Familiar creation"),
  ];
}

function observeFamiliarReplacementRoute(): readonly ReducerRouteEvent[] {
  const created = createCatFamiliar(initialRuntimeState());
  const replaced = castNormalFamiliarResult(created, "rat");
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOf(replaced, "Find Familiar replacement"),
  ];
}

function observeFamiliarDismissalReappearanceRoute(): readonly ReducerRouteEvent[] {
  const created = createCatFamiliar(initialRuntimeState());
  const dismissed = temporarilyDismissFindFamiliar({
    state: created.battle.state,
    casterId,
    heldObjectIds: [],
  });
  const reappeared = reappearTemporarilyDismissedFindFamiliar({
    state: requireResolved(dismissed),
    casterId,
    catalog: statBlockCatalog,
    initiative: initiativeScore(18),
    placement: { kind: "unoccupiedSpaceWithin30Feet" },
  });
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOf(reappeared, "Find Familiar reappearance"),
  ];
}

function observeSharedSensesRoute(): readonly ReducerRouteEvent[] {
  const session = createCatFamiliar(initialRuntimeState()).battle;
  const act = sharedSensesAct(session);
  const resolved = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      findFamiliarConnectionFill(
        requireHole(act.initialHoles, "findFamiliarConnection"),
      ),
    ],
  });
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOf(act, "Share Familiar Senses discovery"),
    ...routeEventsOf(resolved, "Share Familiar Senses resolution"),
  ];
}

function observeTouchDeliveryRoute(): readonly ReducerRouteEvent[] {
  const session = createCatFamiliar(initialRuntimeState()).battle;
  const act = touchDeliveryAct(session);
  const connectionFill = findFamiliarConnectionFill(
    requireHole(act.initialHoles, "findFamiliarConnection"),
  );
  const targetFill = touchSpellTargetFill(
    requireHole(act.initialHoles, "targetChoice"),
    act.subject.procedureRef,
  );
  const awaitingHealingRoll = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [connectionFill, targetFill],
  });
  if (awaitingHealingRoll.tag !== "needsHoles") {
    throw new Error(
      `Expected Find Familiar Touch delivery healing roll hole, got ${awaitingHealingRoll.tag}${
        awaitingHealingRoll.tag === "invalid"
          ? `: ${awaitingHealingRoll.message}`
          : ""
      }.`,
    );
  }
  const resolved = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      connectionFill,
      targetFill,
      healingRollFill(requireHole(awaitingHealingRoll.holes, "rolledDice")),
    ],
  });
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOf(act, "Find Familiar Touch delivery discovery"),
    ...routeEventsOf(
      awaitingHealingRoll,
      "Find Familiar Touch delivery target",
    ),
    ...routeEventsOf(resolved, "Find Familiar Touch delivery resolution"),
  ];
}

function observePactFamiliarAttackRoute(): readonly ReducerRouteEvent[] {
  const session = createCatFamiliar(initialRuntimeState()).battle;
  const act = pactFamiliarAttackAct(session);
  const awaitingTarget = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [],
  });
  if (awaitingTarget.tag !== "needsHoles") {
    throw new Error("Expected Pact familiar attack target hole.");
  }
  const target = familiarAttackTargetFill(
    requireHole(awaitingTarget.holes, "targetChoice"),
  );
  const awaitingAttackRoll = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [target],
  });
  if (awaitingAttackRoll.tag !== "needsHoles") {
    throw new Error("Expected Pact familiar attack roll hole.");
  }
  const attackRoll = attackRollFill(
    requireHole(awaitingAttackRoll.holes, "attackRoll"),
  );
  const awaitingDamage = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [target, attackRoll],
  });
  if (awaitingDamage.tag !== "needsHoles") {
    throw new Error("Expected Pact familiar damage roll hole.");
  }
  const resolved = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      target,
      attackRoll,
      fixedDamageRollFill(requireHole(awaitingDamage.holes, "rolledDice")),
    ],
  });
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOf(act, "Pact familiar attack discovery"),
    ...routeEventsOf(awaitingTarget, "Pact familiar attack stat-block action"),
    ...routeEventsOf(awaitingAttackRoll, "Pact familiar attack target"),
    ...routeEventsOf(awaitingDamage, "Pact familiar attack roll"),
    ...routeEventsOf(resolved, "Pact familiar attack damage"),
  ];
}

function initialRuntimeState(): FindFamiliarCompanionRuntimeState {
  const result = startBattle({
    battleId: battleId("find-familiar-companion-lifecycle-mbt"),
    combatants: [
      characterCreature({
        combatantId: casterId,
        displayName: "Pact Caster",
        initiative: 20,
        classLevels: [{ className: "warlock", level: 1 }],
        spellcasting: {
          sourceClassName: "warlock",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [cureWoundsSpell],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [
            {
              tag: "pactOfTheChainFindFamiliar",
              spell: findFamiliarSpell,
            },
          ],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        },
      }),
      characterCreature({
        combatantId: targetId,
        displayName: "Target",
        initiative: 10,
        currentHp: initialTargetHp,
        maxHp: initialTargetHp,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return { battle: result.right, lastResult: "init" };
}

function createCatFamiliar(
  state: FindFamiliarCompanionRuntimeState,
): FindFamiliarCompanionRuntimeState {
  return castNormalFamiliar(state, "cat", "createdCat");
}

function replaceWithRatFamiliar(
  state: FindFamiliarCompanionRuntimeState,
): FindFamiliarCompanionRuntimeState {
  return castNormalFamiliar(state, "rat", "replacedRat");
}

function castNormalFamiliar(
  state: FindFamiliarCompanionRuntimeState,
  formId: Extract<FamiliarForm, "cat" | "rat">,
  lastResult: Extract<LastResult, "createdCat" | "replacedRat">,
): FindFamiliarCompanionRuntimeState {
  const result = castNormalFamiliarResult(state, formId);
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: requireResolved(result),
    }),
    lastResult,
  };
}

function castNormalFamiliarResult(
  state: FindFamiliarCompanionRuntimeState,
  formId: Extract<FamiliarForm, "cat" | "rat">,
): BattleResolutionResult {
  return castFindFamiliar({
    state: state.battle.state,
    casterId,
    catalog: statBlockCatalog,
    eligibility: familiarEligibility,
    selection: { tag: "normalNamedForm", formId },
    creatureTypeOverrideChoiceId: "fey",
    familiarId,
    initiative: initiativeScore(18),
    placement: { kind: "unoccupiedSpaceWithinSpellRange" },
  });
}

function shareSenses(
  state: FindFamiliarCompanionRuntimeState,
): FindFamiliarCompanionRuntimeState {
  const result = shareFindFamiliarSenses({
    state: state.battle.state,
    casterId,
    fact: familiarWithin100FeetFact(),
  });
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: requireResolved(result),
    }),
    lastResult: "sharedSenses",
  };
}

function deliverTouchSpell(
  state: FindFamiliarCompanionRuntimeState,
): FindFamiliarCompanionRuntimeState {
  const act = actionSpellAct(state.battle, "cure_wounds");
  const targetFill = touchSpellTargetFill(
    requireHole(act.initialHoles, "targetChoice"),
    act.subject.procedureRef,
  );
  const awaitingHealingRoll = deliverTouchSpellThroughFindFamiliar({
    state: state.battle.state,
    subject: act.subject,
    fills: [targetFill],
    fact: familiarWithin100FeetFact(),
  });
  if (awaitingHealingRoll.tag !== "needsHoles") {
    throw new Error(
      `Expected Find Familiar Touch delivery healing roll hole, got ${awaitingHealingRoll.tag}${
        awaitingHealingRoll.tag === "invalid"
          ? `: ${awaitingHealingRoll.message}`
          : ""
      }.`,
    );
  }
  const result = deliverTouchSpellThroughFindFamiliar({
    state: state.battle.state,
    subject: act.subject,
    fills: [
      targetFill,
      healingRollFill(requireHole(awaitingHealingRoll.holes, "rolledDice")),
    ],
    fact: familiarWithin100FeetFact(),
  });
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: requireResolved(result),
    }),
    lastResult: "touchDelivered",
  };
}

function resolvePactFamiliarAttack(
  state: FindFamiliarCompanionRuntimeState,
): FindFamiliarCompanionRuntimeState {
  const result = resolveBattleSubject({
    state: state.battle.state,
    subject: pactScratchSubject(state.battle.state),
    fills: pactScratchFilledAttackFills(state.battle.state),
  });
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: requireResolved(result),
    }),
    lastResult: "pactAttack",
  };
}

function findFamiliarCompanionProjection(
  state: FindFamiliarCompanionRuntimeState,
): FindFamiliarCompanionProjection {
  const familiarEntry = findFamiliarCompanionEntryForOwner(
    state.battle.state,
    casterId,
  );
  const familiar = familiarEntry?.companion ?? null;
  const familiarCombatant =
    familiarEntry !== null && familiarEntry.companion.status === "present"
      ? state.battle.state.combatants.get(familiarEntry.companion.combatantId)
      : undefined;
  const familiarReactionAvailable =
    familiarCombatant?.reactionAvailable === true;
  const spellSlotCommitted =
    state.battle.state.currentTurnResources.spellSlotUsesThisTurn.some(
      (use) => use.kind === "committed",
    );
  const targetHp = Number(requireCombatant(state.battle.state, targetId).hp);
  const connection = findFamiliarTelepathicConnection(
    state.battle.state,
    familiarWithin100FeetFact(),
  );
  const caster = requireCombatant(state.battle.state, casterId);
  const projection = {
    familiarStatus: familiar?.status === "present" ? "present" : "none",
    familiarId: familiar?.status === "present" ? "primary" : "none",
    familiarForm:
      familiar !== null && familiar.status !== "dismissedForever"
        ? familiarFormForWitness(state.battle.state, familiar)
        : "none",
    creatureTypeOverride: creatureTypeOverride(
      familiar?.creatureTypeOverride ?? "none",
    ),
    companionCount: state.battle.state.companions.size,
    telepathyAvailable: connection !== null,
    sharedSensesActive: caster.activeEffects.some(
      (effect) =>
        effect.kind === "findFamiliarSharedSenses" &&
        effect.familiarId === familiarId,
    ),
    bonusActionAvailable: canSpendBonusAction(
      state.battle.state.currentTurnResources,
    ),
    ownerAttackAvailable:
      state.battle.state.currentTurnResources.actionResources.length > 0,
    familiarReactionAvailable,
    touchDeliveryReactionSpent:
      spellSlotCommitted && !familiarReactionAvailable,
    pactReactionAttackResolved:
      targetHp === initialTargetHp - 1 && !spellSlotCommitted,
    spellSlotCommitted,
    targetHp,
    lastResult: state.lastResult,
  } satisfies FindFamiliarCompanionProjection;
  expect(projection.companionCount).toBe(
    projection.familiarStatus === "present" ? 1 : 0,
  );
  return projection;
}

function familiarWithin100FeetFact() {
  return {
    kind: "findFamiliarWithin100FeetOfOwner" as const,
    ownerId: casterId,
    familiarId,
  };
}

function actionSpellAct(
  session: BattleRuntimeSession,
  spellId: "cure_wounds",
): AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
} {
  const act = discoverBattleActs(session).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
    } =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId === spellId,
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} action spell act.`);
  }
  return act;
}

function sharedSensesAct(session: BattleRuntimeSession): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "findFamiliarSharedSenses" }
  >;
} {
  const act = discoverBattleActs(session).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "findFamiliarSharedSenses" }
      >;
    } => candidate.subject.tag === "findFamiliarSharedSenses",
  );
  if (act === undefined) {
    throw new Error("Expected Share Familiar Senses act.");
  }
  return act;
}

function touchDeliveryAct(session: BattleRuntimeSession): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "findFamiliarTouchSpell" }
  >;
} {
  const act = discoverBattleActs(session).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "findFamiliarTouchSpell" }
      >;
    } =>
      candidate.subject.tag === "findFamiliarTouchSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        "cure_wounds",
  );
  if (act === undefined) {
    throw new Error("Expected Find Familiar Touch delivery act.");
  }
  return act;
}

function pactFamiliarAttackAct(
  session: BattleRuntimeSession,
): AvailableBattleAct & {
  readonly subject: PactOfTheChainFamiliarAttackSubject;
} {
  const subject = pactScratchSubject(session.state);
  const act = discoverBattleActs(session).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: PactOfTheChainFamiliarAttackSubject;
    } =>
      candidate.subject.tag === "pactOfTheChainFamiliarAttack" &&
      sameBattleSubject(candidate.subject, subject),
  );
  if (act === undefined) {
    throw new Error("Expected Pact familiar Scratch attack act.");
  }
  return act;
}

function routeEventsOf(
  source: { readonly routeEvents?: readonly ReducerRouteEvent[] },
  label: string,
): readonly ReducerRouteEvent[] {
  if (source.routeEvents === undefined || source.routeEvents.length === 0) {
    throw new Error(`Expected public reducer route events for ${label}.`);
  }
  return source.routeEvents;
}

function requireFindFamiliarEligibility(
  eligibility: FindFamiliarFormEligibility | null,
): FindFamiliarFormEligibility {
  if (eligibility === null) {
    throw new Error("Expected Find Familiar form eligibility.");
  }
  return eligibility;
}

function touchSpellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  procedureRef: Extract<
    BattleSubject,
    { readonly tag: "actionSpell" }
  >["procedureRef"],
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "findFamiliarTouchSpellTarget",
        ownerId: casterId,
        familiarId,
        targetId,
        sourceProcedureRef: procedureRef,
      },
    ],
  };
}

function findFamiliarConnectionFill(
  hole: Extract<BattleHole, { readonly kind: "findFamiliarConnection" }>,
): Extract<BattleFill, { readonly kind: "findFamiliarConnection" }> {
  return {
    kind: "findFamiliarConnection",
    holeId: hole.holeId,
    value: { withinRange: true },
  };
}

function healingRollFill(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [{ results: [DieRollResult(4), DieRollResult(4)] }],
  };
}

function pactScratchSubject(
  state: BattleState,
): PactOfTheChainFamiliarAttackSubject {
  const familiar = state.combatants.get(familiarId);
  if (familiar?.origin.kind !== "statBlock") {
    throw new Error("Expected the committed familiar Stat Block admission.");
  }
  const procedureRef = statBlockProcedurePresentations({
    statBlock: statBlockCatalog.requireStatBlock(familiar.origin.statBlockId),
    execution: familiar.origin.execution,
  }).find(
    (presentation) =>
      presentation.kind === "attack" && presentation.name === "Scratch",
  )?.procedureRef;
  if (procedureRef === undefined) {
    throw new Error("Expected admitted Scratch procedure.");
  }
  return {
    tag: "pactOfTheChainFamiliarAttack",
    actorId: casterId,
    familiarId,
    procedureRef,
  };
}

function pactScratchFilledAttackFills(
  state: BattleState,
): readonly BattleFill[] {
  const subject = pactScratchSubject(state);
  const awaitingTarget = resolveBattleSubject({ state, subject, fills: [] });
  if (awaitingTarget.tag !== "needsHoles") {
    throw new Error("Expected Pact familiar attack target hole.");
  }
  const target = familiarAttackTargetFill(
    requireHole(awaitingTarget.holes, "targetChoice"),
  );
  const awaitingAttackRoll = resolveBattleSubject({
    state,
    subject,
    fills: [target],
  });
  if (awaitingAttackRoll.tag !== "needsHoles") {
    throw new Error("Expected Pact familiar attack roll hole.");
  }
  const attackRoll = attackRollFill(
    requireHole(awaitingAttackRoll.holes, "attackRoll"),
  );
  const awaitingDamage = resolveBattleSubject({
    state,
    subject,
    fills: [target, attackRoll],
  });
  if (awaitingDamage.tag !== "needsHoles") {
    throw new Error("Expected Pact familiar damage roll hole.");
  }
  return [
    target,
    attackRoll,
    fixedDamageRollFill(requireHole(awaitingDamage.holes, "rolledDice")),
  ];
}

function familiarAttackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  if (hole.attack === undefined) {
    throw new Error("Expected familiar attack target context.");
  }
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId: familiarId,
        targetId,
        ...hole.attack.selection,
      },
    ],
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: 23,
      naturalD20: DieRollResult(19),
    },
  };
}

function fixedDamageRollFill(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [
      {
        // SRD familiar-form attacks such as Cat Scratch are authored as
        // fixed 0d1+1 damage. The runtime still asks for the rolledDice hole
        // for the fixed expression, but the shared fill type currently brands
        // rolled dice groups as non-empty. There is no parser/generic helper
        // for this zero-dice authored shape, so the test narrows exactly this
        // empty dice group at the call boundary.
        results: [] as unknown as Extract<
          BattleFill,
          { readonly kind: "rolledDice" }
        >["value"][number]["results"],
      },
    ],
  };
}

function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function requireResolved(result: BattleResolutionResult): BattleState {
  expect(result).toMatchObject({ tag: "resolved" });
  if (result.tag !== "resolved") {
    throw new Error("Expected Find Familiar companion action to resolve.");
  }
  return result.state;
}

function normalizeFindFamiliarCompanionQuintState(
  raw: unknown,
): FindFamiliarCompanionProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: findFamiliarCompanionUnexpectedHole,
  });
  if (protocol.holes.length !== 0) {
    throw new Error(
      "Expected Find Familiar companion witness holes to be empty.",
    );
  }
  const scenarioResult = findFamiliarCompanionLastResult(
    state["qScenarioOutcome"],
  );
  assertWitnessProtocolConsistentWithScenario({
    label: "Find Familiar companion lifecycle",
    scenarioOutcome: scenarioResult,
    protocol,
  });
  return {
    familiarStatus: literalField(state["qFamiliarStatus"], FAMILIAR_STATUSES),
    familiarId: literalField(state["qFamiliarId"], FAMILIAR_IDS),
    familiarForm: literalField(state["qFamiliarForm"], FAMILIAR_FORMS),
    creatureTypeOverride: literalField(
      state["qCreatureTypeOverride"],
      CREATURE_TYPE_OVERRIDES,
    ),
    companionCount: numberFromQuintInt(
      state["qCompanionCount"],
      "qCompanionCount",
    ),
    telepathyAvailable: booleanField(state, "qTelepathyAvailable"),
    sharedSensesActive: booleanField(state, "qSharedSensesActive"),
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    ownerAttackAvailable: booleanField(state, "qOwnerAttackAvailable"),
    familiarReactionAvailable: booleanField(
      state,
      "qFamiliarReactionAvailable",
    ),
    touchDeliveryReactionSpent: booleanField(
      state,
      "qTouchDeliveryReactionSpent",
    ),
    pactReactionAttackResolved: booleanField(
      state,
      "qPactReactionAttackResolved",
    ),
    spellSlotCommitted: booleanField(state, "qSpellSlotCommitted"),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    lastResult: scenarioResult,
  };
}

function normalizeFindFamiliarCompanionRouteQuintState(
  raw: unknown,
): FindFamiliarCompanionRouteState {
  const state = quintStateRecord(raw);
  return {
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function findFamiliarCompanionUnexpectedHole(raw: unknown): never {
  throw new Error(
    `Unexpected Find Familiar companion witness hole ${String(raw)}.`,
  );
}

function findFamiliarCompanionLastResult(raw: unknown): LastResult {
  const tag = quintVariantTag(raw, "qScenarioOutcome");
  const value = FIND_FAMILIAR_COMPANION_LIFECYCLE_SCENARIO_OUTCOME_BY_TAG[tag];
  if (value !== undefined) {
    return value;
  }
  throw new Error(`Unknown Find Familiar companion result: ${tag}.`);
}

function compareFindFamiliarCompanionStates(
  runtime: FindFamiliarCompanionProjection,
  quint: FindFamiliarCompanionProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `${error.message}\n${JSON.stringify({ runtime, quint }, null, 2)}`,
      );
    }
    throw error;
  }
  return true;
}

function familiarFormForWitness(
  state: BattleState,
  familiar: Exclude<
    BattleCompanionState,
    { readonly status: "dismissedForever" }
  >,
): FamiliarForm {
  const combatant =
    familiar.status === "present"
      ? state.combatants.get(familiar.combatantId)
      : undefined;
  const resolvedStatBlockId =
    familiar.status === "present"
      ? combatant?.origin.kind === "statBlock"
        ? combatant.origin.statBlockId
        : undefined
      : familiar.resolvedStatBlockId;
  if (resolvedStatBlockId === "stat_block_cat") return "cat";
  if (resolvedStatBlockId === "stat_block_rat") return "rat";
  return "none";
}

function creatureTypeOverride(raw: unknown): CreatureTypeOverride {
  return literalField(raw, CREATURE_TYPE_OVERRIDES);
}

function literalField<const T extends readonly string[]>(
  raw: unknown,
  values: T,
): T[number] {
  if (typeof raw === "string" && values.includes(raw)) {
    return raw;
  }
  throw new Error(`Unexpected literal value: ${String(raw)}.`);
}
