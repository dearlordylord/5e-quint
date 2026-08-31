import { describe, expect, test } from "vitest";
import {
  boundPersistentAreaSaveDamageEffectForArea,
  persistentAreaSaveDamageRepositionKind,
} from "./battle-reducer/persistent-area-save-damage-binding.ts";
import {
  battleEffectExecutionRefForTest,
  resolveBattleSubject,
} from "./battle-runtime.test-support.ts";
import { battleAreaId } from "./identity.ts";
import { requireHole } from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  moonbeamAreaFill,
  spellAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  moonbeamUnitId,
  spellCasterId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";

function directedPersistentAreaFixture() {
  const initial = spellBattle({
    preparedSpells: [spellRecord(moonbeamUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
  });
  const castAct = spellAct({
    session: initial,
    spellId: moonbeamUnitId,
    slotLevel: 2,
  });
  const area = requireHole(castAct.initialHoles, "spellAreaChoice");
  const cast = resolveBattleSubject({
    state: initial.state,
    subject: castAct.subject,
    fills: [moonbeamAreaFill(area)],
  });
  if (cast.tag !== "resolved") {
    throw new Error("Expected directed persistent-area cast to resolve.");
  }
  const effect = cast.state.combatants
    .get(spellCasterId)
    ?.activeEffects.find(
      (candidate) => candidate.kind === "persistentAreaSaveDamage",
    );
  if (effect?.kind !== "persistentAreaSaveDamage") {
    throw new Error("Expected directed persistent-area effect.");
  }
  return { state: cast.state, effect };
}

describe("persistent area save-damage binding", () => {
  test("classifies reposition behavior independently of its action cost", () => {
    expect(
      persistentAreaSaveDamageRepositionKind({
        actionCost: "magicAction",
        collisionDisposition: "stopAndAffectAdjacent",
      }),
    ).toBe("collisionReposition");
    expect(
      persistentAreaSaveDamageRepositionKind({
        actionCost: "bonusAction",
        collisionDisposition: "ignoreObstacles",
      }),
    ).toBe("directedReposition");
  });

  test("binds a persistent-area effect by its exact effect ref and area", () => {
    const { state, effect } = directedPersistentAreaFixture();

    expect(
      boundPersistentAreaSaveDamageEffectForArea(
        state,
        effect.effectRef,
        effect.areaId,
      )?.kind,
    ).toBe("directedReposition");
  });

  test("rejects a mismatched effect ref even when the area matches", () => {
    const { state, effect } = directedPersistentAreaFixture();

    expect(
      boundPersistentAreaSaveDamageEffectForArea(
        state,
        battleEffectExecutionRefForTest("mismatched-persistent-area-effect"),
        effect.areaId,
      ),
    ).toBeUndefined();
  });

  test("rejects a mismatched area even when the effect ref matches", () => {
    const { state, effect } = directedPersistentAreaFixture();

    expect(
      boundPersistentAreaSaveDamageEffectForArea(
        state,
        effect.effectRef,
        battleAreaId("mismatched-persistent-area"),
      ),
    ).toBeUndefined();
  });
});
