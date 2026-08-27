import { Context, Effect, Result, Schema, SchemaGetter } from "effect";
import { spellProcedureExecutionSchema } from "./battle-reducer/spell-procedure-profiles/execution-profile.ts";
import { SaveGatedDamageInvocationSchema } from "./battle-reducer/spell-procedure-profiles/save-gated-damage.ts";
import {
  spellAct,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { thunderwaveUnitId } from "./unit-profile-admission-catalog.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import { describe, expect, test } from "vitest";

type Equal<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends <T>() => T extends Right ? 1 : 2
    ? true
    : false;
type Assert<Value extends true> = Value;

interface ProbeService {
  readonly value: number;
}

const ProbeService = Context.Service<ProbeService>(
  "battle-runtime spell procedure schema probe",
);

const contextfulSchema = Schema.String.pipe(
  Schema.decode({
    decode: SchemaGetter.checkEffect<string, ProbeService>(() =>
      Effect.map(Effect.service(ProbeService), () => undefined),
    ),
    encode: SchemaGetter.passthrough(),
  }),
);

type ContextfulDecodingServices = Schema.Codec.DecodingServices<
  typeof contextfulSchema
>;
type _ContextfulServiceIsRetained = Assert<
  Equal<ContextfulDecodingServices, ProbeService>
>;
const contextfulServiceTypeCheck: _ContextfulServiceIsRetained = true;
void contextfulServiceTypeCheck;

describe("spell procedure execution schema constraint", () => {
  test("preserves transformed encoded and decoded views", () => {
    const schema = spellProcedureExecutionSchema(Schema.NumberFromString);

    const decoded: Schema.Schema.Type<typeof schema> =
      Schema.decodeSync(schema)("42");
    const encoded: Schema.Codec.Encoded<typeof schema> =
      Schema.encodeSync(schema)(decoded);

    expect(decoded).toBe(42);
    expect(encoded).toBe("42");

    const compileTimeTypeAssertions = (): void => {
      // @ts-expect-error NumberFromString decodes to a number, not a string.
      const invalidDecoded: Schema.Schema.Type<typeof schema> = "42";
      // @ts-expect-error NumberFromString encodes from a number to a string.
      const invalidEncoded: Schema.Codec.Encoded<typeof schema> = 42;
      void invalidDecoded;
      void invalidEncoded;
    };
    void compileTimeTypeAssertions;
  });

  test("rejects an any schema at compile time", () => {
    // @ts-expect-error The execution boundary must not erase its decoded type to any.
    spellProcedureExecutionSchema(Schema.Any);
  });

  test("rejects codecs that require decoding services at compile time", () => {
    // @ts-expect-error Execution schemas are property-only and cannot require services.
    spellProcedureExecutionSchema(contextfulSchema);
  });

  test("round-trips save-gated spell optional execution facts", () => {
    const session = spellBattle({
      preparedSpells: [spellRecord(thunderwaveUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: thunderwaveUnitId,
      slotLevel: 2,
    });
    const savingThrow = act.initialHoles.find(
      (hole) => hole.kind === "savingThrowOutcome",
    );
    if (savingThrow === undefined) {
      throw new Error("Expected Thunderwave Saving Throw hole.");
    }

    const selected = spellHoleInvocation(session, [savingThrow]);
    if (selected.procedure !== "saveGatedDamage") {
      throw new Error("Expected a save-gated damage execution.");
    }
    const { sourceProcedureRef: _sourceProcedureRef, ...execution } = selected;

    const decoded = Schema.decodeUnknownResult(SaveGatedDamageInvocationSchema)(
      execution,
    );
    if (Result.isFailure(decoded)) {
      throw new Error(String(decoded.failure));
    }
    expect(decoded.success.postSaveAreaEffect).toEqual({
      kind: "thunderwave",
      creaturePush: {
        distanceFeet: 10,
        originDirection: "away_from_caster",
      },
      unsecuredObjectPush: {
        distanceFeet: 10,
        originDirection: "away_from_caster",
        objectLocation: "entirely_within_area",
      },
      audibleBoom: {
        sound: "thunderous boom",
        audibleRadiusFeet: 300,
      },
    });
    expect(
      Schema.encodeSync(SaveGatedDamageInvocationSchema)(decoded.success),
    ).toEqual(execution);

    const { postSaveAreaEffect: _postSaveAreaEffect, ...withoutOptional } =
      execution;
    const decodedWithoutOptional = Schema.decodeUnknownResult(
      SaveGatedDamageInvocationSchema,
    )(withoutOptional);
    if (Result.isFailure(decodedWithoutOptional)) {
      throw new Error(String(decodedWithoutOptional.failure));
    }
    expect(decodedWithoutOptional.success.postSaveAreaEffect).toBeUndefined();
    expect(
      Schema.encodeSync(SaveGatedDamageInvocationSchema)(
        decodedWithoutOptional.success,
      ),
    ).toEqual(withoutOptional);
  });
});
