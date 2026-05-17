import { snapshotBattle } from "@dnd/battle-runtime"
import { describe, expect, test } from "vitest"

import {
  WIZARD_BATTLE_DEMO_META,
  WIZARD_BATTLE_DEMO_OBJECT_IGNITIONS,
  WIZARD_BATTLE_DEMO_STATE,
  WIZARD_BATTLE_DEMO_STEPS
} from "./wizard-battle-demo.ts"

describe("wizard battle demo", () => {
  test("resolves through promoted Fireball and recursive Counterspell runtime", () => {
    const snapshot = snapshotBattle(WIZARD_BATTLE_DEMO_STATE)
    const mudScamp = snapshot.combatants.find(
      (combatant) => WIZARD_BATTLE_DEMO_META.combatants[combatant.combatantId]?.name === "Mud Scamp"
    )
    const grayElf = snapshot.combatants.find(
      (combatant) => WIZARD_BATTLE_DEMO_META.combatants[combatant.combatantId]?.name === "Gray Elf"
    )
    const ritualWizard = snapshot.combatants.find(
      (combatant) => WIZARD_BATTLE_DEMO_META.combatants[combatant.combatantId]?.name === "Ritual Wizard"
    )

    expect(WIZARD_BATTLE_DEMO_STEPS.map((event) => event.title)).toEqual([
      "Battle joined",
      "Fireball",
      "Counterspell window",
      "Counterspell",
      "Counterspell window",
      "Counterspell",
      "Counterspell window",
      "Counterspell",
      "Counterspell window",
      "Counterspell",
      "Fireball resumes",
      "Damage"
    ])
    expect(WIZARD_BATTLE_DEMO_OBJECT_IGNITIONS).toMatchObject([
      { objectId: "wizard-demo-dry-tapestry", sourceCombatantId: "A" }
    ])
    expect(mudScamp).toMatchObject({ hp: 22, maxHp: 50 })
    expect(grayElf).toMatchObject({ hp: 36, maxHp: 50 })
    expect(ritualWizard).toMatchObject({ hp: 22, maxHp: 50 })
  })
})
