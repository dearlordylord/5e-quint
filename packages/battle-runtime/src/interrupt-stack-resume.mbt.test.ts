// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#Reactions: a Reaction can
//   interrupt another creature's turn and that creature can continue afterward.
// - .references/srd-5.2.1/Rules-Glossary.md#Reaction: one Reaction is available
//   until the start of the creature's next turn.
// - .references/srd-5.2.1/Rules-Glossary.md#Ready-Action: a readied spell is
//   released as a Reaction when its trigger occurs.
// - .references/srd-5.2.1/Spells/Gaining-and-Casting.md#Reaction-and-Bonus-Action-Triggers:
//   Reaction spells are cast in response to spell-defined triggers.
// - UBIQUITOUS_LANGUAGE.md: Offer, Decline, Advance, Spell Invocation, and Spell Effect.
// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY
import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
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
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  damageRollFill,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  fighterTurnWithReadiedAcidAndSecondReadiedRay,
  findHole,
  goblinId,
  interruptDecisionFill,
  reactionChoiceWithSubject,
  savingThrowOutcomeFill,
  secondWizardId,
  targetFill,
  wizardId,
} from "./battle-runtime-test-support.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { replayContinuationFrame } from "./battle-reducer/dispatcher.ts";
import {
  battleCombatantSide,
  battleId,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleInterrupt,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleInterruptProcedureChoice,
  type BattleInterruptedProcedure,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";

const interruptStackResumeDriverSchema = {
  init: {},
  doNestedDeclineResumesOuterInterrupt: {},
  doShieldMutationResumesInterruptedAttack: {},
  doReplayRecordedProcedureFromRoot: {},
  step: {},
} as const;

type InterruptStackResumeDriverAction = Exclude<
  keyof typeof interruptStackResumeDriverSchema,
  "init" | "step"
>;
type InterruptStackResumeTrigger = "none" | "attackHit";
type InterruptStackResumeHole = "none" | "rolledDice";
type InterruptStackResumeLastResult =
  | "init"
  | "nestedDeclineResumedOuter"
  | "activeEffectMutationResumed"
  | "replayFromRootResolved";
type InterruptStackResumeProjection = {
  readonly maxStackDepthObserved: number;
  readonly finalStackDepth: number;
  readonly pendingTrigger: InterruptStackResumeTrigger;
  readonly resumedHole: InterruptStackResumeHole;
  readonly activeEffectMutationSeenOnResume: boolean;
  readonly replayFromRootEquivalent: boolean;
  readonly responderReactionAvailable: boolean;
  readonly targetHp: number;
  readonly lastResult: InterruptStackResumeLastResult;
};

type InterruptStackResumeRuntimeState = {
  readonly battle: BattleState;
  readonly maxStackDepthObserved: number;
  readonly resumedHole: InterruptStackResumeHole;
  readonly activeEffectMutationSeenOnResume: boolean;
  readonly replayFromRootEquivalent: boolean;
  readonly responderId: CombatantId;
  readonly targetId: CombatantId;
  readonly lastResult: InterruptStackResumeLastResult;
};

type InterruptStackResumeReplaySequence = {
  readonly name: string;
  readonly actions: readonly InterruptStackResumeDriverAction[];
  readonly expected: InterruptStackResumeProjection;
};

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Interrupt stack resume Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;

const shieldUnitId = "shield";
const shieldAttackerId = combatantId("interrupt-stack-shield-attacker");
const shieldCasterId = combatantId("interrupt-stack-shield-caster");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");
const initialHp = 12;
const nestedFixtureTargetHp = 10;

const replaySequences = [
  {
    name: "nested-decline-resumes-outer-interrupt",
    actions: ["doNestedDeclineResumesOuterInterrupt"],
    expected: expectedInterruptStackResumeProjection({
      maxStackDepthObserved: 2,
      finalStackDepth: 1,
      pendingTrigger: "attackHit",
      resumedHole: "rolledDice",
      responderReactionAvailable: true,
      targetHp: nestedFixtureTargetHp,
      lastResult: "nestedDeclineResumedOuter",
    }),
  },
  {
    name: "shield-active-effect-mutation-resumes-interrupted-attack",
    actions: ["doShieldMutationResumesInterruptedAttack"],
    expected: expectedInterruptStackResumeProjection({
      maxStackDepthObserved: 1,
      finalStackDepth: 0,
      activeEffectMutationSeenOnResume: true,
      responderReactionAvailable: false,
      lastResult: "activeEffectMutationResumed",
    }),
  },
  {
    name: "replay-recorded-procedure-from-root",
    actions: ["doReplayRecordedProcedureFromRoot"],
    expected: expectedInterruptStackResumeProjection({
      replayFromRootEquivalent: true,
      targetHp: 3,
      lastResult: "replayFromRootResolved",
    }),
  },
] as const satisfies ReadonlyArray<InterruptStackResumeReplaySequence>;

describe("interrupt stack resume MBT", () => {
  it("replays every focused interrupt stack resume path deterministically", async () => {
    const replayedActions = new Set<InterruptStackResumeDriverAction>();

    for (const sequence of replaySequences) {
      const driver = createInterruptStackResumeDriver()();

      for (const actionName of sequence.actions) {
        replayedActions.add(actionName);
        const action = driver.actions[actionName];
        if (action === undefined) {
          throw new Error(
            `Missing interrupt stack resume driver action ${actionName}.`,
          );
        }
        await action.handler({});
      }

      const runtime = driver.getState?.();
      if (runtime === undefined) {
        throw new Error("Interrupt stack resume driver must expose getState.");
      }
      expect(runtime, sequence.name).toEqual(sequence.expected);
    }

    expect(replayedActions).toEqual(
      new Set(replaySequences.flatMap((sequence) => sequence.actions)),
    );
  });

  it(
    "matches focused interrupt stack resume traces against Quint",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-interrupt-stack-resume.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createInterruptStackResumeDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(1),
        stateCheck: interruptStackResumeStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function createInterruptStackResumeDriver() {
  return defineDriver(interruptStackResumeDriverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doNestedDeclineResumesOuterInterrupt: () => {
        state = nestedDeclineResumesOuterInterrupt();
      },
      doShieldMutationResumesInterruptedAttack: () => {
        state = shieldMutationResumesInterruptedAttack();
      },
      doReplayRecordedProcedureFromRoot: () => {
        state = replayRecordedProcedureFromRoot();
      },
      step: () => {},
      getState: () => interruptStackResumeProjection(state),
    };
  });
}

function initialRuntimeState(): InterruptStackResumeRuntimeState {
  return {
    battle: shieldBattle(srdSpellRecord(shieldUnitId)),
    maxStackDepthObserved: 0,
    resumedHole: "none",
    activeEffectMutationSeenOnResume: false,
    replayFromRootEquivalent: false,
    responderId: shieldCasterId,
    targetId: shieldCasterId,
    lastResult: "init",
  };
}

function nestedDeclineResumesOuterInterrupt(): InterruptStackResumeRuntimeState {
  const state = fighterTurnWithReadiedAcidAndSecondReadiedRay();
  const subject = fighterAttackSubject();
  const target = attackInitialTargetHole(state, subject);
  const attackRoll = attackRollHoleAfterTarget(state, target, subject);
  const awaitingAttackReaction = resolveBattleSubject({
    state,
    subject,
    fills: [
      targetFill(target, goblinId),
      attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
    ],
  });
  if (awaitingAttackReaction.tag !== "needsHoles") {
    throw new Error("Expected outer attack-hit interrupt window.");
  }
  const releaseChoice = reactionChoiceWithSubject(
    awaitingAttackReaction.snapshot.pendingInterrupt!.choices,
  );
  const released = resolveBattleInterrupt({
    state: awaitingAttackReaction.state,
    fill: interruptDecisionFill(
      awaitingAttackReaction.snapshot.pendingInterrupt!.decisionHole,
      {
        kind: "resolve",
        responderId: wizardId,
        choice: {
          kind: "releaseReadiedSpell",
          readiedSpellCasterId: wizardId,
          fills: [],
        },
      },
    ),
  });
  if (released.tag !== "needsHoles") {
    throw new Error("Expected released readied spell holes.");
  }
  const save = findHole(released.holes, "savingThrowOutcome");
  if (save.kind !== "savingThrowOutcome") {
    throw new Error("Expected readied spell Saving Throw outcome hole.");
  }
  const failedOutcomes = [...released.state.combatants.keys()]
    .filter((targetId) => targetId !== wizardId)
    .slice(0, 1)
    .map((targetId) => ({ targetId, succeeded: false }));
  const nested = resolveBattleSubject({
    state: released.state,
    subject: releaseChoice.subject,
    fills: [savingThrowOutcomeFill(save, failedOutcomes)],
  });
  if (nested.tag !== "needsHoles") {
    throw new Error("Expected nested save-failed interrupt window.");
  }
  const maxStackDepthObserved = nested.snapshot.pendingInterrupt?.stackDepth ?? 0;
  const declinedNested = resolveBattleInterrupt({
    state: nested.state,
    fill: interruptDecisionFill(nested.snapshot.pendingInterrupt!.decisionHole, {
      kind: "decline",
      responderId: secondWizardId,
    }),
  });
  if (declinedNested.tag !== "needsHoles") {
    throw new Error("Expected nested decline to resume released spell damage.");
  }
  const resumedHole = declinedNested.holes.some(
    (hole) => hole.kind === "rolledDice",
  )
    ? "rolledDice"
    : "none";
  return {
    battle: declinedNested.state,
    maxStackDepthObserved,
    resumedHole,
    activeEffectMutationSeenOnResume: false,
    replayFromRootEquivalent: false,
    responderId: secondWizardId,
    targetId: goblinId,
    lastResult: "nestedDeclineResumedOuter",
  };
}

function shieldMutationResumesInterruptedAttack(): InterruptStackResumeRuntimeState {
  const state = shieldBattle(srdSpellRecord(shieldUnitId));
  const attackAct = unarmedStrikeAct(state);
  const target = requireHoleFromArray(attackAct.initialHoles, "targetChoice");
  const targetFillForAttack = attackTargetFill(target);
  const awaitingAttackRoll = resolveBattleSubject({
    state,
    subject: attackAct.subject,
    fills: [targetFillForAttack],
  });
  if (awaitingAttackRoll.tag !== "needsHoles") {
    throw new Error("Expected attack target to request an Attack Roll.");
  }
  const attackRoll = requireHoleFromArray(awaitingAttackRoll.holes, "attackRoll");
  const awaitingReaction = resolveBattleSubject({
    state,
    subject: attackAct.subject,
    fills: [
      targetFillForAttack,
      attackRollFill(attackRoll, { total: 14, naturalD20: 10 }),
    ],
  });
  if (awaitingReaction.tag !== "needsHoles") {
    throw new Error("Expected Shield to open an attack-hit interrupt window.");
  }
  const maxStackDepthObserved =
    awaitingReaction.snapshot.pendingInterrupt?.stackDepth ?? 0;
  const choice = requireShieldReactionChoice(awaitingReaction);
  const resolved = resolveBattleInterrupt({
    state: awaitingReaction.state,
    fill: interruptDecisionFill(
      awaitingReaction.snapshot.pendingInterrupt!.decisionHole,
      {
        kind: "resolve",
        responderId: shieldCasterId,
        choice: {
          kind: "castTriggeredReactionSpell",
          invocation: choice.invocation,
          fills: [],
        },
      },
    ),
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Shield active effect to resume the attack.");
  }
  return {
    battle: resolved.state,
    maxStackDepthObserved,
    resumedHole: "none",
    activeEffectMutationSeenOnResume: shieldArmorClassBonusActive(
      resolved.state,
      shieldCasterId,
    ),
    replayFromRootEquivalent: false,
    responderId: shieldCasterId,
    targetId: shieldCasterId,
    lastResult: "activeEffectMutationResumed",
  };
}

function replayRecordedProcedureFromRoot(): InterruptStackResumeRuntimeState {
  const state = fighterVsGoblinBattle();
  const subject = fighterAttackSubject();
  const target = attackInitialTargetHole(state, subject);
  const attackRoll = attackRollHoleAfterTarget(state, target, subject);
  const recordedFills = [
    targetFill(target, goblinId),
    attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
  ] as const satisfies readonly BattleFill[];
  const continuation = {
    kind: "replay",
    subject,
    fills: recordedFills,
  } as const satisfies Extract<
    BattleInterruptedProcedure,
    { readonly kind: "replay" }
  >;
  const independentNeedsDamage = resolveBattleSubject({
    state,
    subject,
    fills: recordedFills,
  });
  if (independentNeedsDamage.tag !== "needsHoles") {
    throw new Error("Expected independent root path to request damage.");
  }
  const damageHole = requireHoleFromArray(
    independentNeedsDamage.holes,
    "rolledDice",
  );
  const damageFill = damageRollFill(damageHole, 4);
  const completedFills = [...recordedFills, damageFill] as const;
  const independentResolved = resolveBattleSubject({
    state,
    subject,
    fills: completedFills,
  });
  const replayFrameState = {
    ...state,
    interruptStack: [replayContinuationFrame(continuation, "attackHit")],
  };
  const replayFromRoot = resolveBattleSubject({
    state: replayFrameState,
    subject,
    fills: [damageFill],
  });
  if (
    independentResolved.tag !== "resolved" ||
    replayFromRoot.tag !== "resolved"
  ) {
    throw new Error("Expected replay-from-root comparison to resolve.");
  }
  return {
    battle: independentResolved.state,
    maxStackDepthObserved: 0,
    resumedHole: "none",
    activeEffectMutationSeenOnResume: false,
    replayFromRootEquivalent: equivalentResolvedProjection(
      independentResolved,
      replayFromRoot,
    ),
    responderId: fighterId,
    targetId: goblinId,
    lastResult: "replayFromRootResolved",
  };
}

function shieldBattle(shield: SpellRecord): BattleState {
  const result = startBattle({
    battleId: battleId("interrupt-stack-resume-shield"),
    combatants: [
      characterCreature({
        combatantId: shieldAttackerId,
        displayName: "Attacker",
        initiative: 20,
        side: oppositionSide,
      }),
      characterCreature({
        combatantId: shieldCasterId,
        displayName: "Shield caster",
        initiative: 10,
        side: partySide,
        spellcasting: {
          sourceClassName: "wizard",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [shield],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        },
      }),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function characterCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
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
      classLevels: [{ className: "wizard", level: 1 }],
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
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

type AttackAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >;
};

function unarmedStrikeAct(state: BattleState): AttackAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is AttackAct =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack" &&
      candidate.subject.actorId === shieldAttackerId &&
      candidate.subject.attackName === "Unarmed Strike",
  );
  if (act === undefined) {
    throw new Error("Expected Unarmed Strike attack act.");
  }
  return act;
}

function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: shieldCasterId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId: shieldAttackerId,
        targetId: shieldCasterId,
        attackName: "Unarmed Strike",
      },
    ],
  };
}

function requireHoleFromArray<K extends BattleHole["kind"]>(
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

function requireShieldReactionChoice(
  result: Extract<BattleResolutionResult, { readonly tag: "needsHoles" }>,
): Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "castTriggeredReactionSpell" }
> {
  const choice = result.snapshot.pendingInterrupt?.choices.find(
    (
      candidate,
    ): candidate is Extract<
      BattleInterruptProcedureChoice,
      { readonly kind: "castTriggeredReactionSpell" }
    > =>
      candidate.kind === "castTriggeredReactionSpell" &&
      candidate.reactorId === shieldCasterId &&
      candidate.invocation.tag === "spellSlot" &&
      candidate.invocation.spellId === shieldUnitId &&
      candidate.invocation.procedure === "shieldReaction",
  );
  if (choice === undefined) {
    throw new Error("Expected Shield Reaction choice.");
  }
  return choice;
}

function shieldArmorClassBonusActive(
  state: BattleState,
  combatantId: CombatantId,
): boolean {
  return (
    state.combatants
      .get(combatantId)
      ?.activeEffects.some((effect) => effect.kind === "spellArmorClassBonus") ??
    false
  );
}

function srdSpellRecord(unitId: string): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${unitId} to be a Spell.`);
  }
  return unit;
}

function interruptStackResumeProjection(
  state: InterruptStackResumeRuntimeState,
): InterruptStackResumeProjection {
  const snapshot = snapshotBattle(state.battle);
  const responder = snapshot.combatants.find(
    (combatant) => combatant.combatantId === state.responderId,
  );
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === state.targetId,
  );
  if (responder === undefined || target === undefined) {
    throw new Error("Expected interrupt stack resume combatants.");
  }
  return {
    maxStackDepthObserved: state.maxStackDepthObserved,
    finalStackDepth: snapshot.pendingInterrupt?.stackDepth ?? 0,
    pendingTrigger: interruptStackResumeTrigger(
      snapshot.pendingInterrupt?.trigger ?? "none",
    ),
    resumedHole: state.resumedHole,
    activeEffectMutationSeenOnResume: state.activeEffectMutationSeenOnResume,
    replayFromRootEquivalent: state.replayFromRootEquivalent,
    responderReactionAvailable: responder.reactionAvailable,
    targetHp: target.hp,
    lastResult: state.lastResult,
  };
}

function expectedInterruptStackResumeProjection(
  overrides: Partial<InterruptStackResumeProjection> = {},
): InterruptStackResumeProjection {
  return {
    maxStackDepthObserved: 0,
    finalStackDepth: 0,
    pendingTrigger: "none",
    resumedHole: "none",
    activeEffectMutationSeenOnResume: false,
    replayFromRootEquivalent: false,
    responderReactionAvailable: true,
    targetHp: initialHp,
    lastResult: "init",
    ...overrides,
  };
}

const interruptStackResumeStateCheck = stateCheck(
  normalizeInterruptStackResumeQuintState,
  (
    spec: InterruptStackResumeProjection,
    impl: InterruptStackResumeProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

function normalizeInterruptStackResumeQuintState(
  raw: unknown,
): InterruptStackResumeProjection {
  const state = quintStateRecord(raw);
  return {
    maxStackDepthObserved: numberFromQuintInt(
      state["qMaxStackDepthObserved"],
      "qMaxStackDepthObserved",
    ),
    finalStackDepth: numberFromQuintInt(
      state["qFinalStackDepth"],
      "qFinalStackDepth",
    ),
    pendingTrigger: interruptStackResumeTrigger(state["qPendingTrigger"]),
    resumedHole: interruptStackResumeHole(state["qResumedHole"]),
    activeEffectMutationSeenOnResume: booleanField(
      state,
      "qActiveEffectMutationSeenOnResume",
    ),
    replayFromRootEquivalent: booleanField(state, "qReplayFromRootEquivalent"),
    responderReactionAvailable: booleanField(
      state,
      "qResponderReactionAvailable",
    ),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    lastResult: interruptStackResumeLastResult(state["qLastResult"]),
  };
}

function interruptStackResumeTrigger(
  raw: unknown,
): InterruptStackResumeTrigger {
  if (raw === "none" || raw === "attackHit") {
    return raw;
  }
  throw new Error(`Unexpected interrupt stack resume trigger ${String(raw)}.`);
}

function interruptStackResumeHole(raw: unknown): InterruptStackResumeHole {
  if (raw === "none" || raw === "rolledDice") {
    return raw;
  }
  throw new Error(`Unexpected interrupt stack resume hole ${String(raw)}.`);
}

function interruptStackResumeLastResult(
  raw: unknown,
): InterruptStackResumeLastResult {
  if (
    raw === "init" ||
    raw === "nestedDeclineResumedOuter" ||
    raw === "activeEffectMutationResumed" ||
    raw === "replayFromRootResolved"
  ) {
    return raw;
  }
  throw new Error(
    `Unexpected interrupt stack resume result ${String(raw)}.`,
  );
}

function equivalentResolvedProjection(
  left: Extract<BattleResolutionResult, { readonly tag: "resolved" }>,
  right: Extract<BattleResolutionResult, { readonly tag: "resolved" }>,
): boolean {
  const leftSnapshot = snapshotBattle(left.state);
  const rightSnapshot = snapshotBattle(right.state);
  return JSON.stringify(leftSnapshot) === JSON.stringify(rightSnapshot);
}
