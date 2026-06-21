import {
  breakBattleConcentration,
  combatantId,
  endTurn,
  resolveBattleSubject,
  snapshotBattle,
  type BattleCreatureState,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
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
import { hasCondition } from "@dnd/shared-algebras/conditions-algebra";
import { Hp, resourceCount } from "@dnd/shared/types";
import type { DamageType, StatBlockRecord } from "@dnd/surface/surface/types";
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
  levelFiveMartialBuild,
  levelFiveSorcererBuild,
  levelFiveWizardBuild,
  monsterBattleInput,
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
          maximumHp: 38,
        }),
        characterSheet({
          characterIdText: "character:l5-tracer-cunning-strike-ally",
          build: levelFiveMartialBuild({
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
    const state = battleFromSheets({
      battleIdText: "battle:l5-tracer-haste",
      characters: [
        characterSheet({
          characterIdText: "character:l5-tracer-haste",
          build: levelFiveWizardBuild({ preparedSpells: [hasteSpellId] }),
          combatantId: wizardId,
          initiative: 20,
          maximumHp: 32,
        }),
      ],
      monsters: [
        monsterBattleInput(monsterId, 10, srdStatBlock("stat_block_skeleton")),
      ],
    });
    const act = spellSlotActForProcedure(
      state,
      hasteSpellId,
      3,
      "hastePositive",
    );
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
        build: levelFiveSorcererBuild(),
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
        maximumHp: 32,
      }),
      characterSheet({
        characterIdText: `character:l5-tracer-protection-from-energy-warded-${damageType}`,
        build: levelFiveMartialBuild({
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

function ordinaryAttackDamageFills(input: {
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

function protectionFromEnergyDamageTypeChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "damageTypeChoice" }>,
  value: Extract<
    DamageType,
    "acid" | "cold" | "fire" | "lightning" | "thunder"
  >,
): Extract<BattleFill, { readonly kind: "damageTypeChoice" }> {
  return { kind: "damageTypeChoice", holeId: hole.holeId, value };
}
