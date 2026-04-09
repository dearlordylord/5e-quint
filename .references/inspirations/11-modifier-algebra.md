# 11. Modifier Algebra

## Idea

Represent modifier composition through a small algebra of channels rather than ad hoc booleans and one-off fields.

## Current Fit In This Repo

- `ARCHITECTURE.md` already anticipates generic modifier fields such as `saveMiscBonus`, `conditionImmunities`, and advantage gates.
- `packages/core/src/types.ts` and feature files already expose many repeated modifier patterns.

## Application To Our Code

The important insight is not the exact competitor design. It is that modifier families should have a closed algebra.

For this repo, the likely useful channels are:

- additive numeric bonus
- binary grant/block
- replacement/override
- set union for granted immunities/resistances/vulnerabilities

This would make modifier features easier to add without creating bespoke fields for every class feature.

## Quint Impact

High. This is exactly where the planned Quint modifier frontier needs more structure. A small typed algebra could keep `battle.qnt` generic without becoming vague.

## Domain Language Impact

High. It would make feature docs and helper names more regular and less feature-specific.

## Recommendation

Adopt carefully. Use a small closed algebra, not an open-ended modifier registry. The goal is to make generic modifier modeling in Quint simpler and more auditable.
