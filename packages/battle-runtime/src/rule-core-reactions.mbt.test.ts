// RAW-COVERAGE: verification-owner:focused-mbt RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-RULES-GLOSSARY-CONCENTRATION-DAMAGE-001
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.reaction-roll-or-damage-reduction spell.reaction-shield
// KERNEL-COVERAGE: parity-witness BATTLE.REACTION.OFFER_DECLINE_RESUME
import { isDeepStrictEqual } from "node:util";
import {
  battleProcedureExecutionRefForTest,
  resolveBattleSubject,
  attackExecutionSelectionForSubjectForTest,
  attackRollFill,
  characterAttackSubjectForTest,
  opportunityAttackProcedureSelectionForTest,
  reactionChoiceWithSubject,
  readyDeclarationFillForTest,
} from "./battle-runtime.test-support.ts";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintStateRecord,
  quintVariantTag,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import {
  decodeRuleCoreComponentRoute,
  type RuleCoreComponentRoutedProjection,
  withRuleCoreComponentRoute,
} from "./rule-core-component-route.test-support.ts";
import { Either } from "effect";
import { describe, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
  Hp,
  movementFeet,
} from "@dnd/shared/types";

import {
  battleId,
  characterId,
  combatantId,
  concentrationSavingThrowDc,
  endTurn,
  initiativeScore,
  resolveBattleConcentrationDamage,
  resolveBattleInterrupt,
  snapshotBattle,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";

const ruleCoreReactionMbtHoles = ["ReactionDecision", "DamageRoll"] as const;
type RuleCoreReactionMbtHole = (typeof ruleCoreReactionMbtHoles)[number];
const ruleCoreReactionResults = [
  "init",
  "needsHoles",
  "resolved",
  "invalid",
] as const;
type RuleCoreReactionResult = (typeof ruleCoreReactionResults)[number];
const ruleCoreReactionInvalidReasons = ["none", "invalidFill"] as const;
type RuleCoreReactionInvalidReason =
  (typeof ruleCoreReactionInvalidReasons)[number];
const ruleCoreReactionTriggers = [
  "none",
  "opportunityAttack",
  "attackHit",
] as const;
type RuleCoreReactionTrigger = (typeof ruleCoreReactionTriggers)[number];

type RuleCoreReactionProjection = RuleCoreComponentRoutedProjection & {
  readonly interruptedMovementSpentFeet: number;
  readonly interruptedHitPoints: number;
  readonly reactorReactionAvailable: boolean;
  readonly reactorHitPoints: number;
  readonly reactorReadiedMovementHeld: boolean;
  readonly reactorReadiedSpellHeld: boolean;
  readonly reactorMovementSpentFeet: number;
  readonly interruptedConcentration: boolean;
  readonly reactorConcentration: boolean;
  readonly pendingTrigger: RuleCoreReactionTrigger;
  readonly pendingStackDepth: number;
  readonly holes: readonly RuleCoreReactionMbtHole[];
  readonly lastConcentrationSaveDc: number;
  readonly lastResult: RuleCoreReactionResult;
  readonly lastInvalidReason: RuleCoreReactionInvalidReason;
};

const reactorId = combatantId("rule-core-reactor");
const interruptedId = combatantId("rule-core-interrupted");
const movementResumeCostFeet = 10;
const readiedMovementShortCostFeet = 5;
const readiedMovementFillCostFeet = 10;
const concentrationSpellId = "rule_core_concentration_fixture";
const ruleCoreReactionAttackName = "Unarmed Strike";
const componentOwner = "RuleCoreReactionContinuationConcentrationOwner";

const driverSchema = {
  init: {},
  doOfferOpportunityAttack: {},
  doDeclineOpportunityAttack: {},
  doTakeOpportunityAttack: {},
  doReadyMovementFixture: {},
  doOfferReadiedMovement: {},
  doDeclineReadiedMovement: {},
  doTakeReadiedMovementShort: {},
  doTakeReadiedMovementFill: {},
  doRejectReadiedMovementZero: {},
  doStartReactorConcentrationFixture: {},
  doHoldReactorConcentrationAfterSmallDamage: {},
  doBreakReactorConcentrationAfterLargeDamage: {},
  step: {},
} as const;

function createRuleCoreReactionDriver() {
  return defineDriver(driverSchema, () => {
    let state = ruleCoreReactionBattle();
    let holes: readonly BattleHole[] = [];
    let lastResult: RuleCoreReactionProjection["lastResult"] = "init";
    let lastInvalidReason: RuleCoreReactionProjection["lastInvalidReason"] =
      "none";
    let lastConcentrationSaveDc = 0;

    function reset(): void {
      state = ruleCoreReactionBattle();
      holes = [];
      lastResult = "init";
      lastInvalidReason = "none";
      lastConcentrationSaveDc = 0;
    }

    function recordResult(result: BattleResolutionResult): void {
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        lastResult = "resolved";
        lastInvalidReason = "none";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastResult = "needsHoles";
        lastInvalidReason = "none";
        return;
      }
      if (!isRuleCoreReactionInvalidReason(result.reason)) {
        throw new Error(
          `Unexpected rule-core Reaction MBT invalid reason: ${result.reason}`,
        );
      }
      lastResult = "invalid";
      lastInvalidReason = result.reason;
    }

    function resolveSubject(
      subject: BattleSubject,
      fills: readonly BattleFill[] = [],
    ): BattleResolutionResult {
      const result = resolveBattleSubject({ state, subject, fills });
      recordResult(result);
      return result;
    }

    function recordConcentrationDamage(input: {
      readonly damageAmount: number;
      readonly savingThrowSucceeded: boolean;
    }): void {
      const wasConcentrating =
        state.combatants.get(reactorId)?.concentration !== null;
      state = resolveBattleConcentrationDamage({
        state,
        combatantId: reactorId,
        damageAmount: input.damageAmount,
        savingThrowSucceeded: input.savingThrowSucceeded,
      });
      lastConcentrationSaveDc =
        wasConcentrating && input.damageAmount > 0
          ? Number(concentrationSavingThrowDc(input.damageAmount))
          : 0;
      holes = [];
      lastResult = "resolved";
      lastInvalidReason = "none";
    }

    return {
      init: reset,
      doOfferOpportunityAttack: () => {
        const discovered = resolveSubject({
          tag: "runtimeCommand",
          actorId: interruptedId,
          command: "move",
        });
        if (discovered.tag !== "needsHoles") return;
        recordResult(
          resolveBattleSubject({
            state,
            subject: {
              tag: "runtimeCommand",
              actorId: interruptedId,
              command: "move",
            },
            fills: [
              movementFill(requireMovementHole(holes), {
                movementCostFeet: movementResumeCostFeet,
                provokedOpportunityAttacks: [
                  {
                    reactorId,
                    ...attackExecutionSelectionForSubjectForTest(
                      characterAttackSubjectForTest(
                        state,
                        reactorId,
                        ruleCoreReactionAttackName,
                      ),
                    ),
                  },
                ],
              }),
            ],
          }),
        );
      },
      doDeclineOpportunityAttack: () =>
        recordResult(
          resolveBattleInterrupt({
            state,
            fill: interruptDecisionFill(requireReactionDecisionHole(holes), {
              kind: "decline",
              responderId: reactorId,
            }),
          }),
        ),
      doTakeOpportunityAttack: () => {
        const pendingInterrupt = snapshotBattle(state).pendingInterrupt;
        const rawOpportunityChoice = pendingInterrupt?.choices.find(
          (candidate) =>
            candidate.kind === "opportunityAttack" &&
            candidate.reactorId === reactorId &&
            candidate.subject.targetId === interruptedId,
        );
        if (pendingInterrupt === null || rawOpportunityChoice === undefined) {
          throw new Error(
            "Expected the reactor-to-interrupted Opportunity Attack choice.",
          );
        }
        const choice = reactionChoiceWithSubject([rawOpportunityChoice]);
        const started = resolveBattleInterrupt({
          state,
          fill: interruptDecisionFill(requireReactionDecisionHole(holes), {
            kind: "resolve",
            responderId: reactorId,
            choice: opportunityAttackProcedureSelectionForTest(choice),
          }),
        });
        if (started.tag !== "needsHoles") {
          recordResult(started);
          return;
        }
        const attackRoll = requireAttackRollHole(started.holes);
        recordResult(
          resolveBattleSubject({
            state: started.state,
            subject: choice.subject,
            fills: [attackRollFill(attackRoll, { total: 20, naturalD20: 18 })],
          }),
        );
      },
      doReadyMovementFixture: () => {
        state = ruleCoreReadiedMovementBattle();
        lastConcentrationSaveDc = 0;
        const subject = {
          tag: "action" as const,
          actorId: reactorId,
          action: "ready" as const,
        };
        const declaration = resolveBattleSubject({
          state,
          subject,
          fills: [],
        });
        if (declaration.tag !== "needsHoles") {
          recordResult(declaration);
          return;
        }
        const readied = resolveBattleSubject({
          state,
          subject,
          fills: [
            readyDeclarationFillForTest(
              declaration.holes[0]!,
              "the other combatant attacks",
              { kind: "movement" },
            ),
          ],
        });
        recordResult(readied);
        if (readied.tag !== "resolved") return;
        recordResult(endTurn({ state, actorId: reactorId }));
      },
      doOfferReadiedMovement: () => {
        recordResult(
          resolveBattleSubject({
            state,
            subject: {
              tag: "runtimeCommand",
              actorId: interruptedId,
              command: "reportReadyTrigger",
              readiedActorId: reactorId,
            },
            fills: [],
          }),
        );
      },
      doDeclineReadiedMovement: () =>
        recordResult(
          resolveBattleInterrupt({
            state,
            fill: interruptDecisionFill(requireReactionDecisionHole(holes), {
              kind: "decline",
              responderId: reactorId,
            }),
          }),
        ),
      doTakeReadiedMovementShort: () =>
        resolveReadiedMovementReaction(readiedMovementShortCostFeet),
      doTakeReadiedMovementFill: () =>
        resolveReadiedMovementReaction(readiedMovementFillCostFeet),
      doRejectReadiedMovementZero: () => resolveReadiedMovementReaction(0),
      doStartReactorConcentrationFixture: () => {
        state = withReactorConcentration(state);
        holes = [];
        lastResult = "resolved";
        lastInvalidReason = "none";
      },
      doHoldReactorConcentrationAfterSmallDamage: () =>
        recordConcentrationDamage({
          damageAmount: 8,
          savingThrowSucceeded: true,
        }),
      doBreakReactorConcentrationAfterLargeDamage: () =>
        recordConcentrationDamage({
          damageAmount: 22,
          savingThrowSucceeded: false,
        }),
      step: () => {},
      getState: () =>
        projectRuleCoreReactionState({
          state,
          holes,
          lastConcentrationSaveDc,
          lastResult,
          lastInvalidReason,
        }),
    };

    function resolveReadiedMovementReaction(movementCostFeet: number): void {
      const choice = snapshotBattle(state).pendingInterrupt?.choices.find(
        (candidate) =>
          candidate.kind === "releaseReadiedMovement" &&
          candidate.readiedMovementActorId === reactorId,
      );
      if (choice === undefined) {
        throw new Error("Expected Readied Movement Reaction choice.");
      }
      const movementHole = choice.initialHoles.find(
        (hole) => hole.kind === "movement",
      );
      if (movementHole === undefined) {
        throw new Error("Expected Readied Movement release hole.");
      }
      recordResult(
        resolveBattleInterrupt({
          state,
          fill: interruptDecisionFill(requireReactionDecisionHole(holes), {
            kind: "resolve",
            responderId: reactorId,
            choice: {
              kind: "releaseReadiedMovement",
              readiedMovementActorId: reactorId,
              fills: [
                movementFill(movementHole, {
                  movementCostFeet,
                  provokedOpportunityAttacks: [],
                }),
              ],
            },
          }),
        }),
      );
    }
  });
}

const reactionStateCheck = stateCheck(
  normalizeRuleCoreReactionQuintState,
  compareRuleCoreReactionState,
);

const ruleCoreReactionDefaultMbtSteps = 6;

describe("rule-core Reaction focused MBT", () => {
  it(
    "replays QCORE8 Reaction, continuation, Readied Movement, and Concentration parity",
    async () => {
      await run({
        spec: mbtSpecPath(import.meta.dirname, "rule-core-reactions.mbt.qnt"),
        init: "init",
        step: "step",
        driver: createRuleCoreReactionDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(ruleCoreReactionDefaultMbtSteps),
        stateCheck: reactionStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function ruleCoreReactionBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("rule-core-reactions"),
    combatants: [
      reactionCreature({
        combatantId: interruptedId,
        characterId: "rule-core-interrupted-character",
        displayName: "Rule Core Interrupted",
        initiative: 20,
      }),
      reactionCreature({
        combatantId: reactorId,
        characterId: "rule-core-reactor-character",
        displayName: "Rule Core Reactor",
        initiative: 10,
      }),
    ],
  });
}

function ruleCoreReadiedMovementBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("rule-core-readied-movement"),
    combatants: [
      reactionCreature({
        combatantId: reactorId,
        characterId: "rule-core-reactor-character",
        displayName: "Rule Core Reactor",
        initiative: 20,
      }),
      reactionCreature({
        combatantId: interruptedId,
        characterId: "rule-core-interrupted-character",
        displayName: "Rule Core Interrupted",
        initiative: 10,
      }),
    ],
  });
}

function startBattleRight(
  input: Parameters<typeof startBattle>[0],
): BattleState {
  const result = startBattle(input);
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right.state;
}

function reactionCreature(input: {
  readonly combatantId: CombatantId;
  readonly characterId: string;
  readonly displayName: string;
  readonly initiative: number;
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "character",
      ammunitionStocks: [],
      characterId: characterId(input.characterId),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      weaponMasteries: [],
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
    },
  };
}

function withReactorConcentration(state: BattleState): BattleState {
  const reactor = state.combatants.get(reactorId);
  if (reactor === undefined) {
    throw new Error("Expected rule-core Reaction reactor.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(reactorId, {
      ...reactor,
      concentration: {
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String(concentrationSpellId),
        ),
        effectKind: "spellEffect",
      },
    }),
  };
}

function projectRuleCoreReactionState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastConcentrationSaveDc: number;
  readonly lastResult: RuleCoreReactionProjection["lastResult"];
  readonly lastInvalidReason: RuleCoreReactionProjection["lastInvalidReason"];
}): RuleCoreReactionProjection {
  const snapshot = snapshotBattle(input.state);
  const interrupted = snapshot.combatants.find(
    (combatant) => combatant.combatantId === interruptedId,
  );
  const reactor = snapshot.combatants.find(
    (combatant) => combatant.combatantId === reactorId,
  );
  if (interrupted === undefined || reactor === undefined) {
    throw new Error("Expected rule-core Reaction combatants.");
  }
  return withRuleCoreComponentRoute(componentOwner, {
    interruptedMovementSpentFeet: interrupted.movement.spentFeet,
    interruptedHitPoints: Number(interrupted.hp),
    reactorReactionAvailable: reactor.reactionAvailable,
    reactorHitPoints: Number(reactor.hp),
    reactorReadiedMovementHeld:
      snapshot.readiedResponses.actionsOrMovements.some(
        (readied) => readied.actorId === reactorId,
      ),
    reactorReadiedSpellHeld: snapshot.readiedResponses.spells.some(
      (readied) => readied.casterId === reactorId,
    ),
    reactorMovementSpentFeet: reactor.movement.spentFeet,
    interruptedConcentration: interrupted.concentrating,
    reactorConcentration: reactor.concentrating,
    pendingTrigger: pendingTrigger(
      snapshot.pendingInterrupt?.trigger ?? "none",
    ),
    pendingStackDepth: snapshot.pendingInterrupt?.stackDepth ?? 0,
    holes: input.holes.map(projectReactionHole),
    lastConcentrationSaveDc: input.lastConcentrationSaveDc,
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  });
}

function movementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  value: {
    readonly movementCostFeet: number;
    readonly provokedOpportunityAttacks: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["provokedOpportunityAttacks"];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: value.provokedOpportunityAttacks,
    },
  };
}

function interruptDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "interruptDecision" }>,
  value: Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  return {
    kind: "interruptDecision",
    holeId: hole.holeId,
    value,
  };
}

function requireMovementHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "movement" }> {
  const hole = holes.find((candidate) => candidate.kind === "movement");
  if (hole === undefined) {
    throw new Error("Expected Movement hole.");
  }
  return hole;
}

function requireReactionDecisionHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "interruptDecision" }> {
  const hole = holes.find(
    (candidate) => candidate.kind === "interruptDecision",
  );
  if (hole === undefined) {
    throw new Error("Expected interrupt decision hole.");
  }
  return hole;
}

function requireAttackRollHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "attackRoll" }> {
  const hole = holes.find((candidate) => candidate.kind === "attackRoll");
  if (hole === undefined) {
    throw new Error("Expected Opportunity Attack roll hole.");
  }
  return hole;
}

function projectReactionHole(hole: BattleHole): RuleCoreReactionMbtHole {
  if (hole.kind === "interruptDecision") return "ReactionDecision";
  if (hole.kind === "rolledDice") return "DamageRoll";
  throw new Error(`Unexpected rule-core Reaction MBT hole: ${hole.kind}`);
}

function normalizeRuleCoreReactionQuintState(
  raw: unknown,
): RuleCoreReactionProjection {
  const state = quintStateRecord(raw);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "qProtocol",
    noInvalidReason: "none",
    decodeHole: reactionHoleName,
  });
  return {
    componentRoute: decodeRuleCoreComponentRoute(state["qComponentRoute"]),
    interruptedMovementSpentFeet: numberFromQuintInt(
      state["qInterruptedMovementSpentFeet"],
      "qInterruptedMovementSpentFeet",
    ),
    interruptedHitPoints: numberFromQuintInt(
      state["qInterruptedHitPoints"],
      "qInterruptedHitPoints",
    ),
    reactorReactionAvailable: booleanField(state, "qReactorReactionAvailable"),
    reactorHitPoints: numberFromQuintInt(
      state["qReactorHitPoints"],
      "qReactorHitPoints",
    ),
    reactorReadiedMovementHeld: booleanField(
      state,
      "qReactorReadiedMovementHeld",
    ),
    reactorReadiedSpellHeld: booleanField(state, "qReactorReadiedSpellHeld"),
    reactorMovementSpentFeet: numberFromQuintInt(
      state["qReactorMovementSpentFeet"],
      "qReactorMovementSpentFeet",
    ),
    interruptedConcentration: booleanField(state, "qInterruptedConcentration"),
    reactorConcentration: booleanField(state, "qReactorConcentration"),
    pendingTrigger: pendingTrigger(state["qPendingTrigger"]),
    pendingStackDepth: reactionWindowDepth(state["qReactionWindow"]),
    holes: protocol.holes,
    lastConcentrationSaveDc: numberFromQuintInt(
      state["qLastConcentrationSaveDc"],
      "qLastConcentrationSaveDc",
    ),
    lastResult: reactionResult(protocol.lastResult),
    lastInvalidReason: reactionInvalidReason(protocol.lastInvalidReason),
  };
}

function compareRuleCoreReactionState(
  quint: RuleCoreReactionProjection,
  runtime: RuleCoreReactionProjection,
): boolean {
  return isDeepStrictEqual(runtime, quint);
}

function reactionHoleName(raw: unknown): RuleCoreReactionMbtHole {
  const tag = quintVariantTag(raw);
  if (isRuleCoreReactionMbtHole(tag)) return tag;
  throw new Error(`Unknown Quint rule-core Reaction hole variant: ${tag}`);
}

function isRuleCoreReactionMbtHole(
  raw: unknown,
): raw is RuleCoreReactionMbtHole {
  return ruleCoreReactionMbtHoles.some((hole) => hole === raw);
}

function reactionResult(raw: unknown): RuleCoreReactionResult {
  if (isRuleCoreReactionResult(raw)) return raw;
  throw new Error(`Unknown Quint rule-core Reaction result: ${String(raw)}.`);
}

function isRuleCoreReactionResult(raw: unknown): raw is RuleCoreReactionResult {
  return ruleCoreReactionResults.some((result) => result === raw);
}

function reactionInvalidReason(raw: unknown): RuleCoreReactionInvalidReason {
  if (isRuleCoreReactionInvalidReason(raw)) return raw;
  throw new Error(
    `Unknown Quint rule-core Reaction invalid reason: ${String(raw)}.`,
  );
}

function isRuleCoreReactionInvalidReason(
  raw: unknown,
): raw is RuleCoreReactionInvalidReason {
  return ruleCoreReactionInvalidReasons.some((reason) => reason === raw);
}

function pendingTrigger(raw: unknown): RuleCoreReactionTrigger {
  if (isRuleCoreReactionTrigger(raw)) return raw;
  throw new Error(`Unknown Quint rule-core Reaction trigger: ${String(raw)}.`);
}

function isRuleCoreReactionTrigger(
  raw: unknown,
): raw is RuleCoreReactionTrigger {
  return ruleCoreReactionTriggers.some((trigger) => trigger === raw);
}

function reactionWindowDepth(raw: unknown): number {
  const tag = quintVariantTag(raw);
  return tag === "NoReactionWindow" ? 0 : 1;
}
