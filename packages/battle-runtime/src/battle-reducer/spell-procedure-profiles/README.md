# Spell Procedure Declarations

Engine implementation note for the battle-runtime package. Not domain
vocabulary — see `UBIQUITOUS_LANGUAGE.md` for the D&D 5e terms (Spell
Definition, Spell Access, Spell Invocation, Spell Effect).

## What a Spell Procedure Declaration is

A **Spell Procedure Declaration** is the canonical procedure-keyed composition
for one class of spell behavior. It joins two independently consumed views:

- **admission** — authored Spell Definition traversal through `admit`.
- **execution** — codecs, discovery, resolution, and metamagic compatibility.
  Target-list and Readied Spell classification are derived from their typed
  mechanical invocation shapes outside the authored declaration contract.

A declaration is an engine seam, not an SRD concept:

- Multiple unrelated SRD spells share one profile. Bless, Bane, Guidance,
  Resistance and Shield of Faith all use `rollModifier`.
- One SRD spell can be split across profiles. A spell with both an
  action-time effect and an interrupt checkpoint may have its parts handled by
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

`registry.ts` is the only procedure-keyed declaration table. The admission and
execution registry modules derive narrowed runtime values from it; neither view
maintains a second key list or repeats procedure metadata. Resolution imports
the execution view and its authored-free contract, while authored traversal
imports the admission view.

## Glossary used by this module

These terms live here, not in `UBIQUITOUS_LANGUAGE.md`, because they
describe engine internals rather than the game domain:

- **Spell Procedure Declaration** — the registered composition above.
- **Procedure (discriminator)** — the string tag identifying which profile
  a Spell Invocation belongs to (`damageReduction`, `rollModifier`, …).
  Carried on `SupportedSpellInvocation`.
- **Admit** (verb) — discovery-time admission of a Spell Definition into
  zero or more Spell Invocations of one profile.
- **Declaration Registry** — the typed table in `registry.ts`.
- **Admission Registry** — the authored traversal projection in
  `admission-registry.ts`.
- **Execution Registry** — the authored-free lookup projection in
  `execution-composition.ts`, exposed to execution code through the port in
  `execution-registry.ts`.

## File layout

```
spell-procedure-profiles/
  README.md            (this file)
  profile.ts           Admission context and combined declaration contract
  execution-profile.ts Authored-free execution contract
  resolution-contract.ts Procedure-keyed authored-free resolution inputs
  registry.ts          Canonical procedure-keyed declarations
  admission-registry.ts Authored traversal projection
  execution-registry.ts Authored-free execution port and lookup helpers
  execution-composition.ts Canonical declaration-to-execution projection
  damage-reduction.ts  one file per migrated profile
  roll-modifier.ts
  ...
```
