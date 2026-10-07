import { Schema } from "effect";
import { SpellSlotLevel } from "@dnd/shared/types";
import {
  BattleResourcePoolExecutionRef,
  StatBlockSpellInvocationRefSchema,
} from "../identity.ts";
export const StatBlockCantripSpellAccessSchema = Schema.Struct({
  tag: Schema.Literal("statBlockCantrip"),
  invocationRef: StatBlockSpellInvocationRefSchema,
});
export const StatBlockLeveledSpellAccessSchema = Schema.Struct({
  tag: Schema.Literal("statBlockLeveled"),
  invocationRef: StatBlockSpellInvocationRefSchema,
});
export const StatBlockLeveledSpellInvocationResourceSchema = Schema.Union([
  Schema.Struct({
    tag: Schema.Literal("statBlockAtWill"),
    castLevel: SpellSlotLevel,
  }),
  Schema.Struct({
    tag: Schema.Literal("statBlockLimited"),
    castLevel: SpellSlotLevel,
    resourcePoolRef: BattleResourcePoolExecutionRef,
  }),
]);

export const StatBlockCantripSpellInvocationResourceSchema = Schema.Union([
  Schema.Struct({
    tag: Schema.Literal("statBlockAtWill"),
    castLevel: Schema.Literal(0),
  }),
  Schema.Struct({
    tag: Schema.Literal("statBlockLimited"),
    castLevel: Schema.Literal(0),
    resourcePoolRef: BattleResourcePoolExecutionRef,
  }),
]);
export const ClassCantripSpellAccessSchema = Schema.Struct({
  tag: Schema.Literal("classCantrip"),
});

export const SpellAccessCantripSpellAccessSchema = Schema.Struct({
  tag: Schema.Literal("spellAccessCantrip"),
});

export const CantripSpellAccessSchema = Schema.Union([
  StatBlockCantripSpellAccessSchema,
  ClassCantripSpellAccessSchema,
  SpellAccessCantripSpellAccessSchema,
]);

export const NoSpellInvocationResourceSchema = Schema.Union([
  Schema.Struct({ tag: Schema.Literal("none") }),
  StatBlockCantripSpellInvocationResourceSchema,
]);
