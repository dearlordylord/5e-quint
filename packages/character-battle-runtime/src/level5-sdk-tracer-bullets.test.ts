import {
  battleObjectId,
  battleSpellEffectOccurrenceId,
  breakBattleConcentration,
  combatantId,
  discoverBattleActs,
  endTurn,
  resolveBattleInterrupt,
  resolveBattleSubject,
  snapshotBattle,
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleInterruptProcedureChoice,
  type BattleObjectIgnitionDisposition,
  type BattleResolutionResult,
  type BattleState,
  type BattleTrackedOngoingSpellLightEmitter,
  type CombatantId,
} from "@dnd/battle-runtime";
import {
  CHARACTER_SHEET_SHORT_REST_TICKS,
  characterSheetId,
  characterSheetResources,
  completeShortRest,
  createFreshCharacterSheet,
  finishShortRest,
  startShortRest,
} from "@dnd/character-sheet-runtime";
import type { CharacterBuild } from "@dnd/character-creation-runtime";
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { Hp, movementFeet, resourceCount } from "@dnd/shared/types";
import type {
  DamageType,
  StatBlockRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";

import {
  attackRollFill,
  attackSubject,
  attackTargetFill,
  battleFromSheets,
  characterResources,
  characterSheet,
  damageRollFillWithGroups,
  knownWillingSpellTargetFill,
  levelFiveBardBuild,
  levelFiveClericBuild,
  levelFiveDruidWildShapeKnownFormStatBlockIds,
  levelFiveDruidBuild,
  levelFiveMartialBuild,
  levelFiveSorcererBuild,
  levelFiveWarlockBuild,
  levelFiveWizardBuild,
  monsterBattleInput,
  ordinaryAttackDamageFills,
  requireCharacterCombatant,
  requireCombatant,
  requireHole,
  requireHoleFromList,
  requireResolved,
  requireRight,
  savingThrowOutcomeFill,
  spellSlotActForProcedure,
  srdStatBlock,
  unitFeatureDecisionFill,
  unitLibrary,
} from "./sdk-integration-test-support.ts";

const extraAttackMonkId = combatantId("combatant:l5-tracer-extra-attack-monk");
const monkId = combatantId("combatant:l5-tracer-monk");
const rogueId = combatantId("combatant:l5-tracer-rogue");
const rogueAllyId = combatantId("combatant:l5-tracer-rogue-ally");
const wizardId = combatantId("combatant:l5-tracer-wizard");
const wardedId = combatantId("combatant:l5-tracer-warded");
const monsterId = combatantId("combatant:l5-tracer-monster");
const counterspellSorcererId = combatantId(
  "combatant:l5-tracer-counterspell-sorcerer",
);
const counterspellWarlockId = combatantId(
  "combatant:l5-tracer-counterspell-warlock",
);
const counterspellWizardId = combatantId(
  "combatant:l5-tracer-counterspell-wizard",
);
const counterspellTriggeringWizardId = combatantId(
  "combatant:l5-tracer-counterspell-triggering-wizard",
);
const dispelMagicBardId = combatantId("combatant:l5-tracer-dispel-bard");
const dispelMagicClericId = combatantId("combatant:l5-tracer-dispel-cleric");
const dispelMagicDruidId = combatantId("combatant:l5-tracer-dispel-druid");
const dispelMagicSorcererId = combatantId(
  "combatant:l5-tracer-dispel-sorcerer",
);
const dispelMagicWarlockId = combatantId("combatant:l5-tracer-dispel-warlock");
const dispelMagicWizardId = combatantId("combatant:l5-tracer-dispel-wizard");
const fireballSorcererId = combatantId("combatant:l5-tracer-fireball-sorcerer");
const fireballWizardId = combatantId("combatant:l5-tracer-fireball-wizard");
const fireballTargetId = combatantId("combatant:l5-tracer-fireball-target");
const flySorcererId = combatantId("combatant:l5-tracer-fly-sorcerer");
const flyWarlockId = combatantId("combatant:l5-tracer-fly-warlock");
const flyWizardId = combatantId("combatant:l5-tracer-fly-wizard");
const hasteSorcererId = combatantId("combatant:l5-tracer-haste-sorcerer");
const glyphOfWardingBardId = combatantId(
  "combatant:l5-tracer-glyph-of-warding-bard",
);
const glyphOfWardingClericId = combatantId(
  "combatant:l5-tracer-glyph-of-warding-cleric",
);
const glyphOfWardingWizardId = combatantId(
  "combatant:l5-tracer-glyph-of-warding-wizard",
);

const monkExtraAttackUnitId = "monk_extra_attack";
const monkFocusUnitId = "monk_monks_focus";
const monkStunningStrikeUnitId = "monk_stunning_strike";
const rogueSneakAttackUnitId = "rogue_sneak_attack";
const rogueCunningStrikeUnitId = "rogue_cunning_strike";
const sorcererFontOfMagicUnitId = "sorcerer_font_of_magic";
const hasteSpellId = "haste";
const protectionFromEnergySpellId = "protection_from_energy";
const counterspellSpellId = "counterspell";
const dispelMagicSpellId = "dispel_magic";
const continualFlameSpellId = "continual_flame";
const fireballSpellId = "fireball";
const flySpellId = "fly";
const glyphOfWardingSpellId = "glyph_of_warding";
const counterspellCastLevel = 3;
const dispelMagicCastLevel = 3;
const fireballCastLevel = 3;
const flyCastLevel = 3;
const hasteCastLevel = 3;
const glyphOfWardingCastLevel = 3;
const flySpeedFeet = 60;
const magicMissileSpellId = "magic_missile";
const magicMissileTriggerSlotLevel = 1;
const fireballObjectId = battleObjectId("object:l5-tracer-fireball-kindling");
const fireballDamageRollResults = [4, 4, 4, 4, 4, 4, 4, 4] as const;
const fireballDamageTotal = fireballDamageRollResults.reduce(
  (total, roll) => total + roll,
  0,
);
type CounterspellClassAccessCase = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly reactorId: CombatantId;
  readonly build: CharacterBuild;
};
type DispelMagicClassAccessCase = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly casterId: CombatantId;
  readonly build: CharacterBuild;
  readonly druidWildShapeKnownFormStatBlockIds?: readonly StatBlockRecord["id"][];
};
type FireballClassAccessCase = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly casterId: CombatantId;
  readonly build: CharacterBuild;
};
type HasteClassAccessCase = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly casterId: CombatantId;
  readonly build: CharacterBuild;
};
type FlyClassAccessCase = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly casterId: CombatantId;
  readonly build: CharacterBuild;
};
type GlyphOfWardingClassAccessCase = {
  readonly sourceUnitId: UnitRecord["id"];
  readonly casterId: CombatantId;
  readonly build: CharacterBuild;
};
type OngoingSpellTargetChoiceFill = Extract<
  BattleFill,
  { readonly kind: "ongoingSpellTargetChoice" }
>;
type OngoingSpellTarget = OngoingSpellTargetChoiceFill["value"];
type OngoingSpellTargetWithinRangeFact =
  OngoingSpellTargetChoiceFill["spatialFacts"][number];

describe("level 5 SDK tracer bullets", () => {
  test("Extra Attack projects a level-5 martial character through sheet handoff and opens exactly one added attack slot", () => {
    const state = battleFromSheets({
      battleIdText: "battle:l5-tracer-extra-attack",
      characters: [
        characterSheet({
          characterIdText: "character:l5-tracer-extra-attack",
          build: levelFiveMartialBuild({
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
          build: levelFiveMartialBuild({
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
        fills: ordinaryAttackDamageFills({
          state,
          subject,
          prefixFills: saveFills,
          damage,
          damageDice: [[2]],
        }),
      }),
    );
    const monk = requireCharacterCombatant(resolved.state, monkId);
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
          build: levelFiveMartialBuild({
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
        }),
        characterSheet({
          characterIdText: "character:l5-tracer-cunning-strike-ally",
          build: levelFiveMartialBuild({
            classUnitId: "class_fighter",
            weaponUnitId: "weapon_longsword",
          }),
          combatantId: rogueAllyId,
          initiative: 15,
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

    const damageFills = ordinaryAttackDamageFills({
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
    const hasteCases = [
      {
        sourceUnitId: "class_sorcerer",
        casterId: hasteSorcererId,
        build: levelFiveSorcererBuild({
          preparedSpells: [hasteSpellId],
        }),
      },
      {
        sourceUnitId: "class_wizard",
        casterId: wizardId,
        build: levelFiveWizardBuild({ preparedSpells: [hasteSpellId] }),
      },
    ] as const satisfies ReadonlyArray<HasteClassAccessCase>;

    for (const hasteCase of hasteCases) {
      expectHasteClassAccess(hasteCase);

      const state = battleFromSheets({
        battleIdText: `battle:l5-tracer-haste-${hasteCase.sourceUnitId}`,
        characters: [
          characterSheet({
            characterIdText: `character:l5-tracer-haste-${hasteCase.sourceUnitId}`,
            build: hasteCase.build,
            combatantId: hasteCase.casterId,
            initiative: 20,
          }),
        ],
        monsters: [
          monsterBattleInput(
            monsterId,
            10,
            srdStatBlock("stat_block_skeleton"),
          ),
        ],
      });
      const act = spellSlotActForProcedure(
        state,
        hasteSpellId,
        hasteCastLevel,
        "hastePositive",
      );
      const target = requireHoleFromList(act.initialHoles, "targetChoice");
      const resolved = requireResolved(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            knownWillingSpellTargetFill(
              target,
              hasteSpellId,
              hasteCase.casterId,
              hasteCase.casterId,
            ),
          ],
        }),
      );
      const caster = requireCharacterCombatant(
        resolved.state,
        hasteCase.casterId,
      );

      expect(resolved.snapshot.combatants).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            combatantId: hasteCase.casterId,
            concentrating: true,
            armorClass: 14,
            movement: expect.objectContaining({ speedFeet: 60 }),
          }),
        ]),
      );
      expect(caster.origin.spellcasting?.spellSlots).toEqual([
        { spellLevel: 1, count: 4, expended: 0 },
        { spellLevel: 2, count: 3, expended: 0 },
        { spellLevel: hasteCastLevel, count: 2, expended: 1 },
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
          sourceOwnerId: hasteCase.casterId,
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

      const ended = breakBattleConcentration(resolved.state, hasteCase.casterId);
      const lethargic = requireCombatant(ended, hasteCase.casterId);

      expect(hasCondition(lethargic.conditions, "incapacitated")).toBe(true);
      expect(snapshotBattle(ended).combatants).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            combatantId: hasteCase.casterId,
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
    }
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

  test("Counterspell projects Sorcerer, Warlock, and Wizard access and interrupts a spell-cast Reaction", () => {
    const counterspellCases = [
      {
        sourceUnitId: "class_sorcerer",
        reactorId: counterspellSorcererId,
        build: levelFiveSorcererBuild({
          preparedSpells: [counterspellSpellId],
        }),
      },
      {
        sourceUnitId: "class_warlock",
        reactorId: counterspellWarlockId,
        build: levelFiveWarlockBuild({
          preparedSpells: [counterspellSpellId],
        }),
      },
      {
        sourceUnitId: "class_wizard",
        reactorId: counterspellWizardId,
        build: levelFiveWizardBuild({
          preparedSpells: [counterspellSpellId],
        }),
      },
    ] as const satisfies ReadonlyArray<CounterspellClassAccessCase>;

    for (const counterspellCase of counterspellCases) {
      expectCounterspellClassAccess(counterspellCase);

      const state = battleFromSheets({
        battleIdText: `battle:l5-tracer-counterspell-${counterspellCase.sourceUnitId}`,
        characters: [
          characterSheet({
            characterIdText: `character:l5-tracer-counterspell-trigger-${counterspellCase.sourceUnitId}`,
            build: levelFiveWizardBuild({
              preparedSpells: [magicMissileSpellId],
            }),
            combatantId: counterspellTriggeringWizardId,
            initiative: 20,
          }),
          characterSheet({
            characterIdText: `character:l5-tracer-counterspell-${counterspellCase.sourceUnitId}`,
            build: counterspellCase.build,
            combatantId: counterspellCase.reactorId,
            initiative: 15,
          }),
        ],
        monsters: [],
      });
      const awaitingCounterspell = startCounterspellableMagicMissile({
        state,
        casterId: counterspellTriggeringWizardId,
        targetId: counterspellCase.reactorId,
        reactorId: counterspellCase.reactorId,
      });
      const choice = requireCounterspellChoice(
        awaitingCounterspell,
        counterspellCase.reactorId,
      );

      const resolved = requireResolved(
        resolveBattleInterrupt({
          state: awaitingCounterspell.state,
          fill: interruptDecisionFill(
            requireHoleFromList(
              awaitingCounterspell.holes,
              "interruptDecision",
            ),
            counterspellDecision(counterspellCase.reactorId, choice, []),
          ),
        }),
      );
      const reactor = requireCharacterCombatant(
        resolved.state,
        counterspellCase.reactorId,
      );
      const triggeringCaster = requireCharacterCombatant(
        resolved.state,
        counterspellTriggeringWizardId,
      );

      expect(resolved.snapshot.pendingInterrupt).toBeNull();
      expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
      expect(reactor.reactionAvailable).toBe(false);
      expect(reactor.origin.spellcasting?.spellSlots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            spellLevel: counterspellCastLevel,
            expended: 1,
          }),
        ]),
      );
      expect(triggeringCaster.origin.spellcasting?.spellSlots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            spellLevel: magicMissileTriggerSlotLevel,
            expended: 0,
          }),
        ]),
      );
    }
  });

  test("Dispel Magic projects Bard, Cleric, Druid, Sorcerer, Warlock, and Wizard access and ends a tracked ongoing spell effect", () => {
    const dispelMagicCases: readonly DispelMagicClassAccessCase[] = [
      {
        sourceUnitId: "class_bard",
        casterId: dispelMagicBardId,
        build: levelFiveBardBuild({ preparedSpells: [dispelMagicSpellId] }),
      },
      {
        sourceUnitId: "class_cleric",
        casterId: dispelMagicClericId,
        build: levelFiveClericBuild({ preparedSpells: [dispelMagicSpellId] }),
      },
      {
        sourceUnitId: "class_druid",
        casterId: dispelMagicDruidId,
        build: levelFiveDruidBuild({ preparedSpells: [dispelMagicSpellId] }),
        druidWildShapeKnownFormStatBlockIds:
          levelFiveDruidWildShapeKnownFormStatBlockIds,
      },
      {
        sourceUnitId: "class_sorcerer",
        casterId: dispelMagicSorcererId,
        build: levelFiveSorcererBuild({
          preparedSpells: [dispelMagicSpellId],
        }),
      },
      {
        sourceUnitId: "class_warlock",
        casterId: dispelMagicWarlockId,
        build: levelFiveWarlockBuild({
          preparedSpells: [dispelMagicSpellId],
        }),
      },
      {
        sourceUnitId: "class_wizard",
        casterId: dispelMagicWizardId,
        build: levelFiveWizardBuild({
          preparedSpells: [dispelMagicSpellId],
        }),
      },
    ];

    for (const dispelMagicCase of dispelMagicCases) {
      expectDispelMagicClassAccess(dispelMagicCase);

      const druidWildShapeKnownFormStatBlockIds =
        dispelMagicCase.druidWildShapeKnownFormStatBlockIds;
      const objectId = battleObjectId(
        `object:l5-tracer-dispel-${dispelMagicCase.sourceUnitId}`,
      );
      const baseState = battleFromSheets({
        battleIdText: `battle:l5-tracer-dispel-${dispelMagicCase.sourceUnitId}`,
        characters: [
          characterSheet({
            characterIdText: `character:l5-tracer-dispel-${dispelMagicCase.sourceUnitId}`,
            build: dispelMagicCase.build,
            combatantId: dispelMagicCase.casterId,
            initiative: 20,
            ...(druidWildShapeKnownFormStatBlockIds === undefined
              ? {}
              : {
                  druidWildShapeKnownFormStatBlockIds:
                    druidWildShapeKnownFormStatBlockIds,
                }),
          }),
        ],
        monsters: [],
      });
      const state: BattleState = {
        ...baseState,
        lightEmitters: [
          trackedObjectSpellLightEmitter({
            objectId,
            sourceCombatantId: dispelMagicCase.casterId,
          }),
        ],
      };
      const act = spellSlotActForProcedure(
        state,
        dispelMagicSpellId,
        dispelMagicCastLevel,
        "ongoingSpellEnd",
      );
      const target = requireHoleFromList(
        act.initialHoles,
        "ongoingSpellTargetChoice",
      );

      expect(target).toMatchObject({
        requiresTableSpatialFact: true,
        choices: expect.arrayContaining([{ kind: "object", objectId }]),
      });

      const resolved = requireResolved(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            ongoingSpellTargetFill({
              hole: target,
              casterId: dispelMagicCase.casterId,
              target: { kind: "object", objectId },
            }),
          ],
        }),
      );
      const caster = requireCharacterCombatant(
        resolved.state,
        dispelMagicCase.casterId,
      );

      expect(resolved.state.lightEmitters).toEqual([]);
      expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
      expect(caster.origin.spellcasting?.spellSlots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            spellLevel: dispelMagicCastLevel,
            expended: 1,
          }),
        ]),
      );
    }
  });

  test("Fireball projects Sorcerer and Wizard access and resolves point-origin Sphere Fire damage with unattended object ignition", () => {
    const fireballCases = [
      {
        sourceUnitId: "class_sorcerer",
        casterId: fireballSorcererId,
        build: levelFiveSorcererBuild({
          preparedSpells: [fireballSpellId],
        }),
      },
      {
        sourceUnitId: "class_wizard",
        casterId: fireballWizardId,
        build: levelFiveWizardBuild({
          preparedSpells: [fireballSpellId],
        }),
      },
    ] as const satisfies ReadonlyArray<FireballClassAccessCase>;

    for (const fireballCase of fireballCases) {
      expectFireballClassAccess(fireballCase);

      const state = battleFromSheets({
        battleIdText: `battle:l5-tracer-fireball-${fireballCase.sourceUnitId}`,
        characters: [
          characterSheet({
            characterIdText: `character:l5-tracer-fireball-${fireballCase.sourceUnitId}`,
            build: fireballCase.build,
            combatantId: fireballCase.casterId,
            initiative: 20,
          }),
        ],
        monsters: [
          monsterBattleInput(
            fireballTargetId,
            10,
            srdStatBlock("stat_block_sphinx_of_wonder"),
          ),
        ],
      });
      const act = spellSlotActForProcedure(
        state,
        fireballSpellId,
        fireballCastLevel,
        "saveGatedDamage",
      );
      const savingThrow = requireHoleFromList(
        act.initialHoles,
        "savingThrowOutcome",
      );

      expect(savingThrow).toMatchObject({
        label: "Fireball point-origin Sphere Saving Throw outcomes",
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
      });

      const saveFill = fireballSavingThrowOutcomeFill({
        casterId: fireballCase.casterId,
        hole: savingThrow,
        outcomes: [{ targetId: fireballTargetId, succeeded: false }],
        objectIgnitionFacts: [
          {
            objectId: fireballObjectId,
            disposition: { kind: "flammableUnattended" },
          },
        ],
      });
      const damageRoll = requireHole(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [saveFill],
        }),
        "rolledDice",
      );
      const targetBeforeDamage = requireCombatant(state, fireballTargetId);
      const resolved = requireResolved(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            saveFill,
            damageRollFillWithGroups(damageRoll, [fireballDamageRollResults]),
          ],
        }),
      );
      const caster = requireCharacterCombatant(
        resolved.state,
        fireballCase.casterId,
      );

      expect(
        Number(requireCombatant(resolved.state, fireballTargetId).hp),
      ).toBe(Number(targetBeforeDamage.hp) - fireballDamageTotal);
      expect(resolved.objectIgnitions).toEqual([
        {
          kind: "startsBurning",
          objectId: fireballObjectId,
          sourceCombatantId: fireballCase.casterId,
          sourceSpellId: fireballSpellId,
        },
      ]);
      expect(snapshotBattle(resolved.state).turn.actionResources).toEqual([]);
      expect(caster.origin.spellcasting?.spellSlots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            spellLevel: fireballCastLevel,
            expended: 1,
          }),
        ]),
      );
    }
  });

  test("Fly projects Sorcerer, Warlock, and Wizard access and grants a fixed hovering Fly Speed", () => {
    const flyCases = [
      {
        sourceUnitId: "class_sorcerer",
        casterId: flySorcererId,
        build: levelFiveSorcererBuild({
          preparedSpells: [flySpellId],
        }),
      },
      {
        sourceUnitId: "class_warlock",
        casterId: flyWarlockId,
        build: levelFiveWarlockBuild({
          preparedSpells: [flySpellId],
        }),
      },
      {
        sourceUnitId: "class_wizard",
        casterId: flyWizardId,
        build: levelFiveWizardBuild({
          preparedSpells: [flySpellId],
        }),
      },
    ] as const satisfies ReadonlyArray<FlyClassAccessCase>;

    for (const flyCase of flyCases) {
      expectFlyClassAccess(flyCase);

      const state = battleFromSheets({
        battleIdText: `battle:l5-tracer-fly-${flyCase.sourceUnitId}`,
        characters: [
          characterSheet({
            characterIdText: `character:l5-tracer-fly-${flyCase.sourceUnitId}`,
            build: flyCase.build,
            combatantId: flyCase.casterId,
            initiative: 20,
          }),
        ],
        monsters: [],
      });
      const act = spellSlotActForProcedure(
        state,
        flySpellId,
        flyCastLevel,
        "scalarBuff",
      );
      const target = requireHoleFromList(act.initialHoles, "targetChoice");

      expect(target.choices).toContain(flyCase.casterId);

      const resolved = requireResolved(
        resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [
            knownWillingSpellTargetFill(
              target,
              flySpellId,
              flyCase.casterId,
              flyCase.casterId,
            ),
          ],
        }),
      );
      const caster = requireCharacterCombatant(
        resolved.state,
        flyCase.casterId,
      );

      expect(resolved.snapshot.combatants).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            combatantId: flyCase.casterId,
            concentrating: true,
            movement: expect.objectContaining({
              speedKinds: expect.arrayContaining([
                expect.objectContaining({
                  kind: "fly",
                  speedFeet: flySpeedFeet,
                  remainingFeet: flySpeedFeet,
                }),
              ]),
            }),
          }),
        ]),
      );
      expect(caster.activeEffects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: "specialSpeedGrant",
            sourceSpellId: flySpellId,
            sourceCombatantId: flyCase.casterId,
            speedKind: "fly",
            speed: { kind: "fixed", speedFeet: movementFeet(flySpeedFeet) },
            hover: true,
          }),
        ]),
      );
      expect(caster.origin.spellcasting?.spellSlots).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            spellLevel: flyCastLevel,
            expended: 1,
          }),
        ]),
      );
    }
  });

  test("Glyph of Warding projects Bard, Cleric, and Wizard access while one-hour creation stays outside Magic Action discovery", () => {
    const glyphOfWardingCases = [
      {
        sourceUnitId: "class_bard",
        casterId: glyphOfWardingBardId,
        build: levelFiveBardBuild({
          preparedSpells: [glyphOfWardingSpellId],
        }),
      },
      {
        sourceUnitId: "class_cleric",
        casterId: glyphOfWardingClericId,
        build: levelFiveClericBuild({
          preparedSpells: [glyphOfWardingSpellId],
        }),
      },
      {
        sourceUnitId: "class_wizard",
        casterId: glyphOfWardingWizardId,
        build: levelFiveWizardBuild({
          preparedSpells: [glyphOfWardingSpellId],
        }),
      },
    ] as const satisfies ReadonlyArray<GlyphOfWardingClassAccessCase>;

    for (const glyphOfWardingCase of glyphOfWardingCases) {
      expectGlyphOfWardingClassAccess(glyphOfWardingCase);

      const state = battleFromSheets({
        battleIdText: `battle:l5-tracer-glyph-of-warding-${glyphOfWardingCase.sourceUnitId}`,
        characters: [
          characterSheet({
            characterIdText: `character:l5-tracer-glyph-of-warding-${glyphOfWardingCase.sourceUnitId}`,
            build: glyphOfWardingCase.build,
            combatantId: glyphOfWardingCase.casterId,
            initiative: 20,
          }),
        ],
        monsters: [],
      });
      const glyphCreationActs = discoverBattleActs(state).filter(
        (candidate) =>
          candidate.subject.tag === "actionSpell" &&
          candidate.subject.mode.tag === "cast" &&
          candidate.subject.invocation.tag === "spellSlot" &&
          candidate.subject.invocation.spellId === glyphOfWardingSpellId,
      );

      expect(glyphCreationActs).toEqual([]);
    }
  });

  test("Sorcerous Restoration uses the sheet rest lifecycle to recover half level rounded down once per Long Rest", () => {
    const sheet = requireRight(
      createFreshCharacterSheet({
        characterId: characterSheetId(
          "character:l5-tracer-sorcerous-restoration",
        ),
        build: levelFiveSorcererBuild(),
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

function expectCounterspellClassAccess(input: {
  readonly sourceUnitId: UnitRecord["id"];
  readonly build: CharacterBuild;
}): void {
  expect(input.build.spellcasting?.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceUnitId: input.sourceUnitId,
        preparedSpells: expect.arrayContaining([counterspellSpellId]),
      }),
    ]),
  );
  if (input.sourceUnitId === "class_warlock") {
    expect(input.build.spellcasting?.slotPools).toMatchObject({
      pactMagic: {
        kind: "pactMagic",
        slotLevel: counterspellCastLevel,
        count: 2,
      },
    });
    return;
  }
  expect(input.build.spellcasting?.slotPools).toMatchObject({
    spellcasting: {
      kind: "spellcasting",
      slots: expect.arrayContaining([
        expect.objectContaining({
          spellLevel: counterspellCastLevel,
          count: 2,
        }),
      ]),
    },
  });
}

function expectDispelMagicClassAccess(input: {
  readonly sourceUnitId: UnitRecord["id"];
  readonly build: CharacterBuild;
}): void {
  expect(input.build.spellcasting?.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceUnitId: input.sourceUnitId,
        preparedSpells: expect.arrayContaining([dispelMagicSpellId]),
      }),
    ]),
  );
  if (input.sourceUnitId === "class_warlock") {
    expect(input.build.spellcasting?.slotPools).toMatchObject({
      pactMagic: {
        kind: "pactMagic",
        slotLevel: dispelMagicCastLevel,
        count: 2,
      },
    });
    return;
  }
  expect(input.build.spellcasting?.slotPools).toMatchObject({
    spellcasting: {
      kind: "spellcasting",
      slots: expect.arrayContaining([
        expect.objectContaining({
          spellLevel: dispelMagicCastLevel,
          count: 2,
        }),
      ]),
    },
  });
}

function expectFireballClassAccess(input: {
  readonly sourceUnitId: UnitRecord["id"];
  readonly build: CharacterBuild;
}): void {
  expect(input.build.spellcasting?.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceUnitId: input.sourceUnitId,
        preparedSpells: expect.arrayContaining([fireballSpellId]),
      }),
    ]),
  );
  expect(input.build.spellcasting?.slotPools).toMatchObject({
    spellcasting: {
      kind: "spellcasting",
      slots: expect.arrayContaining([
        expect.objectContaining({
          spellLevel: fireballCastLevel,
          count: 2,
        }),
      ]),
    },
  });
}

function expectHasteClassAccess(input: {
  readonly sourceUnitId: UnitRecord["id"];
  readonly build: CharacterBuild;
}): void {
  expect(input.build.spellcasting?.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceUnitId: input.sourceUnitId,
        preparedSpells: expect.arrayContaining([hasteSpellId]),
      }),
    ]),
  );
  expect(input.build.spellcasting?.slotPools).toMatchObject({
    spellcasting: {
      kind: "spellcasting",
      slots: expect.arrayContaining([
        expect.objectContaining({
          spellLevel: hasteCastLevel,
          count: 2,
        }),
      ]),
    },
  });
}

function expectFlyClassAccess(input: {
  readonly sourceUnitId: UnitRecord["id"];
  readonly build: CharacterBuild;
}): void {
  expect(input.build.spellcasting?.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceUnitId: input.sourceUnitId,
        preparedSpells: expect.arrayContaining([flySpellId]),
      }),
    ]),
  );
  if (input.sourceUnitId === "class_warlock") {
    expect(input.build.spellcasting?.slotPools).toMatchObject({
      pactMagic: {
        kind: "pactMagic",
        slotLevel: flyCastLevel,
        count: 2,
      },
    });
    return;
  }
  expect(input.build.spellcasting?.slotPools).toMatchObject({
    spellcasting: {
      kind: "spellcasting",
      slots: expect.arrayContaining([
        expect.objectContaining({
          spellLevel: flyCastLevel,
          count: 2,
        }),
      ]),
    },
  });
}

function expectGlyphOfWardingClassAccess(input: {
  readonly sourceUnitId: UnitRecord["id"];
  readonly build: CharacterBuild;
}): void {
  expect(input.build.spellcasting?.sources).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        sourceUnitId: input.sourceUnitId,
        preparedSpells: expect.arrayContaining([glyphOfWardingSpellId]),
      }),
    ]),
  );
  expect(input.build.spellcasting?.slotPools).toMatchObject({
    spellcasting: {
      kind: "spellcasting",
      slots: expect.arrayContaining([
        expect.objectContaining({
          spellLevel: glyphOfWardingCastLevel,
          count: 2,
        }),
      ]),
    },
  });
}

function trackedObjectSpellLightEmitter(input: {
  readonly objectId: ReturnType<typeof battleObjectId>;
  readonly sourceCombatantId: CombatantId;
}): BattleTrackedOngoingSpellLightEmitter {
  return {
    kind: "spellLightEmitter",
    sourceSpellId: continualFlameSpellId,
    sourceCombatantId: input.sourceCombatantId,
    sourceEffectId: battleSpellEffectOccurrenceId(
      `${input.sourceCombatantId}:${continualFlameSpellId}:${input.objectId}:l5-tracer`,
    ),
    sourceSpellLevel: spellEffectLevel(2),
    attachment: { kind: "object", objectId: input.objectId },
    emission: {
      kind: "brightAndDim",
      brightRadiusFeet: movementFeet(20),
      dimAdditionalFeet: movementFeet(20),
    },
    opaqueCoverInteraction: { kind: "blocksEmission" },
    expiresAt: { kind: "untilDispelled" },
  };
}

function spellEffectLevel(
  value: number,
): BattleTrackedOngoingSpellLightEmitter["sourceSpellLevel"] {
  if (!Number.isInteger(value) || value < 0 || value > 9) {
    throw new Error(`Invalid spell effect level test fixture: ${value}.`);
  }
  // BattleSpellEffectLevel is a number brand erased at runtime; the guard above
  // enforces the same integer 0-9 range used by the battle-runtime parser.
  return value as BattleTrackedOngoingSpellLightEmitter["sourceSpellLevel"];
}

function ongoingSpellTargetFill(input: {
  readonly hole: Extract<
    BattleHole,
    { readonly kind: "ongoingSpellTargetChoice" }
  >;
  readonly casterId: CombatantId;
  readonly target: OngoingSpellTarget;
}): OngoingSpellTargetChoiceFill {
  return {
    kind: "ongoingSpellTargetChoice",
    holeId: input.hole.holeId,
    value: input.target,
    spatialFacts: [
      ongoingSpellTargetWithinRangeFact({
        casterId: input.casterId,
        target: input.target,
      }),
    ],
  };
}

function fireballSavingThrowOutcomeFill(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>;
  readonly casterId: CombatantId;
  readonly outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[];
  readonly objectIgnitionFacts: readonly {
    readonly objectId: ReturnType<typeof battleObjectId>;
    readonly disposition: BattleObjectIgnitionDisposition;
  }[];
}): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: input.hole.holeId,
    value: {
      area: {
        kind: "fireballArea",
        originAnchorId: input.casterId,
        affectedTargetIds: input.outcomes.map((outcome) => outcome.targetId),
        objectIgnitionFacts: input.objectIgnitionFacts,
      },
      outcomes: input.outcomes,
    },
  };
}

function ongoingSpellTargetWithinRangeFact(input: {
  readonly casterId: CombatantId;
  readonly target: OngoingSpellTarget;
}): OngoingSpellTargetWithinRangeFact {
  return {
    kind: "ongoingSpellTargetWithinRange",
    casterId: input.casterId,
    spellId: dispelMagicSpellId,
    target: input.target,
    rangeFeet: movementFeet(120),
  };
}

function startCounterspellableMagicMissile(input: {
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly targetId: CombatantId;
  readonly reactorId: CombatantId;
}): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  const act = spellSlotActForProcedure(
    input.state,
    magicMissileSpellId,
    magicMissileTriggerSlotLevel,
    "repeatedDamageAllocation",
  );
  if (act.subject.actorId !== input.casterId) {
    throw new Error("Expected Magic Missile action from triggering caster.");
  }
  const allocation = requireHoleFromList(
    act.initialHoles,
    "spellTargetAllocation",
  );
  const result = resolveBattleSubject({
    state: input.state,
    subject: act.subject,
    fills: [
      magicMissileTargetAllocationFill({
        hole: allocation,
        casterId: input.casterId,
        targetId: input.targetId,
        dartCount: allocation.allocationCount,
      }),
      spellCastReactionFactsFill([
        counterspellTriggerFact({
          reactorId: input.reactorId,
          casterId: input.casterId,
        }),
      ]),
    ],
  });
  expect(result).toMatchObject({
    tag: "needsHoles",
    snapshot: { pendingInterrupt: { trigger: "spellCast" } },
  });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected Counterspell Reaction window.");
  }
  return result;
}

function magicMissileTargetAllocationFill(input: {
  readonly hole: Extract<
    BattleHole,
    { readonly kind: "spellTargetAllocation" }
  >;
  readonly casterId: CombatantId;
  readonly targetId: CombatantId;
  readonly dartCount: number;
}): Extract<BattleFill, { readonly kind: "spellTargetAllocation" }> {
  return {
    kind: "spellTargetAllocation",
    holeId: input.hole.holeId,
    value: {
      allocations: [{ targetId: input.targetId, count: input.dartCount }],
    },
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: input.casterId,
        targetId: input.targetId,
        spellId: magicMissileSpellId,
      },
    ],
  };
}

type CounterspellTriggerFact = Extract<
  Extract<
    BattleFill,
    { readonly kind: "targetSpatialFacts" }
  >["spatialFacts"][number],
  { readonly kind: "counterspellTriggerCasterVisibleWithinRange" }
>;

function counterspellTriggerFact(input: {
  readonly reactorId: CombatantId;
  readonly casterId: CombatantId;
}): CounterspellTriggerFact {
  return {
    kind: "counterspellTriggerCasterVisibleWithinRange",
    reactorId: input.reactorId,
    casterId: input.casterId,
    spellId: counterspellSpellId,
    rangeFeet: movementFeet(60),
  };
}

function spellCastReactionFactsFill(
  facts: readonly CounterspellTriggerFact[],
): Extract<BattleFill, { readonly kind: "targetSpatialFacts" }> {
  return {
    kind: "targetSpatialFacts",
    holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
    spatialFacts: facts,
  };
}

type CounterspellReactionChoice = Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "castTriggeredReactionSpell" }
>;

function requireCounterspellChoice(
  result: Extract<BattleResolutionResult, { readonly tag: "needsHoles" }>,
  reactorId: CombatantId,
): CounterspellReactionChoice {
  const choice = result.snapshot.pendingInterrupt?.choices.find(
    (candidate): candidate is CounterspellReactionChoice =>
      candidate.kind === "castTriggeredReactionSpell" &&
      candidate.reactorId === reactorId &&
      candidate.invocation.tag === "spellSlot" &&
      candidate.invocation.spellId === counterspellSpellId &&
      candidate.invocation.procedure === "counterspell" &&
      Number(candidate.invocation.slotLevel) === counterspellCastLevel,
  );
  if (choice === undefined) {
    throw new Error("Expected Counterspell Reaction choice.");
  }
  return choice;
}

function counterspellDecision(
  reactorId: CombatantId,
  choice: CounterspellReactionChoice,
  fills: readonly BattleFill[],
): Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"] {
  return {
    kind: "resolve",
    responderId: reactorId,
    choice: {
      kind: "castTriggeredReactionSpell",
      invocation: choice.invocation,
      fills,
    },
  };
}

function interruptDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "interruptDecision" }>,
  value: Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  return { kind: "interruptDecision", holeId: hole.holeId, value };
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
        build: levelFiveWizardBuild({
          preparedSpells: [protectionFromEnergySpellId],
        }),
        combatantId: wizardId,
        initiative: 20,
      }),
      characterSheet({
        characterIdText: `character:l5-tracer-protection-from-energy-warded-${damageType}`,
        build: levelFiveMartialBuild({
          classUnitId: "class_fighter",
          weaponUnitId: "weapon_longsword",
        }),
        combatantId: wardedId,
        initiative: 5,
      }),
    ],
    monsters: [
      monsterBattleInput(monsterId, 10, elementalTouchStatBlock(damageType)),
    ],
  });
  const act = spellSlotActForProcedure(
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
        protectionFromEnergyDamageTypeChoiceFill(damageTypeHole, "fire"),
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
}): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
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

function protectionFromEnergyDamageTypeChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "damageTypeChoice" }>,
  value: Extract<
    DamageType,
    "acid" | "cold" | "fire" | "lightning" | "thunder"
  >,
): Extract<BattleFill, { readonly kind: "damageTypeChoice" }> {
  return { kind: "damageTypeChoice", holeId: hole.holeId, value };
}
