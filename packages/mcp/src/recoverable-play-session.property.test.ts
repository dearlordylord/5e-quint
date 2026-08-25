import { Either } from "effect";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { createMcpApplicationServices } from "./composition-root.ts";
import {
  createRecoverablePlaySessionRegistry,
  decodePlaySessionRandomSeed,
  openSqlitePlaySessionRepository,
  type PlaySessionRepository,
} from "./recoverable-play-session.ts";
import { decodePlaySessionId, type PlaySessionId } from "./play-session.ts";
import { handleToolCall } from "./server.ts";
import type { GuestAccessGrant } from "./play-session-access.ts";

const diceGroup = fc.record({
  dice: fc.integer({ min: 1, max: 4 }),
  dieSize: fc.constantFrom(4, 6, 8, 10, 12, 20, 100),
});
const diceRequest = fc.record({
  groups: fc.array(diceGroup, { minLength: 1, maxLength: 3 }),
});
const diceRequestSequence = fc.array(diceRequest, {
  minLength: 1,
  maxLength: 5,
});

describe("recoverable Play Session properties", () => {
  test("the serialized seed and command prefix determine every dice group", async () => {
    const applicationServices = createMcpApplicationServices();
    await fc.assert(
      fc.asyncProperty(
        fc.hexaString({ minLength: 64, maxLength: 64 }),
        diceRequestSequence,
        async (seedInput, requests) => {
          const seed = decodePlaySessionRandomSeed(seedInput);
          if (Either.isLeft(seed)) throw new Error(seed.left.message);
          const playSessionId = requirePlaySessionId(
            "play-session:00000000-0000-4000-8000-000000000359",
          );
          const firstRepository = openRepository();
          const secondRepository = openRepository();
          try {
            const first = createRecoverablePlaySessionRegistry({
              applicationServices,
              repository: firstRepository,
              playSessionIdFactory: () => playSessionId,
              randomSeedFactory: () => seed.right,
            });
            const second = createRecoverablePlaySessionRegistry({
              applicationServices,
              repository: secondRepository,
              playSessionIdFactory: () => playSessionId,
              randomSeedFactory: () => seed.right,
            });
            const firstCreation = first.create({ tag: "anonymous" });
            const secondCreation = second.create({ tag: "anonymous" });
            if (
              Either.isLeft(firstCreation) ||
              firstCreation.right.access.tag !== "guest" ||
              Either.isLeft(secondCreation) ||
              secondCreation.right.access.tag !== "guest"
            ) {
              throw new Error("The property requires two Guest Play Sessions.");
            }

            for (const request of requests) {
              const firstGroups = await rollRecoverably(
                first,
                playSessionId,
                firstCreation.right.access.guestAccessGrant,
                request,
              );
              const secondGroups = await rollRecoverably(
                second,
                playSessionId,
                secondCreation.right.access.guestAccessGrant,
                request,
              );
              expect(firstGroups).toEqual(secondGroups);
            }
          } finally {
            firstRepository.close();
            secondRepository.close();
          }
        },
      ),
      {
        numRuns: 20,
        examples: [
          ["0".repeat(64), [{ groups: [{ dice: 1, dieSize: 4 }] }]],
          [
            "f".repeat(64),
            [
              {
                groups: [
                  { dice: 4, dieSize: 4 },
                  { dice: 4, dieSize: 20 },
                  { dice: 4, dieSize: 100 },
                ],
              },
            ],
          ],
        ],
      },
    );
  });
});

async function rollRecoverably(
  registry: ReturnType<typeof createRecoverablePlaySessionRegistry>,
  playSessionId: PlaySessionId,
  guestAccessGrant: GuestAccessGrant,
  request: Readonly<Record<string, unknown>>,
): Promise<unknown> {
  const result = await registry.run(
    playSessionId,
    { tag: "guest", guestAccessGrant },
    (root) => handleToolCall(root, "roll_dice", request),
    {
      command: { name: "roll_dice", args: request },
      retain: (content) => !("isError" in content),
    },
  );
  if (Either.isLeft(result)) {
    throw new Error(
      result.left.tag === "playSessionStorageFailure"
        ? result.left.message
        : "The property Play Session unexpectedly became unavailable.",
    );
  }
  if (!("structuredContent" in result.right.value)) {
    throw new Error("Recoverable dice operation omitted structured content.");
  }
  return result.right.value.structuredContent.groups;
}

function openRepository(): PlaySessionRepository {
  const repository = openSqlitePlaySessionRepository(":memory:");
  if (Either.isLeft(repository)) throw new Error(repository.left.message);
  return repository.right;
}

function requirePlaySessionId(input: string): PlaySessionId {
  const decoded = decodePlaySessionId(input);
  if (Either.isLeft(decoded)) throw new Error(decoded.left);
  return decoded.right;
}
