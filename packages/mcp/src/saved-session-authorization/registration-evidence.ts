import { DatabaseSync } from "node:sqlite";

import { Result, Schema } from "effect";

const EvidenceConfigurationSchema = Schema.Struct({
  databasePath: Schema.Trimmed.check(Schema.isNonEmpty()),
});

const RegistrationRowSchema = Schema.Struct({
  mechanism: Schema.Literals(["cimd", "dcr"]),
  registrations: Schema.Number,
});

const configuration = Schema.decodeUnknownResult(EvidenceConfigurationSchema)({
  databasePath: process.env.DND_SAVED_SESSION_AUTHORIZATION_DATABASE_PATH,
});
if (Result.isFailure(configuration)) {
  process.stderr.write(`${configuration.failure.message}\n`);
  process.exitCode = 1;
} else {
  const database = new DatabaseSync(configuration.success.databasePath, {
    readOnly: true,
  });
  try {
    const rows = Schema.decodeUnknownResult(
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
    if (Result.isFailure(rows)) {
      process.stderr.write(`${rows.failure.message}\n`);
      process.exitCode = 1;
    } else {
      process.stdout.write(
        `${JSON.stringify(
          {
            tag: "betterAuthRegistrationEvidence",
            registrations: rows.success,
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
