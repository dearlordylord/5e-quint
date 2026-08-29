import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleProcedureExecutionRefForSpellHoleForTest,
  resolveBattleSubject,
} from "./battle-runtime.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.companion-lifecycle
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay B22-FIND-FAMILIAR-IDENTITY-WITNESS find_familiar
// UNIT-IDENTITY-REPLAY: B22-FIND-FAMILIAR-IDENTITY-WITNESS find_familiar doCastFindFamiliar doRecastFindFamiliarReplacement doDismissAndReappearFindFamiliar doDeliverTouchSpellThroughFindFamiliar
import {
  DieRollResult,
  abilityModifier,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  spawnedCompanionFormEligibilityForSpell,
  type SpawnedCompanionFormEligibility,
} from "@dnd/surface/surface/find-familiar-forms";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { Result } from "effect";
import { expect, it } from "vitest";

import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.test-support.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";
import {
  characterCreature,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  cureWoundsUnitId,
  healingWordUnitId,
  statBlockCatalog,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  battleId,
  combatantId,
  castSpawnedCompanion,
  deliverTouchSpellThroughSpawnedCompanion,
  discoverBattleActs,
  spawnedCompanionForOwner,
  initiativeScore,
  reappearTemporarilyDismissedSpawnedCompanion,
  startBattle,
  temporarilyDismissSpawnedCompanion,
  type BattleState,
  type BattleCompanionState,
  battleReducerStartRouteEvent,
  type AvailableBattleAct,
  type BattleFill,
  type BattleHole,
  type BattleReducerRouteEvent,
  type BattleResolutionResult,
  type BattleRuntimeSession,
  type BattleSubject,
} from "./index.ts";

type SpawnedCompanionSelectedIdentityProjection = {
  readonly familiarStatus: BattleCompanionState["status"] | "none";
  readonly formId: string;
  readonly familiarCombatantPresent: boolean;
  readonly replacementCombatantPresent: boolean;
  readonly familiarReactionAvailable: boolean;
  readonly ownerActionAvailable: boolean;
  readonly ownerSpellSlotCommitted: boolean;
  readonly targetHp: number;
  readonly lastResult:
    | "init"
    | "cast"
    | "recast"
    | "dismissedAndReappeared"
    | "touchDelivered";
};
const spawnedCompanionLifecycleUnitId = "find_familiar";
const casterId = combatantId("find-familiar-selected-caster");
const familiarId = combatantId("find-familiar-selected-companion");
const replacementFamiliarId = combatantId("find-familiar-selected-replacement");
const targetId = combatantId("find-familiar-selected-target");

const spawnedCompanionLifecycleSpell = requireSpellRecord(
  spawnedCompanionLifecycleUnitId,
);
const cureWoundsSpell = requireSpellRecord(cureWoundsUnitId);
const healingWordSpell = requireSpellRecord(healingWordUnitId);
const familiarEligibility = requireSpawnedCompanionEligibility(
  spawnedCompanionFormEligibilityForSpell(spawnedCompanionLifecycleSpell),
);
const firstTypeOverride = familiarEligibility.creatureTypeOverrideChoices[0];
if (firstTypeOverride === undefined) {
  throw new Error("Expected Find Familiar creature type override choices.");
}

const FIND_FAMILIAR_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  Cast: "cast",
  Recast: "recast",
  DismissedAndReappeared: "dismissedAndReappeared",
  TouchDelivered: "touchDelivered",
} as const satisfies Readonly<
  Record<
    string,
    "init" | "cast" | "recast" | "dismissedAndReappeared" | "touchDelivered"
  >
>;

it("observes selected Find Familiar qRoute through public reducer events", () => {
  expect(observeCastSpawnedCompanionRoute()).toEqual(
    spawnedCompanionLifecycleCompanionLifecycleRoute(),
  );
  expect(observeRecastSpawnedCompanionReplacementRoute()).toEqual(
    spawnedCompanionLifecycleCompanionLifecycleRoute(),
  );
  expect(observeDismissAndReappearSpawnedCompanionRoute()).toEqual(
    spawnedCompanionLifecycleCompanionLifecycleRoute(),
  );
  expect(observeDeliverTouchSpellThroughSpawnedCompanionRoute()).toEqual(
    spawnedCompanionLifecycleTouchDeliveryRoute(),
  );
});

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Find Familiar selected identity replay",
  taskId: "B22-FIND-FAMILIAR-IDENTITY-WITNESS",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-find-familiar-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: FIND_FAMILIAR_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG,
  },
  projectionSchema: {
    familiarStatus: "str",
    formId: "str",
    familiarCombatantPresent: "bool",
    replacementCombatantPresent: "bool",
    familiarReactionAvailable: "bool",
    ownerActionAvailable: "bool",
    ownerSpellSlotCommitted: "bool",
    targetHp: "int",
    lastResult: "variant",
  },
  initialProjection: expectedSpawnedCompanionProjection({}),
  units: [
    {
      unitId: spawnedCompanionLifecycleUnitId,
      procedures: [
        {
          actionName: "doCastFindFamiliar",
          discover: castSpawnedCompanionProjection,
        },
        {
          actionName: "doRecastFindFamiliarReplacement",
          discover: recastSpawnedCompanionReplacementProjection,
        },
        {
          actionName: "doDismissAndReappearFindFamiliar",
          discover: dismissAndReappearSpawnedCompanionProjection,
        },
        {
          actionName: "doDeliverTouchSpellThroughFindFamiliar",
          discover: deliverTouchSpellThroughSpawnedCompanionProjection,
        },
      ],
    },
  ],
});

function observeCastSpawnedCompanionRoute(): readonly BattleReducerRouteEvent[] {
  const result = castCatFamiliar(startSpellcasterFixtureBattle());
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOf(result, "Find Familiar selected cast"),
  ];
}

function observeRecastSpawnedCompanionReplacementRoute(): readonly BattleReducerRouteEvent[] {
  const first = castCatFamiliar(startSpellcasterFixtureBattle());
  const second = castRatFamiliar(requireResolved(first));
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOf(second, "Find Familiar selected recast"),
  ];
}

function observeDismissAndReappearSpawnedCompanionRoute(): readonly BattleReducerRouteEvent[] {
  const cast = castCatFamiliar(startSpellcasterFixtureBattle());
  const dismissed = temporarilyDismissSpawnedCompanion({
    state: requireResolved(cast),
    casterId,
    heldObjectIds: [],
  });
  const reappeared = reappearTemporarilyDismissedSpawnedCompanion({
    state: withFreshMagicAction(requireResolved(dismissed)),
    casterId,
    catalog: statBlockCatalog,
    initiative: initiativeScore(14),
    placement: { kind: "unoccupiedSpaceWithin30Feet" },
  });
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOf(reappeared, "Find Familiar selected reappearance"),
  ];
}

function observeDeliverTouchSpellThroughSpawnedCompanionRoute(): readonly BattleReducerRouteEvent[] {
  const session = startSpellcasterFixtureSession();
  const state = requireResolved(castCatFamiliar(session.state));
  const act = touchDeliveryAct(
    battleRuntimeSessionForTest({ ...session, state }),
  );
  const targetFill = selectedTouchSpellTargetFill(
    requireHole(act.initialHoles, "targetChoice"),
  );
  const connectionFill = spawnedCompanionConnectionFill(
    requireHole(act.initialHoles, "spawnedCompanionConnection"),
  );
  const awaitingHealingRoll = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [connectionFill, targetFill],
  });
  if (awaitingHealingRoll.tag !== "needsHoles") {
    throw new Error(
      `Expected Companion touch delivery healing roll, got ${awaitingHealingRoll.tag}.`,
    );
  }
  const delivered = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      connectionFill,
      targetFill,
      healingRollFill(requireHole(awaitingHealingRoll.holes, "rolledDice")),
    ],
  });
  return [
    battleReducerStartRouteEvent(),
    ...routeEventsOf(act, "Find Familiar selected touch delivery discovery"),
    ...routeEventsOf(
      awaitingHealingRoll,
      "Find Familiar selected touch delivery target",
    ),
    ...routeEventsOf(delivered, "Find Familiar selected touch delivery roll"),
  ];
}

function spawnedCompanionLifecycleCompanionLifecycleRoute(): readonly BattleReducerRouteEvent[] {
  return [
    battleReducerStartRouteEvent(),
    {
      kind: "discoverBattleActs",
      subject: "companionLifecycle",
      holes: [],
      owner: "battleCompanion",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "companionLifecycle",
      holes: [],
      owner: "battleCompanion",
    },
  ];
}

function spawnedCompanionLifecycleTouchDeliveryRoute(): readonly BattleReducerRouteEvent[] {
  return [
    battleReducerStartRouteEvent(),
    {
      kind: "discoverBattleActs",
      subject: "companionTouchDelivery",
      holes: ["targetChoice"],
      owner: "battleSpellSlotAndActionEconomy",
    },
    {
      kind: "resolveBattleSubject",
      subject: "companionTouchDelivery",
      fill: "targetChoice",
      holes: ["rolledDice"],
      owner: "battleCompanion",
    },
    {
      kind: "resolveBattleSubject",
      subject: "companionTouchDelivery",
      fill: "rolledDice",
      holes: [],
      owner: "battleSpellSlotAndActionEconomy",
    },
    {
      kind: "resolveBattleSubjectWithoutFill",
      subject: "companionTouchDelivery",
      holes: [],
      owner: "battleActionEconomy",
    },
  ];
}

function castSpawnedCompanionProjection(): SpawnedCompanionSelectedIdentityProjection {
  const result = castCatFamiliar(startSpellcasterFixtureBattle());
  if (result.tag !== "resolved") {
    throw new Error(`Expected Find Familiar cast, got ${result.tag}.`);
  }
  return projectBattleCompanionState(result.state, "cast");
}

function recastSpawnedCompanionReplacementProjection(): SpawnedCompanionSelectedIdentityProjection {
  const first = castCatFamiliar(startSpellcasterFixtureBattle());
  if (first.tag !== "resolved") {
    throw new Error(`Expected initial Find Familiar cast, got ${first.tag}.`);
  }
  const second = castRatFamiliar(first.state);
  if (second.tag !== "resolved") {
    throw new Error(`Expected Find Familiar recast, got ${second.tag}.`);
  }
  return projectBattleCompanionState(second.state, "recast");
}

function dismissAndReappearSpawnedCompanionProjection(): SpawnedCompanionSelectedIdentityProjection {
  const cast = castCatFamiliar(startSpellcasterFixtureBattle());
  if (cast.tag !== "resolved") {
    throw new Error(`Expected Find Familiar cast, got ${cast.tag}.`);
  }
  const dismissed = temporarilyDismissSpawnedCompanion({
    state: cast.state,
    casterId,
    heldObjectIds: [],
  });
  if (dismissed.tag !== "resolved") {
    throw new Error(
      `Expected Find Familiar temporary dismissal, got ${dismissed.tag}.`,
    );
  }
  const reappeared = reappearTemporarilyDismissedSpawnedCompanion({
    state: withFreshMagicAction(dismissed.state),
    casterId,
    catalog: statBlockCatalog,
    initiative: initiativeScore(14),
    placement: { kind: "unoccupiedSpaceWithin30Feet" },
  });
  if (reappeared.tag !== "resolved") {
    throw new Error(
      `Expected Find Familiar reappearance, got ${reappeared.tag}.`,
    );
  }
  return projectBattleCompanionState(
    reappeared.state,
    "dismissedAndReappeared",
  );
}

function deliverTouchSpellThroughSpawnedCompanionProjection(): SpawnedCompanionSelectedIdentityProjection {
  const session = startSpellcasterFixtureSession();
  const cast = castCatFamiliar(session.state);
  if (cast.tag !== "resolved") {
    throw new Error(`Expected Find Familiar cast, got ${cast.tag}.`);
  }
  const cureWoundsAct = discoverBattleActs(
    battleRuntimeSessionForTest({
      ...session,
      state: cast.state,
    }),
  ).find(
    (act) =>
      act.subject.tag === "actionSpell" &&
      battleActSpellPresentation(act)?.invocation.spellId === cureWoundsUnitId,
  );
  if (cureWoundsAct?.subject.tag !== "actionSpell") {
    throw new Error("Expected Cure Wounds action spell act.");
  }
  const targetFill = selectedTouchSpellTargetFill(
    requireHole(cureWoundsAct.initialHoles, "targetChoice"),
  );
  const awaitingHealingRoll = deliverTouchSpellThroughSpawnedCompanion({
    state: cast.state,
    subject: cureWoundsAct.subject,
    fills: [targetFill],
    fact: {
      kind: "companionWithinCommunicationRangeOfOwner",
      ownerId: casterId,
      familiarId,
    },
  });
  if (awaitingHealingRoll.tag !== "needsHoles") {
    throw new Error(
      `Expected Companion touch delivery healing roll, got ${awaitingHealingRoll.tag}.`,
    );
  }
  const delivered = deliverTouchSpellThroughSpawnedCompanion({
    state: cast.state,
    subject: cureWoundsAct.subject,
    fills: [
      targetFill,
      {
        kind: "rolledDice",
        holeId: requireHole(awaitingHealingRoll.holes, "rolledDice").holeId,
        value: [{ results: [DieRollResult(4), DieRollResult(4)] }],
      },
    ],
    fact: {
      kind: "companionWithinCommunicationRangeOfOwner",
      ownerId: casterId,
      familiarId,
    },
  });
  if (delivered.tag !== "resolved") {
    throw new Error(`Expected Companion touch delivery, got ${delivered.tag}.`);
  }
  return projectBattleCompanionState(delivered.state, "touchDelivered");
}

function startSpellcasterFixtureBattle(): BattleState {
  return startSpellcasterFixtureSession().state;
}

function startSpellcasterFixtureSession(): BattleRuntimeSession {
  const result = startBattle({
    battleId: battleId("find-familiar-selected-identity-test"),
    combatants: [
      characterCreature({
        combatantId: casterId,
        displayName: "Caster",
        initiative: 12,
        spellcasting: {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "wizard",
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [cureWoundsSpell, healingWordSpell],
          featurePreparedSpells: [],
          spellAccesses: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
      characterCreature({
        combatantId: targetId,
        displayName: "Target",
        initiative: 10,
        currentHp: 1,
        maxHp: 12,
      }),
    ],
  });
  if (Result.isFailure(result)) {
    throw new Error(battleStateInitIssueMessage(result.failure));
  }
  return result.success;
}

function castCatFamiliar(state: BattleState) {
  return castSpawnedCompanion({
    state,
    casterId,
    ammunitionStocks: [],
    catalog: statBlockCatalog,
    eligibility: familiarEligibility,
    selection: {
      tag: "normalNamedForm",
      formId: "cat",
    },
    creatureTypeOverrideChoiceId: firstTypeOverride.optionId,
    familiarId,
    initiative: initiativeScore(18),
    placement: { kind: "unoccupiedSpaceWithinSpellRange" },
  });
}

function castRatFamiliar(state: BattleState) {
  return castSpawnedCompanion({
    state,
    casterId,
    ammunitionStocks: [],
    catalog: statBlockCatalog,
    eligibility: familiarEligibility,
    selection: {
      tag: "normalNamedForm",
      formId: "rat",
    },
    creatureTypeOverrideChoiceId: firstTypeOverride.optionId,
    familiarId: replacementFamiliarId,
    initiative: initiativeScore(15),
    placement: { kind: "unoccupiedSpaceWithinSpellRange" },
  });
}

function touchDeliveryAct(session: BattleRuntimeSession): AvailableBattleAct & {
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
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        cureWoundsUnitId,
  );
  if (act === undefined) {
    throw new Error("Expected Companion touch delivery act.");
  }
  return act;
}

function selectedTouchSpellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
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
        sourceProcedureRef:
          battleProcedureExecutionRefForSpellHoleForTest(hole),
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

function routeEventsOf(
  source: { readonly routeEvents?: readonly BattleReducerRouteEvent[] },
  label: string,
): readonly BattleReducerRouteEvent[] {
  if (source.routeEvents === undefined || source.routeEvents.length === 0) {
    throw new Error(`Expected public reducer route events for ${label}.`);
  }
  return source.routeEvents;
}

function requireResolved(result: BattleResolutionResult): BattleState {
  if (result.tag !== "resolved") {
    throw new Error(
      `Expected Find Familiar result to resolve, got ${result.tag}.`,
    );
  }
  return result.state;
}

function withFreshMagicAction(state: BattleState): BattleState {
  return {
    ...state,
    currentTurnResources: {
      ...state.currentTurnResources,
      actionResources: [{ kind: "action", source: "turn" }],
    },
  };
}

function requireSpellRecord(unitId: string): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected ${unitId} spell record.`);
  }
  return unit;
}

function requireSpawnedCompanionEligibility(
  eligibility: SpawnedCompanionFormEligibility | null,
): SpawnedCompanionFormEligibility {
  if (eligibility === null) {
    throw new Error("Expected Find Familiar form eligibility.");
  }
  return eligibility;
}

function expectedSpawnedCompanionProjection(
  input: Partial<SpawnedCompanionSelectedIdentityProjection>,
): SpawnedCompanionSelectedIdentityProjection {
  return {
    familiarStatus: "none",
    formId: "none",
    familiarCombatantPresent: false,
    replacementCombatantPresent: false,
    familiarReactionAvailable: false,
    ownerActionAvailable: true,
    ownerSpellSlotCommitted: false,
    targetHp: 1,
    lastResult: "init",
    ...input,
  };
}

function projectBattleCompanionState(
  state: BattleState,
  lastResult: SpawnedCompanionSelectedIdentityProjection["lastResult"],
): SpawnedCompanionSelectedIdentityProjection {
  const familiar = spawnedCompanionForOwner(state, casterId);
  return {
    familiarStatus: familiar?.status ?? "none",
    formId:
      familiar === null || familiar.status === "dismissedForever"
        ? "none"
        : resolvedFormProjection(state, familiar),
    familiarCombatantPresent: state.combatants.has(familiarId),
    replacementCombatantPresent: state.combatants.has(replacementFamiliarId),
    familiarReactionAvailable:
      state.combatants.get(familiarId)?.reactionAvailable ?? false,
    ownerActionAvailable: state.currentTurnResources.actionResources.some(
      (resource) => resource.kind === "action",
    ),
    ownerSpellSlotCommitted:
      state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    targetHp: Number(state.combatants.get(targetId)?.hp ?? 0),
    lastResult,
  };
}

function resolvedFormProjection(
  state: BattleState,
  familiar: Exclude<
    BattleCompanionState,
    { readonly status: "dismissedForever" }
  >,
): string {
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
  return resolvedStatBlockId ?? "none";
}
