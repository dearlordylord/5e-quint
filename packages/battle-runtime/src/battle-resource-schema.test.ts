import { NonNegativeInteger } from "@dnd/shared/types";
import { Schema } from "effect";
import { describe, expect, test } from "vitest";

import { RuntimeActionResourceSchema } from "./battle-reducer/battle-codecs.ts";
import {
  battleCharacterExecutionScopeRef,
  battleExecutionScopeOrdinal,
  battleId,
  battleProcedureExecutionRef,
  combatantId,
} from "./identity.ts";

describe("Battle action resource schema", () => {
  test("rejects authored resource keys after execution binding", () => {
    const ownerId = combatantId("resource-owner");
    const procedureRef = battleProcedureExecutionRef(
      battleCharacterExecutionScopeRef(
        battleId("resource-schema-battle"),
        ownerId,
        battleExecutionScopeOrdinal(0),
      ),
      NonNegativeInteger(0),
    );
    const decode = Schema.decodeUnknownSync(RuntimeActionResourceSchema);
    const restriction = { kind: "none" } as const;

    expect(() =>
      decode({
        kind: "action",
        source: "unit",
        sourceOwnerId: ownerId,
        sourceProcedureRef: procedureRef,
        sourceUnitId: "synthetic-unit",
        restriction,
      }),
    ).toThrow();
    expect(() =>
      decode({
        kind: "action",
        source: "spellEffect",
        sourceOwnerId: ownerId,
        sourceProcedureRef: procedureRef,
        restriction,
      }),
    ).toThrow();
    expect(() =>
      decode({
        kind: "action",
        source: "classFeatureExtraAttack",
        sourceOwnerId: ownerId,
        sourceUnitId: "synthetic-unit",
        restriction,
      }),
    ).toThrow();

    expect(
      decode({
        kind: "action",
        source: "unit",
        sourceOwnerId: ownerId,
        sourceProcedureRef: procedureRef,
        restriction,
      }),
    ).toMatchObject({ sourceProcedureRef: procedureRef });
  });
});
