import {
  type AvailableBattleAct,
  type BattleFill,
  type BattleHole,
  type BattleInterruptProcedureChoice,
  type BattleObjectDamageDisposition,
  type BattleObjectId,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
  discoverBattleActs,
  SPELL_CAST_REACTION_FACTS_HOLE_ID
} from "@dnd/battle-runtime"
import { DieRollResult, movementFeet } from "@dnd/shared/types"

type ReadonlyNonEmptyArray<T> = readonly [T, ...ReadonlyArray<T>]

type CounterspellTriggerFact = Extract<
  Extract<BattleFill, { readonly kind: "targetSpatialFacts" }>["spatialFacts"][number],
  { readonly kind: "counterspellTriggerCasterVisibleWithinRange" }
>

type CounterspellReactionChoice = Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "castTriggeredReactionSpell" }
>

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>
}

export function requireActionSpellAct(state: BattleState, selectedSpellId: string, slotLevel: number): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === selectedSpellId &&
      candidate.subject.invocation.tag === "spellSlot" &&
      Number(candidate.subject.invocation.slotLevel) === slotLevel
  )
  if (act === undefined) {
    throw new Error(`Expected ${selectedSpellId} action spell act.`)
  }
  return act
}

export function requireCounterspellChoice(
  result: Extract<BattleResolutionResult, { readonly tag: "needsHoles" }>,
  input: {
    readonly reactorId: CombatantId
    readonly slotLevel: number
    readonly spellId: string
  }
): CounterspellReactionChoice {
  const choice = result.snapshot.pendingInterrupt?.choices.find(
    (candidate): candidate is CounterspellReactionChoice =>
      candidate.kind === "castTriggeredReactionSpell" &&
      candidate.reactorId === input.reactorId &&
      candidate.invocation.tag === "spellSlot" &&
      candidate.invocation.spellId === input.spellId &&
      candidate.invocation.procedure === "counterspell" &&
      Number(candidate.invocation.slotLevel) === input.slotLevel
  )
  if (choice === undefined) {
    throw new Error("Expected Counterspell Reaction choice.")
  }
  return choice
}

export function counterspellDecision(
  reactorId: CombatantId,
  choice: CounterspellReactionChoice,
  fills: ReadonlyArray<BattleFill>
): Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"] {
  return {
    kind: "resolve",
    responderId: reactorId,
    choice: {
      kind: "castTriggeredReactionSpell",
      invocation: choice.invocation,
      fills
    }
  }
}

export function spellCastReactionFactsFill(
  facts: ReadonlyArray<CounterspellTriggerFact>
): Extract<BattleFill, { readonly kind: "targetSpatialFacts" }> {
  return {
    kind: "targetSpatialFacts",
    holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
    spatialFacts: facts
  }
}

export function counterspellTriggerFact(input: {
  readonly reactorId: CombatantId
  readonly casterId: CombatantId
  readonly spellId: string
  readonly rangeFeet: number
}): CounterspellTriggerFact {
  return {
    kind: "counterspellTriggerCasterVisibleWithinRange",
    reactorId: input.reactorId,
    casterId: input.casterId,
    spellId: input.spellId,
    rangeFeet: movementFeet(input.rangeFeet)
  }
}

export function interruptDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "interruptDecision" }>,
  value: Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"]
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  return { kind: "interruptDecision", holeId: hole.holeId, value }
}

export function declineInterruptDecision(
  reactorId: CombatantId
): Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"] {
  return { kind: "decline", responderId: reactorId }
}

export function fireballSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  input: {
    readonly originAnchorId: CombatantId
    readonly objectId: BattleObjectId
    readonly outcomes: ReadonlyArray<{
      readonly targetId: CombatantId
      readonly succeeded: boolean
    }>
  }
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "fireballArea",
        originAnchorId: input.originAnchorId,
        affectedTargetIds: input.outcomes.map((outcome) => outcome.targetId),
        objectIgnitionFacts: [
          {
            objectId: input.objectId,
            disposition: { kind: "flammableUnattended" }
          }
        ]
      },
      outcomes: input.outcomes
    }
  }
}

export function shatterSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  input: {
    readonly originAnchorId: CombatantId
    readonly outcomes: ReadonlyArray<{
      readonly targetId: CombatantId
      readonly succeeded: boolean
    }>
    readonly nonmagicalUnattendedObjectDamageFacts: ReadonlyArray<{
      readonly objectId: BattleObjectId
      readonly disposition: BattleObjectDamageDisposition
    }>
  }
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "shatterArea",
        originAnchorId: input.originAnchorId,
        affectedTargetIds: input.outcomes.map((outcome) => outcome.targetId),
        nonmagicalUnattendedObjectDamageFacts: input.nonmagicalUnattendedObjectDamageFacts
      },
      outcomes: input.outcomes
    }
  }
}

export function damageRollFillWithGroups(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  groups: ReadonlyNonEmptyArray<ReadonlyNonEmptyArray<number>>
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const [firstGroup, ...restGroups] = groups
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [rolledDiceGroup(firstGroup), ...restGroups.map(rolledDiceGroup)]
  }
}

function rolledDiceGroup(
  group: ReadonlyNonEmptyArray<number>
): Extract<BattleFill, { readonly kind: "rolledDice" }>["value"][number] {
  const [firstResult, ...restResults] = group
  return {
    results: [DieRollResult(firstResult), ...restResults.map(DieRollResult)]
  }
}

export function deathSavingThrowFill(
  hole: Extract<BattleHole, { readonly kind: "deathSavingThrow" }>,
  roll: number
): Extract<BattleFill, { readonly kind: "deathSavingThrow" }> {
  return {
    kind: "deathSavingThrow",
    holeId: hole.holeId,
    value: DieRollResult(roll)
  }
}

export function requireNeedsReaction(
  result: BattleResolutionResult,
  message: string
): asserts result is Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  requireNeedsHoles(result, message)
  if (result.snapshot.pendingInterrupt?.trigger !== "spellCast") {
    throw new Error(message)
  }
}

export function requireNeedsHoles(
  result: BattleResolutionResult,
  message: string
): asserts result is Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  if (result.tag !== "needsHoles") {
    throw new Error(message)
  }
}

export function requireResultHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K
): Extract<BattleHole, { readonly kind: K }> {
  requireNeedsHoles(result, `Expected ${kind} hole.`)
  return requireHole(result.holes, kind)
}

export function requireHole<K extends BattleHole["kind"]>(
  holes: ReadonlyArray<BattleHole>,
  kind: K
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> => candidate.kind === kind
  )
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`)
  }
  return hole
}
