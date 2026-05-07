// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT7 fighter_second_wind barbarian_reckless_attack rogue_evasion
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT8 fighter_action_surge fighter_improved_critical barbarian_rage rogue_cunning_action rogue_uncanny_dodge rogue_sneak_attack
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT14 acid_splash mage_armor magic_missile ray_of_frost
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT22 shield
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT25 healing_word
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT21 mycelium_step
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT18 defense
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT27 feat_archery
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import myceliumStepInput from "../../../plans/unit-profile-coverage/fixtures/classic-non-srd/mycelium_step.json";
import {
  abilityModifier,
  defaultArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import { classLevel } from "@dnd/shared/types";
import {
  attackBonus,
  DieRollResult,
  Hp,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord, UnitRecord } from "@dnd/surface/surface/types";

import {
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  PASSIVE_ARMOR_CLASS_BONUS_SUPPORT_PROFILE,
  PASSIVE_RANGED_ATTACK_ROLL_BONUS_SUPPORT_PROFILE,
  battleCombatantSide,
  battleId,
  battleUnitRefWithSupportProfiles,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  resolveBattleReaction,
  resolveBattleSubject,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  startBattle,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
  type AvailableBattleAct,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleSubject,
  type CombatantId,
  type SupportedSpellAct,
} from "./index.ts";
import {
  ALTERNATE_ACTION_COST_ACTIONS,
  parseSupportedUnitFeatureProfile,
  type ClassicNonSrdMechanicsUnit,
} from "./unit-feature-support.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("QMBT7 Unit profile admission test Unit catalog must build.");
}
const unitLibrary = unitCatalogResult.catalog;
const fighterSecondWindUnitId = "fighter_second_wind";
const fighterActionSurgeUnitId = "fighter_action_surge";
const fighterImprovedCriticalUnitId = "fighter_improved_critical";
const barbarianRageUnitId = "barbarian_rage";
const barbarianRecklessAttackUnitId = "barbarian_reckless_attack";
const rogueCunningActionUnitId = "rogue_cunning_action";
const rogueEvasionUnitId = "rogue_evasion";
const rogueUncannyDodgeUnitId = "rogue_uncanny_dodge";
const rogueSneakAttackUnitId = "rogue_sneak_attack";
const defenseUnitId = "defense";
const myceliumStepUnitId = "mycelium_step";
const archeryUnitId = "feat_archery";
const acidSplashUnitId = "acid_splash";
const fireBoltUnitId = "fire_bolt";
const mageArmorUnitId = "mage_armor";
const magicMissileUnitId = "magic_missile";
const healingWordUnitId = "healing_word";
const rayOfFrostUnitId = "ray_of_frost";
const shieldUnitId = "shield";
const spellCasterId = combatantId("unit-profile-spell-caster");
const spellTargetId = combatantId("unit-profile-spell-target");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");
type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};
type BonusActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionSpell" }
  >;
};
type AttackAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >;
};
type PassiveFeatUnit = Extract<UnitRecord, { readonly kind: "feat" }> & {
  readonly mechanics: Extract<
    Extract<UnitRecord, { readonly kind: "feat" }>["mechanics"],
    { readonly family: "passive" }
  >;
};

describe("QMBT7 deterministic Unit profile admission", () => {
  test("fighter_second_wind is admitted and projected through production feature support", () => {
    const unit = unitLibrary.requireUnit(fighterSecondWindUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "fighter", level: classLevel(1) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({ unitId: fighterSecondWindUnitId, supportProfiles: [] }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "selfBonusActionHealing",
        unit,
        dice: 1,
        dieSize: 10,
        flatBase: 1,
        flatPerLevel: 1,
        startingAtLevel: 1,
        className: "fighter",
        classLevel: classLevel(1),
      }),
    );
  });

  test("barbarian_reckless_attack is admitted and projected through production feature support", () => {
    const unit = unitLibrary.requireUnit(barbarianRecklessAttackUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "barbarian", level: classLevel(2) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: barbarianRecklessAttackUnitId,
        supportProfiles: [],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "ongoingFeature",
        unit,
        activationTrigger: "firstAttackRoll",
        spendsUse: false,
        lifecycle: {
          kind: "turnBoundary",
          initialExpiration: "startOfNextTurn",
          earlyEndConditions: [],
          earlyEndArmorCategories: [],
          extensionTriggers: [],
        },
        actionRestrictions: [],
        rollModifiers: [
          {
            mode: "advantage",
            affects: "selfRoll",
            on: "attackRoll",
            abilityFilter: ["str"],
          },
          {
            mode: "advantage",
            affects: "rollsAgainstSelf",
            on: "attackRoll",
          },
        ],
        damageModifiers: [],
        resistances: [],
      }),
    );
  });

  test("rogue_evasion is admitted and projected through production feature support", () => {
    const unit = unitLibrary.requireUnit(rogueEvasionUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "rogue", level: classLevel(7) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: rogueEvasionUnitId,
        supportProfiles: [SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "saveDamageReplacement",
        unit,
        ability: "dex",
        requiredSuccessDamage: "half",
        onSuccess: "none",
        onFail: "half",
        suppressedByCondition: "incapacitated",
      }),
    );
  });
});

describe("QMBT8 deterministic Unit feature admission expansion", () => {
  test("fighter_action_surge is admitted and projected through production feature support", () => {
    const unit = unitLibrary.requireUnit(fighterActionSurgeUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "fighter", level: classLevel(2) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({ unitId: fighterActionSurgeUnitId, supportProfiles: [] }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "extraActionGrant",
        unit,
        restriction: { kind: "exclude", actions: ["magic"] },
      }),
    );
  });

  test("fighter_improved_critical is admitted through production feature support", () => {
    const unit = unitLibrary.requireUnit(fighterImprovedCriticalUnitId);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: fighterImprovedCriticalUnitId,
        supportProfiles: [WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE],
      }),
    );
  });

  test("barbarian_rage is admitted and projected through production feature support", () => {
    const unit = unitLibrary.requireUnit(barbarianRageUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "barbarian", level: classLevel(1) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({ unitId: barbarianRageUnitId, supportProfiles: [] }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "ongoingFeature",
        unit,
        activationTrigger: "bonusAction",
        spendsUse: true,
        lifecycle: {
          kind: "roundExtended",
          initialExpiration: "endOfNextTurn",
          maximumDurationRounds: 100,
          earlyEndConditions: ["incapacitated"],
          earlyEndArmorCategories: ["heavy"],
          extensionTriggers: [
            "attackRollAgainstEnemy",
            "bonusAction",
            "enemySavingThrow",
          ],
        },
        concentrationEffect: "breakAndPrevent",
        actionRestrictions: ["spellcasting"],
        rollModifiers: [],
        damageModifiers: [
          {
            amount: 2,
            abilityFilter: ["str"],
          },
        ],
        resistances: ["bludgeoning", "piercing", "slashing"],
      }),
    );
  });

  test("rogue_cunning_action is admitted through production feature support", () => {
    const unit = unitLibrary.requireUnit(rogueCunningActionUnitId);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: rogueCunningActionUnitId,
        supportProfiles: [
          {
            kind: "alternateActionCost",
            from: {
              kind: "standardAction",
              actions: ALTERNATE_ACTION_COST_ACTIONS,
            },
            to: { kind: "bonusAction" },
          },
        ],
      }),
    );
  });

  test("rogue_uncanny_dodge is admitted and projected through production feature support", () => {
    const unit = unitLibrary.requireUnit(rogueUncannyDodgeUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "rogue", level: classLevel(5) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: rogueUncannyDodgeUnitId,
        supportProfiles: [REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "reactionRollOrDamageReduction",
        unit,
        classLevel: classLevel(5),
        modifiers: [
          {
            kind: "attackDamageReduction",
            requiresVisibleAttacker: true,
            reduction: { kind: "halfDamage" },
          },
        ],
      }),
    );
  });

  test("rogue_sneak_attack is admitted and projected through production feature support", () => {
    const unit = unitLibrary.requireUnit(rogueSneakAttackUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, [
      { className: "rogue", level: classLevel(1) },
    ]);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: rogueSneakAttackUnitId,
        supportProfiles: [ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "attackDamageRider",
        unit,
        optional: true,
        usageLimit: "oncePerTurn",
        weaponFilter: "finesseOrRanged",
        eligibility:
          "advantageOrNonIncapacitatedAllyWithin5ftOfTargetWithoutDisadvantage",
        classLevel: classLevel(1),
        dieSize: 6,
        diceByLevel: [
          { atLevel: 1, count: 1 },
          { atLevel: 3, count: 2 },
          { atLevel: 5, count: 3 },
          { atLevel: 7, count: 4 },
          { atLevel: 9, count: 5 },
          { atLevel: 11, count: 6 },
          { atLevel: 13, count: 7 },
          { atLevel: 15, count: 8 },
          { atLevel: 17, count: 9 },
          { atLevel: 19, count: 10 },
        ],
      }),
    );
  });
});

describe("QMBT18 deterministic unsupported feature profile slice", () => {
  test("defense is admitted and projected as a passive Armor Class bonus while wearing armor", () => {
    const unit = unitLibrary.requireUnit(defenseUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, []);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: defenseUnitId,
        supportProfiles: [PASSIVE_ARMOR_CLASS_BONUS_SUPPORT_PROFILE],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "passiveArmorClassBonus",
        unit,
        armorClass: {
          bonus: 1,
          condition: {
            kind: "wearingArmor",
            categories: ["light", "medium", "heavy"],
          },
        },
      }),
    );
  });

  test("archery is admitted and projected as a passive ranged weapon attack-roll bonus", () => {
    const unit = unitLibrary.requireUnit(archeryUnitId);
    const profile = parseSupportedUnitFeatureProfile(unit, []);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: archeryUnitId,
        supportProfiles: [PASSIVE_RANGED_ATTACK_ROLL_BONUS_SUPPORT_PROFILE],
      }),
    );
    expect(profile).toEqual(
      expect.objectContaining({
        kind: "passiveRangedAttackRollBonus",
        unit,
        attackRoll: {
          bonus: 2,
          weaponFilter: {
            kind: "weaponCategory",
            category: "ranged",
          },
        },
      }),
    );
  });

  test("archery support projection adds +2 to ranged weapon attack rolls", () => {
    const state = archeryBattle({
      attack: zeroAbilityWeaponAttack("weapon_shortbow"),
    });
    const attackRollHole = weaponAttackRollHole({
      state,
      attackName: "Shortbow",
      actorId: spellCasterId,
      targetId: spellTargetId,
    });

    expect(attackRollHole).toMatchObject({
      kind: "attackRoll",
      label: "Shortbow attack roll",
      attackBonus: 2,
      attack: {
        kind: "weapon",
        weapon: { id: "weapon_shortbow", usage: "ranged" },
      },
    });
  });

  test("archery support projection does not add +2 to melee weapon attack rolls", () => {
    const state = archeryBattle({
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const attackRollHole = weaponAttackRollHole({
      state,
      attackName: "Longsword",
      actorId: spellCasterId,
      targetId: spellTargetId,
    });

    expect(attackRollHole).toMatchObject({
      kind: "attackRoll",
      label: "Longsword attack roll",
      attackBonus: 0,
      attack: {
        kind: "weapon",
        weapon: { id: "weapon_longsword", usage: "melee" },
      },
    });
  });

  test("archery support gate rejects adjacent passive roll bonus shapes", () => {
    const unit = archeryFeatureUnit();
    const [effect] = unit.mechanics.grants;
    if (effect?.kind !== "modify_roll_numeric") {
      throw new Error("Expected Archery numeric roll modifier.");
    }
    const adjacentPassiveRollUnits = [
      {
        ...unit,
        id: "test_archery_saving_throw_bonus",
        mechanics: {
          ...unit.mechanics,
          grants: [{ ...effect, on: ["saving_throw"] }],
        },
      },
      {
        ...unit,
        id: "test_archery_melee_attack_bonus",
        mechanics: {
          ...unit.mechanics,
          grants: [
            {
              ...effect,
              weaponFilter: { kind: "weapon_category", category: "melee" },
            },
          ],
        },
      },
    ] as const satisfies readonly UnitRecord[];

    for (const adjacentUnit of adjacentPassiveRollUnits) {
      expect(
        battleUnitRefWithSupportProfiles({
          unitRef: { unitId: adjacentUnit.id },
          unit: adjacentUnit,
        }),
      ).toEqual(
        Either.left({
          tag: "battleUnitSupportProfileIssue",
          message: `Unsupported battle passive ranged attack-roll bonus Unit hook: ${adjacentUnit.id}.`,
        }),
      );
      expect(parseSupportedUnitFeatureProfile(adjacentUnit, [])).toBeNull();
    }
  });
});

describe("QMBT21 Classic non-SRD deterministic feature profile slice", () => {
  test("mycelium_step is admitted and projected through production alternate action cost support", () => {
    const unit = mechanicsOnlyClassicUnit(myceliumStepInput);

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(
      Either.right({
        unitId: myceliumStepUnitId,
        supportProfiles: [
          {
            kind: "alternateActionCost",
            from: {
              kind: "standardAction",
              actions: ["dash"],
            },
            to: { kind: "bonusAction" },
          },
        ],
      }),
    );
  });
});

describe("QMBT14 deterministic Spell Unit admission tracer", () => {
  test("magic_missile is admitted through catalog spell access and projected as a prepared slot spell", () => {
    const spell = spellRecord(magicMissileUnitId);
    const act = spellAct({
      state: spellBattle({ preparedSpells: [spell] }),
      spellId: magicMissileUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      spellId: magicMissileUnitId,
      spellActId: "preparedSlotSpell:magic_missile:slot:1",
    });
    expect(spellActInvocation(act)).toEqual(
      expect.objectContaining({
        kind: "preparedSlotSpell",
        spell,
        slotLevel: 1,
        targeting: {
          kind: "repeatedEffectTargetAllocation",
          repeatedEffectCount: 3,
        },
        damage: {
          expr: { dice: 1, dieSize: 4, flat: 1 },
          damageType: "force",
        },
        rangeFeet: 120,
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "spellTargetAllocation",
        allocationCount: 3,
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
  });

  test("ray_of_frost is admitted through catalog spell access and projected as a cantrip spell attack", () => {
    const spell = spellRecord(rayOfFrostUnitId);
    const act = spellAct({
      state: spellBattle({ cantrips: [spell] }),
      spellId: rayOfFrostUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      spellId: rayOfFrostUnitId,
      spellActId: "cantripSpellAttack:ray_of_frost",
    });
    expect(spell.mechanics.family).toBe("activation");
    expect(spell.mechanics.level).toBe(0);
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
  });

  test("acid_splash is admitted through catalog spell access and projected as a save-gated cantrip", () => {
    const spell = spellRecord(acidSplashUnitId);
    const act = spellAct({
      state: spellBattle({ cantrips: [spell] }),
      spellId: acidSplashUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      spellId: acidSplashUnitId,
      spellActId: "cantripSaveGateDamage:acid_splash",
    });
    expect(spellActInvocation(act)).toEqual(
      expect.objectContaining({
        kind: "cantripSaveGateDamage",
        spell,
        ability: "dex",
        area: {
          kind: "pointOriginSphere",
          radiusFeet: 5,
        },
        damage: {
          expr: { dice: 1, dieSize: 6 },
          damageType: "acid",
        },
        successDamage: "none",
        rangeFeet: 60,
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "savingThrowOutcome",
        areaChoices: [],
        targetRollModes: [],
      }),
    ]);
  });

  test("mage_armor is admitted through catalog spell access and projected as a persistent prepared spell", () => {
    const spell = spellRecord(mageArmorUnitId);
    const act = spellAct({
      state: spellBattle({ preparedSpells: [spell] }),
      spellId: mageArmorUnitId,
    });

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      spellId: mageArmorUnitId,
      spellActId: "preparedPersistentSpell:mage_armor:slot:1",
    });
    expect(spell.mechanics.family).toBe("ongoing_effect");
    expect(spell.mechanics.level).toBe(1);
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId],
      }),
    ]);
  });
});

describe("QMBT15 Spell Unit admission candidate narrowing", () => {
  test("fire_bolt is not counted as deterministic admission while object targeting and burning are unprojected", () => {
    const spell = spellRecord(fireBoltUnitId);

    expect(spell.mechanics.family).toBe("activation");
    expect(spell.mechanics.level).toBe(0);
    expect(
      maybeSpellAct({
        state: spellBattle({ cantrips: [spell] }),
        spellId: fireBoltUnitId,
      }),
    ).toBeUndefined();
  });

  test("shield is admitted through catalog Spell Access and projected as an attack-hit Reaction spell", () => {
    const spell = spellRecord(shieldUnitId);
    const state = shieldReactionBattle(spell);
    const attackAct = discoverBattleActs(state).find(
      (act): act is AttackAct =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.attackName === "Unarmed Strike",
    );
    expect(attackAct).toBeDefined();
    if (attackAct === undefined) {
      throw new Error("Expected an Unarmed Strike attack act.");
    }
    const targetHole = requireHole(attackAct.initialHoles, "targetChoice");
    const awaitingAttackRoll = resolveBattleSubject({
      state,
      subject: attackAct.subject,
      fills: [attackTargetFill(targetHole, spellTargetId, spellCasterId)],
    });
    expect(awaitingAttackRoll).toMatchObject({ tag: "needsHoles" });
    if (awaitingAttackRoll.tag !== "needsHoles") {
      throw new Error("Expected attack roll hole after target selection.");
    }
    const attackRollHole = requireHole(awaitingAttackRoll.holes, "attackRoll");

    expect(spell.mechanics.family).toBe("triggered_reaction");
    expect(spell.mechanics.castingTime.kind).toBe("reaction");
    expect(maybeSpellAct({ state, spellId: shieldUnitId })).toBeUndefined();

    const awaitingReaction = resolveBattleSubject({
      state,
      subject: attackAct.subject,
      fills: [
        attackTargetFill(targetHole, spellTargetId, spellCasterId),
        attackRollFill(attackRollHole, { total: 14, naturalD20: 10 }),
      ],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingReaction: { trigger: "attackHit" } },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Shield to open an attack-hit Reaction window.");
    }
    const resolved = resolveShieldReactionChoice(awaitingReaction);
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { pendingReaction: null },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Shield Reaction to resolve.");
    }
    const shieldCaster = resolved.snapshot.combatants.find(
      (combatant) => combatant.combatantId === spellCasterId,
    );
    expect(shieldCaster).toMatchObject({
      armorClass: 15,
      reactionAvailable: false,
    });
    expect(shieldCaster?.origin).toMatchObject({
      spellcasting: {
        spellSlots: [expect.objectContaining({ spellLevel: 1, expended: 1 })],
      },
    });
  });

  test("shield is offered against a spell attack roll hit before spell damage", () => {
    const shield = spellRecord(shieldUnitId);
    const rayOfFrost = spellRecord(rayOfFrostUnitId);
    const state = shieldSpellAttackBattle({ shield, spellAttack: rayOfFrost });
    const act = spellAct({ state, spellId: rayOfFrostUnitId });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const targetFill = spellTargetFill(
      targetHole,
      rayOfFrostUnitId,
      spellTargetId,
      spellCasterId,
    );
    const awaitingAttackRoll = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    });
    expect(awaitingAttackRoll).toMatchObject({ tag: "needsHoles" });
    if (awaitingAttackRoll.tag !== "needsHoles") {
      throw new Error("Expected Ray of Frost attack roll hole.");
    }
    const attackRollHole = requireHole(awaitingAttackRoll.holes, "attackRoll");

    const awaitingReaction = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        attackRollFill(attackRollHole, { total: 14, naturalD20: 10 }),
      ],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingReaction: { trigger: "attackHit" } },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected spell attack hit to open Shield window.");
    }

    const resolved = resolveShieldReactionChoice(awaitingReaction);
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { pendingReaction: null },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Shielded spell attack to resolve as a miss.");
    }
    expect(resolved.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: spellCasterId,
          armorClass: 15,
          hp: 12,
          reactionAvailable: false,
        }),
      ]),
    );
  });

  test("shield is offered from Magic Missile target selection and negates target damage", () => {
    const shield = spellRecord(shieldUnitId);
    const magicMissile = spellRecord(magicMissileUnitId);
    const state = shieldMagicMissileBattle({ shield, magicMissile });
    const act = spellAct({ state, spellId: magicMissileUnitId });
    const allocationHole = requireHole(
      act.initialHoles,
      "spellTargetAllocation",
    );
    const allocationFill = spellTargetAllocationFill(
      allocationHole,
      spellTargetId,
      magicMissileUnitId,
      [{ targetId: spellCasterId, count: 3 }],
    );

    const awaitingReaction = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [allocationFill],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingReaction: { trigger: "spellCast" } },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Magic Missile to open Shield window.");
    }

    const awaitingDamage = resolveShieldReactionChoice(awaitingReaction);
    expect(awaitingDamage).toMatchObject({ tag: "needsHoles" });
    if (awaitingDamage.tag !== "needsHoles") {
      throw new Error("Expected Magic Missile damage hole after Shield.");
    }
    const damageHole = requireHole(awaitingDamage.holes, "rolledDice");
    const resolved = resolveBattleSubject({
      state: awaitingDamage.state,
      subject: act.subject,
      fills: [
        allocationFill,
        damageRollFillWithGroups(damageHole, [[4, 4, 4]]),
      ],
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { pendingReaction: null },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Shielded Magic Missile to resolve.");
    }
    expect(resolved.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: spellCasterId,
          armorClass: 15,
          hp: 12,
          reactionAvailable: false,
        }),
      ]),
    );
  });

  test("shield-shaped Magic Missile negation is not offered without the named-spell Reaction trigger", () => {
    const shield = spellRecord(shieldUnitId);
    const attackHitOnlyShield: SpellRecord = {
      ...shield,
      mechanics: {
        ...shield.mechanics,
        castingTime: {
          kind: "reaction",
          trigger: { kind: "hit_by_attack_roll" },
        },
      },
    };
    const magicMissile = spellRecord(magicMissileUnitId);
    const state = shieldMagicMissileBattle({
      shield: attackHitOnlyShield,
      magicMissile,
    });
    const act = spellAct({ state, spellId: magicMissileUnitId });
    const allocationHole = requireHole(
      act.initialHoles,
      "spellTargetAllocation",
    );
    const allocationFill = spellTargetAllocationFill(
      allocationHole,
      spellTargetId,
      magicMissileUnitId,
      [{ targetId: spellCasterId, count: 3 }],
    );

    const awaitingDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [allocationFill],
    });

    expect(awaitingDamage).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingReaction: null },
    });
  });

  test("shield is not offered to spend a second Spell Slot during the current actor's Magic Missile", () => {
    const shield = spellRecord(shieldUnitId);
    const magicMissile = spellRecord(magicMissileUnitId);
    const state = spellBattle({ preparedSpells: [magicMissile, shield] });
    const act = spellAct({ state, spellId: magicMissileUnitId });
    const allocationHole = requireHole(
      act.initialHoles,
      "spellTargetAllocation",
    );
    const allocationFill = spellTargetAllocationFill(
      allocationHole,
      spellCasterId,
      magicMissileUnitId,
      [{ targetId: spellCasterId, count: 3 }],
    );

    const awaitingDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [allocationFill],
    });
    expect(awaitingDamage).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingReaction: null },
    });
    if (awaitingDamage.tag !== "needsHoles") {
      throw new Error("Expected Magic Missile damage hole without Shield.");
    }

    const damageHole = requireHole(awaitingDamage.holes, "rolledDice");
    const resolved = resolveBattleSubject({
      state: awaitingDamage.state,
      subject: act.subject,
      fills: [
        allocationFill,
        damageRollFillWithGroups(damageHole, [[4, 4, 4]]),
      ],
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        pendingReaction: null,
        turn: { spellSlotExpendedThisTurn: true },
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Magic Missile to spend one Spell Slot.");
    }
    expect(resolved.snapshot.combatants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          combatantId: spellCasterId,
          armorClass: 10,
          hp: 0,
          origin: expect.objectContaining({
            spellcasting: expect.objectContaining({
              spellSlots: [
                expect.objectContaining({ spellLevel: 1, expended: 1 }),
              ],
            }),
          }),
        }),
      ]),
    );
  });
});

describe("QMBT25 deterministic Spell Unit admission re-triage", () => {
  test("healing_word is admitted through catalog spell access and projected as a Bonus Action healing spell", () => {
    const spell = spellRecord(healingWordUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = bonusSpellAct({
      state,
      spellId: healingWordUnitId,
    });

    expect(act.subject).toEqual({
      tag: "bonusActionSpell",
      actorId: spellCasterId,
      spellId: healingWordUnitId,
      spellActId: "preparedHealingSpell:healing_word:slot:1",
    });
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const awaitingHealingRoll = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          healingWordUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(awaitingHealingRoll).toMatchObject({ tag: "needsHoles" });
    if (awaitingHealingRoll.tag !== "needsHoles") {
      throw new Error("Expected Healing Word healing roll hole.");
    }

    expect(spellHoleInvocation(awaitingHealingRoll.holes)).toEqual(
      expect.objectContaining({
        kind: "preparedHealingSpell",
        spell,
        slotLevel: 1,
        healing: {
          expr: { dice: 2, dieSize: 4, flat: 3 },
        },
        rangeFeet: 60,
      }),
    );
  });
});

function spellRecord(unitId: string): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  expect(unit.kind).toBe("spell");
  return unit as SpellRecord;
}

function spellBattle(input: {
  readonly cantrips?: readonly SpellRecord[];
  readonly preparedSpells?: readonly SpellRecord[];
}): BattleState {
  const result = startBattle({
    battleId: battleId("unit-profile-spell-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Spellcaster",
        initiative: 20,
        side: partySide,
        spellcasting: {
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: input.cantrips ?? [],
          preparedSpells: input.preparedSpells ?? [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function shieldReactionBattle(spell: SpellRecord): BattleState {
  const result = startBattle({
    battleId: battleId("unit-profile-shield-reaction-admission"),
    combatants: [
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Attacker",
        initiative: 20,
        side: oppositionSide,
      }),
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Shield caster",
        initiative: 10,
        side: partySide,
        spellcasting: {
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [spell],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function shieldSpellAttackBattle(input: {
  readonly shield: SpellRecord;
  readonly spellAttack: SpellRecord;
}): BattleState {
  const result = startBattle({
    battleId: battleId("unit-profile-shield-spell-attack-admission"),
    combatants: [
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Ray caster",
        initiative: 20,
        side: oppositionSide,
        spellcasting: {
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [input.spellAttack],
          preparedSpells: [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Shield caster",
        initiative: 10,
        side: partySide,
        spellcasting: {
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [input.shield],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function shieldMagicMissileBattle(input: {
  readonly shield: SpellRecord;
  readonly magicMissile: SpellRecord;
}): BattleState {
  const result = startBattle({
    battleId: battleId("unit-profile-shield-magic-missile-admission"),
    combatants: [
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Magic Missile caster",
        initiative: 20,
        side: oppositionSide,
        spellcasting: {
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [input.magicMissile],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Shield caster",
        initiative: 10,
        side: partySide,
        spellcasting: {
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [],
          preparedSpells: [input.shield],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function archeryBattle(input: {
  readonly attack: NonNullable<
    Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["attack"]
  >;
}): BattleState {
  const archeryUnitRef = archeryBattleUnitRef();
  const result = startBattle({
    battleId: battleId("unit-profile-archery-admission"),
    combatants: [
      characterCreature({
        combatantId: spellCasterId,
        displayName: "Archer",
        initiative: 20,
        side: partySide,
        attack: input.attack,
        characterUnitRefs: [archeryUnitRef],
      }),
      characterCreature({
        combatantId: spellTargetId,
        displayName: "Target",
        initiative: 10,
        side: oppositionSide,
      }),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function archeryBattleUnitRef(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unit = archeryFeatureUnit();
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  expect(unitRef).toEqual(
    Either.right({
      unitId: archeryUnitId,
      supportProfiles: [PASSIVE_RANGED_ATTACK_ROLL_BONUS_SUPPORT_PROFILE],
    }),
  );
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function archeryFeatureUnit(): PassiveFeatUnit {
  const unit = unitLibrary.requireUnit(archeryUnitId);
  expect(isPassiveFeatUnit(unit)).toBe(true);
  if (!isPassiveFeatUnit(unit)) {
    throw new Error("Expected Archery passive feat Unit.");
  }
  return unit;
}

function isPassiveFeatUnit(unit: UnitRecord): unit is PassiveFeatUnit {
  return unit.kind === "feat" && unit.mechanics.family === "passive";
}

function characterCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly attack?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
  readonly characterUnitRefs?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["characterUnitRefs"];
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
}): BattleCreatureInit {
  const attack = input.attack ?? null;
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: input.characterUnitRefs ?? [],
      classLevels: [{ className: "wizard", level: 1 }],
      armorClass:
        attack === null
          ? defaultArmorClassState()
          : { ...defaultArmorClassState(), rightHandUse: "mainWeapon" },
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout:
        attack === null
          ? {}
          : {
              weapon: {
                itemId: `main:${attack.weapon.id}`,
                unitId: attack.weapon.id,
                grip: "one_handed" as const,
              },
            },
      attack,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

function zeroAbilityWeaponAttack(
  unitId: "weapon_longsword" | "weapon_shortbow",
): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"]
> {
  const weapon = unitLibrary.requireUnit(unitId);
  if (weapon.kind !== "weapon") {
    throw new Error(`Expected ${unitId} weapon Unit.`);
  }
  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: abilityModifier(0),
  };
}

function weaponAttackRollHole(input: {
  readonly state: BattleState;
  readonly attackName: "Longsword" | "Shortbow";
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
}): Extract<BattleHole, { readonly kind: "attackRoll" }> {
  const subject: BattleSubject = {
    tag: "action",
    actorId: input.actorId,
    action: "attack",
    attackName: input.attackName,
  };
  const targetHole = requireResultHole(
    resolveBattleSubject({ state: input.state, subject, fills: [] }),
    "targetChoice",
  );
  return requireResultHole(
    resolveBattleSubject({
      state: input.state,
      subject,
      fills: [
        attackTargetFill(
          targetHole,
          input.actorId,
          input.targetId,
          input.attackName,
        ),
      ],
    }),
    "attackRoll",
  );
}

function requireResultHole<K extends BattleHole["kind"]>(
  result: ReturnType<typeof resolveBattleSubject>,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  expect(result).toMatchObject({ tag: "needsHoles" });
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected ${kind} hole result.`);
  }
  return requireHole(result.holes, kind);
}

function spellAct(input: {
  readonly state: BattleState;
  readonly spellId: string;
}): ActionSpellAct {
  const act = maybeSpellAct(input);
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(`Expected ${input.spellId} spell act.`);
  }
  return act;
}

function maybeSpellAct(input: {
  readonly state: BattleState;
  readonly spellId: string;
}): ActionSpellAct | undefined {
  return discoverBattleActs(input.state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.spellId === input.spellId,
  );
}

function bonusSpellAct(input: {
  readonly state: BattleState;
  readonly spellId: string;
}): BonusActionSpellAct {
  const act = discoverBattleActs(input.state).find(
    (candidate): candidate is BonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.spellId === input.spellId,
  );
  expect(act).toBeDefined();
  if (act === undefined) {
    throw new Error(`Expected ${input.spellId} Bonus Action spell act.`);
  }
  return act;
}

function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  actorId: CombatantId,
  targetId: CombatantId,
  attackName = "Unarmed Strike",
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      attackName === "Shortbow"
        ? {
            kind: "attackTargetInRangedRange",
            actorId,
            targetId,
            attackName,
            rangeBand: "normal",
          }
        : {
            kind: "attackTargetInMeleeReach",
            actorId,
            targetId,
            attackName,
          },
    ],
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: { readonly total: number; readonly naturalD20: number },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: { total: value.total, naturalD20: DieRollResult(value.naturalD20) },
  };
}

function spellTargetFill(
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
    ],
  };
}

function spellTargetAllocationFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetAllocation" }>,
  casterId: CombatantId,
  spellId: string,
  allocations: readonly {
    readonly targetId: CombatantId;
    readonly count: number;
  }[],
): Extract<BattleFill, { readonly kind: "spellTargetAllocation" }> {
  return {
    kind: "spellTargetAllocation",
    holeId: hole.holeId,
    value: { allocations },
    spatialFacts: allocations.map((allocation) => ({
      kind: "spellTarget",
      casterId,
      targetId: allocation.targetId,
      spellId,
    })),
  };
}

function damageRollFillWithGroups(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  groups: readonly (readonly number[])[],
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
  };
}

function rolledDiceGroup(
  group: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }>["value"][number] {
  const [firstResult, ...restResults] = group;
  if (firstResult === undefined) {
    throw new Error("Expected at least one die roll result.");
  }
  return {
    results: [DieRollResult(firstResult), ...restResults.map(DieRollResult)],
  };
}

function resolveShieldReactionChoice(
  awaitingReaction: Extract<
    ReturnType<typeof resolveBattleSubject>,
    { readonly tag: "needsHoles" }
  >,
): ReturnType<typeof resolveBattleReaction> {
  const reactionChoice =
    awaitingReaction.snapshot.pendingReaction?.choices.find(
      (choice) => choice.kind === "castTriggeredReactionSpell",
    );
  expect(reactionChoice).toEqual(
    expect.objectContaining({
      kind: "castTriggeredReactionSpell",
      reactorId: spellCasterId,
      spellId: shieldUnitId,
    }),
  );
  if (
    reactionChoice === undefined ||
    reactionChoice.kind !== "castTriggeredReactionSpell"
  ) {
    throw new Error("Expected Shield Reaction spell choice.");
  }
  return resolveBattleReaction({
    state: awaitingReaction.state,
    fill: {
      kind: "reactionDecision",
      holeId: awaitingReaction.holes[0]!.holeId,
      value: {
        kind: "resolve",
        reactorId: spellCasterId,
        choice: {
          kind: "castTriggeredReactionSpell",
          spellId: shieldUnitId,
          spellActId: reactionChoice.spellActId,
          fills: [],
        },
      },
    },
  });
}

function mechanicsOnlyClassicUnit(
  input: typeof myceliumStepInput,
): ClassicNonSrdMechanicsUnit {
  if (
    input.id !== myceliumStepUnitId ||
    input.syntheticLabel !== "Mycelium Step" ||
    input.provenance.kind !== "classic-2024-mechanics-source-lane" ||
    input.mechanics.family !== "alternate_action_cost" ||
    input.mechanics.from.kind !== "standard_action" ||
    input.mechanics.from.actions.length !== 1 ||
    input.mechanics.from.actions[0] !== "dash" ||
    input.mechanics.to.kind !== "bonus_action"
  ) {
    throw new Error("Classic mycelium_step fixture shape drifted.");
  }

  return {
    id: myceliumStepUnitId,
    syntheticLabel: "Mycelium Step",
    provenance: { kind: "classic-2024-mechanics-source-lane" },
    kind: "class_feature",
    mechanics: {
      family: "alternate_action_cost",
      from: { kind: "standard_action", actions: ["dash"] },
      to: { kind: "bonus_action" },
    },
  };
}

function spellActInvocation(act: ActionSpellAct): SupportedSpellAct {
  const hole = act.initialHoles[0];
  return spellHoleInvocation(hole === undefined ? [] : [hole]);
}

function spellHoleInvocation(holes: readonly BattleHole[]): SupportedSpellAct {
  const hole = holes[0];
  if (hole === undefined || !("spell" in hole)) {
    throw new Error("Expected spell hole to carry invocation.");
  }
  return hole.spell;
}
