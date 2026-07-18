// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1H-ANIMAL-FRIENDSHIP animal_friendship
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1H-PROTECTION-EVIL-GOOD protection_from_evil_and_good
// UNIT-IDENTITY-REPLAY: L1H-ANIMAL-FRIENDSHIP animal_friendship doDiscoverAnimalFriendshipBeastTargetAdmission doResolveAnimalFriendshipFailedSaveCharmed doResolveAnimalFriendshipCasterDamageBreak
// UNIT-IDENTITY-REPLAY: L1H-PROTECTION-EVIL-GOOD protection_from_evil_and_good doResolveProtectionFromEvilAndGoodKnownWillingTargetProtection doProjectProtectionFromEvilAndGoodScopedAttackDisadvantage doPreventProtectionFromEvilAndGoodScopedCharmAndPossession doResolveProtectionFromEvilAndGoodRelevantCharmSaveAdvantage
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.CREATURE_TYPE_PROTECTION_AND_CONDITION_PREVENTION
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  Hp,
  abilityModifier,
  attackBonus,
  difficultyClass,
  movementFeet,
  proficiencyBonus,
  type Condition,
} from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord, StatBlockRecord } from "@dnd/surface/surface/types";

import {
  battleCombatantSide,
  battleId,
  battleReducerStartRouteEvent,
  characterId,
  combatantId,
  discoverBattleActs,
  endTurn,
  initiativeScore,
  resolveBattleSubject,
  resolveBattlePossessionAttempt,
  snapshotBattle,
  spellId,
  startBattle,
  type AvailableBattleAct,
  type BattleActiveEffect,
  type BattleAttackExecutionSelection,
  type BattleCreatureInit,
  type BattleReducerRouteEvent,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
  type SupportedSpellInvocation,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import {
  attackRollFill,
  damageRollFillWithGroups,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  applyFailedSaveSpellConditionEffects,
  selectFailedSaveConditionEffect,
} from "./battle-reducer/spells-active-effects.ts";
import { applyPreparedSlotSpellDamage } from "./battle-reducer/spells-damage-fills.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";
import {
  MBT_TEST_TIMEOUT_MS,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  reducerRoutedProtectionCharmStateCheck,
  run,
  type ReducerRouteEvent,
} from "./battle-runtime-mbt-driver-kit.ts";

type CreatureTypeProtectionAndCharmSelectedIdentityLastResult =
  | "init"
  | "discovered"
  | "resolved"
  | "damageBreakResolved"
  | "protectionResolved"
  | "protectionAttackProjected"
  | "protectionCharmPrevented"
  | "protectionRelevantSaveResolved";

const CREATURE_TYPE_PROTECTION_AND_CHARM_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG =
  {
    Init: "init",
    Discovered: "discovered",
    Resolved: "resolved",
    DamageBreakResolved: "damageBreakResolved",
    ProtectionResolved: "protectionResolved",
    ProtectionAttackProjected: "protectionAttackProjected",
    ProtectionCharmPrevented: "protectionCharmPrevented",
    ProtectionRelevantSaveResolved: "protectionRelevantSaveResolved",
  } as const;

type AnimalFriendshipTargetAdmission = {
  readonly beastTargetAdmitted: boolean;
  readonly humanoidTargetAdmitted: boolean;
};
type ProtectionFromEvilAndGoodEvidence = {
  readonly knownWillingProtectionTargetAdmitted: boolean;
  readonly plainProtectionTargetRejected: boolean;
  readonly protectionEffectPresent: boolean;
  readonly scopedAttackRollDisadvantage: boolean;
  readonly unscopedAttackRollNormal: boolean;
  readonly scopedCharmPrevented: boolean;
  readonly unscopedCharmApplied: boolean;
  readonly scopedPossessionPrevented: boolean;
  readonly unscopedPossessionUnprevented: boolean;
  readonly relevantCharmSaveHasAdvantage: boolean;
  readonly relevantCharmSaveCleared: boolean;
};
type CreatureTypeProtectionAndCharmSelectedIdentityProjection = {
  readonly beastTargetAdmitted: boolean;
  readonly humanoidTargetAdmitted: boolean;
  readonly knownWillingProtectionTargetAdmitted: boolean;
  readonly plainProtectionTargetRejected: boolean;
  readonly protectionEffectPresent: boolean;
  readonly scopedAttackRollDisadvantage: boolean;
  readonly unscopedAttackRollNormal: boolean;
  readonly scopedCharmPrevented: boolean;
  readonly unscopedCharmApplied: boolean;
  readonly scopedPossessionPrevented: boolean;
  readonly unscopedPossessionUnprevented: boolean;
  readonly relevantCharmSaveHasAdvantage: boolean;
  readonly relevantCharmSaveCleared: boolean;
  readonly targetCharmed: boolean;
  readonly animalFriendshipEffectPresent: boolean;
  readonly actionAvailable: boolean;
  readonly firstLevelSlotsExpended: number;
  readonly lastResult: CreatureTypeProtectionAndCharmSelectedIdentityLastResult;
};
type CreatureTypeProtectionAndCharmSelectedIdentityAction =
  | "doDiscoverAnimalFriendshipBeastTargetAdmission"
  | "doResolveAnimalFriendshipFailedSaveCharmed"
  | "doResolveAnimalFriendshipCasterDamageBreak"
  | "doResolveProtectionFromEvilAndGoodKnownWillingTargetProtection"
  | "doProjectProtectionFromEvilAndGoodScopedAttackDisadvantage"
  | "doPreventProtectionFromEvilAndGoodScopedCharmAndPossession"
  | "doResolveProtectionFromEvilAndGoodRelevantCharmSaveAdvantage";
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly CreatureTypeProtectionAndCharmSelectedIdentityAction[];
  readonly expected: CreatureTypeProtectionAndCharmSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId: "L1H-ANIMAL-FRIENDSHIP" | "L1H-PROTECTION-EVIL-GOOD";
  readonly unitId: SelectedCreatureTypeProtectionAndCharmSpellUnitId;
  readonly actions: readonly CreatureTypeProtectionAndCharmSelectedIdentityAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

const animalFriendshipUnitId = "animal_friendship";
const charmPersonUnitId = "charm_person";
const protectionFromEvilAndGoodUnitId = "protection_from_evil_and_good";
type SelectedCreatureTypeProtectionAndCharmSpellUnitId =
  | typeof animalFriendshipUnitId
  | typeof protectionFromEvilAndGoodUnitId;
type CreatureTypeProtectionAndCharmCatalogSpellUnitId =
  | SelectedCreatureTypeProtectionAndCharmSpellUnitId
  | typeof charmPersonUnitId;

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};
type StatBlockAttackAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    {
      readonly tag: "action";
      readonly action: "attack";
      readonly procedureRef: unknown;
    }
  >;
};
type CharacterCreatureInit = Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>;
type CharacterClassName =
  CharacterCreatureInit["classLevels"][number]["className"];
type CharacterSpellcastingInit = NonNullable<
  CharacterCreatureInit["spellcasting"]
>;

const casterId = combatantId(
  "creature-type-protection-and-charm-selected-identity-caster",
);
const casterAllyId = combatantId(
  "creature-type-protection-and-charm-selected-identity-caster-ally",
);
const beastTargetId = combatantId(
  "creature-type-protection-and-charm-selected-identity-beast",
);
const humanoidTargetId = combatantId(
  "creature-type-protection-and-charm-selected-identity-humanoid",
);
const protectedTargetId = combatantId(
  "creature-type-protection-and-charm-selected-identity-protected-target",
);
const undeadAttackerId = combatantId(
  "creature-type-protection-and-charm-selected-identity-undead-attacker",
);
const humanoidAttackerId = combatantId(
  "creature-type-protection-and-charm-selected-identity-humanoid-attacker",
);
const feySourceId = combatantId(
  "creature-type-protection-and-charm-selected-identity-fey-source",
);
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error(
    "Creature Type Protection and Charm selected identity catalogs must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;
const statBlockCatalog = statBlockCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "L1H-ANIMAL-FRIENDSHIP",
    unitId: "animal_friendship",
    actions: [
      "doDiscoverAnimalFriendshipBeastTargetAdmission",
      "doResolveAnimalFriendshipFailedSaveCharmed",
      "doResolveAnimalFriendshipCasterDamageBreak",
    ],
    sequences: [
      {
        name: "beast-target-admitted-and-humanoid-excluded",
        actions: ["doDiscoverAnimalFriendshipBeastTargetAdmission"],
        expected: expectedProjection({
          beastTargetAdmitted: true,
          lastResult: "discovered",
        }),
      },
      {
        name: "failed-wisdom-saving-throw-applies-source-owned-charmed",
        actions: ["doResolveAnimalFriendshipFailedSaveCharmed"],
        expected: expectedProjection({
          beastTargetAdmitted: true,
          targetCharmed: true,
          animalFriendshipEffectPresent: true,
          actionAvailable: false,
          firstLevelSlotsExpended: 1,
          lastResult: "resolved",
        }),
      },
      {
        name: "caster-damage-break-clears-source-owned-charmed",
        actions: ["doResolveAnimalFriendshipCasterDamageBreak"],
        expected: expectedProjection({
          beastTargetAdmitted: true,
          actionAvailable: false,
          firstLevelSlotsExpended: 1,
          lastResult: "damageBreakResolved",
        }),
      },
    ],
  },
  {
    taskId: "L1H-PROTECTION-EVIL-GOOD",
    unitId: "protection_from_evil_and_good",
    actions: [
      "doResolveProtectionFromEvilAndGoodKnownWillingTargetProtection",
      "doProjectProtectionFromEvilAndGoodScopedAttackDisadvantage",
      "doPreventProtectionFromEvilAndGoodScopedCharmAndPossession",
      "doResolveProtectionFromEvilAndGoodRelevantCharmSaveAdvantage",
    ],
    sequences: [
      {
        name: "known-willing-target-creates-concentration-protection",
        actions: [
          "doResolveProtectionFromEvilAndGoodKnownWillingTargetProtection",
        ],
        expected: expectedProjection({
          knownWillingProtectionTargetAdmitted: true,
          plainProtectionTargetRejected: true,
          protectionEffectPresent: true,
          actionAvailable: false,
          firstLevelSlotsExpended: 1,
          lastResult: "protectionResolved",
        }),
      },
      {
        name: "scoped-creature-type-attacker-rolls-with-disadvantage",
        actions: ["doProjectProtectionFromEvilAndGoodScopedAttackDisadvantage"],
        expected: expectedProjection({
          knownWillingProtectionTargetAdmitted: true,
          plainProtectionTargetRejected: true,
          protectionEffectPresent: true,
          scopedAttackRollDisadvantage: true,
          unscopedAttackRollNormal: true,
          actionAvailable: false,
          firstLevelSlotsExpended: 1,
          lastResult: "protectionAttackProjected",
        }),
      },
      {
        name: "scoped-creature-type-charm-and-possession-are-prevented",
        actions: ["doPreventProtectionFromEvilAndGoodScopedCharmAndPossession"],
        expected: expectedProjection({
          knownWillingProtectionTargetAdmitted: true,
          plainProtectionTargetRejected: true,
          protectionEffectPresent: true,
          scopedCharmPrevented: true,
          unscopedCharmApplied: true,
          scopedPossessionPrevented: true,
          unscopedPossessionUnprevented: true,
          actionAvailable: false,
          firstLevelSlotsExpended: 1,
          lastResult: "protectionCharmPrevented",
        }),
      },
      {
        name: "already-applied-scoped-charm-save-has-advantage",
        actions: [
          "doResolveProtectionFromEvilAndGoodRelevantCharmSaveAdvantage",
        ],
        expected: expectedProjection({
          knownWillingProtectionTargetAdmitted: true,
          plainProtectionTargetRejected: true,
          protectionEffectPresent: true,
          relevantCharmSaveHasAdvantage: true,
          relevantCharmSaveCleared: true,
          actionAvailable: false,
          firstLevelSlotsExpended: 1,
          lastResult: "protectionRelevantSaveResolved",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

const creatureTypeProtectionAndCharmDiscoveries = {
  doDiscoverAnimalFriendshipBeastTargetAdmission: () => {
    const state = animalFriendshipBattle();
    return projectCreatureTypeProtectionAndCharmSelectedIdentityState(
      state,
      animalFriendshipTargetAdmission(state),
      emptyProtectionFromEvilAndGoodEvidence(),
      "discovered",
    );
  },
  doResolveAnimalFriendshipFailedSaveCharmed: () => {
    const state = animalFriendshipBattle();
    return projectCreatureTypeProtectionAndCharmSelectedIdentityState(
      resolveAnimalFriendshipFailedSave(state),
      animalFriendshipTargetAdmission(state),
      emptyProtectionFromEvilAndGoodEvidence(),
      "resolved",
    );
  },
  doResolveAnimalFriendshipCasterDamageBreak: () => {
    const state = animalFriendshipBattle();
    return projectCreatureTypeProtectionAndCharmSelectedIdentityState(
      applyPreparedSlotSpellDamage(
        resolveAnimalFriendshipFailedSave(state),
        beastTargetId,
        1,
        { damageSourceId: casterId, spatialFacts: [] },
      ),
      animalFriendshipTargetAdmission(state),
      emptyProtectionFromEvilAndGoodEvidence(),
      "damageBreakResolved",
    );
  },
  doResolveProtectionFromEvilAndGoodKnownWillingTargetProtection: () =>
    protectionProjection(
      resolveProtectionFromEvilAndGood(),
      "protectionResolved",
    ),
  doProjectProtectionFromEvilAndGoodScopedAttackDisadvantage: () =>
    protectionProjection(
      projectProtectionFromEvilAndGoodAttackRollModes(),
      "protectionAttackProjected",
    ),
  doPreventProtectionFromEvilAndGoodScopedCharmAndPossession: () =>
    protectionProjection(
      projectProtectionFromEvilAndGoodCharmBoundary(),
      "protectionCharmPrevented",
    ),
  doResolveProtectionFromEvilAndGoodRelevantCharmSaveAdvantage: () =>
    protectionProjection(
      resolveProtectionFromEvilAndGoodRelevantCharmSave(),
      "protectionRelevantSaveResolved",
    ),
} as const satisfies Record<
  CreatureTypeProtectionAndCharmSelectedIdentityAction,
  () => CreatureTypeProtectionAndCharmSelectedIdentityProjection
>;

const protectionCharmRouteDriverSchema = {
  init: {},
  doDiscoverAnimalFriendshipBeastTargetAdmission: {},
  doResolveAnimalFriendshipFailedSaveCharmed: {},
  doResolveAnimalFriendshipCasterDamageBreak: {},
  doResolveProtectionFromEvilAndGoodKnownWillingTargetProtection: {},
  doProjectProtectionFromEvilAndGoodScopedAttackDisadvantage: {},
  doPreventProtectionFromEvilAndGoodScopedCharmAndPossession: {},
  doResolveProtectionFromEvilAndGoodRelevantCharmSaveAdvantage: {},
  step: {},
} as const;

function createPublicProtectionCharmRouteDriver() {
  return defineDriver(protectionCharmRouteDriverSchema, () => {
    let route: readonly ReducerRouteEvent[] = initialProtectionCharmRoute();
    return {
      init: () => {
        route = initialProtectionCharmRoute();
      },
      doDiscoverAnimalFriendshipBeastTargetAdmission: () => {
        route = publicAnimalFriendshipTargetAdmissionRoute();
      },
      doResolveAnimalFriendshipFailedSaveCharmed: () => {
        route = publicAnimalFriendshipFailedSaveRoute();
      },
      doResolveAnimalFriendshipCasterDamageBreak: () => {
        route = publicAnimalFriendshipCasterDamageBreakRoute();
      },
      doResolveProtectionFromEvilAndGoodKnownWillingTargetProtection: () => {
        route = publicProtectionFromEvilAndGoodResolvedRoute();
      },
      doProjectProtectionFromEvilAndGoodScopedAttackDisadvantage: () => {
        route = publicProtectionFromEvilAndGoodAttackRollModeRoute();
      },
      doPreventProtectionFromEvilAndGoodScopedCharmAndPossession: () => {
        route = publicProtectionFromEvilAndGoodPreventionRoute();
      },
      doResolveProtectionFromEvilAndGoodRelevantCharmSaveAdvantage: () => {
        route = publicProtectionFromEvilAndGoodRelevantSaveRoute();
      },
      step: () => {},
      getState: () => ({ route }),
    };
  });
}

describe("Creature Type Protection and Charm public reducer qRoute replay", () => {
  it(
    "observes copied protection/charm qRoute through public battle runtime entrypoints",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-creature-type-protection-and-charm-selected-identity.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createPublicProtectionCharmRouteDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: reducerRoutedProtectionCharmStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Creature Type Protection and Charm selected identity replay",
  taskId: "creature-type-protection-and-charm-selected-identity",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-creature-type-protection-and-charm-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult:
      CREATURE_TYPE_PROTECTION_AND_CHARM_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG,
  },
  projectionSchema: {
    beastTargetAdmitted: "bool",
    humanoidTargetAdmitted: "bool",
    knownWillingProtectionTargetAdmitted: "bool",
    plainProtectionTargetRejected: "bool",
    protectionEffectPresent: "bool",
    scopedAttackRollDisadvantage: "bool",
    unscopedAttackRollNormal: "bool",
    scopedCharmPrevented: "bool",
    unscopedCharmApplied: "bool",
    scopedPossessionPrevented: "bool",
    unscopedPossessionUnprevented: "bool",
    relevantCharmSaveHasAdvantage: "bool",
    relevantCharmSaveCleared: "bool",
    targetCharmed: "bool",
    animalFriendshipEffectPresent: "bool",
    actionAvailable: "bool",
    firstLevelSlotsExpended: "int",
    lastResult: "variant",
  },
  initialProjection: expectedProjection(),
  units: selectedUnitIdentityReplays.map((replay) => ({
    unitId: replay.unitId,
    procedures: replay.sequences.map((sequence) => {
      const actionName = singleReplayAction(
        replay.unitId,
        sequence.name,
        sequence.actions,
      );
      return {
        actionName,
        discover: creatureTypeProtectionAndCharmDiscoveries[actionName],
      };
    }),
  })),
});

function singleReplayAction(
  unitId: SelectedCreatureTypeProtectionAndCharmSpellUnitId,
  sequenceName: string,
  actions: readonly CreatureTypeProtectionAndCharmSelectedIdentityAction[],
): CreatureTypeProtectionAndCharmSelectedIdentityAction {
  if (actions.length !== 1 || actions[0] === undefined) {
    throw new Error(
      `Expected single Creature Type Protection and Charm selected identity replay action for ${unitId}:${sequenceName}.`,
    );
  }
  return actions[0];
}

function initialProtectionCharmRoute(): readonly ReducerRouteEvent[] {
  return [battleReducerStartRouteEvent()];
}

function publicAnimalFriendshipTargetAdmissionRoute(): readonly ReducerRouteEvent[] {
  const state = animalFriendshipBattle();
  const act = animalFriendshipSpellAct(state);
  return [
    ...initialProtectionCharmRoute(),
    ...routeEventsWithSubject(act, "creatureTypeTargetAdmission"),
  ];
}

function publicAnimalFriendshipFailedSaveRoute(): readonly ReducerRouteEvent[] {
  const walk = resolveAnimalFriendshipFailedSaveWalk(animalFriendshipBattle());
  return [
    ...initialProtectionCharmRoute(),
    ...routeEventsWithSubject(walk.act, "protectionCharmActiveEffect"),
    ...routeEventsOf(walk.awaitingSave),
    ...routeEventsOf(walk.resolved),
  ];
}

function publicAnimalFriendshipCasterDamageBreakRoute(): readonly ReducerRouteEvent[] {
  const walk = resolveAnimalFriendshipFailedSaveWalk(animalFriendshipBattle());
  const allyTurn = requireResolvedState(
    endTurn({ state: walk.resolved.state, actorId: casterId }),
    "Expected to advance to the caster ally.",
  );
  const attack = statBlockAttackAct(allyTurn, casterAllyId, "Scimitar");
  const targetHole = requireResultHole(
    resolveBattleSubject({
      state: allyTurn,
      subject: attack.subject,
      fills: [],
    }),
    "targetChoice",
  );
  const attackTarget = attackTargetFill(
    targetHole,
    casterAllyId,
    beastTargetId,
    attack.subject,
  );
  const targetFill = attackTarget;
  const awaitingAttack = resolveBattleSubject({
    state: allyTurn,
    subject: attack.subject,
    fills: [targetFill],
  });
  const attackHole = requireResultHole(awaitingAttack, "attackRoll");
  const attackFill = attackRollFill(attackHole, {
    total: 15,
    naturalD20: 10,
  });
  const awaitingDamage = resolveBattleSubject({
    state: allyTurn,
    subject: attack.subject,
    fills: [targetFill, attackFill],
  });
  const damageHole = requireResultHole(awaitingDamage, "rolledDice");
  const damageFill = damageRollFillWithGroups(damageHole, [[1]]);
  const relationshipHole = requireResultHole(
    resolveBattleSubject({
      state: allyTurn,
      subject: attack.subject,
      fills: [targetFill, attackFill, damageFill],
    }),
    "damageRelationshipDecisions",
  );
  expect(relationshipHole).toMatchObject({
    damageEventHoleId: damageHole.holeId,
    damageSourceId: casterAllyId,
    targetIds: [beastTargetId],
    questions: [
      {
        kind: "targetDamagedByCasterOrAlly",
        targetId: beastTargetId,
        effectSourceId: casterId,
      },
    ],
  });
  const resolvedDamage = requireResolvedResult(
    resolveBattleSubject({
      state: allyTurn,
      subject: attack.subject,
      fills: [
        targetFill,
        attackFill,
        damageFill,
        {
          kind: "damageRelationshipDecisions",
          holeId: relationshipHole.holeId,
          answers: [
            {
              questionId: relationshipHole.questions[0].questionId,
              answer: true,
            },
          ],
        },
      ],
    }),
    "Expected ally weapon damage to break Animal Friendship.",
  );
  expect(
    resolvedDamage.state.combatants
      .get(beastTargetId)
      ?.activeEffects.some(
        (effect) =>
          effect.kind === "spellCondition" &&
          effect.escape?.kind === "targetDamagedByCasterOrAlly",
      ),
  ).toBe(false);
  return [
    ...publicAnimalFriendshipFailedSaveRoute(),
    ...routeEventsOf(resolvedDamage).filter(
      (event) =>
        "subject" in event && event.subject === "charmSourceDamageBreak",
    ),
  ];
}

function publicProtectionFromEvilAndGoodResolvedRoute(): readonly ReducerRouteEvent[] {
  const resolved = resolveProtectionFromEvilAndGoodWalk();
  return [
    ...initialProtectionCharmRoute(),
    ...routeEventsOf(resolved.act),
    ...routeEventsOf(resolved.resolved),
  ];
}

function publicProtectionFromEvilAndGoodAttackRollModeRoute(): readonly ReducerRouteEvent[] {
  const protectedState = resolveProtectionFromEvilAndGoodWalk().resolved.state;
  const undeadTurn =
    protectionFromEvilAndGoodUndeadAttackerTurn(protectedState);
  const attack = statBlockAttackAct(undeadTurn, undeadAttackerId, "Scimitar");
  const targetHole = requireResultHole(
    resolveBattleSubject({
      state: undeadTurn,
      subject: attack.subject,
      fills: [],
    }),
    "targetChoice",
  );
  const awaitingAttack = resolveBattleSubject({
    state: undeadTurn,
    subject: attack.subject,
    fills: [
      attackTargetFill(
        targetHole,
        undeadAttackerId,
        protectedTargetId,
        attack.subject,
      ),
    ],
  });
  return [
    ...initialProtectionCharmRoute(),
    ...routeEventsOf(awaitingAttack).filter(
      (event) =>
        "subject" in event && event.subject === "protectionCharmActiveEffect",
    ),
  ];
}

function publicProtectionFromEvilAndGoodPreventionRoute(): readonly ReducerRouteEvent[] {
  const resolved = resolveProtectionFromEvilAndGood();
  const protectedTargetTurn = protectionFromEvilAndGoodProtectedTargetTurn(
    resolved.state,
  );
  const scopedCharm = requireResolvedResult(
    resolveBattleSubject({
      state: protectedTargetTurn,
      subject: {
        tag: "runtimeCommand",
        actorId: protectedTargetId,
        command: "creatureTypeProtectionConditionAttempt",
        sourceCombatantId: feySourceId,
        condition: "charmed",
      },
      fills: [],
    }),
    "Expected scoped Charmed condition attempt to resolve.",
  );
  if (
    spellConditionPresentOnProtectedTarget(
      scopedCharm.state,
      feySourceId,
      protectionFromEvilAndGoodUnitId,
      "charmed",
    )
  ) {
    throw new Error("Expected scoped charm to be prevented.");
  }
  const scopedPossession = resolveBattleSubject({
    state: protectedTargetTurn,
    subject: {
      tag: "runtimeCommand",
      actorId: protectedTargetId,
      command: "creatureTypeProtectionPossessionAttempt",
      sourceCombatantId: feySourceId,
    },
    fills: [],
  });
  requireResolvedResult(
    scopedPossession,
    "Expected scoped possession attempt to resolve.",
  );
  return [
    ...initialProtectionCharmRoute(),
    ...routeEventsOf(scopedCharm).filter(
      (event) =>
        "subject" in event && event.subject === "protectionCharmActiveEffect",
    ),
    ...routeEventsWithOwner(scopedPossession, "battleCreatureState"),
  ];
}

function publicProtectionFromEvilAndGoodRelevantSaveRoute(): readonly ReducerRouteEvent[] {
  const resolved = resolveProtectionFromEvilAndGood();
  const repeatCharmEffect = protectionRelevantCharmEffect();
  const targetTurn = protectionFromEvilAndGoodProtectedTargetTurn(
    resolved.state,
  );
  const protectedTarget = requireCombatantState(targetTurn, protectedTargetId);
  const activeEffectState: BattleState = {
    ...targetTurn,
    combatants: new Map(targetTurn.combatants).set(protectedTargetId, {
      ...protectedTarget,
      activeEffects: [...protectedTarget.activeEffects, repeatCharmEffect],
    }),
  };
  const subject = protectionRelevantCharmSaveSubject(repeatCharmEffect);
  const needsSave = resolveBattleSubject({
    state: activeEffectState,
    subject,
    fills: [],
  });
  return [...initialProtectionCharmRoute(), ...routeEventsOf(needsSave)];
}

type AnimalFriendshipFailedSaveWalk = {
  readonly act: ActionSpellAct;
  readonly awaitingSave: Extract<
    BattleResolutionResult,
    { readonly tag: "needsHoles" }
  >;
  readonly resolved: Extract<
    BattleResolutionResult,
    { readonly tag: "resolved" }
  >;
};

function resolveAnimalFriendshipFailedSaveWalk(
  state: BattleState,
): AnimalFriendshipFailedSaveWalk {
  const act = animalFriendshipSpellAct(state);
  const targetHole = requireHole(act.initialHoles, "spellTargetList");
  const targetFill = spellTargetListFill(targetHole, [beastTargetId]);
  const awaitingSave = requireNeedsHolesResult(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    }),
  );
  const saveHole = requireHole(awaitingSave.holes, "savingThrowOutcome");
  const resolved = requireResolvedResult(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(saveHole, [
          { targetId: beastTargetId, succeeded: false },
        ]),
      ],
    }),
    "Expected Animal Friendship to resolve.",
  );
  return { act, awaitingSave, resolved };
}

type ProtectionFromEvilAndGoodWalk = {
  readonly act: ActionSpellAct;
  readonly resolved: Extract<
    BattleResolutionResult,
    { readonly tag: "resolved" }
  >;
};

function resolveProtectionFromEvilAndGoodWalk(): ProtectionFromEvilAndGoodWalk {
  const state = protectionFromEvilAndGoodBattle();
  const act = protectionFromEvilAndGoodSpellAct(state);
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const resolved = requireResolvedResult(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetChoiceFill(
          targetHole,
          protectionFromEvilAndGoodUnitId,
          casterId,
          protectedTargetId,
        ),
      ],
    }),
    "Expected Protection from Evil and Good to resolve.",
  );
  return { act, resolved };
}

function protectionRelevantCharmSaveSubject(
  repeatCharmEffect: Extract<
    BattleActiveEffect,
    { readonly kind: "spellConditionRepeatSave" }
  >,
): Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: "protectionRelevantEffectSave";
  }
> {
  return {
    tag: "runtimeCommand",
    actorId: protectedTargetId,
    command: "protectionRelevantEffectSave",
    sourceCombatantId: feySourceId,
    sourceSpellId: spellId(repeatCharmEffect.sourceSpellId),
    relevantEffect: "charmed",
  };
}

function routeEventsOf(source: {
  readonly routeEvents?: readonly BattleReducerRouteEvent[];
}): readonly ReducerRouteEvent[] {
  if (source.routeEvents === undefined || source.routeEvents.length === 0) {
    throw new Error("Expected public protection/charm route events.");
  }
  return source.routeEvents;
}

function routeEventsWithSubject(
  source: { readonly routeEvents?: readonly BattleReducerRouteEvent[] },
  subject: Extract<ReducerRouteEvent, { readonly subject: string }>["subject"],
): readonly ReducerRouteEvent[] {
  const routeEvents = routeEventsOf(source).filter(
    (event) => "subject" in event && event.subject === subject,
  );
  if (routeEvents.length === 0) {
    throw new Error(`Expected public route events for subject ${subject}.`);
  }
  return routeEvents;
}

function routeEventsWithOwner(
  source: { readonly routeEvents?: readonly BattleReducerRouteEvent[] },
  owner: ReducerRouteEvent["owner"],
): readonly ReducerRouteEvent[] {
  const routeEvents = routeEventsOf(source).filter(
    (event) => "owner" in event && event.owner === owner,
  );
  if (routeEvents.length === 0) {
    throw new Error(`Expected public route events for owner ${owner}.`);
  }
  return routeEvents;
}

function protectionProjection(
  result: {
    readonly state: BattleState;
    readonly evidence: ProtectionFromEvilAndGoodEvidence;
  },
  lastResult: Exclude<
    CreatureTypeProtectionAndCharmSelectedIdentityLastResult,
    "init" | "discovered" | "resolved" | "damageBreakResolved"
  >,
): CreatureTypeProtectionAndCharmSelectedIdentityProjection {
  return projectCreatureTypeProtectionAndCharmSelectedIdentityState(
    result.state,
    emptyAnimalFriendshipTargetAdmission(),
    result.evidence,
    lastResult,
  );
}

function expectedProjection(
  overrides: Partial<CreatureTypeProtectionAndCharmSelectedIdentityProjection> = {},
): CreatureTypeProtectionAndCharmSelectedIdentityProjection {
  return {
    beastTargetAdmitted: false,
    humanoidTargetAdmitted: false,
    knownWillingProtectionTargetAdmitted: false,
    plainProtectionTargetRejected: false,
    protectionEffectPresent: false,
    scopedAttackRollDisadvantage: false,
    unscopedAttackRollNormal: false,
    scopedCharmPrevented: false,
    unscopedCharmApplied: false,
    scopedPossessionPrevented: false,
    unscopedPossessionUnprevented: false,
    relevantCharmSaveHasAdvantage: false,
    relevantCharmSaveCleared: false,
    targetCharmed: false,
    animalFriendshipEffectPresent: false,
    actionAvailable: true,
    firstLevelSlotsExpended: 0,
    lastResult: "init",
    ...overrides,
  };
}

function emptyProtectionFromEvilAndGoodEvidence(): ProtectionFromEvilAndGoodEvidence {
  return {
    knownWillingProtectionTargetAdmitted: false,
    plainProtectionTargetRejected: false,
    protectionEffectPresent: false,
    scopedAttackRollDisadvantage: false,
    unscopedAttackRollNormal: false,
    scopedCharmPrevented: false,
    unscopedCharmApplied: false,
    scopedPossessionPrevented: false,
    unscopedPossessionUnprevented: false,
    relevantCharmSaveHasAdvantage: false,
    relevantCharmSaveCleared: false,
  };
}

function emptyAnimalFriendshipTargetAdmission(): AnimalFriendshipTargetAdmission {
  return {
    beastTargetAdmitted: false,
    humanoidTargetAdmitted: false,
  };
}

function srdSpellRecord(
  unitId: CreatureTypeProtectionAndCharmCatalogSpellUnitId,
): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${unitId} to be a Spell.`);
  }
  return unit;
}

function animalFriendshipBattle(): BattleState {
  const spell = srdSpellRecord(animalFriendshipUnitId);
  const result = startBattle({
    battleId: battleId("creature-type-protection-and-charm-selected-identity"),
    combatants: [
      spellcasterCreature({
        combatantId: casterId,
        displayName: "Animal Friendship caster",
        initiative: 20,
        side: partySide,
        className: "druid",
        spellcasting: {
          sourceClassName: "druid",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [spell],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
      statBlockCreature({
        combatantId: casterAllyId,
        statBlock: statBlockWithCreatureType("humanoid"),
        initiative: 19,
        side: partySide,
      }),
      statBlockCreature({
        combatantId: beastTargetId,
        statBlock: statBlockWithCreatureType("beast"),
        initiative: 10,
        side: oppositionSide,
      }),
      statBlockCreature({
        combatantId: humanoidTargetId,
        statBlock: statBlockWithCreatureType("humanoid"),
        initiative: 9,
        side: oppositionSide,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function protectionFromEvilAndGoodBattle(): BattleState {
  const protection = srdSpellRecord(protectionFromEvilAndGoodUnitId);
  const charmPerson = srdSpellRecord(charmPersonUnitId);
  const result = startBattle({
    battleId: battleId("creature-type-protection-and-charm-selected-identity"),
    combatants: [
      spellcasterCreature({
        combatantId: casterId,
        displayName: "Protection from Evil and Good caster",
        initiative: 20,
        side: partySide,
        className: "cleric",
        spellcasting: {
          sourceClassName: "cleric",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [protection, charmPerson],
          featurePreparedSpells: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        },
      }),
      statBlockCreature({
        combatantId: undeadAttackerId,
        statBlock: statBlockWithCreatureType("undead"),
        initiative: 19,
        side: oppositionSide,
      }),
      statBlockCreature({
        combatantId: humanoidAttackerId,
        statBlock: statBlockWithCreatureType("humanoid"),
        initiative: 18,
        side: oppositionSide,
      }),
      statBlockCreature({
        combatantId: feySourceId,
        statBlock: statBlockWithCreatureType("fey"),
        initiative: 17,
        side: oppositionSide,
      }),
      statBlockCreature({
        combatantId: protectedTargetId,
        statBlock: statBlockWithCreatureType("humanoid"),
        initiative: 10,
        side: partySide,
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function resolveProtectionFromEvilAndGood(): {
  readonly state: BattleState;
  readonly evidence: ProtectionFromEvilAndGoodEvidence;
} {
  const state = protectionFromEvilAndGoodBattle();
  const act = protectionFromEvilAndGoodSpellAct(state);
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const plainTarget = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      spellTargetChoiceFill(
        targetHole,
        protectionFromEvilAndGoodUnitId,
        casterId,
        protectedTargetId,
      ),
    ],
  });
  const protectedState = requireResolvedState(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetChoiceFill(
          targetHole,
          protectionFromEvilAndGoodUnitId,
          casterId,
          protectedTargetId,
        ),
      ],
    }),
    "Expected Protection from Evil and Good to resolve.",
  );
  return {
    state: protectedState,
    evidence: {
      ...emptyProtectionFromEvilAndGoodEvidence(),
      knownWillingProtectionTargetAdmitted:
        targetHole.choices.includes(protectedTargetId),
      plainProtectionTargetRejected: plainTarget.tag === "invalid",
      protectionEffectPresent:
        protectionFromEvilAndGoodEffectPresentOnProtectedTarget(protectedState),
    },
  };
}

function projectProtectionFromEvilAndGoodAttackRollModes(): {
  readonly state: BattleState;
  readonly evidence: ProtectionFromEvilAndGoodEvidence;
} {
  const resolved = resolveProtectionFromEvilAndGood();
  const undeadTurn = protectionFromEvilAndGoodUndeadAttackerTurn(
    resolved.state,
  );
  const humanoidTurn =
    protectionFromEvilAndGoodHumanoidAttackerTurn(undeadTurn);
  return {
    state: resolved.state,
    evidence: {
      ...resolved.evidence,
      scopedAttackRollDisadvantage:
        attackRollModeFor(
          undeadTurn,
          undeadAttackerId,
          protectedTargetId,
          "Scimitar",
        ) === "disadvantage",
      unscopedAttackRollNormal:
        attackRollModeFor(
          humanoidTurn,
          humanoidAttackerId,
          protectedTargetId,
          "Scimitar",
        ) === "normal",
    },
  };
}

function projectProtectionFromEvilAndGoodCharmBoundary(): {
  readonly state: BattleState;
  readonly evidence: ProtectionFromEvilAndGoodEvidence;
} {
  const resolved = resolveProtectionFromEvilAndGood();
  const charmInvocation = charmPersonSpellInvocation();
  const charmEffect = selectedFixedConditionEffect(charmInvocation);
  const scopedSourceApplied = applyFailedSaveSpellConditionEffects(
    resolved.state,
    feySourceId,
    [protectedTargetId],
    charmInvocation,
    charmEffect,
  );
  const unscopedSourceApplied = applyFailedSaveSpellConditionEffects(
    resolved.state,
    humanoidAttackerId,
    [protectedTargetId],
    charmInvocation,
    charmEffect,
  );
  const scopedPossession = resolveBattlePossessionAttempt({
    state: resolved.state,
    sourceCombatantId: feySourceId,
    targetId: protectedTargetId,
  });
  const unscopedPossession = resolveBattlePossessionAttempt({
    state: resolved.state,
    sourceCombatantId: humanoidAttackerId,
    targetId: protectedTargetId,
  });
  return {
    state: resolved.state,
    evidence: {
      ...resolved.evidence,
      scopedCharmPrevented: !spellConditionPresentOnProtectedTarget(
        scopedSourceApplied,
        feySourceId,
        charmPersonUnitId,
        "charmed",
      ),
      unscopedCharmApplied: spellConditionPresentOnProtectedTarget(
        unscopedSourceApplied,
        humanoidAttackerId,
        charmPersonUnitId,
        "charmed",
      ),
      scopedPossessionPrevented:
        scopedPossession.tag === "prevented" &&
        scopedPossession.prevention === "creatureTypeProtection",
      unscopedPossessionUnprevented: unscopedPossession.tag === "unprevented",
    },
  };
}

function selectedFixedConditionEffect(
  invocation: Extract<
    SupportedSpellInvocation,
    { readonly procedure: "saveGatedCondition" }
  >,
) {
  const selected = selectFailedSaveConditionEffect(invocation.effect, null);
  if (selected.tag !== "selected") {
    throw new Error("Expected a fixed failed-save condition effect.");
  }
  return selected.effect;
}

function resolveProtectionFromEvilAndGoodRelevantCharmSave(): {
  readonly state: BattleState;
  readonly evidence: ProtectionFromEvilAndGoodEvidence;
} {
  const resolved = resolveProtectionFromEvilAndGood();
  const repeatCharmEffect = protectionRelevantCharmEffect();
  const targetTurn = protectionFromEvilAndGoodProtectedTargetTurn(
    resolved.state,
  );
  const protectedTarget = requireCombatantState(targetTurn, protectedTargetId);
  const activeEffectState: BattleState = {
    ...targetTurn,
    combatants: new Map(targetTurn.combatants).set(protectedTargetId, {
      ...protectedTarget,
      activeEffects: [...protectedTarget.activeEffects, repeatCharmEffect],
    }),
  };
  const subject = {
    tag: "runtimeCommand" as const,
    actorId: protectedTargetId,
    command: "protectionRelevantEffectSave" as const,
    sourceCombatantId: feySourceId,
    sourceSpellId: spellId(repeatCharmEffect.sourceSpellId),
    relevantEffect: "charmed" as const,
  };
  const needsHole = resolveBattleSubject({
    state: activeEffectState,
    subject,
    fills: [],
  });
  const saveHole = requireResultHole(needsHole, "savingThrowOutcome");
  const resolvedSave = requireResolvedState(
    resolveBattleSubject({
      state: activeEffectState,
      subject,
      fills: [
        savingThrowOutcomeFill(saveHole, [
          { targetId: protectedTargetId, succeeded: true },
        ]),
      ],
    }),
    "Expected Protection from Evil and Good relevant-effect save to resolve.",
  );
  return {
    state: resolved.state,
    evidence: {
      ...resolved.evidence,
      relevantCharmSaveHasAdvantage: saveHole.targetRollModes.some(
        (rollMode) =>
          rollMode.targetId === protectedTargetId &&
          rollMode.rollMode === "advantage",
      ),
      relevantCharmSaveCleared: !requireCombatantState(
        resolvedSave,
        protectedTargetId,
      ).activeEffects.includes(repeatCharmEffect),
    },
  };
}

function protectionFromEvilAndGoodUndeadAttackerTurn(
  protectedState: BattleState,
): BattleState {
  return requireResolvedState(
    endTurn({ state: protectedState, actorId: casterId }),
    "Expected to advance to the scoped undead attacker.",
  );
}

function protectionFromEvilAndGoodHumanoidAttackerTurn(
  undeadTurn: BattleState,
): BattleState {
  return requireResolvedState(
    endTurn({ state: undeadTurn, actorId: undeadAttackerId }),
    "Expected to advance to the unscoped humanoid attacker.",
  );
}

function protectionFromEvilAndGoodProtectedTargetTurn(
  protectedState: BattleState,
): BattleState {
  const undeadTurn =
    protectionFromEvilAndGoodUndeadAttackerTurn(protectedState);
  const humanoidTurn =
    protectionFromEvilAndGoodHumanoidAttackerTurn(undeadTurn);
  const feyTurn = requireResolvedState(
    endTurn({ state: humanoidTurn, actorId: humanoidAttackerId }),
    "Expected to advance to the scoped fey source.",
  );
  return requireResolvedState(
    endTurn({ state: feyTurn, actorId: feySourceId }),
    "Expected to advance to the protected target.",
  );
}

function spellcasterCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly className: CharacterClassName;
  readonly spellcasting: CharacterSpellcastingInit;
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: [{ className: input.className, level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
      spellcasting: input.spellcasting,
    },
  };
}

function statBlockCreature(input: {
  readonly combatantId: CombatantId;
  readonly statBlock: StatBlockRecord;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.statBlock.statBlock.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "statBlock",
      statBlock: input.statBlock,
      currentHp: Hp(statBlockLiteralNumber(input.statBlock.statBlock.hp)),
      maxHp: Hp(statBlockLiteralNumber(input.statBlock.statBlock.hp)),
      tempHp: Hp(0),
    },
  };
}

function statBlockWithCreatureType(
  creatureType: StatBlockRecord["statBlock"]["creatureType"],
): StatBlockRecord {
  const base = statBlockCatalog.requireStatBlock("stat_block_goblin_warrior");
  return {
    ...base,
    id: `stat_block_selected_identity_${creatureType}`,
    name: `Selected Identity ${creatureType}`,
    statBlock: {
      ...base.statBlock,
      displayName: `Selected Identity ${creatureType}`,
      creatureType,
    },
  };
}

function statBlockLiteralNumber(
  value: StatBlockRecord["statBlock"]["hp"],
): number {
  if (typeof value === "number") {
    return value;
  }
  if (value.kind === "literal") {
    return value.value;
  }
  throw new Error("Expected literal stat block number.");
}

function protectionFromEvilAndGoodSpellAct(state: BattleState): ActionSpellAct {
  return spellAct(state, protectionFromEvilAndGoodUnitId);
}

function charmPersonSpellInvocation(): Extract<
  SupportedSpellInvocation,
  { readonly procedure: "saveGatedCondition" }
> {
  const invocation = spellActInvocation(
    spellAct(protectionFromEvilAndGoodBattle(), charmPersonUnitId),
  );
  if (invocation.procedure !== "saveGatedCondition") {
    throw new Error("Expected Charm Person to be a save-gated condition.");
  }
  return invocation;
}

function spellAct(state: BattleState, unitId: string): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.tag === "spellSlot" &&
      candidate.subject.invocation.spellId === unitId &&
      Number(candidate.subject.invocation.slotLevel) === 1,
  );
  if (act === undefined) {
    throw new Error(`Expected ${unitId} spell act.`);
  }
  return act;
}

function spellActInvocation(act: ActionSpellAct): SupportedSpellInvocation {
  const hole = act.initialHoles[0];
  if (hole === undefined || !("spell" in hole)) {
    throw new Error("Expected spell hole to carry invocation.");
  }
  return hole.spell;
}

function attackRollModeFor(
  state: BattleState,
  actorId: CombatantId,
  targetId: CombatantId,
  attackName: string,
): "advantage" | "disadvantage" | "normal" {
  const act = statBlockAttackAct(state, actorId, attackName);
  const targetHole = requireResultHole(
    resolveBattleSubject({ state, subject: act.subject, fills: [] }),
    "targetChoice",
  );
  const rollHole = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [attackTargetFill(targetHole, actorId, targetId, act.subject)],
    }),
    "attackRoll",
  );
  return rollHole.rollMode ?? "normal";
}

function statBlockAttackAct(
  state: BattleState,
  actorId: CombatantId,
  attackName: string,
): StatBlockAttackAct {
  const matchingActs = discoverBattleActs(state).filter(
    (candidate): candidate is StatBlockAttackAct =>
      candidate.subject.tag === "action" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.action === "attack" &&
      candidate.subject.procedureRef !== undefined &&
      candidate.subject.statBlockDamageNotation === undefined &&
      candidate.summary === `Take the Attack action with ${attackName}.`,
  );
  if (matchingActs.length !== 1) {
    throw new Error(`Expected one rolled ${attackName} stat block attack act.`);
  }
  const act = matchingActs[0];
  if (act === undefined) throw new Error("Expected one matching attack act.");
  return act;
}

function animalFriendshipTargetAdmission(
  state: BattleState,
): AnimalFriendshipTargetAdmission {
  const targetHole = requireHole(
    animalFriendshipSpellAct(state).initialHoles,
    "spellTargetList",
  );
  return {
    beastTargetAdmitted: targetHole.choices.includes(beastTargetId),
    humanoidTargetAdmitted: targetHole.choices.includes(humanoidTargetId),
  };
}

function resolveAnimalFriendshipFailedSave(state: BattleState): BattleState {
  const act = animalFriendshipSpellAct(state);
  const targetHole = requireHole(act.initialHoles, "spellTargetList");
  const targetFill = spellTargetListFill(targetHole, [beastTargetId]);
  const saveHole = requireResultHole(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    }),
    "savingThrowOutcome",
  );
  return requireResolvedState(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(saveHole, [
          { targetId: beastTargetId, succeeded: false },
        ]),
      ],
    }),
    "Expected Animal Friendship to resolve.",
  );
}

function animalFriendshipSpellAct(state: BattleState): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.tag === "spellSlot" &&
      candidate.subject.invocation.spellId === animalFriendshipUnitId &&
      Number(candidate.subject.invocation.slotLevel) === 1,
  );
  if (act === undefined) {
    throw new Error("Expected Animal Friendship spell act.");
  }
  return act;
}

function spellTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  targetIds: readonly CombatantId[],
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds },
    spatialFacts: targetIds.map((targetId) => ({
      kind: "spellTarget",
      casterId,
      targetId,
      spellId: animalFriendshipUnitId,
    })),
  };
}

function spellTargetChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  unitId: string,
  actorId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: actorId,
        targetId,
        spellId: unitId,
      },
    ],
  };
}

function knownWillingSpellTargetChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  unitId: string,
  actorId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  const base = spellTargetChoiceFill(hole, unitId, actorId, targetId);
  return {
    ...base,
    spatialFacts: [
      ...(base.spatialFacts ?? []),
      {
        kind: "spellTargetKnownWilling",
        casterId: actorId,
        targetId,
        spellId: unitId,
      },
    ],
  };
}

function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  actorId: CombatantId,
  targetId: CombatantId,
  selection: BattleAttackExecutionSelection,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId,
        targetId,
        ...selection,
      },
    ],
  };
}

function savingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: { outcomes },
  };
}

function requireResultHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  return requireHole(requireNeedsHolesResult(result).holes, kind);
}

function requireNeedsHolesResult(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  if (result.tag !== "needsHoles") {
    throw new Error("Expected needsHoles result.");
  }
  return result;
}

function requireResolvedState(
  result: BattleResolutionResult,
  message: string,
): BattleState {
  return requireResolvedResult(result, message).state;
}

function requireResolvedResult(
  result: BattleResolutionResult,
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  if (result.tag !== "resolved") {
    throw new Error(
      result.tag === "invalid" ? `${message} ${result.message}` : message,
    );
  }
  return result;
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

function requireCombatantState(
  state: BattleState,
  combatantId: CombatantId,
): BattleCreatureState {
  const combatant = state.combatants.get(combatantId);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${combatantId}.`);
  }
  return combatant;
}

function protectionFromEvilAndGoodEffectPresentOnProtectedTarget(
  state: BattleState,
): boolean {
  return (
    state.combatants
      .get(protectedTargetId)
      ?.activeEffects.some(
        (effect) =>
          effect.kind === "creatureTypeProtection" &&
          effect.sourceSpellId === protectionFromEvilAndGoodUnitId &&
          effect.sourceCombatantId === casterId &&
          effect.attackRollMode === "disadvantage" &&
          effect.preventedConditions.includes("charmed") &&
          effect.preventedConditions.includes("frightened") &&
          effect.preventsPossession,
      ) ?? false
  );
}

function spellConditionPresentOnProtectedTarget(
  state: BattleState,
  sourceCombatantId: CombatantId,
  sourceSpellId: string,
  condition: Condition,
): boolean {
  return (
    state.combatants
      .get(protectedTargetId)
      ?.activeEffects.some(
        (effect) =>
          effect.kind === "spellCondition" &&
          effect.sourceSpellId === sourceSpellId &&
          effect.sourceCombatantId === sourceCombatantId &&
          effect.condition === condition,
      ) ?? false
  );
}

function protectionRelevantCharmEffect(): Extract<
  BattleActiveEffect,
  { readonly kind: "spellConditionRepeatSave" }
> {
  return {
    kind: "spellConditionRepeatSave",
    sourceSpellId:
      "creature-type-protection-and-charm-selected-identity-relevant-charm",
    sourceCombatantId: feySourceId,
    condition: "charmed",
    conditionHadNonSpellSource: false,
    save: { ability: "wis", dc: { kind: "fixed", dc: difficultyClass(13) } },
    expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(600) },
  };
}

function projectCreatureTypeProtectionAndCharmSelectedIdentityState(
  state: BattleState,
  targetAdmission: AnimalFriendshipTargetAdmission,
  protectionEvidence: ProtectionFromEvilAndGoodEvidence,
  lastResult: CreatureTypeProtectionAndCharmSelectedIdentityLastResult,
): CreatureTypeProtectionAndCharmSelectedIdentityProjection {
  const snapshot = snapshotBattle(state);
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === beastTargetId,
  );
  return {
    beastTargetAdmitted: targetAdmission.beastTargetAdmitted,
    humanoidTargetAdmitted: targetAdmission.humanoidTargetAdmitted,
    knownWillingProtectionTargetAdmitted:
      protectionEvidence.knownWillingProtectionTargetAdmitted,
    plainProtectionTargetRejected:
      protectionEvidence.plainProtectionTargetRejected,
    protectionEffectPresent:
      protectionEvidence.protectionEffectPresent ||
      protectionFromEvilAndGoodEffectPresentOnProtectedTarget(state),
    scopedAttackRollDisadvantage:
      protectionEvidence.scopedAttackRollDisadvantage,
    unscopedAttackRollNormal: protectionEvidence.unscopedAttackRollNormal,
    scopedCharmPrevented: protectionEvidence.scopedCharmPrevented,
    unscopedCharmApplied: protectionEvidence.unscopedCharmApplied,
    scopedPossessionPrevented: protectionEvidence.scopedPossessionPrevented,
    unscopedPossessionUnprevented:
      protectionEvidence.unscopedPossessionUnprevented,
    relevantCharmSaveHasAdvantage:
      protectionEvidence.relevantCharmSaveHasAdvantage,
    relevantCharmSaveCleared: protectionEvidence.relevantCharmSaveCleared,
    targetCharmed:
      target === undefined
        ? false
        : snapshotHasCondition(target.conditions, "charmed"),
    animalFriendshipEffectPresent:
      animalFriendshipEffectPresentOnBeastTarget(state),
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    firstLevelSlotsExpended: expendedSlotsForSpellLevel(state, casterId, 1),
    lastResult,
  };
}

function snapshotHasCondition(
  conditions: readonly Condition[],
  condition: Condition,
): boolean {
  return conditions.includes(condition);
}

function animalFriendshipEffectPresentOnBeastTarget(
  state: BattleState,
): boolean {
  return (
    state.combatants
      .get(beastTargetId)
      ?.activeEffects.some(
        (effect) =>
          effect.kind === "spellCondition" &&
          effect.sourceSpellId === animalFriendshipUnitId &&
          effect.sourceCombatantId === casterId &&
          effect.condition === "charmed",
      ) ?? false
  );
}

function expendedSlotsForSpellLevel(
  state: BattleState,
  combatantId: CombatantId,
  spellLevel: number,
): number {
  const combatant = state.combatants.get(combatantId);
  if (combatant?.origin.kind !== "character") {
    throw new Error(
      "Expected Creature Type Protection and Charm caster character origin.",
    );
  }
  return (
    combatant.origin.spellcasting?.spellSlots.find(
      (slot) => slot.spellLevel === spellLevel,
    )?.expended ?? 0
  );
}
