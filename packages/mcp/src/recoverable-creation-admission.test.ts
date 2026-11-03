import assert from "node:assert/strict";
import { creationCommandChangedState } from "./play-session-command.ts";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { decodeStoredPlaySessionRecord } from "./play-session-repository.ts";
import {
  CHARACTER_CREATION_SUPPORT_PROFILE,
  PHASE1_CLASS_FIGHTER_UNIT_ID,
  WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
  characterDraftId,
  creationChoiceOptionId,
  discoverCreationHoles,
  progressionOptionId,
  type CharacterDraftId,
} from "@dnd/character-creation-runtime";
import {
  manifestFixtureOptionIds,
  supportedFillForHole,
  testProgression,
} from "@dnd/character-creation-runtime/test-support";
import { Result } from "effect";
import { expect, test } from "vitest";
import {
  createMcpApplicationServices,
  type McpPlaySessionRoot,
} from "./composition-root.ts";
import {
  createRecoverablePlaySessionRegistry,
  openSqlitePlaySessionRepository,
} from "./recoverable-play-session.ts";
import { decodePrincipalId } from "./play-session-access.ts";
import {
  generatedPlaySessionId,
  type PlaySessionCommand,
} from "./play-session.ts";
import { handleToolCall, executeStatefulToolCall } from "./server.ts";
import { handlePlaySessionOperation } from "./play-session-protocol.ts";
import { characterIdFromDraftId } from "./session-store.ts";
import { jsonContentPayload } from "./tool-content.ts";

const historicalProfile = {
  ...CHARACTER_CREATION_SUPPORT_PROFILE,
  unitOptionIdsByChoiceKey: {
    ...CHARACTER_CREATION_SUPPORT_PROFILE.unitOptionIdsByChoiceKey,
    [WEAPON_MASTERY_OPTIONS_CHOICE_KEY]: [
      ...CHARACTER_CREATION_SUPPORT_PROFILE.unitOptionIdsByChoiceKey[
        WEAPON_MASTERY_OPTIONS_CHOICE_KEY
      ],
      creationChoiceOptionId("weapon_dagger"),
      creationChoiceOptionId("weapon_shortsword"),
    ],
  },
};
const principal = decodePrincipalId("principal:creation-recovery");
assert(Result.isSuccess(principal));
const caller = {
  tag: "authenticated",
  principalId: principal.success,
} as const;

function open(path: string, historical = false) {
  const repository = openSqlitePlaySessionRepository(path);
  assert(Result.isSuccess(repository));
  const services = createMcpApplicationServices(
    historical ? { characterCreationSupportProfile: historicalProfile } : {},
  );
  return {
    repository: repository.success,
    services,
    registry: createRecoverablePlaySessionRegistry({
      repository: repository.success,
      applicationServices: services,
      playSessionIdFactory: generatedPlaySessionId,
    }),
  };
}

test("reopens historical mastery builds without admitting new unsupported choices", async () => {
  const directory = await mkdtemp(join(tmpdir(), "dnd-creation-admission-"));
  const path = join(directory, "sessions.sqlite");
  const original = open(path, true);
  const created = original.registry.create(caller);
  assert(Result.isSuccess(created));
  const id = created.success.playSessionId;
  const oldDraft = characterDraftId("draft:historical-mastery");
  const supportedDraft = characterDraftId("draft:supported-mastery");
  const unfinishedDraft = characterDraftId(
    "draft:unfinished-historical-mastery",
  );
  async function retained(
    command: Exclude<PlaySessionCommand, { toolSurface: "chatgpt" }>,
  ) {
    const result = await original.registry.run(
      id,
      caller,
      (root) => handleToolCall(root, command.name, command.args),
      { commandFor: () => command, retain: () => true },
    );
    assert(Result.isSuccess(result));
    expect(result.success.value).not.toHaveProperty("isError", true);
    if (command.name === "apply_character_creation_choices")
      expect(
        jsonContentPayload(result.success.value),
        JSON.stringify(jsonContentPayload(result.success.value)),
      ).toMatchObject({ result: { tag: "accepted" } });
    if (command.name === "finalize_character")
      expect(jsonContentPayload(result.success.value)).toMatchObject({
        finalization: { tag: "ready" },
      });
  }
  async function createCharacter(
    draftId: CharacterDraftId,
    mastery: string,
    finalize: boolean,
  ) {
    await retained({ name: "create_character_draft", args: { draftId } });
    for (let pass = 0; pass < 8; pass += 1) {
      const next = await original.registry.run(id, caller, (root) => {
        const draft = root.sessionStore.drafts.get(draftId);
        assert(draft);
        const holes = discoverCreationHoles({
          draft,
          unitLibrary: root.unitLibrary,
          supportProfile: root.characterCreationSupportProfile,
        });
        const progressionOption = progressionOptionId(
          testProgression(root.unitLibrary, PHASE1_CLASS_FIGHTER_UNIT_ID, 1),
        );
        return {
          revision: draft.revision,
          fills: holes.map((hole) =>
            hole.kind === "choice" &&
            hole.source.tag === "unitChoice" &&
            hole.source.choiceKey === WEAPON_MASTERY_OPTIONS_CHOICE_KEY
              ? {
                  kind: "choice" as const,
                  holeId: hole.holeId,
                  optionIds: ["weapon_longsword", "weapon_spear", mastery].map(
                    creationChoiceOptionId,
                  ),
                }
              : supportedFillForHole({
                  hole,
                  progressionOption,
                  fixtureOptionIds: manifestFixtureOptionIds,
                }),
          ),
        };
      });
      assert(Result.isSuccess(next));
      if (next.success.value.fills.length === 0) break;
      await retained({
        name: "apply_character_creation_choices",
        args: {
          draftId,
          expectedRevision: next.success.value.revision,
          fills: next.success.value.fills,
        },
      });
    }
    if (finalize)
      await retained({ name: "finalize_character", args: { draftId } });
  }
  try {
    await createCharacter(oldDraft, "weapon_dagger", true);
    await createCharacter(supportedDraft, "weapon_flail", true);
    await createCharacter(unfinishedDraft, "weapon_dagger", false);
    const before = await original.registry.run(id, caller, snapshot);
    assert(Result.isSuccess(before));
    expect(before.success.value.characters).toHaveLength(2);
    original.repository.close();
    const recovered = open(path);
    try {
      const after = await recovered.registry.run(id, caller, snapshot);
      assert(Result.isSuccess(after), JSON.stringify(after));
      expect(after.success.value).toEqual(before.success.value);
      const newDraft = characterDraftId("draft:new-admission");
      const call = (
        name:
          | "create_character_draft"
          | "apply_character_creation_choices"
          | "get_character_creation_choices"
          | "finalize_character"
          | "start_battle",
        args: Record<string, unknown>,
      ) =>
        handlePlaySessionOperation({
          registry: recovered.registry,
          operationName: name,
          recordOperation: true,
          args: { playSessionId: id, ...args },
          identity: caller,
          handle: (root, input) => executeStatefulToolCall(root, name, input),
        });
      const unfinished = await call("get_character_creation_choices", {
        draftId: unfinishedDraft,
      });
      expect(unfinished).not.toHaveProperty("isError", true);
      await call("create_character_draft", { draftId: newDraft });
      const newState = await recovered.registry.run(id, caller, (root) =>
        root.sessionStore.drafts.get(newDraft),
      );
      assert(Result.isSuccess(newState));
      assert(newState.success.value);
      const progressionOption = progressionOptionId(
        testProgression(
          recovered.services.unitLibrary,
          PHASE1_CLASS_FIGHTER_UNIT_ID,
          1,
        ),
      );
      const initial = discoverCreationHoles({
        draft: newState.success.value,
        unitLibrary: recovered.services.unitLibrary,
      }).map((hole) =>
        supportedFillForHole({
          hole,
          progressionOption,
          fixtureOptionIds: manifestFixtureOptionIds,
        }),
      );
      await call("apply_character_creation_choices", {
        draftId: newDraft,
        expectedRevision: 0,
        fills: initial,
      });
      const pending = await recovered.registry.run(id, caller, (root) =>
        root.sessionStore.drafts.get(newDraft),
      );
      assert(Result.isSuccess(pending));
      assert(pending.success.value);
      const masteryHole = discoverCreationHoles({
        draft: pending.success.value,
        unitLibrary: recovered.services.unitLibrary,
      }).find(
        (hole) =>
          hole.source.tag === "unitChoice" &&
          hole.source.choiceKey === WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
      );
      assert(masteryHole);
      const beforeRejected = recovered.repository.load(id);
      assert(
        Result.isSuccess(beforeRejected) &&
          beforeRejected.success.tag === "found",
      );
      const rejected = await call("apply_character_creation_choices", {
        draftId: newDraft,
        expectedRevision: pending.success.value.revision,
        fills: [
          {
            kind: "choice",
            holeId: masteryHole.holeId,
            optionIds: ["weapon_longsword", "weapon_spear", "weapon_dagger"],
          },
        ],
      });
      expect(JSON.stringify(jsonContentPayload(rejected))).toContain(
        "unsupportedChoice",
      );
      await call("finalize_character", { draftId: unfinishedDraft });
      const afterRejected = recovered.repository.load(id);
      assert(
        Result.isSuccess(afterRejected) &&
          afterRejected.success.tag === "found",
      );
      expect(afterRejected.success.record.operations).toEqual(
        beforeRejected.success.record.operations,
      );
      expect(afterRejected.success.record.operations.at(-1)).toMatchObject({
        admissionVersion: 2,
      });
      const battleArgs = (draftId: CharacterDraftId) => ({
        battleId: "battle:recovery",
        initiativeMode: "direct",
        companionAdmissions: [],
        initialCombatants: [
          {
            kind: "characterSession",
            characterId: characterIdFromDraftId(draftId),
            combatantId: "recovered-hero",
            initiative: 20,
            ammunitionStocks: [],
          },
        ],
      });
      const denied = await call("start_battle", battleArgs(oldDraft));
      expect(JSON.stringify(jsonContentPayload(denied))).toContain(
        "CHARACTER_BATTLE_INIT_INVALID",
      );
      const started = await call("start_battle", battleArgs(supportedDraft));
      expect(started).not.toHaveProperty("isError", true);
      const expectedState = await recovered.registry.run(id, caller, snapshot);
      assert(Result.isSuccess(expectedState));
      const battleState = await recovered.registry.run(
        id,
        caller,
        (root) => root.sessionStore.snapshot().battleState,
      );
      assert(Result.isSuccess(battleState));
      expect(battleState.success.value).toMatchObject({ tag: "activeBattle" });
      const historicalReopen = open(path, true);
      try {
        const rollback = await historicalReopen.registry.run(
          id,
          caller,
          snapshot,
        );
        assert(Result.isSuccess(rollback));
        expect(rollback.success.value).toEqual(expectedState.success.value);
      } finally {
        historicalReopen.repository.close();
      }
      const database = new DatabaseSync(path);
      try {
        const row = database
          .prepare("SELECT * FROM play_sessions WHERE play_session_id = ?")
          .get(id);
        assert(row);
        const decoded = decodeStoredPlaySessionRecord(
          {
            ...row,
            operations_json: JSON.stringify([
              {
                name: "create_character_draft",
                args: { draftId: "draft:future" },
                admissionVersion: 999,
              },
            ]),
          },
          id,
        );
        expect(decoded).toMatchObject({
          _tag: "Failure",
          failure: { reason: "invalidStoredRecord" },
        });
      } finally {
        database.close();
      }
      const reopen = open(path);
      try {
        const retainedDraft = await reopen.registry.run(id, caller, (root) =>
          root.sessionStore.drafts.get(newDraft),
        );
        assert(Result.isSuccess(retainedDraft));
        expect(retainedDraft.success.value).toEqual(pending.success.value);
      } finally {
        reopen.repository.close();
      }
    } finally {
      recovered.repository.close();
    }
  } finally {
    original.repository.close();
    await rm(directory, { recursive: true, force: true });
  }
});

function snapshot(root: McpPlaySessionRoot) {
  return {
    characters: Array.from(root.sessionStore.characters.entries()),
    drafts: Array.from(root.sessionStore.drafts.entries()),
  };
}

test.each([
  {
    name: "apply_character_creation_choices",
    payload: { result: { tag: "accepted" } },
    retain: true,
  },
  {
    name: "apply_character_creation_choices",
    payload: { result: { tag: "rejected" } },
    retain: false,
  },
  {
    name: "finalize_character",
    payload: { finalization: { tag: "ready" } },
    retain: true,
  },
  {
    name: "finalize_character",
    payload: { finalization: { tag: "incomplete" } },
    retain: false,
  },
  {
    name: "finalize_character",
    payload: { finalization: { tag: "invalid" } },
    retain: false,
  },
  { name: "start_battle", payload: { tag: "invalid" }, retain: true },
] as const)(
  "retains $name outcome only when appropriate ($retain)",
  ({ name, payload, retain }) => {
    expect(
      creationCommandChangedState(name, {
        content: [{ type: "text", text: "not used for retention" }],
        structuredContent: payload,
      }),
    ).toBe(retain);
  },
);

test.each([{}, null, { finalization: { tag: "futureOutcome" } }])(
  "rejects unknown creation retention contracts: %j",
  (payload) => {
    expect(() =>
      creationCommandChangedState("finalize_character", {
        content: [{ type: "text", text: "not used for retention" }],
        structuredContent: payload,
      }),
    ).toThrow("unknown retention outcome");
  },
);
