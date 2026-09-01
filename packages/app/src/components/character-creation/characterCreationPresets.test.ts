import { PHASE1_WEAPON_MASTERY_UNIT_IDS } from "@dnd/character-creation-runtime"
import { unitId as authoredUnitId } from "@dnd/shared/game-facts"
import { describe, expect, it } from "vitest"

import { FIGHTER_EXAMPLE_DRAFT } from "./characterCreationPresets.ts"
import { assessCharacterDraft } from "./characterCreationRuntime.ts"

describe("character creation presets", () => {
  it("retains the Fighter preset's authored Weapon Mastery selections", () => {
    const assessment = assessCharacterDraft(FIGHTER_EXAMPLE_DRAFT)
    expect(assessment.finalization.tag).toBe("ready")
    if (assessment.finalization.tag !== "ready") return

    const weaponMasteryUnitIds = new Set(PHASE1_WEAPON_MASTERY_UNIT_IDS)
    const selectedWeaponMasteryUnitIds = assessment.finalization.build.features.flatMap((feature) =>
      feature.kind === "selectedClassChoice" && weaponMasteryUnitIds.has(feature.unitId) ? [feature.unitId] : []
    )

    expect(selectedWeaponMasteryUnitIds).toEqual([
      authoredUnitId("weapon_longsword"),
      authoredUnitId("weapon_dagger"),
      authoredUnitId("weapon_shortsword")
    ])
  })
})
