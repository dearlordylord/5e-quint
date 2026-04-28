# Shared Algebras

This package contains reusable, MBT-backed reducer/model algebras. It is separate from `@dnd/shared` on purpose:

- `@dnd/shared` owns low-level scalar/domain types and package-neutral utilities.
- `@dnd/shared-algebras` owns reusable semantic algebras that can be consumed by `@dnd/core`, `@dnd/surface-runtime-correction`, and other runtime packages.

## Surface Dependency Policy

This package may depend on `@dnd/prototype-content-surface` when an algebra or adapter intentionally speaks Surface vocabulary. That is allowed here, but it must stay explicit.

Rules:

- Keep Surface-free algebras Surface-free. Death saves, initiative, conditions, and pure action-resource spending should not import Surface.
- Put Surface-specific adapters next to the algebra only when the adapter's job is to translate Surface vocabulary into algebra facts.
- Do not let a Surface import leak into an algebra just because it is convenient. If the algebra only needs reducer facts, model those facts directly.
- `@dnd/shared` should remain the lower-level package. Since `@dnd/shared-algebras` depends on `@dnd/shared`, `@dnd/shared` should not re-export `@dnd/shared-algebras`.

Current adoption note: `@dnd/core` and `@dnd/surface-runtime-correction` both import reusable algebras from this package. `@dnd/shared` should not contain algebra modules.
