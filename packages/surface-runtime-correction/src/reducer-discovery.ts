import { currentActing } from '@dnd/shared/initiative-algebra';

import type { State } from '#/reducer-state.ts';
import type {
  AvailableAction,
  HoleId,
  PromptInstanceKey,
} from '#/reducer-resolution.ts';

export function discoverAvailableActions(
  state: State,
): ReadonlyArray<AvailableAction> {
  const actorId = currentActing(state.initiative)
  const actions: Array<AvailableAction> = []

  if ([...state.combatants.keys()].some((id) => id !== actorId)) {
    actions.push({
      subject: {
        tag: 'coreAction',
        actorId,
        action: 'attack',
      },
      label: 'Attack',
      summary: 'Make an attack.',
      initialHoles: [
        {
          promptInstanceKey: 'core:attack:target' as PromptInstanceKey,
          holeId: 'core_attack_target' as HoleId,
          kind: 'targetChoice',
          label: 'attack target',
        },
      ],
    })
  }

  actions.push({
    subject: {
      tag: 'coreAction',
      actorId,
      action: 'endTurn',
    },
    label: 'End Turn',
    summary: 'End the current turn.',
    initialHoles: [],
  })

  return actions
}
