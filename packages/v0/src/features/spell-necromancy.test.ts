import { describe, expect, it } from "vitest";

import {
  BESTOW_CURSE_EXTRA_DAMAGE,
  BESTOW_CURSE_OPTIONS,
  bestowCurseRequiresConcentration,
  chillTouchDamage,
  EYEBITE_CHOICES,
  eyebiteCondition,
  falseLifeTempHp,
  RAISE_DEAD_MAX_DAYS_DEAD,
  RAY_OF_ENFEEBLEMENT_REDUCTION,
  RESURRECTION_D20_PENALTY,
  REVIVE_HP,
  REVIVIFY_MAX_MINUTES_DEAD,
  spareTheDyingRange,
  SPELL_VAMPIRIC_TOUCH,
  vampiricTouchDamage,
  vampiricTouchHeal,
} from "#/features/spell-necromancy.ts";

describe("vampiricTouchDamage", () => {
  it("returns 3d6 with healFraction 0.5 at base level 3", () => {
    expect(vampiricTouchDamage(3)).toEqual({
      dice: 3,
      dieSize: 6,
      healFraction: 0.5,
    });
  });

  it("scales +1d6 per level above 3", () => {
    expect(vampiricTouchDamage(4)).toEqual({
      dice: 4,
      dieSize: 6,
      healFraction: 0.5,
    });
    expect(vampiricTouchDamage(5)).toEqual({
      dice: 5,
      dieSize: 6,
      healFraction: 0.5,
    });
  });
});

describe("vampiricTouchHeal", () => {
  it("returns floor(damage/2)", () => {
    expect(vampiricTouchHeal(10)).toBe(5);
  });

  it("floors odd damage", () => {
    expect(vampiricTouchHeal(11)).toBe(5);
  });

  it("returns 0 for 0 damage", () => {
    expect(vampiricTouchHeal(0)).toBe(0);
  });

  it("returns 0 for 1 damage", () => {
    expect(vampiricTouchHeal(1)).toBe(0);
  });
});

describe("Vampiric Touch metadata", () => {
  it("is L3, necrotic, attackRoll, concentration", () => {
    expect(SPELL_VAMPIRIC_TOUCH.level).toBe(3);
    expect(SPELL_VAMPIRIC_TOUCH.damageType).toBe("necrotic");
    expect(SPELL_VAMPIRIC_TOUCH.pattern).toBe("attackRoll");
    expect(SPELL_VAMPIRIC_TOUCH.concentration).toBe(true);
  });
});

// =============================================================================
// New Necromancy spells
// =============================================================================

describe("False Life", () => {
  it("returns 2d4 + 4 at L1", () => {
    expect(falseLifeTempHp(1)).toEqual({ dice: 2, dieSize: 4, flatBonus: 4 });
  });

  it("scales +5 flat bonus per slot level above 1", () => {
    expect(falseLifeTempHp(2)).toEqual({ dice: 2, dieSize: 4, flatBonus: 9 });
    expect(falseLifeTempHp(3)).toEqual({ dice: 2, dieSize: 4, flatBonus: 14 });
  });
});

describe("Revivify", () => {
  it("target returns with 1 HP", () => {
    expect(REVIVE_HP).toBe(1);
  });

  it("max 1 minute dead", () => {
    expect(REVIVIFY_MAX_MINUTES_DEAD).toBe(1);
  });
});

describe("Raise Dead", () => {
  it("target returns with 1 HP and -4 penalty", () => {
    expect(REVIVE_HP).toBe(1);
    expect(RESURRECTION_D20_PENALTY).toBe(-4);
  });

  it("max 10 days dead", () => {
    expect(RAISE_DEAD_MAX_DAYS_DEAD).toBe(10);
  });
});

describe("Chill Touch", () => {
  it("1d10 at L1, scales at 5/11/17", () => {
    expect(chillTouchDamage(1)).toEqual({ dice: 1, dieSize: 10 });
    expect(chillTouchDamage(5)).toEqual({ dice: 2, dieSize: 10 });
    expect(chillTouchDamage(11)).toEqual({ dice: 3, dieSize: 10 });
    expect(chillTouchDamage(17)).toEqual({ dice: 4, dieSize: 10 });
  });
});

describe("Spare the Dying", () => {
  it("range 15 ft at L1, doubles at 5/11/17", () => {
    expect(spareTheDyingRange(1)).toBe(15);
    expect(spareTheDyingRange(5)).toBe(30);
    expect(spareTheDyingRange(11)).toBe(60);
    expect(spareTheDyingRange(17)).toBe(120);
  });
});

describe("Ray of Enfeeblement", () => {
  it("reduces damage by 1d8", () => {
    expect(RAY_OF_ENFEEBLEMENT_REDUCTION).toEqual({ dice: 1, dieSize: 8 });
  });
});

describe("Bestow Curse", () => {
  it("has 4 curse options", () => {
    expect(BESTOW_CURSE_OPTIONS).toHaveLength(4);
  });

  it("extra damage option is 1d8", () => {
    expect(BESTOW_CURSE_EXTRA_DAMAGE).toEqual({ dice: 1, dieSize: 8 });
  });

  it("requires concentration at L3-L4", () => {
    expect(bestowCurseRequiresConcentration(3)).toBe(true);
    expect(bestowCurseRequiresConcentration(4)).toBe(true);
  });

  it("does not require concentration at L5+", () => {
    expect(bestowCurseRequiresConcentration(5)).toBe(false);
    expect(bestowCurseRequiresConcentration(9)).toBe(false);
  });
});

describe("Eyebite", () => {
  it("has 3 choices: asleep, panicked, sickened", () => {
    expect(EYEBITE_CHOICES).toHaveLength(3);
  });

  it("asleep → unconscious", () => {
    expect(eyebiteCondition("asleep")).toBe("unconscious");
  });

  it("panicked → frightened", () => {
    expect(eyebiteCondition("panicked")).toBe("frightened");
  });

  it("sickened → poisoned", () => {
    expect(eyebiteCondition("sickened")).toBe("poisoned");
  });
});
