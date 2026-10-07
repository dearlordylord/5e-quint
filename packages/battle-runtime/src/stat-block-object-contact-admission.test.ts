import { Result } from "effect";
import { expect, it } from "vitest";
import { startBattle } from "./battle-reducer/api-lifecycle.ts";
import {
  battleId,
  statBlockCreatureInit,
  statBlockRecord,
} from "./battle-runtime.test-support.ts";
import { combatantId } from "./identity.ts";
import { syntheticSpellcastingProcedureEntry } from "./stat-block-spellcasting-procedure.test-support.ts";
import { statBlockSpellProcedureInvocations } from "./stat-block-spell-invocation-selection.ts";

it("retains listed object-contact facts without admitting a cast whose repeat has no owner", () => {
  const actorId = combatantId("synthetic-object-contact-caster");
  const record = statBlockRecord();
  const entry = syntheticSpellcastingProcedureEntry({
    unrestrictedSpellId: "heat_metal",
  });
  if (entry.procedure.kind !== "spellcasting")
    throw new Error("Expected spellcasting entry");
  const started = startBattle({
    battleId: battleId("object-contact-missing-continuation"),
    combatants: [
      statBlockCreatureInit({
        combatantId: actorId,
        statBlock: {
          ...record,
          statBlock: {
            ...record.statBlock,
            actions: [
              {
                ...entry,
                procedure: {
                  ...entry.procedure,
                  components: { v: true, s: true, m: "required" },
                  groups: [entry.procedure.groups[0]],
                },
              },
            ],
          },
        },
        initiative: 20,
      }),
    ],
  });
  expect(Result.isSuccess(started)).toBe(true);
  if (Result.isFailure(started)) throw new Error("Expected admitted actor");
  const actor = started.success.state.combatants.get(actorId);
  if (actor?.origin.kind !== "statBlock")
    throw new Error("Expected Stat Block actor");
  expect(statBlockSpellProcedureInvocations(actor.origin.execution)).toEqual(
    [],
  );
  const binding = actor.origin.execution.procedureBindings.find(
    (candidate) => candidate.procedure.kind === "spellcasting",
  );
  if (binding?.procedure.kind !== "spellcasting")
    throw new Error("Expected spellcasting facts");
  expect(binding.procedure.groups[0].invocations[0].dispatch).toEqual({
    kind: "unsupported",
    reason: "missingChildProcedureOwner",
  });
  expect(actor.activeEffects).toEqual([]);
});
