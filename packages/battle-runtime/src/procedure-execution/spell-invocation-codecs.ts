import { Schema } from "effect";

export const ClassCantripSpellAccessSchema = Schema.Struct({
  tag: Schema.Literal("classCantrip"),
});

export const SpellAccessCantripSpellAccessSchema = Schema.Struct({
  tag: Schema.Literal("spellAccessCantrip"),
});

export const CantripSpellAccessSchema = Schema.Union([
  ClassCantripSpellAccessSchema,
  SpellAccessCantripSpellAccessSchema,
]);

export const NoSpellInvocationResourceSchema = Schema.Struct({
  tag: Schema.Literal("none"),
});
