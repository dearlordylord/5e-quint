import { statBlockId } from "@dnd/shared/game-facts";
import { statBlockRecord } from "./battle-runtime.test-support.ts";
import { Result } from "effect";
import type { UnitCatalog } from "@dnd/surface/surface/unit-catalog";
import type {
  StatBlockProcedureEntry,
  StatBlockRecord,
} from "@dnd/surface/surface/stat-block-types";
import { startBattle } from "./battle-reducer/api-lifecycle.ts";
import { battleId, combatantId, initiativeScore } from "./identity.ts";

/** Verification isolation admits the original procedure and caster facts,
 * rather than claiming that unrelated procedures on its whole parent work. */
export function isolatedSpellcastingAdmission(input: {
  readonly isolationBase: StatBlockRecord;
  readonly record: StatBlockRecord;
  readonly section: "actions" | "bonusActions";
  readonly entry: StatBlockProcedureEntry;
  readonly unitCatalog: UnitCatalog;
}) {
  if (input.isolationBase.provenance.kind !== "synthetic-test")
    return Result.fail({ kind: "nonSyntheticIsolationBase" } as const);
  if (
    input.entry.kind !== "executable" ||
    input.entry.procedure.kind !== "spellcasting"
  )
    return Result.fail({ kind: "notSpellcasting" } as const);
  const isolatedRecord = {
    ...input.isolationBase,
    statBlock: {
      ...input.isolationBase.statBlock,
      abilityScores: input.record.statBlock.abilityScores,
      resources: input.record.statBlock.resources,
      actions: input.section === "actions" ? [input.entry] : undefined,
      bonusActions:
        input.section === "bonusActions" ? [input.entry] : undefined,
    },
  };
  const actorId = combatantId("isolated-spellcasting-caster");
  const started = startBattle({
    battleId: battleId("isolated-spellcasting-admission"),
    combatants: [
      {
        combatantId: actorId,
        statBlock: isolatedRecord,
        unitCatalog: input.unitCatalog,
        initiative: initiativeScore(20),
        ammunitionStocks: [],
        conditions: [],
      },
    ],
  });
  if (Result.isFailure(started))
    return Result.fail({
      kind: "initializationRejected",
      failure: started.failure,
    } as const);
  const actor = started.success.state.combatants.get(actorId);
  if (actor?.origin.kind !== "statBlock")
    return Result.fail({ kind: "missingStatBlockCaster" } as const);
  const binding = actor.origin.execution.procedureBindings.find(
    (candidate) =>
      candidate.procedure.kind === "spellcasting" &&
      candidate.procedure.section === input.section &&
      candidate.procedure.procedureOrdinal === input.entry.procedureOrdinal,
  );
  return binding?.procedure.kind === "spellcasting"
    ? Result.succeed(binding.procedure)
    : Result.fail({ kind: "missingSpellcastingBinding" } as const);
}

export function spellcastingIsolationBase(): StatBlockRecord {
  return {
    ...statBlockRecord(),
    id: statBlockId("synthetic_spellcasting_isolation"),
    name: "Synthetic Spellcasting Isolation",
    provenance: {
      kind: "synthetic-test",
      section: "Isolated spellcasting admission verification",
    },
  };
}
