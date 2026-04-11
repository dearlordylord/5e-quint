import { Schema } from "effect";
import { describe, expect, it } from "vitest";

import {
  ControlCommandSchema,
  toBattleInitCreatureConfig,
} from "#/available-actions.ts";
import {
  getMonsterStatBlock,
  GOBLIN_MINION,
  MONSTER_STAT_BLOCK_PROVENANCE,
  monsterCatalogInitCreatureConfig,
  statBlockInitiativeScore,
  statBlockToInitCreatureConfig,
} from "#/monster-catalog.ts";
import { CreatureId, abilityModifier } from "#/types.ts";

describe("monster catalog", () => {
  it("documents the core-owned SRD provenance rules", () => {
    expect(MONSTER_STAT_BLOCK_PROVENANCE.defaultSource).toBe(
      ".references/srd-5.2.1/",
    );
    expect(MONSTER_STAT_BLOCK_PROVENANCE.researchOnlySources).toContain(
      "research-only",
    );
    expect(MONSTER_STAT_BLOCK_PROVENANCE.quintFixtures).toContain(
      "MBT/proof fixtures",
    );
  });

  it("stores Goblin Minion as an SRD-backed stat block", () => {
    const statBlock = getMonsterStatBlock("goblinMinion");

    expect(statBlock.name).toBe("Goblin Minion");
    expect(statBlock.creatureType).toBe("fey");
    expect(statBlock.descriptiveTags).toEqual(["Goblinoid"]);
    expect(statBlock.creatureSize).toBe("small");
    expect(statBlock.ac).toBe(12);
    expect(statBlock.initiativeMod).toBe(2);
    expect(statBlock.maxHp).toBe(7);
    expect(statBlock.hitDice).toBe(2);
    expect(statBlock.hitDieType).toBe(6);
    expect(statBlock.speeds.walk).toBe(30);
    expect(statBlock.abilityScores).toEqual({
      str: 8,
      dex: 15,
      con: 10,
      int: 10,
      wis: 8,
      cha: 8,
    });
    expect([...statBlock.saveProficiencies]).toEqual(["dex"]);
    expect(statBlock.skillBonuses.stealth).toBe(6);
    expect(statBlock.passivePerception).toBe(9);
    expect(statBlock.languages).toEqual(["Common", "Goblin"]);
    expect(statBlock.gear).toEqual(["Daggers (3)"]);
    expect(statBlock.cr).toEqual({ type: "CR_Eighth" });
    expect(statBlock.proficiencyBonus).toBe(2);
    expect(statBlock.attacks.dagger).toEqual({
      name: "Dagger",
      attackBonus: 4,
      reach: 5,
      rangeNormal: 20,
      rangeLong: 60,
      damageAmount: 4,
      damageType: "piercing",
      isRanged: false,
      attackMode: "meleeOrRanged",
    });
  });

  it("projects a catalog stat block into battle init without MCP-owned RAW literals", () => {
    const config = monsterCatalogInitCreatureConfig({
      id: CreatureId("goblin-1"),
      statBlockId: "goblinMinion",
    });

    expect(config).toMatchObject({
      id: CreatureId("goblin-1"),
      kind: "Monster",
      maxHp: 7,
      creatureSize: "small",
      dexMod: 2,
      baseWalkSpeed: 30,
      initiativeRoll: 12,
    });
    expect(config.legendaryActions).toBeUndefined();
    expect(config.legendaryResistances).toBeUndefined();
  });

  it("uses the stat block Initiative entry, not Dexterity mod, for no-roll init fallback", () => {
    const synthetic = {
      ...GOBLIN_MINION,
      initiativeMod: abilityModifier(12),
      abilityScores: {
        ...GOBLIN_MINION.abilityScores,
        dex: 10,
      },
    };

    expect(statBlockInitiativeScore(synthetic)).toBe(22);
    const config = statBlockToInitCreatureConfig({
      id: CreatureId("dragon-1"),
      statBlock: synthetic,
    });
    expect(config.dexMod).toBe(0);
    expect(config.initiativeRoll).toBe(22);
  });

  it("accepts statBlockId on BATTLE_INIT and resolves it through the core catalog", () => {
    const command = Schema.decodeSync(ControlCommandSchema)({
      scope: "battle",
      type: "BATTLE_INIT",
      creatures: [
        {
          id: "goblin-1",
          kind: "Monster",
          statBlockId: "goblinMinion",
        },
      ],
    });

    expect(command.type).toBe("BATTLE_INIT");
    if (command.type !== "BATTLE_INIT") throw new Error("expected BATTLE_INIT");
    const config = toBattleInitCreatureConfig(command.creatures[0]);

    expect(config).toMatchObject({
      id: CreatureId("goblin-1"),
      kind: "Monster",
      maxHp: 7,
      creatureSize: "small",
      dexMod: 2,
      baseWalkSpeed: 30,
      initiativeRoll: 12,
    });
  });
});
