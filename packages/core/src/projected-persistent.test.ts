import { describe, expect, it } from "vitest";
import { createActor } from "xstate";

import { battleMachine } from "#/battle-machine.ts";
import {
  addActiveProjectedPersistent,
  applyProjectedDonArmor,
  battleCurrentArmorClass,
  canonicalizeActiveProjectedPersistents,
  removeActiveProjectedPersistentsOnTrigger,
} from "#/projected-persistent.ts";
import { armorClass, CreatureId } from "#/types.ts";

const MAGE_ARMOR_RECORD = {
  tag: "PPRSetBaseAc" as const,
  value: {
    source: {
      unitId: "mage_armor",
      unitKind: "PUKSpell" as const,
      unitName: "Mage Armor",
    },
    attachment: "PPAChosenTarget" as const,
    baseArmorClass: 13,
    abilityModifier: "dex" as const,
    earlyEnds: ["PPEETargetDonsArmor"] as const,
  },
};

describe("projected persistent battle state", () => {
  it("applies Mage Armor AC from the active projected record", () => {
    const creature = {
      id: CreatureId("mage"),
      maxHp: 20,
      kind: "PC" as const,
      dexMod: 2,
      baseArmorClass: armorClass(12),
      activeProjectedPersistents: addActiveProjectedPersistent(new Set(), {
        record: MAGE_ARMOR_RECORD,
        casterId: CreatureId("mage"),
        targetId: CreatureId("mage"),
      }),
    };

    const actor = createActor(battleMachine);
    actor.start();
    actor.send({ type: "BATTLE_INIT", creatures: [creature] });

    const mage = actor.getSnapshot().context.creatures.get(CreatureId("mage"));
    expect(mage).toBeDefined();
    expect(battleCurrentArmorClass(mage!)).toBe(15);
  });

  it("ends Mage Armor early when the target dons armor", () => {
    const actor = createActor(battleMachine);
    actor.start();
    actor.send({
      type: "BATTLE_INIT",
      creatures: [
        {
          id: CreatureId("mage"),
          maxHp: 20,
          kind: "PC",
          dexMod: 2,
          baseArmorClass: armorClass(12),
          activeProjectedPersistents: addActiveProjectedPersistent(
            new Set(),
            {
              record: MAGE_ARMOR_RECORD,
              casterId: CreatureId("mage"),
              targetId: CreatureId("mage"),
            },
          ),
        },
      ],
    });

    const mage = actor.getSnapshot().context.creatures.get(CreatureId("mage"));
    expect(mage).toBeDefined();
    const armoredMage = applyProjectedDonArmor(
      CreatureId("mage"),
      mage!,
      armorClass(16),
    );
    expect(armoredMage.isWearingArmor).toBe(true);
    expect(armoredMage.activeProjectedPersistents.size).toBe(0);
    expect(battleCurrentArmorClass(armoredMage)).toBe(16);
  });

  it("removes only matching triggered persistents for the target", () => {
    const targetMageArmor = {
      record: MAGE_ARMOR_RECORD,
      casterId: CreatureId("caster"),
      targetId: CreatureId("target"),
    };
    const otherMageArmor = {
      record: MAGE_ARMOR_RECORD,
      casterId: CreatureId("caster"),
      targetId: CreatureId("other"),
    };

    const active = new Set([targetMageArmor, otherMageArmor]);
    const remaining = removeActiveProjectedPersistentsOnTrigger(
      active,
      "PEETTargetDonsArmor",
      CreatureId("target"),
    );

    expect(remaining).toEqual(new Set([otherMageArmor]));
  });

  it("canonicalizes away Mage Armor when the creature is already wearing armor", () => {
    const active = addActiveProjectedPersistent(new Set(), {
      record: MAGE_ARMOR_RECORD,
      casterId: CreatureId("mage"),
      targetId: CreatureId("mage"),
    });

    expect(
      canonicalizeActiveProjectedPersistents({
        active,
        isWearingArmor: true,
      }).size,
    ).toBe(0);
  });
});
