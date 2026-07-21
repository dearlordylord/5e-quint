import { Schema } from "effect";

export const ClassCantripSpellAccessSchema = Schema.Struct({
  tag: Schema.Literal("classCantrip"),
});

export const NoSpellInvocationResourceSchema = Schema.Struct({
  tag: Schema.Literal("none"),
});
