// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt character-creation.wizard-spellcasting-advancement
// KERNEL-COVERAGE: parity-witness CREATION.SPELL_ACCESS.WIZARD_PROGRESSION
import * as path from "node:path";
import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { unitId } from "@dnd/shared/game-facts";
import { Result } from "effect";
import { expect, test } from "vitest";
import {
  advanceCharacterBuildClassLevel,
  classUnitIdFromUnitId,
  creationChoiceOptionId,
  type CharacterBuildClassLevelGain,
} from "./index.ts";
import {
  buildFor,
  wizardSpellcastingGainChoicesForBuild,
  unitLibrary,
} from "./repeated-feat-grants.test-support.ts";
function success<A, E>(result: Result.Result<A, E>): A {
  if (Result.isFailure(result)) throw new Error(JSON.stringify(result.failure));
  return result.success;
}
const actions = {
  init: {},
  rejectMissing: {},
  gain: {},
  gainBonus: {},
  resetBonus: {},
  rejectMissingBonus: {},
  rejectDuplicateBonus: {},
  rejectDuplicate: {},
  step: {},
} as const;
test("replays required Wizard Spellbook and preparation gains", async () => {
  const driver = defineDriver(actions, () => {
    const initial = buildFor("wizard", 4);
    let build = initial;
    let accepted = true;
    let phase = 0;
    const classUnitId = success(
      classUnitIdFromUnitId({
        unitLibrary,
        classUnitId: unitId("class_wizard"),
      }),
    );
    const gainedChoices = wizardSpellcastingGainChoicesForBuild(initial);
    const base = {
      tag: "classLevelGain",
      classUnitId,
      hitPointRule: { tag: "fixedHigherLevelGain" },
    } as const;
    const apply = (gain: CharacterBuildClassLevelGain, nextPhase: number) => {
      const result = advanceCharacterBuildClassLevel({
        build,
        unitLibrary,
        levelGain: gain,
      });
      accepted = Result.isSuccess(result);
      if (Result.isSuccess(result)) build = result.success;
      phase = nextPhase;
    };
    return {
      init: () => {
        build = initial;
        accepted = true;
        phase = 0;
      },
      rejectMissing: () => apply(base, 1),
      gain: () => apply({ ...base, gainedChoices }, 3),
      resetBonus: () => {
        build = initial;
        accepted = true;
        phase = 4;
      },
      rejectMissingBonus: () => apply(base, 5),
      rejectDuplicateBonus: () =>
        apply(
          { ...base, gainedChoices: [...gainedChoices, ...gainedChoices] },
          6,
        ),
      gainBonus: () =>
        apply(
          {
            ...base,
            gainedChoices: [
              ...gainedChoices,
              {
                kind: "unitChoice",
                featureUnitId: unitId("wizard_evocation_savant"),
                choiceKey: "wizard_spellbook_choices",
                optionIds: [creationChoiceOptionId("shatter")],
              },
            ],
          },
          7,
        ),
      rejectDuplicate: () =>
        apply(
          { ...base, gainedChoices: [...gainedChoices, ...gainedChoices] },
          2,
        ),
      step: () => {},
      getState: () => ({
        bookAdditions:
          (build.spellcasting?.sources[0]?.spellbook.length ?? 0) -
          (initial.spellcasting?.sources[0]?.spellbook.length ?? 0),
        preparationGrown:
          build.spellcasting?.sources[0]?.preparedSpells.length ===
          (initial.spellcasting?.sources[0]?.preparedSpells.length ?? 0) + 2,
        sourceRetained:
          build.spellcasting?.sources[0]?.sourceUnitId ===
          initial.spellcasting?.sources[0]?.sourceUnitId,
        accepted,
        phase,
      }),
    };
  });
  await run({
    spec: path.resolve(
      import.meta.dirname,
      "../character-creation-wizard-spellcasting-gains.mbt.qnt",
    ),
    init: "init",
    step: "step",
    driver,
    backend: "typescript",
    nTraces: 1,
    maxSteps: 7,
    stateCheck: stateCheck(
      (raw) => {
        if (typeof raw !== "object" || raw === null || !("qState" in raw))
          throw new Error("Expected QNT state");
        const state = raw.qState;
        if (typeof state !== "object" || state === null || !("phase" in state))
          throw new Error("Expected Wizard gain projection");
        return {
          ...state,
          phase: Number(state.phase),
          bookAdditions:
            "bookAdditions" in state ? Number(state.bookAdditions) : -1,
        };
      },
      (spec, impl) => {
        expect(impl).toEqual(spec);
        return true;
      },
    ),
  });
}, 120_000);
