import { isEmptyReadonlyArray, isNonEmptyReadonlyArray } from "effect/Array";
import * as Either from "effect/Either";
import * as Option from "effect/Option";

import type {
  Index,
  Initiative,
  ReadonlyNonEmptyArray,
  Round,
} from "./types";

export type InitiativeStack<T> = {
  readonly round: Round;
  readonly alreadyActed: ReadonlyArray<InitiativeEntry<T>>;
  readonly stillToAct: ReadonlyNonEmptyArray<InitiativeEntry<T>>;
};

export type RoundTicked = boolean;

export const createInitiativeStack = <T>(
  order: ReadonlyNonEmptyArray<InitiativeEntry<T>>,
  round: Round,
): InitiativeStack<T> => ({
  round,
  alreadyActed: [],
  stillToAct: order,
});

export const nextInitiative = <T>(
  s0: InitiativeStack<T>,
): readonly [InitiativeStack<T>, RoundTicked] => {
  const [current, ...remaining] = s0.stillToAct;
  const acted = [...s0.alreadyActed, current] as unknown as ReadonlyNonEmptyArray<
    InitiativeEntry<T>
  >;

  if (isEmptyReadonlyArray(remaining)) {
    return [
      {
        round: (s0.round + 1) as Round,
        alreadyActed: [],
        stillToAct: acted,
      },
      true,
    ];
  }

  return [
    {
      round: s0.round,
      alreadyActed: acted,
      stillToAct: remaining as unknown as ReadonlyNonEmptyArray<InitiativeEntry<T>>,
    },
    false,
  ];
};

export const currentActing = <T>(stack: InitiativeStack<T>): T =>
  stack.stillToAct[0]!.creature;

export const initiativeOrder = <T>(stack: InitiativeStack<T>): ReadonlyArray<T> =>
  [...stack.alreadyActed, ...stack.stillToAct].map((entry) => entry.creature);

export const initiativeEntries = <T>(
  stack: InitiativeStack<T>,
): ReadonlyArray<InitiativeEntry<T>> => [
  ...stack.alreadyActed,
  ...stack.stillToAct,
];

export const insertAtOrderIndex = <T>(
  stack: InitiativeStack<T>,
  index: number,
  value: InitiativeEntry<T>,
): InitiativeStack<T> => {
  const normalizedIndex = Math.max(0, Math.min(index, initiativeEntries(stack).length));
  const actedCount = stack.alreadyActed.length;

  if (normalizedIndex <= actedCount) {
    return {
      round: stack.round,
      alreadyActed: [
        ...stack.alreadyActed.slice(0, normalizedIndex),
        value,
        ...stack.alreadyActed.slice(normalizedIndex),
      ],
      stillToAct: stack.stillToAct,
    };
  }

  const stillIndex = normalizedIndex - actedCount;
  return {
    round: stack.round,
    alreadyActed: stack.alreadyActed,
    stillToAct: [
      ...stack.stillToAct.slice(0, stillIndex),
      value,
      ...stack.stillToAct.slice(stillIndex),
    ] as unknown as ReadonlyNonEmptyArray<InitiativeEntry<T>>,
  };
};

export const removeFromInitiative = <T>(
  stack: InitiativeStack<T>,
  predicate: (value: T) => boolean,
): Option.Option<InitiativeStack<T>> => {
  const acted = stack.alreadyActed.filter((entry) => !predicate(entry.creature));
  const stillToAct = stack.stillToAct.filter((entry) => !predicate(entry.creature));

  if (isNonEmptyReadonlyArray(stillToAct)) {
    return Option.some({ round: stack.round, alreadyActed: acted, stillToAct });
  }

  if (isNonEmptyReadonlyArray(acted)) {
    return Option.some({
      round: (stack.round + 1) as Round,
      alreadyActed: [],
      stillToAct: acted,
    });
  }

  return Option.none();
};

export type InitiativeEntry<T> = {
  readonly creature: T;
  readonly initiative: Initiative;
};

export const createScoredInitiativeStack = <T>(
  order: ReadonlyNonEmptyArray<InitiativeEntry<T>>,
  round: Round,
) : Either.Either<InitiativeStack<T>, string> =>
  isMonotoneInitiative(order)
    ? Either.right(createInitiativeStack(order, round))
    : Either.left("Initiative order must be monotone nondecreasing.");

export type InsertWithInitiativeResult<T> =
  | {
      readonly status: "ok";
      readonly stack: InitiativeStack<T>;
    }
  | {
      readonly status: "error";
      readonly reason: "decision_supplied_without_tie";
    }
  | {
      readonly status: "decide";
      readonly tie: ReadonlyNonEmptyArray<T>;
    };

export type InitiativeTieDecision<T> = readonly [ReadonlyNonEmptyArray<T>, Index];

export const insertByInitiative = <T>(
  stack: InitiativeStack<T>,
  creature: T,
  initiative: Initiative,
  decision?: InitiativeTieDecision<T>,
): InsertWithInitiativeResult<T> => {
  const entry: InitiativeEntry<T> = { creature, initiative };
  const order = initiativeEntries(stack);

  let firstGreaterIndex = order.findIndex(
    (current) => current.initiative > initiative,
  );
  if (firstGreaterIndex < 0) {
    firstGreaterIndex = order.length;
  }

  const firstEqualIndex = order.findIndex(
    (current) => current.initiative === initiative,
  );

  if (firstEqualIndex < 0) {
    if (decision != null) {
      return {
        status: "error",
        reason: "decision_supplied_without_tie",
      };
    }
    return {
      status: "ok",
      stack: insertAtScoredOrderIndex(stack, firstGreaterIndex, entry),
    };
  }

  const tieStart = order[firstEqualIndex]!;
  const tiedEntries: Array<InitiativeEntry<T>> = [tieStart];
  let tieIndex = firstEqualIndex + 1;
  while (tieIndex < order.length && order[tieIndex]!.initiative === initiative) {
    tiedEntries.push(order[tieIndex]!);
    tieIndex += 1;
  }
  const tie = tiedEntries.map(
    (current) => current.creature,
  ) as unknown as ReadonlyNonEmptyArray<T>;

  if (decision != null) {
    const [decisionTie, decisionIndex] = decision;
    if (sameTieCreatures(tie, decisionTie) && decisionIndex < tie.length) {
      return {
        status: "ok",
        stack: insertAtScoredOrderIndex(stack, firstEqualIndex + decisionIndex, entry),
      };
    }
  }

  return { status: "decide", tie };
};

function insertAtScoredOrderIndex<T>(
  stack: InitiativeStack<T>,
  index: number,
  value: InitiativeEntry<T>,
) : InitiativeStack<T> {
  const inserted = insertAtOrderIndex(stack, index, value);
  if (!isMonotoneInitiative(initiativeEntries(inserted))) {
    throw new Error("Initiative order must be monotone nondecreasing.");
  }
  return inserted;
}

function isMonotoneInitiative<T>(
  order: ReadonlyArray<InitiativeEntry<T>>,
): boolean {
  for (let i = 1; i < order.length; i += 1) {
    if (order[i - 1]!.initiative > order[i]!.initiative) {
      return false;
    }
  }
  return true;
}

function sameTieCreatures<T>(
  actual: ReadonlyNonEmptyArray<T>,
  decision: ReadonlyNonEmptyArray<T>,
): boolean {
  return (
    actual.length === decision.length &&
    actual.every((creature, index) => Object.is(creature, decision[index]))
  );
}
