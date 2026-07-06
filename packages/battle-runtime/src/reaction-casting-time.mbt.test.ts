// RAW trace:
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Casting-Time:
//   Reaction casting time uses a spell-defined trigger.
// - .references/srd-5.2.1/Playing-the-Game.md#Reactions and
//   .references/srd-5.2.1/Rules-Glossary.md#Reaction: taking a Reaction
//   spends it until the start of the reactor's next turn, and an interrupted
//   creature can continue after the Reaction.
// - .references/srd-5.2.1/Spells/Descriptions-A-D.md#Counterspell:
//   Counterspell interrupts a spell being cast; an ended slotted spell has no
//   effect and does not expend the triggering slot.
// - .references/srd-5.2.1/Spells/Descriptions-E-L.md#Hellish-Rebuke:
//   Hellish Rebuke is cast in response to damage from a visible creature within
//   60 feet and resolves a Dexterity save plus Fire damage.
// - UBIQUITOUS_LANGUAGE.md: Reaction, Spell Slot, Magic Action, Saving Throw,
//   Damage Roll, and Boundary Crossing.
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt spell.reaction-counterspell spell.reaction-hellish-rebuke
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.REACTION_CASTING_TIME
import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
  DieRollResult,
  Hp,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord } from "@dnd/surface/surface/types";
import * as Either from "effect/Either";
import { describe, expect, it } from "vitest";

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
} from "./battle-runtime-mbt-driver-kit.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import {
  battleCombatantSide,
  battleId,
  battleReducerStartRouteEvent,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleInterrupt,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
  startBattle,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleInterruptProcedureChoice,
  type BattleReducerRouteEvent,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";

const reactionCastingTimeDriverSchema = {
  init: {},
  doCounterspellEndsSpellCast: {},
  doCounterspellAllowsSpellCastResume: {},
  doHellishRebukeAfterDamage: {},
  step: {},
} as const;

type ReactionCastingTimeDriverAction = Exclude<
  keyof typeof reactionCastingTimeDriverSchema,
  "init" | "step"
>;

type ReactionCastingTimeTriggerKind = "none" | "spellCast" | "afterDamage";
type ReactionCastingTimeContinuationKind =
  | "none"
  | "spellCastEnded"
  | "spellCastResumed"
  | "afterDamageResolved";
type ReactionCastingTimeLastResult =
  | "init"
  | "counterspellEndedSpellCast"
  | "counterspellAllowedSpellCastResume"
  | "hellishRebukeAfterDamage";
const REACTION_CASTING_TIME_LAST_RESULT_BY_SCENARIO_OUTCOME_TAG = {
  Init: "init",
  CounterspellEndedSpellCast: "counterspellEndedSpellCast",
  CounterspellAllowedSpellCastResume: "counterspellAllowedSpellCastResume",
  HellishRebukeAfterDamage: "hellishRebukeAfterDamage",
} as const satisfies Readonly<Record<string, ReactionCastingTimeLastResult>>;

type ReactionCastingTimeProjection = {
  readonly triggerKind: ReactionCastingTimeTriggerKind;
  readonly continuationKind: ReactionCastingTimeContinuationKind;
  readonly reactorHp: number;
  readonly triggerCreatureHp: number;
  readonly reactorReactionAvailable: boolean;
  readonly triggerCreatureFirstLevelSlotsExpended: number;
  readonly triggerCreatureFourthLevelSlotsExpended: number;
  readonly reactorSecondLevelSlotsExpended: number;
  readonly reactorThirdLevelSlotsExpended: number;
  readonly reactionWindowCleared: boolean;
  readonly lastResult: ReactionCastingTimeLastResult;
};

type ReactionCastingTimeRuntimeState = {
  readonly battle: BattleState;
  readonly triggerKind: ReactionCastingTimeTriggerKind;
  readonly continuationKind: ReactionCastingTimeContinuationKind;
  readonly lastResult: ReactionCastingTimeLastResult;
};

type ReactionCastingTimeReplaySequence = {
  readonly name: string;
  readonly actions: readonly ReactionCastingTimeDriverAction[];
  readonly expected: ReactionCastingTimeProjection;
};

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Reaction casting time Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

const magicMissileUnitId = "magic_missile";
const counterspellUnitId = "counterspell";
const hellishRebukeUnitId = "hellish_rebuke";
const triggerCreatureId = combatantId("reaction-casting-time-trigger-creature");
const reactorId = combatantId("reaction-casting-time-reactor");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");
const initialHp = 30;
const counterspellSlotLevel = 3;
const hellishRebukeSlotLevel = 2;
const magicMissileFirstSlotLevel = 1;
const magicMissileFourthSlotLevel = 4;
const firstLevelMagicMissileDartCount = 3;
const fourthLevelMagicMissileDartCount = 6;
const hellishRebukeDamageRoll = [[1, 1, 1]] as const;

const replaySequences = [
  {
    name: "counterspell-ends-spell-cast",
    actions: ["doCounterspellEndsSpellCast"],
    expected: expectedReactionCastingTimeProjection({
      triggerKind: "spellCast",
      continuationKind: "spellCastEnded",
      reactorReactionAvailable: false,
      reactorThirdLevelSlotsExpended: 1,
      reactionWindowCleared: true,
      lastResult: "counterspellEndedSpellCast",
    }),
  },
  {
    name: "counterspell-allows-spell-cast-resume",
    actions: ["doCounterspellAllowsSpellCastResume"],
    expected: expectedReactionCastingTimeProjection({
      triggerKind: "spellCast",
      continuationKind: "spellCastResumed",
      reactorHp: 18,
      reactorReactionAvailable: false,
      triggerCreatureFourthLevelSlotsExpended: 1,
      reactorThirdLevelSlotsExpended: 1,
      reactionWindowCleared: true,
      lastResult: "counterspellAllowedSpellCastResume",
    }),
  },
  {
    name: "hellish-rebuke-after-damage",
    actions: ["doHellishRebukeAfterDamage"],
    expected: expectedReactionCastingTimeProjection({
      triggerKind: "afterDamage",
      continuationKind: "afterDamageResolved",
      reactorHp: 29,
      triggerCreatureHp: 27,
      reactorReactionAvailable: false,
      reactorSecondLevelSlotsExpended: 1,
      reactionWindowCleared: true,
      lastResult: "hellishRebukeAfterDamage",
    }),
  },
] as const satisfies ReadonlyArray<ReactionCastingTimeReplaySequence>;

describe("Reaction casting time MBT", () => {
  it("replays every focused Reaction casting time path deterministically", async () => {
    const replayedActions = new Set<ReactionCastingTimeDriverAction>();

    for (const sequence of replaySequences) {
      const driver = createReactionCastingTimeDriver()();

      for (const actionName of sequence.actions) {
        replayedActions.add(actionName);
        const action = driver.actions[actionName];
        if (action === undefined) {
          throw new Error(
            `Missing Reaction casting time driver action ${actionName}.`,
          );
        }
        await action.handler({});
      }

      const runtime = driver.getState?.();
      if (runtime === undefined) {
        throw new Error("Reaction casting time driver must expose getState.");
      }
      expect(runtime, sequence.name).toEqual(sequence.expected);
    }

    expect(replayedActions).toEqual(
      new Set(replaySequences.flatMap((sequence) => sequence.actions)),
    );
  });

  it("observes the copied Hellish Rebuke qRoute through public reducer entrypoints", () => {
    expect(hellishRebukeAfterDamagePublicRoute()).toEqual(
      hellishRebukeAfterDamageExpectedRoute(),
    );
  });

  it(
    "matches focused Reaction casting time traces against Quint",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-reaction-casting-time.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createReactionCastingTimeDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: reactionCastingTimeStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function createReactionCastingTimeDriver() {
  return defineDriver(reactionCastingTimeDriverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doCounterspellEndsSpellCast: () => {
        state = counterspellEndsSpellCast();
      },
      doCounterspellAllowsSpellCastResume: () => {
        state = counterspellAllowsSpellCastResume();
      },
      doHellishRebukeAfterDamage: () => {
        state = hellishRebukeAfterDamage();
      },
      step: () => {},
      getState: () => reactionCastingTimeProjection(state),
    };
  });
}

function initialRuntimeState(): ReactionCastingTimeRuntimeState {
  return {
    battle: reactionCastingTimeBattle({
      triggerCreaturePreparedSpells: [srdSpellRecord(magicMissileUnitId)],
      triggerCreatureSpellSlots: [{ spellLevel: 1, count: 1 }],
      reactorPreparedSpells: [srdSpellRecord(counterspellUnitId)],
      reactorSpellSlots: [{ spellLevel: counterspellSlotLevel, count: 1 }],
    }),
    triggerKind: "none",
    continuationKind: "none",
    lastResult: "init",
  };
}

function counterspellEndsSpellCast(): ReactionCastingTimeRuntimeState {
  const state = reactionCastingTimeBattle({
    triggerCreaturePreparedSpells: [srdSpellRecord(magicMissileUnitId)],
    triggerCreatureSpellSlots: [{ spellLevel: 1, count: 1 }],
    reactorPreparedSpells: [srdSpellRecord(counterspellUnitId)],
    reactorSpellSlots: [{ spellLevel: counterspellSlotLevel, count: 1 }],
  });
  const awaitingReaction = startMagicMissileWithCounterspell({
    state,
    slotLevel: magicMissileFirstSlotLevel,
    dartCount: firstLevelMagicMissileDartCount,
  });
  const choice = requireCounterspellChoice(awaitingReaction);
  const resolved = resolveBattleInterrupt({
    state: awaitingReaction.state,
    fill: interruptDecisionFill(
      requireHole(awaitingReaction.holes, "interruptDecision"),
      triggeredReactionSpellDecision(reactorId, choice, []),
    ),
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Counterspell to end the spell cast.");
  }
  return {
    battle: resolved.state,
    triggerKind: "spellCast",
    continuationKind: "spellCastEnded",
    lastResult: "counterspellEndedSpellCast",
  };
}

function counterspellAllowsSpellCastResume(): ReactionCastingTimeRuntimeState {
  const state = reactionCastingTimeBattle({
    triggerCreaturePreparedSpells: [srdSpellRecord(magicMissileUnitId)],
    triggerCreatureSpellSlots: [
      { spellLevel: magicMissileFourthSlotLevel, count: 1 },
    ],
    reactorPreparedSpells: [srdSpellRecord(counterspellUnitId)],
    reactorSpellSlots: [{ spellLevel: counterspellSlotLevel, count: 1 }],
  });
  const awaitingReaction = startMagicMissileWithCounterspell({
    state,
    slotLevel: magicMissileFourthSlotLevel,
    dartCount: fourthLevelMagicMissileDartCount,
  });
  const choice = requireCounterspellChoice(awaitingReaction);
  const save = requireHole(choice.initialHoles, "savingThrowOutcome");
  const resumed = resolveBattleInterrupt({
    state: awaitingReaction.state,
    fill: interruptDecisionFill(
      requireHole(awaitingReaction.holes, "interruptDecision"),
      triggeredReactionSpellDecision(reactorId, choice, [
        savingThrowOutcomeFill(save, [
          { targetId: triggerCreatureId, succeeded: true },
        ]),
      ]),
    ),
  });
  if (resumed.tag !== "needsHoles") {
    throw new Error("Expected Counterspell save success to resume spell cast.");
  }
  const damage = requireHole(resumed.holes, "rolledDice");
  const resolved = finishMagicMissile({
    state: resumed.state,
    slotLevel: magicMissileFourthSlotLevel,
    targetAllocationFill: awaitingReaction.targetAllocationFill,
    damage,
    dartCount: fourthLevelMagicMissileDartCount,
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected resumed spell cast to resolve.");
  }
  return {
    battle: resolved.state,
    triggerKind: "spellCast",
    continuationKind: "spellCastResumed",
    lastResult: "counterspellAllowedSpellCastResume",
  };
}

function hellishRebukeAfterDamage(): ReactionCastingTimeRuntimeState {
  const state = reactionCastingTimeBattle({
    triggerCreaturePreparedSpells: [],
    triggerCreatureSpellSlots: [],
    reactorPreparedSpells: [srdSpellRecord(hellishRebukeUnitId)],
    reactorClassName: "warlock",
    reactorSpellSlots: [
      { spellLevel: 1, count: 1 },
      { spellLevel: hellishRebukeSlotLevel, count: 1 },
    ],
  });
  const awaitingReaction = resolveUnarmedStrikeAgainstReactor(state);
  if (awaitingReaction.tag !== "needsHoles") {
    throw new Error("Expected Hellish Rebuke after-damage Reaction window.");
  }
  const choice = requireHellishRebukeChoice(awaitingReaction);
  const save = requireHole(choice.initialHoles, "savingThrowOutcome");
  const damage = requireHole(choice.initialHoles, "rolledDice");
  const resolved = resolveBattleInterrupt({
    state: awaitingReaction.state,
    fill: interruptDecisionFill(
      requireHole(awaitingReaction.holes, "interruptDecision"),
      triggeredReactionSpellDecision(reactorId, choice, [
        savingThrowOutcomeFill(save, [
          { targetId: triggerCreatureId, succeeded: false },
        ]),
        damageRollFillWithGroups(damage, hellishRebukeDamageRoll),
      ]),
    ),
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Hellish Rebuke to resolve.");
  }
  return {
    battle: resolved.state,
    triggerKind: "afterDamage",
    continuationKind: "afterDamageResolved",
    lastResult: "hellishRebukeAfterDamage",
  };
}

function hellishRebukeAfterDamagePublicRoute(): readonly BattleReducerRouteEvent[] {
  const state = reactionCastingTimeBattle({
    triggerCreaturePreparedSpells: [],
    triggerCreatureSpellSlots: [],
    reactorPreparedSpells: [srdSpellRecord(hellishRebukeUnitId)],
    reactorClassName: "warlock",
    reactorSpellSlots: [
      { spellLevel: 1, count: 1 },
      { spellLevel: hellishRebukeSlotLevel, count: 1 },
    ],
  });
  const awaitingReaction = resolveUnarmedStrikeAgainstReactor(state);
  if (awaitingReaction.tag !== "needsHoles") {
    throw new Error("Expected Hellish Rebuke after-damage Reaction window.");
  }
  const choice = requireHellishRebukeChoice(awaitingReaction);
  const save = requireHole(choice.initialHoles, "savingThrowOutcome");
  const damage = requireHole(choice.initialHoles, "rolledDice");
  const resolved = resolveBattleInterrupt({
    state: awaitingReaction.state,
    fill: interruptDecisionFill(
      requireHole(awaitingReaction.holes, "interruptDecision"),
      triggeredReactionSpellDecision(reactorId, choice, [
        savingThrowOutcomeFill(save, [
          { targetId: triggerCreatureId, succeeded: false },
        ]),
        damageRollFillWithGroups(damage, hellishRebukeDamageRoll),
      ]),
    ),
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Hellish Rebuke to resolve.");
  }
  return [
    battleReducerStartRouteEvent(),
    ...requireRouteEvents(
      awaitingReaction,
      "Hellish Rebuke after-damage Reaction window",
    ),
    ...requireRouteEvents(resolved, "Hellish Rebuke Reaction resolution"),
  ];
}

function hellishRebukeAfterDamageExpectedRoute(): readonly BattleReducerRouteEvent[] {
  return [
    { kind: "startBattle", owner: "battleActionEconomy" },
    {
      kind: "discoverBattleActs",
      subject: "reactionSpell",
      holes: ["interruptDecision"],
      owner: "battleInterruptStack",
    },
    {
      kind: "resolveBattleInterrupt",
      subject: "reactionSpell",
      fill: "interruptDecision",
      holes: [],
      owner: "battleInterruptStack",
    },
    {
      kind: "resolveBattleInterrupt",
      subject: "reactionSpell",
      fill: "interruptDecision",
      holes: [],
      owner: "battleSpellSlotAndActionEconomy",
    },
    {
      kind: "resolveBattleInterrupt",
      subject: "reactionSpell",
      fill: "interruptDecision",
      holes: [],
      owner: "battleHitPoint",
    },
  ] as const satisfies readonly BattleReducerRouteEvent[];
}

function requireRouteEvents(
  result: BattleResolutionResult,
  label: string,
): readonly BattleReducerRouteEvent[] {
  if (result.routeEvents === undefined || result.routeEvents.length === 0) {
    throw new Error(`Expected public route events for ${label}.`);
  }
  return result.routeEvents;
}

type CharacterSpellcastingInit = NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"]
>;

function reactionCastingTimeBattle(input: {
  readonly triggerCreaturePreparedSpells: readonly SpellRecord[];
  readonly triggerCreatureSpellSlots: CharacterSpellcastingInit["spellSlots"];
  readonly reactorPreparedSpells: readonly SpellRecord[];
  readonly reactorClassName?:
    | CharacterSpellcastingInit["sourceClassName"]
    | undefined;
  readonly reactorSpellSlots: CharacterSpellcastingInit["spellSlots"];
}): BattleState {
  const result = startBattle({
    battleId: battleId("reaction-casting-time"),
    combatants: [
      reactionCastingTimeCreature({
        combatantId: triggerCreatureId,
        displayName: "Trigger creature",
        className: "wizard",
        initiative: 20,
        side: oppositionSide,
        spellcasting: characterSpellcasting({
          sourceClassName: "wizard",
          preparedSpells: input.triggerCreaturePreparedSpells,
          spellSlots: input.triggerCreatureSpellSlots,
        }),
      }),
      reactionCastingTimeCreature({
        combatantId: reactorId,
        displayName: "Reaction spellcaster",
        className: input.reactorClassName ?? "wizard",
        initiative: 10,
        side: partySide,
        spellcasting: characterSpellcasting({
          sourceClassName: input.reactorClassName ?? "wizard",
          preparedSpells: input.reactorPreparedSpells,
          spellSlots: input.reactorSpellSlots,
        }),
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function characterSpellcasting(input: {
  readonly sourceClassName: CharacterSpellcastingInit["sourceClassName"];
  readonly preparedSpells: readonly SpellRecord[];
  readonly spellSlots: CharacterSpellcastingInit["spellSlots"];
}): CharacterSpellcastingInit {
  return {
    sourceClassName: input.sourceClassName,
    spellcastingAbilityModifier: abilityModifier(3),
    proficiencyBonus: proficiencyBonus(2),
    canCastSpells: true,
    cantrips: [],
    preparedSpells: input.preparedSpells,
    featurePreparedSpells: [],
    spellbookRitualSpellAccesses: [],
    invocationSpellAccesses: [],
    spellSlots: input.spellSlots,
  };
}

function reactionCastingTimeCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly className: CharacterSpellcastingInit["sourceClassName"];
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
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
      classLevels: [{ className: input.className, level: 7 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(initialHp),
      maxHp: Hp(initialHp),
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

type NeedsHolesResult = Extract<
  BattleResolutionResult,
  { readonly tag: "needsHoles" }
>;

type StartedMagicMissile = NeedsHolesResult & {
  readonly targetAllocationFill: Extract<
    BattleFill,
    { readonly kind: "spellTargetAllocation" }
  >;
};

function startMagicMissileWithCounterspell(input: {
  readonly state: BattleState;
  readonly slotLevel: number;
  readonly dartCount: number;
}): StartedMagicMissile {
  const subject = magicMissileSubject(input.slotLevel);
  const targetAllocationResult = resolveBattleSubject({
    state: input.state,
    subject,
    fills: [],
  });
  if (targetAllocationResult.tag !== "needsHoles") {
    throw new Error("Expected Magic Missile target allocation hole.");
  }
  const targetAllocation = requireHole(
    targetAllocationResult.holes,
    "spellTargetAllocation",
  );
  const targetAllocationFill = magicMissileTargetAllocationFill({
    hole: targetAllocation,
    dartCount: input.dartCount,
  });
  const result = resolveBattleSubject({
    state: input.state,
    subject,
    fills: [
      targetAllocationFill,
      {
        kind: "targetSpatialFacts",
        holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
        spatialFacts: [counterspellTriggerFact()],
      },
    ],
  });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Counterspell spell-cast Reaction window.");
  }
  requirePendingReactionTrigger(result, "spellCast");
  return { ...result, targetAllocationFill };
}

function finishMagicMissile(input: {
  readonly state: BattleState;
  readonly slotLevel: number;
  readonly targetAllocationFill: Extract<
    BattleFill,
    { readonly kind: "spellTargetAllocation" }
  >;
  readonly damage: Extract<BattleHole, { readonly kind: "rolledDice" }>;
  readonly dartCount: number;
}): ReturnType<typeof resolveBattleSubject> {
  return resolveBattleSubject({
    state: input.state,
    subject: magicMissileSubject(input.slotLevel),
    fills: [
      input.targetAllocationFill,
      damageRollFillWithGroups(input.damage, [
        Array.from({ length: input.dartCount }, () => 1),
      ]),
    ],
  });
}

function resolveUnarmedStrikeAgainstReactor(
  state: BattleState,
): ReturnType<typeof resolveBattleSubject> {
  const attackAct = discoverBattleActs(state).find(
    (
      act,
    ): act is AvailableBattleAct & {
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "action"; readonly action: "attack" }
      >;
    } =>
      act.subject.tag === "action" &&
      act.subject.action === "attack" &&
      act.subject.actorId === triggerCreatureId &&
      act.subject.attackName === "Unarmed Strike",
  );
  if (attackAct === undefined) {
    throw new Error("Expected Unarmed Strike attack act.");
  }
  const target = requireHole(attackAct.initialHoles, "targetChoice");
  const targetFill = {
    kind: "targetChoice" as const,
    holeId: target.holeId,
    value: reactorId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach" as const,
        actorId: triggerCreatureId,
        targetId: reactorId,
        attackName: "Unarmed Strike",
      },
      {
        kind: "reactionSpellDamagerVisibleWithinRange" as const,
        reactorId,
        damageSourceId: triggerCreatureId,
        spellId: hellishRebukeUnitId,
        rangeFeet: movementFeet(60),
      },
    ],
  };
  const awaitingAttackRoll = resolveBattleSubject({
    state,
    subject: attackAct.subject,
    fills: [targetFill],
  });
  if (awaitingAttackRoll.tag !== "needsHoles") {
    throw new Error("Expected attack roll hole.");
  }
  const attackRoll = requireHole(awaitingAttackRoll.holes, "attackRoll");
  const result = resolveBattleSubject({
    state,
    subject: attackAct.subject,
    fills: [
      targetFill,
      {
        kind: "attackRoll",
        holeId: attackRoll.holeId,
        value: { total: 15, naturalD20: DieRollResult(13) },
      },
    ],
  });
  if (result.tag === "needsHoles") {
    requirePendingReactionTrigger(result, "afterDamage");
  }
  return result;
}

function magicMissileSubject(slotLevel: number): BattleSubject {
  return {
    tag: "actionSpell",
    actorId: triggerCreatureId,
    invocation: spellSlotInvocationRef(
      magicMissileUnitId,
      slotLevel,
      "repeatedDamageAllocation",
    ),
    mode: { tag: "cast" },
  };
}

function magicMissileTargetAllocationFill(input: {
  readonly hole: Extract<
    BattleHole,
    { readonly kind: "spellTargetAllocation" }
  >;
  readonly dartCount: number;
}): Extract<BattleFill, { readonly kind: "spellTargetAllocation" }> {
  return {
    kind: "spellTargetAllocation",
    holeId: input.hole.holeId,
    value: { allocations: [{ targetId: reactorId, count: input.dartCount }] },
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: triggerCreatureId,
        targetId: reactorId,
        spellId: magicMissileUnitId,
      },
    ],
  };
}

type CounterspellTriggerFact = Extract<
  Extract<
    BattleFill,
    { readonly kind: "targetSpatialFacts" }
  >["spatialFacts"][number],
  { readonly kind: "counterspellTriggerCasterVisibleWithinRange" }
>;

function counterspellTriggerFact(): CounterspellTriggerFact {
  return {
    kind: "counterspellTriggerCasterVisibleWithinRange",
    reactorId,
    casterId: triggerCreatureId,
    spellId: counterspellUnitId,
    rangeFeet: movementFeet(60),
  };
}

function requireCounterspellChoice(
  result: NeedsHolesResult,
): Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "castTriggeredReactionSpell" }
> {
  return requireTriggeredReactionSpellChoice({
    result,
    spellId: counterspellUnitId,
    procedure: "counterspell",
    slotLevel: counterspellSlotLevel,
  });
}

function requireHellishRebukeChoice(
  result: NeedsHolesResult,
): Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "castTriggeredReactionSpell" }
> {
  return requireTriggeredReactionSpellChoice({
    result,
    spellId: hellishRebukeUnitId,
    procedure: "saveGatedDamage",
    slotLevel: hellishRebukeSlotLevel,
  });
}

function requireTriggeredReactionSpellChoice(input: {
  readonly result: NeedsHolesResult;
  readonly spellId: string;
  readonly procedure: string;
  readonly slotLevel: number;
}): Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "castTriggeredReactionSpell" }
> {
  const choice = input.result.snapshot.pendingInterrupt?.choices.find(
    (
      candidate,
    ): candidate is Extract<
      BattleInterruptProcedureChoice,
      { readonly kind: "castTriggeredReactionSpell" }
    > =>
      candidate.kind === "castTriggeredReactionSpell" &&
      candidate.reactorId === reactorId &&
      candidate.invocation.tag === "spellSlot" &&
      candidate.invocation.spellId === input.spellId &&
      candidate.invocation.procedure === input.procedure &&
      Number(candidate.invocation.slotLevel) === input.slotLevel,
  );
  if (choice === undefined) {
    throw new Error(`Expected ${input.spellId} Reaction choice.`);
  }
  return choice;
}

function requirePendingReactionTrigger(
  result: NeedsHolesResult,
  trigger: "spellCast" | "afterDamage",
): void {
  if (result.snapshot.pendingInterrupt?.trigger !== trigger) {
    throw new Error(`Expected ${trigger} Reaction window.`);
  }
}

function triggeredReactionSpellDecision(
  reactor: CombatantId,
  choice: Extract<
    BattleInterruptProcedureChoice,
    { readonly kind: "castTriggeredReactionSpell" }
  >,
  fills: readonly BattleFill[],
): Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"] {
  return {
    kind: "resolve",
    responderId: reactor,
    choice: {
      kind: "castTriggeredReactionSpell",
      invocation: choice.invocation,
      fills,
    },
  };
}

function interruptDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "interruptDecision" }>,
  value: Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  return { kind: "interruptDecision", holeId: hole.holeId, value };
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

function damageRollFillWithGroups(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  groups: readonly (readonly number[])[],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [
      rolledDiceGroup(firstGroup),
      ...restGroups.map((group) => rolledDiceGroup(group)),
    ],
  };
}

function rolledDiceGroup(
  group: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }>["value"][number] {
  const [firstResult, ...restResults] = group;
  if (firstResult === undefined) {
    throw new Error("Expected at least one die roll result.");
  }
  return {
    results: [DieRollResult(firstResult), ...restResults.map(DieRollResult)],
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

function srdSpellRecord(unitId: string): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${unitId} to be a Spell.`);
  }
  return unit;
}

function expectedReactionCastingTimeProjection(
  overrides: Partial<ReactionCastingTimeProjection> = {},
): ReactionCastingTimeProjection {
  return {
    triggerKind: "none",
    continuationKind: "none",
    reactorHp: initialHp,
    triggerCreatureHp: initialHp,
    reactorReactionAvailable: true,
    triggerCreatureFirstLevelSlotsExpended: 0,
    triggerCreatureFourthLevelSlotsExpended: 0,
    reactorSecondLevelSlotsExpended: 0,
    reactorThirdLevelSlotsExpended: 0,
    reactionWindowCleared: false,
    lastResult: "init",
    ...overrides,
  };
}

function reactionCastingTimeProjection(
  state: ReactionCastingTimeRuntimeState,
): ReactionCastingTimeProjection {
  const snapshot = snapshotBattle(state.battle);
  const reactor = snapshot.combatants.find(
    (combatant) => combatant.combatantId === reactorId,
  );
  const triggerCreature = snapshot.combatants.find(
    (combatant) => combatant.combatantId === triggerCreatureId,
  );
  if (reactor === undefined || triggerCreature === undefined) {
    throw new Error("Expected Reaction casting time combatants.");
  }
  return {
    triggerKind: state.triggerKind,
    continuationKind: state.continuationKind,
    reactorHp: reactor.hp,
    triggerCreatureHp: triggerCreature.hp,
    reactorReactionAvailable: reactor.reactionAvailable,
    triggerCreatureFirstLevelSlotsExpended: expendedSlotsForSpellLevel(
      state.battle,
      triggerCreatureId,
      1,
    ),
    triggerCreatureFourthLevelSlotsExpended: expendedSlotsForSpellLevel(
      state.battle,
      triggerCreatureId,
      4,
    ),
    reactorSecondLevelSlotsExpended: expendedSlotsForSpellLevel(
      state.battle,
      reactorId,
      2,
    ),
    reactorThirdLevelSlotsExpended: expendedSlotsForSpellLevel(
      state.battle,
      reactorId,
      3,
    ),
    reactionWindowCleared:
      state.lastResult !== "init" && snapshot.pendingInterrupt === null,
    lastResult: state.lastResult,
  };
}

function expendedSlotsForSpellLevel(
  state: BattleState,
  combatantId: CombatantId,
  spellLevel: number,
): number {
  const combatant = state.combatants.get(combatantId);
  if (combatant?.origin.kind !== "character") {
    throw new Error("Expected character spell slot ledger.");
  }
  return (
    combatant.origin.spellcasting?.spellSlots.find(
      (slot) => slot.spellLevel === spellLevel,
    )?.expended ?? 0
  );
}

const reactionCastingTimeStateCheck = stateCheck(
  normalizeReactionCastingTimeQuintState,
  (
    spec: ReactionCastingTimeProjection,
    impl: ReactionCastingTimeProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

function normalizeReactionCastingTimeQuintState(
  raw: unknown,
): ReactionCastingTimeProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: reactionCastingTimeUnexpectedHole,
  });
  if (protocol.holes.length !== 0) {
    throw new Error(
      "Expected Reaction casting time witness holes to be empty.",
    );
  }
  const lastResultValue = reactionCastingTimeLastResult(
    state["qScenarioOutcome"],
  );
  assertWitnessProtocolConsistentWithScenario({
    label: "Reaction casting time",
    scenarioOutcome: lastResultValue,
    protocol,
  });
  return {
    triggerKind: reactionCastingTimeTriggerKind(state["qTriggerKind"]),
    continuationKind: reactionCastingTimeContinuationKind(
      state["qContinuationKind"],
    ),
    reactorHp: numberFromQuintInt(state["qReactorHp"], "qReactorHp"),
    triggerCreatureHp: numberFromQuintInt(
      state["qTriggerCreatureHp"],
      "qTriggerCreatureHp",
    ),
    reactorReactionAvailable: booleanField(state, "qReactorReactionAvailable"),
    triggerCreatureFirstLevelSlotsExpended: numberFromQuintInt(
      state["qTriggerCreatureFirstLevelSlotsExpended"],
      "qTriggerCreatureFirstLevelSlotsExpended",
    ),
    triggerCreatureFourthLevelSlotsExpended: numberFromQuintInt(
      state["qTriggerCreatureFourthLevelSlotsExpended"],
      "qTriggerCreatureFourthLevelSlotsExpended",
    ),
    reactorSecondLevelSlotsExpended: numberFromQuintInt(
      state["qReactorSecondLevelSlotsExpended"],
      "qReactorSecondLevelSlotsExpended",
    ),
    reactorThirdLevelSlotsExpended: numberFromQuintInt(
      state["qReactorThirdLevelSlotsExpended"],
      "qReactorThirdLevelSlotsExpended",
    ),
    reactionWindowCleared: booleanField(state, "qReactionWindowCleared"),
    lastResult: lastResultValue,
  };
}

function reactionCastingTimeUnexpectedHole(raw: unknown): never {
  throw new Error(
    `Reaction casting time witness does not expect holes; received ${String(raw)}.`,
  );
}

function reactionCastingTimeTriggerKind(
  raw: unknown,
): ReactionCastingTimeTriggerKind {
  if (raw === "none" || raw === "spellCast" || raw === "afterDamage") {
    return raw;
  }
  throw new Error(`Unexpected Reaction casting time trigger ${String(raw)}.`);
}

function reactionCastingTimeContinuationKind(
  raw: unknown,
): ReactionCastingTimeContinuationKind {
  if (
    raw === "none" ||
    raw === "spellCastEnded" ||
    raw === "spellCastResumed" ||
    raw === "afterDamageResolved"
  ) {
    return raw;
  }
  throw new Error(
    `Unexpected Reaction casting time continuation ${String(raw)}.`,
  );
}

function reactionCastingTimeLastResult(
  raw: unknown,
): ReactionCastingTimeLastResult {
  return quintVariantMappedValue(
    raw,
    "qScenarioOutcome",
    REACTION_CASTING_TIME_LAST_RESULT_BY_SCENARIO_OUTCOME_TAG,
    "Reaction casting time result",
  );
}
