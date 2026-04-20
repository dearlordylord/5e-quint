import { Either, Layer, ParseResult, pipe, Schema } from "effect";

import cureWoundsJson from "../../prototype-content-surface/content/cure_wounds.json";
import fireballJson from "../../prototype-content-surface/content/fireball.json";
import actionSurgeJson from "../../prototype-content-surface/content/fighter_action_surge_l2.json";
import { effectFromEither } from "#/effect-helpers.ts";
import { ToySchemaDecodeError } from "#/errors.ts";
import { ToySurfaceUnitLibrary } from "#/services.ts";
import {
  ToySurfaceUnitSchema,
  type ToySurfaceUnit,
} from "#/surface-subset-schema.ts";
import type { ToyAuthoredUnitId } from "#/types.ts";

export const TOY_AUTHORED_JSON_UNITS = [
  cureWoundsJson,
  fireballJson,
  actionSurgeJson,
] as const;

export function parseToySurfaceUnitEither(
  raw: unknown,
): Either.Either<ToySurfaceUnit, ToySchemaDecodeError> {
  return pipe(
    Schema.decodeUnknownEither(ToySurfaceUnitSchema)(raw),
    Either.mapLeft(
      (error) =>
        new ToySchemaDecodeError({
          message: ParseResult.TreeFormatter.formatErrorSync(error),
        }),
    ),
  );
}

export function loadToySurfaceUnitsEither(): Either.Either<
  ReadonlyMap<ToyAuthoredUnitId, ToySurfaceUnit>,
  ToySchemaDecodeError
> {
  return pipe(
    Either.all(TOY_AUTHORED_JSON_UNITS.map(parseToySurfaceUnitEither)),
    Either.map(
      (entries) =>
        new Map(entries.map((parsed) => [parsed.id, parsed] as const)),
    ),
  );
}

export const ToySurfaceUnitLibraryLive = Layer.effect(
  ToySurfaceUnitLibrary,
  effectFromEither(loadToySurfaceUnitsEither()),
);
