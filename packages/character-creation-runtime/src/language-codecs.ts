import { Either } from "effect";
import { LANGUAGES, type Language } from "@dnd/shared/game-facts";

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

function surfaceLanguageId(language: Language): string {
  return language.toLowerCase().replaceAll("'", "").replaceAll(" ", "_");
}
