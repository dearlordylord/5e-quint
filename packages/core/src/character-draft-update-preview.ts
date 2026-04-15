export type CharacterDraftPreviewValue =
  | string
  | number
  | boolean
  | null
  | ReadonlyArray<CharacterDraftPreviewValue>
  | {
      readonly [key: string]: CharacterDraftPreviewValue | undefined;
    };

export interface CharacterDraftDroppedFact {
  readonly path: ReadonlyArray<string>;
  readonly before: CharacterDraftPreviewValue;
  readonly after?: CharacterDraftPreviewValue;
}

const DETAILED_DRAFT_DIFF_ROOTS = new Set([
  "choices",
  "equipment",
  "spellcasting",
]);

export function diffPreviewEntries<T extends { readonly code: string }>(
  current: ReadonlyArray<T>,
  next: ReadonlyArray<T>,
): ReadonlyArray<T> {
  const currentCodeCounts = new Map<string, number>();
  for (const entry of current) {
    currentCodeCounts.set(
      entry.code,
      (currentCodeCounts.get(entry.code) ?? 0) + 1,
    );
  }

  return next.filter((entry) => {
    const remaining = currentCodeCounts.get(entry.code) ?? 0;
    if (remaining > 0) {
      currentCodeCounts.set(entry.code, remaining - 1);
      return false;
    }
    return true;
  });
}

function isRecord(
  value: CharacterDraftPreviewValue | undefined,
): value is Extract<CharacterDraftPreviewValue, Record<string, unknown>> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function valuesEqual(
  left: CharacterDraftPreviewValue | undefined,
  right: CharacterDraftPreviewValue | undefined,
): boolean {
  if (Object.is(left, right)) return true;
  if (left == null || right == null) return left === right;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) return false;
    return (
      left.length === right.length &&
      left.every((value, index) => valuesEqual(value, right[index]))
    );
  }
  if (isRecord(left) && isRecord(right)) {
    const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
    return [...keys].every((key) => valuesEqual(left[key], right[key]));
  }
  return false;
}

function toPreviewValue(
  value: unknown,
): CharacterDraftPreviewValue | undefined {
  if (value === undefined) return undefined;
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((entry) => toPreviewValue(entry))
      .filter(
        (entry): entry is CharacterDraftPreviewValue => entry !== undefined,
      );
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, entry]) => {
        const previewEntry = toPreviewValue(entry);
        return previewEntry === undefined ? [] : [[key, previewEntry]];
      }),
    ) as CharacterDraftPreviewValue;
  }
  return String(value);
}

function collectDroppedFacts(params: {
  readonly current: CharacterDraftPreviewValue | undefined;
  readonly next: CharacterDraftPreviewValue | undefined;
  readonly path?: ReadonlyArray<string>;
}): ReadonlyArray<CharacterDraftDroppedFact> {
  const { current, next, path = [] } = params;
  if (current === undefined || valuesEqual(current, next)) return [];
  if (Array.isArray(current) || Array.isArray(next)) {
    return [
      {
        path,
        before: current!,
        ...(next === undefined ? {} : { after: next }),
      },
    ];
  }
  const detailedPath =
    path[0] != null && DETAILED_DRAFT_DIFF_ROOTS.has(path[0]);
  if (isRecord(current) && (isRecord(next) || detailedPath)) {
    const nextRecord = isRecord(next) ? next : {};
    return [
      ...new Set([...Object.keys(current), ...Object.keys(nextRecord)]),
    ].flatMap((key) =>
      collectDroppedFacts({
        current: current[key],
        next: nextRecord[key],
        path: [...path, key],
      }),
    );
  }
  return [
    { path, before: current, ...(next === undefined ? {} : { after: next }) },
  ];
}

export function collectDroppedDraftFacts(
  current: unknown,
  next: unknown,
): ReadonlyArray<CharacterDraftDroppedFact> {
  return collectDroppedFacts({
    current: toPreviewValue(current),
    next: toPreviewValue(next),
  });
}

function collectExplicitlyChangedPaths(params: {
  readonly current: CharacterDraftPreviewValue | undefined;
  readonly patch: CharacterDraftPreviewValue | undefined;
  readonly path?: ReadonlyArray<string>;
}): ReadonlyArray<ReadonlyArray<string>> {
  const { current, patch, path = [] } = params;
  if (patch === undefined || valuesEqual(current, patch)) return [];
  if (path.length === 0 && isRecord(patch)) {
    const currentRecord = isRecord(current) ? current : {};
    return Object.keys(patch).flatMap((key) =>
      collectExplicitlyChangedPaths({
        current: currentRecord[key],
        patch: patch[key],
        path: [key],
      }),
    );
  }

  const detailedPath =
    path[0] != null && DETAILED_DRAFT_DIFF_ROOTS.has(path[0]);
  if (detailedPath && path.length === 1) {
    return [path];
  }
  if (detailedPath && isRecord(current) && isRecord(patch)) {
    return [...new Set([...Object.keys(current), ...Object.keys(patch)])].flatMap(
      (key) =>
        collectExplicitlyChangedPaths({
          current: current[key],
          patch: patch[key],
          path: [...path, key],
        }),
    );
  }

  return [path];
}

function pathStartsWith(
  path: ReadonlyArray<string>,
  prefix: ReadonlyArray<string>,
): boolean {
  return (
    prefix.length <= path.length &&
    prefix.every((segment, index) => path[index] === segment)
  );
}

export function filterDirectlyPatchedDroppedFacts(params: {
  readonly current: unknown;
  readonly patch: unknown;
  readonly droppedFacts: ReadonlyArray<CharacterDraftDroppedFact>;
}): ReadonlyArray<CharacterDraftDroppedFact> {
  const explicitlyChangedPaths = collectExplicitlyChangedPaths({
    current: toPreviewValue(params.current),
    patch: toPreviewValue(params.patch),
  });

  return params.droppedFacts.filter(
    (fact) =>
      !explicitlyChangedPaths.some((changedPath) =>
        pathStartsWith(fact.path, changedPath),
      ),
  );
}
