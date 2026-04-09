import { describe, expect, it } from "vitest";

import { getSpellDamageDice } from "#/features/spell-dice-lookup.ts";

describe("getSpellDamageDice", () => {
  it("fireball at L3", () => {
    expect(getSpellDamageDice("fireball", 3)).toEqual({ dice: 8, dieSize: 6 });
  });

  it("fireball upcast at L5", () => {
    expect(getSpellDamageDice("fireball", 5)).toEqual({ dice: 10, dieSize: 6 });
  });

  it("burning hands at L1", () => {
    expect(getSpellDamageDice("burning_hands", 1)).toEqual({
      dice: 3,
      dieSize: 6,
    });
  });

  it("burning hands upcast at L3", () => {
    expect(getSpellDamageDice("burning_hands", 3)).toEqual({
      dice: 5,
      dieSize: 6,
    });
  });

  it("guiding bolt at L1", () => {
    expect(getSpellDamageDice("guiding_bolt", 1)).toEqual({
      dice: 4,
      dieSize: 6,
    });
  });

  it("inflict wounds at L1", () => {
    expect(getSpellDamageDice("inflict_wounds", 1)).toEqual({
      dice: 2,
      dieSize: 10,
    });
  });

  it("spirit guardians at L3", () => {
    expect(getSpellDamageDice("spirit_guardians", 3)).toEqual({
      dice: 3,
      dieSize: 8,
    });
  });

  it("chromatic orb at L1", () => {
    expect(getSpellDamageDice("chromatic_orb", 1)).toEqual({
      dice: 3,
      dieSize: 8,
    });
  });

  it("spiritual weapon at L2", () => {
    expect(getSpellDamageDice("spiritual_weapon", 2)).toEqual({
      dice: 1,
      dieSize: 8,
    });
  });

  it("moonbeam at L2", () => {
    expect(getSpellDamageDice("moonbeam", 2)).toEqual({ dice: 2, dieSize: 10 });
  });

  it("ice knife at L1", () => {
    expect(getSpellDamageDice("ice_knife", 1)).toEqual({ dice: 2, dieSize: 6 });
  });

  it("phantasmal killer at L4", () => {
    expect(getSpellDamageDice("phantasmal_killer", 4)).toEqual({
      dice: 4,
      dieSize: 10,
    });
  });

  it("vampiric touch at L3", () => {
    expect(getSpellDamageDice("vampiric_touch", 3)).toMatchObject({
      dice: 3,
      dieSize: 6,
    });
  });

  it("call lightning at L3", () => {
    expect(getSpellDamageDice("call_lightning", 3)).toEqual({
      dice: 3,
      dieSize: 10,
    });
  });

  it("heat metal at L2", () => {
    expect(getSpellDamageDice("heat_metal", 2)).toEqual({
      dice: 2,
      dieSize: 8,
    });
  });

  it("mind spike at L2", () => {
    expect(getSpellDamageDice("mind_spike", 2)).toEqual({
      dice: 3,
      dieSize: 8,
    });
  });

  it("returns null for non-damaging spell", () => {
    expect(getSpellDamageDice("hold_person", 2)).toBeNull();
  });

  it("returns null for counterspell", () => {
    expect(getSpellDamageDice("counterspell", 3)).toBeNull();
  });

  it("returns null for unknown spell", () => {
    expect(getSpellDamageDice("unknown_spell", 1)).toBeNull();
  });

  it("returns null when slotLvl < 1", () => {
    expect(getSpellDamageDice("fireball", 0)).toBeNull();
  });
});
