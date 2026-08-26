import { Either, Effect, ManagedRuntime, Schema } from "effect";

import { createDndMcpHttpServer } from "./public-http-server.ts";
import { createPublicMcpOAuth } from "./public-oauth.ts";
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
  authorizationDatabasePath: Schema.NonEmptyTrimmedString,
  authorizationSecret: Schema.NonEmptyTrimmedString.pipe(Schema.minLength(32)),
  databasePath: Schema.NonEmptyTrimmedString,
  hostname: Schema.NonEmptyTrimmedString,
  port: Schema.NumberFromString.pipe(Schema.int(), Schema.between(1, 65_535)),
  environment: Schema.Literal(...PUBLIC_MCP_DEPLOYMENT_ENVIRONMENTS),
  release: Schema.NonEmptyTrimmedString,
  publisherName: PublicMcpPublisherNameSchema,
  publicOrigin: Schema.URL,
});

const configuration = Schema.decodeUnknownEither(PublicMcpConfigurationSchema)({
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

if (Either.isLeft(configuration)) {
  writePublicMcpInitializationFailure("configuration");
  process.exitCode = 1;
} else {
  const resource = new URL("/mcp", configuration.right.publicOrigin);
  const issuer = new URL("/api/auth", configuration.right.publicOrigin);
  const oauth = createPublicMcpOAuth({
    resource: resource.toString(),
    authorizationServer: issuer.toString(),
    issuer: issuer.toString().replace(/\/$/u, ""),
    jwksUrl: new URL(
      "/api/auth/jwks",
      configuration.right.publicOrigin,
    ).toString(),
  });
  if (Either.isLeft(oauth)) {
    writePublicMcpInitializationFailure("oauth");
    process.exitCode = 1;
  } else {
    const repository = openSqlitePlaySessionRepository(
      configuration.right.databasePath,
    );
    if (Either.isLeft(repository)) {
      writePublicMcpInitializationFailure("storage");
      process.exitCode = 1;
    } else {
      const authorizationRuntime = ManagedRuntime.make(
        savedSessionAuthorizationLayer({
          authorizationServerOrigin: configuration.right.publicOrigin,
          databasePath: configuration.right.authorizationDatabasePath,
          resource,
          secret: configuration.right.authorizationSecret,
        }),
      );
      const authorization = await authorizationRuntime.runPromise(
        Effect.either(SavedSessionAuthorization),
      );
      if (Either.isLeft(authorization)) {
        repository.right.close();
        await authorizationRuntime.dispose();
        writePublicMcpInitializationFailure("authorization");
        process.exitCode = 1;
      } else {
        const server = createDndMcpHttpServer({
          playSessionRepository: repository.right,
          hostname: configuration.right.hostname,
          port: configuration.right.port,
          oauth: oauth.right,
          savedSessionAuthorization: {
            origin: configuration.right.publicOrigin,
            service: authorization.right,
          },
          operations: {
            environment: configuration.right.environment,
            release: configuration.right.release,
            publisherName: configuration.right.publisherName,
            ...(openAiAppsChallenge === undefined
              ? {}
              : { openAiAppsChallenge }),
            ...(metricsBearerToken === undefined ? {} : { metricsBearerToken }),
          },
        });
        const endpoint = await server.listen();
        if (Either.isLeft(endpoint)) {
          repository.right.close();
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
              environment: configuration.right.environment,
              release: configuration.right.release,
              endpoint: endpoint.right.toString(),
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
                if (Either.isLeft(closed)) {
                  writePublicMcpInitializationFailure("shutdown");
                  process.exitCode = 1;
                }
              })
              .finally(async () => {
                repository.right.close();
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
