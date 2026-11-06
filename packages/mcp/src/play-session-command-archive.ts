import { Result, Schema } from "effect";
import type { PlaySessionCommand } from "./play-session.ts";

const History = Schema.Array(Schema.JsonObject);

export class PlaySessionCommandArchive {
  readonly #json: string;
  readonly #length: number;

  private constructor(json: string, length: number) {
    this.#json = json;
    this.#length = length;
    Object.freeze(this);
  }

  get json(): string {
    return this.#json;
  }
  get length(): number {
    return this.#length;
  }

  static empty(): PlaySessionCommandArchive {
    return new PlaySessionCommandArchive("[]", 0);
  }

  static parse(json: string): Result.Result<PlaySessionCommandArchive, string> {
    let value: unknown;
    try {
      value = JSON.parse(json);
    } catch (cause) {
      return Result.fail(String(cause));
    }
    return Result.mapError(
      Schema.decodeUnknownResult(History)(value),
      (issue) => issue.message,
    ).pipe(
      Result.map(
        (history) => new PlaySessionCommandArchive(json, history.length),
      ),
    );
  }

  append(
    command: PlaySessionCommand,
  ): Result.Result<PlaySessionCommandArchive, string> {
    const parsed = Schema.decodeUnknownResult(Schema.JsonObject)(command);
    if (Result.isFailure(parsed)) return Result.fail(parsed.failure.message);
    const close = this.json.lastIndexOf("]");
    return Result.succeed(
      new PlaySessionCommandArchive(
        this.json.slice(0, close) +
          (this.length === 0 ? "" : ",") +
          JSON.stringify(parsed.success) +
          this.json.slice(close),
        this.length + 1,
      ),
    );
  }
}
