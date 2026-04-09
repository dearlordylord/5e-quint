# 01. Four-Phase Event Pipeline

## Idea

Model actions as explicit phases such as declaration, execution, effect application, and completion.

## Current Fit In This Repo

- `battle.qnt` already has explicit interrupt points and return paths.
- `ARCHITECTURE.md` already describes flow features as named battle facilities.
- `packages/core/src/battle-machine-helpers.ts` mirrors those facilities with tagged pending interrupts and phase helpers.

## Application To Our Code

The value here is not a new engine model. We already have one. The value is naming and auditability.

- In Quint, several flows already behave like multi-phase transactions but the vocabulary is uneven: attack hit, attack damage, save failed, after damage, spell cast, ready release, AoE target resolution.
- In TS, those same boundaries are spread across pending-interrupt tags, state-machine phases, and helper names.

## Best Use

Adopt a normalized domain vocabulary for all flow features:

- `declare`
- `offer reactions`
- `commit decision`
- `apply consequences`
- `complete / resume`

That would make:

- `battle.qnt` easier to read as a battle transaction system
- `battle/DOMAIN.md` more precise
- MBT traces easier to interpret
- support code less dependent on one-off names

## Quint Impact

Moderate. This does not add mechanics, but it can simplify the spec by making all interruptible actions share the same verbal shape.

## Domain Language Impact

High. This is mostly a naming cleanup that can tighten the ubiquitous language around battle flow.

## Recommendation

Adopt as vocabulary, not as a new abstraction layer. Do not add a generic meta-framework over `battle.qnt`; rename and document existing flow phases more consistently instead.
