import { describe, expect, test } from "vitest";
import { Option, Result } from "effect";
import { unitId as authoredUnitId } from "@dnd/shared/game-facts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { UnitRecord } from "@dnd/surface/surface/types";
import {
  battleUnitRefWithSupportProfiles,
  type CharacterBattleClassLevelInits,
} from "@dnd/battle-runtime";
import {
  characterBuildUnitRefs,
  creationChoiceOptionId,
  finalizeCharacterDraft,
  GNOMISH_LINEAGE_CHOICE_KEY,
  GNOMISH_LINEAGE_SPELLCASTING_ABILITY_CHOICE_KEY,
  PHASE1_CLASS_FIGHTER_UNIT_ID,
  SPECIES_ORIGIN_FEAT_CHOICE_KEY,
  SPECIES_ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY,
  SPECIES_TRAIT_PROFICIENCY_CHOICE_KEY,
  SRD_CHARACTER_ADMISSION_SPECIES_UNIT_IDS,
  WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
  type CharacterDraftPath,
  type CreationChoiceOptionId,
} from "@dnd/character-creation-runtime";
import {
  completeSupportedProgressionDraft,
  manifestFixtureOptionIds,
  testProgression,
  testUnitChoiceSourceKey,
  type PreferredSupportedFillOptionIdsBySource,
} from "@dnd/character-creation-runtime/test-support";

import { characterBattleSupportAdmission } from "./battle-support-profiles.ts";

/**
 * Creation → battle admission reachability join (issue #528, Step 2): the
 * species axis is enumerated from `SRD_CHARACTER_ADMISSION_SPECIES_UNIT_IDS`
 * itself, so a manifest addition auto-extends coverage — a newly admitted
 * species that battle rejects breaks CI with no test edit. Per species, one
 * minimal finalized Fighter 1 build goes through the real creation path and
 * then through `characterBattleSupportAdmission`; every emitted Unit ref is
 * additionally re-admitted through `battleUnitRefWithSupportProfiles` with the
 * admission's own `sourceFacts` and classLevels threaded in, so the record
 * names the exact failing trait Unit rather than only the build. A species
 * with new mandatory creation choices fails loudly in
 * `SPECIES_REACHABILITY_OPTIONS` until its entry is added — also the gate
 * working. Known failures carry a structured `claimTag` citing the Unit's row
 * in plans/unit-profile-coverage/unit-claims.jsonl (the parked checker join
 * consumes them); gnome/gnomish_cunning is the day-one entry and leaves when
 * its #529 modeling task lands.
 */
const catalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (catalogResult.tag !== "ok") {
  throw new Error("Reachability join test catalog must build.");
}
const unitLibrary = catalogResult.catalog;

const FIGHTER_ONE_CLASS_LEVELS = [
  { className: "fighter", level: 1 },
] as const satisfies CharacterBattleClassLevelInits;

type SpeciesReachabilityChoiceOptions = {
  readonly preferredOptionIdsBySource?: PreferredSupportedFillOptionIdsBySource;
  readonly draftPathOptionIds?: Partial<
    Record<CharacterDraftPath, readonly CreationChoiceOptionId[]>
  >;
};

const SPECIES_REACHABILITY_OPTIONS = {
  species_dragonborn: {
    // Draconic Ancestry feeds battle sourceFacts; without a selection the
    // breath-weapon and damage-resistance refs are rejected.
    draftPathOptionIds: {
      "draft.draconicAncestry": [creationChoiceOptionId("red")],
    },
  },
  species_gnome: {
    preferredOptionIdsBySource: {
      [testUnitChoiceSourceKey(
        authoredUnitId("species_gnome_gnomish_lineage"),
        GNOMISH_LINEAGE_CHOICE_KEY,
      )]: [creationChoiceOptionId("forest_gnome")],
      [testUnitChoiceSourceKey(
        authoredUnitId("species_gnome_gnomish_lineage"),
        GNOMISH_LINEAGE_SPELLCASTING_ABILITY_CHOICE_KEY,
      )]: [creationChoiceOptionId("int")],
    },
  },
  species_human: {
    preferredOptionIdsBySource: {
      [testUnitChoiceSourceKey(
        authoredUnitId("species_human_skillful"),
        SPECIES_TRAIT_PROFICIENCY_CHOICE_KEY,
      )]: [creationChoiceOptionId("arcana")],
      [testUnitChoiceSourceKey(
        authoredUnitId("species_human_versatile"),
        SPECIES_ORIGIN_FEAT_CHOICE_KEY,
      )]: [creationChoiceOptionId("feat_skilled")],
      // Skilled via Versatile excludes proficiencies the build already owns;
      // pin the known-good triple from the index.test.ts human witness.
      [testUnitChoiceSourceKey(
        authoredUnitId("feat_skilled"),
        SPECIES_ORIGIN_FEAT_PROFICIENCY_CHOICE_KEY,
      )]: [
        creationChoiceOptionId("history"),
        creationChoiceOptionId("tool:alchemists_supplies"),
        creationChoiceOptionId("tool:thieves_tools"),
      ],
    },
  },
  species_dwarf: {},
  species_elf: {},
  species_halfling: {},
  species_goliath: {},
  species_orc: {},
  species_tiefling: {},
} satisfies Readonly<Record<string, SpeciesReachabilityChoiceOptions>>;

const speciesReachabilityOptions: Readonly<
  Record<string, SpeciesReachabilityChoiceOptions>
> = SPECIES_REACHABILITY_OPTIONS;

// Weapon Mastery options whose battle-side mastery Units are admitted; the
// census parks mastery_graze/nick/vex, so the default first-supported fill
// could pick a battle-unsupported weapon.
const FIGHTER_WEAPON_MASTERY_PREFERENCE = {
  [testUnitChoiceSourceKey(
    authoredUnitId("fighter_weapon_mastery"),
    WEAPON_MASTERY_OPTIONS_CHOICE_KEY,
  )]: [
    creationChoiceOptionId("weapon_longsword"),
    creationChoiceOptionId("weapon_spear"),
    creationChoiceOptionId("weapon_flail"),
  ],
} satisfies PreferredSupportedFillOptionIdsBySource;

type ReachabilityFailure = {
  readonly speciesUnitId: UnitRecord["id"];
  readonly failingUnitId: UnitRecord["id"];
  readonly message: string;
};
type KnownReachabilityFailure = ReachabilityFailure & {
  // Tier 3's parked coverage-checker join consumes this citation metadata;
  // runtime equality below intentionally compares only observed failures.
  readonly claimTag:
    | "not-applicable"
    | "profile-subset-supported"
    | "supported-profile"
    | "unsupported-profile";
};

const KNOWN_REACHABILITY_FAILURES = [
  {
    speciesUnitId: authoredUnitId("species_gnome"),
    failingUnitId: authoredUnitId("species_gnome_gnomish_cunning"),
    claimTag: "unsupported-profile",
    message:
      "Unsupported battle passive Saving Throw roll-mode Unit hook: species_gnome_gnomish_cunning.",
  },
] as const satisfies ReadonlyArray<KnownReachabilityFailure>;

describe("creation → battle admission reachability join", () => {
  test("every manifest species finalizes to a build battle admission accepts", () => {
    const failures: ReachabilityFailure[] = [];

    for (const speciesUnitId of SRD_CHARACTER_ADMISSION_SPECIES_UNIT_IDS) {
      const options = speciesReachabilityOptions[speciesUnitId];
      if (options === undefined) {
        throw new Error(
          `Reachability join requires an explicit options entry for manifest species ${speciesUnitId}.`,
        );
      }
      const draft = completeSupportedProgressionDraft({
        draftId: `draft:creation-battle-reachability-${speciesUnitId}`,
        unitLibrary,
        progression: testProgression(
          unitLibrary,
          PHASE1_CLASS_FIGHTER_UNIT_ID,
          1,
        ),
        speciesUnitId,
        fixtureOptionIds: manifestFixtureOptionIds,
        preferredOptionIdsBySource: {
          ...FIGHTER_WEAPON_MASTERY_PREFERENCE,
          ...options.preferredOptionIdsBySource,
        },
        requirePreferredOptionForSource: (source) =>
          source.unitId.startsWith("species_"),
        ...(options.draftPathOptionIds === undefined
          ? {}
          : { draftPathOptionIds: options.draftPathOptionIds }),
      });
      const finalized = finalizeCharacterDraft({ draft, unitLibrary });
      if (finalized.tag !== "ready") {
        throw new Error(
          `Reachability join build must finalize for ${speciesUnitId}: ${JSON.stringify(finalized)}`,
        );
      }
      const build = finalized.build;
      const emittedUnitRefs = characterBuildUnitRefs(build, unitLibrary);

      const admission = characterBattleSupportAdmission(
        build,
        unitLibrary,
        undefined,
        FIGHTER_ONE_CLASS_LEVELS,
      );
      if (Result.isFailure(admission)) {
        for (const issue of admission.failure) {
          failures.push({
            speciesUnitId,
            failingUnitId: failingUnitIdFromIssueMessage(
              issue.message,
              emittedUnitRefs.map(({ unitId }) => unitId),
            ),
            message: issue.message,
          });
        }
      }

      const sourceFacts = Result.isSuccess(admission)
        ? admission.success.sourceFacts
        : undefined;

      for (const unitRef of emittedUnitRefs) {
        const unit = unitLibrary.getUnit(unitRef.unitId);
        if (Option.isNone(unit)) {
          throw new Error(
            `Reachability join build references unknown Unit ${unitRef.unitId} for ${speciesUnitId}.`,
          );
        }
        const refAdmission = battleUnitRefWithSupportProfiles({
          unitRef,
          unit: unit.value,
          classLevels: FIGHTER_ONE_CLASS_LEVELS,
          ...(sourceFacts === undefined ? {} : { sourceFacts }),
        });
        if (Result.isFailure(refAdmission)) {
          failures.push({
            speciesUnitId,
            failingUnitId: unitRef.unitId,
            message: refAdmission.failure.message,
          });
        }
      }
    }

    expect(
      failures
        .filter(
          (failure, index, all) =>
            all.findIndex(
              (candidate) =>
                candidate.speciesUnitId === failure.speciesUnitId &&
                candidate.failingUnitId === failure.failingUnitId &&
                candidate.message === failure.message,
            ) === index,
        )
        .sort(compareReachabilityFailures),
    ).toEqual(
      KNOWN_REACHABILITY_FAILURES.map(
        ({ speciesUnitId, failingUnitId, message }) => ({
          speciesUnitId,
          failingUnitId,
          message,
        }),
      ).sort(compareReachabilityFailures),
    );
  });
});

function failingUnitIdFromIssueMessage(
  message: string,
  emittedUnitIds: readonly UnitRecord["id"][],
): UnitRecord["id"] {
  const matchingUnitId = [...emittedUnitIds]
    .sort((left, right) => right.length - left.length)
    .find((unitId) => message.includes(unitId));
  if (matchingUnitId !== undefined) {
    return matchingUnitId;
  }
  throw new Error(
    `Battle admission issue did not identify an emitted Unit ref: ${message}`,
  );
}

function compareReachabilityFailures(
  left: ReachabilityFailure,
  right: ReachabilityFailure,
): number {
  return (
    left.speciesUnitId.localeCompare(right.speciesUnitId) ||
    left.failingUnitId.localeCompare(right.failingUnitId)
  );
}
