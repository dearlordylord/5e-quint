import { Either, Layer, ParseResult, pipe } from "effect";

import cureWoundsJson from "../../prototype-content-surface/content/cure_wounds.json";
import fireballJson from "../../prototype-content-surface/content/fireball.json";
import actionSurgeJson from "../../prototype-content-surface/content/fighter_action_surge_l2.json";
import { decodeUnitRecordEither } from "@dnd/prototype-content-surface/surface/schema";
import { effectFromEither } from "#/effect-helpers.ts";
import { SchemaDecodeError } from "#/errors.ts";
import { SurfaceUnitLibrary } from "#/services.ts";
import type { AuthoredUnitId, SurfaceUnit } from "#/types.ts";

export const AUTHORED_JSON_UNITS = [
  cureWoundsJson,
  fireballJson,
  actionSurgeJson,
] as const;

export function parseSurfaceUnitEither(
  raw: unknown,
): Either.Either<SurfaceUnit, SchemaDecodeError> {
  return pipe(
    decodeUnitRecordEither(raw),
    Either.flatMap((unit) =>
      unit.kind === "spell" || unit.kind === "class_feature"
        ? Either.right(unit)
        : Either.left(
            new SchemaDecodeError({
              message:
                "surface-runtime-correction only accepts spell and class_feature units.",
            }),
          ),
    ),
    Either.mapLeft(
      (error: SchemaDecodeError | ParseResult.ParseError) =>
        new SchemaDecodeError({
          message:
            error instanceof SchemaDecodeError
              ? error.message
              : ParseResult.TreeFormatter.formatErrorSync(error),
        }),
    ),
  );
}

export function loadSurfaceUnitsEither(): Either.Either<
  ReadonlyMap<AuthoredUnitId, SurfaceUnit>,
  SchemaDecodeError
> {
  return pipe(
    Either.all(AUTHORED_JSON_UNITS.map(parseSurfaceUnitEither)),
    Either.map(
      (entries) =>
        new Map(
          entries.map((parsed) => [parsed.id as AuthoredUnitId, parsed] as const),
        ) as ReadonlyMap<AuthoredUnitId, SurfaceUnit>,
    ),
  );
}

export const SurfaceUnitLibraryLive = Layer.effect(
  SurfaceUnitLibrary,
  effectFromEither(loadSurfaceUnitsEither()),
);
