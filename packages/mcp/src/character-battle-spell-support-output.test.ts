import { spellBattleSupport } from "@dnd/battle-runtime/consumer-protocol";
import assert from "node:assert/strict";
import {
  creationChoiceOptionId,
  finalizeCharacterDraft,
} from "@dnd/character-creation-runtime";
import {
  completeSupportedProgressionDraft,
  testProgression,
} from "@dnd/character-creation-runtime/test-support";
import { unitId } from "@dnd/shared/game-facts";
import { Schema } from "effect";
import { expect, test } from "vitest";
import { createMcpPlaySessionRoot } from "./composition-root.ts";
import { handleToolCall } from "./server.ts";
import { jsonContentPayload } from "./tool-content.ts";
import {
  CreationDraftOutputSchema,
  CharacterSessionDetailOutputSchema,
} from "./character-tool-output.ts";
import { characterIdFromDraftId } from "./session-store.ts";
import { characterBattleSpellSupportOutput } from "./character-battle-spell-support-output.ts";

test("creation and stored sheet explain the selected class spell Battle gap before initiative", () => {
  const root = createMcpPlaySessionRoot();
  const complete = completeSupportedProgressionDraft({
    draftId: "draft:cleric-spell-support",
    unitLibrary: root.unitLibrary,
    progression: testProgression(root.unitLibrary, unitId("class_cleric"), 5),
  });
  const draft = {
    ...complete,
    selections: {
      ...complete.selections,
      choices: complete.selections.choices.map((choice) =>
        choice.kind === "unitChoice" &&
        choice.source.choiceKey === "class_prepared_spell_choices"
          ? {
              ...choice,
              options: choice.options.map((option) =>
                option.optionId === "bane"
                  ? {
                      optionId: creationChoiceOptionId("spirit_guardians"),
                      unitRef: { unitId: unitId("spirit_guardians") },
                    }
                  : option.optionId === "bless"
                    ? {
                        optionId: creationChoiceOptionId("silence"),
                        unitRef: { unitId: unitId("silence") },
                      }
                    : option,
              ),
            }
          : choice,
      ),
    },
  };
  root.sessionStore.drafts.set(draft.draftId, draft);
  const output = Schema.decodeUnknownSync(CreationDraftOutputSchema)(
    jsonContentPayload(
      handleToolCall(root, "get_character_creation_choices", {
        draftId: draft.draftId,
      }),
    ),
  );
  assert(output.finalizationInput !== null);
  const support = output.finalizationInput.classSpellBattleSupport;
  expect(support).toContainEqual({
    spellId: "spirit_guardians",
    tag: "notBattleOwned",
    reason: { kind: "noMatchingBattleProcedure" },
    nextStep: "planWithoutBattleCasting",
  });
  expect(support).toContainEqual({
    spellId: "guiding_bolt",
    tag: "admitted",
    nextStep: "discoverBattleActs",
  });
  expect(
    support.some((spell) => spell.spellId === "create_or_destroy_water"),
  ).toBe(true);
  const silence = root.unitLibrary.requireUnit("silence");
  assert(silence.kind === "spell");
  const rejected = spellBattleSupport(silence.mechanics);
  assert(rejected.tag === "rejected");
  expect(support).toContainEqual({
    spellId: "silence",
    ...rejected,
    nextStep: "resolveBattleEntryBlocker",
  });
  expect(output.finalizationInput.instructions.join(" ")).toContain(
    "live targets, resources, timing",
  );
  expect(output.finalizationInput.instructions.join(" ")).toContain(
    "choosing another tactic does not allow this character to enter Battle",
  );
  expect(output.finalizationInput.instructions.join(" ")).toContain(
    "Only if the caller explicitly chooses a separate alternative build, use create_character_draft",
  );
  const finalization = finalizeCharacterDraft({
    draft,
    unitLibrary: root.unitLibrary,
  });
  assert(finalization.tag === "ready");
  const before = finalization.build.spellcasting;
  handleToolCall(root, "finalize_character", { draftId: draft.draftId });
  const detail = Schema.decodeUnknownSync(CharacterSessionDetailOutputSchema)(
    jsonContentPayload(
      handleToolCall(root, "inspect_character_session", {
        characterId: characterIdFromDraftId(draft.draftId),
      }),
    ),
  );
  assert(detail.detail.tag === "available");
  expect(detail.detail.sheetProjection.classSpellBattleSupport).toEqual(
    support,
  );
  const session = root.sessionStore.characters.get(
    characterIdFromDraftId(draft.draftId),
  );
  assert(session !== undefined);
  assert(session.tag === "available");
  expect(session.build.spellcasting).toEqual(before);
  const battleStart = handleToolCall(root, "start_battle", {
    battleId: "battle:rejected-preparation",
    initiativeMode: "direct",
    companionAdmissions: [],
    initialCombatants: [
      {
        kind: "characterSession",
        characterId: characterIdFromDraftId(draft.draftId),
        combatantId: "cleric",
        ammunitionStocks: [],
        initiative: 20,
      },
    ],
  });
  expect(battleStart).toMatchObject({ isError: true });
  expect(jsonContentPayload(battleStart)).toMatchObject({
    details: {
      code: "INVALID_BATTLE_COMBATANTS",
      issues: expect.arrayContaining([
        expect.objectContaining({
          kind: "battleInitialization",
          code: "BATTLE_INITIALIZATION_INVALID",
          reason: "characterSpellProcedureInvalid",
          cause: rejected.issues[0],
        }),
      ]),
    },
  });
  expect(
    root.sessionStore.characters.get(characterIdFromDraftId(draft.draftId)),
  ).toEqual(session);
  expect(handleToolCall(root, "create_character_draft", {})).not.toHaveProperty(
    "isError",
    true,
  );
  expect(
    root.sessionStore.characters.get(characterIdFromDraftId(draft.draftId)),
  ).toEqual(session);
  const spellcasting = finalization.build.spellcasting;
  assert(spellcasting !== undefined);
  const [source, ...sources] = spellcasting.sources;
  expect(
    characterBattleSpellSupportOutput({
      build: {
        ...finalization.build,
        spellcasting: {
          ...spellcasting,
          sources: [
            { ...source, preparedSpells: [unitId("synthetic_missing_spell")] },
            ...sources,
          ],
        },
      },
      unitLibrary: root.unitLibrary,
    }),
  ).toContainEqual({
    spellId: "synthetic_missing_spell",
    tag: "spellRecordUnavailable",
    nextStep: "resolveSpellRecordAvailability",
  });
  const { spellcasting: omittedSpellcasting, ...nonSpellcastingBuild } =
    finalization.build;
  expect(omittedSpellcasting).toBeDefined();
  expect(
    characterBattleSpellSupportOutput({
      build: nonSpellcastingBuild,
      unitLibrary: root.unitLibrary,
    }),
  ).toEqual([]);
});
