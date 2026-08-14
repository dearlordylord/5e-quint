import { Effect, Random } from "effect";

export const PLAYER_DIE_SIDES = [4, 6, 8, 10, 12, 20, 100] as const;
export type PlayerDieSides = (typeof PLAYER_DIE_SIDES)[number];

export type PlayerRandom = {
  readonly seed: string;
  readonly rollDie: (input: {
    readonly draw: string;
    readonly sides: PlayerDieSides;
  }) => number;
};

export function playerRandomForContinuation(
  seed: string,
  continuation: number,
): PlayerRandom {
  return {
    seed,
    rollDie: ({ draw, sides }) => {
      const retainedDraw = draw.trim();
      if (retainedDraw.length === 0) {
        throw new Error("A player random draw needs a nonempty retained name.");
      }
      return Effect.runSync(
        Random.make(`${seed}:${String(continuation)}:${retainedDraw}`).nextIntBetween(
          1,
          sides + 1,
        ),
      );
    },
  };
}
