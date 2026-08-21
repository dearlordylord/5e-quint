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
  type AdminMirrorSessionId,
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
  readonly createAdminMirrorPublication: (
    mirrorSessionId: AdminMirrorSessionId,
  ) => AdminMirrorPublication;
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

  const adminMirror = adminMirrorConfigurationFromEnv();
  return {
    unitLibrary: unitCatalog.catalog,
    statBlockCatalog: statBlockCatalog.catalog,
    sessionStore: createMcpSessionStore(statBlockCatalog.catalog),
    adminMirrorPublication: adminMirror.create(adminMirror.sessionId),
    createAdminMirrorPublication: adminMirror.create,
    characterCreationSupportProfile:
      input.characterCreationSupportProfile ??
      CHARACTER_CREATION_SUPPORT_PROFILE,
  };
}

export function createPlaySessionCompositionRoot(
  applicationRoot: McpCompositionRoot,
  mirrorSessionId: AdminMirrorSessionId,
): McpCompositionRoot {
  return {
    unitLibrary: applicationRoot.unitLibrary,
    statBlockCatalog: applicationRoot.statBlockCatalog,
    sessionStore: createMcpSessionStore(applicationRoot.statBlockCatalog),
    adminMirrorPublication:
      applicationRoot.createAdminMirrorPublication(mirrorSessionId),
    createAdminMirrorPublication: applicationRoot.createAdminMirrorPublication,
    characterCreationSupportProfile:
      applicationRoot.characterCreationSupportProfile,
  };
}

function adminMirrorConfigurationFromEnv(): {
  readonly sessionId: AdminMirrorSessionId;
  readonly create: (
    mirrorSessionId: AdminMirrorSessionId,
  ) => AdminMirrorPublication;
} {
  const endpoint = process.env.DND_ADMIN_MIRROR_URL;
  const sessionId = process.env.DND_ADMIN_MIRROR_SESSION_ID;
  if (endpoint === undefined || sessionId === undefined) {
    return disabledAdminMirrorConfiguration();
  }
  try {
    const publicationEndpoint = new URL(endpoint);
    return {
      sessionId: adminMirrorSessionId(sessionId),
      create: (mirrorSessionId) =>
        enabledAdminMirrorPublication({
          mirrorSessionId,
          publisher: createHttpAdminMirrorPublisher({
            endpoint: publicationEndpoint,
          }),
          publisherInstanceId: adminMirrorPublisherInstanceId(
            `${process.pid}:${randomUUID()}`,
          ),
        }),
    };
  } catch {
    return disabledAdminMirrorConfiguration();
  }
}

function disabledAdminMirrorConfiguration(): {
  readonly sessionId: AdminMirrorSessionId;
  readonly create: () => AdminMirrorPublication;
} {
  return {
    sessionId: adminMirrorSessionId("disabled"),
    create: disabledAdminMirrorPublication,
  };
}
import { randomUUID } from "node:crypto";
