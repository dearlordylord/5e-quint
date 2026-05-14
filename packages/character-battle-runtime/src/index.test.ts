// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.martial-arts-attack-projection unit-feature.weapon-mastery-sap spell.invocation-marked-damage-rider
import type {
  BattleFill,
  BattleCreatureState,
  BattleHole,
  CharacterBattleResourceState,
  CharacterBattleSpellcastingState,
} from "@dnd/battle-runtime";
import {
  battleCombatantSide,
  battleId,
  characterBattleResourceForUnit,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
} from "@dnd/battle-runtime";
import {
  abilityScoreAssignment,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  classUnitId,
  eldritchInvocationId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import {
  characterSheetPactSlots,
  characterSheetSpellSlots,
  characterSheetId,
  characterSheetTempHp,
  createFreshCharacterSheet as createFreshCharacterSheetCore,
  type CharacterSheetInput,
} from "@dnd/character-sheet-runtime";
import { currentArmorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { elapsedTimeTicks } from "@dnd/shared/elapsed-time";
import {
  Hp,
  abilityModifier,
  DieRollResult,
  proficiencyBonus,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import {
  applyBattleHandoffToCharacterSheet,
  battleCreatureInitFromCharacterBuild,
  characterArmorClassState,
  characterBattleResourceInitsFromBuild,
  characterSpellcasting,
  startBattleFromCharacterBuildAndStatBlock,
} from "./index.ts";

const build = defenseBuild({ wearingArmor: false });

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error("Character battle runtime test Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;
const statBlockCatalog = statBlockCatalogResult.catalog;

function createFreshCharacterSheet(
  input: Omit<CharacterSheetInput, "conditions"> &
    Partial<Pick<CharacterSheetInput, "conditions">>,
) {
  return createFreshCharacterSheetCore({
    conditions: [],
    ...input,
  });
}

describe("Character Sheet battle handoff", () => {
  test("rejects mismatched battle character identity", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:sheet"),
      build,
      maximumHp: Hp(10),
      currentHp: Hp(10),
      tempHp: Hp(0),
      unitLibrary,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = applyBattleHandoffToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:battle"),
        },
      }),
    });

    expect(Either.isLeft(handoff)).toBe(true);
  });

  test("rejects handoff maximum HP drift from the existing Character Sheet", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:sheet"),
      build,
      maximumHp: Hp(10),
      currentHp: Hp(10),
      tempHp: Hp(0),
      unitLibrary,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = applyBattleHandoffToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:sheet"),
        },
        hp: Hp(10),
        maxHp: Hp(12),
      }),
    });

    expect(Either.isLeft(handoff)).toBe(true);
  });

  test("preserves remaining Temporary Hit Points from battle handoff", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:sheet"),
      build,
      maximumHp: Hp(10),
      currentHp: Hp(10),
      tempHp: Hp(0),
      unitLibrary,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = applyBattleHandoffToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:sheet"),
        },
        hp: Hp(8),
        maxHp: Hp(10),
        tempHp: Hp(4),
        positiveHpUnconscious: null,
      }),
    });

    expect(Either.isRight(handoff)).toBe(true);
    if (Either.isRight(handoff)) {
      expect(characterSheetTempHp(handoff.right)).toBe(4);
    }
  });

  test("rejects stable battle handoff when the sheet has in-progress Stable recovery time", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:stable"),
      build,
      maximumHp: Hp(10),
      currentHp: Hp(0),
      tempHp: Hp(0),
      unitLibrary,
      zeroHpLifecycle: {
        tag: "stable",
        recovery: {
          kind: "regains1HpAfter1d4Hours",
          elapsedBeforeRecoveryRoll: elapsedTimeTicks(1),
        },
      },
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = applyBattleHandoffToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:stable"),
        },
        hp: Hp(0),
        maxHp: Hp(10),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
        zeroHpLifecycle: {
          policy: "usesDeathSavingThrows",
          deathSaves: {
            deathSaves: { successes: 0, failures: 0 },
            stable: true,
            dead: false,
            hpRegained: false,
          },
        },
      }),
    });

    expect(Either.isLeft(handoff)).toBe(true);
  });

  test("preserves non-battle sheet state while settling battle-owned HP and Spell Slots", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:rest-state"),
      build: wizardWarlockBuild(),
      maximumHp: Hp(10),
      currentHp: Hp(10),
      tempHp: Hp(0),
      unitLibrary,
      spentHitDice: [{ classUnitId: "class_wizard", spent: resourceCount(1) }],
      spellSlots: [
        {
          spellLevel: spellSlotLevel(1),
          count: resourceCount(2),
          expended: resourceCount(1),
        },
      ],
      pactSlots: {
        slotLevel: spellSlotLevel(1),
        count: resourceCount(1),
        expended: resourceCount(1),
      },
      restFeatureUses: [{ tag: "arcaneRecovery", usedSinceLongRest: true }],
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = applyBattleHandoffToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:rest-state"),
          spellcasting: handoffSpellcastingState(),
        },
        hp: Hp(6),
        maxHp: Hp(10),
        tempHp: Hp(3),
        positiveHpUnconscious: null,
      }),
    });

    const settled = expectRight(handoff);
    expect(settled.spentHitDice).toEqual([
      { classUnitId: "class_wizard", spent: 1 },
    ]);
    expect(settled.restFeatureUses).toEqual([
      { tag: "arcaneRecovery", usedSinceLongRest: true },
    ]);
    expect(characterSheetPactSlots(settled)).toEqual({
      slotLevel: 1,
      count: 1,
      expended: 1,
    });
    expect(characterSheetSpellSlots(settled)).toEqual([
      { spellLevel: 1, count: 2, expended: 2 },
    ]);
    expect(characterSheetTempHp(settled)).toBe(3);
  });

  test("preserves sheet-owned healing resource expenditures", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:paladin-handoff"),
      build: paladinBuild(),
      maximumHp: Hp(12),
      currentHp: Hp(12),
      tempHp: Hp(0),
      unitLibrary,
      resourceExpenditures: [
        { tag: "layOnHandsHealingPool", expended: resourceCount(3) },
      ],
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const handoff = applyBattleHandoffToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:paladin-handoff"),
        },
        hp: Hp(9),
        maxHp: Hp(12),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    const settled = expectRight(handoff);
    expect(settled.resourceExpenditures).toEqual([
      { tag: "layOnHandsHealingPool", expended: 3 },
    ]);
  });

  test("persists Favored Enemy free-cast spends for the next battle before Long Rest", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:ranger-handoff"),
      build: favoredEnemyRangerResourceBuild(),
      maximumHp: Hp(12),
      currentHp: Hp(12),
      tempHp: Hp(0),
      unitLibrary,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const favoredEnemy = unitLibrary.requireUnit("ranger_favored_enemy");
    const favoredEnemyResource = characterBattleResourceForUnit(favoredEnemy);
    expect(favoredEnemyResource.cap.kind).toBe("fixed");
    if (favoredEnemyResource.cap.kind !== "fixed") return;
    const limitedFavoredEnemyResource =
      favoredEnemyResource as CharacterBattleResourceState["resource"] & {
        readonly cap: { readonly kind: "fixed" };
      };
    const handoff = applyBattleHandoffToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:ranger-handoff"),
          resources: [
            {
              unit: favoredEnemy,
              resource: limitedFavoredEnemyResource,
              usedThisTurn: false,
              usesRemaining: resourceCount(1),
            },
          ],
        },
        hp: Hp(12),
        maxHp: Hp(12),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    const settled = expectRight(handoff);
    expect(settled.resourceExpenditures).toEqual([
      { tag: "favoredEnemyHuntersMarkFreeCasts", expended: 1 },
    ]);

    const nextBattleResources = expectRight(
      characterBattleResourceInitsFromBuild(
        settled.build,
        unitLibrary,
        settled.resourceExpenditures,
      ),
    );

    expect(nextBattleResources).toContainEqual(
      expect.objectContaining({
        unit: favoredEnemy,
        usesRemaining: 1,
      }),
    );
  });

  test("rejects Favored Enemy battle handoff when free-cast cap shape is unsupported", () => {
    const sheet = createFreshCharacterSheet({
      characterId: characterSheetId("character:ranger-handoff-scaling"),
      build: favoredEnemyRangerResourceBuild(),
      maximumHp: Hp(12),
      currentHp: Hp(12),
      tempHp: Hp(0),
      unitLibrary,
    });
    expect(Either.isRight(sheet)).toBe(true);
    if (Either.isLeft(sheet)) return;

    const favoredEnemy = unitLibrary.requireUnit("ranger_favored_enemy");
    const favoredEnemyResource = characterBattleResourceForUnit(favoredEnemy);
    const handoff = applyBattleHandoffToCharacterSheet({
      sheet: sheet.right,
      unitLibrary,
      combatant: handoffBranchCombatant({
        origin: {
          kind: "character",
          characterId: characterId("character:ranger-handoff-scaling"),
          resources: [
            {
              unit: favoredEnemy,
              resource: {
                ...favoredEnemyResource,
                cap: {
                  kind: "threshold_tiers",
                  axis: "class",
                  base: 2,
                  tiers: [{ atLevel: 5, value: 3 }],
                },
              },
              usedThisTurn: false,
              usesRemaining: resourceCount(1),
            },
          ],
        },
        hp: Hp(12),
        maxHp: Hp(12),
        tempHp: Hp(0),
        positiveHpUnconscious: null,
      }),
    });

    expect(handoff).toEqual(
      Either.left({
        tag: "characterSheetBattleHandoffIssue",
        message:
          "Favored Enemy Hunter's Mark free casts must use a fixed battle resource cap during battle handoff.",
      }),
    );
  });
});

describe("Character Build battle projection", () => {
  test("applies Defense Armor Class bonus while wearing eligible armor", () => {
    const armorClass = expectRight(
      characterArmorClassState({
        build: defenseBuild({ wearingArmor: true }),
        unitLibrary,
      }),
    );

    expect(currentArmorClass(armorClass)).toBe(17);
    expect(armorClass.bonuses).toContainEqual({
      kind: "wearing_armor",
      bonus: 1,
      categories: ["light", "medium", "heavy"],
      sourceUnitId: "defense",
    });
  });

  test("does not apply Defense Armor Class bonus when no eligible armor is worn", () => {
    const armorClass = expectRight(
      characterArmorClassState({
        build: defenseBuild({ wearingArmor: false }),
        unitLibrary,
      }),
    );

    expect(currentArmorClass(armorClass)).toBe(12);
    expect(armorClass.bonuses).toContainEqual({
      kind: "wearing_armor",
      bonus: 1,
      categories: ["light", "medium", "heavy"],
      sourceUnitId: "defense",
    });
  });

  test("threads selected Armor Class base choice through battle initialization", () => {
    const init = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("barbarian-monk"),
        characterId: characterId("character:barbarian-monk"),
        displayName: "Barbarian Monk",
        build: multiclassUnarmoredDefenseBuild(),
        initiative: initiativeScore(10),
        side: battleCombatantSide("party"),
        unitLibrary,
        armorClassBaseChoice: {
          kind: "class_feature",
          unitId: "monk_unarmored_defense",
        },
      }),
    );

    expect(init.creatureInit.kind).toBe("character");
    if (init.creatureInit.kind !== "character") return;
    expect(init.creatureInit.armorClass.base).toMatchObject({
      source: "unarmored_defense",
      sourceUnitId: "monk_unarmored_defense",
    });
    expect(currentArmorClass(init.creatureInit.armorClass)).toBe(15);
  });

  test("does not project sheet-owned charge-pool resources into battle init", () => {
    const init = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("fighter-lay-on-hands"),
        characterId: characterId("character:fighter-lay-on-hands"),
        displayName: "Fighter With Sheet Resource",
        build: fighterWithLayOnHandsResourceBuild(),
        initiative: initiativeScore(10),
        side: battleCombatantSide("party"),
        unitLibrary,
      }),
    );

    expect(init.creatureInit.kind).toBe("character");
    if (init.creatureInit.kind !== "character") return;
    expect(
      (init.creatureInit.resources ?? []).map((resource) => resource.unit.id),
    ).not.toContain("paladin_lay_on_hands");
  });

  test("threads build weapon proficiencies into True Strike discovery", () => {
    const casterId = combatantId("true-strike-wizard");
    const targetId = combatantId("true-strike-target");
    const state = expectRight(
      startBattleFromCharacterBuildAndStatBlock({
        battleId: battleId("character-battle-true-strike"),
        character: {
          combatantId: casterId,
          characterId: characterId("character:true-strike-wizard"),
          displayName: "True Strike Wizard",
          build: trueStrikeWizardBuild(),
          initiative: initiativeScore(20),
          side: battleCombatantSide("party"),
        },
        statBlockBattleInput: {
          combatantId: targetId,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: initiativeScore(10),
          side: battleCombatantSide("monsters"),
        },
        unitLibrary,
      }),
    );

    const trueStrike = discoverBattleActs(state).find(
      (act) => act.label === "True Strike (Dagger)",
    );

    expect(trueStrike?.subject).toMatchObject({
      tag: "actionSpell",
      actorId: casterId,
      componentWeaponItemId: trueStrikeDaggerItemId(),
    });
    expect(trueStrike?.summary).toBe(
      "Cast True Strike as a cantrip using Dagger.",
    );
    expect(
      trueStrike?.initialHoles.find((hole) => hole.kind === "targetChoice"),
    ).toMatchObject({ choices: [targetId] });
  });

  test("projects Favored Enemy Hunter's Mark as feature-prepared Spell Access", () => {
    const spellcasting = expectRight(
      characterSpellcasting({
        build: favoredEnemyRangerBuild(),
        unitLibrary,
      }),
    );

    expect(spellcasting.preparedSpells).toEqual([]);
    expect(spellcasting.featurePreparedSpells).toEqual([
      {
        sourceUnitId: "ranger_favored_enemy",
        spell: unitLibrary.requireUnit("hunters_mark"),
      },
    ]);
  });

  test("does not promote unrelated passive prepared Spell Access during Favored Enemy projection", () => {
    const spellcasting = expectRight(
      characterSpellcasting({
        build: druidDruidicBuild(),
        unitLibrary,
      }),
    );

    expect(spellcasting.preparedSpells).toEqual([]);
    expect(spellcasting.featurePreparedSpells).toEqual([]);
  });

  test("projects selected Weapon Mastery Sap into battle attack behavior", () => {
    const fighterId = combatantId("weapon-mastery-fighter");
    const targetId = combatantId("weapon-mastery-target");
    const state = expectRight(
      startBattleFromCharacterBuildAndStatBlock({
        battleId: battleId("character-battle-weapon-mastery-sap"),
        character: {
          combatantId: fighterId,
          characterId: characterId("character:weapon-mastery-fighter"),
          displayName: "Weapon Mastery Fighter",
          build: weaponMasteryLongswordFighterBuild(),
          initiative: initiativeScore(20),
          side: battleCombatantSide("party"),
        },
        statBlockBattleInput: {
          combatantId: targetId,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: initiativeScore(10),
          side: battleCombatantSide("monsters"),
        },
        unitLibrary,
      }),
    );
    const fighter = state.combatants.get(fighterId);
    expect(fighter?.origin).toMatchObject({
      kind: "character",
      weaponMasteries: [{ weaponUnitId: "weapon_longsword" }],
      characterUnitRefs: expect.arrayContaining([
        {
          unitId: "mastery_sap",
          supportProfiles: ["weaponMasterySap"],
        },
      ]),
    });

    const subject = {
      tag: "action" as const,
      actorId: fighterId,
      action: "attack" as const,
      attackName: "Longsword",
    };
    const meleeReachFact = {
      kind: "attackTargetInMeleeReach" as const,
      actorId: fighterId,
      targetId,
      attackName: "Longsword",
    };
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, targetId, [meleeReachFact])],
      }),
      "attackRoll",
    );
    const damageRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, targetId, [meleeReachFact]),
          attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    const hit = requireResolvedBattleSubject(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, targetId, [meleeReachFact]),
          attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
          rolledDiceFill(damageRoll, 1),
        ],
      }),
    );

    expect(hit.state.combatants.get(targetId)?.activeEffects).toContainEqual({
      kind: "nextAttackRollBySelf",
      sourceUnitId: "mastery_sap",
      sourceCombatantId: fighterId,
      mode: "disadvantage",
      expiresAt: { kind: "startOfTurn", combatantId: fighterId },
    });
  });

  test("projects Martial Arts d6 and Dexterity for eligible unarmed and Monk weapon attacks", () => {
    const init = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("martial-arts-dagger"),
        characterId: characterId("character:martial-arts-dagger"),
        displayName: "Martial Arts Dagger Monk",
        build: monkBuild({ weaponUnitId: "weapon_dagger", str: 12, dex: 16 }),
        initiative: initiativeScore(10),
        side: battleCombatantSide("party"),
        unitLibrary,
      }),
    );

    expect(init.creatureInit.kind).toBe("character");
    if (init.creatureInit.kind !== "character") return;
    expect(init.creatureInit.attack).toMatchObject({
      kind: "weapon",
      ability: "dex",
      abilityModifier: abilityModifier(3),
      damageAbilityModifier: abilityModifier(3),
      weapon: { id: "weapon_dagger", damage: { dice: 1, dieSize: 6 } },
    });
    expect(init.creatureInit.unarmedStrike).toMatchObject({
      kind: "unarmedStrike",
      attackAbility: "dex",
      attackAbilityModifier: abilityModifier(3),
      attackBonus: 5,
      damageAbilityModifier: abilityModifier(3),
      effect: {
        damage: {
          kind: "authoredReplacement",
          sourceUnitId: "monk_martial_arts",
          dice: 1,
          dieSize: 6,
        },
      },
    });
  });

  test("projects Pact of the Blade onto the bonded melee weapon only", () => {
    const build = pactBladeInvocationBuild("weapon_longsword");
    const bondedItemId = build.equipment.loadout.weapon?.itemId;
    if (bondedItemId === undefined) {
      throw new Error("Expected Pact of the Blade test weapon.");
    }
    const init = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("pact-blade-longsword"),
        characterId: characterId("character:pact-blade-longsword"),
        displayName: "Pact Blade Character",
        build,
        initiative: initiativeScore(10),
        side: battleCombatantSide("party"),
        unitLibrary,
        pactBladeBondedWeaponItemId: bondedItemId,
      }),
    );

    expect(init.creatureInit.kind).toBe("character");
    if (init.creatureInit.kind !== "character") return;
    expect(init.creatureInit.attack).toMatchObject({
      kind: "weapon",
      ability: "str",
      abilityModifier: abilityModifier(-1),
      attackBonus: 1,
      damageAbilityModifier: abilityModifier(-1),
      alternateAbilityChoices: [
        {
          ability: "cha",
          abilityModifier: abilityModifier(3),
          attackBonus: 5,
          damageAbilityModifier: abilityModifier(3),
        },
      ],
      damageTypeChoices: ["slashing", "necrotic", "psychic", "radiant"],
      weapon: { id: "weapon_longsword" },
    });
  });

  test("keeps Pact of the Blade Charisma selectable when the normal ability is better", () => {
    const build = pactBladeInvocationBuild("weapon_longsword", {
      str: 18,
      cha: 14,
    });
    const bondedItemId = build.equipment.loadout.weapon?.itemId;
    if (bondedItemId === undefined) {
      throw new Error("Expected Pact of the Blade test weapon.");
    }
    const init = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("pact-blade-stronger-strength"),
        characterId: characterId("character:pact-blade-stronger-strength"),
        displayName: "Strong Pact Blade Character",
        build,
        initiative: initiativeScore(10),
        side: battleCombatantSide("party"),
        unitLibrary,
        pactBladeBondedWeaponItemId: bondedItemId,
      }),
    );

    expect(init.creatureInit.kind).toBe("character");
    if (init.creatureInit.kind !== "character") return;
    expect(init.creatureInit.attack).toMatchObject({
      kind: "weapon",
      ability: "str",
      abilityModifier: abilityModifier(4),
      attackBonus: 6,
      damageAbilityModifier: abilityModifier(4),
      alternateAbilityChoices: [
        {
          ability: "cha",
          abilityModifier: abilityModifier(2),
          attackBonus: 4,
          damageAbilityModifier: abilityModifier(2),
        },
      ],
      damageTypeChoices: ["slashing", "necrotic", "psychic", "radiant"],
    });
  });

  test("applies selected Pact of the Blade alternate damage in Attack action damage", () => {
    const actorId = combatantId("pact-blade-necrotic-attacker");
    const targetId = combatantId("pact-blade-necrotic-target");
    const build = pactBladeInvocationBuild("weapon_longsword");
    const bondedItemId = build.equipment.loadout.weapon?.itemId;
    if (bondedItemId === undefined) {
      throw new Error("Expected Pact of the Blade test weapon.");
    }
    const state = expectRight(
      startBattleFromCharacterBuildAndStatBlock({
        battleId: battleId("pact-blade-necrotic-attack"),
        character: {
          combatantId: actorId,
          characterId: characterId("character:pact-blade-necrotic-attacker"),
          displayName: "Pact Blade Character",
          build,
          initiative: initiativeScore(20),
          side: battleCombatantSide("party"),
          pactBladeBondedWeaponItemId: bondedItemId,
        },
        statBlockBattleInput: {
          combatantId: targetId,
          statBlock: statBlockCatalog.requireStatBlock(
            "stat_block_goblin_warrior",
          ),
          initiative: initiativeScore(10),
          side: battleCombatantSide("monsters"),
        },
        unitLibrary,
      }),
    );
    const attackName = "Longsword (Charisma) (necrotic)";
    const subject = {
      tag: "action" as const,
      actorId,
      action: "attack" as const,
      attackName,
    };
    const meleeReachFact = {
      kind: "attackTargetInMeleeReach" as const,
      actorId,
      targetId,
      attackName,
    };
    expect(
      discoverBattleActs(state).map((act) =>
        "attackName" in act.subject ? act.subject.attackName : undefined,
      ),
    ).toEqual(
      expect.arrayContaining([
        "Longsword (slashing)",
        "Longsword (necrotic)",
        "Longsword (psychic)",
        "Longsword (radiant)",
        "Longsword (Charisma) (slashing)",
        "Longsword (Charisma) (necrotic)",
        "Longsword (Charisma) (psychic)",
        "Longsword (Charisma) (radiant)",
      ]),
    );
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFill(target, targetId, [meleeReachFact])],
      }),
      "attackRoll",
    );
    const damageRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, targetId, [meleeReachFact]),
          attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    expect(damageRoll.label).toBe(
      "Longsword (Charisma) (necrotic) damage (1d8+3-necrotic)",
    );
    const hit = requireResolvedBattleSubject(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFill(target, targetId, [meleeReachFact]),
          attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
          rolledDiceFill(damageRoll, 1),
        ],
      }),
    );

    expect(hit.state.combatants.get(targetId)?.hp).toBe(Hp(6));
  });

  test("applies selected Pact of the Blade alternate damage for a bonded off-hand weapon", () => {
    const actorId = combatantId("pact-blade-offhand-attacker");
    const targetId = combatantId("pact-blade-offhand-target");
    const build = pactBladeInvocationBuild("weapon_shortsword", {
      offHandWeaponUnitId: "weapon_dagger",
    });
    const bondedItemId = build.equipment.loadout.offHandWeapon?.itemId;
    if (bondedItemId === undefined) {
      throw new Error("Expected Pact of the Blade off-hand test weapon.");
    }
    const state = expectRight(
      startBattleFromCharacterBuildAndStatBlock({
        battleId: battleId("pact-blade-offhand-radiant-attack"),
        character: {
          combatantId: actorId,
          characterId: characterId("character:pact-blade-offhand-attacker"),
          displayName: "Pact Blade Off-Hand Character",
          build,
          initiative: initiativeScore(20),
          side: battleCombatantSide("party"),
          pactBladeBondedWeaponItemId: bondedItemId,
        },
        statBlockBattleInput: {
          combatantId: targetId,
          statBlock: statBlockCatalog.requireStatBlock(
            "stat_block_goblin_warrior",
          ),
          initiative: initiativeScore(10),
          side: battleCombatantSide("monsters"),
        },
        unitLibrary,
      }),
    );
    const mainAttackName = "Shortsword";
    const mainSubject = {
      tag: "action" as const,
      actorId,
      action: "attack" as const,
      attackName: mainAttackName,
    };
    const mainTarget = requireHole(
      resolveBattleSubject({ state, subject: mainSubject, fills: [] }),
      "targetChoice",
    );
    const mainRoll = requireHole(
      resolveBattleSubject({
        state,
        subject: mainSubject,
        fills: [
          targetFill(mainTarget, targetId, [
            {
              kind: "attackTargetInMeleeReach" as const,
              actorId,
              targetId,
              attackName: mainAttackName,
            },
          ]),
        ],
      }),
      "attackRoll",
    );
    const afterMainAttack = requireResolvedBattleSubject(
      resolveBattleSubject({
        state,
        subject: mainSubject,
        fills: [
          targetFill(mainTarget, targetId, [
            {
              kind: "attackTargetInMeleeReach" as const,
              actorId,
              targetId,
              attackName: mainAttackName,
            },
          ]),
          attackRollFill(mainRoll, { total: 1, naturalD20: 1 }),
        ],
      }),
    ).state;

    const offHandAttackName = "Dagger (Charisma) (radiant)";
    const offHandSubject = {
      tag: "bonusAction" as const,
      actorId,
      action: "offHandAttack" as const,
      attackName: offHandAttackName,
    };
    expect(
      discoverBattleActs(afterMainAttack).map((act) =>
        "attackName" in act.subject ? act.subject.attackName : undefined,
      ),
    ).toEqual(
      expect.arrayContaining([
        "Dagger (piercing)",
        "Dagger (radiant)",
        "Dagger (Charisma) (piercing)",
        offHandAttackName,
      ]),
    );
    const offHandTarget = requireHole(
      resolveBattleSubject({
        state: afterMainAttack,
        subject: offHandSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const offHandRoll = requireHole(
      resolveBattleSubject({
        state: afterMainAttack,
        subject: offHandSubject,
        fills: [
          targetFill(offHandTarget, targetId, [
            {
              kind: "attackTargetInMeleeReach" as const,
              actorId,
              targetId,
              attackName: offHandAttackName,
            },
          ]),
        ],
      }),
      "attackRoll",
    );
    const offHandDamage = requireHole(
      resolveBattleSubject({
        state: afterMainAttack,
        subject: offHandSubject,
        fills: [
          targetFill(offHandTarget, targetId, [
            {
              kind: "attackTargetInMeleeReach" as const,
              actorId,
              targetId,
              attackName: offHandAttackName,
            },
          ]),
          attackRollFill(offHandRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    expect(offHandDamage.label).toBe(
      "Dagger (Charisma) (radiant) damage (1d4-radiant)",
    );
    const offHandHit = requireResolvedBattleSubject(
      resolveBattleSubject({
        state: afterMainAttack,
        subject: offHandSubject,
        fills: [
          targetFill(offHandTarget, targetId, [
            {
              kind: "attackTargetInMeleeReach" as const,
              actorId,
              targetId,
              attackName: offHandAttackName,
            },
          ]),
          attackRollFill(offHandRoll, { total: 15, naturalD20: 10 }),
          rolledDiceFill(offHandDamage, 4),
        ],
      }),
    );
    expect(offHandHit.state.combatants.get(targetId)?.hp).toBe(Hp(6));
  });

  test("keeps non-bonded Pact of the Blade weapons as ordinary attacks", () => {
    const meleeBuild = pactBladeInvocationBuild("weapon_longsword");
    const meleeInit = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("pact-blade-unbonded"),
        characterId: characterId("character:pact-blade-unbonded"),
        displayName: "Unbonded Blade Warlock",
        build: meleeBuild,
        initiative: initiativeScore(10),
        side: battleCombatantSide("party"),
        unitLibrary,
      }),
    );

    expect(meleeInit.creatureInit.kind).toBe("character");
    if (meleeInit.creatureInit.kind !== "character") return;
    expect(meleeInit.creatureInit.attack).toMatchObject({
      kind: "weapon",
      ability: "str",
      abilityModifier: abilityModifier(-1),
    });
    expect(meleeInit.creatureInit.attack).not.toHaveProperty(
      "damageTypeChoices",
    );
  });

  test("rejects impossible Pact of the Blade bond inputs", () => {
    const noInvocationBuild = pactBladeInvocationBuild("weapon_longsword", {
      pactOfTheBlade: false,
    });
    const noInvocationItemId =
      noInvocationBuild.equipment.loadout.weapon?.itemId;
    if (noInvocationItemId === undefined) {
      throw new Error("Expected Pact of the Blade test weapon.");
    }
    expect(
      Either.isLeft(
        battleCreatureInitFromCharacterBuild({
          combatantId: combatantId("pact-blade-no-invocation"),
          characterId: characterId("character:pact-blade-no-invocation"),
          displayName: "No Invocation Character",
          build: noInvocationBuild,
          initiative: initiativeScore(10),
          side: battleCombatantSide("party"),
          unitLibrary,
          pactBladeBondedWeaponItemId: noInvocationItemId,
        }),
      ),
    ).toBe(true);

    const rangedBuild = pactBladeInvocationBuild("weapon_shortbow");
    const rangedItemId = rangedBuild.equipment.loadout.weapon?.itemId;
    if (rangedItemId === undefined) {
      throw new Error("Expected Pact of the Blade ranged test weapon.");
    }
    expect(
      Either.isLeft(
        battleCreatureInitFromCharacterBuild({
          combatantId: combatantId("pact-blade-shortbow"),
          characterId: characterId("character:pact-blade-shortbow"),
          displayName: "Ranged Blade Character",
          build: rangedBuild,
          initiative: initiativeScore(10),
          side: battleCombatantSide("party"),
          unitLibrary,
          pactBladeBondedWeaponItemId: rangedItemId,
        }),
      ),
    ).toBe(true);

    const arbitraryItemId = characterEquipmentItemId({
      slot: "main",
      unitId: expectRight(characterEquipmentItemUnitId("weapon_dagger")),
    });
    expect(
      Either.isLeft(
        battleCreatureInitFromCharacterBuild({
          combatantId: combatantId("pact-blade-not-loadout"),
          characterId: characterId("character:pact-blade-not-loadout"),
          displayName: "Invalid Bond Character",
          build: pactBladeInvocationBuild("weapon_longsword"),
          initiative: initiativeScore(10),
          side: battleCombatantSide("party"),
          unitLibrary,
          pactBladeBondedWeaponItemId: arbitraryItemId,
        }),
      ),
    ).toBe(true);
  });

  test("keeps non-melee Pact of the Blade weapons ordinary when no bond is supplied", () => {
    const rangedInit = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("pact-blade-shortbow"),
        characterId: characterId("character:pact-blade-shortbow"),
        displayName: "Ranged Blade Warlock",
        build: pactBladeInvocationBuild("weapon_shortbow"),
        initiative: initiativeScore(10),
        side: battleCombatantSide("party"),
        unitLibrary,
      }),
    );

    expect(rangedInit.creatureInit.kind).toBe("character");
    if (rangedInit.creatureInit.kind !== "character") return;
    expect(rangedInit.creatureInit.attack).toMatchObject({
      kind: "weapon",
      ability: "str",
      abilityModifier: abilityModifier(-1),
      weapon: { id: "weapon_shortbow" },
    });
    expect(rangedInit.creatureInit.attack).not.toHaveProperty(
      "damageTypeChoices",
    );
  });

  test("keeps Martial Arts Dexterity projection above the d6 die slice", () => {
    const init = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("martial-arts-level-five"),
        characterId: characterId("character:martial-arts-level-five"),
        displayName: "Experienced Monk",
        build: monkBuild({
          level: 5,
          weaponUnitId: "weapon_dagger",
          str: 12,
          dex: 16,
        }),
        initiative: initiativeScore(10),
        side: battleCombatantSide("party"),
        unitLibrary,
      }),
    );

    expect(init.creatureInit.kind).toBe("character");
    if (init.creatureInit.kind !== "character") return;
    expect(init.creatureInit.attack).toMatchObject({
      kind: "weapon",
      ability: "dex",
      abilityModifier: abilityModifier(3),
      damageAbilityModifier: abilityModifier(3),
      weapon: { id: "weapon_dagger", damage: { dice: 1, dieSize: 4 } },
    });
    expect(init.creatureInit.unarmedStrike).toMatchObject({
      kind: "unarmedStrike",
      attackAbility: "dex",
      attackAbilityModifier: abilityModifier(3),
      damageAbilityModifier: abilityModifier(3),
      effect: {
        damage: {
          kind: "base",
          flat: 1,
        },
      },
    });
  });

  test("keeps Strength when it is the better Martial Arts attack and damage choice", () => {
    const init = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("martial-arts-strength"),
        characterId: characterId("character:martial-arts-strength"),
        displayName: "Strength Monk",
        build: monkBuild({ weaponUnitId: "weapon_dagger", str: 16, dex: 12 }),
        initiative: initiativeScore(10),
        side: battleCombatantSide("party"),
        unitLibrary,
      }),
    );

    expect(init.creatureInit.kind).toBe("character");
    if (init.creatureInit.kind !== "character") return;
    expect(init.creatureInit.attack).toMatchObject({
      kind: "weapon",
      ability: "str",
      abilityModifier: abilityModifier(3),
      damageAbilityModifier: abilityModifier(3),
      weapon: { damage: { dice: 1, dieSize: 6 } },
    });
    expect(init.creatureInit.unarmedStrike).toMatchObject({
      attackAbility: "str",
      attackAbilityModifier: abilityModifier(3),
      attackBonus: 5,
      damageAbilityModifier: abilityModifier(3),
    });
  });

  test("requires unarmored unshielded loadouts that wield only Monk weapons", () => {
    const shielded = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("martial-arts-shield"),
        characterId: characterId("character:martial-arts-shield"),
        displayName: "Shielded Monk",
        build: monkBuild({
          weaponUnitId: "weapon_dagger",
          shield: true,
          str: 12,
          dex: 16,
        }),
        initiative: initiativeScore(10),
        side: battleCombatantSide("party"),
        unitLibrary,
      }),
    );
    const longsword = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("martial-arts-longsword"),
        characterId: characterId("character:martial-arts-longsword"),
        displayName: "Longsword Monk",
        build: monkBuild({
          weaponUnitId: "weapon_longsword",
          str: 12,
          dex: 16,
        }),
        initiative: initiativeScore(10),
        side: battleCombatantSide("party"),
        unitLibrary,
      }),
    );
    const mixed = expectRight(
      battleCreatureInitFromCharacterBuild({
        combatantId: combatantId("martial-arts-mixed"),
        characterId: characterId("character:martial-arts-mixed"),
        displayName: "Mixed Weapon Monk",
        build: monkBuild({
          weaponUnitId: "weapon_dagger",
          offHandWeaponUnitId: "weapon_longsword",
          str: 12,
          dex: 16,
        }),
        initiative: initiativeScore(10),
        side: battleCombatantSide("party"),
        unitLibrary,
      }),
    );

    for (const init of [shielded, longsword, mixed]) {
      expect(init.creatureInit.kind).toBe("character");
      if (init.creatureInit.kind !== "character") return;
      expect(init.creatureInit.attack).toMatchObject({
        kind: "weapon",
        ability: "str",
        abilityModifier: abilityModifier(1),
      });
      expect(init.creatureInit.unarmedStrike.effect.damage).toEqual({
        kind: "base",
        damageType: "bludgeoning",
        flat: 1,
      });
    }
  });

  test("keeps Martial Arts Dexterity in Grapple and Shove save DCs above the d6 die slice", () => {
    const monkId = combatantId("martial-arts-grappler");
    const targetId = combatantId("martial-arts-grapple-target");
    const state = expectRight(
      startBattleFromCharacterBuildAndStatBlock({
        battleId: battleId("martial-arts-grapple-dc"),
        character: {
          combatantId: monkId,
          characterId: characterId("character:martial-arts-grappler"),
          displayName: "Grappling Monk",
          build: monkBuild({ level: 5, str: 12, dex: 16 }),
          initiative: initiativeScore(20),
          side: battleCombatantSide("party"),
        },
        statBlockBattleInput: {
          combatantId: targetId,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: initiativeScore(10),
          side: battleCombatantSide("monsters"),
        },
        unitLibrary,
      }),
    );
    const grappleSubject = {
      tag: "action" as const,
      actorId: monkId,
      action: "grapple" as const,
    };
    const grappleTarget = requireHole(
      resolveBattleSubject({ state, subject: grappleSubject, fills: [] }),
      "targetChoice",
    );
    const grappleOutcome = requireHole(
      resolveBattleSubject({
        state,
        subject: grappleSubject,
        fills: [
          targetFill(grappleTarget, targetId, [
            { kind: "grappleTargetWithinReach", grapplerId: monkId, targetId },
          ]),
        ],
      }),
      "grappleOutcome",
    );
    const shoveSubject = {
      tag: "action" as const,
      actorId: monkId,
      action: "shove" as const,
    };
    const shoveTarget = requireHole(
      resolveBattleSubject({ state, subject: shoveSubject, fills: [] }),
      "targetChoice",
    );
    const shoveOutcome = requireHole(
      resolveBattleSubject({
        state,
        subject: shoveSubject,
        fills: [
          targetFill(shoveTarget, targetId, [
            { kind: "shoveTargetWithinReach", shoverId: monkId, targetId },
          ]),
        ],
      }),
      "shoveOutcome",
    );

    expect(grappleOutcome.dc).toBe(14);
    expect(shoveOutcome.dc).toBe(14);
  });
});

function monkBuild(input: {
  readonly level?: number;
  readonly weaponUnitId?: string;
  readonly offHandWeaponUnitId?: string;
  readonly armor?: boolean;
  readonly shield?: boolean;
  readonly str: number;
  readonly dex: number;
}): CharacterBuild {
  const weaponItemId =
    input.weaponUnitId === undefined
      ? undefined
      : characterEquipmentItemId({
          slot: "main",
          unitId: expectRight(characterEquipmentItemUnitId(input.weaponUnitId)),
        });
  const offHandWeaponItemId =
    input.offHandWeaponUnitId === undefined
      ? undefined
      : characterEquipmentItemId({
          slot: "off",
          unitId: expectRight(
            characterEquipmentItemUnitId(input.offHandWeaponUnitId),
          ),
        });
  const armorItemId =
    input.armor === true
      ? characterEquipmentItemId({
          slot: "armor",
          unitId: expectRight(characterEquipmentItemUnitId("armor_leather")),
        })
      : undefined;
  const shieldItemId =
    input.shield === true
      ? characterEquipmentItemId({
          slot: "shield",
          unitId: expectRight(characterEquipmentItemUnitId("equipment_shield")),
        })
      : undefined;

  return {
    progression: {
      startingClass: classUnitId("class_monk"),
      advancements: Array.from(
        { length: Math.max(0, (input.level ?? 1) - 1) },
        () => ({
          classUnitId: classUnitId("class_monk"),
          hitPointRule: { tag: "fixedHigherLevelGain" as const },
        }),
      ),
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: input.str,
        dex: input.dex,
        con: 13,
        int: 8,
        wis: 16,
        cha: 10,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    equipment: {
      owned: [
        ...(weaponItemId === undefined || input.weaponUnitId === undefined
          ? []
          : [{ itemId: weaponItemId, unitId: input.weaponUnitId }]),
        ...(offHandWeaponItemId === undefined ||
        input.offHandWeaponUnitId === undefined
          ? []
          : [
              {
                itemId: offHandWeaponItemId,
                unitId: input.offHandWeaponUnitId,
              },
            ]),
        ...(armorItemId === undefined
          ? []
          : [{ itemId: armorItemId, unitId: "armor_leather" }]),
        ...(shieldItemId === undefined
          ? []
          : [{ itemId: shieldItemId, unitId: "equipment_shield" }]),
      ],
      loadout: {
        ...(weaponItemId === undefined
          ? {}
          : { weapon: { itemId: weaponItemId, grip: "one_handed" as const } }),
        ...(offHandWeaponItemId === undefined
          ? {}
          : { offHandWeapon: { itemId: offHandWeaponItemId } }),
        ...(armorItemId === undefined ? {} : { armor: armorItemId }),
        ...(shieldItemId === undefined ? {} : { shield: shieldItemId }),
      },
    },
  };
}

function pactBladeInvocationBuild(
  weaponUnitId: CharacterBuild["equipment"]["owned"][number]["unitId"],
  input: {
    readonly offHandWeaponUnitId?: CharacterBuild["equipment"]["owned"][number]["unitId"];
    readonly str?: number;
    readonly cha?: number;
    readonly pactOfTheBlade?: boolean;
  } = {},
): CharacterBuild {
  const weaponItemId = characterEquipmentItemId({
    slot: "main",
    unitId: expectRight(characterEquipmentItemUnitId(weaponUnitId)),
  });
  const offHandWeaponItemId =
    input.offHandWeaponUnitId === undefined
      ? undefined
      : characterEquipmentItemId({
          slot: "off",
          unitId: expectRight(
            characterEquipmentItemUnitId(input.offHandWeaponUnitId),
          ),
        });
  return {
    progression: {
      startingClass: classUnitId("class_fighter"),
      advancements: [],
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: input.str ?? 8,
        dex: 12,
        con: 13,
        int: 10,
        wis: 10,
        cha: input.cha ?? 16,
      }),
    ),
    proficiencyChoices: [],
    features:
      input.pactOfTheBlade === false
        ? []
        : [
            {
              kind: "selectedEldritchInvocation",
              selectedFromUnitId: "warlock_eldritch_invocations",
              invocationId: eldritchInvocationId("pact_of_the_blade"),
            },
          ],
    equipment: {
      owned: [
        { itemId: weaponItemId, unitId: weaponUnitId },
        ...(input.offHandWeaponUnitId === undefined ||
        offHandWeaponItemId === undefined
          ? []
          : [
              {
                itemId: offHandWeaponItemId,
                unitId: input.offHandWeaponUnitId,
              },
            ]),
      ],
      loadout: {
        weapon: {
          itemId: weaponItemId,
          grip: "one_handed",
        },
        ...(offHandWeaponItemId === undefined
          ? {}
          : {
              offHandWeapon: {
                itemId: offHandWeaponItemId,
              },
            }),
      },
    },
  };
}

function requireHole<K extends BattleHole["kind"]>(
  result: ReturnType<typeof resolveBattleSubject>,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles result, got ${result.tag}.`);
  }
  const hole = result.holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function requireResolvedBattleSubject(
  result: ReturnType<typeof resolveBattleSubject>,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved result, got ${result.tag}.`);
  }
  return result;
}

function targetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  targetId: ReturnType<typeof combatantId>,
  spatialFacts: Extract<
    BattleFill,
    { readonly kind: "targetChoice" }
  >["spatialFacts"] = [],
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    ...(spatialFacts.length === 0 ? {} : { spatialFacts }),
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: { readonly total: number; readonly naturalD20: number },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
    },
  };
}

function rolledDiceFill(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  value: number,
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [{ results: [DieRollResult(value)] }],
  };
}

function multiclassUnarmoredDefenseBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId("class_barbarian"),
      advancements: [
        {
          classUnitId: classUnitId("class_monk"),
          hitPointRule: { tag: "fixedHigherLevelGain" },
        },
      ],
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 13,
        dex: 14,
        con: 13,
        int: 8,
        wis: 16,
        cha: 10,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    equipment: {
      owned: [],
      loadout: {},
    },
  };
}

function defenseBuild(input: {
  readonly wearingArmor: boolean;
}): CharacterBuild {
  const armorItemId = characterEquipmentItemId({
    slot: "armor",
    unitId: expectRight(characterEquipmentItemUnitId("armor_chain_mail")),
  });

  return {
    progression: {
      startingClass: classUnitId("class_fighter"),
      advancements: [],
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 15,
        dex: 14,
        con: 13,
        int: 8,
        wis: 10,
        cha: 12,
      }),
    ),
    proficiencyChoices: [],
    features: [
      {
        selectedFromUnitId: "fighter_fighting_style",
        kind: "selectedClassChoice",
        unitId: "defense",
      },
    ],
    equipment: {
      owned: [{ itemId: armorItemId, unitId: "armor_chain_mail" }],
      loadout: input.wearingArmor ? { armor: armorItemId } : {},
    },
  };
}

function weaponMasteryLongswordFighterBuild(): CharacterBuild {
  const longswordItemId = characterEquipmentItemId({
    slot: "main",
    unitId: expectRight(characterEquipmentItemUnitId("weapon_longsword")),
  });

  return {
    ...defenseBuild({ wearingArmor: false }),
    features: [
      {
        selectedFromUnitId: "fighter_weapon_mastery",
        kind: "selectedClassChoice",
        unitId: "weapon_longsword",
      },
    ],
    equipment: {
      owned: [{ itemId: longswordItemId, unitId: "weapon_longsword" }],
      loadout: {
        weapon: {
          itemId: longswordItemId,
          grip: "one_handed",
        },
      },
    },
  };
}

function trueStrikeWizardBuild(): CharacterBuild {
  const daggerItemId = trueStrikeDaggerItemId();

  return {
    progression: {
      startingClass: classUnitId("class_wizard"),
      advancements: [],
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 8,
        dex: 14,
        con: 13,
        int: 16,
        wis: 10,
        cha: 12,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    equipment: {
      owned: [{ itemId: daggerItemId, unitId: "weapon_dagger" }],
      loadout: {
        weapon: {
          itemId: daggerItemId,
          grip: "one_handed",
        },
      },
    },
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_wizard",
          spellcastingAbility: "int",
          cantrips: ["true_strike"],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {},
    },
  };
}

function favoredEnemyRangerBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId("class_ranger"),
      advancements: [],
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 10,
        dex: 16,
        con: 13,
        int: 8,
        wis: 14,
        cha: 12,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    equipment: {
      owned: [],
      loadout: {},
    },
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_ranger",
          spellcastingAbility: "wis",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["druidic_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [{ spellLevel: 1, count: 2 }],
        },
      },
    },
  };
}

function favoredEnemyRangerResourceBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId("class_ranger"),
      advancements: [],
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 10,
        dex: 16,
        con: 13,
        int: 8,
        wis: 14,
        cha: 12,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    equipment: {
      owned: [],
      loadout: {},
    },
  };
}

function druidDruidicBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId("class_druid"),
      advancements: [],
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 10,
        dex: 14,
        con: 13,
        int: 8,
        wis: 16,
        cha: 12,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    equipment: {
      owned: [],
      loadout: {},
    },
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_druid",
          spellcastingAbility: "wis",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["druidic_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [{ spellLevel: 1, count: 2 }],
        },
      },
    },
  };
}

function trueStrikeDaggerItemId() {
  return characterEquipmentItemId({
    slot: "main",
    unitId: expectRight(characterEquipmentItemUnitId("weapon_dagger")),
  });
}

function handoffSpellcastingState(): CharacterBattleSpellcastingState {
  return {
    sourceClassName: "wizard",
    spellcastingAbilityModifier: abilityModifier(3),
    proficiencyBonus: proficiencyBonus(2),
    canCastSpells: true,
    cantrips: [],
    preparedSpells: [],
    spellSlots: [
      {
        spellLevel: spellSlotLevel(1),
        count: resourceCount(2),
        expended: resourceCount(2),
      },
    ],
  };
}

function wizardWarlockBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId("class_wizard"),
      advancements: [],
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 13,
        dex: 14,
        con: 13,
        int: 16,
        wis: 10,
        cha: 12,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    equipment: {
      owned: [],
      loadout: {},
    },
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_wizard",
          spellcastingAbility: "int",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [{ spellLevel: 1, count: 2 }],
        },
        pactMagic: {
          kind: "pactMagic",
          slotLevel: 1,
          count: 1,
        },
      },
    },
  };
}

function paladinBuild(): CharacterBuild {
  return {
    progression: {
      startingClass: classUnitId("class_paladin"),
      advancements: [],
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: expectRight(
      abilityScoreAssignment({
        str: 15,
        dex: 10,
        con: 13,
        int: 8,
        wis: 12,
        cha: 14,
      }),
    ),
    proficiencyChoices: [],
    features: [],
    equipment: {
      owned: [],
      loadout: {},
    },
  };
}

function fighterWithLayOnHandsResourceBuild(): CharacterBuild {
  return {
    ...build,
    features: [
      ...build.features,
      {
        selectedFromUnitId: "class_paladin",
        kind: "selectedClassChoice",
        unitId: "paladin_lay_on_hands",
      },
    ],
  };
}

function expectRight<T, E>(result: Either.Either<T, E>): T {
  if (Either.isLeft(result)) {
    throw new Error(`Expected Right, got ${JSON.stringify(result.left)}`);
  }
  expect(Either.isRight(result)).toBe(true);
  return result.right;
}

function handoffBranchCombatant(
  combatant: Omit<Partial<BattleCreatureState>, "origin"> & {
    readonly origin: Partial<
      Extract<BattleCreatureState["origin"], { readonly kind: "character" }>
    > & {
      readonly kind: "character";
      readonly characterId: ReturnType<typeof characterId>;
    };
  },
): BattleCreatureState {
  // Branch-specific handoff fixtures provide every field read before the tested
  // branch exits. BattleCreatureState's remaining fields are unreachable here.
  return combatant as BattleCreatureState;
}
