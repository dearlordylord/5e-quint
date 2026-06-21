import {
  battleCombatantSide,
  battleCreatureInitFromStatBlock,
  battleId,
  breakBattleConcentration,
  combatantId,
  discoverBattleActs,
  endTurn,
  initiativeScore,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
  startBattle,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
  type SpellSlotProcedure,
} from "@dnd/battle-runtime";
import {
  abilityScoreAssignment,
  characterEquipmentItemId,
  characterEquipmentItemUnitId,
  classUnitId,
  sorcererMetamagicOptionId,
  type CharacterBuild,
} from "@dnd/character-creation-runtime";
import {
  CHARACTER_SHEET_SHORT_REST_TICKS,
  characterSheetId,
  characterSheetResources,
  completeShortRest,
  createFreshCharacterSheet,
  finishShortRest,
  startShortRest,
  type CharacterSheet,
  type CharacterSheetResourceExpenditure,
} from "@dnd/character-sheet-runtime";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { DieRollResult, Hp, resourceCount } from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type {
  DamageType,
  StatBlockRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { Either } from "effect";
import { describe, expect, test } from "vitest";

import { characterSheetBattleInit } from "./index.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (unitCatalogResult.tag !== "ok" || statBlockCatalogResult.tag !== "ok") {
  throw new Error("Level 5 SDK tracer catalogs must build.");
}
const unitLibrary = unitCatalogResult.catalog;
const statBlockCatalog = statBlockCatalogResult.catalog;

const partySide = battleCombatantSide("party");
const monsterSide = battleCombatantSide("monsters");

const extraAttackMonkId = combatantId("combatant:l5-tracer-extra-attack-monk");
const monkId = combatantId("combatant:l5-tracer-monk");
const rogueId = combatantId("combatant:l5-tracer-rogue");
const rogueAllyId = combatantId("combatant:l5-tracer-rogue-ally");
const wizardId = combatantId("combatant:l5-tracer-wizard");
const wardedId = combatantId("combatant:l5-tracer-warded");
const monsterId = combatantId("combatant:l5-tracer-monster");

const monkExtraAttackUnitId = "monk_extra_attack";
const monkFocusUnitId = "monk_monks_focus";
const monkStunningStrikeUnitId = "monk_stunning_strike";
const rogueSneakAttackUnitId = "rogue_sneak_attack";
const rogueCunningStrikeUnitId = "rogue_cunning_strike";
const sorcererFontOfMagicUnitId = "sorcerer_font_of_magic";
const hasteSpellId = "haste";
const protectionFromEnergySpellId = "protection_from_energy";

describe("level 5 SDK tracer bullets", () => {
  test("Extra Attack projects a level-5 martial character through sheet handoff and opens exactly one added attack slot", () => {
    const state = battleFromSheets({
      battleIdText: "battle:l5-tracer-extra-attack",
      characters: [
        characterSheet({
          characterIdText: "character:l5-tracer-extra-attack",
          build: martialBuild({
            classUnitId: "class_monk",
            weaponUnitId: "weapon_dagger",
            abilityScores: {
              str: 10,
              dex: 16,
              con: 14,
              int: 10,
              wis: 16,
              cha: 10,
            },
          }),
          combatantId: extraAttackMonkId,
          initiative: 20,
          maximumHp: 38,
        }),
      ],
      monsters: [
        monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
      ],
    });

    const first = resolveWeaponAttackMiss({
      state,
      actorId: extraAttackMonkId,
      targetId: monsterId,
      attackName: "Dagger",
    });

    expect(snapshotBattle(first.state).turn.actionResources).toEqual([
      expect.objectContaining({
        source: "classFeatureExtraAttack",
        sourceOwnerId: extraAttackMonkId,
        sourceUnitId: monkExtraAttackUnitId,
      }),
    ]);

    const second = resolveWeaponAttackMiss({
      state: first.state,
      actorId: extraAttackMonkId,
      targetId: monsterId,
      attackName: "Dagger",
    });

    expect(snapshotBattle(second.state).turn.actionResources).toEqual([]);
  });

  test("Stunning Strike projects Monk Focus, spends one Focus Point, and applies the failed-save Stunned result", () => {
    const state = battleFromSheets({
      battleIdText: "battle:l5-tracer-stunning-strike",
      characters: [
        characterSheet({
          characterIdText: "character:l5-tracer-stunning-strike",
          build: martialBuild({
            classUnitId: "class_monk",
            weaponUnitId: "weapon_dagger",
            abilityScores: {
              str: 10,
              dex: 16,
              con: 14,
              int: 10,
              wis: 16,
              cha: 10,
            },
          }),
          combatantId: monkId,
          initiative: 20,
          maximumHp: 38,
        }),
      ],
      monsters: [
        monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
      ],
    });
    const subject = attackSubject(state, monkId, "Dagger");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [attackTargetFill(target, monkId, monsterId, "Dagger")],
      }),
      "attackRoll",
    );
    const hitFills = [
      attackTargetFill(target, monkId, monsterId, "Dagger"),
      attackRollFill(roll, { total: 20, naturalD20: 15 }),
    ];
    const decision = requireHole(
      resolveBattleSubject({ state, subject, fills: hitFills }),
      "unitFeatureDecision",
    );
    const save = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [...hitFills, unitFeatureDecisionFill(decision, "attempt")],
      }),
      "savingThrowOutcome",
    );

    expect(save).toMatchObject({ ability: "con", targetIds: [monsterId] });

    const saveFills = [
      ...hitFills,
      unitFeatureDecisionFill(decision, "attempt"),
      savingThrowOutcomeFill(save, [{ targetId: monsterId, succeeded: false }]),
    ];
    const damage = requireHole(
      resolveBattleSubject({ state, subject, fills: saveFills }),
      "rolledDice",
    );
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: attackDamageFills({
          state,
          subject,
          prefixFills: saveFills,
          damage,
          damageDice: [[2]],
        }),
      }),
    );
    const monk = requireCombatant(resolved.state, monkId);
    const targetAfterStrike = requireCombatant(resolved.state, monsterId);

    expect(hasCondition(targetAfterStrike.conditions, "stunned")).toBe(true);
    expect(targetAfterStrike.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "unitFeatureCondition",
          sourceUnitId: monkStunningStrikeUnitId,
          sourceCombatantId: monkId,
          condition: "stunned",
          expiresAt: { kind: "startOfTurn", combatantId: monkId },
        }),
      ]),
    );
    expect(characterResources(monk)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          unit: expect.objectContaining({ id: monkFocusUnitId }),
          usesRemaining: 4,
        }),
      ]),
    );
  });

  test("Cunning Strike projects Sneak Attack, forgoes one die for Trip, and applies Prone after a failed save", () => {
    const state = battleFromSheets({
      battleIdText: "battle:l5-tracer-cunning-strike",
      characters: [
        characterSheet({
          characterIdText: "character:l5-tracer-cunning-strike",
          build: martialBuild({
            classUnitId: "class_rogue",
            weaponUnitId: "weapon_dagger",
            abilityScores: {
              str: 10,
              dex: 16,
              con: 14,
              int: 10,
              wis: 10,
              cha: 10,
            },
          }),
          combatantId: rogueId,
          initiative: 20,
          maximumHp: 38,
        }),
        characterSheet({
          characterIdText: "character:l5-tracer-cunning-strike-ally",
          build: martialBuild({
            classUnitId: "class_fighter",
            weaponUnitId: "weapon_longsword",
          }),
          combatantId: rogueAllyId,
          initiative: 15,
          maximumHp: 20,
        }),
      ],
      monsters: [
        monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton"), {
          tempHp: 40,
        }),
      ],
    });
    const subject = attackSubject(state, rogueId, "Dagger");
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetSelection = attackTargetFill(
      target,
      rogueId,
      monsterId,
      "Dagger",
      [
        {
          kind: "attackerAllyWithin5FeetOfTarget",
          attackerId: rogueId,
          targetId: monsterId,
          allyId: rogueAllyId,
        },
      ],
    );
    const roll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetSelection],
      }),
      "attackRoll",
    );
    const attackRoll = attackRollFill(roll, { total: 18, naturalD20: 13 });
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetSelection, attackRoll],
      }),
      "rolledDice",
    );

    expect(damage).toMatchObject({
      attackDamageRiders: expect.arrayContaining([
        expect.objectContaining({
          unitId: rogueSneakAttackUnitId,
          damage: { dice: 3, dieSize: 6, damageType: "piercing" },
        }),
      ]),
      cunningStrikeOptions: expect.arrayContaining([
        expect.objectContaining({
          unitId: rogueCunningStrikeUnitId,
          optionId: "trip",
          sourceDamageRiderUnitId: rogueSneakAttackUnitId,
          dieCost: { dice: 1, dieSize: 6 },
        }),
      ]),
    });

    const damageFills = attackDamageFills({
      state,
      subject,
      prefixFills: [targetSelection, attackRoll],
      damage,
      damageDice: [[4], [6, 5]],
      selectedAttackDamageRiderUnitIds: [rogueSneakAttackUnitId],
      cunningStrikeOption: {
        unitId: rogueCunningStrikeUnitId,
        optionId: "trip",
      },
    });
    const save = requireHole(
      resolveBattleSubject({ state, subject, fills: damageFills }),
      "savingThrowOutcome",
    );
    expect(save).toMatchObject({ ability: "dex", targetIds: [monsterId] });

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          ...damageFills,
          savingThrowOutcomeFill(save, [
            { targetId: monsterId, succeeded: false },
          ]),
        ],
      }),
    );

    expect(
      hasCondition(
        requireCombatant(resolved.state, monsterId).conditions,
        "prone",
      ),
    ).toBe(true);
    expect(
      resolved.state.currentTurnResources.attackDamageRidersUsedThisTurn,
    ).toEqual([{ attackerId: rogueId, unitId: rogueSneakAttackUnitId }]);
  });

  test("Haste casts from a level-5 spellcaster sheet and projects speed, AC, Dexterity save, action, slot, and lethargy behavior", () => {
    const state = battleFromSheets({
      battleIdText: "battle:l5-tracer-haste",
      characters: [
        characterSheet({
          characterIdText: "character:l5-tracer-haste",
          build: wizardBuild({ preparedSpells: [hasteSpellId] }),
          combatantId: wizardId,
          initiative: 20,
          maximumHp: 32,
        }),
      ],
      monsters: [
        monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
      ],
    });
    const act = spellAct(state, hasteSpellId, 3, "hastePositive");
    const target = requireHoleFromList(act.initialHoles, "targetChoice");
    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          knownWillingSpellTargetFill(target, hasteSpellId, wizardId, wizardId),
        ],
      }),
    );
    const caster = requireCharacterCombatant(resolved.state, wizardId);

    expect(resolved.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: wizardId,
          concentrating: true,
          armorClass: 14,
          movement: expect.objectContaining({ speedFeet: 60 }),
        }),
      ]),
    );
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 1, count: 4, expended: 0 },
      { spellLevel: 2, count: 3, expended: 0 },
      { spellLevel: 3, count: 2, expended: 1 },
    ]);
    expect(caster.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "speedRatio",
          sourceSpellId: hasteSpellId,
        }),
        expect.objectContaining({
          kind: "spellArmorClassBonus",
          sourceSpellId: hasteSpellId,
        }),
        expect.objectContaining({
          kind: "savingThrowRollMode",
          sourceSpellId: hasteSpellId,
          ability: "dex",
          mode: "advantage",
        }),
        expect.objectContaining({
          kind: "spellGrantedActionResource",
          sourceSpellId: hasteSpellId,
        }),
      ]),
    );
    expect(resolved.state.currentTurnResources.actionResources).toEqual([
      expect.objectContaining({
        kind: "action",
        source: "spellEffect",
        sourceOwnerId: wizardId,
        sourceSpellId: hasteSpellId,
        restriction: {
          kind: "allow_only",
          actions: [
            {
              action: "attack",
              attackLimit: { kind: "attack_count", count: 1 },
            },
            { action: "dash" },
            { action: "disengage" },
            { action: "hide" },
            { action: "utilize" },
          ],
        },
      }),
    ]);

    const ended = breakBattleConcentration(resolved.state, wizardId);
    const lethargic = requireCombatant(ended, wizardId);

    expect(hasCondition(lethargic.conditions, "incapacitated")).toBe(true);
    expect(snapshotBattle(ended).combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: wizardId,
          movement: expect.objectContaining({ speedFeet: 0 }),
        }),
      ]),
    );
    expect(
      lethargic.activeEffects.some(
        (effect) =>
          effect.kind === "spellGrantedActionResource" &&
          effect.sourceSpellId === hasteSpellId,
      ),
    ).toBe(false);
  });

  test("Protection from Energy casts through sheet projection and halves only the chosen damage type", () => {
    const matching = protectionFromEnergyDamageScenario("fire");
    expect(matching.afterDamageHp).toBe(
      Hp(Number(matching.beforeDamageHp) - 4),
    );
    expect(matching.protectedTarget.activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "damageResistance",
          sourceSpellId: protectionFromEnergySpellId,
          sourceCombatantId: wizardId,
          damageType: "fire",
        }),
      ]),
    );

    const nonmatching = protectionFromEnergyDamageScenario("cold");
    expect(nonmatching.afterDamageHp).toBe(
      Hp(Number(nonmatching.beforeDamageHp) - 8),
    );
  });

  test("Sorcerous Restoration uses the sheet rest lifecycle to recover half level rounded down once per Long Rest", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId(
          "character:l5-tracer-sorcerous-restoration",
        ),
        build: sorcererBuild(),
        maximumHp: Hp(32),
        hitPointMaximumReduction: Hp(0),
        currentHp: Hp(32),
        tempHp: Hp(0),
        conditions: [],
        unitLibrary,
        resourceExpenditures: [
          {
            tag: "pointPoolResource",
            unitId: sorcererFontOfMagicUnitId,
            expended: resourceCount(4),
          },
        ],
      }),
    );

    expect(characterSheetResources(sheet, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "pointPoolResource",
          unitId: sorcererFontOfMagicUnitId,
          count: 5,
          expended: 4,
        }),
      ]),
    });

    const rest = requireRight(startShortRest({ sheet }));
    const completion = requireRight(
      finishShortRest({
        rest,
        restedTicks: CHARACTER_SHEET_SHORT_REST_TICKS,
      }),
    );
    const rested = requireRight(
      completeShortRest({
        completion,
        unitLibrary,
        sorcerousRestoration: {
          recoverSorceryPoints: resourceCount(2),
        },
      }),
    );

    expect(rested.resourceExpenditures).toEqual([
      {
        tag: "pointPoolResource",
        unitId: sorcererFontOfMagicUnitId,
        expended: resourceCount(2),
      },
    ]);
    expect(rested.restFeatureUses).toEqual([
      { tag: "sorcerousRestoration", usedSinceLongRest: true },
    ]);
    expect(characterSheetResources(rested, unitLibrary)).toMatchObject({
      _tag: "Right",
      right: expect.arrayContaining([
        expect.objectContaining({
          tag: "pointPoolResource",
          unitId: sorcererFontOfMagicUnitId,
          count: 5,
          expended: 2,
        }),
      ]),
    });
  });
});

type SheetFixture = {
  readonly sheet: CharacterSheet;
  readonly combatantId: CombatantId;
  readonly initiative: number;
};

function battleFromSheets(input: {
  readonly battleIdText: string;
  readonly characters: readonly SheetFixture[];
  readonly monsters: readonly Parameters<
    typeof battleCreatureInitFromStatBlock
  >[0][];
}): BattleState {
  const characterInits = input.characters.map((character) =>
    requireRight(
      characterSheetBattleInit({
        sheet: character.sheet,
        combatantId: character.combatantId,
        displayName: character.sheet.characterId,
        initiative: initiativeScore(character.initiative),
        side: partySide,
        unitLibrary,
        statBlockCatalog,
      }),
    ),
  );
  return requireRight(
    startBattle({
      battleId: battleId(input.battleIdText),
      combatants: [
        ...characterInits,
        ...input.monsters.map((monster) =>
          battleCreatureInitFromStatBlock(monster),
        ),
      ],
    }),
  );
}

function characterSheet(input: {
  readonly characterIdText: string;
  readonly combatantId: CombatantId;
  readonly build: CharacterBuild;
  readonly initiative: number;
  readonly maximumHp: number;
  readonly resourceExpenditures?: readonly CharacterSheetResourceExpenditure[];
}): SheetFixture {
  return {
    combatantId: input.combatantId,
    initiative: input.initiative,
    sheet: requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId(input.characterIdText),
        build: input.build,
        maximumHp: Hp(input.maximumHp),
        hitPointMaximumReduction: Hp(0),
        currentHp: Hp(input.maximumHp),
        tempHp: Hp(0),
        conditions: [],
        unitLibrary,
        ...(input.resourceExpenditures === undefined
          ? {}
          : { resourceExpenditures: input.resourceExpenditures }),
      }),
    ),
  };
}

function baseBuild(input: {
  readonly classUnitId: UnitRecord["id"];
  readonly level?: number;
  readonly abilityScores?: Parameters<typeof abilityScoreAssignment>[0];
  readonly equipment?: CharacterBuild["equipment"];
  readonly features?: CharacterBuild["features"];
  readonly spellcasting?: CharacterBuild["spellcasting"];
}): CharacterBuild {
  const level = input.level ?? 5;
  return {
    progression: {
      startingClass: classUnitId(input.classUnitId),
      advancements: Array.from({ length: level - 1 }, () => ({
        classUnitId: classUnitId(input.classUnitId),
        hitPointRule: { tag: "fixedHigherLevelGain" as const },
      })),
    },
    background: "background_soldier",
    species: "species_orc",
    originLanguages: ["Common", "Dwarvish", "Goblin"],
    classFeatureLanguages: [],
    alignment: { order: "lawful", morality: "good" },
    abilityScores: requireRight(
      abilityScoreAssignment(
        input.abilityScores ?? {
          str: 16,
          dex: 14,
          con: 14,
          int: 10,
          wis: 10,
          cha: 10,
        },
      ),
    ),
    proficiencyChoices: [],
    features: input.features ?? [],
    ...(input.spellcasting === undefined
      ? {}
      : { spellcasting: input.spellcasting }),
    equipment: input.equipment ?? { owned: [], loadout: {} },
  };
}

function martialBuild(input: {
  readonly classUnitId: UnitRecord["id"];
  readonly weaponUnitId: UnitRecord["id"];
  readonly abilityScores?: Parameters<typeof abilityScoreAssignment>[0];
}): CharacterBuild {
  const weaponItemId = characterEquipmentItemId({
    slot: "main",
    unitId: requireRight(characterEquipmentItemUnitId(input.weaponUnitId)),
  });
  return baseBuild({
    classUnitId: input.classUnitId,
    ...(input.abilityScores === undefined
      ? {}
      : { abilityScores: input.abilityScores }),
    equipment: {
      owned: [{ itemId: weaponItemId, unitId: input.weaponUnitId }],
      loadout: {
        weapon: { itemId: weaponItemId, grip: "one_handed" },
      },
    },
  });
}

function wizardBuild(input: {
  readonly preparedSpells: readonly UnitRecord["id"][];
}): CharacterBuild {
  return baseBuild({
    classUnitId: "class_wizard",
    abilityScores: { str: 8, dex: 14, con: 14, int: 16, wis: 10, cha: 10 },
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_wizard",
          spellcastingAbility: "int",
          cantrips: [],
          spellbook: input.preparedSpells,
          preparedSpells: input.preparedSpells,
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [
            { spellLevel: 1, count: 4 },
            { spellLevel: 2, count: 3 },
            { spellLevel: 3, count: 2 },
          ],
        },
      },
    },
  });
}

function sorcererBuild(): CharacterBuild {
  return baseBuild({
    classUnitId: "class_sorcerer",
    abilityScores: { str: 8, dex: 14, con: 14, int: 10, wis: 10, cha: 16 },
    features: [
      {
        kind: "selectedSorcererMetamagicOption",
        selectedFromUnitId: "sorcerer_metamagic",
        optionId: requireRight(
          sorcererMetamagicOptionId("sorcerer_empowered_spell"),
        ),
      },
      {
        kind: "selectedSorcererMetamagicOption",
        selectedFromUnitId: "sorcerer_metamagic",
        optionId: requireRight(
          sorcererMetamagicOptionId("sorcerer_heightened_spell"),
        ),
      },
    ],
    spellcasting: {
      sources: [
        {
          sourceUnitId: "class_sorcerer",
          spellcastingAbility: "cha",
          cantrips: [],
          spellbook: [],
          preparedSpells: [],
          spellcastingFocuses: ["arcane_focus"],
        },
      ],
      slotPools: {
        spellcasting: {
          kind: "spellcasting",
          slots: [
            { spellLevel: 1, count: 4 },
            { spellLevel: 2, count: 3 },
            { spellLevel: 3, count: 2 },
          ],
        },
      },
    },
  });
}

function monsterBattleInput(
  id: CombatantId,
  initiative: number,
  statBlock: StatBlockRecord,
  input: { readonly tempHp?: number } = {},
): Parameters<typeof battleCreatureInitFromStatBlock>[0] {
  return {
    combatantId: id,
    statBlock,
    initiative: initiativeScore(initiative),
    side: monsterSide,
    ...(input.tempHp === undefined ? {} : { tempHp: Hp(input.tempHp) }),
  };
}

function srdStatBlock(id: StatBlockRecord["id"]): StatBlockRecord {
  return statBlockCatalog.requireStatBlock(id);
}

function elementalTouchStatBlock(damageType: "fire" | "cold"): StatBlockRecord {
  const base = srdStatBlock("stat_block_goblin_warrior");
  const scimitar = base.statBlock.actions?.attacks?.find(
    (attack) => attack.name === "Scimitar",
  );
  if (scimitar === undefined) {
    throw new Error("Expected Goblin Warrior Scimitar fixture.");
  }
  const displayDamageType = damageType === "fire" ? "Fire" : "Cold";
  return {
    ...base,
    id: `stat_block_synthetic_l5_tracer_${damageType}_touch`,
    name: `Synthetic ${displayDamageType} Touch`,
    provenance: {
      kind: "xphb",
      section: "level5-sdk-tracer-bullets synthetic test fixture",
    },
    statBlock: {
      ...base.statBlock,
      displayName: `Synthetic ${displayDamageType} Touch`,
      actions: {
        attacks: [
          {
            ...scimitar,
            name: "Elemental Touch",
            onHit: [
              {
                kind: "damage",
                damageType,
                amount: {
                  kind: "fixed",
                  static: 8,
                  expr: { dice: 1, dieSize: 8 },
                },
              },
            ],
          },
        ],
      },
    },
  };
}

function protectionFromEnergyDamageScenario(damageType: "fire" | "cold"): {
  readonly protectedTarget: BattleCreatureState;
  readonly beforeDamageHp: Hp;
  readonly afterDamageHp: Hp;
} {
  const state = battleFromSheets({
    battleIdText: `battle:l5-tracer-protection-from-energy-${damageType}`,
    characters: [
      characterSheet({
        characterIdText: `character:l5-tracer-protection-from-energy-caster-${damageType}`,
        build: wizardBuild({ preparedSpells: [protectionFromEnergySpellId] }),
        combatantId: wizardId,
        initiative: 20,
        maximumHp: 32,
      }),
      characterSheet({
        characterIdText: `character:l5-tracer-protection-from-energy-warded-${damageType}`,
        build: martialBuild({
          classUnitId: "class_fighter",
          weaponUnitId: "weapon_longsword",
        }),
        combatantId: wardedId,
        initiative: 5,
        maximumHp: 30,
      }),
    ],
    monsters: [
      monsterBattleInput(monsterId, 10, elementalTouchStatBlock(damageType)),
    ],
  });
  const act = spellAct(
    state,
    protectionFromEnergySpellId,
    3,
    "chosenDamageResistance",
  );
  const target = requireHoleFromList(act.initialHoles, "targetChoice");
  const damageTypeHole = requireHoleFromList(
    act.initialHoles,
    "damageTypeChoice",
  );
  const cast = requireResolved(
    resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          target,
          protectionFromEnergySpellId,
          wizardId,
          wardedId,
        ),
        damageTypeChoiceFill(damageTypeHole, "fire"),
      ],
    }),
  );
  const monsterTurn = requireResolved(
    endTurn({ state: cast.state, actorId: wizardId }),
  ).state;
  const subject = attackSubject(monsterTurn, monsterId, "Elemental Touch");
  const targetHole = requireHole(
    resolveBattleSubject({ state: monsterTurn, subject, fills: [] }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(
    targetHole,
    monsterId,
    wardedId,
    "Elemental Touch",
  );
  const attackRoll = requireHole(
    resolveBattleSubject({
      state: monsterTurn,
      subject,
      fills: [targetFill],
    }),
    "attackRoll",
  );
  const attackFill = attackRollFill(attackRoll, {
    total: 20,
    naturalD20: 15,
  });
  const damage = requireHole(
    resolveBattleSubject({
      state: monsterTurn,
      subject,
      fills: [targetFill, attackFill],
    }),
    "rolledDice",
  );
  const beforeDamageHp = requireCombatant(monsterTurn, wardedId).hp;
  const resolved = requireResolved(
    resolveBattleSubject({
      state: monsterTurn,
      subject,
      fills: [targetFill, attackFill, damageRollFillWithGroups(damage, [[8]])],
    }),
  );
  return {
    protectedTarget: requireCombatant(cast.state, wardedId),
    beforeDamageHp,
    afterDamageHp: requireCombatant(resolved.state, wardedId).hp,
  };
}

function resolveWeaponAttackMiss(input: {
  readonly state: BattleState;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly attackName: string;
}) {
  const subject = attackSubject(input.state, input.actorId, input.attackName);
  const target = requireHole(
    resolveBattleSubject({ state: input.state, subject, fills: [] }),
    "targetChoice",
  );
  const roll = requireHole(
    resolveBattleSubject({
      state: input.state,
      subject,
      fills: [
        attackTargetFill(
          target,
          input.actorId,
          input.targetId,
          input.attackName,
        ),
      ],
    }),
    "attackRoll",
  );
  return requireResolved(
    resolveBattleSubject({
      state: input.state,
      subject,
      fills: [
        attackTargetFill(
          target,
          input.actorId,
          input.targetId,
          input.attackName,
        ),
        attackRollFill(roll, { total: 1, naturalD20: 1 }),
      ],
    }),
  );
}

function attackSubject(
  state: BattleState,
  actorId: CombatantId,
  attackName: string,
): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack" &&
      candidate.subject.actorId === actorId &&
      candidate.subject.attackName === attackName,
  );
  if (
    act === undefined ||
    act.subject.tag !== "action" ||
    act.subject.action !== "attack"
  ) {
    throw new Error(`Expected ${attackName} Attack action.`);
  }
  return act.subject;
}

function spellAct(
  state: BattleState,
  spellId: string,
  slotLevel: number,
  procedure: SpellSlotProcedure,
) {
  const expectedInvocation = spellSlotInvocationRef(
    spellId,
    slotLevel,
    procedure,
  );
  if (expectedInvocation.tag !== "spellSlot") {
    throw new Error(`Expected ${spellId} spell-slot invocation.`);
  }
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.tag === "spellSlot" &&
      candidate.subject.invocation.spellId === expectedInvocation.spellId &&
      candidate.subject.invocation.slotLevel === expectedInvocation.slotLevel &&
      candidate.subject.invocation.procedure === expectedInvocation.procedure,
  );
  if (act === undefined || act.subject.tag !== "actionSpell") {
    throw new Error(`Expected ${spellId} spell action.`);
  }
  return act;
}

function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  actorId: CombatantId,
  targetId: CombatantId,
  attackName: string,
  extraSpatialFacts: Extract<
    BattleFill,
    { readonly kind: "targetChoice" }
  >["spatialFacts"] = [],
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId,
        targetId,
        attackName,
      },
      ...extraSpatialFacts,
    ],
  };
}

function knownWillingSpellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: string,
  casterId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId,
        targetId,
        spellId,
      },
      {
        kind: "spellTargetKnownWilling",
        casterId,
        targetId,
        spellId,
      },
    ],
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: {
    readonly total: number;
    readonly naturalD20: number;
    readonly rollMode?: "advantage" | "disadvantage" | "normal";
  },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
      ...(value.rollMode === undefined ? {} : { rollMode: value.rollMode }),
    },
  };
}

function damageRollFillWithGroups(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  groups: readonly (readonly number[])[],
  input: {
    readonly selectedAttackDamageRiderUnitIds?: readonly string[];
    readonly cunningStrikeOption?: Extract<
      BattleFill,
      { readonly kind: "rolledDice" }
    >["cunningStrikeOption"];
  } = {},
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [
      rolledDiceGroup(firstGroup),
      ...restGroups.map((group) => rolledDiceGroup(group)),
    ],
    ...(input.selectedAttackDamageRiderUnitIds === undefined
      ? {}
      : {
          selectedAttackDamageRiderUnitIds:
            input.selectedAttackDamageRiderUnitIds,
        }),
    ...(input.cunningStrikeOption === undefined
      ? {}
      : { cunningStrikeOption: input.cunningStrikeOption }),
  };
}

function rolledDiceGroup(
  group: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }>["value"][number] {
  const [first, ...rest] = group;
  if (first === undefined) {
    throw new Error("Expected at least one die result.");
  }
  return {
    results: [DieRollResult(first), ...rest.map((die) => DieRollResult(die))],
  };
}

function attackDamageFills(input: {
  readonly state: BattleState;
  readonly subject: BattleSubject;
  readonly prefixFills: readonly BattleFill[];
  readonly damage: Extract<BattleHole, { readonly kind: "rolledDice" }>;
  readonly damageDice: readonly (readonly number[])[];
  readonly selectedAttackDamageRiderUnitIds?: readonly string[];
  readonly cunningStrikeOption?: Extract<
    BattleFill,
    { readonly kind: "rolledDice" }
  >["cunningStrikeOption"];
}): readonly BattleFill[] {
  const throughDamage = [
    ...input.prefixFills,
    damageRollFillWithGroups(input.damage, input.damageDice, {
      ...(input.selectedAttackDamageRiderUnitIds === undefined
        ? {}
        : {
            selectedAttackDamageRiderUnitIds:
              input.selectedAttackDamageRiderUnitIds,
          }),
      ...(input.cunningStrikeOption === undefined
        ? {}
        : { cunningStrikeOption: input.cunningStrikeOption }),
    }),
  ];
  const next = resolveBattleSubject({
    state: input.state,
    subject: input.subject,
    fills: throughDamage,
  });
  const disposition =
    next.tag === "needsHoles"
      ? next.holes.find((hole) => hole.kind === "attackDamageDisposition")
      : undefined;
  return disposition === undefined
    ? throughDamage
    : [
        ...throughDamage,
        {
          kind: "attackDamageDisposition",
          holeId: disposition.holeId,
          value: { kind: "ordinaryDamage" },
        },
      ];
}

function unitFeatureDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "unitFeatureDecision" }>,
  value: Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "unitFeatureDecision" }> {
  return { kind: "unitFeatureDecision", holeId: hole.holeId, value };
}

function savingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: { outcomes },
  };
}

function damageTypeChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "damageTypeChoice" }>,
  value: Extract<
    DamageType,
    "acid" | "cold" | "fire" | "lightning" | "thunder"
  >,
): Extract<BattleFill, { readonly kind: "damageTypeChoice" }> {
  return { kind: "damageTypeChoice", holeId: hole.holeId, value };
}

function requireHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected ${kind} hole.`);
  }
  return requireHoleFromList(result.holes, kind);
}

function requireHoleFromList<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find((candidate) => candidate.kind === kind);
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole as Extract<BattleHole, { readonly kind: K }>;
}

function requireResolved(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  if (result.tag !== "resolved") {
    throw new Error(`Expected resolved battle result, got ${result.tag}.`);
  }
  return result;
}

function requireCombatant(
  state: BattleState,
  combatantIdValue: CombatantId,
): BattleCreatureState {
  const combatant = state.combatants.get(combatantIdValue);
  if (combatant === undefined) {
    throw new Error(`Expected combatant ${combatantIdValue}.`);
  }
  return combatant;
}

function requireCharacterCombatant(
  state: BattleState,
  combatantIdValue: CombatantId,
): BattleCreatureState & {
  readonly origin: Extract<
    BattleCreatureState["origin"],
    { readonly kind: "character" }
  >;
} {
  const combatant = requireCombatant(state, combatantIdValue);
  if (combatant.origin.kind !== "character") {
    throw new Error(`Expected character combatant ${combatantIdValue}.`);
  }
  return combatant as BattleCreatureState & {
    readonly origin: Extract<
      BattleCreatureState["origin"],
      { readonly kind: "character" }
    >;
  };
}

function characterResources(combatant: BattleCreatureState) {
  return combatant.origin.kind === "character"
    ? combatant.origin.resources
    : [];
}

function requireRight<A, E>(either: Either.Either<A, E>): A {
  if (Either.isRight(either)) return either.right;
  throw new Error(`Expected Either.right, got ${JSON.stringify(either.left)}.`);
}
