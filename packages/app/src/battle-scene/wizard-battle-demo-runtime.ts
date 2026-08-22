import {
  type AvailableBattleAct,
  battleActSpellSlotPresentation,
  type BattleFill,
  type BattleHole,
  type BattleInterruptProcedureChoice,
  type BattleObjectDamageDisposition,
  type BattleObjectId,
  type BattleRuntimeContext,
  type BattleRuntimeResolutionResult,
  type BattleRuntimeSession,
  type BattleSubject,
  battleSubjectPresentation,
  type CombatantId,
  discoverBattleActs,
  SPELL_CAST_REACTION_FACTS_HOLE_ID
} from "@dnd/battle-runtime"
import { DieRollResult, movementFeet } from "@dnd/shared/types"
import { Match } from "effect"

type ReadonlyNonEmptyArray<T> = readonly [T, ...ReadonlyArray<T>]

export type CounterspellTriggerFact = Extract<
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

export function requireActionSpellAct(
  session: BattleRuntimeSession,
  selectedSpellId: string,
  slotLevel: number
): ActionSpellAct {
  const act = discoverBattleActs(session).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellSlotPresentation(candidate)?.invocation.spellId === selectedSpellId &&
      Number(battleActSpellSlotPresentation(candidate)?.invocation.slotLevel) === slotLevel
  )
  /* v8 ignore next -- @preserve -- defensive failure after fixture-authored spell selection */
  if (act === undefined) {
    throw new Error(`Expected ${selectedSpellId} action spell act.`)
  }
  return act
}

export function requireCounterspellChoice(
  result: Extract<BattleRuntimeResolutionResult, { readonly tag: "needsHoles" }>,
  input: {
    readonly reactorId: CombatantId
    readonly slotLevel: number
    readonly spellId: string
  }
): CounterspellReactionChoice {
  const choice = result.snapshot.pendingInterrupt?.choices.find(
    (candidate): candidate is CounterspellReactionChoice => {
      if (candidate.kind !== "castTriggeredReactionSpell" || candidate.reactorId !== input.reactorId) {
        return false
      }
      const presentation = battleSubjectPresentation(result.session, candidate.subject)
      return (
        presentation?.kind === "spell" &&
        presentation.invocation.tag === "spellSlot" &&
        presentation.invocation.procedure === "counterspell" &&
        presentation.invocation.spellId === input.spellId &&
        Number(presentation.invocation.slotLevel) === input.slotLevel
      )
    }
  )
  /* v8 ignore next -- @preserve -- defensive failure after the pending interrupt narrows available choices */
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
      procedureRef: choice.subject.procedureRef,
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
  readonly sourceProcedureRef: CounterspellTriggerFact["sourceProcedureRef"]
  readonly rangeFeet: number
}): CounterspellTriggerFact {
  return {
    kind: "counterspellTriggerCasterVisibleWithinRange",
    reactorId: input.reactorId,
    casterId: input.casterId,
    sourceProcedureRef: input.sourceProcedureRef,
    rangeFeet: movementFeet(input.rangeFeet)
  }
}

export function requireCounterspellProcedureRef(
  context: BattleRuntimeContext,
  reactorId: CombatantId,
  spellId: string,
  slotLevel: number
): CounterspellTriggerFact["sourceProcedureRef"] {
  const source = context.characters.get(reactorId)?.spellPresentationSources.find(
    (candidate) =>
      candidate.invocation.procedure === "counterspell" &&
      candidate.invocation.spell.id === spellId &&
      Match.value(candidate.invocation.resource).pipe(
        Match.when({ tag: "spellSlot" }, ({ slotLevel: selectedSlotLevel }) => Number(selectedSlotLevel) === slotLevel),
        Match.when({ tag: "spellAccessFreeCast" }, ({ castLevel }) => Number(castLevel) === slotLevel),
        Match.exhaustive
      )
  )
  /* v8 ignore next -- @preserve -- defensive failure after fixture-authored spell presentation setup */
  if (source === undefined) {
    throw new Error("Expected Counterspell procedure presentation source.")
  }
  return source.procedureRef
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

export function counterspellSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  casterId: CombatantId,
  succeeded: boolean
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      outcomes: [{ targetId: casterId, succeeded }]
    }
  }
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
  result: BattleRuntimeResolutionResult,
  message: string
): asserts result is Extract<BattleRuntimeResolutionResult, { readonly tag: "needsHoles" }> {
  requireNeedsHoles(result, message)
  /* v8 ignore next -- @preserve -- callers establish the reaction trigger before using this assertion */
  if (result.snapshot.pendingInterrupt?.trigger !== "spellCast") {
    throw new Error(message)
  }
}

export function requireNeedsHoles(
  result: BattleRuntimeResolutionResult,
  message: string
): asserts result is Extract<BattleRuntimeResolutionResult, { readonly tag: "needsHoles" }> {
  /* v8 ignore next -- @preserve -- assertion failure branch; normal result variants are tested at their producers */
  if (result.tag !== "needsHoles") {
    throw new Error(message)
  }
}

export function requireResultHole<K extends BattleHole["kind"]>(
  result: BattleRuntimeResolutionResult,
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
  /* v8 ignore next -- @preserve -- fixture callers select hole kinds exposed by the immediately preceding result */
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`)
  }
  return hole
}
