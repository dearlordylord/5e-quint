import { srdStatBlockCatalog } from "@dnd/surface/surface/installed-srd-stat-block-catalog";
import type { SrdStatBlockCatalog } from "@dnd/surface/surface/stat-block-catalog";
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
import {
  createDiceSamplingService,
  generatedDiceSeed,
  type DiceSeed,
  type DiceSamplingService,
} from "./dice-sampling-service.ts";

export type McpApplicationServices = {
  readonly unitLibrary: UnitCatalog;
  readonly statBlockCatalog: SrdStatBlockCatalog;
  readonly createAdminMirrorPublication: (
    mirrorSessionId: AdminMirrorSessionId,
  ) => AdminMirrorPublication;
  readonly configuredAdminMirrorSessionId: AdminMirrorSessionId;
  readonly characterCreationSupportProfile: CharacterCreationSupportProfile;
};

export type McpPlaySessionRoot = McpApplicationServices & {
  readonly sessionStore: McpSessionStore;
  readonly adminMirrorPublication: AdminMirrorPublication;
  readonly diceSampling: DiceSamplingService;
};

export function createMcpApplicationServices(
  input: {
    readonly characterCreationSupportProfile?: CharacterCreationSupportProfile;
  } = {},
): McpApplicationServices {
  const unitCatalog = buildUnitCatalog({
    collections: [srdUnitCollection],
  });
  if (unitCatalog.tag === "invalid") {
    throw new Error(
      `Invalid SRD Unit catalog for MCP application services: ${JSON.stringify(
        unitCatalog.issues,
      )}`,
    );
  }

  const adminMirror = adminMirrorConfigurationFromEnv();
  return {
    unitLibrary: unitCatalog.catalog,
    statBlockCatalog: srdStatBlockCatalog,
    createAdminMirrorPublication: adminMirror.create,
    configuredAdminMirrorSessionId: adminMirror.sessionId,
    characterCreationSupportProfile:
      input.characterCreationSupportProfile ??
      CHARACTER_CREATION_SUPPORT_PROFILE,
  };
}

export function createMcpPlaySessionRoot(
  applicationServices: McpApplicationServices = createMcpApplicationServices(),
  mirrorSessionId: AdminMirrorSessionId = applicationServices.configuredAdminMirrorSessionId,
  diceSeed: DiceSeed = generatedDiceSeed(),
): McpPlaySessionRoot {
  return {
    ...applicationServices,
    sessionStore: createMcpSessionStore({
      statBlockCatalog: applicationServices.statBlockCatalog,
      unitLibrary: applicationServices.unitLibrary,
    }),
    adminMirrorPublication:
      applicationServices.createAdminMirrorPublication(mirrorSessionId),
    diceSampling: createDiceSamplingService(diceSeed),
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
