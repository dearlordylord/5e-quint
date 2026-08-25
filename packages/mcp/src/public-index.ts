import { Either, Schema } from "effect";

import { createDndMcpHttpServer } from "./public-http-server.ts";
import { createPublicMcpOAuthFromEnvironment } from "./public-oauth.ts";
import { openSqlitePlaySessionRepository } from "./recoverable-play-session.ts";
import {
  PUBLIC_MCP_DEPLOYMENT_ENVIRONMENTS,
  PUBLIC_MCP_SERVICE_NAME,
  writePublicMcpInitializationFailure,
} from "./public-service-operations.ts";

const PublicMcpConfigurationSchema = Schema.Struct({
  databasePath: Schema.NonEmptyTrimmedString,
  hostname: Schema.NonEmptyTrimmedString,
  port: Schema.NumberFromString.pipe(Schema.int(), Schema.between(1, 65_535)),
  environment: Schema.Literal(...PUBLIC_MCP_DEPLOYMENT_ENVIRONMENTS),
  release: Schema.NonEmptyTrimmedString,
});

const configuration = Schema.decodeUnknownEither(PublicMcpConfigurationSchema)({
  databasePath: process.env.DND_PLAY_SESSION_DATABASE_PATH,
  hostname: process.env.DND_MCP_HOST ?? "0.0.0.0",
  port: process.env.PORT ?? "8787",
  environment: process.env.DND_MCP_ENVIRONMENT ?? "development",
  release: process.env.DND_MCP_RELEASE ?? "development",
});
const oauth = createPublicMcpOAuthFromEnvironment(process.env);
const openAiAppsChallenge = optionalEnvironmentValue(
  process.env.DND_OPENAI_APPS_CHALLENGE,
);
const metricsBearerToken = optionalEnvironmentValue(
  process.env.DND_MCP_METRICS_TOKEN,
);

if (Either.isLeft(configuration)) {
  writePublicMcpInitializationFailure("configuration");
  process.exitCode = 1;
} else if (Either.isLeft(oauth)) {
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
    const server = createDndMcpHttpServer({
      playSessionRepository: repository.right,
      hostname: configuration.right.hostname,
      port: configuration.right.port,
      ...(oauth.right === undefined ? {} : { oauth: oauth.right }),
      operations: {
        environment: configuration.right.environment,
        release: configuration.right.release,
        ...(openAiAppsChallenge === undefined ? {} : { openAiAppsChallenge }),
        ...(metricsBearerToken === undefined ? {} : { metricsBearerToken }),
      },
    });
    const endpoint = await server.listen();
    if (Either.isLeft(endpoint)) {
      repository.right.close();
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
          oauthAvailable: oauth.right !== undefined,
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
          .finally(() => repository.right.close());
      };
      process.once("SIGINT", stop);
      process.once("SIGTERM", stop);
    }
  }
}

function optionalEnvironmentValue(
  value: string | undefined,
): string | undefined {
  return value?.trim() === "" ? undefined : value;
}
