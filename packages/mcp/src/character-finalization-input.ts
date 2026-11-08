import {
  equippedWeaponBattleBlockersOutput,
  type EquippedWeaponBattleBlockersSchema,
} from "./equipped-weapon-battle-blockers.ts";
import type { CharacterBattleSpellSupportSchema } from "./character-battle-spell-support-schema.ts";
import {
  CIRCLE_LAND_ARGUMENT,
  KNOWN_FORMS_ARGUMENT,
  type InitializationArgument,
  type FinalizationInputGuidance,
} from "./character-finalization-input-guidance.ts";
import { characterBattleSpellSupportOutput } from "./character-battle-spell-support-output.ts";
import {
  characterBuildDruidWildShapeFacts,
  type CharacterBuild,
  type CharacterBuildDruidWildShapeFacts,
  type CharacterDraftId,
  type CreationFinalizationResult,
} from "@dnd/character-creation-runtime";
import {
  characterSheetConstructionIssuesSummary,
  createFreshCharacterSheet,
  druidCircleLandChoicesForBuild,
} from "@dnd/character-sheet-runtime";
import { Hp } from "@dnd/shared/types";
import type { DruidCircleLandChoice } from "@dnd/surface/surface/types";
import { Result, Schema } from "effect";

import type { McpPlaySessionRoot } from "./composition-root.ts";
import {
  FinalizeCharacterArgsSchema,
  type CharacterToolCall,
} from "./character-tool-input.ts";
import { characterIdFromDraftId } from "./session-store.ts";
import { StatBlockId } from "@dnd/shared/game-facts";
import { errorContent } from "./tool-content.ts";
import { mcpObjectJsonSchema, type ToolError } from "./schema-codec.ts";

export function characterFinalizationInput(input: {
  readonly root: Pick<McpPlaySessionRoot, "unitLibrary">;
  readonly draftId: CharacterDraftId;
  readonly finalization: CreationFinalizationResult;
}): Result.Result<FinalizationInputGuidance, ToolError> {
  if (input.finalization.tag !== "ready") return Result.succeed(null);
  const build = input.finalization.build;
  const land = druidCircleLandChoicesForBuild({
    build,
    unitLibrary: input.root.unitLibrary,
  });
  const wildShape = characterBuildDruidWildShapeFacts({
    build,
    unitLibrary: input.root.unitLibrary,
  });
  if (Result.isFailure(land))
    return initializationDiscoveryFailure(land.failure);
  if (Result.isFailure(wildShape))
    return initializationDiscoveryFailure(wildShape.failure);
  return Result.succeed(
    characterSheetInitializationCall({
      draftId: input.draftId,
      land: land.success,
      knownForms: wildShape.success?.knownFormRoster,
      equippedWeaponBattleBlockers: equippedWeaponBattleBlockersOutput({
        build,
        unitLibrary: input.root.unitLibrary,
      }),
      classSpellBattleSupport: characterBattleSpellSupportOutput({
        build,
        unitLibrary: input.root.unitLibrary,
      }),
    }),
  );
}

function classSpellBattleSupportInstructions(
  support: typeof CharacterBattleSpellSupportSchema.Type,
): readonly string[] {
  if (support.length === 0) return [];
  return [
    "Review classSpellBattleSupport before planning an encounter. It covers selected class cantrips and prepared spells, not execution outside Battle.",
    ...(support.some(({ tag }) => tag === "admitted")
      ? [
          "Admitted mechanics still require live targets, resources, timing, and other casting conditions; use available Battle acts during play.",
        ]
      : []),
    ...(support.some(({ tag }) => tag === "notBattleOwned")
      ? [
          "For planWithoutBattleCasting, retain the selection for other uses and choose a tactic that does not require casting it in Battle.",
        ]
      : []),
    ...(support.some(({ tag }) => tag === "rejected")
      ? [
          "A rejected procedure is a Battle entry blocker: choosing another tactic does not allow this character to enter Battle. Creation tools cannot revise existing preparation choices in place. Only if the caller explicitly chooses a separate alternative build, use create_character_draft and select its preparation there, retaining the original draft or sheet.",
        ]
      : []),
    ...(support.some(({ tag }) => tag === "spellRecordUnavailable")
      ? [
          "For resolveSpellRecordAvailability, the selected spell record could not be read. This alone establishes neither Battle entry nor a casting route. Canonical character-to-Battle admission determines whether an absent selection is runtime-detached or a handoff issue.",
        ]
      : []),
  ];
}

function characterSheetInitializationCall(input: {
  readonly draftId: CharacterDraftId;
  readonly classSpellBattleSupport: typeof CharacterBattleSpellSupportSchema.Type;
  readonly equippedWeaponBattleBlockers: typeof EquippedWeaponBattleBlockersSchema.Type;
  readonly land: readonly DruidCircleLandChoice[] | undefined;
  readonly knownForms:
    | CharacterBuildDruidWildShapeFacts["knownFormRoster"]
    | undefined;
}): Exclude<FinalizationInputGuidance, null> {
  const { land, knownForms } = input;
  const requiredArguments: InitializationArgument[] = [
    ...(land === undefined ? [] : ([CIRCLE_LAND_ARGUMENT] as const)),
    ...(knownForms === undefined ? [] : ([KNOWN_FORMS_ARGUMENT] as const)),
  ];
  const argumentsSchema = mcpObjectJsonSchema(
    Schema.Struct({
      ...FinalizeCharacterArgsSchema.fields,
      draftId: Schema.Literal(input.draftId),
      druidCircleLand:
        land === undefined
          ? Schema.optionalKey(Schema.Never)
          : Schema.Struct({ land: Schema.Literals(land) }),
      druidWildShapeKnownFormStatBlockIds:
        knownForms === undefined
          ? Schema.optionalKey(Schema.Never)
          : Schema.Array(StatBlockId).check(
              Schema.isMinLength(knownForms.count),
              Schema.isMaxLength(knownForms.count),
              Schema.isUnique(),
            ),
    }),
  );
  const instructions = [
    "Review equippedWeaponBattleBlockers before planning an encounter. Ownership and equipping remain valid for noncombat use; resolve any listed Battle-entry blockers using their nextStep guidance.",
    ...classSpellBattleSupportInstructions(input.classSpellBattleSupport),
    "The Character Build is complete. This schema describes the operation arguments for finalize_character; add the current playSessionId when invoking the hosted tool. Supply these initialization choices to create the in-play Character Sheet; no additional creation-hole fills are needed.",
    ...(land === undefined
      ? []
      : [
          "Choose the initial Circle Spells land explicitly. It is retained Character Sheet state and can change when a Long Rest finishes; it is not a permanent build choice.",
        ]),
    ...(knownForms === undefined
      ? []
      : [
          `Choose ${knownForms.count} distinct known ${knownForms.creatureType} forms from list_stat_blocks, each with Challenge Rating at most ${knownForms.maxChallengeRating}; Fly Speed is ${knownForms.flySpeed}. Supply their canonical Stat Block ids.`,
        ]),
  ];
  const [first, ...rest] = requiredArguments;
  return first === undefined
    ? {
        phase: "ready",
        tool: "finalize_character",
        argumentsSchema,
        instructions,
        classSpellBattleSupport: input.classSpellBattleSupport,
        equippedWeaponBattleBlockers: input.equippedWeaponBattleBlockers,
      }
    : {
        phase: "initializationRequired",
        requiredArguments: [first, ...rest],
        tool: "finalize_character",
        argumentsSchema,
        instructions,
        classSpellBattleSupport: input.classSpellBattleSupport,
        equippedWeaponBattleBlockers: input.equippedWeaponBattleBlockers,
      };
}

function initializationDiscoveryFailure(issue: { readonly message: string }) {
  return Result.fail(
    errorContent(
      "Character Sheet initialization requirements could not be discovered.",
      {
        code: "CHARACTER_INITIALIZATION_DISCOVERY_FAILED",
        message: issue.message,
      },
    ),
  );
}

export function createCharacterSheetForFinalization(input: {
  readonly root: McpPlaySessionRoot;
  readonly args: Extract<
    CharacterToolCall,
    { readonly name: "finalize_character" }
  >["args"];
  readonly build: CharacterBuild;
}) {
  const finalizationInput = characterFinalizationInput({
    root: input.root,
    draftId: input.args.draftId,
    finalization: { tag: "ready", build: input.build },
  });
  if (Result.isFailure(finalizationInput))
    return Result.fail(finalizationInput.failure);
  const guidance = finalizationInput.success;
  if (guidance?.phase === "initializationRequired") {
    const missingArguments = guidance.requiredArguments.filter(
      (field) => input.args[field] === undefined,
    );
    if (missingArguments.length > 0) {
      return Result.fail(
        errorContent(
          "The Character Build is complete, but Character Sheet initialization choices are required.",
          {
            code: "CHARACTER_INITIALIZATION_REQUIRED",
            missingArguments,
            finalizationInput: guidance,
          },
        ),
      );
    }
  }
  return Result.mapError(
    createFreshCharacterSheet({
      characterId: characterIdFromDraftId(input.args.draftId),
      build: input.build,
      tempHp: Hp(0),
      hitPointMaximumReduction: Hp(0),
      conditions: [],
      unitLibrary: input.root.unitLibrary,
      statBlockCatalog: input.root.statBlockCatalog,
      ...(input.args.druidCircleLand === undefined
        ? {}
        : { druidCircleLand: input.args.druidCircleLand }),
      ...(input.args.druidWildShapeKnownFormStatBlockIds === undefined
        ? {}
        : {
            druidWildShapeKnownFormStatBlockIds:
              input.args.druidWildShapeKnownFormStatBlockIds,
          }),
    }),
    (issues) =>
      errorContent("Character finalization session failed.", {
        code: "CHARACTER_SESSION_INVALID",
        message: characterSheetConstructionIssuesSummary(issues),
        finalizationInput: guidance,
      }),
  );
}
