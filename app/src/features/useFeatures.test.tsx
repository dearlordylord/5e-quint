// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { createActor } from "xstate"

import type { FeatureConfig } from "#/features/feature-store.ts"
import { useFeatures } from "#/features/useFeatures.ts"
import type { DndSnapshot } from "#/machine.ts"
import { dndMachine } from "#/machine.ts"
import type { DndEvent } from "#/machine-types.ts"

const FIGHTER_L5: FeatureConfig = { className: "fighter", level: 5 }
const BARBARIAN_L5: FeatureConfig = { className: "barbarian", level: 5 }
const WIZARD_L5: FeatureConfig = { className: "wizard", level: 5 }

function makeSnapshot(input = { maxHp: 20 }): DndSnapshot {
  const actor = createActor(dndMachine, { input })
  actor.start()
  const snap = actor.getSnapshot()
  actor.stop()
  return snap
}

function makeActingSnapshot(): DndSnapshot {
  const actor = createActor(dndMachine, { input: { maxHp: 20 } })
  actor.start()
  actor.send({ type: "ENTER_COMBAT" })
  actor.send({
    type: "START_TURN",
    baseSpeed: 30,
    armorPenalty: 0,
    extraAttacks: 1,
    callerSpeedModifier: 0,
    isGrappling: false,
    grappledTargetTwoSizesSmaller: false,
    startOfTurnEffects: []
  })
  const snap = actor.getSnapshot()
  actor.stop()
  return snap
}

describe("useFeatures", () => {
  describe("initial state", () => {
    it("fighter config has correct charges", () => {
      const snap = makeSnapshot()
      const { result } = renderHook(() => useFeatures(FIGHTER_L5, snap))
      expect(result.current.featureState.fighter).toBeDefined()
      expect(result.current.featureState.fighter!.secondWindCharges).toBe(3)
      expect(result.current.featureState.fighter!.secondWindMax).toBe(3)
    })

    it("non-fighter config has no fighter state", () => {
      const snap = makeSnapshot()
      const { result } = renderHook(() => useFeatures(WIZARD_L5, snap))
      expect(result.current.featureState.fighter).toBeUndefined()
      expect(result.current.canSecondWind).toBe(false)
    })

    it("null snapshot disables canSecondWind", () => {
      const { result } = renderHook(() => useFeatures(FIGHTER_L5, null))
      expect(result.current.canSecondWind).toBe(false)
    })
  })

  describe("notify", () => {
    it("SHORT_REST restores one charge", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(FIGHTER_L5, snap))

      // Use a charge first
      act(() => result.current.dispatch({ type: "FIGHTER_USE_SECOND_WIND" }))
      expect(result.current.featureState.fighter!.secondWindCharges).toBe(2)

      // Short rest restores 1
      act(() => result.current.notify({ type: "SHORT_REST", conMod: 2, hdRolls: [] } as DndEvent))
      expect(result.current.featureState.fighter!.secondWindCharges).toBe(3)
    })

    it("LONG_REST restores all charges", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(FIGHTER_L5, snap))

      // Use all charges
      act(() => {
        result.current.dispatch({ type: "FIGHTER_USE_SECOND_WIND" })
        result.current.dispatch({ type: "FIGHTER_USE_SECOND_WIND" })
        result.current.dispatch({ type: "FIGHTER_USE_SECOND_WIND" })
      })
      expect(result.current.featureState.fighter!.secondWindCharges).toBe(0)

      act(() => result.current.notify({ type: "LONG_REST", totalHitDice: 5 } as DndEvent))
      expect(result.current.featureState.fighter!.secondWindCharges).toBe(3)
    })

    it("irrelevant events are ignored", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(FIGHTER_L5, snap))

      act(() => result.current.notify({ type: "HEAL", amount: 5 } as DndEvent))
      expect(result.current.featureState.fighter!.secondWindCharges).toBe(3)
    })

    it("START_TURN is handled without error", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(FIGHTER_L5, snap))

      act(() =>
        result.current.notify({
          type: "START_TURN",
          baseSpeed: 30,
          armorPenalty: 0,
          extraAttacks: 1,
          callerSpeedModifier: 0,
          isGrappling: false,
          grappledTargetTwoSizesSmaller: false,
          startOfTurnEffects: []
        } as DndEvent)
      )
      // START_TURN is a no-op for fighter Second Wind — charges unchanged
      expect(result.current.featureState.fighter!.secondWindCharges).toBe(3)
    })
  })

  describe("secondWind", () => {
    it("returns BridgeResult with correct events", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(FIGHTER_L5, snap))

      let bridgeResult: ReturnType<typeof result.current.secondWind>
      act(() => {
        bridgeResult = result.current.secondWind(7)
      })
      expect(bridgeResult!).not.toBeNull()
      expect(bridgeResult!.featureAction).toEqual({ type: "FIGHTER_USE_SECOND_WIND" })
      expect(bridgeResult!.machineEvents).toHaveLength(2)
      expect(bridgeResult!.machineEvents[0].type).toBe("USE_BONUS_ACTION")
      expect(bridgeResult!.machineEvents[1].type).toBe("HEAL")
    })

    it("decrements charges after call", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(FIGHTER_L5, snap))

      act(() => {
        result.current.secondWind(5)
      })
      expect(result.current.featureState.fighter!.secondWindCharges).toBe(2)
    })

    it("still returns result when charges are 0 (caller must check canSecondWind)", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(FIGHTER_L5, snap))

      // Exhaust all charges
      act(() => {
        result.current.dispatch({ type: "FIGHTER_USE_SECOND_WIND" })
        result.current.dispatch({ type: "FIGHTER_USE_SECOND_WIND" })
        result.current.dispatch({ type: "FIGHTER_USE_SECOND_WIND" })
      })
      expect(result.current.canSecondWind).toBe(false)

      // Calling secondWind without checking canSecondWind still produces a result
      // (the guard is the caller's responsibility via canSecondWind)
      let bridgeResult: ReturnType<typeof result.current.secondWind>
      act(() => {
        bridgeResult = result.current.secondWind(5)
      })
      expect(bridgeResult!).not.toBeNull()
      // Charges go negative — this is expected (caller should have checked canSecondWind)
      expect(result.current.featureState.fighter!.secondWindCharges).toBe(-1)
    })

    it("returns null when snapshot is null", () => {
      const { result } = renderHook(() => useFeatures(FIGHTER_L5, null))

      let bridgeResult: ReturnType<typeof result.current.secondWind>
      act(() => {
        bridgeResult = result.current.secondWind(5)
      })
      expect(bridgeResult!).toBeNull()
    })
  })

  describe("canSecondWind reactivity", () => {
    it("becomes false after all charges used", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(FIGHTER_L5, snap))

      expect(result.current.canSecondWind).toBe(true)
      act(() => {
        result.current.dispatch({ type: "FIGHTER_USE_SECOND_WIND" })
        result.current.dispatch({ type: "FIGHTER_USE_SECOND_WIND" })
        result.current.dispatch({ type: "FIGHTER_USE_SECOND_WIND" })
      })
      expect(result.current.canSecondWind).toBe(false)
    })

    it("restores after short rest", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(FIGHTER_L5, snap))

      act(() => {
        result.current.dispatch({ type: "FIGHTER_USE_SECOND_WIND" })
        result.current.dispatch({ type: "FIGHTER_USE_SECOND_WIND" })
        result.current.dispatch({ type: "FIGHTER_USE_SECOND_WIND" })
      })
      expect(result.current.canSecondWind).toBe(false)

      act(() => result.current.notify({ type: "SHORT_REST", conMod: 2, hdRolls: [] } as DndEvent))
      expect(result.current.canSecondWind).toBe(true)
    })
  })

  describe("resetToInitial", () => {
    it("restores charges to initial values", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(FIGHTER_L5, snap))

      act(() => {
        result.current.dispatch({ type: "FIGHTER_USE_SECOND_WIND" })
        result.current.dispatch({ type: "FIGHTER_USE_SECOND_WIND" })
      })
      expect(result.current.featureState.fighter!.secondWindCharges).toBe(1)

      act(() => result.current.resetToInitial())
      expect(result.current.featureState.fighter!.secondWindCharges).toBe(3)
    })
  })

  describe("dispatch (undo/redo support)", () => {
    it("external dispatch decrements charges", () => {
      const snap = makeSnapshot()
      const { result } = renderHook(() => useFeatures(FIGHTER_L5, snap))

      act(() => result.current.dispatch({ type: "FIGHTER_USE_SECOND_WIND" }))
      expect(result.current.featureState.fighter!.secondWindCharges).toBe(2)
    })
  })

  describe("actionSurge", () => {
    it("returns BridgeResult with GRANT_EXTRA_ACTION", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(FIGHTER_L5, snap))

      let bridgeResult: ReturnType<typeof result.current.actionSurge>
      act(() => {
        bridgeResult = result.current.actionSurge()
      })
      expect(bridgeResult!).not.toBeNull()
      expect(bridgeResult!.machineEvents).toHaveLength(1)
      expect(bridgeResult!.machineEvents[0].type).toBe("GRANT_EXTRA_ACTION")
      expect(bridgeResult!.featureAction).toEqual({ type: "FIGHTER_USE_ACTION_SURGE" })
    })

    it("canActionSurge becomes false after use", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(FIGHTER_L5, snap))

      expect(result.current.canActionSurge).toBe(true)
      act(() => {
        result.current.actionSurge()
      })
      expect(result.current.canActionSurge).toBe(false)
    })

    it("canActionSurge resets after START_TURN (usedThisTurn)", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(FIGHTER_L5, snap))

      // Use action surge (sets usedThisTurn, but L5 fighter only has 1 charge so charges also drops to 0)
      // We need to test the usedThisTurn reset specifically. Use dispatch to set usedThisTurn without consuming charge.
      act(() => result.current.dispatch({ type: "FIGHTER_USE_ACTION_SURGE" }))
      expect(result.current.featureState.fighter!.actionSurgeUsedThisTurn).toBe(true)

      // Notify START_TURN resets usedThisTurn
      act(() =>
        result.current.notify({
          type: "START_TURN",
          baseSpeed: 30,
          armorPenalty: 0,
          extraAttacks: 1,
          callerSpeedModifier: 0,
          isGrappling: false,
          grappledTargetTwoSizesSmaller: false,
          startOfTurnEffects: []
        } as DndEvent)
      )
      expect(result.current.featureState.fighter!.actionSurgeUsedThisTurn).toBe(false)
    })

    it("charges restore after short rest", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(FIGHTER_L5, snap))

      act(() => result.current.dispatch({ type: "FIGHTER_USE_ACTION_SURGE" }))
      expect(result.current.featureState.fighter!.actionSurgeCharges).toBe(0)

      act(() => result.current.notify({ type: "SHORT_REST", conMod: 2, hdRolls: [] } as DndEvent))
      expect(result.current.featureState.fighter!.actionSurgeCharges).toBe(1)
    })
  })
})

describe("useFeatures — barbarian", () => {
  describe("initial state", () => {
    it("barbarian config has correct charges", () => {
      const snap = makeSnapshot()
      const { result } = renderHook(() => useFeatures(BARBARIAN_L5, snap))
      expect(result.current.featureState.barbarian).toBeDefined()
      expect(result.current.featureState.barbarian!.rageCharges).toBe(3)
      expect(result.current.isRaging).toBe(false)
      expect(result.current.canCastSpells).toBe(true)
    })
  })

  describe("enter rage", () => {
    it("enter rage sets isRaging true and decrements charges", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(BARBARIAN_L5, snap))

      expect(result.current.canEnterRage).toBe(true)
      act(() => {
        result.current.enterRage()
      })
      expect(result.current.isRaging).toBe(true)
      expect(result.current.featureState.barbarian!.rageCharges).toBe(2)
      expect(result.current.canCastSpells).toBe(false)
    })
  })

  describe("end turn — rage maintenance", () => {
    it("end turn without marking attack → rage ends", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(BARBARIAN_L5, snap))

      act(() => {
        result.current.enterRage()
      })
      expect(result.current.isRaging).toBe(true)

      // End turn without marking attack
      act(() => {
        result.current.notify({
          type: "END_TURN",
          endOfTurnSaves: [],
          endOfTurnDamage: []
        } as DndEvent)
      })
      expect(result.current.isRaging).toBe(false)
    })

    it("end turn after marking attack → rage continues", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(BARBARIAN_L5, snap))

      act(() => {
        result.current.enterRage()
      })
      act(() => {
        result.current.markAttackOrSave()
      })
      act(() => {
        result.current.notify({
          type: "END_TURN",
          endOfTurnSaves: [],
          endOfTurnDamage: []
        } as DndEvent)
      })
      expect(result.current.isRaging).toBe(true)
    })
  })

  describe("extend rage with BA", () => {
    it("extend rage with BA → bonus action consumed via machine event", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(BARBARIAN_L5, snap))

      act(() => {
        result.current.enterRage()
      })

      let bridgeResult: ReturnType<typeof result.current.extendRageBA>
      act(() => {
        bridgeResult = result.current.extendRageBA()
      })
      expect(bridgeResult!).not.toBeNull()
      expect(bridgeResult!.machineEvents).toHaveLength(1)
      expect(bridgeResult!.machineEvents[0].type).toBe("USE_BONUS_ACTION")
    })
  })

  describe("reckless attack", () => {
    it("declare reckless → recklessThisTurn true", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(BARBARIAN_L5, snap))

      expect(result.current.canDeclareReckless).toBe(true)
      act(() => {
        result.current.declareReckless()
      })
      expect(result.current.featureState.barbarian!.recklessThisTurn).toBe(true)
      expect(result.current.canDeclareReckless).toBe(false)
    })

    it("reckless resets at start turn", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(BARBARIAN_L5, snap))

      act(() => {
        result.current.declareReckless()
      })
      expect(result.current.featureState.barbarian!.recklessThisTurn).toBe(true)

      act(() => {
        result.current.notify({
          type: "START_TURN",
          baseSpeed: 30,
          armorPenalty: 0,
          extraAttacks: 1,
          callerSpeedModifier: 0,
          isGrappling: false,
          grappledTargetTwoSizesSmaller: false,
          startOfTurnEffects: []
        } as DndEvent)
      })
      expect(result.current.featureState.barbarian!.recklessThisTurn).toBe(false)
    })
  })

  describe("rage resistances and damage bonus", () => {
    it("rageResistances returns B/P/S when raging", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(BARBARIAN_L5, snap))

      act(() => {
        result.current.enterRage()
      })
      expect(result.current.rageResistances.has("bludgeoning")).toBe(true)
      expect(result.current.rageResistances.has("piercing")).toBe(true)
      expect(result.current.rageResistances.has("slashing")).toBe(true)
    })

    it("rageDamageBonus is +2 at L5 when raging", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(BARBARIAN_L5, snap))

      act(() => {
        result.current.enterRage()
      })
      expect(result.current.rageDamageBonus).toBe(2)
    })

    it("rageDamageBonus is 0 when not raging", () => {
      const snap = makeActingSnapshot()
      const { result } = renderHook(() => useFeatures(BARBARIAN_L5, snap))
      expect(result.current.rageDamageBonus).toBe(0)
    })
  })
})
