import { Either } from "effect";
import { LANGUAGES, type Language } from "@dnd/shared/game-facts";
import {
  creationChoiceOptionId,
  type CreationChoiceOption,
  type CreationChoiceOptionId,
} from "./types.ts";

const LANGUAGE_BY_SURFACE_LANGUAGE_ID: Readonly<
  Partial<Record<string, Language>>
> = Object.fromEntries(
  LANGUAGES.map((language) => [surfaceLanguageId(language), language]),
);

export type SurfaceLanguageIdIssue = {
  readonly tag: "unsupportedSurfaceLanguageId";
  readonly value: string;
};

export function languageFromSurfaceLanguageId(
  value: string,
): Either.Either<Language, SurfaceLanguageIdIssue> {
  const language = LANGUAGE_BY_SURFACE_LANGUAGE_ID[value];
  return language === undefined
    ? Either.left({ tag: "unsupportedSurfaceLanguageId", value })
    : Either.right(language);
}

export type LanguageChoiceOptionIdIssue = {
  readonly tag: "unsupportedLanguageChoiceOptionId";
  readonly value: CreationChoiceOptionId;
};

export function languageFromCreationChoiceOptionId(
  value: CreationChoiceOptionId,
): Either.Either<Language, LanguageChoiceOptionIdIssue> {
  const language = LANGUAGES.find((candidate) => candidate === value);
  return language === undefined
    ? Either.left({ tag: "unsupportedLanguageChoiceOptionId", value })
    : Either.right(language);
}

export function characterCreationLanguageTableOptions(input: {
  readonly knownLanguages: ReadonlySet<Language>;
}): readonly CreationChoiceOption[] {
  return LANGUAGES.filter((language) => !input.knownLanguages.has(language)).map(
    (language) => ({
      optionId: creationChoiceOptionId(language),
      label: language,
    }),
  );
}

function surfaceLanguageId(language: Language): string {
  return language.toLowerCase().replaceAll("'", "").replaceAll(" ", "_");
}
