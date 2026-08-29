import { Result, Effect, ManagedRuntime, Schema } from "effect";

import { createDndMcpHttpServer } from "./public-http-server.ts";
import { createPublicMcpOAuth } from "./public-oauth.ts";
import { PublicMcpOriginSchema } from "./public-origin.ts";
import { openSqlitePlaySessionRepository } from "./recoverable-play-session.ts";
import {
  SavedSessionAuthorization,
  savedSessionAuthorizationLayer,
} from "./saved-session-authorization/service.ts";
import {
  PUBLIC_MCP_DEPLOYMENT_ENVIRONMENTS,
  DEFAULT_PUBLIC_MCP_PUBLISHER_NAME,
  PublicMcpPublisherNameSchema,
  PUBLIC_MCP_SERVICE_NAME,
  writePublicMcpInitializationFailure,
} from "./public-service-operations.ts";

const PublicMcpConfigurationSchema = Schema.Struct({
  authorizationDatabasePath: Schema.Trimmed.check(Schema.isNonEmpty()),
  authorizationSecret: Schema.Trimmed.check(Schema.isNonEmpty()).pipe(
    Schema.check(Schema.isMinLength(32)),
  ),
  databasePath: Schema.Trimmed.check(Schema.isNonEmpty()),
  hostname: Schema.Trimmed.check(Schema.isNonEmpty()),
  port: Schema.NumberFromString.pipe(
    Schema.check(Schema.isInt()),
    Schema.between(1, 65_535),
  ),
  environment: Schema.Literals([...PUBLIC_MCP_DEPLOYMENT_ENVIRONMENTS]),
  release: Schema.Trimmed.check(Schema.isNonEmpty()),
  publisherName: PublicMcpPublisherNameSchema,
  publicOrigin: PublicMcpOriginSchema,
});

const configuration = Schema.decodeUnknownResult(PublicMcpConfigurationSchema)({
  authorizationDatabasePath:
    process.env.DND_SAVED_SESSION_AUTHORIZATION_DATABASE_PATH,
  authorizationSecret: process.env.DND_SAVED_SESSION_AUTHORIZATION_SECRET,
  databasePath: process.env.DND_PLAY_SESSION_DATABASE_PATH,
  hostname: process.env.DND_MCP_HOST ?? "0.0.0.0",
  port: process.env.PORT ?? "8787",
  environment: process.env.DND_MCP_ENVIRONMENT ?? "development",
  release: process.env.DND_MCP_RELEASE ?? "development",
  publisherName:
    process.env.DND_MCP_PUBLISHER_NAME ?? DEFAULT_PUBLIC_MCP_PUBLISHER_NAME,
  publicOrigin: process.env.DND_MCP_PUBLIC_ORIGIN,
});
const openAiAppsChallenge = optionalEnvironmentValue(
  process.env.DND_OPENAI_APPS_CHALLENGE,
);
const metricsBearerToken = optionalEnvironmentValue(
  process.env.DND_MCP_METRICS_TOKEN,
);

if (Result.isFailure(configuration)) {
  writePublicMcpInitializationFailure("configuration");
  process.exitCode = 1;
} else {
  const resource = new URL("/mcp", configuration.success.publicOrigin);
  const issuer = new URL("/api/auth", configuration.success.publicOrigin);
  const oauth = createPublicMcpOAuth({
    resource: resource.toString(),
    authorizationServer: issuer.toString(),
    issuer: issuer.toString().replace(/\/$/u, ""),
    jwksUrl: new URL(
      "/api/auth/jwks",
      configuration.success.publicOrigin,
    ).toString(),
  });
  if (Result.isFailure(oauth)) {
    writePublicMcpInitializationFailure("oauth");
    process.exitCode = 1;
  } else {
    const repository = openSqlitePlaySessionRepository(
      configuration.success.databasePath,
    );
    if (Result.isFailure(repository)) {
      writePublicMcpInitializationFailure("storage");
      process.exitCode = 1;
    } else {
      const authorizationRuntime = ManagedRuntime.make(
        savedSessionAuthorizationLayer({
          authorizationServerOrigin: configuration.success.publicOrigin,
          databasePath: configuration.success.authorizationDatabasePath,
          resource,
          secret: configuration.success.authorizationSecret,
        }),
      );
      const authorization = await authorizationRuntime.runPromise(
        Effect.result(SavedSessionAuthorization),
      );
      if (Result.isFailure(authorization)) {
        repository.success.close();
        await authorizationRuntime.dispose();
        writePublicMcpInitializationFailure("authorization");
        process.exitCode = 1;
      } else {
        const server = createDndMcpHttpServer({
          playSessionRepository: repository.success,
          hostname: configuration.success.hostname,
          port: configuration.success.port,
          oauth: oauth.success,
          savedSessionAuthorization: {
            origin: configuration.success.publicOrigin,
            service: authorization.success,
          },
          operations: {
            environment: configuration.success.environment,
            release: configuration.success.release,
            publisherName: configuration.success.publisherName,
            ...(openAiAppsChallenge === undefined
              ? {}
              : { openAiAppsChallenge }),
            ...(metricsBearerToken === undefined ? {} : { metricsBearerToken }),
          },
        });
        const endpoint = await server.listen();
        if (Result.isFailure(endpoint)) {
          repository.success.close();
          await authorizationRuntime.dispose();
          writePublicMcpInitializationFailure("listen");
          process.exitCode = 1;
        } else {
          process.stderr.write(
            `${JSON.stringify({
              timestamp: new Date().toISOString(),
              severity: "info",
              event: "public_mcp_initialized",
              service: PUBLIC_MCP_SERVICE_NAME,
              environment: configuration.success.environment,
              release: configuration.success.release,
              endpoint: endpoint.success.toString(),
              oauthAvailable: true,
              domainChallengeAvailable: openAiAppsChallenge !== undefined,
              metricsAvailable: metricsBearerToken !== undefined,
            })}\n`,
          );
          let stopping = false;
          const stop = () => {
            if (stopping) return;
            stopping = true;
            server
              .close()
              .then((closed) => {
                if (Result.isFailure(closed)) {
                  writePublicMcpInitializationFailure("shutdown");
                  process.exitCode = 1;
                }
              })
              .finally(async () => {
                repository.success.close();
                await authorizationRuntime.dispose();
              });
          };
          process.once("SIGINT", stop);
          process.once("SIGTERM", stop);
        }
      }
    }
  }
}

function optionalEnvironmentValue(
  value: string | undefined,
): string | undefined {
  return value?.trim() === "" ? undefined : value;
}
