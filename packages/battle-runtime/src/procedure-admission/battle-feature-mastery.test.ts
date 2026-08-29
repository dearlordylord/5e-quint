import { describe, expect, test } from "vitest";
import { classLevel } from "@dnd/shared/types";

import {
  fighterIndomitableUnitId,
  huntersPreyUnsupportedDamageDieUnit,
  unitLibrary,
  unitMechanicsVariant,
} from "../unit-profile-admission-catalog.test-support.ts";
import { admitBattleFeatureMasteryProcedure } from "./battle-feature-mastery.ts";

describe("Battle feature/mastery procedure admission", () => {
  test("retains renamed mechanics without authored-identity dispatch", () => {
    const authored = unitLibrary.requireUnit(fighterIndomitableUnitId);
    if (authored.kind !== "class_feature") {
      throw new Error("Expected fighter Indomitable class-feature mechanics.");
    }
    const renamed = unitMechanicsVariant(authored, {
      id: "synthetic_fighter_indomitable",
      mechanics: authored.mechanics,
    });

    const admitted = admitBattleFeatureMasteryProcedure({
      unit: renamed,
      classLevels: [{ className: "fighter", level: classLevel(9) }],
    });
    expect(admitted.tag).toBe("admitted");
    if (admitted.tag !== "admitted") return;

    expect(admitted.procedure.featureProfile).toEqual(
      expect.objectContaining({
        kind: "failedSavingThrowReroll",
        unit: expect.objectContaining({ id: "synthetic_fighter_indomitable" }),
      }),
    );
  });

  test("rejects a represented but unsupported mechanics shape", () => {
    const rejected = admitBattleFeatureMasteryProcedure({
      unit: huntersPreyUnsupportedDamageDieUnit(),
    });

    expect(rejected.tag).toBe("rejected");
    if (rejected.tag !== "rejected") return;
    expect(rejected.issues).toEqual([
      expect.objectContaining({
        tag: "battleFeatureMasteryProcedureAdmissionIssue",
        mechanicsPath: {
          family: "unit",
          nodes: [{ kind: "singleton", role: "recordMechanics" }],
        },
      }),
    ]);
  });
});
