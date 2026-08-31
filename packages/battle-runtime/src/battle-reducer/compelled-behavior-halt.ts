// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-command-halt-grovel
// KERNEL-COVERAGE: runtime-owner BATTLE.COMMAND.OPTION_AND_NEXT_TURN

import { movementFeet, type Round } from "@dnd/shared/types";
import type {
  BattleCompelledHaltTurnSuppression,
  BattleCreatureState,
  BattleState,
} from "../battle-state-execution.ts";
import type {
  BattleRuntimeCommand,
  BattleSubject,
} from "../battle-subjects.ts";
import type { CombatantId } from "../identity.ts";
import { currentActorId } from "./creature-state-leaves.ts";
import { battleSubjectActorId } from "./creature-state-execution.ts";
import {
  effectiveMovementSpeed,
  representedMovementSpeedKinds,
} from "./movement-speed.ts";

export function applyCompelledHaltAtTurnStart(state: BattleState): BattleState {
  const actorId = currentActorId(state);
  const compelledHalt = compelledHaltTurnSuppressionForActor(
    state.combatants,
    actorId,
    state.initiative.round,
  );
  if (compelledHalt === null) return state;

  return {
    ...state,
    combatants: combatantsWithCompelledHaltMovementSpent(state, actorId),
    currentTurnResources: {
      ...state.currentTurnResources,
      actionResources: [],
      currentHasBonusAction: false,
      compelledHalt,
    },
  };
}

export function compelledHaltSuppressionIssue(
  state: BattleState,
  subject: BattleSubject,
): string | null {
  const actorId = battleSubjectActorId(subject);
  return state.currentTurnResources.compelledHalt !== null &&
    actorId === currentActorId(state) &&
    subjectSuppressedByCompelledHalt(subject)
    ? "The compelled halt behavior suppresses Movement, Actions, and Bonus Actions for this turn."
    : null;
}

function compelledHaltTurnSuppressionForActor(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  round: Round,
): BattleCompelledHaltTurnSuppression | null {
  const actor = combatants.get(actorId);
  const halted =
    actor?.activeEffects.some(
      (effect) =>
        effect.kind === "compelledNextTurnBehavior" &&
        effect.option === "halt" &&
        effect.expiresAt.combatantId === actorId &&
        effect.expiresAt.round === round,
    ) ?? false;
  return halted ? { kind: "compelledHalt" } : null;
}

function combatantsWithCompelledHaltMovementSpent(
  state: BattleState,
  actorId: CombatantId,
): ReadonlyMap<CombatantId, BattleCreatureState> {
  const actor = state.combatants.get(actorId);
  if (actor === undefined) return state.combatants;

  const isGrappled = state.grapples.some(
    (grapple) => grapple.targetId === actorId,
  );
  const spentFeet = Math.max(
    Number(actor.movementSpentFeet),
    ...representedMovementSpeedKinds(actor).map((kind) =>
      Number(effectiveMovementSpeed(state, actor, kind, isGrappled)),
    ),
  );

  return new Map(state.combatants).set(actorId, {
    ...actor,
    movementSpentFeet: movementFeet(spentFeet),
  });
}

const COMPELLED_HALT_SUPPRESSES_RUNTIME_COMMAND = {
  endTurn: false,
  endConcentration: false,
  move: true,
  standFromProne: true,
  releaseReadiedSpell: false,
  releaseReadiedMovement: false,
  reportReadyTrigger: false,
  releaseReadiedAction: false,
  releaseReadiedAttack: false,
  castTriggeredReactionSpell: false,
  castAttackHitBonusActionSpell: false,
  releaseGrapple: false,
  opportunityAttack: false,
  retaliationAttack: false,
  persistentAreaSaveConditionSave: false,
  persistentAreaSaveConditionEscapeSave: false,
  persistentAreaSaveCompositeSave: false,
  persistentAreaSaveDamageSave: false,
  endPersistentAreaSaveDamageForEnvironment: false,
  endPersistentAreaSaveConditionEscapeForDeparture: false,
  endPersistentAreaSaveConditionEscapeForAreaRemoval: false,
  directionalPersistentAreaSave: false,
  directionalPersistentAreaDirectionChange: false,
  movableZoneSave: false,
  persistentAreaSaveDamageExit: false,
  movableZoneReposition: false,
  movableZoneRam: false,
  releaseSpellCreatedHeldObject: false,
  protectionRelevantEffectSave: false,
  creatureTypeProtectionConditionAttempt: false,
  creatureTypeProtectionPossessionAttempt: false,
  endPersistentAreaTraitForEnvironment: false,
  linkedDefenseResistanceDamageShareSeparation: false,
  fixedCostMovementReplacement: true,
  grantedAreaSaveDamageAction: false,
  replaceSelfTransformationMode: true,
  executeCompelledGrovel: false,
  executeCompelledDrop: false,
  executeCompelledApproach: false,
  executeCompelledFlee: false,
  controlledVerticalSuspensionAltitudeControl: true,
  creatureFalls: false,
} as const satisfies Record<BattleRuntimeCommand, boolean>;

const COMPELLED_HALT_SUPPRESSES_SUBJECT_TAG = {
  action: true,
  actionSpell: true,
  bonusAction: true,
  bonusActionDashSpell: true,
  bonusActionSpell: true,
  bonusActionStandardAction: true,
  companionLifecycle: true,
  druidWildShape: true,
  spawnedCompanionSharedSenses: true,
  spawnedCompanionTouchSpellProxy: true,
  monkFocusFlurryOfBlowsStrike: true,
  monkFocusOption: true,
  companionAttack: true,
  unitFeature: true,
  unitFeatureHeldWeaponActivation: true,
} as const satisfies Record<
  Exclude<BattleSubject["tag"], "runtimeCommand">,
  boolean
>;

function subjectSuppressedByCompelledHalt(subject: BattleSubject): boolean {
  return subject.tag === "runtimeCommand"
    ? COMPELLED_HALT_SUPPRESSES_RUNTIME_COMMAND[subject.command]
    : COMPELLED_HALT_SUPPRESSES_SUBJECT_TAG[subject.tag];
}
