import { Either, Schema } from "effect";

import { createDndMcpHttpServer } from "./public-http-server.ts";
import { createPublicMcpOAuthFromEnvironment } from "./public-oauth.ts";
import { openSqlitePlaySessionRepository } from "./recoverable-play-session.ts";

const PublicMcpConfigurationSchema = Schema.Struct({
  databasePath: Schema.NonEmptyTrimmedString,
  hostname: Schema.NonEmptyTrimmedString,
  port: Schema.NumberFromString.pipe(Schema.int(), Schema.between(1, 65_535)),
});

const configuration = Schema.decodeUnknownEither(PublicMcpConfigurationSchema)({
  databasePath: process.env.DND_PLAY_SESSION_DATABASE_PATH,
  hostname: process.env.DND_MCP_HOST ?? "0.0.0.0",
  port: process.env.PORT ?? "8787",
});
const oauth = createPublicMcpOAuthFromEnvironment(process.env);

if (Either.isLeft(configuration)) {
  process.stderr.write(
    `Invalid public MCP configuration: ${configuration.left.message}\n`,
  );
  process.exitCode = 1;
} else if (Either.isLeft(oauth)) {
  process.stderr.write(
    `Invalid public MCP configuration: ${oauth.left.message}\n`,
  );
  process.exitCode = 1;
} else {
  const repository = openSqlitePlaySessionRepository(
    configuration.right.databasePath,
  );
  if (Either.isLeft(repository)) {
    process.stderr.write(
      `Unable to open the Play Session store: ${repository.left.message}\n`,
    );
    process.exitCode = 1;
  } else {
    const server = createDndMcpHttpServer({
      playSessionRepository: repository.right,
      hostname: configuration.right.hostname,
      port: configuration.right.port,
      ...(oauth.right === undefined ? {} : { oauth: oauth.right }),
    });
    const endpoint = await server.listen();
    if (Either.isLeft(endpoint)) {
      repository.right.close();
      process.stderr.write(
        `Unable to start the public MCP server: ${endpoint.left.message}\n`,
      );
      process.exitCode = 1;
    } else {
      process.stderr.write(
        `Public MCP listening at ${endpoint.right.toString()}\n`,
      );
      let stopping = false;
      const stop = () => {
        if (stopping) return;
        stopping = true;
        server
          .close()
          .then((closed) => {
            if (Either.isLeft(closed)) {
              process.stderr.write(
                `Unable to stop the public MCP server: ${closed.left.message}\n`,
              );
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
