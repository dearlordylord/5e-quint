import { Either, Layer, ParseResult, pipe } from "effect";

import cureWoundsJson from "../../prototype-content-surface/content/cure_wounds.json";
import fireballJson from "../../prototype-content-surface/content/fireball.json";
import actionSurgeJson from "../../prototype-content-surface/content/fighter_action_surge_l2.json";
import { decodeUnitRecordEither } from "@dnd/prototype-content-surface/surface/schema";
import { effectFromEither } from "#/effect-helpers.ts";
import { ToySchemaDecodeError } from "#/errors.ts";
import { ToySurfaceUnitLibrary } from "#/services.ts";
import type { ToyAuthoredUnitId, ToySurfaceUnit } from "#/types.ts";

export const TOY_AUTHORED_JSON_UNITS = [
  cureWoundsJson,
  fireballJson,
  actionSurgeJson,
] as const;

export function parseToySurfaceUnitEither(
  raw: unknown,
): Either.Either<ToySurfaceUnit, ToySchemaDecodeError> {
  return pipe(
    decodeUnitRecordEither(raw),
    Either.flatMap((unit) =>
      unit.kind === "spell" || unit.kind === "class_feature"
        ? Either.right(unit)
        : Either.left(
            new ToySchemaDecodeError({
              message: `Toy package only accepts spell and class_feature units, received ${unit.kind}.`,
            }),
          ),
    ),
    Either.mapLeft(
      (error: ToySchemaDecodeError | ParseResult.ParseError) =>
        new ToySchemaDecodeError({
          message:
            error instanceof ToySchemaDecodeError
              ? error.message
              : ParseResult.TreeFormatter.formatErrorSync(error),
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
        new Map(
          entries.map(
            (parsed) => [parsed.id as ToyAuthoredUnitId, parsed] as const,
          ),
        ) as ReadonlyMap<ToyAuthoredUnitId, ToySurfaceUnit>,
    ),
  );
}

export const ToySurfaceUnitLibraryLive = Layer.effect(
  ToySurfaceUnitLibrary,
  effectFromEither(loadToySurfaceUnitsEither()),
);
