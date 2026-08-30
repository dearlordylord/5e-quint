import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { resolveBattleSubject } from "./battle-runtime.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.companion-lifecycle
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.FIND_FAMILIAR_COMPANION_LIFECYCLE
// KERNEL-COVERAGE: parity-witness BATTLE.COMPOSITION.REDUCER_ROUTE_CONNECTOR
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
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  spawnedCompanionFormEligibilityForSpell,
  type SpawnedCompanionFormEligibility,
} from "@dnd/surface/surface/find-familiar-forms";
import { Result } from "effect";
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
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import {
  battleReducerStartRouteEvent,
  battleId,
  castSpawnedCompanion,
  combatantId,
  deliverTouchSpellThroughSpawnedCompanion,
  discoverBattleActs,
  spawnedCompanionEntryForOwner,
  spawnedCompanionTelepathicConnection,
  initiativeScore,
  reappearTemporarilyDismissedSpawnedCompanion,
  sameBattleSubject,
  shareSpawnedCompanionSenses,
  startBattle,
  temporarilyDismissSpawnedCompanion,
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
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import { statBlockCatalog } from "./unit-profile-admission-catalog.test-support.ts";
import { statBlockProcedurePresentations } from "./stat-block-presentation.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";

const FAMILIAR_STATUSES = ["none", "present"] as const;
type FamiliarStatus = (typeof FAMILIAR_STATUSES)[number];
const FAMILIAR_IDS = ["none", "primary"] as const;
type FamiliarIdentity = (typeof FAMILIAR_IDS)[number];
const FAMILIAR_FORMS = ["none", "cat", "rat"] as const;
type FamiliarForm = (typeof FAMILIAR_FORMS)[number];
const CREATURE_TYPE_OVERRIDES = ["none", "fey"] as const;
type CreatureTypeOverride = (typeof CREATURE_TYPE_OVERRIDES)[number];
const SPAWNED_COMPANION_LIFECYCLE_EVENT_TAGS = [
  "init",
  "createdCat",
  "replacedRat",
  "sharedSenses",
  "touchDelivered",
  "pactAttack",
] as const;
type SpawnedCompanionLifecycleEventTag =
  (typeof SPAWNED_COMPANION_LIFECYCLE_EVENT_TAGS)[number];
type SpawnedCompanionLifecycleEvent = {
  readonly [Tag in SpawnedCompanionLifecycleEventTag]: { readonly tag: Tag };
}[SpawnedCompanionLifecycleEventTag];
const FIND_FAMILIAR_COMPANION_LIFECYCLE_QNT_EVENT_TAGS = [
  "Init",
  "CreatedCat",
  "ReplacedRat",
  "SharedSenses",
  "TouchDelivered",
  "PactAttack",
] as const;
type FindFamiliarCompanionLifecycleQntEventTag =
  (typeof FIND_FAMILIAR_COMPANION_LIFECYCLE_QNT_EVENT_TAGS)[number];
const FIND_FAMILIAR_COMPANION_LIFECYCLE_EVENT_BY_TAG = {
  Init: "init",
  CreatedCat: "createdCat",
  ReplacedRat: "replacedRat",
  SharedSenses: "sharedSenses",
  TouchDelivered: "touchDelivered",
  PactAttack: "pactAttack",
} as const satisfies Readonly<
  Record<
    FindFamiliarCompanionLifecycleQntEventTag,
    SpawnedCompanionLifecycleEventTag
  >
>;

type SpawnedCompanionProjection = {
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
  readonly spellSlotCommitted: boolean;
  readonly targetHp: number;
  readonly event: SpawnedCompanionLifecycleEvent;
};

type SpawnedCompanionRuntimeState = {
  readonly battle: BattleRuntimeSession;
  readonly event: SpawnedCompanionLifecycleEvent;
};

const casterId = combatantId("find-familiar-mbt-caster");
const familiarId = combatantId("find-familiar-mbt-familiar");
const targetId = combatantId("find-familiar-mbt-target");
const initialTargetHp = 12;
const spawnedCompanionLifecycleSpell = spellRecord("find_familiar");
const cureWoundsSpell = spellRecord("cure_wounds");
const barkskinSpell = spellRecord("barkskin");
const familiarEligibility = requireSpawnedCompanionEligibility(
  spawnedCompanionFormEligibilityForSpell(spawnedCompanionLifecycleSpell),
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

const spawnedCompanionLifecycleCompanionRouteDriverSchema = {
  init: {},
  doRouteFamiliarCreation: {},
  doRouteFamiliarReplacement: {},
  doRouteFamiliarDismissalReappearance: {},
  doRouteSharedSenses: {},
  doRouteTouchDelivery: {},
  doRouteTouchDeliveryNoRoll: {},
  doRoutePactFamiliarAttack: {},
  step: {},
} as const;

function createSpawnedCompanionLifecycleDriver() {
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
      getState: () => spawnedCompanionLifecycleCompanionProjection(state),
    };
  });
}

type SpawnedCompanionRouteState = {
  readonly route: readonly ReducerRouteEvent[];
};

function createSpawnedCompanionRouteDriver() {
  return defineDriver(
    spawnedCompanionLifecycleCompanionRouteDriverSchema,
    () => {
      let route: readonly ReducerRouteEvent[] = [
        battleReducerStartRouteEvent(),
      ];
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
        doRouteTouchDeliveryNoRoll: () => {
          route = observeNoRollTouchDeliveryRoute();
        },
        doRoutePactFamiliarAttack: () => {
          route = observePactFamiliarAttackRoute();
        },
        step: () => {},
        getState: (): SpawnedCompanionRouteState => ({ route }),
      };
    },
  );
}

const spawnedCompanionLifecycleCompanionStateCheck = stateCheck(
  normalizeSpawnedCompanionQuintState,
  compareSpawnedCompanionStates,
);

const spawnedCompanionLifecycleCompanionRouteStateCheck = stateCheck(
  normalizeSpawnedCompanionRouteQuintState,
  (spec: SpawnedCompanionRouteState, impl: SpawnedCompanionRouteState) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

describe("Find Familiar companion lifecycle MBT parity", () => {
  it("creates and replaces one owner-linked companion with selected form and type facts", () => {
    const created = createCatFamiliar(initialRuntimeState());
    const replaced = replaceWithRatFamiliar(created);

    expect(spawnedCompanionLifecycleCompanionProjection(created)).toMatchObject(
      {
        familiarStatus: "present",
        familiarId: "primary",
        familiarForm: "cat",
        creatureTypeOverride: "fey",
        companionCount: 1,
        telepathyAvailable: true,
        event: { tag: "createdCat" },
      },
    );
    expect(
      spawnedCompanionLifecycleCompanionProjection(replaced),
    ).toMatchObject({
      familiarStatus: "present",
      familiarId: "primary",
      familiarForm: "rat",
      creatureTypeOverride: "fey",
      companionCount: 1,
      telepathyAvailable: true,
      event: { tag: "replacedRat" },
    });
  });

  it("projects telepathy, shared senses, and Touch delivery through runtime state", () => {
    const shared = shareSenses(createCatFamiliar(initialRuntimeState()));
    const delivered = deliverTouchSpell(shared);

    expect(spawnedCompanionLifecycleCompanionProjection(shared)).toMatchObject({
      telepathyAvailable: true,
      sharedSensesActive: true,
      bonusActionAvailable: false,
      familiarReactionAvailable: true,
      event: { tag: "sharedSenses" },
    });
    expect(
      spawnedCompanionLifecycleCompanionProjection(delivered),
    ).toMatchObject({
      familiarReactionAvailable: false,
      spellSlotCommitted: true,
      targetHp: initialTargetHp,
      event: { tag: "touchDelivered" },
    });
  });

  it("spends the owner Attack-action attack and familiar Reaction for Pact of the Chain", () => {
    const resolved = resolvePactFamiliarAttack(
      createCatFamiliar(initialRuntimeState()),
    );

    expect(
      spawnedCompanionLifecycleCompanionProjection(resolved),
    ).toMatchObject({
      ownerAttackAvailable: false,
      familiarReactionAvailable: false,
      targetHp: initialTargetHp - 1,
      event: { tag: "pactAttack" },
    });
  });

  it("preserves a spent familiar Reaction when the familiar adopts a new form", () => {
    const attacked = resolvePactFamiliarAttack(
      createCatFamiliar(initialRuntimeState()),
    );
    const replaced = replaceWithRatFamiliar(attacked);

    expect(
      spawnedCompanionLifecycleCompanionProjection(replaced),
    ).toMatchObject({
      familiarForm: "rat",
      familiarReactionAvailable: false,
      event: { tag: "replacedRat" },
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
        driver: createSpawnedCompanionLifecycleDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(5),
        stateCheck: spawnedCompanionLifecycleCompanionStateCheck,
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
        driver: createSpawnedCompanionRouteDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: spawnedCompanionLifecycleCompanionRouteStateCheck,
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
  const dismissed = temporarilyDismissSpawnedCompanion({
    state: created.battle.state,
    casterId,
    heldObjectIds: [],
  });
  const reappeared = reappearTemporarilyDismissedSpawnedCompanion({
    state: requireResolved(dismissed),
    casterId,
    catalog: statBlockCatalog,
    initiative: initiativeScore(18),
    placement: { kind: "unoccupiedSpaceWithin30Feet" },
  });
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOf(reappeared, "Companion reappearance"),
  ];
}

function observeSharedSensesRoute(): readonly ReducerRouteEvent[] {
  const session = createCatFamiliar(initialRuntimeState()).battle;
  const act = sharedSensesAct(session);
  const resolved = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      spawnedCompanionConnectionFill(
        requireHole(act.initialHoles, "spawnedCompanionConnection"),
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
  const connectionFill = spawnedCompanionConnectionFill(
    requireHole(act.initialHoles, "spawnedCompanionConnection"),
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

function observeNoRollTouchDeliveryRoute(): readonly ReducerRouteEvent[] {
  const session = createCatFamiliar(initialRuntimeState()).battle;
  const act = touchDeliveryAct(session, "barkskin");
  const connectionFill = spawnedCompanionConnectionFill(
    requireHole(act.initialHoles, "spawnedCompanionConnection"),
  );
  const targetFill = willingTouchSpellTargetFill(
    requireHole(act.initialHoles, "targetChoice"),
    act.subject.procedureRef,
  );
  const resolved = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [connectionFill, targetFill],
  });
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOf(act, "Find Familiar no-roll Touch delivery discovery"),
    ...routeEventsOf(resolved, "Find Familiar no-roll Touch delivery target"),
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
  const resolved = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [target, attackRoll],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected fixed-damage Pact familiar attack resolution.");
  }
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOf(act, "Pact familiar attack discovery"),
    ...routeEventsOf(awaitingTarget, "Pact familiar attack stat-block action"),
    ...routeEventsOf(awaitingAttackRoll, "Pact familiar attack target"),
    ...routeEventsOf(resolved, "Pact familiar attack roll"),
  ];
}

function initialRuntimeState(): SpawnedCompanionRuntimeState {
  const result = startBattle({
    battleId: battleId("find-familiar-companion-lifecycle-mbt"),
    combatants: [
      characterCreature({
        combatantId: casterId,
        displayName: "Pact Caster",
        initiative: 20,
        classLevels: [
          { className: "warlock", level: 3 },
          { className: "druid", level: 3 },
        ],
        spellcasting: {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "druid",
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [cureWoundsSpell, barkskinSpell],
          featurePreparedSpells: [],
          spellAccesses: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [
            {
              tag: "pactOfTheChainSpawnedCompanion",
              spell: spawnedCompanionLifecycleSpell,
            },
          ],
          spellSlots: [
            { spellLevel: 1, count: 1 },
            { spellLevel: 2, count: 1 },
          ],
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
  if (Result.isFailure(result)) {
    throw new Error(battleStateInitIssueMessage(result.failure));
  }
  return { battle: result.success, event: { tag: "init" } };
}

function createCatFamiliar(
  state: SpawnedCompanionRuntimeState,
): SpawnedCompanionRuntimeState {
  return castNormalFamiliar(state, "cat", "createdCat");
}

function replaceWithRatFamiliar(
  state: SpawnedCompanionRuntimeState,
): SpawnedCompanionRuntimeState {
  return castNormalFamiliar(state, "rat", "replacedRat");
}

function castNormalFamiliar(
  state: SpawnedCompanionRuntimeState,
  formId: Extract<FamiliarForm, "cat" | "rat">,
  event: Extract<
    SpawnedCompanionLifecycleEventTag,
    "createdCat" | "replacedRat"
  >,
): SpawnedCompanionRuntimeState {
  const result = castNormalFamiliarResult(state, formId);
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: requireResolved(result),
    }),
    event: { tag: event },
  };
}

function castNormalFamiliarResult(
  state: SpawnedCompanionRuntimeState,
  formId: Extract<FamiliarForm, "cat" | "rat">,
): BattleResolutionResult {
  return castSpawnedCompanion({
    state: state.battle.state,
    casterId,
    ammunitionStocks: [],
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
  state: SpawnedCompanionRuntimeState,
): SpawnedCompanionRuntimeState {
  const result = shareSpawnedCompanionSenses({
    state: state.battle.state,
    casterId,
    fact: familiarWithin100FeetFact(),
  });
  return {
    battle: battleRuntimeSessionForTest({
      ...state.battle,
      state: requireResolved(result),
    }),
    event: { tag: "sharedSenses" },
  };
}

function deliverTouchSpell(
  state: SpawnedCompanionRuntimeState,
): SpawnedCompanionRuntimeState {
  const act = actionSpellAct(state.battle, "cure_wounds");
  const targetFill = touchSpellTargetFill(
    requireHole(act.initialHoles, "targetChoice"),
    act.subject.procedureRef,
  );
  const awaitingHealingRoll = deliverTouchSpellThroughSpawnedCompanion({
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
  const result = deliverTouchSpellThroughSpawnedCompanion({
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
    event: { tag: "touchDelivered" },
  };
}

function resolvePactFamiliarAttack(
  state: SpawnedCompanionRuntimeState,
): SpawnedCompanionRuntimeState {
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
    event: { tag: "pactAttack" },
  };
}

function spawnedCompanionLifecycleCompanionProjection(
  state: SpawnedCompanionRuntimeState,
): SpawnedCompanionProjection {
  const familiarEntry = spawnedCompanionEntryForOwner(
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
  const connection = spawnedCompanionTelepathicConnection(
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
        effect.kind === "spawnedCompanionSharedSenses" &&
        effect.familiarId === familiarId,
    ),
    bonusActionAvailable: canSpendBonusAction(
      state.battle.state.currentTurnResources,
    ),
    ownerAttackAvailable:
      state.battle.state.currentTurnResources.actionResources.length > 0,
    familiarReactionAvailable,
    spellSlotCommitted,
    targetHp,
    event: state.event,
  } satisfies SpawnedCompanionProjection;
  expect(projection.companionCount).toBe(
    projection.familiarStatus === "present" ? 1 : 0,
  );
  return projection;
}

function familiarWithin100FeetFact() {
  return {
    kind: "companionWithinCommunicationRangeOfOwner" as const,
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
    { readonly tag: "spawnedCompanionSharedSenses" }
  >;
} {
  const act = discoverBattleActs(session).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "spawnedCompanionSharedSenses" }
      >;
    } => candidate.subject.tag === "spawnedCompanionSharedSenses",
  );
  if (act === undefined) {
    throw new Error("Expected Share Familiar Senses act.");
  }
  return act;
}

function touchDeliveryAct(
  session: BattleRuntimeSession,
  spellId: "cure_wounds" | "barkskin" = "cure_wounds",
): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "spawnedCompanionTouchSpellProxy" }
  >;
} {
  const act = discoverBattleActs(session).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "spawnedCompanionTouchSpellProxy" }
      >;
    } =>
      candidate.subject.tag === "spawnedCompanionTouchSpellProxy" &&
      battleActSpellPresentation(candidate)?.invocation.spellId === spellId,
  );
  if (act === undefined) {
    throw new Error(`Expected Find Familiar ${spellId} Touch delivery act.`);
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
      candidate.subject.tag === "companionAttack" &&
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

function requireSpawnedCompanionEligibility(
  eligibility: SpawnedCompanionFormEligibility | null,
): SpawnedCompanionFormEligibility {
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
        kind: "spawnedCompanionTouchSpellTarget",
        ownerId: casterId,
        familiarId,
        targetId,
        sourceProcedureRef: procedureRef,
      },
    ],
  };
}

function spawnedCompanionConnectionFill(
  hole: Extract<BattleHole, { readonly kind: "spawnedCompanionConnection" }>,
): Extract<BattleFill, { readonly kind: "spawnedCompanionConnection" }> {
  return {
    kind: "spawnedCompanionConnection",
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
    tag: "companionAttack",
    actorId: casterId,
    familiarId,
    procedureRef,
    statBlockDamageNotation: "static",
  };
}

function willingTouchSpellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  procedureRef: Extract<
    BattleSubject,
    { readonly tag: "spawnedCompanionTouchSpellProxy" }
  >["procedureRef"],
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: casterId,
    spatialFacts: [
      {
        kind: "spawnedCompanionTouchSpellTarget",
        ownerId: casterId,
        familiarId,
        targetId: casterId,
        sourceProcedureRef: procedureRef,
      },
      {
        kind: "spellTargetKnownWilling",
        casterId,
        targetId: casterId,
        sourceProcedureRef: procedureRef,
      },
    ],
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
  const resolved = resolveBattleSubject({
    state,
    subject,
    fills: [target, attackRoll],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected fixed-damage Pact familiar attack resolution.");
  }
  return [target, attackRoll];
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
        kind: "attackTargetDistance",
        actorId: familiarId,
        targetId,
        distanceFeet: movementFeet(5),
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

function normalizeSpawnedCompanionQuintState(
  raw: unknown,
): SpawnedCompanionProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: spawnedCompanionLifecycleCompanionUnexpectedHole,
  });
  if (protocol.holes.length !== 0) {
    throw new Error(
      "Expected Find Familiar companion witness holes to be empty.",
    );
  }
  const event = spawnedCompanionLifecycleEvent(state["qEvent"]);
  assertWitnessProtocolConsistentWithScenario({
    label: "Find Familiar companion lifecycle",
    scenarioOutcome: event.tag,
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
    spellSlotCommitted: booleanField(state, "qSpellSlotCommitted"),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    event,
  };
}

function normalizeSpawnedCompanionRouteQuintState(
  raw: unknown,
): SpawnedCompanionRouteState {
  const state = quintStateRecord(raw);
  return {
    route: decodeReducerRoute(quintField(state, "qRoute")),
  };
}

function spawnedCompanionLifecycleCompanionUnexpectedHole(raw: unknown): never {
  throw new Error(
    `Unexpected Find Familiar companion witness hole ${String(raw)}.`,
  );
}

function spawnedCompanionLifecycleEvent(
  raw: unknown,
): SpawnedCompanionLifecycleEvent {
  const tag = literalField(
    quintVariantTag(raw, "qEvent"),
    FIND_FAMILIAR_COMPANION_LIFECYCLE_QNT_EVENT_TAGS,
  );
  const value = FIND_FAMILIAR_COMPANION_LIFECYCLE_EVENT_BY_TAG[tag];
  return { tag: value };
}

function compareSpawnedCompanionStates(
  spec: SpawnedCompanionProjection,
  implementation: SpawnedCompanionProjection,
): boolean {
  try {
    expect(implementation).toEqual(spec);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `${error.message}\n${JSON.stringify({ spec, implementation }, null, 2)}`,
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
