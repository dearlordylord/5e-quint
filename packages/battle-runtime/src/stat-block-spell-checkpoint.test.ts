import { Schema } from "effect";
import { expect, it } from "vitest";
import { BattleSnapshotSchema, snapshotBattle } from "./index.ts";
import {
  castStatBlockConcentrationSpell,
  statBlockConcentrationBattle,
  statBlockConcentrationCasterId,
} from "./stat-block-spell-concentration.test-support.ts";

it("preserves admitted Stat Block spell references and live Concentration through a JSON checkpoint", () => {
  const session = castStatBlockConcentrationSpell(
    statBlockConcentrationBattle(),
  );
  expect(
    session.state.combatants.get(statBlockConcentrationCasterId)?.concentration,
  ).toEqual(
    expect.objectContaining({ sourceProcedureRef: expect.any(String) }),
  );
  const snapshot = snapshotBattle(session.state);
  const encoded = Schema.encodeSync(BattleSnapshotSchema)(snapshot);
  const restored = Schema.decodeUnknownSync(BattleSnapshotSchema)(
    JSON.parse(JSON.stringify(encoded)),
  );
  expect(restored).toEqual(snapshot);
});
