# Spell Procedure Profiles

Engine implementation note for the battle-runtime package. Not domain
vocabulary — see `UBIQUITOUS_LANGUAGE.md` for the D&D 5e terms (Spell
Definition, Spell Access, Spell Invocation, Spell Effect).

## What a Spell Procedure Profile is

A **Spell Procedure Profile** is one class of spell behavior the battle
runtime knows how to handle end-to-end. Each profile declares:

- **admit** — inspect a Spell Definition for a given actor context, return
  the list of Spell Invocations that profile contributes (or `[]` if the
  definition does not fit the profile's shape).
- **discoverCastAct** — build the discoverable cast act and its initial
  holes for one Spell Invocation.
- **castSummary** — short human-readable label for a cast act.
- **invocationRef** — reference projection used to address the invocation
  across snapshots and continuations.
- **resolve** — dispatcher entry: consume a fill set, produce a resolution
  result.
- Static classification metadata: metamagic compatibility, whether the
  invocation is target-list-shaped, whether it admits a Readied Spell, and
  the spell-id allow-list for known-willing targets.

A profile is an engine seam, not an SRD concept:

- Multiple unrelated SRD spells share one profile. Bless, Bane, Guidance,
  Resistance and Shield of Faith all use `rollModifier`.
- One SRD spell can be split across profiles. A spell with both an
  action-time effect and a reaction window may have its parts handled by
  different profiles.

## Why the registry exists

Before this directory, each profile was scattered across ~11 modules:
predicates in `spells-profiles-support.ts`, resolvers in
`spells-resolve-support-effects.ts`, applyEffect functions in
`spells-active-effects.ts`, codec branches in `battle-codecs.ts`,
discovery branches in `spells-discovery.ts`, classification membership in
`spells-invocation-guards.ts`, metamagic flags in `metamagic.ts`, ref
builders in `spells-invocation-ref.ts`, etc. The only thing binding the
pieces was the string literal `"damageReduction"` (or similar) appearing
across all of them.

Consolidating each profile behind the `SpellProcedureProfile<P, I>` type
localises change: adding a new profile is one file; changing how an
existing profile behaves opens exactly that file.

## Migration status

The registry is being filled incrementally. Profiles that have not yet
migrated still use the original scattered dispatch sites; the registry
lookup returns `null` for them and callers fall back to the existing code
path. See `plans/SPELL_PROCEDURE_PROFILE_RALPH_PLAN.md` (or whatever the
current Ralph plan filename is) for remaining work and the per-profile
migration template.

## Glossary used by this module

These terms live here, not in `UBIQUITOUS_LANGUAGE.md`, because they
describe engine internals rather than the game domain:

- **Spell Procedure Profile** — the registered declaration above.
- **Procedure (discriminator)** — the string tag identifying which profile
  a Spell Invocation belongs to (`damageReduction`, `rollModifier`, …).
  Carried on `SupportedSpellInvocation`.
- **Admit** (verb) — discovery-time admission of a Spell Definition into
  zero or more Spell Invocations of one profile.
- **Profile Registry** — the typed table in `registry.ts`.

## File layout

```
spell-procedure-profiles/
  README.md            (this file)
  profile.ts           SpellProcedureProfile<P, I> type and supporting types
  registry.ts          REGISTERED_SPELL_PROCEDURE_PROFILES array + lookup
  damage-reduction.ts  one file per migrated profile
  roll-modifier.ts
  ...
```
