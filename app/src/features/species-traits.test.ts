import { describe, expect, it } from "vitest"

import {
  breathWeaponDice,
  breathWeaponSaveDC,
  canOrcRelentlessEndurance,
  dragonbornDamageResistance,
  dwarvenResilianceDamageType,
  dwarvenToughnessHpBonus,
  feyAncestryAdvantageVsCharmed,
  firesBurnDieSize,
  frostChillDieSize,
  gnomishCunningAdvantage,
  goliathGiantAncestryMaxUses,
  halflingBraveAdvantageVsFrightened,
  halflingLuckyReroll,
  hasDraconicFlight,
  hasHeavyWeaponDisadvantage,
  hasLargeForm,
  hillsTumblePushDistance,
  largeFormSpeedBonus,
  orcAdrenalineRushMaxUses,
  orcAdrenalineRushTempHp,
  stonesEnduranceReduction,
  stormsThunderDieSize
} from "#/features/species-traits.ts"
import { abilityModifier } from "#/types.ts"

// =============================================================================
// T140: Combat Species Traits
// =============================================================================

describe("Heavy Weapon Disadvantage (SRD 5.2.1)", () => {
  const meleeHeavy = { isMelee: true, isHeavy: true }
  const rangedHeavy = { isMelee: false, isHeavy: true }
  const meleeLight = { isMelee: true, isHeavy: false }
  it("melee heavy + STR < 13 → disadvantage", () => {
    expect(hasHeavyWeaponDisadvantage(meleeHeavy, 12, 14)).toBe(true)
  })
  it("melee heavy + STR >= 13 → no disadvantage", () => {
    expect(hasHeavyWeaponDisadvantage(meleeHeavy, 13, 14)).toBe(false)
  })
  it("ranged heavy + DEX < 13 → disadvantage", () => {
    expect(hasHeavyWeaponDisadvantage(rangedHeavy, 14, 12)).toBe(true)
  })
  it("ranged heavy + DEX >= 13 → no disadvantage", () => {
    expect(hasHeavyWeaponDisadvantage(rangedHeavy, 14, 13)).toBe(false)
  })
  it("non-heavy weapon → no disadvantage regardless of scores", () => {
    expect(hasHeavyWeaponDisadvantage(meleeLight, 8, 8)).toBe(false)
  })
})

describe("Dragonborn Breath Weapon", () => {
  it("dice scale: 1d10/2d10/3d10/4d10", () => {
    expect(breathWeaponDice(1)).toBe(1)
    expect(breathWeaponDice(5)).toBe(2)
    expect(breathWeaponDice(11)).toBe(3)
    expect(breathWeaponDice(17)).toBe(4)
  })
  it("save DC = 8 + CON + prof", () => {
    expect(breathWeaponSaveDC(abilityModifier(2), 2)).toBe(12)
    expect(breathWeaponSaveDC(abilityModifier(3), 4)).toBe(15)
  })
  it("Draconic Flight at L5+", () => {
    expect(hasDraconicFlight(5)).toBe(true)
    expect(hasDraconicFlight(4)).toBe(false)
  })
})

describe("Orc traits", () => {
  it("Adrenaline Rush temp HP = prof bonus", () => {
    expect(orcAdrenalineRushTempHp(2)).toBe(2)
    expect(orcAdrenalineRushTempHp(6)).toBe(6)
  })
  it("Adrenaline Rush max uses = prof bonus", () => {
    expect(orcAdrenalineRushMaxUses(3)).toBe(3)
  })
  it("Relentless Endurance: can use if not used", () => {
    expect(canOrcRelentlessEndurance(false)).toBe(true)
    expect(canOrcRelentlessEndurance(true)).toBe(false)
  })
})

describe("Goliath Giant Ancestry", () => {
  it("max uses = prof bonus", () => {
    expect(goliathGiantAncestryMaxUses(2)).toBe(2)
    expect(goliathGiantAncestryMaxUses(6)).toBe(6)
  })
  it("Stone's Endurance: d12 + CON (min 0)", () => {
    expect(stonesEnduranceReduction(8, 3)).toBe(11)
    expect(stonesEnduranceReduction(1, -2)).toBe(0) // min 0
  })
  it("Fire's Burn die = d10", () => {
    expect(firesBurnDieSize()).toBe(10)
  })
  it("Frost's Chill die = d6", () => {
    expect(frostChillDieSize()).toBe(6)
  })
  it("Hill's Tumble push = 15ft", () => {
    expect(hillsTumblePushDistance()).toBe(15)
  })
  it("Storm's Thunder die = d8", () => {
    expect(stormsThunderDieSize()).toBe(8)
  })
  it("Large Form at L5+", () => {
    expect(hasLargeForm(5)).toBe(true)
    expect(hasLargeForm(4)).toBe(false)
  })
  it("Large Form speed bonus = +10", () => {
    expect(largeFormSpeedBonus()).toBe(10)
  })
})

describe("Halfling Lucky", () => {
  it("reroll on nat 1", () => {
    expect(halflingLuckyReroll(1)).toBe(true)
  })
  it("no reroll on other values", () => {
    expect(halflingLuckyReroll(2)).toBe(false)
    expect(halflingLuckyReroll(20)).toBe(false)
  })
})

// =============================================================================
// T141: Species Save/Resistance Modifiers
// =============================================================================

describe("Dwarven Resilience", () => {
  it("Poison resistance", () => {
    expect(dwarvenResilianceDamageType()).toBe("poison")
  })
})

describe("Dwarven Toughness", () => {
  it("HP bonus = character level", () => {
    expect(dwarvenToughnessHpBonus(1)).toBe(1)
    expect(dwarvenToughnessHpBonus(10)).toBe(10)
    expect(dwarvenToughnessHpBonus(20)).toBe(20)
  })
})

describe("Fey Ancestry", () => {
  it("advantage vs Charmed", () => {
    expect(feyAncestryAdvantageVsCharmed()).toBe(true)
  })
})

describe("Gnomish Cunning", () => {
  it("advantage on INT/WIS/CHA saves", () => {
    expect(gnomishCunningAdvantage("int")).toBe(true)
    expect(gnomishCunningAdvantage("wis")).toBe(true)
    expect(gnomishCunningAdvantage("cha")).toBe(true)
  })
  it("no advantage on STR/DEX/CON saves", () => {
    expect(gnomishCunningAdvantage("str")).toBe(false)
    expect(gnomishCunningAdvantage("dex")).toBe(false)
    expect(gnomishCunningAdvantage("con")).toBe(false)
  })
})

describe("Halfling Brave", () => {
  it("advantage vs Frightened", () => {
    expect(halflingBraveAdvantageVsFrightened()).toBe(true)
  })
})

describe("Dragonborn Damage Resistance", () => {
  it("matches ancestry type", () => {
    expect(dragonbornDamageResistance("fire")).toBe("fire")
    expect(dragonbornDamageResistance("cold")).toBe("cold")
    expect(dragonbornDamageResistance("acid")).toBe("acid")
  })
})
