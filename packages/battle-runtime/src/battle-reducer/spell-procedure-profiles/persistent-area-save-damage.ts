import { Match, Schema } from "effect";
import type {
  SpellInvocationAdmittedByRegisteredProcedure,
  SpellProcedureDeclaration,
} from "./profile.ts";
import type {
  SpellMechanicsAdmissionSource,
  SpellProcedureMechanicsFacts,
  SpellProcedureMechanicsInvocation,
  SpellProcedureMechanicsInspection,
} from "./spell-mechanics-admission.ts";
import { sourceTurnTranslationPersistentAreaSaveDamageProfile } from "./source-turn-translation-persistent-area-save-damage.ts";
import { collisionRepositionPersistentAreaSaveDamageProfile } from "./collision-reposition-persistent-area-save-damage.ts";
import { stationaryPersistentAreaSaveDamageProfile } from "./stationary-persistent-area-save-damage.ts";
import { directedRepositionPersistentAreaSaveDamageProfile } from "./directed-reposition-persistent-area-save-damage.ts";

type PersistentAreaSaveDamageAdmissionResult =
  | ReturnType<
      typeof sourceTurnTranslationPersistentAreaSaveDamageProfile.admitMechanics
    >
  | ReturnType<
      typeof collisionRepositionPersistentAreaSaveDamageProfile.admitMechanics
    >
  | ReturnType<typeof stationaryPersistentAreaSaveDamageProfile.admitMechanics>
  | ReturnType<
      typeof directedRepositionPersistentAreaSaveDamageProfile.admitMechanics
    >;
type PersistentAreaSaveDamageAdmissionIssue = Extract<
  PersistentAreaSaveDamageAdmissionResult,
  { readonly tag: "unsupported" }
>["issues"][number];

function persistentAreaSaveDamageMechanicsAdmission(
  source: SpellMechanicsAdmissionSource,
): SpellProcedureMechanicsInspection<
  "persistentAreaSaveDamage",
  SpellProcedureMechanicsFacts,
  SpellProcedureMechanicsInvocation<"persistentAreaSaveDamage">,
  PersistentAreaSaveDamageAdmissionIssue
> {
  const inspections: readonly PersistentAreaSaveDamageAdmissionResult[] = [
    sourceTurnTranslationPersistentAreaSaveDamageProfile.admitMechanics(source),
    collisionRepositionPersistentAreaSaveDamageProfile.admitMechanics(source),
    stationaryPersistentAreaSaveDamageProfile.admitMechanics(source),
    directedRepositionPersistentAreaSaveDamageProfile.admitMechanics(source),
  ];
  const issues: PersistentAreaSaveDamageAdmissionIssue[] = [];
  for (const inspection of inspections) {
    if (inspection.tag === "unsupported") {
      issues.push(...inspection.issues);
    }
  }
  if (issues.length > 0) {
    const [firstIssue, ...remainingIssues] = issues;
    if (firstIssue !== undefined) {
      return { tag: "unsupported", issues: [firstIssue, ...remainingIssues] };
    }
  }
  const supported = inspections.find(
    (inspection) => inspection.tag === "supported",
  );
  if (supported?.tag === "supported") {
    return supported;
  }
  return { tag: "notRepresented" };
}

export const persistentAreaSaveDamageProfile = {
  procedure: "persistentAreaSaveDamage",
  executionSchema: Schema.Union([
    sourceTurnTranslationPersistentAreaSaveDamageProfile.executionSchema,
    collisionRepositionPersistentAreaSaveDamageProfile.executionSchema,
    stationaryPersistentAreaSaveDamageProfile.executionSchema,
    directedRepositionPersistentAreaSaveDamageProfile.executionSchema,
  ]),
  admitMechanics: persistentAreaSaveDamageMechanicsAdmission,
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
  SpellInvocationAdmittedByRegisteredProcedure<"persistentAreaSaveDamage">,
  SpellProcedureMechanicsFacts,
  PersistentAreaSaveDamageAdmissionIssue
>;
