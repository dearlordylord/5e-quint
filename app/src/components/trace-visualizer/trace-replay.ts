/**
 * Replays a sequence of XState events through the real dndMachine,
 * capturing NormalizedState at each step via snapshotToNormalized().
 *
 * This turns the trace visualizer into a live proof: the Quint column
 * shows hand-written expected values ("spec says") and the XState column
 * shows what the real machine produces ("implementation does").
 */

import { createActor } from "xstate"

import { dndMachine, type DndSnapshot } from "#/machine.ts"
import type { DndEvent, DndMachineInput } from "#/machine-types.ts"

import type { NormalizedState, TraceStep } from "./sample-trace.ts"

// Mirrors machine.mbt.test.ts snapshotToNormalized but uses Array (not Set)
// for incapacitatedSources, matching the visualizer's NormalizedState type.

function isDead(snap: DndSnapshot): boolean {
  return snap.matches({ damageTrack: "dead" })
}

export function snapshotToNormalized(snap: DndSnapshot): NormalizedState {
  const c = snap.context
  const dead = isDead(snap)
  return {
    hp: c.hp,
    maxHp: c.maxHp,
    tempHp: c.tempHp,
    deathSavesSuccesses: c.deathSaves.successes,
    deathSavesFailures: c.deathSaves.failures,
    stable: c.stable,
    dead,
    blinded: c.blinded,
    charmed: c.charmed,
    deafened: c.deafened,
    exhaustion: c.exhaustion,
    frightened: c.frightened,
    grappled: c.grappled,
    invisible: c.invisible,
    paralyzed: c.paralyzed,
    petrified: c.petrified,
    poisoned: c.poisoned,
    prone: c.prone,
    restrained: c.restrained,
    stunned: c.stunned,
    unconscious: c.unconscious,
    incapacitatedSources: [...c.incapacitatedSources].sort(),
    hitPointDiceRemaining: c.hitDiceRemaining,
    activeEffects: [...c.activeEffects]
      .sort((a, b) => a.spellId.localeCompare(b.spellId))
      .map((ae) => ({ spellId: ae.spellId, turnsRemaining: ae.turnsRemaining, expiresAt: ae.expiresAt })),
    movementRemaining: c.movementRemaining,
    effectiveSpeed: c.effectiveSpeed,
    actionsRemaining: c.actionsRemaining,
    attackActionUsed: c.attackActionUsed,
    bonusActionUsed: c.bonusActionUsed,
    reactionAvailable: c.reactionAvailable,
    freeInteractionUsed: c.freeInteractionUsed,
    extraAttacksRemaining: c.extraAttacksRemaining,
    disengaged: c.disengaged,
    dodging: c.dodging,
    readiedAction: c.readiedAction,
    bonusActionSpellCast: c.bonusActionSpellCast,
    nonCantripActionSpellCast: c.nonCantripActionSpellCast,
    bonusMovementRemaining: c.bonusMovementRemaining,
    bonusMovementOAFree: c.bonusMovementOAFree,
    turnPhase: snap.matches({ turnPhase: "acting" })
      ? "acting"
      : snap.matches({ turnPhase: "waitingForTurn" })
        ? "waitingForTurn"
        : "outOfCombat",
    slotsMax: [...c.slotsMax],
    slotsCurrent: [...c.slotsCurrent],
    pactSlotsMax: c.pactSlotsMax,
    pactSlotsCurrent: c.pactSlotsCurrent,
    pactSlotLevel: c.pactSlotLevel,
    concentrationSpellId: c.concentrationSpellId,
    secondWindCharges: c.secondWindCharges,
    secondWindMax: c.secondWindMax,
    actionSurgeCharges: c.actionSurgeCharges,
    actionSurgeMax: c.actionSurgeMax,
    actionSurgeUsedThisTurn: c.actionSurgeUsedThisTurn,
    indomitableCharges: c.indomitableCharges,
    indomitableMax: c.indomitableMax,
    heroicInspiration: c.heroicInspiration,
    fighterLevel: c.fighterLevel
  }
}

export interface TraceEventDef {
  readonly quintAction: string
  readonly xstateEvent: string
  readonly description: string
  readonly events: ReadonlyArray<DndEvent>
  readonly expectedQuintState: NormalizedState
}

export function replayTrace(input: DndMachineInput, defs: ReadonlyArray<TraceEventDef>): ReadonlyArray<TraceStep> {
  const actor = createActor(dndMachine, { input })
  actor.start()

  const steps: Array<TraceStep> = []

  for (const def of defs) {
    for (const event of def.events) {
      actor.send(event)
    }

    const xstateState = snapshotToNormalized(actor.getSnapshot())

    steps.push({
      quintAction: def.quintAction,
      xstateEvent: def.xstateEvent,
      description: def.description,
      quintState: def.expectedQuintState,
      xstateState
    })
  }

  actor.stop()
  return steps
}
