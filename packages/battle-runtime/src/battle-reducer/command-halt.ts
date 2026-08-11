// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-command-halt-grovel
// KERNEL-COVERAGE: runtime-owner BATTLE.COMMAND.OPTION_AND_NEXT_TURN

import { movementFeet, type Round } from "@dnd/shared/types";
import type {
  BattleCommandHaltTurnSuppression,
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

export function applyCommandHaltAtTurnStart(state: BattleState): BattleState {
  const actorId = currentActorId(state);
  const commandHalt = commandHaltTurnSuppressionForActor(
    state.combatants,
    actorId,
    state.initiative.round,
  );
  if (commandHalt === null) return state;

  return {
    ...state,
    combatants: combatantsWithCommandHaltMovementSpent(state, actorId),
    currentTurnResources: {
      ...state.currentTurnResources,
      actionResources: [],
      currentHasBonusAction: false,
      commandHalt,
    },
  };
}

export function commandHaltSuppressionIssue(
  state: BattleState,
  subject: BattleSubject,
): string | null {
  const actorId = battleSubjectActorId(subject);
  return state.currentTurnResources.commandHalt !== null &&
    actorId === currentActorId(state) &&
    subjectSuppressedByCommandHalt(subject)
    ? "Command Halt suppresses Movement, Actions, and Bonus Actions for this turn."
    : null;
}

function commandHaltTurnSuppressionForActor(
  combatants: ReadonlyMap<CombatantId, BattleCreatureState>,
  actorId: CombatantId,
  round: Round,
): BattleCommandHaltTurnSuppression | null {
  const actor = combatants.get(actorId);
  const halted =
    actor?.activeEffects.some(
      (effect) =>
        effect.kind === "commandPending" &&
        effect.option === "halt" &&
        effect.expiresAt.combatantId === actorId &&
        effect.expiresAt.round === round,
    ) ?? false;
  return halted ? { kind: "commandHalt" } : null;
}

function combatantsWithCommandHaltMovementSpent(
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

const COMMAND_HALT_SUPPRESSES_RUNTIME_COMMAND = {
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
  greaseGroundHazardSave: false,
  webRestraintSave: false,
  sleetStormAreaHazardSave: false,
  insectPlagueAreaHazardSave: false,
  cloudkillAreaHazardSave: false,
  disperseCloudkill: false,
  webRestrainedNoLongerInArea: false,
  webAreaRemoved: false,
  gustOfWindLineSave: false,
  gustOfWindLineDirectionChange: false,
  movableZoneSave: false,
  moonbeamCylinderExit: false,
  movableZoneReposition: false,
  movableZoneRam: false,
  releaseSpellCreatedHeldObject: false,
  protectionRelevantEffectSave: false,
  creatureTypeProtectionConditionAttempt: false,
  creatureTypeProtectionPossessionAttempt: false,
  disperseFogCloud: false,
  wardingBondSeparation: false,
  jumpMovementReplacement: true,
  dragonsBreathExhale: false,
  replaceSelfTransformationMode: true,
  commandGrovel: false,
  commandDrop: false,
  commandApproach: false,
  commandFlee: false,
  levitateAltitudeControl: true,
  creatureFalls: false,
} as const satisfies Record<BattleRuntimeCommand, boolean>;

const COMMAND_HALT_SUPPRESSES_SUBJECT_TAG = {
  action: true,
  actionSpell: true,
  bonusAction: true,
  bonusActionDashSpell: true,
  bonusActionSpell: true,
  bonusActionStandardAction: true,
  companionLifecycle: true,
  druidWildShape: true,
  findFamiliarSharedSenses: true,
  findFamiliarTouchSpell: true,
  monkFocusFlurryOfBlowsStrike: true,
  monkFocusOption: true,
  pactOfTheChainFamiliarAttack: true,
  unitFeature: true,
  unitFeatureHeldWeaponActivation: true,
} as const satisfies Record<
  Exclude<BattleSubject["tag"], "runtimeCommand">,
  boolean
>;

function subjectSuppressedByCommandHalt(subject: BattleSubject): boolean {
  return subject.tag === "runtimeCommand"
    ? COMMAND_HALT_SUPPRESSES_RUNTIME_COMMAND[subject.command]
    : COMMAND_HALT_SUPPRESSES_SUBJECT_TAG[subject.tag];
}
