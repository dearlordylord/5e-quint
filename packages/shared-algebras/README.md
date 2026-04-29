# Shared Algebras

This package contains reusable, MBT-backed reducer/model algebras. It is separate from `@dnd/shared` on purpose:

- `@dnd/shared` owns low-level scalar/domain types and package-neutral utilities.
- `@dnd/shared-algebras` owns reusable semantic algebras that can be consumed by `@dnd/core`, `@dnd/surface-runtime-correction`, and other runtime packages.

## Surface Dependency Policy

This package may depend on `@dnd/surface` when an algebra or adapter intentionally speaks Surface vocabulary. That is allowed here, but it must stay explicit.

Rules:

- Keep Surface-free algebras Surface-free. Death saves, initiative, conditions, and pure action-resource spending should not import Surface.
- Put Surface-specific adapters next to the algebra only when the adapter's job is to translate Surface vocabulary into algebra facts.
- Do not let a Surface import leak into an algebra just because it is convenient. If the algebra only needs reducer facts, model those facts directly.
- `@dnd/shared` should remain the lower-level package. Since `@dnd/shared-algebras` depends on `@dnd/shared`, `@dnd/shared` should not re-export `@dnd/shared-algebras`.

Current adoption note: `@dnd/core` and `@dnd/surface-runtime-correction` both import reusable algebras from this package. `@dnd/shared` should not contain algebra modules.

## Core Adoption Notes

- Death saves are the first core adoption target because the algebra is Surface-free and replaces duplicated counter transition logic.
- Action economy should be adopted by core later, after the small action/bonus/free primitive grows into a shared resource-payment algebra: multi-cost validation, atomic spend, richer resource vocabulary, and Surface/core cost compilation into the same reducer facts.
- Armor class should be adopted by core when core has a Surface-backed armor/equipment projection path. Until then, wiring the armor algebra into core would mostly adapt the existing scalar/projected AC model into a shape intended for richer projected armor facts.
