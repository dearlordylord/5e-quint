// KERNEL-COVERAGE: runtime-owner SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.font-of-magic-slot-to-sorcery-points
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.font-of-magic-sorcery-points-to-spell-slot
import {
  characterBuildSorcererFontOfMagicFacts,
  characterBuildSpellcastingSlotCapacity,
  fontOfMagicSpellSlotCreationOption,
  type CharacterBuildSorcererFontOfMagicFacts,
  type CharacterBuild,
  type CharacterBuildPactMagicSlotPool,
  type UnitCatalog,
} from "@dnd/character-creation-runtime";
import {
  resourceCount,
  spellSlotLevel,
  type ResourceCount,
  type SpellSlotLevel,
} from "@dnd/shared/types";
import { Result } from "effect";

import {
  characterSheetResources,
  replacePointPoolResourceExpenditure,
} from "./resources.ts";
import {
  characterSheetIssue,
  type CharacterPactSlotExpenditure,
  type CharacterSheet,
  type CharacterSheetCreatedSpellSlotState,
  type CharacterSheetFontOfMagicSlotToSorceryPointsInput,
  type CharacterSheetFontOfMagicSorceryPointsToSpellSlotInput,
  type CharacterSheetFontOfMagicSpellSlotSource,
  type CharacterSheetInput,
  type CharacterSheetIssue,
  type CharacterSheetPactSlotState,
  type CharacterSheetSorceryPointPoolResourceState,
  type CharacterSheetSpellSlotSourceState,
  type CharacterSheetSpellSlotState,
  type CharacterSheetWithSpellSlots,
  type CharacterSpellSlotExpenditure,
  type SpellcastingCharacterBuild,
} from "./sheet-types.ts";

export function characterSheetSpellSlots(
  sheet: CharacterSheet,
): readonly CharacterSheetSpellSlotState[] | undefined {
  if (!isCharacterSheetWithSpellSlots(sheet)) return undefined;
  return combineSpellSlotStates(
    ordinarySpellSlotStates(sheet),
    sheet.createdSpellSlots,
  );
}

export function characterSheetSpellSlotSourceState(
  sheet: CharacterSheet,
): CharacterSheetSpellSlotSourceState | undefined {
  if (!isCharacterSheetWithSpellSlots(sheet)) return undefined;
  return {
    ordinarySpellSlotExpenditures: sheet.spellSlotExpenditures,
    createdSpellSlots: sheet.createdSpellSlots,
  };
}

export function replaceCharacterSheetSpellSlotSourceState(input: {
  readonly sheet: CharacterSheet;
  readonly unitLibrary: UnitCatalog;
  readonly spellSlotState: CharacterSheetSpellSlotSourceState;
}): Result.Result<CharacterSheet, CharacterSheetIssue> {
  /* v8 ignore start -- @preserve -- Malformed slot-state input: the sheet has no ordinary Spell Slot projection. */
  if (!isCharacterSheetWithSpellSlots(input.sheet)) {
    return characterSheetIssue(
      "Spell Slot source state requires ordinary Spell Slot state.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spellSlotState = validateSpellSlotSourceState({
    build: input.sheet.build,
    unitLibrary: input.unitLibrary,
    spellSlotState: input.spellSlotState,
  });
  /* v8 ignore start -- @preserve -- Malformed retained slot state: ordinary or created expenditure disagrees with build capacity. */
  if (Result.isFailure(spellSlotState)) {
    return Result.fail(spellSlotState.failure);
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed({
    ...input.sheet,
    spellSlotExpenditures: spellSlotState.success.ordinarySpellSlotExpenditures,
    createdSpellSlots: spellSlotState.success.createdSpellSlots,
  });
}

export function characterSheetPactSlots(
  sheet: CharacterSheet,
): CharacterSheetPactSlotState | undefined {
  const pactMagic = characterBuildPactSlotCapacity(sheet.build);
  return pactMagic === undefined
    ? undefined
    : {
        slotLevel: spellSlotLevel(pactMagic.slotLevel),
        count: resourceCount(pactMagic.count),
        expended: sheet.pactSlotExpenditure?.expended ?? resourceCount(0),
      };
}

export function convertFontOfMagicSpellSlotToSorceryPoints(
  input: CharacterSheetFontOfMagicSlotToSorceryPointsInput,
): Result.Result<CharacterSheet, CharacterSheetIssue> {
  const fontOfMagicFacts = requiredFontOfMagicFacts(
    input.sheet,
    input.unitLibrary,
    "Font of Magic conversion requires the Sorcerer Font of Magic feature.",
  );
  if (Result.isFailure(fontOfMagicFacts))
    return Result.fail(fontOfMagicFacts.failure);
  const fontOfMagic = fontOfMagicFacts.success;
  /* v8 ignore start -- @preserve -- Malformed Font of Magic input: the sheet has no ordinary Spell Slot state. */
  if (!isCharacterSheetWithSpellSlots(input.sheet)) {
    return characterSheetIssue(
      "Font of Magic conversion requires ordinary Spell Slot state.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const spellSlotSpend = fontOfMagicSpellSlotSpendForSorceryPoints({
    sheet: input.sheet,
    spellLevel: input.spellLevel,
    spellSlotSource: input.spellSlotSource,
  });
  if (Result.isFailure(spellSlotSpend))
    return Result.fail(spellSlotSpend.failure);

  const sorceryPoints = sorceryPointPool(
    input.sheet,
    input.unitLibrary,
    fontOfMagic.unitId,
  );
  /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: the admitted Font of Magic feature must reproject its Sorcery Point pool from the same catalog. */
  if (Result.isFailure(sorceryPoints))
    return Result.fail(sorceryPoints.failure);
  /* v8 ignore start -- @preserve -- Malformed Font of Magic input: the build lacks the shared Sorcery Point resource. */
  if (sorceryPoints.success === undefined) {
    return characterSheetIssue(
      "Font of Magic conversion requires the shared Sorcery Point resource.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const pointGain = resourceCount(input.spellLevel);
  if (sorceryPoints.success.expended < pointGain) {
    return characterSheetIssue(
      "Font of Magic conversion would exceed the Sorcery Point maximum.",
    );
  }

  return Result.succeed({
    ...input.sheet,
    spellSlotExpenditures: spellSlotSpend.success.ordinarySpellSlotExpenditures,
    createdSpellSlots: spellSlotSpend.success.createdSpellSlots,
    resourceExpenditures: replacePointPoolResourceExpenditure({
      expenditures: input.sheet.resourceExpenditures,
      unitId: sorceryPoints.success.unitId,
      expended: resourceCount(sorceryPoints.success.expended - pointGain),
    }),
  });
}

export function convertFontOfMagicSorceryPointsToSpellSlot(
  input: CharacterSheetFontOfMagicSorceryPointsToSpellSlotInput,
): Result.Result<CharacterSheet, CharacterSheetIssue> {
  const fontOfMagicFacts = requiredFontOfMagicFacts(
    input.sheet,
    input.unitLibrary,
    "Font of Magic Spell Slot creation requires the Sorcerer Font of Magic feature.",
  );
  /* v8 ignore start -- @preserve -- Unsupported invocation input: Spell Slot creation is admitted only after retaining the Font of Magic feature profile. */
  if (Result.isFailure(fontOfMagicFacts))
    return Result.fail(fontOfMagicFacts.failure);
  /* v8 ignore stop -- @preserve */
  const fontOfMagic = fontOfMagicFacts.success;
  /* v8 ignore start -- @preserve -- Malformed Font of Magic input: the sheet has no ordinary Spell Slot state. */
  if (!isCharacterSheetWithSpellSlots(input.sheet)) {
    return characterSheetIssue(
      "Font of Magic Spell Slot creation requires ordinary Spell Slot state.",
    );
  }
  /* v8 ignore stop -- @preserve */

  const option = fontOfMagicSpellSlotCreationOption({
    facts: fontOfMagic,
    spellLevel: input.spellLevel,
  });
  if (option === undefined) {
    return characterSheetIssue(
      "Font of Magic Spell Slot creation requires a Creating Spell Slots table entry.",
    );
  }
  if (
    fontOfMagic.spellSlotCreation.ownerClassLevel < option.minimumClassLevel
  ) {
    return characterSheetIssue(
      `Font of Magic Spell Slot creation requires Sorcerer level ${option.minimumClassLevel} for a level ${option.spellSlotLevel} Spell Slot.`,
    );
  }

  const sorceryPoints = sorceryPointPool(
    input.sheet,
    input.unitLibrary,
    fontOfMagic.unitId,
  );
  /* v8 ignore next -- @preserve -- Malformed build/catalog correlation: the admitted Font of Magic feature must reproject its Sorcery Point pool from the same catalog. */
  if (Result.isFailure(sorceryPoints))
    return Result.fail(sorceryPoints.failure);
  /* v8 ignore start -- @preserve -- Malformed Font of Magic input: the build lacks the shared Sorcery Point resource. */
  if (sorceryPoints.success === undefined) {
    return characterSheetIssue(
      "Font of Magic Spell Slot creation requires the shared Sorcery Point resource.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const availableSorceryPoints =
    sorceryPoints.success.count - sorceryPoints.success.expended;
  if (availableSorceryPoints < option.pointCost) {
    return characterSheetIssue(
      "Font of Magic Spell Slot creation requires enough unexpended Sorcery Points.",
    );
  }

  return Result.succeed({
    ...input.sheet,
    createdSpellSlots: addCreatedSpellSlot({
      createdSpellSlots: input.sheet.createdSpellSlots,
      spellLevel: input.spellLevel,
    }),
    resourceExpenditures: replacePointPoolResourceExpenditure({
      expenditures: input.sheet.resourceExpenditures,
      unitId: sorceryPoints.success.unitId,
      expended: resourceCount(
        sorceryPoints.success.expended + option.pointCost,
      ),
    }),
  });
}

function sorceryPointPool(
  sheet: CharacterSheet,
  unitLibrary: UnitCatalog,
  unitId: CharacterSheetSorceryPointPoolResourceState["unitId"],
): Result.Result<
  CharacterSheetSorceryPointPoolResourceState | undefined,
  CharacterSheetIssue
> {
  return Result.map(characterSheetResources(sheet, unitLibrary), (resources) =>
    resources.find(
      (resource): resource is CharacterSheetSorceryPointPoolResourceState =>
        resource.tag === "pointPoolResource" && resource.unitId === unitId,
    ),
  );
}

function requiredFontOfMagicFacts(
  sheet: CharacterSheet,
  unitLibrary: UnitCatalog,
  missingFeatureMessage: string,
): Result.Result<CharacterBuildSorcererFontOfMagicFacts, CharacterSheetIssue> {
  const facts = characterBuildSorcererFontOfMagicFacts({
    build: sheet.build,
    unitLibrary,
  });
  /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: Font of Magic facts cannot be projected from the retained build. */
  if (Result.isFailure(facts)) {
    return characterSheetIssue(facts.failure.message);
  }
  /* v8 ignore stop -- @preserve */
  return facts.success === undefined
    ? characterSheetIssue(missingFeatureMessage)
    : Result.succeed(facts.success);
}

export function ordinarySpellSlotStates(
  sheet: CharacterSheetWithSpellSlots,
): readonly CharacterSheetSpellSlotState[] {
  return characterBuildSpellcastingSlotCapacity(sheet.build).map((slot) => {
    const spellLevel = spellSlotLevel(slot.spellLevel);
    const expenditure = sheet.spellSlotExpenditures.find(
      (candidate) => candidate.spellLevel === spellLevel,
    );
    return {
      spellLevel,
      count: resourceCount(slot.count),
      expended: expenditure?.expended ?? resourceCount(0),
    };
  });
}

export function isCharacterSheetWithSpellSlots(
  sheet: CharacterSheet,
): sheet is CharacterSheetWithSpellSlots {
  return "spellSlotExpenditures" in sheet;
}

export function spellSlotStateFromInput(
  input: Pick<CharacterSheetInput, "spellSlotExpenditures"> & {
    readonly build: SpellcastingCharacterBuild;
    readonly unitLibrary: UnitCatalog;
  },
): Result.Result<CharacterSheetSpellSlotSourceState, CharacterSheetIssue> {
  return validateSpellSlotSourceState({
    build: input.build,
    unitLibrary: input.unitLibrary,
    spellSlotState: {
      ordinarySpellSlotExpenditures: input.spellSlotExpenditures ?? [],
      createdSpellSlots: [],
    },
  });
}

export function validateSpellSlotSourceState(input: {
  readonly build: SpellcastingCharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly spellSlotState: CharacterSheetSpellSlotSourceState;
}): Result.Result<CharacterSheetSpellSlotSourceState, CharacterSheetIssue> {
  const buildSlots = characterBuildSpellcastingSlotCapacity(input.build);
  const expenditureLevels = new Set<number>();
  for (const expenditure of input.spellSlotState
    .ordinarySpellSlotExpenditures) {
    /* v8 ignore start -- @preserve -- Malformed slot state: ordinary expenditure is negative/nonintegral or duplicates a spell level. */
    if (!Number.isInteger(expenditure.expended) || expenditure.expended < 0) {
      return characterSheetIssue(
        "Spell Slot state must have nonnegative integer expenditure.",
      );
    }
    if (expenditureLevels.has(expenditure.spellLevel)) {
      return characterSheetIssue(
        "Spell Slot state must not duplicate spell levels.",
      );
    }
    /* v8 ignore stop -- @preserve */
    expenditureLevels.add(expenditure.spellLevel);
    const capacity = buildSlots.find(
      (slot) => slot.spellLevel === expenditure.spellLevel,
    );
    if (capacity === undefined || expenditure.expended > capacity.count) {
      return characterSheetIssue(
        `Spell Slot state does not match build capacity for level ${expenditure.spellLevel}.`,
      );
    }
  }
  const createdSpellSlots = validateCreatedSpellSlots({
    build: input.build,
    unitLibrary: input.unitLibrary,
    createdSpellSlots: input.spellSlotState.createdSpellSlots,
  });
  /* v8 ignore start -- @preserve -- Malformed created-slot state failed correlation with the admitted Font of Magic table. */
  if (Result.isFailure(createdSpellSlots)) {
    return Result.fail(createdSpellSlots.failure);
  }
  /* v8 ignore stop -- @preserve */
  return Result.succeed({
    ordinarySpellSlotExpenditures:
      input.spellSlotState.ordinarySpellSlotExpenditures
        .filter((expenditure) => expenditure.expended > 0)
        .sort((a, b) => a.spellLevel - b.spellLevel),
    createdSpellSlots: createdSpellSlots.success,
  });
}

export function pactSlotExpenditureFromInput(
  input: Pick<CharacterSheetInput, "pactSlots"> & {
    readonly build: SpellcastingCharacterBuild;
  },
): Result.Result<
  CharacterPactSlotExpenditure | undefined,
  CharacterSheetIssue
> {
  const pactMagic = characterBuildPactSlotCapacity(input.build);
  if (pactMagic === undefined) {
    /* v8 ignore start -- @preserve -- Malformed sheet input: Pact Slot expenditure is retained by a build without Pact Magic capacity. */
    return input.pactSlots === undefined
      ? Result.succeed(undefined)
      : characterSheetIssue(
          "Pact Slot state must match Pact Magic build capacity.",
        );
    /* v8 ignore stop -- @preserve */
  }
  const pactSlots =
    input.pactSlots ??
    ({
      expended: resourceCount(0),
    } satisfies CharacterPactSlotExpenditure);
  /* v8 ignore start -- @preserve -- Malformed sheet input: Pact Slot expenditure is negative, nonintegral, or above build capacity. */
  if (
    !Number.isInteger(pactSlots.expended) ||
    pactSlots.expended < 0 ||
    pactSlots.expended > pactMagic.count
  ) {
    return characterSheetIssue(
      "Pact Slot state must match Pact Magic build capacity.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return pactSlots.expended === resourceCount(0)
    ? Result.succeed(undefined)
    : Result.succeed({
        expended: resourceCount(pactSlots.expended),
      });
}

export function characterBuildPactSlotCapacity(
  build: Pick<CharacterBuild, "spellcasting">,
): CharacterBuildPactMagicSlotPool | undefined {
  return build.spellcasting?.slotPools.pactMagic;
}

export function spendCharacterSheetSpellSlot(input: {
  readonly sheet: CharacterSheet;
  readonly spellLevel: SpellSlotLevel;
  readonly spellSlotSource:
    | CharacterSheetFontOfMagicSpellSlotSource
    | undefined;
}): Result.Result<CharacterSheet, CharacterSheetIssue> {
  /* v8 ignore start -- @preserve -- Malformed slot-spend input: the sheet has no ordinary Spell Slot state. */
  if (!isCharacterSheetWithSpellSlots(input.sheet)) {
    return characterSheetIssue(
      "Spell Slot spend requires ordinary Spell Slot state.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const spellSlotSpend = spellSlotSpendSourceState({
    sheet: input.sheet,
    spellLevel: input.spellLevel,
    spellSlotSource: input.spellSlotSource,
    issueContext: "Spell Slot spend",
  });
  return Result.isFailure(spellSlotSpend)
    ? Result.fail(spellSlotSpend.failure)
    : Result.succeed({
        ...input.sheet,
        spellSlotExpenditures:
          spellSlotSpend.success.ordinarySpellSlotExpenditures,
        createdSpellSlots: spellSlotSpend.success.createdSpellSlots,
      });
}

function fontOfMagicSpellSlotSpendForSorceryPoints(input: {
  readonly sheet: CharacterSheetWithSpellSlots;
  readonly spellLevel: SpellSlotLevel;
  readonly spellSlotSource:
    | CharacterSheetFontOfMagicSpellSlotSource
    | undefined;
}): Result.Result<CharacterSheetSpellSlotSourceState, CharacterSheetIssue> {
  return spellSlotSpendSourceState({
    ...input,
    issueContext: "Font of Magic conversion",
  });
}

function spellSlotSpendSourceState(input: {
  readonly sheet: CharacterSheetWithSpellSlots;
  readonly spellLevel: SpellSlotLevel;
  readonly spellSlotSource:
    | CharacterSheetFontOfMagicSpellSlotSource
    | undefined;
  readonly issueContext: string;
}): Result.Result<CharacterSheetSpellSlotSourceState, CharacterSheetIssue> {
  const ordinarySlot = ordinarySpellSlotStates(input.sheet).find(
    (slot) => slot.spellLevel === input.spellLevel,
  );
  const createdSlot = input.sheet.createdSpellSlots.find(
    (slot) => slot.spellLevel === input.spellLevel,
  );
  const ordinaryAvailable =
    ordinarySlot === undefined ? 0 : ordinarySlot.count - ordinarySlot.expended;
  const createdAvailable =
    createdSlot === undefined ? 0 : createdSlot.count - createdSlot.expended;
  const source = fontOfMagicSpellSlotSourceForSorceryPointConversion({
    spellSlotSource: input.spellSlotSource,
    ordinarySlot,
    ordinaryAvailable,
    createdSlot,
    createdAvailable,
    issueContext: input.issueContext,
  });
  if (Result.isFailure(source)) return Result.fail(source.failure);

  return source.success === "ordinary"
    ? Result.succeed({
        ordinarySpellSlotExpenditures: replaceOrdinarySpellSlotExpenditure({
          expenditures: input.sheet.spellSlotExpenditures,
          spellLevel: input.spellLevel,
          /* v8 ignore next -- @preserve -- Internal invariant: selecting the ordinary source above proves the ordinary slot exists at this level. */
          expended: resourceCount((ordinarySlot?.expended ?? 0) + 1),
        }),
        createdSpellSlots: input.sheet.createdSpellSlots,
      })
    : Result.succeed({
        ordinarySpellSlotExpenditures: input.sheet.spellSlotExpenditures,
        createdSpellSlots: input.sheet.createdSpellSlots.map((slot) =>
          slot.spellLevel === input.spellLevel
            ? { ...slot, expended: resourceCount(slot.expended + 1) }
            : slot,
        ),
      });
}

function fontOfMagicSpellSlotSourceForSorceryPointConversion(input: {
  readonly spellSlotSource:
    | CharacterSheetFontOfMagicSpellSlotSource
    | undefined;
  readonly ordinarySlot: CharacterSheetSpellSlotState | undefined;
  readonly ordinaryAvailable: number;
  readonly createdSlot: CharacterSheetCreatedSpellSlotState | undefined;
  readonly createdAvailable: number;
  readonly issueContext: string;
}): Result.Result<
  CharacterSheetFontOfMagicSpellSlotSource,
  CharacterSheetIssue
> {
  if (input.spellSlotSource === "ordinary") {
    return input.ordinaryAvailable > 0
      ? Result.succeed("ordinary")
      : characterSheetIssue(
          `${input.issueContext} requires an unexpended ordinary Spell Slot.`,
        );
  }
  if (input.spellSlotSource === "created") {
    /* v8 ignore start -- @preserve -- Malformed slot-spend input: created was selected but no unexpended created slot exists. */
    if (input.createdAvailable <= 0) {
      return characterSheetIssue(
        `${input.issueContext} requires an unexpended created Spell Slot.`,
      );
    }
    /* v8 ignore stop -- @preserve */
    return Result.succeed("created");
  }
  if (input.ordinaryAvailable > 0 && input.createdAvailable > 0) {
    return characterSheetIssue(
      `${input.issueContext} requires a Spell Slot source when ordinary and created Spell Slots are both available.`,
    );
  }
  if (input.ordinaryAvailable > 0) return Result.succeed("ordinary");
  if (input.createdAvailable > 0) return Result.succeed("created");
  /* v8 ignore start -- @preserve -- Malformed slot-spend input: the retained source is fully expended, or neither source exists. */
  if (input.ordinarySlot !== undefined && input.createdSlot === undefined) {
    return characterSheetIssue(
      `${input.issueContext} requires an unexpended ordinary Spell Slot.`,
    );
  }
  if (input.createdSlot !== undefined && input.ordinarySlot === undefined) {
    return characterSheetIssue(
      `${input.issueContext} requires an unexpended created Spell Slot.`,
    );
  }
  return characterSheetIssue(
    `${input.issueContext} requires an unexpended Spell Slot.`,
  );
  /* v8 ignore stop -- @preserve */
}

function combineSpellSlotStates(
  ordinarySpellSlots: readonly CharacterSheetSpellSlotState[],
  createdSpellSlots: readonly CharacterSheetCreatedSpellSlotState[],
): readonly CharacterSheetSpellSlotState[] {
  const states = new Map<number, CharacterSheetSpellSlotState>();
  for (const slot of ordinarySpellSlots) {
    states.set(slot.spellLevel, slot);
  }
  for (const createdSlot of createdSpellSlots) {
    const ordinarySlot = states.get(createdSlot.spellLevel);
    states.set(
      createdSlot.spellLevel,
      ordinarySlot === undefined
        ? createdSlot
        : {
            spellLevel: ordinarySlot.spellLevel,
            count: resourceCount(ordinarySlot.count + createdSlot.count),
            expended: resourceCount(
              ordinarySlot.expended + createdSlot.expended,
            ),
          },
    );
  }
  return [...states.values()].sort((a, b) => a.spellLevel - b.spellLevel);
}

function validateCreatedSpellSlots(input: {
  readonly build: SpellcastingCharacterBuild;
  readonly unitLibrary: UnitCatalog;
  readonly createdSpellSlots: readonly CharacterSheetCreatedSpellSlotState[];
}): Result.Result<
  readonly CharacterSheetCreatedSpellSlotState[],
  CharacterSheetIssue
> {
  if (input.createdSpellSlots.length === 0) return Result.succeed([]);
  const fontOfMagicFacts = characterBuildSorcererFontOfMagicFacts({
    build: input.build,
    unitLibrary: input.unitLibrary,
  });
  /* v8 ignore start -- @preserve -- Malformed build/catalog correlation: created-slot state cannot project Font of Magic facts. */
  if (Result.isFailure(fontOfMagicFacts)) {
    return characterSheetIssue(fontOfMagicFacts.failure.message);
  }
  /* v8 ignore stop -- @preserve */
  /* v8 ignore start -- @preserve -- Malformed created-slot state: the build lacks the admitted Font of Magic feature. */
  if (fontOfMagicFacts.success === undefined) {
    return characterSheetIssue(
      "Created Spell Slot state requires the Sorcerer Font of Magic feature.",
    );
  }
  /* v8 ignore stop -- @preserve */
  const levels = new Set<number>();
  for (const createdSlot of input.createdSpellSlots) {
    /* v8 ignore start -- @preserve -- Malformed created-slot state: a spell level is duplicated. */
    if (levels.has(createdSlot.spellLevel)) {
      return characterSheetIssue(
        "Created Spell Slot state must not duplicate spell levels.",
      );
    }
    /* v8 ignore stop -- @preserve */
    levels.add(createdSlot.spellLevel);
    const option = fontOfMagicSpellSlotCreationOption({
      facts: fontOfMagicFacts.success,
      spellLevel: createdSlot.spellLevel,
    });
    /* v8 ignore start -- @preserve -- Malformed created-slot state: a slot level is absent from or below the minimum level of the admitted creation table. */
    if (
      option === undefined ||
      fontOfMagicFacts.success.spellSlotCreation.ownerClassLevel <
        option.minimumClassLevel
    ) {
      return characterSheetIssue(
        "Created Spell Slot state must match the Font of Magic Creating Spell Slots table.",
      );
    }
    /* v8 ignore stop -- @preserve */
  }
  return Result.succeed(input.createdSpellSlots);
}

function addCreatedSpellSlot(input: {
  readonly createdSpellSlots: readonly CharacterSheetCreatedSpellSlotState[];
  readonly spellLevel: SpellSlotLevel;
}): readonly CharacterSheetCreatedSpellSlotState[] {
  const next = input.createdSpellSlots.some(
    (slot) => slot.spellLevel === input.spellLevel,
  )
    ? input.createdSpellSlots.map((slot) =>
        slot.spellLevel === input.spellLevel
          ? { ...slot, count: resourceCount(slot.count + 1) }
          : slot,
      )
    : [
        ...input.createdSpellSlots,
        {
          spellLevel: input.spellLevel,
          count: resourceCount(1),
          expended: resourceCount(0),
        },
      ];
  return [...next].sort((a, b) => a.spellLevel - b.spellLevel);
}

export function replaceOrdinarySpellSlotExpenditure(input: {
  expenditures: readonly CharacterSpellSlotExpenditure[];
  spellLevel: SpellSlotLevel;
  expended: ResourceCount;
}): readonly CharacterSpellSlotExpenditure[] {
  const withoutLevel = input.expenditures.filter(
    (candidate) => candidate.spellLevel !== input.spellLevel,
  );
  return input.expended === resourceCount(0)
    ? withoutLevel
    : [
        ...withoutLevel,
        { spellLevel: input.spellLevel, expended: input.expended },
      ].sort((a, b) => a.spellLevel - b.spellLevel);
}
