// @vitest-environment jsdom
import type * as BattleRuntime from "@dnd/battle-runtime"
import { battlePresentedCheckpointFrontierEnvelope, combatantId } from "@dnd/battle-runtime"
import { render, screen } from "@testing-library/react"
import { Either } from "effect"
import { describe, expect, it, vi } from "vitest"

import type * as BattleSceneLayout from "./battle-scene-layout.ts"
import { BattlePage } from "./BattlePage.tsx"
import { WIZARD_BATTLE_DEMO_META, WIZARD_BATTLE_DEMO_STEPS } from "./wizard-battle-demo.ts"

vi.mock("@dnd/battle-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof BattleRuntime>()
  const { Either } = await import("effect")
  return {
    ...actual,
    battlePresentedCheckpointFrontierEnvelope: vi.fn(
      (
        session: Parameters<typeof actual.battlePresentedCheckpointFrontierEnvelope>[0]
      ): ReturnType<typeof actual.battlePresentedCheckpointFrontierEnvelope> => {
        const combatantId = session.state.combatants.keys().next().value
        return combatantId === undefined
          ? actual.battlePresentedCheckpointFrontierEnvelope(session)
          : Either.left([
              {
                tag: "battleSnapshotPresentationIssue",
                combatantId,
                reason: "missingStatBlockPresentation"
              }
            ])
      }
    )
  }
})

vi.mock("./battle-scene-layout.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof BattleSceneLayout>()
  const { Either } = await import("effect")
  return {
    ...actual,
    computeWizardBattleScene: vi.fn(
      (): ReturnType<typeof actual.computeWizardBattleScene> =>
        Either.left({
          combatantId: combatantId("synthetic:missing-actor"),
          reason: "missingCurrentActor",
          tag: "battleScenePresentationIssue"
        })
    )
  }
})

describe("BattlePage presentation failure", () => {
  it("renders typed snapshot projection issues", () => {
    render(<BattlePage steps={WIZARD_BATTLE_DEMO_STEPS} meta={WIZARD_BATTLE_DEMO_META} />)

    expect(screen.getByRole("alert").textContent).toContain("missingStatBlockPresentation")
  })

  it("renders typed scene projection issues after snapshot projection succeeds", async () => {
    const actual = await vi.importActual<typeof BattleRuntime>("@dnd/battle-runtime")
    const successfulEnvelope = actual.battlePresentedCheckpointFrontierEnvelope(WIZARD_BATTLE_DEMO_STEPS[0].session)
    expect(successfulEnvelope._tag).toBe("Right")
    vi.mocked(battlePresentedCheckpointFrontierEnvelope).mockReturnValueOnce(successfulEnvelope)

    render(<BattlePage steps={WIZARD_BATTLE_DEMO_STEPS} meta={WIZARD_BATTLE_DEMO_META} />)

    expect(screen.getByRole("alert").textContent).toContain("missingCurrentActor")
  })

  it("renders interrupt choice projection issues with their reactor context", async () => {
    const actual = await vi.importActual<typeof BattleRuntime>("@dnd/battle-runtime")
    const checkpointFrontier = actual.battlePresentedCheckpointFrontierEnvelope(WIZARD_BATTLE_DEMO_STEPS[4].session)
    if (Either.isLeft(checkpointFrontier) || checkpointFrontier.right.frontier.kind !== "interruptDecision") {
      throw new Error("Expected the counterspell demo step to expose an interrupt decision.")
    }
    const presentedChoice = checkpointFrontier.right.frontier.choices[0]
    if (presentedChoice.choice.kind === "reactionRollOrDamageReduction") {
      throw new Error("Expected the counterspell interrupt to carry a presented battle subject.")
    }
    const issue = {
      tag: "battleInterruptChoicePresentationIssue",
      reason: "missingSubjectPresentation",
      reactorId: presentedChoice.choice.reactorId,
      choiceKind: presentedChoice.choice.kind,
      subject: presentedChoice.choice.subject
    } as const
    vi.mocked(battlePresentedCheckpointFrontierEnvelope).mockReturnValueOnce(Either.left([issue]))

    render(<BattlePage steps={WIZARD_BATTLE_DEMO_STEPS} meta={WIZARD_BATTLE_DEMO_META} />)

    expect(screen.getByRole("alert").textContent).toBe(
      `Battle interrupt choice presentation is unavailable for reactor ${issue.reactorId}: missingSubjectPresentation.`
    )
  })
})
