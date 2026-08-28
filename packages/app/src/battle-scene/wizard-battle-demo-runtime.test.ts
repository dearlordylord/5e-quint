import { combatantId } from "@dnd/battle-runtime"
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
})
