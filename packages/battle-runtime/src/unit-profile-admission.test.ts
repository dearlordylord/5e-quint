// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT7 fighter_second_wind barbarian_reckless_attack rogue_evasion
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT8 fighter_action_surge fighter_improved_critical barbarian_rage rogue_cunning_action rogue_uncanny_dodge rogue_sneak_attack
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT14 acid_splash mage_armor magic_missile ray_of_frost
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT21 mycelium_step
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT18 defense
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
  Hp,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  PASSIVE_ARMOR_CLASS_BONUS_SUPPORT_PROFILE,
  battleCombatantSide,
  battleId,
  battleUnitRefWithSupportProfiles,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  REACTION_ROLL_OR_DAMAGE_REDUCTION_SUPPORT_PROFILE,
  SAVE_DAMAGE_REPLACEMENT_SUPPORT_PROFILE,
  startBattle,
  WEAPON_OR_UNARMED_CRITICAL_RANGE_19_SUPPORT_PROFILE,
  type AvailableBattleAct,
  type BattleCreatureInit,
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
const rayOfFrostUnitId = "ray_of_frost";
const shieldUnitId = "shield";
const spellCasterId = combatantId("unit-profile-spell-caster");
const spellTargetId = combatantId("unit-profile-spell-target");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");
type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
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

  test("archery remains outside the passive Armor Class support gate", () => {
    const unit = decodeUnitRecordSync({
      category: "fighting_style",
      description:
        "You gain a +2 bonus to attack rolls you make with Ranged weapons.",
      id: archeryUnitId,
      kind: "feat",
      mechanics: {
        family: "passive",
        grants: [
          {
            delta: {
              dice: 2,
              dieSize: 1,
              kind: "fixed_dice",
              sign: "+",
            },
            kind: "modify_roll_numeric",
            on: ["attack_roll"],
            weaponFilter: {
              category: "ranged",
              kind: "weapon_category",
            },
          },
        ],
      },
      name: "Archery",
      provenance: {
        kind: "srd-5.2.1",
        section: "Feats#Archery",
      },
    });

    expect(
      battleUnitRefWithSupportProfiles({ unitRef: { unitId: unit.id }, unit }),
    ).toEqual(Either.right({ unitId: archeryUnitId, supportProfiles: [] }));
    expect(parseSupportedUnitFeatureProfile(unit, [])).toBeNull();
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

  test("shield is not counted as deterministic admission before triggered reaction Spell Access projection exists", () => {
    const spell = spellRecord(shieldUnitId);

    expect(spell.mechanics.family).toBe("triggered_reaction");
    expect(spell.mechanics.castingTime.kind).toBe("reaction");
    expect(
      maybeSpellAct({
        state: spellBattle({ preparedSpells: [spell] }),
        spellId: shieldUnitId,
      }),
    ).toBeUndefined();
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

function characterCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: [{ className: "wizard", level: 1 }],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
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
  if (hole === undefined || !("spell" in hole)) {
    throw new Error("Expected spell act initial hole to carry invocation.");
  }
  return hole.spell;
}
