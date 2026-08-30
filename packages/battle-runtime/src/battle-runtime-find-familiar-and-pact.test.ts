import { statBlockId as parseSharedStatBlockId } from "@dnd/shared/game-facts";
import { Result } from "effect";
import {
  startBattleSessionRight,
  characterSeed,
  wizardSpellcasting,
  spellRecord,
  wizardId,
  statBlockCatalog,
  battleId,
  decodeUnitRecordSync,
  discoverBattleActs,
  spawnedCompanionFormEligibilityForSpell,
  spawnedCompanionInput,
  PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE,
  pactOfTheChainSpawnedCompanionFormEligibilityForSpell,
  resolveSpawnedCompanionForm,
  resolvePactOfTheChainSpawnedCompanionForm,
  startBattle,
} from "./battle-runtime.test-support.ts";
import { describe, expect, test } from "vitest";

describe("battle runtime: Find Familiar and Pact of the Chain", () => {
  test("Pact of the Chain Spell Access retains no-slot Find Familiar forms", () => {
    const spawnedCompanionLifecycle = spellRecord("find_familiar");
    const eligibleForms = pactOfTheChainSpawnedCompanionFormEligibilityForSpell(
      spawnedCompanionLifecycle,
    );

    expect(eligibleForms).not.toBeNull();
    if (eligibleForms === null) {
      throw new Error("Expected Pact of the Chain familiar form catalog.");
    }

    const session = startBattleSessionRight({
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
                tag: "pactOfTheChainSpawnedCompanion",
                spell: spawnedCompanionLifecycle,
              },
            ],
          }),
        }),
      ],
    });
    const warlock = session.state.combatants.get(wizardId);
    const spellcasting =
      session.context.characters.get(wizardId)?.spellcastingPresentationSource;

    expect(warlock?.origin.kind).toBe("character");
    if (warlock?.origin.kind !== "character") {
      throw new Error("Expected Warlock caster.");
    }
    expect(spellcasting?.invocationSpellAccesses).toEqual([
      {
        tag: "pactOfTheChainSpawnedCompanion",
        spell: spawnedCompanionLifecycle,
        invocationMode: PACT_OF_THE_CHAIN_FIND_FAMILIAR_INVOCATION_MODE,
        eligibleForms,
      },
    ]);
    expect(discoverBattleActs(session)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          summary: expect.stringContaining("Find Familiar"),
        }),
      ]),
    );
  });

  test("Pact of the Chain special form resolution keeps type override as invocation input", () => {
    const eligibleForms = pactOfTheChainSpawnedCompanionFormEligibilityForSpell(
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
        resolvePactOfTheChainSpawnedCompanionForm({
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
    const eligibleForms = spawnedCompanionFormEligibilityForSpell(
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
    const malformedSpawnedCompanion = decodeUnitRecordSync({
      ...spawnedCompanionInput,
      mechanics: {
        ...spawnedCompanionInput.mechanics,
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

    expect(malformedSpawnedCompanion.kind).toBe("spell");
    if (malformedSpawnedCompanion.kind !== "spell") {
      throw new Error(
        "Expected malformed Find Familiar fixture to be a spell.",
      );
    }
    expect(
      spawnedCompanionFormEligibilityForSpell(malformedSpawnedCompanion),
    ).toBeNull();
  });

  test("Find Familiar form eligibility rejects creature type overrides outside Celestial, Fey, and Fiend", () => {
    const malformedSpawnedCompanion = decodeUnitRecordSync({
      ...spawnedCompanionInput,
      mechanics: {
        ...spawnedCompanionInput.mechanics,
        mode: {
          label: "creature type",
          options: [
            ...spawnedCompanionInput.mechanics.mode.options,
            {
              displayName: "Beast",
              id: "beast",
              overrides: { creatureType: "beast" },
            },
          ],
        },
      },
    });

    expect(malformedSpawnedCompanion.kind).toBe("spell");
    if (malformedSpawnedCompanion.kind !== "spell") {
      throw new Error(
        "Expected malformed Find Familiar fixture to be a spell.",
      );
    }
    expect(
      spawnedCompanionFormEligibilityForSpell(malformedSpawnedCompanion),
    ).toBeNull();
  });

  test("Find Familiar form eligibility rejects duplicate normal form ids", () => {
    const malformedSpawnedCompanion = decodeUnitRecordSync({
      ...spawnedCompanionInput,
      mechanics: {
        ...spawnedCompanionInput.mechanics,
        creature: {
          ...spawnedCompanionInput.mechanics.creature,
          normalForms: [
            ...spawnedCompanionInput.mechanics.creature.normalForms,
            {
              displayName: "Duplicate Owl",
              formId: "owl",
              statBlockId: "stat_block_bat",
            },
          ],
        },
      },
    });

    expect(malformedSpawnedCompanion.kind).toBe("spell");
    if (malformedSpawnedCompanion.kind !== "spell") {
      throw new Error(
        "Expected malformed Find Familiar fixture to be a spell.",
      );
    }
    expect(
      spawnedCompanionFormEligibilityForSpell(malformedSpawnedCompanion),
    ).toBeNull();
  });

  test("Find Familiar form eligibility rejects duplicate creature type option ids", () => {
    const malformedSpawnedCompanion = decodeUnitRecordSync({
      ...spawnedCompanionInput,
      mechanics: {
        ...spawnedCompanionInput.mechanics,
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

    expect(malformedSpawnedCompanion.kind).toBe("spell");
    if (malformedSpawnedCompanion.kind !== "spell") {
      throw new Error(
        "Expected malformed Find Familiar fixture to be a spell.",
      );
    }
    expect(
      spawnedCompanionFormEligibilityForSpell(malformedSpawnedCompanion),
    ).toBeNull();
  });

  test("Find Familiar normal forms resolve only through CR 0 Beast Stat Blocks", () => {
    const eligibleForms = spawnedCompanionFormEligibilityForSpell(
      spellRecord("find_familiar"),
    );

    expect(eligibleForms).not.toBeNull();
    if (eligibleForms === null) {
      throw new Error("Expected familiar form catalog.");
    }
    for (const form of eligibleForms.normalForms) {
      expect(
        resolveSpawnedCompanionForm({
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
      resolveSpawnedCompanionForm({
        catalog: statBlockCatalog,
        eligibility: eligibleForms,
        selection: {
          tag: "challengeRatingZeroBeast",
          statBlockId: parseSharedStatBlockId("stat_block_skeleton"),
        },
        creatureTypeOverrideChoiceId: "fiend",
      }),
    ).toEqual({
      tag: "issue",
      message:
        "Find Familiar normal form must resolve to a CR 0 Beast Stat Block: stat_block_skeleton.",
    });
    expect(
      resolveSpawnedCompanionForm({
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
      spawnedCompanionInput.mechanics.mode.options.map(
        (option) => option.overrides.creatureType,
      );
    const inlinePlaceholderUnitRecord = decodeUnitRecordSync({
      ...spawnedCompanionInput,
      mechanics: {
        ...spawnedCompanionInput.mechanics,
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
                  tag: "pactOfTheChainSpawnedCompanion",
                  spell: inlinePlaceholderUnitRecord,
                },
              ],
            }),
          }),
        ],
      }),
    ).toEqual(
      Result.fail({
        tag: "battleStateInitIssue",
        kind: "characterAdmissionInvalid",
        combatantId: wizardId,
        phase: "executionBindings",
        issueIndex: 0,
        ownerPath: ["initialCombatants", 0],
        message:
          "Pact of the Chain Find Familiar access requires familiar form catalog references.",
      }),
    );
  });

  test("Pact of the Chain Spell Access rejects spells without its familiar-casting mechanics", () => {
    const spawnedCompanionLifecycleWithWrongMaterialCost = {
      ...spellRecord("find_familiar"),
      mechanics: {
        ...spellRecord("find_familiar").mechanics,
        components: {
          ...spellRecord("find_familiar").mechanics.components,
          materialCostGp: 5,
        },
      },
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
                  tag: "pactOfTheChainSpawnedCompanion",
                  spell: spawnedCompanionLifecycleWithWrongMaterialCost,
                },
              ],
            }),
          }),
        ],
      }),
    ).toEqual(
      Result.fail({
        tag: "battleStateInitIssue",
        kind: "characterAdmissionInvalid",
        combatantId: wizardId,
        phase: "executionBindings",
        issueIndex: 0,
        ownerPath: ["initialCombatants", 0],
        message: "Pact of the Chain Spell Access must grant Find Familiar.",
      }),
    );
  });
});
