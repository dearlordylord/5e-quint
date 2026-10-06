import { describe, expect, it } from "vitest";
import { createMcpPlaySessionRoot } from "../composition-root.ts";
import { CHATGPT_CHARACTER_EXECUTION_TOOLS } from "./character-execution-tools.ts";
import { CHATGPT_LIFECYCLE_EXECUTION_TOOLS } from "./lifecycle-execution-tools.ts";

// Each request is structurally valid but identifies a character absent from this Play Session.
const foreignCharacterCalls = {
  advance_class_level: {
    operation: {
      kind: "advanceClassLevel",
      levelGain: {
        tag: "classLevelGain",
        classUnitId: "synthetic-class",
        hitPointRule: { tag: "fixedHigherLevelGain" },
      },
    },
  },
  apply_lay_on_hands: {
    operation: {
      kind: "applyLayOnHands",
      targetCharacterId: "synthetic-target",
      restoreHp: 1,
      removePoisoned: false,
    },
  },
  apply_spell_rest_benefit: {
    operation: {
      kind: "applySpellRestBenefit",
      spellId: "synthetic-spell",
      castLevel: 1,
      recipients: [
        {
          characterId: "synthetic-target",
          eligibility: { remainedWithinRangeForEntireCasting: true },
          healingRolls: [],
        },
      ],
    },
  },
  complete_long_rest: {
    operation: {
      kind: "completeLongRest",
      timing: { tag: "noPriorLongRest" },
      restedTicks: 480,
    },
  },
  complete_short_rest: {
    operation: { kind: "completeShortRest", restedTicks: 60 },
  },
  convert_font_of_magic_sorcery_points_to_spell_slot: {
    operation: {
      kind: "convertFontOfMagicSorceryPointsToSpellSlot",
      spellLevel: 1,
    },
  },
  convert_font_of_magic_spell_slot_to_sorcery_points: {
    operation: {
      kind: "convertFontOfMagicSpellSlotToSorceryPoints",
      spellLevel: 1,
    },
  },
  interrupt_long_rest: {
    operation: {
      kind: "interruptLongRest",
      timing: { tag: "noPriorLongRest" },
      interruptionSegments: [
        { cumulativeRestedTicks: 120, interruption: "rollInitiative" },
      ],
      completion: { cumulativeRestedTicks: 600 },
    },
  },
  interrupt_short_rest: {
    operation: { kind: "interruptShortRest", interruption: "rollInitiative" },
  },
  pass_calendar_time: {
    operation: {
      kind: "passCalendarTime",
      duration: { kind: "timeSpan", unit: "hour", amount: 1 },
      fills: [],
    },
  },
  query_ability_check_ability: {
    query: {
      kind: "abilityCheckAbility",
      skill: "athletics",
      defaultAbility: "str",
      activeFeatureUnitIds: [],
    },
  },
  query_ability_check_proficiency_bonus: {
    query: {
      kind: "abilityCheckProficiencyBonus",
      skill: "athletics",
      otherProficiencyBonus: { tag: "noOtherProficiencyBonus" },
    },
  },
  query_armor_class: { query: { kind: "armorClass" } },
  query_jump_distance_ability: {
    query: { kind: "jumpDistanceAbility", defaultAbility: "str" },
  },
  query_known_forms: { query: { kind: "knownForms" } },
  query_linked_speed_grants: { query: { kind: "linkedSpeedGrants" } },
  query_spell_access: { query: { kind: "spellAccess" } },
  query_spell_invocation: {
    query: {
      kind: "spellInvocation",
      spellId: "synthetic-spell",
      invocation: { kind: "ritual" },
    },
  },
  query_spellbook_ritual_access: {
    query: { kind: "spellbookRitualAccess", spellId: "synthetic-spell" },
  },
  query_spellbook_ritual_accesses: {
    query: { kind: "spellbookRitualAccesses" },
  },
  query_weapon_mastery_selections: {
    query: {
      kind: "weaponMasterySelections",
      featureUnitId: "synthetic-feature",
    },
  },
  replace_druid_wild_shape_known_form: {
    operation: {
      kind: "replaceDruidWildShapeKnownForm",
      replacement: {
        replaceStatBlockId: "synthetic-form-one",
        selectedStatBlockId: "synthetic-form-two",
      },
    },
  },
  retain_one_at_a_time_companion: {
    operation: {
      kind: "retainOneAtATimeCompanion",
      companionId: "synthetic-companion",
      source: { tag: "ritualSpell", spellId: "synthetic-spell" },
      selectedForm: { tag: "normalNamedForm", formId: "synthetic-form" },
    },
  },
  set_equipment_loadout: {
    operation: { kind: "setEquipmentLoadout", loadout: {} },
  },
  spend_spell_access_free_cast: {
    operation: {
      kind: "spendSpellAccessFreeCast",
      sourceUnitId: "synthetic-feature",
      spellId: "synthetic-spell",
    },
  },
  use_monk_uncanny_metabolism_when_rolling_initiative: {
    operation: {
      kind: "useMonkUncannyMetabolismWhenRollingInitiative",
      martialArtsRoll: 1,
    },
  },
} satisfies Record<keyof typeof CHATGPT_CHARACTER_EXECUTION_TOOLS, object>;

const unopenedBattleCalls = {
  add_combatant: {
    operation: {
      kind: "addCombatant",
      combatant: {
        kind: "statBlock",
        combatantId: "synthetic-combatant",
        statBlockId: "synthetic-stat-block",
        initiative: 10,
        ammunitionStocks: [],
        admissionSource: { kind: "encounterParticipant" },
      },
    },
  },
  remove_combatant: {
    operation: { kind: "removeCombatant", combatantId: "synthetic-combatant" },
  },
  apply_initiative_swap: {
    operation: {
      kind: "applyInitiativeSwap",
      sourceId: "synthetic-source",
      candidateId: "synthetic-candidate",
      candidateWitness: { tag: "willingAlly" },
    },
  },
  finalize_initial_initiative_setup: {
    operation: { kind: "finalizeInitialInitiativeSetup" },
  },
} satisfies Record<keyof typeof CHATGPT_LIFECYCLE_EXECUTION_TOOLS, object>;

describe("explicit ChatGPT character and lifecycle execution", () => {
  it.each(Object.values(CHATGPT_CHARACTER_EXECUTION_TOOLS))(
    "$definition.name rejects a foreign character without changing the Play Session",
    (tool) => {
      const root = createMcpPlaySessionRoot();
      const before = root.sessionStore.snapshot();
      const result = tool.handle(root, {
        characterId: "synthetic-foreign-character",
        ...foreignCharacterCalls[tool.definition.name],
      });
      expect(JSON.stringify(result)).toContain("UNKNOWN_CHARACTER_SESSION");
      expect(root.sessionStore.snapshot()).toEqual(before);
    },
  );

  it.each(Object.values(CHATGPT_LIFECYCLE_EXECUTION_TOOLS))(
    "$definition.name requires an open Battle lifecycle without changing the Play Session",
    (tool) => {
      const root = createMcpPlaySessionRoot();
      const before = root.sessionStore.snapshot();
      expect(
        JSON.stringify(
          tool.handle(root, unopenedBattleCalls[tool.definition.name]),
        ),
      ).toContain("BATTLE_LIFECYCLE_NOT_OPEN");
      expect(root.sessionStore.snapshot()).toEqual(before);
    },
  );

  it("rejects another operation before reaching character state", () => {
    const root = createMcpPlaySessionRoot();
    const before = root.sessionStore.snapshot();
    const tool = CHATGPT_CHARACTER_EXECUTION_TOOLS.set_equipment_loadout;
    const wrong = tool.handle(root, {
      characterId: "missing-character",
      operation: {
        kind: "spendSpellAccessFreeCast",
        sourceUnitId: "synthetic-source",
        spellId: "synthetic-spell",
      },
    });
    expect("isError" in wrong && wrong.isError).toBe(true);
    expect(JSON.stringify(wrong)).toContain("INVALID_ARGUMENTS");
    expect(root.sessionStore.snapshot()).toEqual(before);
    const admitted = tool.handle(root, {
      characterId: "missing-character",
      operation: { kind: "setEquipmentLoadout", loadout: {} },
    });
    expect(JSON.stringify(admitted)).toContain("UNKNOWN_CHARACTER_SESSION");
  });

  it("binds each query to its own canonical input grammar", () => {
    const root = createMcpPlaySessionRoot();
    const tool = CHATGPT_CHARACTER_EXECUTION_TOOLS.query_spell_access;
    expect(
      JSON.stringify(
        tool.handle(root, {
          characterId: "missing-character",
          query: { kind: "knownForms" },
        }),
      ),
    ).toContain("INVALID_ARGUMENTS");
    expect(
      JSON.stringify(
        tool.handle(root, {
          characterId: "missing-character",
          query: { kind: "spellAccess" },
        }),
      ),
    ).toContain("UNKNOWN_CHARACTER_SESSION");
    expect(tool.definition.annotations.readOnlyHint).toBe(true);
  });

  it("prevents one lifecycle tool from selecting another lifecycle operation", () => {
    const root = createMcpPlaySessionRoot();
    const tool =
      CHATGPT_LIFECYCLE_EXECUTION_TOOLS.finalize_initial_initiative_setup;
    expect(
      JSON.stringify(
        tool.handle(root, {
          operation: {
            kind: "removeCombatant",
            combatantId: "synthetic-combatant",
          },
        }),
      ),
    ).toContain("INVALID_ARGUMENTS");
    expect(
      JSON.stringify(
        tool.handle(root, {
          operation: { kind: "finalizeInitialInitiativeSetup" },
        }),
      ),
    ).toContain("BATTLE_LIFECYCLE_NOT_OPEN");
  });
});
