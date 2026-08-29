import { Either, ParseResult, Schema } from "effect";

/**
 * Mechanics graph roots are deliberately separate from authored identity and
 * publication roots. The prefixes identify the family whose profile owns the
 * path; they are not runtime record ids.
 */
export const UNIT_MECHANICS_PATH_ROOT = "unit.mechanics" as const;
export const STAT_BLOCK_MECHANICS_PATH_ROOT = "statBlock.mechanics" as const;

const NON_MECHANICS_PATH_SEGMENTS = [
  "authoredExpression",
  "description",
  "destroyedBy",
  "id",
  "kind",
  "label",
  "m",
  "message",
  "name",
  "password",
  "provenance",
  "qualifier",
  "reason",
  "rulesExcerpt",
  "section",
  "source",
  "summary",
  "text",
  "untilEndedBy",
] as const;

const nonMechanicsPathSegments = new Set<string>(NON_MECHANICS_PATH_SEGMENTS);
const fieldSegmentPattern = /^[A-Za-z][A-Za-z0-9_]*$/;
const indexSuffixPattern = /^(?:\[(?:0|[1-9][0-9]*)\])+$/;

export type UnitMechanicsPath = Schema.Schema.Type<
  typeof UnitMechanicsPathSchema
>;

export type StatBlockMechanicsPath = Schema.Schema.Type<
  typeof StatBlockMechanicsPathSchema
>;

export type SurfaceMechanicsPathError = {
  readonly code: "invalid-mechanics-path";
  readonly family: "unit" | "statBlock";
  readonly message: string;
};

const pathSchema = <const BrandName extends string>(
  root: string,
  brandName: BrandName,
) =>
  Schema.String.pipe(
    Schema.filter((value) => isMechanicsPath(value, root), {
      message: () =>
        `Mechanics paths must start at ${root} and contain only typed mechanics segments.`,
    }),
    Schema.brand(brandName),
  );

const UnitMechanicsPathSchema = pathSchema(
  UNIT_MECHANICS_PATH_ROOT,
  "UnitMechanicsPath",
);
const StatBlockMechanicsPathSchema = pathSchema(
  STAT_BLOCK_MECHANICS_PATH_ROOT,
  "StatBlockMechanicsPath",
);

export function makeUnitMechanicsPath(
  value: unknown,
): Either.Either<UnitMechanicsPath, SurfaceMechanicsPathError> {
  return decodeMechanicsPath(
    UnitMechanicsPathSchema,
    value,
    UNIT_MECHANICS_PATH_ROOT,
    "unit",
  );
}

export function makeStatBlockMechanicsPath(
  value: unknown,
): Either.Either<StatBlockMechanicsPath, SurfaceMechanicsPathError> {
  return decodeMechanicsPath(
    StatBlockMechanicsPathSchema,
    value,
    STAT_BLOCK_MECHANICS_PATH_ROOT,
    "statBlock",
  );
}

function decodeMechanicsPath<Path>(
  schema: Schema.Schema<Path, string, never>,
  value: unknown,
  root: string,
  family: "unit" | "statBlock",
): Either.Either<Path, SurfaceMechanicsPathError> {
  const decoded = Schema.decodeUnknownEither(schema)(value);
  return Either.isLeft(decoded)
    ? Either.left({
        code: "invalid-mechanics-path",
        family,
        message: `${root}: ${ParseResult.TreeFormatter.formatErrorSync(decoded.left)}`,
      })
    : Either.right(decoded.right);
}

function isMechanicsPath(value: string, root: string): boolean {
  if (value !== value.trim()) return false;
  if (value === root) return true;
  if (!value.startsWith(`${root}.`)) return false;

  const segments = value.slice(root.length + 1).split(".");
  return segments.every((segment) => {
    const field = /^([A-Za-z][A-Za-z0-9_]*)(.*)$/.exec(segment);
    if (field === null) return false;
    if (!fieldSegmentPattern.test(field[1])) return false;
    if (nonMechanicsPathSegments.has(field[1])) {
      return false;
    }
    return field[2] === "" || indexSuffixPattern.test(field[2]);
  });
}
