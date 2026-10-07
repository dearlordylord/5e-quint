// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.SPELL_INVOCATION_UNRESTRICTED
import { isDeepStrictEqual } from "node:util";
import { Schema } from "effect";
import { SpellLevelSchema } from "@dnd/surface/surface/schema";
import { describe, it } from "vitest";
import {
  decodeSpellRecordForTest,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import { joinStatBlockSpellDefinition } from "./procedure-admission/stat-block-spell-definition.ts";
import {
  MBT_TEST_TIMEOUT_MS,
  defineDriver,
  focusedMbtMaxSteps,
  mbtPickSchemas,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintField,
  quintStateRecord,
  quintVariantTag,
  quintVariantValue,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";

type CastLevelResult =
  | { readonly kind: "effective"; readonly level: number }
  | { readonly kind: "invalid" };

const driverSchema = {
  init: {},
  doJoin: {
    definitionLevel: mbtPickSchemas.int,
    listedLevel: mbtPickSchemas.int,
    useDefinitionLevel: mbtPickSchemas.bool,
  },
} as const;

function invocationDriver() {
  return defineDriver(driverSchema, () => {
    let result: CastLevelResult = { kind: "effective", level: 1 };
    return {
      init: () => {
        result = { kind: "effective", level: 1 };
      },
      doJoin: ({ definitionLevel, listedLevel, useDefinitionLevel }) => {
        const base = spellRecord("magic_missile");
        const definition = decodeSpellRecordForTest({
          ...base,
          mechanics: { ...base.mechanics, level: definitionLevel },
        });
        const reference = useDefinitionLevel
          ? { spellId: definition.id }
          : {
              spellId: definition.id,
              castAtLevel:
                Schema.decodeUnknownSync(SpellLevelSchema)(listedLevel),
            };
        const joined = joinStatBlockSpellDefinition(reference, definition);
        if (joined.kind === "joined") {
          result = { kind: "effective", level: joined.value.castLevel };
        } else if (joined.kind === "invalidCastLevel") {
          result = { kind: "invalid" };
        } else {
          throw new Error(
            `Unexpected synthetic definition join failure: ${joined.kind}`,
          );
        }
      },
      getState: () => result,
    };
  });
}

describe("Stat Block invocation boundary focused MBT", () => {
  it(
    "compares production catalog cast-level admission with the semantic core",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "stat-block-spell-invocation.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: invocationDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(25),
        stateCheck: stateCheck(
          (raw): CastLevelResult => {
            const state = quintStateRecord(raw);
            const value = quintField(state, "qResult");
            const tag = quintVariantTag(value, "qResult");
            if (tag === "InvalidSpellLevel") return { kind: "invalid" };
            return {
              kind: "effective",
              level: numberFromQuintInt(
                quintVariantValue(value, "EffectiveSpellLevel"),
                "effective level",
              ),
            };
          },
          (model, runtime) => isDeepStrictEqual(model, runtime),
        ),
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});
