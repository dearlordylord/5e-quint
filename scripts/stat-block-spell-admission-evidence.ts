import { Result } from "effect";
import { statBlockId } from "../packages/shared/src/game-facts.ts";
import type { UnitCatalog } from "../packages/surface/src/surface/unit-catalog.ts";
import type { StatBlockRecord } from "../packages/surface/src/surface/stat-block-types.ts";
import { startBattle } from "../packages/battle-runtime/src/battle-reducer/api-lifecycle.ts";
import {
  battleId,
  combatantId,
  initiativeScore,
} from "../packages/battle-runtime/src/identity.ts";
import type { StatBlockSpellcastingPressureAdmissionEvidence } from "../packages/battle-runtime/src/stat-block-procedure-pressure.ts";

/** Verification-only composition isolates one procedure; it makes no whole-parent support claim. */
export function spellcastingPressureAdmissionEvidence(input: {
  readonly isolationBase: StatBlockRecord;
  readonly unitCatalog: UnitCatalog;
}): Extract<
  StatBlockSpellcastingPressureAdmissionEvidence,
  { kind: "available" }
> {
  return {
    kind: "available",
    admit: ({ record, section, entry }) => {
      if (input.isolationBase.provenance.kind !== "synthetic-test")
        return Result.fail("nonSyntheticIsolationBase");
      if (
        entry.kind !== "executable" ||
        entry.procedure.kind !== "spellcasting"
      )
        return Result.fail("notSpellcasting");
      const {
        actions: _actions,
        bonusActions: _bonusActions,
        resources: _resources,
        ...baseFacts
      } = input.isolationBase.statBlock;
      const isolated: StatBlockRecord = {
        ...input.isolationBase,
        id: statBlockId("synthetic_pressure_spellcasting"),
        statBlock: {
          ...baseFacts,
          abilityScores: record.statBlock.abilityScores,
          ...(record.statBlock.resources === undefined
            ? {}
            : { resources: record.statBlock.resources }),
          ...(section === "actions"
            ? { actions: [entry] }
            : { bonusActions: [entry] }),
        },
      };
      const actorId = combatantId("pressure-spellcasting-caster");
      const started = startBattle({
        battleId: battleId("pressure-spellcasting-admission"),
        combatants: [
          {
            combatantId: actorId,
            statBlock: isolated,
            unitCatalog: input.unitCatalog,
            initiative: initiativeScore(20),
            ammunitionStocks: [],
            conditions: [],
          },
        ],
      });
      if (Result.isFailure(started))
        return Result.fail("initializationRejected");
      const actor = started.success.state.combatants.get(actorId);
      if (actor?.origin.kind !== "statBlock")
        return Result.fail("missingStatBlockActor");
      const binding = actor.origin.execution.procedureBindings.find(
        (candidate) =>
          candidate.procedure.kind === "spellcasting" &&
          candidate.procedure.section === section &&
          candidate.procedure.procedureOrdinal === entry.procedureOrdinal,
      );
      return binding?.procedure.kind === "spellcasting"
        ? Result.succeed(binding.procedure)
        : Result.fail("missingSpellcastingBinding");
    },
  };
}
