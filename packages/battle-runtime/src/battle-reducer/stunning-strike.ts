// Stunning Strike Monk attack-hit rider.
// RAW-COVERAGE: runtime-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.stunning-strike

import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import { isMonkWeapon } from "@dnd/shared-algebras/martial-arts-algebra";
import { difficultyClass } from "@dnd/shared/types";
import { Match } from "effect";
import type { BattleActiveEffect } from "../active-effect/types.ts";
import {
  type CharacterProcedureBinding,
  type UnitFeatureProcedureExecution,
  type UnitSupportProcedureExecution,
} from "../character-execution.ts";
import type {
  CharacterWeaponAttackActionOption,
  SupportedAttackActionOption,
} from "../battle-action-options.ts";
import type {
  BattleFill,
  BattleHole,
  BattleState,
  BattleUnitFeatureDecisionHole,
  BattleUnitFeatureSavingThrowOutcomeHole,
} from "../battle-reducer.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "../identity.ts";
import {
  STUNNING_STRIKE_DECISION_HOLE_ID,
  STUNNING_STRIKE_DECISION_HOLE_INSTANCE,
  STUNNING_STRIKE_SAVE_HOLE_ID,
  STUNNING_STRIKE_SAVE_HOLE_INSTANCE,
} from "./domain-constants.ts";
import {
  resourceHasUsesRemaining,
  spendCharacterResourceUse,
} from "../character-battle-resources.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./creature-state.ts";
import {
  extendSavingThrowOngoingFeatures,
  ongoingFeatureEnemyRelationshipDecisionRequired,
} from "./attack-roll.ts";
import { parseSavingThrowRelationshipFacts } from "./roll-trigger-relationship-facts.ts";
import { scoreModifier } from "./domain-helpers.ts";
import {
  monkFocusResourceForActor,
  stateWithMonkFocusResource,
  type MonkFocusResourceFact,
} from "./monk-focus.ts";
import { combatantProficiencyBonus } from "./movement-speed.ts";
import { conditionHadNonSpellSourceBeforeSpellEffect } from "./spell-condition-effects-helpers.ts";
import {
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";

const STUNNING_STRIKE_CHOICES = ["attempt", "decline"] as const;
type StunningStrikeChoice = (typeof STUNNING_STRIKE_CHOICES)[number];

type StunningStrikeHit = {
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly execution: StunningStrikeExecution;
  readonly focus: MonkFocusResourceFact;
};

type StunningStrikeExecution = Extract<
  UnitFeatureProcedureExecution | UnitSupportProcedureExecution,
  { readonly kind: "stunningStrike" }
>;

export type StunningStrikeAfterHitResult =
  | { readonly tag: "ok"; readonly state: BattleState }
  | { readonly tag: "needsHoles"; readonly holes: readonly BattleHole[] }
  | { readonly tag: "invalid"; readonly message: string };

export function resolveStunningStrikeAfterHit(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly attack: SupportedAttackActionOption;
  readonly decision:
    | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
    | undefined;
  readonly savingThrow:
    | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
    | undefined;
}): StunningStrikeAfterHitResult {
  const hit = stunningStrikeHit(input);
  if (hit === null) {
    return input.decision === undefined && input.savingThrow === undefined
      ? { tag: "ok", state: input.state }
      : {
          tag: "invalid",
          message:
            "Stunning Strike is only valid for an eligible Monk weapon or Unarmed Strike hit.",
        };
  }
  if (input.decision === undefined) {
    return {
      tag: "needsHoles",
      holes: [stunningStrikeDecisionHole(hit)],
    };
  }
  if (input.decision.holeId !== STUNNING_STRIKE_DECISION_HOLE_ID) {
    return {
      tag: "invalid",
      message: "Stunning Strike decision uses the wrong hole.",
    };
  }
  if (!isStunningStrikeChoice(input.decision.value)) {
    return {
      tag: "invalid",
      message: "Stunning Strike decision must choose attempt or decline.",
    };
  }
  return Match.value(input.decision.value).pipe(
    Match.when("decline", () => {
      if (input.savingThrow !== undefined) {
        return {
          tag: "invalid" as const,
          message:
            "Stunning Strike Saving Throw is not valid when the rider is declined.",
        };
      }
      return { tag: "ok" as const, state: input.state };
    }),
    Match.when("attempt", () => resolveStunningStrikeAttempt(input, hit)),
    Match.exhaustive,
  );
}

function resolveStunningStrikeAttempt(
  input: {
    readonly state: BattleState;
    readonly savingThrow:
      | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
      | undefined;
  },
  hit: StunningStrikeHit,
): StunningStrikeAfterHitResult {
  if (input.savingThrow === undefined) {
    return {
      tag: "needsHoles",
      holes: [stunningStrikeSavingThrowHole(input.state, hit)],
    };
  }
  if (input.savingThrow.holeId !== STUNNING_STRIKE_SAVE_HOLE_ID) {
    return {
      tag: "invalid",
      message: "Stunning Strike Saving Throw uses the wrong hole.",
    };
  }
  const outcomes = input.savingThrow.value.outcomes;
  if (outcomes.length !== 1 || outcomes[0]?.targetId !== hit.targetId) {
    return {
      tag: "invalid",
      message:
        "Stunning Strike Saving Throw must target the attacked creature.",
    };
  }
  const stateAfterSpend = spendStunningStrikeFocus(input.state, hit);
  if (stateAfterSpend === null) {
    return {
      tag: "invalid",
      message: "Stunning Strike requires an unspent Focus Point.",
    };
  }
  const relationshipFacts = parseSavingThrowRelationshipFacts(
    input.savingThrow.relationshipFacts ?? [],
    hit.actorId,
    [hit.targetId],
    ongoingFeatureEnemyRelationshipDecisionRequired(
      input.state,
      hit.actorId,
      "enemySavingThrow",
    ),
  );
  if (relationshipFacts === null) {
    return {
      tag: "invalid",
      message:
        "Stunning Strike relationship facts must answer the saving-throw hole request.",
    };
  }
  const savingThrowState = extendSavingThrowOngoingFeatures(
    stateAfterSpend,
    hit.actorId,
    [hit.targetId],
    relationshipFacts,
  );
  return {
    tag: "ok",
    state: outcomes[0].succeeded
      ? applyStunningStrikeSuccess(savingThrowState, hit)
      : applyStunningStrikeFailure(savingThrowState, hit),
  };
}

function stunningStrikeDecisionHole(
  _hit: StunningStrikeHit,
): BattleUnitFeatureDecisionHole {
  return {
    kind: "unitFeatureDecision",
    holeId: STUNNING_STRIKE_DECISION_HOLE_ID,
    holeInstanceKey: STUNNING_STRIKE_DECISION_HOLE_INSTANCE,
    label: "Stunning Strike",
    choices: STUNNING_STRIKE_CHOICES,
  };
}

function stunningStrikeSavingThrowHole(
  state: BattleState,
  hit: StunningStrikeHit,
): BattleUnitFeatureSavingThrowOutcomeHole {
  const actor = state.combatants.get(hit.actorId);
  if (actor === undefined) {
    throw new Error("Stunning Strike save hole requires an actor.");
  }
  const focusSaveDc = hit.focus.execution.effectSaveDc;
  const abilityModifier =
    actor.origin.kind === "character"
      ? scoreModifier(
          actor.origin.d20Statistics.abilityScores[focusSaveDc.ability],
        )
      : 0;
  const ability = hit.execution.stunningStrike.savingThrow.ability;
  return {
    kind: "savingThrowOutcome",
    holeId: STUNNING_STRIKE_SAVE_HOLE_ID,
    holeInstanceKey: STUNNING_STRIKE_SAVE_HOLE_INSTANCE,
    label: "Stunning Strike Constitution Saving Throw",
    ...(ongoingFeatureEnemyRelationshipDecisionRequired(
      state,
      hit.actorId,
      "enemySavingThrow",
    )
      ? {
          relationshipFactRequest: {
            kind: "savingThrowTargetIsEnemy" as const,
            actorId: hit.actorId,
          },
        }
      : {}),
    ability,
    dc: {
      kind: "fixed",
      dc: difficultyClass(
        focusSaveDc.base + abilityModifier + combatantProficiencyBonus(actor),
      ),
    },
    targetIds: [hit.targetId],
    targetRollModes: savingThrowRollModeProjections(state, ability).filter(
      (projection) => projection.targetId === hit.targetId,
    ),
    targetFlatBonuses: savingThrowFlatBonusProjections(state, ability).filter(
      (projection) => projection.targetId === hit.targetId,
    ),
  };
}

function spendStunningStrikeFocus(
  state: BattleState,
  hit: StunningStrikeHit,
): BattleState | null {
  if (!resourceHasUsesRemaining(hit.focus.resource)) {
    return null;
  }
  const spentFocusState = stateWithMonkFocusResource(
    state,
    hit.focus.actor,
    spendCharacterResourceUse(hit.focus.resource),
  );
  return {
    ...spentFocusState,
    currentTurnResources: {
      ...spentFocusState.currentTurnResources,
      stunningStrikesUsedThisTurn: [
        ...spentFocusState.currentTurnResources.stunningStrikesUsedThisTurn,
        { attackerId: hit.actorId, procedureRef: hit.procedureRef },
      ],
    },
  };
}

function applyStunningStrikeFailure(
  state: BattleState,
  hit: StunningStrikeHit,
): BattleState {
  const target = state.combatants.get(hit.targetId);
  if (target === undefined) return state;
  const activeEffect: BattleActiveEffect = {
    kind: "unitFeatureCondition",
    sourceProcedureRef: hit.procedureRef,
    sourceCombatantId: hit.actorId,
    condition: hit.execution.stunningStrike.onFail.condition,
    conditionHadNonSpellSource: conditionHadNonSpellSourceBeforeSpellEffect(
      target,
      hit.execution.stunningStrike.onFail.condition,
    ),
    earlyEnd: null,
    turnRestriction: null,
    expiresAt: { kind: "startOfTurn", combatantId: hit.actorId },
  };
  return {
    ...state,
    combatants: new Map(state.combatants).set(hit.targetId, {
      ...battleCreatureStateWithKnockOutPreservedConditions(
        target,
        applyCondition(
          target.conditions,
          hit.execution.stunningStrike.onFail.condition,
        ),
      ),
      activeEffects: [
        ...target.activeEffects.filter(
          (candidate) =>
            !(
              candidate.kind === "unitFeatureCondition" &&
              candidate.sourceProcedureRef === hit.procedureRef &&
              candidate.sourceCombatantId === hit.actorId &&
              candidate.condition ===
                hit.execution.stunningStrike.onFail.condition
            ),
        ),
        activeEffect,
      ],
    }),
  };
}

function applyStunningStrikeSuccess(
  state: BattleState,
  hit: StunningStrikeHit,
): BattleState {
  const target = state.combatants.get(hit.targetId);
  if (target === undefined) return state;
  const speedEffect: BattleActiveEffect = {
    kind: "speedHalved",
    sourceProcedureRef: hit.procedureRef,
    sourceCombatantId: hit.actorId,
    expiresAt: { kind: "startOfTurn", combatantId: hit.actorId },
  };
  const attackRollEffect: BattleActiveEffect = {
    kind: "nextAttackRollAgainstSelf",
    sourceProcedureRef: hit.procedureRef,
    sourceCombatantId: hit.actorId,
    mode: hit.execution.stunningStrike.onSuccess.attackRoll.mode,
    expiresAt: { kind: "startOfTurn", combatantId: hit.actorId },
  };
  return {
    ...state,
    combatants: new Map(state.combatants).set(hit.targetId, {
      ...target,
      activeEffects: [
        ...target.activeEffects.filter(
          (candidate) =>
            !(
              (candidate.kind === "speedHalved" ||
                candidate.kind === "nextAttackRollAgainstSelf") &&
              "sourceProcedureRef" in candidate &&
              candidate.sourceProcedureRef === hit.procedureRef &&
              candidate.sourceCombatantId === hit.actorId
            ),
        ),
        speedEffect,
        attackRollEffect,
      ],
    }),
  };
}

function stunningStrikeHit(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly attack: SupportedAttackActionOption;
}): StunningStrikeHit | null {
  if (!stunningStrikeAttackEligible(input.attack)) return null;
  const actor = input.state.combatants.get(input.actorId);
  if (
    actor?.origin.kind !== "character" ||
    !input.state.combatants.has(input.targetId)
  ) {
    return null;
  }
  const focus = monkFocusResourceForActor(input.state, input.actorId);
  if (focus === null) return null;
  const selected = actor.origin.execution.procedureBindings.flatMap(
    (binding) => {
      const execution = stunningStrikeExecution(binding);
      return execution !== undefined &&
        execution.stunningStrike.spends.resourcePoolRef ===
          focus.resource.resourcePoolRef
        ? [{ binding, execution }]
        : [];
    },
  )[0];
  if (selected === undefined || !resourceHasUsesRemaining(focus.resource)) {
    return null;
  }
  if (
    input.state.currentTurnResources.stunningStrikesUsedThisTurn.some(
      (usage) =>
        usage.attackerId === input.actorId &&
        usage.procedureRef === selected.binding.procedureRef,
    )
  ) {
    return null;
  }
  return {
    actorId: input.actorId,
    targetId: input.targetId,
    procedureRef: selected.binding.procedureRef,
    execution: selected.execution,
    focus,
  };
}

function stunningStrikeExecution(
  binding: CharacterProcedureBinding,
): StunningStrikeExecution | undefined {
  return Match.value(binding.procedure).pipe(
    Match.discriminatorsExhaustive("kind")({
      unitFeature: ({ execution }) =>
        execution.kind === "stunningStrike" ? execution : undefined,
      unitSupportProfile: ({ execution }) =>
        typeof execution === "object" && execution.kind === "stunningStrike"
          ? execution
          : undefined,
      spellInvocation: () => undefined,
      unavailableSpellInvocation: () => undefined,
    }),
  );
}

function stunningStrikeAttackEligible(
  attack: SupportedAttackActionOption,
): boolean {
  return (
    attack.kind === "unarmedStrike" ||
    (isCharacterWeaponAttack(attack) && isMonkWeapon(attack.weapon))
  );
}

function isCharacterWeaponAttack(
  attack: SupportedAttackActionOption,
): attack is CharacterWeaponAttackActionOption {
  return attack.kind === "weapon";
}

function isStunningStrikeChoice(
  value: Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>["value"],
): value is StunningStrikeChoice {
  return STUNNING_STRIKE_CHOICES.some((choice) => choice === value);
}
