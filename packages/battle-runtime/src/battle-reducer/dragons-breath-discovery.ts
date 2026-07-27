import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type { CombatantId } from "../identity.ts";
import { spellActiveEffectExecutionRef } from "../active-effect/execution-ref.ts";
import type {
  BattleActDiscoveryCandidate,
  BattleCreatureState,
  BattleDragonsBreathSavingThrowOutcomeHole,
  BattleResolutionInputForSubject,
  BattleState,
} from "../battle-state-execution.ts";
import { combatantCanTakeActions } from "./creature-state-execution.ts";
import {
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import { ongoingFeatureEnemyRelationshipDecisionRequired } from "./ongoing-feature-relationship.ts";

export type DragonsBreathEffect = Extract<
  BattleCreatureState["activeEffects"][number],
  { readonly kind: "dragonsBreath" }
>;

export type DragonsBreathExhaleSubject = Extract<
  BattleResolutionInputForSubject<
    Extract<
      import("../battle-subjects.ts").BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "dragonsBreathExhale";
      }
    >
  >["subject"],
  { readonly command: "dragonsBreathExhale" }
>;

const DRAGONS_BREATH_CONE_LENGTH_FEET = 15;

export function dragonsBreathExhaleActs(
  state: BattleState,
  actorId: CombatantId,
): readonly BattleActDiscoveryCandidate[] {
  const actor = state.combatants.get(actorId);
  if (
    actor === undefined ||
    !combatantCanTakeActions(actor) ||
    !canSpendAction(state.currentTurnResources, "magic")
  ) {
    return [];
  }
  return activeDragonsBreathEffects(actor).map((effect) => {
    const subject = dragonsBreathExhaleSubject(actorId, effect);
    return {
      subject,
      initialHoles: [
        dragonsBreathSavingThrowOutcomeHole(state, actorId, effect),
      ],
    };
  });
}

export function dragonsBreathSavingThrowOutcomeHole(
  state: BattleState,
  actorId: CombatantId,
  effect: DragonsBreathEffect,
): BattleDragonsBreathSavingThrowOutcomeHole {
  const key = dragonsBreathHoleKey(effect, "saving-throw-outcome");
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Dragon's Breath 15-foot Cone Saving Throw outcomes",
    dragonsBreath: {
      sourceCombatantId: effect.sourceCombatantId,
      sourceProcedureRef: effect.sourceProcedureRef,
      lengthFeet: DRAGONS_BREATH_CONE_LENGTH_FEET,
    },
    ability: "dex",
    dc: { kind: "fixed", dc: effect.spellSaveDc },
    areaChoices: [],
    targetRollModes: savingThrowRollModeProjections(state, "dex"),
    targetFlatBonuses: savingThrowFlatBonusProjections(state, "dex"),
    ...(ongoingFeatureEnemyRelationshipDecisionRequired(
      state,
      actorId,
      "enemySavingThrow",
    )
      ? {
          relationshipFactRequest: {
            kind: "savingThrowTargetIsEnemy" as const,
            actorId,
          },
        }
      : {}),
  };
}

export function dragonsBreathHoleKey(
  effect: DragonsBreathEffect,
  suffix: string,
): string {
  return `battle:dragons-breath:${effect.sourceProcedureRef}:${effect.sourceCombatantId}:${suffix}`;
}

function activeDragonsBreathEffects(
  actor: BattleCreatureState,
): readonly DragonsBreathEffect[] {
  return actor.activeEffects.filter(
    (effect): effect is DragonsBreathEffect => effect.kind === "dragonsBreath",
  );
}

function dragonsBreathExhaleSubject(
  actorId: CombatantId,
  effect: DragonsBreathEffect,
): DragonsBreathExhaleSubject {
  return {
    tag: "runtimeCommand",
    actorId,
    command: "dragonsBreathExhale",
    effectRef: spellActiveEffectExecutionRef(effect),
  };
}
