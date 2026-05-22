// RAW-COVERAGE: verification-owner:focused-mbt RAW-PTG-REACTIONS-002 RAW-PTG-REACTIONS-004 RAW-PTG-REACTIONS-005 RAW-PTG-REACTIONS-006 RAW-RULES-GLOSSARY-CONCENTRATION-DAMAGE-001
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.reaction-roll-or-damage-reduction spell.reaction-shield
// KERNEL-COVERAGE: parity-witness BATTLE.REACTION.OFFER_DECLINE_RESUME
import * as path from "node:path";
import { isDeepStrictEqual } from "node:util";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
  DieRollResult,
  Hp,
  movementFeet,
} from "@dnd/shared/types";

import {
  battleCombatantSide,
  battleId,
  characterId,
  combatantId,
  concentrationSavingThrowDc,
  endTurn,
  initiativeScore,
  resolveBattleConcentrationDamage,
  resolveBattleReaction,
  resolveBattleSubject,
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

type RuleCoreReactionProjection = {
  readonly interruptedMovementSpentFeet: number;
  readonly reactorReactionAvailable: boolean;
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
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");
const movementResumeCostFeet = 10;
const readiedMovementShortCostFeet = 5;
const readiedMovementFillCostFeet = 10;
const concentrationSpellId = "rule_core_concentration_fixture";

const driverSchema = {
  init: {},
  doOfferOpportunityAttack: {},
  doDeclineOpportunityAttack: {},
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
      subject: Parameters<typeof resolveBattleSubject>[0]["subject"],
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
                  { reactorId, attackName: "Unarmed Strike" },
                ],
              }),
            ],
          }),
        );
      },
      doDeclineOpportunityAttack: () =>
        recordResult(
          resolveBattleReaction({
            state,
            fill: reactionDecisionFill(requireReactionDecisionHole(holes), {
              kind: "decline",
              reactorId,
            }),
          }),
        ),
      doReadyMovementFixture: () => {
        state = ruleCoreReadiedMovementBattle();
        lastConcentrationSaveDc = 0;
        const readied = resolveBattleSubject({
          state,
          subject: {
            tag: "action",
            actorId: reactorId,
            action: "ready",
            readyTrigger: "attackHit",
          },
          fills: [],
        });
        recordResult(readied);
        if (readied.tag !== "resolved") return;
        recordResult(endTurn({ state, actorId: reactorId }));
      },
      doOfferReadiedMovement: () => {
        const subject = interruptedAttackSubject();
        const target = requireTargetChoiceHole(
          resolveSubject(subject).tag === "needsHoles" ? holes : [],
        );
        const rollResult = resolveSubject(subject, [
          attackTargetFill(target, reactorId),
        ]);
        if (rollResult.tag !== "needsHoles") return;
        recordResult(
          resolveBattleSubject({
            state,
            subject,
            fills: [
              attackTargetFill(target, reactorId),
              attackRollFill(requireAttackRollHole(holes), {
                total: 20,
                naturalD20: 12,
              }),
            ],
          }),
        );
      },
      doDeclineReadiedMovement: () =>
        recordResult(
          resolveBattleReaction({
            state,
            fill: reactionDecisionFill(requireReactionDecisionHole(holes), {
              kind: "decline",
              reactorId,
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
      const choice = snapshotBattle(state).pendingReaction?.choices.find(
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
        resolveBattleReaction({
          state,
          fill: reactionDecisionFill(requireReactionDecisionHole(holes), {
            kind: "resolve",
            reactorId,
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
  it("replays QCORE8 Reaction, continuation, Readied Movement, and Concentration parity", async () => {
    await run({
      spec: path.resolve(import.meta.dirname, "../rule-core-reactions.mbt.qnt"),
      init: "init",
      step: "step",
      driver: createRuleCoreReactionDriver(),
      backend: "typescript",
      seed: process.env["QUINT_SEED"],
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(
        process.env["MBT_STEPS"] ?? ruleCoreReactionDefaultMbtSteps,
      ),
      stateCheck: reactionStateCheck,
    });
  }, 120_000);
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
        side: oppositionSide,
      }),
      reactionCreature({
        combatantId: reactorId,
        characterId: "rule-core-reactor-character",
        displayName: "Rule Core Reactor",
        initiative: 10,
        side: partySide,
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
        side: partySide,
      }),
      reactionCreature({
        combatantId: interruptedId,
        characterId: "rule-core-interrupted-character",
        displayName: "Rule Core Interrupted",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
}

function startBattleRight(
  input: Parameters<typeof startBattle>[0],
): BattleState {
  const result = startBattle(input);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function reactionCreature(input: {
  readonly combatantId: CombatantId;
  readonly characterId: string;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(input.characterId),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 1 }],
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
    },
  };
}

function interruptedAttackSubject(): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  return {
    tag: "action",
    actorId: interruptedId,
    action: "attack",
    attackName: "Unarmed Strike",
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
        sourceSpellId: concentrationSpellId,
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
  return {
    interruptedMovementSpentFeet: interrupted.movement.spentFeet,
    reactorReactionAvailable: reactor.reactionAvailable,
    reactorReadiedMovementHeld: snapshot.readiedResponses.movements.some(
      (readied) => readied.actorId === reactorId,
    ),
    reactorReadiedSpellHeld: snapshot.readiedResponses.spells.some(
      (readied) => readied.casterId === reactorId,
    ),
    reactorMovementSpentFeet: reactor.movement.spentFeet,
    interruptedConcentration: interrupted.concentrating,
    reactorConcentration: reactor.concentrating,
    pendingTrigger: pendingTrigger(snapshot.pendingReaction?.trigger ?? "none"),
    pendingStackDepth: snapshot.pendingReaction?.stackDepth ?? 0,
    holes: input.holes.map(projectReactionHole),
    lastConcentrationSaveDc: input.lastConcentrationSaveDc,
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function movementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  value: {
    readonly movementCostFeet: number;
    readonly provokedOpportunityAttacks: readonly {
      readonly reactorId: CombatantId;
      readonly attackName: string;
    }[];
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

function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId: interruptedId,
        targetId,
        attackName: "Unarmed Strike",
      },
    ],
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: { readonly total: number; readonly naturalD20: number },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
    },
  };
}

function reactionDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "reactionDecision" }>,
  value: Extract<BattleFill, { readonly kind: "reactionDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "reactionDecision" }> {
  return {
    kind: "reactionDecision",
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
): Extract<BattleHole, { readonly kind: "reactionDecision" }> {
  const hole = holes.find((candidate) => candidate.kind === "reactionDecision");
  if (hole === undefined) {
    throw new Error("Expected Reaction decision hole.");
  }
  return hole;
}

function requireTargetChoiceHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "targetChoice" }> {
  const hole = holes.find((candidate) => candidate.kind === "targetChoice");
  if (hole === undefined) {
    throw new Error("Expected target choice hole.");
  }
  return hole;
}

function requireAttackRollHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "attackRoll" }> {
  const hole = holes.find((candidate) => candidate.kind === "attackRoll");
  if (hole === undefined) {
    throw new Error("Expected attack roll hole.");
  }
  return hole;
}

function projectReactionHole(hole: BattleHole): RuleCoreReactionMbtHole {
  if (hole.kind === "reactionDecision") return "ReactionDecision";
  if (hole.kind === "rolledDice") return "DamageRoll";
  throw new Error(`Unexpected rule-core Reaction MBT hole: ${hole.kind}`);
}

function normalizeRuleCoreReactionQuintState(
  raw: unknown,
): RuleCoreReactionProjection {
  const state = quintStateRecord(raw);
  return {
    interruptedMovementSpentFeet: numberFromQuintInt(
      state["qInterruptedMovementSpentFeet"],
      "qInterruptedMovementSpentFeet",
    ),
    reactorReactionAvailable: booleanField(state, "qReactorReactionAvailable"),
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
    holes: quintHoleSet(state["qHoles"]).map(reactionHoleName),
    lastConcentrationSaveDc: numberFromQuintInt(
      state["qLastConcentrationSaveDc"],
      "qLastConcentrationSaveDc",
    ),
    lastResult: reactionResult(state["qLastResult"]),
    lastInvalidReason: reactionInvalidReason(state["qLastInvalidReason"]),
  };
}

function compareRuleCoreReactionState(
  quint: RuleCoreReactionProjection,
  runtime: RuleCoreReactionProjection,
): boolean {
  return isDeepStrictEqual(runtime, quint);
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  const value = state[field];
  if (typeof value === "boolean") return value;
  throw new Error(`Expected Quint boolean field ${field}.`);
}

function quintHoleSet(raw: unknown): readonly unknown[] {
  if (raw instanceof Set) return [...raw];
  throw new Error("Expected Quint qHoles field to be a Set.");
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

function quintVariantTag(raw: unknown): string {
  if (isRecord(raw) && typeof raw["tag"] === "string") return raw["tag"];
  if (typeof raw === "string") return raw;
  throw new Error(`Expected Quint variant tag, got ${String(raw)}.`);
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(raw)) {
    throw new Error("Expected Quint state to be an object.");
  }
  return raw;
}

function isRecord(raw: unknown): raw is Readonly<Record<string, unknown>> {
  return typeof raw === "object" && raw !== null;
}
