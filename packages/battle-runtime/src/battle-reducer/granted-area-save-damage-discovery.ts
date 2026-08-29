import { canSpendAction } from "@dnd/shared-algebras/action-economy-algebra";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import type { CombatantId } from "../identity.ts";
import { spellActiveEffectExecutionRef } from "../effect-execution-ref.ts";
import type {
  BattleActDiscoveryCandidate,
  BattleCreatureState,
  BattleGrantedAreaSaveDamageActionSavingThrowOutcomeHole,
  BattleResolutionInputForSubject,
  BattleState,
} from "../battle-state-execution.ts";
import { combatantCanTakeActions } from "./creature-state-execution.ts";
import {
  savingThrowFlatBonusProjections,
  savingThrowRollModeProjections,
} from "./spells-damage-fills.ts";
import { ongoingFeatureEnemyRelationshipDecisionRequired } from "./ongoing-feature-relationship.ts";
import { grantedAreaSaveDamageActionHoleKey } from "./selected-effect-hole-key.ts";

export type GrantedAreaSaveDamageActionEffect = Extract<
  BattleCreatureState["activeEffects"][number],
  { readonly kind: "grantedAreaSaveDamageAction" }
>;

export type GrantedAreaSaveDamageActionSubject = Extract<
  BattleResolutionInputForSubject<
    Extract<
      import("../battle-subjects.ts").BattleSubject,
      {
        readonly tag: "runtimeCommand";
        readonly command: "grantedAreaSaveDamageAction";
      }
    >
  >["subject"],
  { readonly command: "grantedAreaSaveDamageAction" }
>;

const DRAGONS_BREATH_CONE_LENGTH_FEET = 15;

export function grantedAreaSaveDamageActionActs(
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
  return activeGrantedAreaSaveDamageActionEffects(actor).map((effect) => {
    const subject = grantedAreaSaveDamageActionSubject(actorId, effect);
    return {
      subject,
      initialHoles: [
        grantedAreaSaveDamageActionSavingThrowOutcomeHole(
          state,
          actorId,
          effect,
        ),
      ],
    };
  });
}

export function grantedAreaSaveDamageActionSavingThrowOutcomeHole(
  state: BattleState,
  actorId: CombatantId,
  effect: GrantedAreaSaveDamageActionEffect,
): BattleGrantedAreaSaveDamageActionSavingThrowOutcomeHole {
  const key = grantedAreaSaveDamageActionHoleKey(
    spellActiveEffectExecutionRef(effect),
    "saving-throw-outcome",
  );
  return {
    kind: "savingThrowOutcome",
    holeId: holeId(key),
    holeInstanceKey: holeInstanceKey(key),
    label: "Granted area-save-damage Cone Saving Throw outcomes",
    grantedAreaSaveDamageAction: {
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

function activeGrantedAreaSaveDamageActionEffects(
  actor: BattleCreatureState,
): readonly GrantedAreaSaveDamageActionEffect[] {
  return actor.activeEffects.filter(
    (effect): effect is GrantedAreaSaveDamageActionEffect =>
      effect.kind === "grantedAreaSaveDamageAction",
  );
}

function grantedAreaSaveDamageActionSubject(
  actorId: CombatantId,
  effect: GrantedAreaSaveDamageActionEffect,
): GrantedAreaSaveDamageActionSubject {
  return {
    tag: "runtimeCommand",
    actorId,
    command: "grantedAreaSaveDamageAction",
    effectRef: spellActiveEffectExecutionRef(effect),
  };
}
