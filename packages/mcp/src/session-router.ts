import type { SupportedActionHost } from "./server-shared.ts";
import { handleToolCall } from "./server.ts";
import {
  createBattleHost,
  createDemoHost,
  type BattleActionHost,
} from "./host-factories.ts";

export type SessionCharacterListRef = {
  readonly listId: string;
};

export type EncounterDraft = {
  readonly participantIds: ReadonlyArray<string>;
};

export type SessionRouterSnapshot = {
  readonly activeScope: "creature" | "battle";
  readonly encounterDraft: EncounterDraft | null;
  readonly characterListRefs: ReadonlyArray<SessionCharacterListRef>;
};

export type ToolCallResult = ReturnType<typeof handleToolCall>;

export interface SessionRouter {
  handleToolCall(name: string, args: unknown): ToolCallResult;
  readonly activeHost: SupportedActionHost;
  getSnapshot(): SessionRouterSnapshot;
}

type CreateSessionRouterOptions = {
  readonly encounterDraft?: EncounterDraft | null;
  readonly characterListRefs?: ReadonlyArray<SessionCharacterListRef>;
};

function hasScopeAndType(
  args: unknown,
): args is { readonly scope: string; readonly type: string } {
  return (
    typeof args === "object" &&
    args !== null &&
    "scope" in args &&
    "type" in args &&
    typeof (args as Record<string, unknown>).scope === "string" &&
    typeof (args as Record<string, unknown>).type === "string"
  );
}

function cloneEncounterDraft(
  draft: EncounterDraft | null,
): EncounterDraft | null {
  return draft == null ? null : { participantIds: [...draft.participantIds] };
}

function stopHost(host: SupportedActionHost) {
  host.actor.stop();
}

export function createSessionRouter(
  initialHost: SupportedActionHost = createDemoHost(),
  options: CreateSessionRouterOptions = {},
): SessionRouter {
  let activeHost: SupportedActionHost = initialHost;
  const encounterDraft = cloneEncounterDraft(options.encounterDraft ?? null);
  const characterListRefs = [...(options.characterListRefs ?? [])];

  return {
    get activeHost() {
      return activeHost;
    },

    getSnapshot() {
      return {
        activeScope: activeHost.scope,
        encounterDraft: cloneEncounterDraft(encounterDraft),
        characterListRefs: [...characterListRefs],
      };
    },

    handleToolCall(name: string, args: unknown): ToolCallResult {
      if (
        name === "execute_control_command" &&
        activeHost.scope !== "battle" &&
        hasScopeAndType(args) &&
        args.scope === "battle" &&
        args.type === "BATTLE_INIT"
      ) {
        const battleHost: BattleActionHost = createBattleHost();
        const result = handleToolCall(battleHost, name, args);
        if ("isError" in result) {
          stopHost(battleHost);
          return result;
        }

        const previousHost = activeHost;
        activeHost = battleHost;
        stopHost(previousHost);
        return result;
      }

      return handleToolCall(activeHost, name, args);
    },
  };
}
