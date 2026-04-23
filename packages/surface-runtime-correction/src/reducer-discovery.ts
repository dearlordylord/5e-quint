import { currentActing } from '@dnd/shared/initiative-algebra';

import { canUseCoreAttack } from '#/reducer-core-acts.ts';
import type { State } from '#/reducer-state.ts';
import type {
  AvailableAct,
  HoleId,
  HoleInstanceKey,
} from '#/reducer-types.ts';

export function discoverAvailableActs(
  state: State,
): ReadonlyArray<AvailableAct> {
  const actorId = currentActing(state.initiative)
  const acts: Array<AvailableAct> = []

  if (
    canUseCoreAttack(state) &&
    [...state.combatants.keys()].some((id) => id !== actorId)
  ) {
    acts.push({
      subject: {
        tag: 'coreAction',
        actorId,
        action: 'attack',
      },
      label: 'Attack',
      summary: 'Make an attack.',
        initialHoles: [
          {
            holeInstanceKey: 'core:attack:target' as HoleInstanceKey,
            holeId: 'core_attack_target' as HoleId,
            kind: 'targetChoice',
            label: 'attack target',
        },
      ],
    })
  }

  acts.push({
    subject: {
      tag: 'coreAction',
      actorId,
      action: 'endTurn',
    },
    label: 'End Turn',
    summary: 'End the current turn.',
    initialHoles: [],
  })

  return acts
}
