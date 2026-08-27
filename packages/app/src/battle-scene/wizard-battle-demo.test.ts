import {
  battlePresentedCheckpointFrontierEnvelope,
  BattlePresentedCheckpointFrontierEnvelopeSchema,
  battlePresentedSnapshot,
  combatantId,
  snapshotBattle
} from "@dnd/battle-runtime"
import { AdminSessionProjectionSchema } from "@dnd/mcp/experimental-admin-mirror-contract"
import { productionBattleConsumerSeam } from "@dnd/mcp/test-support/cross-boundary-battle"
import { Hp } from "@dnd/shared/types"
import { Either, Schema } from "effect"
import { describe, expect, test } from "vitest"

import { computeWizardBattleScene } from "./battle-scene-layout.ts"
import {
  WIZARD_BATTLE_DEMO_META,
  WIZARD_BATTLE_DEMO_OBJECT_IGNITIONS,
  WIZARD_BATTLE_DEMO_STATE,
  WIZARD_BATTLE_DEMO_STEPS
} from "./wizard-battle-demo.ts"

describe("wizard battle demo", () => {
  test("resolves the full promoted Fireball, Shatter, Counterspell, and death-save demo", () => {
    const snapshot = snapshotBattle(WIZARD_BATTLE_DEMO_STATE)
    const laserWizard = snapshot.combatants.find(
      (combatant) => WIZARD_BATTLE_DEMO_META.combatants[combatant.combatantId]?.name === "Laser Wizard"
    )
    const mudScamp = snapshot.combatants.find(
      (combatant) => WIZARD_BATTLE_DEMO_META.combatants[combatant.combatantId]?.name === "Mud Scamp"
    )
    const forestWizard = snapshot.combatants.find(
      (combatant) => WIZARD_BATTLE_DEMO_META.combatants[combatant.combatantId]?.name === "Forest Wizard"
    )
    const grayElf = snapshot.combatants.find(
      (combatant) => WIZARD_BATTLE_DEMO_META.combatants[combatant.combatantId]?.name === "Gray Elf"
    )
    const bufo = snapshot.combatants.find(
      (combatant) => WIZARD_BATTLE_DEMO_META.combatants[combatant.combatantId]?.name === "Bufo"
    )
    const ritualWizard = snapshot.combatants.find(
      (combatant) => WIZARD_BATTLE_DEMO_META.combatants[combatant.combatantId]?.name === "Ritual Wizard"
    )
    const titles = WIZARD_BATTLE_DEMO_STEPS.map((event) => event.title)

    expect(WIZARD_BATTLE_DEMO_STEPS).toHaveLength(151)
    expect(titles.filter((title) => title === "Turn starts")).toHaveLength(34)
    expect(titles.filter((title) => title === "Reaction facts")).toHaveLength(6)
    expect(titles.filter((title) => title === "Counterspell")).toHaveLength(8)
    expect(titles.filter((title) => title === "Counterspell window")).toHaveLength(9)
    expect(titles.filter((title) => title === "Shatter")).toHaveLength(2)
    expect(titles.filter((title) => title === "Death save")).toHaveLength(13)
    expect(titles).toContain("Counterspell declined")
    expect(WIZARD_BATTLE_DEMO_OBJECT_IGNITIONS.map((ignition) => ignition.sourceCombatantId)).toEqual([
      "A",
      "D",
      "A",
      "C"
    ])
    expect(laserWizard).toMatchObject({ hp: 8, maxHp: 50 })
    expect(bufo).toMatchObject({ hp: 22, maxHp: 50 })
    expect(mudScamp).toMatchObject({ hp: 0, zeroHpLifecycle: { dead: true } })
    expect(forestWizard).toMatchObject({ hp: 0, zeroHpLifecycle: { dead: true } })
    expect(grayElf).toMatchObject({ hp: 0, zeroHpLifecycle: { stable: true } })
    expect(ritualWizard).toMatchObject({ hp: 0, zeroHpLifecycle: { stable: true } })
  })

  test("reports a typed issue instead of inventing a current-actor label", () => {
    const step = WIZARD_BATTLE_DEMO_STEPS[0]
    const presented = battlePresentedSnapshot(step.session)
    expect(Either.isRight(presented)).toBe(true)
    if (Either.isLeft(presented)) return
    const missingActorId = combatantId("missing-demo-actor")

    expect(
      computeWizardBattleScene({
        meta: WIZARD_BATTLE_DEMO_META,
        snapshot: { ...presented.right, currentActorId: missingActorId },
        step,
        stepIndex: 0
      })
    ).toEqual(
      Either.left({
        tag: "battleScenePresentationIssue",
        reason: "missingCurrentActor",
        combatantId: missingActorId
      })
    )
  })

  test("projects fallback metadata, temporary HP, zero maximum HP, and cast-line shapes", () => {
    const step = WIZARD_BATTLE_DEMO_STEPS[0]
    const presented = Either.getOrThrow(battlePresentedSnapshot(step.session))
    const firstCombatant = presented.combatants[0]
    const snapshot = {
      ...presented,
      combatants: [{ ...firstCombatant, hp: Hp(0), maxHp: Hp(0), tempHp: Hp(5) }, ...presented.combatants.slice(1)]
    }

    const withoutMetadata = computeWizardBattleScene({
      meta: { combatants: {}, objectNames: {} },
      snapshot,
      step,
      stepIndex: 0
    })
    expect(Either.getOrThrow(withoutMetadata).layout.creatures[0]?.tempHpBar).not.toBeNull()

    const casterId = presented.currentActorId
    const targetId = presented.combatants.find((combatant) => combatant.combatantId !== casterId)?.combatantId
    if (targetId === undefined) throw new Error("Expected a demo target.")
    const baseSpell = {
      casterId,
      color: "#ffffff",
      name: "Fireball" as const
    }
    const cueSteps = [
      { ...step, cue: { spell: { ...baseSpell, areaCenter: { col: 2, row: 2 }, areaRadiusFeet: 10 } } },
      { ...step, cue: { spell: { ...baseSpell, areaCenter: { col: 2, row: 2 } } } },
      { ...step, cue: { spell: { ...baseSpell, targetId } } },
      { ...step, cue: { spell: baseSpell } }
    ]

    for (const [stepIndex, cueStep] of cueSteps.entries()) {
      expect(
        Either.isRight(
          computeWizardBattleScene({
            meta: WIZARD_BATTLE_DEMO_META,
            snapshot: presented,
            step: cueStep,
            stepIndex
          })
        )
      ).toBe(true)
    }

    expect(
      Either.isRight(
        computeWizardBattleScene({
          meta: { combatants: {}, objectNames: {} },
          snapshot: presented,
          step: { ...step, cue: { spell: { ...baseSpell, targetId } } },
          stepIndex: 0
        })
      )
    ).toBe(true)

    if (firstCombatant.origin.kind === "character") {
      expect(
        Either.isRight(
          computeWizardBattleScene({
            meta: WIZARD_BATTLE_DEMO_META,
            snapshot: {
              ...presented,
              combatants: [
                {
                  ...firstCombatant,
                  origin: { ...firstCombatant.origin, spellcasting: null }
                },
                ...presented.combatants.slice(1)
              ]
            },
            step,
            stepIndex: 0
          })
        )
      ).toBe(true)
    }
  })

  test("carries each canonical MCP envelope frontier into the React scene model", () => {
    const frontierKinds = ["acts", "holes", "interruptDecision"] as const

    for (const frontierKind of frontierKinds) {
      const candidate = WIZARD_BATTLE_DEMO_STEPS.map((step, stepIndex) => ({
        envelope: battlePresentedCheckpointFrontierEnvelope(step.session),
        step,
        stepIndex
      })).find((entry) => Either.isRight(entry.envelope) && entry.envelope.right.frontier.kind === frontierKind)
      if (candidate === undefined || Either.isLeft(candidate.envelope)) {
        throw new Error(`Expected a ${frontierKind} demo frontier.`)
      }

      const mcpProjection = Schema.decodeUnknownEither(AdminSessionProjectionSchema)({
        session: {
          draftIds: [],
          selectedStatBlockId: null,
          battleState: {
            tag: "activeBattle",
            battleId: candidate.envelope.right.checkpoint.battleId,
            currentActorId: candidate.envelope.right.checkpoint.currentActorId
          }
        },
        battle: candidate.envelope.right,
        characters: []
      })
      expect(Either.isRight(mcpProjection)).toBe(true)
      if (Either.isLeft(mcpProjection)) continue
      const battle = mcpProjection.right.battle
      expect(battle).not.toBeNull()
      if (battle === null) continue
      const canonicalEnvelope = Schema.decodeUnknownSync(BattlePresentedCheckpointFrontierEnvelopeSchema)(battle)
      expect(canonicalEnvelope).toEqual(
        Schema.decodeUnknownSync(BattlePresentedCheckpointFrontierEnvelopeSchema)(candidate.envelope.right)
      )

      const scene = computeWizardBattleScene({
        meta: WIZARD_BATTLE_DEMO_META,
        snapshot: candidate.envelope.right.checkpoint,
        step: candidate.step,
        stepIndex: candidate.stepIndex
      })
      expect(Either.isRight(scene)).toBe(true)
    }
  })

  test("executes one Battle through runtime, MCP, and the React-facing model", async () => {
    const cases = await productionBattleConsumerSeam()
    expect(cases.map((candidate) => candidate.kind)).toEqual([
      "acts",
      "holes",
      "rejected",
      "interruptDecision",
      "resolution"
    ])

    for (const [stepIndex, candidate] of cases.entries()) {
      const runtimeEnvelope = candidate.runtimeEnvelope
      expect(runtimeEnvelope, candidate.kind).toEqual(candidate.envelope)

      const canonicalEnvelope = Schema.decodeUnknownSync(BattlePresentedCheckpointFrontierEnvelopeSchema)(
        candidate.envelope
      )
      const operation = jsonRecord(candidate.operationResult)
      const publishedEnvelope =
        candidate.kind === "rejected"
          ? jsonRecord(jsonRecord(operation.details).battleEnvelope)
          : jsonRecord(operation.envelope)
      expect(Schema.decodeUnknownSync(BattlePresentedCheckpointFrontierEnvelopeSchema)(publishedEnvelope)).toEqual(
        canonicalEnvelope
      )

      const scene = computeWizardBattleScene({
        meta: { combatants: {}, objectNames: {} },
        snapshot: canonicalEnvelope.checkpoint,
        step: {
          cue: {},
          detail: candidate.kind,
          session: candidate.runtimeSession,
          title: candidate.kind
        },
        stepIndex
      })
      expect(Either.isRight(scene)).toBe(true)
    }
  })
})

function jsonRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected a record at the MCP seam.")
  }
  return value as Readonly<Record<string, unknown>>
}
