# SRD Stat Block Procedure Boundary Research

This is bounded pre-research for issue #340. The local SRD corpus remains the
rules authority; this note records the source facts that the authored Surface
boundary must retain. It does not claim runtime support or catalog completion.

## Local RAW anchors

The stat-block overview says that Actions, Bonus Actions, Reactions, and
Legendary Actions are separate sections, and that each section is optional:

- [`Monsters/Overview.md:3-21`](../../.references/srd-5.2.1/Monsters/Overview.md)
  defines the Stat Block sections and says that Actions, Bonus Actions,
  Reactions, and Legendary Actions are listed when present.
- [`Monsters/Overview.md:205-231`](../../.references/srd-5.2.1/Monsters/Overview.md)
  defines action entries, attack notation, saving-throw notation, and
  Multiattack. Multiattack is an entry in the Actions section, not a second
  PC-style Extra Attack feature.
- [`Monsters/Overview.md:233-241`](../../.references/srd-5.2.1/Monsters/Overview.md)
  requires monster Spellcasting to retain the spell list, spellcasting
  ability, spell save DC when applicable, spell attack bonus when applicable,
  component exceptions, and any special casting-time rule.
- [`Monsters/Overview.md:243-265`](../../.references/srd-5.2.1/Monsters/Overview.md)
  defines Bonus Action and Reaction sections plus the X/Day, Recharge, and
  Recharge-after-a-Short-or-Long-Rest resource forms.
- [`Rules-Glossary.md:814-816`](../../.references/srd-5.2.1/Rules-Glossary.md)
  defines the Reaction trigger and once-per-turn resource reset.
- [`Monsters/Overview.md:251-255`](../../.references/srd-5.2.1/Monsters/Overview.md)
  defines Legendary Action timing, one-at-a-time use, the limited use pool,
  and restoration at the start of the monster's turn.

The source examples show why a shape-grouped object is insufficient. For
example, the Cloud Giant's Actions section is ordered Multiattack, Thunderous
Mace, Thundercloud, Spellcasting, while the Adult Copper Dragon's section is
ordered Multiattack, Rend, Acid Breath, Slowing Breath, Spellcasting:

- [`Monsters-C-D.md:246-261`](../../.references/srd-5.2.1/Monsters/Monsters-C-D.md)
- [`Monsters-C-D.md:402-417`](../../.references/srd-5.2.1/Monsters/Monsters-C-D.md)

The source also contains Multiattack dispatches that name other entries and
mix attacks, saves, and Spellcasting (for example [`Monsters-A-B.md:753-762`](../../.references/srd-5.2.1/Monsters/Monsters-A-B.md)).
That relation needs a typed procedure reference/ordinal rather than a runtime
branch on an authored name. The name remains display/source identity at the
authored and presentation boundaries.

## Spellcasting retention

The monster spellcasting sections use canonical spell names as references,
not inline copies of spell rules. The authored representation should therefore
carry a typed `spellId`/spell-reference relation and source-owned casting
facts, such as:

- spellcasting ability;
- optional spell save DC and spell attack bonus;
- component exceptions;
- ordered spell groups such as At Will, X/Day, and X/Day Each;
- an optional source-stated cast level or source-specific restriction when the
  rule actually changes the monster's casting, without embedding the Spell
  record's mechanics.

The distinction between `X/Day` and `X/Day Each` is resource ownership: the
former is a shared group allowance, while the latter gives each listed spell
its own allowance. The source examples include both forms (for example,
[`Monsters-C-D.md:600-605`](../../.references/srd-5.2.1/Monsters/Monsters-C-D.md)
and [`Monsters-C-D.md:750-754`](../../.references/srd-5.2.1/Monsters/Monsters-C-D.md)).
An At Will group has no expendable pool. These are authored resource facts;
runtime may project them into its own pool state later.

## Survey observations

A bounded line survey of the six local `Monsters-*.md` files found 238 Actions
section occurrences, 66 Bonus Actions section occurrences, 23 Reactions section
occurrences, and 30 Legendary Actions section occurrences. It found 49
Spellcasting entries, including one recharge-gated variant (`Hellfire
Spellcasting`) and groups with At Will, X/Day, and X/Day Each limits. These are
survey counts, not the standalone identity denominator owned by issue #338.

The current Surface `CreatureActionsSchema` groups entries into `attacks`,
`multiattacks`, `saves`, `supports`, `actionOptions`, and `specials`. The
current tracer and battle admission walk those groups in a fixed category
order. That preserves order only within each category and can therefore
change the source order or hide an unsupported entry when admission projects
only supported categories.

## Proposed authored contract for #340

The #339 standalone Stat Block root should own four optional, non-empty
procedure sections. Each section should be one ordered array of an explicit
union:

```ts
type AuthoredProcedureEntry =
  | {
      readonly kind: "executable";
      readonly procedureOrdinal: PositiveInteger;
      readonly procedure: AuthoredProcedure;
      readonly resourceRefs:
        | { readonly kind: "none" }
        | {
            readonly kind: "some";
            readonly ordinals: readonly ResourceOrdinal[];
          };
    }
  | {
      readonly kind: "textOnly";
      readonly procedureOrdinal: PositiveInteger;
      readonly name: AuthoredName;
      readonly description: ExactRulesProse;
      readonly reason: TextOnlyReason;
      readonly resourceRefs:
        | { readonly kind: "none" }
        | {
            readonly kind: "some";
            readonly ordinals: readonly ResourceOrdinal[];
          };
    };
```

The exact exported names belong to the owning schema after #339 lands. The
important invariants are:

1. the array order is the source order and the ordinal is an explicit,
   validated reference key for Multiattack dispatches;
2. text-only entries retain their name and exact source description and carry a
   closed domain reason (for example, unparsed prose, unsupported procedure
   family, or required table adjudication), never a vague `unsupported` flag;
3. admission returns every authored entry's parsed support outcome, rather
   than filtering unsupported entries out;
4. spellcasting entries reference canonical authored Spell records and never
   embed copied Spell mechanics; and
5. runtime readers dispatch from parsed procedure shape and support facts, not
   Stat Block ids, names, slugs, or provenance.

An explicit ordinal is justified only as a source-authored reference key. The
schema must reject duplicate or non-monotonic ordinals, and the focused tests
must cover a Multiattack dispatch to an ordinary executable entry, a dispatch
to an unsupported/text-only entry, and a repeated authored display name whose
ordinals remain distinct. This is an audit point for connascence: changing
source order must change the ordinal/reference validation together, while
renaming an entry must not change runtime procedure selection.

## Migration dependency

The installed records currently use the grouped `CreatureActionsSchema` shape.
Requiring the new ordered union directly at the Stat Block root makes those
records invalid until #341 rewrites their Dhall sources and generated JSON.
Accepting both shapes would create a parallel legacy language and would let
the admission boundary silently omit unsupported entries. Therefore #340
should land its authored union and synthetic evidence after #339's standalone
root seam, and #341 should perform the explicit 21-record migration rather
than #340 adding a compatibility default.
