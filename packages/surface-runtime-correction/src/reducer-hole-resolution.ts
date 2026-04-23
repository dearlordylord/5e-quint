import { Match } from "effect";
import { currentActing, nextInitiative } from '@dnd/shared/initiative-algebra';

import { canUseCoreAttack } from '#/reducer-core-acts.ts';
import type { State } from '#/reducer-state.ts';
import type {
  FilledHoleValue,
  HoleId,
  HoleInstanceKey,
  ResolutionRequest,
  ResolutionResult,
} from '#/reducer-types.ts';

function isTargetChoiceValue(
  value: FilledHoleValue,
): value is Extract<FilledHoleValue, { readonly kind: 'targetChoice' }> {
  return value.kind === 'targetChoice'
}

function isAttackRollValue(
  value: FilledHoleValue,
): value is Extract<FilledHoleValue, { readonly kind: 'attackRoll' }> {
  return value.kind === 'attackRoll'
}

function isRolledDiceValue(
  value: FilledHoleValue,
): value is Extract<FilledHoleValue, { readonly kind: 'rolledDice' }> {
  return value.kind === 'rolledDice'
}

function needsTargetHole(): ResolutionResult {
  return {
    tag: 'needsHoles',
    holes: [
      {
        holeInstanceKey: 'core:attack:target' as HoleInstanceKey,
        holeId: 'core_attack_target' as HoleId,
        kind: 'targetChoice',
        label: 'attack target',
      },
    ],
  }
}

function needsAttackRollHole(): ResolutionResult {
  return {
    tag: 'needsHoles',
    holes: [
      {
        holeInstanceKey: 'core:attack:attackRoll' as HoleInstanceKey,
        holeId: 'core_attack_roll' as HoleId,
        kind: 'attackRoll',
        label: 'attack roll',
      },
    ],
  }
}

function needsDamageRollHole(): ResolutionResult {
  return {
    tag: 'needsHoles',
    holes: [
      {
        holeInstanceKey: 'core:attack:damage' as HoleInstanceKey,
        holeId: 'core_attack_damage' as HoleId,
        kind: 'rolledDice',
        label: 'damage roll',
      },
    ],
  }
}

function ensureActingCreature(
  state: State,
  request: ResolutionRequest,
): ResolutionResult | null {
  const acting = currentActing(state.initiative)
  if (request.subject.actorId !== acting) {
    return { tag: 'invalid', reason: 'actor is not currently acting' }
  }

  return null
}

function advanceCoreAttackResolution(
  state: State,
  filledHoleValues: ReadonlyArray<FilledHoleValue>,
): ResolutionResult {
  if (!canUseCoreAttack(state)) {
    return { tag: 'invalid', reason: 'no action available for attack' }
  }

  const acting = currentActing(state.initiative)

  if (![...state.combatants.keys()].some((id) => id !== acting)) {
    return { tag: 'invalid', reason: 'no valid attack target' }
  }

  const targetChoice = filledHoleValues
    .filter(isTargetChoiceValue)
    .find((value) => value.holeId === ('core_attack_target' as HoleId))

  if (targetChoice === undefined) {
    return needsTargetHole()
  }

  if (
    targetChoice.value === acting ||
    !state.combatants.has(targetChoice.value)
  ) {
    return { tag: 'invalid', reason: 'invalid attack target' }
  }

  const attackRoll = filledHoleValues
    .filter(isAttackRollValue)
    .find((value) => value.holeId === 'core_attack_roll')

  if (attackRoll === undefined) {
    return needsAttackRollHole()
  }

  const damageRoll = filledHoleValues
    .filter(isRolledDiceValue)
    .find((value) => value.holeId === 'core_attack_damage')

  if (damageRoll === undefined) {
    return needsDamageRollHole()
  }

  return {
    tag: 'invalid',
    reason: 'attack hit adjudication is not implemented yet',
  }
}

function resolveCoreEndTurn(state: State): ResolutionResult {
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

export function resolveSubject(
  state: State,
  request: ResolutionRequest,
): ResolutionResult {
  const actingError = ensureActingCreature(state, request)
  if (actingError !== null) {
    return actingError
  }

  return Match.value(request.subject).pipe(
    Match.when(
      { tag: 'coreAction', action: 'attack' },
      () => advanceCoreAttackResolution(state, request.filledHoleValues),
    ),
    Match.when(
      { tag: 'coreAction', action: 'endTurn' },
      () => resolveCoreEndTurn(state),
    ),
    Match.orElse(() => ({ tag: 'invalid', reason: 'not implemented' } as const)),
  )
}
