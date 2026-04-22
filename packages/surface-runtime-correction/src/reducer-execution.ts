import { currentActing, nextInitiative } from '@dnd/shared/initiative-algebra';

import type { State } from '#/reducer-state.ts';
import type {
  FilledHoleValue,
  HoleId,
  PromptInstanceKey,
  ResolutionRequest,
  ResolutionResult,
} from '#/reducer-resolution.ts';

function isTargetChoiceValue(
  value: FilledHoleValue,
): value is Extract<FilledHoleValue, { readonly kind: 'targetChoice' }> {
  return value.kind === 'targetChoice'
}

function isD20AttackRollValue(
  value: FilledHoleValue,
): value is Extract<FilledHoleValue, { readonly kind: 'attackRoll' }> {
  return value.kind === 'attackRoll'
}

export function resolveSubject(
  state: State,
  request: ResolutionRequest,
): ResolutionResult {
  const acting = currentActing(state.initiative)
  if (request.subject.actorId !== acting) {
    return { tag: 'invalid', reason: 'actor is not currently acting' }
  }

  if (
    request.subject.tag === 'coreAction' &&
    request.subject.action === 'attack'
  ) {
    if (![...state.combatants.keys()].some((id) => id !== acting)) {
      return { tag: 'invalid', reason: 'no valid attack target' }
    }

    const targetChoice = request.filledHoleValues
      .filter(isTargetChoiceValue)
      .find((value) => value.holeId === ('core_attack_target' as HoleId))

    if (targetChoice === undefined) {
      return {
        tag: 'needsHoles',
        holes: [
          {
            promptInstanceKey: 'core:attack:target' as PromptInstanceKey,
            holeId: 'core_attack_target' as HoleId,
            kind: 'targetChoice',
            label: 'attack target',
          },
        ],
      }
    }

    if (
      targetChoice.value === acting ||
      !state.combatants.has(targetChoice.value)
    ) {
      return { tag: 'invalid', reason: 'invalid attack target' }
    }

    const attackRoll = request.filledHoleValues
      .filter(isD20AttackRollValue)
      .find((value) => value.holeId === 'core_attack_roll')

    if (attackRoll === undefined) {
      return {
        tag: 'needsHoles',
        holes: [
          {
            promptInstanceKey: 'core:attack:attackRoll' as PromptInstanceKey,
            holeId: 'core_attack_roll' as HoleId,
            kind: 'attackRoll',
            label: 'attack roll',
          },
        ],
      }
    }

    return {
      tag: 'invalid',
      reason: `attack resolution not implemented after roll ${attackRoll.value}`,
    }
  }

  if (
    request.subject.tag === 'coreAction' &&
    request.subject.action === 'endTurn'
  ) {
    const initiative = nextInitiative(state.initiative)

    return {
      tag: 'resolved',
      state: {
        ...state,
        initiative,
        currentActionsAvailable: 1,
        currentHasBonusAction: true,
        currentHasFreeAction: true,
      },
    }
  }

  return { tag: 'invalid', reason: 'not implemented' };
}
