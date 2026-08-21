import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
  type StatBlockCatalog,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
  type UnitCatalog,
} from "@dnd/surface/surface/unit-catalog";
import {
  CHARACTER_CREATION_SUPPORT_PROFILE,
  type CharacterCreationSupportProfile,
} from "@dnd/character-creation-runtime";

import {
  createHttpAdminMirrorPublisher,
  disabledAdminMirrorPublication,
  enabledAdminMirrorPublication,
  type AdminMirrorPublication,
} from "./admin-mirror.ts";
import {
  adminMirrorPublisherInstanceId,
  adminMirrorSessionId,
} from "./admin-mirror-contract.ts";
import {
  createMcpSessionStore,
  type McpSessionStore,
} from "./session-store.ts";

export type McpCompositionRoot = {
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog: StatBlockCatalog;
  readonly sessionStore: McpSessionStore;
  readonly adminMirrorPublication: AdminMirrorPublication;
  readonly characterCreationSupportProfile: CharacterCreationSupportProfile;
};

export function createMcpCompositionRoot(
  input: {
    readonly characterCreationSupportProfile?: CharacterCreationSupportProfile;
  } = {},
): McpCompositionRoot {
  const unitCatalog = buildUnitCatalog({
    collections: [srdUnitCollection],
  });
  if (unitCatalog.tag === "invalid") {
    throw new Error(
      `Invalid SRD Unit catalog for MCP root: ${JSON.stringify(
        unitCatalog.issues,
      )}`,
    );
  }

  const statBlockCatalog = buildStatBlockCatalog({
    collections: [srdStatBlockCollection],
  });
  if (statBlockCatalog.tag === "invalid") {
    throw new Error(
      `Invalid SRD Stat Block catalog for MCP root: ${JSON.stringify(
        statBlockCatalog.issues,
      )}`,
    );
  }

  return {
    unitLibrary: unitCatalog.catalog,
    statBlockCatalog: statBlockCatalog.catalog,
    sessionStore: createMcpSessionStore(statBlockCatalog.catalog),
    adminMirrorPublication: createAdminMirrorPublicationFromEnv(),
    characterCreationSupportProfile:
      input.characterCreationSupportProfile ??
      CHARACTER_CREATION_SUPPORT_PROFILE,
  };
}

export function createPlaySessionCompositionRoot(
  applicationRoot: McpCompositionRoot,
): McpCompositionRoot {
  return {
    unitLibrary: applicationRoot.unitLibrary,
    statBlockCatalog: applicationRoot.statBlockCatalog,
    sessionStore: createMcpSessionStore(applicationRoot.statBlockCatalog),
    adminMirrorPublication: applicationRoot.adminMirrorPublication,
    characterCreationSupportProfile:
      applicationRoot.characterCreationSupportProfile,
  };
}

function createAdminMirrorPublicationFromEnv(): AdminMirrorPublication {
  const endpoint = process.env.DND_ADMIN_MIRROR_URL;
  const sessionId = process.env.DND_ADMIN_MIRROR_SESSION_ID;
  if (endpoint === undefined || sessionId === undefined) {
    return disabledAdminMirrorPublication();
  }
  try {
    return enabledAdminMirrorPublication({
      mirrorSessionId: adminMirrorSessionId(sessionId),
      publisher: createHttpAdminMirrorPublisher({
        endpoint: new URL(endpoint),
      }),
      publisherInstanceId: adminMirrorPublisherInstanceId(
        `${process.pid}:${Date.now()}`,
      ),
    });
  } catch {
    return disabledAdminMirrorPublication();
  }
}
