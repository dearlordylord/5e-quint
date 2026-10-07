import type {
  SpellAccess,
  SpellInvocationResource,
  CantripSpellAccess,
  CantripSpellInvocationResource,
  LeveledSpellAccess,
  LeveledSpellInvocationResource,
} from "./spell-invocation-vocabulary.ts";
import { Schema } from "effect";
import { SpellLevelSchema } from "@dnd/surface/surface/schema";
import {
  ArmorOfShadowsSpellAccessSchema,
  CharacterPreparedSpellAccessSchema,
  SpellAccessFreeCastInvocationResourceSchema,
  SpellEffectSpellAccessSchema,
  SpellSlotInvocationResourceSchema,
} from "../battle-reducer/codec-building-blocks.ts";
import {
  ClassCantripSpellAccessSchema,
  SpellAccessCantripSpellAccessSchema,
  StatBlockCantripSpellAccessSchema,
  StatBlockLeveledSpellAccessSchema,
  StatBlockCantripSpellInvocationResourceSchema,
  StatBlockLeveledSpellInvocationResourceSchema,
  NoSpellInvocationResourceSchema,
} from "./spell-invocation-codecs.ts";
import {
  SpellCastingSourceSchema,
  StatBlockSpellCastingSourceSchema,
  ClassSpellCastingSourceSchema,
  AccessSpellCastingSourceSchema,
  SpellDefinitionRuleFactsSchema,
} from "./spell-rule-facts.ts";

type LeveledDefinitionLevel = Exclude<typeof SpellLevelSchema.Type, 0>;
const LeveledDefinitionLevelSchema = Schema.refine<
  typeof SpellLevelSchema,
  LeveledDefinitionLevel
>((level): level is LeveledDefinitionLevel => level !== 0)(SpellLevelSchema);

const CharacterCastingSourceSchema = Schema.Union([
  ClassSpellCastingSourceSchema,
  AccessSpellCastingSourceSchema,
]);
const CharacterSpellRuleFactsSchema = Schema.Struct({
  ...SpellDefinitionRuleFactsSchema.fields,
  castingSource: CharacterCastingSourceSchema,
});
const StatBlockSpellRuleFactsSchema = Schema.Struct({
  ...SpellDefinitionRuleFactsSchema.fields,
  castingSource: StatBlockSpellCastingSourceSchema,
});
const NoResourceSchema = NoSpellInvocationResourceSchema;
const CharacterPreparedAccessSchema = CharacterPreparedSpellAccessSchema;

/** Initial casts carry source, access and resource as one admitted fact. */
export const SpellInvocationCastingFactsSchema = Schema.Union([
  Schema.Struct({
    spellRuleFacts: Schema.Struct({
      ...CharacterSpellRuleFactsSchema.fields,
      level: Schema.Literal(0),
      castingSource: ClassSpellCastingSourceSchema,
    }),
    access: ClassCantripSpellAccessSchema,
    resource: NoResourceSchema,
  }),
  Schema.Struct({
    spellRuleFacts: Schema.Struct({
      ...CharacterSpellRuleFactsSchema.fields,
      level: Schema.Literal(0),
      castingSource: AccessSpellCastingSourceSchema,
    }),
    access: SpellAccessCantripSpellAccessSchema,
    resource: NoResourceSchema,
  }),
  Schema.Struct({
    spellRuleFacts: Schema.Struct({
      ...CharacterSpellRuleFactsSchema.fields,
      level: LeveledDefinitionLevelSchema,
    }),
    access: CharacterPreparedAccessSchema,
    resource: SpellSlotInvocationResourceSchema,
  }),
  Schema.Struct({
    spellRuleFacts: Schema.Struct({
      ...CharacterSpellRuleFactsSchema.fields,
      level: LeveledDefinitionLevelSchema,
    }),
    access: CharacterPreparedAccessSchema,
    resource: SpellAccessFreeCastInvocationResourceSchema,
  }),
  Schema.Struct({
    spellRuleFacts: CharacterSpellRuleFactsSchema,
    access: ArmorOfShadowsSpellAccessSchema,
    resource: NoResourceSchema,
  }),
  Schema.Struct({
    spellRuleFacts: Schema.Struct({
      ...StatBlockSpellRuleFactsSchema.fields,
      level: Schema.Literal(0),
    }),
    access: StatBlockCantripSpellAccessSchema,
    resource: StatBlockCantripSpellInvocationResourceSchema,
  }),
  Schema.Struct({
    spellRuleFacts: Schema.Struct({
      ...StatBlockSpellRuleFactsSchema.fields,
      level: LeveledDefinitionLevelSchema,
    }),
    access: StatBlockLeveledSpellAccessSchema,
    resource: StatBlockLeveledSpellInvocationResourceSchema,
  }),
  Schema.Struct({
    spellRuleFacts: Schema.Struct({
      ...SpellDefinitionRuleFactsSchema.fields,
      castingSource: SpellCastingSourceSchema,
    }),
    access: SpellEffectSpellAccessSchema,
    resource: NoResourceSchema,
  }),
]);
export type SpellInvocationCastingFacts =
  typeof SpellInvocationCastingFactsSchema.Type;

type AuthoredCastingFacts<
  Spell,
  Facts extends SpellInvocationCastingFacts,
> = Facts extends SpellInvocationCastingFacts
  ? {
      readonly spell: Spell & {
        readonly castingSource: Facts["spellRuleFacts"]["castingSource"];
        readonly spellDefinitionRuleFacts: {
          readonly level: Facts["spellRuleFacts"]["level"];
        };
      };
      readonly access: Facts["access"];
      readonly resource: Facts["resource"];
    }
  : never;
export type AuthoredSpellInvocationCastingFacts<Spell> = AuthoredCastingFacts<
  Spell,
  SpellInvocationCastingFacts
>;

const hasCastingFactsShape = Schema.is(SpellInvocationCastingFactsSchema);
function resourceSupportsDefinitionLevel(
  value: SpellInvocationCastingFacts,
): boolean {
  const resource = value.resource;
  if (
    resource.tag === "spellSlot" &&
    resource.slotLevel < value.spellRuleFacts.level
  )
    return false;
  return !(
    "castLevel" in resource && resource.castLevel < value.spellRuleFacts.level
  );
}
/** Preserve the canonical invocation across nested source and access facts. */
export function isSpellInvocationCastingFacts(
  value: unknown,
): value is SpellInvocationCastingFacts {
  if (!hasCastingFactsShape(value)) return false;
  if (!resourceSupportsDefinitionLevel(value)) return false;
  return castingAccessMatchesSource(value);
}

function isInitialStatBlockCastingFacts(
  value: SpellInvocationCastingFacts,
): value is Extract<
  SpellInvocationCastingFacts,
  {
    readonly access: { readonly tag: "statBlockCantrip" | "statBlockLeveled" };
  }
> {
  return (
    value.spellRuleFacts.castingSource.tag === "statBlock" &&
    value.access.tag !== "spellEffect"
  );
}

function castingAccessMatchesSource(
  value: SpellInvocationCastingFacts,
): boolean {
  if (!isInitialStatBlockCastingFacts(value)) return true;
  const source = value.spellRuleFacts.castingSource;
  const accessRef = value.access.invocationRef;
  const sourceRef = source.invocationRef;
  return (
    accessRef.procedureRef === sourceRef.procedureRef &&
    accessRef.groupOrdinal === sourceRef.groupOrdinal &&
    accessRef.invocationOrdinal === sourceRef.invocationOrdinal
  );
}

/** Effect procedures without cast facts retain their separate owner contract. */
export type SpellProcedureCastingFacts =
  | SpellInvocationCastingFacts
  | {
      readonly spellRuleFacts?: never;
      readonly access?: never;
      readonly resource?: never;
    };
const NoCastingFactsSchema = Schema.Struct({
  spellRuleFacts: Schema.optionalKey(Schema.Never),
  access: Schema.optionalKey(Schema.Never),
  resource: Schema.optionalKey(Schema.Never),
});
const hasNoCastingFacts = Schema.is(NoCastingFactsSchema);
export function isSpellProcedureCastingFacts(
  value: unknown,
): value is SpellProcedureCastingFacts {
  return isSpellInvocationCastingFacts(value) || hasNoCastingFacts(value);
}

type AuthoredCastingSourceFacts = {
  readonly castingSource: import("./spell-rule-facts.ts").SpellCastingSource;
  readonly spellDefinitionRuleFacts: import("./spell-rule-facts.ts").SpellDefinitionRuleFacts;
};
export type AuthoredCantripCastingFacts<S> = Extract<
  AuthoredSpellInvocationCastingFacts<S>,
  {
    readonly access: {
      readonly tag: "classCantrip" | "spellAccessCantrip" | "statBlockCantrip";
    };
  }
>;
export function admittedSpellInvocationCastingFacts<
  S extends AuthoredCastingSourceFacts,
>(candidate: {
  readonly spell: S;
  readonly access: SpellAccess;
  readonly resource: SpellInvocationResource;
}): candidate is typeof candidate & AuthoredSpellInvocationCastingFacts<S> {
  return isSpellInvocationCastingFacts({
    spellRuleFacts: {
      ...candidate.spell.spellDefinitionRuleFacts,
      castingSource: candidate.spell.castingSource,
    },
    access: candidate.access,
    resource: candidate.resource,
  });
}
export function admittedCantripCastingFacts<
  S extends AuthoredCastingSourceFacts,
>(candidate: {
  readonly spell: S;
  readonly access: CantripSpellAccess;
  readonly resource: CantripSpellInvocationResource;
}): candidate is typeof candidate & AuthoredCantripCastingFacts<S> {
  return isSpellInvocationCastingFacts({
    spellRuleFacts: {
      ...candidate.spell.spellDefinitionRuleFacts,
      castingSource: candidate.spell.castingSource,
    },
    access: candidate.access,
    resource: candidate.resource,
  });
}
export function admittedLeveledCastingFacts<
  S extends AuthoredCastingSourceFacts,
>(candidate: {
  readonly spell: S;
  readonly access: LeveledSpellAccess;
  readonly resource: LeveledSpellInvocationResource;
}): candidate is typeof candidate & AuthoredLeveledCastingFacts<S> {
  return isSpellInvocationCastingFacts({
    spellRuleFacts: {
      ...candidate.spell.spellDefinitionRuleFacts,
      castingSource: candidate.spell.castingSource,
    },
    access: candidate.access,
    resource: candidate.resource,
  });
}
export type AuthoredLeveledCastingFacts<S> = Extract<
  AuthoredSpellInvocationCastingFacts<S>,
  { readonly access: { readonly tag: "prepared" | "statBlockLeveled" } }
>;

export type CantripSpellInvocationScalingFacts<S> =
  | (Extract<
      AuthoredCantripCastingFacts<S>,
      { readonly access: { readonly tag: "statBlockCantrip" } }
    > & { readonly cantripScaling: { readonly kind: "noCharacterLevel" } })
  | (Exclude<
      AuthoredCantripCastingFacts<S>,
      { readonly access: { readonly tag: "statBlockCantrip" } }
    > & {
      readonly cantripScaling: {
        readonly kind: "characterLevel";
        readonly level: import("@dnd/shared/types").CharacterLevel;
      };
    });

export type SpellDamageCastingFacts<S> =
  | (CantripSpellInvocationScalingFacts<S> & { readonly slotLevel?: never })
  | (AuthoredLeveledCastingFacts<S> & {
      readonly slotLevel: import("@dnd/shared/types").SpellSlotLevel;
      readonly cantripScaling?: never;
    });
