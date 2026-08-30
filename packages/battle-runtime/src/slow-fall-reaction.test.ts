// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.reaction-roll-or-damage-reduction
import { describe, expect, test } from "vitest";
import { classLevel } from "@dnd/shared/types";
import { Result, Schema } from "effect";

import {
  battleFrontierInterruptDecisionForState,
  BattleCheckpointFrontierEnvelopeSchema,
  battleCheckpointFrontierEnvelope,
  type BattleState,
  type CombatantId,
  openCreatureFallsInterruptWindow,
  resolveFallDamageLanding,
} from "./index.ts";
import {
  characterBattleFeatureInitForTest,
  battleId,
  characterSeed,
  combatantId,
  damageAmount,
  findHole,
  hasCondition,
  interruptDecisionFill,
  reactionModifierChoice,
  reactionModifierUnitRefWithProfile,
  resolveBattleInterrupt,
  startBattleRight,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import { REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE } from "./unit-feature-support.ts";

const monkId = combatantId("slow-fall-monk");
const slowFallUnitId = "monk_slow_fall";

describe("Slow Fall Reaction", () => {
  test("rejects fall-damage landing for a combatant outside the battle", () => {
    const state = battleWithSlowFallMonk({ level: 4 });

    expect(
      resolveFallDamageLanding({
        state,
        targetId: combatantId("missing-fall-damage-target"),
        fallDamage: { kind: "rawFallDamage", amount: damageAmount(1) },
      }),
    ).toMatchObject({
      tag: "invalid",
      state,
      reason: "missingCombatant",
    });
  });

  test("offers selected Monk a fall-damage reduction Reaction when that creature falls", () => {
    const state = battleWithSlowFallMonk({ level: 4 });
    const awaitingReaction = openSlowFallWindow(state);

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Slow Fall falling-trigger Reaction window.");
    }

    const choice = reactionModifierChoice(
      battleFrontierInterruptDecisionForState(awaitingReaction.state)!.choices,
      slowFallUnitId,
      "fallDamageReduction",
    );

    expect(choice).toMatchObject({
      reactorId: monkId,
      choice: {
        kind: "fallDamageReduction",
        reduction: { kind: "flat", amount: damageAmount(20) },
      },
      initialHoles: [],
    });
    const encoded = Schema.encodeSync(BattleCheckpointFrontierEnvelopeSchema)(
      battleCheckpointFrontierEnvelope(awaitingReaction.state),
    );
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)(
          encoded,
        ),
      ),
    ).toBe(true);
    if (encoded.frontier.kind !== "interruptDecision") {
      throw new Error("Expected the encoded Slow Fall Reaction frontier.");
    }
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)({
          ...encoded,
          frontier: {
            ...encoded.frontier,
            trigger: "attackHit",
            decisionHole: {
              ...encoded.frontier.decisionHole,
              trigger: "attackHit",
            },
          },
        }),
      ),
    ).toBe(true);
  });

  test("declining Slow Fall resumes the falling creature continuation", () => {
    const awaitingReaction = openSlowFallWindow(
      battleWithSlowFallMonk({ level: 4 }),
    );
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Slow Fall falling-trigger Reaction window.");
    }

    const declined = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        findHole(awaitingReaction.holes, "interruptDecision"),
        { kind: "decline", responderId: monkId },
      ),
    });

    expect(declined).toMatchObject({
      tag: "resolved",
    });
  });

  test("spends the Monk's Reaction and reduces caller-supplied fall damage by five times Monk level", () => {
    const state = battleWithSlowFallMonk({ level: 5 });
    const resolved = resolveSlowFallReaction(state);

    const reactor = requireCombatant(resolved, monkId);
    expect(reactor.reactionAvailable).toBe(false);

    const landing = resolveFallDamageLanding({
      state: resolved,
      targetId: monkId,
      fallDamage: { kind: "rawFallDamage", amount: damageAmount(28) },
    });

    expect(landing).toMatchObject({
      tag: "landed",
      incomingFallDamage: damageAmount(28),
      effectiveFallDamage: damageAmount(3),
      fallDamagePrevented: false,
      fallingPronePrevented: false,
      fallDamageReductionAmount: damageAmount(25),
    });
    if (landing.tag !== "landed") {
      throw new Error("Expected Slow Fall landing resolution.");
    }
    expect(
      hasCondition(requireCombatant(landing.state, monkId).conditions, "prone"),
    ).toBe(true);
  });

  test("caps fall damage at zero and prevents Falling Prone only when no fall damage remains", () => {
    const state = battleWithSlowFallMonk({ level: 4 });
    const resolved = resolveSlowFallReaction(state);

    const landing = resolveFallDamageLanding({
      state: resolved,
      targetId: monkId,
      fallDamage: { kind: "rawFallDamage", amount: damageAmount(18) },
    });

    expect(landing).toMatchObject({
      tag: "landed",
      effectiveFallDamage: damageAmount(0),
      fallDamagePrevented: true,
      fallingPronePrevented: true,
      fallDamageReductionAmount: damageAmount(20),
    });
    if (landing.tag !== "landed") {
      throw new Error("Expected Slow Fall landing resolution.");
    }
    expect(
      hasCondition(requireCombatant(landing.state, monkId).conditions, "prone"),
    ).toBe(false);
  });

  test("does not offer Slow Fall after the Monk's Reaction has already been spent", () => {
    const base = battleWithSlowFallMonk({ level: 4 });
    const state = {
      ...base,
      combatants: new Map(
        [...base.combatants].map(([combatantIdValue, combatant]) =>
          combatantIdValue === monkId
            ? [combatantIdValue, { ...combatant, reactionAvailable: false }]
            : [combatantIdValue, combatant],
        ),
      ),
    };

    const result = openSlowFallWindow(state);

    expect(result).toMatchObject({
      tag: "resolved",
    });
  });
});

function battleWithSlowFallMonk(input: {
  readonly level: number;
}): BattleState {
  const unit = unitLibrary.requireUnit(slowFallUnitId);
  return startBattleRight({
    battleId: battleId(`battle-slow-fall-level-${input.level}`),
    combatants: [
      characterSeed({
        combatantId: monkId,
        displayName: "Monk",
        initiative: 10,
        classLevels: [{ className: "monk", level: input.level }],
        attack: null,
        unitFeatures: [
          characterBattleFeatureInitForTest(unit, [
            { className: "monk", level: classLevel(input.level) },
          ]),
        ],
        characterUnitRefs: [
          reactionModifierUnitRefWithProfile(
            unit.id,
            REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
          ),
        ],
      }),
    ],
  });
}

function openSlowFallWindow(state: BattleState) {
  return openCreatureFallsInterruptWindow({
    state,
    fallingCreatureId: monkId,
    reactionSpellTargetFacts: [],
  });
}

function resolveSlowFallReaction(state: BattleState): BattleState {
  const awaitingReaction = openSlowFallWindow(state);
  if (awaitingReaction.tag !== "needsHoles") {
    throw new Error("Expected Slow Fall falling-trigger Reaction window.");
  }
  const choice = reactionModifierChoice(
    battleFrontierInterruptDecisionForState(awaitingReaction.state)!.choices,
    slowFallUnitId,
    "fallDamageReduction",
  );
  const resolved = resolveBattleInterrupt({
    state: awaitingReaction.state,
    fill: interruptDecisionFill(
      findHole(awaitingReaction.holes, "interruptDecision"),
      {
        kind: "resolve",
        responderId: monkId,
        choice: {
          kind: "reactionRollOrDamageReduction",
          procedureRef: choice.choice.procedureRef,
          modifierKind: "fallDamageReduction",
          fills: [],
        },
      },
    ),
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Slow Fall Reaction to resolve.");
  }
  return resolved.state;
}

function requireCombatant(state: BattleState, id: CombatantId) {
  const combatant = state.combatants.get(id);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${id}.`);
  }
  return combatant;
}
