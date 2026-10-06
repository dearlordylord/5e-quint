import { characterId } from "@dnd/battle-runtime";
import { CharacterSheetIdSchema } from "@dnd/character-sheet-runtime";
import { Schema } from "effect";
import { CHARACTER_SESSION_OPERATION_SCHEMAS } from "../character-session-operation-tool-input.ts";
import { CHARACTER_SESSION_QUERY_SCHEMAS } from "../character-session-query-tool-input.ts";
import { applyCharacterSessionOperation } from "../character-session-operation-tool.ts";
import { handleCharacterToolCall } from "../character-tools.ts";
import { characterToolNames } from "../character-tool-input.ts";
import {
  DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
  READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
} from "../tool-definition-contract.ts";
import { defineChatGptStatefulTool } from "./stateful-tool.ts";

export const CHATGPT_CHARACTER_EXECUTION_TOOLS = {
  advance_class_level: defineChatGptStatefulTool({
    name: "advance_class_level",
    selection: { family: "characterMutations", operation: "advanceClassLevel" },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      operation: CHARACTER_SESSION_OPERATION_SCHEMAS.advanceClassLevel,
    }),
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) => applyCharacterSessionOperation(root, args),
  }),
  apply_lay_on_hands: defineChatGptStatefulTool({
    name: "apply_lay_on_hands",
    selection: { family: "characterMutations", operation: "applyLayOnHands" },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      operation: CHARACTER_SESSION_OPERATION_SCHEMAS.applyLayOnHands,
    }),
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) => applyCharacterSessionOperation(root, args),
  }),
  apply_spell_rest_benefit: defineChatGptStatefulTool({
    name: "apply_spell_rest_benefit",
    selection: {
      family: "characterMutations",
      operation: "applySpellRestBenefit",
    },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      operation: CHARACTER_SESSION_OPERATION_SCHEMAS.applySpellRestBenefit,
    }),
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) => applyCharacterSessionOperation(root, args),
  }),
  complete_long_rest: defineChatGptStatefulTool({
    name: "complete_long_rest",
    selection: { family: "characterMutations", operation: "completeLongRest" },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      operation: CHARACTER_SESSION_OPERATION_SCHEMAS.completeLongRest,
    }),
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) => applyCharacterSessionOperation(root, args),
  }),
  complete_short_rest: defineChatGptStatefulTool({
    name: "complete_short_rest",
    selection: { family: "characterMutations", operation: "completeShortRest" },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      operation: CHARACTER_SESSION_OPERATION_SCHEMAS.completeShortRest,
    }),
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) => applyCharacterSessionOperation(root, args),
  }),
  convert_font_of_magic_sorcery_points_to_spell_slot: defineChatGptStatefulTool(
    {
      name: "convert_font_of_magic_sorcery_points_to_spell_slot",
      selection: {
        family: "characterMutations",
        operation: "convertFontOfMagicSorceryPointsToSpellSlot",
      },
      schema: Schema.Struct({
        characterId: CharacterSheetIdSchema,
        operation:
          CHARACTER_SESSION_OPERATION_SCHEMAS.convertFontOfMagicSorceryPointsToSpellSlot,
      }),
      annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
      handle: (root, args) => applyCharacterSessionOperation(root, args),
    },
  ),
  convert_font_of_magic_spell_slot_to_sorcery_points: defineChatGptStatefulTool(
    {
      name: "convert_font_of_magic_spell_slot_to_sorcery_points",
      selection: {
        family: "characterMutations",
        operation: "convertFontOfMagicSpellSlotToSorceryPoints",
      },
      schema: Schema.Struct({
        characterId: CharacterSheetIdSchema,
        operation:
          CHARACTER_SESSION_OPERATION_SCHEMAS.convertFontOfMagicSpellSlotToSorceryPoints,
      }),
      annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
      handle: (root, args) => applyCharacterSessionOperation(root, args),
    },
  ),
  interrupt_long_rest: defineChatGptStatefulTool({
    name: "interrupt_long_rest",
    selection: { family: "characterMutations", operation: "interruptLongRest" },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      operation: CHARACTER_SESSION_OPERATION_SCHEMAS.interruptLongRest,
    }),
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) => applyCharacterSessionOperation(root, args),
  }),
  interrupt_short_rest: defineChatGptStatefulTool({
    name: "interrupt_short_rest",
    selection: {
      family: "characterMutations",
      operation: "interruptShortRest",
    },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      operation: CHARACTER_SESSION_OPERATION_SCHEMAS.interruptShortRest,
    }),
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) => applyCharacterSessionOperation(root, args),
  }),
  pass_calendar_time: defineChatGptStatefulTool({
    name: "pass_calendar_time",
    selection: { family: "characterMutations", operation: "passCalendarTime" },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      operation: CHARACTER_SESSION_OPERATION_SCHEMAS.passCalendarTime,
    }),
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) => applyCharacterSessionOperation(root, args),
  }),
  query_ability_check_ability: defineChatGptStatefulTool({
    name: "query_ability_check_ability",
    selection: { family: "characterQueries", operation: "abilityCheckAbility" },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      query: CHARACTER_SESSION_QUERY_SCHEMAS.abilityCheckAbility,
    }),
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) =>
      handleCharacterToolCall(root, {
        name: characterToolNames.queryCharacterSession,
        args: { characterId: characterId(args.characterId), query: args.query },
      }),
  }),
  query_ability_check_proficiency_bonus: defineChatGptStatefulTool({
    name: "query_ability_check_proficiency_bonus",
    selection: {
      family: "characterQueries",
      operation: "abilityCheckProficiencyBonus",
    },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      query: CHARACTER_SESSION_QUERY_SCHEMAS.abilityCheckProficiencyBonus,
    }),
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) =>
      handleCharacterToolCall(root, {
        name: characterToolNames.queryCharacterSession,
        args: { characterId: characterId(args.characterId), query: args.query },
      }),
  }),
  query_armor_class: defineChatGptStatefulTool({
    name: "query_armor_class",
    selection: { family: "characterQueries", operation: "armorClass" },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      query: CHARACTER_SESSION_QUERY_SCHEMAS.armorClass,
    }),
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) =>
      handleCharacterToolCall(root, {
        name: characterToolNames.queryCharacterSession,
        args: { characterId: characterId(args.characterId), query: args.query },
      }),
  }),
  query_jump_distance_ability: defineChatGptStatefulTool({
    name: "query_jump_distance_ability",
    selection: { family: "characterQueries", operation: "jumpDistanceAbility" },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      query: CHARACTER_SESSION_QUERY_SCHEMAS.jumpDistanceAbility,
    }),
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) =>
      handleCharacterToolCall(root, {
        name: characterToolNames.queryCharacterSession,
        args: { characterId: characterId(args.characterId), query: args.query },
      }),
  }),
  query_known_forms: defineChatGptStatefulTool({
    name: "query_known_forms",
    selection: { family: "characterQueries", operation: "knownForms" },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      query: CHARACTER_SESSION_QUERY_SCHEMAS.knownForms,
    }),
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) =>
      handleCharacterToolCall(root, {
        name: characterToolNames.queryCharacterSession,
        args: { characterId: characterId(args.characterId), query: args.query },
      }),
  }),
  query_linked_speed_grants: defineChatGptStatefulTool({
    name: "query_linked_speed_grants",
    selection: { family: "characterQueries", operation: "linkedSpeedGrants" },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      query: CHARACTER_SESSION_QUERY_SCHEMAS.linkedSpeedGrants,
    }),
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) =>
      handleCharacterToolCall(root, {
        name: characterToolNames.queryCharacterSession,
        args: { characterId: characterId(args.characterId), query: args.query },
      }),
  }),
  query_spell_access: defineChatGptStatefulTool({
    name: "query_spell_access",
    selection: { family: "characterQueries", operation: "spellAccess" },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      query: CHARACTER_SESSION_QUERY_SCHEMAS.spellAccess,
    }),
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) =>
      handleCharacterToolCall(root, {
        name: characterToolNames.queryCharacterSession,
        args: { characterId: characterId(args.characterId), query: args.query },
      }),
  }),
  query_spell_invocation: defineChatGptStatefulTool({
    name: "query_spell_invocation",
    selection: { family: "characterQueries", operation: "spellInvocation" },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      query: CHARACTER_SESSION_QUERY_SCHEMAS.spellInvocation,
    }),
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) =>
      handleCharacterToolCall(root, {
        name: characterToolNames.queryCharacterSession,
        args: { characterId: characterId(args.characterId), query: args.query },
      }),
  }),
  query_spellbook_ritual_access: defineChatGptStatefulTool({
    name: "query_spellbook_ritual_access",
    selection: {
      family: "characterQueries",
      operation: "spellbookRitualAccess",
    },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      query: CHARACTER_SESSION_QUERY_SCHEMAS.spellbookRitualAccess,
    }),
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) =>
      handleCharacterToolCall(root, {
        name: characterToolNames.queryCharacterSession,
        args: { characterId: characterId(args.characterId), query: args.query },
      }),
  }),
  query_spellbook_ritual_accesses: defineChatGptStatefulTool({
    name: "query_spellbook_ritual_accesses",
    selection: {
      family: "characterQueries",
      operation: "spellbookRitualAccesses",
    },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      query: CHARACTER_SESSION_QUERY_SCHEMAS.spellbookRitualAccesses,
    }),
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) =>
      handleCharacterToolCall(root, {
        name: characterToolNames.queryCharacterSession,
        args: { characterId: characterId(args.characterId), query: args.query },
      }),
  }),
  query_weapon_mastery_selections: defineChatGptStatefulTool({
    name: "query_weapon_mastery_selections",
    selection: {
      family: "characterQueries",
      operation: "weaponMasterySelections",
    },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      query: CHARACTER_SESSION_QUERY_SCHEMAS.weaponMasterySelections,
    }),
    annotations: READ_ONLY_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) =>
      handleCharacterToolCall(root, {
        name: characterToolNames.queryCharacterSession,
        args: { characterId: characterId(args.characterId), query: args.query },
      }),
  }),
  replace_druid_wild_shape_known_form: defineChatGptStatefulTool({
    name: "replace_druid_wild_shape_known_form",
    selection: {
      family: "characterMutations",
      operation: "replaceDruidWildShapeKnownForm",
    },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      operation:
        CHARACTER_SESSION_OPERATION_SCHEMAS.replaceDruidWildShapeKnownForm,
    }),
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) => applyCharacterSessionOperation(root, args),
  }),
  retain_one_at_a_time_companion: defineChatGptStatefulTool({
    name: "retain_one_at_a_time_companion",
    selection: {
      family: "characterMutations",
      operation: "retainOneAtATimeCompanion",
    },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      operation: CHARACTER_SESSION_OPERATION_SCHEMAS.retainOneAtATimeCompanion,
    }),
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) => applyCharacterSessionOperation(root, args),
  }),
  set_equipment_loadout: defineChatGptStatefulTool({
    name: "set_equipment_loadout",
    selection: {
      family: "characterMutations",
      operation: "setEquipmentLoadout",
    },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      operation: CHARACTER_SESSION_OPERATION_SCHEMAS.setEquipmentLoadout,
    }),
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) => applyCharacterSessionOperation(root, args),
  }),
  spend_spell_access_free_cast: defineChatGptStatefulTool({
    name: "spend_spell_access_free_cast",
    selection: {
      family: "characterMutations",
      operation: "spendSpellAccessFreeCast",
    },
    schema: Schema.Struct({
      characterId: CharacterSheetIdSchema,
      operation: CHARACTER_SESSION_OPERATION_SCHEMAS.spendSpellAccessFreeCast,
    }),
    annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
    handle: (root, args) => applyCharacterSessionOperation(root, args),
  }),
  use_monk_uncanny_metabolism_when_rolling_initiative:
    defineChatGptStatefulTool({
      name: "use_monk_uncanny_metabolism_when_rolling_initiative",
      selection: {
        family: "characterMutations",
        operation: "useMonkUncannyMetabolismWhenRollingInitiative",
      },
      schema: Schema.Struct({
        characterId: CharacterSheetIdSchema,
        operation:
          CHARACTER_SESSION_OPERATION_SCHEMAS.useMonkUncannyMetabolismWhenRollingInitiative,
      }),
      annotations: DESTRUCTIVE_NON_IDEMPOTENT_CLOSED_WORLD_TOOL_ANNOTATIONS,
      handle: (root, args) => applyCharacterSessionOperation(root, args),
    }),
} as const;
