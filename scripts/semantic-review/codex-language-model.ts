import { Effect, FileSystem, Layer, Match, Stream } from "effect";
import { AiError, LanguageModel } from "effect/ai";
import { toCodecOpenAI } from "effect/ai/OpenAiStructuredOutput";
import { ChildProcess, ChildProcessSpawner } from "effect/process";

function codexError(method: string, description: string): AiError.AiError {
  return AiError.make({
    module: "CodexLanguageModel",
    method,
    reason: new AiError.InvalidRequestError({ description }),
  });
}

export const codexLanguageModelLayer = Layer.effect(
  LanguageModel.LanguageModel,
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    return yield* LanguageModel.make({
      codecTransformer: toCodecOpenAI,
      generateText: (options) =>
        Effect.gen(function* () {
          if (options.tools.length > 0) {
            return yield* Effect.fail(
              codexError(
                "generateText",
                "This provider supports generation without tools.",
              ),
            );
          }
          const directory = yield* fs.makeTempDirectoryScoped({
            prefix: "traits-codex-",
          });
          const outputPath = `${directory}/response.txt`;
          const schemaArgs = yield* Match.value(options.responseFormat).pipe(
            Match.when({ type: "text" }, () =>
              Effect.succeed<readonly string[]>([]),
            ),
            Match.when({ type: "json" }, (format) =>
              Effect.gen(function* () {
                const schemaPath = `${directory}/response.schema.json`;
                const transformed = yield* Effect.try({
                  try: () => toCodecOpenAI(format.schema),
                  catch: (error) =>
                    AiError.make({
                      module: "CodexLanguageModel",
                      method: "generateText",
                      reason: new AiError.UnsupportedSchemaError({
                        description:
                          error instanceof Error
                            ? error.message
                            : String(error),
                      }),
                    }),
                });
                yield* fs.writeFileString(
                  schemaPath,
                  JSON.stringify(transformed.jsonSchema),
                );
                return ["--output-schema", schemaPath];
              }),
            ),
            Match.exhaustive,
          );
          const prompt = [
            "Generate the requested response from these messages. Do not use tools or inspect files.",
            JSON.stringify(options.prompt),
          ].join("\n");
          const exitCode = yield* spawner.exitCode(
            ChildProcess.make(
              "codex",
              [
                "exec",
                "--ignore-user-config",
                "--skip-git-repo-check",
                "--ephemeral",
                "--sandbox",
                "read-only",
                "--model",
                "gpt-6.1-sol",
                "--output-last-message",
                outputPath,
                ...schemaArgs,
                "-",
              ],
              {
                cwd: directory,
                stdin: Stream.make(new TextEncoder().encode(prompt)),
                stdout: "ignore",
                stderr: "inherit",
              },
            ),
          );
          if (exitCode !== 0) {
            return yield* Effect.fail(
              codexError("generateText", `Codex exited with code ${exitCode}.`),
            );
          }
          const text = yield* fs.readFileString(outputPath);
          return [{ type: "text" as const, text }];
        }).pipe(
          Effect.scoped,
          Effect.timeout("3 minutes"),
          Effect.mapError((error) =>
            AiError.isAiError(error)
              ? error
              : codexError("generateText", error.message),
          ),
        ),
      streamText: () =>
        Stream.fail(
          codexError(
            "streamText",
            "This provider supports non-streaming generation.",
          ),
        ),
    });
  }),
);
