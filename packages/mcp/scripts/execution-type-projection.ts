export type FiniteStrings =
  | { readonly kind: "finite"; readonly values: readonly string[] }
  | { readonly kind: "unclassified" };
export type OrdinaryFrontiers =
  | {
      readonly kind: "finite";
      readonly frontiers: readonly {
        readonly subjects: readonly string[];
        readonly holeKinds: readonly string[];
      }[];
    }
  | { readonly kind: "unclassified"; readonly reason: string };
export type TypeProjectionOperations<T> = {
  readonly branches: (type: T) => readonly T[];
  readonly literalStrings: (type: T) => readonly string[] | undefined;
  readonly property: (type: T, name: string) => T | undefined;
  readonly numberElement: (type: T) => T | undefined;
  readonly baseConstraint: (type: T) => T;
  readonly isNever: (type: T) => boolean;
};
export function literalProperty<T>(
  operations: TypeProjectionOperations<T>,
  type: T,
  field: string,
): readonly string[] | undefined {
  const value = operations.property(type, field);
  return value === undefined ? undefined : operations.literalStrings(value);
}
export function subjectCarriers<T>(
  operations: TypeProjectionOperations<T>,
  type: T,
): FiniteStrings {
  const values: string[] = [];
  const carrierLiterals = (value: T): readonly string[] | undefined => {
    const branches = operations
      .branches(value)
      .filter((branch) => !operations.isNever(branch));
    const values = branches.map((branch) => operations.literalStrings(branch));
    return values.every((value) => value !== undefined)
      ? values.flatMap((value) => value ?? [])
      : undefined;
  };
  const subjectType = operations.baseConstraint(type);
  for (const member of operations.branches(subjectType)) {
    // A narrowed intersection can reduce to never without carrying the Never flag.
    if (operations.isNever(member)) continue;
    const propertyType = (field: string) => operations.property(member, field);
    const tagType = propertyType("tag");
    const tags = tagType && carrierLiterals(tagType);
    if (!tags) return { kind: "unclassified" };
    const discriminator = ["command", "action", "option"].find((field) =>
      operations.property(member, field),
    );
    const operationType = discriminator && propertyType(discriminator);
    const operationValues = discriminator
      ? operationType && carrierLiterals(operationType)
      : [""];
    if (!operationValues) return { kind: "unclassified" };
    const modeType = propertyType("mode");
    const modes: string[] = [];
    if (modeType) {
      for (const mode of operations.branches(modeType)) {
        const direct = carrierLiterals(mode);
        const tag = operations.property(mode, "tag");
        const tagged = tag && carrierLiterals(tag);
        const selected = direct ?? tagged;
        if (!selected) return { kind: "unclassified" };
        modes.push(...selected);
      }
    } else modes.push("");
    for (const tag of tags)
      for (const operation of operationValues)
        for (const mode of modes)
          values.push(
            [tag, operation, mode].filter((part) => part !== "").join("."),
          );
  }
  return { kind: "finite", values: [...new Set(values)].sort() };
}
export function ordinaryFrontiersForResult<T>(
  operations: TypeProjectionOperations<T>,
  result: T,
): OrdinaryFrontiers {
  const results = operations.branches(result);
  const frontiers: {
    subjects: readonly string[];
    holeKinds: readonly string[];
  }[] = [];
  for (const branch of results) {
    const tags = literalProperty(operations, branch, "tag");
    if (!tags || tags.length !== 1)
      return {
        kind: "unclassified",
        reason: "Return branch has no single finite tag.",
      };
    if (tags[0] === "invalid" || tags[0] === "resolved") continue;
    if (tags[0] !== "needsHoles")
      return {
        kind: "unclassified",
        reason: "Owner does not return a Battle resolution result.",
      };
    const frontier = operations.property(branch, "frontier");
    if (!frontier)
      return {
        kind: "unclassified",
        reason: "Needs-holes branch has no frontier.",
      };
    const type = frontier;
    for (const frontierType of operations.branches(type)) {
      const kinds = literalProperty(operations, frontierType, "kind");
      if (!kinds || kinds.length !== 1)
        return {
          kind: "unclassified",
          reason: "Frontier has no single finite kind.",
        };
      if (kinds[0] === "interruptDecision") continue;
      if (kinds[0] !== "holes")
        return {
          kind: "unclassified",
          reason: "Unaccounted needs-holes frontier kind.",
        };
      const holes = operations.property(frontierType, "holes");
      const element = holes && operations.numberElement(holes);
      if (!element)
        return {
          kind: "unclassified",
          reason: "Ordinary frontier has no hole element type.",
        };
      const holeKinds = literalProperty(operations, element, "kind");
      if (!holeKinds)
        return {
          kind: "unclassified",
          reason: "Hole element kind is not finite.",
        };
      const replaySubject = operations.property(frontierType, "replaySubject");
      const subjects =
        replaySubject && subjectCarriers(operations, replaySubject);
      if (!subjects || subjects.kind !== "finite")
        return {
          kind: "unclassified",
          reason: "Ordinary frontier replay subject is not finite.",
        };
      frontiers.push({
        subjects: subjects.values,
        holeKinds: [...new Set(holeKinds)].sort(),
      });
    }
  }
  return { kind: "finite", frontiers };
}

export function constructionKinds<T>(
  operations: TypeProjectionOperations<T>,
  type: T,
):
  | { readonly kind: "notHole" }
  | { readonly kind: "hole"; readonly kinds: FiniteStrings } {
  const discriminator = operations.property(type, "kind");
  if (
    !discriminator ||
    !operations.property(type, "holeId") ||
    !operations.property(type, "holeInstanceKey")
  )
    return { kind: "notHole" };
  const values = operations.literalStrings(discriminator);
  return {
    kind: "hole",
    kinds:
      values === undefined
        ? { kind: "unclassified" }
        : { kind: "finite", values: [...new Set(values)].sort() },
  };
}
