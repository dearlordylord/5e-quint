// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test character-sheet.summoned-object-lifecycle-session-invocation
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test table-caller.summoned-object-lifecycle-control
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE animate_objects
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE animate_objects
// UNIT-IDENTITY-REPLAY: L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE animate_objects doCastAnimateObjects
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE conjure_elemental
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE conjure_elemental
// UNIT-IDENTITY-REPLAY: L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE conjure_elemental doCastConjureElemental
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE summon_dragon
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE summon_dragon
// UNIT-IDENTITY-REPLAY: L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE summon_dragon doCastSummonDragon
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE planar_binding
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE planar_binding
// UNIT-IDENTITY-REPLAY: L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE planar_binding doCastPlanarBinding
import { describe, expect, it, test } from "vitest";

import {
  Either,
  Hp,
  armorClassBuild,
  castAnimateObjects,
  castConjureElemental,
  castPlanarBinding,
  castSummonDragon,
  characterSheetId,
  characterSheetSpellLifecycleCreatureId,
  characterSheetSpellLifecycleObjectId,
  createFreshCharacterSheet,
  requireRight,
  spellSlotLevel,
  unitLibrary,
} from "./test-support.ts";
import type {
  CharacterSheetAnimateObjectsTarget,
  CharacterSheetConjureElementalSpirit,
  CharacterSheetPlanarBindingTarget,
  CharacterSheetSummonDragonSpirit,
} from "./index.ts";

const selectedLifecycleDriverSchema = {
  doCastAnimateObjects: {},
  doCastConjureElemental: {},
  doCastSummonDragon: {},
  doCastPlanarBinding: {},
} as const;

type LifecycleDriverAction = keyof typeof selectedLifecycleDriverSchema;

type LifecycleProjection = {
  readonly spellId: string;
  readonly slotExpended: number;
  readonly durationUnit: string;
  readonly primaryOwner: "table";
  readonly headline: string;
};

type LifecycleReplay = {
  readonly taskId: "L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE";
  readonly unitId:
    | "animate_objects"
    | "conjure_elemental"
    | "summon_dragon"
    | "planar_binding";
  readonly actions: readonly LifecycleDriverAction[];
  readonly sequences: readonly LifecycleReplaySequence[];
};

type LifecycleReplaySequence = {
  readonly name: string;
  readonly actions: readonly LifecycleDriverAction[];
  readonly expected: LifecycleProjection;
};

const selectedUnitIdentityReplays = [
  {
    taskId: "L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE",
    unitId: "animate_objects",
    actions: ["doCastAnimateObjects"],
    sequences: [
      {
        name: "animate-objects-session-lifecycle-contract",
        actions: ["doCastAnimateObjects"],
        expected: {
          spellId: "animate_objects",
          slotExpended: 1,
          durationUnit: "minute",
          primaryOwner: "table",
          headline: "animated object companion control",
        },
      },
    ],
  },
  {
    taskId: "L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE",
    unitId: "conjure_elemental",
    actions: ["doCastConjureElemental"],
    sequences: [
      {
        name: "conjure-elemental-session-lifecycle-contract",
        actions: ["doCastConjureElemental"],
        expected: {
          spellId: "conjure_elemental",
          slotExpended: 1,
          durationUnit: "minute",
          primaryOwner: "table",
          headline: "elemental spirit hazard",
        },
      },
    ],
  },
  {
    taskId: "L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE",
    unitId: "summon_dragon",
    actions: ["doCastSummonDragon"],
    sequences: [
      {
        name: "summon-dragon-session-lifecycle-contract",
        actions: ["doCastSummonDragon"],
        expected: {
          spellId: "summon_dragon",
          slotExpended: 1,
          durationUnit: "hour",
          primaryOwner: "table",
          headline: "draconic spirit companion control",
        },
      },
    ],
  },
  {
    taskId: "L19E-05-L5-SUMMONED-OBJECT-LIFECYCLE",
    unitId: "planar_binding",
    actions: ["doCastPlanarBinding"],
    sequences: [
      {
        name: "planar-binding-session-lifecycle-contract",
        actions: ["doCastPlanarBinding"],
        expected: {
          spellId: "planar_binding",
          slotExpended: 1,
          durationUnit: "hour",
          primaryOwner: "table",
          headline: "bound creature command contract",
        },
      },
    ],
  },
] as const satisfies ReadonlyArray<LifecycleReplay>;

describe("Character Sheet runtime / summoned and object lifecycle spells", () => {
  it("replays selected Unit identities deterministically", () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions = new Set<LifecycleDriverAction>();

      for (const sequence of replay.sequences) {
        let projection: LifecycleProjection | undefined;

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          projection = lifecycleSelectedIdentityActions[actionName]();
        }

        expect(projection, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  test("Animate Objects returns object stat and companion-control contracts", () => {
    const result = requireRight(
      castAnimateObjects({
        sheet: lifecycleWizardSheet({
          preparedSpells: ["animate_objects"],
          slots: 1,
        }),
        unitLibrary,
        targets: animateObjectsTargets,
        spellcastingAbilityModifier: 4,
      }),
    );

    expect(result.invocation.companionControl).toMatchObject({
      commandAction: "bonus_action",
      commandRangeFeet: 500,
      tableCommandOwner: "table",
      battleCreatureLifecycleOwner: "table",
    });
    expect(result.invocation.animatedObjects).toEqual([
      expect.objectContaining({
        objectId: animateObjectsTargets[0].objectId,
        size: "large",
        capacityWeight: 2,
        hitPointMaximum: Hp(20),
        slam: expect.objectContaining({
          dice: { count: 2, die: 6 },
          addsSpellcastingAbilityModifier: true,
        }),
      }),
      expect.objectContaining({
        objectId: animateObjectsTargets[1].objectId,
        size: "medium_or_smaller",
        capacityWeight: 1,
        hitPointMaximum: Hp(10),
        slam: expect.objectContaining({
          dice: { count: 1, die: 4 },
          addsSpellcastingAbilityModifier: false,
        }),
      }),
    ]);
    expect(result.sheet.spellSlotExpenditures).toEqual([
      { spellLevel: 5, expended: 1 },
    ]);
  });

  test("Animate Objects rejects over-capacity targets before spending a slot", () => {
    const sheet = lifecycleWizardSheet({
      preparedSpells: ["animate_objects"],
      slots: 1,
    });
    const result = castAnimateObjects({
      sheet,
      unitLibrary,
      targets: animateObjectsTargets,
      spellcastingAbilityModifier: 2,
    });

    expect(Either.isLeft(result)).toBe(true);
    expect(sheet.spellSlotExpenditures).toEqual([]);
  });

  test("Conjure Elemental returns elemental hazard and restrained-save contracts", () => {
    const result = requireRight(
      castConjureElemental({
        sheet: lifecycleWizardSheet({
          preparedSpells: ["conjure_elemental"],
          slots: 1,
        }),
        unitLibrary,
        spirit: elementalSpirit,
      }),
    );

    expect(result.invocation.spirit).toEqual({
      spiritId: elementalSpirit.spiritId,
      size: "large",
      intangible: true,
      origin: "elemental_planes",
      element: "fire",
      damageType: "fire",
      placementOwner: "table",
    });
    expect(result.invocation.hazard).toMatchObject({
      trigger: "enters_space_or_starts_turn_within_5_feet",
      savingThrowAbility: "dex",
      firstFailedSaveDamageDice: { count: 8, die: 8 },
      repeatFailedSaveDamageDice: { count: 4, die: 8 },
      tableTriggerOwner: "table",
    });
  });

  test("Summon Dragon returns Draconic Spirit stat and action contracts", () => {
    const result = requireRight(
      castSummonDragon({
        sheet: lifecycleWizardSheet({
          preparedSpells: ["summon_dragon"],
          slots: 1,
        }),
        unitLibrary,
        spirit: dragonSpirit,
      }),
    );

    expect(result.invocation.spirit).toMatchObject({
      spiritId: dragonSpirit.spiritId,
      creatureType: "dragon",
      armorClass: 19,
      hitPointMaximum: Hp(50),
      sharedResistance: "fire",
      placementOwner: "table",
    });
    expect(result.invocation.actions).toEqual({
      rend: {
        attackBonus: "caster_spell_attack_modifier",
        reachFeet: 10,
        damageType: "piercing",
        damageDice: { count: 1, die: 6 },
        flatDamage: 9,
      },
      breathWeapon: {
        savingThrowAbility: "dex",
        dc: "caster_spell_save_dc",
        area: { kind: "cone", lengthFeet: 30 },
        damageType: "fire",
        damageDice: { count: 2, die: 6 },
        success: "half_damage",
      },
      multiattack: {
        rendCount: 2,
        breathWeaponCount: 1,
      },
    });
  });

  test("Planar Binding returns success/failure command contracts and spends consumed components", () => {
    const result = requireRight(
      castPlanarBinding({
        sheet: lifecycleWizardSheet({
          preparedSpells: ["planar_binding"],
          slots: 1,
        }),
        unitLibrary,
        target: planarBindingTarget,
      }),
    );

    expect(result.invocation).toMatchObject({
      tag: "planarBinding",
      spellId: "planar_binding",
      castingTime: { kind: "hours", amount: 1 },
      rangeFeet: 60,
      duration: { kind: "timeSpan", unit: "hour", amount: 24 },
      materialComponentSpend: { consumedJewelCostGpMinimum: 1000 },
      savingThrow: { ability: "cha", dc: "caster_spell_save_dc" },
      outcome: {
        tag: "saveFailed",
        bound: true,
        commandFollowing: "best_of_ability",
        hostileTargetTwistsCommands: true,
        extendsSummoningOrCreationSpellDuration: true,
        reportingOrReturnOwner: "table",
        commandExecutionOwner: "table",
      },
    });
  });
});

const lifecycleSelectedIdentityActions = {
  doCastAnimateObjects: () => {
    const result = requireRight(
      castAnimateObjects({
        sheet: lifecycleWizardSheet({
          preparedSpells: ["animate_objects"],
          slots: 1,
        }),
        unitLibrary,
        targets: animateObjectsTargets,
        spellcastingAbilityModifier: 4,
      }),
    );
    return {
      spellId: result.invocation.spellId,
      slotExpended: slotExpended(result.sheet),
      durationUnit: result.invocation.duration.unit,
      primaryOwner: result.invocation.companionControl.tableCommandOwner,
      headline: "animated object companion control",
    };
  },
  doCastConjureElemental: () => {
    const result = requireRight(
      castConjureElemental({
        sheet: lifecycleWizardSheet({
          preparedSpells: ["conjure_elemental"],
          slots: 1,
        }),
        unitLibrary,
        spirit: elementalSpirit,
      }),
    );
    return {
      spellId: result.invocation.spellId,
      slotExpended: slotExpended(result.sheet),
      durationUnit: result.invocation.duration.unit,
      primaryOwner: result.invocation.hazard.tableTriggerOwner,
      headline: "elemental spirit hazard",
    };
  },
  doCastSummonDragon: () => {
    const result = requireRight(
      castSummonDragon({
        sheet: lifecycleWizardSheet({
          preparedSpells: ["summon_dragon"],
          slots: 1,
        }),
        unitLibrary,
        spirit: dragonSpirit,
      }),
    );
    return {
      spellId: result.invocation.spellId,
      slotExpended: slotExpended(result.sheet),
      durationUnit: result.invocation.duration.unit,
      primaryOwner: result.invocation.companionControl.tableCommandOwner,
      headline: "draconic spirit companion control",
    };
  },
  doCastPlanarBinding: () => {
    const result = requireRight(
      castPlanarBinding({
        sheet: lifecycleWizardSheet({
          preparedSpells: ["planar_binding"],
          slots: 1,
        }),
        unitLibrary,
        target: planarBindingTarget,
      }),
    );
    return {
      spellId: result.invocation.spellId,
      slotExpended: slotExpended(result.sheet),
      durationUnit: result.invocation.duration.unit,
      primaryOwner:
        result.invocation.outcome.tag === "saveFailed"
          ? result.invocation.outcome.commandExecutionOwner
          : "table",
      headline: "bound creature command contract",
    };
  },
} as const satisfies Record<LifecycleDriverAction, () => LifecycleProjection>;

const animateObjectsTargets = [
  {
    objectId: requireRight(characterSheetSpellLifecycleObjectId("object:chair")),
    size: "large",
    nonmagical: true,
    withinRange: true,
    notWornOrCarried: true,
    notFixedToSurface: true,
  },
  {
    objectId: requireRight(characterSheetSpellLifecycleObjectId("object:cup")),
    size: "medium_or_smaller",
    nonmagical: true,
    withinRange: true,
    notWornOrCarried: true,
    notFixedToSurface: true,
  },
] as const satisfies readonly CharacterSheetAnimateObjectsTarget[];

const elementalSpirit = {
  spiritId: requireRight(characterSheetSpellLifecycleCreatureId("spirit:fire")),
  element: "fire",
  unoccupiedSpaceWithinRange: true,
} as const satisfies CharacterSheetConjureElementalSpirit;

const dragonSpirit = {
  spiritId: requireRight(characterSheetSpellLifecycleCreatureId("spirit:dragon")),
  damageType: "fire",
  unoccupiedSpaceVisibleWithinRange: true,
  engravedDragonObjectWorth500Gp: true,
} as const satisfies CharacterSheetSummonDragonSpirit;

const planarBindingTarget = {
  creatureId: requireRight(characterSheetSpellLifecycleCreatureId("fiend:bound")),
  creatureType: "fiend",
  withinRangeForEntireCasting: true,
  savingThrowOutcome: { tag: "failed" },
  summonedOrCreatedBySpell: true,
  hostile: true,
} as const satisfies CharacterSheetPlanarBindingTarget;

function slotExpended(sheet: {
  readonly spellSlotExpenditures?: readonly {
    readonly spellLevel: number;
    readonly expended: number;
  }[];
}): number {
  return (
    sheet.spellSlotExpenditures?.find(
      (slot) => slot.spellLevel === spellSlotLevel(5),
    )?.expended ?? 0
  );
}

function lifecycleWizardSheet(input: {
  readonly preparedSpells: readonly string[];
  readonly slots: number;
}) {
  return requireRight(
    createFreshCharacterSheet({
      characterId: characterSheetId("character:lifecycle-wizard-9"),
      build: {
        ...armorClassBuild({
          startingClass: "class_wizard",
          advancements: Array.from({ length: 8 }, () => "class_wizard"),
        }),
        spellcasting: {
          sources: [
            {
              sourceUnitId: "class_wizard",
              spellcastingAbility: "int",
              cantrips: ["fire_bolt", "light", "mage_hand"],
              spellbook: [
                "animate_objects",
                "conjure_elemental",
                "summon_dragon",
                "planar_binding",
              ],
              preparedSpells: input.preparedSpells,
              spellcastingFocuses: ["arcane_focus"],
            },
          ],
          slotPools: {
            spellcasting: {
              kind: "spellcasting",
              slots: [{ spellLevel: 5, count: input.slots }],
            },
          },
        },
      },
      currentHp: Hp(44),
      tempHp: Hp(0),
      unitLibrary,
    }),
  );
}
