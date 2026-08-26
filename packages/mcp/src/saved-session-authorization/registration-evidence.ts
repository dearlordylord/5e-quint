import { DatabaseSync } from "node:sqlite";

import { Either, Schema } from "effect";

const EvidenceConfigurationSchema = Schema.Struct({
  databasePath: Schema.NonEmptyTrimmedString,
});

const RegistrationRowSchema = Schema.Struct({
  mechanism: Schema.Literal("cimd", "dcr"),
  registrations: Schema.Number,
});

const configuration = Schema.decodeUnknownEither(EvidenceConfigurationSchema)({
  databasePath: process.env.DND_SAVED_SESSION_AUTHORIZATION_DATABASE_PATH,
});
if (Either.isLeft(configuration)) {
  process.stderr.write(`${configuration.left.message}\n`);
  process.exitCode = 1;
} else {
  const database = new DatabaseSync(configuration.right.databasePath, {
    readOnly: true,
  });
  try {
    const rows = Schema.decodeUnknownEither(
      Schema.Array(RegistrationRowSchema),
    )(
      database
        .prepare(
          `SELECT
             CASE WHEN clientDiscoveryId IS NULL THEN 'dcr' ELSE 'cimd' END AS mechanism,
             COUNT(*) AS registrations
           FROM oauthClient
           GROUP BY mechanism
           ORDER BY mechanism`,
        )
        .all(),
    );
    if (Either.isLeft(rows)) {
      process.stderr.write(`${rows.left.message}\n`);
      process.exitCode = 1;
    } else {
      process.stdout.write(
        `${JSON.stringify(
          {
            tag: "betterAuthRegistrationEvidence",
            registrations: rows.right,
          },
          null,
          2,
        )}\n`,
      );
    }
  } finally {
    database.close();
  }
}
