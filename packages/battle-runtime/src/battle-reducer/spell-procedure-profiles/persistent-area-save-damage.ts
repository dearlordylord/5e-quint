import { Match, Schema } from "effect";
import type {
  SpellInvocationAdmittedByRegisteredProcedure,
  SpellProcedureDeclaration,
} from "./profile.ts";
import { sourceTurnTranslationPersistentAreaSaveDamageProfile } from "./cloudkill-area-hazard.ts";
import { collisionRepositionPersistentAreaSaveDamageProfile } from "./flaming-sphere.ts";
import { stationaryPersistentAreaSaveDamageProfile } from "./insect-plague-area-hazard.ts";
import { directedRepositionPersistentAreaSaveDamageProfile } from "./moonbeam.ts";

export const persistentAreaSaveDamageProfile = {
  procedure: "persistentAreaSaveDamage",
  executionSchema: Schema.Union([
    sourceTurnTranslationPersistentAreaSaveDamageProfile.executionSchema,
    collisionRepositionPersistentAreaSaveDamageProfile.executionSchema,
    stationaryPersistentAreaSaveDamageProfile.executionSchema,
    directedRepositionPersistentAreaSaveDamageProfile.executionSchema,
  ]),
  admit: (spell, context) => [
    ...sourceTurnTranslationPersistentAreaSaveDamageProfile.admit(
      spell,
      context,
    ),
    ...collisionRepositionPersistentAreaSaveDamageProfile.admit(spell, context),
    ...stationaryPersistentAreaSaveDamageProfile.admit(spell, context),
    ...directedRepositionPersistentAreaSaveDamageProfile.admit(spell, context),
  ],
  discoverCastAct:
    sourceTurnTranslationPersistentAreaSaveDamageProfile.discoverCastAct,
  resolve: (input) =>
    Match.value(input.invocation).pipe(
      Match.when(
        { lifecycle: { kind: "sourceTurnTranslation" } },
        (invocation) =>
          sourceTurnTranslationPersistentAreaSaveDamageProfile.resolve({
            ...input,
            invocation,
          }),
      ),
      Match.when({ lifecycle: { kind: "stationary" } }, (invocation) =>
        stationaryPersistentAreaSaveDamageProfile.resolve({
          ...input,
          invocation,
        }),
      ),
      Match.when(
        {
          lifecycle: {
            kind: "casterActionReposition",
            collisionDisposition: "stopAndAffectAdjacent",
          },
        },
        (invocation) =>
          collisionRepositionPersistentAreaSaveDamageProfile.resolve({
            ...input,
            invocation,
          }),
      ),
      Match.when(
        {
          lifecycle: {
            kind: "casterActionReposition",
            collisionDisposition: "ignoreObstacles",
          },
        },
        (invocation) =>
          directedRepositionPersistentAreaSaveDamageProfile.resolve({
            ...input,
            invocation,
          }),
      ),
      Match.exhaustive,
    ),
} satisfies SpellProcedureDeclaration<
  "persistentAreaSaveDamage",
  SpellInvocationAdmittedByRegisteredProcedure<"persistentAreaSaveDamage">
>;
