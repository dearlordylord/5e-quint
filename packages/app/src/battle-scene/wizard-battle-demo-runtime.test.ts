import {
  battleCharacterExecutionScopeRef,
  battleCheckpointFrontierEnvelope,
  battleExecutionScopeOrdinal,
  battleId,
  battleProcedureExecutionRef,
  type BattleRuntimeResolutionResult,
  combatantId
} from "@dnd/battle-runtime"
import { NonNegativeInteger } from "@dnd/shared/types"
import { describe, expect, test } from "vitest"

import { WIZARD_BATTLE_DEMO_STEPS } from "./wizard-battle-demo.ts"
import {
  requireActionSpellAct,
  requireCounterspellChoice,
  requireCounterspellProcedureRef,
  requireHole,
  requireNeedsHoles,
  requireNeedsReaction,
  requireResultHole
} from "./wizard-battle-demo-runtime.ts"

function replaceNonEmptyAt<T>(
  values: readonly [T, ...ReadonlyArray<T>],
  index: number,
  replacement: T
): readonly [T, ...ReadonlyArray<T>] {
  const [first, ...rest] = values
  if (index === 0) return [replacement, ...rest]
  return [first, ...rest.map((value, restIndex) => (restIndex === index - 1 ? replacement : value))]
}

describe("wizard battle demo runtime guards", () => {
  test("reports stale authored fixture selections at their boundary", () => {
    const session = WIZARD_BATTLE_DEMO_STEPS[0].session

    expect(() => requireActionSpellAct(session, "synthetic:missing-spell", 9)).toThrow(
      "Expected synthetic:missing-spell action spell act."
    )
    expect(() =>
      requireCounterspellProcedureRef(
        session.context,
        combatantId("synthetic:missing-reactor"),
        "synthetic:missing-counterspell",
        9
      )
    ).toThrow("Expected Counterspell procedure presentation source.")
    expect(() => requireHole([], "rolledDice")).toThrow("Expected rolledDice hole.")
  })

  test("rejects result variants that do not establish the required workflow state", () => {
    expect(() => requireNeedsHoles({ tag: "invalid" } as never, "Expected a needs-holes result.")).toThrow(
      "Expected a needs-holes result."
    )
    expect(() =>
      requireNeedsReaction(
        {
          tag: "needsHoles",
          envelope: { checkpoint: {}, frontier: { kind: "acts", acts: [] } }
        } as never,
        "Expected a spell-cast Reaction."
      )
    ).toThrow("Expected a spell-cast Reaction.")
    expect(() =>
      requireCounterspellChoice(
        {
          tag: "needsHoles",
          envelope: {
            checkpoint: {},
            frontier: {
              kind: "interruptDecision",
              trigger: "spellCast",
              decisionHole: {},
              choices: []
            }
          }
        } as never,
        {
          reactorId: combatantId("synthetic:reactor"),
          slotLevel: 3,
          spellId: "synthetic:counterspell"
        }
      )
    ).toThrow("Expected Counterspell Reaction choice.")
    // These malformed envelopes inject protocol mismatches that the result union normally prevents.
    expect(() =>
      requireCounterspellChoice(
        {
          tag: "needsHoles",
          envelope: {
            checkpoint: {},
            frontier: {
              kind: "interruptDecision",
              trigger: "spellCast",
              decisionHole: {},
              choices: [{ kind: "synthetic:not-counterspell" }]
            }
          }
        } as never,
        {
          reactorId: combatantId("synthetic:reactor"),
          slotLevel: 3,
          spellId: "synthetic:counterspell"
        }
      )
    ).toThrow("Expected Counterspell Reaction choice.")
    expect(() =>
      requireCounterspellChoice(
        {
          tag: "needsHoles",
          envelope: { checkpoint: {}, frontier: { kind: "acts", acts: [] } }
        } as never,
        {
          reactorId: combatantId("synthetic:reactor"),
          slotLevel: 3,
          spellId: "synthetic:counterspell"
        }
      )
    ).toThrow("Expected Counterspell Reaction choice.")
    expect(() =>
      requireResultHole(
        {
          tag: "needsHoles",
          envelope: { checkpoint: {}, frontier: { kind: "holes", holes: [] } }
        } as never,
        "interruptDecision"
      )
    ).toThrow("Expected interruptDecision hole.")
    expect(() =>
      requireResultHole(
        {
          tag: "needsHoles",
          envelope: {
            checkpoint: {},
            frontier: { kind: "interruptDecision", decisionHole: {}, choices: [] }
          }
        } as never,
        "rolledDice"
      )
    ).toThrow("Expected rolledDice hole.")
  })

  test("rejects a reaction choice whose procedure has no presentation", () => {
    const reactorId = combatantId("E")
    const step = WIZARD_BATTLE_DEMO_STEPS.find((candidate) => {
      const frontier = battleCheckpointFrontierEnvelope(candidate.session.state).frontier
      return (
        frontier.kind === "interruptDecision" &&
        frontier.choices.some(
          (choice) =>
            choice.kind === "nestedProcedure" &&
            choice.subject.command === "castTriggeredReactionSpell" &&
            choice.subject.reactorId === reactorId
        )
      )
    })
    if (step === undefined) {
      throw new Error("Expected a Counterspell interrupt demo step.")
    }
    const envelope = battleCheckpointFrontierEnvelope(step.session.state)
    if (envelope.frontier.kind !== "interruptDecision") {
      throw new Error("Expected a Counterspell interrupt frontier.")
    }
    const choiceIndex = envelope.frontier.choices.findIndex(
      (choice) =>
        choice.kind === "nestedProcedure" &&
        choice.subject.command === "castTriggeredReactionSpell" &&
        choice.subject.reactorId === reactorId
    )
    if (choiceIndex < 0) {
      throw new Error("Expected a Counterspell interrupt choice.")
    }
    const selectedChoice = envelope.frontier.choices[choiceIndex]
    if (selectedChoice.kind !== "nestedProcedure" || selectedChoice.subject.command !== "castTriggeredReactionSpell") {
      throw new Error("Expected a Counterspell reaction spell choice.")
    }
    const unboundProcedureRef = battleProcedureExecutionRef(
      battleCharacterExecutionScopeRef(
        battleId("battle:synthetic-unbound-procedure"),
        selectedChoice.subject.actorId,
        battleExecutionScopeOrdinal(0)
      ),
      NonNegativeInteger(0)
    )
    const unboundChoice = {
      ...selectedChoice,
      subject: {
        ...selectedChoice.subject,
        procedureRef: unboundProcedureRef
      }
    }
    const choices = replaceNonEmptyAt(envelope.frontier.choices, choiceIndex, unboundChoice)
    const result: Extract<BattleRuntimeResolutionResult, { readonly tag: "needsHoles" }> = {
      tag: "needsHoles",
      session: step.session,
      envelope: {
        ...envelope,
        frontier: {
          ...envelope.frontier,
          choices
        }
      }
    }

    expect(() => requireCounterspellChoice(result, { reactorId, slotLevel: 3, spellId: "counterspell" })).toThrow(
      "Expected Counterspell Reaction choice."
    )
  })
})
