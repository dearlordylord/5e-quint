// RAW-COVERAGE: verification-owner:focused-mbt RAW-STAT-BLOCK-SPELLCASTING-PROCEDURE-001
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt stat-block.spellcasting.procedure
// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.SPELLCASTING_PROCEDURE
import { isDeepStrictEqual } from "node:util";
import * as Result from "effect/Result";
import { describe, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintField,
  quintList,
  quintStateRecord,
  quintVariantMappedValue,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { projectAuthoredStatBlock } from "./stat-block-authored-projection.ts";
import { statBlockRecord } from "./battle-runtime.test-support.ts";
import { syntheticSpellcastingProcedureEntry } from "./stat-block-spellcasting-procedure.test-support.ts";
import { statBlockSpellcastingActionCost } from "./stat-block-execution-state.ts";

type SpellcastingSection = "actions" | "bonusActions";
type SpellcastingInvocationOutcome = "unrestricted" | "restricted";
type SpellcastingActionCost = "magicAction" | "bonusAction";

type SpellcastingProcedureProjection = {
  readonly section: SpellcastingSection;
  readonly actionCost: SpellcastingActionCost;
  readonly atWillOutcomes: readonly SpellcastingInvocationOutcome[];
  readonly limitedOutcomes: readonly SpellcastingInvocationOutcome[];
  readonly limitedResourceOrdinals: readonly number[];
  readonly admitted: boolean;
};

const driverSchema = {
  init: {},
  doActionProjection: {},
  doBonusProjection: {},
  step: {},
} as const;

function createRuleCoreStatBlockSpellcastingProcedureDriver() {
  return defineDriver(driverSchema, () => {
    let state = projectSpellcastingProcedure("actions");

    return {
      init: () => {
        state = projectSpellcastingProcedure("actions");
      },
      doActionProjection: () => {
        state = projectSpellcastingProcedure("actions");
      },
      doBonusProjection: () => {
        state = projectSpellcastingProcedure("bonusActions");
      },
      step: () => {},
      getState: () => state,
    };
  });
}

const spellcastingProcedureStateCheck = stateCheck(
  normalizeSpellcastingProcedureQuintState,
  (quint, runtime) => isDeepStrictEqual(runtime, quint),
);

const ruleCoreStatBlockSpellcastingProcedureDefaultMbtSteps = 2;

describe("rule-core Stat Block spellcasting procedure focused MBT", () => {
  it(
    "replays generic procedure projection parity through battle-runtime admission",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "rule-core-stat-block-spellcasting-procedure.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createRuleCoreStatBlockSpellcastingProcedureDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(
          ruleCoreStatBlockSpellcastingProcedureDefaultMbtSteps,
        ),
        stateCheck: spellcastingProcedureStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function projectSpellcastingProcedure(
  section: SpellcastingSection,
): SpellcastingProcedureProjection {
  const projected = projectAuthoredStatBlock(spellcastingRecord(section));
  if (Result.isFailure(projected)) {
    throw new Error(
      `Expected synthetic Stat Block spellcasting projection: ${projected.failure.reason}.`,
    );
  }
  const procedure = projected.success.runtime.procedures.find(
    (candidate) => candidate.kind === "spellcasting",
  );
  if (procedure === undefined) {
    throw new Error("Expected an admitted Stat Block spellcasting procedure.");
  }
  const [atWill, limited] = procedure.groups;
  if (atWill === undefined || limited === undefined) {
    throw new Error("Expected the two synthetic spellcasting groups.");
  }
  if (atWill.kind !== "at_will" || limited.kind !== "limited") {
    throw new Error("Expected at-will then limited spellcasting groups.");
  }
  return {
    section,
    actionCost: statBlockSpellcastingActionCost(procedure),
    atWillOutcomes: atWill.invocations.map(({ kind }) => kind),
    limitedOutcomes: limited.invocations.map(({ kind }) => kind),
    limitedResourceOrdinals: limited.resourceRefs.map((ordinal) => ordinal),
    admitted: true,
  };
}

function spellcastingRecord(
  section: SpellcastingSection,
): ReturnType<typeof statBlockRecord> {
  const source = statBlockRecord();
  const entry = syntheticSpellcastingProcedureEntry();
  if (section === "actions") {
    return {
      ...source,
      statBlock: {
        ...source.statBlock,
        actions: [entry, ...(source.statBlock.actions ?? [])],
      },
    };
  }
  return {
    ...source,
    statBlock: {
      ...source.statBlock,
      bonusActions: [entry, ...(source.statBlock.bonusActions ?? [])],
    },
  };
}

function normalizeSpellcastingProcedureQuintState(
  raw: unknown,
): SpellcastingProcedureProjection {
  const state = quintStateRecord(raw);
  return {
    section: quintVariantMappedValue(
      quintField(state, "qSection"),
      "qSection",
      { Actions: "actions", BonusActions: "bonusActions" },
      "Stat Block spellcasting section",
    ),
    actionCost: quintVariantMappedValue(
      quintField(state, "qActionCost"),
      "qActionCost",
      { MagicActionCost: "magicAction", BonusActionCost: "bonusAction" },
      "Stat Block spellcasting action cost",
    ),
    atWillOutcomes: normalizeOutcomes(
      quintList(quintField(state, "qAtWillOutcomes"), "qAtWillOutcomes"),
      "qAtWillOutcomes",
    ),
    limitedOutcomes: normalizeOutcomes(
      quintList(quintField(state, "qLimitedOutcomes"), "qLimitedOutcomes"),
      "qLimitedOutcomes",
    ),
    limitedResourceOrdinals: quintList(
      quintField(state, "qLimitedResourceOrdinals"),
      "qLimitedResourceOrdinals",
    ).map((value, index) =>
      numberFromQuintInt(value, `qLimitedResourceOrdinals[${index}]`),
    ),
    admitted: booleanField(state, "qAdmitted"),
  };
}

function normalizeOutcomes(
  values: readonly unknown[],
  field: string,
): readonly SpellcastingInvocationOutcome[] {
  return values.map((value, index) =>
    quintVariantMappedValue(
      value,
      `${field}[${index}]`,
      { Unrestricted: "unrestricted", Restricted: "restricted" },
      "Stat Block spellcasting invocation outcome",
    ),
  );
}
