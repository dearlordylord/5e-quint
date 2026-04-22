import { Schema } from 'effect';
import type { UnitRecord } from '@dnd/prototype-content-surface/surface/types';

export type RuntimeHoleSet = unknown
export const HoleId = Schema.NonEmptyTrimmedString.pipe(
  Schema.brand('HoleId'),
)
export type HoleId = typeof HoleId.Type

export type PendingResolutionSubject =
  | { readonly tag: 'coreAction'; readonly action: 'attack' | 'endTurn' }
  | { readonly tag: 'unit'; readonly unitId: UnitRecord['id'] }

export type ChosenHoleValue = {
  // Example: Chromatic Orb chooses damage type once, then later leap damage
  // reuses that choice via `same_choice_as(holeId)`.
  readonly holeId: HoleId
  readonly value: unknown
}

export type ResolutionFrame = {
  // stable values chosen earlier in this resolution, reusable by later holes
  readonly chosenHoleValues: ReadonlyArray<ChosenHoleValue>

  // runtime bookkeeping for continuation semantics
  readonly continuationState: unknown
}

export type PendingResolution = {
  // Protocol:
  // - `holes` is only the current hole set that the table must fill now.
  // - `frame.chosenHoleValues` carries stable earlier choices forward across
  //   later continuation steps.
  // - `frame.continuationState` carries opaque runtime bookkeeping for the
  //   authored continuation semantics.
  // - When resolution opens a new continuation step, the previous
  //   `pendingResolution` is replaced by a new one with updated `frame`.
  // - We do not keep a history of pending resolutions; we keep only the
  //   durable facts needed by the next step.
  readonly subject: PendingResolutionSubject
  readonly holes: RuntimeHoleSet
  readonly frame: ResolutionFrame
}

export type AvailableAction = {
  readonly subject: PendingResolutionSubject
  readonly initialHoles: RuntimeHoleSet | null
}
