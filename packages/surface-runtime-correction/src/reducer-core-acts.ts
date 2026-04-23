import type { State } from '#/reducer-state.ts';

export function canUseCoreAttack(state: State): boolean {
  return state.currentActionsAvailable > 0
}
