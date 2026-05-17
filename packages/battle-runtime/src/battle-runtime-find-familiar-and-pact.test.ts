import {
  startBattleRight,
  characterSeed,
  wizardSpellcasting,
  spellRecord,
  wizardId,
  statBlockCatalog,
  battleId,
  decodeUnitRecordSync,
  discoverBattleActs,
  Either,
  findFamiliarFormEligibilityForSpell,
  findFamiliarInput,
  PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE,
  pactOfTheChainFindFamiliarFormEligibilityForSpell,
  resolveFindFamiliarForm,
  resolvePactOfTheChainFindFamiliarForm,
  startBattle,
} from "./battle-runtime-test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: Find Familiar and Pact of the Chain", () => {
  test("Pact of the Chain Spell Access retains no-slot Find Familiar forms", () => {
    const findFamiliar = spellRecord("find_familiar");
    const eligibleForms =
      pactOfTheChainFindFamiliarFormEligibilityForSpell(findFamiliar);

    expect(eligibleForms).not.toBeNull();
    if (eligibleForms === null) {
      throw new Error("Expected Pact of the Chain familiar form catalog.");
    }

    const state = startBattleRight({
      battleId: battleId("battle-pact-chain-find-familiar-access"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Pact of the Chain Warlock",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            preparedSpells: [],
            spellSlots: [{ spellLevel: 1, count: 1 }],
            invocationSpellAccesses: [
              {
                tag: "pactOfTheChainFindFamiliar",
                spell: findFamiliar,
              },
            ],
          }),
        }),
      ],
    });
    const warlock = state.combatants.get(wizardId);

    expect(warlock?.origin.kind).toBe("character");
    if (warlock?.origin.kind !== "character") {
      throw new Error("Expected Warlock caster.");
    }
    expect(warlock.origin.spellcasting?.invocationSpellAccesses).toEqual([
      {
        tag: "pactOfTheChainFindFamiliar",
        spell: findFamiliar,
        invocationMode: PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE,
        eligibleForms,
      },
    ]);
    expect(discoverBattleActs(state)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          summary: expect.stringContaining("Find Familiar"),
        }),
      ]),
    );
  });

  test("Pact of the Chain special form resolution keeps type override as invocation input", () => {
    const eligibleForms = pactOfTheChainFindFamiliarFormEligibilityForSpell(
      spellRecord("find_familiar"),
    );

    expect(eligibleForms).not.toBeNull();
    if (eligibleForms === null) {
      throw new Error("Expected Pact of the Chain familiar form catalog.");
    }
    expect(eligibleForms.specialForms.map((form) => form.formId)).toEqual([
      "imp",
      "pseudodragon",
      "quasit",
      "skeleton",
      "sphinx_of_wonder",
      "sprite",
      "venomous_snake",
    ]);
    for (const form of eligibleForms.specialForms) {
      expect(
        resolvePactOfTheChainFindFamiliarForm({
          catalog: statBlockCatalog,
          eligibility: eligibleForms,
          selection: {
            tag: "pactOfTheChainSpecialForm",
            formId: form.formId,
          },
          creatureTypeOverrideChoiceId: "fey",
        }),
      ).toEqual({
        tag: "resolved",
        form: {
          statBlock: statBlockCatalog.requireStatBlock(form.statBlockId),
          creatureTypeOverride: "fey",
        },
      });
    }
  });

  test("Find Familiar base form eligibility does not include Pact-only special forms", () => {
    const eligibleForms = findFamiliarFormEligibilityForSpell(
      spellRecord("find_familiar"),
    );

    expect(eligibleForms).not.toBeNull();
    if (eligibleForms === null) {
      throw new Error("Expected familiar form catalog.");
    }
    expect(eligibleForms).not.toHaveProperty("specialForms");
    expect(eligibleForms.creatureTypeOverrideChoices).toEqual([
      {
        creatureType: "celestial",
        displayName: "Celestial",
        optionId: "celestial",
      },
      { creatureType: "fey", displayName: "Fey", optionId: "fey" },
      { creatureType: "fiend", displayName: "Fiend", optionId: "fiend" },
    ]);
  });

  test("Find Familiar form eligibility requires creature type override choices from spell mode", () => {
    const malformedFindFamiliar = decodeUnitRecordSync({
      ...findFamiliarInput,
      mechanics: {
        ...findFamiliarInput.mechanics,
        mode: {
          label: "creature type",
          options: [
            {
              displayName: "Celestial",
              id: "celestial",
              overrides: {},
            },
          ],
        },
      },
    });

    expect(malformedFindFamiliar.kind).toBe("spell");
    if (malformedFindFamiliar.kind !== "spell") {
      throw new Error(
        "Expected malformed Find Familiar fixture to be a spell.",
      );
    }
    expect(
      findFamiliarFormEligibilityForSpell(malformedFindFamiliar),
    ).toBeNull();
  });

  test("Find Familiar form eligibility rejects creature type overrides outside Celestial, Fey, and Fiend", () => {
    const malformedFindFamiliar = decodeUnitRecordSync({
      ...findFamiliarInput,
      mechanics: {
        ...findFamiliarInput.mechanics,
        mode: {
          label: "creature type",
          options: [
            ...findFamiliarInput.mechanics.mode.options,
            {
              displayName: "Beast",
              id: "beast",
              overrides: { creatureType: "beast" },
            },
          ],
        },
      },
    });

    expect(malformedFindFamiliar.kind).toBe("spell");
    if (malformedFindFamiliar.kind !== "spell") {
      throw new Error(
        "Expected malformed Find Familiar fixture to be a spell.",
      );
    }
    expect(
      findFamiliarFormEligibilityForSpell(malformedFindFamiliar),
    ).toBeNull();
  });

  test("Find Familiar form eligibility rejects duplicate normal form ids", () => {
    const malformedFindFamiliar = decodeUnitRecordSync({
      ...findFamiliarInput,
      mechanics: {
        ...findFamiliarInput.mechanics,
        creature: {
          ...findFamiliarInput.mechanics.creature,
          normalForms: [
            ...findFamiliarInput.mechanics.creature.normalForms,
            {
              displayName: "Duplicate Owl",
              formId: "owl",
              statBlockId: "stat_block_bat",
            },
          ],
        },
      },
    });

    expect(malformedFindFamiliar.kind).toBe("spell");
    if (malformedFindFamiliar.kind !== "spell") {
      throw new Error(
        "Expected malformed Find Familiar fixture to be a spell.",
      );
    }
    expect(
      findFamiliarFormEligibilityForSpell(malformedFindFamiliar),
    ).toBeNull();
  });

  test("Find Familiar form eligibility rejects duplicate creature type option ids", () => {
    const malformedFindFamiliar = decodeUnitRecordSync({
      ...findFamiliarInput,
      mechanics: {
        ...findFamiliarInput.mechanics,
        mode: {
          label: "creature type",
          options: [
            {
              displayName: "Celestial",
              id: "celestial",
              overrides: { creatureType: "celestial" },
            },
            {
              displayName: "Fey",
              id: "fey",
              overrides: { creatureType: "fey" },
            },
            {
              displayName: "Fiend With Duplicate Option Id",
              id: "fey",
              overrides: { creatureType: "fiend" },
            },
          ],
        },
      },
    });

    expect(malformedFindFamiliar.kind).toBe("spell");
    if (malformedFindFamiliar.kind !== "spell") {
      throw new Error(
        "Expected malformed Find Familiar fixture to be a spell.",
      );
    }
    expect(
      findFamiliarFormEligibilityForSpell(malformedFindFamiliar),
    ).toBeNull();
  });

  test("Find Familiar normal forms resolve only through CR 0 Beast Stat Blocks", () => {
    const eligibleForms = findFamiliarFormEligibilityForSpell(
      spellRecord("find_familiar"),
    );

    expect(eligibleForms).not.toBeNull();
    if (eligibleForms === null) {
      throw new Error("Expected familiar form catalog.");
    }
    for (const form of eligibleForms.normalForms) {
      expect(
        resolveFindFamiliarForm({
          catalog: statBlockCatalog,
          eligibility: eligibleForms,
          selection: { tag: "normalNamedForm", formId: form.formId },
          creatureTypeOverrideChoiceId: "celestial",
        }),
      ).toEqual({
        tag: "resolved",
        form: {
          statBlock: statBlockCatalog.requireStatBlock(form.statBlockId),
          creatureTypeOverride: "celestial",
        },
      });
    }
    expect(
      resolveFindFamiliarForm({
        catalog: statBlockCatalog,
        eligibility: eligibleForms,
        selection: {
          tag: "challengeRatingZeroBeast",
          statBlockId: "stat_block_skeleton",
        },
        creatureTypeOverrideChoiceId: "fiend",
      }),
    ).toEqual({
      tag: "issue",
      message:
        "Find Familiar normal form must resolve to a CR 0 Beast Stat Block: stat_block_skeleton.",
    });
    expect(
      resolveFindFamiliarForm({
        catalog: statBlockCatalog,
        eligibility: eligibleForms,
        selection: { tag: "normalNamedForm", formId: "owl" },
        creatureTypeOverrideChoiceId: "beast",
      }),
    ).toEqual({
      tag: "issue",
      message: "Find Familiar creature type override is not eligible: beast.",
    });
  });

  test("Pact of the Chain Spell Access rejects the old inline placeholder shape", () => {
    const inlinePlaceholderCreatureTypeOptions =
      findFamiliarInput.mechanics.mode.options.map(
        (option) => option.overrides.creatureType,
      );
    const inlinePlaceholderUnitRecord = decodeUnitRecordSync({
      ...findFamiliarInput,
      mechanics: {
        ...findFamiliarInput.mechanics,
        creature: {
          kind: "inline",
          statBlock: {
            abilityScores: {
              cha: 7,
              con: 8,
              dex: 13,
              int: 2,
              str: 3,
              wis: 12,
            },
            ac: { kind: "literal", value: 11 },
            creatureType: {
              kind: "choice",
              label: "creature type",
              options: inlinePlaceholderCreatureTypeOptions,
            },
            displayName: "Familiar (CR-0 Beast form)",
            hp: { kind: "literal", value: 1 },
            size: "tiny",
            speeds: [{ feet: { kind: "literal", value: 5 }, kind: "walk" }],
          },
        },
      },
    });
    if (inlinePlaceholderUnitRecord.kind !== "spell") {
      throw new Error(
        "Inline placeholder test input must decode to a spell record.",
      );
    }

    expect(
      startBattle({
        battleId: battleId("battle-pact-chain-inline-placeholder-rejected"),
        combatants: [
          characterSeed({
            combatantId: wizardId,
            displayName: "Warlock",
            initiative: 20,
            attack: null,
            spellcasting: wizardSpellcasting({
              preparedSpells: [],
              spellSlots: [{ spellLevel: 1, count: 1 }],
              invocationSpellAccesses: [
                {
                  tag: "pactOfTheChainFindFamiliar",
                  spell: inlinePlaceholderUnitRecord,
                },
              ],
            }),
          }),
        ],
      }),
    ).toEqual(
      Either.left({
        tag: "battleStateInitIssue",
        message:
          "Pact of the Chain Find Familiar access requires familiar form catalog references.",
      }),
    );
  });

  test("Pact of the Chain Spell Access rejects non-Find-Familiar spell records", () => {
    const findFamiliarWithWrongRuntimeId = {
      ...spellRecord("find_familiar"),
      id: "misidentified_find_familiar",
    };

    expect(
      startBattle({
        battleId: battleId("battle-pact-chain-invalid-spell-access"),
        combatants: [
          characterSeed({
            combatantId: wizardId,
            displayName: "Warlock",
            initiative: 20,
            attack: null,
            spellcasting: wizardSpellcasting({
              preparedSpells: [],
              spellSlots: [{ spellLevel: 1, count: 1 }],
              invocationSpellAccesses: [
                {
                  tag: "pactOfTheChainFindFamiliar",
                  spell: findFamiliarWithWrongRuntimeId,
                },
              ],
            }),
          }),
        ],
      }),
    ).toEqual(
      Either.left({
        tag: "battleStateInitIssue",
        message: "Pact of the Chain Spell Access must grant Find Familiar.",
      }),
    );
  });
});
