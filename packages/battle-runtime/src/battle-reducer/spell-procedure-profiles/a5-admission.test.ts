import { describe, expect, expectTypeOf, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";
import {
  PositiveInteger,
  spellSlotLevel,
  type CharacterLevel,
  type DamageDieSize,
  type PositiveInteger as PositiveIntegerType,
} from "@dnd/shared/types";
import {
  spellDurationEndingPath,
  spellDurationExtensionPath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationPath,
  spellOngoingOperationEffectPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleCreatureState,
} from "../../battle-state-execution.ts";
import { spellBattle } from "../../unit-profile-admission-spell-battle.test-support.ts";
import { zeroAbilityWeaponAttack } from "../../unit-profile-admission-creature-fixture.test-support.ts";
import {
  spellCasterId,
  unitLibrary,
} from "../../unit-profile-admission-catalog.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import type { SpellAdmissionActor } from "./profile.ts";
import type { SpellMechanicsAdmissionSource } from "./spell-mechanics-admission.ts";
import {
  objectContactDamageProfile,
  objectContactDamageRepeatProfile,
} from "./object-contact-damage.ts";
import { weaponAttackOverrideProfile } from "./weapon-attack-override.ts";
import { weaponDamageRiderProfile } from "./weapon-damage-rider.ts";

function mechanicsSource(
  spell: ReturnType<typeof spellRecord>,
): SpellMechanicsAdmissionSource {
  const source = spellAdmissionSource(spell);
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

function mechanicsSourceWithBaseDefinitionFacts(
  base: ReturnType<typeof spellRecord>,
  mechanics: ReturnType<typeof spellRecord>["mechanics"],
): SpellMechanicsAdmissionSource {
  const source = spellAdmissionSource(base);
  return {
    mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

function spellAdmissionActor(
  input: Parameters<typeof spellBattle>[0] = { preparedSpells: [] },
): SpellAdmissionActor {
  const actor = spellBattle(input).state.combatants.get(spellCasterId);
  if (!isSpellAdmissionActor(actor)) {
    throw new Error("Expected a spellcasting character fixture.");
  }
  return actor;
}

function isSpellAdmissionActor(
  actor: BattleCreatureState | undefined,
): actor is SpellAdmissionActor {
  return (
    actor?.origin.kind === "character" &&
    actor.origin.spellcasting?.canCastSpells === true
  );
}

function issuesOf(result: {
  readonly tag: string;
  readonly issues?: readonly {
    readonly failedFact: string;
    readonly mechanicsPath: unknown;
  }[];
}) {
  return result.tag === "unsupported"
    ? result.issues?.map(({ failedFact, mechanicsPath }) => ({
        failedFact,
        mechanicsPath,
      }))
    : [];
}

const A5_PROFILES = [
  {
    name: "Heat Metal initial contact damage",
    profile: objectContactDamageProfile,
    spellId: "heat_metal",
    expectedInvocationCount: 1,
    castOptions: [
      { spellLevel: spellSlotLevel(2), payment: { tag: "slot" as const } },
    ],
  },
  {
    name: "Heat Metal repeat contact damage",
    profile: objectContactDamageRepeatProfile,
    spellId: "heat_metal",
    expectedInvocationCount: 0,
    castOptions: [],
  },
  {
    name: "Shillelagh weapon attack override",
    profile: weaponAttackOverrideProfile,
    spellId: "shillelagh",
    expectedInvocationCount: 1,
    castOptions: [],
  },
  {
    name: "Divine Favor weapon damage rider",
    profile: weaponDamageRiderProfile,
    spellId: "divine_favor",
    expectedInvocationCount: 1,
    castOptions: [
      { spellLevel: spellSlotLevel(1), payment: { tag: "slot" as const } },
    ],
  },
] as const;

describe("SR-04G-A5 static spell procedure admission", () => {
  test.each(A5_PROFILES)(
    "supports $name with complete evidence and a mechanics-free execution source",
    ({ profile, spellId, castOptions, expectedInvocationCount }) => {
      const source = spellAdmissionSource(spellRecord(spellId));
      const result = profile.admitMechanics(
        mechanicsSource(spellRecord(spellId)),
      );
      expect(result.tag).toBe("supported");
      if (result.tag !== "supported") return;
      expect(result.admitted.evidence.unowned).toEqual([]);
      expect(result.admitted.evidence.consumed.length).toBeGreaterThan(0);

      const invocations = result.admitted.admit(
        battleSpellExecutionSourceFromAdmission(source),
        {
          actor:
            profile.procedure === "weaponAttackOverride"
              ? spellAdmissionActor({
                  preparedSpells: [],
                  attack: zeroAbilityWeaponAttack("weapon_club"),
                  casterWeaponProficiencies: [
                    { kind: "weapon_category", category: "simple" },
                  ],
                })
              : spellAdmissionActor(),
          castingSource: source.castingSource,
          battle: undefined,
          spellCastOptions: castOptions,
        },
      );
      expect(invocations).toHaveLength(expectedInvocationCount);
      const invocation = invocations[0];
      if (profile.procedure === "objectContactDamage") {
        expect(result.admitted.facts).toMatchObject({
          rangeFeet: 60,
          durationTicks: 10,
          damage: {
            baseDice: 2,
            dieSize: 8,
            perSlotDice: 1,
            startingAtLevel: 3,
          },
          damageType: "fire",
        });
        expect(invocation).toMatchObject({
          procedure: "objectContactDamage",
          actionCost: "magicAction",
          targeting: { kind: "singleManufacturedMetalObject" },
          damage: { expr: { dice: 2, dieSize: 8 }, damageType: "fire" },
          rangeFeet: 60,
          durationTicks: 10,
        });
      } else if (profile.procedure === "objectContactDamageRepeat") {
        expect(result.admitted.facts).toMatchObject({
          durationTicks: 10,
          damage: {
            baseDice: 2,
            dieSize: 8,
            perSlotDice: 1,
            startingAtLevel: 3,
          },
          damageType: "fire",
        });
        expect(invocation).toBeUndefined();
      } else if (profile.procedure === "weaponAttackOverride") {
        if (!("damageDie" in result.admitted.facts)) {
          throw new Error("Expected Shillelagh damage-die facts.");
        }
        expect(result.admitted.facts.damageDie).toEqual({
          base: { dice: 1, dieSize: 8 },
          tiers: [
            { atLevel: 5, override: { dice: 1, dieSize: 10 } },
            { atLevel: 11, override: { dice: 1, dieSize: 12 } },
            { atLevel: 17, override: { dice: 2, dieSize: 6 } },
          ],
        });
        expect(invocation).toMatchObject({
          procedure: "weaponAttackOverride",
          actionCost: "bonusAction",
          activeEffect: { damage: { expr: { dice: 1, dieSize: 8 } } },
        });
      } else {
        expect(result.admitted.facts).toMatchObject({
          durationTicks: 10,
          damage: { dice: 1, dieSize: 4 },
        });
        expect(invocation).toMatchObject({
          procedure: "weaponDamageRider",
          actionCost: "bonusAction",
          activeEffect: {
            damage: { expr: { dice: 1, dieSize: 4 }, damageType: "radiant" },
          },
        });
      }
      for (const invocation of invocations) {
        expect(invocation.spell).not.toHaveProperty("mechanics");
      }
    },
  );

  test("projects Heat Metal's admitted slot-scaled damage without reparsing mechanics", () => {
    const source = spellAdmissionSource(spellRecord("heat_metal"));
    const result = objectContactDamageProfile.admitMechanics(
      mechanicsSource(spellRecord("heat_metal")),
    );
    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    const invocations = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      {
        actor: spellAdmissionActor(),
        castingSource: source.castingSource,
        battle: undefined,
        spellCastOptions: [
          { spellLevel: spellSlotLevel(3), payment: { tag: "slot" as const } },
        ],
      },
    );
    expect(invocations).toHaveLength(1);
    expect(invocations[0]?.damage).toEqual({
      expr: { dice: 3, dieSize: 8 },
      damageType: "fire",
    });
    expect(invocations[0]?.durationTicks).toBe(10);
  });

  test("projects Shillelagh's correlated character-tier rows into execution", () => {
    const source = spellAdmissionSource(spellRecord("shillelagh"));
    const result = weaponAttackOverrideProfile.admitMechanics(
      mechanicsSource(spellRecord("shillelagh")),
    );
    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expectTypeOf(result.admitted.facts.damageDie.base.dice).toEqualTypeOf<
      PositiveIntegerType & 1
    >();
    expectTypeOf(result.admitted.facts.damageDie.base.dieSize).toEqualTypeOf<
      DamageDieSize & 8
    >();
    expectTypeOf(
      result.admitted.facts.damageDie.tiers[0].atLevel,
    ).toEqualTypeOf<CharacterLevel & 5>();
    expectTypeOf(
      result.admitted.facts.damageDie.tiers[2].override.dice,
    ).toEqualTypeOf<PositiveIntegerType & 2>();
    const invocations = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      {
        actor: spellAdmissionActor({
          preparedSpells: [],
          attack: zeroAbilityWeaponAttack("weapon_club"),
          casterClassLevels: [{ className: "wizard", level: 17 }],
          casterWeaponProficiencies: [
            { kind: "weapon_category", category: "simple" },
          ],
        }),
        castingSource: source.castingSource,
        battle: undefined,
        spellCastOptions: [],
      },
    );
    expect(invocations).toHaveLength(1);
    expect(invocations[0]).toMatchObject({
      procedure: "weaponAttackOverride",
      activeEffect: { damage: { expr: { dice: 2, dieSize: 6 } } },
    });
  });

  test.each(A5_PROFILES)(
    "keeps $name recognition and evidence invariant under identity mutation",
    ({ profile, spellId }) => {
      const original = spellRecord(spellId);
      const renamed = decodeSpellRecordForTest({
        ...original,
        id: `synthetic_a5_${spellId}`,
        name: `Synthetic A5 ${spellId}`,
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_a5_${spellId}`,
        },
      });
      const originalResult = profile.admitMechanics(mechanicsSource(original));
      const renamedResult = profile.admitMechanics(mechanicsSource(renamed));
      expect(renamedResult.tag).toBe(originalResult.tag);
      if (
        originalResult.tag !== "supported" ||
        renamedResult.tag !== "supported"
      ) {
        return;
      }
      expect(renamedResult.admitted.facts).toEqual(
        originalResult.admitted.facts,
      );
      expect(renamedResult.admitted.evidence).toEqual(
        originalResult.admitted.evidence,
      );
    },
  );

  test.each([
    [
      "Heat Metal initial contact damage",
      objectContactDamageProfile,
      "heat_metal",
    ],
    [
      "Heat Metal repeat contact damage",
      objectContactDamageRepeatProfile,
      "heat_metal",
    ],
    [
      "Shillelagh weapon attack override",
      weaponAttackOverrideProfile,
      "shillelagh",
    ],
    [
      "Divine Favor weapon damage rider",
      weaponDamageRiderProfile,
      "divine_favor",
    ],
  ] as const)(
    "%s claims only its intended owner across the whole spell catalog",
    (_name, profile, ownerId) => {
      const representedSpellIds = unitLibrary.listUnits().flatMap((unit) => {
        if (unit.kind !== "spell") return [];
        const source = spellAdmissionSource(unit);
        const result = profile.admitMechanics({
          mechanics: source.mechanics,
          spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
        });
        return result.tag === "notRepresented" ? [] : [unit.id];
      });
      expect(representedSpellIds).toEqual([unitId(ownerId)]);
    },
  );

  test.each([
    "darkness",
    "flaming_sphere",
    "phantasmal_force",
    "web",
    "produce_flame",
    "searing_smite",
  ] as const)("does not claim sibling mechanics shape %s", (siblingId) => {
    const source = mechanicsSource(spellRecord(siblingId));
    for (const profile of [
      objectContactDamageProfile,
      objectContactDamageRepeatProfile,
      weaponAttackOverrideProfile,
      weaponDamageRiderProfile,
    ]) {
      expect(profile.admitMechanics(source)).toEqual({
        tag: "notRepresented",
      });
    }
  });

  test("does not claim Produce Flame when its operations root is missing", () => {
    const base = spellRecord("produce_flame");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const mechanics = { ...base.mechanics };
    Reflect.deleteProperty(mechanics, "operations");
    expect(
      weaponAttackOverrideProfile.admitMechanics(
        mechanicsSourceWithBaseDefinitionFacts(base, mechanics),
      ),
    ).toEqual({ tag: "notRepresented" });
  });

  test("does not claim Darkness when its attachment root is missing", () => {
    const base = spellRecord("darkness");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const mechanics = { ...base.mechanics };
    Reflect.deleteProperty(mechanics, "attachment");
    expect(
      objectContactDamageProfile.admitMechanics(
        mechanicsSourceWithBaseDefinitionFacts(base, mechanics),
      ),
    ).toEqual({ tag: "notRepresented" });
  });

  test("does not claim Searing Smite when its duration root is missing", () => {
    const base = spellRecord("searing_smite");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const mechanics = { ...base.mechanics };
    Reflect.deleteProperty(mechanics, "duration");
    expect(
      weaponDamageRiderProfile.admitMechanics(
        mechanicsSourceWithBaseDefinitionFacts(base, mechanics),
      ),
    ).toEqual({ tag: "notRepresented" });
  });

  test("does not claim malformed sibling roots through another A5 profile", () => {
    const darkness = spellRecord("darkness");
    const produceFlame = spellRecord("produce_flame");
    const searingSmite = spellRecord("searing_smite");
    if (
      darkness.mechanics.family !== "ongoing_effect" ||
      produceFlame.mechanics.family !== "ongoing_effect" ||
      searingSmite.mechanics.family !== "ongoing_effect"
    ) {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const darknessMechanics = { ...darkness.mechanics };
    Reflect.deleteProperty(darknessMechanics, "attachment");
    const produceFlameMechanics = { ...produceFlame.mechanics };
    Reflect.deleteProperty(produceFlameMechanics, "operations");
    const searingSmiteMechanics = { ...searingSmite.mechanics };
    Reflect.deleteProperty(searingSmiteMechanics, "duration");
    expect(
      weaponDamageRiderProfile.admitMechanics(
        mechanicsSourceWithBaseDefinitionFacts(darkness, darknessMechanics),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      objectContactDamageProfile.admitMechanics(
        mechanicsSourceWithBaseDefinitionFacts(
          produceFlame,
          produceFlameMechanics,
        ),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      weaponAttackOverrideProfile.admitMechanics(
        mechanicsSourceWithBaseDefinitionFacts(
          searingSmite,
          searingSmiteMechanics,
        ),
      ),
    ).toEqual({ tag: "notRepresented" });
  });

  test("rejects Heat Metal mechanics crossed with Divine Favor definition facts", () => {
    const heatMetal = spellRecord("heat_metal");
    const divineFavor = spellAdmissionSource(spellRecord("divine_favor"));
    const result = objectContactDamageProfile.admitMechanics({
      mechanics: heatMetal.mechanics,
      spellDefinitionRuleFacts: divineFavor.spellDefinitionRuleFacts,
    });
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      { failedFact: "level", mechanicsPath: spellMechanicsHeaderPath("level") },
      { failedFact: "range", mechanicsPath: spellMechanicsHeaderPath("range") },
      {
        failedFact: "components",
        mechanicsPath: spellMechanicsHeaderPath("components"),
      },
      {
        failedFact: "duration",
        mechanicsPath: spellMechanicsHeaderPath("duration"),
      },
    ]);
  });

  test("rejects Shillelagh mechanics crossed with Divine Favor definition facts", () => {
    const shillelagh = spellRecord("shillelagh");
    const divineFavor = spellAdmissionSource(spellRecord("divine_favor"));
    const result = weaponAttackOverrideProfile.admitMechanics({
      mechanics: shillelagh.mechanics,
      spellDefinitionRuleFacts: divineFavor.spellDefinitionRuleFacts,
    });
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      { failedFact: "level", mechanicsPath: spellMechanicsHeaderPath("level") },
      {
        failedFact: "components",
        mechanicsPath: spellMechanicsHeaderPath("components"),
      },
    ]);
  });

  test("rejects Divine Favor mechanics crossed with Heat Metal definition facts", () => {
    const divineFavor = spellRecord("divine_favor");
    const heatMetal = spellAdmissionSource(spellRecord("heat_metal"));
    const result = weaponDamageRiderProfile.admitMechanics({
      mechanics: divineFavor.mechanics,
      spellDefinitionRuleFacts: heatMetal.spellDefinitionRuleFacts,
    });
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      { failedFact: "level", mechanicsPath: spellMechanicsHeaderPath("level") },
      { failedFact: "range", mechanicsPath: spellMechanicsHeaderPath("range") },
      {
        failedFact: "duration",
        mechanicsPath: spellMechanicsHeaderPath("duration"),
      },
      {
        failedFact: "components",
        mechanicsPath: spellMechanicsHeaderPath("components"),
      },
    ]);
  });

  test("retains Heat Metal ownership after its attachment is deleted", () => {
    const base = spellRecord("heat_metal");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const mechanics = { ...base.mechanics };
    Reflect.deleteProperty(mechanics, "attachment");
    const result = objectContactDamageProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, mechanics),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      { failedFact: "attachment", mechanicsPath: spellOngoingAttachmentPath() },
    ]);
  });

  test("retains Shillelagh ownership after its operation root is deleted", () => {
    const base = spellRecord("shillelagh");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const mechanics = { ...base.mechanics };
    Reflect.deleteProperty(mechanics, "operations");
    const result = weaponAttackOverrideProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, mechanics),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      {
        failedFact: "operationCount",
        mechanicsPath: spellOngoingOperationPath(PositiveInteger(1)),
      },
    ]);
  });

  test("retains Divine Favor ownership after its duration root is deleted", () => {
    const base = spellRecord("divine_favor");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const mechanics = { ...base.mechanics };
    Reflect.deleteProperty(mechanics, "duration");
    const result = weaponDamageRiderProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, mechanics),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      {
        failedFact: "duration",
        mechanicsPath: spellMechanicsHeaderPath("duration"),
      },
    ]);
  });

  test("rejects an authored Shillelagh damage-tier mutation at the operation effect path", () => {
    const base = spellRecord("shillelagh");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const operation = base.mechanics.operations[0];
    if (
      operation?.effect.kind !== "override_attached_weapon_attack" ||
      operation.effect.damageDie.kind !== "threshold_tiers"
    ) {
      throw new Error("Expected Shillelagh weapon override mechanics.");
    }
    const [firstTier, ...remainingTiers] = operation.effect.damageDie.tiers;
    if (firstTier === undefined) {
      throw new Error("Expected Shillelagh damage tier.");
    }
    const mechanics = {
      ...base.mechanics,
      operations: [
        {
          ...operation,
          effect: {
            ...operation.effect,
            damageDie: {
              ...operation.effect.damageDie,
              tiers: [
                {
                  ...firstTier,
                  override: { ...firstTier.override, dieSize: 9 },
                },
                ...remainingTiers,
              ],
            },
          },
        },
      ],
    };
    const malformed = decodeSpellRecordForTest({
      ...base,
      mechanics,
    });
    const result = weaponAttackOverrideProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, malformed.mechanics),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      {
        failedFact: "damageDie",
        mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(1)),
      },
    ]);
  });

  test("rejects an authored Divine Favor damage mutation at the operation effect path", () => {
    const base = spellRecord("divine_favor");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const operation = base.mechanics.operations[0];
    if (operation?.effect.kind !== "damage") {
      throw new Error("Expected Divine Favor damage mechanics.");
    }
    if (operation.effect.amount.kind !== "fixed") {
      throw new Error("Expected Divine Favor fixed damage amount.");
    }
    const mechanics = {
      ...base.mechanics,
      operations: [
        {
          ...operation,
          effect: {
            ...operation.effect,
            amount: {
              ...operation.effect.amount,
              expr: { ...operation.effect.amount.expr, dieSize: 6 },
            },
          },
        },
      ],
    };
    const malformed = decodeSpellRecordForTest({
      ...base,
      mechanics,
    });
    const result = weaponDamageRiderProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, malformed.mechanics),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      {
        failedFact: "damageAmount",
        mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(1)),
      },
    ]);
  });

  test("rejects an authored Heat Metal damage mutation at the initial and repeat paths", () => {
    const base = spellRecord("heat_metal");
    if (
      base.mechanics.family !== "ongoing_effect" ||
      base.mechanics.initialPhase?.kind !== "direct"
    ) {
      throw new Error("Expected Heat Metal ongoing direct mechanics.");
    }
    const initialEffect = base.mechanics.initialPhase.effects?.[0];
    const repeatOperation = base.mechanics.operations[0];
    if (
      initialEffect?.kind !== "object_contact_damage" ||
      repeatOperation?.effect.kind !== "object_contact_damage"
    ) {
      throw new Error("Expected Heat Metal contact-damage mechanics.");
    }
    if (initialEffect.amount.kind !== "linear_per_level") {
      throw new Error("Expected Heat Metal linear damage amount.");
    }
    const badAmount = {
      ...initialEffect.amount,
      base: { ...initialEffect.amount.base, dieSize: 6 },
    };
    const mechanics = {
      ...base.mechanics,
      initialPhase: {
        ...base.mechanics.initialPhase,
        effects: [{ ...initialEffect, amount: badAmount }],
      },
    };
    const malformed = decodeSpellRecordForTest({
      ...base,
      mechanics,
    });
    const result = objectContactDamageProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, malformed.mechanics),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      {
        failedFact: "initialEffect",
        mechanicsPath: spellOngoingInitialPhasePath(),
      },
      {
        failedFact: "damageAmount",
        mechanicsPath: spellOngoingInitialPhasePath(),
      },
    ]);
  });

  test("reports Shillelagh duration-ending mutation on its exact child path", () => {
    const base = spellRecord("shillelagh");
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected ongoing-effect mechanics.");
    }
    const mechanics = {
      ...base.mechanics,
      duration: {
        ...base.mechanics.duration,
        earlyEnd: [{ kind: "caster_recasts_spell" as const }],
      },
    };
    const malformed = decodeSpellRecordForTest({
      ...base,
      mechanics,
    });
    const result = weaponAttackOverrideProfile.admitMechanics(
      mechanicsSourceWithBaseDefinitionFacts(base, malformed.mechanics),
    );
    expect(result.tag).toBe("unsupported");
    expect(issuesOf(result)).toEqual([
      {
        failedFact: "duration",
        mechanicsPath: spellMechanicsHeaderPath("duration"),
      },
      {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(1)),
      },
    ]);
  });

  test.each([
    [objectContactDamageProfile, "heat_metal"],
    [weaponDamageRiderProfile, "divine_favor"],
  ] as const)(
    "reports %s duration-ending mutation without a duration-value failure",
    (profile, spellId) => {
      const base = spellRecord(spellId);
      if (base.mechanics.family !== "ongoing_effect") {
        throw new Error("Expected ongoing-effect mechanics.");
      }
      const mechanics = {
        ...base.mechanics,
        duration: {
          ...base.mechanics.duration,
          earlyEnd: [{ kind: "caster_recasts_spell" as const }],
        },
      };
      const malformed = decodeSpellRecordForTest({
        ...base,
        mechanics,
      });
      const result = profile.admitMechanics(
        mechanicsSourceWithBaseDefinitionFacts(base, malformed.mechanics),
      );
      expect(result.tag).toBe("unsupported");
      expect(issuesOf(result)).toEqual([
        {
          failedFact: "duration",
          mechanicsPath: spellMechanicsHeaderPath("duration"),
        },
        {
          failedFact: "durationEnding",
          mechanicsPath: spellDurationEndingPath(PositiveInteger(1)),
        },
      ]);
    },
  );

  test.each([
    [objectContactDamageProfile, "heat_metal"],
    [weaponAttackOverrideProfile, "shillelagh"],
    [weaponDamageRiderProfile, "divine_favor"],
  ] as const)(
    "reports %s duration-extension mutation without a duration-value failure",
    (profile, spellId) => {
      const base = spellRecord(spellId);
      if (base.mechanics.family !== "ongoing_effect") {
        throw new Error("Expected ongoing-effect mechanics.");
      }
      if (
        base.mechanics.duration.kind !== "concentration" &&
        base.mechanics.duration.kind !== "timed"
      ) {
        throw new Error("Expected a time-valued ongoing duration.");
      }
      const duration =
        base.mechanics.duration.kind === "concentration"
          ? {
              ...base.mechanics.duration,
              upTo: {
                ...base.mechanics.duration.upTo,
                upcastTiers: [{ atSlot: 2, amount: 2 }],
              },
            }
          : {
              ...base.mechanics.duration,
              value: {
                ...base.mechanics.duration.value,
                upcastTiers: [{ atSlot: 2, amount: 2 }],
              },
            };
      const malformed = decodeSpellRecordForTest({
        ...base,
        mechanics: { ...base.mechanics, duration },
      });
      const result = profile.admitMechanics(
        mechanicsSourceWithBaseDefinitionFacts(base, malformed.mechanics),
      );
      expect(result.tag).toBe("unsupported");
      expect(issuesOf(result)).toEqual([
        {
          failedFact: "duration",
          mechanicsPath: spellMechanicsHeaderPath("duration"),
        },
        {
          failedFact: "durationExtension",
          mechanicsPath: spellDurationExtensionPath(PositiveInteger(1)),
        },
      ]);
    },
  );
});
