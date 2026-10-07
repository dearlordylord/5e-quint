import { Result, Schema } from "effect";
import { expect, it } from "vitest";
import { StatBlockExecutionSnapshotSchema } from "./battle-reducer/battle-codecs.ts";
import { restoreAuthoredStatBlockExecutionAdmission } from "./index.ts";
import { unitLibrary } from "./unit-profile-admission-catalog.test-support.ts";
import {
  statBlockConcentrationBattle,
  statBlockConcentrationCasterId,
  statBlockConcentrationCasterRecord,
} from "./stat-block-spell-concentration.test-support.ts";

it("rejects a schema-valid higher cast level absent from the authored invocation", () => {
  const session = statBlockConcentrationBattle();
  const actor = session.state.combatants.get(statBlockConcentrationCasterId);
  if (actor?.origin.kind !== "statBlock")
    throw new Error("Expected Stat Block caster");
  const encoded = Schema.encodeSync(StatBlockExecutionSnapshotSchema)(
    actor.origin.execution,
  );
  const altered = {
    ...encoded,
    procedureBindings: encoded.procedureBindings.map((binding) =>
      binding.procedure.kind !== "spellcasting"
        ? binding
        : {
            ...binding,
            procedure: {
              ...binding.procedure,
              groups: binding.procedure.groups.map((group) => ({
                ...group,
                invocations: group.invocations.map((invocation) =>
                  invocation.dispatch.kind !== "executable"
                    ? invocation
                    : {
                        ...invocation,
                        dispatch: {
                          ...invocation.dispatch,
                          executions: invocation.dispatch.executions.map(
                            (execution) => ({
                              ...execution,
                              resource: { ...execution.resource, castLevel: 3 },
                            }),
                          ),
                        },
                      },
                ),
              })),
            },
          },
    ),
  };
  const decoded = Schema.decodeUnknownResult(StatBlockExecutionSnapshotSchema)(
    JSON.parse(JSON.stringify(altered)),
  );
  expect(Result.isSuccess(decoded)).toBe(true);
  if (Result.isFailure(decoded))
    throw new Error("Expected schema-valid altered cast level");
  const restored = restoreAuthoredStatBlockExecutionAdmission({
    state: session.state,
    actorId: statBlockConcentrationCasterId,
    statBlock: statBlockConcentrationCasterRecord(),
    unitCatalog: unitLibrary,
    snapshot: decoded.success,
  });
  expect(Result.isFailure(restored)).toBe(true);
  if (Result.isFailure(restored))
    expect(restored.failure).toMatchObject({
      reason: "procedureBindingsMismatch",
    });
});
