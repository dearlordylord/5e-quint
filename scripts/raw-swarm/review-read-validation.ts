import { Either } from "effect";

export type StrictShellWords = Readonly<{
  readonly quoted: readonly boolean[];
  readonly words: readonly string[];
}>;

export type StrictReadCommand = Readonly<{
  readonly executable: StrictReadExecutable;
  readonly args: readonly string[];
  readonly words: readonly string[];
}>;

export const STRICT_READ_EXECUTABLES = [
  "cat",
  "head",
  "od",
  "rg",
  "sed",
  "sha256sum",
  "tail",
  "wc",
] as const;

export type StrictReadExecutable = (typeof STRICT_READ_EXECUTABLES)[number];

const STRICT_READ_SHELL_EXECUTABLES = [
  "/bin/bash",
  "/usr/bin/bash",
  "/bin/sh",
  "/usr/bin/sh",
] as const;

const SHELL_OPERATOR_CHARACTERS = new Set([
  ";",
  "&",
  "|",
  "(",
  ")",
  "{",
  "}",
  "<",
  ">",
]);

function isStrictReadExecutable(value: string): value is StrictReadExecutable {
  return STRICT_READ_EXECUTABLES.some((executable) => executable === value);
}

/** Parse one literal shell command without allowing expansion or composition. */
export function parseStrictShellWords(
  value: string,
): Either.Either<StrictShellWords, string> {
  const words: string[] = [];
  const quoted: boolean[] = [];
  let current = "";
  let quote: "'" | '"' | undefined;
  let wasQuoted = false;
  const flush = (): void => {
    if (current.length > 0 || wasQuoted) {
      words.push(current);
      quoted.push(wasQuoted);
    }
    current = "";
    wasQuoted = false;
  };
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index] ?? "";
    if (character === "\0" || character === "\n" || character === "\r") {
      return Either.left("command uses unsupported shell syntax");
    }
    if (character === "\\") {
      if (quote === "'") {
        current += character;
        continue;
      }
      if (quote !== '"') {
        return Either.left("command uses unquoted backslash escaping");
      }
      const escaped = value[index + 1];
      if (escaped === undefined || escaped === "$" || escaped === "`") {
        return Either.left("command uses unsupported shell syntax");
      }
      if (escaped === '"' || escaped === "\\") {
        current += escaped;
        index += 1;
      } else {
        current += character;
      }
      continue;
    }
    if (quote !== undefined) {
      if (character === quote) {
        quote = undefined;
        wasQuoted = true;
      } else if (quote === '"' && (character === "$" || character === "`")) {
        return Either.left("command uses unsupported shell syntax");
      } else {
        current += character;
      }
      continue;
    }
    if (character === "'" || character === '"') {
      quote = character;
      wasQuoted = true;
      continue;
    }
    if (
      character === "$" ||
      character === "`" ||
      character === "~" ||
      character === "*" ||
      character === "?" ||
      character === "[" ||
      character === "]" ||
      SHELL_OPERATOR_CHARACTERS.has(character)
    ) {
      return Either.left("command uses unsupported shell syntax");
    }
    if (/\s/.test(character)) {
      flush();
      continue;
    }
    current += character;
  }
  if (quote !== undefined) return Either.left("command has an unmatched quote");
  flush();
  return Either.right({ quoted, words });
}

/**
 * Parse a named first-party shell wrapper used for isolated read telemetry.
 * The command body is still literal shell words; callers apply their own
 * named-path restrictions after this shared executable/argument boundary.
 */
export function parseStrictReadCommand(
  value: string,
): Either.Either<StrictReadCommand, string> {
  const outer = parseStrictShellWords(value);
  if (Either.isLeft(outer)) return Either.left(outer.left);
  if (
    outer.right.words.length !== 3 ||
    !STRICT_READ_SHELL_EXECUTABLES.some(
      (executable) => executable === outer.right.words[0],
    ) ||
    !["-c", "-lc"].includes(outer.right.words[1] ?? "") ||
    outer.right.quoted[2] !== true
  ) {
    return Either.left(
      "command must be one quoted supported-shell read operation",
    );
  }
  const inner = parseStrictShellWords(outer.right.words[2] ?? "");
  if (Either.isLeft(inner)) return Either.left(inner.left);
  const [executable, ...args] = inner.right.words;
  if (
    executable === undefined ||
    executable.includes("/") ||
    !isStrictReadExecutable(executable)
  ) {
    return Either.left(
      `context read uses a non-read executable: ${executable ?? "<missing>"}`,
    );
  }
  if (args.length === 0) return Either.left("read operation names no file");
  return Either.right({
    executable,
    args,
    words: inner.right.words,
  });
}
