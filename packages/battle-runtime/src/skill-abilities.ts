import type { Ability, Skill } from "@dnd/surface/surface/types";
import { Match } from "effect";

/**
 * The ability each skill's checks use: the Skills table's "Ability" column
 * (SRD 5.2.1 Playing the Game, "Skills").
 */
export const SKILL_ABILITIES = {
  acrobatics: "dex",
  animal_handling: "wis",
  arcana: "int",
  athletics: "str",
  deception: "cha",
  history: "int",
  insight: "wis",
  intimidation: "cha",
  investigation: "int",
  medicine: "wis",
  nature: "int",
  perception: "wis",
  performance: "cha",
  persuasion: "cha",
  religion: "int",
  sleight_of_hand: "dex",
  stealth: "dex",
  survival: "wis",
} as const satisfies Record<Skill, Ability>;

/** An ability's name as rules text writes it. */
export function abilityPresentationName(ability: Ability): string {
  return Match.value(ability).pipe(
    Match.when("str", () => "Strength"),
    Match.when("dex", () => "Dexterity"),
    Match.when("con", () => "Constitution"),
    Match.when("int", () => "Intelligence"),
    Match.when("wis", () => "Wisdom"),
    Match.when("cha", () => "Charisma"),
    Match.exhaustive,
  );
}
