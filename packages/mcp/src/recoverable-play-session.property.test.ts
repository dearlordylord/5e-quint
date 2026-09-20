import { Result } from "effect";
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
import { executeDiceToolCall } from "./dice-tools.ts";
import { decodeDiceToolCall } from "./dice-tool-input.ts";
import {
  SAVED_INACTIVITY_RETENTION_MS,
  decodeEpochMilliseconds,
  decodePrincipalId,
  type EpochMilliseconds,
  type PrincipalId,
} from "./play-session-access.ts";

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
  test("uses authenticated ownership and injected time across authorization and expiry", async () => {
    const applicationServices = createMcpApplicationServices();
    const repository = openRepository();
    const playSessionId = requirePlaySessionId(
      "play-session:00000000-0000-4000-8000-000000000358",
    );
    const owner = requirePrincipalId("principal:owner");
    const other = requirePrincipalId("principal:other");
    let now = requireEpochMilliseconds(1_000);
    try {
      const registry = createRecoverablePlaySessionRegistry({
        applicationServices,
        repository,
        playSessionIdFactory: () => playSessionId,
        now: () => now,
      });
      const creation = registry.create({
        tag: "authenticated",
        principalId: owner,
      });
      if (Result.isFailure(creation)) throw new Error(creation.failure.message);
      expect(creation.success.tenure).toMatchObject({
        tag: "saved",
        persistence: "saved",
      });

      now = requireEpochMilliseconds(1_001);
      const unauthorized = await registry.run(
        playSessionId,
        { tag: "authenticated", principalId: other },
        (root) => root.sessionStore.snapshot(),
      );
      expect(Result.isFailure(unauthorized)).toBe(true);

      const authorized = await registry.run(
        playSessionId,
        { tag: "authenticated", principalId: owner },
        (root) => root.sessionStore.snapshot(),
      );
      expect(Result.isSuccess(authorized)).toBe(true);

      now = requireEpochMilliseconds(1_001 + SAVED_INACTIVITY_RETENTION_MS);
      const expired = await registry.run(
        playSessionId,
        { tag: "authenticated", principalId: owner },
        (root) => root.sessionStore.snapshot(),
      );
      expect(Result.isFailure(expired)).toBe(true);
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
          if (Result.isFailure(seed)) throw new Error(seed.failure.message);
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
                seed: seed.success,
                randomSource: DICE_RANDOM_SOURCE,
              }),
            });
            const second = createRecoverablePlaySessionRegistry({
              applicationServices,
              repository: secondRepository,
              playSessionIdFactory: () => playSessionId,
              diceReplayFactory: () => ({
                seed: seed.success,
                randomSource: DICE_RANDOM_SOURCE,
              }),
            });
            const owner = requirePrincipalId("property:owner");
            const firstCreation = first.create({
              tag: "authenticated",
              principalId: owner,
            });
            const secondCreation = second.create({
              tag: "authenticated",
              principalId: owner,
            });
            if (
              Result.isFailure(firstCreation) ||
              Result.isFailure(secondCreation)
            ) {
              throw new Error("The property requires two Saved Play Sessions.");
            }

            for (const request of requests) {
              const firstSampling = await rollRecoverably(
                first,
                playSessionId,
                owner,
                request,
              );
              const secondSampling = await rollRecoverably(
                second,
                playSessionId,
                owner,
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
                groups: [{ dice: 1, dieSize: 4 }],
              },
            ],
          ],
          [
            ["ffffffff", "ffffffff", "ffffffff", "ffffffff"],
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

  test("reconstructs retained rolls without persisting a caller identifier", async () => {
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
      const owner = requirePrincipalId("reconstruction:owner");
      const creation = registry.create({
        tag: "authenticated",
        principalId: owner,
      });
      if (Result.isFailure(creation)) throw new Error(creation.failure.message);
      const request = {
        groups: [{ dice: 2, dieSize: 20 }],
      };
      const first = await rollRecoverably(
        registry,
        playSessionId,
        owner,
        request,
      );
      const repeated = await rollRecoverably(
        registry,
        playSessionId,
        owner,
        request,
      );
      expect(first.groups).toHaveLength(1);
      expect(repeated.groups).toHaveLength(1);
      const stored = repository.load(playSessionId);
      expect(Result.isSuccess(stored)).toBe(true);
      if (Result.isSuccess(stored)) {
        expect(stored.success).toMatchObject({
          tag: "found",
          record: {
            operations: [
              { name: "roll_dice", args: { groups: request.groups } },
              { name: "roll_dice", args: { groups: request.groups } },
            ],
          },
        });
        expect(JSON.stringify(stored.success)).not.toContain("requestId");
      }
    } finally {
      repository.close();
    }
  });
});

async function rollRecoverably(
  registry: ReturnType<typeof createRecoverablePlaySessionRegistry>,
  playSessionId: PlaySessionId,
  principalId: PrincipalId,
  request: Readonly<Record<string, unknown>>,
): Promise<Readonly<Record<string, unknown>>> {
  const decoded = decodeDiceToolCall({ name: "roll_dice", args: request });
  if (Result.isFailure(decoded)) {
    throw new Error("The property generated an invalid dice request.");
  }
  const validatedRequest = decoded.success.args;
  const result = await registry.run(
    playSessionId,
    { tag: "authenticated", principalId },
    (root) => executeDiceToolCall(root, decoded.success),
    {
      commandFor: () => ({ name: "roll_dice", args: validatedRequest }),
      retain: (execution) => execution.commandRetention === "retain",
      succeeded: (execution) =>
        !("isError" in execution.content) || execution.content.isError !== true,
    },
  );
  if (Result.isFailure(result)) {
    throw new Error(
      result.failure.tag === "playSessionStorageFailure"
        ? result.failure.message
        : "The property Play Session unexpectedly became unavailable.",
    );
  }
  if (!("structuredContent" in result.success.value.content)) {
    throw new Error("Recoverable dice operation omitted structured content.");
  }
  const content = result.success.value.content.structuredContent;
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
  if (Result.isFailure(repository)) throw new Error(repository.failure.message);
  return repository.success;
}

function requirePlaySessionId(input: string): PlaySessionId {
  const decoded = decodePlaySessionId(input);
  if (Result.isFailure(decoded)) throw new Error(decoded.failure);
  return decoded.success;
}

function requirePrincipalId(input: string): PrincipalId {
  const decoded = decodePrincipalId(input);
  if (Result.isFailure(decoded)) throw new Error(decoded.failure);
  return decoded.success;
}

function requireEpochMilliseconds(input: number): EpochMilliseconds {
  const decoded = decodeEpochMilliseconds(input);
  if (Result.isFailure(decoded)) throw new Error(decoded.failure.message);
  return decoded.success;
}
