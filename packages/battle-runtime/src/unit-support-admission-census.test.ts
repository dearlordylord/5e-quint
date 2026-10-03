import { describe, expect, test } from "vitest";
import { Result } from "effect";
import { CLASS_NAMES, unitId } from "@dnd/shared/game-facts";
import { classLevel } from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";

import { battleUnitRefWithSupportProfiles } from "./unit-feature-support.ts";

/**
 * Admission census (issue #528, Step 1): enumerates the closed-world set of
 * SRD Units that battle admission rejects as "detected-but-unparseable under
 * a maximally provided context" — every class at level 20, the full
 * sourceFacts shape, and retained feature selections where the
 * per-ref seam requires one. Failures that manifest only with absent
 * sourceFacts or missing selections are out of scope here; the
 * creation-to-battle reachability join (Step 2) owns those. Per-unit
 * admission aggregation fails fast, so each entry names only the first
 * unparseable hook per Unit; a Unit with two unparseable hooks needs a
 * second census run after the first is fixed or registered. `claimTag` cites
 * the Unit's row in plans/unit-profile-coverage/unit-claims.jsonl for the
 * parked checker join.
 */
const catalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (catalogResult.tag !== "ok") {
  throw new Error("Admission census test catalog must build.");
}

const units = catalogResult.catalog.listUnits();
const classLevels = CLASS_NAMES.map((className) => ({
  className,
  level: classLevel(20),
}));
const sourceFacts = { draconicAncestryDamageType: "acid" } as const;
const RETAINED_HUNTERS_PREY_SELECTION = {
  kind: "huntersPrey",
  selection: "woundedTargetWeaponDamage",
} as const;

type AdmissionFailure = {
  readonly unitId: (typeof units)[number]["id"];
  readonly message: string;
};
type KnownAdmissionFailure = AdmissionFailure & {
  readonly claimTag:
    | "not-applicable"
    | "profile-subset-supported"
    | "supported-profile"
    | "unsupported-profile";
};

const KNOWN_ADMISSION_FAILURES = [
  {
    unitId: unitId("mastery_graze"),
    claimTag: "unsupported-profile",
    message: "Unsupported battle Weapon Mastery Unit hook: mastery_graze.",
  },
  {
    unitId: unitId("mastery_nick"),
    claimTag: "unsupported-profile",
    message: "Unsupported battle Weapon Mastery Unit hook: mastery_nick.",
  },
  {
    unitId: unitId("mastery_vex"),
    claimTag: "unsupported-profile",
    message: "Unsupported battle Weapon Mastery Unit hook: mastery_vex.",
  },
  {
    unitId: unitId("species_gnome_gnomish_cunning"),
    claimTag: "unsupported-profile",
    message:
      "Unsupported battle passive Saving Throw roll-mode Unit hook: species_gnome_gnomish_cunning.",
  },
] as const satisfies ReadonlyArray<KnownAdmissionFailure>;

describe("unit support admission census", () => {
  test("enumerates every detected-but-unparseable SRD Unit under a maximally provided context", () => {
    const failures: AdmissionFailure[] = [];

    for (const unit of units) {
      const admission = admitUnitWithMaximallyProvidedContext(unit);
      if (Result.isFailure(admission)) {
        failures.push({
          unitId: unit.id,
          message: admission.failure.message,
        });
      }
    }

    expect(failures.sort(compareAdmissionFailures)).toEqual(
      KNOWN_ADMISSION_FAILURES.map(({ unitId, message }) => ({
        unitId,
        message,
      })).sort(compareAdmissionFailures),
    );
  });
});

function admitUnitWithMaximallyProvidedContext(
  unit: (typeof units)[number],
): ReturnType<typeof battleUnitRefWithSupportProfiles> {
  const selectedOption =
    unit.kind !== "class_feature"
      ? undefined
      : unit.mechanics.family === "hunters_prey"
        ? RETAINED_HUNTERS_PREY_SELECTION
        : unit.mechanics.family === "attack_roll_defense_choice"
          ? ({
              kind: "attackRollDefense",
              selection: "opportunityAttackDisadvantage",
            } as const)
          : undefined;
  return battleUnitRefWithSupportProfiles({
    unitRef: {
      unitId: unit.id,
      ...(selectedOption === undefined ? {} : { selectedOption }),
    },
    unit,
    classLevels,
    sourceFacts,
  });
}

function compareAdmissionFailures(
  left: AdmissionFailure,
  right: AdmissionFailure,
): number {
  return left.unitId.localeCompare(right.unitId);
}
