import { Result } from "effect";
import { statBlockId, unitId } from "@dnd/shared/game-facts";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import {
  startBattle,
  resolveBattleSubject,
  type BattleRuntimeSession,
} from "./index.ts";
import { battleId, combatantId } from "./identity.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { statBlockRecord, unitLibrary } from "./battle-runtime.test-support.ts";
import { statBlockCreature } from "./unit-profile-admission-creature-fixture.test-support.ts";
import { syntheticSpellcastingProcedureEntry } from "./stat-block-spellcasting-procedure.test-support.ts";
import { discoverBattleActCandidates } from "./battle-execution-composition.ts";

export const statBlockConcentrationCasterId = combatantId(
  "synthetic-concentration-caster",
);

export function statBlockConcentrationCasterRecord(
  spellReference = unitId("blur"),
): StatBlockRecord {
  const base = statBlockRecord();
  const entry = syntheticSpellcastingProcedureEntry();
  if (entry.procedure.kind !== "spellcasting")
    throw new Error("Expected synthetic spellcasting procedure.");
  return {
    ...base,
    id: statBlockId("stat_block_synthetic_concentration_caster"),
    name: "Synthetic Concentration Caster",
    provenance: {
      kind: "synthetic-test",
      section: "stat-block-spell-concentration.test-support.ts",
    },
    statBlock: {
      ...base.statBlock,
      actions: [
        {
          kind: "executable",
          procedureOrdinal: entry.procedureOrdinal,
          resourceRefs: { kind: "none" },
          procedure: {
            ...entry.procedure,
            groups: [
              {
                kind: "at_will",
                resourceRefs: { kind: "none" },
                spells: [{ spellId: spellReference }],
              },
            ],
          },
        },
      ],
    },
  };
}

export const statBlockBindingCasterId = combatantId("synthetic-binding-caster");

export function statBlockConcentrationBattle(): BattleRuntimeSession {
  const input = {
    battleId: battleId("synthetic-stat-block-concentration"),
    combatants: [
      {
        unitCatalog: unitLibrary,
        ...statBlockCreature({
          combatantId: statBlockConcentrationCasterId,
          statBlock: statBlockConcentrationCasterRecord(),
          initiative: 20,
        }),
      },
      {
        unitCatalog: unitLibrary,
        ...statBlockCreature({
          combatantId: statBlockBindingCasterId,
          statBlock: {
            ...statBlockConcentrationCasterRecord(unitId("hold_monster")),
            id: statBlockId("stat_block_synthetic_binding_caster"),
            name: "Synthetic Binding Caster",
          },
          initiative: 10,
        }),
      },
    ],
  };
  const admitted = startBattle(input);
  if (Result.isFailure(admitted))
    throw new Error("Expected source-backed Stat Block battle admission.");
  return admitted.success;
}

export function castStatBlockConcentrationSpell(
  session: BattleRuntimeSession,
): BattleRuntimeSession {
  const act = discoverBattleActCandidates(session.state).find(
    (act) => act.subject.tag === "actionSpell",
  );
  if (act === undefined)
    throw new Error("Expected admitted Stat Block Concentration spell act.");
  const result = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [],
  });
  if (result.tag !== "resolved")
    throw new Error(`Expected spell resolution, received ${result.tag}.`);
  return battleRuntimeSessionForTest({ ...session, state: result.state });
}
