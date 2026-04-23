import type { ConditionState } from '@dnd/shared/conditions-algebra';
import type { InitiativeStack } from '@dnd/shared/initiative-algebra';
import type { CreatureId, Hp, SpellSlots } from '@dnd/shared/types';
import type { UnitRecord } from '@dnd/prototype-content-surface/surface/types';

export type CreatureState = {
  // invariant: hp can't be more than maxHp. for temp hp, there is a field
  readonly hp: Hp
  readonly maxHp: Hp
  readonly tempHp: Hp
  readonly conditions: ConditionState
  // carried through the rounds, into the next turn
  readonly hasReaction: boolean
  readonly authoredUnits: ReadonlyArray<UnitRecord>
  readonly spellSlots: SpellSlots
  // invariant: current spell slots can't be larger than max
  readonly spellSlotsMax: SpellSlots
}

export type State = {
  // round and turn encoded into initiative
  readonly initiative: InitiativeStack<CreatureId>
  readonly combatants: ReadonlyMap<CreatureId, CreatureState>

  // action economy
  // Remaining count for the domain resource Action.
  readonly currentActionsAvailable: 0 | 1 | 2
  readonly currentHasBonusAction: boolean
  readonly currentHasFreeAction: boolean
}
