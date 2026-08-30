import {
  type BattleRuntimeResolutionResult,
  combatantId,
  currentBattleCheckpointFrontierEnvelope
} from "@dnd/battle-runtime"
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

describe("wizard battle demo runtime guards", () => {
  test("reports stale authored fixture selections at their boundary", () => {
    const session = WIZARD_BATTLE_DEMO_STEPS[0].session

    expect(() => requireActionSpellAct(session, "synthetic:missing-spell", 9)).toThrow(
      "Expected synthetic:missing-spell action spell act."
    )
    expect(() => requireCounterspellProcedureRef(session.context, combatantId("synthetic:missing-reactor"), 9)).toThrow(
      "Expected exactly one Counterspell procedure presentation source; got 0."
    )
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
          slotLevel: 3
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
          slotLevel: 3
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
          slotLevel: 3
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

  test("rejects duplicate Counterspell choices for the same admitted procedure", () => {
    const counterspellStep = WIZARD_BATTLE_DEMO_STEPS.find(
      (step) => currentBattleCheckpointFrontierEnvelope(step.session).frontier.kind === "interruptDecision"
    )
    if (counterspellStep === undefined) {
      throw new Error("Expected a Counterspell frontier in the demo fixture.")
    }
    const envelope = currentBattleCheckpointFrontierEnvelope(counterspellStep.session)
    if (envelope.frontier.kind !== "interruptDecision") {
      throw new Error("Expected the selected demo frontier to be an interrupt decision.")
    }
    const counterspellChoice = envelope.frontier.choices.find((choice) => choice.kind === "castTriggeredReactionSpell")
    if (counterspellChoice === undefined) {
      throw new Error("Expected a Counterspell choice in the demo frontier.")
    }
    const duplicateResult = {
      tag: "needsHoles",
      session: counterspellStep.session,
      envelope: {
        ...envelope,
        frontier: {
          ...envelope.frontier,
          choices: [counterspellChoice, counterspellChoice]
        }
      }
    } satisfies Extract<BattleRuntimeResolutionResult, { readonly tag: "needsHoles" }>

    expect(() =>
      requireCounterspellChoice(duplicateResult, {
        reactorId: counterspellChoice.reactorId,
        slotLevel: 3
      })
    ).toThrow("Expected exactly one Counterspell Reaction choice; got 2.")
  })
})
