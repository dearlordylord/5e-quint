import { appendFile, readFile, truncate } from "node:fs/promises";
import { Effect, Result, Semaphore } from "effect";
import {
  decodeAcknowledgedJournalRecords,
  encodeJournalRecord,
  JournalFailure,
  type JournalEvent,
  type JournalPort,
} from "./control-plane.js";

const persistenceFailure = (operation: string, cause: unknown) =>
  new JournalFailure({ operation, detail: String(cause) });

export const makeNdjsonJournal = (path: string): JournalPort => {
  const ioGate = Semaphore.makeUnsafe(1);
  return {
    append: Effect.fn("NdjsonJournal.append")((event: JournalEvent) =>
      ioGate.withPermit(
        Effect.tryPromise({
          try: () => appendFile(path, encodeJournalRecord(event), "utf8"),
          catch: (cause) => persistenceFailure("Journal.append", cause),
        }),
      ),
    ),
    recover: Effect.fn("NdjsonJournal.recover")(() =>
      ioGate.withPermit(
        Effect.gen(function* () {
          const contents = yield* Effect.tryPromise({
            try: () => readFile(path, "utf8"),
            catch: (cause) => persistenceFailure("Journal.read", cause),
          });
          const decoded = decodeAcknowledgedJournalRecords(contents);
          if (Result.isFailure(decoded)) {
            return yield* Effect.fail(decoded.failure);
          }
          if (!contents.endsWith("\n")) {
            const acknowledgedPrefix = contents.slice(
              0,
              contents.lastIndexOf("\n") + 1,
            );
            yield* Effect.tryPromise({
              try: () => truncate(path, Buffer.byteLength(acknowledgedPrefix)),
              catch: (cause) => persistenceFailure("Journal.repairTail", cause),
            });
          }
          return decoded.success;
        }),
      ),
    ),
  };
};
