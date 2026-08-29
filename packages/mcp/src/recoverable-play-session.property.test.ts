import { Either } from "effect";
import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { createMcpApplicationServices } from "./composition-root.ts";
import {
  createRecoverablePlaySessionRegistry,
  decodePlaySessionDiceSeed,
  openSqlitePlaySessionRepository,
  type PlaySessionRepository,
} from "./recoverable-play-session.ts";
import { DICE_RANDOM_SOURCE } from "./dice-sampling-service.ts";
import { decodePlaySessionId, type PlaySessionId } from "./play-session.ts";
import { handleToolCall } from "./server.ts";
import { decodeDiceToolCall } from "./dice-tool-input.ts";
import { decodeRollDiceResult } from "./dice-tool-output.ts";
import {
  GUEST_INACTIVITY_RETENTION_MS,
  decodeEpochMilliseconds,
  decodeGuestAccessGrant,
  type EpochMilliseconds,
  type GuestAccessGrant,
} from "./play-session-access.ts";

const diceGroup = fc.record({
  dice: fc.integer({ min: 1, max: 4 }),
  dieSize: fc.constantFrom(4, 6, 8, 10, 12, 20, 100),
});
const diceRequest = fc.record({
  requestId: fc.uuid(),
  groups: fc.array(diceGroup, { minLength: 1, maxLength: 3 }),
});
const diceRequestSequence = fc.array(diceRequest, {
  minLength: 1,
  maxLength: 5,
});

describe("recoverable Play Session properties", () => {
  test("uses injected guest access and time across authorization and expiry", async () => {
    const applicationServices = createMcpApplicationServices();
    const repository = openRepository();
    const playSessionId = requirePlaySessionId(
      "play-session:00000000-0000-4000-8000-000000000358",
    );
    const guestAccessGrant = requireGuestAccessGrant("1".repeat(64));
    const wrongGuestAccessGrant = requireGuestAccessGrant("2".repeat(64));
    let now = requireEpochMilliseconds(1_000);
    try {
      const registry = createRecoverablePlaySessionRegistry({
        applicationServices,
        repository,
        playSessionIdFactory: () => playSessionId,
        guestAccessGrantFactory: () => guestAccessGrant,
        now: () => now,
      });
      const creation = registry.create({ tag: "anonymous" });
      if (Either.isLeft(creation) || creation.right.access.tag !== "guest") {
        throw new Error("Expected a recoverable Guest Play Session.");
      }
      expect(creation.right.access.guestAccessGrant).toBe(guestAccessGrant);
      expect(creation.right.tenure).toMatchObject({
        tag: "guest",
        inactiveExpiresAt: new Date(
          1_000 + GUEST_INACTIVITY_RETENTION_MS,
        ).toISOString(),
      });

      now = requireEpochMilliseconds(1_001);
      const unauthorized = await registry.run(
        playSessionId,
        { tag: "guest", guestAccessGrant: wrongGuestAccessGrant },
        (root) => root.sessionStore.snapshot(),
      );
      expect(Either.isLeft(unauthorized)).toBe(true);

      const authorized = await registry.run(
        playSessionId,
        { tag: "guest", guestAccessGrant },
        (root) => root.sessionStore.snapshot(),
      );
      expect(Either.isRight(authorized)).toBe(true);

      now = requireEpochMilliseconds(1_001 + GUEST_INACTIVITY_RETENTION_MS);
      const expired = await registry.run(
        playSessionId,
        { tag: "guest", guestAccessGrant },
        (root) => root.sessionStore.snapshot(),
      );
      expect(Either.isLeft(expired)).toBe(true);
    } finally {
      repository.close();
    }
  });

  test("the serialized seed and command prefix determine every dice group", async () => {
    const applicationServices = createMcpApplicationServices();
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.hexaString({ minLength: 8, maxLength: 8 }),
          fc.hexaString({ minLength: 8, maxLength: 8 }),
          fc.hexaString({ minLength: 8, maxLength: 8 }),
          fc.hexaString({ minLength: 8, maxLength: 8 }),
        ),
        diceRequestSequence,
        async (seedInput, requests) => {
          const normalizedSeed = seedInput.every((word) => word === "00000000")
            ? [seedInput[0], seedInput[1], seedInput[2], "00000001"]
            : seedInput;
          const seed = decodePlaySessionDiceSeed(normalizedSeed);
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
              diceReplayFactory: () => ({
                seed: seed.right,
                randomSource: DICE_RANDOM_SOURCE,
              }),
            });
            const second = createRecoverablePlaySessionRegistry({
              applicationServices,
              repository: secondRepository,
              playSessionIdFactory: () => playSessionId,
              diceReplayFactory: () => ({
                seed: seed.right,
                randomSource: DICE_RANDOM_SOURCE,
              }),
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
              const firstSampling = await rollRecoverably(
                first,
                playSessionId,
                firstCreation.right.access.guestAccessGrant,
                request,
              );
              const secondSampling = await rollRecoverably(
                second,
                playSessionId,
                secondCreation.right.access.guestAccessGrant,
                request,
              );
              expect(firstSampling.groups).toEqual(secondSampling.groups);
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
          [
            ["00000000", "00000000", "00000000", "00000000"],
            [
              {
                requestId: "00000000-0000-4000-8000-000000000001",
                groups: [{ dice: 1, dieSize: 4 }],
              },
            ],
          ],
          [
            ["ffffffff", "ffffffff", "ffffffff", "ffffffff"],
            [
              {
                requestId: "00000000-0000-4000-8000-000000000002",
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

  test("reconstructs retained request ids without consuming the sequence twice", async () => {
    const applicationServices = createMcpApplicationServices();
    const repository = openRepository();
    const playSessionId = requirePlaySessionId(
      "play-session:00000000-0000-4000-8000-000000000360",
    );
    const registry = createRecoverablePlaySessionRegistry({
      applicationServices,
      repository,
      playSessionIdFactory: () => playSessionId,
    });
    try {
      const creation = registry.create({ tag: "anonymous" });
      if (Either.isLeft(creation) || creation.right.access.tag !== "guest") {
        throw new Error("Expected a recoverable Guest Play Session.");
      }
      const request = {
        requestId: "00000000-0000-4000-8000-000000000361",
        groups: [{ dice: 2, dieSize: 20 }],
      };
      const first = await rollRecoverably(
        registry,
        playSessionId,
        creation.right.access.guestAccessGrant,
        request,
      );
      const repeated = await rollRecoverably(
        registry,
        playSessionId,
        creation.right.access.guestAccessGrant,
        request,
      );
      expect(repeated.groups).toEqual(first.groups);
      expect(first.disposition).toBe("sampled");
      expect(repeated.disposition).toBe("replayed");
      const stored = repository.load(playSessionId);
      expect(stored).toMatchObject({
        _tag: "Right",
        right: {
          tag: "found",
          record: { operations: [{ name: "roll_dice" }] },
        },
      });
    } finally {
      repository.close();
    }
  });
});

async function rollRecoverably(
  registry: ReturnType<typeof createRecoverablePlaySessionRegistry>,
  playSessionId: PlaySessionId,
  guestAccessGrant: GuestAccessGrant,
  request: Readonly<Record<string, unknown>>,
): Promise<Readonly<Record<string, unknown>>> {
  const decoded = decodeDiceToolCall({ name: "roll_dice", args: request });
  if (Either.isLeft(decoded)) {
    throw new Error("The property generated an invalid dice request.");
  }
  const validatedRequest = decoded.right.args;
  const result = await registry.run(
    playSessionId,
    { tag: "guest", guestAccessGrant },
    (root) => handleToolCall(root, "roll_dice", validatedRequest),
    {
      commandFor: () => ({ name: "roll_dice", args: validatedRequest }),
      retain: (content) => {
        if (!("structuredContent" in content)) return false;
        const sampling = decodeRollDiceResult(content.structuredContent);
        return (
          Either.isRight(sampling) && sampling.right.disposition === "sampled"
        );
      },
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
  const content = result.right.value.structuredContent;
  if (
    typeof content !== "object" ||
    content === null ||
    Array.isArray(content)
  ) {
    throw new Error(
      "Recoverable dice operation returned invalid structured content.",
    );
  }
  return content;
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

function requireGuestAccessGrant(hex: string): GuestAccessGrant {
  const decoded = decodeGuestAccessGrant(`guest-access:${hex}`);
  if (Either.isLeft(decoded)) throw new Error(decoded.left);
  return decoded.right;
}

function requireEpochMilliseconds(input: number): EpochMilliseconds {
  const decoded = decodeEpochMilliseconds(input);
  if (Either.isLeft(decoded)) throw new Error(decoded.left.message);
  return decoded.right;
}
