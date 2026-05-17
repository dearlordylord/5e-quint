import { snapshotBattle } from "@dnd/battle-runtime"
import { describe, expect, test } from "vitest"

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
})
