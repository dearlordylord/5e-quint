// KERNEL-COVERAGE: runtime-owner SHEET.SPELL_SLOTS_PACT_SLOTS.TRANSITIONS
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.font-of-magic-slot-to-sorcery-points
// UNIT-PROFILE-COVERAGE: runtime-owner character-sheet.font-of-magic-sorcery-points-to-spell-slot
import {
  characterBuildSorcererFontOfMagicFacts,
  characterBuildSpellcastingSlotCapacity,
  fontOfMagicSpellSlotCreationOption,
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
import { Either } from "effect";

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
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (!isCharacterSheetWithSpellSlots(input.sheet)) {
    return characterSheetIssue(
      "Spell Slot source state requires ordinary Spell Slot state.",
    );
  }
  const spellSlotState = validateSpellSlotSourceState({
    build: input.sheet.build,
    unitLibrary: input.unitLibrary,
    spellSlotState: input.spellSlotState,
  });
  if (Either.isLeft(spellSlotState)) {
    return Either.left(spellSlotState.left);
  }
  return Either.right({
    ...input.sheet,
    spellSlotExpenditures: spellSlotState.right.ordinarySpellSlotExpenditures,
    createdSpellSlots: spellSlotState.right.createdSpellSlots,
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
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  const fontOfMagicFacts = characterBuildSorcererFontOfMagicFacts({
    build: input.sheet.build,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(fontOfMagicFacts)) {
    return characterSheetIssue(fontOfMagicFacts.left.message);
  }
  if (fontOfMagicFacts.right === undefined) {
    return characterSheetIssue(
      "Font of Magic conversion requires the Sorcerer Font of Magic feature.",
    );
  }
  const fontOfMagic = fontOfMagicFacts.right;
  if (!isCharacterSheetWithSpellSlots(input.sheet)) {
    return characterSheetIssue(
      "Font of Magic conversion requires ordinary Spell Slot state.",
    );
  }

  const spellSlotSpend = fontOfMagicSpellSlotSpendForSorceryPoints({
    sheet: input.sheet,
    spellLevel: input.spellLevel,
    spellSlotSource: input.spellSlotSource,
  });
  if (Either.isLeft(spellSlotSpend)) return Either.left(spellSlotSpend.left);

  const resources = characterSheetResources(input.sheet, input.unitLibrary);
  if (Either.isLeft(resources)) return Either.left(resources.left);
  const sorceryPoints = resources.right.find(
    (resource): resource is CharacterSheetSorceryPointPoolResourceState =>
      resource.tag === "pointPoolResource" &&
      resource.unitId === fontOfMagic.unitId,
  );
  if (sorceryPoints === undefined) {
    return characterSheetIssue(
      "Font of Magic conversion requires the shared Sorcery Point resource.",
    );
  }

  const pointGain = resourceCount(input.spellLevel);
  if (sorceryPoints.expended < pointGain) {
    return characterSheetIssue(
      "Font of Magic conversion would exceed the Sorcery Point maximum.",
    );
  }

  return Either.right({
    ...input.sheet,
    spellSlotExpenditures: spellSlotSpend.right.ordinarySpellSlotExpenditures,
    createdSpellSlots: spellSlotSpend.right.createdSpellSlots,
    resourceExpenditures: replacePointPoolResourceExpenditure({
      expenditures: input.sheet.resourceExpenditures,
      unitId: sorceryPoints.unitId,
      expended: resourceCount(sorceryPoints.expended - pointGain),
    }),
  });
}

export function convertFontOfMagicSorceryPointsToSpellSlot(
  input: CharacterSheetFontOfMagicSorceryPointsToSpellSlotInput,
): Either.Either<CharacterSheet, CharacterSheetIssue> {
  const fontOfMagicFacts = characterBuildSorcererFontOfMagicFacts({
    build: input.sheet.build,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(fontOfMagicFacts)) {
    return characterSheetIssue(fontOfMagicFacts.left.message);
  }
  if (fontOfMagicFacts.right === undefined) {
    return characterSheetIssue(
      "Font of Magic Spell Slot creation requires the Sorcerer Font of Magic feature.",
    );
  }
  const fontOfMagic = fontOfMagicFacts.right;
  if (!isCharacterSheetWithSpellSlots(input.sheet)) {
    return characterSheetIssue(
      "Font of Magic Spell Slot creation requires ordinary Spell Slot state.",
    );
  }

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

  const resources = characterSheetResources(input.sheet, input.unitLibrary);
  if (Either.isLeft(resources)) return Either.left(resources.left);
  const sorceryPoints = resources.right.find(
    (resource): resource is CharacterSheetSorceryPointPoolResourceState =>
      resource.tag === "pointPoolResource" &&
      resource.unitId === fontOfMagic.unitId,
  );
  if (sorceryPoints === undefined) {
    return characterSheetIssue(
      "Font of Magic Spell Slot creation requires the shared Sorcery Point resource.",
    );
  }
  const availableSorceryPoints = sorceryPoints.count - sorceryPoints.expended;
  if (availableSorceryPoints < option.pointCost) {
    return characterSheetIssue(
      "Font of Magic Spell Slot creation requires enough unexpended Sorcery Points.",
    );
  }

  return Either.right({
    ...input.sheet,
    createdSpellSlots: addCreatedSpellSlot({
      createdSpellSlots: input.sheet.createdSpellSlots,
      spellLevel: input.spellLevel,
    }),
    resourceExpenditures: replacePointPoolResourceExpenditure({
      expenditures: input.sheet.resourceExpenditures,
      unitId: sorceryPoints.unitId,
      expended: resourceCount(sorceryPoints.expended + option.pointCost),
    }),
  });
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
): Either.Either<CharacterSheetSpellSlotSourceState, CharacterSheetIssue> {
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
}): Either.Either<CharacterSheetSpellSlotSourceState, CharacterSheetIssue> {
  const buildSlots = characterBuildSpellcastingSlotCapacity(input.build);
  const expenditureLevels = new Set<number>();
  for (const expenditure of input.spellSlotState
    .ordinarySpellSlotExpenditures) {
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
  if (Either.isLeft(createdSpellSlots)) {
    return Either.left(createdSpellSlots.left);
  }
  return Either.right({
    ordinarySpellSlotExpenditures:
      input.spellSlotState.ordinarySpellSlotExpenditures
        .filter((expenditure) => expenditure.expended > 0)
        .sort((a, b) => a.spellLevel - b.spellLevel),
    createdSpellSlots: createdSpellSlots.right,
  });
}

export function pactSlotExpenditureFromInput(
  input: Pick<CharacterSheetInput, "pactSlots"> & {
    readonly build: SpellcastingCharacterBuild;
  },
): Either.Either<
  CharacterPactSlotExpenditure | undefined,
  CharacterSheetIssue
> {
  const pactMagic = characterBuildPactSlotCapacity(input.build);
  if (pactMagic === undefined) {
    return input.pactSlots === undefined
      ? Either.right(undefined)
      : characterSheetIssue(
          "Pact Slot state must match Pact Magic build capacity.",
        );
  }
  const pactSlots =
    input.pactSlots ??
    ({
      expended: resourceCount(0),
    } satisfies CharacterPactSlotExpenditure);
  if (
    !Number.isInteger(pactSlots.expended) ||
    pactSlots.expended < 0 ||
    pactSlots.expended > pactMagic.count
  ) {
    return characterSheetIssue(
      "Pact Slot state must match Pact Magic build capacity.",
    );
  }
  return pactSlots.expended === resourceCount(0)
    ? Either.right(undefined)
    : Either.right({
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
}): Either.Either<CharacterSheet, CharacterSheetIssue> {
  if (!isCharacterSheetWithSpellSlots(input.sheet)) {
    return characterSheetIssue(
      "Spell Slot spend requires ordinary Spell Slot state.",
    );
  }
  const spellSlotSpend = spellSlotSpendSourceState({
    sheet: input.sheet,
    spellLevel: input.spellLevel,
    spellSlotSource: input.spellSlotSource,
    issueContext: "Spell Slot spend",
  });
  return Either.isLeft(spellSlotSpend)
    ? Either.left(spellSlotSpend.left)
    : Either.right({
        ...input.sheet,
        spellSlotExpenditures:
          spellSlotSpend.right.ordinarySpellSlotExpenditures,
        createdSpellSlots: spellSlotSpend.right.createdSpellSlots,
      });
}

function fontOfMagicSpellSlotSpendForSorceryPoints(input: {
  readonly sheet: CharacterSheetWithSpellSlots;
  readonly spellLevel: SpellSlotLevel;
  readonly spellSlotSource:
    | CharacterSheetFontOfMagicSpellSlotSource
    | undefined;
}): Either.Either<CharacterSheetSpellSlotSourceState, CharacterSheetIssue> {
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
}): Either.Either<CharacterSheetSpellSlotSourceState, CharacterSheetIssue> {
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
  if (Either.isLeft(source)) return Either.left(source.left);

  return source.right === "ordinary"
    ? Either.right({
        ordinarySpellSlotExpenditures: replaceOrdinarySpellSlotExpenditure({
          expenditures: input.sheet.spellSlotExpenditures,
          spellLevel: input.spellLevel,
          expended: resourceCount((ordinarySlot?.expended ?? 0) + 1),
        }),
        createdSpellSlots: input.sheet.createdSpellSlots,
      })
    : Either.right({
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
}): Either.Either<
  CharacterSheetFontOfMagicSpellSlotSource,
  CharacterSheetIssue
> {
  if (input.spellSlotSource === "ordinary") {
    return input.ordinaryAvailable > 0
      ? Either.right("ordinary")
      : characterSheetIssue(
          `${input.issueContext} requires an unexpended ordinary Spell Slot.`,
        );
  }
  if (input.spellSlotSource === "created") {
    return input.createdAvailable > 0
      ? Either.right("created")
      : characterSheetIssue(
          `${input.issueContext} requires an unexpended created Spell Slot.`,
        );
  }
  if (input.ordinaryAvailable > 0 && input.createdAvailable > 0) {
    return characterSheetIssue(
      `${input.issueContext} requires a Spell Slot source when ordinary and created Spell Slots are both available.`,
    );
  }
  if (input.ordinaryAvailable > 0) return Either.right("ordinary");
  if (input.createdAvailable > 0) return Either.right("created");
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
}): Either.Either<
  readonly CharacterSheetCreatedSpellSlotState[],
  CharacterSheetIssue
> {
  if (input.createdSpellSlots.length === 0) return Either.right([]);
  const fontOfMagicFacts = characterBuildSorcererFontOfMagicFacts({
    build: input.build,
    unitLibrary: input.unitLibrary,
  });
  if (Either.isLeft(fontOfMagicFacts)) {
    return characterSheetIssue(fontOfMagicFacts.left.message);
  }
  if (fontOfMagicFacts.right === undefined) {
    return characterSheetIssue(
      "Created Spell Slot state requires the Sorcerer Font of Magic feature.",
    );
  }
  const levels = new Set<number>();
  for (const createdSlot of input.createdSpellSlots) {
    if (levels.has(createdSlot.spellLevel)) {
      return characterSheetIssue(
        "Created Spell Slot state must not duplicate spell levels.",
      );
    }
    levels.add(createdSlot.spellLevel);
    const option = fontOfMagicSpellSlotCreationOption({
      facts: fontOfMagicFacts.right,
      spellLevel: createdSlot.spellLevel,
    });
    if (
      option === undefined ||
      fontOfMagicFacts.right.spellSlotCreation.ownerClassLevel <
        option.minimumClassLevel
    ) {
      return characterSheetIssue(
        "Created Spell Slot state must match the Font of Magic Creating Spell Slots table.",
      );
    }
  }
  return Either.right(input.createdSpellSlots);
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
