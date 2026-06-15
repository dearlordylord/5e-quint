// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L14G-03A-MONK-SLOW-FALL-RUNTIME monk_slow_fall
// UNIT-IDENTITY-MBT-REPLAY: L14G-03A-MONK-SLOW-FALL-RUNTIME monk_slow_fall doSlowFallReduceDamage doSlowFallPreventDamage
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.reaction-roll-or-damage-reduction
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
import {
  type BattleState,
  type CombatantId,
  openCreatureFallsInterruptWindow,
  resolveFallDamageLanding,
} from "./index.ts";
import {
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
} from "./battle-runtime-test-support.ts";
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import { REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE } from "./unit-feature-support.ts";

type SlowFallLastResult = "init" | "reducedDamage" | "preventedDamage";
type SlowFallProjection = {
  readonly reactionAvailable: boolean;
  readonly effectiveFallDamage: number;
  readonly fallingProne: boolean;
  readonly lastResult: SlowFallLastResult;
};

const monkId = combatantId("slow-fall-selected-identity-monk");
const slowFallUnitId = "monk_slow_fall";

defineSelectedIdentityWitness({
  describeLabel: "Slow Fall selected identity MBT",
  taskId: "L14G-03A-MONK-SLOW-FALL-RUNTIME",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-slow-fall-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: {
      Init: "init",
      ReducedDamage: "reducedDamage",
      PreventedDamage: "preventedDamage",
    },
  },
  projectionSchema: {
    reactionAvailable: "bool",
    effectiveFallDamage: "int",
    fallingProne: "bool",
    lastResult: "variant",
  },
  initialProjection: projectBattleState(
    battleWithSlowFallMonk({ level: 4 }),
    0,
    "init",
  ),
  units: [
    {
      unitId: slowFallUnitId,
      procedures: [
        {
          actionName: "doSlowFallReduceDamage",
          projectionAfter: {
            reactionAvailable: false,
            effectiveFallDamage: 3,
            fallingProne: true,
            lastResult: "reducedDamage",
          },
          discover: () =>
            resolveSlowFallScenario({
              level: 5,
              rawFallDamage: 28,
              lastResult: "reducedDamage",
            }),
        },
        {
          actionName: "doSlowFallPreventDamage",
          projectionAfter: {
            reactionAvailable: false,
            effectiveFallDamage: 0,
            fallingProne: false,
            lastResult: "preventedDamage",
          },
          discover: () =>
            resolveSlowFallScenario({
              level: 4,
              rawFallDamage: 18,
              lastResult: "preventedDamage",
            }),
        },
      ],
    },
  ],
});

function resolveSlowFallScenario(input: {
  readonly level: number;
  readonly rawFallDamage: number;
  readonly lastResult: SlowFallLastResult;
}): SlowFallProjection {
  const reactionState = resolveSlowFallReaction(
    battleWithSlowFallMonk({ level: input.level }),
  );
  const landing = resolveFallDamageLanding({
    state: reactionState,
    targetId: monkId,
    fallDamage: {
      kind: "rawFallDamage",
      amount: damageAmount(input.rawFallDamage),
    },
  });
  if (landing.tag !== "landed") {
    throw new Error("Expected Slow Fall landing resolution.");
  }
  return projectBattleState(
    landing.state,
    Number(landing.effectiveFallDamage),
    input.lastResult,
  );
}

function projectBattleState(
  state: BattleState,
  effectiveFallDamage: number,
  lastResult: SlowFallLastResult,
): SlowFallProjection {
  const monk = requireCombatant(state, monkId);
  return {
    reactionAvailable: monk.reactionAvailable,
    effectiveFallDamage,
    fallingProne: hasCondition(monk.conditions, "prone"),
    lastResult,
  };
}

function battleWithSlowFallMonk(input: {
  readonly level: number;
}): BattleState {
  const unit = unitLibrary.requireUnit(slowFallUnitId);
  return startBattleRight({
    battleId: battleId(`slow-fall-selected-identity-${input.level}`),
    combatants: [
      characterSeed({
        combatantId: monkId,
        displayName: "Monk",
        initiative: 10,
        classLevels: [{ className: "monk", level: input.level }],
        attack: null,
        unitFeatures: [{ unit }],
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

function resolveSlowFallReaction(state: BattleState): BattleState {
  const awaitingReaction = openCreatureFallsInterruptWindow({
    state,
    fallingCreatureId: monkId,
    reactionSpellTargetFacts: [],
  });
  if (awaitingReaction.tag !== "needsHoles") {
    throw new Error("Expected Slow Fall falling-trigger Reaction window.");
  }
  const choice = reactionModifierChoice(
    awaitingReaction.snapshot.pendingInterrupt!.choices,
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
          unitId: choice.choice.unitId,
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
